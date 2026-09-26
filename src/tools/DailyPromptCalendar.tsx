// 글감 일력(Daily Prompt Calendar) — 날짜를 시드로 그날 "고정" 글감을 보여주는 일력형 도구.
//  · 매일 자동으로 바뀜(시드=날짜). 같은 날짜는 언제 봐도 같은 글감 → 어제·내일·과거 날짜를 자유로이 넘겨볼 수 있다.
//  · 카테고리별 대량 로컬 풀(네트워크 불필요·완전 로컬). 카테고리 on/off 로 풀을 조절하면 시드 결과도 그에 맞게 고정.
//  · 그날의 짧은 글을 바로 쓰는 자유쓰기 칸(날짜별 초안 자동 저장).
//  · "완료" 체크 기록 + 달력 그리드(완료/작성/오늘 표시) + 연속일(스트릭) 통계.
//  · 오늘 글감으로 쓰기: 스니펫 라이브러리/프로젝트(초고·자료)에 저장.
// 규약: react 와 './linkbus' 외 import 금지. 영속은 localStorage 'sry:tool:daily-prompt-calendar'. 언마운트 정리.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, Emoji } from './linkbus'

export const meta = {
  id: 'daily-prompt-calendar',
  name: '글감 일력',
  icon: '📅',
  group: '영감·발상',
  intro: '날짜마다 고정된 오늘의 글감을 넘겨보고, 완료를 체크하며 매일 한 편씩 써보세요',
  w: 540,
  h: 720,
}

const LS_KEY = 'sry:tool:daily-prompt-calendar'

// ──────────────────────────────────────────────────────────────────────────
// 글감 대량 풀 — 완전 로컬. 카테고리별로 묶어, 날짜 시드로 카테고리→풀 안에서 하나를 고정 선택한다.
// ──────────────────────────────────────────────────────────────────────────
interface Category { key: string; label: string; icon: string; prompts: string[] }

const CATEGORIES: Category[] = [
  {
    key: 'observe',
    label: '관찰·묘사',
    icon: '🔍',
    prompts: [
      '지금 손에 닿는 물건 하나를 골라, 한 번도 본 적 없는 사람에게 설명하듯 묘사해보세요.',
      '창밖(혹은 가장 가까운 창)의 풍경을 색·빛·움직임만으로 묘사해보세요.',
      '지금 이 순간 들리는 소리 세 가지를 적고, 각각의 정체와 출처를 상상해보세요.',
      '오늘 마신 음료의 색·향·온도·기억을 한 문단으로 담아보세요.',
      '가장 가까이 있는 사람(혹은 사물)의 손을, 손만으로 그 일생을 짐작해 묘사해보세요.',
      '오늘 하늘의 색을 정확히 표현할 단어를 새로 만들고 그 정의를 써보세요.',
      '비 오는 날의 냄새를, 한 번도 비를 본 적 없는 사람에게 설명해보세요.',
      '지금 앉아 있는 자리에서 보이는 가장 사소한 것 하나를 300자로 확대해 묘사해보세요.',
      '오늘 먹은 음식 한 가지를 미각·식감·소리까지 모두 동원해 써보세요.',
      '가장 좋아하는 계절의 한 장면을 다섯 감각을 모두 써서 묘사해보세요.',
      '낯선 사람의 옆모습을 1분간 관찰했다 치고, 그 사람의 하루를 추측해 써보세요.',
      '집에서 가장 오래된 물건의 흠집과 자국을 단서 삼아 그 내력을 복원해보세요.',
      '오늘의 날씨를 사람의 기분으로 바꿔 묘사해보세요.',
      '눈을 감고 떠오르는 첫 색깔로 글을 시작해, 그 색이 이끄는 대로 써보세요.',
      '평소 무심코 지나치던 길의 한 구간을 처음 온 여행자의 눈으로 묘사해보세요.',
    ],
  },
  {
    key: 'memory',
    label: '기억·회상',
    icon: '🕯️',
    prompts: [
      '어린 시절 살던 집의 부엌을 기억나는 대로 자세히 복원해보세요.',
      '오래된 사진 한 장을 떠올리고, 그 장면 바로 다음에 무슨 일이 있었는지 써보세요.',
      '한 번도 말하지 못한 고마움을 누군가에게 전하는 글을 써보세요.',
      '가장 오래 간직한 약속을 떠올려, 지킨 이야기 혹은 못 지킨 이야기를 써보세요.',
      '오래된 노래 한 곡과 얽힌 기억을 떠올려 그 장면을 복원해보세요.',
      '잃어버린 줄 알았던 물건을 다시 찾은 순간을 자세히 써보세요.',
      '당신이 절대 버리지 못하는 물건과 그 이유를 써보세요.',
      '낯선 사람에게서 받은 짧은 친절을 떠올려 그 순간을 천천히 써보세요.',
      '처음으로 무언가를 “끝까지 해냈던” 순간을 기억해 써보세요.',
      '어린 당신을 가장 크게 위로했던 한 마디를 떠올려, 그 장면을 되살려보세요.',
      '지금은 사라진 어떤 장소(가게·골목·놀이터)를 기억으로 다시 지어보세요.',
      '당신이 가진 흉터나 자국 하나의 진짜(혹은 지어낸) 이야기를 써보세요.',
      '“그날 이후로 모든 것이 달라졌다.” 이 문장으로 끝나는 짧은 회상을 써보세요.',
      '한 번 크게 부끄러웠던 일을 지금의 시선으로 다시 바라보며 써보세요.',
      '오랫동안 보지 못한 사람에게 보내는, 부치지 않을 편지를 써보세요.',
    ],
  },
  {
    key: 'character',
    label: '인물·대사',
    icon: '🎭',
    prompts: [
      '거짓말을 하고 있는 인물의 속마음과 겉말을 한 장면에 함께 써보세요.',
      '두려워하는 것을 의인화해서, 그와 나누는 대화를 써보세요.',
      '지금 입고 있는 옷이 말을 할 수 있다면 어떤 이야기를 할지 1인칭으로 써보세요.',
      '“나는 한 번도 ___해본 적이 없다”의 빈칸을 채워 한 인물의 비밀을 써보세요.',
      '거울 속의 내가 갑자기 다른 행동을 한다면 어떤 장면이 펼쳐질지 써보세요.',
      '서로를 오해한 두 사람의 짧은 대화를, 독자만 진실을 알도록 써보세요.',
      '한 인물이 절대 입 밖에 내지 못하는 한 문장을, 행동으로만 드러내 보세요.',
      '버스나 카페에서 우연히 들은 한 문장을 첫 대사로 삼아 장면을 지어보세요.',
      '같은 사건을 정반대로 기억하는 두 인물의 독백을 나란히 써보세요.',
      '“그건 네 잘못이 아니야”라는 말을, 정반대 의미로 쓰는 인물을 그려보세요.',
      '한 인물의 가장 사소한 습관 하나로 그의 성격 전체를 암시해보세요.',
      '말수가 적은 인물이 처음으로 길게 말하는 순간을 써보세요.',
      '누군가에게 사과해야 하지만 끝내 다른 말을 하는 인물을 그려보세요.',
      '한 인물이 자신을 소개하면서, 정작 가장 중요한 사실만 숨기게 해보세요.',
      '“미안하다”와 “고맙다” 중 하나만 말할 수 있는 인물의 선택을 써보세요.',
    ],
  },
  {
    key: 'whatif',
    label: '만약에·발상',
    icon: '✨',
    prompts: [
      '“만약 내가 어제로 돌아간다면”으로 시작하는 글을 써보세요.',
      '“시간이 멈췄다.” 멈춘 세상에서 당신은 무엇을 할지 써보세요.',
      '하루 동안 투명인간이 된다면 가장 먼저 할 일을 써보세요.',
      '당신이 가장 좋아하는 음식이 세상에서 사라진다면 어떤 일이 벌어질까요?',
      '냉장고 안의 물건들이 한밤중에 벌이는 회의를 상상해 써보세요.',
      '하루를 1분으로 압축할 수 있다면 어느 1분을 남기고 싶은지 써보세요.',
      '내일 아침 단 하나만 달라져 있다면 무엇이길 바라는지, 그 세계를 써보세요.',
      '“계단을 내려가자 더 이상 계단이 아니었다.” 이어서 써보세요.',
      '지금 이 방에 갑자기 바다가 들어온다면 무슨 일이 벌어질지 써보세요.',
      '평범한 출근/등굣길에 단 하나가 비현실적으로 바뀐다면 무엇일지 써보세요.',
      '미래의 박물관에 전시될 ‘오늘의 평범한 물건’ 설명문을 써보세요.',
      '당신의 그림자가 하루 동안 독립한다면 어디로 갈지 써보세요.',
      '말을 글자 수로만 살 수 있는 세상이라면, 사람들은 어떻게 대화할까요?',
      '잊는 능력을 사고팔 수 있다면, 누가 무엇을 사러 올지 써보세요.',
      '하늘에서 색이 하나만 사라진다면 어떤 색이 사라지길 바라는지 써보세요.',
    ],
  },
  {
    key: 'scene',
    label: '장면·첫 문장',
    icon: '🚪',
    prompts: [
      '“문을 열자 거기에는…”으로 시작하는 장면을 이어 써보세요.',
      '“그 소리를 다시는 듣지 못할 줄 알았다.” 이 문장으로 글을 시작하세요.',
      '“마지막 버스가 떠나고 있었다.” 그 정류장에 남은 사람을 그려보세요.',
      '“열쇠는 거기 없었다.” 사라진 열쇠를 둘러싼 짧은 장면을 써보세요.',
      '“우리는 그 약속을 지키지 못했다.” 우리는 누구이고 약속은 무엇이었는지 써보세요.',
      '“그건 분명히 어제까지 거기에 있었다.” 사라진 그것을 둘러싼 장면을 써보세요.',
      '“그 편지는 끝내 부치지 못했다.” 편지의 내용을 써보세요.',
      '한낮의 텅 빈 장소(역·운동장·복도)에 홀로 선 인물의 장면을 써보세요.',
      '비가 막 그친 직후의 한 거리에서 시작하는 장면을 써보세요.',
      '두 사람이 같은 우산을 쓰고 한 마디도 하지 않는 장면을 써보세요.',
      '불이 꺼진 방, 누군가 문을 두드리는 소리로 시작하는 장면을 써보세요.',
      '오래된 집의 다락에서 무언가를 발견하는 장면을 써보세요.',
      '낯선 번호로 걸려 온 전화 한 통으로 시작하는 장면을 써보세요.',
      '눈 내리는 새벽, 첫 발자국을 남기는 인물의 장면을 써보세요.',
      '문이 잠긴 방 안에서 단 하나의 창문만 열려 있는 장면을 써보세요.',
    ],
  },
  {
    key: 'emotion',
    label: '감정·내면',
    icon: '💗',
    prompts: [
      '지금 가장 보고 싶은 사람에게 안부를 묻는 짧은 글을 써보세요.',
      '오늘 아침 가장 먼저 떠올린 생각을 멈추지 말고 끝까지 풀어 써보세요.',
      '말로 표현하기 가장 어려운 감정 하나를 비유만으로 설명해보세요.',
      '오늘 느낀 작은 불안을, 그것에게 직접 말을 거는 형식으로 써보세요.',
      '“괜찮아”라고 말했지만 실은 그렇지 않았던 순간을 써보세요.',
      '당신을 가장 차분하게 만드는 것이 무엇인지, 그 이유까지 써보세요.',
      '한동안 미뤄둔 마음 하나를 꺼내, 그것에 이름을 붙여보세요.',
      '오늘 하루를 한 가지 색으로 칠한다면 무슨 색일지, 왜인지 써보세요.',
      '기쁨과 슬픔이 동시에 찾아온 순간을 한 장면으로 써보세요.',
      '“나는 사실 ___이 두렵다.” 빈칸을 채우고 그 두려움을 들여다보세요.',
      '아무에게도 말하지 않은 작은 자부심 하나를 써보세요.',
      '오늘 가장 고마웠던 한순간을, 그 사람이 모르게 적어보세요.',
      '한 단어(예: ‘틈’, ‘재’, ‘파랑’)를 정하고 그 단어가 부르는 감정만 따라 써보세요.',
      '지금 마음에 가장 무거운 것을 한 문장으로 줄여보고, 그 한 문장을 풀어 써보세요.',
      '오래 참아온 말 하나를, 들어줄 사람이 있다고 상상하며 털어놓아 보세요.',
    ],
  },
  {
    key: 'world',
    label: '상상·세계',
    icon: '🗺️',
    prompts: [
      '한 번도 가본 적 없는 도시의 아침 거리를 상상해 묘사해보세요.',
      '당신만 아는 비밀 장소를 처음 가는 사람에게 안내하듯 써보세요.',
      '한 번도 키워본 적 없는 동물과 함께한 하루를 상상해 써보세요.',
      '가장 좋아하는 책 속 인물을 오늘의 거리로 데려와 하루를 써보세요.',
      '존재하지 않는 명절을 하나 만들고, 그날의 풍습을 써보세요.',
      '비현실적인 직업 하나를 만들어, 그 직업의 하루 일과를 써보세요.',
      '지도에 없는 작은 마을을 하나 짓고, 그곳의 규칙 세 가지를 써보세요.',
      '미래의 어느 박물관 안내문 형식으로, 지금 시대를 설명해보세요.',
      '하늘을 나는 대신 시간을 거슬러 헤엄치는 생물을 상상해 써보세요.',
      '오직 밤에만 열리는 가게를 하나 만들고, 그곳에서 파는 것을 써보세요.',
      '꿈에서 본(혹은 지어낸) 도시 하나를 지도 설명처럼 써보세요.',
      '잊힌 신을 하나 만들고, 그를 섬기던 사람들의 흔적을 묘사해보세요.',
      '계절이 다섯 개인 세상의 다섯 번째 계절을 묘사해보세요.',
      '소리가 색으로 보이는 사람의 하루를 1인칭으로 써보세요.',
      '버려진 등대 안에 살게 된 인물의 첫 일주일을 써보세요.',
    ],
  },
  {
    key: 'free',
    label: '자유쓰기',
    icon: '🌀',
    prompts: [
      '지금 떠오르는 단어 하나로 시작해, 손을 멈추지 말고 5분간 써보세요.',
      '“오늘 나는…”으로 시작해 의식의 흐름대로 끝까지 써보세요.',
      '머릿속에 떠오르는 멜로디 하나를 글자로만 설명해보세요.',
      '지금 가장 하고 싶은 말을, 받는 사람을 정하지 말고 써보세요.',
      '오늘 본 가장 아름다운 것과 가장 추한 것을 나란히 써보세요.',
      '눈앞에 보이는 세 단어를 골라, 그 세 단어가 모두 들어가는 글을 써보세요.',
      '“만약 이 글이 누군가에게 닿는다면…”으로 시작해 끝까지 써보세요.',
      '지금 이 순간을, 100년 뒤 사람이 읽을 기록이라 생각하고 써보세요.',
      '오늘 하루를 동화의 한 장면처럼 바꿔 써보세요.',
      '맞춤법도 형식도 신경 쓰지 말고, 지금 떠오르는 것을 그대로 쏟아내 보세요.',
      '“나에게 글쓰기란…”으로 시작하는 짧은 선언문을 써보세요.',
      '오늘의 나를, 친한 친구가 소개하듯 3인칭으로 써보세요.',
      '한 문장으로 시작해, 그 문장을 점점 길게 늘려가며 한 단락을 만들어보세요.',
      '지금 이 방을 떠나기 전 꼭 적어두고 싶은 한 가지를 써보세요.',
      '“계속 쓰자”라는 말을 스스로에게 하는 짧은 글을 써보세요.',
    ],
  },
]

const CAT_BY_KEY: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// ──────────────────────────────────────────────────────────────────────────
// 결정적 시드 — 날짜 문자열을 32bit 해시로. 같은 날짜·같은 풀이면 언제나 같은 결과.
// ──────────────────────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0 // FNV-1a 기반(가벼운 분산)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // 추가 비트 믹싱(인접 날짜가 비슷하지 않도록)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return h >>> 0
}

interface DailyPrompt { catKey: string; text: string }

// 활성 카테고리만으로 그날의 글감을 고정 선택. 카테고리도 시드로 고른 뒤(그 안에서) 글감을 고른다.
function promptForDate(dateKey: string, activeKeys: string[]): DailyPrompt | null {
  const cats = (activeKeys.length ? activeKeys : CATEGORIES.map((c) => c.key))
    .filter((k) => CAT_BY_KEY[k])
  if (!cats.length) return null
  const h1 = hashStr('cat|' + dateKey)
  const cat = CAT_BY_KEY[cats[h1 % cats.length]]
  const h2 = hashStr('idx|' + dateKey + '|' + cat.key)
  const text = cat.prompts[h2 % cat.prompts.length]
  return { catKey: cat.key, text }
}

// ──────────────────────────────────────────────────────────────────────────
// 날짜 유틸 — 로컬 타임존 기준 YYYY-MM-DD 키. (UTC 변환은 날짜가 밀릴 수 있어 사용 안 함)
// ──────────────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, '0') }
function dateKey(d: Date): string { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function keyToDate(key: string): Date {
  const [y, m, dd] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, dd || 1)
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
function longLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

// ──────────────────────────────────────────────────────────────────────────
// 영속 상태
// ──────────────────────────────────────────────────────────────────────────
interface Persisted {
  done: Record<string, true>          // dateKey → 완료 체크
  drafts: Record<string, string>      // dateKey → 그날 쓴 글
  active: string[]                    // 활성 카테고리 key 목록
  lastSeen?: string                   // 마지막으로 본 날짜(참고용)
}
function loadState(): Persisted {
  const base: Persisted = { done: {}, drafts: {}, active: CATEGORIES.map((c) => c.key) }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      done: (p && typeof p.done === 'object' && p.done) ? p.done : {},
      drafts: (p && typeof p.drafts === 'object' && p.drafts) ? p.drafts : {},
      active: Array.isArray(p?.active) && p!.active!.length ? p!.active!.filter((k) => CAT_BY_KEY[k]) : base.active,
      lastSeen: typeof p?.lastSeen === 'string' ? p!.lastSeen : undefined,
    }
  } catch { return base }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 연속일(스트릭) — 오늘(또는 어제)부터 거꾸로 연속으로 완료된 날 수.
function computeStreak(done: Record<string, true>, today: Date): { current: number; total: number; longest: number } {
  const total = Object.keys(done).length
  // 현재 스트릭: 오늘이 완료면 오늘부터, 아니면 어제부터 역방향
  let cur = 0
  let cursor = startOfDay(today)
  if (!done[dateKey(cursor)]) cursor = addDays(cursor, -1)
  while (done[dateKey(cursor)]) { cur++; cursor = addDays(cursor, -1) }
  // 최장 스트릭: 완료된 날들을 정렬해 연속 구간 최댓값
  const keys = Object.keys(done).sort()
  let longest = 0, run = 0
  let prev: Date | null = null
  for (const k of keys) {
    const d = keyToDate(k)
    if (prev && dateKey(addDays(prev, 1)) === k) run++
    else run = 1
    if (run > longest) longest = run
    prev = d
  }
  return { current: cur, total, longest }
}

export default function DailyPromptCalendar({ payload }: { payload?: Record<string, unknown> }) {
  // 오늘(자정 단위). 1분마다 자정 경과를 체크해 날짜가 바뀌면 갱신.
  const [today, setToday] = useState(() => startOfDay(new Date()))
  const [sel, setSel] = useState<Date>(() => startOfDay(new Date())) // 보고 있는 날짜
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfDay(new Date())) // 달력 표시 월
  const [view, setView] = useState<'day' | 'month'>('day')
  const [persist, setPersist] = useState<Persisted>(() => loadState())
  const [draft, setDraft] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState('')

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const midnightTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const selKey = dateKey(sel)
  const todayKey = dateKey(today)

  // payload.date(YYYY-MM-DD) 로 특정 날짜 열기(연계 진입점).
  useEffect(() => {
    const d = payload && typeof payload.date === 'string' ? payload.date : ''
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const dt = keyToDate(d)
      if (!isNaN(dt.getTime())) { setSel(startOfDay(dt)); setMonthCursor(startOfDay(dt)) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자정 경과 감지 — 날짜가 바뀌면 today 갱신(자동으로 글감도 바뀜).
  useEffect(() => {
    midnightTimer.current = setInterval(() => {
      const now = startOfDay(new Date())
      setToday((prev) => (dateKey(prev) !== dateKey(now) ? now : prev))
    }, 60 * 1000)
    return () => { if (midnightTimer.current) clearInterval(midnightTimer.current) }
  }, [])

  // 선택 날짜 바뀌면 해당 날짜의 초안 로드.
  useEffect(() => { setDraft(persist.drafts[selKey] || '') }, [selKey, persist.drafts])

  // 영속 저장 헬퍼(디바운스).
  const persistRef = useRef(persist)
  persistRef.current = persist
  const flushSave = useCallback((next: Persisted) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* 용량 초과 등 무시 */ }
  }, [])

  // 언마운트 정리.
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (midnightTimer.current) clearInterval(midnightTimer.current)
    // 미저장 초안 즉시 보존
    flushSave(persistRef.current)
  }, [flushSave])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  // 초안 입력 — 상태 즉시 반영 + localStorage 디바운스 저장.
  const onDraftChange = (val: string) => {
    setDraft(val)
    setPersist((p) => {
      const drafts = { ...p.drafts }
      if (val.trim()) drafts[selKey] = val
      else delete drafts[selKey]
      const next = { ...p, drafts, lastSeen: todayKey }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => flushSave(next), 450)
      return next
    })
  }

  // 완료 토글.
  const toggleDone = (key: string) => {
    setPersist((p) => {
      const done = { ...p.done }
      if (done[key]) delete done[key]
      else done[key] = true
      const next = { ...p, done }
      flushSave(next)
      return next
    })
  }

  // 카테고리 토글(최소 1개 유지).
  const toggleCat = (k: string) => {
    setPersist((p) => {
      const has = p.active.includes(k)
      let active = has ? p.active.filter((x) => x !== k) : [...p.active, k]
      if (!active.length) active = [k] // 전부 끄지 못하게
      const next = { ...p, active }
      flushSave(next)
      return next
    })
  }

  const activeKeys = persist.active
  const current = useMemo(() => promptForDate(selKey, activeKeys), [selKey, activeKeys])
  const cat = current ? CAT_BY_KEY[current.catKey] : null
  const isToday = selKey === todayKey
  const isFuture = sel.getTime() > today.getTime()
  const isDone = !!persist.done[selKey]
  const streak = useMemo(() => computeStreak(persist.done, today), [persist.done, today])

  // ── 이동 ──
  const goPrev = () => setSel((d) => addDays(d, -1))
  const goNext = () => setSel((d) => addDays(d, 1))
  const goToday = () => { setSel(today); setMonthCursor(today) }

  // ── 연계: 저장 ──
  const copyPrompt = () => {
    if (!current) return
    navigator.clipboard?.writeText(`${longLabel(sel)} 오늘의 글감\n“${current.text}”`).catch(() => {})
    flash('글감을 클립보드에 복사했어요.')
  }

  const saveSnippet = () => {
    if (!current) return
    addToLibrary('snippets', {
      text: `[오늘의 글감 · ${longLabel(sel)}] ${current.text}`,
      source: '글감 일력',
      tags: ['글감', '일력', cat?.label || ''].filter(Boolean) as string[],
    })
    flash('글감을 스니펫 라이브러리에 저장했어요.')
  }

  const stash = () => {
    if (!current) return
    addToStash({ kind: 'memo', label: `오늘의 글감 (${longLabel(sel)})`, text: current.text })
    flash('수집함에 글감을 담았어요.')
  }

  const toProject = () => {
    if (!current) return
    const body = draft.trim()
    const paras = body
      ? body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
        .map((s) => `<p>${escapeHtml(s).replace(/\n/g, '<br>')}</p>`).join('')
      : ''
    const bodyHtml =
      `<p><em>📅 ${escapeHtml(longLabel(sel))} 오늘의 글감 (${escapeHtml(cat?.label || '')})</em></p>` +
      `<p><b>“${escapeHtml(current.text)}”</b></p>` +
      (paras ? `<hr/>${paras}` : '')
    const hasBody = !!body
    const id = addToProject({
      kind: 'text',
      root: hasBody ? 'draft' : 'research',
      folder: hasBody ? '글감 일력' : '영감 메모',
      title: `글감 · ${selKey}`,
      bodyHtml,
      synopsis: current.text,
      meta: { 출처: '글감 일력', 날짜: selKey, 분류: cat?.label || '', 글자수: String(body.length) },
    })
    flash(id
      ? (hasBody ? '프로젝트 초고에 오늘 쓴 글을 추가했어요.' : '프로젝트 자료에 글감을 추가했어요.')
      : '프로젝트에 연결되어 있지 않습니다.')
  }

  // ── 달력 그리드 데이터 ──
  const monthGrid = useMemo(() => {
    const y = monthCursor.getFullYear()
    const m = monthCursor.getMonth()
    const first = new Date(y, m, 1)
    const startPad = first.getDay() // 0=일
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [monthCursor])

  const monthStats = useMemo(() => {
    const y = monthCursor.getFullYear(), m = monthCursor.getMonth()
    let done = 0, written = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const k = dateKey(new Date(y, m, d))
      if (persist.done[k]) done++
      if (persist.drafts[k]?.trim()) written++
    }
    return { done, written, daysInMonth }
  }, [monthCursor, persist.done, persist.drafts])

  // ──────────────────────────────────────────────────────────────────────
  // 스타일
  // ──────────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const navRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const dateLabelStyle: React.CSSProperties = { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, minWidth: 150 }
  const promptCard: React.CSSProperties = {
    background: 'var(--paper)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
  }
  const catBadge: React.CSSProperties = { alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px' }
  const promptText: React.CSSProperties = { fontSize: 17, lineHeight: 1.6, fontWeight: 600, wordBreak: 'keep-all' }
  const ta: React.CSSProperties = { minHeight: 130, resize: 'vertical', width: '100%', boxSizing: 'border-box', padding: 12, fontSize: 15, lineHeight: 1.65, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontFamily: 'inherit' }
  const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
  const statRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const toastBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--ok)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }
  const statChip: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 12px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, flex: 1 }
  const statNum: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }
  const statCap: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }

  const dateInputVal = selKey

  return (
    <div style={wrap}>
      {/* 상단: 보기 전환 + 통계 */}
      <div style={topBar}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={view === 'day' ? 'btn-primary' : 'minibtn'} onClick={() => setView('day')}><Emoji e="📖"/> 일력</button>
          <button className={view === 'month' ? 'btn-primary' : 'minibtn'} onClick={() => { setView('month'); setMonthCursor(sel) }}><Emoji e="🗓"/> 달력</button>
        </div>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowSettings((s) => !s)} title="글감 카테고리 선택"><Emoji e="⚙️"/> 카테고리</button>
      </div>

      {/* 통계 칩 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={statChip}><span style={statNum}>{streak.current}</span><span style={statCap}><Emoji e="🔥"/> 연속일</span></div>
        <div style={statChip}><span style={statNum}>{streak.longest}</span><span style={statCap}>최장 연속</span></div>
        <div style={statChip}><span style={statNum}>{streak.total}</span><span style={statCap}>총 완료</span></div>
      </div>

      {/* 설정: 카테고리 선택 */}
      {showSettings && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>오늘의 글감 풀에 포함할 분류를 고르세요. (최소 1개 · 선택은 시드 결과에 반영)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map((c) => {
              const on = activeKeys.includes(c.key)
              return (
                <button
                  key={c.key}
                  className={on ? 'btn-primary' : 'minibtn'}
                  onClick={() => toggleCat(c.key)}
                  style={{ opacity: on ? 1 : 0.7 }}
                  title={`${c.label} · 글감 ${c.prompts.length}개`}
                ><Emoji e={c.icon}/> {c.label}</button>
              )
            })}
          </div>
        </div>
      )}

      {view === 'day' ? (
        <>
          {/* 날짜 네비 */}
          <div style={navRow}>
            <button className="minibtn" onClick={goPrev} title="어제">←</button>
            <div style={dateLabelStyle}>
              {longLabel(sel)}
              {isToday && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>· 오늘</span>}
            </div>
            <button className="minibtn" onClick={goNext} title="내일">→</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={dateInputVal}
              onChange={(e) => { if (e.target.value) { const d = keyToDate(e.target.value); if (!isNaN(d.getTime())) { setSel(startOfDay(d)); setMonthCursor(startOfDay(d)) } } }}
              style={{ flex: 1, padding: '6px 8px', fontSize: 13, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', colorScheme: 'dark light' }}
            />
            <button className="minibtn" onClick={goToday} disabled={isToday}><Emoji e="📍"/> 오늘로</button>
          </div>

          {/* 글감 카드 */}
          {current && cat ? (
            <div style={promptCard}>
              <div style={catBadge}><Emoji e={cat.icon}/> {cat.label}</div>
              <div style={promptText}>“{current.text}”</div>
              {isFuture && <div style={{ ...hint, color: 'var(--warn)' }}><Emoji e="🔮"/> 아직 오지 않은 날의 글감입니다(미리보기). 완료 체크는 그날 이후에 권해요.</div>}
              <div style={actions}>
                <button
                  className={isDone ? 'btn-primary' : 'minibtn'}
                  onClick={() => toggleDone(selKey)}
                  title="이 날의 글감을 완료로 표시"
                >{isDone ? '✓ 완료함' : '☐ 완료 체크'}</button>
                <button className="minibtn" onClick={copyPrompt}><Emoji e="📋"/> 글감 복사</button>
                <button className="minibtn" onClick={saveSnippet}><Emoji e="📝"/> 스니펫 저장</button>
                {hasStash() && <button className="minibtn" onClick={stash}><Emoji e="📥"/> 수집함</button>}
              </div>
            </div>
          ) : (
            <div style={{ ...promptCard, alignItems: 'center', color: 'var(--muted)' }}>
              표시할 글감이 없습니다. <Emoji e="⚙️"/> 카테고리에서 분류를 하나 이상 선택하세요.
            </div>
          )}

          {/* 그날의 자유쓰기 */}
          {current && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Emoji e="✍️"/> 이 글감으로 오늘 한 편
                {draft.trim() && <span style={{ color: 'var(--ok)' }}>· 자동 저장됨</span>}
              </div>
              <textarea
                style={ta}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder="여기에 오늘의 글감으로 자유롭게 써보세요. 입력은 날짜별로 자동 저장됩니다."
                spellCheck={false}
              />
              <div style={statRow}>
                <span>{draft.length.toLocaleString()}자 · {(draft.trim() ? draft.trim().split(/\s+/).length : 0).toLocaleString()}단어</span>
                <button className="minibtn" onClick={() => onDraftChange('')} disabled={!draft}><Emoji e="🗑"/> 이 날 글 비우기</button>
              </div>

              <div className="linkbar">
                <span className="linkbar-label">연계:</span>
                <button
                  className="linkbtn"
                  onClick={toProject}
                  disabled={!hasProjectBridge()}
                  title={!hasProjectBridge()
                    ? '프로젝트에 연결되어 있지 않습니다'
                    : (draft.trim() ? '오늘 쓴 글을 프로젝트 초고에 추가' : '글감을 프로젝트 자료에 추가')}
                ><Emoji e="📄"/> {draft.trim() ? '쓴 글 프로젝트에 추가' : '글감 프로젝트에 추가'}</button>
              </div>
            </>
          )}

          <div style={hint}>
            날짜마다 글감이 고정되어 있어 매일 자동으로 바뀝니다. 어제·내일·과거 날짜를 자유롭게 넘겨볼 수 있어요.
            완료를 체크하면 연속일이 쌓입니다.
          </div>
        </>
      ) : (
        <>
          {/* 달력 보기 */}
          <div style={navRow}>
            <button className="minibtn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} title="이전 달">←</button>
            <div style={dateLabelStyle}>{monthCursor.getFullYear()}년 {monthCursor.getMonth() + 1}월</div>
            <button className="minibtn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} title="다음 달">→</button>
          </div>
          <div style={{ ...statRow, justifyContent: 'center', gap: 14 }}>
            <span>✓ 완료 <b style={{ color: 'var(--ok)' }}>{monthStats.done}</b></span>
            <span><Emoji e="✍️"/> 작성 <b style={{ color: 'var(--accent)' }}>{monthStats.written}</b></span>
            <span>/ {monthStats.daysInMonth}일</span>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--warn)' : (i === 6 ? 'var(--accent)' : 'var(--muted)'), padding: '2px 0' }}>{w}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {monthGrid.map((d, i) => {
              if (!d) return <div key={i} />
              const k = dateKey(d)
              const done = !!persist.done[k]
              const written = !!persist.drafts[k]?.trim()
              const isSel = k === selKey
              const isTd = k === todayKey
              const future = d.getTime() > today.getTime()
              return (
                <button
                  key={i}
                  onClick={() => { setSel(startOfDay(d)); setView('day') }}
                  title={`${longLabel(d)}${done ? ' · 완료' : ''}${written ? ' · 작성함' : ''}`}
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    border: `1px solid ${isSel ? 'var(--accent)' : (isTd ? 'var(--accent)' : 'var(--border)')}`,
                    background: done ? 'var(--accent)' : (isSel ? 'var(--chrome-2)' : 'var(--paper)'),
                    color: done ? '#fff' : (future ? 'var(--muted)' : 'var(--text)'),
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    opacity: future ? 0.65 : 1,
                    boxShadow: isTd ? '0 0 0 1px var(--accent) inset' : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isTd ? 800 : 600 }}>{d.getDate()}</span>
                  <span style={{ fontSize: 9, lineHeight: 1, height: 9 }}>
                    {done ? '✓' : (written ? <Emoji e="✍️"/> : '')}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }} />완료</span>
            <span><Emoji e="✍️"/> 글 작성함</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, border: '1px solid var(--accent)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }} />오늘</span>
          </div>
          <div style={hint}>날짜를 누르면 그날의 글감으로 이동합니다. 완료한 날은 색으로, 글을 쓴 날은 <Emoji e="✍️"/>로 표시돼요.</div>
        </>
      )}

      {toast && <div style={toastBox}>✓ {toast}</div>}
    </div>
  )
}
