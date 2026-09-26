import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { childrenOf, pathOf, useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import { loadBlob } from '../persistence/blobs'
import EditableText from './EditableText'
import { Icon } from '../ui/icons'

export function containerOf(project: Project, activeId: string | null): string {
  const a = activeId ? project.items[activeId] : null
  if (!a) return 'root-draft'
  if (a.type === 'folder' || a.root) return a.id
  return a.parentId || 'root-draft'
}

// ── 컨테이너 고정(pin) 미니 스토어 — 코르크보드·아웃라이너·칸반 공용 ──────────────
// '한 클릭 = 선택'과 '드릴인(폴더 진입)'을 분리한다. 뷰 내부에서 카드/행을 클릭해
// activeId 가 바뀌어도 pin 이 걸려 있으면 현재 컨테이너를 유지하고, 더블클릭/Enter/
// 브레드크럼/바인더 등 '명시적 이동' 시에만 containerOf 기본 규칙대로 드릴인한다.
// 세 뷰가 같은 상태를 공유해야 하므로 모듈 스코프 + useSyncExternalStore 로 구독한다.
type ContainerPin = { containerId: string; activeId: string } | null
let containerPin: ContainerPin = null
let pinVersion = 0
const pinListeners = new Set<() => void>()
function emitPin() {
  pinVersion++
  pinListeners.forEach((fn) => fn())
}
function subscribePin(fn: () => void) {
  pinListeners.add(fn)
  return () => {
    pinListeners.delete(fn)
  }
}
function pinSnapshot() {
  return pinVersion
}
/** 현재 컨테이너를 유지한 채 항목을 '선택만' 할 때(카드/행 클릭) select 직전에 호출. */
export function pinContainer(containerId: string, activeId: string) {
  containerPin = { containerId, activeId }
  emitPin()
}
/** 명시적 드릴인/컨테이너 이동 직전에 호출 — containerOf 기본 규칙으로 복귀. */
export function unpinContainer() {
  if (containerPin) {
    containerPin = null
    emitPin()
  }
}

/** containerOf 의 pin 반영판 훅 — 코르크보드·아웃라이너·칸반의 컨테이너 계산에 사용. */
export function useViewContainer(project: Project, activeId: string | null): string {
  useSyncExternalStore(subscribePin, pinSnapshot)
  // pin 을 만든 선택이 다른 경로(바인더·팔레트 등)에서 바뀌면 pin 해제 → 기본 규칙 복귀.
  useEffect(() => {
    if (containerPin && containerPin.activeId !== activeId) unpinContainer()
  }, [activeId])
  if (containerPin && containerPin.activeId === activeId && project.items[containerPin.containerId]) {
    return containerPin.containerId
  }
  return containerOf(project, activeId)
}

// 코르크보드/아웃라이너/칸반 공용 — 현재 컨테이너 경로(breadcrumb) + 상위 이동.
export function ContainerBar() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.select)
  const containerId = useViewContainer(project, activeId)
  const crumbs = pathOf(project, containerId)
  const parent = project.items[containerId]?.parentId
  // 브레드크럼/상위 이동은 명시적 컨테이너 이동 — pin 을 풀고 기본 드릴인 규칙을 따른다.
  const go = (id: string) => {
    unpinContainer()
    select(id)
  }
  return (
    <div className="container-bar">
      <button className="minibtn" disabled={!parent} onClick={() => parent && go(parent)} title="상위 폴더로">
        ↑ 상위
      </button>
      <span className="cb-crumbs">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="sep">›</span>}
            <button className="cb-crumb" onClick={() => go(c.id)}>
              {c.title}
            </button>
          </span>
        ))}
      </span>
    </div>
  )
}

type CardSort = 'manual' | 'title' | 'label' | 'status' | 'modified' | 'words'
type CardSize = 'sm' | 'md' | 'lg'

const SIZE_MIN: Record<CardSize, number> = { sm: 160, md: 220, lg: 300 }
const SIZE_MINH: Record<CardSize, number> = { sm: 110, md: 150, lg: 200 }

function lsGet<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}

/** IndexedDB blob 을 object URL 로 로드(언마운트 시 revoke). */
function useBlobUrl(blobId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let made: string | null = null
    if (blobId) {
      loadBlob(blobId)
        .then((b) => {
          if (b && !revoked) {
            made = URL.createObjectURL(b)
            setUrl(made)
          }
        })
        .catch(() => {})
    } else setUrl(null)
    return () => {
      revoked = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [blobId])
  return url
}

type Pos = { x: number; y: number }

function Card({
  item,
  containerId,
  size,
  locked,
  freeform,
  pos,
  order,
  index,
  reorderable,
  onDrag,
  onArrow,
}: {
  item: BinderItem
  containerId: string
  size: CardSize
  locked: boolean
  freeform: boolean
  pos: Pos
  order: string[]
  index: number
  reorderable: boolean
  onDrag: (id: string, x: number, y: number, commit?: boolean) => void
  onArrow: (fromIndex: number, key: string, reorder: boolean) => void
}) {
  const project = useStore((s) => s.project)
  const selectedIds = useStore((s) => s.selectedIds)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const renameItem = useStore((s) => s.renameItem)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const moveItem = useStore((s) => s.moveItem)
  // moved: 임계값 초과 시 실제 드래그로 간주, justDragged: 드래그 직후 click 의 select 억제용
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean; lastX: number; lastY: number } | null>(null)
  const justDragged = useRef(false)

  const label = project.labels.find((l) => l.id === item.labelId)
  const status = project.statuses.find((s) => s.id === item.statusId)
  const selected = selectedIds.includes(item.id)
  const isImage = item.type === 'image' && !!item.blobId
  const thumb = useBlobUrl(isImage ? item.blobId : undefined)

  const startFreeDrag = (e: React.MouseEvent) => {
    if (!freeform || e.button !== 0) return
    const t = e.target as HTMLElement
    if (t.isContentEditable || t.closest('.card-title, .card-syn')) return // 텍스트 편집 중에는 이동 안 함
    // 선(先)선택 금지(리뷰 F6): mousedown 에서 바로 선택하면 이어지는 click 의 additive 토글이 방금 추가한
    // 항목을 되빼서 Ctrl+클릭 다중선택이 불가능해진다 → '실제 드래그로 판정된 순간'에만 선택한다.
    const wasSelected = selected
    const additive = e.ctrlKey || e.metaKey
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false, lastX: pos.x, lastY: pos.y }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      // 임계값(5px) 넘게 움직이면 드래그로 간주 — 그 순간 미선택 카드는 선택(끌기 전 선택 의도 유지)
      if (!d.moved && Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) > 5) {
        d.moved = true
        if (!wasSelected) selectOnly({ additive })
      }
      d.lastX = Math.max(0, d.ox + ev.clientX - d.sx)
      d.lastY = Math.max(0, d.oy + ev.clientY - d.sy)
      onDrag(item.id, d.lastX, d.lastY) // 메모리만 갱신
    }
    const up = () => {
      const d = dragRef.current
      // 실제로 이동했으면 종료 시 1회 localStorage 영속화 + 직후 click 의 select 를 한 번 무시
      //  (카드 밖에서 mouseup 되면 click 이 안 와 플래그가 남으므로 태스크 종료 후 자동 해제 — 리뷰 F12)
      if (d?.moved) { justDragged.current = true; onDrag(item.id, d.lastX, d.lastY, true); setTimeout(() => { justDragged.current = false }, 0) }
      dragRef.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const freeStyle: React.CSSProperties = freeform
    ? { position: 'absolute', left: pos.x, top: pos.y, width: SIZE_MIN[size], minHeight: SIZE_MINH[size], cursor: 'grab' }
    : { minHeight: SIZE_MINH[size] }

  // 항목을 '선택만' — 폴더 카드도 한 클릭에 드릴인하지 않도록 현재 컨테이너를 고정(pin)한다.
  const selectOnly = (opts?: { additive?: boolean; range?: boolean }) => {
    if (item.type === 'folder') pinContainer(containerId, item.id)
    select(item.id, { ...opts, order })
  }

  // 카드 활성화(열기, 더블클릭/Enter): 폴더는 내부로 진입(pin 해제 후 select=드릴인), 그 외는 에디터로 연다.
  const activate = () => {
    if (item.type === 'folder') {
      unpinContainer()
      select(item.id)
    } else {
      select(item.id)
      setView('editor')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement
    // 제목/줄거리 인라인 편집 중에는 카드 키 내비를 가로채지 않는다.
    if (t.isContentEditable || (t !== e.currentTarget && t.closest('.card-title, .card-syn'))) return
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        activate()
        break
      case ' ':
      case 'Spacebar':
        e.preventDefault()
        selectOnly({ additive: e.ctrlKey || e.metaKey, range: e.shiftKey })
        break
      case 'ArrowRight':
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowDown': {
        // 수동 순서(reorderable)에서 Ctrl/Meta + 화살표 = 순서 변경, 그 외엔 포커스 이동.
        const reorder = reorderable && (e.ctrlKey || e.metaKey)
        e.preventDefault()
        onArrow(index, e.key, reorder)
        break
      }
      default:
        break
    }
  }

  const ariaLabel =
    item.title +
    (status && item.statusId !== 'status-none' ? ` (${status.name})` : '') +
    (item.type === 'folder' ? ' — 폴더' : '')

  return (
    <div
      className={'card' + (selected ? ' selected' : '') + (freeform ? ' card-free' : '')}
      style={freeStyle}
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel}
      tabIndex={selected || index === 0 ? 0 : -1}
      data-cb-index={index}
      onKeyDown={onKeyDown}
      draggable={!locked && !freeform}
      onMouseDown={startFreeDrag}
      onClick={(e) => {
        // 자유배치에서 드래그 직후 click 은 다중선택을 1개로 붕괴시키므로 무시
        if (justDragged.current) {
          justDragged.current = false
          return
        }
        // 한 클릭 = 선택만(폴더도 즉시 드릴인하지 않음 — 진입은 더블클릭/Enter)
        selectOnly({ additive: e.ctrlKey || e.metaKey, range: e.shiftKey })
      }}
      onDoubleClick={activate}
      onDragStart={(e) => {
        if (locked || freeform) return
        e.dataTransfer.setData('text/scriv-id', item.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (!locked && !freeform && e.dataTransfer.types.includes('text/scriv-id')) e.preventDefault()
      }}
      onDrop={(e) => {
        if (locked || freeform) return
        e.preventDefault()
        e.stopPropagation() // 컨테이너 onDrop(끝으로 편입)과의 이중 처리 방지
        const dragId = e.dataTransfer.getData('text/scriv-id')
        if (!dragId || dragId === item.id || !item.parentId) return
        const siblings = project.items[item.parentId].childIds
        moveItem(dragId, item.parentId, siblings.indexOf(item.id))
      }}
    >
      <div className="card-label" style={{ background: label && item.labelId !== 'label-none' ? label.color : 'transparent' }} />
      {isImage &&
        (thumb ? (
          <img className="card-thumb" src={thumb} alt={item.title} draggable={false} />
        ) : (
          <div className="card-thumb card-thumb-ph"><Icon name="image" size={28} /></div>
        ))}
      {(item.type === 'pdf' || item.type === 'file') && (
        <div className="card-thumb card-thumb-ph"><Icon name={item.type === 'pdf' ? 'references' : 'link'} size={28} /></div>
      )}
      <EditableText className="card-title" value={item.title} stopClick onCommit={(v) => renameItem(item.id, v || item.title)} />
      <EditableText className="card-syn" value={item.synopsis} placeholder="줄거리…" stopClick onCommit={(v) => setSynopsis(item.id, v)} />
      {status && item.statusId !== 'status-none' && <div className="card-status">{status.name}</div>}
    </div>
  )
}

export default function Corkboard() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const addItem = useStore((s) => s.addItem)
  const moveItem = useStore((s) => s.moveItem)
  const [sort, setSort] = useState<CardSort>(() => lsGet<CardSort>('cork.sort', 'manual'))
  const [size, setSize] = useState<CardSize>(() => lsGet<CardSize>('cork.size', 'md'))
  const [freeform, setFreeform] = useState<boolean>(() => {
    try { return localStorage.getItem('cork.freeform') === '1' } catch { return false }
  })
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const boardRef = useRef<HTMLDivElement | null>(null)

  const setSortP = (v: CardSort) => {
    setSort(v)
    try { localStorage.setItem('cork.sort', v) } catch { /* noop */ }
  }
  const setSizeP = (v: CardSize) => {
    setSize(v)
    try { localStorage.setItem('cork.size', v) } catch { /* noop */ }
  }
  const setFreeformP = (v: boolean) => {
    setFreeform(v)
    try { localStorage.setItem('cork.freeform', v ? '1' : '') } catch { /* noop */ }
  }

  const posKey = (id: string) => `cork.pos.${project.id}.${id}`
  // 기본 격자 좌표 — size 에 의존하지 않는 고정 간격(카드 size 변경이 미배치 카드 좌표를 흔들지 않게)
  const FREE_COL_GAP = SIZE_MIN.lg + 24
  const FREE_ROW_GAP = SIZE_MINH.lg + 40
  const defaultPos = (i: number): Pos => ({ x: 20 + (i % 4) * FREE_COL_GAP, y: 20 + Math.floor(i / 4) * FREE_ROW_GAP })
  const savedPos = (id: string): Pos | null => {
    if (positions[id]) return positions[id]
    try {
      const raw = localStorage.getItem(posKey(id))
      if (raw) return JSON.parse(raw)
    } catch { /* noop */ }
    return null
  }
  const getPos = (id: string, i: number): Pos => savedPos(id) ?? defaultPos(i)
  const onDrag = (id: string, x: number, y: number, commit = false) => {
    setPositions((p) => ({ ...p, [id]: { x, y } }))
    // 드래그 중에는 메모리 상태만 갱신하고, 종료(commit) 시 1회만 localStorage 에 기록(매 프레임 동기쓰기 방지).
    if (commit) {
      try { localStorage.setItem(posKey(id), JSON.stringify({ x, y })) } catch { /* noop */ }
    }
  }

  const containerId = useViewContainer(project, activeId)
  let cards = childrenOf(project, containerId)

  if (sort !== 'manual' && !freeform) {
    const labelIdx = (id: string | null) => project.labels.findIndex((l) => l.id === (id || 'label-none'))
    const statusIdx = (id: string | null) => project.statuses.findIndex((s) => s.id === (id || 'status-none'))
    cards = [...cards].sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title, 'ko')
        case 'label':
          return labelIdx(a.labelId) - labelIdx(b.labelId)
        case 'status':
          return statusIdx(a.statusId) - statusIdx(b.statusId)
        case 'modified':
          return b.modified - a.modified
        case 'words':
          return b.wordCount - a.wordCount
        default:
          return 0
      }
    })
  }

  // 정렬/필터가 반영된 화면 표시 순서 id 배열 — Shift 범위선택의 기준(Outliner 의 rowOrder 와 동일 패턴)
  const cardOrder = cards.map((c) => c.id)

  // 수동 순서이며 자유배치/정렬잠금이 아닐 때만 키보드 순서변경 허용(드래그 재배치와 동일 조건).
  const reorderable = sort === 'manual' && !freeform
  // 카드 키보드 내비게이션: 화살표로 포커스 이동(그리드), Ctrl/Meta+화살표로 순서 변경.
  const focusCardAt = (idx: number) => {
    const board = boardRef.current
    if (!board) return
    const el = board.querySelector<HTMLElement>(`[data-cb-index="${idx}"]`)
    if (el) el.focus()
  }
  const onArrow = (fromIndex: number, key: string, reorder: boolean) => {
    if (reorder) {
      // 수동 순서에서 순서 변경. moveItem 은 '드래그 항목 포함' 원본 childIds 기준 인덱스를 받으므로
      // 이전 칸(왼/위)으로 갈 땐 목표 인덱스를, 뒤(오른/아래)로 갈 땐 +2 위치를 넘긴다(드래그 onDrop 과 동일 규약).
      const id = cardOrder[fromIndex]
      const it = id ? project.items[id] : null
      const parentId = it?.parentId
      if (!parentId) return
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        if (fromIndex <= 0) return
        moveItem(id, parentId, fromIndex - 1)
      } else {
        if (fromIndex >= cardOrder.length - 1) return
        moveItem(id, parentId, fromIndex + 2)
      }
      // 순서 변경 후에도 포커스를 같은 카드(이동된 위치)에 유지.
      const next = key === 'ArrowLeft' || key === 'ArrowUp' ? fromIndex - 1 : fromIndex + 1
      requestAnimationFrame(() => focusCardAt(next))
      return
    }
    // 포커스 이동: 좌/우는 1칸, 상/하는 실제 렌더 좌표로 한 행 위/아래의 가장 가까운 카드로 이동.
    const board = boardRef.current
    if (key === 'ArrowLeft') return focusCardAt(Math.max(0, fromIndex - 1))
    if (key === 'ArrowRight') return focusCardAt(Math.min(cardOrder.length - 1, fromIndex + 1))
    if (!board) return
    const cur = board.querySelector<HTMLElement>(`[data-cb-index="${fromIndex}"]`)
    if (!cur) return
    const curTop = cur.offsetTop
    const curLeft = cur.offsetLeft
    let best = -1
    let bestDx = Infinity
    for (let i = 0; i < cardOrder.length; i++) {
      if (i === fromIndex) continue
      const el = board.querySelector<HTMLElement>(`[data-cb-index="${i}"]`)
      if (!el) continue
      const isUp = key === 'ArrowUp' ? el.offsetTop < curTop : el.offsetTop > curTop
      if (!isUp) continue
      const dx = Math.abs(el.offsetLeft - curLeft)
      // 가장 가까운 행을 우선(작은 |Δtop|), 같은 행 내에서는 같은 열에 가장 가까운 카드.
      const dy = Math.abs(el.offsetTop - curTop)
      const score = dy * 1000 + dx
      if (score < bestDx) {
        bestDx = score
        best = i
      }
    }
    if (best >= 0) focusCardAt(best)
  }

  // [C] freeform 진입/카드 최초 등장 시 저장좌표가 없는 카드만 현재 기본 좌표를 1회 확정 저장
  // (이후 size 변경이 좌표 재계산을 유발하지 않게 onDrag 와 동일 경로로 고정)
  useEffect(() => {
    if (!freeform) return
    cards.forEach((c, i) => {
      if (savedPos(c.id) === null) onDrag(c.id, defaultPos(i).x, defaultPos(i).y)
    })
    // cards 길이/구성 변동 시에만 재확인(size 변경에는 반응하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeform, containerId, cardOrder.join(',')])

  // 프로젝트 전환 시 자유배치 좌표 메모리 초기화 — 좌표는 cork.pos.<projectId>.<id> 로 프로젝트별 저장되므로
  // 이전 프로젝트의 메모리 좌표가 새 프로젝트 카드에 잘못 적용되는 것을 막는다.
  useEffect(() => {
    setPositions({})
  }, [project.id])

  // 빈 폴더/카드 사이 빈 공간으로 드롭 → 현재 컨테이너 끝으로 편입(빈 폴더 이동 가능).
  // 카드 위 드롭은 Card 의 onDrop 이 stopPropagation 으로 처리하므로 컨테이너 핸들러는 빈 공간에서만 발동한다.
  // 자유배치/정렬중에는 카드 재배치가 잠겨 있어 컨테이너 드롭도 막는다.
  const containerDragLocked = freeform || sort !== 'manual'
  const onContainerDragOver = (e: React.DragEvent) => {
    if (!containerDragLocked && e.dataTransfer.types.includes('text/scriv-id')) e.preventDefault()
  }
  const onContainerDrop = (e: React.DragEvent) => {
    if (containerDragLocked) return
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/scriv-id')
    if (!dragId) return
    moveItem(dragId, containerId, childrenOf(project, containerId).length)
  }

  return (
    <div className="corkboard-wrap">
      <ContainerBar />
      <div className="cork-toolbar">
        <button
          className="btn-ghost"
          onClick={() => addItem('text', containerId)}
          title="현재 폴더에 새 텍스트 카드 추가"
        >
          ＋ 카드
        </button>
        <label>
          정렬{' '}
          <select className="field" value={sort} disabled={freeform} onChange={(e) => setSortP(e.target.value as CardSort)}>
            <option value="manual">수동(바인더 순서)</option>
            <option value="title">제목</option>
            <option value="label">라벨</option>
            <option value="status">상태</option>
            <option value="modified">수정일</option>
            <option value="words">단어 수</option>
          </select>
        </label>
        <label>
          크기{' '}
          <select className="field" value={size} onChange={(e) => setSizeP(e.target.value as CardSize)}>
            <option value="sm">작게</option>
            <option value="md">보통</option>
            <option value="lg">크게</option>
          </select>
        </label>
        <label title="카드를 자유롭게 배치(핀보드). 위치는 이 브라우저에 저장됩니다.">
          <input type="checkbox" checked={freeform} onChange={(e) => setFreeformP(e.target.checked)} /> 자유 배치
        </label>
        {sort !== 'manual' && !freeform && (
          <span style={{ color: 'var(--warn)', fontSize: 11 }}>정렬 중 — 드래그 재배치 잠금(수동으로 전환 시 가능)</span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{cards.length}개 카드</span>
      </div>
      {cards.length === 0 ? (
        <div className="corkboard" onDragOver={onContainerDragOver} onDrop={onContainerDrop}>
          <div className="empty-hint" style={{ gridColumn: '1 / -1' }}>
            이 폴더에 카드가 없습니다.
            <div style={{ marginTop: 10 }}>
              <button className="btn-ghost" onClick={() => addItem('text', containerId)}>
                + 새 카드
              </button>
            </div>
          </div>
        </div>
      ) : freeform ? (
        <div className="corkboard corkboard-free" ref={boardRef} role="listbox" aria-label="코르크보드 카드" aria-multiselectable>
          {cards.map((c, i) => (
            <Card
              key={c.id}
              item={c}
              containerId={containerId}
              size={size}
              locked={false}
              freeform
              pos={getPos(c.id, i)}
              order={cardOrder}
              index={i}
              reorderable={false}
              onDrag={onDrag}
              onArrow={onArrow}
            />
          ))}
        </div>
      ) : (
        <div
          className="corkboard"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${SIZE_MIN[size]}px, 1fr))` }}
          ref={boardRef}
          role="listbox"
          aria-label="코르크보드 카드"
          aria-multiselectable
          onDragOver={onContainerDragOver}
          onDrop={onContainerDrop}
        >
          {cards.map((c, i) => (
            <Card
              key={c.id}
              item={c}
              containerId={containerId}
              size={size}
              locked={sort !== 'manual'}
              freeform={false}
              pos={{ x: 0, y: 0 }}
              order={cardOrder}
              index={i}
              reorderable={reorderable}
              onDrag={onDrag}
              onArrow={onArrow}
            />
          ))}
        </div>
      )}
    </div>
  )
}
