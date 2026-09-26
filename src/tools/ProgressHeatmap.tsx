// 집필 히트맵 — 날짜별 집필량(글자/단어)을 기록해 GitHub식 잔디(요일×주 격자)로 1년치를 보여주고
// 연속 집필일(스트릭)·합계·평균·집필일수 통계와 오늘 빠른 입력, 날짜별 편집/삭제, 내보내기를 제공한다.
// react / './linkbus' 외 import 없음. 외부 네트워크·미디어·키 없음. localStorage 영속. 언마운트 시 타이머/리스너 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = {
  id: 'progress-heatmap',
  name: '집필 히트맵',
  icon: '🟩',
  group: '집중·생산성',
  intro: '날짜별 집필량을 기록해 GitHub식 잔디·스트릭·합계/평균 통계로 한눈에',
  w: 760,
  h: 600,
}

// ---------- 저장 ----------
const NS = 'sry:tool:progress-heatmap:'
const KEY_DATA = NS + 'data'     // { 'YYYY-MM-DD': amount(number) }
const KEY_PREF = NS + 'pref'     // { unit:'char'|'word', goal:number }

const DAY_MS = 24 * 60 * 60 * 1000
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

type Unit = 'char' | 'word'
type DayMap = Record<string, number>
interface Pref { unit: Unit; goal: number }

const DEFAULT_PREF: Pref = { unit: 'char', goal: 1000 }

// ---------- 날짜 유틸(로컬 타임존 기준, UTC 밀림 방지) ----------
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function parseKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// ---------- 영속 로드/저장(미지원·손상 graceful) ----------
function loadData(): DayMap {
  try {
    const raw = localStorage.getItem(KEY_DATA)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const out: DayMap = {}
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (parseKey(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.round(v)
      }
      return out
    }
  } catch { /* graceful */ }
  return {}
}
function saveData(d: DayMap) {
  try { localStorage.setItem(KEY_DATA, JSON.stringify(d)) } catch { /* 저장 거부/용량 초과 무시 */ }
}
function loadPref(): Pref {
  try {
    const raw = localStorage.getItem(KEY_PREF)
    if (raw) {
      const p = JSON.parse(raw)
      const unit: Unit = p?.unit === 'word' ? 'word' : 'char'
      const goal = typeof p?.goal === 'number' && Number.isFinite(p.goal) && p.goal >= 0 ? Math.round(p.goal) : DEFAULT_PREF.goal
      return { unit, goal }
    }
  } catch { /* graceful */ }
  return { ...DEFAULT_PREF }
}
function savePref(p: Pref) {
  try { localStorage.setItem(KEY_PREF, JSON.stringify(p)) } catch { /* graceful */ }
}

// ---------- 통계 ----------
// 현재 스트릭: 오늘(또는 오늘 미기록 시 어제)부터 거꾸로 연속 기록일 수.
function currentStreak(data: DayMap): number {
  const today = startOfDay(new Date())
  const hasToday = !!data[dayKey(today)]
  let cursor = hasToday ? today : addDays(today, -1)
  let count = 0
  while (data[dayKey(cursor)]) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}
// 최장 스트릭: 전체 기록에서 가장 긴 연속 구간.
function longestStreak(keys: string[]): number {
  if (keys.length === 0) return 0
  const sorted = [...keys].sort()
  let best = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const a = parseKey(sorted[i - 1]); const b = parseKey(sorted[i])
    if (!a || !b) { run = 1; continue }
    const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS)
    if (diff === 1) { run++; if (run > best) best = run }
    else if (diff !== 0) run = 1
  }
  return best
}

// ---------- 잔디 격자 만들기 ----------
// 끝 날짜(보통 오늘)에서 weeks주 만큼 거꾸로, 일요일 정렬. 열=주, 행=요일(0=일).
interface GridCell { date: Date; key: string; future: boolean }
interface MonthMark { col: number; label: string }
function buildGrid(end: Date, weeks: number): { cols: GridCell[][]; months: MonthMark[] } {
  const today = startOfDay(new Date())
  const endStart = startOfDay(end)
  // 끝 주의 토요일을 마지막 칸으로
  const lastSat = addDays(endStart, 6 - endStart.getDay())
  const totalDays = weeks * 7
  const start = addDays(lastSat, -(totalDays - 1)) // 어떤 일요일
  const cols: GridCell[][] = []
  const months: MonthMark[] = []
  let prevMonth = -1
  for (let w = 0; w < weeks; w++) {
    const col: GridCell[] = []
    for (let r = 0; r < 7; r++) {
      const d = addDays(start, w * 7 + r)
      col.push({ date: d, key: dayKey(d), future: d > today })
    }
    cols.push(col)
    // 그 주의 첫날(일) 기준 월이 바뀌면 라벨
    const firstOfCol = col[0].date
    const mo = firstOfCol.getMonth()
    if (mo !== prevMonth) { months.push({ col: w, label: MONTH_LABELS[mo] }); prevMonth = mo }
  }
  return { cols, months }
}

// ---------- 색 단계(0~4) ----------
// 값/목표 비율로 4단계. 목표 0이면 기록 유무만.
function levelOf(amount: number | undefined, goal: number): number {
  if (!amount || amount <= 0) return 0
  if (goal <= 0) return 4
  const r = amount / goal
  if (r >= 1) return 4
  if (r >= 0.66) return 3
  if (r >= 0.33) return 2
  return 1
}
const LEVEL_BG = [
  'var(--chrome-2)',
  'color-mix(in srgb, var(--ok) 25%, var(--chrome-2))',
  'color-mix(in srgb, var(--ok) 50%, var(--chrome-2))',
  'color-mix(in srgb, var(--ok) 75%, var(--chrome-2))',
  'var(--ok)',
]

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const fmtShort = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

// 주 수 옵션
const WEEK_OPTIONS = [
  { weeks: 27, label: '6개월' },
  { weeks: 53, label: '1년' },
  { weeks: 105, label: '2년' },
]

export default function ProgressHeatmap({ payload }: { payload?: Record<string, unknown> }) {
  const [data, setData] = useState<DayMap>(loadData)
  const [pref, setPref] = useState<Pref>(loadPref)
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = useMemo(() => dayKey(today), [today])

  const [weeks, setWeeks] = useState<number>(53)
  // 격자의 끝 날짜(스크롤/이동용). 기본 오늘.
  const [endDate, setEndDate] = useState<Date>(() => startOfDay(new Date()))
  const [selected, setSelected] = useState<string>(todayKey)
  const [input, setInput] = useState<string>('')
  const [quickInput, setQuickInput] = useState<string>('')
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const addTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // payload 로 들어온 단어수 등으로 오늘 빠른입력 프리필
  useEffect(() => {
    if (!payload) return
    const v = (payload.words ?? payload.chars ?? payload.amount) as unknown
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) setQuickInput(String(Math.round(v)))
    if (payload.unit === 'word' || payload.unit === 'char') {
      setPref((p) => { const np = { ...p, unit: payload.unit as Unit }; savePref(np); return np })
    }
  }, [payload])

  // 선택일 변경 시 편집 입력 동기화
  useEffect(() => {
    const v = data[selected]
    setInput(v != null ? String(v) : '')
  }, [selected, data])

  // 다른 탭/창 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_DATA) setData(loadData())
      else if (e.key === KEY_PREF) setPref(loadPref())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 언마운트 타이머 정리
  useEffect(() => () => {
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    if (addTimer.current !== null) clearTimeout(addTimer.current)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
  }, [])

  const unitLabel = pref.unit === 'word' ? '단어' : '글자'

  // ---------- 파생 통계 ----------
  const keys = useMemo(() => Object.keys(data), [data])
  const stats = useMemo(() => {
    let total = 0, best = 0, goalMet = 0
    for (const k of keys) {
      const v = data[k]
      total += v
      if (v > best) best = v
      if (pref.goal > 0 && v >= pref.goal) goalMet++
    }
    const dwritten = keys.length
    const avg = dwritten > 0 ? Math.round(total / dwritten) : 0
    return { total, best, goalMet, dwritten, avg }
  }, [keys, data, pref.goal])

  const curStreak = useMemo(() => currentStreak(data), [data])
  const maxStreak = useMemo(() => longestStreak(keys), [keys])

  // 화면 격자 범위 내 합계(보이는 기간)
  const grid = useMemo(() => buildGrid(endDate, weeks), [endDate, weeks])
  const rangeStats = useMemo(() => {
    let total = 0, days = 0
    const first = grid.cols[0]?.[0]?.key
    const last = grid.cols[grid.cols.length - 1]?.[6]?.key
    if (!first || !last) return { total, days, first, last }
    for (const k of keys) {
      if (k >= first && k <= last) { total += data[k]; days++ }
    }
    return { total, days, first, last }
  }, [grid, keys, data])

  // ---------- 동작 ----------
  const writeData = useCallback((next: DayMap) => {
    setData(next)
    saveData(next)
  }, [])

  const setDayAmount = useCallback((key: string, raw: string) => {
    const trimmed = raw.trim()
    setData((prev) => {
      const next = { ...prev }
      if (trimmed === '') { delete next[key] }
      else {
        const n = parseInt(trimmed, 10)
        if (!Number.isFinite(n) || n < 0) return prev
        if (n <= 0) delete next[key]
        else next[key] = n
      }
      saveData(next)
      return next
    })
  }, [])

  const saveSelected = useCallback(() => {
    setDayAmount(selected, input)
    doFlash(`${selected} 저장됨`)
  }, [selected, input, setDayAmount])

  const removeSelected = useCallback(() => {
    setData((prev) => {
      if (!(selected in prev)) return prev
      const next = { ...prev }; delete next[selected]; saveData(next); return next
    })
    doFlash(`${selected} 삭제됨`)
  }, [selected])

  const quickAdd = useCallback(() => {
    const trimmed = quickInput.trim()
    if (trimmed === '') return
    const n = parseInt(trimmed, 10)
    if (!Number.isFinite(n) || n <= 0) return
    // 오늘 값을 "추가(누적)"한다.
    setData((prev) => {
      const next = { ...prev }
      next[todayKey] = (next[todayKey] || 0) + n
      saveData(next)
      return next
    })
    setQuickInput('')
    setSelected(todayKey)
    doFlash(`오늘 +${n.toLocaleString()}${unitLabel}`)
  }, [quickInput, todayKey, unitLabel])

  const setQuickReplace = useCallback(() => {
    const trimmed = quickInput.trim()
    if (trimmed === '') return
    const n = parseInt(trimmed, 10)
    if (!Number.isFinite(n) || n < 0) return
    setData((prev) => {
      const next = { ...prev }
      if (n <= 0) delete next[todayKey]; else next[todayKey] = n
      saveData(next)
      return next
    })
    setQuickInput('')
    setSelected(todayKey)
    doFlash(n <= 0 ? '오늘 기록 삭제' : `오늘 ${n.toLocaleString()}${unitLabel}로 설정`)
  }, [quickInput, todayKey, unitLabel])

  const doFlash = useCallback((msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { setFlash(null); flashTimer.current = null }, 1600)
  }, [])

  const changeUnit = (u: Unit) => setPref((p) => { const np = { ...p, unit: u }; savePref(np); return np })
  const changeGoal = (val: string) => {
    if (val === '') { setPref((p) => { const np = { ...p, goal: 0 }; savePref(np); return np }); return }
    const n = parseInt(val, 10)
    if (Number.isFinite(n) && n >= 0) setPref((p) => { const np = { ...p, goal: n }; savePref(np); return np })
  }

  const shiftRange = (deltaWeeks: number) => {
    setEndDate((d) => {
      const moved = addDays(d, deltaWeeks * 7)
      // 미래로 못 넘어가게 오늘로 클램프
      return moved > today ? today : moved
    })
  }
  const resetRange = () => setEndDate(today)

  // ---------- 좌측 바인더 파일 드롭 → 글자수 산정 ----------
  const onDrop = (e: React.DragEvent) => {
    setDropActive(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const text = item.text || ''
    const chars = text.replace(/\s+/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const amount = pref.unit === 'word' ? words : chars
    if (amount > 0) {
      setData((prev) => {
        const next = { ...prev }
        next[todayKey] = (next[todayKey] || 0) + amount
        saveData(next)
        return next
      })
      setSelected(todayKey)
      doFlash(`「${item.title}」 +${amount.toLocaleString()}${unitLabel}`)
    } else {
      doFlash('본문이 비어 있어요')
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDropActive(true) }
  }
  const onDragLeave = () => setDropActive(false)

  // ---------- 내보내기 ----------
  const exportText = useMemo(() => {
    const ks = [...keys].sort()
    const header =
      `집필 히트맵 (${unitLabel} 단위${pref.goal > 0 ? ` · 일일 목표 ${pref.goal.toLocaleString()}` : ''})\n` +
      `누적 ${stats.total.toLocaleString()}${unitLabel} · 집필 ${stats.dwritten}일 · 현재 연속 ${curStreak}일 · 최장 연속 ${maxStreak}일`
    const lines = ks.map((k) => `${k}\t${data[k].toLocaleString()}`)
    return header + (lines.length ? '\n\n' + lines.join('\n') : '')
  }, [keys, data, unitLabel, pref.goal, stats, curStreak, maxStreak])

  const copyExport = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportText)
        setCopied(true)
        if (copyTimer.current !== null) clearTimeout(copyTimer.current)
        copyTimer.current = window.setTimeout(() => { setCopied(false); copyTimer.current = null }, 1500)
      }
    } catch { /* graceful */ }
  }

  // 프로젝트에 추가(자료 폴더에 리포트 문서)
  const addReport = () => {
    if (!hasProjectBridge()) return
    const ks = [...keys].sort()
    const rows = ks.map((k) => `<tr><td>${escapeHtml(k)}</td><td style="text-align:right">${data[k].toLocaleString()}</td></tr>`).join('')
    const body =
      `<h2>집필 히트맵 리포트</h2>` +
      `<p>단위: ${escapeHtml(unitLabel)}${pref.goal > 0 ? ` · 일일 목표 ${pref.goal.toLocaleString()}` : ''}</p>` +
      `<ul>` +
      `<li>누적: ${stats.total.toLocaleString()} ${escapeHtml(unitLabel)}</li>` +
      `<li>집필한 날: ${stats.dwritten}일</li>` +
      `<li>집필일 평균: ${stats.avg.toLocaleString()} ${escapeHtml(unitLabel)}</li>` +
      `<li>현재 연속: ${curStreak}일 · 최장 연속: ${maxStreak}일</li>` +
      (pref.goal > 0 ? `<li>목표 달성일: ${stats.goalMet}일</li>` : '') +
      `</ul>` +
      (rows ? `<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>날짜</th><th>${escapeHtml(unitLabel)}</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>아직 기록이 없습니다.</p>')
    const id = addToProject({ root: 'research', folder: '집필 기록', title: `집필 히트맵 (${todayKey})`, bodyHtml: body })
    if (id) {
      setAdded(true)
      if (addTimer.current !== null) clearTimeout(addTimer.current)
      addTimer.current = window.setTimeout(() => { setAdded(false); addTimer.current = null }, 1600)
    }
  }

  const clearAll = () => {
    if (keys.length === 0) return
    if (!window.confirm(`모든 집필 기록(${keys.length}일)을 삭제할까요? 되돌릴 수 없습니다.`)) return
    writeData({})
    doFlash('전체 기록 삭제됨')
  }

  // 선택일 정보
  const selDate = useMemo(() => parseKey(selected), [selected])
  const selAmount = data[selected]
  const selLevel = levelOf(selAmount, pref.goal)

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', color: 'var(--text)', gap: 12, overflow: 'auto', position: 'relative' }
  const topBar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const seg: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 13, cursor: 'pointer', border: 'none',
    background: active ? 'var(--accent)' : 'var(--panel)', color: active ? '#fff' : 'var(--text)', font: 'inherit',
  })
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const numInput: React.CSSProperties = { width: 78, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }

  const quickBox: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }
  const quickField: React.CSSProperties = { flex: '1 1 140px', minWidth: 120, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }

  const statsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }
  const statCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 800, lineHeight: 1.05, color: 'var(--accent)' }
  const statLbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 4 }

  const heatBox: React.CSSProperties = {
    background: 'var(--paper)', border: dropActive ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 12, padding: 14, transition: 'border-color .12s',
  }
  const heatHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700 }

  const CELL = 13, GAP = 3, DOW_W = 22
  const monthRow: React.CSSProperties = { display: 'flex', marginLeft: DOW_W, height: 16, position: 'relative', fontSize: 10, color: 'var(--muted)' }
  const gridScroll: React.CSSProperties = { overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }
  const gridWrap: React.CSSProperties = { display: 'flex', gap: GAP, alignItems: 'flex-start' }
  const dowCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: GAP, width: DOW_W - GAP, marginRight: GAP }
  const dowCell: React.CSSProperties = { height: CELL, display: 'flex', alignItems: 'center', fontSize: 9, color: 'var(--muted)' }

  const legend: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11, color: 'var(--muted)' }
  const swatch = (bg: string): React.CSSProperties => ({ width: 13, height: 13, borderRadius: 3, border: '1px solid var(--border)', background: bg })

  const editBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const editRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }

  return (
    <div
      ref={wrapRef}
      style={wrap}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* 상단: 단위 / 목표 / 내보내기 */}
      <div style={topBar}>
        <div style={seg}>
          <button style={segBtn(pref.unit === 'char')} onClick={() => changeUnit('char')}>글자수</button>
          <button style={{ ...segBtn(pref.unit === 'word'), borderLeft: '1px solid var(--border)' }} onClick={() => changeUnit('word')}>단어수</button>
        </div>
        <span style={label}>일일 목표</span>
        <input
          type="number" min={0}
          value={pref.goal === 0 ? '' : pref.goal}
          onChange={(e) => changeGoal(e.target.value)}
          style={numInput}
          aria-label="일일 목표"
          placeholder="없음"
        />
        <span style={label}>{unitLabel}/일</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyExport} disabled={keys.length === 0}>
          {copied ? '✓ 복사됨' : '⧉ 기록 복사'}
        </button>
        {hasProjectBridge() && (
          <button className="minibtn" onClick={addReport} disabled={keys.length === 0} title="자료 폴더에 리포트 문서로 추가">
            {added ? <>✓ 추가됨</> : <><Emoji e="📄"/> 프로젝트에 추가</>}
          </button>
        )}
      </div>

      {/* 오늘 빠른 입력 */}
      <div style={quickBox}>
        <span style={{ fontSize: 18 }}><Emoji e="⚡"/></span>
        <strong style={{ fontSize: 13 }}>오늘 기록</strong>
        <input
          type="number" min={0}
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') quickAdd() }}
          placeholder={`오늘 쓴 ${unitLabel}수`}
          style={quickField}
          aria-label="오늘 집필량"
        />
        <button className="btn-primary" onClick={quickAdd} title="오늘 값에 더하기(누적)">＋ 더하기</button>
        <button className="minibtn" onClick={setQuickReplace} title="오늘 값으로 덮어쓰기">= 설정</button>
        <span style={{ ...label, marginLeft: 4 }}>
          오늘까지 <b style={{ color: 'var(--accent)' }}>{(data[todayKey] || 0).toLocaleString()}</b> {unitLabel}
        </span>
      </div>

      {/* 통계 */}
      <div style={statsRow}>
        <div style={statCard}><div style={{ ...statNum, color: 'var(--warn)' }}><Emoji e="🔥"/> {curStreak}</div><div style={statLbl}>현재 연속일</div></div>
        <div style={statCard}><div style={statNum}>{maxStreak}</div><div style={statLbl}>최장 연속일</div></div>
        <div style={statCard}><div style={statNum}>{stats.dwritten}</div><div style={statLbl}>집필한 날</div></div>
        <div style={statCard}><div style={statNum}>{stats.total.toLocaleString()}</div><div style={statLbl}>누적 {unitLabel}</div></div>
        <div style={statCard}><div style={statNum}>{stats.avg.toLocaleString()}</div><div style={statLbl}>집필일 평균</div></div>
        {pref.goal > 0
          ? <div style={statCard}><div style={{ ...statNum, color: 'var(--ok)' }}>{stats.goalMet}</div><div style={statLbl}>목표 달성일</div></div>
          : <div style={statCard}><div style={statNum}>{stats.best.toLocaleString()}</div><div style={statLbl}>최고 기록</div></div>}
      </div>

      {/* 히트맵 */}
      <div style={heatBox}>
        <div style={heatHeader}>
          <span style={sectionTitle}><Emoji e="🟩"/> 집필 잔디</span>
          <div style={{ ...seg, marginLeft: 6 }}>
            {WEEK_OPTIONS.map((opt, i) => (
              <button
                key={opt.weeks}
                style={{ ...segBtn(weeks === opt.weeks), padding: '4px 10px', fontSize: 12, borderLeft: i ? '1px solid var(--border)' : 'none' }}
                onClick={() => setWeeks(opt.weeks)}
              >{opt.label}</button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={() => shiftRange(-weeks)} title="이전 기간" aria-label="이전 기간">‹</button>
          <button className="minibtn" onClick={resetRange} title="오늘로" disabled={dayKey(endDate) === todayKey}>오늘</button>
          <button className="minibtn" onClick={() => shiftRange(weeks)} title="다음 기간" disabled={dayKey(endDate) === todayKey} aria-label="다음 기간">›</button>
        </div>

        <div style={gridScroll}>
          {/* 월 라벨 */}
          <div style={monthRow}>
            {grid.months.map((m, i) => (
              <span key={i} style={{ position: 'absolute', left: m.col * (CELL + GAP) }}>{m.label}</span>
            ))}
          </div>

          <div style={gridWrap}>
            {/* 요일 라벨(월/수/금만) */}
            <div style={dowCol}>
              {DOW_LABELS.map((d, i) => (
                <div key={d} style={dowCell}>{i === 1 || i === 3 || i === 5 ? d : ''}</div>
              ))}
            </div>
            {grid.cols.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {col.map((cell) => {
                  if (cell.future) {
                    return <div key={cell.key} style={{ width: CELL, height: CELL, borderRadius: 3, border: '1px dashed var(--border)', opacity: 0.3 }} />
                  }
                  const amt = data[cell.key]
                  const lvl = levelOf(amt, pref.goal)
                  const isToday = cell.key === todayKey
                  const isSel = cell.key === selected
                  return (
                    <div
                      key={cell.key}
                      onClick={() => setSelected(cell.key)}
                      onMouseEnter={(e) => {
                        const host = wrapRef.current
                        if (!host) return
                        const hr = host.getBoundingClientRect()
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        const dd = cell.date
                        const txt = `${cell.key} (${DOW_LABELS[dd.getDay()]}) · ${amt ? amt.toLocaleString() + unitLabel : '기록 없음'}`
                        setHover({ x: r.left - hr.left + host.scrollLeft + CELL / 2, y: r.top - hr.top + host.scrollTop - 8, text: txt })
                      }}
                      onMouseLeave={() => setHover(null)}
                      title={`${cell.key} · ${amt ? amt.toLocaleString() + unitLabel : '기록 없음'}`}
                      style={{
                        width: CELL, height: CELL, borderRadius: 3, cursor: 'pointer',
                        background: LEVEL_BG[lvl],
                        border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                        boxSizing: 'border-box',
                        outline: isToday ? '2px solid var(--warn)' : 'none', outlineOffset: 1,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* 범례 + 보이는 기간 합계 */}
          <div style={legend}>
            <span>적음</span>
            {LEVEL_BG.map((bg, i) => <span key={i} style={swatch(bg)} />)}
            <span>많음</span>
            <span style={{ marginLeft: 'auto' }}>
              이 기간 {rangeStats.total.toLocaleString()}{unitLabel} · {rangeStats.days}일 · 오늘은 빨간 테두리
            </span>
          </div>
        </div>
      </div>

      {/* 선택일 편집 */}
      <div style={editBox}>
        <div style={editRow}>
          <strong style={{ fontSize: 13 }}>
            {selDate
              ? `${selDate.getFullYear()}. ${selDate.getMonth() + 1}. ${selDate.getDate()}. (${DOW_LABELS[selDate.getDay()]})${selected === todayKey ? ' · 오늘' : ''}`
              : '날짜 선택'}
          </strong>
          {selAmount != null && (
            <span style={{ ...swatch(LEVEL_BG[selLevel]), width: 14, height: 14 }} title={`레벨 ${selLevel}`} />
          )}
        </div>
        <div style={editRow}>
          <input
            type="number" min={0}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveSelected() }}
            placeholder={`이 날 쓴 ${unitLabel}수`}
            style={{ ...numInput, width: 140, flex: '0 0 auto' }}
            aria-label="선택일 집필량"
          />
          <button className="btn-primary" onClick={saveSelected}>저장</button>
          {selAmount != null && (
            <button className="minibtn" onClick={removeSelected} title="이 날짜 기록 삭제"><Emoji e="🗑"/> 삭제</button>
          )}
          {pref.goal > 0 && selAmount != null && (
            <span style={{ fontSize: 12, color: selAmount >= pref.goal ? 'var(--ok)' : 'var(--muted)' }}>
              목표의 {Math.round((selAmount / pref.goal) * 100)}%
              {selAmount >= pref.goal ? <> · 달성 <Emoji e="🎉"/></> : ` · ${(pref.goal - selAmount).toLocaleString()} 남음`}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <button className="linkbtn" onClick={clearAll} disabled={keys.length === 0} style={{ color: 'var(--warn)' }}>전체 초기화</button>
        </div>
        {keys.length === 0 && (
          <div style={hint}>
            아직 기록이 없어요. 위 <b>오늘 기록</b>에 오늘 쓴 분량을 입력하거나, 잔디의 날짜 칸을 눌러 그날 분량을 적어보세요.
            {hasProjectBridge() ? ' 좌측 파일을 이 창에 끌어다 놓으면 본문 길이가 오늘 분량에 더해집니다.' : ''}
          </div>
        )}
        {keys.length > 0 && (
          <div style={hint}>
            잔디 칸을 클릭해 그날 기록을 편집하세요. 색이 진할수록 분량이 많습니다{pref.goal > 0 ? '(목표 대비)' : ''}.
            {hasProjectBridge() ? ' 좌측 파일을 드롭하면 본문 길이가 오늘 분량에 누적됩니다.' : ''}
          </div>
        )}
      </div>

      {/* 호버 툴팁 */}
      {hover && (
        <div
          style={{
            position: 'absolute', left: hover.x, top: hover.y, transform: 'translate(-50%, -100%)',
            background: 'var(--text)', color: 'var(--paper)', padding: '4px 8px', borderRadius: 6,
            fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,.25)',
          }}
        >{hover.text}</div>
      )}

      {/* 액션 플래시 */}
      {flash && (
        <div
          style={{
            position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
            background: 'var(--ok)', color: '#fff', padding: '8px 16px', borderRadius: 999,
            fontSize: 13, fontWeight: 600, pointerEvents: 'none', zIndex: 30, boxShadow: '0 4px 14px rgba(0,0,0,.3)',
          }}
        >{flash}</div>
      )}
    </div>
  )
}
