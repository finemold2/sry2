// 역사·사극 사건 대장간(HistoryEventForge) — 사극 서사의 핵심 사건을 아홉 슬롯 조합으로 대량 생성한다.
//  발단(전조·촉발) × 시대 무대(왕대·공간) × 권력 구조(왕권·당쟁·신권) × 정적·재앙 × 휘말리는 인물 × 명분·판돈 × 충돌 양상(어전·정변·결전) × 반전(정체·역사적 운명) × 대가(연좌·사사·비극)
//  아홉 슬롯을 골라 굴리면, 사극 한 국면이 되는 사건 전개를 한 단락으로 엮어 준다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다. 핵심 생성기 — 조합 1조 이상(약 35조+).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
//  도시에 근거: 왕권 vs 신권·당쟁(훈구/사림·동서남북·노소론)·외척/환관·신분제(적서·연좌·삼족)·사화/반정/역모·임진·병자·
//  드라마틱 아이러니(역사적 운명)·미래지식(회귀빙의)·상소/어전설전·밀지/교지/옥새·장계/파발/봉수·사약/위리안치·고증함정을 슬롯 데이터에 반영.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'history-eventforge',
  name: '사극 사건 대장간',
  icon: '🏯',
  group: '생성기',
  genre: '역사·사극',
  intro: '전조·시대·권력·정적·인물·명분·충돌·반전·대가 아홉 슬롯을 굴려 역사·사극 사건을 1조+ 조합으로 단조하세요',
  w: 600,
  h: 700,
}

const LS = 'sry:tool:history-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 사극 사건 전개의 한 축. faces = 그 축의 후보(로컬 표). 장르 특화·구체적으로(왕대·관직·궁중어·사건명 반영).
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'spark', label: '발단·전조', icon: '🜂', desc: '무엇이 사건을 촉발하는가',
    faces: [
      '선왕이 후사를 정하지 못한 채 갑작스레 승하하시고',
      '폐비(廢妃)에게 내려진 사약과 그 어미의 한 줌 피가 세상에 알려지고',
      '사초(史草)에 적힌 단 한 줄이 사화(士禍)의 빌미가 되고',
      '미래의 기억을 안은 현대인이 어느 도령의 몸으로 눈을 뜨고',
      '실록에 "이날 큰 별이 떨어졌다" 적힐 흉조가 도성에 나타나고',
      '변방의 봉수(烽燧)가 다섯 자루 모두 불을 올려 적의 침입을 알리고',
      '왕의 침전에서 저주의 인형과 흉물(凶物)이 발견되고',
      '세자를 폐하라는 상소가 빗발치며 동궁(東宮)이 흔들리고',
      '간택령(揀擇令)이 내려 사대부가의 규수들이 입궐을 앞두고',
      '암행어사의 마패(馬牌)가 어느 고을 수령의 비리를 겨누고',
      '명(明)에서 온 칙사(勅使)가 무리한 조공을 요구하며 으름장을 놓고',
      '북방 여진의 추장이 변경의 진(鎭)을 약탈하기 시작하고',
      '대비전(大妃殿)이 수렴청정(垂簾聽政)을 거두기를 거부하고',
      '왕의 밀지(密旨)가 한밤중 어느 무관의 손에 쥐여지고',
      '역모를 고변(告變)하는 익명서(匿名書)가 대궐 문에 나붙고',
      '회귀한 자가 다가올 사화의 날짜를 또렷이 기억해 내고',
      '서얼(庶孼) 출신 천재가 과거(科擧)에 응시할 길조차 막히고',
      '왕세자가 뒤주에 갇혔다는 소문이 도성을 휩쓸고',
      '정적(政敵)의 집에서 위조된 교지(敎旨)가 쏟아져 나오고',
      '흉년이 거듭되어 굶주린 백성이 관아로 몰려들고',
      '환국(換局)의 바람이 불어 하룻밤 새 조정의 색이 뒤바뀌고',
      '왜(倭)의 사신이 "명을 치러 길을 빌리자(假道入明)" 통보해 오고',
      '선왕의 어진(御眞)이 불에 타 사라지는 변고가 일어나고',
      '천주학(天主學) 서책이 사대부가에서 발각되어 옥사(獄事)가 시작되고',
      '한 통의 간찰(簡札)이 가문의 역모 가담을 가리키며 날아들고',
      '왕이 미복(微服)으로 잠행(潛行)하다 저잣거리에서 변을 당하고',
      '실각한 대신이 위리안치(圍籬安置)된 곳에서 사약을 기다리고',
      '대왕대비가 새 임금을 세우려 종친(宗親)을 은밀히 불러들이고',
      '사림(士林)과 훈구(勳舊)가 경연(經筵) 자리에서 정면충돌하고',
      '병조(兵曹)의 군적(軍籍)이 백지(白紙)뿐임이 드러나고',
      '먼 미래에서 온 자가 화약 배합법을 머릿속에 떠올리고',
      '선대왕의 유언이 적힌 봉서(封書)가 옥새와 함께 발견되고',
    ],
  },
  {
    key: 'stage', label: '시대·무대', icon: '🏯', desc: '어느 왕대·공간에서 벌어지는가',
    faces: [
      '사화의 피바람이 멎지 않던 연산(燕山)의 시절, 정전(正殿) 한복판',
      '훈구와 사림이 맞서던 중종(中宗) 대, 경복궁 근정전의 어전(御前)',
      '왜란의 전운이 짙어 가던 선조(宣祖) 대, 한양 도성과 변방 진영',
      '삼배구고두(三拜九叩頭)의 치욕이 어린 인조(仁祖) 대, 남한산성',
      '환국이 거듭되던 숙종(肅宗) 대, 당쟁이 들끓는 빈청(賓廳)',
      '뒤주의 비극이 서린 영조(英祖) 대, 동궁과 창경궁 문정전',
      '탕평(蕩平)과 개혁이 꿈틀대던 정조(正祖) 대, 규장각과 화성(華城)',
      '세도(勢道)의 그늘이 짙던 순조(純祖) 대, 외척이 장악한 비변사',
      '왕자의 난(亂)이 휩쓴 태종(太宗) 초, 경복궁 강녕전',
      '집현전(集賢殿)의 등불이 꺼지지 않던 세종(世宗) 대, 편전(便殿)',
      '계유정난(癸酉靖難)의 칼날이 번뜩이던 단종(端宗) 대, 수양대군의 사저',
      '폐위와 반정이 갈마들던 광해(光海) 대, 인목대비가 유폐된 서궁(西宮)',
      '명·청 교체의 격랑이 이는 변경, 압록강 너머를 굽어보는 의주(義州)',
      '왕권과 신권이 팽팽하던 대전(大殿), 삼사(三司)의 상소가 쌓인 승정원',
      '죄인을 친국(親鞫)하는 의금부(義禁府)의 음습한 추국청(推鞫廳)',
      '간택과 책봉이 오가는 내전(內殿), 중궁전(中宮殿)의 깊은 처소',
      '대비의 명이 곧 법이 되는 수렴청정의 자리, 발(簾) 너머의 옥좌',
      '사림의 본거지, 영남(嶺南)의 서원(書院)과 향촌(鄕村)',
      '암행어사의 발길이 닿은 탐관오리의 고을, 어느 지방 관아',
      '상평통보가 도는 한양의 운종가(雲從街)와 칠패(七牌) 저잣거리',
      '봉수와 파발이 오가는 변방의 진(鎭), 적과 마주한 성벽 위 망루',
      '조공(朝貢)의 예가 오가는 모화관(慕華館)과 영은문(迎恩門)',
      '천주학 신자들이 잡혀 온 포도청(捕盜廳)의 옥(獄)',
      '세자의 학문을 닦는 동궁, 서연(書筵)이 열리는 시강원(侍講院)',
      '왕실의 제사가 엄숙히 오르는 종묘(宗廟)의 정전',
      '환관과 상궁이 오가는 깊은 내명부(內命婦), 후원(後苑)의 정자',
      '거사를 모의하는 어느 대감의 사랑채, 등불 낮춘 밀실',
      '회귀한 자가 처음 눈뜨는, 사화가 닥치기 사흘 전의 그 집',
      '통신사(通信使)가 바다를 건너간 일본, 에도(江戶)의 객관(客館)',
      '백성의 원성이 들끓는 가뭄의 들녘과 굶주린 유민(流民)의 길',
      '실학(實學)의 새 바람이 부는 정조 대, 북학(北學)을 논하는 서재',
      '국서(國書)와 옥새가 오가는 어전, 사대(事大)와 교린(交隣)의 외교 무대',
    ],
  },
  {
    key: 'power', label: '권력 구조', icon: '⚖️', desc: '어떤 권력의 법칙이 작동하는가',
    faces: [
      '왕권(王權)과 신권(臣權)이 한 치도 물러서지 않고 팽팽히 맞선다',
      '훈구(勳舊)와 사림(士林)이 조정을 둘로 갈라 사생결단으로 다툰다',
      '동인(東人)과 서인(西人)이, 다시 남인·북인으로 갈려 당쟁(黨爭)을 벌인다',
      '노론(老論)과 소론(少論)이 세자의 운명을 두고 정면으로 충돌한다',
      '외척(外戚)이 비변사를 장악해 세도(勢道)로 나라를 쥐고 흔든다',
      '대비(大妃)의 수렴청정 아래, 발 너머의 한마디가 곧 어명(御命)이 된다',
      '환관(宦官)과 상궁이 내전의 정보를 쥐고 은밀히 권세를 부린다',
      '삼사(三司)의 언관(言官)이 상소와 탄핵으로 왕마저 견제한다',
      '예학(禮學)과 명분이 칼보다 무서워, 예송(禮訟) 한 번에 정권이 뒤집힌다',
      '왕은 만능이 아니라 신하·언관·예법에 사방이 묶인 절제된 권력이다',
      '공신(功臣) 책봉과 위훈(僞勳)이 권력 분배의 저울을 좌우한다',
      '과거(科擧)와 음서(蔭敍)가 출세의 두 길로 엇갈려 가문의 명운을 가른다',
      '신분제(身分制)가 행동을 옭아매어, 서얼·천민은 한 걸음마다 족쇄를 찬다',
      '미래지식을 쥔 자라도, 자원·장인·자본·정치 반발이라는 벽에 막힌다',
      '환국(換局)으로 하룻밤 새 집권당이 통째로 뒤바뀌는 살얼음판이다',
      '명(明)·청(淸)에 대한 사대(事大)가 국내 정쟁의 명분을 좌우한다',
      '병권(兵權)을 누가 쥐느냐에 따라 정변의 성패가 갈린다',
      '왕세자와 대군(大君) 사이, 적서(嫡庶)와 장유(長幼)의 명분이 부딪친다',
      '향촌의 서원과 유림(儒林)이 여론을 빚어 조정을 압박한다',
      '암행어사와 관찰사(觀察使)가 지방 권력의 부패를 감찰한다',
      '사관(史官)의 붓이 권력자의 행적을 남겨, 죽은 뒤의 평가마저 두렵게 한다',
      '왕대비·왕비·후궁이 각자의 친정(親庭)을 업고 내전에서 겨룬다',
      '대신(大臣)의 합의인 정승(政丞)과 왕의 친정(親政)이 줄다리기를 한다',
      '회귀자가 미래의 정세 변동을 미리 알아, 정보 자체가 곧 권력이 된다',
      '간언(諫言)을 받느냐 물리치느냐로 성군(聖君)과 폭군(暴君)이 갈린다',
      '연좌(連坐)와 삼족(三族)의 법이 패자의 가문을 통째로 멸할 수 있다',
      '청(淸)의 책봉과 인질(소현세자)이 왕실의 운신을 옥죈다',
      '재이(災異)·천변(天變)을 빌미로 신하가 왕의 부덕(不德)을 추궁한다',
      '비변사(備邊司)가 의정부를 누르고 실권을 거머쥔다',
      '왕의 밀지(密旨)와 친위 세력이 공론(公論)의 정치를 우회한다',
      '실학과 북학의 새 사상이 성리학 일존(一尊)의 질서에 균열을 낸다',
      '천주학 금압과 사학(邪學) 죄인의 처결이 정쟁의 무기로 쓰인다',
    ],
  },
  {
    key: 'foe', label: '정적·재앙', icon: '🐍', desc: '맞서는 적·재앙은 무엇인가',
    faces: [
      '권력을 한 손에 쥔 채 왕마저 깔보는 외척(外戚)의 영수',
      '사림을 쓸어버리려 사화(士禍)를 설계하는 훈구의 노대신',
      '세자를 폐하고 제 손자를 세우려는 노회한 당파의 거두',
      '내전의 정보를 쥐고 왕을 농락하는 음흉한 환관(宦官)',
      '요녀(妖女)라 불리며 왕의 총애로 조정을 흔드는 후궁',
      '명분과 예법을 앞세워 개혁을 번번이 무산시키는 산림(山林) 영수',
      '변경을 노략질하다 끝내 대군(大軍)으로 쳐들어오는 왜군(倭軍)',
      '삼전도(三田渡)의 굴욕을 강요하며 인질을 끌고 가는 청(淸)의 칸',
      '무리한 조공과 봉작(封爵)을 빌미로 내정을 간섭하는 명의 사신',
      '거짓 고변(告變)으로 충신을 역적으로 모는 간신(奸臣)',
      '위훈(僞勳)으로 공신첩을 채워 권세를 세습하려는 반정공신',
      '굶주린 백성을 쥐어짜 곳간을 채우는 탐관오리(貪官汚吏)',
      '왕좌를 노리고 종친(宗親)을 끌어들여 역모를 꾸미는 대군(大君)',
      '회귀한 주인공의 다음 수까지 읽는 또 한 명의 회귀자·미래인',
      '예송(禮訟)의 칼날로 정적을 단숨에 베어 넘기는 예학의 대가',
      '국문(鞫問)으로 죄 없는 이를 역적으로 만드는 의금부의 추관',
      '봉수를 거짓으로 올려 조정을 마비시키는 내응(內應)의 첩자',
      '대비의 명을 빌려 새 임금을 세우려는 반정(反正)의 주모자',
      '천주학을 빌미로 정적의 가문을 멸하려는 척사(斥邪)의 강경파',
      '왕의 밀지를 가로채 위조하는 승정원의 부패한 승지(承旨)',
      '북방을 어지럽히는 여진(女眞)의 기마(騎馬) 부대',
      '세도가의 비위를 맞춰 매관매직(賣官賣職)을 일삼는 이조의 권신',
      '거짓 사초(史草)로 선왕을 욕보여 사화를 일으킨 사관(史官)',
      '왕비를 폐출(廢黜)하려 흉계를 꾸미는 대비전의 측근',
      '거사 직전 등을 돌려 동지를 밀고하는 변절한 모사(謀士)',
      '환곡(還穀)과 군포(軍布)로 백성의 피를 빠는 아전(衙前)의 무리',
      '왕권을 무력화하려 병권을 손에 쥔 야심 찬 무장(武將)',
      '간택을 조종해 제 딸을 중전에 앉히려는 권문세가(權門勢家)',
      '가뭄·역병·기근이 겹쳐 민심(民心)을 흔드는 천재지변',
      '겉으로는 충신이나 모든 비극을 설계한 진짜 흑막(黑幕)',
      '왕의 적자(嫡子)를 시기해 독을 쓰려는 후궁 소생의 왕자',
      '사문(師門)과 가문을 멸문시킨, 가장 가까운 곳의 배신자',
    ],
  },
  {
    key: 'who', label: '휘말리는 인물', icon: '🧎', desc: '누가 사건의 중심에 서는가',
    faces: [
      '미래의 기억을 안고 몰락한 양반가 도령으로 회귀한 자',
      '폐비의 한을 품고 광기로 치닫는 어린 임금',
      '간언을 굽히지 않아 사화의 칼날 앞에 선 강직한 사림(士林)',
      '왜란의 바다에서 열세를 뒤집으려는 변방의 수군 장수',
      '삼전도의 치욕을 가슴에 새긴 채 와신상담하는 세자',
      '뒤주에 갇힐 운명을 바꾸려 발버둥치는 비운의 동궁(東宮)',
      '서얼(庶孼)의 굴레를 쓴 채 천재의 재주를 펼칠 길이 막힌 청년',
      '간택에 뽑혀 입궐했으나 당쟁의 한복판에 던져진 규수',
      '미천한 무수리에서 왕의 승은(承恩)을 입어 후궁이 된 여인',
      '수렴청정으로 어린 왕을 대신해 조정을 거머쥔 대비(大妃)',
      '암행어사가 되어 탐관오리를 치려 잠행하는 젊은 문관',
      '거짓 역모에 연루되어 친국(親鞫)을 받게 된 충신',
      '가문의 멸문에서 홀로 살아남아 복수를 벼리는 외동',
      '미래지식으로 신무기·신작물을 들여와 왕의 신임을 얻으려는 자',
      '왕권을 강화하려 신권과 외척에 맞서는 젊은 임금',
      '거사를 모의하는 반정(反正)의 한가운데 선 무관(武官)',
      '명·청 사이에서 줄타기하며 나라를 지키려는 노련한 재상(宰相)',
      '천주학에 마음을 두었다가 박해의 칼날을 마주한 사대부',
      '왕의 밀지를 받들어 정적을 치는 은밀한 친위 무사',
      '세자빈(世子嬪)으로 간택되어 권력 다툼에 휘말린 명문가의 딸',
      '환관·상궁의 정보망을 헤치며 진실을 캐는 내관(內官)',
      '향촌의 서원에서 여론을 이끄는 재야(在野)의 유림 영수',
      '회귀로 다가올 사화·전쟁을 막으려는 두 번째 생의 노정승',
      '적장(嫡長)과 명분이 어긋난 채 왕위를 노리는 야심 찬 대군',
      '죽은 정혼자의 복수를 위해 입궐한 명문 세가의 여인',
      '굶주린 백성을 위해 환곡의 비리를 고발하려는 강직한 현감(縣監)',
      '통신사의 일원으로 일본에 건너가 첩보를 캐는 역관(譯官)',
      '미래에서 온 의술로 역병에 맞서려는 천출(賤出)의 의원',
      '폐세자(廢世子)의 핏줄을 숨긴 채 길러진 진실 모르는 양자',
      '왕의 적자를 지키려 목숨을 거는 충직한 호위 무관',
      '사관(史官)으로서 권력의 위협 속에 진실을 사초에 적는 젊은 신하',
      '글 모르는 백정(白丁)이나 머리 하나로 거사를 받치는 책사(策士)',
    ],
  },
  {
    key: 'stake', label: '명분·판돈', icon: '📜', desc: '무엇이 걸려 있는가',
    faces: [
      '멸문당한 가문의 원수를 갚고 신원(伸寃)을 회복할 단 한 번의 기회',
      '폐위된 세자를 다시 동궁에 앉히느냐, 영영 끊느냐의 갈림',
      '사화의 칼날에서 사림(士林) 수십 명의 목숨을 구해 낼 마지막 시간',
      '왜란에서 무너지는 강토(疆土)와 수만 백성의 생사',
      '삼전도의 굴욕을 받아들이느냐, 끝까지 항전하느냐의 결단',
      '왕권을 세우느냐, 신권·외척의 손아귀에 나라를 내주느냐',
      '간택으로 어느 가문이 중전을 배출해 권력의 저울을 기울이느냐',
      '거사가 성공해 반정(反正)이 되느냐, 실패해 역모(逆謀)가 되느냐',
      '충(忠)과 효(孝)·의(義)가 충돌하는 가운데 무엇을 버릴 것인가',
      '연좌·삼족의 법 아래, 한 사람의 패배로 멸할 가문의 존망',
      '옥새(玉璽)와 교지(敎旨)의 정통성을 누가 손에 쥐느냐',
      '미래지식으로 백성을 구할 신작물·신무기를 끝내 구현하느냐',
      '명(明)을 향한 사대(事大)의 의리냐, 청(淸)과의 현실적 화친(和親)이냐',
      '천주학 신자 수백의 목숨과 한 가문의 신앙·존속',
      '거짓 고변에 걸린 충신의 결백을 어전에서 증명할 마지막 한 수',
      '환국(換局)의 바람 속, 당파 전체의 존망과 권력의 향배',
      '예송(禮訟)에서 어느 예법을 택하느냐로 갈리는 정권의 명운',
      '왕세자 책봉을 둘러싼 적서(嫡庶)·장유(長幼)의 명분 싸움',
      '굶주린 한 고을 백성을 살릴 환곡(還穀)과 진휼(賑恤)의 곳간',
      '회귀로 얻은 단 한 번뿐인, 역사를 바로잡을 두 번째 생',
      '봉수·파발로 전해질 단 하나의 보고가 전세(戰勢)를 가른다',
      '왕의 밀지가 누구의 손에 닿느냐로 정변의 성패가 갈린다',
      '선왕의 유지(遺志)냐, 살아남은 자의 권력 의지냐의 충돌',
      '명문가의 명예를 되찾느냐, 역적의 후손으로 영영 낙인찍히느냐',
      '되갚지 않으면 사람이 아닌, 갚아야 할 은혜(恩) 한 자락',
      '왕비의 폐출(廢黜)을 막느냐, 외척의 뜻대로 내주느냐',
      '북방의 진(鎭)을 지켜 내느냐, 변경을 적에게 내주느냐',
      '사초(史草)에 진실을 남기느냐, 권력에 굴해 붓을 꺾느냐',
      '왕의 적자를 독으로부터 지켜 낼 단 하룻밤의 사투',
      '탕평(蕩平)과 개혁을 완수하느냐, 당쟁의 늪에 도로 빠지느냐',
      '잃어버린 자신의 진짜 출생(出生)과 가문의 정통성',
      '나라를 위한 대의(大義)냐, 살아남기 위한 굴신(屈身)이냐',
    ],
  },
  {
    key: 'clash', label: '충돌·국면', icon: '⚔️', desc: '어떻게 부딪치는가',
    faces: [
      '어전(御前)에서 상소와 논리로 정적을 무너뜨리는 말의 전쟁이 벌어진다',
      '경연(經筵)·예송(禮訟)에서 고사(故事)와 경전을 인용해 끝장 설전을 벌인다',
      '거사의 밤, 군사를 일으켜 궁궐을 장악하고 옥새를 거머쥔다',
      '의금부 추국청에서 친국(親鞫)이 열려 자백과 결백이 칼끝에서 갈린다',
      '왜군과의 결전, 열세를 진법(陣法)과 전술로 단숨에 뒤집는다',
      '남한산성에서 농성하다 끝내 성문을 열고 삼배구고두에 이른다',
      '암행어사가 마패를 들어 출도(出道)하며 탐관오리를 일거에 친다',
      '간택의 자리에서 가문의 명운을 건 규수들이 보이지 않게 겨룬다',
      '한밤중 익명서·고변이 오가며 역모의 그물이 조여든다',
      '환국의 어명 한 장에 집권당이 통째로 갈려 나간다',
      '봉수가 거짓으로 올라 조정이 마비되고 적이 그 틈을 파고든다',
      '파발과 장계(狀啓)가 늦게 닿아 전세를 그르치는 정보의 지연이 닥친다',
      '대비의 수렴(垂簾) 너머 한마디로 임금이 폐위되거나 세워진다',
      '왕의 밀지를 받든 친위 세력이 한밤에 정적의 집을 덮친다',
      '천주학 신자들을 잡아들이는 옥사(獄事)가 가문을 통째로 휩쓴다',
      '미복(微服)으로 잠행하던 왕이 저잣거리에서 정체를 들킬 위기에 처한다',
      '미래지식으로 만든 신무기·신작물이 어전에서 시험대에 오른다',
      '사초(史草) 한 줄을 두고 사관과 권신이 목숨을 건 다툼을 벌인다',
      '조공·국서의 외교 자리에서 한마디 실언이 전쟁의 빌미가 된다',
      '거사 직전 동지의 밀고로 거병(擧兵)이 발각될 위기에 몰린다',
      '대비·왕비·후궁이 내전에서 보이지 않는 칼날을 주고받는다',
      '연좌의 그물이 죄 없는 일가(一家)에까지 뻗쳐 가문이 풍비박산 난다',
      '어전회의에서 왕과 신하가 정면으로 부딪쳐 정국이 얼어붙는다',
      '굶주린 백성이 관아로 몰려들어 민란(民亂)의 불씨가 댕겨진다',
      '회귀자만 아는 미래의 변곡점이 닥쳐, 한 수로 역사가 갈린다',
      '의병(義兵)을 일으켜 향촌의 백성과 함께 적과 맞선다',
      '왕세자 책봉을 두고 상소가 빗발쳐 조정이 둘로 갈린다',
      '독이 든 수라(水刺)·약(藥)을 가려내며 어실(御室)에서 사투가 벌어진다',
      '교지(敎旨)·옥새의 진위(眞僞)를 두고 정통성 다툼이 폭발한다',
      '예고된 처형의 날, 사약과 신원 사이에서 마지막 반전이 인다',
      '향촌 유림이 만인소(萬人疏)를 올려 조정을 거세게 압박한다',
      '통신사의 객관에서 첩보와 음모가 칼날처럼 오간다',
    ],
  },
  {
    key: 'twist', label: '반전·운명', icon: '🌀', desc: '무엇이 뒤집히는가',
    faces: [
      '가문을 멸문시킨 원수가 다름 아닌 가장 믿었던 스승이었다',
      '충신으로 알았던 재상이 모든 비극을 설계한 진짜 흑막이었다',
      '폐비의 아들로 알려진 임금이 실은 다른 핏줄이었다',
      '회귀로 막으려던 사화·전쟁이, 도리어 자신의 손으로 앞당겨졌다',
      '왕의 밀지가 사실은 정적이 꾸민 위조 교지였다',
      '죽은 줄 알았던 세자가 천민의 신분으로 숨어 살아 있었다',
      '거사를 밀고한 변절자가, 실은 왕이 심어 둔 충신이었다',
      '간택에서 떨어진 규수가 사실 옥좌를 좌우할 핵심 인물이었다',
      '예언처럼 떨어진 별(星)은 멸망이 아니라 새 임금의 즉위를 가리켰다',
      '독자는 알고 인물은 모르는 운명 — 이순신은 끝내 전장에서 진다',
      '미래지식의 기억이 사실은 적이 심어 놓은 거짓이었다',
      '구하려던 가족이 이 사건의 진짜 배후였다',
      '명을 향한 사대의 의리를 외친 자가, 뒤로는 청과 내통하고 있었다',
      '왕을 폐하려던 대비가, 실은 왕을 지키려 일부러 칼을 들었다',
      '회귀는 이번이 처음이 아니라 이미 여러 번째였다',
      '천주학을 빌미로 한 옥사의 진짜 목적은 토지·재산의 강탈이었다',
      '거짓 고변의 증거가 도리어 고변자 자신을 역적으로 가리켰다',
      '서얼이라 멸시받던 자가 실은 선왕이 숨겨 둔 적통(嫡統)이었다',
      '왕의 적자를 노린 독은, 가장 가까운 충신의 손에서 나왔다',
      '사화를 일으킨 사초 한 줄은 사관이 일부러 남긴 미끼였다',
      '복수의 대상이 이미 오래전 자신을 한 번 살린 은인이었다',
      '봉수를 거짓으로 올린 내응이 다름 아닌 아군의 장수였다',
      '삼전도의 굴욕을 자청한 왕의 진의는 백성을 살리려는 고육책이었다',
      '죽은 정혼자가 적의 가면 뒤에서 살아 숨 쉬고 있었다',
      '폐세자를 키운 양부가 곧 그를 폐위시킨 장본인이었다',
      '거사의 명분으로 내건 교지가 처음부터 백지(白紙)였다',
      '뒤주에 갇힌 세자를 살릴 열쇠를 쥔 자는 정작 그를 미워한 부왕이었다',
      '환국의 진짜 설계자는 왕도 신하도 아닌, 발 너머의 대비였다',
      '천재지변을 빌미로 왕을 흔든 천변(天變)은 인위로 꾸며진 것이었다',
      '진명(眞名)·정통을 되찾는 순간, 잊었던 죄(罪)까지 함께 돌아왔다',
      '미래를 바꾼 줄 알았으나, 역사는 다른 길로 같은 결말에 이르렀다',
      '마지막에 붓을 거둔 사관이, 처음부터 모든 것을 알고 있었다',
    ],
  },
  {
    key: 'cost', label: '대가·여파', icon: '🩸', desc: '무엇을 잃거나 남기는가',
    faces: [
      '대의(大義)는 지켰으나 연좌(連坐)로 일가가 사사(賜死)된다',
      '역모로 몰린 끝에 위리안치(圍籬安置)되어 사약을 기다린다',
      '승리했으나 충신들의 목이 저잣거리에 내걸린다',
      '사화의 피바람이 멎되, 사림 한 세대가 통째로 스러진다',
      '왜란을 막아 냈으나, 그 영웅은 끝내 전장에서 숨을 거둔다',
      '삼전도의 굴욕을 견뎌 백성을 살리되, 세자는 인질로 끌려간다',
      '왕권을 세웠으나, 그 대가로 가장 가까운 핏줄을 베어야 한다',
      '반정(反正)에 성공했으나, 새 임금 역시 같은 권신들에 둘러싸인다',
      '미래지식으로 개혁을 이루되, 나비효과로 또 다른 비극이 싹튼다',
      '간언을 굽히지 않은 대가로 삭탈관직(削奪官職)되어 유배 길에 오른다',
      '폐세자를 구하지 못한 채, 뒤주의 비극이 끝내 되풀이된다',
      '진실을 사초에 남긴 대가로 사관 자신이 처형된다',
      '환국으로 정권을 잡되, 다음 환국에 똑같이 쓸려 나갈 씨앗을 심는다',
      '천주학 신자를 구하려다 가문 전체가 사학죄인(邪學罪人)으로 멸문된다',
      '복수를 완성한 자의 손에 남은 것은 텅 빈 가문과 폐허뿐이다',
      '명분은 얻었으나, 살아남은 백성의 원성(怨聲)이 등 뒤를 따른다',
      '거사가 실패해, 함께한 동지들이 능지처참(陵遲處斬)에 처해진다',
      '왕을 지켰으나, 그 충성의 이름은 사책(史冊)에서 지워진다',
      '독으로부터 적자를 구하되, 자신은 그 독을 대신 들이켠다',
      '회귀의 마지막 기회를 다 써, 다음은 없는 생(生)이 된다',
      '신원(伸寃)은 이루었으나, 죽은 이는 끝내 돌아오지 않는다',
      '왕비의 폐출은 막았으나, 그 대가로 외척의 빚을 짊어진다',
      '북방의 진(鎭)을 지켜 내되, 한 세대의 장정(壯丁)이 흙이 된다',
      '개혁을 완수한 군주는, 그 무게에 청춘과 천수(天壽)를 함께 바친다',
      '정통을 되찾은 순간, 지금까지의 자아와 인연이 흩어진다',
      '거짓 고변을 뒤집되, 누명을 씌운 자는 끝내 처벌을 피한다',
      '의병을 일으켜 적을 막되, 향촌 하나가 통째로 잿더미가 된다',
      '왕좌에 올랐으나, 곁에서 함께 거사한 이들은 모두 토사구팽(兎死狗烹)된다',
      '탕평을 이루되, 그 임금이 떠난 뒤 당쟁의 불씨가 되살아난다',
      '사약을 받든 충신의 마지막 한마디가 후대의 사초에 길이 남는다',
      '굴신(屈身)으로 나라는 보전했으나, 평생 비겁자라는 오명을 쓴다',
      '역사를 바꾼 줄 알았으나, 끝내 막지 못할 운명을 받아들인다',
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

// 굴린 결과들을 자연스러운 사극 사건 전개 단락으로 엮는다(의미 단위 조립).
function compose(by: Record<string, string>): string {
  const { spark, stage, power, foe, who, stake, clash, twist, cost } = by
  const parts: string[] = []
  // 1) 발단 + 무대(왕대·공간)
  if (spark) parts.push(stage ? `${stage}에서, ${spark}` : spark)
  else if (stage) parts.push(`${stage}에서, 시대의 풍파가 인다`)
  // 2) 권력 구조의 법칙
  if (power) parts.push(`이 조정을 가르는 권력의 법칙은 — ${power}`)
  // 3) 휘말리는 인물 + 정적·재앙
  if (who) {
    if (foe) parts.push(`${who}이(가) ${foe}에 맞서게 된다`)
    else parts.push(`그 풍파 한가운데에 ${who}이(가) 선다`)
  } else if (foe) {
    parts.push(`${foe}이(가) 조정과 강토를 위협한다`)
  }
  // 4) 명분·판돈
  if (stake) parts.push(`걸린 것은 ${stake}`)
  // 5) 충돌·국면
  if (clash) parts.push(`마침내 ${clash}`)
  // 6) 반전·역사적 운명
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

export default function HistoryEventForge({ payload }: { payload?: Record<string, unknown> }) {
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
      title: `🏯 사극 사건 — ${story.slice(0, 26)}${story.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: {
        발단: byKey.spark || '—',
        무대: byKey.stage || '—',
        권력구조: byKey.power || '—',
        정적: byKey.foe || '—',
        명분: byKey.stake || '—',
        장르: '역사·사극',
      },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 사건을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[사극 사건] ${text}`,
      source: '사극 사건 대장간',
      tags: ['글감', '사건', '역사·사극', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `🏯 사극 사건 — ${s.text.slice(0, 26)}${s.text.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      meta: { 장르: '역사·사극' },
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
        <b>전조·시대·권력·정적·인물·명분·충돌·반전·대가</b> 아홉 슬롯을 골라 굴리면, 사극 한 국면이 되는 사건 전개로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🏯"/> 생성
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
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🏯"/> 사건 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 사극 사건이 단조됩니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="🏯"/> 생성 / 다시 굴리기</button>
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
            <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker', { genre: '역사·사극' })} title="시대착오 검사기 열기"><Emoji e="⏳"/> 고증 검사</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '역사·사극' })} title="플롯 피라미드 열기"><Emoji e="📐"/> 플롯 피라미드</button>
            <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '역사·사극' })} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '역사·사극' })} title="세계관 위키 열기"><Emoji e="📖"/> 세계관 위키</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '역사·사극' })} title="캐릭터 생성기 열기"><Emoji e="🧬"/> 인물 생성</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 사극 사건을 모아보세요.</span>
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
      <div style={hint}>사건 전개는 출발점일 뿐입니다. 같은 조합이라도 왕대·당파·신분 제약에 맞춰 자유롭게 비트세요. (정통 역사소설이라면 운명의 무게·비극의 완성으로, 회귀빙의 사극이라면 미래지식의 제약과 사이다의 균형으로) <Emoji e="⏳"/> 고증 검사로 시대착오를 점검하세요.</div>
    </div>
  )
}
