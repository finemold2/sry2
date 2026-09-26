// 무협 어휘·표현 사전 — 강호의 전문용어·호칭·말투·상투구·관용대사를 카테고리로 모은 로컬 사전.
//  사전류: 카테고리 펼침/접기 + 검색 + 무작위 + 클릭복사 + 스니펫 저장.
//  생성기 탭: '관용 대사 조합기' — 발화자 호칭 × 도발/응수 어구 × 무공·강호 어휘 × 맺음투 슬롯을 굴려
//  무협체 대사 한 줄을 대량 생성한다(슬롯 잠금/재생성, 조합 수 1조 이상 표시).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(즐겨찾기·탭·보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 김용/고룡/한무 신무협·웹소설 계보의 어휘·투式·클리셰를 항목 데이터에 구체적으로 반영(일반론 배제).
// 연계(linkbus): 항목·대사를 스니펫 라이브러리에 저장하고, 프로젝트 자료 〈무협 어휘〉 폴더 문서로 추가한다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'wuxia-lexicon',
  name: '무협 어휘·표현 사전',
  icon: '⚔️',
  group: '어휘·표현',
  genre: '무협',
  intro: '강호의 전문용어·호칭·말투·상투구·관용대사를 카테고리로 찾고, 무협체 대사를 슬롯 조합으로 굴리세요',
  w: 600,
  h: 680,
}

const LS = 'sry:tool:wuxia-lexicon'

// ── 사전 항목 ────────────────────────────────────────────
interface Term { name: string; gloss: string; note?: string }
interface Cat { key: string; label: string; icon: string; desc: string; items: Term[] }

// 도시에 근거 무협 전용 어휘. 카테고리별 구체·특화 데이터(일반론 금지).
const CATS: Cat[] = [
  {
    key: 'world', label: '강호·세력', icon: '🏯', desc: '무림의 판세를 이루는 세계·세력 용어',
    items: [
      { name: '강호(江湖)', gloss: '무인(武人)들이 은원과 의리로 얽혀 살아가는 비공식 세계. "강호에 발을 들이다"로 출도(出道)를 뜻한다.' },
      { name: '무림(武林)', gloss: '무공을 익힌 자들의 사회 전체. 강호와 거의 동의어이나, 문파·서열의 조직적 질서를 강조할 때 쓴다.' },
      { name: '정파(正派)', gloss: '협의와 도의를 표방하는 명문 세력. 구파일방·세가가 중심. 위선·당파싸움의 그늘도 단골 소재.' },
      { name: '사파(邪派)', gloss: '명분보다 실리·생존을 좇는 세력. 흑도·살수·도박장과 얽히며, 정파와 회색지대를 오간다.' },
      { name: '마교(魔敎)', gloss: '천마(天魔)를 받드는 사교 집단. 일월신교·천마신교 등으로 불린다. 정사대전의 최종 대척점.' },
      { name: '무림맹(武林盟)', gloss: '정파가 마교·외세에 맞서 결성하는 연합체. 수장은 무림맹주. 결성·해체 자체가 큰 플롯 분기점.' },
      { name: '구파일방(九派一幇)', gloss: '소림·무당·화산·아미·곤륜·점창·청성·종남·공동 + 개방. 작품마다 구성이 바뀌는 정파의 기둥.' },
      { name: '오대세가(五大世家)', gloss: '남궁(검)·사천당문(암기·독)·모용·황보(권)·제갈(지략·진법) 등 무공을 가전하는 명문가.', note: '구성은 작품마다 다름.' },
      { name: '녹림(綠林)', gloss: '산채를 거점으로 한 산적·도적 무리. "녹림십팔채" 식의 연합이 흔하다.' },
      { name: '흑도(黑道)', gloss: '뒷골목의 폭력·이권 세력. 살막·도박장·기루를 끼고 강호의 어두운 경제를 굴린다.' },
      { name: '새외(塞外)', gloss: '중원 바깥의 이질적 세력. 서장 밀교·라마승, 북해 빙궁 등 외부 위협의 출처.' },
      { name: '천마신교(天魔神敎)', gloss: '천마를 교주로 받드는 마도의 본산. 교주·호교법왕·장로·당주의 위계로 짜인다.' },
      { name: '개방(丐幇)', gloss: '거지들의 방파. 천하 제일의 정보망과 타구봉법(打狗棒法)으로 유명. 결의 두수가 방주.' },
      { name: '표국(鏢局)', gloss: '재물·요인을 호위해 운송하는 무가의 사업체. 표사(鏢師)·표두가 일한다. 표물 강탈이 사건의 발화점.' },
      { name: '살막(殺幕)', gloss: '의뢰를 받아 사람을 죽이는 살수 조직. 살수첩·청부·배신이 단골. 혈교(血敎)로도 불린다.' },
      { name: '관무불가침(官武不可侵)', gloss: '관(官)과 강호가 서로의 영역에 개입하지 않는다는 암묵의 불문율. 깨지는 순간 판이 커진다.' },
      { name: '정사대전(正邪大戰)', gloss: '정파와 마교(사파)가 천하를 걸고 벌이는 전면전. 대하 무협의 최종 결전 무대.' },
      { name: '무림지존(武林至尊)', gloss: '강호 전체를 호령하는 절대적 지위. 천하제일인과 겹치되, 권력·위세의 정점을 가리킨다.' },
      { name: '무림공적(武林公敵)', gloss: '강호 전체가 처단을 결의한 공공의 적. 누명으로 공적이 되어 쫓기는 전개가 흔하다.' },
      { name: '비무대회(比武大會)', gloss: '공개 대결로 서열을 가리는 행사. 우승 → 미녀·세력의 주목, 정체 폭로의 무대 장치.' },
    ],
  },
  {
    key: 'power', label: '무공·내공', icon: '🌀', desc: '무공 체계·내공 메커니즘·위계 용어',
    items: [
      { name: '내공(內功)', gloss: '단전에 축적한 진기(眞氣)로 발휘하는 힘. 무공 위계를 정량화하는 핵심. "갑자(甲子)"로 양을 센다(1갑자=60년 공력).' },
      { name: '진기(眞氣)', gloss: '내공의 실체가 되는 기운. 경맥을 따라 운행하며, 진원진기(眞元眞氣)는 타고난 근원의 기.' },
      { name: '단전(丹田)', gloss: '배꼽 아래, 내공이 응축·저장되는 자리. 단전이 부서지면 폐인(廢人)이 된다 — 무인 최악의 형벌.' },
      { name: '운기조식(運氣調息)', gloss: '진기를 경맥으로 돌려 회복·축적하는 호흡 수련. 가부좌·정좌로 행한다. 도중 방해받으면 주화입마 위험.' },
      { name: '경맥(經脈)', gloss: '진기가 흐르는 몸속 통로. 기경팔맥(奇經八脈)이 뚫리면 공력이 비약한다.' },
      { name: '혈도(穴道)', gloss: '몸의 요혈. 점혈(點穴)로 짚어 마비시키고, 해혈(解穴)로 푼다. 막힌 혈을 타통(打通)하면 경지가 오른다.' },
      { name: '심법(心法)', gloss: '내공을 쌓는 운기의 비결·구결(口訣). 무공의 근간으로, 같은 초식도 심법에 따라 위력이 다르다.' },
      { name: '초식(招式)', gloss: '검·도·권의 정해진 동작 한 수. "○○검법 제삼초"처럼 이름이 붙는다. 변초(變招)로 허를 찌른다.' },
      { name: '검기(劍氣)', gloss: '내공을 검에 실어 뿜는 예기(銳氣). 위로 검강(劍罡)이 있다. 기(氣)→강(罡)으로의 위계가 핵심 분기.' },
      { name: '검강(劍罡)', gloss: '검기를 응축해 형태를 띤 강기(罡氣). 검 없이도 베고, 바위를 가른다. 절정 이상 고수의 증표.' },
      { name: '강기(罡氣)', gloss: '기를 압축해 실체화한 최상승 기운. 호신강기로 몸을 두르고, 어검(御劍)·이기어검의 토대가 된다.' },
      { name: '경공(輕功)', gloss: '몸을 가볍게 해 빠르고 멀리 움직이는 보신경. 답설무흔(踏雪無痕)·초상비(草上飛)가 절기.' },
      { name: '보법(步法)·신법(身法)', gloss: '걸음·몸놀림의 운용술. 이형환위(移形換位)로 잔상을 남기며 자리를 바꾼다.' },
      { name: '주화입마(走火入魔)', gloss: '무리한 수련·심마로 진기가 역류해 폐인·발광에 이름. 성장의 리스크 비용이자 긴장 장치.' },
      { name: '심마(心魔)', gloss: '수련 중 마음에서 일어나는 미혹·집착·공포. 떨치지 못하면 주화입마의 직접 원인이 된다.' },
      { name: '환골탈태(換骨奪胎)', gloss: '영약·기연으로 골수·체질이 통째로 바뀌어 거듭나는 경지의 도약. 평생 한 번의 비약.' },
      { name: '반로환동(返老還童)', gloss: '극에 달한 내공으로 늙은 몸이 젊음을 되찾는 현상. 절세 노고수의 위엄을 드러낸다.' },
      { name: '등봉조극(登峰造極)', gloss: '한 분야의 정점에 오름. 무공이 더 오를 데 없는 극한의 경지를 이른다.' },
      { name: '화경(化境)', gloss: '의(意)가 곧 무공이 되는 초절정의 경지. 위로 현경(玄境)·생사경(生死境)을 두는 위계가 흔하다(웹소설).' },
      { name: '만독불침(萬毒不侵)', gloss: '어떤 독에도 상하지 않는 몸. 만년영약 복용·특이체질로 얻는다. 독공·당문과 상극.' },
      { name: '흡성대법(吸星大法)', gloss: '상대의 내공을 빨아들이는 마공. 급성장의 대가로 진기가 충돌·폭주하거나 인간성을 잃는다.' },
      { name: '이기어검(以氣御劍)', gloss: '검을 손에서 떠나보내 기로 조종하는 상승 검술. 선협 색채가 짙어 사실계에선 절제해 쓴다.' },
    ],
  },
  {
    key: 'rank', label: '경지·서열', icon: '🪜', desc: '고수의 등급과 강호의 서열 호칭',
    items: [
      { name: '삼류(三流)', gloss: '문파 잡졸·초보 수준. 기초 초식만 익힌 단계. "어디서 굴러먹던 삼류가" 식 멸칭으로도 쓰인다.' },
      { name: '이류(二流)', gloss: '한 문파에서 한몫하는 무인. 일대일은 가능하나 고수 앞에선 무력하다.' },
      { name: '일류(一流)', gloss: '문파를 대표할 만한 실력자. 다수를 상대하고 이름이 알려지기 시작하는 단계.' },
      { name: '절정(絶頂)', gloss: '검기를 자유로이 쓰는 고수. 한 지역·문파의 최강급. 절정에 이르러야 비로소 "고수" 소리를 듣는다.' },
      { name: '초절정(超絶頂)', gloss: '검강·강기를 운용하는 극상의 고수. 한 사람이 전세를 뒤집는 전략 자산.' },
      { name: '화경·현경(化境·玄境)', gloss: '인간의 한계를 넘어선 경지. 천하에 손꼽히는 절대고수. 웹소설은 그 위에 생사경을 둔다.' },
      { name: '천하제일인(天下第一人)', gloss: '강호에서 무공으로 가장 높은 자. 그 자리를 노린 도전·쟁탈이 영원한 플롯 엔진.' },
      { name: '절대고수(絶代高手)', gloss: '한 시대를 가르는 압도적 강자. 등장만으로 판세가 정해진다.' },
      { name: '노고수(老高手)·은거기인(隱居奇人)', gloss: '강호를 떠나 은거한 전대의 절대자. 주인공에게 기연·전수를 내리는 단골 존재.' },
      { name: '소협(少俠)', gloss: '젊은 협객을 높여 부르는 말. 주인공급 청년 무인의 단골 호칭.' },
      { name: '대협(大俠)', gloss: '협의를 천하에 떨친 큰 협객. "협지대자, 위국위민"의 김용식 이상형.' },
      { name: '마두(魔頭)', gloss: '마도의 두목·악명 높은 살인귀를 통칭. "천하의 마두" 식으로 공포의 대명사가 된다.' },
      { name: '검선(劍仙)', gloss: '검의 도가 신선의 경지에 이른 자. 비검·어검을 부리는 선협 색채의 최상위.' },
      { name: '후기지수(後起之秀)', gloss: '강호의 차세대 유망주. 신진 고수를 가리키며, 비무대회에서 두각을 드러낸다.' },
      { name: '오성(悟性)·자질(資質)', gloss: '무공을 깨치는 타고난 재능. "백 년에 한 번 나올 오성"이 주인공 떡밥.' },
    ],
  },
  {
    key: 'item', label: '비급·신병·영약', icon: '📜', desc: '무공서·병기·영약 등 쟁탈의 대상',
    items: [
      { name: '비급(秘笈)', gloss: '절세 무공이 적힌 책. 강호를 뒤흔드는 쟁탈전의 핵심 물건. "이 비급이 세상에 나오면 피바람이 분다."' },
      { name: '신병이기(神兵利器)', gloss: '쇠를 진흙처럼 베는 명검·명도. 도룡도·의천검처럼 그 자체가 천하의 상징이 된다.' },
      { name: '영약(靈藥)·영단(靈丹)', gloss: '복용하면 내공이 급상승하는 약. 만년하수오·공청석유가 대표. 서사적 레벨업 장치.' },
      { name: '내단(內丹)', gloss: '영물(靈物)이 수백 년 응축한 기운의 결정. 이무기·영사·영원(靈猿)의 내단이 절륜한 보물.' },
      { name: '만년하수오(萬年何首烏)', gloss: '천년·만년 묵은 약초의 으뜸. 한 뿌리에 수십 년 공력이 깃들었다는 전설의 영약.' },
      { name: '공청석유(空靑石乳)', gloss: '동굴 깊은 곳에 맺힌 천지의 정수. 한 방울로 내상을 치유하고 공력을 끌어올린다.' },
      { name: '단약(丹藥)·환단(還丹)', gloss: '영약을 제련한 알약. 대환단(大還丹)·소환단 등 위계가 있고, 소림 등 명문의 비전이 유명.' },
      { name: '독공(毒功)·독물(毒物)', gloss: '독을 무기로 삼는 무공·재료. 당문의 독·고독(蠱毒)이 대표. 만독불침의 천적.' },
      { name: '암기(暗器)', gloss: '몰래 던져 쓰는 비수·표창·독침. 사천당문의 절기. 정면 무력의 변수이자 비겁의 상징.' },
      { name: '기관(機關)·기문진(奇門陣)', gloss: '진법·함정 장치. 다수가 진을 짜 고수를 제압하거나, 비동·보물고를 지킨다. 제갈세가의 절학.' },
      { name: '심법서(心法書)·구결(口訣)', gloss: '운기의 비결을 담은 글·구절. 통째로 외워야 하며, 잘못 익히면 주화입마에 빠진다.' },
      { name: '유진(遺珍)·전대고수의 유해', gloss: '비동에서 발견되는 전대 고수의 유골과 유물. 절벽기연의 단골 구성물.' },
      { name: '벽곡단(辟穀丹)', gloss: '먹으면 곡기를 끊고도 버티게 하는 단약. 장기 폐관수련·도주 중의 생존 장치.' },
      { name: '면구(面具)·인피면구(人皮面具)', gloss: '얼굴을 통째로 바꾸는 가면. 신분 위장·역용(易容)의 핵심 소도구. 정체 반전의 떡밥.' },
    ],
  },
  {
    key: 'ethic', label: '협·은원', icon: '⚖️', desc: '강호의 도의·은혜·원한을 다루는 윤리 어휘',
    items: [
      { name: '협(俠)', gloss: '약자를 돕고 불의에 맞서는 무인의 도리. "협지대자, 위국위민(俠之大者, 爲國爲民)" — 협의 정점은 국가·백성.' },
      { name: '은원(恩怨)', gloss: '은혜와 원한. 강호의 모든 관계를 규정하는 두 축. "강호의 은원은 강호에서 푼다."' },
      { name: '유은필보 유구필보(有恩必報 有仇必報)', gloss: '은혜는 반드시 갚고, 원한도 반드시 갚는다는 강호의 철칙. 인물 동기의 근본.' },
      { name: '의기(義氣)', gloss: '벗·동료를 위해 목숨도 거는 의리의 기개. "의기상통(意氣相通)"으로 맺어진다.' },
      { name: '강호도의(江湖道義)', gloss: '성문법은 없으나 무인이라면 지켜야 할 불문의 도리. 어기면 천하의 손가락질을 받는다.' },
      { name: '사문(師門)', gloss: '스승과 그 문하. 사부의 원수는 곧 나의 원수. 사문의 명예·은혜가 도덕의 축이 된다.' },
      { name: '문규(門規)·가법(家法)', gloss: '문파·가문의 계율. 어기면 파문(破門)·폐무공(廢武功) 같은 중벌. 갈등의 불씨.' },
      { name: '파문(破門)', gloss: '제자를 사문에서 내치는 처벌. 무공을 폐하고 쫓아내기도. 누명 파문 → 복수·재기 서사의 출발.' },
      { name: '복수(復讐)·멸문(滅門)', gloss: '가문·사문이 몰살당함(멸문지화)에서 시작되는 개인 복수. 천하대의로 확장되는 동선의 기점.' },
      { name: '대의(大義)', gloss: '개인을 넘어선 천하·백성을 위한 명분. 사사로운 은원과 충돌할 때 진짜 협이 시험받는다.' },
      { name: '의제·의형제(義兄弟)', gloss: '피를 나누지 않았으나 의로 맺은 형제. 결의(結義)로 맺고, 그 배신이 가장 큰 비극이 된다.' },
      { name: '귀은(歸隱)', gloss: '강호의 모든 것을 내려놓고 은거함. 천하제일이 된 뒤 표연히 떠나는 무협 특유의 엔딩.' },
      { name: '강호인(江湖人)의 신용(信用)', gloss: '한 번 한 말·약속은 목숨으로 지킨다는 무인의 신의. 깨지면 강호에서 매장당한다.' },
      { name: '맹세(盟誓)·독맹(毒盟)', gloss: '하늘에 거는 맹세. 어기면 천벌을 받는다는 독한 맹세(독맹)로 결속·협박을 건다.' },
    ],
  },
  {
    key: 'address', label: '호칭·자칭', icon: '🗣️', desc: '나·상대·존자를 부르는 무협체 호칭',
    items: [
      { name: '재하(在下)', gloss: '"저, 소인"의 겸칭. 무인이 통성명·인사할 때 가장 흔히 쓰는 자칭. "재하는 ○○문의 △△라 하오."' },
      { name: '소생(小生)', gloss: '젊은 남자가 자신을 낮춰 이르는 말. 서생·청년 협객의 점잖은 자칭.' },
      { name: '본좌(本座)', gloss: '높은 자리의 인물이 자신을 일컫는 위압적 자칭. 마교 교주·문주·마두가 즐겨 쓴다.' },
      { name: '노부(老夫)', gloss: '노인이 자신을 이르는 말. 전대 고수·노고수의 위엄 어린 1인칭. "노부가 한 수 가르쳐 주마."' },
      { name: '노납(老衲)', gloss: '늙은 승려의 자칭. 소림 등 불문 고수가 쓴다. "노납이 합장하오." (합장과 함께.)' },
      { name: '빈도(貧道)·빈승(貧僧)', gloss: '도사(빈도)·승려(빈승)가 자신을 낮춰 이르는 말. 무당·소림 계열 인물의 자칭.' },
      { name: '본 교주·본 문주(本敎主·本門主)', gloss: '교·문의 수장이 공식적으로 자신을 일컫는 호칭. 권위를 강조한다.' },
      { name: '소협·여협(少俠·女俠)', gloss: '상대 젊은 협객을 높여 부르는 말(남: 소협, 여: 여협). 예의를 갖춘 첫 호칭.' },
      { name: '전배·후배(前輩·後輩)', gloss: '강호의 선후배. 항렬·연배를 존중하는 위계 호칭. "전배께 한 수 가르침을 청합니다."' },
      { name: '각하(閣下)·대협(大俠)', gloss: '상대를 한껏 높이는 존칭. 큰 인물·대협을 마주했을 때 쓴다.' },
      { name: '시주(施主)', gloss: '승려가 속인(俗人)을 부르는 말. 소림 고승이 강호인을 칭할 때 쓴다.' },
      { name: '교주·방주·장문인(敎主·幇主·掌門人)', gloss: '각각 마교·방파·문파의 수장. 정파 문파의 우두머리는 장문인·장문이라 부른다.' },
      { name: '소저(小姐)', gloss: '미혼의 젊은 여인을 높여 이르는 말. "○ 소저"로 세가의 영애·여협을 부른다.' },
      { name: '공자(公子)', gloss: '귀한 집안 젊은 남자를 높이는 호칭. "○ 공자"로 세가의 자제를 부른다.' },
      { name: '애송이·후레자식·잡배', gloss: '상대를 깔보는 멸칭. "어디서 굴러먹던 애송이가" 식 도발의 단골 어휘.' },
    ],
  },
  {
    key: 'line', label: '관용 대사·투式', icon: '💬', desc: '무협 특유의 정형 대사와 말투 패턴',
    items: [
      { name: '"강호의 은원은 강호에서 푼다."', gloss: '관에 기대지 않고 무인끼리 직접 결판낸다는 강호의 철칙. 결투 직전 단골 대사.' },
      { name: '"이 한 수를 받아라!"', gloss: '필살의 절초를 펼치며 외치는 선언. 결투 클라이맥스의 정형 외침.' },
      { name: '"오늘 네놈의 명줄이 여기서 끊기는구나."', gloss: '상대를 끝장내겠다는 살의의 선포. 마두·악역의 단골 대사.' },
      { name: '"검을 거두시오."', gloss: '싸움을 멈추자는 정중한 제지. 고수의 여유 또는 화해의 신호.' },
      { name: '"강호에서 다시 봅시다."', gloss: '훗날을 기약하는 작별 인사. 미진한 승부·잠정적 휴전의 여운을 남긴다.' },
      { name: '"노부가 한 수 가르쳐 주마."', gloss: '연배·실력의 우위를 과시하는 도발 겸 가르침. 노고수의 단골 대사.' },
      { name: '"감히 본좌의 앞을 막다니."', gloss: '위압적 인물이 도전자를 깔아뭉개는 일갈. 마교 교주·마두의 투式.' },
      { name: '"강호초출(江湖初出)이라 세상 무서운 줄 모르는군."', gloss: '갓 출도한 애송이를 비웃는 도발. 직후 반전(주인공의 진짜 실력)의 떡밥.' },
      { name: '"이름 없는 자의 검에 죽고 싶지 않으면 물러나라."', gloss: '정체를 숨긴 고수의 경고. 무명(無名)을 빌린 위압.' },
      { name: '"한 수 가르침을 청합니다(請敎)."', gloss: '정중히 대결을 신청하는 예법. 비무·논검의 정형 청유.' },
      { name: '"좋은 검(劍)이로군."', gloss: '상대의 무공·병기를 인정하는 짧은 감탄. 고룡식 절제된 호적수 인정.' },
      { name: '"승부는 한 수면 족하다."', gloss: '긴 합 없이 단칼에 끝낸다는 고룡식 결투관. 정적 후의 찰나의 한 수.' },
      { name: '"빚은 반드시 갚는다 — 은혜든 원한이든."', gloss: '유은필보 유구필보의 대사화. 인물의 신조를 못박는 선언.' },
      { name: '"이 무공으로 천하를 어찌 논하겠느냐."', gloss: '상대를 압도하며 격차를 못박는 멸시. 웹소설 먼치킨의 경악 유발 대사.' },
      { name: '"강호는 넓고 고수는 많다."', gloss: '자만을 경계하는 경구. 오만한 자에게 던지거나, 패배 뒤 곱씹는 자성의 말.' },
      { name: '"검에는 눈이 없소(劍下無眼)."', gloss: '진검 대결은 목숨을 건다는 경고. 비무 전 책임 소재를 미리 못박는 정형구.' },
    ],
  },
  {
    key: 'place', label: '장소·기물', icon: '🏞️', desc: '강호의 공간·지명·풍물 어휘',
    items: [
      { name: '객잔(客棧)', gloss: '여관 겸 주막. 강호인이 모이고 정보·시비가 오가는 무대. "객잔에서의 시비 → 정체 폭로"의 단골.' },
      { name: '비동(秘洞)', gloss: '인적 끊긴 동굴·밀실. 전대 고수의 유해·비급·영약이 잠든 절벽기연의 무대.' },
      { name: '폐관(閉關)·폐관수련', gloss: '외부와 단절하고 들어앉아 무공에 정진함. 돌파 직전의 잠적, 시간 도약의 장치.' },
      { name: '연무장(演武場)', gloss: '문파에서 무공을 익히고 비무를 벌이는 마당. 제자들의 일상·서열 다툼의 공간.' },
      { name: '장경각(藏經閣)', gloss: '문파의 무공서를 보관하는 서고. 소림 장경각이 대표. 비급 절도·침입의 표적.' },
      { name: '기루(妓樓)·도박장', gloss: '흑도와 정보가 얽히는 환락가. 정보상·살수와의 접선, 통속 무협의 인연이 시작되는 곳.' },
      { name: '장강(長江)·황하(黃河)', gloss: '강호의 대동맥. 수로의 패권(장강수로채)을 둘러싼 세력 다툼의 무대.' },
      { name: '설산(雪山)·빙궁(氷宮)', gloss: '북해·새외의 설역. 빙공(氷功)·한기를 다루는 외부 세력의 본거지.' },
      { name: '낙양·항주·개봉', gloss: '강호의 거점 대도시. 무림대회·세력 회합이 열리는 번화의 중심.' },
      { name: '산문(山門)', gloss: '문파로 들어가는 정문·경계. "산문을 나선다"는 출도, "산문을 닫는다"는 폐쇄·전쟁 태세.' },
      { name: '뇌옥(牢獄)·수라장(修羅場)', gloss: '갇히는 지하 감옥(뇌옥)과 아수라 같은 살육의 현장(수라장). 위기·결전의 공간.' },
      { name: '무림대회·영웅대회(英雄大會)', gloss: '천하 고수가 한자리에 모이는 대집회. 동맹·선전포고·정체 폭로가 한꺼번에 터지는 무대.' },
    ],
  },
]

// ── 관용 대사 조합기 슬롯 ──────────────────────────────────
// 무대 × 발화자 × 도발/운 × 무공·강호 어휘 × 정황(태세) × 맺음투 6슬롯.
// 각 슬롯 40~52면 → 조합 수 수십~수백억(1억 이상, 1조에 근접) 자동 표시.
interface GenSlot { key: string; label: string; icon: string; pre?: boolean; faces: string[] }

const GEN_SLOTS: GenSlot[] = [
  {
    key: 'stage', label: '무대·배경', icon: '🏞️', pre: true,
    faces: [
      '비바람 몰아치는 객잔 처마 아래,', '인적 끊긴 비동(秘洞) 입구에서,', '안개 자욱한 장강의 나루에서,',
      '눈 내리는 설산 빙궁의 문턱에서,', '횃불 일렁이는 무림맹 연무장 한복판에서,', '달빛 부서지는 대나무 숲 사이로,',
      '핏물 고인 수라장 한가운데서,', '천하 고수가 모인 영웅대회의 비무대 위에서,', '폐허가 된 사문의 옛 산문(山門) 앞에서,',
      '강물 소리만 가득한 적막한 절벽 끝에서,', '향내 자욱한 소림 장경각 앞에서,', '도박과 칼부림이 엉킨 흑도의 기루에서,',
      '서리 내린 새벽 관도(官道)에서,', '낙양 저잣거리의 인파를 가르며,', '불타는 표국(鏢局)의 잔해 속에서,',
      '천마신교의 거대한 마전(魔殿) 아래,', '구름 위로 솟은 화산(華山) 정상에서,', '독무(毒霧)가 깔린 사천당문의 후원에서,',
      '얼어붙은 북해의 빙판 위에서,', '사막의 모래폭풍이 잦아든 폐사(廢寺)에서,', '천길 낭떠러지를 등진 외나무다리 위에서,',
      '폐관수련을 막 끝낸 어두운 석실 앞에서,', '시신이 즐비한 멸문(滅門)의 잿더미 위에서,', '비급을 두고 모여든 군웅(群雄)의 한복판에서,',
      '안개 너머 검광만 번뜩이는 호숫가에서,', '뇌옥(牢獄)의 차가운 쇠창살 너머로,', '황혼이 내려앉은 무덤가에서,',
      '폭우에 잠긴 장강수로채의 선상에서,', '횃불도 없는 칠흑의 비밀 통로에서,', '천둥이 치는 무당산 운무 속에서,',
      '단 한 자루 검만이 꽂힌 무명(無名)의 검총(劍塚)에서,', '연회의 술잔이 채 식기도 전,', '추격을 따돌린 깊은 산중 동굴에서,',
      '대결을 알리는 징 소리가 울려 퍼진 광장에서,', '핏빛 노을이 강물을 물들인 강기슭에서,', '서장(西藏) 라마승의 밀교 사원 앞에서,',
      '쫓기던 끝에 다다른 막다른 협곡에서,', '천하제일을 가린다는 화산논검(華山論劍)의 자리에서,', '잔치가 파한 텅 빈 객잔 안에서,',
      '바람 한 점 없는 새벽의 연못가에서,', '무림공적으로 몰려 포위당한 산채에서,', '월광 아래 두 그림자만 마주한 빈 마당에서,',
    ],
  },
  {
    key: 'speaker', label: '발화자 결', icon: '🗣️',
    faces: [
      '재하, 이름 없는 검객이', '노부가', '본좌가', '소생이', '빈도(貧道)가',
      '본 교주가', '늙은 중(노납)이', '한낱 후배가', '천하의 마두가', '은거하던 노고수가',
      '갓 출도한 소협이', '복수만을 별러 온 자가', '단전이 부서졌던 폐인이', '정체를 숨긴 명문 후예가',
      '회귀하여 미래를 아는 자가', '검 한 자루뿐인 낭인이', '사문을 잃은 마지막 제자가', '천하제일을 노리는 자가',
      '약관의 후기지수가', '백 년에 한 번 난다는 오성의 주인이', '강호를 떠돌던 무명소졸(無名小卒)이',
      '천마의 후계를 자처하는 자가', '맹세에 묶인 외팔의 검객이', '독에 잠식된 채 버티는 당문의 후예가',
      '폐관을 막 끝낸 절정의 고수가', '의형제의 배신을 겪은 자가', '눈먼 채 검을 잡은 노검객이',
      '천 리를 달려온 표국의 표두가', '면구를 벗은 적의 첩자가', '약초만 캐던 산골 소년이',
      '죽은 줄 알았던 전대의 마교주가', '환골탈태를 막 마친 자가', '대협의 이름을 물려받은 후인이',
      '독맹(毒盟)에 묶인 살수가', '비급을 손에 넣은 도굴꾼이', '사부의 유언을 품은 막내 제자가',
      '천하를 등진 은거기인이', '검선(劍仙)의 반열에 든 자가', '강호의 마지막 양심이라 불리는 자가',
    ],
  },
  {
    key: 'taunt', label: '도발·운(韻)', icon: '💢',
    faces: [
      '어디서 굴러먹던 애송이가 감히', '강호초출이라 세상 무서운 줄 모르고', '그 알량한 무공으로',
      '하늘 높은 줄 모르는 오만으로', '겁도 없이 앞을 막아서고', '천하를 우습게 알고',
      '제 명줄이 여기서 끊길 줄도 모르고', '한 수 가르침을 청한다며', '검 한 번 제대로 잡아본 적 없는 주제에',
      '명문의 위세만 믿고', '비급 한 권 손에 넣었다고', '내공 몇 갑자에 우쭐하여',
      '은원(恩怨)도 모르는 채', '강호의 도의를 저버리고', '약자를 짓밟던 손으로',
      '사문의 원수를 코앞에 두고도', '마교의 그림자가 드리운 줄도 모르고', '제 실력을 과신하여',
      '천하가 넓은 줄 모르고', '죽음이 검끝에 매달린 줄도 모르고', '협(俠)이 무엇인지도 모르고',
      '빚진 목숨을 헛되이 굴리며', '얕은 재주를 절학인 양 뽐내며', '선대의 이름에 먹칠을 하고도',
      '점혈도 풀지 못하는 솜씨로', '독 한 줌에 무릎 꿇어 본 적 없다는 듯', '맹세를 헌신짝처럼 저버리고',
      '강호의 신용(信用)을 헌 짚신 버리듯 하고', '천마의 무서움도 겪어보지 못한 채', '검하무안의 이치도 잊은 채',
      '핏값을 갚을 생각도 없이', '대의(大義)를 입에 담을 자격도 없으면서', '한낱 운(運)을 실력으로 착각하여',
      '폐인이 되어본 적 없는 손으로', '구결 한 줄 외우지 못한 머리로', '주화입마의 무서움도 모른 채',
      '강호의 선후배도 가리지 못하고', '천하제일을 입에 올리는 만용으로', '제 목에 칼이 든 줄도 모르고',
    ],
  },
  {
    key: 'craft', label: '무공·강호 어휘', icon: '🌀',
    faces: [
      '이 한 수의 검강(劍罡)을', '필생의 절초(絶招)를', '구결에 담긴 심법의 진수를',
      '검기(劍氣)에 실은 살의를', '점혈(點穴)의 묘리를', '이형환위(移形換位)의 보법을',
      '만독불침의 호신강기를', '단전에 응축한 일 갑자의 공력을', '비급에서 깨친 변초(變招)를',
      '천마신공의 마기(魔氣)를', '환골탈태로 거듭난 진기를', '암기에 발린 당문의 독을',
      '기문진(奇門陣)의 절학을', '어검술(御劍術)의 경지를', '주화입마를 무릅쓰고 끌어올린 진원진기를',
      '흡성대법으로 빼앗은 내공을', '답설무흔(踏雪無痕)의 경공을', '검하무안(劍下無眼)의 진검을',
      '화경(化境)에 든 의(意)의 검을', '백 초를 갈무리한 마지막 한 수를', '타구봉법(打狗棒法)의 절기를',
      '기경팔맥을 꿰뚫은 한 줄기 진기를', '강기(罡氣)로 두른 검막(劍幕)을', '천하를 베었다는 도룡(屠龍)의 한 칼을',
      '심마(心魔)를 끊어낸 무심(無心)의 검을', '독공(毒功)에 물든 손속을', '벽력 같은 권강(拳罡)을',
      '한기 서린 빙공(氷功)의 장력을', '눈에 보이지 않는 무형검(無形劍)을', '구파의 정종(正宗) 검법을',
      '한 호흡에 펼치는 연환(連環) 십팔검을', '오성으로 깨친 자작(自作)의 절학을', '봉인했던 마지막 금기무공을',
      '전대 고수가 남긴 유진(遺珍)의 한 수를', '내단을 삼켜 폭증한 공력을', '반로환동으로 되찾은 절륜한 진기를',
      '비도(飛刀)에 실은 단 한 번의 노림수를', '천근추(千斤墜)로 내리누른 압력을', '소림 칠십이종 절예(絶藝)의 하나를',
      '검선의 경지에 닿은 비검(飛劍)을', '강호를 떨게 한 단 하나의 신공(神功)을',
    ],
  },
  {
    key: 'stance', label: '정황·태세', icon: '⚖️', pre: true,
    faces: [
      '검을 천천히 뽑아 들며', '소맷자락을 떨치고', '한 발 앞으로 내디디며',
      '눈빛 하나 흔들리지 않고', '입가에 서늘한 미소를 머금은 채', '두 손을 모아 합장하고',
      '핏물을 닦아낸 칼끝을 겨누며', '바람처럼 자리를 바꿔', '내공을 끌어올려 옷자락을 떨게 하며',
      '오랜 침묵을 깨고', '단전에 진기를 모은 채', '한 치의 물러섬도 없이',
      '죽음을 각오한 듯 담담히', '천천히 면구를 벗으며', '주화입마를 무릅쓰고',
      '마지막 남은 진기를 짜내', '상대의 검을 두 손가락으로 받아내고', '발끝으로 흙먼지를 일으키며',
      '은원의 무게를 한 마디에 담아', '하늘을 한 번 올려다본 뒤', '검집을 내던지고',
      '제 단전을 가리키며', '핏기 가신 얼굴로도 곧게 서서', '술잔을 내려놓고 일어서며',
      '낮고 무거운 목소리로', '천둥 같은 일갈과 함께', '눈물조차 말라버린 눈으로',
      '사부의 위패를 등진 채', '동료의 시신을 넘어서며', '겨눈 검을 미세하게 떨며',
      '강호의 도의를 한 번 더 새기듯', '쫓기던 걸음을 멈춰 세우고', '독기에 잠긴 손을 들어 올리며',
      '상대의 빈틈을 꿰뚫어 본 듯', '회한과 살의를 함께 누른 채', '느릿하게, 그러나 결연히',
      '천하의 이목이 쏠린 가운데', '제 이름 석 자를 똑똑히 밝힌 뒤', '검끝에 강기를 맺으며',
    ],
  },
  {
    key: 'close', label: '맺음투', icon: '⚔️',
    faces: [
      '똑똑히 받아라!', '여기서 결판을 내자꾸나.', '오늘 네 명줄을 거두어 주마.',
      '강호의 은원, 오늘 이 자리에서 푼다.', '강호에서 다시 볼 일은 없을 것이다.', '검을 거두고 물러서라 — 마지막 자비다.',
      '승부는 한 수면 족하다.', '눈을 부릅뜨고 보아라.', '천하에 그 이름을 기억하게 하리라.',
      '빚은 반드시 갚는다, 은혜든 원한이든.', '이 무공으로 천하를 어찌 논하겠느냐.', '한 수 가르침, 사양치 않겠다.',
      '오늘 강호에 새 전설이 새겨지리라.', '두 번 말하지 않는다.', '죽어서도 이 검을 잊지 마라.',
      '네 사문의 원수, 오늘 갚는다.', '하늘이 보고 있으니 후회는 없다.', '검에는 눈이 없음을 기억하라.',
      '이름 없는 검에 죽는 영광을 누려라.', '강호는 넓고 고수는 많음을 깨우쳐 주마.', '한 걸음만 더 내디디면 황천길이다.',
      '오늘 이후 네 이름은 강호에서 지워질 것이다.', '협이 무엇인지 죽기 전에 가르쳐 주마.', '이 검이 곧 너의 답이다.',
      '물러서지 않겠다면, 후회도 남기지 마라.', '천마의 그림자라도 오늘은 막지 못한다.', '네가 흘린 피, 한 방울도 헛되지 않게 하마.',
      '검을 들었으면 끝을 보아라.', '맹세컨대, 오늘이 마지막이다.', '강호의 도의가 살아 있음을 보여주마.',
      '내 사부의 이름으로, 너를 베겠다.', '살고 싶거든 무릎을 꿇어라.', '이 한 칼에 모든 은원을 끝낸다.',
      '천하가 지켜보는 앞에서 결판을 내자.', '도망칠 곳은 어디에도 없다.', '검광이 꺼지기 전에 답하라.',
      '오늘의 패배를 평생 기억하게 해 주마.', '강호초출의 무서움, 똑똑히 새겨라.', '이 자리에서 천하제일을 가린다.',
      '눈을 감지 마라 — 마지막까지 지켜보아라.', '검을 거두든, 목을 내놓든, 택하라.',
    ],
  },
]

const flatAll = (): { cat: Cat; item: Term }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmtBig = (n: number) => {
  // 큰 수를 '약 X조 Y억' 식으로 보기 좋게
  const eok = 1e8, jo = 1e12
  if (n >= jo) return `약 ${(n / jo).toFixed(n >= jo * 10 ? 0 : 2)}조`
  if (n >= eok) return `약 ${(n / eok).toFixed(n >= eok * 10 ? 0 : 1)}억`
  return n.toLocaleString('ko-KR')
}

export default function WuxiaLexicon({ payload }: { payload?: Record<string, unknown> }) {
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const [tab, setTab] = useState<'dict' | 'gen' | 'saved'>(() => {
    try {
      const raw = localStorage.getItem(LS + ':tab')
      if (raw === 'dict' || raw === 'gen' || raw === 'saved') return raw
    } catch { /* ignore */ }
    return 'dict'
  })

  // ── 사전 상태 ──
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':open')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return { [CATS[0].key]: true }
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [randomTerm, setRandomTerm] = useState<{ cat: Cat; item: Term } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── 생성기 상태 ──
  const [picks, setPicks] = useState<number[]>(() => GEN_SLOTS.map((s) => Math.floor(Math.random() * s.faces.length)))
  const [locks, setLocks] = useState<boolean[]>(() => GEN_SLOTS.map(() => false))

  // ── 보관함(생성 대사 CRUD) ──
  interface SavedLine { id: string; text: string; slots: string; ts: number }
  const [saved, setSaved] = useState<SavedLine[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a }
    } catch { /* ignore */ }
    return []
  })

  const toastTimer = useRef<number | null>(null)
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + ':tab', tab) } catch { /* ignore */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + ':open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const combos = useMemo(() => GEN_SLOTS.reduce((n, s) => n * s.faces.length, 1), [])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1400)
    }).catch(() => { /* graceful */ })
  }

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  // 검색 시: 매칭되는 카테고리를 자동 펼침
  const q = query.trim().toLowerCase()
  const matched = useMemo(() => {
    return CATS.map((c) => {
      let items = c.items
      if (onlyFav) items = items.filter((it) => favs[favKey(c.key, it.name)])
      if (q) items = items.filter((it) => it.name.toLowerCase().includes(q) || it.gloss.toLowerCase().includes(q) || (it.note || '').toLowerCase().includes(q))
      return { cat: c, items }
    }).filter((g) => g.items.length > 0)
  }, [q, onlyFav, favs])
  const shownCount = useMemo(() => matched.reduce((n, g) => n + g.items.length, 0), [matched])

  const rollRandomTerm = useCallback(() => {
    const pool = flatAll()
    setRandomTerm((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pick.item.name === prev.item.name) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
  }, [])

  // ── 생성기 동작 ──
  const roll = useCallback(() => {
    setPicks((prev) => prev.map((p, i) => {
      if (locks[i]) return p
      const len = GEN_SLOTS[i].faces.length
      if (len <= 1) return p
      let n = Math.floor(Math.random() * len)
      if (n === p) n = (n + 1 + Math.floor(Math.random() * (len - 1))) % len
      return n
    }))
  }, [locks])
  const toggleLock = (i: number) => setLocks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const line = useMemo(() => {
    // 슬롯 순서: 무대 · 발화자 · 도발 · 무공어휘 · 정황(태세) · 맺음투
    const [stage, sp, ta, cr, st, cl] = picks.map((p, i) => GEN_SLOTS[i].faces[p])
    // "무대, 발화자가 도발, 정황 무공어휘를 맺음투" 형태의 무협체 한 단락으로 엮는다.
    return `${stage} ${sp} ${ta}, ${st} ${cr} ${cl}`
  }, [picks])
  const slotSummary = useMemo(() => picks.map((p, i) => GEN_SLOTS[i].faces[p]).join(' · '), [picks])

  // ── 저장/연계 ──
  const saveTermSnippet = (cat: Cat, item: Term) => {
    addToLibrary('snippets', {
      text: `[무협어휘·${cat.label}] ${item.name} — ${item.gloss}${item.note ? ` (${item.note})` : ''}`,
      source: '무협 어휘·표현 사전',
      tags: ['무협', '어휘', cat.label, item.name],
    })
    flash(`스니펫에 '${item.name}'을(를) 저장했습니다.`)
  }

  const saveLineSnippet = () => {
    addToLibrary('snippets', {
      text: `[무협 대사] ${line}`,
      source: '무협 어휘·표현 사전 (관용 대사 조합기)',
      tags: ['무협', '대사', '글감'],
    })
    flash('대사를 스니펫에 저장했습니다.')
  }

  const keepLine = () => {
    setSaved((prev) => [{ id: 'wl_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), text: line, slots: slotSummary, ts: Date.now() }, ...prev].slice(0, 200))
    flash('보관함에 대사를 담았습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const termToProject = (cat: Cat, item: Term) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>${escapeHtml(cat.icon + ' ' + cat.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.gloss)}</p>`,
      item.note ? `<p style="color:#888"><i>${escapeHtml(item.note)}</i></p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '무협 어휘', title: item.name, bodyHtml })
    if (id) flash(`프로젝트 자료 〈무협 어휘〉에 '${item.name}'을(를) 추가했습니다.`)
  }

  const lineToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>⚔️ 무협 관용 대사</b></p>`,
      `<p style="font-size:15px"><b>${escapeHtml(line)}</b></p>`,
      `<p style="color:#888"><i>슬롯: ${escapeHtml(slotSummary)}</i></p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '무협 어휘', title: line.slice(0, 24) + (line.length > 24 ? '…' : ''), bodyHtml })
    if (id) flash('프로젝트 자료 〈무협 어휘〉에 대사를 추가했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      {/* 헤더 */}
      <div style={hint}>
        강호의 전문용어·호칭·말투·상투구를 <b>{CATS.length}개 분류 · {total}개 항목</b>으로 모았습니다.
        {payloadGenre && payloadGenre !== '무협' ? <> (요청 장르: <b>{escapeHtml(payloadGenre)}</b> — 무협 어휘로 안내합니다)</> : null}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('dict')} aria-pressed={tab === 'dict'} style={tabBtn(tab === 'dict')}><Emoji e="📚"/> 어휘 사전</button>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'} style={tabBtn(tab === 'gen')}><Emoji e="🎲"/> 관용 대사 조합기</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="📁"/> 보관함{saved.length ? ` (${saved.length})` : ''}</button>
      </div>

      {/* ── 사전 탭 ── */}
      {tab === 'dict' && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="용어·뜻으로 검색 (예: 단전, 내공, 은원, 본좌)"
            style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandomTerm} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 용어</button>
            <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
              style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
              {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
            </button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {randomTerm && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={randomTerm.cat.icon}/> {randomTerm.cat.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{emojify(randomTerm.item.name)}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandomTerm(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{emojify(randomTerm.item.gloss)}</div>
              {randomTerm.item.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>※ {emojify(randomTerm.item.note)}</div>}
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(`${randomTerm.item.name} — ${randomTerm.item.gloss}`, 'rnd')}>{copiedKey === 'rnd' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
                <button className="minibtn" onClick={() => toggleFav(randomTerm.cat.key, randomTerm.item.name)}>{favs[favKey(randomTerm.cat.key, randomTerm.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
                <button className="linkbtn" onClick={() => saveTermSnippet(randomTerm.cat, randomTerm.item)}><Emoji e="💾"/> 스니펫 저장</button>
                <button className="linkbtn" onClick={() => termToProject(randomTerm.cat, randomTerm.item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈무협 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
              </div>
            </div>
          )}

          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}

          {/* 카테고리 펼침 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {matched.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 용어가 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : matched.map(({ cat: c, items }) => {
              const isOpen = q ? true : (open[c.key] ?? false) // 검색 중엔 항상 펼침
              return (
                <div key={c.key} style={card}>
                  <button
                    onClick={() => { if (!q) setOpen((o) => ({ ...o, [c.key]: !(o[c.key] ?? false) })) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'var(--text)', cursor: q ? 'default' : 'pointer', padding: 0, font: 'inherit', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 14 }}>{isOpen ? '▾' : '▸'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e={c.icon}/> {c.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length}</span>
                    <span style={{ ...hint, marginLeft: 'auto', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</span>
                  </button>
                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {items.map((item) => {
                        const fk = favKey(c.key, item.name)
                        const isFav = !!favs[fk]
                        const cid = 'i:' + fk
                        return (
                          <div key={fk} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span
                                onClick={() => copy(`${item.name} — ${item.gloss}`, cid)}
                                title="클릭하면 복사"
                                style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                              >{emojify(item.name)}</span>
                              {copiedKey === cid && <span style={{ fontSize: 11, color: 'var(--accent)' }}>✓ 복사됨</span>}
                              <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                                style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                            </div>
                            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{emojify(item.gloss)}</div>
                            {item.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>※ {emojify(item.note)}</div>}
                            <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                              <button className="minibtn" onClick={() => copy(`${item.name} — ${item.gloss}`, cid)}><Emoji e="📋"/> 복사</button>
                              <button className="linkbtn" onClick={() => saveTermSnippet(c, item)}><Emoji e="💾"/> 스니펫</button>
                              <button className="linkbtn" onClick={() => termToProject(c, item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈무협 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── 생성기 탭 ── */}
      {tab === 'gen' && (
        <>
          <div style={hint}>
            네 슬롯(발화자·도발·무공어휘·맺음투)을 굴려 무협체 대사 한 줄을 생성합니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
            조합 수 <b>{fmtBig(combos)}</b> ({combos.toLocaleString('ko-KR')}가지).
          </div>

          {/* 결과 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.6 }}>“{line}”</div>
            <div style={{ ...hint, marginTop: 6 }}>{slotSummary}</div>
          </div>

          {/* 슬롯들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GEN_SLOTS.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="minibtn" onClick={() => toggleLock(i)} aria-pressed={locks[i]} title={locks[i] ? '잠금 해제' : '이 슬롯 고정'}
                  style={{ flexShrink: 0, borderColor: locks[i] ? 'var(--accent)' : 'var(--border)' }}>{locks[i] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                <div style={{ flex: 1, minWidth: 0, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e={s.icon}/> {s.label} <span style={{ opacity: 0.7 }}>({s.faces.length})</span></div>
                  <div style={{ fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.faces[picks[i]]}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={roll} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 굴리기</button>
            <button className="minibtn" onClick={() => copy(line, 'genline')}>{copiedKey === 'genline' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={keepLine}><Emoji e="📌"/> 보관함에 담기</button>
          </div>

          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={saveLineSnippet}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="linkbtn" onClick={lineToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈무협 어휘〉에 대사 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기"><Emoji e="🧑"/> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
          </div>

          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}
          <div style={hint}>대사는 출발점입니다. 인물의 사문·신분·말투(노부/본좌/재하)에 맞춰 어미·호칭을 손보면 한층 살아납니다.</div>
        </>
      )}

      {/* ── 보관함 탭 ── */}
      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
          {toast && <div style={{ fontSize: 12.5, color: 'var(--accent)', textAlign: 'center' }}>✓ {toast}</div>}
          {saved.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
              아직 담은 대사가 없습니다. 〈관용 대사 조합기〉에서 마음에 드는 대사를 📌로 담아 보세요.
            </div>
          ) : saved.map((s) => (
            <div key={s.id} style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>“{s.text}”</div>
              <div style={{ ...hint, marginTop: 4 }}>{s.slots}</div>
              <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="minibtn" onClick={() => copy(s.text, 'sv:' + s.id)}>{copiedKey === 'sv:' + s.id ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
                <button className="linkbtn" onClick={() => { addToLibrary('snippets', { text: `[무협 대사] ${s.text}`, source: '무협 어휘·표현 사전', tags: ['무협', '대사', '글감'] }); flash('스니펫에 저장했습니다.') }}><Emoji e="💾"/> 스니펫</button>
                <button className="linkbtn" disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈무협 어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                  onClick={() => {
                    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
                    const id = addToProject({ kind: 'text', root: 'research', folder: '무협 어휘', title: s.text.slice(0, 24) + (s.text.length > 24 ? '…' : ''), bodyHtml: `<p style="font-size:15px"><b>${escapeHtml(s.text)}</b></p><p style="color:#888"><i>${escapeHtml(s.slots)}</i></p>` })
                    if (id) flash('프로젝트 자료 〈무협 어휘〉에 추가했습니다.')
                  }}><Emoji e="📄"/> 프로젝트</button>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => removeSaved(s.id)}><Emoji e="🗑"/> 삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
