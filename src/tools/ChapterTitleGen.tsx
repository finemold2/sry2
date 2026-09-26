// 챕터 제목 생성기 — 분위기 × 구조(명사구/의문형/인용형/대비) × 핵심어 슬롯을 조합해
//   챕터 제목 후보를 '대량'으로 뽑아내는 조합형 생성기.
//  · 핵심어 슬롯: 작가가 직접 넣는 단어(인물/장소/사물/감정 등)를 조합에 끼워 넣는다(비우면 자체 풀 사용).
//  · 분위기: 어조 풀을 통째로 바꿔(어둠/따뜻/긴장/서정/미스터리/희망/냉소) 같은 구조라도 결이 달라진다.
//  · 구조: 명사구/의문형/인용형/대비 — 켜고 끄며 원하는 형태만 대량 생성.
//  · 후보 잠금(📌): 마음에 드는 후보는 핀으로 고정 → 재생성해도 살아남는다.
//  · 즐겨찾기(★): 따로 모아 번호 매겨 챕터 차례처럼 관리(localStorage 영속).
//  자급식: 외부 네트워크·라이브러리 없음(Math.random + localStorage)만 사용.
//  연계: 후보를 스니펫 라이브러리에 저장 / 프로젝트 원고('draft') 또는 자료에 챕터 차례로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'chapter-title-gen', name: '챕터 제목 생성기', icon: '📑', group: '영감·발상', intro: '분위기×구조×핵심어를 조합해 챕터 제목 후보를 대량으로 뽑으세요', w: 560, h: 660 }

const LS = 'sry:tool:chapter-title-gen'

// ---------- 분위기(어조) ----------
// 각 분위기는 자체 단어 풀(명사/수식어/현상)을 갖고, 구조 템플릿이 이 풀에서 끌어 쓴다.
interface Mood {
  key: string; label: string; icon: string
  nouns: string[]      // 핵심어가 비었을 때 채워 넣는 명사 풀(분위기색)
  modifiers: string[]  // 명사 앞 수식어
  phenomena: string[]  // 의문/대비용 현상·상태
  quotes: string[]     // 인용형용 짧은 대사·독백
}

const MOODS: Mood[] = [
  {
    key: 'dark', label: '어둠', icon: '🌑',
    nouns: ['재', '그림자', '균열', '늪', '폐허', '독', '낙인', '벼랑', '심연', '잿빛', '뼈', '상흔', '나락', '족쇄', '잔해', '암흑', '비명', '저주'],
    modifiers: ['무너지는', '썩어가는', '메마른', '식어버린', '돌이킬 수 없는', '버려진', '얼어붙은', '검은', '병든', '갈라진', '침묵하는', '저물어 가는'],
    phenomena: ['모든 것이 무너지던 밤', '아무도 돌아오지 않았다', '불씨가 꺼진 뒤', '되돌릴 수 없게 된 순간', '그가 사라진 자리'],
    quotes: ['"이미 늦었어"', '"네 잘못이 아니야"', '"여기서 끝내자"', '"아무도 모를 거야"', '"돌아갈 곳은 없어"'],
  },
  {
    key: 'warm', label: '따뜻', icon: '🌅',
    nouns: ['빛', '품', '온기', '봄볕', '약속', '손길', '집', '저녁상', '담요', '편지', '햇살', '귀갓길', '미소', '온돌', '찻잔', '둥지', '체온', '손편지'],
    modifiers: ['오래된', '나직한', '다정한', '익숙한', '느린', '포근한', '돌아온', '변치 않는', '따스한', '조용한', '정겨운', '머무는'],
    phenomena: ['해가 들던 오후', '문득 안심이 되던 순간', '서로를 알아본 날', '늦게나마 닿은 마음', '돌아온 자리'],
    quotes: ['"괜찮아, 천천히 와"', '"여기 있을게"', '"밥은 먹었니"', '"네가 있어 다행이야"', '"이제 집에 가자"'],
  },
  {
    key: 'tense', label: '긴장', icon: '⚡',
    nouns: ['도화선', '카운트다운', '벼랑끝', '함정', '추격', '경계선', '마지막 패', '방아쇠', '시한', '틈', '거짓말', '신호탄', '교착', '봉쇄선', '데드라인', '인질', '비상벨', '도주로'],
    modifiers: ['피할 수 없는', '한 발 앞선', '소리 없는', '예고된', '들켜버린', '코앞의', '걷잡을 수 없는', '단 한 번의', '숨막히는', '아슬아슬한', '뒤엉킨', '폭발 직전의'],
    phenomena: ['시간이 다 되어 갈 때', '한 발만 어긋나면', '들키기 직전', '문이 닫히기 전에', '되돌릴 5초'],
    quotes: ['"움직이지 마"', '"시간이 없어"', '"누가 먼저인가"', '"이게 마지막 기회야"', '"덫이었어"'],
  },
  {
    key: 'lyric', label: '서정', icon: '🌧️',
    nouns: ['빗소리', '여백', '잔향', '안개', '강물', '계절', '먼 불빛', '오선지', '바람결', '낙엽', '물비늘', '창가', '노을', '서리', '물안개', '달무리', '갈대밭', '눈송이'],
    modifiers: ['스러지는', '아련한', '나부끼는', '잔잔한', '흐릿한', '저무는', '오래 머무는', '번져가는', '나직이 우는', '스며드는', '어른거리는', '여울지는'],
    phenomena: ['비가 그치던 무렵', '말없이 흐른 오후', '계절이 바뀌던 사이', '잔향만 남은 방', '먼 데서 들려온 소리'],
    quotes: ['"기억하고 있어"', '"그때, 비가 왔지"', '"이 노래 기억나?"', '"여긴 그대로네"', '"잘 지냈어?"'],
  },
  {
    key: 'mystery', label: '미스터리', icon: '🔍',
    nouns: ['단서', '봉인된 방', '빈 의자', '두 번째 진실', '사라진 페이지', '거짓 알리바이', '낯선 서명', '풀리지 않는 매듭', '닫힌 문', '되감긴 테이프', '익명의 편지', '엇갈린 증언', '깨진 시계', '지워진 이름', '숨겨진 통로', '마지막 목격자', '뒤바뀐 서류', '잠긴 일기장'],
    modifiers: ['지워진', '맞아떨어지지 않는', '아무도 모르는', '뒤바뀐', '봉인된', '되짚어 본', '엇갈린', '감춰진', '은폐된', '조작된', '되살아난', '수상한'],
    phenomena: ['모든 단서가 가리킨 곳', '증인이 입을 다문 뒤', '거짓이 들통난 순간', '진실이 하나 더 있었다', '마지막 퍼즐 조각'],
    quotes: ['"그날 밤 무슨 일이"', '"그가 거짓말을 했어"', '"여기 한 사람이 더 있었다"', '"누가 알고 있었지?"', '"이건 사고가 아니야"'],
  },
  {
    key: 'hope', label: '희망', icon: '🌱',
    nouns: ['새벽', '첫걸음', '싹', '지평선', '다시', '나침반', '돛', '문턱', '약속의 땅', '두 번째 기회', '불씨', '내일', '여명', '새싹', '이정표', '디딤돌', '날갯짓', '새 길'],
    modifiers: ['새로 트는', '다시 시작되는', '멀지만 분명한', '꺼지지 않는', '처음 내딛는', '되살아난', '향하는', '움트는', '피어나는', '눈부신', '굳건한', '다가오는'],
    phenomena: ['길이 다시 열리던 날', '마침내 닿은 자리', '포기하지 않은 끝에', '첫 빛이 들던 순간', '다시 일어선 아침'],
    quotes: ['"다시 해보자"', '"아직 끝나지 않았어"', '"길이 보여"', '"내일은 달라"', '"포기하지 않을게"'],
  },
  {
    key: 'cynic', label: '냉소', icon: '🃏',
    nouns: ['청구서', '가면', '계약서', '입찰', '체면', '뒷거래', '명함', '연기', '대본', '환상', '간판', '미소', '눈속임', '빈말', '겉치레', '허세', '뒷광고', '거품'],
    modifiers: ['값이 매겨진', '잘 포장된', '닳고 닳은', '능청스러운', '계산된', '뻔뻔한', '그럴듯한', '속 빈', '입에 발린', '번지르르한', '약아빠진', '겉만 화려한'],
    phenomena: ['모두가 알면서 모른 척할 때', '진심은 처음부터 없었다', '박수가 끝난 무대', '계산이 맞아떨어진 순간', '가면이 벗겨진 자리'],
    quotes: ['"세상이 다 그렇지"', '"기대도 안 했어"', '"역시나, 였다"', '"공짜는 없어"', '"웃어, 카메라 돌아간다"'],
  },
]

// ---------- 서사 부제(epic) 공용 슬롯 ----------
// 어떤 분위기와 섞여도 자연스럽게 읽히도록 톤이 중립적인 공용 풀.
// 긴 챕터 부제: "{서수} · {수식어} {명사}에서, {부사} {꼬리구} — {수식어2} {명사2}{향방}"
// 슬롯이 8개 곱해지므로 분위기 풀이 작아도 조합수가 크게 늘어난다.
const ORDINALS: string[] = [
  '제1장', '제2장', '제3장', '제4장', '제5장', '제6장', '제7장', '제8장',
  '제9장', '제10장', '제11장', '제12장', '서장', '종장', '간장', '막간',
  '첫 번째 밤', '두 번째 밤', '세 번째 밤', '마지막 밤', '어느 새벽', '그날 이후', '오랜 뒤', '먼 훗날',
]
const ADVERBS: string[] = [
  '끝내', '마침내', '결국', '문득', '돌연', '서서히', '천천히', '조용히',
  '홀로', '함께', '다시금', '비로소', '여전히', '끝끝내', '기어이', '그제야',
  '하염없이', '묵묵히', '간신히', '거침없이', '머뭇거리며', '뒤늦게',
]
const TAILS: string[] = [
  '돌아오지 못한 채', '길을 잃은 채', '발길을 멈춘 채', '약속을 떠올리며', '이름을 부르며',
  '뒤를 돌아보며', '문을 닫으며', '숨을 고르며', '눈을 감으며', '손을 내밀며',
  '걸음을 옮기며', '진실을 마주하며', '과거를 묻으며', '미래를 그리며', '침묵을 깨며',
  '마음을 다잡으며', '두 손을 모으며', '먼 곳을 바라보며', '발자국을 남기며', '등불을 켜며',
  '매듭을 풀며', '운명을 거스르며', '경계를 넘으며', '한 발 물러서며', '모든 것을 걸며',
  '작별을 고하며', '기억을 더듬으며', '고개를 들며', '닻을 올리며', '실마리를 쥐며',
]
// 향방(後置) 풀. 조사가 앞 명사 받침에 따라 달라지는 항목은 토큰으로 두고 출력 직전에 실제 조사로 치환한다.
//  · {을} → 을/를,  {으로} → 으로/로  (genOne 에서 applyPostp 가 해결)
// 괄호 이중표기("을(를)")는 절대 노출하지 않는다.
const POSTPS: string[] = [
  '{을} 향하여', '의 끝에서', '의 시작점에서', '{을} 지나', '의 경계에서',
  '속으로', '너머로', '아래에서', '곁에서', '한가운데에서',
  '의 그림자 속에', '{을} 품은 채', '에 닿기까지', '{으로} 가는 길', '의 한복판에서',
  '{을} 뒤로하고', '의 문턱에서', '에 머무르며',
]

// 조합수(곱집합) 표시용 — 가장 큰 분위기 풀 기준으로 한 챕터 부제를 만들 때 곱해지는 슬롯 수의 곱.
// epic 구조: ORDINALS × modifiers × nouns × ADVERBS × TAILS × modifiers × (nouns-1) × POSTPS
function epicCombosFor(m: Mood): number {
  return ORDINALS.length * m.modifiers.length * m.nouns.length * ADVERBS.length * TAILS.length * m.modifiers.length * (m.nouns.length - 1) * POSTPS.length
}
const COMBOS = Math.max(...MOODS.map(epicCombosFor))

// ---------- 구조(형태) ----------
type StructKey = 'noun' | 'question' | 'quote' | 'contrast' | 'epic'
interface Struct { key: StructKey; label: string; icon: string; desc: string }
const STRUCTS: Struct[] = [
  { key: 'noun',     label: '명사구', icon: '🏷️', desc: '“검은 균열”처럼 한 덩어리 명사구' },
  { key: 'question', label: '의문형', icon: '❓', desc: '“누가 문을 열었나?” 같은 물음' },
  { key: 'quote',    label: '인용형', icon: '💬', desc: '“돌아갈 곳은 없어” 같은 대사' },
  { key: 'contrast', label: '대비',   icon: '⚖️', desc: '“재 속에서, 피어난 빛” 같은 대비' },
  { key: 'epic',     label: '서사 부제', icon: '📜', desc: '“제3장 · 무너지는 늪에서, 끝내 돌아오지 못한 채 — 검은 심연을 향하여” 같은 긴 부제' },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

interface Candidate { id: string; text: string; struct: StructKey; mood: string }
interface Saved { id: string; text: string }

// 핵심어 슬롯 파싱: 쉼표/줄바꿈/가운뎃점 구분. 비면 빈 배열.
function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,\n·]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40)
}

// 한국어 조사 보정용: 받침 유무로 은/는, 이/가 류 선택(단순·실용판)
function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
const eul = (w: string) => (hasFinalConsonant(w) ? '을' : '를')
const eun = (w: string) => (hasFinalConsonant(w) ? '은' : '는')
const gwa = (w: string) => (hasFinalConsonant(w) ? '과' : '와') // 받침 있으면 '과', 없으면 '와'
// 으로/로: 받침 있으면 '으로', 없거나 'ㄹ' 받침이면 '로'
const euro = (w: string): string => {
  const ch = w.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '로'
  const jong = (code - 0xac00) % 28
  return jong === 0 || jong === 8 ? '로' : '으로' // 8 = 'ㄹ' 받침
}
// 향방(POSTPS) 토큰을 앞 명사 받침에 맞는 실제 조사로 치환. 괄호 이중표기 미노출 보장.
const applyPostp = (postp: string, noun: string): string =>
  postp.replace('{을}', eul(noun)).replace('{으로}', euro(noun))

// 한 구조에 대해 제목 한 줄 생성. kw 가 있으면 핵심어를 끼워 넣고, 없으면 분위기 풀에서 명사를 끌어온다.
function genOne(struct: StructKey, mood: Mood, keywords: string[]): string {
  const kw = keywords.length ? pick(keywords) : ''
  const noun = kw || pick(mood.nouns)
  const mod = pick(mood.modifiers)
  switch (struct) {
    case 'noun': {
      // 수식어 + 명사 / 명사의 명사 / 명사, 그리고 명사
      const r = Math.random()
      if (r < 0.4) return `${mod} ${noun}`
      if (r < 0.7) return `${noun}의 ${pick(mood.nouns)}`
      return `${noun}, 그리고 ${pick(mood.nouns)}`
    }
    case 'question': {
      const r = Math.random()
      if (r < 0.34) return `누가 ${noun}${eul(noun)} 가져갔나?`
      if (r < 0.67) return `${noun}${eun(noun)} 어디로 갔을까?`
      return `${pick(mood.phenomena)}, 무엇이 남았나?`
    }
    case 'quote': {
      // 분위기 대사 풀 + 핵심어 끼운 변주
      if (kw && Math.random() < 0.5) return `"${kw}${eun(kw)} 끝났어"`
      return pick(mood.quotes)
    }
    case 'contrast': {
      // A 속에서, B / A 이지만, B / A 와(과) B 사이
      const a = noun
      const b = pick(mood.nouns.filter((n) => n !== a).length ? mood.nouns.filter((n) => n !== a) : mood.nouns)
      const r = Math.random()
      if (r < 0.4) return `${a} 속에서, ${b}`
      if (r < 0.7) return `${a}${eun(a)} 무너지고, ${b}${eun(b)} 피어난다`
      return `${a}${gwa(a)} ${b} 사이`
    }
    case 'epic': {
      // {서수} · {수식어} {명사}에서, {부사} {꼬리구} — {수식어2} {명사2}{향방}
      const ord = pick(ORDINALS)
      const mod1 = mod
      const n1 = noun
      const adv = pick(ADVERBS)
      const tail = pick(TAILS)
      const mod2 = pick(mood.modifiers)
      const pool2 = mood.nouns.filter((n) => n !== n1)
      const n2 = pick(pool2.length ? pool2 : mood.nouns)
      const postp = applyPostp(pick(POSTPS), n2)
      return `${ord} · ${mod1} ${n1}에서, ${adv} ${tail} — ${mod2} ${n2}${postp}`
    }
  }
}

// 활성 구조·분위기로 후보를 count 개 생성(중복 회피).
function generate(structs: StructKey[], mood: Mood, keywords: string[], count: number): Candidate[] {
  if (!structs.length) return []
  const out: Candidate[] = []
  const seen = new Set<string>()
  let guard = 0
  while (out.length < count && guard < count * 14) {
    guard++
    const s = structs[out.length % structs.length] // 구조를 고르게 순환
    const text = genOne(s, mood, keywords).replace(/\s+/g, ' ').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push({ id: rid(), text, struct: s, mood: mood.key })
  }
  return out
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS + ':saved')
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof x.text === 'string').map((x) => ({ id: typeof x.id === 'string' ? x.id : rid(), text: x.text }))
  } catch { return [] }
}
function loadStr(key: string, fallback: string): string {
  try { const v = localStorage.getItem(LS + ':' + key); return typeof v === 'string' ? v : fallback } catch { return fallback }
}

export default function ChapterTitleGen({ payload }: { payload?: Record<string, unknown> }) {
  // payload 로 시드 핵심어가 들어오면(다른 도구 연계) 핵심어 슬롯 초기값으로
  const seedKw =
    payload && typeof (payload as Record<string, unknown>).keyword === 'string'
      ? String((payload as Record<string, unknown>).keyword).trim()
      : ''

  const [keywordsRaw, setKeywordsRaw] = useState<string>(() => seedKw || loadStr('keywords', ''))
  const [moodKey, setMoodKey] = useState<string>(() => {
    const v = loadStr('mood', 'dark')
    return MOODS.some((m) => m.key === v) ? v : 'dark'
  })
  const [activeStructs, setActiveStructs] = useState<StructKey[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':structs')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          const valid = arr.filter((k: string) => STRUCTS.some((s) => s.key === k)) as StructKey[]
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return ['noun', 'question', 'quote', 'contrast', 'epic']
  })
  const [count, setCount] = useState<number>(() => {
    const n = parseInt(loadStr('count', '18'), 10)
    return Number.isFinite(n) && n >= 6 && n <= 48 ? n : 18
  })

  const [cands, setCands] = useState<Candidate[]>([])
  const [pinned, setPinned] = useState<Record<string, Candidate>>({}) // id → 고정된 후보
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [copiedId, setCopiedId] = useState('')
  const [toast, setToast] = useState('')
  const [genFlash, setGenFlash] = useState(false)

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seededRef = useRef(false)

  const mood = MOODS.find((m) => m.key === moodKey) || MOODS[0]
  const keywords = parseKeywords(keywordsRaw)

  // ── 영속 저장 ──
  useEffect(() => { try { localStorage.setItem(LS + ':keywords', keywordsRaw) } catch { /* ignore */ } }, [keywordsRaw])
  useEffect(() => { try { localStorage.setItem(LS + ':mood', moodKey) } catch { /* ignore */ } }, [moodKey])
  useEffect(() => { try { localStorage.setItem(LS + ':structs', JSON.stringify(activeStructs)) } catch { /* ignore */ } }, [activeStructs])
  useEffect(() => { try { localStorage.setItem(LS + ':count', String(count)) } catch { /* ignore */ } }, [count])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // ── 재생성: 고정된 후보는 살리고 나머지를 새로 채운다 ──
  const regenerate = useCallback(() => {
    setCopiedId('')
    setGenFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => alive.current && setGenFlash(false), 320)

    const pins = Object.values(pinned)
    const need = Math.max(0, count - pins.length)
    const seenText = new Set(pins.map((p) => p.text))
    const fresh = generate(activeStructs, mood, keywords, need + 6).filter((c) => {
      if (seenText.has(c.text)) return false
      seenText.add(c.text)
      return true
    }).slice(0, need)
    // 고정 후보를 앞쪽에, 나머지는 뒤에(고정 표시 안정)
    setCands([...pins, ...fresh])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStructs, moodKey, keywordsRaw, count, pinned])

  // ── 최초 진입 자동 1회 생성(빈 화면 방지) ──
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (activeStructs.length) {
      const init = generate(activeStructs, mood, keywords, count)
      setCands(init)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 언마운트 정리 ──
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  const toggleStruct = (key: StructKey) => {
    setActiveStructs((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      // 표 순서 유지하며 추가
      return STRUCTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const togglePin = (c: Candidate) => {
    setPinned((prev) => {
      const next = { ...prev }
      if (next[c.id]) delete next[c.id]
      else next[c.id] = c
      return next
    })
  }

  // 단일 후보만 다시 굴리기(고정 안 된 후보 한 칸 교체)
  const rerollOne = (id: string) => {
    setCopiedId('')
    setCands((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (idx < 0) return prev
      const existing = new Set(prev.map((c) => c.text))
      // 무작위 구조에서 한 줄 새로(중복 회피)
      let text = ''
      for (let i = 0; i < 14; i++) {
        const s = pick(activeStructs)
        const t = genOne(s, mood, keywords).replace(/\s+/g, ' ').trim()
        if (t && !existing.has(t)) { text = t; break }
      }
      if (!text) return prev
      const next = prev.slice()
      next[idx] = { id: rid(), text, struct: next[idx].struct, mood: mood.key }
      return next
    })
  }

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2000)
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      if (!alive.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1400)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const isSaved = (text: string) => saved.some((s) => s.text === text)
  const saveOne = (text: string) => {
    setSaved((prev) => (prev.some((s) => s.text === text) ? prev : [...prev, { id: rid(), text }]))
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const clearSaved = () => setSaved([])

  const copyAllSaved = () => {
    if (!saved.length) return
    copyText(saved.map((s, i) => `${i + 1}. ${s.text}`).join('\n'), '__allsaved__')
  }

  // ── 연계: 후보/즐겨찾기를 스니펫 라이브러리에 ──
  const snippetOne = (text: string) => {
    addToLibrary('snippets', { text, source: '챕터 제목 생성기', tags: ['챕터제목'] })
    flashToast('스니펫 라이브러리에 저장했습니다.')
  }

  const linked = hasProjectBridge()

  // ── 연계: 즐겨찾기 챕터 차례를 프로젝트에 추가 ──
  // toDraft=true 면 원고('draft') 루트에 각 제목을 빈 챕터 문서들로, false 면 자료('research')에 차례 메모 한 장으로.
  const savedToProject = (toDraft: boolean) => {
    if (!linked || !saved.length) return
    if (toDraft) {
      // 각 제목을 원고 〈챕터 후보〉 폴더 아래 빈 문서로 추가(차례 뼈대)
      let okCount = 0
      saved.forEach((s) => {
        const id = addToProject({
          kind: 'text',
          root: 'draft',
          folder: '챕터 후보',
          title: s.text,
          bodyHtml: '<p></p>',
          icon: '📑',
        })
        if (id) okCount++
      })
      flashToast(okCount ? `원고 〈챕터 후보〉 폴더에 ${okCount}개 챕터를 만들었습니다.` : '프로젝트에 추가하지 못했습니다.')
    } else {
      const bodyHtml =
        `<p>챕터 제목 생성기로 추린 차례 후보입니다.</p>\n<ol>\n` +
        saved.map((s) => `<li>${esc(s.text)}</li>`).join('\n') +
        `\n</ol>`
      const id = addToProject({
        kind: 'text',
        root: 'research',
        folder: '챕터 제목',
        title: `📑 챕터 차례 후보 ${saved.length}건`,
        bodyHtml,
        meta: { 출처: '챕터 제목 생성기', 분위기: mood.label, 후보수: String(saved.length) },
      })
      flashToast(id ? `자료 〈챕터 제목〉 폴더에 차례 ${saved.length}건을 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
    }
  }
  // 단일 후보를 자료 메모로
  const oneToProject = (text: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '챕터 제목',
      title: `📑 ${text}`,
      bodyHtml: `<p style="font-size:15px;"><b>${esc(text)}</b></p><p style="color:#888;font-size:12px;">분위기: ${esc(mood.label)}</p>`,
      meta: { 출처: '챕터 제목 생성기', 분위기: mood.label },
    })
    flashToast(id ? '자료 〈챕터 제목〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const structMeta = (k: StructKey) => STRUCTS.find((s) => s.key === k)!
  const pinnedCount = Object.keys(pinned).length

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const textarea: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 38, fontFamily: 'inherit', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 6 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '20px 8px', fontSize: 13 }
  const savedRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>분위기 × 구조 × 핵심어</b>를 조합해 챕터 제목 후보를 대량으로 뽑습니다. 마음에 드는 후보는 <Emoji e="📌"/>로 고정(재생성에도 유지)하고, ★로 즐겨찾기에 모아 챕터 차례처럼 관리하세요.
        <div style={{ marginTop: 4, color: 'var(--accent)' }}><Emoji e="🧮"/> 서사 부제 하나로만 약 <b>{COMBOS.toLocaleString('ko-KR')}</b>가지 조합</div>
      </div>

      {/* 설정 영역(스크롤 밖, 항상 보임) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 분위기 */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 5 }}><span><Emoji e="🎨"/> 분위기</span></div>
          <div style={chipRow}>
            {MOODS.map((m) => {
              const on = m.key === moodKey
              return (
                <button
                  key={m.key}
                  className="minibtn"
                  onClick={() => setMoodKey(m.key)}
                  aria-pressed={on}
                  style={{ opacity: on ? 1 : 0.55, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
                  title={`${m.label} 분위기`}
                >
                  <Emoji e={m.icon}/> {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 구조 */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 5 }}><span><Emoji e="🧩"/> 구조(형태)</span><span style={{ fontWeight: 400 }}>{activeStructs.length}종 켜짐</span></div>
          <div style={chipRow}>
            {STRUCTS.map((s) => {
              const on = activeStructs.includes(s.key)
              return (
                <button
                  key={s.key}
                  className="minibtn"
                  onClick={() => toggleStruct(s.key)}
                  aria-pressed={on}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
                  title={s.desc}
                >
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>
        </div>

        {/* 핵심어 슬롯 */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 5 }}>
            <span><Emoji e="🔑"/> 핵심어 (선택)</span>
            <span style={{ fontWeight: 400 }}>{keywords.length ? `${keywords.length}개 사용` : '비우면 분위기 단어 사용'}</span>
          </div>
          <textarea
            style={textarea}
            value={keywordsRaw}
            onChange={(e) => setKeywordsRaw(e.target.value)}
            placeholder="인물·장소·사물·감정 등을 쉼표나 줄바꿈으로 (예: 등대, 편지, 안개)"
            rows={2}
          />
        </div>
      </div>

      {/* 후보 영역(스크롤) */}
      <div style={{ ...sectionTitle, alignItems: 'center' }}>
        <span><Emoji e="📑"/> 제목 후보 {cands.length ? `(${cands.length})` : ''}</span>
        <span style={{ fontWeight: 400, display: 'flex', alignItems: 'center', gap: 8 }}>
          {pinnedCount > 0 && <span style={{ color: 'var(--accent)' }}><Emoji e="📌"/> {pinnedCount} 고정</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            개수
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              style={{ background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 4px', fontSize: 11 }}
            >
              {[12, 18, 24, 36, 48].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {!cands.length ? (
          <div style={msg}>구조를 하나 이상 켜고 “제목 뽑기”를 눌러 후보를 만들어 보세요.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {cands.map((c) => {
              const isPinned = !!pinned[c.id]
              const sm = structMeta(c.struct)
              const savedAlready = isSaved(c.text)
              return (
                <div
                  key={c.id}
                  style={{ ...card, borderColor: isPinned ? 'var(--accent)' : 'var(--border)', transition: 'opacity .25s', opacity: genFlash && !isPinned ? 0.45 : 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, flex: 1, overflowWrap: 'anywhere', color: 'var(--text)' }}>{c.text}</span>
                    <button
                      className="minibtn"
                      onClick={() => togglePin(c)}
                      title={isPinned ? '고정 해제' : '이 후보 고정(재생성에도 유지)'}
                      style={{ flexShrink: 0, padding: '2px 6px', borderColor: isPinned ? 'var(--accent)' : 'var(--border)' }}
                      aria-pressed={isPinned}
                    >
                      {isPinned ? <Emoji e="📌"/> : <Emoji e="📍"/>}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}><Emoji e={sm.icon}/> {sm.label}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
                    <button
                      className="minibtn"
                      style={{ color: savedAlready ? 'var(--ok)' : undefined }}
                      onClick={() => saveOne(c.text)}
                      disabled={savedAlready}
                      title={savedAlready ? '이미 즐겨찾기에 있음' : '즐겨찾기에 저장'}
                    >
                      {savedAlready ? '★' : '☆'}
                    </button>
                    <button className="minibtn" onClick={() => copyText(c.text, c.id)} title="제목 복사">{copiedId === c.id ? '✓' : <Emoji e="📋"/>}</button>
                    <button className="minibtn" onClick={() => rerollOne(c.id)} disabled={isPinned} title={isPinned ? '고정된 후보는 굴리지 않음' : '이 칸만 다시 굴리기'}><Emoji e="🎲"/></button>
                    <button className="linkbtn" onClick={() => snippetOne(c.text)} title="스니펫 라이브러리에 저장"><Emoji e="💾"/></button>
                    <button className="linkbtn" onClick={() => oneToProject(c.text)} disabled={!linked} title={linked ? '이 제목을 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 즐겨찾기(챕터 차례) */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 즐겨찾기 — 챕터 차례 {saved.length ? `(${saved.length})` : ''}</span>
            {!!saved.length && (
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={copyAllSaved}>{copiedId === '__allsaved__' ? '✓ 복사됨' : <><Emoji e="📋"/> 차례 복사</>}</button>
                <button className="minibtn" onClick={clearSaved} title="즐겨찾기 비우기"><Emoji e="🗑️"/> 비우기</button>
              </span>
            )}
          </div>
          {!saved.length ? (
            <div style={{ ...msg, padding: '12px 8px' }}>아직 모은 제목이 없습니다. 후보에서 ☆를 눌러 차례를 만들어 보세요.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {saved.map((s, i) => (
                  <div key={s.id} style={savedRow}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere', minWidth: 0 }}>{s.text}</span>
                    <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">↑</button>
                    <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">↓</button>
                    <button className="minibtn" onClick={() => copyText(s.text, s.id)} title="복사">{copiedId === s.id ? '✓' : <Emoji e="📋"/>}</button>
                    <button className="linkbtn" onClick={() => snippetOne(s.text)} title="스니펫 라이브러리에 저장"><Emoji e="💾"/></button>
                    <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                ))}
              </div>
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="linkbtn" onClick={() => savedToProject(false)} disabled={!linked} title={linked ? '차례를 자료 한 장으로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 자료에 차례 추가</button>
                <button className="linkbtn" onClick={() => savedToProject(true)} disabled={!linked} title={linked ? '각 제목을 원고에 빈 챕터 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📝"/> 원고에 빈 챕터로</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 액션 바 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 150 }} onClick={regenerate} disabled={!activeStructs.length}>
          <Emoji e="🎲"/> 제목 뽑기{pinnedCount > 0 ? <> (<Emoji e="📌"/>{pinnedCount} 유지)</> : ''}
        </button>
        <button
          className="minibtn"
          onClick={() => copyText(cands.map((c) => c.text).join('\n'), '__allcands__')}
          disabled={!cands.length}
          title="현재 후보 전체 복사"
        >
          {copiedId === '__allcands__' ? '✓ 복사됨' : <><Emoji e="📋"/> 후보 전체</>}
        </button>
        {pinnedCount > 0 && (
          <button className="minibtn" onClick={() => setPinned({})} title="고정 전부 해제"><Emoji e="📌"/> 전체 해제</button>
        )}
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저작권: 모든 단어·문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 분위기·구조 단어는 이 도구가 자체 작성한 오리지널 풀이며, 외부 저작물을 사용하지 않습니다. 제목은 출발점일 뿐 자유롭게 다듬어 쓰세요.
      </div>
    </div>
  )
}
