// 참고 이미지 보드(PureRef식) — 무한 캔버스에 참고/무드 이미지를 자유롭게 배치·크기조절·회전하고
// 메모를 곁들여 작품의 분위기 레퍼런스를 한 화면에 모은다.
//  · 이미지 소스: 공유 이미지 라이브러리 / URL 붙여넣기 / 파일·이미지 드롭(데이터URL로 로컬 보존) / 갤러리에서 고르기
//  · 캔버스: 휠 줌, 빈 곳 드래그로 패닝, 타일 드래그로 이동, 모서리 핸들로 크기/비율 조절, 회전 손잡이
//  · 영속: localStorage 'sry:tool:reference-board' (보드 여러 개 + 각 타일의 URL/위치/크기/회전/메타)
//  · 저작권 안전: 공개 자료(CC0/PD/Unsplash 등)만 권장. 각 타일에 출처·라이선스를 적어 그대로 보존한다.
//  · Web API: 휠/포인터 이벤트, FileReader, clipboard, canvas(보드 PNG 내보내기). 미지원 시 graceful.
//  · 언마운트 시 window 리스너/타이머/object URL 정리. 경쟁상태 가드.
// react 와 './linkbus' 만 import 한다(다른 모듈 금지).
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToLibrary,
  useLibraryList,
  requestImagePick,
  hasPendingPick,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  TOOL_RELATIONS,
  Emoji,
  emojify,
  type SharedImage,
} from './linkbus'

export const meta = {
  id: 'reference-board',
  name: '참고 이미지 보드',
  icon: '📌',
  group: '분위기·시각',
  intro: '레퍼런스·무드 이미지를 무한 캔버스에 자유롭게 배치하세요',
  w: 760,
  h: 620,
}

// ── HTML escape(&,<,>) — bodyHtml/메타 안전화 ──
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const STORE_KEY = 'sry:tool:reference-board'

// ── 데이터 모델 ──
type ItemKind = 'image' | 'note'
interface BoardItem {
  id: string
  kind: ItemKind
  // 위치/크기(보드 좌표계, 화면이 아닌 콘텐츠 기준)
  x: number
  y: number
  w: number
  h: number
  rot: number // 도(deg)
  z: number
  // image
  url?: string
  title?: string
  credit?: string
  license?: string
  source?: string
  // note
  text?: string
  color?: string
}
interface Board {
  id: string
  name: string
  items: BoardItem[]
  // 뷰포트(패닝/줌) 상태도 저장해 다시 열 때 위치 유지
  panX: number
  panY: number
  scale: number
  updated: number
}
interface Store {
  boards: Board[]
  activeId: string
}

const NOTE_COLORS = ['#FFE7A3', '#C7E9C0', '#BBD7F5', '#F5C6D6', '#E0D4F7', '#F2F2F2']

function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function emptyBoard(name: string): Board {
  return { id: uid('bd'), name, items: [], panX: 0, panY: 0, scale: 1, updated: Date.now() }
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>
      if (p && Array.isArray(p.boards) && p.boards.length) {
        const boards = p.boards.map((b) => ({
          id: b.id || uid('bd'),
          name: b.name || '무제 보드',
          items: Array.isArray(b.items) ? (b.items as BoardItem[]) : [],
          panX: typeof b.panX === 'number' ? b.panX : 0,
          panY: typeof b.panY === 'number' ? b.panY : 0,
          scale: typeof b.scale === 'number' && b.scale > 0 ? b.scale : 1,
          updated: b.updated || Date.now(),
        }))
        const activeId = boards.some((b) => b.id === p.activeId) ? (p.activeId as string) : boards[0].id
        return { boards, activeId }
      }
    }
  } catch { /* 손상/용량초과 무시 */ }
  const b = emptyBoard('나의 레퍼런스')
  return { boards: [b], activeId: b.id }
}

function saveStore(s: Store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* 용량초과(데이터URL 다수) 등 무시 */ }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// 드래그 상호작용 상태(ref로만 관리 — 매 포인터무브 setState 방지)
type DragMode = null | 'pan' | 'move' | 'resize' | 'rotate'
interface DragState {
  mode: DragMode
  itemId?: string
  // 시작 시점 스냅샷
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startW: number
  startH: number
  startRot: number
  startPanX: number
  startPanY: number
  ratio: number // w/h 비율(이미지 비율 유지용)
  cx: number // 회전 중심(보드 좌표)
  cy: number
  startAngle: number
  moved: boolean
}

interface Props { payload?: Record<string, unknown> }

export default function ReferenceBoard({ payload }: Props = {}) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showLib, setShowLib] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [toast, setToast] = useState('')
  const [dragHover, setDragHover] = useState(false)
  const [exporting, setExporting] = useState(false)

  const libImages = useLibraryList('images')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)
  const objectUrls = useRef<string[]>([])
  const payloadHandled = useRef(false)
  // 포인터무브/업 동안 즉시 반영할 임시 변형(렌더는 transformDraft로) — 끝에 한 번 커밋
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  const active = store.boards.find((b) => b.id === store.activeId) || store.boards[0]

  // ── 영속 저장(디바운스 없이 변경 시마다 — 보드 크기가 큼; 가드만 둠) ──
  useEffect(() => {
    saveStore(store)
  }, [store])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      objectUrls.current.forEach((u) => { try { URL.revokeObjectURL(u) } catch { /* noop */ } })
      objectUrls.current = []
    }
  }, [])

  const flash = useCallback((msg: string) => {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
  }, [])

  // ── 보드 수정 헬퍼 ──
  const mutateActive = useCallback((fn: (b: Board) => Board) => {
    setStore((s) => {
      const boards = s.boards.map((b) => (b.id === s.activeId ? { ...fn(b), updated: Date.now() } : b))
      return { ...s, boards }
    })
  }, [])

  const patchItem = useCallback((id: string, patch: Partial<BoardItem>) => {
    mutateActive((b) => ({ ...b, items: b.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }))
  }, [mutateActive])

  const topZ = useCallback((b: Board) => b.items.reduce((m, it) => Math.max(m, it.z), 0), [])

  // 새 타일을 현재 뷰포트 중앙 부근(보드 좌표)에 추가
  const addItem = useCallback((partial: Partial<BoardItem>) => {
    const stage = stageRef.current
    const rect = stage?.getBoundingClientRect()
    const vw = rect?.width || 600
    const vh = rect?.height || 400
    setStore((s) => {
      const b = s.boards.find((x) => x.id === s.activeId)
      if (!b) return s
      const scale = b.scale
      // 화면 중앙(보드 좌표): (screenCenter - pan) / scale, 약간 무작위 오프셋
      const jitter = (Math.random() - 0.5) * 60
      const cxScreen = vw / 2 + jitter
      const cyScreen = vh / 2 + jitter
      const bx = (cxScreen - b.panX) / scale
      const by = (cyScreen - b.panY) / scale
      const w = partial.w || 220
      const h = partial.h || 160
      const item: BoardItem = {
        id: uid('it'),
        kind: partial.kind || 'image',
        x: bx - w / 2,
        y: by - h / 2,
        w, h, rot: 0,
        z: topZ(b) + 1,
        ...partial,
      }
      const boards = s.boards.map((x) => (x.id === s.activeId ? { ...x, items: [...x.items, item], updated: Date.now() } : x))
      return { ...s, boards }
    })
  }, [topZ])

  // 이미지 URL을 추가하면 자연 비율을 알아내 타일 크기를 맞춘다
  const addImageUrl = useCallback((info: { url: string; title?: string; credit?: string; license?: string; source?: string }) => {
    const { url } = info
    if (!url) return
    // 우선 기본 크기로 추가 → onLoad 시 비율 보정
    const id = uid('it')
    const stage = stageRef.current
    const rect = stage?.getBoundingClientRect()
    const vw = rect?.width || 600
    const vh = rect?.height || 400
    setStore((s) => {
      const b = s.boards.find((x) => x.id === s.activeId)
      if (!b) return s
      const scale = b.scale
      const jitter = (Math.random() - 0.5) * 60
      const bx = (vw / 2 + jitter - b.panX) / scale
      const by = (vh / 2 + jitter - b.panY) / scale
      const w = 240, h = 180
      const item: BoardItem = {
        id, kind: 'image', x: bx - w / 2, y: by - h / 2, w, h, rot: 0, z: topZ(b) + 1,
        url, title: info.title, credit: info.credit, license: info.license, source: info.source,
      }
      const boards = s.boards.map((x) => (x.id === s.activeId ? { ...x, items: [...x.items, item], updated: Date.now() } : x))
      return { ...s, boards }
    })
    setSelectedId(id)
    // 자연 비율 측정(비동기) — 로드되면 가로 240 기준 높이 보정
    try {
      const probe = new Image()
      probe.onload = () => {
        if (!mounted.current) return
        const nr = probe.naturalWidth / probe.naturalHeight
        if (nr && isFinite(nr)) {
          const w = 240
          patchItem(id, { w, h: Math.round(w / nr) })
        }
      }
      probe.src = url
    } catch { /* 측정 실패 시 기본 비율 유지 */ }
  }, [topZ, patchItem])

  // ── 파일/드롭 → 데이터URL ──
  const ingestFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!arr.length) { flash('이미지 파일이 없습니다'); return }
    arr.slice(0, 12).forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (!mounted.current) return
        const data = String(reader.result || '')
        if (data) addImageUrl({ url: data, title: f.name.replace(/\.[a-z0-9]+$/i, ''), source: '로컬 파일', license: '로컬' })
      }
      reader.onerror = () => { if (mounted.current) flash('파일을 읽지 못했습니다') }
      try { reader.readAsDataURL(f) } catch { flash('파일을 읽지 못했습니다') }
    })
  }, [addImageUrl, flash])

  // ── payload로 들어온 이미지(다른 도구에서 보내기) 수용 ──
  useEffect(() => {
    if (payloadHandled.current || !payload) return
    payloadHandled.current = true
    const img = (payload.image as Record<string, unknown> | string | undefined)
    if (typeof img === 'string' && img) {
      addImageUrl({ url: img, title: String(payload.title || payload.name || '') || undefined, credit: String(payload.imageCredit || payload.credit || '') || undefined, license: String(payload.license || '') || undefined, source: String(payload.source || '') || undefined })
    } else if (img && typeof img === 'object') {
      const o = img as Record<string, unknown>
      if (o.url) addImageUrl({ url: String(o.url), title: o.title ? String(o.title) : undefined, credit: o.credit ? String(o.credit) : undefined, license: o.license ? String(o.license) : undefined, source: o.source ? String(o.source) : undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ── 휠 줌(포인터 위치 기준) ──
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = stage.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      setStore((s) => {
        const b = s.boards.find((x) => x.id === s.activeId)
        if (!b) return s
        const old = b.scale
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
        const next = clamp(old * factor, 0.15, 5)
        // 포인터 아래 보드 좌표가 고정되도록 pan 보정
        const bx = (px - b.panX) / old
        const by = (py - b.panY) / old
        const panX = px - bx * next
        const panY = py - by * next
        const boards = s.boards.map((x) => (x.id === s.activeId ? { ...x, scale: next, panX, panY } : x))
        return { ...s, boards }
      })
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [store.activeId])

  // ── 포인터 드래그(전역 리스너 — 캔버스 밖으로 나가도 추적) ──
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startClientX
      const dy = e.clientY - d.startClientY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true
      const b = active
      if (!b) return
      const scale = b.scale
      if (d.mode === 'pan') {
        mutateActive((bb) => ({ ...bb, panX: d.startPanX + dx, panY: d.startPanY + dy }))
        return
      }
      if (!d.itemId) return
      if (d.mode === 'move') {
        patchItem(d.itemId, { x: d.startX + dx / scale, y: d.startY + dy / scale })
      } else if (d.mode === 'resize') {
        // 모서리(우하단) 핸들: 보드 좌표 델타, shift 시 비율 무시(자유), 기본은 비율 유지
        const ddx = dx / scale
        const ddy = dy / scale
        let nw = Math.max(40, d.startW + ddx)
        let nh: number
        if (e.shiftKey) {
          nh = Math.max(30, d.startH + ddy)
        } else {
          nh = Math.max(30, nw / d.ratio)
        }
        nw = Math.round(nw); nh = Math.round(nh)
        patchItem(d.itemId, { w: nw, h: nh })
      } else if (d.mode === 'rotate') {
        // 회전: 화면상 중심 대비 각도
        const stage = stageRef.current
        const rect = stage?.getBoundingClientRect()
        if (!rect) return
        const centerScreenX = rect.left + b.panX + d.cx * scale
        const centerScreenY = rect.top + b.panY + d.cy * scale
        const ang = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX) * 180 / Math.PI
        let rot = d.startRot + (ang - d.startAngle)
        if (e.shiftKey) rot = Math.round(rot / 15) * 15 // 15도 스냅
        patchItem(d.itemId, { rot: Math.round(rot) })
      }
      rerender()
    }
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        rerender()
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [active, mutateActive, patchItem, rerender])

  // ── 키보드: Delete=삭제, [/]=뒤로/앞으로, 화살표=미세 이동, Esc=선택해제 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (!selectedId) { if (e.key === 'Escape') setSelectedId(null); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); deleteItem(selectedId)
      } else if (e.key === 'Escape') {
        setSelectedId(null)
      } else if (e.key === ']') {
        bringToFront(selectedId)
      } else if (e.key === '[') {
        sendToBack(selectedId)
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 20 : 2
        const it = active?.items.find((x) => x.id === selectedId)
        if (!it) return
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        patchItem(selectedId, { x: it.x + dx, y: it.y + dy })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, active])

  // ── 항목 조작 ──
  const deleteItem = (id: string) => {
    mutateActive((b) => ({ ...b, items: b.items.filter((it) => it.id !== id) }))
    if (selectedId === id) setSelectedId(null)
  }
  const bringToFront = (id: string) => {
    mutateActive((b) => ({ ...b, items: b.items.map((it) => (it.id === id ? { ...it, z: topZ(b) + 1 } : it)) }))
  }
  const sendToBack = (id: string) => {
    mutateActive((b) => {
      const minZ = b.items.reduce((m, it) => Math.min(m, it.z), 0)
      return { ...b, items: b.items.map((it) => (it.id === id ? { ...it, z: minZ - 1 } : it)) }
    })
  }
  const duplicateItem = (id: string) => {
    const it = active?.items.find((x) => x.id === id)
    if (!it) return
    const copy: BoardItem = { ...it, id: uid('it'), x: it.x + 24, y: it.y + 24, z: topZ(active!) + 1 }
    mutateActive((b) => ({ ...b, items: [...b.items, copy] }))
    setSelectedId(copy.id)
  }

  // ── 타일 포인터다운 → 드래그 시작 ──
  const startItemDrag = (e: React.PointerEvent, it: BoardItem, mode: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation()
    if (e.button !== 0) return
    setSelectedId(it.id)
    if (mode === 'move') bringToFront(it.id)
    dragRef.current = {
      mode, itemId: it.id,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: it.x, startY: it.y, startW: it.w, startH: it.h, startRot: it.rot,
      startPanX: active?.panX || 0, startPanY: active?.panY || 0,
      ratio: it.w / Math.max(1, it.h),
      cx: it.x + it.w / 2, cy: it.y + it.h / 2,
      startAngle: 0, moved: false,
    }
    if (mode === 'rotate') {
      // 회전 시작 각도 계산
      const b = active!
      const stage = stageRef.current
      const rect = stage?.getBoundingClientRect()
      if (rect) {
        const centerScreenX = rect.left + b.panX + (it.x + it.w / 2) * b.scale
        const centerScreenY = rect.top + b.panY + (it.y + it.h / 2) * b.scale
        dragRef.current.startAngle = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX) * 180 / Math.PI
      }
    }
  }

  // ── 빈 캔버스 포인터다운 → 패닝 시작(+선택 해제) ──
  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setSelectedId(null)
    dragRef.current = {
      mode: 'pan', startClientX: e.clientX, startClientY: e.clientY,
      startX: 0, startY: 0, startW: 0, startH: 0, startRot: 0,
      startPanX: active?.panX || 0, startPanY: active?.panY || 0,
      ratio: 1, cx: 0, cy: 0, startAngle: 0, moved: false,
    }
  }

  // ── 뷰 컨트롤 ──
  const setScale = (next: number) => {
    const stage = stageRef.current
    const rect = stage?.getBoundingClientRect()
    const vw = rect?.width || 600
    const vh = rect?.height || 400
    mutateActive((b) => {
      const old = b.scale
      const n = clamp(next, 0.15, 5)
      const bx = (vw / 2 - b.panX) / old
      const by = (vh / 2 - b.panY) / old
      return { ...b, scale: n, panX: vw / 2 - bx * n, panY: vh / 2 - by * n }
    })
  }
  const zoomIn = () => setScale((active?.scale || 1) * 1.2)
  const zoomOut = () => setScale((active?.scale || 1) / 1.2)

  // 전체 보기: 모든 항목이 화면에 들어오도록 pan/scale 자동 맞춤
  const fitAll = () => {
    const b = active
    if (!b || !b.items.length) { mutateActive((bb) => ({ ...bb, panX: 0, panY: 0, scale: 1 })); return }
    const stage = stageRef.current
    const rect = stage?.getBoundingClientRect()
    const vw = (rect?.width || 600) - 40
    const vh = (rect?.height || 400) - 40
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    b.items.forEach((it) => {
      // 회전 무시한 바운딩 박스(근사)
      minX = Math.min(minX, it.x); minY = Math.min(minY, it.y)
      maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + it.h)
    })
    const bw = Math.max(1, maxX - minX)
    const bh = Math.max(1, maxY - minY)
    const scale = clamp(Math.min(vw / bw, vh / bh), 0.15, 2)
    const panX = 20 + (vw - bw * scale) / 2 - minX * scale
    const panY = 20 + (vh - bh * scale) / 2 - minY * scale
    mutateActive((bb) => ({ ...bb, scale, panX, panY }))
  }

  // ── 보드(탭) 관리 ──
  const newBoard = () => {
    const b = emptyBoard('보드 ' + (store.boards.length + 1))
    setStore((s) => ({ boards: [...s.boards, b], activeId: b.id }))
    setSelectedId(null)
  }
  const switchBoard = (id: string) => { setStore((s) => ({ ...s, activeId: id })); setSelectedId(null) }
  const deleteBoard = (id: string) => {
    setStore((s) => {
      if (s.boards.length <= 1) { flash('마지막 보드는 삭제할 수 없습니다'); return s }
      const boards = s.boards.filter((b) => b.id !== id)
      const activeId = s.activeId === id ? boards[0].id : s.activeId
      return { boards, activeId }
    })
  }
  const commitRename = () => {
    const v = renameVal.trim()
    if (v) mutateActive((b) => ({ ...b, name: v }))
    setRenaming(false)
  }

  // ── 갤러리에서 이미지 고르기 ──
  const pickFromGallery = () => {
    requestImagePick({
      requesterId: meta.id,
      onPick: (img: SharedImage) => {
        if (!mounted.current) return
        addImageUrl({ url: img.url, title: img.title, credit: img.credit, license: img.license, source: img.source })
        flash('갤러리 이미지를 보드에 추가했어요')
      },
    })
  }

  // ── URL로 추가 ──
  const addFromUrl = () => {
    const u = urlInput.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u) && !u.startsWith('data:')) { flash('http(s):// 로 시작하는 이미지 주소를 넣어 주세요'); return }
    addImageUrl({ url: u, title: '외부 이미지', source: 'URL', license: '직접 추가' })
    setUrlInput('')
    flash('URL 이미지를 추가했어요')
  }

  // ── 라이브러리에서 추가 ──
  const addFromLib = (img: SharedImage) => {
    addImageUrl({ url: img.url, title: img.title, credit: img.credit, license: img.license, source: img.source })
    flash('라이브러리 이미지를 추가했어요')
  }

  // ── 메모 타일 ──
  const addNote = () => {
    addItem({ kind: 'note', w: 200, h: 140, text: '', color: NOTE_COLORS[0] })
    flash('메모를 추가했어요 — 더블클릭해서 입력하세요')
  }

  // ── 선택 타일을 라이브러리/수집함에 저장, 클립보드 복사 ──
  const selected = active?.items.find((it) => it.id === selectedId) || null
  const saveSelectedToLibrary = () => {
    if (!selected || selected.kind !== 'image' || !selected.url) return
    if (selected.url.startsWith('data:')) { flash('로컬 파일 이미지는 라이브러리에 담기 어려워요(URL 이미지만)'); return }
    addToLibrary('images', { url: selected.url, title: selected.title, credit: selected.credit, license: selected.license, source: selected.source })
    flash('이미지 라이브러리에 저장했어요')
  }
  const stashSelected = () => {
    if (!selected) return
    if (selected.kind === 'note') addToStash({ kind: 'memo', label: '보드 메모', text: selected.text || '' })
    else if (selected.url && !selected.url.startsWith('data:')) addToStash({ kind: 'image', label: selected.title || '참고 이미지', url: selected.url, credit: selected.credit })
    else { flash('로컬 파일 이미지는 수집함에 담기 어려워요'); return }
    flash('수집함에 담았어요')
  }

  // ── 보드 → 프로젝트 메모(이미지 출처 목록 + 메모) ──
  const [addedProject, setAddedProject] = useState(false)
  const saveBoardToProject = () => {
    if (!active || !hasProjectBridge()) return
    const imgs = active.items.filter((it) => it.kind === 'image' && it.url && !it.url!.startsWith('data:'))
    const notes = active.items.filter((it) => it.kind === 'note' && (it.text || '').trim())
    const imgList = imgs.map((it) =>
      `<li><b>${esc(it.title || '이미지')}</b>${it.credit ? ' — ' + esc(it.credit) : ''}${it.license ? ' (' + esc(it.license) + ')' : ''}<br>` +
      `<a href="${esc(it.url!)}" target="_blank" rel="noreferrer">${esc(it.url!)}</a></li>`
    ).join('')
    const noteList = notes.map((it) => `<li>${esc(it.text || '')}</li>`).join('')
    const bodyHtml =
      `<p><b>참고 보드:</b> ${esc(active.name)}</p>` +
      (imgs.length ? `<p>이미지 ${imgs.length}장(공개 자료 출처):</p><ul>${imgList}</ul>` : '') +
      (notes.length ? `<p>메모:</p><ul>${noteList}</ul>` : '') +
      (active.items.some((it) => it.kind === 'image' && it.url?.startsWith('data:'))
        ? `<p class="muted">※ 로컬 파일 이미지는 출처 목록에서 제외됩니다.</p>` : '')
    const id = addToProject({
      root: 'research',
      folder: '참고 보드',
      title: '참고 보드 · ' + active.name,
      bodyHtml,
      meta: { 보드명: active.name, 이미지수: String(imgs.length), 메모수: String(notes.length) },
    })
    if (id && mounted.current) {
      setAddedProject(true)
      setTimeout(() => { if (mounted.current) setAddedProject(false) }, 1600)
    }
  }

  // ── 보드 전체를 PNG로 내보내기(canvas 합성) ──
  const exportPng = async () => {
    const b = active
    if (!b || !b.items.length) { flash('내보낼 항목이 없습니다'); return }
    setExporting(true)
    try {
      // 바운딩 박스 계산(회전 무시 근사)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      b.items.forEach((it) => {
        minX = Math.min(minX, it.x); minY = Math.min(minY, it.y)
        maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + it.h)
      })
      const pad = 40
      const W = Math.ceil(maxX - minX) + pad * 2
      const H = Math.ceil(maxY - minY) + pad * 2
      const canvas = document.createElement('canvas')
      canvas.width = Math.min(W, 4000); canvas.height = Math.min(H, 4000)
      const ctx = canvas.getContext('2d')
      if (!ctx) { flash('이 브라우저에서는 내보내기를 지원하지 않습니다'); setExporting(false); return }
      ctx.fillStyle = '#2a2a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const sorted = [...b.items].sort((a, c) => a.z - c.z)
      let tainted = false
      for (const it of sorted) {
        const cx = it.x - minX + pad + it.w / 2
        const cy = it.y - minY + pad + it.h / 2
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(it.rot * Math.PI / 180)
        if (it.kind === 'note') {
          ctx.fillStyle = it.color || NOTE_COLORS[0]
          ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h)
          ctx.fillStyle = '#222'
          ctx.font = '14px sans-serif'
          const words = (it.text || '').split(/\s+/)
          let line = '', y = -it.h / 2 + 22
          for (const w of words) {
            const test = line ? line + ' ' + w : w
            if (ctx.measureText(test).width > it.w - 20 && line) {
              ctx.fillText(line, -it.w / 2 + 10, y); line = w; y += 18
              if (y > it.h / 2 - 6) break
            } else line = test
          }
          if (line && y <= it.h / 2 - 6) ctx.fillText(line, -it.w / 2 + 10, y)
        } else if (it.url) {
          try {
            const img = await loadImageEl(it.url)
            ctx.drawImage(img, -it.w / 2, -it.h / 2, it.w, it.h)
          } catch {
            // 로드 실패 — 플레이스홀더
            ctx.fillStyle = '#555'; ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h)
          }
          if (!it.url.startsWith('data:')) tainted = true // crossOrigin 미허용 호스트면 toDataURL이 막힐 수 있음
        }
        ctx.restore()
      }
      let dataUrl = ''
      try {
        dataUrl = canvas.toDataURL('image/png')
      } catch {
        flash(tainted ? '일부 이미지 서버가 내보내기를 막아(CORS) PNG 생성에 실패했어요' : 'PNG 생성에 실패했어요')
        setExporting(false); return
      }
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = (active.name || 'reference-board').replace(/[^\w가-힣 -]/g, '') + '.png'
      a.click()
      flash('보드를 PNG로 내보냈어요')
    } catch {
      flash('내보내기에 실패했어요')
    } finally {
      if (mounted.current) setExporting(false)
    }
  }

  // crossOrigin 로 이미지를 로드(가능하면 toDataURL 허용). 실패해도 폴백.
  function loadImageEl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      if (!url.startsWith('data:')) img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('img load'))
      img.src = url
    })
  }

  // ── 드롭 핸들러 ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragHover(false)
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length) { ingestFiles(dt.files); return }
    // 외부 브라우저에서 끌어온 이미지(URL)
    const url = dt.getData('text/uri-list') || dt.getData('text/plain')
    if (url && (/^https?:\/\//i.test(url) || url.startsWith('data:'))) {
      addImageUrl({ url: url.split('\n')[0].trim(), title: '드롭한 이미지', source: 'URL', license: '직접 추가' })
      flash('이미지를 추가했어요')
    }
  }

  // ── 붙여넣기(클립보드 이미지) ──
  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of Array.from(items)) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) { ingestFiles([f]); e.preventDefault(); return }
      }
    }
    const text = e.clipboardData?.getData('text') || ''
    if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?\S*)?$/i.test(text.trim())) {
      addImageUrl({ url: text.trim(), title: '붙여넣은 이미지', source: 'URL', license: '직접 추가' })
      e.preventDefault()
    }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text)', boxSizing: 'border-box' }
  const related = TOOL_RELATIONS[meta.id] || []
  const RELATED_LABEL: Record<string, string> = {
    'setting-bible': '🗺️ 배경 설정집',
    'cover-mockup': '📔 표지 목업',
    'imagination-gallery': '🖼️ 상상 갤러리',
    'moodboard-grid': '🧩 무드보드',
    'met-museum-art': '🖼️ 메트 명작',
  }
  const showPickHint = hasPendingPick()

  return (
    <div
      style={wrap}
      onPaste={onPaste}
      tabIndex={0}
    >
      {/* 상단: 보드 탭 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, overflowX: 'auto', paddingBottom: 2 }}>
        {store.boards.map((b) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {renaming && b.id === active?.id ? (
              <input
                autoFocus
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
                style={{ width: 110, padding: '4px 8px', borderRadius: 7, fontSize: 12, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--accent)', outline: 'none' }}
              />
            ) : (
              <button
                className={'minibtn' + (b.id === store.activeId ? ' active' : '')}
                onClick={() => switchBoard(b.id)}
                onDoubleClick={() => { if (b.id === store.activeId) { setRenameVal(b.name); setRenaming(true) } }}
                title="클릭: 전환 · 더블클릭: 이름 변경"
                style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <Emoji e="📋" /> {b.name}
              </button>
            )}
            {b.id === store.activeId && store.boards.length > 1 && (
              <button className="minibtn danger" onClick={() => deleteBoard(b.id)} title="이 보드 삭제" style={{ marginLeft: 2, padding: '2px 6px' }}>✕</button>
            )}
          </div>
        ))}
        <button className="minibtn" onClick={newBoard} title="새 보드" style={{ flexShrink: 0 }}>＋ 보드</button>
      </div>

      {/* 툴바: 이미지 추가 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="minibtn" onClick={() => setShowLib((v) => !v)} title="공유 이미지 라이브러리에서 추가"><Emoji e="🖼" /> 라이브러리</button>
        <button className="minibtn" onClick={pickFromGallery} title="상상 갤러리에서 이미지 고르기"><Emoji e="🎨" /> 갤러리에서</button>
        <button className="minibtn" onClick={addNote} title="메모 카드 추가"><Emoji e="📝" /> 메모</button>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, minWidth: 180 }}>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addFromUrl() }}
            placeholder="이미지 URL 붙여넣기…"
            style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 7, fontSize: 12, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
          />
          <button className="minibtn" onClick={addFromUrl} disabled={!urlInput.trim()}>추가</button>
        </div>
      </div>

      {/* 라이브러리 드로어 */}
      {showLib && (
        <div style={{ flexShrink: 0, maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--panel)' }}>
          {libImages.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8, textAlign: 'center' }}>
              저장된 이미지가 없습니다. 무드보드·갤러리·메트 명작 등에서 이미지를 라이브러리에 저장해 보세요.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 5 }}>
              {libImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => addFromLib(img)}
                  title={(img.title || '') + ' — ' + (img.credit || '') + ' ' + (img.license || '')}
                  style={{ padding: 0, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1/1', background: 'var(--chrome-2)' }}
                >
                  <img src={img.url} alt={img.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget.style.opacity = '0.3') }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 캔버스 무대 */}
      <div
        ref={stageRef}
        onPointerDown={startPan}
        onDragOver={(e) => { e.preventDefault(); if (!dragHover) setDragHover(true) }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragHover(false) }}
        onDrop={onDrop}
        style={{
          position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden',
          border: dragHover ? '2px dashed var(--accent)' : '1px solid var(--border)',
          borderRadius: 10, background: 'var(--chrome-2)',
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--border) 60%, transparent) 1px, transparent 1px)',
          backgroundSize: `${24 * (active?.scale || 1)}px ${24 * (active?.scale || 1)}px`,
          backgroundPosition: `${active?.panX || 0}px ${active?.panY || 0}px`,
          cursor: dragRef.current?.mode === 'pan' ? 'grabbing' : 'grab',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        {/* 콘텐츠 변환 레이어 */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
            transform: `translate(${active?.panX || 0}px, ${active?.panY || 0}px) scale(${active?.scale || 1})`,
          }}
        >
          {[...(active?.items || [])].sort((a, b) => a.z - b.z).map((it) => {
            const isSel = it.id === selectedId
            return (
              <div
                key={it.id}
                onPointerDown={(e) => startItemDrag(e, it, 'move')}
                onDoubleClick={(e) => { if (it.kind === 'note') { e.stopPropagation() } }}
                style={{
                  position: 'absolute', left: it.x, top: it.y, width: it.w, height: it.h,
                  transform: `rotate(${it.rot}deg)`, transformOrigin: 'center center',
                  zIndex: it.z,
                  boxShadow: isSel ? '0 0 0 2px var(--accent), 0 6px 20px rgba(0,0,0,.35)' : '0 3px 12px rgba(0,0,0,.3)',
                  borderRadius: it.kind === 'note' ? 4 : 3,
                  cursor: 'move',
                }}
              >
                {it.kind === 'image' ? (
                  <img
                    src={it.url}
                    alt={it.title || ''}
                    draggable={false}
                    onError={(e) => { (e.currentTarget.style.opacity = '0.25') }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 3, pointerEvents: 'none', background: 'var(--panel)' }}
                  />
                ) : (
                  <NoteTile it={it} onText={(t) => patchItem(it.id, { text: t })} />
                )}

                {/* 선택 시 핸들 */}
                {isSel && (
                  <>
                    {/* 크기조절 핸들(우하단) */}
                    <div
                      onPointerDown={(e) => startItemDrag(e, it, 'resize')}
                      title="드래그: 크기 조절 (Shift=자유 비율)"
                      style={{ position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, borderRadius: 3, background: 'var(--accent)', border: '2px solid #fff', cursor: 'nwse-resize' }}
                    />
                    {/* 회전 핸들(상단) */}
                    <div
                      onPointerDown={(e) => startItemDrag(e, it, 'rotate')}
                      title="드래그: 회전 (Shift=15° 스냅)"
                      style={{ position: 'absolute', left: '50%', top: -26, marginLeft: -8, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', border: '2px solid #fff', cursor: 'grab' }}
                    />
                    <div style={{ position: 'absolute', left: '50%', top: -12, width: 1, height: 12, marginLeft: -0.5, background: 'var(--accent)' }} />
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* 빈 보드 안내 */}
        {(!active || active.items.length === 0) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24, pointerEvents: 'none' }}>
            <div style={{ fontSize: 32 }}><Emoji e="📌" /></div>
            <div>이미지를 <b>드롭</b>하거나 위 버튼으로 추가하세요.</div>
            <div style={{ fontSize: 12 }}>URL 붙여넣기 · 파일 드롭 · 클립보드 붙여넣기(Ctrl+V) · 라이브러리/갤러리</div>
            <div style={{ fontSize: 12 }}>휠=줌 · 빈 곳 드래그=이동 · 타일 드래그=배치</div>
          </div>
        )}

        {showPickHint && (
          <div style={{ position: 'absolute', left: 8, top: 8, background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '3px 9px', borderRadius: 999, pointerEvents: 'none' }}>
            다른 도구가 이미지를 기다리는 중 — 라이브러리/갤러리에서 골라 보세요
          </div>
        )}

        {/* 줌 컨트롤(좌하단 오버레이) */}
        <div style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', gap: 4, alignItems: 'center', background: 'color-mix(in srgb, var(--panel) 88%, transparent)', borderRadius: 8, padding: '3px 5px', border: '1px solid var(--border)' }}>
          <button className="minibtn" onClick={zoomOut} title="축소">－</button>
          <span style={{ fontSize: 11, minWidth: 38, textAlign: 'center', fontWeight: 700 }}>{Math.round((active?.scale || 1) * 100)}%</span>
          <button className="minibtn" onClick={zoomIn} title="확대">＋</button>
          <button className="minibtn" onClick={() => setScale(1)} title="100%">1:1</button>
          <button className="minibtn" onClick={fitAll} title="전체 보기">⛶ 맞춤</button>
        </div>
      </div>

      {/* 선택 항목 인스펙터 */}
      {selected && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{selected.kind === 'note' ? <><Emoji e="📝" /> 메모</> : <><Emoji e="🖼" /> 이미지</>}</span>
            {selected.kind === 'image' && (
              <input
                value={selected.title || ''}
                onChange={(e) => patchItem(selected.id, { title: e.target.value })}
                placeholder="제목/메모"
                style={{ flex: 1, minWidth: 80, padding: '3px 7px', borderRadius: 6, fontSize: 12, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
              />
            )}
            <button className="minibtn" onClick={() => bringToFront(selected.id)} title="맨 앞으로 ( ] )">⬆ 앞</button>
            <button className="minibtn" onClick={() => sendToBack(selected.id)} title="맨 뒤로 ( [ )">⬇ 뒤</button>
            <button className="minibtn" onClick={() => duplicateItem(selected.id)} title="복제">⧉ 복제</button>
            <button className="minibtn" onClick={() => patchItem(selected.id, { rot: 0 })} title="회전 초기화">↺ 0°</button>
            <button className="minibtn danger" onClick={() => deleteItem(selected.id)} title="삭제 (Del)"><Emoji e="🗑" /> 삭제</button>
          </div>
          {selected.kind === 'image' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={selected.credit || ''}
                onChange={(e) => patchItem(selected.id, { credit: e.target.value })}
                placeholder="출처/제작자"
                style={{ flex: 2, minWidth: 100, padding: '3px 7px', borderRadius: 6, fontSize: 11, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
              />
              <input
                value={selected.license || ''}
                onChange={(e) => patchItem(selected.id, { license: e.target.value })}
                placeholder="라이선스"
                style={{ flex: 1, minWidth: 70, padding: '3px 7px', borderRadius: 6, fontSize: 11, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
              />
              <button className="linkbtn" onClick={saveSelectedToLibrary} title="공유 이미지 라이브러리에 저장"><Emoji e="💾" /> 라이브러리</button>
            </div>
          )}
          {selected.kind === 'note' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>색:</span>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => patchItem(selected.id, { color: c })}
                  title="메모 색"
                  style={{ width: 18, height: 18, borderRadius: 4, background: c, border: selected.color === c ? '2px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', padding: 0 }}
                />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {hasStash() && <button className="linkbtn" onClick={stashSelected} title="수집함에 담기"><Emoji e="🧺" /> 수집함</button>}
            <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 'auto' }}>
              {Math.round(selected.w)}×{Math.round(selected.h)} · {selected.rot}°
            </span>
          </div>
        </div>
      )}

      {/* 하단 액션 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="minibtn" onClick={() => { if (renaming) return; setRenameVal(active?.name || ''); setRenaming(true) }} title="보드 이름 변경"><Emoji e="✏" /> 이름</button>
        <button className="minibtn" onClick={exportPng} disabled={exporting || !active?.items.length}>{exporting ? '내보내는 중…' : <><Emoji e="🖼" /> PNG 내보내기</>}</button>
        <button
          className="linkbtn"
          onClick={saveBoardToProject}
          disabled={!hasProjectBridge() || !active?.items.length}
          title={hasProjectBridge() ? '보드의 이미지 출처·메모를 프로젝트(참고 보드 폴더) 메모로 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}
        >
          {addedProject ? '✓ 추가됨' : <><Emoji e="📄" /> 프로젝트에 추가</>}
        </button>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 'auto' }}>
          {active?.items.filter((i) => i.kind === 'image').length || 0}장 · 메모 {active?.items.filter((i) => i.kind === 'note').length || 0}
        </span>
      </div>

      {/* 연계 도구 바 */}
      {related.length > 0 && (
        <div className="linkbar" style={{ flexShrink: 0 }}>
          <span className="linkbar-label">연계</span>
          {related.map((rid) => (
            <button key={rid} className="linkbtn" onClick={() => openToolLinked(rid)} title="관련 도구 열기">
              {emojify(RELATED_LABEL[rid] || rid)}
            </button>
          ))}
        </div>
      )}

      {/* 토스트/안내 */}
      {toast && <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{toast}</div>}
      <div className="license-note" style={{ flexShrink: 0 }}>
        저작권 안전한 공개 자료(CC0/퍼블릭도메인/Unsplash 라이선스 등)만 권장합니다. 각 타일의 출처·라이선스를 적어 두면 그대로 보존됩니다. 보드는 이 브라우저(localStorage)에만 저장됩니다.
      </div>
    </div>
  )
}

// ── 메모 타일(더블클릭으로 편집) ──
function NoteTile({ it, onText }: { it: BoardItem; onText: (t: string) => void }) {
  const [editing, setEditing] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => { if (editing) taRef.current?.focus() }, [editing])
  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      style={{ width: '100%', height: '100%', background: it.color || NOTE_COLORS[0], borderRadius: 4, padding: 8, boxSizing: 'border-box', overflow: 'hidden', color: '#222' }}
    >
      {editing ? (
        <textarea
          ref={taRef}
          value={it.text || ''}
          onChange={(e) => onText(e.target.value)}
          onBlur={() => setEditing(false)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="메모 입력…"
          style={{ width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: '#222', fontSize: 13, lineHeight: 1.4, fontFamily: 'inherit' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflow: 'hidden', wordBreak: 'break-word', pointerEvents: 'none' }}>
          {(it.text || '').trim() || '더블클릭해서 메모 입력'}
        </div>
      )}
    </div>
  )
}
