// 로맨스판타지(로판) 캐릭터 생성기 — '로맨스판타지' 장르 전용. 한 인물을
//  (원형·결 × 신분·역할 × 매력 포인트(설렘) × 첫 등장(meet-cute) × 이명(호칭) × 능력·무기(미래지식·마법·정치·신성력)
//   × 관계 트로프(밀당 동력) × 동기·목표 × 결핍·상처(회귀 트라우마) × 결점 × 비밀(원작 강제력·블랙모먼트 씨앗)
//   × 연애 스타일 × 인연·주변 인물) 슬롯 조합으로 빚어낸다.
//  원형(악역영애·회빙환 여주·성녀·얼음 황제·집착광공·다정 호위 기사·후회 폭군·계약 약혼자·딸바보 보호자·꽃받침 서브남…)에 따라
//  매력·첫등장·이명·능력 풀이 달라져 "원작 결말을 아는 채 파혼당한 악역 영애"부터
//  "그녀에게만 무너지는 얼음 황제", "혀 짧은 말로 어른들을 함락하는 회귀 황녀"까지 로판 코드가 살아 있는 인물 시트를 만든다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(부분 재생성). 상단에 조합수(조 단위) 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
//  아바타는 저작권 안전한 DiceBear(seed 기반 생성형 SVG)로, 크레딧과 함께 표기한다.
// 도시에 근거: 회빙환(회귀·빙의·환생)·원작 강제력·악역영애 파멸 플래그 회피·미래 정보 비대칭·신탁/예언·
//  계약→진심·이중 시점(남주 독백)·오해와 정보 격차·집착광공/후회물·딸바보(육아물)·공개 망신 역전·꽃받침·
//  서양 제국풍/동양 궁중풍/마탑·신전 등 로판 고유 코드를 슬롯 데이터에 촘촘히 녹였고,
//  '결점/비밀(원작 강제력)/상처(회귀 트라우마)'를 강조해 수동·민폐 여주와 평면 인물을 막는다.
// 연계(linkbus): 인물을 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도·캐릭터 생성기·이름 짓기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'romfan-charforge', name: '로판 캐릭터 생성기', icon: '👑', group: '캐릭터', genre: '로맨스판타지', intro: '원형(악역영애·회빙환여주·성녀·얼음황제·집착광공·다정기사·후회폭군·계약약혼자·딸바보·꽃받침)×신분×매력×능력×트로프×동기×상처×결점×비밀(원작강제력)×연애스타일×인연을 조합해 로판 코드가 살아 있는 인물을 무작위 생성', w: 600, h: 740 }

const LS = 'sry:tool:romfan-charforge'

// ───────────── 유틸 ─────────────
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function uid(): string { return 'rfcf_' + Date.now().toString(36) + '_' + ri(1e6).toString(36) }

// ───────────── 이름 풀(작명 영감 — 로판 결별) ─────────────
// 서양 제국풍(가상 제국·귀족 사회) — 유려하고 격조 있는 어감(여)
const WEST_F = ['아리아드네', '셀레스티아', '비비안느', '로젤리아', '에스텔', '카밀라', '이졸데', '레오니아', '아델하이트', '루셰린', '플로리아', '세실리아', '엘리아나', '베아트리체', '리젤로테', '오필리아', '아나스타시아', '제니아', '클로에', '미리엘', '리네트', '아벨리아', '도로테아', '실비아나']
// 서양 제국풍(남)
const WEST_M = ['카이저', '클로드', '라일런', '에드먼드', '루카스', '아실', '디트리히', '발렌타인', '제레미아', '아벨', '레온하르트', '시그넘', '아르카드', '율리시스', '에이든', '테오발트', '리하르트', '셀리오스', '카르닉스', '윈터', '아스란', '드미트리', '이클립스', '라파엘']
// 가문명(서양 귀족 작위가)
const WEST_HOUSE = ['데 로마뉴', '폰 아스타니아', '드 블루아르', '에버하트', '리벤하임', '아르장송', '발로아', '카르타냐', '윈터펠', '로젠하임', '드 셀비안', '아셰르덴', '폰 그란체스카', '드 페리뉴', '하르베크', '블랑쉐트']
// 동양 궁중풍(후궁·세가·황실) — 정갈하고 고풍스러운 어감(여)
const EAST_F = ['연화', '소운', '소연', '단희', '서아', '윤아', '월령', '하랑', '예진', '소화', '윤슬', '아랑', '초롱', '난향', '세아', '청아', '연리', '소설', '백아', '홍련', '유설', '단아']
// 동양 궁중풍(남)
const EAST_M = ['이겸', '서휼', '강무', '연우', '도훈', '세진', '하균', '윤제', '무영', '단오', '운경', '청록', '도하', '서경', '이서', '겸', '현', '준', '소운', '진하', '율', '한설']

// 작품 결(세계관·시대 분위기) — 이름 풀과 연동
type WorldKey = 'west' | 'east' | 'magic' | 'sacred' | 'novel'
interface WorldDef { key: WorldKey; label: string; vibes: string[] }
const WORLDS: Record<WorldKey, WorldDef> = {
  west: { key: 'west', label: '서양 제국·사교계', vibes: ['황궁과 무도회·다과회가 펼쳐지는 가상 제국', '작위와 가문 정치가 얽힌 사교계의 암투', '정략혼과 약혼 파기가 운명을 가르는 귀족 사회', '온실·도서관·정원이 밀회의 무대가 되는 황실'] },
  east: { key: 'east', label: '동양 궁중·세가', vibes: ['후궁의 암투가 소리 없이 흐르는 구중궁궐', '예법과 신분에 묶인 명문 세가의 안채', '황제의 총애를 두고 다투는 비빈들의 처소', '무공과 권력이 교차하는 황실과 강호'] },
  magic: { key: 'magic', label: '마탑·아카데미', vibes: ['마나와 속성 마법을 연구하는 마탑', '귀족 자제가 모이는 마법 아카데미', '정령 계약과 고대 마법이 잠든 비경', '검과 마법이 공존하는 기사단과 마탑의 경계'] },
  sacred: { key: 'sacred', label: '신전·성좌', vibes: ['신탁과 예언이 권력을 좌우하는 대신전', '성녀·성자를 추대하는 종교 권력의 무대', '창세신화와 신물(神物)이 깃든 성소', '별자리 성좌가 인간에게 가호를 내리는 세계'] },
  novel: { key: 'novel', label: '소설 속 세계(게임/메타)', vibes: ['읽던 소설 속으로 빙의해 들어간 메타 세계', '호감도·엔딩 분기가 법칙으로 작동하는 게임 세계', '원작 강제력이 운명을 밀어붙이는 이야기 속', '상태창·퀘스트가 보이는 시스템 세계'] },
}

// ───────────── 원형(Archetype) 정의 ─────────────
type ArchKey = 'villainess' | 'returnee' | 'saintess' | 'emperor' | 'obsessed' | 'knight' | 'regret' | 'contract' | 'guardian' | 'subML'
interface Arch {
  key: ArchKey
  label: string
  icon: string
  charms: string[]   // 원형별 매력 포인트(설렘 트리거)
  firsts: string[]   // 원형별 첫 등장(meet-cute / 충격적 1화)
  epithets: string[] // 원형별 이명(별칭·작중/독자 호칭)
  powers: string[]   // 원형별 능력·무기(여주 주체성: 미래지식·마법·정치·신성력·경영)
  worlds: WorldKey[] // 선호 결(이름 풀과 연동)
  dice: string       // DiceBear 스타일
  lean: 'm' | 'f' | 'any' // 이름 풀 성향
}

const ARCHES: Record<ArchKey, Arch> = {
  // 악역영애 빙의 — 파멸 플래그 회피
  villainess: {
    key: 'villainess', label: '악역 영애', icon: '🥀', dice: 'lorelei', lean: 'f', worlds: ['novel', 'west', 'magic'],
    charms: [
      '원작 파멸 결말을 알고도 우아함을 잃지 않는 기품', '독을 견뎌낸 자만이 가진 서늘한 미소', '몰락을 막기 위해 판을 뒤집는 영리한 수완', '버림받았기에 누구에게도 기대지 않는 독립심',
      '냉혹한 사교계에서 한 발도 물러서지 않는 자존심', '예의 바른 말 속에 숨긴 날카로운 칼날', '"이번 생은 다르게 살겠다"는 결연한 눈빛', '비극을 안 채 다시 사랑할 용기를 내는 모습',
      '파혼 통보에도 눈물 대신 미소로 응수하는 의연함', '계모·이복형제의 박대를 우아하게 되갚는 통쾌함', '진심을 들킬까 봐 더 차갑게 구는 서툰 다정', '원작 지식으로 한 수 앞을 내다보는 여유',
    ],
    firsts: [
      '약혼자에게 만인 앞에서 파혼을 통보받는 무도회장', '소설 속 악녀로 눈을 뜬 첫 자각의 아침', '회귀 전 자신을 처형한 그를 미소로 맞이하는 재회', '"원작대로면 나는 죽는다"를 깨닫는 처형대 직전의 순간',
      '몰락한 가문의 일원으로 황궁에 불려간 첫 알현', '계모의 박대를 받으며 등장한 저택의 안주인 자리', '정략혼 상대를 처음 마주하는 서먹한 약혼식', '원작 여주인공이 등장하기 직전, 운명을 비틀기로 결심한 시점',
    ],
    epithets: ['몰락 가문의 영애', '파혼당한 악역', '얼음 장미', '원작의 악녀', '버려진 약혼녀', '독을 삼킨 귀부인', '결말을 아는 자', '플래그를 꺾는 영애'],
    powers: [
      '원작 줄거리를 통째로 외운 미래 정보', '사교계 인맥과 소문을 다루는 정치 감각', '독·약초에 통달한 위기 대처술', '가문 경영과 영지 살림을 되살리는 수완',
      '약혼자·황실의 약점을 꿰뚫는 통찰', '전생의 교양·지식으로 사업을 일으키는 재주', '예법과 화술로 적을 무너뜨리는 언변', '원작에 없던 변수를 만들어내는 임기응변',
    ],
  },
  // 회귀·빙의·환생 여주 — 미래 정보 비대칭
  returnee: {
    key: 'returnee', label: '회빙환 여주', icon: '🔮', dice: 'lorelei', lean: 'f', worlds: ['novel', 'west', 'east', 'sacred'],
    charms: [
      '결말을 아는 자만의 한 발 앞선 여유', '비극을 알면서도 다시 그를 택하는 애틋함', '전생의 후회를 되갚으려는 능동적인 의지', '미래 지식으로 위기를 미리 막는 영리함',
      '두 번째 삶을 허투루 쓰지 않는 단단함', '아는 척하지 않으려 애쓰는 묘한 비밀스러움', '한 번 잃어본 사람의 소중함을 아는 깊이', '운명을 거스르려는 조용한 반항심',
      '겉은 평범해 보여도 속은 백전노장인 노련함', '예언·원작의 틈을 파고드는 통찰', '같은 실수를 반복하지 않으려는 신중함', '죽음의 순간을 기억하기에 더 또렷한 결심',
    ],
    firsts: [
      '죽기 직전 눈을 떠보니 십 년 전으로 돌아온 첫 회귀', '읽던 소설 속 조연으로 빙의한 황당한 첫 아침', '전생의 원수를 어린 시절 모습으로 다시 만난 순간', '비극이 시작되기 직전 시점에서 깨어난 자각',
      '"이번엔 절대 그렇게 죽지 않겠다"고 다짐하는 시작', '원작 남주를 결말이 아닌 첫 만남에서 마주친 재회', '처형·이혼·배신의 순간을 또렷이 기억한 채 되살아난 새벽', '바뀐 미래의 첫 나비효과를 목격하는 순간',
    ],
    epithets: ['두 번 사는 자', '결말을 아는 여인', '회귀한 영혼', '미래를 본 자', '빙의한 이방인', '운명을 거스르는 자', '다시 시작한 사람', '예언 너머의 그녀'],
    powers: [
      '미래(원작 결말)를 아는 정보 비대칭', '전생의 죽음을 기억하는 위기 예지', '현대 지식으로 사업·기술을 선점하는 재능', '원작 인물들의 호감도·동선을 읽는 메타 감각',
      '두 번째 삶에서 갈고닦은 침착한 판단력', '예언·신탁의 빈틈을 파고드는 해석력', '바뀐 변수를 빠르게 수습하는 응용력', '한 번 겪은 사건을 역이용하는 노련함',
    ],
  },
  // 성녀·신성력 — 신탁·예언으로 특별함 공인
  saintess: {
    key: 'saintess', label: '성녀·신관', icon: '🕊️', dice: 'lorelei', lean: 'f', worlds: ['sacred', 'west', 'magic'],
    charms: [
      '상처를 어루만지는 따뜻한 신성력의 빛', '신탁이 지목한 자라는 거역할 수 없는 특별함', '고통받는 이를 외면하지 못하는 깊은 자비', '겉은 성스럽되 속은 단단한 의지',
      '예언 속 "그 아이"로 불리는 운명적 후광', '신 앞에 무릎 꿇어도 사람 앞엔 당당한 기개', '치유의 손길에 깃든 헌신의 무게', '성소의 적막 속에서도 흔들리지 않는 평정',
      '권력에 휘둘리지 않으려는 곧은 심지', '성녀라는 굴레와 한 사람을 향한 마음 사이의 갈등', '기적을 일으키면서도 자만하지 않는 겸손', '신탁의 무게를 홀로 견디는 외로운 강인함',
    ],
    firsts: [
      '신전에서 성녀로 간택되는 신탁의 의식', '죽어가는 그를 신성력으로 살려낸 첫 기적', '예언서에 적힌 "그 아이"로 지목받아 황궁에 불려간 자리', '성소를 침범한 그와 처음 마주친 새벽 기도',
      '치유를 청하러 온 차가운 기사를 처음 맞은 진료실', '신탁이 두 사람을 운명으로 묶었음을 알게 된 순간', '버려진 신전에서 홀로 기적을 일으키다 발견된 날', '대신관의 후계로 지목되며 권력의 한복판에 선 시작',
    ],
    epithets: ['예언 속 그 아이', '신탁의 성녀', '치유의 손', '신이 택한 자', '성소의 빛', '기적을 부르는 이', '별의 가호를 받은 자', '신전의 살아있는 성물'],
    powers: [
      '상처·병을 치유하는 신성력', '신탁·예언을 받아 미래를 엿보는 권능', '악·저주를 정화하는 성력', '대신전을 움직이는 종교적 권위',
      '성좌의 가호로 위기에서 보호받는 가호', '사람의 진심을 읽는 신성한 직관', '죽은 자도 되살릴 수 있다는 전설적 기적', '신 앞의 서약으로 약속을 강제하는 신탁',
    ],
  },
  // 얼음 황제·완벽 남주 — 그녀에게만 무너지는
  emperor: {
    key: 'emperor', label: '얼음 황제·황태자', icon: '❄️', dice: 'adventurer', lean: 'm', worlds: ['west', 'east', 'novel'],
    charms: [
      '제국 전체에 차갑되 그녀에게만 풀어지는 눈빛', '한 마디로 조정을 정리하는 절대 권력의 여유', '신이 빚은 듯한 외모와 흐트러짐 없는 위엄', '만조백관 앞에서 그녀를 황후로 지목하는 결단',
      '냉혹한 군주가 그녀 앞에서만 말을 더듬는 모순', '잠든 그녀에게만 보이는 무방비한 미소', '권력을 내려놓고서라도 그녀를 택하는 헌신', '"이건 정략혼이야"라 말하며 손해만 보는 모순',
      '서늘한 보라색·금색 눈동자에 어린 외로움', '닿을 듯 닿지 않는 손끝의 온도 변화', '제국의 짐을 홀로 진 어깨의 고독', '오직 그녀의 안위만은 직접 챙기는 집요한 관심',
    ],
    firsts: [
      '정략혼 상대인 그녀를 차갑게 처음 마주한 알현', '암살 위기에서 그녀를 가로안기로 구한 무도회장', '"짐의 황후는 그대뿐"이라 선언하는 즉위식', '약혼 파기를 통보하러 온 그녀를 붙잡은 집무실',
      '신탁이 두 사람을 짝지었음을 받아든 황실 회의', '얼음 같던 그가 다친 그녀 앞에서 처음 표정을 잃은 순간', '계약 결혼을 제안하며 먼저 손을 내민 순간', '전장에서 돌아온 그가 가장 먼저 그녀를 찾은 귀환식',
    ],
    epithets: ['얼음 황제', '제국의 폭군', '서늘한 황태자', '신이 빚은 군주', '북방의 대공', '냉혈한 패자(霸者)', '그녀에게만 무너지는 자', '왕좌 위의 외톨이'],
    powers: [
      '제국을 호령하는 절대 권력', '전장을 휩쓰는 무력·검술', '조정을 장악한 정치력', '막대한 황실 재정과 자원',
      '신성·마법 혈통이 깃든 강대한 마나', '만인을 복종시키는 카리스마', '암살·음모를 꿰뚫는 경계심', '한번 정한 것은 끝까지 밀어붙이는 의지',
    ],
  },
  // 집착광공 — 놓아주지 않는 한 사람
  obsessed: {
    key: 'obsessed', label: '집착광공', icon: '🕸️', dice: 'lorelei-neutral', lean: 'm', worlds: ['west', 'novel', 'magic', 'east'],
    charms: [
      '세상 전부를 줘도 그녀 하나만은 놓지 못하는 독점욕', '겉은 다정하지만 속은 위태로운 광기 어린 헌신', '그녀의 모든 것을 기억하고 지켜보는 과한 관심', '"도망쳐도 끝까지 찾아낼 거야"의 서늘한 다정',
      '오직 그녀 앞에서만 순해지는 맹수 같은 면모', '소유욕을 사랑이라 믿는 비틀린 순수함', '그녀를 위해서라면 세상도 적으로 돌리는 일관성', '질투에 눈이 멀어도 끝내 상냥한 가면',
      '그녀의 안전을 위해 모든 위협을 제거하는 집요함', '버려질까 두려워 더 옭아매는 불안한 애착', '"내 것"이라 못 박는 낮고 위험한 속삭임', '한번 정한 사람은 평생 바꾸지 않는 외골수',
    ],
    firsts: [
      '구해준 그날부터 그녀만 바라봐 온 수상한 곁의 사람', '계약으로 묶였지만 점점 풀어줄 생각이 없어지는 상대', '잊었던 어린 시절 약속을 혼자만 간직해 온 사람', '그녀를 가두다시피 보호하려는 과보호의 손길',
      '우연을 가장한 모든 만남이 사실 계획이었던 첫 대면', '그녀의 위기를 매번 절묘하게 구해주는 정체불명의 그림자', '"널 위해 다 준비했어"라며 등장한 낯선 약혼자', '원작에서 그녀를 파멸시킬 인물이었으나 빙의로 어긋난 운명',
    ],
    epithets: ['집착의 화신', '광기 어린 수호자', '놓아주지 않는 자', '비틀린 헌신', '그림자 같은 사랑', '독점의 군주', '단 하나의 집착', '위험한 다정'],
    powers: [
      '그녀와 관련된 모든 정보를 수집하는 정보망', '위협을 소리 없이 제거하는 암부(暗部) 장악', '막강한 무력으로 모든 위험을 차단하는 힘', '재력·권력으로 그녀의 세계를 통제하는 영향력',
      '마법·저주로 인연을 묶으려는 금기의 술법', '집착을 헌신으로 위장하는 완벽한 가면', '한번 새긴 기억은 잊지 않는 집요한 기억력', '그녀의 동선을 미리 읽는 섬뜩한 예측력',
    ],
  },
  // 다정 호위 기사 — 한결같이 지키는
  knight: {
    key: 'knight', label: '다정 호위 기사', icon: '🛡️', dice: 'adventurer', lean: 'm', worlds: ['west', 'magic', 'east', 'sacred'],
    charms: [
      '한결같이 곁을 지키는 따뜻한 충정', '말보다 검으로 먼저 그녀를 지키는 행동파', '주군을 향한 충성과 한 사람을 향한 마음 사이의 갈등', '늘 반보 뒤에서 그녀를 살피는 세심한 눈길',
      '거친 전장에서도 그녀 앞에선 한없이 부드러운 손길', '"제 목숨이 다하는 날까지"라는 기사도의 맹세', '상처투성이 손으로 그녀의 머리칼을 매만지는 조심스러움', '신분 차이를 알기에 더 애틋한 갈망(pining)',
      '주군의 명보다 그녀의 안위를 먼저 떠올리는 흔들림', '검을 내려놓고 무릎 꿇어 손등에 입 맞추는 예(禮)', '말없이 곁을 지키는 것으로 마음을 표현하는 침묵', '위기 순간 망설임 없이 그녀를 가로안는 본능',
    ],
    firsts: [
      '암살자의 칼을 대신 맞으며 그녀를 처음 지킨 순간', '주군이 하사한 호위로 그녀 앞에 무릎 꿇은 임명식', '쓰러진 그녀를 안고 빗속을 달린 첫 위기', '검술 대회에서 그녀의 이름을 걸고 승리한 경기장',
      '천대받던 기사를 그녀가 처음 사람 대접해 준 마구간', '신분을 숨긴 그녀를 알아보지 못한 채 지키게 된 사연', '전장에서 그녀의 편지 한 장으로 버틴 귀환', '"저를 기사로 받아 주시겠습니까"라 청한 충성 서약',
    ],
    epithets: ['그녀의 검', '충직한 호위', '맹세의 기사', '반보 뒤의 그림자', '한쪽 무릎의 충정', '강철의 다정', '주군의 칼이자 방패', '신분을 넘은 기사'],
    powers: [
      '제국 제일을 다투는 검술 실력', '암살·위협을 막아내는 호위 능력', '오러·검기를 두른 기사의 무력', '주군에게 절대 충성하는 기사단의 신망',
      '전장을 누빈 실전 경험과 직감', '말 없이도 위기를 감지하는 경계심', '신성력·마법 검을 다루는 특수 적성', '한 번 한 맹세는 목숨으로 지키는 신의',
    ],
  },
  // 후회 폭군·후회남 — 뒤늦게 매달리는
  regret: {
    key: 'regret', label: '후회 폭군(후회물)', icon: '💧', dice: 'adventurer', lean: 'm', worlds: ['west', 'east', 'novel'],
    charms: [
      '뒤늦게 깨달은 마음에 자존심을 전부 버린 진심', '"내가 잘못했다"를 처음으로 입에 담는 무너짐', '떠난 그녀의 빈자리를 매일 더듬는 처절함', '한때 냉혹했던 만큼 더 깊어진 속죄의 무게',
      '권력·황좌를 다 내놓고 매달리는 절박함', '그녀가 돌아봐 주지 않아도 멀리서 지키는 미련', '과거의 자신을 후회하며 변해가는 모습', '"내가 죽고 나서야 그는 후회했다"의 정반대를 살려는 안간힘',
      '그녀의 차가운 거절마저 받아들이는 낮아진 태도', '돌이킬 수 없는 한마디를 평생 곱씹는 사람', '회귀해 처음으로 돌아가 다시 잘해보려는 절실함', '무릎 꿇는 법을 처음 배운 폭군의 변화',
    ],
    firsts: [
      '그녀를 처형·폐위한 뒤 회귀해 결혼 전으로 돌아온 폭군', '이혼 서류를 내밀던 그가 도장을 찍지 못하는 순간', '죽은 줄 알았던 그녀가 살아 돌아온 충격적 재등장', '다른 남자 곁에 선 그녀를 멀리서 발견한 무도회',
      '버려두었던 그녀가 다른 가문의 안주인이 되어 돌아온 자리', '"한 번만 더 기회를"을 빌러 찾아온 빗속의 방문', '회귀 전 자신이 저지른 죄를 떠올리며 괴로워하는 새벽', '그녀의 재혼 소식을 듣고 처음 무너진 황제',
    ],
    epithets: ['뒤늦은 후회', '미련의 화신', '버리고 후회한 폭군', '돌아온 탕아', '속죄하는 황제', '무릎 꿇은 패자', '한때의 가해자', '늦은 사랑'],
    powers: [
      '회귀로 얻은 두 번째 기회와 미래 기억', '제국을 쥐고 흔드는 권력(이젠 그녀를 위해)', '전장과 정치에서 갈고닦은 실력', '속죄를 위해 무엇이든 내놓을 막대한 재력',
      '한때 적이었던 만큼 잘 아는 그녀의 약점이자 강점', '잘못을 되돌리려는 집요한 노력', '냉혹함을 거두고 얻은 새로운 통찰', '그녀를 지키기 위해 적을 제거하는 무력',
    ],
  },
  // 계약 약혼자·가짜 부부 — 거리에서 진심으로
  contract: {
    key: 'contract', label: '계약 약혼자', icon: '📑', dice: 'adventurer', lean: 'any', worlds: ['west', 'novel', 'east', 'magic'],
    charms: [
      '"이건 어디까지나 계약"이라며 점점 진심이 새어 나옴', '연기라기엔 너무 자연스러운 다정한 손길', '계약 조항 너머로 챙기는 사소한 진심', '가짜인데 진짜처럼 질투하는 자신을 들킴',
      '"우린 진짜 부부가 아니야"를 되뇌며 거리를 못 두는 사람', '계약 만료일이 다가올수록 초조해지는 마음', '비즈니스로 시작했지만 손익을 자꾸 잊는 사람', '들킬까 봐 더 가까이 붙어야 하는 위태로운 설렘',
      '거짓 약혼의 규칙을 진심으로 지키려는 우직함', '"끝나면 남남"이라는 약속을 가장 먼저 어기는 쪽', '계약서엔 없던 다정을 자꾸 베푸는 모순', '정략의 가면 아래로 자라는 진짜 마음',
    ],
    firsts: [
      '집안의 정략혼을 피하려 급조한 가짜 약혼 제안', '맞선 자리를 모면하려 그 자리에서 손을 잡아끈 첫 만남', '서로의 목적을 위해 결혼 계약서에 서명하는 거래의 시작', '"세간의 눈을 속일 황후 자리만 채워 주시오"라는 황제의 제안',
      '몰락 가문을 일으키려 권력가와 손잡은 계약혼', '오해로 약혼 사이가 되어버려 어쩔 수 없이 맞추는 연기', '복수·신분 세탁을 위해 손을 잡은 위험한 동맹', '회귀 후 살아남기 위해 강자에게 먼저 계약을 제안한 순간',
    ],
    epithets: ['계약 약혼자', '가짜 황후', '위장 부부', '서류상의 연인', '거래로 묶인 사이', '비즈니스 정략혼', '규칙 위의 두 사람', '끝이 정해진 약속'],
    powers: [
      '계약을 유리하게 이끄는 협상 수완', '서로의 필요를 정확히 읽는 거래 감각', '가문·권력을 등에 업은 정치적 입지', '약점을 쥐고 거래를 성사시키는 정보력',
      '연기로 세간을 속이는 사교 기술', '계약을 통해 얻은 신분·재력', '상대의 진심을 시험하는 노련함', '필요할 땐 손익을 따지는 냉철한 머리',
    ],
  },
  // 딸바보 보호자 — 육아물(어른들 함락)
  guardian: {
    key: 'guardian', label: '딸바보 보호자', icon: '🧸', dice: 'big-smile', lean: 'any', worlds: ['west', 'east', 'novel', 'sacred'],
    charms: [
      '천대받던 아이를 처음으로 품에 안아주는 뭉클함', '냉혹한 어른이 어린 그녀 앞에서 무장 해제되는 모습', '혀 짧은 말 한마디("조아해…")에 속절없이 함락되는 보호자', '아이를 위해서라면 황실도 적으로 돌리는 과보호',
      '서툴지만 진심으로 머리를 땋아주는 손길', '제 목숨보다 아이의 미소를 먼저 챙기는 헌신', '눈에 넣어도 안 아플 듯 바라보는 눈빛', '아이의 작은 상처에도 온 신경을 쏟는 노심초사',
      '아이의 천진함에 얼어붙은 마음이 녹아내리는 변화', '"내 딸을 울린 자는 누구든 용서치 않는다"의 결연함', '바쁜 와중에도 아이의 잠자리를 직접 봐주는 다정', '핏줄이 아니어도 진짜 가족이 되어가는 따뜻함',
    ],
    firsts: [
      '버려진 아이를 우연히 거두게 된 비 오는 밤', '냉혹한 보호자가 어린 조카(딸)를 맡게 된 첫날', '"이 아이를 부탁한다"는 유언과 함께 떠안은 보호자', '원작에선 죽을 운명이던 아이를 살리려 거둔 회귀자',
      '혀 짧은 인사 한마디에 무표정이 깨진 첫 알현', '아이가 처음으로 자신을 보호자라 부르며 매달린 충격의 저녁', '버림받은 아이가 자신을 닮았음을 알아본 순간', '아이를 노리는 음모를 막으려 나선 보호 전쟁',
    ],
    epithets: ['딸바보', '제국의 호구가 된 대공', '아이의 수호자', '함락당한 어른', '눈에 넣어도 안 아픈', '작은 폭군의 종', '핏줄을 넘은 가족', '온 세상이 적이어도'],
    powers: [
      '아이를 지키는 막강한 권력·무력', '아이의 미래를 바꿀 재력과 영지', '천재적인 두뇌(그러나 육아엔 서툴다)', '아이를 노리는 적을 제거하는 정보망',
      '황실·세가에서의 높은 지위', '아이를 위해 무엇이든 배우는 의지', '냉혹한 평판이 만드는 강력한 방패', '한번 거둔 가족은 끝까지 책임지는 신의',
    ],
  },
  // 꽃받침 서브남주 — 역하렘·서브공
  subML: {
    key: 'subML', label: '꽃받침 서브남주', icon: '🌸', dice: 'adventurer', lean: 'm', worlds: ['west', 'magic', 'novel', 'sacred'],
    charms: [
      '메인이 아님을 알면서도 조용히 곁을 지키는 헌신', '들이대지 않고 그녀가 웃을 수 있게 돕는 배려', '한 발 늦은 마음을 끝까지 응원으로 바꾸는 성숙함', '닿을 수 없음을 알기에 더 절절한 갈망(pining)',
      '결정적 순간 그녀를 위해 자신을 희생하는 선택', '메인 남주조차 인정하는 매력과 능력', '그녀의 비밀을 알면서도 끝까지 지켜주는 의리', '"네가 행복하면 됐어"라는 쓸쓸한 미소',
      '역하렘의 중심에서 단연 빛나는 존재감', '경쟁보다 그녀의 선택을 존중하는 기품', '상처받으면서도 곁을 떠나지 못하는 미련', '언제든 돌아올 자리를 비워두는 다정',
    ],
    firsts: [
      '위기에 처한 그녀를 메인 남주보다 먼저 구한 골목', '아카데미에서 그녀의 유일한 친구가 되어준 첫 학기', '마탑에서 함께 연구하며 가까워진 동료', '신전에서 그녀의 성녀 자질을 처음 알아본 신관',
      '무도회에서 외면당한 그녀에게 손을 내민 순간', '그녀의 비밀(회귀·빙의)을 우연히 눈치챈 순간', '메인 남주의 라이벌로 등장했으나 진심이 되어버린 사연', '버려진 그녀를 거두려다 마음을 빼앗긴 조력자',
    ],
    epithets: ['꽃받침의 일인자', '한 발 늦은 사랑', '서브의 품격', '응원하는 마음', '역하렘의 중심', '닿지 못한 진심', '그녀의 두 번째 선택지', '비워둔 자리의 그'],
    powers: [
      '메인에 뒤지지 않는 가문·재력', '마법·검술의 뛰어난 재능', '그녀의 비밀을 지켜주는 신중함', '아카데미·마탑·신전에서의 두터운 신망',
      '위기에 결정적 도움을 주는 정보·인맥', '메인 남주를 견제하는 경쟁력', '그녀를 웃게 만드는 다정한 화술', '한결같이 곁을 지키는 인내',
    ],
  },
}
const ARCH_LIST: ArchKey[] = ['villainess', 'returnee', 'saintess', 'emperor', 'obsessed', 'knight', 'regret', 'contract', 'guardian', 'subML']

// ───────────── 공통 슬롯 풀(원형 무관, 도시에 기반) ─────────────
// 신분·역할(작중 사회적 위치) — 로판 신분 체계.
// 성별에 따라 호칭이 갈리는 항목은 { f, m } 로 두고, 인물의 성(sex)에 맞춰 한쪽만 표기한다
//  (예전엔 '황태자·황녀'처럼 양성 병기로 노출되던 정합성 결함을 제거). 항목 수(22)는 유지 → 조합수 보존.
type StationEntry = string | { f: string; m: string }
const STATION: StationEntry[] = [
  { f: '제국의 황녀', m: '제국의 황태자' }, '몰락 가문의 외동 영애(자제)', { f: '북방을 다스리는 대공녀', m: '북방을 다스리는 대공' }, '공작가의 후계자', '정략혼을 앞둔 후작가 자제',
  { f: '황궁의 시녀·궁녀 출신', m: '황궁의 내관·시종 출신' }, '검술이 뛰어난 호위 기사', { f: '대신전의 성녀', m: '대신전의 신관' }, '마탑의 마법사·견습', '사교계의 떠오르는 신데렐라',
  '서출이라 천대받던 가문의 아이', { f: '황제의 총애를 받는 후궁·귀비', m: '황제의 총애를 받는 측근 신하' }, '강호와 황실을 오가는 세가의 자제', '예언서에 기록된 "그 아이"',
  '계모·이복형제에게 박대받는 가문의 자제', '영지를 경영하는 젊은 영주', '황실 도서관의 사서·학자', '폐위·유폐되었다 복권된 황족',
  '평민으로 위장한 고귀한 혈통', '아카데미의 수석 입학생', '신물(神物)을 지키는 가문의 후예', '근위 기사단장·기사단의 총아',
]
// 인물의 성(sex)에 맞춰 신분 항목을 한쪽만 해소(미치환 양성 병기 노출 금지).
function resolveStation(e: StationEntry, sex: 'f' | 'm'): string {
  return typeof e === 'string' ? e : (sex === 'f' ? e.f : e.m)
}

// 능력·무기는 원형별 powers 풀 사용(typed). 여기는 공통 슬롯만.

// 동기·목표(이 인물을 움직이는 욕망) — 도시에: 생존/복수/자유/HEA
const MOTIVE = [
  '원작대로면 닥칠 파멸(처형·추방)을 반드시 피한다', '전생의 비극을 이번 생에선 뒤집겠다고 다짐한다', '버림받은 자신의 가치를 만천하에 증명한다', '가문·영지를 일으켜 다시는 무시당하지 않으려 한다',
  '그저 조용히 이혼·파혼당하고 자유로워지고 싶다', '자신을 죽인·배신한 자에게 통쾌하게 되갚는다', '신탁·예언이 지운 운명의 무게에서 벗어나려 한다', '한 번 더 사랑할 용기를 내고 싶다',
  '거둔 아이를 어떤 위협에서도 끝까지 지킨다', '신분·정략혼의 벽을 넘어 자기 마음을 따르려 한다', '진짜 자신을 알아봐 줄 단 한 사람을 기다린다', '한때의 잘못을 속죄하고 용서를 빌고 싶다',
  '계약을 끝내고 평범한 일상으로 돌아가려 한다', '전생 지식으로 사업·영지를 일으켜 부와 자립을 이룬다', '원작 강제력에 맞서 정해진 결말을 비틀려 한다', '"왜 하필 너냐"는 끌림의 이유를 인정하기 두려워한다',
  '진심을 들키지 않으려 애써 무심한 척한다', '주변의 반대와 음모를 뚫고 사랑을 쟁취한다', '가족·소중한 이를 비극에서 구해내려 한다', '공개 망신과 모욕을 사이다로 되갚을 무대를 준비한다',
]

// 결핍·내면의 상처(왜 사랑을 두려워/갈망하는가) — 도시에: 회귀 트라우마·방어기제
const WOUND = [
  '전생에 처형·폐위당한 죽음의 기억(회귀 트라우마)', '믿었던 연인·약혼자의 배신으로 생긴 깊은 불신', '사랑하는 이를 눈앞에서 잃은 죄책감', '"넌 사랑받을 자격 없어"라는 말에 새겨진 자기혐오',
  '가문의 도구로만 길러져 진심을 받아본 적 없음', '서출·천대받은 출신이 남긴 인정 욕구', '계모·이복형제의 박대로 굳어진 경계심', '버려질까 봐 먼저 밀어내는 회피 습관',
  '원작에서 자신이 악역·엑스트라였다는 자각의 외로움', '완벽해야만 사랑받는다고 믿게 된 압박', '한 번 회귀·빙의로 모든 걸 잃어본 상실감', '특정 인물을 전생의 원수로 기억하는 PTSD적 불신',
  '신탁·예언의 굴레가 짓누른 자유의 박탈감', '감정 표현을 금기시한 차가운 황실·세가의 환경', '늘 두 번째였던 자리에서 생긴 갈증', '미래를 알기에 누구와도 나눌 수 없는 고독',
  '진심을 보일 때마다 이용당해 굳어진 마음의 빗장', '한때의 다정이 모두 연기였음을 알게 된 뒤의 환멸', '몰락의 책임을 홀로 뒤집어쓰고 추방당한 굴욕의 기억', '제 손으로 지키지 못한 약속이 남긴 죄책감',
]

// 결점·약점(평면 캐릭터 방지 — 도시에: 민폐 여주 경계) — 밀당·갈등 엔진
const FLAW = [
  '자존심이 세서 먼저 사과하지 못한다', '질투에 사로잡히면 못된 말을 내뱉는다', '진심을 늘 농담·무심함으로 숨긴다', '오해해놓고 확인하지 않는 성급함',
  '미래(원작)를 안다는 자만에 변수를 놓친다', '일·복수에 몰두해 사람을 뒷전으로 둔다', '거절당할까 봐 마음을 먼저 닫는다', '소유욕이 지나쳐 상대를 옭아맨다',
  '소문·평판에 쉽게 흔들린다', '전생의 기억에 매여 현재를 못 산다', '자기 감정을 인정하지 못하는 둔감함', '상처받지 않으려 일부러 차갑게 군다',
  '희생만 하다 정작 자기 마음을 놓친다', '아이·약자 앞에서만 무방비하게 무너진다', '한번 정한 사람·계획은 끝까지 고집부린다', '완벽주의 탓에 약한 모습을 못 보인다',
  '권력·신성력을 과신해 위험을 자초한다', '거짓말을 못 해 비밀을 들킬 위기를 자주 만든다', '의심이 많아 다가오는 진심을 밀어낸다', '책임감이 과해 자기 행복을 늘 미룬다',
]

// 비밀(원작 강제력·블랙모먼트의 씨앗) — 도시에: 회빙환·정체·폭로·반전
const SECRET = [
  '회귀·빙의해 미래(원작 결말)를 전부 알고 있다', '사실 그를 오래전부터 짝사랑해 왔다', '원작에서 이 남자는 다른 여주인공의 차지였다', '실은 그의 가문을 무너뜨린 원수의 핏줄이다',
  '그를 위해 일부러 미움받는 악역을 자처하고 있다', '계약·정략으로 시작된 관계임을 세간에 숨기고 있다', '신분·정체를 위장해 그의 곁에 숨어들었다', '치명적 저주·시한부 선고를 홀로 안고 있다',
  '"원작대로면 곧 처형·파멸당한다"는 정해진 운명을 알고 있다', '신탁·예언이 지목한 "그 아이"가 사실 자신이다', '버려진 출신이지만 실은 황녀·신의 자손·고대 혈통이다', '복수를 위해 다가갔다가 진심이 되어버렸다',
  '그가 잊은 어린 시절의 약속·첫 만남을 혼자만 기억한다', '신성력·금단의 마법을 숨기고 있다', '두 사람을 갈라놓을 원작의 결말을 막으려 애쓰고 있다', '사실은 그를 떠나야만 하는 운명적 이유가 있다',
  '원작에서 자신은 일찍 퇴장하는 단역이었다는 진실을 숨긴다', '신탁이 예고한 재앙을 막을 열쇠가 자기 핏속에 있음을 안다', '겉으로는 정략혼이지만 실은 그를 구하기 위해 자처한 거래다', '평온한 미소 뒤에 회귀를 거듭하며 쌓인 무수한 실패의 기억을 감춘다',
]

// 관계 트로프(밀당 동력 — 두 사람의 관계 설정) — 도시에의 핵심 서사 장치
const TROPE = [
  '적대 → 연인(enemies-to-lovers): 으르렁대다 끌리는 사이', '계약·정략으로 시작해 진짜가 되는 관계', '집착·독점: 놓아주지 않는 한 사람', '후회물: 버린 쪽이 뒤늦게 매달리는 구도',
  '회귀·빙의로 바뀌는 운명 속 재회', '신분·격차를 넘은 금지된 사랑(영애×기사)', '한 지붕·강제 동거(forced proximity)', '슬로우번: 천천히 쌓아 올리는 긴장',
  '첫눈에 반한 운명적 끌림(신탁이 맺어준 짝)', '재회물: 헤어졌다 다시 만난 옛 연인', '소꿉친구·어린 시절 약속의 재회', '연적·역하렘 속에서 자각하는 질투의 진심',
  '가짜 약혼 연기가 진심이 되는 전환', '원수의 자식과 사랑에 빠지는 비극적 인연', '치유: 서로의 상처를 보듬어 회복하는 관계', '딸바보 보호자와 거둔 아이를 매개로 가까워지는 사이',
  '서로의 비밀(회귀·빙의)을 모른 채 가까워지는 사이', '주군과 호위의 충정이 사랑이 되는 관계', '원작 강제력에 맞서 함께 운명을 비트는 동맹', '이중 시점: 그의 독백으로만 드러나는 짝사랑',
]

// 애착·연애 스타일(스킨십·표현 방식) — 도시에: 접촉 고조·심쿵 묘사
const STYLE = [
  '좋아할수록 더 퉁명스러워지는 츤데레', '말보다 손길이 먼저 나가는 다정한 스킨십파', '눈빛과 분위기로 모든 걸 말하는 무드 메이커', '직진형: 좋아하면 바로 들이대는 솔직함',
  '천천히 거리를 좁히는 신중한 슬로우 스타터', '질투하면서도 티 안 내려는 서툰 사람', '편지·서신으로 진심을 전하는 글쟁이형', '곁에 있어주는 것으로 마음을 표현하는 침묵형',
  '위기 순간 망설임 없이 공주님 안기로 구하는 행동파', '한번 마음을 열면 끝까지 헌신하는 올인형', '밀당의 고수, 한 발 다가가면 두 발 물러서기', '스킨십엔 서툴지만 챙김은 1등인 무뚝뚝파',
  '고백은 만인 앞에서 거창하게, 평소엔 무심한 반전 매력', '상대 페이스에 다 맞춰주는 배려형', '질투 유발로 마음을 확인하려는 밀당파', '닿을 듯 닿지 않는 긴장을 즐기는 갈망형',
  '손끝의 온도 변화로 마음을 들키는 표현 서툰 타입', '벽치기·손목 끌기로 마음을 들이미는 저돌형', '"내 것"이라 못 박는 독점형', '속마음은 독백으로만 쏟아내는 이중 시점형',
]

// 인연·주변 인물(서사의 연적·조력자·방해자) — 도시에: 질투 플롯·외부 압력·공개 망신
const BOND = [
  '둘 사이를 가르려는 완벽한 조건의 연적(원작 여주인공)', '진심을 응원해 주는 든든한 절친·시녀', '정략혼을 강요하는 가문의 어른', '과거의 연인이자 현재의 라이벌',
  '비밀(회귀·빙의)을 함께 아는 입 무거운 측근', '오해를 부추기고 음모를 꾸미는 악역', '둘을 엮어주려 안달인 오지랖 친구', '신분·집안 차이로 반대하는 가족',
  '한때 사랑했으나 놓아준 옛사람', '곁을 지키는 충직한 호위·시종', '같은 사람을 좋아하는 안타까운 짝사랑러', '둘의 관계를 시험에 들게 하는 옛 약혼자',
  '공개 석상에서 진실을 폭로해 위기를 만드는 인물', '서로의 마음을 먼저 눈치챈 눈치 빠른 동료', '회귀·원작에서 적이 될 운명의 인물', '두 사람을 운명으로 묶은 신탁·예언의 신관',
  '거둔 아이가 둘을 이어주는 매개가 되는 경우', '꽃받침 서브남주들로 이뤄진 역하렘', '가문의 부흥을 함께 도모하는 충직한 가신', '몰락을 노리는 계모·이복형제',
  '진실을 알면서도 끝내 침묵을 지켜주는 늙은 유모', '둘의 인연을 점지하고도 시험에 들게 하는 신탁의 대신관', '사교계의 소문을 쥐락펴락하는 영향력 있는 후원자', '원작 지식을 함께 나눠 가진 또 다른 회귀·빙의자',
]

// ───────────── 슬롯 메타 ─────────────
type SlotKey = 'world' | 'station' | 'charm' | 'first' | 'epithet' | 'power' | 'trope' | 'motive' | 'wound' | 'flaw' | 'secret' | 'style' | 'bond'
interface SlotDef { key: SlotKey; label: string; icon: string; typed?: boolean /* 원형별 풀 사용 */; highlight?: boolean }
const SLOTS: SlotDef[] = [
  { key: 'world', label: '작품 결·배경', icon: '🏰' },
  { key: 'station', label: '신분·역할', icon: '🎭' },
  { key: 'charm', label: '매력 포인트(설렘)', icon: '💘', typed: true, highlight: true },
  { key: 'first', label: '첫 등장(meet-cute)', icon: '🤝', typed: true },
  { key: 'epithet', label: '이명(호칭)', icon: '🏷️', typed: true },
  { key: 'power', label: '능력·무기(주체성)', icon: '✨', typed: true, highlight: true },
  { key: 'trope', label: '관계 트로프(밀당)', icon: '💞', highlight: true },
  { key: 'motive', label: '동기·목표', icon: '🎯' },
  { key: 'wound', label: '결핍·상처(회귀 트라우마)', icon: '🩹', highlight: true },
  { key: 'flaw', label: '결점·약점', icon: '🌶️' },
  { key: 'secret', label: '비밀(원작 강제력)', icon: '🤫', highlight: true },
  { key: 'style', label: '연애 스타일', icon: '💌' },
  { key: 'bond', label: '인연·주변 인물', icon: '🔗' },
]

function poolFor(arch: ArchKey, key: SlotKey, sex: 'f' | 'm' = 'f'): string[] {
  const a = ARCHES[arch]
  switch (key) {
    case 'world': return a.worlds.map((w) => WORLDS[w].label)
    case 'station': return STATION.map((e) => resolveStation(e, sex))
    case 'charm': return a.charms
    case 'first': return a.firsts
    case 'epithet': return a.epithets
    case 'power': return a.powers
    case 'trope': return TROPE
    case 'motive': return MOTIVE
    case 'wound': return WOUND
    case 'flaw': return FLAW
    case 'secret': return SECRET
    case 'style': return STYLE
    case 'bond': return BOND
  }
}

// 조합수: 공통 슬롯 × 원형 종류 × (원형별 typed 풀의 최소 곱) × 결(world) 수 → "이상" 표기.
// 조 단위 지향: 공통(STATION·TROPE·MOTIVE·WOUND·FLAW·SECRET·STYLE·BOND) × 원형 × typed(charm·first·epithet·power) × world.
function comboCount(): number {
  const common = STATION.length * TROPE.length * MOTIVE.length * WOUND.length * FLAW.length * SECRET.length * STYLE.length * BOND.length
  let typedMin = Infinity
  let worldMin = Infinity
  for (const ak of ARCH_LIST) {
    const a = ARCHES[ak]
    typedMin = Math.min(typedMin, a.charms.length * a.firsts.length * a.epithets.length * a.powers.length)
    worldMin = Math.min(worldMin, a.worlds.length)
  }
  return common * ARCH_LIST.length * typedMin * worldMin
}
const COMBOS = comboCount()
function comboLabel(n: number): string {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조+`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(0)}억+`
  return `약 ${n.toLocaleString()}+`
}

// ───────────── 작명 ─────────────
function rollWorldKey(arch: ArchKey): WorldKey { return pick(ARCHES[arch].worlds) }
// 인물의 성을 원형 성향(lean)에 맞춰 한 번 결정 → 이름·신분 호칭을 같은 성으로 일치시킨다(정합성).
function rollSex(lean: 'm' | 'f' | 'any'): 'f' | 'm' {
  return lean === 'f' ? 'f' : lean === 'm' ? 'm' : (Math.random() < 0.5 ? 'f' : 'm')
}
function rollName(world: WorldKey, sex: 'f' | 'm'): string {
  const useF = sex === 'f'
  if (world === 'east') return pick(useF ? EAST_F : EAST_M)
  // west / magic / sacred / novel → 서양 제국풍 기본
  const base = pick(useF ? WEST_F : WEST_M)
  return Math.random() < 0.55 ? base + ' ' + pick(WEST_HOUSE) : base
}
function rollAge(): string { return `${16 + ri(16)}세` }

function genSlots(arch: ArchKey, sex: 'f' | 'm', keep?: Partial<Record<SlotKey, string>>): Record<SlotKey, string> {
  const out = {} as Record<SlotKey, string>
  for (const s of SLOTS) {
    if (keep && keep[s.key] != null) { out[s.key] = keep[s.key] as string; continue }
    out[s.key] = pick(poolFor(arch, s.key, sex))
  }
  return out
}

// ───────────── 캐릭터 데이터 ─────────────
interface Gen {
  id: string
  arch: ArchKey
  world: WorldKey
  sex: 'f' | 'm'
  name: string
  seed: number
  age: string
  slots: Record<SlotKey, string>
}

function genOne(arch: ArchKey): Gen {
  const a = ARCHES[arch]
  const world = rollWorldKey(arch)
  const sex = rollSex(a.lean)
  const slots = genSlots(arch, sex)
  slots.world = WORLDS[world].label
  return { id: uid(), arch, world, sex, name: rollName(world, sex), seed: ri(1e9), age: rollAge(), slots }
}

// 저작권 안전 아바타(DiceBear, seed 기반 생성형 SVG). 원형별 스타일.
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/${ARCHES[g.arch].dice}/svg?seed=${encodeURIComponent(g.name + g.seed)}`
}

// ───────────── 저장(명단) ─────────────
interface Saved { id: string; arch: ArchKey; world: WorldKey; sex?: 'f' | 'm'; name: string; age: string; seed: number; slots: Record<SlotKey, string>; ts: number }
function loadSaved(): Saved[] {
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Saved[] } } catch { /* noop */ }
  return []
}
function persist(list: Saved[]) { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 60))) } catch { /* noop */ } }

// ───────────── 텍스트/연계 매핑 ─────────────
function fullTitle(g: Gen): string {
  return `${g.slots.epithet}, ${g.name}`
}
function summaryText(g: Gen): string {
  const a = ARCHES[g.arch]
  const head = `[${a.label}] ${fullTitle(g)} (${g.age} · ${WORLDS[g.world].label})`
  const body = SLOTS.filter((s) => s.key !== 'world').map((s) => `${s.label}: ${g.slots[s.key]}`).join('\n')
  const vibe = `배경 분위기: ${pick(WORLDS[g.world].vibes)}`
  return head + '\n' + body + '\n' + vibe
}
function bodyHtml(g: Gen): string {
  const a = ARCHES[g.arch]
  const rows = SLOTS.filter((s) => s.key !== 'world').map((s) => `<p><b>${esc(s.label)}</b>: ${esc(g.slots[s.key])}</p>`).join('')
  return `<p><b>원형</b>: ${esc(a.label)} · <b>작품 결</b>: ${esc(WORLDS[g.world].label)} · <b>나이</b>: ${esc(g.age)}</p>${rows}`
}
function toCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    role: `${a.label} · ${g.slots.station}`,
    age: `${g.age} · ${WORLDS[g.world].label}`,
    occupation: g.slots.station,
    appearance: `이명 "${g.slots.epithet}" · 첫 등장: ${g.slots.first}`,
    personality: `매력: ${g.slots.charm} · 연애 스타일: ${g.slots.style} · 결점: ${g.slots.flaw}`,
    background: `결핍·상처: ${g.slots.wound} · 능력·무기: ${g.slots.power} · 인연: ${g.slots.bond}`,
    goal: g.slots.motive,
    conflict: `관계 트로프: ${g.slots.trope} · 비밀(원작 강제력): ${g.slots.secret}`,
  }
}

// 정규(표준) 캐릭터 필드 — 받는 허브(인물 시트/모델/관계도)에서 항목이 기본 칸에 들어가도록
// 이 도구의 슬롯 값을 표준 키에 1:1로 매핑(뭉친 값은 분리). 손실 없는 연동의 핵심.
function toCharacterCanonical(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,                                    // 이름
    aka: g.slots.epithet,                            // 이명·호칭 → 별칭
    role: `${a.label} · ${g.slots.station}`,         // 원형 · 신분
    age: g.age,                                      // 나이(뭉친 결·배경은 affiliation 으로 분리)
    occupation: g.slots.station,                     // 신분·역할 → 직업
    affiliation: WORLDS[g.world].label,              // 작품 결·배경(세계관·세력) → 소속
    appearance: `이명 "${g.slots.epithet}" · 첫 등장: ${g.slots.first}`, // 외모/등장 자유 서술
    personality: g.slots.charm,                      // 매력 포인트(설렘) → 성격
    goal: g.slots.motive,                            // 동기·목표 → 목표/욕망
    motivation: g.slots.motive,                      // 동기 → 동기
    flaw: g.slots.flaw,                              // 결점·약점 → 약점/결점
    secret: g.slots.secret,                          // 비밀(원작 강제력) → 비밀
    background: `결핍·상처: ${g.slots.wound} · 능력·무기: ${g.slots.power}`, // 회귀 트라우마·능력 → 배경
    relations: `관계 트로프: ${g.slots.trope} · 인연: ${g.slots.bond}`,     // 트로프·주변 인물 → 관계
    notes: `첫 등장: ${g.slots.first} · 능력·무기: ${g.slots.power} · 연애 스타일: ${g.slots.style}`, // 보강 메모
  }
}

// ───────────── 컴포넌트 ─────────────
export default function RomanceCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : '로맨스판타지'
  const [arch, setArch] = useState<ArchKey>('villainess')
  const [g, setG] = useState<Gen>(() => genOne('villainess'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockName, setLockName] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [toast, setToast] = useState('')
  const [showRoster, setShowRoster] = useState(false)
  // 사용자 정의 항목(라벨은 유지, 값은 직접 입력) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = useCallback(() => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 가족, 취향, 트라우마)')
    if (label == null) return
    const trimmed = label.trim()
    if (!trimmed) return
    setCustom((prev) => [...prev, { id: uid(), label: trimmed, value: '' }])
  }, [])
  const setCustomValue = useCallback((id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }, [])
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // 무작위 생성/재생성 시 사용자 정의 항목의 '값'은 비우되 '항목(라벨)'은 유지, 기타도 비움
  const clearUserInputs = useCallback(() => {
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [])

  // 다른 도구로 보낼 때 합칠 추가 필드(사용자 정의 비어있지 않은 값 + 기타)
  const extraFields = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) { if (c.value.trim()) out[c.label] = c.value.trim() }
    if (etc.trim()) out.etc = etc.trim()
    return out
  }, [custom, etc])

  // 복사/요약에 덧붙일 텍스트(사용자 정의 + 기타)
  const extraText = useCallback((): string => {
    const lines: string[] = []
    for (const c of custom) { if (c.value.trim()) lines.push(`${c.label}: ${c.value.trim()}`) }
    if (etc.trim()) lines.push(`기타: ${etc.trim()}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }, [custom, etc])

  // 언마운트 정리
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1800)
  }, [])

  // 전체 굴리기(잠긴 슬롯/이름 유지). 원형 변경 시 typed 풀이 달라지므로
  // 잠긴 typed 슬롯은 그대로 둔다(사용자가 의도적으로 고정한 것).
  const rollAll = useCallback((forArch?: ArchKey) => {
    const ak = forArch ?? arch
    clearUserInputs()
    setG((prev) => {
      const keep: Partial<Record<SlotKey, string>> = {}
      for (const s of SLOTS) if (locked[s.key]) keep[s.key] = prev.slots[s.key]
      // 이름·결을 잠그면 성도 유지(이름과 신분 호칭을 같은 성으로 일치). 아니면 새 원형 성향으로 재추첨.
      const sex = lockName ? prev.sex : rollSex(ARCHES[ak].lean)
      const world = lockName ? prev.world : rollWorldKey(ak)
      const name = lockName ? prev.name : rollName(world, sex)
      const age = lockName ? prev.age : rollAge()
      const seed = lockName ? prev.seed : ri(1e9)
      const slots = genSlots(ak, sex, keep)
      if (!locked.world) slots.world = WORLDS[world].label
      return { id: uid(), arch: ak, world, sex, name, seed, age, slots }
    })
  }, [arch, locked, lockName, clearUserInputs])

  const rollOne = useCallback((key: SlotKey) => {
    setG((prev) => {
      if (key === 'world') {
        const world = rollWorldKey(prev.arch)
        return { ...prev, world, slots: { ...prev.slots, world: WORLDS[world].label } }
      }
      // 신분은 인물의 성에 맞춰 한쪽 호칭만 뽑힌다(양성 병기 노출 방지).
      return { ...prev, slots: { ...prev.slots, [key]: pick(poolFor(prev.arch, key, prev.sex)) } }
    })
  }, [])

  const rollNameOnly = useCallback(() => {
    setG((prev) => {
      // 이름만 다시 굴릴 때 성이 바뀌면 신분 호칭도 새 성에 맞춰 재해소(불일치 방지).
      const sex = rollSex(ARCHES[prev.arch].lean)
      const slots = locked.station ? prev.slots : { ...prev.slots, station: pick(poolFor(prev.arch, 'station', sex)) }
      return { ...prev, sex, name: rollName(prev.world, sex), seed: ri(1e9), age: rollAge(), slots }
    })
  }, [locked.station])

  const changeArch = useCallback((ak: ArchKey) => { setArch(ak); rollAll(ak) }, [rollAll])
  const toggleLock = (key: SlotKey) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 저장(명단)
  const saveToRoster = useCallback(() => {
    const rec: Saved = { id: g.id, arch: g.arch, world: g.world, sex: g.sex, name: g.name, age: g.age, seed: g.seed, slots: g.slots, ts: Date.now() }
    setSaved((prev) => {
      const next = [rec, ...prev.filter((x) => x.id !== rec.id)].slice(0, 60)
      persist(next)
      return next
    })
    flash('명단에 저장했습니다')
  }, [g, flash])

  const loadFromRoster = useCallback((s: Saved) => {
    setArch(s.arch)
    setG({ id: s.id, arch: s.arch, world: s.world, sex: s.sex ?? rollSex(ARCHES[s.arch].lean), name: s.name, age: s.age, seed: s.seed, slots: s.slots })
    clearUserInputs()
    setShowRoster(false)
  }, [clearUserInputs])

  const deleteFromRoster = useCallback((id: string) => {
    setSaved((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next })
  }, [])

  // 연계
  const copy = () => { navigator.clipboard?.writeText(summaryText(g) + extraText()).then(() => flash('복사됨')).catch(() => flash('복사 실패')) }
  const toProject = () => {
    const ex = extraFields()
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: fullTitle(g),
      character: { ...toCharacterFields(g), ...toCharacterCanonical(g), ...ex },
      bodyHtml: bodyHtml(g),
      meta: { 원형: ARCHES[g.arch].label, 작품결: WORLDS[g.world].label, 나이: g.age, 신분: g.slots.station, 트로프: g.slots.trope, 이명: g.slots.epithet, 능력: g.slots.power, 장르: '로맨스판타지' },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가할 수 없습니다')
  }
  const toLibrary = () => {
    const ex = extraFields()
    const c: Partial<SharedCharacter> = {
      name: g.name,
      photo: avatarUrl(g), photoCredit: 'DiceBear',
      role: `${ARCHES[g.arch].label} · ${g.slots.station}`,
      goal: g.slots.motive,
      secret: g.slots.secret,
      personality: `${g.slots.charm} · ${g.slots.style}`,
      appearance: `${g.slots.epithet} · 첫 등장: ${g.slots.first}`,
      fields: { ...toCharacterCanonical(g), ...ex },
      traits: [
        { k: '원형', v: ARCHES[g.arch].label },
        { k: '작품 결', v: WORLDS[g.world].label },
        { k: '나이', v: g.age },
        ...SLOTS.filter((s) => s.key !== 'world').map((s) => ({ k: s.label, v: g.slots[s.key] })),
        ...Object.entries(ex).map(([k, v]) => ({ k, v })),
      ],
      source: '로판 캐릭터 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toSheet = () => {
    openToolLinked('character-sheet', { character: { ...toCharacterFields(g), photo: avatarUrl(g), photoCredit: 'DiceBear', fields: { ...toCharacterCanonical(g), ...extraFields() } } })
    flash('인물 시트로 보냈습니다')
  }

  const a = ARCHES[g.arch]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 헤더: 원형 선택 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {ARCH_LIST.map((ak) => (
          <button key={ak} className={'minibtn' + (arch === ak ? ' active' : '')} onClick={() => changeArch(ak)}
            style={arch === ak ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title={ARCHES[ak].label}>
            <Emoji e={ARCHES[ak].icon} /> {ARCHES[ak].label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="대략적인 조합 경우의 수(원형·결별 최소 풀 기준)">
          {comboLabel(COMBOS)} 조합
        </span>
      </div>

      {/* 카드 헤더: 아바타 + 요약 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={84} height={84}
            style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div className="license-note" style={{ marginTop: 2, fontSize: 9.5, color: 'var(--muted)' }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{g.name}</span>
            <button className="minibtn" title="이름·나이·아바타만 다시" onClick={rollNameOnly} style={{ padding: '0 4px' }}><Emoji e="🎲" /></button>
            <button className="minibtn" title={lockName ? '이름·결 잠금해제' : '이름·결 잠금'} onClick={() => setLockName((v) => !v)}
              style={{ padding: '0 4px', color: lockName ? 'var(--accent)' : 'var(--muted)' }}>{lockName ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            <Emoji e={a.icon} /> {a.label} · {WORLDS[g.world].label} · {g.age}<br />
            <Emoji e="🏷️" /> “{g.slots.epithet}”<br />
            <Emoji e="💞" /> {g.slots.trope}
          </div>
        </div>
      </div>

      {/* 슬롯 표 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          const hl = !!s.highlight
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--panel)',
              border: '1px solid ' + (hl ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 7, padding: '5px 7px',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 112, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span><Emoji e={s.icon} /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', fontWeight: hl ? 600 : 400 }}
                title={g.slots[s.key]}>{g.slots[s.key]}</span>
              <button className="minibtn" title={isLocked ? '잠금해제' : '잠금'} onClick={() => toggleLock(s.key)}
                style={{ padding: '0 3px', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(s.key)} disabled={isLocked}
                style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          )
        })}

        {/* 사용자 정의 항목(직접 입력) */}
        {custom.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px dashed var(--border)',
            borderRadius: 7, padding: '5px 7px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 112, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span><Emoji e="📝" /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            </span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)}
              placeholder="직접 입력"
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 5px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)}
              style={{ padding: '0 3px', color: 'var(--danger, #c0392b)' }}>✕</button>
          </div>
        ))}

        {/* 항목 추가 */}
        <button className="minibtn" onClick={addCustom} title="이름을 입력해 직접 채울 항목을 추가합니다"
          style={{ justifySelf: 'start', fontSize: 11.5, padding: '3px 8px' }}>＋ 항목 추가</button>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 3,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 7, padding: '5px 7px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span><Emoji e="🗒️" /></span><span>기타</span>
          </span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)}
            placeholder="자유롭게 메모하세요 (설정·뒷이야기·아이디어 등)"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 54, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px' }} />
        </div>
      </div>

      {/* 생성/저장 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> 로판 캐릭터 생성</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={saveToRoster}><Emoji e="💾" /> 명단에 저장</button>
        <button className="minibtn" onClick={() => setShowRoster((v) => !v)}><Emoji e="📇" /> 명단 {saved.length ? `(${saved.length})` : ''}</button>
      </div>

      {/* 명단(CRUD) */}
      {showRoster && (
        <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--paper)' }}>
          {saved.length === 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: 6, textAlign: 'center' }}>저장된 캐릭터가 없습니다. “명단에 저장”을 눌러보세요.</div>
          ) : saved.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}><Emoji e={ARCHES[s.arch].icon} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b>{s.name}</b> <span style={{ color: 'var(--muted)' }}>· {ARCHES[s.arch].label} · {WORLDS[s.world].label}</span>
              </span>
              <button className="minibtn" title="불러오기" onClick={() => loadFromRoster(s)} style={{ padding: '0 5px' }}>열기</button>
              <button className="minibtn" title="삭제" onClick={() => deleteFromRoster(s.id)} style={{ padding: '0 5px', color: 'var(--danger, #c0392b)' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map')}><Emoji e="🕸️" /> 관계도</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: genreCtx })}><Emoji e="🔤" /> 이름 짓기</button>
      </div>

      <div style={{ fontSize: 11, color: toast ? 'var(--ok, #2e8b57)' : 'var(--muted)', minHeight: 14 }}>
        {toast || `${genreCtx} 전용 · 원형을 바꾸면 매력·첫 등장·이명·능력 풀이 달라집니다. ‘능력·트로프·상처·비밀(원작 강제력)’로 주체성과 “왜 하필 이 사람인가”를 설득하세요.`}
      </div>
    </div>
  )
}
