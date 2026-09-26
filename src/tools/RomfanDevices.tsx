// 로맨스판타지 서사장치·전개법 사전 — 로판 고유의 서사 장치와 전개/구조 패턴·페이싱·
// 클라이맥스 관습을 정의+사용법+예시+비틀기로 정리. 카테고리 펼침 + 검색 + 무작위 +
// 클릭복사 + 프로젝트/스니펫/관련도구 연계. 자급식: react 와 './linkbus' 외 import 없음.
// 데이터는 본 파일 내 자작(로판 도시에 근거 — 회빙환·악역영애·원작강제력·집착/후회·사이다/고구마 등).
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, type ToolPayload,
} from './linkbus'

export const meta = {
  id: 'romfan-devices',
  name: '로판 서사장치·전개법 사전',
  icon: '👑',
  group: '장치·전개',
  genre: '로맨스판타지',
  intro: '회빙환·악역영애·원작강제력·집착/후회·사이다… 로판 고유 장치와 전개·페이싱·클라이맥스 관습을 정의+사용법+예시+비틀기로',
  w: 640,
  h: 680,
}

// ── 데이터 모델 ──
interface Device {
  name: string          // 장치/패턴 이름
  alias?: string        // 별칭/장르 밈
  def: string           // 정의
  use: string           // 사용법(쓰는 법)
  ex: string            // 구체 예시(로판 장면/대표 코드)
  twist: string         // 비틀기(클리셰 탈출/변주)
  tags?: string[]       // 검색 보조 태그
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 로판 도시에 근거 자작 데이터: 7개 카테고리 ──
const CATS: CatDef[] = [
  {
    key: 'core', label: '핵심 서사장치(회빙환)', icon: '🔄',
    desc: '회귀·빙의·환생과 원작 강제력 — 로판을 굴리는 엔진. 미래/원작 정보의 비대칭이 핵심 무기.',
    items: [
      {
        name: '회귀(정보 비대칭)', alias: 'Regression / 회빙환의 回',
        def: '죽거나 파멸한 시점에서 과거로 돌아옴. 여주만 미래를 안다는 비대칭이 복수·예방·선점의 무기이자 트라우마가 된다.',
        use: '회귀 직후 "지난 생에 무엇을 잃었는가"를 1~3화 안에 못 박아 목표(생존/복수/이혼/자유)를 선언한다. 미래 지식과 실제 전개의 어긋남으로 서스펜스를 만들고, 같은 사건을 다르게 통과하는 쾌감을 준다.',
        ex: '처형당한 황후가 결혼 전으로 돌아와, 지난 생의 배신과 죽음을 알고 판을 새로 짜는 『재혼 황후』식 복수·재혼 구조.',
        twist: '남주도 회귀자였음을 후반에 밝혀 비대칭을 양방향으로 뒤집는다("너도… 기억하고 있었어?"). 또는 여주가 아는 미래 자체가 이미 한 번 더 비틀린 가짜 미래라 모든 선점이 빗나가게 한다.',
        tags: ['회귀', '회빙환', '미래정보', '복수', '재혼황후'],
      },
      {
        name: '빙의(소설 속 세계)', alias: 'Possession / 책빙의',
        def: '현대인(또는 다른 인물)이 자신이 읽던 소설·게임 속 인물의 몸에 들어감. 흔히 악역/엑스트라가 되어 "원작 지식"이 무기이자 족쇄가 된다.',
        use: '원작 설정을 독자에게 명확히 공유해 "원작대로면 이렇게 된다"는 기준선을 세운다. 여주의 행동이 원작과 어긋날 때 주변(특히 남주)이 예상 밖 반응을 보이게 해 끌림·서스펜스를 동시에 만든다.',
        ex: '"내가 읽던 소설의 악역 공녀가 되어버렸다" — 원작에선 처형될 엑스트라 영애가 원작 지식으로 파멸 루트를 피해 가는 전개.',
        twist: '여주가 빙의한 "원작"이 사실 누군가 의도적으로 위조·검열한 판본이라, 안다고 믿은 결말이 전부 함정이었다는 메타 반전. 또는 원작 작가가 이 세계에 같이 빙의해 있었다는 설정.',
        tags: ['빙의', '책빙의', '소설속세계', '엑스트라', '원작지식'],
      },
      {
        name: '환생 + 육아 결합', alias: 'Reincarnation',
        def: '아예 다른 생으로 다시 태어남. 로판에선 어린아이로 환생해 어른 보호자들에게 보호·총애받는 육아물과 결합하는 빈도가 높다.',
        use: '전생의 지식·성숙함과 현생의 어린 몸이라는 간극을 코미디·애틋함의 원천으로 쓴다. 어린 여주의 사소한 영민함·다정함이 차가운 어른들을 차례로 함락시키는 "딸바보 도미노"를 설계.',
        ex: '비참하게 죽은 전생을 기억한 채 황녀(또는 공녀)로 다시 태어나, 혀 짧은 말투로 아빠·오빠들을 무장해제시키는 외동딸·딸바보 구도.',
        twist: '환생을 "두 번째"가 아니라 N번째로 만들어, 매 생의 기억이 겹쳐 누적된 권태·달관을 그린다. 또는 환생 전 인물이 사실 이 세계의 가해자였음을 밝혀 속죄 서사로 전환.',
        tags: ['환생', '육아물', '딸바보', '외동딸', '회빙환'],
      },
      {
        name: '원작 강제력 / 정해진 결말', alias: 'Canon Force / 강제력',
        def: '"원작대로면 나는 죽는다"처럼 세계가 정해진 결말로 인물을 떠미는 보이지 않는 힘. 운명을 비트는 시도와 그에 저항하는 세계 사이의 긴장 엔진.',
        use: '강제력을 "규칙"으로 가시화한다(특정 사건이 자꾸 다른 방식으로라도 일어남, 데드라인·예언·시스템 경고). 강제력을 피할수록 더 큰 강제력이 작동하는 압박으로 긴장을 끌어올린다.',
        ex: '약혼 파기·추방을 피하려 할 때마다 다른 인물·사건이 끼어들어 비슷한 파국으로 떠미는, "결말을 거스르는 자에 대한 세계의 보정".',
        twist: '강제력의 정체가 사실 한 인물(원작 주인공·신·작가)의 집착이었음을 폭로한다. 또는 강제력을 거스르는 데 성공한 대가가 "다른 누군가가 대신 그 결말을 맞는 것"이라는 죄책감 구조.',
        tags: ['원작강제력', '정해진결말', '운명', '파멸루트'],
      },
      {
        name: '스테이터스 창 / 호감도 게이지', alias: 'System / 호감도 UI',
        def: '게임·성좌·시스템 UI를 세계 법칙으로 채택. 로판에선 "남주 호감도 수치", 퀘스트, 상태창, 엔딩 분기 등으로 변주된다.',
        use: '호감도 수치를 긴장 장치로 쓴다(낮으면 처형/추방, 높으면 생존). 수치가 "왜 오르는지/내려가는지" 여주가 끝까지 정확히 모르게 해 오해·코미디를 만든다.',
        ex: '눈앞에 뜬 "남주 호감도 12% — 35% 미만 시 처형 엔딩" 경고를 보고, 살아남으려 호감도를 올리려다 진짜 마음이 섞이는 전개.',
        twist: '호감도 창이 사실 가짜·조작된 정보라 여주가 엉뚱한 사람에게 공들이고 있었다는 반전. 또는 남주에게도 여주의 호감도 창이 보여, 서로의 수치를 의식하는 양방향 시스템.',
        tags: ['시스템', '호감도', '상태창', '게임속세계', '성좌'],
      },
      {
        name: '신탁·예언·꿈(공인된 특별함)', alias: 'Prophecy / 신탁',
        def: '신전·예언서·꿈 등 외부 권위가 여주의 특별함을 공인하는 장치. "예언 속 그 아이/성녀" 클리셰의 토대.',
        use: '예언을 모호하게 써 "누구를 가리키는가"의 해석 싸움을 만든다. 여주의 특별함을 제도(신전·성녀 제도)로 보증해 신분 상승·정치 보호의 명분을 깐다.',
        ex: '"버려진 아이가 제국을 구한다"는 신탁이 천대받던 서출 여주를 가리켰음이 밝혀지며 위상이 뒤집히는 전개.',
        twist: '예언이 복수의 인물을 동시에 가리켜 "진짜 그 아이"가 누구인지 끝까지 흔든다. 또는 예언을 피하려는 모든 행동이 예언을 실현시키는 자기실현 구조.',
        tags: ['예언', '신탁', '성녀', '특별함', '꿈'],
      },
    ],
  },
  {
    key: 'villainess', label: '악역영애·운명전복', icon: '🥀',
    desc: '파멸 플래그를 안 채 시작하는 악역영애 코드와, 정해진 비극을 뒤집는 운명 전복의 기술.',
    items: [
      {
        name: '파멸 플래그 회피', alias: 'Doom Flag Dodge',
        def: '자신이 처형·추방·이혼당할 악역영애임을 알고, 호감도·평판·관계를 재설계해 정해진 비극을 피하는 핵심 구도.',
        use: '"이대로면 나는 ○○당한다"는 플래그를 초반에 분명히 제시한다. 악행을 하지 않거나 정반대로 행동할 때마다 원작 인물들의 어긋난 반응에서 재미를 길어 올린다.',
        ex: '원작에서 여주인공을 괴롭히다 파멸하는 악역 영애가, 빙의 후 오히려 여주인공을 돕고 약혼자에게 먼저 파혼을 청하며 루트를 비트는 전개.',
        twist: '플래그를 피하려는 행동이 새로운 플래그를 세우는 운명의 아이러니. 또는 "악역"이 사실 누명을 쓴 피해자였음을 밝혀 원작의 도덕 구도 자체를 뒤엎는다.',
        tags: ['악역영애', '파멸플래그', '생존', '원작파괴'],
      },
      {
        name: '버려진 출신 → 숨겨진 고귀함', alias: 'Hidden Nobility',
        def: '천대받던 서출·고아·하녀가 사실 황녀·신의 자손·고대 혈통이었음이 드러나는 신분 역전 장치. 보상 서사의 정수.',
        use: '천대의 디테일(차별·멸시)을 충분히 깔아 고구마를 쌓되 짧게 통제한다. 고귀함의 증거(혈통·표식·능력 각성)를 단계적으로 노출해 사이다의 무게를 키운다.',
        ex: '서녀라 무시당하던 영애가 고대 혈통의 표식을 각성하며, 자신을 멸시하던 가문이 손바닥 뒤집듯 태도를 바꾸는 공개 역전.',
        twist: '고귀한 혈통이 축복이 아니라 더 큰 정치적 표적·저주를 부르는 양날. 또는 "숨겨진 고귀함"이 거짓 족보였고, 진짜 가치는 혈통이 아닌 본인의 성취였다고 정산한다.',
        tags: ['신분상승', '서출', '숨겨진혈통', '역전', '보상'],
      },
      {
        name: '운명 전복 선언', alias: 'Fate Reversal',
        def: '"원작대로라면 죽었어야 할 나"가 정반대의 결말(황후·여신·행복)을 쟁취하는, 주제 의식을 정산하는 전복.',
        use: '전복의 출발점에서 "정해진 나"와 "내가 될 나"를 대비시켜 목표를 명확히 한다. 전복의 매 단계가 노력·선택의 인과로 정당화되게 해 "거저 얻은 행운"으로 보이지 않게 한다.',
        ex: '처형대에 올라야 했던 운명을, 미래 지식과 정치력으로 한 칸씩 비틀어 끝내 황후의 관을 쓰는 결말.',
        twist: '전복에 성공했더니 "원작의 비극이 다른 인물에게 옮겨갔음"을 발견해 책임을 묻는다. 또는 여주가 끝내 정해진 결말을 받아들이되 "의미"만 완전히 다르게 바꾸는 정적 전복.',
        tags: ['운명전복', '결말', '주제', '황후', '쟁취'],
      },
      {
        name: '평판·소문 전쟁', alias: 'Reputation Warfare',
        def: '사교계·황궁에서 평판과 소문이 곧 권력인 세계의 정보전. 악역영애가 "악녀"라는 평판을 관리·역이용하는 장치.',
        use: '소문의 출처·확산 경로를 구체적으로 설계해 "한 마디가 어떻게 칼이 되는가"를 보여준다. 여주가 악평을 부정하는 대신 전략적으로 활용·역전시키는 머리싸움을 부각한다.',
        ex: '"미친 공녀"라는 소문을 일부러 방치해 적을 방심시킨 뒤, 결정적 순간 진짜 모습을 드러내 판세를 뒤집는 전개.',
        twist: '여주가 퍼뜨린 줄 안 유리한 소문이 사실 남주가 뒤에서 흘린 것이었다는 조력의 폭로. 또는 평판 게임에서 이겼더니 "진짜 나"를 아무도 모르게 되는 공허를 그린다.',
        tags: ['평판', '소문', '사교계', '정보전', '악녀'],
      },
      {
        name: '약혼 파기·역공', alias: 'Engagement Break',
        def: '원작에서 여주가 공개적으로 파혼·망신당할 장면을, 선수를 쳐 먼저 깨거나 역으로 망신을 되돌려주는 사이다 장치.',
        use: '파혼 장면을 "만인이 보는 공개 무대(연회·졸업식·재판)"에 배치해 역전의 효과를 극대화한다. 선수를 칠 명분(증거·법·계약)을 미리 쌓아 통쾌함이 정당하게 한다.',
        ex: '모두 앞에서 파혼당해 추락할 예정이던 영애가, 도리어 약혼자의 죄상을 폭로하며 먼저 파혼을 선언하고 떠나는 장면.',
        twist: '파혼을 먼저 깬 여주가 "후련함"이 아니라 예상 못 한 상실감에 흔들리게 해 감정을 복잡하게 만든다. 또는 약혼자가 사실 여주를 지키려 일부러 악역을 연기했음을 뒤늦게 밝힌다.',
        tags: ['약혼파기', '파혼', '공개망신', '역공', '사이다'],
      },
      {
        name: '원작 인물과의 어긋남', alias: 'Canon Deviation',
        def: '빙의물에서 여주의 행동이 원작 설정과 어긋나며 주변 인물(특히 남주)이 "예상과 다르게" 반응하는 데서 오는 끌림·서스펜스.',
        use: '"원작의 그는 이러지 않았는데"라는 여주의 내적 당황으로 변화를 체감시킨다. 어긋남이 누적되며 원작 결말이 무너지는 도미노를 차근차근 쌓는다.',
        ex: '원작에선 여주인공만 보던 냉혹한 남주가, 빙의한 여주의 사소한 친절 하나에 예정에 없던 호감을 보이기 시작한다.',
        twist: '어긋남의 원인이 여주가 아니라 "원작 자체가 이미 변형된 판본"이었음을 밝힌다. 또는 남주의 변화가 연기였고, 그가 진실을 다 알고 있었다는 반전.',
        tags: ['원작파괴', '어긋남', '남주변화', '책빙의'],
      },
    ],
  },
  {
    key: 'hero', label: '남주 코드(집착·후회·온리유)', icon: '🖤',
    desc: '강하되 여주에게만 약해지는 "온리 유"의 변주들. 집착·후회·헌신의 강도와 윤리를 조율하는 장치.',
    items: [
      {
        name: '온리 유(외길 헌신)', alias: 'Only You',
        def: '남주는 강하고 유능하되 오직 여주에게만 약해지고 집착·헌신한다. 다른 여성에게 흔들림은 강한 금기.',
        use: '남주의 유능함·위세를 충분히 세운 뒤, 여주 앞에서만 무너지는 낙차로 설렘을 만든다. 과거 여자·양다리의 그림자를 깨끗이 정리해 "온리 유" 계약을 지킨다.',
        ex: '만인 위에 군림하는 황제·대공이 여주 앞에서만 서툴고 약해지며, 그녀의 한마디에 제국의 결정을 바꾸는 낙차.',
        twist: '"온리 유"의 외길이 여주에게 부담·구속이 되는 지점을 짚어, 헌신과 집착의 경계를 인물이 스스로 의식하게 한다. 또는 약해지는 쪽을 여주로 역전시킨다.',
        tags: ['온리유', '헌신', '낙차', '넘버원남주'],
      },
      {
        name: '집착남주(얀데레)', alias: 'Obsessive Hero / 집착광공',
        def: '여주를 향한 과도한 독점욕·집착으로 사랑을 표현하는 남주 유형. 위험과 매혹이 공존한다.',
        use: '집착의 "이유(결핍·트라우마·회귀의 상실)"를 반드시 깔아 단순 폭력과 구분한다. 집착이 여주의 안전·자유·선택권을 침해하지 않는 선을 윤리적으로 의식하며 강도를 조절한다.',
        ex: '여주가 시야에서 사라지면 불안해하고 "도망치지 마, 넌 내 거야"라며 모든 것을 알고 싶어 하는 독점적 남주.',
        twist: '집착의 정체가 사실 "여주를 잃어본 적 있는 회귀자"의 트라우마였음을 밝혀, 정당화 없이도 이해되게 한다. 또는 집착의 방향을 역전해 여주가 집착하고 남주가 도망친다.',
        tags: ['집착', '얀데레', '집착광공', '독점욕', '내것'],
      },
      {
        name: '후회남주(후회물)', alias: 'Regret Plot',
        def: '여주를 버리거나 박대한 뒤, 뒤늦게 진가를 깨닫고 매달리며 후회하는 구도. "내가 잘못했다"의 권력 역전 카타르시스가 핵심.',
        use: '전반부에 가해의 무게를 충분히 쌓아야 후반 후회가 통쾌하다. 후회는 말이 아니라 "대가를 치르는 행동"으로 증명시키고, 쉬운 용서를 금지한다.',
        ex: '냉대하며 이혼을 종용하던 황제가, 그녀가 회귀해 떠난 뒤에야 빈자리의 크기를 깨닫고 무너지지만 돌아오지 않는 그녀.',
        twist: '여주가 후회를 받아주지 않고 완전히 새 삶(새 상대·자기 성취)으로 나아가는 사이다 엔딩. 또는 후회의 진정성을 끝까지 시험하다 마지막에야 한 발만 허락한다.',
        tags: ['후회물', '후회남주', '권력역전', '사이다', '이혼'],
      },
      {
        name: '차가운 남주의 온도 변화', alias: 'Thawing the Ice',
        def: '냉혹·무심하던 남주가 여주에게만 미세하게 누그러지는, "차가운 줄 알았던 온기"의 점진적 해빙 묘사.',
        use: '온도를 감각으로 가시화한다(손끝의 체온, 시선의 길이, 말투의 결). 변화를 본인은 부정하고 독자만 알아채게 해 드라마틱 아이러니를 만든다.',
        ex: '"그의 손끝이 닿자, 차가운 줄로만 알았던 온기가 천천히 번졌다" — 무표정 아래 흔들리는 미세한 균열.',
        twist: '해빙이 여주의 착각이었다가 진짜가 되는 이중 구조. 또는 차가움이 사실 여주를 지키려는 위장이었고, 무심함의 매 순간이 헌신이었음을 역으로 밝힌다.',
        tags: ['차가운남주', '온도', '해빙', '체온', '균열'],
      },
      {
        name: '서브남주·역하렘', alias: 'Second Lead / Reverse Harem',
        def: '여주를 둘러싼 복수의 매력적 남성들(서브공·꽃받침). 넘버원과 넘버투의 경쟁이 질투·선택의 긴장을 만든다.',
        use: '서브남주를 "매력 있되 결정적으로 부족한" 진짜 위협으로 그려 선택의 무게를 만든다. 역하렘이라면 각 남성의 매력 코드를 차별화해 독자 취향을 분산 공략한다.',
        ex: '냉정한 황제(넘버원)와 다정한 기사단장(넘버투) 사이, 여주의 마음과 정치적 이해가 엇갈리는 선택의 긴장.',
        twist: '서브남주에게 자기 서사·해피엔딩을 따로 주어 "탈락자"가 아니게 한다. 또는 넘버투가 사실 흑막이었거나, 여주가 끝내 그 누구도 아닌 자기 길을 택하게 한다.',
        tags: ['서브남주', '역하렘', '꽃받침', '넘버투', '삼각관계'],
      },
      {
        name: '이중 시점(남주 독백 삽입)', alias: 'Dual POV',
        def: '여주 시점으로 가다 결정적 순간 남주 독백을 삽입해 "그가 사실 얼마나 빠졌는지"를 폭로하는 카타르시스 장치.',
        use: '여주가 "그는 날 싫어한다" 믿는 장면 직후 남주 시점을 끼워, 독자만 진실을 알게 한다. 남주 독백에서 어조를 급변시킨다(냉정한 외면 vs 격렬한 내면).',
        ex: '여주가 거절당했다 절망하는 회차 끝에, "그 순간 그는 손톱이 살을 파고들도록 주먹을 쥐고 있었다"는 남주 시점 한 줄.',
        twist: '남주 독백조차 신뢰할 수 없게 만들어(자기기만·거짓말) 독자의 확신을 흔든다. 또는 남주 시점을 아껴 두었다 결말에 한 번에 풀어 그동안의 모든 장면을 재해석하게 한다.',
        tags: ['이중시점', '남주독백', '아이러니', 'POV', '폭로'],
      },
    ],
  },
  {
    key: 'binding', label: '관계 결박·끌림 장치', icon: '🔗',
    desc: '두 인물을 계약·의무·밀착으로 묶어 감정 발생을 강제하는 로판 단골 설정 장치.',
    items: [
      {
        name: '계약 결혼 → 진짜 감정', alias: 'Contract Marriage',
        def: '계약결혼·계약연인·주종 계약이 "처음엔 계약, 나중엔 진심"으로 이행하는 점진 구조. 전환점이 백미.',
        use: '계약 조항(기간·규칙·해지조건)을 명문화해 두면, 그것을 어기는 순간이 곧 감정의 증거가 된다. "이건 계약일 뿐"이라는 자기최면이 깨지는 순간을 클라이맥스 직전에 배치한다.',
        ex: '제국의 안정을 위한 위장 부부 계약을 맺은 두 사람이, 연기하던 다정함이 어느새 진심이 되어 당황하는 전개.',
        twist: '한쪽은 처음부터 진심이었고 계약은 곁에 있을 구실이었음을 폭로한다. 또는 계약을 먼저 깨고 싶어진 쪽이 "연장"을 핑계로 관계를 끄는 자기기만 코미디.',
        tags: ['계약결혼', '계약연애', '위장부부', 'fake to real'],
      },
      {
        name: '정략결혼·의무의 사슬', alias: 'Political Marriage',
        def: '가문의 명령·정치적 동맹으로 "사랑이 아니라 의무로" 묶인 관계에서 진짜 감정이 싹트는 구도. 로판 정치물의 단골.',
        use: '의무의 무게를 충분히 깔아 "마음대로 할 수 없음"을 각인한다. 의무를 다하는 행동 속에 새어나오는 진심을 미세하게 심어 둔다.',
        ex: '제국의 평화를 위한 황제-적국 공녀의 혼인이, 정치적 거래에서 점차 진짜 동반자 관계로 변모하는 전개.',
        twist: '의무를 핑계로 곁에 있던 두 사람이, 정작 의무가 사라지자 "이제 함께 있을 명분이 없다"며 흔들리는 역설.',
        tags: ['정략결혼', '의무', '동맹', '정치', '동반자'],
      },
      {
        name: '강제 동거·밀착', alias: 'Forced Proximity',
        def: '둘을 물리적으로 묶어 감정을 강제 점화시키는 최강 장치. 도망갈 수 없는 공간(한 저택·갇힌 탑·마차 여행)이 끌림을 만든다.',
        use: '"빠져나갈 수 없는 명분"을 먼저 단단히 세운다(혼인·계약·생존). 갇힌 공간의 일상 디테일(식사·잠·다툼)을 통해 거리를 좁힌다.',
        ex: '정략혼으로 한 저택에 묶인 두 사람, 또는 마수에게 쫓겨 좁은 안가에 함께 숨어 지내는 며칠.',
        twist: '밀착의 이유가 사실 한쪽이 꾸민 계략이었음을 후반에 폭로해 신뢰 위기로 전환한다. 또는 갇힌 공간을 "둘만의 안전지대"로 만들어, 바깥세상으로 나가는 순간 관계가 시험받게 한다.',
        tags: ['강제동거', '밀착', '갇힘', '한지붕'],
      },
      {
        name: '주종·기사 서약', alias: 'Knight\'s Oath / 주종',
        def: '호위기사-주군, 전속 기사-영애 등 충성 서약으로 묶인 주종 관계에서 신분과 금기를 넘는 끌림이 자라는 구도.',
        use: '서약의 절대성(목숨을 건 충성)을 먼저 못 박아, 그 선을 넘는 순간의 무게를 만든다. "한 발 물러서야 하는 신분"과 "한 발 다가서고 싶은 마음"의 충돌을 부각한다.',
        ex: '여주를 그림자처럼 지키는 전속 호위기사가, 충성과 사랑 사이에서 무릎 꿇은 채 흔들리는 장면.',
        twist: '주종을 역전해, 사실 기사가 더 높은 혈통이었거나 주군 쪽이 기사에게 매달리게 한다. 또는 서약 자체가 사랑을 가두는 족쇄가 되어 서약을 풀어주는 것이 곧 고백이 된다.',
        tags: ['주종', '기사', '서약', '호위', '신분'],
      },
      {
        name: '비밀 공유의 결속', alias: 'Shared Secret',
        def: '둘만 아는 비밀(정체·회귀·능력)을 함께 지키며 생기는 공모적 친밀감. "우리 둘만"의 결속이 끌림으로 전이된다.',
        use: '비밀을 지키는 행위 자체를 데이트처럼 연출한다(은밀한 눈짓·암호·밤의 밀담). 비밀이 무거울수록 결속이 깊되, 폭로 위험이 곧 텐션이 된다.',
        ex: '정체를 숨긴 황녀와 그 비밀을 알게 된 마탑주가, 들키지 않으려 한편이 되어 가까워지는 전개.',
        twist: '비밀을 공유한 줄 알았는데 한쪽이 더 큰 비밀(회귀·진짜 정체)을 숨기고 있었음을 밝혀 결속을 한순간에 배신으로 뒤집는다.',
        tags: ['비밀', '공모', '정체', '결속'],
      },
      {
        name: '신분·격차의 벽', alias: 'Class Divide',
        def: '황족과 평민, 적국과 본국, 정실과 서출 등 신분제·차별 구조가 사랑의 장애물이자 고구마의 원천이 되는 설정.',
        use: '격차를 "넘을 수 없어 보이는" 구체적 규칙으로 제시한다(가문의 반대·신분법·황실 법도). 격차가 만드는 권력 불균형을 윤리적으로 의식하며 다룬다.',
        ex: '천한 출신이라 멸시받는 여주와 제국 최고위 남주 사이를 가로막는 작위·혼인 규범의 장벽.',
        twist: '격차를 역전시킨다(약자 쪽이 사실 더 큰 힘·혈통을 쥐고 있었다). 또는 격차를 극복하는 게 아니라 "격차를 무의미하게 만드는 제3의 가치(능력·신성력)"로 해소한다.',
        tags: ['신분차', '격차', '계급', '서출', '고구마'],
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '💍',
    desc: '사이다의 정점과 감정의 확정. 로판 클라이맥스는 "공개 역전 + 서로를 선택함"의 결합이다.',
    items: [
      {
        name: '공개 망신 역전', alias: 'Public Reckoning',
        def: '무도회·연회·재판 등 만인 앞에서 악역의 죄가 폭로되고 여주가 공인받는 장면. 사이다의 정점.',
        use: '폭로의 증거·논리를 미리 차곡차곡 깔아 통쾌함이 정당하게 한다. 무대를 가장 공개적인 자리(전 사교계가 보는 연회)에 두고, 악역의 추락과 여주의 격상을 동시에 보여준다.',
        ex: '전 귀족이 모인 연회에서, 그동안 여주를 모함하던 악역의 위조·독살 증거가 차례로 까발려지며 만조백관 앞에서 무너지는 장면.',
        twist: '폭로를 여주가 직접 하지 않고 "악역이 스스로 자멸하도록" 판만 깔아 손에 피 묻히지 않는 우아한 역전. 또는 공개 역전 직후의 공허·외로움을 짚어 사이다 뒤의 여백을 남긴다.',
        tags: ['공개망신', '연회', '폭로', '사이다', '재판'],
      },
      {
        name: '남주의 공개 선택·선언', alias: 'Public Declaration',
        def: '신분·정치적 손해를 감수하고 "이 사람이 내 사람"이라 만인 앞에서 공표하는 결정적 선언.',
        use: '선언의 크기는 남주가 "가장 내려놓기 힘든 것"을 거는 데서 나온다(권력자에겐 왕위·정략혼). 공개성·돌이킬 수 없음이 무게를 더한다.',
        ex: '약혼 파기 후 추락한 여주를, 황제가 만조백관 앞에서 황후로 지목하거나 왕위를 걸고 그녀를 지키겠다 선언하는 장면.',
        twist: '공개 선언을 받는 여주가 곧바로 받아주지 않게 한다(선언만으론 부족, 변화의 지속을 요구). 또는 그랜드 제스처를 거부하고 "조용히 곁에 머무는 증명"을 택하는 비틀기.',
        tags: ['공개선언', '그랜드제스처', '황후지목', '선택'],
      },
      {
        name: '희생·구원 교차', alias: 'Sacrifice & Rescue',
        def: '한쪽이 위기에 처하고 다른 쪽이 목숨 걸고 구하는, 감정 확정의 결정타. 방향을 교차시키면 더 강하다.',
        use: '구원의 순간에 "포기하는 것"을 함께 건다(목숨·권력·복수). 평소 강자였던 쪽이 약해지거나, 약자였던 쪽이 먼저 구하러 달려가는 역할 전복으로 의외성을 만든다.',
        ex: '여주를 노린 칼 앞에 남주가 대신 몸을 던지거나, 반대로 무력하던 여주가 각성한 신성력으로 죽어가는 남주를 살려내는 장면.',
        twist: '구원이 실패하거나 대가를 치르게 해(능력 상실·기억 소거) 승리에 그늘을 드리운다. 또는 "구해주지 마, 내가 선택한 거야"라며 일방적 희생을 거부하는 상호성의 회복.',
        tags: ['희생', '구원', '교차', '결정타', '신성력'],
      },
      {
        name: '비밀 폭로 → 포용', alias: 'Reveal & Embrace',
        def: '회귀·빙의·정체의 비밀이 남주에게 밝혀지지만, 거부가 아닌 포용으로 귀결되어 집착·헌신이 강화되는 해소.',
        use: '폭로 직전 "거부당할까" 하는 여주의 두려움을 충분히 쌓는다. 남주의 반응을 분노·충격에서 포용으로 한 박자 늦게 이행시켜 안도의 낙차를 만든다.',
        ex: '"사실 나는 회귀자야"라는 고백에, 남주가 "알고 있었어. 그래도 너야"라며 끌어안는 포용의 순간.',
        twist: '포용이 곧장 오지 않고 "왜 진작 말하지 않았느냐"는 상처를 거쳐 한 단계 더 시험받게 한다. 또는 남주가 이미 모든 비밀을 알고 곁에 있었음을 역으로 밝혀 충격을 뒤집는다.',
        tags: ['폭로', '포용', '회귀비밀', '정체', '해소'],
      },
      {
        name: '악역의 인과응보', alias: 'Just Deserts',
        def: '쌓인 악행이 통쾌하게 청산되는 응징. 최근 트렌드는 "과하지 않은 결말" 또는 "자업자득식 자멸"을 선호하기도.',
        use: '응징의 크기를 악행에 정확히 비례시켜 "인과적 정산"의 만족을 준다. 여주가 직접 단죄하기보다 악역이 제 꾀에 넘어가 무너지도록 설계해 품위를 지킨다.',
        ex: '여주를 독살하려던 계략이 부메랑처럼 돌아와, 악역이 스스로 판 함정에 빠져 몰락하는 자멸형 결말.',
        twist: '응징 대신 "무관심한 추방"으로 처리해 "넌 내 분노조차 아깝다"는 더 차가운 사이다를 준다. 또는 악역에게 사연을 부여해 응징에 씁쓸함을 섞는다.',
        tags: ['인과응보', '응징', '자멸', '단죄', '사이다'],
      },
      {
        name: '관계의 최종 선택', alias: 'The Climactic Choice',
        def: '로판의 진짜 클라이맥스. 악역을 처치하고 권력·복수를 다 이뤄도, 두 사람이 서로를 선택하지 않으면 절정이 아니다.',
        use: '외부 사건의 해결과 "서로를 선택하는 결단"을 분리해 후자에 절정의 무게를 싣는다. 선택에는 반드시 포기하는 것(다른 길·안전·자존심)이 따라야 무게가 산다.',
        ex: '황후의 관도 복수도 다 이룬 뒤, "그래도 네 곁이어야 한다"며 모든 것을 두고 그에게 돌아가는 선택.',
        twist: '두 사람이 동시에, 서로 모르게 같은 결정을 내려 한 지점에서 마주치게 한다(운명적 교차). 또는 "선택"의 대상이 사랑이 아니라 자기 자신·자유가 되게 한다.',
        tags: ['최종선택', '클라이맥스', '결단', '결합'],
      },
    ],
  },
  {
    key: 'structure', label: '구조·매크로 전개', icon: '🧭',
    desc: '프롤로그(파멸)→각성→셋업→관계→갈등→위기→클라이맥스→후일담의 로판 표준 흐름.',
    items: [
      {
        name: '프롤로그(전생·죽음·파멸)', alias: 'Tragic Prologue',
        def: '비극적 결말 또는 충격적 현재(처형·이혼·배신)를 먼저 제시해 "왜 이 상황인지"를 강하게 후킹하는 시작.',
        use: '1~3화 안에 충격 장면을 던져 회귀·빙의의 동기를 각인한다. 프롤로그의 비극이 본편 내내 회수될 떡밥·트라우마가 되도록 디테일을 심는다.',
        ex: '"내가 죽고 나서야 그는 후회했다" — 처형대/이혼 서류/배신의 장면을 프롤로그로 던진 뒤 회귀로 잇는다.',
        twist: '프롤로그의 "비극"이 사실 시점·정보가 왜곡된 장면이라, 본편에서 같은 사건의 진실이 정반대로 드러나게 한다.',
        tags: ['프롤로그', '파멸', '죽음', '후킹', '떡밥'],
      },
      {
        name: '회귀·빙의 각성(목표 선언)', alias: 'Awakening',
        def: '"다시 시작이다" — 생존/복수/이혼/자유 중 무엇을 향할지 목표를 선언하는, 여정의 출발 비트.',
        use: '각성 직후 여주의 무기(미래 지식·능력)와 목표를 분명히 한다. 첫 행동을 "원작/전생과 다른 선택"으로 잡아 변화의 시작을 가시화한다.',
        ex: '눈을 떠 보니 결혼식 전날 — "이번엔 절대 그와 결혼하지 않겠다"며 첫 수를 두는 각성 장면.',
        twist: '목표를 일부러 어긋나게 잡게 해(복수를 택했지만 사실 필요한 건 화해), 중반에 목표 자체가 전복되게 한다.',
        tags: ['각성', '목표선언', '시작', '회귀', '빙의'],
      },
      {
        name: '초반 25화 생존선', alias: 'First 25 Survival Line',
        def: '무료분(보통 1~25/30화) 안에 핵심 매력(여주 능력+남주 떡밥+세계관 후킹)을 다 보여줘야 유료 전환·연독률을 확보하는 셋업 원칙.',
        use: '초반에 약속한 코드(악역영애·회귀·계약결혼)를 본문이 빠르게 이행한다. 25화 안에 여주의 무기, 남주와의 케미, 세계관 갈등을 압축해 노출한다.',
        ex: '1~3화 회귀·빙의 선언 → 10화 내 남주와 첫 접촉·케미 → 25화 내 첫 사이다와 세계관 후킹 완료.',
        twist: '메인 코드를 초반에 충실히 보여준 뒤, 25화 즈음 "숨은 두 번째 코드"를 풀어 신선함을 더한다(예: 악역영애물인 줄 알았는데 남주도 회귀자).',
        tags: ['초반', '생존선', '연독', '셋업', '무료분'],
      },
      {
        name: '관계 형성기(적대→공유)', alias: 'Relationship Build',
        def: '적대·계약·무관심에서 시작해 사건을 함께 겪으며 거리를 좁히는 단계. 끌림을 관계로 격상시키는 구간.',
        use: '두 사람이 "함께 통과하는 사건"을 마일스톤으로 배치한다(공동의 위기·비밀·임무). 호칭·말투·거리의 변화로 진척을 가시화한다.',
        ex: '암살 위협을 함께 넘기며 호위기사와 영애가, 또는 정치적 공동의 적을 두고 황제와 황비가 한편이 되어 가까워지는 전개.',
        twist: '거리를 일부러 후퇴시켜(반말→다시 존댓말) 긴장을 만든 뒤 더 큰 진척으로 회수한다. 단, 정체되면 "고구마"가 되니 작은 진척이라도 끼워 넣는다.',
        tags: ['관계형성', '적대', '공유', '진척', '마일스톤'],
      },
      {
        name: '중반 갈등(질투·라이벌·음모)', alias: 'Midgame Conflict',
        def: '라이벌 여캐·약혼 방해·가문/정치 음모·오해 누적으로 관계를 시험하는 중반 구간.',
        use: '갈등을 항상 "이 사건이 둘 사이를 얼마나 가깝/멀게 했는가"로 관계에 종속시킨다. 오해는 인물의 상처·세계관에서 필연적으로 발생하게 한다.',
        ex: '여주의 자리를 노리는 라이벌 영애의 모함, 정적의 음모, 과거 연인의 등장으로 신뢰가 흔들리는 중반.',
        twist: '라이벌을 "미워할 수 없는 좋은 사람"으로 만들어 죄책감을 더한다. 또는 음모의 배후가 가장 신뢰하던 인물이었음을 밝혀 갈등을 갱신한다.',
        tags: ['중반갈등', '질투', '라이벌', '음모', '오해'],
      },
      {
        name: '위기·비밀 폭로 직전', alias: 'Crisis Point',
        def: '큰 오해·정체 발각·죽음 위협·회귀 비밀 폭로 위기가 한곳에 모이는 최저점(블랙 모먼트의 로판 변주).',
        use: '오해의 폭발·비밀의 폭로·외부 압력의 정점을 8부 능선쯤에 한데 모은다. 화해가 "불가능해 보일수록" 이후 결합·포용의 카타르시스가 커진다.',
        ex: '회귀 비밀이 들킬 위기와 정적의 결정타가 겹치며, 두 사람이 서로에게 등을 돌리는 최저점.',
        twist: '위기의 원인을 외부 음모가 아닌 "두 사람 각자의 진짜 결함"에 두어 화해가 곧 성장이 되게 한다. 또는 가짜 위기 뒤에 진짜 위기를 한 번 더 친다.',
        tags: ['위기', '블랙모먼트', '폭로', '최저점'],
      },
      {
        name: '결말·후일담(외전)', alias: 'HEA & Side Story',
        def: '결혼·즉위·육아·일상 행복으로 맺는 해피엔딩, 그리고 달달함을 더하는 외전(번외·남주 시점·미래편).',
        use: '결합 자체보다 "그 후의 일상적 행복"을 짧게 보여 약속을 체감시킨다. 외전으로 남주 시점·육아·질투 코미디 등 추가 보상을 주는 것이 로판 관습이다.',
        ex: '대관식·결혼·아이의 탄생을 거친 뒤, "남주 시점으로 다시 본 그때 그 순간" 특별편으로 설렘을 보너스로.',
        twist: '외전에서 "원작이었다면 맞았을 비극"을 한 번 비춰, 전복한 현재의 행복을 더 빛나게 대비시킨다. (단, 본편의 HEA를 뒤집는 새드엔딩은 강한 사전 경고 없이는 금지.)',
        tags: ['HEA', '후일담', '외전', '육아', '해피엔딩'],
      },
    ],
  },
  {
    key: 'pacing', label: '페이싱·사이다 설계', icon: '⏱️',
    desc: '고구마/사이다의 비율, 절단마공, 심쿵 빈도 등 로판 회차 단위 보상의 박자 규칙.',
    items: [
      {
        name: '사이다·고구마 비율 설계', alias: 'Catharsis Ratio',
        def: '모욕·억울함(고구마)을 깔되 반드시 통쾌한 반격·역전(사이다)으로 청산하는, 로판 만족도의 핵심 비율.',
        use: '"고구마는 짧게, 사이다는 확실히"가 철칙이다. 억울함을 길게 끌지 말고, 3~5화 내 작은 사이다로 환기하며 큰 사이다는 아크 단위로 정산한다.',
        ex: '여주가 모함당해 답답한 회차 뒤, 곧바로 증거로 되받아치는 작은 사이다를 붙여 별점 이탈을 막는 박자.',
        twist: '사이다를 일부러 미루다 한 번에 폭발시키는 "고구마 적금" — 단, 적금 기간이 길면 "고구마 too much"로 이탈하니 위험을 감수한 설계임을 의식한다.',
        tags: ['사이다', '고구마', '비율', '카타르시스', '별점'],
      },
      {
        name: '절단마공(클리프행어)', alias: 'Cliffhanger / 절단마공',
        def: '매 회차 끝에 떡밥·반전·심쿵 한 방을 배치해 다음 편 결제를 유도하는 웹소설 핵심 페이싱.',
        use: '회차 끝을 "다음이 궁금한 지점"에서 끊는다(고백 직전, 정체 발각 직전, 의미심장한 한 마디). 매 회 최소 1개의 설렘/긴장 포인트를 의무화한다.',
        ex: '회차 마지막 줄: "—그가 한 발 다가서며 그녀의 손목을 잡았다. \'도망치지 마.\'" (다음 화로)',
        twist: '절단마공을 "예상과 다른 방향"으로 이어 낚시를 배신한다(긴장한 줄 알았는데 다정함, 혹은 그 반대). 남발하면 피로해지니 빈도를 조절한다.',
        tags: ['절단마공', '클리프행어', '회차', '연독', '결제'],
      },
      {
        name: '심쿵 빈도 관리', alias: 'Swoon Cadence',
        def: '설렘 포인트(스킨십·달달 대사·남주 독백)를 일정 간격으로 분배하는 원칙. 너무 늦은 첫 설렘은 이탈 요인.',
        use: '"심쿵 마일스톤"을 박아 둔다(첫 손잡기·첫 가로안기·첫 반말). 초반에 첫 설렘을 빠르게 배치하고, 이후 일정 간격으로 강도를 키워 분배한다.',
        ex: '위기 순간의 가로안기(공주님 안기), 벽치기, 손목 잡아끌기 같은 정형 심쿵을 회차 리듬에 맞춰 배치.',
        twist: '정형 심쿵을 한 번 비틀어 신선하게 한다(가로안기 대신 여주가 남주를 끌어안기, 벽치기의 주체 역전). 또는 신체 반응 클로즈업만으로 노골적 묘사 없이 체감 설렘을 높인다.',
        tags: ['심쿵', '설렘', '스킨십', '가로안기', '빈도'],
      },
      {
        name: '드라마틱 아이러니(독자만 앎)', alias: 'Dramatic Irony',
        def: '여주는 "그가 날 싫어한다" 믿지만 실제론 사랑인, 독자만 진실을 아는 극적 아이러니. 안타까움·설렘의 동력.',
        use: '여주의 오인과 진실의 간극을 이중 시점·남주 독백으로 독자에게만 흘린다. 간극이 길수록 안타깝고, 해소될 때 카타르시스가 크다.',
        ex: '여주는 차갑게 대하는 남주가 자신을 멸시한다 믿지만, 독자는 그가 매 순간 그녀를 지키고 있었음을 안다.',
        twist: '아이러니를 양방향으로(둘 다 서로의 마음을 오해) 만들어 안타까움을 배가한다. 또는 독자가 안다고 믿은 진실조차 한 겹 더 비틀어 반전을 둔다.',
        tags: ['아이러니', '오해', '독자', '안타까움', '간극'],
      },
      {
        name: '여주 주체성 보장', alias: 'Agency Guarantee',
        def: '여주가 단순 구원 대상이 아니라 스스로 문제를 해결하는 능력(마법·정치·경영·지식·전생 정보)을 가져야 한다는 원칙. "민폐 여주"는 비판 1순위.',
        use: '매 위기에서 여주가 "스스로 두는 한 수"를 반드시 둔다(구원만 기다리지 않게). 무력감을 장기화하지 말고, 능력이 사건 해결에 실제로 기여하게 한다.',
        ex: '남주의 보호를 받되, 결정적 국면은 여주의 미래 지식·신성력·상단 경영 수완으로 직접 돌파하는 전개.',
        twist: '주체성을 "혼자 다 해결"이 아니라 "도움을 현명하게 쓰는 능력"으로 재정의해, 고립된 먼치킨이 아닌 관계 속 주체로 그린다.',
        tags: ['주체성', '여주', '능력', '민폐금지', '동일시'],
      },
      {
        name: '보상 서사 정산', alias: 'Earned Reward',
        def: '노력·고생에 비례한 인정·신분 상승·사랑 쟁취·악역 응징의 "인과적 정산". 거저 얻은 행운으로 보이면 만족이 반감된다.',
        use: '여주가 치른 대가(고생·선택·희생)를 명시하고, 보상이 그 인과의 결과로 보이게 한다. 인정·신분 상승·사랑을 각각 별도의 정산 비트로 분배한다.',
        ex: '직접 일군 상단의 성공, 스스로 쌓은 평판, 능동적으로 끊어낸 악연 — 그 누적이 신분 상승과 사랑으로 정산되는 결말.',
        twist: '보상을 일부러 늦추거나 형태를 바꿔(권력 대신 자유, 복수 대신 평온) 클리셰적 정산을 비튼다. 단, "인과의 정당성"은 반드시 지킨다.',
        tags: ['보상', '정산', '인과', '인정', '신분상승'],
      },
      {
        name: '관능도(수위) 합의', alias: 'Heat Level Contract',
        def: '전체이용가 설렘물(키스까지) ↔ 19금(노골)까지, 태그·소개로 사전 고지되는 관능 수위의 약속.',
        use: '본문이 표지·소개·플랫폼 태그가 약속한 수위와 일치하게 한다. 수위를 올릴 땐 접촉의 단계적 고조로 자연스럽게 이행한다.',
        ex: '"19금" 태그면 정사 묘사를 기대받고, "전체 이용가 설렘 로판"이면 키스 이상은 자제한다.',
        twist: '낮은 수위를 유지하되 "긴장의 밀도"로 체감 관능을 높인다 — 노골적 묘사 없이 손끝의 떨림·체온 변화만으로 더 야하게.',
        tags: ['관능도', '수위', '히트레벨', '약속', '태그'],
      },
    ],
  },
]

// ── 유틸 ──
const LS = 'sry:tool:romfan-devices:'
const ALL_KEY = '__all__'
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface FlatItem { cat: CatDef; item: Device }
const flatAll = (): FlatItem[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// ── 한국어 조사 선택 헬퍼 ──────────────────────────────────────────────
// 앞 글자의 받침(종성) 유무를 보고 실제 조사 한 개를 골라 붙인다. "을(를)" 같은
// 괄호 이중표기는 절대 출력하지 않는다. (한글이 아니거나 숫자면 받침 있음으로 처리)
const hasJong = (w: string): boolean => {
  const s = (w || '').trim()
  if (!s) return false
  const ch = s[s.length - 1]
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 받침처럼 읽히는 끝소리(숫자·영문 자음끝)는 받침 있음으로 근사
  if (/[013678ㄱ-ㅎlmnr]$/i.test(ch)) return true
  return false
}
// ㄹ받침은 '로/으로'에서 받침 없는 것처럼 '로'를 쓴다.
const endsRieul = (w: string): boolean => {
  const s = (w || '').trim()
  if (!s) return false
  const code = s.charCodeAt(s.length - 1)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8
  return false
}
const josaEul = (w: string) => w + (hasJong(w) ? '을' : '를')          // 을/를
const josaIga = (w: string) => w + (hasJong(w) ? '이' : '가')          // 이/가
const josaEun = (w: string) => w + (hasJong(w) ? '은' : '는')          // 은/는
const josaWa  = (w: string) => w + (hasJong(w) ? '과' : '와')          // 과/와
const josaRo  = (w: string) => w + (hasJong(w) && !endsRieul(w) ? '으로' : '로') // 으로/로

// ── 로그라인 자동조합 (9개 독립 슬롯의 곱집합) ─────────────────────────
// 각 슬롯은 서로 다른 문법역할·범주를 가지며 어떤 슬롯도 다른 슬롯의 특정 값을
// 전제하지 않는다(슬롯 독립성). 조사는 위 헬퍼로 실제 하나만 출력한다.
// 문장 틀:
//   "{도입}, {여주}{은/는} {위기} 속에서 {남주}{와/과} {결속}, {남주성격} 그의 곁에서
//    {장애}{을/를} 헤치고 {목표}{을/를} {결말}."
const LG_START = [ // ① 도입(시작 방식) — 부사절, 종속절로 문두에 옴 (14)
  '처형대에 오른 순간 결혼 전으로 회귀해',
  '비참하게 죽은 뒤 열일곱 살로 되돌아와',
  '읽던 소설 속 악역의 몸에 빙의해',
  '게임 속 멸망 직전의 황녀로 깨어나',
  '전생을 기억한 채 갓난아기로 환생해',
  '이혼당하기 직전의 과거로 회귀해',
  '파멸 엔딩을 코앞에 두고 첫 단추로 돌아와',
  '눈앞에 뜬 호감도 경고창과 함께 눈을 떠',
  '신탁이 가리킨 아이로 지목당한 채',
  '버려졌던 다리 밑에서 거두어진 채',
  '원작이 끝난 세계의 엑스트라로 떨어져',
  '죽음의 강을 건너기 직전 되살아나',
  '잃었던 기억을 한꺼번에 되찾은 채',
  '예언서에 적힌 마지막 페이지를 본 채',
]
const LG_HEROINE = [ // ② 여주 신분 — 명사(주어, 은/는) (14)
  '몰락한 공작가의 영애', '천대받던 서녀', '폐위된 황후', '버림받은 황녀',
  '평민 출신 약사', '마탑의 막내 제자', '망국의 마지막 공녀', '하녀로 위장한 백작녀',
  '신전의 견습 성녀', '상단을 물려받은 소녀', '기사단의 유일한 여기사', '냉대받던 둘째 부인',
  '이름을 빼앗긴 대공녀', '뒷골목에서 자란 정보상',
]
const LG_CRISIS = [ // ③ 처한 위기/플래그 — 명사구 (13)
  '정해진 파멸 루트', '코앞에 닥친 처형 선고', '가문을 노린 멸문의 음모',
  '거스를 수 없는 원작 강제력', '서서히 조여 오는 독살 계략', '되풀이되는 비극의 굴레',
  '돌이킬 수 없는 약혼 파기', '사방을 옥죄는 빚과 누명', '핏줄에 새겨진 오랜 저주',
  '잊을 만하면 닥치는 암살 위협', '제 발등을 찍는 악녀라는 평판', '뒤바뀐 신분이 들킬 위기',
  '시한부처럼 다가오는 멸망의 날',
]
const LG_HERO = [ // ④ 남주 신분 — 명사(와/과) (12)
  '냉혹한 황제', '무심한 대공', '제국 최강의 검', '마탑의 젊은 탑주',
  '적국의 황태자', '여주의 전속 호위기사', '신전의 대신관', '비밀을 쥔 재상',
  '북부를 다스리는 공작', '얼굴을 가린 용병왕', '황실의 그림자 암살자', '저주받은 마룡의 후예',
]
const LG_BOND = [ // ⑤ 관계 결속 방식 — 동사구 종결(…고/되어, 연결형) (12)
  '계약 결혼으로 한집에 묶이고', '정략혼의 사슬로 엮이고', '주종 서약으로 맺어지고',
  '한 저택에 강제로 동거하게 되고', '둘만의 비밀을 함께 짊어지고', '위장 연인으로 손을 잡고',
  '서로의 약점을 거래하며 동맹이 되고', '같은 적을 둔 한편이 되고', '목숨을 빚지고 빚 지우며 얽히고',
  '한 침실을 나눠 쓰는 처지가 되고', '거짓 약혼으로 사교계를 속이고', '운명의 표식으로 이어지고',
]
const LG_HEROCODE = [ // ⑥ 남주 성격/태도 — 관형 수식구(그를 꾸밈) (12)
  '겉으론 냉정하지만 그녀에게만 무너지는', '집착에 가깝게 그녀만을 좇는',
  '뒤늦게 진심을 깨닫고 후회하는', '무심한 척 매 순간 그녀를 지키는',
  '오직 그녀 앞에서만 서툴러지는', '차가운 가면 아래 다정함을 숨긴',
  '모든 걸 걸고 그녀를 택하려는', '질투를 들킬까 안절부절못하는',
  '강하되 그녀의 한마디에 흔들리는', '과거의 상처로 사랑을 두려워하는',
  '말없이 헌신으로만 마음을 보이는', '능청스럽게 그녀를 놀리며 다가오는',
]
const LG_OBSTACLE = [ // ⑦ 핵심 갈등/장애 — 명사(을/를) (11)
  '신분의 벽', '사교계의 모함', '정적들의 음모', '얽히고설킨 오해',
  '가문 간의 해묵은 원한', '라이벌 영애의 질투', '되살아난 옛 연인의 그림자',
  '왕좌를 둘러싼 권력 다툼', '세계를 옥죄는 원작의 강제력', '뿌리 깊은 차별과 편견',
  '서로를 시험하는 비밀의 무게',
]
const LG_GOAL = [ // ⑧ 목표 — 명사(을/를) (11)
  '잃었던 행복', '빼앗긴 자리', '온전한 자유', '진실한 사랑',
  '가문의 명예 회복', '정당한 복수', '두 번째 삶의 평온', '황후의 관',
  '제 손으로 일군 성취', '소중한 이들의 안녕', '운명을 뒤엎을 선택',
]
const LG_ENDING = [ // ⑨ 결말 톤 — 종결문(평서 종결) (10)
  '끝내 제 손으로 거머쥔다', '모두가 보는 앞에서 보란 듯이 이뤄낸다',
  '그와 함께 천천히 되찾아간다', '누구의 도움도 없이 스스로 쟁취한다',
  '예상 못 한 방식으로 끝내 손에 넣는다', '한 발 한 발 인과로 정산해 얻어낸다',
  '비틀린 운명을 거슬러 마침내 되돌린다', '대가를 치르고도 기어이 지켜낸다',
  '클리셰를 비틀어 새로운 결말로 맺는다', '서로를 택하는 것으로 완성한다',
]
const LG_SLOTS: { key: string; label: string; pool: string[] }[] = [
  { key: 'start',    label: '도입(회빙환)', pool: LG_START },
  { key: 'heroine',  label: '여주 신분',    pool: LG_HEROINE },
  { key: 'crisis',   label: '처한 위기',    pool: LG_CRISIS },
  { key: 'hero',     label: '남주 신분',    pool: LG_HERO },
  { key: 'bond',     label: '관계 결속',    pool: LG_BOND },
  { key: 'heroCode', label: '남주 성격',    pool: LG_HEROCODE },
  { key: 'obstacle', label: '핵심 장애',    pool: LG_OBSTACLE },
  { key: 'goal',     label: '목표',         pool: LG_GOAL },
  { key: 'ending',   label: '결말 톤',      pool: LG_ENDING },
]
// 로그라인 조합수 = 9개 독립 슬롯 풀 크기의 곱(고유 항목만). 화면 표시는 이 값.
const LOGLINE_COMBO = LG_SLOTS.reduce((n, s) => n * Math.max(1, s.pool.length), 1)
interface Logline { parts: Record<string, string>; text: string }
const buildLogline = (pick: (n: number) => number): Logline => {
  const p: Record<string, string> = {}
  for (const s of LG_SLOTS) p[s.key] = s.pool[pick(s.pool.length)]
  const text =
    `${p.start}, ${josaEun(p.heroine)} ${p.crisis} 속에서 ${josaWa(p.hero)} ${p.bond}, ` +
    `${p.heroCode} 그의 곁에서 ${josaEul(p.obstacle)} 헤치고 ${josaEul(p.goal)} ${p.ending}.`
  return { parts: p, text }
}

// 조합수 표시: 로그라인 자동조합(9개 독립 슬롯의 곱) 가짓수를 메인 지표로 쓴다.
const COMBO = LOGLINE_COMBO
const fmtCombo = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return String(n)
}

const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)

export default function RomfanDevices({ payload }: { payload?: ToolPayload }) {
  const genre = (payload?.genre as string) || '로맨스판타지'

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
  const [logline, setLogline] = useState<Logline | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트/복사 상태가 남지 않도록 정리(타이머는 setTimeout 콜백에서 가드).
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

  // 로그라인 자동조합: 9개 독립 슬롯에서 각 1개씩 뽑아 한 줄 시놉시스를 만든다.
  const rollLogline = useCallback(() => {
    const r = (n: number) => Math.floor(Math.random() * n)
    setLogline(buildLogline(r))
  }, [])

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

  // 연계: 현재 장치를 프로젝트 자료 〈로판 장치〉 폴더에 메모로 추가
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
      kind: 'text', root: 'research', folder: '로판 장치',
      title: `${s.item.name} (${s.cat.label})`,
      bodyHtml,
      meta: { 장르: genre, 분류: s.cat.label },
    })
    if (id) showToast(`프로젝트 자료 〈로판 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.`)
  }

  // 연계: 장치를 스니펫 라이브러리에 저장(다른 도구에서 재활용)
  const saveSnippet = (s: FlatItem) => {
    addToLibrary('snippets', {
      text: plainOf(s),
      source: `로판 서사장치 사전 · ${s.cat.label}`,
      tags: ['로맨스판타지', s.cat.label, ...(s.item.tags || [])],
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
          {copiedKey === 'copy:' + itemKey(s.cat.key, s.item.name) ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
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
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈로판 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => saveSnippet(s)} title="장치 설명을 공유 스니펫으로 저장"><Emoji e="💾"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('romfan-tropes', { genre })} title="로판 클리셰·트로프 도구 열기"><Emoji e="🌹"/> 로판 트로프</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre })} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('emotion-arc', { genre })} title="감정 곡선 도구 열기"><Emoji e="📈"/> 감정 곡선</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre })} title="플롯 피라미드 열기"><Emoji e="🔺"/> 플롯 피라미드</button>
      </div>
    </>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>{genre}</b> 고유의 서사 장치·전개·페이싱·클라이맥스 관습을 <b>{TOTAL}개</b> 모았습니다(정의·사용법·예시·비틀기).
        아래 <b>로그라인 자동조합</b>은 9개 독립 슬롯(도입·여주·위기·남주·결속·성격·장애·목표·결말)을 곱해
        <b> {fmtCombo(COMBO)} 가지</b>({COMBO.toLocaleString()})의 한 줄 시놉시스를 만듭니다.
      </div>

      {/* 로그라인 자동조합 생성기 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-2)' }}><Emoji e="🎰"/> 로그라인 자동조합</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>9개 슬롯 곱 = {COMBO.toLocaleString()}가지</span>
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={rollLogline}><Emoji e="🎲"/> 한 줄 시놉시스 뽑기</button>
        </div>
        {logline && (
          <div style={{ marginTop: 9 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8 }}>
              {logline.text}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(logline.text, 'logline')}>
                {copiedKey === 'logline' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
              </button>
              <button className="minibtn" onClick={rollLogline}><Emoji e="🎲"/> 다시</button>
              <button className="minibtn" onClick={() => setLogline(null)} title="닫기">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="장치·관습 검색 (예: 회귀, 악역영애, 집착, 후회, 사이다, 절단마공)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 장치</button>
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
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{random.item.alias}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🎲"/> 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
          </div>
          {renderDetail(random)}
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
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
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

      <div style={hint}>장치는 공식이 아니라 출발점입니다. ‘비틀기’를 적극 활용해 클리셰를 피하고, 고구마는 짧게·사이다는 확실히, 감정 곡선이 사건보다 앞서게 배치하세요.</div>
    </div>
  )
}
