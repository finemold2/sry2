// 역사·사극 갈등·딜레마 단조소(鍛造所) — 역사·사극 장르 도시에에 근거한 갈등 구도 슬롯 조합 생성기.
//  시대·왕대(분위기) · 신분에 매인 주체 · 명분에 건 욕망 · 권력 구조의 장애물 · 정치 지형(당쟁/외척) ·
//  역사적 분기점(사건) · 운명에 걸린 것(연좌·사사) · 충효의 딜레마 · 드라마틱 아이러니(역사적 비틀기) · 무대(하위장르)
//  슬롯별 🔒 잠금 + 부분 재생성, 전체 조합수 표시(1조 이상). 결과를 한 단락 갈등 문장으로 조립(사료체 빌드업).
//  연계: addToProject(folder:'갈등') 문서 추가 · addToLibrary('snippets') 글감 저장 · 관련 도구 열기.
//  자급식: react · './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:history-conflictforge'.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-conflictforge', name: '사극 갈등 단조소', icon: '⚔️', group: '생성기', genre: '역사·사극', intro: '신분·당쟁·명분·연좌·역사적 분기점으로 사극다운 갈등과 충효의 딜레마를 무작위 단조', w: 600, h: 720 }

// ── 역사·사극 도시에 기반 슬롯 풀(장르 특화·구체) ──
// 1) 시대·왕대(분위기) — 왕대 선택으로 당파·사건·공기가 결정됨(도시에 §8 '왕대 프리셋')
const ERA = [
  '태조~태종 조 · 개국과 왕자의 난, 신권과 왕권이 칼끝에서 갈리던 때',
  '세종 조 · 성군의 치세 이면, 집현전·훈민정음을 둘러싼 보이지 않는 견제',
  '단종~세조 조 · 계유정난과 사육신, 충(忠)이 곧 죽음이던 비극의 시대',
  '연산군 조 · 무오·갑자사화, 광기 어린 폭정과 숨죽인 사림의 시대',
  '중종 조 · 반정으로 세운 임금, 조광조의 개혁과 기묘사화의 좌절',
  '명종 조 · 문정왕후 수렴청정과 외척 윤원형, 을사사화의 피바람',
  '선조 조 · 동서분당의 시작과 임진왜란, 나라가 통째로 무너지던 7년',
  '광해군 조 · 명·청 사이 줄타기 외교와 폐모살제, 인조반정의 전야',
  '인조 조 · 정묘·병자호란, 삼배구고두의 치욕과 소현세자의 비극',
  '효종 조 · 북벌의 꿈과 현실, 청에 대한 복수심이 끓던 와신상담의 시대',
  '숙종 조 · 경신·기사·갑술 환국, 하룻밤에 권력이 뒤집히던 환국 정치',
  '영조 조 · 탕평과 노소론의 대립, 사도세자를 뒤주에 가둔 임오화변',
  '정조 조 · 규장각과 화성, 개혁군주와 노론 벽파의 마지막 줄다리기',
  '순조~철종 조 · 세도정치의 절정, 안동 김씨가 왕을 갈아치우던 시대',
  '고종 조 · 흥선대원군과 명성황후, 열강이 몰려들던 대한제국의 황혼',
  '가상 왕조(대월·가상 조선) · 고증 부담을 던 채 정치·로맨스·성장이 펼쳐지는 무대',
  '여말선초 · 고려가 저물고 새 왕조가 칼로 세워지던 격변의 길목',
  '고구려·백제·신라 삼국 · 영토와 패권을 두고 세 나라가 맞부딪던 시대',
]

// 2) 신분에 매인 주체 — 누구의 갈등인가, 신분의 족쇄가 걸린 인물(도시에 §3 '신분제의 무게')
const SUBJECT = [
  '폐세자의 핏줄이라는 비밀을 품고 자란 몰락 양반가의 서자',
  '미래의 기억을 안고 망나니 대군의 몸에 깨어난 회귀자',
  '아비를 사화로 잃고 복수를 벼르는, 남장한 사대부가의 외동딸',
  '천출이나 천재적 머리로 역관·중인의 벽을 넘으려는 젊은 통변',
  '폐위된 임금을 섬겼다는 죄로 변방에 위리안치된 늙은 충신',
  '왕의 총애와 중전의 견제 사이에 낀, 미천한 출신의 후궁',
  '북벌의 칼을 갈지만 임금의 의심을 사는 변방의 무관',
  '진법과 화약을 아는 현대인이 빙의한, 이름 없는 군관',
  '대비의 수렴청정 아래 허수아비로 즉위한 어린 임금',
  '간택에 들었으나 정략의 말(馬)일 뿐인 명문가 규수',
  '의술로 궁에 든 천출 의녀, 왕실의 비밀을 너무 많이 아는 자',
  '아버지가 역모로 멸문당해 노비로 전락한 옛 대감집 도령',
  '실록을 적는 사관, 권력자의 치부를 붓 끝에 쥔 위험한 증인',
  '왜·청과 내통했다는 누명을 쓴 변방의 현감',
  '암행어사의 마패를 품고 잠행에 나선 젊은 별시 장원',
  '조선 셰프가 되어 임금의 입맛을 사로잡으려는 빙의한 수라간 숙수',
  '환국으로 하루아침에 영의정에서 죄인이 된 노대신',
  '적장자가 아니라는 이유로 세자 자리를 위협받는 후궁 소생의 왕자',
  '저잣거리에서 정보를 사고파는 보부상 출신의 책략가',
  '대원군과 중전 사이에서 줄을 서야 하는 젊은 외척 자제',
  '도성의 의금부 도사, 친국의 칼날을 누구에게 겨눌지 갈리는 자',
  '환관의 몸으로 임금의 그림자가 되어 권력의 중심에 선 내관',
]

// 3) 명분에 건 욕망 — 충·효·의·대의명분으로 정당화되는 절실한 목표(도시에 §3 '명분과 의리')
const DESIRE = [
  '사화로 멸문당한 가문의 누명을 벗기고 신원(伸冤)을 받는 것',
  '미래지식으로 적폐를 갈아엎고 끝내 왕좌에 올라 대업을 이루는 것',
  '임금을 시해하려는 역모를 거사 당일 전에 막아내는 것',
  '폐위된 선왕의 정통을 되살려 어린 세손을 보위에 앉히는 것',
  '왜의 재침을 예견하고 군비를 갖춰 이번엔 나라를 지키는 것',
  '외척의 손아귀에서 임금의 친정(親政)을 되찾아 드리는 것',
  '천출의 신분을 벗고 과거에 급제해 떳떳이 가문을 일으키는 것',
  '북벌의 대업을 이루어 병자년의 치욕을 청에 되갚는 것',
  '간택을 피해 정인(情人)과 함께 도성을 떠나 자유로이 사는 것',
  '당쟁의 피바람을 끝내고 탕평으로 조정을 하나로 묶는 것',
  '실록에 진실을 적어 후세에 권력자의 죄를 남기는 것',
  '아버지를 죽인 권신을 어전에서 명분과 증거로 무너뜨리는 것',
  '굶주린 백성을 위해 환곡·세제를 개혁하고 적폐 수령을 응징하는 것',
  '왕의 총애를 지켜 제 소생을 세자로 세우고 가문을 지키는 것',
  '밀지(密旨)에 따라 임금의 정적을 은밀히 제거하는 것',
  '명·청 사이에서 나라가 짓밟히지 않도록 실리 외교를 관철하는 것',
  '잃어버린 옥새를 되찾아 정통의 정당성을 회복하는 것',
  '뒤주에 갇힐 운명의 세자를 어떻게든 살려내는 것',
]

// 4) 권력 구조의 장애물 — 욕망을 가로막는 사극 고유의 벽(도시에 §3 '권력의 작동 원리')
const OBSTACLE = [
  '왕권조차 함부로 못 하는, 언관(言官)과 예법의 빽빽한 그물',
  '조정을 장악한 외척이 임금의 눈과 귀를 모두 틀어막은 것',
  '거사를 알면서도 침묵하는, 어느 편도 들지 않는 노회한 정승',
  '천출·서얼이라는 신분의 족쇄가 모든 출셋길을 가로막는 것',
  '미래지식이 있어도 원료·장인·자본이 없어 구현되지 않는 현실',
  '명분 없는 거사라 누구도 따르지 않는, 대의(大義)의 부재',
  '임금이 이미 권신의 모함을 믿어 주인공을 의심하는 것',
  '실록과 상소가 모두 권력자의 손에 들어가 진실이 묻히는 것',
  '사대(事大)의 예법이 발목을 잡아 청·명을 거스를 수 없는 것',
  '연좌의 법이 두려워 가솔과 일족이 거사를 한사코 말리는 것',
  '왕실의 법도가 후궁 소생의 즉위를 원천 봉쇄하는 것',
  '한 당파를 치면 반드시 다른 당파가 보복하는 환국의 악순환',
  '파발과 봉수가 늦어 결정적 소식이 거사 뒤에야 닿는 것',
  '의금부의 친국과 고변(告變)이 입을 막아 누구도 진실을 못 말하는 것',
  '믿었던 후원자(대감·임금)가 정쟁의 바람 따라 등을 돌리는 것',
  '간언이 통하지 않는 폭군, 바른말을 하면 곧 사약이 내려지는 것',
  '여인의 몸이라 조정에 나설 수 없어 늘 발(簾) 뒤에 머물러야 하는 것',
  '세도가가 과거·인사를 모두 손에 쥐어 실력으로는 오를 길이 없는 것',
]

// 5) 정치 지형(당쟁·외척) — 갈등의 엔진이 되는 세력 구도(도시에 §8 '정치 지형')
const FACTION = [
  '훈구파 대 사림파 — 기득권 공신 세력과 신진 선비들의 정면충돌',
  '동인 대 서인 — 처음 갈라선 붕당이 조정을 둘로 쪼개는 시대',
  '남인 대 북인 — 동인이 다시 갈라져 피로 맞서는 환국의 전야',
  '노론 대 소론 — 세자 문제와 의리(義理)를 두고 갈린 골 깊은 대립',
  '벽파 대 시파 — 사도세자의 죽음을 둘러싼 옳고 그름의 끝없는 다툼',
  '외척 윤원형 일가 — 문정왕후를 등에 업고 조정을 농단하는 세도',
  '안동 김씨 세도 — 왕마저 갈아치우는 한 가문의 무소불위 권력',
  '대원군 대 중전 민씨 — 시아버지와 며느리, 두 권력의 골육상쟁',
  '왕권파 대 신권파 — 임금을 세우려는 자와 신하가 다스리려는 자',
  '대북파 대 서인 — 폐모살제를 두고 갈린, 반정으로 치닫는 대립',
  '척화파 대 주화파 — 청과 싸울 것인가 화친할 것인가, 나라의 존망을 건 논쟁',
  '환관·내명부 세력 대 외조(外朝) 사대부 — 궐 안과 궐 밖의 보이지 않는 전쟁',
  '개화파 대 위정척사파 — 문을 열 것인가 지킬 것인가, 시대를 가른 갈림',
  '공신 세력 대 종친 — 반정 뒤 논공행상과 왕통을 둘러싼 알력',
]

// 6) 역사적 분기점(사건) — 챕터 마일스톤이 되는 거대 사건(도시에 §5 '역사적 분기점')
const EVENT = [
  '사화(士禍) — 선비들이 무더기로 죽어나가는 피의 숙청',
  '반정(反正) — 임금을 끌어내리고 새 왕을 세우는 정변의 거사',
  '환국(換局) — 하룻밤에 집권 당파가 통째로 뒤집히는 정치적 지진',
  '임진왜란 — 왜군이 밀려와 도성과 임금이 버려지는 7년 전쟁',
  '병자호란 — 청이 쳐들어와 남한산성에서 임금이 무릎 꿇는 치욕',
  '계유정난 — 수양대군이 조카의 자리를 빼앗는 골육의 정변',
  '왕자의 난 — 형제가 칼을 들어 보위를 다투는 개국 초의 비극',
  '임오화변 — 임금이 친아들 세자를 뒤주에 가두어 죽이는 참변',
  '간택과 정략혼 — 한 혼인이 권력의 판도를 통째로 뒤바꾸는 정치극',
  '역모 고변(告變) — 거짓이든 진실이든, 한 장의 밀고가 일족을 멸하는 일',
  '세자 책봉을 둘러싼 다툼 — 누가 다음 보위를 잇는가의 사활을 건 싸움',
  '대비의 수렴청정 — 어린 임금 뒤에서 여인이 천하를 쥐는 시기',
  '양위 파동 — 임금이 자리를 내놓겠다며 신하들의 충심을 시험하는 정치 술수',
  '실록·사초(史草)를 둘러싼 옥사 — 붓으로 적힌 진실이 사람을 죽이는 사건',
  '봉수·파발의 거짓 보고 — 늦거나 조작된 소식이 전세를 뒤집는 정보전',
  '대동법·균역법 개혁 — 세제를 둘러싸고 기득권과 백성이 맞부딪는 격변',
]

// 7) 운명에 걸린 것 — 실패의 대가, 판돈을 극대화(도시에 §4 '연좌·삼족·사약')
const STAKES = [
  '역모로 몰려 삼족이 멸하고 가문이 대가 끊긴다',
  '사약이 내려져 죄인의 이름으로 죽고 후세에 역적으로 남는다',
  '연좌의 법에 따라 처자식이 노비로 끌려간다',
  '위리안치되어 가시울타리 안에서 잊힌 채 늙어 죽는다',
  '국문과 친국 끝에 거짓 자백을 토하고 동지들까지 끌고 들어간다',
  '폐세자가 되어 정통에서 지워지고 평생 죄인의 자식으로 산다',
  '나라가 왜·청의 말발굽에 짓밟히고 백성이 도륙당한다',
  '임금이 시해되어 종묘사직이 무너지고 새 세상이 칼 위에 선다',
  '사화가 일어나 사림 한 세대가 통째로 죽어 학맥이 끊긴다',
  '정인(情人)이 정략의 제물로 다른 가문에 보내진다',
  '진실을 적은 사초가 불태워지고 역사가 거짓으로 덧칠된다',
  '뒤주에 갇힌 세자가 끝내 굶어 죽고 다음 대까지 화가 미친다',
  '외척이 권력을 굳혀 임금은 영영 허수아비로 전락한다',
  '잃은 옥새가 정적의 손에 들어가 찬탈의 명분이 된다',
  '복수를 이루지 못한 채 원수가 천수를 누리고 영화를 누린다',
  '나라가 망해 임금이 폐위되고 사직이 남의 손에 넘어간다',
  '개혁이 좌절되어 굶주린 백성이 민란으로 들고 일어난다',
  '북벌의 꿈이 헛되이 무너지고 치욕만 대물림된다',
]

// 8) 충효의 딜레마 — 둘 다 가질 수 없는 선택(도시에 §3 명분 충돌 · §6 '운명의 수용')
const DILEMMA = [
  '충(忠)을 지키면 아비의 원수를 섬겨야 하고, 효(孝)를 따르면 역적이 된다',
  '임금의 그릇된 명을 거역하면 불충이요, 따르면 무고한 이가 죽는다',
  '가문을 살리려면 동지를 밀고해야 하고, 의리를 지키면 일족이 멸한다',
  '사랑하는 이를 지키려면 정략혼을 받아들여 권력에 굴복해야 한다',
  '진실을 사초에 적으면 죽고, 붓을 굽히면 역사가 거짓이 된다',
  '백성을 살리는 개혁은 임금의 사람들을 적으로 돌려세운다',
  '미래를 바꾸면 역사가 어긋나고, 두면 아는 비극이 그대로 닥친다',
  '반정에 가담하면 새 세상이 열리나, 한 번 든 칼은 임금을 베야 끝난다',
  '청에 무릎 꿇으면 나라는 살고, 끝까지 싸우면 백성이 도륙된다',
  '세자를 살리려면 임금을 거스르고, 임금을 따르면 핏줄을 죽인다',
  '복수를 이루는 순간, 자신이 증오하던 그 권신과 똑같아진다',
  '대의(大義)를 따르면 정인을 버려야 하고, 사랑을 택하면 만백성을 저버린다',
  '밀지를 따르면 무고한 정적을 베고, 거역하면 임금을 배신한다',
  '신분을 숨기면 살아남고, 정체를 밝히면 사랑하는 이를 지킬 수 있다',
  '환국에 올라타면 출세하고, 명분을 지키면 죄인으로 몰린다',
  '왜·청과의 내통을 폭로하면 나라는 깨끗해지나, 제 가문도 함께 무너진다',
]

// 9) 드라마틱 아이러니(역사적 비틀기) — 독자는 결말을 알고 인물은 모른다(도시에 §4 장치 · §6 비극의 완성)
const TWIST = [
  '독자는 안다 — 그가 충성을 바친 세자가 결국 뒤주에서 죽으리란 것을',
  '그토록 막으려던 반정이, 사실 그 자신이 첫 단추를 끼운 일이었다',
  '역적으로 몰아 죽인 자가, 끝내 보니 단 하나 진실을 말한 충신이었다',
  '미래지식으로 바꾼 역사가, 더 끔찍한 결말로 나비처럼 돌아온다',
  '평생 섬긴 임금이, 처음부터 그의 가문을 멸한 장본인이었다',
  '구하려던 옥새는 가짜였고, 진짜는 줄곧 정적의 품에 있었다',
  '밀고자를 쫓았으나, 그 밀고자는 가장 믿었던 혈육이었다',
  '왕좌에 올랐으나, 그 자리가 곧 그가 증오하던 폭군의 자리였다',
  '복수를 끝낸 그 칼이, 실은 선왕이 그에게 남긴 마지막 명이었다',
  '독자는 안다 — 그가 막으려는 전쟁이 끝내 7년을 삼키리란 것을',
  '정인을 지키려 한 선택이, 오히려 정인을 사지(死地)로 몰아넣는다',
  '회귀했으나 바뀐 건 자신뿐, 역사는 더 교묘히 같은 자리로 흘러간다',
  '충신으로 사초에 남으려 했으나, 승자가 역사를 다시 써 역적이 되었다',
  '간신이라 베려던 자가, 사실 임금을 지켜온 마지막 방패였다',
  '대업을 이룬 그 순간, 자신을 따르던 동지들이 모두 등을 돌린다',
  '살려낸 세손이, 자라서 그의 일족을 멸하는 임금이 된다',
  '승전의 영광 뒤, 공을 시기한 임금이 그에게 사약을 내린다',
  '아는 결말을 피했다 믿었으나, 운명은 다른 문으로 같은 비극을 들인다',
]

// 10) 무대(하위장르) — 갈등이 펼쳐지는 사극의 무대(도시에 §1 하위장르 지도)
const STAGE = [
  '실존 인물·사건을 고증하는 정통 역사소설(칼의 노래·남한산성 류)',
  '권력투쟁·당쟁·궁중암투가 핵심인 사극·궁중물(정도전·여인천하 류)',
  '"만약 그때 ~했다면"의 분기를 다루는 대체역사(비명을 찾아서 류)',
  '현대인이 과거에 회귀·빙의해 역사를 바꾸는 웹소설형 사극',
  '실존 국가를 모델로 한 가상 왕조 퓨전 사극(고증 부담 회피)',
  '왕·세자·무관과의 신분 격차 로맨스를 그린 궁중 로맨스',
  '역사적 사건을 무림 음모로 재해석한 무협·역사 혼합물',
  '가상 인물과 실존 사건을 엮은 팩션(faction, 뿌리깊은 나무 류)',
  '가문·민중사를 굵게 그리는 대하 역사소설(토지·장길산 류)',
  '어전회의·상소 설전이 클라이맥스가 되는 정치 대사극',
  '암행어사·잠행하는 임금의 신분 위장·암행물',
  '간택·후궁 간 암투를 그린 내명부 궁투(宮鬪)물',
]

interface Slot { key: string; label: string; icon: string; pool: string[] }
const SLOTS: Slot[] = [
  { key: 'era', label: '시대·왕대', icon: '🏯', pool: ERA },
  { key: 'subject', label: '신분에 매인 주체', icon: '👤', pool: SUBJECT },
  { key: 'desire', label: '명분에 건 욕망', icon: '🎯', pool: DESIRE },
  { key: 'obstacle', label: '권력 구조의 장애물', icon: '🧱', pool: OBSTACLE },
  { key: 'faction', label: '정치 지형(당쟁·외척)', icon: '⚖️', pool: FACTION },
  { key: 'event', label: '역사적 분기점', icon: '⚡', pool: EVENT },
  { key: 'stakes', label: '운명에 걸린 것', icon: '☠️', pool: STAKES },
  { key: 'dilemma', label: '충효의 딜레마', icon: '🤺', pool: DILEMMA },
  { key: 'twist', label: '드라마틱 아이러니', icon: '🎭', pool: TWIST },
  { key: 'stage', label: '무대(하위장르)', icon: '📜', pool: STAGE },
]

// 조합수 = 각 슬롯 풀 크기의 곱(1조 이상 지향)
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1)

const LS_KEY = 'sry:tool:history-conflictforge'
const ri = (n: number) => Math.floor(Math.random() * n)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[ri(a.length)]
  if (avoid !== undefined && v === avoid) v = a[ri(a.length)]
  return v
}

type Result = Record<string, string>

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 단락 갈등 문장 조립 — 사료체 빌드업(시대→인물→욕망→벽→정쟁→사건→딜레마→대가→운명) 순으로.
function summarize(r: Result): string {
  const era = (r.era || '').replace(/[.。]$/, '')
  const subj = (r.subject || '주인공').replace(/[.。]$/, '')
  const desire = (r.desire || '무언가').replace(/[.。]$/, '')
  const obstacle = (r.obstacle || '').replace(/[.。]$/, '')
  const faction = (r.faction || '').replace(/[.。]$/, '')
  const event = (r.event || '').replace(/[.。]$/, '')
  const stakes = (r.stakes || '').replace(/[.。]$/, '')
  const dilemma = (r.dilemma || '').replace(/[.。]$/, '')
  const twist = (r.twist || '').replace(/[.。]$/, '')
  let s = era ? `때는 ${era}.` : ''
  s += ` ${subj}은(는) ${desire}을(를) 갈망한다.`
  if (faction) s += ` 그러나 조정은 ${faction}의 소용돌이 속에 있고,`
  if (obstacle) s += ` ${obstacle}이(가) 길을 가로막는다.`
  if (event) s += ` 마침내 ${event}이(가) 모든 것을 시험대에 올린다.`
  if (dilemma) s += ` 그는 끝내 선택을 강요받는다 — ${dilemma}.`
  if (stakes) s += ` 한 번 어긋나면, ${stakes}.`
  if (twist) s += ` 그리고 독자만은 안다 — ${twist}.`
  return s.trim()
}

// 저장된 즐겨찾기(고정 조합) 항목
interface Saved { id: string; result: Result; createdAt: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : Array.isArray(p) ? p : []
    return arr
      .filter((x: any) => x && typeof x === 'object' && x.result && typeof x.result === 'object')
      .map((x: any) => ({ id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))), result: x.result as Result, createdAt: Number(x.createdAt) || Date.now() }))
  } catch { return [] }
}

export default function HistoryConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreLabel = typeof payload?.genre === 'string' ? (payload.genre as string) : '역사·사극'

  const [result, setResult] = useState<Result>(() => {
    const r: Result = {}
    SLOTS.forEach((s) => { r[s.key] = pick(s.pool) })
    return r
  })
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [toast, setToast] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화 — 차단/용량초과 graceful
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  const rollAll = useCallback(() => {
    setRolling(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pick(s.pool, prev[s.key]) })
      return next
    })
  }, [locked])

  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setResult((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  const summary = summarize(result)

  const plainText = () => {
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${result[s.key]}`).join('\n')
    return `[역사·사극 갈등]\n${lines}\n\n✍️ ${summary}`
  }

  const copy = () => {
    const text = plainText()
    const done = () => { if (mounted.current) setToast('복사했습니다') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 즐겨찾기 저장(현재 조합 고정)
  const star = () => {
    setSaved((prev) => [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), result: { ...result }, createdAt: Date.now() }, ...prev].slice(0, 40))
    setToast('즐겨찾기에 저장했습니다')
  }
  const loadSavedItem = (s: Saved) => { setResult({ ...s.result }); setLocked({}); setToast('불러왔습니다') }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // 연계: 갈등 글감을 라이브러리 스니펫으로
  const toSnippet = () => {
    addToLibrary('snippets', { text: summary, source: '사극 갈등 단조소', tags: ['역사·사극', '갈등', result.stage || ''].filter(Boolean) })
    setToast('글감 라이브러리(스니펫)에 저장했습니다')
  }

  // 연계: 프로젝트 자료 〈갈등〉 폴더에 문서로
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다'); return }
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(result[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(summary)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const title = `사극 갈등 — ${(result.era || '시대').slice(0, 18)}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title, bodyHtml, synopsis: summary,
      meta: { 장르: genreLabel, 시대: (result.era || '—').slice(0, 30), 정치지형: (result.faction || '—').slice(0, 30), 사건: (result.event || '—').slice(0, 30), 딜레마: (result.dilemma || '—').slice(0, 40) },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가하지 못했습니다')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', background: 'var(--paper)', overflow: 'auto' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️"/></span>
        <strong style={{ fontSize: 14 }}>사극 갈등 단조소</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="모든 슬롯 풀 조합의 경우의 수">
          약 {COMBOS.toLocaleString()} 조합
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        신분의 족쇄·당쟁·명분·연좌·역사적 분기점 등 역사·사극 도시에에 근거한 갈등 슬롯을 굴립니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={slotRow}>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {rolling && !isLocked ? '…' : result[s.key]}
                </div>
              </div>
              <button className="minibtn" title={isLocked ? '고정 해제' : '이 슬롯 고정'} onClick={() => toggleLock(s.key)} style={{ flexShrink: 0, padding: '2px 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={isLocked} style={{ flexShrink: 0, padding: '2px 6px' }}><Emoji e="🎲"/></button>
            </div>
          )
        })}
      </div>

      {/* 조합 한 단락 요약 */}
      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝"/> 갈등 한 단락 요약</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{summary}</div>
      </div>

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="⚔️"/> 갈등 단조하기</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={star} title="현재 조합을 즐겨찾기에 저장"><Emoji e="⭐"/> 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 글감 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { character: result.subject, desire: result.desire, obstacle: result.obstacle, stakes: result.stakes })} title="갈등 설계기로 보내 더 다듬기"><Emoji e="⚔️"/> 갈등 설계기</button>
        <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker')} title="시대착오 점검으로 고증 확인"><Emoji e="🏺"/> 시대착오 점검</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}

      {/* 즐겨찾기 목록 */}
      {saved.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}><Emoji e="⭐"/> 저장된 갈등 {saved.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {saved.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={summarize(s.result)}>{summarize(s.result)}</span>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }} onClick={() => loadSavedItem(s)} title="불러오기">↻</button>
                <button className="minibtn" style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
