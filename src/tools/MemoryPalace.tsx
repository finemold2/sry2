// 기억의 궁전(Memory Palace) — 설정·단서·복선을 가상 공간(방)에 배치하는 기억술 보드.
//  · 방(loci): 평면도 위에 자유 배치/이동(드래그)되는 사각형 공간. 각 방은 하나의 테마(예: 1막, 마을, 주인공의 과거).
//  · 사물(앵커): 방 안에 배치되는 기억 항목 — 설정/단서/복선/회수예정/회수됨/포기. 각 항목은 회차·연관 인물·장소·메모를 가진다.
//  · 기억의 여정(walk): 방을 정해진 순서로 잇는 동선을 평면도 위에 선으로 시각화 — 기억술의 핵심(머릿속 산책 경로).
//  · 복선 대시보드: 미회수/회수예정/회수됨 집계, 가장 오래 묵은 미회수 복선(연재 장기 추적 경고), 회차 범위.
//  · 평면도 SVG 시각화: 방·사물·여정선·강조. 작은 창에서도 비율 유지(viewBox).
//  · 연동: 장소 라이브러리 수용/저장, 좌측 바인더 문서 드롭(방으로), payload 수용, 스니펫/프로젝트/수집함 내보내기, 관련 도구 열기.
// 자급식: react/linkbus 외 import 없음. 전부 로컬 결정론. localStorage 'sry:tool:memory-palace' 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary, useLibraryList,
  getDragItem, isItemDrag,
  openToolLinked,
  PLACE_FIELD_LABEL,
  type SharedCharacter, type SharedPlace,
} from './linkbus'

export const meta = {
  id: 'memory-palace',
  name: '기억의 궁전',
  icon: '🏛️',
  group: '연재·구조',
  intro: '설정·단서·복선을 가상의 방에 배치하는 기억술 보드 — 연재 장기 복선 추적, 평면도·기억 동선 시각화',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:memory-palace'

type AnchorKind = 'setting' | 'clue' | 'seed' | 'pending' | 'paid' | 'dropped'
// setting 설정/세계관 · clue 단서 · seed 복선(심음) · pending 회수예정 · paid 회수됨 · dropped 포기
const ANCHOR_KO: Record<AnchorKind, string> = {
  setting: '설정', clue: '단서', seed: '복선', pending: '회수예정', paid: '회수됨', dropped: '포기',
}
const ANCHOR_ORDER: AnchorKind[] = ['setting', 'clue', 'seed', 'pending', 'paid', 'dropped']
// 복선 라이프사이클로 간주되는 종류(미회수 추적 대상)
const FORESHADOW_KINDS: AnchorKind[] = ['seed', 'pending']

interface Anchor {
  id: string
  text: string
  kind: AnchorKind
  chapter: number        // 등장(심은) 회차. 0=미입력
  payoffChapter: number  // 회수 회차. 0=미입력
  links: string[]        // 연관 인물/장소 이름
  note: string
}
interface Room {
  id: string
  name: string
  x: number              // 0~100 (평면도 비율 좌표)
  y: number              // 0~100
  hue: number            // 0~360 색조(결정론적: 이름 해시)
  anchors: Anchor[]
}
interface SaveShape {
  title: string
  rooms: Room[]
  walk: string[]         // 방 id 순서(기억의 여정)
  selRoom: string | null
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function str(v: unknown): string { return typeof v === 'string' ? v : '' }
function num(v: unknown): number { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : 0 }
function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)) }
function clampInt(n: number, lo: number, hi: number): number { return clamp(Math.round(n), lo, hi) }
function isKind(v: unknown): v is AnchorKind { return ANCHOR_ORDER.includes(v as AnchorKind) }

// 결정론적 문자열 해시 → 색조(0~360). 같은 방 이름은 항상 같은 색.
function hashHue(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h) % 360
}

// ── 평면도 SVG(파일 최상위 컴포넌트 — 매 렌더 재정의로 인한 churn 방지) ──
function Floorplan(props: {
  svgRef: React.Ref<SVGSVGElement>
  rooms: Room[]
  orderedWalkRooms: Room[]
  selRoom: string | null
  showWalk: boolean
  startRoomDrag: (id: string) => (e: React.MouseEvent) => void
}) {
  const { svgRef, rooms, orderedWalkRooms, selRoom, showWalk, startRoomDrag } = props
  const W = 100, H = 70 // viewBox 단위(좌표는 x:0~100, y:0~100을 H로 매핑)
  const px = (x: number) => x
  const py = (y: number) => (y / 100) * H
  const walkPts = orderedWalkRooms.map((r) => ({ x: px(r.x), y: py(r.y) }))
  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`, touchAction: 'none' }}
        role="img"
        aria-label="기억의 궁전 평면도"
      >
        {/* 격자 배경 */}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={'v' + i} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={H} stroke="var(--border)" strokeWidth={0.15} opacity={0.5} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={'h' + i} x1={0} y1={(i + 1) * 10} x2={W} y2={(i + 1) * 10} stroke="var(--border)" strokeWidth={0.15} opacity={0.5} />
        ))}
        {/* 기억의 여정 선 */}
        {showWalk && walkPts.length >= 2 && (
          <polyline
            points={walkPts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--accent)" strokeWidth={0.7} strokeDasharray="2 1.4" opacity={0.85} strokeLinejoin="round"
          />
        )}
        {showWalk && walkPts.length >= 1 && (
          <circle cx={walkPts[0].x} cy={walkPts[0].y} r={1.6} fill="var(--accent)" />
        )}
        {/* 방들 */}
        {rooms.map((r) => {
          const cx = px(r.x), cy = py(r.y)
          const w = 17, h = 8.5
          const open = r.anchors.filter((a) => FORESHADOW_KINDS.includes(a.kind)).length
          const sel = r.id === selRoom
          return (
            <g key={r.id} onMouseDown={startRoomDrag(r.id)} style={{ cursor: 'grab' }}>
              <rect
                x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={1.6}
                fill={`hsl(${r.hue} 55% 50% / ${sel ? 0.34 : 0.18})`}
                stroke={sel ? 'var(--accent)' : `hsl(${r.hue} 55% 55%)`}
                strokeWidth={sel ? 0.7 : 0.4}
              />
              <text x={cx} y={cy - 0.2} textAnchor="middle" fontSize={2.5} fontWeight={700} fill="var(--text)" style={{ pointerEvents: 'none' }}>
                {r.name.length > 9 ? r.name.slice(0, 8) + '…' : r.name}
              </text>
              <text x={cx} y={cy + 2.9} textAnchor="middle" fontSize={1.9} fill="var(--muted)" style={{ pointerEvents: 'none' }}>
                항목 {r.anchors.length}{open ? ` · 미회수 ${open}` : ''}
              </text>
              {open > 0 && <circle cx={cx + w / 2 - 1.4} cy={cy - h / 2 + 1.4} r={1.1} fill="var(--warn)" />}
            </g>
          )
        })}
      </svg>
      {rooms.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6, padding: 16 }}>
          아직 방이 없어요. 아래에서 방을 추가하거나<br />좌측 바인더 문서를 이 창에 끌어다 놓으세요.
        </div>
      )}
    </div>
  )
}

function migrateAnchor(r: Record<string, unknown>): Anchor {
  return {
    id: String(r.id || newId()),
    text: str(r.text).slice(0, 400),
    kind: isKind(r.kind) ? r.kind : 'setting',
    chapter: clampInt(num(r.chapter), 0, 100000),
    payoffChapter: clampInt(num(r.payoffChapter), 0, 100000),
    links: Array.isArray(r.links) ? (r.links as unknown[]).map((t) => str(t)).filter(Boolean) : [],
    note: str(r.note).slice(0, 400),
  }
}

function load(): SaveShape {
  const empty: SaveShape = { title: '', rooms: [], walk: [], selRoom: null }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const rooms: Room[] = Array.isArray(p.rooms)
      ? p.rooms.filter((r: unknown) => r && typeof r === 'object').map((r: Record<string, unknown>) => {
          const name = str(r.name) || '이름 없는 방'
          return {
            id: String(r.id || newId()),
            name: name.slice(0, 60),
            x: clamp(num(r.x), 2, 98),
            y: clamp(num(r.y), 2, 98),
            hue: Number.isFinite(num(r.hue)) && num(r.hue) > 0 ? clamp(num(r.hue), 0, 360) : hashHue(name),
            anchors: Array.isArray(r.anchors) ? (r.anchors as Record<string, unknown>[]).map(migrateAnchor) : [],
          }
        })
      : []
    const ids = new Set(rooms.map((r) => r.id))
    const walk: string[] = Array.isArray(p.walk) ? (p.walk as unknown[]).map((x) => str(x)).filter((id) => ids.has(id)) : []
    const selRoom = typeof p.selRoom === 'string' && ids.has(p.selRoom) ? p.selRoom : (rooms[0]?.id ?? null)
    return { title: str(p.title), rooms, walk, selRoom }
  } catch { return empty }
}

export default function MemoryPalace({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>(load())
  const [title, setTitle] = useState(init.current.title)
  const [rooms, setRooms] = useState<Room[]>(init.current.rooms)
  const [walk, setWalk] = useState<string[]>(init.current.walk)
  const [selRoom, setSelRoom] = useState<string | null>(init.current.selRoom)

  const [newRoomName, setNewRoomName] = useState('')
  const [aText, setAText] = useState('')
  const [aKind, setAKind] = useState<AnchorKind>('seed')
  const [aChapter, setAChapter] = useState('')

  const [editAnchor, setEditAnchor] = useState<string | null>(null)
  const [showWalk, setShowWalk] = useState(true)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const characters = useLibraryList('characters') as SharedCharacter[]
  const places = useLibraryList('places') as SharedPlace[]
  const linkOptions = useMemo(() => {
    const s = new Set<string>()
    characters.forEach((c) => { if (c.name?.trim()) s.add(c.name.trim()) })
    places.forEach((p) => { if (p.name?.trim()) s.add(p.name.trim()) })
    return Array.from(s)
  }, [characters, places])

  // ── payload 수용(연계로 열렸을 때) ─────────────────────────────
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const text = (str(p.text) || str(p.desc) || str(p.note)).trim()
    if (!text) return
    const roomName = (str(p.room) || str(p.place) || '도착의 방').slice(0, 60)
    const kind: AnchorKind = isKind(p.kind) ? p.kind : 'seed'
    const anchor: Anchor = {
      id: newId(), text: text.slice(0, 400), kind,
      chapter: clampInt(num(p.chapter), 0, 100000), payoffChapter: 0, links: [], note: '',
    }
    // 기존 방 유무는 현재 상태(init.current.rooms)에서 판단해, room 생성을 updater 밖에서 처리.
    const existing = init.current.rooms.find((r) => r.name === roomName)
    const room = existing || makeRoom(roomName, init.current.rooms)
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.name === roomName)
      if (idx >= 0) {
        return prev.map((r, i) => i === idx ? { ...r, anchors: [...r.anchors, anchor] } : r)
      }
      return [...prev, { ...room, anchors: [...room.anchors, anchor] }]
    })
    if (!existing) {
      setWalk((w) => [...w, room.id])
      setSelRoom(room.id)
    }
    setFlash('연계 데이터를 방에 배치했어요.')
  }, [payload])

  // ── 저장 ───────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, rooms, walk, selRoom } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침 시 내용이 사라질 수 있어요.') }
  }, [title, rooms, walk, selRoom])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => { if (mounted.current) setFlash('') }, 1900)
    return () => clearTimeout(t)
  }, [flash])

  // ── 방 생성 도우미(겹치지 않게 빈 칸 탐색) ──────────────────────
  function makeRoom(name: string, existing: Room[]): Room {
    // 격자 후보 중 기존 방과 가장 먼 자리 선택(결정론적, 이름 해시로 시작점)
    const pts: Array<{ x: number; y: number }> = []
    for (let gy = 18; gy <= 82; gy += 16) for (let gx = 16; gx <= 84; gx += 17) pts.push({ x: gx, y: gy })
    const seed = hashHue(name)
    const ordered = pts.map((pt, i) => ({ pt, key: (i + seed) % pts.length }))
    ordered.sort((a, b) => a.key - b.key)
    let best = ordered[0].pt
    let bestDist = -1
    for (const o of ordered) {
      let mind = Infinity
      for (const r of existing) { const d = (r.x - o.pt.x) ** 2 + (r.y - o.pt.y) ** 2; if (d < mind) mind = d }
      const d = existing.length ? mind : 1e9
      if (d > bestDist) { bestDist = d; best = o.pt }
    }
    return { id: newId(), name, x: best.x, y: best.y, hue: hashHue(name), anchors: [] }
  }

  // ── 파생: 통계/대시보드 ────────────────────────────────────────
  const allAnchors = useMemo(() => rooms.flatMap((r) => r.anchors.map((a) => ({ a, room: r }))), [rooms])

  const stats = useMemo(() => {
    const by: Record<AnchorKind, number> = { setting: 0, clue: 0, seed: 0, pending: 0, paid: 0, dropped: 0 }
    let minCh = Infinity, maxCh = -Infinity
    allAnchors.forEach(({ a }) => {
      by[a.kind]++
      if (a.chapter) { minCh = Math.min(minCh, a.chapter); maxCh = Math.max(maxCh, a.chapter) }
      if (a.payoffChapter) { minCh = Math.min(minCh, a.payoffChapter); maxCh = Math.max(maxCh, a.payoffChapter) }
    })
    const open = by.seed + by.pending
    const fsTotal = open + by.paid + by.dropped
    const rate = fsTotal ? Math.round((by.paid / fsTotal) * 100) : 0
    return {
      total: allAnchors.length, by, open, paid: by.paid, dropped: by.dropped, fsTotal, rate,
      minCh: Number.isFinite(minCh) ? minCh : 0, maxCh: Number.isFinite(maxCh) ? maxCh : 0,
    }
  }, [allAnchors])

  // 가장 오래 묵은 미회수 복선(현재 최신 회차 기준 경과 회차) — 연재 장기 추적 핵심
  const staleSeeds = useMemo(() => {
    const cur = stats.maxCh
    return allAnchors
      .filter(({ a }) => FORESHADOW_KINDS.includes(a.kind) && a.chapter > 0)
      .map(({ a, room }) => ({ a, room, age: Math.max(0, cur - a.chapter) }))
      .sort((x, y) => y.age - x.age)
      .slice(0, 4)
  }, [allAnchors, stats.maxCh])

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selRoom) || null, [rooms, selRoom])

  // ── 방 CRUD ────────────────────────────────────────────────────
  const addRoom = (preset?: string) => {
    const name = (preset ?? newRoomName).trim()
    if (!name) return
    const room = makeRoom(name.slice(0, 60), rooms)
    setRooms((prev) => [...prev, room])
    setWalk((w) => [...w, room.id])
    setSelRoom(room.id)
    if (!preset) setNewRoomName('')
  }
  const onRoomKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addRoom() } }

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
    setWalk((w) => w.filter((x) => x !== id))
    if (selRoom === id) setSelRoom((s) => (s === id ? null : s))
  }
  const renameRoom = (id: string, name: string) => {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, name: name.slice(0, 60), hue: hashHue(name || r.name) } : r))
  }
  const moveRoomXY = (id: string, x: number, y: number) => {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, x: clamp(x, 3, 97), y: clamp(y, 4, 96) } : r))
  }

  // 방을 장소 라이브러리로 저장(정규 PLACE 필드)
  const roomToPlace = (room: Room) => {
    const fields: Record<string, string> = {}
    fields.name = room.name
    const settings = room.anchors.filter((a) => a.kind === 'setting').map((a) => a.text)
    if (settings.length) fields.appearance = settings.join('\n')
    const secrets = room.anchors.filter((a) => FORESHADOW_KINDS.includes(a.kind)).map((a) => a.text)
    if (secrets.length) fields.secrets = secrets.join('\n')
    const notes = room.anchors.filter((a) => a.kind === 'clue').map((a) => a.text)
    if (notes.length) fields.notes = notes.join('\n')
    addToLibrary('places', { name: room.name, kind: '기억의 방', fields, source: '기억의 궁전' })
    setFlash(`'${room.name}'을(를) 장소 라이브러리에 저장했어요.`)
  }
  // 장소 라이브러리 → 방으로 가져오기
  const placeToRoom = (p: SharedPlace) => {
    const name = (p.name || '장소').trim().slice(0, 60)
    if (rooms.some((r) => r.name === name)) { setNote(`'${name}' 방이 이미 있어요.`); return }
    const room = makeRoom(name, rooms)
    const f = p.fields || {}
    const anchors: Anchor[] = []
    const push = (text: string, kind: AnchorKind) => { if (text.trim()) anchors.push({ id: newId(), text: text.trim().slice(0, 400), kind, chapter: 0, payoffChapter: 0, links: [], note: '' }) }
    if (f.appearance) push(f.appearance, 'setting')
    if (f.secrets) push(f.secrets, 'seed')
    if (f.atmosphere) push(`분위기: ${f.atmosphere}`, 'setting')
    room.anchors = anchors
    setRooms((prev) => [...prev, room])
    setWalk((w) => [...w, room.id])
    setSelRoom(room.id)
    setFlash(`'${name}'을(를) 방으로 가져왔어요.`)
  }

  // ── 사물(앵커) CRUD ────────────────────────────────────────────
  const addAnchor = () => {
    if (!selectedRoom) { setNote('먼저 방을 선택하거나 만들어 주세요.'); return }
    const text = aText.trim()
    if (!text) return
    const ch = aChapter.trim() ? clampInt(num(aChapter), 0, 100000) : 0
    setRooms((prev) => prev.map((r) => r.id === selectedRoom.id ? {
      ...r, anchors: [...r.anchors, { id: newId(), text: text.slice(0, 400), kind: aKind, chapter: ch, payoffChapter: 0, links: [], note: '' }],
    } : r))
    setAText(''); setAChapter('')
  }
  const onAnchorKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAnchor() } }

  const updateAnchor = (roomId: string, anchorId: string, patch: Partial<Anchor>) => {
    setRooms((prev) => prev.map((r) => r.id === roomId ? {
      ...r, anchors: r.anchors.map((a) => a.id === anchorId ? { ...a, ...patch } : a),
    } : r))
  }
  const removeAnchor = (roomId: string, anchorId: string) => {
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, anchors: r.anchors.filter((a) => a.id !== anchorId) } : r))
    if (editAnchor === anchorId) setEditAnchor(null)
  }
  // 복선 라이프사이클 순환: seed -> pending -> paid -> dropped -> seed
  const cycleAnchorKind = (roomId: string, a: Anchor) => {
    const cycle: AnchorKind[] = ['seed', 'pending', 'paid', 'dropped']
    let nextKind: AnchorKind
    if (!cycle.includes(a.kind)) nextKind = 'seed'
    else { const i = cycle.indexOf(a.kind); nextKind = cycle[(i + 1) % cycle.length] }
    updateAnchor(roomId, a.id, { kind: nextKind })
  }
  const toggleLink = (roomId: string, a: Anchor, name: string) => {
    const links = a.links.includes(name) ? a.links.filter((x) => x !== name) : [...a.links, name]
    updateAnchor(roomId, a.id, { links })
  }

  // 단건 사물 -> 스니펫
  const anchorToSnippet = (a: Anchor, roomName: string) => {
    const ch = a.chapter ? ` (${a.chapter}화)` : ''
    const po = a.payoffChapter ? ` -> 회수 ${a.payoffChapter}화` : ''
    const line = `[${ANCHOR_KO[a.kind]}/${roomName}${ch}${po}] ${a.text}`
    addToLibrary('snippets', { text: line, source: '기억의 궁전', tags: ['기억의궁전', ANCHOR_KO[a.kind], roomName, ...a.links] })
    setFlash('스니펫 라이브러리에 저장했어요.')
  }

  // ── 기억의 여정(walk) 편집 ─────────────────────────────────────
  const moveWalk = (id: string, dir: -1 | 1) => {
    setWalk((prev) => {
      const i = prev.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const orderedWalkRooms = useMemo(() => walk.map((id) => rooms.find((r) => r.id === id)).filter(Boolean) as Room[], [walk, rooms])

  // ── 드롭(좌측 바인더 문서 → 방) ────────────────────────────────
  const onDrop = (ev: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(ev)
    if (!item) return
    ev.preventDefault()
    const name = (item.title || '문서').trim().slice(0, 60)
    const body = (item.text || '').trim()
    const room = makeRoom(name, rooms)
    const anchors: Anchor[] = []
    if (body) {
      // 문단 단위로 잘라 최대 6개 단서로 배치
      body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).slice(0, 6).forEach((para) => {
        anchors.push({ id: newId(), text: para.slice(0, 300), kind: 'clue', chapter: 0, payoffChapter: 0, links: [], note: '' })
      })
    }
    room.anchors = anchors
    setRooms((prev) => [...prev, room])
    setWalk((w) => [...w, room.id])
    setSelRoom(room.id)
    setFlash(`바인더 문서 '${name}'을(를) 방으로 만들었어요.`)
  }
  const onDragOver = (ev: React.DragEvent) => { if (isItemDrag(ev)) { ev.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ── 내보내기 ───────────────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const anchorLine = (a: Anchor) => {
    const ch = a.chapter ? ` [${a.chapter}화${a.payoffChapter ? '->' + a.payoffChapter + '화' : ''}]` : ''
    const lk = a.links.length ? ` {${a.links.join(', ')}}` : ''
    return `(${ANCHOR_KO[a.kind]})${ch} ${a.text}${lk}${a.note.trim() ? ` // ${a.note.trim()}` : ''}`
  }
  const buildText = (): string => {
    const L: string[] = []
    L.push(title.trim() ? `[기억의 궁전] ${title.trim()}` : '[기억의 궁전]')
    L.push(`방 ${rooms.length} · 항목 ${stats.total} · 미회수 복선 ${stats.open} · 회수 ${stats.paid} · 복선 회수율 ${stats.rate}%`)
    if (orderedWalkRooms.length) L.push(`기억의 여정: ${orderedWalkRooms.map((r) => r.name).join(' -> ')}`)
    L.push('')
    const seq = orderedWalkRooms.length === rooms.length ? orderedWalkRooms : rooms
    seq.forEach((r, i) => {
      L.push(`${i + 1}. ${r.name}`)
      if (r.anchors.length === 0) L.push('   (비어 있음)')
      r.anchors.forEach((a) => L.push(`   - ${anchorLine(a)}`))
    })
    if (staleSeeds.length && staleSeeds[0].age > 0) {
      L.push('')
      L.push('오래 묵은 미회수 복선:')
      staleSeeds.forEach((s) => { if (s.age > 0) L.push(`   - ${s.room.name}: ${s.a.text} (${s.a.chapter}화 심음, ${s.age}화 경과)`) })
    }
    return L.join('\n')
  }
  const buildBodyHtml = (): string => {
    const P: string[] = []
    if (title.trim()) P.push(`<p><em>${esc(title.trim())}</em></p>`)
    P.push(`<p>방 ${rooms.length} · 항목 ${stats.total} · 미회수 복선 ${stats.open} · 회수율 ${stats.rate}%</p>`)
    if (orderedWalkRooms.length) P.push(`<p>기억의 여정: ${esc(orderedWalkRooms.map((r) => r.name).join(' -> '))}</p>`)
    const seq = orderedWalkRooms.length === rooms.length ? orderedWalkRooms : rooms
    if (seq.length === 0) { P.push('<p>(방 없음)</p>'); return P.join('') }
    seq.forEach((r) => {
      P.push(`<h3>${esc(r.name)}</h3>`)
      if (r.anchors.length === 0) { P.push('<p>(비어 있음)</p>'); return }
      P.push('<ul>')
      r.anchors.forEach((a) => P.push(`<li><strong>${esc(ANCHOR_KO[a.kind])}</strong>${a.chapter ? ` (${a.chapter}화${a.payoffChapter ? '->' + a.payoffChapter + '화' : ''})` : ''}: ${esc(a.text)}${a.links.length ? ` <em>[${esc(a.links.join(', '))}]</em>` : ''}</li>`))
      P.push('</ul>')
    })
    return P.join('')
  }

  const copy = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setFlash('전체 궁전을 클립보드에 복사했어요.')
    } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `기억의 궁전 — ${title.trim()}` : '기억의 궁전',
      bodyHtml: buildBodyHtml(),
      synopsis: `방 ${rooms.length} · 미회수 복선 ${stats.open} · 회수율 ${stats.rate}%`,
      meta: { 방: String(rooms.length), 항목: String(stats.total), 미회수복선: String(stats.open), 회수: String(stats.paid), 회수율: `${stats.rate}%` },
    })
    setFlash(id ? '프로젝트 자료(구조)에 추가했어요.' : '프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    if (!hasStash()) { setNote('수집함이 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'memo', label: title.trim() ? `기억의 궁전 — ${title.trim()}` : '기억의 궁전', text: buildText() })
    setFlash('수집함에 궁전 요약을 담았어요.')
  }
  const openForeshadow = () => {
    // 미회수 복선들을 복선 장부로 전달(첫 항목 시드)
    const first = allAnchors.find(({ a }) => FORESHADOW_KINDS.includes(a.kind))
    openToolLinked('foreshadow-ledger', first ? { desc: first.a.text, setupLabel: first.a.chapter ? `${first.a.chapter}화` : '', setupAt: first.a.chapter, weight: first.a.kind === 'pending' ? 3 : 2 } : {})
    setFlash('복선 장부를 열었어요.')
  }
  const openSettingBible = () => {
    const r = selectedRoom
    openToolLinked('setting-bible', r ? { name: r.name, text: r.anchors.filter((a) => a.kind === 'setting').map((a) => a.text).join('\n') } : {})
  }

  // ── 평면도 드래그(SVG) ─────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRoom = useRef<string | null>(null)
  const ptFromEvent = (clientX: number, clientY: number): { x: number; y: number } => {
    const el = svgRef.current
    if (!el) return { x: 50, y: 50 }
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100
    const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * 100
    return { x: clamp(x, 3, 97), y: clamp(y, 4, 96) }
  }
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRoom.current) return
      const { x, y } = ptFromEvent(e.clientX, e.clientY)
      moveRoomXY(dragRoom.current, x, y)
    }
    const onUp = () => { dragRoom.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  const startRoomDrag = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); dragRoom.current = id; setSelRoom(id) }

  const ROOM_PRESETS = ['1막 · 발단', '2막 · 대결', '3막 · 해결', '주인공의 과거', '비밀의 방', '떡밥 창고']

  // ── 스타일 ─────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, fontSize: 13, padding: '7px 9px' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '20px 8px' }
  const chip = (border: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: `1px solid ${border}`, color: 'var(--text)' })
  const seg = (active: boolean): React.CSSProperties => ({ padding: '5px 11px', fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: 'pointer', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--text)' })

  const kindColor = (k: AnchorKind): string => {
    switch (k) {
      case 'setting': return 'var(--muted)'
      case 'clue': return 'var(--accent)'
      case 'seed': return 'var(--warn)'
      case 'pending': return '#d97706'
      case 'paid': return 'var(--ok)'
      case 'dropped': return 'var(--border)'
    }
  }
  const kindBadge = (k: AnchorKind): React.CSSProperties => ({ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 7, padding: '3px 8px', background: kindColor(k), cursor: 'pointer', whiteSpace: 'nowrap', border: 'none' })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }} aria-hidden>{meta.icon}</span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/연재 제목 (선택)" maxLength={80} aria-label="제목" />
        <button className="minibtn" onClick={copy} title="전체 복사">복사</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {flash && <div style={{ fontSize: 11.5, color: 'var(--ok)', padding: '6px 14px 0' }}>{flash}</div>}

      <div
        style={{ ...body, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -6 }}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      >
        <div style={hint}>
          <strong style={{ color: 'var(--text)' }}>기억의 궁전</strong> — 설정·단서·복선을 가상의 방에 배치해 머릿속 지도로 관리합니다.
          방을 끌어 자리를 옮기고, 점선은 기억의 여정(산책 경로)입니다. 미회수 복선이 있는 방엔 경고 점이 켜집니다.
        </div>

        {/* 평면도 */}
        <Floorplan
          svgRef={svgRef}
          rooms={rooms}
          orderedWalkRooms={orderedWalkRooms}
          selRoom={selRoom}
          showWalk={showWalk}
          startRoomDrag={startRoomDrag}
        />

        {/* 대시보드 */}
        <div style={panel}>
          <div style={sectionTitle}>복선 대시보드</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <span style={chip('var(--border)')}>방 {rooms.length}</span>
            <span style={chip('var(--border)')}>항목 {stats.total}</span>
            <span style={chip('var(--warn)')}>미회수 {stats.open}</span>
            <span style={chip('var(--ok)')}>회수 {stats.paid}</span>
            {stats.maxCh > 0 && <span style={chip('var(--border)')}>회차 {stats.minCh > 0 && stats.minCh < stats.maxCh ? `${stats.minCh}~${stats.maxCh}` : stats.maxCh}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
            <span>복선 회수율</span><span style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.rate}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ width: `${stats.rate}%`, height: '100%', background: 'var(--ok)', transition: 'width .3s' }} />
          </div>
          {staleSeeds.length > 0 && staleSeeds[0].age > 0 && (
            <div style={{ marginTop: 10, background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 10, padding: '9px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)', marginBottom: 5 }}>오래 묵은 미회수 복선(연재 장기 추적)</div>
              {staleSeeds.filter((s) => s.age > 0).map((s) => (
                <div key={s.a.id} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 2 }}>
                  <button className="minibtn" style={{ padding: '0 6px', marginRight: 6 }} onClick={() => setSelRoom(s.room.id)} title="이 방으로 이동">{s.room.name}</button>
                  <span style={{ wordBreak: 'break-word' }}>{s.a.text.slice(0, 50)}</span>
                  <span style={{ color: 'var(--warn)', fontWeight: 700 }}> · {s.age}화 경과</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 방 추가 */}
        <div style={panel}>
          <div style={sectionTitle}>방 만들기</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={input} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} onKeyDown={onRoomKey} placeholder="방 이름 (예: 비밀의 서재)" maxLength={60} aria-label="방 이름" />
            <button className="btn-primary" onClick={() => addRoom()} disabled={!newRoomName.trim()} style={{ flexShrink: 0 }}>추가</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {ROOM_PRESETS.map((p) => (
              <button key={p} className="minibtn" style={{ fontSize: 11.5 }} onClick={() => addRoom(p)} disabled={rooms.some((r) => r.name === p)} title="이 이름의 방 추가">{p}</button>
            ))}
          </div>
          {places.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ ...hint, marginBottom: 4 }}>장소 라이브러리에서 방 가져오기</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {places.slice(0, 10).map((p) => (
                  <button key={p.id} className="minibtn" style={{ fontSize: 11.5 }} onClick={() => placeToRoom(p)} disabled={rooms.some((r) => r.name === (p.name || '').trim())}>{p.name || '이름 없는 장소'}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 선택된 방 편집 */}
        {selectedRoom ? (
          <div style={panel}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: `hsl(${selectedRoom.hue} 55% 52%)`, flexShrink: 0 }} aria-hidden />
              <input style={{ ...smallInput, fontWeight: 700 }} value={selectedRoom.name} onChange={(e) => renameRoom(selectedRoom.id, e.target.value)} maxLength={60} aria-label="방 이름 수정" />
              <button className="minibtn" onClick={() => roomToPlace(selectedRoom)} title="장소 라이브러리에 저장">장소저장</button>
              <button className="minibtn" onClick={() => removeRoom(selectedRoom.id)} title="방 삭제">삭제</button>
            </div>

            {/* 사물(앵커) 추가 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              <input style={input} value={aText} onChange={(e) => setAText(e.target.value)} onKeyDown={onAnchorKey} placeholder="이 방에 배치할 설정·단서·복선" maxLength={400} aria-label="항목 내용" />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ANCHOR_ORDER.map((k) => (
                    <button key={k} style={seg(aKind === k)} onClick={() => setAKind(k)} title={`종류: ${ANCHOR_KO[k]}`}>{ANCHOR_KO[k]}</button>
                  ))}
                </div>
                <input style={{ ...smallInput, flex: '0 0 84px', minWidth: 70 }} value={aChapter} onChange={(e) => setAChapter(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={onAnchorKey} placeholder="회차" inputMode="numeric" aria-label="회차" />
                <button className="btn-primary" onClick={addAnchor} disabled={!aText.trim()} style={{ flexShrink: 0 }}>배치</button>
              </div>
            </div>

            {/* 사물 목록 */}
            {selectedRoom.anchors.length === 0 ? (
              <div style={emptyBox}>이 방은 비어 있어요. 위에서 첫 항목을 배치하세요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selectedRoom.anchors.map((a) => {
                  const isEd = editAnchor === a.id
                  return (
                    <div key={a.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: 9 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <button style={kindBadge(a.kind)} onClick={() => cycleAnchorKind(selectedRoom.id, a)} title="복선 단계 순환(복선→회수예정→회수됨→포기)">{ANCHOR_KO[a.kind]}</button>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.4, wordBreak: 'break-word' }}>{a.text}</span>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => setEditAnchor(isEd ? null : a.id)} aria-label="편집">{isEd ? '닫기' : '편집'}</button>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 11.5, color: 'var(--muted)' }}>
                        {a.chapter > 0 && <span>심음 {a.chapter}화</span>}
                        {a.payoffChapter > 0 && <span>회수 {a.payoffChapter}화</span>}
                        {a.links.map((l) => <span key={l} style={{ padding: '0 6px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--border)' }}>{l}</span>)}
                      </div>
                      {a.note.trim() && !isEd && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>메모 {a.note}</div>}
                      {isEd && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                          <textarea style={{ ...smallInput, resize: 'vertical', minHeight: 48 }} value={a.text} onChange={(e) => updateAnchor(selectedRoom.id, a.id, { text: e.target.value.slice(0, 400) })} aria-label="내용 수정" />
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {ANCHOR_ORDER.map((k) => (
                              <button key={k} style={seg(a.kind === k)} onClick={() => updateAnchor(selectedRoom.id, a.id, { kind: k })}>{ANCHOR_KO[k]}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>심음</span>
                            <input style={{ ...smallInput, flex: '0 0 70px' }} value={a.chapter ? String(a.chapter) : ''} onChange={(e) => updateAnchor(selectedRoom.id, a.id, { chapter: clampInt(num(e.target.value.replace(/[^0-9]/g, '')), 0, 100000) })} placeholder="회차" inputMode="numeric" aria-label="심은 회차" />
                            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>회수</span>
                            <input style={{ ...smallInput, flex: '0 0 70px' }} value={a.payoffChapter ? String(a.payoffChapter) : ''} onChange={(e) => updateAnchor(selectedRoom.id, a.id, { payoffChapter: clampInt(num(e.target.value.replace(/[^0-9]/g, '')), 0, 100000) })} placeholder="회차" inputMode="numeric" aria-label="회수 회차" />
                          </div>
                          {linkOptions.length > 0 && (
                            <div>
                              <div style={{ ...hint, marginBottom: 4 }}>연관 인물·장소</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {linkOptions.map((name) => (
                                  <button key={name} style={seg(a.links.includes(name))} onClick={() => toggleLink(selectedRoom.id, a, name)}>{name}</button>
                                ))}
                              </div>
                            </div>
                          )}
                          <input style={smallInput} value={a.note} onChange={(e) => updateAnchor(selectedRoom.id, a.id, { note: e.target.value.slice(0, 400) })} placeholder="메모 (선택)" aria-label="메모" />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="minibtn" onClick={() => anchorToSnippet(a, selectedRoom.name)}>스니펫</button>
                            <button className="minibtn" onClick={() => removeAnchor(selectedRoom.id, a.id)}>삭제</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : rooms.length > 0 ? (
          <div style={{ ...panel, ...emptyBox }}>평면도에서 방을 클릭해 선택하세요.</div>
        ) : null}

        {/* 기억의 여정 편집 */}
        {rooms.length >= 1 && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={sectionTitle}>기억의 여정(산책 순서)</span>
              <button style={{ ...seg(showWalk), marginLeft: 'auto' }} onClick={() => setShowWalk((v) => !v)}>{showWalk ? '경로 숨기기' : '경로 보이기'}</button>
            </div>
            {orderedWalkRooms.length === 0 ? (
              <div style={emptyBox}>여정에 포함된 방이 없어요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {orderedWalkRooms.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ width: 20, textAlign: 'right', color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: `hsl(${r.hue} 55% 52%)`, flexShrink: 0 }} aria-hidden />
                    <button className="minibtn" style={{ flex: 1, textAlign: 'left', justifyContent: 'flex-start', border: r.id === selRoom ? '1px solid var(--accent)' : undefined }} onClick={() => setSelRoom(r.id)}>{r.name}</button>
                    <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => moveWalk(r.id, -1)} disabled={i === 0} aria-label="위로">▲</button>
                    <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => moveWalk(r.id, 1)} disabled={i === orderedWalkRooms.length - 1} aria-label="아래로">▼</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 연동 */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '궁전 전체를 프로젝트 자료(구조)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
          <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '궁전 요약을 수집함에 담기' : '수집함이 연결되어 있지 않습니다'}>수집함 담기</button>
          <button className="linkbtn" onClick={openForeshadow} title="복선 장부 열기">복선 장부</button>
          <button className="linkbtn" onClick={openSettingBible} title="배경 설정집 열기">배경 설정집</button>
        </div>

        <div className="license-note" style={{ ...hint, marginTop: 2 }}>
          외부 데이터를 불러오지 않으며, 입력한 내용만 이 브라우저(localStorage)에 자동 저장됩니다.
          장소 라이브러리 항목({Object.keys(PLACE_FIELD_LABEL).length}개 표준 필드)과 호환됩니다.
        </div>
      </div>
    </div>
  )
}
