// 장면 블로킹 샌드박스 — 무대 평면도(빈 캔버스) 위에 인물 토큰·소품을 드래그 배치해
// 동선/구도/블로킹을 구상하는 도구. 인물 토큰은 공유 라이브러리·바인더 드래그·payload 와 연동된다.
// 여러 장면을 보드 탭으로 관리하고, 각 토큰의 위치를 무대 용어(상수/하수·앞/뒤)로 풀어 배치 메모를
// addToProject 로 프로젝트 바인더에 추가한다. 외부 네트워크 불필요(저작권 안전·전부 로컬).
// import 는 react 와 './linkbus' 만 사용. localStorage 차단/포인터 미지원 등은 graceful 처리.
import { useState, useEffect, useRef } from 'react'
import {
  useLibraryList, openToolLinked, addToProject, hasProjectBridge,
  addToStash, hasStash, getDragItem, isItemDrag,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'scene-sandbox', name: '장면 블로킹 샌드박스', icon: '🎬', group: '구상·정리', intro: '무대 평면도에 인물·소품 토큰을 드래그 배치해 동선과 구도를 구상하세요', w: 880, h: 660 }

const LS_KEY = 'sry:tool:scene-sandbox'

// ── 타입 ─────────────────────────────────────────────────────
type TokenKind = 'char' | 'prop'
interface Token {
  id: string
  kind: TokenKind
  label: string
  icon: string        // prop 토큰의 이모지(char 은 표시 안 함)
  x: number           // 0~1 비율(캔버스 폭 대비) — 캔버스 크기 변화에 안전
  y: number           // 0~1 비율(캔버스 높이 대비)
  facing: number      // 인물 시선 방향(도). 0=위(무대 뒤), 90=오른쪽(하수)
  size: number        // 토큰 지름(px)
  color: string
}
interface Board { id: string; name: string; tokens: Token[]; note: string }
interface Store { boards: Board[]; activeId: string }

// ── 색/소품 팔레트 ───────────────────────────────────────────
const COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8a5cd6', '#d2473b', '#2bb6c0', '#7a8493', '#c9772b', '#5566cc']
// 소품 팔레트 — 이모지(저작권 무관)와 라벨. 무대 위 자주 쓰이는 소품들.
const PROPS: { icon: string; label: string }[] = [
  { icon: '🪑', label: '의자' }, { icon: '🛋️', label: '소파' }, { icon: '🛏️', label: '침대' },
  { icon: '🚪', label: '문' }, { icon: '🪟', label: '창문' }, { icon: '🪜', label: '계단' },
  { icon: '🌳', label: '나무' }, { icon: '🔥', label: '불/난로' }, { icon: '💡', label: '조명' },
  { icon: '🍽️', label: '식탁' }, { icon: '📦', label: '상자' }, { icon: '🚗', label: '차' },
  { icon: '🪨', label: '바위' }, { icon: '⛲', label: '분수' }, { icon: '🛁', label: '욕조' },
  { icon: '📺', label: 'TV' }, { icon: '🎹', label: '피아노' }, { icon: '🚽', label: '변기' },
  { icon: '🧱', label: '벽' }, { icon: '🕯️', label: '촛대' },
]

// ── 유틸 ─────────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)) }
function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function initials(name: string): string {
  const t = (name || '').trim()
  if (!t) return '?'
  // 한글: 앞 2글자 / 영문 단어: 각 단어 첫 글자
  if (/[A-Za-z]/.test(t) && /\s/.test(t)) {
    return t.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  }
  return t.slice(0, 2)
}

function newBoard(name: string): Board {
  return { id: newId(), name, tokens: [], note: '' }
}
function defaultStore(): Store {
  const b = newBoard('장면 1')
  return { boards: [b], activeId: b.id }
}

// localStorage 복원 — 손상/미지원 시 기본값.
function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultStore()
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.boards) || !p.boards.length) return defaultStore()
    const boards: Board[] = p.boards.map((b: any, bi: number): Board => ({
      id: String(b?.id || newId()),
      name: String(b?.name || `장면 ${bi + 1}`).slice(0, 40),
      note: String(b?.note || '').slice(0, 1000),
      tokens: Array.isArray(b?.tokens) ? b.tokens.filter((t: any) => t && typeof t === 'object').map((t: any): Token => ({
        id: String(t.id || newId()),
        kind: t.kind === 'prop' ? 'prop' : 'char',
        label: String(t.label || '').slice(0, 40),
        icon: String(t.icon || '📦').slice(0, 4),
        x: clamp01(Number(t.x)),
        y: clamp01(Number(t.y)),
        facing: Number.isFinite(t.facing) ? ((Number(t.facing) % 360) + 360) % 360 : 180,
        size: Math.max(28, Math.min(120, Number(t.size) || 52)),
        color: typeof t.color === 'string' ? t.color : COLORS[0],
      })) : [],
    }))
    const activeId = boards.some((b) => b.id === p.activeId) ? String(p.activeId) : boards[0].id
    return { boards, activeId }
  } catch { return defaultStore() }
}

// 위치(0~1) → 무대 용어. 가로: 하수(객석 기준 오른쪽=무대 왼쪽 끝)·중앙·상수, 세로: 무대 앞·중간·뒤.
function stagePosWords(x: number, y: number): string {
  const h = x < 0.34 ? '하수(무대 왼쪽)' : x > 0.66 ? '상수(무대 오른쪽)' : '중앙'
  const v = y < 0.34 ? '무대 뒤' : y > 0.66 ? '무대 앞' : '중간'
  if (h.startsWith('중앙') && v === '중간') return '무대 정중앙'
  return `${v} · ${h}`
}
const FACING_WORDS: { deg: number; w: string }[] = [
  { deg: 0, w: '무대 뒤쪽' }, { deg: 45, w: '뒤-상수' }, { deg: 90, w: '상수(오른쪽)' }, { deg: 135, w: '앞-상수' },
  { deg: 180, w: '객석(앞)' }, { deg: 225, w: '앞-하수' }, { deg: 270, w: '하수(왼쪽)' }, { deg: 315, w: '뒤-하수' },
]
function facingWords(deg: number): string {
  const d = ((deg % 360) + 360) % 360
  let best = FACING_WORDS[0], bd = 999
  for (const f of FACING_WORDS) {
    const diff = Math.min(Math.abs(d - f.deg), 360 - Math.abs(d - f.deg))
    if (diff < bd) { bd = diff; best = f }
  }
  return best.w
}

// 공유 인물 → 토큰 메모/색 보조용 한 줄 요약
function summarizeChar(c: Partial<SharedCharacter>): string {
  const parts: string[] = []
  if (c.role && c.role.trim()) parts.push(c.role.trim())
  if (c.personality && c.personality.trim()) parts.push(c.personality.trim())
  else if (c.goal && c.goal.trim()) parts.push('목표: ' + c.goal.trim())
  return parts.join(' · ').slice(0, 120)
}

interface Props { payload?: Record<string, unknown> }

export default function SceneSandbox({ payload }: Props) {
  const initial = useRef<Store>(loadStore())
  const [boards, setBoards] = useState<Board[]>(initial.current.boards)
  const [activeId, setActiveId] = useState<string>(initial.current.activeId)
  const [selId, setSelId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showGrid, setShowGrid] = useState(true)
  const [draftChar, setDraftChar] = useState('')
  const [draftProp, setDraftProp] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [propPickerOpen, setPropPickerOpen] = useState(false)
  const [dropActive, setDropActive] = useState(false)

  const libChars = useLibraryList('characters')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const mounted = useRef(true)
  const dragDepth = useRef(0)
  const drag = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null)
  const colorRotate = useRef(0)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  // 언마운트 시 잔여 드래그 상태 정리
  useEffect(() => () => { drag.current = null }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ boards, activeId } as Store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.') }
  }, [boards, activeId])

  // 안내 메시지 자동 소거
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => { if (mounted.current) setNote('') }, 2600)
    return () => window.clearTimeout(t)
  }, [note])

  const board = boards.find((b) => b.id === activeId) || boards[0]
  const tokens = board?.tokens || []
  const sel = tokens.find((t) => t.id === selId) || null

  // ── 보드(토큰 목록) 갱신 헬퍼 ──────────────────────────────
  const patchBoard = (fn: (b: Board) => Board) => {
    setBoards((prev) => prev.map((b) => (b.id === activeId ? fn(b) : b)))
  }
  const setTokens = (fn: (t: Token[]) => Token[]) => {
    patchBoard((b) => ({ ...b, tokens: fn(b.tokens) }))
  }

  // ── 토큰 추가 공용 ─────────────────────────────────────────
  // 새 토큰은 캔버스 약간 어긋난 위치에 겹치지 않게 배치한다.
  const nextSpot = (count: number): { x: number; y: number } => {
    const i = count
    return { x: clamp01(0.25 + (i % 4) * 0.16 + (Math.random() - 0.5) * 0.04), y: clamp01(0.4 + Math.floor(i / 4) * 0.14 + (Math.random() - 0.5) * 0.04) }
  }
  const addChar = (rawName: string, opts?: { force?: boolean }): string | null => {
    const name = rawName.trim().slice(0, 40)
    if (!name) return null
    let createdId: string | null = null
    let skipped = false
    setTokens((prev) => {
      if (!opts?.force && prev.some((t) => t.kind === 'char' && t.label.trim() === name)) { skipped = true; return prev }
      const spot = nextSpot(prev.length)
      const color = COLORS[colorRotate.current % COLORS.length]
      colorRotate.current++
      const t: Token = { id: newId(), kind: 'char', label: name, icon: '🧍', x: spot.x, y: spot.y, facing: 180, size: 52, color }
      createdId = t.id
      return [...prev, t]
    })
    if (skipped && mounted.current) setNote(`‘${name}’ 인물 토큰은 이미 있어요.`)
    return createdId
  }
  const addProp = (icon: string, label: string): string | null => {
    let createdId: string | null = null
    setTokens((prev) => {
      const spot = nextSpot(prev.length)
      const t: Token = { id: newId(), kind: 'prop', label: label.slice(0, 40), icon: (icon || '📦').slice(0, 4), x: spot.x, y: spot.y, facing: 0, size: 46, color: '#8a7355' }
      createdId = t.id
      return [...prev, t]
    })
    return createdId
  }

  // ── payload.character 연동 ────────────────────────────────
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
      if (nm.trim() && addChar(nm)) added++
    }
    if (added > 0 && mounted.current) setNote(`인물 ${added}명을 토큰으로 배치했어요.`)
  }, [payload]) // eslint-disable-line

  // ── 공유 라이브러리 인물 전부 토큰으로 ────────────────────
  const importLibrary = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    const existing = new Set(tokens.filter((t) => t.kind === 'char').map((t) => t.label.trim()))
    let added = 0
    for (const c of libChars) {
      const nm = (c.name || '').trim()
      if (!nm || existing.has(nm)) continue
      existing.add(nm)
      if (addChar(nm)) added++
    }
    setNote(added > 0 ? `라이브러리 인물 ${added}명을 토큰으로 배치했어요.` : '라이브러리 인물이 이미 모두 배치돼 있어요.')
  }

  // ── 바인더 파일 드롭 → 인물 토큰 ──────────────────────────
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const ch = it.character
    const name = (ch?.name || it.title || '').trim()
    if (!name) { setNote('드롭한 파일에서 이름을 찾지 못했어요.'); return }
    const id = addChar(name)
    if (id) { setSelId(id); setNote(`‘${name}’ 토큰을 배치했어요.`) }
  }

  // ── 캔버스 좌표 → 0~1 비율 ────────────────────────────────
  const toRatio = (clientX: number, clientY: number): { x: number; y: number } => {
    const el = stageRef.current
    if (!el) return { x: 0.5, y: 0.5 }
    const r = el.getBoundingClientRect()
    return { x: clamp01((clientX - r.left) / Math.max(1, r.width)), y: clamp01((clientY - r.top) / Math.max(1, r.height)) }
  }

  // ── 토큰 드래그(포인터) — window 리스너는 종료 시 반드시 해제 ──
  const onTokenPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    if (e.button !== undefined && e.button !== 0) return
    const t = tokens.find((x) => x.id === id)
    if (!t) return
    const p = toRatio(e.clientX, e.clientY)
    drag.current = { id, offX: p.x - t.x, offY: p.y - t.y, moved: false }
    setSelId(id)

    const move = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const rp = toRatio(ev.clientX, ev.clientY)
      d.moved = true
      setTokens((prev) => prev.map((tk) => (tk.id === d.id ? { ...tk, x: clamp01(rp.x - d.offX), y: clamp01(rp.y - d.offY) } : tk)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // ── 토큰 편집 ──────────────────────────────────────────────
  const updateSel = (patch: Partial<Token>) => {
    if (!selId) return
    setTokens((prev) => prev.map((t) => (t.id === selId ? { ...t, ...patch } : t)))
  }
  const removeToken = (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id))
    if (selId === id) setSelId(null)
  }
  const duplicateSel = () => {
    if (!sel) return
    let nid: string | null = null
    setTokens((prev) => {
      const copy: Token = { ...sel, id: newId(), x: clamp01(sel.x + 0.05), y: clamp01(sel.y + 0.05), label: sel.label }
      nid = copy.id
      return [...prev, copy]
    })
    if (nid) setSelId(nid)
  }

  // ── 보드(장면) 관리 ────────────────────────────────────────
  const addBoard = () => {
    const b = newBoard(`장면 ${boards.length + 1}`)
    setBoards((prev) => [...prev, b])
    setActiveId(b.id)
    setSelId(null)
  }
  const removeBoard = (id: string) => {
    if (boards.length <= 1) { setNote('마지막 장면은 삭제할 수 없어요.'); return }
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('이 장면 보드를 삭제할까요? 배치가 사라집니다.')) return
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id)
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
    setSelId(null)
  }
  const startRename = () => { if (board) { setRenameVal(board.name); setRenaming(true) } }
  const commitRename = () => {
    const nm = renameVal.trim().slice(0, 40)
    if (nm) patchBoard((b) => ({ ...b, name: nm }))
    setRenaming(false)
  }
  const clearBoard = () => {
    if (!tokens.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('이 장면의 토큰을 모두 지울까요?')) return
    patchBoard((b) => ({ ...b, tokens: [] }))
    setSelId(null)
  }

  // ── 텍스트/HTML 내보내기 ──────────────────────────────────
  // 토큰을 무대 앞(y 큰 순)부터, 같은 줄은 하수→상수(x) 순으로 정렬해 읽기 좋게.
  const sortedTokens = (list: Token[]): Token[] =>
    [...list].sort((a, b) => (b.y - a.y) || (a.x - b.x))

  const buildText = (b: Board): string => {
    const lines: string[] = []
    lines.push(`[장면 블로킹] ${b.name}`)
    lines.push('')
    const chars = sortedTokens(b.tokens.filter((t) => t.kind === 'char'))
    const props = sortedTokens(b.tokens.filter((t) => t.kind === 'prop'))
    lines.push(`인물 ${chars.length}명`)
    if (!chars.length) lines.push('  (없음)')
    chars.forEach((t) => lines.push(`  • ${t.label || '인물'} — ${stagePosWords(t.x, t.y)}, 시선 ${facingWords(t.facing)}`))
    lines.push('')
    lines.push(`소품 ${props.length}개`)
    if (!props.length) lines.push('  (없음)')
    props.forEach((t) => lines.push(`  • ${t.icon} ${t.label || '소품'} — ${stagePosWords(t.x, t.y)}`))
    if (b.note.trim()) { lines.push(''); lines.push('연출 메모:'); lines.push(b.note.trim()) }
    return lines.join('\n')
  }
  const buildHtml = (b: Board): string => {
    const chars = sortedTokens(b.tokens.filter((t) => t.kind === 'char'))
    const props = sortedTokens(b.tokens.filter((t) => t.kind === 'prop'))
    const parts: string[] = []
    parts.push(`<p><strong>장면 블로킹 · ${esc(b.name)}</strong> — 인물 ${chars.length}명 · 소품 ${props.length}개</p>`)
    parts.push('<p><strong>인물 배치·동선</strong></p>')
    if (!chars.length) parts.push('<p>(없음)</p>')
    else parts.push('<ul>' + chars.map((t) =>
      `<li><strong>${esc(t.label || '인물')}</strong> — ${esc(stagePosWords(t.x, t.y))}, 시선 ${esc(facingWords(t.facing))}</li>`
    ).join('') + '</ul>')
    parts.push('<p><strong>소품</strong></p>')
    if (!props.length) parts.push('<p>(없음)</p>')
    else parts.push('<ul>' + props.map((t) =>
      `<li>${esc(t.icon)} ${esc(t.label || '소품')} — ${esc(stagePosWords(t.x, t.y))}</li>`
    ).join('') + '</ul>')
    if (b.note.trim()) {
      parts.push('<p><strong>연출 메모</strong></p>')
      parts.push('<p>' + esc(b.note.trim()).replace(/\n/g, '<br>') + '</p>')
    }
    parts.push('<p style="color:#888;font-size:90%">※ 상수=무대 오른쪽, 하수=무대 왼쪽(객석 기준), 무대 앞=객석 쪽.</p>')
    return parts.join('\n')
  }

  const copyText = async () => {
    if (!board) return
    const txt = buildText(board)
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('배치 메모를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('배치 메모를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
    }
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!board || !tokens.length) { setNote('배치할 토큰이 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '장면',
      title: `블로킹 — ${board.name}`,
      bodyHtml: buildHtml(board),
      meta: {
        인물수: String(tokens.filter((t) => t.kind === 'char').length),
        소품수: String(tokens.filter((t) => t.kind === 'prop').length),
      },
    })
    setNote(id ? '프로젝트 자료 › 장면 폴더에 배치 메모를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }
  const toStash = () => {
    if (!hasStash() || !board) return
    addToStash({ kind: 'memo', label: `블로킹 · ${board.name}`, text: buildText(board) })
    setNote('수집함에 배치 메모를 담았어요.')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const side: React.CSSProperties = { width: 244, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.55 }
  const sInput: React.CSSProperties = { ...input, width: '100%' }

  return (
    <div style={wrap}>
      {/* ── 보드(장면) 탭 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 0', flexWrap: 'wrap', flexShrink: 0 }}>
        {boards.map((b) => (
          <div
            key={b.id}
            onClick={() => { if (b.id !== activeId) { setActiveId(b.id); setSelId(null); setRenaming(false) } }}
            className={'minibtn' + (b.id === activeId ? ' active' : '')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 180 }}
            title={b.name}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{b.tokens.length}</span>
            {boards.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); removeBoard(b.id) }} title="이 장면 삭제" style={{ fontSize: 11, cursor: 'pointer', opacity: 0.7, marginLeft: 2 }}>✕</span>
            )}
          </div>
        ))}
        <button className="minibtn" onClick={addBoard} title="새 장면 보드 추가" style={{ fontWeight: 700 }}>＋ 장면</button>
      </div>

      {/* ── 상단 도구막대 ── */}
      <div style={topbar}>
        <input
          style={{ ...input, flex: 1, minWidth: 110 }}
          value={draftChar}
          onChange={(e) => setDraftChar(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draftChar.trim()) { const id = addChar(draftChar); if (id) setSelId(id); setDraftChar('') } }}
          placeholder="인물 이름 + Enter…"
          maxLength={40}
          aria-label="인물 이름"
        />
        <button className="btn-primary" onClick={() => { const id = addChar(draftChar); if (id) setSelId(id); setDraftChar('') }} disabled={!draftChar.trim()}><Emoji e="🧍"/> 인물</button>
        <button className="minibtn" onClick={() => setPropPickerOpen((v) => !v)} title="소품 팔레트 열기"><Emoji e="🪑"/> 소품 ▾</button>
        <button className="minibtn" onClick={importLibrary} disabled={!libChars.length} title={libChars.length ? `공유 라이브러리 인물 ${libChars.length}명을 토큰으로` : '공유 라이브러리에 인물이 없습니다'}><Emoji e="📥"/> 라이브러리{libChars.length ? `(${libChars.length})` : ''}</button>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }} title="격자 표시 토글">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> 격자
        </label>
        <button className="minibtn" onClick={copyText} disabled={!tokens.length} title="배치 메모를 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        <button className="linkbtn" onClick={toProject} disabled={!tokens.length || !hasProjectBridge()} title={hasProjectBridge() ? '배치 메모를 프로젝트(자료 › 장면)에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트</button>
      </div>

      {/* 소품 팔레트(접이식) */}
      {propPickerOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 10px', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {PROPS.map((p) => (
            <button key={p.label} className="minibtn" onClick={() => { const id = addProp(p.icon, p.label); if (id) setSelId(id) }} title={`소품 추가: ${p.label}`} style={{ fontSize: 13 }}><Emoji e={p.icon}/> {p.label}</button>
          ))}
          <span style={{ width: '100%', height: 0 }} />
          <input
            style={{ ...input, flex: 1, minWidth: 120, padding: '4px 8px' }}
            value={draftProp}
            onChange={(e) => setDraftProp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && draftProp.trim()) { const id = addProp('📦', draftProp); if (id) setSelId(id); setDraftProp('') } }}
            placeholder="직접 입력 소품 + Enter (📦 표시)"
            maxLength={40}
            aria-label="직접 입력 소품"
          />
        </div>
      )}

      {note && <div style={{ padding: '5px 10px', fontSize: 12, color: 'var(--accent)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>{note}</div>}

      <div style={body}>
        {/* ── 무대 캔버스 ── */}
        <div style={{ flex: 1, minWidth: 0, padding: 14, display: 'flex', overflow: 'auto', background: 'var(--paper)' }}>
          <div
            ref={stageRef}
            onClick={() => setSelId(null)}
            onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
            onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
            onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) } }}
            onDrop={onDropItem}
            style={{
              position: 'relative', flex: 1, minWidth: 420, minHeight: 320, alignSelf: 'stretch',
              borderRadius: 12, background: 'var(--chrome-2)',
              border: dropActive ? '2px dashed var(--accent)' : '1px solid var(--border)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)', overflow: 'hidden', touchAction: 'none', userSelect: 'none',
              backgroundImage: showGrid
                ? 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)'
                : undefined,
              backgroundSize: showGrid ? '8.333% 8.333%' : undefined,
            }}
          >
            {/* 무대 방향 라벨 */}
            <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', fontWeight: 700, opacity: 0.8 }}>무대 뒤 ↑</div>
            <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', fontWeight: 700, opacity: 0.8 }}>↓ 객석(무대 앞)</div>
            <div style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%) rotate(180deg)', writingMode: 'vertical-rl', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', fontWeight: 700, opacity: 0.8 }}>하수(L)</div>
            <div style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', writingMode: 'vertical-rl', fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', fontWeight: 700, opacity: 0.8 }}>상수(R)</div>
            {/* 중심 십자선 */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--accent)', opacity: 0.18, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--accent)', opacity: 0.18, pointerEvents: 'none' }} />

            {/* 빈 안내 */}
            {!tokens.length && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, padding: 24, pointerEvents: 'none' }}>
                빈 무대입니다.<br />
                위에서 <b style={{ color: 'var(--text)' }}><Emoji e="🧍"/> 인물</b>·<b style={{ color: 'var(--text)' }}><Emoji e="🪑"/> 소품</b>을 추가하거나,<br />
                좌측 바인더의 인물 파일을 여기로 드래그하세요.<br />
                토큰을 끌어 배치하고 시선·크기를 조절해 동선과 구도를 구상해 보세요.
              </div>
            )}

            {/* 토큰들 */}
            {tokens.map((t) => {
              const isSel = t.id === selId
              const s = t.size
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onTokenPointerDown(e, t.id)}
                  onClick={(e) => { e.stopPropagation(); setSelId(t.id) }}
                  title={`${t.label || (t.kind === 'char' ? '인물' : '소품')} — ${stagePosWords(t.x, t.y)}`}
                  style={{
                    position: 'absolute',
                    left: `${t.x * 100}%`, top: `${t.y * 100}%`,
                    width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2,
                    cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: t.kind === 'char' ? '50%' : 12,
                    background: t.kind === 'char' ? t.color : 'var(--panel)',
                    border: t.kind === 'char'
                      ? `3px solid ${isSel ? 'var(--accent)' : 'rgba(255,255,255,0.85)'}`
                      : `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: isSel ? '0 0 0 2px var(--accent), 0 3px 10px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.18)',
                    color: t.kind === 'char' ? '#fff' : 'var(--text)',
                    zIndex: isSel ? 5 : 2,
                  }}
                >
                  {/* 인물: 시선 방향 화살표(0=위) */}
                  {t.kind === 'char' && (
                    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transform: `translate(-50%,-50%) rotate(${t.facing}deg)`, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', left: -6, top: -(s / 2 + 9), width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `9px solid ${isSel ? 'var(--accent)' : t.color}` }} />
                    </div>
                  )}
                  <span style={{ pointerEvents: 'none', fontSize: t.kind === 'char' ? Math.max(11, s * 0.3) : Math.max(16, s * 0.5), fontWeight: 800, lineHeight: 1, textShadow: t.kind === 'char' ? '0 1px 2px rgba(0,0,0,0.3)' : undefined }}>
                    {t.kind === 'char' ? initials(t.label) : <Emoji e={t.icon}/>}
                  </span>
                  {/* 라벨(토큰 아래) */}
                  <span style={{ position: 'absolute', top: s + 2, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 10.5, fontWeight: 700, color: 'var(--text)', background: 'var(--paper)', padding: '0 4px', borderRadius: 4, pointerEvents: 'none', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.95 }}>
                    {t.label || (t.kind === 'char' ? '인물' : '소품')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 우측 인스펙터 ── */}
        <div style={side}>
          {/* 장면 정보 */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={sLabel}>장면</span>
              <span style={{ flex: 1 }} />
              {!renaming && <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={startRename} title="장면 이름 변경"><Emoji e="✏️"/></button>}
            </div>
            {renaming ? (
              <div style={{ display: 'flex', gap: 5 }}>
                <input autoFocus style={{ ...sInput, flex: 1 }} value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }} onBlur={commitRename} maxLength={40} aria-label="장면 이름" />
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board?.name}</div>
            )}
            <div style={hint}>인물 {tokens.filter((t) => t.kind === 'char').length} · 소품 {tokens.filter((t) => t.kind === 'prop').length}</div>
          </div>

          {/* 선택 토큰 편집 */}
          {sel ? (
            <div style={card}>
              <div style={sLabel}>{sel.kind === 'char' ? '인물 토큰' : '소품 토큰'} 편집</div>
              <input style={sInput} value={sel.label} onChange={(e) => updateSel({ label: e.target.value.slice(0, 40) })} placeholder={sel.kind === 'char' ? '인물 이름' : '소품 이름'} maxLength={40} aria-label="토큰 라벨" />

              {sel.kind === 'char' && (
                <>
                  <div style={sLabel}>색</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => updateSel({ color: c })} title={c} aria-label={`색 ${c}`}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0, border: sel.color === c ? '3px solid var(--accent)' : '2px solid var(--border)' }} />
                    ))}
                  </div>
                  <div style={sLabel}>시선 방향 · {facingWords(sel.facing)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="range" min={0} max={345} step={15} value={sel.facing} onChange={(e) => updateSel({ facing: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="시선 방향" />
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => updateSel({ facing: ((sel.facing - 45) + 360) % 360 })} title="시계 반대로" aria-label="시계 반대로">↺</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => updateSel({ facing: (sel.facing + 45) % 360 })} title="시계 방향" aria-label="시계 방향">↻</button>
                  </div>
                </>
              )}
              {sel.kind === 'prop' && (
                <>
                  <div style={sLabel}>아이콘</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {PROPS.slice(0, 14).map((p) => (
                      <button key={p.icon} className={'minibtn' + (sel.icon === p.icon ? ' active' : '')} style={{ padding: '2px 5px', fontSize: 14 }} onClick={() => updateSel({ icon: p.icon })} title={p.label}><Emoji e={p.icon}/></button>
                    ))}
                  </div>
                </>
              )}

              <div style={sLabel}>크기 · {sel.size}px</div>
              <input type="range" min={28} max={120} step={2} value={sel.size} onChange={(e) => updateSel({ size: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent)' }} aria-label="토큰 크기" />

              <div style={hint}>위치: <b style={{ color: 'var(--text)' }}>{stagePosWords(sel.x, sel.y)}</b></div>

              <div style={{ display: 'flex', gap: 5 }}>
                <button className="minibtn" style={{ flex: 1 }} onClick={duplicateSel} title="복제">⧉ 복제</button>
                <button className="minibtn" style={{ flex: 1, color: 'var(--warn)' }} onClick={() => removeToken(sel.id)} title="삭제"><Emoji e="🗑️"/> 삭제</button>
              </div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>
                토큰을 클릭하면 여기서 라벨·색·시선·크기를 바꾸고 복제·삭제할 수 있어요.<br />
                토큰을 드래그해 무대 위에 배치하세요. 상수=무대 오른쪽, 하수=무대 왼쪽(객석 기준).
              </div>
            </div>
          )}

          {/* 연출 메모 */}
          <div style={card}>
            <div style={sLabel}>연출 메모</div>
            <textarea
              style={{ ...sInput, resize: 'vertical', minHeight: 70, fontFamily: 'inherit', lineHeight: 1.5, fontSize: 12.5 }}
              value={board?.note || ''}
              onChange={(e) => patchBoard((b) => ({ ...b, note: e.target.value.slice(0, 1000) }))}
              placeholder="동선·구도·연출 의도를 자유롭게 적어두세요. 메모는 배치와 함께 내보냅니다."
              maxLength={1000}
              aria-label="연출 메모"
            />
          </div>

          {/* 동작 */}
          <div style={card}>
            <div style={sLabel}>내보내기·정리</div>
            <button className="linkbtn" onClick={toProject} disabled={!tokens.length || !hasProjectBridge()} title={hasProjectBridge() ? '배치 메모를 프로젝트 바인더(자료 › 장면)에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트에 추가</button>
            {hasStash() && <button className="linkbtn" onClick={toStash} disabled={!tokens.length} title="플로팅 수집함에 배치 메모 담기"><Emoji e="📌"/> 수집함에 담기</button>}
            <button className="minibtn" onClick={copyText} disabled={!tokens.length}><Emoji e="📋"/> 텍스트 복사</button>
            <button className="minibtn" onClick={clearBoard} disabled={!tokens.length} title="이 장면의 토큰 모두 삭제"><Emoji e="🗑️"/> 무대 비우기</button>
          </div>

          {/* 연계 도구 */}
          <div style={card}>
            <div style={sLabel}>연계 도구</div>
            <div className="linkbar">
              <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 도구 열기"><Emoji e="📋"/> 장면 목록</button>
              <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 열기"><Emoji e="🕸️"/> 관계도</button>
              <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기"><Emoji e="🧑‍🎤"/> 인물 시트</button>
            </div>
            <div style={hint}>인물 시트·캐릭터 모델에서 만든 인물은 공유 라이브러리에 모이고, 위 <b><Emoji e="📥"/> 라이브러리</b>로 토큰에 추가됩니다.</div>
          </div>

          <div style={hint}>모든 장면·토큰 배치는 이 브라우저에 자동 저장됩니다.</div>
        </div>
      </div>
    </div>
  )
}
