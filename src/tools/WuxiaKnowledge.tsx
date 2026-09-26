// 무협 장르 지식·소재 사전 — 계보·독자기대·서사장치·내공/무공 메커니즘·강호 세력·세계관 지리·용어·호칭·클리셰(변주)·웹소설(회귀먼치킨)·클라이맥스·함정·감각묘사 소재.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용. localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속. 언마운트 정리.
// 사전류 규약: 카테고리 펼침 + 검색 + 무작위 + 클릭복사. 연계: addToProject(자료〈무협 지식〉), addToLibrary('snippets'), openToolLinked, hasProjectBridge.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'wuxia-knowledge', name: '무협 지식 사전', icon: '🗡️', group: '지식 사전', genre: '무협', intro: '무협에서 자주 쓰는 소재·설정·고증 지식을 카테고리로 찾고 장면에 심으세요', w: 660, h: 640 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 무협 도시에 기반 자작 지식 사전 — 14개 카테고리, 합계 170+ 항목. (일반론 금지, 장르 특화)
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'lineage', label: '계보·갈래', icon: '📜', note: '어느 계보(중국 신파/한무 신무협/웹소설)에 서느냐에 따라 문체·페이싱·도덕관이 갈린다. 먼저 좌표를 정하라.',
    items: [
      { name: '구파(舊派)·선협 원류', desc: '환주루주 『촉산검협전』의 검선(劍仙)·비검(飛劍)·법보(法寶). 도술·장수가 허용되는 선협계의 뿌리.', tip: '비검·법보를 쓰려면 "사실계가 아니라 선협계"임을 1장에서 못 박아라. 중력·인간 한계를 깬 채로 사실계인 척하면 일관성이 깨진다.' },
      { name: '김용형 정통대협(신파)', desc: '『사조영웅전』 『천룡팔부』 『소오강호』. "협지대자, 위국위민(俠之大者, 爲國爲民)" — 협을 국가·민족 차원으로 격상한 표준.', tip: '개인 무공보다 "큰 협"의 도덕적 무게가 중심. 역사(송·원·명)와 강호를 겹쳐 스케일을 키워라.' },
      { name: '고룡형 낭인추리(신파)', desc: '『초류향』 『소이비도』. 단문·분위기·추리. 결투를 "찰나의 한 수"로 압축, 고독한 낭인 주인공.', tip: '합을 길게 묘사하지 말고 정적·심리전 끝에 단칼로 끝내라. 술·여자·우정·고독의 분위기가 곧 문체다.' },
      { name: '양우생형 정통사극', desc: '신파의 문을 연 작가. 정통 사극·시사(詩詞) 풍, 단정한 정사대립.', tip: '시사·고문 인용으로 격조를 내되 과하면 현대 독자에게 무겁다. 정통의 품격을 원할 때 참고.' },
      { name: '한무 2세대(대본소)', desc: '금강 『발해의 혼』, 서효원 『대자객교』, 사마달·검궁인, 야설록 통속무협. 한국적 소재·비운의 천재·다작 합작 시스템.', tip: '서효원식 "이기고도 잃는" 비극, 야설록식 낭만·통속의 결을 빌려 한국적 정서를 입혀라.' },
      { name: '한무 신무협 3세대', desc: '좌백 『대도오』, 용대운 『군림천하』, 풍종호 『경혼기』, 진산 『색마』. 캐릭터 내면·문체 혁신, 기상천외한 무공 상상력, 여성 관점 도입.', tip: '한무 정체성의 핵심. 클리셰를 자각하고 문체·인물 내면으로 차별화하는 신무협의 결.' },
      { name: '웹소설 회귀먼치킨(화산귀환형)', desc: '비가 『화산귀환』 등 회귀·환생·빙의 결합 무협. 현 한무 클리셰의 사실상 새 표준. 사이다·먼치킨·상태창.', tip: '회차당 1사이다, 미래 지식의 정보 우위, 경악 리액션이 핵심. 1~3화 안에 회귀 트리거를 보여라.' },
      { name: '대륙신무협·수선(선협 분기)', desc: '2000년대 웹소설에서 무협→수선(修仙)·선협으로 분기. 경지 돌파·등선(登仙) 중심.', tip: '"무협"과 "수선"은 다르다. 인간 한계 안의 무공이면 무협, 신선이 되어 승천하면 수선이다. 톤을 섞지 마라.' },
      { name: '신분위장·복수 정통형', desc: '사문·가문 몰살 → 신분 숨기고 잠입·복수. 좌백·용대운·서효원이 즐긴 한무 정통 동선.', tip: '복수가 개인에서 천하대의로 확장되는 곡선이 정통의 맛. 복수만 하면 협이 아니다.' },
      { name: '여성향·로맨스 무협(무로)', desc: '진산 이후 여성 작가·관점, 그리고 로맨스 결합 무협(무로). 사파 미남·정파 여협 등.', tip: '강호의 은원과 로맨스를 분리하지 말고 "사랑이 곧 강호의 선택"이 되게 엮어라.' },
    ],
  },
  {
    key: 'expect', label: '독자 기대(장르 계약)', icon: '🤝', note: '어기면 계약 위반이 되는 무협의 필수 관습. 충족 위에 비틀어야 신선해진다.',
    items: [
      { name: '약자→강자 성장 곡선', desc: '주인공이 어떤 기연으로, 어떤 무공을, 어떤 대가로 강해지는가. 성장 없는 무협은 계약 위반.', tip: '"무엇을 얻는가"만큼 "무엇을 치르는가"를 설계하라. 대가 없는 성장은 가볍다.' },
      { name: '기연(奇緣)의 기대와 경계', desc: '절벽 추락 후 비동의 비급·영약·기인. 독자는 기대하면서도 진부함을 경계한다.', tip: '기연 자체보다 "변주와 제약"이 관건. 비급에 함정·미완성·대가를 붙여라.' },
      { name: '은원필보(有恩必報, 有仇必報)', desc: '은혜는 반드시 갚고 원한도 반드시 갚는다. 협의 윤리의 핵심.', tip: '은원이 분명해야 강호의 도덕이 선다. "갚을 빚"의 목록이 곧 플롯의 동력이다.' },
      { name: '강호의 질서 가늠', desc: '정파-사파-마교 구도, 무림맹·구파일방, 고수 서열. 독자는 "이 사람이 강호 어디쯤인가"를 늘 잰다.', tip: '신캐 등장마다 강호적 위치(문파·서열·평판)를 즉시 제시하라.' },
      { name: '결투 디테일(합 주고받기)', desc: '초식 이름·내공 운용·병기 묘사로 합(合)을 주고받는 장면.', tip: '초식 작명만 나열하지 말고 원리·약점·상성으로 "전술적 합"을 보여라.' },
      { name: '복수에서 대의로의 확장', desc: '사문·가족 몰살의 개인 복수에서 천하대의로 동선이 넓어진다.', tip: '복수의 끝에서 "더 큰 적·더 큰 책임"을 마주하게 해 스케일을 키워라.' },
      { name: '사이다(즉각 응징)', desc: '웹소설 한정. 무시·도발을 통쾌하게 되갚는 즉각적 카타르시스.', tip: '회차당 최소 1회. 단, 남발하면 긴장이 죽으니 고구마-사이다 리듬을 둬라.' },
      { name: '회귀 미래 지식의 활용', desc: '웹소설 한정. 과거로 돌아온 자가 미래·강호의 흐름을 선점·예방·이용.', tip: '"알기에 가능한 선택"이 독자의 우월감 대리만족. 단, 미래가 바뀌면 지식이 무용해지는 긴장도 넣어라.' },
      { name: '먼치킨 카타르시스', desc: '웹소설 한정. 압도적 강함이 주는 통쾌함. 무시→증명→압도의 사이클.', tip: '치트에 조건·약점·미완성을 둬서 성장 여지를 남겨라. 처음부터 무적이면 긴장이 없다.' },
      { name: '귀은(歸隱) 정서의 기대', desc: '천하제일 등극 후 모든 것을 버리고 은거하는 무협 특유의 엔딩 정서.', tip: '"이겨서 다 가졌으되 다 버린다"는 무협 고유의 허무·달관. 정통일수록 이 여운을 기대받는다.' },
    ],
  },
  {
    key: 'qigong', label: '내공·무공 메커니즘', icon: '🌀', note: '무공 위계를 정량화하는 장치. 단전·진기·경맥·경지의 규칙을 일관되게 깔아야 결투가 설득력을 얻는다.',
    items: [
      { name: '단전(丹田)·진기(眞氣)', desc: '아랫배 단전에 축적되는 내공의 원천. 진기·진원진기의 총량이 곧 공력(功力)의 척도.', tip: '단전의 "용량·회복 속도"를 정해두면 장기전·연전(連戰)의 페이싱이 일관된다. 단전 파괴=무공 상실이라는 치명 카드를 아껴라.' },
      { name: '운기조식(運氣調息)', desc: '진기를 경맥으로 돌려 다스리고 회복하는 호흡 수련. 부상·소모 후의 회복 의식.', tip: '운기조식 중에는 무방비 — 적의 기습, 동료의 호법(護法)이라는 긴장·관계 장치로 쓸 수 있다.' },
      { name: '경맥·기경팔맥(奇經八脈)', desc: '진기가 흐르는 체내 통로. 경맥을 뚫거나(타통) 넓히면 무공이 급상승한다.', tip: '"막힌 경맥을 뚫는 순간"을 성장 마일스톤으로. 임독양맥(任督二脈) 타통은 환골탈태급 도약의 단골.' },
      { name: '혈도·점혈(點穴)·해혈', desc: '몸의 요혈을 짚어 마비·봉쇄(점혈)하거나 푸는(해혈) 기술. 비살상 제압·심문의 변수.', tip: '점혈은 "죽이지 않고 제압"하는 협의 수단이자, 시간제한(몇 시진 뒤 풀림) 긴장 장치로 좋다.' },
      { name: '심법(心法)·구결(口訣)', desc: '내공을 쌓는 근본 비결. 같은 초식도 심법이 다르면 위력이 갈린다.', tip: '"초식은 훔쳐도 심법 없이는 무용"이라는 규칙이 비급 쟁탈의 논리를 만든다.' },
      { name: '기→강(罡) 위계', desc: '검기(劍氣)→검강(劍罡)처럼 기를 응축·외화하는 단계. 도기·강기로 병기에 실린다.', tip: '"기가 강이 되는 벽"을 명확히 두면 고수-절정고수의 격차가 시각적으로 실감 난다.' },
      { name: '경지 위계(절정·화경·현경·생사경)', desc: '삼류·이류·일류→절정→초절정→화경(化境)→현경(玄境)→생사경. 웹소설형 경지 사다리.', tip: '경지 상한과 각 단계의 "세상이 다르게 보이는" 감각을 미리 설계해 파워 인플레를 통제하라.' },
      { name: '환골탈태(換骨奪胎)', desc: '영약·기연·돌파로 육신이 근본부터 바뀌어 자질이 격상되는 변화.', tip: '환골탈태에 "고통·위험·시간"의 비용을 붙여 공짜 도약이 안 되게 하라.' },
      { name: '반로환동(返老還童)', desc: '극에 이른 내공으로 노인이 젊음을 되찾는 경지. 전대고수의 위상 표지.', tip: '겉늙은(혹은 동안의) 외모와 실제 경지의 괴리를 정체 은닉·반전에 활용하라.' },
      { name: '주화입마(走火入魔)', desc: '무리한 수련·역행·심마로 진기가 폭주해 폐인·발광. 성장의 리스크 비용.', tip: '"빨리 강해지려는 욕심"의 대가로 주화입마를 걸면 성장이 도박이 되어 긴장이 산다.' },
      { name: '심마(心魔)', desc: '내면의 욕망·공포·집착이 수련을 방해하거나 마공으로 끌어들이는 마음의 마귀.', tip: '심마를 외화하면 "자기 자신과의 결투"라는 내면 클라이맥스를 만들 수 있다.' },
      { name: '내단(內丹)·영약 흡수', desc: '영물의 내단·만년영약을 복용해 내공을 급상승. 서사적 레벨업 장치.', tip: '흡수에 "소화·동화의 위험(폭주·부작용)"을 붙이고, 남용은 성취의 무게를 깎으니 자제하라.' },
      { name: '흡성대법·화공(吸星·化功)', desc: '타인의 내공을 빨아들이는 마공. 빠른 성장의 대가로 부작용·반발·도덕적 추락.', tip: '강해지되 인간성·수명·이성을 잃는 트레이드오프로 도덕적 딜레마를 만들어라.' },
      { name: '내공 위계의 정량화(상태창)', desc: '웹소설은 경지·수치·상태창으로 강함을 명시화하기도 한다.', tip: '수치 상승에 반드시 서사적 의미를 붙여라. 숫자만 오르면 카타르시스가 공허해진다.' },
    ],
  },
  {
    key: 'martial', label: '무공·초식·병기', icon: '⚔️', note: '무공은 멋진 한자 이름이 아니라 원리·약점·상성으로 살아난다. 작명만 나열하는 공허화를 경계하라.',
    items: [
      { name: '검법(劍法)·검기', desc: '검을 다루는 무공. 쾌검(빠름)·중검(무거움)·환검(현란함) 등 결이 다르다. 검강에 이르면 무형의 베기.', tip: '주인공 검법에 "철학(예: 무초식이 곧 최고 초식)"을 부여하면 한 수에 인물의 도(道)가 실린다.' },
      { name: '도법(刀法)·패도', desc: '한쪽 날의 도. 패도적·직선적·강맹함의 상징. 도객은 흔히 호방·거칠다.', tip: '검=정밀·고고함, 도=패기·실전. 병기 선택으로 인물 성격을 즉시 각인하라.' },
      { name: '권법·장법(拳·掌)', desc: '맨손 무공. 강맹한 권(주먹)과 부드러운 장(손바닥). 항룡십팔장·태극권의 강유.', tip: '"강(剛)을 부드러움(柔)으로 받아 흘린다"는 강유 상성이 권장법 결투의 묘미다.' },
      { name: '지법·조법(指·爪)', desc: '손가락(지)·갈고리손(조)의 점혈·관통 무공. 일양지·구음백골조류.', tip: '지법은 점혈과 결합해 "한 점으로 제압"하는 정밀함을, 조법은 잔혹함을 연출한다.' },
      { name: '암기(暗器)·당문', desc: '몰래 던지는 비도·독침·철질려. 사천당문(唐門)이 종주. 정면 무력의 변수.', tip: '암기는 "예측 불가의 변수"로 강자를 무너뜨린다. 고수도 암기 앞엔 방심 못 한다.' },
      { name: '독(毒)·만독불침', desc: '독약·독공으로 적을 무력화. 만독불침(萬毒不侵)은 모든 독에 면역인 체질·경지.', tip: '독은 "정면으로 못 이길 적을 잡는 약자의 무기". 해독·중독의 시간제한이 긴장을 만든다.' },
      { name: '경공(輕功)·답설무흔', desc: '몸을 가볍게 해 빠르고 높이 나는 신법. 답설무흔(눈을 밟아도 자국이 없음), 이형환위.', tip: '추격·잠입·암살 장면의 핵심. 경공의 격차로 "도망도 못 친다"는 절망을 연출하라.' },
      { name: '보법(步法)·신법(身法)', desc: '발놀림·몸놀림으로 회피·기동·위치 선점. 능파미보·이형환위 같은 환술적 이동.', tip: '"베지 못하면 결투에서 진다" — 신법의 우열을 합의 승부 요소로 적극 써라.' },
      { name: '내가권 vs 외가권', desc: '내공 중심의 부드러운 내가권(무당·태극) vs 근골·외공 중심의 외가권(소림 일부).', tip: '두 유파의 상성·논쟁을 문파 정치·결투의 명분으로 끌어와라.' },
      { name: '진법·기문진(奇門陣)', desc: '여럿이 진을 짜 한 명의 고수를 제압하거나 공간을 미궁으로 만든다. 제갈세가의 특기.', tip: '"다대일로 절대고수를 꺾는" 진법은 무력 격차를 머리로 뒤집는 두뇌전 장치다.' },
      { name: '기관(機關)·함정', desc: '비동·고묘·보고에 설치된 기계 장치·함정. 보물과 죽음이 함께 있다.', tip: '기연(비급)에 기관·함정을 결합하면 "쉽게 주워가는 비급"의 진부함을 피할 수 있다.' },
      { name: '신병이기(神兵利器)', desc: '명검·보도 등 전설의 병기. 도룡도·의천검류. 쟁탈의 표적이자 권위의 상징.', tip: '신병에 "내력 소모·주인 선택·저주" 같은 조건을 붙이면 단순 파워업을 넘어선다.' },
      { name: '상승무공·절대신공의 희소성', desc: '천하제일을 가르는 단 하나의 신공(神功). 비급 쟁탈이 플롯 엔진.', tip: '"이 신공이 왜 그렇게 강하고 위험한가"의 설정을 깔아야 쟁탈전이 설득력을 얻는다.' },
      { name: '무초승유초(無招勝有招)', desc: '정해진 초식을 버린 경지가 정형화된 초식을 이긴다. 독고구검·고룡식 무도철학.', tip: '클라이맥스에서 주인공이 "초식을 버리는 순간"을 깨달음의 정점으로 배치하라.' },
    ],
  },
  {
    key: 'serendipity', label: '기연·성장 장치', icon: '✨', note: '무협 성장의 엔진. 변주와 대가를 붙여야 진부함과 성취의 무게 소실을 피한다.',
    items: [
      { name: '절벽기연', desc: '추락 → 비동(秘洞) → 전대고수 유해·심법서·영약. 가장 고전적인 기연.', tip: '"왜 하필 이 사람이, 왜 이 시점에"를 인과로 설명하면 우연이 운명이 된다. 변주: 비급이 함정·미완성.' },
      { name: '전인 지목(傳人)', desc: '죽어가는 절대고수가 무공·유지를 물려줌. 흔히 단전 폐인·주화입마 직전의 위기와 결합.', tip: '전수에 "전대의 원한·미완의 사명"을 딸려 보내면 단순 파워업이 인연·복수의 시작이 된다.' },
      { name: '영약·내단 복용', desc: '만년하수오·공청석유·영물 내단으로 내공 급상승.', tip: '영약 흡수의 "위험(폭주·동화 실패)"과 희소성을 지켜라. 위기마다 영약은 성취를 깎는다.' },
      { name: '특이체질·기연체질', desc: '천맥(天脈)·구음절맥·만독불침·무근지체 등 타고난 특이체질. 폐인 취급받다 각성.', tip: '체질에 "양날(예: 강해지나 단명, 통제 불가)"을 부여해 축복이자 저주로 만들어라.' },
      { name: '고묘(古墓)·전대 비고', desc: '전대 기인의 무덤·동굴 거처에서 무공·신병·약을 얻는다. 활사인묘류.', tip: '고묘의 "전대 주인의 사연·시험"을 풀어야 비급을 얻게 하면 기연이 서사가 된다.' },
      { name: '비급(秘笈) 쟁탈', desc: '강호를 뒤흔드는 절세 비급을 두고 벌어지는 추적·암투·살육.', tip: '비급을 "가진 자가 표적이 되는 저주"로 만들면 손에 넣는 순간이 위기의 시작이 된다.' },
      { name: '기인·은거고수와의 만남', desc: '저잣거리 거지·주정뱅이·노인이 알고 보니 전대 절정고수. 가르침을 받는다.', tip: '"하찮아 보이던 자가 절대고수"라는 반전은 강호의 "사람을 함부로 보지 말라"는 격언을 체현한다.' },
      { name: '주화입마 극복·전화위복', desc: '주화입마·중상을 운기·기연으로 넘기며 오히려 더 큰 도약을 이룬다.', tip: '"죽을 위기가 곧 도약"이라는 무협 특유의 전화위복. 단, 남발하면 위기의 무게가 사라진다.' },
      { name: '기연 남발의 함정', desc: '위기마다 새 비급·영약으로 해결하면 성취의 무게가 사라진다.', tip: '기연에는 반드시 대가·제약을. 그리고 결정적 성장은 "스스로 깨달은 한 수"로 마무리하라.' },
      { name: '회귀로 얻는 기연 선점', desc: '웹소설형. 미래를 아는 회귀자가 기연의 위치·시점을 선점해 더블 어드밴티지.', tip: '"남보다 먼저 안다"가 회귀의 핵심. 단, 기연을 선점하는 과정 자체에 경쟁·방해를 넣어 긴장을 살려라.' },
    ],
  },
  {
    key: 'jianghu', label: '강호·세력·서열', icon: '🏯', note: '정파-사파-마교의 구도와 서열이 무협 세계의 질서다. 신캐마다 강호적 위치를 즉시 제시하라.',
    items: [
      { name: '정파(正派)', desc: '명분·협의를 내건 문파 연합. 구파일방·오대세가 중심. 위선·내부 부패의 그림자도 흔하다.', tip: '"정파의 위선"을 비틀면 정사(正邪)의 경계가 흐려져 입체적 갈등이 생긴다.' },
      { name: '사파(邪派)', desc: '명분보다 실리·힘·자유를 좇는 무리. 살수·도박장·기루·녹림과 얽힌다.', tip: '사파를 "악"이 아니라 "다른 도의(道義)"로 그리면 정사대립이 단순 선악극을 벗어난다.' },
      { name: '마교(魔敎)·천마신교', desc: '강호의 절대 대척점. 천마(天魔)를 수장으로 한 거대 세력. 정사대전·마교 침공의 진원.', tip: '마교 내부의 위계·신앙·내분을 그리면 "막연한 악"이 아닌 살아있는 적국이 된다.' },
      { name: '새외(塞外)·외부 위협', desc: '서장(西藏) 밀교·라마승, 북해 빙공, 사막·초원 세력 등 중원 밖의 위협.', tip: '내부 정사 다툼이 외부 침공 앞에 손잡는 "외우(外憂)"의 구도로 스케일을 키워라.' },
      { name: '무림맹(武林盟)·정파 연합', desc: '정파가 마교·사파에 맞서 결성하는 동맹. 맹주(盟主) 자리를 둘러싼 정치.', tip: '맹의 내부 파벌·맹주 쟁탈을 그리면 외부 적 못지않은 내부 긴장이 생긴다.' },
      { name: '구파일방(九派一幇)', desc: '소림·무당·화산·아미·곤륜·점창·청성·종남·공동 + 개방. 정파 무림의 기둥(작품마다 변동).', tip: '각 문파의 특화(소림 내공, 무당 검·태극, 화산 검, 개방 정보망)를 살려 차별화하라.' },
      { name: '오대세가(五大世家)', desc: '남궁(검)·사천당문(암기·독)·모용·황보(권·외공)·제갈(지략·진법). 혈연 기반 무가.', tip: '세가는 "가문의 명예·계승·정략"이 얽힌 정치 무대. 문파와 다른 혈연 드라마를 깐다.' },
      { name: '서열·고수 위계', desc: '삼류·이류·일류·절정·초절정·화경 / 절세고수·천하제일인·무림지존. 강호의 랭킹.', tip: '신캐 등장마다 "강호에서 어느 위치"인지 알려야 독자가 위협을 가늠한다.' },
      { name: '천하제일인·무림지존', desc: '강호 최강자의 칭호. 비무·정사대전으로 결정되며, 모두의 도전 표적이 된다.', tip: '"정점에 오른 자의 고독·책임·권태"를 그리면 단순 최강이 아닌 인물이 된다.' },
      { name: '녹림(綠林)·흑도(黑道)', desc: '산적·도적의 녹림, 뒷세계의 흑도. 강호의 어두운 하부구조.', tip: '"의적(義賊) 녹림"의 결을 살리면 단순 악당이 아닌 회색 세력이 된다.' },
      { name: '비무(比武)·논검(論劍)', desc: '공식 대결 이벤트(화산논검 등). 서열 재편·인물 무대화·명성 획득의 장치.', tip: '비무대회를 토너먼트형 에피소드로 쓰면 다수 고수를 한 무대에 세우고 성장을 가시화할 수 있다.' },
      { name: '관무불가침(官武不可侵)', desc: '관(官)·황실은 강호 일에 개입하지 않는다는 암묵의 룰. 강호와 조정의 긴장.', tip: '"관이 강호에 손대는 순간"을 금기 위반·대사건으로 쓰면 판이 흔들린다.' },
    ],
  },
  {
    key: 'org', label: '직업·조직·생활', icon: '🏮', note: '강호를 살아 있게 만드는 직업·경제·장소. 거대 서사 사이의 생활 디테일이 몰입의 접착제다.',
    items: [
      { name: '표국(鏢局)·표사(鏢師)', desc: '재물·사람을 호위해 운송하는 무사 사업. 표행(鏢行) 중 습격이 단골 사건.', tip: '표행 의뢰는 "여정 + 습격 + 정체 폭로"를 한 번에 거는 편리한 발단 장치다.' },
      { name: '객잔(客棧)', desc: '여관 겸 주막. 강호인이 모이고 정보·시비·인연·살육이 교차하는 무대.', tip: '"객잔에서의 시비 → 정체 드러남"은 고전 클리셰. 비틀려면 시비 거는 쪽이 사실 함정·시험.' },
      { name: '살막(殺幕)·혈교 등 살수조직', desc: '돈을 받고 사람을 죽이는 청부 조직. 살수는 정체·감정을 죽이도록 훈련된다.', tip: '"감정을 되찾는 살수"는 매력적 주인공·조력자 유형. 조직의 추적이 긴장을 만든다.' },
      { name: '개방(丐幇)·정보망', desc: '거지들의 방파. 천하에 깔린 거지 정보망으로 강호 최강의 정보력을 가진다.', tip: '"천하의 모든 소문은 개방을 거친다" — 정보가 필요할 때의 만능 창구이자 의외의 고수 집단.' },
      { name: '의원(醫員)·신의', desc: '부상·중독·주화입마를 치료하는 의술가. 신의(神醫)는 강호의 보물.', tip: '"치료의 대가·조건"을 까다롭게 하면 의원 찾기 자체가 퀘스트가 된다.' },
      { name: '독인(毒人)·독문', desc: '독을 다루는 자·문파. 사천당문·오독교류. 정파와 사파 사이의 위험한 회색지대.', tip: '독은 양날 — 의술과 독술은 종이 한 장 차이. 독인의 도덕적 위치를 모호하게 두면 흥미롭다.' },
      { name: '대장장이·신병 제작', desc: '명검·보도를 벼리는 장인. 백 년에 한 자루 나올 신병을 만든다.', tip: '신병 제작에 "희귀 광석·장인의 생명·피"를 요구하면 병기 하나에 서사가 깃든다.' },
      { name: '기루(妓樓)·도박장', desc: '환락가. 정보·음모·인연·통속적 로맨스의 무대. 야설록식 통속무협의 단골.', tip: '"기루의 명기가 실은 정보상·고수·복수자"라는 반전으로 통속을 비틀어라.' },
      { name: '전장(錢莊)·표은(票銀)', desc: '강호의 환전·송금·예치를 맡는 금융. 거액의 무게와 위조·강탈의 위험.', tip: '"누가 강호의 돈줄을 쥐는가"를 권력의 축으로 쓰면 무력 외의 갈등이 생긴다.' },
      { name: '문파의 잡일제자·외문제자', desc: '입문 후 허드렛일부터 시작하는 막내·외문제자. 무재(無才) 취급받다 각성하는 발단의 단골.', tip: '"폐기·잡일 취급받던 막내가 사실 천재"는 강력한 사이다 발판. 변주로 진부함을 피하라.' },
    ],
  },
  {
    key: 'world', label: '세계관·지리·시대', icon: '🗺️', note: '한무는 시대를 흐릿하게(무국적 강호) 처리하기도 한다. 사실계/선협계 톤을 초기에 고정하라.',
    items: [
      { name: '시대 배경(가상·흐릿한 중국)', desc: '막연한 고대 중국(명·송·당 분위기) 또는 가상 왕조. 한무는 종종 시대를 흐릿하게 둔다.', tip: '역사를 겹치면 스케일·고증 부담이 크고, 무국적 강호로 두면 자유롭다. 어느 쪽인지 먼저 정하라.' },
      { name: '사실계 vs 선협계 톤', desc: '중력·인간 한계를 지키는 사실계 ↔ 비검·법보·도술·장수의 선협계. 분기를 초기에 고정.', tip: '"사람이 칼로 싸우는 세계"인지 "검으로 날아다니는 세계"인지가 모든 묘사의 기준이 된다.' },
      { name: '소림·무당(불·도)', desc: '소림사(불교·외공·내공의 종주)와 무당산(도교·태극·검). 정파 무림의 양대 성지.', tip: '소림=중후한 정통, 무당=유연한 도가. 두 산문의 분위기 대비를 적극 활용하라.' },
      { name: '화산·아미·곤륜 등 명산문파', desc: '화산(검)·아미(여승·검)·곤륜(서역과 닿은 곳)·점창·청성·종남·공동. 각 산이 곧 문파.', tip: '산세·기후·풍광이 문파 무공·기질에 반영되게 하면 지리가 캐릭터가 된다.' },
      { name: '낙양·항주·장강·황하', desc: '강호의 도시·수로. 낙양·개봉·항주·성도, 장강·황하·동정호 등 이동·교역·결전의 좌표.', tip: '도시는 정보·세력의 결절점, 강은 표행·추격·도주의 무대. 지명에 분위기를 입혀라.' },
      { name: '사막·설산·북해', desc: '중원 밖의 극지. 사막·설산·북해빙궁은 새외 세력·기연·시련의 무대.', tip: '극한의 자연은 "수련·고립·기연"을 한꺼번에 거는 무대. 빙공·열공 같은 환경 무공도 자연스럽다.' },
      { name: '비동(秘洞)·고묘·금지(禁地)', desc: '비급·영약이 잠든 동굴·무덤·금단의 땅. 기연과 죽음이 함께 있다.', tip: '금지에 "들어간 자는 돌아오지 못한다"는 소문을 깔면 진입 자체가 긴장이 된다.' },
      { name: '강호 vs 묘당(廟堂)', desc: '재야의 강호와 조정·관부(묘당)의 두 세계. 관무불가침의 암묵 룰로 분리된다.', tip: '"강호의 일이 조정과 얽히는 순간" 판이 커진다. 황실 음모와 마교를 잇는 흑막도 단골.' },
      { name: '무국적 강호의 규칙', desc: '현실 지리·역사를 흐리고 강호 자체의 도의·서열·관습이 법이 되는 닫힌 세계.', tip: '강호 내부의 "불문율(은원필보, 관무불가침, 사문배신 금기)"을 헌법처럼 깔면 세계가 자립한다.' },
      { name: '연표·강호사(江湖史)', desc: '과거의 정사대전·마교 침공·전대 천하제일의 흥망. 현재의 은원을 설명하는 역사.', tip: '"지금의 원한은 수십 년 전 어떤 사건의 결과"로 깔면 복수극에 깊이가 생긴다.' },
    ],
  },
  {
    key: 'glossary', label: '용어·한자어', icon: '🈶', note: '무협 특유의 한자 용어. 그대로 쓰되 남발은 진입장벽이 되니 맥락으로 풀어주며 써라.',
    items: [
      { name: '강호(江湖)·무림(武林)', desc: '무공을 익힌 자들의 세계. 강호는 넓은 재야, 무림은 무인의 세계를 강조한다.', tip: '"강호에 나간다(出道)"가 곧 모험의 시작. 강호의 도의·은원이 모든 행동의 무대다.' },
      { name: '협(俠)·협의(俠義)', desc: '약자를 돕고 의를 행하는 무인의 도. "협지대자, 위국위민"으로 격상되기도.', tip: '"무공"이 능력이라면 "협"은 그 능력의 윤리. 협이 없으면 무뢰배일 뿐이다.' },
      { name: '은원(恩怨)·도의(道義)', desc: '은혜와 원한, 강호의 도리. 은원필보가 행동 원리.', tip: '인물의 "갚을 은혜·갚을 원한" 목록을 만들면 동기가 선명해진다.' },
      { name: '내공·공력·진기', desc: '몸에 쌓인 무공의 힘(내공·공력)과 그 실체(진기·진원진기).', tip: '"공력이 깊다/얕다"로 고수-하수의 격차를, "진기가 흩어진다"로 위기·부상을 표현한다.' },
      { name: '초식(招式)·심법(心法)', desc: '겉으로 드러나는 무공 동작(초식)과 그 근본 비결(심법).', tip: '"초식은 보여도 심법은 안 보인다" — 무공 도둑질·전수의 논리를 가르는 핵심 용어.' },
      { name: '검기·검강·강기(罡氣)', desc: '검에 실린 기(검기)와 그것이 응축·외화한 강(검강). 강기는 무형의 베기.', tip: '"기가 강이 되는 순간"이 절정고수의 증표. 색·형태로 시각화하라.' },
      { name: '경공·신법·보법', desc: '날듯이 빠른 이동(경공), 몸놀림(신법), 발놀림(보법).', tip: '추격·암살·회피 장면에서 이 셋의 우열이 곧 승부의 절반이다.' },
      { name: '주화입마·심마', desc: '진기 폭주로 인한 폐인·발광(주화입마)과 그 원인이 되는 마음의 마귀(심마).', tip: '성장의 리스크 용어. "무리하면 주화입마"라는 규칙이 도박적 긴장을 만든다.' },
      { name: '환골탈태·반로환동·등봉조극', desc: '근본이 바뀌는 변화(환골탈태), 젊음을 되찾음(반로환동), 정점에 오름(등봉조극).', tip: '경지 도약·전대고수 위상을 표현하는 격조 있는 용어들. 남용하면 무게가 가벼워진다.' },
      { name: '절정·화경·현경·생사경', desc: '경지의 위계 용어. 절정고수 위로 화경·현경·생사경(웹소설형 상한).', tip: '경지마다 "할 수 있는 일"을 구체화해 두면 결투의 격차가 설득력을 얻는다.' },
      { name: '비급·신병이기·영약', desc: '무공서(비급), 전설의 병기(신병이기), 내공 영약. 강호 쟁탈의 3대 보물.', tip: '세 보물 모두 "가진 자가 표적"이 되게 하면 획득이 곧 위기의 시작이 된다.' },
      { name: '만독불침·금나수·점혈', desc: '모든 독 면역(만독불침), 잡고 꺾는 무공(금나수), 혈을 짚는 점혈.', tip: '결투의 변수 용어. 정공법으로 못 이길 적을 잡는 "변칙"의 어휘로 활용하라.' },
    ],
  },
  {
    key: 'title', label: '호칭·관용 대사', icon: '🗣️', note: '인물의 신분·기질을 한마디로 각인하는 자칭·호칭·투식(套式) 대사. 그대로 복사해 쓰되 인물에 맞게 골라라.',
    items: [
      { name: '자칭: 소생(小生)·재하(在下)', desc: '젊은 서생·후배의 겸손한 자칭. 예의 바른 청년 무인.', tip: '"재하(在下) ○○○라 하오" — 정중한 통성명. 인물의 교양·겸손을 드러낸다.' },
      { name: '자칭: 노부(老夫)·노납(老衲)·빈도(貧道)', desc: '노인(노부), 승려(노납), 도사(빈도)의 자칭. 신분을 즉시 각인.', tip: '한 단어로 "이 사람은 늙은 고수/승려/도사"임을 알린다. 소림승=노납, 무당도사=빈도.' },
      { name: '자칭: 본좌(本座)·본교(本敎)', desc: '마교 교주·거대 세력 수장의 오만한 자칭. 위엄과 광기.', tip: '"본좌가…"로 시작하는 대사는 절대자의 위압을 즉시 깐다. 마교·사파 수장의 단골.' },
      { name: '경칭: 대협(大俠)·소협(少俠)·여협(女俠)', desc: '큰 협객(대협), 젊은 협객(소협), 여성 협객(여협)에 대한 존칭.', tip: '"소협, 검을 거두시오" — 상대를 협으로 인정하는 호칭은 강호적 예우의 표지다.' },
      { name: '경칭: 전배(前輩)·후배(後輩)', desc: '선배(전배)·후배의 강호 서열 호칭. 무공·연배의 위아래를 나눈다.', tip: '"전배의 가르침을 청합니다" — 강호의 위계·예의를 드러내는 핵심 호칭.' },
      { name: '호칭: 장문인·방주·교주·맹주', desc: '문파 수장(장문인), 방파 우두머리(방주), 마교 교주, 무림맹주.', tip: '직함으로 세력 내 위치를 즉시 알린다. 호칭 하나로 정치 구도를 그릴 수 있다.' },
      { name: '도발: "어디서 굴러먹던 애송이가"', desc: '하수가 고수를 못 알아보고 깔보는 전형 대사. 정체 폭로 직전의 빌드업.', tip: '"무시 → 압도 → 경악"의 사이다 사이클을 여는 단골 도발. 상대가 사실 절대고수일 때 통쾌하다.' },
      { name: '살의: "오늘 네놈의 명줄이 여기서 끊긴다"', desc: '결투·살수 직전의 선언. 위협과 비장함.', tip: '결투 개시의 신호탄. 대사 직후 "그러나—"로 반전(상대가 더 강함)을 거는 비틀기가 흔하다.' },
      { name: '결투: "이 한 수를 받아라!"·"검을 거두시오"', desc: '비장의 일격 선언, 혹은 결투를 멈추라는 만류·예우.', tip: '"이 한 수"는 절초의 신호. "검을 거두시오"는 협의 자비·화해의 손짓이다.' },
      { name: '작별: "강호에서 다시 봅시다"', desc: '기약 없는 강호인의 작별 인사. 떠돎·재회의 정서.', tip: '"강호는 넓고 좁다" — 헤어진 인물이 반드시 다시 얽히는 무협의 인연관을 함축한다.' },
      { name: '달관: "강호의 은원이란…"·"강호는 넓다"', desc: '인생·강호의 무상함을 읊는 노고수의 탄식.', tip: '귀은·달관의 정서를 담는 투식. 결말부·노고수의 회한에 잘 어울린다.' },
      { name: '예법: 포권(抱拳)·읍(揖)', desc: '한 손으로 주먹을 감싸 인사하는 포권, 두 손 모아 절하는 읍. 강호의 인사 동작.', tip: '대사 없이 "포권을 취했다"만으로 예의·신분·긴장 완화를 묘사할 수 있다.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰와 변주', icon: '🔁', note: '독자가 이미 아는 무협 관습. 인지하고 비틀어야 신선하다. (변주안 포함)',
    items: [
      { name: '절벽에서 떨어졌는데 안 죽고 기연', desc: '추락 → 비동 → 비급·영약. 무협 최강의 클리셰.', tip: '변주: 비급이 마공·함정 / 추락이 누군가의 설계 / 기연의 대가가 평생의 저주.' },
      { name: '폐기·무재 막내가 사실 천재·특이체질', desc: '무시받던 잡일제자가 천맥·구음절맥으로 각성.', tip: '변주: 체질이 양날(단명·폭주) / 사실은 남의 운명을 빼앗은 것 / 천재가 아니라 노력의 결과.' },
      { name: '객잔에서의 시비 → 정체 드러남', desc: '주막에서 깔보다가 상대의 정체가 폭로되는 사이다.', tip: '변주: 시비 거는 쪽이 함정·시험 / 정체를 끝까지 숨김 / 정체가 밝혀지자 더 큰 위기.' },
      { name: '비무대회 우승 → 미녀·세력의 주목', desc: '대회에서 두각 → 명성·인연·세력의 영입 제안.', tip: '변주: 우승이 표적이 됨 / 일부러 져서 정체를 숨김 / 우승 상품이 저주받은 신병.' },
      { name: '알고 보니 사부·적이 부모·혈육', desc: '최종보스·은인이 사실 혈연이라는 비극적 폭로(천룡팔부형).', tip: '변주: 혈연이 거짓 떡밥 / 혈육이지만 화해 불가 / 혈연을 알고도 베어야 하는 비극.' },
      { name: '죽기 직전 절대고수의 전수', desc: '단전 폐인·임종 직전의 전대고수가 무공을 물려줌.', tip: '변주: 전수가 영혼·기억까지 넘어옴 / 전대의 원수를 떠안음 / 전수받은 무공이 미완성.' },
      { name: '미녀의 호위·하룻밤 인연', desc: '미녀를 지키다 시작되는 인연(통속무협·야설록식).', tip: '변주: 미녀가 사실 고수·복수자 / 호위가 함정 / 인연이 강호의 정치로 비화.' },
      { name: '사문·가문 몰살 → 복수', desc: '문파·가족이 몰살당하고 살아남아 복수에 나선다.', tip: '변주: 복수 대상이 사실 피해자 / 몰살의 진범은 따로 / 복수의 끝에서 더 큰 적을 마주.' },
      { name: '정사대전·마교 침공', desc: '정파 연합 vs 마교의 천하대전으로 스케일이 폭발.', tip: '변주: 정파가 진짜 악 / 마교에도 협이 있다 / 외세 앞에 정사가 손잡음.' },
      { name: '천하제일 비급 쟁탈', desc: '절세 비급을 두고 온 강호가 피로 물든다.', tip: '변주: 비급이 미완·가짜 / 비급의 진짜 가치는 무공이 아님 / 가진 자가 저주받음.' },
      { name: '주화입마 → 폐인 → 재기', desc: '폭주로 폐인이 되었다가 기연으로 더 강하게 부활.', tip: '남발 주의 — 위기마다 재기하면 주화입마의 무게가 사라진다. 진짜 대가를 한 번은 남겨라.' },
      { name: '"강해진 회귀자가 무시당하다 압도"', desc: '웹소설 핵심 사이클. 회귀·각성한 강자가 도발받고 압도적으로 반격.', tip: '변주: 회귀로 약점도 노출됨 / 미래가 바뀌어 지식이 무용 / 무시한 자가 사실 더 큰 함정.' },
    ],
  },
  {
    key: 'web', label: '웹소설(회귀먼치킨)', icon: '📱', note: '화산귀환형 연재 문법. 회차당 1사이다, 미래 지식, 경악 리액션이 카타르시스의 핵심.',
    items: [
      { name: '초반 골든타임(1~3화)', desc: '회귀·각성 트리거, 주인공의 비범함, 첫 사이다를 즉시 제시.', tip: '"왜 이 무협을 봐야 하는가"를 3화 안에 답하라. 회귀 시점·동기를 빠르게 못 박아라.' },
      { name: '회차당 1 사이다', desc: '무시 → 증명 → 응징을 한 회 안에 닫는 통쾌함의 단위.', tip: '연재의 생명선. 긴 고구마 뒤에 짧고 강한 사이다를 터뜨려라.' },
      { name: '사이다 사이클(경악 리액션)', desc: '도발받음 → 얕보임 → 압도적 반격 → 주변의 경악. 마지막 "경악"이 핵심.', tip: '리액션 묘사(주변 고수·적의 경악·식은땀)가 카타르시스를 완성한다. 반격만큼 반응에 공을 들여라.' },
      { name: '회귀 미래 지식 우위', desc: '미래·강호의 흐름을 아는 회귀자가 사건을 선점·예방·이용.', tip: '"알기에 가능한 선택"이 우월감 대리만족. 단, 미래가 바뀌는 순간의 불안도 떡밥으로 깔아라.' },
      { name: '절단신공(클리프행어)', desc: '매 화 끝에 위기·반전·등장으로 다음 화를 부른다.', tip: '"그때, ○○가 나타났다—"로 절정 직전 끊어라. 결제·다음화 유도의 핵심.' },
      { name: '상태창·무공 수치화', desc: '경지·내공·무공을 상태창·수치·랭킹으로 명시화.', tip: '성장의 가시화는 강한 기대. 수치 상승에 서사적 의미(벽 돌파·깨달음)를 붙여라.' },
      { name: '계단식 파워업', desc: '새 지역 = 새 강적 = 새 무공의 반복 비트. 벽-돌파의 리듬.', tip: '천장을 한 번에 깨지 말고 단계별 벽을 둬라. 무적이 되면 긴장이 죽는다.' },
      { name: '전대고수 회귀(노고수 → 청년)', desc: '천하제일·전대 거두가 죽고 약자·청년 시절로 회귀(화산귀환형).', tip: '"노련한 정신 + 젊은 육신"의 괴리가 매력. 옛 무공·인맥·원한을 현재에 풀어낸다.' },
      { name: '몰락 문파·세가 재건', desc: '회귀자가 몰락한 사문·가문을 미래 지식으로 다시 일으킨다.', tip: '"내 손으로 다시 세운다"는 성장·소속의 카타르시스. 재건 과정에 방해·배신을 넣어라.' },
      { name: '고구마 빌런·악역 응징', desc: '독자를 답답하게 하는 악역을 쌓아 두었다가 통쾌하게 응징.', tip: '고구마가 너무 길면 하차한다. 응징의 타이밍·강도를 조절하라.' },
      { name: '먼치킨의 약점·조건', desc: '압도적 강함에 조건·약점·미완성을 두어 긴장과 성장 여지 확보.', tip: '"무적이지만 ○○ 앞에선 무력"이라는 단서가 무적 서사의 긴장을 살린다.' },
      { name: '파워 인플레 통제', desc: '주인공이 강해질수록 적도 강해지되 상한과 대가를 미리 설계.', tip: '경지 상한·강함의 비용을 처음부터 정해 후반 통제 불능을 막아라.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '🩸', note: '무협 정점의 문법. 초식 대 초식의 끝, 대가 지불, 정체·혈연 반전, 그리고 귀은의 여운.',
    items: [
      { name: '일대일 정점 대결', desc: '천하제일 결정전. 초식 대 초식의 끝에 마지막 한 수(절초·금기무공)로 승부.', tip: '그동안 쌓인 무공·심상·은원이 마지막 한 수에 응축되게 하라. 단순 힘겨루기를 넘어선다.' },
      { name: '고룡형 찰나의 한 수', desc: '길고 화려한 합 대신 정적·심리전 후 단칼로 끝내는 변주.', tip: '"검을 뽑기도 전에 승부가 났다" — 묘사를 줄이고 긴장을 극대화하는 결투법.' },
      { name: '합공·다대일의 역전', desc: '절대강자를 진법·연수합격(聯手合擊)·암기·자기희생으로 꺾는다.', tip: '무력 격차를 머리·협동·희생으로 뒤집는 카타르시스. 각자의 "한 방"을 아껴 두었다 합류시켜라.' },
      { name: '대가 지불형 승리(비극적 정점)', desc: '금기무공·반탄지력으로 이기되 단전 파괴·수명 소진·폐인. "이기고도 잃는" 정통 한무의 비극(서효원형).', tip: '공짜 승리는 가볍다. "무엇을 잃었는가"가 무협 정점의 무게를 만든다.' },
      { name: '정체·혈연 반전 결투', desc: '최종보스가 사부·혈육·은인이었다는 폭로와 겹친 결투(천룡팔부형).', tip: '혈연·은원의 폭로를 결투 한가운데 배치하면 무력전이 곧 비극이 된다.' },
      { name: '심마 극복(자기와의 결투)', desc: '외부의 적을 베기 전에 내면의 심마·마공의 유혹을 이겨내는 정점.', tip: '"진짜 적은 자기 자신" — 내면 클라이맥스를 외부 결투와 겹치면 깊이가 배가된다.' },
      { name: '천하대의 결착', desc: '개인 복수가 강호·국가의 운명과 겹치며 스케일이 폭발하는 정사대전·마교 침공의 결전.', tip: '"개인의 은원"과 "천하의 대의"가 한 점에서 만나게 설계하라.' },
      { name: '무초승유초의 깨달음', desc: '정형 초식을 버린 무도의 정점이 클라이맥스의 마지막 한 수가 된다.', tip: '주인공의 "도(道)"를 앞서 쌓아 두면, 초식을 버리는 순간이 필연적 깨달음이 된다.' },
      { name: '웹소설형 압도·등극', desc: '압도적 격차의 확인사살 + 적·군중의 경악 + 새 칭호·위상 획득.', tip: '쌓아온 모든 굴욕·떡밥을 한 번에 회수·응징하라. 등극·천하제일 선언으로 마무리.' },
      { name: '귀은(歸隱)·은거 엔딩', desc: '천하제일에 오른 뒤 모든 것을 버리고 강호를 떠나 은거하는 무협 특유의 결말.', tip: '"이겨서 다 가졌으되 다 버린다"는 달관·허무의 여운. 정통 무협이 가장 사랑하는 엔딩.' },
      { name: '복선·전대 떡밥 일괄 회수', desc: '심어둔 무공·신병·은원·정체가 결정타로 회수되어 카타르시스 극대화.', tip: '심은 총은 반드시 쏴라. 회수 없는 떡밥은 배신감을 준다.' },
    ],
  },
  {
    key: 'pitfall', label: '함정·작가 경고', icon: '⚠️', note: '무협 집필의 흔한 실패. 미리 알고 설계 단계에서 막아라.',
    items: [
      { name: '파워 인플레이션', desc: '경지를 끝없이 올려 후반에 긴장·스케일 통제 불능.', tip: '위계 상한과 "강함의 대가"를 미리 설계하라. 무적이 되면 모든 위협이 무의미해진다.' },
      { name: '기연 남발', desc: '위기마다 새 비급·영약으로 해결 → 성취의 무게 소실.', tip: '기연엔 반드시 대가·제약을. 결정적 성장은 "스스로 깨달은 한 수"로 닫아라.' },
      { name: '초식 작명 공허화', desc: '멋진 한자 이름만 나열하고 원리·전술·인과가 없다.', tip: '무공은 "원리·약점·상성"을 보여야 산다. 이름보다 "어떻게 통하고 막히는가"를 써라.' },
      { name: '한자 용어 남발(진입장벽)', desc: '독자가 모르는 한자어를 설명 없이 쏟아 진입을 막는다.', tip: '용어는 맥락·동작으로 풀어주며 도입하라. 첫 등장 시 한 번은 풀이를 곁들여라.' },
      { name: '정통형의 초반 수련 늪', desc: '수련·내공 묘사가 과다해 초반 페이싱이 느려진다.', tip: '수련은 "변화·갈등"이 있을 때만 길게. 단순 반복 수련은 압축·생략하라.' },
      { name: '웹소설형 사이다 남발', desc: '응징·역전을 남발해 긴장이 사라지고 통쾌함이 무뎌진다.', tip: '고구마-사이다 리듬을 둬라. 모든 회차가 압승이면 카타르시스가 마비된다.' },
      { name: '복수만 있고 협이 없음', desc: '개인 복수에만 머물러 협의 윤리·천하대의로 확장되지 않는다.', tip: '"복수의 끝에서 무엇을 보는가"를 물어라. 협이 없으면 무뢰배의 살육극일 뿐이다.' },
      { name: '데우스 엑스 마키나', desc: '마지막에 새 무공·우연으로 해결 → 복선 없는 해결의 허무.', tip: '해결의 모든 재료(무공·신병·인연)는 클라이맥스 이전에 등장해 있어야 한다.' },
      { name: '여성 인물의 도구화', desc: '미녀·연인을 보상·납치 대상으로만 소비(통속무협의 함정).', tip: '진산 이후의 무협처럼 여성 인물에게 독립된 욕망·무공·서사를 줘라.' },
      { name: '톤 혼선(사실계/선협계)', desc: '인간 한계를 지키다 갑자기 비검·도술이 나와 일관성이 깨진다.', tip: '초반에 "이 세계의 무공이 닿는 한계"를 못 박고 끝까지 지켜라.' },
      { name: '강호 질서의 비일관', desc: '서열·세력·불문율이 장면마다 바뀌어 세계가 흔들린다.', tip: '강호의 불문율(은원필보·관무불가침 등)을 헌법처럼 정해 두고 위반엔 대가를 부과하라.' },
    ],
  },
  {
    key: 'sensory', label: '감각·묘사 소재', icon: '🌫️', note: '무협 장면을 살리는 구체적 감각·분위기 소재. 결투·기연·강호의 풍경을 실감 나게.',
    items: [
      { name: '결투의 기세(검기·살기)', desc: '검을 뽑기 전 피어오르는 살기, 마주친 시선의 압박, 공기가 무겁게 짓눌리는 기세.', tip: '베기 전 "기세 싸움"을 먼저 묘사하면 고룡식 정적의 긴장이 산다.' },
      { name: '내공 운용의 감각', desc: '단전에서 끌어올린 진기가 경맥을 도는 뜨거움, 손끝에 응축되는 검기, 운기 중의 이명.', tip: '내공을 "보이지 않는 흐름"으로 감각화하면 무공이 추상이 아니라 실체가 된다.' },
      { name: '병기의 묘사', desc: '검신을 타고 흐르는 달빛, 도(刀)의 묵직한 바람소리, 신병의 서늘한 검명(劍鳴).', tip: '신병은 "소리·빛·온도"로 존재감을 줘라. 검이 울면 고수가 깬 것이다.' },
      { name: '경공·신법의 잔상', desc: '눈을 밟아도 자국이 없고(답설무흔), 잔상만 남기고 사라지는 이형환위, 처마를 차고 나는 몸짓.', tip: '속도를 "잔상·바람·먼지 한 점 없음"으로 그리면 경공의 격차가 시각화된다.' },
      { name: '비동·고묘의 분위기', desc: '먼지 덮인 백골과 빛바랜 비급, 천 년 묵은 한기, 벽에 새겨진 전대고수의 유언.', tip: '"한때 절대였으나 지금은 백골"의 대비로 기연에 시간의 무게를 입혀라.' },
      { name: '객잔·저잣거리 풍경', desc: '술 데우는 김, 점소이의 외침, 탁자를 내리치는 소리, 칼자루에 슬며시 가는 손.', tip: '평범한 소란 속의 "한순간의 긴장(칼자루로 가는 손)"이 곧 시비·결투의 전조다.' },
      { name: '주화입마의 묘사', desc: '핏발 선 눈, 역류하는 진기로 터지는 경맥, 입가의 검은 피, 통제 잃은 광소.', tip: '주화입마를 "고통의 디테일"로 그려야 성장의 대가가 실감 난다.' },
      { name: '강호의 자연(설산·강호)', desc: '검을 시리게 하는 설산의 바람, 안개 낀 장강의 새벽, 협곡을 울리는 검명의 메아리.', tip: '자연을 결투·수련의 무대로 쓰면 "환경 자체가 적·시련"이 된다.' },
      { name: '무복·외양', desc: '바람에 나부끼는 백의(白衣), 핏물이 밴 흑포, 백발과 동안의 괴리, 허리에 찬 호리병.', tip: '복색(백의=정파·고고, 흑포=사파·마교)으로 정체·진영을 한눈에 각인하라.' },
      { name: '비무대회의 열기', desc: '비무대를 둘러싼 군중의 함성, 흩날리는 깃발, 패배자의 피, 침묵을 가르는 새 도전자의 등장.', tip: '"군중의 반응"을 묘사하면 결투의 무게·서열의 무대화가 살아난다.' },
    ],
  },
]

// 관련 도구(연계) — 무협 세계관·인물·생물·작명·시스템 설계 도구로 잇는다(레지스트리 실재 id 기준).
const RELATED: { id: string; label: string }[] = [
  { id: 'world-wiki', label: '🌐 세계관 위키' },
  { id: 'setting-bible', label: '📔 배경 설정집' },
  { id: 'faction-builder', label: '⚔️ 세력 설계기' },
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
  { id: 'conflict-builder', label: '⚔️ 갈등 설계기' },
  { id: 'culture-builder', label: '🏺 문화 설계기' },
  { id: 'name-mixer', label: '🔤 이름 믹서' },
  { id: 'genre-conventions', label: '📐 장르 관습 체크리스트' },
]

const LS = 'sry:tool:wuxia-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function WuxiaKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 무협 전용 사전임을 안내.
  const ctxGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : undefined

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 항목 키 집합 ("catKey::name")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기 ("catKey::name")
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 상태 잔여 타이머/표시 정리
  useEffect(() => () => { setToast(null); setCopiedKey(null); setRandom(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const key = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[key(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (item.tip || '').toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key)
        pick = pool[Math.floor(Math.random() * pool.length)]
      // 무작위로 뽑은 항목은 펼쳐 둔다
      setOpen((o) => ({ ...o, [key(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setOpen((o) => ({ ...o, [k]: !o[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }
  const itemText = (c: CatDef, item: Entry) =>
    `${c.icon} ${c.label} · ${item.name}\n${item.desc}` + (item.tip ? `\n[활용] ${item.tip}` : '')

  const showToast = (msg: string, keyword: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t && t.includes(keyword) ? null : t)), 2200)
  }

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈무협 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '무협 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '무협', 분류: c.label },
    })
    if (id) showToast(`프로젝트 자료 〈무협 지식〉에 ‘${item.name}’을(를) 추가했습니다.`, item.name)
  }

  // 연계: 현재 항목을 공유 라이브러리(스니펫 글감)에 저장 → 다른 도구와 자동 연계.
  const saveSnippet = (c: CatDef, item: Entry) => {
    addToLibrary('snippets', {
      text: itemText(c, item),
      source: '무협 지식 사전',
      tags: ['무협', c.label, item.name],
    })
    showToast(`글감(스니펫)으로 ‘${item.name}’을(를) 저장했습니다.`, item.name)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }

  const curCatNote = cat !== ALL_KEY ? CATS.find((c) => c.key === cat)?.note : undefined

  return (
    <div style={wrap}>
      <div style={hint}>
        무협 장르에서 자주 쓰는 소재·설정·고증 지식 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 장면에 심어 보세요.
        {ctxGenre && ctxGenre !== '무협' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 무협 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 내공, 기연, 마교, 회귀, 주화입마)"
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
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 소재</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {curCatNote && (
        <div style={{ ...hint, fontStyle: 'italic', borderLeft: '3px solid var(--accent)', paddingLeft: 8 }}>{curCatNote}</div>
      )}

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent)' }}><Emoji e="💡" /> {random.item.tip}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[key(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)} title="이 소재를 글감(스니펫)으로 저장"><Emoji e="💾" /> 글감 저장</button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈무협 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 (펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = key(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'it:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲ 접기' : '▼ 펼치기'}</span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                )}
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55 }}>{item.desc}</div>
                    {item.tip && (
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--accent)' }}><Emoji e="💡" /> {item.tip}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => setRandom({ cat: c, item })} title="이 소재를 강조 보기"><Emoji e="🔎" /> 강조 보기</button>
                      <button className="minibtn" onClick={() => saveSnippet(c, item)} title="이 소재를 글감(스니펫)으로 저장"><Emoji e="💾" /> 글감 저장</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈무협 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                        <Emoji e="📄" /> 프로젝트에 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 관련 도구 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '무협' })} title={`${r.label} 열기`}>
            {emojify(r.label)}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 클리셰는 알고 비틀고, 무공엔 원리·약점·상성을, 성장엔 대가를 붙여 보세요.</div>
    </div>
  )
}
