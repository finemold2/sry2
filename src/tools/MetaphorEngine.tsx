// 은유 엔진 — 원관념(주제)과 보조관념을 끌어올 의미장(감각/자연/기계…)을 골라
//  신선한 은유·직유 후보를 결정론적으로 생성하고, 각 후보의 진부함(상투성) 점수를 계산해 정렬한다.
//  · 원관념: 직접 입력 / 라이브러리 캐릭터·장소 / 좌측 바인더 문서 드롭 / payload.text 에서 자동 추출
//  · 의미장: 감각·자연·기계·시간·신체·물·빛·전쟁 등 — 각 의미장은 보조관념(이미지) 풀을 갖는다
//  · 형식: 은유(A는 B다) / 직유(A는 B처럼 …) / 의인 / 환유 등 템플릿
//  · 진부함 점수: 사전에 등재된 클리셰 표현 + 의미장 거리(원관념과 너무 가까우면 식상)로 0~100
//  · 스니펫 저장 / 프로젝트 추가 / 수집함 / 관련 도구 열기 연동
// import 는 'react' 와 './linkbus' 만.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash,
  openToolLinked, useLibraryList, getDragItem, isItemDrag,
} from './linkbus'

export const meta = {
  id: 'metaphor-engine',
  name: '은유 엔진',
  icon: '🪄',
  group: '영감·발상',
  intro: '원관념과 의미장을 고르면 신선한 은유·직유 후보를 만들고 진부함을 채점합니다',
  w: 460,
  h: 600,
}

const LS = 'sry:tool:metaphor-engine'

// ──────────────────────────────────────────────────────────────────────────
// 의미장(semantic field): 보조관념(원관념을 비출 거울)의 출처가 되는 이미지 풀.
//  vibe = 의미장의 정서 묶음(원관념의 정서와 너무 겹치면 진부함↑ 신호로 쓴다).
// ──────────────────────────────────────────────────────────────────────────
interface Field { key: string; label: string; vibe: string[]; pool: { word: string; act: string; trait: string }[] }
// act = 그 사물이 하는 동작(의인/직유의 술어로), trait = 그 사물의 속성(직유의 비교점으로)
const FIELDS: Field[] = [
  {
    key: 'nature', label: '자연', vibe: ['고요', '광활', '무심', '순환', '두려움'],
    pool: [
      { word: '빙하', act: '천천히 무너진다', trait: '느리지만 멈추지 않는' },
      { word: '안개', act: '경계를 지운다', trait: '손에 잡히지 않는' },
      { word: '사구', act: '바람 따라 자리를 옮긴다', trait: '형태 없이 흐르는' },
      { word: '협곡', act: '오랜 침묵을 쌓는다', trait: '깊고 메아리치는' },
      { word: '산불', act: '먼저 가장 마른 것을 삼킨다', trait: '걷잡을 수 없는' },
      { word: '이끼', act: '버려진 자리를 덮는다', trait: '조용히 번지는' },
      { word: '조수', act: '하루 두 번 모든 것을 지운다', trait: '되돌아오는' },
      { word: '운석', act: '예고 없이 떨어진다', trait: '하나뿐인 충돌의' },
    ],
  },
  {
    key: 'machine', label: '기계', vibe: ['정밀', '냉정', '반복', '소모', '효율'],
    pool: [
      { word: '톱니바퀴', act: '제 차례에만 돈다', trait: '맞물려야만 의미 있는' },
      { word: '진자', act: '같은 호를 영원히 긋는다', trait: '벗어나지 못하는' },
      { word: '퓨즈', act: '한계에서 스스로 끊는다', trait: '한 번뿐인' },
      { word: '엔진', act: '연료를 태워 앞으로만 간다', trait: '멈추면 식는' },
      { word: '나침반 바늘', act: '한 방향만 가리킨다', trait: '흔들리며 정직한' },
      { word: '서버', act: '과부하에 침묵한다', trait: '과로로 멎는' },
      { word: '태엽', act: '감긴 만큼만 산다', trait: '풀려가는' },
      { word: '회로', act: '끊긴 곳에서 멈춘다', trait: '한 점만 끊겨도 죽는' },
    ],
  },
  {
    key: 'sense', label: '감각', vibe: ['예민', '잔상', '통증', '쾌락', '기억'],
    pool: [
      { word: '잔향', act: '소리가 끝난 뒤에도 남는다', trait: '사라지며 머무는' },
      { word: '잔상', act: '눈을 감아도 어른거린다', trait: '지워지지 않는' },
      { word: '쓴맛', act: '혀끝에 오래 붙는다', trait: '뒤늦게 번지는' },
      { word: '소름', act: '말보다 먼저 피부에 온다', trait: '의지를 앞서는' },
      { word: '향', act: '문을 열기도 전에 알린다', trait: '먼저 도착하는' },
      { word: '간지럼', act: '참으려 할수록 커진다', trait: '억누를수록 번지는' },
      { word: '귀울림', act: '조용할 때만 들린다', trait: '고요 속에서 커지는' },
      { word: '체온', act: '닿은 자리만큼만 전해진다', trait: '거리에 따라 식는' },
    ],
  },
  {
    key: 'water', label: '물', vibe: ['흐름', '깊이', '잠식', '투명', '무게'],
    pool: [
      { word: '소용돌이', act: '가까운 것부터 끌어내린다', trait: '저항할수록 빨려드는' },
      { word: '결빙', act: '천천히 단단해진다', trait: '식으며 굳는' },
      { word: '범람', act: '둑을 넘는 순간 전부를 적신다', trait: '한 번 넘치면 못 거두는' },
      { word: '수면', act: '아래를 비추지 않는다', trait: '겉만 보이는' },
      { word: '낙수', act: '같은 자리를 오래 두드린다', trait: '약해도 뚫는' },
      { word: '해무', act: '뱃길을 통째로 지운다', trait: '방향을 삼키는' },
      { word: '여울', act: '얕은 곳에서 더 크게 운다', trait: '얕을수록 소란한' },
      { word: '심해', act: '빛을 끝까지 내려보내지 않는다', trait: '닿지 못할 만큼 깊은' },
    ],
  },
  {
    key: 'light', label: '빛·어둠', vibe: ['희망', '폭로', '소실', '잔불', '대비'],
    pool: [
      { word: '잔불', act: '재 밑에서 끝까지 버틴다', trait: '꺼진 듯 살아 있는' },
      { word: '일식', act: '한낮을 잠시 거둬간다', trait: '예정된 어둠의' },
      { word: '등댓불', act: '먼 곳을 위해 제자리를 지킨다', trait: '돌아오는 이를 위한' },
      { word: '그림자', act: '주인이 움직일 때만 길어진다', trait: '본체에 묶인' },
      { word: '명멸', act: '꺼질 듯 다시 켜진다', trait: '불안하게 깜빡이는' },
      { word: '여명', act: '어둠의 끝을 먼저 묻힌다', trait: '천천히 번지는' },
      { word: '신기루', act: '다가갈수록 물러난다', trait: '닿으면 없는' },
      { word: '잔광', act: '해가 진 뒤에도 하늘에 남는다', trait: '주인을 잃고도 남는' },
    ],
  },
  {
    key: 'time', label: '시간', vibe: ['소멸', '축적', '반복', '망각', '되돌림'],
    pool: [
      { word: '모래시계', act: '한쪽을 비우며 다른 쪽을 채운다', trait: '잃는 만큼 쌓이는' },
      { word: '연륜', act: '베어낸 뒤에야 드러난다', trait: '끝에서야 읽히는' },
      { word: '메아리', act: '뒤늦게 같은 말을 돌려준다', trait: '시차를 두고 돌아오는' },
      { word: '재', act: '불이 한 일을 마지막에 증언한다', trait: '뒤에 남는' },
      { word: '풍화', act: '눈에 안 띄게 모서리를 깎는다', trait: '천천히 닳는' },
      { word: '유통기한', act: '소리 없이 다가온다', trait: '정해진 끝을 가진' },
      { word: '계절', act: '같은 자리를 다른 빛으로 돈다', trait: '돌아오되 같지 않은' },
      { word: '화석', act: '사라진 것의 모양만 남긴다', trait: '부재를 새긴' },
    ],
  },
  {
    key: 'body', label: '신체', vibe: ['통증', '본능', '취약', '치유', '흔적'],
    pool: [
      { word: '흉터', act: '아문 뒤에도 자리를 알린다', trait: '나았으나 남은' },
      { word: '맥박', act: '의식하지 않아도 뛴다', trait: '멈추면 끝인' },
      { word: '굳은살', act: '닿을수록 두꺼워진다', trait: '아픔이 만든' },
      { word: '환상통', act: '없는 것이 아프다', trait: '부재가 아픈' },
      { word: '경련', act: '의지와 무관하게 떨린다', trait: '다스려지지 않는' },
      { word: '숨', act: '참을수록 절실해진다', trait: '없어 봐야 아는' },
      { word: '딱지', act: '뜯으면 다시 덧난다', trait: '건드리면 도지는' },
      { word: '체취', act: '본인만 모른다', trait: '제게만 안 보이는' },
    ],
  },
  {
    key: 'war', label: '전쟁·갈등', vibe: ['긴장', '경계', '소진', '전략', '상실'],
    pool: [
      { word: '참호', act: '나아가지도 물러나지도 못한다', trait: '교착된' },
      { word: '지뢰', act: '밟히기 전엔 조용하다', trait: '건드리면 터지는' },
      { word: '휴전선', act: '평화처럼 보이게 긴장을 얼린다', trait: '잠시 멈춘' },
      { word: '봉화', act: '먼저 본 자가 다음에게 옮긴다', trait: '연쇄로 번지는' },
      { word: '방패', act: '지키려는 만큼 무거워진다', trait: '버틸수록 짓누르는' },
      { word: '백기', act: '말보다 먼저 끝을 알린다', trait: '항복을 대신하는' },
      { word: '매복', act: '가장 안전해 보일 때 친다', trait: '방심을 노리는' },
      { word: '소모전', act: '이겨도 남는 게 적다', trait: '얻은 만큼 잃는' },
    ],
  },
  {
    key: 'home', label: '집·일상', vibe: ['안온', '권태', '습관', '균열', '온기'],
    pool: [
      { word: '문지방', act: '안과 밖을 가른다', trait: '경계를 짓는' },
      { word: '곰팡이', act: '보이지 않는 데서 번진다', trait: '눅눅한 데 자라는' },
      { word: '먼지', act: '치워도 다시 내려앉는다', trait: '끝없이 돌아오는' },
      { word: '식은 밥', act: '온기를 잃고도 자리에 남는다', trait: '데워야 다시 사는' },
      { word: '경첩', act: '소리 내며 같은 길을 연다', trait: '닳으며 삐걱이는' },
      { word: '벽지', act: '오래될수록 색을 잃는다', trait: '바래는' },
      { word: '수챗구멍', act: '말없이 모든 것을 삼킨다', trait: '소리 없이 빠지는' },
      { word: '창틈', act: '작아도 바람을 통과시킨다', trait: '틈만 있으면 새는' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────
// 진부함(클리셰) 사전: 흔히 닳은 비유 짝/표현. 매칭되면 점수 가산.
//  키워드(원관념 또는 보조관념)와 함께 등장하면 상투적으로 본다.
// ──────────────────────────────────────────────────────────────────────────
const CLICHE_PHRASES: { tenor: string[]; vehicle: string[]; why: string }[] = [
  { tenor: ['사랑', '마음', '연애'], vehicle: ['불', '불꽃', '불길'], why: '"사랑은 불"은 가장 닳은 비유 중 하나' },
  { tenor: ['인생', '삶', '생'], vehicle: ['여행', '길', '여정', '항해'], why: '"인생은 여정"은 상투적' },
  { tenor: ['시간', '세월'], vehicle: ['강', '물', '화살'], why: '"시간은 흐르는 강/쏜살"은 진부' },
  { tenor: ['눈', '눈동자'], vehicle: ['별', '보석', '호수'], why: '"눈은 별/호수"는 흔한 표현' },
  { tenor: ['마음', '가슴'], vehicle: ['바다', '대양'], why: '"마음은 바다"는 식상' },
  { tenor: ['희망', '꿈'], vehicle: ['빛', '등불', '별'], why: '"희망은 빛"은 닳은 짝' },
  { tenor: ['분노', '화'], vehicle: ['불', '화산', '폭발'], why: '"분노는 화산/폭발"은 상투' },
  { tenor: ['시련', '고난'], vehicle: ['파도', '폭풍', '비바람'], why: '"시련은 폭풍/파도"는 진부' },
  { tenor: ['웃음', '미소'], vehicle: ['꽃', '햇살'], why: '"미소는 꽃/햇살"은 흔함' },
]
// 닳은 술어/수식(어떤 원관념이든 붙으면 식상)
const FLAT_WORDS = ['아름답다', '따뜻하다', '눈부시다', '활짝', '반짝', '환하게', '포근', '찬란']

// ──────────────────────────────────────────────────────────────────────────
// 형식(form) 템플릿. tenor=원관념, v=보조관념 레코드.
// ──────────────────────────────────────────────────────────────────────────
type FormKey = 'metaphor' | 'simile' | 'person' | 'fresh'
const FORMS: { key: FormKey; label: string; make: (t: string, v: { word: string; act: string; trait: string }) => string }[] = [
  { key: 'metaphor', label: '은유', make: (t, v) => `${t}은(는) 한 채의 ${v.word}다 — ${v.trait}.` },
  { key: 'simile', label: '직유', make: (t, v) => `${t}은(는) ${v.trait} ${v.word}처럼, ${v.act}.` },
  { key: 'person', label: '의인', make: (t, v) => `${t}은(는) ${v.act} ${v.word}였다.` },
  { key: 'fresh', label: '낯섦', make: (t, v) => `누구도 말하지 않았지만, ${t}에는 ${v.word}의 ${v.trait} 얼굴이 있다.` },
]

// ──────────────────────────────────────────────────────────────────────────
// 결정론적 해시·의사난수(시드=문자열). 같은 입력 → 같은 결과.
// ──────────────────────────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rng(seed: number) {
  let x = seed || 1
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 }
}

interface Candidate {
  id: string
  form: FormKey
  formLabel: string
  field: string
  fieldLabel: string
  vehicle: string
  text: string
  freshness: number   // 0~100 (높을수록 신선)
  reasons: string[]
}

// 한 후보의 진부함→신선함 점수 계산.
function scoreFreshness(tenor: string, v: { word: string; act: string; trait: string }, field: Field, form: FormKey): { freshness: number; reasons: string[] } {
  let penalty = 0
  const reasons: string[] = []
  const lt = tenor.replace(/\s/g, '')
  // 1) 클리셰 사전 매칭
  for (const c of CLICHE_PHRASES) {
    const tHit = c.tenor.some((k) => lt.includes(k) || k.includes(lt))
    const vHit = c.vehicle.some((k) => v.word.includes(k) || k.includes(v.word))
    if (tHit && vHit) { penalty += 55; reasons.push('상투적 짝: ' + c.why) }
    else if (vHit && lt.length > 0) { penalty += 12; reasons.push('보조관념 "' + v.word + '"은(는) 비유에 흔히 쓰임') }
  }
  // 2) 평면적 수식어
  for (const f of FLAT_WORDS) {
    if (v.trait.includes(f) || v.act.includes(f)) { penalty += 10; reasons.push('수식 "' + f + '"은(는) 식상') }
  }
  // 3) 글자 겹침(원관념과 보조관념이 음절을 공유하면 의외성↓)
  const overlap = [...new Set(lt.split(''))].filter((ch) => v.word.includes(ch)).length
  if (overlap >= 2) { penalty += 8; reasons.push('원관념과 글자가 겹쳐 의외성 낮음') }
  // 4) 형식 보정: 낯섦/의인 형식은 신선도에 약간 가산(구조적 거리)
  if (form === 'fresh') penalty -= 8
  if (form === 'person') penalty -= 4
  // 5) 길이(너무 짧은 보조관념은 평범)
  if (v.word.length <= 1) penalty += 6
  let fresh = Math.max(2, Math.min(98, 100 - penalty))
  if (reasons.length === 0) reasons.push('사전에 등재된 상투 표현과 겹치지 않음 — 신선한 짝')
  return { freshness: Math.round(fresh), reasons }
}

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// payload/문서 텍스트에서 원관념 후보(짧은 추상 명사) 뽑기: 가장 자주 나오는 2~6자 한글 단어.
function guessTenor(text: string): string {
  const words = (text.match(/[가-힣]{2,6}/g) || [])
  if (!words.length) return ''
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
}

export default function MetaphorEngine({ payload }: { payload?: Record<string, unknown> }) {
  const [tenor, setTenor] = useState('')
  const [selFields, setSelFields] = useState<string[]>(['nature', 'machine', 'sense'])
  const [selForms, setSelForms] = useState<FormKey[]>(['metaphor', 'simile', 'person', 'fresh'])
  const [minFresh, setMinFresh] = useState(0)     // 진부함 필터(이 점수 미만은 숨김)
  const [seedBump, setSeedBump] = useState(0)     // 다시 생성(변주)
  const [dragOver, setDragOver] = useState(false)
  const [picked, setPicked] = useState<Record<string, boolean>>({})  // 즐겨찾기한 후보 id
  const [toast, setToast] = useState('')

  const characters = useLibraryList('characters')
  const places = useLibraryList('places')

  const toastTimer = useRef<number | null>(null)
  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1900)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 복원 (마운트 1회 — payload 와 분리)
  const restored = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Partial<{ tenor: string; selFields: string[]; selForms: FormKey[]; minFresh: number; picked: Record<string, boolean> }>
        if (typeof s.tenor === 'string') setTenor(s.tenor)
        if (Array.isArray(s.selFields) && s.selFields.length) setSelFields(s.selFields.filter((k) => FIELDS.some((f) => f.key === k)))
        if (Array.isArray(s.selForms) && s.selForms.length) setSelForms(s.selForms.filter((k) => FORMS.some((f) => f.key === k)) as FormKey[])
        if (typeof s.minFresh === 'number') setMinFresh(s.minFresh)
        if (s.picked && typeof s.picked === 'object') setPicked(s.picked)
      }
    } catch { /* ignore */ }
    restored.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // payload 수용: text → 원관념 추출, word/tenor → 직접. 같은 payload 재수신은 참조 비교로 차단.
  const consumedPayload = useRef<Record<string, unknown> | null>(null)
  useEffect(() => {
    if (!payload) return
    if (consumedPayload.current === payload) return
    consumedPayload.current = payload
    if (typeof payload['tenor'] === 'string' && payload['tenor']) setTenor(payload['tenor'] as string)
    else if (typeof payload['word'] === 'string' && payload['word']) setTenor(payload['word'] as string)
    else if (typeof payload['text'] === 'string' && payload['text']) {
      const g = guessTenor(payload['text'] as string)
      if (g) setTenor(g)
    }
  }, [payload])

  useEffect(() => {
    if (!restored.current) return
    try { localStorage.setItem(LS, JSON.stringify({ tenor, selFields, selForms, minFresh, picked })) } catch { /* noop */ }
  }, [tenor, selFields, selForms, minFresh, picked])

  // 좌측 바인더 문서 드롭 → 원관념 자동 추출
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const src = (item.text && item.text.trim()) ? item.text : (item.title || '')
    const g = guessTenor(src) || item.title || ''
    if (g) { setTenor(g); flash('문서에서 원관념 "' + g + '"을(를) 가져왔습니다.') }
  }

  const toggle = <T extends string>(arr: T[], set: (v: T[]) => void, key: T) => {
    set(arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key])
  }

  // ── 후보 생성(결정론적) ──────────────────────────────────────────────
  const candidates = useMemo<Candidate[]>(() => {
    const t = tenor.trim()
    if (!t) return []
    const fields = FIELDS.filter((f) => selFields.includes(f.key))
    if (!fields.length || !selForms.length) return []
    const out: Candidate[] = []
    const seen = new Set<string>()
    for (const field of fields) {
      // 시드: 원관념+의미장+변주카운터 → 보조관념 풀을 섞어 일부 선택
      const r = rng(hash(t + '|' + field.key + '|' + seedBump))
      const pool = [...field.pool].sort(() => r() - 0.5).slice(0, 4) // 의미장마다 4개
      for (const v of pool) {
        for (const fm of FORMS) {
          if (!selForms.includes(fm.key)) continue
          const text = fm.make(t, v)
          if (seen.has(text)) continue
          seen.add(text)
          const sc = scoreFreshness(t, v, field, fm.key)
          out.push({
            id: field.key + ':' + v.word + ':' + fm.key,
            form: fm.key, formLabel: fm.label,
            field: field.key, fieldLabel: field.label,
            vehicle: v.word, text,
            freshness: sc.freshness, reasons: sc.reasons,
          })
        }
      }
    }
    // 신선도 높은 순
    out.sort((a, b) => b.freshness - a.freshness || a.text.localeCompare(b.text))
    return out
  }, [tenor, selFields, selForms, seedBump])

  const shown = candidates.filter((c) => c.freshness >= minFresh)
  const avg = candidates.length ? Math.round(candidates.reduce((s, c) => s + c.freshness, 0) / candidates.length) : 0

  // ── 산출물 텍스트 ──
  const candText = (c: Candidate) => c.text
  const allText = () => {
    const lines = [`[은유 엔진] 원관념: ${tenor}`, '']
    for (const c of shown) lines.push(`(${c.formLabel}·${c.fieldLabel}·신선도${c.freshness}) ${c.text}`)
    return lines.join('\n')
  }
  const favText = () => {
    const favs = candidates.filter((c) => picked[c.id])
    if (!favs.length) return ''
    return [`[은유 엔진] 원관념: ${tenor} — 고른 비유`, '', ...favs.map((c) => `· ${c.text}`)].join('\n')
  }

  // ── 액션 ──
  const copyOne = (c: Candidate) => {
    navigator.clipboard?.writeText(candText(c)).then(() => flash('복사했습니다.')).catch(() => {})
  }
  const snippetOne = (c: Candidate) => {
    addToLibrary('snippets', { text: c.text, source: '은유 엔진', tags: ['은유', '비유', tenor, c.fieldLabel] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }
  const stashOne = (c: Candidate) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'memo', label: `은유: ${tenor}`, text: c.text })
    flash('수집함에 담았습니다.')
  }
  const togglePick = (c: Candidate) => setPicked((p) => ({ ...p, [c.id]: !p[c.id] }))

  const saveAllSnippet = () => {
    if (!shown.length) return
    addToLibrary('snippets', { text: allText(), source: '은유 엔진', tags: ['은유', '비유', tenor] })
    flash(`표시된 ${shown.length}개를 한 스니펫으로 저장했습니다.`)
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const favs = candidates.filter((c) => picked[c.id])
    const list = favs.length ? favs : shown
    if (!list.length) return
    const rows = list.map((c) =>
      `<li style="margin:4px 0;"><b>${escapeHtml(c.text)}</b><br/><span style="font-size:12px;color:#888;">${c.formLabel} · ${c.fieldLabel} · 신선도 ${c.freshness}</span></li>`,
    ).join('')
    const bodyHtml = `<p><b>원관념:</b> ${escapeHtml(tenor)}</p><ul style="padding-left:18px;">${rows}</ul>`
    const id = addToProject({ kind: 'text', root: 'research', folder: '비유 노트', title: `비유: ${tenor}`, bodyHtml })
    flash(id ? '프로젝트 자료 〈비유 노트〉에 추가했습니다.' : '추가하지 못했습니다.')
  }
  const copyFav = () => {
    const t = favText()
    if (!t) { flash('별표로 고른 비유가 없습니다.'); return }
    navigator.clipboard?.writeText(t).then(() => flash('고른 비유를 복사했습니다.')).catch(() => {})
  }
  // 관련 도구로 보내기: 신선한 후보의 보조관념을 상징 사전으로
  const openSymbol = (c: Candidate) => openToolLinked('symbolism-dict', { word: c.vehicle, query: c.vehicle })
  const openSensory = () => openToolLinked('sensory-palette', { word: tenor })

  // ── 라이브러리에서 원관념 끌어오기 ──
  const tenorChips = useMemo(() => {
    const out: { label: string; value: string }[] = []
    for (const c of characters.slice(0, 6)) if (c.name) out.push({ label: '인물·' + c.name, value: c.name })
    for (const p of places.slice(0, 6)) if (p.name) out.push({ label: '장소·' + p.name, value: p.name })
    return out
  }, [characters, places])

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 13, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const chip = (on: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 9px', borderRadius: 999, cursor: 'pointer', userSelect: 'none',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'var(--accent)' : 'transparent',
    color: on ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const freshColor = (n: number) => n >= 75 ? '#3aa757' : n >= 50 ? '#c79a2e' : '#cc5b5b'

  const favCount = candidates.filter((c) => picked[c.id]).length

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={hint}>
        <b>원관념</b>(빗댈 대상)과 <b>의미장</b>(보조관념을 끌어올 영역)을 고르면, 신선한 비유 후보를 만들고
        <b> 진부함</b>을 채점합니다. 좌측 문서를 끌어다 놓거나 라이브러리 항목을 눌러 원관념을 채울 수 있어요.
      </div>

      {/* 원관념 입력 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={tenor}
          onChange={(e) => setTenor(e.target.value)}
          placeholder="원관념 — 예: 그리움 / 권력 / 그녀의 침묵"
          style={inputStyle}
        />
        <button className="minibtn" onClick={() => setSeedBump((n) => n + 1)} title="같은 설정으로 다른 보조관념 변주" disabled={!tenor.trim()}>변주</button>
      </div>

      {/* 라이브러리 칩 */}
      {tenorChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <span style={{ ...hint, alignSelf: 'center' }}>가져오기:</span>
          {tenorChips.map((c) => (
            <span key={c.label} style={chip(tenor === c.value)} onClick={() => setTenor(c.value)}>{c.label}</span>
          ))}
        </div>
      )}

      {/* 의미장 선택 */}
      <div>
        <div style={{ ...hint, marginBottom: 4 }}>의미장(보조관념 출처) — 멀리 떨어진 영역을 고를수록 의외성이 큽니다.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {FIELDS.map((f) => (
            <span key={f.key} style={chip(selFields.includes(f.key))} onClick={() => toggle(selFields, setSelFields, f.key)}>{f.label}</span>
          ))}
        </div>
      </div>

      {/* 형식 + 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        {FORMS.map((f) => (
          <span key={f.key} style={chip(selForms.includes(f.key))} onClick={() => toggle(selForms, setSelForms, f.key)}>{f.label}</span>
        ))}
        <span style={{ ...hint, marginLeft: 'auto' }}>진부함 거름 ≥ {minFresh}</span>
        <input type="range" min={0} max={90} step={5} value={minFresh} onChange={(e) => setMinFresh(Number(e.target.value))} style={{ width: 96 }} />
      </div>

      {/* 요약 바 */}
      {candidates.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
          <span>후보 <b style={{ color: 'var(--text)' }}>{shown.length}</b>/{candidates.length}</span>
          <span>평균 신선도 <b style={{ color: freshColor(avg) }}>{avg}</b></span>
          {favCount > 0 && <span>별표 <b style={{ color: 'var(--text)' }}>{favCount}</b></span>}
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={saveAllSnippet} disabled={!shown.length}>전체 스니펫</button>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || !shown.length} title={hasProjectBridge() ? '별표한 비유(없으면 표시된 전체)를 프로젝트 자료에 추가' : '프로젝트 미연결'}>프로젝트</button>
        </div>
      )}

      {/* 결과 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {!tenor.trim() && (
          <div style={{ ...hint, textAlign: 'center', padding: '24px 8px', border: '1px dashed var(--border)', borderRadius: 10 }}>
            원관념을 입력하면 비유 후보가 나타납니다. (좌측 문서 드롭 또는 라이브러리 인물·장소 가져오기 지원)
          </div>
        )}
        {tenor.trim() && shown.length === 0 && (
          <div style={{ ...hint, textAlign: 'center', padding: 18 }}>
            조건에 맞는 후보가 없습니다. 의미장/형식을 더 켜거나 진부함 거름을 낮춰 보세요.
          </div>
        )}
        {shown.map((c) => {
          const fav = !!picked[c.id]
          return (
            <div key={c.id} style={{ background: 'var(--panel)', border: '1px solid ' + (fav ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '9px 11px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flexShrink: 0, width: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: freshColor(c.freshness), lineHeight: 1 }}>{c.freshness}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>신선도</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.55, wordBreak: 'keep-all' }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {c.formLabel} · {c.fieldLabel} · 보조관념 {c.vehicle}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>
                    {c.reasons[0]}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => togglePick(c)} title="별표(프로젝트·복사 대상으로 모음)">{fav ? '★ 고름' : '☆ 별표'}</button>
                <button className="minibtn" onClick={() => copyOne(c)}>복사</button>
                <button className="minibtn" onClick={() => snippetOne(c)} title="공유 스니펫 라이브러리에 저장">스니펫</button>
                {hasStash() && <button className="minibtn" onClick={() => stashOne(c)}>수집함</button>}
                <button className="linkbtn" onClick={() => openSymbol(c)} title={'"' + c.vehicle + '"을(를) 상징 사전에서 더 파보기'}>상징사전</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 연계 */}
      {tenor.trim() && (
        <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <button className="linkbtn" onClick={copyFav} disabled={favCount === 0}>고른 비유 복사</button>
          <button className="linkbtn" onClick={openSensory} title="원관념의 감각 묘사를 감각 팔레트로 확장">감각 팔레트</button>
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div className="license-note">
        보조관념·의미장·진부함 사전은 자체 제작(자유 사용). 전부 브라우저 로컬 계산 — 외부 전송 없음. 같은 입력은 같은 결과(결정론적), 〈변주〉로 다른 짝을 얻습니다.
      </div>
    </div>
  )
}
