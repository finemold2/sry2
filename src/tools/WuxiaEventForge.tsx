// 무협 사건·소재 대장간(WuxiaEventForge) — 강호(江湖) 서사의 핵심 사건을 아홉 슬롯 조합으로 대량 생성한다.
//  발단(기연·촉발) × 강호 무대 × 무공·내공(법칙) × 적대 세력 × 휘말리는 인물 × 은원·판돈 × 결투·비무 양상 × 반전(정체·혈연) × 대가(귀은·폐인)
//  아홉 슬롯을 골라 굴리면, 무협 한 국면이 되는 사건 전개를 한 단락으로 엮어 준다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다. 핵심 생성기 — 조합 1조 이상(약 19조+).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 기연·내공/심법·정파-사파-마교·구파일방·은원(有恩必報)·주화입마·비급쟁탈·비무논검·회귀먼치킨(화산귀환형)·
//  대가지불형 승리(서효원·정통 한무)·정체은닉/혈연반전(천룡팔부형)·귀은(歸隱) 엔딩을 슬롯 데이터에 반영.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'wuxia-eventforge',
  name: '무협 사건 대장간',
  icon: '🗡️',
  group: '생성기',
  genre: '무협',
  intro: '기연·강호·무공·세력·인물·은원·결투·반전·대가 아홉 슬롯을 굴려 무협 사건을 1조+ 조합으로 단조하세요',
  w: 600,
  h: 700,
}

const LS = 'sry:tool:wuxia-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 무협 사건 전개의 한 축. faces = 그 축의 후보(로컬 표). 장르 특화·구체적으로.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'spark', label: '발단·기연', icon: '🜂', desc: '무엇이 사건을 촉발하는가',
    faces: [
      '천 길 절벽에서 떨어진 자리에 비동(秘洞)이 입을 벌리고 있고',
      '죽어 가던 전대 고수가 마지막 진기로 무공을 떠넘기려 하고',
      '백 년에 한 번 핀다는 만년설삼(萬年雪蔘)이 폐관 직전 손에 들어오고',
      '무림제일의 신공(神功) 비급이 강호에 흘러나왔다는 소문이 돌고',
      '멸문한 사문(師門)의 막내 제자만이 홀로 살아남아 눈을 뜨고',
      '죽었던 전생의 기억을 안은 채 폐인 취급받던 어린 시절로 회귀하고',
      '운기조식 중 단전이 깨지며 끊겼던 기경팔맥이 거꾸로 뚫리고',
      '객잔(客棧)에서 시비가 붙은 애송이가 알고 보니 절정고수였고',
      '봉문(封門)했던 마교의 천마(天魔)가 백 년 만에 다시 강호에 나타나고',
      '구파일방에 무림첩(武林帖)이 돌며 정사대전(正邪大戰)이 선포되고',
      '폐관 수련에 든 사부가 주화입마에 빠져 발광하기 시작하고',
      '죽은 줄 알았던 부모의 원수가 무림맹주의 자리에 앉아 있고',
      '소림 장경각(藏經閣)에서 금단의 무공서 한 권이 사라지고',
      '비무대회 결승에서 정체를 숨긴 자가 가면을 벗고',
      '강호에 흩어진 신병이기(神兵利器)의 비밀 지도가 조각나 나돌고',
      '단전이 폐맥(廢脈)된 폐인이 우연히 영물(靈物)의 내단을 삼키고',
      '무공이라곤 모르던 표국(鏢局)의 짐꾼이 절세 심법의 후예로 밝혀지고',
      '사부가 죽기 전 "본 문의 원수를 갚으라" 한마디만 남기고',
      '천하제일을 가린다는 화산논검(華山論劍)의 날짜가 박두하고',
      '새외(塞外)의 라마승이 빙공(氷功)을 앞세워 중원으로 밀려들고',
      '당문(唐門)의 절명독(絶命毒)이 강호 곳곳에서 동시에 터지고',
      '혈교(血敎)의 살수첩(殺手帖)에 자신의 이름이 올라 있고',
      '천하를 떠돌던 검선(劍仙)이 단 한 명의 전인(傳人)을 찾는다 하고',
      '무림지존을 노린 자객이 한밤중 침소에 칼을 들이밀고',
      '폐허가 된 옛 문파 터에서 봉인된 마공(魔功) 석실이 열리고',
      '강호를 등졌던 은거기인(隱居奇人)이 끝내 다시 검을 잡고',
      '한 통의 혈서(血書)가 멸문의 진실을 가리키며 날아들고',
      '내공을 한순간에 빼앗는 흡성대법(吸星大法)의 희생자가 속출하고',
      '무명(無名)의 소년이 비무에서 구대문파의 후기지수를 모조리 꺾고',
      '죽은 천하제일인의 유진(遺塵)이 후계 없이 다시 빛을 내고',
      '강호를 뒤흔든 무림서열(武林序列) 첫머리가 하룻밤에 바뀌고',
      '꺼졌던 사문의 향화(香火)에 누군가 다시 불을 붙이고',
    ],
  },
  {
    key: 'stage', label: '강호 무대', icon: '🏯', desc: '어디에서 벌어지는가',
    faces: [
      '협객과 살수가 뒤섞이는 황량한 변경의 객잔(客棧)',
      '천하의 고수가 모인다는 정주(鄭州)의 비무대(比武臺)',
      '구름 위에 솟은 화산(華山)의 절벽 검로(劍路)',
      '검수(劍修)의 본산, 무당산(武當山)의 자소궁(紫宵宮)',
      '천 년 불법(佛法)이 흐르는 소림사(少林寺) 장경각',
      '암기와 독이 도사린 사천당가(四川唐家)의 음습한 별원',
      '검 한 자루로 가문을 일으킨 남궁세가(南宮世家)의 검총(劍塚)',
      '거지들의 정보가 모이는 개방(丐幇)의 분타(分舵)',
      '마교의 깃발이 나부끼는 새외 마경(魔境)의 천마신전',
      '눈보라 몰아치는 북해(北海)의 빙궁(氷宮)',
      '천 길 낭떠러지 아래 잊힌 전대 고수의 비동(秘洞)',
      '강호의 은원이 칼로 결판나는 흑도(黑道)의 도박장',
      '비단길이 끝나는 서장(西藏)의 라마 밀교 사원',
      '재물과 목숨을 함께 싣고 달리는 표국의 행상(行商) 길',
      '천하 영약이 거래되는 약왕곡(藥王谷)의 어두운 약시(藥市)',
      '무림맹(武林盟)의 위세가 짓누르는 정파 연합의 총단',
      '주인 없이 검명(劍鳴)만 울리는 폐문(廢門)한 옛 문파 터',
      '안개가 결코 걷히지 않는 운몽택(雲夢澤)의 늪지 진법',
      '강과 호수가 곧 법이 되는 장강(長江) 수로채(水路寨)',
      '기관(機關)과 함정이 가득한 지하 살막(殺幕)의 본거지',
      '천하제일을 가리는 오악(五嶽) 정상의 논검대(論劍臺)',
      '검과 술이 함께 흐르는 항주(杭州) 서호(西湖)의 화방(畫舫)',
      '관(官)과 강호가 미묘히 얽힌 낙양(洛陽)의 번화한 저잣거리',
      '비급을 노린 자들이 모여드는 만마동(萬魔洞)의 미궁',
      '도가(道家)의 검기가 서린 종남산(終南山)의 옛 검각',
      '아미(峨嵋)의 여협(女俠)들이 지키는 금정(金頂)의 사찰',
      '곤륜(崑崙)의 만년설이 덮인 옥허궁(玉虛宮) 검봉(劍峰)',
      '점창(點蒼)의 검수들이 사는 운남(雲南) 변방의 검산(劍山)',
      '독과 고(蠱)가 길러지는 묘강(苗疆)의 만독곡(萬毒谷)',
      '핏빛 깃발이 걸린 혈교의 제단, 만인총(萬人塚) 위 신전',
      '천하의 정보가 모이고 흩어지는 하오문(下五門)의 뒷골목',
      '회귀할 때마다 처음 눈뜨는, 멸문 사흘 전의 그 사문(師門)',
      '검 한 자루 들고 천하를 떠도는, 정처 없는 강호의 노상(路上)',
    ],
  },
  {
    key: 'art', label: '무공·내공', icon: '☯', desc: '어떤 무리(武理)가 작동하는가',
    faces: [
      '단전에 진기를 쌓아 운기조식으로 끌어올리는 정종(正宗) 내공',
      '검기(劍氣)를 넘어 검강(罡)에 이른 등봉조극(登峰造極)의 검도',
      '베는 순간 한 수에 승부가 갈리는 쾌검(快劍)의 극의(極意)',
      '한 초식에 십 초식을 담는 환검(幻劍)의 허허실실(虛虛實實)',
      '내공이 깊을수록 무거워지는 태산압정(泰山壓頂)의 패도(覇道) 도법',
      '답설무흔(踏雪無痕)으로 자취를 남기지 않는 신묘한 경공(輕功)',
      '점혈(點穴)로 적의 혈도(穴道)를 짚어 숨통을 멈추는 금나수(擒拿手)',
      '남의 내공을 빨아들이되 주화입마의 위험을 안는 흡성대법(吸星大法)',
      '읽으면 정신을 좀먹는, 강해지되 인간성을 잃는 마공(魔功)',
      '수명을 깎아 폭발적 공력을 끌어내는 금단의 환혼대법(還魂大法)',
      '천하의 모든 검로(劍路)를 무(無)로 되돌리는 무초승유초(無招勝有招)',
      '환골탈태(換骨奪胎)로 근골을 새로 빚는 영약·내단의 기연',
      '음양(陰陽)의 두 기운을 한 몸에 돌리는 쌍수호박(雙修互搏)',
      '강기를 실 끝에 실어 천 리를 베는 무영검사(無影劍絲)',
      '내가중수법(內家重手法)으로 겉은 멀쩡히 속을 부수는 음공(陰功)',
      '독과 무공을 한데 엮어 만독불침(萬毒不侵)에 이르는 당문 절학',
      '진법(陣法)으로 다수가 절정고수 하나를 가두는 기문진(奇門陣)',
      '심법(心法)의 구결(口訣)을 깨쳐야만 다음 경지로 오르는 단계 무공',
      '반로환동(返老還童)에 이르러 늙음을 거스르는 현문(玄門) 내공',
      '회귀자만이 아는 미래의 초식·약점, 그 정보 자체가 곧 무기인',
      '한 번 펼치면 단전이 부서지는, 동귀어진(同歸於盡)의 금기 절초',
      '심마(心魔)를 다스리지 못하면 폐인이 되는 천마군림보(天魔君臨步)',
      '검의(劍意)로 적의 마음을 베어 싸우기도 전에 굴복시키는 검심(劍心)',
      '내공 수치가 갑자(甲子) 단위로 매겨지는, 정량화된 공력의 위계',
      '암기(暗器)를 비처럼 뿌려 시야를 덮는 만천화우(滿天花雨)',
      '도(刀)에 강기를 둘러 산을 가르는 패도일도(覇道一刀)',
      '소리로 내부를 진탕시키는 사자후(獅子吼)의 음공(音功)',
      '극에 달해 생사현관(生死玄關)을 뚫고 화경(化境)에 드는 깨달음',
      '고(蠱)를 길러 적의 몸 안에서 부리는 묘강의 사술(邪術)',
      '두 사람이 등을 맞대 약점을 메우는 연수합격(聯手合擊)의 진(陣)',
      '한 호흡에 십이로(十二路)를 펼치는 속도의 극, 표풍검법(飄風劍法)',
      '천하제일을 가른다는 단 하나의 무상검도(無上劍道)',
      '베인 상처마저 진기로 되돌리는 불사(不死)에 가까운 호체신공(護體神功)',
    ],
  },
  {
    key: 'foe', label: '적대 세력', icon: '🩻', desc: '맞서는 적·재앙은 무엇인가',
    faces: [
      '강호 정복을 노리는 마교(魔敎)와 그 십대 호법(護法)',
      '정파의 탈을 쓰고 사파(邪派)와 결탁한 무림맹의 수뇌',
      '의뢰만 있으면 누구든 베는 그림자 살수 조직, 살막(殺幕)',
      '교리를 무기 삼아 산 제물을 바치는 혈교(血敎)의 사도들',
      '천하제일의 비급을 독차지하려는 구파일방의 야심가',
      '독과 고로 강호를 잠식하는 묘강의 만독문(萬毒門)',
      '새외에서 빙공을 앞세워 중원을 노리는 북해 빙궁',
      '관(官)을 등에 업고 강호를 옭아매려는 권신(權臣)의 손길',
      '복수를 위해 사문 전체를 도륙한 정체불명의 흑의인(黑衣人)',
      '무림 서열을 새로 쓰려는, 정사(正邪)를 초월한 절대고수',
      '강호의 정보를 쥐고 흥정하는 하오문(下五門)의 음험한 문주',
      '마공을 익혀 폭주한 옛 동문(同門)의 배신자',
      '천마의 부활을 준비하는, 백 년을 숨어 온 마교 잔당',
      '회귀한 주인공의 미래까지 아는 또 다른 회귀자',
      '비무를 빌미로 후기지수를 차례로 제거하는 비밀 결사',
      '약왕곡의 영약을 독점해 강호의 목줄을 쥔 약왕(藥王)',
      '검 한 자루로 한 문파씩 멸문시키는 검귀(劍鬼)',
      '주군을 잃고 강호를 떠도는, 통제 불능의 옛 친위 무사단',
      '천하를 둘로 가르려는 두 대문파의 대리 전쟁',
      '아군의 탈을 쓰고 모든 비극을 설계한 진짜 흑막(黑幕)',
      '흡성대법으로 강호의 내공을 거두어 가는 마두(魔頭)',
      '봉인이 풀릴 때마다 강해지는 마교의 칠대 사자(使者)',
      '제 사부를 베고 문파를 찬탈한 패륜의 대제자',
      '독무(毒霧)를 퍼뜨려 한 성(城)을 통째로 비운 독인(毒人)',
      '비급의 진본을 차지하려 후예를 사냥하는 노괴(老怪)',
      '불사에 가까워 죽지 않는 혈교 교주와 그 강시(殭屍) 군단',
      '강호 도의(道義)를 비웃으며 약자를 짓밟는 흑도의 패주(覇主)',
      '관무불가침(官武不可侵)을 깨고 강호에 손을 뻗은 금의위(錦衣衛)',
      '진법으로 침입자를 가두어 산 채로 말려 죽이는 기관 문파',
      '천하제일을 칭하며 도전자를 모조리 폐인으로 만든 무림지존',
      '신병이기를 노리고 의형제의 등에 칼을 꽂은 옛 벗',
      '예언이 가리킨 천살성(天殺星)을 죽이려는 정파의 비밀 추살대',
      '사문을 멸문시킨, 정작 가장 가까운 곳에 있던 배신자',
    ],
  },
  {
    key: 'who', label: '휘말리는 인물', icon: '🧎', desc: '누가 사건의 중심에 서는가',
    faces: [
      '무재(無才)라 멸시받다 기연으로 각성한 사문의 막내 제자',
      '명문의 핏줄을 모른 채 저잣거리에서 자란 고아',
      '동료에게 버림받고 폐인 시절로 회귀한 전대 천하제일인',
      '멸문지화에서 홀로 살아남아 복수만을 벼리는 외동',
      '단전이 깨졌다 거꾸로 뚫려 기연을 얻은 폐인(廢人)',
      '천마의 핏줄을 이었으나 정파에서 살고 싶은 소녀',
      '죽기 직전 전대 고수의 전인(傳人)으로 지목된 떠돌이 소년',
      '정체를 숨기고 표국의 짐꾼으로 위장한 절세고수',
      '구음절맥(九陰絶脈)을 타고나 단명을 앞둔 비운의 천재',
      '강호의 은원에 얽혀 검을 잡게 된 약방(藥房)의 어린 의원',
      '제 사부가 흑막임을 모른 채 그를 따르는 충직한 제자',
      '마공에 손을 댄 뒤 인간성을 잃어 가는 옛 협객',
      '가문의 명예를 되찾으려는 몰락한 세가의 막내딸',
      '천하제일을 향한 야심 하나로 산을 내려온 검수(劍修)',
      '기억을 잃은 채 적의 문파에서 눈을 뜬 옛 영웅',
      '비급을 우연히 손에 넣어 강호의 표적이 된 평범한 서생(書生)',
      '사부의 원수를 갚으라는 유언 한마디에 묶인 어린 후계자',
      '정파와 마교 사이에서 태어나 양쪽에 쫓기는 혼혈',
      '회귀한 미래의 지식으로 강호를 손바닥 위에 둔 자',
      '만독불침의 체질을 타고나 독인들에게 노려지는 소녀',
      '검 한 자루로 강호를 떠도는, 이름 없는 낭인(浪人) 검객',
      '복수를 끝낸 뒤 텅 빈 마음을 안고 귀은(歸隱)을 꿈꾸는 노협',
      '비무대회에서 정체를 숨긴 채 구대문파를 차례로 꺾는 무명인',
      '제 손으로 사문을 멸문시킨 죄를 안고 도망친 배신자',
      '천살성(天殺星)으로 점지되어 정파에 쫓기는 마을의 청년',
      '약왕곡에 팔려 와 독을 다루게 된 어린 약동(藥童)',
      '무공을 모르면서 머리 하나로 강호를 헤쳐 가는 책사(策士)',
      '죽은 정혼자의 복수를 위해 검을 든 명문 세가의 여협',
      '봉인된 마공의 그릇으로 길러진, 진실을 모르는 양자(養子)',
      '강호를 등졌다가 제자의 부고에 다시 산을 내려온 은거기인',
      '내공을 빼앗겨 폐인이 됐다 흡성대법의 비밀을 푼 자',
      '두 번째 생에서 모든 비극을 막으려는 회귀한 노검객',
      '천하제일 비급의 마지막 한 장을 외운, 글 모르는 표사(鏢師)',
    ],
  },
  {
    key: 'stake', label: '은원·판돈', icon: '⚖️', desc: '무엇이 걸려 있는가',
    faces: [
      '멸문당한 사문의 원수를 갚을 단 한 번의 기회',
      '천하제일의 비급을 누가 손에 쥐느냐의 쟁탈',
      '강호 전체의 안위와 수만 무인(武人)의 목숨',
      '정사대전의 승패, 정파와 마교의 존망(存亡)',
      '주화입마에 빠진 사부를 구해 낼 마지막 시간',
      '되갚지 않으면 협(俠)이 아닌, 갚아야 할 은혜(恩) 한 자락',
      '천하제일인의 자리와 무림지존의 위(位)',
      '깨지면 강호의 균형이 무너질 무림맹의 정통성',
      '봉인된 천마의 부활을 막을 마지막 봉인',
      '회귀로 얻은 단 한 번뿐인, 다시 사는 생(生)',
      '되살릴 수 없는 단 하나의 핏줄, 가족의 생사',
      '잃어버린 자신의 진짜 정체와 사문의 명예',
      '신병이기(神兵利器)와 그에 깃든 강호의 패권',
      '복수를 완성하느냐, 협의(俠義)를 지키느냐의 갈림길',
      '독에 중독된 한 성(城) 사람들을 살릴 해약(解藥)',
      '단전이 부서지기 전, 적을 벨 마지막 한 초식',
      '사문의 향화(香火)를 잇느냐 끊느냐, 한 문파의 존속',
      '강호 도의(道義)냐 살아남음이냐의 잔혹한 선택',
      '비무에서 진 자가 내놓아야 할 무공과 명예',
      '천하를 둘로 가를 두 대문파의 휴전 혹은 전면전',
      '흡성대법에 빼앗긴 강호 고수들의 평생 공력',
      '예언이 가리킨 천살성을 살리느냐 죽이느냐',
      '관(官)과 강호의 관무불가침(官武不可侵)을 지키느냐 깨느냐',
      '의형제의 의(義)냐, 사문에 진 빚이냐의 충돌',
      '되갚을 원한과 갚을 은혜가 한 사람에게 겹친 외길',
      '폐인이 된 몸으로 되찾아야 할 잃어버린 무공',
      '마공의 그릇이 될 것이냐, 인간으로 남을 것이냐',
      '천하제일을 가릴 화산논검의 마지막 한 판',
      '강호에 흩어진 비급 조각이 누구의 손에 모이느냐',
      '사부를 베고 얻은 자리냐, 사부의 유지(遺志)냐',
      '회귀의 마지막 기회를 어느 순간에 쓰느냐',
      '천 년 사문(師門)을 이을 단 하나의 정통 전인(傳人)',
      '강호를 등질 귀은(歸隱)이냐, 끝까지 칼을 쥘 것이냐',
    ],
  },
  {
    key: 'duel', label: '결투·비무', icon: '⚔️', desc: '어떻게 부딪치는가',
    faces: [
      '초식 대 초식을 주고받다 마지막 한 수(一手)에 승부가 갈린다',
      '화려한 합(合) 없이, 찰나의 단 한 칼로 끝난다',
      '진법(陣法)에 갇힌 절정고수를 다수가 에워싸 무너뜨린다',
      '독과 암기가 정면 무력의 판을 통째로 뒤집는다',
      '내공을 모두 끌어올린 끝에, 동귀어진(同歸於盡)으로 치닫는다',
      '비무대 위에서 정체를 숨긴 자가 천하의 후기지수를 차례로 꺾는다',
      '연수합격(聯手合擊)으로 둘이 등을 맞대 절대고수에 맞선다',
      '점혈(點穴) 한 수로 적의 숨통을 멈춰 피 한 방울 없이 제압한다',
      '검기(劍氣)와 도강(刀罡)이 부딪쳐 산허리가 갈라진다',
      '말 한마디·검의(劍意)로 싸우기 전에 상대를 굴복시킨다',
      '금기 절초를 펼쳐 이기되, 그 자리에서 단전이 부서진다',
      '추격과 매복이 거듭되다 절벽 끝에서 마지막으로 마주 선다',
      '흡성대법으로 적의 내공을 통째로 빨아들여 끝낸다',
      '만천화우(滿天花雨)의 암기가 하늘을 덮으며 시야를 지운다',
      '주화입마에 빠진 적이 광기로 폭주하며 무차별로 휘두른다',
      '논검(論劍)으로 검리(劍理)를 겨루다 한 깨달음에 승패가 갈린다',
      '독무(毒霧) 속에서 보이지 않는 적과 숨을 죽이며 베어 간다',
      '경공(輕功)으로 천 길을 날며 쫓고 쫓기는 추격전이 벌어진다',
      '사자후(獅子吼)의 음공이 내부를 진탕시켜 무릎을 꿇린다',
      '한 호흡에 십이로(十二路)를 쏟아붓는 속도의 폭풍이 몰아친다',
      '기관(機關)이 작동하며 무대 자체가 함정으로 변한다',
      '검총(劍塚)의 검들이 일제히 울며 진(陣)을 이룬다',
      '내공이 바닥난 끝에 맨주먹 육탄전으로 마무리된다',
      '강시(殭屍) 군단을 베고 또 베며 교주에게 한 걸음씩 다가간다',
      '예고된 비무(比武)의 날, 천하가 지켜보는 가운데 검을 겨눈다',
      '의형제와 마지막으로 검을 맞대며 옛 정을 끊는다',
      '폭우가 핏자국을 씻어 내리는 가운데 마지막 일격을 내지른다',
      '서로의 진명(眞名)·정체를 폭로하며 검끝이 떨린다',
      '천마군림보(天魔君臨步)의 보법 앞에 발이 묶여 옴짝달싹 못 한다',
      '단 한 합도 나누지 못한 채, 격(格)의 차이만 확인한다',
      '비급의 마지막 초식을 그 자리에서 깨치며 역전한다',
      '관중이 숨죽인 가운데, 새 무림서열이 한 칼에 다시 쓰인다',
    ],
  },
  {
    key: 'twist', label: '반전·정체', icon: '🌀', desc: '무엇이 뒤집히는가',
    faces: [
      '사문을 멸문시킨 원수가 다름 아닌 친사부(親師父)였다',
      '죽이려던 마교 교주가 잃어버린 친혈육이었다',
      '믿고 따르던 멘토가 모든 비극을 설계한 흑막이었다',
      '회귀의 기억이 사실은 적이 심어 놓은 거짓이었다',
      '천하제일 비급은 익히는 자를 폐인으로 만드는 함정이었다',
      '정파 무림맹주가 뒤로는 마교와 한통속이었다',
      '주인공이 익힌 무공이 곧 강호를 좀먹던 마공의 뿌리였다',
      '죽은 줄 알았던 사부가 적의 진영에서 살아 있었다',
      '예언이 가리킨 천살성(天殺星)은 재앙이 아니라 강호의 구원이었다',
      '진짜 천하제일인은 따로 있었고 주인공은 미끼였다',
      '봉인을 지키던 수호 문파가 곧 봉인을 푸는 열쇠였다',
      '비무에서 진 척한 노인이 사실 무림지존이었다',
      '구하려던 가족이 이 사건의 진짜 배후였다',
      '천마의 부활을 바란 것은 다름 아닌 정파의 수뇌였다',
      '회귀는 이번이 처음이 아니라 이미 수십 번째였다',
      '흡성대법의 마두는 빼앗은 내공을 강호에 돌려주려 한 것이었다',
      '의형제가 사실은 사문을 멸문시킨 흑의인 본인이었다',
      '비급의 마지막 장은 "무공을 버리라"는 한 줄뿐이었다',
      '주인공의 단전이 깨진 것은 사고가 아니라 사부의 안배였다',
      '구음절맥의 저주가 실은 천고의 신공을 담는 그릇이었다',
      '복수의 대상이 이미 오래전 주인공을 한 번 살린 은인이었다',
      '강호에 흩어진 비급 조각은 모두 한 사람의 손에서 나온 것이었다',
      '정사대전의 진짜 배후는 어부지리를 노린 관(官)이었다',
      '죽은 정혼자가 적의 가면 뒤에 살아 숨어 있었다',
      '천마(天魔)는 강호를 정복하려던 게 아니라 더 큰 적을 막고 있었다',
      '주인공을 키운 양부가 곧 부모를 벤 원수였다',
      '비급을 노린 모든 싸움이 사실 한 사람의 자작극이었다',
      '주화입마에 빠진 사부는 제자를 지키려 일부러 미친 척했다',
      '관무불가침을 먼저 깬 것은 강호 쪽, 정파의 협객이었다',
      '천하제일을 가린 화산논검의 승자는 이미 정해져 있었다',
      '진명을 되찾는 순간, 잊었던 죄(罪)까지 함께 돌아왔다',
      '마지막에 검을 거둔 자가, 처음부터 모든 것을 알고 있었다',
    ],
  },
  {
    key: 'cost', label: '대가·여파', icon: '🩸', desc: '무엇을 잃거나 남기는가',
    faces: [
      '승리의 대가로 단전이 부서져 평생 폐인으로 남는다',
      '원수를 갚았으나 손에 남은 것은 텅 빈 강호뿐이다',
      '금기 절초를 쓴 대가로 십 년의 공력이 흩어진다',
      '마공을 끝까지 밀어붙인 끝에 인간성을 잃어 간다',
      '복수를 완성한 자는 끝내 검을 버리고 귀은(歸隱)한다',
      '사문은 지켰으나 그 자리에 자신의 이름은 지워진다',
      '천하제일에 올랐으나 곁에는 아무도 남지 않았다',
      '주화입마를 막은 대신 다시는 무공을 펼칠 수 없게 된다',
      '회귀의 권능을 다 써 버려, 다음은 없는 마지막 생이 된다',
      '은혜는 갚았으나 그 빚이 다음 세대로 넘어간다',
      '독을 정화한 대가로 만독불침의 몸이 독 그 자체가 된다',
      '진실이 드러나자 함께 싸운 동문(同門)이 등을 돌린다',
      '마교는 무너졌으나 그 빈자리에 새 마두가 들어선다',
      '내공을 되찾는 대신, 사랑한 이를 알아보지 못하게 된다',
      '천마를 봉인하느라 자신도 함께 백 년의 잠에 든다',
      '검을 거둔 대가로 평생 비겁자라는 오명을 쓴다',
      '동귀어진으로 적을 베되, 자신도 그 자리에서 쓰러진다',
      '강호의 균형은 지켰으나 협(俠)의 시대는 막을 내린다',
      '비급을 불태워 평화를 얻되, 천고의 무학(武學)이 사라진다',
      '사부를 베고 얻은 자리는 거짓 위에 세워진 것이었다',
      '복수의 끝에서, 자신이 곧 다음 원수가 되어 있다',
      '모두가 살아남았으나 단 하나의 맹세(盟)만은 깨어진다',
      '진명을 되찾은 순간, 지금까지의 자아가 흩어진다',
      '정혼자를 구한 대신, 그를 향한 기억을 잃는다',
      '강호를 구한 영웅은 끝내 무명(無名)으로 잊힌다',
      '천하를 얻었으나, 함께 검을 잡던 이들은 모두 흙이 되었다',
      '폐관(閉關)으로 화경에 들되, 인간 세상의 정(情)을 잊는다',
      '독인(毒人)을 무찌른 대가로 묘강 전체의 원한을 짊어진다',
      '비무의 승자가 되었으나, 진 자의 문파가 멸문으로 답한다',
      '두 번째 생을 다 쓰고서야, 막지 못할 운명을 받아들인다',
      '검은 거두었으나 강호는 다시 그를 가만두지 않는다',
      '천 년 사문을 이었으나, 그 무게에 청춘을 통째로 바친다',
      '승전의 함성 뒤에 남은 것은 폐허가 된 사문의 침묵뿐이다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 큰 수 표기(한국 단위: 조/억/만). 조합 1조 이상을 강조.
function fmtBig(n: number): string {
  const ko = n.toLocaleString('ko-KR')
  const jo = 1_0000_0000_0000
  const eok = 1_0000_0000
  const man = 1_0000
  let unit = ''
  if (n >= jo) unit = `약 ${(n / jo).toFixed(2)}조`
  else if (n >= eok) unit = `약 ${(n / eok).toFixed(1)}억`
  else if (n >= man) unit = `약 ${Math.round(n / man)}만`
  return unit ? `${ko} (${unit})` : ko
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 자연스러운 무협 사건 전개 단락으로 엮는다(의미 단위 조립).
function compose(by: Record<string, string>): string {
  const { spark, stage, art, foe, who, stake, duel, twist, cost } = by
  const parts: string[] = []
  // 1) 발단 + 무대
  if (spark) parts.push(stage ? `${stage}에서, ${spark}` : spark)
  else if (stage) parts.push(`${stage}에서, 강호의 풍파가 인다`)
  // 2) 무공·내공이 작동하는 강호의 법칙
  if (art) parts.push(`이 강호를 가르는 무리(武理)는 ${art}이다`)
  // 3) 휘말리는 인물 + 적
  if (who) {
    if (foe) parts.push(`${who}이(가) ${foe}에 맞서게 된다`)
    else parts.push(`그 풍파 한가운데에 ${who}이(가) 선다`)
  } else if (foe) {
    parts.push(`${foe}이(가) 강호를 위협한다`)
  }
  // 4) 판돈·은원
  if (stake) parts.push(`걸린 것은 ${stake}`)
  // 5) 결투·비무
  if (duel) parts.push(`마침내 ${duel}`)
  // 6) 반전·정체
  if (twist) parts.push(`그러나 진실은 — ${twist}`)
  // 7) 대가·여파
  if (cost) parts.push(`그리고 그 끝에서, ${cost}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function WuxiaEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key)
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 340)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const allOn = () => setActive(SLOTS.map((s) => s.key))

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 사건 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사건을 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `🗡️ 무협 사건 — ${story.slice(0, 26)}${story.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: {
        발단: byKey.spark || '—',
        무대: byKey.stage || '—',
        적대세력: byKey.foe || '—',
        은원: byKey.stake || '—',
        장르: '무협',
      },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 사건을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[무협 사건] ${text}`,
      source: '무협 사건 대장간',
      tags: ['글감', '사건', '무협', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `🗡️ 무협 사건 — ${s.text.slice(0, 26)}${s.text.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      meta: { 장르: '무협' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>기연·강호·무공·세력·인물·은원·결투·반전·대가</b> 아홉 슬롯을 골라 굴리면, 무협 한 국면이 되는 사건 전개로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗡️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
            {active.length < SLOTS.length && (
              <button className="minibtn" onClick={allOn} title="모든 슬롯 켜기" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                ⊕ 전체
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(combos)}</b>가지
            {combos >= 1_0000_0000_0000 ? <> — 1조 이상 <Emoji e="🔥"/></> : combos >= 1_0000_0000 ? ' — 1억 이상' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}종</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사건 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🗡️"/> 사건 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 무협 사건이 단조됩니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="🗡️"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·관련 도구 연계 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 굴려주세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '무협' })} title="플롯 피라미드 열기"><Emoji e="📐"/> 플롯 피라미드</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '무협' })} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '무협' })} title="세계관 위키 열기"><Emoji e="📖"/> 세계관 위키</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '무협' })} title="캐릭터 생성기 열기"><Emoji e="🧬"/> 인물 생성</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 무협 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.65 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 장(章)·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건 전개는 출발점일 뿐입니다. 같은 조합이라도 내 강호·무공 체계·은원에 맞춰 자유롭게 비트세요. (정통 한무라면 대가지불형 승리·귀은으로, 웹소설 회귀먼치킨이라면 사이다·확인사살로)</div>
    </div>
  )
}
