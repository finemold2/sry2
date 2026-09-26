// 귀족·작위·궁중 직제 사전 — 사극/판타지 궁정물을 위한 로컬 자료집.
//  동/서양 작위(공후백자남·왕족)·관직·궁중 직책·호칭·서열을 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/네트워크/미디어 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기.
//  ※ 백과 베끼기 없이 직접 작성한 요약·표현. 서사용 출발점이지 역사 고증 매뉴얼이 아니다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'nobility-titles-ref',
  name: '귀족·작위 사전',
  icon: '👑',
  group: '리서치·자료',
  intro: '동/서양 작위·왕족·관직·궁중 직책·호칭·서열을 정리해 사극·판타지 궁정물의 위계 묘사에 활용',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
interface Entry {
  name: string          // 칭호·작위·직책명
  aka?: string          // 원어·별칭·동급
  rank?: string         // 서열·등급(상대적 위치)
  who?: string          // 누가/어떤 사람이 받는가
  duty?: string         // 역할·권한·직무
  address?: string      // 호칭·경어(부를 때 쓰는 말)
  detail?: string       // 묘사 디테일·작가 메모
  pitfall?: string      // 흔한 오용·고증 함정
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(직접 작성) ----------
const CATS: CatDef[] = [
  {
    key: 'west-peer', label: '서양 5등작(귀족)', icon: '🎖️',
    note: '공·후·백·자·남으로 내려가는 다섯 등급. 서열과 호칭, 영지의 규모가 함께 떨어진다.',
    items: [
      {
        name: '공작', aka: 'Duke / Duchess(여공작)·Herzog·Duc',
        rank: '왕족 다음, 비왕족 귀족의 최상위(5등작 1위)',
        who: '대개 왕가의 방계나 가장 큰 군공을 세운 가문. 한 ‘공국(Duchy)’ 규모의 영지를 다스린다.',
        duty: '광대한 영지의 통치·징세·군 동원. 왕에 버금가는 위세로, 때로 왕권을 위협하는 지방 세력.',
        address: '“각하(Your Grace)”. 백작·후작과 달리 ‘경(Lord)’보다 높은 별격의 경칭을 쓴다.',
        detail: '문장(紋章)이 가장 화려하고, 가문의 색·짐승·구호(모토)를 두른다. 등장만으로 좌중이 비켜선다.',
        pitfall: '판타지에서 “공작님”을 “Lord”로 부르면 격하. 영어권은 “Your Grace”가 정석.',
      },
      {
        name: '후작', aka: 'Marquess / Marquis·Markgraf(변경백)',
        rank: '5등작 2위(공작 아래, 백작 위)',
        who: '본래 국경(邊境, march)을 지키는 무인 가문. 외적과 가장 먼저 부딪히는 자리.',
        duty: '변경 방어와 군사 지휘. 백작보다 넓은 권한(상비군 보유·즉결 동원)을 가진 경우가 많다.',
        address: '“후작 각하” 또는 “경(My Lord)”. 영어권은 “Lord 가문명”.',
        detail: '거친 변경의 기풍—실전적이고 무뚝뚝하며, 수도 귀족을 ‘물러터졌다’ 보는 자존심.',
        pitfall: '‘변경백(Margrave)’과 후작을 별개 작위로 쓰는 세계관도 있으니 설정을 통일할 것.',
      },
      {
        name: '백작', aka: 'Count / Earl(영국)·Graf·Comte',
        rank: '5등작 3위(가운데)',
        who: '한 ‘백작령(County)’을 다스리는 중핵 귀족. 가장 흔하고 ‘귀족’의 표준형.',
        duty: '영지 통치·재판권·징세. 왕의 지방관 성격에서 세습 영주로 굳어진 자리.',
        address: '“백작 각하”·“경”. 영국에선 남성 Earl, 부인은 Countess.',
        detail: '주인공 가문으로 즐겨 쓰이는 ‘적당한 무게’. 야망·재정난·후계 다툼의 단골 무대.',
        pitfall: '영국만 남성형이 Earl, 여성형·대륙은 Count/Countess. 섞으면 어색.',
      },
      {
        name: '자작', aka: 'Viscount / Vicomte·Vizegraf',
        rank: '5등작 4위(백작 아래, 남작 위)',
        who: '본래 백작의 대리(副)·부관에서 독립한 작위. 백작의 차남에게 주어지기도.',
        duty: '백작령의 일부나 작은 영지 관리. 권한은 제한적, 의례적 지위인 경우도 많다.',
        address: '“자작 각하”·“경”.',
        detail: '“곧 백작이 될 자”의 야심, 혹은 큰 가문의 그늘에 가린 둘째의 설움을 그리기 좋다.',
        pitfall: '자작을 ‘백작보다 높다’고 쓰는 실수가 잦다. 백작 바로 아래가 맞다.',
      },
      {
        name: '남작', aka: 'Baron / Baroness·Freiherr',
        rank: '5등작 5위(귀족의 최하위)',
        who: '왕·대영주에게 직접 봉토를 받은 최소 단위 귀족. ‘작위의 입구’.',
        duty: '작은 영지(장원 몇 곳) 운영. 상위 영주에게 군역·세를 바치는 봉신.',
        address: '“남작 각하”·“경”. 그냥 “Baron 이름”으로 부르기도.',
        detail: '벼락출세·신흥 귀족·시골 영주의 풋풋함이나 촌스러움을 그리기 좋은 자리.',
        pitfall: '‘준남작(Baronet)’은 귀족(Peer)이 아니라 그 아래 작위. 의원·상원 자격이 없다.',
      },
      {
        name: '준남작', aka: 'Baronet(Bart.)',
        rank: '귀족(5등작)의 바로 아래, 기사 위',
        who: '세습되지만 ‘귀족(Peer)’으로 치지 않는 작위. 영국 특유의 계급.',
        duty: '영지 의무는 약하고 명예 칭호 성격. 상원 의석이 없다.',
        address: '“Sir 이름”(기사처럼). 부인은 “Lady”.',
        detail: '‘귀족인 척하지만 귀족이 아닌’ 어정쩡한 계급의 콤플렉스를 그리기 좋다.',
        pitfall: '귀족과 혼동 금물. 세습 ‘Sir’이라는 점이 일반 기사와 다르다.',
      },
    ],
  },
  {
    key: 'west-royal', label: '서양 왕족·군주', icon: '👑',
    note: '왕관을 쓰는 자와 그 핏줄. 칭호의 높낮이가 곧 권력 서열이자 왕위 계승 순위.',
    items: [
      {
        name: '황제', aka: 'Emperor / Empress·Kaiser·Imperator',
        rank: '군주의 최상위. 여러 왕국·민족을 거느린 ‘왕 중의 왕’.',
        who: '제국을 다스리는 자. 정복·계승·교황의 대관 등으로 정통성을 얻는다.',
        duty: '복수의 왕·제후를 신하로 둔다. 종교·세속의 최고 권위를 함께 주장하기도.',
        address: '“폐하(Your Imperial Majesty)”. 왕의 “Your Majesty”보다 한 단계 높은 경칭.',
        detail: '쌍두 독수리, 보주(寶珠)와 홀(笏), 자줏빛 망토. 대관식의 무게가 곧 이야기.',
        pitfall: '왕(King)과 황제(Emperor)를 혼용 금물. 황제는 통상 여러 왕을 거느린다.',
      },
      {
        name: '국왕', aka: 'King / Queen(여왕)·Roi·König',
        rank: '한 왕국의 주권자. 귀족 위계의 정점.',
        who: '왕가의 적통 계승자 또는 즉위한 군주. 신의 기름부음(대관)으로 정통성을 두른다.',
        duty: '입법·전쟁 선포·작위 수여·최종 재판. 모든 봉신의 충성 서약을 받는다.',
        address: '“폐하(Your Majesty)”. 면전에선 “Sire(전하)”도.',
        detail: '왕관·옥새·대관식. ‘왕은 죽지 않는다(왕위는 끊기지 않는다)’는 관념이 줄거리를 만든다.',
        pitfall: '왕비(Queen consort)와 여왕(Queen regnant)은 권한이 전혀 다르다. 구분할 것.',
      },
      {
        name: '왕비 / 왕후', aka: 'Queen consort·Königin',
        rank: '왕의 정실 배우자. 통치권은 없으나 궁중 최고 여성.',
        who: '왕과 혼인한 여성. 외국 공주의 정략혼인 경우가 많다.',
        duty: '후계 생산·궁중 의례 주재·왕의 조언자. 친정 외척 세력의 통로가 된다.',
        address: '“왕비 폐하(Your Majesty)”.',
        detail: '왕위는 없되 영향력은 막대—섭정·외척정치·궁중 암투의 중심 인물.',
        pitfall: '‘여왕’과 헷갈리지 말 것. 왕비는 배우자, 여왕은 스스로 다스리는 군주.',
      },
      {
        name: '왕태자 / 왕세자', aka: 'Crown Prince·Dauphin(프랑스)·Prince of Wales(영국)',
        rank: '왕위 계승 1순위. 차기 군주.',
        who: '군주의 적장자(혹은 지명된 계승자).',
        duty: '제왕 수업·대리청정·의례 참석. 왕의 부재 시 섭정을 맡기도.',
        address: '“전하(Your Royal Highness)”. 나라별 고유 칭호(Dauphin 등)가 있다.',
        detail: '아버지 왕과의 긴장, 계승을 노리는 형제, 어린 나이의 무게—궁정물의 핵심 갈등.',
        pitfall: '계승 서열은 ‘남성 우선 장자상속’ 등 세계관별 규칙을 먼저 정하라.',
      },
      {
        name: '왕자 / 공주', aka: 'Prince / Princess·Prinz·Infante(스페인)',
        rank: '군주의 자녀. 왕족(Royal Highness).',
        who: '왕·왕비의 자녀. 직계 왕족.',
        duty: '계승 대기·정략혼인·군 지휘·외교 사절. 차남 이하는 ‘여분의 후계(spare)’.',
        address: '“전하(Your Royal Highness)”.',
        detail: '“왕이 될 수 없는 둘째”의 야망과 소외, 정략혼에 팔려가는 공주의 비애가 단골.',
        pitfall: '‘Prince’는 왕자이자 ‘공(公, 소국 군주)’도 뜻한다(모나코 대공 등). 문맥 주의.',
      },
      {
        name: '대공', aka: 'Grand Duke / Archduke·Großherzog',
        rank: '왕과 공작 사이. 소규모 주권국(대공국)의 군주.',
        who: '대공국을 다스리는 군주, 또는 황가의 자제(오스트리아 Archduke).',
        duty: '독립적 주권 행사(왕보다는 작은 나라). 황실의 일원으로서 의례·계승.',
        address: '“전하(Your Royal/Imperial Highness)” 혹은 “대공 전하”.',
        detail: '“왕은 아니지만 신하도 아닌” 미묘한 자존심. 강대국 사이 약소국의 줄타기를 그리기 좋다.',
        pitfall: 'Grand Duke(대공국 군주)와 Archduke(황가 자제)는 다른 칭호. 세계관에서 택일.',
      },
      {
        name: '섭정', aka: 'Regent·Protector',
        rank: '군주의 권한을 ‘대행’하는 자(임시 최고권력).',
        who: '어린 왕·병약한 왕·부재한 왕을 대신해 통치하는 자(왕대비·숙부·중신 등).',
        duty: '왕이 친정할 때까지 실권을 쥔다. 권력을 돌려주지 않으려는 유혹이 늘 따른다.',
        address: '직위에 따라 “전하”·“각하”. 본 작위에 ‘섭정’을 덧붙여 부른다.',
        detail: '“돌려줄 것인가, 빼앗을 것인가”—찬탈 서사의 화약고. 정통성 없는 권력의 불안.',
        pitfall: '섭정은 ‘대행’이지 군주가 아니다. 옥새·대관 없이 왕을 칭하면 곧 찬탈.',
      },
    ],
  },
  {
    key: 'kr-rank', label: '조선 관직·품계', icon: '🏯',
    note: '정·종 9품 18등급의 위계. 당상관·당하관의 경계가 권력의 분수령이다.',
    items: [
      {
        name: '영의정', aka: '일인지하 만인지상·상상(上相)',
        rank: '정1품, 의정부의 수반(삼정승 중 으뜸)',
        who: '문관 최고위. 왕을 보좌하는 재상의 정점.',
        duty: '국정 총괄·정책 결정·인사 자문. 좌·우의정과 함께 의정부를 이끈다.',
        address: '“대감(大監)”. 왕은 “영상(領相)”이라 부르기도.',
        detail: '“일인지하 만인지상”—왕 아래 모든 신하의 위. 사극 권신·노회한 재상의 자리.',
        pitfall: '정승(영·좌·우의정)은 정1품, 판서는 정2품. 정승과 판서를 동급으로 쓰면 오류.',
      },
      {
        name: '판서', aka: '○조 판서(이·호·예·병·형·공)',
        rank: '정2품, 육조(六曹)의 장관',
        who: '한 부서(조)의 우두머리. 오늘날의 장관.',
        duty: '담당 부서 통할—이조(인사)·호조(재정)·병조(국방) 등. 실무 권력의 핵심.',
        address: '“대감(大監)”.',
        detail: '이조판서(인사권)·병조판서(병권)는 특히 권력 다툼의 표적. 청탁·인사 갈등의 무대.',
        pitfall: '판서(정2품)는 정승(정1품) 아래. ‘대감’ 호칭은 정2품 이상에만.',
      },
      {
        name: '참판 / 참의', aka: '○조 참판(종2품)·참의(정3품 당상)',
        rank: '종2품(참판)·정3품 당상(참의)—판서의 차관·보좌',
        who: '육조의 차관급. 판서를 보좌하고 실무를 챙긴다.',
        duty: '부서 행정 실무 총괄. 판서 부재 시 대행.',
        address: '“영감(令監)”(당상관). 대감보다 한 격 아래의 경칭.',
        detail: '“판서가 되려는 자”의 야심, 실무를 쥔 자의 은밀한 권력을 그리기 좋다.',
        pitfall: '‘대감’과 ‘영감’을 구분하라—정2품 이상이 대감, 정3품 당상~종2품이 영감.',
      },
      {
        name: '당상관', aka: '정3품 상계(통정대부) 이상',
        rank: '관료 위계의 ‘윗줄’—정책을 논하는 고위직',
        who: '정3품 당상 이상의 고위 관원(판서·참판·승지 등).',
        duty: '어전 회의 참석·정책 결정·인사. 붉은 흉배와 의자(당상)에 앉을 자격.',
        address: '“대감”·“영감”(품계에 따라).',
        detail: '당상/당하의 경계는 출세의 천장. 평생 ‘당하’에 머무는 한과 ‘당상’을 넘는 환희가 갈린다.',
        pitfall: '품계(品階)와 관직(官職)은 별개. 같은 정3품도 당상/당하로 나뉜다.',
      },
      {
        name: '당하관', aka: '정3품 하계(통훈대부) 이하',
        rank: '실무를 떠받치는 ‘아랫줄’ 관원',
        who: '정3품 당하 이하의 일반 관원(현감·좌랑 등).',
        duty: '문서·재판·징세 등 실무. 당상관의 결정을 집행한다.',
        address: '“나리(進賜)”. 고을 수령은 “사또(使道)”.',
        detail: '뜻은 높되 줄이 없어 승진 못 하는 강직한 관리—사극 의인(義人)의 단골 자리.',
        pitfall: '‘사또’는 지방 수령(목사·부사·현감 등)을 부르는 통칭. 중앙 관원엔 안 쓴다.',
      },
      {
        name: '관찰사', aka: '감사(監司)·도백(道伯)',
        rank: '종2품, 한 도(道)의 으뜸 지방관',
        who: '팔도 각 도의 최고 행정·군사·사법 책임자.',
        duty: '도내 수령 감독·징세·재판·군사. 왕의 지방 대리인.',
        address: '“관찰사 영감”·“감사또”.',
        detail: '암행어사의 ‘출두’ 대상이자, 토호와 결탁한 탐관의 단골 배역.',
        pitfall: '관찰사(도)와 수령(고을)은 층위가 다르다. 관찰사가 수령들을 감독한다.',
      },
      {
        name: '수령', aka: '목사·부사·군수·현령·현감(사또)',
        rank: '정3품~종6품, 한 고을의 지방관',
        who: '목·부·군·현 등 고을의 우두머리. 흔히 ‘사또’.',
        duty: '징세·치안·재판·권농. 백성과 가장 가까운 ‘작은 왕’.',
        address: '“사또(使道)”·“원님(員-)”.',
        detail: '선정/탐학이 갈리는 자리. 춘향전의 변사또처럼 권력 남용의 전형.',
        pitfall: '목사·부사·현감은 고을 등급에 따른 수령의 종류. 품계가 조금씩 다르다.',
      },
      {
        name: '암행어사', aka: '어사(御史)',
        rank: '품계는 낮아도 왕명을 직접 받든 특명 사신',
        who: '왕이 비밀리에 파견한 감찰관(대개 젊은 당하관).',
        duty: '지방 수령의 비리 적발·민정 시찰. ‘마패’로 신분을 밝히고 ‘출두’한다.',
        address: '신분을 밝히기 전엔 평민 행세. 출두 후엔 “어사또”.',
        detail: '마패를 던지며 “암행어사 출두야!”—권선징악의 클라이맥스 장치.',
        pitfall: '마패는 역마 사용 증표이지 ‘신분증’이 본래 목적. 출두 연출은 후대 윤색이 큼.',
      },
    ],
  },
  {
    key: 'kr-royal', label: '왕실 호칭(동양)', icon: '🐉',
    note: '왕과 그 핏줄을 부르는 말. 적서(嫡庶)와 항렬에 따라 칭호가 엄격히 갈린다.',
    items: [
      {
        name: '전하', aka: '주상(主上)·상감(上監)·금상(今上)',
        rank: '제후국 왕에 대한 최고 경칭(황제는 ‘폐하’)',
        who: '왕(임금) 본인을 신하·백성이 부르는 말.',
        duty: '국정의 정점. 옥새·교지로 명을 내린다.',
        address: '면전: “전하(殿下)”. 지칭: “주상 전하”·“상감마마”.',
        detail: '“폐하”는 황제, “전하”는 (제후국) 왕. 조선은 명·청의 제후국이라 ‘전하’가 정격.',
        pitfall: '사극에서 조선 왕에게 “폐하”를 쓰면 고증 오류(대한제국 이후에야 ‘폐하’).',
      },
      {
        name: '중전 / 중궁전', aka: '왕비·곤전(坤殿)',
        rank: '왕의 정실. 내명부(內命婦)의 수장.',
        who: '왕비. 간택·책봉으로 오른다.',
        duty: '내명부 통솔·후계 생산·궁중 의례. 외척의 권력 통로.',
        address: '“중전마마”·“곤전마마”.',
        detail: '후궁·대비와 얽힌 ‘안방의 권력’ 다툼이 사극의 단골 축. 폐비 서사의 비극.',
        pitfall: '‘마마’는 왕·왕비·대비·세자 등 지존급에만. 후궁·상궁에는 격이 다른 호칭.',
      },
      {
        name: '대비 / 대왕대비', aka: '자전(慈殿)·왕대비',
        rank: '선왕의 왕비·할머니. 왕실 최고 어른.',
        who: '돌아가신 임금의 비. 현왕의 어머니(대비)·할머니(대왕대비).',
        duty: '어린 왕의 수렴청정(垂簾聽政)·왕실 어른으로서의 권위.',
        address: '“대비마마”·“대왕대비마마”.',
        detail: '발 뒤에서 정사를 듣는 수렴청정—여성 권력의 정점. 외척정치의 핵심.',
        pitfall: '수렴청정은 ‘발(簾)을 드리우고 듣는다’는 뜻. 직접 옥좌에 앉는 것이 아니다.',
      },
      {
        name: '세자 / 세자빈', aka: '왕세자·동궁(東宮)·저하(邸下)',
        rank: '왕위 계승 1순위. 차기 임금.',
        who: '왕의 적장자(혹은 책봉된 후계). 빈은 그 정실.',
        duty: '제왕 수업·서연(書筵)·대리청정. 동궁에 거처.',
        address: '“세자 저하(邸下)”. (전하보다 한 격 낮춘 경칭)',
        detail: '아버지 왕과의 긴장(사도세자), 계승을 노리는 형제—궁중 비극의 정점.',
        pitfall: '세자는 “전하”가 아니라 “저하”. 황태자는 “전하”. 격을 섞으면 오류.',
      },
      {
        name: '대군 / 군', aka: '왕자(적자=대군, 서자=군)',
        rank: '왕의 아들. 적서에 따라 ‘대군’과 ‘군’으로 갈림.',
        who: '왕비 소생 적자=대군, 후궁 소생 서자=군.',
        duty: '봉작과 녹봉을 받되 정치 참여는 견제됨(역모 의심 회피).',
        address: '“○○대군 자가(自家)”·“○○군 대감”.',
        detail: '왕이 될 수 없는 적자(대군)의 야심—수양대군처럼 찬탈의 씨앗이 되곤 한다.',
        pitfall: '대군(적자)과 군(서자)의 차이가 곧 신분. 왕의 사위는 ‘부마(駙馬)’로 또 다르다.',
      },
      {
        name: '공주 / 옹주', aka: '공주(적녀)·옹주(서녀)',
        rank: '왕의 딸. 적서에 따라 갈림.',
        who: '왕비 소생 적녀=공주, 후궁 소생 서녀=옹주.',
        duty: '정략혼인(부마 간택). 정치 권한은 없으나 왕실 위신의 상징.',
        address: '“공주 자가(自家)”·“옹주 자가”.',
        detail: '신분 높되 결혼으로 정치에 동원되는 비애. 부마와 그 가문의 부침이 곁따른다.',
        pitfall: '왕의 딸이 공주, 세자의 딸은 ‘군주(郡主)’, 대군의 딸은 ‘현주’ 등으로 또 갈린다.',
      },
    ],
  },
  {
    key: 'court-office', label: '궁중 직책·내관', icon: '🏛️',
    note: '왕의 곁을 지키는 사람들. 보이지 않는 곳에서 권력에 가장 가까운 자리.',
    items: [
      {
        name: '내시 / 환관', aka: '내관(內官)·중관(中官)',
        rank: '품계는 다양하나 왕의 측근으로 실권을 쥐기도.',
        who: '거세된 남자로 궁중 내정을 맡은 자. 내시부 소속.',
        duty: '왕의 시중·전갈·문서 전달·궁중 살림. 왕과 신하 사이의 통로.',
        address: '높은 내관은 “영감”·“대감”까지. 흔히 “○상선 영감”.',
        detail: '왕의 귓가에 가장 가까운 자—권신을 능가하는 ‘환관 정치’의 위험을 품는다.',
        pitfall: '조선 내시는 중국과 달리 결혼·양자가 허용됐다. ‘무자식’ 설정은 부정확.',
      },
      {
        name: '상선', aka: '내시부의 종2품 수장',
        rank: '종2품, 내관의 으뜸',
        who: '내시부의 최고 책임자. 왕의 수라·의대를 총괄.',
        duty: '내시 통솔·왕의 일상 시중 총지휘. 어명 전달의 핵심.',
        address: '“상선 영감”.',
        detail: '왕의 하루를 가장 잘 아는 자. 신하들이 왕의 심기를 묻는 ‘정보의 길목’.',
        pitfall: '상선(내관)과 상궁(궁녀)을 혼동 말 것—한쪽은 남성 내관, 한쪽은 여성 궁녀.',
      },
      {
        name: '상궁', aka: '정5품 궁녀의 우두머리',
        rank: '정5품, 궁녀(나인)의 최고위',
        who: '오랜 궁중 생활을 거쳐 오른 여성 관리. 내명부 실무의 핵.',
        duty: '처소·수라·의대·재정 등 각 부서를 관장. 왕비·대비의 측근.',
        address: '“○상궁”·“마마님”(아랫것이 부를 때).',
        detail: '“제조상궁”은 궁녀의 정점—왕실 안방 살림과 비밀을 모두 쥔 실세.',
        pitfall: '상궁은 ‘마마’가 아니라 ‘마마님’. ‘마마’는 지존급에만 쓴다.',
      },
      {
        name: '나인 / 생각시', aka: '궁녀(宮女)·내인',
        rank: '상궁 아래의 궁녀. 견습은 ‘생각시’.',
        who: '어린 나이에 입궁해 궁중 일을 배우는 여성. 평생 궁에 매인다.',
        duty: '각 처소의 잡무·시중·바느질·수라 보조. 상궁의 지시를 따른다.',
        address: '“○나인”·“항아님”.',
        detail: '왕의 승은을 입어 후궁이 되거나, 평생 궁에 갇히는 두 갈래 운명이 극적이다.',
        pitfall: '나인이 왕의 승은을 입으면 ‘특별상궁(승은상궁)’을 거쳐 후궁이 된다.',
      },
      {
        name: '승지', aka: '도승지(정3품 당상)·승정원 소속',
        rank: '정3품 당상, 왕의 비서',
        who: '승정원(왕의 비서실)의 관원. 도승지가 으뜸(왕의 비서실장).',
        duty: '왕명 출납—어명을 받아 전달하고, 상소를 왕에게 올린다. 정보의 관문.',
        address: '“승지 영감”·“도승지 영감”.',
        detail: '왕의 입과 귀. 어떤 상소를 먼저 올리느냐로 정국을 좌우하는 숨은 권력.',
        pitfall: '승지(비서)와 사관(史官·기록)은 다른 직. 사관은 왕의 말을 ‘기록’할 뿐.',
      },
      {
        name: '어의', aka: '내의원 의관',
        rank: '의관 중 왕의 주치의(품계는 다양)',
        who: '내의원에서 왕실의 건강을 책임지는 의원.',
        duty: '왕·왕실의 진맥·처방·탕약. 옥체에 관한 모든 책임.',
        address: '“어의”·“의원”.',
        detail: '왕의 병세는 곧 국가 기밀—오진은 죽음, 독살의 의심도 어의에게 쏠린다.',
        pitfall: '내의원(왕실)과 전의감(관리 양성·일반 의료)은 별개 기관.',
      },
    ],
  },
  {
    key: 'west-court', label: '서양 궁정 직책', icon: '⚜️',
    note: '왕의 식탁·옷장·말·인장을 맡은 자리. 사소해 보여도 왕과 가장 가까운 권력.',
    items: [
      {
        name: '재상 / 수상', aka: 'Chancellor·Prime Minister·Vizier(동방)',
        rank: '왕 아래 최고 실권자(행정의 수반)',
        who: '국정을 총괄하는 최고위 신하. 왕의 오른팔이자 견제 대상.',
        duty: '국새 관리·정책 집행·관료 통할. 왕이 어리거나 약하면 실질적 통치자.',
        address: '“각하(Your Excellency)”·“재상 각하”.',
        detail: '충신과 간신의 두 얼굴—왕을 그림자에서 조종하는 ‘회색 추기경’의 전형.',
        pitfall: 'Chancellor(국새·법무)와 Steward(살림)·Vizier(동방 재상)는 기원이 다르다.',
      },
      {
        name: '시종장', aka: 'Lord Chamberlain·Kämmerer',
        rank: '왕의 사적 공간(궁정 살림)의 총책임자',
        who: '왕의 침전·의전·궁정 직원을 관리하는 고위 신하.',
        duty: '왕의 일상·알현 일정·궁정 의례 관장. 누가 왕을 만나는지 통제.',
        address: '“시종장 각하”·“My Lord”.',
        detail: '“왕에게 가는 문을 여닫는 자”—청탁과 정보가 모여드는 알짜 권력.',
        pitfall: 'Chamberlain(살림·의전)과 Chancellor(국정)를 혼동 말 것.',
      },
      {
        name: '궁내대신 / 집사장', aka: 'High Steward·Seneschal·Majordomo',
        rank: '왕실 가문·재정·식솔을 총괄하는 가신의 우두머리',
        who: '왕가의 살림(재정·식탁·하인)을 책임지는 최고 가신.',
        duty: '왕실 재정·연회·식솔 관리. 영주 부재 시 성을 대신 다스리기도.',
        address: '“집사장”·“Master Steward”.',
        detail: '판타지에서 왕좌를 탐내는 ‘섭정 집사(Steward)’의 단골 자리(곤도르의 섭정 등).',
        pitfall: 'Steward는 ‘대리 통치자’가 될 수 있으나 군주는 아니다—왕이 돌아오면 비켜야 한다.',
      },
      {
        name: '근위대장', aka: 'Captain of the Guard·Lord High Constable',
        rank: '왕의 신변을 지키는 정예 무력의 지휘관',
        who: '왕실 근위대(친위대)의 우두머리. 충성심이 곧 자격.',
        duty: '왕의 호위·궁정 경비·의장. 쿠데타의 성패를 가르는 열쇠.',
        address: '“대장(Captain)”·“경(My Lord)”.',
        detail: '왕을 지킬 것인가, 칼을 돌릴 것인가—충성과 배신의 가장 날카로운 자리.',
        pitfall: 'Constable은 본래 ‘왕의 말(마구간)’ 관리에서 군 통수로 격상된 직. 세계관별로 다름.',
      },
      {
        name: '전령관 / 문장관', aka: 'Herald·King of Arms',
        rank: '의례·문장(紋章)·서열을 관장하는 관원',
        who: '귀족의 문장을 등록·심사하고 의전 서열을 정하는 전문가.',
        duty: '선전포고·즉위 선포·문장 관리·결투 입회. ‘누가 누구보다 높은가’의 심판.',
        address: '“전령관”·“문장관”.',
        detail: '왕의 목소리를 대신 외치는 자—그가 읽는 한 줄이 전쟁과 평화를 가른다.',
        pitfall: '전령관은 ‘불가침’의 사신. 그를 해치는 것은 중대한 금기로 그린다.',
      },
      {
        name: '궁정 광대', aka: 'Court Jester·Fool',
        rank: '공식 서열은 최하지만 ‘진실을 말할 특권’을 가진 자',
        who: '왕을 즐겁게 하는 어릿광대. 종종 명민한 인물의 위장.',
        duty: '여흥·풍자. 농담의 형식을 빌려 왕에게 바른말을 할 수 있는 유일한 존재.',
        address: '이름이나 별명으로. 격식 없는 자리.',
        detail: '“바보만이 진실을 말한다”—리어왕의 광대처럼 작품의 양심·해설자 역할.',
        pitfall: '광대의 ‘방울모자(cap and bells)’는 후대 정형. 시대·지역마다 모습이 다르다.',
      },
    ],
  },
  {
    key: 'clergy-mil', label: '성직·기사·무관', icon: '⚔️',
    note: '신과 칼을 섬기는 위계. 종교 권력과 군사 권력이 세속 작위와 얽힌다.',
    items: [
      {
        name: '교황 / 대주교', aka: 'Pope·Archbishop·총대주교',
        rank: '종교 권력의 정점. 때로 황제와 권위를 다툰다.',
        who: '교회의 최고 성직자. 교황은 왕을 대관·파문할 권한을 주장.',
        duty: '신앙의 수호·서임·대관·파문. 세속 군주에 대한 영적 권위.',
        address: '교황: “성하(聖下, Your Holiness)”. 대주교: “예하(猊下, Your Grace)”.',
        detail: '“대관할 것인가, 파문할 것인가”—교권과 왕권의 충돌(카노사의 굴욕)이 거대한 줄거리.',
        pitfall: '교황(Pope)·총대주교(Patriarch)는 종파마다 다르다. 세계관의 종교 구조를 먼저 정하라.',
      },
      {
        name: '추기경 / 주교', aka: 'Cardinal·Bishop',
        rank: '교황·대주교 아래의 고위 성직자',
        who: '한 교구를 다스리는 주교, 교황 선출권을 가진 추기경.',
        duty: '교구 통치·서품·재판(교회법). 추기경은 세속 정치에도 깊이 관여.',
        address: '추기경: “예하(Your Eminence)”. 주교: “각하(Your Excellency)”.',
        detail: '붉은 옷의 추기경(리슐리외형)은 왕보다 영리한 ‘막후 권력’의 단골 배역.',
        pitfall: '추기경은 ‘직책’이 아니라 ‘교황 선출인’의 신분. 대개 주교를 겸한다.',
      },
      {
        name: '기사', aka: 'Knight·Ritter·Chevalier',
        rank: '귀족의 입구 직전—작위는 없으나 ‘경(Sir)’으로 불리는 무인',
        who: '서임(敍任)을 받은 전사. 영주에게 충성을 맹세한 봉신.',
        duty: '전시 종군·영주 호위. 기사도(명예·신의·약자 보호)를 따른다.',
        address: '“Sir 이름”. 부인은 “Lady”.',
        detail: '서임식—어깨에 칼을 얹는 의식, 박차와 검의 수여. 신분 상승의 꿈이자 의무의 무게.',
        pitfall: '기사 작위(Knight)는 원칙상 세습되지 않는다(준남작과 다름). ‘Sir+이름’ 형식 준수.',
      },
      {
        name: '종자 / 견습기사', aka: 'Squire·Page',
        rank: '기사의 수행원·견습. 기사 작위 직전 단계.',
        who: '기사를 모시며 무예와 예법을 익히는 소년·청년(시동→종자→기사).',
        duty: '기사의 갑옷·말·무기 관리, 전장 보조. 무공을 세우면 서임.',
        address: '이름으로. “종자(Squire)”.',
        detail: '주인 기사를 향한 동경과 성장—기사 서임을 향한 통과의례 서사의 출발점.',
        pitfall: '시동(Page, 7~14세)→종자(Squire, 14~21세)→기사의 단계가 있었다.',
      },
      {
        name: '기사단장', aka: 'Grand Master·Master of the Order',
        rank: '기사수도회(템플러·구호기사단 등)의 최고 수장',
        who: '종교 기사단을 통솔하는 우두머리. 성직과 무력을 겸한다.',
        duty: '기사단의 영지·재정·군사 총괄. 교황·왕과 대등하게 협상하기도.',
        address: '“기사단장 각하”·“Grand Master”.',
        detail: '국가에 버금가는 부와 군대를 가진 기사단—왕의 견제와 음모의 표적이 된다.',
        pitfall: '기사수도회(종교)와 세속 기사단(훈장)은 성격이 다르다. 세계관에서 구분.',
      },
      {
        name: '장군 / 원수', aka: 'General·Marshal·Field Marshal',
        rank: '군 최고 지휘관(원수가 장군의 정점)',
        who: '대군을 지휘하는 무관. 원수는 군 통수의 정점.',
        duty: '작전 지휘·병력 동원. 전공으로 작위와 영지를 하사받기도.',
        address: '“장군(General)”·“원수 각하(Marshal)”.',
        detail: '전공으로 벼락출세한 평민 출신 장군과 세습 귀족 장교의 갈등이 단골.',
        pitfall: 'Marshal은 본래 ‘말(馬) 관리관’에서 군 최고직으로 격상된 칭호. 어원 주의.',
      },
    ],
  },
  {
    key: 'address-precedence', label: '호칭·경어·서열', icon: '📜',
    note: '누구를 어떻게 부르고, 누가 누구보다 위인가. 한 단어가 격을 올리고 내린다.',
    items: [
      {
        name: '경칭 사다리(서양)', aka: 'Majesty·Highness·Grace·Lordship',
        rank: '경어의 높낮이 = 신분의 높낮이',
        who: '부르는 대상의 격에 따라 경칭이 정해진다.',
        duty: '황제=Imperial Majesty > 왕=Majesty > 왕족=Royal Highness > 공작=Grace > 후·백·자·남=Lordship.',
        address: '한 칸을 잘못 올리거나 내리면 아첨·모욕이 된다.',
        detail: '신참이 경칭을 틀려 망신당하는 장면, 일부러 격을 낮춰 부르는 도발 등 갈등 소재.',
        pitfall: '“Your Grace”는 공작·대주교 전용. 백작에게 쓰면 과공(過恭).',
      },
      {
        name: '경칭 사다리(동양)', aka: '폐하·전하·저하·합하·각하·대감·영감·나리',
        rank: '품계·신분에 따른 호칭의 단계',
        who: '황제=폐하 > 왕=전하 > 세자=저하 > 정승=합하(閤下) > 판서급=대감 > 당상관=영감 > 당하관=나리.',
        duty: '같은 ‘대감’도 면전·지칭·하대에 따라 어미가 달라진다.',
        address: '“마마”는 왕·왕비·대비·세자 등 지존급, 그 외엔 신분별 경칭.',
        detail: '아랫사람이 무심코 격을 틀리면 곧 불경(不敬)—목이 달아날 수도 있는 긴장.',
        pitfall: '‘합하(閤下)’는 정승 등 최고위에. ‘각하’는 근대 이후 굳어진 용법이 많다.',
      },
      {
        name: '의전 서열(예좌)', aka: 'Order of Precedence',
        rank: '연회·행렬·알현에서 누가 앞서는가',
        who: '왕족 > 고위 성직 > 5등작 순 > 관직 순으로 자리·입장 순서가 정해진다.',
        duty: '상석(上席)·하석, 입장 순서, 인사 받는 순서까지 규정.',
        address: '서열을 어기면 가문 간 분쟁으로 번진다.',
        detail: '연회 좌석 배치 한 자리를 두고 벌어지는 가문의 자존심 싸움—궁정물의 미시 권력.',
        pitfall: '같은 작위라도 ‘수작(서임 연도)’이 오랜 가문이 앞선다. 단순 등급만으론 부족.',
      },
      {
        name: '존칭어(가)', aka: '자가(自家)·합부인·영부인·당주(當主)',
        rank: '가문·배우자·자녀를 부르는 격식어',
        who: '대군·공주=“자가”, 정승 부인=“합부인”, 가문의 현 수장=“당주”.',
        duty: '직접 부르는 말과 제3자에게 지칭하는 말이 다르다.',
        address: '여성에겐 남편·아버지 직위의 ‘부인’형(영부인·합부인 등).',
        detail: '집안 어른·하인이 쓰는 정밀한 호칭이 ‘진짜 사극 같은’ 질감을 만든다.',
        pitfall: '현대 ‘영부인=대통령 부인’ 용법과 사극의 ‘영부인(令夫人)=귀인의 부인)’은 의미가 다르다.',
      },
      {
        name: '문장(紋章)', aka: 'Coat of Arms·Heraldry·가문(家紋)',
        rank: '가문의 신분·역사·동맹을 한눈에 보여주는 상징',
        who: '귀족 가문마다 고유 문장(짐승·색·구획·구호)을 가진다.',
        duty: '깃발·방패·인장·식기에 새겨 소유와 권위를 표시. 혼인하면 두 문장을 합친다.',
        address: '문장으로 가문을 식별—‘저 사자 깃발은 어느 가문’ 식의 서사 장치.',
        detail: '몰락한 가문이 문장을 빼앗기거나, 사생아가 문장에 ‘사선(bend sinister)’을 다는 등 신분 드라마.',
        pitfall: '문장에는 엄격한 규칙(색 위에 색을 겹치지 않음 등)이 있다. 막 그리면 어색.',
      },
    ],
  },
]

const LS = 'sry:tool:nobility-titles-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 표시 필드(라벨 포함). 정의된 안전 키만 노출.
const TEXT_FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '원어·별칭' },
  { k: 'rank', label: '서열·등급' },
  { k: 'who', label: '누가 받는가' },
  { k: 'duty', label: '역할·권한' },
  { k: 'address', label: '호칭·경어' },
  { k: 'detail', label: '묘사 디테일' },
  { k: 'pitfall', label: '고증 함정' },
]

function fieldToString(item: Entry, k: keyof Entry): string {
  const v = item[k]
  return v ? String(v) : ''
}

function plainText(f: Flat): string {
  const lines = [`👑 ${f.item.name}  (${f.cat.label})`]
  for (const fd of TEXT_FIELDS) {
    const v = fieldToString(f.item, fd.k)
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = TEXT_FIELDS
    .map((fd) => ({ fd, v: fieldToString(f.item, fd.k) }))
    .filter((x) => x.v)
    .map(({ fd, v }) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(v)}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 사극·판타지 궁정물을 위한 창작 참고 자료. 서열·호칭은 작품의 세계관·시대에 맞춰 통일하세요.</i></p>`,
  ].join('')
}

export default function NobilityTitlesRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.title / payload.q 로 검색 힌트가 오면 활용(다른 도구에서 칭호를 갖고 열릴 수 있음)
  const hint = typeof payload?.title === 'string' ? (payload.title as string)
    : typeof payload?.q === 'string' ? (payload.q as string) : ''

  const [query, setQuery] = useState(hint)
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 복사·토스트 타이머 취소
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
        return TEXT_FIELDS.some((fd) => fieldToString(item, fd.k).toLowerCase().includes(q))
      })
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }
  const toggleExpand = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  // 수집함에 담기 — addToStash({kind:'note', ...})
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `작위: ${f.item.name}`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[작위 자료] ${plainText(f)}`,
      source: '귀족·작위 사전',
      tags: ['작위', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '작위·궁중 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 서열: f.item.rank || '', 호칭: f.item.address || '' },
    })
    if (id) flash(`프로젝트 자료 〈작위·궁중 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
      {TEXT_FIELDS.map((fd) => {
        const v = fieldToString(item, fd.k)
        if (!v) return null
        const isAddr = fd.k === 'address'
        const isPit = fd.k === 'pitfall'
        return (
          <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <span style={{ color: isPit ? 'var(--muted)' : 'var(--accent)', fontWeight: 600, marginRight: 6 }}>
              {isPit ? '⚠ ' : ''}{fd.label}
            </span>
            <span
              style={isAddr ? { cursor: 'pointer', textDecoration: 'underline dotted' } : undefined}
              title={isAddr ? '클릭해 호칭만 복사' : undefined}
              onClick={isAddr ? () => copy(v, `addr:${item.name}`) : undefined}
            >
              {isAddr && copiedKey === `addr:${item.name}` ? '✓ 복사됨' : v}
            </span>
          </div>
        )
      })}
    </div>
  )

  const actionRow = (f: Flat, scope: string) => (
    <>
      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(plainText(f), scope)}>
          {copiedKey === scope ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
        </button>
        <button className="minibtn" onClick={() => saveSnippet(f)}><Emoji e="💾" /> 스니펫 저장</button>
        <button className="minibtn" onClick={() => toggleFav(f.cat.key, f.item.name)}>
          {favs[favKey(f.cat.key, f.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
      </div>
      <div className="linkbar" style={{ marginTop: 8 }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => toStash(f)} disabled={!hasStash()}
          title={hasStash() ? '이 작위·직제 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
          <Emoji e="📎" /> 수집함
        </button>
        <button className="linkbtn" onClick={() => toProject(f)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈작위·궁중 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button className="linkbtn"
          onClick={() => openToolLinked('faction-builder', { title: f.item.name, rank: f.item.rank || '', from: 'nobility-titles-ref' })}
          title="이 작위·서열을 가지고 세력·진영 빌더 열기">
          <Emoji e="🏰" /> 세력 빌더
        </button>
      </div>
    </>
  )

  return (
    <div style={wrap}>
      {/* 안내 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="👑" /> <b style={{ color: 'var(--text)' }}>귀족·작위 사전</b> — 사극·판타지 궁정물의 위계를 ‘진짜처럼’ 그리기 위한 자료집.
        동/서양 작위·왕족·관직·궁중 직책·호칭·서열을 정리했습니다. 서열과 경칭은 작품 세계관에 맞춰 통일하세요.
      </div>

      <div style={hintStyle}>
        총 <b>{total}개</b> 칭호·직제를 분류별로 정리했습니다. 검색·펼침으로 찾고, 무작위로 영감을 얻고,
        밑줄 친 ‘호칭·경어’는 클릭해 바로 복사하거나, 수집함·스니펫·프로젝트로 보내세요.
        {hint ? <>  (전달된 검색 힌트: <b>{hint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="작위·직책·호칭으로 검색 (예: 공작, 전하, 섭정, 상궁, 서열)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️" /> 전체
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 작위</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('faction-builder')} title="세력·진영 빌더 열기"><Emoji e="🏰" /> 세력 빌더 열기</button>
        <span style={{ ...hintStyle, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 카테고리 설명(선택된 분류) */}
      {cat !== ALL && (() => {
        const c = CATS.find((x) => x.key === cat)
        return c?.note ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
            <Emoji e={c.icon} /> {c.note}
          </div>
        ) : null
      })()}

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          {actionRow(random, 'rnd')}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.rank && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.rank}
                  </div>
                )}
                {open && renderFields(item)}
                {open && actionRow({ cat: c, item }, 'item:' + fk)}
              </div>
            )
          })
        )}
      </div>

      <div style={hintStyle}>서열의 힘은 디테일에서 옵니다. 호칭 한마디, 자리 한 칸이 인물의 신분을 ‘진짜’로 만듭니다.</div>
    </div>
  )
}
