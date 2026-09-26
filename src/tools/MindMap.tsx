// 마인드맵 — SVG 캔버스에 노드(박스) 추가·드래그 이동·이름 인라인 편집, 두 노드 연결선 그리기, 노드/연결 삭제,
// 중심 주제에서 가지치기, 텍스트 개요로 내보내기/복사. localStorage 자동 저장·복원.
// react 와 프로젝트 연계 허브('./linkbus') 외 import 없음(전부 로컬).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'mind-map', name: '마인드맵', icon: '🧠', group: '구상·정리', intro: '노드를 잇고 가지치며 생각을 지도로 그려 개요로 내보내기', w: 720, h: 600 }

interface MNode { id: string; text: string; x: number; y: number; color: string; root?: boolean }
interface MEdge { id: string; from: string; to: string }
interface MState { nodes: MNode[]; edges: MEdge[] }

const LS_KEY = 'sry:tool:mind-map'
const NODE_W = 132
const NODE_H = 46
const COLORS = ['#6c8cff', '#34c759', '#ff9f0a', '#ff6482', '#bf5af2', '#5ac8fa', '#a0a0a0']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function defaultState(): MState {
  const rootId = newId()
  return {
    nodes: [{ id: rootId, text: '중심 주제', x: 280, y: 240, color: COLORS[0], root: true }],
    edges: [],
  }
}

function loadState(): MState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultState()
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) return defaultState()
    const nodes: MNode[] = p.nodes
      .filter((n: any) => n && typeof n.id === 'string')
      .map((n: any) => ({
        id: String(n.id),
        text: typeof n.text === 'string' ? n.text : '',
        x: Number.isFinite(n.x) ? n.x : 100,
        y: Number.isFinite(n.y) ? n.y : 100,
        color: typeof n.color === 'string' ? n.color : COLORS[0],
        root: !!n.root,
      }))
    if (!nodes.length) return defaultState()
    const ids = new Set(nodes.map((n) => n.id))
    const edges: MEdge[] = p.edges
      .filter((e: any) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
      .map((e: any) => ({ id: typeof e.id === 'string' ? e.id : newId(), from: String(e.from), to: String(e.to) }))
    // 중복 간선 제거
    const seen = new Set<string>()
    const uniq = edges.filter((e) => {
      const k = e.from < e.to ? e.from + '|' + e.to : e.to + '|' + e.from
      if (seen.has(k)) return false
      seen.add(k); return true
    })
    return { nodes, edges: uniq }
  } catch {
    return defaultState()
  }
}

// 두 노드 사각형 중심을 잇는 선분이 각 사각형 테두리와 만나는 점을 구해 가장자리-가장자리로 연결.
function edgeAnchor(a: MNode, b: MNode): { x1: number; y1: number; x2: number; y2: number } {
  const acx = a.x + NODE_W / 2, acy = a.y + NODE_H / 2
  const bcx = b.x + NODE_W / 2, bcy = b.y + NODE_H / 2
  const clip = (cx: number, cy: number, tx: number, ty: number) => {
    const dx = tx - cx, dy = ty - cy
    if (dx === 0 && dy === 0) return { x: cx, y: cy }
    const hw = NODE_W / 2 + 2, hh = NODE_H / 2 + 2
    const sx = dx === 0 ? Infinity : hw / Math.abs(dx)
    const sy = dy === 0 ? Infinity : hh / Math.abs(dy)
    const s = Math.min(sx, sy)
    return { x: cx + dx * s, y: cy + dy * s }
  }
  const p1 = clip(acx, acy, bcx, bcy)
  const p2 = clip(bcx, bcy, acx, acy)
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
}

type DragState = { id: string; offX: number; offY: number; moved: boolean }

export default function MindMap() {
  const [state, setState] = useState<MState>(() => loadState())
  const [selected, setSelected] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [linkFrom, setLinkFrom] = useState<string | null>(null) // 연결 모드 시작 노드
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [dropActive, setDropActive] = useState(false) // 바인더 파일 드래그 진입 시 시각 피드백
  const [dropped, setDropped] = useState(false)        // 드롭 성공 토스트

  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const mounted = useRef(true)
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const dragDepth = useRef(0) // 중첩 onDragEnter/onDragLeave 상쇄용

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 지도가 사라질 수 있어요.') }
  }, [state])

  useEffect(() => { if (editing && editInputRef.current) editInputRef.current.select() }, [editing])

  const nodeById = (id: string | null) => state.nodes.find((n) => n.id === id) || null

  // ── 좌표 변환: 클라이언트 → SVG 내부 좌표 (getBoundingClientRect 기준) ──
  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const r = svg.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  // ── 드래그 이동 (포인터 이벤트, window 리스너는 up/언마운트에서 해제) ──
  // 리스너 누수 방지: add/remove 가 항상 동일한 함수 참조를 쓰도록 useRef 에 안정 핸들러를 보관.
  const onWindowMoveRef = useRef<(e: PointerEvent) => void>(() => {})
  const onWindowUpRef = useRef<() => void>(() => {})

  onWindowMoveRef.current = (e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const { x, y } = toLocal(e.clientX, e.clientY)
    const nx = Math.max(0, x - d.offX)
    const ny = Math.max(0, y - d.offY)
    d.moved = true
    setState((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === d.id ? { ...n, x: nx, y: ny } : n)) }))
  }
  onWindowUpRef.current = () => {
    dragRef.current = null
    window.removeEventListener('pointermove', onWindowMove)
    window.removeEventListener('pointerup', onWindowUp)
  }
  // 항상 동일한 참조로 add/remove 되는 안정 래퍼 (useRef.current 위임)
  const onWindowMove = useRef((e: PointerEvent) => onWindowMoveRef.current(e)).current
  const onWindowUp = useRef(() => onWindowUpRef.current()).current

  // 언마운트 시 리스너 확실히 정리 (동일 참조로 해제)
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerup', onWindowUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (editing) return
    e.stopPropagation()
    const node = nodeById(id)
    if (!node) return
    // 연결 모드: 시작 노드 지정 → 다음 노드 클릭으로 연결
    if (linkFrom) return
    const { x, y } = toLocal(e.clientX, e.clientY)
    dragRef.current = { id, offX: x - node.x, offY: y - node.y, moved: false }
    setSelected(id); setSelEdge(null)
    // 중복 등록 방지: 동일 참조이므로 안전하게 먼저 해제 후 등록
    window.removeEventListener('pointermove', onWindowMove)
    window.removeEventListener('pointerup', onWindowUp)
    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', onWindowUp)
  }

  // 노드 클릭 (드래그가 아니었을 때만 선택/연결 처리)
  const onNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (linkFrom) {
      if (linkFrom !== id) { connect(linkFrom, id); setLinkFrom(null) }
      else setLinkFrom(null)
      return
    }
    setSelected(id); setSelEdge(null)
  }

  // ── CRUD: 노드 추가 ──
  const addNode = (fromId?: string) => {
    const parent = fromId ? nodeById(fromId) : (nodeById(selected) || state.nodes[0])
    const base = parent || state.nodes[0]
    const angle = Math.random() * Math.PI * 2
    const dist = 150
    const nx = Math.max(0, (base ? base.x : 200) + Math.cos(angle) * dist)
    const ny = Math.max(0, (base ? base.y : 200) + Math.sin(angle) * dist)
    const id = newId()
    const color = COLORS[(state.nodes.length) % COLORS.length]
    setState((prev) => {
      const nodes = [...prev.nodes, { id, text: '새 가지', x: nx, y: ny, color }]
      const edges = base ? [...prev.edges, { id: newId(), from: base.id, to: id }] : prev.edges
      return { nodes, edges }
    })
    setSelected(id); setSelEdge(null)
    setEditing(id); setEditText('새 가지')
  }

  // ── CRUD: 연결 추가 (중복/자기연결 방지) ──
  const connect = (from: string, to: string) => {
    setState((prev) => {
      const exists = prev.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
      if (exists || from === to) return prev
      return { ...prev, edges: [...prev.edges, { id: newId(), from, to }] }
    })
  }

  // ── CRUD: 노드 삭제 (연결된 간선도 함께) ──
  // 자식/연결선이 있는 노드는 실수 방지를 위해 확인을 받는다.
  const deleteNode = (id: string) => {
    const linkCount = state.edges.filter((e) => e.from === id || e.to === id).length
    if (linkCount > 0) {
      const ok = window.confirm(`이 노드에 연결선 ${linkCount}개가 있습니다. 노드와 함께 연결선도 삭제할까요?`)
      if (!ok) return
    }
    setState((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== id),
      edges: prev.edges.filter((e) => e.from !== id && e.to !== id),
    }))
    if (selected === id) setSelected(null)
    if (linkFrom === id) setLinkFrom(null)
    if (editing === id) setEditing(null)
  }

  // ── CRUD: 연결 삭제 ──
  const deleteEdge = (id: string) => {
    setState((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== id) }))
    if (selEdge === id) setSelEdge(null)
  }

  // ── 이름 인라인 편집 ──
  const beginEdit = (id: string) => {
    const n = nodeById(id)
    if (!n) return
    setEditing(id); setEditText(n.text); setSelected(id); setSelEdge(null)
  }
  const commitEdit = () => {
    if (!editing) return
    const t = editText.trim() || '(빈 노드)'
    setState((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === editing ? { ...n, text: t } : n)) }))
    setEditing(null)
  }
  const cancelEdit = () => setEditing(null)

  // ── 노드 색 변경 ──
  const setColor = (id: string, color: string) => {
    setState((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.id === id ? { ...n, color } : n)) }))
  }

  // ── 전체 초기화 ──
  const resetAll = () => { setState(defaultState()); setSelected(null); setSelEdge(null); setLinkFrom(null); setEditing(null) }

  // ── 텍스트 개요 생성: 루트(없으면 첫 노드)부터 가지 따라 들여쓰기 트리, 사이클 방지 ──
  const buildOutline = (): string => {
    const { nodes, edges } = state
    if (!nodes.length) return ''
    const adj = new Map<string, string[]>()
    nodes.forEach((n) => adj.set(n.id, []))
    edges.forEach((e) => { adj.get(e.from)?.push(e.to); adj.get(e.to)?.push(e.from) })
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const visited = new Set<string>()
    const lines: string[] = []
    const walk = (id: string, depth: number) => {
      if (visited.has(id)) return
      visited.add(id)
      const n = byId.get(id)
      if (!n) return
      lines.push('  '.repeat(depth) + '- ' + (n.text || '(빈 노드)'))
      const kids = (adj.get(id) || []).filter((k) => !visited.has(k))
      // 가까운 노드부터 안정적으로 정렬(좌표 기준)
      kids.sort((a, b) => {
        const na = byId.get(a)!, nb = byId.get(b)!
        return (na.y - nb.y) || (na.x - nb.x)
      })
      kids.forEach((k) => walk(k, depth + 1))
    }
    const roots = nodes.filter((n) => n.root)
    const starts = roots.length ? roots : [nodes[0]]
    starts.forEach((r) => walk(r.id, 0))
    // 연결 안 된 외톨이 노드도 끝에 모음
    nodes.forEach((n) => { if (!visited.has(n.id)) walk(n.id, 0) })
    return lines.join('\n')
  }

  // ── 중심 노드 이름 (루트 → 없으면 첫 노드) ──
  const centerName = (): string => {
    const root = state.nodes.find((n) => n.root) || state.nodes[0]
    return (root?.text || '').trim()
  }

  // ── 텍스트 개요 → HTML 본문: 같은 트리 순회를 재사용해 중첩 목록(ul/li)으로 변환 ──
  // buildOutline 과 동일한 정렬·사이클 방지 규칙을 따르되, 중심 노드를 제목(h2)으로 올린다.
  const buildOutlineHtml = (): string => {
    const { nodes, edges } = state
    if (!nodes.length) return ''
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const adj = new Map<string, string[]>()
    nodes.forEach((n) => adj.set(n.id, []))
    edges.forEach((e) => { adj.get(e.from)?.push(e.to); adj.get(e.to)?.push(e.from) })
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const visited = new Set<string>()
    // depth 0(중심)은 제목으로, 그 이하 가지는 중첩 ul/li 로 렌더
    const renderChildren = (id: string): string => {
      const kids = (adj.get(id) || []).filter((k) => !visited.has(k))
      kids.sort((a, b) => {
        const na = byId.get(a)!, nb = byId.get(b)!
        return (na.y - nb.y) || (na.x - nb.x)
      })
      if (!kids.length) return ''
      const items = kids.map((k) => {
        if (visited.has(k)) return ''
        visited.add(k)
        const kn = byId.get(k)
        const label = esc(kn?.text || '(빈 노드)')
        return '<li>' + label + renderChildren(k) + '</li>'
      }).join('')
      return items ? '<ul>' + items + '</ul>' : ''
    }
    const parts: string[] = []
    const roots = nodes.filter((n) => n.root)
    const starts = roots.length ? roots : [nodes[0]]
    starts.forEach((r) => {
      if (visited.has(r.id)) return
      visited.add(r.id)
      const rn = byId.get(r.id)
      parts.push('<h2>' + esc(rn?.text || '마인드맵') + '</h2>')
      const sub = renderChildren(r.id)
      if (sub) parts.push(sub)
    })
    // 연결 안 된 외톨이 노드도 끝에 모음
    const orphans = nodes.filter((n) => !visited.has(n.id))
    if (orphans.length) {
      orphans.forEach((n) => visited.add(n.id))
      parts.push('<p>기타</p><ul>' + orphans.map((n) => '<li>' + esc(n.text || '(빈 노드)') + '</li>').join('') + '</ul>')
    }
    return parts.join('\n')
  }

  // ── 연계: 마인드맵을 텍스트 개요로 프로젝트(자료 › 구상)에 추가 ──
  const addOutlineToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!state.nodes.length) { setNote('추가할 노드가 없어요.'); return }
    const title = centerName() || '마인드맵'
    const bodyHtml = buildOutlineHtml()
    const id = addToProject({ kind: 'text', root: 'research', folder: '구상', title, bodyHtml })
    if (id) setNote('프로젝트 자료 › 구상 폴더에 개요를 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요. 연결 상태를 확인해 주세요.')
  }

  const exportOutline = () => {
    const text = buildOutline()
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'mindmap-outline.txt'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setNote('내려받기에 실패했어요. 대신 복사 버튼을 사용하세요.')
    }
  }
  const copyOutline = async () => {
    const text = buildOutline()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1400)
    } catch {
      setNote('복사에 실패했어요. 개요 미리보기에서 직접 선택해 복사하세요.')
    }
  }

  // 캔버스 빈 곳 클릭: 선택 해제 / 연결 모드 취소
  const onCanvasClick = () => { setSelected(null); setSelEdge(null); setLinkFrom(null) }

  // ── 바인더 파일 → 새 노드 (이름=title), 드롭한 마우스 좌표 근처에 배치 ──
  const addNodeFromItem = (item: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }, clientX: number, clientY: number) => {
    // 캔버스(SVG) 내부 좌표로 변환 후 노드 중심이 커서에 오도록 보정
    const { x, y } = toLocal(clientX, clientY)
    const nx = Math.max(0, x - NODE_W / 2)
    const ny = Math.max(0, y - NODE_H / 2)
    const name = (item.character?.name || item.title || '새 노드').trim() || '새 노드'
    const id = newId()
    const color = COLORS[(state.nodes.length) % COLORS.length]
    setState((prev) => ({ ...prev, nodes: [...prev.nodes, { id, text: name, x: nx, y: ny, color }] }))
    setSelected(id); setSelEdge(null)
    setDropped(true); setTimeout(() => { if (mounted.current) setDropped(false) }, 1600)
  }

  // 드래그 진입/오버/이탈/드롭 — 좌측 바인더 파일을 끌어와 노드로 추가
  const onContainerDragEnter = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current += 1
    setDropActive(true)
  }
  const onContainerDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault() }
  }
  const onContainerDragLeave = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDropActive(false)
  }
  const onContainerDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (it) { e.preventDefault(); addNodeFromItem(it, e.clientX, e.clientY) }
  }

  // 키보드: Delete 로 선택 삭제(Backspace 는 삭제하지 않음), Enter 로 편집, Esc 로 취소
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return
    if (e.key === 'Delete') {
      if (selEdge) { e.preventDefault(); deleteEdge(selEdge) }
      else if (selected && !nodeById(selected)?.root) { e.preventDefault(); deleteNode(selected) }
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault(); beginEdit(selected)
    } else if (e.key === 'Escape') {
      setLinkFrom(null); setSelected(null); setSelEdge(null)
    }
  }

  const selNode = nodeById(selected)
  const outline = buildOutline()

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', outline: 'none', position: 'relative' }
  const toolbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const canvasWrap: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', overflow: 'auto', background: 'var(--paper)' }
  const side: React.CSSProperties = { width: 210, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const sideInner: React.CSSProperties = { padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const swatchRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const editInput: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', width: '100%' }
  const preview: React.CSSProperties = { whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, maxHeight: 150, overflow: 'auto', margin: 0 }

  // 캔버스 크기: 노드 범위 + 여유
  const maxX = state.nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0)
  const maxY = state.nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0)
  const cw = Math.max(640, maxX + 200)
  const ch = Math.max(440, maxY + 200)

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragEnter={onContainerDragEnter}
      onDragOver={onContainerDragOver}
      onDragLeave={onContainerDragLeave}
      onDrop={onContainerDrop}
    >
      {dropped && (
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 30, padding: '7px 14px', borderRadius: 8, background: 'var(--ok)', color: '#fff', fontSize: 12.5, fontWeight: 600, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
          ✓ 바인더 파일을 노드로 추가했어요
        </div>
      )}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => addNode()} title="선택 노드에서 새 가지 추가">＋ 가지 추가</button>
        <button
          className={'minibtn'}
          onClick={() => { if (selected) { setLinkFrom(linkFrom ? null : selected) } }}
          disabled={!selected}
          style={linkFrom ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          title="선택 노드에서 연결 시작 → 다른 노드 클릭"
        >{linkFrom ? <><Emoji e="🔗"/> 연결할 노드 클릭…(Esc 취소)</> : <><Emoji e="🔗"/> 연결 모드</>}</button>
        <button className="minibtn" onClick={() => selected && beginEdit(selected)} disabled={!selected}><Emoji e="✏️"/> 이름 편집</button>
        <button className="minibtn" onClick={() => selEdge ? deleteEdge(selEdge) : (selected && !selNode?.root && deleteNode(selected))} disabled={!selEdge && (!selected || !!selNode?.root)} title="선택한 노드/연결 삭제"><Emoji e="🗑️"/> 삭제</button>
        <span style={{ flex: 1 }} />
        <button
          className="linkbtn"
          onClick={addOutlineToProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '마인드맵을 텍스트 개요로 변환해 프로젝트 바인더(자료 › 구상)에 추가' : '프로젝트에 연결되어 있지 않아요'}
        ><Emoji e="📄"/> 프로젝트에 개요로 추가</button>
        <button className="minibtn" onClick={copyOutline}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 개요 복사</>}</button>
        <button className="minibtn" onClick={exportOutline}>⬇ 개요 내보내기</button>
        <button className="minibtn" onClick={resetAll} title="전체 초기화">↺ 초기화</button>
      </div>

      {note && <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        <div style={canvasWrap}>
          <svg
            ref={svgRef}
            width={cw}
            height={ch}
            style={{ display: 'block', touchAction: 'none', cursor: linkFrom ? 'crosshair' : 'default' }}
            onClick={onCanvasClick}
          >
            <defs>
              <pattern id="mm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0 L0 0 0 24" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
              </pattern>
            </defs>
            <rect width={cw} height={ch} fill="url(#mm-grid)" />

            {/* 연결선 */}
            {state.edges.map((e) => {
              const a = nodeById(e.from), b = nodeById(e.to)
              if (!a || !b) return null
              const { x1, y1, x2, y2 } = edgeAnchor(a, b)
              const isSel = selEdge === e.id
              return (
                <g key={e.id}>
                  {/* 넓은 투명 히트영역 */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14}
                    style={{ cursor: 'pointer' }}
                    onClick={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelected(null) }} />
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isSel ? 'var(--accent)' : 'var(--muted)'}
                    strokeWidth={isSel ? 3 : 2} strokeLinecap="round" pointerEvents="none" />
                  {isSel && (
                    <g transform={`translate(${(x1 + x2) / 2 - 9}, ${(y1 + y2) / 2 - 9})`} style={{ cursor: 'pointer' }}
                      onClick={(ev) => { ev.stopPropagation(); deleteEdge(e.id) }}>
                      <circle cx={9} cy={9} r={10} fill="var(--warn)" />
                      <line x1={5} y1={9} x2={13} y2={9} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              )
            })}

            {/* 노드 */}
            {state.nodes.map((n) => {
              const isSel = selected === n.id
              const isLinkStart = linkFrom === n.id
              return (
                <g key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: linkFrom ? 'crosshair' : 'grab' }}
                  onPointerDown={(e) => startDrag(e, n.id)}
                  onClick={(e) => onNodeClick(e, n.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); beginEdit(n.id) }}
                >
                  <rect width={NODE_W} height={NODE_H} rx={n.root ? 23 : 11}
                    fill={n.color}
                    stroke={isSel || isLinkStart ? 'var(--text)' : 'rgba(0,0,0,0.18)'}
                    strokeWidth={isSel || isLinkStart ? 3 : 1.5}
                    opacity={n.root ? 1 : 0.95} />
                  {editing === n.id ? null : (
                    <text x={NODE_W / 2} y={NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={n.root ? 14 : 13} fontWeight={n.root ? 700 : 600}
                      fill="#fff" pointerEvents="none" style={{ userSelect: 'none' }}>
                      {n.text.length > 12 ? n.text.slice(0, 11) + '…' : n.text}
                    </text>
                  )}
                  {/* 빠른 가지 추가 버튼 (선택 시) */}
                  {isSel && !editing && (
                    <g transform={`translate(${NODE_W - 11}, ${-11})`} style={{ cursor: 'pointer' }}
                      onClick={(ev) => { ev.stopPropagation(); addNode(n.id) }}>
                      <circle cx={0} cy={0} r={11} fill="var(--ok)" stroke="#fff" strokeWidth={1.5} />
                      <line x1={-5} y1={0} x2={5} y2={0} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                      <line x1={0} y1={-5} x2={0} y2={5} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              )
            })}
          </svg>

          {/* 인라인 편집 입력 — SVG 위에 절대배치 (좌표는 노드 위치 기준) */}
          {editing && (() => {
            const n = nodeById(editing)
            if (!n) return null
            return (
              <input
                ref={editInputRef}
                style={{
                  position: 'absolute', left: n.x, top: n.y, width: NODE_W, height: NODE_H,
                  textAlign: 'center', fontSize: 13, fontWeight: 600,
                  borderRadius: 11, border: '2px solid var(--accent)',
                  background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', padding: '0 6px',
                }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                }}
                maxLength={60}
                aria-label="노드 이름 편집"
              />
            )
          })()}
        </div>

        {/* 사이드 패널 */}
        <div style={side}>
          <div style={sideInner}>
            <div style={card}>
              <div style={label}>선택한 항목</div>
              {selNode ? (
                <>
                  {editing === selNode.id ? (
                    <input
                      style={editInput}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); else if (e.key === 'Escape') cancelEdit() }}
                      maxLength={60}
                      autoFocus
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>{selNode.text || '(빈 노드)'} {selNode.root && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· 중심</span>}</div>
                  )}
                  <div style={swatchRow}>
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => setColor(selNode.id, c)} title="색 변경"
                        style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer', border: selNode.color === c ? '2px solid var(--text)' : '1px solid var(--border)' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => beginEdit(selNode.id)}><Emoji e="✏️"/> 이름</button>
                    <button className="minibtn" onClick={() => addNode(selNode.id)}>＋ 가지</button>
                    <button className="minibtn" onClick={() => setLinkFrom(linkFrom ? null : selNode.id)} style={linkFrom === selNode.id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}><Emoji e="🔗"/> 연결</button>
                    {!selNode.root && <button className="minibtn" onClick={() => deleteNode(selNode.id)} style={{ color: 'var(--warn)' }}><Emoji e="🗑️"/> 삭제</button>}
                  </div>
                </>
              ) : selEdge ? (
                <>
                  <div style={{ fontSize: 13 }}>연결선 1개 선택됨</div>
                  <button className="minibtn" onClick={() => deleteEdge(selEdge)} style={{ color: 'var(--warn)', alignSelf: 'flex-start' }}><Emoji e="🗑️"/> 연결 삭제</button>
                </>
              ) : (
                <div style={hint}>노드를 클릭해 선택하거나, 빈 곳을 드래그 없이 사용하세요. <b>＋ 가지 추가</b>로 시작!</div>
              )}
            </div>

            <div style={card}>
              <div style={label}>개요 미리보기</div>
              {outline ? <pre style={preview}>{outline}</pre> : <div style={hint}>노드가 없습니다.</div>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="minibtn" onClick={copyOutline} style={{ flex: 1 }}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                <button className="minibtn" onClick={exportOutline} style={{ flex: 1 }}>⬇ 저장</button>
              </div>
            </div>

            <div style={{ ...card, gap: 6 }}>
              <div style={label}>사용법</div>
              <div style={hint}>
                • <b>＋ 가지 추가</b>: 선택 노드에서 자식 노드 생성<br />
                • 노드 <b>드래그</b>로 이동, <b>더블클릭</b>으로 이름 편집<br />
                • <b><Emoji e="🔗"/> 연결 모드</b> 후 다른 노드 클릭 → 연결선<br />
                • 연결선 클릭 → 선택 후 삭제<br />
                • 선택 후 <b>Delete</b> 키로 삭제, <b>Enter</b>로 편집<br />
                • 노드 우상단 <b>＋</b> 버튼으로 빠른 가지치기<br />
                • 모든 변경은 자동 저장됩니다.
              </div>
              <div style={{ ...hint, color: 'var(--muted)' }}>노드 {state.nodes.length}개 · 연결 {state.edges.length}개</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
