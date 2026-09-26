// 집필 칸반 보드 — 아이디어/초고/퇴고/완료 컬럼 사이로 카드를 드래그 이동, 카드 CRUD(추가/편집/삭제)와
// 컬럼 내 순서 변경, 우선순위·태그·메모, 컬럼별 개수 배지, 검색/필터, 텍스트 내보내기, localStorage 자동 저장/복원.
// 자급식: react 외 import 없음. 외부 네트워크 없음. 포인터(드래그) 리스너는 언마운트/pointerup 시 정리.
// 연계(linkbus): 칸반 보드(컬럼별 카드)를 프로젝트 자료('보드' 폴더)에 컬럼/카드 목록 HTML 문서로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'kanban-writing', name: '집필 칸반 보드', icon: '🗂️', group: '집중·생산성', intro: '아이디어·초고·퇴고·완료 사이로 카드를 옮기며 집필 흐름을 관리하세요', w: 760, h: 560 }

const LS_KEY = 'sry:tool:kanban-writing'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
type ColKey = 'idea' | 'draft' | 'revise' | 'done'
type Priority = 'low' | 'mid' | 'high'

interface Card {
  id: string
  title: string
  body: string
  tags: string[]
  priority: Priority
  createdAt: number
  updatedAt: number
}

interface Column {
  key: ColKey
  label: string
  icon: string
  accent: string // 강조 색(컬럼 헤더/막대)
}

interface BoardState {
  cards: Record<string, Card>
  order: Record<ColKey, string[]> // 컬럼별 카드 id 순서
}

const COLUMNS: Column[] = [
  { key: 'idea', label: '아이디어', icon: '💡', accent: '#f0b429' },
  { key: 'draft', label: '초고', icon: '✍️', accent: '#4c8bf5' },
  { key: 'revise', label: '퇴고', icon: '🔧', accent: '#a855f7' },
  { key: 'done', label: '완료', icon: '✅', accent: '#22a06b' },
]
const COL_KEYS: ColKey[] = COLUMNS.map((c) => c.key)

const PRIORITIES: { key: Priority; label: string; color: string; dot: string }[] = [
  { key: 'low', label: '낮음', color: 'var(--muted)', dot: '🔵' },
  { key: 'mid', label: '보통', color: 'var(--accent)', dot: '🟡' },
  { key: 'high', label: '높음', color: 'var(--warn)', dot: '🔴' },
]
const prioMeta = (p: Priority) => PRIORITIES.find((x) => x.key === p) || PRIORITIES[1]

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function emptyBoard(): BoardState {
  return { cards: {}, order: { idea: [], draft: [], revise: [], done: [] } }
}

// HTML 이스케이프 (프로젝트 본문에 안전하게 삽입).
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 첫 사용자에게 보여줄 예시 카드(빈 보드일 때만 시드).
function seedBoard(): BoardState {
  const b = emptyBoard()
  const make = (title: string, body: string, tags: string[], priority: Priority): Card => {
    const id = newId()
    const now = Date.now()
    b.cards[id] = { id, title, body, tags, priority, createdAt: now, updatedAt: now }
    return b.cards[id]
  }
  const a = make('새 단편 「등대」 구상', '안개 낀 항구, 말 못 하는 등대지기. 한 통의 편지로 시작.', ['단편', '미스터리'], 'high')
  const c = make('1장 도입부 쓰기', '주인공이 등대에 도착하는 장면. 분위기 위주로.', ['1장'], 'mid')
  const d = make('인물 이름 정하기', '주인공·조력자·악역 후보 메모.', ['설정'], 'low')
  const e = make('2장 대사 다듬기', '대화가 너무 설명적. 행동으로 보여주기.', ['2장', '대사'], 'mid')
  const f = make('프롤로그 완성', '분위기 잡힘. 통과.', ['완료'], 'low')
  b.order.idea = [a.id, d.id]
  b.order.draft = [c.id]
  b.order.revise = [e.id]
  b.order.done = [f.id]
  return b
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful 처리. 구조 검증으로 끌어올림.
function loadBoard(): { board: BoardState; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { board: seedBoard(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { board: seedBoard(), seeded: true }
    const cards: Record<string, Card> = {}
    if (parsed.cards && typeof parsed.cards === 'object') {
      for (const k of Object.keys(parsed.cards)) {
        const c = parsed.cards[k]
        if (!c || typeof c.title !== 'string') continue
        cards[String(k)] = {
          id: String(c.id || k),
          title: String(c.title),
          body: typeof c.body === 'string' ? c.body : '',
          tags: Array.isArray(c.tags) ? c.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 12) : [],
          priority: (['low', 'mid', 'high'].includes(c.priority) ? c.priority : 'mid') as Priority,
          createdAt: Number(c.createdAt) || Date.now(),
          updatedAt: Number(c.updatedAt) || Date.now(),
        }
      }
    }
    const order = emptyBoard().order
    if (parsed.order && typeof parsed.order === 'object') {
      for (const k of COL_KEYS) {
        const arr = parsed.order[k]
        if (Array.isArray(arr)) order[k] = arr.map((x: unknown) => String(x)).filter((id) => !!cards[id])
      }
    }
    // 누락분 보정: 카드인데 어느 컬럼에도 없으면 아이디어로.
    const placed = new Set<string>()
    COL_KEYS.forEach((k) => order[k].forEach((id) => placed.add(id)))
    Object.keys(cards).forEach((id) => { if (!placed.has(id)) order.idea.push(id) })
    return { board: { cards, order }, seeded: false }
  } catch {
    return { board: seedBoard(), seeded: true }
  }
}

// 카드가 속한 컬럼 찾기
function colOf(board: BoardState, id: string): ColKey | null {
  for (const k of COL_KEYS) if (board.order[k].includes(id)) return k
  return null
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
interface DragState {
  cardId: string
  fromCol: ColKey
  pointerId: number
  // 화면 표시용 떠다니는 카드 위치
  x: number
  y: number
  offX: number
  offY: number
  w: number
  // 현재 드롭 후보(컬럼/삽입 인덱스)
  overCol: ColKey | null
  overIndex: number
  started: boolean // 임계 거리 넘겨 실제 드래그 시작됨
  startX: number
  startY: number
}

export default function KanbanWriting() {
  const initial = useRef<{ board: BoardState; seeded: boolean }>()
  if (!initial.current) initial.current = loadBoard()

  const [board, setBoard] = useState<BoardState>(initial.current.board)
  const [note, setNote] = useState(initial.current.seeded ? '예시 카드를 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')
  const [query, setQuery] = useState('')
  const [prioFilter, setPrioFilter] = useState<Priority | 'all'>('all')

  // 편집 모달 상태: 'new' 면 새 카드(targetCol 에 추가), 그 외엔 카드 id 편집
  const [editing, setEditing] = useState<{ id: string | 'new'; col: ColKey } | null>(null)
  // 삭제 확인 상태
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  // 복사 피드백
  const [copied, setCopied] = useState(false)
  // 바인더 파일 드롭: 점선 테두리(시각 피드백)·토스트
  const [dropActive, setDropActive] = useState(false)
  const dropDepth = useRef(0) // onDragEnter/Leave 중첩 보정
  const [dropToast, setDropToast] = useState('')

  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  const mounted = useRef(true)
  const boardElRef = useRef<HTMLDivElement | null>(null)
  // 각 컬럼 본문 DOM (드롭 위치 계산용)
  const colBodyRefs = useRef<Record<ColKey, HTMLDivElement | null>>({ idea: null, draft: null, revise: null, done: null })

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(board))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 보드가 초기화될 수 있어요.')
    }
  }, [board])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsertCard = useCallback((data: { id: string | 'new'; col: ColKey; title: string; body: string; tags: string[]; priority: Priority }) => {
    const title = data.title.trim()
    if (!title) return
    setBoard((prev) => {
      const next: BoardState = { cards: { ...prev.cards }, order: { ...prev.order } }
      if (data.id === 'new') {
        const id = newId()
        const now = Date.now()
        next.cards[id] = { id, title, body: data.body.trim(), tags: data.tags, priority: data.priority, createdAt: now, updatedAt: now }
        next.order = { ...prev.order, [data.col]: [...prev.order[data.col], id] }
      } else {
        const cur = prev.cards[data.id]
        if (!cur) return prev
        next.cards[data.id] = { ...cur, title, body: data.body.trim(), tags: data.tags, priority: data.priority, updatedAt: Date.now() }
      }
      return next
    })
    setEditing(null)
  }, [])

  // ── 바인더 파일 → 첫 컬럼(아이디어) 새 카드 ───────────────────────────────────
  // 일반 문서: title + text 앞부분을 메모로. 인물/장소 카드: 주요 필드를 메모로 요약.
  const addItemToIdea = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }) => {
    const title = (it.title || '제목 없음').trim().slice(0, 120)
    let body = ''
    if (it.character) {
      // 인물/장소 카드: 채워진 필드만 "키: 값" 줄로 요약
      const labels: Record<string, string> = {
        name: '이름', role: '역할', age: '나이', occupation: '직업', appearance: '외모',
        personality: '성격', habits: '습관', background: '배경', goal: '목표', conflict: '갈등',
        arc: '변화', notes: '메모', type: '유형', location: '위치', atmosphere: '분위기',
        description: '묘사', history: '내력', // 장소: name,type,location,atmosphere,description,history,role,notes
      }
      const lines: string[] = []
      for (const k of Object.keys(it.character)) {
        const v = (it.character[k] || '').trim()
        if (!v) continue
        lines.push(`${labels[k] || k}: ${v}`)
      }
      body = lines.join('\n').slice(0, 2000)
    } else {
      body = (it.text || '').trim().slice(0, 2000)
    }
    setBoard((prev) => {
      const id = newId()
      const now = Date.now()
      const cards = { ...prev.cards, [id]: { id, title, body, tags: [], priority: 'mid' as Priority, createdAt: now, updatedAt: now } }
      const order = { ...prev.order, idea: [...prev.order.idea, id] }
      return { cards, order }
    })
    setDropToast(`"${title}" 카드를 아이디어 컬럼에 추가했어요.`)
    window.setTimeout(() => { if (mounted.current) setDropToast('') }, 2200)
  }, [])

  const onToolDragOver = useCallback((e: React.DragEvent) => {
    if (isItemDrag(e)) e.preventDefault()
  }, [])
  const onToolDragEnter = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    dropDepth.current += 1
    setDropActive(true)
  }, [])
  const onToolDragLeave = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dropDepth.current = Math.max(0, dropDepth.current - 1)
    if (dropDepth.current === 0) setDropActive(false)
  }, [])
  const onToolDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    dropDepth.current = 0
    setDropActive(false)
    if (it) {
      e.preventDefault()
      addItemToIdea(it)
    }
  }, [addItemToIdea])

  const deleteCard = useCallback((id: string) => {
    setBoard((prev) => {
      const cards = { ...prev.cards }
      delete cards[id]
      const order = { ...prev.order }
      COL_KEYS.forEach((k) => { order[k] = order[k].filter((x) => x !== id) })
      return { cards, order }
    })
    setConfirmDel(null)
  }, [])

  // 컬럼 내 화살표로 순서 이동(드래그 보조)
  const nudge = useCallback((id: string, dir: -1 | 1) => {
    setBoard((prev) => {
      const k = colOf(prev, id)
      if (!k) return prev
      const arr = [...prev.order[k]]
      const i = arr.indexOf(id)
      const j = i + dir
      if (j < 0 || j >= arr.length) return prev
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...prev, order: { ...prev.order, [k]: arr } }
    })
  }, [])

  // 컬럼 간 이동(버튼 보조: 카드를 다음/이전 단계로)
  const moveStage = useCallback((id: string, dir: -1 | 1) => {
    setBoard((prev) => {
      const from = colOf(prev, id)
      if (!from) return prev
      const fi = COL_KEYS.indexOf(from)
      const ti = fi + dir
      if (ti < 0 || ti >= COL_KEYS.length) return prev
      const to = COL_KEYS[ti]
      const order = { ...prev.order }
      order[from] = order[from].filter((x) => x !== id)
      order[to] = [...order[to], id]
      return { ...prev, order }
    })
  }, [])

  const clearColumn = useCallback((k: ColKey) => {
    setBoard((prev) => {
      const ids = prev.order[k]
      if (!ids.length) return prev
      const label = COLUMNS.find((c) => c.key === k)?.label || ''
      if (!window.confirm(`${label} 컬럼 카드 ${ids.length}장을 모두 삭제할까요? 되돌릴 수 없습니다`)) return prev
      const cards = { ...prev.cards }
      ids.forEach((id) => { delete cards[id] })
      return { cards, order: { ...prev.order, [k]: [] } }
    })
  }, [])

  // ── 검색/필터 (드래그 커밋에서도 참조하므로 위에 선언) ─────────────────────────
  const q = query.trim().toLowerCase()
  const matches = useCallback((c: Card): boolean => {
    if (prioFilter !== 'all' && c.priority !== prioFilter) return false
    if (!q) return true
    if (c.title.toLowerCase().includes(q)) return true
    if (c.body.toLowerCase().includes(q)) return true
    if (c.tags.some((t) => t.toLowerCase().includes(q))) return true
    return false
  }, [q, prioFilter])

  // ── 드래그 이동 (포인터 이벤트) ───────────────────────────────────────────────
  const DRAG_THRESHOLD = 5

  const onCardPointerDown = useCallback((e: React.PointerEvent, cardId: string, fromCol: ColKey) => {
    // 좌클릭/터치만, 그리고 인터랙티브 요소 위에서 시작하지 않음
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return
    const el = (e.currentTarget as HTMLElement)
    const rect = el.getBoundingClientRect()
    setDrag({
      cardId, fromCol, pointerId: e.pointerId,
      x: rect.left, y: rect.top,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top,
      w: rect.width,
      overCol: fromCol, overIndex: 0,
      started: false, startX: e.clientX, startY: e.clientY,
    })
  }, [])

  // 컬럼/인덱스 계산: 포인터 좌표가 어느 컬럼의 몇 번째 카드 앞인지
  const computeDrop = useCallback((clientX: number, clientY: number, draggingId: string): { col: ColKey; index: number } | null => {
    let foundCol: ColKey | null = null
    for (const k of COL_KEYS) {
      const node = colBodyRefs.current[k]
      if (!node) continue
      const r = node.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top - 40 && clientY <= r.bottom + 40) {
        foundCol = k
        break
      }
    }
    if (!foundCol) {
      // 가로 위치만으로 가장 가까운 컬럼 선택(세로 밖이어도 이동 허용)
      let best: ColKey | null = null
      let bestDist = Infinity
      for (const k of COL_KEYS) {
        const node = colBodyRefs.current[k]
        if (!node) continue
        const r = node.getBoundingClientRect()
        const cx = (r.left + r.right) / 2
        const d = Math.abs(clientX - cx)
        if (d < bestDist) { bestDist = d; best = k }
      }
      foundCol = best
    }
    if (!foundCol) return null
    const node = colBodyRefs.current[foundCol]
    if (!node) return { col: foundCol, index: 0 }
    // 자식 카드들의 중앙선과 비교해 삽입 인덱스 산출
    const cardEls = Array.from(node.querySelectorAll<HTMLElement>('[data-card-id]'))
      .filter((c) => c.getAttribute('data-card-id') !== draggingId)
    let index = cardEls.length
    for (let i = 0; i < cardEls.length; i++) {
      const r = cardEls[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) { index = i; break }
    }
    return { col: foundCol, index }
  }, [])

  // 전역 포인터 리스너 — 드래그 중에만 부착, 언마운트/종료 시 해제
  useEffect(() => {
    if (!drag) return

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const movedEnough = Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD || Math.abs(e.clientY - d.startY) > DRAG_THRESHOLD
      const drop = computeDrop(e.clientX, e.clientY, d.cardId)
      setDrag((cur) => cur ? {
        ...cur,
        x: e.clientX - cur.offX,
        y: e.clientY - cur.offY,
        started: cur.started || movedEnough,
        overCol: drop ? drop.col : cur.overCol,
        overIndex: drop ? drop.index : cur.overIndex,
      } : cur)
    }

    const finish = (commit: boolean) => {
      const d = dragRef.current
      setDrag(null)
      if (!d || !commit || !d.started || !d.overCol) return
      setBoard((prev) => {
        const from = colOf(prev, d.cardId)
        if (!from) return prev
        const order: Record<ColKey, string[]> = { idea: [...prev.order.idea], draft: [...prev.order.draft], revise: [...prev.order.revise], done: [...prev.order.done] }
        const to = d.overCol!
        // d.overIndex 는 '보이는(필터 통과) 카드' 기준 삽입 위치.
        // 필터가 켜져 있어도 정확히 끼워 넣도록 전체 order 기준 위치로 환산한다.
        const destVisible = order[to].filter((id) => id !== d.cardId && (() => { const c = prev.cards[id]; return !!c && matches(c) })())
        let fullIdx: number
        if (d.overIndex >= destVisible.length) {
          // 마지막 보이는 카드 뒤(=컬럼 맨 끝)
          fullIdx = order[to].length
        } else {
          const anchorId = destVisible[Math.max(0, d.overIndex)]
          const at = order[to].indexOf(anchorId)
          fullIdx = at < 0 ? order[to].length : at
        }
        // 원위치 제거(제거로 인덱스가 당겨질 수 있으므로 보정)
        const removedAt = order[from].indexOf(d.cardId)
        order[from] = order[from].filter((x) => x !== d.cardId)
        if (from === to && removedAt > -1 && removedAt < fullIdx) fullIdx -= 1
        if (fullIdx < 0) fullIdx = 0
        if (fullIdx > order[to].length) fullIdx = order[to].length
        order[to].splice(fullIdx, 0, d.cardId)
        // 단계가 바뀌면 갱신시각 업데이트
        const cards = from !== to
          ? { ...prev.cards, [d.cardId]: { ...prev.cards[d.cardId], updatedAt: Date.now() } }
          : prev.cards
        return { cards, order }
      })
    }

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (d && e.pointerId !== d.pointerId) return
      finish(true)
    }
    const onCancel = () => finish(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(false) }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey)
    const prevSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
      document.body.style.userSelect = prevSelect
    }
  }, [drag ? drag.cardId : null, computeDrop, matches])

  const totalCards = Object.keys(board.cards).length
  const filterActive = !!q || prioFilter !== 'all'

  // ── 내보내기/복사 ─────────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = ['# 집필 칸반 보드', '']
    COLUMNS.forEach((col) => {
      const ids = board.order[col.key]
      lines.push(`## ${col.icon} ${col.label} (${ids.length})`)
      if (!ids.length) { lines.push('  (비어 있음)') }
      ids.forEach((id) => {
        const c = board.cards[id]
        if (!c) return
        const pm = prioMeta(c.priority)
        const tagStr = c.tags.length ? ` [${c.tags.join(', ')}]` : ''
        lines.push(`- (${pm.label}) ${c.title}${tagStr}`)
        if (c.body) c.body.split('\n').forEach((ln) => lines.push(`    ${ln}`))
      })
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [board])

  const copyAll = useCallback(() => {
    const text = buildText()
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {
      if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.')
    })
  }, [buildText])

  const exportFile = useCallback(() => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kanban-board.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    }
  }, [buildText])

  // ── 프로젝트 연동: 컬럼/카드 목록을 자료('보드' 폴더)에 HTML 문서로 추가 ──
  // 보드 전체(컬럼별 카드)를 컬럼 제목 + 카드 목록(<ul>/<li>) HTML 로 직렬화.
  const buildBoardHtml = useCallback((): string => {
    const parts: string[] = []
    COLUMNS.forEach((col) => {
      const ids = board.order[col.key]
      parts.push(`<h2>${escHtml(col.icon + ' ' + col.label)} (${ids.length})</h2>`)
      if (!ids.length) {
        parts.push('<p><em>(비어 있음)</em></p>')
        return
      }
      const lis: string[] = []
      ids.forEach((id) => {
        const c = board.cards[id]
        if (!c) return
        const pm = prioMeta(c.priority)
        let li = `<strong>${escHtml(c.title)}</strong> <em>(${escHtml(pm.label)})</em>`
        if (c.tags.length) li += ' ' + escHtml(c.tags.map((t) => '#' + t).join(' '))
        if (c.body) li += '<br>' + escHtml(c.body).replace(/\n/g, '<br>')
        lis.push('<li>' + li + '</li>')
      })
      parts.push('<ul>' + lis.join('') + '</ul>')
    })
    return parts.join('')
  }, [board])

  const addBoardToProject = useCallback(() => {
    if (totalCards === 0) { setNote('프로젝트에 추가할 카드가 없어요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const counts = COLUMNS.map((col) => `${col.label} ${board.order[col.key].length}`).join(', ')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '보드',
      title: '집필 칸반 보드',
      bodyHtml: buildBoardHtml(),
      meta: { 카드수: String(totalCards), 컬럼별: counts },
    })
    setNote(id ? '프로젝트 자료 "보드" 폴더에 칸반 보드 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [board, totalCards, buildBoardHtml])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const search: React.CSSProperties = { flex: '1 1 140px', minWidth: 100, padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const boardWrap: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: 12, overflowX: 'auto', overflowY: 'hidden', alignItems: 'stretch' }
  const colWrap: React.CSSProperties = { flex: '1 1 0', minWidth: 168, display: 'flex', flexDirection: 'column', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const hintBar: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }

  return (
    <div
      style={{ ...wrap, position: 'relative', outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }}
      ref={boardElRef}
      onDragOver={onToolDragOver}
      onDragEnter={onToolDragEnter}
      onDragLeave={onToolDragLeave}
      onDrop={onToolDrop}
    >
      {/* 바인더 파일 드롭 안내 (드래그 진입 시) */}
      {dropActive && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9998, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--panel)', border: '1.5px dashed var(--accent)', borderRadius: 12, padding: '10px 16px', boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}>
            ↘ 여기에 놓으면 아이디어 카드로 추가됩니다
          </div>
        </div>
      )}
      {/* 드롭 성공 토스트 */}
      {dropToast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 10001, pointerEvents: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 999, padding: '7px 14px', boxShadow: '0 6px 20px rgba(0,0,0,0.22)' }}>
          ✓ {dropToast}
        </div>
      )}
      {/* 툴바 */}
      <div style={toolbar}>
        <input
          style={search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 제목·메모·태그 검색…"
          aria-label="카드 검색"
        />
        <select
          value={prioFilter}
          onChange={(e) => setPrioFilter(e.target.value as Priority | 'all')}
          style={{ padding: '7px 8px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
          aria-label="우선순위 필터"
        >
          <option value="all">전체 우선순위</option>
          {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}만</option>)}
        </select>
        {filterActive && (
          <button className="minibtn" onClick={() => { setQuery(''); setPrioFilter('all') }} title="필터 해제">필터 해제</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyAll} title="보드를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 보드 */}
      <div style={boardWrap}>
        {COLUMNS.map((col) => {
          const ids = board.order[col.key]
          const visibleIds = ids.filter((id) => { const c = board.cards[id]; return c && matches(c) })
          const isDropTarget = drag?.started && drag.overCol === col.key
          return (
            <div key={col.key} style={{ ...colWrap, outline: isDropTarget ? `2px solid ${col.accent}` : 'none', outlineOffset: -1 }}>
              {/* 컬럼 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}><Emoji e={col.icon} /> {col.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px', fontWeight: 600 }}>
                  {filterActive ? `${visibleIds.length}/${ids.length}` : ids.length}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  className="minibtn"
                  style={{ padding: '2px 7px', fontSize: 13 }}
                  onClick={() => setEditing({ id: 'new', col: col.key })}
                  title={`${col.label}에 카드 추가`}
                  aria-label={`${col.label}에 카드 추가`}
                >+</button>
              </div>

              {/* 컬럼 본문 (스크롤) */}
              <div
                ref={(el) => { colBodyRefs.current[col.key] = el }}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {visibleIds.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 10, minHeight: 80, whiteSpace: 'pre-line' }}>
                    {ids.length === 0
                      ? (col.key === 'idea' ? '여기에 떠오른 글감을\n적어 보세요. + 를 누르세요.' : '아직 카드가 없어요.\n다른 단계에서 끌어오거나\n+ 로 추가하세요.')
                      : '검색/필터에 맞는\n카드가 없어요.'}
                  </div>
                ) : visibleIds.map((id) => {
                  const c = board.cards[id]
                  if (!c) return null
                  const pm = prioMeta(c.priority)
                  const realIndex = ids.indexOf(id)
                  const stageIdx = COL_KEYS.indexOf(col.key)
                  const isDragging = drag?.cardId === id && drag.started
                  // 드롭 위치 표시선
                  const showLineBefore = drag?.started && drag.overCol === col.key && drag.overIndex === visibleIds.indexOf(id) && drag.cardId !== id
                  return (
                    <div key={id}>
                      {showLineBefore && <div style={{ height: 3, borderRadius: 2, background: col.accent, margin: '0 2px 6px' }} />}
                      <div
                        data-card-id={id}
                        onPointerDown={(e) => onCardPointerDown(e, id, col.key)}
                        onDoubleClick={() => setEditing({ id, col: col.key })}
                        style={{
                          background: 'var(--paper)',
                          border: `1px solid ${pm.key === 'high' ? 'color-mix(in srgb, var(--warn) 45%, var(--border))' : 'var(--border)'}`,
                          borderLeft: `3px solid ${col.accent}`,
                          borderRadius: 10,
                          padding: '8px 9px',
                          cursor: 'grab',
                          opacity: isDragging ? 0.35 : 1,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          touchAction: 'none',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span title={`우선순위: ${pm.label}`} style={{ fontSize: 10, lineHeight: '16px', flexShrink: 0 }}><Emoji e={pm.dot} /></span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>{c.title}</div>
                        </div>
                        {c.body && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4, maxHeight: 54, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {c.body}
                          </div>
                        )}
                        {c.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {c.tags.map((t, i) => (
                              <span key={i} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>#{t}</span>
                            ))}
                          </div>
                        )}
                        {/* 카드 액션 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 7, flexWrap: 'wrap' }}>
                          <button className="minibtn" style={mini} title="이전 단계로" disabled={stageIdx === 0} onClick={() => moveStage(id, -1)}>◀</button>
                          <button className="minibtn" style={mini} title="다음 단계로" disabled={stageIdx === COL_KEYS.length - 1} onClick={() => moveStage(id, 1)}>▶</button>
                          <button className="minibtn" style={mini} title="위로" disabled={realIndex === 0} onClick={() => nudge(id, -1)}>▲</button>
                          <button className="minibtn" style={mini} title="아래로" disabled={realIndex === ids.length - 1} onClick={() => nudge(id, 1)}>▼</button>
                          <div style={{ flex: 1 }} />
                          <button className="minibtn" style={mini} title="편집" onClick={() => setEditing({ id, col: col.key })}><Emoji e="✏️" /></button>
                          <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(id)}><Emoji e="🗑️" /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* 맨 끝 드롭선 */}
                {drag?.started && drag.overCol === col.key && drag.overIndex >= visibleIds.length && (
                  <div style={{ height: 3, borderRadius: 2, background: col.accent, margin: '0 2px' }} />
                )}
              </div>

              {/* 컬럼 푸터 */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '5px 8px', display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="minibtn" style={{ flex: 1, padding: '4px', fontSize: 11.5 }} onClick={() => setEditing({ id: 'new', col: col.key })}>+ 카드</button>
                {ids.length > 0 && (
                  <button className="minibtn" style={{ padding: '4px 8px', fontSize: 11.5, color: 'var(--muted)' }} onClick={() => clearColumn(col.key)} title={`${col.label} 비우기 (전부 삭제)`}>비우기</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 연계: 프로젝트 연동 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addBoardToProject}
          disabled={totalCards === 0 || !hasProjectBridge()}
          title={hasProjectBridge() ? '칸반 보드(컬럼/카드 목록)를 프로젝트 자료 "보드" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {/* 하단 안내/통계 */}
      <div style={hintBar}>
        <span>카드를 끌어 컬럼 사이로 옮기세요. 더블클릭으로 편집, ◀▶로 단계 이동.</span>
        <span style={{ flexShrink: 0 }}>전체 <strong style={{ color: 'var(--text)' }}>{totalCards}</strong>장</span>
      </div>

      {/* 떠다니는 드래그 미리보기 */}
      {drag?.started && (() => {
        const c = board.cards[drag.cardId]
        if (!c) return null
        const pm = prioMeta(c.priority)
        const acc = COLUMNS.find((co) => co.key === (drag.overCol || drag.fromCol))?.accent || 'var(--accent)'
        return (
          <div style={{
            position: 'fixed', left: drag.x, top: drag.y, width: drag.w,
            zIndex: 9999, pointerEvents: 'none',
            background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${acc}`,
            borderRadius: 10, padding: '8px 9px', boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
            transform: 'rotate(2deg)', opacity: 0.96,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, lineHeight: '16px' }}><Emoji e={pm.dot} /></span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{c.title}</div>
            </div>
          </div>
        )
      })()}

      {/* 편집/추가 모달 */}
      {editing && (
        <CardEditor
          board={board}
          editing={editing}
          onCancel={() => setEditing(null)}
          onSave={upsertCard}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && board.cards[confirmDel] && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>카드 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{board.cards[confirmDel].title}」 카드를 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => deleteCard(confirmDel)}>삭제</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

const mini: React.CSSProperties = { padding: '2px 6px', fontSize: 11, lineHeight: 1.1, minWidth: 0 }

// ── 모달 오버레이 ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
    >
      {children}
    </div>
  )
}

const modalCard: React.CSSProperties = {
  width: '100%', maxWidth: 360, background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', boxSizing: 'border-box',
}

// ── 카드 편집기 ───────────────────────────────────────────────────────────────
function CardEditor({
  board, editing, onCancel, onSave,
}: {
  board: BoardState
  editing: { id: string | 'new'; col: ColKey }
  onCancel: () => void
  onSave: (d: { id: string | 'new'; col: ColKey; title: string; body: string; tags: string[]; priority: Priority }) => void
}) {
  const existing = editing.id !== 'new' ? board.cards[editing.id] : undefined
  const [title, setTitle] = useState(existing?.title || '')
  const [body, setBody] = useState(existing?.body || '')
  const [tagInput, setTagInput] = useState((existing?.tags || []).join(', '))
  const [priority, setPriority] = useState<Priority>(existing?.priority || 'mid')
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const parseTags = (s: string): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    s.split(/[,\n]/).map((t) => t.trim().replace(/^#/, '')).forEach((t) => {
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t) }
    })
    return out.slice(0, 12)
  }

  const submit = () => {
    onSave({ id: editing.id, col: editing.col, title, body, tags: parseTags(tagInput), priority })
  }

  const colMeta = COLUMNS.find((c) => c.key === editing.col)
  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 420 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
          {editing.id === 'new' ? '새 카드' : '카드 편집'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 14 }}>
          {colMeta?.icon && <Emoji e={colMeta.icon} />} {colMeta?.label} 단계
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>제목 *</label>
          <input
            ref={titleRef}
            style={inputBase}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="예: 1장 도입부 쓰기"
            maxLength={120}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>메모</label>
          <textarea
            style={{ ...inputBase, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="장면 메모, 해야 할 일, 참고 사항…"
            maxLength={2000}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={label}>태그 (쉼표로 구분)</label>
            <input
              style={inputBase}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="1장, 미스터리"
            />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={label}>우선순위</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  className="minibtn"
                  onClick={() => setPriority(p.key)}
                  aria-pressed={priority === p.key}
                  style={{
                    flex: 1, padding: '8px 4px', fontSize: 11.5,
                    borderColor: priority === p.key ? 'var(--accent)' : 'var(--border)',
                    background: priority === p.key ? 'color-mix(in srgb, var(--accent) 16%, var(--paper))' : 'var(--paper)',
                    fontWeight: priority === p.key ? 700 : 400,
                  }}
                ><Emoji e={p.dot} /> {p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {editing.id === 'new' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
