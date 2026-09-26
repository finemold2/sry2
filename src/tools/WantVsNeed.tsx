// 욕구 vs 필요 (Want vs Need) — 캐릭터 아크의 핵심 엔진.
//  인물별로 "원하는 것(외적 욕구·플롯 목표)"과 "진짜 필요한 것(내적 성장)"의 간극을 입력하면,
//  거짓 신념(Lie)·각성 지점(Awakening)·결말(욕구를 얻는가 / 필요를 깨닫는가)을 5비트 아크 위에 시각화한다.
//  간극(거리)을 직접 계산해 막대/궤적으로 그리고, 아크 한 문단을 자동 종합한다.
// 자급식: react 와 './linkbus' 외 import 없음. 완전 로컬(외부 미디어/키/네트워크 불필요). 데이터는 localStorage 에 JSON 자동 저장/복원.
// 연계: 인물 라이브러리 읽기/쓰기 · 프로젝트 자료 〈인물〉에 카드/문서 추가 · 인물 시트/내면 아크로 보내기 · 좌측 바인더 파일 드롭 수용.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary, useLibraryList, type SharedCharacter,
  addToProject, hasProjectBridge, openToolLinked,
  addToStash, hasStash,
  getDragItem, isItemDrag, type ResolvedItem,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'want-vs-need',
  name: '욕구 vs 필요',
  icon: '⚖️',
  group: '구상·정리',
  intro: '원하는 것(외적 욕구) vs 진짜 필요한 것(내적 성장)의 간극·거짓 신념·각성으로 캐릭터 아크 설계',
  w: 760,
  h: 720,
}

const LS_KEY = 'sry:tool:want-vs-need'

// ---- 모델 ----
type Ending =
  | 'positive'   // 필요를 깨닫고 욕구를 (혹은 더 나은 것을) 얻음
  | 'tragic'     // 욕구는 얻었으나 필요를 끝내 외면(파멸·공허)
  | 'bittersweet'// 필요는 깨달았으나 욕구는 포기
  | 'flat'       // 변화 없음(욕구도 필요도 그대로) — 평탄형 아크
type Arc = 'positive' | 'negative' | 'flat'

interface Card {
  id: string
  name: string
  role: string        // 역할(주인공/조력자/적대자…)
  want: string        // 원하는 것 — 외적·의식적 목표(플롯이 좇는 것)
  wantWhy: string     // 왜 원하는가
  need: string        // 진짜 필요한 것 — 내적·무의식적 성장
  lie: string         // 거짓 신념 — want 를 떠받치고 need 를 가로막는 믿음
  truth: string       // lie 를 깨는 진실
  ghost: string       // 상처/유령 — lie 의 기원
  awakening: string   // 각성 지점 — 인물이 lie 를 의심/직면하는 순간
  cost: string        // 필요를 받아들이기 위해 욕구가 치러야 할 대가
  ending: Ending
  arc: Arc            // 아크 유형
  gap: number         // 0~100: 욕구와 필요의 간극(크게 충돌할수록 큼)
  tags: string
  createdAt: number
  updatedAt: number
}

const ENDINGS: { v: Ending; label: string; hint: string; color: string }[] = [
  { v: 'positive', label: '긍정 변화', hint: '거짓을 버리고 필요를 끌어안음 — 성장형', color: 'var(--ok)' },
  { v: 'bittersweet', label: '씁쓸한 성장', hint: '필요는 깨달았으나 욕구는 포기', color: 'var(--accent)' },
  { v: 'tragic', label: '비극', hint: '욕구를 좇다 필요를 끝내 외면 — 파멸/공허', color: 'var(--warn)' },
  { v: 'flat', label: '평탄형', hint: '인물은 변하지 않고 세계가 변함(흔들림 없는 진실의 담지자)', color: 'var(--muted)' },
]

const ARCS: { v: Arc; label: string; hint: string }[] = [
  { v: 'positive', label: '긍정 아크', hint: '거짓 신념 → 진실로 변화(성장)' },
  { v: 'negative', label: '부정 아크', hint: '진실을 외면 → 더 깊은 거짓으로 추락(타락/환멸)' },
  { v: 'flat', label: '평탄 아크', hint: '이미 진실을 쥔 인물이 세계의 거짓을 바꿈' },
]

function makeBlank(): Card {
  return {
    id: '', name: '', role: '', want: '', wantWhy: '', need: '', lie: '', truth: '',
    ghost: '', awakening: '', cost: '', ending: 'positive', arc: 'positive', gap: 60,
    tags: '', createdAt: 0, updatedAt: 0,
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'wvn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)

function normEnding(v: unknown): Ending {
  return v === 'tragic' || v === 'bittersweet' || v === 'flat' ? v : 'positive'
}
function normArc(v: unknown): Arc {
  return v === 'negative' || v === 'flat' ? v : 'positive'
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
        want: str(x.want),
        wantWhy: str(x.wantWhy),
        need: str(x.need),
        lie: str(x.lie),
        truth: str(x.truth),
        ghost: str(x.ghost),
        awakening: str(x.awakening),
        cost: str(x.cost),
        ending: normEnding(x.ending),
        arc: normArc(x.arc),
        gap: Math.max(0, Math.min(100, num(x.gap, 60))),
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

// 욕구↔필요 간극에 대한 정성 라벨
function gapLabel(g: number): string {
  if (g >= 80) return '극심한 충돌'
  if (g >= 60) return '뚜렷한 충돌'
  if (g >= 40) return '잔잔한 긴장'
  if (g >= 20) return '약한 어긋남'
  return '거의 일치(아크가 약함)'
}

// 결말/아크에 맞춘 한 문단 종합.
function synthesize(c: Card): string {
  const who = person(c.name)
  const want = dash(c.want)
  const need = dash(c.need)
  const lie = dash(c.lie)
  const truth = dash(c.truth)
  const ghost = (c.ghost || '').trim()
  const awakening = (c.awakening || '').trim()
  const cost = (c.cost || '').trim()

  const parts: string[] = []
  parts.push(
    `${who}은(는) 의식적으로 ${want}을(를) 원한다. ` +
    (c.wantWhy.trim() ? `${c.wantWhy.trim()}이기 때문이다. ` : '') +
    `그러나 ${who}에게 진짜 필요한 것은 ${need}이다.`
  )
  parts.push(
    ghost
      ? `이 어긋남의 뿌리에는 “${ghost}”라는 상처가 있고, 그 상처는 ${who}의 마음에 “${lie}”라는 거짓 신념을 심었다.`
      : `${who}의 마음에는 “${lie}”라는 거짓 신념이 자리한다.`
  )
  parts.push(
    `이 거짓 신념이 욕구를 떠받치고 진짜 필요를 가로막기에, 원하는 것과 필요한 것 사이의 간극(${gapLabel(c.gap)})이 이야기 내내 ${who}을(를) 시험한다.`
  )
  if (awakening) {
    parts.push(`각성의 순간, ${awakening}을(를) 겪으며 ${who}은(는) 그 거짓을 처음으로 의심한다.`)
  }

  if (c.arc === 'positive' || c.ending === 'positive' || c.ending === 'bittersweet') {
    parts.push(`마침내 ${who}은(는) “${truth}”는(은) 진실을 받아들이고 거짓 신념을 내려놓는다.`)
    if (c.ending === 'bittersweet') {
      parts.push(`다만 그 대가로 ${who}은(는) ${want}을(를) 포기해야 했다${cost ? ` — ${cost}` : ''}. 잃었지만 더 깊이 성장한 씁쓸한 결말이다.`)
    } else {
      parts.push(`${cost ? `${cost}이라는 대가를 치르며 ` : ''}${who}은(는) ${need}을(를) 끌어안는 사람으로 변화한다.`)
    }
  } else if (c.arc === 'negative' || c.ending === 'tragic') {
    parts.push(`그러나 ${who}은(는) “${truth}”는(은) 진실을 끝내 외면하고 거짓 신념에 더 깊이 빠져든다.`)
    parts.push(`${want}을(를) 손에 넣을지언정 ${need}을(를) 잃어, ${cost ? `${cost} ` : ''}파멸과 공허로 향한다. 부정형(타락) 아크다.`)
  } else {
    // flat
    parts.push(`${who}은(는) 이미 “${truth}”는(은) 진실을 쥐고 흔들리지 않는다. 변하는 것은 ${who}가 아니라 거짓에 물든 주변 세계다(평탄형 아크).`)
  }
  return parts.join(' ')
}

// 5비트 아크 위 각성 지점의 위치(%) 추정.
function awakeningPos(c: Card): number {
  // 간극이 클수록 각성을 늦게(미드포인트~3막 초입), 작을수록 조금 이르게.
  return Math.round(45 + (c.gap / 100) * 25) // 45~70%
}

const BEATS = ['거짓 속 일상', '욕구 발동', '간극 심화', '각성', '결말'] as const

// ---- 예시(학습용, 퍼블릭 도메인/널리 알려진 고전 모델 요약) ----
type Example = Omit<Card, 'id' | 'createdAt' | 'updatedAt'> & { title: string }
const EXAMPLES: Example[] = [
  {
    title: '《크리스마스 캐럴》 스크루지',
    name: '스크루지', role: '주인공',
    want: '재산을 끝없이 불리는 것', wantWhy: '돈만이 자신을 지켜준다고 믿기',
    need: '사람들과의 따뜻한 유대와 너그러움',
    lie: '돈만이 나를 안전하게 한다, 타인은 짐일 뿐이다',
    truth: '내가 쌓은 것은 부가 아니라 외로움이었다',
    ghost: '가난과 외로움 속에 버려졌던 어린 시절',
    awakening: '세 유령이 보여준 과거·현재·미래의 환영',
    cost: '인색함이 준 거짓 안전감을 내려놓아야 함',
    ending: 'positive', arc: 'positive', gap: 85, tags: '고전,성장',
  },
  {
    title: '《위대한 개츠비》 개츠비',
    name: '개츠비', role: '주인공',
    want: '데이지를 되찾고 과거를 재현하는 것', wantWhy: '부와 사랑이 자기 존재를 증명한다고 믿기',
    need: '환상이 아닌 현실의 자기 자신을 받아들이기',
    lie: '돈과 화려함으로 과거를 되돌려 사랑을 살 수 있다',
    truth: '과거는 되살 수 없고 데이지는 환상이었다',
    ghost: '가난한 출신에 대한 수치심',
    awakening: '데이지가 끝내 톰을 떠나지 못함을 목격',
    cost: '평생을 바친 꿈 자체를 포기해야 함',
    ending: 'tragic', arc: 'negative', gap: 90, tags: '비극,환멸',
  },
  {
    title: '《반지의 제왕》 샘',
    name: '샘와이즈', role: '조력자',
    want: '프로도를 무사히 집으로 데려오는 것', wantWhy: '벗에 대한 변치 않는 충성',
    need: '(이미 갖춤) 충직과 사랑의 진실을 지키기',
    lie: '세상에는 지킬 가치가 있는 선이 남아 있는가',
    truth: '작은 손에도 세상을 바꿀 선의가 있다',
    ghost: '평범한 정원사라는 자기 한계감',
    awakening: '키리스 웅골에서 프로도를 짊어진 순간',
    cost: '두려움을 무릅쓰고 끝까지 곁을 지킴',
    ending: 'positive', arc: 'flat', gap: 25, tags: '평탄형,충성',
  },
]

export default function WantVsNeed({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef(loadCards())
  const [cards, setCards] = useState<Card[]>(initial.current)
  const [draft, setDraft] = useState<Card>(makeBlank())
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showEx, setShowEx] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)  // 목록에서 펼쳐 본 카드
  const [dragOver, setDragOver] = useState(false)
  // 사용자 정의 항목(직접 입력) + 고정 '기타' 자유 입력. 무작위 생성하지 않음.
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
        want: str(c.goal) || str(c.want) || p.want,
        ghost: str(c.wound) || str(c.ghost) || p.ghost,
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

  // ---- 사용자 정의 항목 / 기타 ----
  const addCustom = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 말버릇, 별명, 외형)') || '').trim() } catch { /* noop */ }
    if (!label) return
    setCustom((p) => [...p, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((p) => p.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((p) => p.filter((it) => it.id !== id))
  // 새로 무작위 생성/비우기 시: 사용자 정의 항목의 '값'만 비우고 '이름(라벨)'은 유지, 기타도 비움.
  const clearExtras = () => { setCustom((p) => p.map((it) => ({ ...it, value: '' }))); setEtc('') }
  // 다른 도구로 보내는 fields 맵에 합칠 추가 항목(값이 있는 것만).
  const extraFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    for (const it of custom) {
      const k = (it.label || '').trim(); const v = (it.value || '').trim()
      if (k && v) f[k] = v
    }
    if (etc.trim()) f.etc = etc.trim()
    return f
  }

  const hasInput = !!(draft.name || draft.want || draft.need || draft.lie || draft.truth || draft.ghost || draft.awakening || draft.cost || draft.role || draft.wantWhy || draft.tags)

  const clearDraft = () => { setDraft(makeBlank()); setEditId(null); clearExtras() }

  const saveDraft = () => {
    if (!draft.name.trim() && !draft.want.trim() && !draft.need.trim()) {
      flashNote('인물 이름, 또는 욕구·필요 중 하나는 입력해 주세요.')
      return
    }
    const now = Date.now()
    if (editId) {
      setCards((p) => p.map((c) => (c.id === editId ? { ...draft, id: editId, createdAt: c.createdAt, updatedAt: now } : c)))
      flashNote('카드를 수정했습니다.')
    } else {
      const rec: Card = { ...draft, id: newId(), createdAt: now, updatedAt: now }
      setCards((p) => [rec, ...p])
      setOpenId(rec.id)
      flashNote('인물 카드를 저장했습니다.')
    }
    setDraft(makeBlank())
    setEditId(null)
  }

  const editCard = (c: Card) => {
    setDraft({ ...c })
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
    const rec: Card = { ...c, id: newId(), name: (c.name || '인물') + ' (사본)', createdAt: now, updatedAt: now }
    setCards((p) => [rec, ...p])
    flashNote('카드를 복제했습니다.')
  }

  const applyExample = (ex: Example) => {
    const { title: _title, ...rest } = ex
    void _title
    setDraft({ ...makeBlank(), ...rest })
    setEditId(null)
    clearExtras()
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
      want: c.goal || t('욕망') || t('욕구') || p.want,
      need: t('필요') || p.need,
      lie: t('거짓믿음') || t('거짓 신념') || p.lie,
      ghost: t('상처') || p.ghost,
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
      want: ch.goal || ch.want || p.want,
      ghost: ch.wound || ch.ghost || p.ghost,
      lie: ch.lie || ch.misbelief || p.lie,
      need: ch.need || p.need,
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
    { k: '욕구', v: c.want }, { k: '필요', v: c.need }, { k: '거짓 신념', v: c.lie },
    { k: '진실', v: c.truth }, { k: '상처', v: c.ghost }, { k: '각성', v: c.awakening }, { k: '대가', v: c.cost },
  ].filter((x) => x.v.trim()))

  // 이 도구의 값을 정규 캐릭터 필드 키로 1:1 매핑(빈 값은 생략, 문자열만).
  //  want(외적 욕구·플롯 목표)→goal, wantWhy(왜 원하는가)→motivation, need(진짜 필요·내적 성장)→value,
  //  lie(거짓 신념=내적 결점)→flaw, ghost(상처·거짓의 기원)→background, 종합 아크 문단→arc,
  //  진실·각성·대가는 정규 단일 키가 없어 notes 로 합침.
  const fieldsOf = (c: Card): Record<string, string> => {
    const f: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
    put('name', person(c.name))
    put('role', c.role)
    put('goal', c.want)
    put('motivation', c.wantWhy)
    put('value', c.need)
    put('flaw', c.lie)
    put('background', c.ghost)
    put('arc', synthesize(c))
    const noteLines = [
      c.truth.trim() ? `진실: ${c.truth.trim()}` : '',
      c.awakening.trim() ? `각성: ${c.awakening.trim()}` : '',
      c.cost.trim() ? `대가: ${c.cost.trim()}` : '',
    ].filter(Boolean)
    if (noteLines.length) f.notes = noteLines.join('\n')
    // 사용자 정의 항목(키=라벨 그대로) + 기타(키 'etc')를 합침(값 있는 것만). 기존 키는 덮어쓰지 않음.
    const extra = extraFields()
    for (const k in extra) if (!(k in f)) f[k] = extra[k]
    return f
  }

  const toLibrary = (c: Card) => {
    const rec: Partial<SharedCharacter> = {
      name: person(c.name),
      role: c.role.trim() || undefined,
      goal: c.want.trim() || undefined,
      traits: traitsOf(c),
      fields: fieldsOf(c),
      notes: synthesize(c),
      source: '욕구 vs 필요',
    }
    addToLibrary('characters', rec)
    flashNote(`‘${person(c.name)}’을(를) 인물 라이브러리에 저장했습니다.`)
  }

  const toProjectCard = (c: Card) => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: person(c.name),
      character: {
        // 정규 키(goal/motivation/value/flaw/background/arc/notes…)를 먼저 깔고,
        // 기존 명시 키는 유지(중복 시 기존 표현이 우선) — 추가만, 삭제 없음.
        ...fieldsOf(c),
        name: person(c.name),
        role: c.role.trim() || '-',
        goal: c.want.trim() || '-',
        conflict: `진짜 필요: ${dash(c.need)} / 거짓 신념: ${dash(c.lie)}`,
        background: `상처: ${dash(c.ghost)}`,
        arc: synthesize(c),
      },
      synopsis: synthesize(c),
      meta: {
        욕구: dash(c.want), 필요: dash(c.need), '거짓 신념': dash(c.lie), 진실: dash(c.truth),
        상처: dash(c.ghost), 각성: dash(c.awakening), 대가: dash(c.cost),
        '결말유형': ENDINGS.find((e) => e.v === c.ending)?.label || '-',
        '아크유형': ARCS.find((a) => a.v === c.arc)?.label || '-',
        '간극': `${c.gap} (${gapLabel(c.gap)})`,
      },
    })
    flashNote(id ? `프로젝트 ‘자료 › 인물’에 ‘${person(c.name)}’ 카드를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  const toProjectDoc = (c: Card) => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const row = (label: string, v: string) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(dash(v))}</p>`
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.85;">${escapeHtml(synthesize(c))}</p>`,
      `<hr/>`,
      row('원하는 것 (Want · 외적 욕구)', c.want),
      row('원하는 이유', c.wantWhy),
      row('진짜 필요한 것 (Need · 내적 성장)', c.need),
      row('거짓 신념 (Lie)', c.lie),
      row('진실 (Truth)', c.truth),
      row('상처/유령 (Ghost)', c.ghost),
      row('각성 지점 (Awakening)', c.awakening),
      row('대가 (Cost)', c.cost),
      row('결말 유형', ENDINGS.find((e) => e.v === c.ending)?.label || '-'),
      row('아크 유형', ARCS.find((a) => a.v === c.arc)?.label || '-'),
      row('간극', `${c.gap} (${gapLabel(c.gap)})`),
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `${person(c.name)} — 욕구 vs 필요`,
      bodyHtml,
    })
    flashNote(id ? '프로젝트 ‘자료 › 인물’에 아크 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const toSheet = (c: Card) => {
    openToolLinked('character-sheet', {
      character: {
        name: person(c.name),
        role: c.role,
        goal: c.want,
        conflict: `필요: ${dash(c.need)} · 거짓 신념: ${dash(c.lie)}`,
        background: `상처: ${dash(c.ghost)}`,
        notes: synthesize(c),
        fields: fieldsOf(c),
      },
    })
    flashNote('인물 시트로 보냈습니다.')
  }
  const toInnerArc = (c: Card) => {
    openToolLinked('inner-arc', {
      character: { name: c.name, wound: c.ghost, goal: c.want, want: c.want, misbelief: c.lie, fields: fieldsOf(c) },
    })
    flashNote('내면 아크 설계로 보냈습니다.')
  }

  const copyCard = (c: Card) => {
    const text = [
      `[${person(c.name)} — 욕구 vs 필요]`,
      synthesize(c),
      '',
      `· 원하는 것(욕구): ${dash(c.want)}`,
      `· 진짜 필요한 것: ${dash(c.need)}`,
      `· 거짓 신념: ${dash(c.lie)}`,
      `· 진실: ${dash(c.truth)}`,
      `· 상처: ${dash(c.ghost)}`,
      `· 각성: ${dash(c.awakening)}`,
      `· 대가: ${dash(c.cost)}`,
      `· 간극: ${c.gap} (${gapLabel(c.gap)}) · 결말: ${ENDINGS.find((e) => e.v === c.ending)?.label} · 아크: ${ARCS.find((a) => a.v === c.arc)?.label}`,
      ...custom.filter((it) => it.label.trim() && it.value.trim()).map((it) => `· ${it.label.trim()}: ${it.value.trim()}`),
      ...(etc.trim() ? [`· 기타: ${etc.trim()}`] : []),
    ].join('\n')
    copy(text, 'c' + c.id)
  }

  const stashCard = (c: Card) => {
    addToStash({ kind: 'note', label: `${person(c.name)} — 욕구 vs 필요`, text: synthesize(c) })
    flashNote('수집함에 담았습니다.')
  }

  // ---- 미리보기(편집 중 초안) ----
  const previewPara = synthesize(draft)
  const previewGapLbl = gapLabel(draft.gap)
  const previewAwk = awakeningPos(draft)

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

  // 욕구↔필요 간극 시각화(막대): 라이브러리 없이 div 로 직접.
  const GapBar = ({ gap, awk, compact }: { gap: number; awk?: number; compact?: boolean }) => {
    const wantW = 50 - gap / 4   // 간극이 클수록 두 극이 멀어지는 느낌(욕구/필요 막대를 양끝으로)
    const needW = 50 - gap / 4
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: compact ? 22 : 30 }}>
          <div title="원하는 것(외적 욕구)" style={{
            width: `${Math.max(14, wantW)}%`, height: '100%', borderRadius: '8px 0 0 8px',
            background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 40%, transparent))',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8,
            color: '#fff', fontSize: compact ? 10 : 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
          }}>욕구</div>
          <div title={`간극 ${gap} — ${gapLabel(gap)}`} style={{
            flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'repeating-linear-gradient(45deg, var(--chrome-2), var(--chrome-2) 6px, transparent 6px, transparent 12px)',
            border: '1px dashed var(--border)', borderRadius: 4, fontSize: compact ? 9.5 : 11, color: 'var(--muted)', fontWeight: 700, position: 'relative',
          }}>
            ↔ {gap}{compact ? '' : ` · ${gapLabel(gap)}`}
            {!compact && typeof awk === 'number' && (
              <span title={`각성 지점 ≈ 아크 ${awk}%`} style={{
                position: 'absolute', top: -7, left: `${awk}%`, transform: 'translateX(-50%)',
                width: 12, height: 12, borderRadius: '50%', background: 'var(--ok)', border: '2px solid var(--paper)',
              }} />
            )}
          </div>
          <div title="진짜 필요한 것(내적 성장)" style={{
            width: `${Math.max(14, needW)}%`, height: '100%', borderRadius: '0 8px 8px 0',
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--ok) 40%, transparent), var(--ok))',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
            color: '#fff', fontSize: compact ? 10 : 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
          }}>필요</div>
        </div>
      </div>
    )
  }

  // 5비트 아크 궤적(SVG 없이 막대+점). 각성 지점 강조.
  const ArcTrack = ({ c }: { c: Card }) => {
    const awk = awakeningPos(c)
    const endColor = ENDINGS.find((e) => e.v === c.ending)?.color || 'var(--muted)'
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {BEATS.map((b, i) => {
          const isAwk = b === '각성'
          const isEnd = b === '결말'
          return (
            <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: 8, borderRadius: 4,
                background: isEnd ? endColor : isAwk ? 'var(--ok)' : `color-mix(in srgb, var(--accent) ${20 + i * 18}%, var(--chrome-2))`,
              }} />
              <span style={{ fontSize: 10, color: isAwk || isEnd ? 'var(--text)' : 'var(--muted)', fontWeight: isAwk || isEnd ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                {b}{isAwk ? ` ${awk}%` : ''}
              </span>
            </div>
          )
        })}
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
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="⚖️" /> 욕구 vs 필요</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>원하는 것 ↔ 진짜 필요한 것 · 거짓 신념 · 각성 → 캐릭터 아크</span>
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
            <h4 style={sectionTitle}>작품 속 욕구 vs 필요 — 눌러 편집기에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <span style={tag}>{ARCS.find((a) => a.v === ex.arc)?.label}</span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                    욕구 <b style={{ color: 'var(--accent)' }}>{ex.want}</b> ↔ 필요 <b style={{ color: 'var(--ok)' }}>{ex.need}</b>
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
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️" /> 카드 수정 중</> : '새 인물 카드'}</h4>
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

            {/* 욕구 ↔ 필요 핵심 두 칸 */}
            <div style={grid2}>
              <div>
                <label style={{ ...fieldLabel, color: 'var(--accent)' }}>원하는 것 — 외적 욕구 (Want)</label>
                <span style={fieldHint}>의식적으로 좇는 목표 · 플롯이 따라가는 것</span>
                <textarea style={ta} value={draft.want} onChange={(e) => set('want', e.target.value)} placeholder="예: 누구도 필요 없는 완벽한 성공" maxLength={300} />
              </div>
              <div>
                <label style={{ ...fieldLabel, color: 'var(--ok)' }}>진짜 필요한 것 — 내적 성장 (Need)</label>
                <span style={fieldHint}>무의식적으로 결핍된 것 · 욕구와 충돌해야 한다</span>
                <textarea style={ta} value={draft.need} onChange={(e) => set('need', e.target.value)} placeholder="예: 타인을 믿고 곁을 내주는 법" maxLength={300} />
              </div>
            </div>

            <div>
              <label style={fieldLabel}>원하는 이유 (선택)</label>
              <input style={input} value={draft.wantWhy} onChange={(e) => set('wantWhy', e.target.value)} placeholder="예: 성공만이 자신을 증명한다고 믿어서" maxLength={160} />
            </div>

            {/* 간극 슬라이더 + 미리보기 막대 */}
            <div>
              <label style={fieldLabel}>욕구 ↔ 필요 간극: <b style={{ color: 'var(--accent)' }}>{draft.gap}</b> <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({previewGapLbl})</span></label>
              <input type="range" min={0} max={100} value={draft.gap} onChange={(e) => set('gap', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              <div style={{ marginTop: 8 }}><GapBar gap={draft.gap} awk={previewAwk} /></div>
              <span style={{ ...fieldHint, marginTop: 4 }}>간극이 클수록 욕구와 필요가 강하게 충돌해 아크가 단단해집니다. ● 는 각성 추정 지점.</span>
            </div>

            {/* 거짓 신념 / 진실 */}
            <div style={grid2}>
              <div>
                <label style={{ ...fieldLabel, color: 'var(--warn)' }}>거짓 신념 (Lie)</label>
                <span style={fieldHint}>욕구를 떠받치고 필요를 가로막는 잘못된 믿음</span>
                <textarea style={ta} value={draft.lie} onChange={(e) => set('lie', e.target.value)} placeholder="예: 나를 사랑하면 결국 떠난다" maxLength={300} />
              </div>
              <div>
                <label style={fieldLabel}>진실 (Truth)</label>
                <span style={fieldHint}>거짓 신념을 깨뜨리는 깨달음</span>
                <textarea style={ta} value={draft.truth} onChange={(e) => set('truth', e.target.value)} placeholder="예: 먼저 밀어낸 것은 나 자신이었다" maxLength={300} />
              </div>
            </div>

            <div style={grid2}>
              <div>
                <label style={fieldLabel}>상처 / 유령 (Ghost)</label>
                <span style={fieldHint}>거짓 신념이 생긴 과거의 사건</span>
                <textarea style={ta} value={draft.ghost} onChange={(e) => set('ghost', e.target.value)} placeholder="예: 어린 시절 부모에게 버림받음" maxLength={300} />
              </div>
              <div>
                <label style={fieldLabel}>각성 지점 (Awakening)</label>
                <span style={fieldHint}>인물이 거짓을 처음 의심·직면하는 순간</span>
                <textarea style={ta} value={draft.awakening} onChange={(e) => set('awakening', e.target.value)} placeholder="예: 신뢰했던 이가 끝까지 곁을 지킴" maxLength={300} />
              </div>
            </div>

            <div>
              <label style={fieldLabel}>대가 (Cost)</label>
              <span style={fieldHint}>필요를 받아들이려면 욕구가 무엇을 치러야 하나</span>
              <input style={input} value={draft.cost} onChange={(e) => set('cost', e.target.value)} placeholder="예: 평생 쌓은 성공의 일부를 포기" maxLength={200} />
            </div>

            <div style={grid2}>
              <div>
                <label style={fieldLabel}>아크 유형</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ARCS.map((a) => (
                    <button key={a.v} className={draft.arc === a.v ? 'btn-primary' : 'minibtn'} title={a.hint} onClick={() => set('arc', a.v)} style={{ fontSize: 12 }}>{a.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={fieldLabel}>결말 유형</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ENDINGS.map((en) => (
                    <button key={en.v} className={draft.ending === en.v ? 'btn-primary' : 'minibtn'} title={en.hint} onClick={() => set('ending', en.v)} style={{ fontSize: 12 }}>{en.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={fieldLabel}>태그 (쉼표로 구분, 선택)</label>
              <input style={input} value={draft.tags} onChange={(e) => set('tags', e.target.value)} placeholder="예: 성장, 비극, 메인플롯" maxLength={120} />
            </div>

            {/* 사용자 정의 항목 — 직접 추가/입력(무작위 생성 안 함) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <label style={{ ...fieldLabel, marginBottom: 0 }}>사용자 정의 항목</label>
                <span style={{ ...fieldHint, marginBottom: 0 }}>필요한 항목을 직접 추가해 적으세요</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={addCustom}>＋ 항목 추가</button>
              </div>
              {custom.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {custom.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ ...tag, flex: '0 0 auto', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.label}>{it.label}</span>
                      <input style={{ ...input, flex: 1 }} value={it.value} onChange={(e) => setCustomValue(it.id, e.target.value)} placeholder="직접 입력" maxLength={400} />
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="항목 삭제" onClick={() => removeCustom(it.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 고정 '기타' 자유 입력 */}
            <div>
              <label style={fieldLabel}>기타</label>
              <span style={fieldHint}>위 항목에 담기 어려운 메모를 자유롭게 적으세요</span>
              <textarea style={{ ...ta, minHeight: 70 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 기록…" maxLength={2000} />
            </div>
          </div>

          {/* 미리보기 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}>아크 미리보기</h4>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(previewPara, 'preview')}>{copied === 'preview' ? '✓ 복사됨' : <><Emoji e="📋" /> 문단 복사</>}</button>
            </div>
            <div style={{ marginBottom: 10 }}><ArcTrack c={draft} /></div>
            <div style={para}>{previewPara}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveDraft}>{editId ? '수정 저장' : <><Emoji e="💾" /> 인물 카드 저장</>}</button>
            {editId && <button className="minibtn" onClick={clearDraft}>새 카드로</button>}
          </div>
        </div>

        {/* 카드 목록 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>인물 카드 · {cards.length}개</h4>
          </div>

          {cards.length === 0 ? (
            <div style={emptyBox}>
              아직 인물 카드가 없습니다.<br />
              위에서 <b>원하는 것(욕구)</b>과 <b>진짜 필요한 것</b>을 입력하고 <b>저장</b>하면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단 <b><Emoji e="📚" /> 작품 예시</b>로 시작하거나, 좌측 바인더의 인물 파일을 끌어다 놓으세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cards.map((c) => {
                const isOpen = openId === c.id
                const endMeta = ENDINGS.find((e) => e.v === c.ending)
                return (
                  <div key={c.id} style={{ background: 'var(--chrome-2)', border: '1px solid ' + (editId === c.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 11, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>{person(c.name)}</b>
                      {c.role.trim() && <span style={tag}>{c.role}</span>}
                      <span style={{ ...tag, color: endMeta?.color, borderColor: endMeta?.color }}>{endMeta?.label}</span>
                      <span style={tag}>{ARCS.find((a) => a.v === c.arc)?.label}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title={isOpen ? '접기' : '펼쳐 보기'} onClick={() => setOpenId(isOpen ? null : c.id)}>{isOpen ? '▲' : '▼'}</button>
                        <button style={iconBtn} title="복사" onClick={() => copyCard(c)}>{copied === 'c' + c.id ? '✓' : '복사'}</button>
                        <button style={iconBtn} title="편집" onClick={() => editCard(c)}><Emoji e="✏️" /></button>
                        <button style={iconBtn} title="복제" onClick={() => dupCard(c)}>⧉</button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeCard(c.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>

                    <GapBar gap={c.gap} compact />
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                      <span><b style={{ color: 'var(--accent)' }}>욕구</b> {dash(c.want)}</span>
                      <span style={{ color: 'var(--muted)' }}>↔</span>
                      <span><b style={{ color: 'var(--ok)' }}>필요</b> {dash(c.need)}</span>
                    </div>

                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <ArcTrack c={c} />
                        <div style={para}>{synthesize(c)}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 6, fontSize: 12.5, lineHeight: 1.6 }}>
                          <div><b style={{ color: 'var(--warn)' }}>거짓 신념:</b> {dash(c.lie)}</div>
                          <div><b>진실:</b> {dash(c.truth)}</div>
                          <div><b>상처:</b> {dash(c.ghost)}</div>
                          <div><b>각성:</b> {dash(c.awakening)}</div>
                          <div><b>대가:</b> {dash(c.cost)}</div>
                          <div><b>간극:</b> {c.gap} ({gapLabel(c.gap)})</div>
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
                          <button className="linkbtn" onClick={() => toProjectDoc(c)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 아크 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 아크 문서</button>
                          <button className="linkbtn" onClick={() => toLibrary(c)}><Emoji e="📥" /> 인물 라이브러리</button>
                          <button className="linkbtn" onClick={() => toSheet(c)}><Emoji e="🪪" /> 인물 시트로</button>
                          <button className="linkbtn" onClick={() => toInnerArc(c)}><Emoji e="🎭" /> 내면 아크로</button>
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
          <b>욕구(Want)</b> 는 인물이 의식적으로 좇는 외적 목표로 플롯을 움직이고, <b>필요(Need)</b> 는 인물이 진짜로 결핍한 내적 성장입니다.
          둘 사이의 <b>간극</b> 을 떠받치는 것이 <b>거짓 신념(Lie)</b> 이며, 이는 과거의 <b>상처</b> 에서 옵니다.
          <b>각성</b> 을 통해 거짓이 흔들리고, 결말에서 인물은 진실을 받아들이거나(성장) 외면합니다(타락/비극).
          모든 카드는 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
