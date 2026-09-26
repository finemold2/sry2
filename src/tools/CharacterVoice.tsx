// 인물 말투 차별화기 — 인물마다 말투 특성(문장 길이/어휘 수준/말버릇/존댓말·반말/사투리/감탄사)을
// 설정해 두고, "같은 상황"의 대사를 인물별로 다르게 써 보며 나란히 비교하는 도구.
//  · 인물 2~4명을 열(칼럼)으로 두고 같은 상황 한 줄을 각 인물의 목소리로 직접 작성.
//  · 말투 특성 카드가 각 칼럼 위에 붙어, 그 인물답게 쓰도록 길잡이/체크리스트가 된다.
//  · 자동 저장/복원(localStorage 'sry:tool:character-voice').
// [연계] useLibraryList('characters') 로 공유 라이브러리 인물을 칼럼에 불러오고(말투 trait 가 있으면 자동 채움),
//        addToProject(folder:'인물') 로 "말투 대조표" 문서를 프로젝트 바인더(자료 › 인물)에 추가.
// 규칙: import 는 react 와 './linkbus' 만. 외부 네트워크 불필요(저작권 안전). localStorage 차단 시 graceful.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'character-voice',
  name: '인물 말투 차별화기',
  icon: '🗣️',
  group: '구상·정리',
  intro: '인물마다 말투 특성을 정하고 같은 상황 대사를 인물별로 다르게 써 보세요',
  w: 860,
  h: 620,
}

const LS_KEY = 'sry:tool:character-voice'

// ───────── 말투 특성 정의 ─────────
// 각 특성은 라디오형(고정 보기) 옵션을 가진다. 자유 입력은 말버릇/감탄사로 보완.
interface VoiceAxis {
  key: keyof VoiceTraits
  label: string
  icon: string
  options: { v: string; hint?: string }[]
}
interface VoiceTraits {
  length: string   // 문장 길이
  vocab: string    // 어휘 수준
  formality: string// 존댓말/반말
  dialect: string  // 사투리/말씨
  habit: string    // 말버릇(자유 입력)
  interj: string   // 자주 쓰는 감탄사(자유 입력)
}

const AXES: VoiceAxis[] = [
  {
    key: 'length', label: '문장 길이', icon: '📏',
    options: [
      { v: '짧고 단답형', hint: '한두 어절, 끊어 말함' },
      { v: '보통' },
      { v: '길고 만연체', hint: '수식어·접속이 많음' },
    ],
  },
  {
    key: 'vocab', label: '어휘 수준', icon: '📚',
    options: [
      { v: '쉽고 일상적' },
      { v: '표준' },
      { v: '전문·현학적', hint: '한자어·전문용어' },
      { v: '거칠고 속어', hint: '비속어·은어' },
    ],
  },
  {
    key: 'formality', label: '높임/말끝', icon: '🙇',
    options: [
      { v: '격식 존댓말', hint: '-습니다/-십시오' },
      { v: '부드러운 존댓말', hint: '-요' },
      { v: '반말', hint: '-야/-어' },
      { v: '하대·명령조', hint: '-하라/-거라' },
    ],
  },
  {
    key: 'dialect', label: '말씨/사투리', icon: '🗺️',
    options: [
      { v: '표준어' },
      { v: '경상' },
      { v: '전라' },
      { v: '충청' },
      { v: '제주' },
      { v: '북한·이북' },
      { v: '옛말·고풍', hint: '-하옵니다' },
      { v: '번역체·외국인' },
    ],
  },
]

// 자유 입력 특성(말버릇·감탄사).
const FREE: { key: keyof VoiceTraits; label: string; icon: string; placeholder: string }[] = [
  { key: 'habit', label: '말버릇', icon: '💬', placeholder: '예: 문장 끝마다 "…말이지", 질문을 되묻기' },
  { key: 'interj', label: '감탄사', icon: '❗', placeholder: '예: 아이고 / 헐 / 어허 / 거참' },
]

const COL_COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b']
const MAX_COLS = 4
const MIN_COLS = 2

// ───────── 말투 예시 대사 생성기 ─────────
//   "같은 상황에서 말투에 따라 대사가 이렇게 달라진다"를 보여 주는 로컬 예시 생성기.
//   여섯 슬롯의 곱집합으로 한 줄 예문을 만들어, 인물별 대사를 쓸 때 어조 감각을 잡게 돕는다.
//   슬롯은 서로 독립적이며(다른 슬롯을 전제하지 않음) 어떤 조합이든 자연스러운 문장이 되도록 설계.
//   조사(을/를)는 받침을 보고 실제 형태 하나만 출력 → "을(를)" 같은 이중표기 절대 노출 안 함.

// 한국어 조사 자동 선택 헬퍼(받침 유무로 실제 형태 하나만 출력).
function hasJong(word: string): boolean {
  const m = word.match(/[가-힣](?=[^가-힣]*$)/) // 마지막 한글 음절
  if (!m) return true // 한글이 아니면 받침 있는 것으로 간주(자음형 조사 사용)
  return (m[0].charCodeAt(0) - 0xac00) % 28 !== 0
}
const eulReul = (w: string) => w + (hasJong(w) ? '을' : '를') // 을/를

// 감탄사/말문 여는 소리(문장 첫머리). 톤이 다양하지만 어떤 뒷말과도 어울리는 독립 항목.
const G_INTERJ = [
  '아이고', '어허', '거참', '흠', '허', '하', '아니', '이런', '글쎄', '자',
  '그래', '뭐', '에이', '참나', '아', '오', '저기', '음', '어이구', '이거야',
  '원', '어디', '보자', '옳거니', '쯧', '후', '휴', '그러게', '암만', '어쭈',
  '얼씨구', '저런', '아무렴', '그나저나', '하기야', '그래도', '정말', '진짜', '이야', '세상에',
  '어휴', '그참',
]
// 말을 거는 대상('…에게'). '에게'는 받침과 무관하게 불변이라 조사 충돌 없음.
const G_TARGET = [
  '자네', '당신', '너', '그쪽', '이보게', '여보게', '선생', '어이 거기', '우리', '다들',
  '여러분', '형', '누나', '선배', '후배', '그 친구', '상대', '저 사람', '이 녀석', '애',
  '동지', '동무', '벗', '녀석들', '그분', '어르신', '막내', '대장', '반장', '대원들',
  '부하', '윗사람', '아랫것', '손님', '꼬마', '아가씨', '총각', '이웃', '동료', '맞은편',
  '상사', '제자',
]
// 말하는 사안(명사구, '…을/를'의 목적어). 갈등·일상을 두루 담되 어떤 화행과도 결합 가능한 독립 명사구.
const G_TOPIC = [
  '약속을 어긴 일', '늦은 까닭', '그동안 쌓인 서운함', '앞으로의 계획', '어제 한 말',
  '숨겨 온 속내', '이번 결정', '맡은 일', '함께한 시간', '달라진 태도',
  '오해의 진상', '빌린 돈', '지난 실수', '내건 조건', '품어 온 꿈',
  '마음 한구석', '솔직한 심정', '참아 온 불만', '바라는 바', '지켜야 할 선',
  '잊지 못할 약속', '떠나간 사람', '다가올 시험', '오래된 비밀', '어긋난 계획',
  '풀지 못한 매듭', '첫 만남', '마지막 부탁', '떠도는 소문', '진짜 이유',
  '넘어야 할 고비', '버린 자존심', '놓친 기회', '걸어 온 길', '감춘 상처',
  '벼르던 한마디', '쌓아 온 신뢰', '무너진 믿음', '새로운 시작', '남은 시간',
  '지난 약속', '속 깊은 사정', '두고 온 후회', '앞날의 걱정', '맺고 끊을 결단', '오래된 다짐',
]
// 화행(말하는 자세) — 목적어를 받는 동사구를 '…며/가며' 연결형으로 닫아, 어떤 종결과도 이어짐.
const G_STANCE = [
  '똑바로 짚어 가며', '차근차근 꺼내며', '단숨에 들이대며', '에둘러 흘리며', '조목조목 따지며',
  '넌지시 비추며', '대놓고 들먹이며', '곱씹어 되뇌며', '담담히 풀어내며', '격하게 쏟아내며',
  '조심스레 더듬으며', '한참을 망설이다 꺼내며', '콕 집어 가리키며', '빙빙 돌려 말하며', '속 시원히 털어놓으며',
  '마지못해 인정하며', '목소리를 낮춰 읊으며', '버럭 들춰내며', '애써 외면하다 꺼내며', '농담처럼 슬쩍 던지며',
  '정색하고 끄집어내며', '한숨과 함께 늘어놓으며', '또박또박 되짚으며', '은근슬쩍 끼워 넣으며', '눈물을 삼키며 말하며',
  '웃으며 받아치듯 꺼내며', '뜸을 들이다 내놓으며', '대수롭잖게 흘려 말하며', '매섭게 몰아붙이며', '다정하게 어루만지듯 꺼내며',
  '딱 잘라 못 박으며', '구구절절 늘어놓으며', '짧게 끊어 던지며', '속내를 들켜 가며', '조용히 곱씹으며',
  '두서없이 쏟아내며', '한 자 한 자 새기듯 말하며', '짐짓 모른 척 떠보며', '정면으로 마주하며', '애둘러 떠보며',
  '마음을 다잡고 꺼내며', '목이 메어 가까스로 꺼내며', '담대하게 들이밀며', '겸연쩍게 머뭇거리며',
]
// 말의 강도/태도 부사(종결을 꾸밈). 독립적으로 어떤 종결과도 결합.
const G_TONE = [
  '딱 잘라', '조심스레', '대뜸', '넌지시', '차갑게', '다정하게', '단호하게', '부드럽게', '퉁명스레', '진지하게',
  '장난스레', '담담하게', '매몰차게', '은근히', '시원하게', '조곤조곤', '거침없이', '머뭇머뭇', '당당하게', '애써 태연하게',
  '버럭', '조용조용', '싸늘하게', '따뜻하게', '짐짓', '대수롭잖게', '정중하게', '퉁명하게', '한껏 누그러져', '으름장 놓듯',
]
// 말끝/종결(말투를 최종 결정하는 닫는 술어). 화제와 독립된 완결 종결문.
const G_ENDING = [
  '한마디 하겠습니다.', '입을 떼었다.', '말문을 열었다.', '쏘아붙였다.', '타일렀다.',
  '중얼거렸다.', '내뱉었어.', '말해 두지.', '속삭였다.', '다그쳤다.',
  '으름장을 놓았다.', '달랬다.', '받아쳤다.', '읊조렸다.', '목소리를 높였다.',
  '한숨을 내쉬었다.', '웃어 보였다.', '말끝을 흐렸다.', '잘라 말했다.', '넋두리를 늘어놓았다.',
  '입을 다물었다.', '고개를 저었다.', '어깨를 으쓱했다.', '눈을 부릅떴다.', '말을 골랐다.',
  '혼잣말을 했다.', '농을 던졌다.', '목청을 가다듬었다.', '뜸을 들였다.', '한참을 침묵했다.',
  '말을 이었다.', '되물었다.', '입맛을 다셨다.', '혀를 찼다.', '얼버무렸다.',
  '다짐을 두었다.', '경고를 던졌다.', '너스레를 떨었다.', '일침을 놓았다.', '속을 털었다.',
  '말꼬리를 잡았다.', '고개를 끄덕였다.', '눈물을 글썽였다.', '목이 메었다.', '말을 삼켰다.',
  '콧방귀를 뀌었다.', '정색을 했다.', '한 박자 쉬었다.', '입가를 씰룩였다.', '말허리를 잘랐다.',
]

// 조합수(곱집합): 슬롯 풀 크기의 곱. 고유 항목만 사용.
const COMBOS = G_INTERJ.length * G_TARGET.length * G_TOPIC.length * G_STANCE.length * G_TONE.length * G_ENDING.length

const pickFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// 한 줄 예시 대사 생성: [감탄사], [대상]에게 [사안]을/를 [화행], [부사] [종결]
function genVoiceLine(): string {
  const interj = pickFrom(G_INTERJ)
  const target = pickFrom(G_TARGET)
  const topic = pickFrom(G_TOPIC)
  const stance = pickFrom(G_STANCE)
  const tone = pickFrom(G_TONE)
  const ending = pickFrom(G_ENDING)
  return `${interj}, ${target}에게 ${eulReul(topic)} ${stance}, ${tone} ${ending}`
}

// 인물 한 칼럼.
interface Col {
  id: string
  name: string
  traits: VoiceTraits
  line: string      // 이 인물의 대사(같은 상황을 이 인물의 목소리로)
  libId?: string    // 공유 라이브러리에서 불러온 경우의 원본 id(중복 불러오기 방지)
}
interface Store {
  situation: string
  cols: Col[]
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function emptyTraits(): VoiceTraits {
  return { length: '보통', vocab: '표준', formality: '부드러운 존댓말', dialect: '표준어', habit: '', interj: '' }
}
function emptyCol(name = ''): Col {
  return { id: newId(), name, traits: emptyTraits(), line: '' }
}

// 특성을 한 줄 요약(미리보기/내보내기용).
function traitSummary(t: VoiceTraits): string {
  const parts: string[] = []
  parts.push(t.length)
  if (t.vocab && t.vocab !== '표준') parts.push(t.vocab)
  if (t.formality) parts.push(t.formality)
  if (t.dialect && t.dialect !== '표준어') parts.push(t.dialect)
  if (t.habit.trim()) parts.push('말버릇: ' + t.habit.trim())
  if (t.interj.trim()) parts.push('감탄사: ' + t.interj.trim())
  return parts.join(' · ')
}

// 손상/부족한 특성 보정.
function normTraits(raw: unknown): VoiceTraits {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = emptyTraits()
  const pick = (k: keyof VoiceTraits) => (typeof o[k] === 'string' ? (o[k] as string) : base[k])
  return {
    length: pick('length'),
    vocab: pick('vocab'),
    formality: pick('formality'),
    dialect: pick('dialect'),
    habit: str(o.habit),
    interj: str(o.interj),
  }
}

// localStorage 읽기 — 미지원/차단/손상 시 기본 2칼럼으로 graceful.
function loadStore(): Store {
  const fallback = (): Store => ({ situation: '', cols: [emptyCol(), emptyCol()] })
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback()
    const p = JSON.parse(raw)
    const cols: Col[] = Array.isArray(p?.cols)
      ? p.cols
          .filter((c: unknown) => c && typeof c === 'object')
          .slice(0, MAX_COLS)
          .map((c: Record<string, unknown>) => ({
            id: String(c.id || newId()),
            name: str(c.name).slice(0, 40),
            traits: normTraits(c.traits),
            line: str(c.line).slice(0, 2000),
            libId: typeof c.libId === 'string' ? c.libId : undefined,
          }))
      : []
    while (cols.length < MIN_COLS) cols.push(emptyCol())
    return { situation: str(p?.situation).slice(0, 1000), cols }
  } catch {
    return fallback()
  }
}

// 라이브러리 인물의 말투 trait(있으면) → 칼럼 특성 자동 채움(키워드 매칭, 없으면 기본 유지).
function traitsFromShared(s: SharedCharacter): VoiceTraits {
  const t = emptyTraits()
  const traits = Array.isArray(s.traits) ? s.traits : []
  const speech = (traits.find((x) => x && /말투|말씨|speech|voice|어조/i.test(str(x.k)))?.v || '').toString()
  const hay = (speech + ' ' + str(s.personality)).toLowerCase()
  const has = (...ws: string[]) => ws.some((w) => hay.includes(w.toLowerCase()))
  if (has('반말', '하대')) t.formality = has('명령', '거라', '하라') ? '하대·명령조' : '반말'
  else if (has('격식', '습니다', '존댓')) t.formality = '격식 존댓말'
  if (has('짧', '단답', '간결')) t.length = '짧고 단답형'
  else if (has('만연', '장황', '길')) t.length = '길고 만연체'
  if (has('속어', '비속', '거친', '욕')) t.vocab = '거칠고 속어'
  else if (has('전문', '현학', '학술', '한자어')) t.vocab = '전문·현학적'
  if (has('경상', '부산', '대구')) t.dialect = '경상'
  else if (has('전라', '광주', '전남', '전북')) t.dialect = '전라'
  else if (has('충청')) t.dialect = '충청'
  else if (has('제주')) t.dialect = '제주'
  else if (has('이북', '북한', '평양')) t.dialect = '북한·이북'
  // 말버릇/감탄사: speech 가 길면 말버릇 칸에 원문 일부를 단서로 남긴다(자유 입력 보조).
  if (speech.trim()) t.habit = speech.trim().slice(0, 80)
  return t
}

export default function CharacterVoice({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Store>(loadStore())
  const [situation, setSituation] = useState(initial.current.situation)
  const [cols, setCols] = useState<Col[]>(initial.current.cols)
  const [note, setNote] = useState('')        // 저장 차단 등 경고
  const [flash, setFlash] = useState('')       // 일시 안내(복사/추가 완료)
  const [pickFor, setPickFor] = useState<string | null>(null) // 라이브러리 불러오기 대상 칼럼 id
  const [examples, setExamples] = useState<string[]>([])       // 말투 예시 대사(곱집합 생성)
  const [showGen, setShowGen] = useState(false)                // 예시 생성기 펼침

  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // [연계] 공유 라이브러리 인물(자동 구독·리렌더).
  const library = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만, 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ situation, cols }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [situation, cols])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2000)
  }

  // [연계] payload.character 로 인물(들)을 받으면 빈 칼럼에 채우거나 새 칼럼으로 추가(1회 처리).
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character
    if (!raw || consumed.current === raw) return
    consumed.current = raw
    const list: unknown[] = Array.isArray(raw) ? raw : [raw]
    let added = 0
    setCols((prev) => {
      const next = prev.slice()
      for (const item of list) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const nm = str(o.name).trim()
        if (!nm) continue
        if (next.some((c) => c.name.trim() === nm)) continue // 이미 있으면 건너뜀
        const traits = traitsFromShared({
          id: str(o.id), name: nm, role: str(o.role),
          personality: str(o.personality),
          traits: Array.isArray(o.traits) ? (o.traits as SharedCharacter['traits']) : undefined,
          updated: 0,
        })
        // 빈 칼럼(이름 없음) 먼저 채우고, 없으면 새로 추가(최대 4).
        const emptyIdx = next.findIndex((c) => !c.name.trim() && !c.line.trim())
        const col: Col = { id: newId(), name: nm.slice(0, 40), traits, line: '', libId: str(o.id) || undefined }
        if (emptyIdx >= 0) next[emptyIdx] = col
        else if (next.length < MAX_COLS) next.push(col)
        else continue
        added++
      }
      return next
    })
    if (mounted.current && added > 0) showFlash(`전달받은 인물 ${added}명을 칼럼에 넣었어요.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ───────── 칼럼 CRUD ─────────
  const updateCol = (id: string, patch: Partial<Col>) =>
    setCols((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const setTrait = (id: string, key: keyof VoiceTraits, value: string) =>
    setCols((prev) => prev.map((c) => (c.id === id ? { ...c, traits: { ...c.traits, [key]: value } } : c)))

  const addCol = () => {
    setCols((prev) => (prev.length >= MAX_COLS ? prev : [...prev, emptyCol()]))
  }
  const removeCol = (id: string) => {
    setCols((prev) => (prev.length <= MIN_COLS ? prev : prev.filter((c) => c.id !== id)))
    if (pickFor === id) setPickFor(null)
  }

  // [연계] 라이브러리 인물을 특정 칼럼에 불러오기(말투 trait 자동 반영, 대사는 그대로 보존).
  const loadLibInto = (colId: string, s: SharedCharacter) => {
    updateCol(colId, { name: (s.name || '').trim().slice(0, 40), traits: traitsFromShared(s), libId: s.id })
    setPickFor(null)
    showFlash(`‘${(s.name || '이름 없음').trim()}’의 말투 특성을 불러왔어요.`)
  }

  // ───────── 내보내기/복사 ─────────
  const filledCols = cols.filter((c) => c.name.trim() || c.line.trim() || traitSummary(c.traits))
  const hasContent = situation.trim() !== '' || cols.some((c) => c.name.trim() || c.line.trim())

  const exportText = (): string => {
    const lines: string[] = ['# 인물 말투 대조표', '']
    lines.push('## 상황')
    lines.push(situation.trim() || '(상황 미입력)')
    lines.push('')
    cols.forEach((c, i) => {
      const nm = c.name.trim() || `인물 ${i + 1}`
      lines.push(`## ${nm}`)
      const sum = traitSummary(c.traits)
      if (sum) lines.push(`말투: ${sum}`)
      lines.push('대사: ' + (c.line.trim() || '(미작성)'))
      lines.push('')
    })
    return lines.join('\n').trimEnd()
  }

  const copyAll = async () => {
    const text = exportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); showFlash('말투 대조표를 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        const ok = document.execCommand('copy'); document.body.removeChild(ta)
        showFlash(ok ? '말투 대조표를 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.')
      } catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
    }
  }

  // ───────── [프로젝트] 말투 대조표 문서를 바인더(자료 › 인물)에 추가 ─────────
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const escLines = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push('<h2>상황</h2>')
    parts.push('<p>' + (situation.trim() ? escLines(situation.trim()) : '(상황 미입력)') + '</p>')
    parts.push('<h2>인물별 대사</h2>')
    cols.forEach((c, i) => {
      const nm = c.name.trim() || ('인물 ' + (i + 1))
      const sum = traitSummary(c.traits)
      parts.push('<h3>' + esc(nm) + '</h3>')
      if (sum) parts.push('<p><i>말투: ' + esc(sum) + '</i></p>')
      parts.push('<p>' + (c.line.trim() ? escLines(c.line.trim()) : '(미작성)') + '</p>')
    })
    return parts.join('\n')
  }

  const bridgeOn = hasProjectBridge()
  const addDocToProject = () => {
    if (!bridgeOn) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!hasContent) { showFlash('상황과 대사를 먼저 채워 주세요.'); return }
    const named = cols.map((c, i) => c.name.trim() || `인물${i + 1}`).filter(Boolean)
    const title = '말투 대조: ' + named.join(' · ')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: title.slice(0, 80),
      bodyHtml: buildHtml(),
      synopsis: situation.trim().slice(0, 120) || undefined,
    })
    showFlash(id ? '프로젝트 자료 › 인물 폴더에 말투 대조표를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  const clearAll = () => {
    if (!hasContent) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('상황과 모든 대사·말투 설정을 비울까요?')) return
    setSituation('')
    setCols([emptyCol(), emptyCol()])
    setPickFor(null)
  }

  // 말투 예시 대사 생성(독립 슬롯의 곱집합에서 무작위 6줄).
  const genExamples = () => {
    const out: string[] = []
    const seen = new Set<string>()
    let guard = 0
    while (out.length < 6 && guard < 60) {
      guard++
      const line = genVoiceLine()
      if (seen.has(line)) continue
      seen.add(line)
      out.push(line)
    }
    setExamples(out)
    setShowGen(true)
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }

  const situBox: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, background: 'var(--panel)' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 6 }
  const textareaBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }

  const colsRow: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0, overflowX: 'auto', overflowY: 'hidden' }
  const colStyle = (color: string): React.CSSProperties => ({ flex: '1 0 270px', minWidth: 270, maxWidth: 460, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--border)', borderTop: `3px solid ${color}` })
  const colHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const colScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 12 }
  const nameInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '6px 9px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const freeInput: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lineArea: React.CSSProperties = { ...textareaBase, minHeight: 110, fontSize: 14 }
  const axisLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }

  // 라이브러리 불러오기 드롭다운.
  const pickPanel: React.CSSProperties = { position: 'absolute', zIndex: 30, marginTop: 4, width: 260, maxHeight: 300, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const pickRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  return (
    <div style={wrap}>
      {/* 상단 도구막대 */}
      <div style={topbar}>
        <div style={titleStyle}><span>{meta.icon}</span><span>인물 말투 차별화기</span></div>
        <button className="minibtn" onClick={addCol} disabled={cols.length >= MAX_COLS} title={cols.length >= MAX_COLS ? `최대 ${MAX_COLS}명까지 비교할 수 있어요` : '비교할 인물 칼럼을 추가'}>＋ 인물 칼럼</button>
        <button className="linkbtn" onClick={addDocToProject} disabled={!hasContent || !bridgeOn} title={bridgeOn ? '말투 대조표를 프로젝트 바인더(자료 › 인물)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={copyAll} disabled={!hasContent} title="말투 대조표를 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={clearAll} disabled={!hasContent} title="전체 비우기"><Emoji e="🗑️"/> 비우기</button>
      </div>

      {(note || flash) && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      {/* 공통 상황 입력 */}
      <div style={situBox}>
        <label style={sLabel}><span><Emoji e="🎬"/></span><span>같은 상황 (모든 인물이 이 상황에서 말합니다)</span></label>
        <textarea
          style={{ ...textareaBase, minHeight: 50 }}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="예: 약속에 한 시간 늦게 나타난 상대에게 한마디 한다."
          maxLength={1000}
          rows={2}
        />
        {/* 말투 예시 대사 생성기 — 같은 상황이 말투에 따라 어떻게 달라지는지 보여 주는 곱집합 예문 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={genExamples} title="말투에 따라 달라지는 예시 대사를 무작위로 만들어 봅니다">
            <Emoji e="🎲"/> 말투 예시 대사
          </button>
          {showGen && examples.length > 0 && (
            <button className="minibtn" onClick={() => setShowGen(false)} style={{ padding: '4px 7px' }} title="예시 접기">접기</button>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
            약 {COMBOS.toLocaleString()}가지 조합
          </span>
        </div>
        {showGen && examples.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2, padding: '8px 10px', borderRadius: 9, border: '1px dashed var(--border)', background: 'var(--chrome-2)' }}>
            {examples.map((ex, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>· {ex}</div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              같은 상황도 말투에 따라 이렇게 달라집니다. 어조 감각을 잡는 마중물로만 쓰고, 각 인물의 대사는 직접 써 보세요.
            </div>
          </div>
        )}
      </div>

      {/* 인물 칼럼들 — 같은 상황을 인물별로 다르게 */}
      <div style={colsRow}>
        {cols.map((c, i) => {
          const color = COL_COLORS[i % COL_COLORS.length]
          return (
            <div key={c.id} style={colStyle(color)}>
              {/* 칼럼 머리: 이름 + 라이브러리 불러오기 + 삭제 */}
              <div style={colHead}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <input
                  style={nameInput}
                  value={c.name}
                  onChange={(e) => updateCol(c.id, { name: e.target.value, libId: undefined })}
                  placeholder={`인물 ${i + 1} 이름`}
                  maxLength={40}
                  aria-label={`인물 ${i + 1} 이름`}
                />
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    className="minibtn"
                    onClick={() => setPickFor(pickFor === c.id ? null : c.id)}
                    title="공유 라이브러리에서 인물 불러오기(말투 특성 자동 반영)"
                    style={{ padding: '4px 7px' }}
                  ><Emoji e="📥"/></button>
                  {pickFor === c.id && (
                    <div style={pickPanel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>라이브러리 인물</span>
                        <span style={{ flex: 1 }} />
                        <button className="minibtn" style={{ padding: '2px 7px' }} onClick={() => setPickFor(null)}>닫기</button>
                      </div>
                      {library.length === 0 ? (
                        <div style={{ ...hint, padding: '8px 4px' }}>아직 공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 저장하세요.</div>
                      ) : (
                        library.map((s) => (
                          <button key={s.id} style={pickRow} onClick={() => loadLibInto(c.id, s)} title="이 인물을 이 칼럼에 불러오기">
                            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.name || '(이름 없음)').trim()}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[s.role, s.source].filter(Boolean).join(' · ') || '인물'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => removeCol(c.id)}
                  disabled={cols.length <= MIN_COLS}
                  title={cols.length <= MIN_COLS ? `비교는 최소 ${MIN_COLS}명부터` : '이 인물 칼럼 삭제'}
                  style={{ padding: '4px 7px', flexShrink: 0 }}
                >✕</button>
              </div>

              <div style={colScroll}>
                {/* 말투 특성(라디오형 칩) */}
                {AXES.map((axis) => (
                  <div key={axis.key}>
                    <div style={axisLabel}><span><Emoji e={axis.icon}/></span><span>{axis.label}</span></div>
                    <div style={chipRow}>
                      {axis.options.map((opt) => {
                        const active = c.traits[axis.key] === opt.v
                        return (
                          <button
                            key={opt.v}
                            className={'minibtn' + (active ? ' active' : '')}
                            onClick={() => setTrait(c.id, axis.key, opt.v)}
                            title={opt.hint || opt.v}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >{opt.v}</button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* 자유 입력 특성(말버릇·감탄사) */}
                {FREE.map((f) => (
                  <div key={f.key}>
                    <div style={axisLabel}><span><Emoji e={f.icon}/></span><span>{f.label}</span></div>
                    <input
                      style={freeInput}
                      value={c.traits[f.key]}
                      onChange={(e) => setTrait(c.id, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      maxLength={120}
                      aria-label={`${c.name.trim() || `인물 ${i + 1}`} ${f.label}`}
                    />
                  </div>
                ))}

                {/* 이 인물의 대사 */}
                <div style={{ marginTop: 2 }}>
                  <div style={axisLabel}><span><Emoji e="🗨️"/></span><span>이 인물의 대사</span></div>
                  <textarea
                    style={lineArea}
                    value={c.line}
                    onChange={(e) => updateCol(c.id, { line: e.target.value })}
                    placeholder={situation.trim() ? '위 상황을 이 인물의 말투로 써 보세요…' : '먼저 위에 상황을 적은 뒤, 이 인물답게 대사를 써 보세요…'}
                    maxLength={2000}
                    rows={5}
                    aria-label={`${c.name.trim() || `인물 ${i + 1}`} 대사`}
                  />
                  <div style={{ ...hint, marginTop: 4 }}>
                    길잡이: {traitSummary(c.traits) || '말투 특성을 골라 보세요.'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단: 연계 + 안내 */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="linkbar">
          <span className="linkbar-label">함께 열기:</span>
          <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 도구를 엽니다"><Emoji e="🧑‍🎤"/> 인물 시트</button>
          <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 도구를 엽니다"><Emoji e="🕸️"/> 관계도</button>
        </div>
        <div style={hint}>
          인물 {filledCols.length || cols.length}명의 말투를 나란히 비교하는 중. 인물 시트·캐릭터 모델에서 <b><Emoji e="📚"/> 라이브러리에 저장</b>한 인물은 위 칼럼의 <b><Emoji e="📥"/></b>로 불러올 수 있어요. 모든 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
