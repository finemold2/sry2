// 세계 경제 시뮬 — 작품 세계의 '지역(장소)'·'자원'·'교역로' 규칙을 정의하면, 다회차(턴)에 걸쳐
//   각 지역의 생산/소비/재고/가격/통화가치/부의 분포가 어떻게 흘러가는지 결정론적으로 시뮬레이션한다.
//   (서버 없음 · 외부 API 없음 · 전부 브라우저 로컬 계산)
//
//   모형 개요 (단순화된 다지역 부분균형 + 교역 흐름)
//   1) 지역(Region): 인구, 부(자본), 생산성, 통화. 각 자원에 대해 생산능력/기본소비/재고를 가진다.
//   2) 자원(Resource): 식량(필수)·금속·사치재 등. 필수재 부족은 '기근'을 일으킨다.
//   3) 교역로(Route): 두 지역을 잇는 길. 용량/관세/위험도가 있어, 가격이 비싼 곳으로 자원이 흐른다.
//   4) 매 턴: 생산 → 지역 내 가격형성(수급) → 교역(차익이 운임/관세/위험을 넘으면 이동) →
//             소비/기근 판정 → 부의 이전(거래 마진은 부유한 쪽으로 쏠림) → 통화가치 갱신.
//   5) 충격(Shock): 흉작/전쟁봉쇄/신광맥/역병을 특정 턴에 넣어 파급(전염) 효과를 본다.
//
//   결과 시각화: 턴별 지역 가격 스파크라인, 기근 위험 히트, 부의 분포(지니계수), 통화 환율, 핵심 사건 로그.
//
//   연동(linkbus)
//   - useLibraryList('places')        : 라이브러리 장소를 지역 후보로 불러와 한 번에 등록.
//   - getDragItem/isItemDrag          : 좌측 바인더 문서를 드롭하면 본문에서 자원·기근 키워드를 읽어 지역 성향 추정.
//   - payload.text / payload.title    : 다른 도구가 넘긴 텍스트/제목 수용.
//   - addToLibrary('places')          : 시뮬 결과(경제 프로필)를 PLACE_FIELDS 형식 장소 카드로 저장.
//   - addToProject(...)               : 경제 설정 + 시뮬 요약을 자료 〈세계관〉 폴더 문서로 추가.
//   - addToStash(...)                 : 핵심 사건(기근·폭등 등)을 수집함 메모로.
//   - openToolLinked(...)             : 설정집/세계 위키/물리 샌드박스를 데이터와 함께 열기.
//
//   import 는 react 와 './linkbus' 만 사용한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToLibrary,
  addToProject,
  addToStash,
  getDragItem,
  hasProjectBridge,
  hasStash,
  isItemDrag,
  openToolLinked,
  useLibraryList,
  PLACE_FIELDS,
} from './linkbus'

export const meta = {
  id: 'world-economy-sim',
  name: '세계 경제 시뮬',
  icon: '\u{1FA99}',
  group: '세계관',
  intro: '자원·통화·교역로 규칙을 넣으면 가격·기근·부의 분포를 다회차로 시뮬레이션합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:world-economy-sim'

// ── 결정론적 의사난수(시드 = 문자열 해시) ───────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 모델 ─────────────────────────────────────────────────────────────────────
interface Resource {
  id: string
  name: string
  essential: boolean   // 필수재(부족 시 기근)
  basePrice: number    // 기준 가격(은화 단위)
  weight: number       // 운송 난이도(부피/무게) 1=가벼움
}
interface RegionRes {
  produce: number      // 턴당 생산량
  consume: number      // 1인 환산 기본 소비 계수(인구에 곱)
  stock: number        // 현재 재고
}
interface Region {
  id: string
  name: string
  population: number    // 천 명 단위
  wealth: number        // 누적 부(은화, 천 단위)
  currencyName: string
  fx: number            // 자국 통화의 기준 환율(은화당 자국통화), 1 기준
  res: Record<string, RegionRes>  // resourceId -> RegionRes
}
interface Route {
  id: string
  a: string            // region id
  b: string            // region id
  capacity: number     // 턴당 이동 가능 총량
  tariff: number       // 관세율 0~0.6
  risk: number         // 손실 위험 0~0.5 (도적·풍랑 등)
}
type ShockKind = 'blight' | 'blockade' | 'lode' | 'plague'
interface Shock {
  id: string
  turn: number
  kind: ShockKind
  regionId: string
  resourceId?: string
  power: number        // 0~100
}
interface Model {
  title: string
  turns: number
  resources: Resource[]
  regions: Region[]
  routes: Route[]
  shocks: Shock[]
  seedSalt: string
}

// ── 기본 모델(빈 입력일 때의 출발점) ───────────────────────────────────────
function defaultModel(): Model {
  const res: Resource[] = [
    { id: 'grain', name: '곡물', essential: true, basePrice: 4, weight: 3 },
    { id: 'metal', name: '금속', essential: false, basePrice: 14, weight: 4 },
    { id: 'luxury', name: '사치재', essential: false, basePrice: 40, weight: 1 },
  ]
  const mk = (id: string, name: string, pop: number, wealth: number, cur: string, pr: Record<string, [number, number, number]>): Region => ({
    id, name, population: pop, wealth, currencyName: cur, fx: 1,
    res: Object.fromEntries(res.map((r) => {
      const p = pr[r.id] || [0, 1, 0]
      return [r.id, { produce: p[0], consume: p[1], stock: p[2] }]
    })),
  })
  const regions: Region[] = [
    mk('r1', '곡창 평원', 120, 80, '은화', { grain: [180, 1.0, 200], metal: [10, 1.0, 20], luxury: [4, 0.6, 5] }),
    mk('r2', '광산 산악', 60, 120, '광표', { grain: [40, 1.0, 30], metal: [120, 0.6, 120], luxury: [6, 0.8, 8] }),
    mk('r3', '항구 도시', 90, 200, '금화', { grain: [50, 1.1, 40], metal: [25, 1.2, 30], luxury: [60, 1.6, 40] }),
  ]
  const routes: Route[] = [
    { id: 'e1', a: 'r1', b: 'r2', capacity: 60, tariff: 0.08, risk: 0.10 },
    { id: 'e2', a: 'r2', b: 'r3', capacity: 70, tariff: 0.12, risk: 0.18 },
    { id: 'e3', a: 'r1', b: 'r3', capacity: 50, tariff: 0.10, risk: 0.22 },
  ]
  const shocks: Shock[] = [
    { id: 's1', turn: 4, kind: 'blight', regionId: 'r1', resourceId: 'grain', power: 60 },
  ]
  return { title: '', turns: 12, resources: res, regions, routes, shocks, seedSalt: '' }
}

// ── 가격 모형: 수급비로 기준가를 곱한다(필수재는 탄력 큼) ─────────────────────
// supply = 재고+생산, demand = 인구*소비계수. ratio<1 이면 부족 → 가격 상승.
function priceOf(r: Resource, supply: number, demand: number): number {
  const d = Math.max(1, demand)
  const ratio = supply / d                  // 1 이면 균형
  const elasticity = r.essential ? 1.6 : 0.9
  // 부족할수록(ratio<1) 가격이 기준가의 여러 배까지. 과잉이면 절반까지 하락.
  let mult: number
  if (ratio >= 1) mult = 1 / (1 + (ratio - 1) * 0.35)        // 과잉 → 완만 하락(0.5 하한)
  else mult = Math.pow(1 / Math.max(0.18, ratio), elasticity * 0.6)
  mult = Math.max(0.45, Math.min(9, mult))
  return r.basePrice * mult
}

// ── 지니계수(부의 분포) ───────────────────────────────────────────────────────
function gini(values: number[]): number {
  const v = values.filter((x) => isFinite(x) && x >= 0).slice().sort((a, b) => a - b)
  const n = v.length
  if (n === 0) return 0
  const sum = v.reduce((s, x) => s + x, 0)
  if (sum === 0) return 0
  let cum = 0
  for (let i = 0; i < n; i++) cum += (i + 1) * v[i]
  return Math.max(0, Math.min(1, (2 * cum) / (n * sum) - (n + 1) / n))
}

// ── 시뮬레이션 ────────────────────────────────────────────────────────────────
interface RegionSnap {
  id: string
  name: string
  population: number
  wealth: number
  fx: number
  prices: Record<string, number>     // resourceId -> 은화 가격
  stocks: Record<string, number>
  famine: number                     // 0~100 기근 심각도(필수재 충족 부족)
}
interface TurnSnap {
  turn: number
  regions: RegionSnap[]
  giniWealth: number
  events: string[]
}
interface SimResult {
  turns: TurnSnap[]
  events: { turn: number; text: string; severe: boolean }[]
}

function cloneRegion(r: Region): Region {
  return { ...r, res: Object.fromEntries(Object.entries(r.res).map(([k, v]) => [k, { ...v }])) }
}

function simulate(model: Model): SimResult {
  const rng = mulberry32(hashStr('econ|' + model.seedSalt + '|' + model.regions.map((r) => r.id).join(',') + '|' + model.turns))
  const regions = model.regions.map(cloneRegion)
  const resById = Object.fromEntries(model.resources.map((r) => [r.id, r]))
  const shocksByTurn = new Map<number, Shock[]>()
  for (const s of model.shocks) {
    const arr = shocksByTurn.get(s.turn) || []
    arr.push(s); shocksByTurn.set(s.turn, arr)
  }
  const out: TurnSnap[] = []
  const allEvents: { turn: number; text: string; severe: boolean }[] = []
  const blocked = new Set<string>()        // 봉쇄된 region id (이번 턴)

  for (let t = 1; t <= Math.max(1, model.turns); t++) {
    const events: string[] = []
    blocked.clear()
    const shocks = shocksByTurn.get(t) || []
    // 충격 적용(생산/재고/인구에 영향)
    for (const sh of shocks) {
      const reg = regions.find((r) => r.id === sh.regionId)
      if (!reg) continue
      const p = sh.power / 100
      if (sh.kind === 'blight' && sh.resourceId && reg.res[sh.resourceId]) {
        reg.res[sh.resourceId].stock *= (1 - 0.85 * p)
        reg.res[sh.resourceId].produce *= (1 - 0.7 * p)
        events.push(`${reg.name}: ${resById[sh.resourceId]?.name || sh.resourceId} 흉작(강도 ${sh.power})`)
        allEvents.push({ turn: t, text: `${reg.name}의 ${resById[sh.resourceId]?.name || ''} 흉작`, severe: p > 0.5 })
      } else if (sh.kind === 'blockade') {
        blocked.add(reg.id)
        events.push(`${reg.name}: 교역 봉쇄`)
        allEvents.push({ turn: t, text: `${reg.name} 교역 봉쇄`, severe: p > 0.4 })
      } else if (sh.kind === 'lode' && sh.resourceId && reg.res[sh.resourceId]) {
        reg.res[sh.resourceId].produce *= (1 + 1.5 * p)
        reg.res[sh.resourceId].stock += reg.res[sh.resourceId].produce * p
        events.push(`${reg.name}: ${resById[sh.resourceId]?.name || ''} 신광맥 발견`)
        allEvents.push({ turn: t, text: `${reg.name}에서 ${resById[sh.resourceId]?.name || ''} 신광맥`, severe: false })
      } else if (sh.kind === 'plague') {
        reg.population *= (1 - 0.3 * p)
        events.push(`${reg.name}: 역병(인구 감소)`)
        allEvents.push({ turn: t, text: `${reg.name} 역병 창궐`, severe: p > 0.5 })
      }
    }

    // 1) 생산 → 재고 누적
    for (const reg of regions) {
      for (const r of model.resources) {
        const rr = reg.res[r.id]; if (!rr) continue
        rr.stock = Math.max(0, rr.stock + rr.produce)
      }
    }

    // 2) 지역 내 가격 형성(소비 전, 현 수급 기준)
    const priceMap: Record<string, Record<string, number>> = {}
    const calcPrices = () => {
      for (const reg of regions) {
        const pm: Record<string, number> = {}
        for (const r of model.resources) {
          const rr = reg.res[r.id]; if (!rr) continue
          const demand = reg.population * rr.consume
          pm[r.id] = priceOf(r, rr.stock, demand)
        }
        priceMap[reg.id] = pm
      }
    }
    calcPrices()

    // 3) 교역: 각 자원마다 가격 낮은 곳 → 높은 곳. 차익이 (운임+관세+위험)을 넘으면 이동.
    for (const r of model.resources) {
      // 라우트를 차익 큰 순으로 처리
      const moves: { route: Route; from: Region; to: Region; gain: number }[] = []
      for (const e of model.routes) {
        if (e.a === e.b) continue
        if (blocked.has(e.a) || blocked.has(e.b)) continue
        const A = regions.find((x) => x.id === e.a); const B = regions.find((x) => x.id === e.b)
        if (!A || !B) continue
        const pa = priceMap[A.id][r.id]; const pb = priceMap[B.id][r.id]
        if (pa == null || pb == null) continue
        const [from, to, pf, pt] = pa < pb ? [A, B, pa, pb] : [B, A, pb, pa]
        const freight = r.weight * 0.6              // 운임(가격 단위)
        const cost = freight + pt * e.tariff + pt * e.risk * 0.5
        const gain = pt - pf - cost
        if (gain > 0) moves.push({ route: e, from, to, gain })
      }
      moves.sort((x, y) => y.gain - x.gain)
      for (const mv of moves) {
        const fromRR = mv.from.res[r.id]; const toRR = mv.to.res[r.id]
        if (!fromRR || !toRR) continue
        // 보낼 수 있는 양: 출발지 잉여(소비분은 남김)의 일부 + 용량 한도
        const fromDemand = mv.from.population * fromRR.consume
        const surplus = Math.max(0, fromRR.stock - fromDemand)
        const qty = Math.min(mv.route.capacity, surplus * 0.6)
        if (qty < 1) continue
        const lost = qty * mv.route.risk          // 도중 손실
        const arrived = qty - lost
        fromRR.stock -= qty
        toRR.stock += arrived
        // 부의 이전: 거래액 = 도착량 * 출발가, 관세는 도착지로, 마진은 부유한 쪽(상인)에게
        const tradeValue = arrived * priceMap[mv.from.id][r.id]
        const tariffTake = tradeValue * mv.route.tariff
        const margin = tradeValue * 0.08
        mv.from.wealth += tradeValue * 0.45
        mv.to.wealth += tariffTake + margin
        // 도착지가 더 부유하면 마진이 더 쏠린다(부익부)
        const richer = mv.from.wealth >= mv.to.wealth ? mv.from : mv.to
        richer.wealth += margin * 0.5
      }
    }
    // 교역 후 가격 재계산
    calcPrices()

    // 4) 소비 + 기근 판정
    for (const reg of regions) {
      let famine = 0
      for (const r of model.resources) {
        const rr = reg.res[r.id]; if (!rr) continue
        const demand = reg.population * rr.consume
        const got = Math.min(rr.stock, demand)
        rr.stock = Math.max(0, rr.stock - demand)   // 소비(부족하면 0)
        if (r.essential && demand > 0) {
          const shortfall = Math.max(0, (demand - got) / demand)
          famine = Math.max(famine, shortfall * 100)
        }
      }
      // 기근 → 인구/부 감소(다음 턴으로 파급)
      if (famine > 25) {
        const loss = (famine / 100) * 0.05
        reg.population *= (1 - loss)
        reg.wealth *= (1 - loss * 0.8)
        if (famine > 60) {
          events.push(`${reg.name}: 심각한 기근(${Math.round(famine)})`)
          allEvents.push({ turn: t, text: `${reg.name} 심각한 기근(${Math.round(famine)})`, severe: true })
        }
      }
      ;(reg as Region & { _famine?: number })._famine = famine
    }

    // 5) 통화가치(fx): 부와 필수재 자급률로. 부유+자급 → 통화 강세.
    for (const reg of regions) {
      const grain = reg.res.grain
      const selfSuff = grain ? Math.min(2, (grain.produce) / Math.max(1, reg.population * grain.consume)) : 1
      const totalWealth = regions.reduce((s, x) => s + x.wealth, 0) / regions.length
      const wealthRatio = reg.wealth / Math.max(1, totalWealth)
      const target = 0.4 + wealthRatio * 0.4 + selfSuff * 0.3
      reg.fx = reg.fx * 0.6 + target * 0.4         // 완만 수렴
    }

    // 6) 가격 폭등 이벤트 감지
    for (const reg of regions) {
      for (const r of model.resources) {
        const p = priceMap[reg.id][r.id]
        if (p == null) continue
        if (p > r.basePrice * 3.2) {
          events.push(`${reg.name}: ${r.name} 가격 폭등(${(p / r.basePrice).toFixed(1)}배)`)
          if (p > r.basePrice * 4.5) allEvents.push({ turn: t, text: `${reg.name} ${r.name} 가격 ${(p / r.basePrice).toFixed(1)}배 폭등`, severe: true })
        }
      }
    }
    // 약간의 결정론적 잡음(생산 변동) — 다음 턴 생산에 ±
    for (const reg of regions) {
      for (const r of model.resources) {
        const rr = reg.res[r.id]; if (!rr) continue
        const jitter = 0.94 + rng() * 0.12
        rr.produce = Math.max(0, rr.produce * jitter)
      }
    }

    out.push({
      turn: t,
      regions: regions.map((reg) => ({
        id: reg.id, name: reg.name, population: reg.population, wealth: reg.wealth, fx: reg.fx,
        prices: { ...priceMap[reg.id] },
        stocks: Object.fromEntries(model.resources.map((r) => [r.id, reg.res[r.id]?.stock ?? 0])),
        famine: (reg as Region & { _famine?: number })._famine || 0,
      })),
      giniWealth: gini(regions.map((r) => r.wealth)),
      events,
    })
  }
  return { turns: out, events: allEvents }
}

// ── 텍스트 → 지역 성향 추정(드롭/payload 흡수) ───────────────────────────────
const KW = {
  grainRich: /곡창|평원|농경|풍요|풍년|비옥/g,
  grainPoor: /기근|흉작|척박|황무지|불모|배고/g,
  metalRich: /광산|광맥|철|금|은|채굴/g,
  luxury: /사치|보석|향료|비단|예술|귀금속/g,
  port: /항구|무역|상인|교역|선박|상단/g,
  poor: /가난|빈곤|쇠락|굶주/g,
  rich: /부유|번영|황금|풍족/g,
}
function inferRegionFromText(name: string, text: string): Region | null {
  const t = String(text || '')
  if (!t.trim()) return null
  const cnt = (re: RegExp) => { re.lastIndex = 0; const m = t.match(re); return m ? m.length : 0 }
  const grainP = cnt(KW.grainRich) * 30 + 60 - cnt(KW.grainPoor) * 25
  const metalP = cnt(KW.metalRich) * 35 + 15
  const luxP = cnt(KW.luxury) * 25 + 4 + cnt(KW.port) * 8
  const wealth = Math.max(30, 80 + cnt(KW.rich) * 40 + cnt(KW.port) * 30 - cnt(KW.poor) * 35)
  const pop = 60 + cnt(KW.port) * 20 + cnt(KW.grainRich) * 15
  return {
    id: 'r_' + hashStr(name + t).toString(36).slice(0, 5),
    name, population: Math.round(pop), wealth: Math.round(wealth), currencyName: '은화', fx: 1,
    res: {
      grain: { produce: Math.max(20, Math.round(grainP)), consume: 1.0, stock: Math.round(grainP * 0.8) },
      metal: { produce: Math.round(metalP), consume: 1.0, stock: Math.round(metalP) },
      luxury: { produce: Math.round(luxP), consume: 0.9, stock: Math.round(luxP) },
    },
  }
}

// ── 저장/복원 ────────────────────────────────────────────────────────────────
function loadModel(): Model {
  const fb = defaultModel()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fb
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fb
    const m = { ...fb, ...p } as Model
    if (!Array.isArray(m.resources) || !m.resources.length) m.resources = fb.resources
    if (!Array.isArray(m.regions) || !m.regions.length) m.regions = fb.regions
    if (!Array.isArray(m.routes)) m.routes = fb.routes
    if (!Array.isArray(m.shocks)) m.shocks = fb.shocks
    if (typeof m.turns !== 'number' || m.turns < 1) m.turns = fb.turns
    m.turns = Math.max(2, Math.min(40, Math.round(m.turns)))
    return m
  } catch { return fb }
}

const SHOCK_LABEL: Record<ShockKind, string> = { blight: '흉작', blockade: '봉쇄', lode: '신광맥', plague: '역병' }

function uid(p: string) { return p + Math.random().toString(36).slice(2, 7) }

// 추가하려는 지역 id가 기존 지역과 충돌하면 접미사(uid 일부)를 붙여 유일성 보장.
function ensureUniqueRegionId(reg: Region, existing: Region[]): Region {
  const taken = new Set(existing.map((r) => r.id))
  if (!taken.has(reg.id)) return reg
  let id = reg.id
  while (taken.has(id)) id = reg.id + '_' + uid('').slice(0, 4)
  return { ...reg, id }
}
function appendUniqueRegions(existing: Region[], incoming: Region[]): Region[] {
  const out = existing.slice()
  for (const reg of incoming) {
    const fixed = ensureUniqueRegionId(reg, out)
    out.push(fixed)
  }
  return out
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────
export default function WorldEconomySim({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Model>(loadModel())
  const [model, setModel] = useState<Model>(initial.current)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<'regions' | 'routes' | 'shocks'>('regions')
  const [focusRes, setFocusRes] = useState<string>(initial.current.resources[0]?.id || 'grain')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payloadDone = useRef(false)
  const libPlaces = useLibraryList('places')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(model)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.') }
  }, [model])

  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const ttl = payload && typeof payload.title === 'string' ? (payload.title as string) : ''
    const txt = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (ttl) setModel((m) => (m.title ? m : { ...m, title: ttl }))
    if (txt && txt.trim()) {
      const reg = inferRegionFromText(ttl || '넘겨받은 지역', txt)
      if (reg) {
        setModel((m) => ({ ...m, regions: appendUniqueRegions(m.regions, [reg]) }))
        flash('넘겨받은 텍스트에서 지역 성향을 추정해 새 지역을 추가했어요.')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3200)
  }

  const sim = useMemo(() => simulate(model), [model])
  const last = sim.turns[sim.turns.length - 1]
  const resById = useMemo(() => Object.fromEntries(model.resources.map((r) => [r.id, r])), [model.resources])

  // 가격 스파크라인용 범위(선택 자원, 전 지역 전 턴)
  const priceRange = useMemo(() => {
    let lo = Infinity, hi = -Infinity
    for (const ts of sim.turns) for (const rs of ts.regions) {
      const p = rs.prices[focusRes]; if (p == null) continue
      lo = Math.min(lo, p); hi = Math.max(hi, p)
    }
    if (!isFinite(lo)) { lo = 0; hi = 1 }
    if (hi - lo < 0.001) hi = lo + 1
    return { lo, hi }
  }, [sim, focusRes])

  // ── 편집 헬퍼 ──
  const upd = (fn: (m: Model) => Model) => setModel((m) => fn({ ...m }))
  const setRegion = (id: string, patch: Partial<Region>) =>
    upd((m) => ({ ...m, regions: m.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const setRegionRes = (id: string, resId: string, patch: Partial<RegionRes>) =>
    upd((m) => ({ ...m, regions: m.regions.map((r) => (r.id === id ? { ...r, res: { ...r.res, [resId]: { ...r.res[resId], ...patch } } } : r)) }))
  const addRegion = () => {
    const id = uid('r')
    const nr: Region = {
      id, name: `지역 ${model.regions.length + 1}`, population: 70, wealth: 100, currencyName: '은화', fx: 1,
      res: Object.fromEntries(model.resources.map((r) => [r.id, { produce: r.essential ? 60 : 20, consume: r.essential ? 1.0 : 0.8, stock: r.essential ? 60 : 20 }])),
    }
    upd((m) => ({ ...m, regions: [...m.regions, nr] }))
  }
  const delRegion = (id: string) =>
    upd((m) => ({ ...m, regions: m.regions.filter((r) => r.id !== id), routes: m.routes.filter((e) => e.a !== id && e.b !== id), shocks: m.shocks.filter((s) => s.regionId !== id) }))
  const addRoute = () => {
    if (model.regions.length < 2) { flash('교역로를 만들려면 지역이 2곳 이상 필요해요.'); return }
    upd((m) => ({ ...m, routes: [...m.routes, { id: uid('e'), a: m.regions[0].id, b: m.regions[1].id, capacity: 50, tariff: 0.1, risk: 0.15 }] }))
  }
  const setRoute = (id: string, patch: Partial<Route>) =>
    upd((m) => ({
      ...m,
      routes: m.routes.map((e) => {
        if (e.id !== id) return e
        const next = { ...e, ...patch }
        // 교역로는 서로 다른 두 지역을 이어야 한다 — 같은 지역 선택 차단(다른 지역으로 대체)
        if (next.a === next.b) {
          const alt = m.regions.find((r) => r.id !== next.a)
          if (!alt) return e
          if ('a' in patch) next.b = alt.id
          else next.a = alt.id
        }
        return next
      }),
    }))
  const delRoute = (id: string) => upd((m) => ({ ...m, routes: m.routes.filter((e) => e.id !== id) }))
  const addShock = () => {
    if (!model.regions.length) return
    upd((m) => ({ ...m, shocks: [...m.shocks, { id: uid('s'), turn: Math.min(m.turns, 3), kind: 'blight', regionId: m.regions[0].id, resourceId: m.resources.find((r) => r.essential)?.id, power: 55 }] }))
  }
  const setShock = (id: string, patch: Partial<Shock>) =>
    upd((m) => ({ ...m, shocks: m.shocks.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const delShock = (id: string) => upd((m) => ({ ...m, shocks: m.shocks.filter((s) => s.id !== id) }))

  const importPlaces = () => {
    if (!libPlaces.length) { flash('라이브러리에 장소가 없어요. 먼저 장소를 만들어 두세요.'); return }
    const existing = new Set(model.regions.map((r) => r.name))
    const added: Region[] = []
    for (const p of libPlaces.slice(0, 6)) {
      if (existing.has(p.name)) continue
      const text = [p.kind, p.mood, p.history, p.rules, p.notes, p.fields && Object.values(p.fields).join(' ')].filter(Boolean).join(' ')
      const reg = inferRegionFromText(p.name, text || p.name) || inferRegionFromText(p.name, p.name)
      if (reg) added.push(reg)
    }
    if (!added.length) { flash('새로 추가할 장소가 없어요(이미 등록됨).'); return }
    upd((m) => ({ ...m, regions: appendUniqueRegions(m.regions, added) }))
    flash(`라이브러리 장소 ${added.length}곳을 지역으로 등록했어요.`)
  }

  // 드롭 수용
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e); if (!item) return
    e.preventDefault()
    const body = [item.title, item.text, item.character && Object.values(item.character).join(' ')].filter(Boolean).join(' ')
    const reg = inferRegionFromText(item.title || '드롭한 지역', body || item.title || '지역')
    if (reg) { upd((m) => ({ ...m, regions: appendUniqueRegions(m.regions, [reg]) })); flash(`〈${item.title}〉의 본문에서 지역 성향을 추정해 등록했어요.`) }
    else flash('지역으로 만들 만한 내용을 찾지 못했어요.')
  }

  // ── 산출물 ──
  const worldTitle = model.title.trim() || '이름 없는 경제권'
  const summaryLines = (): string[] => {
    const L: string[] = []
    L.push(`[세계 경제] ${worldTitle}  (${model.turns}턴 시뮬)`)
    L.push('')
    L.push('— 자원 —')
    for (const r of model.resources) L.push(`· ${r.name}${r.essential ? '(필수)' : ''}: 기준가 ${r.basePrice}`)
    L.push('')
    L.push('— 지역(최종 상태) —')
    if (last) for (const rs of last.regions) {
      const fam = rs.famine > 25 ? ` 기근 ${Math.round(rs.famine)}` : ''
      L.push(`· ${rs.name}: 인구 ${Math.round(rs.population)}천 · 부 ${Math.round(rs.wealth)} · 통화가치 ${rs.fx.toFixed(2)}${fam}`)
      L.push(`    가격 → ${model.resources.map((r) => `${r.name} ${(rs.prices[r.id] || 0).toFixed(1)}`).join(' / ')}`)
    }
    L.push('')
    L.push(`— 부의 분포(지니) —  ${last ? last.giniWealth.toFixed(2) : '-'} (0=완전평등, 1=극단독점)`)
    L.push('')
    const sev = sim.events.filter((e) => e.severe)
    if (sev.length) {
      L.push('— 주요 사건 —')
      for (const e of sev.slice(0, 14)) L.push(`· ${e.turn}턴: ${e.text}`)
    } else L.push('— 주요 사건 — 큰 위기 없이 안정적으로 흘렀습니다.')
    return L
  }
  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    const P: string[] = []
    P.push(`<p style="color:#888;">세계 경제 시뮬 — ${model.turns}턴 · 지니 ${last ? last.giniWealth.toFixed(2) : '-'}</p>`)
    P.push('<h3>자원</h3><ul>')
    for (const r of model.resources) P.push(`<li>${escapeHtml(r.name)}${r.essential ? '(필수)' : ''} — 기준가 ${r.basePrice}</li>`)
    P.push('</ul><h3>지역 최종 상태</h3><ul>')
    if (last) for (const rs of last.regions) {
      P.push(`<li><b>${escapeHtml(rs.name)}</b> · 인구 ${Math.round(rs.population)}천 · 부 ${Math.round(rs.wealth)} · 통화가치 ${rs.fx.toFixed(2)}${rs.famine > 25 ? ` · 기근 ${Math.round(rs.famine)}` : ''}<br/><span style="color:#888;">${model.resources.map((r) => `${escapeHtml(r.name)} ${(rs.prices[r.id] || 0).toFixed(1)}`).join(' · ')}</span></li>`)
    }
    P.push('</ul>')
    const sev = sim.events.filter((e) => e.severe)
    if (sev.length) { P.push('<h3>주요 사건</h3><ul>'); for (const e of sev.slice(0, 16)) P.push(`<li>${e.turn}턴 — ${escapeHtml(e.text)}</li>`); P.push('</ul>') }
    return P.join('')
  }

  const addDocToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관',
      title: `경제 설정 — ${worldTitle}`,
      bodyHtml: buildHtml(),
      synopsis: `${model.turns}턴 시뮬 · 지니 ${last ? last.giniWealth.toFixed(2) : '-'} · 지역 ${model.regions.length}`,
      meta: { 지역수: String(model.regions.length), 지니계수: last ? last.giniWealth.toFixed(2) : '', 턴: String(model.turns) },
    })
    flash(id ? '프로젝트 자료 〈세계관〉 폴더에 경제 설정 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }
  const saveRegionToLibrary = (rs: RegionSnap) => {
    const fields: Record<string, string> = {}
    const has = (k: string) => PLACE_FIELDS.some((f) => f.key === k)
    if (has('name')) fields.name = rs.name
    if (has('kind')) fields.kind = '경제권 지역'
    const econ = `인구 ${Math.round(rs.population)}천 · 부 ${Math.round(rs.wealth)} · 통화가치 ${rs.fx.toFixed(2)}\n` +
      model.resources.map((r) => `${r.name} 가격 ${(rs.prices[r.id] || 0).toFixed(1)} (재고 ${Math.round(rs.stocks[r.id] || 0)})`).join('\n')
    if (has('notes')) fields.notes = econ
    if (has('dangers') && rs.famine > 25) fields.dangers = `기근 위험 ${Math.round(rs.famine)}`
    addToLibrary('places', { name: rs.name, kind: '경제권 지역', notes: econ, fields })
    flash(`〈${rs.name}〉 경제 프로필을 라이브러리 장소로 저장했어요.`)
  }
  const stashEvent = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없어요.'); return }
    const sev = sim.events.filter((e) => e.severe)[0] || sim.events[0]
    if (!sev) { flash('아직 담을 사건이 없어요.'); return }
    addToStash({ kind: 'memo', label: `경제 사건: ${sev.text}`, text: `${worldTitle} — ${sev.turn}턴\n${sev.text}` })
    flash('핵심 경제 사건을 수집함에 담았어요.')
  }
  const copyText = async () => {
    const text = summaryLines().join('\n')
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
      flash('경제 요약을 클립보드에 복사했어요.')
    } catch { flash('복사에 실패했어요.') }
  }
  const openBible = () => { openToolLinked('setting-bible', { title: worldTitle, text: summaryLines().join('\n') }); flash('설정집을 경제 요약과 함께 열었어요.') }
  const openPhysics = () => { openToolLinked('world-physics-sandbox', { title: worldTitle, text: summaryLines().join('\n') }); flash('세계 물리 샌드박스를 함께 열었어요.') }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 13.5, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const head: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }
  const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12 }
  const num: React.CSSProperties = { width: 56, boxSizing: 'border-box' }
  const tabBtn = (k: typeof tab): React.CSSProperties => ({ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, border: '1px solid var(--border)', background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? '#fff' : 'var(--text)', fontWeight: tab === k ? 700 : 500 })

  // 스파크라인 SVG(선택 자원, 지역별 라인)
  const colors = ['#5b8def', '#e0884b', '#4fae78', '#c062c0', '#d0563a', '#3aa0c0']
  const spark = () => {
    const W = 230, H = 64, pad = 4
    const n = sim.turns.length
    const x = (i: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad * 2))
    const y = (v: number) => H - pad - ((v - priceRange.lo) / (priceRange.hi - priceRange.lo)) * (H - pad * 2)
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} preserveAspectRatio="none">
        {model.regions.map((reg, ri) => {
          const pts = sim.turns.map((ts, i) => {
            const rs = ts.regions.find((x) => x.id === reg.id)
            return rs ? `${x(i).toFixed(1)},${y(rs.prices[focusRes] ?? priceRange.lo).toFixed(1)}` : ''
          }).filter(Boolean).join(' ')
          return <polyline key={reg.id} points={pts} fill="none" stroke={colors[ri % colors.length]} strokeWidth={1.6} />
        })}
      </svg>
    )
  }

  return (
    <div style={wrap} onDragOver={onDragOver} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <div style={head}>
        <div style={row}>
          <span style={titleStyle}>세계 경제 시뮬</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>지역 {model.regions.length} · 교역로 {model.routes.length}</span>
          <span style={{ fontSize: 12, color: 'var(--accent)' }} title="부의 분포(0 평등 ~ 1 독점)">지니 {last ? last.giniWealth.toFixed(2) : '-'}</span>
        </div>
        <input className="field" value={model.title} onChange={(e) => upd((m) => ({ ...m, title: e.target.value }))} placeholder="경제권 이름 (예: 삼국 교역망, 자유 도시 동맹)" style={{ width: '100%', boxSizing: 'border-box' }} aria-label="경제권 이름" />
        <div style={row}>
          <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            시뮬 턴
            <input type="range" min={2} max={40} value={model.turns} onChange={(e) => upd((m) => ({ ...m, turns: Number(e.target.value) }))} style={{ width: 120, accentColor: 'var(--accent)' }} aria-label="시뮬 턴 수" />
            <b style={{ color: 'var(--accent)' }}>{model.turns}</b>
          </label>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={importPlaces} title="라이브러리 장소를 지역으로 등록">장소 불러오기</button>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--accent)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 결과 요약 카드 */}
        <div>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <span style={sectionTitle}>가격 추이 — {resById[focusRes]?.name || ''}</span>
            <div style={row}>
              {model.resources.map((r) => (
                <button key={r.id} onClick={() => setFocusRes(r.id)} style={{ padding: '2px 8px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer', border: '1px solid var(--border)', background: focusRes === r.id ? 'var(--accent)' : 'transparent', color: focusRes === r.id ? '#fff' : 'var(--text)' }}>{r.name}</button>
              ))}
            </div>
          </div>
          <div style={{ ...card, marginTop: 7 }}>
            {spark()}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
              {model.regions.map((reg, ri) => (
                <span key={reg.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
                  <span style={{ width: 10, height: 3, background: colors[ri % colors.length], display: 'inline-block', borderRadius: 2 }} />{reg.name}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>세로축 가격 {priceRange.lo.toFixed(1)} ~ {priceRange.hi.toFixed(1)} · 가로축 1~{model.turns}턴</div>
          </div>
        </div>

        {/* 최종 상태 표 */}
        {last && (
          <div>
            <div style={sectionTitle}>최종 지역 상태 ({model.turns}턴)</div>
            <div style={{ ...card, marginTop: 7, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {last.regions.map((rs) => {
                const famColor = rs.famine > 60 ? 'var(--warn)' : rs.famine > 25 ? 'var(--accent)' : 'var(--muted)'
                return (
                  <div key={rs.id} style={{ borderLeft: `3px solid ${rs.famine > 25 ? 'var(--warn)' : 'var(--border)'}`, paddingLeft: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 13 }}>{rs.name}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>인구 {Math.round(rs.population)}천 · 부 {Math.round(rs.wealth)} · 통화 {rs.fx.toFixed(2)}</span>
                      {rs.famine > 25 && <span style={{ fontSize: 11, fontWeight: 700, color: famColor }}>기근 {Math.round(rs.famine)}</span>}
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" onClick={() => saveRegionToLibrary(rs)} title="이 지역의 경제 프로필을 라이브러리 장소로 저장">장소로</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {model.resources.map((r) => {
                        const p = rs.prices[r.id] || 0
                        const ratio = p / r.basePrice
                        const col = ratio > 3 ? 'var(--warn)' : ratio > 1.6 ? 'var(--accent)' : 'var(--muted)'
                        return <span key={r.id} style={{ fontSize: 11.5 }}>{r.name} <b style={{ color: col }}>{p.toFixed(1)}</b><span style={{ color: 'var(--muted)', fontSize: 10 }}> ({ratio.toFixed(1)}x)</span></span>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 사건 로그 */}
        <div>
          <div style={sectionTitle}>사건 연대기</div>
          <div style={{ ...card, marginTop: 7, maxHeight: 130, overflow: 'auto' }}>
            {sim.events.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>큰 위기 없이 안정적으로 흘렀습니다. 충격(흉작·봉쇄 등)을 넣거나 교역로 관세/위험을 높여 위기를 만들어 보세요.</div>
            ) : (
              sim.events.map((e, i) => (
                <div key={i} style={{ fontSize: 11.8, lineHeight: 1.7, color: e.severe ? 'var(--warn)' : 'var(--text)' }}>
                  <b style={{ color: 'var(--muted)', marginRight: 6 }}>{e.turn}턴</b>{e.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 편집 탭 */}
        <div>
          <div style={{ ...row, gap: 6 }}>
            <button style={tabBtn('regions')} onClick={() => setTab('regions')}>지역 ({model.regions.length})</button>
            <button style={tabBtn('routes')} onClick={() => setTab('routes')}>교역로 ({model.routes.length})</button>
            <button style={tabBtn('shocks')} onClick={() => setTab('shocks')}>충격 ({model.shocks.length})</button>
          </div>

          {tab === 'regions' && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.regions.length === 0 && <div style={{ ...card, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>아직 지역이 없어요. 아래 버튼으로 추가하거나, 좌측 바인더 문서를 이 창에 끌어다 놓거나, 라이브러리 장소를 불러오세요.</div>}
              {model.regions.map((reg) => (
                <div key={reg.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
                    <input className="field" value={reg.name} onChange={(e) => setRegion(reg.id, { name: e.target.value })} style={{ flex: 1, minWidth: 90, boxSizing: 'border-box' }} aria-label="지역 이름" />
                    <input className="field" value={reg.currencyName} onChange={(e) => setRegion(reg.id, { currencyName: e.target.value })} style={{ width: 70, boxSizing: 'border-box' }} title="통화 이름" aria-label="통화 이름" />
                    <button className="minibtn" onClick={() => delRegion(reg.id)} title="지역 삭제">삭제</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8, fontSize: 11.5, color: 'var(--muted)' }}>
                    <label>인구(천) <input type="number" min={1} value={Math.round(reg.population)} onChange={(e) => setRegion(reg.id, { population: Math.max(1, Number(e.target.value) || 0) })} style={num} /></label>
                    <label>부 <input type="number" min={0} value={Math.round(reg.wealth)} onChange={(e) => setRegion(reg.id, { wealth: Math.max(0, Number(e.target.value) || 0) })} style={num} /></label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px', gap: 6, fontSize: 10.5, color: 'var(--muted)' }}>
                      <span>자원</span><span>생산</span><span>소비계수</span><span>재고</span>
                    </div>
                    {model.resources.map((r) => {
                      const rr = reg.res[r.id] || { produce: 0, consume: 1, stock: 0 }
                      return (
                        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12 }}>{r.name}{r.essential ? '*' : ''}</span>
                          <input type="number" min={0} value={Math.round(rr.produce)} onChange={(e) => setRegionRes(reg.id, r.id, { produce: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 52 }} />
                          <input type="number" min={0} step={0.1} value={Number(rr.consume.toFixed(2))} onChange={(e) => setRegionRes(reg.id, r.id, { consume: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 52 }} />
                          <input type="number" min={0} value={Math.round(rr.stock)} onChange={(e) => setRegionRes(reg.id, r.id, { stock: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 52 }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button className="minibtn" onClick={addRegion} style={{ alignSelf: 'flex-start' }}>+ 지역 추가</button>
            </div>
          )}

          {tab === 'routes' && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.routes.length === 0 && <div style={{ ...card, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>교역로가 없으면 각 지역은 고립되어 가격이 따로 움직여요. 두 지역을 잇는 길을 만들어 자원이 비싼 곳으로 흐르게 하세요.</div>}
              {model.routes.map((e) => (
                <div key={e.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <select className="field" value={e.a} onChange={(ev) => setRoute(e.id, { a: ev.target.value })} style={{ flex: 1, minWidth: 80 }} aria-label="출발 지역">
                      {model.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <span style={{ color: 'var(--muted)' }}>~</span>
                    <select className="field" value={e.b} onChange={(ev) => setRoute(e.id, { b: ev.target.value })} style={{ flex: 1, minWidth: 80 }} aria-label="도착 지역">
                      {model.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button className="minibtn" onClick={() => delRoute(e.id)}>삭제</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
                    <label>용량 <input type="number" min={0} value={Math.round(e.capacity)} onChange={(ev) => setRoute(e.id, { capacity: Math.max(0, Number(ev.target.value) || 0) })} style={num} /></label>
                    <label>관세 <input type="number" min={0} max={0.6} step={0.02} value={Number(e.tariff.toFixed(2))} onChange={(ev) => setRoute(e.id, { tariff: Math.max(0, Math.min(0.6, Number(ev.target.value) || 0)) })} style={num} /></label>
                    <label>위험 <input type="number" min={0} max={0.5} step={0.02} value={Number(e.risk.toFixed(2))} onChange={(ev) => setRoute(e.id, { risk: Math.max(0, Math.min(0.5, Number(ev.target.value) || 0)) })} style={num} /></label>
                  </div>
                </div>
              ))}
              <button className="minibtn" onClick={addRoute} style={{ alignSelf: 'flex-start' }}>+ 교역로 추가</button>
            </div>
          )}

          {tab === 'shocks' && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.shocks.length === 0 && <div style={{ ...card, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>충격은 특정 턴에 일어나는 사건이에요. 흉작·봉쇄·신광맥·역병을 넣어 경제가 어떻게 출렁이는지(파급 효과) 보세요.</div>}
              {model.shocks.map((s) => (
                <div key={s.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 11.5, color: 'var(--muted)' }}>턴 <input type="number" min={1} max={model.turns} value={s.turn} onChange={(e) => setShock(s.id, { turn: Math.max(1, Math.min(model.turns, Number(e.target.value) || 1)) })} style={{ width: 46 }} /></label>
                    <select className="field" value={s.kind} onChange={(e) => setShock(s.id, { kind: e.target.value as ShockKind })} aria-label="충격 종류">
                      {(['blight', 'blockade', 'lode', 'plague'] as ShockKind[]).map((k) => <option key={k} value={k}>{SHOCK_LABEL[k]}</option>)}
                    </select>
                    <select className="field" value={s.regionId} onChange={(e) => setShock(s.id, { regionId: e.target.value })} style={{ flex: 1, minWidth: 80 }} aria-label="대상 지역">
                      {model.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button className="minibtn" onClick={() => delShock(s.id)}>삭제</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 11.5, color: 'var(--muted)', alignItems: 'center' }}>
                    {(s.kind === 'blight' || s.kind === 'lode') && (
                      <label>자원
                        <select className="field" value={s.resourceId || ''} onChange={(e) => setShock(s.id, { resourceId: e.target.value })} style={{ marginLeft: 4 }} aria-label="대상 자원">
                          {model.resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>강도
                      <input type="range" min={0} max={100} value={s.power} onChange={(e) => setShock(s.id, { power: Number(e.target.value) })} style={{ width: 90, accentColor: 'var(--accent)' }} />
                      <b style={{ color: 'var(--accent)' }}>{s.power}</b>
                    </label>
                  </div>
                </div>
              ))}
              <button className="minibtn" onClick={addShock} style={{ alignSelf: 'flex-start' }}>+ 충격 추가</button>
            </div>
          )}
        </div>

        {/* 산출/연계 */}
        <div>
          <div style={sectionTitle}>내보내기 · 연계</div>
          <div className="linkbar" style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="linkbtn" onClick={addDocToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '경제 설정+시뮬 요약을 자료 〈세계관〉에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>프로젝트에 추가</button>
            <button className="linkbtn" onClick={stashEvent} disabled={!hasStash()} title="핵심 경제 사건을 수집함 메모로">수집함에 담기</button>
            <button className="linkbtn" onClick={openBible} title="설정집을 경제 요약과 함께 열기">설정집 열기</button>
            <button className="linkbtn" onClick={openPhysics} title="세계 물리 샌드박스를 함께 열기">물리 샌드박스</button>
            <button className="minibtn" onClick={copyText} title="경제 요약 전체를 클립보드로 복사">복사</button>
          </div>
          <div className="license-note" style={{ marginTop: 9, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            시뮬은 전적으로 브라우저 안에서 결정론적으로 계산됩니다(네트워크 없음). 같은 설정이면 항상 같은 결과가 나옵니다.
            이 모형은 현실 경제의 단순화로, 가격은 수급비로, 교역은 가격차가 운임·관세·위험을 넘을 때 일어나며, 필수재 부족은 기근으로 이어집니다 — 이야기의 갈등 씨앗을 찾는 데 쓰세요.
          </div>
        </div>
      </div>
    </div>
  )
}
