// 인물 말투 실험실 — 인물별 "목소리"를 파라미터(어휘 수준/문장 길이/격식/감정 톤/말버릇/존댓말 등)로
// 정의·저장하고, 같은 상황(프롬프트)을 각 인물의 목소리로 어떻게 말할지 "가이드 문장"을 규칙 기반으로
// 생성해 좌우(여러 칸) 비교한다. localStorage 자동 저장·복원, 빈 상태 안내.
// [연계] 공유 라이브러리(characters)에서 인물 가져오기/말투 저장, 좌측 바인더 파일 드롭으로 인물 추가,
//        생성한 대사/목소리 카드를 프로젝트에 추가, 인물 시트 등 관련 도구로 이동.
// 저작권 안전: 외부 이미지/음원/네트워크 일절 사용 안 함. 색·도형·이모지·자작 텍스트만.
// import 는 react 와 './linkbus' 만 사용. 라이브러리(드래그/캔버스 등) 미사용 — 직접 구현.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  getDragItem,
  isItemDrag,
  Emoji,
  emojify,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'character-voice-lab',
  name: '인물 말투 실험실',
  icon: '🗣️',
  group: '구상·정리',
  intro: '인물별 목소리를 설정하고 같은 대사를 각자 말투로 비교해 보세요',
  w: 940,
  h: 660,
}

const LS_KEY = 'sry:tool:character-voice-lab'

/* ───────── 데이터 모델 ───────── */

// 0~4 단계 슬라이더 파라미터.
type Level = 0 | 1 | 2 | 3 | 4
const LEVELS = [0, 1, 2, 3, 4] as const

interface VoiceParams {
  vocab: Level       // 어휘 수준: 쉬움 ↔ 현학적
  length: Level      // 문장 길이: 단문 ↔ 만연체
  formality: Level   // 격식: 무뚝뚝/반말 ↔ 정중/존댓말
  emotion: Level     // 감정 톤: 차분/억제 ↔ 격정/과장
  directness: Level  // 직설도: 에두름 ↔ 직설
  warmth: Level      // 온도: 냉랭 ↔ 다정
}

interface VoiceChar {
  id: string
  name: string
  role: string
  emoji: string        // 식별용 이모지(자작/이모지만, 저작권 안전)
  color: string        // 카드 강조색(CSS color)
  params: VoiceParams
  tics: string         // 말버릇/입버릇(줄바꿈으로 구분)
  catchphrase: string  // 자주 쓰는 표현/별명
  avoid: string        // 절대 안 쓰는 말투/금기
  speech: string       // 자유 메모(말투 설명)
  libId?: string       // 공유 라이브러리 연결 id
}

interface AxisDef {
  key: keyof VoiceParams
  label: string
  icon: string
  low: string
  high: string
  // 각 단계(0~4)에서 가이드 문장에 반영할 짧은 지시어.
  steps: [string, string, string, string, string]
}

const AXES: AxisDef[] = [
  {
    key: 'vocab', label: '어휘 수준', icon: '📚', low: '쉬움·일상어', high: '현학적·전문어',
    steps: ['아주 쉬운 일상어만', '쉬운 말 위주', '평이한 표준어', '다소 격조 있는 어휘', '현학적·전문적 어휘'],
  },
  {
    key: 'length', label: '문장 길이', icon: '📏', low: '단문·끊어침', high: '만연체·긴 호흡',
    steps: ['툭툭 끊는 단문', '짧고 간결하게', '보통 길이', '여러 절을 잇는 긴 문장', '쉼표로 길게 이어지는 만연체'],
  },
  {
    key: 'formality', label: '격식', icon: '🎩', low: '반말·무뚝뚝', high: '존댓말·정중',
    steps: ['거친 반말', '편한 반말', '중립적 말투', '공손한 존댓말', '극존칭·격식체'],
  },
  {
    key: 'emotion', label: '감정 톤', icon: '🎭', low: '차분·억제', high: '격정·과장',
    steps: ['감정을 거의 안 드러냄', '담담하게', '자연스러운 감정', '감정을 또렷이', '감정을 격하게·과장해서'],
  },
  {
    key: 'directness', label: '직설도', icon: '🎯', low: '에두름·완곡', high: '직설·단도직입',
    steps: ['빙 둘러 완곡하게', '에둘러서', '적당히', '솔직하게', '단도직입·돌직구'],
  },
  {
    key: 'warmth', label: '온도', icon: '🌡️', low: '냉랭·거리감', high: '다정·살가움',
    steps: ['차갑고 거리감 있게', '약간 무심하게', '평범하게', '따뜻하게', '아주 다정하고 살갑게'],
  },
]

const EMOJIS = ['🧑', '👩', '👨', '🧒', '👵', '👴', '🧙', '🦊', '🐺', '🐱', '🐰', '🦉', '🤖', '👑', '🗡️', '🌙', '🔥', '🌿', '⚡', '💧']
const COLORS = ['#4a76d4', '#0f9d58', '#db4437', '#8a5a2c', '#7c4dff', '#e0508a', '#16a3a3', '#d68910', '#5d6d7e', '#2e86de']

/* ───────── 유틸 ───────── */

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const clampLv = (v: unknown): Level => {
  const n = typeof v === 'number' ? Math.round(v) : 2
  return (n < 0 ? 0 : n > 4 ? 4 : n) as Level
}
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function defaultParams(): VoiceParams {
  return { vocab: 2, length: 2, formality: 2, emotion: 2, directness: 2, warmth: 2 }
}

function emptyVoice(i = 0): VoiceChar {
  return {
    id: newId(), name: '', role: '', emoji: EMOJIS[i % EMOJIS.length], color: COLORS[i % COLORS.length],
    params: defaultParams(), tics: '', catchphrase: '', avoid: '', speech: '',
  }
}

// 상황 프리셋(같은 상황을 인물별로 비교하기 좋은 예시들).
const SCENE_PRESETS = [
  '처음 만난 사람에게 인사한다',
  '도와달라고 부탁한다',
  '상대의 제안을 거절한다',
  '사랑을 고백한다',
  '화가 나서 따진다',
  '나쁜 소식을 전한다',
  '사과한다',
  '협박하거나 경고한다',
  '비밀을 털어놓는다',
  '작별 인사를 한다',
]

/* ───────── 가이드 문장 생성기(규칙 기반) ─────────
   외부 모델 없이, 파라미터·상황으로부터 "이 인물이라면 이렇게 말할 것"을 안내하는
   가이드 문장을 조합한다. 같은 상황을 인물별로 비교할 수 있게 결정적으로 생성한다. */

// 문자열 해시(인물+상황+seed → 안정적 변주 선택).
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

// 상황별 "행위 동사/뼈대" 후보(격식 낮음/높음에 따라 변형).
const SCENE_TEMPLATES: { match: string[]; casual: string[]; polite: string[] }[] = [
  { match: ['인사', '만난'], casual: ['야, 안녕', '어, 너구나', '왔어?'], polite: ['처음 뵙겠습니다', '안녕하세요, 반갑습니다', '인사드립니다'] },
  { match: ['부탁', '도와'], casual: ['이것 좀 도와줘', '나 좀 도와줄래', '손 좀 빌려줘'], polite: ['도움을 좀 청해도 될까요', '부탁 하나만 드려도 될지요', '도와주시면 정말 감사하겠습니다'] },
  { match: ['거절', '제안'], casual: ['그건 싫어', '난 안 할래', '됐어, 사양할게'], polite: ['죄송하지만 어렵겠습니다', '정중히 사양하겠습니다', '이번엔 사양하는 게 좋겠어요'] },
  { match: ['고백', '사랑'], casual: ['나, 너 좋아해', '좋아해 너를', '너밖에 안 보여'], polite: ['당신을 마음에 두고 있었습니다', '제 마음을 전하고 싶었어요', '당신이 좋습니다, 진심으로'] },
  { match: ['화', '따'], casual: ['이게 말이 돼?', '대체 왜 그래!', '장난해 지금?'], polite: ['이건 좀 납득하기 어렵습니다', '설명을 듣고 싶습니다', '도무지 이해가 가지 않는군요'] },
  { match: ['나쁜', '소식'], casual: ['안 좋은 소식이야', '있잖아… 좀 그래', '말하기 그런데…'], polite: ['좋지 않은 소식을 전하게 되었습니다', '안타까운 말씀을 드려야겠어요', '마음 단단히 먹고 들어주세요'] },
  { match: ['사과'], casual: ['미안해', '내가 잘못했어', '진짜 미안'], polite: ['진심으로 사과드립니다', '제 잘못입니다, 죄송합니다', '깊이 반성하고 있습니다'] },
  { match: ['협박', '경고'], casual: ['까불지 마', '한 번만 더 해봐', '후회하게 될걸'], polite: ['더 이상은 묵과하기 어렵습니다', '경고드립니다, 멈추세요', '이쯤에서 멈추시는 게 좋겠습니다'] },
  { match: ['비밀', '털어'], casual: ['사실 말이야…', '너한테만 말하는 건데', '이거 비밀인데'], polite: ['실은 드릴 말씀이 있습니다', '믿고 말씀드리는 겁니다만', '조용히 들어주셨으면 합니다'] },
  { match: ['작별', '이별'], casual: ['그럼 갈게', '잘 있어', '또 보자'], polite: ['그럼 이만 가보겠습니다', '부디 평안하시길 바랍니다', '다음에 또 뵙겠습니다'] },
]

function pickScene(scene: string, polite: boolean, seed: number): string {
  const s = scene.trim()
  const hit = SCENE_TEMPLATES.find((t) => t.match.some((m) => s.includes(m)))
  const bank = hit ? (polite ? hit.polite : hit.casual) : (polite ? ['…라고 정중히 말한다'] : ['…라고 말한다'])
  return bank[seed % bank.length]
}

// 감정 표현 장식(감정 톤 높을 때 덧붙임).
const EMO_HIGH = ['!', '!!', '… 정말로', '… 진심이야', '— 도저히 못 참겠어']
const EMO_LOW = ['.', '…', ' (담담히)']
// 어휘 수준 높을 때 끼워 넣는 격조 어휘.
const FANCY_WORDS = ['실로', '응당', '필시', '바야흐로', '여하튼', '결단코']
// 만연체용 잇기 표현.
const LONG_CONNECT = ['그러니까 말이지,', '어찌 보면,', '솔직히 말하자면,', '돌이켜 생각해 보면,']

// 핵심: 한 인물의 가이드 문장 생성(결정적).
function generateLine(c: VoiceChar, scene: string, seed: number): { example: string; notes: string[] } {
  const p = c.params
  const polite = p.formality >= 3
  const base = pickScene(scene || '말을 건다', polite, hash(c.id + '|' + scene + '|' + seed))
  const h = (salt: string) => hash(c.id + '|' + scene + '|' + seed + '|' + salt)

  let line = base

  // 직설도 낮음 → 완곡한 머리말, 높음 → 단정적 머리말.
  if (p.directness <= 1) line = ['저기,', '음,', '있잖아,'][h('d') % 3] + ' ' + line
  else if (p.directness >= 3) line = (polite ? '분명히 말씀드리면, ' : '딱 잘라 말할게, ') + line

  // 어휘 수준 높음 → 격조 어휘 삽입.
  if (p.vocab >= 3) line = FANCY_WORDS[h('v') % FANCY_WORDS.length] + ' ' + line

  // 문장 길이: 단문이면 끊어치고, 만연체면 절을 잇는다.
  if (p.length <= 1) {
    line = line.replace(/,\s*/g, '. ')
  } else if (p.length >= 3) {
    line = LONG_CONNECT[h('l') % LONG_CONNECT.length] + ' ' + line + (p.length === 4 ? ', 그래서 더 그런 거야' : '')
  }

  // 온도(따뜻함) — 호칭/덧말.
  if (p.warmth >= 3) line += polite ? ' 늘 고맙게 생각해요.' : ' …너라서 하는 말이야.'
  else if (p.warmth <= 1) line = (polite ? '' : '') + line + (p.warmth === 0 ? ' (시선도 안 맞추며)' : '')

  // 감정 톤 — 마무리 장식.
  if (p.emotion >= 3) line += EMO_HIGH[h('e') % EMO_HIGH.length]
  else line += EMO_LOW[h('e2') % EMO_LOW.length]

  // 말버릇/캐치프레이즈 — 앞이나 뒤에 자연스레.
  const ticList = c.tics.split('\n').map((t) => t.trim()).filter(Boolean)
  if (ticList.length) {
    const tic = ticList[h('t') % ticList.length]
    if (h('tp') % 2 === 0) line = tic + ' ' + line
    else line = line + ' ' + tic
  }
  if (c.catchphrase.trim() && h('c') % 3 === 0) {
    line += ` (입버릇처럼) “${c.catchphrase.trim()}”`
  }

  // 작성 지침(노트) — 슬라이더에서 도출.
  const notes: string[] = []
  for (const ax of AXES) {
    notes.push(`${ax.icon} ${ax.label}: ${ax.steps[p[ax.key]]}`)
  }
  if (c.avoid.trim()) notes.push(`🚫 피하기: ${c.avoid.trim()}`)

  return { example: line, notes }
}

/* ───────── 로드/저장 ───────── */

interface SavedState {
  chars: VoiceChar[]
  scene: string
  seed: number
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { chars: [], scene: SCENE_PRESETS[0], seed: 0 }
    const p = JSON.parse(raw)
    const chars: VoiceChar[] = Array.isArray(p?.chars)
      ? p.chars.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>, i: number) => {
          const pr = (x.params && typeof x.params === 'object' ? x.params : {}) as Record<string, unknown>
          return {
            id: String(x.id || newId()),
            name: str(x.name), role: str(x.role),
            emoji: str(x.emoji) || EMOJIS[i % EMOJIS.length],
            color: str(x.color) || COLORS[i % COLORS.length],
            params: {
              vocab: clampLv(pr.vocab), length: clampLv(pr.length), formality: clampLv(pr.formality),
              emotion: clampLv(pr.emotion), directness: clampLv(pr.directness), warmth: clampLv(pr.warmth),
            },
            tics: str(x.tics), catchphrase: str(x.catchphrase), avoid: str(x.avoid), speech: str(x.speech),
            libId: typeof x.libId === 'string' ? x.libId : undefined,
          }
        })
      : []
    return {
      chars,
      scene: str(p?.scene) || SCENE_PRESETS[0],
      seed: typeof p?.seed === 'number' ? p.seed : 0,
    }
  } catch {
    return { chars: [], scene: SCENE_PRESETS[0], seed: 0 }
  }
}

// 공유 라이브러리 인물 → 말투 인물(말투/성격 단서로 파라미터 추정).
function fromShared(s: SharedCharacter, i: number): VoiceChar {
  const v = emptyVoice(i)
  v.name = str(s.name)
  v.role = str(s.role)
  v.libId = s.id
  const traits = Array.isArray(s.traits) ? s.traits : []
  const speechTrait = traits.find((t) => t && /말투|어조|화법|speech/i.test(str(t.k)))
  const speech = (speechTrait ? str(speechTrait.v) : '') || str(s.personality)
  v.speech = speech
  // 아주 단순한 단서 기반 초기 추정(사용자가 슬라이더로 바로 조정).
  const txt = (speech + ' ' + str(s.personality) + ' ' + str(s.notes)).toLowerCase()
  if (/존댓말|정중|공손|예의/.test(txt)) v.params.formality = 4
  if (/반말|거친|무뚝뚝|퉁명/.test(txt)) v.params.formality = 0
  if (/따뜻|다정|상냥|살가/.test(txt)) v.params.warmth = 4
  if (/차갑|냉정|냉랭|무심/.test(txt)) v.params.warmth = 0
  if (/직설|돌직구|솔직/.test(txt)) v.params.directness = 4
  if (/격정|흥분|감정적|불같/.test(txt)) v.params.emotion = 4
  if (/현학|장황|박식/.test(txt)) v.params.vocab = 4
  return v
}

// 말투 인물 → 받는 허브(인물 시트)의 기본 칸과 1:1로 맞춘 정규(표준) fields.
// 이 도구가 가진 값만 매핑하고, 값이 비어 있으면 해당 키는 넣지 않는다(빈 칸 안 만듦).
function toNormFields(c: VoiceChar): Record<string, string> {
  const f: Record<string, string> = {}
  const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
  // 말투(목소리 프로필) — 축별 단계 설명을 한 줄로.
  const speechProfile = AXES.map((ax) => `${ax.label}: ${ax.steps[c.params[ax.key]]}`).join(' / ')
  // 말버릇(줄 단위) → habit / 입버릇(자주 쓰는 표현) → quirk.
  const ticList = c.tics.split('\n').map((t) => t.trim()).filter(Boolean).join(', ')
  // speech: 자유 메모 + 목소리 프로필을 합쳐 말투 칸에 채움.
  const speechParts = [c.speech.trim(), speechProfile].filter(Boolean)
  put('name', c.name.trim() || '이름 없는 인물')
  put('role', c.role)
  put('speech', speechParts.join('\n'))
  put('habit', ticList)             // 말버릇 → 습관/버릇
  put('quirk', c.catchphrase)       // 입버릇/별명 → 특이한 버릇
  // 피하는 말투/금기 → notes(결점이라 단정하기 애매하므로 메모로).
  put('notes', c.avoid.trim() ? '피하는 말투/금기: ' + c.avoid.trim() : '')
  return f
}

// 말투 인물 → 공유 라이브러리 저장 patch.
function toSharedPatch(c: VoiceChar): Partial<SharedCharacter> {
  const speechLines: string[] = []
  for (const ax of AXES) speechLines.push(`${ax.label}: ${ax.steps[c.params[ax.key]]}`)
  if (c.tics.trim()) speechLines.push('말버릇: ' + c.tics.split('\n').map((t) => t.trim()).filter(Boolean).join(', '))
  if (c.catchphrase.trim()) speechLines.push('입버릇: ' + c.catchphrase.trim())
  if (c.avoid.trim()) speechLines.push('피하는 말: ' + c.avoid.trim())
  const traits: { k: string; v: string }[] = [{ k: '말투', v: speechLines.join(' / ') }]
  return {
    name: c.name.trim() || '(이름 없는 인물)',
    role: c.role.trim() || undefined,
    personality: c.speech.trim() || undefined,
    traits,
    fields: toNormFields(c),   // 정규(표준) 항목 키 — 받는 허브에서 제자리에 들어가게.
    source: '인물 말투 실험실',
  }
}

// 바인더 드롭 → 말투 인물.
function fromDrop(it: { title?: string; character?: Record<string, string> }, i: number): VoiceChar {
  const v = emptyVoice(i)
  const ch = it.character
  if (ch && typeof ch === 'object') {
    v.name = str(ch.name) || str(it.title)
    v.role = str(ch.role) || str(ch.type)
    v.speech = str(ch.habits) || str(ch.personality)
  } else {
    v.name = str(it.title)
  }
  return v
}

/* ───────── 컴포넌트 ───────── */

export default function CharacterVoiceLab({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<SavedState>(loadState())
  const [chars, setChars] = useState<VoiceChar[]>(initial.current.chars)
  const [scene, setScene] = useState<string>(initial.current.scene)
  const [seed, setSeed] = useState<number>(initial.current.seed)
  const [editId, setEditId] = useState<string | null>(null)     // 파라미터 편집 패널 대상
  const [compareIds, setCompareIds] = useState<string[]>([])    // 좌우 비교에 올린 인물(순서 = 칸 순서)
  const [showImport, setShowImport] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
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

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ chars, scene, seed } satisfies SavedState))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [chars, scene, seed])

  // 비교 목록에서 사라진 인물 정리.
  useEffect(() => {
    setCompareIds((prev) => prev.filter((id) => chars.some((c) => c.id === id)))
  }, [chars])

  // payload.character 로 인물 전달 시 1회 추가.
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character
    if (!raw || typeof raw !== 'object') return
    if (consumed.current === raw) return
    consumed.current = raw
    const o = raw as Record<string, unknown>
    const v = fromShared({
      id: str(o.id), name: str(o.name), role: str(o.role),
      personality: str(o.personality), notes: str(o.notes),
      traits: Array.isArray(o.traits) ? (o.traits as SharedCharacter['traits']) : undefined,
      updated: 0,
    }, chars.length)
    v.libId = str(o.id) || undefined
    setChars((prev) => [...prev, v])
    setCompareIds((prev) => (prev.length < 3 ? [...prev, v.id] : prev))
    showFlash('전달받은 인물을 말투 실험실에 추가했어요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1900)
  }

  /* ── 인물 CRUD ── */
  const addChar = () => {
    const v = emptyVoice(chars.length)
    v.name = '새 인물'
    setChars((prev) => [...prev, v])
    setEditId(v.id)
    setCompareIds((prev) => (prev.length < 3 ? [...prev, v.id] : prev))
  }
  const patchChar = (id: string, patch: Partial<VoiceChar>) => {
    setChars((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  const patchParam = (id: string, key: keyof VoiceParams, val: Level) => {
    setChars((prev) => prev.map((c) => (c.id === id ? { ...c, params: { ...c.params, [key]: val } } : c)))
  }
  const duplicate = (id: string) => {
    setChars((prev) => {
      const src = prev.find((c) => c.id === id)
      if (!src) return prev
      const copy: VoiceChar = { ...src, id: newId(), name: (src.name.trim() || '인물') + ' (복사)', libId: undefined }
      const i = prev.findIndex((c) => c.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      setEditId(copy.id)
      return next
    })
  }
  const requestDelete = (id: string) => setConfirmDel(id)
  const doDelete = (id: string) => {
    setChars((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
    if (editId === id) setEditId(null)
  }

  // 비교 칸 토글(최대 4칸).
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) { showFlash('비교는 최대 4명까지 가능해요.'); return prev }
      return [...prev, id]
    })
  }
  // 비교 칸 순서 이동(드래그 없이 버튼으로 — 칸 헤더 ◀ ▶).
  const moveCompare = (id: string, dir: -1 | 1) => {
    setCompareIds((prev) => {
      const i = prev.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const t = next[i]; next[i] = next[j]; next[j] = t
      return next
    })
  }

  /* ── 라이브러리 연계 ── */
  const importFromLibrary = (s: SharedCharacter) => {
    const v = fromShared(s, chars.length)
    setChars((prev) => [...prev, v])
    setCompareIds((prev) => (prev.length < 3 ? [...prev, v.id] : prev))
    setShowImport(false)
    setEditId(v.id)
    showFlash(`‘${v.name.trim() || '이름 없는 인물'}’의 말투를 가져왔어요. 슬라이더로 다듬어 보세요.`)
  }
  const saveToLibrary = (c: VoiceChar) => {
    const patch = toSharedPatch(c)
    if (c.libId && library.some((x) => x.id === c.libId)) {
      updateInLibrary('characters', c.libId, patch)
      showFlash('라이브러리 인물의 말투를 업데이트했어요.')
    } else {
      const rec = addToLibrary('characters', patch)
      patchChar(c.id, { libId: rec.id })
      showFlash('말투를 라이브러리에 저장했어요.')
    }
  }

  /* ── 복사/내보내기 ── */
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); showFlash(okMsg); return }
    } catch { /* 폴백 */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy'); document.body.removeChild(ta)
      if (ok) { showFlash(okMsg); return }
    } catch { /* 최종 안내 */ }
    showFlash('복사에 실패했어요. 텍스트를 직접 선택해 복사하세요.')
  }

  // 비교 결과를 사람이 읽기 좋은 텍스트로.
  const comparisonText = (): string => {
    const lines: string[] = [`■ 상황: ${scene.trim() || '(미지정)'}`, '']
    for (const id of compareIds) {
      const c = chars.find((x) => x.id === id)
      if (!c) continue
      const g = generateLine(c, scene, seed)
      lines.push(`[${c.emoji} ${c.name.trim() || '이름 없음'}${c.role.trim() ? ' · ' + c.role.trim() : ''}]`)
      lines.push(`대사: ${g.example}`)
      lines.push('지침: ' + g.notes.join(' · '))
      lines.push('')
    }
    return lines.join('\n').trim()
  }

  /* ── 프로젝트 연계 ── */
  const bridgeOn = hasProjectBridge()
  const addComparisonToProject = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!compareIds.length) { showFlash('비교 칸에 인물을 먼저 올려 주세요.'); return }
    const parts: string[] = [`<p><b>상황:</b> ${escapeHtml(scene.trim() || '(미지정)')}</p>`]
    for (const id of compareIds) {
      const c = chars.find((x) => x.id === id)
      if (!c) continue
      const g = generateLine(c, scene, seed)
      parts.push(
        `<p><b>${escapeHtml(c.emoji + ' ' + (c.name.trim() || '이름 없음'))}${c.role.trim() ? escapeHtml(' · ' + c.role.trim()) : ''}</b><br/>` +
        `“${escapeHtml(g.example)}”<br/>` +
        `<span style="color:#888;font-size:90%">${escapeHtml(g.notes.join(' · '))}</span></p>`,
      )
    }
    const id = addToProject({
      root: 'research', folder: '말투', kind: 'text',
      title: `말투 비교 — ${scene.trim() || '상황'}`,
      bodyHtml: parts.join('\n'),
    })
    showFlash(id ? '말투 비교를 프로젝트에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  const addVoiceCardToProject = (c: VoiceChar) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    const character: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = v.trim(); if (t) character[k] = t }
    put('name', c.name.trim() || '이름 없는 인물')
    put('role', c.role)
    const habits = [
      ...AXES.map((ax) => `${ax.label}: ${ax.steps[c.params[ax.key]]}`),
      c.tics.trim() && '말버릇: ' + c.tics.split('\n').map((t) => t.trim()).filter(Boolean).join(', '),
      c.catchphrase.trim() && '입버릇: ' + c.catchphrase.trim(),
      c.avoid.trim() && '피하는 말: ' + c.avoid.trim(),
    ].filter(Boolean).join('\n')
    if (habits) character.habits = habits
    put('personality', c.speech)
    // 정규(표준) 키를 추가 — 받는 허브에서 항목이 제자리(기본 칸)에 들어가게 한다.
    // 기존 키는 유지하고 표준 키만 덧붙인다(additive, 뭉친 값은 키별로 분리됨).
    const norm = toNormFields(c)
    for (const k in norm) { if (!character[k]) character[k] = norm[k] }
    const id = addToProject({
      kind: 'character', folder: '인물',
      title: c.name.trim() || '이름 없는 인물',
      character,
    })
    showFlash(id ? `‘${c.name.trim() || '인물'}’ 목소리 카드를 프로젝트에 추가했어요.` : '프로젝트 추가에 실패했어요.')
  }

  /* ── 바인더 드롭 ── */
  const handleDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const v = fromDrop(it, chars.length)
    setChars((prev) => [...prev, v])
    setCompareIds((prev) => (prev.length < 3 ? [...prev, v.id] : prev))
    setEditId(v.id)
    showFlash(`‘${v.name.trim() || it.title || '바인더 파일'}’을(를) 인물로 추가했어요.`)
  }

  const editing = chars.find((c) => c.id === editId) || null
  // 비교 칸 데이터(상황·seed 변경 시 재생성). 메모이즈로 입력 중 깜빡임 줄임.
  const compareCols = useMemo(() => {
    return compareIds
      .map((id) => chars.find((c) => c.id === id))
      .filter((c): c is VoiceChar => !!c)
      .map((c) => ({ c, gen: generateLine(c, scene, seed) }))
  }, [compareIds, chars, scene, seed])

  /* ───────── 스타일 ───────── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 248, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--panel)' }
  const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const sceneBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', background: 'var(--paper)' }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 }
  const importPanel: React.CSSProperties = { position: 'absolute', top: 48, left: 14, zIndex: 30, width: 300, maxHeight: 320, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const importRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: dragOver ? -6 : 0 }}
      onDragEnter={(e) => { if (!isItemDrag(e)) return; e.preventDefault(); dragDepth.current += 1; setDragOver(true) }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 6, zIndex: 50, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', fontSize: 15, fontWeight: 700 }}>
          <Emoji e="📥" /> 바인더 파일을 놓으면 말투 인물로 추가돼요
        </div>
      )}

      <div style={topbar}>
        <div style={titleStyle}><span><Emoji e={meta.icon} /></span><span>인물 말투 실험실</span></div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 {chars.length}명 · 비교 {compareIds.length}칸</span>
        <button className="minibtn" onClick={() => setShowImport((v) => !v)} title="공유 라이브러리에서 인물 가져오기"><Emoji e="📥" /> 라이브러리에서</button>
        <button className="btn-primary" onClick={addChar}>＋ 인물 추가</button>
      </div>

      {showImport && (
        <div style={{ position: 'relative' }}>
          <div style={importPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="📥" /> 공유 라이브러리 인물</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setShowImport(false)} style={{ padding: '2px 7px' }}>닫기</button>
            </div>
            {library.length === 0 ? (
              <div style={{ ...hint, padding: '10px 6px' }}>아직 공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델 등에서 저장하거나, 여기서 말투를 만들어 “라이브러리에 저장”을 눌러 보세요.</div>
            ) : (
              library.map((s) => (
                <button key={s.id} style={importRow} onClick={() => importFromLibrary(s)} title="이 인물의 말투 만들기">
                  <span style={{ fontSize: 18 }}><Emoji e="🧑" /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.name || '(이름 없음)').trim()}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[s.role, s.source].filter(Boolean).join(' · ') || '인물'}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {(note || flash) && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      <div style={body}>
        {/* 좌측: 인물 목록 + 파라미터 편집 */}
        <div style={sidebar}>
          {chars.length === 0 ? (
            <div style={{ padding: '22px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
              아직 인물이 없어요.<br />위의 <b>＋ 인물 추가</b>로<br />목소리를 설정해 보세요.<br /><br />
              <span style={hint}>또는 좌측 바인더의 인물 파일을 이 창에 끌어다 놓아도 됩니다.</span>
            </div>
          ) : (
            <div style={listStyle}>
              {chars.map((c) => {
                const inCompare = compareIds.includes(c.id)
                const isEdit = editId === c.id
                const confirming = confirmDel === c.id
                return (
                  <div key={c.id} style={{ border: '1px solid ' + (isEdit ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, background: 'var(--paper)', overflow: 'hidden' }}>
                    <div
                      onClick={() => setEditId(isEdit ? null : c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', borderLeft: '4px solid ' + c.color }}
                    >
                      <span style={{ fontSize: 18 }}><Emoji e={c.emoji} /></span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.name.trim() ? 'var(--text)' : 'var(--muted)' }}>{c.name.trim() || '(이름 없음)'}</span>
                        {c.role.trim() && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role.trim()}</span>}
                      </span>
                      {c.libId && <span title="라이브러리 연결됨" style={{ fontSize: 12 }}><Emoji e="📚" /></span>}
                      <button
                        className="minibtn"
                        onClick={(e) => { e.stopPropagation(); toggleCompare(c.id) }}
                        title={inCompare ? '비교에서 빼기' : '비교에 올리기'}
                        style={{ padding: '3px 8px', borderColor: inCompare ? 'var(--accent)' : 'var(--border)', color: inCompare ? 'var(--accent)' : 'var(--text)' }}
                      >{inCompare ? '✓ 비교' : '＋ 비교'}</button>
                    </div>

                    {isEdit && (
                      <div style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input style={{ ...input, flex: 1, minWidth: 0 }} value={c.name} onChange={(e) => patchChar(c.id, { name: e.target.value })} placeholder="이름" maxLength={40} />
                          <input style={{ ...input, width: 84 }} value={c.role} onChange={(e) => patchChar(c.id, { role: e.target.value })} placeholder="역할" maxLength={30} />
                        </div>

                        {/* 이모지/색 선택 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {EMOJIS.slice(0, 10).map((em) => (
                            <button key={em} onClick={() => patchChar(c.id, { emoji: em })} title="식별 이모지"
                              style={{ fontSize: 15, width: 24, height: 24, lineHeight: '20px', borderRadius: 6, cursor: 'pointer', background: c.emoji === em ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'transparent', border: '1px solid ' + (c.emoji === em ? 'var(--accent)' : 'var(--border)') }}><Emoji e={em} /></button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {COLORS.map((col) => (
                            <button key={col} onClick={() => patchChar(c.id, { color: col })} title="강조색"
                              style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', background: col, border: c.color === col ? '2px solid var(--text)' : '1px solid var(--border)' }} />
                          ))}
                        </div>

                        {/* 슬라이더(파라미터) */}
                        {AXES.map((ax) => (
                          <div key={ax.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}><Emoji e={ax.icon} /> {ax.label}</span>
                              <span style={{ flex: 1 }} />
                              <span style={{ color: c.color, fontWeight: 600 }}>{ax.steps[c.params[ax.key]]}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {LEVELS.map((lv) => {
                                const on = c.params[ax.key] === lv
                                return (
                                  <button key={lv} onClick={() => patchParam(c.id, ax.key, lv)} title={ax.steps[lv]}
                                    style={{ flex: 1, height: 16, borderRadius: 4, cursor: 'pointer', border: '1px solid ' + (on ? c.color : 'var(--border)'), background: lv <= c.params[ax.key] ? c.color : 'var(--panel)', opacity: lv <= c.params[ax.key] ? 1 : 0.5 }} />
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                              <span>{ax.low}</span><span>{ax.high}</span>
                            </div>
                          </div>
                        ))}

                        <textarea style={{ ...input, minHeight: 42, resize: 'vertical', fontFamily: 'inherit' }} value={c.tics} onChange={(e) => patchChar(c.id, { tics: e.target.value })} placeholder="말버릇(줄마다 하나) — 예: 그러니까, / …말이지, / 음—" rows={2} />
                        <input style={input} value={c.catchphrase} onChange={(e) => patchChar(c.id, { catchphrase: e.target.value })} placeholder="입버릇/별명 — 예: 어차피 다 잘될 거야" maxLength={60} />
                        <input style={input} value={c.avoid} onChange={(e) => patchChar(c.id, { avoid: e.target.value })} placeholder="피하는 말투/금기 — 예: 욕설, 존댓말" maxLength={60} />
                        <textarea style={{ ...input, minHeight: 42, resize: 'vertical', fontFamily: 'inherit' }} value={c.speech} onChange={(e) => patchChar(c.id, { speech: e.target.value })} placeholder="말투 자유 메모(성우 지시문처럼)" rows={2} />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <button className="minibtn" onClick={() => saveToLibrary(c)} title="이 말투를 공유 라이브러리에 저장/업데이트" style={{ padding: '3px 8px' }}>
                            {c.libId && library.some((x) => x.id === c.libId) ? <><Emoji e="📚" /> 업데이트</> : <><Emoji e="📚" /> 저장</>}
                          </button>
                          <button className="minibtn" onClick={() => addVoiceCardToProject(c)} disabled={!bridgeOn} title="이 목소리를 프로젝트 인물 카드로" style={{ padding: '3px 8px' }}><Emoji e="📄" /> 카드</button>
                          <button className="minibtn" onClick={() => duplicate(c.id)} title="복제" style={{ padding: '3px 8px' }}>⎘</button>
                          <span style={{ flex: 1 }} />
                          {confirming ? (
                            <>
                              <button className="minibtn" onClick={() => doDelete(c.id)} style={{ padding: '3px 8px', color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                              <button className="minibtn" onClick={() => setConfirmDel(null)} style={{ padding: '3px 8px' }}>취소</button>
                            </>
                          ) : (
                            <button className="minibtn" onClick={() => requestDelete(c.id)} title="삭제" style={{ padding: '3px 8px' }}><Emoji e="🗑️" /></button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 상황 입력 + 좌우 비교 */}
        <div style={main}>
          <div style={sceneBar}>
            <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Emoji e="🎬" /> 상황</span>
            <input
              style={{ ...input, flex: 1, minWidth: 160 }}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="같은 상황 한 줄 — 예: 사랑을 고백한다"
              maxLength={120}
            />
            <select style={{ ...input, cursor: 'pointer' }} value="" onChange={(e) => { if (e.target.value) setScene(e.target.value) }} title="상황 프리셋">
              <option value="">프리셋…</option>
              {SCENE_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="minibtn" onClick={() => setSeed((s) => s + 1)} title="같은 설정으로 다른 변주 만들기"><Emoji e="🔁" /> 다시 생성</button>
            <button className="minibtn" onClick={() => copyText(comparisonText(), '비교 결과를 복사했어요.')} disabled={!compareIds.length} title="비교 결과 텍스트 복사"><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={addComparisonToProject} disabled={!bridgeOn || !compareIds.length} title="비교 결과를 프로젝트 자료에 추가"><Emoji e="📄" /> 프로젝트에 추가</button>
          </div>

          {compareCols.length === 0 ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 40 }}><Emoji e="🗣️" /></div>
              <div>
                {chars.length === 0
                  ? <>왼쪽에서 인물을 추가하고<br />목소리 파라미터를 설정하세요.</>
                  : <>왼쪽 인물 카드의 <b>＋ 비교</b> 버튼을 눌러<br />여기에 올리면, 같은 상황을 인물별 말투로<br />어떻게 말할지 나란히 비교할 수 있어요.</>}
              </div>
              {chars.length === 0
                ? <button className="btn-primary" onClick={addChar}>＋ 첫 인물 만들기</button>
                : <div style={hint}>최대 4명까지 좌우로 비교됩니다. 상황을 바꾸거나 <Emoji e="🔁" /> 다시 생성으로 변주를 볼 수 있어요.</div>}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', gap: 0, alignItems: 'stretch' }}>
              {compareCols.map(({ c, gen }, idx) => (
                <div key={c.id} style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', borderRight: idx < compareCols.length - 1 ? '1px solid var(--border)' : 'none', minHeight: 0 }}>
                  {/* 칸 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '2px solid ' + c.color, background: 'color-mix(in srgb, ' + c.color + ' 10%, var(--paper))', flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}><Emoji e={c.emoji} /></span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.trim() || '이름 없음'}</span>
                      {c.role.trim() && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.role.trim()}</span>}
                    </span>
                    <button className="minibtn" onClick={() => moveCompare(c.id, -1)} disabled={idx === 0} title="왼쪽으로" style={{ padding: '2px 6px' }}>◀</button>
                    <button className="minibtn" onClick={() => moveCompare(c.id, 1)} disabled={idx === compareCols.length - 1} title="오른쪽으로" style={{ padding: '2px 6px' }}>▶</button>
                    <button className="minibtn" onClick={() => toggleCompare(c.id)} title="이 칸 닫기" style={{ padding: '2px 6px' }}>✕</button>
                  </div>

                  {/* 칸 본문 */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* 가이드 대사 */}
                    <div style={{ borderRadius: 10, border: '1px solid ' + c.color, background: 'color-mix(in srgb, ' + c.color + ' 7%, var(--paper))', padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>이 인물이라면…</div>
                      <div style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>“{emojify(gen.example)}”</div>
                    </div>

                    {/* 작성 지침 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>작성 지침</div>
                      {gen.notes.map((n, i) => (
                        <div key={i} style={{ fontSize: 12, lineHeight: 1.5, padding: '4px 7px', borderRadius: 6, background: 'var(--panel)', border: '1px solid var(--border)' }}>{emojify(n)}</div>
                      ))}
                    </div>

                    {/* 미니 파라미터 막대(읽기 전용 요약) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>목소리 프로필</div>
                      {AXES.map((ax) => (
                        <div key={ax.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, width: 58, color: 'var(--muted)', flexShrink: 0 }}>{ax.label}</span>
                          <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--panel)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ width: ((c.params[ax.key] / 4) * 100) + '%', height: '100%', background: c.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {(c.catchphrase.trim() || c.tics.trim()) && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {c.tics.trim() && <div><Emoji e="🔤" /> 말버릇: {emojify(c.tics.split('\n').map((t) => t.trim()).filter(Boolean).join(', '))}</div>}
                        {c.catchphrase.trim() && <div><Emoji e="💬" /> 입버릇: “{emojify(c.catchphrase.trim())}”</div>}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      <button className="minibtn" onClick={() => setEditId(c.id)} title="이 인물 파라미터 편집" style={{ width: '100%' }}><Emoji e="⚙️" /> 목소리 편집</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 연계 바 */}
          <div className="linkbar" style={{ flexShrink: 0, padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet', editing ? { character: { ...toSharedPatch(editing), id: editing.libId } } : undefined)} title="인물 시트 열기"><Emoji e="🧑‍🎤" /> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="관계도 열기"><Emoji e="🕸️" /> 관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('pov-tracker')} title="시점 추적기 열기"><Emoji e="🎯" /> 시점 추적기</button>
            <span style={{ flex: 1 }} />
            <span style={hint}>생성 문장은 규칙 기반 가이드예요 — 실제 대사를 쓸 출발점으로 쓰세요. 모든 데이터는 이 브라우저에 자동 저장됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
