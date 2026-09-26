// 동기 사슬 (5 Whys) — 인물의 표면 욕구에서 "왜?"를 반복해 근원 동기·상처·거짓 신념까지 파고든다.
//  표면 욕구를 적고 → "왜 그것을 원하는가?"를 단계별로 캐물어 사슬을 만든다.
//  마지막 단계에서 근원 동기(가장 깊은 인간적 필요)·상처(거짓이 생긴 사건)·거짓 신념을 정리한다.
//  사슬이 깊어질수록 인물의 동기가 단단해지고, 표면 욕구와 근원 동기의 거리(깊이)를 시각화한다.
// 자급식: react 와 './linkbus' 외 import 없음. 완전 로컬(외부 미디어/키/네트워크 불필요). 데이터는 localStorage 에 JSON 자동 저장/복원.
// 연계: 인물 라이브러리 읽기/쓰기 · 프로젝트 자료 〈인물〉에 카드/문서 추가 · 인물 시트/욕구 vs 필요로 보내기 · 좌측 바인더 파일 드롭 수용.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary, useLibraryList, type SharedCharacter,
  addToProject, hasProjectBridge, openToolLinked,
  addToStash, hasStash,
  getDragItem, isItemDrag, type ResolvedItem,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'motivation-chain',
  name: '동기 사슬(5 Whys)',
  icon: '🔗',
  group: '구상·정리',
  intro: '표면 욕구에서 "왜?"를 반복해 근원 동기·상처·거짓 신념까지 파고드는 인물 동기 사슬',
  w: 760,
  h: 720,
}

const LS_KEY = 'sry:tool:motivation-chain'

// ---- 모델 ----
// 사슬: 표면 욕구(첫 칸) → "왜?" 답(다음 칸) → ... → 근원 동기
interface Card {
  id: string
  name: string
  role: string
  surface: string       // 표면 욕구 — 인물이 처음 입 밖에 내는 목표
  whys: string[]        // "왜?"에 대한 단계별 답(0개 이상)
  rootMotive: string    // 근원 동기 — 가장 깊은 인간적 필요(요약)
  wound: string         // 상처 — 거짓 신념·근원 결핍이 생긴 과거 사건
  lie: string           // 거짓 신념 — 상처가 심은 잘못된 믿음
  contradiction: string // 표면과 근원의 모순(이 인물을 입체적으로 만드는 긴장)
  tags: string
  createdAt: number
  updatedAt: number
}

// 근원 동기 후보(인간 보편 동기 — 학습/선택 보조용). 자작 텍스트.
const ROOT_NEEDS: { label: string; hint: string }[] = [
  { label: '인정받고 싶다', hint: '존재 가치를 누군가 알아주길 바람' },
  { label: '안전해지고 싶다', hint: '다시는 상처/위험에 노출되지 않기' },
  { label: '사랑받고 싶다', hint: '조건 없이 받아들여지고 싶음' },
  { label: '소속되고 싶다', hint: '어딘가에 속해 외롭지 않기' },
  { label: '통제하고 싶다', hint: '예측 불가의 두려움을 다스리기' },
  { label: '용서받고 싶다', hint: '죄책감/수치심에서 벗어나기' },
  { label: '자유로워지고 싶다', hint: '억압/규정된 역할에서 벗어나기' },
  { label: '증명하고 싶다', hint: '나는 부족하지 않다는 것을 보이기' },
  { label: '복수하고 싶다', hint: '당한 부당함을 되갚아 균형을 맞추기' },
  { label: '의미를 찾고 싶다', hint: '내 삶이 헛되지 않았음을 확인하기' },
]

const QUESTION_PROMPTS = [
  '왜 그것을 원하는가?',
  '그것을 얻으면 무엇이 채워지는가?',
  '그 밑에는 어떤 두려움/결핍이 있는가?',
  '그 결핍은 결국 무엇을 향하는가?',
  '가장 밑바닥에서 진짜 바라는 것은?',
]

function makeBlank(): Card {
  return {
    id: '', name: '', role: '', surface: '', whys: [''], rootMotive: '',
    wound: '', lie: '', contradiction: '', tags: '', createdAt: 0, updatedAt: 0,
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'mc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)

function normWhys(v: unknown): string[] {
  if (!Array.isArray(v)) return ['']
  const arr = v.map((x) => str(x))
  return arr.length ? arr : ['']
}

function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p) ? p : Array.isArray(p?.cards) ? p.cards : []
    return arr
      .filter((x: unknown) => x && typeof x === 'object')
      .map((x: Record<string, unknown>): Card => ({
        id: str(x.id) || newId(),
        name: str(x.name),
        role: str(x.role),
        surface: str(x.surface),
        whys: normWhys(x.whys),
        rootMotive: str(x.rootMotive),
        wound: str(x.wound),
        lie: str(x.lie),
        contradiction: str(x.contradiction),
        tags: str(x.tags),
        createdAt: num(x.createdAt, Date.now()),
        updatedAt: num(x.updatedAt, Date.now()),
      }))
  } catch {
    return []
  }
}

function person(name: string): string {
  return (name || '').trim() || '인물'
}
function dash(s: string): string {
  return (s || '').trim() || '—'
}

// 채워진 "왜?" 답만 추린 사슬(표면 → ... → 근원).
function filledWhys(c: Card): string[] {
  return c.whys.map((w) => w.trim()).filter(Boolean)
}

// 사슬 깊이(채워진 단계 수)에 대한 정성 라벨.
function depthLabel(n: number): string {
  if (n >= 5) return '근원까지 도달'
  if (n >= 3) return '깊은 동기'
  if (n >= 2) return '한 겹 아래'
  if (n >= 1) return '표면 바로 아래'
  return '표면뿐(더 캐물어 보세요)'
}

// 한 문단 종합.
function synthesize(c: Card): string {
  const who = person(c.name)
  const surface = (c.surface || '').trim()
  const whys = filledWhys(c)
  const root = (c.rootMotive || '').trim()
  const wound = (c.wound || '').trim()
  const lie = (c.lie || '').trim()
  const contra = (c.contradiction || '').trim()

  const parts: string[] = []
  if (surface) {
    parts.push(`${who}이(가) 겉으로 좇는 것은 ${surface}이다.`)
  } else {
    parts.push(`${who}의 표면 욕구가 아직 정해지지 않았다.`)
  }
  if (whys.length) {
    // "왜?"를 거듭 캐물어 내려가는 사슬을 문장으로.
    const chain = whys.map((w, i) => (i === 0 ? `그것을 원하는 까닭은 ${w}이고` : `그 까닭은 다시 ${w}이며`))
    parts.push(`${chain.join(', ')}, 이렇게 ‘왜?’를 ${whys.length}번 캐물어 내려가면`)
  } else {
    parts.push('아직 ‘왜?’를 캐묻기 전이라,')
  }
  if (root) {
    parts.push(`바닥에 닿는 근원 동기는 “${root}”라는 인간적 필요다.`)
  } else {
    parts.push('근원 동기가 무엇인지 정리하면 인물이 단단해진다.')
  }
  if (wound) {
    parts.push(
      lie
        ? `이 동기의 뿌리에는 “${wound}”라는 상처가 있고, 그 상처는 ${who}에게 “${lie}”라는 거짓 신념을 심었다.`
        : `이 동기의 뿌리에는 “${wound}”라는 상처가 있다.`
    )
  } else if (lie) {
    parts.push(`${who}의 마음에는 “${lie}”라는 거짓 신념이 자리한다.`)
  }
  if (contra) {
    parts.push(`표면과 근원 사이의 모순(${contra})이 ${who}을(를) 입체적으로 만든다.`)
  }
  return parts.join(' ')
}

// ---- 예시(학습용, 퍼블릭 도메인/널리 알려진 고전 모델 요약) ----
type Example = Omit<Card, 'id' | 'createdAt' | 'updatedAt'> & { title: string }
const EXAMPLES: Example[] = [
  {
    title: '《크리스마스 캐럴》 스크루지',
    name: '스크루지', role: '주인공',
    surface: '돈을 한 푼도 잃지 않고 끝없이 모으는 것',
    whys: ['돈이 있어야 누구에게도 휘둘리지 않으니까', '휘둘리면 또 버려질까 두려우니까', '버려지면 나는 아무것도 아니게 되니까'],
    rootMotive: '안전해지고 싶다 — 다시는 버림받지 않기',
    wound: '가난과 외로움 속에 가족에게 방치됐던 어린 시절',
    lie: '돈만이 나를 안전하게 한다, 사람은 결국 떠난다',
    contradiction: '안전을 위해 모은 부가 오히려 그를 가장 외롭고 위태롭게 만든다',
    tags: '고전,성장',
  },
  {
    title: '《위대한 개츠비》 개츠비',
    name: '개츠비', role: '주인공',
    surface: '데이지를 되찾고 화려한 과거를 재현하는 것',
    whys: ['데이지가 곁에 있으면 내 삶이 완성되니까', '완성돼야 내가 가치 있는 사람이 되니까', '가난한 출신의 나는 그냥은 가치 없다고 느끼니까'],
    rootMotive: '인정받고 싶다 — 나는 충분한 사람이라는 증명',
    wound: '가난한 출신에 대한 깊은 수치심',
    lie: '돈과 화려함으로 과거를 되사 사랑받을 수 있다',
    contradiction: '인정받으려 쌓은 거대한 환상이 진짜 그를 아무도 모르게 만든다',
    tags: '비극,환멸',
  },
  {
    title: '《레미제라블》 자베르',
    name: '자베르', role: '적대자',
    surface: '장발장을 끝까지 잡아 법대로 처벌하는 것',
    whys: ['법을 어긴 자는 반드시 벌받아야 하니까', '질서가 무너지면 세상이 다시 혼돈에 빠지니까', '혼돈 속에서 자란 나는 그 혼돈이 두려우니까'],
    rootMotive: '통제하고 싶다 — 예측 불가의 세상을 질서로 다스리기',
    wound: '감옥에서 태어나 밑바닥의 혼돈을 보며 자람',
    lie: '인간은 변하지 않는다, 법만이 절대적 질서다',
    contradiction: '질서의 화신이 ‘은혜를 베푼 죄인’ 앞에서 자기 신념의 붕괴를 견디지 못한다',
    tags: '고전,비극',
  },
]

export default function MotivationChain({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef(loadCards())
  const [cards, setCards] = useState<Card[]>(initial.current)
  const [draft, setDraft] = useState<Card>(makeBlank())
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showEx, setShowEx] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // 사용자 정의 항목 + 고정 '기타' 자유 입력(추가 기능). 무작위 생성하지 않음 — 사용자가 직접 적는다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const characters = useLibraryList('characters')

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nonce = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload.character 가 있으면 초안에 1회 반영(선택적).
  useEffect(() => {
    const c = payload?.character as Record<string, unknown> | undefined
    if (c) {
      setDraft((p) => ({
        ...p,
        name: str(c.name) || p.name,
        role: str(c.role) || p.role,
        surface: str(c.goal) || str(c.want) || str(c.surface) || p.surface,
        wound: str(c.wound) || str(c.ghost) || p.wound,
        lie: str(c.lie) || str(c.misbelief) || p.lie,
      }))
    }
    // 최초 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cards, v: 1 }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setDraft((p) => ({ ...p, [k]: v }))

  // 사슬(왜?) 조작
  const setWhy = (i: number, v: string) => setDraft((p) => ({ ...p, whys: p.whys.map((w, j) => (j === i ? v : w)) }))
  const addWhy = () => setDraft((p) => (p.whys.length >= 8 ? p : { ...p, whys: [...p.whys, ''] }))
  const removeWhy = (i: number) => setDraft((p) => {
    const next = p.whys.filter((_, j) => j !== i)
    return { ...p, whys: next.length ? next : [''] }
  })

  // 사용자 정의 항목 조작(무작위 생성 없음 — 사용자가 라벨을 정하고 값을 직접 적는다)
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요.', '') || '').trim()
    if (!label) return
    setCustom((p) => [...p, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, v: string) => setCustom((p) => p.map((it) => (it.id === id ? { ...it, value: v } : it)))
  const removeCustom = (id: string) => setCustom((p) => p.filter((it) => it.id !== id))

  const hasInput = !!(draft.name || draft.surface || draft.rootMotive || draft.wound || draft.lie || draft.contradiction || draft.role || draft.tags || draft.whys.some((w) => w.trim()))

  // 새로/재생성 시: 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지하고, '기타'도 비운다.
  const resetCustomValues = () => { setCustom((p) => p.map((it) => ({ ...it, value: '' }))); setEtc('') }

  const clearDraft = () => { setDraft(makeBlank()); setEditId(null); resetCustomValues() }

  const saveDraft = () => {
    if (!draft.name.trim() && !draft.surface.trim() && !draft.rootMotive.trim()) {
      flashNote('인물 이름, 또는 표면 욕구·근원 동기 중 하나는 입력해 주세요.')
      return
    }
    const now = Date.now()
    const cleaned: Card = { ...draft, whys: draft.whys.map((w) => w.trim()).filter(Boolean) }
    if (!cleaned.whys.length) cleaned.whys = ['']
    if (editId) {
      setCards((p) => p.map((c) => (c.id === editId ? { ...cleaned, id: editId, createdAt: c.createdAt, updatedAt: now } : c)))
      flashNote('카드를 수정했습니다.')
    } else {
      const rec: Card = { ...cleaned, id: newId(), createdAt: now, updatedAt: now }
      setCards((p) => [rec, ...p])
      setOpenId(rec.id)
      flashNote('동기 사슬 카드를 저장했습니다.')
    }
    setDraft(makeBlank())
    setEditId(null)
  }

  const editCard = (c: Card) => {
    setDraft({ ...c, whys: c.whys.length ? [...c.whys] : [''] })
    setEditId(c.id)
    flashNote(`‘${person(c.name)}’ 카드를 편집기로 불러왔습니다.`)
  }
  const removeCard = (id: string) => {
    setCards((p) => p.filter((c) => c.id !== id))
    if (editId === id) clearDraft()
    if (openId === id) setOpenId(null)
  }
  const dupCard = (c: Card) => {
    const now = Date.now()
    const rec: Card = { ...c, id: newId(), name: (c.name || '인물') + ' (사본)', whys: [...c.whys], createdAt: now, updatedAt: now }
    setCards((p) => [rec, ...p])
    flashNote('카드를 복제했습니다.')
  }

  const applyExample = (ex: Example) => {
    const { title: _title, ...rest } = ex
    void _title
    setDraft({ ...makeBlank(), ...rest, whys: rest.whys.length ? [...rest.whys] : [''] })
    setEditId(null)
    resetCustomValues()
    setShowEx(false)
    flashNote(`${ex.title} 예시를 편집기에 채웠습니다. 저장하면 카드가 됩니다.`)
  }

  // 라이브러리 인물 → 초안.
  const fromCharacter = (c: SharedCharacter) => {
    const t = (label: string) => c.traits?.find((x) => x.k === label)?.v || ''
    setDraft((p) => ({
      ...p,
      name: c.name || p.name,
      role: c.role || p.role,
      surface: c.goal || t('욕망') || t('욕구') || p.surface,
      rootMotive: t('근원 동기') || t('필요') || p.rootMotive,
      lie: t('거짓믿음') || t('거짓 신념') || p.lie,
      wound: t('상처') || p.wound,
    }))
    setEditId(null)
    flashNote(`라이브러리 인물 ‘${c.name}’ 정보를 불러왔습니다.`)
  }

  // 좌측 바인더 파일 드롭 수용.
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch = item.character || {}
    setDraft((p) => ({
      ...p,
      name: item.title || ch.name || p.name,
      role: ch.role || p.role,
      surface: ch.goal || ch.want || p.surface,
      wound: ch.wound || ch.ghost || p.wound,
      lie: ch.lie || ch.misbelief || p.lie,
    }))
    setEditId(null)
    flashNote(`바인더 파일 ‘${item.title}’ 정보를 편집기로 가져왔습니다.`)
  }

  const copy = async (text: string, tag: string) => {
    const my = ++nonce.current
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      if (!mounted.current || my !== nonce.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    } catch {
      if (mounted.current && my === nonce.current) flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  // ---- 연계 ----
  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const traitsOf = (c: Card) => ([
    { k: '표면 욕구', v: c.surface }, { k: '근원 동기', v: c.rootMotive },
    { k: '상처', v: c.wound }, { k: '거짓 신념', v: c.lie }, { k: '모순', v: c.contradiction },
  ].filter((x) => x.v.trim()))

  // 받는 허브(인물 시트/인물 라이브러리/프로젝트 카드)에서 항목이 제자리에 들어가도록
  // 이 도구가 가진 값을 정규(표준) 캐릭터 키로 1:1 매핑한 fields 객체를 만든다.
  //  표면 욕구→goal(Want) · 근원 동기→motivation · 상처→background · 거짓 신념→flaw(잘못된 믿음=약점) · 모순/종합→notes.
  // 사용자 정의 항목(라벨=키)과 '기타'를 fields 맵에 더한다(값이 비어있지 않을 때만).
  // 그래야 인물 시트·라이브러리 등 다른 도구에 그 항목이 그대로 나타난다.
  const applyExtras = (f: Record<string, string>): Record<string, string> => {
    custom.forEach((it) => {
      const label = (it.label || '').trim()
      const v = (it.value || '').trim()
      if (label && v) f[label] = v
    })
    const e = etc.trim()
    if (e) f.etc = e
    return f
  }

  const canonFields = (c: Card): Record<string, string> => {
    const f: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
    put('name', person(c.name))
    put('role', c.role)
    put('goal', c.surface)
    put('motivation', c.rootMotive)
    put('background', c.wound)
    put('flaw', c.lie)
    const notes = [c.contradiction.trim() ? `모순: ${c.contradiction.trim()}` : '', synthesize(c)].filter(Boolean).join('\n\n')
    put('notes', notes)
    return applyExtras(f)
  }

  const toLibrary = (c: Card) => {
    const rec: Partial<SharedCharacter> = {
      name: person(c.name),
      role: c.role.trim() || undefined,
      goal: c.surface.trim() || undefined,
      traits: traitsOf(c),
      fields: canonFields(c),
      notes: synthesize(c),
      source: '동기 사슬(5 Whys)',
    }
    addToLibrary('characters', rec)
    flashNote(`‘${person(c.name)}’을(를) 인물 라이브러리에 저장했습니다.`)
  }

  const chainText = (c: Card) => {
    const whys = filledWhys(c)
    const lines = [`표면 욕구: ${dash(c.surface)}`]
    whys.forEach((w, i) => lines.push(`  └ 왜? (${i + 1}) ${w}`))
    if (c.rootMotive.trim()) lines.push(`  ⇒ 근원 동기: ${c.rootMotive.trim()}`)
    return lines.join('\n')
  }

  const toProjectCard = (c: Card) => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: person(c.name),
      character: {
        name: person(c.name),
        role: c.role.trim() || '-',
        goal: c.surface.trim() || '-',
        motivation: c.rootMotive.trim() || '-',
        flaw: c.lie.trim() || '-',
        conflict: `거짓 신념: ${dash(c.lie)} / 모순: ${dash(c.contradiction)}`,
        background: `상처: ${dash(c.wound)}`,
        arc: synthesize(c),
      },
      synopsis: synthesize(c),
      meta: {
        '표면 욕구': dash(c.surface),
        '근원 동기': dash(c.rootMotive),
        '상처': dash(c.wound),
        '거짓 신념': dash(c.lie),
        '모순': dash(c.contradiction),
        '사슬 깊이': `${filledWhys(c).length}단계 (${depthLabel(filledWhys(c).length)})`,
        '동기 사슬': chainText(c),
        // 사용자 정의 항목(라벨=키, 값 있을 때만) + '기타'
        ...applyExtras({}),
      },
    })
    flashNote(id ? `프로젝트 ‘자료 › 인물’에 ‘${person(c.name)}’ 카드를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  const toProjectDoc = (c: Card) => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const whys = filledWhys(c)
    const chainHtml = [
      `<p><b>표면 욕구:</b> ${escapeHtml(dash(c.surface))}</p>`,
      ...whys.map((w, i) => `<p style="margin-left:${(i + 1) * 14}px;">↳ <b>왜? (${i + 1}):</b> ${escapeHtml(w)}</p>`),
      c.rootMotive.trim() ? `<p style="margin-left:${(whys.length + 1) * 14}px;"><b>⇒ 근원 동기:</b> ${escapeHtml(c.rootMotive.trim())}</p>` : '',
    ].join('')
    const row = (label: string, v: string) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(dash(v))}</p>`
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.85;">${escapeHtml(synthesize(c))}</p>`,
      `<hr/>`,
      `<p><b>동기 사슬</b></p>`,
      chainHtml,
      `<hr/>`,
      row('상처 / 유령 (Wound)', c.wound),
      row('거짓 신념 (Lie)', c.lie),
      row('표면과 근원의 모순', c.contradiction),
      row('사슬 깊이', `${whys.length}단계 (${depthLabel(whys.length)})`),
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `${person(c.name)} — 동기 사슬`,
      bodyHtml,
    })
    flashNote(id ? '프로젝트 ‘자료 › 인물’에 동기 사슬 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const toSheet = (c: Card) => {
    openToolLinked('character-sheet', {
      character: {
        name: person(c.name),
        role: c.role,
        goal: c.surface,
        motivation: c.rootMotive,
        conflict: `거짓 신념: ${dash(c.lie)} · 모순: ${dash(c.contradiction)}`,
        background: `상처: ${dash(c.wound)}`,
        notes: synthesize(c),
        fields: canonFields(c),
      },
    })
    flashNote('인물 시트로 보냈습니다.')
  }
  const toWantNeed = (c: Card) => {
    openToolLinked('want-vs-need', {
      character: { name: c.name, role: c.role, goal: c.surface, want: c.surface, ghost: c.wound, lie: c.lie, need: c.rootMotive, fields: applyExtras({}) },
    })
    flashNote('욕구 vs 필요로 보냈습니다.')
  }

  const copyCard = (c: Card) => {
    const customLines = custom
      .filter((it) => it.label.trim() && it.value.trim())
      .map((it) => `· ${it.label.trim()}: ${it.value.trim()}`)
    const text = [
      `[${person(c.name)} — 동기 사슬(5 Whys)]`,
      synthesize(c),
      '',
      chainText(c),
      '',
      `· 상처: ${dash(c.wound)}`,
      `· 거짓 신념: ${dash(c.lie)}`,
      `· 모순: ${dash(c.contradiction)}`,
      ...customLines,
      ...(etc.trim() ? [`· 기타: ${etc.trim()}`] : []),
    ].join('\n')
    copy(text, 'c' + c.id)
  }

  const stashCard = (c: Card) => {
    addToStash({ kind: 'note', label: `${person(c.name)} — 동기 사슬`, text: synthesize(c) + '\n\n' + chainText(c) })
    flashNote('수집함에 담았습니다.')
  }

  // ---- 미리보기(편집 중 초안) ----
  const draftWhys = filledWhys(draft)
  const previewPara = synthesize(draft)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2, display: 'block' }
  const fieldHint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 5, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const ta: React.CSSProperties = { ...input, minHeight: 46, resize: 'vertical', lineHeight: 1.5 }
  const para: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14, lineHeight: 1.85, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '22px 12px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.65 }
  const tag: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12.5, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }

  // 사슬 시각화(표면 → 왜? 단계들 → 근원). 라이브러리 없이 div 로.
  const ChainView = ({ surface, whys, root, compact }: { surface: string; whys: string[]; root: string; compact?: boolean }) => {
    const fz = compact ? 12 : 13
    const Step = ({ kind, label, text }: { kind: 'surface' | 'why' | 'root'; label: string; text: string }) => {
      const color = kind === 'surface' ? 'var(--accent)' : kind === 'root' ? 'var(--ok)' : 'var(--muted)'
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{
            flexShrink: 0, minWidth: 54, fontSize: 10.5, fontWeight: 700, color, border: '1px solid ' + color,
            borderRadius: 6, padding: '2px 6px', textAlign: 'center', background: 'var(--paper)',
          }}>{label}</span>
          <span style={{ fontSize: fz, lineHeight: 1.55, color: 'var(--text)', wordBreak: 'keep-all', paddingTop: 1 }}>{text || '—'}</span>
        </div>
      )
    }
    const connector = (
      <div style={{ marginLeft: 26, color: 'var(--muted)', fontSize: 13, lineHeight: 1, padding: '2px 0' }}>↓ <span style={{ fontSize: 10.5 }}>왜?</span></div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Step kind="surface" label="표면 욕구" text={surface} />
        {whys.map((w, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {connector}
            <Step kind="why" label={`왜? ${i + 1}`} text={w} />
          </div>
        ))}
        {root.trim() && (
          <>
            {connector}
            <Step kind="root" label="근원 동기" text={root} />
          </>
        )}
      </div>
    )
  }

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🔗" /> 동기 사슬(5 Whys)</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>표면 욕구 → ‘왜?’ 반복 → 근원 동기 · 상처 · 거짓 신념</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>작품 속 동기 사슬 — 눌러 편집기에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <span style={tag}>{ex.whys.filter((w) => w.trim()).length + 1}단계</span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                    표면 <b style={{ color: 'var(--accent)' }}>{ex.surface}</b> ⇒ 근원 <b style={{ color: 'var(--ok)' }}>{ex.rootMotive}</b>
                  </div>
                </div>
              ))}
            </div>
            <div className="license-note" style={{ marginTop: 8 }}>예시는 퍼블릭 도메인/널리 알려진 고전 서사 모델을 학습용으로 요약한 것입니다.</div>
          </div>
        )}

        {/* 라이브러리 인물에서 시작 */}
        {characters.length > 0 && (
          <div style={card}>
            <h4 style={sectionTitle}>라이브러리 인물로 시작 ({characters.length}명)</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {characters.slice(0, 14).map((c) => (
                <button key={c.id} className="minibtn" onClick={() => fromCharacter(c)} title="이 인물 정보를 편집기로 불러오기">
                  <Emoji e="👤" /> {c.name || '이름 없음'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 편집기 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️" /> 카드 수정 중</> : '새 동기 사슬 카드'}</h4>
            <span style={{ ...tag, marginLeft: 'auto' }}>좌측 바인더 파일을 끌어다 놓아도 채워집니다</span>
            <button className="minibtn" onClick={clearDraft} disabled={!hasInput && !editId}>비우기</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={grid2}>
              <div>
                <label style={fieldLabel}>인물 이름</label>
                <input style={input} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 김도윤" maxLength={60} />
              </div>
              <div>
                <label style={fieldLabel}>역할</label>
                <input style={input} value={draft.role} onChange={(e) => set('role', e.target.value)} placeholder="예: 주인공 / 적대자 / 조력자" maxLength={40} />
              </div>
            </div>

            {/* 표면 욕구 */}
            <div>
              <label style={{ ...fieldLabel, color: 'var(--accent)' }}>표면 욕구 — 인물이 처음 입에 올리는 목표 (Want)</label>
              <span style={fieldHint}>겉으로 좇는 것. 여기서부터 ‘왜?’를 캐묻기 시작합니다.</span>
              <textarea style={ta} value={draft.surface} onChange={(e) => set('surface', e.target.value)} placeholder="예: 회사에서 임원으로 승진하는 것" maxLength={300} />
            </div>

            {/* 왜? 사슬 */}
            <div>
              <label style={fieldLabel}>‘왜?’ 사슬 — 단계마다 한 겹씩 더 깊이</label>
              <span style={fieldHint}>바로 위 답을 보고 “왜 그것을 원하는가?”를 거듭 물어 답을 적습니다. (최대 8단계)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {draft.whys.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ flexShrink: 0, marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 46 }}>왜? {i + 1}</span>
                    <textarea
                      style={{ ...ta, minHeight: 40, flex: 1 }}
                      value={w}
                      onChange={(e) => setWhy(i, e.target.value)}
                      placeholder={QUESTION_PROMPTS[Math.min(i, QUESTION_PROMPTS.length - 1)]}
                      maxLength={300}
                    />
                    <button style={{ ...iconBtn, color: 'var(--warn)', marginTop: 4 }} title="이 단계 삭제" onClick={() => removeWhy(i)} disabled={draft.whys.length <= 1}>✕</button>
                  </div>
                ))}
              </div>
              <button className="minibtn" style={{ marginTop: 8 }} onClick={addWhy} disabled={draft.whys.length >= 8}>+ ‘왜?’ 한 단계 더</button>
            </div>

            {/* 근원 동기 */}
            <div>
              <label style={{ ...fieldLabel, color: 'var(--ok)' }}>근원 동기 — 사슬 바닥의 인간적 필요 (Root)</label>
              <span style={fieldHint}>아래 후보를 눌러 채우거나 직접 적으세요.</span>
              <textarea style={ta} value={draft.rootMotive} onChange={(e) => set('rootMotive', e.target.value)} placeholder="예: 인정받고 싶다 — 나는 충분한 사람이라는 증명" maxLength={300} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {ROOT_NEEDS.map((r) => (
                  <button key={r.label} className="minibtn" title={r.hint} style={{ fontSize: 11.5 }}
                    onClick={() => set('rootMotive', draft.rootMotive.trim() ? draft.rootMotive : `${r.label} — ${r.hint}`)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 상처 / 거짓 신념 */}
            <div style={grid2}>
              <div>
                <label style={fieldLabel}>상처 / 유령 (Wound)</label>
                <span style={fieldHint}>근원 동기·거짓 신념이 생긴 과거 사건</span>
                <textarea style={ta} value={draft.wound} onChange={(e) => set('wound', e.target.value)} placeholder="예: 어린 시절 노력을 누구도 알아주지 않음" maxLength={300} />
              </div>
              <div>
                <label style={{ ...fieldLabel, color: 'var(--warn)' }}>거짓 신념 (Lie)</label>
                <span style={fieldHint}>상처가 심은, 동기를 비트는 잘못된 믿음</span>
                <textarea style={ta} value={draft.lie} onChange={(e) => set('lie', e.target.value)} placeholder="예: 쓸모를 증명해야만 사랑받는다" maxLength={300} />
              </div>
            </div>

            <div>
              <label style={fieldLabel}>표면과 근원의 모순 (선택)</label>
              <span style={fieldHint}>겉으로 좇는 것과 진짜 바라는 것이 어긋나는 지점 — 인물을 입체적으로 만듭니다.</span>
              <textarea style={{ ...ta, minHeight: 40 }} value={draft.contradiction} onChange={(e) => set('contradiction', e.target.value)} placeholder="예: 인정받으려 쌓은 성공이 정작 그를 더 외롭게 만든다" maxLength={300} />
            </div>

            <div>
              <label style={fieldLabel}>태그 (쉼표로 구분, 선택)</label>
              <input style={input} value={draft.tags} onChange={(e) => set('tags', e.target.value)} placeholder="예: 성장, 비극, 메인플롯" maxLength={120} />
            </div>

            {/* 사용자 정의 항목 — 직접 이름을 정하고 내용을 적는다(무작위 생성 없음) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <label style={{ ...fieldLabel, margin: 0 }}>사용자 정의 항목</label>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={addCustom}>＋ 항목 추가</button>
              </div>
              <span style={fieldHint}>내가 원하는 항목을 직접 추가합니다. 추가한 항목은 인물 시트·라이브러리 등으로 함께 전달됩니다.</span>
              {custom.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {custom.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ flexShrink: 0, marginTop: 8, fontSize: 11.5, fontWeight: 600, color: 'var(--text)', minWidth: 80, maxWidth: 120, wordBreak: 'keep-all' }}>{it.label}</span>
                      <textarea
                        style={{ ...ta, minHeight: 40, flex: 1 }}
                        value={it.value}
                        onChange={(e) => setCustomValue(it.id, e.target.value)}
                        placeholder="내용을 직접 적으세요"
                        maxLength={1000}
                      />
                      <button style={{ ...iconBtn, color: 'var(--warn)', marginTop: 4 }} title="이 항목 삭제" onClick={() => removeCustom(it.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 고정 '기타' 자유 입력 */}
            <div>
              <label style={fieldLabel}>기타</label>
              <span style={fieldHint}>위 항목에 담기지 않은 내용을 자유롭게 적으세요.</span>
              <textarea style={{ ...ta, minHeight: 70 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 메모…" maxLength={4000} />
            </div>
          </div>

          {/* 미리보기 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}>사슬 미리보기</h4>
              <span style={tag}>{draftWhys.length}단계 · {depthLabel(draftWhys.length)}</span>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(previewPara, 'preview')}>{copied === 'preview' ? '✓ 복사됨' : <><Emoji e="📋" /> 문단 복사</>}</button>
            </div>
            <div style={{ marginBottom: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <ChainView surface={draft.surface} whys={draftWhys} root={draft.rootMotive} />
            </div>
            <div style={para}>{previewPara}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveDraft}>{editId ? '수정 저장' : <><Emoji e="💾" /> 동기 사슬 저장</>}</button>
            {editId && <button className="minibtn" onClick={clearDraft}>새 카드로</button>}
          </div>
        </div>

        {/* 카드 목록 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>동기 사슬 카드 · {cards.length}개</h4>
          </div>

          {cards.length === 0 ? (
            <div style={emptyBox}>
              아직 동기 사슬 카드가 없습니다.<br />
              위에서 <b>표면 욕구</b>를 적고 <b>‘왜?’</b>를 거듭 캐물어 <b>근원 동기</b>까지 내려간 뒤 <b>저장</b>하면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단 <b><Emoji e="📚" /> 작품 예시</b>로 시작하거나, 좌측 바인더의 인물 파일을 끌어다 놓으세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cards.map((c) => {
                const isOpen = openId === c.id
                const whys = filledWhys(c)
                return (
                  <div key={c.id} style={{ background: 'var(--chrome-2)', border: '1px solid ' + (editId === c.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 11, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>{person(c.name)}</b>
                      {c.role.trim() && <span style={tag}>{c.role}</span>}
                      <span style={tag}>{whys.length}단계 · {depthLabel(whys.length)}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title={isOpen ? '접기' : '펼쳐 보기'} onClick={() => setOpenId(isOpen ? null : c.id)}>{isOpen ? '▲' : '▼'}</button>
                        <button style={iconBtn} title="복사" onClick={() => copyCard(c)}>{copied === 'c' + c.id ? '✓' : '복사'}</button>
                        <button style={iconBtn} title="편집" onClick={() => editCard(c)}><Emoji e="✏️" /></button>
                        <button style={iconBtn} title="복제" onClick={() => dupCard(c)}>⧉</button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeCard(c.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                      <span><b style={{ color: 'var(--accent)' }}>표면</b> {dash(c.surface)}</span>
                      <span style={{ color: 'var(--muted)' }}>⇒</span>
                      <span><b style={{ color: 'var(--ok)' }}>근원</b> {dash(c.rootMotive)}</span>
                    </div>

                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <ChainView surface={c.surface} whys={whys} root={c.rootMotive} compact />
                        <div style={para}>{synthesize(c)}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 6, fontSize: 12.5, lineHeight: 1.6 }}>
                          <div><b>상처:</b> {dash(c.wound)}</div>
                          <div><b style={{ color: 'var(--warn)' }}>거짓 신념:</b> {dash(c.lie)}</div>
                          <div><b>모순:</b> {dash(c.contradiction)}</div>
                        </div>
                        {c.tags.trim() && (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {c.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                              <span key={i} style={tag}>#{t}</span>
                            ))}
                          </div>
                        )}
                        <div className="linkbar">
                          <span className="linkbar-label">연동:</span>
                          <button className="linkbtn" onClick={() => toProjectCard(c)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트 인물 카드</button>
                          <button className="linkbtn" onClick={() => toProjectDoc(c)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 동기 사슬 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 사슬 문서</button>
                          <button className="linkbtn" onClick={() => toLibrary(c)}><Emoji e="📥" /> 인물 라이브러리</button>
                          <button className="linkbtn" onClick={() => toSheet(c)}><Emoji e="🪪" /> 인물 시트로</button>
                          <button className="linkbtn" onClick={() => toWantNeed(c)}><Emoji e="⚖️" /> 욕구 vs 필요로</button>
                          {hasStash() && <button className="linkbtn" onClick={() => stashCard(c)}><Emoji e="📎" /> 수집함</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={hint}>
          <b>5 Whys</b> 는 인물이 처음 말하는 <b>표면 욕구</b> 에서 출발해 “왜 그것을 원하는가?”를 거듭 물어, 의식 아래의 <b>근원 동기</b>(인간 보편의 필요)까지 파고드는 기법입니다.
          보통 3~5번 캐물으면 바닥에 닿습니다. 그 바닥에는 과거의 <b>상처</b> 와, 상처가 심은 <b>거짓 신념</b> 이 있습니다.
          표면 욕구와 근원 동기가 어긋나는 <b>모순</b> 이 클수록 인물은 입체적이 됩니다.
          모든 카드는 인물별로 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
