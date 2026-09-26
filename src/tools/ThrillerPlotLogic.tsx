// 스릴러·서스펜스 플롯·진행곡선(로직) 템플릿 — 도시에 근거한 "스릴러 표준 12비트 구조 + 페이싱"을 단계 입력 시트로.
// 핵심 통념: 스릴러 = 미래 지향("막을 수 있나, 무슨 일이 일어날 것인가"). 서스펜스 = 정보 비대칭으로 만든 '기다림의 긴장'(히치콕 폭탄론).
//  · 12비트(일상→여진/스팅어)에 각자 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 ① 위협(stakes·임박성 0~10) ② 긴장(서스펜스·정보 비대칭 1~10) 두 곡선 → 에스컬레이션 사다리 + 완급 파동 가시화.
//  · 비트별 '정보 비대칭(드라마틱 아이러니)' 매트릭스: 독자>인물(서스펜스)·독자=인물(동행)·독자<인물(서프라이즈). "누가 무엇을 아는가"를 장면 단위로 강제.
//  · 하위유형 프리셋(리걸/스파이·정치/법의학·연쇄/도메스틱·심리/액션·추적/테크노) → 비트 가이드·결말형·시점 신뢰도 자동 세팅.
//  · 티킹 클락(명시 타이머/자연 마감/사회적 마감)·시점 신뢰도·결말형(승리/다크/오픈+스팅어) 설정 — 독자와의 사전 약속.
//  · 페이싱 자가진단(위협 에스컬레이션/티킹 클락/공정한 반전 복선/믿을 수 없는 화자/도덕적 대가 등) 체크.
//  · 장치 굴림기: 위협×적대자×티킹클락×반전축×무대×스팅어×체호프의총×레드헤링 8슬롯 무작위(잠금/재생성) — 조합수 1조 이상. 글감 저장 가능.
// 자급식: react/linkbus 외 import 없음. 전부 로컬(외부 API 없음). localStorage 'sry:tool:thriller-plotlogic' 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'thriller-plotlogic', name: '스릴러 플롯 로직', icon: '⏱️', group: '플롯', genre: '스릴러·서스펜스', intro: '스릴러 표준 12비트 구조·위협/긴장 곡선·정보 비대칭 매트릭스로 추적형 서사의 진행과 페이싱을 설계하세요', w: 720, h: 680 }

const LS_KEY = 'sry:tool:thriller-plotlogic'

// ── 정보 비대칭(드라마틱 아이러니) 모드 — 도시에 §3 핵심: 독자와 인물의 앎의 차이 ──────
// 서스펜스 = 독자 > 인물(테이블 밑 폭탄), 미스터리/동행 = 독자 = 인물, 서프라이즈/반전 = 독자 < 인물.
const IRONY = [
  { key: 'reader>char', label: '서스펜스(독자>인물)', desc: '독자만 위험을 안다 — 히치콕 "테이블 밑 폭탄". 인물이 모르는 채 다가가는 동안 기다림의 긴장' },
  { key: 'reader=char', label: '동행(독자=인물)', desc: '독자와 인물이 같은 속도로 안다 — 함께 추적·발견. 미스터리적 공감과 몰입' },
  { key: 'reader<char', label: '서프라이즈(독자<인물)', desc: '독자가 결정적 한 조각을 모른다 — 반전·폭로의 충격. 단, 반드시 공정하게(복선 회수)' },
] as const

// ── 스릴러 표준 12비트(도시에 §4 3막 + 위협 점증 곡선을 비트로 세분) ──────────────────
// pos: 전체 분량 대비 권장 위치 구간(%). threat: 권장 위협(stakes·임박성 0~10). tension: 권장 긴장(서스펜스 1~10).
// irony: 권장 정보 비대칭 모드 인덱스(0=독자>인물 … 2=독자<인물).
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  threat: number
  tension: number
  irony: number
  func: string   // 스릴러에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 하위유형/장치 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'normal', title: '1. 일상 · 콜드 오픈 (Ordinary World)', sub: 'Ordinary World / Cold Open', pos: [0, 8], threat: 2, tension: 3, irony: 0,
    func: '주인공의 유능함과 취약점을 동시에 각인하고 "잃을 것"을 만든다. 콜드 오픈(시체 발견·미래 위기 선공개)으로 첫 훅을 박는 변주도 흔하다.',
    tip: '무적 금물 — 유능하되 다치고 속을 수 있는 인물로. 평온은 짧게, 첫 페이지부터 "뭔가 잘못될 수 있다"는 그림자를 깔아라. 체호프의 총(흉터·약·비밀번호·습관)을 무심히 심어 둘 것.',
    ex: ['콜드 오픈: 미래의 절체절명 장면 → "○○시간 전"으로 회귀', '평범한 가정·직장의 균열 암시(도메스틱)', '주인공의 트라우마·약점을 슬쩍(나중에 결정적 약점/무기)'],
  },
  {
    key: 'inciting', title: '2. 개입 사건 (Inciting Incident)', sub: 'Inciting Incident', pos: [6, 16], threat: 4, tension: 4, irony: 1,
    func: '평범한 일상이 위협에 끌려 들어가는 방아쇠. 협박·목격·누명·실종·의뢰가 주인공을 사건으로 끌어들인다. 중심 질문("막을 수 있나")이 세워진다.',
    tip: '훅을 빨리. 사건은 주인공에게 개인적이어야 한다("남 일"이면 추진력이 없다). 맥거핀(서류·코드·디스크)을 여기서 등장시키면 추격의 동력이 생긴다.',
    ex: ['목격해선 안 될 것을 목격 / 누명을 씀', '협박 전화·메시지 — 카운트다운의 시작', '의뢰·임무 하달(스파이·리걸) / 배우자의 실종(도메스틱)'],
  },
  {
    key: 'noreturn', title: '3. 되돌아갈 수 없는 선 (Point of No Return)', sub: 'Point of No Return', pos: [14, 26], threat: 5, tension: 5, irony: 0,
    func: '1막 끝. 주인공이 자의·타의로 사건에 완전히 발을 들여 돌아갈 수 없게 된다. 일상으로의 복귀가 차단되고 추적이 본격화된다.',
    tip: '여기서 문을 잠가라 — 도망·회피·신고로 끝낼 수 있는 선택지를 제거. "이제 끝까지 갈 수밖에 없다"를 독자가 납득하게. 첫 작은 위협의 임박성을 한 단 올린다.',
    ex: ['도주 시작(누명 쓴 주인공) / 안전가옥 진입', '첫 추격·은신·함정 시퀀스의 발동', '돌이킬 수 없는 결정(사람을 죽임·비밀을 알아버림)'],
  },
  {
    key: 'antagonist', title: '4. 적의 윤곽 (The Antagonist Emerges)', sub: 'Antagonist Emerges', pos: [22, 36], threat: 6, tension: 5, irony: 0,
    func: '만만찮은 적대자의 존재와 능력이 드러나기 시작. "스릴러의 질은 빌런의 질에 비례한다" — 적이 똑똑하고 한발 앞섬을 보여준다.',
    tip: '빌런을 유능하게. 주인공의 시도를 한 번 깨끗이 무력화시켜 "이 적은 다르다"를 증명. 단 전모는 감춰라(부분 노출). 적의 시점 챕터로 정보 비대칭(독자>인물)을 설계해도 좋다.',
    ex: ['적의 한발 앞선 수(함정·도청·내부정보)', '캣앤마우스(고양이와 쥐)의 첫 라운드', '적대자 시점 삽입 — 독자만 아는 위협(서스펜스)'],
  },
  {
    key: 'investigate', title: '5. 추적·조사 (Pursuit & Investigation)', sub: 'Pursuit / Investigation', pos: [32, 48], threat: 6, tension: 6, irony: 1,
    func: '주인공이 능동적으로 대응·추적·수사. 단서를 모으고 적의 윤곽을 좁혀간다. 레드 헤링(가짜 단서·용의자)으로 의심을 엉뚱한 곳으로 유도.',
    tip: '"목표→장애→부분 해결+더 큰 새 위협"의 진동을 반복. 정보는 한 조각씩(카운트-인). 가짜 단서를 공정하게 깔아 재독 시 다른 의미가 되도록(단서의 이중 기능).',
    ex: ['증거 추적 / 증거개시·증인 확보(리걸)', '레드 헤링 — 잘못된 용의자에게 의심 집중', '조력자 등장(나중에 false ally일 수도)'],
  },
  {
    key: 'midpoint', title: '6. 중간점 — 판세 역전 (Midpoint Reversal)', sub: 'Midpoint', pos: [46, 56], threat: 7, tension: 8, irony: 2,
    func: '판을 뒤집는 큰 반전. 가짜 승리(곧 깨질 안도) 또는 진짜 위협의 실체 노출. 도메스틱 스릴러의 "중간 반전" 표준 위치(『나를 찾아줘』).',
    tip: '여기서 한 번 크게 비튼다 — 신뢰하던 정보·인물·목표가 거짓이었음을. 이후 사건 간격을 좁히며 가속 시작. 반전은 앞서 심은 복선의 회수여야 한다(공정).',
    ex: ['가짜 승리 후 더 큰 위협 노출', '신뢰할 수 없는 화자의 진실 일부 공개', '맥거핀의 실체·진짜 표적이 바뀜 / 의뢰인이 흑막'],
  },
  {
    key: 'falseally', title: '7. 잘못된 신뢰 (False Ally / Betrayal)', sub: 'False Ally', pos: [54, 66], threat: 7, tension: 7, irony: 0,
    func: '조력자가 배신자, 권위자가 흑막으로 드러나며 "믿을 사람이 없다"는 편집증을 조성. 적이 우위에 서기 시작한다.',
    tip: '배신은 복선이 있어야 충격이 산다("막판 배신 파트너"는 변주 필요). 신뢰 자원을 하나씩 끊어 주인공을 고립시켜라. 위협을 개인→가까운 이로 확장(에스컬레이션).',
    ex: ['파트너/내부자의 배신 — 정보가 적에게 샜다', '권위(경찰·기관·상사)가 부패/공모', '안전가옥·은신처가 노출 — 믿었던 통로가 함정'],
  },
  {
    key: 'escalate', title: '8. 위협의 점증 (Escalation)', sub: 'Stakes Escalate', pos: [62, 76], threat: 8, tension: 7, irony: 0,
    func: '같은 강도 반복은 지루함 — 매 시퀀스 위험을 한 단 올린다. 개인→가족→공동체→다수로 확장하거나 "이 한 사람을 살리는 게 곧 전부"로 응축.',
    tip: '에스컬레이션 사다리: 추상→구체, 소→대. 티킹 클락을 가시화(타이머·마감·출항). 인질·시한폭탄·임박한 범행으로 이해관계를 신체적으로 체감시켜라.',
    ex: ['인질·납치 — 사랑하는 사람이 표적이 됨', '티킹 클락 가동(폭탄·투표·재판·출항·약효)', '다수의 안전이 걸린 더 큰 음모의 전모'],
  },
  {
    key: 'allislost', title: '9. 모든 것을 잃은 순간 (All Is Lost)', sub: 'All Is Lost', pos: [72, 84], threat: 9, tension: 6, irony: 1,
    func: '75% 부근의 바닥. 조력자 상실, 증거 소실, 신뢰 붕괴, 주인공이 무장 해제·고립·부상. 가장 불리한 조건으로 몰린다.',
    tip: '주인공을 최악의 상태로 떨어뜨려라 — 무장 해제·고립·시간 부족. 충격을 잠시 죽이고 절망으로 채운 뒤, 수동→능동 전환의 씨앗(앞서 심은 체호프의 총 상기)을 둔다.',
    ex: ['핵심 증거·무기·조력자 상실', '주인공 체포·부상·고립 확정', '티킹 클락이 0에 임박 — 마지막 기회만 남음'],
  },
  {
    key: 'confront', title: '10. 대결 — 직접 대면 (Confrontation)', sub: 'Confrontation', pos: [82, 93], threat: 9, tension: 9, irony: 2,
    func: '클라이맥스. 주인공과 적대자의 정면 충돌. 우연·중간자가 아니라 주인공의 능동적 선택으로 해결. 티킹 클락 만료점과 일치시킨다.',
    tip: '앞서 심은 체호프의 총·진짜 정체를 여기서 회수("그게 그거였구나"). 가장 불리한 조건에서 맞서게. 거짓 결말 후 한 번 더 솟구치는 "마지막 한 방"으로 카타르시스를 증폭.',
    ex: ['복선·약점 역이용으로 적 제압 / 진상 폭로', '카운트다운 0초와 결전이 겹침', '거짓 결말(False Ending) 후 빌런의 막판 부활'],
  },
  {
    key: 'resolution', title: '11. 해소 — 도덕적 대가 (Resolution)', sub: 'Resolution / Payoff', pos: [91, 97], threat: 5, tension: 4, irony: 1,
    func: '긴장의 정산과 카타르시스적 해소. 위협의 무력화. 단 승리에는 희생·상처가 따른다 — 무손실 승리는 싱겁다.',
    tip: '대가를 치르게 하라(상실·부상·도덕적 타협). 풀린 단서·맥거핀의 의미를 정리해 독자의 "사기당했다" 반응을 막아라. 다크 스릴러는 의도적으로 승리를 박탈할 수도.',
    ex: ['위협 무력화 + 주인공의 상처·희생', '맥거핀·진실의 최종 정리(공정성 확인)', '다크: 악이 이기거나 정의가 좌절됨(르카레·플린류)'],
  },
  {
    key: 'stinger', title: '12. 여진 — 스팅어 (Stinger / Last Twist)', sub: 'The Stinger', pos: [97, 100], threat: 6, tension: 7, irony: 2,
    func: '짧은 여운·후일담. 마지막 한 줄/한 컷의 반전(스팅어)으로 "끝나지 않았다"는 불안을 남기거나 진정한 흑막을 암시한다.',
    tip: '마지막 한 줄에 칼을 숨겨라 — 위협의 잔존·진범의 정체·다음 표적. 단, 완결형 카타르시스가 목표면 이 비트는 가볍게(여운만). 속편 여지 + 존재론적 불안.',
    ex: ['진짜 흑막이 따로 있었음을 마지막에 암시', '위협이 다음 표적으로 이동(시리즈 훅)', '겉으론 평온하지만 한 컷의 불길한 신호(백미러·전화·열린 문)'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 하위유형 프리셋(도시에 §1 서브장르 지도) ──────────────────────────────────────
interface Preset {
  key: string
  name: string
  desc: string
  ending: number        // 권장 결말형 인덱스
  reliability: number   // 권장 시점 신뢰도 인덱스
  clock: number         // 권장 티킹 클락 유형 인덱스
  notes: Partial<Record<string, string>>   // 비트별 가이드 덮어쓰기
}
const PRESETS: Preset[] = [
  {
    key: 'legal', name: '리걸 · 법정 스릴러 (Legal)', desc: '로펌·법정·구치소. 증거개시·배심·공판 일정이 곧 티킹 클락(그리샴·터로우).',
    ending: 0, reliability: 0, clock: 2,
    notes: {
      inciting: '의뢰·사건 수임, 혹은 변호사 자신이 음모에 휘말림(『그래서 그들은 바다로 갔다』). 위험한 진실을 알게 됨.',
      investigate: '증거개시·증인 확보·기록 추적이 조사. 상대측의 은폐·증거인멸과의 경쟁.',
      escalate: '공판 일정·시효·증인 보호 만료가 카운트다운. 협박·매수·증인 살해로 판돈 상승.',
      confront: '법정 결전 — 결정적 증거·증언의 제출. 반전 증인/증거로 판세를 뒤집는다.',
    },
  },
  {
    key: 'spy', name: '스파이 · 정치 스릴러 (Spy)', desc: '국경·안전가옥·기관 내부 권력 다툼. 도덕적 회색(르카레)과 액션 추진(러들럼) 사이.',
    ending: 2, reliability: 2, clock: 3,
    notes: {
      inciting: '임무 하달 / 배신·이중첩자 의심 / 자신이 버려진 패(번 카드)임을 자각.',
      antagonist: '적은 외부 세력이자 내부의 두더지일 수 있다. 기관 내부 권력 다툼이 진짜 전장.',
      falseally: '핸들러·동료·상부가 두더지/이중첩자. "믿을 기관이 없다" — 편집증의 정점.',
      resolution: '도덕적 회색지대 — 승리해도 누군가를 희생/배신해야 한다. 씁쓸한 대가(르카레식).',
    },
  },
  {
    key: 'forensic', name: '법의학 · 연쇄살인 (Forensic)', desc: '프로파일링·검시·범죄수사. 천재 사이코패스 빌런과 함정-반전형 플롯(해리스·디버).',
    ending: 0, reliability: 1, clock: 0,
    notes: {
      antagonist: '연쇄살인범의 패턴·시그니처가 드러난다. 빌런은 똑똑하고 수사관과 지적 게임을 벌인다.',
      investigate: '법의학·프로파일링으로 다음 범행을 예측. 단서의 함정(디버식 미스디렉션)을 배치.',
      escalate: '다음 희생자의 시한(티킹 클락=다음 살인까지). 수사관의 가족·동료가 표적이 됨.',
      confront: '범인의 함정 안으로 걸어 들어가는 클라이맥스. 프로파일·약점 역이용으로 역전.',
    },
  },
  {
    key: 'domestic', name: '도메스틱 · 심리 스릴러 (Domestic)', desc: '교외 주택·완벽한 결혼·이웃. 위장된 일상성 + 신뢰할 수 없는 화자(플린·호킨스).',
    ending: 2, reliability: 3, clock: 1,
    notes: {
      normal: '안전해야 할 곳(집·결혼·이웃)을 정상으로 각인 — 그 전도가 곧 공포. SNS·스마트홈·CCTV(현대 감시).',
      inciting: '배우자/이웃의 실종·비밀·거짓의 발견. 평온한 가정의 균열.',
      midpoint: '중간 반전(플린식) — 화자가 거짓말하고 있었음/피해자가 가해자임이 드러난다.',
      stinger: '마지막 한 줄로 "끝나지 않은" 위협 암시 — 가해자가 처벌을 피하거나 새 표적을 응시.',
    },
  },
  {
    key: 'action', name: '액션 · 추적 스릴러 (Action)', desc: '쉴 틈 없는 추격·생존. 짧은 챕터 페이싱과 시리즈 액션(차일드·러들럼·브라운).',
    ending: 0, reliability: 0, clock: 0,
    notes: {
      noreturn: '추격·도주가 즉시 발동. 회피 불가의 물리적 위협으로 페이스를 끌어올린다.',
      investigate: '보물찾기/코드 해독 + 이동(브라운식). 단서가 곧 다음 장소·다음 추격으로 연결.',
      escalate: '추격·은신·함정 시퀀스를 한 단씩 격화. 무대를 더 위험한 곳으로(고소·밀폐·고립).',
      confront: '물리적 정면 대결. 최악의 조건(무장 해제·부상)에서 능동적으로 돌파.',
    },
  },
  {
    key: 'techno', name: '테크노 · 생존 스릴러 (Techno)', desc: '팬데믹·생체위협·시스템 폭주. 절차적 카운트다운과 통제 불능의 위협(크라이튼·클랜시).',
    ending: 1, reliability: 0, clock: 1,
    notes: {
      inciting: '시스템 균열·바이러스 유출·기술의 통제 이탈. 전문가가 위협의 규모를 먼저 감지.',
      antagonist: '적은 인격이 아니라 통제 불능의 시스템/병원체일 수도 — 시간·자연이 빌런.',
      escalate: '확산·연쇄 붕괴의 가속(절차적 카운트다운). 봉쇄선이 한 단계씩 무너진다.',
      stinger: '봉쇄 성공처럼 보이나 한 개체/변종/백업이 남아 다시 시작될 여지(크라이튼식 여운).',
    },
  },
]

// 결말형 — 독자와의 사전 약속(도시에 §5)
const ENDINGS = [
  { label: '승리 · 카타르시스', desc: '위협 무력화의 후련함. 상처·희생은 남되 주인공이 능동적으로 승리' },
  { label: '값비싼 승리 · 도덕적 대가', desc: '이겼으나 큰 것을 잃음 — 무손실 승리는 싱겁다' },
  { label: '다크 · 비극/좌절', desc: '악이 이기거나 정의가 좌절(르카레·플린류). 씁쓸함' },
  { label: '오픈 · 스팅어', desc: '마지막 한 줄 반전 — "끝나지 않았다"는 불안과 시리즈 훅' },
]
// 시점 신뢰도 — 신뢰할 수 없는 화자 장치(도시에 §3)
const RELIABILITY = ['완전 신뢰(명료)', '약간의 은폐(선택적 서술)', '신뢰 흔들림(기억상실·약물·거짓)', '완전 불신(화자가 적/거짓말쟁이)']
// 티킹 클락 유형(도시에 §3)
const CLOCKS = [
  { label: '명시 타이머', desc: '폭탄·카운트다운·시한 — 가장 가시적' },
  { label: '자연 마감', desc: '밤이 오면·약효가 떨어지면·연료가 다하면' },
  { label: '사회적 마감', desc: '투표·재판·출항·기자회견 — 일정이 곧 시한' },
  { label: '암묵적 압박', desc: '다음 범행까지·추격자가 좁혀옴 — 명시 타이머 없이 임박' },
]

// ── 장치 굴림기 슬롯 풀(도시에 §3 장치 + §6 어휘 — 스릴러 특화) ────────────────────
// 8슬롯: 위협 / 적대자 / 티킹클락 / 반전축 / 무대 / 스팅어 / 체호프의 총 / 레드 헤링. 조합수 = 각 풀 크기의 곱.
const SLOTS: { key: string; label: string; icon: string; pool: string[] }[] = [
  {
    key: 'threat', label: '핵심 위협', icon: '🎯',
    pool: [
      '목격해선 안 될 살인을 목격했다', '누명을 쓰고 쫓기는 신세가 되었다', '사랑하는 사람이 인질로 잡혔다',
      '시한폭탄이 도시 어딘가에 설치됐다', '연쇄살인범이 다음 표적을 예고했다', '치명적 바이러스가 유출됐다',
      '협박범이 비밀을 폭로하겠다 위협한다', '배우자가 흔적도 없이 사라졌다', '내부고발의 대가로 표적이 됐다',
      '잘못된 사람으로 오인되어 추격당한다', '기억을 잃은 채 손에 피가 묻어 있었다', '핵코드/기밀이 적의 손에 넘어갔다',
      '증인 한 명이 살해되기 전에 지켜야 한다', '완벽한 이웃이 무언가를 숨기고 있다', '딸이 위험한 진실에 다가가고 있다',
      '집 안에 누군가 다녀간 흔적이 있다', '대규모 테러가 며칠 안에 실행된다', '의뢰받은 사건이 거대 음모의 입구였다',
      '정체불명의 발신자가 일거수일투족을 보고 있다', '죽은 줄 알았던 사람이 메시지를 보내왔다', '내가 저지르지 않은 범죄의 증거가 내 집에 있다',
      '실험체/피험자가 통제를 벗어났다', '한 도시의 식수에 독이 풀렸다', '비행기/열차에 정체불명의 위협이 탑승했다',
      '가까운 사람이 다른 사람으로 바꿔치기된 듯하다', '내 신원이 통째로 도용·삭제되었다', '증언하면 가족이 죽는다는 경고를 받았다',
      '계좌·통신이 모두 잠기고 누군가 나를 조종한다', '폭로 자료를 든 정보원을 24시간 안에 빼내야 한다', '인질극의 협상가로 강제로 끌려 들어갔다',
      '내 환자/내담자가 살인을 예고했다', '실종된 아이의 마지막 신호가 내 위치를 가리킨다', '거대 기업이 위험한 진실을 덮으려 한다',
      '연쇄 폭파범이 다음 표적의 단서만 흘린다', '사이비 집단이 가족을 데려갔다', '내가 쓴 기사가 누군가를 죽음으로 몰았다',
      '내가 맡은 환자의 장기가 불법 거래되고 있다', '도시 전체의 전력망을 누군가 장악했다', '내 쌍둥이가 내 이름으로 범죄를 저지르고 있다',
      '잠적했던 증인이 내 집 앞에서 죽은 채 발견됐다', '내 알리바이를 증명할 유일한 사람이 사라졌다',
    ],
  },
  {
    key: 'antagonist', label: '적대자', icon: '🕴️',
    pool: [
      '한발 앞서는 천재 사이코패스', '겉으론 완벽한 권위자(판사·서장·상사)', '신뢰하던 파트너/동료', '얼굴 없는 청부살인 조직',
      '기관 내부의 두더지(이중첩자)', '부패한 거대기업/카르텔', '집착에 사로잡힌 스토커', '가족 중 한 사람',
      '과거의 동료였던 배신자', '광신적 이념 집단의 지도자', '통제 불능의 시스템/병원체(비인격 위협)', '주인공의 거울상 같은 빌런',
      '죽은 줄 알았던 인물', '여론·언론을 쥔 막후 실세', '천재 해커/감시자', '복수에 미친 피해자 유가족',
      '완벽한 알리바이를 지닌 명사', '주인공을 길러낸 멘토', '시한을 쥔 협상 불가의 테러범', '신원을 위조한 위장 신분의 이웃',
      '냉정한 청부 저격수', '사건을 설계한 보험·금융 사기단', '권력형 성범죄를 은폐하는 조직', '주인공의 약점을 다 아는 옛 연인',
      '데이터를 쥐고 협박하는 내부고발자', '사법거래로 풀려난 전과자', '국경을 넘나드는 인신매매 조직', '주인공을 모함한 가짜 피해자',
      '도시를 감시하는 사설 보안기업', '의식을 집행하는 사교 집단', '자수성가한 정치인의 그림자 해결사', '주인공의 자리를 노리는 후배',
      '망상에 빠진 모방 범죄자', '진실을 아는 단 한 명의 목격자(이기도 한 적)',
      '주인공을 표적으로 삼은 청부 해커', '사건을 덮으려는 부패한 검사', '도시를 장악한 마약 조직의 중간 보스',
      '주인공의 신뢰를 산 위장 잠입 요원', '복수를 대물림한 옛 원수의 자식',
    ],
  },
  {
    key: 'clock', label: '티킹 클락', icon: '⏳',
    pool: [
      '폭탄 타이머가 0을 향해 간다', '자정/해 뜨기 전까지', '다음 살인이 예고된 시각까지', '재판/선고가 시작되기 전',
      '약효(독·진정제)가 떨어지기 전', '출항/이륙 시각 전', '인질의 산소/생명이 다하기 전', '바이러스가 도시로 퍼지기 전',
      '추격자가 거리를 좁혀오는 동안', '기자회견/폭로가 예정된 시각', '투표/표결이 마감되기 전', '연료/배터리가 다하기 전',
      '증인 보호가 해제되는 날', '몸값 전달 시한', '백업이 자동 송신되기 전', '다리/터널이 폐쇄되기 전',
      '만조/밀물이 차오르기 전', '공소시효가 만료되는 자정', '수술/장기 이식 골든타임이 끝나기 전', '전원/생명유지장치가 꺼지기 전',
      '몰래 빠져나갈 교대 시간(15분) 안에', '항생제/해독제가 다 떨어지기 전', '눈사태/홍수가 길을 끊기 전', '경계 근무 교대까지의 짧은 틈',
      'SNS 라이브가 종료되기 전', '협박범이 약속한 폭로 D-3', '국경 검문이 강화되기 전', '대통령 일정/행사가 시작되기 전',
      '전화 추적이 완료되기 전 통화 시간', '경보가 본부로 전송되기까지', '태풍이 상륙하기 전', '마지막 열차/배가 떠나기 전',
      '독가스가 환기될 시간이 다하기 전', '면접/거래/표결까지 남은 분 단위 카운트',
      '댐 방류가 시작되기 전', '경매의 낙찰봉이 떨어지기 전', '심야 통금이 풀려 거리가 붐비기 전',
      '발신 추적 위성이 머리 위를 지나기 전', '인질의 약속된 처형 시각까지',
    ],
  },
  {
    key: 'twist', label: '반전축', icon: '🔄',
    pool: [
      '믿었던 조력자가 흑막이었다', '피해자가 사실 가해자였다', '주인공의 기억이 조작돼 있었다', '진짜 표적은 다른 사람이었다',
      '의뢰인 자체가 적이었다', '맥거핀의 내용이 가짜였다', '범인은 가장 가까운 사람이었다', '주인공이 단서를 오독하고 있었다',
      '두 사건이 사실 하나였다', '화자가 줄곧 거짓말을 하고 있었다', '죽은 줄 알았던 인물이 살아 있었다', '권위 기관 전체가 공모자였다',
      '구원처럼 보인 탈출구가 함정이었다', '진범은 수사팀 안에 있었다', '복수의 동기가 정당했다(빌런 재평가)', '주인공 자신이 범인이었다',
      '쫓던 자와 쫓기던 자가 뒤바뀌었다', '시간선이 우리가 믿던 순서가 아니었다', '두 인물이 사실 동일인이었다', '구조 요청이 처음부터 덫이었다',
      '주인공이 줄곧 조종당하는 졸이었다', '진짜 위협은 이미 끝났고 더 큰 게 시작됐다', '피해자가 자신의 죽음을 연출했다', '증거가 전부 심어진 것이었다',
      '주인공의 정체가 본인도 모르게 가짜였다', '적이라 믿은 자가 유일한 아군이었다', '사건의 동기는 돈이 아니라 사랑/수치였다', '죽은 자가 모든 것을 미리 설계해 두었다',
      '주인공이 보호하던 대상이 진범이었다', '음모의 정점에 가장 무해해 보인 인물이 있었다', '실종은 자발적 잠적이었다', '주인공의 기억 속 그날이 거짓이었다',
      '쌍둥이/대역이 자리를 바꾸고 있었다', '모든 증언이 한 사람의 거짓말 위에 서 있었다',
      '주인공이 쫓던 범인은 이미 죽은 사람이었다', '구조대가 사실 납치범의 일당이었다', '사건의 진짜 목적은 다른 범죄의 은폐였다',
      '주인공이 믿은 증거가 자신을 옭아맬 함정이었다', '두 도시에서 벌어진 사건이 같은 손에서 나왔다',
    ],
  },
  {
    key: 'stage', label: '압박 무대', icon: '🏚️',
    pool: [
      '폭설로 고립된 산장', '신호가 끊긴 외딴 섬', '정전된 고층 빌딩', '멈춰 선 엘리베이터',
      '달리는 열차/지하철', '난기류 속 비행기', '봉인된 잠수함', '폐쇄된 병원',
      '지하 벙커/방공호', '비 내리는 부패한 대도시', '완벽해 보이는 교외 주택가', '스마트홈/CCTV가 감시하는 집',
      '국경의 환승 구역', '안전가옥', '법정/구치소', '항만의 컨테이너 야적장', '폐쇄된 놀이공원', '엘리베이터 없는 정전 아파트',
      '눈보라 속 고속도로 휴게소', '인적 끊긴 심야 주차장', '봉쇄된 격리 병동', '안개 낀 항구의 어선',
      '전파가 닿지 않는 산속 연구소', '문이 잠긴 야간 백화점', '폐광/지하 갱도', '카지노의 폐쇄된 VIP층',
      '단전된 지하철 터널', '강 한가운데 멈춘 유람선', '오지의 국경 검문소', '재개발로 비어 버린 아파트 단지',
      '폭풍에 갇힌 등대', '도청되는 호텔 스위트룸', '통제 구역이 된 공항 라운지', '눈 덮인 고립 마을',
      '사막 한가운데 멈춘 차', '한밤의 텅 빈 종합병원 옥상',
      '폐쇄된 지하 주차장의 마지막 층', '눈에 갇힌 산악 케이블카', '통신이 두절된 원양 화물선',
      '문이 잠긴 심야 박물관', '폭우로 침수되는 지하 상가',
    ],
  },
  {
    key: 'stinger', label: '엔딩 스팅어', icon: '🃏',
    pool: [
      '진짜 흑막이 따로 있었음을 마지막 한 줄로', '위협이 다음 표적을 응시하며 끝난다', '울리지 않던 전화가 마지막에 울린다',
      '백미러 속 따라붙는 차', '평온한 집의 한 컷에 어긋난 디테일', '가해자가 처벌을 피해 미소 짓는다',
      '저주처럼 위협이 다음 사람에게 옮겨간다', '주인공이 사실 졌음을 독자만 깨닫는다', '닫힌 줄 알았던 문이 열려 있다',
      '같은 사건이 다른 도시에서 다시 시작된다', '주인공이 적과 같은 길을 걷기 시작한다', '마지막 메시지가 도착한다',
      '사라진 물건이 제자리가 아닌 곳에 놓여 있다', '생존한 변종/개체가 남아 있다', '거울 속에 낯선 그림자가 비친다',
      '풀려난 빌런의 면회 신청서가 도착한다', '아이의 그림 속에 범인이 그려져 있다', '주인공의 손에 똑같은 흉기가 들려 있다',
      '봉인했다던 파일이 클라우드에 복제돼 있다', '구조된 인질의 눈빛이 묘하게 텅 비어 있다', '경찰 배지를 단 사람이 빌런과 눈을 맞춘다',
      'CCTV에 찍히지 않은 한 사람이 있다', '다음 표적의 주소가 적힌 쪽지가 발견된다', '주인공의 일기에 모순된 날짜가 적혀 있다',
      '죽었다던 인물의 부고가 정정 보도된다', '아무도 누르지 않은 초인종이 울린다', '백신을 맞은 사람에게서 첫 증상이 나타난다',
      '주인공이 자기도 모르게 적의 신호를 따라한다', '마지막 장면에서 시계가 거꾸로 돈다', '구원자로 등장한 인물이 빌런의 이름을 안다',
      '평화로운 식탁 밑으로 손이 떨고 있다', '엔딩 자막 뒤 한 줄: "그리고 그것은 다시 시작되었다"',
      '삭제했다던 영상이 누군가에게 전송된 기록이 남는다', '주인공의 아이가 적의 이름을 무심히 부른다', '병실 모니터에 다시 심장 박동이 잡힌다',
      '주인공이 받은 마지막 선물 상자가 천천히 열린다', '도시의 모든 가로등이 동시에 꺼진다',
    ],
  },
  {
    key: 'chekhov', label: '체호프의 총', icon: '🔫',
    pool: [
      '초반에 무심히 보인 손목의 흉터', '주인공만 아는 약물 알레르기', '버릇처럼 외우는 비밀번호', '낡은 라이터의 고장 난 점화',
      '고장 났다던 보조 무전기', '주인공의 색맹/난청 같은 감각 결함', '늘 차고 다니는 멈춘 손목시계', '어릴 적 배운 매듭/수화',
      '벽 뒤에 감춰진 옛 비밀 통로', '버려진 듯 보였던 예비 열쇠', '습관적으로 녹음을 켜 두는 버릇', '한쪽만 듣는 보청기',
      '주머니 속 깨진 거울 조각', '오래된 흉기에 남은 지문', '주인공이 못 버리는 옛 휴대폰', '특정 향수에 대한 트라우마 반응',
      '늘 메모하는 작은 수첩', '고질적인 무릎 부상(추격 시 약점)', '몰래 숨겨 둔 여분의 탄창', '주인공만 읽는 옛 외국어',
      '집 안 어딘가의 비상 현금/위조 여권', '반려동물의 예민한 후각/경계', '늘 같은 자리에 두는 호신용 스프레이', '읽씹된 마지막 문자 한 통',
      '주인공이 외우는 옛 동요/암호', '고장 난 줄 알았던 화재경보기', '한 번도 안 쓴 응급 키트', '주인공의 거짓말 탐지 같은 직감',
      '늘 잠가 두는 서랍 속 권총', '몸에 새긴 의미심장한 문신',
      '주인공이 늘 지니는 부러진 회중시계', '오래된 차의 고장 난 경적', '주머니에 늘 든 한 줌의 소금',
      '주인공만 푸는 옛 자전거 자물쇠 번호', '벽장 깊이 둔 사냥용 작살',
    ],
  },
  {
    key: 'herring', label: '레드 헤링', icon: '🐟',
    pool: [
      '명백해 보이는 첫 번째 용의자', '범행 현장에 남은 누군가의 명백한 단서', '의심스럽게 행동하는 결백한 이웃', '완벽한 동기를 가진 가족',
      '협박 편지로 의심받는 옛 연인', '거짓 자백을 하는 정신이상자', '사라진 흉기가 가리키는 엉뚱한 인물', '가짜 알리바이로 도리어 의심받는 결백자',
      '수상한 거래 내역의 무고한 동업자', '범인을 닮은 도플갱어', '의심을 자초하는 거짓말쟁이 증인', '실은 다른 죄를 숨긴 무관한 용의자',
      '범행 시각에 자리를 비운 결백한 직원', '피해자와 다툰 적 있는 이웃', '익명의 제보로 지목된 엉뚱한 표적', '수상한 외부인(실은 무관한 부랑자)',
      '범인의 물건을 우연히 주운 행인', '음모론에 빠진 헛다리 정보원', '과거 전과로 자동 의심받는 인물', '가짜 단서를 심은 진범의 미끼',
      '의심스러운 통화 기록의 무관한 상대', '범행을 예고한 듯 보이는 SNS 글의 작성자', '시신 곁에서 발견된 무고한 목격자', '비밀을 숨겨 의심을 키운 결백한 연인',
      '범인의 차와 같은 모델을 모는 시민', '거짓 제보로 수사를 흐리는 관심종자', '진실을 알지만 다른 이유로 침묵하는 자', '엉뚱한 곳을 가리키는 조작된 CCTV',
      '의도적으로 흘린 가짜 유서', '범인이 누명 씌우려 고른 희생양',
      '범행 동기가 충분해 보이는 경쟁자', '현장 부근 CCTV에 잡힌 무관한 행인', '피해자에게 돈을 빌린 결백한 친구',
      '수상한 검색 기록을 남긴 무고한 가족', '익명 협박을 흉내 낸 관심 끌기 장난',
    ],
  },
]
// 조합수 = 각 슬롯 풀 크기의 곱(1조 이상 지향). 아래 COMBOS 로 동적 산출.
const COMBOS = SLOTS.reduce((a, s) => a * s.pool.length, 1)

function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function fmtNum(n: number): string {
  // 한국어 큰 수 표기(억/조)
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(2)}조 가지`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(2)}억 가지`
  return n.toLocaleString('ko-KR') + ' 가지'
}

interface BeatState { text: string; done: boolean; threat: number; tension: number; irony: number }
interface Store {
  title: string
  unit: 'won고' | 'page' | 'episode'
  total: string
  preset: string
  ending: number
  reliability: number
  clock: number
  beats: Record<string, BeatState>
}
const UNIT_LABEL: Record<Store['unit'], string> = { 'won고': '원고지(매)', page: '페이지', episode: '회차' }
const UNIT_SHORT: Record<Store['unit'], string> = { 'won고': '매', page: 'p', episode: '화' }

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, threat: b.threat, tension: b.tension, irony: b.irony } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'won고', total: '', preset: 'action', ending: 0, reliability: 0, clock: 0, beats }
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
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'action',
      ending: clamp(p.ending, 0, ENDINGS.length - 1, 0),
      reliability: clamp(p.reliability, 0, RELIABILITY.length - 1, 0),
      clock: clamp(p.clock, 0, CLOCKS.length - 1, 0),
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        s.beats[b.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          done: !!v.done,
          threat: clamp(v.threat, 0, 10, b.threat),
          tension: clamp(v.tension, 1, 10, b.tension),
          irony: clamp(v.irony, 0, IRONY.length - 1, b.irony),
        }
      }
    }
    return s
  } catch { return base }
}

type RollState = Record<string, string>
function freshRoll(prev?: RollState, locks?: Record<string, boolean>): RollState {
  const out: RollState = {}
  for (const s of SLOTS) {
    if (prev && locks && locks[s.key]) out[s.key] = prev[s.key]
    else out[s.key] = pick(s.pool)
  }
  return out
}

export default function ThrillerPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [roll, setRoll] = useState<RollState>(() => freshRoll())
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [showRoll, setShowRoll] = useState(false)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — 스릴러 외 장르로 열리면 안내(동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '스릴러·서스펜스' && mounted.current) {
      setNote(`이 도구는 스릴러·서스펜스 전용입니다(현재 장르: ${g}). 비트 가이드는 스릴러 관습 기준이에요.`)
    }
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  const preset = PRESETS.find((p) => p.key === store.preset) || PRESETS[0]

  // ── 변경 헬퍼 ──────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total' | 'ending' | 'reliability' | 'clock'>>) => setStore((s) => ({ ...s, ...patch }))
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))
  const toggleOpen = (key: string) => setOpenKey((o) => ({ ...o, [key]: !o[key] }))

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    setStore((s) => ({ ...s, preset: key, ending: p.ending, reliability: p.reliability, clock: p.clock }))
    flashMsg(`'${p.name}' 프리셋 적용 — 결말형·시점 신뢰도·티킹 클락을 권장값으로 맞췄어요`)
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

  // ── 두 곡선(위협 + 긴장) ───────────────────────────────────
  const CW = 660, CH = 170, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const yThreat = (d: number) => PADY + (1 - d / 10) * (CH - PADY * 2)         // 0~10
  const yTension = (h: number) => PADY + (1 - (h - 1) / 9) * (CH - PADY * 2)   // 1~10
  const threatPts = BEATS.map((b, i) => ({ x: xAt(i), y: yThreat(store.beats[b.key].threat), b }))
  const tensionPts = BEATS.map((b, i) => ({ x: xAt(i), y: yTension(store.beats[b.key].tension), b }))
  const pathOf = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §2 관습 + §3 장치 + §4 페이싱 + §5 클라이맥스) ────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    // 1) 위협 에스컬레이션: 전반→후반 위협이 우상향 + 끝까지 단조 증가는 아님
    const tEarly = store.beats['inciting'].threat, tLate = store.beats['allislost'].threat
    out.push({ ok: tLate > tEarly + 3, msg: tLate > tEarly + 3 ? '위협이 충분히 점증해요 — 매 시퀀스 위험을 한 단씩 올리는 에스컬레이션 사다리' : '위협 점증이 약해요 — 개인→가족→다수로(또는 추상→구체로) 매 시퀀스 한 단씩 올려야 둔감화가 안 돼요' })
    // 2) 중간점 반전: 중간점 비트 작성 여부(판세 역전)
    const mid = store.beats['midpoint']
    out.push({ ok: !!mid.text.trim(), msg: mid.text.trim() ? '중간점 반전(판세 역전)이 설계돼 있어요' : '중간점이 비었어요 — 가짜 승리나 진짜 위협의 실체로 50% 부근에서 판을 크게 뒤집으세요' })
    // 3) 티킹 클락 + 클라이맥스 일치: 위협 점증 후반에 클락이 가동됐는지
    const escTxt = store.beats['escalate'].text.trim()
    out.push({ ok: !!escTxt, msg: escTxt ? `티킹 클락(${CLOCKS[store.clock].label})으로 후반 압박이 설계돼 있어요 — 카운트다운 0초와 대결을 겹치세요` : '티킹 클락이 비었어요 — 시한(폭탄·재판·출항·다음 범행)을 가동해 클라이맥스와 만료점을 일치시키세요' })
    // 4) 정보 비대칭(서스펜스): 적어도 한 비트가 '독자>인물'(테이블 밑 폭탄)이어야
    const hasSuspense = BEATS.some((b) => store.beats[b.key].irony === 0)
    out.push({ ok: hasSuspense, msg: hasSuspense ? '서스펜스(독자>인물) 구간이 있어요 — 히치콕 "테이블 밑 폭탄"의 기다림' : '정보 비대칭이 단조로워요 — 한 비트라도 "독자만 위협을 안다"로 두면 기다림의 긴장이 생겨요' })
    // 5) 공정한 반전: 서프라이즈(독자<인물) 반전이 있다면 중간점 이후여야(복선 회수)
    const surpriseIdx = BEATS.map((b, i) => ({ i, k: b.key })).filter(({ k }) => store.beats[k].irony === 2).map(({ i }) => i)
    const midIdx = BEAT_KEYS.indexOf('midpoint')
    const fair = surpriseIdx.length === 0 || surpriseIdx.every((i) => i >= midIdx)
    out.push({ ok: fair, msg: fair ? '반전(서프라이즈)이 공정하게 배치돼 있어요 — 복선을 충분히 깐 뒤 회수' : '초반에 서프라이즈(독자<인물)가 몰려 있어요 — 반전은 복선 회수여야 공정해요. 중간점 이후로 배치하세요' })
    // 6) 도덕적 대가: 결말 비트 작성 + (다크/오픈이면 스팅어까지)
    const res = store.beats['resolution'], sting = store.beats['stinger']
    const wantSting = store.ending === 2 || store.ending === 3
    out.push({ ok: !!res.text.trim() && (!wantSting || !!sting.text.trim()), msg: (!!res.text.trim() && (!wantSting || !!sting.text.trim())) ? '해소의 대가 + (필요 시)스팅어가 설계돼 있어요 — 무손실 승리는 싱겁다' : (wantSting ? '결말의 "대가"와 마지막 "스팅어"를 채우세요 — 다크/오픈 결말은 끝의 한 방이 핵심' : '결말 비트가 비었어요 — 승리에 따르는 희생·상처(도덕적 대가)를 설계하세요') })
    return out
  })()
  const diagOk = diagnostics.filter((d) => d.ok).length

  // ── 장치 굴림기 ────────────────────────────────────────────
  const rerollAll = () => { setRoll((r) => freshRoll(r, locks)); setShowRoll(true) }
  const rerollOne = (k: string) => setRoll((r) => ({ ...r, [k]: pick(SLOTS.find((s) => s.key === k)!.pool) }))
  const toggleLock = (k: string) => setLocks((l) => ({ ...l, [k]: !l[k] }))
  const rollText = (): string => SLOTS.map((s) => `${s.label}: ${roll[s.key]}`).join('\n')
  const rollToSnippet = () => {
    addToLibrary('snippets', { text: rollText(), source: `스릴러 장치 굴림 · ${preset.name}`, tags: ['스릴러·서스펜스', '장치', preset.name] })
    flashMsg('굴린 장치 조합을 글감(스니펫)으로 저장했어요')
  }
  const rollToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '스릴러 장치 조합',
      bodyHtml: SLOTS.map((s) => `<p><strong>${esc(s.label)}:</strong> ${esc(roll[s.key])}</p>`).join(''),
      meta: { 하위유형: preset.name, 출처: '스릴러 플롯 로직 · 장치 굴림기' },
    })
    flashMsg(id ? '장치 조합을 프로젝트 자료(구조)에 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const L: string[] = []
    L.push(`[스릴러 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`하위유형: ${preset.name} · 결말형: ${ENDINGS[store.ending].label} · 시점 신뢰도: ${RELIABILITY[store.reliability]} · 티킹 클락: ${CLOCKS[store.clock].label}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%)`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)} · 위협 ${st.threat}/10 · 긴장 ${st.tension}/10 · ${IRONY[st.irony].label}〉`)
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
    parts.push(`<p><strong>하위유형:</strong> ${esc(preset.name)} · <strong>결말형:</strong> ${esc(ENDINGS[store.ending].label)} · <strong>시점 신뢰도:</strong> ${esc(RELIABILITY[store.reliability])} · <strong>티킹 클락:</strong> ${esc(CLOCKS[store.clock].label)}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%)</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))} · 위협 ${st.threat}/10 · 긴장 ${st.tension}/10 · ${esc(IRONY[st.irony].label)}〉</span></h3>`)
      parts.push(`<p><em>기능: ${esc(b.func)}</em></p>`)
      const pn = preset.notes[b.key]
      if (pn) parts.push(`<p><em>[${esc(preset.name)}] ${esc(pn)}</em></p>`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => parts.push(`<p>${esc(l) || '&nbsp;'}</p>`))
      else parts.push('<p>&nbsp;</p>')
    }
    return parts.join('')
  }

  const copyText = async (text: string, ok: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashMsg(ok)
    } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
  }
  const copyAll = () => copyText(buildText(), '전체 플롯을 복사했어요')

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: store.title.trim() ? `스릴러 플롯 — ${store.title.trim()}` : '스릴러 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        하위유형: preset.name,
        결말형: ENDINGS[store.ending].label,
        시점신뢰도: RELIABILITY[store.reliability],
        티킹클락: CLOCKS[store.clock].label,
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
    addToLibrary('snippets', { text, source: `스릴러 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['스릴러·서스펜스', '플롯', preset.name] })
    flashMsg('작성한 비트를 글감(스니펫)으로 저장했어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·진행 상태·곡선을 초기화할까요?')) return
    setStore(defaultStore()); setOpenKey({})
    flashMsg('모두 초기화했어요')
  }

  // 비트별 곡선 색
  const C_THREAT = '#c0392b'        // 위협(stakes) — 붉은 계열
  const C_TENSION = 'var(--accent)' // 긴장(서스펜스)

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
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }
  const slotVal: React.CSSProperties = { flex: 1, fontSize: 13, lineHeight: 1.5, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', cursor: 'pointer' }

  const RELATED: { id: string; label: string }[] = [
    { id: 'thriller-tropes', label: '🏷️ 트로프·관습 체크' },
    { id: 'thriller-devices', label: '🧰 서사 장치 사전' },
    { id: 'thriller-synopsis', label: '📝 시놉시스 빌더' },
    { id: 'thriller-outline', label: '🗂️ 개요 빌더' },
    { id: 'cliffhanger-forge', label: '🪝 클리프행어 단조기' },
    { id: 'stakes-escalator', label: '📈 이해관계 점증' },
    { id: 'chase-scene-gen', label: '🏃 추격·탈출 생성기' },
    { id: 'tension-curve', label: '📉 긴장 곡선 편집기' },
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
          <select style={{ ...select, flex: '1 1 190px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="하위유형 프리셋">
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>결말형</label>
          <select style={{ ...select, flex: '1 1 160px' }} value={store.ending} onChange={(e) => setMeta({ ending: Number(e.target.value) })} aria-label="결말형">
            {ENDINGS.map((h, i) => <option key={i} value={i}>{h.label}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>시점 신뢰도</label>
          <select style={{ ...select, flex: '1 1 180px' }} value={store.reliability} onChange={(e) => setMeta({ reliability: Number(e.target.value) })} aria-label="시점 신뢰도">
            {RELIABILITY.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>티킹 클락</label>
          <select style={{ ...select, flex: '1 1 180px' }} value={store.clock} onChange={(e) => setMeta({ clock: Number(e.target.value) })} aria-label="티킹 클락 유형">
            {CLOCKS.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ ...hint, fontSize: 11.5 }}>{preset.desc} · 결말: {ENDINGS[store.ending].desc} · 클락: {CLOCKS[store.clock].desc}</div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 이중 곡선: 위협 + 긴장 ── */}
        <div style={panel}>
          <div style={sectionTitle}>위협 & 긴장 곡선 · 일상→스팅어 (위협=점증 사다리, 긴장=완급 파동)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 190 }} role="img" aria-label="위협과 긴장 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {/* 긴장 곡선 */}
            <path d={pathOf(tensionPts)} fill="none" stroke={C_TENSION} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} strokeDasharray="5 4" />
            {/* 위협 곡선 */}
            <path d={pathOf(threatPts)} fill="none" stroke={C_THREAT} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
            {threatPts.map((p, i) => (
              <circle key={'t' + i} cx={p.x} cy={p.y} r={3.5} fill={C_THREAT} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${p.b.title} · 위협 ${store.beats[p.b.key].threat}/10`}</title>
              </circle>
            ))}
            {tensionPts.map((p, i) => (
              <circle key={'s' + i} cx={p.x} cy={p.y} r={3} fill={C_TENSION} stroke="var(--paper)" strokeWidth={1.2} opacity={0.95}>
                <title>{`${p.b.title} · 긴장 ${store.beats[p.b.key].tension}/10`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_THREAT, verticalAlign: 'middle', marginRight: 5 }} />위협(이해관계·임박성)</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_TENSION, verticalAlign: 'middle', marginRight: 5 }} />긴장(서스펜스·정보 비대칭)</span>
            <span style={{ ...hint, fontSize: 11.5 }}>위협은 한 단씩 점증, 긴장은 고조 뒤 짧은 호흡(숨 고르기)으로 완급을 줘야 둔감화가 안 됩니다.</span>
          </div>
        </div>

        {/* ── 장치 굴림기 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={sectionTitle}><Emoji e="🎲" /> 스릴러 장치 굴림기 · 조합수 <strong style={{ color: 'var(--accent)' }}>{fmtNum(COMBOS)}</strong></div>
            <button className="minibtn" onClick={() => setShowRoll((v) => !v)} aria-expanded={showRoll}>{showRoll ? '접기 ▲' : '펼치기 ▼'}</button>
          </div>
          {showRoll && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              {SLOTS.map((s) => (
                <div key={s.key} style={slotRow}>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={locks[s.key] ? '잠금 해제' : '이 슬롯 잠금(재생성 시 고정)'} style={{ width: 34, flexShrink: 0 }}>{locks[s.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                  <span style={{ ...subLabel, width: 76, flexShrink: 0 }}><Emoji e={s.icon} /> {s.label}</span>
                  <span style={slotVal} onClick={() => copyText(roll[s.key], '슬롯 값을 복사했어요')} title="클릭하면 복사">{roll[s.key]}</span>
                  <button className="minibtn" onClick={() => rerollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲" /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-primary" onClick={rerollAll}><Emoji e="🎲" /> 전부 굴리기</button>
                <button className="minibtn" onClick={() => copyText(rollText(), '장치 조합을 복사했어요')}><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={rollToSnippet}><Emoji e="💾" /> 글감 저장</button>
                <button className="minibtn" onClick={rollToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '장치 조합을 프로젝트에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트</button>
                <span style={{ ...hint, fontSize: 11 }}>잠금(<Emoji e="🔒" />)한 슬롯은 고정한 채 나머지만 다시 굴려요.</span>
              </div>
            </div>
          )}
          {!showRoll && <div style={{ ...hint, fontSize: 11.5, marginTop: 2 }}>위협·적대자·티킹클락·반전축·무대·스팅어·체호프의 총·레드 헤링 8슬롯을 굴려 스릴러 한 줄 설정을 즉석에서.</div>}
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

        {/* ── 12비트 입력 ── */}
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
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 위협 {st.threat}/10 · 긴장 {st.tension}/10 · {IRONY[st.irony].label}</div>
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
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="사건·추격·위협·반전·감각(소리·심박·백미러)을 자유롭게…" />

                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>위협</span>
                    <input type="range" min={0} max={10} value={st.threat} onChange={(e) => patchBeat(b.key, { threat: Number(e.target.value) })} style={{ flex: 1, accentColor: C_THREAT }} aria-label="위협(이해관계·임박성)" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_THREAT }}>{st.threat}/10</strong>
                  </div>
                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>긴장</span>
                    <input type="range" min={1} max={10} value={st.tension} onChange={(e) => patchBeat(b.key, { tension: Number(e.target.value) })} style={{ flex: 1, accentColor: C_TENSION }} aria-label="긴장(서스펜스)" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_TENSION }}>{st.tension}/10</strong>
                  </div>
                  <div>
                    <span style={{ ...subLabel, display: 'block', marginBottom: 4 }}>정보 비대칭(누가 무엇을 아는가)</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {IRONY.map((m, i) => (
                        <button key={i} className={st.irony === i ? 'minibtn active' : 'minibtn'} onClick={() => patchBeat(b.key, { irony: i })} title={m.desc}>{m.label}</button>
                      ))}
                    </div>
                    <div style={{ ...hint, fontSize: 11.5, marginTop: 4 }}>{IRONY[st.irony].desc}</div>
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
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '스릴러·서스펜스' })} title={`${r.label} 열기`}>{emojify(r.label)}</button>
          ))}
        </div>
      </div>

      <div style={{ ...foot, borderBottom: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">프로젝트:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '12비트 플롯을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
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
