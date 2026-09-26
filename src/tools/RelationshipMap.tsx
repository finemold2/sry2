// 인물 관계도 — 인물 노드 추가/드래그, 두 인물 사이 관계선+라벨(가족/연인/친구/적/동료/스승 등),
// 색으로 관계 구분. SVG 캔버스. 노드/관계 삭제·수정. localStorage 자동 저장/복원. 텍스트 내보내기.
// 연계: 공유 라이브러리(useLibraryList)의 인물을 노드로 불러오고, payload.character 로 받은 인물도 노드로 추가.
//       인물 시트/캐릭터 모델 도구를 함께 열 수 있는 linkbar 제공.
// import 는 react 와 './linkbus' 만 사용. 외부 네트워크 불필요(저작권 안전). localStorage 차단 시 graceful 처리.
import { useEffect, useRef, useState } from 'react'
import { useLibraryList, openToolLinked, addToProject, hasProjectBridge, getDragItem, isItemDrag, updateInLibrary, isLastWriteOk, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'relationship-map', name: '인물 관계도', icon: '🕸️', group: '구상·정리', intro: '인물 노드를 놓고 관계선·라벨로 인물 사이를 연결하세요', w: 720, h: 600 }

const LS_KEY = 'sry:tool:relationship-map'

// 관계 유형 — 색으로 구분.
interface RelType { key: string; label: string; color: string }
const REL_TYPES: RelType[] = [
  { key: 'family', label: '가족', color: '#e0992b' },
  { key: 'lover', label: '연인', color: '#e0518b' },
  { key: 'friend', label: '친구', color: '#3fa35a' },
  { key: 'enemy', label: '적', color: '#d2473b' },
  { key: 'colleague', label: '동료', color: '#3d7fd6' },
  { key: 'mentor', label: '스승', color: '#8a5cd6' },
  { key: 'rival', label: '경쟁자', color: '#c9772b' },
  { key: 'other', label: '기타', color: '#7a8493' },
]
const relOf = (k: string): RelType => REL_TYPES.find((r) => r.key === k) || REL_TYPES[REL_TYPES.length - 1]

interface NodeT { id: string; name: string; note: string; x: number; y: number; color: string }
interface EdgeT { id: string; a: string; b: string; type: string; label: string }
interface Store { nodes: NodeT[]; edges: EdgeT[] }

const NODE_COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8a5cd6', '#d2473b', '#2bb6c0', '#7a8493']
const NODE_R = 30 // 노드 반지름

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { nodes: [], edges: [] }
    const p = JSON.parse(raw)
    const nodes: NodeT[] = Array.isArray(p?.nodes)
      ? p.nodes.filter((n: any) => n && typeof n.name === 'string').map((n: any, i: number) => ({
          id: String(n.id || newId()),
          name: String(n.name).slice(0, 40),
          note: String(n.note || '').slice(0, 300),
          x: Number.isFinite(n.x) ? n.x : 120 + (i % 5) * 120,
          y: Number.isFinite(n.y) ? n.y : 100 + Math.floor(i / 5) * 120,
          color: typeof n.color === 'string' ? n.color : NODE_COLORS[i % NODE_COLORS.length],
        }))
      : []
    const ids = new Set(nodes.map((n) => n.id))
    const edges: EdgeT[] = Array.isArray(p?.edges)
      ? p.edges.filter((e: any) => e && ids.has(String(e.a)) && ids.has(String(e.b)) && String(e.a) !== String(e.b)).map((e: any) => ({
          id: String(e.id || newId()),
          a: String(e.a),
          b: String(e.b),
          type: typeof e.type === 'string' && REL_TYPES.some((t) => t.key === e.type) ? e.type : 'other',
          label: String(e.label || '').slice(0, 30),
        }))
      : []
    return { nodes, edges }
  } catch {
    return { nodes: [], edges: [] }
  }
}

// 공유 인물 → 노드용 메모 한 줄로 요약(역할·성격·목표 등에서 추림). 외부 이미지/사진은 쓰지 않는다(저작권 안전).
function summarizeChar(c: Partial<SharedCharacter>): string {
  const f = c.fields || {}
  const g = (k: keyof SharedCharacter, fk: string) => (c[k] && String(c[k]).trim()) || (f[fk] && f[fk].trim()) || ''
  const parts: string[] = []
  const role = g('role', 'role'); if (role) parts.push(role)
  const personality = g('personality', 'personality')
  const goal = g('goal', 'goal')
  const appearance = g('appearance', 'appearance')
  const notes = g('notes', 'notes')
  if (personality) parts.push(personality)
  else if (goal) parts.push('목표: ' + goal)
  else if (appearance) parts.push(appearance)
  else if (notes) parts.push(notes)
  // 직업·출신 등 fields 보조 정보도 한 줄에 보탬(있으면).
  if (f.occupation && f.occupation.trim() && !parts.join(' ').includes(f.occupation.trim())) parts.push(f.occupation.trim())
  return parts.join(' · ').slice(0, 300)
}

interface RelationshipMapProps { payload?: Record<string, unknown> }

export default function RelationshipMap({ payload }: RelationshipMapProps) {
  const initial = useRef<Store>(loadStore())
  const [nodes, setNodes] = useState<NodeT[]>(initial.current.nodes)
  const [edges, setEdges] = useState<EdgeT[]>(initial.current.edges)
  const [note, setNote] = useState('')

  // 공유 라이브러리 인물 목록(자동 구독/리렌더) — 노드로 불러오기에 사용.
  const libChars = useLibraryList('characters')

  // 바인더 파일 드롭 시각 피드백
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0) // onDragEnter/Leave 중첩(자식 위 이동) 보정

  // 선택/편집 상태
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [linkFrom, setLinkFrom] = useState<string | null>(null) // 관계선 연결 시작 노드
  const [linkMode, setLinkMode] = useState(false)

  // 폼 상태
  const [draftName, setDraftName] = useState('')
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editEdgeType, setEditEdgeType] = useState('other')
  const [editEdgeLabel, setEditEdgeLabel] = useState('')

  const svgRef = useRef<SVGSVGElement | null>(null)
  const mounted = useRef(true)

  // 드래그 상태 (리스너 정리용 ref)
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ nodes, edges }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [nodes, edges])

  // ===== 노드 추가 공용 헬퍼 (라이브러리/페이로드/직접 입력이 공유) =====
  // 같은 이름 노드가 이미 있으면 건너뛴다(중복 방지). 추가한 노드 id를 반환(없으면 null).
  const addNamedNode = (rawName: string, rawNote = ''): string | null => {
    const name = rawName.trim()
    if (!name) return null
    let createdId: string | null = null
    setNodes((prev) => {
      if (prev.some((n) => n.name.trim() === name.slice(0, 40).trim())) return prev
      const idx = prev.length
      const n: NodeT = {
        id: newId(),
        name: name.slice(0, 40),
        note: rawNote.slice(0, 300),
        x: 120 + (idx % 5) * 130 + Math.round((Math.random() - 0.5) * 20),
        y: 90 + Math.floor(idx / 5) * 120 + Math.round((Math.random() - 0.5) * 20),
        color: NODE_COLORS[idx % NODE_COLORS.length],
      }
      createdId = n.id
      return [...prev, n]
    })
    return createdId
  }

  // ===== [연계] payload.character 로 들어온 인물을 노드로 추가 =====
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
      const id = addNamedNode(nm, summarizeChar(c as Partial<SharedCharacter>))
      if (id) added++
    }
    if (mounted.current) {
      if (added > 0) setNote(`인물 ${added}명을 노드로 추가했어요.`)
      else if (list.length) setNote('받은 인물이 이미 모두 추가되어 있어요.')
    }
  }, [payload]) // eslint-disable-line

  // ===== [연계] 공유 라이브러리 인물 전체를 노드로 불러오기 =====
  const importLibraryChars = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 저장된 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    const existing = new Set(nodes.map((n) => n.name.trim()))
    let added = 0
    for (const c of libChars) {
      const nm = (c.name || '').trim()
      if (!nm || existing.has(nm)) continue
      existing.add(nm)
      if (addNamedNode(nm, summarizeChar(c))) added++
    }
    setNote(added > 0 ? `라이브러리 인물 ${added}명을 노드로 추가했어요.` : '라이브러리 인물이 이미 모두 노드에 있어요.')
  }

  // ===== [연계] 좌측 바인더 파일을 도구창에 드롭 → 노드로 추가 =====
  // 인물 카드(character) 면 character.name||title 을, 일반 문서면 title 을 이름으로 쓰고
  // 본문/카드 요약을 메모로 채운다. 위치/중복은 addNamedNode 가 처리(겹치지 않게 배치).
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const ch = it.character
    let name = ''
    let summary = ''
    if (ch) {
      // 인물/장소 카드 — character 필드 활용
      name = (ch.name || '').trim() || (it.title || '').trim()
      summary = summarizeChar(ch as Partial<SharedCharacter>)
    } else {
      // 일반 문서 — 제목 + 본문 평문 일부
      name = (it.title || '').trim()
      summary = (it.text || '').trim().replace(/\s+/g, ' ').slice(0, 300)
    }
    if (!name) { setNote('드롭한 파일에서 이름을 찾지 못했어요.'); return }
    const id = addNamedNode(name, summary)
    if (id) { setSelNode(id); setSelEdge(null); setNote(`‘${name}’ 인물을 노드로 추가했어요.`) }
    else { setNote(`‘${name}’ 인물은 이미 추가되어 있어요.`) }
  }

  // 선택 노드/관계가 바뀌면 편집 폼 값 동기화
  const selNodeObj = nodes.find((n) => n.id === selNode) || null
  const selEdgeObj = edges.find((e) => e.id === selEdge) || null
  useEffect(() => {
    if (selNodeObj) { setEditName(selNodeObj.name); setEditNote(selNodeObj.note) }
  }, [selNode]) // eslint-disable-line
  useEffect(() => {
    if (selEdgeObj) { setEditEdgeType(selEdgeObj.type); setEditEdgeLabel(selEdgeObj.label) }
  }, [selEdge]) // eslint-disable-line

  // SVG 좌표 변환 — getBoundingClientRect 기준
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const r = svg.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  // ===== 드래그 (포인터 이벤트, window 리스너는 사용 후 반드시 해제) =====
  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    // 연결 모드: 클릭으로 두 노드를 잇는다(드래그 아님)
    if (linkMode) return
    const p = toSvg(e.clientX, e.clientY)
    const n = nodes.find((x) => x.id === id)
    if (!n) return
    drag.current = { id, dx: p.x - n.x, dy: p.y - n.y, moved: false }

    const move = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const sp = toSvg(ev.clientX, ev.clientY)
      const nx = Math.max(NODE_R + 2, Math.min(2000, sp.x - d.dx))
      const ny = Math.max(NODE_R + 2, Math.min(2000, sp.y - d.dy))
      d.moved = true
      setNodes((prev) => prev.map((nd) => (nd.id === d.id ? { ...nd, x: nx, y: ny } : nd)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const d = drag.current
      drag.current = null
      // 이동이 거의 없으면 선택으로 간주
      if (d && !d.moved) { setSelNode(d.id); setSelEdge(null) }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // 언마운트 시 혹시 남은 드래그 리스너 강제 정리
  useEffect(() => () => { drag.current = null }, [])

  // 연결 모드에서 노드 클릭 → 두 노드 연결
  const onNodeClickLink = (id: string) => {
    if (!linkMode) return
    if (linkFrom == null) { setLinkFrom(id); return }
    if (linkFrom === id) { setLinkFrom(null); return }
    // 이미 같은 쌍이 있으면 중복 추가 방지
    const exists = edges.some((e) => (e.a === linkFrom && e.b === id) || (e.a === id && e.b === linkFrom))
    if (!exists) {
      const ne: EdgeT = { id: newId(), a: linkFrom, b: id, type: 'other', label: '' }
      setEdges((prev) => [...prev, ne])
      setSelEdge(ne.id); setSelNode(null)
    } else {
      setNote('두 인물은 이미 연결되어 있어요. 관계선을 눌러 유형을 바꾸세요.')
    }
    setLinkFrom(null)
    setLinkMode(false)
  }

  // ===== 노드 CRUD =====
  const addNode = () => {
    const name = draftName.trim()
    if (!name) return
    const id = addNamedNode(name)
    setDraftName('')
    if (id) { setSelNode(id); setSelEdge(null); setNote('') }
    else setNote('같은 이름의 인물이 이미 있어요.')
  }

  const saveNodeEdit = () => {
    if (!selNode) return
    const nm = editName.trim()
    if (!nm) { setNote('이름은 비울 수 없어요.'); return }
    setNodes((prev) => prev.map((n) => (n.id === selNode ? { ...n, name: nm.slice(0, 40), note: editNote.slice(0, 300) } : n)))
    setNote('')
  }

  const setNodeColor = (c: string) => {
    if (!selNode) return
    setNodes((prev) => prev.map((n) => (n.id === selNode ? { ...n, color: c } : n)))
  }

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.a !== id && e.b !== id))
    if (selNode === id) setSelNode(null)
  }

  // ===== 관계(엣지) CRUD =====
  const saveEdgeEdit = () => {
    if (!selEdge) return
    setEdges((prev) => prev.map((e) => (e.id === selEdge ? { ...e, type: editEdgeType, label: editEdgeLabel.slice(0, 30) } : e)))
    setNote('')
  }
  const removeEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id))
    if (selEdge === id) setSelEdge(null)
  }

  const clearAll = () => {
    if (!nodes.length && !edges.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 인물과 관계를 지울까요? 되돌릴 수 없습니다.')) return
    setNodes([]); setEdges([]); setSelNode(null); setSelEdge(null); setLinkFrom(null); setLinkMode(false)
  }

  // ===== 텍스트 내보내기 =====
  const exportText = (): string => {
    const lines: string[] = ['# 인물 관계도', '']
    lines.push('## 인물')
    if (!nodes.length) lines.push('(없음)')
    nodes.forEach((n) => { lines.push(`- ${n.name}${n.note ? ` — ${n.note}` : ''}`) })
    lines.push('', '## 관계')
    if (!edges.length) lines.push('(없음)')
    edges.forEach((e) => {
      const a = nodes.find((n) => n.id === e.a)?.name || '?'
      const b = nodes.find((n) => n.id === e.b)?.name || '?'
      const rt = relOf(e.type)
      lines.push(`- ${a} ↔ ${b} : ${rt.label}${e.label ? ` (${e.label})` : ''}`)
    })
    return lines.join('\n')
  }
  const copyText = async () => {
    const txt = exportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('관계도를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('관계도를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
    }
  }

  // ===== [연계] 인물 관계를 folder:"인물" 문서로 프로젝트에 추가 =====
  // 노드(인물)와 관계선 라벨을 관계 목록 HTML 로 만들어 바인더(자료 › 인물)에 추가한다.
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const buildRelationshipHtml = (): string => {
    const parts: string[] = []
    // 인물 목록
    parts.push('<h2>인물</h2>')
    if (!nodes.length) {
      parts.push('<p>(없음)</p>')
    } else {
      parts.push('<ul>' + nodes.map((n) =>
        '<li>' + esc(n.name) + (n.note ? ' — ' + esc(n.note) : '') + '</li>'
      ).join('') + '</ul>')
    }
    // 관계 목록
    parts.push('<h2>관계</h2>')
    if (!edges.length) {
      parts.push('<p>(없음)</p>')
    } else {
      parts.push('<ul>' + edges.map((e) => {
        const a = nodes.find((n) => n.id === e.a)?.name || '?'
        const b = nodes.find((n) => n.id === e.b)?.name || '?'
        const rt = relOf(e.type)
        const detail = e.label ? ' (' + esc(e.label) + ')' : ''
        return '<li>' + esc(a) + ' ↔ ' + esc(b) + ' : ' + esc(rt.label) + detail + '</li>'
      }).join('') + '</ul>')
    }
    return parts.join('\n')
  }

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (isEmpty) { setNote('추가할 인물·관계가 없어요.'); return }
    const bodyHtml = buildRelationshipHtml()
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '인물 관계도', bodyHtml })
    if (id) setNote('프로젝트 자료 › 인물 폴더에 관계 목록을 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요. 연결 상태를 확인해 주세요.')
  }

  // ===== [연계] 관계도에서 만든 관계를 공유 인물 라이브러리(인물 시트)로 되돌리기(왕복) =====
  // 각 노드 이름을 libChars 와 매칭해, 그 인물이 가진 관계선을 한 줄씩 모아
  // fields.relations 에 기록한다(상대 — 유형 (라벨)). 기존 fields 는 보존하고 relations 만 갱신해 손실이 없다.
  // 이름이 라이브러리에 없는 노드는 건너뛴다(라이브러리에 없는 인물을 새로 만들지 않음 — 데이터 안전).
  const pushRelationsToLibrary = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 인물을 만드세요.'); return }
    // 이름 → 라이브러리 인물(첫 항목) 매핑. 동명 인물은 첫 항목에만 반영.
    const byName = new Map<string, SharedCharacter>()
    for (const c of libChars) {
      const nm = (c.name || '').trim()
      if (nm && !byName.has(nm)) byName.set(nm, c)
    }
    // 노드 id → 이름(라벨 작성용)
    const nameOfNode = (id: string): string => nodes.find((n) => n.id === id)?.name?.trim() || '?'
    let updated = 0
    let writeFailed = false
    let noEdge = 0
    for (const node of nodes) {
      const nm = node.name.trim()
      const target = byName.get(nm)
      if (!target) continue // 라이브러리에 없는 인물은 건너뜀
      // 이 노드가 끼어 있는 관계선들을 모아 한 줄씩 만든다(상대 — 유형 (라벨)).
      const lines: string[] = []
      for (const e of edges) {
        if (e.a !== node.id && e.b !== node.id) continue
        const otherId = e.a === node.id ? e.b : e.a
        const other = nameOfNode(otherId)
        const rt = relOf(e.type)
        lines.push(`${other} — ${rt.label}${e.label ? ` (${e.label})` : ''}`)
      }
      if (!lines.length) { noEdge++; continue } // 관계가 없는 인물은 덮어쓰지 않음(기존 relations 보존)
      const relText = lines.join('\n')
      const prevFields = target.fields || {}
      if ((prevFields.relations || '') === relText) continue // 변화 없음 — 불필요한 저장/갱신 생략
      const ok = updateInLibrary('characters', target.id, { fields: { ...prevFields, relations: relText } })
      if (ok && isLastWriteOk()) updated++
      else writeFailed = true
    }
    if (writeFailed) { setNote('일부 인물 저장에 실패했어요(브라우저 저장 공간 부족일 수 있어요).'); return }
    if (updated > 0) setNote(`인물 ${updated}명의 관계를 인물 라이브러리(인물 시트)에 반영했어요.`)
    else if (noEdge && noEdge === nodes.filter((n) => byName.has(n.name.trim())).length) setNote('관계선이 있는 인물이 없어요. 먼저 인물 사이를 연결하세요.')
    else setNote('이미 모든 관계가 인물 라이브러리에 반영되어 있어요.')
  }

  // 빈 캔버스 클릭 → 선택 해제
  const onCanvasClick = () => {
    if (linkMode) { setLinkMode(false); setLinkFrom(null); return }
    setSelNode(null); setSelEdge(null)
  }

  // ===== 스타일 =====
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const canvasBox: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', overflow: 'auto', background: 'var(--paper)' }
  const side: React.CSSProperties = { width: 230, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const sInput: React.CSSProperties = { ...input, width: '100%' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  // 캔버스 크기: 노드 범위에 맞춰 확장(드래그로 멀리 이동 시 스크롤)
  const maxX = Math.max(640, ...nodes.map((n) => n.x + 80))
  const maxY = Math.max(420, ...nodes.map((n) => n.y + 80))

  const isEmpty = nodes.length === 0

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -6 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      {dropActive && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '6px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          여기에 놓으면 인물 노드로 추가됩니다
        </div>
      )}
      {/* 상단 도구막대 */}
      <div style={topbar}>
        <input
          style={{ ...input, flex: 1, minWidth: 120 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNode() } }}
          placeholder="인물 이름을 입력하고 Enter…"
          maxLength={40}
          aria-label="인물 이름"
        />
        <button className="btn-primary" onClick={addNode} disabled={!draftName.trim()}>＋ 인물 추가</button>
        <button
          className="minibtn"
          onClick={importLibraryChars}
          disabled={!libChars.length}
          title={libChars.length ? `공유 라이브러리의 인물 ${libChars.length}명을 노드로 불러옵니다` : '공유 라이브러리에 인물이 없습니다'}
        ><Emoji e="📥" /> 라이브러리 인물 불러오기{libChars.length ? ` (${libChars.length})` : ''}</button>
        <button
          className={'minibtn' + (linkMode ? ' active' : '')}
          onClick={() => { setLinkMode((v) => !v); setLinkFrom(null); setSelNode(null); setSelEdge(null) }}
          disabled={nodes.length < 2}
          title="두 인물을 차례로 클릭해 관계선을 연결합니다"
        ><Emoji e="🔗" /> 관계 연결{linkMode ? ' 중…' : ''}</button>
        <button
          className="linkbtn"
          onClick={addToProjectDoc}
          disabled={isEmpty || !hasProjectBridge()}
          title={hasProjectBridge() ? '인물·관계를 관계 목록 문서로 변환해 프로젝트 바인더(자료 › 인물)에 추가' : '프로젝트에 연결되어 있지 않아요'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={pushRelationsToLibrary}
          disabled={!edges.length || !libChars.length}
          title={libChars.length ? '관계도에서 만든 관계를 공유 인물 라이브러리(인물 시트)의 관계 칸에 반영합니다' : '공유 라이브러리에 인물이 없습니다'}
        ><Emoji e="🔁" /> 관계를 인물에 반영</button>
        <button className="minibtn" onClick={copyText} disabled={isEmpty} title="관계도를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={clearAll} disabled={isEmpty} title="전체 삭제"><Emoji e="🗑️" /> 전체 비우기</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* SVG 캔버스 */}
        <div style={canvasBox}>
          {isEmpty ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24 }}>
              아직 인물이 없어요.<br />
              위 입력칸에 이름을 적고 <b style={{ color: 'var(--text)' }}>＋ 인물 추가</b>를 누르거나,<br />
              <b style={{ color: 'var(--text)' }}><Emoji e="📥" /> 라이브러리 인물 불러오기</b>로 저장된 인물을 가져오세요.<br />
              노드를 드래그해 배치하고, <b style={{ color: 'var(--text)' }}><Emoji e="🔗" /> 관계 연결</b>로 인물 사이를 이으세요.
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={maxX}
              height={maxY}
              style={{ display: 'block', cursor: linkMode ? 'crosshair' : 'default', userSelect: 'none', touchAction: 'none' }}
              onClick={onCanvasClick}
            >
              {/* 관계선 */}
              {edges.map((e) => {
                const a = nodes.find((n) => n.id === e.a)
                const b = nodes.find((n) => n.id === e.b)
                if (!a || !b) return null
                const rt = relOf(e.type)
                const mx = (a.x + b.x) / 2
                const my = (a.y + b.y) / 2
                const sel = selEdge === e.id
                return (
                  <g key={e.id} style={{ cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelNode(null) }}>
                    {/* 클릭 영역 확대용 투명 두꺼운 선 */}
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rt.color} strokeWidth={sel ? 4 : 2.5} strokeLinecap="round" strokeDasharray={e.type === 'enemy' || e.type === 'rival' ? '7 5' : undefined} opacity={0.9} />
                    {/* 라벨 배경 + 텍스트 */}
                    <g>
                      <rect x={mx - (rt.label.length + (e.label ? e.label.length + 1 : 0)) * 5 - 6} y={my - 11} width={(rt.label.length + (e.label ? e.label.length + 1 : 0)) * 10 + 12} height={20} rx={6} fill="var(--panel)" stroke={rt.color} strokeWidth={sel ? 1.6 : 1} opacity={0.96} />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={rt.color}>
                        {rt.label}{e.label ? ` ${e.label}` : ''}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* 연결 중 안내선 (시작 노드에서 떠 있는 표시) */}
              {linkMode && linkFrom && (() => {
                const f = nodes.find((n) => n.id === linkFrom)
                if (!f) return null
                return <circle cx={f.x} cy={f.y} r={NODE_R + 7} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
              })()}

              {/* 인물 노드 */}
              {nodes.map((n) => {
                const sel = selNode === n.id
                const isLinkStart = linkMode && linkFrom === n.id
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: linkMode ? 'pointer' : 'grab' }}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onClick={(e) => { e.stopPropagation(); onNodeClickLink(n.id) }}
                  >
                    <circle r={NODE_R} fill={n.color} stroke={sel || isLinkStart ? 'var(--accent)' : 'var(--paper)'} strokeWidth={sel || isLinkStart ? 4 : 3} />
                    <text textAnchor="middle" y={5} fontSize={13} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>
                      {n.name.length > 4 ? n.name.slice(0, 4) : n.name}
                    </text>
                    {n.name.length > 4 && (
                      <text textAnchor="middle" y={NODE_R + 16} fontSize={11} fontWeight={600} fill="var(--text)" style={{ pointerEvents: 'none' }}>{n.name}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        {/* 우측 패널 — 선택 항목 편집 / 범례 */}
        <div style={side}>
          {selNodeObj ? (
            <div style={card}>
              <div style={sLabel}>인물 편집</div>
              <input style={sInput} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} placeholder="이름" aria-label="이름 수정" />
              <textarea
                style={{ ...sInput, resize: 'vertical', minHeight: 56, fontFamily: 'inherit', lineHeight: 1.5 }}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                maxLength={300}
                placeholder="메모(역할·성격 등)"
                aria-label="메모 수정"
              />
              <div style={sLabel}>색</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {NODE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNodeColor(c)}
                    title={c}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: selNodeObj.color === c ? '3px solid var(--accent)' : '2px solid var(--border)', padding: 0 }}
                    aria-label={`색 ${c}`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveNodeEdit}>저장</button>
                <button className="minibtn" onClick={() => removeNode(selNodeObj.id)} title="이 인물 삭제"><Emoji e="🗑️" /> 삭제</button>
              </div>
              <div style={hint}>이 인물과 연결된 관계선도 함께 삭제됩니다.</div>
            </div>
          ) : selEdgeObj ? (
            <div style={card}>
              <div style={sLabel}>관계 편집</div>
              <div style={{ fontSize: 13 }}>
                <b>{nodes.find((n) => n.id === selEdgeObj.a)?.name || '?'}</b>
                <span style={{ color: 'var(--muted)' }}> ↔ </span>
                <b>{nodes.find((n) => n.id === selEdgeObj.b)?.name || '?'}</b>
              </div>
              <div style={sLabel}>유형</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REL_TYPES.map((t) => (
                  <button
                    key={t.key}
                    className="minibtn"
                    onClick={() => setEditEdgeType(t.key)}
                    style={{ borderColor: editEdgeType === t.key ? t.color : 'var(--border)', color: editEdgeType === t.key ? t.color : 'var(--text)', borderWidth: 2, fontWeight: editEdgeType === t.key ? 700 : 400 }}
                  >
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: t.color, marginRight: 5, verticalAlign: 'middle' }} />{t.label}
                  </button>
                ))}
              </div>
              <input style={sInput} value={editEdgeLabel} onChange={(e) => setEditEdgeLabel(e.target.value)} maxLength={30} placeholder="세부 라벨(선택, 예: 첫사랑)" aria-label="관계 세부 라벨" />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveEdgeEdit}>저장</button>
                <button className="minibtn" onClick={() => removeEdge(selEdgeObj.id)} title="이 관계 삭제"><Emoji e="🗑️" /> 삭제</button>
              </div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>
                {linkMode
                  ? '연결할 두 인물을 차례로 클릭하세요. 빈 곳을 누르면 취소됩니다.'
                  : '노드를 드래그해 배치하고, 노드나 관계선을 클릭하면 여기서 수정·삭제할 수 있어요.'}
              </div>
            </div>
          )}

          {/* 인물 목록 */}
          <div style={card}>
            <div style={sLabel}>인물 {nodes.length}명</div>
            {nodes.length === 0 ? (
              <div style={hint}>아직 없음</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { setSelNode(n.id); setSelEdge(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, background: selNode === n.id ? 'var(--chrome-2)' : 'transparent' }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: n.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                    <button className="minibtn" style={{ padding: '1px 5px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); removeNode(n.id) }} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 범례 */}
          <div style={card}>
            <div style={sLabel}>관계 색 범례</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {REL_TYPES.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 20, height: 3, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* [연계] 관련 도구 열기 */}
          <div style={card}>
            <div style={sLabel}>연계 도구</div>
            <div className="linkbar">
              <span className="linkbar-label">함께 열기:</span>
              <button
                className="linkbtn"
                onClick={() => openToolLinked('character-sheet')}
                title="인물 시트 도구를 엽니다"
              ><Emoji e="🧑‍🎤" /> 인물 시트</button>
              <button
                className="linkbtn"
                onClick={() => openToolLinked('character-model')}
                title="캐릭터 모델 가져오기 도구를 엽니다"
              ><Emoji e="🎭" /> 캐릭터 모델</button>
            </div>
            <div style={hint}>인물 시트·캐릭터 모델에서 만든 인물은 공유 라이브러리에 모이고, 위 <b><Emoji e="📥" /> 불러오기</b>로 노드에 추가할 수 있어요.</div>
          </div>

          <div style={hint}>모든 인물·관계·배치는 이 브라우저에 자동 저장됩니다.</div>
        </div>
      </div>
    </div>
  )
}
