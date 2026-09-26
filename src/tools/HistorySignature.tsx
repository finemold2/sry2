// 역사·사극 시그니처 — 한 편의 "사건·정세"를 슬롯 조합으로 대형 생성한다(조합 1조+ 지향).
//  시대/왕대 × 신분/세력 × 정치 사건 × 갈등(전란/음모/개혁) × 인물 동기 × 시대 디테일,
//  여섯 슬롯의 로컬 표(각 30~44종)에서 한 조각씩 뽑아 "어느 시대, 누가, 무슨 사건의 한복판에서,
//  어떤 갈등에 휘말려, 무엇을 위해 움직이며, 어떤 시대의 공기를 입는가"를 한 단락으로 엮는다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다. 조합 가짓수를 표시한다(1조+).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 사건·정세를 자료('research')/'플롯' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-signature', name: '역사 시그니처 생성기', icon: '🏯', group: '생성기', genre: '역사·사극', intro: '시대·신분·정치 사건·갈등·동기·시대 디테일을 슬롯 조합(1조+)으로 굴려 사건·정세를 대량 생성하세요', w: 580, h: 680 }

const LS = 'sry:tool:history-signature'

// ---- 슬롯 정의 ----
// 각 슬롯은 사건·정세의 한 축. faces = 그 축의 후보(로컬 표). 역사·사극 특화·구체적으로.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'era', label: '시대·왕대', icon: '👑', desc: '어느 시대·왕대의 공기인가',
    faces: [
      '건국 직후, 새 왕조의 명분이 아직 마르지 않은 때',
      '왕자의 난으로 골육이 피를 본 혼돈의 즉위기',
      '성군의 치세, 집현전에 등불이 꺼지지 않던 융성기',
      '계유의 칼바람이 어린 임금을 노리던 찬탈의 해',
      '폐주(廢主)의 광기가 사화로 번지던 핏빛 연간',
      '반정으로 갈아치운 새 임금의 어수선한 첫해',
      '사림과 훈구가 조정을 두 쪽 낸 당쟁의 서막',
      '왜란의 봉화가 부산진에 오르기 직전의 불안한 봄',
      '임진의 화염이 도성을 삼키고 어가가 북으로 파천하던 해',
      '명·청이 갈리는 사이, 광해의 중립외교가 시험받던 시국',
      '인조반정 직후, 친명배금의 깃발이 무겁던 시절',
      '삼전도의 굴욕이 강토를 짓누르던 병자의 겨울',
      '북벌의 칼을 갈던 효종 연간의 와신상담',
      '예송으로 상복 한 벌을 두고 조정이 갈라진 해',
      '환국이 사흘이 멀다 하고 뒤집히던 숙종의 변덕스런 치세',
      '경종을 둘러싼 노론·소론의 목숨을 건 옥사의 시기',
      '탕평의 깃발 아래 당색을 누르려던 영조의 만년',
      '뒤주에 갇힌 세자의 비극이 궐을 짓누른 임오의 여름',
      '규장각에 인재를 불러 모으던 정조의 개혁 절정기',
      '세도가의 그림자가 어린 임금을 가린 외척 천하의 연간',
      '삼정이 문드러져 민란의 횃불이 곳곳에 오르던 말세',
      '서학의 십자가가 박해의 칼날에 부서지던 사옥(邪獄)의 해',
      '개항의 흑선이 포구에 어른거리던 격변의 길목',
      '대한제국의 연호 아래 광무개혁이 숨 가쁘던 마지막 황혼',
      '삼국이 한강을 두고 칼끝을 겨누던 쟁패의 시대',
      '신라 골품의 사다리가 한 인생을 가둔 진골의 세상',
      '후삼국의 군웅이 천하를 다투던 분열의 난세',
      '벽란도에 송·아라비아 상선이 닿던 고려의 개경',
      '무신정변으로 칼이 붓을 누른 무인 집권의 시절',
      '삼별초가 바다 위에서 항몽의 깃발을 든 비장한 연간',
      '홍건적과 왜구가 변경을 짓밟던 고려 말의 황혼',
      '위화도에서 회군의 말머리가 돌려지던 운명의 분기',
      '연호와 책력이 명에 매인 사대의 한복판',
      '가뭄과 역병이 삼남을 휩쓸어 굶주림이 길을 메운 흉년',
      '문정왕후의 수렴청정 아래 외척이 권세를 휘두르던 명종 연간',
      '기묘사화로 개혁의 신진 사림이 일거에 쓸려 나간 해',
      '을사사화의 칼끝이 대윤과 소윤을 가르던 핏빛 정국',
      '정묘호란의 말발굽이 압록을 넘어 의주를 짓밟던 봄',
      '소현세자가 볼모로 심양에 끌려가 청의 그늘에 묶인 시절',
      '신유박해의 칼이 황사영 백서를 빌미로 천주교도를 도륙하던 해',
      '홍경래의 격문이 평안도 산성에 나붙던 봉기의 겨울',
      '진주민란이 삼남으로 번져 임술의 횃불이 타오르던 해',
      '병인양요의 함포가 강화를 두드리던 척사(斥邪)의 정국',
      '신미양요로 광성보가 피로 물든 통상 거부의 한복판',
      '운요호의 포성이 강화도조약의 빗장을 부수던 길목',
      '임오군란으로 구식 군졸의 분노가 도성을 뒤엎던 여름',
      '갑신정변의 삼일천하가 우정국 연회의 칼날로 시작되던 밤',
      '동학농민군의 죽창이 전주성을 향해 진군하던 갑오의 봄',
      '을미사변, 국모가 궐 안에서 시해된 통한의 새벽',
      '아관파천으로 임금이 러시아 공사관으로 몸을 피한 격변의 해',
      '계축옥사로 영창대군이 강화로 위리안치되던 광해 초의 살풍경',
      '고구려 광개토대왕의 정복 깃발이 요동을 휩쓸던 융성기',
      '백제 의자왕의 사비성이 나당연합군에 무너지던 망국의 가을',
    ],
  },
  {
    key: 'who', label: '신분·세력', icon: '🎎', desc: '누가 이야기의 한가운데 서는가',
    faces: [
      '용상에 앉았으나 신권에 손발이 묶인 젊은 임금',
      '대비의 발 뒤에서 수렴청정을 받는 어린 보위',
      '왕권을 벼리려 칼을 숨긴 야심 찬 세자',
      '간택의 문턱을 넘어 중궁에 든 외척 가문의 딸',
      '성총을 독차지하려 음모를 짜는 후궁',
      '일인지하 만인지상의 자리에 오른 노회한 영의정',
      '직언으로 사약을 각오한 사헌부 대간',
      '환국마다 살아남은 처세의 달인 노론 영수',
      '낙향하여 후학을 기르는 산림(山林)의 거유',
      '암행어사의 마패를 품고 잠행하는 젊은 어사',
      '변방 진(鎭)을 지키는 강직한 무관',
      '서얼로 태어나 재주를 펴지 못한 비운의 책사',
      '중인 역관(譯官) 가문의 명민한 셋째 아들',
      '저잣거리를 주름잡는 거상(巨商) 행수',
      '전국에 발을 뻗은 보부상 접장(接長)',
      '의술로 궐을 드나드는 내의원 어의',
      '죄인의 자식으로 노비가 된 몰락 양반',
      '관기(官妓)의 적에 묶인 재예 뛰어난 기생',
      '도성을 떠도는 의적패의 두령',
      '교지를 위조해 권세를 농단하는 권신의 청지기',
      '대궐 깊은 곳을 손바닥처럼 아는 상선(尙膳) 내관',
      '왕의 곁을 지키는 무예 별기군 출신 호위무사',
      '척화를 외치다 청에 끌려가는 강경파 신료',
      '세도가의 그늘에서 매관매직을 주무르는 외척 자제',
      '동학의 접주(接主)로 농민을 모으는 향반(鄕班)',
      '천주를 믿어 가산을 버린 양반가 부인',
      '왕실 종친이나 역모의 그림자에 묶인 군(君)',
      '대국의 사신을 맞는 접반사(接伴使)',
      '향촌의 토호로 향회를 쥐락펴락하는 좌수',
      '현대에서 이 시대로 떨어진, 미래를 아는 빙의자',
      '회귀하여 옛 패착을 되짚는, 두 번째 삶의 인물',
      '관노(官奴)였다가 공을 세워 면천을 노리는 천출',
      '폐비의 핏줄로 숨죽여 살아온 잊힌 옹주',
      '북벌의 꿈을 품고 군영을 다지는 훈련대장',
      '수렴청정으로 조정을 손에 쥔 노회한 대비',
      '국왕의 사부(師傅)로 경연을 주관하는 대제학',
      '의병을 일으켜 향리를 지킨 강직한 유생 의병장',
      '왜군에 맞서 바다를 지킨 백전노장 수군 절도사',
      '명·청을 오가며 정세를 읽는 노련한 사역원 역관',
      '궐 안 모든 처소를 관장하는 위엄 있는 제조상궁',
      '사문서를 위조해 송사를 농단하는 교활한 외지부(外知部)',
      '천문을 읽어 천변(天變)을 아뢰는 관상감 일관(日官)',
      '죄인을 추국하는 냉혹한 의금부 도사',
      '향약을 빌미로 백성을 수탈하는 탐학한 수령',
      '대국 황제의 칙서를 받든 거만한 칙사(勅使)',
      '폐세자의 옛 사부로 복위를 꿈꾸는 늙은 충신',
      '저잣거리 정보를 사고파는 한양의 거간(居間)꾼',
      '왕실 외척으로 병권을 거머쥔 도총관',
      '신분을 숨기고 잠행하는 미복(微服)의 임금',
      '면천을 약속받고 첩보를 나르는 관비(官婢)',
      '환곡을 농단해 부를 쌓은 향청의 아전',
      '대대로 어보(御寶)를 관리해 온 상서원 관원',
    ],
  },
  {
    key: 'event', label: '정치 사건', icon: '📜', desc: '어떤 사건이 판을 뒤흔드는가',
    faces: [
      '어전회의에서 상소 한 장이 조정을 두 쪽 낸다',
      '사화가 일어나 사림의 목이 무더기로 떨어진다',
      '반정의 거사가 새벽 궁문을 박차고 들이친다',
      '환국으로 하룻밤 사이 정권이 통째로 뒤집힌다',
      '간택령이 내려 권문세가가 딸을 두고 암투를 벌인다',
      '세자 책봉을 둘러싸고 두 진영이 사생결단한다',
      '역모의 고변(告變)이 올라 친국(親鞫)이 열린다',
      '폐위 논의가 비밀리에 무르익어 옥새를 노린다',
      '예송이 불붙어 상복의 등급을 두고 조정이 갈린다',
      '탕평책이 공표되어 당색의 인사를 뒤섞는다',
      '대동법 확대가 양반의 곳간을 정조준한다',
      '삼정의 문란을 캐던 암행어사의 서계가 올라온다',
      '매관매직의 장부가 사헌부 손에 넘어간다',
      '명·청 사이에서 사대의 향방을 두고 척화·주화가 격돌한다',
      '국서(國書)의 한 글자를 두고 외교가 전쟁 직전까지 간다',
      '봉수와 파발이 거짓 보고로 어긋나 조정이 혼란에 빠진다',
      '밀지(密旨)가 새어 나가 거사 계획이 탄로 난다',
      '위리안치된 종친에게 사약이 내려진다',
      '연좌의 칼날이 삼족(三族)에 미친다',
      '공명첩이 남발되어 신분의 벽이 흔들린다',
      '서원 철폐령이 사림의 본거지를 무너뜨린다',
      '천주교 박해령이 내려 십자가를 든 자들을 잡아들인다',
      '민란이 관아를 불태우고 환곡 장부를 찢는다',
      '동학의 무리가 보국안민의 깃발을 들고 봉기한다',
      '왕의 잠행 중 정체가 탄로 날 위기에 처한다',
      '과거 시험장에서 부정의 증거가 드러나 파장이 인다',
      '대비의 교지와 임금의 전교가 정면으로 충돌한다',
      '북벌 군비(軍備)의 비밀이 청의 첩자에게 새어 나간다',
      '세도 가문의 국혼(國婚)이 권력 지형을 다시 짠다',
      '실각한 권신의 복권(復權)을 둘러싸고 막후 거래가 오간다',
      '암살된 대신의 배후를 캐는 비밀 조사가 시작된다',
      '어진(御眞)이 훼손되어 불경죄의 추궁이 번진다',
      '천변(天變)이 나타나 임금의 부덕을 묻는 구언(求言) 교서가 내린다',
      '왕대비의 언문 교지가 정국을 단숨에 뒤집는다',
      '세자가 대리청정을 맡자 신료들이 줄을 다시 선다',
      '국상(國喪)을 틈타 권력의 공백을 노린 거사가 무르익는다',
      '청에 보낼 세폐(歲幣)를 두고 호조가 텅 빈 곳간을 드러낸다',
      '암행어사가 봉고파직(封庫罷職)으로 수령을 단죄한다',
      '향전(鄕戰)으로 두 문중이 서원 위패를 두고 충돌한다',
      '비변사가 군국기무를 독점해 왕권을 잠식한다',
      '왜관(倭館)에서 밀무역이 적발되어 외교 분쟁이 인다',
      '재이(災異) 끝에 대사령(大赦令)이 내려 죄인들이 풀려난다',
      '권신의 사돈 맺기로 혼맥(婚脈)이 조정을 잠식한다',
      '폐서인된 왕비의 복위 운동이 은밀히 번진다',
      '균역법 시행으로 양반의 군포 면제가 도마에 오른다',
      '능침(陵寢) 자리를 두고 풍수와 권력이 얽힌 산송(山訟)이 터진다',
      '연행에서 돌아온 사신이 청의 동향을 담은 비밀 장계를 올린다',
      '암행어사가 가져온 봉서(封書)가 한 도(道)의 수령들을 떨게 한다',
      '왕의 환후(患候)가 깊어지며 후계를 둘러싼 물밑 다툼이 격화된다',
      '사관의 사초를 빼내려는 권신과 이를 지키려는 사림이 충돌한다',
      '대보단(大報壇) 제향을 두고 사대 명분이 다시 도마에 오른다',
      '도성에 괴문서(掛書)가 나붙어 민심이 흉흉해진다',
      '진휼청이 문을 열어 굶주린 유민(流民)이 도성으로 몰려든다',
      '왕이 친히 군사를 사열하는 대열(大閱)에서 병권이 가늠된다',
      '내수사(內需司)의 노비·전답을 둘러싼 왕실과 신료의 다툼이 인다',
      '책봉 칙사가 압록을 건너와 즉위의 정통성을 시험한다',
    ],
  },
  {
    key: 'conflict', label: '갈등 축', icon: '⚔️', desc: '전란·음모·개혁, 무엇이 엔진인가',
    faces: [
      '왕권과 신권이 정면으로 부딪치는 권력의 줄다리기',
      '훈구와 사림이 명분과 자리를 두고 벌이는 진영 싸움',
      '동인·서인, 남인·북인으로 갈린 붕당의 사투',
      '노론과 소론이 임금의 후사를 두고 벌이는 옥사',
      '외척과 종친이 보위의 향방을 두고 다투는 암투',
      '왜군의 침공에 맞선 절체절명의 항전',
      '청군의 남하 앞에 척화와 주화로 갈린 결사',
      '북벌의 대의와 현실의 국력 사이의 모순',
      '미래 지식으로 적폐를 갈아엎으려는 개혁과 기득권의 반발',
      '신분의 족쇄를 깨려는 천출의 분투와 양반의 멸시',
      '적서(嫡庶) 차별에 막힌 재능과 가문의 위선',
      '대의명분과 살아남기 위한 처세 사이의 내적 갈등',
      '충(忠)과 효(孝)가 양립할 수 없게 된 비극적 선택',
      '간신의 모함과 충신의 결백 증명 싸움',
      '거상의 자본과 사대부의 명분이 충돌하는 상권 다툼',
      '백성의 굶주림과 조정의 무능이 부딪치는 민심의 폭발',
      '대국 사대의 굴종과 자주의 자존심 사이의 긴장',
      '예법의 굴레와 인간적 욕망 사이의 금기',
      '왕의 개혁 의지와 세도가의 국정 농단의 대립',
      '비밀 조직의 거사 모의와 추적자의 정보전',
      '정략혼으로 묶인 동맹과 진심 사이의 균열',
      '실학의 새 격물과 성리학 명분론의 충돌',
      '서학의 신앙과 유교 사회의 박해가 빚는 순교',
      '위조된 명령과 진짜 옥새의 정통성 다툼',
      '의병의 자발적 충의와 관군의 무력함의 대비',
      '환관·궁녀의 궁중 정보전과 외조(外朝)의 권력 다툼',
      '잊힌 출생의 비밀이 권력 지형을 뒤집는 폭로전',
      '나라를 팔려는 매국과 지키려는 의리의 마지막 대결',
      '회귀한 자가 아는 미래와 바꿔버린 역사의 나비효과',
      '구휼을 둘러싼 탐관의 횡령과 어사의 적발',
      '대비의 수렴청정과 친정(親政)을 바라는 임금의 신경전',
      '천출의 재능과 그를 쓰려는 자·막으려는 자의 다툼',
      '명분 없는 즉위를 둘러싼 정통성 시비',
      '구식 군영과 신식 별기군 사이의 차별과 반목',
      '사대(事大)의 관성과 자강(自强)을 외치는 개화파의 충돌',
      '봉수·파발의 거짓 보고가 빚는 진실과 허위의 정보전',
      '제사·예법 해석을 둘러싼 문중 간의 자존심 대결',
      '면천(免賤)을 미끼로 한 권력자의 회유와 배신의 덫',
      '왕실 어른의 명과 조정 공론(公論)이 어긋나는 충돌',
      '구휼미를 둘러싼 굶주린 백성과 닫힌 곳간의 대치',
      '연행 사신단이 들여온 신문물과 척사(斥邪) 보수의 충돌',
      '왕의 친위 세력과 비변사 대신들의 군권 다툼',
      '적장자 계승의 원칙과 능력 있는 서자 옹립론의 대립',
      '실각한 가문의 복수와 권좌를 지키려는 신흥 세력의 사투',
      '관군의 토벌과 의병·민군(民軍)의 항쟁이 빚는 비극',
      '예언·참설(讖說)을 믿는 민심과 이를 누르려는 조정의 갈등',
      '왕실 종친의 야심과 그를 경계하는 외척의 견제',
      '명에 대한 의리와 청에 대한 현실 사이의 외교적 딜레마',
    ],
  },
  {
    key: 'motive', label: '인물 동기', icon: '🕯️', desc: '무엇을 위해 그는 움직이는가',
    faces: [
      '쓰러진 가문을 다시 일으켜 세우려는 일념',
      '억울하게 죽은 아비의 누명을 벗기기 위해',
      '신분의 벽을 넘어 자신의 재능을 인정받고자',
      '사랑하는 이를 권력의 제물에서 구하려고',
      '대의(大義)를 위해 한 몸을 던지기로 결심하고',
      '왕좌에 올라 적폐를 청산하겠다는 야망으로',
      '미래의 비극을 알기에 역사를 바꾸려는 절박함으로',
      '두 번째 삶에서 같은 실패를 되풀이하지 않으려고',
      '백성의 굶주림을 끝낼 개혁을 이루기 위해',
      '무너진 나라의 국력을 길러 치욕을 갚으려고',
      '스승의 유지(遺志)를 받들어 학문을 지키려고',
      '핏줄에 새겨진 복수의 맹세를 완수하기 위해',
      '잃어버린 옥새와 정통성을 되찾으려는 집념으로',
      '간신을 끌어내려 조정을 바로 세우겠다는 충심으로',
      '연인과의 약속을 지키려 모든 것을 거는 마음으로',
      '권력의 정점에서 끝내 살아남으려는 본능으로',
      '버림받은 원한을 권세로 되갚으려는 집착으로',
      '신앙을 지키려 목숨을 내놓는 순교의 각오로',
      '가족을 인질로 잡혀 어쩔 수 없이 칼을 드는 절박함으로',
      '나라를 팔아서라도 일신의 영달을 꾀하려는 탐욕으로',
      '한 사람을 살리려 천하의 비난을 감수하려는 의로움으로',
      '뒤늦은 깨달음으로 옛 과오를 속죄하려는 마음으로',
      '왕의 신임을 얻어 가문을 지켜내려는 처세로',
      '굴욕적인 화친 대신 끝까지 싸우려는 결사항전으로',
      '천출의 자식에게는 다른 세상을 물려주려는 부정(父情)으로',
      '진실을 아는 유일한 증인으로서 입을 열기 위해',
      '잊힌 핏줄의 정체를 끝내 밝히려는 갈망으로',
      '미래 지식으로 부를 쌓아 기반을 다지려는 계산으로',
      '왕의 잠행을 도와 민생을 직접 살피려는 충정으로',
      '한 시대의 운명을 자기 손으로 매듭짓겠다는 결의로',
      '폐위된 임금을 다시 보위에 올리려는 충절로',
      '대비의 환심을 사 가문의 안위를 도모하려는 계책으로',
      '왜란의 치욕을 갚을 신무기를 만들려는 집념으로',
      '굶주린 향민을 살릴 환곡을 풀게 하려는 의기로',
      '명분 없는 권신을 탄핵해 사림의 기개를 세우려는 결기로',
      '잃어버린 적통의 자리를 되찾으려는 한(恨) 맺힌 집념으로',
      '대국의 횡포에 맞서 국체(國體)를 지키려는 자존심으로',
      '사초(史草)에 진실을 남겨 후세의 평가를 구하려는 사관의 소명으로',
      '천한 출신의 설움을 학문으로 뒤집으려는 오기로',
      '연인을 후궁 간택에서 빼내려는 절박한 사랑으로',
      '왕실의 적통을 지켜 종묘사직을 보전하려는 충절로',
      '간계로 빼앗긴 가문의 전답을 되찾으려는 집념으로',
      '폐비가 된 어머니의 한을 풀어드리려는 효심으로',
      '대국에 끌려간 동포를 속환(贖還)해 데려오려는 의리로',
      '서원의 위패를 지켜 스승의 도통(道統)을 잇겠다는 사명으로',
      '나라의 도량형과 화폐를 바로잡아 경제를 일으키려는 포부로',
      '왜란의 재발을 막을 수군과 화포를 갖추려는 선견(先見)으로',
      '천변과 흉년의 민심을 다독여 봉기를 막으려는 노심초사로',
      '왕의 밀명을 받들어 역당(逆黨)의 뿌리를 캐내려는 사명감으로',
      '오랑캐의 풍속에 물든 조정을 바로잡으려는 위정척사로',
      '신분을 숨긴 채 진실한 사랑을 지키려는 안간힘으로',
      '벼슬을 버리고 향리에서 후학을 길러 미래를 도모하려는 뜻으로',
      '권신의 약점을 쥐고 조정을 움직이려는 책략으로',
      '백성에게 글과 셈을 가르쳐 세상을 바꾸려는 계몽의 열망으로',
      '죽은 동지의 유지를 받들어 거사를 완수하려는 비장함으로',
      '국혼(國婚)으로 가문의 안위를 한 세대 더 잇겠다는 계산으로',
      '잃어버린 옛 강토를 회복하려는 웅대한 야망으로',
      '한 줄 사초에 임금의 잘못을 기록하려는 사관의 강직함으로',
    ],
  },
  {
    key: 'detail', label: '시대 디테일', icon: '🪔', desc: '어떤 시대의 공기·물건이 장면을 입히는가',
    faces: [
      '곤룡포 자락에 어린 촛불과 향연(香煙)이 떠도는 편전',
      '눈 쌓인 남한산성, 얼어붙은 군막과 헐벗은 군졸들',
      '어가가 빗속을 가르며 북으로 파천하는 진창길',
      '저잣거리 객주에 모여드는 보부상과 흥정 소리',
      '의금부 국문장의 횃불과 형틀, 자백을 강요하는 매질',
      '실록청에서 사초(史草)를 적는 사관의 붓끝',
      '봉수대에 오르는 다섯 줄기 횃불의 급보',
      '간찰(簡札)을 봉하는 인주와 밀랍의 비밀스러운 손길',
      '내의원 약탕기에서 피어오르는 탕약의 쓴 김',
      '서원 강당에 울려 퍼지는 사서삼경 읽는 소리',
      '경복궁 근정전 박석 위를 가르는 백관의 조복(朝服) 행렬',
      '한밤 궁궐 담을 넘나드는 잠행과 통금의 딱따기 소리',
      '장계(狀啓)를 든 파발마가 역참을 갈아타며 내달리는 먼지',
      '대비전 발 뒤에서 들려오는 수렴청정의 나직한 분부',
      '사약을 받든 금부도사와 위리안치 가시울타리',
      '연행(燕行) 사신단이 압록을 건너 연경으로 향하는 길',
      '저물녘 향교 마당에 드리운 유생들의 그림자',
      '호패를 검문하는 포졸과 잡혀가는 도망 노비',
      '상평통보 꾸러미가 오가는 전당포의 어두운 거래',
      '곳간을 채운 환곡 장부와 굶주린 백성의 빈 됫박',
      '왜성(倭城)을 둘러싼 화포 연기와 판옥선의 북소리',
      '청 사신을 맞는 모화관, 삼배구고두의 굴욕적 예법',
      '서학 책을 감추는 다락방과 십자고상의 희미한 불빛',
      '동학 접소에 모인 농민들의 죽창과 보국안민 깃발',
      '규장각 서가에 빼곡한 어찬(御撰) 서책과 검서관들',
      '폐비의 사가(私家)에 내려앉은 적막과 감시의 눈',
      '간택 처녀들이 늘어선 별궁, 발 너머의 품평 소리',
      '암행어사의 마패가 번뜩이고 "암행어사 출도요!" 외침',
      '가뭄에 갈라진 논, 기우제 제단의 마른 향불',
      '훈련도감 군영의 조총 사격 연습과 화약 냄새',
      '대궐 수라간의 어선(御膳)을 두고 오가는 기미(氣味) 상궁',
      '저물어 가는 도성 위로 울리는 인경(人定)의 종소리',
      '경연(經筵)에서 임금과 신하가 고사(故事)를 들어 설전하는 편전',
      '관상감 첨성대에 올라 천변을 살피는 일관(日官)의 새벽',
      '왜관 담장 너머로 오가는 은밀한 밀무역의 흥정',
      '교지를 받든 선전관(宣傳官)이 변방 진영에 당도하는 순간',
      '능행(陵幸) 행렬이 한강 배다리를 건너는 장엄한 어가',
      '향청 마당에 묶여 곤장을 맞는 도망 노비의 비명',
      '비변사 회의에 둘러앉은 대신들의 무거운 침묵',
      '연경에서 들여온 자명종과 천리경을 두고 수군대는 사대부',
      '폐궁(廢宮) 처마에 쌓인 먼지와 끊긴 향화(香火)',
      '과거 급제자의 유가(遊街) 행렬과 어사화 꽂은 사모(紗帽)',
      '환곡 분급일, 됫박을 든 백성들로 북적이는 사창(社倉) 앞마당',
      '국문장에 끌려 나온 죄인의 주리를 트는 형리(刑吏)의 손',
      '왕세자 책봉례, 면류관과 구장복(九章服)의 위엄',
      '의주 만상(灣商)과 동래 내상(萊商)이 은(銀)을 셈하는 장방(帳房)',
    ],
  },
  {
    key: 'fate', label: '결말·운명', icon: '⚖️', desc: '이 한 판이 어떤 운명으로 닫히는가',
    faces: [
      '거사는 성공하나 권좌에 오른 자가 곧 폭군이 된다',
      '주인공은 뜻을 이루지 못한 채 사약을 받고 스러진다',
      '승리의 순간, 가장 가까운 이의 배신이 드러난다',
      '역사를 바꾸려 한 노력이 더 큰 비극의 씨앗이 된다',
      '패배 속에서도 한 줄 사초(史草)에 진실이 남는다',
      '주인공이 끝내 왕좌에 올라 적폐 청산을 선포한다',
      '연좌의 칼날이 삼족에 미쳐 가문이 멸문한다',
      '굴욕적인 화친으로 목숨은 부지하나 명분을 잃는다',
      '의로운 죽음이 후대의 거사를 부르는 불씨가 된다',
      '미래 지식이 통하지 않아 역사가 제 길로 돌아간다',
      '복위에 성공하나 옛 권신들의 그림자는 여전하다',
      '진실이 묻히고 누명만이 역사에 기록된다',
      '한 사람의 희생으로 더 큰 학살을 막아낸다',
      '개혁은 좌절되고 주인공은 변방으로 유배된다',
      '회귀의 끝에서 같은 결말을 또 한 번 마주한다',
      '신분의 벽을 끝내 넘어 천출이 재상의 자리에 오른다',
      '국체는 지켰으나 사랑하는 이를 영영 잃는다',
      '간신은 응징되나 그 자리를 또 다른 야심가가 차지한다',
      '망국의 운명은 막지 못한 채 충신만 홀로 순절한다',
      '잊힌 핏줄의 정체가 밝혀지며 권력 지형이 뒤집힌다',
      '거사 직전 밀지가 새어 모두가 형장의 이슬로 사라진다',
      '왜란을 막아 역사가 전혀 다른 길로 분기한다',
      '대비의 한마디로 모든 공이 물거품이 된다',
      '백성의 봉기가 들불처럼 번져 새 시대의 문을 연다',
      '승자도 패자도 가장 소중한 것을 잃은 채 막을 내린다',
      '주인공이 모든 진실을 안 채 침묵 속에 역사에서 지워진다',
      '거짓 위에 세운 승리가 한 세대 만에 부패해 무너진다',
      '유배지에서 쓴 글이 훗날 시대를 흔드는 명문(名文)이 된다',
      '용서와 화해의 실낱같은 가능성만이 폐허에 남는다',
      '왕은 자리를 지키나 민심은 이미 등을 돌린다',
      '북벌의 꿈은 끝내 칼집에서 나오지 못한 채 묻힌다',
      '신무기가 전세를 뒤집어 변방의 위협을 영영 잠재운다',
      '대국의 책봉을 받아 정통성을 얻으나 자주는 잃는다',
      '폐세자가 끝내 복위해 옛 원한을 차례로 갚는다',
      '음모의 전모가 백일하에 드러나며 권신이 자결한다',
      '주인공은 살아남았으나 사랑하던 모든 이를 잃는다',
      '나라는 망했으되 그 정신을 잇는 후예가 살아남는다',
      '한 통의 밀서가 뒤늦게 닿아 모든 것이 어긋난다',
      '거사가 절반의 성공으로 끝나 불안한 동거가 시작된다',
      '천출의 자식이 아비가 못 이룬 꿈을 다음 대에 이룬다',
      '정변의 주역이 토사구팽되어 공신록에서 지워진다',
      '진실을 아는 사관이 끝내 붓을 꺾지 않고 죽는다',
      '화친의 굴욕 속에서도 백성의 살길은 가까스로 열린다',
      '왕의 개혁이 사후(死後)에야 비로소 빛을 본다',
      '두 진영이 공멸하고 어부지리로 제삼자가 권좌에 오른다',
      '운명을 거스른 대가로 더 무거운 비극이 되돌아온다',
      '잊혔던 충신의 명예가 한 세대 뒤 신원(伸冤)된다',
      '바꾼 역사가 또 다른 전란을 불러 회한만 남긴다',
      '모든 판이 끝난 뒤, 단 한 사람만이 그 의미를 안다',
      '왕은 끝내 친정(親政)을 이루나 그 대가로 인심을 잃는다',
      '속환해 온 동포와 함께 새 향촌 공동체를 일군다',
      '사대의 굴레를 벗을 단 한 번의 기회가 손가락 사이로 빠져나간다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 큰 수 한국어 표기(조/억/만 단위) — 조합 가짓수 1조+ 가독성.
function fmtBig(n: number): string {
  if (n >= 1e12) {
    const jo = Math.floor(n / 1e12)
    const rest = Math.floor((n % 1e12) / 1e8)
    return rest > 0 ? `${jo}조 ${rest.toLocaleString('ko-KR')}억` : `${jo}조`
  }
  if (n >= 1e8) {
    const eok = Math.floor(n / 1e8)
    const rest = Math.floor((n % 1e8) / 1e4)
    return rest > 0 ? `${eok}억 ${rest.toLocaleString('ko-KR')}만` : `${eok}억`
  }
  if (n >= 1e4) {
    const man = Math.floor(n / 1e4)
    return `${man.toLocaleString('ko-KR')}만`
  }
  return n.toLocaleString('ko-KR')
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 전체 슬롯을 모두 켰을 때의 최대 조합수(고정 표기용).
const MAX_COMBOS = SLOTS.reduce((a, s) => a * s.faces.length, 1)

// 굴린 결과들을 자연스러운 사건·정세 단락으로 엮는다(슬롯 순서 무관, 의미 단위로 조립).
function compose(by: Record<string, string>): string {
  const era = by.era, who = by.who, event = by.event, conflict = by.conflict, motive = by.motive, detail = by.detail, fate = by.fate
  const parts: string[] = []
  // 1) 시대 배경
  if (era) parts.push(era)
  // 2) 주인공 + 동기
  if (who) {
    if (motive) parts.push(`${who}이(가) ${motive} 움직인다`)
    else parts.push(`그 한복판에 ${who}이(가) 선다`)
  } else if (motive) {
    parts.push(`누군가 ${motive} 움직인다`)
  }
  // 3) 정치 사건
  if (event) parts.push(`그때 ${event}`)
  // 4) 갈등 축
  if (conflict) parts.push(`이 모든 것의 밑바닥에는 ${conflict}이(가) 도사린다`)
  // 5) 시대 디테일(장면의 공기)
  if (detail) parts.push(`장면을 채우는 것은 ${detail}이다`)
  // 6) 결말·운명
  if (fate) parts.push(`그리고 끝내, ${fate}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function HistorySignature({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
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
            id: typeof s.id === 'string' ? s.id : 'hs_' + i,
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
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
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
        id: 'hs_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
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

  // 프로젝트 본문(HTML) — 완성 사건·정세 + 슬롯별 분해.
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

  // 프로젝트 연동 — 현재 사건·정세를 자료(research)/'플롯' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: `🏯 사건·정세 — ${story.slice(0, 24)}${story.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: { 시대: byKey.era || '—', 신분세력: byKey.who || '—', 갈등축: byKey.conflict || '—', 결말운명: byKey.fate || '—' },
    })
    setToast(id ? '프로젝트 자료 〈플롯〉 폴더에 사건·정세를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건·정세를 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[사건·정세] ${text}`,
      source: '역사 시그니처 생성기',
      tags: ['글감', '역사·사극', '사건', '정세', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: `🏯 사건·정세 — ${s.text.slice(0, 24)}${s.text.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈플롯〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>시대·왕대 · 신분·세력 · 정치 사건 · 갈등 축 · 인물 동기 · 시대 디테일 · 결말·운명</b> 일곱 슬롯을 골라 굴리면, 어느 시대 누가 무슨 사건의 한복판에서 어떤 갈등에 휘말려 무엇을 위해 움직이고 어떤 공기 속에서 어떤 운명으로 닫히는지 한 편의 사건·정세로 엮어 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
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
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtBig(combos)}</b>가지
            {combos >= 1e12 ? ' (1조+ 초대형)' : combos >= 1e8 ? ' (1억+ 대형)' : ''}
            {active.length < SLOTS.length && <span> · 전 슬롯 사용 시 최대 <b>{fmtBig(MAX_COMBOS)}</b>가지</span>}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>({slot.faces.length}종)</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: face ? 'var(--text)' : 'var(--muted)' }}>
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

          {/* 완성 사건·정세 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🏯"/> 사건·정세</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 역사·사극 사건·정세가 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🏯"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건·정세를 굴려주세요' : '현재 사건·정세를 프로젝트 자료 〈플롯〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker')} title="시대착오 점검 도구 열기">
              <Emoji e="🏺"/> 시대착오 점검
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 빌더 도구 열기">
              <Emoji e="⚔️"/> 갈등 빌더
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건·정세가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 사건·정세를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건·정세를 어느 인물·국면·챕터에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건·정세를 프로젝트 자료 〈플롯〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건·정세는 출발점일 뿐입니다. 같은 조합이라도 내 인물·왕대·세계관에 맞춰 자유롭게 비틀고, 고증은 〈시대착오 점검〉으로 다듬어 보세요.</div>
    </div>
  )
}
