// 연속성 노트 — 장면별 시간·장소·날씨·소품·인물 상태(부상·복장·소지품 등)를 기록해
//  장면 간 연속성 모순을 자동 점검한다. 예) 같은 날인데 낮→밤 급변, 한 장면에서 사라졌던 소품이
//  다음 장면에서 갑자기 다시 등장, 부상/복장 상태가 설명 없이 회복·변경 등.
//  여러 장면을 시간/순서대로 정렬해 추적하며, 각 장면 CRUD(추가/수정/삭제/순서 변경) + localStorage 영속.
//  자급식: react·linkbus 외 import 없음. 전부 로컬(외부 미디어/키 불필요).
//  연계(linkbus): 좌측 바인더 파일을 끌어다 놓으면 제목/본문을 장면 시드로 채움.
//    설계한 연속성 표를 실제 프로젝트 자료('연속성') 폴더에 점검 결과와 함께 문서로 추가.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji, emojify } from './linkbus'

export const meta = { id: 'continuity-notes', name: '연속성 노트', icon: '🧩', group: '구상·정리', intro: '장면별 시간·장소·날씨·소품·인물 상태를 기록해 장면 간 모순을 점검', w: 720, h: 640 }

// ---------- 시간대 정의(순서값으로 낮→밤 급변 등 점검) ----------
type TimeKey = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'midnight' | 'unset'
interface TimeDef { key: TimeKey; label: string; icon: string; ord: number; light: 'day' | 'dusk' | 'night' | 'none' }
const TIMES: TimeDef[] = [
  { key: 'dawn', label: '새벽', icon: '🌄', ord: 0, light: 'dusk' },
  { key: 'morning', label: '아침', icon: '🌅', ord: 1, light: 'day' },
  { key: 'noon', label: '정오', icon: '🌞', ord: 2, light: 'day' },
  { key: 'afternoon', label: '오후', icon: '🌤️', ord: 3, light: 'day' },
  { key: 'evening', label: '저녁', icon: '🌇', ord: 4, light: 'dusk' },
  { key: 'night', label: '밤', icon: '🌙', ord: 5, light: 'night' },
  { key: 'midnight', label: '심야', icon: '🌑', ord: 6, light: 'night' },
  { key: 'unset', label: '미정', icon: '❓', ord: -1, light: 'none' },
]
function timeDef(k: TimeKey): TimeDef { return TIMES.find((t) => t.key === k) || TIMES[TIMES.length - 1] }

// ---------- 날씨 정의 ----------
type WxKey = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm' | 'wind' | 'hot' | 'cold' | 'unset'
interface WxDef { key: WxKey; label: string; icon: string }
const WEATHERS: WxDef[] = [
  { key: 'clear', label: '맑음', icon: '☀️' },
  { key: 'cloudy', label: '흐림', icon: '☁️' },
  { key: 'rain', label: '비', icon: '🌧️' },
  { key: 'snow', label: '눈', icon: '❄️' },
  { key: 'fog', label: '안개', icon: '🌫️' },
  { key: 'storm', label: '폭풍·뇌우', icon: '⛈️' },
  { key: 'wind', label: '바람', icon: '💨' },
  { key: 'hot', label: '무더위', icon: '🥵' },
  { key: 'cold', label: '추위', icon: '🥶' },
  { key: 'unset', label: '미정', icon: '❓' },
]
function wxDef(k: WxKey): WxDef { return WEATHERS.find((w) => w.key === k) || WEATHERS[WEATHERS.length - 1] }

// ---------- 인물 상태 ----------
interface CharState {
  id: string
  name: string          // 인물 이름
  outfit: string        // 복장
  injury: string        // 부상·컨디션
  carry: string         // 소지품(이 인물이 들고 있는 것)
  note: string          // 기타 상태(감정·위치 등)
}

// ---------- 장면(연속성 단위) ----------
interface Scene {
  id: string
  title: string
  day: string           // 작중 일자 라벨(예: "1일차", "사건 다음 날", "2024-03-02")
  time: TimeKey
  place: string
  weather: WxKey
  props: string         // 핵심 소품(쉼표/줄바꿈 구분). 등장·사라짐 추적의 단위
  chars: CharState[]
  notes: string
  createdAt: number
}

const LS_KEY = 'sry:tool:continuity-notes'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyChar(): CharState { return { id: newId(), name: '', outfit: '', injury: '', carry: '', note: '' } }
function emptyScene(): Scene {
  return { id: '', title: '', day: '', time: 'unset', place: '', weather: 'unset', props: '', chars: [], notes: '', createdAt: 0 }
}

// 소품/소지품 텍스트 → 정규화된 토큰 집합(소문자, 공백/구두점 정리)
function tokenize(s: string): string[] {
  return s
    .split(/[,，、\n;；]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}
function normTok(s: string): string { return s.trim().toLowerCase().replace(/\s+/g, ' ') }

// 한 장면의 모든 소품(장면 props + 각 인물 소지품)을 모은 집합(표시용 원문 보존)
function allProps(s: Scene): { disp: string; norm: string }[] {
  const out: { disp: string; norm: string }[] = []
  const seen = new Set<string>()
  const push = (t: string) => { const n = normTok(t); if (n && !seen.has(n)) { seen.add(n); out.push({ disp: t.trim(), norm: n }) } }
  tokenize(s.props).forEach(push)
  s.chars.forEach((c) => tokenize(c.carry).forEach(push))
  return out
}

// 인물 이름 정규화 키
function charKey(name: string): string { return normTok(name) }

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화. & < > 필수.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------- 연속성 점검 ----------
type Severity = 'warn' | 'info'
interface Issue { from: string; to: string; severity: Severity; text: string }

// 같은 작중 일자(day) 내에서 시간대가 거꾸로 가거나(밤→낮) 두 단계 이상 급변하면 경고
function checkTimeJumps(scenes: Scene[]): Issue[] {
  const issues: Issue[] = []
  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1]
    const b = scenes[i]
    const da = a.day.trim(); const db = b.day.trim()
    const ta = timeDef(a.time); const tb = timeDef(b.time)
    if (ta.ord < 0 || tb.ord < 0) continue
    // 같은 날로 표기된 경우에만 같은 하루의 흐름으로 본다
    if (!da || !db || normTok(da) !== normTok(db)) continue
    if (tb.ord < ta.ord) {
      issues.push({ from: a.id, to: b.id, severity: 'warn', text: `같은 날(${da})인데 시간대가 거꾸로 흐릅니다: ${ta.icon}${ta.label} → ${tb.icon}${tb.label}. 날이 바뀌었다면 작중 일자를 구분해 주세요.` })
    } else if (tb.ord - ta.ord >= 3) {
      issues.push({ from: a.id, to: b.id, severity: 'info', text: `같은 날(${da}) 안에서 시간대가 크게 건너뜁니다: ${ta.icon}${ta.label} → ${tb.icon}${tb.label}. 그 사이의 경과를 독자가 알 수 있나요?` })
    }
    // 빛 상태 급변(낮↔밤)
    if ((ta.light === 'day' && tb.light === 'night') || (ta.light === 'night' && tb.light === 'day')) {
      issues.push({ from: a.id, to: b.id, severity: 'warn', text: `같은 날(${da})에 ${ta.label}(낮)↔${tb.label}(밤)으로 밝기가 급변합니다. 장면 전환 사이의 시간 경과를 명확히 했는지 확인하세요.` })
    }
  }
  return issues
}

// 소품 연속성: 한 장면에 등장했던 소품이 이후 장면에서 사라졌다가, 더 뒤 장면에서 설명 없이 다시 등장
function checkPropReappear(scenes: Scene[]): Issue[] {
  const issues: Issue[] = []
  // 각 소품(norm)별 등장 장면 인덱스 목록
  const map = new Map<string, { disp: string; idxs: number[] }>()
  scenes.forEach((s, i) => {
    allProps(s).forEach(({ disp, norm }) => {
      const e = map.get(norm)
      if (e) { e.idxs.push(i) } else { map.set(norm, { disp, idxs: [i] }) }
    })
  })
  map.forEach(({ disp, idxs }) => {
    if (idxs.length < 2) return
    for (let k = 1; k < idxs.length; k++) {
      const gap = idxs[k] - idxs[k - 1]
      if (gap >= 2) {
        const a = scenes[idxs[k - 1]]
        const b = scenes[idxs[k]]
        issues.push({ from: a.id, to: b.id, severity: 'info', text: `소품 "${disp}"이(가) 중간 ${gap - 1}개 장면에서 보이지 않다가 다시 등장합니다. 그 사이 어디에 있었는지 일관성을 확인하세요.` })
      }
    }
  })
  return issues
}

// 같은 장소가 인접 장면에서 시간/날씨만 바뀌는 경우(자연스러운 흐름) vs. 멀리 떨어진 장면들이 같은 소품을 공유하는지 등은 위에서 처리.
// 인물 상태 연속성: 같은 인물의 부상/복장이 인접(같은 날) 장면에서 설명 없이 변경되는지 점검
function checkCharState(scenes: Scene[]): Issue[] {
  const issues: Issue[] = []
  // 인물별 마지막 등장 스냅샷
  const last = new Map<string, { sceneIdx: number; injury: string; outfit: string }>()
  scenes.forEach((s, i) => {
    s.chars.forEach((c) => {
      const key = charKey(c.name)
      if (!key) return
      const prev = last.get(key)
      const curInjury = c.injury.trim()
      const curOutfit = c.outfit.trim()
      if (prev) {
        const a = scenes[prev.sceneIdx]
        const sameDay = a.day.trim() && s.day.trim() && normTok(a.day) === normTok(s.day)
        // 부상: 이전에 부상 기록이 있었는데 지금은 비었거나 다른 내용 → 회복/변경 점검
        if (prev.injury && curInjury && normTok(prev.injury) !== normTok(curInjury)) {
          issues.push({ from: a.id, to: s.id, severity: 'info', text: `${c.name}의 상태가 "${prev.injury}" → "${curInjury}"로 바뀝니다. 변화 과정을 본문에서 보여 주었는지 확인하세요.` })
        } else if (prev.injury && !curInjury && sameDay) {
          issues.push({ from: a.id, to: s.id, severity: 'warn', text: `${c.name}이(가) 같은 날 이전 장면에서 "${prev.injury}" 상태였는데 이 장면에는 상태 기록이 비어 있습니다. 회복했다면 그 과정을, 아니라면 상태를 이어 적어 주세요.` })
        }
        // 복장: 같은 날인데 복장이 바뀌면 갈아입는 장면이 있었는지 점검
        if (sameDay && prev.outfit && curOutfit && normTok(prev.outfit) !== normTok(curOutfit)) {
          issues.push({ from: a.id, to: s.id, severity: 'info', text: `같은 날 ${c.name}의 복장이 "${prev.outfit}" → "${curOutfit}"로 바뀝니다. 갈아입는 장면이나 시간 경과가 있었나요?` })
        }
      }
      last.set(key, { sceneIdx: i, injury: curInjury || (prev?.injury ?? ''), outfit: curOutfit || (prev?.outfit ?? '') })
    })
  })
  return issues
}

function runChecks(scenes: Scene[]): Issue[] {
  if (scenes.length < 2) return checkCharState(scenes) // 단일 장면도 인물 중복 등은 의미 없음 → 사실상 빈 배열
  return [...checkTimeJumps(scenes), ...checkPropReappear(scenes), ...checkCharState(scenes)]
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Scene[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const okTime = (x: unknown): TimeKey => TIMES.some((t) => t.key === x) ? x as TimeKey : 'unset'
    const okWx = (x: unknown): WxKey => WEATHERS.some((w) => w.key === x) ? x as WxKey : 'unset'
    const list: Scene[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      title: String(x.title || ''),
      day: String(x.day || ''),
      time: okTime(x.time),
      place: String(x.place || ''),
      weather: okWx(x.weather),
      props: String(x.props || ''),
      chars: Array.isArray(x.chars) ? x.chars.filter((c: any) => c && typeof c === 'object').map((c: any) => ({
        id: String(c.id || newId()),
        name: String(c.name || ''),
        outfit: String(c.outfit || ''),
        injury: String(c.injury || ''),
        carry: String(c.carry || ''),
        note: String(c.note || ''),
      })) : [],
      notes: String(x.notes || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((s) => s.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

// 프로젝트 문서 본문(HTML) — 연속성 표 + 점검 결과
function buildBodyHtml(scenes: Scene[], issues: Issue[]): string {
  const idxOf = new Map(scenes.map((s, i) => [s.id, i + 1]))
  const parts: string[] = []
  parts.push('<p><b>🧩 연속성 노트</b> — 장면별 시간·장소·날씨·소품·인물 상태</p>')
  scenes.forEach((s, i) => {
    const t = timeDef(s.time); const w = wxDef(s.weather)
    const head = `${i + 1}. ${escHtml(s.title.trim() || '제목 없는 장면')}`
    parts.push(`<p><b>${head}</b></p>`)
    const meta: string[] = []
    if (s.day.trim()) meta.push('📅 ' + escHtml(s.day.trim()))
    if (s.time !== 'unset') meta.push(t.icon + ' ' + escHtml(t.label))
    if (s.place.trim()) meta.push('📍 ' + escHtml(s.place.trim()))
    if (s.weather !== 'unset') meta.push(w.icon + ' ' + escHtml(w.label))
    if (meta.length) parts.push('<p>' + meta.join(' · ') + '</p>')
    const props = tokenize(s.props)
    if (props.length) parts.push('<p>🎒 소품: ' + props.map((p) => escHtml(p)).join(', ') + '</p>')
    if (s.chars.length) {
      parts.push('<p>👥 인물 상태</p><ul>')
      s.chars.forEach((c) => {
        const bits: string[] = []
        if (c.outfit.trim()) bits.push('복장: ' + escHtml(c.outfit.trim()))
        if (c.injury.trim()) bits.push('상태: ' + escHtml(c.injury.trim()))
        if (c.carry.trim()) bits.push('소지: ' + escHtml(c.carry.trim()))
        if (c.note.trim()) bits.push(escHtml(c.note.trim()))
        parts.push('<li><b>' + escHtml(c.name.trim() || '이름 없음') + '</b>' + (bits.length ? ' — ' + bits.join(' / ') : '') + '</li>')
      })
      parts.push('</ul>')
    }
    if (s.notes.trim()) parts.push('<p>🗒️ ' + escHtml(s.notes.trim()) + '</p>')
  })
  parts.push('<hr>')
  if (issues.length) {
    parts.push(`<p><b>⚠️ 연속성 점검 (${issues.length}건)</b></p><ul>`)
    issues.forEach((it) => {
      const a = idxOf.get(it.from); const b = idxOf.get(it.to)
      const tag = it.severity === 'warn' ? '🔴' : '🟡'
      const loc = a && b ? `[${a}→${b}] ` : ''
      parts.push('<li>' + tag + ' ' + escHtml(loc) + escHtml(it.text) + '</li>')
    })
    parts.push('</ul>')
  } else {
    parts.push('<p>✅ 발견된 연속성 모순이 없습니다.</p>')
  }
  return parts.join('')
}

export default function ContinuityNotes({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Scene[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Scene | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [showIssues, setShowIssues] = useState(true)
  const [dropping, setDropping] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didSeed = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }

  // 페이로드로 장면 시드(title/text)가 오면 1회 새 장면 폼으로 채움
  useEffect(() => {
    if (didSeed.current) return
    const title = typeof payload?.title === 'string' ? payload.title : ''
    const text = typeof payload?.text === 'string' ? payload.text : ''
    if (title || text) {
      didSeed.current = true
      setEditing({ ...emptyScene(), id: newId(), title: title.slice(0, 80), notes: text.slice(0, 600) })
      setOpenId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNew = () => { setEditing({ ...emptyScene(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (s: Scene) => { setEditing({ ...s, chars: s.chars.map((c) => ({ ...c })) }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e: Scene = { ...editing, chars: editing.chars.filter((c) => c.name.trim() || c.outfit.trim() || c.injury.trim() || c.carry.trim() || c.note.trim()) }
    if (!e.title.trim()) e.title = (e.place.trim() || '제목 없는 장면')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((s) => s.id === e.id)
      return exists ? prev.map((s) => (s.id === e.id ? e : s)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
    flash('장면을 저장했습니다.')
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경(목록 내)
  const onRowDragStart = (id: string) => { dragId.current = id }
  const onRowDragOver = (e: React.DragEvent, id: string) => {
    if (dragId.current && dragId.current !== id) { e.preventDefault(); setDragOver(id) }
  }
  const onRowDrop = (id: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === id) return
    setList((prev) => {
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === id)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [m] = next.splice(fi, 1)
      next.splice(ti, 0, m)
      return next
    })
  }

  // ----- 인물 상태 편집(폼 내) -----
  const addChar = () => { if (editing) setEditing({ ...editing, chars: [...editing.chars, emptyChar()] }) }
  const updChar = (cid: string, patch: Partial<CharState>) => {
    if (!editing) return
    setEditing({ ...editing, chars: editing.chars.map((c) => (c.id === cid ? { ...c, ...patch } : c)) })
  }
  const delChar = (cid: string) => { if (editing) setEditing({ ...editing, chars: editing.chars.filter((c) => c.id !== cid) }) }

  // ----- 바인더 파일 드롭(좌측 파일 → 새 장면 시드) -----
  const onPaneDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropping(true) } }
  const onPaneDragLeave = () => setDropping(false)
  const onPaneDrop = (e: React.DragEvent) => {
    setDropping(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch: CharState[] = item.type === 'character' && item.title.trim()
      ? [{ ...emptyChar(), name: item.title.trim() }]
      : []
    setEditing({
      ...emptyScene(),
      id: newId(),
      title: item.type === 'character' ? '' : item.title.slice(0, 80),
      chars: ch,
      notes: (item.text || '').slice(0, 600),
    })
    setOpenId(null)
    flash(`"${item.title}"을(를) 새 장면 시드로 불러왔습니다.`)
  }

  const issues = runChecks(list)
  const warnCount = issues.filter((i) => i.severity === 'warn').length
  const issuesFor = (id: string) => issues.filter((i) => i.from === id || i.to === id)

  const toProject = () => {
    if (!list.length) { flash('추가할 장면이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '연속성',
      title: '연속성 노트',
      bodyHtml: buildBodyHtml(list, issues),
      meta: { 장면수: String(list.length), 점검: issues.length ? `${issues.length}건` : '이상 없음', 경고: String(warnCount) },
    })
    flash(id ? '프로젝트 자료 "연속성" 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ---------- styles ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 0, color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 248, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }
  const field: React.CSSProperties = { marginBottom: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const selS: React.CSSProperties = { ...input, cursor: 'pointer' }
  const linkbar: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)' }

  return (
    <div style={wrap} onDragOver={onPaneDragOver} onDragLeave={onPaneDragLeave} onDrop={onPaneDrop}>
      {dropping && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
          여기에 놓아 새 장면으로 불러오기
        </div>
      )}

      <div style={topbar}>
        <button className="btn-primary" onClick={startNew}>＋ 장면 추가</button>
        <span style={hint}>장면 {list.length}개</span>
        <span style={{ flex: 1 }} />
        <button
          className="minibtn"
          onClick={() => setShowIssues((v) => !v)}
          title="연속성 점검 결과 표시 전환"
          style={warnCount ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined}
        >
          {issues.length ? <><Emoji e="⚠️" /> {`점검 ${issues.length}건${warnCount ? ` (경고 ${warnCount})` : ''}`}</> : <><Emoji e="✅" /> 이상 없음</>}
        </button>
      </div>

      <div style={body}>
        {/* 좌측: 장면 목록 */}
        <div style={sidebar}>
          <div style={listWrap}>
            {list.length === 0 ? (
              <div style={{ ...hint, textAlign: 'center', padding: '24px 8px' }}>
                아직 장면이 없어요.<br />
                <b>＋ 장면 추가</b>로 첫 장면을 기록하거나,<br />
                좌측 바인더 파일을 이 창에 끌어다 놓으세요.
              </div>
            ) : list.map((s, i) => {
              const t = timeDef(s.time); const w = wxDef(s.weather)
              const active = openId === s.id || editing?.id === s.id
              const myIssues = issuesFor(s.id)
              const hasWarn = myIssues.some((x) => x.severity === 'warn')
              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => onRowDragStart(s.id)}
                  onDragOver={(e) => onRowDragOver(e, s.id)}
                  onDrop={() => onRowDrop(s.id)}
                  onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                  onClick={() => { setOpenId(s.id); setEditing(null); setConfirmDel(null) }}
                  style={{
                    ...card,
                    cursor: 'pointer',
                    padding: 9,
                    borderColor: dragOver === s.id ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)',
                    background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--chrome-2))' : 'var(--chrome-2)',
                  }}
                  title="클릭하여 열기 · 끌어서 순서 변경"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title.trim() || '제목 없는 장면'}
                    </span>
                    {myIssues.length > 0 && <span title={`연속성 점검 ${myIssues.length}건`}>{hasWarn ? <Emoji e="🔴" /> : <Emoji e="🟡" />}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emojify([s.day.trim(), s.time !== 'unset' ? t.icon + t.label : '', s.place.trim(), s.weather !== 'unset' ? w.icon : ''].filter(Boolean).join(' · ') || '정보 미입력')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측: 편집/상세/안내 */}
        <div style={main}>
          {editing ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{list.some((s) => s.id === editing.id) ? '장면 수정' : '새 장면'}</h3>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={cancelEdit}>취소</button>
                <button className="btn-primary" onClick={saveForm}>저장</button>
              </div>

              <div style={field}>
                <label style={lbl}>장면 제목</label>
                <input style={input} value={editing.title} maxLength={80} placeholder="예: 옥상 추격" onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ ...field, flex: '1 1 140px' }}>
                  <label style={lbl}>작중 일자</label>
                  <input style={input} value={editing.day} maxLength={40} placeholder="예: 1일차 / 사건 다음 날" onChange={(e) => setEditing({ ...editing, day: e.target.value })} />
                </div>
                <div style={{ ...field, flex: '1 1 120px' }}>
                  <label style={lbl}>시간대</label>
                  <select style={selS} value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value as TimeKey })}>
                    {TIMES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div style={{ ...field, flex: '1 1 120px' }}>
                  <label style={lbl}>날씨</label>
                  <select style={selS} value={editing.weather} onChange={(e) => setEditing({ ...editing, weather: e.target.value as WxKey })}>
                    {WEATHERS.map((w) => <option key={w.key} value={w.key}>{w.icon} {w.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={field}>
                <label style={lbl}>장소</label>
                <input style={input} value={editing.place} maxLength={80} placeholder="예: 낡은 등대 안" onChange={(e) => setEditing({ ...editing, place: e.target.value })} />
              </div>

              <div style={field}>
                <label style={lbl}>핵심 소품 <span style={{ fontWeight: 400 }}>(쉼표·줄바꿈으로 구분 — 등장/사라짐 추적 단위)</span></label>
                <textarea style={ta} value={editing.props} placeholder="예: 회중시계, 젖은 편지, 권총" onChange={(e) => setEditing({ ...editing, props: e.target.value })} />
              </div>

              {/* 인물 상태 */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>인물 상태 (부상·복장·소지품)</label>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={addChar}>＋ 인물</button>
                </div>
                {editing.chars.length === 0 ? (
                  <div style={{ ...hint, padding: '6px 2px' }}>이 장면에 등장하는 인물의 상태를 추가하면 장면 간 부상·복장 변화를 점검합니다.</div>
                ) : editing.chars.map((c) => (
                  <div key={c.id} style={{ ...card, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...input, flex: 1 }} value={c.name} placeholder="인물 이름" onChange={(e) => updChar(c.id, { name: e.target.value })} />
                      <button className="minibtn" onClick={() => delChar(c.id)} title="이 인물 제거"><Emoji e="🗑️" /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <input style={{ ...input, flex: '1 1 45%' }} value={c.outfit} placeholder="복장" onChange={(e) => updChar(c.id, { outfit: e.target.value })} />
                      <input style={{ ...input, flex: '1 1 45%' }} value={c.injury} placeholder="부상·컨디션" onChange={(e) => updChar(c.id, { injury: e.target.value })} />
                      <input style={{ ...input, flex: '1 1 45%' }} value={c.carry} placeholder="소지품" onChange={(e) => updChar(c.id, { carry: e.target.value })} />
                      <input style={{ ...input, flex: '1 1 45%' }} value={c.note} placeholder="기타(감정·위치 등)" onChange={(e) => updChar(c.id, { note: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={field}>
                <label style={lbl}>장면 메모</label>
                <textarea style={ta} value={editing.notes} placeholder="연속성에 영향을 주는 그 밖의 사실(시간 경과, 이동 경로 등)" onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          ) : opened ? (
            <SceneDetail
              scene={opened}
              index={list.findIndex((s) => s.id === opened.id) + 1}
              total={list.length}
              issues={issuesFor(opened.id)}
              sceneIndexById={(id) => list.findIndex((s) => s.id === id) + 1}
              onEdit={() => startEdit(opened)}
              onMoveUp={() => move(opened.id, -1)}
              onMoveDown={() => move(opened.id, 1)}
              confirmDel={confirmDel === opened.id}
              onAskDel={() => setConfirmDel(opened.id)}
              onCancelDel={() => setConfirmDel(null)}
              onDel={() => remove(opened.id)}
            />
          ) : (
            <div style={{ ...hint, padding: '8px 2px', lineHeight: 1.7 }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}><Emoji e="🧩" /></div>
              <b>연속성 노트</b>는 장면마다 <b>시간 · 장소 · 날씨 · 소품 · 인물 상태</b>를 적어 두는 표입니다.<br />
              장면들을 시간 순서대로 배열하면, 같은 날의 <b>낮↔밤 급변</b>, <b>사라졌다 다시 등장하는 소품</b>,
              설명 없는 <b>부상·복장 변화</b> 등 모순을 자동으로 짚어 드립니다.<br /><br />
              왼쪽에서 장면을 고르거나 <b>＋ 장면 추가</b>로 시작하세요.
              {showIssues && issues.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}><Emoji e="⚠️" /> 전체 연속성 점검 ({issues.length}건)</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {issues.map((it, k) => {
                      const a = list.findIndex((s) => s.id === it.from) + 1
                      const b = list.findIndex((s) => s.id === it.to) + 1
                      return (
                        <li key={k} style={{ fontSize: 12.5, lineHeight: 1.5, color: it.severity === 'warn' ? 'var(--warn)' : 'var(--text)' }}>
                          {it.severity === 'warn' ? <Emoji e="🔴" /> : <Emoji e="🟡" />} [{a}→{b}] {emojify(it.text)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '0 12px 6px' }}>{note}</div>}
      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', padding: '0 12px 6px' }}>✓ {toast}</div>}

      {/* 연계: 프로젝트 연동 */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={list.length === 0 || !hasProjectBridge()}
          title={hasProjectBridge() ? '연속성 표와 점검 결과를 프로젝트 자료 "연속성" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <span style={hint}>좌측 바인더 파일을 끌어다 놓으면 새 장면 시드로 채워집니다.</span>
      </div>
    </div>
  )
}

// ---------- 장면 상세 보기 ----------
function SceneDetail(props: {
  scene: Scene
  index: number
  total: number
  issues: Issue[]
  sceneIndexById: (id: string) => number
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  confirmDel: boolean
  onAskDel: () => void
  onCancelDel: () => void
  onDel: () => void
}) {
  const { scene: s, index, total, issues, sceneIndexById } = props
  const t = timeDef(s.time); const w = wxDef(s.weather)
  const lblS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700 }
  const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 12.5 }
  const sec: React.CSSProperties = { marginTop: 14 }
  const props2 = tokenize(s.props)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, flex: 1, minWidth: 0 }}>{index}. {s.title.trim() || '제목 없는 장면'}</h3>
        <button className="minibtn" onClick={props.onMoveUp} disabled={index <= 1} title="위로">▲</button>
        <button className="minibtn" onClick={props.onMoveDown} disabled={index >= total} title="아래로">▼</button>
        <button className="minibtn" onClick={props.onEdit}><Emoji e="✏️" /> 수정</button>
        {props.confirmDel ? (
          <>
            <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={props.onDel}>삭제 확인</button>
            <button className="minibtn" onClick={props.onCancelDel}>취소</button>
          </>
        ) : (
          <button className="minibtn" onClick={props.onAskDel} title="삭제"><Emoji e="🗑️" /></button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {s.day.trim() && <span style={chip}><Emoji e="📅" /> {s.day.trim()}</span>}
        {s.time !== 'unset' && <span style={chip}><Emoji e={t.icon} /> {t.label}</span>}
        {s.place.trim() && <span style={chip}><Emoji e="📍" /> {s.place.trim()}</span>}
        {s.weather !== 'unset' && <span style={chip}><Emoji e={w.icon} /> {w.label}</span>}
        {!s.day.trim() && s.time === 'unset' && !s.place.trim() && s.weather === 'unset' && (
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>시간·장소·날씨 정보가 비어 있습니다.</span>
        )}
      </div>

      {props2.length > 0 && (
        <div style={sec}>
          <div style={lblS}><Emoji e="🎒" /> 핵심 소품</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {props2.map((p, i) => <span key={i} style={chip}>{emojify(p)}</span>)}
          </div>
        </div>
      )}

      {s.chars.length > 0 && (
        <div style={sec}>
          <div style={lblS}><Emoji e="👥" /> 인물 상태</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {s.chars.map((c) => (
              <div key={c.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{emojify(c.name.trim() || '이름 없음')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
                  {emojify([
                    c.outfit.trim() && `복장: ${c.outfit.trim()}`,
                    c.injury.trim() && `상태: ${c.injury.trim()}`,
                    c.carry.trim() && `소지: ${c.carry.trim()}`,
                    c.note.trim(),
                  ].filter(Boolean).join(' · ') || '상세 미입력')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.notes.trim() && (
        <div style={sec}>
          <div style={lblS}><Emoji e="🗒️" /> 메모</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{emojify(s.notes.trim())}</div>
        </div>
      )}

      <div style={{ ...sec, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ ...lblS, color: issues.length ? 'var(--warn)' : 'var(--ok)' }}>
          {issues.length ? <><Emoji e="⚠️" /> {`이 장면 관련 연속성 점검 (${issues.length}건)`}</> : <><Emoji e="✅" /> 이 장면에서 발견된 모순 없음</>}
        </div>
        {issues.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {issues.map((it, k) => {
              const a = sceneIndexById(it.from); const b = sceneIndexById(it.to)
              return (
                <li key={k} style={{ fontSize: 12.5, lineHeight: 1.5, color: it.severity === 'warn' ? 'var(--warn)' : 'var(--text)' }}>
                  {it.severity === 'warn' ? <Emoji e="🔴" /> : <Emoji e="🟡" />} [{a}→{b}] {emojify(it.text)}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
