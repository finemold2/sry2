// 세계관 관계 그래프 — 인물·장소·세력·사건을 노드로 놓고, 방향성 관계선(라벨·유형·색)으로 잇는
// 자유배치 SVG 캔버스. 노드 종류별 모양/색/아이콘 구분. 팬(빈 공간 드래그)·줌, 노드 드래그 배치,
// 종류별 필터, 인물 하이라이트(이웃만 강조), 인물/장소 공유 라이브러리(useLibraryList) 불러오기,
// 좌측 바인더 파일 드롭(인물/장소 카드는 종류 자동 판별)으로 노드 추가.
// 영속: localStorage 'sry:tool:world-graph'. 연계: addToProject 로 "관계 목록"을 자료 문서로 추가.
// import 는 react 와 './linkbus' 만. 완전 로컬(외부 미디어 미사용). Web API 미지원 시 graceful.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag, openToolLinked, Emoji,
  type SharedCharacter, type SharedPlace,
} from './linkbus'

export const meta = {
  id: 'world-graph',
  name: '세계관 관계 그래프',
  icon: '🌐',
  group: '구상·정리',
  intro: '인물·장소·세력·사건을 노드로 놓고 방향성 관계선으로 이어 세계관을 한눈에 설계하세요',
  w: 880,
  h: 680,
}

const LS_KEY = 'sry:tool:world-graph'

// ───────── 노드 종류 ─────────
type Kind = 'person' | 'place' | 'faction' | 'event'
interface KindDef { key: Kind; label: string; icon: string; color: string; shape: 'circle' | 'rect' | 'diamond' | 'hex' }
const KINDS: KindDef[] = [
  { key: 'person',  label: '인물', icon: '👤', color: '#3d7fd6', shape: 'circle' },
  { key: 'place',   label: '장소', icon: '🏰', color: '#3fa35a', shape: 'rect' },
  { key: 'faction', label: '세력', icon: '⚔️', color: '#c9772b', shape: 'hex' },
  { key: 'event',   label: '사건', icon: '⚡', color: '#8a5cd6', shape: 'diamond' },
]
const kindOf = (k: string): KindDef => KINDS.find((d) => d.key === k) || KINDS[0]

// ───────── 관계 유형(방향성) ─────────
interface RelDef { key: string; label: string; color: string; dashed?: boolean }
const RELS: RelDef[] = [
  { key: 'ally',     label: '동맹',   color: '#3fa35a' },
  { key: 'enemy',    label: '적대',   color: '#d2473b', dashed: true },
  { key: 'family',   label: '혈연',   color: '#e0992b' },
  { key: 'love',     label: '연정',   color: '#e0518b' },
  { key: 'serve',    label: '섬김',   color: '#3d7fd6' },
  { key: 'rule',     label: '지배',   color: '#7a4fd6' },
  { key: 'belong',   label: '소속',   color: '#2bb6c0' },
  { key: 'located',  label: '위치',   color: '#5f9b46' },
  { key: 'cause',    label: '원인',   color: '#b8531f', dashed: true },
  { key: 'involve',  label: '연루',   color: '#8a8f99' },
  { key: 'betray',   label: '배신',   color: '#a0392e', dashed: true },
  { key: 'other',    label: '관계',   color: '#7a8493' },
]
const relOf = (k: string): RelDef => RELS.find((r) => r.key === k) || RELS[RELS.length - 1]

// ───────── 데이터 ─────────
interface NodeT { id: string; kind: Kind; name: string; note: string; x: number; y: number }
interface EdgeT { id: string; a: string; b: string; type: string; label: string }
interface Store { nodes: NodeT[]; edges: EdgeT[]; tx: number; ty: number; scale: number }

const NODE_W = 124   // 사각/육각 폭
const NODE_H = 46    // 사각/육각 높이
const CIRC_R = 30    // 원 반지름
const DIA_R = 36     // 다이아몬드 반경

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function clampNum(v: unknown, d: number): number { return Number.isFinite(v as number) ? (v as number) : d }

function loadStore(): Store {
  const fallback: Store = { nodes: [], edges: [], tx: 0, ty: 0, scale: 1 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const nodes: NodeT[] = Array.isArray(p?.nodes)
      ? p.nodes.filter((n: any) => n && typeof n.name === 'string').map((n: any, i: number) => ({
          id: String(n.id || newId()),
          kind: (KINDS.some((k) => k.key === n.kind) ? n.kind : 'person') as Kind,
          name: String(n.name).slice(0, 48),
          note: String(n.note || '').slice(0, 400),
          x: clampNum(n.x, 160 + (i % 5) * 180),
          y: clampNum(n.y, 120 + Math.floor(i / 5) * 150),
        }))
      : []
    const ids = new Set(nodes.map((n) => n.id))
    const edges: EdgeT[] = Array.isArray(p?.edges)
      ? p.edges.filter((e: any) => e && ids.has(String(e.a)) && ids.has(String(e.b)) && String(e.a) !== String(e.b)).map((e: any) => ({
          id: String(e.id || newId()),
          a: String(e.a), b: String(e.b),
          type: typeof e.type === 'string' && RELS.some((t) => t.key === e.type) ? e.type : 'other',
          label: String(e.label || '').slice(0, 36),
        }))
      : []
    return {
      nodes, edges,
      tx: clampNum(p?.tx, 0), ty: clampNum(p?.ty, 0),
      scale: Math.min(2, Math.max(0.4, clampNum(p?.scale, 1))),
    }
  } catch { return fallback }
}

// 공유 인물/장소 → 노드 메모 한 줄 요약(외부 이미지/사진은 쓰지 않음 — 저작권 안전).
function summarizeChar(c: Partial<SharedCharacter>): string {
  const parts: string[] = []
  if (c.role?.trim()) parts.push(c.role.trim())
  if (c.personality?.trim()) parts.push(c.personality.trim())
  else if (c.goal?.trim()) parts.push('목표: ' + c.goal.trim())
  else if (c.appearance?.trim()) parts.push(c.appearance.trim())
  else if (c.notes?.trim()) parts.push(c.notes.trim())
  return parts.join(' · ').slice(0, 400)
}
function summarizePlace(p: Partial<SharedPlace>): string {
  const parts: string[] = []
  if (p.kind?.trim()) parts.push(p.kind.trim())
  if (p.mood?.trim()) parts.push(p.mood.trim())
  else if (p.history?.trim()) parts.push(p.history.trim())
  else if (p.notes?.trim()) parts.push(p.notes.trim())
  return parts.join(' · ').slice(0, 400)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 노드의 반외경(중심→경계, 방향벡터 기준 근사) — 화살표가 노드 표면에서 시작/끝나도록.
function nodeRadius(n: NodeT, ux: number, uy: number): number {
  const def = kindOf(n.kind)
  if (def.shape === 'circle') return CIRC_R + 2
  if (def.shape === 'diamond') {
    // 마름모: |x|/a + |y|/b = 1
    const a = DIA_R + 6, b = DIA_R + 6
    const denom = Math.abs(ux) / a + Math.abs(uy) / b
    return denom > 0 ? 1 / denom : a
  }
  // 사각/육각 → 사각형 경계 근사
  const hw = NODE_W / 2 + 2, hh = NODE_H / 2 + 2
  const sx = ux !== 0 ? hw / Math.abs(ux) : Infinity
  const sy = uy !== 0 ? hh / Math.abs(uy) : Infinity
  return Math.min(sx, sy)
}

export default function WorldGraph({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Store>(loadStore())
  const [nodes, setNodes] = useState<NodeT[]>(initial.current.nodes)
  const [edges, setEdges] = useState<EdgeT[]>(initial.current.edges)
  const [view, setView] = useState({ tx: initial.current.tx, ty: initial.current.ty, scale: initial.current.scale })
  const [note, setNote] = useState('')

  // 공유 라이브러리(자동 구독)
  const libChars = useLibraryList('characters')
  const libPlaces = useLibraryList('places')

  // 선택/모드
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [linkMode, setLinkMode] = useState(false)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [hideKinds, setHideKinds] = useState<Record<Kind, boolean>>({ person: false, place: false, faction: false, event: false })
  const [focusOn, setFocusOn] = useState(false) // 선택 노드 이웃만 강조

  // 새 노드 폼
  const [draftKind, setDraftKind] = useState<Kind>('person')
  const [draftName, setDraftName] = useState('')

  // 편집 폼
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editKind, setEditKind] = useState<Kind>('person')
  const [editEdgeType, setEditEdgeType] = useState('other')
  const [editEdgeLabel, setEditEdgeLabel] = useState('')

  // 드롭 피드백
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const mounted = useRef(true)
  const drag = useRef<{ kind: 'node' | 'pan'; id?: string; dx: number; dy: number; sx: number; sy: number; otx: number; oty: number; moved: boolean } | null>(null)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; drag.current = null } }, [])

  // 자동 저장(언마운트 시에도 최신 상태 반영)
  const latest = useRef<Store>(initial.current)
  latest.current = { nodes, edges, tx: view.tx, ty: view.ty, scale: view.scale }
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ nodes, edges, tx: view.tx, ty: view.ty, scale: view.scale })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어, 새로고침하면 사라질 수 있어요.') }
  }, [nodes, edges, view])
  useEffect(() => () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(latest.current)) } catch { /* noop */ }
  }, [])

  // ───────── 노드 추가 공용(중복 이름+종류 방지) ─────────
  const addNamedNode = (kind: Kind, rawName: string, rawNote = ''): string | null => {
    const name = rawName.trim()
    if (!name) return null
    let created: string | null = null
    setNodes((prev) => {
      if (prev.some((n) => n.kind === kind && n.name.trim() === name.slice(0, 48).trim())) return prev
      const idx = prev.length
      // 새 노드는 현재 뷰의 중앙 부근(월드 좌표)으로 — 약간의 격자 분산.
      const cx = (-view.tx + (wrapRef.current?.clientWidth || 700) / 2) / view.scale
      const cy = (-view.ty + 90 + (idx % 6) * 18) / view.scale
      const n: NodeT = {
        id: newId(), kind,
        name: name.slice(0, 48), note: rawNote.slice(0, 400),
        x: Math.round(cx + (idx % 5) * 36 - 72 + (Math.random() - 0.5) * 24),
        y: Math.round(cy + Math.floor(idx / 5) * 30 + (Math.random() - 0.5) * 24),
      }
      created = n.id
      return [...prev, n]
    })
    return created
  }

  // ───────── payload 로 받은 인물/장소 → 노드 ─────────
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    let added = 0
    const chRaw = (payload as any).character
    const chList: any[] = Array.isArray(chRaw) ? chRaw : chRaw ? [chRaw] : []
    for (const c of chList) {
      if (c?.name && typeof c.name === 'string') { if (addNamedNode('person', c.name, summarizeChar(c))) added++ }
    }
    const plRaw = (payload as any).place
    const plList: any[] = Array.isArray(plRaw) ? plRaw : plRaw ? [plRaw] : []
    for (const p of plList) {
      if (p?.name && typeof p.name === 'string') { if (addNamedNode('place', p.name, summarizePlace(p))) added++ }
    }
    if (mounted.current && added) setNote(`${added}개 항목을 노드로 추가했어요.`)
  }, [payload]) // eslint-disable-line

  // ───────── 라이브러리 불러오기 ─────────
  const importLibrary = () => {
    let added = 0
    for (const c of libChars) { if (c.name?.trim() && addNamedNode('person', c.name, summarizeChar(c))) added++ }
    for (const p of libPlaces) { if (p.name?.trim() && addNamedNode('place', p.name, summarizePlace(p))) added++ }
    setNote(added > 0 ? `라이브러리에서 ${added}개를 노드로 추가했어요.` : '라이브러리 항목이 이미 모두 노드에 있어요.')
  }
  const libCount = libChars.length + libPlaces.length

  // ───────── 바인더 파일 드롭 → 노드 ─────────
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0; setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const ch = it.character
    let kind: Kind = 'person'
    let name = ''
    let summary = ''
    if (ch) {
      name = (ch.name || '').trim() || (it.title || '').trim()
      // 카드 종류 추정: setting 류 필드가 있으면 장소로.
      const hasPlaceField = ['mood', 'history', 'rules', 'sensory', 'climate', 'geography'].some((k) => ch[k])
      if (it.type === 'setting' || hasPlaceField) { kind = 'place'; summary = summarizePlace(ch as Partial<SharedPlace>) }
      else { kind = 'person'; summary = summarizeChar(ch as Partial<SharedCharacter>) }
    } else {
      name = (it.title || '').trim()
      summary = (it.text || '').trim().replace(/\s+/g, ' ').slice(0, 400)
      // 제목/내용으로 종류 약식 추정
      kind = 'event'
    }
    if (!name) { setNote('드롭한 파일에서 이름을 찾지 못했어요.'); return }
    const id = addNamedNode(kind, name, summary)
    if (id) { setSelNode(id); setSelEdge(null); setNote(`‘${name}’을(를) ${kindOf(kind).label} 노드로 추가했어요.`) }
    else setNote(`‘${name}’은(는) 이미 같은 종류로 추가되어 있어요.`)
  }

  // ───────── 선택 동기화 ─────────
  const selNodeObj = nodes.find((n) => n.id === selNode) || null
  const selEdgeObj = edges.find((e) => e.id === selEdge) || null
  useEffect(() => { if (selNodeObj) { setEditName(selNodeObj.name); setEditNote(selNodeObj.note); setEditKind(selNodeObj.kind) } }, [selNode]) // eslint-disable-line
  useEffect(() => { if (selEdgeObj) { setEditEdgeType(selEdgeObj.type); setEditEdgeLabel(selEdgeObj.label) } }, [selEdge]) // eslint-disable-line

  // ───────── 좌표 변환(화면 → 월드) ─────────
  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    const r = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 }
    return { x: (clientX - r.left - view.tx) / view.scale, y: (clientY - r.top - view.ty) / view.scale }
  }

  // ───────── 드래그(노드 이동 / 빈공간 팬) ─────────
  const beginNodeDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    if (linkMode) return
    const n = nodes.find((x) => x.id === id); if (!n) return
    const w = toWorld(e.clientX, e.clientY)
    drag.current = { kind: 'node', id, dx: w.x - n.x, dy: w.y - n.y, sx: e.clientX, sy: e.clientY, otx: 0, oty: 0, moved: false }
    attachDrag()
  }
  const beginPan = (e: React.PointerEvent) => {
    if (linkMode) return
    drag.current = { kind: 'pan', dx: 0, dy: 0, sx: e.clientX, sy: e.clientY, otx: view.tx, oty: view.ty, moved: false }
    attachDrag()
  }
  const attachDrag = () => {
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return
      if (Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) > 3) d.moved = true
      if (d.kind === 'node' && d.id) {
        const w = toWorld(ev.clientX, ev.clientY)
        const nx = Math.round(w.x - d.dx), ny = Math.round(w.y - d.dy)
        setNodes((prev) => prev.map((nd) => (nd.id === d.id ? { ...nd, x: nx, y: ny } : nd)))
      } else if (d.kind === 'pan') {
        setView((v) => ({ ...v, tx: d.otx + (ev.clientX - d.sx), ty: d.oty + (ev.clientY - d.sy) }))
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const d = drag.current; drag.current = null
      if (d && !d.moved) {
        if (d.kind === 'node' && d.id) { setSelNode(d.id); setSelEdge(null) }
        else { setSelNode(null); setSelEdge(null) }
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // 줌(휠) — 커서 위치 기준
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const r = svgRef.current?.getBoundingClientRect()
    const px = e.clientX - (r?.left || 0), py = e.clientY - (r?.top || 0)
    setView((v) => {
      const ns = Math.min(2, Math.max(0.4, v.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
      const k = ns / v.scale
      return { scale: ns, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }
    })
  }
  const zoomBy = (f: number) => setView((v) => {
    const ns = Math.min(2, Math.max(0.4, v.scale * f))
    const w = wrapRef.current?.clientWidth || 700, h = (wrapRef.current?.clientHeight || 500) - 110
    const px = w / 2, py = h / 2, k = ns / v.scale
    return { scale: ns, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }
  })

  // ───────── 연결 모드: 두 노드 클릭 → 방향성 엣지(from→to) ─────────
  const onNodeClickLink = (id: string) => {
    if (!linkMode) return
    if (linkFrom == null) { setLinkFrom(id); return }
    if (linkFrom === id) { setLinkFrom(null); return }
    const exists = edges.some((e) => e.a === linkFrom && e.b === id)
    if (exists) { setNote('이미 같은 방향의 관계가 있어요. 관계선을 눌러 유형을 바꾸세요.'); setLinkFrom(null); setLinkMode(false); return }
    const ne: EdgeT = { id: newId(), a: linkFrom, b: id, type: 'other', label: '' }
    setEdges((prev) => [...prev, ne])
    setSelEdge(ne.id); setSelNode(null)
    setLinkFrom(null); setLinkMode(false)
  }

  // ───────── CRUD ─────────
  const addNode = () => {
    const id = addNamedNode(draftKind, draftName)
    if (id) { setSelNode(id); setSelEdge(null); setNote(''); setDraftName('') }
    else if (draftName.trim()) setNote('같은 종류·이름의 노드가 이미 있어요.')
  }
  const saveNodeEdit = () => {
    if (!selNode) return
    const nm = editName.trim()
    if (!nm) { setNote('이름은 비울 수 없어요.'); return }
    setNodes((prev) => prev.map((n) => (n.id === selNode ? { ...n, name: nm.slice(0, 48), note: editNote.slice(0, 400), kind: editKind } : n)))
    setNote('')
  }
  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.a !== id && e.b !== id))
    if (selNode === id) setSelNode(null)
  }
  const saveEdgeEdit = () => {
    if (!selEdge) return
    setEdges((prev) => prev.map((e) => (e.id === selEdge ? { ...e, type: editEdgeType, label: editEdgeLabel.slice(0, 36) } : e)))
    setNote('')
  }
  const flipEdge = () => {
    if (!selEdge) return
    setEdges((prev) => prev.map((e) => (e.id === selEdge ? { ...e, a: e.b, b: e.a } : e)))
  }
  const removeEdge = (id: string) => { setEdges((prev) => prev.filter((e) => e.id !== id)); if (selEdge === id) setSelEdge(null) }

  const clearAll = () => {
    if (!nodes.length && !edges.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 노드와 관계를 지울까요? 되돌릴 수 없습니다.')) return
    setNodes([]); setEdges([]); setSelNode(null); setSelEdge(null); setLinkFrom(null); setLinkMode(false)
  }
  const fit = () => {
    if (!nodes.length) { setView({ tx: 0, ty: 0, scale: 1 }); return }
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y)
    const minX = Math.min(...xs) - 100, maxX = Math.max(...xs) + 100
    const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 80
    const w = wrapRef.current?.clientWidth || 700, h = (wrapRef.current?.clientHeight || 500) - 110
    const s = Math.min(2, Math.max(0.4, Math.min(w / (maxX - minX || 1), h / (maxY - minY || 1)) * 0.9))
    setView({ scale: s, tx: w / 2 - ((minX + maxX) / 2) * s, ty: h / 2 - ((minY + maxY) / 2) * s })
  }

  // ───────── 텍스트/HTML 내보내기 ─────────
  const edgeLine = (e: EdgeT): string => {
    const a = nodes.find((n) => n.id === e.a)?.name || '?'
    const b = nodes.find((n) => n.id === e.b)?.name || '?'
    const rt = relOf(e.type)
    return `${a} → ${b} : ${rt.label}${e.label ? ` (${e.label})` : ''}`
  }
  const exportText = (): string => {
    const lines: string[] = ['# 세계관 관계 그래프', '']
    for (const kd of KINDS) {
      const ns = nodes.filter((n) => n.kind === kd.key)
      if (!ns.length) continue
      lines.push(`## ${kd.icon} ${kd.label} (${ns.length})`)
      ns.forEach((n) => lines.push(`- ${n.name}${n.note ? ` — ${n.note}` : ''}`))
      lines.push('')
    }
    lines.push('## 관계')
    if (!edges.length) lines.push('(없음)')
    else edges.forEach((e) => lines.push('- ' + edgeLine(e)))
    return lines.join('\n')
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    for (const kd of KINDS) {
      const ns = nodes.filter((n) => n.kind === kd.key)
      if (!ns.length) continue
      parts.push(`<h2>${esc(kd.icon + ' ' + kd.label)} (${ns.length})</h2>`)
      parts.push('<ul>' + ns.map((n) => '<li>' + esc(n.name) + (n.note ? ' — ' + esc(n.note) : '') + '</li>').join('') + '</ul>')
    }
    parts.push('<h2>관계 목록</h2>')
    if (!edges.length) parts.push('<p>(없음)</p>')
    else {
      parts.push('<ul>' + edges.map((e) => {
        const a = nodes.find((n) => n.id === e.a)?.name || '?'
        const b = nodes.find((n) => n.id === e.b)?.name || '?'
        const rt = relOf(e.type)
        return '<li>' + esc(a) + ' → ' + esc(b) + ' : ' + esc(rt.label) + (e.label ? ' (' + esc(e.label) + ')' : '') + '</li>'
      }).join('') + '</ul>')
    }
    return parts.join('\n')
  }

  const isEmpty = nodes.length === 0
  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (isEmpty) { setNote('추가할 노드·관계가 없어요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '세계관', title: '세계관 관계 그래프', bodyHtml: buildHtml() })
    setNote(id ? '프로젝트 자료 › 세계관 폴더에 관계 목록을 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }
  const copyText = async () => {
    const txt = exportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('관계 그래프를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('관계 그래프를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요.') }
    }
  }
  const toStash = () => { if (!isEmpty && hasStash()) { addToStash({ kind: 'note', label: '세계관 관계 그래프', text: exportText() }); setNote('수집함에 관계 목록을 담았어요.') } }

  // 포커스(이웃 강조) — 선택 노드와 직접 연결된 노드 id 집합
  const neighborSet = useMemo(() => {
    if (!focusOn || !selNode) return null
    const s = new Set<string>([selNode])
    for (const e of edges) { if (e.a === selNode) s.add(e.b); if (e.b === selNode) s.add(e.a) }
    return s
  }, [focusOn, selNode, edges])
  const isVisible = (n: NodeT) => !hideKinds[n.kind]
  const dimNode = (id: string) => !!(neighborSet && !neighborSet.has(id))

  // 표시 대상(필터 적용)
  const visNodes = nodes.filter(isVisible)
  const visIds = new Set(visNodes.map((n) => n.id))
  const visEdges = edges.filter((e) => visIds.has(e.a) && visIds.has(e.b))

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const canvasBox: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', background: 'var(--paper)', backgroundImage: 'radial-gradient(var(--border) 0.8px, transparent 0.8px)', backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`, backgroundPosition: `${view.tx}px ${view.ty}px` }
  const side: React.CSSProperties = { width: 244, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3 }
  const sInput: React.CSSProperties = { ...input, width: '100%' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  // 노드 도형 그리기
  const renderShape = (n: NodeT, sel: boolean, linkStart: boolean) => {
    const def = kindOf(n.kind)
    const stroke = sel || linkStart ? 'var(--accent)' : 'rgba(255,255,255,0.85)'
    const sw = sel || linkStart ? 4 : 2.5
    if (def.shape === 'circle') return <circle r={CIRC_R} fill={def.color} stroke={stroke} strokeWidth={sw} />
    if (def.shape === 'rect') return <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} rx={9} fill={def.color} stroke={stroke} strokeWidth={sw} />
    if (def.shape === 'diamond') return <polygon points={`0,${-DIA_R} ${DIA_R},0 0,${DIA_R} ${-DIA_R},0`} fill={def.color} stroke={stroke} strokeWidth={sw} />
    // hex
    const hw = NODE_W / 2, hh = NODE_H / 2, c = 16
    return <polygon points={`${-hw + c},${-hh} ${hw - c},${-hh} ${hw},0 ${hw - c},${hh} ${-hw + c},${hh} ${-hw},0`} fill={def.color} stroke={stroke} strokeWidth={sw} />
  }
  const labelInside = (n: NodeT) => kindOf(n.kind).shape === 'rect' || kindOf(n.kind).shape === 'hex'

  return (
    <div
      ref={wrapRef}
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -6 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      {dropActive && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '6px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          여기에 놓으면 노드로 추가됩니다 (인물/장소/사건 자동 판별)
        </div>
      )}

      {/* 상단 도구막대 */}
      <div style={topbar}>
        <select value={draftKind} onChange={(e) => setDraftKind(e.target.value as Kind)} style={{ ...input, padding: '7px 6px' }} aria-label="노드 종류">
          {KINDS.map((k) => <option key={k.key} value={k.key}>{k.icon} {k.label}</option>)}
        </select>
        <input
          style={{ ...input, flex: 1, minWidth: 120 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNode() } }}
          placeholder={`${kindOf(draftKind).label} 이름을 입력하고 Enter…`}
          maxLength={48}
          aria-label="노드 이름"
        />
        <button className="btn-primary" onClick={addNode} disabled={!draftName.trim()}>＋ 추가</button>
        <button className="minibtn" onClick={importLibrary} disabled={!libCount} title={libCount ? `공유 라이브러리의 인물·장소 ${libCount}개를 노드로 불러옵니다` : '공유 라이브러리에 인물·장소가 없습니다'}><Emoji e="📥" /> 라이브러리{libCount ? ` (${libCount})` : ''}</button>
        <button className={'minibtn' + (linkMode ? ' active' : '')} onClick={() => { setLinkMode((v) => !v); setLinkFrom(null); setSelNode(null); setSelEdge(null) }} disabled={nodes.length < 2} title="두 노드를 차례로 클릭해 from→to 관계선을 만듭니다"><Emoji e="🔗" /> 관계 연결{linkMode ? ' 중…' : ''}</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => zoomBy(1 / 1.2)} disabled={isEmpty} title="축소">－</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 38, textAlign: 'center' }}>{Math.round(view.scale * 100)}%</span>
        <button className="minibtn" onClick={() => zoomBy(1.2)} disabled={isEmpty} title="확대">＋</button>
        <button className="minibtn" onClick={fit} disabled={isEmpty} title="전체 보기">⤢ 맞춤</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 캔버스 */}
        <div style={canvasBox}>
          {isEmpty ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, padding: 24 }}>
              <div>
                아직 노드가 없어요.<br />
                위에서 <b style={{ color: 'var(--text)' }}>종류</b>를 고르고 이름을 적어 <b style={{ color: 'var(--text)' }}>＋ 추가</b>하거나,<br />
                <b style={{ color: 'var(--text)' }}><Emoji e="📥" /> 라이브러리</b>로 저장된 인물·장소를 가져오세요.<br />
                좌측 바인더 파일을 이 위로 드래그해 놓아도 됩니다.<br />
                노드를 드래그해 배치하고 <b style={{ color: 'var(--text)' }}><Emoji e="🔗" /> 관계 연결</b>로 이으세요.
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%" height="100%"
              style={{ display: 'block', cursor: linkMode ? 'crosshair' : 'grab', userSelect: 'none', touchAction: 'none' }}
              onPointerDown={beginPan}
              onWheel={onWheel}
            >
              <defs>
                {RELS.map((r) => (
                  <marker key={r.key} id={`wg-arrow-${r.key}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={r.color} />
                  </marker>
                ))}
                <marker id="wg-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--border-dark)" />
                </marker>
              </defs>

              <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
                {/* 관계선(방향성, 살짝 곡선 + 화살표) */}
                {visEdges.map((e) => {
                  const a = nodes.find((n) => n.id === e.a)!
                  const b = nodes.find((n) => n.id === e.b)!
                  const rt = relOf(e.type)
                  const dx = b.x - a.x, dy = b.y - a.y
                  const dist = Math.hypot(dx, dy) || 1
                  const ux = dx / dist, uy = dy / dist
                  const ra = nodeRadius(a, ux, uy), rb = nodeRadius(b, -ux, -uy)
                  const x1 = a.x + ux * ra, y1 = a.y + uy * ra
                  const x2 = b.x - ux * rb, y2 = b.y - uy * rb
                  // 곡선 제어점(법선 방향으로 살짝)
                  const nx = -uy, ny = ux
                  const bend = Math.min(26, dist * 0.12)
                  const cxp = (x1 + x2) / 2 + nx * bend, cyp = (y1 + y2) / 2 + ny * bend
                  const sel = selEdge === e.id
                  const dim = dimNode(e.a) || dimNode(e.b)
                  const col = dim ? 'var(--border-dark)' : rt.color
                  const lx = (x1 + 2 * cxp + x2) / 4, ly = (y1 + 2 * cyp + y2) / 4 // 2차 베지어 중점
                  const txt = rt.label + (e.label ? ' ' + e.label : '')
                  return (
                    <g key={e.id} style={{ cursor: 'pointer' }} opacity={dim ? 0.35 : 1} onClick={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelNode(null) }}>
                      <path d={`M${x1},${y1} Q${cxp},${cyp} ${x2},${y2}`} fill="none" stroke="transparent" strokeWidth={16} />
                      <path d={`M${x1},${y1} Q${cxp},${cyp} ${x2},${y2}`} fill="none" stroke={col} strokeWidth={sel ? 3.6 : 2.2} strokeDasharray={rt.dashed ? '7 5' : undefined} markerEnd={`url(#wg-arrow-${dim ? 'dim' : rt.key})`} />
                      <g>
                        <rect x={lx - txt.length * 5 - 5} y={ly - 10} width={txt.length * 10 + 10} height={19} rx={6} fill="var(--panel)" stroke={col} strokeWidth={sel ? 1.6 : 1} opacity={0.96} />
                        <text x={lx} y={ly + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={col}>{txt}</text>
                      </g>
                    </g>
                  )
                })}

                {/* 연결 시작 표시 */}
                {linkMode && linkFrom && (() => {
                  const f = nodes.find((n) => n.id === linkFrom)
                  if (!f || !visIds.has(f.id)) return null
                  return <circle cx={f.x} cy={f.y} r={CIRC_R + 12} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
                })()}

                {/* 노드 */}
                {visNodes.map((n) => {
                  const sel = selNode === n.id
                  const linkStart = linkMode && linkFrom === n.id
                  const def = kindOf(n.kind)
                  const dim = dimNode(n.id)
                  const inside = labelInside(n)
                  const short = n.name.length > 8 ? n.name.slice(0, 8) + '…' : n.name
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x},${n.y})`}
                      opacity={dim ? 0.3 : 1}
                      style={{ cursor: linkMode ? 'pointer' : 'grab' }}
                      onPointerDown={(e) => beginNodeDrag(e, n.id)}
                      onClick={(e) => { e.stopPropagation(); onNodeClickLink(n.id) }}
                    >
                      {renderShape(n, sel, linkStart)}
                      {inside ? (
                        <>
                          <text textAnchor="middle" y={-2} fontSize={13} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>{short}</text>
                          <text textAnchor="middle" y={14} fontSize={9.5} fill="rgba(255,255,255,0.9)" style={{ pointerEvents: 'none' }}>{def.icon} {def.label}</text>
                        </>
                      ) : (
                        <>
                          <text textAnchor="middle" y={def.shape === 'diamond' ? 1 : 5} fontSize={13} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>
                            {n.name.length > 4 ? n.name.slice(0, 4) : n.name}
                          </text>
                          <text textAnchor="middle" y={(def.shape === 'circle' ? CIRC_R : DIA_R) + 15} fontSize={11} fontWeight={600} fill="var(--text)" style={{ pointerEvents: 'none' }}>
                            {def.icon} {n.name.length > 10 ? n.name.slice(0, 10) + '…' : n.name}
                          </text>
                        </>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
        </div>

        {/* 우측 패널 */}
        <div style={side}>
          {selNodeObj ? (
            <div style={card}>
              <div style={sLabel}>노드 편집</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {KINDS.map((k) => (
                  <button key={k.key} className="minibtn" onClick={() => setEditKind(k.key)} style={{ borderColor: editKind === k.key ? k.color : 'var(--border)', color: editKind === k.key ? k.color : 'var(--text)', borderWidth: 2, fontWeight: editKind === k.key ? 700 : 400, padding: '3px 7px' }}><Emoji e={k.icon} /> {k.label}</button>
                ))}
              </div>
              <input style={sInput} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} placeholder="이름" aria-label="이름 수정" />
              <textarea style={{ ...sInput, resize: 'vertical', minHeight: 60, fontFamily: 'inherit', lineHeight: 1.5 }} value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={400} placeholder="메모(역할·성격·내력 등)" aria-label="메모 수정" />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveNodeEdit}>저장</button>
                <button className="minibtn" onClick={() => removeNode(selNodeObj.id)} title="이 노드 삭제"><Emoji e="🗑️" /></button>
              </div>
              <div style={hint}>이 노드와 연결된 관계선도 함께 삭제됩니다.</div>
            </div>
          ) : selEdgeObj ? (
            <div style={card}>
              <div style={sLabel}>관계 편집</div>
              <div style={{ fontSize: 13 }}>
                <b>{nodes.find((n) => n.id === selEdgeObj.a)?.name || '?'}</b>
                <span style={{ color: 'var(--muted)' }}> → </span>
                <b>{nodes.find((n) => n.id === selEdgeObj.b)?.name || '?'}</b>
              </div>
              <div style={sLabel}>유형</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {RELS.map((t) => (
                  <button key={t.key} className="minibtn" onClick={() => setEditEdgeType(t.key)} style={{ borderColor: editEdgeType === t.key ? t.color : 'var(--border)', color: editEdgeType === t.key ? t.color : 'var(--text)', borderWidth: 2, fontWeight: editEdgeType === t.key ? 700 : 400, padding: '3px 7px' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color, marginRight: 4, verticalAlign: 'middle' }} />{t.label}
                  </button>
                ))}
              </div>
              <input style={sInput} value={editEdgeLabel} onChange={(e) => setEditEdgeLabel(e.target.value)} maxLength={36} placeholder="세부 라벨(선택, 예: 7년 전 배신)" aria-label="관계 세부 라벨" />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveEdgeEdit}>저장</button>
                <button className="minibtn" onClick={flipEdge} title="방향 뒤집기">↔ 방향</button>
                <button className="minibtn" onClick={() => removeEdge(selEdgeObj.id)} title="이 관계 삭제"><Emoji e="🗑️" /></button>
              </div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>
                {linkMode
                  ? 'from → to 순서로 두 노드를 클릭하세요. 빈 곳을 누르면 취소됩니다.'
                  : '빈 공간을 드래그하면 화면 이동(팬), 휠로 확대/축소. 노드를 드래그해 배치하고, 노드·관계선을 클릭하면 여기서 수정·삭제합니다.'}
              </div>
            </div>
          )}

          {/* 종류 필터 + 포커스 */}
          <div style={card}>
            <div style={sLabel}>종류 필터 / 강조</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {KINDS.map((k) => {
                const cnt = nodes.filter((n) => n.kind === k.key).length
                const on = !hideKinds[k.key]
                return (
                  <label key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer', opacity: cnt ? 1 : 0.5 }}>
                    <input type="checkbox" checked={on} onChange={() => setHideKinds((h) => ({ ...h, [k.key]: !h[k.key] }))} />
                    <span style={{ width: 12, height: 12, borderRadius: k.shape === 'circle' ? '50%' : 3, background: k.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}><Emoji e={k.icon} /> {k.label}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{cnt}</span>
                  </label>
                )
              })}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer', borderTop: '1px dashed var(--border)', paddingTop: 7 }}>
              <input type="checkbox" checked={focusOn} onChange={(e) => setFocusOn(e.target.checked)} />
              <span>선택 노드의 이웃만 강조</span>
            </label>
          </div>

          {/* 노드 목록 */}
          <div style={card}>
            <div style={sLabel}>노드 {nodes.length}개 · 관계 {edges.length}개</div>
            {nodes.length === 0 ? (
              <div style={hint}>아직 없음</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                {nodes.map((n) => {
                  const def = kindOf(n.kind)
                  return (
                    <div key={n.id} onClick={() => { setSelNode(n.id); setSelEdge(null) }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, background: selNode === n.id ? 'var(--paper)' : 'transparent' }}>
                      <span style={{ width: 11, height: 11, borderRadius: def.shape === 'circle' ? '50%' : 3, background: def.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}><Emoji e={def.icon} /></span>
                      <button className="minibtn" style={{ padding: '1px 5px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); removeNode(n.id) }} title="삭제">✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 관계 색 범례 */}
          <div style={card}>
            <div style={sLabel}>관계 색 범례</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
              {RELS.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                  <span style={{ width: 18, height: 3, borderRadius: 2, background: t.color, flexShrink: 0, opacity: t.dashed ? 0.7 : 1 }} />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
            <div style={hint}>관계선은 from → to 방향(화살표). “↔ 방향”으로 뒤집을 수 있어요.</div>
          </div>

          {/* 연계 */}
          <div style={card}>
            <div style={sLabel}>연계</div>
            <div className="linkbar">
              <button className="linkbtn" onClick={addToProjectDoc} disabled={isEmpty || !hasProjectBridge()} title={hasProjectBridge() ? '관계 목록을 프로젝트(자료 › 세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 프로젝트에 추가</button>
              <button className="linkbtn" onClick={copyText} disabled={isEmpty}><Emoji e="📋" /> 텍스트 복사</button>
              {hasStash() && <button className="linkbtn" onClick={toStash} disabled={isEmpty}><Emoji e="📥" /> 수집함</button>}
              <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 도구 열기"><Emoji e="🕸️" /> 인물 관계도</button>
              <button className="linkbtn" onClick={() => openToolLinked('faction-builder')} title="세력 설계기 열기"><Emoji e="⚔️" /> 세력 설계기</button>
            </div>
            <button className="minibtn" onClick={clearAll} disabled={isEmpty} style={{ alignSelf: 'flex-start' }} title="전체 삭제"><Emoji e="🗑️" /> 전체 비우기</button>
          </div>

          <div style={hint}>모든 노드·관계·배치·줌은 이 브라우저에 자동 저장됩니다.</div>
        </div>
      </div>
    </div>
  )
}
