// 인물 풍화기 — 시간 경과(년 단위)에 따라 한 인물의 외양·가치관·말투가 어떻게 변하는지
// '타임랩스'로 생성해 비교·편집하는 도구.
//  · 시작 나이/말투/가치관/외모 단서와 '풍화 요인'(사건·환경·세월의 압력)을 입력하면,
//    여러 시점(예: 0년 → +5 → +12 → +25)을 자동으로 생성해 카드 슬라이더로 펼친다.
//  · 각 시점 카드는 외양(머리·체형·표정·차림·주름/흔적), 가치관(신념의 굳기·관심사 이동),
//    말투(문장 길이·어휘·높임·말버릇·기력)를 결정론적 알고리즘으로 산출(시드=인물명 해시).
//  · 시점을 직접 편집할 수 있고, 스크럽 슬라이더로 한 시점을 골라 본문/필드를 들여다본다.
// [연계]
//   - useLibraryList('characters') 로 공유 라이브러리 인물을 시작 상태로 불러오고(CHARACTER_FIELDS 키 활용),
//     addToLibrary('characters', {name, fields}) 로 '풍화된' 미래 인물을 새 캐릭터로 저장.
//   - getDragItem/isItemDrag 로 좌측 바인더 문서/카드 드롭 수용(캐릭터 카드 필드·본문 텍스트), payload 수용.
//   - addToProject(folder:'인물') 로 연대표 문서를 바인더(자료 › 인물)에 추가, hasProjectBridge 가드.
//   - addToStash({kind:'memo'}) 로 한 시점 요약을 수집함에 담기, hasStash 가드.
//   - openToolLinked('character-sheet'|'relationship-map'|'emotion-arc') 로 관련 도구 열기.
// 규칙: import 는 react 와 './linkbus' 만. 외부 네트워크 없음(전부 로컬 결정론 계산). localStorage 차단 시 graceful.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  openToolLinked,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'character-aging',
  name: '인물 풍화기',
  icon: '⏱️',
  group: '캐릭터',
  intro: '세월에 따라 외양·가치관·말투가 어떻게 변하는지 타임랩스로 생성·비교합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:character-aging'

// ───────── 결정론 의사난수(시드=문자열 해시) ─────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────── 풍화 요인(세월의 압력 방향) ─────────
// 각 요인은 변화 벡터를 갖는다: 굳기(신념이 굳거나 무너짐), 활력(에너지), 따뜻함(타인에 대한 태도),
// 풍파(외양 마모), 말수(말이 많아짐/줄어듦). -1..+1 가중.
interface Force {
  key: string
  label: string
  hint: string
  v: { rigid: number; vigor: number; warmth: number; wear: number; talk: number }
}
const FORCES: Force[] = [
  { key: 'natural', label: '담담한 세월', hint: '큰 사건 없이 흐르는 시간', v: { rigid: 0.3, vigor: -0.3, warmth: 0.1, wear: 0.4, talk: -0.1 } },
  { key: 'loss', label: '상실·이별', hint: '소중한 것을 잃음', v: { rigid: 0.5, vigor: -0.5, warmth: -0.4, wear: 0.7, talk: -0.5 } },
  { key: 'power', label: '권력·성공', hint: '지위·부를 얻음', v: { rigid: 0.7, vigor: 0.2, warmth: -0.5, wear: -0.2, talk: 0.4 } },
  { key: 'hardship', label: '고난·생존', hint: '오랜 가난·전쟁·노동', v: { rigid: 0.6, vigor: -0.4, warmth: -0.2, wear: 0.9, talk: -0.3 } },
  { key: 'love', label: '사랑·가족', hint: '돌봄·관계의 결실', v: { rigid: -0.3, vigor: 0.3, warmth: 0.8, wear: 0.0, talk: 0.5 } },
  { key: 'wandering', label: '방랑·자유', hint: '떠돌며 견문을 넓힘', v: { rigid: -0.6, vigor: 0.4, warmth: 0.2, wear: 0.5, talk: 0.2 } },
  { key: 'discipline', label: '수련·금욕', hint: '의지로 자신을 벼림', v: { rigid: 0.4, vigor: 0.5, warmth: -0.2, wear: -0.3, talk: -0.4 } },
  { key: 'corruption', label: '타락·집착', hint: '욕망에 잠식됨', v: { rigid: 0.8, vigor: -0.2, warmth: -0.8, wear: 0.6, talk: 0.1 } },
  { key: 'redemption', label: '회복·치유', hint: '상처에서 회복', v: { rigid: -0.4, vigor: 0.5, warmth: 0.6, wear: -0.2, talk: 0.3 } },
]
const FORCE_BY_KEY: Record<string, Force> = Object.fromEntries(FORCES.map((f) => [f.key, f]))

// ───────── 시점 표현 어휘(0..1 척도 → 단어) ─────────
function band(x: number, words: string[]): string {
  const n = words.length
  let i = Math.floor(clamp01(x) * n)
  if (i >= n) i = n - 1
  return words[i]
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// 인생 단계(나이 기반).
function lifeStage(age: number): string {
  if (age < 13) return '아이'
  if (age < 20) return '청소년'
  if (age < 30) return '청년'
  if (age < 45) return '장년 초입'
  if (age < 60) return '중년'
  if (age < 75) return '노년 초입'
  return '노년'
}

// 한 시점의 산출 상태.
interface Aspect {
  appearance: string  // 외양 묘사
  hair: string        // 머리
  body: string        // 체형/자세
  marks: string       // 주름·흔적
  attire: string      // 차림
  belief: string      // 가치관/신념
  focus: string       // 관심사 이동
  speech: string      // 말투
  energy: string      // 기력/태도
}
interface Frame {
  year: number        // 시작 기준 +년
  age: number
  stage: string
  aspect: Aspect
  edited?: Partial<Aspect> // 사용자 수정(있으면 우선)
}

interface Seed {
  name: string
  startAge: number
  baseAppearance: string
  baseBelief: string
  baseSpeech: string
  force: string         // FORCES key
  steps: string         // 시점들(쉼표 구분 년수). 예: "0,5,12,25"
  intensity: number     // 0..1 변화 강도
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : d
}

function defaultSeed(): Seed {
  return {
    name: '',
    startAge: 25,
    baseAppearance: '',
    baseBelief: '',
    baseSpeech: '',
    force: 'natural',
    steps: '0,5,12,25',
    intensity: 0.6,
  }
}

// ───────── 풍화 생성 알고리즘 ─────────
// 시작 0..1 척도(시드 해시로 흩뿌림) → 요인 벡터 × 강도 × 경과시간 비율로 누적 → 시점별 단어로 환원.
function buildFrames(s: Seed): Frame[] {
  const name = s.name.trim() || '이름 없는 인물'
  const rng = mulberry32(hashStr(name + '|' + s.force + '|' + s.startAge))
  // 시작 좌표(약간의 개체차).
  const start = {
    rigid: 0.45 + (rng() - 0.5) * 0.3,
    vigor: 0.7 + (rng() - 0.5) * 0.2,
    warmth: 0.55 + (rng() - 0.5) * 0.3,
    wear: 0.1 + rng() * 0.1,
    talk: 0.5 + (rng() - 0.5) * 0.3,
  }
  const f = FORCE_BY_KEY[s.force] || FORCES[0]
  const inten = clamp01(s.intensity)

  // 시점 파싱(0 포함 보장, 정렬·중복 제거, 최대 6개).
  let yrs = s.steps
    .split(/[,\s]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (!yrs.includes(0)) yrs.unshift(0)
  yrs = Array.from(new Set(yrs)).sort((a, b) => a - b).slice(0, 6)
  const maxYr = Math.max(yrs[yrs.length - 1] || 1, 1)

  return yrs.map((yr) => {
    const t = yr / maxYr // 0..1 진행률
    // 세월에 따른 자연 변화 + 요인 압력.
    const push = (v: number, dir: number) => clamp01(v + dir * inten * t)
    const rigid = push(start.rigid, f.v.rigid + 0.2) // 세월은 대개 신념을 굳힌다(+0.2 기본).
    const vigor = clamp01(start.vigor + (f.v.vigor - 0.35) * inten * t) // 나이는 활력을 깎는다.
    const warmth = push(start.warmth, f.v.warmth)
    const wear = clamp01(start.wear + (f.v.wear + 0.5) * inten * t) // 풍파는 항상 누적.
    const talk = push(start.talk, f.v.talk)
    const age = Math.round(s.startAge + yr)
    // 노화 자체의 외양 마모(나이 절대값도 반영).
    const ageWear = clamp01(wear * 0.6 + clamp01((age - 25) / 60) * 0.6)

    const aspect = renderAspect({ rigid, vigor, warmth, wear: ageWear, talk }, age, s, yr, rng)
    return { year: yr, age, stage: lifeStage(age), aspect }
  })
}

function renderAspect(
  c: { rigid: number; vigor: number; warmth: number; wear: number; talk: number },
  age: number,
  s: Seed,
  yr: number,
  rng: () => number,
): Aspect {
  const baseApp = s.baseAppearance.trim()
  const baseBelief = s.baseBelief.trim()
  const baseSpeech = s.baseSpeech.trim()

  const hair = band(c.wear, ['윤기 도는 머리', '단정한 머리', '희끗희끗한 머리', '반백의 머리', '온통 센 머리'])
  const body = band(1 - c.vigor, ['탄탄하고 곧은 자세', '균형 잡힌 몸', '약간 굽은 어깨', '여윈 몸과 굽은 등', '쇠한 몸피'])
  const marks = band(c.wear, ['매끈한 피부', '눈가에 옅은 주름', '이마와 입가의 주름', '햇볕에 그을린 거친 피부와 깊은 주름', '세월이 깊게 팬 얼굴'])
  const attire = c.rigid > 0.66
    ? band(c.warmth, ['빈틈없이 갖춰 입은 차림(권위적)', '단정하지만 거리감 있는 차림', '격식을 지키되 따뜻한 차림'])
    : band(c.vigor, ['편하고 무심한 차림', '실용적인 차림', '활동적이고 산뜻한 차림'])

  const beliefHard = band(c.rigid, ['아직 흔들리고 묻는 신념', '유연하게 자기 길을 찾는 신념', '뚜렷해진 소신', '쉬이 굽히지 않는 고집', '바위처럼 굳어 버린 확신'])
  const focusShift = band(1 - c.warmth, ['타인에게 마음을 넓게 여는', '가까운 이들을 보듬는', '자기 영역을 지키는 데 집중하는', '경계심이 짙어진', '오직 자신(혹은 한 가지 집착)만 보는'])

  const sentLen = band(1 - c.vigor, ['빠르고 활기찬', '또박또박한', '느릿느릿한', '드문드문 끊기는'])
  const formality = band(c.rigid, ['스스럼없는 반말투', '편안한 말씨', '점잖아진 말씨', '격식을 차린 무게 있는 말투'])
  const wordy = c.talk > 0.6 ? '말수가 늘고 잔소리·회고가 잦은' : c.talk < 0.4 ? '말수가 줄어 침묵이 길어진' : '필요한 말만 하는'
  const speechLine = `${sentLen} 어조, ${formality}, ${wordy} 화법`

  const energy = band(c.vigor, ['지치고 무기력한', '조용히 가라앉은', '담담히 균형 잡힌', '여전히 의욕적인', '넘치도록 정력적인'].reverse())

  // 시작 단서(있으면 0년차엔 그대로, 이후엔 변형 접두로 연속성 부여).
  const evoApp = baseApp
    ? (yr === 0 ? baseApp : `${beforeArrow(baseApp)} → ${hair}, ${body}`)
    : `${hair}, ${body}`
  const evoBelief = baseBelief
    ? (yr === 0 ? baseBelief : `${beforeArrow(baseBelief)} → ${beliefHard}`)
    : beliefHard
  const evoSpeech = baseSpeech
    ? (yr === 0 ? baseSpeech : `${beforeArrow(baseSpeech)} → ${speechLine}`)
    : speechLine

  return {
    appearance: evoApp,
    hair,
    body,
    marks,
    attire,
    belief: evoBelief,
    focus: `${focusShift} 태도`,
    speech: evoSpeech,
    energy: `${energy} 상태`,
  }
}
function beforeArrow(s: string): string {
  const t = s.split('→').shift() || s
  return t.trim().slice(0, 40)
}

// ───────── 시점 카드 표시(편집 반영) ─────────
function frameAspect(fr: Frame): Aspect {
  return { ...fr.aspect, ...(fr.edited || {}) }
}

// 라이브러리 인물 → 시작 시드.
function seedFromShared(s: SharedCharacter): Partial<Seed> {
  const fields = s.fields || {}
  const ageRaw = fields.age || ''
  const ageN = num(ageRaw.match(/\d+/)?.[0], NaN)
  const app = [fields.appearance, fields.hair, fields.eyes, fields.body, s.appearance].filter(Boolean).join(', ').slice(0, 200)
  const belief = [fields.value, fields.goal, s.goal, fields.personality, s.personality].filter(Boolean).join(' / ').slice(0, 200)
  const speech = [fields.speech, fields.habit].filter(Boolean).join(', ').slice(0, 160)
  return {
    name: (s.name || '').trim(),
    startAge: Number.isFinite(ageN) ? ageN : undefined,
    baseAppearance: app,
    baseBelief: belief,
    baseSpeech: speech,
  }
}

function loadSeed(): Seed {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultSeed()
    const p = JSON.parse(raw)
    const d = defaultSeed()
    return {
      name: str(p?.name).slice(0, 60),
      startAge: clampAge(num(p?.startAge, d.startAge)),
      baseAppearance: str(p?.baseAppearance).slice(0, 400),
      baseBelief: str(p?.baseBelief).slice(0, 400),
      baseSpeech: str(p?.baseSpeech).slice(0, 400),
      force: FORCE_BY_KEY[str(p?.force)] ? str(p?.force) : d.force,
      steps: str(p?.steps).slice(0, 60) || d.steps,
      intensity: clamp01(num(p?.intensity, d.intensity)),
    }
  } catch {
    return defaultSeed()
  }
}
const clampAge = (n: number) => (n < 0 ? 0 : n > 200 ? 200 : Math.round(n))

export default function CharacterAging({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Seed>(loadSeed())
  const [seed, setSeed] = useState<Seed>(init.current)
  const [edits, setEdits] = useState<Record<number, Partial<Aspect>>>({}) // year → 편집
  const [scrub, setScrub] = useState(0)        // 선택 시점 인덱스
  const [editMode, setEditMode] = useState(false)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [dropHot, setDropHot] = useState(false)

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

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(seed))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [seed])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2200)
  }

  // [연계] payload 로 인물/시드 수용(1회).
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    if (!payload || consumed.current === payload) return
    consumed.current = payload
    const patch: Partial<Seed> = {}
    const ch = payload.character as Record<string, unknown> | undefined
    if (ch && typeof ch === 'object') {
      patch.name = str(ch.name).trim().slice(0, 60) || undefined
      const f = (ch as Record<string, unknown>).fields as Record<string, string> | undefined
      const ageStr = (f?.age || str(ch.age) || '').match(/\d+/)?.[0]
      if (ageStr) patch.startAge = clampAge(num(ageStr, seed.startAge))
      const app = [f?.appearance, f?.hair, str(ch.appearance)].filter(Boolean).join(', ')
      if (app) patch.baseAppearance = app.slice(0, 400)
      const belief = [f?.value, f?.goal, str(ch.goal), str(ch.personality)].filter(Boolean).join(' / ')
      if (belief) patch.baseBelief = belief.slice(0, 400)
      const sp = [f?.speech, f?.habit].filter(Boolean).join(', ')
      if (sp) patch.baseSpeech = sp.slice(0, 400)
    }
    if (typeof payload.name === 'string' && !patch.name) patch.name = payload.name.slice(0, 60)
    if (typeof payload.text === 'string') {
      const txt = payload.text.trim()
      if (txt && !patch.baseAppearance) patch.baseAppearance = txt.slice(0, 400)
    }
    if (Object.keys(patch).length) {
      setSeed((prev) => ({ ...prev, ...patch }))
      showFlash('전달받은 인물 정보를 시작 상태로 채웠어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // [연계] 바인더 문서/카드 드롭.
  const onDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const patch: Partial<Seed> = {}
    if (item.title) patch.name = item.title.trim().slice(0, 60)
    const ch = item.character || {}
    const ageStr = (ch.age || '').match(/\d+/)?.[0]
    if (ageStr) patch.startAge = clampAge(num(ageStr, seed.startAge))
    const app = [ch.appearance, ch.hair, ch.eyes, ch.body].filter(Boolean).join(', ')
    if (app) patch.baseAppearance = app.slice(0, 400)
    const belief = [ch.value, ch.goal, ch.personality].filter(Boolean).join(' / ')
    if (belief) patch.baseBelief = belief.slice(0, 400)
    const sp = [ch.speech, ch.habit].filter(Boolean).join(', ')
    if (sp) patch.baseSpeech = sp.slice(0, 400)
    if (!app && !belief && item.text) patch.baseAppearance = item.text.trim().slice(0, 400)
    setSeed((prev) => ({ ...prev, ...patch }))
    showFlash(`‘${item.title || '문서'}’의 정보를 시작 상태로 가져왔어요.`)
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) }
  }

  // 프레임 계산(편집 병합).
  const frames = useMemo<Frame[]>(() => {
    const base = buildFrames(seed)
    return base.map((fr) => ({ ...fr, edited: edits[fr.year] }))
  }, [seed, edits])

  // scrub 범위 보정.
  useEffect(() => {
    if (scrub > frames.length - 1) setScrub(Math.max(0, frames.length - 1))
  }, [frames.length, scrub])

  const cur = frames[Math.min(scrub, frames.length - 1)] || frames[0]
  const set = (patch: Partial<Seed>) => setSeed((prev) => ({ ...prev, ...patch }))

  // 라이브러리 인물 불러오기.
  const loadFromLib = (s: SharedCharacter) => {
    const patch = seedFromShared(s)
    setSeed((prev) => ({
      ...prev,
      ...patch,
      startAge: Number.isFinite(patch.startAge as number) ? (patch.startAge as number) : prev.startAge,
    }))
    setEdits({})
    setPickOpen(false)
    showFlash(`‘${(s.name || '인물').trim()}’을(를) 시작 상태로 불러왔어요.`)
  }

  // 한 시점 편집.
  const editAspect = (year: number, key: keyof Aspect, value: string) => {
    setEdits((prev) => ({ ...prev, [year]: { ...prev[year], [key]: value } }))
  }
  const resetEdit = (year: number) => {
    setEdits((prev) => {
      const n = { ...prev }
      delete n[year]
      return n
    })
    showFlash('이 시점의 수정을 되돌렸어요.')
  }

  const hasSeed = !!(seed.name.trim() || seed.baseAppearance.trim() || seed.baseBelief.trim() || seed.baseSpeech.trim())

  // ───────── 산출 텍스트 ─────────
  const frameToText = (fr: Frame): string => {
    const a = frameAspect(fr)
    return [
      `[+${fr.year}년 · ${fr.age}세 · ${fr.stage}]`,
      `외양: ${a.appearance}`,
      `흔적: ${a.marks} / 차림: ${a.attire}`,
      `가치관: ${a.belief}`,
      `태도: ${a.focus} · ${a.energy}`,
      `말투: ${a.speech}`,
    ].join('\n')
  }
  const exportText = (): string => {
    const head = `# ${seed.name.trim() || '이름 없는 인물'} — 풍화 연대표`
    const fl = FORCE_BY_KEY[seed.force]?.label || ''
    const sub = `시작 ${seed.startAge}세 · 요인: ${fl} · 강도 ${Math.round(seed.intensity * 100)}%`
    return [head, sub, '', ...frames.map((fr) => frameToText(fr) + '\n')].join('\n').trimEnd()
  }

  const copyAll = async () => {
    const text = exportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); showFlash('연대표를 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        const ok = document.execCommand('copy'); document.body.removeChild(ta)
        showFlash(ok ? '연대표를 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.')
      } catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
    }
  }

  // [연계] 현재 시점을 라이브러리에 '풍화된' 캐릭터로 저장(CHARACTER_FIELDS 키).
  const saveCurToLibrary = () => {
    if (!cur) return
    const a = frameAspect(cur)
    const nm = `${seed.name.trim() || '이름 없는 인물'} (+${cur.year}년·${cur.age}세)`
    addToLibrary('characters', {
      name: nm,
      role: '풍화 시점',
      appearance: a.appearance,
      personality: a.focus,
      goal: a.belief,
      source: '인물 풍화기',
      fields: {
        name: nm,
        age: String(cur.age),
        appearance: `${a.appearance}. ${a.marks}. ${a.attire}.`,
        hair: a.hair,
        body: a.body,
        value: a.belief,
        personality: `${a.focus}. ${a.energy}.`,
        speech: a.speech,
        notes: `${seed.name.trim() || '인물'}의 +${cur.year}년 시점. 풍화 요인: ${FORCE_BY_KEY[seed.force]?.label || ''}.`,
      },
    })
    showFlash(`이 시점(${cur.age}세)을 라이브러리에 새 인물로 저장했어요.`)
  }

  // [연계] 연대표 문서를 프로젝트 바인더에 추가.
  const bridgeOn = hasProjectBridge()
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const addDoc = () => {
    if (!bridgeOn) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!hasSeed) { showFlash('시작 정보를 먼저 채워 주세요.'); return }
    const parts: string[] = []
    parts.push('<p><i>' + esc(`시작 ${seed.startAge}세 · 요인: ${FORCE_BY_KEY[seed.force]?.label || ''} · 강도 ${Math.round(seed.intensity * 100)}%`) + '</i></p>')
    frames.forEach((fr) => {
      const a = frameAspect(fr)
      parts.push('<h3>' + esc(`+${fr.year}년 · ${fr.age}세 · ${fr.stage}`) + '</h3>')
      parts.push('<p><b>외양</b> ' + esc(a.appearance) + '<br/><b>흔적</b> ' + esc(a.marks) + ' / <b>차림</b> ' + esc(a.attire) + '</p>')
      parts.push('<p><b>가치관</b> ' + esc(a.belief) + '<br/><b>태도</b> ' + esc(a.focus + ' · ' + a.energy) + '</p>')
      parts.push('<p><b>말투</b> ' + esc(a.speech) + '</p>')
    })
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: ('풍화 연대표: ' + (seed.name.trim() || '인물')).slice(0, 80),
      bodyHtml: parts.join('\n'),
      synopsis: `${seed.startAge}세 시작, ${FORCE_BY_KEY[seed.force]?.label || ''} 요인`.slice(0, 120),
    })
    showFlash(id ? '프로젝트 자료 › 인물 폴더에 연대표를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // [연계] 현재 시점을 수집함에 담기.
  const stashOn = hasStash()
  const stashCur = () => {
    if (!cur) return
    addToStash({ kind: 'memo', label: `${seed.name.trim() || '인물'} +${cur.year}년`, text: frameToText(cur) })
    showFlash('이 시점을 수집함에 담았어요.')
  }

  const clearAll = () => {
    if (!hasSeed) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('시작 정보와 모든 수정을 비울까요?')) return
    setSeed(defaultSeed())
    setEdits({})
    setScrub(0)
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative', outline: dropHot ? '2px dashed var(--accent, #3d7fd6)' : 'none', outlineOffset: -4 }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const section: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 6 }
  const inputBase: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const areaBase: React.CSSProperties = { ...inputBase, lineHeight: 1.5, resize: 'vertical', minHeight: 46 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const aspectRow: React.CSSProperties = { display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.55 }
  const aspectKey: React.CSSProperties = { flexShrink: 0, width: 52, fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', paddingTop: 1 }
  const pickPanel: React.CSSProperties = { position: 'absolute', zIndex: 30, top: 40, left: 12, right: 12, maxHeight: 260, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const pickRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  const aspectFields: { key: keyof Aspect; label: string }[] = [
    { key: 'appearance', label: '외양' },
    { key: 'marks', label: '흔적' },
    { key: 'attire', label: '차림' },
    { key: 'belief', label: '가치관' },
    { key: 'focus', label: '태도' },
    { key: 'energy', label: '기력' },
    { key: 'speech', label: '말투' },
  ]

  return (
    <div style={wrap} onDragOver={onDragOver} onDragLeave={() => setDropHot(false)} onDrop={onDrop}>
      <div style={topbar}>
        <div style={titleStyle}><span>{meta.icon}</span><span>인물 풍화기</span></div>
        <button className="minibtn" onClick={() => setPickOpen((o) => !o)} title="공유 라이브러리에서 인물 불러오기">불러오기</button>
        <button className="minibtn" onClick={() => setEditMode((m) => !m)} title="시점 카드 직접 편집 켜기/끄기" style={editMode ? { fontWeight: 700 } : undefined}>{editMode ? '편집 끄기' : '편집'}</button>
        <button className="minibtn" onClick={copyAll} disabled={!hasSeed} title="연대표 전체를 텍스트로 복사">복사</button>
        <button className="minibtn" onClick={clearAll} disabled={!hasSeed} title="전체 비우기">비우기</button>
      </div>

      {pickOpen && (
        <div style={pickPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>라이브러리 인물</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" style={{ padding: '2px 7px' }} onClick={() => setPickOpen(false)}>닫기</button>
          </div>
          {library.length === 0 ? (
            <div style={{ ...hint, padding: '8px 4px' }}>아직 공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 저장하세요.</div>
          ) : (
            library.map((s) => (
              <button key={s.id} style={pickRow} onClick={() => loadFromLib(s)} title="이 인물을 시작 상태로 불러오기">
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.name || '(이름 없음)').trim()}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[s.role, (s.fields?.age && s.fields.age + '세'), s.source].filter(Boolean).join(' · ') || '인물'}</span>
              </button>
            ))
          )}
        </div>
      )}

      {(note || flash) && (
        <div style={{ padding: '6px 12px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      <div style={scroll}>
        {/* ── 시작 상태 입력 ── */}
        <div style={section}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2, ...section }}>
              <label style={label}><span>인물 이름</span></label>
              <input style={inputBase} value={seed.name} onChange={(e) => set({ name: e.target.value })} placeholder="예: 한설" maxLength={60} aria-label="인물 이름" />
            </div>
            <div style={{ flex: 1, ...section }}>
              <label style={label}><span>시작 나이</span></label>
              <input style={inputBase} type="number" min={0} max={200} value={seed.startAge} onChange={(e) => set({ startAge: clampAge(num(e.target.value, seed.startAge)) })} aria-label="시작 나이" />
            </div>
          </div>

          <label style={label}><span>시작 외모 단서 (선택)</span></label>
          <textarea style={areaBase} value={seed.baseAppearance} onChange={(e) => set({ baseAppearance: e.target.value })} placeholder="예: 검고 긴 머리, 단단한 체격, 형형한 눈빛" maxLength={400} rows={2} aria-label="시작 외모" />

          <label style={label}><span>시작 가치관·욕망 (선택)</span></label>
          <textarea style={areaBase} value={seed.baseBelief} onChange={(e) => set({ baseBelief: e.target.value })} placeholder="예: 누구도 믿지 않는다 / 동생을 지키고 싶다" maxLength={400} rows={2} aria-label="시작 가치관" />

          <label style={label}><span>시작 말투 (선택)</span></label>
          <textarea style={areaBase} value={seed.baseSpeech} onChange={(e) => set({ baseSpeech: e.target.value })} placeholder="예: 짧고 무뚝뚝한 반말, 비꼬는 어조" maxLength={400} rows={2} aria-label="시작 말투" />
        </div>

        {/* ── 풍화 요인 ── */}
        <div style={section}>
          <label style={label}><span>풍화 요인 (세월의 압력 방향)</span></label>
          <div style={chipRow}>
            {FORCES.map((f) => {
              const active = seed.force === f.key
              return (
                <button key={f.key} className={'minibtn' + (active ? ' active' : '')} onClick={() => set({ force: f.key })} title={f.hint} style={{ padding: '5px 9px', fontSize: 12, ...(active ? { fontWeight: 700 } : {}) }}>{f.label}</button>
              )
            })}
          </div>
          <div style={hint}>{FORCE_BY_KEY[seed.force]?.hint}</div>
        </div>

        {/* ── 강도 & 시점 ── */}
        <div style={section}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, ...section }}>
              <label style={label}><span>변화 강도 — {Math.round(seed.intensity * 100)}%</span></label>
              <input type="range" min={0} max={100} value={Math.round(seed.intensity * 100)} onChange={(e) => set({ intensity: num(e.target.value, 60) / 100 })} style={{ width: '100%' }} aria-label="변화 강도" />
            </div>
            <div style={{ flex: 1, minWidth: 160, ...section }}>
              <label style={label}><span>시점들 (경과 년수, 쉼표)</span></label>
              <input style={inputBase} value={seed.steps} onChange={(e) => set({ steps: e.target.value })} placeholder="0,5,12,25" maxLength={60} aria-label="시점들" />
            </div>
          </div>
          <div style={hint}>0년(현재)은 자동 포함됩니다. 최대 6개 시점. 마지막 시점이 변화의 정점이 됩니다.</div>
        </div>

        {/* ── 타임랩스: 스크럽 슬라이더 ── */}
        {!hasSeed ? (
          <div style={{ ...card, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>시작 정보를 채우면 타임랩스가 펼쳐집니다.</div>
            <div style={hint}>
              인물 이름과 시작 외모·가치관·말투 중 하나만 적어도 됩니다. 좌측 바인더의 인물 카드/문서를 이 창에 끌어다 놓거나, 위 <b>불러오기</b>로 공유 라이브러리 인물을 가져올 수 있어요. 그러면 세월·요인에 따라 외양·가치관·말투가 어떻게 풍화되는지 시점별로 생성됩니다.
            </div>
          </div>
        ) : (
          <>
            {/* 스크럽 */}
            <div style={{ ...section }}>
              <label style={label}><span>타임랩스 스크럽 — +{cur?.year}년 ({cur?.age}세, {cur?.stage})</span></label>
              <input type="range" min={0} max={Math.max(0, frames.length - 1)} value={Math.min(scrub, frames.length - 1)} onChange={(e) => setScrub(num(e.target.value, 0))} style={{ width: '100%' }} aria-label="타임랩스 스크럽" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
                {frames.map((fr, i) => (
                  <button key={fr.year} onClick={() => setScrub(i)} title={`+${fr.year}년 · ${fr.age}세`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === scrub ? 'var(--text)' : 'var(--muted)', fontWeight: i === scrub ? 700 : 400, padding: 0 }}>{fr.year === 0 ? '현재' : '+' + fr.year}</button>
                ))}
              </div>
            </div>

            {/* 선택 시점 상세 카드 */}
            {cur && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{seed.name.trim() || '이름 없는 인물'}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>+{cur.year}년 · {cur.age}세 · {cur.stage}</span>
                  <span style={{ flex: 1 }} />
                  {edits[cur.year] && <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => resetEdit(cur.year)} title="이 시점의 수정 되돌리기">되돌리기</button>}
                </div>
                {aspectFields.map((af) => {
                  const a = frameAspect(cur)
                  return (
                    <div key={af.key} style={aspectRow}>
                      <span style={aspectKey}>{af.label}</span>
                      {editMode ? (
                        <textarea
                          style={{ ...areaBase, minHeight: 38, fontSize: 13 }}
                          value={a[af.key]}
                          onChange={(e) => editAspect(cur.year, af.key, e.target.value)}
                          rows={2}
                          aria-label={`${af.label} 편집`}
                        />
                      ) : (
                        <span style={{ flex: 1 }}>{a[af.key]}</span>
                      )}
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  <button className="minibtn" onClick={saveCurToLibrary} title="이 시점을 라이브러리에 새 인물로 저장">라이브러리 저장</button>
                  <button className="minibtn" onClick={stashCur} disabled={!stashOn} title={stashOn ? '이 시점을 수집함에 담기' : '수집함이 연결되지 않았어요'}>수집함</button>
                </div>
              </div>
            )}

            {/* 전 시점 미니 비교(외양·가치관·말투 한 줄) */}
            <div style={section}>
              <label style={label}><span>시점별 한눈 비교</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {frames.map((fr, i) => {
                  const a = frameAspect(fr)
                  const on = i === scrub
                  return (
                    <button
                      key={fr.year}
                      onClick={() => setScrub(i)}
                      style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: 9, background: on ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)', padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3, borderLeft: on ? '3px solid var(--accent, #3d7fd6)' : '1px solid var(--border)' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700 }}>+{fr.year}년 · {fr.age}세 · {fr.stage}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.appearance}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.belief} · {a.speech}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* 연계 + 프로젝트 */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="linkbtn" onClick={addDoc} disabled={!hasSeed || !bridgeOn} title={bridgeOn ? '풍화 연대표를 프로젝트 바인더(자료 › 인물)에 추가' : '프로젝트에 연결되어 있지 않아요'}>프로젝트에 추가</button>
          </div>
          <div className="linkbar">
            <span className="linkbar-label">함께 열기:</span>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet', cur ? { character: { name: seed.name.trim(), fields: { name: seed.name.trim(), age: String(cur.age), appearance: frameAspect(cur).appearance, value: frameAspect(cur).belief, speech: frameAspect(cur).speech } } } : undefined)} title="인물 시트 도구를 (현재 시점과 함께) 엽니다">인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 도구를 엽니다">관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('emotion-arc')} title="감정 곡선 도구를 엽니다">감정 곡선</button>
          </div>
          <div style={hint}>
            세월·요인에 따른 변화는 인물명을 시드로 한 결정론적 계산입니다(같은 입력 → 같은 결과). 마음에 들지 않으면 <b>편집</b>으로 어느 시점이든 직접 다듬을 수 있고, 한 시점을 새 인물로 라이브러리에 저장해 다른 캐릭터 도구와 이어 쓸 수 있어요. 모든 입력은 이 브라우저에 자동 저장됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
