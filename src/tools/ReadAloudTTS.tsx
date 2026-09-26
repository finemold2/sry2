// 소리내어 읽기(퇴고) — textarea 텍스트를 Web Speech speechSynthesis 로 낭독.
// 자급식: react 외 import 없음. 키 불필요·로컬 Web API(speechSynthesis)만 사용.
// 목소리 선택(한국어 우선), 속도/높이 조절, 재생/일시정지/정지, 현재 읽는 문장 강조.
// 미지원(헤드리스 등) graceful 안내, 언마운트 시 cancel·타이머 정리. 설정은 localStorage 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'read-aloud-tts', name: '소리내어 읽기', icon: '🔊', group: '교정·언어', intro: '글을 음성으로 들으며 어색한 문장을 잡아내세요', w: 560, h: 560 }

const LS_KEY = 'sry:tool:read-aloud-tts'

// speechSynthesis 지원 여부(헤드리스/구형 환경 대비)
function ttsSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
  } catch {
    return false
  }
}

// 텍스트를 문장 단위로 분할(원본 인덱스 보존). 한국어/영문 문장부호 + 줄바꿈 기준.
type Seg = { text: string; start: number; end: number }
function splitSentences(src: string): Seg[] {
  const segs: Seg[] = []
  if (!src) return segs
  // 문장 끝(.!?…。！？) 뒤 공백, 또는 줄바꿈 경계에서 자른다.
  const re = /[^\n.!?…。！？]*(?:[.!?…。！？]+|\n+|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const raw = m[0]
    if (raw === '' ) { if (re.lastIndex <= m.index) re.lastIndex++; continue }
    const start = m.index
    const end = start + raw.length
    if (raw.trim().length > 0) segs.push({ text: raw, start, end })
    if (re.lastIndex === m.index) re.lastIndex++ // 무한루프 방지
    if (end >= src.length) break
  }
  return segs
}

type Persisted = { text?: string; rate?: number; pitch?: number; voiceURI?: string | null }

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return (o && typeof o === 'object') ? o : {}
  } catch {
    return {}
  }
}

export default function ReadAloudTTS() {
  const supported = ttsSupported()
  const init = useRef<Persisted>(loadPersisted())

  const [text, setText] = useState<string>(init.current.text ?? '여기에 읽을 글을 붙여넣고 ▶ 재생을 누르세요. 글을 귀로 들으면 눈으로 놓친 어색한 문장이 잘 들립니다.')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURI] = useState<string | null>(init.current.voiceURI ?? null)
  const [rate, setRate] = useState<number>(typeof init.current.rate === 'number' ? init.current.rate : 1)
  const [pitch, setPitch] = useState<number>(typeof init.current.pitch === 'number' ? init.current.pitch : 1)

  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [activeIdx, setActiveIdx] = useState<number>(-1) // 현재 읽는 문장 인덱스
  const [error, setError] = useState<string>('')

  const segsRef = useRef<Seg[]>([])      // 재생 중 고정된 문장 목록
  const idxRef = useRef<number>(0)        // 다음에 읽을 문장 인덱스
  const nonceRef = useRef<number>(0)      // 재생 세션 토큰(경쟁상태 방지)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 설정 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ text, rate, pitch, voiceURI }))
    } catch {
      // 저장 불가 환경 graceful
    }
  }, [text, rate, pitch, voiceURI])

  // 목소리 목록 로드(비동기로 채워지는 브라우저 대응)
  useEffect(() => {
    if (!supported) return
    let alive = true
    const refresh = () => {
      try {
        const list = window.speechSynthesis.getVoices() || []
        if (!alive) return
        setVoices(list)
      } catch {
        // graceful
      }
    }
    refresh()
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
    } catch {
      // 일부 환경은 onvoiceschanged 만 지원
      try { (window.speechSynthesis as SpeechSynthesis).onvoiceschanged = refresh } catch {}
    }
    return () => {
      alive = false
      try { window.speechSynthesis.removeEventListener?.('voiceschanged', refresh) } catch {}
    }
  }, [supported])

  // 언마운트 시 낭독 취소(안전망)
  useEffect(() => {
    return () => {
      nonceRef.current++ // 진행 중 세션 무효화
      try { if (ttsSupported()) window.speechSynthesis.cancel() } catch {}
    }
  }, [])

  // 선택된 목소리 결정: 저장된 voiceURI → 한국어 → 기본
  const pickVoice = (): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null
    if (voiceURI) {
      const v = voices.find(v => v.voiceURI === voiceURI)
      if (v) return v
    }
    const ko = voices.find(v => /^ko/i.test(v.lang))
    return ko ?? voices[0] ?? null
  }

  // 한 문장씩 순차 낭독(세션 nonce 로 경쟁상태 방지)
  const speakFrom = (startIdx: number, myNonce: number) => {
    if (!ttsSupported()) return
    const segs = segsRef.current
    if (startIdx >= segs.length) {
      // 모두 읽음
      if (nonceRef.current === myNonce) {
        setStatus('idle')
        setActiveIdx(-1)
        idxRef.current = 0
      }
      return
    }
    const seg = segs[startIdx]
    let u: SpeechSynthesisUtterance
    try {
      u = new SpeechSynthesisUtterance(seg.text)
    } catch {
      setError('이 환경에서는 음성 합성을 사용할 수 없습니다.')
      setStatus('idle')
      return
    }
    const v = pickVoice()
    if (v) { u.voice = v; u.lang = v.lang }
    u.rate = rate
    u.pitch = pitch

    u.onstart = () => {
      if (nonceRef.current !== myNonce) return
      setActiveIdx(startIdx)
    }
    u.onend = () => {
      if (nonceRef.current !== myNonce) return // 중간에 정지/교체됨
      idxRef.current = startIdx + 1
      speakFrom(startIdx + 1, myNonce)
    }
    u.onerror = (ev) => {
      if (nonceRef.current !== myNonce) return
      // 사용자가 cancel 한 경우의 'interrupted'/'canceled' 는 오류로 취급하지 않음
      const err = (ev as SpeechSynthesisErrorEvent).error
      if (err === 'interrupted' || err === 'canceled') return
      setError('낭독 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setStatus('idle')
      setActiveIdx(-1)
    }

    try {
      window.speechSynthesis.speak(u)
    } catch {
      setError('낭독을 시작할 수 없습니다.')
      setStatus('idle')
    }
  }

  const play = () => {
    setError('')
    if (!supported) return
    if (!text.trim()) {
      setError('읽을 텍스트가 비어 있습니다.')
      return
    }
    // 새 세션 시작: 기존 발화 취소
    const myNonce = ++nonceRef.current
    try { window.speechSynthesis.cancel() } catch {}
    const segs = splitSentences(text)
    if (segs.length === 0) {
      setError('읽을 문장을 찾지 못했습니다.')
      return
    }
    segsRef.current = segs
    idxRef.current = 0
    setStatus('playing')
    setActiveIdx(-1)
    // 일부 브라우저에서 cancel 직후 speak 가 무시되는 문제를 피하려 다음 틱에 시작
    window.setTimeout(() => {
      if (nonceRef.current !== myNonce) return
      speakFrom(0, myNonce)
    }, 0)
  }

  const togglePause = () => {
    if (!supported) return
    try {
      if (status === 'playing') {
        window.speechSynthesis.pause()
        setStatus('paused')
      } else if (status === 'paused') {
        window.speechSynthesis.resume()
        setStatus('playing')
      }
    } catch {
      // graceful
    }
  }

  const stop = () => {
    nonceRef.current++ // 진행 세션 무효화
    try { if (supported) window.speechSynthesis.cancel() } catch {}
    setStatus('idle')
    setActiveIdx(-1)
    idxRef.current = 0
  }

  const resetSettings = () => {
    setRate(1)
    setPitch(1)
  }

  // 현재 강조 표시용 문장 분할(정지 상태에서도 미리보기). 재생 중엔 고정된 segsRef 사용.
  const previewSegs = status === 'idle' ? splitSentences(text) : segsRef.current

  // ---- styles ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const taStyle: React.CSSProperties = {
    minHeight: 100, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const ctrlRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const selectStyle: React.CSSProperties = {
    flex: 1, minWidth: 140, background: 'var(--chrome-2)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }
  const sliderWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }
  const sliderLabel: React.CSSProperties = { width: 64, flexShrink: 0 }
  const sliderVal: React.CSSProperties = { width: 40, textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const previewBox: React.CSSProperties = {
    flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--chrome-2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const segActive: React.CSSProperties = { background: 'var(--accent)', color: 'var(--paper)', borderRadius: 4, padding: '1px 2px', boxDecorationBreak: 'clone' as React.CSSProperties['boxDecorationBreak'] }
  const segDone: React.CSSProperties = { color: 'var(--muted)' }
  const note: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const warnBox: React.CSSProperties = { fontSize: 13, color: 'var(--warn)', lineHeight: 1.6 }
  const statusBox: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }

  if (!supported) {
    return (
      <div style={wrap}>
        <div style={{ ...panel, gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>🔊 소리내어 읽기</div>
          <div style={warnBox}>
            이 환경에서는 음성 합성(Web Speech speechSynthesis)을 사용할 수 없습니다.
            헤드리스 브라우저이거나 지원하지 않는 브라우저일 수 있습니다.
          </div>
          <div style={note}>
            Chrome·Edge·Safari 등 최신 데스크톱 브라우저에서 다시 시도해 주세요.
            기능이 지원되면 텍스트를 한국어 음성으로 낭독하고, 속도·높이 조절과 문장 강조를 제공합니다.
          </div>
        </div>
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="읽을 텍스트(미지원 환경에서는 낭독되지 않습니다)"
          spellCheck={false}
          aria-label="읽을 텍스트"
        />
      </div>
    )
  }

  const koVoices = voices.filter(v => /^ko/i.test(v.lang))
  const otherVoices = voices.filter(v => !/^ko/i.test(v.lang))
  const selectedURI = (pickVoice()?.voiceURI) ?? ''

  return (
    <div style={wrap}>
      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="읽을 글을 입력하거나 붙여넣으세요."
        spellCheck={false}
        aria-label="읽을 텍스트"
        disabled={status !== 'idle'}
      />

      <div style={panel}>
        <div style={ctrlRow}>
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>목소리</span>
          <select
            style={selectStyle}
            value={voiceURI ?? selectedURI}
            onChange={(e) => setVoiceURI(e.target.value || null)}
            aria-label="목소리 선택"
            disabled={voices.length === 0}
          >
            {voices.length === 0 && <option value="">목소리 불러오는 중…</option>}
            {koVoices.length > 0 && (
              <optgroup label="한국어">
                {koVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </optgroup>
            )}
            {otherVoices.length > 0 && (
              <optgroup label="기타 언어">
                {otherVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div style={sliderWrap}>
          <span style={sliderLabel}>속도</span>
          <input
            type="range" min={0.5} max={2} step={0.1} value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
            aria-label="읽기 속도"
          />
          <span style={sliderVal}>{rate.toFixed(1)}x</span>
        </div>
        <div style={sliderWrap}>
          <span style={sliderLabel}>높이</span>
          <input
            type="range" min={0} max={2} step={0.1} value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
            aria-label="목소리 높이"
          />
          <span style={sliderVal}>{pitch.toFixed(1)}</span>
        </div>

        <div style={ctrlRow}>
          {status === 'idle' ? (
            <button className="btn-primary" onClick={play} disabled={!text.trim()}>▶ 재생</button>
          ) : (
            <button className="btn-primary" onClick={togglePause}>
              {status === 'paused' ? '▶ 이어 재생' : '⏸ 일시정지'}
            </button>
          )}
          <button className="minibtn" onClick={stop} disabled={status === 'idle'}>⏹ 정지</button>
          <button className="minibtn" onClick={resetSettings} disabled={rate === 1 && pitch === 1}>↺ 속도·높이 초기화</button>
          <span style={{ flex: 1 }} />
          <span style={statusBox}>
            {status === 'playing' && `읽는 중 ${activeIdx >= 0 ? `(${activeIdx + 1}/${segsRef.current.length})` : ''}`}
            {status === 'paused' && '일시정지됨'}
            {status === 'idle' && `${previewSegs.length}개 문장`}
          </span>
        </div>
      </div>

      {error && <div style={warnBox}>⚠ {error}</div>}

      <div style={previewBox} aria-label="낭독 미리보기">
        {previewSegs.length === 0 ? (
          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>읽을 텍스트가 없습니다. 위에 글을 입력하세요.</span>
        ) : (
          previewSegs.map((s, i) => {
            const isActive = i === activeIdx
            const isDone = status !== 'idle' && activeIdx >= 0 && i < activeIdx
            return (
              <span key={i} style={isActive ? segActive : (isDone ? segDone : undefined)}>{s.text}</span>
            )
          })
        )}
      </div>

      <div style={note}>
        글을 귀로 들으면 눈으로 놓친 어색한 문장·반복·리듬이 잘 드러납니다. 현재 읽는 문장은 강조 표시됩니다.
      </div>
    </div>
  )
}
