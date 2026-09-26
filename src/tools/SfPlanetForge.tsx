// 행성·항성계 생성기(SF·과학소설) — 항성유형 × 궤도 × 대기 × 지형 × 기후 × 자원 × 거주가능성 × 특이현상
// 8개 슬롯을 자작 데이터 풀에서 무작위로 굴려(슬롯별 🔒 잠금 + 부분 재생성) 작품 무대가 될 외계 행성을 대량 생성한다.
// 조합 수 1억+ 표시. 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 미사용).
// 연계(linkbus): ① 생성한 행성을 프로젝트 자료(research)/'장소' 폴더에 설정(setting) 카드로 추가
//                ② 공유 장소 라이브러리(places)에 저장 → 배경 설정집·세계관 위키 등에서 재사용
//                ③ 관련 도구(배경 설정집·세계관 위키·감각 팔레트·무드보드) 바로 열기
// 즐겨찾기는 localStorage 'sry:tool:sf-planet-forge' 에 자동 저장/복원. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'sf-planet-forge',
  name: '행성·항성계 생성기',
  icon: '🪐',
  group: '생성기',
  genre: 'SF·과학소설',
  intro: '항성유형·궤도·대기·지형·기후·자원·거주가능성·특이현상을 조합해 외계 행성을 무한 생성하세요',
  w: 620,
  h: 720,
}

const LS_KEY = 'sry:tool:sf-planet-forge'

// ── 슬롯 정의 ───────────────────────────────────────────────
// 각 슬롯: key/label/icon + 후보 풀(자작 데이터, 한 줄 콘셉트로 충분히 묘사적).
type SlotKey =
  | 'star' | 'orbit' | 'atmosphere' | 'terrain'
  | 'climate' | 'resource' | 'habitability' | 'anomaly'

interface SlotDef { key: SlotKey; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: SlotDef[] = [
  {
    key: 'star', label: '항성유형', icon: '☀️',
    hint: '이 행성이 도는 별 — 분광형·수명·빛의 색이 기후와 문명을 좌우한다',
    pool: [
      'O형 청색 거성 — 수백만 년 만에 타버릴 운명의 맹렬한 자외선 항성',
      'B형 청백색 항성 — 강렬한 복사로 대기 상층을 끊임없이 깎아낸다',
      'A형 백색 항성 — 시리우스를 닮은 푸른 백색광, 짧고 화려한 일생',
      'F형 황백색 항성 — 태양보다 뜨겁고 자외선이 강한 활동성 별',
      'G형 황색 왜성 — 태양을 닮은 안정적인 별, 생명의 표준 후보',
      'K형 주황색 왜성 — 온화하고 수백억 년을 사는 \'골디락스의 별\'',
      'M형 적색 왜성 — 흐릿한 진홍빛, 잦은 항성 플레어가 행성을 위협한다',
      '쌍성계 — 하늘에 두 개의 태양이 떠 그림자가 둘로 갈라진다',
      '삼중성계 — 세 별이 얽혀 낮과 밤의 주기가 불규칙하게 뒤엉킨다',
      '적색 거성 — 부풀어 오른 늙은 별, 안쪽 행성들을 서서히 삼키는 중',
      '백색 왜성 — 죽은 별의 잔해, 희박한 빛과 강한 중력의 묘지',
      '중성자별 — 1초에 수백 번 도는 펄서, 죽음의 방사선 등대',
      '갈색 왜성 — 별이 되지 못한 어둑한 천체, 적외선으로만 따스하다',
      '예비성(원시성) — 아직 점화 중인 어린 별, 먼지 원반에 둘러싸였다',
      '항성 잔해 성운 속 — 초신성의 잔재가 하늘을 오로라처럼 물들인다',
      '청색 초거성 — 하늘 절반을 채운 거대한 별이 표면을 불태운다',
      '맥동 변광성 — 밝기가 며칠 주기로 부풀고 사그라드는 숨 쉬는 별',
      '극저온 적색 왜성 쌍둥이 — 두 진홍빛 불씨가 나란히 떠 행성을 데운다',
    ],
  },
  {
    key: 'orbit', label: '궤도', icon: '🛰️',
    hint: '별과의 거리·공전·자전 — 계절과 하루의 길이를 결정한다',
    pool: [
      '생명체 거주 가능 영역(골디락스 존) 한가운데의 안정 궤도',
      '거주 영역 안쪽 가장자리 — 늘 한낮처럼 뜨거운 적도 문명',
      '거주 영역 바깥 가장자리 — 영원한 황혼이 깔린 서리의 세계',
      '조석 고정(동주기 자전) — 한쪽은 영원한 낮, 반대쪽은 영원한 밤',
      '극단적 타원 궤도 — 끓는 여름과 얼어붙는 겨울이 교차하는 행성',
      '거대 가스 행성을 도는 위성 — 모행성이 하늘의 절반을 가린다',
      '이중 행성계 — 비슷한 두 천체가 서로를 도는 \'쌍둥이 세계\'',
      '극도로 느린 자전 — 하루가 지구의 한 달처럼 길게 늘어진다',
      '초고속 자전 — 하루가 다섯 시간, 적도가 원심력에 부풀었다',
      '심하게 기울어진 자전축 — 극지방에 반년의 낮과 반년의 밤',
      '소행성대 깊숙한 곳 — 끊임없는 운석 폭격에 노출된 변경',
      '떠돌이 행성(고아 행성) — 별 없이 성간을 표류하는 어둠의 세계',
      '항성 가까이의 용암 궤도 — 표면이 녹아 흐르는 지옥의 거리',
      '라그랑주 점에 갇힌 트로이 행성 — 거대 행성과 영원히 동행한다',
      '역행 궤도 — 다른 천체들과 반대로 도는 의문의 포획 행성',
      '거대 고리계의 틈 안쪽 궤도 — 머리 위로 얼음 띠가 강처럼 흐른다',
      '동기 공명 궤도 — 안쪽 행성과 박자를 맞춰 규칙적으로 끌어당겨진다',
      '소행성 위성을 여럿 거느린 궤도 — 밤하늘에 작은 달 여러 개가 뜬다',
    ],
  },
  {
    key: 'atmosphere', label: '대기', icon: '🌫️',
    hint: '숨 쉴 수 있는가 — 성분·기압·하늘색이 생존 방식을 가른다',
    pool: [
      '질소·산소 대기 — 인간이 그대로 호흡 가능한 푸른 하늘',
      '산소 과잉 대기 — 거대 곤충이 번성하고 불이 쉽게 번진다',
      '희박한 대기 — 우주복 없이는 몇 분, 별이 낮에도 보인다',
      '이산화탄소 두꺼운 대기 — 폭주 온실효과로 납이 녹는 표면',
      '메탄·암모니아 대기 — 주황빛 안개에 잠긴 환원성 세계',
      '황산 구름의 농밀 대기 — 노란 하늘 아래 부식성 비가 내린다',
      '수소·헬륨 대기 — 가스 행성의 끝없는 폭풍층, 단단한 땅이 없다',
      '먼지 폭풍에 영구히 뒤덮인 붉은 대기 — 한낮에도 어스름하다',
      '극저압의 거의 진공 — 액체가 즉시 끓어 증발하는 표면',
      '초고압 대기 — 심해처럼 짓누르는 공기, 소리가 멀리까지 퍼진다',
      '독성 포자가 떠다니는 생물 기원 대기 — 마스크 없인 환각에 빠진다',
      '오로라가 상시 빛나는 자기권 대기 — 밤하늘이 끊임없이 춤춘다',
      '결정성 입자 대기 — 미세한 얼음·규산염이 햇빛을 무지개로 쪼갠다',
      '계절마다 얼었다 증발하는 휘발성 대기 — 겨울엔 하늘이 땅에 쌓인다',
      '인공 테라포밍 진행 중 — 절반만 숨 쉴 만한, 미완의 대기',
      '염소·할로겐 대기 — 녹황빛 하늘 아래 금속도 부식되는 독성 공기',
      '수증기 두꺼운 증기 대기 — 사방이 뜨거운 안개, 시야가 몇 걸음뿐이다',
      '미세 금속 분진 대기 — 석양이 핏빛으로 번지고 기계가 자주 멈춘다',
    ],
  },
  {
    key: 'terrain', label: '지형', icon: '🏔️',
    hint: '땅의 얼굴 — 표면 지형이 무대와 갈등의 배경이 된다',
    pool: [
      '끝없는 대양의 물의 행성 — 떠다니는 군도가 유일한 육지',
      '하나로 이어진 초대륙과 단일 대양',
      '갈라진 협곡과 메사가 끝없이 펼쳐진 붉은 사막',
      '활화산과 용암 평원으로 들끓는 불의 대지',
      '만년 빙하로 뒤덮인 새하얀 설원 행성',
      '수 킬로미터 높이의 거대 버섯·식물 정글',
      '거대한 결정 기둥이 숲처럼 솟은 수정 평원',
      '지하 동굴·터널이 거미줄처럼 이어진 카르스트 세계',
      '소금 사막과 마른 호수 바닥이 거울처럼 빛난다',
      '부유하는 섬들이 떠 있는 깊은 협곡 행성',
      '금속성 산맥 — 자성 광물이 나침반을 무용지물로 만든다',
      '점액질 늪과 부패하는 습지로 뒤덮인 저지대',
      '유리화된 충돌 크레이터가 별처럼 박힌 황무지',
      '거대한 고리 그림자가 적도를 가로지르는 평원',
      '계단식 단층애로 대륙이 거대한 층계처럼 솟았다',
      '검은 흑요석 평원이 거울처럼 하늘을 되비추는 유리 대지',
      '거대한 강 삼각주와 갈대 습지가 끝없이 이어진 물길의 땅',
      '바람에 깎인 아치와 첨탑 바위가 숲처럼 늘어선 풍식 황야',
    ],
  },
  {
    key: 'climate', label: '기후', icon: '🌦️',
    hint: '하늘의 성격 — 날씨와 계절이 일상과 생존 리듬을 만든다',
    pool: [
      '온화하고 사계가 뚜렷한 안정 기후',
      '열대처럼 늘 덥고 습한 항상 우기',
      '극도로 건조해 비 한 방울 없는 사막 기후',
      '맹렬한 초대형 폭풍(슈퍼셀)이 상시 도는 하늘',
      '낮엔 화로, 밤엔 냉동고 — 극단적 일교차',
      '영구 동결 — 어디서나 영하 수십 도의 한기',
      '산성비가 끊임없이 내리는 부식의 기후',
      '시속 수백 킬로의 항성풍이 표면을 할퀴는 폭풍대',
      '안개와 이슬비가 걷히지 않는 영원한 황혼',
      '계절풍이 반년마다 방향을 뒤집는 대순환',
      '전자기 폭풍이 잦아 통신이 자주 끊긴다',
      '항성 플레어로 주기적으로 표면이 달궈지는 복사 기후',
      '다이아몬드·유리 비가 상층에서 떨어지는 이상 강수',
      '쌍성의 두 일주기가 겹쳐 \'두 번의 낮\'이 오는 기후',
      '대기 자체가 발광해 밤이 없는 박명의 세계',
      '거대 고리에서 떨어진 얼음 알갱이가 끊임없이 흩날리는 다이아몬드 눈',
      '며칠씩 이어지는 짙은 황사가 태양을 가리는 먼지 계절',
      '습한 열기와 매서운 한파가 며칠 간격으로 뒤바뀌는 변덕 기후',
    ],
  },
  {
    key: 'resource', label: '자원', icon: '⛏️',
    hint: '탐욕의 이유 — 이 행성이 식민·전쟁·교역의 표적이 되는 까닭',
    pool: [
      '희귀 동위원소 광맥 — 항성간 항행 연료의 유일한 산지',
      '초전도 결정 — 상온 초전도를 가능케 하는 외계 광물',
      '생체발광 미생물 — 의약·테라포밍에 쓰이는 살아있는 자원',
      '액체 헬륨-3 호수 — 핵융합 발전의 청정 연료원',
      '반물질을 가두는 천연 자기병(磁氣甁) 광상',
      '의식을 증폭하는 신경 활성 향료(스파이스)',
      '거의 파괴되지 않는 외계 합금 광석',
      '담수 빙하 — 물이 곧 금인 건조 성단의 생명선',
      '시간 지연 효과를 내는 이상 중원소 결정',
      '대기 중에 떠다니는 부유 가스 — 채집선이 그물로 거른다',
      '고대 문명이 남긴 작동하는 유물(아티팩트) 매장지',
      '자가 복제하는 나노 광물 — 캐는 만큼 다시 자란다',
      '항성 에너지를 저장한 천연 \'태양 보석\'',
      '독성이 강하나 값을 매길 수 없는 발광 수정',
      '겉보기엔 황무지 — 알려진 자원이 전무한 버려진 변경',
      '중력파를 굴절시키는 희귀 결정 — 차폐·은폐 기술의 핵심 광물',
      '거대 생물의 뼈에서만 나오는 초경량 생체 섬유',
      '대기 정화 효소를 분비하는 토착 균류 — 테라포밍의 살아있는 열쇠',
    ],
  },
  {
    key: 'habitability', label: '거주가능성', icon: '🧬',
    hint: '인간에게 어떤 곳인가 — 정착·생존의 난이도와 방식',
    pool: [
      '거주 적합 — 맨몸으로 정착 가능한 제2의 지구급 낙원',
      '거주 가능하나 가혹 — 기술과 의지가 있어야 버틴다',
      '한계 거주 — 적도·극지 등 일부 띠에서만 살 수 있다',
      '돔·지하 도시 필수 — 표면은 인간에게 치명적이다',
      '우주복·생명유지장치 없이는 즉사하는 극한 환경',
      '테라포밍 진행 중 — 수세대에 걸친 개조의 한복판',
      '토착 생태계와 공존 필요 — 자연이 침입자를 거부한다',
      '저중력 — 인간의 골밀도가 약해지나 거대 구조물엔 유리',
      '고중력 — 한 걸음이 무겁고 토착종은 다부지고 납작하다',
      '심리적 거주 곤란 — 영원한 밤·고립이 정신을 갉아먹는다',
      '검역 행성 — 토착 병원체 탓에 출입이 엄격히 통제된다',
      '버려진 식민지 — 한때 살았으나 무언가가 그들을 떠나게 했다',
      '토착 지성체의 영역 — 인류는 손님이거나 침략자다',
      '계절 거주 — 특정 시기에만 잠시 살 수 있는 유랑의 땅',
      '거주 불가 판정 — 그럼에도 누군가는 기어이 발을 디딘다',
      '궤도 거주 전용 — 표면은 못 밟고 정거장에서 자원만 끌어올린다',
      '약물 적응 필수 — 토착 환경에 맞춰 몸을 바꿔야 살아남는다',
      '소수 정착 한계 — 좁은 안전지대에 작은 마을 정도만 버틴다',
    ],
  },
  {
    key: 'anomaly', label: '특이현상', icon: '✨',
    hint: '이 행성만의 미스터리 — 이야기의 씨앗이 되는 단 하나의 수수께끼',
    pool: [
      '주기적으로 모든 전자기기가 멈추는 \'침묵의 시간\'',
      '땅 밑에서 들려오는, 누구도 설명 못 하는 규칙적 진동음',
      '특정 좌표에서 시간이 미세하게 느리게 흐른다',
      '밤마다 위치를 바꾸는, 지도에 없는 빛의 도시',
      '행성을 한 바퀴 도는 거대 생명체의 흔적(거대 골격)',
      '대기에 떠 있는, 닿으면 사라지는 기억의 잔상',
      '쌍둥이처럼 자신과 똑같은 무언가가 목격되는 거울 지대',
      '특정 계절에만 솟아오르는, 작동 원리 불명의 고대 첨탑',
      '나침반·중력이 거꾸로 작동하는 \'뒤집힌 골짜기\'',
      '죽은 것이 며칠 뒤 다른 형태로 다시 나타나는 부활지',
      '하늘에서 들려오는, 해독되지 않은 반복 신호',
      '걷는 이의 가장 깊은 두려움을 비추는 \'정직의 안개\'',
      '한 번 들어가면 같은 길로 나올 수 없는 이동하는 미로 숲',
      '주민 모두가 같은 꿈을 꾸는 \'공유몽(共有夢)\' 지대',
      '별빛이 닿지 않는데도 스스로 빛나는 \'내광(內光)\' 호수',
      '하루에 한 번, 모든 그림자가 사라지는 \'그림자 없는 정오\'',
      '특정 음을 노래하면 땅이 화답하듯 진동하는 \'응답하는 협곡\'',
      '발자국이 며칠 뒤 거꾸로 되짚어 사라지는 \'기억하는 모래\'',
    ],
  },
]

// 한 행성: 슬롯별 선택 인덱스 + 자작 이름.
interface Planet {
  id: string
  name: string
  picks: Record<SlotKey, number> // 각 슬롯에서 고른 항목 인덱스
}
interface Saved extends Planet { savedAt: number; note: string }

// ── 자작 행성 이름 생성(코드네임 풍) ──
const NAME_GREEK = ['알파', '베타', '감마', '델타', '엡실론', '제타', '에타', '세타', '이오타', '카파', '람다', '오메가', '시그마', '타우', '프시']
const NAME_PREFIX = ['케플러', '글리제', '프록시마', '타우 세티', '트라피스트', '볼프', '란드', '아르카디아', '네메시스', '에레보스', '헤스페로스', '아발론', '뉴 테라', '엘리시움', '카론', '미르', '오르페우스', '베가', '리겔', '안타레스']
const NAME_SUFFIX = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'Prime', 'Major', 'Minor', 'IV', 'IX', '환(環)', '문(門)']

function randName(): string {
  const mode = Math.floor(Math.random() * 3)
  const ri = (n: number) => Math.floor(Math.random() * n)
  if (mode === 0) return `${NAME_PREFIX[ri(NAME_PREFIX.length)]}-${100 + ri(900)}${NAME_SUFFIX[ri(NAME_SUFFIX.length)]}`
  if (mode === 1) return `${NAME_GREEK[ri(NAME_GREEK.length)]} ${NAME_PREFIX[ri(NAME_PREFIX.length)]}`
  return `${NAME_PREFIX[ri(NAME_PREFIX.length)]} ${NAME_SUFFIX[ri(NAME_SUFFIX.length)]}`
}

// ── 조합 수: 슬롯 풀 크기의 곱 × 이름 변형(대략) ──
// 슬롯만으로도 18^8 = 약 110억. 이름 변형까지 곱하면 수백조. 사양(1억+) 충족.
const SLOT_COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)
const NAME_VARIANTS = NAME_PREFIX.length * 900 * NAME_SUFFIX.length
  + NAME_GREEK.length * NAME_PREFIX.length
  + NAME_PREFIX.length * NAME_SUFFIX.length
const TOTAL_COMBOS = SLOT_COMBOS * NAME_VARIANTS

const ri = (n: number) => Math.floor(Math.random() * n)
const newId = (): string => {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slotDef = (k: SlotKey): SlotDef => SLOTS.find((s) => s.key === k) || SLOTS[0]
const valOf = (p: Planet, k: SlotKey): string => slotDef(k).pool[p.picks[k]] || ''

function genPlanet(keep?: Planet, locked?: Partial<Record<SlotKey, boolean>>): Planet {
  const picks = {} as Record<SlotKey, number>
  for (const s of SLOTS) {
    picks[s.key] = keep && locked?.[s.key] ? keep.picks[s.key] : ri(s.pool.length)
  }
  const name = keep && locked?.['__name' as SlotKey] ? keep.name : randName()
  return { id: newId(), name, picks }
}

// 텍스트 내보내기.
function exportOne(p: Planet): string {
  const lines = [`# ${p.name}`, '']
  for (const s of SLOTS) lines.push(`■ ${s.icon} ${s.label}`, valOf(p, s.key), '')
  return lines.join('\n').trim()
}

// 프로젝트 setting 카드 본문(HTML).
function planetBodyHtml(p: Planet): string {
  const parts: string[] = []
  for (const s of SLOTS) {
    parts.push(`<p><b>${s.icon} ${esc(s.label)}</b><br>${esc(valOf(p, s.key))}</p>`)
  }
  return parts.join('\n')
}

// 정규(장소) 키 fields 매핑 — 받는 허브(배경 설정집·세계관 위키)의 기본 칸에 정렬되도록 슬롯 값을 1:1로 옮긴다.
// 정규 장소 키: name, kind, atmosphere, appearance, sensory, geography, climate, history,
//               culture, inhabitants, rules, dangers, landmarks, secrets, notes
function placeFields(p: Planet): Record<string, string> {
  return {
    name: p.name,
    kind: '외계 행성',                              // 종류/유형 → kind
    atmosphere: valOf(p, 'atmosphere'),            // 대기 성분 → atmosphere
    appearance: valOf(p, 'terrain'),               // 지형(외형) → appearance
    sensory: valOf(p, 'terrain'),                  // 오감/감각(지형 묘사) → sensory
    geography: valOf(p, 'orbit'),                  // 궤도·위치 → geography
    climate: valOf(p, 'climate'),                  // 기후 → climate
    history: valOf(p, 'star'),                     // 항성(천문 배경) → history
    inhabitants: valOf(p, 'habitability'),         // 거주가능성(누가/어떻게 사는가) → inhabitants
    rules: valOf(p, 'resource'),                   // 자원(작동 규칙·경제) → rules
    secrets: valOf(p, 'anomaly'),                  // 특이현상(수수께끼) → secrets
  }
}

// localStorage 복원 — 손상/미지원 graceful.
function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const validKeys = new Set(SLOTS.map((s) => s.key))
    return arr
      .filter((x: unknown) => x && typeof x === 'object' && typeof (x as Saved).name === 'string' && (x as Saved).picks)
      .map((x: Saved) => {
        const picks = {} as Record<SlotKey, number>
        for (const s of SLOTS) {
          const v = Number((x.picks as Record<string, number>)[s.key])
          picks[s.key] = Number.isInteger(v) && v >= 0 && v < s.pool.length ? v : 0
        }
        void validKeys
        return {
          id: typeof x.id === 'string' ? x.id : newId(),
          name: x.name,
          picks,
          savedAt: Number(x.savedAt) || Date.now(),
          note: typeof x.note === 'string' ? x.note : '',
        }
      })
  } catch { return [] }
}

export default function SfPlanetForge({ payload }: { payload?: Record<string, unknown> }) {
  const [planet, setPlanet] = useState<Planet>(() => genPlanet())
  // '__name' 가짜 키로 이름 잠금도 함께 관리.
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [nameLock, setNameLock] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [flash, setFlash] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  // 사용자 정의 항목(이름은 유지, 값은 자유 입력) + 고정 '기타' 자유 입력칸.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const mounted = useRef(true)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) clearTimeout(flashTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 즐겨찾기 영속 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(saved)) }
    catch { if (mounted.current) showFlash('이 브라우저에서 저장이 막혀 있어요') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  const showFlash = (m: string) => {
    if (!mounted.current) return
    setFlash(m)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => mounted.current && setFlash(''), 2200)
  }

  // 전체 굴리기 — 잠긴 슬롯·이름은 보존. 사용자 정의 항목은 '값'만 비우고 '항목(이름)'은 유지, '기타'도 비운다.
  const rollAll = () => {
    setPlanet((prev) => genPlanet(prev, { ...locked, ['__name' as SlotKey]: nameLock }))
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // 사용자 정의 항목: 추가/값변경/삭제.
  const addCustom = () => {
    const label = (typeof window !== 'undefined' ? window.prompt('추가할 항목 이름을 입력하세요') : '') || ''
    const t = label.trim()
    if (!t) return
    setCustom((prev) => [...prev, { id: newId(), label: t, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }
  const removeCustom = (id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }
  // 비어있지 않은 사용자 정의 항목 + 기타를 fields 맵으로 — 다른 도구에 그대로 전달.
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) {
      const label = c.label.trim()
      const value = c.value.trim()
      if (label && value) out[label] = value
    }
    const e = etc.trim()
    if (e) out.etc = e
    return out
  }
  // 복사/요약용 추가 텍스트(있을 때만).
  const extraText = (): string => {
    const lines: string[] = []
    for (const c of custom) {
      if (c.label.trim() && c.value.trim()) lines.push(`■ ${c.label.trim()}`, c.value.trim(), '')
    }
    if (etc.trim()) lines.push('■ 기타', etc.trim(), '')
    return lines.join('\n').trim()
  }
  // 슬롯 하나만 다시 굴리기.
  const rollOne = (k: SlotKey) => {
    setPlanet((prev) => ({ ...prev, picks: { ...prev.picks, [k]: ri(slotDef(k).pool.length) } }))
  }
  const rollName = () => setPlanet((prev) => ({ ...prev, name: randName() }))
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 복사(graceful + 폴백).
  const copy = (text: string, id: string) => {
    const done = () => {
      if (!mounted.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => mounted.current && setCopiedId(''), 1400)
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { showFlash('복사 실패') }
  }

  // 현재 행성을 즐겨찾기에 저장(중복 방지: 동일 이름+동일 조합).
  const saveCurrent = () => {
    setSaved((prev) => {
      const dup = prev.some((s) => s.name === planet.name && SLOTS.every((sl) => s.picks[sl.key] === planet.picks[sl.key]))
      if (dup) { showFlash('이미 저장된 행성이에요'); return prev }
      return [{ ...planet, id: newId(), savedAt: Date.now(), note: '' }, ...prev]
    })
    showFlash('⭐ 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const loadSavedToWork = (s: Saved) => {
    setPlanet({ id: newId(), name: s.name, picks: { ...s.picks } })
    showFlash(`‘${s.name}’를 작업 영역으로 불러왔어요`)
  }
  const startEdit = (s: Saved) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }

  const linked = hasProjectBridge()

  // ── 연계: 프로젝트(자료 › 장소)에 setting 카드로 추가 ──
  const toProject = (p: Planet, label?: string) => {
    if (!linked) { showFlash('프로젝트에 연결되어 있지 않습니다'); return }
    // setting 카드 필드(character) — 배경 설정집·맵 카드와 호환되는 키.
    // 기존 한글 키는 유지하고, 정규(장소) 키를 추가로 병합 — 받는 허브(배경 설정집 등)에서 기본 칸 정렬용.
    const character: Record<string, string> = {
      name: p.name,
      type: '외계 행성',
      항성: valOf(p, 'star'),
      궤도: valOf(p, 'orbit'),
      대기: valOf(p, 'atmosphere'),
      지형: valOf(p, 'terrain'),
      기후: valOf(p, 'climate'),
      자원: valOf(p, 'resource'),
      거주가능성: valOf(p, 'habitability'),
      특이현상: valOf(p, 'anomaly'),
      ...placeFields(p),
      ...extraFields(),
    }
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: p.name,
      character,
      bodyHtml: planetBodyHtml(p),
      synopsis: valOf(p, 'habitability'),
      icon: '🪐',
      meta: {
        유형: '외계 행성',
        항성: valOf(p, 'star').slice(0, 40),
        거주가능성: valOf(p, 'habitability').slice(0, 40),
        출처: '행성·항성계 생성기',
      },
    })
    if (id) showFlash(label || `‘${p.name}’ 행성을 프로젝트(자료 › 장소)에 추가했어요`)
    else showFlash('프로젝트 추가에 실패했어요')
  }

  // ── 연계: 공유 장소 라이브러리(places)에 저장 ──
  const toLibrary = (p: Planet) => {
    addToLibrary('places', {
      name: p.name,
      kind: '외계 행성',
      mood: valOf(p, 'climate'),
      history: `${valOf(p, 'star')} / ${valOf(p, 'orbit')}`,
      rules: `${valOf(p, 'atmosphere')} · 거주: ${valOf(p, 'habitability')}`,
      sensory: `${valOf(p, 'terrain')} · 자원: ${valOf(p, 'resource')}`,
      notes: `특이현상: ${valOf(p, 'anomaly')}`,
      // 정규(장소) 키로 1:1 매핑한 fields — 배경 설정집·세계관 위키에서 기본 칸 정렬용.
      fields: { ...placeFields(p), ...extraFields() },
      source: '행성·항성계 생성기',
    })
    showFlash('🗺️ 공유 장소 라이브러리에 저장했어요')
  }

  // payload.genre 맥락 배지(다른 도구가 장르를 넘기면 표시).
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  // 관련 도구(연계 바).
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'world-wiki', icon: '📚', label: '세계관 위키' },
    { id: 'sensory-palette', icon: '🌫', label: '감각 팔레트' },
    { id: 'moodboard-grid', icon: '🧩', label: '무드보드' },
  ]

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const slotRow: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 4 }
  const slotHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const slotLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)' }
  const slotVal: React.CSSProperties = { fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word' }
  const sec: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🪐"/></span>
        <strong style={{ fontSize: 15 }}>행성·항성계 생성기</strong>
        {genre && <span style={{ fontSize: 11, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>장르: {genre}</span>}
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{emojify(flash)}</span>}
      </div>

      <div style={body}>
        {/* 생성 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 전체 굴리기</button>
          <button className="minibtn" onClick={saveCurrent}><Emoji e="⭐"/> 즐겨찾기 저장</button>
          <button className="minibtn" onClick={() => copy([exportOne(planet), extraText()].filter(Boolean).join('\n\n'), '__cur')}>{copiedId === '__cur' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 텍스트 복사</>}</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }} title="슬롯·이름 조합의 어림 가짓수">
            약 {TOTAL_COMBOS.toLocaleString()}+ 조합
          </span>
        </div>

        {/* 행성 이름 */}
        <div style={{ ...slotRow, background: 'var(--chrome-2)' }}>
          <div style={slotHead}>
            <span style={slotLabel}><Emoji e="🪐"/> 행성명</span>
            <span style={{ flex: 1 }} />
            <button
              className="minibtn"
              style={{ padding: '1px 7px', fontSize: 11, color: nameLock ? 'var(--accent)' : undefined }}
              onClick={() => setNameLock((v) => !v)}
              title={nameLock ? '이름 잠금 해제(전체 굴릴 때 새 이름)' : '이름 잠금(전체 굴려도 유지)'}
            >{nameLock ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" style={{ padding: '1px 7px', fontSize: 11 }} onClick={rollName} title="이름만 다시"><Emoji e="🎲"/></button>
          </div>
          <input
            value={planet.name}
            onChange={(e) => setPlanet((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="행성 이름"
            maxLength={60}
            style={{ ...slotVal, fontWeight: 700, width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        {/* 8개 슬롯 */}
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{ ...slotRow, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
              <div style={slotHead}>
                <span style={slotLabel}><Emoji e={s.icon}/> {s.label}</span>
                <span style={{ flex: 1 }} />
                <button
                  className="minibtn"
                  style={{ padding: '1px 7px', fontSize: 11, color: isLocked ? 'var(--accent)' : undefined }}
                  onClick={() => toggleLock(s.key)}
                  title={isLocked ? '잠금 해제(전체 굴릴 때 변경)' : '잠금(전체 굴려도 유지)'}
                >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                <button className="minibtn" style={{ padding: '1px 7px', fontSize: 11 }} onClick={() => rollOne(s.key)} title={`${s.label}만 다시 굴리기`}><Emoji e="🎲"/></button>
                <button className="minibtn" style={{ padding: '1px 7px', fontSize: 11 }} onClick={() => copy(valOf(planet, s.key), s.key)} title="이 항목 복사">{copiedId === s.key ? '✓' : <Emoji e="📋"/>}</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.hint}</div>
              <div style={slotVal}>{valOf(planet, s.key)}</div>
            </div>
          )
        })}

        {/* 사용자 정의 항목 + 고정 '기타' */}
        <div style={{ ...slotRow, gap: 8 }}>
          <div style={slotHead}>
            <span style={slotLabel}><Emoji e="➕"/> 사용자 정의 항목</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={addCustom} title="항목 이름을 정하고 직접 내용을 적으세요">＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {custom.map((c) => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...slotLabel, color: 'var(--text)' }}>{c.label}</span>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" style={{ padding: '1px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
                  </div>
                  <textarea
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder={`${c.label} 내용을 직접 적어보세요`}
                    rows={2}
                    style={{ ...slotVal, width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={slotLabel}><Emoji e="📝"/> 기타</span>
            <textarea
              value={etc}
              onChange={(e) => setEtc(e.target.value)}
              placeholder="자유롭게 메모하세요 (설정·아이디어·미정 사항 등)"
              rows={4}
              style={{ ...slotVal, width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* 연계: 프로젝트 / 라이브러리 / 관련 도구 */}
        <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
          <button
            className="linkbtn"
            onClick={() => toProject(planet)}
            disabled={!linked}
            title={linked ? '이 행성을 프로젝트 자료(장소)에 설정 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => toLibrary(planet)} title="공유 장소 라이브러리에 저장 — 배경 설정집 등에서 재사용"><Emoji e="🗺️"/> 장소 라이브러리</button>
        </div>
        <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>관련 도구:</span>
          {RELATED.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, genre ? { genre } : undefined)} title={`${r.label} 열기`}><Emoji e={r.icon}/> {r.label}</button>
          ))}
        </div>

        {/* 즐겨찾기 목록 */}
        <div>
          <div style={sec}>
            <span><Emoji e="⭐"/> 즐겨찾기 {saved.length ? `(${saved.length})` : ''}</span>
            {saved.length > 0 && (
              <button className="minibtn" onClick={() => copy(saved.map((s) => exportOne(s)).join('\n\n———\n\n'), '__all')}>
                {copiedId === '__all' ? <>✓ 전체 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
              </button>
            )}
          </div>
          {saved.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '10px 4px', lineHeight: 1.6 }}>
              마음에 드는 행성은 <b><Emoji e="⭐"/> 즐겨찾기 저장</b>으로 모아두세요.<br />
              잠긴 슬롯(<Emoji e="🔒"/>)은 <b>전체 굴리기</b> 때도 유지됩니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{s.name}</strong>
                    <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => loadSavedToWork(s)} title="작업 영역으로 불러오기">↩ 불러오기</button>
                    <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => copy(exportOne(s), s.id)} title="복사">{copiedId === s.id ? '✓' : <Emoji e="📋"/>}</button>
                    <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                    <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                    <Emoji e={slotDef('star').icon}/> {valOf(s, 'star').split(' — ')[0]} · <Emoji e={slotDef('habitability').icon}/> {valOf(s, 'habitability').split(' — ')[0]}
                  </div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 시점·역할 등)"
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : s.note ? (
                    <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, fontStyle: 'italic' }}><Emoji e="📝"/> {emojify(s.note)}</div>
                  ) : null}
                  <div className="linkbar" style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <button className="linkbtn" style={{ fontSize: 11 }} onClick={() => toProject(s, `‘${s.name}’를 프로젝트에 추가했어요`)} disabled={!linked} title={linked ? '프로젝트 자료(장소)에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                    <button className="linkbtn" style={{ fontSize: 11 }} onClick={() => toLibrary(s)} title="공유 장소 라이브러리에 저장"><Emoji e="🗺️"/> 라이브러리</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
          전부 로컬 생성 · 외부 API 미사용 · 자작 데이터 풀
        </div>
      </div>
    </div>
  )
}
