// 로맨스 플롯·진행곡선(로직) 템플릿 — 도시에 근거한 "로맨스 표준 11비트 구조 + 페이싱"을 단계 입력 시트로.
// 핵심: 로맨스의 클라이맥스는 '사건 해결'이 아니라 '관계의 최종 결정'. 감정 곡선이 사건 곡선보다 우선.
//  · 11비트(도입~HEA/외전)에 각자 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 '관계 거리'(둘의 정서적 거리 0~10)와 '설렘/긴장' 슬라이더 → 두 개의 곡선을 동시에 그림(밀당 진자 가시화).
//  · 하위유형 프리셋(현대 로맨스/로판 회귀·빙의/후회물/계약·가짜연인/슬로우번 장편)으로 비트 가이드·관능도 자동 세팅.
//  · 관능도(heat level)·점화 속도(슬로우번↔인스타러브) 설정 — 독자와의 사전 약속.
//  · 페이싱 자가진단(고구마/케미/밀당 정체/블랙모먼트 누락 등) 체크.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:romance-plotlogic' 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-plotlogic', name: '로맨스 플롯 로직', icon: '💞', group: '플롯', genre: '로맨스', intro: '로맨스 표준 11비트 구조·관계 거리·설렘 곡선으로 연애 서사의 진행을 설계하세요', w: 700, h: 660 }

const LS_KEY = 'sry:tool:romance-plotlogic'

// ── 로맨스 표준 11비트(도시에 §4 비트 시트) ────────────────────────────────
// pos: 전체 분량 대비 권장 위치 구간(%). dist: 권장 '관계 거리'(0=남남, 10=완전 결합). heat: 권장 설렘/긴장.
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  dist: number
  heat: number
  func: string   // 로맨스에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 하위유형/예시 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'setup', title: '1. 도입 · 일상과 결핍', sub: 'Setup', pos: [0, 8], dist: 0, heat: 1,
    func: '주인공의 결핍·상처·사랑에 대한 방어기제를 확립. 왜 이 사람이 사랑을 거부/두려워하는지가 깔려야 나중의 변화가 빛난다.',
    tip: '"사랑을 막는 내면의 벽"을 한 가지 명확히. 이 벽이 곧 로맨스의 진짜 적이다.',
    ex: ['현대: 연애 트라우마/일중독으로 마음 닫음', '로판: 회귀·빙의 직후, 원작 비극 결말을 알고 경계', '후회물: (남주 시점) 그녀를 당연시하던 오만'],
  },
  {
    key: 'meetcute', title: '2. 첫 만남 (Meet-Cute)', sub: 'First Encounter', pos: [3, 12], dist: 1, heat: 4,
    func: '운명적·우스꽝스럽·적대적 첫 조우. 좋든 나쁘든 강렬한 첫인상. 웹소설은 1~10화 안에 핵심 트로프와 케미를 노출(첫인상=연독률).',
    tip: '첫 장면에 "이 둘이 왜 끌릴/부딪힐 수밖에 없는지"의 씨앗을 심어라. 무미건조한 첫 만남은 케미 사망.',
    ex: ['enemies: 오해·충돌로 시작(오만과 편견 다아시)', '로판: 정략혼 상대/원작 남주와 대면', '강제밀착: 한 침대만 남은 여관, 폭설로 갇힘'],
  },
  {
    key: 'inciting', title: '3. 엮임의 시작 (Inciting Incident)', sub: 'Inciting Incident', pos: [8, 18], dist: 2, heat: 4,
    func: '둘을 계속 붙여 두는 사건 — 계약결혼, 동거, 같은 임무, 가짜 연인. 강제 밀착(Forced Proximity)은 감정 발생을 강제하는 최강 장치.',
    tip: '"헤어질 수 없는 이유"를 외부 장치로 박아라. 둘이 언제든 떠날 수 있으면 텐션이 안 생긴다.',
    ex: ['계약: 계약결혼/계약연애로 묶임', '가짜연인: fake dating 협정', '로판: 황비 책봉/공작저 입성으로 동거'],
  },
  {
    key: 'noway', title: '4. 거부와 밀당 (No Way)', sub: 'Push-Pull', pos: [15, 30], dist: 3, heat: 5,
    func: '"절대 안 될 사이"라는 명분 vs 끌림의 충돌. 밀당(push-pull) 진자 시작 — 가까워지면 한쪽이 물러서고, 멀어지면 끌림을 자각.',
    tip: '한 발 다가가면 두 발 물러서는 박자를 유지. 진자가 멈추면 텐션이 죽는다. yearning(애틋한 갈망)을 깔아라.',
    ex: ['신분/지위 격차를 명분으로', '회피형이 일부러 거리 둠', '니어 키스 후 도망'],
  },
  {
    key: 'falling', title: '5. 점화 · 케미 폭발 (Fun and Games)', sub: 'Falling', pos: [25, 48], dist: 5, heat: 7,
    func: '함께하는 시간 누적, 접촉의 단계적 고조(손 스침→포옹→첫 키스), 행복의 정점. "약속한 설렘"을 마음껏 펼치는 구간.',
    tip: '접촉 고조(touch escalation)로 감정 거리를 가시화. 단조로운 행복은 지루하니 작은 좌절을 섞어라.',
    ex: ['우연한 손 스침 → 의도적 접촉', '첫 키스(니어 키스 보상)', '함께 위기를 넘기며 가까워짐'],
  },
  {
    key: 'deepening', title: '6. 심화 + 외부 위협 등장', sub: 'Deepening', pos: [40, 58], dist: 6, heat: 6,
    func: '비밀·연적(질투 플롯)·과거 연인·신분/정치적 압력이 수면 위로. 관계가 깊어지는 동시에 균열의 불씨가 보인다.',
    tip: '질투 유발(연적 등장)로 진심을 자각시켜라. 위협은 인물의 상처·세계관에서 필연적으로 자라야 한다.',
    ex: ['연적/약혼자/과거 연인 등장', '숨겨온 비밀의 단서', '로판: 정치적 음모·원작 사건의 압박'],
  },
  {
    key: 'midpoint', title: '7. 중간점 전환 (Midpoint Shift)', sub: 'Midpoint', pos: [48, 55], dist: 7, heat: 8,
    func: '관계가 한 단계 깊어지거나(진심 자각·첫 동침) 결정적 정보가 폭로되는 전환점. A스토리(사건)와 감정선이 교차.',
    tip: '"거짓 승리(절정처럼 보이는 행복)" 또는 "거짓 패배(진실 폭로)"로 판을 뒤집어라. 이후 하강이 자연스럽다.',
    ex: ['진심 첫 자각/언어화', '첫 동침(관능도에 따라)', '회귀: "이번엔 다르게"의 능동적 선택'],
  },
  {
    key: 'blackmoment', title: '8. 절망의 순간 (Black Moment)', sub: 'All Is Lost', pos: [70, 82], dist: 1, heat: 9,
    func: '로맨스의 필수 구조 비트. 관계가 끝장난 듯한 최저점 — 오해의 폭발, 비밀의 폭로, 외부 압력의 정점, 희생으로 인한 이별.',
    tip: '한 마디면 풀릴 오해(idiot plot)는 금물. 인물의 상처가 필연적으로 일으킨 파국이어야 독자가 납득한다.',
    ex: ['오해가 폭발해 결별', '신분/희생을 위해 일부러 밀어냄', '비밀(회귀·정체)이 들통'],
  },
  {
    key: 'darknight', title: '9. 영혼의 어두운 밤', sub: 'Dark Night of the Soul', pos: [78, 88], dist: 2, heat: 6,
    func: '떨어진 채 각자 진심을 깨닫는 성찰 구간. 방어기제(1번 비트의 벽)가 무너지고 "이 사람이어야 한다"를 자각.',
    tip: '여기서 "왜 하필 이 사람인가"가 마침내 설득되어야 한다. 후회물이면 가해자 쪽의 처절한 후회·자각이 핵심.',
    ex: ['홀로 남아 진심 깨달음', '후회물: 잃고 나서야 사무치는 후회', '회귀: 같은 비극 반복의 공포'],
  },
  {
    key: 'grandgesture', title: '10. 대형 고백·증명 (Grand Gesture)', sub: 'Grand Gesture', pos: [85, 95], dist: 8, heat: 9,
    func: '로맨스의 클라이맥스 = 관계의 최종 결정. 한쪽(또는 둘 다)이 자존심·지위·목숨을 걸고 사랑을 증명하는 결정적 행동.',
    tip: '상호성(reciprocity)이 핵심 — 일방적 희생보다 둘 다 무언가를 내려놓아야 만족도가 높다. 장벽(오해·신분)을 실제로 제거하라.',
    ex: ['현대: 공항 추격/공개 프러포즈/지위·재산 포기', '로판: 왕위·정략혼 거부, 권력으로 그녀를 지킴', '후회물: 완전한 무릎 꿇기·속죄(권력 역전 카타르시스)'],
  },
  {
    key: 'hea', title: '11. 결합 · HEA / 외전', sub: 'Happily Ever After', pos: [95, 100], dist: 10, heat: 7,
    func: 'HEA(Happily Ever After) 또는 HFN 보장 — 장르 계약. 결혼·미래 약속. 웹소설은 외전(후일담)으로 보너스 설렘이 필수 관습.',
    tip: '결말을 어기면(죽음·영영 이별) "로맨스 계약 위반". First "I love you"의 언어화로 정서적 보상을 완결하라.',
    ex: ['결혼/미래 약속', '외전: 신혼·육아·남주 시점 특별편', 'HFN: 아직 결혼 전이나 함께함을 확정'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 하위유형 프리셋(도시에 §1 분기: 현대/로판/후회물/계약) ─────────────────
interface Preset {
  key: string
  name: string
  desc: string
  heat: number          // 권장 관능도 인덱스
  burn: number          // 점화 속도 인덱스(0=인스타러브 … 4=초슬로우번)
  // 비트별 가이드 덮어쓰기(선택) — 해당 하위유형에서 특히 강조할 메모
  notes: Partial<Record<string, string>>
}
const PRESETS: Preset[] = [
  {
    key: 'modern', name: '현대 로맨스', desc: '재벌·계약연애·사내연애. 컨템퍼러리 정통 연애선.',
    heat: 2, burn: 2,
    notes: {
      inciting: '계약연애/사내연애/우연한 동거로 엮어라. 직장·집안 등 현실 제약이 명분.',
      grandgesture: '공항 추격, 만인 앞 고백, 직위·재산 포기 같은 "현실 권력을 내려놓는" 증명이 효과적.',
    },
  },
  {
    key: 'ropan', name: '로판 회귀·빙의·환생', desc: '가상 제국/귀족 사회. 정보 비대칭(나만 결말을 안다)이 동력.',
    heat: 1, burn: 3,
    notes: {
      setup: '회귀·빙의 직후 상황 정리 + 원작 비극 결말을 인지. "이번엔 결말을 바꾼다"는 목표 설정.',
      midpoint: '"내가 아는 결말"을 능동적으로 뒤집는 선택이 전환점. 정보 비대칭의 애절함을 활용.',
      blackmoment: '회귀·정체·원작 지식이 들통나는 순간을 파국으로. 정치적 음모의 정점과 겹쳐라.',
    },
  },
  {
    key: 'regret', name: '후회물 (가해자 후회)', desc: '버린 뒤 뒤늦게 후회하며 매달리는 구도. 권력 역전 카타르시스.',
    heat: 1, burn: 2,
    notes: {
      setup: '(남주/가해자 시점) 그녀를 당연시하던 오만·무관심을 명확히. 잃을 것을 미리 깔아라.',
      darknight: '잃고 나서야 사무치는 후회가 핵심. 독자가 기다린 "내가 잘못했다"의 자각.',
      grandgesture: '완전한 무릎 꿇기·속죄. 가해자였던 쪽이 자존심을 전부 버려야 카타르시스가 완성.',
    },
  },
  {
    key: 'fake', name: '계약·가짜 연인', desc: '계약결혼/fake dating. "가짜인데 진짜가 되어버린" 전환이 백미.',
    heat: 2, burn: 2,
    notes: {
      inciting: '계약/가짜 연인 협정의 조건을 명확히(기간·규칙). 어길 수 없는 이유를 박아라.',
      midpoint: '"가짜가 진짜가 되는" 순간이 전환점 — 규칙을 넘어선 진심의 자각.',
      blackmoment: '"이건 어차피 계약이었잖아"라는 자기방어가 파국을 부른다.',
    },
  },
  {
    key: 'slowburn', name: '슬로우번 장편', desc: '느린 빌드업·다층 갈등. 긴장의 누적이 무기.',
    heat: 1, burn: 4,
    notes: {
      falling: '점화를 서두르지 마라. yearning(갈망)과 니어 키스로 보상을 길게 미뤄 긴장을 누적.',
      noway: '밀당 진자를 여러 번 반복. 매 회차 작은 설렘·클리프행어로 연독률 유지.',
    },
  },
]

// 관능도(heat level) — 독자와의 사전 약속
const HEAT_LEVELS = [
  { label: 'Clean / Sweet', desc: '키스까지. 정사 묘사 없음' },
  { label: 'Sweet+', desc: '가벼운 스킨십·암시까지' },
  { label: 'Sensual', desc: '관능적 분위기, 문 닫는(fade-to-black) 정사' },
  { label: 'Steamy', desc: '노골적이되 서정적인 정사 묘사' },
  { label: 'Explicit', desc: '직접적·상세한 정사(에로티카)' },
]
// 점화 속도(slow burn ↔ insta-love)
const BURN_LEVELS = ['인스타러브(첫눈에)', '빠른 점화', '보통', '슬로우번', '초슬로우번(대하)']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}

interface BeatState { text: string; done: boolean; dist: number; heat: number }
interface Store {
  title: string
  unit: 'won고' | 'page' | 'episode'
  total: string
  preset: string
  heatLevel: number
  burn: number
  beats: Record<string, BeatState>
}
const UNIT_LABEL: Record<Store['unit'], string> = { 'won고': '원고지(매)', page: '페이지', episode: '회차' }
const UNIT_SHORT: Record<Store['unit'], string> = { 'won고': '매', page: 'p', episode: '화' }

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, dist: b.dist, heat: b.heat } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'won고', total: '', preset: 'modern', heatLevel: 2, burn: 2, beats }
}

function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      unit: (p.unit === 'page' || p.unit === 'episode') ? p.unit : 'won고',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'modern',
      heatLevel: clamp(p.heatLevel, 0, HEAT_LEVELS.length - 1, 2),
      burn: clamp(p.burn, 0, BURN_LEVELS.length - 1, 2),
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        s.beats[b.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          done: !!v.done,
          dist: clamp(v.dist, 0, 10, b.dist),
          heat: clamp(v.heat, 1, 10, b.heat),
        }
      }
    }
    return s
  } catch { return base }
}

export default function RomancePlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — 로맨스 외 장르로 열리면 안내(하지만 동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '로맨스' && mounted.current) {
      setNote(`이 도구는 로맨스 전용입니다(현재 장르: ${g}). 비트 가이드는 로맨스 관습 기준이에요.`)
    }
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  const preset = PRESETS.find((p) => p.key === store.preset) || PRESETS[0]

  // ── 변경 헬퍼 ──────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total' | 'heatLevel' | 'burn'>>) => setStore((s) => ({ ...s, ...patch }))
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))
  const toggleOpen = (key: string) => setOpenKey((o) => ({ ...o, [key]: !o[key] }))

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    setStore((s) => ({ ...s, preset: key, heatLevel: p.heat, burn: p.burn }))
    flashMsg(`'${p.name}' 프리셋 적용 — 관능도·점화 속도를 권장값으로 맞췄어요`)
  }

  // ── 권장 위치 환산 ─────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const totalDigits = store.total.replace(/[^\d.]/g, '')
  const fmtPos = (r: [number, number]): string => {
    if (totalNum > 0) {
      const a = Math.max(1, Math.round((r[0] / 100) * totalNum))
      const b = Math.max(a, Math.round((r[1] / 100) * totalNum))
      const u = UNIT_SHORT[store.unit]
      return `${a}~${b}${u} (${r[0]}~${r[1]}%)`
    }
    return `전체의 ${r[0]}~${r[1]}% 구간`
  }

  // ── 진행률 ─────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim()).length
  const pct = Math.round((doneCount / BEATS.length) * 100)

  // ── 두 곡선(관계 거리 + 설렘/긴장) ──────────────────────────
  const CW = 660, CH = 170, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const yDist = (d: number) => PADY + (1 - d / 10) * (CH - PADY * 2)         // 0~10
  const yHeat = (h: number) => PADY + (1 - (h - 1) / 9) * (CH - PADY * 2)    // 1~10
  const distPts = BEATS.map((b, i) => ({ x: xAt(i), y: yDist(store.beats[b.key].dist), b }))
  const heatPts = BEATS.map((b, i) => ({ x: xAt(i), y: yHeat(store.beats[b.key].heat), b }))
  const pathOf = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §9 함정 + §4 페이싱) ──────────────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    const bm = store.beats['blackmoment']
    out.push({ ok: !!bm.text.trim(), msg: bm.text.trim() ? '블랙모먼트(절망의 순간)가 설계되어 있어요 — 로맨스 필수 비트' : '블랙모먼트가 비었어요 — 관계가 끝장난 듯한 최저점이 없으면 절정이 약해져요' })
    const gg = store.beats['grandgesture']
    out.push({ ok: !!gg.text.trim(), msg: gg.text.trim() ? '대형 고백·증명(Grand Gesture)이 있어요 — 관계의 최종 결정' : 'Grand Gesture가 비었어요 — 사랑을 증명하는 결정적 행동이 클라이맥스예요' })
    out.push({ ok: store.beats['hea'].dist >= 9, msg: store.beats['hea'].dist >= 9 ? 'HEA 결말의 관계 거리가 충분히 높아요(장르 계약 충족)' : 'HEA에서 관계 거리가 낮아요 — 두 주인공이 맺어지지 않으면 로맨스 계약 위반이에요' })
    // 밀당 진자: 점화(5)→심화(6)→블랙(8)에서 거리가 출렁여야 함
    const d5 = store.beats['falling'].dist, d8 = store.beats['blackmoment'].dist
    out.push({ ok: d8 < d5, msg: d8 < d5 ? '블랙모먼트에서 관계 거리가 떨어져 밀당 진자가 살아 있어요' : '블랙모먼트인데 거리가 안 떨어졌어요 — 단조로운 상승은 긴장을 죽여요(고구마 반대편의 함정)' })
    // 첫 만남 케미: meet-cute 설렘이 도입보다 높아야
    out.push({ ok: store.beats['meetcute'].heat >= 3, msg: store.beats['meetcute'].heat >= 3 ? '첫 만남의 설렘 강도가 충분해요(첫인상=연독률)' : '첫 만남의 설렘이 약해요 — 강렬한 첫인상이 케미의 출발점이에요' })
    return out
  })()
  const diagOk = diagnostics.filter((d) => d.ok).length

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const L: string[] = []
    L.push(`[로맨스 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`하위유형: ${preset.name} · 관능도: ${HEAT_LEVELS[store.heatLevel].label} · 점화: ${BURN_LEVELS[store.burn]}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%)`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)} · 관계거리 ${st.dist}/10 · 설렘 ${st.heat}/10〉`)
      L.push(`   기능: ${b.func}`)
      const pn = preset.notes[b.key]
      if (pn) L.push(`   [${preset.name}] ${pn}`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => L.push(`   · ${l}`))
      L.push('')
    }
    return L.join('\n').trimEnd() + '\n'
  }
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (store.title.trim()) parts.push(`<p><em>${esc(store.title.trim())}</em></p>`)
    parts.push(`<p><strong>하위유형:</strong> ${esc(preset.name)} · <strong>관능도:</strong> ${esc(HEAT_LEVELS[store.heatLevel].label)} · <strong>점화:</strong> ${esc(BURN_LEVELS[store.burn])}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%)</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))} · 관계거리 ${st.dist}/10 · 설렘 ${st.heat}/10〉</span></h3>`)
      parts.push(`<p><em>기능: ${esc(b.func)}</em></p>`)
      const pn = preset.notes[b.key]
      if (pn) parts.push(`<p><em>[${esc(preset.name)}] ${esc(pn)}</em></p>`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => parts.push(`<p>${esc(l) || '&nbsp;'}</p>`))
      else parts.push('<p>&nbsp;</p>')
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashMsg('전체 플롯을 복사했어요')
    } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: store.title.trim() ? `로맨스 플롯 — ${store.title.trim()}` : '로맨스 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        하위유형: preset.name,
        관능도: HEAT_LEVELS[store.heatLevel].label,
        점화속도: BURN_LEVELS[store.burn],
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashMsg(id ? '프로젝트 자료(구조)에 플롯 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // 작성된 비트를 스니펫(글감)으로 저장
  const toSnippet = () => {
    const filled = BEATS.filter((b) => store.beats[b.key].text.trim())
    if (filled.length === 0) { setNote('저장할 비트 내용이 없어요. 비트를 펼쳐 내용을 적어 보세요.'); return }
    const text = filled.map((b) => `[${b.title}] ${store.beats[b.key].text.trim()}`).join('\n')
    addToLibrary('snippets', { text, source: `로맨스 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['로맨스', '플롯', preset.name] })
    flashMsg('작성한 비트를 글감(스니펫)으로 저장했어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·진행 상태·곡선을 초기화할까요?')) return
    setStore(defaultStore()); setOpenKey({})
    flashMsg('모두 초기화했어요')
  }

  // 비트별 곡선 색
  const C_DIST = 'var(--accent)'
  const C_HEAT = '#e0533d'

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35 }
  const posLine: React.CSSProperties = { fontSize: 11.5, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 60, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const funcBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 9px' }
  const presetNote: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const exTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px' }

  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'romance-tropes', icon: '🏷️', label: '트로프 체크리스트' },
    { id: 'romance-synopsis', icon: '📝', label: '시놉시스 빌더' },
    { id: 'romance-outline', icon: '🗂️', label: '개요 빌더' },
    { id: 'romance-signature', icon: '💘', label: '설렘 생성기' },
    { id: 'romance-eventforge', icon: '🎲', label: '사건 생성기' },
    { id: 'romance-sceneforge', icon: '🎬', label: '장면 생성기' },
  ]

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <input style={{ ...input, flex: '2 1 180px' }} value={store.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '0 1 96px', width: 96 }} value={store.total} onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })} placeholder="총 분량" inputMode="decimal" aria-label="총 분량" />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Store['unit'] })} aria-label="분량 단위">
            <option value="won고">원고지(매)</option>
            <option value="page">페이지</option>
            <option value="episode">회차</option>
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>하위유형</label>
          <select style={{ ...select, flex: '1 1 160px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="하위유형 프리셋">
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>관능도</label>
          <select style={{ ...select, flex: '1 1 150px' }} value={store.heatLevel} onChange={(e) => setMeta({ heatLevel: Number(e.target.value) })} aria-label="관능도">
            {HEAT_LEVELS.map((h, i) => <option key={i} value={i}>{h.label}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>점화</label>
          <select style={{ ...select, flex: '1 1 150px' }} value={store.burn} onChange={(e) => setMeta({ burn: Number(e.target.value) })} aria-label="점화 속도">
            {BURN_LEVELS.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
        </div>
        <div style={{ ...hint, fontSize: 11.5 }}>{preset.desc} · 관능도: {HEAT_LEVELS[store.heatLevel].desc}</div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 이중 곡선: 관계 거리 + 설렘/긴장 ── */}
        <div style={panel}>
          <div style={sectionTitle}>관계 거리 & 설렘 곡선 · 도입→HEA (감정 곡선이 사건 곡선보다 우선)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 190 }} role="img" aria-label="관계 거리와 설렘 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {/* 설렘/긴장 곡선 */}
            <path d={pathOf(heatPts)} fill="none" stroke={C_HEAT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} strokeDasharray="5 4" />
            {/* 관계 거리 곡선 */}
            <path d={pathOf(distPts)} fill="none" stroke={C_DIST} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
            {distPts.map((p, i) => (
              <circle key={'d' + i} cx={p.x} cy={p.y} r={3.5} fill={C_DIST} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${p.b.title} · 관계거리 ${store.beats[p.b.key].dist}/10`}</title>
              </circle>
            ))}
            {heatPts.map((p, i) => (
              <circle key={'h' + i} cx={p.x} cy={p.y} r={3} fill={C_HEAT} stroke="var(--paper)" strokeWidth={1.2} opacity={0.9}>
                <title>{`${p.b.title} · 설렘/긴장 ${store.beats[p.b.key].heat}/10`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_DIST, verticalAlign: 'middle', marginRight: 5 }} />관계 거리(친밀도)</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_HEAT, verticalAlign: 'middle', marginRight: 5 }} />설렘·긴장</span>
            <span style={{ ...hint, fontSize: 11.5 }}>밀당 진자: 가까워졌다 멀어지는 출렁임이 텐션을 만듭니다(8번에서 급락 = 블랙모먼트).</span>
          </div>
        </div>

        {/* ── 페이싱 자가진단 ── */}
        <div style={panel}>
          <div style={sectionTitle}>페이싱 자가진단 · {diagOk}/{diagnostics.length} 충족</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: d.ok ? 'var(--text)' : 'var(--warn)' }}>
                <span style={{ marginRight: 6 }}>{d.ok ? <Emoji e="✅" /> : <Emoji e="⚠️" />}</span>{d.msg}
              </div>
            ))}
          </div>
        </div>

        {/* ── 11비트 입력 ── */}
        {BEATS.map((b) => {
          const st = store.beats[b.key]
          const isOpen = !!openKey[b.key]
          const hasContent = !!st.text.trim()
          const pn = preset.notes[b.key]
          return (
            <div key={b.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => patchBeat(b.key, { done: !st.done })} aria-label={`${b.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 관계거리 {st.dist}/10 · 설렘 {st.heat}/10</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>

              {isOpen && (
                <div style={section}>
                  <div style={funcBox}><strong style={{ color: 'var(--accent-2)' }}>{b.sub} · 기능</strong> — {b.func}</div>
                  <div style={hint}><strong>작법 팁:</strong> {b.tip}</div>
                  {pn && <div style={presetNote}><strong>[{preset.name}]</strong> {pn}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {b.ex.map((e, i) => <span key={i} style={exTag}>{e}</span>)}
                  </div>

                  <div style={subLabel}>이 비트에서 무슨 일이 일어나나요?</div>
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="장면·사건·감정·대사를 자유롭게…" />

                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>관계 거리</span>
                    <input type="range" min={0} max={10} value={st.dist} onChange={(e) => patchBeat(b.key, { dist: Number(e.target.value) })} style={{ flex: 1, accentColor: C_DIST }} aria-label="관계 거리" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_DIST }}>{st.dist}/10</strong>
                  </div>
                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>설렘·긴장</span>
                    <input type="range" min={1} max={10} value={st.heat} onChange={(e) => patchBeat(b.key, { heat: Number(e.target.value) })} style={{ flex: 1, accentColor: C_HEAT }} aria-label="설렘·긴장" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_HEAT }}>{st.heat}/10</strong>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ── 연계 도구 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          {RELATED.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '로맨스' })} title={`${r.label} 열기`}><Emoji e={r.icon} /> {r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ ...foot, borderBottom: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">프로젝트:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '11비트 플롯을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet} title="작성한 비트를 글감(스니펫) 라이브러리에 저장"><Emoji e="💾" /> 글감으로 저장</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={() => setOpenKey(Object.fromEntries(BEAT_KEYS.map((k) => [k, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpenKey({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>초기화</button>
      </div>
    </div>
  )
}
