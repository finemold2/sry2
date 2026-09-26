// 로맨스판타지(로판) 트로프·관습 체크리스트 — 로판 장르의 독자 기대(장르 계약)·필수 구조 비트·하위유형별 핵심 트로프(회빙환·악역영애·집착·육아 등)·
//   흔한 함정·클리셰(+로판 특화 "비틀기" 한 줄)를 카테고리별 체크리스트로 점검한다. 클리셰는 비틀기 제안을 함께 제공.
//   체크/펼침/검색/사용자 항목 추가·수정·삭제 + 카테고리별·전체 진행률. 무작위 "오늘의 로판 트로프 한 줌"으로 영감 제공.
//   조합수: 켜진 트로프 항목들로 만들 수 있는 트로프 조합(부분집합) 수 = 2^N - 1 을 표시 → 30개만 켜도 10억 이상, 사실상 무한 변주.
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬 자작 데이터(로맨스판타지 특화). localStorage 'sry:tool:romfan-tropes'.
// 연계(linkbus): 체크한 트로프 셋을 프로젝트 '기획' 폴더 문서로 추가, 글감을 스니펫 라이브러리에 저장, 관련 도구 열기.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = { id: 'romfan-tropes', name: '로판 트로프·관습 체크', icon: '👑', group: '구상·정리', genre: '로맨스판타지', intro: '로판 독자 기대·필수 요소·회빙환/악역영애 트로프·흔한 함정(클리셰 비틀기)을 체크리스트로 점검하세요', w: 680, h: 660 }

const LS_KEY = 'sry:tool:romfan-tropes'

// ── 항목 종류 ──
// kind:'expect'  독자 기대/장르 계약 — 어기면 이탈·별점 테러
// kind:'beat'    필수 구조 비트 — 로판 매크로 곡선의 골격
// kind:'trope'   하위유형별 핵심 트로프 — 골라 조합하는 자산(조합수 카운트 대상)
// kind:'trap'    흔한 함정/클리셰 — 'twist'(비틀기)와 함께 점검
type ItemKind = 'expect' | 'beat' | 'trope' | 'trap'
interface BaseItem { text: string; tip?: string; twist?: string }
interface Cat {
  id: string
  name: string
  icon: string
  desc: string
  kind: ItemKind
  items: BaseItem[]
}

// ───────────────────── 로맨스판타지 특화 자작 데이터 ─────────────────────
const CATS: Cat[] = [
  // 1) 장르 계약 — 로판 독자가 사전 합의한 약속
  {
    id: 'contract', name: '장르 계약 (로판 독자와의 약속)', icon: '🤝', kind: 'expect',
    desc: '어기면 "로판 아님"으로 분류되고 별점이 무너지는 핵심 약속들',
    items: [
      { text: '여주 중심 시점 — 1인칭 또는 밀착 3인칭으로 감정 동일시를 보장한다', tip: '독자는 여주에 빙의해 "내가 사랑받고 인정받는" 대리만족을 원한다. 시점이 멀어지면 몰입이 깨진다.' },
      { text: '해피엔딩이 기본값 — 새드/비극은 강한 사전 태그 없이는 배신으로 간주', tip: '경고 없는 비극은 "사기"로 받아들여진다. 다크/배드엔딩은 반드시 사전 고지.' },
      { text: '사이다 보장 — 고구마(모욕·억울함)는 반드시 통쾌한 역전으로 청산한다', tip: '고구마 대비 사이다 비율이 만족도를 좌우한다. 억울함은 짧게, 청산은 분명히.' },
      { text: '남주의 "온리 유" — 강하고 유능하되 오직 여주에게만 약해지고 헌신한다', tip: '넘버원 남주가 다른 여성에게 흔들리거나 과거 여자 그림자가 짙으면 강한 금기 위반.' },
      { text: '여주의 주체성 — 구원 대상이 아니라 스스로 문제를 해결하는 능력을 가진다', tip: '마법·정치·경영·지식·전생 정보 등 "무기"가 있어야 한다. 민폐 여주는 비판 1순위.' },
      { text: '인과적 보상 정산 — 노력·고생에 비례한 인정·신분 상승·사랑 쟁취·악역 응징', tip: '독자는 "정당한 보상"을 기대한다. 고생만 시키고 보상이 없으면 이탈.' },
      { text: '첫 화의 강한 후킹 — 회귀/빙의 선언·처형·이혼·배신을 1~3화 안에 던진다', tip: '"왜 이 상황인지"를 초반에 제시. 잔잔한 일상으로 시작하면 연독률이 죽는다.' },
      { text: '설렘 포인트의 규칙적 분배 — 스킨십·달달 대사·남주 독백을 일정 간격으로', tip: '너무 늦은 첫 설렘은 이탈 요인. 심쿵 빈도를 페이싱으로 관리한다.' },
      { text: '(웹소설) 초반 25화 안에 여주 능력+남주 떡밥+세계관 후킹을 다 보여준다', tip: '무료분(1~25/30화)이 곧 생존선. 유료 전환·연독률은 여기서 결정된다.' },
      { text: '(웹소설) 매 회차 끝에 절단마공(클리프행어·심쿵 한 방)을 배치한다', tip: '편당 5,000~5,500자, 매 편 끝의 떡밥·반전·심쿵이 다음 편 결제를 유도.' },
    ],
  },

  // 2) 필수 매크로 구조 비트 — 로판 전체 흐름의 골격
  {
    id: 'beats', name: '필수 구조 비트 (로판 매크로 곡선)', icon: '🎢', kind: 'beat',
    desc: '로판을 로판답게 만드는 전체 흐름의 골격. 빠진 비트가 약한 고리',
    items: [
      { text: '프롤로그 — 전생/죽음/파멸 또는 충격적 현재를 먼저 제시', tip: '"내가 죽고 나서야 그는 후회했다" 류의 비극적 결말·처형·이혼 장면으로 후킹.' },
      { text: '회귀·빙의 각성 — "다시 시작이다", 목표 선언(생존/복수/이혼/자유)', tip: '여주가 무엇을 위해 움직이는지 명확히. 목표가 곧 서사의 엔진.' },
      { text: '초반 셋업(1~30화) — 세계관·인물·여주의 무기(미래 지식·능력) 소개', tip: '남주와 첫 접촉도 여기서. 여주가 가진 비대칭 정보를 독자에게 각인.' },
      { text: '관계 형성기 — 적대·계약·무관심에서 사건 공유로 거리 좁히기', tip: '함께 위기를 겪으며 차가운 관계가 조금씩 데워진다.' },
      { text: '중반 갈등 — 라이벌 여캐·약혼 방해·가문/정치 음모·오해 누적', tip: '질투와 음모가 텐션을 끌어올린다. 고구마를 깔되 길게 끌지 말 것.' },
      { text: '위기·이별 위기 — 큰 오해·정체 발각·죽음 위협·회귀 비밀 폭로 위기', tip: '관계가 끝장난 듯한 로판의 최저점. 회귀/빙의 비밀이 터지기 직전의 긴장.' },
      { text: '클라이맥스 — 악역 응징 + 감정의 확정(고백·구원·선택)', tip: '공개 망신 역전·남주의 공개 선언 등 사이다의 정점에서 감정도 확정.' },
      { text: '운명 전복 확정 — "원작대로면 죽었어야 할 나"가 정반대 결말을 쟁취', tip: '황후·여신·행복 — 정해진 비극을 뒤집는 주제 의식의 정산.' },
      { text: '결말 — 결혼·즉위·일상 행복으로 갈등을 봉합', tip: '큰 사건이 정리되고 두 사람의 자리가 확정된다.' },
      { text: '외전(번외) — 후일담의 달달함(결혼·임신·육아·질투 코미디)', tip: '로판 필수 관습. 클라이맥스 직후 보너스 설렘으로 정서적 보상을 마무리.' },
    ],
  },

  // 3) 회빙환 + 메타 장치 — 로판 고유 엔진
  {
    id: 'rebirth', name: '회빙환 · 원작 메타 장치', icon: '⏳', kind: 'trope',
    desc: '로판을 정의하는 핵심 엔진. 정보 비대칭과 운명 저항이 텐션의 원천',
    items: [
      { text: '회귀 — 죽거나 파멸한 시점에서 과거로 돌아옴 (미래 정보 비대칭)', tip: '여주만 아는 미래로 복수·예방·선점. 처형당한 황후가 결혼 전으로 회귀하는 식.' },
      { text: '빙의 — 현대인이 소설/게임 속 인물(특히 악역·엑스트라) 몸에 들어감', tip: '"내가 읽던 소설의 악역이 되었다." 원작 지식이 무기이자 족쇄.' },
      { text: '환생 — 아예 다른 생으로 다시 태어남 (육아물과 결합 빈번)', tip: '전생 기억을 가진 아기/소녀. 어른들의 딸바보 구도로 이어지기 좋다.' },
      { text: '원작 강제력 / 정해진 결말 — "원작대로면 나는 죽는다"', tip: '운명을 비트는 시도와 그에 저항하는 세계. 로판 최강의 긴장 엔진.' },
      { text: '악역영애 파멸 플래그 회피 — 처형/추방 운명을 알고 평판·관계 재설계', tip: '호감도·평판·관계를 능동적으로 재설계해 정해진 파멸을 피한다.' },
      { text: '스테이터스 창·시스템 — 호감도 수치·퀘스트·상태창(게임 UI)', tip: '로판에선 "남주 호감도 게이지" 형태로 변주. "호감도가… 왜 오르는 거지?"' },
      { text: '회귀 트라우마 — 전생의 죽음·배신 기억이 현재 판단을 지배', tip: '특정 인물 불신·PTSD적 반응. 과거를 아는 여주의 차가운 거리감.' },
      { text: '원작 지식의 양날 — 아는 대로 흘러가지 않는 "어긋남"의 공포', tip: '"원작에 없던 일이 일어난다." 내 개입이 미래를 바꿔 정보가 무용해지는 긴장.' },
      { text: '신탁·예언·꿈 — 여주의 특별함을 공인하는 외부 권위', tip: '신전·예언서의 "예언 속 그 아이" 클리셰. 제도가 여주의 운명을 보증.' },
      { text: '버려진/저주받은 출신 → 숨겨진 고귀함 (혈통 반전)', tip: '천대받던 출신이 사실 황녀·신의 자손·고대 혈통. 신분 상승 카타르시스.' },
    ],
  },

  // 4) 관계 셋업 트로프 — "어떤 사이로 시작하는가"
  {
    id: 'setup', name: '관계 셋업 트로프', icon: '💍', kind: 'trope',
    desc: '두 사람을 묶는 관계의 시작 형태. 하나 이상 골라 조합하라',
    items: [
      { text: '계약 결혼 — 처음엔 계약, 나중엔 진심', tip: '조건·기한·해지 조항이 텐션 장치. "이혼하면 그만"이 점점 불가능해진다.' },
      { text: '정략결혼 → 진짜 사랑 (가문·정치적 거래)', tip: '로판 주력. 정치적 거래가 점차 진심으로 이행하는 점진 구조.' },
      { text: '이혼/재혼 — 버려진(혹은 버린) 관계의 청산과 새 사랑', tip: '『재혼 황후』식 정치적 복수와 재혼. "조용히 이혼당하고 싶을 뿐이었는데."' },
      { text: '주종·계약 연인 — 거리감에서 진심으로 이행', tip: '기사-주군, 계약 연인 등 비대칭 관계가 점차 평등한 사랑으로.' },
      { text: '적에서 연인으로 (정적·원수 가문)', tip: '정치적 적대→오해→재평가→결합. 권력 다툼의 불꽃이 끌림으로.' },
      { text: '강제 밀착 — 한 마차/한 침실/위장 부부', tip: '폭설로 갇힌 산장, 정략혼 위장 부부 등. 감정 발생을 강제하는 최강 장치.' },
      { text: '재회·옛 연인 (회귀 후 다시 만남)', tip: '"비극을 알면서 다시 그를 만난다"의 애절함. 미해결 감정과 변한 상황의 충돌.' },
      { text: '금지된 사랑 — 신분·집안·직위 격차', tip: '황녀와 평민 기사, 성녀와 마왕 등. 벽이 높을수록 결합의 카타르시스가 크다.' },
      { text: '후견인·양육 관계에서 시작 (육아 → 로맨스)', tip: '어린 여주를 보호하던 어른들이, 성장 후 다른 감정으로. 시간차 설계 유의.' },
      { text: '역하렘 / 꽃받침 — 여러 미남이 한 여주를 떠받듦', tip: '서브남주 군단. 넘버원을 분명히 하되 서브공들의 매력도 살려라.' },
    ],
  },

  // 5) 남주/여주 캐릭터 원형 (로판 특화)
  {
    id: 'archetype', name: '캐릭터 원형 (로판 남주·여주)', icon: '🎭', kind: 'trope',
    desc: '로판의 매력 자산. 원형을 고르고 "결핍·방어기제"로 입체화하라',
    items: [
      { text: '집착광공 / 집착 남주 — "내 것", "도망치지 마" 류 독점욕', tip: '로판 특화 인기 원형. 위험과 다정의 경계. 동의·상호성으로 선을 지켜라.' },
      { text: '차갑고 유능한 황제·대공 — 냉기 속 온도 변화', tip: '"차가운 줄 알았던 손끝의 온기." 오직 여주 앞에서만 무너지는 낙차가 매력.' },
      { text: '후회 남주 — 버리거나 박대한 뒤 뒤늦게 매달림 (후회물)', tip: '"내가 잘못했다"의 권력 역전 카타르시스. 단, 너무 쉬운 용서는 금물.' },
      { text: '다정·순정 남주 — 한결같은 헌신 (집착물의 반대극)', tip: '변치 않는 다정함 자체가 설렘. 묵묵히 곁을 지키는 안정형 남주.' },
      { text: '능동적 여주 — 정치·경영·마법으로 결말을 바꾸는 주체', tip: '수동적이면 "고구마". 여주의 선택이 클라이맥스를 이끌게 하라.' },
      { text: '악역영애 / 빌런 여주 — 정해진 비극을 뒤집는 능동성', tip: '"이 책 속 악녀가 되었다." 호감도·평판을 재설계해 파멸을 회피.' },
      { text: '딸바보 보호자 군단 — 어린 여주를 떠받드는 어른들 (육아물)', tip: '혀 짧은 말투("아빠… 시쪄")로 보호자 함락. 가족 만들기의 따뜻함.' },
      { text: '성녀·신물(神物) 여주 — 신성력·치유·예언의 특별함', tip: '신전·성좌가 공인하는 능력. 제도적으로 보증된 "특별한 나".' },
      { text: '겉바속촉 츤데레 — 퉁명한 겉면 / 다정한 속내', tip: '말과 행동의 불일치가 귀여움과 텐션을 동시에 만든다.' },
      { text: '전생 지식 사업가 여주 — 요리·디저트·향수·영지 경영으로 성공', tip: '최근 강세 코드. 현대 지식으로 가상 세계에서 사업·경영 신화를 쓴다.' },
    ],
  },

  // 6) 세계관·배경 트로프 — 로판의 무대
  {
    id: 'world', name: '세계관 · 배경 트로프', icon: '🏰', kind: 'trope',
    desc: '갈등을 증폭시키는 무대 장치. 작품의 결을 정한다',
    items: [
      { text: '서양 제국풍 — 황궁·사교계·무도회·영지 경영 (기본값)', tip: '가상 제국/왕국, 작위 체계(대공·공작·후작…)와 가문 정치가 갈등의 무대.' },
      { text: '동양풍 변주 — 후궁·세가·황실 암투 (후궁물·무협 결합)', tip: '귀비·소의의 암투, 무협 요소 결합. "후궁물"의 정치적 긴장.' },
      { text: '마법·신성력 시스템 — 마나·속성 마법·정령 계약·마탑/아카데미', tip: '여주의 능력 기반. 마탑주·정령왕·신관 등 권력 체계와 엮는다.' },
      { text: '신·종교·성좌 — 창세신화·신전 권력·성녀/성자 제도', tip: '여주의 "특별함"을 제도적으로 보증. 신탁·예언으로 권위 부여.' },
      { text: '계급·차별 구조 — 신분제·서출 차별·정략혼 관습 (고구마의 원천)', tip: '제도적 억압이 곧 고구마의 무대이자, 무너뜨릴 때 사이다의 무대.' },
      { text: '경제·경영 디테일 — 영지 개발·상단·디저트·향수 사업', tip: '전생 지식으로 사업 성공. 구체적 경영 묘사가 최근 인기 코드.' },
      { text: '게임/소설 메타 세계 — 상태창·호감도·엔딩 분기를 세계 법칙으로', tip: '시스템 요소를 세계의 실제 법칙으로 채택. 퀘스트·수치가 작동.' },
      { text: '공간 클리셰 — 온실·도서관·무도회장·티타임·마차·기숙 아카데미', tip: '황궁 정원, 다과회, 마차 안 단둘 — 설렘이 피어나는 정형 공간을 활용.' },
      { text: '다크 로판 — 파괴적·집착적 사랑, 어두운 분위기', tip: '『상수리나무 아래』식 톤. 관능도·동의 고지에 유의하며 어둠을 매력으로.' },
      { text: '힐링 로판 — 잔잔한 일상·치유·따뜻한 관계 회복', tip: '강한 갈등보다 정서적 안온함이 매력. 단, 무갈등은 긴장 소멸 주의.' },
    ],
  },

  // 7) 정서·텐션 장치 (밀당·심쿵)
  {
    id: 'engine', name: '정서·텐션 장치 (밀당·심쿵)', icon: '💓', kind: 'trope',
    desc: '관계의 긴장을 만들고 유지하는 장치들. 골라 조합하라',
    items: [
      { text: '슬로우 번 — 닿을 듯 닿지 않는 긴장의 누적', tip: '로판 장편의 주력. 빌드업으로 갈증을 키운다. 첫 설렘이 너무 늦지 않게.' },
      { text: '오해와 정보 격차 — 독자만 진실을 아는 극적 아이러니', tip: '여주는 "그가 날 싫어한다" 믿지만 실제론 사랑. 독자만 아는 진실의 카타르시스.' },
      { text: '이중 시점 — 결정적 순간 남주 독백 삽입', tip: '냉정한 외면 vs 격렬한 내면의 어조 급변. "그가 사실 얼마나 빠졌는지"를 폭로.' },
      { text: '질투 플롯 — 연적·과거 연인·약혼자로 진심 자각', tip: '질투가 "내가 이 사람을 좋아하는구나"를 깨닫게 하는 촉매.' },
      { text: '신체 반응 클로즈업 — 심장 박동·얼굴 열기·시선 회피·손 떨림', tip: '심쿵 묘사의 핵심. 감정을 직접 진술하지 않고 신체로 보여준다.' },
      { text: '체온/온도 변화 묘사 — 차가운 줄 알았던 온기', tip: '차가운 남주의 손끝이 닿는 순간의 온도 묘사. 로판 대표 심쿵 연출.' },
      { text: '공주님 안기·벽치기·손목 잡아끌기 (위기 순간 접촉)', tip: '위기에서의 가로안기·벽쿵. 신체 거리의 급접근이 감정 거리를 가시화.' },
      { text: '비밀(회귀/빙의/정체)의 점화·폭로 타이밍 설계', tip: '비밀이 Midpoint나 위기 직전에 터지게 배치. 폭로의 충격을 페이싱한다.' },
      { text: '고백의 다단계 — 고백→회피/거절→재고백→응답', tip: '단발 이벤트로 끝내지 말고 회피·재시도로 텐션을 늘인다.' },
      { text: '집착 대사 — "내 것", "도망치지 마", "너만 보여"', tip: '독점욕의 언어화. 위협이 아닌 설렘이 되도록 상호성을 깔아라.' },
    ],
  },

  // 8) 클라이맥스 관습
  {
    id: 'climax', name: '클라이맥스 · 사이다 정점', icon: '🎆', kind: 'trope',
    desc: '절정 = 사이다 + 감정의 최종 확정. 형태를 골라라',
    items: [
      { text: '공개 망신 역전 — 무도회/연회/재판에서 악역의 죄가 만인 앞에 폭로', tip: '사이다의 정점. 억울하던 여주가 공인받고 악역이 무너진다.' },
      { text: '남주의 공개 선택·선언 — 신분·정치 손해를 감수하고 "내 사람" 공표', tip: '황제가 만조백관 앞에서 황후로 지목, 약혼 파기 후 여주 선택 등.' },
      { text: '희생·구원 교차 — 목숨 걸고 서로를 구함', tip: '여주가 위기에 처하고 남주가(혹은 반대로) 목숨 걸고 구함. 감정 확정의 결정타.' },
      { text: '비밀 폭로의 해소 — 회귀/빙의/정체가 거부가 아닌 포용으로 귀결', tip: '비밀을 알게 된 남주가 등 돌리지 않고 받아들인다. 집착·헌신 강화.' },
      { text: '악역의 인과응보 — 통쾌하되 과하지 않은 자업자득식 자멸', tip: '최근 트렌드는 "과하지 않은 결말". 자기 죄로 무너지는 자멸을 선호하기도.' },
      { text: '운명 전복 확정 — 정해진 비극의 정반대 결말 쟁취', tip: '"원작대로면 죽었어야 할 나"가 황후·여신·행복을 쟁취. 주제 정산.' },
      { text: '상호성 — 둘 다 무언가를 내려놓고 서로에게 다가감', tip: '일방적 희생은 만족도가 낮다. 양쪽 모두의 결단이 필요.' },
      { text: '위기 직전 비밀 폭로 → 절정에서 복구 (최저점의 직접 반작용)', tip: '관계가 끝장난 그 지점이, 절정에서 정확히 복구되게 설계.' },
    ],
  },

  // 9) 흔한 함정/클리셰 — 로판 특화 비틀기 동반
  {
    id: 'traps', name: '흔한 함정 · 클리셰 (비틀기)', icon: '🪤', kind: 'trap',
    desc: '체크 = "내 글에 이 함정이 있나?" 점검. 각 항목엔 로판 특화 비틀기 한 줄을 제공',
    items: [
      { text: '고구마 과다 — 억울함·오해를 너무 오래 끌어 답답한가?', tip: '"고구마 too much"는 즉시 별점 테러. 답답함의 장기화가 최대 이탈 요인.', twist: '고구마는 짧게, 사이다는 확실히. 억울함 한 아크마다 작은 통쾌함으로 환기하라.' },
      { text: '수동적·민폐 여주 — 능력·결단 없이 구원만 기다리는가?', tip: '동일시 실패의 1순위. 끌려다니기만 하는 여주는 비판 대상.', twist: '여주에게 미래 지식·마법·경영·정치 중 하나의 "무기"를 쥐여주고, 매 위기를 스스로 돌파하게 하라.' },
      { text: '남주 일관성 붕괴 — 집착·헌신하다 갑자기 냉담/양다리로 흔들리는가?', tip: '"온리 유"를 표방하다 다른 여성에게 흔들리면 넘버원 남주의 신뢰가 붕괴.', twist: '남주의 모든 행동이 "여주를 향한 한 방향"으로 일관되게. 오해는 줘도 진심의 방향은 흔들지 마라.' },
      { text: '동의 없는 강압을 "강렬한 집착"으로 미화하는가?', tip: '벽치기·손목 잡기·감금의 위험선. 위협과 설렘은 다르다.', twist: '독점욕은 보여주되, 결정적 순간엔 여주의 의사를 묻고 멈출 줄 아는 면을 넣어 신뢰를 쌓아라.' },
      { text: '한 마디면 풀릴 오해(idiot plot)로 갈등을 끄는가?', tip: '독자가 "그냥 말하면 되잖아"라고 외치면 실패.', twist: '오해가 회귀 트라우마·신분 차·정치 음모 등 세계관·상처에서 필연적으로 나오게 하라.' },
      { text: '회귀/빙의 설정만 깔고 정보 비대칭을 활용하지 않는가?', tip: '"원작을 안다"면서 모르는 사람처럼 끌려다니면 설정이 죽는다.', twist: '여주가 미래 정보로 한 발 앞서 선점·예방하는 장면을 자주 보여 능동성을 증명하라.' },
      { text: '원작 지식이 만능 치트라 긴장이 없는가?', tip: '아는 대로만 흘러가면 결말이 뻔해 긴장이 사라진다.', twist: '여주의 개입으로 "원작이 어긋나는" 순간을 만들어라. 정보가 무용해지는 공포가 새 긴장.' },
      { text: '여성 인물들을 서로 적대시키게만 그리는가? (여적여 일변도)', tip: '라이벌 여캐를 평면적 들러리 악역으로만 소비하면 진부하다.', twist: '여성 조연에게 연대·우정·자기 서사를 줘라. 여주를 돕는 동성 동료가 작품에 깊이를 더한다.' },
      { text: '사이다가 무한이라 갈등이 없고 밋밋한가?', tip: '"사이다 무한"도 긴장 소멸. 무패의 여주는 응원할 거리가 없다.', twist: '관계가 끝장난 듯한 최저점(이별 위기·비밀 폭로)을 한 번은 만들어라. 떨어져 봐야 재결합이 달다.' },
      { text: '후회남이 너무 쉽게 용서받는가? (속죄 생략)', tip: '대가 없는 용서는 권력 역전 카타르시스를 깎는다.', twist: '용서까지의 거리를 충분히 두고, 가해자가 무릎 꿇고 대가를 치르는 과정을 보여줘라.' },
      { text: '신분 상승·구원만 받는 신데렐라식 여주에 머무는가?', tip: '권력이 남주에게만 있으면 평등이 깨진다.', twist: '여주도 남주를 구원하게 하라. 정치·능력으로 그를 위기에서 건져내는 상호 구원으로.' },
      { text: '첫 설렘이 너무 늦거나, 결말 뒤 외전이 없어 여운이 빈약한가?', tip: '늦은 첫 설렘은 초반 이탈, 외전 부재는 결말의 허전함.', twist: '초반에 작은 심쿵을 심고, 결말 뒤 결혼·육아·남주 시점 외전 1~2편으로 정서적 보상을 마무리하라.' },
    ],
  },
]

// 조합 카운트 대상(트로프 셋): kind === 'trope' 인 카테고리들의 켜진 항목 수
const TROPE_CATS = CATS.filter((c) => c.kind === 'trope')

// ───────────────────── 한국어 조사 헬퍼 (받침 판정) ─────────────────────
// 마지막 글자의 받침 유무로 조사를 실제로 하나 골라 붙인다. "을(를)" 같은 이중표기 노출 금지.
function lastCharHasJong(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const ch = t[t.length - 1]
  const code = ch.charCodeAt(0)
  // 한글 음절: 받침(종성) 인덱스 != 0 이면 받침 있음
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 숫자/영문은 통상 발음 받침 유무로 대략 처리(이 도구 데이터는 모두 한글이라 거의 미사용)
  if (/[0136789]$/.test(t)) return true
  if (/[lmn]$/i.test(t)) return true
  return false
}
// '로/으로' 는 받침이 없거나 'ㄹ' 받침이면 '로', 그 외 받침이면 '으로'
function lastCharIsRieulOrNone(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  const ch = t[t.length - 1]
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return jong === 0 || jong === 8 // 8 = 'ㄹ'
  }
  return true
}
const josaEul = (s: string) => s + (lastCharHasJong(s) ? '을' : '를')
const josaeun = (s: string) => s + (lastCharHasJong(s) ? '은' : '는')
const josaRo = (s: string) => s + (lastCharIsRieulOrNone(s) ? '로' : '으로')

// ───────────────────── 로그라인 조합 생성기 (곱집합) ─────────────────────
// 문장: {여주}{은/는} {배경}에서 {장치}{으로/로} {셋업} {남주}{을/를} 만나,
//        {정서}{을/를} 거쳐 {결말}.
// 각 슬롯은 문법 역할이 고정·독립적이다.
//  HEROINE  : 여주 명사구(주어)            — 은/는
//  WORLD    : 배경 장소 명사구             — 뒤에 '에서'
//  DEVICE   : 회빙환 장치 명사             — 으로/로
//  SETUP    : 관계 셋업 관형구(남주 수식)  — '-ㄴ/는' 으로 끝남
//  HERO     : 남주 명사구(목적어)          — 을/를
//  TENSION  : 정서·텐션 명사구             — 을/를
//  ENDING   : 종결문(완결 서술)            — '~다.' 로 끝남
// 모든 항목은 고유. 곱집합 = 각 풀 크기의 곱.
const HEROINE = [
  '버려진 악역영애', '처형당했다 회귀한 황후', '전생 기억을 가진 황녀', '소설 속 엑스트라로 빙의한 여자',
  '천대받던 서녀', '신성력을 숨긴 성녀', '몰락 가문의 외동딸', '정략혼에 팔려 온 영애',
  '미래를 아는 회귀자', '저주받은 핏줄의 막내딸', '평민 출신 궁정 마법사', '폐위된 황태자비',
  '딸바보들에게 둘러싸인 어린 영애', '전생에 디저트 사업가였던 영애', '예언에 적힌 운명의 아이', '버림받았다 돌아온 전처',
  '냉정한 공작가 후계자', '몰래 검을 익힌 귀족 영애', '치유 마법을 가진 견습 신관', '죽음의 운명을 거부한 여주인공',
  '고대 혈통을 물려받은 소녀', '황실에 숨어든 첩보 영애', '계약직으로 들어온 가짜 약혼녀', '환생한 망국의 공주',
  '상단을 일으킨 영지 경영자', '원작을 다 읽고 들어온 빙의자', '버려진 신전의 마지막 무녀', '추방당했다 복권된 백작 영애',
  '기억을 잃은 채 깨어난 황녀', '운명을 다시 쓰려는 회귀 영애',
]
const WORLD = [
  '서양 제국의 화려한 사교계', '눈 내리는 황궁의 겨울 정원', '마법사들의 첨탑 아카데미', '음모가 들끓는 황실 후궁',
  '신전의 차가운 대리석 회랑', '몰락해 가는 변경 영지', '귀족들의 가면무도회', '계급이 엄격한 왕국 궁정',
  '고서가 잠든 황실 도서관', '정령이 깃든 마탑', '폭설로 갇힌 외딴 산장', '상단이 모이는 항구 도시',
  '예언이 새겨진 성좌 신전', '암투가 오가는 다과회', '검술이 숭상받는 기사단', '저주가 흐르는 고성',
  '디저트 향이 퍼지는 황궁 주방', '정략이 거래되는 약혼 연회', '망국의 잔해가 남은 옛 수도', '꽃이 만발한 황후의 온실',
  '마차가 오가는 제국의 가도', '신성력이 시험되는 대성당', '귀족 자제들의 기숙 학원', '전쟁의 그림자가 드리운 국경',
  '향수 공방이 늘어선 상업 거리', '비밀 결사가 모이는 지하 살롱', '용이 잠든 설산의 신전', '황위 계승전이 벌어진 수도',
]
const DEVICE = [
  '죽음 직전의 회귀', '소설 속 인물로의 빙의', '전생의 기억', '예언서가 가리킨 신탁',
  '원작 강제력에 맞서는 저항', '호감도가 표시되는 상태창', '되살아난 회귀 트라우마', '숨겨진 고귀한 혈통',
  '아무도 모르는 미래 정보', '신이 내린 치유의 권능', '게임처럼 떠오른 퀘스트', '전생에 쌓은 사업 지식',
  '꿈에 본 파멸의 예지', '환생으로 얻은 두 번째 생', '악역의 파멸 플래그', '되짚은 원작의 결말',
  '몸에 새겨진 고대의 계약', '잊고 있던 첫 생의 약속', '성좌가 점지한 운명', '되돌아온 처형의 기억',
  '한 발 앞선 선견지명', '신전이 봉인한 비밀', '뒤바뀐 운명의 갈림길', '회귀로 손에 쥔 두 번째 기회',
  '예언이 약속한 특별함', '원작에 없던 어긋남',
]
const SETUP = [
  '계약 결혼으로 묶인', '정략혼 상대로 정해진', '한때 자신을 버렸던', '오직 자신에게만 약해지는',
  '원수 가문의 후계인', '위장 부부 행세를 하는', '회귀 전 연인이었던', '신분 차이로 닿을 수 없던',
  '주종 관계로 곁을 지키는', '뒤늦게 매달리며 후회하는', '집착으로 놓아주지 않는', '냉담한 척 속을 감춘',
  '운명처럼 다시 만난', '거래로 손을 잡은', '비밀을 함께 짊어진', '오해로 등을 돌렸던',
  '한결같이 헌신하는', '정적이자 라이벌인', '어린 시절 후견인이었던', '죽음의 위기에서 구해 준',
  '서로를 적으로 알던', '평판을 함께 재설계하는', '계약 연인으로 시작한', '권력의 정점에 선',
  '상처를 안고 살아온', '말없이 곁을 비추는', '진심을 들키지 않으려는', '운명을 함께 거스르는',
]
const HERO = [
  '집착하는 황제', '차가운 대공', '후회에 잠긴 공작', '다정한 기사단장',
  '냉혹한 황태자', '말수 적은 마탑주', '신성력을 지닌 대신관', '겉바속촉 츤데레 영주',
  '권력의 정점에 선 섭정', '순정을 숨긴 검술 천재', '복수를 품은 변경백', '온화한 가면을 쓴 책략가',
  '국경을 지키는 장군', '예언에 묶인 황자', '상냥한 얼굴의 독점욕 강한 남자', '잃을 게 없는 폭군',
  '냉기 속에 온기를 감춘 공작가 후계자', '한 여자만 바라보는 황제', '저주에 걸린 고독한 영주', '신탁을 받든 성기사',
  '비밀이 많은 정보 길드장', '몰락을 딛고 일어선 신흥 귀족', '무뚝뚝한 호위 기사', '제국 최강의 마검사',
  '왕좌를 노리는 야심가', '상처 입은 짐승 같은 대공', '예의 바른 얼굴의 위험한 남자', '운명을 거스르려는 황태자',
]
const TENSION = [
  '닿을 듯 닿지 않는 슬로우 번', '독자만 아는 정보 격차', '결정적 순간의 이중 시점', '연적이 부른 질투의 불꽃',
  '심장을 흔드는 신체 반응', '차가운 손끝의 온기', '위기 속의 공주님 안기', '점화되는 비밀의 폭로',
  '회피와 재고백의 밀당', '"내 것"이라는 집착의 언어', '오해가 쌓은 극적 아이러니', '벽치기와 손목 잡아끌기',
  '서로를 향한 엇갈린 마음', '폭로 직전의 팽팽한 긴장', '말보다 빠른 눈빛의 교환', '거리를 좁히는 사건의 공유',
  '들킬까 두려운 떨림', '한 번의 이별 위기', '되살아난 옛 감정', '숨길 수 없는 끌림',
  '질투로 깨닫는 진심', '닿을 때마다 흔들리는 마음', '비밀을 품은 거리감', '재회가 부른 미해결의 감정',
]
const ENDING = [
  '정해진 비극을 뒤집고 황후의 자리를 쟁취한다', '공개 망신 역전으로 악역을 무너뜨린다', '모두 앞에서 "내 사람"이라 선언받는다', '운명을 다시 써 행복을 손에 넣는다',
  '비밀이 포용으로 받아들여져 마침내 결합한다', '서로를 구원하며 위기를 함께 넘는다', '원작의 결말을 완전히 뒤엎는다', '악역의 인과응보를 지켜보며 자유를 얻는다',
  '신분의 벽을 넘어 사랑을 인정받는다', '회귀의 비밀을 밝히고도 사랑받는다', '두 사람 모두 내려놓고 서로에게 다가간다', '정략을 진심으로 바꾸어 평등한 부부가 된다',
  '딸바보 가족의 품에서 따뜻한 일상을 되찾는다', '사업을 일으켜 스스로의 신화를 완성한다', '예언을 넘어 자신의 운명을 직접 정한다', '버림받은 과거를 청산하고 새 사랑을 택한다',
  '최저점의 이별을 딛고 더 깊이 재결합한다', '집착마저 다정함으로 길들여 곁에 둔다', '후회하는 그를 충분한 대가 끝에 용서한다', '여신으로 추앙받으며 정점에 오른다',
  '음모를 모두 걷어내고 평온한 결말을 맞는다', '외전의 달달한 후일담으로 여운을 남긴다', '죽었어야 할 자신이 정반대의 결말을 살아낸다', '서로의 상처를 보듬으며 함께 미래를 연다',
]

const LOGLINE_SLOTS = [HEROINE, WORLD, DEVICE, SETUP, HERO, TENSION, ENDING] as const
const LOGLINE_PRODUCT = LOGLINE_SLOTS.reduce((a, s) => a * s.length, 1)

function buildLogline(pick: { hero: number; wo: number; dev: number; set: number; he: number; ten: number; end: number }): string {
  const h = HEROINE[pick.hero], w = WORLD[pick.wo], d = DEVICE[pick.dev]
  const s = SETUP[pick.set], he = HERO[pick.he], t = TENSION[pick.ten], e = ENDING[pick.end]
  return `${josaeun(h)} ${w}에서 ${josaRo(d)} ${s} ${josaEul(he)} 만나, ${josaEul(t)} 거쳐 ${e}.`
}
function randomLogline(): string {
  const r = (n: number) => Math.floor(Math.random() * n)
  return buildLogline({
    hero: r(HEROINE.length), wo: r(WORLD.length), dev: r(DEVICE.length), set: r(SETUP.length),
    he: r(HERO.length), ten: r(TENSION.length), end: r(ENDING.length),
  })
}
// 큰 수를 한국어 단위로 (조/억/만)
function koBig(n: number): string {
  if (n >= 1e16) return `약 ${(n / 1e12).toExponential(2)}조`
  const KO = [[1e12, '조'], [1e8, '억'], [1e4, '만']] as const
  for (const [unit, name] of KO) {
    if (n >= unit) { const v = n / unit; return `약 ${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}${name}` }
  }
  return n.toLocaleString()
}

interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean>
  removed: string[]               // 삭제한 기본 항목 id
  userItems: Record<string, UserItem[]> // catId -> 사용자 항목
  collapsed: Record<string, boolean>
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyState(): Persisted { return { checked: {}, removed: [], userItems: {}, collapsed: {} } }

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
      }
    }
    const removed = Array.isArray(p.removed) ? p.removed.filter((x: any) => typeof x === 'string') : []
    return { checked, removed, userItems, collapsed }
  } catch { return emptyState() }
}

const defId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface MergedItem { id: string; text: string; tip?: string; twist?: string; user: boolean }
function catItems(cat: Cat, st: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defId(cat.id, idx)
    if (st.removed.includes(id)) return
    out.push({ id, text: it.text, tip: it.tip, twist: it.twist, user: false })
  })
  ;(st.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

// 조합수(부분집합) — 켜진 트로프 항목 n개로 만들 수 있는 트로프 묶음 수 = 2^n - 1 (빈 묶음 제외)
function comboCount(onTropes: number): { display: string; raw: number } {
  if (onTropes <= 0) return { display: '0', raw: 0 }
  const raw = Math.pow(2, onTropes) - 1
  if (raw >= 1e16) return { display: `약 ${(raw / 1e12).toExponential(2)}조 이상`, raw }
  const KO = [
    [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만'],
  ] as const
  for (const [unit, name] of KO) {
    if (raw >= unit) {
      const v = raw / unit
      return { display: `약 ${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}${name}`, raw }
    }
  }
  return { display: raw.toLocaleString(), raw }
}

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export default function RomfanTropes({ payload }: { payload?: Record<string, unknown> }) {
  const genre = (payload && typeof payload.genre === 'string' && payload.genre) ? String(payload.genre) : '로맨스판타지'

  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [spark, setSpark] = useState<MergedItem[]>([])
  const [loglines, setLoglines] = useState<string[]>([])
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const say = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1900)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      say(okMsg)
    } catch { say('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (id: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } }))

  const addUserItem = (catId: string) => {
    const text = (drafts[catId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), item] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }

  const removeItem = (catId: string, id: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[id]
      if (isUser) {
        const arr = (s.userItems[catId] || []).filter((u) => u.id !== id)
        return { ...s, checked, userItems: { ...s.userItems, [catId]: arr } }
      }
      return { ...s, checked, removed: [...s.removed, id] }
    })
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      for (const catId of Object.keys(s.userItems)) {
        const arr = s.userItems[catId] || []
        if (arr.some((u) => u.id === target.id)) {
          return { ...s, userItems: { ...s.userItems, [catId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
        }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const catId = m[1]
        const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]
        const checked = { ...s.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...s, checked,
          removed: s.removed.includes(target.id) ? s.removed : [...s.removed, target.id],
          userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), repl] },
        }
      }
      return s
    })
  }

  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 오늘의 로판 트로프 한 줌: 트로프 카테고리에서 무작위 3개 ──
  const drawSpark = () => {
    const pool: MergedItem[] = []
    TROPE_CATS.forEach((c) => catItems(c, state).forEach((it) => pool.push(it)))
    if (pool.length === 0) return
    const picks: MergedItem[] = []
    const used = new Set<number>()
    const n = Math.min(3, pool.length)
    while (picks.length < n) {
      const i = Math.floor(Math.random() * pool.length)
      if (used.has(i)) continue
      used.add(i); picks.push(pool[i])
    }
    setSpark(picks)
  }

  // ── 로그라인 조합 생성기: 곱집합에서 무작위 3개 ──
  const drawLoglines = () => {
    const out: string[] = []
    const seen = new Set<string>()
    let guard = 0
    while (out.length < 3 && guard < 40) {
      guard++
      const l = randomLogline()
      if (seen.has(l)) continue
      seen.add(l); out.push(l)
    }
    setLoglines(out)
  }

  const applySpark = () => {
    if (spark.length === 0) return
    setState((s) => {
      const checked = { ...s.checked }
      spark.forEach((it) => { checked[it.id] = true })
      return { ...s, checked }
    })
    say('뽑은 트로프를 체크에 반영했어요')
  }

  // ── 집계 ──
  const ql = query.trim().toLowerCase()
  const perCat = CATS.map((cat) => {
    const all = catItems(cat, state)
    const items = ql ? all.filter((it) => it.text.toLowerCase().includes(ql) || (it.tip || '').toLowerCase().includes(ql) || (it.twist || '').toLowerCase().includes(ql)) : all
    const done = all.filter((it) => state.checked[it.id]).length
    return { cat, items, all, total: all.length, done, hidden: all.length - items.length }
  })
  const totalItems = perCat.reduce((a, p) => a + p.total, 0)
  const totalDone = perCat.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // 조합수: 켜진 트로프 항목 수
  const onTropes = TROPE_CATS.reduce((a, c) => a + catItems(c, state).filter((it) => state.checked[it.id]).length, 0)
  const combo = comboCount(onTropes)

  // ── 내보내기 / 프로젝트 ──
  const selectedByCat = () => CATS.map((cat) => ({ cat, picks: catItems(cat, state).filter((it) => state.checked[it.id]) })).filter((x) => x.picks.length > 0)

  const exportText = () => {
    const sel = selectedByCat()
    const lines: string[] = [`# 로판 트로프·관습 체크 (${genre})`, `선택 ${totalDone}/${totalItems} · 트로프 ${onTropes}개 → 조합 ${combo.display}`, '']
    if (sel.length === 0) lines.push('(아직 체크한 항목이 없어요)')
    sel.forEach(({ cat, picks }) => {
      lines.push(`## ${cat.icon} ${cat.name}`)
      picks.forEach((it) => { lines.push(`- ${it.text}`); if (it.twist) lines.push(`    ↳ 비틀기: ${it.twist}`) })
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `체크한 트로프를 복사했어요 (${totalDone}개)`)
  }

  const toBodyHtml = (): string => {
    const sel = selectedByCat()
    const parts: string[] = []
    parts.push(`<p><strong>장르:</strong> ${escHtml(genre)} &nbsp;·&nbsp; <strong>선택:</strong> ${totalDone}/${totalItems} &nbsp;·&nbsp; <strong>트로프 조합:</strong> ${escHtml(combo.display)} (${onTropes}개 선택)</p>`)
    if (sel.length === 0) { parts.push('<p>(아직 체크한 항목이 없습니다)</p>'); return parts.join('') }
    sel.forEach(({ cat, picks }) => {
      parts.push(`<h3>${escHtml(cat.icon + ' ' + cat.name)}</h3>`)
      picks.forEach((it) => {
        parts.push(`<p>☑ ${escHtml(it.text)}</p>`)
        if (it.twist) parts.push(`<p style="color:#888;margin-left:14px">↳ 비틀기: ${escHtml(it.twist)}</p>`)
      })
    })
    return parts.join('')
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `로판 트로프 셋 (${totalDone}개 선택)`,
      bodyHtml: toBodyHtml(),
      meta: {
        장르: genre,
        선택: `${totalDone}/${totalItems}`,
        트로프수: String(onTropes),
        조합수: combo.display,
      },
    })
    say(id ? `프로젝트 '기획' 폴더에 트로프 셋을 추가했어요 (${totalDone}개)` : '프로젝트에 연결되지 않았습니다')
  }

  // 선택한 트로프 셋을 글감 스니펫으로 저장
  const toSnippet = () => {
    const sel = selectedByCat()
    if (sel.length === 0) { say('먼저 트로프를 체크하세요'); return }
    const text = sel.map(({ cat, picks }) => `${cat.icon} ${cat.name}: ` + picks.map((p) => p.text).join(' / ')).join('\n')
    addToLibrary('snippets', { text: `[로판 트로프 셋]\n${text}`, source: '로판 트로프·관습 체크', tags: ['로맨스판타지', '로판', '트로프', '기획'] })
    say('글감(스니펫)으로 저장했어요')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const kindBadge = (): React.CSSProperties => ({
    fontSize: 10, padding: '1px 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap',
  })

  const linked = hasProjectBridge()

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}><Emoji e="👑"/> 로판 트로프·관습 체크</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{genre}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!linked || totalDone === 0} title={linked ? "체크한 트로프 셋을 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={toSnippet} disabled={totalDone === 0} title="체크한 트로프를 글감(스니펫)으로 저장"><Emoji e="💡"/> 글감 저장</button>
        <button className="minibtn" onClick={exportText} disabled={totalDone === 0} title="체크한 트로프를 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 해제</button>
      </div>

      {/* 진행률 + 조합수 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
        <span style={{ flexBasis: '100%', height: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>선택한 트로프 <b style={{ color: 'var(--text)' }}>{onTropes}개</b>로 만들 수 있는 트로프 조합</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{combo.display}{combo.raw > 0 ? ' 가지' : ''}</span>
      </div>

      {/* 검색 + 오늘의 로판 트로프 한 줌 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          style={{ ...input, flex: 1, minWidth: 160 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="트로프·함정 검색 (예: 회귀, 빙의, 악역영애, 집착, 사이다, 정략혼)"
          aria-label="트로프 검색"
        />
        {query && <button style={tinyBtn} onClick={() => setQuery('')} title="검색 지우기">✕</button>}
        <button className="minibtn" onClick={drawSpark} title="로판 트로프 풀에서 무작위 3개 뽑기"><Emoji e="🎲"/> 트로프 한 줌</button>
      </div>

      {spark.length > 0 && (
        <div style={{ margin: '0 14px', padding: 10, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🎲"/> 오늘의 로판 트로프 한 줌</span>
            <span style={{ flex: 1 }} />
            <button style={tinyBtn} onClick={drawSpark} title="다시 뽑기">↻ 다시</button>
            <button style={tinyBtn} onClick={applySpark} title="뽑은 트로프를 체크에 반영">✓ 반영</button>
            <button style={tinyBtn} onClick={() => copyText(spark.map((s) => '• ' + s.text).join('\n'), '뽑은 트로프 복사됨')} title="복사"><Emoji e="📋"/></button>
          </div>
          {spark.map((it) => (
            <div key={it.id} style={{ fontSize: 12.5, lineHeight: 1.5 }}>• {it.text}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>서로 안 어울려 보이는 트로프일수록 신선한 조합이 됩니다. "회귀한 악역영애가 집착 황제와 계약 결혼?" 처럼 상상해 보세요.</div>
        </div>
      )}

      {/* 로그라인 조합 생성기 (곱집합) */}
      <div style={{ margin: '10px 14px 0', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="✨"/> 로판 로그라인 조합 생성기</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>여주·배경·회빙환·관계·남주·정서·결말 7칸 곱집합 · <b style={{ color: 'var(--accent)' }}>{koBig(LOGLINE_PRODUCT)}</b> 가지</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={drawLoglines} title="7개 슬롯 곱집합에서 무작위 로그라인 3개 생성"><Emoji e="🎲"/> 로그라인 뽑기</button>
        </div>
        {loglines.length > 0 && (
          <>
            {loglines.map((l, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ flex: 1 }}>• {l}</span>
                <button style={tinyBtn} title="이 로그라인 복사" onClick={() => copyText(l, '로그라인 복사됨')}><Emoji e="📋"/></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={tinyBtn} onClick={drawLoglines} title="다시 뽑기">↻ 다시</button>
              <button style={tinyBtn} onClick={() => copyText(loglines.map((l) => '• ' + l).join('\n'), '로그라인 전부 복사됨')} title="전부 복사"><Emoji e="📋"/> 전부</button>
              {hasProjectBridge() && <button style={tinyBtn} onClick={() => { addToLibrary('snippets', { text: `[로판 로그라인 후보]\n${loglines.map((l) => '• ' + l).join('\n')}`, source: '로판 트로프·관습 체크', tags: ['로맨스판타지', '로판', '로그라인', '기획'] }); say('로그라인을 글감으로 저장했어요') }} title="로그라인을 글감(스니펫)으로 저장"><Emoji e="💡"/> 글감 저장</button>}
            </div>
          </>
        )}
        {loglines.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>버튼을 누르면 서로 독립적인 7개 슬롯을 곱집합으로 조합해 말이 되는 로판 한 줄 줄거리를 만들어 줍니다.</div>
        )}
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {perCat.map(({ cat, items, total, done, hidden }) => {
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          if (ql && items.length === 0) return null
          return (
            <div key={cat.id} style={card}>
              <div style={cHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {cat.name}
                    {cat.kind === 'trope' && <span style={kindBadge()}>조합 대상</span>}
                    {cat.kind === 'trap' && <span style={{ ...kindBadge(), color: 'var(--warn)', borderColor: 'var(--warn)' }}>함정·비틀기</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.desc}{ql && hidden > 0 ? ` · 검색 일치 ${items.length}/${total}` : ''}
                  </div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 52, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
              </div>

              {open && (
                <div>
                  {items.map((it) => {
                    const isEditing = editing && editing.id === it.id
                    const checked = !!state.checked[it.id]
                    return (
                      <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                        {isEditing ? (
                          <>
                            <input
                              style={{ ...input, flex: 1 }} value={editing!.text} autoFocus
                              onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                              aria-label="항목 수정"
                            />
                            <button style={tinyBtn} onClick={saveEdit}>저장</button>
                            <button style={tinyBtn} onClick={() => setEditing(null)}>취소</button>
                          </>
                        ) : (
                          <>
                            <input
                              type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                              style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: cat.kind === 'trap' ? 'var(--warn)' : 'var(--accent)' }}
                              aria-label={it.text}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                onClick={() => toggle(it.id)}
                                style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked && cat.kind !== 'trap' ? 'line-through' : 'none', fontWeight: checked && cat.kind === 'trap' ? 600 : 400 }}
                              >
                                {it.text}
                                {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                              </span>
                              {it.tip && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{it.tip}</div>}
                              {it.twist && (
                                <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, marginTop: 3, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                                  <b>비틀기</b> · {it.twist}
                                </div>
                              )}
                            </div>
                            <button style={tinyBtn} title="이 항목 복사" onClick={() => copyText(it.text + (it.twist ? `\n↳ 비틀기: ${it.twist}` : ''), '복사됨')}><Emoji e="📋"/></button>
                            <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                            <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {!ql && (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                      <input
                        style={{ ...input, flex: 1 }} value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }}
                        placeholder={`${cat.name}에 내 항목 추가…`} maxLength={200}
                        aria-label={`${cat.name} 항목 추가`}
                      />
                      <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 연계 */}
        <div className="linkbar" style={{ marginTop: 2 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre })} title="선택한 트로프로 갈등을 설계"><Emoji e="⚔️"/> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre })} title="남주·여주 원형으로 인물 만들기"><Emoji e="🧑‍🎤"/> 인물 공방</button>
          <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre })} title="관계 곡선 비트를 플롯에 배치"><Emoji e="🎢"/> 플롯 피라미드</button>
          <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre })} title="고구마·사이다 정서 곡선 설계"><Emoji e="📈"/> 감정 곡선</button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, 카테고리 머리글로 펼치거나 접으세요. <b>조합 대상</b> 카테고리(회빙환·셋업·원형·세계관·정서 엔진·클라이맥스)에서 고른 트로프 수로 가능한 조합 수가 계산됩니다.
          <b>함정·비틀기</b>는 "내 글에 이 함정이 있나?"를 점검하는 칸 — 체크된 함정의 <b style={{ color: 'var(--accent)' }}>비틀기</b>를 보강 지점으로 삼으세요. 기본 항목도 수정·삭제할 수 있고, 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
