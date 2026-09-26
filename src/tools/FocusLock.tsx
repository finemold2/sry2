// 집중 잠금 — 전체화면 + Wake Lock(화면 켜짐 유지) + 경과 타이머로 몰입 환경을 만든다.
// 외부 네트워크/라이브러리 불필요. 브라우저 내장 API(Fullscreen / Screen Wake Lock)만 사용.
import { useState, useEffect, useRef, useCallback } from 'react'

export const meta = { id: 'focus-lock', name: '집중 잠금', icon: '🔒', group: '집중·생산성', intro: '전체화면+화면 켜짐 유지로 몰입에 잠겨보세요', w: 460, h: 520 }

const LS_KEY = 'sry:tool:focus-lock:total'

// ms → HH:MM:SS / MM:SS 표기
function fmt(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// 미지원 환경에서도 타입 에러 없이 다루기 위한 느슨한 타입
type WakeSentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: string, cb: () => void) => void } | null

export default function FocusLock() {
  const [locked, setLocked] = useState(false)
  const [elapsed, setElapsed] = useState(0)        // 현재 세션 경과(ms)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)            // 누적 총 집중 시간(ms)
  const [msg, setMsg] = useState('')               // 상태/안내 메시지
  const [wakeActive, setWakeActive] = useState(false)
  const [fsSupported] = useState(() => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen)
  const [wakeSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator)

  const wakeRef = useRef<WakeSentinel>(null)
  const tickRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const startAtRef = useRef<number | null>(null)
  const lockedRef = useRef(false)

  // 누적 시간 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const n = Number(raw)
        if (Number.isFinite(n) && n >= 0) setTotal(n)
      }
    } catch { /* localStorage 접근 거부 무시 */ }
  }, [])

  // Wake Lock 요청
  const requestWake = useCallback(async () => {
    if (!wakeSupported) return
    try {
      const wl = await (navigator as any).wakeLock.request('screen')
      wakeRef.current = wl
      setWakeActive(true)
      // OS/브라우저가 자동 해제(탭 전환 등)할 때 상태 반영
      wl.addEventListener?.('release', () => { setWakeActive(false) })
    } catch {
      setWakeActive(false)
      setMsg('화면 켜짐 유지(Wake Lock)를 사용할 수 없어 타이머만 진행합니다.')
    }
  }, [wakeSupported])

  // Wake Lock 해제
  const releaseWake = useCallback(async () => {
    const wl = wakeRef.current
    wakeRef.current = null
    setWakeActive(false)
    try { if (wl && !wl.released) await wl.release() } catch { /* 무시 */ }
  }, [])

  // 누적 시간 적립 + 저장
  const commitSession = useCallback((sessionMs: number) => {
    setTotal(prev => {
      const next = prev + Math.max(0, sessionMs)
      try { localStorage.setItem(LS_KEY, String(next)) } catch { /* 무시 */ }
      return next
    })
  }, [])

  // 잠금 종료(정리). commit=true면 이번 세션 시간을 누적에 더한다.
  const stopLock = useCallback(async (commit: boolean) => {
    if (!lockedRef.current) return
    lockedRef.current = false

    if (tickRef.current != null) { clearInterval(tickRef.current); tickRef.current = null }

    if (commit && startAtRef.current != null) {
      commitSession(Date.now() - startAtRef.current)
    }
    startAtRef.current = null
    setStartAt(null)
    setElapsed(0)
    setLocked(false)

    await releaseWake()

    // 전체화면 해제 (이미 빠져나온 경우 graceful)
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch { /* 무시 */ }
  }, [commitSession, releaseWake])

  // 잠금 시작
  const startLock = useCallback(async () => {
    if (lockedRef.current) return
    setMsg('')

    // 전체화면 시도 (미지원/거부 시 타이머만 진행)
    if (fsSupported && rootRef.current) {
      try {
        await rootRef.current.requestFullscreen()
      } catch {
        setMsg('전체화면을 사용할 수 없어 타이머와 화면 켜짐 유지만 진행합니다.')
      }
    } else if (!fsSupported) {
      setMsg('이 브라우저는 전체화면을 지원하지 않아 타이머만 진행합니다.')
    }

    await requestWake()

    const now = Date.now()
    startAtRef.current = now
    lockedRef.current = true
    setStartAt(now)
    setElapsed(0)
    setLocked(true)

    if (tickRef.current != null) clearInterval(tickRef.current)
    tickRef.current = window.setInterval(() => {
      if (startAtRef.current != null) setElapsed(Date.now() - startAtRef.current)
    }, 250)
  }, [fsSupported, requestWake])

  // 사용자가 ESC 등으로 전체화면을 빠져나가면 잠금도 종료(세션 적립)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && lockedRef.current && fsSupported) {
        stopLock(true)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [stopLock, fsSupported])

  // 탭 복귀 시 Wake Lock 재요청(브라우저가 자동 해제했을 수 있음)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && lockedRef.current && wakeSupported && !wakeRef.current) {
        requestWake()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [requestWake, wakeSupported])

  // 언마운트 정리: 타이머/Wake Lock/전체화면 모두 정리(세션은 적립)
  useEffect(() => {
    return () => {
      if (tickRef.current != null) { clearInterval(tickRef.current); tickRef.current = null }
      const wl = wakeRef.current
      wakeRef.current = null
      try { if (wl && !wl.released) wl.release() } catch { /* 무시 */ }
      try { if (document.fullscreenElement) document.exitFullscreen() } catch { /* 무시 */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetTotal = () => {
    setTotal(0)
    try { localStorage.removeItem(LS_KEY) } catch { /* 무시 */ }
  }

  const wrap: React.CSSProperties = {
    height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
    padding: 16, boxSizing: 'border-box', color: 'var(--text)',
    background: locked ? 'var(--paper)' : 'transparent',
  }
  const stage: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 10, textAlign: 'center',
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, padding: 20,
  }
  const lockIcon: React.CSSProperties = { fontSize: 40, lineHeight: 1 }
  const clock: React.CSSProperties = {
    fontSize: 54, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    letterSpacing: 1, color: locked ? 'var(--accent)' : 'var(--text)',
  }
  const sub: React.CSSProperties = { fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }
  const badgeRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }
  const badge = (on: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '3px 10px', borderRadius: 999,
    border: '1px solid var(--border)',
    color: on ? 'var(--ok)' : 'var(--muted)',
    background: 'var(--panel)',
  })
  const actions: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }
  const totalBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 12px', fontSize: 14,
  }
  const note: React.CSSProperties = { fontSize: 12, color: 'var(--warn)', lineHeight: 1.5, textAlign: 'center' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }

  return (
    <div ref={rootRef} style={wrap}>
      <div style={stage}>
        <div style={lockIcon}>{locked ? '🔒' : '🔓'}</div>
        <div style={clock}>{fmt(locked ? elapsed : 0)}</div>
        <div style={sub}>{locked ? '집중에 잠겨 있습니다' : '시작하면 집중 모드로 잠깁니다'}</div>
        <div style={badgeRow}>
          <span style={badge(locked && !!document.fullscreenElement)}>
            {fsSupported ? (locked && document.fullscreenElement ? '✓ 전체화면' : '전체화면') : '전체화면 미지원'}
          </span>
          <span style={badge(wakeActive)}>
            {wakeSupported ? (wakeActive ? '✓ 화면 켜짐 유지' : '화면 켜짐 유지') : '화면 켜짐 미지원'}
          </span>
        </div>
      </div>

      {msg && <div style={note}>{msg}</div>}

      <div style={actions}>
        {!locked ? (
          <button className="btn-primary" onClick={startLock}>🔒 집중 잠금 시작</button>
        ) : (
          <button className="minibtn" onClick={() => stopLock(true)}>⏹ 종료</button>
        )}
      </div>

      <div style={totalBox}>
        <span style={{ color: 'var(--muted)' }}>누적 집중 시간</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
        <button className="minibtn" onClick={resetTotal} disabled={total === 0}>초기화</button>
      </div>

      <div style={hint}>
        전체화면은 ESC로 빠져나갈 수 있으며, 그 순간 세션이 자동 종료됩니다.
        {(!fsSupported || !wakeSupported) && ' 지원되지 않는 기능은 자동으로 건너뜁니다.'}
      </div>
    </div>
  )
}
