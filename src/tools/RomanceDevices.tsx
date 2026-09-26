// 로맨스 서사 장치·전개법 사전 — 이 장르 고유의 장치/구조/페이싱/클라이맥스 관습을
// 정의·사용법·예시·비틀기로 정리. 카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 프로젝트 연계.
// 자급식: react 와 './linkbus' 외 import 없음. 데이터는 본 파일 내 자작(도시에 근거).
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, addToLibrary, openToolLinked, type ToolPayload,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'romance-devices',
  name: '로맨스 서사장치 사전',
  icon: '💞',
  group: '장치·전개',
  genre: '로맨스',
  intro: '밀당·블랙모먼트·대형 고백·강제동거… 로맨스 고유 장치와 전개·페이싱·클라이맥스 관습을 정의+사용법+예시+비틀기로',
  w: 620,
  h: 660,
}

// ── 데이터 모델 ──
interface Device {
  name: string          // 장치/패턴 이름
  alias?: string        // 영문/별칭
  def: string           // 정의
  use: string           // 사용법(쓰는 법)
  ex: string            // 구체 예시(대표작/장면)
  twist: string         // 비틀기(클리셰 탈출/변주)
  tags?: string[]       // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 로맨스 도시에 근거 자작 데이터: 7개 카테고리 ──
const CATS: CatDef[] = [
  {
    key: 'tension', label: '긴장·끌림 장치', icon: '🪢',
    desc: '끌림과 회피를 진동시켜 두근거림을 만드는 텐션 엔진들.',
    items: [
      {
        name: '밀당(끌림-회피 진자)', alias: 'Push-Pull Dynamic',
        def: '가까워지면 한쪽이 물러서고, 멀어지면 다른 쪽이 끌림을 자각하는 진자 운동. 진자가 멈추면 로맨스 텐션이 죽는다.',
        use: '"한 발 다가가면 두 발 물러서기" 박자를 장면마다 새긴다. 다가서는 쪽과 물러서는 쪽을 회차마다 교대시켜 단조로움을 막는다.',
        ex: '오만과 편견의 다아시-엘리자베스: 청혼→거절→해명 편지→재평가의 왕복. 다아시가 다가오면 엘리자베스가 편견으로 밀어내고, 그녀가 누그러지면 그가 자존심으로 물러난다.',
        twist: '진자를 비대칭으로: 한쪽은 이미 깊이 빠졌는데 다른 쪽만 밀당한다고 믿게 한다(짝사랑+오인). 또는 두 사람이 "안 끌리는 척"을 연기하다 서로의 연기를 들키는 메타 밀당.',
        tags: ['밀당', '텐션', '진자', '끌림'],
      },
      {
        name: '애틋한 갈망', alias: 'Yearning / Pining',
        def: '드러내지 못하는 마음, "닿을 듯 닿지 않는" 짝사랑의 묘사. 로맨스 정서의 핵심 연료.',
        use: '시선의 머묾, 거두는 손끝, 혼자 삼키는 독백으로 표현한다. 직접 "좋아한다"고 쓰지 말고 행동·감각의 미세한 떨림으로 흘린다.',
        ex: '제인 에어가 로체스터를 향해 품는, 신분과 도덕 사이에서 억누른 갈망. 말하지 못하기에 더 커지는 마음.',
        twist: '쌍방 갈망(양쪽 다 짝사랑이라 믿음)으로 독자만 아는 안타까움을 극대화. 또는 갈망의 대상을 오해해 엉뚱한 사람을 향하다 진짜를 깨닫는 반전.',
        tags: ['갈망', '짝사랑', '애틋', '그리움'],
      },
      {
        name: '니어 키스', alias: 'The Almost-Kiss',
        def: '입맞춤 직전 방해받아 보상을 미루는 장치. 텐션을 정점으로 끌어올렸다가 끊는다.',
        use: '거리가 0에 수렴하는 순간 외부 방해(전화·노크·제3자·사고)를 삽입한다. 방해 후 두 사람의 어색함·아쉬움을 반드시 잔향으로 남긴다.',
        ex: '드라마틱한 빗속 처마 밑, 숨결이 닿을 거리에서 누군가 부르는 소리에 화들짝 떨어지는 장면.',
        twist: '니어 키스를 세 번 누적시킨 뒤 네 번째에 폭발(보상 지연의 카타르시스). 또는 방해의 주체가 연적이라, 니어 키스 실패가 질투 플롯으로 전환되게 한다.',
        tags: ['니어키스', '키스', '지연', '보상'],
      },
      {
        name: '접촉의 단계적 고조', alias: 'Touch Escalation',
        def: '우연한 손 스침 → 의도적 접촉 → 포옹 → 키스 → 그 이상으로, 신체 거리의 점층이 감정 거리의 점층을 가시화한다.',
        use: '접촉의 "처음들"을 사건처럼 다룬다(첫 손잡기, 첫 어깨 기댐). 각 단계 전후로 인물의 심박·체온 묘사를 배치해 의미를 부여한다.',
        ex: '계단에서 넘어질 뻔한 그녀를 붙잡은 손이 필요 이상으로 오래 머무는 순간 — 둘 다 그것을 의식한다.',
        twist: '역행 접촉: 이미 가까웠던 사이가 오해 후 "닿지 않으려 피하는" 거리두기로 후퇴 → 재접촉의 무게를 키운다. 후회물에서 특히 강력.',
        tags: ['접촉', '스킨십', '손', '거리'],
      },
      {
        name: '질투 유발 장치', alias: 'Jealousy Plot',
        def: '연적·과거 연인·약혼자의 등장으로 주인공이 자기 진심을 자각하게 만드는 촉매.',
        use: '연적은 "그럴듯한 위협"이어야 한다(매력·조건이 진짜라야 질투가 산다). 질투를 인정하지 않으려는 인물의 자기기만을 함께 그린다.',
        ex: '바람과 함께 사라지다에서 레트가 다른 여인과 어울릴 때 스칼렛이 느끼는, 인정하기 싫은 동요.',
        twist: '연적이 사실 좋은 사람이라 미워할 수 없게 만들어 죄책감을 더한다. 또는 질투를 유발하려 꾸민 연기가 진짜 균열을 내는 역효과.',
        tags: ['질투', '연적', '삼각관계', '라이벌'],
      },
      {
        name: '슬로우번 vs 인스타러브', alias: 'Slow Burn / Insta-love',
        def: '감정 점화 속도의 설계. 슬로우번은 긴장의 누적(장편·로판 주력), 인스타러브는 첫눈에 반함(단편·카테고리물).',
        use: '분량과 장르에 맞춰 선택한다. 슬로우번은 "아직 아닌" 순간을 길게 끌되 매 회차 미세한 진척을 보장. 인스타러브는 빠른 결합 후 "왜 우리가 맞는가"를 사후 증명한다.',
        ex: '슬로우번: 아웃랜더의 다층적 빌드업. 인스타러브: 카테고리 로맨스(밀스앤분)의 첫 만남 직후 강한 끌림.',
        twist: '인스타러브로 시작해 "첫눈에 반한 게 착각이었다"를 거쳐 진짜 슬로우번으로 다시 쌓는 이중 구조. 점화 속도 자체를 반전 소재로 쓴다.',
        tags: ['슬로우번', '인스타러브', '속도', '점화'],
      },
      {
        name: '첫인상 역전', alias: 'First Impression Reversal',
        def: '최악의 첫인상(오만/무례/오해)이 시간이 지나며 정반대로 뒤집히는 끌림 곡선. enemies-to-lovers의 심장.',
        use: '첫 장면에서 강렬한 부정적 인상을 새긴 뒤, 그 인상을 깨는 "보이지 않던 면"을 조금씩 노출한다. 독자가 인물을 재평가하는 속도와 주인공의 속도를 어긋나게 해 답답함·설렘을 조절.',
        ex: '오만과 편견: "그럭저럭 봐줄 만하나 나를 흔들 정도는 아니다"라던 다아시의 첫 평가가 완전히 뒤집힌다.',
        twist: '좋았던 첫인상이 거짓이었음이 드러나며 재평가가 하강하는 역방향 — 후반 신뢰 회복의 산을 높인다.',
        tags: ['첫인상', '오해', 'enemies to lovers', '재평가'],
      },
    ],
  },
  {
    key: 'binding', label: '관계 결박 장치', icon: '🔗',
    desc: '두 인물을 물리적·계약적으로 묶어 감정 발생을 강제하는 설정 장치.',
    items: [
      {
        name: '강제 동거·밀착', alias: 'Forced Proximity',
        def: '둘을 물리적으로 묶어 감정을 강제 점화시키는 최강 장치. 도망갈 수 없는 공간이 끌림을 만든다.',
        use: '"빠져나갈 수 없는 명분"을 먼저 단단히 세운다(돈·의무·생존). 갇힌 공간 안에서 일상의 디테일(식사·잠·다툼)을 통해 거리를 좁힌다.',
        ex: '폭설로 갇힌 산장, 같은 프로젝트 파트너, 한 지붕 아래 위장 부부.',
        twist: '밀착의 이유가 사실 한쪽이 꾸민 계략이었음을 후반에 폭로 → 신뢰 위기로 전환. 또는 갇힌 공간을 "둘만의 안전지대"로 만들어, 바깥으로 나가는 순간 관계가 시험받게 한다.',
        tags: ['강제동거', '밀착', '갇힘', '한지붕'],
      },
      {
        name: '한 침대만 남음', alias: 'Only One Bed',
        def: '여관·숙소에 침대가 하나뿐이라 어쩔 수 없이 함께 자야 하는, 강제 밀착의 상징적 미니 장치.',
        use: '"왜 굳이 그래야만 하는가"의 핍진한 사정을 짧게 깐다. 경계선 긋기(베개 장벽·바닥에서 자기 선언) → 새벽에 무너지는 거리의 대비를 활용한다.',
        ex: '임무 중 묵은 시골 여관, 방 하나 침대 하나. 한쪽이 "바닥에서 자겠다"고 고집부리다 결국…',
        twist: '침대가 둘인데도 한쪽으로 모이게 만드는 "선택된 밀착"으로 비틀어, 강제가 아닌 무의식적 끌림을 드러낸다.',
        tags: ['한침대', 'one bed', '여관', '강제'],
      },
      {
        name: '계약 관계 → 진짜 감정', alias: 'Fake to Real',
        def: '계약결혼·계약연애·가짜 연인이 "가짜인데 진짜가 되어버리는" 전환을 겪는 구도. 전환점이 백미.',
        use: '계약의 조항(기간·규칙·해지조건)을 명문화해 두면 그것을 어기는 순간이 곧 감정의 증거가 된다. "이건 계약일 뿐"이라는 자기최면이 깨지는 순간을 클라이맥스 직전에 배치.',
        ex: '재벌가 위장 약혼 계약을 맺은 두 사람이, 연기하던 다정함이 어느새 진심이 되어 당황하는 전개.',
        twist: '계약을 먼저 깨고 싶어진 쪽이 "연장"을 핑계로 관계를 끌려 한다(자기기만 코미디). 또는 한쪽은 처음부터 진심이었고 계약은 곁에 있을 구실이었음을 폭로.',
        tags: ['계약결혼', '계약연애', '가짜연인', 'fake dating'],
      },
      {
        name: '신분·격차의 벽', alias: 'Class Divide',
        def: '재벌과 평사원, 황족과 평민, 주인과 하인 등 사회적 격차가 사랑의 장애물이자 긴장의 원천이 되는 설정.',
        use: '격차를 "넘을 수 없어 보이는" 구체적 규칙으로 제시한다(가문의 반대·세계관의 신분법). 격차가 만드는 권력 불균형을 윤리적으로 의식하며 다룬다.',
        ex: '브리저튼류 리젠시 사교계의 작위·혼인 규범, 한국 현대물의 재벌 상견례 장벽.',
        twist: '격차를 역전시킨다(권력 약자 쪽이 사실 더 큰 힘을 쥐고 있었다). 또는 격차를 극복하는 게 아니라 "격차를 무의미하게 만드는 제3의 가치"로 해소.',
        tags: ['신분차', '재벌', '격차', '계급'],
      },
      {
        name: '의무·책임의 사슬', alias: 'Duty Bind',
        def: '정략결혼·가문의 명령·정치적 동맹 등 "사랑이 아니라 의무로" 묶인 관계에서 진짜 감정이 싹트는 구도. 로판 정치물의 단골.',
        use: '의무의 무게를 충분히 깔아 "마음대로 할 수 없음"을 각인한다. 의무를 다하는 행동 속에 새어나오는 진심을 미세하게 심는다.',
        ex: '재혼황후·정략결혼 로판: 제국의 안정을 위한 혼인이 점차 진짜 동반자 관계로 변모.',
        twist: '의무를 핑계로 곁에 있던 두 사람이, 정작 의무가 사라지자 "이제 함께 있을 명분이 없다"며 흔들리는 역설.',
        tags: ['정략결혼', '의무', '동맹', '정치'],
      },
      {
        name: '비밀 공유의 결속', alias: 'Shared Secret',
        def: '둘만 아는 비밀(정체·과거·위험)을 함께 지키며 생기는 공모적 친밀감. "우리 둘만"의 결속이 끌림으로 전이된다.',
        use: '비밀을 지키는 행위 자체를 데이트처럼 연출한다(은밀한 눈짓·암호). 비밀이 무거울수록 결속이 깊되, 폭로 위험이 곧 텐션이 된다.',
        ex: '신분을 숨긴 황녀와 그 정체를 알게 된 호위무사가 비밀을 함께 지키며 가까워지는 전개.',
        twist: '비밀을 공유한 줄 알았는데 한쪽이 더 큰 비밀을 숨기고 있었음을 밝혀 결속을 한순간에 배신으로 뒤집는다.',
        tags: ['비밀', '공모', '정체', '결속'],
      },
    ],
  },
  {
    key: 'rp', label: '로판 특화 장치', icon: '👑',
    desc: '회귀·빙의·환생·악역영애·집착·후회 등 한국 로맨스판타지가 키운 고유 엔진.',
    items: [
      {
        name: '회귀·빙의·환생(정보 비대칭)', alias: 'Regression / Possession',
        def: '주인공만 미래나 원작 결말을 안다는 정보 비대칭. "비극을 알면서 다시 만남"의 애절함과 "결말을 바꾸는 능동성"을 동시에 만든다.',
        use: '주인공이 아는 미래와 실제 전개의 어긋남으로 서스펜스를 만든다. "내가 아는 그 사람"과 "지금 눈앞의 그"의 간극에서 감정을 길어 올린다.',
        ex: '"이 책 속 악녀가 되었다" 류 책빙의물: 원작 결말을 아는 주인공이 파멸 루트를 피하려다 남주와 얽힌다.',
        twist: '상대(남주)도 회귀자였음을 후반에 밝혀 정보 비대칭을 양방향으로 뒤집는다("너도 기억하고 있었어?"). 또는 주인공이 아는 결말 자체가 위조된 정보였다는 메타 반전.',
        tags: ['회귀', '빙의', '환생', '책빙의', '정보비대칭'],
      },
      {
        name: '악역 영애 생존기', alias: 'Villainess Survival',
        def: '원작에서 파멸할 운명의 "악역 영애"에 빙의/환생해 정해진 비극을 피하며 살아남는 구도. 원작 파괴와 생존 본능이 동력.',
        use: '"정해진 파멸 플래그"를 명확히 제시해 긴장을 만든다. 악역의 악행을 하지 않거나 뒤집을 때마다 원작 인물들의 반응이 어긋나는 재미를 활용.',
        ex: '버림받을 운명의 황비/공녀가 이혼·추방·처형 루트를 피해 능동적으로 자기 삶을 개척하는 전개.',
        twist: '"악역"이 사실 누명을 쓴 피해자였음을 밝혀 도덕 구도를 재편. 또는 파멸을 피하려는 행동이 오히려 새로운 파멸 플래그를 세우는 운명의 아이러니.',
        tags: ['악역영애', '악녀', '생존', '파멸플래그', '원작파괴'],
      },
      {
        name: '집착남주(얀데레)', alias: 'Obsessive Hero',
        def: '여주를 향한 과도한 독점욕·집착으로 사랑을 표현하는 남주 유형. 위험과 매혹이 공존한다.',
        use: '집착의 "이유(결핍·트라우마)"를 반드시 깔아 단순 폭력과 구분한다. 집착이 여주의 안전·자유를 침해하지 않는 선을 윤리적으로 의식하며 강도를 조절.',
        ex: '여주가 시야에서 사라지면 불안해하고, 그녀의 모든 것을 알고 싶어 하는 독점적 남주.',
        twist: '집착의 방향을 역전: 여주가 집착하는 쪽이 되고 남주가 도망친다. 또는 집착이 사실 "잃어본 적 있는" 회귀자의 트라우마였음을 밝혀 정당화 없이 이해시킨다.',
        tags: ['집착', '얀데레', '독점욕', '남주'],
      },
      {
        name: '후회남주(후회물)', alias: 'Regret Plot',
        def: '여주를 버리거나 박대한 뒤, 뒤늦게 진가를 깨닫고 매달리며 후회하는 구도. "내가 잘못했다"의 권력 역전 카타르시스가 핵심.',
        use: '전반부에 가해의 무게를 충분히 쌓아야 후반 후회가 통쾌하다. 후회는 말이 아니라 "대가를 치르는 행동"으로 증명시킨다(쉬운 용서 금지).',
        ex: '냉대하던 아내가 떠난 뒤에야 그 빈자리의 크기를 깨닫고 무너지는 남편, 매달려도 돌아오지 않는 그녀.',
        twist: '여주가 후회를 받아주지 않고 완전히 새 삶으로 나아가는 "사이다 엔딩" — HEA를 다른 상대 혹은 자기 성취로 변주. 또는 후회의 진정성을 끝까지 시험하다 마지막에야 한 발 허락.',
        tags: ['후회물', '후회남주', '권력역전', '복수', '사이다'],
      },
      {
        name: '육아·힐링 매개', alias: 'Childcare Bond',
        def: '어린 아이(조카·황태자·고아)를 함께 돌보며 의사 가족이 형성되고 두 어른의 거리가 좁혀지는 따뜻한 결박 장치.',
        use: '아이를 "큐피드"가 아니라 독립적 인물로 그린다. 육아의 사소한 협력(밤중 간호·첫걸음)을 통해 두 사람의 신뢰를 쌓는다.',
        ex: '하렘의 남자들류·황실 육아물: 어린 황자를 함께 키우며 보호자 둘이 가까워지는 힐링 전개.',
        twist: '아이가 사실 미래에서 온 두 사람의 자식이었다는 반전. 또는 육아로 맺어진 "가족"이 진짜 혼인 앞에서 흔들리며 "정 때문인가 사랑인가"를 묻게 한다.',
        tags: ['육아물', '힐링', '의사가족', '아이'],
      },
      {
        name: '원작 인물과의 어긋남', alias: 'Canon Deviation',
        def: '빙의/책빙의물에서 주인공의 행동이 원작 설정과 어긋나며 주변 인물(특히 남주)이 "예상과 다르게" 반응하는 데서 오는 끌림·서스펜스.',
        use: '"원작의 그는 이러지 않았는데"라는 주인공의 내적 당황을 통해 변화를 체감시킨다. 어긋남이 누적되며 원작 결말이 무너지는 도미노를 설계.',
        ex: '원작에서 냉혹했던 남주가, 빙의한 여주의 사소한 친절 하나에 예정에 없던 호감을 보이기 시작한다.',
        twist: '어긋남의 원인이 주인공이 아니라 "원작 자체가 이미 변형된 판본"이었음을 밝힌다. 또는 남주의 변화가 연기였고 그가 진실을 다 알고 있었다는 반전.',
        tags: ['원작파괴', '책빙의', '어긋남', '남주변화'],
      },
    ],
  },
  {
    key: 'conflict', label: '갈등·오해 엔진', icon: '⚔️',
    desc: '관계를 시험하고 최저점으로 끌고 가는 갈등 장치들. 좋은 갈등은 인물의 상처에서 필연적으로 나온다.',
    items: [
      {
        name: '블랙 모먼트', alias: 'The Black Moment / All Is Lost',
        def: '클라이맥스 직전, 관계가 끝장난 것처럼 보이는 최저점. 로맨스의 필수 구조 비트.',
        use: '오해의 폭발·비밀의 폭로·외부 압력의 정점을 한곳에 모은다. 화해가 "불가능해 보일수록" 이후 결합의 카타르시스가 커진다. 장편은 8부 능선쯤에 배치.',
        ex: '쌓아온 신뢰가 한 통의 편지/한 마디 오해로 무너지고, 두 사람이 서로에게 등을 돌리는 순간.',
        twist: '블랙 모먼트의 원인을 외부 음모가 아닌 "두 사람 각자의 진짜 결함"으로 둔다 — 그래야 화해가 성장이 된다. 또는 가짜 블랙 모먼트 뒤에 진짜 블랙 모먼트를 한 번 더 친다.',
        tags: ['블랙모먼트', '최저점', '파국', 'all is lost'],
      },
      {
        name: '오해·소통 단절', alias: 'Miscommunication',
        def: '엇갈린 정보·말 못 할 사정으로 생기는 갈등 엔진. 단, 한 마디면 풀릴 오해(idiot plot)는 함정.',
        use: '오해는 인물의 상처·세계관에서 "필연적으로" 발생해야 한다. "왜 그 말을 못 했는가"에 납득 가능한 이유(자존심·보호·트라우마)를 깐다.',
        ex: '제인 에어가 로체스터의 비밀을 결혼식 직전 알게 되는, 말해질 수 없었던 진실의 폭로.',
        twist: '오해를 "둘 다 절반만 맞은" 구조로 짜 누구도 일방적 가해자가 아니게 한다. 또는 오해를 푸는 순간 더 큰 진실이 드러나 갈등을 갱신한다.',
        tags: ['오해', '소통단절', '엇갈림', 'idiot plot'],
      },
      {
        name: '과거의 상처·트라우마', alias: 'Wound / Backstory',
        def: '사랑을 거부하게 만드는 인물의 핵심 결핍. 방어기제와 끌림의 충돌을 만든다.',
        use: '도입부에서 인물의 "사랑에 대한 방어기제"를 확립한다. 상처는 설명이 아니라 행동의 패턴으로 보여주고, 상대가 그 패턴을 건드릴 때 갈등이 점화되게 한다.',
        ex: '폭풍의 언덕 히스클리프의 버림받은 어린 시절이 평생의 파괴적 집착으로 굳어진다.',
        twist: '두 사람의 상처가 거울처럼 맞물려, 서로가 서로의 트라우마를 무심코 자극하는 구조. 치유가 곧 갈등 해소가 된다.',
        tags: ['트라우마', '상처', '방어기제', '백스토리'],
      },
      {
        name: '비밀·정체의 폭로', alias: 'Secret Reveal',
        def: '숨겨온 신분·과거·목적이 드러나며 신뢰가 무너지는 폭로 장치. 블랙 모먼트의 단골 방아쇠.',
        use: '비밀을 독자에게 미리 알려 "언제 들킬까" 서스펜스를 만들거나, 독자도 모르게 숨겨 폭로의 충격을 키운다(두 방식의 효과가 다름).',
        ex: '그를 사랑하게 된 후에야, 그가 처음부터 자신을 이용할 목적으로 접근했음을 알게 되는 순간.',
        twist: '폭로된 비밀이 사실 "그녀를 지키기 위한" 것이었음을 한 박자 늦게 밝혀, 분노를 안도로 뒤집는다.',
        tags: ['비밀', '폭로', '정체', '배신'],
      },
      {
        name: '외부 압력·반대자', alias: 'External Opposition',
        def: '가문·사회·정적·라이벌 등 둘 사이를 갈라놓으려는 외부 힘. 관계를 시험하는 종속 변수.',
        use: '외부 사건은 "이것이 둘 사이를 어떻게 바꾸는가"로 항상 관계에 종속시킨다. 압력이 강할수록 둘의 선택(함께/포기)의 무게가 커진다.',
        ex: '두 사람의 결합을 가문의 이익과 맞바꾸려는 부모, 혼사를 깨려는 정적의 음모.',
        twist: '반대자에게 설득력 있는 명분을 주어 "악당"이 아니게 한다 — 둘의 사랑이 정말 옳은지 독자도 잠시 의심하게 만든다.',
        tags: ['외부압력', '반대', '가문', '음모'],
      },
      {
        name: '희생·이별의 결단', alias: 'Noble Sacrifice',
        def: '상대를 위해 스스로 물러나거나 떠나는 "고결한 희생". 애절함의 정점이자 블랙 모먼트의 변주.',
        use: '"널 위해서"라는 일방적 희생은 위험하다 — 상대의 선택권을 빼앗는 폭력이 될 수 있음을 인물이 의식하게 한다. 희생의 철회/거부가 곧 화해의 문이 되도록 설계.',
        ex: '신분 격차로 그의 앞길을 막을까 두려워 먼저 등을 돌리는 여주, 그러나 그것이 더 큰 상처가 된다.',
        twist: '희생을 "받는 쪽"이 그것을 거부하고 따라와 "네 멋대로 날 위한다고 결정하지 마"라고 받아치는 상호성의 회복.',
        tags: ['희생', '이별', '결단', '애절'],
      },
    ],
  },
  {
    key: 'resolve', label: '고백·해소·클라이맥스', icon: '💍',
    desc: '관계의 최종 결정에 이르는 비트들. 로맨스의 클라이맥스는 외부 사건이 아니라 "서로를 선택함"이다.',
    items: [
      {
        name: '대형 고백·증명 행위', alias: 'Grand Gesture',
        def: '절망 이후, 한쪽이 자존심·지위·목숨을 걸고 사랑을 증명하는 결정적 행동. 블랙 모먼트의 해소제.',
        use: '증명의 크기는 그 인물이 "가장 내려놓기 힘든 것"을 거는 데서 나온다(권력자에겐 권력, 도망자에겐 멈춤). 공개성·돌이킬 수 없음이 무게를 더한다.',
        ex: '현대물의 공항 추격·만인 앞 고백, 로판의 황제가 왕위를 걸고 그녀를 지키는 선언.',
        twist: '대형 고백을 받는 쪽이 곧바로 받아주지 않게 한다(증명만으로는 부족, 변화의 지속을 요구). 또는 그랜드 제스처를 작은 진심의 반복으로 대체해 "조용한 증명"으로 비튼다.',
        tags: ['그랜드제스처', '고백', '증명', '공개고백'],
      },
      {
        name: '고백의 다단계 구조', alias: 'Confession & Reciprocation',
        def: '고백은 단발 이벤트가 아니라 "고백 → 회피/거절 → 재고백 → 응답"의 다단계로 쓰는 것이 정석.',
        use: '첫 고백을 절정에 두지 말고 중반에 "실패하는 고백"으로 한 번 소비한다. 거절의 이유를 분명히 해, 그 이유가 해소될 때 재고백이 성립하게 한다.',
        ex: '오만과 편견 다아시의 첫 청혼은 처참히 거절당하고, 변화와 해명을 거친 두 번째에야 받아들여진다.',
        twist: '고백의 순서를 뒤집어 평소 약자였던 쪽이 먼저, 더 당당하게 고백하게 한다. 또는 응답이 말이 아닌 행동(따라옴·곁에 머묾)으로 오게 한다.',
        tags: ['고백', '거절', '재고백', '응답'],
      },
      {
        name: '첫 사랑 고백의 언어화', alias: 'First "I Love You"',
        def: '미뤄온 "사랑한다"는 말이 마침내 입 밖으로 나오는, 진심의 언어화 순간. 관계의 결정적 분수령.',
        use: '이 한 마디를 위해 앞에서 충분히 "말하지 못함"을 쌓는다. 말하는 타이밍(위기 직전·이별 직전·일상의 한복판)에 따라 의미가 완전히 달라진다.',
        ex: '죽음을 각오한 전장의 새벽, 평생 입에 담지 못한 말을 처음 내뱉는 순간.',
        twist: '먼저 말한 쪽이 "응답을 강요하지 않는다"고 덧붙여 부담을 덜어주는 성숙한 고백. 또는 말로 하지 못하고 글·노래·행동으로 대신 전한 뒤 나중에야 입으로 확인.',
        tags: ['사랑한다', '고백', '언어화', '진심'],
      },
      {
        name: '상호성의 회복', alias: 'Mutual Reciprocity',
        def: '한쪽의 일방적 희생이 아니라, 둘 다 무언가를 내려놓고 서로에게 다가가는 균형. 만족스러운 결합의 조건.',
        use: '클라이맥스에서 "둘 다 변했다/내려놓았다"를 보여준다. 한 사람만 사과·희생하면 권력 불균형이 남아 카타르시스가 반감됨을 유의.',
        ex: '오만한 남주는 오만을, 편견 가진 여주는 편견을 각자 내려놓아야 비로소 마주 선다.',
        twist: '상호성이 "동시"가 아니라 "교대"로 이뤄지게 한다 — 한 사람이 먼저 한 발, 그것을 본 다른 사람이 답으로 한 발.',
        tags: ['상호성', '균형', '화해', '내려놓기'],
      },
      {
        name: '오해의 해소·진실 수용', alias: 'Resolution of Misunderstanding',
        def: '블랙 모먼트를 만든 오해·비밀이 풀리고, 상대의 진실을 받아들이며 장벽이 제거되는 절정의 해소.',
        use: '해소는 우연이 아니라 인물의 능동적 행동(찾아감·묻는 용기)으로 일어나야 한다. 진실을 "아는 것"과 "받아들이는 것"을 분리해, 수용에 한 번 더 결단을 요구한다.',
        ex: '편지·증인·고백을 통해 누명이 벗겨지고, 그를 오해했던 마음이 무너지며 화해로 향하는 장면.',
        twist: '진실이 밝혀져도 곧장 용서하지 않게 한다 — "이해하지만 시간이 필요해"라는 현실적 단계를 둔다.',
        tags: ['오해해소', '진실', '화해', '수용'],
      },
      {
        name: '관계의 최종 선택', alias: 'The Climactic Choice',
        def: '로맨스의 진짜 클라이맥스. 악당을 처치해도 두 사람이 서로를 선택하지 않으면 절정이 아니다.',
        use: '외부 사건의 해결과 "서로를 선택하는 결단"을 분리해, 후자에 절정의 무게를 싣는다. 선택에는 반드시 포기하는 것(다른 길·안전·자존심)이 따라야 무게가 산다.',
        ex: '권력도 복수도 다 이룬 뒤, 결국 "그래도 네 곁이어야 한다"고 모든 것을 두고 그에게 돌아가는 선택.',
        twist: '"선택"을 두 사람이 동시에, 서로 모르게 같은 결정을 내려 한 지점에서 마주치게 한다(운명적 교차).',
        tags: ['최종선택', '클라이맥스', '결단', '결합'],
      },
    ],
  },
  {
    key: 'structure', label: '구조·비트 시트', icon: '🧭',
    desc: '장편 로맨스의 표준 진행 단계. 감정 곡선이 사건 곡선보다 우선한다.',
    items: [
      {
        name: '도입·일상(결핍 제시)', alias: 'Setup',
        def: '주인공의 결핍·상처·세계관과 "사랑에 대한 방어기제"를 확립하는 시작 단계.',
        use: '주인공이 무엇을 두려워해 사랑을 막고 있는지 행동으로 보여준다. 이 방어기제가 곧 후반에 무너뜨려야 할 벽이 된다.',
        ex: '연애를 믿지 않게 된 사연, 일에만 몰두하는 회피, 신분 때문에 마음을 닫은 태도 등.',
        twist: '"완벽해 보이는 일상"의 균열을 미리 한 점 심어, 도입부터 불안의 씨앗을 깔아 둔다.',
        tags: ['도입', '결핍', '방어기제', 'setup'],
      },
      {
        name: '운명적 첫 만남', alias: 'Meet-Cute',
        def: '운명적·우스꽝스럽·적대적인 강렬한 첫 조우. 첫인상(좋든 나쁘든)이 곧 연독률.',
        use: '첫 만남 안에 "이 작품의 핵심 트로프"를 압축해 노출한다(적대→연인이면 적대를, 계약물이면 거래를). 첫 10화 안에 케미를 명확히 보여준다.',
        ex: '빗속에서 택시를 두고 다투다 알고 보니 같은 회사 상사-부하, 같은 자리에 부임한 정적.',
        twist: '첫 만남을 "사실 두 번째 만남"으로 만든다 — 한쪽은 기억하고 한쪽은 잊은 과거의 인연(회귀물과 결합 시 강력).',
        tags: ['첫만남', 'meet cute', '운명', '첫인상'],
      },
      {
        name: '거부 단계', alias: 'No Way',
        def: '"절대 안 될 사이"라는 명분과 끌림이 충돌하며 밀당이 시작되는 단계.',
        use: '"안 되는 이유"를 구체적이고 정당하게 세운다(약혼자 있음·원수 가문·계약 금지조항). 끌림이 그 명분을 조금씩 갉아먹는 과정을 보여준다.',
        ex: '"저 사람만은 안 돼"라며 스스로 선을 긋지만, 자꾸 신경 쓰이는 자신을 발견한다.',
        twist: '"안 되는 이유"가 사실 거짓 정보였음을 후반에 밝혀, 그동안의 거부가 무의미했다는 안타까움을 만든다.',
        tags: ['거부', 'no way', '명분', '밀당'],
      },
      {
        name: '점화·행복의 정점', alias: 'Falling / Fun and Games',
        def: '함께하는 시간이 누적되고 케미가 폭발하며 첫 키스에 이르는, 관계의 첫 절정.',
        use: '독자가 가장 즐거워하는 "설렘 구간"이므로 충분히 길게 누린다. 단, 정점 직후 반드시 작은 좌절을 심어 다음 하강을 예고한다.',
        ex: '둘만의 여행·축제·임무 성공 — 가장 가까워진 순간, 행복의 절정에서 첫 키스.',
        twist: '행복의 정점 한복판에 "이 행복을 깰 정보"를 독자에게만 흘려, 설렘 위에 불안을 겹친다(드라마틱 아이러니).',
        tags: ['점화', 'fun and games', '첫키스', '행복'],
      },
      {
        name: '중간점 전환', alias: 'Midpoint Shift',
        def: '관계가 한 단계 깊어지거나(진심 자각·첫 동침) 결정적 정보가 폭로되며 판이 바뀌는 분기점.',
        use: '전반부의 "끌림"을 후반부의 "관계"로 격상시키는 사건을 배치한다. 이 지점 이후 인물의 목표·태도가 달라져야 한다.',
        ex: '서로의 진심을 처음 확인하거나, 반대로 숨겨온 비밀이 드러나며 신뢰가 흔들리기 시작하는 중반.',
        twist: '중간점에서 두 사람이 결합해 버린 뒤, "결합 이후의 관계 유지"를 후반 갈등으로 삼는다(고백이 끝이 아닌 시작).',
        tags: ['중간점', 'midpoint', '전환', '진심자각'],
      },
      {
        name: '영혼의 어두운 밤', alias: 'Dark Night of the Soul',
        def: '블랙 모먼트 직후, 떨어진 채 각자 진심을 깨닫는 성찰 구간. 재결합 직전의 침잠.',
        use: '두 사람을 물리적으로 떼어 놓고 각자의 내면을 들여다본다. 이 고독 속에서 "정말 원하는 것"을 깨닫고, 그것이 그랜드 제스처의 동기가 된다.',
        ex: '헤어진 뒤 텅 빈 일상에서, 사소한 것마다 그 사람이 떠올라 비로소 마음의 크기를 깨닫는 시간.',
        twist: '어두운 밤을 두 사람의 교차 편집으로 보여 "같은 시각 같은 후회를 하고 있음"을 독자만 알게 한다.',
        tags: ['어두운밤', 'dark night', '성찰', '재결합'],
      },
      {
        name: '결말·후일담', alias: 'HEA & Epilogue',
        def: '결혼·미래 약속으로 맺는 HEA(Happily Ever After), 그리고 보너스 설렘을 주는 후일담(외전).',
        use: '결합 자체보다 "그 후의 일상적 행복"을 짧게 보여 약속을 체감시킨다. 웹소설은 외전(남주 시점·미래편)으로 추가 보상을 주는 것이 관습.',
        ex: '결혼식·평범한 아침의 다정함, 그리고 "남주 시점으로 다시 본 그때 그 순간" 특별편.',
        twist: 'HEA 대신 HFN(Happy For Now)으로 여백을 남겨 시리즈/속편의 여지를 둔다(단, "헤어짐"은 로맨스 계약 위반이니 금지).',
        tags: ['HEA', 'HFN', '결말', '후일담', '외전'],
      },
    ],
  },
  {
    key: 'pacing', label: '페이싱·연독 원칙', icon: '⏱️',
    desc: '감정 롤러코스터를 설계하는 박자 규칙. 특히 웹소설 회차 단위 보상.',
    items: [
      {
        name: '감정 곡선 우선의 원칙', alias: 'Emotion Over Plot',
        def: '액션이 격해도 두 사람의 정서적 거리 변화가 매 장면에 새겨져야 한다는 로맨스 페이싱의 제1원칙.',
        use: '모든 외부 사건을 "이 사건이 둘 사이를 얼마나 가깝/멀게 했는가"로 결산한다. 정서적 변화 없는 장면은 잘라낸다.',
        ex: '함께 위기를 겪는 추격전이라도, 끝에는 반드시 "그 와중에 본 그의 얼굴"이 남아야 한다.',
        twist: '사건 곡선과 감정 곡선을 의도적으로 엇갈리게 한다 — 사건은 승리인데 관계는 멀어지는 "씁쓸한 승리"로 텐션 유지.',
        tags: ['감정곡선', '페이싱', '우선순위', '정서'],
      },
      {
        name: '상승-하강의 진자', alias: 'Up-Down Pendulum',
        def: '설렘(상승) 뒤엔 반드시 작은 좌절(하강)을 둬 단조로움을 막는 정서 리듬. 무한 행복도, 무한 고통도 긴장을 죽인다.',
        use: '"설렘 → 좌절 → 더 큰 설렘"의 파동을 회차 단위로 반복한다. 좌절의 크기를 서서히 키워 클라이맥스의 블랙 모먼트로 수렴시킨다.',
        ex: '고백 직전까지 갔다가 오해로 멀어지고, 화해하며 한 발 더 가까워지는 왕복의 반복.',
        twist: '독자가 "이제 행복하겠지" 방심하는 순간 가장 큰 하강을 친다(기대 배신의 충격 활용). 단, 남발하면 피로해지니 빈도 조절.',
        tags: ['진자', '상승하강', '리듬', '좌절'],
      },
      {
        name: '회차 단위 보상(클리프행어)', alias: 'Chapter Hook',
        def: '매 회차/매 5,000자마다 작은 설렘·반전·궁금증을 배치해 연독률을 유지하는 웹소설 핵심 페이싱.',
        use: '회차 끝을 "다음이 궁금한 지점"에서 끊는다(고백 직전, 등장 직전, 의미심장한 한 마디). 매 회 최소 1개의 설렘 포인트를 의무화한다.',
        ex: '회차 마지막 줄: "—그가 한 발 다가서며 그녀의 손목을 잡았다." (다음 화로)',
        twist: '클리프행어를 "예상과 다른 방향"으로 연결해 낚시를 배신한다(긴장한 줄 알았는데 다정함, 혹은 그 반대).',
        tags: ['클리프행어', '회차', '연독', '훅', '웹소설'],
      },
      {
        name: '초반 트로프 명시', alias: 'Front-loaded Trope',
        def: '초반 1~10화 안에 두 주인공의 강렬한 케미와 "이 작품의 핵심 트로프"를 명확히 노출하는 원칙(첫인상 = 연독률).',
        use: '소개·표지·초반에 약속한 트로프(계약결혼·후회물·집착남주 등)를 본문이 빠르게 이행한다. 약속과 본문이 어긋나면 강한 반발을 부른다.',
        ex: '"계약결혼물"이라면 1~3화 안에 계약을 성사시키고, 두 사람을 한 공간에 묶는다.',
        twist: '메인 트로프를 초반에 충실히 보여준 뒤, 중반에 "숨은 두 번째 트로프"를 풀어 신선함을 더한다(예: 계약결혼+사실은 회귀자).',
        tags: ['트로프', '초반', '연독', '약속', '케미'],
      },
      {
        name: '관능도(히트 레벨) 합의', alias: 'Heat Level Contract',
        def: 'clean/sweet(키스까지) ↔ steamy/explicit(노골적)까지, 사전에 태그·소개로 고지되는 관능 수위의 약속.',
        use: '본문이 표지·소개·플랫폼 태그가 약속한 수위와 일치하게 한다. 수위를 올릴 땐 점진적 빌드업(접촉 고조)으로 자연스럽게 이행한다.',
        ex: '"19금" 태그면 정사 묘사를 기대받고, "전체 이용가 설렘물"이면 키스 이상은 자제한다.',
        twist: '낮은 수위를 유지하되 "긴장의 밀도"로 체감 관능을 높인다 — 노골적 묘사 없이 손끝의 떨림만으로 더 야하게.',
        tags: ['관능도', '히트레벨', '수위', '약속', '클린'],
      },
      {
        name: '진척의 가시성', alias: 'Visible Progress',
        def: '두 사람의 거리가 좁혀지는 단계(첫 만남→인식→끌림→갈등→고백→위기→결합)가 독자에게 체감되어야 한다는 원칙. 정체되면 "고구마".',
        use: '관계의 "처음들"을 마일스톤으로 명시한다(첫 호칭 변화·첫 반말·첫 손잡기). 정체 구간이 길어지면 작은 진척이라도 끼워 넣는다.',
        ex: '"○○ 씨"에서 이름으로, 존댓말에서 반말로 — 호칭 하나의 변화가 진척의 신호가 된다.',
        twist: '진척을 일부러 "후퇴"시켜 긴장을 만든다(반말하다 다시 존댓말로 거리두기) — 단, 반드시 더 큰 진척으로 회수해 고구마를 면한다.',
        tags: ['진척', '가시성', '단계', '고구마', '마일스톤'],
      },
    ],
  },
]

// ── 한국어 조사 헬퍼: 앞 글자 받침 유무로 실제 조사 하나를 골라 출력(괄호 이중표기 금지) ──
const hasJong = (word: string): boolean => {
  const ch = (word || '').replace(/\s+$/, '').slice(-1)
  if (!ch) return false
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 간주
  return (code - 0xac00) % 28 !== 0
}
// 받침 있으면 첫 번째(을/은/이/으로/과), 없으면 두 번째(를/는/가/로/와)
const J = {
  eul: (w: string) => w + (hasJong(w) ? '을' : '를'),
  eun: (w: string) => w + (hasJong(w) ? '은' : '는'),
  i: (w: string) => w + (hasJong(w) ? '이' : '가'),
  // 'ㄹ' 받침은 '로'를 쓰는 한국어 규칙까지 반영
  ro: (w: string) => {
    const ch = (w || '').replace(/\s+$/, '').slice(-1)
    const code = ch.charCodeAt(0)
    const jong = (code >= 0xac00 && code <= 0xd7a3) ? (code - 0xac00) % 28 : 0
    return w + (jong === 0 || jong === 8 ? '로' : '으로')
  },
  wa: (w: string) => w + (hasJong(w) ? '과' : '와'),
}

// ── 유틸 ──
const LS = 'sry:tool:romance-devices:'
const ALL_KEY = '__all__'
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface FlatItem { cat: CatDef; item: Device }
const flatAll = (): FlatItem[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// ── 장치 세트 조합 발상기: 작품 하나의 '장치 세트 사양'을 만드는 서로 독립적인 축들 ──
// 7개 카테고리에서 장치를 하나씩 뽑고(서사 장치 슬롯), 거기에 작품의 독립 변수 축
// (관능 수위·점화 속도·서술 시점·배경 세계관·결말 형태·연재 형태)을 곱해 사양을 구성한다.
// 각 축은 서로 의미가 충돌하지 않는(독립적인) 실재하는 로맨스 변수만 담는다. 고유 항목만.
interface Axis { key: string; label: string; icon: string; opts: string[] }
const AXES: Axis[] = [
  {
    key: 'heat', label: '관능 수위', icon: '🔥',
    opts: [
      '전체 이용가 설렘물', '키스까지의 스위트물', '은근한 긴장의 센슈얼물',
      '진하게 달아오르는 스파이시물', '노골적 묘사의 스티미물', '완급을 오가는 수위 혼합물',
    ],
  },
  {
    key: 'burn', label: '점화 속도', icon: '⚡',
    opts: ['첫눈에 반하는 인스타러브', '빠르게 타오르는 패스트번', '중간 속도의 미디엄번', '천천히 달구는 슬로우번'],
  },
  {
    key: 'pov', label: '서술 시점', icon: '👁️',
    opts: ['여주 1인칭 시점', '남주 1인칭 시점', '남녀 교차 1인칭 시점', '여주 밀착 3인칭 시점', '전지적 3인칭 시점'],
  },
  {
    key: 'setting', label: '배경 세계관', icon: '🗺️',
    opts: [
      '한국 현대 도시', '재벌가 현대물', '서양풍 궁정 로판', '동양풍 사극', '대학 캠퍼스',
      '직장 오피스물', '회귀·빙의 책 속 세계', '요괴·신화 판타지', '근미래 SF', '전원 소도시 힐링물',
    ],
  },
  {
    key: 'ending', label: '결말 형태', icon: '🎀',
    opts: ['완전한 해피엔딩', '당분간 행복한 열린 결말', '잔잔한 여운을 남기는 결말', '후일담·외전으로 이어지는 결말'],
  },
  {
    key: 'length', label: '연재 형태', icon: '📚',
    opts: ['단편 에피소드', '권 단위 중편', '클리프행어 중심 장편 연재', '다부작 대하 시리즈'],
  },
]

// 조합수 표시용: 한 작품의 '장치 세트 사양' 관점의 조합수.
// 7개 카테고리(서사 장치 슬롯)에서 각 1개 + 6개 독립 축에서 각 1개를 뽑는다고 보면:
const COMBO_DEVICES = CATS.reduce((n, c) => n * Math.max(1, c.items.length), 1)
const COMBO_AXES = AXES.reduce((n, a) => n * Math.max(1, a.opts.length), 1)
const COMBO = COMBO_DEVICES * COMBO_AXES
// 장치 슬롯(긴장7×결박6×로판6×갈등6×해소6×구조7×페이싱6 = 381,024)
//  × 독립 축(수위6×속도4×시점5×배경10×결말4×연재4 = 19,200)
//  = 7,315,660,800 가지(약 73억). 이전(381,024)보다 50억 이상 증가.
const fmtCombo = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return String(n)
}

const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
const FIELD_LABEL: Record<keyof Pick<Device, 'def' | 'use' | 'ex' | 'twist'>, string> = {
  def: '정의', use: '사용법', ex: '예시', twist: '비틀기',
}

export default function RomanceDevices({ payload }: { payload?: ToolPayload }) {
  const genre = (payload?.genre as string) || '로맨스'

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼침: 항목 단위로 열고 닫음 (key = "catKey::name")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기(저장) — 마음에 둔 장치 모음
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<FlatItem | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // 장치 세트 사양(서사 장치 7 + 독립 축 6)을 한 번에 뽑아 보여주는 발상기
  const [setSpec, setSetSpec] = useState<{ devices: FlatItem[]; axes: Record<string, string> } | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트/복사 타이머가 남지 않도록 마지막에 상태만 정리(타이머는 setTimeout 콜백에서 가드).
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[itemKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.use.toLowerCase().includes(q) ||
        item.ex.toLowerCase().includes(q) ||
        item.twist.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 무작위로 고른 항목은 자동으로 펼침
      setOpen((o) => ({ ...o, [itemKey(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat])

  // 장치 세트 사양 뽑기: 각 카테고리에서 장치 1개 + 각 독립 축에서 옵션 1개
  const rollSet = useCallback(() => {
    const devices = CATS.map((c) => ({ cat: c, item: c.items[Math.floor(Math.random() * c.items.length)] }))
    const axes: Record<string, string> = {}
    for (const a of AXES) axes[a.key] = a.opts[Math.floor(Math.random() * a.opts.length)]
    setSetSpec({ devices, axes })
  }, [])

  // 사양을 자연스러운 한국어 문장으로(조사 헬퍼 사용 — 괄호 이중표기 없음)
  const specSentence = (spec: { devices: FlatItem[]; axes: Record<string, string> }): string => {
    const a = spec.axes
    const dNames = spec.devices.map((d) => d.item.name)
    // 배경을 무대로 / 시점 / 점화·수위 / 핵심 장치 / 연재·결말 (조사 헬퍼로 정확히)
    const line1 = `${J.eul(a.setting)} 무대로, ${J.eul(a.pov)} 택한다.`
    const line2 = `${J.ro(a.burn)} 감정을 점화하고, ${J.ro(a.heat)} 수위를 잡는다.`
    const line3 = `핵심 장치: ${dNames.join(' · ')}.`
    const line4 = `${J.ro(a.length)} 풀어 ${J.ro(a.ending)} 맺는다.`
    return [line1, line2, line3, line4].join('\n')
  }

  const toggleFav = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }
  const toggleOpen = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    } else fallbackCopy(text, done)
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { /* graceful */ }
  }

  const plainOf = (s: FlatItem) =>
    `${s.cat.icon} ${s.item.name}${s.item.alias ? ` (${s.item.alias})` : ''}\n` +
    `· 정의: ${s.item.def}\n· 사용법: ${s.item.use}\n· 예시: ${s.item.ex}\n· 비틀기: ${s.item.twist}`

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // 연계: 현재(무작위) 장치를 프로젝트 자료 〈로맨스 장치〉 폴더에 메모로 추가
  const addToProjectDevice = (s: FlatItem) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}</b>${s.item.alias ? ` <i>(${escapeHtml(s.item.alias)})</i>` : ''}</p>`,
      `<p><b>정의</b> — ${escapeHtml(s.item.def)}</p>`,
      `<p><b>사용법</b> — ${escapeHtml(s.item.use)}</p>`,
      `<p><b>예시</b> — ${escapeHtml(s.item.ex)}</p>`,
      `<p><b>비틀기</b> — ${escapeHtml(s.item.twist)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '로맨스 장치',
      title: `${s.item.name} (${s.cat.label})`,
      bodyHtml,
      meta: { 장르: genre, 분류: s.cat.label },
    })
    if (id) showToast(`프로젝트 자료 〈로맨스 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.`)
  }

  // 연계: 장치를 스니펫 라이브러리에 저장(다른 도구에서 재활용)
  const saveSnippet = (s: FlatItem) => {
    addToLibrary('snippets', {
      text: plainOf(s),
      source: `로맨스 서사장치 사전 · ${s.cat.label}`,
      tags: ['로맨스', s.cat.label, ...(s.item.tags || [])],
    })
    showToast(`스니펫으로 저장했습니다: ‘${s.item.name}’`)
  }

  // 스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const fieldRow = (label: string, value: string) => (
    <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5 }}>
      <span style={{ color: 'var(--accent-2)', fontWeight: 700, marginRight: 6 }}>{label}</span>
      <span>{value}</span>
    </div>
  )

  const renderDetail = (s: FlatItem) => (
    <>
      {fieldRow('정의', s.item.def)}
      {fieldRow('사용법', s.item.use)}
      {fieldRow('예시', s.item.ex)}
      {fieldRow('비틀기', s.item.twist)}
      {!!(s.item.tags && s.item.tags.length) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
          {s.item.tags.map((t) => (
            <span key={t} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>#{t}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(plainOf(s), 'copy:' + itemKey(s.cat.key, s.item.name))}>
          {copiedKey === 'copy:' + itemKey(s.cat.key, s.item.name) ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
        </button>
        <button className="minibtn" onClick={() => toggleFav(s.cat.key, s.item.name)}
          style={{ borderColor: favs[itemKey(s.cat.key, s.item.name)] ? 'var(--accent)' : 'var(--border)' }}>
          {favs[itemKey(s.cat.key, s.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
      </div>
      {/* 연계 버튼 묶음 */}
      <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={() => addToProjectDevice(s)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈로맨스 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => saveSnippet(s)} title="장치 설명을 공유 스니펫으로 저장"><Emoji e="💾" /> 스니펫 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre })} title="반전 카드 도구 열기"><Emoji e="🃏" /> 플롯 반전덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre })} title="플롯 피라미드 열기"><Emoji e="🔺" /> 플롯 피라미드</button>
        <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre })} title="감정 곡선 도구 열기"><Emoji e="📈" /> 감정 곡선</button>
      </div>
    </>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>{genre}</b> 고유의 서사 장치·전개·페이싱·클라이맥스 관습을 <b>{TOTAL}개</b> 모았습니다(정의·사용법·예시·비틀기).
        카테고리별 장치 7개에 작품의 독립 축 6개(관능 수위·점화 속도·시점·배경·결말·연재)를 곱하면
        한 작품의 ‘장치 세트 사양’이 <b>{fmtCombo(COMBO)} 가지</b>({COMBO.toLocaleString()}) 가능합니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장치·관습 검색 (예: 밀당, 블랙모먼트, 계약, 후회, 클리프행어)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
        <button className="minibtn" onClick={rollSet} style={{ flex: '0 0 auto', borderColor: 'var(--accent)' }} title="장치 7개 + 독립 축 6개를 한 번에 뽑아 한 작품의 장치 세트 사양을 제안합니다"><Emoji e="🧩" /> 장치 세트 조합</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{random.item.alias}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
          </div>
          {renderDetail(random)}
        </div>
      )}

      {/* 장치 세트 사양 결과 */}
      {setSpec && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🧩" /> 장치 세트 사양</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSet} title="다시 뽑기"><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => copy(specSentence(setSpec) + '\n' + AXES.map((a) => `· ${a.label}: ${setSpec.axes[a.key]}`).join('\n'), 'copy:setspec')}>
              {copiedKey === 'copy:setspec' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => setSetSpec(null)} title="닫기">✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 8, whiteSpace: 'pre-wrap' }}>{specSentence(setSpec)}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
            {AXES.map((a) => (
              <span key={a.key} style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }}>
                <Emoji e={a.icon} /> {a.label}: <b style={{ color: 'var(--text)' }}>{setSpec.axes[a.key]}</b>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            {setSpec.devices.map((d) => (
              <span key={d.cat.key} style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }}>
                <Emoji e={d.cat.icon} /> {d.item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = itemKey(c.key, item.name)
            const isOpen = !!open[k] || !!query.trim() // 검색 중엔 모두 펼침
            const isFav = !!favs[k]
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onClick={() => toggleOpen(c.key, item.name)} role="button" aria-expanded={isOpen}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.alias}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, width: 14, textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {!isOpen && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.def}</div>}
                {isOpen && renderDetail({ cat: c, item })}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 공식이 아니라 출발점입니다. ‘비틀기’를 적극 활용해 클리셰를 피하고, 감정 곡선이 사건보다 앞서게 배치하세요.</div>
    </div>
  )
}
