// 타임박싱 일일 플래너(Sunsama식) — 하루를 시간 블록으로 나눠 집필 작업을 배치한다.
//  · 작업 추가/수정/삭제, 예상 소요(분) 지정, 완료 체크.
//  · 작업을 하루 타임라인(설정 가능한 시작~종료 시각)에 시작 시각으로 배치(스케줄). 충돌 자동 회피.
//  · 미배치(백로그) 영역과 타임라인 영역 간 드래그 이동, 백로그 내 순서 드래그 재정렬.
//  · 오늘 총 집필 예정시간 합계 / 완료시간 / 진행률, 타임라인 빈 공간(가용시간) 표시.
//  · 날짜 이동(◀ 오늘 ▶) — 날짜별로 독립 저장. localStorage 영속, 미지원 graceful.
// 연계: addToProject 로 오늘 계획을 자료('계획' 폴더) 메모로 추가. addToStash 로 빠른 수집.
// 규칙 준수: react 와 './linkbus' 외 import 없음 / 외부 네트워크 없음 / 언마운트 시 타이머·리스너 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'timebox-planner', name: '타임박스 플래너', icon: '🗓️', group: '집중·생산성', intro: '하루를 시간 블록으로 나눠 집필 작업을 배치하고 예정시간을 한눈에', w: 760, h: 680 }

const NS = 'sry:tool:timebox-planner:'

// ── 타입 ──
interface Task {
  id: string
  title: string
  mins: number          // 예상 소요(분)
  start: number | null  // 타임라인 시작 시각(자정 기준 분). null = 백로그(미배치)
  done: boolean
  note?: string
  color: string         // 블록 색(작업 구분)
}
interface DaySettings { dayStart: number; dayEnd: number }  // 표시 범위(분)
interface DayData { tasks: Task[]; settings: DaySettings }

// ── 상수 ──
const PX_PER_MIN = 1.05                 // 타임라인 1분당 픽셀
const SNAP = 5                          // 분 단위 스냅
const DEFAULT_SETTINGS: DaySettings = { dayStart: 8 * 60, dayEnd: 22 * 60 }
const DURATIONS = [15, 25, 30, 45, 60, 90, 120]
const COLORS = ['#4a76d4', '#0f9d58', '#db8b1e', '#8e5bd4', '#d44a7a', '#1ea7a0', '#c2483a', '#5a6b7b']

// ── 유틸 ──
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 오늘 자정 기준 로컬 날짜 키(YYYY-MM-DD) — UTC 변환으로 인한 날짜 밀림 방지.
function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function keyToDate(k: string): Date {
  const [y, m, d] = k.split('-').map((n) => parseInt(n, 10))
  return new Date(y, (m || 1) - 1, d || 1)
}
function addDays(k: string, n: number): string {
  const d = keyToDate(k); d.setDate(d.getDate() + n); return dateKey(d)
}
function fmtClock(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const m = Math.floor(((mins % 60) + 60) % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function fmtDur(mins: number): string {
  if (mins <= 0) return '0분'
  const h = Math.floor(mins / 60); const m = mins % 60
  if (h && m) return `${h}시간 ${m}분`
  if (h) return `${h}시간`
  return `${m}분`
}
function fmtDayLabel(k: string): string {
  const d = keyToDate(k)
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const today = dateKey(new Date())
  const rel = k === today ? ' · 오늘' : k === addDays(today, 1) ? ' · 내일' : k === addDays(today, -1) ? ' · 어제' : ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})${rel}`
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function snap(v: number): number { return Math.round(v / SNAP) * SNAP }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

// ── 영속 ──
function loadDay(key: string): DayData {
  try {
    const raw = localStorage.getItem(NS + key)
    if (raw) {
      const p = JSON.parse(raw) as Partial<DayData>
      const tasks = Array.isArray(p.tasks) ? p.tasks.filter((t) => t && typeof (t as Task).title === 'string').map((t) => {
        const tt = t as Partial<Task>
        return {
          id: String(tt.id || newId()),
          title: String(tt.title || ''),
          mins: Number.isFinite(tt.mins as number) ? clamp(Math.round(tt.mins as number), 5, 600) : 30,
          start: typeof tt.start === 'number' ? tt.start : null,
          done: !!tt.done,
          note: typeof tt.note === 'string' ? tt.note : '',
          color: typeof tt.color === 'string' ? tt.color : COLORS[0],
        } as Task
      }) : []
      const s = (p.settings || {}) as Partial<DaySettings>
      const settings: DaySettings = {
        dayStart: Number.isFinite(s.dayStart as number) ? (s.dayStart as number) : DEFAULT_SETTINGS.dayStart,
        dayEnd: Number.isFinite(s.dayEnd as number) ? (s.dayEnd as number) : DEFAULT_SETTINGS.dayEnd,
      }
      if (settings.dayEnd <= settings.dayStart) settings.dayEnd = settings.dayStart + 60
      return { tasks, settings }
    }
  } catch { /* graceful */ }
  return { tasks: [], settings: { ...DEFAULT_SETTINGS } }
}

export default function TimeboxPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const [day, setDay] = useState<string>(() => dateKey(new Date()))
  const [data, setData] = useState<DayData>(() => loadDay(dateKey(new Date())))
  const [draft, setDraft] = useState('')
  const [draftMins, setDraftMins] = useState(30)
  const [editId, setEditId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [storageWarn, setStorageWarn] = useState(false)
  const [now, setNow] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() })

  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)

  // 드래그 상태(포인터 기반: 백로그↔타임라인, 타임라인 내 이동, 백로그 재정렬)
  const dragRef = useRef<{
    id: string; mode: 'timeline' | 'backlog'; offsetMin: number; startX: number; startY: number; moved: boolean
  } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ start: number } | null>(null)
  const [backlogOverId, setBacklogOverId] = useState<string | null>(null)

  const { tasks, settings } = data

  // ── 마운트/언마운트: 분 단위 현재시각 갱신 + 정리 ──
  useEffect(() => {
    mounted.current = true
    clockTimer.current = setInterval(() => {
      const d = new Date()
      if (mounted.current) setNow(d.getHours() * 60 + d.getMinutes())
    }, 30000)
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (clockTimer.current) clearInterval(clockTimer.current)
    }
  }, [])

  // payload 로 외부에서 작업 자동 추가(연계 진입점) — 한 번만.
  const payloadConsumed = useRef(false)
  useEffect(() => {
    if (payloadConsumed.current || !payload) return
    payloadConsumed.current = true
    const title = typeof payload.title === 'string' ? payload.title : (typeof payload.text === 'string' ? payload.text : '')
    if (title && title.trim()) {
      const mins = Number.isFinite(payload.mins as number) ? clamp(Math.round(payload.mins as number), 5, 600) : 30
      setData((prev) => ({ ...prev, tasks: [...prev.tasks, makeTask(title.trim(), mins, prev.tasks.length)] }))
      flash('연결된 작업을 백로그에 추가했어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 날짜 변경 시 해당 날짜 데이터 로드.
  useEffect(() => { setData(loadDay(day)); setEditId(null) }, [day])

  // 변경 즉시 저장(차단/용량초과 graceful).
  useEffect(() => {
    try {
      localStorage.setItem(NS + day, JSON.stringify(data))
      if (storageWarn && mounted.current) setStorageWarn(false)
    } catch {
      if (mounted.current) setStorageWarn(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, day])

  // 다른 탭 동기화(현재 날짜만).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NS + day) setData(loadDay(day))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [day])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }

  function makeTask(title: string, mins: number, idx: number): Task {
    return { id: newId(), title, mins, start: null, done: false, note: '', color: COLORS[idx % COLORS.length] }
  }

  // ── 파생값 ──
  const span = settings.dayEnd - settings.dayStart
  const timelineH = span * PX_PER_MIN
  const scheduled = useMemo(() => tasks.filter((t) => t.start !== null).slice().sort((a, b) => (a.start! - b.start!)), [tasks])
  const backlog = useMemo(() => tasks.filter((t) => t.start === null), [tasks])

  const plannedMins = useMemo(() => tasks.reduce((s, t) => s + t.mins, 0), [tasks])
  const scheduledMins = useMemo(() => scheduled.reduce((s, t) => s + t.mins, 0), [scheduled])
  const doneMins = useMemo(() => tasks.filter((t) => t.done).reduce((s, t) => s + t.mins, 0), [tasks])
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  // 타임라인에 배치된 블록이 점유한 시간(겹침은 합집합으로 계산) → 가용시간.
  const occupiedMins = useMemo(() => {
    const segs = scheduled.map((t) => [t.start!, t.start! + t.mins] as [number, number]).sort((a, b) => a[0] - b[0])
    let total = 0; let curEnd = -Infinity; let curStart = 0
    for (const [s, e] of segs) {
      const cs = clamp(s, settings.dayStart, settings.dayEnd)
      const ce = clamp(e, settings.dayStart, settings.dayEnd)
      if (ce <= cs) continue
      if (cs > curEnd) { if (curEnd > -Infinity) total += curEnd - curStart; curStart = cs; curEnd = ce }
      else curEnd = Math.max(curEnd, ce)
    }
    if (curEnd > -Infinity) total += curEnd - curStart
    return total
  }, [scheduled, settings.dayStart, settings.dayEnd])
  const freeMins = Math.max(0, span - occupiedMins)

  // ── 작업 조작 ──
  const update = (id: string, patch: Partial<Task>) =>
    setData((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  const remove = (id: string) =>
    setData((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }))
  const toggleDone = (id: string) =>
    setData((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))

  const addTask = () => {
    const t = draft.trim()
    if (!t) return
    setData((p) => ({ ...p, tasks: [...p.tasks, makeTask(t, draftMins, p.tasks.length)] }))
    setDraft('')
    flash('백로그에 추가했어요. 타임라인으로 끌어다 시간을 정하세요.')
  }

  // 다음 빈 슬롯 자동 배치(충돌 회피) — 백로그 → 타임라인.
  const findFreeSlot = useCallback((mins: number, existing: Task[]): number => {
    const blocks = existing.filter((t) => t.start !== null).map((t) => [t.start!, t.start! + t.mins] as [number, number]).sort((a, b) => a[0] - b[0])
    let cursor = settings.dayStart
    for (const [s, e] of blocks) {
      if (s - cursor >= mins) return cursor
      cursor = Math.max(cursor, e)
    }
    return cursor
  }, [settings.dayStart])

  const autoSchedule = (id: string) => {
    setData((p) => {
      const task = p.tasks.find((t) => t.id === id); if (!task) return p
      const others = p.tasks.filter((t) => t.id !== id)
      const slot = findFreeSlot(task.mins, others)
      return { ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, start: snap(slot) } : t)) }
    })
  }
  const unschedule = (id: string) => update(id, { start: null })

  // 모든 백로그를 빈 슬롯에 순차 자동 배치.
  const autoScheduleAll = () => {
    setData((p) => {
      let acc = [...p.tasks]
      const pending = acc.filter((t) => t.start === null)
      for (const task of pending) {
        const others = acc.filter((t) => t.id !== task.id)
        const slot = findFreeSlot(task.mins, others)
        acc = acc.map((t) => (t.id === task.id ? { ...t, start: snap(clamp(slot, settings.dayStart, settings.dayEnd - task.mins)) } : t))
      }
      return { ...p, tasks: acc }
    })
    flash('백로그 작업을 타임라인 빈 시간에 배치했어요.')
  }

  const clearScheduled = () => setData((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t, start: null })) }))

  // ── 드래그(포인터) ──
  const beginDrag = (e: React.PointerEvent, id: string, mode: 'timeline' | 'backlog') => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return
    const task = tasks.find((t) => t.id === id); if (!task) return
    let offsetMin = 0
    if (mode === 'timeline' && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const ptrMin = settings.dayStart + (e.clientY - rect.top) / PX_PER_MIN
      offsetMin = ptrMin - (task.start ?? settings.dayStart)
    }
    dragRef.current = { id, mode, offsetMin, startX: e.clientX, startY: e.clientY, moved: false }
    setDragId(id)
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* noop */ }
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
    window.addEventListener('pointercancel', onDragEnd)
  }

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current; if (!d) return
    if (!d.moved && Math.abs(e.clientX - d.startX) < 4 && Math.abs(e.clientY - d.startY) < 4) return
    d.moved = true
    const task = tasks.find((t) => t.id === d.id); if (!task) return
    const tl = timelineRef.current
    if (tl) {
      const rect = tl.getBoundingClientRect()
      const overTimeline = e.clientX >= rect.left - 24 && e.clientX <= rect.right + 24 && e.clientY >= rect.top - 60 && e.clientY <= rect.bottom + 60
      if (overTimeline) {
        const ptrMin = settings.dayStart + (e.clientY - rect.top) / PX_PER_MIN
        let s = snap(ptrMin - d.offsetMin)
        s = clamp(s, settings.dayStart, settings.dayEnd - task.mins)
        setDropHint({ start: s }); setBacklogOverId(null)
        return
      }
    }
    setDropHint(null)
    // 백로그 위에서: 재정렬 대상 표시
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const row = el?.closest('[data-backlog-id]') as HTMLElement | null
    setBacklogOverId(row?.getAttribute('data-backlog-id') || null)
  }, [tasks, settings.dayStart, settings.dayEnd])

  const onDragEnd = useCallback((e: PointerEvent) => {
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointercancel', onDragEnd)
    const d = dragRef.current
    dragRef.current = null
    setDragId(null)
    const hint = dropHint
    const overBacklog = backlogOverId
    setDropHint(null); setBacklogOverId(null)
    if (!d || !d.moved) return

    setData((p) => {
      const task = p.tasks.find((t) => t.id === d.id); if (!task) return p
      const tl = timelineRef.current
      let toTimeline = false; let newStart = task.start
      if (tl) {
        const rect = tl.getBoundingClientRect()
        const overTimeline = e.clientX >= rect.left - 24 && e.clientX <= rect.right + 24 && e.clientY >= rect.top - 60 && e.clientY <= rect.bottom + 60
        if (overTimeline && hint) { toTimeline = true; newStart = hint.start }
      }
      if (toTimeline) {
        return { ...p, tasks: p.tasks.map((t) => (t.id === d.id ? { ...t, start: newStart } : t)) }
      }
      // 타임라인 밖으로 → 백로그로(해제). 백로그 항목 위면 그 위치로 재정렬.
      const withState = p.tasks.map((t) => (t.id === d.id ? { ...t, start: null } : t))
      if (overBacklog && overBacklog !== d.id) {
        const arr = withState.filter((t) => t.start === null)
        const rest = withState.filter((t) => t.start !== null)
        const from = arr.findIndex((t) => t.id === d.id)
        const to = arr.findIndex((t) => t.id === overBacklog)
        if (from > -1 && to > -1) {
          const [moved] = arr.splice(from, 1)
          arr.splice(to, 0, moved)
        }
        return { ...p, tasks: [...rest, ...arr] }
      }
      return { ...p, tasks: withState }
    })
  }, [onDragMove, dropHint, backlogOverId])

  // ── 연계 ──
  const planToProject = () => {
    if (!tasks.length) { flash('추가할 작업이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    let body = `<p><strong>${escHtml(fmtDayLabel(day))}</strong> · 예정 ${escHtml(fmtDur(plannedMins))} · 완료 ${doneCount}/${tasks.length}</p>`
    if (scheduled.length) {
      body += '<p><strong>타임라인</strong></p><ul>'
      for (const t of scheduled) {
        body += `<li>${escHtml(fmtClock(t.start!))}–${escHtml(fmtClock(t.start! + t.mins))} (${escHtml(fmtDur(t.mins))}) ${t.done ? '☑ <s>' + escHtml(t.title) + '</s>' : '☐ ' + escHtml(t.title)}${t.note ? ' — ' + escHtml(t.note) : ''}</li>`
      }
      body += '</ul>'
    }
    if (backlog.length) {
      body += '<p><strong>미배치</strong></p><ul>'
      for (const t of backlog) body += `<li>${t.done ? '☑ <s>' + escHtml(t.title) + '</s>' : '☐ ' + escHtml(t.title)} (${escHtml(fmtDur(t.mins))})</li>`
      body += '</ul>'
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '계획',
      title: `타임박스 계획 · ${fmtDayLabel(day)}`,
      bodyHtml: body,
      meta: { 날짜: day, 예정시간: fmtDur(plannedMins), 완료: `${doneCount}/${tasks.length}` },
    })
    flash(id ? '프로젝트 자료 "계획" 폴더에 오늘 계획을 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashPlan = () => {
    if (!tasks.length) { flash('담을 작업이 없어요.'); return }
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    const lines = [`${fmtDayLabel(day)} · 예정 ${fmtDur(plannedMins)}`]
    for (const t of scheduled) lines.push(`${fmtClock(t.start!)} ${t.title} (${fmtDur(t.mins)})${t.done ? ' ✓' : ''}`)
    for (const t of backlog) lines.push(`· ${t.title} (${fmtDur(t.mins)})${t.done ? ' ✓' : ''}`)
    addToStash({ kind: 'memo', label: `타임박스 ${day}`, text: lines.join('\n') })
    flash('수집함에 오늘 계획을 담았어요.')
  }

  // 시간 눈금(정시) 라벨.
  const hourMarks = useMemo(() => {
    const marks: number[] = []
    const first = Math.ceil(settings.dayStart / 60) * 60
    for (let m = first; m <= settings.dayEnd; m += 60) marks.push(m)
    return marks
  }, [settings.dayStart, settings.dayEnd])

  const showNow = day === dateKey(new Date()) && now >= settings.dayStart && now <= settings.dayEnd

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const dayBtn: React.CSSProperties = { fontWeight: 700, fontSize: 15, minWidth: 168, textAlign: 'center' }
  const statRow: React.CSSProperties = { display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const statBox: React.CSSProperties = { flex: '1 1 100px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 10px', textAlign: 'center', minWidth: 92 }
  const statNum: React.CSSProperties = { fontSize: 19, fontWeight: 700, lineHeight: 1.15 }
  const statSub: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 1 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const leftCol: React.CSSProperties = { width: 290, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minHeight: 0 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const colHead: React.CSSProperties = { padding: '8px 12px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }
  const addRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--border)' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const backlogList: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }
  const card = (t: Task, dragging: boolean, over: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 9px', borderRadius: 9,
    border: '1px solid var(--border)', borderLeft: `4px solid ${t.color}`,
    background: over ? 'color-mix(in srgb, var(--accent) 14%, var(--chrome-2))' : 'var(--chrome-2)',
    opacity: dragging ? 0.45 : 1, cursor: 'grab', userSelect: 'none', touchAction: 'none',
    boxShadow: over ? '0 0 0 2px var(--accent) inset' : 'none',
  })
  const cardTitle = (done: boolean): React.CSSProperties => ({ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', color: done ? 'var(--muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', flex: 1, minWidth: 0 })
  const tlScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }
  const tlInner: React.CSSProperties = { position: 'relative', height: timelineH, marginLeft: 52, marginRight: 12, marginTop: 6, marginBottom: 16 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, padding: '0 12px 8px' }
  const linkbar: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 14px', borderTop: '1px solid var(--border)' }
  const settingInput: React.CSSProperties = { width: 60, padding: '4px 6px', fontSize: 12, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }

  const setRange = (which: 'dayStart' | 'dayEnd', hhmm: string) => {
    const m = /^(\d{1,2}):?(\d{2})?$/.exec(hhmm.trim())
    if (!m) return
    const mins = clamp(parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0), 0, 1439)
    setData((p) => {
      const s = { ...p.settings, [which]: mins }
      if (s.dayEnd <= s.dayStart) return p
      return { ...p, settings: s }
    })
  }

  return (
    <div style={wrap}>
      {/* 헤더: 날짜 이동 + 범위 설정 */}
      <div style={head}>
        <button className="minibtn" onClick={() => setDay((d) => addDays(d, -1))} title="이전 날">◀</button>
        <button className="minibtn" style={dayBtn} onClick={() => setDay(dateKey(new Date()))} title="오늘로">
          {fmtDayLabel(day)}
        </button>
        <button className="minibtn" onClick={() => setDay((d) => addDays(d, 1))} title="다음 날">▶</button>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
          하루
          <input style={settingInput} defaultValue={fmtClock(settings.dayStart)} key={'s' + day + settings.dayStart}
            onBlur={(e) => setRange('dayStart', e.target.value)} aria-label="하루 시작 시각" />
          –
          <input style={settingInput} defaultValue={fmtClock(settings.dayEnd)} key={'e' + day + settings.dayEnd}
            onBlur={(e) => setRange('dayEnd', e.target.value)} aria-label="하루 종료 시각" />
        </span>
      </div>

      {/* 통계: 오늘 총 예정시간 합계 외 */}
      <div style={statRow}>
        <div style={statBox}>
          <div style={{ ...statNum, color: 'var(--accent)' }}>{fmtDur(plannedMins)}</div>
          <div style={statSub}>예정 집필시간</div>
        </div>
        <div style={statBox}>
          <div style={statNum}>{fmtDur(scheduledMins)}</div>
          <div style={statSub}>배치됨</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: 'var(--ok)' }}>{fmtDur(doneMins)}</div>
          <div style={statSub}>완료 {doneCount}/{tasks.length}</div>
        </div>
        <div style={statBox}>
          <div style={statNum}>{fmtDur(freeMins)}</div>
          <div style={statSub}>가용 시간</div>
        </div>
      </div>

      {storageWarn && <div style={{ ...hint, color: 'var(--warn)', paddingTop: 6 }}>이 브라우저에서 저장이 막혀 있어 새로고침하면 계획이 사라질 수 있어요.</div>}

      <div style={body}>
        {/* 왼쪽: 작업 추가 + 백로그 */}
        <div style={leftCol}>
          <div style={addRow}>
            <input
              style={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }}
              placeholder="집필 작업 입력 (예: 3장 초고 쓰기)…"
              maxLength={120}
              aria-label="작업 입력"
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={draftMins} onChange={(e) => setDraftMins(parseInt(e.target.value, 10))} style={{ ...settingInput, width: 78 }} aria-label="예상 소요">
                {DURATIONS.map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}
              </select>
              <button className="btn-primary" onClick={addTask} disabled={!draft.trim()} style={{ marginLeft: 'auto' }}>추가</button>
            </div>
          </div>

          <div style={colHead}>
            <span>미배치 작업 <strong style={{ color: 'var(--text)' }}>{backlog.length}</strong></span>
            <span style={{ display: 'flex', gap: 5 }}>
              <button className="minibtn" onClick={autoScheduleAll} disabled={!backlog.length} title="빈 시간에 자동 배치"><Emoji e="⏱️"/> 자동배치</button>
            </span>
          </div>

          <div style={backlogList}>
            {backlog.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 8px', lineHeight: 1.6 }}>
                미배치 작업이 없어요.<br />위에서 작업을 추가하세요.
              </div>
            ) : backlog.map((t) => (
              <div
                key={t.id}
                data-backlog-id={t.id}
                style={card(t, dragId === t.id, backlogOverId === t.id && dragId !== null && dragId !== t.id)}
                onPointerDown={(e) => beginDrag(e, t.id, 'backlog')}
                title="드래그해 타임라인에 배치하거나 순서 변경"
              >
                <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ marginTop: 2, accentColor: t.color, cursor: 'pointer' }} aria-label="완료" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === t.id ? (
                    <input
                      autoFocus style={{ ...input, padding: '4px 6px', fontSize: 13 }} defaultValue={t.title}
                      onBlur={(e) => { update(t.id, { title: e.target.value.trim() || t.title }); setEditId(null) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditId(null) }}
                    />
                  ) : (
                    <div style={cardTitle(t.done)} onDoubleClick={() => setEditId(t.id)}>{t.title}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <select value={t.mins} onChange={(e) => update(t.id, { mins: parseInt(e.target.value, 10) })} style={{ ...settingInput, width: 74, fontSize: 11 }} aria-label="소요 시간">
                      {DURATIONS.map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}
                    </select>
                    <button className="linkbtn" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => autoSchedule(t.id)} title="타임라인 빈 시간에 배치"><Emoji e="⏱️"/> 배치</button>
                    <button className="minibtn" style={{ fontSize: 11, padding: '2px 6px', marginLeft: 'auto', color: 'var(--warn)' }} onClick={() => remove(t.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 타임라인 */}
        <div style={rightCol}>
          <div style={colHead}>
            <span>타임라인 <strong style={{ color: 'var(--text)' }}>{scheduled.length}</strong> 블록</span>
            <button className="minibtn" onClick={clearScheduled} disabled={!scheduled.length} title="모두 미배치로">↺ 모두 해제</button>
          </div>
          <div style={tlScroll} ref={timelineRef}>
            <div style={tlInner}>
              {/* 시간 눈금 */}
              {hourMarks.map((m) => {
                const top = (m - settings.dayStart) * PX_PER_MIN
                return (
                  <div key={m} style={{ position: 'absolute', top, left: -52, right: -12, height: 0, borderTop: '1px dashed var(--border)' }}>
                    <span style={{ position: 'absolute', top: -8, left: 0, width: 44, textAlign: 'right', fontSize: 10.5, color: 'var(--muted)' }}>{fmtClock(m)}</span>
                  </div>
                )
              })}

              {/* 현재 시각 라인 */}
              {showNow && (
                <div style={{ position: 'absolute', top: (now - settings.dayStart) * PX_PER_MIN, left: -52, right: -12, height: 0, borderTop: '2px solid var(--warn)', zIndex: 5, pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', top: -7, right: 0, fontSize: 10, fontWeight: 700, color: 'var(--warn)', background: 'var(--paper)', padding: '0 3px', borderRadius: 4 }}>지금 {fmtClock(now)}</span>
                </div>
              )}

              {/* 드롭 미리보기 */}
              {dropHint && dragId && (() => {
                const t = tasks.find((x) => x.id === dragId); if (!t) return null
                return (
                  <div style={{ position: 'absolute', top: (dropHint.start - settings.dayStart) * PX_PER_MIN, left: 0, right: 0, height: t.mins * PX_PER_MIN, borderRadius: 8, border: '2px dashed var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', zIndex: 4, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                    {fmtClock(dropHint.start)}–{fmtClock(dropHint.start + t.mins)}
                  </div>
                )
              })()}

              {/* 배치된 블록 */}
              {scheduled.map((t) => {
                const top = (t.start! - settings.dayStart) * PX_PER_MIN
                const h = Math.max(18, t.mins * PX_PER_MIN)
                const tall = h >= 44
                return (
                  <div
                    key={t.id}
                    style={{
                      position: 'absolute', top, left: 0, right: 0, height: h - 3,
                      borderRadius: 8, overflow: 'hidden', cursor: 'grab', userSelect: 'none', touchAction: 'none',
                      background: `color-mix(in srgb, ${t.color} ${t.done ? 16 : 26}%, var(--paper))`,
                      border: `1px solid ${t.color}`, borderLeft: `4px solid ${t.color}`,
                      opacity: dragId === t.id ? 0.4 : 1, zIndex: dragId === t.id ? 6 : 2,
                      display: 'flex', flexDirection: 'column', padding: tall ? '4px 8px' : '1px 8px',
                      boxSizing: 'border-box',
                    }}
                    onPointerDown={(e) => beginDrag(e, t.id, 'timeline')}
                    title={`${fmtClock(t.start!)}–${fmtClock(t.start! + t.mins)} · ${t.title}\n드래그로 이동, 더블클릭으로 제목 수정`}
                    onDoubleClick={() => setEditId(t.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ accentColor: t.color, cursor: 'pointer', flexShrink: 0 }} aria-label="완료" />
                      {editId === t.id ? (
                        <input
                          autoFocus style={{ ...input, padding: '2px 6px', fontSize: 13, flex: 1 }} defaultValue={t.title}
                          onPointerDown={(e) => e.stopPropagation()}
                          onBlur={(e) => { update(t.id, { title: e.target.value.trim() || t.title }); setEditId(null) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditId(null) }}
                        />
                      ) : (
                        <span style={{ ...cardTitle(t.done), fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                      )}
                      <button className="minibtn" style={{ fontSize: 11, padding: '0 5px', flexShrink: 0 }} onClick={() => unschedule(t.id)} title="미배치로 보내기">↩</button>
                    </div>
                    {tall && (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 'auto' }}>
                        {fmtClock(t.start!)}–{fmtClock(t.start! + t.mins)} · {fmtDur(t.mins)}
                      </div>
                    )}
                  </div>
                )
              })}

              {scheduled.length === 0 && !dropHint && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', lineHeight: 1.7, padding: 16, pointerEvents: 'none' }}>
                  왼쪽 작업을 이 타임라인으로 끌어다 놓거나<br />작업의 <Emoji e="⏱️"/> 배치 버튼을 눌러 시간을 정하세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={hint}>
        작업을 추가하면 왼쪽 미배치 목록에 쌓입니다. 카드를 타임라인으로 드래그해 시작 시각을 정하고(5분 단위 스냅), 블록을 다시 끌어 이동/재정렬하세요. 더블클릭으로 제목 수정, 체크로 완료 처리. 날짜·계획은 이 브라우저에 자동 저장됩니다.
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', padding: '0 14px 6px' }}>{toast}</div>}

      {/* 연계 */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={planToProject}
          disabled={!tasks.length || !hasProjectBridge()}
          title={hasProjectBridge() ? '오늘 계획을 프로젝트 자료 "계획" 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={stashPlan}
          disabled={!tasks.length || !hasStash()}
          title={hasStash() ? '오늘 계획을 수집함에 메모로 담기' : '수집함을 사용할 수 없습니다'}
        ><Emoji e="🧺"/> 수집함에 담기</button>
      </div>
    </div>
  )
}
