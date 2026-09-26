// 스토리 별자리 — 작품의 인물·장소·사건·복선을 하나의 별자리 지도로 통합 시각화하는 마스터 대시보드.
//  · 공유 라이브러리(characters/places/snippets)를 모두 수용해 자동으로 별(노드)로 배치한다.
//  · 사용자가 직접 사건·복선 별을 추가하고, 별 사이를 선(궤도)으로 이어 이야기 구조를 만든다.
//  · 별 클릭 → 우측 패널에서 편집/연결, 그리고 종류에 맞는 관련 도구를 데이터와 함께 연다(openToolLinked).
//  · 결정론적 레이아웃: 종류별 동심원(궤도) + 이름 해시 기반 각도로 흔들림 없는 배치.
//  · 복선 추적: 복선 별의 '심음/거둠' 상태를 색으로 표시하고, 회수율을 요약 카드로 보여준다.
// import 는 react 와 './linkbus' 만 사용. 외부 네트워크 불필요. localStorage 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, openToolLinked,
  addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag,
  type SharedCharacter, type SharedPlace, type SharedSnippet,
} from './linkbus'

export const meta = {
  id: 'story-constellation',
  name: '스토리 별자리',
  icon: '✨',
  group: '구상·정리',
  intro: '인물·장소·사건·복선을 하나의 별자리 지도로 통합 시각화하는 마스터 대시보드',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:story-constellation'

// ── 별 종류 정의(궤도 반경 비율·색·관련 도구) ──────────────────────────────
type Kind = 'character' | 'place' | 'event' | 'foreshadow' | 'snippet'
interface KindDef {
  key: Kind
  label: string
  color: string
  orbit: number      // 중심으로부터의 궤도 비율(0~1)
  tool?: string      // 이 종류 별을 클릭했을 때 함께 열 관련 도구 id
  toolLabel?: string
}
const KINDS: KindDef[] = [
  { key: 'character', label: '인물', color: '#f2c14e', orbit: 0.42, tool: 'character-sheet', toolLabel: '인물 시트' },
  { key: 'place', label: '장소', color: '#4fb3d9', orbit: 0.66, tool: 'setting-bible', toolLabel: '배경 설정집' },
  { key: 'event', label: '사건', color: '#e0518b', orbit: 0.84, tool: 'scene-list', toolLabel: '장면 목록' },
  { key: 'foreshadow', label: '복선', color: '#8a5cd6', orbit: 0.26, tool: 'setup-payoff', toolLabel: '심음·거둠' },
  { key: 'snippet', label: '인용', color: '#3fa35a', orbit: 0.95 },
]
const kindOf = (k: string): KindDef => KINDS.find((d) => d.key === k) || KINDS[0]

// 복선 상태
type SeedState = 'planted' | 'paid' | 'open'
const SEED_LABEL: Record<SeedState, string> = { planted: '심음', paid: '거둠', open: '미정' }

interface Star {
  id: string
  kind: Kind
  name: string
  note: string
  // 라이브러리에서 온 별은 src 로 출처를 남긴다(중복 흡수 방지)
  src?: string
  // 복선 전용
  seed?: SeedState
  // 수동 위치(드래그). 없으면 결정론적 배치.
  px?: number
  py?: number
}
interface Link { id: string; a: string; b: string; note: string }
interface Store { stars: Star[]; links: Link[] }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 문자열 해시 → 0~1 (결정론적 각도/밝기 시드)
function hash01(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { stars: [], links: [] }
    const p = JSON.parse(raw)
    const stars: Star[] = Array.isArray(p?.stars)
      ? p.stars.filter((s: any) => s && typeof s.name === 'string').map((s: any) => ({
          id: String(s.id || newId()),
          kind: (KINDS.some((k) => k.key === s.kind) ? s.kind : 'event') as Kind,
          name: String(s.name).slice(0, 60),
          note: String(s.note || '').slice(0, 400),
          src: typeof s.src === 'string' ? s.src : undefined,
          seed: (s.seed === 'planted' || s.seed === 'paid' || s.seed === 'open') ? s.seed : undefined,
          px: Number.isFinite(s.px) ? s.px : undefined,
          py: Number.isFinite(s.py) ? s.py : undefined,
        }))
      : []
    const ids = new Set(stars.map((s) => s.id))
    const links: Link[] = Array.isArray(p?.links)
      ? p.links.filter((l: any) => l && ids.has(String(l.a)) && ids.has(String(l.b)) && String(l.a) !== String(l.b)).map((l: any) => ({
          id: String(l.id || newId()),
          a: String(l.a),
          b: String(l.b),
          note: String(l.note || '').slice(0, 40),
        }))
      : []
    return { stars, links }
  } catch {
    return { stars: [], links: [] }
  }
}

// 공유 인물/장소 → 별 메모 한 줄로 요약
function summarize(fields: Record<string, string> | undefined, primary: string[], fallback?: string): string {
  const f = fields || {}
  const parts: string[] = []
  for (const k of primary) { const v = (f[k] || '').trim(); if (v) { parts.push(v); if (parts.join(' · ').length > 80) break } }
  const out = parts.join(' · ').slice(0, 160)
  return out || (fallback ? fallback.trim().slice(0, 160) : '')
}

function charSummary(c: SharedCharacter): string {
  return summarize(c.fields, ['role', 'goal', 'personality', 'occupation'], c.role || c.personality || c.goal || c.notes)
}
function placeSummary(p: SharedPlace): string {
  return summarize(p.fields, ['kind', 'atmosphere', 'appearance', 'history'], p.kind || p.mood || p.history || p.notes)
}

interface Props { payload?: Record<string, unknown> }

export default function StoryConstellation({ payload }: Props) {
  const initial = useRef<Store>(loadStore())
  const [stars, setStars] = useState<Star[]>(initial.current.stars)
  const [links, setLinks] = useState<Link[]>(initial.current.links)
  const [note, setNote] = useState('')

  const [sel, setSel] = useState<string | null>(null)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [linkMode, setLinkMode] = useState(false)
  const [visible, setVisible] = useState<Record<Kind, boolean>>({ character: true, place: true, event: true, foreshadow: true, snippet: true })

  // 새 별 입력
  const [draftKind, setDraftKind] = useState<Kind>('event')
  const [draftName, setDraftName] = useState('')

  // 편집 폼
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSeed, setEditSeed] = useState<SeedState>('open')

  // 드롭 피드백
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)

  const libChars = useLibraryList('characters')
  const libPlaces = useLibraryList('places')
  const libSnips = useLibraryList('snippets')

  const svgRef = useRef<SVGSVGElement | null>(null)
  const mounted = useRef(true)
  // 안내 메시지 자동 클리어 타이머(언마운트 시 정리)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = (msg: string) => {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    if (!msg) { noteTimer.current = null; return }
    noteTimer.current = setTimeout(() => { noteTimer.current = null; if (mounted.current) setNote('') }, 4000)
  }
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  // 진행 중 드래그의 window 리스너 참조(언마운트 시 정리용 — 누수 방지)
  const dragListeners = useRef<{ move: (ev: PointerEvent) => void; up: () => void } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      drag.current = null
      // 안내 메시지 자동 클리어 타이머 정리
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
      // 별 드래그 중 언마운트되면 window 리스너가 남아 누수 → 진행 중이면 제거
      const dl = dragListeners.current
      if (dl) {
        window.removeEventListener('pointermove', dl.move)
        window.removeEventListener('pointerup', dl.up)
        window.removeEventListener('pointercancel', dl.up)
        dragListeners.current = null
      }
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ stars, links })) }
    catch { flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.') }
  }, [stars, links])

  // ── 별 추가 공용 헬퍼(이름+종류로 중복 방지) ──
  // 같은 렌더 틱에서 여러 번 호출(라이브러리 일괄 불러오기 등)될 때 스냅샷이 갱신되지 않아도
  // 배치 내 중복을 막기 위한 펜딩 목록(이번 틱에 막 추가된 별들). 다음 commit 후 비운다.
  const pendingStars = useRef<Star[]>([])
  useEffect(() => { pendingStars.current = [] }, [stars])
  const addStar = (kind: Kind, rawName: string, rawNote = '', src?: string): string | null => {
    const name = rawName.trim()
    if (!name) return null
    // dedup/createdId 판정은 업데이터 밖에서 현재 stars 스냅샷(+이번 틱 펜딩) 기준으로 수행
    const exists = (s: Star) => s.kind === kind && (s.name.trim() === name || (src && s.src === src))
    if (stars.some(exists) || pendingStars.current.some(exists)) return null
    const s: Star = {
      id: newId(), kind, name: name.slice(0, 60), note: rawNote.slice(0, 400), src,
      seed: kind === 'foreshadow' ? 'open' : undefined,
    }
    pendingStars.current.push(s)
    // setStars 는 순수 추가만 수행(업데이터 내부에서 다른 setState/판정 부수효과 없음)
    setStars((prev) => [...prev, s])
    return s.id
  }

  // ── payload 수용: payload.text(원고)·character·place·name ──
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const p = payload as Record<string, unknown>
    let added = 0
    const pushChar = (c: any) => { if (c && typeof c === 'object' && typeof c.name === 'string') { if (addStar('character', c.name, charSummary(c as SharedCharacter), 'pl:' + c.name)) added++ } }
    const rawC = p.character
    if (Array.isArray(rawC)) rawC.forEach(pushChar); else if (rawC) pushChar(rawC)
    const rawP = p.place
    const pushPlace = (q: any) => { if (q && typeof q === 'object' && typeof q.name === 'string') { if (addStar('place', q.name, placeSummary(q as SharedPlace), 'pl:' + q.name)) added++ } }
    if (Array.isArray(rawP)) rawP.forEach(pushPlace); else if (rawP) pushPlace(rawP)
    if (typeof p.name === 'string' && p.name.trim()) { if (addStar('event', p.name, typeof p.text === 'string' ? String(p.text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '')) added++ }
    else if (typeof p.text === 'string' && p.text.trim()) {
      const plain = String(p.text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (plain) { if (addStar('event', plain.slice(0, 40) + (plain.length > 40 ? '…' : ''), plain.slice(0, 160), 'pl-text')) added++ }
    }
    if (mounted.current && added) flash(`전달받은 항목 ${added}개를 별로 추가했어요.`)
  }, [payload]) // eslint-disable-line

  // ── 라이브러리 일괄 불러오기 ──
  const importLib = (kind: Kind) => {
    let added = 0
    if (kind === 'character') for (const c of libChars) { if (addStar('character', c.name || '', charSummary(c), 'lib:' + c.id)) added++ }
    if (kind === 'place') for (const p of libPlaces) { if (addStar('place', p.name || '', placeSummary(p), 'lib:' + p.id)) added++ }
    if (kind === 'snippet') for (const s of libSnips) { const t = (s.text || '').replace(/\s+/g, ' ').trim(); if (t && addStar('snippet', t.slice(0, 36) + (t.length > 36 ? '…' : ''), t.slice(0, 200), 'lib:' + s.id)) added++ }
    const lbl = kindOf(kind).label
    flash(added ? `${lbl} ${added}개를 별로 불러왔어요.` : `새로 불러올 ${lbl}이(가) 없어요.`)
  }
  const importAll = () => {
    let added = 0
    for (const c of libChars) if (addStar('character', c.name || '', charSummary(c), 'lib:' + c.id)) added++
    for (const p of libPlaces) if (addStar('place', p.name || '', placeSummary(p), 'lib:' + p.id)) added++
    for (const s of libSnips) { const t = (s.text || '').replace(/\s+/g, ' ').trim(); if (t && addStar('snippet', t.slice(0, 36) + (t.length > 36 ? '…' : ''), t.slice(0, 200), 'lib:' + s.id)) added++ }
    flash(added ? `라이브러리에서 ${added}개를 별자리에 모았어요.` : '라이브러리의 항목이 이미 모두 별자리에 있어요.')
  }

  // ── 바인더 파일 드롭 → 별로 추가 ──
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0; setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const ch = it.character
    if (ch && (ch.name || it.title)) {
      const isPlace = it.type === 'setting' || /장소|배경|place|setting/i.test(it.type || '')
      const kind: Kind = isPlace ? 'place' : 'character'
      const name = (ch.name || it.title || '').trim()
      const summ = isPlace ? placeSummary({ fields: ch } as any) : charSummary({ fields: ch, name } as any)
      const id = addStar(kind, name, summ, 'drop:' + it.id)
      if (id) { setSel(id); flash(`‘${name}’을(를) ${kindOf(kind).label} 별로 추가했어요.`) }
      else flash(`‘${name}’은(는) 이미 있어요.`)
      return
    }
    const title = (it.title || '').trim()
    const body = (it.text || '').replace(/\s+/g, ' ').trim()
    if (!title && !body) { flash('드롭한 파일에서 내용을 찾지 못했어요.'); return }
    const id = addStar('event', title || body.slice(0, 40), body.slice(0, 200), 'drop:' + it.id)
    if (id) { setSel(id); flash(`‘${title || '문서'}’을(를) 사건 별로 추가했어요.`) }
    else flash('이미 추가된 문서예요.')
  }

  // ── 결정론적 좌표 계산(수동 위치 우선) ──
  const W = 1000, H = 1000, CX = W / 2, CY = H / 2, R = Math.min(W, H) * 0.46
  const positions = useMemo(() => {
    // 종류별로 묶어 같은 궤도에 고르게 분포(이름 해시로 각도 + 약간의 반경 흔들림)
    const byKind: Record<string, Star[]> = {}
    for (const s of stars) (byKind[s.kind] ||= []).push(s)
    const pos: Record<string, { x: number; y: number }> = {}
    for (const def of KINDS) {
      const arr = byKind[def.key] || []
      arr.forEach((s, i) => {
        if (Number.isFinite(s.px) && Number.isFinite(s.py)) { pos[s.id] = { x: s.px as number, y: s.py as number }; return }
        const base = (i / Math.max(1, arr.length)) * Math.PI * 2
        const jitter = (hash01(s.id + s.name) - 0.5) * (Math.PI / Math.max(2, arr.length))
        const ang = base + jitter
        const rad = R * def.orbit + (hash01('r' + s.id) - 0.5) * R * 0.07
        pos[s.id] = { x: CX + Math.cos(ang) * rad, y: CY + Math.sin(ang) * rad }
      })
    }
    return pos
  }, [stars, R, CX, CY])

  // ── SVG 좌표 변환(viewBox 기준) ──
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const r = svg.getBoundingClientRect()
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H }
  }

  // ── 별 드래그 / 클릭(선택·연결) ──
  const onStarDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    if (linkMode) return
    const p = positions[id]
    if (!p) return
    const sp = toSvg(e.clientX, e.clientY)
    drag.current = { id, dx: sp.x - p.x, dy: sp.y - p.y, moved: false }
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return
      const cur = toSvg(ev.clientX, ev.clientY)
      const nx = Math.max(20, Math.min(W - 20, cur.x - d.dx))
      const ny = Math.max(20, Math.min(H - 20, cur.y - d.dy))
      d.moved = true
      setStars((prev) => prev.map((s) => (s.id === d.id ? { ...s, px: nx, py: ny } : s)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      dragListeners.current = null
      const d = drag.current; drag.current = null
      if (d && !d.moved) { setSel(d.id) }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    dragListeners.current = { move, up }
  }
  const onStarClick = (id: string) => {
    if (!linkMode) return
    if (linkFrom == null) { setLinkFrom(id); return }
    if (linkFrom === id) { setLinkFrom(null); return }
    const exists = links.some((l) => (l.a === linkFrom && l.b === id) || (l.a === id && l.b === linkFrom))
    if (!exists) { const nl: Link = { id: newId(), a: linkFrom, b: id, note: '' }; setLinks((prev) => [...prev, nl]); flash('두 별을 궤도로 이었어요.') }
    else flash('이미 이어진 별이에요.')
    setLinkFrom(null); setLinkMode(false)
  }

  // ── 선택 동기화 ──
  const selObj = stars.find((s) => s.id === sel) || null
  useEffect(() => {
    if (selObj) { setEditName(selObj.name); setEditNote(selObj.note); setEditSeed(selObj.seed || 'open') }
  }, [sel]) // eslint-disable-line

  const saveEdit = () => {
    if (!sel) return
    const nm = editName.trim()
    if (!nm) { flash('이름은 비울 수 없어요.'); return }
    setStars((prev) => prev.map((s) => (s.id === sel ? { ...s, name: nm.slice(0, 60), note: editNote.slice(0, 400), seed: s.kind === 'foreshadow' ? editSeed : s.seed } : s)))
    flash('저장했어요.')
  }
  const removeStar = (id: string) => {
    setStars((prev) => prev.filter((s) => s.id !== id))
    setLinks((prev) => prev.filter((l) => l.a !== id && l.b !== id))
    if (sel === id) setSel(null)
  }
  const removeLink = (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id))
  const relayout = () => { setStars((prev) => prev.map((s) => ({ ...s, px: undefined, py: undefined }))); flash('별 배치를 궤도 기준으로 정돈했어요.') }
  const clearAll = () => {
    if (!stars.length && !links.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('별자리를 모두 지울까요? 되돌릴 수 없습니다.')) return
    setStars([]); setLinks([]); setSel(null); setLinkFrom(null); setLinkMode(false)
  }

  // ── 종류별 관련 도구 열기(데이터 동반) ──
  const openRelated = (s: Star) => {
    const def = kindOf(s.kind)
    if (!def.tool) { flash('이 종류는 연결된 전용 도구가 없어요.'); return }
    if (s.kind === 'character') openToolLinked(def.tool, { character: { name: s.name, notes: s.note } })
    else if (s.kind === 'place') openToolLinked(def.tool, { place: { name: s.name, notes: s.note } })
    else openToolLinked(def.tool, { name: s.name, text: s.note })
    flash(`‘${def.toolLabel}’ 도구를 ‘${s.name}’ 정보와 함께 열었어요.`)
  }

  // ── 산출물 저장(라이브러리/프로젝트/수집함) ──
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const nameOf = (id: string) => stars.find((s) => s.id === id)?.name || '?'

  const buildHtml = (): string => {
    const out: string[] = []
    for (const def of KINDS) {
      const arr = stars.filter((s) => s.kind === def.key)
      if (!arr.length) continue
      out.push('<h2>' + esc(def.label) + '</h2><ul>')
      for (const s of arr) {
        const seed = s.kind === 'foreshadow' && s.seed ? ' [' + SEED_LABEL[s.seed] + ']' : ''
        out.push('<li>' + esc(s.name) + esc(seed) + (s.note ? ' — ' + esc(s.note) : '') + '</li>')
      }
      out.push('</ul>')
    }
    if (links.length) {
      out.push('<h2>연결</h2><ul>')
      for (const l of links) out.push('<li>' + esc(nameOf(l.a)) + ' — ' + esc(nameOf(l.b)) + (l.note ? ' (' + esc(l.note) + ')' : '') + '</li>')
      out.push('</ul>')
    }
    return out.join('\n')
  }
  const buildText = (): string => buildHtml().replace(/<\/(li|ul|h2)>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{2,}/g, '\n').trim()

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!stars.length) { flash('추가할 별이 없어요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '구상', title: '스토리 별자리 개요', bodyHtml: buildHtml() })
    flash(id ? '프로젝트 자료 › 구상 폴더에 별자리 개요를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }
  const toStash = () => {
    if (!hasStash()) { flash('수집함이 연결되어 있지 않아요.'); return }
    if (!stars.length) { flash('담을 별이 없어요.'); return }
    addToStash({ kind: 'memo', label: '스토리 별자리', text: buildText() })
    flash('수집함에 별자리 요약을 담았어요.')
  }
  // 선택한 인물/장소 별을 공유 라이브러리에 저장(다른 도구가 쓰도록)
  const selToLibrary = () => {
    if (!selObj) return
    if (selObj.kind === 'character') { addToLibrary('characters', { name: selObj.name, fields: { name: selObj.name, notes: selObj.note }, source: '스토리 별자리' }); flash('인물을 공유 라이브러리에 저장했어요.') }
    else if (selObj.kind === 'place') { addToLibrary('places', { name: selObj.name, fields: { name: selObj.name, notes: selObj.note }, source: '스토리 별자리' }); flash('장소를 공유 라이브러리에 저장했어요.') }
    else if (selObj.kind === 'snippet' || selObj.kind === 'event') { addToLibrary('snippets', { text: selObj.note || selObj.name, source: '스토리 별자리' }); flash('인용/사건을 공유 라이브러리에 저장했어요.') }
    else flash('이 종류는 라이브러리 저장 대상이 아니에요.')
  }
  const copyText = async () => {
    if (!stars.length) { flash('복사할 내용이 없어요.'); return }
    const txt = buildText()
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); flash('별자리를 텍스트로 복사했어요.'); return } throw new Error() }
    catch {
      try {
        const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        flash('별자리를 텍스트로 복사했어요.')
      } catch { flash('복사에 실패했어요.') }
    }
  }

  const addManual = () => {
    const id = addStar(draftKind, draftName)
    setDraftName('')
    if (id) { setSel(id); flash('') } else flash('같은 이름의 별이 이미 있어요.')
  }

  // ── 통계(요약 카드) ──
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of KINDS) counts[d.key] = 0
    for (const s of stars) counts[s.kind]++
    const seeds = stars.filter((s) => s.kind === 'foreshadow')
    const paid = seeds.filter((s) => s.seed === 'paid').length
    const planted = seeds.filter((s) => s.seed === 'planted').length
    const payoffRate = seeds.length ? Math.round((paid / seeds.length) * 100) : 0
    return { counts, seedTotal: seeds.length, paid, planted, payoffRate }
  }, [stars])

  const isEmpty = stars.length === 0
  const libTotal = libChars.length + libPlaces.length + libSnips.length

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const canvasBox: React.CSSProperties = { flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 50% 45%, #1b2233 0%, #0d111c 70%, #080a12 100%)' }
  const side: React.CSSProperties = { width: 240, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 11, display: 'flex', flexDirection: 'column', gap: 11, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const sInput: React.CSSProperties = { ...input, width: '100%' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  // 배경 장식 별(결정론적, 비상호작용) — 우주 느낌
  const bgStars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    x: hash01('bx' + i) * W, y: hash01('by' + i) * H, r: 0.6 + hash01('br' + i) * 1.8, o: 0.25 + hash01('bo' + i) * 0.5,
  })), [])

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -6 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      {dropActive && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '6px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>
          여기에 놓으면 별로 추가됩니다
        </div>
      )}

      {/* 상단 도구막대 */}
      <div style={topbar}>
        <select style={{ ...input, width: 80 }} value={draftKind} onChange={(e) => setDraftKind(e.target.value as Kind)} aria-label="별 종류">
          {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <input
          style={{ ...input, flex: 1, minWidth: 110 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManual() } }}
          placeholder="별 이름을 적고 Enter…"
          maxLength={60}
          aria-label="별 이름"
        />
        <button className="btn-primary" onClick={addManual} disabled={!draftName.trim()}>＋ 별</button>
        <button className="minibtn" onClick={importAll} disabled={!libTotal} title={libTotal ? `라이브러리 ${libTotal}개를 별자리에 모읍니다` : '라이브러리가 비어 있습니다'}>라이브러리 모으기{libTotal ? ` (${libTotal})` : ''}</button>
        <button className={'minibtn' + (linkMode ? ' active' : '')} onClick={() => { setLinkMode((v) => !v); setLinkFrom(null) }} disabled={stars.length < 2} title="두 별을 차례로 클릭해 궤도로 잇습니다">{linkMode ? '연결 중…' : '별 잇기'}</button>
        <button className="minibtn" onClick={relayout} disabled={isEmpty} title="궤도 기준으로 재배치">정돈</button>
      </div>

      {note && <div style={{ padding: '5px 10px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 별자리 캔버스 */}
        <div style={canvasBox}>
          {isEmpty ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#aeb6c8', fontSize: 13.5, lineHeight: 1.8, padding: 26 }}>
              <div>
                아직 별이 없어요.<br />
                위에서 종류를 고르고 이름을 적어 별을 만들거나,<br />
                <b style={{ color: '#fff' }}>라이브러리 모으기</b>로 인물·장소·인용을 한 번에 불러오세요.<br />
                좌측 바인더의 문서를 끌어다 놓아도 별이 됩니다.<br />
                별을 드래그해 배치하고 <b style={{ color: '#fff' }}>별 잇기</b>로 관계를 연결하세요.
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', display: 'block', cursor: linkMode ? 'crosshair' : 'default', userSelect: 'none', touchAction: 'none' }}
              onClick={() => { if (linkMode) { setLinkMode(false); setLinkFrom(null) } else setSel(null) }}
            >
              {/* 배경 장식 별 */}
              {bgStars.map((b, i) => <circle key={'bg' + i} cx={b.x} cy={b.y} r={b.r} fill="#cdd6ea" opacity={b.o} />)}
              {/* 궤도 가이드 링 */}
              {KINDS.map((d) => (visible[d.key] && (stars.some((s) => s.kind === d.key)) ? (
                <circle key={'orb' + d.key} cx={CX} cy={CY} r={R * d.orbit} fill="none" stroke={d.color} strokeOpacity={0.16} strokeWidth={1.2} strokeDasharray="3 7" />
              ) : null))}
              {/* 중심 핵 */}
              <circle cx={CX} cy={CY} r={9} fill="#fff" opacity={0.9} />
              <circle cx={CX} cy={CY} r={20} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={1} />

              {/* 연결선(궤도) */}
              {links.map((l) => {
                const a = positions[l.a], b = positions[l.b]
                const sa = stars.find((s) => s.id === l.a), sb = stars.find((s) => s.id === l.b)
                if (!a || !b || !sa || !sb || !visible[sa.kind] || !visible[sb.kind]) return null
                return (
                  <g key={l.id} style={{ cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); removeLink(l.id) }}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9fb0d6" strokeWidth={1.4} strokeOpacity={0.55} />
                  </g>
                )
              })}

              {/* 연결 시작 표시 */}
              {linkMode && linkFrom && positions[linkFrom] && (
                <circle cx={positions[linkFrom].x} cy={positions[linkFrom].y} r={20} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeDasharray="5 4" />
              )}

              {/* 별 노드 */}
              {stars.map((s) => {
                if (!visible[s.kind]) return null
                const p = positions[s.id]; if (!p) return null
                const def = kindOf(s.kind)
                const seld = sel === s.id
                const bright = 0.7 + hash01('b' + s.id) * 0.3
                // 복선 상태별 색조
                let fill = def.color
                if (s.kind === 'foreshadow') fill = s.seed === 'paid' ? '#5fd38a' : s.seed === 'planted' ? '#8a5cd6' : '#6b6f86'
                const rad = s.kind === 'snippet' ? 6 : 8.5
                return (
                  <g key={s.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: linkMode ? 'pointer' : 'grab' }}
                     onPointerDown={(e) => onStarDown(e, s.id)}
                     onClick={(e) => { e.stopPropagation(); onStarClick(s.id) }}>
                    {/* 광채 */}
                    <circle r={rad + 8} fill={fill} opacity={seld ? 0.35 : 0.16} />
                    {/* 4갈래 빛(별 모양 느낌) */}
                    <path d={`M0,${-rad - 7} L${rad * 0.32},${-rad * 0.32} L${rad + 7},0 L${rad * 0.32},${rad * 0.32} L0,${rad + 7} L${-rad * 0.32},${rad * 0.32} L${-rad - 7},0 L${-rad * 0.32},${-rad * 0.32} Z`} fill={fill} opacity={seld ? 0.9 : 0.55 * bright} />
                    <circle r={rad} fill={fill} stroke={seld ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={seld ? 2 : 1} opacity={bright} />
                    <text textAnchor="middle" y={rad + 16} fontSize={12} fontWeight={700} fill={seld ? '#fff' : '#d7deec'} style={{ pointerEvents: 'none' }}>
                      {s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        {/* 우측 패널 */}
        <div style={side}>
          {/* 요약 카드 */}
          <div style={card}>
            <div style={sLabel}>별자리 현황 · 총 {stars.length}개</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {KINDS.map((d) => (
                <button key={d.key} className="minibtn" onClick={() => setVisible((v) => ({ ...v, [d.key]: !v[d.key] }))}
                  title={visible[d.key] ? '숨기기' : '보이기'}
                  style={{ borderColor: d.color, opacity: visible[d.key] ? 1 : 0.4, fontSize: 11.5, padding: '3px 7px' }}>
                  <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: d.color, marginRight: 5, verticalAlign: 'middle' }} />
                  {d.label} {stats.counts[d.key]}
                </button>
              ))}
            </div>
            {stats.seedTotal > 0 && (
              <div style={{ ...hint, marginTop: 2 }}>
                복선 회수율 <b style={{ color: 'var(--text)' }}>{stats.payoffRate}%</b> — 거둠 {stats.paid} · 심음 {stats.planted} · 전체 {stats.seedTotal}
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: stats.payoffRate + '%', height: '100%', background: '#5fd38a' }} />
                </div>
              </div>
            )}
          </div>

          {/* 라이브러리 개별 불러오기 */}
          <div style={card}>
            <div style={sLabel}>라이브러리에서 불러오기</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => importLib('character')} disabled={!libChars.length}>인물 {libChars.length}</button>
              <button className="minibtn" onClick={() => importLib('place')} disabled={!libPlaces.length}>장소 {libPlaces.length}</button>
              <button className="minibtn" onClick={() => importLib('snippet')} disabled={!libSnips.length}>인용 {libSnips.length}</button>
            </div>
            <div style={hint}>다른 도구(인물 시트·배경 설정집 등)가 저장한 항목을 별로 흡수합니다.</div>
          </div>

          {/* 선택 별 편집 */}
          {selObj ? (
            <div style={card}>
              <div style={sLabel}>{kindOf(selObj.kind).label} 별 편집</div>
              <input style={sInput} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} placeholder="이름" aria-label="별 이름 수정" />
              <textarea style={{ ...sInput, resize: 'vertical', minHeight: 56, fontFamily: 'inherit', lineHeight: 1.5 }} value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={400} placeholder="설명/메모" aria-label="별 메모 수정" />
              {selObj.kind === 'foreshadow' && (
                <div>
                  <div style={sLabel}>복선 상태</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {(['planted', 'paid', 'open'] as SeedState[]).map((st) => (
                      <button key={st} className="minibtn" onClick={() => setEditSeed(st)} style={{ flex: 1, borderWidth: 2, borderColor: editSeed === st ? 'var(--accent)' : 'var(--border)', fontWeight: editSeed === st ? 700 : 400 }}>{SEED_LABEL[st]}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveEdit}>저장</button>
                <button className="minibtn" onClick={() => removeStar(selObj.id)} title="이 별 삭제">삭제</button>
              </div>
              <div className="linkbar" style={{ marginTop: 2 }}>
                <button className="linkbtn" onClick={() => openRelated(selObj)} disabled={!kindOf(selObj.kind).tool} title="이 별과 관련된 전용 도구를 데이터와 함께 엽니다">{kindOf(selObj.kind).toolLabel || '전용 도구 없음'} 열기</button>
                <button className="linkbtn" onClick={selToLibrary} title="이 별을 공유 라이브러리에 저장">라이브러리에 저장</button>
              </div>
              <div style={hint}>연결된 궤도선을 클릭하면 연결이 끊어집니다.</div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>{linkMode ? '이을 두 별을 차례로 클릭하세요. 빈 곳을 누르면 취소됩니다.' : '별을 클릭하면 여기서 편집·연결하고, 종류별 전용 도구를 데이터와 함께 열 수 있어요.'}</div>
            </div>
          )}

          {/* 산출물 */}
          <div style={card}>
            <div style={sLabel}>내보내기</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="linkbtn" onClick={toProject} disabled={isEmpty || !hasProjectBridge()} title={hasProjectBridge() ? '별자리 개요를 프로젝트 바인더에 추가' : '프로젝트에 연결되어 있지 않아요'}>프로젝트에 추가</button>
              <button className="linkbtn" onClick={toStash} disabled={isEmpty || !hasStash()} title="수집함에 별자리 요약 담기">수집함에 담기</button>
              <button className="minibtn" onClick={copyText} disabled={isEmpty} title="텍스트로 복사">복사</button>
              <button className="minibtn" onClick={clearAll} disabled={isEmpty} title="전체 삭제">전체 비우기</button>
            </div>
          </div>

          <div style={hint}>모든 별·연결·배치는 이 브라우저에 자동 저장됩니다. 인물/장소 별은 종류별 전용 도구와 공유 라이브러리로 양방향 연동돼요.</div>
        </div>
      </div>
    </div>
  )
}
