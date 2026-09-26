// 세계 달력 대장간 — 가상 역법(월/주/계절/축제)을 설계하고, 작중 사건을 그 달력 위에 배치한다.
//  · 역법 설계: 1년의 일수는 "월 길이의 합"으로 자동 계산. 주(요일) 이름, 윤년 주기, 계절 경계, 반복 축제를 정의.
//  · 사건 배치: 절대일(에포크 0일부터의 통산 일수)을 입력하면 그 사건이 몇 년/몇 월/며칠/무슨 요일/무슨 계절인지 결정론적으로 환산.
//  · 시각화: 선택한 해의 월별 그리드(요일 정렬·계절 색·축제·사건 점)를 그려 한눈에 본다.
//  · 연계: 좌측 바인더 문서/payload 텍스트에서 사건 후보(날짜 줄) 흡수, 공유 장소 라이브러리에서 사건 장소 선택,
//          설정 문서로 '프로젝트에 추가', 수집함 담기, 타임라인·설정집 등 관련 도구 열기.
// import 는 react 와 './linkbus' 만 사용한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  openToolLinked,
  getDragItem,
  isItemDrag,
  type SharedPlace,
} from './linkbus'

export const meta = {
  id: 'world-calendar-forge',
  name: '세계 달력 대장간',
  icon: '📅',
  group: '세계관',
  intro: '가상 역법(월/주/계절/축제)을 만들고 사건을 그 달력에 배치',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:world-calendar-forge'

// ---------- 타입 ----------
interface MonthDef { name: string; days: number }
interface SeasonDef { name: string; startMonth: number; tint: string } // startMonth: 1-base 월 인덱스
interface FestivalDef { name: string; month: number; day: number; note: string } // 매년 반복(월/일)
interface EventDef { id: string; title: string; absDay: number; place: string; note: string }
interface Calendar {
  worldName: string
  epochLabel: string      // 기원 표기(예: '제국력')
  months: MonthDef[]
  weekdays: string[]
  leapEvery: number       // n년마다 윤일 1 추가(0=없음)
  leapMonth: number       // 윤일을 더할 월(1-base). 범위 밖이면 마지막 월.
  seasons: SeasonDef[]
  festivals: FestivalDef[]
  events: EventDef[]
  viewYear: number
}

interface DateParts { year: number; month: number; day: number; weekday: number; season: number; doy: number }

const TINTS = ['#3b6e4f', '#b08838', '#9a4a36', '#3a5d86', '#6a4a86', '#866a3a', '#3a8682', '#86553a'] as const

function uid(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function defaultCalendar(): Calendar {
  return {
    worldName: '',
    epochLabel: '세계력',
    months: [
      { name: '초생달', days: 30 },
      { name: '새싹달', days: 30 },
      { name: '꽃비달', days: 31 },
      { name: '한낮달', days: 31 },
      { name: '천둥달', days: 30 },
      { name: '결실달', days: 31 },
      { name: '서리달', days: 30 },
      { name: '긴밤달', days: 31 },
    ],
    weekdays: ['하늘', '땅', '물', '불', '바람', '빛'],
    leapEvery: 4,
    leapMonth: 8,
    seasons: [
      { name: '봄', startMonth: 1, tint: TINTS[0] },
      { name: '여름', startMonth: 3, tint: TINTS[1] },
      { name: '가을', startMonth: 5, tint: TINTS[2] },
      { name: '겨울', startMonth: 7, tint: TINTS[3] },
    ],
    festivals: [
      { name: '신년제', month: 1, day: 1, note: '새해 첫날' },
      { name: '수확절', month: 6, day: 15, note: '결실을 기리는 축제' },
    ],
    events: [],
    viewYear: 1,
  }
}

// ---------- 역법 산술(결정론적) ----------
// 윤년: leapEvery>0 이고 (year % leapEvery === 0) 인 해에 leapMonth(범위 보정)의 일수를 +1.
function isLeap(cal: Calendar, year: number): boolean {
  return cal.leapEvery > 0 && year > 0 && year % cal.leapEvery === 0
}
function monthDaysIn(cal: Calendar, year: number, monthIdx0: number): number {
  const base = cal.months[monthIdx0]?.days ?? 0
  if (!isLeap(cal, year)) return base
  const lm = cal.leapMonth >= 1 && cal.leapMonth <= cal.months.length ? cal.leapMonth - 1 : cal.months.length - 1
  return monthIdx0 === lm ? base + 1 : base
}
function yearLength(cal: Calendar, year: number): number {
  let s = 0
  for (let m = 0; m < cal.months.length; m++) s += monthDaysIn(cal, year, m)
  return s
}
// 통산일(absDay, 0-base, 1년 1월 1일 = absDay 0) → 분해. 음수/거대값도 안전(최대 반복 보호).
function fromAbsDay(cal: Calendar, absDay: number): DateParts {
  let year = 1
  let rem = Math.trunc(absDay)
  let guard = 0
  // 앞으로
  while (rem >= 0 && guard < 200000) {
    const yl = yearLength(cal, year)
    if (rem < yl) break
    rem -= yl
    year++
    guard++
  }
  // 뒤로(음수)
  while (rem < 0 && guard < 400000) {
    year--
    const yl = yearLength(cal, year)
    rem += yl
    guard++
  }
  const doy = rem
  let month = 0
  let d = rem
  for (let m = 0; m < cal.months.length; m++) {
    const md = monthDaysIn(cal, year, m)
    if (d < md) { month = m; break }
    d -= md
    month = m
  }
  const wlen = Math.max(1, cal.weekdays.length)
  // 요일: absDay 를 주기 길이로 모듈러(음수 보정)
  const weekday = ((Math.trunc(absDay) % wlen) + wlen) % wlen
  // 계절: 현재 월이 속한 계절(가장 가까운 이전 startMonth)
  let season = 0
  let best = -1
  cal.seasons.forEach((s, i) => { if (s.startMonth - 1 <= month && s.startMonth - 1 > best) { best = s.startMonth - 1; season = i } })
  if (best < 0 && cal.seasons.length) season = cal.seasons.length - 1 // 첫 월 이전이면 마지막 계절(겨울 넘김)
  return { year, month: month + 1, day: d + 1, weekday, season, doy }
}
// 분해 → 통산일
function toAbsDay(cal: Calendar, year: number, month1: number, day1: number): number {
  let abs = 0
  if (year >= 1) for (let y = 1; y < year; y++) abs += yearLength(cal, y)
  else for (let y = year; y < 1; y++) abs -= yearLength(cal, y)
  const m0 = Math.max(0, Math.min(cal.months.length - 1, month1 - 1))
  for (let m = 0; m < m0; m++) abs += monthDaysIn(cal, year, m)
  abs += Math.max(0, day1 - 1)
  return abs
}

function fmtDate(cal: Calendar, p: DateParts): string {
  const mn = cal.months[p.month - 1]?.name ?? ('제' + p.month + '월')
  const wd = cal.weekdays[p.weekday] ?? ''
  const ss = cal.seasons[p.season]?.name ?? ''
  return `${cal.epochLabel} ${p.year}년 ${mn} ${p.day}일 (${wd}요일${ss ? ' / ' + ss : ''})`
}

// 사건 줄에서 "년 월 일" 숫자 추출 시도(연계: 드롭/payload 텍스트). 실패하면 null.
function parseEventLine(line: string): { title: string; year?: number; month?: number; day?: number } | null {
  const t = line.trim()
  if (!t) return null
  // 패턴: 12년 3월 4일 제목  /  3월 4일 제목  / 제목 (12-3-4)
  const m1 = t.match(/^(?:(\d+)\s*년\s*)?(\d+)\s*월\s*(\d+)\s*일\s*[:：\-]?\s*(.*)$/)
  if (m1) return { year: m1[1] ? +m1[1] : undefined, month: +m1[2], day: +m1[3], title: (m1[4] || '사건').trim() }
  const m2 = t.match(/(.*?)[\(（]\s*(\d+)\s*[-\/.]\s*(\d+)\s*[-\/.]\s*(\d+)\s*[\)）]/)
  if (m2) return { title: (m2[1] || '사건').trim(), year: +m2[2], month: +m2[3], day: +m2[4] }
  return null
}

// ---------- 저장 ----------
function load(): Calendar {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Calendar>
      const d = defaultCalendar()
      return {
        ...d, ...p,
        months: Array.isArray(p.months) && p.months.length ? p.months : d.months,
        weekdays: Array.isArray(p.weekdays) && p.weekdays.length ? p.weekdays : d.weekdays,
        seasons: Array.isArray(p.seasons) ? p.seasons : d.seasons,
        festivals: Array.isArray(p.festivals) ? p.festivals : d.festivals,
        events: Array.isArray(p.events) ? p.events : [],
      }
    }
  } catch {}
  return defaultCalendar()
}

// ---------- 컴포넌트 ----------
export default function WorldCalendarForge({ payload }: { payload?: Record<string, unknown> }) {
  const [cal, setCal] = useState<Calendar>(() => load())
  const [tab, setTab] = useState<'design' | 'events' | 'view'>('view')
  const [drop, setDrop] = useState(false)
  const [msg, setMsg] = useState('')
  const places = useLibraryList('places') as SharedPlace[]
  const msgTimer = useRef<number | null>(null)
  const ingestedPayload = useRef<unknown>(null)

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cal)) } catch {}
  }, [cal])

  // payload 텍스트 흡수(드롭/연계 열기) — 동일 payload 객체는 한 번만 흡수(재흡수 방지)
  useEffect(() => {
    if (!payload || ingestedPayload.current === payload) return
    ingestedPayload.current = payload
    const txt = typeof payload?.text === 'string' ? (payload.text as string) : ''
    if (txt) ingestText(txt)
    const evs = payload?.events
    if (Array.isArray(evs)) {
      const add: EventDef[] = []
      for (const e of evs) {
        if (e && typeof e === 'object') {
          const o = e as Record<string, unknown>
          add.push({ id: uid(), title: String(o.title || '사건'), absDay: typeof o.absDay === 'number' ? o.absDay : 0, place: String(o.place || ''), note: String(o.note || '') })
        }
      }
      if (add.length) {
        setCal((c) => ({ ...c, events: [...c.events, ...add] }))
        setTab('events')
        flash(add.length + '개 사건을 흡수했습니다.')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  useEffect(() => () => { if (msgTimer.current) window.clearTimeout(msgTimer.current) }, [])

  function flash(s: string) {
    setMsg(s)
    if (msgTimer.current) window.clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => setMsg(''), 2600)
  }

  // 텍스트 → 사건 흡수
  function ingestText(text: string) {
    const lines = text.split(/\r?\n/)
    const found: EventDef[] = []
    for (const ln of lines) {
      const p = parseEventLine(ln)
      if (p && p.month && p.day) {
        const abs = toAbsDay(cal, p.year ?? cal.viewYear, p.month, p.day)
        found.push({ id: uid(), title: p.title || '사건', absDay: abs, place: '', note: '' })
      }
    }
    if (found.length) {
      setCal((c) => ({ ...c, events: [...c.events, ...found] }))
      setTab('events')
      flash(found.length + '개 사건을 날짜에서 추출했습니다.')
    } else {
      flash('날짜 형식(예: "12년 3월 4일 사건명")을 찾지 못했습니다.')
    }
  }

  // ----- 파생: 통계 -----
  const stats = useMemo(() => {
    const yl = yearLength(cal, cal.viewYear)
    const baseLen = cal.months.reduce((a, m) => a + m.days, 0)
    return { yearLen: yl, baseLen, leap: isLeap(cal, cal.viewYear) }
  }, [cal])

  // ----- 디자인 탭 핸들러 -----
  const set = (patch: Partial<Calendar>) => setCal((c) => ({ ...c, ...patch }))
  function setMonth(i: number, patch: Partial<MonthDef>) {
    setCal((c) => ({ ...c, months: c.months.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }))
  }
  function addMonth() { setCal((c) => ({ ...c, months: [...c.months, { name: '새달', days: 30 }] })) }
  function delMonth(i: number) { setCal((c) => ({ ...c, months: c.months.length > 1 ? c.months.filter((_, idx) => idx !== i) : c.months })) }
  function setWeekday(i: number, v: string) { setCal((c) => ({ ...c, weekdays: c.weekdays.map((w, idx) => (idx === i ? v : w)) })) }
  function addWeekday() { setCal((c) => ({ ...c, weekdays: [...c.weekdays, '날'] })) }
  function delWeekday(i: number) { setCal((c) => ({ ...c, weekdays: c.weekdays.length > 1 ? c.weekdays.filter((_, idx) => idx !== i) : c.weekdays })) }
  function setSeason(i: number, patch: Partial<SeasonDef>) { setCal((c) => ({ ...c, seasons: c.seasons.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) })) }
  function addSeason() { setCal((c) => ({ ...c, seasons: [...c.seasons, { name: '계절', startMonth: 1, tint: TINTS[c.seasons.length % TINTS.length] }] })) }
  function delSeason(i: number) { setCal((c) => ({ ...c, seasons: c.seasons.length > 1 ? c.seasons.filter((_, idx) => idx !== i) : c.seasons })) }
  function setFest(i: number, patch: Partial<FestivalDef>) { setCal((c) => ({ ...c, festivals: c.festivals.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) })) }
  function addFest() { setCal((c) => ({ ...c, festivals: [...c.festivals, { name: '축제', month: 1, day: 1, note: '' }] })) }
  function delFest(i: number) { setCal((c) => ({ ...c, festivals: c.festivals.filter((_, idx) => idx !== i) })) }

  // ----- 사건 핸들러 -----
  function addEvent() {
    const abs = toAbsDay(cal, cal.viewYear, 1, 1)
    setCal((c) => ({ ...c, events: [{ id: uid(), title: '새 사건', absDay: abs, place: '', note: '' }, ...c.events] }))
  }
  function setEvent(id: string, patch: Partial<EventDef>) { setCal((c) => ({ ...c, events: c.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })) }
  function delEvent(id: string) { setCal((c) => ({ ...c, events: c.events.filter((e) => e.id !== id) })) }
  function setEventYMD(id: string, y: number, m: number, d: number) { setEvent(id, { absDay: toAbsDay(cal, y, m, d) }) }

  // ----- 드롭 -----
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrop(false)
    const item = getDragItem(e)
    if (item?.text) { ingestText(item.text); return }
    try { const t = e.dataTransfer.getData('text/plain'); if (t) ingestText(t) } catch {}
  }

  // ----- 산출물 텍스트(설정 문서/수집함) -----
  function calendarHtml(): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const monthRows = cal.months.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.name)}</td><td>${m.days}일</td></tr>`).join('')
    const seasonRows = cal.seasons.map((s) => `<li>${esc(s.name)} — ${s.startMonth}월부터</li>`).join('')
    const festRows = cal.festivals.map((f) => `<li>${esc(f.name)} — ${f.month}월 ${f.day}일${f.note ? ' (' + esc(f.note) + ')' : ''}</li>`).join('')
    const evSorted = [...cal.events].sort((a, b) => a.absDay - b.absDay)
    const evRows = evSorted.map((e) => { const p = fromAbsDay(cal, e.absDay); return `<li>${esc(fmtDate(cal, p))} — ${esc(e.title)}${e.place ? ' @' + esc(e.place) : ''}</li>` }).join('')
    return [
      `<h2>${esc(cal.worldName || '이름 없는 세계')}의 역법 (${esc(cal.epochLabel)})</h2>`,
      `<p>1년 = ${stats.baseLen}일 / ${cal.months.length}개월 / 1주 ${cal.weekdays.length}일 (${cal.weekdays.map(esc).join('·')}요일)`,
      cal.leapEvery > 0 ? ` · ${cal.leapEvery}년마다 윤일` : '',
      `</p>`,
      `<h3>월</h3><table border="1" cellpadding="4"><tr><th>#</th><th>이름</th><th>길이</th></tr>${monthRows}</table>`,
      seasonRows ? `<h3>계절</h3><ul>${seasonRows}</ul>` : '',
      festRows ? `<h3>축제</h3><ul>${festRows}</ul>` : '',
      evRows ? `<h3>주요 사건 연표</h3><ul>${evRows}</ul>` : '',
    ].join('')
  }

  function toProject() {
    if (!hasProjectBridge()) { flash('프로젝트 연결이 없습니다.'); return }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관',
      title: (cal.worldName || '세계') + ' 역법',
      bodyHtml: calendarHtml(),
      synopsis: `1년 ${stats.baseLen}일 · ${cal.months.length}개월 · 주 ${cal.weekdays.length}일`,
      meta: { 역법: cal.epochLabel, 사건수: String(cal.events.length) },
    })
    flash(id ? '설정 문서로 추가했습니다.' : '추가에 실패했습니다.')
  }
  function toStash() {
    if (!hasStash()) { flash('수집함이 없습니다.'); return }
    const txt = calendarHtml().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    addToStash({ kind: 'memo', label: (cal.worldName || '세계') + ' 역법', text: txt })
    flash('수집함에 담았습니다.')
  }
  function toLibrary() {
    addToLibrary('places', {
      name: (cal.worldName || '세계') + ' 역법',
      kind: '역법',
      fields: {
        kind: '역법',
        culture: `1년 ${stats.baseLen}일, ${cal.months.length}개월, 주 ${cal.weekdays.length}일(${cal.weekdays.join('·')}). 계절: ${cal.seasons.map((s) => s.name).join('·')}.`,
        notes: `축제: ${cal.festivals.map((f) => f.name).join(', ')}`,
      },
      source: 'world-calendar-forge',
    })
    flash('장소 라이브러리에 역법을 저장했습니다.')
  }
  function openTimeline() {
    const evSorted = [...cal.events].sort((a, b) => a.absDay - b.absDay)
    // 받는 쪽(event-timeline)이 흡수하는 형태로 전달: events 배열({when,title,desc}).
    // (events 와 text 를 동시에 보내면 양쪽 모두 흡수되어 중복되므로 events 만 보낸다.)
    const tlEvents = evSorted.map((e) => {
      const p = fromAbsDay(cal, e.absDay)
      return {
        when: fmtDate(cal, p),
        title: e.title,
        desc: [e.place ? '@' + e.place : '', e.note].filter(Boolean).join(' · '),
      }
    })
    openToolLinked('event-timeline', { events: tlEvents, title: (cal.worldName || '세계') + ' 연표' })
  }

  // ----- 보기 탭: 월별 그리드 -----
  const viewYear = cal.viewYear
  const festByMD = useMemo(() => {
    const map = new Map<string, FestivalDef[]>()
    for (const f of cal.festivals) { const k = f.month + ':' + f.day; const arr = map.get(k) || []; arr.push(f); map.set(k, arr) }
    return map
  }, [cal.festivals])
  const eventsByYMD = useMemo(() => {
    const map = new Map<string, EventDef[]>()
    for (const e of cal.events) { const p = fromAbsDay(cal, e.absDay); if (p.year === viewYear) { const k = p.month + ':' + p.day; const arr = map.get(k) || []; arr.push(e); map.set(k, arr) } }
    return map
  }, [cal.events, viewYear])

  // 공용 스타일
  const card: React.CSSProperties = { border: '1px solid var(--line,#ccc4)', borderRadius: 8, padding: 8, marginBottom: 8, background: 'var(--panel,#0000000a)' }
  const rowGap: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
  const lbl: React.CSSProperties = { fontSize: 11, opacity: 0.7, minWidth: 40 }
  const num: React.CSSProperties = { width: 58 }

  return (
    <div
      onDragOver={(e) => { if (isItemDrag(e) || e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); setDrop(true) } }}
      onDragLeave={() => setDrop(false)}
      onDrop={onDrop}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, outline: drop ? '2px dashed var(--accent,#5b9)' : 'none', outlineOffset: -4 }}
    >
      {/* 헤더 */}
      <div style={{ ...rowGap }}>
        <input className="field" style={{ flex: 1, minWidth: 120 }} placeholder="세계 이름" value={cal.worldName} onChange={(e) => set({ worldName: e.target.value })} />
        <input className="field" style={{ width: 90 }} placeholder="기원 표기" value={cal.epochLabel} onChange={(e) => set({ epochLabel: e.target.value })} />
      </div>

      {/* 요약 줄 */}
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        1년 {stats.baseLen}일 · {cal.months.length}개월 · 주 {cal.weekdays.length}일 · 사건 {cal.events.length}건
        {cal.leapEvery > 0 ? ` · ${cal.leapEvery}년 윤법${stats.leap ? '(이 해는 윤년)' : ''}` : ''}
      </div>

      {/* 탭 */}
      <div style={{ ...rowGap }}>
        {(['view', 'events', 'design'] as const).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'minibtn'} onClick={() => setTab(t)}>
            {t === 'view' ? '달력 보기' : t === 'events' ? '사건 배치' : '역법 설계'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', paddingRight: 2 }}>
        {/* ======== 달력 보기 ======== */}
        {tab === 'view' && (
          <div>
            <div style={{ ...rowGap, marginBottom: 6 }}>
              <span style={lbl}>해</span>
              <button className="minibtn" onClick={() => set({ viewYear: viewYear - 1 })}>이전</button>
              <input className="field" style={num} type="number" value={viewYear} onChange={(e) => set({ viewYear: parseInt(e.target.value) || 1 })} />
              <button className="minibtn" onClick={() => set({ viewYear: viewYear + 1 })}>다음</button>
              <span style={{ fontSize: 11, opacity: 0.7 }}>1년 {stats.yearLen}일{stats.leap ? ' (윤년)' : ''}</span>
            </div>
            {cal.months.map((m, mi) => {
              const md = monthDaysIn(cal, viewYear, mi)
              const first = fromAbsDay(cal, toAbsDay(cal, viewYear, mi + 1, 1))
              const wlen = cal.weekdays.length
              const lead = first.weekday
              const cells: (number | null)[] = []
              for (let i = 0; i < lead; i++) cells.push(null)
              for (let d = 1; d <= md; d++) cells.push(d)
              const seasonIdx = first.season
              const tint = cal.seasons[seasonIdx]?.tint || '#888'
              return (
                <div key={mi} style={{ ...card, borderLeft: `4px solid ${tint}` }}>
                  <div style={{ ...rowGap, justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 13 }}>{mi + 1}. {m.name}</strong>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{md}일 · {cal.seasons[seasonIdx]?.name || ''}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${wlen}, 1fr)`, gap: 2, marginTop: 4 }}>
                    {cal.weekdays.map((w, wi) => (
                      <div key={'h' + wi} style={{ fontSize: 9, textAlign: 'center', opacity: 0.55, padding: '1px 0' }}>{w}</div>
                    ))}
                    {cells.map((d, ci) => {
                      if (d == null) return <div key={'c' + ci} />
                      const k = (mi + 1) + ':' + d
                      const fests = festByMD.get(k)
                      const evs = eventsByYMD.get(k)
                      const has = (fests && fests.length) || (evs && evs.length)
                      return (
                        <div
                          key={'c' + ci}
                          title={[...(fests || []).map((f) => '축 ' + f.name), ...(evs || []).map((e) => e.title)].join('\n')}
                          style={{
                            position: 'relative', fontSize: 10, textAlign: 'center', padding: '3px 0',
                            border: '1px solid var(--line,#ccc3)', borderRadius: 4,
                            background: fests && fests.length ? tint + '33' : 'transparent',
                            fontWeight: has ? 700 : 400,
                          }}
                        >
                          {d}
                          {evs && evs.length ? (
                            <span style={{ position: 'absolute', right: 2, top: 1, width: 5, height: 5, borderRadius: 5, background: 'var(--accent,#d65)' }} />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div style={{ ...rowGap, marginTop: 4 }}>
              <button className="btn-primary" onClick={toProject}>프로젝트에 추가</button>
              <button className="minibtn" onClick={toStash}>수집함 담기</button>
              <button className="minibtn" onClick={toLibrary}>라이브러리 저장</button>
              <button className="minibtn" onClick={openTimeline}>타임라인 열기</button>
            </div>
          </div>
        )}

        {/* ======== 사건 배치 ======== */}
        {tab === 'events' && (
          <div>
            <div style={{ ...rowGap, marginBottom: 6 }}>
              <button className="btn-primary" onClick={addEvent}>사건 추가</button>
              <span style={{ fontSize: 11, opacity: 0.6 }}>좌측 문서를 끌어다 놓으면 날짜 줄을 자동 추출</span>
            </div>
            {cal.events.length === 0 && (
              <div style={{ ...card, fontSize: 12, opacity: 0.7 }}>
                아직 사건이 없습니다. 위의 "사건 추가"를 누르거나, 바인더 문서를 이 창에 끌어다 놓으세요.
                <br />인식 형식: "12년 3월 4일 즉위식", "3월 4일 전투", "결투 (12-3-4)"
              </div>
            )}
            {[...cal.events].sort((a, b) => a.absDay - b.absDay).map((e) => {
              const p = fromAbsDay(cal, e.absDay)
              return (
                <div key={e.id} style={card}>
                  <div style={{ ...rowGap, justifyContent: 'space-between' }}>
                    <input className="field" style={{ flex: 1, minWidth: 100 }} value={e.title} onChange={(ev) => setEvent(e.id, { title: ev.target.value })} placeholder="사건 제목" />
                    <button className="minibtn" onClick={() => delEvent(e.id)}>삭제</button>
                  </div>
                  <div style={{ ...rowGap, marginTop: 4 }}>
                    <input className="field" style={num} type="number" value={p.year} onChange={(ev) => setEventYMD(e.id, parseInt(ev.target.value) || 1, p.month, p.day)} title="년" />
                    <span style={lbl}>년</span>
                    <select className="field" value={p.month} onChange={(ev) => setEventYMD(e.id, p.year, parseInt(ev.target.value), p.day)}>
                      {cal.months.map((m, i) => <option key={i} value={i + 1}>{i + 1}. {m.name}</option>)}
                    </select>
                    <input className="field" style={num} type="number" min={1} value={p.day} onChange={(ev) => setEventYMD(e.id, p.year, p.month, Math.max(1, parseInt(ev.target.value) || 1))} title="일" />
                    <span style={lbl}>일</span>
                  </div>
                  <div style={{ ...rowGap, marginTop: 4 }}>
                    <select className="field" style={{ flex: 1 }} value={e.place} onChange={(ev) => setEvent(e.id, { place: ev.target.value })}>
                      <option value="">장소 없음</option>
                      {places.map((pl) => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                      {e.place && !places.some((pl) => pl.name === e.place) ? <option value={e.place}>{e.place}</option> : null}
                    </select>
                  </div>
                  <input className="field" style={{ width: '100%', marginTop: 4 }} value={e.note} onChange={(ev) => setEvent(e.id, { note: ev.target.value })} placeholder="메모" />
                  <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4 }}>{fmtDate(cal, p)} · 통산 {e.absDay}일 · 연중 {p.doy + 1}일째</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ======== 역법 설계 ======== */}
        {tab === 'design' && (
          <div>
            <div style={card}>
              <strong style={{ fontSize: 12 }}>월 (이름·길이)</strong>
              {cal.months.map((m, i) => (
                <div key={i} style={{ ...rowGap, marginTop: 4 }}>
                  <span style={{ ...lbl, minWidth: 18 }}>{i + 1}</span>
                  <input className="field" style={{ flex: 1, minWidth: 80 }} value={m.name} onChange={(e) => setMonth(i, { name: e.target.value })} />
                  <input className="field" style={num} type="number" min={1} value={m.days} onChange={(e) => setMonth(i, { days: Math.max(1, parseInt(e.target.value) || 1) })} />
                  <button className="minibtn" onClick={() => delMonth(i)}>x</button>
                </div>
              ))}
              <button className="minibtn" style={{ marginTop: 6 }} onClick={addMonth}>월 추가</button>
            </div>

            <div style={card}>
              <strong style={{ fontSize: 12 }}>요일</strong>
              <div style={{ ...rowGap, marginTop: 4 }}>
                {cal.weekdays.map((w, i) => (
                  <span key={i} style={rowGap}>
                    <input className="field" style={{ width: 60 }} value={w} onChange={(e) => setWeekday(i, e.target.value)} />
                    <button className="minibtn" onClick={() => delWeekday(i)}>x</button>
                  </span>
                ))}
              </div>
              <button className="minibtn" style={{ marginTop: 6 }} onClick={addWeekday}>요일 추가</button>
            </div>

            <div style={card}>
              <strong style={{ fontSize: 12 }}>윤법</strong>
              <div style={{ ...rowGap, marginTop: 4 }}>
                <span style={lbl}>주기</span>
                <input className="field" style={num} type="number" min={0} value={cal.leapEvery} onChange={(e) => set({ leapEvery: Math.max(0, parseInt(e.target.value) || 0) })} />
                <span style={{ fontSize: 11, opacity: 0.7 }}>년마다 윤일 +1 (0=없음)</span>
              </div>
              {cal.leapEvery > 0 && (
                <div style={{ ...rowGap, marginTop: 4 }}>
                  <span style={lbl}>윤일 월</span>
                  <select className="field" value={cal.leapMonth} onChange={(e) => set({ leapMonth: parseInt(e.target.value) })}>
                    {cal.months.map((m, i) => <option key={i} value={i + 1}>{i + 1}. {m.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={card}>
              <strong style={{ fontSize: 12 }}>계절 (시작 월)</strong>
              {cal.seasons.map((s, i) => (
                <div key={i} style={{ ...rowGap, marginTop: 4 }}>
                  <input className="field" style={{ width: 70 }} value={s.name} onChange={(e) => setSeason(i, { name: e.target.value })} />
                  <select className="field" value={s.startMonth} onChange={(e) => setSeason(i, { startMonth: parseInt(e.target.value) })}>
                    {cal.months.map((m, mi) => <option key={mi} value={mi + 1}>{mi + 1}. {m.name}</option>)}
                  </select>
                  <select className="field" style={{ width: 64 }} value={s.tint} onChange={(e) => setSeason(i, { tint: e.target.value })}>
                    {TINTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span style={{ width: 16, height: 16, borderRadius: 3, background: s.tint, display: 'inline-block' }} />
                  <button className="minibtn" onClick={() => delSeason(i)}>x</button>
                </div>
              ))}
              <button className="minibtn" style={{ marginTop: 6 }} onClick={addSeason}>계절 추가</button>
            </div>

            <div style={card}>
              <strong style={{ fontSize: 12 }}>매년 반복 축제</strong>
              {cal.festivals.map((f, i) => (
                <div key={i} style={{ marginTop: 4 }}>
                  <div style={rowGap}>
                    <input className="field" style={{ flex: 1, minWidth: 70 }} value={f.name} onChange={(e) => setFest(i, { name: e.target.value })} placeholder="축제명" />
                    <select className="field" value={f.month} onChange={(e) => setFest(i, { month: parseInt(e.target.value) })}>
                      {cal.months.map((m, mi) => <option key={mi} value={mi + 1}>{mi + 1}월</option>)}
                    </select>
                    <input className="field" style={num} type="number" min={1} value={f.day} onChange={(e) => setFest(i, { day: Math.max(1, parseInt(e.target.value) || 1) })} />
                    <button className="minibtn" onClick={() => delFest(i)}>x</button>
                  </div>
                  <input className="field" style={{ width: '100%', marginTop: 2 }} value={f.note} onChange={(e) => setFest(i, { note: e.target.value })} placeholder="설명" />
                </div>
              ))}
              <button className="minibtn" style={{ marginTop: 6 }} onClick={addFest}>축제 추가</button>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="license-note" style={{ fontSize: 11 }}>{msg}</div>}
    </div>
  )
}
