// 포모도로 타이머 — 25분 집중 / 5분 휴식 사이클을 반복하며 집중 시간을 관리한다.
// 자급식: react 외 import 없음. Web Audio(beep)·Notification·localStorage 등 브라우저 내장 API만 사용.
import { useState, useEffect, useRef, useCallback } from 'react'

export const meta = { id: 'pomodoro-timer', name: '포모도로 타이머', icon: '🍅', group: '집중·생산성', intro: '25분 집중·5분 휴식 사이클로 몰입을 관리하세요', w: 380, h: 540 }

type Phase = 'focus' | 'break'

const NS = 'sry:tool:pomodoro-timer:'
const DEFAULT_FOCUS = 25 // 분
const DEFAULT_BREAK = 5  // 분
const MIN_MIN = 1
const MAX_MIN = 120

// localStorage 안전 읽기 — 미지원/차단 환경에서도 기본값으로 graceful.
function loadNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(NS + key)
    if (v == null) return def
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : def
  } catch {
    return def
  }
}
function saveNum(key: string, val: number) {
  try { localStorage.setItem(NS + key, String(val)) } catch { /* 차단 환경 무시 */ }
}

function clampMin(n: number): number {
  if (!Number.isFinite(n)) return MIN_MIN
  return Math.max(MIN_MIN, Math.min(MAX_MIN, Math.round(n)))
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function PomodoroTimer() {
  const [focusMin, setFocusMin] = useState<number>(() => clampMin(loadNum('focus', DEFAULT_FOCUS)))
  const [breakMin, setBreakMin] = useState<number>(() => clampMin(loadNum('break', DEFAULT_BREAK)))
  const [phase, setPhase] = useState<Phase>('focus')
  const [remaining, setRemaining] = useState<number>(() => clampMin(loadNum('focus', DEFAULT_FOCUS)) * 60)
  const [running, setRunning] = useState(false)
  // 입력 중에는 원문 문자열을 보관해 매 키 입력마다 clampMin 으로 덮어쓰지 않게 한다.
  const [focusInput, setFocusInput] = useState<string>(() => String(clampMin(loadNum('focus', DEFAULT_FOCUS))))
  const [breakInput, setBreakInput] = useState<string>(() => String(clampMin(loadNum('break', DEFAULT_BREAK))))
  const [cycles, setCycles] = useState<number>(() => loadNum('cycles', 0))
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() => {
    try { return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' }
    catch { return 'unsupported' }
  })

  const intervalRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // 절대시각 기준 카운트다운 — 탭 비활성/스로틀링에도 시각 오차 누적을 막는다.
  const endTimeRef = useRef<number>(0)
  // 콜백 안에서 최신 상태를 참조하기 위한 ref들.
  const phaseRef = useRef<Phase>(phase)
  const focusRef = useRef(focusMin)
  const breakRef = useRef(breakMin)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { focusRef.current = focusMin }, [focusMin])
  useEffect(() => { breakRef.current = breakMin }, [breakMin])

  // 설정 영속화.
  useEffect(() => { saveNum('focus', focusMin) }, [focusMin])
  useEffect(() => { saveNum('break', breakMin) }, [breakMin])
  useEffect(() => { saveNum('cycles', cycles) }, [cycles])

  // 확정된 분 값을 입력 문자열에 반영(외부 변경 시 표시 동기화). 입력 중 onChange 가 그대로 덮으므로 충돌 없음.
  useEffect(() => { setFocusInput(String(focusMin)) }, [focusMin])
  useEffect(() => { setBreakInput(String(breakMin)) }, [breakMin])

  // 알림음 — Web Audio로 짧은 비프 2회. 미지원/실패 시 graceful 무시.
  const beep = useCallback(() => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctor()
        audioCtxRef.current = ctx
      }
      // 사용자 제스처 이후 suspended 상태일 수 있어 resume 시도.
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}) }
      const now = ctx.currentTime
      const tones = [880, 660]
      tones.forEach((freq, i) => {
        const osc = ctx!.createOscillator()
        const gain = ctx!.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const t0 = now + i * 0.28
        const t1 = t0 + 0.22
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t1)
        osc.connect(gain)
        gain.connect(ctx!.destination)
        osc.start(t0)
        osc.stop(t1 + 0.02)
      })
    } catch { /* 오디오 미지원 무시 */ }
  }, [])

  // 데스크톱 알림 — 권한 있을 때만. 미지원/거부 시 graceful 무시.
  const notify = useCallback((title: string, body: string) => {
    try {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: undefined })
      }
    } catch { /* 알림 미지원 무시 */ }
  }, [])

  const requestNotif = useCallback(() => {
    try {
      if (typeof Notification === 'undefined') { setNotifPerm('unsupported'); return }
      Notification.requestPermission().then(p => setNotifPerm(p)).catch(() => {})
    } catch { setNotifPerm('unsupported') }
  }, [])

  // 한 페이즈 종료 처리 — 알림 후 다음 페이즈로 전환.
  const handlePhaseEnd = useCallback(() => {
    const cur = phaseRef.current
    endTimeRef.current = 0 // 다음 페이즈 remaining 을 cleanup 이 덮어쓰지 않도록 만료 표시.
    beep()
    if (cur === 'focus') {
      setCycles(c => c + 1)
      notify('🍅 집중 완료!', '잘하셨어요. 잠시 휴식하세요.')
      setPhase('break')
      setRemaining(breakRef.current * 60)
    } else {
      notify('☕ 휴식 끝!', '다시 집중할 시간이에요.')
      setPhase('focus')
      setRemaining(focusRef.current * 60)
    }
    setRunning(false) // 다음 페이즈는 사용자가 직접 시작.
  }, [beep, notify])

  // 카운트다운 틱 — 절대시각 기준. endTime 을 기준으로 매 틱마다 남은 초를 ceil 로 재계산해
  // setInterval 의 누적 드리프트(탭 비활성 스로틀링 포함) 없이 정확도를 유지한다.
  useEffect(() => {
    if (!running) return
    // running 진입 시점에 현재 남은 초로부터 종료 절대시각을 산정.
    endTimeRef.current = Date.now() + remaining * 1000
    const tick = () => {
      const sec = Math.ceil((endTimeRef.current - Date.now()) / 1000)
      if (sec <= 0) {
        // 0 도달: 인터벌 정리 후 페이즈 종료 처리.
        if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
        setRemaining(0)
        handlePhaseEnd()
        return
      }
      setRemaining(sec)
    }
    intervalRef.current = window.setInterval(tick, 250)
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
      // 일시정지/정리 시 남은 ms 를 초로 보존(다음 시작에서 이 값으로 endTime 재산정).
      if (endTimeRef.current > 0) {
        const sec = Math.ceil((endTimeRef.current - Date.now()) / 1000)
        if (sec > 0) setRemaining(sec)
      }
    }
    // remaining 은 진입 시점 스냅샷으로만 사용 — 의도적으로 deps 에서 제외(매 틱 재실행 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, handlePhaseEnd])

  // 언마운트 정리 — 타이머 정지 + AudioContext 종료.
  useEffect(() => {
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
      const ctx = audioCtxRef.current
      if (ctx && ctx.state !== 'closed') { ctx.close().catch(() => {}) }
      audioCtxRef.current = null
    }
  }, [])

  const start = () => {
    if (running) return
    // 비어 있으면(0) 현재 페이즈 기준으로 재충전.
    if (remaining <= 0) {
      setRemaining((phase === 'focus' ? focusMin : breakMin) * 60)
    }
    // 첫 시작 시 오디오/알림 권한 워밍업(사용자 제스처 컨텍스트).
    if (notifPerm === 'default') requestNotif()
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const reset = () => {
    endTimeRef.current = 0 // cleanup 이 옛 endTime 으로 리셋값을 덮어쓰지 않도록 만료 표시.
    setRunning(false)
    setPhase('focus')
    setRemaining(focusMin * 60)
  }
  const resetCycles = () => {
    if (window.confirm('완료한 집중 사이클 기록을 0으로 초기화할까요?')) setCycles(0)
  }

  // 설정 확정 — onBlur/Enter 에서만 호출. 빈/유효하지 않은 입력은 기본값으로 대체 후 clampMin.
  // 정지 상태에서만 즉시 remaining 반영(진행 중이면 다음 사이클부터 적용).
  const commitFocus = () => {
    const parsed = parseInt(focusInput, 10)
    const c = clampMin(Number.isFinite(parsed) ? parsed : DEFAULT_FOCUS)
    setFocusMin(c)
    setFocusInput(String(c)) // 동일 값이라 effect 가 안 돌 수 있어 직접 표시도 정규화.
    if (!running && phase === 'focus') setRemaining(c * 60)
  }
  const commitBreak = () => {
    const parsed = parseInt(breakInput, 10)
    const c = clampMin(Number.isFinite(parsed) ? parsed : DEFAULT_BREAK)
    setBreakMin(c)
    setBreakInput(String(c))
    if (!running && phase === 'break') setRemaining(c * 60)
  }

  const totalSec = (phase === 'focus' ? focusMin : breakMin) * 60
  const progress = totalSec > 0 ? 1 - remaining / totalSec : 0
  const accentColor = phase === 'focus' ? 'var(--accent)' : 'var(--ok)'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 16, boxSizing: 'border-box', color: 'var(--text)' }
  const phaseTag: React.CSSProperties = { alignSelf: 'center', fontSize: 14, fontWeight: 700, padding: '4px 14px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', color: accentColor }
  const ring: React.CSSProperties = {
    width: 200, height: 200, borderRadius: '50%', alignSelf: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `conic-gradient(${accentColor} ${progress * 360}deg, var(--chrome-2) 0deg)`,
    transition: 'background 0.4s linear',
  }
  const ringInner: React.CSSProperties = {
    width: 168, height: 168, borderRadius: '50%', background: 'var(--paper)',
    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  }
  const timeText: React.CSSProperties = { fontSize: 42, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: 'var(--text)' }
  const subText: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }
  const statRow: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }
  const settings: React.CSSProperties = { display: 'flex', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }
  const field: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={phaseTag}>{phase === 'focus' ? '🍅 집중' : '☕ 휴식'}</div>

      <div style={ring} role="timer" aria-label={`${phase === 'focus' ? '집중' : '휴식'} 남은 시간 ${fmt(remaining)}`}>
        <div style={ringInner}>
          <div style={timeText}>{fmt(remaining)}</div>
          <div style={subText}>{phase === 'focus' ? `집중 ${focusMin}분` : `휴식 ${breakMin}분`}</div>
        </div>
      </div>

      <div style={actions}>
        {running
          ? <button className="minibtn" onClick={pause}>⏸ 정지</button>
          : <button className="btn-primary" onClick={start}>▶ 시작</button>}
        <button className="minibtn" onClick={reset}>↺ 리셋</button>
      </div>

      <div style={statRow}>
        <span>완료한 집중 사이클: <b style={{ color: 'var(--text)' }}>{cycles}</b>회</span>
        {cycles > 0 && <button className="minibtn" onClick={resetCycles}>0으로</button>}
      </div>

      <div style={settings}>
        <div style={field}>
          <label style={label} htmlFor="pomo-focus">집중(분)</label>
          <input
            id="pomo-focus" style={input} type="number" min={MIN_MIN} max={MAX_MIN}
            value={focusInput} disabled={running}
            onChange={e => setFocusInput(e.target.value)}
            onBlur={commitFocus}
            onKeyDown={e => { if (e.key === 'Enter') { commitFocus(); (e.target as HTMLInputElement).blur() } }}
          />
        </div>
        <div style={field}>
          <label style={label} htmlFor="pomo-break">휴식(분)</label>
          <input
            id="pomo-break" style={input} type="number" min={MIN_MIN} max={MAX_MIN}
            value={breakInput} disabled={running}
            onChange={e => setBreakInput(e.target.value)}
            onBlur={commitBreak}
            onKeyDown={e => { if (e.key === 'Enter') { commitBreak(); (e.target as HTMLInputElement).blur() } }}
          />
        </div>
      </div>

      {notifPerm === 'default' && (
        <button className="minibtn" onClick={requestNotif}>🔔 데스크톱 알림 켜기</button>
      )}
      <div style={hint}>
        {notifPerm === 'granted' && '완료 시 알림음과 데스크톱 알림으로 알려드립니다.'}
        {notifPerm === 'denied' && '알림이 차단되어 알림음으로만 알려드립니다.'}
        {notifPerm === 'unsupported' && '이 환경은 알림을 지원하지 않아 알림음으로만 알려드립니다.'}
        {notifPerm === 'default' && '알림을 켜면 완료 시 데스크톱 알림도 받을 수 있어요.'}
      </div>
    </div>
  )
}
