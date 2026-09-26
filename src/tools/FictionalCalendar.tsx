// 가상 달력·연호 만들기 — 작품 세계만의 달력 체계를 설계하는 도구.
//  • 구조 정의: 한 해의 달(이름·일수), 요일 이름, 계절(시작 달 기준), 연호(era) 목록.
//  • 가상 날짜: 연/달/일을 고르면 해당 날짜의 요일·계절·연호 표기를 자동 계산해 보여준다.
//  • 달력 보기: 선택한 달을 요일에 맞춰 격자로 그리고, 명절·기념일을 표시한다.
//  • 명절·기념일: 매년 반복(달/일) 또는 특정 연도 1회 사건을 추가/수정/삭제/순서이동.
// 모든 데이터는 localStorage('sry:tool:fictional-calendar')에 JSON 으로 자동 저장/복원.
// 연계: 완성한 달력 명세를 프로젝트 바인더 [자료 › 세계관 › 달력] 폴더에 text 문서로 추가(addToProject).
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'fictional-calendar', name: '가상 달력·연호', icon: '📅', group: '구상·정리', intro: '작품 세계만의 달·요일·계절·연호로 가상 달력을 설계하세요', w: 760, h: 640 }

const LS_KEY = 'sry:tool:fictional-calendar'

// ── 데이터 모델 ──
interface Month {
  id: string
  name: string
  days: number
}
interface Season {
  id: string
  name: string
  startMonth: number // 1-기준 달 인덱스(이 달부터 다음 계절 시작 전까지)
}
interface Era {
  id: string
  name: string       // 연호 이름 (예: 제국력, 신력)
  abbr: string       // 약칭 (예: 제, IC)
  startYear: number  // 이 연호가 시작되는(가상) 연도
}
interface Holiday {
  id: string
  name: string
  month: number      // 1-기준 달
  day: number        // 1-기준 일
  year?: number | '' // 비우면 매년 반복, 채우면 특정 연도 1회
  note: string
}
interface CalData {
  worldName: string
  months: Month[]
  weekdays: string[]
  seasons: Season[]
  eras: Era[]
  holidays: Holiday[]
  // 현재 보고 있는 가상 날짜
  curYear: number
  curMonth: number   // 1-기준
  curDay: number     // 1-기준
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 지구 기준 12달 / 7요일 / 4계절을 기본 예시로 제공(빈 상태가 아니라 바로 만질 수 있게).
function defaultData(): CalData {
  const monthNames = ['첫달', '둘달', '셋달', '넷달', '다섯달', '여섯달', '일곱달', '여덟달', '아홉달', '열달', '열한달', '열두달']
  return {
    worldName: '',
    months: monthNames.map((n) => ({ id: newId(), name: n, days: 30 })),
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    seasons: [
      { id: newId(), name: '봄', startMonth: 1 },
      { id: newId(), name: '여름', startMonth: 4 },
      { id: newId(), name: '가을', startMonth: 7 },
      { id: newId(), name: '겨울', startMonth: 10 },
    ],
    eras: [{ id: newId(), name: '세계력', abbr: '세', startYear: 1 }],
    holidays: [],
    curYear: 1,
    curMonth: 1,
    curDay: 1,
  }
}

// localStorage 복원 — 미지원/차단/손상 시 기본값으로 graceful 처리. 누락 필드 보강.
function load(): CalData {
  const d = defaultData()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return d
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return d
    const months: Month[] = Array.isArray(p.months) && p.months.length
      ? p.months.filter((m: any) => m && typeof m === 'object').map((m: any) => ({
          id: String(m.id || newId()),
          name: typeof m.name === 'string' ? m.name : '',
          days: clampInt(m.days, 1, 1000, 30),
        }))
      : d.months
    const weekdays: string[] = Array.isArray(p.weekdays) && p.weekdays.length
      ? p.weekdays.filter((w: any) => typeof w === 'string')
      : d.weekdays
    const seasons: Season[] = Array.isArray(p.seasons)
      ? p.seasons.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
          id: String(s.id || newId()),
          name: typeof s.name === 'string' ? s.name : '',
          startMonth: clampInt(s.startMonth, 1, months.length, 1),
        }))
      : d.seasons
    const eras: Era[] = Array.isArray(p.eras)
      ? p.eras.filter((e: any) => e && typeof e === 'object').map((e: any) => ({
          id: String(e.id || newId()),
          name: typeof e.name === 'string' ? e.name : '',
          abbr: typeof e.abbr === 'string' ? e.abbr : '',
          startYear: Number.isFinite(+e.startYear) ? Math.trunc(+e.startYear) : 1,
        }))
      : d.eras
    const holidays: Holiday[] = Array.isArray(p.holidays)
      ? p.holidays.filter((h: any) => h && typeof h === 'object').map((h: any) => ({
          id: String(h.id || newId()),
          name: typeof h.name === 'string' ? h.name : '',
          month: clampInt(h.month, 1, months.length, 1),
          day: clampInt(h.day, 1, 1000, 1),
          year: h.year === '' || h.year == null ? '' : (Number.isFinite(+h.year) ? Math.trunc(+h.year) : ''),
          note: typeof h.note === 'string' ? h.note : '',
        }))
      : []
    return {
      worldName: typeof p.worldName === 'string' ? p.worldName : '',
      months: months.length ? months : d.months,
      weekdays: weekdays.length ? weekdays : d.weekdays,
      seasons,
      eras: eras.length ? eras : d.eras,
      holidays,
      curYear: Number.isFinite(+p.curYear) ? Math.trunc(+p.curYear) : 1,
      curMonth: clampInt(p.curMonth, 1, (months.length ? months : d.months).length, 1),
      curDay: clampInt(p.curDay, 1, 1000, 1),
    }
  } catch {
    return d
  }
}

function clampInt(v: any, min: number, max: number, fallback: number): number {
  const n = Math.trunc(+v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// 한 해의 총 일수
function yearLength(months: Month[]): number {
  return months.reduce((a, m) => a + (m.days > 0 ? m.days : 0), 0)
}

// (year, month1based, day1based) → "연초(연도 1의 1월 1일)"부터 흐른 절대 일수(0 기준).
// 요일 계산용. 음수 연도/일수도 일관되게 처리.
function absoluteDay(data: CalData, year: number, month: number, day: number): number {
  const yl = yearLength(data.months)
  if (yl <= 0) return 0
  // 연도 1을 기준점으로(연도 1, 1월 1일 = 0)
  let acc = (year - 1) * yl
  for (let i = 0; i < month - 1 && i < data.months.length; i++) acc += data.months[i].days
  acc += day - 1
  return acc
}

// 절대 일수 → 요일 인덱스(연도 1, 1월 1일을 요일 0으로 가정)
function weekdayIndex(data: CalData, year: number, month: number, day: number): number {
  const w = data.weekdays.length
  if (w <= 0) return 0
  const abs = absoluteDay(data, year, month, day)
  return ((abs % w) + w) % w
}

// 달 인덱스(1-기준) → 그 달이 속한 계절 이름
function seasonOf(data: CalData, month1: number): string {
  if (!data.seasons.length) return ''
  // 시작 달 기준으로 정렬해서, month1 이 어느 계절 구간에 드는지 찾는다.
  const sorted = [...data.seasons].filter((s) => s.startMonth >= 1).sort((a, b) => a.startMonth - b.startMonth)
  if (!sorted.length) return ''
  let cur = sorted[sorted.length - 1] // month1 이 첫 시작 달보다 작으면 직전(연말) 계절
  for (const s of sorted) {
    if (s.startMonth <= month1) cur = s
    else break
  }
  return cur.name
}

// 연/연호 표기 만들기: 해당 연도가 각 연호에서 몇 년차인지 함께 보여준다.
function eraLabels(data: CalData, year: number): string[] {
  return data.eras.map((e) => {
    const y = year - e.startYear + 1 // startYear 가 1년차
    const ab = (e.abbr || e.name || '').trim()
    return `${ab}${y}년`
  })
}

// HTML escape (addToProject bodyHtml 용)
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

type TabId = 'view' | 'months' | 'weekdays' | 'seasons' | 'eras' | 'holidays'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'view', label: '달력 보기', icon: '🗓️' },
  { id: 'months', label: '달', icon: '🌙' },
  { id: 'weekdays', label: '요일', icon: '📆' },
  { id: 'seasons', label: '계절', icon: '🍂' },
  { id: 'eras', label: '연호', icon: '👑' },
  { id: 'holidays', label: '명절·기념일', icon: '🎉' },
]

export default function FictionalCalendar({ payload }: { payload?: Record<string, unknown> }) {
  const [data, setData] = useState<CalData>(() => load())
  const [tab, setTab] = useState<TabId>('view')
  const [note, setNote] = useState('')
  const [confirmDel, setConfirmDel] = useState('') // 삭제 확인 대기 id
  // 명절 입력 드래프트
  const [hName, setHName] = useState('')
  const [hMonth, setHMonth] = useState(1)
  const [hDay, setHDay] = useState(1)
  const [hYear, setHYear] = useState<string>('')
  const [hNote, setHNote] = useState('')
  const mounted = useRef(true)
  const noteTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // payload.worldName 으로 세계 이름 1회 채우기(다른 도구에서 열어준 경우).
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const wn = typeof payload.worldName === 'string' ? payload.worldName : (typeof payload.name === 'string' ? payload.name : '')
    if (wn && !data.worldName.trim()) setData((d) => ({ ...d, worldName: wn }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  function flashNote(msg: string) {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 2200)
  }

  const monthCount = data.months.length
  // 선택 달이 범위를 넘으면 보정.
  const curMonth = Math.min(Math.max(1, data.curMonth), Math.max(1, monthCount))
  const curMonthObj = data.months[curMonth - 1]
  const daysInCur = curMonthObj ? curMonthObj.days : 0
  const curDay = Math.min(Math.max(1, data.curDay), Math.max(1, daysInCur))

  const setD = (patch: Partial<CalData>) => setData((d) => ({ ...d, ...patch }))

  // ── 달(month) CRUD ──
  const addMonth = () => setData((d) => ({ ...d, months: [...d.months, { id: newId(), name: `${d.months.length + 1}번째 달`, days: 30 }] }))
  const patchMonth = (id: string, p: Partial<Month>) =>
    setData((d) => ({ ...d, months: d.months.map((m) => (m.id === id ? { ...m, ...p } : m)) }))
  const removeMonth = (id: string) =>
    setData((d) => {
      const months = d.months.filter((m) => m.id !== id)
      return { ...d, months, curMonth: Math.min(d.curMonth, Math.max(1, months.length)) }
    })
  const moveItem = <T,>(arr: T[], idx: number, dir: -1 | 1): T[] => {
    const j = idx + dir
    if (j < 0 || j >= arr.length) return arr
    const next = arr.slice()
    const tmp = next[idx]; next[idx] = next[j]; next[j] = tmp
    return next
  }
  const moveMonth = (idx: number, dir: -1 | 1) => setData((d) => ({ ...d, months: moveItem(d.months, idx, dir) }))

  // ── 요일 CRUD ──
  const addWeekday = () => setData((d) => ({ ...d, weekdays: [...d.weekdays, `요일${d.weekdays.length + 1}`] }))
  const patchWeekday = (idx: number, v: string) =>
    setData((d) => ({ ...d, weekdays: d.weekdays.map((w, i) => (i === idx ? v : w)) }))
  const removeWeekday = (idx: number) =>
    setData((d) => ({ ...d, weekdays: d.weekdays.filter((_, i) => i !== idx) }))
  const moveWeekday = (idx: number, dir: -1 | 1) => setData((d) => ({ ...d, weekdays: moveItem(d.weekdays, idx, dir) }))

  // ── 계절 CRUD ──
  const addSeason = () => setData((d) => ({ ...d, seasons: [...d.seasons, { id: newId(), name: '새 계절', startMonth: 1 }] }))
  const patchSeason = (id: string, p: Partial<Season>) =>
    setData((d) => ({ ...d, seasons: d.seasons.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  const removeSeason = (id: string) => setData((d) => ({ ...d, seasons: d.seasons.filter((s) => s.id !== id) }))
  const moveSeason = (idx: number, dir: -1 | 1) => setData((d) => ({ ...d, seasons: moveItem(d.seasons, idx, dir) }))

  // ── 연호 CRUD ──
  const addEra = () => setData((d) => ({ ...d, eras: [...d.eras, { id: newId(), name: '새 연호', abbr: '', startYear: 1 }] }))
  const patchEra = (id: string, p: Partial<Era>) =>
    setData((d) => ({ ...d, eras: d.eras.map((e) => (e.id === id ? { ...e, ...p } : e)) }))
  const removeEra = (id: string) => setData((d) => ({ ...d, eras: d.eras.filter((e) => e.id !== id) }))
  const moveEra = (idx: number, dir: -1 | 1) => setData((d) => ({ ...d, eras: moveItem(d.eras, idx, dir) }))

  // ── 명절·기념일 CRUD ──
  const addHoliday = () => {
    const name = hName.trim()
    if (!name) { flashNote('명절 이름을 입력하세요.'); return }
    const m = clampInt(hMonth, 1, Math.max(1, monthCount), 1)
    const maxDay = data.months[m - 1]?.days || 1
    const day = clampInt(hDay, 1, maxDay, 1)
    const yr = hYear.trim() === '' ? '' : clampInt(hYear, -99999, 99999, 1)
    const hol: Holiday = { id: newId(), name, month: m, day, year: yr, note: hNote.trim() }
    setData((d) => ({ ...d, holidays: [...d.holidays, hol] }))
    setHName(''); setHNote(''); setHYear('')
    flashNote('명절·기념일을 추가했어요.')
  }
  const patchHoliday = (id: string, p: Partial<Holiday>) =>
    setData((d) => ({ ...d, holidays: d.holidays.map((h) => (h.id === id ? { ...h, ...p } : h)) }))
  const removeHoliday = (id: string) => setData((d) => ({ ...d, holidays: d.holidays.filter((h) => h.id !== id) }))
  const moveHoliday = (idx: number, dir: -1 | 1) => setData((d) => ({ ...d, holidays: moveItem(d.holidays, idx, dir) }))

  // 현재 보고 있는 달에 해당하는 명절들(매년 반복 + 그 연도 1회)
  const holidaysInCurMonth = data.holidays.filter(
    (h) => h.month === curMonth && (h.year === '' || h.year === data.curYear),
  )
  const holidayByDay: Record<number, Holiday[]> = {}
  for (const h of holidaysInCurMonth) {
    if (h.day >= 1 && h.day <= daysInCur) (holidayByDay[h.day] ||= []).push(h)
  }

  // 날짜 이동
  const stepDay = (delta: number) => {
    setData((d) => {
      const months = d.months
      if (!months.length) return d
      let y = d.curYear, m = Math.min(Math.max(1, d.curMonth), months.length), day = d.curDay
      day += delta
      // 일 → 달 → 연 캐리(양/음 모두)
      while (day > (months[m - 1]?.days || 1)) {
        day -= months[m - 1]?.days || 1
        m++
        if (m > months.length) { m = 1; y++ }
      }
      while (day < 1) {
        m--
        if (m < 1) { m = months.length; y-- }
        day += months[m - 1]?.days || 1
      }
      return { ...d, curYear: y, curMonth: m, curDay: day }
    })
  }
  const stepMonth = (delta: number) => {
    setData((d) => {
      const n = d.months.length
      if (!n) return d
      let m = Math.min(Math.max(1, d.curMonth), n) - 1 + delta
      let y = d.curYear
      while (m < 0) { m += n; y-- }
      while (m >= n) { m -= n; y++ }
      const mm = m + 1
      const maxDay = d.months[mm - 1]?.days || 1
      return { ...d, curYear: y, curMonth: mm, curDay: Math.min(d.curDay, maxDay) }
    })
  }

  // ── 프로젝트에 추가 ──
  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!monthCount) { flashNote('달이 하나 이상 있어야 추가할 수 있어요.'); return }
    const wn = data.worldName.trim()
    const title = wn ? `${wn} 달력` : '가상 달력'
    const yl = yearLength(data.months)
    const parts: string[] = []
    parts.push(`<p style="color:#888;">가상 달력 명세 — 1년 ${monthCount}개월 · ${yl}일 · ${data.weekdays.length}요일</p>`)

    parts.push(`<h3>${esc('🌙 달 (' + monthCount + '개)')}</h3>`)
    parts.push('<p>' + data.months.map((m, i) => esc(`${i + 1}. ${m.name || '(이름 없음)'} — ${m.days}일`)).join('<br/>') + '</p>')

    parts.push(`<h3>${esc('📆 요일 (' + data.weekdays.length + '개)')}</h3>`)
    parts.push(`<p>${esc(data.weekdays.join(' · ') || '(없음)')}</p>`)

    if (data.seasons.length) {
      parts.push(`<h3>${esc('🍂 계절')}</h3>`)
      const sorted = [...data.seasons].sort((a, b) => a.startMonth - b.startMonth)
      parts.push('<p>' + sorted.map((s) => esc(`${s.name || '(이름 없음)'} — ${data.months[s.startMonth - 1]?.name || s.startMonth + '월'}부터`)).join('<br/>') + '</p>')
    }

    if (data.eras.length) {
      parts.push(`<h3>${esc('👑 연호')}</h3>`)
      parts.push('<p>' + data.eras.map((e) => esc(`${e.name || '(이름 없음)'}${e.abbr ? ` (${e.abbr})` : ''} — 기준 연도 ${e.startYear}년부터`)).join('<br/>') + '</p>')
    }

    if (data.holidays.length) {
      parts.push(`<h3>${esc('🎉 명절·기념일 (' + data.holidays.length + '개)')}</h3>`)
      const lines = data.holidays.map((h) => {
        const mName = data.months[h.month - 1]?.name || `${h.month}월`
        const when = h.year === '' ? '매년' : `${h.year}년`
        return esc(`${h.name || '(이름 없음)'} — ${when} ${mName} ${h.day}일${h.note ? ` · ${h.note}` : ''}`)
      })
      parts.push('<p>' + lines.join('<br/>') + '</p>')
    }

    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '달력',
      title,
      bodyHtml: parts.join(''),
      meta: {
        '1년 개월수': String(monthCount),
        '1년 일수': String(yl),
        '요일 수': String(data.weekdays.length),
        '명절 수': String(data.holidays.length),
      },
    })
    flashNote(id ? '프로젝트 자료 〈달력〉 폴더에 명세를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 현재 날짜 풀 표기 문자열
  const curWeekday = data.weekdays.length ? data.weekdays[weekdayIndex(data, data.curYear, curMonth, curDay)] : ''
  const curSeason = seasonOf(data, curMonth)
  const curEraLabels = eraLabels(data, data.curYear)
  const startWeekday = data.weekdays.length ? weekdayIndex(data, data.curYear, curMonth, 1) : 0

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const tabBar: React.CSSProperties = { display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const tiny: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '5px 7px', borderRadius: 6 }
  const rowCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }
  const emptyBox: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, padding: '18px 12px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }

  const tabBtn = (t: { id: TabId; label: string; icon: string }) => {
    const active = tab === t.id
    return (
      <button
        key={t.id}
        className={'minibtn' + (active ? ' active' : '')}
        onClick={() => { setTab(t.id); setConfirmDel('') }}
        style={active ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : undefined}
      >
        <Emoji e={t.icon} /> {t.label}
        {t.id === 'months' && ` (${monthCount})`}
        {t.id === 'weekdays' && ` (${data.weekdays.length})`}
        {t.id === 'seasons' && ` (${data.seasons.length})`}
        {t.id === 'eras' && ` (${data.eras.length})`}
        {t.id === 'holidays' && ` (${data.holidays.length})`}
      </button>
    )
  }

  // 삭제 버튼(확인 2단계)
  const delBtn = (id: string, onDel: () => void, what = '삭제') => (
    confirmDel === id ? (
      <>
        <button style={{ ...tiny, color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => { onDel(); setConfirmDel('') }}>확정</button>
        <button style={tiny} onClick={() => setConfirmDel('')}>취소</button>
      </>
    ) : (
      <button style={{ ...tiny, color: 'var(--warn)' }} title={what} onClick={() => setConfirmDel(id)}><Emoji e="🗑️" /></button>
    )
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="📅" /> 가상 달력·연호</span>
        <input
          style={{ ...input, flex: 1, minWidth: 160 }}
          value={data.worldName}
          onChange={(e) => setD({ worldName: e.target.value })}
          placeholder="세계 이름 (예: 아르카디아력)"
          aria-label="세계 이름"
          maxLength={60}
        />
        {note && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{note}</span>}
        <button
          className="linkbtn"
          onClick={addToProjectDoc}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '달력 명세를 프로젝트 자료 〈달력〉에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      <div style={tabBar}>{TABS.map(tabBtn)}</div>

      <div style={body}>
        {/* ───────── 달력 보기 ───────── */}
        {tab === 'view' && (
          <>
            {monthCount === 0 ? (
              <div style={emptyBox}>달이 하나도 없어요. <b><Emoji e="🌙" /> 달</b> 탭에서 한 해의 달을 먼저 만들어 주세요.</div>
            ) : (
              <>
                {/* 날짜 선택 + 표기 */}
                <div style={panel}>
                  <div style={sectionTitle}><Emoji e="🗓️" /> 가상 날짜</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>연도</span>
                      <input
                        style={{ ...input, width: 96 }}
                        type="number"
                        value={data.curYear}
                        onChange={(e) => setD({ curYear: clampInt(e.target.value, -99999, 99999, 1) })}
                        aria-label="연도"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>달</span>
                      <select
                        style={{ ...input, width: 150, cursor: 'pointer' }}
                        value={curMonth}
                        onChange={(e) => setD({ curMonth: +e.target.value, curDay: Math.min(data.curDay, data.months[+e.target.value - 1]?.days || 1) })}
                        aria-label="달"
                      >
                        {data.months.map((m, i) => <option key={m.id} value={i + 1}>{i + 1}. {m.name || '(이름 없음)'}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>일</span>
                      <select
                        style={{ ...input, width: 80, cursor: 'pointer' }}
                        value={curDay}
                        onChange={(e) => setD({ curDay: +e.target.value })}
                        aria-label="일"
                      >
                        {Array.from({ length: Math.max(1, daysInCur) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={tiny} onClick={() => stepDay(-1)} title="하루 전">◀ 하루</button>
                      <button style={tiny} onClick={() => stepDay(1)} title="하루 후">하루 ▶</button>
                    </div>
                  </div>

                  {/* 풀 표기 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>
                      {data.curYear}년 {curMonthObj?.name || ''} {curDay}일
                    </span>
                    {curWeekday && <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>{curWeekday}요일</span>}
                    {curSeason && <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}><Emoji e="🍂" /> {curSeason}</span>}
                  </div>
                  {curEraLabels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {curEraLabels.map((l, i) => (
                        <span key={i} style={{ fontSize: 12.5, padding: '2px 8px', borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--accent)', color: 'var(--accent)' }}><Emoji e="👑" /> {l}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 달력 격자 */}
                <div style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button style={tiny} onClick={() => stepMonth(-1)} title="지난 달">◀</button>
                    <div style={{ ...sectionTitle, flex: 1, justifyContent: 'center' }}>
                      {data.curYear}년 · {curMonthObj?.name || ''} ({daysInCur}일{curSeason ? ` · ${curSeason}` : ''})
                    </div>
                    <button style={tiny} onClick={() => stepMonth(1)} title="다음 달">▶</button>
                  </div>

                  {data.weekdays.length === 0 ? (
                    <div style={emptyBox}>요일이 없어요. <b><Emoji e="📆" /> 요일</b> 탭에서 요일을 추가하면 격자로 표시됩니다.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.weekdays.length}, 1fr)`, gap: 4 }}>
                      {/* 요일 헤더 */}
                      {data.weekdays.map((w, i) => (
                        <div key={'h' + i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', padding: '4px 0' }}>{w}</div>
                      ))}
                      {/* 1일 시작 위치까지 빈칸 */}
                      {Array.from({ length: startWeekday }, (_, i) => <div key={'b' + i} />)}
                      {/* 날짜 셀 */}
                      {Array.from({ length: daysInCur }, (_, i) => i + 1).map((d) => {
                        const isSel = d === curDay
                        const hs = holidayByDay[d] || []
                        return (
                          <button
                            key={d}
                            onClick={() => setD({ curDay: d })}
                            title={hs.length ? hs.map((h) => h.name).join(', ') : `${d}일`}
                            style={{
                              minHeight: 44,
                              border: '1px solid ' + (isSel ? 'var(--accent)' : 'var(--border)'),
                              background: isSel ? 'var(--accent)' : 'var(--paper)',
                              color: isSel ? '#fff' : 'var(--text)',
                              borderRadius: 8,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              padding: 2,
                              boxShadow: isSel ? '0 0 0 1px var(--accent)' : 'none',
                              position: 'relative',
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{d}</span>
                            {hs.length > 0 && (
                              <span style={{ fontSize: 9.5, lineHeight: 1.1, color: isSel ? '#fff' : 'var(--accent)', textAlign: 'center', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                <Emoji e="🎉" />{hs[0].name}{hs.length > 1 ? ` +${hs.length - 1}` : ''}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 이 달의 명절 목록 */}
                  {holidaysInCurMonth.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>이 달의 명절·기념일</div>
                      {holidaysInCurMonth.sort((a, b) => a.day - b.day).map((h) => (
                        <div key={h.id} style={{ ...hint, display: 'flex', gap: 6 }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}><Emoji e="🎉" /> {h.day}일</span>
                          <span style={{ color: 'var(--text)' }}>{h.name}</span>
                          {h.year !== '' && <span style={{ flexShrink: 0 }}>({h.year}년 한정)</span>}
                          {h.note && <span style={{ opacity: 0.8 }}>— {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={hint}>
                  1년은 {monthCount}개월 · 총 {yearLength(data.months)}일이며, {data.weekdays.length}요일이 반복됩니다.
                  요일은 “연도 1의 첫 달 1일”을 {data.weekdays[0] || '첫'}요일로 두고 순서대로 계산합니다.
                </div>
              </>
            )}
          </>
        )}

        {/* ───────── 달 ───────── */}
        {tab === 'months' && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="🌙" /> 한 해의 달</div>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={addMonth}>＋ 달 추가</button>
            </div>
            <div style={hint}>각 달의 이름과 일수를 정합니다. 일수 합이 곧 1년의 길이가 됩니다. (현재 1년 = {yearLength(data.months)}일)</div>
            {monthCount === 0 ? (
              <div style={emptyBox}>아직 달이 없어요. <b>＋ 달 추가</b>로 한 해의 첫 달을 만들어 보세요.</div>
            ) : (
              data.months.map((m, i) => (
                <div key={m.id} style={rowCard}>
                  <span style={{ width: 26, textAlign: 'center', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>{i + 1}</span>
                  <input style={{ ...input, flex: 1, minWidth: 80 }} value={m.name} onChange={(e) => patchMonth(m.id, { name: e.target.value })} placeholder="달 이름" maxLength={40} aria-label={`${i + 1}번째 달 이름`} />
                  <input style={{ ...input, width: 80 }} type="number" min={1} value={m.days} onChange={(e) => patchMonth(m.id, { days: clampInt(e.target.value, 1, 1000, 1) })} aria-label={`${i + 1}번째 달 일수`} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>일</span>
                  <button style={tiny} disabled={i === 0} onClick={() => moveMonth(i, -1)} title="위로">↑</button>
                  <button style={tiny} disabled={i === monthCount - 1} onClick={() => moveMonth(i, 1)} title="아래로">↓</button>
                  {delBtn(m.id, () => removeMonth(m.id))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ───────── 요일 ───────── */}
        {tab === 'weekdays' && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="📆" /> 요일</div>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={addWeekday}>＋ 요일 추가</button>
            </div>
            <div style={hint}>한 주를 이루는 요일 이름과 개수를 정합니다. 첫 요일이 “연도 1의 첫 달 1일”의 요일이 됩니다.</div>
            {data.weekdays.length === 0 ? (
              <div style={emptyBox}>요일이 없어요. <b>＋ 요일 추가</b>로 한 주를 구성하세요.</div>
            ) : (
              data.weekdays.map((w, i) => (
                <div key={i} style={rowCard}>
                  <span style={{ width: 26, textAlign: 'center', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>{i + 1}</span>
                  <input style={{ ...input, flex: 1 }} value={w} onChange={(e) => patchWeekday(i, e.target.value)} placeholder="요일 이름" maxLength={20} aria-label={`${i + 1}번째 요일`} />
                  <button style={tiny} disabled={i === 0} onClick={() => moveWeekday(i, -1)} title="위로">↑</button>
                  <button style={tiny} disabled={i === data.weekdays.length - 1} onClick={() => moveWeekday(i, 1)} title="아래로">↓</button>
                  {delBtn('wd' + i, () => removeWeekday(i))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ───────── 계절 ───────── */}
        {tab === 'seasons' && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="🍂" /> 계절</div>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={addSeason} disabled={!monthCount}>＋ 계절 추가</button>
            </div>
            <div style={hint}>각 계절이 “몇 번째 달부터” 시작하는지 정합니다. 다음 계절 시작 전까지가 그 계절입니다.</div>
            {!monthCount ? (
              <div style={emptyBox}>먼저 <b><Emoji e="🌙" /> 달</b> 탭에서 달을 만들어야 계절을 지정할 수 있어요.</div>
            ) : data.seasons.length === 0 ? (
              <div style={emptyBox}>계절이 없어요. <b>＋ 계절 추가</b>로 사계절(혹은 그 이상)을 만들어 보세요.</div>
            ) : (
              data.seasons.map((s, i) => (
                <div key={s.id} style={rowCard}>
                  <input style={{ ...input, flex: 1, minWidth: 80 }} value={s.name} onChange={(e) => patchSeason(s.id, { name: e.target.value })} placeholder="계절 이름" maxLength={30} aria-label={`계절 ${i + 1} 이름`} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>시작</span>
                  <select style={{ ...input, width: 150, cursor: 'pointer' }} value={s.startMonth} onChange={(e) => patchSeason(s.id, { startMonth: +e.target.value })} aria-label={`계절 ${i + 1} 시작 달`}>
                    {data.months.map((m, mi) => <option key={m.id} value={mi + 1}>{mi + 1}. {m.name || '(이름 없음)'}</option>)}
                  </select>
                  <button style={tiny} disabled={i === 0} onClick={() => moveSeason(i, -1)} title="위로">↑</button>
                  <button style={tiny} disabled={i === data.seasons.length - 1} onClick={() => moveSeason(i, 1)} title="아래로">↓</button>
                  {delBtn(s.id, () => removeSeason(s.id))}
                </div>
              ))
            )}
          </div>
        )}

        {/* ───────── 연호 ───────── */}
        {tab === 'eras' && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="👑" /> 연호 (era)</div>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={addEra}>＋ 연호 추가</button>
            </div>
            <div style={hint}>연호의 이름·약칭과 “기준 연도”를 정합니다. 기준 연도가 그 연호의 1년차가 됩니다. (예: 기준 연도 100 → 가상 연도 100이 “1년”)</div>
            {data.eras.length === 0 ? (
              <div style={emptyBox}>연호가 없어요. <b>＋ 연호 추가</b>로 작품 세계의 기년법을 만들어 보세요.</div>
            ) : (
              data.eras.map((e, i) => (
                <div key={e.id} style={{ ...rowCard, flexWrap: 'wrap' }}>
                  <input style={{ ...input, flex: 1, minWidth: 120 }} value={e.name} onChange={(e2) => patchEra(e.id, { name: e2.target.value })} placeholder="연호 이름 (예: 제국력)" maxLength={30} aria-label={`연호 ${i + 1} 이름`} />
                  <input style={{ ...input, width: 90 }} value={e.abbr} onChange={(e2) => patchEra(e.id, { abbr: e2.target.value })} placeholder="약칭" maxLength={10} aria-label={`연호 ${i + 1} 약칭`} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>기준</span>
                  <input style={{ ...input, width: 90 }} type="number" value={e.startYear} onChange={(e2) => patchEra(e.id, { startYear: clampInt(e2.target.value, -99999, 99999, 1) })} aria-label={`연호 ${i + 1} 기준 연도`} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>년</span>
                  <button style={tiny} disabled={i === 0} onClick={() => moveEra(i, -1)} title="위로">↑</button>
                  <button style={tiny} disabled={i === data.eras.length - 1} onClick={() => moveEra(i, 1)} title="아래로">↓</button>
                  {delBtn(e.id, () => removeEra(e.id))}
                </div>
              ))
            )}
            {data.eras.length > 0 && (
              <div style={hint}>현재 연도({data.curYear})의 표기: {eraLabels(data, data.curYear).join(' · ')}</div>
            )}
          </div>
        )}

        {/* ───────── 명절·기념일 ───────── */}
        {tab === 'holidays' && (
          <>
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="🎉" /> 명절·기념일 추가</div>
              {!monthCount ? (
                <div style={emptyBox}>먼저 <b><Emoji e="🌙" /> 달</b> 탭에서 달을 만들어야 명절을 지정할 수 있어요.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 140 }}>
                      <span style={label}>이름</span>
                      <input style={input} value={hName} onChange={(e) => setHName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addHoliday() }} placeholder="예: 수확제, 건국기념일" maxLength={50} aria-label="명절 이름" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>달</span>
                      <select style={{ ...input, width: 140, cursor: 'pointer' }} value={hMonth} onChange={(e) => { setHMonth(+e.target.value); const md = data.months[+e.target.value - 1]?.days || 1; if (hDay > md) setHDay(md) }} aria-label="명절 달">
                        {data.months.map((m, i) => <option key={m.id} value={i + 1}>{i + 1}. {m.name || '(이름 없음)'}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>일</span>
                      <select style={{ ...input, width: 76, cursor: 'pointer' }} value={hDay} onChange={(e) => setHDay(+e.target.value)} aria-label="명절 일">
                        {Array.from({ length: data.months[hMonth - 1]?.days || 1 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={label}>연도(선택)</span>
                      <input style={{ ...input, width: 100 }} type="number" value={hYear} onChange={(e) => setHYear(e.target.value)} placeholder="매년" aria-label="명절 연도(선택)" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={label}>메모(선택)</span>
                      <input style={input} value={hNote} onChange={(e) => setHNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addHoliday() }} placeholder="이날의 의미·풍습 등" maxLength={120} aria-label="명절 메모" />
                    </div>
                    <button className="btn-primary" onClick={addHoliday}>＋ 추가</button>
                  </div>
                  <div style={hint}>연도를 비우면 <b>매년 반복</b>되는 명절, 채우면 그 <b>특정 연도</b>에 한 번 있는 사건이 됩니다.</div>
                </>
              )}
            </div>

            <div style={panel}>
              <div style={sectionTitle}><Emoji e="📋" /> 등록된 명절·기념일 ({data.holidays.length})</div>
              {data.holidays.length === 0 ? (
                <div style={emptyBox}>아직 등록된 명절이 없어요. 위에서 첫 명절을 추가해 보세요.</div>
              ) : (
                data.holidays.map((h, i) => {
                  const mName = data.months[h.month - 1]?.name || `${h.month}월`
                  return (
                    <div key={h.id} style={{ ...rowCard, flexWrap: 'wrap' }}>
                      <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 700, minWidth: 96 }}>
                        {h.year === '' ? '매년' : `${h.year}년`} {mName} {h.day}일
                      </span>
                      <input style={{ ...input, flex: 1, minWidth: 120 }} value={h.name} onChange={(e) => patchHoliday(h.id, { name: e.target.value })} placeholder="명절 이름" maxLength={50} aria-label={`명절 ${i + 1} 이름`} />
                      <select style={{ ...input, width: 120, cursor: 'pointer' }} value={h.month} onChange={(e) => { const nm = +e.target.value; const md = data.months[nm - 1]?.days || 1; patchHoliday(h.id, { month: nm, day: Math.min(h.day, md) }) }} aria-label={`명절 ${i + 1} 달`}>
                        {data.months.map((m, mi) => <option key={m.id} value={mi + 1}>{mi + 1}. {m.name || '(이름 없음)'}</option>)}
                      </select>
                      <select style={{ ...input, width: 70, cursor: 'pointer' }} value={h.day} onChange={(e) => patchHoliday(h.id, { day: +e.target.value })} aria-label={`명절 ${i + 1} 일`}>
                        {Array.from({ length: data.months[h.month - 1]?.days || 1 }, (_, k) => k + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input style={{ ...input, width: 80 }} type="number" value={h.year === '' ? '' : h.year} onChange={(e) => patchHoliday(h.id, { year: e.target.value.trim() === '' ? '' : clampInt(e.target.value, -99999, 99999, 1) })} placeholder="매년" aria-label={`명절 ${i + 1} 연도`} />
                      <input style={{ ...input, flex: 1, minWidth: 120 }} value={h.note} onChange={(e) => patchHoliday(h.id, { note: e.target.value })} placeholder="메모" maxLength={120} aria-label={`명절 ${i + 1} 메모`} />
                      <button style={tiny} disabled={i === 0} onClick={() => moveHoliday(i, -1)} title="위로">↑</button>
                      <button style={tiny} disabled={i === data.holidays.length - 1} onClick={() => moveHoliday(i, 1)} title="아래로">↓</button>
                      {delBtn(h.id, () => removeHoliday(h.id))}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
