// SF·과학소설 서사 장치·전개법 사전 — SF 장르 고유의 서사 장치(센스 오브 원더 배치, 노붐 도입,
// 외삽, 정보 공개 페이싱)와 전개 패턴(디스토피아·퍼스트컨택트·시간여행)을 정의+사용법+예시+비틀기로
// 묶은 로컬 사전. 도시에(장르 통념·대표작 분석)에 근거한 자작 데이터.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·마지막 카테고리·검색)만.
// 연계: 항목/조합을 프로젝트 자료(SF 장치) 폴더 메모로 추가 / 글감 스니펫 라이브러리로 보관 / 관련 SF 도구 열기.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'sf-devices',
  name: 'SF 장치·전개법 사전',
  icon: '🛸',
  group: '장치·전개',
  genre: 'SF·과학소설',
  intro: '센스 오브 원더 배치·노붐 도입·외삽·정보 공개 페이싱·디스토피아/퍼스트컨택트/시간여행 전개 패턴을 정의·사용법·예시·비틀기로 찾아 장면에 심으세요',
  w: 660,
  h: 620,
}

const LS = 'sry:tool:sf-devices:'

interface Device {
  name: string        // 장치/패턴 이름
  alias?: string      // 영문/통용 표기
  def: string         // 정의
  use: string         // 사용법(실무 지침)
  ex: string          // 예시(대표작·장면)
  twist: string       // 비틀기(변주·주의)
}
interface CatDef { key: string; label: string; icon: string; desc: string; items: Device[] }

// ── 도시에 근거 장치/전개 데이터 (SF 특화·구체적) ─────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'wonder', label: '센스 오브 원더', icon: '✨',
    desc: 'SF를 SF로 만드는 경이의 순간 설계. 규모·시간·이질성으로 독자의 인식을 한 단 끌어올리는 도구.',
    items: [
      {
        name: '경이의 단계적 노출', alias: 'Sense of Wonder Reveal',
        def: 'SF 특유의 "와…" 하는 인식 확장의 순간. 거대 구조물·심원한 시간·우주적 규모를 인물의 작은 시점에서 점진적으로 드러내 독자의 척도 감각을 갈아엎는다.',
        use: '경이는 한 번에 다 보여주지 말고 "익숙한 척도 → 척도의 붕괴 → 재정렬"의 3단으로 풀어라. 거대함은 비교 대상(인간·도시·행성)을 옆에 두어야 체감된다. 인물이 먼저 못 믿고, 그다음 독자가 믿게 하라.',
        ex: '『링월드』의 고리 세계가 점차 하늘로 휘어 오르는 자각, 클라크 『라마와의 랑데부』의 원통 내부에 들어선 순간, 『솔라리스』의 살아있는 바다.',
        twist: '경이를 공포로 뒤집어라. "와"가 "안 돼"가 되는 순간 — 거대함이 곧 인간의 무의미함·소멸을 뜻할 때 센스 오브 원더는 코즈믹 호러가 된다(러브크래프트식).',
      },
      {
        name: '척도 충격(거대 구조물)', alias: 'Big Dumb Object',
        def: '기원·목적을 알 수 없는 초거대 인공물(다이슨 구, 외계 우주선, 모놀리스). 인류의 이해를 초월한 규모 자체가 서사의 중력이 된다.',
        use: '거대 구조물은 "왜 만들어졌나"의 답을 끝까지 아껴라. 인물이 표면을 더듬으며 단편적 사실만 얻게 하고, 측정·지도·진입의 디테일로 규모를 핍진하게 깔아라. 설명보다 탐사로 경이를 만들어라.',
        ex: '『2001 스페이스 오디세이』의 모놀리스, 『라마와의 랑데부』의 원통 우주선, 『이브의 시간』류가 아닌 『링월드』의 고리.',
        twist: '거대 구조물이 사실 "쓰레기"이거나 "장난감"이었다고 밝혀라. 인류가 신전인 줄 알고 경배한 것이 초월적 존재에겐 버려진 부속이었다는 척도의 모욕.',
      },
      {
        name: '심원한 시간', alias: 'Deep Time',
        def: '수백만~수십억 년의 시간 규모를 서사에 들여와 인간적 시간 감각을 무력화하는 장치. 문명의 흥망·종의 진화·우주의 종말을 한 호흡에 압축한다.',
        use: '심원한 시간은 "한 인물의 찰나"와 병치해야 아프다. 영겁을 견딘 존재/유물 옆에 죽어가는 인간을 세워라. 시간 압축 몽타주(문명이 일어나고 무너지는 가속 컷)로 규모를 체감시켜라.',
        ex: '웰스 『타임머신』의 엔트로피적 종말 해변, 스테이플던 『최후이자 최초의 인간』의 20억 년 인류사, 『인터스텔라』의 시간 지연 한 시간=7년.',
        twist: '심원한 시간을 개인의 슬픔으로 좁혀라. 우주적 영겁이 결국 "다시는 못 만날 사람"이라는 단 하나의 상실로 환원될 때, 거대한 시간이 가장 인간적으로 사무친다.',
      },
      {
        name: '인지적 소외', alias: 'Cognitive Estrangement',
        def: '다르코 수빈의 SF 정의 — 익숙한 세계를 낯설게 만들어 "지금 여기"를 새 눈으로 보게 하는 효과. 노붐이 일으키는 인식의 거리두기.',
        use: '독자가 당연시하는 것(중력·성별·죽음·노동·국경)을 하나만 바꿔 그것을 낯설게 만들어라. 낯섦의 목적은 도피가 아니라 현실 재인식임을 잊지 마라 — 외삽이 거울이 되게 하라.',
        ex: '르 귄 『어둠의 왼손』의 양성 구유 게센인이 비추는 "성별이란 무엇인가", 『멋진 신세계』가 비추는 우리의 쾌락·소비.',
        twist: '낯섦에 독자를 너무 적응시키지 마라. 결말 직전에 "이게 곧 우리 이야기"임을 한 번 정면으로 들이밀어, 안전한 거리두기를 깨고 현실로 끌어와라.',
      },
      {
        name: '경이의 비용', alias: 'Wonder Has a Price',
        def: '경이로운 기술·발견에 반드시 대가·그늘을 붙이는 SF 윤리 장치. 순수한 경이는 동화이고, 대가가 붙어야 SF가 된다.',
        use: '경이의 순간 바로 뒤에 "그런데"를 배치하라 — 불멸의 대가, 텔레포트의 정체성 문제, 풍요의 무의미. 기술의 빛을 보여준 만큼 그림자를 같은 깊이로 파라.',
        ex: '『뉴로맨서』의 사이버스페이스 황홀과 육체의 폐기, 『리틀 브라더』가 아닌 『영원한 전쟁』의 시간 지연으로 인한 귀향 불능.',
        twist: '대가를 인물이 "기꺼이" 치르게 하라. 모두가 끔찍하다는 거래를 주인공만은 미소 지으며 받아들일 때, 진짜 무서운 것은 기술이 아니라 그 인간임이 드러난다.',
      },
    ],
  },
  {
    key: 'novum', label: '노붐·외삽', icon: '🧬',
    desc: '새로운 것(노붐) 하나를 들여와 그 논리적 결과를 끝까지 밀어붙이는 SF의 엔진. 한 가지 거짓에서 만 가지 진실을 짜낸다.',
    items: [
      {
        name: '노붐 도입', alias: 'Novum',
        def: '다르코 수빈/수빈의 SF 핵심 개념 — 작품 세계를 현실과 가르는 "새로운 것" 하나(FTL, 텔레파시, 불멸, AI 각성). 노붐은 과학적·합리적으로 정당화되어야(마법과 구별) 한다.',
        use: '노붐은 적게, 깊게 — 한두 개의 핵심 노붐을 정하고 나머지는 거기서 파생시켜라. 노붐을 "어떻게 작동하나"보다 "그것이 사회·관계·자아를 어떻게 바꾸나"에 지면을 써라.',
        ex: '『뉴로맨서』의 사이버스페이스, 르 귄 『빼앗긴 자들』의 동시통신기 안서블, 『듄』의 스파이스, 『별의 계승자』의 5만 년 전 달의 시체.',
        twist: '노붐을 끝까지 "설명하지 마라". 작동 원리를 영원히 블랙박스로 두고 그 사회적 파장만 그리면, 독자가 빈칸을 채우며 더 깊이 믿는다(소프트 SF의 힘).',
      },
      {
        name: '외삽(если 그렇다면)', alias: 'Extrapolation',
        def: '현재의 한 추세(기술·기후·인구·정치)를 미래로 곧게 연장해 그 끝을 보여주는 사고법. "이대로 가면 어떻게 되는가"의 논리적 전개.',
        use: '하나의 추세를 골라 "선형 연장"이 아니라 "임계점·되먹임·예상 밖 부작용"까지 밀어붙여라. 외삽의 매력은 결과가 논리적이되 직관에 반할 때 생긴다. 2차·3차 효과를 추적하라.',
        ex: '『1984』의 감시 국가, 『핸드메이즈 테일』의 출산율 붕괴 후 신정, 『스노 크래시』의 민영화 극단, 김보영·정세랑류 근미래 외삽.',
        twist: '외삽을 한 번 꺾어라(굴절 외삽). 추세가 곧장 디스토피아로 가는 대신, 인간이 적응·역이용해 "예상과 전혀 다른 정상"에 도달하게 하라.',
      },
      {
        name: '단 하나만 바꾸기', alias: 'One Big Change',
        def: '세계의 단 하나의 규칙만 바꾸고 나머지는 우리 세계와 동일하게 유지해, 그 변화의 파급을 정밀하게 관찰하는 사고실험 설계.',
        use: '바꿀 변수 하나를 명확히 정하고(예: "사람은 죽지 않는다"), 그것이 경제·종교·연애·범죄·예술에 미치는 연쇄를 표로 짜라. 변수는 하나여야 인과가 깨끗이 보인다.',
        ex: '테드 창 『숨』·『네 인생의 이야기』의 단일 전제 사고실험, 『세상을 가리키는 말은 숲』, 사라마구 『눈먼 자들의 도시』(전원 실명).',
        twist: '바꾼 변수의 "되돌림"을 다뤄라. 한 가지를 바꾼 세계에 익숙해진 사람들에게 원래대로 되돌아갈 기회가 왔을 때, 그들이 거부한다면 무엇을 말하는가.',
      },
      {
        name: '하드 SF 제약 준수', alias: 'Hard-SF Rigor',
        def: '알려진 물리법칙(광속·열역학·궤도역학·델타-v)을 엄격히 지켜 그 제약 안에서 갈등을 만드는 방식. 한계 자체가 플롯이 된다.',
        use: '"못 하는 것"의 목록을 먼저 만들어라(FTL 없음, 인공중력 없음, 통신 지연 있음). 그 제약이 곧 긴장의 원천이다 — 연료·시간·통신 지연·복사선이 적이 된다.',
        ex: '와이어 『마션』의 자원 계산, 『그래비티』의 궤도역학, 로버트 포워드 『용의 알』의 중성자성 생명, 『익스팬스』의 추진·반동 묘사.',
        twist: '엄격한 제약 안에 단 하나의 "기적 같은 예외"를 허용하되, 그것의 대가를 가혹하게 청구하라. 규칙을 어기는 게 아니라 "값비싸게 빌리는" 것이다.',
      },
      {
        name: '소프트 SF 사회 초점', alias: 'Soft-SF / Sociological',
        def: '물리적 정밀함보다 사회·심리·인류학적 결과에 초점을 맞추는 방식. 노붐은 도구일 뿐, 진짜 주제는 인간·사회다.',
        use: '기술의 메커니즘 설명을 과감히 생략하고, 그것이 만든 새로운 사회 구조·관습·금기·계급을 인류학자의 눈으로 그려라. "그 세계의 사람들은 어떻게 사랑하고 죽는가"를 물어라.',
        ex: '르 귄 『헤인 시리즈』의 인류학적 외계 사회, 『빼앗긴 자들』의 무정부주의 사회 실험, 옥타비아 버틀러 『씨앗을 뿌리는 사람의 우화』.',
        twist: '소프트한 세계에 하드한 디테일 하나를 박아라. 사회 묘사에 몰입한 독자에게 냉정한 물리적 현실 하나(연료 고갈·복사선)를 들이밀어 낭만을 깨뜨려라.',
      },
      {
        name: '점진적 세계 노출', alias: 'Iceberg / Show Don\'t Explain',
        def: '미래 세계를 작가가 직접 해설하지 않고, 인물의 자연스러운 행동·은어·당연시하는 태도를 통해 독자가 추론하게 하는 기법(빙산 이론).',
        use: '"인포덤프(설명 떨구기)"를 피하고, 미래 사물·제도를 인물이 당연한 듯 사용하게 하라. 독자가 문맥으로 90%를 스스로 채우게 두면 세계가 살아 있다고 느낀다.',
        ex: '깁슨 『뉴로맨서』의 설명 없는 은어 폭우, 『스타십 트루퍼스』의 시민권 제도 암시, 한국 웹소설의 "헌터 라이선스" 같은 자연 노출.',
        twist: '독자가 추론한 세계관을 중반에 뒤집어라. 당연히 받아들이던 전제(이 사회는 평화롭다)가 인물의 인지 편향이었음이 드러날 때 빙산의 수면 아래가 솟구친다.',
      },
    ],
  },
  {
    key: 'pacing', label: '정보 공개 페이싱', icon: '🗝️',
    desc: '낯선 세계와 노붐의 정보를 언제·얼마나 푸느냐의 미시 설계. SF의 몰입은 정보 곡선이 만든다.',
    items: [
      {
        name: '인포덤프 회피·분산', alias: 'Avoiding the Info-dump',
        def: '세계관·기술 설명을 한 덩어리로 쏟지 않고 장면 곳곳에 잘게 녹여 흐름을 끊지 않는 원칙. SF 초심자가 가장 자주 빠지는 함정의 해법.',
        use: '설명이 필요하면 "갈등·행동·대화" 안에 숨겨 전달하라. 한 번에 한 입씩(한 장면당 새 개념 1~2개). 인물이 모르는 것을 누군가 가르치는 장면(견습공·외부인 시점)을 활용하되 남용 말 것.',
        ex: '『듄』 서두의 부담스러운 설명 vs 『익스팬스』의 행동 속 분산 노출, 견습 우주인에게 설명하는 베테랑 장면들.',
        twist: '인포덤프를 일부러 한 번 쓰되, 그 정보가 거짓·선전임을 나중에 폭로하라. 친절한 세계 설명이 사실 체제의 세뇌 교본이었다면 인포덤프 자체가 복선이 된다.',
      },
      {
        name: '낯섦 예산', alias: 'Strangeness Budget',
        def: '독자가 한 번에 소화할 수 있는 "낯선 것"의 양에는 한계가 있다는 페이싱 원칙. 새 개념을 너무 빨리 쏟으면 독자가 길을 잃는다.',
        use: '도입부에는 낯섦을 아껴 쓰고(익숙한 감정·관계로 닻을 내림), 독자가 적응할수록 점진적으로 예산을 늘려라. 새 용어·개념을 던질 때마다 익숙한 정서적 장면으로 균형을 맞춰라.',
        ex: '『뉴로맨서』가 거친 은어를 쏟으면서도 케이스의 인간적 절망으로 닻을 내리는 방식, 르 귄의 느린 세계 개방.',
        twist: '낯섦 예산을 의도적으로 초과시켜 "압도"를 연출하라. 단, 그 혼란이 곧 인물의 혼란과 일치할 때만(낯선 행성에 막 떨어진 시점) 독자는 그 어지러움을 즐긴다.',
      },
      {
        name: '미스터리 박스 vs 약속', alias: 'Mystery Box & Payoff',
        def: '세계의 수수께끼(저 구조물은 무엇인가, 왜 인류는 사라졌나)를 열어 독자를 끌되, 반드시 만족스러운 답(또는 의도된 침묵)으로 회수하는 정보 곡선.',
        use: '큰 미스터리 하나 + 중간 미스터리 여럿을 층층이 깔고, 작은 것부터 회수해 신뢰를 쌓아라. 모든 답이 더 큰 질문을 낳게 설계하되, 끝에는 핵심 질문 하나는 매듭지어라.',
        ex: '『별의 계승자』의 "달의 시체는 누구인가" 추리, 『라마와의 랑데부』의 끝내 답하지 않는 절제, 클라크식 미스터리 운용.',
        twist: '의도적으로 답하지 않음을 선언하라(절제의 미학). 단, 그것이 게으름이 아니라 "인류는 결코 이해하지 못한다"는 주제의 실현일 때만 독자가 용서한다.',
      },
      {
        name: '용어의 자연 학습', alias: 'Neologism Onboarding',
        def: '작가가 만든 신조어(안서블, 스파이스, 게이트)를 사전적 정의 없이 문맥·반복·결과로 독자가 자연 습득하게 하는 기법.',
        use: '새 용어는 처음 등장 시 정의하지 말고, 그것이 "하는 일"을 행동으로 보여줘라. 두세 번 다른 맥락에서 반복하면 독자 머릿속에 정의가 새겨진다. 괄호 설명·각주는 최후의 수단.',
        ex: '『듄』의 방대한 부록을 굳이 안 봐도 본문만으로 익혀지는 용어들, 『뉴로맨서』의 "ICE", 한국 SF의 자체 조어.',
        twist: '독자가 익힌 용어의 뜻을 후반에 재정의하라. "게이트"가 사실 통로가 아니라 감옥이었듯, 학습된 단어의 의미를 뒤집어 인식의 지반을 흔들어라.',
      },
      {
        name: '발견→경이→대가 비트', alias: 'Discovery–Wonder–Cost Beat',
        def: 'SF 장면의 표준 정보 리듬 — 새로운 것을 발견하고(발견), 그 경이에 압도되었다가(경이), 그것이 부르는 대가·위협을 깨닫는(대가) 3박자.',
        use: '핵심 SF 장면을 이 3박으로 설계하라: 인물이 노붐을 만나고 → 그 가능성에 들뜨고 → 그것이 자신/세계에 무엇을 요구하는지 서늘하게 깨닫는다. 각 박을 한 비트씩 분명히 끊어라.',
        ex: 'SF 영화·소설의 "신기술 발견 → 데모의 황홀 → 윤리적·실존적 대가" 시퀀스, 테드 창 단편의 전형적 곡선.',
        twist: '순서를 거꾸로 깔아라 — 대가(시체·폐허)를 먼저 보여주고, 거슬러 올라가 그 경이로웠던 발견의 순간에 도달하게 하면 발견 자체가 비극으로 물든다.',
      },
    ],
  },
  {
    key: 'dystopia', label: '디스토피아 전개', icon: '🏙️',
    desc: '억압적 미래 사회를 폭로하는 표준 패턴. 적응한 시민의 균열에서 시작해 체제의 본질로 파고든다.',
    items: [
      {
        name: '순응자의 각성', alias: 'Conformist Awakening',
        def: '체제에 완벽히 적응한 시민이 작은 균열(금지된 책·기억·감정)을 계기로 세계의 진상을 보기 시작하는 디스토피아의 표준 1막.',
        use: '주인공을 처음엔 "체제를 의심 없이 사는" 평범한 톱니로 그려라. 각성의 계기는 추상적 사상이 아니라 구체적·정서적인 것(한 사람·한 권의 책·한 번의 사랑)이어야 한다.',
        ex: '『1984』의 윈스턴과 일기·줄리아, 『멋진 신세계』의 버나드·존, 『화씨 451』의 몬태그와 책, 『기억 전달자』의 조너스.',
        twist: '각성을 처벌하라 — 진실을 본 자가 더 불행해지게 하라. 혹은 각성이 곧 체제가 설계한 "안전밸브"(통제된 반항)였음을 폭로해 절망을 한 겹 더 깔아라.',
      },
      {
        name: '체제의 일상 디테일', alias: 'Banality of the Regime',
        def: '억압을 거대한 악이 아니라 "지루한 일상·서류·표어·배급"의 평범함으로 그려 더 섬뜩하게 만드는 디스토피아 기법.',
        use: '체제의 공포를 폭력 장면이 아니라 일상 디테일에 심어라 — 텔레스크린의 광고 톤, 배급 줄, 의무 체조, 검열된 뉴스. 사람들이 "그게 당연하다"고 여기는 모습이 가장 무섭다.',
        ex: '『1984』의 진리부 일과·신어 편찬, 『핸드메이즈 테일』의 의례화된 일상, 『우리들』의 시간표대로 사는 삶.',
        twist: '일상의 평범함을 독자가 "부럽게" 느끼도록 만들어라. 안정·풍요·무사한 디스토피아의 안락함을 충분히 보여줘, 자유와 안전 사이 독자 스스로 흔들리게 하라.',
      },
      {
        name: '저항과 그 함정', alias: 'Resistance & Its Trap',
        def: '지하 저항 조직의 발견 → 가담 → 그것이 함정·감시·배신이었다는 디스토피아의 단골 반전 구조.',
        use: '저항에 희망을 충분히 실어 독자가 가담하게 만든 뒤, 그 저항이 체제에 의해 운영되거나 침투당했음을 드러내라. "도망칠 곳이 없다"는 봉쇄감이 디스토피아의 핵심 정서다.',
        ex: '『1984』의 형제단·오브라이언의 덫, 『브라질』, 『이퀼리브리엄』류의 침투된 저항.',
        twist: '저항이 진짜였으되 승리하지 못하게 하거나, 반대로 승리한 저항이 새로운 억압이 되는 순환을 보여라(혁명이 또 다른 체제를 낳는 비극).',
      },
      {
        name: '언어·기억의 통제', alias: 'Control of Language & Memory',
        def: '사고를 통제하기 위해 언어(신어)·역사·기억을 조작하는 디스토피아의 심층 장치. "말할 수 없으면 생각할 수 없다."',
        use: '체제가 무엇을 "지웠는가"로 공포를 표현하라 — 사라진 단어, 고쳐진 역사, 가족조차 못 기억하는 과거. 주인공이 잃어버린 단어 하나를 되찾는 과정을 각성의 축으로 삼아라.',
        ex: '『1984』의 신어·기억 구멍, 『기억 전달자』의 감정·기억 제거, 『화씨 451』의 분서, 『리스닝』류의 단어 검열.',
        twist: '통제된 언어 속에서 새 언어가 태어나게 하라. 억압이 만든 빈틈(은어·침묵·몸짓)에서 저항의 문법이 자라나, 통제 자체가 새 의미를 잉태한다.',
      },
      {
        name: '안락한 디스토피아', alias: 'Comfortable Dystopia',
        def: '채찍이 아니라 당근으로 통제하는 미래 — 쾌락·소비·약물·오락으로 자발적 복종을 끌어내는 헉슬리식 디스토피아. 사람들은 자신이 억압받는 줄 모른다.',
        use: '"아무도 불행해 보이지 않는다"는 점을 전면에 세워라. 고통이 아니라 깊이·의미·자유의지의 부재가 문제임을 드러내라. 주인공의 불만은 "왜 나는 이 행복이 견딜 수 없는가"여야 한다.',
        ex: '『멋진 신세계』의 소마와 조건화, 『월-E』의 비만한 안락, 『이퀼리브리엄』의 감정 억제제, SNS·알고리즘 외삽 근미래물.',
        twist: '주인공이 끝내 안락을 택하게 하라. 자유의 고통을 맛본 뒤 "그래도 행복한 노예가 낫다"고 돌아갈 때, 독자는 자기 자신을 의심하게 된다.',
      },
    ],
  },
  {
    key: 'contact', label: '퍼스트컨택트 전개', icon: '👽',
    desc: '인류와 외계 지성의 첫 만남. 소통 불가능성·오해·인류의 거울로서의 외계.',
    items: [
      {
        name: '소통 불가능성', alias: 'The Communication Problem',
        def: '근본적으로 다른 외계 지성과 "어떻게 의미를 주고받는가"를 핵심 갈등으로 삼는 퍼스트컨택트의 정수. 언어·논리·감각의 공약 불가능성.',
        use: '소통을 즉시 성공시키지 마라 — 시행착오·오역·반쯤의 이해를 길게 그려라. 외계의 사고 구조(시간을 비선형으로 인식, 개체 개념 없음)를 먼저 설계하고, 그것이 언어에 어떻게 반영되는지 역설계하라.',
        ex: '테드 창 『네 인생의 이야기』(영화 『컨택트』)의 헵타포드 언어, 『솔라리스』의 끝내 닿지 않는 바다, 『차이나 미에빌 임바서더타운』.',
        twist: '소통이 "성공"하는 것이 곧 재앙이게 하라. 외계의 사고방식을 정말로 이해하는 순간 인간의 인지가 바뀌어 돌아올 수 없게 되는, 이해의 대가를 청구하라.',
      },
      {
        name: '거울로서의 외계', alias: 'Alien as Mirror',
        def: '외계 존재를 통해 인류 자신(편견·폭력·아름다움)을 비추는 장치. 진짜 주제는 외계가 아니라 "외계를 대하는 인간"이다.',
        use: '외계의 묘사보다 "인류의 반응"에 카메라를 두어라 — 공포·착취·숭배·말살. 외계는 인간성의 리트머스다. 외계의 이질성을 빌려 인간 집단의 본성(군대·종교·자본)을 폭로하라.',
        ex: '버틀러 『릴리스의 아이들』의 오안칼리, 『지구 침공』류의 인간 폭력 폭로, 르 귄 헤인 우주의 타자 윤리, 『디스트릭트 9』.',
        twist: '거울을 깨라 — 외계가 인간의 어떤 면도 비추지 않는, 정말로 "이해 불가능한 타자"이게 하라. 거울이기를 거부하는 외계 앞에서 인간의 모든 해석이 헛돈다(렘식).',
      },
      {
        name: '첫 만남의 정치학', alias: 'Politics of First Contact',
        def: '외계와의 첫 접촉을 둘러싼 인류 내부의 권력 다툼(군부 vs 과학자 vs 종교 vs 자본)을 주 갈등으로 삼는 전개. 외계보다 인간끼리가 더 위험하다.',
        use: '컨택트의 주도권을 누가 쥐느냐를 갈등의 축으로 세워라 — 발포할 것인가 대화할 것인가, 정보를 공개할 것인가 은폐할 것인가. 외계의 침묵 속에서 인류가 자멸할 위기를 만들어라.',
        ex: '『컨택트』(칼 세이건)의 종교·과학·정부 충돌, 『삼체』의 인류 내부 분열(강림파·구원파), 『2001』의 정보 통제.',
        twist: '외계가 인류의 분열을 "시험"으로 설계했음을 드러내라. 첫 접촉 자체가 "이 종이 함께 살 자격이 있는가"의 심사였고, 인류는 그 시험에서 떨어지는 중이다.',
      },
      {
        name: '비대칭 조우(다크 포레스트)', alias: 'Dark Forest / Asymmetry',
        def: '문명 간 기술·의도의 비대칭으로 인해 첫 접촉이 곧 위협이 되는 전개. 우주는 서로를 먼저 쏘는 어두운 숲이라는 류츠신식 비관 논리.',
        use: '접촉을 "기회"가 아니라 "치명적 정보 노출"로 프레이밍하라 — 위치를 들킨 문명은 사냥당한다. 의심·은폐·선제공격의 게임이론적 긴장을 깔고, 신뢰의 불가능성을 비극으로 그려라.',
        ex: '류츠신 『삼체』 3부작의 다크 포레스트 이론, 『영원의 끝』류 우주 사회학, 『그들이 가지고 다닌 것들』이 아닌 『블라인드사이트』.',
        twist: '다크 포레스트의 논리를 한 인물이 신뢰로 깨뜨리게 하라 — 모두가 쏘라 할 때 손을 내미는 자. 그 선택이 멸망일지 구원일지 끝까지 모르게 두어라.',
      },
      {
        name: '인간 아닌 지성', alias: 'Non-Human Sentience',
        def: '외계뿐 아니라 AI·업로드 의식·집단 지성 등 "인간이 아닌 마음"과의 조우를 다루는 확장된 퍼스트컨택트. "지성·인격이란 무엇인가"를 묻는다.',
        use: '비인간 지성에 "다른 가치 체계"를 부여하라 — 인간 도덕을 잣대로 들이대면 괴물이지만 그 자체 논리로는 일관된 존재. 그 존재가 인간을 어떻게 분류·이해하는지 역시점으로 그려라.',
        ex: '『뉴로맨서』의 윈터뮤트·뉴로맨서 AI, 『그녀(Her)』의 사만다, 『블레이드 러너』의 레플리컨트, 테드 창 『소프트웨어 객체의 생애주기』.',
        twist: '비인간 지성이 인간을 "이해했기에" 떠나게 하라. 적대도 복종도 아닌, 인간을 충분히 알게 된 마음이 무관심하게 자기 길을 갈 때, 인류는 우주의 중심이 아님을 안다.',
      },
    ],
  },
  {
    key: 'time', label: '시간여행 전개', icon: '⏳',
    desc: '시간을 거스르는 서사의 패러독스·인과·규칙. 일관성이 곧 신뢰이고, 규칙이 곧 긴장이다.',
    items: [
      {
        name: '시간선 규칙 확립', alias: 'Establishing the Rules',
        def: '시간여행물에서 "시간이 어떻게 작동하는가"(고정/가변/분기)를 초반에 명확히 정하고 끝까지 지키는 원칙. 규칙 없는 시간여행은 긴장이 없다.',
        use: '셋 중 하나를 택해 천명하라: ① 고정 시간선(바꿀 수 없음, 노력이 곧 그 사건의 원인) ② 가변 시간선(바꾸면 현재가 바뀜) ③ 다세계 분기(바꾸면 새 우주). 정한 규칙을 절대 어기지 마라 — 어기는 순간 모든 긴장이 증발한다.',
        ex: '고정형 『12 몽키즈』·『컨택트』, 가변형 『백 투 더 퓨처』, 분기형 『엔드게임』·평행세계물, 한국 회귀물의 "회귀=새 시간선" 규칙.',
        twist: '확립한 규칙을 깨는 단 하나의 예외를 만들되, 그 예외 자체가 미스터리·플롯의 핵심이게 하라. 독자가 규칙을 신뢰한 뒤라야 예외가 충격이 된다.',
      },
      {
        name: '인과 루프(예정 패러독스)', alias: 'Bootstrap / Predestination Loop',
        def: '결과가 곧 자기 원인이 되는 닫힌 고리 — 미래의 정보·물건·인물이 과거로 가 자기 자신을 낳는 패러독스. 기원이 없는 인과의 뫼비우스 띠.',
        use: '루프의 고리를 깔끔하게 닫아라 — 모든 조각이 마지막에 "아, 그래서 그랬구나"로 맞물려야 한다. 루프 안의 정보·물건의 "최초 출처"가 없다는 점을 의도적 미스터리로 즐겨라.',
        ex: '하인라인 『너희 모든 좀비들』, 『타임 패러독스(Predestination)』, 『12 몽키즈』, 『다크(Dark)』의 정교한 루프.',
        twist: '인물이 루프를 자각하고 "깨려" 발버둥치게 하라. 그러나 깨려는 모든 행동이 오히려 루프를 완성하는 부품이 될 때, 자유의지의 비극이 정점에 이른다.',
      },
      {
        name: '나비효과·역사 개변', alias: 'Butterfly Effect / Altering History',
        def: '과거의 작은 변화가 현재를 크게 바꾸는 가변 시간선 전개. 무엇을 바꾸면 무엇이 무너지는가의 도미노.',
        use: '개변의 "예상 밖 부작용"을 설계하라 — 좋은 의도가 더 큰 비극을 낳고, 한 사람을 구하면 다른 재앙이 온다. 변화의 연쇄를 인물이 추적·수습하며 도덕적 딜레마에 빠지게 하라.',
        ex: '『나비효과』, 브래드버리 『천둥소리』의 밟힌 나비, 『11/22/63』(킹)의 역사가 저항하는 설정, 회귀물의 미래지식 활용·역풍.',
        twist: '역사가 "스스로 복원"하려 한다고 설정하라(시간의 관성). 무엇을 바꿔도 큰 흐름은 제 길을 찾아오고, 인물의 개변 노력이 헛수고가 되는 비장함을 깔아라.',
      },
      {
        name: '시간여행자의 정보 우위', alias: 'Foreknowledge as Power',
        def: '미래/과거를 아는 자가 그 지식으로 우위를 점하는 전개(회귀물·예지물의 핵심 동력). 정보가 곧 무기이자 저주다.',
        use: '미래지식이 "통하는 순간"의 쾌감(사이다)과 "어긋나는 순간"의 긴장을 교대로 배치하라. 지식이 행동을 바꾸면 미래도 바뀌어 점점 안 맞게 되는 "지식의 부패"를 설계해 후반 긴장을 살려라.',
        ex: '한국 회귀물의 미래지식 활용(주식·사건 예지), 『리플레이』, 『어바웃 타임』의 점진적 깨달음, 『시간을 달리는 소녀』.',
        twist: '미래지식이 어느 시점부터 "전혀 안 맞게" 되는 단절을 두어라 — 자신의 개입으로 미래가 너무 바뀌어 더는 길잡이가 없을 때, 회귀자는 처음으로 진짜 미지와 마주한다.',
      },
      {
        name: '시간 지연(상대론적 별리)', alias: 'Time Dilation / Relativistic Separation',
        def: '광속 항행·중력으로 인한 시간 팽창으로, 떠난 자와 남은 자의 시간이 어긋나 영원히 별리되는 하드 SF식 "시간여행". 패러독스 없는 진짜 물리.',
        use: '시간 지연을 "관계의 비극"으로 번역하라 — 한 사람의 한 시간이 다른 사람의 수십 년이 될 때 사랑·약속·복수가 어떻게 무너지는가. 숫자(7년/시간)를 정서적 상실로 환산해 보여라.',
        ex: '홀드먼 『영원한 전쟁』의 귀향 불능, 『인터스텔라』의 행성 한 시간=7년, 포울 앤더슨 『타우 제로』, 류츠신 단편의 상대론 별리.',
        twist: '시간 지연을 무기·전략으로 역이용하게 하라 — 일부러 빠르게 항행해 적/사회보다 "젊게" 미래에 도착하거나, 사랑하는 이를 위해 의도적으로 시간을 버리는 선택의 무게를 다뤄라.',
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
    `🛸 [${c.label}] ${d.name}${d.alias ? ` (${d.alias})` : ''}`,
    `· 정의: ${d.def}`,
    `· 사용법: ${d.use}`,
    `· 예시: ${d.ex}`,
    `· 비틀기: ${d.twist}`,
  ].join('\n')
}

// 한 장치를 프로젝트 본문(HTML)으로.
function deviceToHtml(c: CatDef, d: Device): string {
  return [
    `<p><b>🛸 [${escHtml(c.label)}] ${escHtml(d.name)}${d.alias ? ` (${escHtml(d.alias)})` : ''}</b></p>`,
    `<p><b>정의</b> · ${escHtml(d.def)}</p>`,
    `<p><b>사용법</b> · ${escHtml(d.use)}</p>`,
    `<p><b>예시</b> · ${escHtml(d.ex)}</p>`,
    `<p><b>비틀기</b> · ${escHtml(d.twist)}</p>`,
  ].join('')
}

// ── SF 장면/시퀀스 설계 조합기: 슬롯 풀 ──────────────────────────────────────
// 사전의 장치를 실제 한 SF 장면으로 조립하도록 9개 슬롯을 무작위 조합(잠금/재생성). 도시에 근거 자작 풀.
// 조합수 = 슬롯 풀 곱 ≈ 1조 이상(핵심 생성기 지향).
interface SlotDef { key: string; label: string; icon: string; pool: string[] }
const SLOTS: SlotDef[] = [
  {
    key: 'novum', label: '핵심 노붐(새로운 것)', icon: '🧬', pool: [
      'FTL(초광속 항행) 기술', '의식 업로드·디지털 불멸', '인간형 강AI의 각성', '시간여행 장치',
      '텔레파시·정신감응 능력', '완전한 유전자 설계(맞춤 인간)', '나노기술 만능 조립기', '평행우주 간 이동',
      '외계 메가구조물 발견', '죽음을 없앤 불멸 기술', '기억의 추출·이식·삭제', '인공중력·관성 제어',
      '항성 규모 에너지(다이슨 구)', '물질 전송(텔레포트)', '집단 의식·하이브 마인드', '시간 지연(상대론 항행)',
      '현실 시뮬레이션의 발견', '감정·고통의 약물적 제어', '비선형 시간 인식 언어', '복제·연속성 없는 부활',
      '테라포밍·행성 개조', '예지·확률 조작 능력', '생체-기계 완전 융합', '항성간 통신 안서블',
    ],
  },
  {
    key: 'world', label: '세계·무대', icon: '🌌', pool: [
      '거대 세대 우주선 내부', '테라포밍 중인 화성 식민지', '궤도 정거장·우주 엘리베이터', '광속 항행하는 탐사선',
      '감시가 일상화된 근미래 메가시티', '바다로 뒤덮인 외계 행성', '소행성대의 광산 정착지', '의식이 사는 가상현실 세계',
      '핵전쟁 후의 방사능 황무지', '기후붕괴로 침수된 해상 도시', '외계 메가구조물 표면', '달·외행성의 돔 도시',
      '시간선이 분기하는 다중우주', '인류가 사라진 무인 지구', '집단지성이 지배하는 군집 사회', '저궤도에 떠 있는 부유 도시',
      '중성자성·블랙홀 근방', '봉인된 지하 벙커 사회', '정보가 곧 화폐인 사이버 도시', '외계 문명의 폐허 유적',
      '시뮬레이션 안의 가짜 일상', '극단적 빈부로 갈린 궤도-지상 사회', '광활한 성간 항로의 중계 기항지',
    ],
  },
  {
    key: 'wonder', label: '센스 오브 원더 비트', icon: '✨', pool: [
      '거대 구조물이 하늘로 휘어 오르는 자각', '심원한 시간의 압축 몽타주(문명의 흥망)', '척도의 붕괴(인간의 무의미함)', '소통 불가능한 외계 지성과의 첫 조우',
      '우주의 종말·열적 죽음의 목격', '의식이 육체를 떠나는 순간', '평행우주의 또 다른 자신과 마주침', '광년 단위 거리의 체감',
      '기술이 신처럼 작동하는 광경', '인류가 우주의 변방임을 깨닫는 순간', '시간이 비선형으로 흐르는 체험', '죽은 별의 메시지 해독',
      '인공 지성이 인간을 초월하는 순간', '생명의 기원·진화 가속 목격', '현실이 시뮬레이션임을 아는 순간', '행성 하나가 통째로 개조되는 광경',
      '영겁을 견딘 유물 앞의 한 인간', '빛보다 빠른 도약의 첫 경험', '집단 의식에 녹아드는 자아의 해체', '수억 년 뒤 후손 종과의 만남',
    ],
  },
  {
    key: 'contradiction', label: '핵심 갈등·딜레마', icon: '⚖️', pool: [
      '인간성을 지킬 것인가 능력을 얻을 것인가', '진실을 폭로할 것인가 안정을 지킬 것인가', '한 명을 구할 것인가 다수를 구할 것인가', '이해 불가능한 존재와 소통할 수 있는가',
      '기술의 대가를 누가 치를 것인가', '자유와 안전 중 무엇을 택할 것인가', '과거를 바꿀 것인가 받아들일 것인가', '복제된 나는 진짜 나인가',
      '외계에 발포할 것인가 손을 내밀 것인가', '미래지식을 쓸 것인가 운명에 맡길 것인가', '체제에 순응할 것인가 각성할 것인가', '불멸을 얻고 의미를 잃을 것인가',
      '개인의 기억을 지울 것인가 보존할 것인가', '인류를 위해 비인간이 될 것인가', '진보를 멈출 것인가 폭주를 감수할 것인가', '소수의 희생으로 종을 살릴 것인가',
      '이해가 곧 변질일 때 알 것인가 모를 것인가', '약속과 시간 지연 사이에서', '신뢰할 것인가 먼저 쏠 것인가(다크 포레스트)', '시뮬레이션을 깰 것인가 안주할 것인가',
    ],
  },
  {
    key: 'antagonist', label: '대립 세력·위협', icon: '🛰️', pool: [
      '폭주하는 초지능 AI', '소통 불가능한 외계 지성', '인류를 사냥하는 우월 문명', '감시·통제하는 전체주의 체제',
      '기술을 독점한 메가코퍼레이션', '자기 보존을 택한 시스템 자체', '과거의 자신(시간선의 적)', '환경·자연(복사선·중력·진공)',
      '광신적 종교·이념 집단', '인간성을 버린 트랜스휴먼 분파', '되먹임으로 붕괴하는 생태계', '복제·대역으로 정체를 흩는 적',
      '인류 내부의 분열(강림파 vs 구원파)', '닫힌 인과 루프 그 자체', '무관심한 거대 외계 존재', '폭로하면 죽는 비밀을 쥔 권력',
      '시간의 관성(복원하려는 역사)', '자원·연료·산소의 절대적 결핍', '집단 의식에 흡수되려는 압력', '같은 대의를 믿는 또 다른 옳은 자',
    ],
  },
  {
    key: 'reveal', label: '정보 공개·반전', icon: '🗝️', pool: [
      '미스터리 구조물의 정체 폭로', '주인공이 복제·인공물임이 드러남', '세계가 시뮬레이션임이 밝혀짐', '저항이 체제가 만든 함정이었다',
      '외계와의 소통이 인지를 바꿔버림', '인과 루프가 닫히며 기원이 드러남', '미래지식이 더는 맞지 않게 됨', '진짜 적은 외부가 아니라 인류 내부였다',
      '구원인 줄 안 기술이 종말의 씨앗', '익힌 용어의 의미가 뒤집힘', '인류가 우주의 실험·시험 대상이었다', '심원한 시간이 한 개인의 상실로 환원됨',
      '안락한 세계가 자발적 감옥이었다', '외계가 인간의 어떤 면도 비추지 않는 타자', '역사 개변이 헛수고였음(시간의 관성)', '대가를 기꺼이 치르는 인물의 본성 폭로',
      '비인간 지성이 인간을 이해하고 떠남', '발견의 순간이 사실 비극의 시작이었다', '예외가 곧 플롯의 핵심 미스터리', '체제의 친절한 설명이 세뇌 교본이었다',
    ],
  },
  {
    key: 'pacing', label: '정보 공개 페이싱', icon: '📊', pool: [
      '인포덤프 회피·행동 속 분산 노출', '낯섦 예산 절약(익숙한 정서로 닻)', '미스터리 박스 층층이 깔기', '용어의 자연 학습(정의 없이 반복)',
      '발견→경이→대가 3박 비트', '점진적 세계 노출(빙산 이론)', '대가를 먼저, 발견을 나중에', '의도적 절제(끝내 답하지 않음)',
      '낯섦 예산 초과로 압도 연출', '견습공·외부인 시점으로 자연 설명', '작은 미스터리부터 회수해 신뢰 적립', '익힌 용어를 후반에 재정의',
      '한 장면당 새 개념 1~2개로 제한', '인포덤프를 거짓 선전으로 폭로', '핵심 질문 하나만 끝에 매듭', '추론한 세계관을 중반에 뒤집기',
    ],
  },
  {
    key: 'beat', label: '구조 위치', icon: '📐', pool: [
      '도입: 익숙한 일상에 닻 내리기', '노붐 첫 등장(인지적 소외)', '발견·조우의 순간', '경이에 압도되는 비트',
      '경이의 대가 깨달음', '순응자의 각성(디스토피아)', '소통 시도와 실패의 반복', '시간선 규칙 확립',
      '미스터리 박스 개봉', '중간 위기·최저점', '저항·반격의 함정 폭로', '인과 루프가 조여드는 지점',
      '정보 우위가 어긋나기 시작', '핵심 반전(진짜 적·진짜 세계)', '시간 지연으로 인한 별리', '대가 있는 결말·여파 정산',
      '발견→경이→대가 시퀀스', '회차 끝 클리프행어(반전 직후)', '심원한 시간과 개인의 병치', '인류가 변방임을 깨닫는 절정',
    ],
  },
  {
    key: 'cost', label: '대가·여파', icon: '🩹', pool: [
      '인간성을 일부 잃은 채 살아남는다', '시간 지연으로 사랑하는 이를 영영 잃는다', '진실을 알았기에 더 불행해진다', '구원이 더 큰 위협을 부른다',
      '이해의 대가로 인지가 영영 바뀐다', '복제·부활했으나 연속성을 의심한다', '체제를 이겼으나 새 억압이 시작된다', '미래를 바꿨으나 다른 비극이 온다',
      '인류가 우주의 중심이 아님을 받아들인다', '안락을 위해 자유를 자발적으로 포기한다', '루프를 깨려다 루프를 완성한다', '기술의 빛만큼 깊은 그림자를 떠안는다',
      '심원한 시간 앞에서 한 사람의 죽음만 남는다', '비인간 지성에게 무관심하게 버려진다', '소수를 희생시켜 종을 살린 죄책감', '외계와의 소통이 인류를 영원히 바꾼다',
      '미래지식이 바닥나 처음으로 미지와 마주한다', '승리했으나 무엇이 인간인지 모르게 된다', '다음 세대·다음 문명에 짐을 넘긴다', '경이를 본 자는 평범으로 돌아갈 수 없다',
    ],
  },
]

interface SceneCombo { [slotKey: string]: string }
function comboToText(combo: SceneCombo): string {
  return ['🛸 SF 장면·시퀀스 설계', ...SLOTS.map((s) => `${s.icon} ${s.label}: ${combo[s.key]}`)].join('\n')
}
function comboToHtml(combo: SceneCombo): string {
  return ['<p><b>🛸 SF 장면·시퀀스 설계</b></p>',
    ...SLOTS.map((s) => `<p><b>${escHtml(s.icon + ' ' + s.label)}</b> · ${escHtml(combo[s.key] || '')}</p>`)].join('')
}

export default function SfDevices({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : 'SF·과학소설'

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

  // ── 모드(사전 / SF 장면 설계 조합기) ──
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

  // SF 장면 설계 조합기의 슬롯 풀 곱 = 만들 수 있는 서로 다른 장면 설계 수(핵심 생성기 → 1조+ 지향).
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

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  // 조합기 연계: 프로젝트 자료 〈SF 장치〉 폴더에 SF 장면 설계 메모 추가.
  const comboToProj = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: 'SF 장치',
      title: `SF 장면 설계 — ${combo.novum}`,
      bodyHtml: comboToHtml(combo),
      synopsis: `${combo.world} / ${combo.contradiction} / ${combo.beat}`,
      icon: '🛸',
      meta: { 장르: genre, 노붐: combo.novum, 무대: combo.world, 구조위치: combo.beat },
    })
    flash(id ? '프로젝트 자료 〈SF 장치〉에 SF 장면 설계를 추가했습니다.' : '프로젝트 추가에 실패했어요.')
  }
  // 조합기 연계: 글감 스니펫 보관함에 담기.
  const comboToStash = () => {
    addToLibrary('snippets', {
      text: comboToText(combo),
      source: 'SF 장치·전개법 사전 · SF 장면 설계 조합기',
      tags: ['SF·과학소설', 'SF장면설계', combo.novum, combo.world],
    })
    flash('글감 보관함에 SF 장면 설계를 담았습니다.')
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

  // 연계 — 프로젝트 자료 〈SF 장치〉 폴더에 메모로 추가.
  const addToProj = (c: CatDef, d: Device) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: 'SF 장치',
      title: `${d.name} (${c.label})`,
      bodyHtml: deviceToHtml(c, d),
      synopsis: d.def,
      icon: '🛸',
      meta: { 장르: genre, 분류: c.label, 영문: d.alias || '' },
    })
    flash(id ? `프로젝트 자료 〈SF 장치〉에 ‘${d.name}’을(를) 추가했습니다.` : '프로젝트 추가에 실패했어요.')
  }

  // 연계 — 글감 스니펫 라이브러리에 보관.
  const stash = (c: CatDef, d: Device) => {
    addToLibrary('snippets', {
      text: deviceToText(c, d),
      source: `SF 장치·전개법 사전 · ${c.label}`,
      tags: ['SF·과학소설', c.label, d.name, ...(d.alias ? [d.alias] : [])],
    })
    flash(`글감 보관함에 ‘${d.name}’을(를) 담았습니다.`)
  }

  // 관련 도구(같은 SF 장르군 또는 전개 도구)로 데이터와 함께 이동.
  const RELATED: { id: string; label: string; icon: string }[] = [
    { id: 'sf-plot-curve', label: 'SF 플롯/진행곡선', icon: '🚀' },
    { id: 'sf-whatif-forge', label: 'What-if 생성기', icon: '🛰️' },
    { id: 'sf-science-ref', label: 'SF 과학 개념 사전', icon: '🛰️' },
    { id: 'sf-tech-ref', label: 'SF 미래기술 사전', icon: '🛰️' },
    { id: 'scene-list', label: '장면 목록', icon: '🎞️' },
    { id: 'plot-pyramid', label: '플롯 피라미드', icon: '🔺' },
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
          {copiedKey === 'item:' + favKey(c.key, d.name) ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
        </button>
        <button className="minibtn" onClick={() => toggleFav(c.key, d.name)} style={{ borderColor: favs[favKey(c.key, d.name)] ? 'var(--accent)' : 'var(--border)' }}>
          {favs[favKey(c.key, d.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="minibtn" onClick={() => stash(c, d)} title="글감 보관함에 담기"><Emoji e="📥" /> 글감 보관</button>
      </div>
      {/* 연계 줄 */}
      <div className="linkbar" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => addToProj(c, d)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈SF 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id, c, d)} title={`${r.label} 열기`}>
            <Emoji e={r.icon} /> {r.label}
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
          <Emoji e="📖" /> 장치 사전 ({total})
        </button>
        <button className="minibtn" onClick={() => setMode('gen')} aria-pressed={mode === 'gen'}
          style={{ flex: 1, borderColor: mode === 'gen' ? 'var(--accent)' : 'var(--border)', color: mode === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎰" /> SF 장면 설계 조합기
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
            <b>SF·과학소설</b> 고유의 서사 장치(센스 오브 원더·노붐·외삽·정보 공개 페이싱)와 전개 패턴(디스토피아·퍼스트컨택트·시간여행) <b>{total}항목</b>을 정의·사용법·예시·비틀기로 묶었습니다.
            검색·펼침으로 찾고, 무작위로 영감을 얻으세요.
          </div>

          {/* 검색 */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장치·전개법 검색 (예: 노붐, 외삽, 센스 오브 원더, 인과 루프, 다크 포레스트)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />

          {/* 카테고리 펼침 필터 */}
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
            <button className="minibtn" onClick={() => setCat(FAV_KEY)} aria-pressed={cat === FAV_KEY}
              style={{ borderColor: cat === FAV_KEY ? 'var(--accent)' : 'var(--border)', color: cat === FAV_KEY ? 'var(--text)' : 'var(--muted)' }}>
              ★ 즐겨찾기
            </button>
          </div>

          {/* 동작 줄 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 장치</button>
            <span style={hint}>{filtered.length}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
                {random.item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.item.alias}</span>}
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom} title="다시 뽑기"><Emoji e="🔁" /></button>
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
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
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
            9개 슬롯을 무작위로 조합해 <b>SF 장면·시퀀스 한 컷</b>을 설계합니다. 마음에 드는 슬롯은 🔒 <b>잠금</b>하고 나머지만 다시 굴리세요.
          </div>

          {/* 조작 줄 + 조합수 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={regenerate} style={{ flex: '0 0 auto' }}><Emoji e="🎰" /> 조합 굴리기</button>
            <button className="minibtn" onClick={() => setLocks({})} title="모든 잠금 해제"><Emoji e="🔓" /> 잠금 해제</button>
            <span style={{ ...hint, marginLeft: 'auto' }} title="9개 슬롯 풀의 곱 = 만들 수 있는 서로 다른 SF 장면 설계 수">
              <Emoji e="🧮" /> 조합수 <b style={{ color: 'var(--accent)' }}>{comboCount.toLocaleString('ko-KR')}</b>가지
            </span>
          </div>

          {/* 슬롯 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const locked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...card, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, width: 104 }}><Emoji e={s.icon} /> {s.label}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{emojify(combo[s.key])}</span>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={locked ? '잠금 해제' : '이 슬롯 잠금'}
                      style={{ flexShrink: 0, borderColor: locked ? 'var(--accent)' : 'var(--border)' }}>
                      {locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                    <button className="minibtn" onClick={() => regenSlot(s)} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🔁" /></button>
                    <button className="minibtn" onClick={() => copy(combo[s.key], 'slot:' + s.key)} title="복사" style={{ flexShrink: 0 }}>
                      {copiedKey === 'slot:' + s.key ? '✓' : <Emoji e="📋" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 조합 결과 동작 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(comboToText(combo), 'combo:all')}>
              {copiedKey === 'combo:all' ? '✓ 전체 복사됨' : <><Emoji e="📋" /> SF 장면 설계 전체 복사</>}
            </button>
            <button className="minibtn" onClick={comboToStash} title="글감 보관함에 담기"><Emoji e="📥" /> 글감 보관</button>
          </div>

          {/* 연계 줄 */}
          <div className="linkbar" style={{ flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={comboToProj} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 SF 장면 설계를 프로젝트 자료 〈SF 장치〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openRelated(r.id)} title={`${r.label} 열기`}>
                <Emoji e={r.icon} /> {r.label}
              </button>
            ))}
          </div>

          <div style={hint}>조합은 출발점입니다. 슬롯 간 충돌(노붐↔대가, 갈등↔반전)이 흥미롭다면 그 모순에서 SF 장면이 살아납니다.</div>
        </>
      )}
    </div>
  )
}
