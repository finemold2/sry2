// 스톱워치(로컬) — 시작/정지/리셋과 랩 기록으로 집필 구간 시간을 1/100초까지 측정한다.
// 자급식: react 외 import 없음. performance.now()·requestAnimationFrame 등 브라우저 내장 API만 사용. 네트워크 없음.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'stopwatch', name: '스톱워치', icon: '⏱️', group: '집중·생산성', intro: '시작·정지·리셋과 랩 기록으로 집필 구간을 1/100초까지 측정', w: 420, h: 560 }

// 누적 밀리초를 mm:ss.cc(센티초) 형식으로 — 1시간 넘으면 h:mm:ss.cc.
function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms))
  const cs = Math.floor((total % 1000) / 10) // 1/100초
  const totalSec = Math.floor(total / 1000)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60) % 60
  const h = Math.floor(totalSec / 3600)
  const cc = String(cs).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) {
    const mm = String(m).padStart(2, '0')
    return `${h}:${mm}:${ss}.${cc}`
  }
  const mm = String(m).padStart(2, '0')
  return `${mm}:${ss}.${cc}`
}

interface Lap { idx: number; total: number; split: number }

export default function Stopwatch() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // 표시용 누적 ms
  const [laps, setLaps] = useState<Lap[]>([])
  const [copied, setCopied] = useState(false)

  // 시간 계산은 ref로 — 리렌더와 무관하게 정확한 누적 유지.
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)   // 이번 구간 시작 시각(performance.now 기준)
  const baseRef = useRef(0)    // 정지 시점까지 누적된 ms
  const runningRef = useRef(false)
  const copyTimerRef = useRef<number | null>(null)

  // 고해상도 시계 — 미지원 환경에서도 graceful(Date.now 폴백).
  const nowMs = () => {
    try {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now()
    } catch { /* 폴백 */ }
    return Date.now()
  }

  // rAF 루프 — 화면 갱신 주기로 elapsed 업데이트(센티초 표시에 충분).
  const tick = () => {
    if (!runningRef.current) return
    const cur = baseRef.current + (nowMs() - startRef.current)
    setElapsed(cur)
    rafRef.current = requestAnimationFrame(tick)
  }

  const start = () => {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    startRef.current = nowMs()
    rafRef.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!runningRef.current) return
    runningRef.current = false
    setRunning(false)
    baseRef.current = baseRef.current + (nowMs() - startRef.current)
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    setElapsed(baseRef.current)
  }

  const reset = () => {
    runningRef.current = false
    setRunning(false)
    baseRef.current = 0
    startRef.current = 0
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    setElapsed(0)
    setLaps([])
  }

  // 현재 누적 시각 — 진행 중이면 실시간 계산, 정지면 base.
  const currentMs = () => runningRef.current ? baseRef.current + (nowMs() - startRef.current) : baseRef.current

  const lap = () => {
    const total = currentMs()
    setLaps(prev => {
      const last = prev.length > 0 ? prev[prev.length - 1].total : 0
      return [...prev, { idx: prev.length + 1, total, split: total - last }]
    })
  }

  // 랩 기록을 텍스트로 복사. 클립보드 미지원/거부 시 graceful.
  const copyLaps = () => {
    if (laps.length === 0) return
    const lines = laps.map(l => `랩 ${l.idx}\t구간 ${fmt(l.split)}\t누적 ${fmt(l.total)}`)
    const text = lines.join('\n')
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopied(true)
            if (copyTimerRef.current != null) clearTimeout(copyTimerRef.current)
            copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }
    } catch { /* 클립보드 미지원 무시 */ }
  }

  // 언마운트 정리 — rAF·타이머 모두 해제.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      if (copyTimerRef.current != null) { clearTimeout(copyTimerRef.current); copyTimerRef.current = null }
      runningRef.current = false
    }
  }, [])

  // 가장 빠른/느린 랩 강조용 인덱스.
  let fastIdx = -1, slowIdx = -1
  if (laps.length >= 2) {
    let fast = Infinity, slow = -Infinity
    for (const l of laps) {
      if (l.split < fast) { fast = l.split; fastIdx = l.idx }
      if (l.split > slow) { slow = l.split; slowIdx = l.idx }
    }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 16, boxSizing: 'border-box', color: 'var(--text)' }
  const display: React.CSSProperties = {
    alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', minHeight: 110, borderRadius: 14, background: 'var(--paper)',
    border: '1px solid var(--border)', boxSizing: 'border-box',
  }
  const timeText: React.CSSProperties = {
    fontSize: 48, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    letterSpacing: 1, color: running ? 'var(--accent)' : 'var(--text)',
  }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }
  const lapHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)' }
  const listBox: React.CSSProperties = {
    flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--panel)',
    border: '1px solid var(--border)', borderRadius: 10, padding: 6,
  }
  const rowBase: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '56px 1fr 1fr', alignItems: 'center', gap: 8,
    padding: '8px 10px', fontSize: 14, fontVariantNumeric: 'tabular-nums', borderRadius: 8,
  }
  const colLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const empty: React.CSSProperties = { display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }

  // 랩 목록은 최신이 위로 오도록 역순 표시.
  const ordered = [...laps].reverse()

  return (
    <div style={wrap}>
      <div style={display} role="timer" aria-label={`경과 시간 ${fmt(elapsed)}`}>
        <span style={timeText}>{fmt(elapsed)}</span>
      </div>

      <div style={actions}>
        {running
          ? <button className="minibtn" onClick={stop}>⏸ 정지</button>
          : <button className="btn-primary" onClick={start}>▶ {elapsed > 0 ? '이어가기' : '시작'}</button>}
        <button className="minibtn" onClick={lap} disabled={!running}>🚩 랩</button>
        <button className="minibtn" onClick={reset} disabled={elapsed === 0 && laps.length === 0}>↺ 리셋</button>
      </div>

      <div style={lapHead}>
        <span>랩 기록 {laps.length > 0 && <b style={{ color: 'var(--text)' }}>{laps.length}</b>}</span>
        {laps.length > 0 && (
          <button className="minibtn" onClick={copyLaps}>{copied ? '✓ 복사됨' : '복사'}</button>
        )}
      </div>

      <div style={listBox}>
        {laps.length === 0 ? (
          <div style={empty}>
            진행 중 <b style={{ color: 'var(--text)' }}>🚩 랩</b> 버튼으로<br />집필 구간을 나눠 기록하세요.
          </div>
        ) : (
          ordered.map(l => {
            const isFast = l.idx === fastIdx
            const isSlow = l.idx === slowIdx
            const accent = isFast ? 'var(--ok)' : isSlow ? 'var(--warn)' : 'var(--text)'
            const bg = (l.idx % 2 === 0) ? 'transparent' : 'var(--chrome-2)'
            return (
              <div key={l.idx} style={{ ...rowBase, background: bg }}>
                <span style={{ fontWeight: 700, color: accent }}>#{l.idx}</span>
                <span>
                  <div style={colLabel}>구간 {isFast ? '(최단)' : isSlow ? '(최장)' : ''}</div>
                  <span style={{ color: accent, fontWeight: 600 }}>{fmt(l.split)}</span>
                </span>
                <span>
                  <div style={colLabel}>누적</div>
                  <span style={{ color: 'var(--muted)' }}>{fmt(l.total)}</span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
