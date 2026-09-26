// 사극 세계관 빌더 — "역사·사극" 장르 전용 설정 빌더.
//  하위장르·왕대 프리셋(주요 당파·실존 인물·대표 사건·금기 고증)·정치 지형·신분제·경제·공간·대외관계·
//  사상/달력·고증 강도·미래지식 규약까지, 도시에에 근거한 풍부한 자작 데이터로 질문·선택·입력을 구조화한다.
//  빈 칸은 "🎲 무작위 채우기"(슬롯 풀 잠금/재생성, 조합수 표시 — 1조 이상)로 즉시 메울 수 있다.
//  여러 세계관을 저장·수정·삭제(localStorage 'sry:tool:history-worldbuilder'). 언마운트 시 타이머 정리.
//  연계: addToProject(kind:text, root:research, folder:'세계관') / addToLibrary('places') / openToolLinked.
//  import 는 react 와 './linkbus' 만 사용한다(외부 모듈·네트워크·API 금지, 100% 로컬).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify, type SharedPlace } from './linkbus'

export const meta = { id: 'history-worldbuilder', name: '사극 세계관 빌더', icon: '🏯', group: '세계관', genre: '역사·사극', intro: '왕대·당파·신분제·고증 강도까지, 사극 세계관에 필요한 설정 항목을 질문·선택으로 구조화', w: 720, h: 680 }

const LS_KEY = 'sry:tool:history-worldbuilder'

// ─────────────────────────────────────────────────────────────
// 1. 하위장르 (도시에 §1) — 선택에 따라 고증 강도·미래지식 기본값을 가이드
// ─────────────────────────────────────────────────────────────
interface SubGenre { id: string; name: string; icon: string; desc: string; recCons: number; future: boolean; romance: number }
const SUBGENRES: SubGenre[] = [
  { id: 'orthodox', name: '정통 역사소설', icon: '📜', desc: '실존 인물·사건 중심, 고증 비중 높음. 빈틈을 상상으로 메움', recCons: 90, future: false, romance: 20 },
  { id: 'drama', name: '사극(드라마형)·궁중물', icon: '👑', desc: '권력투쟁·당쟁·궁중암투가 핵심. 대중성·정치 음모·멜로', recCons: 60, future: false, romance: 45 },
  { id: 'alt', name: '대체역사', icon: '🔀', desc: '"만약 그때 ~했다면" 분기. 임진 승전·근대화·병자호란 방어', recCons: 70, future: true, romance: 25 },
  { id: 'regress', name: '회귀·빙의 사극', icon: '⏳', desc: '현대인이 과거에 빙의/회귀. 미래지식이 핵심 무기(웹소설 주류)', recCons: 45, future: true, romance: 35 },
  { id: 'fusion', name: '퓨전 사극·가상왕조', icon: '🏰', desc: '가상 왕조로 고증 부담 회피. 정치+로맨스+성장', recCons: 25, future: true, romance: 50 },
  { id: 'romance', name: '로맨스 사극(궁중 로맨스)', icon: '💞', desc: '왕/세자/무관과의 로맨스. 신분 격차·간택·정략혼', recCons: 40, future: false, romance: 85 },
  { id: 'martial', name: '무협·역사 혼합', icon: '🗡️', desc: '중원/조선 배경 무림. 역사적 사건을 무림 음모로 재해석', recCons: 35, future: false, romance: 40 },
]
function subGenreById(id: string): SubGenre { return SUBGENRES.find((s) => s.id === id) || SUBGENRES[1] }

// ─────────────────────────────────────────────────────────────
// 2. 왕대 프리셋 (도시에 §8) — 선택 시 당파·실존 인물·대표 사건·금기 고증을 카드로 노출
// ─────────────────────────────────────────────────────────────
interface Reign {
  id: string; name: string; era: string; mood: string
  parties: string[]      // 정치 지형(당파·세력)
  figures: string[]      // 실존 인물
  events: string[]       // 대표 사건
  taboo: string[]        // 금기 고증항목(이 시대에 없거나 주의할 것)
}
const REIGNS: Reign[] = [
  {
    id: 'free', name: '(시대 미정 / 가상왕조)', era: '자유 설정', mood: '고증 부담 없이 가상의 왕조·연대를 직접 짭니다',
    parties: ['왕당파', '외척 세력', '신진 사대부', '구신 세력', '재야 학파'],
    figures: ['선왕', '대비', '세자', '영의정', '권신'],
    events: ['선왕의 승하', '세자 책봉', '가뭄과 민란', '변방의 침입', '권신의 전횡'],
    taboo: ['가상왕조라도 내부 연대 일관성은 지킬 것', '제후국/황제국 여부를 먼저 정해 호칭을 통일'],
  },
  {
    id: 'taejo', name: '태조~태종', era: '조선 개국기 (1392~1418)', mood: '개국·왕자의 난·왕권 확립의 격동기',
    parties: ['개국공신(정도전 계)', '종친(이방원 계)', '고려 잔존 세력'],
    figures: ['이성계', '정도전', '이방원', '하륜', '신덕왕후'],
    events: ['위화도 회군', '조선 건국', '제1·2차 왕자의 난', '사병 혁파', '한양 천도'],
    taboo: ['상평통보(인조 후)·고추(임진 후)는 등장 불가', '아직 성리학 통치가 완성 전 — 불교 영향 잔존'],
  },
  {
    id: 'sejong', name: '세종', era: '문화 융성기 (1418~1450)', mood: '집현전·훈민정음·과학·국방의 황금기',
    parties: ['집현전 학사', '훈구 대신', '종친'],
    figures: ['세종', '황희', '장영실', '김종서', '최윤덕', '성삼문'],
    events: ['훈민정음 창제', '4군 6진 개척', '측우기·자격루 제작', '공법(전세) 개혁', '대마도 정벌'],
    taboo: ['붕당(동·서인)은 아직 없음 — 훈구/집현전 구도', '담배·고추·감자 없음', '안경 보급 전'],
  },
  {
    id: 'sejo', name: '세조~성종', era: '왕권·제도 정비 (1455~1494)', mood: '계유정난·공신정치·경국대전 완성',
    parties: ['정난공신(한명회 계)', '대간(언관)', '훈구', '신진 사림(태동)'],
    figures: ['수양대군(세조)', '한명회', '신숙주', '단종', '성종'],
    events: ['계유정난', '단종 폐위·사사', '사육신 사건', '경국대전 반포', '사림의 등용 시작'],
    taboo: ['사림 vs 훈구 갈등은 성종 말~연산 때 본격화', '연좌·삼족 처벌 활발 — 정변의 비용 강조'],
  },
  {
    id: 'yeonsan', name: '연산군', era: '폭정과 사화 (1494~1506)', mood: '무오·갑자사화, 폭정과 반정 전야의 공포',
    parties: ['훈구', '사림(피화)', '간신(임사홍 등)', '반정 모의 세력'],
    figures: ['연산군', '폐비 윤씨', '장녹수', '임사홍', '박원종'],
    events: ['무오사화', '갑자사화', '신언패·언로 봉쇄', '흥청망청', '중종반정'],
    taboo: ['연산군은 "전하"로 칭하되 폐위 후 "군"', '사초·실록 관련 갈등(무오사화의 발단) 정확히'],
  },
  {
    id: 'jungjong', name: '중종~명종', era: '사화와 외척 (1506~1567)', mood: '조광조의 개혁과 좌절, 외척·문정왕후의 시대',
    parties: ['반정공신', '사림(조광조 계)', '대윤(윤임)', '소윤(윤원형)', '외척'],
    figures: ['중종', '조광조', '문정왕후', '윤원형', '정난정'],
    events: ['기묘사화', '위훈 삭제', '을사사화', '양재역 벽서 사건', '임꺽정의 난'],
    taboo: ['동·서 분당은 아직(선조 때) — 훈척 vs 사림 구도', '담배·고추 아직 전래 전'],
  },
  {
    id: 'seonjo', name: '선조', era: '붕당과 임진왜란 (1567~1608)', mood: '동서 분당, 임진·정유재란의 국난',
    parties: ['동인', '서인', '남인', '북인'],
    figures: ['선조', '이순신', '류성룡', '이이', '권율', '곽재우', '광해군'],
    events: ['동서분당', '정여립 모반(기축옥사)', '임진왜란', '한산도·명량·노량 해전', '정유재란'],
    taboo: ['담배(연초)는 임란 무렵 전래 시작 — 초반엔 신중', '고추 전래 초기 — 김치는 아직 백김치류'],
  },
  {
    id: 'gwanghae', name: '광해군', era: '중립외교와 폐모살제 (1608~1623)', mood: '대동법·중립외교, 폐모살제와 인조반정',
    parties: ['대북(이이첨 계)', '소북', '서인(반정 모의)', '남인'],
    figures: ['광해군', '이이첨', '강홍립', '인목대비', '능양군(인조)'],
    events: ['대동법 시행(경기)', '명·후금 사이 중립외교', '사르후 전투(강홍립 투항)', '폐모살제', '인조반정'],
    taboo: ['"청"은 아직 "후금" — 1636년 이후 청', '담배 확산기 — 등장 가능하나 신문물 취급'],
  },
  {
    id: 'injo', name: '인조~효종', era: '호란과 북벌 (1623~1659)', mood: '정묘·병자호란, 삼전도의 굴욕과 북벌론',
    parties: ['서인(공서·청서)', '남인', '척화파', '주화파'],
    figures: ['인조', '소현세자', '김상헌', '최명길', '효종', '임경업'],
    events: ['이괄의 난', '정묘호란', '병자호란', '삼전도 삼배구고두', '소현세자 의문사', '북벌 추진'],
    taboo: ['1636년부터 "청"·"황제" — 호칭 시점 주의', '상평통보 본격 주조는 효종~숙종(인조 때 시범)'],
  },
  {
    id: 'sukjong', name: '숙종', era: '환국의 시대 (1674~1720)', mood: '경신·기사·갑술 환국, 당쟁의 절정',
    parties: ['서인(노론·소론 분화)', '남인', '노론', '소론'],
    figures: ['숙종', '송시열', '장희빈', '인현왕후', '윤증'],
    events: ['경신환국', '기사환국', '갑술환국', '상평통보 전국 유통', '백두산정계비', '안용복의 울릉도 활동'],
    taboo: ['이때부터 상평통보(엽전)·담배 일상화 — 등장 자연스러움', '노론/소론 분화 시점(숙종) 정확히'],
  },
  {
    id: 'yeongjo', name: '영조~정조', era: '탕평과 실학 (1724~1800)', mood: '탕평책·균역법, 규장각·수원화성·실학의 르네상스',
    parties: ['노론(벽파·시파)', '소론', '남인(실학)', '탕평파'],
    figures: ['영조', '사도세자', '정조', '홍국영', '정약용', '박지원', '채제공'],
    events: ['이인좌의 난', '탕평책', '균역법', '임오화변(사도세자)', '규장각 설치', '수원화성 축조', '신해통공'],
    taboo: ['고구마(영조 때 전래)·감자(19C 초)는 시점 확인', '천주교(서학) 유입기 — 후기엔 박해 시작'],
  },
  {
    id: 'sedo', name: '순조~철종', era: '세도정치 (1800~1863)', mood: '안동김씨 세도, 민란과 삼정문란의 말기',
    parties: ['안동김씨', '풍양조씨', '몰락 양반', '서북 세력'],
    figures: ['순조', '정순왕후', '김조순', '홍경래', '최제우'],
    events: ['신유박해', '홍경래의 난', '삼정문란', '임술 농민봉기', '동학 창도'],
    taboo: ['천주교 박해(신유·기해) 본격화', '감자 전래·확산기 — 구황작물 등장 가능'],
  },
  {
    id: 'gojong', name: '고종(대한제국)', era: '개항과 근대 (1863~1907)', mood: '개항·갑신정변·동학·대한제국 — 전통과 근대의 충돌',
    parties: ['위정척사파', '개화파', '동학', '친청·친일·친러'],
    figures: ['고종', '흥선대원군', '명성황후', '김옥균', '전봉준'],
    events: ['병인·신미양요', '강화도조약', '임오군란', '갑신정변', '동학농민운동', '갑오개혁', '대한제국 선포'],
    taboo: ['대한제국기에 한해 "폐하·황제" 가능(이전엔 "전하")', '근대 문물(전기·사진·기차) 등장 시점 확인'],
  },
]
function reignById(id: string): Reign { return REIGNS.find((r) => r.id === id) || REIGNS[0] }

// ─────────────────────────────────────────────────────────────
// 3. 슬롯 풀 (무작위 채우기용) — 도시에 §7·§8 기반의 풍부한 자작 데이터
//    각 입력 섹션을 채울 수 있는 후보들. 조합수 1조 이상을 위해 풀을 풍부하게.
// ─────────────────────────────────────────────────────────────
const POOL = {
  // 정치 지형(왕권 강도·갈등 축)
  powerAxis: [
    '왕권은 강하나 언관(삼사)의 견제가 매서워 매사 명분 싸움', '신권이 비대해 왕은 외척과 권신에 휘둘림',
    '어린 왕을 대비가 수렴청정하며 외척이 실권을 쥠', '탕평을 표방하나 노론이 실세를 장악',
    '환국으로 집권 당파가 수시로 뒤집혀 살얼음판', '반정으로 즉위해 공신들에게 빚진 허약한 왕권',
    '개혁군주가 친위세력으로 노대신을 압박', '세도가문이 인사·재정을 독점해 왕은 허수아비',
    '왕과 세자가 대립해 조정이 둘로 갈림', '변방 군벌이 중앙을 위협하는 불안정한 통제',
  ],
  faction: [
    '훈구 vs 사림의 대립이 사화로 폭발', '동인과 서인이 정여립 옥사로 사생결단',
    '남인과 서인이 예송으로 정통성을 다툼', '노론과 소론이 세자 문제로 갈라섬',
    '대북이 폐모살제를 밀어붙여 반정의 빌미를 줌', '척화파와 주화파가 항전과 강화를 두고 격돌',
    '외척 대윤·소윤이 왕위 계승을 두고 칼을 갈음', '벽파와 시파가 사도세자 신원을 두고 충돌',
    '개화파와 위정척사파가 나라의 방향을 두고 대립', '재야 산림(山林)이 출사하지 않고 여론을 좌우',
  ],
  // 신분·제도(주인공의 족쇄)
  protagClass: [
    '몰락 양반 — 양반의 자존심과 굶주림 사이', '서얼 — 재능은 있으나 적서차별로 길이 막힘',
    '중인 역관 — 부는 쌓되 권력에는 닿지 못함', '중인 의관 — 어의를 꿈꾸나 천대받는 기술직',
    '상민 출신 무관 — 실력으로 출세하나 천출이라 견제', '관노/사노 — 면천을 향한 사투',
    '궁녀/상궁 — 구중궁궐의 정보망 한가운데', '몰락 종친 — 왕족의 피이나 역모 의심의 대상',
    '보부상/객주 — 장시를 누비는 정보·물류의 손', '잔반(殘班) 향반 — 지방에서 토호로 군림',
  ],
  statusBurden: [
    '적서차별로 과거 응시·관직에 제약', '여성이라 가문 밖 활동에 끊임없는 제약',
    '천출 신분이 들통나면 쌓은 모든 것이 무너짐', '노비 문서(노비안)에 매여 도망이 곧 죄',
    '연좌제로 역적의 후손이라는 낙인', '재가녀 자손이라 청요직 진출이 막힘',
    '서북인이라 중앙 등용에서 차별받음', '향리(아전) 신분이 대물림되어 벗어날 수 없음',
  ],
  // 경제·생활(도시에 §8)
  economy: [
    '상평통보가 막 유통되며 화폐경제가 싹틈', '대동법으로 공납이 쌀·포로 바뀌어 상업이 발달',
    '장시(5일장)와 보부상이 물류를 이음', '도고(독점상인)가 매점매석으로 폭리',
    '흉년과 환곡의 폐단으로 민심이 흉흉', '청·일과의 중계무역으로 역관·거상이 치부',
    '광산(은·동) 잠채로 한밑천 노리는 무리', '삼정문란(전정·군정·환곡)으로 백성이 도탄',
  ],
  livelihood: [
    '농본 사회 — 농사가 곧 국가의 근본', '한양 시전 상인의 금난전권 다툼',
    '의복의 색·재질로 신분이 한눈에 드러남', '담배와 술이 저잣거리의 일상',
    '서당·향교가 글과 출세의 통로', '역병이 돌면 마을이 통째로 비는 공포',
  ],
  // 공간(도시에 §8)
  stage: [
    '구중궁궐 — 정전·편전·내전·후원의 권력 미로', '한양 도성과 운종가의 저잣거리',
    '지방 관아와 사또의 동헌', '변방의 진(鎭)과 봉수대',
    '사대부가의 사랑채와 안채', '서원·향교의 학문 공동체',
    '국경의 의주·만상과 책문후시', '섬·유배지의 위리안치 처소',
    '도화서·내의원 등 궁중 기술 관청', '산사(山寺)와 암자, 도성 밖 은거지',
  ],
  // 대외관계(도시에 §8)
  foreign: [
    '명에 사대하며 조공·책봉 질서 안에 놓임', '명·후금 사이에서 줄타기 중립외교',
    '청을 상국으로 섬기되 북벌을 은밀히 도모', '왜와 통신사를 주고받으나 왜란의 상흔이 깊음',
    '여진(야인)의 변방 약탈에 시달림', '서양 이양선이 출몰하며 개항 압력이 거셈',
    '청·일·러가 각축하는 격변의 외교장', '유구·안남 등과의 사신 왕래로 정보가 오감',
  ],
  // 사상·종교(도시에 §8)
  thought: [
    '성리학 예학이 통치와 일상을 지배', '붕당이 학통(學統)을 따라 갈라짐',
    '불교는 억압되나 왕실·민간에 음으로 잔존', '무속·점복이 민간 신앙으로 뿌리 깊음',
    '실학(경세치용·이용후생)이 새 바람을 일으킴', '서학(천주교)이 유입되며 박해의 씨앗이 됨',
    '동학이 "사람이 곧 하늘"을 외치며 민심을 모음', '양명학·노장 사상이 음지에서 명맥을 이음',
  ],
  // 달력·시간(도시에 §8)
  timekeep: [
    '간지(干支)와 연호로 해를 세고, 시진(자·축·인…)으로 때를 가름', '절기에 맞춰 농사와 제례가 돌아감',
    '인정·파루의 종소리와 통금이 도성의 밤을 가름', '물시계(자격루)·해시계로 관아의 시각을 알림',
    '파발·봉수로 소식이 늦거나 어긋나 사달이 남', '점성·역법이 길흉을 점쳐 거사의 날을 정함',
  ],
  // 핵심 갈등 엔진(도시에 §3·§4)
  engine: [
    '반정·역모의 거사를 둘러싼 정보전과 배신', '어전 설전·상소 대결로 정적을 무너뜨리는 말의 전쟁',
    '사화로 사림이 도륙되는 피의 숙청', '왜란/호란의 국난을 헤쳐 나가는 항전',
    '간택·정략혼으로 동맹이 재편되는 외척의 부상', '밀지·옥새·교지의 진위를 둘러싼 정통성 다툼',
    '미래지식으로 적폐를 응징하고 개혁을 밀어붙이는 사이다', '연좌·사약의 공포 속 가문을 지키려는 사투',
  ],
  // 미래지식 카드(회귀·빙의형, 도시에 §4) — 반드시 "구현 제약"과 함께
  futureKnow: [
    '화약 배합·신무기로 전세를 뒤집되 초석·장인이 발목을 잡음', '이앙법·구황작물로 기근을 막되 양반의 반발에 부딪힘',
    '종두법으로 역병을 막되 "괴이한 술법"이라는 의심을 받음', '상평통보·화폐개혁을 추진하되 도고와 외척의 저항',
    '비누·설탕·증류주로 부를 쌓되 원료·판로 확보가 난관', '측우기·역법 개량으로 신임을 얻되 천기누설 시비',
    '환국·사화의 시점을 미리 알고 줄을 서되 나비효과로 어긋남', '활자·인쇄로 여론을 움직이되 검열과 필화의 위험',
    '의학·위생 지식으로 사람을 살리되 의관·무당의 텃세에 막힘', '광산·제련 기술로 재화를 캐내되 잠채 단속과 권문의 횡령',
    '근대 군제·총포 진법을 도입하되 무반 천대와 재정 부족에 막힘', '농서·종자 개량으로 수확을 늘리되 지주의 소작 수탈로 빛이 바램',
  ],
  // 음지의 축(도시에 §3·§4) — 표면 정치 뒤에서 작동하는 비밀 세력·정보망. 다른 슬롯과 독립.
  undercurrent: [
    '궁중 내관·상궁의 정보망이 은밀히 권력을 매개', '비밀 결사가 반정·역모를 도모하며 동지를 규합',
    '거상·객주가 자금을 대어 조정을 막후에서 조종', '도성의 왈자·검계가 뒷골목 무력을 쥐고 흥정',
    '무당·점복가가 왕실의 미신을 파고들어 국정을 흔듦', '의금부·포도청의 밀정이 도성 곳곳을 감시',
    '서원·산림의 여론이 상소와 통문으로 조정을 압박', '역관·역졸이 국경 정보를 사고팔며 첩보를 중개',
    '사학(천주교)·동학의 비밀 조직이 박해 속에 명맥을 이음', '몰락 양반·유민이 화적패를 이뤄 산채에서 세를 불림',
  ],
}
type PoolKey = keyof typeof POOL

function ri(n: number): number { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

// 조합수 계산 — 무작위 채우기 슬롯들의 곱(하위장르·왕대까지 포함하면 더 큼)
const FILL_KEYS: PoolKey[] = ['powerAxis', 'faction', 'protagClass', 'statusBurden', 'economy', 'livelihood', 'stage', 'foreign', 'thought', 'timekeep', 'engine', 'futureKnow', 'undercurrent']
const COMBOS = FILL_KEYS.reduce((acc, k) => acc * POOL[k].length, 1) * SUBGENRES.length * REIGNS.length

// ─────────────────────────────────────────────────────────────
// 세계관 데이터 모델
// ─────────────────────────────────────────────────────────────
interface World {
  id: string
  title: string
  subGenre: string      // SubGenre.id
  reign: string         // Reign.id
  worldName: string     // 가상왕조명/별칭 (자유)
  consLevel: number     // 고증 강도 0~100
  useFuture: boolean    // 미래지식 사용 여부
  romance: number       // 로맨스 비중 0~100
  // 서술형/선택형 입력(빈칸 허용, 무작위 채우기 대상)
  powerAxis: string
  faction: string
  protagClass: string
  statusBurden: string
  economy: string
  livelihood: string
  stage: string
  foreign: string
  thought: string
  timekeep: string
  engine: string
  futureKnow: string
  undercurrent: string
  notes: string
  createdAt: number
  updatedAt: number
}

// 입력 섹션 정의 — 질문/플레이스홀더/풀키. 빌더의 질문 흐름.
interface FieldDef { key: keyof World & PoolKey; q: string; icon: string; ph: string; pool: PoolKey }
const FIELDS: FieldDef[] = [
  { key: 'powerAxis', q: '왕권 vs 신권 — 권력은 누구의 손에?', icon: '👑', ph: '왕권 강도와 권력의 작동 원리. 예: 어린 왕을 대비가 수렴청정…', pool: 'powerAxis' },
  { key: 'faction', q: '정치 지형 — 어떤 당파·세력이 다투는가?', icon: '⚔️', ph: '훈구/사림, 동·서인, 노·소론, 외척 등 갈등의 엔진', pool: 'faction' },
  { key: 'protagClass', q: '주인공의 신분 — 어떤 족쇄를 지고 있는가?', icon: '🪪', ph: '신분이 곧 긴장. 예: 서얼 — 재능은 있으나 적서차별로…', pool: 'protagClass' },
  { key: 'statusBurden', q: '신분제의 무게 — 무엇이 행동을 가로막는가?', icon: '⛓️', ph: '적서·여성·천출·연좌 등 극복 과제로서의 제약', pool: 'statusBurden' },
  { key: 'economy', q: '경제 — 무엇이 돈과 권력을 움직이는가?', icon: '💰', ph: '상평통보·대동법·장시·도고·삼정문란 등', pool: 'economy' },
  { key: 'livelihood', q: '생활·풍속 — 시대의 공기는 어떠한가?', icon: '🏮', ph: '의식주·의복 규범·저잣거리의 일상', pool: 'livelihood' },
  { key: 'stage', q: '주 무대 — 이야기는 어디서 벌어지는가?', icon: '🏯', ph: '궁궐·도성·관아·변방·사대부가·유배지 등', pool: 'stage' },
  { key: 'foreign', q: '대외관계 — 바깥세계와 어떻게 얽히는가?', icon: '🌏', ph: '명·청 사대, 왜·통신사, 여진, 이양선 등', pool: 'foreign' },
  { key: 'thought', q: '사상·종교 — 사람들의 정신을 지배하는 것은?', icon: '📿', ph: '성리학·예학·붕당·불교·무속·실학·서학·동학', pool: 'thought' },
  { key: 'timekeep', q: '달력·시간 — 시대의 시간은 어떻게 흐르는가?', icon: '⏱️', ph: '간지·연호·시진·절기·통금·파발·봉수', pool: 'timekeep' },
  { key: 'engine', q: '핵심 갈등 엔진 — 이야기를 끄는 동력은?', icon: '🔥', ph: '반정·역모, 어전 설전, 사화, 국난, 정략혼, 정통성 다툼', pool: 'engine' },
  { key: 'futureKnow', q: '미래지식 활용 (회귀·빙의형) — 무엇을 어떻게?', icon: '⏳', ph: '화약·이앙법·종두법 등 + 반드시 "구현 제약"을 함께', pool: 'futureKnow' },
  { key: 'undercurrent', q: '음지의 축 — 표면 정치 뒤에서 무엇이 움직이는가?', icon: '🕯️', ph: '내관·상궁 정보망, 비밀 결사, 거상의 자금, 검계, 밀정 등', pool: 'undercurrent' },
]

// 함께 보면 좋은 도구(연계)
const RELATED: { id: string; label: string }[] = [
  { id: 'anachronism-checker', label: '🏺 시대착오 점검' },
  { id: 'setting-bible', label: '🗺️ 배경 설정집' },
  { id: 'world-wiki', label: '📚 세계관 위키' },
  { id: 'conflict-builder', label: '⚔️ 갈등 설계기' },
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyWorld(seed?: Partial<World>): World {
  const sub = seed?.subGenre ? subGenreById(seed.subGenre) : SUBGENRES[1]
  return {
    id: newId(), title: '', subGenre: sub.id, reign: 'free', worldName: '',
    consLevel: sub.recCons, useFuture: sub.future, romance: sub.romance,
    powerAxis: '', faction: '', protagClass: '', statusBurden: '', economy: '', livelihood: '',
    stage: '', foreign: '', thought: '', timekeep: '', engine: '', futureKnow: '', undercurrent: '',
    notes: '', createdAt: 0, updatedAt: 0, ...seed,
  }
}

const S = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)
const N = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d)
const B = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)

function loadState(): { list: World[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: World[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: S(x.id) || newId(),
      title: S(x.title),
      subGenre: SUBGENRES.some((s) => s.id === x.subGenre) ? x.subGenre : 'drama',
      reign: REIGNS.some((r) => r.id === x.reign) ? x.reign : 'free',
      worldName: S(x.worldName),
      consLevel: Math.max(0, Math.min(100, N(x.consLevel, 60))),
      useFuture: B(x.useFuture, false),
      romance: Math.max(0, Math.min(100, N(x.romance, 40))),
      powerAxis: S(x.powerAxis), faction: S(x.faction), protagClass: S(x.protagClass),
      statusBurden: S(x.statusBurden), economy: S(x.economy), livelihood: S(x.livelihood),
      stage: S(x.stage), foreign: S(x.foreign), thought: S(x.thought), timekeep: S(x.timekeep),
      engine: S(x.engine), futureKnow: S(x.futureKnow), undercurrent: S(x.undercurrent), notes: S(x.notes),
      createdAt: N(x.createdAt, Date.now()), updatedAt: N(x.updatedAt, Date.now()),
    }))
    const openId = typeof p?.openId === 'string' && list.some((w) => w.id === p.openId) ? p.openId : (list[0]?.id ?? null)
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 완성도(채워진 핵심 섹션 비율)
function completion(w: World): number {
  const total = FIELDS.length + 1 // 섹션 + 가상왕조명/제목 중 하나
  let done = 0
  for (const f of FIELDS) if (S(w[f.key]).trim()) done++
  if (w.title.trim() || w.worldName.trim()) done++
  return Math.round((done / total) * 100)
}

// 텍스트/HTML 산출
function worldToLines(w: World): string[] {
  const sub = subGenreById(w.subGenre)
  const reign = reignById(w.reign)
  const L: string[] = []
  L.push(`# ${w.title.trim() || w.worldName.trim() || '사극 세계관'}`)
  L.push(`하위장르: ${sub.icon} ${sub.name}`)
  L.push(`시대(왕대): ${reign.name} — ${reign.era}`)
  if (w.worldName.trim()) L.push(`왕조·별칭: ${w.worldName.trim()}`)
  L.push(`고증 강도: ${w.consLevel} / 100 (${consLabel(w.consLevel)})`)
  L.push(`미래지식: ${w.useFuture ? '사용' : '미사용'} · 로맨스 비중: ${w.romance}/100`)
  L.push('')
  for (const f of FIELDS) {
    const v = S(w[f.key]).trim()
    if (v) L.push(`${f.icon} ${f.q}\n   ${v}`)
  }
  if (w.notes.trim()) L.push(`\n🗒️ 메모\n   ${w.notes.trim()}`)
  return L
}
function worldToText(w: World): string { return worldToLines(w).join('\n') }

function worldToHtml(w: World): string {
  const sub = subGenreById(w.subGenre)
  const reign = reignById(w.reign)
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const parts: string[] = []
  parts.push(`<p><b>하위장르:</b> ${escHtml(sub.name)} · <b>시대:</b> ${escHtml(reign.name)} (${escHtml(reign.era)})</p>`)
  if (w.worldName.trim()) parts.push(`<p><b>왕조·별칭:</b> ${escHtml(w.worldName.trim())}</p>`)
  parts.push(`<p><b>고증 강도:</b> ${w.consLevel}/100 (${escHtml(consLabel(w.consLevel))}) · <b>미래지식:</b> ${w.useFuture ? '사용' : '미사용'} · <b>로맨스 비중:</b> ${w.romance}/100</p>`)
  parts.push('<hr>')
  for (const f of FIELDS) parts.push(`<p><b>${escHtml(f.icon + ' ' + f.q)}</b><br>${v(S(w[f.key]))}</p>`)
  // 왕대 프리셋 참고 정보도 자료로 함께 보존
  if (reign.id !== 'free') {
    parts.push('<hr><p><b>📌 왕대 프리셋 참고</b></p>')
    parts.push(`<p><b>주요 당파·세력:</b> ${escHtml(reign.parties.join(', '))}</p>`)
    parts.push(`<p><b>실존 인물:</b> ${escHtml(reign.figures.join(', '))}</p>`)
    parts.push(`<p><b>대표 사건:</b> ${escHtml(reign.events.join(', '))}</p>`)
    parts.push(`<p><b>⚠️ 금기·고증 주의:</b> ${escHtml(reign.taboo.join(' / '))}</p>`)
  }
  if (w.notes.trim()) parts.push(`<hr><p><b>🗒️ 메모</b><br>${escHtml(w.notes.trim())}</p>`)
  return parts.join('')
}

function consLabel(v: number): string {
  if (v >= 85) return '정통 고증'
  if (v >= 60) return '팩션(고증+상상)'
  if (v >= 35) return '느슨한 고증'
  if (v >= 15) return '분위기만 차용'
  return '가상왕조'
}

// ─────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function HistoryWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<World[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [locked, setLocked] = useState<Partial<Record<PoolKey, boolean>>>({})
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [showPreset, setShowPreset] = useState(true)
  const [toast, setToast] = useState('')
  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current != null) { clearTimeout(toastTimer.current); toastTimer.current = null }
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) flash('저장이 막혀 있어 새로고침 시 사라질 수 있어요') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, openId])

  // payload.genre / payload.reign 등으로 열렸을 때 첫 세계관에 반영(1회)
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const wantSub = typeof payload.subGenre === 'string' && SUBGENRES.some((s) => s.id === payload.subGenre) ? (payload.subGenre as string) : undefined
    const wantReign = typeof payload.reign === 'string' && REIGNS.some((r) => r.id === payload.reign) ? (payload.reign as string) : undefined
    if (list.length === 0) {
      const w = emptyWorld({ subGenre: wantSub, reign: wantReign, createdAt: Date.now(), updatedAt: Date.now() })
      setList([w]); setOpenId(w.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
  }

  const opened = openId ? list.find((w) => w.id === openId) || null : null

  const addWorld = () => {
    const w = emptyWorld({ createdAt: Date.now(), updatedAt: Date.now() })
    setList((prev) => [w, ...prev]); setOpenId(w.id); setConfirmDel(null); setShowPreset(true)
  }

  const patch = (id: string, fields: Partial<World>) => {
    setList((prev) => prev.map((w) => (w.id === id ? { ...w, ...fields, updatedAt: Date.now() } : w)))
  }

  const remove = (id: string) => {
    setList((prev) => {
      const next = prev.filter((w) => w.id !== id)
      if (openId === id) setOpenId(next[0]?.id ?? null)
      return next
    })
    setConfirmDel(null)
  }

  // 하위장르 변경 — 권장 기본값(고증/미래지식/로맨스)을 함께 제안(빈 입력일 때만)
  const changeSubGenre = (id: string) => {
    if (!opened) return
    const sub = subGenreById(id)
    const noEdits = !FIELDS.some((f) => S(opened[f.key]).trim()) && !opened.title.trim() && !opened.worldName.trim()
    patch(opened.id, noEdits
      ? { subGenre: id, consLevel: sub.recCons, useFuture: sub.future, romance: sub.romance }
      : { subGenre: id })
  }

  // 무작위 채우기(잠금 슬롯 유지). onlyEmpty=true면 빈 칸만 채움.
  const rollFill = (onlyEmpty: boolean) => {
    if (!opened) return
    const next: Partial<World> = {}
    for (const f of FIELDS) {
      if (locked[f.pool]) continue
      const cur = S(opened[f.key])
      if (onlyEmpty && cur.trim()) continue
      ;(next as Record<string, string>)[f.key] = pick(POOL[f.pool])
    }
    patch(opened.id, next)
    if (!onlyEmpty) {
      // 전체 재생성: 사용자 정의 항목의 '값'과 '기타'는 비우되 항목(이름)은 유지
      setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
      setEtc('')
    }
    flash(onlyEmpty ? '빈 칸을 무작위로 채웠어요' : '전체를 무작위로 다시 채웠어요')
  }
  const rollOne = (f: FieldDef) => { if (opened) patch(opened.id, { [f.key]: pick(POOL[f.pool]) } as Partial<World>) }
  const toggleLock = (k: PoolKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 사용자 정의 항목 — 이름을 입력받아 빈 입력칸을 추가(무작위 생성 없음, 직접 작성)
  const addCustomField = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 군사 제도, 비밀 결사)') || '').trim() } catch {}
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))
  // 복사/요약/연계용 — 사용자 정의 항목 + 기타를 줄글로(값 있을 때만)
  const customExtraText = (): string => {
    const lines: string[] = []
    for (const c of custom) { const v = c.value.trim(); const k = c.label.trim(); if (k && v) lines.push(`${k}\n   ${v}`) }
    if (etc.trim()) lines.push(`🗒️ 기타\n   ${etc.trim()}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  const copyText = async (text: string, okMsg = '복사했어요') => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch { flash('복사에 실패했어요') }
  }

  // 연계: 프로젝트 '자료 › 세계관' 폴더에 문서로 추가
  const toProject = () => {
    if (!opened || !hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요'); return }
    const sub = subGenreById(opened.subGenre)
    const reign = reignById(opened.reign)
    const title = opened.title.trim() || opened.worldName.trim() || `사극 세계관 — ${sub.name}`
    const extraHtml = (() => {
      const parts: string[] = []
      for (const c of custom) { const v = c.value.trim(); const k = c.label.trim(); if (k && v) parts.push(`<p><b>${escHtml(k)}</b><br>${escHtml(v)}</p>`) }
      if (etc.trim()) parts.push(`<hr><p><b>🗒️ 기타</b><br>${escHtml(etc.trim())}</p>`)
      return parts.length ? '<hr>' + parts.join('') : ''
    })()
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title,
      bodyHtml: worldToHtml(opened) + extraHtml,
      synopsis: `${sub.name} · ${reign.name} · 고증 ${opened.consLevel}/100`,
      meta: {
        장르: '역사·사극', 하위장르: sub.name, 시대: reign.name,
        고증강도: `${opened.consLevel}/100`, 미래지식: opened.useFuture ? '사용' : '미사용', 로맨스: `${opened.romance}/100`,
      },
    })
    flash(id ? '프로젝트 ‘자료 › 세계관’에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  // 연계: 주 무대를 장소 라이브러리에 저장
  const toPlaceLibrary = () => {
    if (!opened) return
    const reign = reignById(opened.reign)
    const sub = subGenreById(opened.subGenre)
    const name = opened.worldName.trim() || opened.title.trim() || `${reign.name}의 세계`
    const kind = `사극 세계관 · ${sub.name}`
    const atmosphere = opened.stage || reign.mood
    const history = [reign.name + ' — ' + reign.era, opened.powerAxis, opened.faction].filter(Boolean).join('\n')
    const rules = [opened.statusBurden, opened.thought, opened.timekeep].filter(Boolean).join('\n')
    const sensory = [opened.livelihood, opened.economy].filter(Boolean).join(' / ')
    // 정규 장소 필드(키→값) — 받는 허브(배경 설정집 등)에서 제자리에 들어가도록 표준 키로 1:1 매핑.
    const fields: Record<string, string> = {}
    if (name) fields.name = name
    if (kind) fields.kind = kind
    if (atmosphere) fields.atmosphere = atmosphere       // 분위기/주 무대
    if (opened.stage.trim()) fields.appearance = opened.stage.trim()   // 주 무대 묘사
    if (sensory) fields.sensory = sensory                // 감각(생활·경제)
    if (history) fields.history = history                // 역사/유래(왕대·권력·당파)
    if (opened.thought.trim()) fields.culture = opened.thought.trim() // 사상·종교 → 문화/풍습
    if (rules) fields.rules = rules                      // 규칙/제약(신분·사상·시간)
    if (opened.foreign.trim()) fields.dangers = opened.foreign.trim() // 대외관계(위협 축)
    // 사용자 정의 항목(라벨 = 키) + 기타 — 값이 비어있지 않을 때만 다른 도구로 전달
    for (const c of custom) { const v = c.value.trim(); const k = c.label.trim(); if (k && v) fields[k] = v }
    if (etc.trim()) fields.etc = etc.trim()
    const notes = worldToText(opened) + customExtraText()
    if (notes) fields.notes = notes
    const sp: Omit<SharedPlace, 'updated'> = {
      id: newId(),
      name,
      kind,
      mood: atmosphere,
      history,
      rules,
      sensory,
      notes,
      fields,
      source: '사극 세계관 빌더',
    }
    addToLibrary('places', sp)
    flash('주 무대를 장소 라이브러리에 저장했어요')
  }

  const openRelated = (id: string) => {
    const p: Record<string, unknown> = { genre: '역사·사극' }
    if (opened) { p.reign = opened.reign; p.subGenre = opened.subGenre; if (opened.worldName.trim()) p.query = opened.worldName.trim() }
    openToolLinked(id, p)
  }

  const reign = opened ? reignById(opened.reign) : REIGNS[0]
  const sub = opened ? subGenreById(opened.subGenre) : SUBGENRES[1]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 196, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 50, lineHeight: 1.55 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 6 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', lineHeight: 1.7, padding: 24, gap: 12 }
  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '6px 10px', borderRadius: 999, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)',
  })
  const tagS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🏯"/></span>
        <strong style={{ fontSize: 15 }}>사극 세계관 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 · 약 {COMBOS.toLocaleString()}+ 조합</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
        <button className="btn-primary" onClick={addWorld}>＋ 새 세계관</button>
      </div>

      <div style={body}>
        {/* 좌측 목록 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={{ ...empty, fontSize: 13, padding: 16 }}>아직 세계관이 없어요.<br />위 <b>＋ 새 세계관</b>으로<br />첫 사극 무대를 지어 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((w) => {
                const active = w.id === openId
                const sg = subGenreById(w.subGenre)
                const rg = reignById(w.reign)
                const pct = completion(w)
                return (
                  <div key={w.id} onClick={() => { setOpenId(w.id); setConfirmDel(null) }}
                    style={{ border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--paper)' : 'var(--panel)', borderRadius: 10, padding: '8px 9px', cursor: 'pointer', boxShadow: active ? '0 0 0 1px var(--accent)' : 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: (w.title || w.worldName) ? 'var(--text)' : 'var(--muted)' }}>
                      <Emoji e={sg.icon}/> {w.title || w.worldName || '(제목 없는 세계관)'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rg.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 3, background: 'var(--chrome-2)', overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', background: pct >= 80 ? 'var(--ok)' : 'var(--accent)' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측 빌더 */}
        {!opened ? (
          <div style={empty}>
            <div style={{ fontSize: 34 }}><Emoji e="🏯"/></div>
            <div>왼쪽에서 세계관을 고르거나<br /><b>＋ 새 세계관</b>을 만들어 짜 보세요.</div>
            <div style={{ fontSize: 12 }}>하위장르·왕대·당파·신분제·고증 강도를<br />질문에 따라 채우면 사극 세계관이 구조화됩니다.</div>
          </div>
        ) : (
          <div style={main}>
            {/* 제목 + 하위장르 */}
            <div style={panel}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <div style={label}><Emoji e="📖"/> 작품/세계관 제목</div>
                  <input style={input} value={opened.title} onChange={(e) => patch(opened.id, { title: e.target.value })} placeholder="예: 환국의 칼날" maxLength={80} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={label}><Emoji e="🏰"/> 왕조·별칭 (가상왕조 시)</div>
                  <input style={input} value={opened.worldName} onChange={(e) => patch(opened.id, { worldName: e.target.value })} placeholder="예: 가상 조선 / 대월" maxLength={60} />
                </div>
              </div>
              <div>
                <div style={label}><Emoji e="🎭"/> 하위장르 (선택 시 고증·미래지식·로맨스 기본값을 제안)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUBGENRES.map((s) => (
                    <span key={s.id} style={chip(opened.subGenre === s.id)} onClick={() => changeSubGenre(s.id)} title={s.desc} role="button" tabIndex={0}><Emoji e={s.icon}/> {s.name}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{sub.desc}</div>
              </div>
            </div>

            {/* 왕대 프리셋 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={sectionTitle}><Emoji e="👑"/> 왕대 프리셋</div>
                <span style={{ flex: 1 }} />
                <button style={tinyBtn} onClick={() => setShowPreset((v) => !v)}>{showPreset ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>
              <div>
                <select style={{ ...input, cursor: 'pointer' }} value={opened.reign} onChange={(e) => patch(opened.id, { reign: e.target.value })} aria-label="왕대 선택">
                  {REIGNS.map((r) => <option key={r.id} value={r.id}>{r.name}{r.era !== '자유 설정' ? ` · ${r.era}` : ''}</option>)}
                </select>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{reign.mood}</div>
              </div>
              {showPreset && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                  <PresetRow title="🏛️ 주요 당파·세력" items={reign.parties} onCopy={copyText} />
                  <PresetRow title="🧑‍🤝‍🧑 실존 인물" items={reign.figures} onCopy={copyText} />
                  <PresetRow title="⚡ 대표 사건" items={reign.events} onCopy={copyText} />
                  <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}><Emoji e="⚠️"/> 금기·고증 주의 (시대착오 함정)</div>
                    {reign.taboo.map((t, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.55 }}>· {t}</div>)}
                    <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => openRelated('anachronism-checker')}><Emoji e="🏺"/> 시대착오 점검 도구 열기</button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>왕대를 고르면 당파·인물·사건·금기 고증이 함께 갱신됩니다. 항목을 눌러 복사하세요.</div>
                </div>
              )}
            </div>

            {/* 강도 슬라이더 */}
            <div style={panel}>
              <div style={sectionTitle}><Emoji e="🎚️"/> 톤 설정</div>
              <Slider label="📐 고증 강도" value={opened.consLevel} onChange={(v) => patch(opened.id, { consLevel: v })} hint={consLabel(opened.consLevel)} left="가상왕조" right="정통 고증" />
              <Slider label="💞 로맨스 비중" value={opened.romance} onChange={(v) => patch(opened.id, { romance: v })} hint={opened.romance >= 60 ? '로맨스 중심' : opened.romance >= 30 ? '로맨스 가미' : '로맨스 약함'} left="없음" right="중심" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (opened.useFuture ? 'var(--ok)' : 'var(--border)'), background: opened.useFuture ? 'var(--chrome-2)' : 'var(--paper)', cursor: 'pointer' }}>
                <input type="checkbox" checked={opened.useFuture} onChange={(e) => patch(opened.id, { useFuture: e.target.checked })} style={{ width: 15, height: 15, accentColor: 'var(--ok)', cursor: 'pointer' }} />
                <span style={{ fontSize: 12.5, lineHeight: 1.5 }}><b><Emoji e="⏳"/> 미래지식 사용</b> (회귀·빙의/대체역사) — 켜면 "미래지식 활용" 질문이 강조됩니다. 반드시 <b>구현 제약</b>을 함께 설계하세요.</span>
              </label>
            </div>

            {/* 무작위 채우기 도구 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="🎲"/> 영감이 필요하면:</span>
              <button className="btn-primary" onClick={() => rollFill(true)}>빈 칸 채우기</button>
              <button className="minibtn" onClick={() => rollFill(false)}>전체 다시 굴리기</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>슬롯별 <Emoji e="🔒"/>로 마음에 든 항목 고정</span>
            </div>

            {/* 질문 섹션들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FIELDS.map((f) => {
                const dim = f.key === 'futureKnow' && !opened.useFuture
                return (
                  <div key={f.key} style={{ opacity: dim ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ ...label, marginBottom: 0, flex: 1 }}><Emoji e={f.icon}/> {f.q}{dim ? ' (미래지식 OFF)' : ''}</span>
                      <button style={{ ...tinyBtn, color: locked[f.pool] ? 'var(--accent)' : 'var(--muted)' }} title={locked[f.pool] ? '잠금 해제' : '이 항목 고정(무작위 채우기 시 유지)'} onClick={() => toggleLock(f.pool)}>{locked[f.pool] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                      <button style={tinyBtn} title="이 항목만 무작위" onClick={() => rollOne(f)} disabled={!!locked[f.pool]}><Emoji e="🎲"/></button>
                    </div>
                    <textarea style={area} value={S(opened[f.key])} onChange={(e) => patch(opened.id, { [f.key]: e.target.value } as Partial<World>)} placeholder={f.ph} />
                  </div>
                )
              })}
              <div>
                <div style={label}><Emoji e="🗒️"/> 메모 (선택)</div>
                <textarea style={{ ...area, minHeight: 60 }} value={opened.notes} onChange={(e) => patch(opened.id, { notes: e.target.value })} placeholder="설정 아이디어, 분기점, 결말 방향, 추가 고증 메모 등" maxLength={1000} />
              </div>
            </div>

            {/* 사용자 정의 항목 + 고정 '기타' */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={sectionTitle}><Emoji e="🧩"/> 사용자 정의 항목</div>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addCustomField}>＋ 항목 추가</button>
              </div>
              {custom.length === 0 ? (
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>필요한 설정 항목을 직접 추가해 자유롭게 적을 수 있어요. (예: 군사 제도, 비밀 결사, 가문 관계)</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {custom.map((c) => (
                    <div key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ ...label, marginBottom: 0, flex: 1 }}><Emoji e="📌"/> {c.label}</span>
                        <button style={tinyBtn} title="이 항목 삭제" onClick={() => removeCustom(c.id)}>✕</button>
                      </div>
                      <textarea style={area} value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder={`${c.label} — 직접 작성하세요`} />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div style={label}><Emoji e="🗒️"/> 기타 (자유 입력)</div>
                <textarea style={{ ...area, minHeight: 80 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="위 항목에 담기 어려운 설정·메모를 자유롭게 적으세요." />
              </div>
            </div>

            {/* 액션 + 연계 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={tagS}>완성도 {completion(opened)}%</span>
              <span style={tagS}>{consLabel(opened.consLevel)}</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => copyText(worldToText(opened) + customExtraText(), '세계관을 복사했어요')}><Emoji e="📋"/> 텍스트 복사</button>
              {confirmDel === opened.id ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--warn)' }}>삭제할까요?</span>
                  <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                  <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => remove(opened.id)}>삭제 확정</button>
                </>
              ) : (
                <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(opened.id)}><Emoji e="🗑️"/> 삭제</button>
              )}
            </div>

            <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
              <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 세계관 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트에 추가</button>
              <button className="linkbtn" onClick={toPlaceLibrary} title="주 무대를 장소 라이브러리에 저장"><Emoji e="📥"/> 장소 라이브러리</button>
              {RELATED.map((r) => (
                <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>{emojify(r.label)}</button>
              ))}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
              모든 변경은 이 브라우저에 자동 저장됩니다. 마지막 수정: {new Date(opened.updatedAt).toLocaleString('ko-KR')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 프리셋 항목 행(클릭 복사)
function PresetRow(props: { title: string; items: string[]; onCopy: (t: string, m?: string) => void }) {
  const { title, items, onCopy } = props
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>{emojify(title)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it, i) => (
          <span key={i} onClick={() => onCopy(it, `"${it}" 복사`)} title="클릭하면 복사"
            style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
            {it}
          </span>
        ))}
      </div>
    </div>
  )
}

// 강도 슬라이더
function Slider(props: { label: string; value: number; onChange: (v: number) => void; hint: string; left: string; right: string }) {
  const { label, value, onChange, hint, left, right } = props
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{emojify(label)}</span>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{value}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {hint}</span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: -2 }}>
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  )
}
