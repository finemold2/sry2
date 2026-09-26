// 음성 받아쓰기(구술 집필) — Web Speech SpeechRecognition(webkitSpeechRecognition)로 한국어 음성을 인식해
// 텍스트로 누적한다. 외부 네트워크·키 불필요(브라우저 내장). 미지원(헤드리스 등)은 안내만 하고 throw 하지 않는다.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'dictation-stt', name: '음성 받아쓰기', icon: '🎙️', group: '집중·생산성', intro: '말로 구술하면 음성 인식으로 받아써 누적합니다(한국어·브라우저 내장)', w: 560, h: 560 }

const STORE_KEY = 'sry:tool:dictation-stt'

// SpeechRecognition 생성자(표준/웹킷)를 안전하게 가져온다. 없으면 null.
function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// 표준 타입이 없는 환경을 위한 최소 인터페이스 정의(react 외 import 없이 자급).
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SRResultEvent) => void) | null
  onerror: ((ev: SRErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
interface SRResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface SRErrorEvent { error: string }

// 오류 코드 → 한국어 안내
function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '마이크 권한이 거부되었습니다. 브라우저 주소창의 마이크 권한을 허용해 주세요.'
    case 'no-speech':
      return '음성이 감지되지 않았습니다. 마이크에 가까이서 또렷이 말해 보세요.'
    case 'audio-capture':
      return '마이크를 찾을 수 없습니다. 마이크 연결 상태를 확인해 주세요.'
    case 'network':
      return '음성 인식 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    case 'aborted':
      return ''
    default:
      return '음성 인식 중 오류가 발생했습니다: ' + code
  }
}

export default function DictationSTT() {
  const ctor = getRecognitionCtor()
  const supported = !!ctor

  const [text, setText] = useState<string>(() => {
    try { const v = localStorage.getItem(STORE_KEY); if (typeof v === 'string') return v } catch {}
    return ''
  })
  const [interim, setInterim] = useState('')       // 인식 중인(미확정) 텍스트
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')   // 프로젝트 추가 결과 토스트

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const wantRef = useRef(false)            // 사용자가 '듣는 중' 상태를 원하는지(자동 재시작 판단)
  const nonceRef = useRef(0)               // 인스턴스 경합 방지용 토큰
  const textRef = useRef(text)             // onresult 콜백에서 최신 누적본 참조
  const scrollRef = useRef<HTMLDivElement | null>(null)

  textRef.current = text

  // 텍스트 영속 저장
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, text) } catch {}
  }, [text])

  // 새 텍스트가 추가되면 결과 영역을 맨 아래로 스크롤
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text, interim])

  // 인식 인스턴스를 만들고 핸들러를 연결한다.
  const buildRecognition = (myNonce: number): SpeechRecognitionLike | null => {
    if (!ctor) return null
    let rec: SpeechRecognitionLike
    try { rec = new ctor() } catch { return null }
    rec.lang = 'ko-KR'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      if (nonceRef.current !== myNonce) return
      setListening(true)
    }

    rec.onresult = (ev: SRResultEvent) => {
      if (nonceRef.current !== myNonce) return
      let finalChunk = ''
      let interimChunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        const t = r[0]?.transcript ?? ''
        if (r.isFinal) finalChunk += t
        else interimChunk += t
      }
      if (finalChunk) {
        const trimmed = finalChunk.trim()
        if (trimmed) {
          const base = textRef.current
          const sep = base && !/\s$/.test(base) ? ' ' : ''
          const next = base + sep + trimmed
          textRef.current = next
          setText(next)
        }
        setInterim('')
      } else {
        setInterim(interimChunk)
      }
    }

    rec.onerror = (ev: SRErrorEvent) => {
      if (nonceRef.current !== myNonce) return
      const msg = errorMessage(ev.error)
      if (msg) setErr(msg)
      // 권한 거부 등 회복 불가 오류면 듣기 중단 의사로 본다.
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture') {
        wantRef.current = false
        setListening(false)
      }
    }

    rec.onend = () => {
      if (nonceRef.current !== myNonce) return
      setInterim('')
      // 사용자가 여전히 듣기를 원하면(브라우저가 자동 종료한 경우) 같은 인스턴스를 재시작.
      if (wantRef.current) {
        try { rec.start() } catch { setListening(false); wantRef.current = false }
      } else {
        setListening(false)
      }
    }

    return rec
  }

  const start = () => {
    if (!supported) { setErr('이 브라우저는 음성 인식(SpeechRecognition)을 지원하지 않습니다.'); return }
    if (wantRef.current) return
    setErr('')
    setCopied(false)
    const myNonce = ++nonceRef.current
    const rec = buildRecognition(myNonce)
    if (!rec) { setErr('음성 인식을 시작할 수 없습니다.'); return }
    recRef.current = rec
    wantRef.current = true
    try {
      rec.start()
    } catch {
      // 이미 시작된 상태 등 — 안전하게 무시하되, 정말 실패면 상태 복구
      wantRef.current = false
      setListening(false)
      setErr('음성 인식을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const stop = () => {
    wantRef.current = false
    nonceRef.current++   // 진행 중 콜백 무효화
    const rec = recRef.current
    recRef.current = null
    if (rec) {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.onstart = null } catch {}
      try { rec.stop() } catch {}
      try { rec.abort() } catch {}
    }
    setListening(false)
    setInterim('')
  }

  const toggle = () => { if (listening || wantRef.current) stop(); else start() }

  const clearAll = () => {
    setText('')
    textRef.current = ''
    setInterim('')
    setErr('')
    setCopied(false)
    try { localStorage.removeItem(STORE_KEY) } catch {}
  }

  const copy = async () => {
    const out = text.trim()
    if (!out) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(out)
      } else {
        const ta = document.createElement('textarea')
        ta.value = out
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setErr('클립보드 복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.')
    }
  }

  // 프로젝트 브리지 — 받아쓴(누적된) 텍스트를 원고 초고 문서로 저장(음성→문서).
  const flash = (m: string) => { setSaved(m); window.setTimeout(() => setSaved(''), 1600) }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const body = text.trim()
    if (!body) return
    // 제목: 받아쓴 첫 부분(길이 제한). 본문은 빈 줄 기준 단락 분리 후 HTML 이스케이프.
    const head = body.replace(/\s+/g, ' ').trim()
    const title = '받아쓰기 — ' + (head.length > 24 ? head.slice(0, 24) + '…' : head)
    const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const bodyHtml = paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '초고',
      title,
      bodyHtml,
      meta: { 출처: '음성 받아쓰기', 글자수: String(body.length) },
    })
    flash(id ? '프로젝트 초고에 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  // 언마운트 시 인식 정지·핸들러 해제(stop)
  useEffect(() => {
    return () => {
      wantRef.current = false
      nonceRef.current++
      const rec = recRef.current
      recRef.current = null
      if (rec) {
        try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.onstart = null } catch {}
        try { rec.stop() } catch {}
        try { rec.abort() } catch {}
      }
    }
  }, [])

  const charCount = text.replace(/\s/g, '').length
  const hasText = text.trim().length > 0

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const statusDot: React.CSSProperties = {
    width: 10, height: 10, borderRadius: '50%',
    background: listening ? 'var(--ok)' : 'var(--muted)',
    boxShadow: listening ? '0 0 0 4px color-mix(in srgb, var(--ok) 25%, transparent)' : 'none',
    flex: '0 0 auto',
  }
  const statusText: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const notice: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, color: 'var(--text)' }
  const resultBox: React.CSSProperties = {
    flex: 1, minHeight: 0, overflow: 'auto', boxSizing: 'border-box',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const placeholder: React.CSSProperties = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }
  const interimStyle: React.CSSProperties = { color: 'var(--muted)', fontStyle: 'italic' }
  const btnRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const metaRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--muted)' }
  const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  if (!supported) {
    return (
      <div style={wrap}>
        <div style={headRow}>
          <span style={{ fontSize: 18 }}><Emoji e="🎙️"/></span>
          <b>음성 받아쓰기</b>
        </div>
        <div style={{ ...notice, color: 'var(--warn)' }}>
          이 브라우저(또는 현재 환경)는 음성 인식(SpeechRecognition)을 지원하지 않습니다.
          <br />
          Chrome·Edge 등 데스크톱 브라우저에서 마이크 권한을 허용한 뒤 사용해 주세요.
        </div>
        <div style={resultBox}>
          {hasText
            ? text
            : <span style={placeholder}>지원되는 브라우저에서 받아쓴 내용이 여기에 표시됩니다.</span>}
        </div>
        {hasText && (
          <div style={btnRow}>
            <button className="minibtn" onClick={copy}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={clearAll}><Emoji e="🗑"/> 초기화</button>
          </div>
        )}
        {hasText && (
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={toProject}
              disabled={!hasProjectBridge() || !hasText}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '받아쓴 글을 프로젝트 초고에 추가'}
            ><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        )}
        {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
        <div style={hint}>저장된 받아쓰기 내용은 이 브라우저에 보관되어 다시 열어도 유지됩니다.</div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={headRow}>
        <span style={statusDot} aria-hidden />
        <span style={statusText}>{listening ? '듣는 중… 말씀하세요' : '대기 중 — 시작을 누르고 말하세요'}</span>
      </div>

      <div style={btnRow}>
        <button
          className={listening ? 'minibtn' : 'btn-primary'}
          onClick={toggle}
          style={{ minWidth: 120 }}
          aria-pressed={listening}
        >
          {listening ? <><Emoji e="⏹"/> 정지</> : <><Emoji e="🎙"/> 시작</>}
        </button>
        <button className="minibtn" onClick={copy} disabled={!hasText}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={clearAll} disabled={!hasText && !interim}><Emoji e="🗑"/> 초기화</button>
      </div>

      {err && <div style={errStyle}>{err}</div>}

      <div ref={scrollRef} style={resultBox} aria-live="polite">
        {hasText || interim ? (
          <>
            {text}
            {interim && (
              <span style={interimStyle}>{text ? ' ' : ''}{interim}</span>
            )}
          </>
        ) : (
          <span style={placeholder}>
            아직 받아쓴 내용이 없습니다.{'\n'}
            “시작”을 누르고 또렷하게 말하면 인식된 문장이 이어서 쌓입니다.
          </span>
        )}
      </div>

      <div style={metaRow}>
        <span>글자수(공백 제외) {charCount.toLocaleString()}</span>
        <span>{listening ? <><Emoji e="🔴"/> 인식 중</> : ''}</span>
      </div>

      <div style={hint}>
        한국어(ko-KR)로 인식하며 인식 결과는 이 브라우저에 자동 저장됩니다. 마이크 권한이 필요하고, 네트워크·API 키는 필요하지 않습니다.
      </div>

      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || !hasText}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!hasText ? '저장할 받아쓴 글이 없습니다' : '받아쓴 글을 프로젝트 초고에 추가')}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
