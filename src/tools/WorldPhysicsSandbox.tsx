// 세계 물리 샌드박스 — 작품 세계의 '규칙'을 슬라이더로 정의하면, 규칙들 사이의 논리적 귀결과
//   모순을 결정론적 추론 엔진으로 도출해 경고/제안한다. (서버 없음 · 전부 브라우저 로컬 계산)
//
//   동작 개요
//   1) 12개 세계 변수 슬라이더(마법 비용·마법 보급률·기술 수준·자원 희소성·치사율 등)를 0~100 으로 조절.
//   2) 규칙 엔진(RULES)이 변수 조합을 검사해 다음을 산출한다:
//        - 모순(contradiction): 양립 불가한 설정 → 강한 경고 + 해소 방향
//        - 긴장(tension): 위태롭지만 설명 가능한 설정 → 주의 + 설계 질문
//        - 귀결(implication): 자연스럽게 따라오는 세계의 모습 → 빠뜨리기 쉬운 디테일 체크
//   3) 파생 지표(권력 집중도·일상 변화도·갈등 잠재력·세계 안정도)를 변수에서 합성해 게이지로 시각화.
//   4) 프리셋(하이판타지/로우판타지/사이버펑크/포스트아포칼립스/스팀펑크)으로 빠르게 출발.
//
//   연동(linkbus)
//   - useLibraryList('places') : 라이브러리의 장소를 불러와 그 규칙 메모(fields.rules)를 시드로 흡수.
//   - getDragItem/isItemDrag   : 좌측 바인더 문서를 드롭하면 본문 텍스트에서 키워드를 읽어 변수 자동 추정.
//   - payload.text             : 다른 도구가 넘긴 텍스트도 동일하게 흡수.
//   - addToLibrary('places')   : 규칙집을 PLACE_FIELDS 형식의 '세계 규칙' 장소 카드로 라이브러리에 저장.
//   - addToProject(...)        : 규칙집 + 진단 결과를 자료 〈세계관〉 폴더에 text 문서로 추가.
//   - addToStash(...)          : 핵심 모순/귀결을 수집함 메모로 담기.
//   - openToolLinked(...)      : 설정집/세계관 위키 등 관련 도구를 데이터와 함께 열기.
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
  id: 'world-physics-sandbox',
  name: '세계 물리 샌드박스',
  icon: '🧪',
  group: '세계관',
  intro: '세계 규칙을 슬라이더로 정의하면 논리적 귀결과 모순을 추론해 알려줍니다',
  w: 460,
  h: 640,
}

const LS_KEY = 'sry:tool:world-physics-sandbox'

// ── 세계 변수(슬라이더) 정의 ────────────────────────────────────────────────
interface Axis {
  key: string
  label: string
  lo: string // 0 쪽 의미
  hi: string // 100 쪽 의미
  desc: string
}
const AXES: Axis[] = [
  { key: 'magicPower', label: '마법의 위력', lo: '미미함', hi: '현실 개편급', desc: '마법이 일으킬 수 있는 효과의 최대치' },
  { key: 'magicCost', label: '마법의 대가', lo: '공짜', hi: '치명적 희생', desc: '마법을 쓸 때 치르는 비용(생명·수명·정신 등)' },
  { key: 'magicAccess', label: '마법의 보급', lo: '극소수', hi: '만인', desc: '마법을 쓸 수 있는 사람의 비율' },
  { key: 'techLevel', label: '기술 수준', lo: '원시', hi: '초고도', desc: '도구·운송·통신·의술의 발달 정도' },
  { key: 'scarcity', label: '자원 희소성', lo: '풍요', hi: '극빈', desc: '식량·물·핵심 자원의 부족 정도' },
  { key: 'lethality', label: '세계의 치사율', lo: '안전', hi: '죽음이 흔함', desc: '평범한 사람이 죽기 쉬운 정도' },
  { key: 'centralPower', label: '권력 집중', lo: '분권', hi: '절대권력', desc: '권력이 한 곳에 모여 있는 정도' },
  { key: 'mobility', label: '이동의 자유', lo: '고립', hi: '즉시 어디든', desc: '먼 거리 이동의 용이함' },
  { key: 'lifespan', label: '평균 수명', lo: '단명', hi: '거의 불멸', desc: '사람들이 사는 평균적인 길이' },
  { key: 'monsters', label: '위협 생물', lo: '없음', hi: '도처에 위험', desc: '괴물·맹수·이형 존재의 위협도' },
  { key: 'communication', label: '정보 전파', lo: '소문 수준', hi: '즉시 전세계', desc: '소식이 퍼지는 속도와 범위' },
  { key: 'death', label: '죽음의 영속성', lo: '되돌릴 수 있음', hi: '절대적', desc: '죽은 자를 되살릴 수 있는가' },
]
const AXIS_KEYS = AXES.map((a) => a.key)
type Vars = Record<string, number>

const defaultVars = (): Vars => Object.fromEntries(AXIS_KEYS.map((k) => [k, 50])) as Vars

// ── 프리셋 ──────────────────────────────────────────────────────────────────
interface Preset { id: string; name: string; vars: Partial<Vars> }
const PRESETS: Preset[] = [
  { id: 'high', name: '하이 판타지', vars: { magicPower: 85, magicCost: 30, magicAccess: 45, techLevel: 25, scarcity: 35, lethality: 55, centralPower: 60, mobility: 55, lifespan: 60, monsters: 70, communication: 40, death: 35 } },
  { id: 'low', name: '로우 판타지', vars: { magicPower: 35, magicCost: 70, magicAccess: 15, techLevel: 35, scarcity: 55, lethality: 60, centralPower: 55, mobility: 30, lifespan: 40, monsters: 45, communication: 25, death: 75 } },
  { id: 'cyber', name: '사이버펑크', vars: { magicPower: 5, magicCost: 50, magicAccess: 5, techLevel: 95, scarcity: 60, lethality: 55, centralPower: 80, mobility: 85, lifespan: 65, monsters: 20, communication: 95, death: 60 } },
  { id: 'post', name: '포스트아포칼립스', vars: { magicPower: 15, magicCost: 60, magicAccess: 10, techLevel: 40, scarcity: 90, lethality: 85, centralPower: 25, mobility: 25, lifespan: 30, monsters: 75, communication: 20, death: 90 } },
  { id: 'steam', name: '스팀펑크', vars: { magicPower: 25, magicCost: 50, magicAccess: 20, techLevel: 60, scarcity: 45, lethality: 50, centralPower: 70, mobility: 60, lifespan: 50, monsters: 35, communication: 55, death: 70 } },
]

// ── 규칙 엔진 ────────────────────────────────────────────────────────────────
// 각 규칙은 변수(v)를 받아 적용 강도(weight 0~1)와 한 줄 메시지를 돌려준다(또는 null).
type Severity = 'contradiction' | 'tension' | 'implication'
interface Finding { id: string; sev: Severity; title: string; detail: string; weight: number; ask?: string }
interface Rule { id: string; sev: Severity; run: (v: Vars) => { weight: number; detail: string; ask?: string } | null; title: string }

// 보조: 높음/낮음 판정 + 정도 환산
const hi = (x: number, t = 65) => x >= t
const lo = (x: number, t = 35) => x <= t
// 두 조건이 함께 강할수록 1 에 가까운 가중치
const both = (a: number, b: number) => Math.max(0, Math.min(1, (a / 100) * (b / 100)))
// a 는 높고 b 는 낮을수록 강함
const hiLo = (a: number, b: number) => Math.max(0, Math.min(1, (a / 100) * ((100 - b) / 100)))

const RULES: Rule[] = [
  // ── 모순(contradiction): 양립하기 매우 어려운 조합 ──
  {
    id: 'cheap-strong-magic-feudal', sev: 'contradiction', title: '값싼 강대 마법 + 봉건적 권력',
    run: (v) => {
      const m = both(v.magicPower, v.magicAccess) * ((100 - v.magicCost) / 100)
      if (hi(v.magicPower) && hi(v.magicAccess) && lo(v.magicCost) && lo(v.centralPower, 45))
        return { weight: m, detail: '거의 누구나 큰 대가 없이 강력한 마법을 쓰는데 권력이 분산되어 있습니다. 무력의 독점이 깨진 세계에서 분권이 유지되긴 어렵습니다 — 마법 능력자들이 곧 권력을 재편할 것입니다.', ask: '마법을 쓰는 자들이 왜 권력을 잡지 않았는가? (금기·종교·억제 장치)' }
      return null
    },
  },
  {
    id: 'easy-resurrection-high-lethality', sev: 'contradiction', title: '되살아나는 세계인데 치사율이 의미를 가짐',
    run: (v) => {
      const w = hiLo(v.lethality, v.death) * (v.magicPower / 100)
      if (lo(v.death, 30) && hi(v.lethality) && hi(v.magicPower, 50))
        return { weight: w, detail: '죽음을 쉽게 되돌릴 수 있는데 치사율이 높습니다. 죽음이 사소하다면 위험·전쟁·살인의 무게가 사라져 긴장이 붕괴합니다.', ask: '되살림에 어떤 제약(횟수·대가·후유증)을 둘 것인가?' }
      return null
    },
  },
  {
    id: 'instant-comm-isolated', sev: 'contradiction', title: '즉시 통신 + 고립된 이동',
    run: (v) => {
      const w = hiLo(v.communication, v.mobility)
      if (hi(v.communication, 80) && lo(v.mobility, 25))
        return { weight: w, detail: '정보는 순식간에 전세계로 퍼지는데 사람·물자의 이동은 극도로 느립니다. 보통 통신과 운송은 비슷한 기술 토대를 공유하므로 한쪽만 발달하긴 어렵습니다.', ask: '통신만 가능케 한 특수 매개(영적 연결·고대 유물)는 무엇인가?' }
      return null
    },
  },
  {
    id: 'immortal-overpopulation', sev: 'contradiction', title: '거의 불멸 + 풍요로운 자원',
    run: (v) => {
      const w = both(v.lifespan, (100 - v.scarcity))
      if (hi(v.lifespan, 80) && lo(v.scarcity, 25) && lo(v.lethality, 35))
        return { weight: w, detail: '사람이 거의 죽지 않고 자원도 풍부하며 위험도 적습니다. 이런 세계는 급격한 인구 폭증을 겪어야 하는데, 그러면 곧 자원이 희소해집니다 — 설정이 스스로를 부정합니다.', ask: '인구를 무엇이 억제하는가? (출산 제한·주기적 재앙·이주)' }
      return null
    },
  },
  {
    id: 'hitech-scarce-static', sev: 'contradiction', title: '초고도 기술인데 극심한 자원난이 방치됨',
    run: (v) => {
      const w = both(v.techLevel, v.scarcity)
      if (hi(v.techLevel, 80) && hi(v.scarcity, 75))
        return { weight: w * 0.9, detail: '기술이 극도로 발달했는데 기본 자원이 극심하게 부족합니다. 가능은 하나(분배 실패·인위적 통제), 단순한 기술 부족으로는 설명되지 않습니다 — 누군가 의도적으로 희소성을 유지하고 있어야 합니다.', ask: '누가, 왜 풍요를 막는가? (독점 기업·통제 국가)' }
      return null
    },
  },
  // ── 긴장(tension): 위태롭지만 설명 가능 ──
  {
    id: 'magic-vs-tech', sev: 'tension', title: '강대 마법과 고도 기술의 공존',
    run: (v) => {
      const w = both(v.magicPower, v.techLevel)
      if (hi(v.magicPower) && hi(v.techLevel))
        return { weight: w, detail: '강력한 마법과 고도 기술이 동시에 발달했습니다. 보통 한쪽이 다른 쪽의 발전 동기를 잠식하므로, 둘이 왜 함께 발달했는지 설명이 필요합니다.', ask: '마법과 기술은 경쟁하는가, 융합되는가, 분리된 영역인가?' }
      return null
    },
  },
  {
    id: 'high-access-low-cost', sev: 'tension', title: '보급된 저비용 마법의 경제 충격',
    run: (v) => {
      const w = hiLo(v.magicAccess, v.magicCost)
      if (hi(v.magicAccess, 55) && lo(v.magicCost, 35))
        return { weight: w, detail: '대가가 적고 널리 쓰이는 마법은 노동·운송·치료·전쟁의 비용을 무너뜨립니다. 기존 산업·직업 구조가 통째로 재편되어야 합니다.', ask: '마법으로 대체된 직업과, 그래도 마법이 못 하는 일은 무엇인가?' }
      return null
    },
  },
  {
    id: 'scarcity-low-conflict', sev: 'tension', title: '극심한 자원난에 비해 낮은 갈등 동력',
    run: (v) => {
      const w = both(v.scarcity, (100 - v.lethality))
      if (hi(v.scarcity, 75) && lo(v.lethality, 35) && lo(v.monsters, 35))
        return { weight: w, detail: '자원은 극도로 부족한데 세계는 평화롭고 안전합니다. 결핍은 보통 분쟁을 낳으므로, 평화를 지탱하는 강력한 질서나 분배 기제가 필요합니다.', ask: '무엇이 자원 전쟁을 막는가? (강력한 통치·문화적 금기·외부 위협)' }
      return null
    },
  },
  {
    id: 'central-power-low-comm', sev: 'tension', title: '절대권력 + 느린 정보 전파',
    run: (v) => {
      const w = hiLo(v.centralPower, v.communication)
      if (hi(v.centralPower, 70) && lo(v.communication, 30))
        return { weight: w, detail: '권력은 고도로 집중됐는데 정보 전파가 느립니다. 중앙이 변방을 실시간 통제하기 어려워, 지방의 자율·반란·부패가 싹틀 여지가 큽니다.', ask: '중앙은 멀리 떨어진 영토를 어떻게 장악하는가? (감시 마법·관료·인질)' }
      return null
    },
  },
  {
    id: 'long-life-young-power', sev: 'tension', title: '긴 수명과 세대 교체',
    run: (v) => {
      const w = (v.lifespan / 100) * (v.centralPower / 100)
      if (hi(v.lifespan, 70) && hi(v.centralPower, 55))
        return { weight: w, detail: '수명이 길고 권력이 집중되면, 권력자가 죽지 않아 세대 교체가 막힙니다. 젊은 세대의 좌절과 정체된 사회 구조가 갈등의 씨앗이 됩니다.', ask: '오래 사는 권력자에 맞서는 젊은 세대의 동력은 무엇인가?' }
      return null
    },
  },
  // ── 귀결(implication): 자연스럽게 따라오는 세계의 모습 ──
  {
    id: 'high-cost-magic-elite', sev: 'implication', title: '비싼 마법 → 비밀주의·소수 엘리트',
    run: (v) => {
      const w = hiLo(v.magicCost, v.magicAccess)
      if (hi(v.magicCost, 60) && lo(v.magicAccess, 40))
        return { weight: w, detail: '대가가 크고 보급이 적은 마법은 소수 엘리트의 전유물이 됩니다 — 비전(秘傳) 가문, 폐쇄적 학파, 마법을 둘러싼 계급 격차와 금서 문화가 자연히 생깁니다.', ask: '마법을 독점한 집단과 그들을 견제하는 힘을 그렸는가?' }
      return null
    },
  },
  {
    id: 'monsters-settlement', sev: 'implication', title: '위협 생물 → 방어 중심 정착 구조',
    run: (v) => {
      const w = (v.monsters / 100) * (v.lethality / 100)
      if (hi(v.monsters, 60))
        return { weight: w, detail: '위협 생물이 많은 세계는 성벽 도시·호위 직업·야간 통금·안전지대 경제가 발달합니다. 도시 바깥 여행은 사치이자 모험이 됩니다.', ask: '사람들은 어디에, 어떻게 안전하게 모여 사는가?' }
      return null
    },
  },
  {
    id: 'high-mobility-culture', sev: 'implication', title: '이동의 자유 → 균질화된 문화·교역 번성',
    run: (v) => {
      const w = both(v.mobility, v.communication)
      if (hi(v.mobility, 70))
        return { weight: w, detail: '이동이 자유로우면 문화·언어·상품이 빠르게 섞여 지역색이 옅어지고 거대 교역망이 형성됩니다. 반대로 고립된 지역만이 독특함을 지킵니다.', ask: '쉽게 오갈 수 있음에도 분리된 채 남은 지역과 그 이유는?' }
      return null
    },
  },
  {
    id: 'low-tech-religion', sev: 'implication', title: '낮은 기술 + 위력적 마법 → 신앙화',
    run: (v) => {
      const w = hiLo(v.magicPower, v.techLevel)
      if (hi(v.magicPower, 60) && lo(v.techLevel, 40))
        return { weight: w, detail: '설명되지 않는 강력한 힘은 종교·신화로 흡수됩니다. 마법사는 사제나 성인으로, 마법 현상은 신의 권능으로 해석되는 신앙 중심 사회가 됩니다.', ask: '마법을 둘러싼 신앙·교단·이단은 어떻게 짜여 있는가?' }
      return null
    },
  },
  {
    id: 'death-permanent-stakes', sev: 'implication', title: '절대적 죽음 → 무게 있는 위험',
    run: (v) => {
      const w = (v.death / 100) * (v.lethality / 100)
      if (hi(v.death, 70) && hi(v.lethality, 50))
        return { weight: w, detail: '죽음이 절대적이고 세계가 위험하면 모든 선택에 무게가 실립니다 — 신중한 인물, 값진 희생, 상실의 정서가 이야기의 중심에 놓이기 좋습니다.', ask: '주요 인물의 죽음을 어떤 의미로 쓸 것인가?' }
      return null
    },
  },
  {
    id: 'hi-comm-control', sev: 'implication', title: '즉시 정보 전파 → 감시와 여론',
    run: (v) => {
      const w = (v.communication / 100) * (v.centralPower / 100)
      if (hi(v.communication, 75))
        return { weight: w, detail: '정보가 즉시 퍼지는 세계에서는 비밀 유지가 어렵고 여론·선전·검열이 핵심 권력이 됩니다. 진실과 거짓의 속도전이 갈등의 무대가 됩니다.', ask: '누가 정보의 흐름을 통제하며, 진실은 어떻게 묻히는가?' }
      return null
    },
  },
  {
    id: 'scarcity-economy', sev: 'implication', title: '높은 희소성 → 자원이 곧 권력',
    run: (v) => {
      const w = v.scarcity / 100
      if (hi(v.scarcity, 65))
        return { weight: w, detail: '핵심 자원이 부족하면 그것을 쥔 자가 권력을 갖습니다 — 배급제, 암시장, 자원을 둘러싼 동맹과 전쟁이 정치의 중심이 됩니다.', ask: '가장 귀한 자원은 무엇이고 누가 그것을 통제하는가?' }
      return null
    },
  },
]

// ── 파생 지표 ────────────────────────────────────────────────────────────────
interface Metric { key: string; label: string; value: number; hint: string }
function computeMetrics(v: Vars): Metric[] {
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
  // 권력 집중도: 중앙권력 + 마법/자원 독점 경향
  const power = clamp(v.centralPower * 0.5 + (100 - v.magicAccess) * 0.2 + v.scarcity * 0.2 + (100 - v.communication) * 0.1)
  // 일상 변화도: 마법·기술이 일상을 얼마나 바꿨는가
  const daily = clamp((v.magicPower * (v.magicAccess / 100)) * 0.45 + v.techLevel * 0.4 + v.mobility * 0.15)
  // 갈등 잠재력 (죽음의 영속성이 높을수록 위험의 무게가 커져 갈등 동력이 커진다)
  const conflict = clamp(v.scarcity * 0.30 + v.lethality * 0.22 + v.monsters * 0.18 + v.death * 0.12 + v.centralPower * 0.18)
  // 세계 안정도(높을수록 안정) — 위험·결핍·격동의 역수
  const stability = clamp(100 - (v.lethality * 0.3 + v.scarcity * 0.3 + v.monsters * 0.2 + (100 - v.centralPower) * 0.2))
  return [
    { key: 'power', label: '권력 집중도', value: power, hint: '권력이 소수에게 쏠린 정도' },
    { key: 'daily', label: '일상 변화도', value: daily, hint: '마법·기술이 보통 사람의 삶을 바꾼 정도' },
    { key: 'conflict', label: '갈등 잠재력', value: conflict, hint: '이야기 동력이 될 긴장의 총량' },
    { key: 'stability', label: '세계 안정도', value: stability, hint: '세계가 스스로를 유지하는 힘' },
  ]
}

function runEngine(v: Vars): Finding[] {
  const out: Finding[] = []
  for (const r of RULES) {
    const res = r.run(v)
    if (res && res.weight > 0.04) {
      out.push({ id: r.id, sev: r.sev, title: r.title, detail: res.detail, ask: res.ask, weight: res.weight })
    }
  }
  // 모순 → 긴장 → 귀결 순, 같은 등급 안에서는 가중치 큰 순
  const order: Record<Severity, number> = { contradiction: 0, tension: 1, implication: 2 }
  out.sort((a, b) => order[a.sev] - order[b.sev] || b.weight - a.weight)
  return out
}

// ── 텍스트 → 변수 추정(드롭/payload 흡수) ─────────────────────────────────────
// 키워드 빈도로 관련 변수를 ±한다. 결정론적(입력 동일 → 결과 동일).
const KEYWORD_HINTS: { re: RegExp; key: string; delta: number }[] = [
  { re: /마법|주문|마력|마술|마나/g, key: 'magicPower', delta: 8 },
  { re: /대가|희생|반동|부작용|저주/g, key: 'magicCost', delta: 8 },
  { re: /누구나|만인|보편|흔한 마법/g, key: 'magicAccess', delta: 10 },
  { re: /기술|기계|엔진|컴퓨터|로봇|증기/g, key: 'techLevel', delta: 8 },
  { re: /기근|부족|결핍|배급|황무지|폐허/g, key: 'scarcity', delta: 9 },
  { re: /전쟁|죽음|학살|역병|위험|치명/g, key: 'lethality', delta: 7 },
  { re: /황제|왕|독재|제국|절대|통치/g, key: 'centralPower', delta: 7 },
  { re: /순간이동|포탈|관문|텔레포트|비행/g, key: 'mobility', delta: 9 },
  { re: /불멸|장수|영생|영원한 삶/g, key: 'lifespan', delta: 10 },
  { re: /괴물|마수|몬스터|이형|드래곤|언데드/g, key: 'monsters', delta: 8 },
  { re: /통신|전신|네트워크|소식|방송/g, key: 'communication', delta: 8 },
  { re: /부활|되살|소생|환생|리치/g, key: 'death', delta: -10 },
]
function inferFromText(text: string, base: Vars): { vars: Vars; hits: number } {
  const t = String(text || '')
  if (!t.trim()) return { vars: base, hits: 0 }
  const next = { ...base }
  let hits = 0
  for (const h of KEYWORD_HINTS) {
    h.re.lastIndex = 0
    const m = t.match(h.re)
    if (m && m.length) {
      const bump = Math.min(3, m.length) * h.delta
      next[h.key] = Math.max(0, Math.min(100, next[h.key] + bump))
      hits += m.length
    }
  }
  return { vars: next, hits }
}

// ── 저장/복원 ────────────────────────────────────────────────────────────────
interface Saved { vars: Vars; title: string }
function loadSaved(): Saved {
  const fallback: Saved = { vars: defaultVars(), title: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback
    const v = defaultVars()
    const pv = (p as { vars?: unknown }).vars
    if (pv && typeof pv === 'object') {
      for (const k of AXIS_KEYS) {
        const n = (pv as Record<string, unknown>)[k]
        if (typeof n === 'number' && isFinite(n)) v[k] = Math.max(0, Math.min(100, Math.round(n)))
      }
    }
    const title = typeof (p as { title?: unknown }).title === 'string' ? (p as { title: string }).title : ''
    return { vars: v, title }
  } catch {
    return fallback
  }
}

const SEV_META: Record<Severity, { label: string; color: string; bg: string; mark: string }> = {
  contradiction: { label: '모순', color: 'var(--warn)', bg: 'rgba(220,80,80,0.10)', mark: '!!' },
  tension: { label: '긴장', color: 'var(--accent)', bg: 'rgba(120,140,220,0.10)', mark: '!' },
  implication: { label: '귀결', color: 'var(--ok)', bg: 'rgba(80,180,120,0.10)', mark: '→' },
}

export default function WorldPhysicsSandbox({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Saved>(loadSaved())
  const [vars, setVars] = useState<Vars>(initial.current.vars)
  const [title, setTitle] = useState<string>(initial.current.title)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showImpl, setShowImpl] = useState(true)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payloadDone = useRef(false)

  const libPlaces = useLibraryList('places')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ vars, title }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.')
    }
  }, [vars, title])

  // payload.text 1회 흡수
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const txt = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (txt && txt.trim()) {
      const { vars: nv, hits } = inferFromText(txt, vars)
      if (hits > 0) {
        setVars(nv)
        flash(`넘겨받은 텍스트에서 키워드 ${hits}개를 읽어 변수를 추정했어요.`)
      }
    }
    const ttl = payload && typeof payload.title === 'string' ? (payload.title as string) : ''
    if (ttl && !title) setTitle(ttl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3000)
  }

  const findings = useMemo(() => runEngine(vars), [vars])
  const metrics = useMemo(() => computeMetrics(vars), [vars])
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { contradiction: 0, tension: 0, implication: 0 }
    for (const f of findings) c[f.sev]++
    return c
  }, [findings])
  const shownFindings = showImpl ? findings : findings.filter((f) => f.sev !== 'implication')

  const setVar = (k: string, n: number) => setVars((p) => ({ ...p, [k]: Math.max(0, Math.min(100, Math.round(n))) }))

  const applyPreset = (p: Preset) => {
    setVars({ ...defaultVars(), ...p.vars } as Vars)
    flash(`프리셋 〈${p.name}〉을 적용했어요. 슬라이더를 조정해 당신의 세계로 다듬어 보세요.`)
  }

  const resetAll = () => { setVars(defaultVars()); flash('모든 변수를 중간값으로 되돌렸어요.') }

  // 라이브러리 장소의 규칙 메모를 흡수
  const seedFromPlaces = () => {
    const texts = libPlaces
      .map((p) => [p.rules, p.history, p.notes, p.fields && p.fields.rules, p.fields && p.fields.history].filter(Boolean).join(' '))
      .join(' ')
    if (!texts.trim()) { flash('라이브러리 장소에 규칙/역사 메모가 없어요.'); return }
    const { vars: nv, hits } = inferFromText(texts, vars)
    if (hits > 0) { setVars(nv); flash(`장소 ${libPlaces.length}곳의 메모에서 키워드 ${hits}개를 읽어 반영했어요.`) }
    else flash('장소 메모에서 인식할 키워드를 찾지 못했어요.')
  }

  // 드롭 수용
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) }
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const body = [item.title, item.text, item.character && Object.values(item.character).join(' ')].filter(Boolean).join(' ')
    const { vars: nv, hits } = inferFromText(body, vars)
    if (!title && item.title) setTitle(item.title)
    if (hits > 0) { setVars(nv); flash(`〈${item.title}〉에서 키워드 ${hits}개를 읽어 변수를 추정했어요.`) }
    else flash(`〈${item.title}〉에서 인식할 키워드를 찾지 못했어요.`)
  }

  // ── 산출물 빌더 ──
  const worldTitle = (title.trim() || '이름 없는 세계')
  const buildRuleText = (): string => {
    const lines: string[] = []
    lines.push(`[세계 규칙] ${worldTitle}`)
    lines.push('')
    lines.push('— 세계 변수 —')
    for (const a of AXES) {
      const val = vars[a.key]
      const dir = val >= 50 ? a.hi : a.lo
      lines.push(`· ${a.label}: ${val} (${dir})`)
    }
    lines.push('')
    lines.push('— 파생 지표 —')
    for (const m of metrics) lines.push(`· ${m.label}: ${m.value}`)
    lines.push('')
    if (counts.contradiction) {
      lines.push('— 해소가 필요한 모순 —')
      for (const f of findings.filter((x) => x.sev === 'contradiction')) {
        lines.push(`[모순] ${f.title}`)
        lines.push(`  ${f.detail}`)
        if (f.ask) lines.push(`  설계 질문: ${f.ask}`)
      }
      lines.push('')
    }
    if (counts.tension) {
      lines.push('— 설명이 필요한 긴장 —')
      for (const f of findings.filter((x) => x.sev === 'tension')) {
        lines.push(`[긴장] ${f.title}`)
        lines.push(`  ${f.detail}`)
        if (f.ask) lines.push(`  설계 질문: ${f.ask}`)
      }
      lines.push('')
    }
    if (counts.implication) {
      lines.push('— 자연스러운 귀결 —')
      for (const f of findings.filter((x) => x.sev === 'implication')) {
        lines.push(`[귀결] ${f.title}`)
        lines.push(`  ${f.detail}`)
        if (f.ask) lines.push(`  체크: ${f.ask}`)
      }
    }
    return lines.join('\n')
  }

  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildRuleHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p style="color:#888;">세계 물리 샌드박스 진단 — 모순 ${counts.contradiction} · 긴장 ${counts.tension} · 귀결 ${counts.implication}</p>`)
    parts.push('<h3>세계 변수</h3><ul>')
    for (const a of AXES) {
      const val = vars[a.key]
      const dir = val >= 50 ? a.hi : a.lo
      parts.push(`<li>${escapeHtml(a.label)}: <b>${val}</b> (${escapeHtml(dir)})</li>`)
    }
    parts.push('</ul>')
    parts.push('<h3>파생 지표</h3><ul>')
    for (const m of metrics) parts.push(`<li>${escapeHtml(m.label)}: <b>${m.value}</b></li>`)
    parts.push('</ul>')
    const sect = (sev: Severity, head: string) => {
      const list = findings.filter((f) => f.sev === sev)
      if (!list.length) return
      parts.push(`<h3>${escapeHtml(head)}</h3>`)
      for (const f of list) {
        parts.push(`<p><b>[${SEV_META[sev].label}] ${escapeHtml(f.title)}</b><br/>${escapeHtml(f.detail)}`)
        if (f.ask) parts.push(`<br/><i>설계 질문: ${escapeHtml(f.ask)}</i>`)
        parts.push('</p>')
      }
    }
    sect('contradiction', '해소가 필요한 모순')
    sect('tension', '설명이 필요한 긴장')
    sect('implication', '자연스러운 귀결')
    return parts.join('')
  }

  // PLACE_FIELDS 형식으로 라이브러리에 '세계 규칙' 장소 카드 저장
  const saveToLibrary = () => {
    const fields: Record<string, string> = {}
    const has = (k: string) => PLACE_FIELDS.some((f) => f.key === k)
    if (has('name')) fields.name = worldTitle
    if (has('kind')) fields.kind = '세계 규칙(물리)'
    const ruleLines = AXES.map((a) => `${a.label}: ${vars[a.key]} (${vars[a.key] >= 50 ? a.hi : a.lo})`)
    if (has('rules')) fields.rules = ruleLines.join('\n')
    const conflictLines = findings.filter((f) => f.sev !== 'implication').map((f) => `[${SEV_META[f.sev].label}] ${f.title} — ${f.detail}`)
    if (has('dangers')) fields.dangers = conflictLines.join('\n')
    if (has('notes')) fields.notes = metrics.map((m) => `${m.label}: ${m.value}`).join(' / ')
    addToLibrary('places', { name: worldTitle, kind: '세계 규칙(물리)', rules: fields.rules, notes: fields.notes, fields })
    flash(`라이브러리에 〈${worldTitle}〉 세계 규칙 카드를 저장했어요. 설정집·세계 위키에서 바로 쓸 수 있어요.`)
  }

  const addDocToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '세계관',
      title: `세계 규칙 — ${worldTitle}`,
      bodyHtml: buildRuleHtml(),
      synopsis: `모순 ${counts.contradiction} · 긴장 ${counts.tension} · 귀결 ${counts.implication}`,
      meta: { 모순: String(counts.contradiction), 긴장: String(counts.tension), 안정도: String(metrics.find((m) => m.key === 'stability')?.value ?? '') },
    })
    flash(id ? '프로젝트 자료 〈세계관〉 폴더에 규칙집 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashTop = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없어요.'); return }
    const top = findings.filter((f) => f.sev !== 'implication')[0] || findings[0]
    if (!top) { flash('아직 담을 진단 결과가 없어요.'); return }
    addToStash({ kind: 'memo', label: `세계 규칙: ${top.title}`, text: `[${SEV_META[top.sev].label}] ${top.title}\n${top.detail}${top.ask ? '\n설계 질문: ' + top.ask : ''}` })
    flash('가장 중요한 진단을 수집함에 담았어요.')
  }

  const copyText = async () => {
    const text = buildRuleText()
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('규칙집을 클립보드에 복사했어요.')
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  const openSettingBible = () => {
    openToolLinked('setting-bible', { title: worldTitle, text: buildRuleText() })
    flash('설정집을 규칙집과 함께 열었어요.')
  }
  const openWiki = () => {
    openToolLinked('world-wiki', { title: worldTitle, text: buildRuleText() })
    flash('세계관 위키를 규칙집과 함께 열었어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 13.5, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const head: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }
  const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12 }
  const sliderRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 11 }
  const labLine: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }
  const ends: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }

  return (
    <div style={wrap} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div style={head}>
        <div style={row}>
          <span style={titleStyle}>세계 물리 샌드박스</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--warn)' }} title="양립하기 어려운 설정">모순 {counts.contradiction}</span>
          <span style={{ fontSize: 12, color: 'var(--accent)' }} title="설명이 필요한 설정">긴장 {counts.tension}</span>
          <span style={{ fontSize: 12, color: 'var(--ok)' }} title="자연스러운 귀결">귀결 {counts.implication}</span>
        </div>
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="세계의 이름 (예: 잿빛 군도, 제3제국력 1287년)"
          style={{ width: '100%', boxSizing: 'border-box' }}
          aria-label="세계 이름"
        />
        <div style={row}>
          {PRESETS.map((p) => (
            <button key={p.id} className="minibtn" onClick={() => applyPreset(p)} title={`${p.name} 프리셋으로 시작`}>{p.name}</button>
          ))}
          <button className="minibtn" onClick={resetAll} title="모든 변수를 중간값으로">초기화</button>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--accent)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 파생 지표 게이지 */}
        <div>
          <div style={sectionTitle}>파생 지표</div>
          <div style={{ ...card, marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {metrics.map((m) => (
              <div key={m.key} title={m.hint}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{m.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{m.value}</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.value}%`, background: m.key === 'stability' ? (m.value >= 50 ? 'var(--ok)' : 'var(--warn)') : 'var(--accent)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 슬라이더 */}
        <div>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <span style={sectionTitle}>세계 변수</span>
            <button className="minibtn" onClick={seedFromPlaces} title="라이브러리 장소의 규칙/역사 메모에서 변수 추정">장소에서 채우기</button>
          </div>
          <div style={{ ...card, marginTop: 7 }}>
            {AXES.map((a) => {
              const val = vars[a.key]
              return (
                <div key={a.key} style={sliderRow}>
                  <div style={labLine}>
                    <span style={{ fontWeight: 600 }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.desc}>{a.desc}</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', minWidth: 26, textAlign: 'right' }}>{val}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={val}
                    onChange={(e) => setVar(a.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                    aria-label={a.label}
                  />
                  <div style={ends}><span>{a.lo}</span><span>{a.hi}</span></div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 진단 결과 */}
        <div>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <span style={sectionTitle}>논리 진단 {findings.length ? `(${findings.length})` : ''}</span>
            <label style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input type="checkbox" checked={showImpl} onChange={(e) => setShowImpl(e.target.checked)} />
              귀결도 표시
            </label>
          </div>
          <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {shownFindings.length === 0 ? (
              <div style={{ ...card, color: 'var(--muted)', lineHeight: 1.6, fontSize: 12.5 }}>
                현재 변수 조합에서 두드러진 모순이나 긴장이 보이지 않습니다. 슬라이더를 극단으로 밀거나 프리셋을 적용해
                보세요. 좌측 바인더의 설정 문서를 이 창에 끌어다 놓으면 본문에서 키워드를 읽어 변수를 자동으로 추정합니다.
              </div>
            ) : (
              shownFindings.map((f) => {
                const sm = SEV_META[f.sev]
                return (
                  <div key={f.id} style={{ border: `1px solid var(--border)`, borderLeft: `3px solid ${sm.color}`, borderRadius: 10, background: sm.bg, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: sm.color, border: `1px solid ${sm.color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' }}>{sm.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</span>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.62, color: 'var(--text)' }}>{f.detail}</div>
                    {f.ask && (
                      <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>설계 질문 — {f.ask}</div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 산출/연계 */}
        <div>
          <div style={sectionTitle}>규칙집 내보내기 · 연계</div>
          <div className="linkbar" style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="linkbtn" onClick={addDocToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '규칙집+진단을 자료 〈세계관〉에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>프로젝트에 추가</button>
            <button className="linkbtn" onClick={saveToLibrary} title="세계 규칙을 장소 카드로 라이브러리에 저장">라이브러리에 저장</button>
            <button className="linkbtn" onClick={stashTop} disabled={!hasStash()} title="핵심 진단을 수집함 메모로 담기">수집함에 담기</button>
            <button className="linkbtn" onClick={openSettingBible} title="설정집을 규칙집과 함께 열기">설정집 열기</button>
            <button className="linkbtn" onClick={openWiki} title="세계관 위키를 규칙집과 함께 열기">세계 위키 열기</button>
            <button className="minibtn" onClick={copyText} title="규칙집 전체를 클립보드로 복사">복사</button>
          </div>
          <div className="license-note" style={{ marginTop: 9, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            진단은 전적으로 브라우저 안에서 결정론적 규칙으로 계산됩니다(네트워크 없음). 같은 변수 조합이면 항상 같은 결과가
            나옵니다. 모순/긴장은 '틀렸다'는 뜻이 아니라 '설명이 필요한 지점'입니다 — 설계 질문에 답하며 세계를 단단히 다지세요.
          </div>
        </div>
      </div>
    </div>
  )
}
