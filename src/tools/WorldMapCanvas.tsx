// 월드맵 캔버스 — 빈 캔버스에 지역/도시/랜드마크 노드를 추가하고 마우스로 드래그 배치,
// 노드 사이를 연결선(경로/국경/강/교역로 등)으로 잇고, 각 노드에 메모를 단다. SVG로 연결선.
// 캔버스 패닝(빈 곳 드래그)·노드 드래그·노드 추가/수정/삭제·연결 추가/삭제. 줌은 없음(요구사항).
// localStorage 영속(노드 좌표·연결·뷰 오프셋 포함). 빈 상태 안내. 텍스트 내보내기.
// 연계: addToProject(kind:text, root:research, folder:'세계관')로 지명 목록 종합 추가.
//       좌측 바인더 파일을 캔버스에 드롭하면 그 제목으로 노드를 만든다(getDragItem/isItemDrag).
//       공유 장소 라이브러리(places)와 양방향: 노드를 라이브러리에 저장 / 라이브러리 장소를 노드로 불러오기.
//       payload.places 항목별 kind(유형)를 노드 kind 로 매핑(설정집 한국어 유형 흡수)해 '기타' 일괄 강등을 막는다.
// import 는 react 와 './linkbus' 만. 외부 네트워크/미디어/키 불필요(저작권 안전: 색·도형·이모지·자작 텍스트만).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, addToLibrary, useLibraryList, isLastWriteOk, Emoji } from './linkbus'

export const meta = { id: 'world-map-canvas', name: '월드맵 캔버스', icon: '🗺️', group: '분위기·시각', intro: '지역·도시·랜드마크 노드를 놓고 경로·국경으로 잇는 세계관 지도', w: 880, h: 660 }

const LS_KEY = 'sry:tool:world-map-canvas'

// ---- 노드 종류(색·이모지로 구분, 외부 이미지 없음) ----
interface NodeKind { key: string; label: string; icon: string; color: string }
const NODE_KINDS: NodeKind[] = [
  { key: 'region', label: '지역', icon: '🏔️', color: '#3fa35a' },
  { key: 'city', label: '도시', icon: '🏰', color: '#3d7fd6' },
  { key: 'town', label: '마을', icon: '🏘️', color: '#5cb8c0' },
  { key: 'landmark', label: '랜드마크', icon: '🗼', color: '#e0992b' },
  { key: 'dungeon', label: '던전·유적', icon: '🏚️', color: '#8a5cd6' },
  { key: 'forest', label: '숲', icon: '🌲', color: '#2f7d4a' },
  { key: 'mountain', label: '산', icon: '⛰️', color: '#7a8493' },
  { key: 'water', label: '바다·호수', icon: '🌊', color: '#2b8fd0' },
  { key: 'capital', label: '수도', icon: '👑', color: '#d2473b' },
  { key: 'other', label: '기타', icon: '📍', color: '#c9772b' },
]
const kindOf = (k: string): NodeKind => NODE_KINDS.find((x) => x.key === k) || NODE_KINDS[NODE_KINDS.length - 1]

// 다른 도구(배경 설정집·장소 라이브러리)의 장소 '유형' 문자열 → 월드맵 노드 kind 키 매핑표.
// 설정집 TYPES('도시','마을','건물','자연','지하·던전','왕국·국가','이세계·차원','바다·하늘','기타') 및
// 라이브러리 SharedPlace.kind 등 다양한 표기를 흡수한다. 매칭 실패 시에만 'other'로 떨어진다.
const KIND_ALIASES: Record<string, string> = {
  // 이미 월드맵 키인 경우(라이브러리 round-trip)는 그대로 통과
  region: 'region', city: 'city', town: 'town', landmark: 'landmark', dungeon: 'dungeon',
  forest: 'forest', mountain: 'mountain', water: 'water', capital: 'capital', other: 'other',
  // 한국어 유형 라벨
  도시: 'city', 마을: 'town', 건물: 'landmark', 자연: 'forest',
  '지하·던전': 'dungeon', 지하: 'dungeon', 던전: 'dungeon', 유적: 'dungeon',
  '왕국·국가': 'capital', 왕국: 'capital', 국가: 'capital', 수도: 'capital',
  '이세계·차원': 'region', 이세계: 'region', 차원: 'region', 지역: 'region',
  '바다·하늘': 'water', 바다: 'water', 하늘: 'water', 호수: 'water', 강: 'water',
  랜드마크: 'landmark', 숲: 'forest', 산: 'mountain', 산맥: 'mountain', 기타: 'other',
}
// 임의 유형 문자열을 노드 kind 키로 변환(공백 정리 후 별칭표 조회). 없으면 'other'.
const mapKind = (raw: unknown): string => {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return 'other'
  if (NODE_KINDS.some((k) => k.key === s)) return s
  return KIND_ALIASES[s] || 'other'
}

// ---- 연결 종류(색·선스타일로 구분) ----
interface LinkKind { key: string; label: string; color: string; dash: string; width: number }
const LINK_KINDS: LinkKind[] = [
  { key: 'road', label: '경로·도로', color: '#b5854a', dash: '', width: 3 },
  { key: 'border', label: '국경', color: '#d2473b', dash: '8 6', width: 2 },
  { key: 'river', label: '강', color: '#2b8fd0', dash: '', width: 4 },
  { key: 'trade', label: '교역로', color: '#e0992b', dash: '2 6', width: 2 },
  { key: 'sea', label: '항로', color: '#3d7fd6', dash: '10 8', width: 2 },
  { key: 'secret', label: '비밀길', color: '#8a5cd6', dash: '1 7', width: 2 },
  { key: 'other', label: '기타', color: '#7a8493', dash: '4 4', width: 2 },
]
const linkKindOf = (k: string): LinkKind => LINK_KINDS.find((x) => x.key === k) || LINK_KINDS[LINK_KINDS.length - 1]

interface MapNode { id: string; name: string; kind: string; note: string; x: number; y: number }
interface MapLink { id: string; a: string; b: string; kind: string; label: string }
interface MapStore { nodes: MapNode[]; links: MapLink[]; ox: number; oy: number }

const NODE_W = 116 // 노드 박스 폭
const NODE_H = 44  // 노드 박스 높이

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function num(v: unknown, d: number): number { return Number.isFinite(v as number) ? (v as number) : d }

function loadStore(): MapStore {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { nodes: [], links: [], ox: 0, oy: 0 }
    const p = JSON.parse(raw)
    const nodes: MapNode[] = Array.isArray(p?.nodes)
      ? p.nodes.filter((n: any) => n && typeof n.name === 'string').map((n: any, i: number) => ({
          id: String(n.id || newId()),
          name: String(n.name).slice(0, 50),
          kind: typeof n.kind === 'string' && NODE_KINDS.some((k) => k.key === n.kind) ? n.kind : 'other',
          note: String(n.note || '').slice(0, 1200),
          x: num(n.x, 140 + (i % 5) * 150),
          y: num(n.y, 110 + Math.floor(i / 5) * 130),
        }))
      : []
    const ids = new Set(nodes.map((n) => n.id))
    const links: MapLink[] = Array.isArray(p?.links)
      ? p.links.filter((e: any) => e && ids.has(String(e.a)) && ids.has(String(e.b)) && String(e.a) !== String(e.b)).map((e: any) => ({
          id: String(e.id || newId()),
          a: String(e.a),
          b: String(e.b),
          kind: typeof e.kind === 'string' && LINK_KINDS.some((k) => k.key === e.kind) ? e.kind : 'other',
          label: String(e.label || '').slice(0, 40),
        }))
      : []
    return { nodes, links, ox: num(p?.ox, 0), oy: num(p?.oy, 0) }
  } catch {
    return { nodes: [], links: [], ox: 0, oy: 0 }
  }
}

interface Props { payload?: Record<string, unknown> }

export default function WorldMapCanvas({ payload }: Props) {
  const initial = useRef<MapStore>(loadStore())
  const [nodes, setNodes] = useState<MapNode[]>(initial.current.nodes)
  const [links, setLinks] = useState<MapLink[]>(initial.current.links)
  const [ox, setOx] = useState<number>(initial.current.ox) // 캔버스 패닝 오프셋
  const [oy, setOy] = useState<number>(initial.current.oy)
  const [note, setNote] = useState('')

  // 추가 폼
  const [draftName, setDraftName] = useState('')
  const [draftKind, setDraftKind] = useState('city')

  // 선택/편집
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selLink, setSelLink] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editKind, setEditKind] = useState('city')
  const [editNote, setEditNote] = useState('')
  const [editLinkKind, setEditLinkKind] = useState('road')
  const [editLinkLabel, setEditLinkLabel] = useState('')

  // 연결 모드
  const [linkMode, setLinkMode] = useState(false)
  const [linkKind, setLinkKind] = useState('road')
  const [linkFrom, setLinkFrom] = useState<string | null>(null)

  // 드롭 시각 피드백
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)

  // 공유 장소 라이브러리(배경 설정집 등과 양방향 공유)
  const libPlaces = useLibraryList('places')
  const [libPick, setLibPick] = useState('') // 불러오기 선택 값

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const mounted = useRef(true)

  // 드래그 상태(전역 리스너로 처리 → 정리 필요)
  const nodeDrag = useRef<{ id: string; sx: number; sy: number; nx: number; ny: number; moved: boolean } | null>(null)
  const panDrag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // ---- 자동 저장 ----
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ nodes, links, ox, oy }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [nodes, links, ox, oy])

  const nodeById = (id: string | null): MapNode | undefined => (id ? nodes.find((n) => n.id === id) : undefined)

  // ---- 노드 추가(중복 이름은 그대로 허용; 화면 중앙 부근 + 약간 흩뿌림) ----
  const addNode = (rawName: string, kind: string, noteText = ''): string | null => {
    const name = rawName.trim()
    if (!name) { setNote('지명을 입력하세요.'); return null }
    const id = newId()
    // 현재 보이는 캔버스 중앙(패닝 보정) 근처에 배치
    const wrap = wrapRef.current
    const cx = wrap ? wrap.clientWidth / 2 : 360
    const cy = wrap ? wrap.clientHeight / 2 : 280
    const jitter = () => Math.round((Math.random() - 0.5) * 80)
    const n: MapNode = {
      id,
      name: name.slice(0, 50),
      kind: NODE_KINDS.some((k) => k.key === kind) ? kind : 'other',
      note: noteText.slice(0, 1200),
      x: Math.round(cx - ox - NODE_W / 2 + jitter()),
      y: Math.round(cy - oy - NODE_H / 2 + jitter()),
    }
    setNodes((prev) => [...prev, n])
    return id
  }

  const onAddDraft = () => {
    const id = addNode(draftName, draftKind)
    if (id) { setDraftName(''); setNote(''); selectNode(id) }
  }

  // ---- 노드 선택/편집 동기화 ----
  const selectNode = (id: string) => {
    const n = nodes.find((x) => x.id === id)
    setSelLink(null)
    setSelNode(id)
    if (n) { setEditName(n.name); setEditKind(n.kind); setEditNote(n.note) }
  }
  const selectLink = (id: string) => {
    const e = links.find((x) => x.id === id)
    setSelNode(null)
    setSelLink(id)
    if (e) { setEditLinkKind(e.kind); setEditLinkLabel(e.label) }
  }

  const saveNodeEdit = () => {
    if (!selNode) return
    const nm = editName.trim()
    if (!nm) { setNote('지명은 비울 수 없어요.'); return }
    setNodes((prev) => prev.map((n) => (n.id === selNode ? { ...n, name: nm.slice(0, 50), kind: editKind, note: editNote.slice(0, 1200) } : n)))
    setNote('수정했어요.')
  }
  const saveLinkEdit = () => {
    if (!selLink) return
    setLinks((prev) => prev.map((e) => (e.id === selLink ? { ...e, kind: editLinkKind, label: editLinkLabel.slice(0, 40) } : e)))
    setNote('연결을 수정했어요.')
  }

  // ---- 공유 장소 라이브러리 연계 ----
  // 선택한 노드를 공유 'places' 라이브러리에 저장(배경 설정집 등과 공유).
  // 노드 kind 라벨을 SharedPlace.kind 로 담아 다른 도구에서 유형이 보이게 한다.
  const saveNodeToLibrary = () => {
    if (!selNode) return
    const n = nodes.find((x) => x.id === selNode)
    if (!n) return
    const name = n.name.trim()
    if (!name) { setNote('지명이 비어 있어 저장할 수 없어요.'); return }
    addToLibrary('places', { name, kind: kindOf(n.kind).label, notes: n.note })
    setNote(isLastWriteOk() ? `'${name}'을(를) 장소 라이브러리에 저장했어요.` : '저장 공간이 부족해 라이브러리 저장에 실패했어요.')
  }

  // 라이브러리에서 장소를 골라 새 노드로 불러오기. 유형은 매핑표로 노드 kind 로 변환.
  const loadFromLibrary = (libId: string) => {
    if (!libId) return
    const p = libPlaces.find((x) => x.id === libId)
    if (!p) { setNote('선택한 장소를 찾을 수 없어요.'); return }
    const name = (p.name || '').trim()
    if (!name) { setNote('이름이 없는 장소예요.'); return }
    const noteText = (p.notes || p.history || '').toString()
    const id = addNode(name, mapKind(p.kind), noteText)
    if (id) { setNote(`'${name}'을(를) 라이브러리에서 불러왔어요.`); selectNode(id) }
    setLibPick('')
  }

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setLinks((prev) => prev.filter((e) => e.a !== id && e.b !== id))
    if (selNode === id) setSelNode(null)
    if (linkFrom === id) setLinkFrom(null)
  }
  const deleteLink = (id: string) => {
    setLinks((prev) => prev.filter((e) => e.id !== id))
    if (selLink === id) setSelLink(null)
  }

  // ---- 연결 만들기 ----
  const onNodeClickForLink = (id: string) => {
    if (linkFrom == null) { setLinkFrom(id); setNote('연결할 대상 노드를 클릭하세요. (다시 같은 노드를 누르면 취소)'); return }
    if (linkFrom === id) { setLinkFrom(null); setNote('연결을 취소했어요.'); return }
    const a = linkFrom, b = id
    setLinks((prev) => {
      if (prev.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) {
        setNote('이미 연결되어 있어요.')
        return prev
      }
      const e: MapLink = { id: newId(), a, b, kind: linkKind, label: '' }
      setNote('연결했어요.')
      return [...prev, e]
    })
    setLinkFrom(null)
  }

  // ===== 노드 드래그(포인터 이벤트 직접 구현) =====
  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    if (linkMode) { onNodeClickForLink(id); return }
    e.stopPropagation()
    const n = nodes.find((x) => x.id === id)
    if (!n) return
    nodeDrag.current = { id, sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y, moved: false }
    window.addEventListener('pointermove', onNodePointerMove)
    window.addEventListener('pointerup', onNodePointerUp)
  }
  const onNodePointerMove = (e: PointerEvent) => {
    const d = nodeDrag.current
    if (!d) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    if (d.moved) setNodes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x: d.nx + dx, y: d.ny + dy } : n)))
  }
  const onNodePointerUp = () => {
    const d = nodeDrag.current
    window.removeEventListener('pointermove', onNodePointerMove)
    window.removeEventListener('pointerup', onNodePointerUp)
    if (d && !d.moved) selectNode(d.id) // 클릭(이동 안 함) → 선택
    nodeDrag.current = null
  }

  // ===== 캔버스 패닝(빈 곳 드래그) =====
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    // 빈 캔버스 클릭 시 선택 해제 + 패닝 시작
    panDrag.current = { sx: e.clientX, sy: e.clientY, ox, oy, moved: false }
    window.addEventListener('pointermove', onCanvasPointerMove)
    window.addEventListener('pointerup', onCanvasPointerUp)
  }
  const onCanvasPointerMove = (e: PointerEvent) => {
    const d = panDrag.current
    if (!d) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    if (d.moved) { setOx(d.ox + dx); setOy(d.oy + dy) }
  }
  const onCanvasPointerUp = () => {
    const d = panDrag.current
    window.removeEventListener('pointermove', onCanvasPointerMove)
    window.removeEventListener('pointerup', onCanvasPointerUp)
    if (d && !d.moved) { setSelNode(null); setSelLink(null); if (!linkMode) setLinkFrom(null) }
    panDrag.current = null
  }

  // 언마운트 시 떠 있을 수 있는 전역 리스너 정리
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onNodePointerMove)
      window.removeEventListener('pointerup', onNodePointerUp)
      window.removeEventListener('pointermove', onCanvasPointerMove)
      window.removeEventListener('pointerup', onCanvasPointerUp)
    }
  }, [])

  // ===== [연계] 좌측 바인더 파일을 캔버스에 드롭 → 노드로 추가 =====
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const name = (it.character?.name || it.title || '').trim()
    if (!name) return
    const summary = (it.text || '').replace(/\s+/g, ' ').trim().slice(0, 400)
    const id = addNode(name, 'other', summary)
    if (id) { setNote(`'${name}' 노드를 추가했어요.`); selectNode(id) }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }
  const onDragEnter = (e: React.DragEvent) => { if (isItemDrag(e)) { dragDepth.current++; setDropActive(true) } }
  const onDragLeave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) }

  // ===== [연계] payload.places / payload.title 로 들어온 지명을 노드로 추가 =====
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const p = payload as Record<string, unknown>
    const raw = p.places || p.place || p.title
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    let added = 0
    for (const item of list) {
      const nm = typeof item === 'string' ? item : (item && typeof item === 'object' ? String((item as any).name || '') : '')
      if (!nm.trim()) continue
      const noteText = item && typeof item === 'object' ? String((item as any).note || (item as any).history || '') : ''
      // 항목별 유형(item.kind) 우선 → 없으면 payload 전역 kind → 매핑표로 노드 kind 결정
      const rawKind = (item && typeof item === 'object' && (item as any).kind != null)
        ? (item as any).kind
        : p.kind
      if (addNode(nm, mapKind(rawKind), noteText)) added++
    }
    if (mounted.current && added > 0) setNote(`지명 ${added}곳을 노드로 추가했어요.`)
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // ===== 지명 목록 종합 → 프로젝트에 추가 =====
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildSummaryHtml = (): string => {
    if (!nodes.length) return ''
    const byKind: Record<string, MapNode[]> = {}
    for (const n of nodes) { (byKind[n.kind] ||= []).push(n) }
    const parts: string[] = []
    for (const k of NODE_KINDS) {
      const arr = byKind[k.key]
      if (!arr || !arr.length) continue
      parts.push(`<h3>${k.icon} ${esc(k.label)} (${arr.length})</h3>`)
      parts.push('<ul>')
      for (const n of arr) {
        const conns = links.filter((e) => e.a === n.id || e.b === n.id)
        const connTxt = conns.map((e) => {
          const otherId = e.a === n.id ? e.b : e.a
          const other = nodes.find((x) => x.id === otherId)
          const lk = linkKindOf(e.kind)
          return other ? `${esc(other.name)}(${esc(lk.label)}${e.label ? ':' + esc(e.label) : ''})` : ''
        }).filter(Boolean).join(', ')
        let li = `<li><b>${esc(n.name)}</b>`
        if (n.note.trim()) li += ` — ${esc(n.note.trim())}`
        if (connTxt) li += `<br><small>연결: ${connTxt}</small>`
        li += '</li>'
        parts.push(li)
      }
      parts.push('</ul>')
    }
    return parts.join('\n')
  }

  const exportToProject = () => {
    if (!nodes.length) { setNote('먼저 지명을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('지금은 프로젝트에 연결되어 있지 않아요(독립 실행 중).'); return }
    const html = buildSummaryHtml()
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `월드맵 지명 목록 (${nodes.length}곳)`,
      bodyHtml: html,
      meta: { 노드수: String(nodes.length), 연결수: String(links.length) },
    })
    setNote(id ? `프로젝트 '세계관' 폴더에 지명 목록을 추가했어요.` : '추가에 실패했어요.')
  }

  // 텍스트로 복사(클립보드)
  const copyText = async () => {
    if (!nodes.length) { setNote('먼저 지명을 추가하세요.'); return }
    const lines: string[] = ['# 월드맵 지명 목록', '']
    for (const k of NODE_KINDS) {
      const arr = nodes.filter((n) => n.kind === k.key)
      if (!arr.length) continue
      lines.push(`## ${k.icon} ${k.label} (${arr.length})`)
      for (const n of arr) {
        lines.push(`- ${n.name}${n.note.trim() ? ' — ' + n.note.trim() : ''}`)
      }
      lines.push('')
    }
    if (links.length) {
      lines.push('## 연결')
      for (const e of links) {
        const a = nodes.find((x) => x.id === e.a), b = nodes.find((x) => x.id === e.b)
        if (a && b) lines.push(`- ${a.name} ↔ ${b.name} (${linkKindOf(e.kind).label}${e.label ? ': ' + e.label : ''})`)
      }
    }
    const txt = lines.join('\n')
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('클립보드에 복사했어요.') }
      else setNote('이 브라우저에서 복사를 지원하지 않아요.')
    } catch { setNote('복사에 실패했어요.') }
  }

  const clearAll = () => {
    if (!nodes.length && !links.length) return
    if (!confirm('지도를 모두 비울까요? 되돌릴 수 없어요.')) return
    setNodes([]); setLinks([]); setSelNode(null); setSelLink(null); setLinkFrom(null); setNote('지도를 비웠어요.')
  }

  const resetView = () => { setOx(0); setOy(0); setNote('뷰를 원점으로 되돌렸어요.') }

  // 노드 중심 좌표(화면 = 모델 + 패닝)
  const cx = (n: MapNode) => n.x + ox + NODE_W / 2
  const cy = (n: MapNode) => n.y + oy + NODE_H / 2

  const sel = nodeById(selNode)
  const selEdge = selLink ? links.find((e) => e.id === selLink) : undefined

  // ---- 스타일 토큰 ----
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', fontSize: 13 }}>
      {/* 상단 툴바 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAddDraft() }}
          placeholder="지명 입력(예: 은빛 항구)"
          style={{ ...inputStyle, width: 180 }}
        />
        <select value={draftKind} onChange={(e) => setDraftKind(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          {NODE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.icon} {k.label}</option>)}
        </select>
        <button className="btn-primary" onClick={onAddDraft}>+ 노드 추가</button>

        <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />

        <button
          className="minibtn"
          onClick={() => { setLinkMode((v) => { const nv = !v; if (!nv) setLinkFrom(null); else setNote('연결 모드: 두 노드를 차례로 클릭해 이으세요.'); return nv }) }}
          style={{ background: linkMode ? 'var(--accent)' : undefined, color: linkMode ? '#fff' : undefined, borderColor: linkMode ? 'var(--accent)' : undefined }}
        ><Emoji e="🔗" /> 연결 모드 {linkMode ? 'ON' : 'OFF'}</button>
        <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)} style={{ ...inputStyle, width: 'auto' }} disabled={!linkMode} title="연결 선 종류">
          {LINK_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>

        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={resetView} title="패닝 원점으로">⊙ 뷰 초기화</button>
        <button className="minibtn" onClick={copyText} title="지명 목록 텍스트 복사"><Emoji e="📋" /> 복사</button>
        <button className="linkbtn" onClick={exportToProject} title="프로젝트 세계관 폴더에 지명 목록 추가"><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={clearAll} style={{ color: 'var(--muted)' }}><Emoji e="🗑" /> 비우기</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 캔버스 */}
        <div
          ref={wrapRef}
          onPointerDown={onCanvasPointerDown}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDropItem}
          style={{
            position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden',
            background: 'var(--paper)',
            backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            backgroundPosition: `${ox}px ${oy}px`,
            cursor: panDrag.current?.moved ? 'grabbing' : 'grab',
            outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -4,
            touchAction: 'none', userSelect: 'none',
          }}
        >
          {/* 연결선 SVG (포인터는 path 위에서만 받음) */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {links.map((e) => {
              const a = nodes.find((x) => x.id === e.a)
              const b = nodes.find((x) => x.id === e.b)
              if (!a || !b) return null
              const lk = linkKindOf(e.kind)
              const x1 = cx(a), y1 = cy(a), x2 = cx(b), y2 = cy(b)
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
              const isSel = selLink === e.id
              return (
                <g key={e.id}>
                  {/* 굵은 투명 히트영역(클릭하기 쉽게) */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent" strokeWidth={14}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onPointerDown={(ev) => { ev.stopPropagation(); selectLink(e.id) }}
                  />
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={lk.color} strokeWidth={isSel ? lk.width + 2 : lk.width}
                    strokeDasharray={lk.dash || undefined} strokeLinecap="round"
                    opacity={isSel ? 1 : 0.85} style={{ pointerEvents: 'none' }}
                  />
                  {e.label ? (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={mx - e.label.length * 4 - 6} y={my - 10} width={e.label.length * 8 + 12} height={18} rx={5} fill="var(--panel)" stroke={lk.color} opacity={0.95} />
                      <text x={mx} y={my + 3} textAnchor="middle" fontSize={11} fill="var(--text)">{e.label}</text>
                    </g>
                  ) : null}
                </g>
              )
            })}
            {/* 연결 시작점에서 끌리는 임시 강조(시작 노드 표시) */}
            {linkFrom && (() => {
              const f = nodes.find((x) => x.id === linkFrom)
              if (!f) return null
              return <circle cx={cx(f)} cy={cy(f)} r={NODE_W / 2 + 6} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 4" style={{ pointerEvents: 'none' }} />
            })()}
          </svg>

          {/* 노드들 */}
          {nodes.map((n) => {
            const k = kindOf(n.kind)
            const isSel = selNode === n.id
            const isFrom = linkFrom === n.id
            return (
              <div
                key={n.id}
                onPointerDown={(e) => onNodePointerDown(e, n.id)}
                title={n.note || n.name}
                style={{
                  position: 'absolute',
                  left: n.x + ox, top: n.y + oy,
                  width: NODE_W, minHeight: NODE_H, boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 8px', borderRadius: 9,
                  background: 'var(--panel)',
                  border: `2px solid ${isSel ? 'var(--accent)' : isFrom ? k.color : 'var(--border)'}`,
                  borderLeft: `6px solid ${k.color}`,
                  boxShadow: isSel ? '0 0 0 2px var(--accent)' : '0 1px 4px rgba(0,0,0,0.18)',
                  cursor: linkMode ? 'crosshair' : 'move',
                  zIndex: isSel ? 3 : 2,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}><Emoji e={k.icon} /></span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{k.label}{n.note.trim() ? <> · <Emoji e="📝" /></> : ''}</div>
                </div>
              </div>
            )
          })}

          {/* 빈 상태 안내 */}
          {!nodes.length && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', flexDirection: 'column', gap: 8, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 42 }}><Emoji e="🗺️" /></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>빈 세계가 펼쳐져 있어요</div>
              <div>위에서 <b>지명</b>을 입력하고 <b>+ 노드 추가</b>로 도시·지역·랜드마크를 놓아 보세요.<br />노드를 끌어 배치하고, <b><Emoji e="🔗" /> 연결 모드</b>로 경로·국경을 이을 수 있어요.<br />빈 곳을 드래그하면 지도를 <b>패닝</b>합니다. 좌측 파일을 끌어다 놓아도 노드가 돼요.</div>
            </div>
          )}

          {/* 통계/안내 오버레이 */}
          <div style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 11, color: 'var(--muted)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', pointerEvents: 'none' }}>
            노드 {nodes.length} · 연결 {links.length}{linkFrom ? ' · 연결 시작점 선택됨' : ''}
          </div>
        </div>

        {/* 우측 인스펙터 */}
        <div style={{ width: 248, flexShrink: 0, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--panel)' }}>
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {note && (
              <div style={{ fontSize: 12, color: 'var(--ok)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }}>{note}</div>
            )}

            {sel ? (
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}><Emoji e="📍" /> 노드 편집</div>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>지명</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>종류</label>
                <select value={editKind} onChange={(e) => setEditKind(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
                  {NODE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.icon} {k.label}</option>)}
                </select>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>메모</label>
                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={5} placeholder="이 장소의 역사·분위기·사건 등을 적어두세요" style={{ ...inputStyle, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" onClick={saveNodeEdit} style={{ flex: 1 }}>저장</button>
                  <button className="minibtn" onClick={() => { if (selNode) onNodeClickForLink(selNode); setLinkMode(true) }} title="이 노드에서 연결 시작"><Emoji e="🔗" /></button>
                  <button className="minibtn" onClick={() => selNode && deleteNode(selNode)} style={{ color: 'var(--muted)' }}><Emoji e="🗑" /></button>
                </div>
                <button className="linkbtn" onClick={saveNodeToLibrary} style={{ width: '100%', marginTop: 6 }} title="이 노드를 공유 장소 라이브러리에 저장(배경 설정집 등과 공유)"><Emoji e="📚" /> 장소 라이브러리에 저장</button>
              </div>
            ) : selEdge ? (
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}><Emoji e="🔗" /> 연결 편집</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  {nodes.find((x) => x.id === selEdge.a)?.name} ↔ {nodes.find((x) => x.id === selEdge.b)?.name}
                </div>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>종류</label>
                <select value={editLinkKind} onChange={(e) => setEditLinkKind(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
                  {LINK_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>라벨(선택)</label>
                <input value={editLinkLabel} onChange={(e) => setEditLinkLabel(e.target.value)} placeholder="예: 3일 거리" style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" onClick={saveLinkEdit} style={{ flex: 1 }}>저장</button>
                  <button className="minibtn" onClick={() => selLink && deleteLink(selLink)} style={{ color: 'var(--muted)' }}><Emoji e="🗑" /> 삭제</button>
                </div>
              </div>
            ) : (
              <div style={{ ...card, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>사용법</div>
                노드를 클릭하면 여기서 편집해요.<br />
                · 노드 드래그 → 배치<br />
                · 빈 곳 드래그 → 패닝<br />
                · <Emoji e="🔗" /> 연결 모드 → 두 노드 클릭으로 잇기<br />
                · 연결선 클릭 → 종류·라벨 편집<br />
                · 좌측 파일 드롭 → 노드 생성
              </div>
            )}

            {/* 종류별 목록 */}
            {nodes.length > 0 && (
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>지명 목록 ({nodes.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflow: 'auto' }}>
                  {nodes.map((n) => {
                    const k = kindOf(n.kind)
                    return (
                      <button
                        key={n.id}
                        onClick={() => selectNode(n.id)}
                        className="minibtn"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left', width: '100%',
                          borderLeft: `4px solid ${k.color}`,
                          background: selNode === n.id ? 'var(--accent)' : undefined,
                          color: selNode === n.id ? '#fff' : undefined,
                        }}
                      >
                        <span><Emoji e={k.icon} /></span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 공유 장소 라이브러리에서 불러오기 */}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}><Emoji e="📚" /> 라이브러리 장소 불러오기</div>
              {libPlaces.length ? (
                <select
                  value={libPick}
                  onChange={(e) => { const v = e.target.value; setLibPick(v); loadFromLibrary(v) }}
                  style={inputStyle}
                  title="공유 장소 라이브러리에서 골라 노드로 추가"
                >
                  <option value="">장소 선택…</option>
                  {libPlaces.map((p) => (
                    <option key={p.id} value={p.id}>{(p.name || '(이름 없음)')}{p.kind ? ` · ${p.kind}` : ''}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  아직 저장된 장소가 없어요. 노드를 선택하고 <b>장소 라이브러리에 저장</b>하거나, 배경 설정집에서 장소를 저장해 보세요.
                </div>
              )}
            </div>

            {/* 범례 */}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>연결선 범례</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {LINK_KINDS.map((k) => (
                  <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <svg width={36} height={8} style={{ flexShrink: 0 }}>
                      <line x1={0} y1={4} x2={36} y2={4} stroke={k.color} strokeWidth={k.width} strokeDasharray={k.dash || undefined} strokeLinecap="round" />
                    </svg>
                    <span style={{ color: 'var(--muted)' }}>{k.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
