// 무협 시그니처 생성기(대형 조합) — 무협의 심장인 '무공(武功)·초식(招式)' 한 벌을 통째로 빚어내는 대형 생성기.
//   14개 슬롯(무공명·계보·유파/문파·속성·병기·핵심 초식·절초(필살기)·심법·내공 경지·발동 조건·부작용·대가/금기·강호 위상·시그니처 한 줄) ×
//   유파 기조 5종 → 잠금(🔒)/부분 재생성(🎲) + 총 조합수 표시(1조 이상). 무협 도시에(무공의 원리·약점·상성, 대가 있는 성장, 경지 위계)에 근거.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(잠금/마지막 결과)만 사용. 언마운트 정리.
// 연계(linkbus): 빚어낸 무공을 프로젝트 자료 〈무공〉 폴더에 메모로 추가 · 스니펫 라이브러리 저장 · 관련 도구 열기.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'wuxia-signature', name: '무공·초식 시그니처 생성기', icon: '🗡️', group: '생성기', genre: '무협', intro: '무공 이름·유파·속성·초식·절초·심법·경지·대가까지 무공 한 벌을 통째로 빚어냅니다', w: 580, h: 700 }

const LS = 'sry:tool:wuxia-signature'

// ---------- 슬롯 풀(로컬·무협 특화) ----------
// 각 슬롯은 충분히 다양하게(무협 도시에 6항 '용어 사전' / 3항 '서사 장치' / 5항 '클라이맥스' 근거).
// 조합수 = 모든 슬롯 풀 길이의 곱 × 기조 수 → 1조(10^12) 이상 보장.
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'name', label: '무공명', icon: '📜', hint: '이 무공의 정식 명칭(神功·秘笈)',
    pool: [
      '천마군림보(天魔君臨步)', '구음진경(九陰眞經)', '태청신공(太淸神功)', '파천십삼검(破天十三劍)',
      '혈마대법(血魔大法)', '무극혜검(無極慧劍)', '낙뢰도법(落雷刀法)', '소요유보(逍遙遊步)',
      '대라천강수(大羅天罡手)', '백보신권(百步神拳)', '현천검결(玄天劍訣)', '북명신공(北冥神功)',
      '만천화우(滿天花雨)', '벽력장(霹靂掌)', '유성추혼(流星追魂)', '한빙진기(寒氷眞氣)',
      '금강불괴신법(金剛不壞身法)', '암향표(暗香飄)', '천뢰무상검(天雷無上劍)', '귀곡혈영도(鬼哭血影刀)',
      '운룡대팔식(雲龍大八式)', '청풍십이검(淸風十二劍)', '멸절심공(滅絶心功)', '광룡파천황(狂龍破天荒)',
    ],
  },
  {
    key: 'lineage', label: '계보', icon: '🧭', hint: '어느 무협 계보의 결인가(도시에 1항)',
    pool: [
      '김용형 정통대협 — 협의 대자(俠之大者), 위국위민의 무게',
      '고룡형 낭인추리 — 한 수에 승부, 고독한 검객의 분위기',
      '한무 신무협(좌백·용대운) — 캐릭터 내면·문체, 기상천외한 상상력',
      '웹소설 회귀먼치킨(화산귀환형) — 미래 지식 + 압도적 성장 + 경악 리액션',
      '선협·구파(촉산검협전형) — 비검(飛劍)·법보·검선(劍仙)의 환상',
      '서효원형 비극 — 이기고도 잃는, 대가 지불형 천재의 무공',
    ],
  },
  {
    key: 'school', label: '유파·문파', icon: '🏯', hint: '구파일방·세가·마교(도시에 7항)',
    pool: [
      '소림(少林) — 외문무공·금강·항마(降魔)의 정종', '무당(武當) — 도가 유(柔)·태극·이유극강(以柔克剛)',
      '화산(華山) — 검종·기종, 매화(梅花) 검법의 명문', '아미(峨嵋) — 불도 겸수, 여협의 정파',
      '곤륜(崑崙) — 운룡대팔식과 표묘(縹緲)한 검', '점창(點蒼) — 사일검법(射日劍法)·쾌검',
      '청성(靑城) — 청봉(靑蜂)·녹수 검의 사천 일맥', '종남(終南)·공동(崆峒) — 복마검·복호권의 노장 문파',
      '개방(丐幇) — 천하 정보망, 항룡십팔장·타구봉법', '남궁세가(南宮世家) — 제왕검형(帝王劍形)의 검가',
      '사천당문(四川唐門) — 암기·독(毒)·기관(機關)의 패도', '제갈세가(諸葛世家) — 진법·지략·기문둔갑',
      '모용세가(慕容世家) — 이피지도환시피신(以彼之道還施彼身)', '황보세가(皇甫世家) — 강맹한 권각·역발산의 가풍',
      '마교·천마신교(天魔神敎) — 천마를 받드는 마도의 종주', '혈교(血敎)·살막(殺幕) — 살수와 사공(邪功)의 어둠',
      '새외(塞外)·서장 밀교 — 라마승의 대수인·환술', '북해빙궁(北海氷宮) — 한빙(寒氷)의 새외 일맥',
      '녹림(綠林)·장강수로채 — 산채와 수채의 흑도 강호', '무소속 낭인(浪人) — 어느 문파에도 매이지 않은 야생',
    ],
  },
  {
    key: 'nature', label: '속성', icon: '☯️', hint: '무공의 결(강맹/유연/사악/정종)',
    pool: [
      '강맹패도(剛猛霸道) — 한 수에 산을 쪼개는 양강(陽剛)', '유연쾌속(柔軟快速) — 사이를 파고드는 유(柔)와 쾌(快)',
      '사악음험(邪惡陰險) — 흡정·이혼(離魂)의 사도(邪道)', '정종광명(正宗光明) — 사기(邪氣)를 누르는 호연정기',
      '음유(陰柔) — 솜에 바늘을 감춘 내가중수(內家重手)', '극한(極寒) — 진기마저 얼리는 한음(寒陰)의 빙공',
      '극양(極陽) — 만물을 태우는 화공(火功)·작렬', '쾌검일섬(快劍一閃) — 보이지 않는 빠르기의 발검술',
      '중검대도(重劍大刀) — 무겁고 단순해 도리어 깨지지 않는 박(樸)', '환변무상(幻變無常) — 허실(虛實)이 끝없이 뒤바뀌는 변화',
      '독공겸수(毒功兼修) — 독과 암기를 무리(武理)에 녹인 패', '내력심후(內力深厚) — 깊은 내공으로 누르는 정공(正功)',
    ],
  },
  {
    key: 'weapon', label: '병기·발현', icon: '⚔️', hint: '검·도·권·장·암기 등 발현 형태',
    pool: [
      '검(劍) — 군자의 병기, 베기보다 찌름의 영(靈)', '도(刀) — 백병의 으뜸, 한 칼의 패도',
      '권(拳)·장(掌) — 맨손의 내가권, 격공(隔空)의 장력', '지(指) — 일지(一指)에 점혈, 격산타우의 지법',
      '창(槍)·곤(棍) — 백병의 왕, 일촌장 일촌강', '편(鞭)·연검(軟劍) — 허리에 감았다 풀어내는 변칙',
      '암기(暗器) — 비도·독침·만천화우의 당문 절기', '쌍병(雙兵) — 쌍검·쌍도, 좌우가 다른 결로 합격',
      '도검 없이 검기(劍氣)만으로 — 어검(御劍)·이기어검(以氣御劍)', '판관필·철선(鐵扇) — 문사풍 기병(奇兵)',
      '채찍 같은 발경(發勁) — 병기 대신 보법과 신법으로 제압', '비검(飛劍)·법보 — 선협계의 어검비행(御劍飛行)',
    ],
  },
  {
    key: 'opening', label: '핵심 초식', icon: '🌀', hint: '대표 초식(招式)의 이름과 결',
    pool: [
      '매화삼롱(梅花三弄) — 한 호흡에 세 번 변화하는 검', '운룡출해(雲龍出海) — 솟구치며 베어 올리는 일격',
      '낙화유수(落花流水) — 흩날리듯 빈틈을 메우는 연검', '벽해조생(碧海潮生) — 파도처럼 끝없이 밀려드는 장',
      '풍권잔운(風卷殘雲) — 휘몰아 적의 초식을 흩는 쾌검', '천외비선(天外飛仙) — 예측 불가의 각도로 떨어지는 한 수',
      '항룡유회(亢龍有悔) — 나아감에 물러섬을 품은 강맹의 장', '비룡재천(飛龍在天) — 위에서 내리꽂는 천근의 도법',
      '암향소영(暗香疎影) — 향만 남기고 사라지는 신법형 검', '회풍무류(回風舞柳) — 되돌아치는 반탄(反彈)의 묘',
      '단장혼(斷腸魂) — 급소만 노리는 살수의 한 초', '천산육양(天山六陽) — 여섯 갈래로 펼쳐지는 장풍',
      '무영각(無影脚) — 보이지 않는 발차기, 하체의 변칙', '격산타우(隔山打牛) — 외피를 지나 내장을 치는 내가공',
      '횡소천군(橫掃千軍) — 한 번에 전열을 쓸어버리는 광역', '점혈수(點穴手) — 혈도를 짚어 봉쇄하는 제압술',
    ],
  },
  {
    key: 'finisher', label: '절초(필살)', icon: '💥', hint: '마지막 한 수·금기무공(클라이맥스용)',
    pool: [
      '최후의 한 수 — 단전을 태워 펼치는 동귀어진(同歸於盡)의 일격',
      '금기절초 — 쓰는 순간 수명이 십 년 깎이는 반탄지력(反彈之力)',
      '심상(心象)의 검 — 의(意)가 곧 형(形)이 되어 무형으로 베는 무초승유초(無招勝有招)',
      '검강(劍罡) — 검기를 넘어 응결시킨, 바위를 두부처럼 가르는 강기(罡氣)',
      '천마강림(天魔降臨) — 이성을 내주고 마(魔)를 받아들여 폭발하는 마공의 정점',
      '일검광한(一劍光寒) — 찰나에 십삼 주(州)를 비추는, 고룡식 단 한 칼',
      '만검귀종(萬劍歸宗) — 흩뿌린 검기를 한 점으로 거두어 꿰뚫는 절기',
      '항마진언(降魔眞言) — 불력(佛力)으로 사기(邪氣)를 짓누르는 정종의 마지막 패',
      '흡성대법(吸星大法) — 적의 내공을 통째로 빨아들이는, 인간성을 갉는 금공',
      '환골탈태(換骨奪胎)의 일초 — 죽음 직전 경지를 돌파하며 터뜨리는 진각성의 검',
      '연수합격(聯手合擊) — 동료의 진기를 빌려 하나로 합치는 합공의 절정',
      '심검(心劍) — 살의(殺意) 없이 의지만으로 상대의 전의를 꺾는 무위(無爲)의 검',
    ],
  },
  {
    key: 'heart', label: '심법(心法)', icon: '🫀', hint: '내공을 쌓는 토대(도시에 3항)',
    pool: [
      '운기조식(運氣調息)으로 단전에 진기를 차곡차곡 쌓는 정종 심법',
      '기경팔맥(奇經八脈)을 뚫어 임독양맥(任督兩脈)을 관통시키는 환골(換骨)의 구결',
      '호흡마다 천지의 기운을 끌어들이는 토납(吐納)의 비전',
      '음양을 한 단전에 공존시키는, 주화입마를 무릅쓴 역행(逆行)의 심법',
      '잡념을 비워 심마(心魔)를 다스리는 무념무상(無念無想)의 좌선(坐禪)',
      '타인의 내공을 흡수해 제 것으로 바꾸는 흡정(吸精)의 사도 심법',
      '극한의 한기를 단전에 가두어 운용하는 한빙(寒氷)의 토대',
      '검과 마음을 하나로 잇는 검심합일(劍心合一)의 의념(意念) 수련',
      '내단(內丹)·영약의 기운을 단전에 녹여 단숨에 끌어올리는 흡수형 구결',
      '회귀 전 기억으로 가장 빠른 길만 골라 쌓는, 시간을 앞당긴 운공(運功)',
    ],
  },
  {
    key: 'tier', label: '내공 경지', icon: '🪜', hint: '강함을 가시화하는 위계(도시에 6항)',
    pool: [
      '삼류·이류 — 외공만 익힌 무명소졸의 단계', '일류고수 — 한 지방을 호령하는 검·도의 명숙',
      '절정고수 — 검기(劍氣)를 자유로이 뽑아내는 일파의 기둥', '초절정 — 검강(劍罡)을 이루어 강호 서열에 오른 패자',
      '화경(化境) — 의(意)대로 기(氣)가 움직이는, 자연과 합치된 경지', '현경(玄境) — 형(形)을 벗어나 만물의 이치에 닿은 초인',
      '생사경(生死境) — 삶과 죽음의 경계를 넘나드는 전설의 영역', '반로환동(返老還童) — 늙음을 되돌린, 사람이되 사람을 넘은 존재',
      '등봉조극(登峰造極) — 한 무공의 극한에 다다라 더 오를 곳 없는 정점', '천하제일인(天下第一人) — 당대에 적수가 없는 무림지존',
      '무림맹주급 정파 거두 — 명망과 무공을 겸비한 무게', '마교 천마(天魔)급 — 사도(邪道)의 정점에 선 절대자',
    ],
  },
  {
    key: 'trigger', label: '발동·운용', icon: '⚡', hint: '실전에서 어떻게 펼치는가',
    pool: [
      '한 호흡(一息)에 진기를 단전에서 끌어올려 단숨에 쏟아붓는다',
      '상대의 초식을 받아넘긴 그 반탄력으로 되받아친다(차력타력)',
      '경공·보법으로 사각(死角)을 파고든 뒤 급소를 짚는다',
      '내력을 병기 끝에 모아 검기·도기로 응결시켜 격공(隔空)으로 친다',
      '허초(虛招)로 상대의 방어를 끌어낸 뒤 진초(眞招)로 빈틈을 꿰뚫는다',
      '점혈(點穴)로 상대의 혈도를 봉쇄해 움직임 자체를 멈춘다',
      '독·암기를 무공 사이에 섞어 정면 무력의 변수를 만든다',
      '진법(陣法) 안으로 적을 유인해 다수로 고수를 가둔다',
      '심마를 의지로 억누른 채 마공의 폭발력만 잠깐 빌려 쓴다',
      '죽음의 문턱을 한 번 넘었다 돌아오는 순간 진각성으로 발동한다',
    ],
  },
  {
    key: 'side', label: '부작용', icon: '🩸', hint: '몸·정신에 남는 흔적(주화입마·심마)',
    pool: [
      '무리하게 운공하면 진기가 역류해 주화입마(走火入魔)로 폐인이 된다',
      '쓸수록 심마(心魔)가 자라 점차 살의와 광기에 잠식된다',
      '한기가 단전에 쌓여 손발이 시퍼렇게 얼고 감각이 무뎌진다',
      '발동 후 며칠은 기진(氣盡)하여 내공을 끌어 쓸 수 없다',
      '경맥이 손상되어 각혈하고, 무리하면 단전에 금이 간다',
      '흡수한 타인의 내공이 이질적으로 날뛰어 정신을 갉아먹는다',
      '눈이 핏빛으로 물들고 살기가 새어 나와 주변이 그를 두려워한다',
      '한 번 펼칠 때마다 수명이 눈에 띄게 줄어든다',
      '극양의 기운이 몸을 태워 고열과 환각에 시달린다',
      '의(意)를 과하게 쓰면 정신이 탈진해 한동안 멍하니 넋을 잃는다',
    ],
  },
  {
    key: 'cost', label: '대가·금기', icon: '⚖️', hint: '얻는 대신 치르는 값(도시에 8항 함정 대비)',
    pool: [
      '익히려면 먼저 단전을 비워 기존 내공을 모두 버려야 한다',
      '경지를 올릴 때마다 인간적인 정(情) 하나를 끊어야 한다',
      '비급의 마지막 장(章)은 일부러 비워져 있어 스스로 깨쳐야 한다',
      '사문(師門)의 허락 없이 익히면 배사(背師)의 죄로 추격당한다',
      '극성에 이르면 인간성을 잃고 마인(魔人)이 되는 트레이드오프',
      '한 번 절초를 쓰면 한동안 그 무공이 봉인되어 다시 못 쓴다',
      '대가로 가장 사랑하는 이를 끝내 지키지 못하는 비극을 품는다',
      '익히는 자는 반드시 동정(童貞)이거나 특정 체질이어야 한다',
      '내공을 빌린 만큼 빚처럼 ‘대가의 날’이 적립되어 언젠가 갚는다',
      '천하에 둘도 없는 신병이기(神兵利器)가 있어야만 완성된다',
      '익힌 사실이 알려지면 비급 쟁탈전의 표적이 되어 강호 전체가 적이 된다',
      '이기고도 단전이 부서져 폐인이 되는, ‘이기고도 잃는’ 승리',
    ],
  },
  {
    key: 'status', label: '강호 위상', icon: '🏛️', hint: '이 무공을 익힌 자의 강호 내 위치',
    pool: [
      '천하제일을 다투는 비급으로, 가진 것만으로 표적이 된다',
      '정파 명문의 진산절학(鎭山絶學) — 장문인만 온전히 전수받는다',
      '마교 호교신공(護敎神功) — 교주에게만 허락된 금단의 힘',
      '실전(失傳)되어 강호의 전설로만 떠도는 잃어버린 절기',
      '사파에서 금기로 지목해 익힌 자를 공적(公敵)으로 추살하는 사공',
      '세가의 비전(祕傳)으로 가문 밖으로 새 나가면 안 되는 가전무공',
      '시정잡배가 익힌 줄 알았으나 알고 보니 절세신공의 진본',
      '낭인이 우연히 얻은 잔결본(殘缺本) — 절반뿐이라 위험을 안고 쓴다',
      '비무(比武)·논검 대회에서 천하에 처음 드러나 강호를 뒤흔든다',
      '관무불가침(官武不可侵)의 암묵을 깨고 황실까지 탐내는 힘',
      '회귀자가 미래의 절학을 미리 익혀, 아직 세상에 없는 무공',
    ],
  },
  {
    key: 'signame', label: '시그니처 한 줄', icon: '✨', hint: '이 무공을 한 문장으로 각인',
    pool: [
      '“한 수에 천하가 갈린다.”', '“이 검은 사람을 베지 않고 마음을 벤다.”',
      '“강호의 은원(恩怨)은 이 한 칼로 끊는다.”', '“노부(老夫)의 마지막 한 초를 받아라.”',
      '“검을 거두시오 — 다음 수는 그대 목숨이오.”', '“보이지 않는 빠르기, 그것이 곧 죽음이다.”',
      '“이기되 모든 것을 잃는, 그런 무공이다.”', '“천마(天魔)가 강림하면 정사(正邪)가 무릎 꿇는다.”',
      '“초식은 잊어라. 마음이 곧 검이 된다.”', '“이 한 수에 십 년의 수명을 건다.”',
      '“회귀 전 그날, 나는 이 무공으로 죽었다.”', '“산을 쪼개고 강을 가르는 데 두 번은 필요 없다.”',
      '“독과 암기는 비겁이 아니라 또 다른 무리(武理)다.”', '“약자였던 내가, 이제 강호의 정점에 선다.”',
    ],
  },
]

// 조합을 한 번 더 갈래내는 ‘유파 기조’(같은 슬롯 조합도 기조에 따라 결이 달라진다 → 조합수에 포함)
interface Tone { key: string; label: string; desc: string }
const TONES: Tone[] = [
  { key: 'jeong', label: '정파 정종', desc: '호연정기·협의(俠義) 중심 — 무공의 도(道)와 절제, 사기(邪氣)를 누르는 광명의 결.' },
  { key: 'sa', label: '사파·낭인', desc: '실리와 변칙 — 독·암기·기습도 무리(武理)로 보는 잿빛 강호의 생존술.' },
  { key: 'ma', label: '마교 마도', desc: '대가를 치르고 압도하는 마공 — 강함과 인간성의 트레이드오프, 천마의 패도.' },
  { key: 'go', label: '고룡 낭만', desc: '단문·분위기·한 수 승부 — 결투를 찰나로 압축한 고독한 검객의 미학.' },
  { key: 'web', label: '웹소설 회귀먼치킨', desc: '회귀·미래지식·먼치킨 — 도발→압도→경악 리액션의 사이다 리듬.' },
]

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => {
  // 1조 이상은 한국어 ‘조/억’ 단위로 가독성 있게 표기
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  return n.toLocaleString('ko-KR')
}

// 총 조합수 = 모든 슬롯 풀 길이의 곱 × 기조 수. (곱만 계산해 부동소수 영향 최소화)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1) * TONES.length

// HTML 이스케이프(프로젝트 본문 안전화 — & < > 필수)
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Picks = Record<string, string>

export default function WuxiaSignature({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Picks>({})
  const [toneKey, setToneKey] = useState<string>(TONES[0].key)
  const [toneLocked, setToneLocked] = useState(false)
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // payload.genre / payload.tone 활용 — 다른 도구에서 컨텍스트를 넘겨받으면 기조 기본값을 맞춰 준다.
  useEffect(() => {
    const g = String(payload?.genre ?? '') + ' ' + String(payload?.tone ?? '')
    if (/웹소설|회귀|환생|먼치킨|화산귀환|시스템/.test(g)) setToneKey('web')
    else if (/마교|마도|마공|천마/.test(g)) setToneKey('ma')
    else if (/사파|낭인|흑도|살수/.test(g)) setToneKey('sa')
    else if (/고룡|낭만|추리/.test(g)) setToneKey('go')
    else if (/정파|정종|협의/.test(g)) setToneKey('jeong')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마지막 결과/잠금 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as { picks?: Picks; toneKey?: string; locked?: Record<string, boolean>; toneLocked?: boolean }
        if (p.picks && typeof p.picks === 'object') {
          const valid: Picks = {}
          SLOTS.forEach((s) => { if (typeof p.picks![s.key] === 'string') valid[s.key] = p.picks![s.key] })
          if (Object.keys(valid).length) setPicks(valid)
        }
        if (typeof p.toneKey === 'string' && TONES.some((t) => t.key === p.toneKey)) setToneKey(p.toneKey)
        if (p.locked && typeof p.locked === 'object') setLocked(p.locked)
        if (typeof p.toneLocked === 'boolean') setToneLocked(p.toneLocked)
      }
    } catch { /* ignore */ }
  }, [])

  // 결과/잠금 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ picks, toneKey, locked, toneLocked })) } catch { /* ignore */ }
  }, [picks, toneKey, locked, toneLocked])

  // 첫 진입 시 한 번 굴려 빈 상태 방지
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      const next: Picks = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setPicks(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(() => setSpinning(false), 380)
    return () => window.clearTimeout(t)
  }, [spinning, picks])

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const generate = useCallback(() => {
    setCopied(false); setSaved(false)
    setSpinning(true)
    setPicks((prev) => {
      const next: Picks = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 동일 완화
        next[s.key] = v
      })
      return next
    })
    if (!toneLocked) {
      setToneKey((cur) => {
        let t = pick(TONES.map((x) => x.key))
        if (t === cur && TONES.length > 1) t = pick(TONES.map((x) => x.key))
        return t
      })
    }
  }, [locked, toneLocked])

  const rollOne = (key: string) => {
    setCopied(false); setSaved(false)
    setPicks((prev) => {
      const s = SLOTS.find((x) => x.key === key)!
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const ready = SLOTS.every((s) => picks[s.key])
  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 텍스트 요약(복사·스니펫용)
  const summaryText = () => {
    if (!ready) return ''
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${picks[s.key]}`)
    return [
      `【무공 시그니처】 ${picks.name}  (유파 기조: ${tone.label})`,
      ...lines,
      ``,
      `${picks.signame}`,
      `※ ${tone.desc}`,
    ].join('\n')
  }

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(summaryText()).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('클립보드 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(영감 메모로 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: summaryText(),
      source: '무공·초식 시그니처 생성기',
      tags: ['무협', '무공', '초식', tone.label, picks.name],
    })
    setSaved(true); window.setTimeout(() => setSaved(false), 1500)
    flash('스니펫 라이브러리에 무공을 저장했습니다.')
  }

  // 프로젝트 자료 〈무공〉 폴더에 메모로 추가 — 시그니처 + 슬롯 분해(설정 설계용)
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b> <span style="color:#888;">(${escHtml(s.hint)})</span><br/>${escHtml(picks[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:18px;"><b>🗡️ ${escHtml(picks.name)}</b></p>`,
      `<p style="font-size:14px;color:#666;font-style:italic;">${escHtml(picks.signame)}</p>`,
      `<p style="color:#888;">유파 기조 — <b>${escHtml(tone.label)}</b> · ${escHtml(tone.desc)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '무공',
      title: `🗡️ ${picks.name} (${tone.label})`,
      bodyHtml,
      synopsis: `${picks.school} · 속성: ${picks.nature} · 절초: ${picks.finisher}`.slice(0, 140),
      meta: {
        기조: tone.label, 계보: picks.lineage, 문파: picks.school, 속성: picks.nature,
        병기: picks.weapon, 경지: picks.tier, 절초: picks.finisher, 대가: picks.cost,
      },
      // 받는 허브(배경 설정집)에서 제자리 매핑되도록 정규(장소) 키로 카드 필드 채움(기존 키는 유지)
      character: {
        name: picks.name,
        kind: picks.school,
        atmosphere: `${tone.label} · ${tone.desc}`,
        appearance: `${picks.weapon} · 핵심 초식: ${picks.opening} · 절초: ${picks.finisher}`,
        sensory: `${picks.nature} · 발동·운용: ${picks.trigger}`,
        history: `계보: ${picks.lineage} · 심법: ${picks.heart}`,
        culture: `심법: ${picks.heart} · 강호 위상: ${picks.status}`,
        rules: `발동·운용: ${picks.trigger} · 대가·금기: ${picks.cost}`,
        dangers: `부작용: ${picks.side} · 대가·금기: ${picks.cost}`,
        secrets: `절초: ${picks.finisher} · 시그니처: ${picks.signame}`,
        notes: `내공 경지: ${picks.tier} · 강호 위상: ${picks.status} · 시그니처: ${picks.signame}`,
      },
    })
    flash(id ? '프로젝트 자료 〈무공〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        이 강호만의 <b>무공 한 벌</b>을 <b>무공명·계보·문파·속성·병기·초식·절초·심법·경지·발동·부작용·대가·위상</b>까지 통째로 빚어냅니다.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요. 좋은 무공은 멋진 이름보다 <b>원리·약점·대가</b>가 핵심입니다.
      </div>

      {/* 조합수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>
          <Emoji e="🎲"/> {fmt(COMBOS)}가지 조합
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>({COMBOS.toLocaleString('ko-KR')})</span>
      </div>

      {/* 유파 기조 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>유파 기조</span>
        {TONES.map((t) => {
          const on = t.key === toneKey
          return (
            <button key={t.key} className="minibtn" onClick={() => { setToneKey(t.key); setCopied(false); setSaved(false) }}
              aria-pressed={on} title={t.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={() => setToneLocked((v) => !v)} title={toneLocked ? '기조 고정 해제' : '기조 고정'}
          style={{ borderColor: toneLocked ? 'var(--accent)' : 'var(--border)' }}>
          {toneLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
        </button>
      </div>

      {/* 시그니처 헤더 카드 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}><Emoji e="🗡️"/> 이 강호의 시그니처 무공</div>
        <div style={{
          fontSize: 21, fontWeight: 700, lineHeight: 1.35,
          color: ready ? 'var(--text)' : 'var(--muted)',
          transition: 'opacity .2s', opacity: spinning ? 0.5 : 1,
        }}>
          {ready ? (spinning ? '…비급을 빚어내는 중…' : picks.name) : '생성해 보세요.'}
        </div>
        {ready && !spinning && (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
              {picks.signame}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6 }}>
              <b style={{ color: 'var(--ok)' }}>{tone.label}</b> · {tone.desc}
            </div>
          </>
        )}
      </div>

      {/* 슬롯 분해(잠금/부분 재생성 단위) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => {
          if (s.key === 'name' || s.key === 'signame') return null // 헤더 카드에서 이미 표시
          const v = picks[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 11px',
            }}>
              <div style={{
                fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0,
                transition: 'transform .25s',
                transform: spinning && !isLocked ? 'rotate(14deg) scale(1.15)' : 'none',
              }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span> · {s.hint}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (spinning && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} disabled={isLocked} title="이 슬롯만 다시"
                style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, padding: '0 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 무공명·시그니처도 개별 재생성/잠금 가능하게(헤더 아래 작은 컨트롤) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>무공명/한 줄만:</span>
        <button className="minibtn" onClick={() => rollOne('name')} disabled={!!locked.name} title="무공명만 다시"><Emoji e="🎲"/> 무공명</button>
        <button className="minibtn" onClick={() => toggleLock('name')} style={{ borderColor: locked.name ? 'var(--accent)' : 'var(--border)' }}>{locked.name ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
        <button className="minibtn" onClick={() => rollOne('signame')} disabled={!!locked.signame} title="시그니처 한 줄만 다시"><Emoji e="🎲"/> 한 줄</button>
        <button className="minibtn" onClick={() => toggleLock('signame')} style={{ borderColor: locked.signame ? 'var(--accent)' : 'var(--border)' }}>{locked.signame ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate}><Emoji e="🗡️"/> 무공 생성 / 다시 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장">
          {saved ? <>✓ 저장됨</> : <><Emoji e="⭐"/> 스니펫</>}
        </button>
      </div>

      {/* 프로젝트 연계 + 관련 도구 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={
            !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
            : !ready ? '먼저 무공을 생성해주세요'
            : '생성한 무공과 슬롯 분해를 프로젝트 자료 〈무공〉 폴더에 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '무협' })} title="세계관(강호) 위키에 정리">
          <Emoji e="📚"/> 세계관 위키
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '무협' })} title="배경 설정집(강호·문파)으로">
          <Emoji e="🏯"/> 배경 설정집
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { genre: '무협', character: { name: '', notes: `${picks.name || ''} 전수자`, fields: { name: '', notes: `${picks.name || ''} 전수자` } } })} title="이 무공을 익힌 인물 시트 만들기">
          <Emoji e="🧑‍🎤"/> 인물 시트
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>
        좋은 무공은 ‘무엇을 할 수 있는가’보다 <b>약점·대가·금기</b>가 더 흥미롭습니다(도시에 8항: 초식 작명 공허화·기연 남발 경계).
        클라이맥스에선 <b>절초</b>를, 중반 위기엔 <b>부작용·주화입마</b>를 복선으로 회수해 보세요.
      </div>
    </div>
  )
}
