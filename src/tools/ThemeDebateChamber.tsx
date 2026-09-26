// 주제 토론장 — 하나의 주제(가치/질문)를 두 입장으로 의인화해 변증법적으로 다투게 하고,
//   정(正)·반(反)의 논증을 결정론적으로 생성한 뒤 충돌점을 정리해 합(合)을 도출한다.
//   라운드를 거듭하며 양측 주장을 쌓고, 사용자가 직접 논거를 추가/평가할 수 있다.
//   바인더 문서 드롭/ payload.text / 스니펫 라이브러리에서 주제를 받아오고,
//   결과를 프로젝트 자료에 문서로 추가하거나 수집함에 담고, 논증·대화 작업대 도구로 넘긴다.
//   자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬 계산).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
} from './linkbus'

export const meta = {
  id: 'theme-debate-chamber',
  name: '주제 토론장',
  icon: '⚖️',
  group: '구상·정리',
  intro: '주제를 두 입장으로 의인화해 정-반-합 변증 논증을 생성하고 충돌점을 합으로 도출',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:theme-debate-chamber'

// ───────────────────────── 결정론적 의사난수(시드=문자열 해시) ─────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length) % arr.length] }

// ───────────────────────── 한국어 조사(받침) 헬퍼 ─────────────────────────
// 앞 단어의 마지막 글자 받침 유무를 보고 실제 조사 하나를 골라 붙인다.
// 받침 없음(모음 끝) → 가/는/를/로,  받침 있음 → 이/은/을/으로.
// 'ㄹ' 받침은 '으로/로'에서 예외적으로 '로'를 쓴다.
function lastCharInfo(word: string): { hasBatchim: boolean; isRieul: boolean } {
  const s = (word || '').trim()
  if (!s) return { hasBatchim: false, isRieul: false }
  const code = s.charCodeAt(s.length - 1)
  // 완성형 한글 음절 범위
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return { hasBatchim: jong !== 0, isRieul: jong === 8 }
  }
  // 한글이 아니면(숫자·영문 등) 받침 있는 것으로 간주(자연스러운 기본값).
  return { hasBatchim: true, isRieul: false }
}
function josaEunNeun(word: string): string { return lastCharInfo(word).hasBatchim ? '은' : '는' }
function josaIGa(word: string): string { return lastCharInfo(word).hasBatchim ? '이' : '가' }
function josaEulReul(word: string): string { return lastCharInfo(word).hasBatchim ? '을' : '를' }
function josaWaGwa(word: string): string { return lastCharInfo(word).hasBatchim ? '과' : '와' }
function josaEuRo(word: string): string {
  const { hasBatchim, isRieul } = lastCharInfo(word)
  return hasBatchim && !isRieul ? '으로' : '로'
}
// 템플릿의 마커({t은}/{t이}/{t을}/{t으로}/{t와})를 주제 + 올바른 조사로 치환.
function fillTheme(tmpl: string, t: string): string {
  return tmpl
    .replace(/\{t은\}/g, t + josaEunNeun(t))
    .replace(/\{t이\}/g, t + josaIGa(t))
    .replace(/\{t을\}/g, t + josaEulReul(t))
    .replace(/\{t와\}/g, t + josaWaGwa(t))
    .replace(/\{t으로\}/g, t + josaEuRo(t))
    .replace(/\{t에\}/g, t + '에')   // 받침 무관(처소격)
    .replace(/\{t의\}/g, t + '의')   // 받침 무관(관형격)
    .replace(/\{t\}/g, t)
}
// 합 템플릿 치환: 주제 마커 + 두 대표 각도(a/b)와 그 조사를 받침에 맞게 채운다.
function fillSynth(tmpl: string, t: string, a: string, b: string): string {
  return fillTheme(tmpl, t)
    .replace(/\{waA\}/g, josaWaGwa(a))     // {a} 뒤 와/과
    .replace(/\{igaA\}/g, josaIGa(a))      // {a} 뒤 이/가
    .replace(/\{igaB\}/g, josaIGa(b))      // {b} 뒤 이/가
    .replace(/\{eulA\}/g, josaEulReul(a))
    .replace(/\{eulB\}/g, josaEulReul(b))
    .replace(/\{euroA\}/g, josaEuRo(a))
    .replace(/\{euroB\}/g, josaEuRo(b))
    .replace(/\{a\}/g, a)
    .replace(/\{b\}/g, b)
}

// ───────────────────────── 입장 의인화 ─────────────────────────
// 주제를 두 인격으로 세운다. PRO 는 주제를 옹호/추구, CON 은 의심/제동.
type Side = 'pro' | 'con'

interface Persona { name: string; temper: string; stance: string }

// 페르소나 이름(명사) — 모두 '옹호/추구' 또는 '의심/제동' 성향을 가진 인격 명사. 고유·중복 없음.
const PRO_NAMES = ['옹호자', '추진가', '신봉자', '낙관파', '개척자', '확신가', '수호자', '예찬가', '선구자', '신뢰자']
const CON_NAMES = ['회의자', '제동자', '냉소파', '비판가', '현실론자', '파수꾼', '반론가', '경계인', '의심가', '검증자']
// 페르소나 수식 별칭(관형 명사구) — 이름 앞에 붙어 인상을 더한다. 양측 공히 자연스러운 형용 명사.
const PRO_EPITHET = ['한낮의', '불꽃의', '새벽의', '광장의', '깃발을 든', '앞장선', '물러서지 않는', '뜨거운 심장의', '내일을 믿는', '문을 여는']
const CON_EPITHET = ['한밤의', '잿빛의', '그늘의', '서재의', '저울을 든', '뒤를 살피는', '쉽게 믿지 않는', '차가운 머리의', '어제를 기억하는', '문을 잠그는']
// 말하는 태도(부사어) — 종결동사를 꾸미는 부사구. 양측 톤에 맞춤.
const PRO_TEMPER = ['뜨겁게', '단호하게', '확신에 차서', '거침없이', '열정적으로', '망설임 없이', '벅차오르며', '눈을 빛내며']
const CON_TEMPER = ['차갑게', '신중하게', '날카롭게', '한 발 물러서', '냉정하게', '눈썹을 좁히며', '천천히 곱씹으며', '한숨을 누르며']

function buildPersona(rng: () => number, side: Side, theme: string): Persona {
  const t = theme.trim() || '이 주제'
  if (side === 'pro') {
    return {
      name: pick(rng, PRO_EPITHET) + ' ' + pick(rng, PRO_NAMES),
      temper: pick(rng, PRO_TEMPER),
      stance: `${t}${josaEunNeun(t)} 추구할 가치가 있다`,
    }
  }
  return {
    name: pick(rng, CON_EPITHET) + ' ' + pick(rng, CON_NAMES),
    temper: pick(rng, CON_TEMPER),
    stance: `${t}${josaEunNeun(t)} 의심하고 경계해야 한다`,
  }
}

// ───────────────────────── 논거 생성 틀 ─────────────────────────
// 각 측의 논증을 결정론적으로 빚는 문장 골격. {t}=주제. 추상적이지만 어떤 주제에도 들어맞도록 설계.
const PRO_ANGLES: { tag: string; tmpl: string[] }[] = [
  { tag: '가치', tmpl: ['{t이} 사라진 세계를 상상하면, 무엇이 우리를 움직이게 할지 답할 수 없다.', '{t은} 단순한 수단이 아니라 그 자체로 추구할 목적이 된다.', '{t이} 빠진 자리에는 언제나 더 차가운 무언가가 들어선다.'] },
  { tag: '성장', tmpl: ['{t을} 마주할 때 인물은 비로소 한계를 넘어선다.', '{t이} 주는 마찰이야말로 변화의 연료다.', '{t을} 통과한 사람만이 다음 문턱을 알아본다.'] },
  { tag: '연결', tmpl: ['{t은} 흩어진 사람들을 하나의 이야기로 묶는다.', '{t을} 공유하는 순간 고립은 깨진다.', '{t이} 오갈 때 비로소 타인은 이웃이 된다.'] },
  { tag: '용기', tmpl: ['{t을} 선택하는 데에는 두려움을 무릅쓴 결단이 필요하다.', '{t을} 외면하는 편안함보다, 끌어안는 위험이 더 정직하다.', '{t을} 향해 한 걸음 내딛는 것 자체가 이미 답이다.'] },
  { tag: '미래', tmpl: ['지금의 {t이} 내일의 가능성을 연다.', '{t} 없이는 더 나은 상태로 나아갈 도약대를 잃는다.', '{t에} 거는 기대가 오늘을 견디게 한다.'] },
  { tag: '진심', tmpl: ['{t은} 꾸며낼 수 없기에 가장 믿을 만한 신호다.', '{t이} 담긴 행동은 설명 없이도 가닿는다.', '{t} 앞에서는 계산이 멈추고 사람이 드러난다.'] },
  { tag: '존엄', tmpl: ['{t은} 누구에게도 양보할 수 없는 마지막 선이다.', '{t을} 지키는 일은 손익을 넘어선 의무다.', '{t이} 무너지면 그 무엇으로도 보상되지 않는다.'] },
]
const CON_ANGLES: { tag: string; tmpl: string[] }[] = [
  { tag: '대가', tmpl: ['{t은} 늘 보이지 않는 청구서를 남긴다.', '{t을} 좇는 동안 무엇을 희생했는지 묻지 않는다면 위험하다.', '{t이} 손에 쥐어질 때, 대개 더 큰 것이 빠져나간다.'] },
  { tag: '환상', tmpl: ['{t이} 약속하는 것과 실제로 주는 것은 다르다.', '{t은} 종종 욕망이 빚어낸 신기루다.', '{t에} 비친 모습은 우리가 보고 싶은 것일 뿐이다.'] },
  { tag: '권력', tmpl: ['{t을} 정의하는 자가 결국 그것을 휘두른다.', '{t의} 이름으로 가장 많은 강요가 정당화되어 왔다.', '{t이} 권위를 입는 순간, 의심은 불경이 된다.'] },
  { tag: '균열', tmpl: ['{t은} 결속만큼이나 분열을 낳는다.', '{t을} 둘러싼 충돌은 봉합되기보다 깊어진다.', '{t이} 선을 긋는 자리마다 누군가는 바깥으로 밀린다.'] },
  { tag: '한계', tmpl: ['{t이} 모든 문제를 푼다는 믿음이야말로 가장 큰 맹점이다.', '{t은} 어떤 상황에서는 독이 된다.', '{t에} 기대는 만큼 스스로 설 힘은 줄어든다.'] },
  { tag: '맹목', tmpl: ['{t을} 향한 확신은 종종 질문을 멈추게 한다.', '{t이} 절대가 되면 예외는 모두 적이 된다.', '{t} 하나에 매달리는 시야는 옆을 보지 못한다.'] },
  { tag: '변질', tmpl: ['{t은} 처음의 모습 그대로 남는 법이 드물다.', '{t이} 제도가 되는 순간 본래의 온기는 식는다.', '{t을} 오래 쥐고 있으면 수단이 목적을 갈아 치운다.'] },
]

// 합(合) — 두 각도를 변증적으로 지양/종합하는 골격. {a}=정의 대표 각도, {b}=반의 대표 각도.
const SYNTH_TMPL: string[] = [
  '{t은} 무조건 옳지도 그르지도 않다 — {a}의 동력과 {b}의 경계가 함께 작동할 때에만 살아 있다.',
  '진실은 양극이 아니라 그 긴장 안에 있다: {t을} {a}{euroA} 끌어안되 {b}{euroB} 길들일 때 비로소 의미를 얻는다.',
  '{t을} 묻는 올바른 질문은 "옳은가"가 아니라 "어떤 조건에서, 누구를 위해"이다 — {a}{waA} {b}{igaB} 그 조건을 정한다.',
  '인물(또는 사회)은 {t을} 버리거나 맹신함으로써가 아니라, {a}의 추구와 {b}의 자각을 동시에 견딤으로써 성숙한다.',
  '{t은} 답이 아니라 물음이다 — {a}{igaA} 밀고 {b}{igaB} 당기는 그 진폭 안에서만 정직해진다.',
  '한쪽 손에 {a}{eulA}, 다른 손에 {b}{eulB} 쥐어야 {t이} 비로소 사람의 것이 된다.',
  '{t을} 끝까지 따라가면 {a}{waA} {b}{igaB} 결국 같은 강의 두 둑임을 알게 된다.',
  '{t에} 대한 성숙한 태도는 {a}의 불씨를 끄지 않으면서 {b}의 재를 잊지 않는 것이다.',
]
// 합의 마무리 한 줄(아포리즘) — 어떤 합에도 자연스럽게 이어지는 독립 문장.
const SYNTH_TAIL: string[] = [
  '결국 균형은 정답이 아니라 매번 다시 잡아야 하는 자세다.',
  '그래서 이 물음은 닫히지 않고, 다음 장면으로 넘겨진다.',
  '확신과 의심이 같은 식탁에 앉을 때 이야기는 깊어진다.',
  '극단은 쉽고, 그 사이를 견디는 일이 어렵다.',
  '판단을 미루는 용기 또한 하나의 답이다.',
  '경계에 선 인물만이 양쪽 풍경을 모두 본다.',
  '옳음보다 정직함이 먼저 오는 자리가 있다.',
  '남는 것은 결론이 아니라, 더 나은 질문이다.',
]

// 충돌점(쟁점) — 정/반이 정면으로 부딪치는 축.
const CLASH_AXES: string[] = ['목적 대 대가', '약속 대 현실', '자유 대 책임', '개인 대 공동체', '이상 대 한계', '변화 대 안정']

// ───────────────────────── 라운드/논거 자료형 ─────────────────────────
interface Arg { id: string; side: Side; tag: string; text: string; weight: number; user?: boolean }
interface Synthesis { id: string; text: string }
interface DebateState {
  theme: string
  rounds: number
  proPersona: Persona
  conPersona: Persona
  args: Arg[]
  clashes: string[]
  synthesis: Synthesis[]
}

function newId(p: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return p + crypto.randomUUID().slice(0, 8) } catch { /* noop */ }
  return p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
}

// 한 측 논증 한 개 생성(라운드 r, 각도 인덱스 ai).
function genArg(rng: () => number, side: Side, theme: string, r: number, ai: number): Arg {
  const t = theme.trim() || '이 주제'
  const angles = side === 'pro' ? PRO_ANGLES : CON_ANGLES
  const angle = angles[ai % angles.length]
  const tmpl = angle.tmpl[Math.floor(rng() * angle.tmpl.length) % angle.tmpl.length]
  const text = fillTheme(tmpl, t)
  // 가중치: 라운드가 깊어질수록 강해지고, 약간의 결정론적 흔들림.
  const weight = Math.min(100, 50 + r * 12 + Math.floor(rng() * 18))
  return { id: newId(side[0]), side, tag: angle.tag, text, weight }
}

// 전체 변증 토론을 결정론적으로 생성.
function generateDebate(theme: string, rounds: number): DebateState {
  const seed = hashStr('themedebate::' + theme.trim().toLowerCase())
  const rng = mulberry(seed)
  const proPersona = buildPersona(rng, 'pro', theme)
  const conPersona = buildPersona(rng, 'con', theme)
  const args: Arg[] = []
  for (let r = 0; r < rounds; r++) {
    args.push(genArg(rng, 'pro', theme, r, r))
    args.push(genArg(rng, 'con', theme, r, r + 1))
  }
  // 충돌점: 라운드 수만큼(중복 제거) 결정론적으로 고른다.
  const clashes: string[] = []
  const pool = [...CLASH_AXES]
  const nClash = Math.min(rounds + 1, pool.length)
  for (let i = 0; i < nClash; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length
    clashes.push(pool.splice(idx, 1)[0])
  }
  // 합: 정/반 대표 각도를 골라 종합 + 마무리 한 줄.
  const aTag = pick(rng, PRO_ANGLES).tag
  const bTag = pick(rng, CON_ANGLES).tag
  const t = theme.trim() || '이 주제'
  const synthText = fillSynth(pick(rng, SYNTH_TMPL), t, aTag, bTag) + ' ' + pick(rng, SYNTH_TAIL)
  return {
    theme,
    rounds,
    proPersona,
    conPersona,
    args,
    clashes,
    synthesis: [{ id: newId('s'), text: synthText }],
  }
}

// ───────────────────────── 영속 ─────────────────────────
interface Persisted { theme: string; rounds: number; debate: DebateState | null }

// 손상된 영속 데이터로부터 도구가 크래시하지 않도록 debate 를 검증·정규화한다.
// 페르소나가 올바른 객체이고 name/stance/temper 가 문자열인지, args/clashes/synthesis 가
// 배열인지 보장하며, 핵심 구조가 미달이면 null 을 돌려 빈 상태로 안전 복귀한다.
function isPersona(v: unknown): v is Persona {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.name === 'string' && typeof o.stance === 'string' && typeof o.temper === 'string'
}
function normalizeDebate(raw: unknown): DebateState | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  // 페르소나는 도구 렌더에 반드시 필요(없으면 복구 불가) — 미달이면 폐기.
  if (!isPersona(d.proPersona) || !isPersona(d.conPersona)) return null
  // 배열 필드는 손상 시 빈 배열로 정규화(렌더에서 .filter/.map 안전 보장).
  const rawArgs = Array.isArray(d.args) ? d.args : []
  const args: Arg[] = rawArgs.filter((a): a is Arg =>
    !!a && typeof a === 'object'
    && typeof (a as Record<string, unknown>).id === 'string'
    && ((a as Record<string, unknown>).side === 'pro' || (a as Record<string, unknown>).side === 'con')
    && typeof (a as Record<string, unknown>).tag === 'string'
    && typeof (a as Record<string, unknown>).text === 'string'
    && typeof (a as Record<string, unknown>).weight === 'number'
  )
  const clashes: string[] = (Array.isArray(d.clashes) ? d.clashes : []).filter((c): c is string => typeof c === 'string')
  const rawSynth = Array.isArray(d.synthesis) ? d.synthesis : []
  const synthesis: Synthesis[] = rawSynth.filter((s): s is Synthesis =>
    !!s && typeof s === 'object'
    && typeof (s as Record<string, unknown>).id === 'string'
    && typeof (s as Record<string, unknown>).text === 'string'
  )
  return {
    theme: typeof d.theme === 'string' ? d.theme : '',
    rounds: Number.isFinite(d.rounds) ? Math.min(6, Math.max(1, d.rounds as number)) : 3,
    proPersona: d.proPersona as Persona,
    conPersona: d.conPersona as Persona,
    args,
    clashes,
    synthesis,
  }
}
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { theme: '', rounds: 3, debate: null }
    const p = JSON.parse(raw) as Partial<Persisted>
    const rounds = Number.isFinite(p?.rounds) ? Math.min(6, Math.max(1, p!.rounds as number)) : 3
    return {
      theme: typeof p?.theme === 'string' ? p.theme : '',
      rounds,
      debate: normalizeDebate(p?.debate),
    }
  } catch {
    return { theme: '', rounds: 3, debate: null }
  }
}

// ───────────────────────── 예시 주제 ─────────────────────────
const SAMPLE_THEMES = ['복수', '자유', '진실', '희생', '운명', '용서', '권력', '사랑', '정의', '기억']

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ThemeDebateChamber({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [theme, setTheme] = useState(init.current.theme)
  const [rounds, setRounds] = useState(init.current.rounds)
  const [debate, setDebate] = useState<DebateState | null>(init.current.debate)
  const [newArgSide, setNewArgSide] = useState<Side>('pro')
  const [newArgText, setNewArgText] = useState('')
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snippets = useLibraryList('snippets')

  // payload / 드롭에서 주제 시드 받기(빈 칸일 때만).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const seed = payload && typeof payload.theme === 'string' ? payload.theme
      : payload && typeof payload.text === 'string' ? payload.text
      : payload && typeof payload.title === 'string' ? payload.title : ''
    if (seed && !init.current.theme) setTheme(String(seed).trim().slice(0, 60))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ theme, rounds, debate })) }
    catch { if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
  }, [theme, rounds, debate])

  const flashNote = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  // ── 토론 생성/누적 ──
  const run = () => {
    const t = theme.trim()
    if (!t) { flashNote('주제를 먼저 입력하세요.'); return }
    setDebate(generateDebate(t, rounds))
    flashNote('두 입장이 의인화되어 변증 토론이 열렸습니다.')
  }

  // 라운드 한 번 더 — 같은 시드 흐름을 이어 한 쌍을 더 쌓는다.
  const addRound = () => {
    if (!debate) return
    const seed = hashStr('themedebate::' + debate.theme.trim().toLowerCase() + '::' + debate.rounds)
    const rng = mulberry(seed)
    const r = debate.rounds
    const extra = [genArg(rng, 'pro', debate.theme, r, r), genArg(rng, 'con', debate.theme, r, r + 1)]
    setDebate({ ...debate, rounds: r + 1, args: [...debate.args, ...extra] })
    flashNote(`라운드 ${r + 1} 가 추가되었습니다.`)
  }

  const addUserArg = () => {
    if (!debate) { flashNote('먼저 토론을 여세요.'); return }
    const txt = newArgText.trim()
    if (!txt) return
    const a: Arg = { id: newId('u'), side: newArgSide, tag: '직접', text: txt, weight: 70, user: true }
    setDebate({ ...debate, args: [...debate.args, a] })
    setNewArgText('')
    flashNote('직접 입력한 논거를 추가했습니다.')
  }

  const removeArg = (id: string) => {
    if (!debate) return
    setDebate({ ...debate, args: debate.args.filter((a) => a.id !== id) })
  }

  const bump = (id: string, d: number) => {
    if (!debate) return
    setDebate({ ...debate, args: debate.args.map((a) => a.id === id ? { ...a, weight: Math.max(0, Math.min(100, a.weight + d)) } : a) })
  }

  // 합 한 줄 더 생성(다른 골격으로).
  const addSynthesis = () => {
    if (!debate) return
    const seed = hashStr('synth::' + debate.theme + '::' + debate.synthesis.length)
    const rng = mulberry(seed)
    const aTag = pick(rng, PRO_ANGLES).tag
    const bTag = pick(rng, CON_ANGLES).tag
    const t = debate.theme.trim() || '이 주제'
    const text = fillSynth(pick(rng, SYNTH_TMPL), t, aTag, bTag) + ' ' + pick(rng, SYNTH_TAIL)
    setDebate({ ...debate, synthesis: [...debate.synthesis, { id: newId('s'), text }] })
  }

  // ── 집계 ──
  const proArgs = useMemo(() => debate ? debate.args.filter((a) => a.side === 'pro') : [], [debate])
  const conArgs = useMemo(() => debate ? debate.args.filter((a) => a.side === 'con') : [], [debate])
  const proPower = useMemo(() => proArgs.reduce((s, a) => s + a.weight, 0), [proArgs])
  const conPower = useMemo(() => conArgs.reduce((s, a) => s + a.weight, 0), [conArgs])
  const totalPower = proPower + conPower
  const proPct = totalPower ? Math.round((proPower / totalPower) * 100) : 50

  // ── 드롭(바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    const seed = (item.title || item.text || '').trim().slice(0, 60)
    if (seed) { setTheme(seed); flashNote(`드롭한 "${item.title || '문서'}" 의 제목/내용을 주제로 받았습니다.`) }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ── 텍스트 직렬화 ──
  const buildPlain = (): string => {
    if (!debate) return ''
    const L: string[] = []
    L.push(`주제 토론: ${debate.theme}`)
    L.push('')
    L.push(`[정] ${debate.proPersona.name} — ${debate.proPersona.stance}`)
    proArgs.forEach((a, i) => L.push(`  정${i + 1} (${a.tag}/${a.weight}): ${a.text}`))
    L.push('')
    L.push(`[반] ${debate.conPersona.name} — ${debate.conPersona.stance}`)
    conArgs.forEach((a, i) => L.push(`  반${i + 1} (${a.tag}/${a.weight}): ${a.text}`))
    L.push('')
    L.push(`[충돌점] ${debate.clashes.join(' · ')}`)
    L.push('')
    L.push('[합]')
    debate.synthesis.forEach((s) => L.push(`  - ${s.text}`))
    return L.join('\n')
  }

  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    if (!debate) return ''
    const proList = proArgs.map((a) => `<li><b>(${escapeHtml(a.tag)})</b> ${escapeHtml(a.text)} <i>[${a.weight}]</i></li>`).join('')
    const conList = conArgs.map((a) => `<li><b>(${escapeHtml(a.tag)})</b> ${escapeHtml(a.text)} <i>[${a.weight}]</i></li>`).join('')
    const synth = debate.synthesis.map((s) => `<p style="line-height:1.7;">${escapeHtml(s.text)}</p>`).join('')
    return [
      `<p style="font-size:15px;"><b>주제: ${escapeHtml(debate.theme)}</b></p>`,
      `<h3>정 — ${escapeHtml(debate.proPersona.name)}</h3><p>${escapeHtml(debate.proPersona.stance)}</p><ul>${proList}</ul>`,
      `<h3>반 — ${escapeHtml(debate.conPersona.name)}</h3><p>${escapeHtml(debate.conPersona.stance)}</p><ul>${conList}</ul>`,
      `<h3>충돌점</h3><p>${escapeHtml(debate.clashes.join(' · '))}</p>`,
      `<h3>합</h3>${synth}`,
    ].join('')
  }

  // ── 연계 ──
  const addProject = () => {
    if (!debate) return
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '주제·테마',
      title: `토론: ${debate.theme.slice(0, 40)}`,
      bodyHtml: buildHtml(),
      synopsis: debate.synthesis[0]?.text.slice(0, 120),
    })
    flashNote(id ? '프로젝트 자료 〈주제·테마〉 폴더에 추가했습니다.' : '추가하지 못했습니다.')
  }

  const stashSynthesis = () => {
    if (!debate) return
    if (!hasStash()) { flashNote('수집함이 없습니다.'); return }
    addToStash({ kind: 'memo', label: `합: ${debate.theme}`, text: debate.synthesis.map((s) => s.text).join('\n') })
    flashNote('합(종합) 문장을 수집함에 담았습니다.')
  }

  const saveSnippet = () => {
    if (!debate) return
    addToLibrary('snippets', { text: buildPlain(), source: '주제 토론장', tags: ['테마', '변증', debate.theme] })
    flashNote('토론 전문을 스니펫 라이브러리에 저장했습니다.')
  }

  // 충돌점/합을 논증 작업대(논증형 글)로 — 핵심 주장을 thesis-builder 로 넘긴다.
  const toThesis = () => {
    if (!debate) return
    openToolLinked('thesis-builder', { topic: debate.theme, text: debate.synthesis[0]?.text || '' })
    flashNote('학술 주제문 빌더로 합을 넘겼습니다.')
  }
  const toDialogue = () => {
    if (!debate) return
    const script = [
      `${debate.proPersona.name}: ${proArgs[0]?.text || ''}`,
      `${debate.conPersona.name}: ${conArgs[0]?.text || ''}`,
    ].join('\n')
    openToolLinked('dialogue-workbench', { text: script, theme: debate.theme })
    flashNote('대화 작업대로 두 입장을 대사로 넘겼습니다.')
  }

  const copyAll = async () => {
    try {
      if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(buildPlain()); flashNote('토론 전문을 복사했습니다.') }
      else throw new Error('no clipboard')
    } catch { flashNote('복사에 실패했습니다.') }
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }
  const colTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const argRow = (user?: boolean): React.CSSProperties => ({
    border: '1px solid ' + (user ? 'var(--accent)' : 'var(--border)'), background: 'var(--chrome-2)',
    borderRadius: 9, padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, lineHeight: 1.5,
  })
  const tag: React.CSSProperties = { fontSize: 10.5, padding: '1px 6px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '3px 6px', borderRadius: 6 }
  const PRO_C = '#2e7d32'
  const CON_C = '#c0392b'

  const empty = !debate

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
    >
      <div style={head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>주제 토론장</span>
          <span style={sub}>정(正) 대 반(反), 그리고 합(合)</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...input, flex: 1, minWidth: 140 }}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="다룰 주제(가치/질문)를 입력 — 예: 복수, 자유, 진실"
            maxLength={60}
            onKeyDown={(e) => { if (e.key === 'Enter') run() }}
          />
          <select
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
            style={{ ...input, width: 'auto', padding: '8px 8px' }}
            title="라운드 수(양측 주고받는 횟수)"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}라운드</option>)}
          </select>
          <button className="btn-primary" onClick={run}>토론 열기</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={sub}>예시:</span>
          {SAMPLE_THEMES.map((s) => (
            <button key={s} className="minibtn" style={{ padding: '2px 8px', fontSize: 11.5 }} onClick={() => setTheme(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...sub, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {empty ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '24px 14px', border: '1px dashed var(--border)', borderRadius: 12 }}>
            하나의 <b>주제</b>를 두 인격으로 세워 변증법으로 다투게 합니다.<br />
            위에 주제를 적고 <b>토론 열기</b>를 누르세요.<br />
            <span style={{ fontSize: 12 }}>좌측 바인더 문서를 이 창에 끌어다 놓거나, 스니펫 라이브러리에서 불러올 수도 있습니다.</span>
            {snippets.length > 0 && (
              <div style={{ marginTop: 14, textAlign: 'left' }}>
                <div style={{ ...sub, marginBottom: 6 }}>스니펫에서 주제 가져오기</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {snippets.slice(0, 5).map((s) => (
                    <button
                      key={s.id} className="minibtn"
                      style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.4 }}
                      onClick={() => setTheme(s.text.trim().slice(0, 60))}
                    >
                      {s.text.trim().slice(0, 48) || '(빈 스니펫)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 양측 인격 + 세력 막대 */}
            <div style={card}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontWeight: 700, color: PRO_C, fontSize: 13 }}>정 · {debate.proPersona.name}</div>
                  <div style={sub}>{debate.proPersona.temper} 말한다 — {debate.proPersona.stance}</div>
                </div>
                <div style={{ flex: 1, minWidth: 130, textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: CON_C, fontSize: 13 }}>{debate.conPersona.name} · 반</div>
                  <div style={sub}>{debate.conPersona.temper} 받아친다 — {debate.conPersona.stance}</div>
                </div>
              </div>
              {/* 세력 균형 막대(논거 가중치 합) */}
              <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ width: `${proPct}%`, background: PRO_C, transition: 'width .25s' }} />
                <div style={{ width: `${100 - proPct}%`, background: CON_C, transition: 'width .25s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, ...sub }}>
                <span style={{ color: PRO_C }}>정 {proPct}% ({proPower})</span>
                <span>설득력 균형</span>
                <span style={{ color: CON_C }}>반 {100 - proPct}% ({conPower})</span>
              </div>
            </div>

            {/* 두 입장 논거(좌우) */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ ...colTitle, color: PRO_C }}>정 — 옹호 논거 {proArgs.length}</div>
                {proArgs.map((a, i) => (
                  <div key={a.id} style={argRow(a.user)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ ...tag, color: PRO_C }}>정{i + 1} · {a.tag}</span>
                      <span style={{ ...sub, marginLeft: 'auto' }}>{a.weight}</span>
                      <button style={iconBtn} title="설득력 올리기" onClick={() => bump(a.id, 10)}>＋</button>
                      <button style={iconBtn} title="설득력 내리기" onClick={() => bump(a.id, -10)}>－</button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeArg(a.id)}>×</button>
                    </div>
                    <div style={{ wordBreak: 'keep-all' }}>{a.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ ...colTitle, color: CON_C }}>반 — 반론 논거 {conArgs.length}</div>
                {conArgs.map((a, i) => (
                  <div key={a.id} style={argRow(a.user)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ ...tag, color: CON_C }}>반{i + 1} · {a.tag}</span>
                      <span style={{ ...sub, marginLeft: 'auto' }}>{a.weight}</span>
                      <button style={iconBtn} title="설득력 올리기" onClick={() => bump(a.id, 10)}>＋</button>
                      <button style={iconBtn} title="설득력 내리기" onClick={() => bump(a.id, -10)}>－</button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeArg(a.id)}>×</button>
                    </div>
                    <div style={{ wordBreak: 'keep-all' }}>{a.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 라운드 추가 + 직접 논거 */}
            <div style={card}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <button className="minibtn" onClick={addRound}>라운드 한 번 더</button>
                <span style={sub}>현재 {debate.rounds}라운드 · 논거 {debate.args.length}개</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={newArgSide} onChange={(e) => setNewArgSide(e.target.value as Side)} style={{ ...input, width: 'auto', padding: '7px 8px' }}>
                  <option value="pro">정 측에</option>
                  <option value="con">반 측에</option>
                </select>
                <input
                  style={{ ...input, flex: 1, minWidth: 140 }}
                  value={newArgText}
                  onChange={(e) => setNewArgText(e.target.value)}
                  placeholder="내가 직접 논거 한 줄 추가"
                  onKeyDown={(e) => { if (e.key === 'Enter') addUserArg() }}
                  maxLength={160}
                />
                <button className="minibtn" onClick={addUserArg} disabled={!newArgText.trim()}>추가</button>
              </div>
            </div>

            {/* 충돌점 */}
            <div style={card}>
              <div style={colTitle}>충돌점 — 두 입장이 정면으로 부딪치는 축</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {debate.clashes.map((c) => (
                  <span key={c} style={{ ...tag, color: 'var(--text)', borderColor: 'var(--accent)', padding: '3px 9px', fontSize: 12 }}>{c}</span>
                ))}
              </div>
            </div>

            {/* 합 */}
            <div style={{ ...card, borderColor: 'var(--accent)' }}>
              <div style={{ ...colTitle, justifyContent: 'space-between' }}>
                <span>합(合) — 변증적 종합</span>
                <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11.5 }} onClick={addSynthesis}>다른 종합 만들기</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {debate.synthesis.map((s) => (
                  <div key={s.id} style={{ fontSize: 13.5, lineHeight: 1.7, wordBreak: 'keep-all', borderLeft: '3px solid var(--accent)', paddingLeft: 10 }}>
                    {s.text}
                  </div>
                ))}
              </div>
            </div>

            {/* 연계 */}
            <div className="linkbar" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="linkbar-label" style={sub}>연계:</span>
              <button className="minibtn" onClick={copyAll}>전문 복사</button>
              <button className="linkbtn" onClick={addProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료에 토론 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
              <button className="linkbtn" onClick={stashSynthesis} disabled={!hasStash()} title={hasStash() ? '합 문장을 수집함에 담기' : '수집함이 없습니다'}>수집함에 합 담기</button>
              <button className="minibtn" onClick={saveSnippet}>스니펫 저장</button>
              <button className="minibtn" onClick={toThesis}>학술 주제문으로</button>
              <button className="minibtn" onClick={toDialogue}>대화 작업대로</button>
            </div>

            <div className="license-note" style={{ ...sub, lineHeight: 1.6 }}>
              논증 문장은 입력 주제를 시드로 한 결정론적 생성입니다(같은 주제는 같은 토론). 출발점일 뿐이니 직접 논거를 더하고 설득력을 조정해 다듬으세요.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
