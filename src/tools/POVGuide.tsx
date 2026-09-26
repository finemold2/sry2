// 시점·서술 거리 가이드 — 1인칭/3인칭 제한·전지적/2인칭/관찰자 등 시점별 특징·장단점·예문과
// 과거/현재 시제 비교, 그리고 "내 글에 맞는 시점 고르기" 질문지를 제공하는 로컬 참고 도구.
// 자급식: react 외에 './linkbus' 만 import. 외부 네트워크 없음. localStorage 로 펼침 상태·진단 답을 저장.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'pov-guide', name: '시점·서술 거리 가이드', icon: '🎥', group: '언어·어휘', intro: '1인칭·3인칭·전지적·2인칭·관찰자 시점별 특징·장단점·예문과 시제 비교, 내 글에 맞는 시점 진단', w: 640, h: 680 }

const LS_KEY = 'sry:tool:pov-guide'

interface POV {
  id: string
  name: string          // 시점 이름
  short: string         // 짧은 라벨(태그/검색용)
  person: string        // 인칭/거리 요약
  summary: string       // 한 줄 정의
  distance: string      // 서술 거리(독자와 인물의 심리적 간격)
  feel: string          // 어떤 효과/느낌
  pros: string[]        // 장점
  cons: string[]        // 단점
  bestFor: string[]     // 어울리는 글
  example: string       // 같은 장면을 이 시점으로 쓴 예문
  tip: string           // 실전 팁
}

// 같은 한 장면("비 오는 정류장에서 그녀가 버스를 기다린다")을 시점마다 다시 써서 차이를 체감하게 한다.
const POVS: POV[] = [
  {
    id: 'first',
    name: '1인칭 주인공 시점',
    short: '1인칭',
    person: '“나”가 직접 서술 · 거리 0',
    summary: '이야기의 중심 인물(나)이 자기 경험을 직접 들려준다.',
    distance: '가장 가깝다. 독자는 화자의 머릿속에 완전히 들어가 함께 느낀다.',
    feel: '친밀하고 몰입감이 강하다. 화자의 목소리·편견·감정이 그대로 묻어난다.',
    pros: [
      '독자가 화자와 즉시 동일시되어 몰입이 빠르다.',
      '화자만의 말투·세계관·유머가 강한 개성을 만든다.',
      '내면 독백·자기기만을 자연스럽게 담을 수 있다.',
      '“믿을 수 없는 화자(unreliable narrator)”로 반전·긴장을 설계하기 좋다.',
    ],
    cons: [
      '화자가 보고 듣고 아는 것만 쓸 수 있어 정보가 제한된다.',
      '화자가 없는 장면(다른 인물의 비밀 등)을 직접 보여줄 수 없다.',
      '화자 외모·이름을 자연스럽게 알리기 까다롭다(거울 클리셰 주의).',
      '“나는 ~했다”가 반복되며 단조로워지기 쉽다.',
    ],
    bestFor: ['성장·자기 고백 서사', '추리(화자=탐정/용의자)', '강한 캐릭터 보이스가 핵심인 글', '회고록·일기체'],
    example:
      '나는 정류장 처마 밑에 서서 버스를 기다렸다. 빗물이 운동화 끝을 적셨지만 자리를 옮기지 않았다. 그가 오지 않을 걸 알면서도, 나는 늘 이쪽 끝에 섰다.',
    tip: '“나는 ~을 보았다/느꼈다”를 줄이고 본 것·느낀 것 자체를 바로 적으면(“빗물이 운동화 끝을 적셨다”) 거리가 더 좁아진다.',
  },
  {
    id: 'first-observer',
    name: '1인칭 관찰자 시점',
    short: '1인칭 관찰자',
    person: '“나”가 곁에서 다른 주인공을 서술 · 거리 중간',
    summary: '화자(나)는 곁에서 지켜보는 조연이고, 진짜 주인공은 따로 있다.',
    distance: '주인공과는 거리가 있고, 화자 자신과는 가깝다. 주인공은 끝내 다 알 수 없는 수수께끼로 남는다.',
    feel: '주인공을 신비롭게·거리감 있게 그릴 수 있다(개츠비, 셜록 홈즈의 왓슨).',
    pros: [
      '주인공을 외부에서 입체적·신화적으로 조형할 수 있다.',
      '화자가 모르는 부분이 자연스러운 미스터리가 된다.',
      '화자의 감탄·해석을 통해 주인공을 추켜세우거나 의심하게 만든다.',
    ],
    cons: [
      '주인공의 내면을 직접 보여줄 수 없다(추측만 가능).',
      '화자가 모든 핵심 장면에 “마침 있어야” 해서 설정이 부자연스러울 수 있다.',
      '독자가 화자보다 주인공에게 끌리면 화자가 군더더기처럼 느껴진다.',
    ],
    bestFor: ['전설적 인물을 그리는 글(개츠비형)', '탐정-조수 구조의 추리', '한 인물을 회고하며 재평가하는 서사'],
    example:
      '그녀는 정류장 끝에 홀로 서 있었다. 나는 그녀가 왜 늘 그 자리만 고집하는지 끝내 묻지 못했다. 다만 비가 올 때마다, 그녀의 시선은 오지 않는 무언가를 향해 있었다.',
    tip: '화자가 “왜”를 다 설명하지 말고 관찰만 남겨라. 빈칸이 곧 주인공의 매력이 된다.',
  },
  {
    id: 'third-limited',
    name: '3인칭 제한적 시점',
    short: '3인칭 제한',
    person: '“그/그녀”로 서술하되 한 인물의 내면만 · 거리 가까움',
    summary: '한 인물(시점 인물)의 어깨에 카메라를 얹고, 그 사람이 알고 느끼는 것만 보여준다.',
    distance: '1인칭만큼 가깝게도, 멀게도 조절할 수 있다. 현대 소설에서 가장 널리 쓰인다.',
    feel: '몰입(1인칭)과 유연함(3인칭)의 균형. 시점 인물 교체로 다층 서사를 짤 수 있다.',
    pros: [
      '시점 인물의 내면에 깊이 들어가면서도 “그/그녀”의 객관적 거리를 둘 수 있다.',
      '장(章)마다 시점 인물을 바꿔 여러 관점을 보여줄 수 있다(장면 안에서는 고정).',
      '1인칭의 “나” 반복 문제에서 자유롭다.',
    ],
    cons: [
      '한 장면 안에서 시점이 흔들리면 “머리 넘나들기(head-hopping)”로 혼란을 준다.',
      '시점 인물이 모르는 정보는 쓸 수 없어 1인칭과 같은 제약이 일부 남는다.',
      '시점 인물 선택을 잘못하면 가장 중요한 순간을 놓친다.',
    ],
    bestFor: ['장편·시리즈(다중 시점)', '장르 소설 대부분', '몰입과 구성 자유가 둘 다 필요한 글'],
    example:
      '지수는 정류장 처마 밑에서 버스를 기다렸다. 운동화 끝이 젖어 들었지만 그녀는 움직이지 않았다. 그가 오지 않으리란 걸 알면서도, 그녀의 발은 늘 이쪽 끝을 향했다.',
    tip: '한 장면=한 시점 인물 원칙을 지켜라. 시점을 바꾸려면 장면 전환(빈 줄·장 구분)을 두고 옮겨라.',
  },
  {
    id: 'third-omniscient',
    name: '전지적 작가 시점',
    short: '전지적',
    person: '모든 것을 아는 서술자 · 거리 멀거나 자유자재',
    summary: '서술자가 모든 인물의 내면·과거·미래를 알고, 신처럼 내려다보며 들려준다.',
    distance: '멀리서 전체를 조망하거나, 필요할 때 특정 인물에게 줌인한다. 서술자 자신의 목소리도 낼 수 있다.',
    feel: '서사적 규모와 권위. 시대·사회·여러 인물을 한 흐름으로 엮을 수 있다(고전 대하소설).',
    pros: [
      '어떤 인물의 내면도, 어떤 장면도 자유롭게 보여줄 수 있다.',
      '서술자의 논평·아이러니로 주제를 직접 짚을 수 있다.',
      '광대한 무대·다수 인물·긴 시간을 한 시야에 담기 좋다.',
    ],
    cons: [
      '거리가 멀어 특정 인물에 대한 깊은 몰입이 약해질 수 있다.',
      '아무 곳이나 들여다보면 긴장(“다음에 뭐가?”)이 풀린다.',
      '현대 독자에겐 설교조·구식으로 느껴질 위험이 있다.',
      '“머리 넘나들기”와의 경계가 모호해 통제력이 필요하다.',
    ],
    bestFor: ['대하·역사 소설', '사회 전체를 조망하는 글', '서술자 목소리가 매력인 우화·풍자'],
    example:
      '비는 도시를 고르게 적셨다. 정류장 끝에서 지수가 오지 않을 사람을 기다리는 동안, 세 정거장 떨어진 곳에서는 바로 그 사람이 우산을 접으며 다른 길로 돌아서고 있었다. 두 사람 다 그 사실을 알지 못했다.',
    tip: '“무엇을 보여주지 않을지”를 정하라. 전지적이라고 다 보여주면 긴장이 사라진다. 줌인/줌아웃의 리듬이 핵심.',
  },
  {
    id: 'third-objective',
    name: '3인칭 객관(관찰) 시점',
    short: '3인칭 객관',
    person: '“그/그녀”의 겉모습·행동·말만, 내면은 안 들여다봄 · 거리 멀다',
    summary: '카메라처럼 보이는 것·들리는 것만 기록하고, 누구의 속마음도 직접 말하지 않는다.',
    distance: '가장 멀다(외부 관찰). 독자는 행동·대사로 인물 마음을 추론해야 한다(“보여주기”의 극단).',
    feel: '냉정하고 영화적. 절제된 긴장과 객관성(헤밍웨이 「흰 코끼리 같은 산」).',
    pros: [
      '강한 절제미와 객관성으로 독자에게 해석의 여지를 준다.',
      '“말하지 않기”로 서브텍스트·긴장을 극대화한다.',
      '시나리오·미니멀리즘 단편에 잘 맞는다.',
    ],
    cons: [
      '내면을 못 보여줘 감정 이입이 어렵고 차갑게 느껴질 수 있다.',
      '긴 분량 유지가 어렵다(주로 단편·장면 단위).',
      '독자가 단서를 놓치면 의도가 전달되지 않는다.',
    ],
    bestFor: ['미니멀 단편', '긴장된 대화 장면', '시나리오·각본형 서술'],
    example:
      '그녀는 정류장 끝에 섰다. 버스가 두 대 지나갔다. 그녀는 타지 않았다. 빗물이 운동화에 스며들었지만 그녀는 발을 옮기지 않았고, 시계도 보지 않았다.',
    tip: '내면을 적고 싶을 때 행동·사물로 바꿔라. “불안했다” 대신 “손가락이 가방끈을 거듭 감았다 풀었다”.',
  },
  {
    id: 'second',
    name: '2인칭 시점',
    short: '2인칭',
    person: '“너/당신”으로 독자를 인물로 끌어들임 · 거리 독특',
    summary: '서술자가 독자(“너”)를 주인공 자리에 앉히고 “너는 ~한다”라고 말한다.',
    distance: '실험적. 독자를 직접 무대로 끌어올려 몰입과 거북함을 동시에 일으킨다.',
    feel: '강렬하고 실험적. 게임북·지시문·내면화된 자기 대화에 효과적.',
    pros: [
      '독자를 직접 인물로 만들어 강한 몰입·긴장을 준다.',
      '드물어서 신선하고 강렬한 인상을 남긴다.',
      '자기 자신에게 말하는 인물의 거리감(자기 분열)을 표현하기 좋다.',
    ],
    cons: [
      '길게 유지하면 독자가 피로해지고 거부감을 느낀다.',
      '“너”의 행동·감정을 독자가 동의하지 않으면 몰입이 깨진다.',
      '장편에서 성공시키기가 매우 어렵다(주로 단편·부분).',
    ],
    bestFor: ['게임북·인터랙티브', '강렬한 실험 단편', '지시·매뉴얼 패러디', '자기 대화·내면 분열 장면'],
    example:
      '너는 정류장 끝에 선다. 빗물이 운동화로 스며드는 게 느껴진다. 그가 오지 않을 걸 너도 안다. 그런데도 너는 또 이 자리에 선다.',
    tip: '짧게, 의도가 분명할 때만 써라. 일부 장(章)이나 프롤로그에서만 2인칭을 쓰는 혼합도 효과적이다.',
  },
]

// ---- 시제 비교 ----
interface TenseRow { label: string; past: string; present: string }
const TENSE_ROWS: TenseRow[] = [
  { label: '느낌', past: '안정적·전통적. “이미 일어난 일을 들려준다”는 안정감.', present: '즉각적·긴박. “지금 일어나는 중”이라는 현장감.' },
  { label: '거리', past: '사건과 약간의 거리(회고). 정리된 서술에 유리.', present: '거리 0. 인물과 동시에 호흡하지만 회고적 통찰은 약해진다.' },
  { label: '강점', past: '시간 이동(과거의 과거·미래 암시)이 자연스럽다.', present: '긴장·서스펜스·몰입에 강하다(스릴러·1인칭 청소년물 인기).' },
  { label: '약점', past: '자칫 평범·밋밋하게 느껴질 수 있다.', present: '길어지면 숨가쁘고 피로하다. 과거 회상 처리가 까다롭다.' },
  { label: '예문', past: '그녀는 버스를 기다렸다. 빗물이 운동화를 적셨다.', present: '그녀는 버스를 기다린다. 빗물이 운동화를 적신다.' },
]

// ---- 시점 진단 질문 ----
interface Choice { label: string; weight: Partial<Record<string, number>> }
interface Question { id: string; q: string; choices: Choice[] }
// 가중치 키는 POVS 의 id 와 일치.
const QUESTIONS: Question[] = [
  {
    id: 'immersion',
    q: '독자가 한 인물에 얼마나 깊이 빠지길 원하나요?',
    choices: [
      { label: '머릿속까지 완전히 — 인물=독자', weight: { first: 3, second: 2 } },
      { label: '깊게, 하지만 약간의 거리는 두고', weight: { 'third-limited': 3, first: 1 } },
      { label: '여러 인물·전체를 조망하며', weight: { 'third-omniscient': 3 } },
      { label: '겉으로 드러난 것만, 차갑게', weight: { 'third-objective': 3 } },
    ],
  },
  {
    id: 'pov-count',
    q: '시점 인물(중심 화자)을 몇 명 두고 싶나요?',
    choices: [
      { label: '딱 한 명에게 집중', weight: { first: 2, 'third-limited': 2 } },
      { label: '장마다 바꿔 여럿(2~5명)', weight: { 'third-limited': 3 } },
      { label: '제한 없이, 누구든 들여다보게', weight: { 'third-omniscient': 3 } },
      { label: '주인공은 따로, 화자는 곁의 관찰자', weight: { 'first-observer': 3 } },
    ],
  },
  {
    id: 'voice',
    q: '화자만의 강한 “목소리(말투·편견)”가 이야기의 핵심인가요?',
    choices: [
      { label: '그렇다 — 보이스가 곧 매력', weight: { first: 3, second: 1 } },
      { label: '어느 정도, 자연스러운 정도면 된다', weight: { 'third-limited': 2 } },
      { label: '서술자(작가)의 논평·아이러니가 매력', weight: { 'third-omniscient': 3 } },
      { label: '아니다 — 절제·객관이 좋다', weight: { 'third-objective': 3 } },
    ],
  },
  {
    id: 'secret',
    q: '시점 인물이 모르는 정보(다른 인물의 비밀 등)를 독자에게 보여줘야 하나요?',
    choices: [
      { label: '아니다 — 화자가 아는 만큼만', weight: { first: 2, 'third-limited': 2 } },
      { label: '그렇다 — 독자는 더 많이 알아야 한다', weight: { 'third-omniscient': 3 } },
      { label: '오히려 화자보다 독자가 덜 알아야(미스터리)', weight: { first: 2, 'first-observer': 2 } },
    ],
  },
  {
    id: 'scope',
    q: '이야기의 규모는 어느 쪽에 가깝나요?',
    choices: [
      { label: '한 사람의 내밀한 경험', weight: { first: 3, 'third-limited': 1 } },
      { label: '여러 인물이 얽힌 중간 규모', weight: { 'third-limited': 3 } },
      { label: '시대·사회를 아우르는 대하 서사', weight: { 'third-omniscient': 3 } },
      { label: '짧고 강렬한 한 장면', weight: { 'third-objective': 2, second: 2 } },
    ],
  },
  {
    id: 'experiment',
    q: '형식 실험(드물고 강렬한 효과)에 도전할 의향이 있나요?',
    choices: [
      { label: '있다 — 독자를 직접 끌어들이고 싶다', weight: { second: 4 } },
      { label: '약간 — 신선하면 좋지만 무리는 안 한다', weight: { first: 1, 'third-limited': 1 } },
      { label: '아니다 — 안정적인 정공법이 좋다', weight: { 'third-limited': 2, 'third-omniscient': 1 } },
    ],
  },
]

interface Saved {
  id: string
  title: string
  povId: string
  povName: string
  tense: 'past' | 'present'
  note: string
  createdAt: number
}

function loadState(): { open: Record<string, boolean>; answers: Record<string, number>; tense: 'past' | 'present'; saved: Saved[] } {
  const blank = { open: {} as Record<string, boolean>, answers: {} as Record<string, number>, tense: 'past' as const, saved: [] as Saved[] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return blank
    const p = JSON.parse(raw)
    const open = (p?.open && typeof p.open === 'object') ? p.open as Record<string, boolean> : {}
    const answers = (p?.answers && typeof p.answers === 'object') ? p.answers as Record<string, number> : {}
    const tense: 'past' | 'present' = p?.tense === 'present' ? 'present' : 'past'
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved.filter((x: unknown) => x && typeof (x as Saved).povId === 'string').map((x: Saved) => ({
          id: String(x.id || Date.now() + Math.random()),
          title: String(x.title || ''),
          povId: String(x.povId || ''),
          povName: String(x.povName || ''),
          tense: x.tense === 'present' ? 'present' : 'past',
          note: String(x.note || ''),
          createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
        }))
      : []
    return { open, answers, tense, saved }
  } catch {
    return blank
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function POVGuide({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(init.current.open)
  const [answers, setAnswers] = useState<Record<string, number>>(init.current.answers)
  const [tense, setTense] = useState<'past' | 'present'>(init.current.tense)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState<string>('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 특정 시점 펼치기(연계로 열렸을 때)
  useEffect(() => {
    const pid = payload?.povId
    if (typeof pid === 'string' && POVS.some((p) => p.id === pid)) {
      setOpen((o) => ({ ...o, [pid]: true }))
    }
  }, [payload])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ open, answers, tense, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [open, answers, tense, saved])

  const flashNote = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => { if (mounted.current) setFlash('') }, 2600)
  }

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const expandAll = () => setOpen(Object.fromEntries(POVS.map((p) => [p.id, true])))
  const collapseAll = () => setOpen({})

  // 검색 필터(이름·정의·인칭·예문·태그)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? POVS.filter((p) =>
        [p.name, p.short, p.person, p.summary, p.distance, p.feel, p.example, p.tip, ...p.pros, ...p.cons, ...p.bestFor]
          .join(' ').toLowerCase().includes(q))
    : POVS

  // 진단 점수 계산
  const scores: Record<string, number> = {}
  POVS.forEach((p) => { scores[p.id] = 0 })
  QUESTIONS.forEach((quest) => {
    const ci = answers[quest.id]
    if (ci == null) return
    const choice = quest.choices[ci]
    if (!choice) return
    Object.entries(choice.weight).forEach(([k, w]) => { scores[k] = (scores[k] || 0) + (w || 0) })
  })
  const answeredCount = QUESTIONS.filter((quest) => answers[quest.id] != null).length
  const ranked = [...POVS].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const topScore = scores[ranked[0]?.id] || 0
  const hasResult = answeredCount > 0 && topScore > 0
  const winners = hasResult ? ranked.filter((p) => (scores[p.id] || 0) === topScore) : []
  const runnersUp = hasResult ? ranked.filter((p) => (scores[p.id] || 0) < topScore && (scores[p.id] || 0) > 0).slice(0, 2) : []

  const setAnswer = (qid: string, ci: number) => setAnswers((a) => ({ ...a, [qid]: ci }))
  const resetQuiz = () => setAnswers({})

  // 한 시점의 전체 설명을 텍스트로(복사용)
  const povToText = (p: POV): string => [
    `${p.name} (${p.person})`,
    p.summary,
    `· 서술 거리: ${p.distance}`,
    `· 효과: ${p.feel}`,
    `· 장점: ${p.pros.join(' / ')}`,
    `· 단점: ${p.cons.join(' / ')}`,
    `· 어울리는 글: ${p.bestFor.join(', ')}`,
    `· 예문: ${p.example}`,
    `· 팁: ${p.tip}`,
  ].join('\n')

  // 진단 결과(또는 선택한 시점)를 프로젝트 자료 〈기획〉 폴더에 시점 메모로 추가
  const addResultToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!hasResult) { flashNote('먼저 아래 진단 질문에 답해 추천 시점을 받아 보세요.'); return }
    const top = winners[0]
    const tenseLabel = tense === 'past' ? '과거 시제' : '현재 시제'
    const answeredHtml = QUESTIONS.filter((quest) => answers[quest.id] != null).map((quest) => {
      const c = quest.choices[answers[quest.id]]
      return `<li><b>${escapeHtml(quest.q)}</b><br/>→ ${escapeHtml(c?.label || '')}</li>`
    }).join('')
    const bodyHtml = [
      `<p style="font-size:15px;"><b>추천 시점: ${escapeHtml(winners.map((w) => w.name).join(' / '))}</b></p>`,
      `<p><b>권장 시제:</b> ${escapeHtml(tenseLabel)}</p>`,
      `<p><b>한 줄 정의:</b> ${escapeHtml(top.summary)}</p>`,
      `<p><b>서술 거리:</b> ${escapeHtml(top.distance)}</p>`,
      `<p><b>장점:</b> ${escapeHtml(top.pros.join(' / '))}</p>`,
      `<p><b>주의(단점):</b> ${escapeHtml(top.cons.join(' / '))}</p>`,
      `<p><b>예문:</b> ${escapeHtml(top.example)}</p>`,
      `<p><b>팁:</b> ${escapeHtml(top.tip)}</p>`,
      runnersUp.length ? `<p><b>대안 검토:</b> ${escapeHtml(runnersUp.map((r) => r.name).join(', '))}</p>` : '',
      note.trim() ? `<hr/><p><b>메모:</b> ${escapeHtml(note.trim())}</p>` : '',
      answeredHtml ? `<hr/><p style="color:#888;font-size:12px;">진단 답변</p><ul>${answeredHtml}</ul>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: title.trim() || `시점 설계 — ${winners.map((w) => w.name).join('/')}`,
      bodyHtml,
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시점 메모를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 한 시점 카드를 저장 목록에 담기
  const saveCurrentPick = () => {
    if (!hasResult) { flashNote('먼저 진단에 답해 추천 시점을 받아 보세요.'); return }
    const top = winners[0]
    const rec: Saved = {
      id: newId(),
      title: title.trim() || `${top.name} (${tense === 'past' ? '과거' : '현재'})`,
      povId: top.id,
      povName: winners.map((w) => w.name).join(' / '),
      tense,
      note: note.trim(),
      createdAt: Date.now(),
    }
    setSaved((p) => [rec, ...p])
    flashNote('추천 시점을 저장 목록에 담았습니다.')
  }
  const removeSaved = (id: string) => setSaved((p) => p.filter((s) => s.id !== id))

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const bodyWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const exampleBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', fontSize: 13.5, lineHeight: 1.75, wordBreak: 'keep-all' }
  const tag: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }
  const tenseBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const choiceBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', width: '100%', padding: '8px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, lineHeight: 1.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.05)' : 'var(--chrome-2)', color: 'var(--text)',
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎥"/> 시점·서술 거리 가이드</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>시점별 특징·장단점·예문 · 시제 비교 · 내 글 진단</span>
      </div>

      <div style={bodyWrap}>
        {flash && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{flash}</div>
        )}

        {/* 검색 + 펼침 제어 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...input, flex: 1, minWidth: 180 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="시점·효과로 검색 (예: 몰입, 미스터리, 객관, 다중 시점)"
          />
          <button className="minibtn" onClick={expandAll}>모두 펼치기</button>
          <button className="minibtn" onClick={collapseAll}>모두 접기</button>
        </div>

        {/* 시점 카드 목록(펼침형) */}
        <div style={card}>
          <h4 style={sectionTitle}>시점 종류 — {POVS.length}가지 {q && <span style={hint}>({filtered.length}개 검색됨)</span>}</h4>
          {filtered.length === 0 ? (
            <div style={{ ...hint, textAlign: 'center', padding: '14px 0' }}>검색 결과가 없습니다. 다른 말로 찾아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((p) => {
                const isOpen = !!open[p.id]
                return (
                  <div key={p.id} style={{ border: '1px solid ' + (isOpen ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, background: 'var(--chrome-2)', overflow: 'hidden' }}>
                    <button
                      onClick={() => toggle(p.id)}
                      aria-expanded={isOpen}
                      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isOpen ? '▼' : '▶'}</span>
                      <b style={{ fontSize: 13.5 }}>{p.name}</b>
                      <span style={tag}>{p.short}</span>
                      <span style={{ ...hint, marginLeft: 'auto' }}>{p.person}</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.65, wordBreak: 'keep-all' }}>{p.summary}</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}><b style={{ color: 'var(--muted)' }}>서술 거리</b> · {p.distance}</div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}><b style={{ color: 'var(--muted)' }}>효과</b> · {p.feel}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ ...fieldLabel, color: '#3a9e5c' }}>장점</div>
                            <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {p.pros.map((x, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.55, wordBreak: 'keep-all' }}>{x}</li>)}
                            </ul>
                          </div>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ ...fieldLabel, color: 'var(--warn)' }}>단점·주의</div>
                            <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {p.cons.map((x, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.55, wordBreak: 'keep-all' }}>{x}</li>)}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <div style={fieldLabel}>어울리는 글</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {p.bestFor.map((x, i) => <span key={i} style={tag}>{x}</span>)}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ ...fieldLabel, margin: 0 }}>같은 장면, 이 시점의 예문</span>
                            <button style={{ ...iconBtn, marginLeft: 'auto' }} title="예문 복사" onClick={() => copy(p.example, 'ex-' + p.id)}>{copied === 'ex-' + p.id ? '✓' : '복사'}</button>
                          </div>
                          <div style={exampleBox}>{p.example}</div>
                        </div>

                        <div style={{ ...hint, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}><Emoji e="💡"/> {p.tip}</div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="minibtn" onClick={() => copy(povToText(p), 'all-' + p.id)}>{copied === 'all-' + p.id ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 설명 복사</>}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 시제 비교 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>시제 비교 — 과거 vs 현재</h4>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button style={tenseBtn(tense === 'past')} onClick={() => setTense('past')}>과거 시제</button>
              <button style={tenseBtn(tense === 'present')} onClick={() => setTense('present')}>현재 시제</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TENSE_ROWS.map((r) => (
              <div key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <div style={{ flex: '0 0 52px', fontSize: 12, color: 'var(--muted)', fontWeight: 700, alignSelf: 'center' }}>{r.label}</div>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (tense === 'past' ? 'var(--accent)' : 'var(--border)'), background: tense === 'past' ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)', wordBreak: 'keep-all' }}>{r.past}</div>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (tense === 'present' ? 'var(--accent)' : 'var(--border)'), background: tense === 'present' ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)', wordBreak: 'keep-all' }}>{r.present}</div>
              </div>
            ))}
          </div>
          <div style={{ ...hint, marginTop: 8 }}>선택한 시제(<b>{tense === 'past' ? '과거' : '현재'}</b>)는 아래 진단 결과·프로젝트 메모에 함께 기록됩니다.</div>
        </div>

        {/* 내 글에 맞는 시점 고르기 (진단) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>내 글에 맞는 시점 고르기</h4>
            <span style={{ ...hint, marginLeft: 'auto' }}>{answeredCount}/{QUESTIONS.length} 답함</span>
            <button className="minibtn" onClick={resetQuiz} disabled={!answeredCount}>초기화</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {QUESTIONS.map((quest, qi) => (
              <div key={quest.id}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, wordBreak: 'keep-all' }}>{qi + 1}. {quest.q}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quest.choices.map((c, ci) => (
                    <button key={ci} style={choiceBtn(answers[quest.id] === ci)} onClick={() => setAnswer(quest.id, ci)}>
                      {answers[quest.id] === ci ? '● ' : '○ '}{c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 결과 */}
          {hasResult ? (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--paper)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>추천 시점{answeredCount < QUESTIONS.length ? ' (질문을 더 답할수록 정확해집니다)' : ''}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {winners.map((w) => (
                  <span key={w.id} style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</span>
                ))}
                <span style={tag}>{tense === 'past' ? '과거 시제' : '현재 시제'} 권장</span>
                <button style={{ ...iconBtn, marginLeft: 'auto' }} title="결과 펼쳐 보기" onClick={() => winners[0] && setOpen((o) => ({ ...o, [winners[0].id]: true }))}>상세 ↑</button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 8, wordBreak: 'keep-all' }}>{winners[0]?.summary}</div>
              {runnersUp.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>대안으로 검토: {runnersUp.map((r) => r.name).join(', ')}</div>
              )}

              <div style={{ marginTop: 10 }}>
                <label style={fieldLabel}>메모 (선택 — 왜 이 시점인지, 시점 인물은 누구인지)</label>
                <input style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 주인공 지수의 내면을 깊게, 미스터리는 화자가 모르게" maxLength={200} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input style={{ ...input, flex: 1, minWidth: 150 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장/문서 제목 (예: 1부 시점 설계)" maxLength={60} />
                <button className="btn-primary" onClick={saveCurrentPick}><Emoji e="💾"/> 결과 저장</button>
              </div>

              {/* 연계: 진단 결과를 실제 프로젝트 자료 〈기획〉 폴더에 시점 메모 문서로 추가 */}
              <div className="linkbar" style={{ marginTop: 12 }}>
                <span className="linkbar-label">연계:</span>
                <button
                  className="linkbtn"
                  onClick={addResultToProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '추천 시점·시제·진단 답변을 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...hint, marginTop: 12, textAlign: 'center', padding: '14px 10px', border: '1px dashed var(--border)', borderRadius: 10 }}>
              질문에 답하면 여기에 <b>추천 시점</b>과 권장 시제가 나타납니다.<br />
              막막하다면 가장 널리 쓰이는 <b>3인칭 제한적 시점</b>부터 검토해 보세요.
            </div>
          )}
        </div>

        {/* 저장 목록 */}
        {saved.length > 0 && (
          <div style={card}>
            <h4 style={sectionTitle}>저장한 시점 설계 · {saved.length}건</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={tag}>{s.povName}</span>
                    <span style={tag}>{s.tense === 'past' ? '과거' : '현재'}</span>
                    <button style={{ ...iconBtn, marginLeft: 'auto', color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️"/></button>
                  </div>
                  {s.note && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'keep-all' }}>{s.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={hint}>
          시점은 “누구의 눈으로, 얼마나 가까이서 이야기하는가”를 정하는 가장 근본적인 선택입니다. 한번 정하면 끝까지 일관되게 지키되,
          장(章) 단위로 시점 인물을 바꾸는 것은 가능합니다. 펼침 상태·진단 답·저장 목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
