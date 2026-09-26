// 인물 목표 위계 트리 — 한 인물의 욕망을 네 층위로 위계화한다.
//   초목표(평생, super-objective) → 장기목표 → 단기목표 → 장면목표(이 장면에서 무엇을 원하는가).
// 작법 원리: 모든 하위 목표는 상위 목표를 섬긴다(스타니슬랍스키 '관통선'). 장면마다 인물이 무엇을
//   원하는지 명확하면 행동에 동기가 생기고, 그 장면 목표가 단기→장기→초목표로 어떻게 이어지는지
//   '목표 사슬'로 검증할 수 있다. 각 목표에는 동기(왜)·장애(막는 것)·결과(이루면/실패하면)를 단다.
//  · 인물별 트리(인물 라이브러리 연계 + 좌측 바인더 인물 카드 드롭으로 추가).
//  · 계층 CRUD: 층위에 맞춰 자식/형제 추가, 인라인 편집, 위/아래 이동, 접기/펼치기, 삭제.
//  · 선택한 장면목표의 '관통선'(장면→단기→장기→초목표)을 한눈에 표시.
//  · 전부 로컬(localStorage 'sry:tool:character-goal-tree'). 외부 네트워크/미디어 없음.
// 자급식: react·linkbus 외 import 없음. 제어문자 없음('/'·'|'만 사용). 언마운트 정리.
// 연계(linkbus): 인물 라이브러리에서 인물 추가 · 좌측 바인더 인물 카드 드롭 · 인물 목표 트리를
//   프로젝트 자료〈인물 목표〉 문서로 추가 · 목표 사슬 텍스트 복사.
import { useState, useEffect, useRef } from 'react'
import {
  useLibraryList, addToProject, hasProjectBridge,
  getDragItem, isItemDrag, type SharedCharacter, Emoji,
} from './linkbus'

export const meta = {
  id: 'character-goal-tree',
  name: '인물 목표 위계 트리',
  icon: '🎯',
  group: '구상·정리',
  intro: '초목표(평생)→장기→단기→장면 목표로 욕망을 위계화해 장면마다 무엇을 원하는지 명확히',
  w: 940, h: 720,
}

const LS_KEY = 'sry:tool:character-goal-tree'

// ── 층위 정의 ────────────────────────────────────────────────
// 0 초목표 → 1 장기 → 2 단기 → 3 장면. 자식은 부모보다 한 단계 아래 층위.
type Tier = 0 | 1 | 2 | 3
interface TierDef { tier: Tier; label: string; icon: string; color: string; hint: string }
const TIERS: TierDef[] = [
  { tier: 0, label: '초목표', icon: '👑', color: '#9c5bd6', hint: '평생을 관통하는 단 하나의 욕망 (예: 아버지에게 인정받는 사람이 되기)' },
  { tier: 1, label: '장기목표', icon: '🏔️', color: '#5b86e0', hint: '이번 이야기 전체에서 이루려는 것 (몇 개월~몇 년)' },
  { tier: 2, label: '단기목표', icon: '🎒', color: '#0f9d58', hint: '장(chapter)·시퀀스 단위에서 이루려는 것 (며칠~몇 주)' },
  { tier: 3, label: '장면목표', icon: '🎬', color: '#e08a3c', hint: '이 장면에서 당장 원하는 것 — 상대에게서 무엇을 얻어내려는가' },
]
function tierDef(t: number): TierDef { return TIERS[Math.max(0, Math.min(3, t))] }

// ── 도메인 모델 ───────────────────────────────────────────────
interface Goal {
  id: string
  tier: Tier
  text: string        // 목표(원하는 것) — 동사형 권장
  why: string         // 동기: 왜 이것을 원하는가
  obstacle: string    // 장애: 무엇이 가로막는가
  stake: string       // 결과: 이루면? 실패하면?
  done: boolean       // 달성 표시(추적용)
  collapsed: boolean
  children: Goal[]
}
interface Person {
  id: string
  name: string
  role: string
  color: string
  fromLib?: string    // 라이브러리 인물 id (중복 추가 방지)
  goals: Goal[]       // 보통 초목표 1개를 루트로 두지만 여러 개 허용
}
interface Doc {
  people: Person[]
  activePersonId: string | null
  selectedGoalId: string | null
}

const PERSON_COLORS = ['#5b86e0', '#db5b3c', '#0f9d58', '#9c5bd6', '#caa53d', '#3aa6b9', '#d6577f', '#7a8a3c', '#c0712f', '#5566aa']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function mkGoal(tier: Tier, text = ''): Goal {
  return { id: newId(), tier, text, why: '', obstacle: '', stake: '', done: false, collapsed: false, children: [] }
}

// ── 저장 정규화(손상 방어) ──────────────────────────────────────
function normGoal(x: unknown): Goal | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const tier = (typeof o.tier === 'number' ? Math.max(0, Math.min(3, Math.round(o.tier))) : 0) as Tier
  const children = Array.isArray(o.children)
    ? (o.children.map((c) => normGoal({ ...(c as object), tier: tier + 1 > 3 ? 3 : tier + 1 })).filter((c): c is Goal => c !== null))
    : []
  return {
    id: String(o.id || newId()),
    tier,
    text: typeof o.text === 'string' ? o.text : '',
    why: typeof o.why === 'string' ? o.why : '',
    obstacle: typeof o.obstacle === 'string' ? o.obstacle : '',
    stake: typeof o.stake === 'string' ? o.stake : '',
    done: !!o.done,
    collapsed: !!o.collapsed,
    children,
  }
}
function normPerson(x: unknown, i: number): Person | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const goals = Array.isArray(o.goals)
    ? o.goals.map((g) => normGoal({ ...(g as object), tier: 0 })).filter((g): g is Goal => g !== null)
    : []
  return {
    id: String(o.id || newId()),
    name: typeof o.name === 'string' && o.name.trim() ? o.name : '이름 없는 인물',
    role: typeof o.role === 'string' ? o.role : '',
    color: typeof o.color === 'string' ? o.color : PERSON_COLORS[i % PERSON_COLORS.length],
    fromLib: typeof o.fromLib === 'string' ? o.fromLib : undefined,
    goals,
  }
}

function load(): Doc {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      if (p && Array.isArray(p.people)) {
        const people = p.people.map(normPerson).filter((x): x is Person => x !== null)
        const activePersonId = typeof p.activePersonId === 'string' && people.some((pp) => pp.id === p.activePersonId)
          ? (p.activePersonId as string)
          : (people[0]?.id ?? null)
        return { people, activePersonId, selectedGoalId: typeof p.selectedGoalId === 'string' ? p.selectedGoalId : null }
      }
    }
  } catch { /* noop */ }
  return { people: [], activePersonId: null, selectedGoalId: null }
}

// ── 불변 트리 헬퍼 ────────────────────────────────────────────
function mapGoal(goals: Goal[], id: string, fn: (g: Goal) => Goal): Goal[] {
  return goals.map((g) => {
    if (g.id === id) return fn(g)
    if (g.children.length) {
      const kids = mapGoal(g.children, id, fn)
      if (kids !== g.children) return { ...g, children: kids }
    }
    return g
  })
}
function removeGoal(goals: Goal[], id: string): { tree: Goal[]; removed: Goal | null } {
  let removed: Goal | null = null
  const walk = (nodes: Goal[]): Goal[] => {
    const out: Goal[] = []
    for (const n of nodes) {
      if (n.id === id) { removed = n; continue }
      if (n.children.length) {
        const kids = walk(n.children)
        out.push(kids === n.children ? n : { ...n, children: kids })
      } else out.push(n)
    }
    return out
  }
  return { tree: walk(goals), removed }
}
function findGoal(goals: Goal[], id: string): Goal | null {
  for (const g of goals) {
    if (g.id === id) return g
    const r = findGoal(g.children, id)
    if (r) return r
  }
  return null
}
// 목표의 부모 배열과 인덱스 — parent=null 이면 루트
function locate(goals: Goal[], id: string): { parent: Goal | null; siblings: Goal[]; index: number } | null {
  const search = (nodes: Goal[], parent: Goal | null): ReturnType<typeof locate> => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent, siblings: nodes, index: i }
      const r = search(nodes[i].children, nodes[i])
      if (r) return r
    }
    return null
  }
  return search(goals, null)
}
// 선택 목표의 관통선(루트 초목표 → ... → 선택 목표)
function pathTo(goals: Goal[], id: string): Goal[] {
  const stack: Goal[] = []
  const dfs = (nodes: Goal[]): boolean => {
    for (const n of nodes) {
      stack.push(n)
      if (n.id === id) return true
      if (dfs(n.children)) return true
      stack.pop()
    }
    return false
  }
  dfs(goals)
  return [...stack]
}
function countAll(goals: Goal[]): number {
  return goals.reduce((a, g) => a + 1 + countAll(g.children), 0)
}
function countDone(goals: Goal[]): number {
  return goals.reduce((a, g) => a + (g.done ? 1 : 0) + countDone(g.children), 0)
}

// ── 텍스트/HTML 직렬화 ────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function goalsToText(goals: Goal[], depth = 0): string {
  let out = ''
  for (const g of goals) {
    const td = tierDef(g.tier)
    out += '  '.repeat(depth) + `${td.icon} [${td.label}] ${g.text || '(미작성)'}${g.done ? ' (달성)' : ''}\n`
    const extra: string[] = []
    if (g.why.trim()) extra.push('동기: ' + g.why.trim())
    if (g.obstacle.trim()) extra.push('장애: ' + g.obstacle.trim())
    if (g.stake.trim()) extra.push('결과: ' + g.stake.trim())
    for (const e of extra) out += '  '.repeat(depth + 1) + '- ' + e + '\n'
    if (g.children.length) out += goalsToText(g.children, depth + 1)
  }
  return out
}
function goalsToHtml(goals: Goal[]): string {
  if (!goals.length) return ''
  let out = '<ul>'
  for (const g of goals) {
    const td = tierDef(g.tier)
    const head = `<strong>[${escHtml(td.label)}]</strong> ${escHtml(g.text || '(미작성)')}${g.done ? ' ✅' : ''}`
    const parts: string[] = []
    if (g.why.trim()) parts.push('동기: ' + escHtml(g.why.trim()))
    if (g.obstacle.trim()) parts.push('장애: ' + escHtml(g.obstacle.trim()))
    if (g.stake.trim()) parts.push('결과: ' + escHtml(g.stake.trim()))
    const detail = parts.length ? '<br><span>' + parts.join(' / ') + '</span>' : ''
    out += '<li>' + head + detail + (g.children.length ? goalsToHtml(g.children) : '') + '</li>'
  }
  out += '</ul>'
  return out
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export default function CharacterGoalTree({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Doc>()
  if (!init.current) init.current = load()

  const [people, setPeople] = useState<Person[]>(init.current.people)
  const [activeId, setActiveId] = useState<string | null>(init.current.activePersonId)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(init.current.selectedGoalId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<keyof Goal | null>(null)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showLib, setShowLib] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newName, setNewName] = useState('')

  const lib = useLibraryList('characters')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const pendingNewId = useRef<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ people, activePersonId: activeId, selectedGoalId }))
    } catch {
      flash('이 브라우저에서 저장이 막혀 새로고침하면 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, activeId, selectedGoalId])

  // payload 로 인물 카드가 들어오면 추가(선택적)
  useEffect(() => {
    const ch = payload?.character as Record<string, unknown> | undefined
    if (ch && typeof ch.name === 'string') addPersonFrom(String(ch.name), typeof ch.role === 'string' ? ch.role : '', undefined, ch.goal ? String(ch.goal) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 편집 시작 시 포커스
  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current
      el.focus()
      try { el.setSelectionRange(el.value.length, el.value.length) } catch { /* noop */ }
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [editingId, editField])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3400)
  }

  const active = people.find((p) => p.id === activeId) || null

  // ── 인물 CRUD ──
  function addPersonFrom(name: string, role: string, fromLib?: string, rootGoalText = ''): string | null {
    if (fromLib && people.some((p) => p.fromLib === fromLib)) {
      const exist = people.find((p) => p.fromLib === fromLib)
      if (exist) { setActiveId(exist.id); flash(`'${exist.name}'은(는) 이미 추가되어 있어요.`) }
      return null
    }
    const id = newId()
    const person: Person = {
      id, name: name.trim() || '이름 없는 인물', role: role.trim(), color: PERSON_COLORS[people.length % PERSON_COLORS.length], fromLib,
      goals: [mkGoal(0, rootGoalText)],
    }
    setPeople((prev) => [...prev, person])
    setActiveId(id)
    setSelectedGoalId(person.goals[0].id)
    return id
  }
  const addBlankPerson = () => {
    const id = addPersonFrom(newName.trim() || '새 인물', '')
    if (id) setNewName('')
  }
  const addFromLib = (c: SharedCharacter) => {
    addPersonFrom(c.name, c.role || '', c.id, c.goal || '')
    setShowLib(false)
  }
  const renamePerson = (id: string, name: string) => setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  const removePerson = (id: string) => {
    const p = people.find((x) => x.id === id)
    if (!p) return
    if (!window.confirm(`'${p.name}'의 목표 트리를 통째로 삭제할까요?`)) return
    setPeople((prev) => {
      const next = prev.filter((x) => x.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  // active 인물의 goals 를 패치
  const patchGoals = (fn: (goals: Goal[]) => Goal[]) => {
    if (!active) return
    setPeople((prev) => prev.map((p) => (p.id === active.id ? { ...p, goals: fn(p.goals) } : p)))
  }

  // ── 목표 CRUD ──
  const beginEdit = (id: string, field: keyof Goal) => {
    if (!active) return
    const g = findGoal(active.goals, id)
    if (!g) return
    setSelectedGoalId(id)
    setEditingId(id)
    setEditField(field)
    setDraft(String(g[field] ?? ''))
  }
  const commitEdit = () => {
    if (!editingId || !editField) return
    const id = editingId, field = editField, text = draft
    if (pendingNewId.current === id && field === 'text' && text.trim() === '') {
      patchGoals((goals) => removeGoal(goals, id).tree)
      if (selectedGoalId === id) setSelectedGoalId(null)
      pendingNewId.current = null
      setEditingId(null); setEditField(null); setDraft('')
      return
    }
    pendingNewId.current = null
    patchGoals((goals) => mapGoal(goals, id, (g) => ({ ...g, [field]: text } as Goal)))
    setEditingId(null); setEditField(null); setDraft('')
  }
  const cancelEdit = () => {
    const id = editingId
    if (id && pendingNewId.current === id && editField === 'text' && draft.trim() === '') {
      patchGoals((goals) => removeGoal(goals, id).tree)
      if (selectedGoalId === id) setSelectedGoalId(null)
    }
    pendingNewId.current = null
    setEditingId(null); setEditField(null); setDraft('')
  }

  // 루트 초목표 추가
  const addRootGoal = () => {
    if (!active) { flash('먼저 인물을 추가하세요.'); return }
    const g = mkGoal(0, '')
    patchGoals((goals) => [...goals, g])
    setSelectedGoalId(g.id)
    setEditingId(g.id); setEditField('text'); setDraft('')
    pendingNewId.current = g.id
  }
  // 자식(한 단계 아래 층위) 추가 — 장면목표(3)는 자식 불가
  const addChild = (parentId: string) => {
    if (!active) return
    const parent = findGoal(active.goals, parentId)
    if (!parent) return
    if (parent.tier >= 3) { flash('장면목표는 가장 아래 층위라 하위 목표를 둘 수 없어요.'); return }
    const childTier = (parent.tier + 1) as Tier
    const g = mkGoal(childTier, '')
    patchGoals((goals) => mapGoal(goals, parentId, (p) => ({ ...p, collapsed: false, children: [...p.children, g] })))
    setSelectedGoalId(g.id)
    setEditingId(g.id); setEditField('text'); setDraft('')
    pendingNewId.current = g.id
  }
  // 형제(같은 층위) 추가
  const addSibling = (id: string) => {
    if (!active) return
    const loc = locate(active.goals, id)
    if (!loc) return
    const cur = loc.siblings[loc.index]
    const g = mkGoal(cur.tier, '')
    if (loc.parent === null) {
      patchGoals((goals) => { const n = [...goals]; n.splice(loc.index + 1, 0, g); return n })
    } else {
      const pid = loc.parent.id
      patchGoals((goals) => mapGoal(goals, pid, (p) => {
        const kids = [...p.children]
        const i = kids.findIndex((c) => c.id === id)
        kids.splice(i + 1, 0, g)
        return { ...p, children: kids }
      }))
    }
    setSelectedGoalId(g.id)
    setEditingId(g.id); setEditField('text'); setDraft('')
    pendingNewId.current = g.id
  }
  const del = (id: string) => {
    if (!active) return
    const g = findGoal(active.goals, id)
    if (!g) return
    const kids = countAll(g.children)
    const label = (g.text || '(미작성)').slice(0, 24)
    const msg = kids > 0 ? `'${label}'과(와) 하위 목표 ${kids}개를 모두 삭제할까요?` : `'${label}' 목표를 삭제할까요?`
    if (!window.confirm(msg)) return
    patchGoals((goals) => removeGoal(goals, id).tree)
    if (selectedGoalId === id) setSelectedGoalId(null)
    if (editingId === id) cancelEdit()
  }
  const toggleCollapse = (id: string) => patchGoals((goals) => mapGoal(goals, id, (g) => ({ ...g, collapsed: !g.collapsed })))
  const toggleDone = (id: string) => patchGoals((goals) => mapGoal(goals, id, (g) => ({ ...g, done: !g.done })))
  const move = (id: string, dir: -1 | 1) => {
    if (!active) return
    const loc = locate(active.goals, id)
    if (!loc) return
    const { parent, index } = loc
    const target = index + dir
    const reorder = (arr: Goal[]): Goal[] => {
      if (target < 0 || target >= arr.length) return arr
      const n = [...arr]
      const [it] = n.splice(index, 1)
      n.splice(target, 0, it)
      return n
    }
    if (parent === null) {
      patchGoals((goals) => { const r = reorder(goals); if (r === goals) flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return r })
    } else {
      const pid = parent.id
      patchGoals((goals) => mapGoal(goals, pid, (p) => {
        const r = reorder(p.children)
        if (r === p.children) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return p }
        return { ...p, children: r }
      }))
    }
  }

  // ── 드롭: 좌측 바인더 인물 카드 ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const role = item.character?.role || (item.type === 'character' ? '인물' : '')
    const goal = item.character?.goal || ''
    addPersonFrom(item.title, role, 'binder:' + item.id, goal)
    flash(`'${item.title}'을(를) 바인더에서 가져왔어요.`)
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  // ── 내보내기 / 연계 ──
  const exportText = active ? goalsToText(active.goals).trimEnd() : ''
  const copyExport = async () => {
    const text = exportText
    if (!text) { flash('내보낼 목표가 없어요.'); return }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
    } catch {
      flash('복사에 실패했어요. 아래 글상자에서 직접 선택해 복사하세요.')
    }
  }
  const toProject = () => {
    if (!active) { flash('먼저 인물을 선택하세요.'); return }
    if (!countAll(active.goals)) { flash('내보낼 목표가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const total = countAll(active.goals)
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물 목표',
      title: `${active.name} — 목표 위계`,
      bodyHtml: `<p><strong>${escHtml(active.name)}</strong>${active.role ? ' (' + escHtml(active.role) + ')' : ''}의 목표 위계</p>` + (goalsToHtml(active.goals) || '<p>(목표 없음)</p>'),
      meta: { 인물: active.name, 역할: active.role || '미정', 목표수: String(total), 달성: `${countDone(active.goals)}/${total}` },
    })
    flash(id ? `'자료 › 인물 목표'에 '${active.name}' 문서를 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 편집 키 처리
  const onEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }
  const onEditInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
    setDraft(el.value)
  }

  const total = active ? countAll(active.goals) : 0
  const done = active ? countDone(active.goals) : 0
  const selPath = active && selectedGoalId ? pathTo(active.goals, selectedGoalId) : []

  // 라이브러리에서 아직 추가 안 된 인물
  const libUnadded = lib.filter((c) => !people.some((p) => p.fromLib === c.id))

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const tabbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const treeCol: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'auto', padding: '8px 8px 16px' }
  const sideCol: React.CSSProperties = { width: 264, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--ok)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, gap: 14, padding: 24 }

  return (
    <div
      style={wrap}
      onDragOver={onDragOver}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={onDrop}
    >
      {/* 인물 탭바 */}
      <div style={tabbar}>
        {people.map((p) => (
          <button
            key={p.id}
            className={'minibtn' + (p.id === activeId ? ' active' : '')}
            onClick={() => { setActiveId(p.id); setSelectedGoalId(null) }}
            title={p.role ? `${p.name} / ${p.role}` : p.name}
            style={{ borderLeft: `4px solid ${p.color}`, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >{p.name}{p.role ? ` · ${p.role}` : ''}</button>
        ))}
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: people.length ? 6 : 0 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addBlankPerson() }}
            placeholder="새 인물 이름"
            style={{ width: 100, fontSize: 12, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--paper)', color: 'var(--text)' }}
          />
          <button className="minibtn" onClick={addBlankPerson} title="새 인물 추가">＋ 인물</button>
        </span>
        <button className="minibtn" onClick={() => setShowLib((v) => !v)} title="인물 라이브러리에서 가져오기"><Emoji e="📚"/> 라이브러리</button>
        {active && <button className="minibtn" onClick={() => removePerson(active.id)} title="현재 인물 삭제" style={{ marginLeft: 'auto', color: 'var(--warn)' }}><Emoji e="🗑️"/> 인물 삭제</button>}
      </div>

      {/* 라이브러리 픽 패널 */}
      {showLib && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--paper)', maxHeight: 160, overflow: 'auto' }}>
          {libUnadded.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>가져올 인물이 없습니다. 캐릭터 생성기·인물 시트 등에서 인물을 라이브러리에 저장하면 여기에 나타나요.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {libUnadded.map((c) => (
                <button key={c.id} className="linkbtn" onClick={() => addFromLib(c)} title={c.role || ''}>＋ {c.name}{c.role ? ` (${c.role})` : ''}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {note && <div style={noteBar}>{note}</div>}

      {!active ? (
        <div style={empty}>
          <div style={{ fontSize: 44 }}><Emoji e="🎯"/></div>
          <div>
            아직 인물이 없어요.<br />
            위의 <strong>＋ 인물</strong>으로 시작하거나, <strong><Emoji e="📚"/> 라이브러리</strong>에서 가져오세요.<br />
            <span style={{ fontSize: 12 }}>좌측 바인더의 인물 카드를 이 창으로 끌어다 놓아도 됩니다.</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 460, lineHeight: 1.9, textAlign: 'left', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            {TIERS.map((t) => (
              <div key={t.tier}><span style={{ color: t.color }}><Emoji e={t.icon}/> {t.label}</span> — {t.hint}</div>
            ))}
          </div>
        </div>
      ) : (
        <div style={body}>
          {/* 트리 */}
          <div style={treeCol}>
            {active.goals.length === 0 ? (
              <div style={empty}>
                <div style={{ fontSize: 34 }}><Emoji e="👑"/></div>
                <div><strong>{active.name}</strong>의 초목표부터 세워볼까요?<br />평생을 관통하는 단 하나의 욕망입니다.</div>
                <button className="btn-primary" onClick={addRootGoal}>＋ 초목표 만들기</button>
              </div>
            ) : (
              <>
                {active.goals.map((g, i) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    index={i}
                    count={active.goals.length}
                    selectedId={selectedGoalId}
                    editingId={editingId}
                    editField={editField}
                    draft={draft}
                    editRef={editRef}
                    onSelect={(id) => { setSelectedGoalId(id); if (editingId && editingId !== id) commitEdit() }}
                    onBeginEdit={beginEdit}
                    onCommit={commitEdit}
                    onEditKey={onEditKey}
                    onEditInput={onEditInput}
                    onToggle={toggleCollapse}
                    onToggleDone={toggleDone}
                    onMove={move}
                    onAddChild={addChild}
                    onAddSibling={addSibling}
                    onDelete={del}
                  />
                ))}
                <button className="minibtn" onClick={addRootGoal} style={{ marginTop: 8 }}>＋ 초목표 추가</button>
              </>
            )}
          </div>

          {/* 사이드: 관통선 + 안내 */}
          <div style={sideCol}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}><Emoji e="🧵"/> 관통선 (목표 사슬)</div>
            {selPath.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {selPath.map((g, i) => {
                  const td = tierDef(g.tier)
                  return (
                    <div key={g.id}>
                      {i > 0 && <div style={{ height: 12, width: 1, background: 'var(--border)', marginLeft: 11 }} />}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 8, border: `1px solid ${g.id === selectedGoalId ? td.color : 'var(--border)'}`, background: g.id === selectedGoalId ? 'color-mix(in srgb, ' + td.color + ' 14%, transparent)' : 'var(--paper)' }}>
                        <span title={td.label} style={{ flexShrink: 0 }}><Emoji e={td.icon}/></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: td.color, fontWeight: 700 }}>{td.label}</div>
                          <div style={{ fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>{g.text || <span style={{ color: 'var(--muted)' }}>(미작성)</span>}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                  맨 아래 목표가 위의 모든 상위 목표를 섬기는지 점검하세요. 장면목표는 결국 초목표로 이어져야 합니다.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                목표를 선택하면 그 목표가 상위 목표로 어떻게 이어지는지 사슬로 보여줍니다.
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
              {TIERS.map((t) => (
                <div key={t.tier}><span style={{ color: t.color, fontWeight: 700 }}><Emoji e={t.icon}/> {t.label}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 내보내기 패널 */}
      {showExport && active && total > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '40%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 13 }}>{active.name} — 목표 사슬 텍스트</strong>
            <div style={{ flex: 1 }} />
            <button className="btn-primary" onClick={copyExport}>{copied ? '복사됨 ✓' : '복사'}</button>
            <button className="minibtn" onClick={() => setShowExport(false)}>닫기</button>
          </div>
          <textarea
            value={exportText}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            aria-label="목표 사슬 텍스트"
            style={{ flex: 1, minHeight: 120, resize: 'none', width: '100%', boxSizing: 'border-box', padding: 10, fontSize: 12.5, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre', overflow: 'auto' }}
          />
        </div>
      )}

      {/* 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!active || !total || !hasProjectBridge()} title={hasProjectBridge() ? '현재 인물의 목표 위계를 프로젝트 자료〈인물 목표〉에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={() => setShowExport((v) => !v)} disabled={!active || !total}><Emoji e="📋"/> 목표 사슬 복사</button>
      </div>

      {/* 푸터 통계 */}
      <div style={footer}>
        {active ? (
          <span>인물 <strong style={{ color: 'var(--text)' }}>{people.length}</strong> · {active.name} 목표 <strong style={{ color: 'var(--text)' }}>{total}</strong> (달성 <strong style={{ color: 'var(--ok)' }}>{done}</strong>)</span>
        ) : (
          <span>인물을 추가해 목표 위계를 세우세요.</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11 }}>드롭으로 바인더 인물 추가 가능</span>
      </div>
    </div>
  )
}

// ── 목표 행(재귀) ─────────────────────────────────────────────
interface RowProps {
  goal: Goal
  index: number
  count: number
  selectedId: string | null
  editingId: string | null
  editField: keyof Goal | null
  draft: string
  editRef: React.RefObject<HTMLTextAreaElement>
  onSelect: (id: string) => void
  onBeginEdit: (id: string, field: keyof Goal) => void
  onCommit: () => void
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onEditInput: (e: React.FormEvent<HTMLTextAreaElement>) => void
  onToggle: (id: string) => void
  onToggleDone: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onAddChild: (id: string) => void
  onAddSibling: (id: string) => void
  onDelete: (id: string) => void
}

const FIELD_META: { key: keyof Goal; label: string; icon: string; ph: string }[] = [
  { key: 'why', label: '동기', icon: '💡', ph: '왜 이것을 원하는가 (동기)' },
  { key: 'obstacle', label: '장애', icon: '🧱', ph: '무엇이 가로막는가 (장애·갈등)' },
  { key: 'stake', label: '결과', icon: '⚖️', ph: '이루면? 실패하면? (걸린 것)' },
]

function GoalRow(props: RowProps) {
  const { goal, index, count, selectedId, editingId, editField, draft } = props
  const selected = selectedId === goal.id
  const editing = editingId === goal.id
  const hasKids = goal.children.length > 0
  const td = tierDef(goal.tier)
  const [hover, setHover] = useState(false)
  const indentPx = 8 + goal.tier * 22

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 4, padding: '6px 8px 6px 0', paddingLeft: indentPx,
    borderRadius: 8, marginBottom: 2,
    background: selected ? 'color-mix(in srgb, ' + td.color + ' 15%, transparent)' : hover ? 'var(--chrome-2)' : 'transparent',
    border: selected ? `1px solid ${td.color}` : '1px solid transparent', cursor: 'default', transition: 'background 0.12s',
  }
  const caret: React.CSSProperties = {
    flexShrink: 0, width: 16, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: hasKids ? 'pointer' : 'default', color: 'var(--muted)', fontSize: 10, userSelect: 'none',
    transform: goal.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.12s',
  }
  const badge: React.CSSProperties = {
    flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff', background: td.color, borderRadius: 5,
    padding: '1px 6px', height: 18, lineHeight: '16px', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2,
  }
  const labelText: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, padding: '2px 2px', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
    color: goal.text ? 'var(--text)' : 'var(--muted)', fontStyle: goal.text ? 'normal' : 'italic',
    textDecoration: goal.done ? 'line-through' : 'none', opacity: goal.done ? 0.7 : 1,
  }
  const editBox: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, padding: '2px 6px', resize: 'none', overflow: 'hidden',
    border: `1px solid ${td.color}`, borderRadius: 6, background: 'var(--paper)', color: 'var(--text)', font: 'inherit', boxSizing: 'border-box',
  }
  const actions: React.CSSProperties = { flexShrink: 0, display: 'flex', gap: 1, alignItems: 'center', opacity: hover || selected ? 1 : 0, transition: 'opacity 0.12s' }
  const act: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 4px', borderRadius: 5 }

  const editingThisText = editing && editField === 'text'
  const hasDetail = goal.why.trim() || goal.obstacle.trim() || goal.stake.trim()

  return (
    <div>
      <div
        style={rowStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => props.onSelect(goal.id)}
        role="treeitem"
        aria-expanded={hasKids ? !goal.collapsed : undefined}
        aria-selected={selected}
      >
        <span
          style={caret}
          onClick={(e) => { e.stopPropagation(); if (hasKids) props.onToggle(goal.id) }}
          title={hasKids ? (goal.collapsed ? '펼치기' : '접기') : ''}
        >{hasKids ? '▶' : ''}</span>
        <span style={badge} title={td.hint}><Emoji e={td.icon}/>{td.label}</span>

        {editingThisText ? (
          <textarea
            ref={props.editRef}
            style={editBox}
            value={draft}
            rows={1}
            onChange={props.onEditInput}
            onInput={props.onEditInput}
            onKeyDown={props.onEditKey}
            onBlur={props.onCommit}
            onClick={(e) => e.stopPropagation()}
            placeholder={`이 ${td.label}에서 원하는 것 (Enter 저장 · Esc 취소)`}
            aria-label="목표 편집"
          />
        ) : (
          <span style={labelText} onDoubleClick={(e) => { e.stopPropagation(); props.onBeginEdit(goal.id, 'text') }} title="더블클릭하여 편집">
            {goal.text || '(목표 미작성 — 더블클릭하여 입력)'}
          </span>
        )}

        {!editing && (
          <span style={actions} onClick={(e) => e.stopPropagation()}>
            <button style={{ ...act, color: goal.done ? 'var(--ok)' : 'var(--muted)' }} title={goal.done ? '달성 해제' : '달성 표시'} onClick={() => props.onToggleDone(goal.id)}>{goal.done ? <Emoji e="✅"/> : <Emoji e="⬜"/>}</button>
            <button style={act} title="편집" onClick={() => props.onBeginEdit(goal.id, 'text')}><Emoji e="✏️"/></button>
            {goal.tier < 3 && <button style={act} title={`하위 ${tierDef((goal.tier + 1)).label} 추가`} onClick={() => props.onAddChild(goal.id)}>↳</button>}
            <button style={act} title={`형제 ${td.label} 추가`} onClick={() => props.onAddSibling(goal.id)}>＋</button>
            <button style={act} title="위로" onClick={() => props.onMove(goal.id, -1)} disabled={index === 0}>↑</button>
            <button style={act} title="아래로" onClick={() => props.onMove(goal.id, 1)} disabled={index === count - 1}>↓</button>
            <button style={act} title="삭제" onClick={() => props.onDelete(goal.id)}><Emoji e="🗑️"/></button>
          </span>
        )}
      </div>

      {/* 동기/장애/결과 (선택 시 또는 내용이 있을 때) */}
      {!goal.collapsed && (selected || hasDetail) && (
        <div style={{ paddingLeft: indentPx + 22, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FIELD_META.map((f) => {
            const val = String(goal[f.key] ?? '')
            const isEditing = editing && editField === f.key
            if (!selected && !val.trim()) return null
            return (
              <div key={f.key} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', fontSize: 11.5 }}>
                <span style={{ flexShrink: 0, color: 'var(--muted)', width: 40 }} title={f.label}><Emoji e={f.icon}/>{f.label}</span>
                {isEditing ? (
                  <textarea
                    ref={props.editRef}
                    value={draft}
                    rows={1}
                    onChange={props.onEditInput}
                    onInput={props.onEditInput}
                    onKeyDown={props.onEditKey}
                    onBlur={props.onCommit}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={f.ph}
                    aria-label={f.label + ' 편집'}
                    style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.5, padding: '2px 6px', resize: 'none', overflow: 'hidden', border: '1px solid var(--accent)', borderRadius: 5, background: 'var(--paper)', color: 'var(--text)', font: 'inherit', boxSizing: 'border-box' }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, minWidth: 0, lineHeight: 1.5, wordBreak: 'break-word', color: val.trim() ? 'var(--text)' : 'var(--muted)', cursor: 'text' }}
                    onClick={(e) => { e.stopPropagation(); props.onBeginEdit(goal.id, f.key) }}
                    title="클릭하여 편집"
                  >{val.trim() || <span style={{ fontStyle: 'italic' }}>{f.ph}</span>}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasKids && !goal.collapsed && (
        <div>
          {goal.children.map((c, i) => (
            <GoalRow {...props} key={c.id} goal={c} index={i} count={goal.children.length} />
          ))}
        </div>
      )}
    </div>
  )
}
