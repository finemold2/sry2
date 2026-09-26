// 스토리 캔버스 — 옵시디언 Canvas 동일 구현. 무한 캔버스에 text/file/group 노드를 자유 배치하고
// 4면 앵커 베지에 엣지로 연결. 바인더에서 문서를 드래그해 파일 카드로 배치(내용 표시·더블클릭 열기).
// 다중 선택(박스/Shift)·그룹 묶기·휠 팬/Ctrl+휠 줌·전체 맞춤·Delete 삭제.
// 조작(팬·노드 이동·리사이즈·포트 연결·마퀴)은 onPointerDown + setPointerCapture 로 통일해
// 마우스·터치·펜 모두 지원(#5 터치 대응). 조작 표면에는 touchAction:'none' 인라인 지정.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { rtfToHtml } from '../rtf'
import { newId, type CanvasState, type CanvasNode, type CanvasEdge, type CanvasSide, type BinderItem } from '../model'
import { Icon } from '../ui/icons'

const NODE_COLORS = ['#ffffff', '#fde68a', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fecaca']
const empty: CanvasState = { nodes: [], edges: [] }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const NORMAL: Record<CanvasSide, [number, number]> = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }

const nodeType = (n: CanvasNode): 'text' | 'file' | 'group' => n.type || (n.itemId ? 'file' : 'text')
function anchor(n: CanvasNode, side: CanvasSide) {
  switch (side) {
    case 'top': return { x: n.x + n.w / 2, y: n.y }
    case 'right': return { x: n.x + n.w, y: n.y + n.h / 2 }
    case 'bottom': return { x: n.x + n.w / 2, y: n.y + n.h }
    case 'left': return { x: n.x, y: n.y + n.h / 2 }
  }
}
function bestSides(a: CanvasNode, b: CanvasNode): [CanvasSide, CanvasSide] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['right', 'left'] : ['left', 'right']
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}
function edgeGeom(a: CanvasNode, b: CanvasNode, fromSide?: CanvasSide, toSide?: CanvasSide) {
  let fs = fromSide, ts = toSide
  if (!fs || !ts) { const [x, y] = bestSides(a, b); fs = fs || x; ts = ts || y }
  const p1 = anchor(a, fs), p2 = anchor(b, ts)
  const k = Math.max(40, Math.min(160, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2))
  const n1 = NORMAL[fs], n2 = NORMAL[ts]
  const c1 = { x: p1.x + n1[0] * k, y: p1.y + n1[1] * k }, c2 = { x: p2.x + n2[0] * k, y: p2.y + n2[1] * k }
  return { d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`, mid: { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 } }
}

// 포인터 드래그 공용 배선(#5 터치 대응) — 마우스/터치/펜을 onPointerDown + setPointerCapture 로 통일.
// 리스너는 window 에 달아 빠른 드래그에도 좌표를 놓치지 않고(App Resizer 와 동일 패턴), 같은 pointerId 만
// 처리해 멀티터치 간섭을 막는다. pointercancel(브라우저 제스처 개입 등)도 종료로 배선해 리스너·플래그가
// 남지 않게 한다 — onUp 에서 ev.type === 'pointercancel' 로 취소 여부를 구분할 수 있다.
function dragPointer(e: React.PointerEvent, onMove: (ev: PointerEvent) => void, onUp: (ev: PointerEvent) => void) {
  const pid = e.pointerId
  const el = e.currentTarget as HTMLElement
  try { el.setPointerCapture(pid) } catch { /* noop */ }
  const mv = (ev: PointerEvent) => { if (ev.pointerId === pid) onMove(ev) }
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== pid) return
    try { el.releasePointerCapture(pid) } catch { /* noop */ }
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
    onUp(ev)
  }
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
}

export default function StoryCanvas() {
  const project = useStore((s) => s.project)
  const setCanvas = useStore((s) => s.setCanvas)
  const setBodyHtml = useStore((s) => s.setBodyHtml)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const activeId = useStore((s) => s.activeId)

  const [canvas, setCanvasState] = useState<CanvasState>(() => project.canvas || empty)
  const canvasRef = useRef(canvas); canvasRef.current = canvas
  const [view, setViewState] = useState({ ox: 60, oy: 60, scale: 1 })
  const viewRef = useRef(view); viewRef.current = view
  const [sel, setSel] = useState<string[]>([])
  const selRef = useRef(sel); selRef.current = sel
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<{ from: string; side: CanvasSide; wx: number; wy: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [picker, setPicker] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const spaceRef = useRef(false)
  const interactingRef = useRef(false) // 로컬 드래그/리사이즈/연결 등 포인터 상호작용 진행 중 표시(외부 흡수 차단용)

  useEffect(() => {
    // 프로젝트 전환 시 전부 리셋 — 특히 lastDeleted(Ctrl+Z 복구 버퍼)를 비워, 이전 프로젝트에서 지운
    // 노드가 새 프로젝트 캔버스에 주입·영속되는 것을 차단(리뷰 F7). stale editing/connecting 도 함께 정리.
    setCanvasState(project.canvas || empty); setSel([]); setSelEdge(null); setEditing(null); setConnecting(null)
    lastDeleted.current = null
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 다중 탭 동기화: 다른 탭에서 캔버스(노드/엣지)를 편집해 외부 project.canvas 참조가 바뀌면, 로컬 편집 중이
  // 아닐 때만 그 변경을 흡수한다. 우리 탭이 setCanvas 한 객체는 store 가 동일 참조로 보관하므로(얕은 복제)
  // canvasRef.current 와 참조가 같아 자기 변경에는 반응하지 않는다(무한 루프 방지). 편집(인라인 입력/포인터
  // 상호작용) 중에는 흡수를 미뤄 입력 충돌·캐럿 깨짐을 막는다.
  useEffect(() => {
    const ext = project.canvas || empty
    if (ext === canvasRef.current) return // 자기 변경이거나 변화 없음
    if (editing !== null || connecting || marquee || interactingRef.current) return // 로컬 편집 중 → 흡수 보류
    setCanvasState(ext)
  }, [project.canvas, editing, connecting, marquee]) // eslint-disable-line react-hooks/exhaustive-deps

  // 스페이스바 = 팬 모드
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === 'Space' && !isTyping()) spaceRef.current = true }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false }
    const del = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping()) {
        if (selRef.current.length) { e.preventDefault(); deleteNodes(selRef.current) }
        else if (selEdgeRef.current) { e.preventDefault(); deleteEdge(selEdgeRef.current) }
      }
      // Ctrl/⌘+Z: 마지막 삭제 되살리기 — Delete 가 메모 카드 내용까지 즉시 지우므로 안전망 제공(#28).
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTyping() && lastDeleted.current) {
        e.preventDefault()
        const d = lastDeleted.current; lastDeleted.current = null
        apply({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, ...d.nodes], edges: [...canvasRef.current.edges, ...d.edges] })
        try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '삭제를 되돌렸습니다.' })) } catch { /* noop */ }
      }
      if (e.key === 'Escape') { setSel([]); setSelEdge(null); setEditing(null) }
    }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up); window.addEventListener('keydown', del)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); window.removeEventListener('keydown', del) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const selEdgeRef = useRef(selEdge); selEdgeRef.current = selEdge

  const persist = (c: CanvasState) => setCanvas(c)
  const apply = (c: CanvasState, doPersist = true) => { setCanvasState(c); if (doPersist) persist(c) }
  const patchNodes = (ids: string[], fn: (n: CanvasNode) => Partial<CanvasNode>, doPersist = true) => {
    const set = new Set(ids)
    apply({ ...canvasRef.current, nodes: canvasRef.current.nodes.map((n) => (set.has(n.id) ? { ...n, ...fn(n) } : n)) }, doPersist)
  }
  const screenToWorld = (cx: number, cy: number) => {
    const r = wrapRef.current!.getBoundingClientRect(); const v = viewRef.current
    return { x: (cx - r.left - v.ox) / v.scale, y: (cy - r.top - v.oy) / v.scale }
  }
  const centerWorld = () => { const r = wrapRef.current?.getBoundingClientRect(); return r ? screenToWorld(r.left + r.width / 2, r.top + r.height / 2) : { x: 100, y: 100 } }

  // ---- 노드 추가 ----
  const addText = () => { const c = centerWorld(); const n: CanvasNode = { id: newId(), type: 'text', x: c.x - 90, y: c.y - 50, w: 200, h: 110, text: '' }; apply({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, n] }); setSel([n.id]); setEditing(n.id) }
  const addGroup = (at?: { x: number; y: number }, label = '그룹') => { const c = at || centerWorld(); const n: CanvasNode = { id: newId(), type: 'group', x: c.x - 180, y: c.y - 130, w: 360, h: 260, text: label }; apply({ ...canvasRef.current, nodes: [n, ...canvasRef.current.nodes] }); setSel([n.id]) }
  const addFile = (itemId: string, at?: { x: number; y: number }) => {
    const c = at || centerWorld(); const n: CanvasNode = { id: newId(), type: 'file', x: c.x - 110, y: c.y - 80, w: 240, h: 180, itemId, color: '#bfdbfe' }
    apply({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, n] }); setSel([n.id])
  }
  // 폴더를 캔버스에 떨어뜨리면 그룹 안에 내부 문서 카드를 격자로 배치하고, 하위 폴더는 중첩 그룹으로 재귀 생성한다.
  const FILE_W = 220, FILE_H = 160, GAP = 16, PAD = 16, HEAD = 38
  const buildFolder = (folderId: string, ox: number, oy: number): { nodes: CanvasNode[]; w: number; h: number } => {
    const folder = project.items[folderId]
    const kids = (folder?.childIds || []).map((id) => project.items[id]).filter(Boolean)
    const docs = kids.filter((k) => k.type !== 'folder') // 폴더 외 모든 자식(text/character/image/pdf/file)을 카드로
    const subs = kids.filter((k) => k.type === 'folder')
    const innerX = ox + PAD, innerY = oy + HEAD
    const children: CanvasNode[] = []
    const cols = Math.max(1, Math.min(3, docs.length || 1))
    let contentW = 0, cursorY = innerY
    docs.forEach((d, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      children.push({ id: newId(), type: 'file', x: innerX + col * (FILE_W + GAP), y: innerY + row * (FILE_H + GAP), w: FILE_W, h: FILE_H, itemId: d.id, color: '#bfdbfe' })
    })
    if (docs.length) {
      const rows = Math.ceil(docs.length / cols)
      contentW = Math.max(contentW, cols * FILE_W + (cols - 1) * GAP)
      cursorY = innerY + rows * (FILE_H + GAP)
    }
    for (const sf of subs) {
      const sub = buildFolder(sf.id, innerX, cursorY)
      children.push(...sub.nodes)
      contentW = Math.max(contentW, sub.w)
      cursorY += sub.h + GAP
    }
    const used = docs.length || subs.length
    const w = Math.max(FILE_W + PAD * 2, contentW + PAD * 2)
    const h = Math.max(HEAD + FILE_H * 0.6, (used ? cursorY - GAP : innerY + FILE_H) - oy + PAD)
    const group: CanvasNode = { id: newId(), type: 'group', x: ox, y: oy, w, h, text: folder?.title || '폴더', color: '#a78bfa' }
    return { nodes: [group, ...children], w, h }
  }
  const addFolder = (folderId: string, at?: { x: number; y: number }) => {
    const c = at || centerWorld()
    const built = buildFolder(folderId, 0, 0)
    // 파일 카드가 하나도 없으면(빈 폴더 / 빈 하위폴더만 있는 경우) 빈 그룹 하나로 축약
    if (built.nodes.filter((n) => n.type === 'file').length === 0) { addGroup(c, project.items[folderId]?.title || '폴더'); return }
    const ddx = c.x - built.w / 2, ddy = c.y - HEAD
    const moved = built.nodes.map((n) => ({ ...n, x: n.x + ddx, y: n.y + ddy }))
    apply({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, ...moved] })
    setSel(moved.filter((n) => n.type === 'group').map((n) => n.id))
  }
  // 바인더 아이템(문서/폴더) 공용 추가
  const addAny = (id: string, at?: { x: number; y: number }) => {
    const it = project.items[id]
    if (it?.type === 'folder') addFolder(id, at)
    else addFile(id, at)
  }
  // 마지막 삭제분(노드+연결선) 1회 복구 버퍼 — Ctrl+Z 로 되살린다(#28 파괴적 동작 안전망).
  const lastDeleted = useRef<{ nodes: CanvasNode[]; edges: CanvasState['edges'] } | null>(null)
  const deleteNodes = (ids: string[]) => {
    const set = new Set(ids)
    lastDeleted.current = { nodes: canvasRef.current.nodes.filter((n) => set.has(n.id)), edges: canvasRef.current.edges.filter((e) => set.has(e.from) || set.has(e.to)) }
    apply({ nodes: canvasRef.current.nodes.filter((n) => !set.has(n.id)), edges: canvasRef.current.edges.filter((e) => !set.has(e.from) && !set.has(e.to)) })
    setSel([])
    try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '카드를 삭제했습니다 — Ctrl+Z 로 되돌릴 수 있어요.' })) } catch { /* noop */ }
  }
  const deleteEdge = (id: string) => { apply({ ...canvasRef.current, edges: canvasRef.current.edges.filter((e) => e.id !== id) }); setSelEdge(null) }

  const nodeById = (id: string) => canvas.nodes.find((n) => n.id === id)

  // ---- 마퀴(드래그 박스) 선택 — 배경과 그룹 본문 빈 영역에서 공용 ----
  const startMarquee = (e: React.PointerEvent) => {
    const start = screenToWorld(e.clientX, e.clientY)
    if (!e.shiftKey) setSel([])
    let moved = false
    const base = e.shiftKey ? [...selRef.current] : []
    dragPointer(e, (ev) => {
      moved = true
      const p = screenToWorld(ev.clientX, ev.clientY)
      const box = { x0: Math.min(start.x, p.x), y0: Math.min(start.y, p.y), x1: Math.max(start.x, p.x), y1: Math.max(start.y, p.y) }
      setMarquee(box)
      const inside = canvasRef.current.nodes.filter((n) => nodeType(n) !== 'group' && n.x < box.x1 && n.x + n.w > box.x0 && n.y < box.y1 && n.y + n.h > box.y0).map((n) => n.id)
      setSel([...new Set([...base, ...inside])])
    }, () => { setMarquee(null); if (!moved && !e.shiftKey) setSel([]) })
  }
  // ---- 배경: 팬 또는 마퀴 선택 ----
  const onBgDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    setSelEdge(null)
    const panning = e.button === 1 || spaceRef.current
    if (panning) {
      const s = { x: e.clientX, y: e.clientY, ox: viewRef.current.ox, oy: viewRef.current.oy }
      dragPointer(e, (ev) => setViewState((v) => ({ ...v, ox: s.ox + ev.clientX - s.x, oy: s.oy + ev.clientY - s.y })), () => { /* noop */ })
      return
    }
    startMarquee(e)
  }
  // 휠: 브라우저 기본 페이지 줌/스크롤이 함께 발동하지 않도록 네이티브 비-passive 리스너로 preventDefault.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect(); const cx = e.clientX - r.left, cy = e.clientY - r.top
        const ns = clamp(v.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.15, 3)
        const wx = (cx - v.ox) / v.scale, wy = (cy - v.oy) / v.scale
        setViewState({ scale: ns, ox: cx - wx * ns, oy: cy - wy * ns })
      } else {
        setViewState((vv) => ({ ...vv, ox: vv.ox - (e.shiftKey ? e.deltaY : e.deltaX), oy: vv.oy - (e.shiftKey ? 0 : e.deltaY) }))
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])
  // ---- 노드 이동(다중) ----
  const onNodeDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (e.button !== 0 || editing === node.id) return
    // 그룹 본문 빈 영역 pointerdown 은 그룹 이동이 아니라 마퀴 선택으로 위임(그룹은 라벨로 이동).
    if (nodeType(node) === 'group' && e.target === e.currentTarget && !e.shiftKey) { setSelEdge(null); startMarquee(e); return }
    e.stopPropagation(); setSelEdge(null)
    let ids = selRef.current
    if (e.shiftKey) { ids = ids.includes(node.id) ? ids.filter((x) => x !== node.id) : [...ids, node.id]; setSel(ids) }
    else if (!ids.includes(node.id)) { ids = [node.id]; setSel(ids) }
    // 그룹을 끌면 안에 든 노드도 함께
    const moveIds = new Set(ids)
    if (nodeType(node) === 'group') for (const n of canvasRef.current.nodes) { const cx = n.x + n.w / 2, cy = n.y + n.h / 2; if (n.id !== node.id && cx > node.x && cx < node.x + node.w && cy > node.y && cy < node.y + node.h) moveIds.add(n.id) }
    const startPos = new Map(canvasRef.current.nodes.filter((n) => moveIds.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]))
    const s = { x: e.clientX, y: e.clientY }
    let moved = false // 임계값 통과 전에는 이동하지 않음 — 미세 흔들림(특히 Shift 토글)으로 선택 노드가 밀리는 것 방지
    interactingRef.current = true
    dragPointer(e, (ev) => {
      const sc = viewRef.current.scale, dxr = ev.clientX - s.x, dyr = ev.clientY - s.y
      if (!moved && Math.abs(dxr) + Math.abs(dyr) < 4) return
      moved = true
      const dx = dxr / sc, dy = dyr / sc
      apply({ ...canvasRef.current, nodes: canvasRef.current.nodes.map((n) => startPos.has(n.id) ? { ...n, x: startPos.get(n.id)!.x + dx, y: startPos.get(n.id)!.y + dy } : n) }, false)
    }, () => { interactingRef.current = false; if (moved) persist(canvasRef.current) })
  }
  const onResizeDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation()
    const s = { x: e.clientX, y: e.clientY, w: node.w, h: node.h }
    interactingRef.current = true
    dragPointer(e, (ev) => { const sc = viewRef.current.scale; patchNodes([node.id], () => ({ w: Math.max(120, s.w + (ev.clientX - s.x) / sc), h: Math.max(60, s.h + (ev.clientY - s.y) / sc) }), false) },
      () => { interactingRef.current = false; persist(canvasRef.current) })
  }
  const onPortDown = (e: React.PointerEvent, node: CanvasNode, side: CanvasSide) => {
    e.stopPropagation()
    const w = screenToWorld(e.clientX, e.clientY); setConnecting({ from: node.id, side, wx: w.x, wy: w.y })
    dragPointer(e, (ev) => { const p = screenToWorld(ev.clientX, ev.clientY); setConnecting({ from: node.id, side, wx: p.x, wy: p.y }) }, (ev) => {
      setConnecting(null)
      if (ev.type === 'pointercancel') return // 터치 제스처 개입 등으로 중단 — 좌표를 신뢰할 수 없으니 연결 미생성
      const tgt = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('[data-node-id]') as HTMLElement | null
      const to = tgt?.dataset.nodeId
      if (to && to !== node.id && !canvasRef.current.edges.some((x) => x.from === node.id && x.to === to)) {
        const a = canvasRef.current.nodes.find((n) => n.id === node.id)!, b = canvasRef.current.nodes.find((n) => n.id === to)!
        const [, ts] = bestSides(a, b)
        const edge: CanvasEdge = { id: newId(), from: node.id, to, fromSide: side, toSide: ts }
        apply({ ...canvasRef.current, edges: [...canvasRef.current.edges, edge] })
      }
    })
  }

  const fit = () => {
    const ns = canvas.nodes
    if (!ns.length) { setViewState({ ox: 60, oy: 60, scale: 1 }); return }
    const x0 = Math.min(...ns.map((n) => n.x)), y0 = Math.min(...ns.map((n) => n.y))
    const x1 = Math.max(...ns.map((n) => n.x + n.w)), y1 = Math.max(...ns.map((n) => n.y + n.h))
    const r = wrapRef.current!.getBoundingClientRect(); const pad = 60
    const scale = clamp(Math.min((r.width - pad * 2) / (x1 - x0 || 1), (r.height - pad * 2) / (y1 - y0 || 1)), 0.15, 1.5)
    setViewState({ scale, ox: pad - x0 * scale + (r.width - pad * 2 - (x1 - x0) * scale) / 2, oy: pad - y0 * scale + (r.height - pad * 2 - (y1 - y0) * scale) / 2 })
  }

  const groups = canvas.nodes.filter((n) => nodeType(n) === 'group')
  const items = canvas.nodes.filter((n) => nodeType(n) !== 'group')

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <button className="minibtn" onClick={addText}>+ 카드</button>
        <button className="minibtn" onClick={() => setPicker(true)}>+ 문서 카드</button>
        <button className="minibtn" onClick={() => addGroup()}>+ 그룹</button>
        <span className="canvas-sep" />
        <button className="minibtn" onClick={() => setViewState((v) => ({ ...v, scale: clamp(v.scale * 1.15, 0.15, 3) }))}>＋</button>
        <button className="minibtn" onClick={() => setViewState((v) => ({ ...v, scale: clamp(v.scale / 1.15, 0.15, 3) }))}>－</button>
        <button className="minibtn" onClick={fit}>전체 맞춤</button>
        <span className="canvas-hint">바인더 문서를 끌어다 놓기 · 휠=이동, Ctrl+휠=확대 · 면의 점을 끌어 연결 · 드래그=다중선택 · Del=삭제</span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 11 }}>{items.length}카드 · {groups.length}그룹 · {canvas.edges.length}연결 · {Math.round(view.scale * 100)}%</span>
      </div>
      <div
        className="canvas-area" ref={wrapRef} onPointerDown={onBgDown} style={{ touchAction: 'none' }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('text/scriv-id')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData('text/scriv-id'); const it = project.items[id]
          if (id && it) { e.preventDefault(); const at = screenToWorld(e.clientX, e.clientY); addAny(id, at) }
        }}
      >
        <div className="canvas-viewport" style={{ transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.scale})` }}>
          {/* 그룹(배경) */}
          {groups.map((n) => (
            <div key={n.id} data-node-id={n.id} className={'canvas-group' + (sel.includes(n.id) ? ' selected' : '')} style={{ left: n.x, top: n.y, width: n.w, height: n.h, borderColor: n.color || 'var(--accent)', touchAction: 'none' }} onPointerDown={(e) => onNodeDown(e, n)} onDoubleClick={(e) => { e.stopPropagation(); setEditing(n.id) }}>
              {editing === n.id ? (
                <input className="canvas-group-label-input" autoFocus defaultValue={n.text || ''} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { patchNodes([n.id], () => ({ text: e.target.value })); setEditing(null) }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
              ) : (
                <div className="canvas-group-label">{n.text || '그룹'}</div>
              )}
              {sel.includes(n.id) && <NodeTools node={n} colors onColor={(c) => patchNodes([n.id], () => ({ color: c }))} onDel={() => deleteNodes([n.id])} />}
              <div className="canvas-resize" style={{ touchAction: 'none' }} onPointerDown={(e) => onResizeDown(e, n)} />
            </div>
          ))}
          {/* 엣지 */}
          <svg className="canvas-edges" width="10000" height="10000" style={{ left: -5000, top: -5000, overflow: 'visible' }}>
            <defs><marker id="cv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" /></marker></defs>
            <g transform="translate(5000,5000)">
              {canvas.edges.map((e) => {
                const a = nodeById(e.from), b = nodeById(e.to); if (!a || !b) return null
                const g = edgeGeom(a, b, e.fromSide, e.toSide)
                return (
                  <g key={e.id} className={'canvas-edge' + (selEdge === e.id ? ' selected' : '')} onPointerDown={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSel([]) }} onDoubleClick={(ev) => { ev.stopPropagation(); const l = window.prompt('연결 라벨:', e.label || ''); if (l !== null) apply({ ...canvasRef.current, edges: canvasRef.current.edges.map((x) => x.id === e.id ? { ...x, label: l } : x) }) }}>
                    <path d={g.d} fill="none" stroke="transparent" strokeWidth={16} />
                    <path d={g.d} fill="none" stroke={selEdge === e.id ? 'var(--warn)' : 'var(--accent)'} strokeWidth={selEdge === e.id ? 3 : 2} markerEnd="url(#cv-arrow)" />
                    {e.label && <text x={g.mid.x} y={g.mid.y} textAnchor="middle" fontSize="11" fill="var(--text)" className="canvas-edge-label">{e.label}</text>}
                  </g>
                )
              })}
              {connecting && nodeById(connecting.from) && (() => { const p = anchor(nodeById(connecting.from)!, connecting.side); return <line x1={p.x} y1={p.y} x2={connecting.wx} y2={connecting.wy} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" /> })()}
            </g>
          </svg>
          {/* 카드(text/file) */}
          {items.map((n) => {
            const t = nodeType(n); const item = n.itemId ? project.items[n.itemId] : undefined
            return (
              <div key={n.id} data-node-id={n.id} className={'canvas-node ' + t + (sel.includes(n.id) ? ' selected' : '')} style={{ left: n.x, top: n.y, width: n.w, height: n.h, background: n.color || '#ffffff', touchAction: 'none' }}
                onPointerDown={(e) => onNodeDown(e, n)}
                onDoubleClick={(e) => { e.stopPropagation(); if (t === 'file') { if (item) { select(n.itemId!); setView('editor') } } else setEditing(n.id) }}>
                {t === 'file' ? (
                  <>
                    <div className="canvas-file-head">
                      <span className="canvas-file-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="editor" size={14} mono />{item ? item.title : '(삭제된 문서)'}</span>
                      {item && (editing === n.id ? (
                        <button className="canvas-file-btn done" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setEditing(null) }} title="편집 완료">✓ 완료</button>
                      ) : (
                        <span className="canvas-file-actions" onPointerDown={(e) => e.stopPropagation()}>
                          <button className="canvas-file-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={(e) => { e.stopPropagation(); setEditing(n.id) }} title="여기서 바로 편집"><Icon name="revise" size={13} mono />편집</button>
                          <button className="canvas-file-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={(e) => { e.stopPropagation(); select(n.itemId!); setView('editor') }} title="에디터에서 열기"><Icon name="detach" size={13} mono />열기</button>
                        </span>
                      ))}
                    </div>
                    {item && editing === n.id ? (
                      <FileCardEditor item={item} onCommit={(html) => setBodyHtml(item.id, html)} />
                    ) : (
                      <div className="canvas-file-body" onPointerDown={(e) => e.stopPropagation()} dangerouslySetInnerHTML={{ __html: item ? rtfToHtml(item.bodyRtf || '') : '' }} />
                    )}
                  </>
                ) : editing === n.id ? (
                  <textarea className="canvas-node-text" autoFocus defaultValue={n.text || ''} onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { patchNodes([n.id], () => ({ text: e.target.value })); setEditing(null) }} placeholder="메모… (Markdown)" />
                ) : (
                  <div className="canvas-node-view">{n.text || <span className="canvas-ph">더블클릭해 입력</span>}</div>
                )}
                {sel.includes(n.id) && sel.length === 1 && <NodeTools node={n} colors onColor={(c) => patchNodes([n.id], () => ({ color: c }))} onDel={() => deleteNodes([n.id])} />}
                {(['top', 'right', 'bottom', 'left'] as CanvasSide[]).map((s) => <div key={s} className={'canvas-port ' + s} style={{ touchAction: 'none' }} onPointerDown={(e) => onPortDown(e, n, s)} title="끌어서 연결" />)}
                <div className="canvas-resize" style={{ touchAction: 'none' }} onPointerDown={(e) => onResizeDown(e, n)} />
              </div>
            )
          })}
          {marquee && <div className="canvas-marquee" style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }} />}
        </div>
        {canvas.nodes.length === 0 && (
          <div className="canvas-empty">빈 캔버스입니다. <b>+ 카드</b>·<b>+ 문서 카드</b>·<b>+ 그룹</b> 으로 추가하거나, <b>바인더의 문서를 끌어다 놓으세요</b>.<br />카드 면의 점을 끌어 화살표로 연결할 수 있습니다.</div>
        )}
      </div>
      {picker && <DocPicker onPick={(id) => { addAny(id); setPicker(false) }} onClose={() => setPicker(false)} preferActive={activeId} />}
    </div>
  )
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

// 캔버스 파일 카드 인라인 편집기 — 카드 안에서 바로 본문을 고치고, 편집 결과를 스토어에 반영해
// 같은 문서가 열린 모든 곳(에디터·퀵레퍼런스·다른 파일 카드)에 실시간 동기화한다.
function FileCardEditor({ item, onCommit }: { item: BinderItem; onCommit: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const onCommitRef = useRef(onCommit); onCommitRef.current = onCommit
  const flush = () => { if (ref.current) onCommitRef.current(ref.current.innerHTML) }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = rtfToHtml(item.bodyRtf || '')
    el.focus()
    // 끝으로 캐럿 이동
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false)
    const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r)
    // 언마운트(완료 클릭 등) 시: 대기 중인 디바운스를 취소하되 마지막 내용은 반드시 커밋(편집 유실 방지).
    // passive cleanup 시점엔 ref.current 가 이미 null 이므로, 캡처한 노드 el 의 innerHTML 을 읽는다(분리돼도 내용 보존).
    return () => { if (timer.current) clearTimeout(timer.current); onCommitRef.current(el.innerHTML) }
  }, []) // 마운트 시 1회만 — 편집 중 외부 재렌더가 캐럿을 깨지 않도록 innerHTML 을 다시 세팅하지 않는다.
  return (
    <div
      ref={ref}
      className="canvas-file-body canvas-file-edit"
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onInput={() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 300) }}
      onBlur={flush}
    />
  )
}

function NodeTools({ node, onColor, onDel }: { node: CanvasNode; colors?: boolean; onColor: (c: string) => void; onDel: () => void }) {
  return (
    <div className="canvas-node-tools" onPointerDown={(e) => e.stopPropagation()}>
      {NODE_COLORS.map((c) => <button key={c} className="canvas-color" style={{ background: c }} onClick={() => onColor(c)} title="색" />)}
      <button className="canvas-del" onClick={onDel} title="삭제">✕</button>
      <span style={{ display: 'none' }}>{node.id}</span>
    </div>
  )
}

function DocPicker({ onPick, onClose, preferActive }: { onPick: (id: string) => void; onClose: () => void; preferActive: string | null }) {
  const project = useStore((s) => s.project)
  const [q, setQ] = useState('')
  const docs = Object.values(project.items).filter((it) => (it.type === 'text' || it.type === 'character' || it.type === 'folder') && !it.root && it.title.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 460, maxHeight: '70vh' }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>문서 카드 추가</h2>
        <div className="modal-body">
          <input autoFocus className="field" style={{ width: '100%', marginBottom: 10 }} placeholder="문서 검색…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ maxHeight: '46vh', overflow: 'auto' }}>
            {preferActive && project.items[preferActive] && !q && (
              <button className="cs-gen-item" style={{ width: '100%', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onPick(preferActive)}><Icon name="star" size={14} />현재 문서: {project.items[preferActive].title}</button>
            )}
            {docs.map((it) => <button key={it.id} className="cs-gen-item" style={{ width: '100%', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => onPick(it.id)}><Icon name={it.type === 'folder' ? 'binder' : it.type === 'character' ? 'character' : 'editor'} size={14} mono />{it.title}</button>)}
            {docs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>문서가 없습니다.</div>}
          </div>
        </div>
        <div className="modal-foot"><button className="btn-primary" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  )
}
