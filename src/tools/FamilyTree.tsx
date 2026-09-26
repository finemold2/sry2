// 가계도 — 인물 노드(이름·성별·생몰·메모)와 관계(부모-자식·배우자·형제)를 연결해 가계를 구성한다.
// 부모-자식 관계로부터 세대(레벨)를 자동 계산해 세대별로 배치한 SVG 트리(부모↘자식 곡선, 배우자=가로선, 형제=점선)를 그린다.
// useLibraryList("characters") 로 공유 라이브러리 인물을 노드로 불러오고, payload.character 로 받은 인물도 추가한다.
// addToProject(folder:"인물") 로 세대·관계를 정리한 계보 본문을 프로젝트 바인더(자료 › 인물)에 추가한다.
// 모든 인물·관계·배치는 localStorage('sry:tool:family-tree') 에 자동 저장/복원. 추가/수정/삭제/순서 완비, 빈 상태 안내.
// import 는 react 와 './linkbus' 만. 외부 네트워크 불필요(저작권 안전). localStorage 차단 시 graceful 처리. 언마운트 정리.
import { useEffect, useRef, useState } from 'react'
import { useLibraryList, openToolLinked, addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'family-tree', name: '가계도', icon: '🌳', group: '구상·정리', intro: '인물과 부모·배우자·형제 관계로 세대별 가계도를 그리세요', w: 760, h: 620 }

const LS_KEY = 'sry:tool:family-tree'

// 성별 — 노드 색으로 구분.
type Sex = 'm' | 'f' | 'x'
const SEX_META: Record<Sex, { label: string; color: string }> = {
  m: { label: '남', color: '#3d7fd6' },
  f: { label: '여', color: '#e0518b' },
  x: { label: '기타', color: '#8a5cd6' },
}

// 관계 유형. parent: a가 b의 부모. spouse/sibling: 무방향(정렬해 중복 방지).
type RelKind = 'parent' | 'spouse' | 'sibling'
const REL_META: Record<RelKind, { label: string; color: string }> = {
  parent: { label: '부모→자식', color: '#3fa35a' },
  spouse: { label: '배우자', color: '#e0992b' },
  sibling: { label: '형제', color: '#7a8493' },
}

interface PersonT { id: string; name: string; sex: Sex; life: string; note: string }
interface RelT { id: string; kind: RelKind; a: string; b: string } // parent: a=부모, b=자식
interface Store { people: PersonT[]; rels: RelT[] }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { people: [], rels: [] }
    const p = JSON.parse(raw)
    const people: PersonT[] = Array.isArray(p?.people)
      ? p.people.filter((n: any) => n && typeof n.name === 'string').map((n: any) => ({
          id: String(n.id || newId()),
          name: String(n.name).slice(0, 40),
          sex: (n.sex === 'm' || n.sex === 'f' || n.sex === 'x') ? n.sex : 'x',
          life: String(n.life || '').slice(0, 40),
          note: String(n.note || '').slice(0, 300),
        }))
      : []
    const ids = new Set(people.map((n) => n.id))
    const seen = new Set<string>()
    const rels: RelT[] = Array.isArray(p?.rels)
      ? p.rels.filter((e: any) => e && ids.has(String(e.a)) && ids.has(String(e.b)) && String(e.a) !== String(e.b))
          .map((e: any): RelT | null => {
            const kind: RelKind = (e.kind === 'parent' || e.kind === 'spouse' || e.kind === 'sibling') ? e.kind : 'sibling'
            let a = String(e.a), b = String(e.b)
            // 무방향 관계는 정렬해 중복키 생성
            if (kind !== 'parent' && a > b) { const t = a; a = b; b = t }
            const key = kind + ':' + a + ':' + b
            if (seen.has(key)) return null
            seen.add(key)
            return { id: String(e.id || newId()), kind, a, b }
          })
          .filter(Boolean) as RelT[]
      : []
    return { people, rels }
  } catch {
    return { people: [], rels: [] }
  }
}

// 공유 인물 → 노드 메모 한 줄 요약(역할·성격·목표 등에서 추림). 외부 이미지/사진은 쓰지 않는다(저작권 안전).
function summarizeChar(c: Partial<SharedCharacter>): string {
  const parts: string[] = []
  if (c.role && c.role.trim()) parts.push(c.role.trim())
  if (c.personality && c.personality.trim()) parts.push(c.personality.trim())
  else if (c.goal && c.goal.trim()) parts.push('목표: ' + c.goal.trim())
  else if (c.appearance && c.appearance.trim()) parts.push(c.appearance.trim())
  else if (c.notes && c.notes.trim()) parts.push(c.notes.trim())
  return parts.join(' · ').slice(0, 300)
}

// ===== 세대(레벨) 계산 =====
// 부모-자식 관계로 위상(레벨)을 정한다: 자식 레벨 ≥ 부모 레벨 + 1. 배우자/형제는 같은 레벨로 맞춘다.
// 사이클(잘못된 입력)에도 무한루프 없이 안전하게 수렴(반복 횟수 상한).
function computeLevels(people: PersonT[], rels: RelT[]): Map<string, number> {
  const level = new Map<string, number>()
  people.forEach((p) => level.set(p.id, 0))
  const parentRels = rels.filter((r) => r.kind === 'parent')
  const peerRels = rels.filter((r) => r.kind !== 'parent')
  const cap = people.length + 2
  for (let i = 0; i < cap; i++) {
    let changed = false
    // 자식은 부모보다 최소 한 단계 아래
    for (const r of parentRels) {
      const want = (level.get(r.a) ?? 0) + 1
      if ((level.get(r.b) ?? 0) < want) { level.set(r.b, want); changed = true }
    }
    // 배우자·형제는 둘 중 큰 레벨로 통일
    for (const r of peerRels) {
      const la = level.get(r.a) ?? 0, lb = level.get(r.b) ?? 0
      const m = Math.max(la, lb)
      if (la < m) { level.set(r.a, m); changed = true }
      if (lb < m) { level.set(r.b, m); changed = true }
    }
    if (!changed) break
  }
  // 레벨을 0부터 연속되게 정규화(빈 레벨 압축은 하지 않고 최소값만 0으로)
  let min = Infinity
  level.forEach((v) => { if (v < min) min = v })
  if (Number.isFinite(min) && min !== 0) level.forEach((v, k) => level.set(k, v - min))
  return level
}

interface FamilyTreeProps { payload?: Record<string, unknown> }

export default function FamilyTree({ payload }: FamilyTreeProps) {
  const initial = useRef<Store>(loadStore())
  const [people, setPeople] = useState<PersonT[]>(initial.current.people)
  const [rels, setRels] = useState<RelT[]>(initial.current.rels)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false) // 바인더 파일 드래그 진입 시 시각 피드백

  const libChars = useLibraryList('characters')

  // 추가 폼
  const [draftName, setDraftName] = useState('')
  const [draftSex, setDraftSex] = useState<Sex>('x')

  // 선택/편집
  const [selId, setSelId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSex, setEditSex] = useState<Sex>('x')
  const [editLife, setEditLife] = useState('')
  const [editNote, setEditNote] = useState('')

  // 관계 추가 폼
  const [relKind, setRelKind] = useState<RelKind>('parent')
  const [relA, setRelA] = useState('')
  const [relB, setRelB] = useState('')

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ people, rels }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [people, rels])

  // ===== 인물 추가 공용 헬퍼(직접 입력/라이브러리/페이로드 공유) =====
  // 같은 이름이 이미 있으면 건너뛰어 중복을 막고, 추가한 id 를 반환(없으면 null).
  const addNamedPerson = (rawName: string, sex: Sex = 'x', rawNote = ''): string | null => {
    const name = rawName.trim().slice(0, 40)
    if (!name) return null
    let createdId: string | null = null
    setPeople((prev) => {
      if (prev.some((n) => n.name.trim() === name.trim())) return prev
      const n: PersonT = { id: newId(), name, sex, life: '', note: rawNote.slice(0, 300) }
      createdId = n.id
      return [...prev, n]
    })
    return createdId
  }

  // ===== [연계] payload.character → 노드 =====
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const raw = (payload as Record<string, unknown>).character
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    let added = 0
    for (const c of list) {
      if (!c || typeof c !== 'object') continue
      const nm = typeof c.name === 'string' ? c.name : ''
      if (!nm.trim()) continue
      if (addNamedPerson(nm, 'x', summarizeChar(c as Partial<SharedCharacter>))) added++
    }
    if (mounted.current) {
      if (added > 0) setNote(`인물 ${added}명을 가계도에 추가했어요.`)
      else if (list.length) setNote('받은 인물이 이미 모두 추가되어 있어요.')
    }
  }, [payload]) // eslint-disable-line

  // ===== [연계] 공유 라이브러리 인물 전체 불러오기 =====
  const importLibraryChars = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 저장된 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    const existing = new Set(people.map((n) => n.name.trim()))
    let added = 0
    for (const c of libChars) {
      const nm = (c.name || '').trim()
      if (!nm || existing.has(nm)) continue
      existing.add(nm)
      if (addNamedPerson(nm, 'x', summarizeChar(c))) added++
    }
    setNote(added > 0 ? `라이브러리 인물 ${added}명을 불러왔어요.` : '라이브러리 인물이 이미 모두 가계도에 있어요.')
  }

  // ===== [연계] 바인더 파일 드롭 → 새 인물 노드 =====
  // character 가 있으면 인물 카드로 보고 name·요약 메모를 쓰고, 없으면 일반 문서(title·text)를 활용한다.
  const handleDrop = (e: React.DragEvent) => {
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    setDragOver(false)
    const c = it.character
    const name = (c?.name && c.name.trim()) ? c.name : it.title
    if (!name || !name.trim()) { setNote('이름이 없는 파일이라 인물로 추가할 수 없어요.'); return }
    const memo = c
      ? summarizeChar(c as Partial<SharedCharacter>)
      : (it.text || '').trim().slice(0, 300)
    const id = addNamedPerson(name, 'x', memo)
    if (id) { setSelId(id); setNote(`'${name.trim().slice(0, 40)}'을(를) 가계도에 추가했어요.`) }
    else setNote('같은 이름의 인물이 이미 있어요.')
  }

  // 선택 인물 동기화
  const selObj = people.find((n) => n.id === selId) || null
  useEffect(() => {
    if (selObj) { setEditName(selObj.name); setEditSex(selObj.sex); setEditLife(selObj.life); setEditNote(selObj.note) }
  }, [selId]) // eslint-disable-line

  // ===== 인물 CRUD =====
  const addPerson = () => {
    const id = addNamedPerson(draftName, draftSex)
    if (id) { setDraftName(''); setDraftSex('x'); setSelId(id); setNote('') }
    else if (draftName.trim()) setNote('같은 이름의 인물이 이미 있어요.')
  }
  const savePersonEdit = () => {
    if (!selId) return
    const nm = editName.trim()
    if (!nm) { setNote('이름은 비울 수 없어요.'); return }
    setPeople((prev) => prev.map((n) => (n.id === selId ? { ...n, name: nm.slice(0, 40), sex: editSex, life: editLife.slice(0, 40), note: editNote.slice(0, 300) } : n)))
    setNote('')
  }
  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((n) => n.id !== id))
    setRels((prev) => prev.filter((e) => e.a !== id && e.b !== id))
    if (selId === id) setSelId(null)
    setRelA((v) => (v === id ? '' : v)); setRelB((v) => (v === id ? '' : v))
  }
  // 목록 순서 변경(▲▼) — 같은 레벨 내 좌우 배치에 영향을 준다.
  const movePerson = (id: string, dir: -1 | 1) => {
    setPeople((prev) => {
      const i = prev.findIndex((n) => n.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // ===== 관계 CRUD =====
  const addRel = () => {
    if (!relA || !relB) { setNote('두 인물을 모두 고르세요.'); return }
    if (relA === relB) { setNote('서로 다른 인물을 골라야 해요.'); return }
    let a = relA, b = relB
    if (relKind !== 'parent' && a > b) { const t = a; a = b; b = t }
    const exists = rels.some((e) => e.kind === relKind && e.a === a && e.b === b)
    if (exists) { setNote('이미 같은 관계가 있어요.'); return }
    // 부모 관계 사이클(서로가 서로의 부모) 방지
    if (relKind === 'parent' && wouldCycle(a, b)) { setNote('이 부모-자식 관계는 가계에 순환을 만들어요. 방향을 확인하세요.'); return }
    setRels((prev) => [...prev, { id: newId(), kind: relKind, a, b }])
    setNote('')
  }
  // a를 b의 부모로 두면 사이클이 생기는가? (b가 이미 a의 조상이면 사이클)
  const wouldCycle = (parent: string, child: string): boolean => {
    if (parent === child) return true
    // child 의 모든 조상을 거슬러 올라가며 parent 가 그 안에 있는지 확인
    const stack = [child]
    const seen = new Set<string>()
    while (stack.length) {
      const cur = stack.pop() as string
      if (cur === parent) return true
      if (seen.has(cur)) continue
      seen.add(cur)
      rels.filter((r) => r.kind === 'parent' && r.b === cur).forEach((r) => stack.push(r.a))
    }
    return false
  }
  const removeRel = (id: string) => setRels((prev) => prev.filter((e) => e.id !== id))

  const clearAll = () => {
    if (!people.length && !rels.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 인물과 관계를 지울까요? 되돌릴 수 없습니다.')) return
    setPeople([]); setRels([]); setSelId(null); setRelA(''); setRelB(''); setNote('')
  }

  const nameOf = (id: string) => people.find((n) => n.id === id)?.name || '?'

  // ===== 세대별 레이아웃 =====
  const levels = computeLevels(people, rels)
  // 레벨별로 그룹화하되, people 배열 순서(사용자 정렬)를 유지해 좌우 배치를 안정화.
  const byLevel = new Map<number, PersonT[]>()
  people.forEach((p) => {
    const lv = levels.get(p.id) ?? 0
    const arr = byLevel.get(lv) || []
    arr.push(p)
    byLevel.set(lv, arr)
  })
  const levelKeys = [...byLevel.keys()].sort((a, b) => a - b)

  const NODE_W = 96, NODE_H = 46, GAP_X = 36, GAP_Y = 96, PAD = 32
  const pos = new Map<string, { x: number; y: number }>()
  let maxRowW = 0
  levelKeys.forEach((lv, rowIdx) => {
    const row = byLevel.get(lv) as PersonT[]
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X
    maxRowW = Math.max(maxRowW, rowW)
    row.forEach((p, i) => {
      pos.set(p.id, { x: PAD + i * (NODE_W + GAP_X), y: PAD + rowIdx * (NODE_H + GAP_Y) })
    })
  })
  // 각 행을 가운데 정렬
  levelKeys.forEach((lv) => {
    const row = byLevel.get(lv) as PersonT[]
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X
    const shift = (maxRowW - rowW) / 2
    row.forEach((p) => { const pp = pos.get(p.id); if (pp) pp.x += shift })
  })
  const svgW = Math.max(560, maxRowW + PAD * 2)
  const svgH = Math.max(360, (levelKeys.length || 1) * NODE_H + Math.max(0, levelKeys.length - 1) * GAP_Y + PAD * 2)

  const isEmpty = people.length === 0

  // ===== [연계] 계보 본문 → 프로젝트(자료 › 인물) =====
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildLineageHtml = (): string => {
    const parts: string[] = []
    parts.push('<h2>세대별 인물</h2>')
    if (!people.length) {
      parts.push('<p>(없음)</p>')
    } else {
      levelKeys.forEach((lv) => {
        const row = byLevel.get(lv) as PersonT[]
        parts.push('<h3>' + (lv + 1) + '세대</h3>')
        parts.push('<ul>' + row.map((p) => {
          const sx = SEX_META[p.sex].label
          const meta2 = [sx, p.life].filter(Boolean).join(', ')
          return '<li>' + esc(p.name) + (meta2 ? ' (' + esc(meta2) + ')' : '') + (p.note ? ' — ' + esc(p.note) : '') + '</li>'
        }).join('') + '</ul>')
      })
    }
    parts.push('<h2>관계</h2>')
    if (!rels.length) {
      parts.push('<p>(없음)</p>')
    } else {
      const order: RelKind[] = ['parent', 'spouse', 'sibling']
      order.forEach((k) => {
        const group = rels.filter((r) => r.kind === k)
        if (!group.length) return
        parts.push('<h3>' + REL_META[k].label + '</h3>')
        parts.push('<ul>' + group.map((r) => {
          if (k === 'parent') return '<li>' + esc(nameOf(r.a)) + ' → ' + esc(nameOf(r.b)) + '</li>'
          return '<li>' + esc(nameOf(r.a)) + ' ↔ ' + esc(nameOf(r.b)) + '</li>'
        }).join('') + '</ul>')
      })
    }
    return parts.join('\n')
  }
  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (isEmpty) { setNote('추가할 인물이 없어요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '가계도', bodyHtml: buildLineageHtml() })
    if (id) setNote('프로젝트 자료 › 인물 폴더에 계보를 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요. 연결 상태를 확인해 주세요.')
  }

  // 텍스트 복사
  const copyText = async () => {
    const lines: string[] = ['# 가계도', '']
    levelKeys.forEach((lv) => {
      const row = byLevel.get(lv) as PersonT[]
      lines.push(`## ${lv + 1}세대`)
      row.forEach((p) => {
        const meta2 = [SEX_META[p.sex].label, p.life].filter(Boolean).join(', ')
        lines.push(`- ${p.name}${meta2 ? ` (${meta2})` : ''}${p.note ? ` — ${p.note}` : ''}`)
      })
    })
    lines.push('', '## 관계')
    if (!rels.length) lines.push('(없음)')
    rels.forEach((r) => {
      lines.push(r.kind === 'parent'
        ? `- ${nameOf(r.a)} → ${nameOf(r.b)} (부모→자식)`
        : `- ${nameOf(r.a)} ↔ ${nameOf(r.b)} (${REL_META[r.kind].label})`)
    })
    const txt = lines.join('\n')
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('가계도를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('가계도를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
    }
  }

  // ===== 스타일 =====
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const canvasBox: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', overflow: 'auto', background: 'var(--paper)' }
  const side: React.CSSProperties = { width: 246, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const sInput: React.CSSProperties = { ...input, width: '100%' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {/* 상단 도구막대 — 인물 추가 */}
      <div style={topbar}>
        <input
          style={{ ...input, flex: 1, minWidth: 120 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}
          placeholder="인물 이름을 입력하고 Enter…"
          maxLength={40}
          aria-label="인물 이름"
        />
        <select style={input} value={draftSex} onChange={(e) => setDraftSex(e.target.value as Sex)} aria-label="성별">
          <option value="x">성별</option>
          <option value="m">남</option>
          <option value="f">여</option>
        </select>
        <button className="btn-primary" onClick={addPerson} disabled={!draftName.trim()}>＋ 인물 추가</button>
        <button
          className="minibtn"
          onClick={importLibraryChars}
          disabled={!libChars.length}
          title={libChars.length ? `공유 라이브러리의 인물 ${libChars.length}명을 불러옵니다` : '공유 라이브러리에 인물이 없습니다'}
        ><Emoji e="📥" /> 라이브러리 인물 불러오기{libChars.length ? ` (${libChars.length})` : ''}</button>
        <button
          className="linkbtn"
          onClick={addToProjectDoc}
          disabled={isEmpty || !hasProjectBridge()}
          title={hasProjectBridge() ? '세대·관계를 계보 문서로 변환해 프로젝트 바인더(자료 › 인물)에 추가' : '프로젝트에 연결되어 있지 않아요'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={copyText} disabled={isEmpty} title="가계도를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={clearAll} disabled={isEmpty} title="전체 삭제"><Emoji e="🗑️" /> 전체 비우기</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* SVG 가계도 */}
        <div style={canvasBox}>
          {isEmpty ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24 }}>
              아직 인물이 없어요.<br />
              위 입력칸에 이름을 적고 <b style={{ color: 'var(--text)' }}>＋ 인물 추가</b>를 누르거나,<br />
              <b style={{ color: 'var(--text)' }}><Emoji e="📥" /> 라이브러리 인물 불러오기</b>로 저장된 인물을 가져오세요.<br />
              그다음 오른쪽 <b style={{ color: 'var(--text)' }}>관계 추가</b>에서 부모·배우자·형제를 이으면<br />
              세대별 가계도가 자동으로 그려집니다.
            </div>
          ) : (
            <svg width={svgW} height={svgH} style={{ display: 'block', userSelect: 'none' }}>
              {/* 관계선 — 부모(곡선), 배우자(가로), 형제(점선) */}
              {rels.map((r) => {
                const pa = pos.get(r.a), pb = pos.get(r.b)
                if (!pa || !pb) return null
                const meta2 = REL_META[r.kind]
                if (r.kind === 'parent') {
                  const x1 = pa.x + NODE_W / 2, y1 = pa.y + NODE_H
                  const x2 = pb.x + NODE_W / 2, y2 = pb.y
                  const midY = (y1 + y2) / 2
                  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
                  return <path key={r.id} d={d} fill="none" stroke={meta2.color} strokeWidth={2.2} markerEnd="url(#ft-arrow)" opacity={0.9} />
                }
                // 같은 레벨(가로) — 노드 가장자리끼리 연결
                const leftFirst = pa.x <= pb.x
                const L = leftFirst ? pa : pb, R = leftFirst ? pb : pa
                const x1 = L.x + NODE_W, y1 = L.y + NODE_H / 2
                const x2 = R.x, y2 = R.y + NODE_H / 2
                if (Math.abs(y1 - y2) < 1) {
                  return <line key={r.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={meta2.color} strokeWidth={r.kind === 'spouse' ? 2.6 : 2} strokeDasharray={r.kind === 'sibling' ? '6 5' : undefined} strokeLinecap="round" opacity={0.9} />
                }
                // 레벨이 어긋난 경우(드묾) 직선 연결
                return <line key={r.id} x1={pa.x + NODE_W / 2} y1={pa.y + NODE_H / 2} x2={pb.x + NODE_W / 2} y2={pb.y + NODE_H / 2} stroke={meta2.color} strokeWidth={2} strokeDasharray={r.kind === 'sibling' ? '6 5' : '2 3'} opacity={0.7} />
              })}

              <defs>
                <marker id="ft-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M1,1 L8,4.5 L1,8 Z" fill={REL_META.parent.color} />
                </marker>
              </defs>

              {/* 인물 노드 */}
              {people.map((p) => {
                const pp = pos.get(p.id)
                if (!pp) return null
                const sm = SEX_META[p.sex]
                const sel = selId === p.id
                return (
                  <g key={p.id} transform={`translate(${pp.x},${pp.y})`} style={{ cursor: 'pointer' }} onClick={() => setSelId(p.id)}>
                    <rect width={NODE_W} height={NODE_H} rx={9} fill="var(--panel)" stroke={sel ? 'var(--accent)' : sm.color} strokeWidth={sel ? 3 : 2} />
                    <rect width={6} height={NODE_H} rx={3} fill={sm.color} />
                    <text x={NODE_W / 2 + 2} y={p.life ? 20 : 27} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--text)">
                      {p.name.length > 7 ? p.name.slice(0, 7) + '…' : p.name}
                    </text>
                    {p.life && (
                      <text x={NODE_W / 2 + 2} y={36} textAnchor="middle" fontSize={10} fill="var(--muted)">
                        {p.life.length > 12 ? p.life.slice(0, 12) + '…' : p.life}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        {/* 우측 패널 */}
        <div style={side}>
          {/* 선택 인물 편집 */}
          {selObj ? (
            <div style={card}>
              <div style={sLabel}>인물 편집</div>
              <input style={sInput} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} placeholder="이름" aria-label="이름 수정" />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['m', 'f', 'x'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    className="minibtn"
                    onClick={() => setEditSex(s)}
                    style={{ flex: 1, borderColor: editSex === s ? SEX_META[s].color : 'var(--border)', color: editSex === s ? SEX_META[s].color : 'var(--text)', borderWidth: 2, fontWeight: editSex === s ? 700 : 400 }}
                  >{SEX_META[s].label}</button>
                ))}
              </div>
              <input style={sInput} value={editLife} onChange={(e) => setEditLife(e.target.value)} maxLength={40} placeholder="생몰(선택, 예: 1820–1899)" aria-label="생몰 수정" />
              <textarea
                style={{ ...sInput, resize: 'vertical', minHeight: 54, fontFamily: 'inherit', lineHeight: 1.5 }}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                maxLength={300}
                placeholder="메모(역할·성격 등)"
                aria-label="메모 수정"
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={savePersonEdit}>저장</button>
                <button className="minibtn" onClick={() => removePerson(selObj.id)} title="이 인물 삭제"><Emoji e="🗑️" /> 삭제</button>
              </div>
              <div style={hint}>이 인물과 연결된 관계도 함께 삭제됩니다.</div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>노드를 클릭하면 여기서 이름·성별·생몰·메모를 수정하거나 삭제할 수 있어요. 세대는 부모-자식 관계로 자동 계산됩니다.</div>
            </div>
          )}

          {/* 관계 추가 */}
          <div style={card}>
            <div style={sLabel}>관계 추가</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['parent', 'spouse', 'sibling'] as RelKind[]).map((k) => (
                <button
                  key={k}
                  className="minibtn"
                  onClick={() => setRelKind(k)}
                  style={{ borderColor: relKind === k ? REL_META[k].color : 'var(--border)', color: relKind === k ? REL_META[k].color : 'var(--text)', borderWidth: 2, fontWeight: relKind === k ? 700 : 400 }}
                >
                  <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: REL_META[k].color, marginRight: 5, verticalAlign: 'middle' }} />
                  {k === 'parent' ? '부모-자식' : REL_META[k].label}
                </button>
              ))}
            </div>
            <select style={sInput} value={relA} onChange={(e) => setRelA(e.target.value)} aria-label={relKind === 'parent' ? '부모' : '인물 1'} disabled={people.length < 2}>
              <option value="">{relKind === 'parent' ? '부모 선택…' : '인물 1 선택…'}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select style={sInput} value={relB} onChange={(e) => setRelB(e.target.value)} aria-label={relKind === 'parent' ? '자식' : '인물 2'} disabled={people.length < 2}>
              <option value="">{relKind === 'parent' ? '자식 선택…' : '인물 2 선택…'}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn-primary" onClick={addRel} disabled={people.length < 2 || !relA || !relB}>＋ 관계 추가</button>
            {people.length < 2 && <div style={hint}>관계를 만들려면 인물이 둘 이상 필요해요.</div>}
          </div>

          {/* 관계 목록 */}
          <div style={card}>
            <div style={sLabel}>관계 {rels.length}개</div>
            {rels.length === 0 ? (
              <div style={hint}>아직 관계가 없어요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                {rels.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: REL_META[r.kind].color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nameOf(r.a)} {r.kind === 'parent' ? '→' : '↔'} {nameOf(r.b)}
                    </span>
                    <button className="minibtn" style={{ padding: '1px 5px', fontSize: 11 }} onClick={() => removeRel(r.id)} title="관계 삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 인물 목록 + 순서 */}
          <div style={card}>
            <div style={sLabel}>인물 {people.length}명</div>
            {people.length === 0 ? (
              <div style={hint}>아직 없음</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 168, overflowY: 'auto' }}>
                {people.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => setSelId(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, background: selId === p.id ? 'var(--chrome-2)' : 'transparent' }}
                  >
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: SEX_META[p.sex].color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{(levels.get(p.id) ?? 0) + 1}세대</span>
                    <button className="minibtn" style={{ padding: '0 4px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); movePerson(p.id, -1) }} disabled={i === 0} title="왼쪽으로">▲</button>
                    <button className="minibtn" style={{ padding: '0 4px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); movePerson(p.id, 1) }} disabled={i === people.length - 1} title="오른쪽으로">▼</button>
                    <button className="minibtn" style={{ padding: '1px 5px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); removePerson(p.id) }} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={hint}>▲▼ 로 같은 세대 안의 좌우 배치 순서를 바꿀 수 있어요.</div>
          </div>

          {/* 범례 */}
          <div style={card}>
            <div style={sLabel}>범례</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(['parent', 'spouse', 'sibling'] as RelKind[]).map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  {k === 'sibling'
                    ? <span style={{ width: 20, height: 0, flexShrink: 0, borderTop: `2px dashed ${REL_META[k].color}` }} />
                    : <span style={{ width: 20, height: 3, borderRadius: 2, background: REL_META[k].color, flexShrink: 0 }} />}
                  <span>{REL_META[k].label}</span>
                </div>
              ))}
              <div style={{ height: 6 }} />
              {(['m', 'f', 'x'] as Sex[]).map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: SEX_META[s].color, flexShrink: 0 }} />
                  <span>{SEX_META[s].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* [연계] 관련 도구 */}
          <div style={card}>
            <div style={sLabel}>연계 도구</div>
            <div className="linkbar">
              <span className="linkbar-label">함께 열기:</span>
              <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 도구를 엽니다"><Emoji e="🧑‍🎤" /> 인물 시트</button>
              <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 도구를 엽니다"><Emoji e="🕸️" /> 인물 관계도</button>
            </div>
            <div style={hint}>인물 시트·캐릭터 모델의 인물은 공유 라이브러리에 모이고, 위 <b><Emoji e="📥" /> 불러오기</b>로 가계도에 추가할 수 있어요.</div>
          </div>

          <div style={hint}>모든 인물·관계·순서는 이 브라우저에 자동 저장됩니다.</div>
        </div>
      </div>
    </div>
  )
}
