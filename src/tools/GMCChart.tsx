// GMC 차트(목표·동기·갈등) — 데브라 딕슨(Debra Dixon)의 GMC 모델로 인물을 정리하는 대형 도구.
//   각 인물은 외적 GMC(외적 목표=원하는 것 / 외적 동기=원하는 이유 / 외적 갈등=방해하는 것)와
//   내적 GMC(내적 목표=되고 싶은 것 / 내적 동기=그렇게 되고 싶은 이유 / 내적 장애=내면의 걸림돌)를 가진다.
//   GMC 한 문장 공식: "(인물)은 [동기] 때문에 [목표]을(를) 원하지만 [갈등] 때문에 어렵다."
//   인물 카드 CRUD(추가/삭제 2단계/복제/순서이동/선택), 격자(외적·내적 × G·M·C) 편집, 검색, 자동 저장.
// [연계] 공유 라이브러리(characters) 가져오기/저장·업데이트, payload.character 새 인물,
//        좌측 바인더 파일 드롭 수용, addToProject 로 인물 카드/요약 문서 추가, 관련 도구 열기.
//   import 는 react 와 './linkbus' 만 사용. 완전 로컬·외부 미디어/네트워크 없음.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  getDragItem,
  isItemDrag,
  CHARACTER_FIELD_LABEL,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'gmc-chart', name: 'GMC 차트', icon: '🎯', group: '구상·정리', intro: '데브라 딕슨 GMC 모델로 인물의 외적·내적 목표·동기·갈등을 격자로 정리하세요', w: 920, h: 660 }

const LS_KEY = 'sry:tool:gmc-chart'

// ───────── 데이터 모델 ─────────
// 외적 GMC: 줄거리를 움직이는 표면적 욕망(원하는 것/이유/방해물).
// 내적 GMC: 인물의 성장 아크를 움직이는 내면의 욕망(되고 싶은 것/이유/내적 장애).
interface GmcCharacter {
  id: string
  name: string
  role: string            // 주인공/조력자/적대자 등
  // 외적(External)
  eGoal: string           // 외적 목표 — 원하는 것(구체적·관찰 가능)
  eMotivation: string     // 외적 동기 — 그것을 원하는 이유
  eConflict: string       // 외적 갈등 — 그것을 가로막는 외부 장애/적대자
  // 내적(Internal)
  iGoal: string           // 내적 목표 — 되고 싶은 것/얻고 싶은 마음의 상태
  iMotivation: string     // 내적 동기 — 그렇게 되고 싶은 이유(과거 상처 등)
  iConflict: string       // 내적 장애 — 내면의 두려움·신념·결핍
  note: string            // 자유 메모(아크·전환점 등)
  // [연계] GMC 6셀에 매핑되지 않은 원본 정규 항목(성별·MBTI·키·사용자 정의 등)을 보존해 다시 내보낼 때 손실 0.
  srcFields?: Record<string, string>
  // [연계] 공유 라이브러리 연결 흔적(없어도 동작).
  libId?: string
  photo?: string
  photoCredit?: string
}

// 격자 셀 정의(렌더 순서). axis=external|internal, col=goal|motivation|conflict.
type Axis = 'external' | 'internal'
type Col = 'goal' | 'motivation' | 'conflict'
type CellKey = Extract<keyof GmcCharacter, 'eGoal' | 'eMotivation' | 'eConflict' | 'iGoal' | 'iMotivation' | 'iConflict'>
interface CellDef { key: CellKey; axis: Axis; col: Col; label: string; icon: string; placeholder: string; hint: string }
const CELLS: CellDef[] = [
  { key: 'eGoal', axis: 'external', col: 'goal', label: '외적 목표', icon: '🎯', placeholder: '원하는 것 — 구체적이고 눈에 보이는 것…', hint: '인물이 이야기 안에서 손에 넣고 싶어 하는 것(직위·물건·인물·승리 등).' },
  { key: 'eMotivation', axis: 'external', col: 'motivation', label: '외적 동기', icon: '🔥', placeholder: '그것을 원하는 이유…', hint: '왜 그것을 원하는가? 독자가 “그럴 만하다”고 납득할 이유.' },
  { key: 'eConflict', axis: 'external', col: 'conflict', label: '외적 갈등', icon: '⚔️', placeholder: '가로막는 외부의 방해/적대자…', hint: '목표를 막는 사람·세력·상황. 강할수록 이야기가 팽팽해진다.' },
  { key: 'iGoal', axis: 'internal', col: 'goal', label: '내적 목표', icon: '🌱', placeholder: '되고 싶은 것 / 마음으로 바라는 상태…', hint: '인물이 끝에 가서 “되고 싶은” 모습. 성장 아크의 도착점.' },
  { key: 'iMotivation', axis: 'internal', col: 'motivation', label: '내적 동기', icon: '💗', placeholder: '그렇게 되고 싶은 이유 / 과거 상처…', hint: '내면 욕망의 뿌리. 흔히 과거의 상처·결핍에서 온다.' },
  { key: 'iConflict', axis: 'internal', col: 'conflict', label: '내적 장애', icon: '🩹', placeholder: '내면의 두려움·신념·결핍…', hint: '스스로를 막는 두려움·잘못된 믿음. 인물이 극복해야 할 것.' },
]
const COL_LABEL: Record<Col, { icon: string; label: string }> = {
  goal: { icon: '🎯', label: '목표 (Goal)' },
  motivation: { icon: '🔥', label: '동기 (Motivation)' },
  conflict: { icon: '⚔️', label: '갈등 (Conflict)' },
}
const AXIS_LABEL: Record<Axis, { icon: string; label: string; desc: string }> = {
  external: { icon: '🌍', label: '외적 GMC', desc: '줄거리를 움직이는 표면의 욕망' },
  internal: { icon: '💠', label: '내적 GMC', desc: '성장을 움직이는 내면의 욕망' },
}

// 고유 id — crypto 우선, 미지원 시 시간+난수.
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function emptyChar(): GmcCharacter {
  return {
    id: newId(), name: '', role: '',
    eGoal: '', eMotivation: '', eConflict: '',
    iGoal: '', iMotivation: '', iConflict: '',
    note: '',
  }
}

// localStorage 읽기 — 미지원/손상 시 빈 배열로 graceful.
function loadChars(): GmcCharacter[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: Record<string, unknown>) => ({
        id: String(x.id || newId()),
        name: str(x.name), role: str(x.role),
        eGoal: str(x.eGoal), eMotivation: str(x.eMotivation), eConflict: str(x.eConflict),
        iGoal: str(x.iGoal), iMotivation: str(x.iMotivation), iConflict: str(x.iConflict),
        note: str(x.note),
        libId: typeof x.libId === 'string' ? x.libId : undefined,
        photo: typeof x.photo === 'string' ? x.photo : undefined,
        photoCredit: typeof x.photoCredit === 'string' ? x.photoCredit : undefined,
      }))
  } catch {
    return []
  }
}

// GMC 한 문장 공식 — "(인물)은 [동기] 때문에 [목표]을(를) 원하지만 [갈등] 때문에 어렵다."
function firstLine(s: string): string {
  const t = s.trim()
  if (!t) return ''
  const nl = t.indexOf('\n')
  return (nl >= 0 ? t.slice(0, nl) : t).trim()
}
// 받침 유무로 을/를 선택(한글 마지막 글자 기준). 한글이 아니면 '을(를)'.
function objParticle(word: string): string {
  const w = firstLine(word)
  if (!w) return '을(를)'
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '을(를)'
  return (code - 0xac00) % 28 !== 0 ? '을' : '를'
}
// 은/는(주어) — 인물 이름 받침.
function subjParticle(word: string): string {
  const w = word.trim()
  if (!w) return '은(는)'
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '은(는)'
  return (code - 0xac00) % 28 !== 0 ? '은' : '는'
}
function gmcSentence(name: string, goal: string, motivation: string, conflict: string): string {
  const g = firstLine(goal), m = firstLine(motivation), c = firstLine(conflict)
  if (!g && !m && !c) return ''
  const who = (name.trim() || '이 인물') + subjParticle(name.trim() || '이 인물')
  const parts: string[] = [who]
  if (m) parts.push(`${m} 때문에`)
  if (g) parts.push(`${g}${objParticle(g)} 원하지만`)
  else parts.push('무언가를 원하지만')
  if (c) parts.push(`${c} 때문에 어렵다.`)
  else parts.push('그것을 가로막는 것이 있다.')
  return parts.join(' ')
}

// 완성도(채워진 핵심 6칸 수 / 6).
function filled(c: GmcCharacter): number {
  return CELLS.filter((cell) => c[cell.key].trim()).length
}

// 한 인물을 읽기 좋은 텍스트로 직렬화(복사/내보내기/프로젝트 본문).
function charToText(c: GmcCharacter): string {
  const lines: string[] = []
  const title = c.name.trim() || '(이름 없는 인물)'
  lines.push(`■ ${title}${c.role.trim() ? ` — ${c.role.trim()}` : ''}`)
  lines.push('')
  for (const axis of ['external', 'internal'] as Axis[]) {
    lines.push(`[${AXIS_LABEL[axis].label}] ${AXIS_LABEL[axis].desc}`)
    for (const cell of CELLS.filter((x) => x.axis === axis)) {
      const v = c[cell.key].trim()
      lines.push(`${cell.label}: ${v || '—'}`)
    }
    const ax = axis === 'external'
      ? gmcSentence(c.name, c.eGoal, c.eMotivation, c.eConflict)
      : gmcSentence(c.name, c.iGoal, c.iMotivation, c.iConflict)
    if (ax) lines.push(`▸ ${ax}`)
    lines.push('')
  }
  if (c.note.trim()) { lines.push('메모:'); lines.push(c.note.trim()) }
  if (c.photo && c.photoCredit) lines.push(`사진 출처: ${c.photoCredit}`)
  return lines.join('\n').trim()
}

// HTML escape — addToProject bodyHtml 용.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function charToHtml(c: GmcCharacter): string {
  const out: string[] = []
  const title = c.name.trim() || '(이름 없는 인물)'
  out.push(`<h2>${esc(title)}${c.role.trim() ? ` — ${esc(c.role.trim())}` : ''}</h2>`)
  for (const axis of ['external', 'internal'] as Axis[]) {
    out.push(`<h3>${esc(AXIS_LABEL[axis].label)} — ${esc(AXIS_LABEL[axis].desc)}</h3>`)
    out.push('<ul>')
    for (const cell of CELLS.filter((x) => x.axis === axis)) {
      out.push(`<li><b>${esc(cell.label)}:</b> ${esc(c[cell.key].trim() || '—')}</li>`)
    }
    out.push('</ul>')
    const ax = axis === 'external'
      ? gmcSentence(c.name, c.eGoal, c.eMotivation, c.eConflict)
      : gmcSentence(c.name, c.iGoal, c.iMotivation, c.iConflict)
    if (ax) out.push(`<p><i>${esc(ax)}</i></p>`)
  }
  if (c.note.trim()) out.push(`<p><b>메모:</b> ${esc(c.note.trim())}</p>`)
  return out.join('\n')
}

// ───────── 라이브러리 연동 매핑 ─────────
// SharedCharacter → GMC 인물. goal 은 외적 목표로, secret 은 내적 장애의 단서로,
// personality 는 내적 동기 단서로, notes 는 메모로 보존.
function fromShared(s: SharedCharacter): GmcCharacter {
  const c = emptyChar()
  c.name = str(s.name)
  c.role = str(s.role)
  c.libId = s.id
  c.photo = str(s.photo) || undefined
  c.photoCredit = str(s.photoCredit) || undefined
  const f = s.fields
  if (f && typeof f === 'object') {
    // 정규 fields 우선 소비(손실 0): 정규 항목을 GMC 셀에 매핑하고 나머지는 메모로 보존.
    const g = (k: string) => str(f[k]).trim()
    c.eGoal = g('goal') || str(s.goal)
    c.eMotivation = g('motivation')
    c.iGoal = g('arc')
    c.iMotivation = g('value') || g('personality') || str(s.personality)
    c.iConflict = [g('flaw'), g('fear'), g('secret') || str(s.secret)].filter(Boolean).join(' · ')
    const used = new Set(['name', 'role', 'goal', 'motivation', 'arc', 'value', 'personality', 'flaw', 'fear', 'secret'])
    const unmapped = Object.entries(f).filter(([k, v]) => !used.has(k) && str(v).trim())
    c.srcFields = Object.fromEntries(unmapped.map(([k, v]) => [k, str(v).trim()]))  // 재방출용 보존(손실 0)
    const extra = unmapped.map(([k, v]) => `${CHARACTER_FIELD_LABEL[k] || k}: ${str(v).trim()}`)
    c.note = [str(s.notes).trim(), ...extra].filter(Boolean).join('\n')
  } else {
    // 레거시 평면 키 폴백.
    c.eGoal = str(s.goal)
    c.iMotivation = str(s.personality)
    c.iConflict = str(s.secret)
    c.note = str(s.notes)
  }
  return c
}
function charFromPayload(raw: unknown): GmcCharacter {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = fromShared({
    id: typeof o.id === 'string' ? o.id : '',
    name: str(o.name), photo: str(o.photo), photoCredit: str(o.photoCredit),
    role: str(o.role),
    goal: str(o.goal), personality: str(o.personality), secret: str(o.secret),
    notes: str(o.notes),
    fields: o.fields && typeof o.fields === 'object' ? (o.fields as Record<string, string>) : undefined,
    updated: 0,
  })
  base.libId = undefined // 붙여넣기 성격: 원본과 자동 연결하지 않음
  // 직접 전달된 GMC 필드가 있으면 우선 보존.
  for (const cell of CELLS) {
    if (typeof o[cell.key] === 'string' && o[cell.key]) base[cell.key] = o[cell.key] as string
  }
  if (typeof o.note === 'string' && o.note) base.note = o.note
  return base
}
// 바인더 파일 드롭 → GMC 인물(인물 카드 키 매핑, 없으면 title=이름/본문 일부=메모).
function charFromDrop(it: { title?: string; type?: string; character?: Record<string, string>; text?: string }): GmcCharacter {
  const c = emptyChar()
  const ch = it.character
  if (ch && typeof ch === 'object') {
    const pick = (...keys: string[]) => {
      for (const k of keys) { const v = str(ch[k]).trim(); if (v) return v }
      return ''
    }
    c.name = pick('name') || str(it.title)
    c.role = pick('role', 'type')
    c.eGoal = pick('goal')
    c.eConflict = pick('conflict')
    c.iMotivation = pick('personality')
    c.iConflict = pick('weakness', 'secret')
    c.note = pick('background', 'notes', 'arc', 'description')
  } else {
    c.name = str(it.title)
    c.note = str(it.text).slice(0, 4000)
  }
  return c
}
// GMC 인물 → 정규(canonical) 캐릭터 필드(키→값) 매핑.
//   받는 허브(인물 시트 등)가 항목을 제자리에 넣도록 표준 키로만 채운다.
//   매핑: 외적 목표→goal, 외적 동기→motivation, 외적 갈등→(정규 키 없음→notes 보존),
//         내적 목표→arc(성장 도착점), 내적 동기→personality(내면 동인), 내적 장애→flaw(두려움·결핍),
//         이름→name, 역할→role, 메모→notes.
function gmcFields(c: GmcCharacter): Record<string, string> {
  // 원본 미매핑 항목(성별·MBTI·사용자 정의 등)을 먼저 깔고, GMC 파생 키로 덮어써 손실 없이 재방출.
  const f: Record<string, string> = { ...(c.srcFields || {}) }
  const put = (k: string, v: string) => { const t = v.trim(); if (t) f[k] = t }
  put('name', c.name)
  put('role', c.role)
  put('goal', c.eGoal)
  put('motivation', c.eMotivation)
  put('arc', c.iGoal)
  put('personality', c.iMotivation)
  put('flaw', c.iConflict)
  // 외적 갈등은 정규 캐릭터 스키마에 칸이 없어 메모로 보존(메모 + 외적 갈등).
  const notes = [c.note.trim(), c.eConflict.trim() && `외적 갈등: ${firstLine(c.eConflict)}`].filter(Boolean).join('\n')
  if (notes) f.notes = notes
  return f
}

// GMC 인물 → 공유 라이브러리 SharedCharacter 부분 객체.
function toSharedPatch(c: GmcCharacter): Partial<SharedCharacter> {
  const traits: { k: string; v: string }[] = []
  const addT = (k: string, v: string) => { const t = firstLine(v); if (t) traits.push({ k, v: t }) }
  addT('외적 목표', c.eGoal)
  addT('외적 동기', c.eMotivation)
  addT('외적 갈등', c.eConflict)
  addT('내적 목표', c.iGoal)
  addT('내적 장애', c.iConflict)
  return {
    name: c.name.trim() || '(이름 없는 인물)',
    role: c.role.trim() || undefined,
    goal: c.eGoal.trim() || c.iGoal.trim() || undefined,
    personality: c.iMotivation.trim() || undefined,
    secret: c.iConflict.trim() || undefined,
    notes: c.note.trim() || undefined,
    traits: traits.length ? traits : undefined,
    // 정규 캐릭터 필드 — 받는 허브가 항목을 기본 칸에 제자리로 채우게 한다.
    fields: (() => { const f = gmcFields(c); return Object.keys(f).length ? f : undefined })(),
    photo: c.photo || undefined,
    photoCredit: c.photoCredit || undefined,
    source: 'GMC 차트',
  }
}

export default function GMCChart({ payload }: { payload?: Record<string, unknown> }) {
  const [chars, setChars] = useState<GmcCharacter[]>(() => loadChars())
  const [selId, setSelId] = useState<string | null>(() => {
    const init = loadChars()
    return init.length ? init[0].id : null
  })
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [note, setNote] = useState('')        // 저장 차단 경고
  const [flash, setFlash] = useState('')       // 일시 안내
  const [showImport, setShowImport] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  const library = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // 자동 저장(차단/용량초과 시 안내만).
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(chars))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [chars])

  // 선택 보정.
  useEffect(() => {
    if (selId && !chars.some((c) => c.id === selId)) {
      setSelId(chars.length ? chars[0].id : null)
    }
  }, [chars, selId])

  // payload.character → 새 인물(1회).
  const consumedPayload = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character
    if (!raw) return
    if (consumedPayload.current === raw) return
    consumedPayload.current = raw
    const c = charFromPayload(raw)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    showFlash('전달받은 인물을 새 GMC 카드로 추가했어요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      if (mounted.current) setFlash('')
    }, 1900)
  }

  const selected = chars.find((c) => c.id === selId) || null

  const addChar = () => {
    const c = emptyChar()
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
  }

  const handleItemDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const c = charFromDrop(it)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    showFlash(`‘${c.name.trim() || it.title || '바인더 파일'}’을(를) 새 GMC 카드로 추가했어요.`)
  }

  const updateField = (key: keyof GmcCharacter, value: string) => {
    if (!selId) return
    setChars((prev) => prev.map((c) => (c.id === selId ? { ...c, [key]: value } : c)))
  }

  const requestDelete = (id: string) => setConfirmDel(id)
  const cancelDelete = () => setConfirmDel(null)
  const confirmDelete = (id: string) => {
    setChars((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setChars((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[i]; next[i] = next[j]; next[j] = tmp
      return next
    })
  }

  const duplicate = (id: string) => {
    setChars((prev) => {
      const src = prev.find((c) => c.id === id)
      if (!src) return prev
      const copy: GmcCharacter = { ...src, id: newId(), name: (src.name.trim() || '인물') + ' (복사)', libId: undefined }
      const i = prev.findIndex((c) => c.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      setSelId(copy.id)
      return next
    })
  }

  // 클립보드 복사 — 표준 API → execCommand 폴백 → 안내.
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showFlash(okMsg)
        return
      }
    } catch { /* 폴백 진행 */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      ta.style.left = '-1000px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) { showFlash(okMsg); return }
    } catch { /* 최종 안내 진행 */ }
    showFlash('복사에 실패했어요. 텍스트를 직접 선택해 복사하세요.')
  }
  const copyOne = (c: GmcCharacter) => copyText(charToText(c), '이 인물의 GMC를 복사했어요.')
  const copyAll = () => {
    if (!chars.length) return
    const text = chars.map(charToText).join('\n\n────────\n\n')
    copyText(text, `전체 ${chars.length}명의 GMC를 복사했어요.`)
  }

  // [연계] 라이브러리 가져오기.
  const importFromLibrary = (s: SharedCharacter) => {
    const c = fromShared(s)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    setShowImport(false)
    showFlash(`‘${c.name.trim() || '이름 없는 인물'}’을(를) 라이브러리에서 가져왔어요.`)
  }

  // [연계] 라이브러리에 저장/업데이트.
  const saveToLibrary = (c: GmcCharacter) => {
    const patch = toSharedPatch(c)
    if (c.libId && library.some((x) => x.id === c.libId)) {
      updateInLibrary('characters', c.libId, patch)
      showFlash('라이브러리의 인물을 업데이트했어요.')
    } else {
      const rec = addToLibrary('characters', patch)
      setChars((prev) => prev.map((x) => (x.id === c.id ? { ...x, libId: rec.id } : x)))
      showFlash('라이브러리에 인물을 저장했어요.')
    }
  }

  const openWithChar = (toolId: string, c: GmcCharacter | null) => {
    openToolLinked(toolId, c ? { character: { ...toSharedPatch(c), id: c.libId } } : undefined)
  }

  // [프로젝트] 현재 인물을 프로젝트 바인더에 추가 — 인물 카드(자료) + GMC 요약 본문.
  const bridgeOn = hasProjectBridge()
  const addCharToProject = (c: GmcCharacter) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    const name = c.name.trim() || '이름 없는 인물'
    // 정규 캐릭터 필드로 먼저 채운 뒤(제자리 매핑), 아래 블렌드 값으로 덮어쓴다(기존 동작 보존).
    const character: Record<string, string> = { ...gmcFields(c) }
    const put = (k: string, v: string) => { const t = v.trim(); if (t) character[k] = t }
    put('name', name)
    put('role', c.role)
    put('goal', c.eGoal)
    // 동기·갈등을 카드 표준 키로 보존(motivation/conflict).
    const motivation = [c.eMotivation.trim() && `외적: ${c.eMotivation.trim()}`, c.iMotivation.trim() && `내적: ${c.iMotivation.trim()}`].filter(Boolean).join('\n')
    const conflict = [c.eConflict.trim() && `외적: ${c.eConflict.trim()}`, c.iConflict.trim() && `내적: ${c.iConflict.trim()}`].filter(Boolean).join('\n')
    if (motivation) character.motivation = motivation
    if (conflict) character.conflict = conflict
    if (c.iGoal.trim()) character.arc = c.iGoal.trim()  // 내적 목표 = 성장 도착점
    if (c.note.trim()) character.notes = c.note.trim()

    const meta: Record<string, string> = {}
    if (c.role.trim()) meta['역할'] = c.role.trim()
    if (c.eGoal.trim()) meta['외적 목표'] = firstLine(c.eGoal).slice(0, 60)
    if (c.iGoal.trim()) meta['내적 목표'] = firstLine(c.iGoal).slice(0, 60)

    const id = addToProject({
      kind: 'character',
      folder: '인물',
      title: name,
      character,
      bodyHtml: charToHtml(c),
      meta: Object.keys(meta).length ? meta : undefined,
    })
    showFlash(id ? `‘${name}’을(를) 프로젝트 인물 카드로 추가했어요.` : '프로젝트 추가에 실패했어요.')
  }

  // [프로젝트] 전체 GMC를 한 자료 문서로 추가.
  const addAllToProject = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!chars.length) return
    const body = chars.map(charToHtml).join('\n<hr/>\n')
    const id = addToProject({
      root: 'research',
      folder: '구상',
      title: `GMC 차트 (${chars.length}명)`,
      bodyHtml: body,
    })
    showFlash(id ? 'GMC 차트 전체를 자료 문서로 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // 검색 필터(이름·역할·모든 GMC·메모).
  const q = query.trim().toLowerCase()
  const visible = q
    ? chars.filter((c) =>
        [c.name, c.role, c.note, ...CELLS.map((cell) => c[cell.key])].some((t) => t.toLowerCase().includes(q)),
      )
    : chars

  /* ───────── 스타일 ───────── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }

  const sidebar: React.CSSProperties = { width: 236, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--panel)' }
  const sideHead: React.CSSProperties = { padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }

  const editor: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const editScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const editBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }

  const inputBase: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }
  const cellArea: React.CSSProperties = { ...inputBase, minHeight: 72, resize: 'vertical', fontSize: 13 }

  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 }
  const sideEmpty: React.CSSProperties = { padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }

  const importPanel: React.CSSProperties = { position: 'absolute', top: 0, left: 0, zIndex: 30, width: 320, maxHeight: 340, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const importRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  // 격자(axis × col) 렌더.
  const renderAxis = (axis: Axis, c: GmcCharacter) => {
    const cells = CELLS.filter((x) => x.axis === axis)
    const sentence = axis === 'external'
      ? gmcSentence(c.name, c.eGoal, c.eMotivation, c.eConflict)
      : gmcSentence(c.name, c.iGoal, c.iMotivation, c.iConflict)
    const accent = axis === 'external' ? 'var(--accent)' : 'var(--ok)'
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14 }}><Emoji e={AXIS_LABEL[axis].icon} /></span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{AXIS_LABEL[axis].label}</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{AXIS_LABEL[axis].desc}</span>
          <span style={{ flex: 1 }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {cells.map((cell, i) => (
            <div key={cell.key} style={{ padding: 10, borderRight: i < 2 ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span><Emoji e={COL_LABEL[cell.col].icon} /></span><span>{cell.label}</span>
              </label>
              <textarea
                style={cellArea}
                value={c[cell.key]}
                onChange={(e) => updateField(cell.key, e.target.value)}
                placeholder={cell.placeholder}
                rows={3}
                title={cell.hint}
              />
              <span style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>{cell.hint}</span>
            </div>
          ))}
        </div>
        {sentence && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text)', background: 'color-mix(in srgb, ' + accent + ' 8%, transparent)', lineHeight: 1.55 }}>
            <span style={{ color: 'var(--muted)', marginRight: 6 }}>한 문장:</span>{sentence}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: dragOver ? -6 : 0 }}
      onDragEnter={(e) => {
        if (!isItemDrag(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragOver(true)
      }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => {
        if (!isItemDrag(e)) return
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragOver(false)
      }}
      onDrop={handleItemDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 6, zIndex: 50, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', fontSize: 15, fontWeight: 700 }}>
          <Emoji e="📥" /> 바인더 파일을 놓으면 새 GMC 카드로 추가돼요
        </div>
      )}

      <div style={topbar}>
        <div style={titleStyle}><span>{meta.icon}</span><span>GMC 차트</span></div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 {chars.length}명</span>
        <button className="minibtn" onClick={() => setShowImport((v) => !v)} title="공유 라이브러리에서 인물 가져오기"><Emoji e="📥" /> 라이브러리에서 가져오기</button>
        <button className="minibtn" onClick={addAllToProject} disabled={!bridgeOn || !chars.length} title="전체 GMC를 자료 문서로 프로젝트에 추가"><Emoji e="📄" /> 전체 프로젝트에 추가</button>
        <button className="minibtn" onClick={copyAll} disabled={!chars.length} title="모든 인물의 GMC를 텍스트로 복사"><Emoji e="📋" /> 전체 복사</button>
        <button className="btn-primary" onClick={addChar}>＋ 인물 추가</button>
      </div>

      {showImport && (
        <div style={{ position: 'relative' }}>
          <div style={{ ...importPanel, top: 6, left: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="📥" /> 공유 라이브러리 인물</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setShowImport(false)} style={{ padding: '2px 7px' }}>닫기</button>
            </div>
            {library.length === 0 ? (
              <div style={{ ...hint, padding: '10px 6px' }}>아직 공유 라이브러리에 저장된 인물이 없어요. 다른 도구(인물 시트·캐릭터 모델 등)에서 저장하거나, 여기서 “라이브러리에 저장”을 눌러 채워보세요.</div>
            ) : (
              library.map((s) => (
                <button key={s.id} style={importRow} onClick={() => importFromLibrary(s)} title="이 인물을 GMC 차트로 가져오기">
                  {s.photo && <img src={s.photo} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.name || '(이름 없음)').trim()}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[s.role, s.source].filter(Boolean).join(' · ') || '인물'}
                      {s.photoCredit ? <span className="license-note"> · 사진 {s.photoCredit}</span> : null}
                    </span>
                  </span>
                </button>
              ))
            )}
            <div className="license-note" style={{ padding: '2px 6px' }}>가져온 인물·사진은 영감·출발점으로만 쓰고, 출처가 있으면 함께 표기하세요.</div>
          </div>
        </div>
      )}

      {(note || flash) && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      <div style={body}>
        {/* 좌측: 인물 목록 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 인물 검색…" aria-label="인물 검색" />
          </div>
          {chars.length === 0 ? (
            <div style={sideEmpty}>아직 인물이 없어요.<br />위의 <b>＋ 인물 추가</b>를 눌러<br />첫 GMC 카드를 만들어 보세요.</div>
          ) : visible.length === 0 ? (
            <div style={sideEmpty}>‘{query}’에 맞는 인물이 없어요.</div>
          ) : (
            <div style={listStyle}>
              {visible.map((c) => {
                const active = c.id === selId
                const idx = chars.findIndex((x) => x.id === c.id)
                const confirming = confirmDel === c.id
                const fc = filled(c)
                return (
                  <div
                    key={c.id}
                    onClick={() => { setSelId(c.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--chrome-2)' : 'var(--paper)',
                      borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: active ? '0 0 0 1px var(--accent) inset' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.name.trim() ? 'var(--text)' : 'var(--muted)' }}>
                        {c.name.trim() || '(이름 없음)'}
                      </span>
                      {c.libId && <span className="license-badge" title="공유 라이브러리에 연결됨" style={{ flexShrink: 0 }}><Emoji e="📚" /></span>}
                      {c.role.trim() && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role.trim()}</span>}
                    </div>
                    {/* GMC 완성도 미니 바(6칸) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${(fc / 6) * 100}%`, height: '100%', background: fc === 6 ? 'var(--ok)' : 'var(--accent)' }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>{fc}/6</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button className="minibtn" onClick={() => move(c.id, -1)} disabled={idx <= 0} title="위로" style={{ padding: '3px 7px' }}>▲</button>
                      <button className="minibtn" onClick={() => move(c.id, 1)} disabled={idx >= chars.length - 1} title="아래로" style={{ padding: '3px 7px' }}>▼</button>
                      <button className="minibtn" onClick={() => duplicate(c.id)} title="복제" style={{ padding: '3px 7px' }}>⎘</button>
                      <span style={{ flex: 1 }} />
                      {confirming ? (
                        <>
                          <button className="minibtn" onClick={() => confirmDelete(c.id)} title="정말 삭제" style={{ padding: '3px 7px', color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                          <button className="minibtn" onClick={cancelDelete} title="취소" style={{ padding: '3px 7px' }}>취소</button>
                        </>
                      ) : (
                        <button className="minibtn" onClick={() => requestDelete(c.id)} title="삭제" style={{ padding: '3px 7px' }}><Emoji e="🗑️" /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: GMC 격자 편집 */}
        <div style={editor}>
          {!selected ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 40 }}><Emoji e="🎯" /></div>
              <div>
                {chars.length === 0
                  ? <>등록된 인물이 없습니다.<br /><b>＋ 인물 추가</b>로 첫 GMC 카드를 시작하세요.</>
                  : <>왼쪽 목록에서 인물을 선택하면<br />여기서 외적·내적 GMC를 격자로 정리할 수 있어요.</>}
              </div>
              <div style={{ ...hint, maxWidth: 420 }}>
                GMC는 데브라 딕슨의 인물 설계 모델입니다.<br />
                <b>목표(원하는 것)</b> · <b>동기(원하는 이유)</b> · <b>갈등(방해하는 것)</b>을
                외적(줄거리)과 내적(성장)으로 나눠 적습니다.
              </div>
              {chars.length === 0 && <button className="btn-primary" onClick={addChar}>＋ 첫 인물 만들기</button>}
            </div>
          ) : (
            <>
              <div style={editBar}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.name.trim() || '(이름 없는 인물)'} · {filled(selected)}/6칸
                </span>
                <button className="minibtn" onClick={() => saveToLibrary(selected)} title="이 인물을 공유 라이브러리에 저장하거나 업데이트합니다">
                  {selected.libId && library.some((x) => x.id === selected.libId) ? <><Emoji e="📚" /> 라이브러리 업데이트</> : <><Emoji e="📚" /> 라이브러리에 저장</>}
                </button>
                <button className="minibtn" onClick={() => copyOne(selected)} title="이 인물의 GMC를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={() => duplicate(selected.id)} title="이 인물 복제">⎘ 복제</button>
                {confirmDel === selected.id ? (
                  <>
                    <button className="minibtn" onClick={() => confirmDelete(selected.id)} style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                    <button className="minibtn" onClick={cancelDelete}>취소</button>
                  </>
                ) : (
                  <button className="minibtn" onClick={() => requestDelete(selected.id)} title="이 인물 삭제"><Emoji e="🗑️" /> 삭제</button>
                )}
              </div>

              <div style={editScroll}>
                {/* 라이브러리 사진(참고용·출처와 함께) */}
                {selected.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={selected.photo} alt={selected.name.trim() || '인물 사진'} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>라이브러리 사진(참고용)</span>
                      {selected.photoCredit
                        ? <span className="license-note">출처: {selected.photoCredit}</span>
                        : <span className="license-note">출처 미상 — 그대로 베끼지 말고 영감으로만 쓰세요.</span>}
                    </div>
                  </div>
                )}

                {/* 기본 정보: 이름 · 역할 */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><Emoji e="🪪" /> 이름</label>
                    <input style={inputBase} value={selected.name} onChange={(e) => updateField('name', e.target.value)} placeholder="예: 한도윤" maxLength={120} />
                  </div>
                  <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><Emoji e="🎬" /> 역할</label>
                    <input style={inputBase} value={selected.role} onChange={(e) => updateField('role', e.target.value)} placeholder="주인공 / 조력자 / 적대자…" maxLength={60} />
                  </div>
                </div>

                {/* 외적 GMC 격자 */}
                {renderAxis('external', selected)}
                {/* 내적 GMC 격자 */}
                {renderAxis('internal', selected)}

                {/* 자유 메모 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}><span><Emoji e="📝" /></span><span>메모 (아크·전환점 등)</span></label>
                  <textarea style={{ ...inputBase, minHeight: 60, resize: 'vertical' }} value={selected.note} onChange={(e) => updateField('note', e.target.value)} placeholder="외적·내적 GMC가 어떻게 만나고 충돌하는지, 변화의 전환점은 어디인지…" rows={3} />
                </div>

                {/* [프로젝트] 추가 */}
                <div className="linkbar" style={{ marginTop: 2 }}>
                  <span className="linkbar-label">프로젝트:</span>
                  <button className="linkbtn" onClick={() => addCharToProject(selected)} disabled={!bridgeOn} title={bridgeOn ? '이 인물을 프로젝트 “인물” 폴더에 GMC 인물 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                </div>

                {/* [연계] 관련 도구로 이동(현재 인물 데이터와 함께) */}
                <div className="linkbar" style={{ marginTop: 2 }}>
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => openWithChar('character-sheet', selected)} title="이 인물로 인물 시트 열기"><Emoji e="🧑‍🎤" /> 인물 시트</button>
                  <button className="linkbtn" onClick={() => openWithChar('character-forge', selected)} title="이 인물로 캐릭터 포지 열기"><Emoji e="🛠️" /> 캐릭터 포지</button>
                  <button className="linkbtn" onClick={() => openWithChar('relationship-map', selected)} title="이 인물로 관계도 열기"><Emoji e="🕸️" /> 관계도</button>
                  <button className="linkbtn" onClick={() => openWithChar('plot-pyramid', null)} title="플롯 피라미드 열기"><Emoji e="⛰️" /> 플롯 피라미드</button>
                </div>

                <div style={hint}>
                  입력하는 즉시 이 브라우저에 자동 저장됩니다. 외적 GMC는 <b>줄거리</b>를, 내적 GMC는 <b>인물의 성장</b>을 끌고 갑니다.
                  두 축이 서로 충돌할수록(예: 외적 목표를 위해 내적 두려움을 마주해야 함) 인물이 입체적이 됩니다.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
