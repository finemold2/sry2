// 자유 핀보드(Milanote식) — 무한 캔버스에 메모 카드·색 라벨·이미지(URL/라이브러리)·링크·바인더 파일을
// 자유롭게 배치(드래그 이동·크기 조절)하고, 추가/편집/삭제·색 지정·연결선까지 지원하는 큰 규모의 구상 도구.
// react 와 프로젝트 연계 허브('./linkbus') 외 import 없음. 데이터는 localStorage 에 자동 저장/복원.
// Web API(포인터/드래그앤드롭/클립보드/파일 다운로드)만 사용하며, 미지원 환경은 graceful 처리한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary, useLibraryList,
  addToStash, hasStash,
  openToolLinked, TOOL_RELATIONS,
  getDragItem, isItemDrag,
  Emoji, emojify,
  type SharedImage,
} from './linkbus'

export const meta = { id: 'pinboard-canvas', name: '핀보드', icon: '📌', group: '구상·정리', intro: '무한 캔버스에 메모·라벨·이미지·링크를 자유롭게 붙여 구상을 시각화', w: 900, h: 660 }

const TOOL_ID = 'pinboard-canvas'
const LS_KEY = 'sry:tool:pinboard-canvas'

// ---------- 모델 ----------
type CardKind = 'memo' | 'label' | 'image' | 'link' | 'file'
interface Card {
  id: string
  kind: CardKind
  x: number
  y: number
  w: number
  h: number
  z: number
  color: string         // 카드 배경/라벨 색
  title?: string        // 메모 제목 / 링크 제목 / 파일 제목
  text?: string         // 메모 본문 / 라벨 텍스트
  url?: string          // 이미지/링크 URL
  credit?: string       // 이미지 출처 표기
  fileId?: string       // 바인더 파일 id(드롭 출처 추적용)
}
interface Edge { id: string; from: string; to: string }
interface Board { cards: Card[]; edges: Edge[]; panX: number; panY: number }

// 카드 종류별 기본 크기
const SIZE: Record<CardKind, { w: number; h: number }> = {
  memo: { w: 200, h: 130 },
  label: { w: 150, h: 44 },
  image: { w: 200, h: 160 },
  link: { w: 220, h: 78 },
  file: { w: 200, h: 96 },
}
const MIN_W = 90
const MIN_H = 40

// 저작권·초상권 경고 문구(이미지 URL 추가/수신 공통)
const IMG_LICENSE_WARNING = '라이선스를 직접 확인했고 사용 권한이 있는 이미지만 추가하세요. 무단 저작물·상업 썸네일·초상권 불명 인물 사진은 금지됩니다. 추가하는 이미지의 권리 책임은 사용자 본인에게 있습니다.'

// 파스텔 팔레트(메모/파일) + 선명 라벨 팔레트
const CARD_COLORS = ['#fff8c4', '#ffd9d4', '#d4f4dd', '#d6e7ff', '#efd9ff', '#ffe6c4', '#e8e8ee', '#ffffff']
const LABEL_COLORS = ['#f4b400', '#db4437', '#0f9d58', '#4a76d4', '#bf5af2', '#ff7043', '#5f6b7a', '#1f2329']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function defaultBoard(): Board {
  return {
    cards: [
      { id: newId(), kind: 'label', x: 60, y: 50, w: 170, h: 44, z: 1, color: '#4a76d4', text: '핀보드 시작!' },
      { id: newId(), kind: 'memo', x: 60, y: 120, w: 220, h: 150, z: 2, color: '#fff8c4', title: '메모', text: '빈 곳을 더블클릭하거나 위 버튼으로 카드를 추가하세요. 카드는 자유롭게 드래그해 배치할 수 있어요.' },
    ],
    edges: [],
    panX: 0,
    panY: 0,
  }
}

function loadBoard(): Board {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultBoard()
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.cards)) return defaultBoard()
    const cards: Card[] = p.cards
      .filter((c: any) => c && typeof c.id === 'string')
      .map((c: any, i: number): Card => {
        const kind: CardKind = ['memo', 'label', 'image', 'link', 'file'].includes(c.kind) ? c.kind : 'memo'
        const base = SIZE[kind]
        return {
          id: String(c.id),
          kind,
          x: Number.isFinite(c.x) ? c.x : 40 + i * 16,
          y: Number.isFinite(c.y) ? c.y : 40 + i * 16,
          w: Number.isFinite(c.w) ? Math.max(MIN_W, c.w) : base.w,
          h: Number.isFinite(c.h) ? Math.max(MIN_H, c.h) : base.h,
          z: Number.isFinite(c.z) ? c.z : i + 1,
          color: typeof c.color === 'string' ? c.color : (kind === 'label' ? LABEL_COLORS[3] : CARD_COLORS[0]),
          title: typeof c.title === 'string' ? c.title : undefined,
          text: typeof c.text === 'string' ? c.text : undefined,
          url: typeof c.url === 'string' ? c.url : undefined,
          credit: typeof c.credit === 'string' ? c.credit : undefined,
          fileId: typeof c.fileId === 'string' ? c.fileId : undefined,
        }
      })
    const ids = new Set(cards.map((c) => c.id))
    const edges: Edge[] = Array.isArray(p.edges)
      ? p.edges
          .filter((e: any) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
          .map((e: any) => ({ id: typeof e.id === 'string' ? e.id : newId(), from: String(e.from), to: String(e.to) }))
      : []
    return {
      cards,
      edges,
      panX: Number.isFinite(p.panX) ? p.panX : 0,
      panY: Number.isFinite(p.panY) ? p.panY : 0,
    }
  } catch {
    return defaultBoard()
  }
}

// 색이 어두운지(흰 글자 필요) 판정 — 라벨 가독성용
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

function fmtUrl(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return (url || '').replace(/^https?:\/\//, '').split('/')[0] || url }
}

type DragMode =
  | { type: 'card'; id: string; offX: number; offY: number; moved: boolean }
  | { type: 'resize'; id: string; startX: number; startY: number; startW: number; startH: number }
  | { type: 'pan'; startX: number; startY: number; startPanX: number; startPanY: number; moved: boolean }

export default function PinboardCanvas({ payload }: { payload?: Record<string, unknown> }) {
  const [board, setBoard] = useState<Board>(() => loadBoard())
  const [selected, setSelected] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // 인라인 편집 중인 카드 id
  const [linkFrom, setLinkFrom] = useState<string | null>(null) // 연결 모드 시작 카드
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [urlPrompt, setUrlPrompt] = useState<null | { kind: 'image' | 'link' }>(null)
  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')

  const libImages = useLibraryList('images')
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragMode | null>(null)
  const mounted = useRef(true)
  const dragDepth = useRef(0)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(board)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 보드가 사라질 수 있어요.') }
  }, [board])

  // 토스트 자동 해제
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => { if (mounted.current) setToast('') }, 1700)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((m: string) => { if (mounted.current) setToast(m) }, [])

  const nextZ = useCallback((b: Board) => (b.cards.reduce((m, c) => Math.max(m, c.z), 0) + 1), [])

  const cardById = useCallback((id: string | null) => board.cards.find((c) => c.id === id) || null, [board.cards])

  // 캔버스 보이는 영역 중앙(보드 좌표) — 새 카드 배치 기준
  const viewCenter = useCallback((): { x: number; y: number } => {
    const sc = scrollRef.current
    if (!sc) return { x: 120 - board.panX, y: 100 - board.panY }
    return {
      x: sc.scrollLeft + sc.clientWidth / 2 - board.panX - 100,
      y: sc.scrollTop + sc.clientHeight / 2 - board.panY - 70,
    }
  }, [board.panX, board.panY])

  // ---------- 카드 추가 ----------
  const addCard = useCallback((kind: CardKind, partial?: Partial<Card>, at?: { x: number; y: number }) => {
    const base = SIZE[kind]
    const pos = at || viewCenter()
    const id = newId()
    setBoard((prev) => {
      const card: Card = {
        id,
        kind,
        x: Math.max(0, partial?.x ?? pos.x),
        y: Math.max(0, partial?.y ?? pos.y),
        w: partial?.w ?? base.w,
        h: partial?.h ?? base.h,
        z: nextZ(prev),
        color: partial?.color ?? (kind === 'label' ? LABEL_COLORS[3] : CARD_COLORS[0]),
        title: partial?.title,
        text: partial?.text,
        url: partial?.url,
        credit: partial?.credit,
        fileId: partial?.fileId,
      }
      return { ...prev, cards: [...prev.cards, card] }
    })
    setSelected(id); setSelEdge(null)
    return id
  }, [nextZ, viewCenter])

  // payload 로 전달된 이미지/메모/링크를 카드로 자동 생성(다른 도구에서 보낸 데이터)
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const at = viewCenter()
    const img = payload.image as { url?: string; title?: string; credit?: string } | undefined
    if (img && typeof img.url === 'string') {
      addCard('image', { url: img.url, title: img.title, credit: img.credit }, at)
      showToast('보낸 이미지를 카드로 추가했어요')
      setNote(IMG_LICENSE_WARNING)
      return
    }
    if (typeof payload.url === 'string') {
      addCard('link', { url: payload.url, title: typeof payload.title === 'string' ? payload.title : undefined }, at)
      showToast('링크를 카드로 추가했어요')
      return
    }
    if (typeof payload.text === 'string' || typeof payload.title === 'string') {
      addCard('memo', { title: typeof payload.title === 'string' ? payload.title : '메모', text: typeof payload.text === 'string' ? payload.text : '' }, at)
      showToast('메모를 카드로 추가했어요')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const patchCard = useCallback((id: string, patch: Partial<Card>) => {
    setBoard((prev) => ({ ...prev, cards: prev.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }, [])

  const bringToFront = useCallback((id: string) => {
    setBoard((prev) => ({ ...prev, cards: prev.cards.map((c) => (c.id === id ? { ...c, z: nextZ(prev) } : c)) }))
  }, [nextZ])

  const removeCard = useCallback((id: string) => {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
      edges: prev.edges.filter((e) => e.from !== id && e.to !== id),
    }))
    if (selected === id) setSelected(null)
    if (editing === id) setEditing(null)
    if (linkFrom === id) setLinkFrom(null)
  }, [selected, editing, linkFrom])

  const duplicateCard = useCallback((id: string) => {
    const c = cardById(id)
    if (!c) return
    addCard(c.kind, { ...c, x: c.x + 24, y: c.y + 24, id: undefined as any }, { x: c.x + 24, y: c.y + 24 })
  }, [cardById, addCard])

  // 연결선 추가(중복/자기연결 방지)
  const connect = useCallback((from: string, to: string) => {
    setBoard((prev) => {
      if (from === to) return prev
      const exists = prev.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
      if (exists) return prev
      return { ...prev, edges: [...prev.edges, { id: newId(), from, to }] }
    })
  }, [])
  const removeEdge = useCallback((id: string) => {
    setBoard((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== id) }))
    if (selEdge === id) setSelEdge(null)
  }, [selEdge])

  // ---------- 좌표 변환 ----------
  const toBoardCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const el = canvasRef.current
    if (!el) return { x: clientX, y: clientY }
    const r = el.getBoundingClientRect()
    // canvas(절대배치, panX/panY 만큼 translate)의 좌상단 기준
    return { x: clientX - r.left - board.panX, y: clientY - r.top - board.panY }
  }, [board.panX, board.panY])

  // ---------- 포인터 드래그(카드 이동 / 리사이즈 / 패닝) ----------
  const onMoveRef = useRef<(e: PointerEvent) => void>(() => {})
  const onUpRef = useRef<() => void>(() => {})

  onMoveRef.current = (e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (d.type === 'card') {
      const { x, y } = toBoardCoords(e.clientX, e.clientY)
      const nx = Math.max(0, x - d.offX)
      const ny = Math.max(0, y - d.offY)
      d.moved = true
      setBoard((prev) => ({ ...prev, cards: prev.cards.map((c) => (c.id === d.id ? { ...c, x: nx, y: ny } : c)) }))
    } else if (d.type === 'resize') {
      const dw = e.clientX - d.startX
      const dh = e.clientY - d.startY
      setBoard((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === d.id ? { ...c, w: Math.max(MIN_W, d.startW + dw), h: Math.max(MIN_H, d.startH + dh) } : c)),
      }))
    } else if (d.type === 'pan') {
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
      setBoard((prev) => ({ ...prev, panX: d.startPanX + dx, panY: d.startPanY + dy }))
    }
  }
  onUpRef.current = () => {
    dragRef.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  const onMove = useRef((e: PointerEvent) => onMoveRef.current(e)).current
  const onUp = useRef(() => onUpRef.current()).current

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginDrag = (mode: DragMode) => {
    dragRef.current = mode
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startCardDrag = (e: React.PointerEvent, id: string) => {
    if (editing === id) return
    if (linkFrom) return
    e.stopPropagation()
    const c = cardById(id)
    if (!c) return
    const { x, y } = toBoardCoords(e.clientX, e.clientY)
    bringToFront(id)
    setSelected(id); setSelEdge(null)
    beginDrag({ type: 'card', id, offX: x - c.x, offY: y - c.y, moved: false })
  }

  const startResize = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    const c = cardById(id)
    if (!c) return
    bringToFront(id)
    setSelected(id); setSelEdge(null)
    beginDrag({ type: 'resize', id, startX: e.clientX, startY: e.clientY, startW: c.w, startH: c.h })
  }

  const startPan = (e: React.PointerEvent) => {
    // 빈 캔버스에서만 패닝(카드 위가 아닐 때)
    if (e.button !== 0) return
    beginDrag({ type: 'pan', startX: e.clientX, startY: e.clientY, startPanX: board.panX, startPanY: board.panY, moved: false })
  }

  const onCardClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (linkFrom) {
      if (linkFrom !== id) { connect(linkFrom, id); setLinkFrom(null); showToast('연결했어요') }
      else setLinkFrom(null)
      return
    }
    setSelected(id); setSelEdge(null)
  }

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvas === '1') {
      startPan(e)
    }
  }
  const onCanvasClick = (e: React.MouseEvent) => {
    if (dragRef.current) return
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvas === '1') {
      setSelected(null); setSelEdge(null); setLinkFrom(null)
    }
  }
  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!(e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvas === '1')) return
    const { x, y } = toBoardCoords(e.clientX, e.clientY)
    const id = addCard('memo', { x: Math.max(0, x - 100), y: Math.max(0, y - 65) })
    setEditing(id)
  }

  // ---------- 바인더 파일 드롭 → 카드 ----------
  const onDragEnter = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current += 1
    setDropActive(true)
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }
  const onDragLeave = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDropActive(false)
  }
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const { x, y } = toBoardCoords(e.clientX, e.clientY)
    const name = (it.character?.name || it.title || '파일').trim() || '파일'
    const snippet = (it.text || '').trim().slice(0, 200)
    addCard('file', {
      x: Math.max(0, x - 100),
      y: Math.max(0, y - 48),
      title: name,
      text: snippet || `유형: ${it.type || '문서'}`,
      fileId: it.id,
    })
    showToast(`바인더 파일 "${name}"을 카드로 추가했어요`)
  }

  // ---------- 라이브러리 이미지 → 카드 ----------
  const addLibImage = (img: SharedImage) => {
    addCard('image', { url: img.url, title: img.title, credit: img.credit })
    setShowLibrary(false)
    showToast('라이브러리 이미지를 추가했어요')
  }

  // ---------- URL 입력(이미지/링크) ----------
  const openUrlPrompt = (kind: 'image' | 'link') => {
    setUrlPrompt({ kind })
    setUrlInput('')
    setTitleInput('')
  }
  const confirmUrlPrompt = () => {
    if (!urlPrompt) return
    const url = urlInput.trim()
    if (!url) { setUrlPrompt(null); return }
    const safe = /^https?:\/\//i.test(url) ? url : 'https://' + url
    addCard(urlPrompt.kind, { url: safe, title: titleInput.trim() || undefined })
    setUrlPrompt(null)
    showToast(urlPrompt.kind === 'image' ? '이미지 카드를 추가했어요' : '링크 카드를 추가했어요')
  }

  // ---------- 색 변경 ----------
  const setColor = (id: string, color: string) => patchCard(id, { color })

  // ---------- 인라인 편집 종료 ----------
  const stopEditing = useCallback(() => setEditing(null), [])

  // ---------- 키보드 ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (e.key === 'Delete') {
      if (selEdge) { e.preventDefault(); removeEdge(selEdge) }
      else if (selected) { e.preventDefault(); removeCard(selected) }
    } else if (e.key === 'Enter' && selected) {
      const c = cardById(selected)
      if (c && (c.kind === 'memo' || c.kind === 'label')) { e.preventDefault(); setEditing(selected) }
    } else if (e.key === 'Escape') {
      setLinkFrom(null); setSelected(null); setSelEdge(null)
    } else if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey) && selected) {
      e.preventDefault(); duplicateCard(selected)
    }
  }

  // ---------- 텍스트/HTML 내보내기 ----------
  const buildText = (): string => {
    const cs = [...board.cards].sort((a, b) => (a.y - b.y) || (a.x - b.x))
    const lines: string[] = ['# 핀보드', '']
    for (const c of cs) {
      if (c.kind === 'label') lines.push(`【${c.text || ''}】`)
      else if (c.kind === 'memo') {
        lines.push(`■ ${c.title || '메모'}`)
        if (c.text) lines.push(c.text)
        lines.push('')
      } else if (c.kind === 'image') lines.push(`🖼 ${c.title || '이미지'} — ${c.url || ''}${c.credit ? ` (${c.credit})` : ''}`)
      else if (c.kind === 'link') lines.push(`🔗 ${c.title || fmtUrl(c.url || '')} — ${c.url || ''}`)
      else if (c.kind === 'file') {
        lines.push(`📄 ${c.title || '파일'}`)
        if (c.text) lines.push(c.text)
      }
    }
    if (board.edges.length) {
      lines.push('', '— 연결 —')
      const byId = new Map(board.cards.map((c) => [c.id, c]))
      for (const e of board.edges) {
        const a = byId.get(e.from), b = byId.get(e.to)
        const nm = (c?: Card) => (c ? (c.title || c.text || (c.kind === 'image' ? '이미지' : c.kind === 'link' ? fmtUrl(c.url || '') : '카드')) : '?')
        lines.push(`${nm(a)} ↔ ${nm(b)}`)
      }
    }
    return lines.join('\n')
  }

  const buildHtml = (): string => {
    const cs = [...board.cards].sort((a, b) => (a.y - b.y) || (a.x - b.x))
    const parts: string[] = []
    for (const c of cs) {
      if (c.kind === 'label') parts.push(`<p><b>【${escHtml(c.text || '')}】</b></p>`)
      else if (c.kind === 'memo') {
        parts.push(`<h3>${escHtml(c.title || '메모')}</h3>`)
        if (c.text) parts.push(`<p>${escHtml(c.text).replace(/\n/g, '<br>')}</p>`)
      } else if (c.kind === 'image') {
        parts.push(`<p>🖼 ${escHtml(c.title || '이미지')} — <a href="${escHtml(c.url || '')}">${escHtml(c.url || '')}</a>${c.credit ? ' (' + escHtml(c.credit) + ')' : ''}</p>`)
      } else if (c.kind === 'link') {
        parts.push(`<p>🔗 <a href="${escHtml(c.url || '')}">${escHtml(c.title || fmtUrl(c.url || ''))}</a></p>`)
      } else if (c.kind === 'file') {
        parts.push(`<p>📄 <b>${escHtml(c.title || '파일')}</b></p>`)
        if (c.text) parts.push(`<p>${escHtml(c.text).replace(/\n/g, '<br>')}</p>`)
      }
    }
    return parts.join('\n') || '<p></p>'
  }

  const copyText = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      showToast('보드 내용을 복사했어요')
    } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인해 주세요.') }
  }

  const exportText = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `pinboard-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a); a.click()
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 0)
    } catch { setNote('내려받기에 실패했어요. 대신 복사를 사용하세요.') }
  }

  // ---------- 연계 ----------
  const addBoardToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!board.cards.length) { setNote('보드가 비어 있어요.'); return }
    const labelTitle = board.cards.find((c) => c.kind === 'label')?.text
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구상',
      title: (labelTitle && labelTitle.trim()) || '핀보드',
      bodyHtml: buildHtml(),
      meta: { 카드수: String(board.cards.length), 연결수: String(board.edges.length) },
    })
    if (id) showToast('프로젝트(자료 › 구상)에 추가했어요')
    else setNote('프로젝트에 추가하지 못했어요.')
  }

  const stashBoard = () => {
    if (!hasStash()) { setNote('수집함을 사용할 수 없어요.'); return }
    addToStash({ kind: 'note', label: '핀보드', text: buildText() })
    showToast('수집함에 담았어요')
  }

  const stashCard = (c: Card) => {
    if (!hasStash()) { setNote('수집함을 사용할 수 없어요.'); return }
    if (c.kind === 'image' && c.url) addToStash({ kind: 'image', label: c.title || '이미지', url: c.url, credit: c.credit })
    else if ((c.kind === 'link') && c.url) addToStash({ kind: 'url', label: c.title || fmtUrl(c.url), url: c.url })
    else addToStash({ kind: 'memo', label: c.title || (c.kind === 'label' ? '라벨' : '메모'), text: c.title ? `${c.title}\n${c.text || ''}` : (c.text || '') })
    showToast('수집함에 담았어요')
  }

  // 이미지 카드 → 라이브러리 저장
  const saveImageToLibrary = (c: Card) => {
    if (!c.url) return
    addToLibrary('images', { url: c.url, title: c.title, credit: c.credit, source: '핀보드' })
    showToast('라이브러리에 이미지로 저장했어요')
  }

  const clearBoard = () => {
    if (!window.confirm('보드의 모든 카드와 연결을 삭제할까요? 되돌릴 수 없어요.')) return
    setBoard({ cards: [], edges: [], panX: 0, panY: 0 })
    setSelected(null); setSelEdge(null); setLinkFrom(null); setEditing(null)
  }

  const resetView = () => setBoard((prev) => ({ ...prev, panX: 0, panY: 0 }))

  // ---------- 캔버스 크기(스크롤용) ----------
  const maxX = board.cards.reduce((m, c) => Math.max(m, c.x + c.w), 0)
  const maxY = board.cards.reduce((m, c) => Math.max(m, c.y + c.h), 0)
  const cw = Math.max(1400, maxX + 400)
  const ch = Math.max(1000, maxY + 400)

  const sel = cardById(selected)
  const related = TOOL_RELATIONS[TOOL_ID] || ['mind-map', 'moodboard-grid', 'imagination-gallery', 'outline-tree']
  const RELATED_LABEL: Record<string, string> = {
    'mind-map': '🧠 마인드맵', 'moodboard-grid': '🧩 무드보드', 'imagination-gallery': '🖼️ 상상 갤러리',
    'outline-tree': '🌲 개요 트리', 'setting-bible': '🗺️ 배경 설정집', 'cover-mockup': '📔 표지 목업',
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', outline: 'none', position: 'relative', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const scrollWrap: React.CSSProperties = {
    flex: 1, minWidth: 0, position: 'relative', overflow: 'auto',
    background: 'var(--paper)',
    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
    backgroundSize: '22px 22px',
    cursor: dragRef.current?.type === 'pan' ? 'grabbing' : (linkFrom ? 'crosshair' : 'default'),
  }
  const side: React.CSSProperties = { width: 220, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const sideInner: React.CSSProperties = { padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }
  const sideCard: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }
  const swatchRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const overlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 50 }
  const modal: React.CSSProperties = { width: '100%', maxWidth: 460, maxHeight: '100%', overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }
  const fInput: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', boxSizing: 'border-box' }

  // ---------- 카드 렌더 ----------
  const renderCardInner = (c: Card) => {
    const isEditing = editing === c.id
    if (c.kind === 'label') {
      const dark = isDark(c.color)
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', color: dark ? '#fff' : 'var(--text)' }}>
          {isEditing ? (
            <input
              autoFocus
              value={c.text || ''}
              onChange={(e) => patchCard(c.id, { text: e.target.value })}
              onBlur={stopEditing}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); stopEditing() } }}
              onPointerDown={(e) => e.stopPropagation()}
              maxLength={60}
              style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 14, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.25)', color: dark ? '#fff' : 'var(--text)', borderRadius: 6, padding: '3px 6px' }}
            />
          ) : (
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text || '라벨'}</span>
          )}
        </div>
      )
    }
    if (c.kind === 'image') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, background: '#0001', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '6px 6px 0 0' }}>
            {c.url ? (
              <img
                src={c.url}
                alt={c.title || '이미지'}
                draggable={false}
                onError={(e) => { (e.currentTarget.style.display = 'none'); const n = e.currentTarget.nextElementSibling as HTMLElement | null; if (n) n.style.display = 'flex' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
              />
            ) : null}
            <div style={{ display: c.url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--muted)', fontSize: 12, padding: 8, textAlign: 'center' }}>이미지를 불러올 수 없어요</div>
          </div>
          {(c.title || c.credit) && (
            <div style={{ flexShrink: 0, padding: '4px 7px', fontSize: 11, color: 'var(--muted)', background: 'var(--paper)', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${c.title || ''}${c.credit ? ' · ' + c.credit : ''}`}>
              {c.title}{c.credit ? <span style={{ opacity: 0.7 }}> · {c.credit}</span> : null}
            </div>
          )}
        </div>
      )
    }
    if (c.kind === 'link') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 9, justifyContent: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="🔗" /> {c.title || fmtUrl(c.url || '')}</div>
          {c.url && (
            <a href={c.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.url}>{fmtUrl(c.url)} ↗</a>
          )}
        </div>
      )
    }
    if (c.kind === 'file') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 9 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="📄" /> {c.title || '파일'}</div>
          {c.text && <div style={{ fontSize: 11.5, color: '#444', lineHeight: 1.5, overflow: 'hidden', flex: 1, minHeight: 0 }}>{c.text}</div>}
        </div>
      )
    }
    // memo
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <>
            <input
              autoFocus
              value={c.title || ''}
              onChange={(e) => patchCard(c.id, { title: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="제목"
              maxLength={80}
              style={{ flexShrink: 0, fontWeight: 700, fontSize: 13, border: 'none', borderBottom: '1px solid rgba(0,0,0,0.12)', outline: 'none', background: 'transparent', color: '#222', padding: '7px 9px 5px' }}
            />
            <textarea
              value={c.text || ''}
              onChange={(e) => patchCard(c.id, { text: e.target.value })}
              onBlur={stopEditing}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); stopEditing() } }}
              placeholder="내용을 입력하세요…"
              style={{ flex: 1, minHeight: 0, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: '#222', fontSize: 12.5, lineHeight: 1.5, padding: '6px 9px 9px', fontFamily: 'inherit' }}
            />
          </>
        ) : (
          <>
            <div style={{ flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#222', padding: '7px 9px 5px', borderBottom: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || '메모'}</div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', color: '#333', fontSize: 12.5, lineHeight: 1.5, padding: '6px 9px 9px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.text || <span style={{ color: '#999' }}>더블클릭하여 작성…</span>}</div>
          </>
        )}
      </div>
    )
  }

  // 카드 중심 좌표(연결선용)
  const cardCenter = (c: Card) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 })

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -3 } : wrap}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => { const id = addCard('memo'); setEditing(id) }} title="메모 카드 추가">＋ 메모</button>
        <button className="minibtn" onClick={() => { const id = addCard('label'); setEditing(id) }} title="색 라벨 추가"><Emoji e="🏷" /> 라벨</button>
        <button className="minibtn" onClick={() => openUrlPrompt('image')} title="URL 로 이미지 카드 추가"><Emoji e="🖼" /> 이미지</button>
        <button className="minibtn" onClick={() => setShowLibrary(true)} title="이미지 라이브러리에서 추가" disabled={!libImages.length}><Emoji e="🗂" /> 라이브러리{libImages.length ? ` (${libImages.length})` : ''}</button>
        <button className="minibtn" onClick={() => openUrlPrompt('link')} title="링크 카드 추가"><Emoji e="🔗" /> 링크</button>
        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button
          className="minibtn"
          onClick={() => { if (selected) setLinkFrom(linkFrom ? null : selected) }}
          disabled={!selected}
          style={linkFrom ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          title="선택 카드에서 연결 시작 → 다른 카드 클릭"
        >{linkFrom ? <><Emoji e="🔗" /> 연결할 카드 클릭…</> : <><Emoji e="🔗" /> 연결</>}</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyText} title="보드 내용을 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={exportText} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
        {hasStash() && <button className="linkbtn" onClick={stashBoard} title="보드 전체를 수집함에 담기"><Emoji e="🧺" /> 수집함</button>}
        <button className="linkbtn" onClick={addBoardToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '보드를 텍스트로 변환해 프로젝트에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {note && (
        <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>{note}</span>
          <button className="minibtn" onClick={() => setNote('')}>✕</button>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', zIndex: 40, padding: '7px 14px', borderRadius: 8, background: 'var(--ok)', color: '#fff', fontSize: 12.5, fontWeight: 600, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
          ✓ {toast}
        </div>
      )}

      <div style={body}>
        {/* 캔버스 */}
        <div ref={scrollRef} style={scrollWrap}>
          <div
            ref={canvasRef}
            data-canvas="1"
            onPointerDown={onCanvasPointerDown}
            onClick={onCanvasClick}
            onDoubleClick={onCanvasDoubleClick}
            style={{ position: 'relative', width: cw, height: ch }}
          >
            {/* translate 레이어(패닝) */}
            <div style={{ position: 'absolute', inset: 0, transform: `translate(${board.panX}px, ${board.panY}px)` }}>
              {/* 연결선 (SVG) */}
              <svg width={cw} height={ch} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}>
                {board.edges.map((e) => {
                  const a = cardById(e.from), b = cardById(e.to)
                  if (!a || !b) return null
                  const pa = cardCenter(a), pb = cardCenter(b)
                  const isSel = selEdge === e.id
                  return (
                    <g key={e.id}>
                      <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="transparent" strokeWidth={16} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onClick={(ev) => { ev.stopPropagation(); setSelEdge(e.id); setSelected(null) }} />
                      <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={isSel ? 'var(--accent)' : 'var(--muted)'} strokeWidth={isSel ? 3 : 2} strokeDasharray="6 5" strokeLinecap="round" pointerEvents="none" />
                      {isSel && (
                        <g transform={`translate(${(pa.x + pb.x) / 2 - 9}, ${(pa.y + pb.y) / 2 - 9})`} style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={(ev) => { ev.stopPropagation(); removeEdge(e.id) }}>
                          <circle cx={9} cy={9} r={10} fill="var(--warn)" />
                          <line x1={5} y1={9} x2={13} y2={9} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* 카드 */}
              {board.cards.map((c) => {
                const isSel = selected === c.id
                const isLinkStart = linkFrom === c.id
                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) => startCardDrag(e, c.id)}
                    onClick={(e) => onCardClick(e, c.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); if (c.kind === 'memo' || c.kind === 'label') setEditing(c.id) }}
                    style={{
                      position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, zIndex: c.z,
                      background: c.color,
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.12)',
                      boxShadow: isSel ? '0 0 0 2px var(--accent), 0 4px 14px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.14)',
                      outline: isLinkStart ? '2px dashed var(--accent)' : 'none',
                      outlineOffset: 2,
                      cursor: linkFrom ? 'crosshair' : (editing === c.id ? 'text' : 'grab'),
                      overflow: 'hidden',
                      userSelect: editing === c.id ? 'text' : 'none',
                      transition: 'box-shadow 0.1s',
                    }}
                  >
                    {renderCardInner(c)}

                    {/* 선택 시: 빠른 액션 + 리사이즈 핸들 */}
                    {isSel && !editing && (
                      <>
                        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 3, zIndex: 2 }} onPointerDown={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); removeCard(c.id) }} title="삭제" style={miniIcon('var(--warn)')}>✕</button>
                        </div>
                        <div
                          onPointerDown={(e) => startResize(e, c.id)}
                          title="드래그하여 크기 조절"
                          style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 2, background: 'linear-gradient(135deg, transparent 50%, var(--accent) 50%)', borderBottomRightRadius: 7 }}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 빈 보드 안내 */}
            {board.cards.length === 0 && (
              <div data-canvas="1" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, textAlign: 'center', gap: 10, pointerEvents: 'none' }}>
                <div style={{ fontSize: 44 }}><Emoji e="📌" /></div>
                <div style={{ lineHeight: 1.7 }}>빈 캔버스예요. 위 버튼으로 카드를 추가하거나<br />빈 곳을 <b>더블클릭</b>해 메모를 시작하세요.<br />좌측 바인더 파일을 끌어와 붙일 수도 있어요.</div>
              </div>
            )}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div style={side}>
          <div style={sideInner}>
            {/* 선택 항목 */}
            <div style={sideCard}>
              <div style={label}>선택한 카드</div>
              {sel ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {sel.kind === 'memo' ? '메모' : sel.kind === 'label' ? '라벨' : sel.kind === 'image' ? '이미지' : sel.kind === 'link' ? '링크' : '파일'} 카드
                  </div>
                  {/* 색 */}
                  <div style={swatchRow}>
                    {(sel.kind === 'label' ? LABEL_COLORS : CARD_COLORS).map((col) => (
                      <button key={col} onClick={() => setColor(sel.id, col)} title="색 변경"
                        style={{ width: 22, height: 22, borderRadius: 6, background: col, cursor: 'pointer', border: sel.color === col ? '2px solid var(--text)' : '1px solid var(--border)' }} />
                    ))}
                  </div>
                  {/* URL 편집(이미지/링크) */}
                  {(sel.kind === 'image' || sel.kind === 'link') && (
                    <input value={sel.url || ''} onChange={(e) => patchCard(sel.id, { url: e.target.value })} placeholder="URL" style={{ ...fInput, padding: '6px 8px', fontSize: 12 }} />
                  )}
                  {(sel.kind === 'image' || sel.kind === 'link' || sel.kind === 'file') && (
                    <input value={sel.title || ''} onChange={(e) => patchCard(sel.id, { title: e.target.value })} placeholder="제목" style={{ ...fInput, padding: '6px 8px', fontSize: 12 }} />
                  )}
                  {/* 액션 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(sel.kind === 'memo' || sel.kind === 'label') && <button className="minibtn" onClick={() => setEditing(sel.id)}><Emoji e="✏️" /> 편집</button>}
                    <button className="minibtn" onClick={() => duplicateCard(sel.id)}>⧉ 복제</button>
                    {hasStash() && <button className="minibtn" onClick={() => stashCard(sel)}><Emoji e="🧺" /> 수집</button>}
                    {sel.kind === 'image' && sel.url && <button className="minibtn" onClick={() => saveImageToLibrary(sel)}><Emoji e="💾" /> 라이브러리</button>}
                    <button className="minibtn" onClick={() => removeCard(sel.id)} style={{ color: 'var(--warn)' }}><Emoji e="🗑️" /> 삭제</button>
                  </div>
                </>
              ) : selEdge ? (
                <>
                  <div style={{ fontSize: 13 }}>연결선 선택됨</div>
                  <button className="minibtn" onClick={() => removeEdge(selEdge)} style={{ color: 'var(--warn)', alignSelf: 'flex-start' }}><Emoji e="🗑️" /> 연결 삭제</button>
                </>
              ) : (
                <div style={hint}>카드를 클릭해 선택하세요. 빈 곳을 <b>드래그</b>하면 보드를 이동(패닝)할 수 있어요.</div>
              )}
            </div>

            {/* 사용법 */}
            <div style={{ ...sideCard, gap: 6 }}>
              <div style={label}>사용법</div>
              <div style={hint}>
                • <b>＋ 메모/라벨/이미지/링크</b>로 카드 추가<br />
                • 카드를 <b>드래그</b>해 자유 배치, 모서리로 <b>크기 조절</b><br />
                • 메모·라벨은 <b>더블클릭</b>으로 편집<br />
                • <b><Emoji e="🔗" /> 연결</b> 후 다른 카드 클릭 → 연결선<br />
                • 빈 곳 드래그 = 보드 이동(패닝)<br />
                • 좌측 <b>바인더 파일</b>을 끌어와 카드로<br />
                • 선택 후 <b>Delete</b> 삭제 · <b>Ctrl+D</b> 복제 · <b>Enter</b> 편집<br />
                • 모든 변경은 자동 저장됩니다.
              </div>
              <div style={{ ...hint, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>카드 {board.cards.length} · 연결 {board.edges.length}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={resetView} title="보드 위치를 처음으로">⌖ 보기 초기화</button>
              </div>
              <button className="minibtn" onClick={clearBoard} style={{ color: 'var(--warn)', alignSelf: 'flex-start' }} disabled={!board.cards.length}><Emoji e="🗑️" /> 보드 비우기</button>
            </div>

            {/* 연계 도구 */}
            {related.length > 0 && (
              <div style={{ ...sideCard, gap: 6 }}>
                <div style={label}>연계 도구</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {related.map((rid) => (
                    <button key={rid} className="linkbtn" style={{ justifyContent: 'flex-start' }} onClick={() => openToolLinked(rid)} title="관련 도구 열기">
                      {emojify(RELATED_LABEL[rid] || rid)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 보드 하단 저작권·초상권 고지 */}
      <div className="license-note" style={{ flexShrink: 0, padding: '6px 12px', fontSize: 11, lineHeight: 1.5, color: 'var(--muted)', background: 'var(--chrome-2)', borderTop: '1px solid var(--border)' }}>
        <span className="license-badge" style={{ fontWeight: 700, marginRight: 6 }}><Emoji e="⚠" /> 이미지 저작권·초상권</span>
        {IMG_LICENSE_WARNING}
      </div>

      {/* URL 입력 모달 */}
      {urlPrompt && (
        <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setUrlPrompt(null) }}>
          <div style={modal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{urlPrompt.kind === 'image' ? <><Emoji e="🖼" /> 이미지 카드 추가</> : <><Emoji e="🔗" /> 링크 카드 추가</>}</strong>
              {urlPrompt.kind === 'image' && <span className="license-badge" style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--warn)', color: 'var(--warn)' }}><Emoji e="⚠" /> 저작권·초상권 확인</span>}
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setUrlPrompt(null)}>✕</button>
            </div>
            {urlPrompt.kind === 'image' && (
              <div className="license-note" style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px' }}>
                {IMG_LICENSE_WARNING}
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{urlPrompt.kind === 'image' ? '이미지 URL (https://…)' : '링크 URL (https://…)'}</label>
              <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmUrlPrompt() }} placeholder="https://…" style={fInput} inputMode="url" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>제목 (선택)</label>
              <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmUrlPrompt() }} placeholder="표시할 제목" style={fInput} maxLength={80} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="minibtn" style={{ flex: 1 }} onClick={() => setUrlPrompt(null)}>취소</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={confirmUrlPrompt} disabled={!urlInput.trim()}>추가</button>
            </div>
          </div>
        </div>
      )}

      {/* 라이브러리 이미지 선택 모달 */}
      {showLibrary && (
        <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowLibrary(false) }}>
          <div style={{ ...modal, maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 15 }}><Emoji e="🗂" /> 라이브러리 이미지</strong>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setShowLibrary(false)}>✕</button>
            </div>
            {libImages.length === 0 ? (
              <div style={{ ...hint, textAlign: 'center', padding: 24 }}>저장된 이미지가 없어요. 무드보드·갤러리에서 이미지를 라이브러리에 저장해 보세요.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                {libImages.map((img) => (
                  <button key={img.id} onClick={() => addLibImage(img)} title={img.title || '이미지 추가'}
                    style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--chrome-2)', padding: 0, cursor: 'pointer' }}>
                    <img src={img.url} alt={img.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {img.title && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.title}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 카드 우상단 작은 아이콘 버튼
function miniIcon(color: string): React.CSSProperties {
  return {
    width: 20, height: 20, borderRadius: 5, border: 'none', background: 'rgba(255,255,255,0.85)', color,
    fontSize: 12, fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  }
}
