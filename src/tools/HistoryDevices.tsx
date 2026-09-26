// 역사·사극 서사 장치·전개법 사전 — 이 장르 고유의 서사 장치(드라마틱 아이러니·미래지식·사료 인용·
//  어전설전·반정 플롯엔진·간택·밀지·연좌·장계 지연·암행·고사 인용…)와 전개/구조 패턴·페이싱·
//  클라이맥스 관습을 ① 정의 ② 사용법 ③ 예시 ④ 비틀기 로 정리한 로컬 사전. 도시에(§4 서사 장치 /
//  §5 전개·구조·페이싱 / §6 클라이맥스 / 회귀빙의 웹소설·로맨스 사극 특화)에 근거한 자작 데이터.
//  펼침/접힘 + 카테고리 + 검색 + 무작위(중복 회피) + 영감 3연 + 즐겨찾기 + 클릭복사.
//  연계: 항목/현재 보기를 프로젝트 자료 〈사극 장치〉 폴더 문서로 추가, 글감 스니펫 저장, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 상태는 localStorage 자동 저장/복원(graceful).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-devices', name: '역사·사극 서사 장치·전개 사전', icon: '🏯', group: '장치·전개', genre: '역사·사극', intro: '드라마틱 아이러니·미래지식·사료 인용·어전 설전·반정 엔진·간택·밀지·연좌·암행… 사극 고유의 서사 장치와 전개·페이싱·클라이맥스 관습을 정의·사용법·예시·비틀기로', w: 680, h: 680 }

const LS = 'sry:tool:history-devices:'
const ALL_KEY = '__all__'

// ── 데이터 모델: 한 항목 = 역사·사극 서사 장치/전개 관습 ──
interface Device {
  name: string         // 한국어 명칭
  aka?: string         // 원어/한자/별칭
  def: string          // 정의 — 이 장치가 무엇인가(도시에 근거)
  how: string          // 사용법 — 어떻게 쓰는가(작법)
  example: string      // 예시 — 대표작/장면
  twist: string        // 비틀기 — 클리셰를 전복하는 변주
}
interface CatDef { key: string; label: string; icon: string; blurb: string; items: Device[] }

// 카테고리 5종(도시에 §4 서사 장치 / §5 전개·구조·페이싱 / §6 클라이맥스 / 회귀빙의 웹소설·로맨스 사극 특화)
const CATS: CatDef[] = [
  {
    key: 'device', label: '서사 장치', icon: '🗝️',
    blurb: '드라마틱 아이러니·사료 인용·밀지·간택·암행·고사 인용 — 사극을 굴리는 고유 동력 장치들.',
    items: [
      {
        name: '드라마틱 아이러니(역사적 운명)', aka: '관객만 아는 비극',
        def: '독자는 역사의 결말을 이미 알고 인물은 모르는 데서 오는 긴장·비애. 단종의 사사, 이순신의 전사처럼 "관객만 아는 비극"이 다가올수록 일상의 한 장면조차 애절해진다.',
        how: '결말을 안다는 점을 약점이 아니라 무기로 써라. 인물이 희망에 부풀거나 무심히 웃는 순간에, 독자만 아는 운명의 그림자를 겹쳐 비애를 증폭하라. "어떻게 그 결말에 이르는가"의 과정미에 분량을 투자하라.',
        example: '『칼의 노래』 — 독자는 이순신이 노량에서 전사할 것을 안다. 그래서 그의 마지막 출정과 독백이 매 순간 죽음을 향해 걸어가는 비극으로 읽힌다.',
        twist: '독자가 안다고 믿은 "정사(正史)"가 사실 승자의 기록·조작이었음을 폭로하라. 결말을 아는 줄 알았던 독자의 우위 자체를 뒤집어, 진짜 운명을 다시 묻게 한다.',
      },
      {
        name: '미래지식(지식 격차)', aka: 'Prolepsis as Weapon',
        def: '회귀·빙의한 현대인이 화약 배합·이앙법·종두법·환국 예측 같은 미래 지식을 무기로 삼는 회귀빙의 사극의 핵심. 남이 모르는 것을 아는 데서 통쾌함과 출세가 나온다.',
        how: '"왜 지금 가능한가"의 제약을 반드시 걸어라 — 원료·장인·자본·정치 반발. 지식만으로 즉시 구현되면 비약이 된다. 작은 성과(요리·의술·발명)로 신뢰를 얻고 후원자를 확보하는 단계를 밟게 하라.',
        example: '『조선 셰프 강주방』류 — 현대 조리 지식으로 임금의 입맛을 사로잡아 신임을 얻고, 그 신뢰가 권력 기반으로 확장된다.',
        twist: '미래 지식이 바뀐 역사 앞에서 무용해지게 하라(나비효과로 사건이 빗나감). 혹은 "나만 회귀·빙의한 게 아니었음"을 드러내 정보 우위를 빼앗고 진짜 실력을 시험한다.',
      },
      {
        name: '사료 인용·기록 장치', aka: '실록·장계·상소·간찰',
        def: '실록 기사·장계·상소문·간찰(편지)을 본문에 삽입해 사실감을 부여하는 장치. 장 도입부에 "○년 ○월 실록 기사"를 얹는 기법으로 허구와 사실의 경계를 흐린다.',
        how: '사료체 문장(만연체·한자어·날짜 표기)을 흉내 내 도입부에 인용하고, 본문에서 그 행간의 빈틈을 상상으로 메워라. 기록의 건조함과 인물 내면의 격정을 대비시켜 입체감을 만든다.',
        example: '정통 역사소설의 장 도입부 "○○년 ○월 ○일, 실록은 단 한 줄로 적었다 —" 식 인용. 한 줄의 기록 뒤에 숨은 사연을 본문이 복원한다.',
        twist: '인용한 "사료"가 위조·삭제·윤색된 기록임을 후반에 폭로하라. 독자가 사실로 믿게 한 인용 자체가 권력이 만든 거짓이었다는 메타적 전복.',
      },
      {
        name: '밀지·교지·옥새', aka: 'MacGuffin',
        def: '권력의 정당성을 상징하는 물건(밀지·교지·옥새)을 둘러싼 위조·탈취·해석 다툼. "정당한 명령서를 누가 쥐었는가"가 곧 권력의 향방을 가른다.',
        how: '문서·옥새에 "그것을 쥔 자가 정통"이라는 권능을 부여하고, 위조·탈취·진위 논란을 서스펜스 축으로 굴려라. 진짜와 가짜, 해석의 차이 하나가 사람의 목숨을 가르게 하라.',
        example: '반정·역모물의 단골 — 위조된 밀지 한 장이 거병의 명분이 되거나, 옥새의 확보가 즉위의 마지막 관문이 된다.',
        twist: '모두가 다투던 옥새·밀지가 사실 가짜였거나 애초에 권력에 무용했음을 드러내라. 정통성은 물건이 아니라 인심·명분에 있었다는 전복.',
      },
      {
        name: '간택·정략혼', aka: '동맹 재편 장치',
        def: '후궁 간택·세자빈 간택·정략혼으로 인물 배치와 동맹을 재편하는 장치. 누가 외척이 되느냐에 따라 권력도가 통째로 바뀐다.',
        how: '간택·혼사를 단순 로맨스가 아니라 "권력 지도의 재배치"로 다뤄라. 한 가문의 부상이 다른 가문의 몰락을 부르게 하고, 혼사의 이면에서 벌어지는 정보전·뇌물·협박을 깔아라.',
        example: '궁중물의 후궁 간택·세자빈 간택 — 한 여인의 입궁이 그 가문을 외척으로 격상시켜 조정의 세력 균형을 흔든다.',
        twist: '정략으로 맺어진 혼인이 진심으로 변하며 두 가문의 정치 계산을 모두 배반하게 하라. 혹은 간택에서 "탈락"한 인물이 도리어 권력의 핵심으로 떠오른다.',
      },
      {
        name: '연좌·삼족·사약', aka: '판돈 상승 장치',
        def: '연좌제·멸족·사약으로 패배의 비용을 극대화하는 장치. "지면 죽는다"가 아니라 "지면 가문이 멸한다"로 판돈을 끌어올린다.',
        how: '주인공의 한 수가 자신만이 아니라 일족 전체의 생사를 건 도박이 되게 하라. 연좌의 그물(부모·처자·노비·문생)을 구체적으로 보여 결정의 무게를 키우고, 패배의 대가를 반드시 회수하라.',
        example: '사화·역모 연루자의 멸문 — 한 사람의 정치적 실패가 삼족을 끌고 들어가, 거사의 모든 선택에 죽음의 무게가 실린다.',
        twist: '주인공이 "가문을 살리려" 한 선택이 도리어 멸문을 부르는 비극으로, 혹은 멸족을 각오하고 명분을 택한 자가 후대에 복권되어 의리가 승리하는 역설로.',
      },
      {
        name: '장계·파발·봉수(정보 지연)', aka: '소식의 시차',
        def: '장계·파발·봉수로 전해지는 소식의 지연·왜곡을 서스펜스로 쓰는 장치. 진실이 늦게 닿거나 거짓 보고가 먼저 도착해 운명을 가른다.',
        how: '정보가 "실시간이 아님"을 활용하라 — 변방의 위기가 조정에 늦게 닿고, 거짓 장계가 먼저 도착해 오판을 부른다. 독자만 진실을 알고 인물은 늦은 소식에 휘둘리게 해 극적 아이러니를 만든다.',
        example: '전란물 — 패전의 장계가 조정에 닿기 전, 거짓 승전보가 먼저 올라가 잘못된 군령이 내려진다. 시차가 곧 비극의 엔진.',
        twist: '지연을 역이용하는 인물을 세워라 — 일부러 거짓 장계를 흘려 적과 조정을 동시에 속이는 정보전의 달인. 정보의 시차를 무기로 쥐는 역전.',
      },
      {
        name: '신분 위장·암행·잠행', aka: '미행하는 왕·암행어사',
        def: '암행어사의 미행, 잠행하는 임금, 신분을 숨긴 잠입처럼 정체를 감춘 채 움직이다 탄로되는 긴장의 장치. 정체와 권력의 낙차가 극적 반전을 만든다.',
        how: '위장한 인물의 "진짜 정체"를 독자만 알게 하고, 주변 인물이 함부로 대하다 정체가 드러나는 순간을 클라이맥스의 한 방으로 배치하라. 위장 동안 본 민낯(부패·민심)이 폭로의 명분이 되게 하라.',
        example: '암행어사 출두 장면 — "암행어사 출두요!" 한마디에 부패한 관아가 뒤집힌다. 숨겨진 마패가 권력의 반전을 시각화한다.',
        twist: '암행 중인 자가 도리어 함정에 빠지거나, 잠행하던 왕이 백성의 진심에 흔들려 자신의 통치를 의심하게 하라. 위장이 폭로하는 것이 적이 아니라 자기 자신이게.',
      },
      {
        name: '고사·경전 인용 화법', aka: '사서삼경·중국 고사',
        def: '인물이 사서삼경·중국 고사를 인용해 주장을 정당화하는 화법. 시대 지성의 재현이자, 명분 싸움에서 상대를 제압하는 무기.',
        how: '대사에 적절한 고사·경전 구절을 심어 인물의 학식과 명분을 드러내라. 같은 고사를 양측이 정반대로 해석해 설전의 칼날로 쓰게 하고, 결정타가 될 한 구절은 절정에 아껴 두라.',
        example: '어전 논쟁에서 신하가 "맹자 왈…"로 왕의 처사를 비판하고, 왕은 다른 고사로 받아치는 명분의 칼싸움.',
        twist: '미래에서 온 주인공이 고사를 "엉뚱하지만 정확하게" 비틀어 인용해 노학자들을 당황시키게 하라. 권위의 언어를 해체하는 신선한 화법.',
      },
      {
        name: '호패·어진·복식의 기호화', aka: '신분의 시각 기호',
        def: '호패·어진(임금 초상)·곤룡포·익선관·복색·갓처럼 신분과 권력을 시각적으로 드러내는 기호 장치. 입은 것·지닌 것이 곧 신분을 말한다.',
        how: '복색·장신구·소지품으로 인물의 신분을 "설명 없이" 보여라(보여주되 말하지 말 것). 호패의 위조, 곤룡포를 함부로 입는 참람(僭濫) 같은 기호의 위반으로 갈등을 점화하라.',
        example: '신분을 숨긴 인물의 손에 어울리지 않는 옥관자·갖신이 정체의 단서가 되거나, 위조 호패가 추격의 발단이 된다.',
        twist: '천민이 양반의 복색을 훔쳐 입고 신분의 허위를 통째로 조롱하게 하라. 기호로 지탱되던 신분제의 빈틈을 폭로하는 풍자.',
      },
    ],
  },
  {
    key: 'power', label: '권력·정치 엔진', icon: '⚖️',
    blurb: '반정·역모·어전 설전·당쟁·외척·환국 — 사극 갈등을 움직이는 권력의 작동 원리.',
    items: [
      {
        name: '반정·역모 플롯엔진', aka: '거사의 다섯 마디',
        def: '거사 모의→명분 축적→포섭→거병→정변으로 이어지는 정변 서사의 골격. 정보전·배신·타이밍이 서스펜스 축이다.',
        how: '다섯 마디를 단계별로 조여라 — 모의의 비밀 유지, 대의명분의 축적, 핵심 인물 포섭, 거병의 D-day, 궁궐 장악. 각 단계마다 발각·배신의 위험을 심어 시한폭탄의 째깍임을 들려줘라.',
        example: '중종반정·인조반정 류 — 명분(폭정·실정)을 쌓고 무장을 포섭해 새벽에 거병, 궁을 장악하고 옥새를 확보한다.',
        twist: '거사가 성공한 순간이 진짜 비극의 시작이게 하라 — 명분으로 일어섰으나 권력 앞에서 동지끼리 칼을 겨눈다. 혹은 거사 자체가 더 큰 음모의 미끼였음을 폭로한다.',
      },
      {
        name: '어전 설전·상소 대결', aka: '말의 전쟁',
        def: '갈등을 "말의 전쟁"으로 시각화하는 장치. 어전회의·상소·차자(箚子)에서 논리·명분·고사 인용으로 정적을 제압하는 장면이 클라이맥스 단위로 기능한다.',
        how: '설전을 검술처럼 합(合)을 주고받게 설계하라 — 공격 논리, 반박, 재반박, 결정타. 양측의 명분이 모두 그럴듯해야 긴장이 산다. 마지막엔 왕의 윤허나 결정적 증거 한 줄로 승부를 가른다.',
        example: '『정도전』식 대사극 — 정도전과 정몽주가 새 왕조의 명분을 두고 벌이는 논쟁이 칼 없는 전투처럼 팽팽하게 부딪힌다.',
        twist: '논리로 이긴 자가 정치적으로 패배하게 하라(옳음이 곧 승리가 아니다). 혹은 침묵·퇴장 한 번이 백 마디 설전을 무력화하는 역설적 승부.',
      },
      {
        name: '당쟁·붕당의 역학', aka: '동인·서인·노론·소론',
        def: '훈구·사림, 동인·서인→남인·북인, 노론·소론의 대립 구도. 인물의 행동이 늘 당색(黨色)에 묶여, 개인의 옳고 그름보다 진영의 논리가 운명을 좌우한다.',
        how: '주인공을 한 당파에 묶어 두고, 그 소속이 곧 족쇄가 되게 하라. 같은 사안도 당색에 따라 정반대로 해석되는 진영 논리를 보여, 정의로운 선택이 당론과 충돌하는 딜레마를 만든다.',
        example: '예송논쟁·환국 정국 — 상복을 몇 년 입느냐 같은 예법 논쟁이 당파의 사활을 건 권력투쟁으로 비화한다.',
        twist: '당색을 초월하려는 인물을 세워 양쪽 모두에게 배척당하게 하라(중도의 비극). 혹은 가장 격렬히 싸우던 두 당의 영수가 사적으로는 벗이었음을 드러낸다.',
      },
      {
        name: '외척·환관·언관의 견제', aka: '왕권의 족쇄',
        def: '왕이 만능 독재자가 아니라 신권·언관(삼사)·외척·환관·예법에 강하게 제약받는다는 권력의 견제 구조. 이 메커니즘이 갈등의 진짜 엔진이다.',
        how: '왕의 뜻 하나가 곧바로 관철되지 않게 하라 — 사헌부·사간원·홍문관의 간쟁, 외척의 농단, 예법의 벽. 권력의 정점에 선 자조차 무엇을 "할 수 없는가"를 보여 긴장을 유지하라.',
        example: '삼사의 합계(合啓)와 환국 — 언관들이 죽음을 무릅쓰고 간쟁하거나, 외척이 어린 왕을 끼고 국정을 농단한다.',
        twist: '왕을 견제하던 언관·예법이 사실 더 큰 적폐였음을 폭로하라. 혹은 무력한 줄 알았던 왕이 견제 구조 자체를 역이용해 친정(親政)을 관철하는 역전.',
      },
      {
        name: '사화·옥사의 그물', aka: '피의 숙청',
        def: '무오·갑자·기묘·을사 같은 사화와 국문·친국으로 정적을 일거에 쓸어내는 숙청 장치. 한 번의 옥사가 한 시대의 인재를 통째로 베어낸다.',
        how: '옥사의 "방아쇠"(상소·고변·필화)와 "확산"(연루·자백 강요·연좌)을 단계로 설계하라. 무고한 자가 휘말리는 과정을 보여 공포를 키우고, 그 피의 비용을 후대의 복권·반성으로 회수하라.',
        example: '기묘사화 — 조광조의 급진 개혁이 훈구의 반격과 "주초위왕(走肖爲王)" 모략으로 무너지며 사림이 일거에 화를 입는다.',
        twist: '숙청을 주도한 자가 다음 정변에서 똑같은 방식으로 베이게 하라(인과의 수레바퀴). 혹은 사화의 진짜 설계자가 왕 자신이었음을 드러낸다.',
      },
      {
        name: '대외관계·사대와 국서', aka: '명·청·왜·여진',
        def: '명·청 사대, 일본 통신사, 여진과의 관계를 둘러싼 국서·조공·사신 외교. 안의 권력 다툼이 밖의 정세와 맞물려 운명을 가른다.',
        how: '국내 정치를 국제 정세의 톱니로 물려라 — 명·청 교체기의 줄타기, 사대와 자주의 딜레마, 국서 한 통의 표현이 전쟁과 평화를 가른다. 외교 문서·사신의 한마디에 나라의 명운을 걸어라.',
        example: '병자호란 전후 — 친명배금이냐 현실적 사대냐를 두고 조정이 갈리고, 그 선택이 삼전도의 굴욕으로 귀결된다.',
        twist: '굴욕적 사대를 택한 자가 실은 나라를 살린 현실주의자였음을, 명분을 외친 자가 백성을 사지로 몬 자였음을 재평가하게 하라. 충(忠)과 실리의 통념을 비튼다.',
      },
      {
        name: '명분·의리와 충효의 충돌', aka: '대의명분 엔진',
        def: '인물의 행동 동기를 충(忠)·효(孝)·의(義)·대의명분으로 정당화하거나 그것과 충돌시키는 동력. 이 장르에서 "왜 그렇게 하는가"는 늘 명분으로 답해야 설득력이 산다.',
        how: '인물에게 양립 불가한 명분을 동시에 지워라 — 임금에 대한 충과 아비에 대한 효, 사사로운 의리와 공적 대의. 어느 쪽을 택해도 다른 쪽을 배신하는 비극적 선택을 절정에 배치하라.',
        example: '충과 효 사이에 선 인물 — 역모에 연루된 아비를 고변하면 충신이 되고 침묵하면 불충이 되는, 어느 쪽도 온전할 수 없는 딜레마.',
        twist: '명분을 가장 크게 외친 자가 가장 사사로운 욕망을 숨기고 있었음을 폭로하라. 혹은 명분 없이 그저 사람을 구하려 한 선택이 끝내 가장 큰 대의가 되게 한다.',
      },
      {
        name: '개혁과 적폐의 줄다리기', aka: '경장(更張) vs 수성',
        def: '신법·개혁을 추진하는 측과 기득권·구법을 지키려는 측의 충돌. 토지·세제·신분·군역 개혁이 곧 권력 구조와의 정면 대결이 된다.',
        how: '개혁의 "이상"과 그것이 건드리는 "이해관계"를 함께 그려라 — 누가 손해를 보고 누가 저항하는가. 미래지식형이라면 개혁을 단번이 아니라 정치적 반발을 돌파하며 한 단계씩 관철하게 하라.',
        example: '대동법·균역법 시행 — 백성에겐 은혜지만 양반·방납 세력에겐 손실이라, 한 법의 시행에 수십 년의 정쟁이 따라붙는다.',
        twist: '개혁이 의도와 정반대의 부작용(새로운 적폐)을 낳게 하라. 혹은 적폐로 몰린 구법에 사실 백성을 지키던 지혜가 있었음을 드러내 진보 서사를 비튼다.',
      },
    ],
  },
  {
    key: 'structure', label: '전개·구조·페이싱', icon: '🧭',
    blurb: '대하 부침·회귀빙의 4단·역사적 분기점·사이다 주기 — 사극 장편의 골격과 호흡.',
    items: [
      {
        name: '대하형 부침의 구조', aka: '상승·몰락의 반복',
        def: '도입(시대·인물 위치)→사건의 씨앗(전조)→부침의 연속(상승·몰락 반복)→거대 사건 충돌→운명의 완성(죽음·승리·몰락)으로 이어지는 정통 대하소설의 골격.',
        how: '느린 호흡을 두려워 말라 — 풍속·내면·정치 묘사에 분량을 투자하되, 전투·정변 장면에서 속도를 폭발시켜라. 한 인물의 생을 따라 상승과 몰락을 여러 번 반복해 운명의 무게를 쌓아라.',
        example: '『토지』·『장길산』 — 한 가문·한 인물의 생을 시대의 격랑과 함께 따라가며, 흥망성쇠가 거대한 강물처럼 흐른다.',
        twist: '시간 순서를 깨고 몰락에서 시작해 그 원인을 거슬러 올라가게 하라. 혹은 거대 사건을 배경으로 밀고 한 무명 인물의 사소한 일상에 초점을 맞춰 대하의 시선을 뒤집는다.',
      },
      {
        name: '회귀빙의 4단 구조', aka: '빙의→생존→상승→대업',
        def: '①빙의/회귀+후크 ②생존·기반(작은 성과로 신뢰·후원자 확보) ③상승·견제(공을 세울수록 적의 모함) ④개혁·대업(국정·전쟁·왕조의 운명 전환)으로 확대되는 웹소설 사극의 핵심 템플릿.',
        how: '1~5화 안에 빙의·신분 파악·미래지식 자각·강력한 첫 위기(누명·하옥·암살)와 작은 사이다를 모두 담아라. 이후 한 사이클을 "위기→미래지식+기지로 역전→보상(관직·재물·인정)"으로 반복하며 판을 국가 단위로 키워라.',
        example: '『철혈대공』·『왕세자 입학도』류 — 빙의 직후의 위기를 미래지식으로 넘기고, 작은 공을 발판 삼아 점차 조정의 핵심으로 올라선다.',
        twist: '4단을 의도적으로 무너뜨려라 — 대업의 정점에서 모든 것을 잃고 다시 바닥에서 시작하거나, "출세"가 목표가 아닌 인물(은둔·복수만)을 세워 상승 서사 자체를 비튼다.',
      },
      {
        name: '역사적 분기점 마일스톤', aka: '챕터의 분기 시계',
        def: '사화·반정·외침 같은 실제 역사적 분기점을 챕터의 마일스톤으로 배치하는 구조. 독자가 "이번엔 역사가 어떻게 바뀌나"를 기대하게 만든다.',
        how: '실제 사건의 D-day를 미리 깔고 카운트다운을 돌려라. 분기점이 다가올수록 긴장을 조이고, 그 사건을 "지나가느냐, 막느냐, 비트느냐"로 챕터의 클라이맥스를 만든다. 대체역사라면 분기 이후의 일관성을 철저히 관리하라.',
        example: '임진왜란·병자호란을 앞둔 회귀물 — 독자는 그 해가 다가올수록 "이번엔 막을 수 있을까"를 조마조마하게 지켜본다.',
        twist: '주인공이 역사를 바꿨더니 더 나쁜 미래가 오게 하라(개입의 역설). 혹은 아무리 발버둥쳐도 큰 흐름은 바뀌지 않는 "역사의 관성"을 보여 운명의 무게를 각인한다.',
      },
      {
        name: '사이다·고구마 주기', aka: '3~5화당 1회 응징',
        def: '답답함(고구마)을 쌓고 미래지식·신무기·개혁으로 적폐를 응징하는 통쾌함(사이다)을 주는 웹소설 사극의 정서 리듬. 보통 3~5화당 1회의 명확한 역전이 약속이다.',
        how: '굴욕·억울함(신분의 멸시·모함)을 또렷이 쌓되, 너무 길어 이탈을 부르지 말라. 응징의 대상·방식·타이밍을 구체적으로 설계하고, 고증·개연성과의 줄다리기를 잊지 마라(사이다가 비약이 되면 가벼워진다).',
        example: '무시당하던 서얼·하급 관원이 미래지식과 기지로 자신을 멸시한 권문세가를 어전에서 망신 주는 전형적 사이다.',
        twist: '사이다 끝에 공허함·대가(원한의 누적·정적의 보복)를 남겨라. 혹은 끝내 응징하지 않고 "용서·초탈·대의로의 승화"로 기대를 비틀어 깊이를 더한다.',
      },
      {
        name: '시즌제·정변/전란 단위 연재', aka: '한 사건 = 한 시즌',
        def: '하나의 정변·전쟁·사화를 한 시즌 단위로 묶어 연재하는 구조. 큰 사건마다 명확한 시작과 매듭을 두어 장편의 호흡을 관리한다.',
        how: '한 시즌에 하나의 거대 갈등(전쟁·반정·개혁)을 완결 짓고, 끝에 다음 시즌의 거대 떡밥을 남겨라. 시즌 내부는 위기-역전의 단기 사이클로 채우되, 시즌 피날레는 역사적 분기점과 일치시켜라.',
        example: '임진왜란 7년을 하나의 시즌으로 — 개전·평양 함락·명군 참전·정유재란·노량으로 이어지는 큰 마디마다 매듭을 짓는다.',
        twist: '한 시즌을 "패배"로 닫고도 독자가 다음을 기다리게 하라(설욕의 동력). 혹은 시즌마다 시점 인물을 바꿔 같은 시대를 적·아군 양쪽에서 다시 보게 한다.',
      },
      {
        name: '빙의 직후 후크', aka: '"여기가… 조선?"',
        def: '회귀빙의물의 1화 도입 — 현대인이 과거 인물에 깨어나 신분·상황을 파악하고 미래지식을 자각하는 강력한 진입 장치. 첫 화 내 위기와 작은 사이다가 약속이다.',
        how: '빙의의 충격(낯선 몸·시대의 기억 유입)을 빠르게 처리하고, 곧장 강력한 위기(누명·하옥·암살 위협)로 끌어라. 1화 안에 주인공의 목표·차별점과 첫 작은 역전을 보여 "이 작품의 맛"을 증명하라.',
        example: '빙의 직후 "이 몸의 기억이 흘러든다"로 신분을 파악하고, 곧바로 사약이 내려질 위기에서 미래지식으로 활로를 찾는 전형적 1화.',
        twist: '클리셰 대사("여기가 조선?")를 자각적으로 비틀어 주인공이 빙의 상황을 의심·부정하게 하라. 혹은 빙의한 몸의 "원래 주인"의 의식이 남아 주도권을 다투게 한다.',
      },
      {
        name: '간지·시진의 시간 운용', aka: '절기·통금·봉수의 시계',
        def: '간지·연호·시진(자시·인시)·절기·통금처럼 전근대의 시간 체계로 사건의 리듬과 긴장을 조율하는 장치. "분·초"가 아닌 시대의 시간으로 페이싱한다.',
        how: '거사·밀회·도주의 타이밍을 시진·통금·봉수에 맞춰 긴장을 만들어라(통금 전에 성문을 넘어야 한다). 절기·기일(忌日)을 사건의 마디로 삼아 시대의 호흡으로 이야기를 흐르게 하라.',
        example: '자정의 통금을 뚫고 성문이 닫히기 전 거사 장소로 향하는 추격 — 시진의 흐름 자체가 카운트다운이 된다.',
        twist: '봉수가 끊기거나 통금의 허점이 거사의 열쇠가 되게 하라. 혹은 미래에서 온 주인공이 절기·시진 감각이 없어 결정적 순간에 시간을 오판하는 약점을 드러낸다.',
      },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '⚔️',
    blurb: '어전 설전의 끝장·정변 당일·결전·운명의 수용·정체 폭로·즉위 — 절정의 카타르시스 설계.',
    items: [
      {
        name: '어전 설전·상소 대결의 끝장', aka: '말의 클라이맥스',
        def: '정적을 명분·증거로 무너뜨리는 "말의 클라이맥스". 결정타 한 줄(왕의 윤허, 결정적 증거 제시)로 칼 없이 승부를 가르는 절정.',
        how: '앞서 쌓은 모든 명분·증거·고사를 한 장면에 수렴시켜라. 상대를 막다른 논리로 몰고, 마지막에 숨겨 둔 결정적 한 수(밀서·증인·고변)를 던져 좌중을 뒤집어라. 왕의 단 한마디로 승부를 매듭지어라.',
        example: '드라마 사극의 어전 대결 절정 — 모함받던 충신이 결정적 증거를 어전에 내밀어 간신의 가면을 단번에 벗긴다.',
        twist: '논리·증거로 완승했으나 정치적으로는 패배하게 하라(이긴 자가 베인다). 혹은 결정타가 거짓 증거였음이 후에 드러나 승리의 정당성 자체를 무너뜨린다.',
      },
      {
        name: '정변·반정의 당일', aka: '거병→장악→옥새',
        def: '거병→궁궐 장악→옥새 확보→즉위/폐위로 압축되는 정변의 D-day. 시간 압박형 서스펜스의 정점.',
        how: '거사 당일을 시진 단위로 쪼개 카운트다운을 돌려라 — 성문 개방의 내응, 궁궐 진입, 옥새 확보, 즉위 선포. 작은 어긋남(배신·지연·발각)이 모든 것을 무너뜨릴 수 있는 칼날 위의 긴장을 유지하라.',
        example: '반정의 새벽 — 내응자가 성문을 열고, 군사가 궐을 장악하며, 옥새를 손에 쥐는 순간 새 임금이 선다. 한 시진의 승부.',
        twist: '거사가 성공한 그 순간 동지가 칼을 돌리게 하라(승리의 배신). 혹은 옥새를 쥐고도 즉위를 거부하는 인물을 세워 권력의 통념을 전복한다.',
      },
      {
        name: '결전(임진·병자형 전투)', aka: '열세 극복·전술 역전',
        def: '압도적 열세를 전술·지략·신무기로 뒤집는 결전. 명량의 13척, 진법·화공·매복처럼 "어떻게 이기는가"의 명장면이 절정을 이룬다.',
        how: '아군의 열세와 적의 강함을 미리 충분히 증명해 승리를 값지게 하라. 지형·날씨·물때·심리를 활용한 전술의 디테일로 역전의 개연성을 쌓고, 결정적 한 수(화공·매복·미래지식 신무기)를 절정에 터뜨려라.',
        example: '명량해전 — 좁은 울돌목의 물길과 학익진의 변용으로 13척이 수백 척을 막아낸다. 지형과 지략이 수의 열세를 뒤집는다.',
        twist: '전술로 이겼으나 그 승리가 더 큰 패배의 서막이게 하라(이겨도 나라가 기운다). 혹은 정통형이라면 승리 대신 장렬한 패배·전사를 절정으로 삼아 비애로 카타르시스를 처리한다.',
      },
      {
        name: '운명의 수용·비극의 완성', aka: '장렬한 패배·죽음',
        def: '승리보다 "장렬한 패배·죽음"이 절정이 되는 정통 사극의 관습. 이순신의 전사, 단종의 사사, 삼전도의 굴욕처럼 카타르시스를 비애로 처리한다.',
        how: '독자가 결말을 알수록 그 과정의 존엄에 집중하라 — 패배·죽음을 회피가 아니라 "받아들이는" 인물의 내면을 그려 비극을 격조 있게 완성하라. 패배의 순간에 인물이 지킨 가치(충·의·존엄)를 또렷이 새겨라.',
        example: '『남한산성』 — 어떤 선택도 굴욕인 막다른 상황에서, 인물들은 살기 위해 무릎 꿇는 치욕과 명분을 지키는 죽음 사이를 처절히 오간다.',
        twist: '비극을 후대의 복권·기억으로 반전시켜라(죽어서 이긴다). 혹은 "장렬한 죽음"의 미화를 거부하고, 살아남아 치욕을 감당하는 생존이야말로 더 큰 용기임을 보여 통념을 비튼다.',
      },
      {
        name: '신분·정체의 폭로', aka: '숨겨진 출생의 공개',
        def: '숨겨온 출생·정체가 공개되며 권력도가 재편되는 폭로 장치. 왕족의 핏줄, 위장한 신분, 바뀐 운명이 드러나는 순간이 절정을 이룬다.',
        how: '폭로의 증거(신물·신표·증인·핏줄의 표식)를 복선으로 미리 깔아라. 정체가 드러나는 순간을 정치 지형의 격변과 일치시켜, 한 사람의 비밀이 조정 전체를 뒤흔들게 하라.',
        example: '버려진 왕손·바뀐 신분의 인물이 신표로 정체를 증명하는 순간, 그를 핍박하던 자들의 처지가 단번에 뒤집힌다.',
        twist: '폭로된 "고귀한 출생"이 사실 조작이었거나, 정체를 알고도 주인공이 그 신분을 거부하게 하라. 핏줄이 곧 자격이라는 통념을 정면으로 부순다.',
      },
      {
        name: '개혁 완수·즉위', aka: '적폐 청산의 선포',
        def: '주인공이 왕이 되거나 권력 정점에 올라 적폐 청산·개혁 완수를 공표하는 웹소설형 절정. 그동안의 모든 고구마가 한 번에 보상되는 카타르시스.',
        how: '즉위·집권을 그동안 쌓은 명분·공적·인심의 총결산으로 만들어라. 응징할 적폐와 베풀 은혜를 구체적으로 선포하게 하고, 개혁의 첫 조치를 절정의 한 장면으로 시각화하라(교지 반포·간신 처단).',
        example: '회귀빙의 사극의 대단원 — 주인공이 권력의 정점에서 자신을 핍박하던 적폐를 청산하고 백성을 위한 새 법을 반포한다.',
        twist: '권좌에 오른 순간 주인공이 자신이 무너뜨린 권력자와 닮아 가기 시작하는 균열을 심어라. 혹은 정점에서 모든 권력을 내려놓는 선택으로 출세 서사의 통념을 비튼다.',
      },
      {
        name: '연좌의 회수·복권', aka: '의리의 승리',
        def: '패배로 멸문·유배당한 인물이 후대에 복권되거나, 의리를 지킨 대가가 끝내 보상받는 절정. 연좌·사약으로 끌어올린 판돈을 비극이든 정의든 회수하는 매듭.',
        how: '앞서 가문 전체를 건 도박의 결과를 반드시 회수하라 — 신원(伸冤)·복관·시호로 의리가 역사 속에서 승리하게 하거나, 끝내 회수되지 못한 한(恨)으로 비극을 완성하라.',
        example: '사화로 화를 입은 사림이 다음 시대에 복권되어 문묘에 배향되는 결말 — 당대의 패배가 역사의 승리로 뒤집힌다.',
        twist: '복권이 정치적 이용물에 불과했음을 드러내라(살아 베이고 죽어 이용된다). 혹은 복권을 거부하고 "잊힘"을 택한 인물로 명예의 통념을 비튼다.',
      },
    ],
  },
  {
    key: 'romance', label: '로맨스 사극·궁중', icon: '🌸',
    blurb: '신분 격차·후궁 간투·정략과 진심·궁중암투·잠행 로맨스 — 로판/궁중 로맨스 사극의 코드.',
    items: [
      {
        name: '신분 격차 로맨스', aka: '넘을 수 없는 선',
        def: '왕·세자·무관과 신분이 낮은 인물 사이의 사랑처럼, 신분제의 벽이 곧 갈등의 엔진이 되는 로맨스 코드. 사랑할수록 신분의 족쇄가 조여 온다.',
        how: '신분의 제약을 로맨스의 장애물로 끝까지 밀어붙여라 — 함께할 수 없는 이유를 구체적이고 시대적으로(법·예법·가문) 깔아라. 신분을 "극복 과제"로 다뤄 한 걸음의 진전마다 큰 대가를 치르게 하라.',
        example: '궁중 로맨스의 단골 — 임금과 천한 신분의 여인, 혹은 옹주와 호위무사처럼 결코 맺어질 수 없는 사이의 절절한 끌림.',
        twist: '신분의 벽을 끝내 넘지 못하고 각자의 자리에서 그리워하는 미완으로 닫거나, 신분을 버리고 사랑을 택한 자가 그 선택의 무게를 평생 감당하게 하라.',
      },
      {
        name: '후궁·중전의 간투(間鬪)', aka: '궁중 여인 암투',
        def: '후궁·중전·대비 사이의 총애·자식·외척을 건 권력투쟁. 견환전·여인천하처럼 내전(內殿)의 음모가 조정의 향방까지 좌우하는 궁중암투의 정수.',
        how: '여인들의 다툼을 단순 질투가 아니라 "생존과 권력의 사활전"으로 다뤄라 — 총애·왕자의 출산·외척의 부침이 곧 목숨값이다. 독살·모함·이간을 치밀한 정보전으로 설계하고 판돈을 멸문으로 키워라.',
        example: '『여인천하』·견환전류 — 임금의 총애와 후사를 두고 후궁들이 펼치는 음모가 한 왕조의 권력 지형을 통째로 흔든다.',
        twist: '암투의 두 여인이 끝내 연대해 진짜 적(가부장 권력·외척)을 향하게 하라. 혹은 가장 순진해 보이던 인물이 최후의 승자임을 드러내 간투의 통념을 비튼다.',
      },
      {
        name: '정략혼과 진심의 균열', aka: '계약이 사랑으로',
        def: '권력 계산으로 맺어진 정략혼이 점차 진심으로 변하며 두 가문의 정치적 의도를 배반하는 로맨스 곡선. 차가운 시작에서 따뜻한 균열로.',
        how: '정략의 차가운 거래에서 출발해, 작은 배려·위기의 공유로 진심이 스미는 과정을 단계로 그려라. 사랑이 깊어질수록 그것이 가문의 계산을 위협하는 딜레마(사랑이냐 가문이냐)를 키워라.',
        example: '로판 사극의 계약 결혼 — 정치적 동맹으로 맺어진 부부가 서로의 진면목을 알아 가며 계산을 넘어선 진심에 도달한다.',
        twist: '진심으로 변한 사랑이 도리어 두 사람을 정치적 파멸로 몰게 하라. 혹은 끝까지 "정략"을 가장하며 서로를 지키는 위장된 사랑으로 통념을 비튼다.',
      },
      {
        name: '잠행·미행 속 로맨스', aka: '신분을 숨긴 만남',
        def: '신분을 숨긴 왕·왕족과 평민의 저잣거리 만남처럼, 위장된 정체 속에서 피어나는 로맨스. 정체가 드러나는 순간의 충격이 관계의 분수령이 된다.',
        how: '위장 동안 쌓인 진실한 교감과, 정체 폭로 후의 신분 격차 충격을 대비시켜라. 독자만 정체를 아는 극적 아이러니로 매 만남에 긴장을 더하고, 폭로의 순간을 관계의 클라이맥스로 배치하라.',
        example: '잠행하는 세자가 저잣거리에서 만난 여인과 신분을 숨긴 채 정을 쌓다가, 정체가 드러나며 둘의 운명이 격변한다.',
        twist: '상대가 사실 주인공의 정체를 처음부터 알고 있었음을 드러내라(역폭로). 혹은 정체를 안 뒤에도 "그 사람"이 아닌 "그 신분"을 사랑하게 되는 변질을 그려 비틀어라.',
      },
      {
        name: '악역영애·파멸 플래그 회피', aka: '원작 빙의 로판',
        def: '소설·역사 속 정해진 파멸(폐비·사사·멸문)을 맞을 인물에 빙의해 그 플래그를 회피·전복하는 로맨스 판타지 사극의 핵심 설정. "결말을 안다"는 정보 우위가 동력이다.',
        how: '"원작의 결말을 아는" 우위로 파멸 플래그를 하나씩 무력화하는 과정을 단계적 사이다로 배치하라. 궁중·가문 정치를 갈등 무대로, 차갑지만 주인공에게만 다정해지는 상대역의 변화를 로맨스 곡선으로 그려라.',
        example: '"이 몸은 원작에서 사약을 받는 폐서인 후궁이었다"는 자각에서 출발해, 미래 지식으로 운명의 각본을 다시 쓰는 전형.',
        twist: '"원작" 지식이 틀렸거나 이 세계가 원작이 아니었음을 드러내라. 혹은 빙의한 "악역"이 사실 진짜 주인공이었음을 폭로해 메타적 전복을 만든다.',
      },
      {
        name: '금지된 사랑과 의리의 충돌', aka: '연정 vs 충효',
        def: '연정이 충(忠)·효(孝)·의(義)와 정면으로 부딪히는 로맨스 비극 코드. 사랑하는 이가 가문의 정적이거나 모셔야 할 임금이라, 사랑이 곧 배신이 되는 구조.',
        how: '사랑과 의리를 양립 불가하게 배치해, 어느 쪽을 택해도 다른 쪽을 배반하는 비극적 선택을 절정에 두라. 시대의 명분(예법·신분·당색)이 사랑을 죄로 만드는 무게를 충실히 깔아라.',
        example: '원수 가문의 자제를 사랑하게 된 인물, 혹은 모셔야 할 임금을 연모하게 된 궁녀 — 사랑이 곧 불충·불효가 되는 딜레마.',
        twist: '사랑을 포기하고 의리를 택한 선택이 끝내 둘 다 잃는 공허로 귀결되게 하라. 혹은 금지된 사랑을 지킨 두 사람이 시대의 명분 자체를 함께 무너뜨리는 전복으로 나아간다.',
      },
    ],
  },
]

// 조합수: 각 항목을 [정의·사용법·예시·비틀기] 4개의 독립 "관점 슬롯"으로 보면, 사전 항목 N개에서
// 무작위 영감 카드(서로 다른 3항목 순열 P(N,3) × 4개 관점 슬롯 배정 4^3)로 막대한 조합을 만든다.
const ALL_ITEMS = (): { cat: CatDef; item: Device }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)

// ── 한국어 조사 헬퍼: 앞 단어의 마지막 '한글 음절'의 받침을 보고 실제 조사 하나를 골라 출력 ──
//  (괄호 이중표기 금지) 끝에 '(伸冤)'처럼 한자·괄호가 붙어도 마지막 한글 음절로 판정한다.
const lastHangulJong = (word: string): number => { // -1: 한글 없음, 0: 받침 없음, 1~27: 종성 코드
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28
  }
  return -1
}
// 받침 있으면 withJong, 없으면 noJong. ('을/를', '은/는', '이/가' 등)
const josa = (word: string, withJong: string, noJong: string): string => {
  const j = lastHangulJong(word)
  return word + (j > 0 ? withJong : noJong) // 한글 없음(-1)·받침 없음(0) → noJong
}
// '으로/로': 받침 없거나 'ㄹ' 받침이면 '로', 그 외 받침이면 '으로'
const josaRo = (word: string): string => {
  const j = lastHangulJong(word)
  return word + (j <= 0 || j === 8 ? '로' : '으로') // 8 = 'ㄹ', 0/-1 = 받침 없음
}

// ── 사극 '장면 씨앗' 생성기: 7개의 독립 슬롯(곱집합)으로 어법에 맞는 한국어 한 문장을 합성 ──
//  각 슬롯은 서로를 전제하지 않는 같은 범주의 고유 명사구/종결문(슬롯 독립성). 조사는 헬퍼로 실선택.
//  문형: 「[시대배경]에서 [인물]은/는 [상황] 속에서 [목표]을/를 위해 [수단](으)로 [장애]에 맞서 [종결문]」
const SEED_ERA = [ // 시대배경(명사구) — 32
  '왜란의 포연이 가시지 않은 한양', '환국으로 조정이 뒤집힌 그해 겨울', '사화의 피비린내가 채 마르지 않은 봄',
  '흉년과 역병이 겹친 삼남의 들녘', '청의 사신이 압록을 건넌 무렵', '세자가 급서한 직후의 동궁',
  '북변에 봉수가 끊긴 변방의 진보', '대비의 수렴청정이 거두어진 친정 원년', '명·청이 교체되던 격동의 길목',
  '대동법 시행을 두고 정쟁이 한창인 도성', '폐비의 사약이 내려진 그 이듬해', '왜구가 남해를 노략하던 어느 가을',
  '반정 모의가 무르익은 도성의 새벽', '세도가의 위세가 하늘을 찌르던 시절', '천주학 박해가 시작된 살벌한 한겨울',
  '통신사 행렬이 부산포를 떠나던 날', '여진이 국경을 자주 넘보던 북녘', '가뭄으로 한강 물길이 마른 한여름',
  '간택령이 전국에 내려진 그 무렵', '실록청이 새 임금의 사초를 모으던 때', '국상으로 온 나라가 소복을 입은 달',
  '탕평의 깃발이 막 오른 조정', '삼정의 문란으로 민심이 들끓던 고을', '어가가 한양을 떠나 몽진하던 길',
  '과거 시험이 임박한 성균관의 봄', '서원이 우후죽순 늘어나던 향촌', '북벌의 기치가 높던 효종 연간',
  '병자년의 한파가 남한산성을 에워싼 때', '문묘 배향을 둘러싼 시비가 한창인 조정', '척화와 주화가 맞선 어전의 한낮',
  '암행어사가 비밀리에 파견된 삼남', '왕세자의 대리청정이 막 시작된 무렵',
]
const SEED_CHAR = [ // 인물(명사구) — 30
  '몰락한 양반가의 서얼 청년', '미래의 기억을 품고 빙의한 폐서인 후궁', '도성에서 가장 영민한 젊은 의녀',
  '북변을 지키다 좌천된 무관', '권문세가의 눈 밖에 난 강직한 사관', '저잣거리에 잠행 나온 젊은 임금',
  '원수 가문에 시집온 종갓집 맏며느리', '역적의 자식으로 연좌된 노비', '암행어사의 마패를 품은 젊은 어사',
  '대비의 신임을 한 몸에 받는 상궁', '과거에 연거푸 낙방한 가난한 선비', '세자를 보위하는 늙은 호위무사',
  '청에 볼모로 끌려갔다 돌아온 왕자', '환국 정국에서 줄을 잘못 선 중신', '내의원의 어의가 된 천출 침의',
  '글솜씨로 도성을 울린 기생 출신 시인', '변방에서 공을 세운 천민 출신 장수', '간택에서 떨어진 명문가의 규수',
  '사림의 영수로 떠오른 젊은 산림', '왕실 족보가 바뀐 줄 모르는 종친', '훈구의 사주를 받은 노회한 대간',
  '아버지의 누명을 벗기려는 효심 깊은 딸', '미래지식으로 무장한 현대인 빙의자', '폐세자의 그림자 노릇을 한 충복',
  '외척의 농단에 맞선 강직한 영의정', '비밀 상소를 품고 상경한 시골 유생', '왕의 어진을 그리는 젊은 화원',
  '잠행하는 세자와 정을 쌓은 저잣거리 처자', '당쟁의 소용돌이에 휘말린 신진 관료', '복수를 벼르며 신분을 숨긴 검계의 우두머리',
]
const SEED_SITUATION = [ // 상황·계기(명사구, '속에서') — 28
  '거짓 장계가 먼저 조정에 닿은 혼란', '위조된 밀지 한 장이 도성을 뒤흔든 소동', '한밤의 통금을 뚫어야 하는 다급함',
  '연좌의 그물이 일족을 조여 오는 공포', '어전 설전의 결정타를 쥔 긴장', '암행 중 정체가 탄로 날 뻔한 위기',
  '간택의 막후에서 벌어진 정보전', '봉수가 끊겨 변방의 위급이 묻힌 침묵', '사약을 받기 직전의 막다른 처지',
  '옥새의 진위를 두고 갈린 조정', '거병의 D-day가 코앞에 닥친 초조함', '독살의 그림자가 내전에 드리운 불안',
  '고변 한 장으로 옥사가 번지는 와중', '명분과 실리가 정면으로 부딪힌 어전', '폐비 복위를 둘러싼 격렬한 정쟁',
  '미래지식이 바뀐 역사 앞에 무용해진 당혹', '척화와 주화가 갈린 성안의 막막함', '세자의 자리를 노린 음모가 무르익은 동궁',
  '실록의 사초가 불태워질 위기', '신표 하나로 출생의 비밀이 드러날 순간', '대리청정의 권한을 시험받는 살얼음판',
  '뇌물과 협박이 오가는 혼탁한 과장(科場)', '탕평을 거부하는 노론의 반발', '북벌의 군량이 바닥난 절박함',
  '천주학 교인을 색출하는 살벌한 추쇄', '세도가의 전횡에 민심이 폭발하기 직전', '정략혼의 첫날밤에 드러난 음모',
  '어가가 적의 손에 떨어질 뻔한 절체절명',
]
const SEED_GOAL = [ // 목표·욕망(명사구, '을/를') — 26
  '가문의 신원(伸冤)', '무너진 왕권의 회복', '백성을 살릴 대동법의 시행',
  '잃어버린 옥새의 탈환', '폐비의 복위', '아비를 죽인 자에 대한 복수',
  '미래에서 가져온 개혁의 완수', '세자의 무사한 즉위', '바뀐 역사의 원상 복구',
  '정적의 모함에 대한 반격', '북벌의 대업', '끊어진 봉화선의 복구',
  '간택에서의 입궁', '연좌된 일족의 구명', '어전 설전에서의 승리',
  '위조 밀지의 진상 규명', '천출이라는 신분의 굴레 벗기', '청에 끌려간 백성의 환속',
  '탕평을 통한 당쟁의 종식', '잊힌 충신의 복권', '세도가의 척결',
  '금지된 사랑의 성취', '실록에 남길 진실의 기록', '암행으로 캐낸 비리의 응징',
  '왕실의 끊긴 핏줄 잇기', '삼정 문란의 혁파',
]
const SEED_MEANS = [ // 수단·장치(명사구, '으로/로') — 24
  '미래에서 가져온 지식', '위조한 교지 한 장', '품에 숨긴 마패',
  '고사 인용으로 벼린 설전', '한밤에 띄운 밀서', '결정적 증인의 고변',
  '신분을 숨긴 잠행', '치밀하게 짠 반정의 계략', '실록에 남긴 한 줄의 기록',
  '거짓 장계를 흘리는 정보전', '뇌물로 다진 인맥', '독을 푼 한 잔의 차',
  '간택의 막후 공작', '백성의 민심을 업은 명분', '진법과 화공의 전술',
  '대비의 비밀 후원', '출생의 비밀을 증명할 신표', '봉수와 파발의 시차',
  '어의의 의술', '복식과 호패로 꾸민 위장', '사림의 연대 상소',
  '청과의 비밀 협상', '저잣거리에 푼 익명의 방문(榜文)', '꿈에 본 미래의 청사진',
]
const SEED_OBSTACLE = [ // 장애·적대(명사구, '에 맞서') — 22
  '하늘을 찌르는 외척의 세도', '죽음을 무릅쓴 삼사의 간쟁', '거짓 사초를 쥔 노회한 사관',
  '거병을 노린 반정 세력', '내전을 장악한 후궁의 음모', '연좌의 칼을 든 의금부',
  '척화를 외치는 강경한 산림', '국경을 넘보는 여진의 기병', '탕평을 거부하는 노론의 벽',
  '신분제의 두꺼운 장벽', '독살을 꾀하는 환관의 무리', '위조 밀지를 앞세운 역도',
  '천주학을 박해하는 추쇄꾼', '세자 자리를 노린 종친의 야심', '뇌물로 썩은 과장의 부정',
  '바뀐 역사가 부른 나비효과', '주화를 비웃는 척화파의 명분', '대비를 끼고 도는 권신',
  '봉화를 끊은 적의 첩자', '간택을 농단하는 권문세가', '민심을 짓밟는 삼정의 문란',
  '복수를 가로막는 가문의 의리',
]
const SEED_ENDING = [ // 종결문(완결된 종결) — 20
  '운명의 수레바퀴를 거슬러 오른다.', '끝내 모든 것을 건 한 수를 던진다.', '비극을 알면서도 그 길을 걸어간다.',
  '결정타 한 줄로 좌중을 뒤집는다.', '죽음을 각오하고 명분을 택한다.', '역사의 관성 앞에서 무릎을 꿇는다.',
  '잊혔던 진실을 어전에 드러낸다.', '한밤의 거병으로 판을 갈아엎는다.', '사랑과 의리 사이에서 둘 다 잃는다.',
  '미래지식으로 활로를 연다.', '정적의 가면을 단번에 벗긴다.', '가문을 살리려다 도리어 화를 부른다.',
  '복권되어 역사 속에서 승리한다.', '권좌에 올라 적폐를 청산한다.', '신분의 벽을 끝내 넘지 못하고 그리워한다.',
  '옥새를 쥐고도 즉위를 거부한다.', '거사의 성공이 새 비극의 시작이 된다.', '용서로써 응징을 대신한다.',
  '바뀐 역사가 더 큰 재앙을 부른다.', '장렬한 패배로 비극을 완성한다.',
]
// 장면 씨앗 조합수: 7개 독립 슬롯의 곱(고유 항목만). 32×30×28×26×24×22×20.
const SEED_COMBOS = SEED_ERA.length * SEED_CHAR.length * SEED_SITUATION.length * SEED_GOAL.length * SEED_MEANS.length * SEED_OBSTACLE.length * SEED_ENDING.length
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
// 어법에 맞는 한 문장으로 합성 — 조사는 헬퍼로 실선택(괄호 이중표기 없음)
const composeSeed = (): { era: string; char: string; sit: string; goal: string; means: string; obs: string; end: string; text: string } => {
  const era = pick(SEED_ERA), char = pick(SEED_CHAR), sit = pick(SEED_SITUATION)
  const goal = pick(SEED_GOAL), means = pick(SEED_MEANS), obs = pick(SEED_OBSTACLE), end = pick(SEED_ENDING)
  const text = `${era}에서, ${josa(char, '은', '는')} ${sit} 속에서 ${josa(goal, '을', '를')} 위해 ${josaRo(means)} ${obs}에 맞서 ${end}`
  return { era, char, sit, goal, means, obs, end, text }
}

// 영감 조합수: 장면 씨앗 곱집합(SEED_COMBOS) + 서로 다른 3항목 순열(P(N,3)) × 4개 관점 슬롯 배정(4^3).
const combos = (() => {
  const N = TOTAL
  const perm3 = N * (N - 1) * (N - 2)
  return SEED_COMBOS + perm3 * 4 * 4 * 4
})()
const fmtCombos = (n: number): string => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '만'
  return String(n)
}

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (s: { cat: CatDef; item: Device }): string =>
  `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}  [${s.cat.icon} ${s.cat.label}]\n` +
  `[정의] ${s.item.def}\n` +
  `[사용법] ${s.item.how}\n` +
  `[예시] ${s.item.example}\n` +
  `[비틀기] ${s.item.twist}`

// 관련 도구(연계) — 역사·사극 장치 사전에서 자연히 이어지는 도구들
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'anachronism-checker', label: '시대착오 점검', icon: '🏺' },
  { id: 'history-charforge', label: '사극 인물 생성기', icon: '🏯' },
  { id: 'history-sceneforge', label: '사극 장면 생성기', icon: '⚔️' },
  { id: 'history-lexicon', label: '사극 어휘·궁중어 사전', icon: '📜' },
  { id: 'history-tropes', label: '사극 관습 체크리스트', icon: '📐' },
  { id: 'symbolism-dict', label: '상징 사전', icon: '🔮' },
]

export default function HistoryDevices({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const raw = localStorage.getItem(LS + 'cat'); if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw } catch { /* ignore */ }
    return ALL_KEY
  })
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'open'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'favs'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [spark, setSpark] = useState<{ cat: CatDef; item: Device }[] | null>(null) // 무작위 영감(3장)
  const [seed, setSeed] = useState<ReturnType<typeof composeSeed> | null>(null) // 장면 씨앗(7슬롯 합성문)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null) // 무작위 1개
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.cat 으로 초기 카테고리 지정(연계 진입)
  useEffect(() => {
    try {
      const c = payload && typeof payload.cat === 'string' ? payload.cat : ''
      if (c && CATS.some((x) => x.key === c)) setCat(c)
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(graceful)
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리
  useEffect(() => () => {
    mounted.current = false
    if (copyTimer.current) clearTimeout(copyTimer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const itemKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? ALL_ITEMS() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[itemKey(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      (item.aka ? item.aka.toLowerCase().includes(q) : false) ||
      item.def.toLowerCase().includes(q) ||
      item.how.toLowerCase().includes(q) ||
      item.example.toLowerCase().includes(q) ||
      item.twist.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast(null) }, 2200)
  }

  // 무작위 1개(현재 카테고리/검색 풀에서, 직전과 중복 회피)
  const rollRandom = useCallback(() => {
    const pool = filtered.length ? filtered : ALL_ITEMS()
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
    setSpark(null)
  }, [filtered])

  // 무작위 영감: 서로 다른 3장(전체 풀) 뽑기 → 충돌·교배 발상용
  const rollSpark = useCallback(() => {
    const pool = ALL_ITEMS()
    if (pool.length < 3) { setSpark(null); return }
    const idx = new Set<number>()
    while (idx.size < 3) idx.add(Math.floor(Math.random() * pool.length))
    setSpark(Array.from(idx).map((i) => pool[i]))
    setRandom(null)
  }, [])

  // 장면 씨앗: 7개 독립 슬롯을 곱집합으로 합성해 어법에 맞는 한 문장을 만든다(직전과 중복 회피)
  const rollSeed = useCallback(() => {
    setSeed((prev) => {
      let s = composeSeed()
      if (prev && s.text === prev.text) s = composeSeed()
      return s
    })
  }, [])

  const toggleOpen = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setOpen((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = itemKey(catKey, name)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const expandAll = () => { const n: Record<string, boolean> = {}; filtered.forEach(({ cat: c, item }) => { n[itemKey(c.key, item.name)] = true }); setOpen((prev) => ({ ...prev, ...n })) }
  const collapseAll = () => setOpen({})

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => { if (!mounted.current) return; setCopiedKey(id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => { if (mounted.current) setCopiedKey((c) => (c === id ? null : c)) }, 1500) }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {})
      else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() }
    } catch { /* graceful */ }
  }

  // 글감 스니펫 저장
  const saveSnippet = (s: { cat: CatDef; item: Device }) => {
    addToLibrary('snippets', { text: plain(s), source: '역사·사극 서사 장치 사전', tags: ['역사·사극', '서사장치', s.cat.label, s.item.name] })
    showToast(`스니펫 보관함에 ‘${s.item.name}’을(를) 저장했습니다.`)
  }

  // 프로젝트 자료 〈사극 장치〉 폴더에 단일 항목 문서로 추가
  const addItemToProject = (s: { cat: CatDef; item: Device }) => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>${escapeHtml(s.cat.icon + ' ' + s.cat.label)} · ${escapeHtml(s.item.name)}${s.item.aka ? ` <i>(${escapeHtml(s.item.aka)})</i>` : ''}</b></p>`,
      `<p><b>정의</b> · ${escapeHtml(s.item.def)}</p>`,
      `<p><b>사용법</b> · ${escapeHtml(s.item.how)}</p>`,
      `<p><b>예시</b> · ${escapeHtml(s.item.example)}</p>`,
      `<p><b>비틀기</b> · ${escapeHtml(s.item.twist)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사극 장치',
      title: `${s.item.name}${s.item.aka ? ` (${s.item.aka})` : ''}`,
      bodyHtml,
      meta: { 장르: '역사·사극', 분류: s.cat.label, 장치: s.item.name },
    })
    showToast(id ? `프로젝트 자료 〈사극 장치〉에 ‘${s.item.name}’을(를) 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // 현재 보기(필터된 전체)를 한 편의 문서로 프로젝트에 추가
  const addViewToProject = () => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    if (filtered.length === 0) { showToast('추가할 항목이 없습니다.'); return }
    const catLbl = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')
    const parts: string[] = [`<p><b>🏯 역사·사극 서사 장치·전개 — ${escapeHtml(catLbl)} (${filtered.length}개)</b></p>`]
    filtered.forEach(({ cat: c, item }) => {
      parts.push(`<h3>${escapeHtml(c.icon + ' ' + item.name)}${item.aka ? ` (${escapeHtml(item.aka)})` : ''}</h3>`)
      parts.push(`<p><b>정의</b> · ${escapeHtml(item.def)}</p>`)
      parts.push(`<p><b>사용법</b> · ${escapeHtml(item.how)}</p>`)
      parts.push(`<p><b>예시</b> · ${escapeHtml(item.example)}</p>`)
      parts.push(`<p><b>비틀기</b> · ${escapeHtml(item.twist)}</p>`)
    })
    const id = addToProject({ kind: 'text', root: 'research', folder: '사극 장치', title: `역사·사극 서사 장치 — ${catLbl} (${filtered.length})`, bodyHtml: parts.join(''), meta: { 장르: '역사·사극', 분류: catLbl, 항목수: String(filtered.length) } })
    showToast(id ? `프로젝트 자료 〈사극 장치〉에 ${filtered.length}개 항목 문서를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', fontSize: 14 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 6 }
  const lineStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, marginTop: 6 }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  const renderDetail = (item: Device) => (
    <>
      <div style={lineStyle}><span style={labelStyle}>정의</span>{item.def}</div>
      <div style={lineStyle}><span style={labelStyle}>사용법</span>{item.how}</div>
      <div style={lineStyle}><span style={labelStyle}>예시</span>{item.example}</div>
      <div style={lineStyle}><span style={{ ...labelStyle, color: 'var(--warn)' }}>비틀기</span>{item.twist}</div>
    </>
  )

  const catLabel = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '전체')

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>역사·사극</b> 고유의 서사 장치(드라마틱 아이러니·미래지식·사료 인용·밀지·간택·연좌·암행·고사 인용·반정 엔진·어전 설전…)와 전개·페이싱·클라이맥스 관습 <b>{TOTAL}개</b>를 <b>정의·사용법·예시·비틀기</b>로 정리했습니다. <b>장면 씨앗</b>(7개 슬롯 곱집합)·영감 조합 <b>약 {fmtCombos(combos)}가지</b>.
      </div>

      {/* 검색 */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}
        placeholder="장치·전개 검색 (예: 드라마틱 아이러니, 미래지식, 반정, 어전 설전, 간택, 연좌, 회귀빙의)" aria-label="검색" />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🏯"/> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} title={c.blurb}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon}/> {c.label}</button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom}><Emoji e="🎲"/> 무작위 장치</button>
        <button className="minibtn" onClick={rollSpark} title="서로 다른 장치 3개를 뽑아 교배·충돌 발상"><Emoji e="🃏"/> 영감 3연</button>
        <button className="minibtn" onClick={rollSeed} title="시대·인물·상황·목표·수단·장애·결말 7개 슬롯을 곱집합으로 합성해 사극 한 문장 만들기"><Emoji e="🌱"/> 장면 씨앗</button>
        <button className="minibtn" onClick={expandAll}>⊕ 모두 펼치기</button>
        <button className="minibtn" onClick={collapseAll}>⊖ 모두 접기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 연계 + 현재 보기 프로젝트 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={addViewToProject} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? `현재 보기(${catLabel} ${filtered.length}개)를 프로젝트 자료 〈사극 장치〉 폴더에 한 문서로 추가` : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '역사·사극' })} title={`${r.label} 열기`}><Emoji e={r.icon}/> {r.label}</button>
        ))}
      </div>

      {/* 장면 씨앗(7슬롯 곱집합 합성문) */}
      {seed && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🌱"/> 장면 씨앗 — 7개 슬롯을 곱집합으로 합성한 사극 한 문장</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSeed}>↻ 다시</button>
            <button className="minibtn" onClick={() => setSeed(null)}>✕</button>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>{seed.text}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
            <b>시대</b> {seed.era} · <b>인물</b> {seed.char} · <b>상황</b> {seed.sit} · <b>목표</b> {seed.goal} · <b>수단</b> {seed.means} · <b>장애</b> {seed.obs} · <b>결말</b> {seed.end}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(seed.text, 'seed')}>{copiedKey === 'seed' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => { addToLibrary('snippets', { text: seed.text, source: '역사·사극 서사 장치 사전 · 장면 씨앗', tags: ['역사·사극', '장면씨앗', '글감'] }); showToast('장면 씨앗을 스니펫으로 저장했습니다.') }}><Emoji e="📌"/> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 무작위 영감 3연 */}
      {spark && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🃏"/> 영감 3연 — 충돌·교배해 새 장치를 빚어 보세요</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollSpark}>↻ 다시</button>
            <button className="minibtn" onClick={() => setSpark(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spark.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}><Emoji e={s.cat.icon}/> {s.cat.label}</span>
                <b>{s.item.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.item.def}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(spark.map((s) => `• ${s.item.name} — ${s.item.def}`).join('\n'), 'spark')}>{copiedKey === 'spark' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => { addToLibrary('snippets', { text: '사극 장치 교배 영감\n' + spark.map((s) => `• ${s.item.name} (${s.cat.label}) — ${s.item.def}`).join('\n'), source: '역사·사극 서사 장치 사전', tags: ['역사·사극', '영감', '교배'] }); showToast('영감 3연을 스니펫으로 저장했습니다.') }}><Emoji e="📌"/> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 무작위 1개 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.aka && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.aka}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollRandom}>↻ 다시</button>
            <button className="minibtn" onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderDetail(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plain(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="📌"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>{favs[itemKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="linkbtn" onClick={() => addItemToProject(random)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈사극 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>✓ {toast}</div>}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 장치가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = itemKey(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'item:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)} role="button" aria-expanded={isOpen}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
                  {item.aka && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.aka}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5, marginLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.def}</div>
                )}
                {isOpen && (
                  <div style={{ marginLeft: 22 }}>
                    {renderDetail(item)}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); copy(plain({ cat: c, item }), copyId) }}>{copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                      <button className="minibtn" onClick={(e) => { e.stopPropagation(); saveSnippet({ cat: c, item }) }}><Emoji e="📌"/> 스니펫 저장</button>
                      <button className="linkbtn" onClick={(e) => { e.stopPropagation(); addItemToProject({ cat: c, item }) }} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 장치를 프로젝트 자료 〈사극 장치〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>장치는 목적이 아니라 도구입니다. <b>관습(정의·사용법)</b>은 독자와의 약속으로 충실히 지키되, <b>비틀기</b>로 클리셰를 전복해 신선함을 만드세요. 특히 미래지식은 <b>구현 제약</b>이, 클라이맥스는 <b>명분·복선의 회수</b>가, 비극은 <b>드라마틱 아이러니</b>가 카타르시스를 만듭니다.</div>
    </div>
  )
}
