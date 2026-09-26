// 대사 핑퐁 — 두 인물이 번갈아 대사를 던지며 한 장면을 함께 써 내려가는 '랠리' 보드.
//  · 두 화자(A/B)를 공유 인물 라이브러리(characters)에서 고르거나 좌측 바인더 파일을 드롭/직접 입력해 세운다.
//  · '상황 카드'를 무작위로 뽑아 두 사람의 관계·장소·긴장·각자의 목적·반전을 즉석에서 깔아준다(로컬 덱).
//  · 보드에서는 차례(turn)가 A↔B로 자동으로 넘어가며 대사를 한 줄씩 추가 → 말풍선이 좌우로 쌓이는 '핑퐁'.
//    지문(행동/나레이션) 줄도 끼울 수 있고, 줄은 인라인 수정·삭제·순서 이동 가능.
//  · '제약 카드'(서브텍스트만, 질문 금지, 한 단어로… 등)를 켜 두면 대사쓰기에 즉흥 규칙을 걸어 말맛을 단련한다.
//  · 산출: 대본 텍스트 복사 / 프로젝트(원고·자료)에 장면 문서로 저장 / 수집함에 담기 / 좋은 한 줄을 스니펫 라이브러리에 보관.
//
// 자급식: react 와 './linkbus' 외 import 없음. 완전 로컬(Math.random·localStorage). 외부 미디어/네트워크 없음.
// 영속: localStorage 'sry:tool:dialogue-rally'. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useLibraryList,
  addToProject,
  hasProjectBridge,
  addToLibrary,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'dialogue-rally',
  name: '대사 핑퐁',
  icon: '🏓',
  group: '구상·정리',
  intro: '두 인물이 번갈아 대사를 던지며 상황 카드 위에서 한 장면을 함께 써 내려가는 랠리 보드',
  w: 760,
  h: 720,
}

const LS_KEY = 'sry:tool:dialogue-rally'

// ───────────────────────── 유틸 ─────────────────────────
function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }
function esc(s: string): string { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }
// 배열에서 직전 값과 다른 항목을 뽑아 반복 체감↓
function pickFresh<T>(a: T[], prev?: T): T {
  if (a.length <= 1) return a[0]
  let v = pick(a)
  if (v === prev) v = pick(a)
  return v
}

// ───────────────────────── 상황 카드 덱(로컬) ─────────────────────────
// 각 차원을 따로 뽑아 조합 → 같은 두 인물이라도 매번 다른 무대가 깔린다.
const REL = [
  '오랜 친구지만 최근 사이가 틀어졌다', '한쪽이 다른 쪽을 짝사랑한다', '상사와 부하 직원이다',
  '헤어진 옛 연인이다', '서로를 의심하는 공범이다', '오늘 처음 만난 낯선 사이다',
  '피를 나눈 형제/자매다', '스승과 제자다', '경쟁하는 라이벌이다', '한쪽이 다른 쪽에게 큰 빚을 졌다',
  '겉으론 정중하지만 속으론 적대한다', '오래 떨어져 있다 재회했다', '비밀을 공유한 사이다',
  '한쪽이 상대의 정체를 모른다', '서로의 약점을 쥐고 있다',
]
const PLACE = [
  '비 내리는 한밤의 정류장', '문 닫기 직전의 편의점', '흔들리는 막차 안', '장례식이 끝난 텅 빈 식장',
  '엘리베이터가 멈춘 그 안', '병원 복도의 긴 의자', '불 꺼진 사무실', '낯선 도시의 옥상',
  '경찰 조사실', '오래된 단골 술집의 구석 자리', '폭설로 고립된 산장', '새벽 응급실 대기실',
  '결혼식 피로연 화장실 앞', '이삿짐만 남은 빈집', '바닷가 방파제 끝', '정전된 지하 주차장',
]
const TENSION = [
  '한쪽은 곧 떠나야 한다(시간이 없다)', '둘 사이에 말 못 한 비밀이 있다', '거짓말이 막 들통나려 한다',
  '한쪽이 무언가를 숨기고 있다', '오해가 점점 커지고 있다', '둘 다 같은 것을 원하지만 하나뿐이다',
  '한쪽이 용서를 빌어야 한다', '결정을 미룰 수 없는 순간이다', '바깥에서 누군가 둘을 기다린다',
  '한쪽이 곧 진실을 말하려 한다', '서로 다른 기억을 가지고 있다', '한쪽이 작별을 결심했다',
]
const GOAL_A = [
  '진실을 알아내려 한다', '사과를 받아내려 한다', '관계를 끝내려 한다', '비밀을 지키려 한다',
  '상대를 설득해 데려가려 한다', '돈/물건을 돌려받으려 한다', '용서받으려 한다', '시간을 끌려 한다',
  '상대의 본심을 떠보려 한다', '약속을 받아내려 한다',
]
const GOAL_B = [
  '아무 일 없는 척하려 한다', '대화를 피하려 한다', '먼저 자리를 뜨려 한다', '책임을 떠넘기려 한다',
  '진심을 들키지 않으려 한다', '상대를 안심시키려 한다', '거래를 제안하려 한다', '화제를 돌리려 한다',
  '오히려 상대를 추궁하려 한다', '마지막으로 부탁하려 한다',
]
const TWIST = [
  '둘 중 하나가 곧 거짓말을 한다', '제3의 인물 이름이 갑자기 튀어나온다', '문자/전화 한 통이 분위기를 뒤집는다',
  '한쪽이 울음을 터뜨린다', '한쪽이 자리를 박차고 나가려 한다', '오래 참던 말이 결국 터진다',
  '예상 못 한 고백이 나온다', '한쪽이 거짓을 진실로 믿게 만든다', '둘이 동시에 같은 말을 한다',
  '침묵이 가장 큰 대사가 된다',
]
const OPENERS = [
  '아직 여기 있었네.', '할 말 있어서 왔어.', '왜 전화 안 받았어?', '우리 얘기 좀 해.',
  '그때 거짓말했지.', '여긴 어쩐 일이야.', '오래 기다렸어?', '이제 와서 뭘 어쩌자고.',
  '하나만 묻자.', '나 다 알아.', '먼저 미안하다고 할게.', '시간 없어. 짧게 말해.',
]

interface Situation {
  rel: string; place: string; tension: string; goalA: string; goalB: string; twist: string
}
function rollSituation(prev?: Situation): Situation {
  return {
    rel: pickFresh(REL, prev?.rel),
    place: pickFresh(PLACE, prev?.place),
    tension: pickFresh(TENSION, prev?.tension),
    goalA: pickFresh(GOAL_A, prev?.goalA),
    goalB: pickFresh(GOAL_B, prev?.goalB),
    twist: pickFresh(TWIST, prev?.twist),
  }
}

// ───────────────────────── 제약(즉흥 규칙) 카드 ─────────────────────────
interface Constraint { id: string; label: string; icon: string; hint: string; check: (text: string) => boolean }
const CONSTRAINTS: Constraint[] = [
  { id: 'noq', label: '질문 금지', icon: '🚫', hint: '물음표 없이, 단정/진술로만 말한다', check: (t) => !/[?？]/.test(t) },
  { id: 'short', label: '여덟 어절 이하', icon: '✂️', hint: '짧게 — 공백 기준 8어절 이하', check: (t) => t.trim().split(/\s+/).filter(Boolean).length <= 8 },
  { id: 'oneword', label: '한 마디로', icon: '💢', hint: '한 어절(한 단어)로만 받아친다', check: (t) => t.trim().split(/\s+/).filter(Boolean).length <= 1 && t.trim().length > 0 },
  { id: 'noname', label: '이름 부르지 않기', icon: '🙊', hint: '상대 이름을 직접 부르지 않는다', check: () => true },
  { id: 'subtext', label: '서브텍스트만', icon: '🎭', hint: '핵심은 말하지 않고 에둘러서 — (스스로 점검)', check: () => true },
  { id: 'echo', label: '상대 말 받아치기', icon: '🔁', hint: '상대가 쓴 단어 하나를 받아 되받는다 — (스스로 점검)', check: () => true },
]
function constraintById(id: string): Constraint | undefined { return CONSTRAINTS.find((c) => c.id === id) }

// ───────────────────────── 영속 타입 ─────────────────────────
type Side = 'A' | 'B'
interface Speaker {
  side: Side
  name: string
  color: string
  fromLib?: string   // 라이브러리 char id (있으면 연동)
  photo?: string
}
type LineKind = 'dialogue' | 'beat'   // 대사 / 지문(행동·나레이션)
interface Line { id: string; kind: LineKind; side: Side | null; text: string }
interface Persisted {
  title: string
  speakers: { A: Speaker; B: Speaker }
  situation: Situation | null
  lines: Line[]
  turn: Side
  constraints: string[]   // 켜진 제약 id
  showSituation: boolean
}

const COLOR_A = '#4a76d4'
const COLOR_B = '#e07a5f'

function defaultPersisted(): Persisted {
  return {
    title: '제목 없는 장면',
    speakers: {
      A: { side: 'A', name: '인물 A', color: COLOR_A },
      B: { side: 'B', name: '인물 B', color: COLOR_B },
    },
    situation: null,
    lines: [],
    turn: 'A',
    constraints: [],
    showSituation: true,
  }
}

function loadPersisted(): Persisted {
  const base = defaultPersisted()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return base
    const sp = o.speakers && typeof o.speakers === 'object' ? o.speakers : {}
    const fix = (s: any, side: Side, color: string): Speaker => ({
      side,
      name: typeof s?.name === 'string' && s.name.trim() ? s.name : (side === 'A' ? '인물 A' : '인물 B'),
      color: typeof s?.color === 'string' ? s.color : color,
      fromLib: typeof s?.fromLib === 'string' ? s.fromLib : undefined,
      photo: typeof s?.photo === 'string' ? s.photo : undefined,
    })
    const lines: Line[] = Array.isArray(o.lines)
      ? o.lines.filter((l: any) => l && typeof l === 'object').map((l: any) => ({
          id: typeof l.id === 'string' ? l.id : uid('ln'),
          kind: l.kind === 'beat' ? 'beat' : 'dialogue',
          side: l.side === 'A' || l.side === 'B' ? l.side : null,
          text: typeof l.text === 'string' ? l.text : '',
        }))
      : []
    const situation = o.situation && typeof o.situation === 'object'
      ? {
          rel: String(o.situation.rel || ''), place: String(o.situation.place || ''),
          tension: String(o.situation.tension || ''), goalA: String(o.situation.goalA || ''),
          goalB: String(o.situation.goalB || ''), twist: String(o.situation.twist || ''),
        }
      : null
    return {
      title: typeof o.title === 'string' ? o.title : base.title,
      speakers: { A: fix(sp.A, 'A', COLOR_A), B: fix(sp.B, 'B', COLOR_B) },
      situation,
      lines,
      turn: o.turn === 'B' ? 'B' : 'A',
      constraints: Array.isArray(o.constraints) ? o.constraints.filter((c: any) => typeof c === 'string' && constraintById(c)) : [],
      showSituation: o.showSituation !== false,
    }
  } catch {
    return base
  }
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function DialogueRally({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Persisted>(loadPersisted())
  const libChars = useLibraryList('characters')

  const [title, setTitle] = useState(init.current.title)
  const [speakers, setSpeakers] = useState(init.current.speakers)
  const [situation, setSituation] = useState<Situation | null>(init.current.situation)
  const [lines, setLines] = useState<Line[]>(init.current.lines)
  const [turn, setTurn] = useState<Side>(init.current.turn)
  const [constraints, setConstraints] = useState<string[]>(init.current.constraints)
  const [showSituation, setShowSituation] = useState(init.current.showSituation)

  const [draft, setDraft] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [pickerFor, setPickerFor] = useState<Side | null>(null) // 인물 선택 패널
  const [dropSide, setDropSide] = useState<Side | null>(null)
  const [toast, setToast] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [dragLineId, setDragLineId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const mounted = useRef(true)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const appliedPayload = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드: 다른 도구에서 인물/상황을 받아 시작 (1회 적용)
  useEffect(() => {
    if (appliedPayload.current || !payload) return
    appliedPayload.current = true
    try {
      const a = payload.characterA ?? payload.charA
      const b = payload.characterB ?? payload.charB
      const setFrom = (val: any, side: Side) => {
        if (val == null) return
        const name = typeof val === 'string' ? val : (val && typeof val === 'object' ? String((val as any).name || '') : '')
        if (!name.trim()) return
        setSpeakers((prev) => ({ ...prev, [side]: { ...prev[side], name: name.trim(), fromLib: typeof val === 'object' ? (val as any).id : undefined, photo: typeof val === 'object' ? (val as any).photo : undefined } }))
      }
      setFrom(a, 'A'); setFrom(b, 'B')
      if (typeof payload.title === 'string' && payload.title.trim()) setTitle(payload.title.trim())
    } catch { /* noop */ }
  }, [payload])

  // 자동 저장
  useEffect(() => {
    const data: Persisted = { title, speakers, situation, lines, turn, constraints, showSituation }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.') }
  }, [title, speakers, situation, lines, turn, constraints, showSituation])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  // 새 줄 추가 시 보드 맨 아래로 스크롤
  useEffect(() => {
    const el = boardRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length])

  // ── 인물 세팅 ──
  const cur = speakers[turn]
  const setSpeaker = (side: Side, patch: Partial<Speaker>) =>
    setSpeakers((prev) => ({ ...prev, [side]: { ...prev[side], ...patch } }))

  const applyLibChar = (side: Side, c: SharedCharacter) => {
    setSpeaker(side, { name: c.name || (side === 'A' ? '인물 A' : '인물 B'), fromLib: c.id, photo: c.photo })
    setPickerFor(null)
    setToast(`${c.name}을(를) ${side === 'A' ? '왼쪽' : '오른쪽'} 화자로 세웠어요.`)
  }
  const clearLibLink = (side: Side) => setSpeaker(side, { fromLib: undefined, photo: undefined })

  const swapSpeakers = () => {
    setSpeakers((prev) => ({
      A: { ...prev.B, side: 'A', color: COLOR_A },
      B: { ...prev.A, side: 'B', color: COLOR_B },
    }))
    // 줄의 화자도 함께 뒤집어 일관성 유지
    setLines((prev) => prev.map((l) => l.side ? { ...l, side: l.side === 'A' ? 'B' : 'A' } : l))
    setToast('두 화자를 맞바꿨어요.')
  }

  // ── 바인더 파일 드롭으로 화자 세우기 ──
  const onDropSpeaker = (side: Side, e: React.DragEvent) => {
    e.preventDefault()
    setDropSide(null)
    const item = getDragItem(e)
    if (!item) return
    const name = item.character?.name || item.title || ''
    setSpeaker(side, { name: name.trim() || (side === 'A' ? '인물 A' : '인물 B'), fromLib: undefined, photo: undefined })
    setToast(`〈${name || item.title}〉을(를) ${side === 'A' ? '왼쪽' : '오른쪽'} 화자로 세웠어요.`)
  }

  // ── 상황 카드 ──
  const rollAll = () => { setSituation((prev) => rollSituation(prev || undefined)); setShowSituation(true) }
  const rollOne = (key: keyof Situation) => {
    setSituation((prev) => {
      const base = prev || rollSituation()
      const map: Record<keyof Situation, string[]> = { rel: REL, place: PLACE, tension: TENSION, goalA: GOAL_A, goalB: GOAL_B, twist: TWIST }
      return { ...base, [key]: pickFresh(map[key], base[key]) }
    })
  }

  // ── 제약 토글 ──
  const toggleConstraint = (id: string) =>
    setConstraints((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  // 현재 입력이 켜진 제약을 어기는지(자동 점검 가능한 것만)
  const draftViolations = constraints
    .map(constraintById)
    .filter((c): c is Constraint => !!c && draft.trim().length > 0 && !c.check(draft))

  // ── 대사/지문 추가 ──
  const addLine = useCallback((kind: LineKind) => {
    const text = draft.trim()
    if (!text) { inputRef.current?.focus(); return }
    const side: Side | null = kind === 'beat' ? null : turn
    setLines((prev) => [...prev, { id: uid('ln'), kind, side, text }])
    setDraft('')
    if (kind === 'dialogue') setTurn((t) => (t === 'A' ? 'B' : 'A')) // 차례 자동 전환
    inputRef.current?.focus()
  }, [draft, turn])

  // Enter=대사 추가(차례 전환), Shift+Enter=줄바꿈
  const onDraftKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addLine('dialogue') }
  }

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))
  const startEdit = (l: Line) => { setEditId(l.id); setEditText(l.text) }
  const commitEdit = () => {
    if (!editId) return
    const t = editText.trim()
    setLines((prev) => prev.map((l) => l.id === editId ? { ...l, text: t || l.text } : l))
    setEditId(null); setEditText('')
  }
  const setLineSide = (id: string, side: Side) => setLines((prev) => prev.map((l) => l.id === id ? { ...l, side } : l))

  // 줄 순서 드래그(보드 내부 재배치)
  const onLineDrop = (targetId: string) => {
    const from = dragLineId
    setDragLineId(null); setDragOverId(null)
    if (!from || from === targetId) return
    setLines((prev) => {
      const fi = prev.findIndex((l) => l.id === from)
      const ti = prev.findIndex((l) => l.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [m] = next.splice(fi, 1)
      next.splice(ti, 0, m)
      return next
    })
  }

  const clearBoard = () => { setLines([]); setTurn('A'); setConfirmClear(false); setToast('보드를 비웠어요.') }

  // 오프너 제안(빈 보드일 때 첫 줄 영감)
  const suggestOpener = () => { setDraft(pick(OPENERS)); inputRef.current?.focus() }

  // ── 산출: 대본 텍스트 ──
  const scriptText = useCallback((): string => {
    const out: string[] = []
    out.push(title || '제목 없는 장면')
    if (situation) {
      out.push('')
      out.push(`[관계] ${situation.rel}`)
      out.push(`[장소] ${situation.place}`)
      out.push(`[긴장] ${situation.tension}`)
      out.push(`[${speakers.A.name}의 목적] ${situation.goalA}`)
      out.push(`[${speakers.B.name}의 목적] ${situation.goalB}`)
      out.push(`[반전 씨앗] ${situation.twist}`)
    }
    out.push('')
    lines.forEach((l) => {
      if (l.kind === 'beat') out.push(`(${l.text})`)
      else {
        const nm = l.side ? speakers[l.side].name : '화자'
        out.push(`${nm}: ${l.text}`)
      }
    })
    return out.join('\n')
  }, [title, situation, lines, speakers])

  const copyScript = () => {
    const text = scriptText()
    const done = () => { if (mounted.current) setToast('대본을 복사했어요.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했어요.') }
  }

  // ── 산출: 프로젝트 문서 ──
  const bodyHtml = (): string => {
    const parts: string[] = []
    if (situation) {
      parts.push('<p style="color:#888;font-size:12px;margin:0 0 6px">상황 카드</p>')
      const row = (k: string, v: string) => `<p style="margin:2px 0"><b>${esc(k)}</b> ${esc(v)}</p>`
      parts.push(row('관계 ·', situation.rel))
      parts.push(row('장소 ·', situation.place))
      parts.push(row('긴장 ·', situation.tension))
      parts.push(row(`${speakers.A.name}의 목적 ·`, situation.goalA))
      parts.push(row(`${speakers.B.name}의 목적 ·`, situation.goalB))
      parts.push(row('반전 씨앗 ·', situation.twist))
      parts.push('<hr/>')
    }
    lines.forEach((l) => {
      if (l.kind === 'beat') parts.push(`<p style="color:#888;font-style:italic;margin:6px 0">(${esc(l.text)})</p>`)
      else {
        const nm = l.side ? speakers[l.side].name : '화자'
        parts.push(`<p style="margin:6px 0"><b>${esc(nm)}</b> &nbsp;${esc(l.text)}</p>`)
      }
    })
    if (!lines.length) parts.push('<p style="color:#888">아직 작성한 대사가 없습니다.</p>')
    return parts.join('')
  }

  const saveToProject = (root: 'draft' | 'research') => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root,
      folder: root === 'draft' ? '대사 장면' : '대사 연습',
      title: (title || '제목 없는 장면') + ` — ${speakers.A.name} × ${speakers.B.name}`,
      bodyHtml: bodyHtml(),
      synopsis: situation ? `${situation.rel} / ${situation.place}` : undefined,
      meta: { 화자A: speakers.A.name, 화자B: speakers.B.name, 줄수: String(lines.length) },
    })
    setToast(id ? (root === 'draft' ? '원고에 장면 문서를 추가했어요.' : '자료에 장면 문서를 추가했어요.') : '프로젝트에 추가하지 못했어요.')
  }

  const stashScript = () => {
    if (!hasStash()) { setToast('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'note', label: `대사 핑퐁 — ${title || '장면'}`, text: scriptText() })
    setToast('수집함에 대본을 담았어요.')
  }

  const snippetLine = (l: Line) => {
    const nm = l.side ? speakers[l.side].name : '지문'
    addToLibrary('snippets', { text: l.kind === 'beat' ? `(${l.text})` : `${nm}: ${l.text}`, source: '대사 핑퐁', tags: ['대사'] })
    setToast('스니펫 라이브러리에 한 줄을 보관했어요.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }
  const tag: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, flexShrink: 0 }

  const hasLib = libChars.length > 0

  return (
    <div style={wrap}>
      {/* 헤더: 제목 + 산출 버튼 */}
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🏓" /></span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="장면 제목"
          maxLength={80}
          style={{ flex: '1 1 160px', minWidth: 120, padding: '6px 9px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
        />
        <button className="minibtn" onClick={copyScript} disabled={!lines.length} title="대본 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        {hasStash() && <button className="minibtn" onClick={stashScript} disabled={!lines.length} title="수집함에 대본 담기"><Emoji e="🧺" /> 수집함</button>}
        <button className="linkbtn" onClick={() => saveToProject('draft')} disabled={!lines.length || !hasProjectBridge()} title="원고에 장면 문서로 저장"><Emoji e="📄" /> 원고에</button>
        <button className="linkbtn" onClick={() => saveToProject('research')} disabled={!lines.length || !hasProjectBridge()} title="자료에 장면 문서로 저장"><Emoji e="📄" /> 자료에</button>
      </div>

      {toast && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--accent-2)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>{toast}</div>}

      <div style={body}>
        {/* 화자 슬롯 */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
          <SpeakerSlot
            sp={speakers.A} side="A" active={turn === 'A'} dropping={dropSide === 'A'}
            onName={(v) => setSpeaker('A', { name: v })} onPick={() => setPickerFor(pickerFor === 'A' ? null : 'A')}
            onClearLink={() => clearLibLink('A')} hasLib={hasLib}
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropSide('A') } }}
            onDragLeave={() => setDropSide((s) => s === 'A' ? null : s)}
            onDrop={(e) => onDropSpeaker('A', e)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>차례</span>
            <span style={{ fontSize: 18 }}>{turn === 'A' ? '◀' : '▶'}</span>
            <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={swapSpeakers} title="두 화자 맞바꾸기">⇄</button>
          </div>
          <SpeakerSlot
            sp={speakers.B} side="B" active={turn === 'B'} dropping={dropSide === 'B'}
            onName={(v) => setSpeaker('B', { name: v })} onPick={() => setPickerFor(pickerFor === 'B' ? null : 'B')}
            onClearLink={() => clearLibLink('B')} hasLib={hasLib}
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropSide('B') } }}
            onDragLeave={() => setDropSide((s) => s === 'B' ? null : s)}
            onDrop={(e) => onDropSpeaker('B', e)}
          />
        </div>

        {/* 인물 선택 패널(라이브러리) */}
        {pickerFor && (
          <div style={{ margin: '0 12px 8px', ...card, padding: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{pickerFor === 'A' ? '왼쪽' : '오른쪽'} 화자를 라이브러리에서 고르기</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setPickerFor(null)}>닫기</button>
            </div>
            {!hasLib ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, padding: '4px 2px' }}>
                공유 인물 라이브러리가 비어 있어요. 캐릭터 도구에서 인물을 저장하면 여기서 바로 고를 수 있어요.<br />
                지금은 화자 칸에 이름을 직접 입력하거나 좌측 바인더 파일을 끌어와 세워도 됩니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                {libChars.map((c) => (
                  <button key={c.id} className="minibtn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }} onClick={() => applyLibChar(pickerFor, c)} title={c.role || ''}>
                    <Avatar name={c.name} photo={c.photo} size={20} color={pickerFor === 'A' ? COLOR_A : COLOR_B} />
                    <span style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 상황 카드 */}
        <div style={{ margin: '0 12px 8px', ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: showSituation && situation ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🎴" /> 상황 카드</span>
            <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={rollAll} title="모든 차원을 새로 뽑기"><Emoji e="🎲" /> 새로 뽑기</button>
            {situation && <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setShowSituation((v) => !v)}>{showSituation ? '접기' : '펼치기'}</button>}
            <span style={{ flex: 1 }} />
            {!situation && <span style={{ fontSize: 11, color: 'var(--muted)' }}>무대를 깔아 시작해 보세요</span>}
          </div>
          {situation && showSituation && (
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SitRow tag="관계" value={situation.rel} onRoll={() => rollOne('rel')} />
              <SitRow tag="장소" value={situation.place} onRoll={() => rollOne('place')} />
              <SitRow tag="긴장" value={situation.tension} onRoll={() => rollOne('tension')} />
              <SitRow tag={`${speakers.A.name}↗`} color={COLOR_A} value={situation.goalA} onRoll={() => rollOne('goalA')} />
              <SitRow tag={`${speakers.B.name}↗`} color={COLOR_B} value={situation.goalB} onRoll={() => rollOne('goalB')} />
              <SitRow tag="반전씨앗" value={situation.twist} onRoll={() => rollOne('twist')} />
            </div>
          )}
        </div>

        {/* 핑퐁 보드 */}
        <div ref={boardRef} style={{ flex: 1, minHeight: 80, overflowY: 'auto', padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 20 }}>
              아직 대사가 없어요.<br />
              <span style={{ fontSize: 12 }}>아래 입력칸에 <b style={{ color: 'var(--accent)' }}>{cur.name}</b>의 첫 대사를 쓰고 Enter →<br />차례가 자동으로 상대에게 넘어가며 말풍선이 좌우로 쌓입니다.</span>
              <button className="minibtn" style={{ marginTop: 12 }} onClick={suggestOpener}><Emoji e="🎯" /> 오프너 한 줄 받기</button>
            </div>
          ) : (
            lines.map((l) => (
              <LineBubble
                key={l.id}
                line={l} speakers={speakers}
                editing={editId === l.id} editText={editText}
                dragOver={dragOverId === l.id}
                onEditText={setEditText}
                onStartEdit={() => startEdit(l)} onCommit={commitEdit} onCancelEdit={() => { setEditId(null); setEditText('') }}
                onRemove={() => removeLine(l.id)} onSnippet={() => snippetLine(l)}
                onSetSide={(s) => setLineSide(l.id, s)}
                onDragStart={() => setDragLineId(l.id)}
                onDragOver={(e) => { e.preventDefault(); if (dragOverId !== l.id) setDragOverId(l.id) }}
                onDragLeave={() => setDragOverId((d) => d === l.id ? null : d)}
                onDrop={() => onLineDrop(l.id)}
                onDragEnd={() => { setDragLineId(null); setDragOverId(null) }}
              />
            ))
          )}
        </div>

        {/* 제약 카드 */}
        <div style={{ padding: '6px 12px 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{ ...tag }}>즉흥 규칙</span>
          {CONSTRAINTS.map((c) => {
            const on = constraints.includes(c.id)
            return (
              <button key={c.id} className={'minibtn' + (on ? ' active' : '')} style={{ padding: '2px 7px', fontSize: 11, borderColor: on ? 'var(--accent)' : 'var(--border)' }} onClick={() => toggleConstraint(c.id)} title={c.hint} aria-pressed={on}>
                <Emoji e={c.icon} /> {c.label}
              </button>
            )
          })}
        </div>

        {/* 입력부 */}
        <div style={{ padding: '8px 12px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>지금 말할 차례</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: cur.color }}>
              <Avatar name={cur.name} photo={cur.photo} size={18} color={cur.color} /> {cur.name}
            </span>
            <button className="minibtn" style={{ padding: '1px 7px', fontSize: 11 }} onClick={() => setTurn((t) => t === 'A' ? 'B' : 'A')} title="차례 바꾸기">⇆ 차례</button>
            <span style={{ flex: 1 }} />
            {constraints.length > 0 && (
              <span style={{ fontSize: 11, color: draftViolations.length ? 'var(--warn)' : 'var(--ok)' }}>
                {draftViolations.length ? `규칙 위반: ${draftViolations.map((c) => c.label).join(', ')}` : '규칙 통과'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onDraftKey}
              placeholder={`${cur.name}의 대사… (Enter로 추가하고 차례 넘기기 · Shift+Enter 줄바꿈)`}
              rows={2}
              style={{
                flex: 1, resize: 'none', padding: '8px 10px', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
                borderRadius: 10, border: '1px solid ' + (draftViolations.length ? 'var(--warn)' : cur.color),
                background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box',
                boxShadow: 'inset 0 0 0 1px ' + (draftViolations.length ? 'var(--warn)' : 'transparent'),
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => addLine('dialogue')} disabled={!draft.trim()} title="대사로 추가하고 차례 넘기기"><Emoji e="➤" /> 대사</button>
              <button className="minibtn" style={{ whiteSpace: 'nowrap', fontSize: 11 }} onClick={() => addLine('beat')} disabled={!draft.trim()} title="지문(행동·나레이션)으로 추가 — 차례는 그대로">＋ 지문</button>
            </div>
          </div>
          {/* 하단 액션 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{lines.filter((l) => l.kind === 'dialogue').length}개 대사 · {lines.filter((l) => l.kind === 'beat').length}개 지문</span>
            <span style={{ flex: 1 }} />
            {lines.length > 0 && !confirmClear && <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmClear(true)}><Emoji e="🗑️" /> 보드 비우기</button>}
            {confirmClear && (
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--warn)' }}>대사를 모두 지울까요?</span>
                <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={clearBoard}>비우기</button>
                <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setConfirmClear(false)}>취소</button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 화자 슬롯 ─────────────────────────
function SpeakerSlot(props: {
  sp: Speaker; side: Side; active: boolean; dropping: boolean; hasLib: boolean
  onName: (v: string) => void; onPick: () => void; onClearLink: () => void
  onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void
}) {
  const { sp, side, active, dropping, hasLib, onName, onPick, onClearLink, onDragOver, onDragLeave, onDrop } = props
  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10,
        border: '2px solid ' + (dropping ? 'var(--accent)' : active ? sp.color : 'var(--border)'),
        outline: dropping ? '2px dashed var(--accent)' : 'none',
        background: active ? 'color-mix(in srgb, ' + sp.color + ' 12%, var(--panel))' : 'var(--panel)',
        flexDirection: side === 'B' ? 'row-reverse' : 'row', transition: 'border-color .15s',
      }}
      title="좌측 바인더 파일을 여기로 끌어와 화자로 세울 수 있어요"
    >
      <Avatar name={sp.name} photo={sp.photo} size={34} color={sp.color} />
      <div style={{ flex: 1, minWidth: 0, textAlign: side === 'B' ? 'right' : 'left' }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{side === 'A' ? '왼쪽 화자' : '오른쪽 화자'}{sp.fromLib ? ' · 라이브러리' : ''}</div>
        <input
          value={sp.name}
          onChange={(e) => onName(e.target.value)}
          maxLength={40}
          style={{ width: '100%', padding: '4px 6px', fontSize: 13, fontWeight: 700, color: sp.color, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', textAlign: side === 'B' ? 'right' : 'left', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: side === 'B' ? 'flex-end' : 'flex-start' }}>
          <button className="minibtn" style={{ padding: '1px 6px', fontSize: 10 }} onClick={onPick} title={hasLib ? '라이브러리 인물 고르기' : '라이브러리가 비어 있어요'}><Emoji e="👥" /> 고르기</button>
          {sp.fromLib && <button className="minibtn" style={{ padding: '1px 6px', fontSize: 10 }} onClick={onClearLink} title="라이브러리 연동 해제"><Emoji e="⛓️‍💥" /></button>}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 아바타(이니셜 또는 라이브러리 사진) ─────────────────────────
function Avatar(props: { name: string; photo?: string; size: number; color: string }) {
  const { name, photo, size, color } = props
  const ch = (name || '?').trim().charAt(0) || '?'
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
  }
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: color, color: '#fff', fontSize: Math.round(size * 0.46), fontWeight: 700, lineHeight: 1 }}>{ch}</span>
  )
}

// ───────────────────────── 상황 카드 한 줄 ─────────────────────────
function SitRow(props: { tag: string; value: string; color?: string; onRoll: () => void }) {
  const { tag, value, color, onRoll } = props
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: color || 'var(--muted)', minWidth: 64, paddingTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tag}>{tag}</span>
      <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>{value}</span>
      <button className="minibtn" style={{ flexShrink: 0, padding: '1px 6px', fontSize: 10 }} onClick={onRoll} title="이 항목만 다시 뽑기"><Emoji e="🎲" /></button>
    </div>
  )
}

// ───────────────────────── 말풍선(대사/지문) ─────────────────────────
function LineBubble(props: {
  line: Line; speakers: { A: Speaker; B: Speaker }
  editing: boolean; editText: string; dragOver: boolean
  onEditText: (v: string) => void
  onStartEdit: () => void; onCommit: () => void; onCancelEdit: () => void
  onRemove: () => void; onSnippet: () => void; onSetSide: (s: Side) => void
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: () => void; onDragEnd: () => void
}) {
  const { line, speakers, editing, editText, dragOver, onEditText, onStartEdit, onCommit, onCancelEdit, onRemove, onSnippet, onSetSide, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd } = props
  const isBeat = line.kind === 'beat'
  const sp = line.side ? speakers[line.side] : null
  const right = line.side === 'B'

  const dragWrap: React.CSSProperties = {
    outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: 2, borderRadius: 12,
  }

  if (isBeat) {
    return (
      <div draggable={!editing} onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onDragEnd={onDragEnd} style={dragWrap}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: '88%', background: 'var(--chrome-2)', border: '1px dashed var(--border-dark)', borderRadius: 10, padding: '6px 12px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.5 }}>
            {editing ? (
              <EditField value={editText} onChange={onEditText} onCommit={onCommit} onCancel={onCancelEdit} />
            ) : (
              <span onDoubleClick={onStartEdit} title="더블클릭하여 수정">({line.text})</span>
            )}
            {!editing && (
              <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8, verticalAlign: 'middle' }}>
                <MiniIcon label="수정" onClick={onStartEdit}><Emoji e="✏️" /></MiniIcon>
                <MiniIcon label="삭제" onClick={onRemove} warn><Emoji e="🗑️" /></MiniIcon>
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div draggable={!editing} onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onDragEnd={onDragEnd} style={dragWrap}>
      <div style={{ display: 'flex', flexDirection: right ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
        <Avatar name={sp?.name || '?'} photo={sp?.photo} size={28} color={sp?.color || 'var(--muted)'} />
        <div style={{ maxWidth: '74%', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', margin: right ? '0 4px 2px 0' : '0 0 2px 4px', textAlign: right ? 'right' : 'left' }}>{sp?.name || '화자'}</div>
          <div
            style={{
              background: right ? 'color-mix(in srgb, ' + (sp?.color || '#888') + ' 16%, var(--paper))' : 'var(--panel)',
              border: '1px solid ' + (sp?.color || 'var(--border)'),
              borderRadius: 12, borderTopRightRadius: right ? 3 : 12, borderTopLeftRadius: right ? 12 : 3,
              padding: '8px 11px', fontSize: 14, lineHeight: 1.55, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {editing ? (
              <EditField value={editText} onChange={onEditText} onCommit={onCommit} onCancel={onCancelEdit} />
            ) : (
              <span onDoubleClick={onStartEdit} title="더블클릭하여 수정">{line.text}</span>
            )}
          </div>
          {!editing && (
            <div style={{ display: 'flex', gap: 5, marginTop: 3, justifyContent: right ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
              <MiniIcon label="수정" onClick={onStartEdit}><Emoji e="✏️" /></MiniIcon>
              <MiniIcon label="화자 바꾸기" onClick={() => onSetSide(line.side === 'A' ? 'B' : 'A')}>⇄</MiniIcon>
              <MiniIcon label="이 줄을 스니펫으로 저장" onClick={onSnippet}><Emoji e="📌" /></MiniIcon>
              <MiniIcon label="삭제" onClick={onRemove} warn><Emoji e="🗑️" /></MiniIcon>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditField(props: { value: string; onChange: (v: string) => void; onCommit: () => void; onCancel: () => void }) {
  const { value, onChange, onCommit, onCancel } = props
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommit() }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        rows={2}
        style={{ width: '100%', resize: 'vertical', padding: '4px 6px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
      />
      <span style={{ display: 'flex', gap: 4 }}>
        <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onCommit}>확인</button>
        <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onCancel}>취소</button>
      </span>
    </span>
  )
}

function MiniIcon(props: { children: React.ReactNode; label: string; onClick: () => void; warn?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6, padding: 0, lineHeight: 1, color: props.warn ? 'var(--warn)' : 'inherit' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
    >{props.children}</button>
  )
}
