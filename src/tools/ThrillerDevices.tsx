// 스릴러 장치·전개법 사전 — 스릴러·서스펜스 장르 고유의 서사 장치와 전개/구조·페이싱·클라이맥스 관습을
// 정의 + 사용법 + 예시 + 비틀기(변주)로 묶은 로컬 사전. 도시에(장르 통념·대표작 분석)에 근거한 자작 데이터.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·마지막 카테고리·검색)만 사용.
// 연계: 항목을 프로젝트 자료(스릴러 장치) 폴더 메모로 추가 / 글감 스니펫 라이브러리로 보관 / 관련 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'thriller-devices',
  name: '스릴러 장치·전개법 사전',
  icon: '🧨',
  group: '장치·전개',
  genre: '스릴러·서스펜스',
  intro: '서스펜스 장치·전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로 찾아 장면에 심으세요',
  w: 640,
  h: 600,
}

const LS = 'sry:tool:thriller-devices:'

interface Device {
  name: string        // 장치/패턴 이름
  alias?: string      // 영문/통용 표기
  def: string         // 정의
  use: string         // 사용법(실무 지침)
  ex: string          // 예시(대표작·장면)
  twist: string       // 비틀기(변주·주의)
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 도시에 근거 장치/전개 데이터 (장르 특화·구체적) ──────────────────────────
const CATS: CatDef[] = [
  {
    key: 'device', label: '핵심 서사 장치', icon: '🧰',
    desc: '스릴러를 스릴러로 만드는 고유 무기들. 긴장의 발생·지연·폭발을 설계하는 도구.',
    items: [
      {
        name: '정보 비대칭(극적 아이러니)', alias: 'Dramatic Irony',
        def: '독자와 인물이 아는 정보량을 의도적으로 어긋나게 만들어 긴장을 발생시키는 기술. 독자>인물=서스펜스, 독자=인물=동행/미스터리, 독자<인물=서프라이즈/반전.',
        use: '장면마다 "누가 무엇을 아는가"를 매트릭스로 정리하고, 의도적으로 격차를 두라. 위협 정보를 독자에게 먼저 흘려 인물의 무지를 지켜보게 하면 서스펜스가 산다.',
        ex: '히치콕의 "테이블 밑 폭탄": 폭탄을 관객만 알면 평범한 대화 15분이 견딜 수 없는 긴장이 된다. 『이창』에서 살인범이 다가오는데 갇힌 주인공.',
        twist: '한 장면 안에서 격차를 뒤집어라. 독자가 우위라 믿던 정보가 실은 인물이 흘린 미끼였다면, 독자도 함께 속는 반전이 된다.',
      },
      {
        name: '티킹 클락(시간 압박)', alias: 'Ticking Clock',
        def: '명시적 타이머·자연 마감·사회적 마감으로 "시간이 없다"는 압력을 거는 장치. 스릴러의 기본 추진력.',
        use: '마감을 가시화하라(폭탄 타이머, 약효 소진, 일출, 공판 일정, 출항·투표). 클라이맥스가 카운트다운 0초와 겹치도록 역산해 배치.',
        ex: '포사이스 『자칼의 날』은 암살 D-데이를 향한 절차적 카운트다운 자체가 플롯. 『끝까지 간다』는 시신 처리 시한이 곧 시계.',
        twist: '시계를 두 개 겹쳐라(생존 시한 + 도덕 시한). 또는 "시간이 충분하다"고 안심시킨 뒤 마감을 앞당겨 가속하라.',
      },
      {
        name: '클리프행어 챕터 엔딩', alias: 'Cliffhanger',
        def: '장 끝을 결정·폭로·위협·역전 "직전"에서 끊어 다음 장으로 끌고 가는 페이징 기법.',
        use: '짧은 챕터(2~4쪽) 말미마다 훅을 심어라. 폭로 한 줄 전, 문이 열리기 직전, 전화벨이 울리는 순간에 끊는다.',
        ex: '댄 브라운·제임스 패터슨식 초단편 챕터. 시점을 교차하며 한쪽을 위기에서 끊고 다른 쪽으로 넘어간다.',
        twist: '연속 클리프행어는 둔감해진다. 가끔 훅을 "해소"로 끝내 숨을 고른 뒤 다시 가속하면 다음 절벽이 더 아찔하다.',
      },
      {
        name: '레드 헤링(거짓 단서)', alias: 'Red Herring',
        def: '의심을 엉뚱한 곳으로 유도하는 가짜 단서·가짜 용의자. 진실을 늦추고 반전의 충격을 키운다.',
        use: '레드 헤링도 "공정"해야 한다. 그럴듯한 동기·정황을 갖춰 독자가 합리적으로 속게 하되, 재독 시 무해함이 드러나도록 단서를 이중 기능화.',
        ex: '제프리 디버 『본 콜렉터』의 함정-오인 구조. 도메스틱 스릴러의 "수상한 이웃"은 거의 항상 미끼다.',
        twist: '레드 헤링을 진범으로 뒤집어라("뻔한 용의자가 진짜였다"). 또는 미끼를 쫓다가 무관한 진짜 범죄를 발견하게 하라.',
      },
      {
        name: '체호프의 총', alias: "Chekhov's Gun",
        def: '초반에 무심히 보여준 요소(흉터·약·비밀번호·알레르기·고장 난 자물쇠)를 클라이맥스에서 결정적으로 회수하는 원칙.',
        use: '클라이맥스에 필요한 도구·약점·정보를 1막에서 "생활 소품"으로 자연스럽게 심어라. 너무 강조하면 복선임이 들통난다.',
        ex: '주인공의 천식 흡입기, 적의 손 떨림, 초반에 언급된 지하 통로가 마지막에 생사를 가른다.',
        twist: '총을 보여주고 끝내 쏘지 않아 기대를 배신하거나, 무해해 보인 소품(아이 장난감)이 흉기가 되게 하라.',
      },
      {
        name: '맥거핀', alias: 'MacGuffin',
        def: '모두가 쫓지만 그 자체 내용은 덜 중요한 추동 물건/정보(서류·코드·USB·핵코드·디스크). 인물을 움직이는 미끼.',
        use: '맥거핀에는 "왜 절실한가"라는 이해관계를 부여하라. 내용보다 그것을 둘러싼 인물들의 욕망·관계가 드라마다.',
        ex: '스파이물의 마이크로필름, 『다빈치 코드』의 암호. 추격의 명분은 맥거핀, 의미는 인물.',
        twist: '맥거핀이 가짜였거나(빈 디스크), 진짜 맥거핀은 추적자 자신(혹은 그의 기억)이었다고 밝혀라.',
      },
      {
        name: '신뢰할 수 없는 화자', alias: 'Unreliable Narrator',
        def: '기억상실·거짓말·정신질환·약물·선택적 서술로 서술 자체가 진실을 왜곡하는 화자. 도메스틱 스릴러의 표준 무기.',
        use: '독자가 의심하게 만들되, 거짓 사이에 검증 가능한 진실을 섞어 "어디까지 믿을지" 흔들어라. 회수 시점에 단서가 재배열되게.',
        ex: '플린 『나를 찾아줘』의 교대 서술, 호킨스 『걸 온 더 트레인』의 알코올성 공백, 핀 『우먼 인 윈도』의 약물.',
        twist: '화자가 거짓말쟁이일 거라는 독자의 의심마저 미끼로 써서, 사실은 화자가 진실을 말하고 있었다고 뒤집어라.',
      },
      {
        name: '이중 시점 교차 + 시간선 분절', alias: 'Dual POV / Split Timeline',
        def: '"지금"과 "그때", 혹은 두 인물의 시점을 교차해 정보를 통제·지연하는 구조. 챕터 머리에 시점/시간 라벨.',
        use: '두 시간선이 한 지점에서 충돌·합류하도록 설계하라. 한쪽이 답을 쥐면 다른 쪽을 위기에서 끊어 정보를 저당 잡는다.',
        ex: '『나를 찾아줘』의 부부 교대, 정유정 『7년의 밤』의 과거-현재 직조.',
        twist: '두 시간선이 사실 동일 사건의 다른 각도였거나, 다른 인물인 줄 안 두 시점이 한 사람이었다고 합류시켜라.',
      },
      {
        name: '위장된 일상성(도메스틱 언캐니)', alias: 'Domestic Uncanny',
        def: '안전해야 할 곳(집·이웃·결혼·학교·스마트홈)이 위협의 근원으로 전도되는 장치. 일상의 균열에서 공포가 샌다.',
        use: '평온을 먼저 충분히 세운 뒤 어긋남을 심어라(사라진 물건의 위치 이동, 잠긴 방, "누군가 집에 있었다"). 작은 이상부터 점증.',
        ex: '교외 완벽한 결혼의 이면, 학부모 모임의 뒤틀린 권력. CCTV·SNS가 감시 장치로 전환.',
        twist: '위협의 정체가 외부 침입자가 아니라 가장 가까운 가족·배우자임을 끝에 드러내라("범인은 가장 가까운 사람"의 변주).',
      },
      {
        name: '잘못된 신뢰(거짓 조력자)', alias: 'False Ally',
        def: '조력자가 배신자, 권위자(경찰·상사·멘토)가 흑막인 구조. "믿을 사람이 없다"는 편집증을 조성.',
        use: '배신 전까지 진심 어린 도움을 충분히 제공하게 하라. 사후 재독 시 그 호의의 진짜 동기가 보이도록 단서를 심는다.',
        ex: '르카레의 조직 내부 두더지, 막판 배신 파트너. 권위 기관 자체가 적인 음모 스릴러.',
        twist: '배신자라 몰린 자가 유일한 충신이었고, 가장 미더운 권위자가 흑막이라는 이중 비틀기.',
      },
      {
        name: '단서의 이중 기능', alias: 'Fair-Play Clue',
        def: '같은 사실이 1회독에서는 무해, 재독에서는 결정적이 되도록 배치하는 공정한 반전의 핵심 기법.',
        use: '진실을 직접 숨기지 말고 평범한 문장 속에 노출하라. 독자가 "복선이 다 있었구나" 하고 재배열할 수 있어야 만족도가 높다.',
        ex: '신뢰할 수 없는 화자가 무심코 흘린 모순, 시간선상 어긋난 한 줄.',
        twist: '단서를 너무 잘 숨기면 "사기"가 된다. 적어도 두 번, 다른 맥락으로 노출해 회수의 공정성을 확보하라.',
      },
      {
        name: '카운트-인 정보 공개', alias: 'Drip-feed Reveal',
        def: '독자에게 진실을 한 조각씩만 흘려 "거의 다 알 것 같은데 결정적 1조각이 없는" 상태를 길게 유지하는 정보 통제.',
        use: '핵심 진실은 가능한 한 늦게, 복선은 충분히 일찍. 매 장면 한 조각만 더 주고, 줄 때마다 새 의문을 함께 던져라.',
        ex: '르카레의 첩보 퍼즐 맞춤, 콘웰의 법의학 단서 누적.',
        twist: '마지막 한 조각이 앞선 모든 조각의 의미를 뒤집게 설계하라(폭로가 곧 재해석).',
      },
      {
        name: '캣앤마우스(추격 심리전)', alias: 'Cat and Mouse',
        def: '쫓는 자와 쫓기는 자가 서로의 수를 읽으며 우위를 주고받는 지능 대결. 빌런이 한발 앞설 때 긴장이 극대화.',
        use: '추격을 물리적 속도전이 아니라 정보·예측의 싸움으로 그려라. 한쪽이 함정을 놓으면 상대가 그것을 역이용하게.',
        ex: '『양들의 침묵』의 스털링-렉터 면담, 『추격자』의 잡았다 놓치는 심리전.',
        twist: '쫓던 자와 쫓기던 자의 입장을 중간에 역전시켜라. 추격자가 사실 표적이 깔아둔 덫 위를 걷고 있었다면?',
      },
    ],
  },
  {
    key: 'open', label: '오프닝·훅', icon: '🎬',
    desc: '첫 페이지에서 위협감을 거는 도입 패턴. 양날의 검인 통념 클리셰는 변주 전제.',
    items: [
      {
        name: '콜드 오픈(시체 발견)', alias: 'Cold Open',
        def: '도입부 없이 곧장 사건·위협 한복판에서 시작하는 오프닝. 시체 발견·범행 현장으로 즉시 던진다.',
        use: '첫 장면에서 가치 상태를 명확히 무너뜨려라(평온→위협). 인물 설명은 행동 뒤로 미룬다.',
        ex: '수사물의 변사체 발견 콜드 오픈, 『살인의 추억』 도입의 논두렁.',
        twist: '콜드 오픈의 피해자가 사실 가해자였거나, 시체가 진짜가 아니었음을 후반에 회수하라.',
      },
      {
        name: '인 메디아스 레스 + "○○시간 전"', alias: 'Flash-forward Frame',
        def: '미래의 위기 절정을 먼저 보여준 뒤 "○○시간 전"으로 회귀해 그 지점까지 끌고 가는 액자 구조.',
        use: '앞에 보여준 절정 이미지를 독자가 계속 기다리게 하라. 다만 회귀 후 도착점이 예상과 어긋나야 보람이 있다.',
        ex: '상업 스릴러·영화의 단골 오프닝. "12시간 전, 모든 것이 평범했다."',
        twist: '먼저 보여준 절정 장면의 "주인공"이 알고 보니 다른 사람이었거나, 우리가 본 각도가 거짓이었다고 회수하라.',
      },
      {
        name: '평화로운 가정의 균열 암시', alias: 'Calm Before',
        def: '완벽해 보이는 일상에 미세한 불길함(어긋난 사물, 받지 않는 전화, 낯선 시선)을 심어 두는 도입.',
        use: '평온의 디테일을 풍부히 깔되, 단 하나의 "틀린 음표"를 독자만 눈치채게 하라. 인물은 아직 모른다.',
        ex: '도메스틱 스릴러의 표준 1장. 단란한 아침 식탁에 슬쩍 끼어든 이물감.',
        twist: '틀린 음표가 레드 헤링이고, 진짜 위협은 정작 가장 정상적으로 보인 요소였다고 뒤집어라.',
      },
    ],
  },
  {
    key: 'structure', label: '구조·전개 패턴', icon: '🏗️',
    desc: '3막 위협 점증 곡선과 시퀀스 설계. 비트시트의 골격.',
    items: [
      {
        name: '개입 사건 + 포인트 오브 노 리턴', alias: 'Inciting / Point of No Return',
        def: '평범한 일상을 위협으로 끌어들이는 개입 사건. 1막 끝에 "되돌아갈 수 없는 선"을 두어 주인공을 가둔다.',
        use: '1막(약 25%)에서 주인공이 스스로 발 빼지 못하게 만들어라. 위협이 그를 선택한 게 아니라, 그가 한 걸음 들여놓도록.',
        ex: '본의 아니게 비밀을 목격, 누명을 쓰고 도주, 의뢰를 수락하는 순간.',
        twist: '포인트 오브 노 리턴을 주인공의 능동적 죄(작은 거짓말·은폐)로 만들어, 위협이 자업자득이 되게 하라.',
      },
      {
        name: '중간점 판세 역전', alias: 'Midpoint Reversal',
        def: '50% 지점에서 큰 반전·판세 역전이 일어나는 구조점. 가짜 승리 또는 진짜 위협의 실체 노출.',
        use: '중간점에서 주인공의 목표나 적의 정체를 재정의하라. 전반부의 전제가 뒤집혀 후반부가 새 게임이 되게.',
        ex: '쫓던 범인이 미끼였음을 깨닫는 순간, 믿었던 조력자의 정체 노출.',
        twist: '가짜 승리(highest 점)에서 정점을 찍게 한 뒤 곧바로 추락시켜 낙차를 키워라.',
      },
      {
        name: '올 이즈 로스트(모든 것을 잃은 순간)', alias: 'All Is Lost',
        def: '75% 부근, 적이 우위에 서고 조력자 상실·신뢰 붕괴로 주인공이 바닥을 치는 구조점.',
        use: '여기서 주인공에게서 무기·동료·정보·희망을 차례로 빼앗아라. 가장 낮은 곳에서만 진짜 결단이 나온다.',
        ex: '파트너의 죽음, 결정적 증거의 소실, 누명의 확정.',
        twist: '"잃은 것"이 실은 위장(거짓 죽음·숨긴 증거)이라 3막에서 부활하게 하되, 그 순간엔 진짜로 절망하게 하라.',
      },
      {
        name: '위협 에스컬레이션 사다리', alias: 'Stakes Escalation',
        def: '같은 강도의 위협 반복은 지루함. 매 시퀀스 위험을 한 단씩 올리는 점증 원칙(개인→가까운 이→다수, 추상→구체).',
        use: '시퀀스마다 "이번엔 무엇이 더 걸렸나"를 명시하라. 범위(누가 위험한가)나 임박성(언제) 중 하나는 반드시 상승.',
        ex: '내 목숨 → 가족 → 도시. 또는 "막을 수 있다"에서 "이미 늦었을지 모른다"로.',
        twist: '범위를 거꾸로 응축하라. 다수의 위기에서 "이 한 사람을 살리는 게 곧 전부"로 좁히면 오히려 절박해진다.',
      },
      {
        name: '시퀀스 진동(목표-장애-부분해결+새위협)', alias: 'Value Shift Sequence',
        def: '각 장면이 가치 상태(+/-)를 반드시 바꾸는 시퀀스 설계. "목표→장애→부분 해결 + 더 큰 새 위협"의 진동.',
        use: '장면 끝의 가치가 시작과 같다면 그 장면은 정체다. 작은 승리에는 더 큰 대가를, 패배에는 새 단서를 붙여라.',
        ex: '증거를 얻지만 추적자에게 위치가 노출됨. 탈출에 성공하지만 동료를 잃음.',
        twist: '부분 해결을 함정으로 만들어라. 얻은 단서가 적이 흘린 미끼였고, 그것을 쥔 순간 더 깊이 빠진다.',
      },
      {
        name: '페이싱 리듬(가속-숨고르기-가속)', alias: 'Pacing Rhythm',
        def: '고강도 액션·폭로 뒤에 짧은 호흡(감정·정보 정리)을 두고 다시 가속하는 완급 설계.',
        use: '계속 빠르면 둔감해진다. 폭발 직후 한 박자 쉬며 인물 감정과 다음 위협의 그림자를 정리한 뒤 다시 당겨라.',
        ex: '추격 시퀀스 → 안전가옥의 짧은 정적 → 새 위협의 전화벨.',
        twist: '숨 고르기 장면 자체에 위협을 숨겨라. 안심하는 순간이 가장 무방비하다.',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '💥',
    desc: '대결의 관습과 결말 옵션. 능동적 해결·도덕적 대가·막판 한 방.',
    items: [
      {
        name: '직접 대면(능동적 해결)', alias: 'Direct Confrontation',
        def: '주인공과 적대자의 물리적·심리적 정면 충돌. 우연·중재가 아니라 주인공의 능동적 선택으로 해결되어야 만족도가 높다.',
        use: '클라이맥스의 마지막 일격은 반드시 주인공의 손에서 나오게 하라. 외부 구원(경찰 도착·우연)은 김을 뺀다.',
        ex: '스털링이 어둠 속에서 버펄로 빌과 단둘이 맞서는 『양들의 침묵』 지하실.',
        twist: '물리적 승리 대신 심리적 승리로 끝내라. 주인공이 적의 논리를 무너뜨리는 한마디로 무장 해제시킨다.',
      },
      {
        name: '최악의 조건', alias: 'Worst Position',
        def: '주인공을 무장 해제·고립·부상·시간 부족 등 가장 불리한 상태에서 대결하게 설계하는 관습.',
        use: '대면 직전 주인공의 자산을 최대한 박탈하라. 정전된 공간, 떨어진 무기, 다친 다리, 0초를 향하는 시계.',
        ex: '정전된 빌딩의 일대일, 약효가 다해가는 채로 맞서는 결전.',
        twist: '약점 자체를 무기로 전환하라. 어둠에 갇힌 주인공이 오히려 어둠에 익숙하다는 식의 역전.',
      },
      {
        name: '반전의 회수', alias: 'Payoff Reveal',
        def: '앞서 심은 체호프의 총·복선·진짜 정체가 클라이맥스에서 터지며 "그게 그거였구나"의 재배열이 일어나는 지점.',
        use: '회수는 카운트다운 만료·대면과 겹치게 몰아쳐라. 흩어진 단서가 한 번에 의미를 갖는 순간이 카타르시스다.',
        ex: '초반의 무심한 소품·대사가 결정적 의미로 되돌아온다.',
        twist: '회수 직후 한 겹 더 벗겨, 방금 밝혀진 진실 위에 더 깊은 진실을 얹어라(이중 리빌).',
      },
      {
        name: '거짓 결말 / 막판 부활', alias: 'False Ending',
        def: '위협이 끝난 듯하다가 한 번 더 솟구치는 "마지막 한 방". 슬래셔·액션 스릴러의 단골.',
        use: '독자가 긴장을 풀도록 진짜 해소처럼 보이게 한 뒤, 한 박자 정적 후 위협을 되살려라. 단, 남발은 식상.',
        ex: '죽은 줄 안 적이 다시 일어서는 순간, 끝난 줄 안 사건의 재점화.',
        twist: '부활하는 것을 적이 아니라 "끝났다고 믿은 진실"로 바꿔라. 새 시신·새 메시지가 사건을 재정의한다.',
      },
      {
        name: '도덕적 대가', alias: 'Moral Cost',
        def: '승리에 희생·상처가 따르게 하는 관습. 무손실 승리는 싱겁다고 평가된다.',
        use: '주인공이 무엇을 잃고 이겼는지 결말에 새겨라(사람·신념·순수). 상처가 클수록 승리가 무겁다.',
        ex: '르카레식 도덕적 회색 승리, 적을 잡았으나 자신도 그 방법으로 더럽혀진 결말.',
        twist: '승리의 대가를 "남이 아닌 자신의 변화"로 두어라. 주인공이 적을 닮아버린 채 이긴다.',
      },
      {
        name: '다크/오픈 엔딩 + 스팅어', alias: 'Dark / Open Ending + Stinger',
        def: '의도적으로 승리를 박탈하거나, 악이 이기거나, 끝나지 않은 불안을 남기는 결말. 마지막 한 줄 반전(스팅어)이 흔하다.',
        use: '카타르시스를 일부러 거두고 여운을 남길 때 쓴다. 스팅어는 앞 내용을 재해석하게 만드는 한 줄이어야 한다.',
        ex: '『나를 찾아줘』의 끝나지 않는 결혼, 『추운 나라에서 돌아온 스파이』의 환멸.',
        twist: '해피엔딩처럼 닫은 뒤 마지막 한 줄에 의심의 씨앗을 심어, 독자가 책을 덮고도 불안하게 하라.',
      },
    ],
  },
]

const ALL_KEY = '__all__'
const FAV_KEY = '__fav__'

const flatAll = (): { cat: CatDef; item: Device }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 장치를 텍스트(복사·스니펫)로 직렬화.
function deviceToText(c: CatDef, d: Device): string {
  return [
    `🧨 [${c.label}] ${d.name}${d.alias ? ` (${d.alias})` : ''}`,
    `· 정의: ${d.def}`,
    `· 사용법: ${d.use}`,
    `· 예시: ${d.ex}`,
    `· 비틀기: ${d.twist}`,
  ].join('\n')
}

// 한 장치를 프로젝트 본문(HTML)으로.
function deviceToHtml(c: CatDef, d: Device): string {
  return [
    `<p><b>🧨 [${escHtml(c.label)}] ${escHtml(d.name)}${d.alias ? ` (${escHtml(d.alias)})` : ''}</b></p>`,
    `<p><b>정의</b> · ${escHtml(d.def)}</p>`,
    `<p><b>사용법</b> · ${escHtml(d.use)}</p>`,
    `<p><b>예시</b> · ${escHtml(d.ex)}</p>`,
    `<p><b>비틀기</b> · ${escHtml(d.twist)}</p>`,
  ].join('')
}

// ── 장면 설계 조합기: 슬롯 풀 ───────────────────────────────────────────────
// 사전의 장치를 실제 한 장면으로 조립하도록 7개 슬롯을 무작위 조합(잠금/재생성). 도시에 근거 자작 풀.
interface SlotDef { key: string; label: string; icon: string; pool: string[] }
const SLOTS: SlotDef[] = [
  {
    key: 'device', label: '핵심 장치', icon: '🧨', pool: [
      '독자만 위협을 아는 정보 비대칭(서스펜스)', '인물만 진실을 쥔 정보 비대칭(반전 예약)',
      '독자·인물이 함께 모르는 동행 미스터리', '명시적 티킹 클락(타이머)', '자연 마감 티킹 클락(일출·약효·밀물)',
      '사회적 마감(공판·출항·투표)', '레드 헤링으로 의심 유도', '진범을 뻔한 용의자로 숨긴 미스디렉션',
      '체호프의 총 회수', '쏘지 않는 체호프의 총(기대 배신)', '맥거핀 추적', '맥거핀이 가짜로 드러남',
      '신뢰할 수 없는 화자의 공백', '신뢰 없는 화자가 실은 진실을 말함', '거짓 조력자의 호의',
      '권위자가 흑막인 잘못된 신뢰', '캣앤마우스 심리전', '추격자와 표적의 입장 역전',
      '단서의 이중 기능(재독 회수)', '카운트-인 한 조각씩 공개', '위장된 일상성의 균열',
      '이중 시점 교차로 정보 통제', '두 시간선의 충돌·합류', '죽은 줄 안 인물의 귀환',
      '범인은 가장 가까운 사람', '콜드 오픈 시체 발견', '"○○시간 전" 회귀 액자', '평온 속 단 하나의 틀린 음표',
    ],
  },
  {
    key: 'pressure', label: '배경 압박', icon: '🏚️', pool: [
      '폭설 산장(고립)', '외딴 섬(탈출 불가)', '정전된 고층 빌딩', '멈춘 엘리베이터',
      '멈춘 열차·지하철', '난기류의 비행기', '잠수함(산소 한계)', '폐쇄된 병원·정신병동',
      '지하 벙커·방공호', '잠긴 지하실', '완벽해 보이는 교외 주택가', '스마트홈·음성비서가 감시하는 집',
      'CCTV로 도배된 단지', '학부모 모임·사립학교', '비 내리는 부패한 대도시', '뒷골목·불법 클럽',
      '항만·컨테이너 야적장', '법정·구치소(공판 시한)', '안전가옥·환승 공항', '국경 검문소',
      '눈보라 속 고속도로', '폭우로 끊긴 다리', '단전된 지하 주차장', '엘리베이터 없는 정전 고층',
      '안개에 갇힌 어촌', '정신없는 출퇴근 인파 속', '오지의 별장(통신 두절)', '폐쇄된 놀이공원',
    ],
  },
  {
    key: 'antagonist', label: '적대자', icon: '🕷️', pool: [
      '한발 앞서는 천재 빌런', '주인공을 사랑하기에 위험한 자', '권위 뒤에 숨은 흑막(경찰·상사)',
      '얼굴 없는 추적자', '가장 가까운 가족·배우자', '믿었던 멘토·스승', '여럿인 줄 안 1인 가면',
      '학대로 비틀린 피해자형 가해자', '조직 내부의 두더지', '사라진 줄 안 과거의 인물',
      '주인공 자신의 또 다른 인격', '시스템·기관 자체가 적', '청부받은 냉혹한 프로', '복수에 사로잡힌 유족',
      '정의의 폭로자로 위장한 우두머리', '구원자처럼 보인 설계자', '미래에서 온(혹은 미래의) 자신',
      '평범한 단역이던 진짜 설계자', '쌍둥이·대역', '카리스마로 추종을 모으는 교주', '내부 고발 미끼를 던진 흑막',
      '주인공이 풀어준 죄수', '예언서를 쓴 적', '주인공을 키운 감시자 부부',
    ],
  },
  {
    key: 'protagonist', label: '주인공 상태', icon: '🩹', pool: [
      '유능하나 부상당한 채로', '무장 해제·고립된 상태', '시간이 거의 없는 채로', '누명을 쓰고 도주 중',
      '기억의 공백을 안고', '신뢰할 사람을 잃은 채', '약효가 다해가는 채로', '가족을 인질로 잡힌 채',
      '진실을 절반만 아는 채', '동료의 배신을 막 알아챈 채', '추적당하는 줄 모른 채', '비밀이 곧 새어나갈 위기로',
      '한 건만 더 하고 은퇴하려다', '트라우마가 도지는 채로', '술·약에 의지하던 채로', '거짓 알리바이에 발목 잡힌 채',
      '구하려던 대상이 헛것임을 모른 채', '자기 죄책감과 싸우며',
    ],
  },
  {
    key: 'beat', label: '구조 위치', icon: '📐', pool: [
      '개입 사건(1막, 끌려듦)', '포인트 오브 노 리턴(1막 끝)', '적의 윤곽 노출(2막 전반)',
      '중간점 판세 역전(50%)', '가짜 승리 직후 추락', '신뢰 붕괴·조력자 상실(2막 후반)',
      '올 이즈 로스트(75%)', '마지막 퍼즐 맞춤(3막 진입)', '직접 대면(클라이맥스)', '반전의 일괄 회수',
      '거짓 결말 뒤 막판 부활', '도덕적 대가를 치르는 해소', '다크/오픈 엔딩의 여진', '스팅어 한 줄(에필로그)',
      '숨 고르기(짧은 정적)', '위협 한 단 상승하는 시퀀스',
    ],
  },
  {
    key: 'reveal', label: '정보 공개 방식', icon: '🔓', pool: [
      '독자만 먼저 알게 흘리기', '한 조각씩 카운트-인', '재독 시 의미가 뒤집히는 단서', '레드 헤링으로 늦추기',
      '폭로가 곧 재해석이 되게', '회수 직후 한 겹 더 벗기기(이중 리빌)', '끝까지 가린 결정적 1조각',
      '신뢰 없는 화자의 모순 노출', '두 시점이 같은 사건임을 합류로 공개', '복선을 두 번 다른 맥락으로 심기',
      '거짓 자백 속에 진실 한 줄', '침묵·생략으로 가리기', '소품 하나로 통째로 회수', '제3자의 증언으로 뒤집기',
    ],
  },
  {
    key: 'hook', label: '장면 끝 훅', icon: '🪝', pool: [
      '폭로 한 줄 직전에서 끊기', '문이 열리는 순간 컷', '전화벨이 울리는 순간', '울리지 않는 전화의 정적',
      '백미러 속 따라붙는 차', '사라진 물건의 위치가 바뀐 발견', '"누군가 집에 있었다"', '깜빡이던 형광등이 꺼지며',
      '타이머가 한 자리 줄며', '믿었던 이의 거짓이 드러나며', '안심한 직후 새 위협의 그림자', '카운트다운 0초와 겹치며',
      '스팅어 한 줄로 재해석', '등 뒤의 발소리', '도착한 메시지 한 통', '닫히는 문틈으로 보인 얼굴',
      '거울에 비친 또 다른 그림자', '시계가 멈춘 것을 깨달으며',
    ],
  },
]

interface SceneCombo { [slotKey: string]: string }
function comboToText(combo: SceneCombo): string {
  return ['🧨 스릴러 장면 설계', ...SLOTS.map((s) => `${s.icon} ${s.label}: ${combo[s.key]}`)].join('\n')
}
function comboToHtml(combo: SceneCombo): string {
  return ['<p><b>🧨 스릴러 장면 설계</b></p>',
    ...SLOTS.map((s) => `<p><b>${escHtml(s.icon + ' ' + s.label)}</b> · ${escHtml(combo[s.key] || '')}</p>`)].join('')
}

export default function ThrillerDevices({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : '스릴러·서스펜스'

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || raw === FAV_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // ── 모드(사전 / 장면 설계 조합기) ──
  const [mode, setMode] = useState<'dict' | 'gen'>('dict')
  // 조합기: 현재 뽑힌 슬롯 값 + 잠금 상태
  const [combo, setCombo] = useState<SceneCombo>(() => {
    const o: SceneCombo = {}
    SLOTS.forEach((s) => { o[s.key] = s.pool[Math.floor(Math.random() * s.pool.length)] })
    return o
  })
  const [locks, setLocks] = useState<Record<string, boolean>>({})

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  // 장면 설계 조합기의 슬롯 풀 곱 = 만들 수 있는 서로 다른 장면 설계 수.
  const comboCount = useMemo(() => SLOTS.reduce((acc, s) => acc * s.pool.length, 1), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) base = flatAll()
    else if (cat === FAV_KEY) base = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else base = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q) ||
        item.use.toLowerCase().includes(q) ||
        item.ex.toLowerCase().includes(q) ||
        item.twist.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 풀에서 무작위 1개(검색어 무시). 잠금 없는 단순 재생성.
    let pool: { cat: CatDef; item: Device }[]
    if (cat === ALL_KEY) pool = flatAll()
    else if (cat === FAV_KEY) pool = flatAll().filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    else pool = CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat, favs])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => {
      const next = { ...prev }
      if (next[k]) delete next[k]; else next[k] = true
      return next
    })
  }

  // ── 조합기: 잠금 안 된 슬롯만 재생성(직전 값과 다르게) ──
  const pickFresh = (s: SlotDef, prev?: string): string => {
    if (s.pool.length <= 1) return s.pool[0]
    let v = s.pool[Math.floor(Math.random() * s.pool.length)]
    if (prev !== undefined && v === prev) v = s.pool[Math.floor(Math.random() * s.pool.length)]
    return v
  }
  const regenerate = () => {
    setCombo((prev) => {
      const next: SceneCombo = { ...prev }
      SLOTS.forEach((s) => { if (!locks[s.key]) next[s.key] = pickFresh(s, prev[s.key]) })
      return next
    })
  }
  const regenSlot = (s: SlotDef) => setCombo((prev) => ({ ...prev, [s.key]: pickFresh(s, prev[s.key]) }))
  const toggleLock = (key: string) => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))

  // 조합기 연계: 프로젝트 자료 〈스릴러 장치〉 폴더에 장면 설계 메모 추가.
  const comboToProj = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '스릴러 장치',
      title: `장면 설계 — ${combo.device}`,
      bodyHtml: comboToHtml(combo),
      synopsis: `${combo.pressure} / ${combo.antagonist} / ${combo.beat}`,
      icon: '🧨',
      meta: { 장르: genre, 핵심장치: combo.device, 구조위치: combo.beat },
    })
    flash(id ? '프로젝트 자료 〈스릴러 장치〉에 장면 설계를 추가했습니다.' : '프로젝트 추가에 실패했어요.')
  }
  // 조합기 연계: 글감 스니펫 보관함에 담기.
  const comboToStash = () => {
    addToLibrary('snippets', {
      text: comboToText(combo),
      source: '스릴러 장치 사전 · 장면 설계 조합기',
      tags: ['스릴러·서스펜스', '장면설계', combo.device, combo.antagonist],
    })
    flash('글감 보관함에 장면 설계를 담았습니다.')
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    if (!navigator.clipboard) { flash('이 환경에서는 클립보드 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => flash('복사에 실패했습니다. 직접 선택해 복사해 주세요.'))
  }

  // 연계 — 프로젝트 자료 〈스릴러 장치〉 폴더에 메모로 추가.
  const addToProj = (c: CatDef, d: Device) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '스릴러 장치',
      title: `${d.name} (${c.label})`,
      bodyHtml: deviceToHtml(c, d),
      synopsis: d.def,
      icon: '🧨',
      meta: { 장르: genre, 분류: c.label, 영문: d.alias || '' },
    })
    flash(id ? `프로젝트 자료 〈스릴러 장치〉에 ‘${d.name}’을(를) 추가했습니다.` : '프로젝트 추가에 실패했어요.')
  }

  // 연계 — 글감 스니펫 라이브러리에 보관.
  const stash = (c: CatDef, d: Device) => {
    addToLibrary('snippets', {
      text: deviceToText(c, d),
      source: `스릴러 장치 사전 · ${c.label}`,
      tags: ['스릴러·서스펜스', c.label, d.name, ...(d.alias ? [d.alias] : [])],
    })
    flash(`글감 보관함에 ‘${d.name}’을(를) 담았습니다.`)
  }

  // 관련 도구(같은 장르군 또는 전개 도구)로 데이터와 함께 이동.
  const RELATED: { id: string; label: string; icon: string }[] = [
    { id: 'plot-twist-deck', label: '반전 카드덱', icon: '🃏' },
    { id: 'scene-list', label: '장면 목록', icon: '🎞️' },
    { id: 'plot-pyramid', label: '플롯 피라미드', icon: '🔺' },
    { id: 'save-the-cat-beats', label: '비트시트', icon: '🐱' },
  ]
  const openRelated = (id: string, c?: CatDef, d?: Device) => {
    openToolLinked(id, d ? { genre, device: d.name, note: c ? `${c.label} · ${d.name}` : d.name } : { genre })
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const facetLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 4 }
  const facetRow: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, marginTop: 5 }

  const DeviceBody = ({ c, d }: { c: CatDef; d: Device }) => (
    <>
      <div style={facetRow}><span style={facetLabel}>정의</span>{d.def}</div>
      <div style={facetRow}><span style={facetLabel}>사용법</span>{d.use}</div>
      <div style={facetRow}><span style={facetLabel}>예시</span>{d.ex}</div>
      <div style={{ ...facetRow, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', marginTop: 7 }}>
        <span style={{ ...facetLabel, color: 'var(--warn)' }}>비틀기</span>{d.twist}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(deviceToText(c, d), 'item:' + favKey(c.key, d.name))}>
          {copiedKey === 'item:' + favKey(c.key, d.name) ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
        </button>
        <button className="minibtn" onClick={() => toggleFav(c.key, d.name)} style={{ borderColor: favs[favKey(c.key, d.name)] ? 'var(--accent)' : 'var(--border)' }}>
          {favs[favKey(c.key, d.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="minibtn" onClick={() => stash(c, d)} title="글감 보관함에 담기"><Emoji e="📥"/> 글감 보관</button>
      </div>
      {/* 연계 줄 */}
      <div className="linkbar" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => addToProj(c, d)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈스릴러 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id, c, d)} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div style={wrap}>
      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setMode('dict')} aria-pressed={mode === 'dict'}
          style={{ flex: 1, borderColor: mode === 'dict' ? 'var(--accent)' : 'var(--border)', color: mode === 'dict' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📖"/> 장치 사전 ({total})
        </button>
        <button className="minibtn" onClick={() => setMode('gen')} aria-pressed={mode === 'gen'}
          style={{ flex: 1, borderColor: mode === 'gen' ? 'var(--accent)' : 'var(--border)', color: mode === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎰"/> 장면 설계 조합기
        </button>
      </div>

      {/* 토스트(공통) */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {mode === 'dict' && (
        <>
          <div style={hint}>
            <b>스릴러·서스펜스</b> 고유의 서사 장치와 전개·페이싱·클라이맥스 관습 <b>{total}항목</b>을 정의·사용법·예시·비틀기로 묶었습니다.
            검색·펼침으로 찾고, 무작위로 영감을 얻으세요.
          </div>

          {/* 검색 */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장치·전개법 검색 (예: 티킹 클락, 반전, 신뢰할 수 없는, 클라이맥스)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />

          {/* 카테고리 펼침 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
              style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e="✨"/> 전체
            </button>
            {CATS.map((c) => {
              const on = cat === c.key
              return (
                <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={c.icon}/> {c.label}
                </button>
              )
            })}
            <button className="minibtn" onClick={() => setCat(FAV_KEY)} aria-pressed={cat === FAV_KEY}
              style={{ borderColor: cat === FAV_KEY ? 'var(--accent)' : 'var(--border)', color: cat === FAV_KEY ? 'var(--text)' : 'var(--muted)' }}>
              ★ 즐겨찾기
            </button>
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 장치</button>
            <span style={hint}>{filtered.length}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                {random.item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.item.alias}</span>}
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🔁"/></button>
                <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
              </div>
              <DeviceBody c={random.cat} d={random.item} />
            </div>
          )}

          {/* 목록 (펼침/접힘) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {cat === FAV_KEY ? '★ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : (
              filtered.map(({ cat: c, item }) => {
                const fk = favKey(c.key, item.name)
                const open = !!expanded[fk] || !!query.trim() || cat === FAV_KEY
                return (
                  <div key={fk} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => setExpanded((p) => ({ ...p, [fk]: !open }))}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                      {item.alias && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{item.alias}</span>}
                      <span style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--muted)', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {!open && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>{item.def}</div>}
                    {open && <DeviceBody c={c} d={item} />}
                  </div>
                )
              })
            )}
          </div>

          <div style={hint}>관습은 정답이 아니라 출발점입니다. 정의대로 쓰기보다 <b>비틀기</b>로 독자의 예측을 배신하세요.</div>
        </>
      )}

      {mode === 'gen' && (
        <>
          <div style={hint}>
            7개 슬롯을 무작위로 조합해 <b>스릴러 장면 한 컷</b>을 설계합니다. 마음에 드는 슬롯은 <Emoji e="🔒"/> <b>잠금</b>하고 나머지만 다시 굴리세요.
          </div>

          {/* 조작 줄 + 조합수 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={regenerate} style={{ flex: '0 0 auto' }}><Emoji e="🎰"/> 조합 굴리기</button>
            <button className="minibtn" onClick={() => setLocks({})} title="모든 잠금 해제"><Emoji e="🔓"/> 잠금 해제</button>
            <span style={{ ...hint, marginLeft: 'auto' }} title="7개 슬롯 풀의 곱 = 만들 수 있는 서로 다른 장면 설계 수">
              <Emoji e="🧮"/> 조합수 <b style={{ color: 'var(--accent)' }}>{comboCount.toLocaleString('ko-KR')}</b>가지
            </span>
          </div>

          {/* 슬롯 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const locked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...card, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, width: 78 }}><Emoji e={s.icon}/> {s.label}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{combo[s.key]}</span>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 슬롯 잠금'}
                      style={{ flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                      {locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                    </button>
                    <button className="minibtn" onClick={() => regenSlot(s)} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🔁"/></button>
                    <button className="minibtn" onClick={() => copy(combo[s.key], 'slot:' + s.key)} title="복사" style={{ flexShrink: 0 }}>
                      {copiedKey === 'slot:' + s.key ? <>✓</> : <Emoji e="📋"/>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 조합 결과 동작 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(comboToText(combo), 'combo:all')}>
              {copiedKey === 'combo:all' ? <>✓ 전체 복사됨</> : <><Emoji e="📋"/> 장면 설계 전체 복사</>}
            </button>
            <button className="minibtn" onClick={comboToStash} title="글감 보관함에 담기"><Emoji e="📥"/> 글감 보관</button>
          </div>

          {/* 연계 줄 */}
          <div className="linkbar" style={{ flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={comboToProj} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 장면 설계를 프로젝트 자료 〈스릴러 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>
                <Emoji e={r.icon}/> {r.label}
              </button>
            ))}
          </div>

          <div style={hint}>조합은 출발점입니다. 슬롯 간 충돌이 흥미롭다면 그 모순에서 장면이 살아납니다.</div>
        </>
      )}
    </div>
  )
}
