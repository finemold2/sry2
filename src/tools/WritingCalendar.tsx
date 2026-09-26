// 집필 캘린더 — 날짜별 목표/실제 단어수를 기록해 월간 잔디 캘린더에 달성도 색으로 보여주고,
// 총합·평균·달성일수 등 통계와 일일 목표 설정을 제공한다.
// react 외 import 없음 / 외부 네트워크 없음 / 미지원(localStorage 거부) graceful / 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'writing-calendar', name: '집필 캘린더', icon: '📅', group: '집중·생산성', intro: '날짜별 목표/실제 단어수를 기록해 월간 잔디 캘린더와 통계로 집필 습관을 추적하세요', w: 700, h: 580 }

const NS = 'sry:tool:writing-calendar:'
const KEY_DATA = NS + 'data'   // { 'YYYY-MM-DD': words(number) }
const KEY_GOAL = NS + 'goal'   // 일일 목표 단어수(number)
const DEFAULT_GOAL = 500
const DOW = ['일', '월', '화', '수', '목', '금', '토']

type DayMap = Record<string, number>

// 로컬 타임존 기준 'YYYY-MM-DD'. UTC 변환으로 인한 날짜 밀림 방지.
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadData(): DayMap {
  try {
    const raw = localStorage.getItem(KEY_DATA)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const out: DayMap = {}
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.round(v)
      }
      return out
    }
  } catch { /* 미지원/손상 graceful */ }
  return {}
}

function saveData(d: DayMap) {
  try { localStorage.setItem(KEY_DATA, JSON.stringify(d)) } catch { /* 저장 거부 graceful */ }
}

function loadGoal(): number {
  try {
    const v = localStorage.getItem(KEY_GOAL)
    if (v) { const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) return n }
  } catch { /* graceful */ }
  return DEFAULT_GOAL
}

export default function WritingCalendar() {
  const [data, setData] = useState<DayMap>(loadData)
  const [goal, setGoal] = useState<number>(loadGoal)
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState<{ y: number; m: number }>(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [selected, setSelected] = useState<string>(() => dayKey(today))
  const [actualInput, setActualInput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  // 선택일이 바뀌면 입력칸을 해당 날짜의 저장값으로 동기화
  useEffect(() => {
    const v = data[selected]
    setActualInput(v != null ? String(v) : '')
  }, [selected, data])

  // 목표 변경 즉시 저장
  useEffect(() => {
    try { localStorage.setItem(KEY_GOAL, String(goal)) } catch { /* graceful */ }
  }, [goal])

  // 다른 탭에서 같은 키 변경 시 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === KEY_DATA) setData(loadData())
        else if (e.key === KEY_GOAL) setGoal(loadGoal())
      } catch { /* graceful */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => {
    if (copyTimer.current !== null) { clearTimeout(copyTimer.current); copyTimer.current = null }
  }, [])

  const todayKey = dayKey(today)

  // 달력 그리드 (앞쪽 빈 칸 포함, 일요일 시작)
  const cells = useMemo<(Date | null)[]>(() => {
    const first = new Date(view.y, view.m, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const arr: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.y, view.m, d))
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [view])

  // 이번 달 통계
  const monthStats = useMemo(() => {
    const prefix = `${view.y}-${String(view.m + 1).padStart(2, '0')}-`
    let total = 0, daysWritten = 0, goalMet = 0
    for (const k of Object.keys(data)) {
      if (!k.startsWith(prefix)) continue
      const v = data[k]
      if (v > 0) { total += v; daysWritten++; if (goal > 0 && v >= goal) goalMet++ }
    }
    const avg = daysWritten > 0 ? Math.round(total / daysWritten) : 0
    return { total, daysWritten, goalMet, avg }
  }, [data, view, goal])

  // 전체 누적(모든 기간)
  const allTotal = useMemo(() => {
    let t = 0
    for (const k of Object.keys(data)) t += data[k] || 0
    return t
  }, [data])

  // 달성도 → 색(잔디). 목표 대비 비율로 4단계.
  const cellColor = (words: number | undefined): string => {
    if (!words || words <= 0) return 'var(--chrome-2)'
    if (goal <= 0) return 'var(--accent)'
    const r = words / goal
    if (r >= 1) return 'var(--ok)'
    if (r >= 0.66) return 'color-mix(in srgb, var(--ok) 70%, var(--chrome-2))'
    if (r >= 0.33) return 'color-mix(in srgb, var(--ok) 45%, var(--chrome-2))'
    return 'color-mix(in srgb, var(--ok) 22%, var(--chrome-2))'
  }

  const setMonth = (delta: number) => {
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() })
    setSelected(todayKey)
  }

  const saveActual = () => {
    const trimmed = actualInput.trim()
    setData(prev => {
      const next = { ...prev }
      if (trimmed === '') {
        delete next[selected]
      } else {
        const n = parseInt(trimmed, 10)
        if (!Number.isFinite(n) || n < 0) return prev
        if (n === 0) delete next[selected]
        else next[selected] = n
      }
      saveData(next)
      return next
    })
  }

  const removeDay = (key: string) => {
    setData(prev => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      saveData(next)
      return next
    })
  }

  const onGoalInput = (val: string) => {
    if (val === '') { setGoal(0); return }
    const n = parseInt(val, 10)
    if (Number.isFinite(n) && n >= 0) setGoal(n)
  }

  const exportText = useMemo(() => {
    const keys = Object.keys(data).filter(k => data[k] > 0).sort()
    const lines = keys.map(k => `${k}\t${data[k]}자`)
    const header = `집필 캘린더 (일일 목표 ${goal.toLocaleString()}자)\n전체 누적 ${allTotal.toLocaleString()}자 · 기록 ${keys.length}일`
    return header + (lines.length ? '\n\n' + lines.join('\n') : '')
  }, [data, goal, allTotal])

  const copyExport = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportText)
        setCopied(true)
        if (copyTimer.current !== null) clearTimeout(copyTimer.current)
        copyTimer.current = window.setTimeout(() => { setCopied(false); copyTimer.current = null }, 1500)
      }
    } catch { /* 클립보드 미지원/거부 graceful */ }
  }

  const selDate = useMemo(() => {
    const [y, m, d] = selected.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }, [selected])
  const selWords = data[selected]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', color: 'var(--text)', gap: 12, overflow: 'auto' }
  const topRow: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const goalInput: React.CSSProperties = { width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const main: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }
  const calCol: React.CSSProperties = { flex: '1 1 380px', minWidth: 320 }
  const sideCol: React.CSSProperties = { flex: '1 1 220px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }
  const navRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }
  const monthTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' }
  const dowRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }
  const dowCell: React.CSSProperties = { textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '2px 0' }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }
  const statBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', flex: 1 }
  const statNum: React.CSSProperties = { fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: 'var(--accent)' }
  const statSub: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 }
  const editBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const actualField: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 15 }
  const legend: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', marginTop: 8, flexWrap: 'wrap' }
  const swatch = (bg: string): React.CSSProperties => ({ width: 14, height: 14, borderRadius: 4, border: '1px solid var(--border)', background: bg })
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 상단: 일일 목표 + 내보내기 */}
      <div style={topRow}>
        <span style={label}>일일 목표</span>
        <input
          type="number"
          min={0}
          value={goal === 0 ? '' : goal}
          onChange={e => onGoalInput(e.target.value)}
          style={goalInput}
          aria-label="일일 목표 단어수"
        />
        <span style={label}>자/일</span>
        <span style={{ ...label, marginLeft: 'auto' }}>누적 {allTotal.toLocaleString()}자</span>
        <button className="minibtn" onClick={copyExport} disabled={allTotal === 0}>
          {copied ? '✓ 복사됨' : '⧉ 기록 복사'}
        </button>
      </div>

      <div style={main}>
        {/* 왼쪽: 캘린더 */}
        <div style={calCol}>
          <div style={navRow}>
            <button className="minibtn" onClick={() => setMonth(-1)} aria-label="이전 달">‹</button>
            <div style={monthTitle}>{view.y}년 {view.m + 1}월</div>
            <button className="minibtn" onClick={() => setMonth(1)} aria-label="다음 달">›</button>
            <button className="minibtn" onClick={goToday}>오늘</button>
          </div>

          <div style={dowRow}>
            {DOW.map((d, i) => (
              <div key={d} style={{ ...dowCell, color: i === 0 ? 'var(--warn)' : i === 6 ? 'var(--accent)' : 'var(--muted)' }}>{d}</div>
            ))}
          </div>

          <div style={grid}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} style={{ aspectRatio: '1 / 1' }} />
              const k = dayKey(d)
              const words = data[k]
              const isToday = k === todayKey
              const isSel = k === selected
              const isFuture = d > today
              return (
                <button
                  key={i}
                  onClick={() => setSelected(k)}
                  title={words ? `${k} · ${words.toLocaleString()}자${goal > 0 ? ` (목표의 ${Math.round((words / goal) * 100)}%)` : ''}` : `${k} · 기록 없음`}
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, padding: 2, cursor: 'pointer',
                    borderRadius: 8,
                    border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: cellColor(words),
                    color: 'var(--text)',
                    opacity: isFuture ? 0.55 : 1,
                    outline: isToday ? '2px solid var(--warn)' : 'none',
                    outlineOffset: -2,
                    font: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500 }}>{d.getDate()}</span>
                  {words ? <span style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1 }}>{words >= 1000 ? `${(words / 1000).toFixed(1)}k` : words}</span> : null}
                </button>
              )
            })}
          </div>

          <div style={legend}>
            <span>적음</span>
            <span style={swatch('var(--chrome-2)')} />
            <span style={swatch('color-mix(in srgb, var(--ok) 22%, var(--chrome-2))')} />
            <span style={swatch('color-mix(in srgb, var(--ok) 45%, var(--chrome-2))')} />
            <span style={swatch('color-mix(in srgb, var(--ok) 70%, var(--chrome-2))')} />
            <span style={swatch('var(--ok)')} />
            <span>목표 달성</span>
          </div>
        </div>

        {/* 오른쪽: 통계 + 선택일 편집 */}
        <div style={sideCol}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={statBox}>
              <div style={statNum}>{monthStats.total.toLocaleString()}</div>
              <div style={statSub}>이달 총합(자)</div>
            </div>
            <div style={statBox}>
              <div style={statNum}>{monthStats.avg.toLocaleString()}</div>
              <div style={statSub}>집필일 평균</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={statBox}>
              <div style={statNum}>{monthStats.daysWritten}</div>
              <div style={statSub}>집필한 날</div>
            </div>
            <div style={statBox}>
              <div style={{ ...statNum, color: 'var(--ok)' }}>{monthStats.goalMet}</div>
              <div style={statSub}>목표 달성일</div>
            </div>
          </div>

          {/* 선택일 입력 */}
          <div style={editBox}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {selDate
                ? `${selDate.getMonth() + 1}월 ${selDate.getDate()}일 (${DOW[selDate.getDay()]})${selected === todayKey ? ' · 오늘' : ''}`
                : '날짜 선택'}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                min={0}
                value={actualInput}
                onChange={e => setActualInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveActual() }}
                placeholder="실제 단어수"
                style={actualField}
                aria-label="실제 단어수"
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" onClick={saveActual} style={{ flex: 1 }}>저장</button>
              {selWords != null && (
                <button className="minibtn" onClick={() => removeDay(selected)} title="이 날짜 기록 삭제">🗑 삭제</button>
              )}
            </div>
            {goal > 0 && selWords != null && (
              <div style={{ fontSize: 11, color: selWords >= goal ? 'var(--ok)' : 'var(--muted)' }}>
                목표의 {Math.round((selWords / goal) * 100)}%
                {selWords >= goal ? ' · 달성 🎉' : ` · ${(goal - selWords).toLocaleString()}자 남음`}
              </div>
            )}
          </div>

          <div style={hint}>
            날짜를 눌러 그날 실제 쓴 단어수를 입력하세요. 색이 진할수록 목표에 가깝습니다. 0 또는 빈칸으로 저장하면 기록이 삭제됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
