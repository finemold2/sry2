// 집중 호흡(박스 브리딩) — 들숨4·멈춤4·날숨4·멈춤4 시각 애니메이션과 사이클 카운트.
// 자급식: react 외 import 없음. 타이머만 사용하며 언마운트 시 정리한다.
import { useState, useEffect, useRef, useCallback } from 'react'

export const meta = { id: 'breathing-timer', name: '집중 호흡', icon: '🫁', group: '집중·생산성', intro: '박스 브리딩(4-4-4-4)으로 마음을 가다듬어요', w: 360, h: 480 }

// 박스 브리딩 4단계 — 각 단계 4초.
type PhaseKey = 'in' | 'hold1' | 'out' | 'hold2'
interface Phase { key: PhaseKey; label: string; sub: string; scale: number; color: string }
const SECONDS = 4
const PHASES: Phase[] = [
  { key: 'in', label: '들숨', sub: '천천히 들이마시기', scale: 1, color: 'var(--accent)' },
  { key: 'hold1', label: '멈춤', sub: '잠시 멈추기', scale: 1, color: 'var(--ok)' },
  { key: 'out', label: '날숨', sub: '천천히 내쉬기', scale: 0.45, color: 'var(--warn)' },
  { key: 'hold2', label: '멈춤', sub: '잠시 멈추기', scale: 0.45, color: 'var(--ok)' },
]
const LS_KEY = 'sry:tool:breathing-timer:cycles'

function loadCycles(): number {
  try {
    const v = localStorage.getItem(LS_KEY)
    const n = v ? parseInt(v, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch { return 0 }
}

export default function BreathingTimer() {
  const [running, setRunning] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [remain, setRemain] = useState(SECONDS) // 현재 단계 남은 초(표시용)
  const [cycle, setCycle] = useState(0) // 이번 세션 사이클
  const [total, setTotal] = useState(() => loadCycles()) // 누적 사이클
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 1초 간격으로 카운트다운 → 0 도달 시 다음 단계로 전환, 한 사이클 완료 시 카운트 증가.
  useEffect(() => {
    if (!running) { clearTimer(); return }
    timerRef.current = window.setInterval(() => {
      setRemain(prev => {
        if (prev > 1) return prev - 1
        // 단계 종료 → 다음 단계
        setPhaseIdx(pi => {
          const next = (pi + 1) % PHASES.length
          if (next === 0) {
            // hold2 종료 → 한 사이클 완료
            setCycle(c => c + 1)
            setTotal(t => {
              const nt = t + 1
              try { localStorage.setItem(LS_KEY, String(nt)) } catch {}
              return nt
            })
          }
          return next
        })
        return SECONDS
      })
    }, 1000)
    return clearTimer
  }, [running, clearTimer])

  // 언마운트 시 타이머 정지(안전망).
  useEffect(() => clearTimer, [clearTimer])

  const start = () => {
    setPhaseIdx(0)
    setRemain(SECONDS)
    setCycle(0)
    setRunning(true)
  }
  const stop = () => { setRunning(false); clearTimer() }

  const resetTotal = () => {
    setTotal(0)
    try { localStorage.removeItem(LS_KEY) } catch {}
  }

  const phase = PHASES[phaseIdx]
  // 원 크기: 단계의 목표 scale을 향해 4초에 걸쳐 부드럽게 전환(transition으로 처리).
  const baseSize = 200
  const elapsed = SECONDS - remain // 단계 진행도(표시용)

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, boxSizing: 'border-box', color: 'var(--text)', alignItems: 'center', justifyContent: 'space-between' }
  const stage: React.CSSProperties = { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 220 }
  const ring: React.CSSProperties = {
    width: baseSize, height: baseSize, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    border: `3px solid ${phase.color}`,
    background: 'var(--paper)',
    transform: `scale(${running ? phase.scale : 0.7})`,
    // 들숨/날숨은 4초 전환, 멈춤은 크기 유지(transition을 짧게).
    transition: running
      ? ((phase.key === 'in' || phase.key === 'out') ? `transform ${SECONDS}s ease-in-out` : 'transform 0.3s ease-out')
      : 'transform 0.4s ease-out',
    boxShadow: running ? `0 0 28px -6px ${phase.color}` : 'none',
    boxSizing: 'border-box',
  }
  const ringInner: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }
  const phaseLabel: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: phase.color }
  const phaseSub: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const phaseCount: React.CSSProperties = { fontSize: 34, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }
  const statRow: React.CSSProperties = { display: 'flex', gap: 16, width: '100%', justifyContent: 'center' }
  const statBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 88 }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }
  const statCap: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 }
  const dots: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={stage}>
        <div style={ring} aria-live="polite">
          <div style={ringInner}>
            {running ? (
              <>
                <div style={phaseLabel}>{phase.label}</div>
                <div style={phaseCount}>{remain}</div>
                <div style={phaseSub}>{phase.sub}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>준비</div>
                <div style={phaseSub}>시작을 눌러주세요</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4단계 진행 표시 점 */}
      <div style={dots}>
        {PHASES.map((p, i) => (
          <span
            key={i}
            title={p.label}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: running && i === phaseIdx ? p.color : 'var(--chrome-2)',
              border: '1px solid var(--border)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      <div style={statRow}>
        <div style={statBox}>
          <div style={statNum}>{cycle}</div>
          <div style={statCap}>이번 세션</div>
        </div>
        <div style={statBox}>
          <div style={statNum}>{total}</div>
          <div style={statCap}>누적 사이클</div>
        </div>
      </div>

      <div style={actions}>
        {running ? (
          <button className="btn-primary" onClick={stop}>⏹ 정지</button>
        ) : (
          <button className="btn-primary" onClick={start}>▶ 시작</button>
        )}
        <button className="minibtn" onClick={resetTotal} disabled={total === 0}>누적 초기화</button>
      </div>

      <div style={hint}>
        4초 들숨 → 4초 멈춤 → 4초 날숨 → 4초 멈춤. 원의 호흡에 맞춰 천천히 따라 해보세요.
      </div>
    </div>
  )
}
