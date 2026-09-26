// 비밀결사·조직 사전 — 음모물/스릴러/판타지/사극을 위한 로컬 자료집.
//  결사·교단·길드·범죄조직의 유형, 그리고 목적·구조·입회의식·상징·은어의 패턴을 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/네트워크/미디어 없음(전부 자작 텍스트).
//  카테고리 펼침 + 검색 + 무작위 영감 조합 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 세력 빌더 열기.
//  ※ 백과 베끼기 없이 직접 작성한 서사용 요약·패턴. 실제 단체에 대한 사실 주장이 아니라 창작 소재다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'secret-society-ref',
  name: '비밀결사 사전',
  icon: '🕯️',
  group: '리서치·자료',
  intro: '결사·교단·길드·범죄조직의 목적·구조·입회의식·상징·은어 유형을 정리해 음모물 소재로 활용',
  w: 700,
  h: 720,
}

// ---------- 항목 형(型) ----------
interface Entry {
  name: string          // 결사/조직 유형명
  aka?: string          // 별칭·다른 이름·실루엣
  era?: string          // 분위기/시대감(서사 톤)
  purpose?: string      // 표면 목적과 진짜 목적
  structure?: string    // 위계·구조·의사결정
  rite?: string         // 입회의식·서약·통과의례
  symbol?: string       // 상징·표식·복식
  cant?: string         // 은어·암구호·식별법
  secret?: string       // 숨긴 비밀·내부 모순(플롯 씨앗)
  pitfall?: string      // 흔한 클리셰·함정
}
interface PatternItem { name: string; note: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }
interface PatternCat { key: string; label: string; icon: string; note?: string; items: PatternItem[] }

// ---------- 결사 유형 대량 자료집(직접 작성) ----------
const CATS: CatDef[] = [
  {
    key: 'historic', label: '역사·준역사형 결사', icon: '🏛️',
    note: '실재한 결사에서 모티프만 빌려 온, 시대극·음모물에 어울리는 유형들. 사실이 아니라 서사용 윤곽이다.',
    items: [
      {
        name: '석공 길드형 우애결사',
        aka: '돌쟁이 형제단·자유석공·작은 망치회',
        era: '중세 말~근대 초, 길드가 쇠퇴하며 신비주의로 옷을 갈아입던 시기',
        purpose: '표면: 동업자 상호부조와 기술 전수 / 진짜: 신분을 넘어선 인맥망과 비밀 자본의 우회로.',
        structure: '도제—직인—장인의 3단 위계를 그대로 등급으로 바꿔 쓴다. 지부(롯지)마다 자치, 위로 갈수록 정보가 좁아진다.',
        rite: '눈을 가린 채 인도되어 차가운 돌바닥에 무릎 꿇리고, 칼끝을 가슴에 댄 채 “보고 들은 것을 무덤까지” 서약하게 한다.',
        symbol: '직각자와 컴퍼스, 다듬돌, 모든 것을 보는 눈, 앞치마와 흰 장갑.',
        cant: '악수할 때 엄지로 상대 손등을 세 번 누른다. “날씨가 거칠군요”에 “기둥은 곧습니다”로 답해야 같은 편.',
        secret: '최고 등급은 사실 비어 있다 — 정점에 신비가 있다고 믿게 만든 것이 통제의 핵심이다.',
        pitfall: '“삼각형+눈”만 그려 두고 다 설명했다 치는 것. 의식의 ‘몸의 감각’(추위·매듭·낭독)을 묘사해야 살아난다.',
      },
      {
        name: '학자·연금술 비밀학회',
        aka: '장미십자형 결사·보이지 않는 대학·새벽의 모임',
        era: '르네상스~계몽기, 금서와 망원경과 증류기가 함께 의심받던 때',
        purpose: '표면: 자연철학과 학문의 진보 / 진짜: 교회·왕권이 금한 지식(이단·이교·미래학)의 보존과 독점.',
        structure: '저자 없는 회람 문서로 운영된다. 회원은 서로 얼굴을 모르고 필명과 인장으로만 안다.',
        rite: '한 권의 책을 받아 여백에 자기 답을 써 다음 사람에게 넘긴다 — 책이 한 바퀴 돌아오면 입회 완료.',
        symbol: '장미 한 송이를 품은 십자가, 펠리컨, 일곱 행성 기호, 봉랍 인장.',
        cant: '편지 첫 글자만 세로로 읽으면 약속 장소가 나온다. 라틴어 오타가 곧 진위 확인 코드.',
        secret: '그들이 지킨 ‘위대한 비밀’은 실은 미완의 가설일 뿐 — 환멸한 노학자가 진실을 폭로하려 한다.',
        pitfall: '연금술=금 만들기로만 그리는 것. 이들에게 변성은 ‘인간의 완성’이라는 은유였다는 결을 놓치지 말 것.',
      },
      {
        name: '기사·수도 군사단형',
        aka: '성전 형제단·붉은 십자단·순례자의 검',
        era: '성지 순례와 십자군의 시대, 신앙과 칼과 돈이 한 사람 안에 들어 있던 무렵',
        purpose: '표면: 순례자 보호와 성지 수호 / 진짜: 국경을 넘는 금융망과 면세 영지로 왕보다 부유해진 권력체.',
        structure: '기사—사제—종자의 계급, 총장(그랜드마스터) 아래 각국 관구장. 수도원 규율과 군 지휘가 겹친다.',
        rite: '하룻밤을 제단 앞에서 무장한 채 새우고(철야 기도), 동틀 녘 청빈·정결·복종을 맹세하고 흰 망토를 받는다.',
        symbol: '흰 바탕의 붉은 십자, 한 마리 말에 탄 두 기사(청빈), 봉인된 비밀 금고.',
        cant: '암호 기도문의 끊어 읽는 위치가 신분 증명. 묵주 알을 쥐는 손가락 순서로 등급을 표시.',
        secret: '단이 보관한 것은 성유물이 아니라 왕들의 채무 장부 — 그래서 하루아침에 이단으로 몰려 숙청당한다.',
        pitfall: '“보물·성배”에만 매달리는 것. 진짜 드라마는 신앙과 부패가 같은 제복을 입었다는 모순에 있다.',
      },
      {
        name: '의적·민중 결사형',
        aka: '붉은 수건회·들풀 형제단·이름 없는 손',
        era: '가렴주구와 기근의 시대, 관아가 곧 도적이던 변방',
        purpose: '표면: 굶주린 이웃을 돕는 두레·계 / 진짜: 부패한 관·지주에 맞선 무장 비밀결사.',
        structure: '느슨한 세포망. 마을마다 ‘바깥일 보는 이’ 하나만 윗선을 안다. 두목은 신화화되어 실재가 흐려진다.',
        rite: '피 한 방울을 술에 떨어뜨려 돌려 마시고, 잡히면 동료 이름을 절대 대지 않겠다 맹세한다.',
        symbol: '특정 색 수건·매듭, 문지방에 그은 분필 표시, 새 울음 흉내 신호.',
        cant: '장날 좌판의 물건 배열이 곧 전갈. “소금 한 됫박 더”가 “관군이 온다”는 뜻.',
        secret: '의로움으로 시작했으나 보호세를 걷는 또 다른 폭력으로 변질되어 간다 — 창립자가 이를 깨닫는다.',
        pitfall: '무조건 미화하는 것. 의적도 권력이 되면 부패한다는 회색지대가 더 강한 이야기다.',
      },
      {
        name: '궁정 음모 파벌',
        aka: '그림자 내각·복도의 사람들·찻잔의 동맹',
        era: '왕권이 흔들리고 후계가 불확실한 궁정, 미소 뒤에 칼이 있는 시기',
        purpose: '표면: 폐하께 바치는 충성 / 진짜: 다음 권력자를 미리 정하고 정적을 조용히 제거하는 카르텔.',
        structure: '혈연·혼맥·후견으로 엮인 비공식망. 문서가 없고 ‘아는 사람만 아는’ 약속으로 굴러간다.',
        rite: '명시적 입회식이 없다 — 작은 비밀을 공유시켜 ‘이제 너도 공범’이라는 사실로 묶는다.',
        symbol: '같은 보석·문장(紋章)의 변형, 특정 향수, 부채를 펴고 접는 방식.',
        cant: '연회 좌석 배치, 누구의 잔에 먼저 따르는가가 곧 서열 발표. 칭찬의 말이 실은 경고.',
        secret: '파벌의 진짜 수장은 가장 무력해 보이는 노부인/시종 — 모두가 다른 사람을 우두머리로 착각한다.',
        pitfall: '독살·밀서 클리셰 남발. 권력의 미세한 예법(앉는 순서·호칭·침묵)이 더 무섭다.',
      },
    ],
  },
  {
    key: 'occult', label: '교단·신비주의', icon: '🕯️',
    note: '믿음을 동력으로 삼는 결사. 사이비 교단부터 고대 비교(秘敎), 종말론 집단까지. 공포·신앙·구원의 결.',
    items: [
      {
        name: '비밀 신앙 교단(비교·秘敎)',
        aka: '안쪽 교회·등불 든 자들·세 번째 성전',
        era: '제도 종교의 그늘, 정통이 이단이라 부르는 가르침이 지하로 숨은 시대',
        purpose: '표면: 더 깊은 영적 진리의 추구 / 진짜: 선택받은 소수만 구원받는다는 우월감과 그를 통한 통제.',
        structure: '구도자—입문자—사제—내밀자(內密者)의 단계. 위로 갈수록 ‘진짜 교리’가 조금씩 바뀐다.',
        rite: '단식과 어둠 속 격리 끝에 ‘죽음과 부활’을 연기한다 — 관에 눕거나 물에 잠겼다 끌어올려진다.',
        symbol: '뱀이 자기 꼬리를 문 고리, 일곱 갈래 등불, 가려진 얼굴의 신상.',
        cant: '겉 교리(대중용)와 속 교리(내부용)가 따로 있다. 같은 단어를 정반대 뜻으로 쓰는 것이 식별법.',
        secret: '교단의 ‘예언된 구원자’는 교주 자신이 꾸민 배역 — 진짜 신탁은 200년 전 끊겼다.',
        pitfall: '망토 쓰고 촛불 켜고 “찬양하라” 외치는 것만으로 끝내는 것. 평범한 신도의 일상적 헌신을 보여줘야 무섭다.',
      },
      {
        name: '종말·구원 대망 집단',
        aka: '마지막 방주·정해진 날의 사람들·재의 형제',
        era: '역병·전쟁·혜성 같은 ‘끝의 징조’가 사람들을 휩쓴 불안의 시기',
        purpose: '표면: 다가올 종말에서 신도를 구원 / 진짜: 종말을 무한히 연기·갱신하며 헌금·노동·복종을 짜낸다.',
        structure: '교주를 정점으로 한 폐쇄 공동체. 외부와 단절(자산 헌납·연락 차단)이 곧 충성의 증거.',
        rite: '날짜를 정해 모든 재산을 처분하고 흰옷을 입고 모인다. 그날이 지나면 “우리의 기도로 미뤄졌다”고 재해석.',
        symbol: '카운트다운 달력, 봉인된 방주/지하 대피소, 빛/불의 모티프.',
        cant: '바깥세상을 가리키는 멸칭(‘잠든 자들’), 내부만 쓰는 새 호칭으로 정체성을 갈아끼운다.',
        secret: '교주 본인도 더는 안 믿지만 멈추면 모든 게 무너지기에 연극을 계속한다 — 2인자가 이를 안다.',
        pitfall: '신도를 단순한 바보로 그리는 것. 똑똑한 사람이 어떻게 한 발씩 빠져드는지가 핵심이다.',
      },
      {
        name: '마녀·이교 모임(코번)',
        aka: '달의 자매들·열셋의 원·숲의 식탁',
        era: '마녀사냥과 화형의 그림자, 옛 신앙이 박해를 피해 숲으로 숨은 시대',
        purpose: '표면: 치유·산파·점복 같은 민간 기술의 전승 / 진짜: 권력에서 밀려난 이들(특히 여성)의 상호부조와 저항.',
        structure: '13명 안팎의 작은 원. 위계가 평평하고 ‘큰 어머니/장로’가 좌장. 핏줄보다 입회로 잇는다.',
        rite: '보름밤 모닥불을 둘러싸고 새 이름을 받고, 칼이 아닌 매듭을 묶어 서약한다(되돌릴 수 있는 약속).',
        symbol: '뒤집힌 별·초승달, 약초 다발, 손금·매듭·물그릇 점.',
        cant: '약초 이름에 빗댄 암호(‘쓴 잎을 가져와’=위험), 특정 꽃을 창가에 두어 안전을 알림.',
        secret: '두려움의 대상이던 모임이 실은 마을의 의료·복지 그 자체 — 박해자는 그 사실을 알고도 묻는다.',
        pitfall: '초록 피부 마녀 클리셰. 이웃 같던 사람이 ‘마녀’로 지목되는 공동체의 광기가 더 강하다.',
      },
      {
        name: '죽음·재생 비의 집단',
        aka: '검은 사제단·되살아난 자들·무덤지기 형제',
        era: '죽음이 흔하고 사후가 절박하던 시대, 영생/부활을 약속하는 자가 권력을 쥔 곳',
        purpose: '표면: 죽음의 공포에서 사람들을 해방 / 진짜: 시신·유산·장례를 독점해 도시의 경제 동맥을 쥔다.',
        structure: '장의·매장·기록을 맡은 직능 결사가 비밀 사제단으로 변질. 죽은 자의 비밀이 곧 산 자의 약점.',
        rite: '하룻밤을 시신/관과 함께 보내고, 자신의 부고와 묘비명을 미리 써 봉인한다.',
        symbol: '해골·모래시계·꺼진 촛불, 두 얼굴(삶/죽음)의 가면.',
        cant: '장례 음악의 특정 음정 변화, 조의 표시의 매듭 수로 전갈을 주고받는다.',
        secret: '“부활의 비약”은 환각제일 뿐, 죽었다던 자들은 다른 신분으로 팔려 갔다.',
        pitfall: '네크로맨시 판타지로 흘러 버리는 것. 죽음 산업을 쥔 자의 ‘현실 권력’이 더 서늘하다.',
      },
    ],
  },
  {
    key: 'guild', label: '길드·직능 결사', icon: '⚒️',
    note: '직업과 기술을 중심으로 묶인 결사. 도둑·암살·상인·예인 길드 등 ‘일’이 곧 정체성인 조직들.',
    items: [
      {
        name: '도둑 길드',
        aka: '밤의 손·그림자 시장·열쇠 없는 형제',
        era: '치안이 미치지 못하는 항구·뒷골목, 범죄가 또 하나의 ‘업종’으로 조직화된 도시',
        purpose: '표면: 없음(공식적으로는 존재하지 않음) / 진짜: 도시 범죄의 독점·중재·‘세금’ 징수와 장물 유통.',
        structure: '소매치기—털이꾼—설계자—두목의 단계. 구역(나와바리)별 분할, 분쟁은 길드 내 재판으로.',
        rite: '감시받는 채로 무언가를 훔쳐 와야 입회 — 실패하면 손을 잃고, 밀고하면 혀를 잃는다는 규약.',
        symbol: '특정 매듭으로 묶은 끈, 동전에 낸 흠집, 문기둥의 분필 암호(‘여기 털 만함/위험’).',
        cant: '도둑 은어가 발달해 있다. “장사 나간다”=훔치러 간다, “손님”=경비, “비 온다”=잠복.',
        secret: '길드의 ‘명예 규약’(약자·동료는 안 턴다)은 두목이 경쟁자를 제거하려 만든 명분일 뿐이다.',
        pitfall: '훈훈한 의적 길드로만 그리는 것. 내부 배신·구역 다툼의 살벌함이 빠지면 가짜다.',
      },
      {
        name: '암살자 결사',
        aka: '조용한 칼·이름을 파는 집·열흘의 정원',
        era: '권력자가 칼을 직접 들지 않고 ‘사람을 사는’ 정치, 청부가 하나의 제도이던 곳',
        purpose: '표면: 정원사·약재상 같은 평범한 위장 직능 / 진짜: 계약 살인의 중개·실행과 침묵의 거래.',
        structure: '의뢰는 익명 다단계(중개인→연락책→실행자)로만 닿는다. 실행자끼리 서로를 모르는 게 원칙.',
        rite: '첫 의뢰를 완수하고 그 증거(혹은 표적의 소지품)를 가져와야 정식 일원이 된다. 거부=배신.',
        symbol: '특정 독초·꽃을 남기는 서명, 동전을 시신 눈에 올려 두는 표식.',
        cant: '꽃·약초·향신료 주문서로 의뢰가 오간다. “말린 협죽도 한 단”이 누군가의 사형 선고.',
        secret: '결사의 ‘규율’(아이·임산부는 안 죽인다)은 갈수록 무뎌지고, 한 실행자가 이를 받아들이지 못한다.',
        pitfall: '검은 후드 떼거리의 멋부림. 평범한 일상으로 위장한 살인의 ‘건조함’이 진짜 공포다.',
      },
      {
        name: '상인·무역 비밀동맹',
        aka: '저울의 형제·항로의 주인·일곱 깃발 상회',
        era: '향신료와 비단이 왕국의 명운을 가르던 대항해·교역의 시대',
        purpose: '표면: 무역의 안전과 표준 도량형 / 진짜: 가격 담합·항로 독점·밀수와 정보(첩보)의 거래.',
        structure: '대상인 평의회—지부 대표—현지 대리인. 회계장부와 ‘신용’이 곧 권력. 정보망이 군대보다 빠르다.',
        rite: '큰 거래 하나를 손해 보며 성사시켜 ‘신의’를 증명하고, 평의회 앞에서 회계 비밀을 공유한다.',
        symbol: '봉인 인장, 특정 매듭의 화물 끈, 깃발/돛의 색 조합 암호.',
        cant: '환율·시세표에 끼워 넣은 거짓 숫자가 곧 암호. 향신료 등급명이 정치 정보의 코드.',
        secret: '동맹은 전쟁의 양쪽 모두에 물자를 판다 — ‘중립’이 가장 큰 이익이라는 냉소가 핵심.',
        pitfall: '상인=쩨쩨한 악당 클리셰. 국가보다 큰 자본의 ‘초연한 무도덕’을 그려야 무게가 산다.',
      },
      {
        name: '예인·광대 비밀 동인',
        aka: '가면 아래의 사람들·떠도는 무대·붉은 천막',
        era: '권력을 풍자한 죄로 혀가 잘리던 시대, 광대만이 진실을 말할 수 있던 무대 위',
        purpose: '표면: 떠돌이 극단·악사·곡예 / 진짜: 검열을 피해 소식·금서·전갈을 도시에서 도시로 나르는 전령망.',
        structure: '극단=세포. 단장이 윗선과 닿고, 단원은 자기 배역만 안다. 공연이 곧 접선이자 알리바이.',
        rite: '관객 앞에서 즉흥으로 ‘권력자 풍자’를 해내야 한다 — 떨지 않고 웃길 수 있어야 신뢰.',
        symbol: '특정 무늬의 가면, 천막 색, 노래 후렴의 ‘틀린 가사’ 한 줄.',
        cant: '대본의 즉흥 대사에 끼운 진짜 전갈, 마술의 손동작 순서로 신호를 보낸다.',
        secret: '웃기는 배역 뒤에서 이들은 한 왕조를 무너뜨릴 비밀을 운반 중이다 — 광대가 가장 위험한 자.',
        pitfall: '명랑한 거리 공연으로만 소비하는 것. 웃음과 죽음이 한 무대에 있는 긴장이 빠지면 약하다.',
      },
    ],
  },
  {
    key: 'crime', label: '범죄조직·지하세계', icon: '🩸',
    note: '폭력과 충성, 돈과 명예로 굴러가는 조직. 가문형 마피아부터 현대 카르텔·해커 집단까지.',
    items: [
      {
        name: '가문형 범죄 조직',
        aka: '큰집·다섯 가문·기름 바른 손',
        era: '국가의 손이 닿지 않는 이민자 동네·항구, ‘우리끼리의 법’이 진짜 법이던 곳',
        purpose: '표면: 상호부조 친목회·향우회 / 진짜: 보호세·도박·밀수·고리대를 쥔 평행 정부.',
        structure: '두목(돈)—고문—행동대장—병사의 피라미드. 혈연·대부(代父) 관계가 충성의 뼈대.',
        rite: '성화(聖畫)를 태워 손에 쥐고 “배신하면 이렇게 타 사라지겠다” 맹세하고 피로 손을 긋는다.',
        symbol: '반지에 입맞춤, 특정 양복·구두, 식당의 ‘예약된 안쪽 자리’.',
        cant: '직설하지 않는다. “그 친구가 잠들었다”=죽었다, “설거지”=돈세탁, “가족 일”=조직 사안.',
        secret: '엄격한 ‘명예 규율’은 두목 개인의 변덕을 가리는 가면 — 규율을 어긴 건 늘 두목 자신이다.',
        pitfall: '근사한 양복·명대사만 베끼는 것. 충성의 이면에 깔린 ‘공포로 묶인 가족’의 비극을 잡아야 한다.',
      },
      {
        name: '현대 카르텔·신디케이트',
        aka: '회사·물류망·이름 없는 법인',
        era: '국경을 넘는 자본과 폭력이 기업처럼 운영되는 현대',
        purpose: '표면: 합법 사업체(물류·부동산·클럽) / 진짜: 마약·무기·인신의 공급망과 그 세탁.',
        structure: '셀(cell) 구조 — 한 셀이 잡혀도 위로 못 올라가게 차단. 회계·물류·집행이 부서처럼 분업.',
        rite: '명시적 의식보다 ‘되돌릴 수 없는 일’을 함께 저지르게 해 공범으로 묶는 ‘피의 채용’.',
        symbol: '특정 문신·휘장, 차량·로고의 미묘한 변형, 암호화 메신저의 이모지 코드.',
        cant: '평범한 업무 용어로 위장. “화물 25kg”=마약 단위, “인사이동”=처형, “감사팀”=내부 숙청자.',
        secret: '진짜 보스는 합법 기업의 점잖은 임원 — 폭력 조직은 그가 외주 준 한 사업부에 불과하다.',
        pitfall: '총격전 스펙터클에만 의존. 회계·물류라는 ‘지루한 디테일’이 리얼리티를 만든다.',
      },
      {
        name: '협객·강호 문파(무협형)',
        aka: '○○방·□□문·강호의 사람들',
        era: '관(官)이 멀고 무(武)가 가까운 강호, 은원(恩怨)과 명예가 칼로 갈리는 세계',
        purpose: '표면: 무예 수련과 사제(師弟)의 도 / 진짜: 표국(경비)·도박·전장(錢莊) 등 지역 이권의 장악.',
        structure: '장문인—장로—제자(직전/속가)의 사문 위계. 문파 간 동맹·세력균형이 곧 정세.',
        rite: '입문 시 사부 앞에 절하고 문규(門規)를 외우며, 사문을 배신하면 ‘파문·축출’의 벌을 새긴다.',
        symbol: '문파 신물(信物)·영패(令牌), 특유의 병기·복색·손인사(포권).',
        cant: '강호 흑화(黑話)—‘점잖은 분’=고수, ‘찻값을 묻는다’=시비를 건다, 암기(暗器)의 방향으로 신호.',
        secret: '정파를 자처하는 문파가 뒤로는 사파의 자금을 쓴다 — 정/사의 경계가 실은 허울이다.',
        pitfall: '정파=선, 사파=악의 단순 도식. 명분과 이권이 뒤엉킨 회색 강호가 훨씬 깊다.',
      },
      {
        name: '디지털 비밀결사(해커 집단)',
        aka: '익명의 손가락·노드·이름 없는 자들',
        era: '신원이 데이터인 시대, 얼굴 없이 세계 어디서나 모이는 분산형 결사',
        purpose: '표면: 자유·투명성·정의의 수호자 / 진짜: 명성 경쟁·이권·때론 단순한 파괴 충동.',
        structure: '리더 없는 듯 보이나 핵심 운영진이 채널·접근권을 통제. 평판(rep)이 곧 계급.',
        rite: '실력 증명 과제(특정 시스템 침투·인증)를 통과해야 비밀 채널 초대장이 온다.',
        symbol: '가면 아바타, 특정 글리치 로고, ‘서명’처럼 남기는 코드 주석.',
        cant: '내부 은어·밈으로 식별. 평범한 문장에 숨긴 키워드, 게시 시각/해시가 곧 암호.',
        secret: '‘분산·익명’을 외치지만 실제 의사결정은 소수가 독점 — 이상과 현실의 균열이 내분을 부른다.',
        pitfall: '“타닥타닥, 침입 성공” 식 마법 해킹. 사회공학·내부자·실수 같은 진짜 침투의 결을 살릴 것.',
      },
    ],
  },
  {
    key: 'modern', label: '현대 그림자 권력', icon: '🌐',
    note: '음모론적 상상력의 현대형. 막후 카르텔·정보기관 내 파벌·기업 비밀위원회 등. 보이지 않는 손의 유형.',
    items: [
      {
        name: '엘리트 막후 협의체',
        aka: '원탁·위원회·이름 없는 만찬',
        era: '국경보다 자본·정보가 빠른 현대, ‘선출되지 않은 권력’이 거론되는 시대',
        purpose: '표면: 친목·자선·국제 포럼 / 진짜: 정책·시장·여론의 방향을 비공식으로 조율하는 합의 기구.',
        structure: '느슨한 네트워크 — 고정 명부 없이 ‘초대’로만 작동. 회의록 없음, 발언 비공개(채텀하우스 룰).',
        rite: '거창한 의식이 아니라 ‘초대받는 것’ 자체가 입회. 한 번 발설하면 다시는 부르지 않는다.',
        symbol: '특정 리조트·클럽, 드레스코드, 비공개 게스트 명단.',
        cant: '공개 발언과 내부 의도가 따로 — 경기 전망 코멘트가 실은 정책 신호. 침묵이 곧 합의.',
        secret: '실은 합의된 음모가 없다 — 각자 제 이익을 챙길 뿐인데 ‘조율된 것처럼 보이는’ 우연의 정렬.',
        pitfall: '전지전능한 ‘세계 정부’로 그리는 것. 진짜 권력은 무능·이기심·우연이 얽힌 더 어지러운 것.',
      },
      {
        name: '정보기관 내 비밀 분파',
        aka: '안의 안·검은 예산·세탁실',
        era: '냉전과 그 이후, 합법 기관 안에 비합법 작전이 둥지를 튼 회색 시대',
        purpose: '표면: 국가안보 / 진짜: 의회·법의 통제 밖에서 움직이는 자체 의제(작전·자금·요원).',
        structure: '본 조직 안의 ‘부서 아닌 부서’. 칸막이(compartmentation)로 윗선조차 전모를 모른다.',
        rite: '기밀 등급 상승과 ‘알 필요(need-to-know)’ 확장이 단계적 입회. 한 번 알면 못 빠져나온다.',
        symbol: '코드네임 작전, 표지뿐인 위장 회사, 출입증 색·층의 의미.',
        cant: '암호명·약어의 늪. 평범한 출장 보고서에 끼운 진짜 작전, ‘청소’=증거 인멸 같은 완곡어.',
        secret: '분파의 진짜 적은 외부가 아니라 자기 조직 — 통제하려는 본부와 자율을 지키려는 분파의 내전.',
        pitfall: '전능한 ‘딥스테이트’ 신화. 관료제 특유의 무능·예산 싸움·책임 회피가 더 사실적이고 무섭다.',
      },
      {
        name: '기업 비밀 위원회',
        aka: '이사회 위의 이사회·미래기획실·검은 회의',
        era: '국가보다 거대한 기업이 등장한 시대, 주주총회 밖에서 진짜 결정이 나는 곳',
        purpose: '표면: 장기 전략·리스크 관리 / 진짜: 위법 은폐·정관계 로비·내부고발 무력화의 통제탑.',
        structure: '공식 직제 밖의 그림자 라인. 의사록을 남기지 않고 ‘구두 지시’와 ‘부인 가능성’으로 작동.',
        rite: '큰 비밀(분식·은폐) 하나를 떠안겨 ‘너도 공범’으로 묶는 승진 — 사표가 곧 입막음 계약.',
        symbol: '특정 임원 식당·전용 엘리베이터, 파기되는 회의 자료, NDA 더미.',
        cant: '“법무 검토 중”=덮는 중, “구조조정”=입막음, “시너지”=증거 통합 후 폐기 같은 사내 은어.',
        secret: '이 위원회가 가장 두려워하는 건 경쟁사가 아니라 양심을 되찾은 내부자 한 명이다.',
        pitfall: '만화적 악덕 CEO. ‘다들 조금씩 눈감다 거대한 악이 된’ 평범한 공모의 과정이 더 섬뜩하다.',
      },
    ],
  },
]

// ---------- 패턴 사전: 결사를 직접 ‘조립’할 부품들 (무작위 조합 + 검색) ----------
const PATTERNS: PatternCat[] = [
  {
    key: 'purpose', label: '목적·동기', icon: '🎯',
    note: '겉으로 내건 명분(앞)과 실제 목적(뒤)을 따로 가질 때 결사는 입체가 된다.',
    items: [
      { name: '금지된 지식의 보존', note: '권력이 불태운 책·기술·기억을 몰래 지키는 것이 사명. 위험: 보존이 곧 독점이 된다.' },
      { name: '세상의 종말 대비', note: '다가올 파국에서 ‘선택받은 자’만 살리려 한다. 위험: 종말이 안 오면 날짜를 갱신한다.' },
      { name: '잃은 권력의 회복', note: '몰락한 가문·왕조·민족의 영광을 되찾으려는 복수극. 동력: 굴욕의 기억.' },
      { name: '인간 개조·완성', note: '평범한 인간을 ‘다음 단계’로 끌어올린다는 약속. 위험: 누군가를 실험 대상으로.' },
      { name: '질서의 비밀 수호', note: '세상이 무너지지 않게 뒤에서 균형을 잡는다는 자부. 위험: 그 균형이 곧 그들의 지배.' },
      { name: '부와 시장의 독점', note: '거래·정보·자원을 틀어쥐는 것이 목적. 가장 ‘현실적’인 동기.' },
      { name: '복수의 대물림', note: '한 사건의 원한을 세대를 넘겨 갚는다. 동력: 끝나지 않는 장부.' },
      { name: '진실의 폭로', note: '권력이 감춘 비밀을 세상에 터뜨리는 것이 사명. 위험: 폭로가 또 다른 무기가 된다.' },
      { name: '특정 혈통·핏줄의 보존', note: '‘특별한 피’를 잇고 지키려는 집착. 흔한 함정: 우생학적 광기로 미끄러짐.' },
      { name: '신/존재의 강림 준비', note: '무언가를 이 세상에 불러오기 위한 의식의 축적. 톤: 우주적 공포.' },
      { name: '죄책감의 공동 매장', note: '함께 저지른 일을 영원히 묻으려 뭉친다 — 가장 약하지만 가장 끈끈한 결속.' },
      { name: '잊힌 신의 복수', note: '버림받은 옛 신앙을 되살려 배신한 세상에 대가를 치르게 한다.' },
      { name: '재앙의 은밀한 사주', note: '전쟁·역병·공황을 뒤에서 부추겨 그 혼란을 양분으로 삼는다. 위험: 불은 주인도 태운다.' },
      { name: '예언의 자기실현', note: '스스로 퍼뜨린 예언을 손수 이뤄 ‘신성한 운명’으로 위장한다. 동력: 통제된 우연.' },
      { name: '기억의 통제·삭제', note: '특정 사건·인물의 기록을 지워 역사를 다시 쓴다. 위험: 지운 자만이 진실을 쥔다.' },
      { name: '금단의 문 봉인', note: '열려선 안 될 무언가를 영원히 막는 것이 사명. 톤: 의무에 짓눌린 파수꾼의 비극.' },
    ],
  },
  {
    key: 'structure', label: '구조·위계', icon: '🪜',
    note: '구조는 곧 약점이자 드라마. 어떻게 잡혀도 위로 못 올라가게 막느냐가 음모의 묘미.',
    items: [
      { name: '동심원(안쪽 교회)', note: '바깥 회원은 표면 교리만, 안으로 갈수록 진짜 목적을 안다. 배신은 늘 ‘안쪽’에서.' },
      { name: '세포망(cell)', note: '소단위가 서로를 모른다. 한 셀이 잡혀도 전모가 안 드러남. 약점: 소통의 느림.' },
      { name: '등급제(입문 단계)', note: '도제—직인—장인처럼 시험을 통과해 오른다. 위로 갈수록 인원이 급감.' },
      { name: '평의회(과두제)', note: '소수의 동등한 우두머리가 합의로 결정. 약점: 한 명이 배신하면 전체가 흔들린다.' },
      { name: '카리스마 1인 정점', note: '교주·두목 한 사람에게 모든 충성이 모인다. 약점: 그가 죽거나 의심받으면 붕괴.' },
      { name: '얼굴 없는 운영', note: '회람 문서·필명·인장으로만 작동, 서로의 정체를 모름. 누가 진짜 수장인지 아무도 모른다.' },
      { name: '혈연·혼맥 네트워크', note: '피와 결혼으로 엮인 비공식망. 문서가 없어 추적이 어렵다.' },
      { name: '이중조직(합법+지하)', note: '겉의 합법 단체와 속의 비밀 조직이 한 몸. 합법이 지하를 가리는 가면.' },
      { name: '위장된 무정부(분산형)', note: '“리더가 없다”고 외치지만 실제론 소수가 채널·접근권을 쥔다.' },
      { name: '죽은 자의 정점(허수아비)', note: '최고위가 사실 비어 있거나 죽은 자/허구의 인물 — 권위의 환상이 통제 수단.' },
      { name: '윤번제(돌아가는 수장)', note: '우두머리 자리가 주기마다 바뀌어 한 사람에게 권력이 고이지 않는다. 약점: 권력 이양기의 빈틈.' },
      { name: '쌍두 체제(견제하는 둘)', note: '동등한 두 수장이 서로를 감시한다. 균형이 깨지면 즉시 내전으로 번진다.' },
      { name: '문지기 단일 통로', note: '오직 한 ‘관문지기’를 거쳐야 윗선과 닿는다. 그가 죽거나 변절하면 조직이 마비된다.' },
      { name: '세습 가계(핏줄 승계)', note: '지위가 대를 이어 물려진다. 약점: 무능한 후계가 정점에 앉을 위험.' },
    ],
  },
  {
    key: 'rite', label: '입회의식·서약', icon: '🩸',
    note: '의식은 ‘몸의 감각’으로 묘사할 때 살아난다. 추위·매듭·낭독·되돌릴 수 없음.',
    items: [
      { name: '눈을 가린 인도', note: '시야를 빼앗긴 채 미로 같은 길을 끌려간다 — 통제권을 내려놓는 첫 경험.' },
      { name: '상징적 죽음과 부활', note: '관에 눕거나 물에 잠겼다 끌어올려진다 — ‘이전의 나는 죽었다’.' },
      { name: '피의 서약', note: '손을 긋거나 피를 술에 섞어 나눠 마신다. 되돌릴 수 없음을 몸에 새긴다.' },
      { name: '되돌릴 수 없는 공범 행위', note: '함께 범죄·비밀을 저지르게 해 ‘너도 이제 한패’로 묶는다 — 가장 현대적이고 무서운 방식.' },
      { name: '비밀의 교환', note: '자신의 가장 큰 약점/비밀을 털어 인질로 맡긴다. 신뢰가 아니라 ‘상호 인질’.' },
      { name: '철야·단식의 시련', note: '밤새 깨어 있거나 굶기며 환각·탈진 속에서 ‘계시’를 받게 한다.' },
      { name: '새 이름·새 정체성', note: '본명을 버리고 결사명을 받는다 — 바깥 세상과의 연결을 끊는 상징.' },
      { name: '침묵의 맹세', note: '“보고 들은 것을 무덤까지” — 발설 시의 끔찍한 벌을 함께 낭독한다.' },
      { name: '시험 과제(증명)', note: '훔쳐 오기·침투·암살 등 ‘실력과 각오’를 증명할 임무 통과가 곧 입회.' },
      { name: '표식 새기기', note: '문신·낙인·반지 등 몸에 지워지지 않는 표시 — 떠나도 추적당한다.' },
      { name: '책의 순회', note: '한 권의 책에 답을 적어 다음 사람에게 넘기고, 한 바퀴 돌아오면 입회 완료(얼굴 없는 결사).' },
      { name: '과거의 소각', note: '입회자가 자기 옛 신분증·편지·사진을 직접 태운다 — 돌아갈 다리를 스스로 끊는 의식.' },
      { name: '독배의 시련', note: '독이 든 잔과 멀쩡한 잔 중 하나를 믿고 마신다 — 결사에 목숨을 거는 신뢰의 증명.' },
      { name: '대물림 후견', note: '기존 일원 한 명이 보증인이 되어 함께 처벌을 떠안는다 — 둘을 한 운명으로 묶는다.' },
    ],
  },
  {
    key: 'symbol', label: '상징·표식', icon: '👁️',
    note: '상징은 식별·과시·위협의 도구. 노골적일수록 오히려 ‘우리가 여기 있다’는 권력의 표현.',
    items: [
      { name: '모든 것을 보는 눈', note: '감시·전지·각성의 상징. 흔하지만 변형(눈물 흘리는 눈, 감긴 눈)으로 새로워진다.' },
      { name: '꼬리를 문 뱀(우로보로스)', note: '순환·영원·자기소멸. 시작과 끝이 맞물린 비의(秘儀)의 표식.' },
      { name: '직각자와 컴퍼스(도구)', note: '직능 결사의 흔적 — ‘세상을 측량하고 짓는 자들’이라는 자부.' },
      { name: '뒤집힌 별·기하 문양', note: '정통의 별을 비틀어 ‘우리는 다르다’를 표시. 펜타그램·육각형의 변형.' },
      { name: '특정 색의 천·수건·꽃', note: '값싸고 일상적이라 위장에 좋다. 창가의 꽃 한 송이가 ‘안전/위험’의 신호.' },
      { name: '가려진 얼굴·가면', note: '개인을 지우고 결사만 남긴다. 가면은 익명이자 위협.' },
      { name: '봉랍 인장·문장', note: '문서의 진위와 발신자를 증명. 인장의 미세한 흠집이 곧 진위 코드.' },
      { name: '두 얼굴(삶/죽음·정/사)', note: '결사의 이중성을 한 이미지에 담는다 — 보이는 면과 숨은 면.' },
      { name: '꺼진 촛불·등불', note: '진리/생명/구원의 빛, 혹은 그 소멸. 모임의 시작과 끝을 가르는 상징물.' },
      { name: '특정 동물 토템', note: '늑대·까마귀·벌 등으로 결사의 성격을 압축. 깃발·문신·울음소리 흉내로 변주.' },
      { name: '미완·빈자리의 도형', note: '일부러 빠뜨린 한 조각 — “완성은 우리만 안다”는 우월의 표시.' },
      { name: '매듭진 끈·결승(結繩)', note: '매듭의 수와 모양이 곧 등급·전갈. 풀어 버리면 흔적이 남지 않는 일회성 기록.' },
      { name: '거꾸로 새긴 글자', note: '인장이나 문서에 일부러 좌우를 뒤집은 글자 — 비춰 봐야 진짜 뜻이 드러난다.' },
      { name: '한 쌍의 반쪽 패', note: '둘로 쪼갠 패를 맞춰야 신원 확인. 반쪽만으론 아무 의미가 없는 부절(符節).' },
    ],
  },
  {
    key: 'cant', label: '은어·암구호·식별법', icon: '🤫',
    note: '같은 편을 알아보고, 바깥에 들키지 않게 말하는 기술. 평범함을 위장하는 것이 핵심.',
    items: [
      { name: '암구호 문답', note: '“날씨가 거칠군요” → “기둥은 곧습니다”처럼 정해진 응답으로 진위 확인.' },
      { name: '악수·손동작 코드', note: '엄지로 손등 누르기, 손가락 순서, 포권의 각도 등 ‘몸의 비밀’로 등급까지 표시.' },
      { name: '완곡어(직설 회피)', note: '“잠들었다”=죽었다, “설거지”=돈세탁. 평범한 단어에 끔찍한 뜻을 숨긴다.' },
      { name: '겉/속 이중 의미', note: '같은 단어를 안과 밖에서 정반대로 쓴다 — 통역 없인 진의를 못 잡는다.' },
      { name: '첫 글자·세로 읽기', note: '편지 각 줄 첫 글자만 모으면 진짜 전갈. 오타·서식이 곧 코드.' },
      { name: '사물 배치 신호', note: '좌판의 물건·창가의 화분·문기둥의 분필 표시로 ‘여기 안전/위험’을 알린다.' },
      { name: '숫자·시세에 숨긴 코드', note: '환율표·향신료 등급·게시 시각/해시 같은 숫자에 진짜 정보를 끼워 넣는다.' },
      { name: '소리·음악 신호', note: '새 울음 흉내, 후렴의 ‘틀린 가사 한 줄’, 조의 음악의 음정 변화로 전갈.' },
      { name: '직능 위장 용어', note: '“화물 25kg”·“말린 협죽도 한 단”처럼 업종 용어로 위장한 명령.' },
      { name: '내부 멸칭·새 호칭', note: '바깥을 ‘잠든 자들’로, 안을 새 이름으로 불러 정체성을 가른다.' },
      { name: '밈·암호 이모지', note: '메신저의 특정 이모지/밈 조합이 현대형 암구호. 무해해 보일수록 강력.' },
      { name: '특정 호칭·존대 코드', note: '같은 사람을 부르는 호칭이나 존댓말 단계로 신분·등급을 은밀히 드러낸다.' },
      { name: '의도된 침묵·뜸들이기', note: '대답 전 정해진 박자로 뜸을 들이거나 일부러 침묵해 “나는 안다”를 알린다.' },
      { name: '복식·소지품 신호', note: '단추를 채우는 위치, 장갑을 벗는 손, 지니고 다니는 작은 물건으로 같은 편을 알아본다.' },
    ],
  },
]

// ---------- 무작위 영감 조합용 형용 슬롯(결사 이름/한 줄 컨셉 생성기) ----------
const NAME_ADJ = ['침묵의', '꺼지지 않는', '잊힌', '일곱', '세 번째', '붉은', '재의', '달 없는', '마지막', '보이지 않는', '깨어 있는', '봉인된', '검은', '새벽의', '그림자', '열셋의', '백(白)', '잿빛', '먼동의', '뒤집힌', '서리 내린', '피로 맺은', '이름 없는', '아홉', '여명의', '황혼의', '버려진', '두 얼굴의', '소금에 절인', '천 개의', '안개 낀', '한밤의']
const NAME_NOUN = ['형제단', '자매회', '교단', '원탁', '결사', '문(門)', '협회', '위원회', '동맹', '손', '눈', '등불', '서약회', '계(契)', '제단', '문파', '동인', '회(會)', '비망록', '식탁', '회랑', '둥지', '문중', '맹약회', '연회', '서고']
const NAME_OF = ['칼', '열쇠', '재', '거울', '매듭', '봉랍', '뱀', '등불', '저울', '가면', '먼지', '약속', '침묵', '문지방', '모래시계', '깃털', '소금', '꺼진 별', '빈 왕좌', '잠긴 책', '검은 강', '부서진 종', '마른 우물', '식은 재', '닫힌 문', '녹슨 못', '가시관', '깨진 거울', '흰 까마귀', '잊힌 이름', '낡은 지도', '그믐달']

// ---------- 한국어 조사 헬퍼(앞 글자 받침을 보고 실제 조사 하나를 고른다) ----------
function hasFinalConsonant(word: string): boolean {
  const ch = word.replace(/[)\]'"’”』」\s]+$/u, '').slice(-1) // 끝의 괄호·따옴표·공백 제거 후 마지막 글자
  const code = ch.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// 을/를, 이/가, 은/는, 와/과 — 받침 유무로 하나를 골라 붙인다
function withObj(word: string): string { return word + (hasFinalConsonant(word) ? '을' : '를') }

// 조합수 계산용
const comb = (...arrays: unknown[][]) => arrays.reduce((n, a) => n * a.length, 1)
const NAME_COMBOS = comb(NAME_ADJ, NAME_NOUN, NAME_OF)
// 한 결과(설계 초안)를 만들 때 곱해지는 모든 슬롯 풀의 곱 = 이름(ADJ×OF×NOUN) × 목적 × 구조 × 의식 × 상징 × 은어
const BLUEPRINT_COMBOS = NAME_COMBOS
  * findCatLen('purpose') * findCatLen('structure') * findCatLen('rite') * findCatLen('symbol') * findCatLen('cant')
function findCatLen(key: string): number { return PATTERNS.find((p) => p.key === key)!.items.length }

const LS = 'sry:tool:secret-society-ref:'
const ALL = '__all__'
const flatEntries = (): { cat: CatDef; item: Entry }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// 항목을 평문으로(복사/메모용)
function entryToText(c: CatDef, e: Entry): string {
  const lines: string[] = [`${c.icon} [${c.label}] ${e.name}`]
  if (e.aka) lines.push(`· 별칭: ${e.aka}`)
  if (e.era) lines.push(`· 분위기/시대: ${e.era}`)
  if (e.purpose) lines.push(`· 목적(표면/진짜): ${e.purpose}`)
  if (e.structure) lines.push(`· 구조·위계: ${e.structure}`)
  if (e.rite) lines.push(`· 입회의식: ${e.rite}`)
  if (e.symbol) lines.push(`· 상징·표식: ${e.symbol}`)
  if (e.cant) lines.push(`· 은어·식별법: ${e.cant}`)
  if (e.secret) lines.push(`· 숨긴 비밀(플롯 씨앗): ${e.secret}`)
  if (e.pitfall) lines.push(`· 흔한 함정: ${e.pitfall}`)
  return lines.join('\n')
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Blueprint {
  societyName: string
  purpose: PatternItem
  structure: PatternItem
  rite: PatternItem
  symbol: PatternItem
  cant: PatternItem
}
type SlotKey = 'name' | 'purpose' | 'structure' | 'rite' | 'symbol' | 'cant'

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const findCat = (key: string) => PATTERNS.find((p) => p.key === key)!

function rollName(): string {
  return `${pick(NAME_ADJ)} ${pick(NAME_OF)}의 ${pick(NAME_NOUN)}`
}
function rollBlueprint(): Blueprint {
  return {
    societyName: rollName(),
    purpose: pick(findCat('purpose').items),
    structure: pick(findCat('structure').items),
    rite: pick(findCat('rite').items),
    symbol: pick(findCat('symbol').items),
    cant: pick(findCat('cant').items),
  }
}
function blueprintToText(b: Blueprint): string {
  return [
    `『${b.societyName}』 — 결사 설계 초안`,
    `· 목적: ${b.purpose.name} — ${b.purpose.note}`,
    `· 구조: ${b.structure.name} — ${b.structure.note}`,
    `· 입회의식: ${b.rite.name} — ${b.rite.note}`,
    `· 상징: ${b.symbol.name} — ${b.symbol.note}`,
    `· 은어/식별: ${b.cant.name} — ${b.cant.note}`,
  ].join('\n')
}

export default function SecretSocietyRef({ payload }: { payload?: Record<string, unknown> }) {
  const initQuery = typeof payload?.query === 'string' ? (payload.query as string) : ''

  // 탭: 'lib'(유형 사전) / 'forge'(조합 설계기) / 'patterns'(패턴 사전)
  const [tab, setTab] = useState<'lib' | 'forge' | 'patterns'>('lib')
  const [query, setQuery] = useState(initQuery)
  const [cat, setCat] = useState<string>(() => {
    try { const r = localStorage.getItem(LS + 'cat'); if (r && (r === ALL || CATS.some((c) => c.key === r))) return r } catch { /* ignore */ }
    return ALL
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'favs'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o as Record<string, boolean> } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [pcat, setPcat] = useState<string>(PATTERNS[0].key)

  // 조합 설계기 상태(잠금 + 재생성)
  const [bp, setBp] = useState<Blueprint>(() => rollBlueprint())
  const [locks, setLocks] = useState<Record<SlotKey, boolean>>({ name: false, purpose: false, structure: false, rite: false, symbol: false, cant: false })

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 페이로드(다른 도구에서 전달)로 검색어가 오면 사전 탭으로
  useEffect(() => {
    if (initQuery) setTab('lib')
    // 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const patternTotal = useMemo(() => PATTERNS.reduce((n, p) => n + p.items.length, 0), [])

  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL ? flatEntries() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        [item.name, item.aka, item.era, item.purpose, item.structure, item.rite, item.symbol, item.cant, item.secret, item.pitfall]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const toggleExpand = (k: string) => setExpanded((p) => ({ ...p, [k]: !p[k] }))
  const toggleFav = (catKey: string, name: string) => setFavs((p) => {
    const k = favKey(catKey, name); const next = { ...p }
    if (next[k]) delete next[k]; else next[k] = true
    return next
  })

  const flash = (id: string) => {
    setCopiedKey(id)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
  }
  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => flash(id)).catch(() => { /* graceful */ })
  }
  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400)
  }

  // 무작위 사전 항목으로 점프(검색 초기화 + 펼치기)
  const rollDictionary = useCallback(() => {
    const pool = flatEntries()
    const p = pool[Math.floor(Math.random() * pool.length)]
    setCat(ALL); setOnlyFav(false); setQuery('')
    const fk = favKey(p.cat.key, p.item.name)
    setExpanded({ [fk]: true })
    showToast(`무작위: ${p.cat.icon} ${p.item.name}`)
  }, [])

  // ----- 조합 설계기 재생성(잠금 유지) -----
  const reroll = useCallback(() => {
    setBp((prev) => ({
      societyName: locks.name ? prev.societyName : rollName(),
      purpose: locks.purpose ? prev.purpose : pick(findCat('purpose').items),
      structure: locks.structure ? prev.structure : pick(findCat('structure').items),
      rite: locks.rite ? prev.rite : pick(findCat('rite').items),
      symbol: locks.symbol ? prev.symbol : pick(findCat('symbol').items),
      cant: locks.cant ? prev.cant : pick(findCat('cant').items),
    }))
  }, [locks])
  const toggleLock = (k: SlotKey) => setLocks((p) => ({ ...p, [k]: !p[k] }))

  // ----- 연계: 수집함/스니펫/프로젝트 -----
  const toStash = (label: string, text: string) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label, text })
    showToast(`📎 수집함에 담았습니다: ${label}`)
  }
  const toSnippet = (text: string) => {
    addToLibrary('snippets', { text })
    showToast('🧩 스니펫 라이브러리에 저장했습니다.')
  }
  const entryToProject = (c: CatDef, e: Entry) => {
    if (!hasProjectBridge()) return
    const rows: [string, string | undefined][] = [
      ['별칭', e.aka], ['분위기·시대', e.era], ['목적(표면/진짜)', e.purpose], ['구조·위계', e.structure],
      ['입회의식', e.rite], ['상징·표식', e.symbol], ['은어·식별법', e.cant], ['숨긴 비밀', e.secret], ['흔한 함정', e.pitfall],
    ]
    const bodyHtml = [
      `<p><b>${esc(c.icon + ' ' + c.label)} · ${esc(e.name)}</b></p>`,
      ...rows.filter(([, v]) => !!v).map(([k, v]) => `<p><b>${esc(k)}</b><br/>${esc(String(v))}</p>`),
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '결사·조직', title: `${e.name} (${c.label})`, bodyHtml })
    if (id) showToast(`📄 프로젝트 자료 〈결사·조직〉에 ${withObj('‘' + e.name + '’')} 추가했습니다.`)
  }
  const blueprintToProject = (b: Blueprint) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>🕯️ ${esc(b.societyName)}</b> — 결사 설계 초안</p>`,
      `<p><b>목적</b><br/>${esc(b.purpose.name)} — ${esc(b.purpose.note)}</p>`,
      `<p><b>구조</b><br/>${esc(b.structure.name)} — ${esc(b.structure.note)}</p>`,
      `<p><b>입회의식</b><br/>${esc(b.rite.name)} — ${esc(b.rite.note)}</p>`,
      `<p><b>상징</b><br/>${esc(b.symbol.name)} — ${esc(b.symbol.note)}</p>`,
      `<p><b>은어·식별</b><br/>${esc(b.cant.name)} — ${esc(b.cant.note)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '결사·조직', title: `${b.societyName} (설계 초안)`, bodyHtml })
    if (id) showToast(`📄 프로젝트 자료 〈결사·조직〉에 ‘${b.societyName}’ 설계를 추가했습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 })

  const fieldRow = (label: string, value?: string, key?: string) => {
    if (!value) return null
    return (
      <div style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.55, padding: '3px 0', borderTop: '1px dashed var(--border)' }} key={key}>
        <span style={{ flex: '0 0 92px', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ flex: 1 }}>{value}</span>
      </div>
    )
  }

  // ----- 조합 설계기 슬롯 행 -----
  const slotRow = (k: SlotKey, icon: string, label: string, name: string, note?: string) => (
    <div style={{ ...card, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', flex: '0 0 auto' }}><Emoji e={icon} /> {label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{name}</span>
        <button
          className="minibtn"
          onClick={() => toggleLock(k)}
          aria-pressed={locks[k]}
          title={locks[k] ? '잠금 해제(재생성 대상)' : '잠금(재생성에서 제외)'}
          style={{ flex: '0 0 auto', borderColor: locks[k] ? 'var(--accent)' : 'var(--border)' }}
        >
          {locks[k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
      </div>
      {note && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{note}</div>}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('lib')} style={tabBtn(tab === 'lib')}><Emoji e="📖" /> 유형 사전</button>
        <button className="minibtn" onClick={() => setTab('forge')} style={tabBtn(tab === 'forge')}><Emoji e="🎲" /> 조합 설계기</button>
        <button className="minibtn" onClick={() => setTab('patterns')} style={tabBtn(tab === 'patterns')}><Emoji e="🧩" /> 패턴 사전</button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {emojify(toast)}
        </div>
      )}

      {/* ============ 유형 사전 ============ */}
      {tab === 'lib' && (
        <>
          <div style={hint}>
            결사·교단·길드·범죄조직 등 <b>{total}개 유형</b>을 분류·정리했습니다. 음모물·스릴러·판타지의 소재로 검색·펼침해 쓰세요. <i>(사실 주장이 아닌 창작용 윤곽입니다.)</i>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="유형·목적·의식·상징·은어로 검색 (예: 입회, 종말, 은어, 카르텔)" style={input} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL} style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}><Emoji e="✨" /> 전체</button>
            {CATS.map((c) => {
              const on = cat === c.key
              return <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on} style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollDictionary} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 유형</button>
            <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 유형이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : filtered.map(({ cat: c, item }) => {
              const fk = favKey(c.key, item.name)
              const open = !!expanded[fk]
              const isFav = !!favs[fk]
              const cid = 'e:' + fk
              return (
                <div key={fk} style={card}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: '0 0 auto' }}><Emoji e={c.icon} /> {c.label}</span>
                    <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 15, fontWeight: 700, textAlign: 'left', flex: 1, padding: 0 }}>
                      {open ? '▾ ' : '▸ '}{item.name}
                    </button>
                    <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)} style={{ flex: '0 0 auto', borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                  </div>
                  {item.aka && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{item.aka}</div>}
                  {open && (
                    <div style={{ marginTop: 6 }}>
                      {fieldRow('분위기·시대', item.era, 'era')}
                      {fieldRow('목적', item.purpose, 'purpose')}
                      {fieldRow('구조·위계', item.structure, 'structure')}
                      {fieldRow('입회의식', item.rite, 'rite')}
                      {fieldRow('상징·표식', item.symbol, 'symbol')}
                      {fieldRow('은어·식별', item.cant, 'cant')}
                      {fieldRow('숨긴 비밀', item.secret, 'secret')}
                      {fieldRow('흔한 함정', item.pitfall, 'pitfall')}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => copy(entryToText(c, item), cid)}>{copiedKey === cid ? '✓ 복사됨' : <><Emoji e="📋" /> 전체 복사</>}</button>
                        {item.secret && <button className="minibtn" onClick={() => copy(item.secret!, cid + ':sec')}>{copiedKey === cid + ':sec' ? '✓ 복사됨' : <><Emoji e="🌱" /> 비밀만 복사</>}</button>}
                      </div>
                      <div className="linkbar" style={{ marginTop: 8 }}>
                        <span className="linkbar-label">연계:</span>
                        <button className="linkbtn" onClick={() => toStash(item.name, entryToText(c, item))} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
                        <button className="linkbtn" onClick={() => entryToProject(c, item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈결사·조직〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                        <button className="linkbtn" onClick={() => openToolLinked('faction-builder', { title: item.name, intro: item.purpose || '', from: 'secret-society-ref' })} title="세력 설계기를 이 결사로 열기"><Emoji e="⚔️" /> 세력 빌더로</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={hint}>유형은 정답이 아니라 출발점입니다. 표면 목적과 진짜 목적을 어긋나게 두면 음모가 살아납니다.</div>
        </>
      )}

      {/* ============ 조합 설계기 ============ */}
      {tab === 'forge' && (
        <>
          <div style={hint}>
            슬롯을 무작위로 조합해 나만의 결사를 빚습니다. 마음에 드는 칸은 🔒로 잠그고 나머지만 다시 굴리세요. 가능한 설계 조합 약 <b>{BLUEPRINT_COMBOS.toLocaleString()}가지</b>(이름 {NAME_COMBOS.toLocaleString()}가지 × 패턴).
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={reroll}><Emoji e="🎲" /> 다시 굴리기</button>
            <span style={{ ...hint, marginLeft: 'auto' }}><Emoji e="🔒" /> 잠긴 칸은 유지됩니다</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', flex: '0 0 auto' }}><Emoji e="🕯️" /> 이름</span>
              <span style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>{bp.societyName}</span>
              <button className="minibtn" onClick={() => toggleLock('name')} aria-pressed={locks.name} title={locks.name ? '잠금 해제' : '잠금'} style={{ flex: '0 0 auto', borderColor: locks.name ? 'var(--accent)' : 'var(--border)' }}>{locks.name ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
            </div>
            {slotRow('purpose', '🎯', '목적', bp.purpose.name, bp.purpose.note)}
            {slotRow('structure', '🪜', '구조', bp.structure.name, bp.structure.note)}
            {slotRow('rite', '🩸', '입회의식', bp.rite.name, bp.rite.note)}
            {slotRow('symbol', '👁️', '상징', bp.symbol.name, bp.symbol.note)}
            {slotRow('cant', '🤫', '은어·식별', bp.cant.name, bp.cant.note)}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <button className="minibtn" onClick={() => copy(blueprintToText(bp), 'bp')}>{copiedKey === 'bp' ? '✓ 복사됨' : <><Emoji e="📋" /> 설계 복사</>}</button>
              <button className="minibtn" onClick={() => toSnippet(blueprintToText(bp))}><Emoji e="🧩" /> 스니펫 저장</button>
            </div>
            <div className="linkbar" style={{ marginTop: 4 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={() => toStash(bp.societyName, blueprintToText(bp))} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
              <button className="linkbtn" onClick={() => blueprintToProject(bp)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈결사·조직〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
              <button className="linkbtn" onClick={() => openToolLinked('faction-builder', { title: bp.societyName, intro: bp.purpose.note, from: 'secret-society-ref' })} title="이 설계로 세력 설계기 열기"><Emoji e="⚔️" /> 세력 빌더로 보내기</button>
            </div>
            <div style={hint}>이름·목적·구조·의식·상징·은어를 어긋나게 묶을수록 흥미로운 모순이 생깁니다(예: ‘평화 결사’의 피의 서약).</div>
          </div>
        </>
      )}

      {/* ============ 패턴 사전 ============ */}
      {tab === 'patterns' && (
        <>
          <div style={hint}>
            결사를 ‘조립’할 부품 <b>{patternTotal}개</b>를 항목별로 모았습니다. 목적·구조·의식·상징·은어의 패턴을 골라 섞으세요.
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="패턴 검색 (예: 세포, 피의 서약, 우로보로스, 완곡어)" style={input} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PATTERNS.map((p) => {
              const on = pcat === p.key
              return <button key={p.key} className="minibtn" onClick={() => setPcat(p.key)} aria-pressed={on} style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={p.icon} /> {p.label}</button>
            })}
          </div>

          {(() => {
            const c = findCat(pcat)
            const q = query.trim().toLowerCase()
            const items = q ? c.items.filter((it) => it.name.toLowerCase().includes(q) || it.note.toLowerCase().includes(q)) : c.items
            return (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
                {c.note && <div style={{ ...hint, fontStyle: 'italic' }}>{c.note}</div>}
                {items.length === 0 ? (
                  <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '24px 12px' }}>검색 결과가 없습니다.</div>
                ) : items.map((it) => {
                  const cid = 'p:' + c.key + ':' + it.name
                  return (
                    <div key={it.name} style={card}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{it.name}</span>
                        <button className="minibtn" onClick={() => copy(`${it.name} — ${it.note}`, cid)} style={{ flex: '0 0 auto' }}>{copiedKey === cid ? '✓' : <Emoji e="📋" />}</button>
                        <button className="minibtn" onClick={() => toStash(it.name, `${it.name} — ${it.note}`)} disabled={!hasStash()} style={{ flex: '0 0 auto' }} title="수집함에 담기"><Emoji e="📎" /></button>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4, color: 'var(--muted)' }}>{it.note}</div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div className="linkbar" style={{ marginTop: 2 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => setTab('forge')}><Emoji e="🎲" /> 조합 설계기로</button>
            <button className="linkbtn" onClick={() => openToolLinked('faction-builder')} title="세력 설계기 열기"><Emoji e="⚔️" /> 세력 빌더 열기</button>
          </div>
        </>
      )}
    </div>
  )
}
