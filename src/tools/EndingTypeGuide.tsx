// 결말 유형 가이드 — 해피/비극/씁쓸한/열린/반전/순환 등 결말 유형별
//   효과·조건·함정·예시를 정리하고, 내 작품의 결말 메모를 관리한다.
//   · 가이드: 12종 결말 유형. 각 유형마다 정의·효과·성립 조건·흔한 함정·자작 예시·궁합 장르·연출 팁.
//     펼침/검색/무작위(룰렛)/복사. 모든 예시·설명은 직접 쓴 창작 텍스트(저작권 안전).
//   · 메모: 내 작품의 결말 아이디어를 유형 태그와 함께 CRUD. localStorage 영속.
//   연계: addToProject(folder:'구조'), addToStash, addToLibrary('snippets'), openToolLinked('climax-designer').
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·미디어 불필요(100% 로컬).
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  addToLibrary,
  openToolLinked,
  Emoji,
  emojify,
} from './linkbus'

export const meta = {
  id: 'ending-type-guide',
  name: '결말 유형 가이드',
  icon: '🎬',
  group: '구상·정리',
  intro: '해피·비극·씁쓸·열린·반전·순환 등 결말 유형별 효과·조건·함정·예시를 정리하고 내 결말 메모를 관리합니다',
  w: 640,
  h: 720,
}

const LS = 'sry:tool:ending-type-guide'

type Mode = 'guide' | 'memo'

interface EndingType {
  id: string
  name: string
  icon: string
  color: string            // var(--*) 또는 직접 색
  tagline: string          // 한 줄 정의
  desc: string             // 자세한 설명
  effects: string[]        // 독자에게 주는 효과
  conditions: string[]     // 이 결말이 설득력 있으려면 갖춰야 할 조건
  pitfalls: string[]       // 흔한 함정
  example: string          // 같은 가상 사건을 이 결말로 쓴 자작 예시
  genres: string[]         // 궁합이 좋은 장르/분위기
  craft: string            // 연출 팁
}

// ── 12종 결말 유형 (전부 직접 쓴 창작 — 저작권 안전) ──
const TYPES: EndingType[] = [
  {
    id: 'happy',
    name: '해피 엔딩',
    icon: '🌅',
    color: 'var(--ok)',
    tagline: '주인공이 목표를 이루고 갈등이 해소되며 보상을 받는다.',
    desc: '욕망이 충족되고 관계가 회복되며, 세계가 이전보다 나아진 상태로 막을 내린다. 독자는 안도와 만족을 얻는다. 다만 "쉽게" 행복해지면 가치가 떨어지므로, 대가를 치른 뒤의 행복일수록 깊다.',
    effects: ['안도와 충족감', '여정에 대한 보상감', '재독 의욕·호감', '정서적 카타르시스'],
    conditions: ['주인공이 충분히 고생하고 성장했을 것', '행복이 "거저"가 아니라 대가·선택의 결과일 것', '갈등의 핵심이 실제로 해소될 것', '복선·떡밥이 회수될 것'],
    pitfalls: ['데우스 엑스 마키나(우연한 구원)로 손쉽게 해결', '갈등을 회피한 채 봉합만 함', '조연·악역의 처리가 어물쩍', '감정 과잉으로 신파가 됨'],
    example: '오래 닫혀 있던 가게 문이 다시 열렸다. 진우는 낡은 간판을 새로 칠하고, 첫 손님에게 차를 내밀었다. 가게를 지키려 잃은 것이 많았지만, 그 자리에 앉아 김이 오르는 잔을 바라보는 지금은 후회되지 않았다.',
    genres: ['로맨스', '성장담', '가족극', '동화·아동'],
    craft: '절정의 대가를 한 번 더 환기한 뒤 보상을 주면 값어치가 커진다. 마지막 이미지는 "회복된 일상"의 구체적 디테일 하나로.',
  },
  {
    id: 'tragic',
    name: '비극',
    icon: '🥀',
    color: '#b5546b',
    tagline: '주인공이 파멸하거나 목표에 도달하지 못하고 무너진다.',
    desc: '결함(하마르티아)이나 거대한 운명·구조에 의해 주인공이 패배·죽음·상실에 이른다. 독자는 슬픔과 함께 "그럴 수밖에 없었다"는 필연을 느끼며 정화(카타르시스)를 경험한다.',
    effects: ['깊은 비애·연민', '운명의 필연성 자각', '강한 여운·각인', '주제의 무게 부각'],
    conditions: ['파멸의 씨앗(결함·선택)이 초반부터 심겨 있을 것', '주인공이 충분히 매력적이어서 상실이 아플 것', '우연이 아니라 인과·필연으로 무너질 것', '독자가 막을 수 있었다고 느낄 여지(연민의 거리)'],
    pitfalls: ['고통을 위한 고통(의미 없는 가학)', '갑작스러운 죽음으로 충격만 노림', '주인공이 무력하기만 해 답답함', '구원의 가능성을 한 번도 안 보여줌'],
    example: '강을 막겠다던 약속을 끝내 지키지 못했다. 둑은 그가 쌓은 손으로 무너졌고, 물은 마을을 삼켰다. 진우는 떠내려가는 지붕 위에서 자신이 외면했던 그날의 경고를 떠올렸다. 너무 늦은 깨달음이었다.',
    genres: ['고전 비극', '느와르', '문예·순문학', '전쟁·역사'],
    craft: '파멸 직전 "다른 길"을 잠깐 비추면 비극이 더 아프다. 결함은 미덕의 그림자(용기→무모, 사랑→집착)로 설계하면 설득력이 커진다.',
  },
  {
    id: 'bittersweet',
    name: '씁쓸한 결말',
    icon: '🍂',
    color: 'var(--warn)',
    tagline: '얻은 것과 잃은 것이 공존한다. 승리에 대가가 따른다.',
    desc: '목표는 이뤘으나 소중한 것을 잃었거나, 패배했지만 무언가를 지킨다. 기쁨과 슬픔이 한 장면에 섞여 가장 현실에 가까운 여운을 남긴다. 어른의 결말.',
    effects: ['복합적 여운(미소+눈물)', '현실감·성숙함', '오래 곱씹게 되는 깊이', '감정의 양가성'],
    conditions: ['얻음과 잃음이 둘 다 또렷하고 인과적일 것', '교환된 두 가치가 비등하게 무거울 것', '주인공이 그 거래를 (반쯤은) 받아들일 것', '마지막 정서가 한쪽으로 완전히 기울지 않을 것'],
    pitfalls: ['손실이 형식적이라 결국 해피처럼 읽힘', '얻은 것이 약해 그냥 비극처럼 읽힘', '양가감정을 설명으로만 처리(보여주지 않음)', '미련을 과장해 신파로'],
    example: '마을은 살아남았다. 다만 그 대가로 진우의 가게는 물에 잠겼다. 사람들이 고맙다며 손을 잡아 올 때, 그는 웃으며 고개를 끄덕였지만 시선은 자꾸 물에 잠긴 간판 쪽으로 향했다.',
    genres: ['성장담', '멜로', '드라마', '전쟁·재난'],
    craft: '마지막 이미지에 기쁨의 상징과 상실의 상징을 한 프레임에 같이 둔다. 인물은 말로 정리하지 말고 시선·행동으로 양가감정을 흘린다.',
  },
  {
    id: 'open',
    name: '열린 결말',
    icon: '🚪',
    color: 'var(--accent)',
    tagline: '결말을 단정하지 않고 해석을 독자에게 맡긴다.',
    desc: '핵심 질문에 명확한 답을 주지 않고, 가능성을 열어둔 채 끝낸다. 독자가 능동적으로 의미를 완성한다. 정서적 종결(감정선)은 주되 사건의 결말(플롯)은 비워두는 형태가 흔하다.',
    effects: ['능동적 해석·토론 유발', '여운과 상상의 여지', '주제의 울림 지속', '재독·재해석 가치'],
    conditions: ['열어둘 질문이 분명히 제기되어 있을 것', '정서적 종결은 어느 정도 주어 "미완"이 아니게', '복선이 어느 해석으로든 닿게 설계', '열림이 "회피"가 아니라 "선택"으로 읽힐 것'],
    pitfalls: ['그냥 안 끝낸 것처럼 보임(게으름으로 오해)', '단서가 없어 어떤 해석도 불가능', '핵심 갈등까지 통째로 방치', '독자가 배신감을 느낄 만큼 급정거'],
    example: '진우는 짐을 꾸려 역으로 향했다. 매표소 앞에서 그는 한참 시간표를 올려다보았다. 북쪽 행과 남쪽 행, 두 열차가 같은 시각에 떠난다고 적혀 있었다. 그가 어느 줄에 섰는지, 이야기는 말하지 않는다.',
    genres: ['문예·순문학', '미스터리', '예술영화', '단편'],
    craft: '마지막 문장은 결정의 순간 "직전"에서 끊는다. 정서는 닫고 사실은 연다 — 인물이 무엇을 느끼는지는 분명히, 무엇을 할지는 모호하게.',
  },
  {
    id: 'twist',
    name: '반전 결말',
    icon: '🔄',
    color: '#7a6cff',
    tagline: '마지막에 진실이 뒤집혀 앞의 의미가 재배열된다.',
    desc: '독자가 믿어온 전제(인물의 정체, 사건의 진상, 시점의 신뢰성)가 결말에서 전복된다. 잘 짜이면 "다시 읽어야 한다"는 강렬한 충동을 준다. 핵심은 "예상 못했으나 돌아보면 필연".',
    effects: ['강렬한 충격·쾌감', '재독 욕구(복선 확인)', '서사 전체의 재해석', '입소문·화제성'],
    conditions: ['반전의 복선이 곳곳에 공정하게 깔려 있을 것', '돌아보면 모순이 없어야(논리적 정합)', '반전이 주제와 연결될 것(트릭만이 아니라)', '독자를 속이되 거짓말로 속이지 않을 것(서술트릭의 윤리)'],
    pitfalls: ['뜬금없는 반전(복선 부재)으로 사기처럼 느껴짐', '반전을 위한 반전(주제와 무관)', '재독 시 드러나는 논리 구멍', '"사실은 꿈/환상"식 김빠지는 처리'],
    example: '경찰이 진우에게 마지막으로 물었다. "그날 둑을 무너뜨린 사람을 봤습니까?" 진우는 거울 쪽으로 천천히 고개를 돌렸다. 유리에 비친 자신의 진흙 묻은 손을, 그는 그제야 처음 보는 것처럼 바라보았다.',
    genres: ['미스터리', '스릴러', '심리극', 'SF'],
    craft: '두 번째 독서를 위한 단서를 본문에 "숨기되 보이게" 둔다. 반전 직후 한 호흡 쉬며 독자가 앞 장면들을 떠올릴 여백을 준다.',
  },
  {
    id: 'circular',
    name: '순환 결말',
    icon: '🔁',
    color: '#3aa6a6',
    tagline: '처음의 자리·상황으로 되돌아오지만 의미가 달라져 있다.',
    desc: '도입의 이미지·대사·장소로 회귀하되, 인물이 거쳐온 변화 때문에 같은 풍경이 다르게 읽힌다. 수미상관(액자) 구조로 완결감과 주제 강조를 동시에 얻는다.',
    effects: ['강한 완결감·균형미', '변화의 가시화(전/후 대비)', '주제의 압축적 각인', '구조적 만족'],
    conditions: ['도입에 회귀할 또렷한 이미지·문장이 있을 것', '돌아온 자리에서 "달라진 것"이 분명할 것', '단순 반복이 아니라 의미의 갱신일 것', '중간 여정이 그 변화를 충분히 정당화할 것'],
    pitfalls: ['그냥 처음 장면을 복사해 변화가 안 보임', '대비가 작위적(억지 수미상관)', '회귀에 집착해 자연스러운 흐름을 해침', '독자가 "제자리걸음"으로 오해'],
    example: '이야기는 진우가 가게 문을 여는 장면에서 시작했고, 이제 그는 다시 같은 문 앞에 선다. 손잡이는 그대로지만 그 손에 들린 열쇠는 두 개가 되었다. 혼자가 아니라는 뜻이었다.',
    genres: ['성장담', '문예', '가족극', '판타지'],
    craft: '도입과 결말에 같은 사물(문·열쇠·잔·창)을 두고, 그 사물 "주변"만 바꾼다. 같은 문장을 한 단어만 바꿔 반복하면 변화가 선명해진다.',
  },
  {
    id: 'cliffhanger',
    name: '클리프행어',
    icon: '🪂',
    color: '#e08a3c',
    tagline: '절정의 긴장 한가운데에서 다음을 기약하며 끊는다.',
    desc: '연재·시리즈에서 다음 편을 기다리게 하려 위기의 정점에서 의도적으로 멈춘다. 한 권/한 화의 작은 갈등은 닫되 더 큰 위협을 열어두는 "닫힌 문, 열린 창" 구조가 안정적이다.',
    effects: ['강한 다음 편 견인', '체류·구독 유지', '커뮤니티 추측·화제', '몰입 지속'],
    conditions: ['직전까지 충분히 긴장을 쌓았을 것', '이번 화의 작은 약속은 지켰을 것(전부 미루면 분노)', '끊는 지점이 "결정적 질문"일 것', '다음 편이 실제로 보상할 것(떡밥 회수 신뢰)'],
    pitfalls: ['매번 똑같은 수법으로 끊어 식상·피로', '아무것도 해결 안 해 독자가 이탈', '인위적 긴장(가짜 위기)', '클리프행어를 다음 화 첫머리에서 김빠지게 해소'],
    example: '문틈으로 들이친 손전등 불빛이 진우의 얼굴을 정확히 비췄다. "거기 누구야." 그가 숨을 멈춘 사이, 발소리가 한 걸음씩 다가왔다. 손잡이가 천천히 돌아가기 시작했다. —다음 화에 계속.',
    genres: ['웹소설·연재', '스릴러', '시리즈물', '드라마'],
    craft: '끊기 전 한 줄은 "감각적 디테일+미완의 동작"으로. 이번 화에서 독자가 던진 질문 하나는 꼭 답해 신뢰를 유지한다.',
  },
  {
    id: 'fullcircle-cost',
    name: '피로스의 승리',
    icon: '🏆',
    color: '#c08457',
    tagline: '이겼지만 잃은 것이 너무 커 승리가 패배처럼 느껴진다.',
    desc: '목표는 분명히 달성했으나, 그 대가가 승리의 의미를 압도한다. 씁쓸한 결말의 극단으로, 승리의 공허함·대가의 무게를 통해 "이길 가치가 있었는가"를 묻는다.',
    effects: ['승리의 공허함·아이러니', '대가에 대한 성찰', '주제적 질문 환기', '서늘한 여운'],
    conditions: ['목표가 명백히 달성되었을 것(애매하면 그냥 비극)', '치른 대가가 목표보다 크게 부각될 것', '승리의 순간에 상실이 동시에 닥칠 것', '주인공(또는 독자)이 그 아이러니를 인식할 것'],
    pitfalls: ['대가가 약해 그냥 해피로 읽힘', '아이러니를 대사로 설명해 버림', '허무주의로만 빠져 의미가 증발', '독자가 "그럴 거면 왜 싸웠나" 공감을 잃음'],
    example: '둑은 끝내 진우의 손으로 막혔다. 물은 멈췄고 마을은 안전했다. 그러나 그가 돌아본 자리에는 그를 도우러 뛰어들었던 동생의 신발 한 짝만이 진흙 위에 놓여 있었다. 그는 이긴 채로 무릎을 꿇었다.',
    genres: ['전쟁·역사', '비극', '느와르', '판타지·대서사'],
    craft: '승리의 환호와 상실의 침묵을 같은 장면에 겹친다. 군중은 기뻐하고 주인공만 멈춰 있는 "대비 구도"가 효과적이다.',
  },
  {
    id: 'redemption',
    name: '속죄·구원 결말',
    icon: '🕊️',
    color: '#5aa6d6',
    tagline: '과오를 지닌 인물이 마지막에 희생·선택으로 자신을 되찾는다.',
    desc: '타락하거나 길을 잃었던 인물이 결정적 순간에 옳은 선택을 하며 도덕적으로 회복된다. 종종 그 대가로 목숨이나 행복을 치른다. 인간에 대한 신뢰를 회복시키는 결말.',
    effects: ['도덕적 카타르시스', '인물에 대한 용서·연민', '희망의 회복', '강한 정서적 보상'],
    conditions: ['인물의 과오가 초중반에 또렷이 제시될 것', '구원이 "거저"가 아니라 대가·시련을 통할 것', '변화의 계기가 점진적으로 쌓여 있을 것', '마지막 선택이 그 인물답되 성장한 것일 것'],
    pitfalls: ['갑작스러운 개심(설득력 없는 180도 전환)', '한 번의 선행으로 모든 죄가 너무 쉽게 청산', '구원이 설교조가 됨', '피해자의 입장을 무시한 일방적 면죄'],
    example: '둑을 무너뜨린 게 자신이라는 걸 모두가 알기 전에, 진우는 가장 깊은 물속으로 먼저 뛰어들었다. 떠내려가던 아이를 밀어 올린 두 손이 마지막으로 한 일이었다. 사람들은 그를 원망하는 대신 그 손을 오래 기억했다.',
    genres: ['드라마', '범죄·느와르', '종교·우화', '판타지'],
    craft: '구원의 선택은 그가 처음 저지른 과오와 "대칭"이 되게 설계한다(불을 지른 자가 불을 끄는 식). 용서는 타인이 아니라 그의 행동이 얻게 한다.',
  },
  {
    id: 'downer',
    name: '다운 엔딩(절망)',
    icon: '🌑',
    color: '#6b6b78',
    tagline: '상황이 시작보다 나빠지고 희망이 닫힌 채 끝난다.',
    desc: '갈등이 인물의 패배로 귀결되며, 세계나 인물이 더 어두운 상태로 남는다. 비극이 "필연의 정화"라면 다운 엔딩은 종종 "구조적 무력"과 경고를 향한다. 디스토피아·사회 비판에서 강력하다.',
    effects: ['서늘한 경고·각성', '현실의 부조리 직시', '강한 충격과 불편한 여운', '문제의식 환기'],
    conditions: ['절망이 주제(경고/비판)와 연결될 것', '인물이 끝까지 저항해 무력이 더 아프게', '암흑이 작가의 냉소가 아니라 의도일 것', '독자에게 "생각할 거리"를 남길 것'],
    pitfalls: ['단지 충격을 위한 암울함(허무 포르노)', '인물의 저항이 없어 무의미하게 느껴짐', '구원의 실마리를 한 번도 안 줘 설득 약화', '독자를 학대하는 듯한 가학성'],
    example: '물은 멈추지 않았다. 진우의 경고는 끝내 아무에게도 닿지 못했고, 둑을 짓던 손들은 다음 날 더 높은 둑을 같은 자리에 다시 쌓기 시작했다. 그는 멀어지는 마을을 돌아보며, 자신이 무엇을 막으려 했는지조차 흐려지는 것을 느꼈다.',
    genres: ['디스토피아', '사회비판', '호러', '느와르'],
    craft: '마지막 한 줄에 "반복될 것"이라는 암시를 심으면 경고가 강해진다. 절망 직전 작은 빛을 한 번 보여줬다 꺼뜨리면 더 서늘하다.',
  },
  {
    id: 'ambiguous-moral',
    name: '도덕적 모호 결말',
    icon: '⚖️',
    color: '#9a8c5a',
    tagline: '옳고 그름을 단정하지 않고 판단을 독자에게 넘긴다.',
    desc: '주인공의 선택이 정당한지 단언하지 않는다. 행복도 불행도, 정의도 불의도 어느 한쪽으로 못 박지 않아 윤리적 토론을 유발한다. 열린 결말이 "사건"을 연다면, 이쪽은 "가치 판단"을 연다.',
    effects: ['윤리적 토론·자기 성찰', '인물의 입체성 부각', '단순한 권선징악 회피', '오래 남는 질문'],
    conditions: ['양쪽 입장이 모두 설득력 있게 제시될 것', '작가의 손가락질이 보이지 않을 것(중립적 제시)', '독자가 판단할 충분한 정보를 가질 것', '모호함이 "결정 회피"가 아니라 주제일 것'],
    pitfalls: ['사실은 한쪽을 옹호하면서 중립인 척', '정보 부족으로 판단 자체가 불가', '모든 걸 상대화해 허무로 빠짐', '인물의 동기가 불분명해 공감 실패'],
    example: '진우는 둑을 일부러 무너뜨려 윗마을을 살리고 아랫마을을 잠기게 했다. 윗마을 사람들은 그를 영웅이라 불렀고, 아랫마을 사람들은 살인자라 불렀다. 강물은 그 어느 쪽 말에도 대답하지 않고 흘러갔다.',
    genres: ['문예', '사회극', '법정·정치', '하드 SF'],
    craft: '같은 행동에 대한 두 진영의 호칭(영웅/살인자)을 나란히 둔다. 서술자는 평가어를 쓰지 말고 사실만 적어 판단의 부담을 독자에게 넘긴다.',
  },
  {
    id: 'new-beginning',
    name: '새로운 시작',
    icon: '🌱',
    color: '#5cae6b',
    tagline: '한 이야기가 끝나는 자리에서 다른 여정의 문이 열린다.',
    desc: '주된 갈등은 해소되지만 마지막에 새로운 가능성·여정·세대로 시야가 확장된다. 완결감과 지속감을 동시에 주며, 후속·확장 세계로 자연스럽게 이어지는 발판이 된다.',
    effects: ['희망적 확장감', '완결+여운의 균형', '후속작/세계관 확장 발판', '성장의 결실 확인'],
    conditions: ['주된 갈등은 분명히 닫혀 있을 것', '새 시작이 앞 여정의 "결실"로 보일 것', '확장이 미해결의 떠넘김이 아닐 것', '새 문이 본편 주제와 연결될 것'],
    pitfalls: ['본편을 안 끝내고 후속을 위한 미끼만 던짐', '새 시작이 작위적(억지 떡밥)', '완결감이 약해 "그래서 끝?" 느낌', '확장을 의식해 본편 정서를 희생'],
    example: '가게는 진우의 손을 떠나 어린 견습생에게 넘어갔다. 그가 마지막으로 문을 잠그던 날, 견습생은 새 간판을 들고 골목을 올라오고 있었다. 진우는 열쇠를 건네고 반대편 길로 걸음을 옮겼다. 그의 다음 이야기는 아직 쓰이지 않았다.',
    genres: ['성장담', '판타지·대서사', '시리즈물', '가족극'],
    craft: '본편 주제를 압축한 상징물(간판·열쇠·씨앗)을 다음 세대/다음 여정으로 "건네는" 동작으로 마무리한다.',
  },
]

const GROUP_NOTE = '결말은 "어떻게 끝나는가"가 아니라 "독자가 무엇을 안고 책을 덮는가"입니다. 같은 사건도 어느 유형으로 닫느냐에 따라 작품의 주제가 결정됩니다.'

interface Memo {
  id: string
  title: string
  typeId: string           // 결말 유형 id ('' = 미정)
  body: string             // 결말 아이디어 메모
  updated: number
}

interface Saved {
  mode?: Mode
  memos?: Memo[]
  query?: string
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function uid(): string {
  return 'em_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function typeOf(id: string): EndingType | null {
  return TYPES.find((t) => t.id === id) || null
}

export default function EndingTypeGuide({ payload }: { payload?: Record<string, unknown> }) {
  const [mode, setMode] = useState<Mode>('guide')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>('happy')
  const [rouletteId, setRouletteId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 메모 상태
  const [memos, setMemos] = useState<Memo[]>([])
  const [editing, setEditing] = useState<Memo | null>(null) // 편집/작성 중인 메모

  const flashTimer = useRef<number | null>(null)

  // ── 복원(최초 1회) + payload ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Saved
        if (s.mode === 'guide' || s.mode === 'memo') setMode(s.mode)
        if (Array.isArray(s.memos)) {
          setMemos(
            s.memos
              .filter((m) => m && typeof m.id === 'string')
              .map((m) => ({
                id: m.id,
                title: typeof m.title === 'string' ? m.title : '',
                typeId: typeof m.typeId === 'string' ? m.typeId : '',
                body: typeof m.body === 'string' ? m.body : '',
                updated: typeof m.updated === 'number' ? m.updated : Date.now(),
              })),
          )
        }
        if (typeof s.query === 'string') setQuery(s.query)
      }
    } catch {
      /* 손상된 저장 무시 */
    }
    // payload: 특정 유형 펼치기 / 메모 프리필
    const pType = payload?.typeId
    if (typeof pType === 'string' && typeOf(pType)) {
      setMode('guide')
      setExpanded(pType)
    }
    const pBody = payload?.text
    if (typeof pBody === 'string' && pBody.trim()) {
      setMode('memo')
      setEditing({ id: uid(), title: '', typeId: typeof pType === 'string' ? pType : '', body: pBody, updated: Date.now() })
    }
    setLoaded(true)
    // payload 는 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 자동 저장 ──
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(LS, JSON.stringify({ mode, memos, query } as Saved))
    } catch {
      /* 용량 초과 무시 */
    }
  }, [mode, memos, query, loaded])

  // ── 언마운트 정리 ──
  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    },
    [],
  )

  const flashMsg = (m: string) => {
    setFlash(m)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      setFlash(null)
      flashTimer.current = null
    }, 1800)
  }

  const safeCopy = (txt: string, done: string) => {
    if (!txt) return
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(txt).then(() => flashMsg(done)).catch(() => {
          /* 권한 거부 graceful */
        })
      } else {
        const ta = document.createElement('textarea')
        ta.value = txt
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        flashMsg(done)
      }
    } catch {
      /* 클립보드 미지원 무시 */
    }
  }

  // ── 검색 필터 ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TYPES
    return TYPES.filter((t) => {
      const hay = [
        t.name,
        t.tagline,
        t.desc,
        t.craft,
        ...t.effects,
        ...t.conditions,
        ...t.pitfalls,
        ...t.genres,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query])

  // ── 유형 텍스트 직렬화(복사/내보내기 공용) ──
  const typeToText = (t: EndingType): string =>
    [
      `[${t.name}] ${t.tagline}`,
      '',
      t.desc,
      '',
      `■ 효과: ${t.effects.join(' / ')}`,
      `■ 성립 조건:`,
      ...t.conditions.map((c) => `  · ${c}`),
      `■ 흔한 함정:`,
      ...t.pitfalls.map((p) => `  · ${p}`),
      `■ 궁합: ${t.genres.join(', ')}`,
      `■ 예시:`,
      `  ${t.example}`,
      `■ 연출 팁: ${t.craft}`,
    ].join('\n')

  const typeToHtml = (t: EndingType): string =>
    `<p><b>${escHtml(t.name)}</b> — ${escHtml(t.tagline)}</p>` +
    `<p>${escHtml(t.desc)}</p>` +
    `<p><b>효과</b></p><ul>${t.effects.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` +
    `<p><b>성립 조건</b></p><ul>${t.conditions.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` +
    `<p><b>흔한 함정</b></p><ul>${t.pitfalls.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` +
    `<p><b>궁합</b> ${escHtml(t.genres.join(', '))}</p>` +
    `<p><b>예시</b></p><blockquote>${escHtml(t.example)}</blockquote>` +
    `<p><b>연출 팁</b> ${escHtml(t.craft)}</p>`

  // ── 룰렛: 무작위 유형 펼치기 ──
  const roll = () => {
    const pool = filtered.length ? filtered : TYPES
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setRouletteId(pick.id)
    setExpanded(pick.id)
    flashMsg(`🎲 ${pick.name}`)
  }

  // ── 연계: 유형 가이드 ──
  const addTypeToProject = (t: EndingType) => {
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: `결말 유형 · ${t.name}`,
      bodyHtml: typeToHtml(t),
      meta: { 유형: t.name, 궁합: t.genres.join(', ') },
    })
    flashMsg(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }
  const stashType = (t: EndingType) => {
    addToStash({ kind: 'note', label: `결말 유형: ${t.name}`, text: typeToText(t) })
    flashMsg('수집함에 담았습니다')
  }
  const snippetType = (t: EndingType) => {
    addToLibrary('snippets', { text: typeToText(t), source: '결말 유형 가이드', tags: ['결말', t.name] })
    flashMsg('스니펫으로 저장했습니다')
  }

  // ── 메모 CRUD ──
  const startNew = () => setEditing({ id: uid(), title: '', typeId: '', body: '', updated: Date.now() })
  const startEdit = (m: Memo) => setEditing({ ...m })
  const cancelEdit = () => setEditing(null)
  const saveEdit = () => {
    if (!editing) return
    const title = editing.title.trim() || '제목 없는 결말 메모'
    const rec: Memo = { ...editing, title, updated: Date.now() }
    setMemos((prev) => {
      const exists = prev.some((m) => m.id === rec.id)
      return exists ? prev.map((m) => (m.id === rec.id ? rec : m)) : [rec, ...prev]
    })
    setEditing(null)
    flashMsg('메모를 저장했습니다')
  }
  const deleteMemo = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id))
    if (editing?.id === id) setEditing(null)
    flashMsg('메모를 삭제했습니다')
  }

  const memoToText = (m: Memo): string => {
    const t = typeOf(m.typeId)
    return [`[결말 메모] ${m.title}`, t ? `유형: ${t.name} — ${t.tagline}` : '유형: 미정', '', m.body].join('\n')
  }
  const addMemoToProject = (m: Memo) => {
    const t = typeOf(m.typeId)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: `결말 메모 · ${m.title}`,
      bodyHtml:
        `<p><b>유형</b> ${escHtml(t ? `${t.name} — ${t.tagline}` : '미정')}</p>` +
        (m.body.trim() ? m.body.split(/\n{2,}/).map((p) => `<p>${escHtml(p)}</p>`).join('') : '<p></p>'),
      meta: { 유형: t ? t.name : '미정' },
    })
    flashMsg(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }
  const stashMemo = (m: Memo) => {
    addToStash({ kind: 'note', label: `결말 메모: ${m.title}`, text: memoToText(m) })
    flashMsg('수집함에 담았습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    boxSizing: 'border-box',
    color: 'var(--text)',
    overflow: 'hidden',
    position: 'relative',
  }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, flexShrink: 0 }
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1,
    fontSize: 13,
    padding: '7px 10px',
    borderRadius: 9,
    cursor: 'pointer',
    textAlign: 'center',
    userSelect: 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)',
    fontWeight: active ? 700 : 400,
  })
  const scroll: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingRight: 2,
  }
  const card: React.CSSProperties = {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
  }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const pill = (color: string, filled = false): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 700,
    color: filled ? 'var(--paper)' : color,
    background: filled ? color : 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 6,
    padding: '1px 7px',
    whiteSpace: 'nowrap',
  })
  const input: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    background: 'var(--paper)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 9,
    padding: '8px 11px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  }
  const taStyle: React.CSSProperties = {
    ...input,
    minHeight: 90,
    maxHeight: 220,
    resize: 'vertical',
    lineHeight: 1.6,
  }
  const quote: React.CSSProperties = {
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    borderRadius: 9,
    padding: '9px 12px',
    fontSize: 13.5,
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontStyle: 'italic',
  }
  const empty: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: 'var(--muted)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 1.6,
    padding: 16,
  }

  const combos = TYPES.length

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="🎬" /> <b>결말 유형 가이드</b> — {GROUP_NOTE}
      </div>

      <div style={tabRow}>
        <span style={tab(mode === 'guide')} onClick={() => setMode('guide')} role="button" tabIndex={0}>
          <Emoji e="📚" /> 결말 유형 {combos}종
        </span>
        <span style={tab(mode === 'memo')} onClick={() => setMode('memo')} role="button" tabIndex={0}>
          <Emoji e="📝" /> 내 결말 메모 {memos.length > 0 ? `(${memos.length})` : ''}
        </span>
      </div>

      {mode === 'guide' ? (
        <>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              style={{ ...input, flex: 1, minWidth: 120 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="유형·효과·장르 검색 (예: 비극, 토론, 연재)"
              aria-label="결말 유형 검색"
            />
            {query && (
              <button className="minibtn" onClick={() => setQuery('')} type="button">
                지우기
              </button>
            )}
            <button className="minibtn" onClick={roll} type="button" title="무작위로 한 유형 펼치기">
              <Emoji e="🎲" /> 룰렛
            </button>
          </div>
          <div style={{ ...hint, fontSize: 11, flexShrink: 0 }}>
            총 {combos}가지 결말 유형 · {filtered.length}개 표시{rouletteId ? ` · 룰렛: ${typeOf(rouletteId)?.name}` : ''}
          </div>

          {filtered.length === 0 ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}><Emoji e="🔍" /></div>
              <div>
                「{query}」에 맞는 결말 유형이 없습니다.
                <br />
                다른 말로 검색해 보세요.
              </div>
            </div>
          ) : (
            <div style={scroll}>
              {filtered.map((t) => {
                const open = expanded === t.id
                return (
                  <div
                    key={t.id}
                    style={{ ...card, borderColor: open ? t.color : 'var(--border)', borderLeft: `4px solid ${t.color}` }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }}
                      onClick={() => setExpanded(open ? null : t.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <span style={{ fontSize: 18 }}><Emoji e={t.icon} /></span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: t.color }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, minWidth: 80 }}>{t.tagline}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {open && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{t.desc}</div>

                        <div>
                          <div style={sectionTitle}>독자에게 주는 효과</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {t.effects.map((e, i) => (
                              <span key={i} style={pill(t.color)}>
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={sectionTitle}><Emoji e="✅" /> 성립 조건 (이게 갖춰져야 설득력 있음)</div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                            {t.conditions.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div style={{ ...sectionTitle, color: 'var(--warn)' }}><Emoji e="⚠️" /> 흔한 함정</div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--warn)' }}>
                            {t.pitfalls.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div style={sectionTitle}>예시 (같은 사건을 이 결말로)</div>
                          <div style={quote}>{t.example}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ ...sectionTitle, marginRight: 2 }}>궁합</span>
                          {t.genres.map((g, i) => (
                            <span key={i} style={{ ...pill('var(--muted)'), fontWeight: 400 }}>
                              {g}
                            </span>
                          ))}
                        </div>

                        <div style={{ ...hint, fontSize: 12 }}>
                          <b style={{ color: 'var(--text)' }}>연출 팁</b> · {t.craft}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            className="minibtn"
                            onClick={() => safeCopy(typeToText(t), '유형 설명을 복사했습니다')}
                            type="button"
                          >
                            <Emoji e="📋" /> 복사
                          </button>
                          <button
                            className="minibtn"
                            onClick={() => {
                              setMode('memo')
                              setEditing({ id: uid(), title: `${t.name} 결말 구상`, typeId: t.id, body: '', updated: Date.now() })
                            }}
                            type="button"
                            title="이 유형으로 내 결말 메모를 시작합니다"
                          >
                            <Emoji e="📝" /> 이 유형으로 메모
                          </button>
                          <button
                            className="linkbtn"
                            onClick={() => addTypeToProject(t)}
                            disabled={!hasProjectBridge()}
                            title={hasProjectBridge() ? '이 유형 설명을 프로젝트 자료(구조)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                          >
                            <Emoji e="📄" /> 프로젝트에 추가
                          </button>
                          <button className="linkbtn" onClick={() => snippetType(t)} title="스니펫 라이브러리에 저장">
                            <Emoji e="✂️" /> 스니펫
                          </button>
                          {hasStash() && (
                            <button className="linkbtn" onClick={() => stashType(t)} title="수집함에 담기">
                              <Emoji e="📥" /> 수집함
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
            <button
              className="linkbtn"
              onClick={() => openToolLinked('climax-designer')}
              title="절정 설계 도구를 엽니다 — 결말로 향하는 클라이맥스를 함께 설계"
            >
              <Emoji e="🔥" /> 절정 설계 열기
            </button>
            {flash && (
              <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>
                ✓ {emojify(flash)}
              </span>
            )}
          </div>
          <div style={hint}>
            결말을 정하기 전에 절정(클라이맥스)이 어떤 선택과 대가를 만드는지 먼저 설계하면, 결말 유형이 자연스럽게 따라옵니다.
          </div>
        </>
      ) : (
        <>
          {editing ? (
            // ── 메모 편집/작성 폼 ──
            <div style={scroll}>
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {memos.some((m) => m.id === editing.id) ? '결말 메모 수정' : '새 결말 메모'}
                </div>
                <input
                  style={input}
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="제목 (예: 3장 — 둑 장면의 결말)"
                  aria-label="메모 제목"
                />
                <div>
                  <div style={sectionTitle}>결말 유형</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    <span
                      style={{ ...pill('var(--muted)', editing.typeId === ''), cursor: 'pointer' }}
                      onClick={() => setEditing({ ...editing, typeId: '' })}
                      role="button"
                      tabIndex={0}
                    >
                      미정
                    </span>
                    {TYPES.map((t) => (
                      <span
                        key={t.id}
                        style={{ ...pill(t.color, editing.typeId === t.id), cursor: 'pointer' }}
                        onClick={() => setEditing({ ...editing, typeId: t.id })}
                        role="button"
                        tabIndex={0}
                        title={t.tagline}
                      >
                        <Emoji e={t.icon} /> {t.name}
                      </span>
                    ))}
                  </div>
                  {typeOf(editing.typeId) && (
                    <div style={{ ...hint, fontSize: 11, marginTop: 5 }}>{typeOf(editing.typeId)!.tagline}</div>
                  )}
                </div>
                <textarea
                  style={taStyle}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  placeholder="이 결말에서 무슨 일이 벌어지나? 누가 무엇을 얻고 잃나? 마지막 이미지/문장은? 회수할 복선은?"
                  spellCheck={false}
                  aria-label="메모 본문"
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn-primary" onClick={saveEdit} type="button">
                    저장
                  </button>
                  <button className="minibtn" onClick={cancelEdit} type="button">
                    취소
                  </button>
                  <span style={{ flex: 1 }} />
                  {editing.typeId && (
                    <button
                      className="minibtn"
                      onClick={() => {
                        setMode('guide')
                        setExpanded(editing.typeId)
                      }}
                      type="button"
                      title="이 유형의 가이드를 봅니다"
                    >
                      <Emoji e="📚" /> 유형 보기
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // ── 메모 목록 ──
            <>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={startNew} type="button">
                  ＋ 새 결말 메모
                </button>
                <span style={{ ...hint, flex: 1 }}>
                  {memos.length > 0 ? `${memos.length}개의 결말 아이디어` : '내 작품의 결말 후보를 유형과 함께 기록하세요.'}
                </span>
              </div>

              {memos.length === 0 ? (
                <div style={empty}>
                  <div style={{ fontSize: 30 }}><Emoji e="📝" /></div>
                  <div>
                    아직 결말 메모가 없습니다.
                    <br />
                    여러 결말 후보를 적어두고 유형별 효과·함정을 견주어 보세요.
                  </div>
                  <button className="minibtn" onClick={startNew} type="button">
                    첫 메모 작성
                  </button>
                </div>
              ) : (
                <div style={scroll}>
                  {memos.map((m) => {
                    const t = typeOf(m.typeId)
                    return (
                      <div key={m.id} style={{ ...card, borderLeft: `4px solid ${t ? t.color : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 80, wordBreak: 'break-word' }}>
                            {emojify(m.title)}
                          </span>
                          {t ? (
                            <span style={pill(t.color)}>
                              <Emoji e={t.icon} /> {t.name}
                            </span>
                          ) : (
                            <span style={{ ...pill('var(--muted)'), fontWeight: 400 }}>유형 미정</span>
                          )}
                        </div>
                        {m.body.trim() && (
                          <div
                            style={{
                              fontSize: 13,
                              lineHeight: 1.6,
                              marginTop: 6,
                              color: 'var(--text)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {emojify(m.body)}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                          <button className="minibtn" onClick={() => startEdit(m)} type="button">
                            ✎ 수정
                          </button>
                          <button
                            className="minibtn"
                            onClick={() => safeCopy(memoToText(m), '메모를 복사했습니다')}
                            type="button"
                          >
                            <Emoji e="📋" /> 복사
                          </button>
                          <button
                            className="linkbtn"
                            onClick={() => addMemoToProject(m)}
                            disabled={!hasProjectBridge()}
                            title={hasProjectBridge() ? '이 메모를 프로젝트 자료(구조)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                          >
                            <Emoji e="📄" /> 프로젝트에 추가
                          </button>
                          {hasStash() && (
                            <button className="linkbtn" onClick={() => stashMemo(m)} title="수집함에 담기">
                              <Emoji e="📥" /> 수집함
                            </button>
                          )}
                          <span style={{ flex: 1 }} />
                          <button
                            className="minibtn"
                            onClick={() => deleteMemo(m.id)}
                            type="button"
                            style={{ color: 'var(--warn)' }}
                            title="이 메모 삭제"
                          >
                            <Emoji e="🗑" /> 삭제
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
                <button
                  className="linkbtn"
                  onClick={() => openToolLinked('climax-designer')}
                  title="절정 설계 도구를 엽니다"
                >
                  <Emoji e="🔥" /> 절정 설계 열기
                </button>
                {flash && (
                  <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>
                    ✓ {emojify(flash)}
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="license-note" style={{ ...hint, fontSize: 11 }}>
        모든 설명·예시는 직접 작성한 창작 텍스트입니다. 외부 API·이미지·폰트를 쓰지 않으며 전부 로컬에서 동작합니다.
      </div>
    </div>
  )
}
