// 로맨스 트로프·관습 체크리스트 — 로맨스 장르의 독자 기대(장르 계약)·필수 구조 요소·하위유형별 핵심 트로프·
//   흔한 함정·클리셰(+비틀기 제안)를 카테고리별 체크리스트로 점검한다. 클리셰는 "비틀기" 한 줄을 함께 제공.
//   체크/펼침/검색/사용자 항목 추가·수정·삭제 + 카테고리별·전체 진행률. 무작위 "오늘의 트로프 한 줌"으로 영감 제공.
//   조합수: 켜진 트로프 항목들로 만들 수 있는 트로프 조합(부분집합) 수를 표시 → 사실상 무한대(2^N)에 가까운 변주 가능.
//   시드라인 생성기: 배경·남주·여주·셋업·텐션·무드·결말 7개 독립 슬롯의 곱집합(40×30×30×24×20×16×20 = 55.3억 가지)으로
//     "말이 되는" 로맨스 한 줄 설정을 무작위 생성. 조사는 받침을 보고 을/를·이/가를 골라 출력(괄호 이중표기 없음).
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬 자작 데이터(로맨스 특화). localStorage 'sry:tool:romance-tropes'.
// 연계(linkbus): 체크한 트로프 셋을 프로젝트 '기획' 폴더 문서로 추가, 글감을 스니펫 라이브러리에 저장, 관련 도구 열기.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = { id: 'romance-tropes', name: '로맨스 트로프·관습 체크', icon: '💞', group: '구상·정리', genre: '로맨스', intro: '로맨스 독자 기대·필수 요소·하위유형 트로프·흔한 함정(클리셰 비틀기)을 체크리스트로 점검하세요', w: 660, h: 640 }

const LS_KEY = 'sry:tool:romance-tropes'

// ── 항목 종류 ──
// kind:'expect'  독자 기대/장르 계약 — 지키지 않으면 별점 테러
// kind:'beat'    필수 구조 비트 — 관계 곡선의 골격
// kind:'trope'   하위유형별 핵심 트로프 — 선택해 조합하는 자산(조합수 카운트 대상)
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

// ───────────────────── 로맨스 특화 자작 데이터 ─────────────────────
const CATS: Cat[] = [
  // 1) 장르 계약 — 독자가 사전 합의한 약속
  {
    id: 'contract', name: '장르 계약 (독자와의 약속)', icon: '🤝', kind: 'expect',
    desc: '어기면 "로맨스 아님"으로 분류되고 별점이 무너지는 핵심 약속들',
    items: [
      { text: 'HEA(완전한 해피엔딩) 또는 HFN(지금은 행복) 결말을 보장한다', tip: '두 주인공이 맺어지거나 최소한 함께한다는 강한 약속. 한쪽이 죽거나 영영 헤어지면 "로맨스 계약 위반".' },
      { text: '두 인물의 관계 발전이 플롯의 중심축이다', tip: '제국 정치·살인사건·전쟁이 있어도 종속 변수. "이 사건이 둘 사이를 어떻게 바꾸는가"가 항상 우선.' },
      { text: '정서적 카타르시스(설렘·애절·질투·화해의 안도)를 매 구간 제공한다', tip: '독자는 정서 롤러코스터를 기대한다. 이 정서 곡선이 사건 논리보다 우선한다.' },
      { text: '관능도(heat level)를 사전 고지하고 본문이 그 약속을 지킨다', tip: 'clean/sweet(키스까지) ↔ steamy/explicit(노골) 사이 합의. 태그와 본문이 어긋나면 강하게 반발.' },
      { text: '주인공 내면(여주 1인칭/근접 3인칭)에 깊이 들어간다', tip: '상대의 속마음은 "남주 시점 외전"으로 보여주는 웹소설 관습 활용.' },
      { text: '"왜 하필 이 사람인가"가 설득된다 (케미의 정당화)', tip: '사랑에 빠지는 이유가 보이지 않으면 "케미 없음"으로 평가된다.' },
      { text: '둘의 거리가 좁혀지는 단계가 독자에게 체감된다', tip: '첫 만남→인식→끌림→갈등→고백→위기→결합. 진척이 멈추면 "고구마"라 비판.' },
      { text: '(웹소설) 매 회차 끝에 설렘 포인트 또는 클리프행어가 있다', tip: '연독률 = 매 5,000자마다의 작은 두근거림·다음 화 궁금증.' },
      { text: '(웹소설) 1~10화 안에 핵심 트로프와 두 주인공의 케미를 명확히 노출한다', tip: '첫인상이 곧 연독률. 이 작품이 무슨 맛인지 초반에 약속하라.' },
    ],
  },

  // 2) 필수 구조 비트 — 관계 곡선의 골격
  {
    id: 'beats', name: '필수 구조 비트 (관계 곡선)', icon: '🎢', kind: 'beat',
    desc: '로맨스를 로맨스답게 만드는 정서 곡선의 골격. 빠진 비트가 약한 고리',
    items: [
      { text: 'Meet-Cute / 강렬한 첫 만남 (운명적·우스꽝·적대적)', tip: '좋든 나쁘든 잊히지 않는 첫인상. enemies-to-lovers면 여기서 불꽃을 튀겨라.' },
      { text: 'Inciting Incident — 둘을 계속 엮는 사건', tip: '계약·동거·같은 임무·빙의 후 첫 대면. 떨어질 수 없게 만드는 장치.' },
      { text: '"No Way" 거부 단계 — 절대 안 될 사이라는 명분 vs 끌림', tip: '밀당의 시작. 명분이 강할수록 무너질 때 카타르시스가 크다.' },
      { text: 'Falling / 점화 — 함께하는 시간·접촉 고조·첫 키스(행복의 정점)', tip: '"Fun and Games" 구간. 독자가 가장 달콤하게 빠지는 곳.' },
      { text: 'Midpoint — 관계가 깊어지거나(첫 동침/진심 자각) 결정적 정보 폭로', tip: '되돌릴 수 없는 한 걸음. 이후 위험이 수면 위로.' },
      { text: 'Black Moment / 파국 — 관계가 끝장난 듯한 최저점', tip: '오해의 폭발·비밀의 폭로·외부 압력의 정점. 로맨스의 필수 비트.' },
      { text: 'Dark Night of the Soul — 떨어진 채 각자 진심을 깨닫는 성찰', tip: '"그가 없으니 비로소 알겠다"의 구간. yearning이 폭발한다.' },
      { text: 'Grand Gesture — 자존심·지위·목숨을 건 사랑의 증명', tip: '공개 고백·권력 포기·공항 추격. 상호성이 있어야 만족도가 높다.' },
      { text: 'First "I love you" — 진심의 언어화', tip: '고백→회피/거절→재고백→응답의 다단계로 설계하는 게 정석.' },
      { text: 'HEA + 외전(후일담) — 결합 후 보너스 설렘', tip: '웹소설은 후일담이 필수 관습. 결혼·미래·육아·남주 시점 외전.' },
    ],
  },

  // 3) 핵심 정서 장치 — 텐션 엔진
  {
    id: 'engine', name: '정서·텐션 엔진 (밀당 장치)', icon: '🧲', kind: 'trope',
    desc: '관계의 긴장을 만들고 유지하는 장치들. 켜진 항목으로 트로프 조합을 만든다',
    items: [
      { text: '밀당 (push-pull) — 한 발 다가가면 두 발 물러서기', tip: '진자가 멈추면 텐션 사망. 가까워지면 회피, 멀어지면 끌림 자각.' },
      { text: 'Slow Burn (느린 점화) — 긴장의 누적', tip: '로판·장편의 주력. 닿을 듯 닿지 않는 빌드업으로 갈증을 키운다.' },
      { text: 'Insta-love (첫눈에 반함) — 빠른 결합', tip: '단편·카테고리물에 적합. 대신 "왜"를 압축해 강하게 보여줘라.' },
      { text: 'Yearning / Pining (애틋한 갈망·짝사랑)', tip: '드러내지 못하는 마음. 손끝·시선·독백이 로맨스 정서의 핵심 연료.' },
      { text: 'The Almost-Kiss (니어 키스) — 입맞춤 직전 방해', tip: '보상을 미뤄 텐션을 끌어올리는 페이싱 도구.' },
      { text: 'Touch escalation — 손 스침→의도적 접촉→포옹→키스', tip: '신체 거리의 점층이 감정 거리의 점층을 가시화한다.' },
      { text: 'Jealousy Plot — 연적·과거 연인·약혼자로 진심 자각', tip: '질투가 "내가 이 사람을 좋아하는구나"를 깨닫게 하는 촉매.' },
      { text: 'Misunderstanding (오해) — 인물의 상처에서 필연적으로 발생', tip: '한 마디면 풀릴 오해(idiot plot)는 금물. 세계관·상처에서 나와야 좋다.' },
      { text: '비밀(secret)의 점화·폭로 타이밍 설계', tip: '신분·과거·정체의 비밀이 Midpoint나 Black Moment에서 터지게.' },
      { text: '고백의 다단계 구조 (고백→거절→재고백→응답)', tip: '단발 이벤트로 끝내지 말고 회피·재시도로 텐션을 늘여라.' },
    ],
  },

  // 4) 관계 셋업 트로프 — "어떤 사이로 시작하는가"
  {
    id: 'setup', name: '관계 셋업 트로프', icon: '💘', kind: 'trope',
    desc: '두 사람을 묶는 관계의 시작 형태. 하나 이상 골라 조합하라',
    items: [
      { text: 'Enemies to Lovers (적에서 연인으로)', tip: '적대→오해→재평가→결합. 『오만과 편견』의 현대 후예. 불꽃이 핵심.' },
      { text: 'Friends to Lovers (친구에서 연인으로)', tip: '오래된 신뢰가 끌림으로 전환되는 순간이 백미. "선 넘기"의 긴장.' },
      { text: 'Fake Dating / 가짜 연인 (계약·위장)', tip: '"가짜인데 진짜가 되어버린" 전환점이 절정. 보여주기용 스킨십이 진심으로.' },
      { text: '계약 결혼 / 계약 연애', tip: '거래로 시작해 감정이 끼어든다. 조건·기한·해지 조항이 텐션 장치.' },
      { text: 'Forced Proximity / 강제 밀착 (한 침대만 남은 여관!)', tip: '폭설로 갇힘·위장 부부·같은 프로젝트. 감정 발생을 강제하는 최강 장치.' },
      { text: 'Second Chance (재회·옛 연인)', tip: '헤어진 둘이 다시 만난다. 미해결 감정과 변한 상황의 충돌.' },
      { text: 'Forbidden Love / 금지된 사랑 (신분·집안·직위 격차)', tip: '벽이 높을수록 끌림이 커진다. 결합 = 벽을 무너뜨리는 일.' },
      { text: 'Love Triangle / 삼각관계', tip: '"선택받는 평범한 주인공" 구도. 선택의 이유를 끝까지 미뤄 긴장 유지.' },
      { text: 'Marriage of Convenience → 진짜 사랑 (정략혼)', tip: '히스토리컬·로판 주력. 정치적 거래가 점차 진심으로.' },
      { text: 'Boss/부하·사제·후견인 등 권력차 관계', tip: '권력 격차의 윤리적 긴장을 다루되 동의·상호성을 분명히.' },
    ],
  },

  // 5) 남주/여주 캐릭터 원형
  {
    id: 'archetype', name: '캐릭터 원형 (남주·여주)', icon: '🎭', kind: 'trope',
    desc: '로맨스의 매력 자산. 원형을 고르고 "결핍·방어기제"로 입체화하라',
    items: [
      { text: '알파 남주 (오만·유능·독점욕) — 다아시 계보', tip: '거의 모든 현대 알파남주의 조상은 다아시. 오만 뒤 다정의 낙차가 매력.' },
      { text: '상처 입은 남주 (tortured hero) — 로체스터 계보', tip: '비밀·트라우마를 품은 어두운 남성. 구원받는 서사의 정서가 강하다.' },
      { text: '집착 남주 / 얀데레 (과도한 독점욕)', tip: '로판 특화. 위험과 다정의 경계. 동의·상호성으로 선을 지켜라.' },
      { text: '후회 남주 (후회물) — 버린 뒤 뒤늦게 매달림', tip: '"내가 잘못했다"의 권력 역전 카타르시스가 핵심. 무릎 꿇는 가해자.' },
      { text: '다정·순정 남주 (cinnamon roll) — 한결같은 헌신', tip: '집착물의 반대극. 변치 않는 다정함 자체가 설렘이 된다.' },
      { text: '능동적 여주 (결말을 바꾸는 주체)', tip: '수동적이면 "고구마". 주인공의 선택이 클라이맥스를 이끌게.' },
      { text: '악역 영애 / 빌런 여주 (원작 파괴)', tip: '로판 핵심. "이 책 속 악녀가 되었다" — 정해진 비극을 뒤집는 능동성.' },
      { text: '회귀·빙의·환생 주인공 (정보 비대칭)', tip: '주인공만 미래/원작 결말을 안다. "비극을 알면서 다시 그를 만남"의 애절함.' },
      { text: '겉바속촉 츤데레 (퉁명 겉면 / 다정 속내)', tip: '말과 행동의 불일치가 귀여움과 텐션을 동시에 만든다.' },
      { text: '구김 없는 햇살형 vs 그늘진 인물의 대비 짝', tip: '정반대 기질의 충돌·보완이 케미의 공식. 한쪽이 다른 쪽을 녹인다.' },
    ],
  },

  // 6) 하위유형 — 로판/현대/히스토리컬 특화
  {
    id: 'subgenre', name: '하위유형 특화 (로판·현대·히스토리컬)', icon: '🏰', kind: 'trope',
    desc: '한국 웹소설/서구 정전의 하위유형별 장치. 작품의 결을 정한다',
    items: [
      { text: '(로판) 가상 제국·귀족 사회 배경 + 정치 음모', tip: '서구풍 가상 세계. 작위·사교계·계승 분쟁이 관계의 무대.' },
      { text: '(로판) 책빙의 — 원작 결말 알고 생존·뒤집기', tip: '"내가 아는 결말"이 동력. 정보 비대칭으로 능동성과 긴장을 만든다.' },
      { text: '(로판) 육아·힐링물 (조카·어린 주인공 키우기)', tip: '돌봄을 매개로 감정이 자란다. 가족 만들기의 따뜻함이 매력.' },
      { text: '(현대) 재벌·억만장자 + 계약·사내연애', tip: '신데렐라 변주. 권력·부의 격차를 동의와 성장으로 메운다.' },
      { text: '(현대) 이슈 드리븐 (트라우마·관계 회복) — 콜린 후버류', tip: '뉴어덜트의 무거운 소재. 케어와 경계, 회복의 서사.' },
      { text: '(히스토리컬) 리젠시·시대극 (브리저튼·오스틴)', tip: '예법·무도회·정략혼의 제약이 곧 텐션. 사교 시즌이 무대.' },
      { text: '(패러노멀/로맨타지) 뱀파이어·요정·마법 + 운명의 짝', tip: '트와일라잇·ACOTAR 계보. mating bond·운명적 끌림이 장치.' },
      { text: '(다크 로맨스) 파괴적·집착적 사랑 — 폭풍의 언덕 계보', tip: '"사랑은 구원이 아니라 파멸"의 변주. 관능도·동의 고지에 유의.' },
      { text: '(타임슬립/대하) 시간 이동 + 역사 로맨스 — 아웃랜더류', tip: '시대 격차가 만드는 단절·재회의 애절함, 대하 서사의 스케일.' },
      { text: '(BL/GL 호환) 로맨스 규약을 공유하되 별도 관습 체계', tip: '관계 곡선·HEA 약속은 동일. 별도 관습·태그 문화 존중.' },
    ],
  },

  // 7) 클라이맥스·고백 형태
  {
    id: 'climax', name: '클라이맥스 · Grand Gesture', icon: '🎆', kind: 'trope',
    desc: '절정 = 외부 사건 해결이 아니라 "관계의 최종 결정". 형태를 골라라',
    items: [
      { text: '(현대) 공항/거리 추격 — 떠나는 상대를 붙잡기', tip: '시간 제한 + 공개성. 달려가는 행위 자체가 증명.' },
      { text: '(현대) 만인 앞 공개 고백·프러포즈', tip: '체면을 버리는 공개성이 진심의 무게. 자존심을 내려놓는 순간.' },
      { text: '(현대) 직위·재산·꿈을 포기하고 사람을 택함', tip: '무엇을 버렸는가가 사랑의 크기를 증명한다.' },
      { text: '(로판/히스토리컬) 신분·왕위·정략혼을 거부', tip: '황제가 권력으로 그녀를 지키거나, 작위를 버리고 그를 택한다.' },
      { text: '(후회물) 가해자였던 쪽의 완전한 속죄·무릎 꿇기', tip: '권력 역전의 카타르시스. 단, 용서는 강요가 아니라 선택이어야.' },
      { text: '상호성 — 둘 다 무언가를 내려놓고 서로에게 다가감', tip: '일방적 희생은 만족도가 낮다. 양쪽 모두의 결단이 필요.' },
      { text: '오해/비밀의 해소가 곧 절정 (장벽 제거)', tip: '진심의 폭발 → 오해 풀림·비밀 수용. 외부 악당 처치는 부차적.' },
      { text: 'Black Moment의 직접적 반작용으로 설계', tip: '최저점에서 무너진 그 지점이, 절정에서 정확히 복구되게.' },
    ],
  },

  // 8) 흔한 함정/클리셰 — 비틀기 동반
  {
    id: 'traps', name: '흔한 함정 · 클리셰 (비틀기)', icon: '🪤', kind: 'trap',
    desc: '체크 = "내 글에 이 함정이 있나?" 점검. 각 항목엔 비틀기 한 줄을 제공',
    items: [
      { text: '한 마디면 풀릴 오해 (idiot plot)로 갈등을 끄는가?', tip: '독자가 "그냥 말하면 되잖아"라고 외치면 실패.', twist: '오해가 인물의 상처·세계관에서 필연적으로 나오게 하라. 말 못 하는 "이유"가 곧 캐릭터.' },
      { text: '동의 없는 강압을 "강렬한 사랑"으로 포장하는가?', tip: '벽치기·손목 잡기의 위험선. 위협과 설렘은 다르다.', twist: '독점욕은 보여주되, 결정적 순간엔 상대의 의사를 묻고 멈출 줄 아는 면을 넣어 신뢰를 쌓아라.' },
      { text: '여주가 사건에 끌려다니기만 하는 수동적 인물인가?', tip: '"고구마" 1순위. 선택권 없는 주인공.', twist: '매 위기에서 여주가 스스로 결정을 내리게. 작은 선택이라도 결말의 방향을 바꾸게 하라.' },
      { text: '남주의 매력이 외모·재력·능력 "스펙"뿐인가?', tip: '스펙만으로는 케미가 안 생긴다.', twist: '그 사람만의 결핍·취약함을 한 장면 보여줘라. 빈틈이 사랑의 진입점이다.' },
      { text: '연적/삼각관계를 "들러리 악역"으로만 소비하는가?', tip: '평면적 연적은 긴장을 못 만든다.', twist: '연적에게도 진심과 매력을 줘라. 진짜 경쟁이어야 주인공의 선택이 빛난다.' },
      { text: '첫눈에 반함만으로 끝까지 끌고 가는가? (이유 부재)', tip: '인스타러브의 함정 — "왜"가 비어 있음.', twist: '첫 끌림 이후 함께한 사건으로 그 끌림을 "정당화"하는 장면을 반드시 쌓아라.' },
      { text: '관능 장면이 관계 진척과 무관하게 삽입되는가?', tip: '맥락 없는 정사는 텐션을 끊는다.', twist: '모든 스킨십이 관계 단계를 한 칸 전진시키게. 접촉 전후로 감정이 달라져야 한다.' },
      { text: '여성 인물들을 서로 적대시키게만 그리는가? (질투 일변도)', tip: '여적여 클리셰는 진부하다.', twist: '여성 조연에게 연대·우정을 줘라. 주인공을 돕는 동성 동료가 작품에 깊이를 더한다.' },
      { text: '신데렐라식 "구원받는 여주"에 머무는가?', tip: '권력이 한쪽에만 있으면 평등이 깨진다.', twist: '여주도 남주를 구원하게 하라. 서로가 서로의 결핍을 메우는 상호 구원으로.' },
      { text: 'Black Moment 없이 잔잔하게만 흘러가는가?', tip: '갈등 없는 행복은 지루함. "사이다 무한"도 긴장 소멸.', twist: '관계가 끝장난 듯한 최저점을 한 번은 만들어라. 떨어져 봐야 재결합이 달다.' },
      { text: '후회남이 너무 쉽게 용서받는가?', tip: '속죄 없는 용서는 카타르시스를 깎는다.', twist: '용서까지의 거리를 충분히 두고, 가해자가 대가를 치르는 과정을 보여줘라.' },
      { text: '결말 뒤 후일담(외전)이 없어 여운이 빈약한가?', tip: '웹소설 독자는 결합 후 일상도 보고 싶어 한다.', twist: '결혼·육아·남주 시점 등 보너스 설렘 1~2편으로 정서적 보상을 마무리하라.' },
    ],
  },
]

// 조합 카운트 대상(트로프 셋): kind === 'trope' 인 카테고리들의 켜진 항목 수
const TROPE_CATS = CATS.filter((c) => c.kind === 'trope')

// ───────────────────── 로맨스 시드라인(한 줄 설정) 생성기 ─────────────────────
//  서로 독립적인 7개 슬롯의 곱집합으로 "말이 되는" 로맨스 한 줄 설정을 무작위 생성한다.
//  각 슬롯은 문법 역할이 고정(명사구/관형구/종결구)이며, 다른 슬롯을 전제하지 않아 자유롭게 곱집합으로 섞여도 모순이 없다.
//  조사는 앞 글자 받침을 보고 실제 하나를 골라 출력한다(괄호 이중표기 노출 금지).

// 받침 유무 판정 + 조사 선택 헬퍼 (완전 로컬·결정론)
function hasFinalConsonant(word: string): boolean {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
// 을/를 : 목적격
function eul(word: string): string { return word + (hasFinalConsonant(word) ? '을' : '를') }
// 이/가 : 주격
function iga(word: string): string { return word + (hasFinalConsonant(word) ? '이' : '가') }

// 슬롯 1) 배경·무대 (40개, 명사구 — "~에서"가 붙는 장소/세계)
const SEED_SETTING: string[] = [
  '눈보라에 갇힌 산장', '가짜 약혼이 시작된 사교계', '회귀한 황궁', '재벌가의 비밀 별장',
  '책 속으로 빙의한 가상 제국', '한 침대만 남은 외딴 여관', '리젠시 시대의 무도회장',
  '계약서가 오간 대기업 회장실', '뱀파이어가 다스리는 밤의 도시', '시간이 뒤틀린 옛 저택',
  '폐허가 된 마법 학교', '재회한 고향의 작은 서점', '전쟁 직전의 변경 요새',
  '운명의 짝을 점지하는 신전', '망해가는 극단의 무대 뒤', '얼어붙은 북부 영지',
  '정략혼이 예정된 왕가', '기억을 잃은 채 깨어난 병원', '연적이 가득한 황실 연회',
  '저주가 흐르는 고성', '바닷마을의 낡은 등대', '복수가 시작된 검술 도장',
  '소설 속 악녀로 깨어난 후작가', '꽃이 만발한 비밀 정원', '심야의 24시 편의점',
  '비밀 임무가 떨어진 첩보 조직', '용이 잠든 고대 유적', '낯선 도시의 셰어하우스',
  '신분을 숨긴 채 입성한 기사단', '졸업을 앞둔 명문 기숙 학교', '하룻밤 폭우에 멈춰 선 야간열차',
  '계약이 얽힌 연예 기획사', '저택에 고용된 입주 가정교사 자리', '운명이 뒤바뀐 평행 세계',
  '오래된 약속이 남은 시골 마을', '왕위 계승전이 한창인 제국', '재해로 고립된 연구 기지',
  '환생을 반복하는 봄날의 정원', '신탁이 내려온 사원의 첨탑', '재개발을 앞둔 오래된 골목',
]

// 슬롯 2) 남자 주인공 원형 (30개, 주격 명사구 — "~이/가")
const SEED_HERO: string[] = [
  '오만한 알파 남주', '상처를 숨긴 어두운 기사', '집착이 깊은 황태자', '한결같이 다정한 소꿉친구',
  '뒤늦게 후회하는 전 약혼자', '냉정한 재벌 총수', '겉바속촉 츤데레 검사', '운명을 거스르려는 뱀파이어',
  '능청맞은 천재 마법사', '말수 적은 호위 기사', '복수를 품은 몰락 귀족', '순정파 연하 화가',
  '권력을 쥔 젊은 공작', '비밀 임무를 띤 첩보원', '무뚝뚝한 북부 영주', '다정한 척하는 야심가',
  '저주에 걸린 늑대 인간', '회귀해 돌아온 폭군', '서툴지만 진심인 신입 사원', '신분을 숨긴 황제',
  '냉소적인 천재 의사', '책임감 강한 기사단장', '장난기 많은 재벌 3세', '과묵한 용병 대장',
  '다정다감한 베이커리 주인', '야망에 불타는 정치가', '상냥한 음악가', '냉철한 검찰 수사관',
  '괴팍한 천재 발명가', '온화한 신관',
]

// 슬롯 3) 여자 주인공 원형 (30개, 목적격 명사구 — "~을/를")
const SEED_HEROINE: string[] = [
  '원작 결말을 아는 악역 영애', '능동적인 평민 출신 검사', '기억을 잃은 전직 암살자', '햇살처럼 밝은 약사',
  '복수를 결심한 몰락한 영애', '냉철한 여성 사업가', '회귀한 비운의 황녀', '꿋꿋한 시골 출신 마법사',
  '비밀을 간직한 시녀', '당돌한 신문 기자', '운명을 거부하는 신녀', '다정한 마음의 의사',
  '말괄량이 기사 지망생', '소설 속으로 빙의한 평범한 직장인', '자존심 강한 디자이너', '상냥한 베이커리 사장',
  '정체를 숨긴 공주', '단단한 심지의 변호사', '서툰 첫사랑에 빠진 학생', '강단 있는 여단장',
  '호기심 많은 고고학자', '침착한 응급실 간호사', '대담한 도둑 길드의 두목', '따뜻한 마음의 초등 교사',
  '집념 강한 형사', '재능 넘치는 신예 작곡가', '엉뚱한 천재 연구원', '품위 있는 미망인 백작 부인',
  '씩씩한 떠돌이 음유시인', '냉정한 길드 마스터',
]

// 슬롯 4) 관계 셋업 트로프 (24개, 관형구 — 뒤 명사 '관계'를 수식)
const SEED_SETUP: string[] = [
  '적에서 연인으로 향하는', '가짜 연인으로 시작한', '계약 결혼으로 묶인', '강제로 한 공간에 갇힌',
  '헤어졌다 재회한', '신분 차이로 금지된', '오래된 친구에서 넘어선', '삼각관계로 얽힌',
  '정략혼으로 맺어진', '권력 차이가 분명한', '운명의 짝으로 정해진', '서로를 오해한 채 얽힌',
  '한쪽만 첫눈에 반한', '비밀을 사이에 둔', '복수와 끌림이 뒤섞인', '신분을 속이고 만난',
  '한집에 살게 된', '같은 임무에 묶인', '내기로 시작된', '주종으로 시작한',
  '경쟁자로 마주친', '첫사랑을 다시 만난', '거래로 얽힌', '서로를 구해 준',
]

// 슬롯 5) 텐션 장치 (20개, 종결 서술 — "~ㄴ다/된다" 동사구가 문장을 이끔)
const SEED_TENSION: string[] = [
  '느리게 타오르는 긴장 속에 서로에게 빠져든다', '밀고 당기며 진심을 들킬까 두려워한다',
  '닿을 듯 닿지 않는 거리에서 갈망이 깊어진다', '질투를 계기로 자신의 마음을 깨닫는다',
  '오해가 쌓이다 결국 한 번 크게 무너진다', '키스 직전마다 방해를 받으며 애가 탄다',
  '비밀이 드러나는 순간 관계가 뒤집힌다', '고백과 거절을 거듭하며 서로를 시험한다',
  '손끝의 스침이 점점 깊은 접촉으로 번진다', '함께 위기를 넘기며 신뢰가 사랑으로 바뀐다',
  '서로의 결핍을 알아보며 천천히 무장 해제된다', '경계하던 마음이 사소한 다정함에 녹아내린다',
  '티격태격하다 어느새 서로를 챙기게 된다', '한 발 다가가면 두 발 물러서기를 반복한다',
  '말 못 할 사정을 숨긴 채 거리를 좁혀 간다', '작은 친절이 쌓여 마음의 빗장이 풀린다',
  '서로를 보호하려다 진심을 들키고 만다', '엇갈린 타이밍에 애를 태우며 그리워한다',
  '한순간의 솔직함에 둘 다 흔들리고 만다', '닮은 상처를 알아보며 서서히 가까워진다',
]

// 슬롯 6) 장르 무드 (16개, 관형구 — 뒤 명사 '이야기'를 수식)
const SEED_MOOD: string[] = [
  '달콤하고 설레는 로맨스', '애절하고 절절한 순애', '아슬아슬한 다크 로맨스', '코믹하고 사랑스러운 로맨틱 코미디',
  '웅장한 로맨스 판타지', '잔잔하게 스미는 힐링', '치명적인 집착의', '시대의 품격이 흐르는 시대극 로맨스',
  '통쾌한 후회 서사의', '운명에 맞서는 로맨타지', '먹먹하게 차오르는 성장', '숨 막히는 긴장의 서스펜스 로맨스',
  '따뜻하고 포근한 일상', '눈부시게 풋풋한 청춘', '서늘하고 매혹적인 미스터리 로맨스', '가슴 벅찬 운명적',
]

// 슬롯 7) 클라이맥스(Grand Gesture) — (20개) 종결문(완결된 문장)
const SEED_CLIMAX: string[] = [
  '결국 모든 것을 내려놓고 서로를 택한다.', '떠나는 상대를 끝까지 쫓아가 붙잡는다.',
  '만인 앞에서 체면을 버리고 진심을 외친다.', '왕위와 권력을 포기하고 사랑을 지킨다.',
  '가해자였던 쪽이 무릎 꿇고 완전히 속죄한다.', '오해와 비밀을 모두 풀고 마주 선다.',
  '서로의 상처를 끌어안으며 함께 일어선다.', '운명을 거슬러서라도 곁에 남기를 택한다.',
  '목숨을 건 증명으로 마침내 마음을 잇는다.', '오랜 갈망 끝에 비로소 서로에게 닿는다.',
  '둘 다 자존심을 내려놓고 한 걸음씩 다가선다.', '약속했던 해피엔딩을 손수 완성한다.',
  '세상의 반대를 무릅쓰고 함께 떠나기로 한다.', '가장 두려워하던 진심을 끝내 고백한다.',
  '서로를 위해 가진 모든 것을 건다.', '엇갈렸던 마음이 마침내 같은 곳을 향한다.',
  '오랜 오해의 매듭을 풀고 다시 손을 잡는다.', '운명의 굴레를 깨고 스스로 미래를 고른다.',
  '먼 길을 돌아 결국 같은 자리로 돌아온다.', '서로의 이름을 부르며 새로운 시작을 약속한다.',
]

const SEED_SLOTS: string[][] = [SEED_SETTING, SEED_HERO, SEED_HEROINE, SEED_SETUP, SEED_TENSION, SEED_MOOD, SEED_CLIMAX]
// 시드라인 곱집합 조합수 = 각 슬롯 풀 크기의 곱 (고유 항목만)
const SEED_COMBOS: number = SEED_SLOTS.reduce((a, s) => a * s.length, 1)

// 한 줄 설정 문장 조립 — 조사를 받침 따라 골라 붙인다(괄호 이중표기 없음).
function buildSeedline(p: { setting: string; hero: string; heroine: string; setup: string; tension: string; mood: string; climax: string }): string {
  // 예) "눈보라에 갇힌 산장에서, 오만한 알파 남주가 원작 결말을 아는 악역 영애를 만나
  //      적에서 연인으로 향하는 관계 속에서 느리게 타오르며…, 달콤하고 설레는 로맨스다. 결국 …"
  return (
    `${p.setting}에서, ${iga(p.hero)} ${eul(p.heroine)} 만나 ` +
    `${p.setup} 관계 속에서 ${p.tension}. ` +
    `${p.mood} 이야기 — ${p.climax}`
  )
}
function randomSeedline(): string {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  return buildSeedline({
    setting: pick(SEED_SETTING), hero: pick(SEED_HERO), heroine: pick(SEED_HEROINE),
    setup: pick(SEED_SETUP), tension: pick(SEED_TENSION), mood: pick(SEED_MOOD), climax: pick(SEED_CLIMAX),
  })
}
// 조합수 한국어 표기
function fmtCombos(n: number): string {
  const KO = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']] as const
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

export default function RomanceTropes({ payload }: { payload?: Record<string, unknown> }) {
  const genre = (payload && typeof payload.genre === 'string' && payload.genre) ? String(payload.genre) : '로맨스'

  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [spark, setSpark] = useState<MergedItem[]>([])
  const [seedlines, setSeedlines] = useState<string[]>([])
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

  // ── 오늘의 트로프 한 줌: 트로프 카테고리에서 무작위 3개 ──
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

  const applySpark = () => {
    if (spark.length === 0) return
    setState((s) => {
      const checked = { ...s.checked }
      spark.forEach((it) => { checked[it.id] = true })
      return { ...s, checked }
    })
    say('뽑은 트로프를 체크에 반영했어요')
  }

  // ── 시드라인 생성기: 7개 독립 슬롯의 곱집합으로 한 줄 설정 무작위 생성 ──
  const drawSeedlines = () => {
    const out: string[] = []
    const seen = new Set<string>()
    let guard = 0
    while (out.length < 3 && guard < 60) {
      guard++
      const line = randomSeedline()
      if (seen.has(line)) continue
      seen.add(line); out.push(line)
    }
    setSeedlines(out)
  }
  const seedToSnippet = () => {
    if (seedlines.length === 0) return
    addToLibrary('snippets', {
      text: `[로맨스 시드라인]\n` + seedlines.map((l) => '• ' + l).join('\n'),
      source: '로맨스 트로프·관습 체크',
      tags: ['로맨스', '시드라인', '한줄설정'],
    })
    say('시드라인을 글감(스니펫)으로 저장했어요')
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
    const lines: string[] = [`# 로맨스 트로프·관습 체크 (${genre})`, `선택 ${totalDone}/${totalItems} · 트로프 ${onTropes}개 → 조합 ${combo.display}`, '']
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
      title: `로맨스 트로프 셋 (${totalDone}개 선택)`,
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
    addToLibrary('snippets', { text: `[로맨스 트로프 셋]\n${text}`, source: '로맨스 트로프·관습 체크', tags: ['로맨스', '트로프', '기획'] })
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
  const kindBadge = (k: ItemKind): React.CSSProperties => ({
    fontSize: 10, padding: '1px 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)', flexShrink: 0, whiteSpace: 'nowrap',
  })

  const linked = hasProjectBridge()

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}><Emoji e="💞"/> 로맨스 트로프·관습 체크</span>
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

      {/* 검색 + 오늘의 트로프 한 줌 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          style={{ ...input, flex: 1, minWidth: 160 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="트로프·함정 검색 (예: 계약, 오해, 후회, 슬로우번)"
          aria-label="트로프 검색"
        />
        {query && <button style={tinyBtn} onClick={() => setQuery('')} title="검색 지우기">✕</button>}
        <button className="minibtn" onClick={drawSpark} title="트로프 풀에서 무작위 3개 뽑기"><Emoji e="🎲"/> 트로프 한 줌</button>
      </div>

      {spark.length > 0 && (
        <div style={{ margin: '0 14px', padding: 10, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🎲"/> 오늘의 트로프 한 줌</span>
            <span style={{ flex: 1 }} />
            <button style={tinyBtn} onClick={drawSpark} title="다시 뽑기">↻ 다시</button>
            <button style={tinyBtn} onClick={applySpark} title="뽑은 트로프를 체크에 반영">✓ 반영</button>
            <button style={tinyBtn} onClick={() => copyText(spark.map((s) => '• ' + s.text).join('\n'), '뽑은 트로프 복사됨')} title="복사"><Emoji e="📋"/></button>
          </div>
          {spark.map((it) => (
            <div key={it.id} style={{ fontSize: 12.5, lineHeight: 1.5 }}>• {it.text}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>서로 안 어울려 보이는 트로프일수록 신선한 조합이 됩니다. "이 둘을 한 작품에?" 라고 상상해 보세요.</div>
        </div>
      )}

      {/* 로맨스 시드라인 생성기 — 7개 독립 슬롯 곱집합 */}
      <div style={{ margin: '0 14px 10px', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}><Emoji e="🎰"/> 로맨스 시드라인 생성기</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>배경·남주·여주·셋업·텐션·무드·결말 7칸 무작위 조합</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700 }} title={`${SEED_COMBOS.toLocaleString()}가지`}>조합 {fmtCombos(SEED_COMBOS)}가지</span>
          <button className="minibtn" onClick={drawSeedlines} title="한 줄 설정 3개 무작위 생성"><Emoji e="🎲"/> 시드라인 뽑기</button>
        </div>
        {seedlines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {seedlines.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, lineHeight: 1.6 }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{l}</span>
                <button style={tinyBtn} title="이 시드라인 복사" onClick={() => copyText(l, '시드라인 복사됨')}><Emoji e="📋"/></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button style={tinyBtn} onClick={drawSeedlines} title="다시 뽑기">↻ 다시</button>
              <button style={tinyBtn} onClick={() => copyText(seedlines.map((s) => '• ' + s).join('\n'), '시드라인 전체 복사됨')} title="전체 복사"><Emoji e="📋"/> 전체</button>
              <button style={tinyBtn} onClick={seedToSnippet} title="글감(스니펫)으로 저장"><Emoji e="💡"/> 글감 저장</button>
            </div>
          </div>
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
                    {cat.kind === 'trope' && <span style={kindBadge(cat.kind)}>조합 대상</span>}
                    {cat.kind === 'trap' && <span style={{ ...kindBadge(cat.kind), color: 'var(--warn)', borderColor: 'var(--warn)' }}>함정·비틀기</span>}
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
          <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre })} title="정서 곡선 설계"><Emoji e="📈"/> 감정 곡선</button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, 카테고리 머리글로 펼치거나 접으세요. <b>조합 대상</b> 카테고리(정서 엔진·셋업·원형·하위유형·클라이맥스)에서 고른 트로프 수로 가능한 조합 수가 계산됩니다.
          <b>함정·비틀기</b>는 "내 글에 이 함정이 있나?"를 점검하는 칸 — 체크된 함정의 <b style={{ color: 'var(--accent)' }}>비틀기</b>를 보강 지점으로 삼으세요. 기본 항목도 수정·삭제할 수 있고, 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
