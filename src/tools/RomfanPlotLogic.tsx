// 로맨스판타지(로판) 플롯·진행곡선(로직) 템플릿 — 도시에에 근거한 "로판 표준 12비트 매크로 구조 + 웹소설 페이싱"을 단계 입력 시트로.
//  핵심 명제(도시에 §2·§4): 로판의 동력은 (1) 여주 중심 시점·주체성, (2) 고구마→사이다의 인과적 정산, (3) 남주의 '온리 유' 헌신/집착, (4) HEA+외전 계약.
//  · 12비트(프롤로그 비극~결말/외전)에 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 4개 슬라이더 → 4개 곡선: 사이다 게이지(억울함↔통쾌), 관계 거리(여주↔남주), 설렘/긴장, 여주 주도권(수동↔능동). 고구마-사이다 진자 가시화.
//  · 하위유형 프리셋(회귀 복수 / 악역영애 빙의 / 환생 육아 / 계약·정략결혼 / 다크 집착 / 힐링·경영)으로 비트 가이드·곡선 권장값 자동 세팅(도시에 §1·§3).
//  · "비트 발상 시드" — 각 비트의 슬롯 풀(상황/장치/사이다 종류 등)을 무작위 조합으로 굴려 막힌 비트의 글감을 던짐(잠금/재생성, 조합수 56억+ 표시).
//  · 페이싱 자가진단(고구마 과다·민폐 여주·블랙모먼트 누락·사이다 미정산·남주 일관성·HEA 미달 등 도시에 §8 함정 기반).
//  · localStorage 'sry:tool:romfan-plotlogic' 자동 저장/복원. addToProject(folder:"구조"). 글감(snippets) 저장. 연계 도구 열기.
// 자급식: react/linkbus 외 import 없음. 전부 로컬.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'romfan-plotlogic', name: '로판 플롯 로직', icon: '👑', group: '플롯', genre: '로맨스판타지', intro: '로판 표준 12비트 구조·고구마↔사이다 진자·관계 거리·여주 주도권 곡선으로 회빙환 로맨스 서사의 진행을 설계하세요', w: 720, h: 680 }

const LS_KEY = 'sry:tool:romfan-plotlogic'

// ── 로판 표준 12비트 매크로 구조(도시에 §4-1 전체 흐름 + §3 장치 + §5 클라이맥스) ───────────────
// pos: 전체 분량 대비 권장 위치 구간(%).
// dist: 관계 거리(0=남남 … 10=완전 결합). heat: 설렘/긴장. cida: 사이다 게이지(0=억울함·고구마 최저 … 10=통쾌·정산 최고). agency: 여주 주도권(0=수동·구원대기 … 10=능동·자기개척).
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  dist: number
  heat: number
  cida: number
  agency: number
  func: string   // 로판에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 하위유형/클리셰 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'prologue', title: '0. 프롤로그 · 비극/파멸', sub: 'Prologue', pos: [0, 3], dist: 1, heat: 7, cida: 1, agency: 2,
    func: '전생의 죽음·처형·이혼·배신 같은 충격적 결말을 먼저 제시(도시에 §2 후킹·§4-1). "내가 죽고 나서야 그는 후회했다" 정형. 왜 이 상황인지를 1~3화 안에 던진다.',
    tip: '독자가 여주에게 빙의해 분노·억울함을 공유하도록 비극을 강렬하게. 이 장면이 회귀/복수의 동기이자 사이다의 채권이 된다.',
    ex: ['처형대·이혼 선고·독살의 순간', '전생의 죽음 직전 회상', '(남주 시점) 잃고 나서의 뒤늦은 후회'],
  },
  {
    key: 'awaken', title: '1. 회빙환 각성 · 목표 선언', sub: 'Awakening', pos: [1, 6], dist: 1, heat: 5, cida: 3, agency: 6,
    func: '"다시 시작이다" — 회귀·빙의·환생의 자각과 목표 설정(생존/복수/이혼/자유/파멸 회피). 미래 정보의 비대칭이 여주의 무기(도시에 §3).',
    tip: '목표를 한 문장으로 못박아라("이번엔 조용히 이혼당하고 싶을 뿐"). 빙의면 "원작 지식"이 무기이자 족쇄(원작 강제력)임을 깔아라.',
    ex: ['회귀: 결혼 전·처형 전 시점으로', '빙의: 내가 읽던 소설의 악역영애/엑스트라', '환생: 외동딸로 다시 태어남(육아물 결합)'],
  },
  {
    key: 'setup', title: '2. 세계관·무기 셋업', sub: 'Setup', pos: [4, 14], dist: 2, heat: 4, cida: 4, agency: 7,
    func: '세계관(제국·작위·사교계·마탑·신전)과 여주의 무기를 소개(도시에 §7). 미래 지식·마법·신성력·경영 지식·전생 기억 등 "스스로 푸는 능력"을 장착.',
    tip: '초반 25화 = 생존선. 여주 능력 + 남주 떡밥 + 세계관 후킹을 무료분 안에 다 보여줘야 연독률 확보(도시에 §4-2).',
    ex: ['미래 정보로 위기 선점', '전생 지식으로 사업/디저트/향수 성공', '숨겨진 고귀한 혈통·신탁의 단서'],
  },
  {
    key: 'meet', title: '3. 남주와 첫 접촉', sub: 'First Contact', pos: [8, 18], dist: 2, heat: 5, cida: 4, agency: 7,
    func: '넘버원 남주와 첫 조우 — 정략혼 상대·원작 남주·차가운 절대미남(보라/금안, 은발/흑발). 적대·무관심·계약에서 출발(도시에 §3·§6).',
    tip: '첫인상에 "왜 이 둘이 끌릴/부딪힐 수밖에 없는지"의 씨앗을 심어라. 남주의 냉정함 뒤 온도 변화 묘사를 예고.',
    ex: ['차가운 남주의 체온/온도 변화 복선', '정략혼·계약결혼 협정', '원작에선 여주(원래 주인공)의 차지였던 남자'],
  },
  {
    key: 'bind', title: '4. 엮임 · 강제 밀착', sub: 'Binding', pos: [14, 26], dist: 3, heat: 5, cida: 5, agency: 7,
    func: '둘을 붙여 두는 장치 — 계약결혼·황비 책봉·공작저 입성·주종 계약·같은 임무. "헤어질 수 없는 이유"를 박는다(도시에 §3 계약 관계).',
    tip: '거리에서 진심으로 이행하는 점진 구조의 출발선. 처음엔 계약, 나중엔 진심 공식. 떠날 수 있으면 텐션이 안 산다.',
    ex: ['계약/정략결혼으로 동거', '황비·공녀로 책봉되어 황궁 입성', '딸바보 보호자들의 함락(육아물: 혀 짧은 말투)'],
  },
  {
    key: 'cida1', title: '5. 첫 사이다 · 평판 역전', sub: 'First Payoff', pos: [22, 36], dist: 4, heat: 6, cida: 8, agency: 9,
    func: '쌓인 고구마(모욕·무시·서출 차별)를 처음으로 청산. 만인 앞 망신 역전의 축소판 — 여주의 능력·미래 지식이 공인되는 첫 통쾌(도시에 §2 사이다·§5).',
    tip: '고구마는 짧게, 사이다는 확실히. 3~5편 내 작은 사이다로 환기(3·3·3 리듬). 너무 늦은 첫 사이다는 이탈 요인.',
    ex: ['무시하던 자들 앞에서 능력 입증', '미래 지식으로 음모를 선제 분쇄', '서출·악역 딱지를 뒤집는 한 방'],
  },
  {
    key: 'falling', title: '6. 점화 · 호감도 상승', sub: 'Falling', pos: [30, 50], dist: 6, heat: 8, cida: 6, agency: 7,
    func: '사건을 함께 넘기며 거리 좁히기. "호감도가… 왜 오르는 거지?" 접촉의 단계적 고조(손끝→공주님 안기→벽쿵→첫 키스). 남주의 온리 유가 드러나기 시작.',
    tip: '심쿵을 일정 간격으로 분배. 남주 시점 독백 삽입으로 "그가 사실 얼마나 빠졌는지"를 폭로 → 독자 카타르시스(도시에 §3 이중 시점).',
    ex: ['위기 순간 공주님 안기/벽쿵', '차갑던 손끝의 온기 자각', '"내 것" 류 집착의 싹'],
  },
  {
    key: 'rival', title: '7. 라이벌·정치 음모 · 외부 위협', sub: 'Rising Conflict', pos: [45, 62], dist: 6, heat: 7, cida: 4, agency: 7,
    func: '라이벌 여캐(원작 여주/악녀)·약혼 방해·가문/황실 암투·원작 사건의 압박이 수면 위로(도시에 §4-1 중반·§7). 질투 플롯으로 진심 자각.',
    tip: '위협은 신분제·서출 차별·정략 관습 등 세계관에서 필연적으로 자라야 한다. 고구마 총량을 통제 — 답답함이 길면 별점 테러.',
    ex: ['연적·약혼자·과거 여자의 그림자(온리 유 시험)', '정치적 음모·반역 모함', '원작 강제력: "원작대로면 나는 죽는다"의 압박'],
  },
  {
    key: 'midpoint', title: '8. 중간점 전환 · 운명 비틀기', sub: 'Midpoint', pos: [50, 60], dist: 7, heat: 8, cida: 6, agency: 9,
    func: '"내가 아는 결말"을 능동적으로 뒤집는 결정적 선택, 또는 진심 첫 자각/비밀의 일부 폭로. A스토리(정치·운명)와 감정선이 교차하는 전환점(도시에 §3·§4-1).',
    tip: '"거짓 승리(절정 같은 행복)" 또는 "거짓 패배(진실 폭로)"로 판을 뒤집어라. 정보 비대칭의 애절함을 활용.',
    ex: ['원작 분기를 능동적으로 이탈', '진심을 처음 언어화', '신탁·예언이 여주를 "그 아이"로 공인'],
  },
  {
    key: 'black', title: '9. 절망의 순간 (블랙모먼트)', sub: 'All Is Lost', pos: [70, 82], dist: 1, heat: 9, cida: 2, agency: 6,
    func: '로맨스 필수 비트 — 관계가 끝장난 듯한 최저점. 회귀/빙의/정체 비밀의 폭로, 오해의 폭발, 희생을 위한 밀어냄, 죽음의 위협(도시에 §3·§4-1).',
    tip: '한 마디면 풀릴 오해(idiot plot)는 금물. 여주의 회귀 트라우마·남주의 상처가 필연적으로 일으킨 파국이어야 납득된다.',
    ex: ['회귀·정체가 들통나는 위기', '신분/희생을 위해 일부러 밀어냄', '정치 음모의 정점에서 처형/추방 위협'],
  },
  {
    key: 'darknight', title: '10. 영혼의 어두운 밤', sub: 'Dark Night', pos: [78, 88], dist: 2, heat: 6, cida: 3, agency: 7,
    func: '떨어진 채 각자 진심을 깨닫는 성찰. 방어기제(회귀 불신·트라우마)가 무너지고 "이 사람이어야 한다"를 자각. 남주의 처절한 헌신 결심.',
    tip: '"왜 하필 이 사람인가"가 마침내 설득되어야 한다. 회귀물이면 같은 비극 반복의 공포가, 빙의물이면 원작 강제력에의 저항 의지가 핵심.',
    ex: ['홀로 남아 진심 깨달음', '회귀: 같은 죽음 반복의 공포', '남주: 그녀를 지키기로 모든 것을 건 결심'],
  },
  {
    key: 'climax', title: '11. 클라이맥스 · 공개 망신 역전', sub: 'Public Reckoning', pos: [85, 95], dist: 9, heat: 10, cida: 10, agency: 10,
    func: '사이다의 정점 — 무도회·연회·재판에서 악역의 죄가 폭로되고 여주가 공인됨. 남주의 공개 선택·선언(만조백관 앞 황후 지목, 약혼 파기 후 여주 선택). 희생·구원 교차로 감정 확정(도시에 §5).',
    tip: '노력·고생에 비례한 인과적 정산 — 깔아둔 고구마를 전부 청산하라. 비밀 폭로는 거부가 아닌 포용으로 귀결(집착·헌신 강화). 운명 전복 확정.',
    ex: ['만인 앞 악역 인과응보(공개 망신 역전)', '남주의 공개 선언·황후 책봉', '목숨 걸고 구함(희생·구원 교차)'],
  },
  {
    key: 'hea', title: '12. 결말 · HEA / 외전', sub: 'Happily Ever After + Side Story', pos: [95, 100], dist: 10, heat: 7, cida: 9, agency: 9,
    func: 'HEA 보장 — 장르 계약(도시에 §2·§5). 결혼·즉위·운명 전복의 확정. 외전(번외)으로 신혼·임신·육아·질투 코미디·남주 시점 특별편의 달달함 보너스가 필수 관습.',
    tip: '비극·새드엔딩은 강한 사전 경고(태그) 없이는 배신으로 간주. "원작대로면 죽었어야 할 나"가 정반대 결말(황후·여신·행복)을 쟁취 → 주제 정산.',
    ex: ['결혼·즉위·일상 행복', '외전: 신혼·육아·질투 코미디', '남주 시점 후일담(온리 유 재확인)'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 하위유형 프리셋(도시에 §1 로판 분류) ─────────────────────────────────────
interface Preset {
  key: string
  name: string
  desc: string
  notes: Partial<Record<string, string>>           // 비트별 강조 메모
  curve?: Partial<Record<string, Partial<Pick<BeatDef, 'dist' | 'heat' | 'cida' | 'agency'>>>>  // 비트별 권장 곡선 덮어쓰기
}
const PRESETS: Preset[] = [
  {
    key: 'revenge', name: '회귀 복수', desc: '처형·이혼·배신 후 과거로 회귀. 미래 정보 비대칭으로 복수·예방·선점. 고구마 청산이 핵심 동력.',
    notes: {
      prologue: '복수의 채권을 크게 — 억울한 죽음/배신이 강렬할수록 사이다 정산이 통쾌하다.',
      awaken: '목표를 "복수/이혼/생존"으로 명확히. 회귀 트라우마(특정 인물 불신)를 동력으로.',
      cida1: '미래 지식으로 적의 음모를 선제 분쇄하는 첫 사이다를 빠르게 배치.',
      climax: '공개 재판·연회에서 가해자들에게 인과응보. 자업자득식 자멸을 선호하는 최근 트렌드도 고려.',
    },
    curve: { prologue: { cida: 0, heat: 8 }, cida1: { cida: 9 }, climax: { cida: 10 } },
  },
  {
    key: 'villainess', name: '악역영애 빙의', desc: '내가 읽던 소설의 악역영애/엑스트라로 빙의. 파멸 플래그 회피 — 호감도·평판·관계 재설계. 원작 강제력이 긴장 엔진.',
    notes: {
      awaken: '"원작대로면 나는 처형/추방당한다"를 인지. 원작 지식이 무기이자 족쇄임을 설정.',
      setup: '호감도·평판을 능동적으로 재설계. 원작 등장인물 지도를 그려 파멸 플래그를 하나씩 제거.',
      midpoint: '원작 분기를 능동적으로 이탈하는 선택이 전환점. "원작에서 이 남자는 여주인공의 차지였다"의 비틂.',
      black: '빙의·원작 지식이 들통나는 순간을 파국으로. 원작 강제력의 반격과 겹쳐라.',
    },
    curve: { awaken: { agency: 7 }, midpoint: { agency: 9, cida: 7 } },
  },
  {
    key: 'baby', name: '환생 육아 (딸바보)', desc: '어린 여주로 환생 + 어른 보호자들의 딸바보 구도. 힐링·치유 정서. 관능보다 가족애·성장.',
    notes: {
      awaken: '어린 몸으로 환생. 전생 기억으로 조숙하되 사랑스러움(혀 짧은 말투)으로 보호자 함락.',
      bind: '딸바보 보호자(아빠·삼촌·황제)들의 과보호 함락이 곧 엮임. 가족 공동체 형성.',
      falling: '로맨스는 성장 후로 미루거나 보호자→연인 전환을 천천히. 가족애가 우선 동력.',
      hea: '외전은 성장한 여주의 결혼·가족의 행복. 달달함 + 따뜻함.',
    },
    curve: { awaken: { heat: 3, agency: 7 }, bind: { heat: 4 }, falling: { heat: 6, dist: 5 } },
  },
  {
    key: 'contract', name: '계약·정략결혼', desc: '계약결혼/정략혼으로 묶임. "처음엔 계약, 나중엔 진심" 공식. 거리감→진심의 점진 구조가 백미.',
    notes: {
      bind: '계약/정략의 조건을 명확히(기간·규칙·이혼 약정). 어길 수 없는 이유를 박아라.',
      falling: '계약 관계 안에서 호감도가 새는 순간들을 누적. "이건 계약일 뿐"이라는 자기방어.',
      midpoint: '"가짜/계약이 진짜가 되는" 순간이 전환점 — 규칙을 넘어선 진심의 자각.',
      black: '"어차피 계약이었잖아"라는 자기방어가 파국을 부른다.',
    },
    curve: { bind: { dist: 3, heat: 5 }, midpoint: { dist: 7, heat: 8 } },
  },
  {
    key: 'dark', name: '다크 집착물', desc: '집착광공형 남주·다크로판 분위기. 강한 소유욕·헌신. 사전 경고(태그) 필수. 관능도 높음.',
    notes: {
      meet: '남주의 위험한 매력·소유욕을 첫 접촉부터 암시. "도망치지 마" 류 집착 대사의 복선.',
      falling: '집착·소유욕을 헌신으로 승화. 폭력성과 매력의 경계를 작가가 통제해야 함.',
      black: '집착이 폭주하거나 여주가 거부해 최저점. 다크의 수위 조절이 관건.',
      hea: '집착의 정착 — 소유가 아닌 헌신으로의 안착. 외전에서 안정된 달달함.',
    },
    curve: { meet: { heat: 6 }, falling: { heat: 9, dist: 6 }, black: { heat: 10 } },
  },
  {
    key: 'cozy', name: '힐링·경영', desc: '영지 개발·상단·디저트·향수 등 전생 지식 사업물. 사이다는 성공·인정, 고구마는 짧게. 따뜻한 톤.',
    notes: {
      setup: '전생 지식 기반 사업/경영 아이템을 무기로. 영지·상단·요리 등 구체적 디테일로 차별화.',
      cida1: '사업 성공·실력 인정이 곧 사이다. 능력으로 신분/평판을 상승시킨다.',
      rival: '경쟁 상단·시기하는 귀족 등 비교적 가벼운 위협. 답답함을 길게 끌지 말 것.',
      hea: '사업 성공 + 사랑 + 일상 행복의 정산. 잔잔한 외전.',
    },
    curve: { setup: { agency: 8, cida: 5 }, cida1: { cida: 8 }, rival: { cida: 5 } },
  },
]

// ── 분량 단위 ────────────────────────────────────────────────────────────
type Unit = 'episode' | 'won고' | 'page'
const UNIT_LABEL: Record<Unit, string> = { episode: '회차', 'won고': '원고지(매)', page: '페이지' }
const UNIT_SHORT: Record<Unit, string> = { episode: '화', 'won고': '매', page: 'p' }

// ── 비트 발상 시드 슬롯 풀(막힌 비트의 글감) — 조합수 56억+ (도시에 §3·§5·§6·§7) ─────
// 6개 축을 무작위 조합. 각 축의 풀 길이 곱이 총 조합수.
const SEED_AXES: { key: string; label: string; pool: string[] }[] = [
  {
    key: 'place', label: '무대',
    pool: [
      '황궁 대무도회장', '공작저 유리 온실', '황실 비밀 서고', '사교계 봄 다과회', '신전 대예배당', '마탑 최상층 첨탑',
      '영지 영주 집무실', '황제의 장미 정원', '아카데미 기숙사 옥상', '흔들리는 마차 안', '연회장 달빛 발코니',
      '대법정 재판정', '황후궁 침소', '대상단 본점 응접실', '눈 내리는 별궁', '성벽 위 망루', '겨울 사냥터 산장',
      '가면무도회 회랑', '신탁의 제단', '왕가의 묘소', '운하 위 곤돌라', '폐허가 된 옛 가문 저택',
      '약초가 자란 후원', '결투장', '대관식 홀', '비 내리는 회랑', '온천이 솟는 별저', '도서탑 나선 계단',
      '연무장(기사단)', '항구의 무역선 갑판',
      '황실 온실 정원의 분수대', '귀족 자제 사교 아카데미 강당', '깊은 밤 황궁 회랑', '버려진 북쪽 탑',
      '귀빈 환영 가든파티', '눈보라 치는 국경 요새', '황실 마구간', '오래된 가문 예배당',
      '연회 뒤 텅 빈 무도회장', '달빛 비치는 호숫가 정자', '대상단의 비밀 창고', '신전 지하 봉인실',
      '황태자궁 서재', '귀족가 무도 연습실', '국경 마을의 작은 여관', '안개 낀 마법 숲의 오솔길',
    ],
  },
  {
    key: 'trigger', label: '촉발 사건',
    pool: [
      '정략혼 통보', '독살 미수 발각', '원작 사건의 조기 발발', '연적의 공개 모함', '신탁·예언의 공표', '봉인된 비밀 서신 입수',
      '일방적 약혼 파기 선언', '반역 모의 적발', '회귀 전 죽음의 플래시백', '서출이라는 멸시', '다가올 재해의 예지',
      '가문 몰락의 징조', '성녀 후보 지목', '계약 조항의 치명적 위반', '갑작스러운 황제의 부름', '암살자의 야습',
      '잃었던 동생의 귀환', '경쟁 상단의 매점매석', '마수의 영지 침범', '혼약자의 외도 발각', '누명을 쓴 시녀의 호소',
      '봉인 마법의 균열', '황태자 책봉식 발표', '전염병의 창궐', '의문의 유산 상속', '원작 여주의 등장',
      '저주받은 혈통의 발현', '한밤의 비밀 약속', '몰락 귀족의 도박빚', '신물(神物)의 각성',
      '강제 약혼서의 도착', '황실 무도회 초대장', '가문 영지의 흉작', '의문의 협박 편지',
      '국경 분쟁의 격화', '폐위된 황족의 귀환', '성년식의 갑작스러운 발표', '비밀 결사의 접근',
      '오래된 저주의 발동 조짐', '실종된 약혼자의 흔적', '황궁 내 권력 다툼의 표면화', '낯선 마법사의 방문',
      '가짜 신탁의 유포', '몰래 진행된 혼담', '잊힌 옛 약속의 청구', '갑작스러운 작위 박탈',
    ],
  },
  {
    key: 'cidaType', label: '사이다 종류',
    pool: [
      '미래 지식으로 음모 선제 분쇄', '만인 앞 공개 망신 역전', '실력·재능의 공인', '권력 역전(지위 쟁취)', '악역의 자업자득 자멸',
      '숨겨진 고귀한 혈통 폭로', '남주의 공개 비호 선언', '경제력·사업 성공', '신성력·마법의 각성', '결정적 증거로 무고함 입증',
      '계약을 역이용한 한 방', '연적의 거짓말 들통', '황제·신전의 인정', '배신자 색출과 단죄', '대중의 여론 전복',
      '결투 승리로 명예 회복', '잊지 못할 명대사 한 줄', '재산·영지 회수', '협박 카드를 되돌려줌', '가문의 복권',
      '비밀을 미끼로 한 거래 우위', '예언이 여주 편임을 입증', '적의 약점 폭로', '무시하던 자의 사과', '동맹 세력 규합',
      '사교계 평판의 단숨에 역전', '몰락 직전 가문의 재건', '연적의 음모를 함정으로 되치기', '황실의 공식 후원 획득',
      '오랜 누명을 벗는 결정적 증언', '경쟁 상단을 흡수한 사업 확장', '숨겨둔 인맥의 일제 등장', '귀족 회의에서의 발언권 장악',
      '적의 비밀 장부를 손에 넣음', '여론을 뒤집는 폭로 기사', '실력으로 거머쥔 작위 서임', '배은망덕한 친족의 추락',
      '신전 심판에서의 결백 입증', '오만한 귀족의 무릎 꿇림', '잊혔던 공로의 뒤늦은 포상', '거래에서 우위를 점한 협상 타결',
    ],
  },
  {
    key: 'romance', label: '심쿵 포인트',
    pool: [
      '공주님 안기(가로안기)', '벽쿵(벽치기)', '손목 잡아끌기', '차갑던 손끝의 온기', '남주 독백 삽입(온리 유)',
      '니어 키스 후 도망', '질투 어린 시선', '"내 것"이라는 소유 선언', '말없이 겉옷을 덮어줌', '위기에 몸을 던져 구함',
      '머리카락을 귀 뒤로 넘겨줌', '이마에 닿는 입맞춤', '잠든 모습을 지켜봄', '"도망치지 마" 류 집착', '무릎 꿇고 신발을 신겨줌',
      '폭우 속 우산을 기울여줌', '상처를 직접 싸매줌', '춤 신청과 첫 왈츠', '귓가에 속삭이는 경고', '손바닥에 입맞춤',
      '뒤에서 살며시 끌어안음', '비밀을 알고도 모른 척 지켜줌', '선물에 담긴 숨은 의미', '눈을 가리고 깜짝 선물', '체온으로 추위를 녹여줌',
      '쓰러질 뻔한 몸을 받아줌', '흐트러진 옷매무새를 정리해줌', '말 없이 손을 꼭 잡아줌', '눈물을 닦아주는 손길',
      '한 발 앞서 위험을 막아섬', '추운 손을 제 손으로 감싸줌', '말다툼 끝의 갑작스러운 포옹', '어깨에 기대 잠든 것을 받아줌',
      '먼발치에서 지켜보는 다정한 눈빛', '비밀스레 챙겨둔 작은 선물', '아픈 곳을 가만히 짚어주는 손', '돌아서는 어깨를 붙잡는 손',
      '함께 맞는 첫눈 아래의 침묵', '곁을 떠나지 않겠다는 약속', '서툴게 건네는 따뜻한 차 한 잔', '위로하듯 머리를 쓰다듬는 손',
    ],
  },
  {
    key: 'obstacle', label: '장애물',
    pool: [
      '신분·서출 차별', '원작 강제력의 반격', '연적·약혼자', '정치적 음모', '회귀 트라우마(불신)', '가문 간 정략',
      '오해의 누적', '남주의 방어기제', '신전·황실의 권력', '시한부·저주의 운명', '여론·평판의 추락', '비밀 누설의 위협',
      '경제적 몰락', '마력·신성력의 폭주', '과거 연인의 그림자', '황실 계승 분쟁', '암살 위협', '강제 결혼 압박',
      '기억 상실', '봉인된 진실', '적국과의 전쟁', '가문의 빚', '질병·역병', '신의 노여움', '운명의 예언서',
      '사교계의 따돌림', '계급 차이의 벽', '집안 어른들의 반대', '거짓 소문의 확산',
      '권력자의 일방적 구애', '계약 기간의 만료 압박', '잊힌 과거의 죄책감', '신분을 숨겨야 하는 처지',
      '주변의 끊임없는 의심', '대를 잇는 가문의 숙적', '봉인이 풀린 고대의 위협', '되풀이되는 비극의 그림자',
      '발각될까 두려운 정체', '저버릴 수 없는 책임', '닿을 수 없는 신분의 거리',
    ],
  },
  {
    key: 'twist', label: '반전·떡밥',
    pool: [
      '남주가 사실 회귀·빙의를 눈치챔', '악역이 또 다른 회귀자', '예언 속 "그 아이"가 여주', '죽은 줄 알았던 인물의 생존',
      '원작과 다른 진짜 흑막', '남주의 숨겨진 정체(황태자·신의 자손)', '여주 혈통에 얽힌 비밀', '계약서의 숨겨진 조항',
      '전생의 인연이 현생에 재현', '신물(神物)이 여주를 선택', '조력자가 사실 배신자', '적의 진짜 동기는 사랑',
      '여주가 원작 작가/플레이어', '봉인된 또 하나의 인격', '쌍둥이·대역의 존재', '저주의 진짜 조건', '예언의 오역',
      '남주의 기억 속 그녀', '세계 자체가 게임/소설', '두 번째 회귀의 진실', '신탁의 배후 세력', '여주에게만 보이는 시스템 창',
      '악역의 누명과 진실', '잊힌 고대 혈약', '운명을 비튼 대가',
      '충직한 집사의 숨은 신분', '오래된 초상화 속 낯익은 얼굴', '약혼이 사실은 누군가의 계략', '여주를 노린 진짜 표적의 정체',
      '선대에 맺어진 비밀 혼약', '적과 아군이 뒤바뀐 진실', '버려진 줄 알았던 출생의 비밀', '남주가 오래전부터 지켜본 인연',
      '예언서에 빠진 마지막 한 줄', '악역의 배후에 선 또 다른 인물', '잃어버린 가문 보물의 행방', '죽음으로 위장한 인물의 계획',
      '여주만 기억하는 사라진 진실', '두 사람을 잇는 운명의 표식', '겉과 속이 다른 조력자의 본심',
    ],
  },
]
const SEED_TOTAL = SEED_AXES.reduce((n, a) => n * a.pool.length, 1)

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}
function fmtBig(n: number): string {
  // 한국어 만/억/조 단위 표기
  if (n >= 1e12) return `${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)}만`
  return n.toLocaleString('ko-KR')
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

interface BeatState { text: string; done: boolean; dist: number; heat: number; cida: number; agency: number }
interface Store {
  title: string
  unit: Unit
  total: string
  preset: string
  beats: Record<string, BeatState>
}

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, dist: b.dist, heat: b.heat, cida: b.cida, agency: b.agency } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'episode', total: '', preset: 'villainess', beats }
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
      unit: (p.unit === 'won고' || p.unit === 'page') ? p.unit : 'episode',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'villainess',
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
          cida: clamp(v.cida, 0, 10, b.cida),
          agency: clamp(v.agency, 0, 10, b.agency),
        }
      }
    }
    return s
  } catch { return base }
}

export default function RomfanPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  // 비트별 발상 시드 + 잠금
  const [seeds, setSeeds] = useState<Record<string, Record<string, string>>>({})
  const [locks, setLocks] = useState<Record<string, Record<string, boolean>>>({})
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — 로판 외 장르로 열리면 안내(동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '로맨스판타지' && mounted.current) {
      setNote(`이 도구는 로맨스판타지 전용입니다(현재 장르: ${g}). 비트 가이드는 로판 관습 기준이에요.`)
    }
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800) }

  const preset = PRESETS.find((p) => p.key === store.preset) || PRESETS[0]

  // ── 변경 헬퍼 ──────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total'>>) => setStore((s) => ({ ...s, ...patch }))
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))
  const toggleOpen = (key: string) => setOpenKey((o) => ({ ...o, [key]: !o[key] }))

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    setStore((s) => {
      const beats = { ...s.beats }
      // 권장 곡선 덮어쓰기(작성하지 않은 비트도 곡선만 권장값으로 맞춤)
      for (const b of BEATS) {
        const base = emptyBeat(b)
        const ov = p.curve?.[b.key] || {}
        beats[b.key] = { ...beats[b.key], dist: ov.dist ?? base.dist, heat: ov.heat ?? base.heat, cida: ov.cida ?? base.cida, agency: ov.agency ?? base.agency }
      }
      return { ...s, preset: key, beats }
    })
    flashMsg(`'${p.name}' 프리셋 적용 — 4개 곡선을 권장값으로 맞췄어요`)
  }

  // ── 권장 위치 환산 ─────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const totalDigits = store.total.replace(/[^\d.]/g, '')
  const fmtPos = (r: [number, number]): string => {
    if (totalNum > 0) {
      const a = Math.max(1, Math.round((r[0] / 100) * totalNum))
      const b = Math.max(a, Math.round((r[1] / 100) * totalNum))
      return `${a}~${b}${UNIT_SHORT[store.unit]} (${r[0]}~${r[1]}%)`
    }
    return `전체의 ${r[0]}~${r[1]}% 구간`
  }

  // ── 진행률 ─────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim()).length
  const pct = Math.round((doneCount / BEATS.length) * 100)

  // ── 4개 곡선(사이다 / 관계 거리 / 설렘 / 주도권) ─────────────
  const CW = 660, CH = 178, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const y10 = (v: number) => PADY + (1 - v / 10) * (CH - PADY * 2)        // 0~10
  const yHeat = (h: number) => PADY + (1 - (h - 1) / 9) * (CH - PADY * 2) // 1~10
  const C_CIDA = '#e0a93d'   // 사이다(금색)
  const C_DIST = 'var(--accent)'
  const C_HEAT = '#e0533d'
  const C_AGEN = '#3fb27f'
  type Curve = { key: keyof BeatState; color: string; label: string; yFn: (v: number) => number; dash?: string; w: number }
  const CURVES: Curve[] = [
    { key: 'cida', color: C_CIDA, label: '사이다 게이지', yFn: y10, w: 2.8 },
    { key: 'dist', color: C_DIST, label: '관계 거리', yFn: y10, w: 2.2 },
    { key: 'heat', color: C_HEAT, label: '설렘·긴장', yFn: yHeat, dash: '5 4', w: 1.9 },
    { key: 'agency', color: C_AGEN, label: '여주 주도권', yFn: y10, dash: '2 3', w: 1.9 },
  ]
  const pathOf = (c: Curve) =>
    BEATS.map((b, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${c.yFn(store.beats[b.key][c.key] as number).toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §2·§4-2·§8 함정) ──────────────────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    const bm = store.beats['black']
    out.push({ ok: !!bm.text.trim(), msg: bm.text.trim() ? '블랙모먼트(절망의 순간)가 설계되어 있어요 — 로맨스 필수 비트' : '블랙모먼트가 비었어요 — 관계가 끝장난 듯한 최저점이 없으면 클라이맥스가 약해져요' })
    // 사이다 정산: 클라이맥스 사이다가 프롤로그(고구마)보다 충분히 높아야
    const cidaDelta = store.beats['climax'].cida - store.beats['prologue'].cida
    out.push({ ok: cidaDelta >= 7, msg: cidaDelta >= 7 ? `고구마→사이다 낙차가 충분해요(+${cidaDelta}) — 인과적 정산` : `고구마→사이다 낙차가 약해요(+${cidaDelta}) — 깔아둔 억울함만큼 통쾌하게 청산해야 만족도가 올라요` })
    // 첫 사이다 타이밍: 첫 사이다 비트가 전체 36% 안에 배치(초반 환기)
    out.push({ ok: store.beats['cida1'].cida >= 7, msg: store.beats['cida1'].cida >= 7 ? '첫 사이다(평판 역전)가 충분히 통쾌해요 — 초반 이탈 방지' : '첫 사이다가 약해요 — 너무 늦거나 약한 첫 사이다는 연독률을 떨어뜨려요(고구마 too much)' })
    // 민폐 여주 방지: 능동 구간(셋업~중간점)의 평균 주도권이 6 이상
    const coreAgency = (store.beats['setup'].agency + store.beats['cida1'].agency + store.beats['midpoint'].agency) / 3
    out.push({ ok: coreAgency >= 6, msg: coreAgency >= 6 ? '여주의 주도권이 충분해요 — 스스로 문제를 해결하는 주체성' : '여주 주도권이 낮아요 — 구원만 기다리는 "민폐 여주"는 비판 1순위예요(스스로 푸는 능력 부여)' })
    // 밀당/블랙: 블랙모먼트에서 관계 거리가 점화(falling)보다 떨어져야
    out.push({ ok: store.beats['black'].dist < store.beats['falling'].dist, msg: store.beats['black'].dist < store.beats['falling'].dist ? '블랙모먼트에서 관계 거리가 급락해 진자가 살아 있어요' : '블랙모먼트인데 거리가 안 떨어졌어요 — 단조로운 상승은 긴장을 죽여요' })
    // 남주 온리 유: 점화의 설렘이 충분(남주의 헌신 신호)
    out.push({ ok: store.beats['falling'].heat >= 7, msg: store.beats['falling'].heat >= 7 ? '점화 구간의 설렘이 충분해요 — 남주의 온리 유 헌신' : '점화 설렘이 약해요 — 심쿵 분배가 늦으면 이탈해요(남주 독백·접촉 고조 활용)' })
    // HEA 계약
    out.push({ ok: store.beats['hea'].dist >= 9, msg: store.beats['hea'].dist >= 9 ? 'HEA 결말의 관계 거리가 충분해요(장르 계약 충족 · 외전 보너스 권장)' : 'HEA에서 관계 거리가 낮아요 — 맺어지지 않으면 로판 계약 위반이에요(해피엔딩 기본값)' })
    return out
  })()
  const diagOk = diagnostics.filter((d) => d.ok).length

  // ── 비트 발상 시드(슬롯 풀 무작위, 잠금/재생성) ──────────────
  const rollSeed = (beatKey: string) => {
    setSeeds((prev) => {
      const cur = prev[beatKey] || {}
      const lk = locks[beatKey] || {}
      const next: Record<string, string> = {}
      for (const a of SEED_AXES) next[a.key] = lk[a.key] && cur[a.key] ? cur[a.key] : pick(a.pool)
      return { ...prev, [beatKey]: next }
    })
  }
  const toggleSeedLock = (beatKey: string, axis: string) =>
    setLocks((prev) => ({ ...prev, [beatKey]: { ...(prev[beatKey] || {}), [axis]: !(prev[beatKey]?.[axis]) } }))
  const seedToText = (beatKey: string) => {
    const s = seeds[beatKey]
    if (!s) return
    const line = SEED_AXES.map((a) => `${a.label}: ${s[a.key]}`).join(' / ')
    setStore((st) => {
      const prevText = st.beats[beatKey].text
      const merged = prevText.trim() ? `${prevText.trim()}\n· (시드) ${line}` : `(시드) ${line}`
      return { ...st, beats: { ...st.beats, [beatKey]: { ...st.beats[beatKey], text: merged } } }
    })
    flashMsg('발상 시드를 비트 내용에 넣었어요')
  }

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const L: string[] = []
    L.push(`[로판 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`하위유형: ${preset.name} — ${preset.desc}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%) · 페이싱 점검 ${diagOk}/${diagnostics.length}`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)}〉`)
      L.push(`   곡선: 사이다 ${st.cida}/10 · 관계거리 ${st.dist}/10 · 설렘 ${st.heat}/10 · 주도권 ${st.agency}/10`)
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
    parts.push(`<p><strong>하위유형:</strong> ${esc(preset.name)} — ${esc(preset.desc)}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%) · <strong>페이싱 점검:</strong> ${diagOk}/${diagnostics.length}</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))}〉</span></h3>`)
      parts.push(`<p><em>곡선: 사이다 ${st.cida}/10 · 관계거리 ${st.dist}/10 · 설렘 ${st.heat}/10 · 주도권 ${st.agency}/10</em></p>`)
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
      title: store.title.trim() ? `로판 플롯 — ${store.title.trim()}` : '로판 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        장르: '로맨스판타지',
        하위유형: preset.name,
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        페이싱점검: `${diagOk}/${diagnostics.length}`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashMsg(id ? '프로젝트 자료(구조)에 플롯 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  const toSnippet = () => {
    const filled = BEATS.filter((b) => store.beats[b.key].text.trim())
    if (filled.length === 0) { setNote('저장할 비트 내용이 없어요. 비트를 펼쳐 내용을 적어 보세요.'); return }
    const text = filled.map((b) => `[${b.title}] ${store.beats[b.key].text.trim()}`).join('\n')
    addToLibrary('snippets', { text, source: `로판 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['로맨스판타지', '플롯', '구조', preset.name] })
    flashMsg('작성한 비트를 글감(스니펫)으로 저장했어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·진행 상태·곡선을 초기화할까요?')) return
    setStore(defaultStore()); setOpenKey({}); setSeeds({}); setLocks({})
    flashMsg('모두 초기화했어요')
  }

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
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : C_CIDA}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35 }
  const posLine: React.CSSProperties = { fontSize: 11.5, color: C_CIDA, marginTop: 3, fontWeight: 600 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const funcBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 9px' }
  const presetNote: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const exTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px' }
  const seedChip = (locked: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '3px 7px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${locked ? C_CIDA : 'var(--border)'}`, background: locked ? 'color-mix(in srgb, ' + C_CIDA + ' 16%, transparent)' : 'var(--chrome-2)' })

  const RELATED: { id: string; label: string }[] = [
    { id: 'romfan-tropes', label: '🏷️ 로판 트로프' },
    { id: 'romfan-synopsis', label: '📝 로판 시놉시스' },
    { id: 'romfan-outline', label: '🗂️ 로판 개요' },
    { id: 'romfan-eventforge', label: '🎲 로판 사건 생성기' },
    { id: 'romfan-sceneforge', label: '🎬 로판 장면 생성기' },
    { id: 'romfan-charforge', label: '🧬 로판 인물 생성기' },
    { id: 'romance-plotlogic', label: '💞 로맨스 플롯 로직' },
  ]

  // 슬라이더 정의(비트 카드 내부)
  const SLIDERS: { key: keyof BeatState; label: string; color: string; lo: number; loTxt: string; hiTxt: string }[] = [
    { key: 'cida', label: '사이다', color: C_CIDA, lo: 0, loTxt: '고구마', hiTxt: '통쾌' },
    { key: 'dist', label: '관계 거리', color: C_DIST, lo: 0, loTxt: '남남', hiTxt: '결합' },
    { key: 'heat', label: '설렘·긴장', color: C_HEAT, lo: 1, loTxt: '잔잔', hiTxt: '심쿵' },
    { key: 'agency', label: '여주 주도권', color: C_AGEN, lo: 0, loTxt: '수동', hiTxt: '능동' },
  ]

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <span style={{ fontSize: 18 }}><Emoji e="👑"/></span>
          <input style={{ ...input, flex: '2 1 170px' }} value={store.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '0 1 90px', width: 90 }} value={store.total} onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })} placeholder="총 분량" inputMode="decimal" aria-label="총 분량" />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Unit })} aria-label="분량 단위">
            <option value="episode">회차</option>
            <option value="won고">원고지(매)</option>
            <option value="page">페이지</option>
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>하위유형</label>
          <select style={{ ...select, flex: '1 1 200px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="하위유형 프리셋">
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <span style={{ ...hint, flex: '1 1 220px', fontSize: 11.5 }}>{preset.desc}</span>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong> · 페이싱 <strong style={{ color: diagOk === diagnostics.length ? 'var(--ok)' : 'var(--warn)' }}>{diagOk}/{diagnostics.length}</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 4개 곡선: 사이다 · 관계 거리 · 설렘 · 주도권 ── */}
        <div style={panel}>
          <div style={sectionTitle}>4개 곡선 · 프롤로그→HEA (고구마↔사이다 진자 + 감정·주도권)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 196 }} role="img" aria-label="로판 진행 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {CURVES.map((c) => (
              <path key={c.key as string} d={pathOf(c)} fill="none" stroke={c.color} strokeWidth={c.w} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.dash} opacity={0.9} />
            ))}
            {/* 사이다 곡선 점(주축) */}
            {BEATS.map((b, i) => (
              <circle key={'c' + i} cx={xAt(i)} cy={y10(store.beats[b.key].cida)} r={3.4} fill={C_CIDA} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${b.title} · 사이다 ${store.beats[b.key].cida}/10`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {CURVES.map((c) => (
              <span key={c.key as string} style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ display: 'inline-block', width: 14, height: 3, background: c.color, verticalAlign: 'middle', marginRight: 5 }} />{c.label}
              </span>
            ))}
          </div>
          <div style={{ ...hint, fontSize: 11.5, marginTop: 4 }}>사이다는 9번(블랙모먼트)에서 바닥→11번(공개 망신 역전)에서 정점으로. 고구마를 깐 만큼 통쾌하게 정산하세요.</div>
        </div>

        {/* ── 페이싱 자가진단 ── */}
        <div style={panel}>
          <div style={sectionTitle}>페이싱 자가진단 · {diagOk}/{diagnostics.length} 충족 (도시에 함정 기반)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: d.ok ? 'var(--text)' : 'var(--warn)' }}>
                <span style={{ marginRight: 6 }}><Emoji e={d.ok ? '✅' : '⚠️'}/></span>{d.msg}
              </div>
            ))}
          </div>
        </div>

        {/* ── 12비트 입력 ── */}
        {BEATS.map((b) => {
          const st = store.beats[b.key]
          const isOpen = !!openKey[b.key]
          const hasContent = !!st.text.trim()
          const pn = preset.notes[b.key]
          const seed = seeds[b.key]
          const lk = locks[b.key] || {}
          return (
            <div key={b.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => patchBeat(b.key, { done: !st.done })} aria-label={`${b.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 사이다 {st.cida} · 거리 {st.dist} · 설렘 {st.heat} · 주도권 {st.agency}</div>
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
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="장면·사건·감정·대사·사이다 포인트를 자유롭게…" />

                  {/* 4개 슬라이더 */}
                  {SLIDERS.map((sl) => (
                    <div key={sl.key as string} style={sliderRow}>
                      <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>{sl.label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 34, flexShrink: 0, textAlign: 'right' }}>{sl.loTxt}</span>
                      <input type="range" min={sl.lo} max={10} value={st[sl.key] as number} onChange={(e) => patchBeat(b.key, { [sl.key]: Number(e.target.value) } as Partial<BeatState>)} style={{ flex: 1, accentColor: sl.color }} aria-label={`${b.title} ${sl.label}`} />
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 30, flexShrink: 0 }}>{sl.hiTxt}</span>
                      <strong style={{ fontSize: 13, width: 30, textAlign: 'right', color: sl.color }}>{st[sl.key] as number}</strong>
                    </div>
                  ))}

                  {/* 발상 시드(슬롯 풀 무작위, 잠금/재생성) */}
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 9, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ ...subLabel, color: C_CIDA }}><Emoji e="💡"/> 비트 발상 시드</span>
                      <button className="minibtn" onClick={() => rollSeed(b.key)} title="슬롯 풀에서 무작위 조합(잠금은 유지)">{seed ? <><Emoji e="🎲"/> 다시 굴리기</> : <><Emoji e="🎲"/> 굴리기</>}</button>
                      {seed && <button className="minibtn" onClick={() => seedToText(b.key)} title="시드를 위 내용에 추가">⬆️ 내용에 넣기</button>}
                      <span style={{ ...hint, fontSize: 11, marginLeft: 'auto' }}>조합수 {fmtBig(SEED_TOTAL)}가지</span>
                    </div>
                    {seed ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {SEED_AXES.map((a) => (
                          <span key={a.key} style={seedChip(!!lk[a.key])} onClick={() => toggleSeedLock(b.key, a.key)} title={lk[a.key] ? '잠금 해제(다음 굴리기에 바뀜)' : '잠금(다음 굴리기에 고정)'}>
                            <span style={{ opacity: 0.7 }}><Emoji e={lk[a.key] ? '🔒' : '🔓'}/></span>
                            <span style={{ color: 'var(--muted)' }}>{a.label}:</span>
                            <strong>{seed[a.key]}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...hint, fontSize: 11.5 }}>막힌 비트라면 굴려서 무대·촉발 사건·사이다 종류·심쿵·장애물·반전을 무작위로 받아보세요. 칩을 눌러 잠그면 그 축만 고정됩니다.</div>
                    )}
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
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '로맨스판타지' })} title={`${r.label} 열기`}>{emojify(r.label)}</button>
          ))}
        </div>
      </div>

      <div style={{ ...foot, borderBottom: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">프로젝트:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '12비트 플롯을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet} title="작성한 비트를 글감(스니펫) 라이브러리에 저장"><Emoji e="💾"/> 글감으로 저장</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={() => setOpenKey(Object.fromEntries(BEAT_KEYS.map((k) => [k, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpenKey({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>초기화</button>
      </div>
    </div>
  )
}
