// 인터벌 타이머 — 집필 N분/휴식 M분 사이클을 설정한 횟수만큼 자동 전환한다.
// 자급식: react 외 import 없음. Web Audio(beep) 등 브라우저 내장 API만 사용하며 언마운트 시 정리.
import { useState, useEffect, useRef, useCallback } from 'react'

export const meta = { id: 'interval-timer', name: '인터벌 타이머', icon: '⏱️', group: '집중·생산성', intro: '집필·휴식 사이클을 설정 횟수만큼 자동 전환하며 단계 전환마다 알림음으로 알려줍니다', w: 400, h: 580 }

type Phase = 'work' | 'rest'

const NS = 'sry:tool:interval-timer:'
const DEFAULT_WORK = 25 // 분
const DEFAULT_REST = 5  // 분
const DEFAULT_ROUNDS = 4
const MIN_MIN = 1
const MAX_MIN = 180
const MIN_ROUNDS = 1
const MAX_ROUNDS = 20

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

function clamp(n: number, lo: number, hi: number, def: number): number {
  if (!Number.isFinite(n)) return def
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function IntervalTimer() {
  const [workMin, setWorkMin] = useState<number>(() => clamp(loadNum('work', DEFAULT_WORK), MIN_MIN, MAX_MIN, DEFAULT_WORK))
  const [restMin, setRestMin] = useState<number>(() => clamp(loadNum('rest', DEFAULT_REST), MIN_MIN, MAX_MIN, DEFAULT_REST))
  const [rounds, setRounds] = useState<number>(() => clamp(loadNum('rounds', DEFAULT_ROUNDS), MIN_ROUNDS, MAX_ROUNDS, DEFAULT_ROUNDS))

  const [phase, setPhase] = useState<Phase>('work')
  const [round, setRound] = useState(1) // 현재 진행 중인 라운드(1부터)
  const [remaining, setRemaining] = useState<number>(() => clamp(loadNum('work', DEFAULT_WORK), MIN_MIN, MAX_MIN, DEFAULT_WORK) * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false) // 모든 라운드 완료

  const intervalRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // 콜백 안에서 최신 상태를 참조하기 위한 ref들.
  const phaseRef = useRef<Phase>(phase)
  const roundRef = useRef(round)
  const workRef = useRef(workMin)
  const restRef = useRef(restMin)
  const roundsRef = useRef(rounds)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { roundRef.current = round }, [round])
  useEffect(() => { workRef.current = workMin }, [workMin])
  useEffect(() => { restRef.current = restMin }, [restMin])
  useEffect(() => { roundsRef.current = rounds }, [rounds])

  // 설정 영속화.
  useEffect(() => { saveNum('work', workMin) }, [workMin])
  useEffect(() => { saveNum('rest', restMin) }, [restMin])
  useEffect(() => { saveNum('rounds', rounds) }, [rounds])

  // 알림음 — Web Audio로 짧은 비프. count 만큼 연속음(완료 시 3회). 미지원/실패 시 graceful 무시.
  const beep = useCallback((count = 2) => {
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
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        // 음을 번갈아 살짝 높여 전환을 인지하기 쉽게.
        osc.frequency.value = 760 + (i % 2 === 0 ? 120 : 0)
        const t0 = now + i * 0.26
        const t1 = t0 + 0.2
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t1)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t0)
        osc.stop(t1 + 0.02)
      }
    } catch { /* 오디오 미지원 무시 */ }
  }, [])

  // 한 단계 종료 처리 — 알림 후 다음 단계/라운드로 자동 전환, 마지막엔 완료.
  const handlePhaseEnd = useCallback(() => {
    const cur = phaseRef.current
    if (cur === 'work') {
      // 집필 끝 → 휴식으로 전환.
      beep(2)
      setPhase('rest')
      setRemaining(restRef.current * 60)
    } else {
      // 휴식 끝 → 한 라운드 완료. 다음 라운드가 있으면 집필, 없으면 종료.
      const curRound = roundRef.current
      if (curRound >= roundsRef.current) {
        beep(3)
        setRunning(false)
        setDone(true)
        setRemaining(0)
      } else {
        beep(2)
        setRound(r => r + 1)
        setPhase('work')
        setRemaining(workRef.current * 60)
      }
    }
  }, [beep])

  // 카운트다운 틱 — 자동 전환이므로 종료 후에도 running 유지(완료 시에만 멈춤).
  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          // 0 도달: 단계 종료 처리(다음 단계 remaining 을 직접 설정).
          handlePhaseEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
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
    // 완료 상태였거나 비어 있으면 처음부터 다시.
    if (done || remaining <= 0) {
      setDone(false)
      setPhase('work')
      setRound(1)
      setRemaining(workMin * 60)
    }
    // 첫 시작 시 오디오 컨텍스트 워밍업(사용자 제스처) — 무음 톤.
    beep(0)
    setRunning(true)
  }
  const stop = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setDone(false)
    setPhase('work')
    setRound(1)
    setRemaining(workMin * 60)
  }

  // 설정 변경 — 정지(미진행) 상태에서만 즉시 반영. 진행 중엔 비활성.
  const onWork = (n: number) => {
    const c = clamp(n, MIN_MIN, MAX_MIN, DEFAULT_WORK)
    setWorkMin(c)
    if (!running && !done && phase === 'work') setRemaining(c * 60)
  }
  const onRest = (n: number) => {
    const c = clamp(n, MIN_MIN, MAX_MIN, DEFAULT_REST)
    setRestMin(c)
    if (!running && !done && phase === 'rest') setRemaining(c * 60)
  }
  const onRounds = (n: number) => {
    setRounds(clamp(n, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_ROUNDS))
  }

  const isWork = phase === 'work'
  const accentColor = done ? 'var(--ok)' : (isWork ? 'var(--accent)' : 'var(--ok)')
  const totalSec = (isWork ? workMin : restMin) * 60
  const progress = done ? 1 : (totalSec > 0 ? 1 - remaining / totalSec : 0)
  const settingsDisabled = running || done

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 16, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
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
  const dots: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }
  const settings: React.CSSProperties = { display: 'flex', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }
  const field: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={phaseTag}>
        {done ? '🎉 모든 사이클 완료' : (isWork ? '✍️ 집필' : '☕ 휴식')}
      </div>

      <div style={ring} role="timer" aria-label={done ? '완료' : `${isWork ? '집필' : '휴식'} 남은 시간 ${fmt(remaining)}`}>
        <div style={ringInner}>
          <div style={timeText}>{done ? '00:00' : fmt(remaining)}</div>
          <div style={subText}>
            {done ? `${rounds}사이클 완료` : `${round} / ${rounds} 라운드`}
          </div>
        </div>
      </div>

      {/* 라운드 진행 점 */}
      <div style={dots}>
        {Array.from({ length: rounds }, (_, i) => {
          const num = i + 1
          const completed = done || num < round || (num === round && !isWork)
          const active = !done && num === round
          return (
            <span
              key={i}
              title={`${num}라운드`}
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: completed ? 'var(--ok)' : (active ? accentColor : 'var(--chrome-2)'),
                border: '1px solid var(--border)',
                transition: 'background 0.25s',
              }}
            />
          )
        })}
      </div>

      <div style={actions}>
        {running
          ? <button className="minibtn" onClick={stop}>⏸ 정지</button>
          : <button className="btn-primary" onClick={start}>{done ? '↻ 다시 시작' : '▶ 시작'}</button>}
        <button className="minibtn" onClick={reset}>↺ 리셋</button>
      </div>

      <div style={settings}>
        <div style={field}>
          <label style={label} htmlFor="iv-work">집필(분)</label>
          <input
            id="iv-work" style={input} type="number" min={MIN_MIN} max={MAX_MIN}
            value={workMin} disabled={settingsDisabled}
            onChange={e => onWork(parseInt(e.target.value, 10))}
          />
        </div>
        <div style={field}>
          <label style={label} htmlFor="iv-rest">휴식(분)</label>
          <input
            id="iv-rest" style={input} type="number" min={MIN_MIN} max={MAX_MIN}
            value={restMin} disabled={settingsDisabled}
            onChange={e => onRest(parseInt(e.target.value, 10))}
          />
        </div>
        <div style={field}>
          <label style={label} htmlFor="iv-rounds">횟수</label>
          <input
            id="iv-rounds" style={input} type="number" min={MIN_ROUNDS} max={MAX_ROUNDS}
            value={rounds} disabled={settingsDisabled}
            onChange={e => onRounds(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <div style={hint}>
        집필 {workMin}분 → 휴식 {restMin}분을 {rounds}회 반복합니다. 단계가 바뀔 때마다 알림음으로 알려드려요.
      </div>
    </div>
  )
}
