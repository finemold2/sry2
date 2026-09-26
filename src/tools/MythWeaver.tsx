// 신화 직조기 — 한 세계의 창세신화·전설·금기를 "문화 일관성 규칙"으로 직조한다.
//  · 문화 DNA: 다섯 축(자연관·계층·죽음관·시간관·성정)을 슬라이더로 정하면, 그 값이 모든 산출물의
//    어휘·구조·도덕률을 결정론적으로 좌우한다(같은 문화면 같은 신화 톤이 일관되게 나온다).
//  · 만신전: 문화 축에 맞춰 신격(이름·영역·성향·상징)을 생성. 신들 사이의 관계(부모/대립/연합)도 자동 직조.
//  · 창세·전설·금기: 만신전과 문화 규칙에서 창세신화 한 편, 전설 여러 편, 금기/계율 목록을 짜낸다.
//    각 금기는 위반 시 결과·세계 내 근거(어느 신화에서 비롯됐는지)까지 연결되어 모순이 없도록 한다.
//  · 일관성 점검: 산출물 사이 규칙 충돌(예: 평화 성정인데 피의 금기 과다)을 스스로 경고.
//  · 연계: 좌측 바인더 문서/payload 텍스트에서 종족·지명 단서 흡수, 공유 장소 라이브러리의 장소를 신화 무대로 채택,
//          신격을 인물 라이브러리로, 신화 전체를 설정 문서로 '프로젝트에 추가', 수집함 담기, 관련 도구 열기.
// import 는 react 와 './linkbus' 만 사용한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  openToolLinked,
  getDragItem,
  isItemDrag,
  PLACE_FIELD_LABEL,
  type SharedPlace,
} from './linkbus'

export const meta = {
  id: 'myth-weaver',
  name: '신화 직조기',
  icon: '🏺',
  group: '세계관',
  intro: '세계의 창세신화·전설·금기를 문화 일관성 규칙으로 직조',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:myth-weaver'

// ---------- 문화 DNA (다섯 축, 0~100) ----------
// 각 축은 모든 산출물의 어휘/구조를 좌우한다. 0과 100은 양 극단.
interface CultureAxis { key: string; label: string; low: string; high: string }
const AXES: CultureAxis[] = [
  { key: 'nature', label: '자연관', low: '정복', high: '경외' },
  { key: 'class', label: '계층', low: '평등', high: '위계' },
  { key: 'death', label: '죽음관', low: '소멸', high: '순환' },
  { key: 'time', label: '시간관', low: '순환', high: '직선' },
  { key: 'temper', label: '성정', low: '호전', high: '평화' },
]
type Culture = Record<string, number>
const defaultCulture = (): Culture => ({ nature: 70, class: 55, death: 65, time: 35, temper: 45 })

interface State {
  worldName: string
  cultureName: string
  culture: Culture
  seed: string
  pantheonSize: number
  legendCount: number
  tabooCount: number
  motifs: string      // 흡수한 종족/지명 단서(쉼표 구분)
  stages: string[]    // 채택한 무대(장소명)
}
const defaultState = (): State => ({
  worldName: '',
  cultureName: '',
  culture: defaultCulture(),
  seed: 'aurum',
  pantheonSize: 5,
  legendCount: 3,
  tabooCount: 5,
  motifs: '',
  stages: [],
})

// ---------- 결정론적 의사난수(문자열 시드 → 32bit) ----------
function hash32(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeRng(parts: (string | number)[]): { next: () => number; pick: <T>(a: T[]) => T; int: (n: number) => number; chance: (p: number) => boolean } {
  const rng = mulberry(hash32(parts.join('|')))
  const next = () => rng()
  return {
    next,
    pick: <T,>(a: T[]) => a[Math.floor(next() * a.length)] as T,
    int: (n: number) => Math.floor(next() * n),
    chance: (p: number) => next() < p,
  }
}

// ---------- 어휘 은행(축 값에 따라 결이 달라짐) ----------
const SYL1 = ['아', '카', '이', '오', '우', '엔', '바', '세', '루', '미', '타', '노', '하', '리', '솔', '베', '키', '단', '마', '레', '가', '네', '도', '시', '에', '요', '주', '란', '벨', '코', '디', '님', '소', '유', '테', '한', '모', '라', '페', '셀']
const SYL2 = ['론', '실', '드라', '엘', '안', '오르', '네스', '리아', '움', '톤', '바', '딘', '셀', '모르', '카', '윈', '하', '란', '뎀', '시르', '발', '누스', '베르', '미르', '갈', '도르', '테아', '솔', '비스', '한', '루스', '나르', '엘리', '오스', '카엘', '림', '바스', '데인', '리온', '마르']
const SYL3 = ['', '', '으스', '아엘', '온', '리스', '엘', '드', '나', '르', '아', '이르', '안', '엔', '오스']
function coinName(rng: ReturnType<typeof makeRng>, lofty: number): string {
  const n = 2 + (rng.next() < lofty / 140 ? 1 : 0)
  let s = rng.pick(SYL1)
  if (n >= 2) s += rng.pick(SYL2)
  if (n >= 3) s += rng.pick(SYL3)
  return s
}

// 신의 영역(자연관/성정에 따라 가중)
const DOMAINS_AWE = ['하늘', '대지', '바다', '산', '숲', '강', '폭풍', '새벽', '달', '별빛', '뿌리', '바람', '안개', '서리', '뇌우', '호수', '들판', '동굴', '여명', '북극성']
const DOMAINS_CONQUEST = ['불', '쇠', '전쟁', '사냥', '경계', '성벽', '재', '낙인', '쟁기', '바퀴', '광맥', '천둥', '용광로', '깃발', '방패', '석성', '망치', '족쇄', '봉화', '관문']
const DOMAINS_PEACE = ['치유', '풍요', '노래', '꿈', '환대', '약속', '직조', '수확', '잠', '맹세', '화로', '샘물', '미소', '쉼터', '온정', '자장가', '용서', '동무']
const DOMAINS_WAR = ['칼날', '복수', '굶주림', '역병', '심판', '재앙', '늑대', '가시', '균열', '독', '저주', '재앙불', '비명', '무덤', '광기', '폐허', '검은피', '잿더미']
const DOMAINS_CYCLE = ['윤회', '씨앗', '조수', '재생', '계절', '거름', '강물', '되돌이', '환생', '낙엽', '메아리', '되감김', '봄날', '물레']
const DOMAINS_LINE = ['운명', '기록', '시작', '끝', '문지방', '서약', '경계선', '마지막날', '한길', '첫걸음', '종착', '비문', '실마리', '낙인장']

const TITLES_HIGH = ['지존', '천제', '대모', '만물의 어버이', '왕좌', '높은 자리']
const TITLES_LOW = ['벗', '나누는 손', '둘레의 목소리', '동행', '평의']

const SYMBOLS = ['나선', '세 갈래 가지', '눈먼 거울', '매듭진 끈', '깨진 고리', '여덟 모 별', '쌍둥이 강', '뒤집힌 잔', '재의 깃털', '돌의 입', '은빛 낫', '검은 씨앗', '엉킨 뿌리', '닫힌 문', '금 간 종', '세 개의 눈', '꺼진 등불', '얼어붙은 불꽃', '뒤엉킨 뿔', '비어 있는 왕관', '녹슨 열쇠', '굽은 지팡이', '물든 손바닥', '흩어진 재']
const ANIMALS = ['까마귀', '사슴', '잿빛 늑대', '물뱀', '흰 황소', '거미', '두루미', '문어', '큰 부엉이', '비늘여우', '검은 표범', '잿빛 매', '뿔도마뱀', '쌍두 백조', '돌거북', '얼음나비', '서리여우', '구렁이', '회색 곰', '밤까치']

const ALIGN_GOOD = ['자애로운', '인내하는', '공정한', '베푸는', '온화한', '너그러운', '헌신하는', '다정한']
const ALIGN_BAD = ['시샘 많은', '잔혹한', '변덕스런', '굶주린', '오만한', '교활한', '냉혹한', '집요한']
const ALIGN_GRAY = ['헤아릴 수 없는', '무심한', '이중적인', '엄격한', '침묵하는', '아득한', '초연한', '수수께끼 같은']

// 신격 수식어(이명) — 어떤 신격에 붙어도 자연스러운 관형 수식. 곱집합에 독립 슬롯으로 더해진다.
const EPITHETS = [
  '먼 옛날의', '잊혀진', '첫새벽의', '천 개의 이름을 가진', '말 없는', '늘 깨어 있는',
  '문을 여는', '경계에 선', '재에서 태어난', '깊은 곳의', '높은 자리의', '돌아오는',
  '약속을 지키는', '베일에 싸인', '서리 내린', '불을 품은', '뿌리 깊은', '바람을 부르는',
  '마지막을 아는', '처음을 기억하는', '두 얼굴의', '눈먼', '천둥을 거느린', '별을 헤아리는',
]

// ---------- 데이터 구조 ----------
interface Deity {
  name: string
  epithet: string
  title: string
  domain: string
  align: string
  symbol: string
  animal: string
  gender: string
}
interface Relation { a: number; b: number; kind: string }
interface Taboo {
  rule: string
  reason: string     // 어느 신/신화에서 비롯됐는가
  breach: string     // 위반 시 결과
}
interface Woven {
  pantheon: Deity[]
  relations: Relation[]
  genesis: string[]
  legends: { title: string; body: string }[]
  taboos: Taboo[]
  warnings: string[]
}

// ---------- 직조 엔진 ----------
function chooseDomain(rng: ReturnType<typeof makeRng>, c: Culture): string {
  const pool: string[] = []
  const push = (arr: string[], w: number) => { for (let i = 0; i < w; i++) pool.push(...arr) }
  push(DOMAINS_AWE, c.nature > 50 ? 3 : 1)
  push(DOMAINS_CONQUEST, c.nature < 50 ? 3 : 1)
  push(DOMAINS_PEACE, c.temper > 50 ? 3 : 1)
  push(DOMAINS_WAR, c.temper < 50 ? 3 : 1)
  push(DOMAINS_CYCLE, c.death > 50 || c.time < 50 ? 2 : 1)
  push(DOMAINS_LINE, c.time > 50 ? 2 : 1)
  return rng.pick(pool)
}
function chooseAlign(rng: ReturnType<typeof makeRng>, c: Culture): string {
  const pool: string[] = []
  const push = (arr: string[], w: number) => { for (let i = 0; i < w; i++) pool.push(...arr) }
  push(ALIGN_GOOD, c.temper > 50 ? 3 : 1)
  push(ALIGN_BAD, c.temper < 50 ? 3 : 1)
  push(ALIGN_GRAY, 2)
  return rng.pick(pool)
}

function weave(st: State): Woven {
  const c = st.culture
  const base = [st.seed || 'seed', st.worldName, st.cultureName, JSON.stringify(c)]
  const size = Math.max(2, Math.min(9, st.pantheonSize))

  // --- 만신전 ---
  const pantheon: Deity[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < size; i++) {
    const r = makeRng([...base, 'deity', i])
    let name = coinName(r, c.class)
    let guard = 0
    while (usedNames.has(name) && guard++ < 8) name = coinName(makeRng([...base, 'deity', i, guard]), c.class)
    usedNames.add(name)
    const lofty = c.class > 50
    const title = i === 0
      ? (lofty ? r.pick(TITLES_HIGH) : r.pick(TITLES_LOW))
      : r.pick(lofty ? [...TITLES_HIGH, ...TITLES_LOW] : TITLES_LOW)
    pantheon.push({
      name,
      epithet: makeRng([...base, 'epi', i]).pick(EPITHETS),
      title: i === 0 ? title : '의 ' + chooseDomain(makeRng([...base, 'd2', i]), c),
      domain: chooseDomain(makeRng([...base, 'dom', i]), c),
      align: chooseAlign(makeRng([...base, 'al', i]), c),
      symbol: r.pick(SYMBOLS),
      animal: r.pick(ANIMALS),
      gender: r.chance(0.5) ? '여' : (r.chance(0.5) ? '남' : '무'),
    })
  }
  // 첫 신은 최고신: 칭호 정리
  if (pantheon[0]) {
    const r0 = makeRng([...base, 'top'])
    pantheon[0].title = c.class > 50 ? r0.pick(TITLES_HIGH) : r0.pick(TITLES_LOW)
  }

  // --- 관계 직조 ---
  const relations: Relation[] = []
  const relKindsHi = ['을 낳음', '의 권좌를 받듦', '에게 충성']
  const relKindsEq = ['과 동맹', '과 나란히 섬', '과 약조함']
  const relKindsWar = ['과 대립', '을 시샘', '과 반목']
  for (let i = 1; i < pantheon.length; i++) {
    const r = makeRng([...base, 'rel', i])
    const parent = r.int(i) // 앞선 신 중 하나
    const hostile = c.temper < 50 ? r.chance(0.45) : r.chance(0.2)
    let kind: string
    if (hostile) kind = r.pick(relKindsWar)
    else if (c.class > 55) kind = r.pick(relKindsHi)
    else kind = r.pick(relKindsEq)
    relations.push({ a: parent, b: i, kind })
  }

  const motifs = st.motifs.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
  const stages = st.stages.filter(Boolean)
  const top = pantheon[0]
  const stageWord = stages.length ? stages[0] : (motifs.length ? motifs[0] : '태초의 어스름')

  // --- 창세신화 ---
  const g = makeRng([...base, 'genesis'])
  const genesis: string[] = []
  {
    const begin = c.time > 50
      ? '시간이 첫 숨을 내쉬자, 다시는 되돌아오지 않을 흐름이 시작되었다.'
      : '시작도 끝도 없는 둘레 속에서, 같은 노래가 또 한 번 돌아왔다.'
    genesis.push(begin)
    if (top) {
      const act = c.nature > 50
        ? top.name + '은(는) ' + top.domain + '을(를) 감히 빚지 않고 다만 깨어나게 하였다.'
        : top.name + '은(는) ' + top.domain + '을(를) 손에 쥐고 제 뜻대로 깎아 세웠다.'
      genesis.push('만물의 처음에 ' + top.name + ', 곧 ' + top.title + '이(가) ' + stageWord + '에서 눈을 떴다. ' + act)
    }
    if (pantheon[1]) {
      genesis.push('그 곁에서 ' + pantheon[1].name + '이(가) ' + pantheon[1].domain + '을(를) 들고 일어나, 세상에 결을 더하였다.')
    }
    const deathLine = c.death > 50
      ? '죽음은 끝이 아니라 ' + (g.pick(DOMAINS_CYCLE)) + '의 다른 이름이 되어, 떠난 자는 다시 돌아올 길을 얻었다.'
      : '죽음은 한 번의 어둠으로 정해져, 떠난 자의 자리는 영영 비게 되었다.'
    genesis.push(deathLine)
    if (relations.length) {
      const rr = relations[g.int(relations.length)]
      genesis.push('이윽고 ' + pantheon[rr.a].name + '이(가) ' + pantheon[rr.b].name + kindPhrase(rr.kind) + ', 세계의 율법이 그 매듭에서 비롯되었다.')
    }
    genesis.push(c.temper > 50
      ? '그리하여 ' + (st.cultureName || '이 땅의 사람들') + '은(는) 다툼보다 약속을, 칼보다 손을 먼저 배웠다.'
      : '그리하여 ' + (st.cultureName || '이 땅의 사람들') + '은(는) 살아남기 위해 두려움과 무기를 함께 길렀다.')
  }

  // --- 전설 ---
  const legends: { title: string; body: string }[] = []
  const legCount = Math.max(0, Math.min(8, st.legendCount))
  const legTemplates = [
    (r: ReturnType<typeof makeRng>, d: Deity, place: string) =>
      ({ title: d.name + '과(와) ' + r.pick(ANIMALS), body: d.name + '이(가) ' + place + '에 내려와 ' + d.animal + '의 모습으로 인간을 시험하였다. ' + (c.class > 50 ? '오직 윗자리에 머리를 숙인 자만이 ' : '신분을 따지지 않고 손 내민 자만이 ') + d.symbol + '의 표식을 받았다.' }),
    (r: ReturnType<typeof makeRng>, d: Deity, place: string) =>
      ({ title: '깨진 ' + d.symbol, body: '한 인간이 ' + place + '에서 ' + d.domain + '의 권능을 훔치려 하자, ' + (c.temper > 50 ? d.name + '은(는) 벌하는 대신 그를 ' + d.animal + '으로 바꾸어 영영 떠돌게 하였다.' : d.name + '의 ' + d.align + ' 진노가 ' + place + ' 전체를 ' + r.pick(['재', '소금', '얼음', '안개']) + '로 덮었다.') }),
    (r: ReturnType<typeof makeRng>, d: Deity, place: string) =>
      ({ title: d.name + '의 마지막 약속', body: (c.time > 50 ? '단 한 번뿐인 그날, ' : '돌고 도는 어느 둘레에서, ') + d.name + '이(가) ' + place + '의 백성과 ' + r.pick(['피', '노래', '침묵', '씨앗']) + '으로 맹세를 맺었다. 그 맹세가 깨질 때 ' + (c.death > 50 ? '세상은 다시 처음으로 감긴다고 전한다.' : '세상은 마지막 어둠을 맞는다고 전한다.') }),
  ]
  for (let i = 0; i < legCount; i++) {
    const r = makeRng([...base, 'legend', i])
    const d = pantheon[r.int(pantheon.length)]
    const place = stages.length ? r.pick(stages) : (motifs.length ? r.pick(motifs) : coinName(r, c.nature) + (c.nature > 50 ? '의 성소' : '의 폐허'))
    const tpl = legTemplates[i % legTemplates.length]
    legends.push(tpl(r, d, place))
  }

  // --- 금기/계율 ---
  const taboos: Taboo[] = []
  const tabCount = Math.max(0, Math.min(9, st.tabooCount))
  const tabooSeeds: ((r: ReturnType<typeof makeRng>, d: Deity) => Taboo)[] = [
    (r, d) => ({ rule: d.domain + '에 칼을 들이대지 말라', reason: d.name + '이(가) ' + d.domain + '을(를) 손수 빚었기에', breach: c.temper > 50 ? '한 해 동안 그 이름을 입에 올릴 수 없다' : d.align + ' 진노로 핏줄이 끊긴다' }),
    (r, d) => ({ rule: r.pick(['새벽', '한밤', '보름', '해질녘']) + '에는 ' + d.animal + '을(를) 사냥하지 말라', reason: d.animal + '은(는) ' + d.name + '의 거룩한 그림자이므로', breach: '사냥한 자의 그림자가 사라진다' }),
    (r, d) => ({ rule: (c.class > 50 ? '윗자리의 ' : '이웃의 ') + '이름을 ' + d.symbol + ' 앞에서 헛되이 부르지 말라', reason: '창세 때 ' + d.name + '이(가) 이름으로 세상을 묶었기에', breach: '부른 자의 이름이 세상에서 지워진다' }),
    (r, d) => ({ rule: '죽은 자의 ' + r.pick(['눈', '입', '손', '신발']) + '을(를) 열어두지 말라', reason: c.death > 50 ? '돌아올 혼이 길을 잃지 않도록' : '닫힌 어둠이 새어 나오지 않도록', breach: c.death > 50 ? '혼이 잘못된 몸으로 돌아온다' : '산 자의 잠 속으로 어둠이 스민다' }),
    (r, d) => ({ rule: r.pick(['붉은', '검은', '하얀', '재빛']) + ' 실로 ' + d.symbol + '을(를) 흉내 내지 말라', reason: d.name + '의 권능을 인간이 짜낼 수 없기에', breach: '짠 천이 밤마다 한 매듭씩 스스로 풀린다' }),
    (r, d) => ({ rule: (c.time > 50 ? '한 번 한 맹세를' : '둘레의 맹세를') + ' 두 번 어기지 말라', reason: '신들의 첫 매듭이 맹세였기에', breach: '세 번째에 그의 시간이 멈춘다' }),
    (r, d) => ({ rule: stageWord + '에서 ' + r.pick(['피를', '불을', '거짓을', '쇠붙이를']) + ' 들이지 말라', reason: '그곳이 ' + d.name + '의 첫 발자국이 닿은 땅이므로', breach: '땅이 한 뼘씩 가라앉는다' }),
  ]
  for (let i = 0; i < tabCount; i++) {
    const r = makeRng([...base, 'taboo', i])
    const d = pantheon[r.int(pantheon.length)]
    taboos.push(tabooSeeds[i % tabooSeeds.length](r, d))
  }

  // --- 일관성 점검 ---
  const warnings: string[] = []
  const bloodTaboos = taboos.filter((t) => /피|칼|핏줄|진노/.test(t.rule + t.breach)).length
  if (c.temper > 65 && bloodTaboos >= 3) warnings.push('성정이 평화에 치우쳤는데 유혈 금기가 ' + bloodTaboos + '건으로 많습니다 — 결과를 추방·침묵형으로 누그러뜨리길 권합니다.')
  if (c.death < 35 && genesis.some((g2) => /다시 돌아|순환|감긴다/.test(g2))) warnings.push('죽음관이 소멸에 가까운데 창세신화에 순환 모티프가 섞였습니다 — 죽음관 슬라이더를 올리거나 문장을 다듬으세요.')
  const warDeities = pantheon.filter((d) => ALIGN_BAD.includes(d.align)).length
  if (c.temper > 60 && warDeities > pantheon.length / 2) warnings.push('평화 성정에 비해 호전적 성향의 신이 과반입니다 — 만신전의 균형을 점검하세요.')
  if (stages.length === 0 && motifs.length === 0) warnings.push('무대(장소)나 모티프 단서가 없어 일반 명칭으로 채웠습니다 — 장소 라이브러리에서 무대를 채택하면 고유성이 살아납니다.')
  if (!warnings.length) warnings.push('규칙 충돌이 발견되지 않았습니다. 문화 축과 산출물이 일관됩니다.')

  return { pantheon, relations, genesis, legends, taboos, warnings }
}
function kindPhrase(kind: string): string {
  if (kind.startsWith('을') || kind.startsWith('를')) return kind
  if (kind.startsWith('에게')) return kind
  if (kind.startsWith('과') || kind.startsWith('와')) return kind
  if (kind.startsWith('의')) return kind
  return ' ' + kind
}

// 평문 직렬화(설정 문서·수집함·복사용)
function toPlain(st: State, w: Woven): string {
  const L: string[] = []
  L.push('# ' + (st.worldName || '이름 없는 세계') + ' — ' + (st.cultureName || '문화') + ' 신화')
  L.push('문화 DNA: ' + AXES.map((a) => a.label + ' ' + (st.culture[a.key] ?? 50)).join(' / '))
  L.push('')
  L.push('## 만신전')
  w.pantheon.forEach((d) => L.push('- ' + d.epithet + ' ' + d.name + ' (' + d.title + '), ' + d.domain + '의 ' + d.align + ' 신 | 상징 ' + d.symbol + ' · 성수 ' + d.animal))
  if (w.relations.length) {
    L.push('')
    L.push('## 신들의 관계')
    w.relations.forEach((r) => L.push('- ' + w.pantheon[r.a].name + ' → ' + w.pantheon[r.b].name + kindPhrase(r.kind)))
  }
  L.push('')
  L.push('## 창세신화')
  w.genesis.forEach((g) => L.push(g))
  if (w.legends.length) {
    L.push('')
    L.push('## 전설')
    w.legends.forEach((l) => { L.push('### ' + l.title); L.push(l.body) })
  }
  if (w.taboos.length) {
    L.push('')
    L.push('## 금기와 계율')
    w.taboos.forEach((t, i) => L.push((i + 1) + '. ' + t.rule + '\n   - 유래: ' + t.reason + '\n   - 위반 시: ' + t.breach))
  }
  return L.join('\n')
}
function toHtml(st: State, w: Woven): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const P: string[] = []
  P.push('<h1>' + esc(st.worldName || '이름 없는 세계') + ' &mdash; ' + esc(st.cultureName || '문화') + ' 신화</h1>')
  P.push('<p><i>' + AXES.map((a) => esc(a.label) + ' ' + (st.culture[a.key] ?? 50)).join(' / ') + '</i></p>')
  P.push('<h2>만신전</h2><ul>')
  w.pantheon.forEach((d) => P.push('<li>' + esc(d.epithet) + ' <b>' + esc(d.name) + '</b> (' + esc(d.title) + ') &mdash; ' + esc(d.domain) + '의 ' + esc(d.align) + ' 신. 상징 ' + esc(d.symbol) + ', 성수 ' + esc(d.animal) + '</li>'))
  P.push('</ul>')
  if (w.relations.length) { P.push('<h2>신들의 관계</h2><ul>'); w.relations.forEach((r) => P.push('<li>' + esc(w.pantheon[r.a].name) + ' &rarr; ' + esc(w.pantheon[r.b].name) + esc(kindPhrase(r.kind)) + '</li>')); P.push('</ul>') }
  P.push('<h2>창세신화</h2>')
  w.genesis.forEach((g) => P.push('<p>' + esc(g) + '</p>'))
  if (w.legends.length) { P.push('<h2>전설</h2>'); w.legends.forEach((l) => { P.push('<h3>' + esc(l.title) + '</h3><p>' + esc(l.body) + '</p>') }) }
  if (w.taboos.length) {
    P.push('<h2>금기와 계율</h2><ol>')
    w.taboos.forEach((t) => P.push('<li><b>' + esc(t.rule) + '</b><br/>유래: ' + esc(t.reason) + '<br/>위반 시: ' + esc(t.breach) + '</li>'))
    P.push('</ol>')
  }
  return P.join('\n')
}

// ---------- 컴포넌트 ----------
export default function MythWeaver({ payload }: { payload?: Record<string, unknown> }) {
  const places = useLibraryList('places')
  const [st, setSt] = useState<State>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>
        return { ...defaultState(), ...parsed, culture: { ...defaultCulture(), ...(parsed.culture || {}) } }
      }
    } catch { /* noop */ }
    return defaultState()
  })
  const [dragOver, setDragOver] = useState(false)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'pantheon' | 'genesis' | 'legends' | 'taboos'>('genesis')
  const noteTimer = useRef<number | null>(null)
  const seeded = useRef(false)

  // payload 수용(텍스트 → 모티프, 장소명 → 무대, 시드) — 마운트 시 1회만
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : ''
    const seed = typeof payload.seed === 'string' ? payload.seed : undefined
    const worldName = typeof payload.worldName === 'string' ? payload.worldName : undefined
    const stages = Array.isArray(payload.stages) ? (payload.stages as unknown[]).map(String) : undefined
    if (!t && seed === undefined && worldName === undefined && stages === undefined) return
    setSt((s) => {
      const next = { ...s }
      if (t) next.motifs = absorb(s.motifs, t)
      if (seed !== undefined) next.seed = seed
      if (worldName !== undefined) next.worldName = worldName
      if (stages !== undefined) next.stages = stages
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)) } catch { /* noop */ }
  }, [st])

  useEffect(() => () => { if (noteTimer.current) window.clearTimeout(noteTimer.current) }, [])

  const woven = useMemo(() => weave(st), [st])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(''), 2600)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const it = getDragItem(e)
    if (it) {
      const add: string[] = [it.title]
      const txt = it.text || ''
      setSt((s) => ({ ...s, motifs: absorb(s.motifs, [add.join(', '), txt].join('\n')) }))
      flash('"' + it.title + '" 의 단서를 모티프로 흡수했습니다.')
    }
  }

  const setAxis = (k: string, v: number) => setSt((s) => ({ ...s, culture: { ...s.culture, [k]: v } }))
  const adoptStage = (p: SharedPlace) => {
    if (st.stages.includes(p.name)) return
    setSt((s) => ({ ...s, stages: [...s.stages, p.name] }))
    flash('무대 채택: ' + p.name)
  }
  const removeStage = (name: string) => setSt((s) => ({ ...s, stages: s.stages.filter((x) => x !== name) }))

  const reseed = () => setSt((s) => ({ ...s, seed: Math.random().toString(36).slice(2, 8) }))

  // 숫자 입력: 빈 값/NaN 은 이전 값 유지, 그 외엔 min~max 로 clamp
  const setNum = (k: 'pantheonSize' | 'legendCount' | 'tabooCount', raw: string, min: number, max: number) =>
    setSt((s) => {
      if (raw.trim() === '') return s
      const n = Number(raw)
      if (!Number.isFinite(n)) return s
      return { ...s, [k]: Math.max(min, Math.min(max, Math.round(n))) }
    })

  // --- 산출 액션 ---
  const saveDeity = (d: Deity) => {
    addToLibrary('characters', {
      name: d.name,
      role: '신격 · ' + d.domain,
      fields: {
        name: d.name,
        aka: d.epithet + ' ' + d.name + ' / ' + d.title,
        role: d.domain + '의 신',
        gender: d.gender === '여' ? '여성' : d.gender === '남' ? '남성' : '없음',
        personality: d.align,
        mark: '상징 ' + d.symbol + ', 성수 ' + d.animal,
        background: (st.worldName || '세계') + ' / ' + (st.cultureName || '문화') + ' 신화의 신격',
      },
      source: '신화 직조기',
    } as Partial<import('./linkbus').SharedCharacter>)
    flash(d.name + ' 을(를) 인물 라이브러리에 신격으로 저장했습니다.')
  }
  const savePantheonAll = () => {
    woven.pantheon.forEach((d) => saveDeity(d))
    flash('만신전 ' + woven.pantheon.length + '신을 인물 라이브러리에 저장했습니다.')
  }
  const addProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트가 연결되어 있지 않습니다.'); return }
    const title = (st.worldName || '세계') + ' — ' + (st.cultureName || '문화') + ' 신화'
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '세계관/신화',
      title,
      bodyHtml: toHtml(st, woven),
      synopsis: woven.pantheon.map((d) => d.name).join(', ') + ' 등 ' + woven.pantheon.length + '신 / 금기 ' + woven.taboos.length + '항',
      meta: {
        문화: st.cultureName || '',
        신수: String(woven.pantheon.length),
        전설수: String(woven.legends.length),
        금기수: String(woven.taboos.length),
        시드: st.seed,
      },
    })
    flash(id ? '설정 문서로 추가했습니다.' : '추가에 실패했습니다.')
  }
  const stash = () => {
    if (!hasStash()) { flash('수집함이 없습니다.'); return }
    addToStash({ kind: 'memo', label: (st.cultureName || '문화') + ' 신화', text: toPlain(st, woven) })
    flash('수집함에 담았습니다.')
  }
  const copyAll = () => {
    try { navigator.clipboard?.writeText(toPlain(st, woven)); flash('전체 신화를 복사했습니다.') }
    catch { flash('복사를 지원하지 않는 환경입니다.') }
  }
  const openMap = () => openToolLinked('world-map-canvas', { text: woven.pantheon.map((d) => d.name + ' — ' + d.domain).join('\n'), worldName: st.worldName })
  const openCalendar = () => openToolLinked('world-calendar-forge', { worldName: st.worldName, text: woven.taboos.map((t) => t.rule).join('\n') })
  const openWiki = () => openToolLinked('world-wiki', { text: toPlain(st, woven), worldName: st.worldName })

  // --- 스타일 ---
  const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, fontSize: 13, height: '100%', boxSizing: 'border-box', overflow: 'auto' }
  const card: React.CSSProperties = { border: '1px solid var(--border,#444)', borderRadius: 8, padding: '8px 10px', background: 'var(--panel,rgba(127,127,127,.06))' }
  const tabBtn = (k: typeof tab, label: string) => (
    <button key={k} className="minibtn" onClick={() => setTab(k)}
      style={{ fontWeight: tab === k ? 700 : 400, borderBottom: tab === k ? '2px solid var(--accent,#6aa)' : '2px solid transparent' }}>{label}</button>
  )

  const empty = !st.worldName && !st.cultureName && st.motifs.trim() === '' && st.stages.length === 0

  return (
    <div style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}>

      {dragOver && (
        <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center', color: 'var(--accent,#6aa)' }}>
          바인더 문서를 놓으면 종족/지명 단서를 모티프로 흡수합니다
        </div>
      )}

      {empty && (
        <div style={{ ...card, lineHeight: 1.6 }}>
          한 세계의 신화 체계를 문화 일관성 규칙으로 직조합니다. 아래 다섯 축으로 문화의 결을 정하면
          만신전·창세신화·전설·금기가 그 결에 맞춰 한꺼번에 생성되고, 서로 모순이 없도록 점검합니다.
          왼쪽 바인더 문서를 끌어다 놓거나 장소 라이브러리에서 무대를 채택하면 고유한 신화가 됩니다.
        </div>
      )}

      {/* 식별 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input className="field" placeholder="세계 이름" value={st.worldName}
          onChange={(e) => setSt((s) => ({ ...s, worldName: e.target.value }))} style={{ flex: '1 1 140px', minWidth: 110 }} />
        <input className="field" placeholder="문화/종족 이름" value={st.cultureName}
          onChange={(e) => setSt((s) => ({ ...s, cultureName: e.target.value }))} style={{ flex: '1 1 140px', minWidth: 110 }} />
      </div>

      {/* 문화 DNA */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>문화 DNA</div>
        {AXES.map((a) => {
          const v = st.culture[a.key] ?? 50
          return (
            <div key={a.key} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 56px 30px', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ textAlign: 'right', opacity: .8 }}>{a.low}</span>
              <input type="range" min={0} max={100} value={v} onChange={(e) => setAxis(a.key, Number(e.target.value))} />
              <span style={{ opacity: .8 }}>{a.high}</span>
              <span style={{ fontSize: 11, opacity: .7 }}>{a.label}</span>
            </div>
          )
        })}
      </div>

      {/* 직조 옵션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>신 수
          <input className="field" type="number" min={2} max={9} value={st.pantheonSize}
            onChange={(e) => setNum('pantheonSize', e.target.value, 2, 9)} style={{ width: 48 }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>전설
          <input className="field" type="number" min={0} max={8} value={st.legendCount}
            onChange={(e) => setNum('legendCount', e.target.value, 0, 8)} style={{ width: 48 }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>금기
          <input className="field" type="number" min={0} max={9} value={st.tabooCount}
            onChange={(e) => setNum('tabooCount', e.target.value, 0, 9)} style={{ width: 48 }} /></label>
        <input className="field" placeholder="시드" value={st.seed}
          onChange={(e) => setSt((s) => ({ ...s, seed: e.target.value }))} style={{ width: 90 }} />
        <button className="minibtn" onClick={reseed}>새 시드</button>
      </div>

      {/* 모티프 */}
      <textarea className="field" placeholder="모티프 단서(종족/지명/소재) — 쉼표 또는 줄바꿈으로 구분. 바인더 드롭으로 자동 흡수됨."
        value={st.motifs} onChange={(e) => setSt((s) => ({ ...s, motifs: e.target.value }))}
        style={{ minHeight: 44, resize: 'vertical' }} />

      {/* 무대(장소 라이브러리) */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 700 }}>신화의 무대</span>
          <span style={{ fontSize: 11, opacity: .6 }}>채택 {st.stages.length}곳</span>
        </div>
        {st.stages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {st.stages.map((s) => (
              <span key={s} className="linkbtn" onClick={() => removeStage(s)} title="클릭하여 제외"
                style={{ cursor: 'pointer' }}>{s} ×</span>
            ))}
          </div>
        )}
        {places.length === 0
          ? <div style={{ fontSize: 11, opacity: .6 }}>장소 라이브러리가 비어 있습니다. 다른 도구에서 장소를 만들면 여기서 무대로 채택할 수 있습니다.</div>
          : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {places.slice(0, 12).map((p) => (
                <button key={p.id} className="minibtn" onClick={() => adoptStage(p)}
                  title={(p.kind ? (PLACE_FIELD_LABEL.kind + ': ' + p.kind) : '') }>{p.name}</button>
              ))}
            </div>
          )}
      </div>

      {/* 일관성 경고 */}
      <div style={{ ...card, borderColor: woven.warnings[0]?.startsWith('규칙 충돌이 발견되지') ? 'var(--ok,#4a8)' : 'var(--warn,#b85)' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>일관성 점검</div>
        {woven.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, opacity: .9 }}>· {w}</div>)}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border,#444)' }}>
        {tabBtn('pantheon', '만신전')}
        {tabBtn('genesis', '창세신화')}
        {tabBtn('legends', '전설')}
        {tabBtn('taboos', '금기')}
      </div>

      <div style={{ minHeight: 80 }}>
        {tab === 'pantheon' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {woven.pantheon.map((d, i) => (
              <div key={i} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ lineHeight: 1.5 }}>
                  <div><span style={{ opacity: .8 }}>{d.epithet}</span> <b>{d.name}</b> <span style={{ opacity: .7 }}>({d.title})</span></div>
                  <div style={{ fontSize: 12, opacity: .85 }}>{d.domain}의 {d.align} 신 · 성별 {d.gender}</div>
                  <div style={{ fontSize: 11, opacity: .65 }}>상징 {d.symbol} / 성수 {d.animal}</div>
                </div>
                <button className="minibtn" onClick={() => saveDeity(d)}>인물로</button>
              </div>
            ))}
            {woven.relations.length > 0 && (
              <div style={card}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>관계</div>
                {woven.relations.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, opacity: .85 }}>{woven.pantheon[r.a].name} → {woven.pantheon[r.b].name}{kindPhrase(r.kind)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'genesis' && (
          <div style={{ ...card, lineHeight: 1.7 }}>
            {woven.genesis.map((g, i) => <p key={i} style={{ margin: '0 0 8px' }}>{g}</p>)}
          </div>
        )}

        {tab === 'legends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {woven.legends.length === 0
              ? <div style={{ opacity: .6 }}>전설 수를 1 이상으로 설정하세요.</div>
              : woven.legends.map((l, i) => (
                <div key={i} style={{ ...card, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700 }}>{l.title}</div>
                  <div style={{ fontSize: 12.5, opacity: .9 }}>{l.body}</div>
                </div>
              ))}
          </div>
        )}

        {tab === 'taboos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {woven.taboos.length === 0
              ? <div style={{ opacity: .6 }}>금기 수를 1 이상으로 설정하세요.</div>
              : woven.taboos.map((t, i) => (
                <div key={i} style={{ ...card }}>
                  <div><b>{i + 1}. {t.rule}</b></div>
                  <div style={{ fontSize: 11.5, opacity: .75 }}>유래 — {t.reason}</div>
                  <div style={{ fontSize: 11.5, opacity: .75 }}>위반 시 — {t.breach}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 액션 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="btn-primary" onClick={addProject}>프로젝트에 추가</button>
        <button className="minibtn" onClick={savePantheonAll}>만신전 전체 저장</button>
        <button className="minibtn" onClick={copyAll}>전체 복사</button>
        <button className="minibtn" onClick={stash}>수집함</button>
      </div>
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="linkbtn" onClick={openMap}>지도에서</button>
        <button className="linkbtn" onClick={openCalendar}>달력으로</button>
        <button className="linkbtn" onClick={openWiki}>위키로</button>
      </div>

      {note && <div className="license-note" style={{ color: 'var(--accent,#6aa)' }}>{note}</div>}
    </div>
  )
}

// 모티프 흡수: 기존 + 새 텍스트에서 명사 후보(짧은 단어)를 합쳐 중복 제거
function absorb(existing: string, incoming: string): string {
  const cur = existing.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
  const candidates = incoming
    .split(/[\s,.;:!?·…"'()\[\]{}「」『』<>]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 6 && !/^[0-9]+$/.test(s))
    .slice(0, 12)
  const merged = Array.from(new Set([...cur, ...candidates]))
  return merged.slice(0, 24).join(', ')
}
