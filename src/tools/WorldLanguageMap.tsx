// 언어 지도 (세계관) — 세계관 속 지역별 방언·존대 체계·관용구 분포를 설계하고,
//  인물의 출신/계층에 맞춰 실제 말투 가이드(어미·인칭·금기·관용구)를 자동 생성하는 대형 인터랙티브 도구.
//  3개 작업면:
//   1) 지역(방언권) 설계 — 지역마다 모음 변형/어미/존대 단계/특징 자음 규칙을 슬라이더·선택으로 설정.
//   2) 존대 체계 매트릭스 — 화자 계층 × 청자 계층 격자에 어미/호칭을 채워 사회적 말투 규칙을 한눈에.
//   3) 인물 말투 카드 — places(출신지)·characters(인물) 라이브러리와 연동해 한 인물의 말투 가이드를
//      결정론적으로 합성(시드=인물명+지역). 같은 입력엔 같은 결과.
//  관용구 은행: 지역×주제별 관용구를 결정론적으로 조합(조합수 표시), 잠금/재생성, 클릭 복사.
//  드롭/페이로드: 좌측 바인더 인물 문서를 드롭하면 인물명/출신을 흡수. payload.name/region 수용.
//  연계: useLibraryList('places'|'characters') 수용, addToLibrary('characters'|'snippets') 산출,
//        addToProject(setting/character) · addToStash · openToolLinked('setting-bible'|'character-sheet').
//  저장: localStorage('sry:tool:world-language-map') JSON 자동 저장/복원.
//  import 는 react 와 './linkbus' 만 사용.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  useLibraryList, addToLibrary, addToProject, hasProjectBridge,
  addToStash, hasStash, openToolLinked, getDragItem, isItemDrag,
  type SharedPlace, type SharedCharacter, type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'world-language-map',
  name: '언어 지도',
  icon: '🗨️',
  group: '세계관',
  intro: '지역별 방언·존대 체계·관용구 분포를 설계하고 인물 출신에 맞춰 말투 가이드를 합성',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:world-language-map'

// ───────────────────────── 결정론적 의사난수(시드=문자열 해시) ─────────────────────────
function hash32(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
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
function rngFrom(s: string) { return mulberry(hash32(s || 'seed')) }
function pickSeed<T>(arr: readonly T[], r: () => number): T { return arr[Math.floor(r() * arr.length) % arr.length] }
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function fmtBig(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(2).replace(/\.?0+$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString('ko-KR')
}

// ───────────────────────── 설계 자원(전부 로컬 상수) ─────────────────────────
// 어미 톤(말끝) — 지역색의 핵심
const ENDING_TONES = [
  { v: '표준 평탄', endings: ['-요', '-습니다', '-어', '-지'], color: '#6b7cff' },
  { v: '느릿·둥근', endings: ['-여', '-유', '-당께', '-그려'], color: '#3fb98a' },
  { v: '딱딱·각진', endings: ['-다', '-소', '-오', '-게'], color: '#c98b3f' },
  { v: '거칠·억센', endings: ['-노', '-카노', '-나', '-데이'], color: '#d05f6a' },
  { v: '노래하듯', endings: ['-라예', '-하영', '-우꽈', '-마씸'], color: '#9b6bff' },
  { v: '옛스럽', endings: ['-하오', '-이외다', '-나이다', '-거늘'], color: '#7a6a55' },
]
// 모음 색채(방언권 모음 변형 성향)
const VOWEL_SHIFTS = [
  { v: '변형 없음(표준)', note: '교과서적 발음' },
  { v: 'ㅓ→ㅡ 약화', note: '"없다"가 "읎다"처럼' },
  { v: 'ㅗ→ㅜ 상승', note: '"오리"가 "우리"처럼' },
  { v: 'ㅔ/ㅐ 합류', note: '"네/내"를 구분 안 함' },
  { v: '단모음화', note: '이중모음을 단순하게' },
  { v: '장음 보존', note: '긴 소리를 또렷이 살림' },
]
// 특징 자음 규칙
const CONSONANT_RULES = [
  { v: '경음화 강함', note: '"가게"→"까게"처럼 된소리' },
  { v: 'ㅈ구개음화', note: '"기름"→"지름"처럼' },
  { v: '두음 보존', note: '"리유","녀자"처럼 첫소리 유지' },
  { v: 'ㅎ 탈락', note: '"형님"→"엉님"' },
  { v: '변화 미미', note: '표준에 가까움' },
]
// 호칭 성향
const ADDRESS_STYLES = [
  '직책+님 (대장님, 의원님)',
  '관계어 위주 (성님, 누님, 아재)',
  '이름+씨 (현우 씨)',
  '존칭 회피·반말 우세',
  '경어 과잉·이중 높임',
]
// 존대 단계(매트릭스 셀의 후보)
const RESPECT_LEVELS = [
  { key: 'hae', label: '해체(반말)', sample: '왔어?' },
  { key: 'haeyo', label: '해요체', sample: '왔어요?' },
  { key: 'hao', label: '하오체', sample: '왔소?' },
  { key: 'hage', label: '하게체', sample: '왔는가?' },
  { key: 'hara', label: '해라체', sample: '왔느냐?' },
  { key: 'hasipsio', label: '하십시오체', sample: '오셨습니까?' },
]
// 화자/청자 계층(매트릭스 축)
const RANKS = ['통치/귀족', '관료/사제', '상인/장인', '평민/농민', '병사/하인', '이방인']
// 관용구 조합 슬롯(지역×주제) — 결정론적 조합
const IDIOM_TOPICS = ['날씨/계절', '돈/거래', '용기/싸움', '사랑/연정', '죽음/운명', '음식/배고픔', '거짓/속임', '시간/기다림', '명예/이름', '믿음/배신']
// 정경 도입구(독립적 배경 — 다른 슬롯을 전제하지 않음). "…에" 로 끝나 절을 자연스럽게 연다.
const IDIOM_SCENE = [
  '바람 부는 들에', '비 오는 저잣거리에', '눈 덮인 고개에', '달 밝은 강가에',
  '안개 낀 새벽에', '불 꺼진 화로에', '메마른 우물가에', '북적이는 나루터에',
]
// 정도·태도 부사(독립 수식어). 절의 동사를 자연스럽게 꾸민다.
const IDIOM_ADV = ['끝내', '서서히', '소리 없이', '거침없이', '기어이', '대뜸', '슬그머니']
const IDIOM_IMG = [
  '바람', '소금', '쇠', '강물', '잿더미', '보리', '안개', '돌',
  '불씨', '그림자', '서리', '뿌리', '낫', '등불', '거미줄', '파도',
  '이슬', '모래', '연기', '쇠사슬', '갈대', '진흙', '천둥', '씨앗',
]
// 행위: [연결형(…고), 종결형(…ㄴ다/는다)] — 한국어 어법에 맞춰 두 형태를 명시(자동 변형으로 인한 비문 방지)
const IDIOM_ACT: ReadonlyArray<readonly [string, string]> = [
  ['갈라지고', '갈라진다'], ['삼켜지고', '삼켜진다'], ['녹고', '녹는다'], ['쌓이고', '쌓인다'],
  ['벼려지고', '벼려진다'], ['마르고', '마른다'], ['기울고', '기운다'], ['흩어지고', '흩어진다'],
  ['가라앉고', '가라앉는다'], ['피어나고', '피어난다'], ['얼어붙고', '얼어붙는다'], ['갉히고', '갉힌다'],
  ['굳고', '굳는다'], ['번지고', '번진다'], ['스러지고', '스러진다'], ['깊어지고', '깊어진다'],
  ['뒤집히고', '뒤집힌다'], ['메워지고', '메워진다'],
]
const IDIOM_MEAN = [
  '서두르면 일을 그르친다', '겉과 속이 다르다', '작은 것이 큰 화를 부른다',
  '참는 자가 결국 얻는다', '인연은 억지로 못 만든다', '가진 자가 더 욕심낸다',
  '시간이 모든 걸 정리한다', '말보다 행동이 앞서야 한다', '약함을 드러내면 잡아먹힌다',
  '베푼 만큼 돌아온다', '큰소리치는 자가 먼저 무너진다', '한번 어긋난 믿음은 되돌리기 어렵다',
  '눈앞의 이익이 뒤탈을 부른다', '낮은 곳이 끝내 살아남는다', '두려움이 화를 더 키운다',
  '쌓인 정성은 헛되지 않는다',
]
// 금기어/말 습관 풀
const TABOO_POOL = [
  '죽음을 직접 말하지 않고 "먼 길 떠났다"로', '윗사람의 본명을 입에 올리지 않음',
  '돈 액수를 큰 소리로 말하지 않음', '신/조상을 욕에 섞지 않음',
  '여성/이방인 앞에서 거친 말 자제', '거래 중 "안 된다"를 직접 말하지 않음',
]
const HABIT_POOL = [
  '말끝마다 추임새를 붙임', '질문을 질문으로 되받음', '속담을 자주 인용',
  '상대 말을 그대로 따라 확인', '문장을 짧게 끊어 말함', '존대와 반말을 상황 따라 섞음',
]

interface Region {
  id: string
  name: string
  tone: number        // ENDING_TONES idx
  vowel: number       // VOWEL_SHIFTS idx
  conson: number      // CONSONANT_RULES idx
  address: number     // ADDRESS_STYLES idx
  formality: number   // 0~100 (격식도)
  warmth: number      // 0~100 (친밀/온도)
  note: string
}
interface MatrixState { [cell: string]: string } // `${si}-${li}` -> respect level key
interface Persisted {
  regions: Region[]
  selRegion: string
  matrix: MatrixState
  charName: string
  charRegionId: string
  charRank: number
  lockedIdioms: string[]
  idiomSalt: number
}

function defaultRegion(name: string, seed: string): Region {
  const r = rngFrom(seed)
  return {
    id: newId(), name,
    tone: Math.floor(r() * ENDING_TONES.length),
    vowel: Math.floor(r() * VOWEL_SHIFTS.length),
    conson: Math.floor(r() * CONSONANT_RULES.length),
    address: Math.floor(r() * ADDRESS_STYLES.length),
    formality: 30 + Math.floor(r() * 60),
    warmth: 30 + Math.floor(r() * 60),
    note: '',
  }
}

const SEED_REGIONS = ['왕도(중앙)', '북쪽 변경', '남쪽 항구', '서쪽 산지', '동쪽 평원']

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      if (p && Array.isArray(p.regions)) {
        return {
          regions: p.regions as Region[],
          selRegion: p.selRegion || (p.regions[0]?.id ?? ''),
          matrix: p.matrix || {},
          charName: p.charName || '',
          charRegionId: p.charRegionId || '',
          charRank: typeof p.charRank === 'number' ? p.charRank : 3,
          lockedIdioms: Array.isArray(p.lockedIdioms) ? p.lockedIdioms : [],
          idiomSalt: typeof p.idiomSalt === 'number' ? p.idiomSalt : 0,
        }
      }
    }
  } catch { /* noop */ }
  const regions = SEED_REGIONS.map((n) => defaultRegion(n, n))
  return { regions, selRegion: regions[0].id, matrix: {}, charName: '', charRegionId: '', charRank: 3, lockedIdioms: [], idiomSalt: 0 }
}

// 받침 유무 판정(한글 음절 끝 받침). true=받침 있음
function hasFinalConsonant(word: string): boolean {
  if (!word) return true
  const last = word.charCodeAt(word.length - 1)
  if (last >= 0xac00 && last <= 0xd7a3) return ((last - 0xac00) % 28) !== 0
  return true // 한글 음절이 아니면 받침 있는 쪽으로 처리
}
// 받침 유무로 이/가 주격 조사 선택
function subjectParticle(word: string): string { return hasFinalConsonant(word) ? '이' : '가' }

// 배열에서 r 로 서로 다른 두 항목을 고른다(고유성 보장 — 중복으로 곱을 부풀리지 않음)
function pickTwoDistinct<T>(arr: readonly T[], r: () => number): [T, T] {
  const i = Math.floor(r() * arr.length) % arr.length
  let j = Math.floor(r() * (arr.length - 1)) % (arr.length - 1)
  if (j >= i) j += 1 // i 를 건너뛰어 항상 다른 인덱스
  return [arr[i], arr[j]]
}
// 관용구 한 줄을 결정론적으로 생성.
//  구조: "{정경} {이미지1}이/가 {부사} {행위1·연결형}, {이미지2}이/가 {행위2·종결형}" — {의미}  (어미 톤 표기)
//  각 절은 자기완결적이라 슬롯이 곱집합으로 섞여도 의미 충돌이 없다.
function makeIdiom(region: Region, topicIdx: number, salt: number): string {
  const r = rngFrom(region.name + '|' + region.tone + '|' + topicIdx + '|' + salt)
  const scene = pickSeed(IDIOM_SCENE, r)
  const adv = pickSeed(IDIOM_ADV, r)
  const [img1, img2] = pickTwoDistinct(IDIOM_IMG, r)
  const [act1, act2] = pickTwoDistinct(IDIOM_ACT, r)
  const mean = pickSeed(IDIOM_MEAN, r)
  const end = pickSeed(ENDING_TONES[region.tone].endings, r)
  const clause1 = `${img1}${subjectParticle(img1)} ${adv} ${act1[0]}` // 연결형
  const clause2 = `${img2}${subjectParticle(img2)} ${act2[1]}`        // 종결형
  return `"${scene} ${clause1}, ${clause2}" (${end.replace('-', '…')} 톤) — ${mean}`
}

// 매트릭스 셀 기본 추천 존대 단계(화자 계층 si, 청자 계층 li)
function defaultRespect(si: number, li: number, formality: number): string {
  // li(청자) 가 화자보다 높을수록 더 높은 존대. 격식도 높으면 한 단계 상향.
  const diff = li - si // 음수: 청자가 더 높음(귀족=0이 상위)
  let base = 1 // haeyo
  if (diff <= -3) base = 5 // 하십시오
  else if (diff <= -1) base = 5
  else if (diff === 0) base = 1
  else if (diff <= 2) base = 1
  else base = 0 // 해체
  if (formality > 65 && base < 5) base = Math.min(5, base + 1)
  if (formality < 35 && base > 0) base = Math.max(0, base - 1)
  return RESPECT_LEVELS[Math.max(0, Math.min(RESPECT_LEVELS.length - 1, base))].key
}

export default function WorldLanguageMap({ payload }: { payload?: Record<string, unknown> }) {
  const places = useLibraryList('places') as SharedPlace[]
  const characters = useLibraryList('characters') as SharedCharacter[]

  const [st, setSt] = useState<Persisted>(() => loadState())
  const [tab, setTab] = useState<'region' | 'matrix' | 'speaker' | 'idiom'>('region')
  const [dropHot, setDropHot] = useState(false)
  const [toast, setToast] = useState('')
  const consumedPayload = useRef<Record<string, unknown> | undefined | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 저장 ──
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)) } catch { /* noop */ }
  }, [st])

  // ── payload 수용(새 payload 참조마다 1회) ──
  useEffect(() => {
    if (!payload) return
    if (consumedPayload.current === payload) return
    consumedPayload.current = payload
    const name = (payload.name || payload.title || payload.charName) as string | undefined
    const text = payload.text as string | undefined
    if (name && typeof name === 'string') {
      setSt((s) => ({ ...s, charName: name }))
      setTab('speaker')
    }
    if (text && typeof text === 'string' && !name) {
      // 본문에서 첫 줄을 인물명 후보로
      const ln = text.split(/\n/).map((x) => x.trim()).find(Boolean)
      if (ln) setSt((s) => ({ ...s, charName: ln.slice(0, 24) }))
    }
    const region = payload.region as string | undefined
    if (region && typeof region === 'string') {
      setSt((s) => {
        const found = s.regions.find((r) => r.name === region)
        if (found) return { ...s, charRegionId: found.id, selRegion: found.id }
        const nr = defaultRegion(region, region)
        return { ...s, regions: [...s.regions, nr], charRegionId: nr.id, selRegion: nr.id }
      })
    }
  }, [payload])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { toastTimer.current = null; setToast('') }, 1600)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const selRegion = useMemo(() => st.regions.find((r) => r.id === st.selRegion) || st.regions[0], [st.regions, st.selRegion])

  // ── 지역 편집 ──
  const patchRegion = (id: string, patch: Partial<Region>) =>
    setSt((s) => ({ ...s, regions: s.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const addRegion = (name?: string) => {
    const nm = name || ('새 지역 ' + (st.regions.length + 1))
    const nr = defaultRegion(nm, nm + Date.now())
    setSt((s) => ({ ...s, regions: [...s.regions, nr], selRegion: nr.id }))
  }
  const delRegion = (id: string) =>
    setSt((s) => {
      const regions = s.regions.filter((r) => r.id !== id)
      return { ...s, regions, selRegion: regions[0]?.id ?? '' }
    })

  // ── places 라이브러리 → 방언권으로 흡수 ──
  const importPlaces = () => {
    if (!places.length) { flash('장소 라이브러리가 비어 있습니다'); return }
    setSt((s) => {
      const exist = new Set(s.regions.map((r) => r.name))
      const add = places.filter((p) => p.name && !exist.has(p.name)).map((p) => defaultRegion(p.name, p.name))
      if (!add.length) return s
      return { ...s, regions: [...s.regions, ...add], selRegion: add[0].id }
    })
    flash('장소를 방언권으로 가져왔습니다')
  }

  // ── 드롭(바인더 인물 문서) ──
  const onDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const nm = item.character?.name || item.title
    const origin = item.character?.origin || item.character?.affiliation
    setSt((s) => {
      let charRegionId = s.charRegionId
      let regions = s.regions
      if (origin) {
        const f = regions.find((r) => r.name === origin)
        if (f) charRegionId = f.id
        else { const nr = defaultRegion(origin, origin); regions = [...regions, nr]; charRegionId = nr.id }
      }
      return { ...s, charName: nm || s.charName, charRegionId, regions }
    })
    setTab('speaker')
    flash('인물을 가져왔습니다: ' + (nm || item.title))
  }

  // ── 존대 매트릭스 ──
  const matrixCell = (si: number, li: number): string => {
    const key = `${si}-${li}`
    return st.matrix[key] || defaultRespect(si, li, selRegion ? selRegion.formality : 50)
  }
  const cycleCell = (si: number, li: number) => {
    const key = `${si}-${li}`
    const cur = matrixCell(si, li)
    const idx = RESPECT_LEVELS.findIndex((x) => x.key === cur)
    const next = RESPECT_LEVELS[(idx + 1) % RESPECT_LEVELS.length].key
    setSt((s) => ({ ...s, matrix: { ...s.matrix, [key]: next } }))
  }
  const autoFillMatrix = () => {
    const m: MatrixState = {}
    for (let si = 0; si < RANKS.length; si++)
      for (let li = 0; li < RANKS.length; li++)
        m[`${si}-${li}`] = defaultRespect(si, li, selRegion ? selRegion.formality : 50)
    setSt((s) => ({ ...s, matrix: m }))
    flash('출신 격식도 기반으로 자동 채움')
  }

  // ── 인물 말투 가이드(결정론적 합성) ──
  const speakerRegion = useMemo(
    () => st.regions.find((r) => r.id === st.charRegionId) || selRegion,
    [st.regions, st.charRegionId, selRegion]
  )
  const guide = useMemo(() => {
    if (!st.charName || !speakerRegion) return null
    const seed = st.charName + '|' + speakerRegion.name + '|' + st.charRank
    const r = rngFrom(seed)
    const tone = ENDING_TONES[speakerRegion.tone]
    const endings = [...tone.endings].sort(() => (r() < 0.5 ? 1 : -1)).slice(0, 3)
    const vowel = VOWEL_SHIFTS[speakerRegion.vowel]
    const cons = CONSONANT_RULES[speakerRegion.conson]
    const address = ADDRESS_STYLES[speakerRegion.address]
    const taboo = pickSeed(TABOO_POOL, r)
    const habit = pickSeed(HABIT_POOL, r)
    // 이 인물이 청자별로 쓰는 존대(매트릭스 행)
    const toOthers = RANKS.map((rk, li) => {
      const key = `${st.charRank}-${li}`
      const lv = st.matrix[key] || defaultRespect(st.charRank, li, speakerRegion.formality)
      const meta2 = RESPECT_LEVELS.find((x) => x.key === lv) || RESPECT_LEVELS[1]
      return { to: rk, label: meta2.label, sample: meta2.sample }
    })
    // 샘플 대사 한 줄(어미 톤 입힘)
    const sampleLines = [
      `만나서 반갑${endings[0].includes('습') ? '습니다' : endings[0].replace('-', '')}`,
      `그 일은 내가 맡${endings[1] ? endings[1].replace('-', '겠') : '겠소'}`,
      `걱정 마${endings[2] ? endings[2].replace('-', '') : '시오'}`,
    ]
    const idioms = IDIOM_TOPICS.slice(0, 3).map((t, i) => makeIdiom(speakerRegion, i, st.idiomSalt))
    return { tone, endings, vowel, cons, address, taboo, habit, toOthers, sampleLines, idioms, rank: RANKS[st.charRank] }
  }, [st.charName, st.charRank, st.matrix, st.idiomSalt, speakerRegion])

  // ── 관용구 은행(지역×주제) ──
  const idiomCombos = useMemo(() => {
    // 한 관용구를 만들 때 곱해지는 고유 슬롯 풀의 곱(곱집합):
    //  정경 × 부사 × 이미지1 × 행위1 × 이미지2(이미지1과 다름) × 행위2(행위1과 다름) × 의미 × 어미 × 주제
    const endN = ENDING_TONES[selRegion ? selRegion.tone : 0].endings.length
    const per =
      IDIOM_SCENE.length * IDIOM_ADV.length *
      IDIOM_IMG.length * IDIOM_ACT.length *
      (IDIOM_IMG.length - 1) * (IDIOM_ACT.length - 1) *
      IDIOM_MEAN.length * endN
    return per * IDIOM_TOPICS.length * Math.max(1, st.regions.length)
  }, [selRegion, st.regions.length])
  const idiomRows = useMemo(() => {
    if (!selRegion) return []
    return IDIOM_TOPICS.map((t, i) => ({ topic: t, line: makeIdiom(selRegion, i, st.idiomSalt) }))
  }, [selRegion, st.idiomSalt])
  const toggleLockIdiom = (line: string) =>
    setSt((s) => ({ ...s, lockedIdioms: s.lockedIdioms.includes(line) ? s.lockedIdioms.filter((x) => x !== line) : [...s.lockedIdioms, line] }))
  const reroll = () => setSt((s) => ({ ...s, idiomSalt: s.idiomSalt + 1 }))

  const copy = (txt: string) => {
    try { navigator.clipboard?.writeText(txt); flash('복사됨') } catch { flash('복사 실패') }
  }

  // ── 산출물 텍스트 ──
  const guidePlain = useMemo(() => {
    if (!guide || !speakerRegion) return ''
    const lines = [
      `[말투 가이드] ${st.charName} — 출신: ${speakerRegion.name} / 계층: ${guide.rank}`,
      `어미 톤: ${guide.tone.v} (${guide.endings.join(', ')})`,
      `모음: ${guide.vowel.v} — ${guide.vowel.note}`,
      `자음: ${guide.cons.v} — ${guide.cons.note}`,
      `호칭: ${guide.address}`,
      `금기/주의: ${guide.taboo}`,
      `말 습관: ${guide.habit}`,
      `청자별 존대:`,
      ...guide.toOthers.map((o) => `  · ${o.to} 에게 → ${o.label} (예: ${o.sample})`),
      `샘플 대사:`,
      ...guide.sampleLines.map((l) => `  "${l}"`),
      `지역 관용구:`,
      ...guide.idioms.map((l) => `  ${l}`),
    ]
    return lines.join('\n')
  }, [guide, st.charName, speakerRegion])

  const guideHtml = useMemo(() => guidePlain.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join(''), [guidePlain])

  // ───────────────────────── 렌더 ─────────────────────────
  const S = STYLES
  return (
    <div style={S.wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }}
      onDragLeave={() => setDropHot(false)}
      onDrop={onDrop}
    >
      {dropHot && <div style={S.dropOverlay}>인물 문서를 놓으면 말투 가이드로 가져옵니다</div>}

      <div style={S.tabs}>
        {([['region', '방언권'], ['matrix', '존대 격자'], ['speaker', '인물 말투'], ['idiom', '관용구 은행']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...S.tab, ...(tab === k ? S.tabOn : {}) }}>{l}</button>
        ))}
      </div>

      {/* ── 방언권 설계 ── */}
      {tab === 'region' && (
        <div style={S.body}>
          <div style={S.regionBar}>
            <select className="field" value={st.selRegion} onChange={(e) => setSt((s) => ({ ...s, selRegion: e.target.value }))} style={{ flex: 1 }}>
              {st.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="minibtn" onClick={() => addRegion()}>추가</button>
            <button className="minibtn" onClick={() => selRegion && delRegion(selRegion.id)} disabled={st.regions.length <= 1}>삭제</button>
          </div>
          <button className="minibtn" style={{ marginBottom: 8 }} onClick={importPlaces}>
            장소 라이브러리에서 방언권 가져오기{places.length ? ` (${places.length})` : ''}
          </button>

          {selRegion && (
            <div style={S.card}>
              <input className="field" value={selRegion.name} onChange={(e) => patchRegion(selRegion.id, { name: e.target.value })} placeholder="지역(방언권) 이름" style={{ fontWeight: 700, marginBottom: 8 }} />

              <Pill label="어미 톤(말끝)">
                {ENDING_TONES.map((t, i) => (
                  <button key={i} onClick={() => patchRegion(selRegion.id, { tone: i })}
                    style={{ ...S.chip, ...(selRegion.tone === i ? { ...S.chipOn, borderColor: t.color, background: t.color } : {}) }}
                  >{t.v}</button>
                ))}
              </Pill>
              <div style={S.hint}>예: {ENDING_TONES[selRegion.tone].endings.join(' / ')}</div>

              <Pill label="모음 변형">
                {VOWEL_SHIFTS.map((t, i) => (
                  <button key={i} onClick={() => patchRegion(selRegion.id, { vowel: i })} style={{ ...S.chip, ...(selRegion.vowel === i ? S.chipOn : {}) }}>{t.v}</button>
                ))}
              </Pill>
              <div style={S.hint}>{VOWEL_SHIFTS[selRegion.vowel].note}</div>

              <Pill label="특징 자음">
                {CONSONANT_RULES.map((t, i) => (
                  <button key={i} onClick={() => patchRegion(selRegion.id, { conson: i })} style={{ ...S.chip, ...(selRegion.conson === i ? S.chipOn : {}) }}>{t.v}</button>
                ))}
              </Pill>
              <div style={S.hint}>{CONSONANT_RULES[selRegion.conson].note}</div>

              <Pill label="호칭 성향">
                {ADDRESS_STYLES.map((t, i) => (
                  <button key={i} onClick={() => patchRegion(selRegion.id, { address: i })} style={{ ...S.chip, ...(selRegion.address === i ? S.chipOn : {}) }}>{t}</button>
                ))}
              </Pill>

              <div style={{ marginTop: 8 }}>
                <Slider label={`격식도 ${selRegion.formality}`} value={selRegion.formality} onChange={(v) => patchRegion(selRegion.id, { formality: v })} />
                <Slider label={`친밀/온도 ${selRegion.warmth}`} value={selRegion.warmth} onChange={(v) => patchRegion(selRegion.id, { warmth: v })} />
              </div>
              <textarea className="field" value={selRegion.note} onChange={(e) => patchRegion(selRegion.id, { note: e.target.value })} placeholder="이 방언권 메모(예: 항구라 외래어 차용 많음)" style={{ minHeight: 48, marginTop: 6 }} />

              <div style={S.barViz}>
                <span style={S.barLabel}>격식</span>
                <div style={S.barTrack}><div style={{ ...S.barFill, width: selRegion.formality + '%', background: ENDING_TONES[selRegion.tone].color }} /></div>
              </div>
              <div style={S.barViz}>
                <span style={S.barLabel}>온도</span>
                <div style={S.barTrack}><div style={{ ...S.barFill, width: selRegion.warmth + '%', background: '#d05f6a' }} /></div>
              </div>

              <div className="linkbar" style={S.linkbar}>
                {hasProjectBridge() && (
                  <button className="linkbtn" onClick={() => {
                    const t = ENDING_TONES[selRegion.tone]
                    const body = [
                      `어미 톤: ${t.v} (${t.endings.join(', ')})`,
                      `모음: ${VOWEL_SHIFTS[selRegion.vowel].v}`,
                      `자음: ${CONSONANT_RULES[selRegion.conson].v}`,
                      `호칭: ${ADDRESS_STYLES[selRegion.address]}`,
                      `격식도 ${selRegion.formality} / 친밀 ${selRegion.warmth}`,
                      selRegion.note,
                    ].filter(Boolean).map((x) => `<p>${x}</p>`).join('')
                    addToProject({ kind: 'setting', root: 'research', folder: '언어/방언', title: '방언권: ' + selRegion.name, bodyHtml: body, synopsis: t.v })
                    flash('프로젝트에 추가됨')
                  }}>프로젝트에 추가</button>
                )}
                <button className="linkbtn" onClick={() => {
                  addToLibrary('places', { name: selRegion.name, kind: '방언권', fields: { name: selRegion.name, culture: ENDING_TONES[selRegion.tone].v + ' / ' + ADDRESS_STYLES[selRegion.address], notes: selRegion.note }, source: '언어 지도' })
                  flash('장소 라이브러리에 저장')
                }}>장소로 저장</button>
                <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { name: selRegion.name })}>설정집 열기</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 존대 매트릭스 ── */}
      {tab === 'matrix' && (
        <div style={S.body}>
          <div style={S.hint}>행=화자 계층 · 열=청자 계층. 셀을 누르면 존대 단계가 순환합니다.</div>
          <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
            <button className="minibtn" onClick={autoFillMatrix}>{selRegion ? `'${selRegion.name}' 격식도로 자동 채움` : '자동 채움'}</button>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.thCorner}>화자＼청자</th>
                  {RANKS.map((r, i) => <th key={i} style={S.th}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {RANKS.map((sr, si) => (
                  <tr key={si}>
                    <th style={S.thRow}>{sr}</th>
                    {RANKS.map((tr, li) => {
                      const lv = matrixCell(si, li)
                      const m = RESPECT_LEVELS.find((x) => x.key === lv) || RESPECT_LEVELS[1]
                      const idx = RESPECT_LEVELS.findIndex((x) => x.key === lv)
                      const hue = Math.round(210 - (idx / (RESPECT_LEVELS.length - 1)) * 160)
                      return (
                        <td key={li} style={{ ...S.td, background: `hsl(${hue} 55% 88%)` }} title={`${sr} → ${tr}: ${m.label} (${m.sample})`} onClick={() => cycleCell(si, li)}>
                          {m.label.replace(/체.*$/, '체').replace('(반말)', '')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.legend}>
            {RESPECT_LEVELS.map((l, i) => <span key={i} style={S.legendItem}><b>{l.label}</b> {l.sample}</span>)}
          </div>
        </div>
      )}

      {/* ── 인물 말투 카드 ── */}
      {tab === 'speaker' && (
        <div style={S.body}>
          <div style={S.regionBar}>
            <input className="field" list="wlm-chars" value={st.charName} onChange={(e) => setSt((s) => ({ ...s, charName: e.target.value }))} placeholder="인물 이름(라이브러리에서 선택 가능)" style={{ flex: 1 }} />
            <datalist id="wlm-chars">{characters.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </div>
          {characters.length > 0 && (
            <div style={S.chipRow}>
              {characters.slice(0, 8).map((c) => {
                const origin = c.fields?.origin || c.fields?.affiliation
                return <button key={c.id} className="minibtn" onClick={() => setSt((s) => {
                  let charRegionId = s.charRegionId; let regions = s.regions
                  if (origin) { const f = regions.find((r) => r.name === origin); if (f) charRegionId = f.id; else { const nr = defaultRegion(origin, origin); regions = [...regions, nr]; charRegionId = nr.id } }
                  return { ...s, charName: c.name, charRegionId, regions }
                })}>{c.name}{origin ? ` · ${origin}` : ''}</button>
              })}
            </div>
          )}
          <div style={S.regionBar}>
            <label style={S.miniLabel}>출신 방언권</label>
            <select className="field" value={st.charRegionId} onChange={(e) => setSt((s) => ({ ...s, charRegionId: e.target.value }))} style={{ flex: 1 }}>
              <option value="">(선택 안 함 → 현재 방언권)</option>
              {st.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={S.regionBar}>
            <label style={S.miniLabel}>사회 계층</label>
            <select className="field" value={st.charRank} onChange={(e) => setSt((s) => ({ ...s, charRank: Number(e.target.value) }))} style={{ flex: 1 }}>
              {RANKS.map((r, i) => <option key={i} value={i}>{r}</option>)}
            </select>
          </div>

          {!st.charName && <div style={S.empty}>인물 이름을 입력하거나, 위 칩 또는 좌측 바인더 인물 문서를 끌어다 놓으면 출신 방언권과 계층에 맞춘 말투 가이드를 합성합니다.</div>}

          {guide && speakerRegion && (
            <div style={S.card}>
              <div style={S.guideHead}>{st.charName} <span style={S.guideSub}>{speakerRegion.name} · {guide.rank}</span></div>
              <Row k="어미 톤" v={`${guide.tone.v} (${guide.endings.join(', ')})`} />
              <Row k="모음" v={`${guide.vowel.v} — ${guide.vowel.note}`} />
              <Row k="자음" v={`${guide.cons.v} — ${guide.cons.note}`} />
              <Row k="호칭" v={guide.address} />
              <Row k="금기/주의" v={guide.taboo} />
              <Row k="말 습관" v={guide.habit} />
              <div style={S.subhead}>청자별 존대</div>
              <div style={S.toGrid}>
                {guide.toOthers.map((o, i) => (
                  <div key={i} style={S.toCell}><b>{o.to}</b><span style={{ color: 'var(--accent)' }}>{o.label}</span><i style={{ color: 'var(--muted)', fontStyle: 'normal', fontSize: 11 }}>{o.sample}</i></div>
                ))}
              </div>
              <div style={S.subhead}>샘플 대사</div>
              {guide.sampleLines.map((l, i) => <div key={i} style={S.sample} onClick={() => copy(l)} title="클릭하면 복사">“{l}”</div>)}
              <div style={S.subhead}>이 지역 관용구</div>
              {guide.idioms.map((l, i) => <div key={i} style={S.sample} onClick={() => copy(l)} title="클릭하면 복사">{l}</div>)}

              <div className="linkbar" style={S.linkbar}>
                {hasProjectBridge() && (
                  <button className="linkbtn" onClick={() => { addToProject({ kind: 'character', root: 'research', folder: '말투 가이드', title: st.charName + ' — 말투', bodyHtml: guideHtml, synopsis: speakerRegion.name + ' · ' + guide.rank, character: { name: st.charName, speech: guide.tone.v + ' / ' + guide.endings.join(' '), origin: speakerRegion.name } }); flash('프로젝트에 추가됨') }}>프로젝트에 추가</button>
                )}
                <button className="linkbtn" onClick={() => {
                  const exist = characters.find((c) => c.name === st.charName)
                  const fields: Record<string, string> = { name: st.charName, origin: speakerRegion.name, speech: `${guide.tone.v} 어미(${guide.endings.join(', ')}); 호칭: ${guide.address}; 금기: ${guide.taboo}; 습관: ${guide.habit}` }
                  if (exist) { addToLibrary('characters', { ...exist, fields: { ...(exist.fields || {}), ...fields } }); flash('인물 갱신(말투 추가)') }
                  else { addToLibrary('characters', { name: st.charName, fields, source: '언어 지도' }); flash('인물 라이브러리에 저장') }
                }}>인물에 말투 저장</button>
                {hasStash() && <button className="linkbtn" onClick={() => { addToStash({ kind: 'memo', label: st.charName + ' 말투', text: guidePlain }); flash('수집함에 담음') }}>수집함</button>}
                <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { name: st.charName })}>인물 시트 열기</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 관용구 은행 ── */}
      {tab === 'idiom' && (
        <div style={S.body}>
          <div style={S.regionBar}>
            <select className="field" value={st.selRegion} onChange={(e) => setSt((s) => ({ ...s, selRegion: e.target.value }))} style={{ flex: 1 }}>
              {st.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="minibtn" onClick={reroll}>다시 생성</button>
          </div>
          <div style={S.hint}>조합 가능 수 약 {fmtBig(idiomCombos)} — 지역×주제×이미지×행위×의미×어미. 클릭 복사, 자물쇠로 고정.</div>
          {idiomRows.map((row, i) => {
            const locked = st.lockedIdioms.includes(row.line)
            return (
              <div key={i} style={{ ...S.idiomRow, ...(locked ? { borderColor: 'var(--accent)', background: 'var(--panel)' } : {}) }}>
                <span style={S.idiomTopic}>{row.topic}</span>
                <span style={S.idiomLine} onClick={() => copy(row.line)} title="클릭하면 복사">{row.line}</span>
                <button className="minibtn" onClick={() => toggleLockIdiom(row.line)} title="고정">{locked ? '고정됨' : '고정'}</button>
              </div>
            )
          })}
          {st.lockedIdioms.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={S.subhead}>고정된 관용구 {st.lockedIdioms.length}</div>
              {st.lockedIdioms.map((l, i) => <div key={i} style={S.sample} onClick={() => copy(l)}>{l}</div>)}
              <div className="linkbar" style={S.linkbar}>
                <button className="linkbtn" onClick={() => { st.lockedIdioms.forEach((l) => addToLibrary('snippets', { text: l, tags: ['관용구', selRegion?.name || ''], source: '언어 지도' })); flash('스니펫으로 저장') }}>스니펫으로 저장</button>
                {hasStash() && <button className="linkbtn" onClick={() => { addToStash({ kind: 'memo', label: (selRegion?.name || '') + ' 관용구', text: st.lockedIdioms.join('\n') }); flash('수집함에 담음') }}>수집함</button>}
                <button className="linkbtn" onClick={() => setSt((s) => ({ ...s, lockedIdioms: [] }))}>고정 비우기</button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && <div style={S.toast}>{toast}</div>}
      <div className="license-note" style={S.note}>모든 생성은 입력 기반 결정론적 계산(외부 네트워크 없음). 같은 인물·지역·계층이면 같은 가이드가 나옵니다.</div>
    </div>
  )
}

// ───────────────────────── 작은 표현 컴포넌트 ─────────────────────────
function Pill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
    </div>
  )
}
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  )
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ width: 76, flexShrink: 0, color: 'var(--muted)' }}>{k}</span>
      <span style={{ flex: 1 }}>{v}</span>
    </div>
  )
}

// ───────────────────────── 스타일 ─────────────────────────
const STYLES: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, fontSize: 13, color: 'var(--text)' },
  tabs: { display: 'flex', gap: 4, padding: '6px 8px 0', flexShrink: 0 },
  tab: { flex: 1, padding: '6px 4px', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: '7px 7px 0 0', background: 'var(--chrome-2)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 },
  tabOn: { background: 'var(--paper)', fontWeight: 700, color: 'var(--accent)', borderColor: 'var(--border)' },
  body: { flex: 1, overflow: 'auto', padding: '10px 10px 4px', borderTop: '1px solid var(--border)' },
  regionBar: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 },
  miniLabel: { fontSize: 12, color: 'var(--muted)', width: 64, flexShrink: 0 },
  card: { border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--panel)' },
  hint: { fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 4px' },
  chip: { padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 },
  chipOn: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  barViz: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  barLabel: { width: 32, fontSize: 11, color: 'var(--muted)' },
  barTrack: { flex: 1, height: 8, background: 'var(--chrome-2)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  linkbar: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  table: { borderCollapse: 'collapse', fontSize: 11, width: '100%' },
  thCorner: { background: 'var(--chrome)', color: 'var(--text)', padding: '4px 6px', fontSize: 10, position: 'sticky', left: 0 },
  th: { background: 'var(--chrome-2)', color: 'var(--text)', padding: '4px 5px', fontSize: 10, whiteSpace: 'nowrap' },
  thRow: { background: 'var(--chrome-2)', color: 'var(--text)', padding: '4px 6px', fontSize: 10, whiteSpace: 'nowrap', textAlign: 'left', position: 'sticky', left: 0 },
  td: { padding: '5px 4px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--paper)', fontSize: 10, whiteSpace: 'nowrap', color: '#222' },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 11, color: 'var(--muted)' },
  legendItem: { background: 'var(--chrome-2)', borderRadius: 6, padding: '2px 6px' },
  empty: { padding: 16, color: 'var(--muted)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 12, lineHeight: 1.6 },
  guideHead: { fontSize: 16, fontWeight: 800, marginBottom: 6 },
  guideSub: { fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginLeft: 6 },
  subhead: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '10px 0 4px' },
  toGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 5 },
  toCell: { display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--border)', borderRadius: 7, padding: '5px 6px', background: 'var(--paper)', fontSize: 11.5 },
  sample: { padding: '5px 8px', background: 'var(--panel)', borderRadius: 7, margin: '3px 0', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.5 },
  idiomRow: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: '5px 7px', margin: '4px 0', background: 'var(--paper)' },
  idiomTopic: { width: 64, flexShrink: 0, fontSize: 11, color: 'var(--muted)' },
  idiomLine: { flex: 1, cursor: 'pointer', fontSize: 12.5 },
  dropOverlay: { position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(107,124,255,0.12)', border: '2px dashed var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, pointerEvents: 'none', fontSize: 13 },
  toast: { position: 'absolute', bottom: 34, left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--paper)', padding: '6px 12px', borderRadius: 16, fontSize: 12, zIndex: 40, whiteSpace: 'nowrap' },
  note: { fontSize: 10.5, color: 'var(--muted)', padding: '4px 10px 6px', flexShrink: 0, lineHeight: 1.4 },
}
