// 비트 보드 — 막(act) 레인에 비트 카드(제목+설명)를 배치·드래그 이동·편집·삭제하며 이야기 골격을 짠다.
// 막 레인 자체도 CRUD: 추가/이름변경/삭제/순서 이동(기본 1막·2막·3막, 사용자 정의 가능).
// 전체 비트 수와 막별 균형(개수 막대)을 한눈에 보여준다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. 포인터(드래그) 리스너는 언마운트/종료 시 정리.
// 저장: localStorage 'sry:tool:beat-board' 자동 저장/복원(손상/차단 graceful).
// 연계(linkbus): 막별 비트 목록을 프로젝트 자료('구조' 폴더)에 HTML 문서로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'beat-board', name: '비트 보드', icon: '🧩', group: '구상·정리', intro: '막(act) 레인에 비트 카드를 배치·이동하며 이야기 골격을 짜보세요', w: 820, h: 580 }

const LS_KEY = 'sry:tool:beat-board'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface Beat {
  id: string
  title: string
  desc: string
  createdAt: number
  updatedAt: number
}
interface Act {
  id: string
  label: string
  beatIds: string[] // 레인 내 비트 순서
}
interface BoardState {
  beats: Record<string, Beat>
  acts: Act[] // 막(레인) 순서
}

const ACT_ACCENTS = ['#5b8def', '#a855f7', '#22a06b', '#f0b429', '#ef6461', '#0ea5e9', '#d946ef', '#84cc16']
const accentOf = (idx: number) => ACT_ACCENTS[idx % ACT_ACCENTS.length]

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID()
  } catch { /* ignore */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emptyBoard(): BoardState {
  return { beats: {}, acts: [] }
}

// 첫 사용자에게 보여줄 예시(빈 보드일 때만 시드): 3막 구조 + 대표 비트 몇 개.
function seedBoard(): BoardState {
  const b = emptyBoard()
  const mk = (title: string, desc: string): Beat => {
    const id = newId('beat')
    const now = Date.now()
    b.beats[id] = { id, title, desc, createdAt: now, updatedAt: now }
    return b.beats[id]
  }
  const a1 = mk('도입 — 일상 세계', '주인공의 평범한 하루. 결핍과 욕망을 슬쩍 드러낸다.')
  const a2 = mk('사건의 발단', '평형을 깨뜨리는 첫 사건. 주인공이 모험/문제로 끌려 들어간다.')
  const b1 = mk('첫 시련', '새 세계의 규칙을 배우며 작은 승리와 실패를 겪는다.')
  const b2 = mk('중간점 반전', '판이 뒤집히는 사건. 진짜 적/진실이 드러난다.')
  const b3 = mk('최악의 순간', '모든 것을 잃은 듯한 밑바닥. 내적 위기.')
  const c1 = mk('절정', '주인공이 결단하고 정면으로 맞선다.')
  const c2 = mk('대단원', '갈등 해소. 변화한 주인공의 새 일상.')
  b.acts = [
    { id: newId('act'), label: '1막 · 설정', beatIds: [a1.id, a2.id] },
    { id: newId('act'), label: '2막 · 대립', beatIds: [b1.id, b2.id, b3.id] },
    { id: newId('act'), label: '3막 · 해결', beatIds: [c1.id, c2.id] },
  ]
  return b
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증 + 누락 보정.
function loadBoard(): { board: BoardState; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { board: seedBoard(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { board: seedBoard(), seeded: true }
    const beats: Record<string, Beat> = {}
    if (parsed.beats && typeof parsed.beats === 'object') {
      for (const k of Object.keys(parsed.beats)) {
        const x = parsed.beats[k]
        if (!x || typeof x.title !== 'string') continue
        beats[String(k)] = {
          id: String(x.id || k),
          title: String(x.title),
          desc: typeof x.desc === 'string' ? x.desc : '',
          createdAt: Number(x.createdAt) || Date.now(),
          updatedAt: Number(x.updatedAt) || Date.now(),
        }
      }
    }
    const acts: Act[] = []
    const seenBeat = new Set<string>()
    if (Array.isArray(parsed.acts)) {
      for (const a of parsed.acts) {
        if (!a || typeof a.label !== 'string') continue
        const beatIds = Array.isArray(a.beatIds)
          ? a.beatIds.map((id: unknown) => String(id)).filter((id: string) => !!beats[id] && !seenBeat.has(id))
          : []
        beatIds.forEach((id: string) => seenBeat.add(id))
        acts.push({ id: String(a.id || newId('act')), label: String(a.label), beatIds })
      }
    }
    if (acts.length === 0) acts.push({ id: newId('act'), label: '1막', beatIds: [] })
    // 어디에도 속하지 않은 비트는 첫 막으로.
    Object.keys(beats).forEach((id) => { if (!seenBeat.has(id)) acts[0].beatIds.push(id) })
    return { board: { beats, acts }, seeded: false }
  } catch {
    return { board: seedBoard(), seeded: true }
  }
}

// 비트가 속한 막 id 찾기
function actOf(board: BoardState, beatId: string): string | null {
  for (const a of board.acts) if (a.beatIds.includes(beatId)) return a.id
  return null
}

// ── 드래그 상태 ───────────────────────────────────────────────────────────────
interface DragState {
  beatId: string
  fromAct: string
  pointerId: number
  x: number
  y: number
  offX: number
  offY: number
  w: number
  overAct: string | null
  overIndex: number
  started: boolean
  startX: number
  startY: number
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function BeatBoard({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ board: BoardState; seeded: boolean }>()
  if (!initial.current) initial.current = loadBoard()

  const [board, setBoard] = useState<BoardState>(initial.current.board)
  const [note, setNote] = useState(initial.current.seeded ? '예시 3막 구조를 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')

  // 편집 모달: 'new' 면 새 비트(targetAct 에 추가), 그 외엔 비트 id 편집
  const [editing, setEditing] = useState<{ id: string | 'new'; act: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmDelAct, setConfirmDelAct] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null) // 막 id
  const [renameText, setRenameText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [dropActive, setDropActive] = useState(false) // 바인더 파일 드래그 진입 시 시각 피드백
  const dropDepth = useRef(0) // onDragEnter/Leave 중첩 보정

  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  const mounted = useRef(true)
  const laneBodyRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 비트 1개를 받으면 첫 막에 추가(다른 도구 연계 진입점)
  const payloadApplied = useRef(false)
  useEffect(() => {
    if (payloadApplied.current || !payload) return
    payloadApplied.current = true
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (!title) return
    const desc = typeof payload.desc === 'string' ? payload.desc
      : typeof payload.body === 'string' ? payload.body
      : typeof payload.text === 'string' ? payload.text : ''
    setBoard((prev) => {
      if (prev.acts.length === 0) return prev
      const id = newId('beat')
      const now = Date.now()
      const acts = prev.acts.map((a, i) => i === 0 ? { ...a, beatIds: [...a.beatIds, id] } : a)
      return { beats: { ...prev.beats, [id]: { id, title, desc: String(desc), createdAt: now, updatedAt: now } }, acts }
    })
    setNote(`연계로 받은 비트 "${title}" 을(를) ${board.acts[0]?.label || '첫 막'}에 추가했어요.`)
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // 저장 — 차단/용량초과 graceful
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(board))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 보드가 초기화될 수 있어요.')
    }
  }, [board])

  // ── 비트 CRUD ─────────────────────────────────────────────────────────────
  const upsertBeat = useCallback((data: { id: string | 'new'; act: string; title: string; desc: string }) => {
    const title = data.title.trim()
    if (!title) return
    setBoard((prev) => {
      const beats = { ...prev.beats }
      let acts = prev.acts
      if (data.id === 'new') {
        const id = newId('beat')
        const now = Date.now()
        beats[id] = { id, title, desc: data.desc.trim(), createdAt: now, updatedAt: now }
        acts = prev.acts.map((a) => a.id === data.act ? { ...a, beatIds: [...a.beatIds, id] } : a)
      } else {
        const cur = prev.beats[data.id]
        if (!cur) return prev
        beats[data.id] = { ...cur, title, desc: data.desc.trim(), updatedAt: Date.now() }
      }
      return { beats, acts }
    })
    setEditing(null)
  }, [])

  // 바인더 파일(문서)을 드롭하면 첫 막 레인에 새 비트로 추가(제목=title, 설명=text 앞부분)
  const addDroppedItem = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }) => {
    const title = (it.title || '').trim() || '제목 없음'
    // 인물/장소 카드면 주요 필드를 요약해 설명으로, 일반 문서면 본문 앞부분(최대 4000자)
    let desc = ''
    if (it.character) {
      const c = it.character
      const pick = (k: string) => (typeof c[k] === 'string' ? c[k].trim() : '')
      const parts = ['role', 'occupation', 'type', 'location', 'atmosphere', 'goal', 'conflict', 'description', 'personality', 'background', 'arc', 'notes']
        .map((k) => pick(k)).filter(Boolean)
      desc = parts.join(' · ')
    } else if (typeof it.text === 'string') {
      desc = it.text.slice(0, 4000)
    }
    desc = desc.trim().slice(0, 2000)
    let added = false
    setBoard((prev) => {
      if (prev.acts.length === 0) return prev
      const id = newId('beat')
      const now = Date.now()
      const acts = prev.acts.map((a, i) => i === 0 ? { ...a, beatIds: [...a.beatIds, id] } : a)
      added = true
      return { beats: { ...prev.beats, [id]: { id, title, desc, createdAt: now, updatedAt: now } }, acts }
    })
    if (added) setNote(`바인더 파일 "${title}" 을(를) ${board.acts[0]?.label || '첫 막'}에 새 비트로 추가했어요.`)
    else setNote('막(레인)이 없어 추가하지 못했어요. 먼저 막을 만들어 주세요.')
  }, [board.acts])

  const deleteBeat = useCallback((id: string) => {
    setBoard((prev) => {
      const beats = { ...prev.beats }
      delete beats[id]
      const acts = prev.acts.map((a) => a.beatIds.includes(id) ? { ...a, beatIds: a.beatIds.filter((x) => x !== id) } : a)
      return { beats, acts }
    })
    setConfirmDel(null)
  }, [])

  // 레인 내 순서 이동(드래그 보조)
  const nudge = useCallback((id: string, dir: -1 | 1) => {
    setBoard((prev) => {
      const ai = prev.acts.findIndex((a) => a.beatIds.includes(id))
      if (ai < 0) return prev
      const arr = [...prev.acts[ai].beatIds]
      const i = arr.indexOf(id)
      const j = i + dir
      if (j < 0 || j >= arr.length) return prev
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      const acts = prev.acts.map((a, idx) => idx === ai ? { ...a, beatIds: arr } : a)
      return { ...prev, acts }
    })
  }, [])

  // 비트를 인접 막으로 이동(버튼 보조)
  const moveAct = useCallback((id: string, dir: -1 | 1) => {
    setBoard((prev) => {
      const fi = prev.acts.findIndex((a) => a.beatIds.includes(id))
      if (fi < 0) return prev
      const ti = fi + dir
      if (ti < 0 || ti >= prev.acts.length) return prev
      const acts = prev.acts.map((a, idx) => {
        if (idx === fi) return { ...a, beatIds: a.beatIds.filter((x) => x !== id) }
        if (idx === ti) return { ...a, beatIds: [...a.beatIds, id] }
        return a
      })
      return { ...prev, acts, beats: { ...prev.beats, [id]: { ...prev.beats[id], updatedAt: Date.now() } } }
    })
  }, [])

  // ── 막(레인) CRUD ──────────────────────────────────────────────────────────
  const addAct = useCallback(() => {
    setBoard((prev) => {
      const label = `${prev.acts.length + 1}막`
      return { ...prev, acts: [...prev.acts, { id: newId('act'), label, beatIds: [] }] }
    })
  }, [])

  const renameAct = useCallback((id: string, label: string) => {
    const l = label.trim()
    if (!l) { setRenaming(null); return }
    setBoard((prev) => ({ ...prev, acts: prev.acts.map((a) => a.id === id ? { ...a, label: l } : a) }))
    setRenaming(null)
  }, [])

  const deleteAct = useCallback((id: string) => {
    setBoard((prev) => {
      if (prev.acts.length <= 1) { return prev }
      const target = prev.acts.find((a) => a.id === id)
      if (!target) return prev
      const beats = { ...prev.beats }
      target.beatIds.forEach((bid) => { delete beats[bid] })
      return { beats, acts: prev.acts.filter((a) => a.id !== id) }
    })
    setConfirmDelAct(null)
  }, [])

  const moveActLane = useCallback((id: string, dir: -1 | 1) => {
    setBoard((prev) => {
      const i = prev.acts.findIndex((a) => a.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.acts.length) return prev
      const acts = [...prev.acts]
      ;[acts[i], acts[j]] = [acts[j], acts[i]]
      return { ...prev, acts }
    })
  }, [])

  // ── 드래그 이동 (포인터 이벤트) ───────────────────────────────────────────────
  const DRAG_THRESHOLD = 5

  const onBeatPointerDown = useCallback((e: React.PointerEvent, beatId: string, fromAct: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const t = e.target as HTMLElement
    if (t.closest('button, a, input, textarea, select')) return
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    setDrag({
      beatId, fromAct, pointerId: e.pointerId,
      x: rect.left, y: rect.top,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top,
      w: rect.width,
      overAct: fromAct, overIndex: 0,
      started: false, startX: e.clientX, startY: e.clientY,
    })
  }, [])

  const computeDrop = useCallback((clientX: number, clientY: number, draggingId: string): { act: string; index: number } | null => {
    const actIds = board.acts.map((a) => a.id)
    let foundAct: string | null = null
    for (const k of actIds) {
      const node = laneBodyRefs.current[k]
      if (!node) continue
      const r = node.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top - 40 && clientY <= r.bottom + 40) { foundAct = k; break }
    }
    if (!foundAct) {
      let best: string | null = null
      let bestDist = Infinity
      for (const k of actIds) {
        const node = laneBodyRefs.current[k]
        if (!node) continue
        const r = node.getBoundingClientRect()
        const cx = (r.left + r.right) / 2
        const d = Math.abs(clientX - cx)
        if (d < bestDist) { bestDist = d; best = k }
      }
      foundAct = best
    }
    if (!foundAct) return null
    const node = laneBodyRefs.current[foundAct]
    if (!node) return { act: foundAct, index: 0 }
    const cardEls = Array.from(node.querySelectorAll<HTMLElement>('[data-beat-id]'))
      .filter((c) => c.getAttribute('data-beat-id') !== draggingId)
    let index = cardEls.length
    for (let i = 0; i < cardEls.length; i++) {
      const r = cardEls[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) { index = i; break }
    }
    return { act: foundAct, index }
  }, [board.acts])

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const movedEnough = Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD || Math.abs(e.clientY - d.startY) > DRAG_THRESHOLD
      const drop = computeDrop(e.clientX, e.clientY, d.beatId)
      setDrag((cur) => cur ? {
        ...cur,
        x: e.clientX - cur.offX,
        y: e.clientY - cur.offY,
        started: cur.started || movedEnough,
        overAct: drop ? drop.act : cur.overAct,
        overIndex: drop ? drop.index : cur.overIndex,
      } : cur)
    }
    const finish = (commit: boolean) => {
      const d = dragRef.current
      setDrag(null)
      if (!d || !commit || !d.started || !d.overAct) return
      setBoard((prev) => {
        const fromIdx = prev.acts.findIndex((a) => a.beatIds.includes(d.beatId))
        const toIdx = prev.acts.findIndex((a) => a.id === d.overAct)
        if (fromIdx < 0 || toIdx < 0) return prev
        const acts = prev.acts.map((a) => ({ ...a, beatIds: [...a.beatIds] }))
        // 원위치 제거
        const removedAt = acts[fromIdx].beatIds.indexOf(d.beatId)
        acts[fromIdx].beatIds.splice(removedAt, 1)
        let idx = d.overIndex
        if (fromIdx === toIdx && removedAt > -1 && removedAt < idx) idx -= 1
        if (idx < 0) idx = 0
        if (idx > acts[toIdx].beatIds.length) idx = acts[toIdx].beatIds.length
        acts[toIdx].beatIds.splice(idx, 0, d.beatId)
        const beats = fromIdx !== toIdx
          ? { ...prev.beats, [d.beatId]: { ...prev.beats[d.beatId], updatedAt: Date.now() } }
          : prev.beats
        return { beats, acts }
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
  }, [drag ? drag.beatId : null, computeDrop])

  // ── 집계 ───────────────────────────────────────────────────────────────────
  const totalBeats = Object.keys(board.beats).length
  const maxLane = board.acts.reduce((m, a) => Math.max(m, a.beatIds.length), 0)

  // ── 내보내기/복사/프로젝트 ───────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = ['# 비트 보드', '']
    board.acts.forEach((a) => {
      lines.push(`## ${a.label} (${a.beatIds.length})`)
      if (!a.beatIds.length) lines.push('  (비어 있음)')
      a.beatIds.forEach((id, i) => {
        const bt = board.beats[id]
        if (!bt) return
        lines.push(`${i + 1}. ${bt.title}`)
        if (bt.desc) bt.desc.split('\n').forEach((ln) => lines.push(`    ${ln}`))
      })
      lines.push('')
    })
    lines.push(`전체 비트: ${totalBeats}`)
    return lines.join('\n').trimEnd() + '\n'
  }, [board, totalBeats])

  const copyAll = useCallback(() => {
    navigator.clipboard?.writeText(buildText()).then(() => {
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
      a.download = 'beat-board.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    }
  }, [buildText])

  const buildHtml = useCallback((): string => {
    const parts: string[] = []
    board.acts.forEach((a) => {
      parts.push(`<h2>${escHtml(a.label)} (${a.beatIds.length})</h2>`)
      if (!a.beatIds.length) { parts.push('<p><em>(비어 있음)</em></p>'); return }
      const lis: string[] = []
      a.beatIds.forEach((id) => {
        const bt = board.beats[id]
        if (!bt) return
        let li = `<strong>${escHtml(bt.title)}</strong>`
        if (bt.desc) li += '<br>' + escHtml(bt.desc).replace(/\n/g, '<br>')
        lis.push('<li>' + li + '</li>')
      })
      parts.push('<ol>' + lis.join('') + '</ol>')
    })
    parts.push(`<p><em>전체 비트 ${totalBeats}개</em></p>`)
    return parts.join('')
  }, [board, totalBeats])

  const addBoardToProject = useCallback(() => {
    if (totalBeats === 0) { setNote('프로젝트에 추가할 비트가 없어요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const per = board.acts.map((a) => `${a.label} ${a.beatIds.length}`).join(', ')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '비트 보드',
      bodyHtml: buildHtml(),
      meta: { 비트수: String(totalBeats), 막수: String(board.acts.length), 막별: per },
    })
    setNote(id ? '프로젝트 자료 "구조" 폴더에 비트 보드 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [board, totalBeats, buildHtml])

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus()
  }, [renaming])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const boardWrap: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: 12, overflowX: 'auto', overflowY: 'hidden', alignItems: 'stretch' }
  const laneWrap: React.CSSProperties = { flex: '1 1 0', minWidth: 188, maxWidth: 360, display: 'flex', flexDirection: 'column', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const hintBar: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }

  return (
    <div
      style={{ ...wrap, outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dropDepth.current += 1; setDropActive(true) } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dropDepth.current = Math.max(0, dropDepth.current - 1); if (dropDepth.current === 0) setDropActive(false) } }}
      onDrop={(e) => {
        dropDepth.current = 0
        setDropActive(false)
        const it = getDragItem(e)
        if (it) { e.preventDefault(); addDroppedItem(it) }
      }}
    >
      {/* 툴바 */}
      <div style={toolbar}>
        <span style={{ fontSize: 15, fontWeight: 700 }}><Emoji e="🧩"/> 비트 보드</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>막 {board.acts.length} · 비트 {totalBeats}</span>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowBalance((v) => !v)} aria-pressed={showBalance} title="막별 균형 막대 표시/숨김"><Emoji e="📊"/> 균형 {showBalance ? '끄기' : '켜기'}</button>
        <button className="minibtn" onClick={addAct} title="막(레인) 추가">＋ 막</button>
        <button className="minibtn" onClick={copyAll} title="보드를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {/* 막별 균형 막대 */}
      {showBalance && board.acts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
          {board.acts.map((a, i) => {
            const n = a.beatIds.length
            const pct = maxLane > 0 ? Math.round((n / maxLane) * 100) : 0
            const share = totalBeats > 0 ? Math.round((n / totalBeats) * 100) : 0
            return (
              <div key={a.id} style={{ flex: '1 1 0', minWidth: 92 }} title={`${a.label}: ${n}개 (전체의 ${share}%)`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginBottom: 3 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                  <span style={{ flexShrink: 0, fontWeight: 600, color: 'var(--text)' }}>{n}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: 'var(--panel)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: accentOf(i), transition: 'width .2s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 보드(막 레인들) */}
      <div style={boardWrap}>
        {board.acts.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', gap: 10 }}>
            <div style={{ fontSize: 13 }}>막(레인)이 없어요. 먼저 막을 만들어 주세요.</div>
            <button className="btn-primary" onClick={addAct}>＋ 첫 막 만들기</button>
          </div>
        ) : board.acts.map((act, ai) => {
          const accent = accentOf(ai)
          const isDropTarget = drag?.started && drag.overAct === act.id
          return (
            <div key={act.id} style={{ ...laneWrap, outline: isDropTarget ? `2px solid ${accent}` : 'none', outlineOffset: -1 }}>
              {/* 레인 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 9px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                {renaming === act.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameAct(act.id, renameText)
                      else if (e.key === 'Escape') setRenaming(null)
                    }}
                    onBlur={() => renameAct(act.id, renameText)}
                    maxLength={40}
                    style={{ flex: 1, minWidth: 0, padding: '3px 6px', fontSize: 13, borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)' }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                    title="더블클릭하면 이름을 바꿀 수 있어요"
                    onDoubleClick={() => { setRenameText(act.label); setRenaming(act.id) }}
                  >{act.label}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px', fontWeight: 600, flexShrink: 0 }}>{act.beatIds.length}</span>
              </div>

              {/* 레인 막 컨트롤 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 7px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <button className="minibtn" style={miniS} title="막을 왼쪽으로" disabled={ai === 0} onClick={() => moveActLane(act.id, -1)}>◀</button>
                <button className="minibtn" style={miniS} title="막을 오른쪽으로" disabled={ai === board.acts.length - 1} onClick={() => moveActLane(act.id, 1)}>▶</button>
                <button className="minibtn" style={miniS} title="막 이름 바꾸기" onClick={() => { setRenameText(act.label); setRenaming(act.id) }}><Emoji e="✏️"/></button>
                <div style={{ flex: 1 }} />
                <button className="minibtn" style={{ ...miniS, color: 'var(--warn)' }} title={board.acts.length <= 1 ? '마지막 막은 삭제할 수 없어요' : '막 삭제(비트도 함께 삭제)'} disabled={board.acts.length <= 1} onClick={() => setConfirmDelAct(act.id)}><Emoji e="🗑️"/> 막</button>
              </div>

              {/* 레인 본문(비트 카드) */}
              <div
                ref={(el) => { laneBodyRefs.current[act.id] = el }}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {act.beatIds.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 10, minHeight: 80, whiteSpace: 'pre-line' }}>
                    {'아직 비트가 없어요.\n+ 비트 로 추가하거나\n다른 막에서 끌어오세요.'}
                  </div>
                ) : act.beatIds.map((id, idx) => {
                  const bt = board.beats[id]
                  if (!bt) return null
                  const isDragging = drag?.beatId === id && drag.started
                  const showLineBefore = drag?.started && drag.overAct === act.id && drag.overIndex === idx && drag.beatId !== id
                  return (
                    <div key={id}>
                      {showLineBefore && <div style={{ height: 3, borderRadius: 2, background: accent, margin: '0 2px 6px' }} />}
                      <div
                        data-beat-id={id}
                        onPointerDown={(e) => onBeatPointerDown(e, id, act.id)}
                        onDoubleClick={() => setEditing({ id, act: act.id })}
                        style={{
                          background: 'var(--paper)',
                          border: '1px solid var(--border)',
                          borderLeft: `3px solid ${accent}`,
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
                          <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: '18px', flexShrink: 0, fontWeight: 700, minWidth: 14 }}>{idx + 1}</span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>{bt.title}</div>
                        </div>
                        {bt.desc && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4, maxHeight: 72, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{bt.desc}</div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 7, flexWrap: 'wrap' }}>
                          <button className="minibtn" style={miniS} title="이전 막으로" disabled={ai === 0} onClick={() => moveAct(id, -1)}>◀</button>
                          <button className="minibtn" style={miniS} title="다음 막으로" disabled={ai === board.acts.length - 1} onClick={() => moveAct(id, 1)}>▶</button>
                          <button className="minibtn" style={miniS} title="위로" disabled={idx === 0} onClick={() => nudge(id, -1)}>▲</button>
                          <button className="minibtn" style={miniS} title="아래로" disabled={idx === act.beatIds.length - 1} onClick={() => nudge(id, 1)}>▼</button>
                          <div style={{ flex: 1 }} />
                          <button className="minibtn" style={miniS} title="편집" onClick={() => setEditing({ id, act: act.id })}><Emoji e="✏️"/></button>
                          <button className="minibtn" style={{ ...miniS, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(id)}><Emoji e="🗑️"/></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* 맨 끝 드롭선 */}
                {drag?.started && drag.overAct === act.id && drag.overIndex >= act.beatIds.length && (
                  <div style={{ height: 3, borderRadius: 2, background: accent, margin: '0 2px' }} />
                )}
              </div>

              {/* 레인 푸터 */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '5px 8px', flexShrink: 0 }}>
                <button className="minibtn" style={{ width: '100%', padding: '5px', fontSize: 11.5 }} onClick={() => setEditing({ id: 'new', act: act.id })}>+ 비트</button>
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
          disabled={totalBeats === 0 || !hasProjectBridge()}
          title={hasProjectBridge() ? '막별 비트 목록을 프로젝트 자료 "구조" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {/* 하단 안내/통계 */}
      <div style={hintBar}>
        <span>카드를 끌어 막 사이로 옮기세요. 더블클릭으로 편집, 막 이름은 더블클릭으로 변경.</span>
        <span style={{ flexShrink: 0 }}>전체 <strong style={{ color: 'var(--text)' }}>{totalBeats}</strong>개 비트</span>
      </div>

      {/* 떠다니는 드래그 미리보기 */}
      {drag?.started && (() => {
        const bt = board.beats[drag.beatId]
        if (!bt) return null
        const overIdx = board.acts.findIndex((a) => a.id === (drag.overAct || drag.fromAct))
        const acc = accentOf(overIdx < 0 ? 0 : overIdx)
        return (
          <div style={{
            position: 'fixed', left: drag.x, top: drag.y, width: drag.w,
            zIndex: 9999, pointerEvents: 'none',
            background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${acc}`,
            borderRadius: 10, padding: '8px 9px', boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
            transform: 'rotate(2deg)', opacity: 0.96,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{bt.title}</div>
          </div>
        )
      })()}

      {/* 비트 편집/추가 모달 */}
      {editing && (
        <BeatEditor
          board={board}
          editing={editing}
          onCancel={() => setEditing(null)}
          onSave={upsertBeat}
        />
      )}

      {/* 비트 삭제 확인 */}
      {confirmDel && board.beats[confirmDel] && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>비트 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{board.beats[confirmDel].title}」 비트를 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => deleteBeat(confirmDel)}>삭제</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* 막 삭제 확인 */}
      {confirmDelAct && board.acts.find((a) => a.id === confirmDelAct) && (() => {
        const a = board.acts.find((x) => x.id === confirmDelAct)!
        return (
          <Overlay onClose={() => setConfirmDelAct(null)}>
            <div style={modalCard}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>막 삭제</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                「{a.label}」 막을 삭제할까요?{a.beatIds.length > 0 ? <><br />이 막의 비트 {a.beatIds.length}개도 함께 삭제됩니다.</> : null}<br />이 작업은 되돌릴 수 없어요.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="minibtn" onClick={() => setConfirmDelAct(null)}>취소</button>
                <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => deleteAct(confirmDelAct)}>삭제</button>
              </div>
            </div>
          </Overlay>
        )
      })()}
    </div>
  )
}

const miniS: React.CSSProperties = { padding: '2px 6px', fontSize: 11, lineHeight: 1.1, minWidth: 0 }

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

// ── 비트 편집기 ───────────────────────────────────────────────────────────────
function BeatEditor({
  board, editing, onCancel, onSave,
}: {
  board: BoardState
  editing: { id: string | 'new'; act: string }
  onCancel: () => void
  onSave: (d: { id: string | 'new'; act: string; title: string; desc: string }) => void
}) {
  const existing = editing.id !== 'new' ? board.beats[editing.id] : undefined
  const [title, setTitle] = useState(existing?.title || '')
  const [desc, setDesc] = useState(existing?.desc || '')
  const titleRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  const actLabel = board.acts.find((a) => a.id === editing.act)?.label || ''
  const submit = () => onSave({ id: editing.id, act: editing.act, title, desc })

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 420 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{editing.id === 'new' ? '새 비트' : '비트 편집'}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 14 }}>{actLabel} 막</div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>제목 *</label>
          <input
            ref={titleRef}
            style={inputBase}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="예: 중간점 반전"
            maxLength={120}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>설명</label>
          <textarea
            style={{ ...inputBase, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="이 비트에서 일어나는 일, 의미, 메모…"
            maxLength={2000}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>{editing.id === 'new' ? '추가' : '저장'}</button>
        </div>
      </div>
    </Overlay>
  )
}
