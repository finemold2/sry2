// 무자비 모드 — 멈추면 글이 사라진다. Most Dangerous Writing App 벤치마킹.
// 자급식: react 외 import 없음. setInterval 타이머 + Web Audio 경고음(키 불필요) + localStorage 기록.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'ruthless-mode', name: '무자비 모드', icon: '🔥', group: '집중·생산성', intro: '멈추면 글이 사라진다 — 계속 쓰지 않으면 모든 게 지워집니다', w: 560, h: 620 }

const LS = 'sry:tool:ruthless-mode:'
const GRACE_MS = 5000   // 멈춤 허용 시간(이후 사라짐 시작과 동시에 0)
const FADE_MS = 2000    // 흐려지다 사라지기까지(경고 단계)
const TICK = 50         // 타이머 해상도
const DURATIONS = [3, 5, 10, 20]   // 세션 목표(분)

type Phase = 'idle' | 'running' | 'won' | 'lost'

export default function RuthlessMode() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [goalMin, setGoalMin] = useState(5)
  const [text, setText] = useState('')
  const [idleMs, setIdleMs] = useState(0)        // 마지막 입력 이후 경과
  const [elapsedMs, setElapsedMs] = useState(0)  // 세션 시작 이후 경과
  const [opacity, setOpacity] = useState(1)
  const [bestWords, setBestWords] = useState(0)
  const [saved, setSaved] = useState('')          // 프로젝트 추가 토스트

  const lastTextRef = useRef('')                   // 마지막 입력 본문 보존(패배 시 지워지기 전 글 복구용)
  const lastTypeRef = useRef(0)
  const startRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const warnedRef = useRef(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const goalRef = useRef(5)

  phaseRef.current = phase
  goalRef.current = goalMin

  // 최고 기록 불러오기
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS + 'bestWords')
      if (v) setBestWords(parseInt(v, 10) || 0)
    } catch { /* 접근 거부/미지원 graceful */ }
  }, [])

  // 짧은 경고음(미지원/거부 시 조용히 무시)
  const beep = useCallback((freq: number, dur: number) => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      let ctx = audioRef.current
      if (!ctx) { ctx = new AC(); audioRef.current = ctx }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + dur + 0.02)
    } catch { /* graceful */ }
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const wordCount = (s: string) => {
    const t = s.trim()
    if (!t) return 0
    return t.split(/\s+/).length
  }

  const endSession = useCallback((won: boolean) => {
    stopTimer()
    if (won) {
      const w = wordCount(taRef.current?.value ?? text)
      setBestWords((prev) => {
        const nb = Math.max(prev, w)
        try { localStorage.setItem(LS + 'bestWords', String(nb)) } catch { /* graceful */ }
        return nb
      })
      setOpacity(1)
      beep(880, 0.18)
      setTimeout(() => beep(1175, 0.22), 140)
    } else {
      setText('')
      setOpacity(1)
      beep(160, 0.5)
    }
    setPhase(won ? 'won' : 'lost')
  }, [stopTimer, beep, text])

  // 매 틱: 경과/멈춤 시간 계산 → 흐려짐/사라짐/완료 판정
  const tick = useCallback(() => {
    const now = Date.now()
    const idle = now - lastTypeRef.current
    const elapsed = now - startRef.current
    setIdleMs(idle)
    setElapsedMs(elapsed)

    // 목표 시간 도달 → 승리
    if (elapsed >= goalRef.current * 60000) { endSession(true); return }

    if (idle >= GRACE_MS) {
      // 경고 단계: GRACE 이후 FADE_MS 동안 흐려지다 사라짐
      const over = idle - GRACE_MS
      if (!warnedRef.current) { warnedRef.current = true; beep(330, 0.25) }
      const op = Math.max(0, 1 - over / FADE_MS)
      setOpacity(op)
      if (over >= FADE_MS) { endSession(false); return }
    } else {
      if (warnedRef.current) warnedRef.current = false
      setOpacity(1)
    }
  }, [beep, endSession])

  const start = useCallback(() => {
    setText('')
    lastTextRef.current = ''
    setSaved('')
    setOpacity(1)
    warnedRef.current = false
    const now = Date.now()
    lastTypeRef.current = now
    startRef.current = now
    setIdleMs(0)
    setElapsedMs(0)
    setPhase('running')
    // 오디오 컨텍스트 사용자 제스처에서 준비(자동재생 정책)
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) {
        if (!audioRef.current) audioRef.current = new AC()
        if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => {})
      }
    } catch { /* graceful */ }
    stopTimer()
    timerRef.current = window.setInterval(tick, TICK)
    setTimeout(() => taRef.current?.focus(), 0)
  }, [stopTimer, tick])

  const stop = useCallback(() => {
    // 사용자가 중단 → 패배 처리(완료가 아니면)
    if (phaseRef.current === 'running') endSession(false)
  }, [endSession])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (phaseRef.current !== 'running') return
    lastTypeRef.current = Date.now()
    warnedRef.current = false
    setOpacity(1)
    setIdleMs(0)
    lastTextRef.current = e.target.value   // 지워지기 전 마지막 본문 보존
    setText(e.target.value)
  }

  // ── 프로젝트 브리지: 쓴 글을 원고(draft) '초고' 폴더 문서로 저장(쓴 글을 잃지 않게) ──
  const flash = useCallback((m: string) => {
    setSaved(m)
    window.setTimeout(() => setSaved(''), 1800)
  }, [])
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const makeTitle = (body: string) => {
    // 제목: 첫 문장 앞부분 — 없으면(공백뿐) 시간 기반.
    const firstLine = body.split(/\n/).map((l) => l.trim()).find(Boolean) ?? ''
    const firstSentence = (firstLine.split(/(?<=[.!?。！？…])\s/)[0] || firstLine).trim()
    const base = firstSentence.length > 28 ? firstSentence.slice(0, 28) + '…' : firstSentence
    if (base) return '무자비 모드 — ' + base
    const d = new Date()
    const p2 = (n: number) => String(n).padStart(2, '0')
    return `무자비 모드 — ${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
  }
  // 저장 대상: 현재 textarea 값 우선, 없으면(이미 지워졌으면) 마지막 보존 본문.
  const saveText = useCallback((source: string): boolean => {
    const body = (source ?? '').trim()
    if (!body) { flash('저장할 글이 없습니다'); return false }
    const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const bodyHtml = paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') || `<p>${esc(body)}</p>`
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '초고',
      title: makeTitle(body),
      bodyHtml,
      meta: { 출처: '무자비 모드', 글자수: String(body.length), 단어수: String(wordCount(body)) },
    })
    flash(id ? '프로젝트 초고에 저장됨' : '프로젝트에 연결되지 않았습니다')
    return !!id
  }, [flash])

  // 언마운트 정리: 타이머 정지 + 오디오 컨텍스트 닫기
  useEffect(() => () => {
    stopTimer()
    if (audioRef.current) { audioRef.current.close().catch(() => {}); audioRef.current = null }
  }, [stopTimer])

  // 표시 값
  const remainGrace = Math.max(0, GRACE_MS - idleMs)
  const inDanger = phase === 'running' && idleMs >= GRACE_MS
  const goalMs = goalMin * 60000
  const progress = Math.min(1, elapsedMs / goalMs)
  const remainSec = Math.max(0, Math.ceil((goalMs - elapsedMs) / 1000))
  const mm = String(Math.floor(remainSec / 60)).padStart(2, '0')
  const ss = String(remainSec % 60).padStart(2, '0')
  const words = wordCount(text)

  // 멈춤 게이지(5초 → 0): 남은 안전시간 비율, 위험구간엔 흐려짐 비율
  const dangerBar = inDanger ? opacity : remainGrace / GRACE_MS
  const barColor = inDanger ? 'var(--warn)' : (remainGrace < 2000 ? 'var(--warn)' : 'var(--ok)')

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const statRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const chip: React.CSSProperties = { fontSize: 12, padding: '4px 8px', borderRadius: 8, background: 'var(--panel)', border: '1px solid var(--border)' }

  return (
    <div style={wrap}>
      {phase === 'idle' && (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="🔥"/> 무자비 모드</div>
          <div style={hint}>
            세션을 시작하면 빈 화면에 계속 써야 합니다. <b>5초간 멈추면</b> 글이 점점 흐려지다(경고 단계)
            <b> 완전히 사라집니다.</b> 목표 시간을 끝까지 버티면 글이 안전하게 남습니다. 멈추지 마세요.
          </div>
          <div style={{ ...statRow, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>목표 시간</span>
            {DURATIONS.map((d) => (
              <button
                key={d}
                className={goalMin === d ? 'btn-primary' : 'minibtn'}
                onClick={() => setGoalMin(d)}
              >{d}분</button>
            ))}
          </div>
          {bestWords > 0 && <div style={hint}><Emoji e="🏆"/> 최고 기록: <b>{bestWords}</b> 단어</div>}
          <button className="btn-primary" style={{ marginTop: 6, padding: '12px', fontSize: 15 }} onClick={start}>
            <Emoji e="⚠️"/> {goalMin}분 세션 시작
          </button>
          <div style={{ ...hint, marginTop: 'auto' }}>
            ※ 경고음이 울릴 수 있습니다. 소리/저장은 브라우저 권한이 없거나 미지원이면 조용히 건너뜁니다.
          </div>
        </>
      )}

      {phase === 'running' && (
        <>
          <div style={statRow}>
            <span style={chip}><Emoji e="⏳"/> 남은 시간 <b>{mm}:{ss}</b></span>
            <span style={chip}><Emoji e="✍️"/> {words} 단어</span>
            <span style={{ ...chip, color: inDanger ? 'var(--warn)' : 'var(--muted)' }}>
              {inDanger ? <><Emoji e="💀"/> 사라지는 중!</> : <><Emoji e="🟢"/> 멈춤까지 {(remainGrace / 1000).toFixed(1)}s</>}
            </span>
            <button
              className="linkbtn"
              style={{ marginLeft: 'auto' }}
              onClick={() => saveText(taRef.current?.value ?? text)}
              disabled={!hasProjectBridge() || !text.trim()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!text.trim() ? '저장할 글이 없습니다' : '지금까지 쓴 글을 프로젝트 초고에 저장(글을 잃지 않게)')}
            ><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="minibtn" onClick={stop}>중단</button>
          </div>
          {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)', textAlign: 'right' }}>✓ {saved}</div>}

          {/* 세션 진행 게이지 */}
          <div style={{ height: 6, borderRadius: 4, background: 'var(--chrome-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width 0.1s linear' }} />
          </div>

          {/* 멈춤/위험 게이지 */}
          <div style={{ height: 8, borderRadius: 4, background: 'var(--chrome-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${dangerBar * 100}%`, background: barColor, transition: 'width 0.05s linear' }} />
          </div>

          <textarea
            ref={taRef}
            value={text}
            onChange={onChange}
            spellCheck={false}
            placeholder="여기에 계속 쓰세요… 멈추면 사라집니다."
            style={{
              flex: 1,
              width: '100%',
              boxSizing: 'border-box',
              resize: 'none',
              padding: 14,
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--text)',
              background: 'var(--paper)',
              border: `2px solid ${inDanger ? 'var(--warn)' : 'var(--border)'}`,
              borderRadius: 10,
              outline: 'none',
              opacity,
              transition: 'opacity 0.05s linear, border-color 0.2s',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ ...hint, textAlign: 'center', color: inDanger ? 'var(--warn)' : 'var(--muted)', minHeight: 18 }}>
            {inDanger ? '계속 쓰지 않으면 모든 글이 지워집니다!' : '손을 멈추지 마세요.'}
          </div>
        </>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
          {phase === 'won' ? (
            <>
              <div style={{ fontSize: 40 }}><Emoji e="🎉"/></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>버텨냈습니다!</div>
              <div style={hint}>{words} 단어를 끝까지 지켜냈습니다. {bestWords > 0 && `최고 기록 ${bestWords} 단어.`}</div>
              <div style={{ width: '100%', maxHeight: 220, overflowY: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 1.6 }}>
                {text || '(빈 글)'}
              </div>
              <div style={statRow}>
                <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}) }}><Emoji e="📋"/> 복사</button>
                <button
                  className="linkbtn"
                  onClick={() => saveText(text)}
                  disabled={!hasProjectBridge() || !text.trim()}
                  title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!text.trim() ? '저장할 글이 없습니다' : '지켜낸 글을 프로젝트 초고에 저장')}
                ><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="btn-primary" onClick={() => setPhase('idle')}>다시 도전</button>
              </div>
              {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 40 }}><Emoji e="💀"/></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warn)' }}>글이 사라졌습니다.</div>
              <div style={hint}>멈추는 순간 모든 게 지워집니다. 다음엔 손을 멈추지 마세요.</div>
              {lastTextRef.current.trim() && (
                <div style={{ ...hint, color: 'var(--ok)' }}>
                  하지만 마지막까지 쓴 글은 살릴 수 있습니다 — 프로젝트 초고로 저장하세요.
                </div>
              )}
              <div style={statRow}>
                <button
                  className="linkbtn"
                  onClick={() => saveText(lastTextRef.current)}
                  disabled={!hasProjectBridge() || !lastTextRef.current.trim()}
                  title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!lastTextRef.current.trim() ? '저장할 글이 없습니다' : '사라지기 전 마지막 글을 프로젝트 초고로 복구·저장')}
                ><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="btn-primary" onClick={() => setPhase('idle')}>다시 도전</button>
              </div>
              {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
