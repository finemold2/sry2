// 화폐·교역·도량형 사전 — 시대·문화별 화폐 단위, 물가 감각, 교역품, 길이/무게/부피 도량형과 환산을 모은 로컬 고증 사전.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. 자작 텍스트 데이터(백과 베끼기 아님). localStorage(즐겨찾기·마지막 탭·환산기 입력) 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'currency-trade-ref', name: '화폐·교역·도량형 사전', icon: '💰', group: '리서치·자료', intro: '시대·문화별 화폐·물가 감각·교역품·도량형을 찾아 경제 묘사를 고증하세요', w: 680, h: 620 }

/* ──────────────────────────────────────────────────────────────────────────
   데이터 타입
   ────────────────────────────────────────────────────────────────────────── */
interface Entry { name: string; desc: string; tags?: string[] }
interface SubCat { key: string; label: string; icon: string; note?: string; items: Entry[] }
interface TabDef { key: string; label: string; icon: string; intro: string; cats: SubCat[] }

/* ──────────────────────────────────────────────────────────────────────────
   1) 화폐 단위 — 시대·문화별
   ────────────────────────────────────────────────────────────────────────── */
const CURRENCY: SubCat[] = [
  {
    key: 'kr', label: '한국 전통', icon: '🇰🇷', note: '고대~조선·근대. 곡물·포(布)에서 동전·지폐로.',
    items: [
      { name: '쌀(미·米)', desc: '삼국~조선 내내 사실상의 기준 가치. 세금·녹봉·매매가 쌀 섬(石)으로 환산됐다. "한 섬"은 약 144kg 안팎(시대·되 기준에 따라 변동). 흉년에 쌀값이 치솟으면 모든 물가가 따라 뛰었다.', tags: ['곡물본위', '기준재화'] },
      { name: '포(布·베)', desc: '삼베·무명 등 직물을 화폐처럼 썼다. "정포(正布) 한 필" 단위로 거래·세납. 동전이 귀한 지방에서 오래 통용된 현물 화폐.', tags: ['현물화폐', '직물'] },
      { name: '상평통보(常平通寶)', desc: '조선 후기 전국 유통된 엽전. 가운데 네모 구멍에 끈을 꿰어 "한 꿰미(천 닢)" 단위로 들고 다녔다. 무거워서 큰 거래엔 어음·환을 썼다.', tags: ['엽전', '동전'] },
      { name: '냥·전·푼(兩錢分)', desc: '엽전 셈 단위. 1냥=10전=100푼이 흔한 환산. "엽전 한 푼"은 가장 작은 돈, "몇 냥짜리"는 제법 큰 값. 은 한 냥(중량)과 돈 한 냥(가치)은 다른 개념이라 헷갈리기 쉽다.', tags: ['단위', '환산'] },
      { name: '은자(銀子)·은괴', desc: '대규모 거래·대외 무역엔 은을 무게로 달아 썼다. "은 백 냥"은 큰돈. 말굽은(마제은) 형태로 보관·운반.', tags: ['은본위', '무역'] },
      { name: '어음·환(換)', desc: '엽전 운반의 무게를 피하려 객주·상단이 발행한 신용 증서. 먼 지방에서 현금으로 바꿔 받는 송금·외상 수단. 신용이 깨지면 곧바로 부도.', tags: ['신용', '어음'] },
      { name: '백동화·엽전 혼용(개항기)', desc: '개항 후 일본·청 화폐, 백동화, 엽전이 뒤섞여 환율이 매일 출렁였다. 화폐 가치 혼란이 민생 불안의 큰 원인.', tags: ['근대', '혼란'] },
      { name: '원(圓→원)', desc: '근대 이후 십진 화폐. "1원=100전" 체계. 지폐·주화로 정착하며 곡물·포 본위 시대가 막을 내린다.', tags: ['근대', '십진'] },
    ],
  },
  {
    key: 'eu', label: '서양 중세·근세', icon: '🏰', note: '은 본위. 가상의 셈 단위와 실제 주화가 따로 놀았다.',
    items: [
      { name: '파운드·실링·펜스(£·s·d)', desc: '1파운드=20실링=240펜스의 12진·20진 혼합 체계. "파운드"와 "실링"은 오래도록 셈 전용(장부) 단위였고, 실제로 손에 쥐는 건 펜스 은화였다.', tags: ['장부단위', '은화'] },
      { name: '페니(은 페니)', desc: '중세 일상 거래의 기본 은화. 너무 작은 값엔 동전을 반·사분으로 잘라 "반 페니·파딩"으로 썼다. 하루 품삯이 몇 펜스 수준인 시대가 길었다.', tags: ['은화', '소액'] },
      { name: '그로트·플로린·두카트', desc: '큰 거래용 고액 주화. 플로린·두카트는 금화로 국제 무역에서 신뢰받았다. 상인이 "두카트로 셈한다"면 큰 장사다.', tags: ['금화', '무역'] },
      { name: '마르크(셈 단위)', desc: '은 무게에서 온 셈 단위. 지역마다 1마르크가 가리키는 은량이 달라 환산이 까다로웠다.', tags: ['은량', '지역차'] },
      { name: '굴덴·탈러(독일권)', desc: '근세 독일·중부 유럽 은화. 탈러(Thaler)는 훗날 "달러" 어원이 됐다. 영방마다 주조해 무게·순도가 제각각.', tags: ['은화', '어원'] },
      { name: '리브르·수·드니에(프랑스)', desc: '파운드 체계의 프랑스판. 1리브르=20수=240드니에. 역시 리브르·수는 장부 단위, 실제 주화는 드니에 계열.', tags: ['장부단위'] },
      { name: '환전상의 천칭', desc: '주화마다 순도·마모가 달라, 시장 환전상이 천칭으로 무게를 달고 깎인(clipping) 동전을 가려냈다. 위조·동전 깎기는 중죄.', tags: ['환전', '위조'] },
    ],
  },
  {
    key: 'rome', label: '고대 로마·그리스', icon: '🏛️', note: '군인 봉급과 곡물 배급이 물가의 기준선.',
    items: [
      { name: '데나리우스(denarius)', desc: '로마 은화의 기본. 한때 병사의 하루치 급여 가늠선. 후기로 갈수록 은 함량이 줄며 가치가 떨어졌다(인플레이션).', tags: ['은화', '봉급'] },
      { name: '세스테르티우스·아스', desc: '데나리우스 아래 잔돈. 4세스테르티우스=1데나리우스, 다시 아스로 잘게 나뉜다. 일상 물가는 세스테르티우스로 말한다.', tags: ['잔돈'] },
      { name: '아우레우스·솔리두스(금화)', desc: '고액 금화. 후기 솔리두스는 순도를 굳게 지켜 비잔티움까지 장수한 국제 통화가 됐다.', tags: ['금화', '국제'] },
      { name: '드라크마(그리스)', desc: '그리스 은화. 폴리스마다 무게·도안이 달랐다. 숙련공 하루 품삯이 한두 드라크마 안팎으로 자주 비교된다.', tags: ['은화', '폴리스'] },
      { name: '탈렌트·미나(셈 단위)', desc: '거액을 세는 무게 단위. 1탈렌트=60미나로, 한 탈렌트면 나라 살림에 견줄 큰돈. 이야기 속 "탈렌트 단위 빚"은 파멸적이다.', tags: ['거액', '무게'] },
      { name: '곡물 배급(아노나)', desc: '제국이 수도 시민에게 베푼 무상·저가 곡물. 빵값은 곧 정치 안정의 척도였고, 곡물선이 늦으면 폭동이 났다.', tags: ['배급', '정치'] },
    ],
  },
  {
    key: 'cn', label: '중국·동아시아', icon: '🐉', note: '동전·은량·교초(지폐)의 세계.',
    items: [
      { name: '동전(銅錢)·문(文)', desc: '가운데 네모 구멍 엽전. 끈으로 꿰어 "관(貫)/꿰미(약 1000문)" 단위. 무거워서 큰 거래는 은으로 옮겨갔다.', tags: ['엽전', '관'] },
      { name: '관(貫)·민(緡)', desc: '꿰미 단위. 명목상 1관=1000문이나, 실제 꿰미 개수는 시대·지역 관행에 따라 줄었다(단맥短陌).', tags: ['단위', '관행'] },
      { name: '은량(銀兩)·냥', desc: '큰 거래는 은을 무게(냥)로 달아 거래. 순도(紋銀)와 지역 저울 차이로 늘 환산이 따라붙었다. 말굽은(원보).', tags: ['은본위', '무게'] },
      { name: '교초(交鈔)·보초', desc: '세계사적으로 이른 시기의 지폐. 발행 남발로 가치가 폭락한 사례로도 유명—과다 발행이 곧 인플레이션이라는 교훈.', tags: ['지폐', '인플레이션'] },
      { name: '비단·곡물 현물', desc: '동전이 귀하거나 변경에서는 비단 필·곡물 섬이 사실상의 화폐. 봉급·하사품도 비단으로 셈하곤 했다.', tags: ['현물', '비단'] },
      { name: '전장(錢莊)·표호(票號)', desc: '환·송금·예대를 다룬 전통 금융기관. 멀리 떨어진 도시 간 거액을 종이 한 장(은표)으로 옮겼다. 신용 네트워크.', tags: ['금융', '환'] },
    ],
  },
  {
    key: 'islam', label: '이슬람·실크로드', icon: '🕌', note: '금·은 복본위와 장거리 신용.',
    items: [
      { name: '디나르(dinar·금)', desc: '금화. 큰 거래·대외 결제의 기둥. 무게·순도 규격이 비교적 안정돼 국제 신뢰가 높았다.', tags: ['금화', '국제'] },
      { name: '디르함(dirham·은)', desc: '은화. 일상 거래의 기본. 금 디나르와의 교환비는 시장 은·금 시세에 따라 출렁였다.', tags: ['은화', '일상'] },
      { name: '사크(suftaja·환어음)', desc: '먼 도시에서 현금화하는 신용 증서. 사막·바다 길에서 현금을 들고 다니는 위험을 줄였다. 근대 환어음의 조상 격.', tags: ['환어음', '신용'] },
      { name: '대상(隊商)의 셈', desc: '대상 무역은 향료·비단의 무게·부피와 통행세·물값을 더해 도착지 가격을 셈했다. 거리가 멀수록 값이 기하급수로 뛴다.', tags: ['무역', '통행세'] },
    ],
  },
  {
    key: 'fantasy', label: '판타지 관습 화폐', icon: '🐲', note: '이세계·게임풍 통화 설계의 정석 패턴(자작).',
    items: [
      { name: '금화·은화·동화(3단)', desc: '가장 흔한 관습: 1금화=100은화, 1은화=100동화(또는 10:10). 동화는 일상, 은화는 여관·장비, 금화는 큰 거래·세금. 환산을 단순한 10·100진으로 두면 독자가 직관적으로 따라온다.', tags: ['이세계', '3단계'] },
      { name: '플래티넘·미스릴 코인', desc: '금화 위 초고액 주화. 왕실·길드 결제, 마법 재료 거래용. 평민은 평생 한 번 볼까 말까—희소성으로 위세를 그린다.', tags: ['고액', '희소'] },
      { name: '길드 보증서·교환증', desc: '모험가·상인 길드가 발행하는 신용 증서. 도시마다 길드 지부에서 현금화. "현금을 들고 다니지 않는다"는 설정으로 강도 리스크를 우회.', tags: ['신용', '길드'] },
      { name: '마정석·마나 결정', desc: '마법 동력원이 곧 통화가 되는 설정. 크기·순도로 등급을 매겨 거래. 자원이 곧 권력—채굴권 다툼이 분쟁의 씨앗.', tags: ['자원통화', '분쟁'] },
      { name: '소금·향신료 본위', desc: '귀한 자원을 본위로 삼는 변형. 운반·보존이 어려운 소금/향료가 부의 척도가 되면, 무역로와 보관창고가 곧 권력 거점.', tags: ['자원본위'] },
      { name: '신용 점수·각인(SF)', desc: '미래·디스토피아: 화폐가 사라지고 신용 등급·생체 각인으로 결제. 등급이 깎이면 사회에서 사실상 추방—통제와 감시의 은유.', tags: ['SF', '디스토피아'] },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
   2) 물가 감각 — "이만큼이면 얼마"의 직관
   ────────────────────────────────────────────────────────────────────────── */
const PRICES: SubCat[] = [
  {
    key: 'daily', label: '일상 소비', icon: '🍞', note: '하루를 버티는 데 드는 돈의 감각.',
    items: [
      { name: '빵·곡물 한 끼', desc: '전근대 도시 빈민의 지출 대부분은 빵·곡물. 가족이 하루 먹을 빵값이 하루 품삯의 큰 몫을 차지하는 시대가 길었다. 곡물값이 두 배로 뛰면 곧 굶주림과 폭동.', tags: ['주식', '생계'] },
      { name: '맥주·포도주 한 잔', desc: '물이 위험하던 곳에선 맥주·포도주가 일상 음료. 싸구려 막술 한 잔은 동전 몇 닢, 좋은 포도주는 그 수십 배. 술집 한 잔 값으로 빈부를 그릴 수 있다.', tags: ['음료', '술집'] },
      { name: '여관 1박', desc: '마구간 짚더미부터 깨끗한 독방까지 천차만별. "공동 침상 한 자리"는 잔돈, "독방+말 여물+저녁"은 은화 단위. 여비 계산의 단골 항목.', tags: ['숙박', '여비'] },
      { name: '양초·기름·땔감', desc: '밤을 밝히고 겨울을 나는 비용. 좋은 밀랍초는 사치, 짐승 기름 양초는 냄새나는 서민용. 추운 계절 땔감값은 생사가 걸린 지출.', tags: ['연료', '난방'] },
      { name: '목욕·이발·세탁', desc: '도시 공중목욕·이발·세탁은 소액 서비스. 이런 잔돈 지출을 깔면 인물의 생활 수준이 자연스럽게 드러난다.', tags: ['서비스'] },
    ],
  },
  {
    key: 'labor', label: '품삯·봉급', icon: '🛠️', note: '시간을 돈으로 환산하는 감각.',
    items: [
      { name: '일용 노동 하루치', desc: '막노동·날품팔이의 하루 삯. 여기에 다른 모든 물가를 견주면 "비싸다/싸다"가 직관적으로 잡힌다. 비숙련은 숙련공의 절반 안팎이 흔한 비율.', tags: ['기준선', '비숙련'] },
      { name: '숙련공(목수·석공) 하루', desc: '비숙련의 1.5~2배가 흔한 관습. 길드의 정식 장인은 더 받고, 도제는 숙식만 받고 일하기도 한다.', tags: ['숙련', '길드'] },
      { name: '병사 봉급', desc: '많은 시대에 "병사 하루 급여"가 물가의 공인 기준선이었다(예: 데나리우스). 급여가 밀리면 약탈·반란—봉급은 곧 군기.', tags: ['군사', '기준선'] },
      { name: '하인·하녀 연봉(+숙식)', desc: '대개 숙식을 빼고 적은 현금만 받는다. 연 단위 계약이 흔하고, 새경(연봉)을 떼이는 것이 큰 갈등 소재.', tags: ['고용', '숙식'] },
      { name: '전문직(서기·의사·교사)', desc: '글·지식을 파는 직종은 건당·월 단위로 받고, 평판이 곧 단가. 같은 일이라도 귀족 상대냐 평민 상대냐로 값이 크게 갈린다.', tags: ['지식노동', '평판'] },
    ],
  },
  {
    key: 'big', label: '큰돈·자산', icon: '🏠', note: '인생을 바꾸는 단위의 지출.',
    items: [
      { name: '집·토지', desc: '도시 셋집 월세부터 시골 농지 매입까지. 토지는 부와 신분의 근간—상속·저당·소작 갈등의 핵심 자산이다.', tags: ['부동산', '신분'] },
      { name: '말·소·수레', desc: '이동·운송 수단은 큰 투자. 좋은 군마·짐말은 평민에겐 거금. 소 한 마리는 농가 재산 목록의 윗줄.', tags: ['가축', '운송'] },
      { name: '무기·갑옷', desc: '강철 검·전신 갑옷은 숙련공 여러 달치 임금에 해당하는 사치품. "좋은 칼 한 자루 값"은 인물의 재력·각오를 보여준다.', tags: ['장비', '사치'] },
      { name: '책 한 권(필사본)', desc: '인쇄 이전 책은 양피지·필경에 막대한 노동이 들어간 보물. 한 권이 작은 농장 값에 맞먹기도. 도서관·장서가 곧 권력.', tags: ['지식', '희소'] },
      { name: '몸값·뇌물·결혼 지참금', desc: '포로 몸값, 관리 뇌물, 혼인 지참(다우리)은 거액이 오가는 사회적 거래. 가문의 운명을 좌우하는 협상 무대.', tags: ['사회거래', '협상'] },
    ],
  },
  {
    key: 'tips', label: '묘사 팁', icon: '✍️', note: '물가로 인물·세계를 그리는 요령(자작 가이드).',
    items: [
      { name: '기준재 하나를 정하라', desc: '빵·하루 품삯·병사 봉급 중 하나를 "기준선"으로 고정하면, 다른 모든 값을 그에 견줘 독자가 직관적으로 비싸고 쌈을 느낀다. 숫자 나열보다 비교가 힘이 세다.', tags: ['기법'] },
      { name: '체감을 행동으로', desc: '"비쌌다"가 아니라 "그 값이면 한 달을 굶지 않는다"처럼 인물의 생계로 환산해 보여 준다. 망설임·흥정·한숨이 가격표보다 잘 전달한다.', tags: ['기법'] },
      { name: '인플레이션은 사건이다', desc: '곡물값 폭등·화폐 가치 폭락은 그 자체로 플롯 엔진—폭동, 사재기, 위조, 부도. 경제 변동을 배경이 아니라 사건으로 쓰면 긴장이 산다.', tags: ['플롯'] },
      { name: '잔돈의 디테일', desc: '동전을 깨물어 보고, 천칭에 달고, 깎인 동전을 거부하는 사소한 행동이 시대 공기를 만든다. 큰 금액보다 잔돈 묘사가 고증의 향을 낸다.', tags: ['디테일'] },
      { name: '환율·환전의 마찰', desc: '국경·도시마다 다른 통화, 환전 수수료, 위조 위험은 여행자에게 끝없는 마찰. 이 마찰을 갈등·사기·만남의 계기로 활용한다.', tags: ['여행', '갈등'] },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
   3) 교역품 — 무엇이 어디서 어디로 흘렀나
   ────────────────────────────────────────────────────────────────────────── */
const GOODS: SubCat[] = [
  {
    key: 'luxury', label: '사치·고가품', icon: '💎', note: '부피 대비 값이 커서 장거리 무역의 꽃.',
    items: [
      { name: '비단', desc: '동방의 대표 사치품. 가볍고 비싸 장거리 운반에 이상적—실크로드의 이름값. 색·무늬로 신분을 드러내는 권위의 옷감.', tags: ['직물', '동→서'] },
      { name: '향신료(후추·계피·정향)', desc: '보존·조미·약·과시용으로 막대한 수요. 무게당 값이 엄청나 "후추로 셈한다"가 부의 은유. 산지 독점이 곧 제국의 부.', tags: ['향료', '독점'] },
      { name: '유향·몰약', desc: '의식·향료·약재로 쓰인 수지. 사막 대상로의 고가 품목. 신께 바치는 향—종교와 경제가 얽힌 물건.', tags: ['수지', '의식'] },
      { name: '보석·진주·산호', desc: '작고 비싸 휴대·은닉이 쉬워 비상 자산·뇌물·예물로 애용. 산지(인도·페르시아만 등)에서 멀수록 값이 치솟는다.', tags: ['보석', '휴대자산'] },
      { name: '금·은(지금)', desc: '교역품이자 화폐. 산지·광산의 산출량이 곧 국가 경제의 동력. 은 유출입은 물가를 통째로 흔든다.', tags: ['귀금속', '본위'] },
      { name: '자기(도자기)', desc: '동아시아 백자·청자는 깨지기 쉬워도 값이 높아 원거리 무역품. 침몰선의 화물 목록 단골—해양 무역의 상징.', tags: ['공예', '해상'] },
    ],
  },
  {
    key: 'bulk', label: '대량·생필품', icon: '🌾', note: '무겁고 싸서 주로 수운(水運)에 의존.',
    items: [
      { name: '곡물(밀·쌀·보리)', desc: '가장 무겁고 부피 큰 필수 화물. 흉작 지역에 곡물을 실어 나르는 항로가 곧 생명선. 곡물 가격은 모든 물가의 바닥.', tags: ['주식', '수운'] },
      { name: '소금', desc: '보존·생리에 필수라 수요가 끊이지 않는 전략 물자. 염전·암염광·소금길과 소금세(가벨)는 권력과 반란의 단골 소재.', tags: ['전략물자', '세금'] },
      { name: '목재·역청', desc: '배·건물·연료의 원료. 좋은 선박용 목재 산지는 해군력의 기반. 부피가 커 강·바다로 뗏목·선박 운반.', tags: ['원자재', '조선'] },
      { name: '철·구리·주석', desc: '도구·무기·동전의 원료. 주석은 청동의 필수 재료라 산지가 드물어 일찍부터 원거리 교역됐다. 금속 공급은 곧 군사력.', tags: ['금속', '무기'] },
      { name: '모피·가죽', desc: '북방의 대표 수출품. 추운 기후의 사치 방한재로 남방에서 비싸게 팔렸다. 모피 교역이 변경 개척과 충돌을 부른다.', tags: ['북→남', '방한'] },
      { name: '술·기름·도기', desc: '포도주·올리브유를 담은 항아리(암포라)는 고대 지중해 교역의 표준 컨테이너. 침몰선 연대 추정의 단서이기도.', tags: ['지중해', '용기'] },
    ],
  },
  {
    key: 'dark', label: '어두운 교역', icon: '⛓️', note: '플롯의 그림자—갈등과 죄책의 원천.',
    items: [
      { name: '노예·인신매매', desc: '많은 고대·중세 경제의 어두운 토대. 전쟁 포로·부채 노예·납치—해방·도주·반란이 강력한 갈등 축. 다루되 인물의 고통과 존엄을 지워선 안 된다.', tags: ['갈등', '윤리'] },
      { name: '밀수·금제품', desc: '관세·전매를 피해 몰래 옮기는 물자(소금·술·무기·금서). 밀수꾼·세관·뇌물의 삼각관계가 첩보·범죄 플롯의 토양.', tags: ['밀수', '범죄'] },
      { name: '약·독·마약', desc: '치료제이자 독이자 도취제. 같은 물질이 약방·암시장·궁정 음모를 넘나든다. 누가 파느냐가 곧 권력 지도.', tags: ['양면', '음모'] },
      { name: '위조·가짜', desc: '가짜 동전, 물 탄 술, 불순물 섞은 향료. 신뢰가 깨지는 순간 시장 전체가 흔들린다—사기·복수극의 씨앗.', tags: ['사기', '신뢰'] },
    ],
  },
  {
    key: 'route', label: '교역로·거점', icon: '🗺️', note: '물건이 흐르는 길과 그 위의 권력.',
    items: [
      { name: '실크로드(육로)', desc: '오아시스 도시를 잇는 대상로. 비단·향료·기술·종교·역병까지 함께 옮겼다. 통행세를 거두는 도시가 곧 부의 결절점.', tags: ['육로', '대상'] },
      { name: '해상 향료길', desc: '계절풍을 탄 인도양·남중국해 항로. 부피·무게에 강해 대량·고가품을 함께 실었다. 항구 도시가 국제 도시로 번성.', tags: ['해상', '계절풍'] },
      { name: '강·운하 수운', desc: '무거운 곡물·목재·석재는 강과 운하로 옮겼다. 나루·갑문·통행세가 내륙 물류의 길목 권력.', tags: ['내륙', '곡물'] },
      { name: '시장·정기시·박람회', desc: '물건과 환전·신용·소문이 모이는 자리. 정기시(페어)에 맞춰 먼 상인들이 모여 거래와 결제를 몰아서 처리했다.', tags: ['시장', '결제'] },
      { name: '관문·세관·통행세', desc: '다리·고개·국경마다 매기는 통행세·관세가 가격을 부풀린다. 면세 특권·밀수·검문이 갈등을 만든다.', tags: ['관세', '길목'] },
      { name: '창고·길드·상관(商館)', desc: '상품 보관·등급 판정·신용 제공의 거점. 외국 상인의 거류지(상관)는 문화 충돌과 정보 교환의 무대.', tags: ['거점', '길드'] },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
   4) 도량형 — 길이/무게/부피/넓이/시간
   ────────────────────────────────────────────────────────────────────────── */
const MEASURE: SubCat[] = [
  {
    key: 'length', label: '길이·거리', icon: '📏', note: '몸과 보폭에서 온 단위가 많다.',
    items: [
      { name: '치·자·길(한국)', desc: '1자(척)=10치, 1치≈3cm 안팎(용도별 자가 달랐다). "한 길"은 사람 키만 한 깊이·높이. "열 길 물속"의 그 길.', tags: ['한국', '신체'] },
      { name: '리(里)', desc: '거리 단위. 한국에선 흔히 1리≈400m로 셈해 "십리=4km" 감각이 통한다(시대·나라마다 다름). "천 리 길"은 까마득함의 관용구.', tags: ['거리', '관용'] },
      { name: '큐빗·피트·인치', desc: '큐빗=팔꿈치~손끝, 피트=발 길이, 인치=엄지 폭에서 온 신체 단위. 사람마다 달라 "왕의 표준"을 정해 통일하려 애썼다.', tags: ['신체', '서양'] },
      { name: '패덤·리그·마일', desc: '패덤=양팔 벌린 너비(수심 측정), 리그=한 시간쯤 걷는 거리, 마일=로마군 천 걸음(밀레)에서 유래. 바다·길의 거리 감각.', tags: ['항해', '도보'] },
      { name: '보(步)·정(町)·식경(중·일)', desc: '걸음수·구획에서 온 단위. 거리뿐 아니라 "밥 한 끼 지을 동안(식경)"처럼 시간·거리를 함께 가늠하기도.', tags: ['동아시아'] },
    ],
  },
  {
    key: 'weight', label: '무게', icon: '⚖️', note: '곡식 낟알·돌에서 시작된 저울의 세계.',
    items: [
      { name: '근(斤)·냥·돈(동아시아)', desc: '1근=16냥(전통)≈600g 안팎, 1냥=10돈. "고기 한 근"의 그 근. 약재·금은은 더 작은 돈·푼으로 정밀하게.', tags: ['동아시아', '시장'] },
      { name: '관(貫)·섬(石)', desc: '관은 무게(≈3.75kg), 섬은 곡물 부피이자 무게 가늠(쌀 한 섬≈144kg 안팎). 세곡·녹봉을 섬으로 셈했다.', tags: ['대량', '세곡'] },
      { name: '파운드·온스·스톤', desc: '1파운드=16온스, 1스톤=14파운드(영). 몸무게를 스톤으로 말하는 관습이 남아 있다. 상업용·약제용 파운드가 따로 있었다.', tags: ['서양', '관습'] },
      { name: '그레인·캐럿', desc: '그레인=보리·밀 낟알 한 알에서 온 최소 단위(약·화약 계량). 캐럿=캐롭 씨앗에서 온 보석·금 순도 단위.', tags: ['미량', '보석'] },
      { name: '탈렌트·미나·세겔(고대)', desc: '근동·지중해의 무게 겸 화폐 단위. 1탈렌트=60미나처럼 60진이 흔하다. 무게가 곧 돈이던 시대의 잔재.', tags: ['고대', '겸용'] },
    ],
  },
  {
    key: 'volume', label: '부피·되', icon: '🪣', note: '곡식·술·기름을 담아 재던 단위.',
    items: [
      { name: '홉·되·말·섬(한국)', desc: '1되=10홉, 1말=10되, 1섬=10말의 십진 사다리. "쌀 한 되"는 한 가족 한 끼 남짓, "한 말"은 자루 하나. 되질 인심이 인정의 척도.', tags: ['한국', '곡물'] },
      { name: '두(斗)·승(升)(중·일)', desc: '되·말에 대응하는 한자 단위(승=되, 두=말). 술·곡물 거래의 기본. 나라·시대마다 한 되의 실제 부피가 달랐다.', tags: ['동아시아'] },
      { name: '갤런·파인트·쿼트', desc: '술·우유·맥주를 재던 영미식 부피. 1갤런=4쿼트=8파인트. "맥주 한 파인트"의 그 파인트.', tags: ['서양', '술'] },
      { name: '부셸·펙', desc: '곡물·과일을 담는 큰 부피 단위. "사과 한 부셸"처럼 농산물 도매 감각. 시장 됫박(부셸 통)으로 어림했다.', tags: ['농산물', '도매'] },
      { name: '암포라·바리(고대)', desc: '포도주·기름을 담은 항아리가 곧 표준 부피. "암포라 몇 개분"으로 선적량을 셈했다. 깨진 도기 조각이 거래 규모의 단서.', tags: ['고대', '용기'] },
    ],
  },
  {
    key: 'area', label: '넓이·토지', icon: '🌍', note: '소·쟁기·하루 노동에서 온 땅의 단위.',
    items: [
      { name: '평·마지기·결(한국)', desc: '1평≈3.3㎡. 마지기는 "한 말 씨앗을 뿌릴 땅"(지역마다 다름), 결(結)은 소출 기준 세금용 면적. 땅을 면적이 아니라 수확으로 셈하는 발상.', tags: ['한국', '수확기준'] },
      { name: '에이커·하이드', desc: '에이커=소 한 마리가 하루 가는 밭, 하이드=한 가족이 먹고살 만한 땅. 노동·생계 기준의 토지 단위.', tags: ['서양', '노동'] },
      { name: '묘(畝)·경(頃)(중)', desc: '농경 면적 단위. 100묘=1경 식으로 묶었다. 토지대장·조세의 기본 칸.', tags: ['중국', '조세'] },
      { name: '쟁기갈이(carucate)', desc: '쟁기 한 틀로 한 해 갈 수 있는 땅. 가축·인력·계절을 통째로 담은 "노동량=면적" 발상의 대표.', tags: ['중세', '노동량'] },
    ],
  },
  {
    key: 'time', label: '시간·달력', icon: '🕰️', note: '해·물·향이 곧 시계이던 시절.',
    items: [
      { name: '시진·각(동아시아)', desc: '하루를 12시진으로 나누고(자·축·인…), 더 잘게 각(刻)으로 쪼갰다. "축시 무렵"처럼 띠 동물 이름으로 시각을 말한다.', tags: ['동아시아', '12지'] },
      { name: '경(更)·점(밤)', desc: '밤을 다섯 경으로 나눠 야경꾼이 북·종으로 알렸다. "삼경(한밤)"은 깊은 밤. 통금·경비의 시간 틀.', tags: ['야간', '치안'] },
      { name: '해시계·물시계·향시계', desc: '낮은 해그림자, 흐린 날·밤은 물시계, 향이 타들어 가는 길이로도 시간을 쟀다. "향 한 자루 탈 동안"이 곧 시간 단위.', tags: ['도구', '관용'] },
      { name: '교대·종소리(서양)', desc: '수도원 종(기도 시각), 도시 시계탑, 항해 당직의 모래시계·종(벨)이 일과를 나눴다. 정확한 분 개념은 근대의 산물.', tags: ['서양', '종'] },
      { name: '절기·달의 위상', desc: '농경·항해는 태양 절기와 달의 차고 기욺에 의존. "보름 무렵 출항"처럼 일정이 자연 주기에 묶였다. 음력·양력 차이는 갈등·착오의 소재.', tags: ['자연주기', '농경'] },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
   탭 구성
   ────────────────────────────────────────────────────────────────────────── */
const TABS: TabDef[] = [
  { key: 'currency', label: '화폐', icon: '🪙', intro: '시대·문화별 화폐 단위와 그 셈법·신용 수단.', cats: CURRENCY },
  { key: 'price', label: '물가 감각', icon: '🍞', intro: '"이만큼이면 얼마"—생계·품삯·자산의 직관과 묘사 팁.', cats: PRICES },
  { key: 'goods', label: '교역품·교역로', icon: '🚢', intro: '무엇이 어디서 어디로 흘렀나—사치품·생필품·교역로.', cats: GOODS },
  { key: 'measure', label: '도량형', icon: '📐', intro: '길이·무게·부피·넓이·시간 단위와 그 유래.', cats: MEASURE },
]

/* ──────────────────────────────────────────────────────────────────────────
   환산기(자작·근사) — 정밀 변환 아닌 "감각용" 근사치임을 명시
   ────────────────────────────────────────────────────────────────────────── */
interface ConvUnit { key: string; label: string; toBase: number } // base 단위로의 배수
interface ConvGroup { key: string; label: string; icon: string; baseLabel: string; units: ConvUnit[] }
const CONV: ConvGroup[] = [
  {
    key: 'len', label: '길이', icon: '📏', baseLabel: 'cm',
    units: [
      { key: 'chi', label: '치(寸)', toBase: 3.03 },
      { key: 'ja', label: '자(尺)', toBase: 30.3 },
      { key: 'gil', label: '길', toBase: 180 },
      { key: 'inch', label: '인치', toBase: 2.54 },
      { key: 'foot', label: '피트', toBase: 30.48 },
      { key: 'cubit', label: '큐빗', toBase: 45 },
      { key: 'm', label: '미터', toBase: 100 },
      { key: 'ri', label: '리(里·약400m)', toBase: 40000 },
      { key: 'km', label: '킬로미터', toBase: 100000 },
      { key: 'mile', label: '마일', toBase: 160934 },
    ],
  },
  {
    key: 'wt', label: '무게', icon: '⚖️', baseLabel: 'g',
    units: [
      { key: 'don', label: '돈', toBase: 3.75 },
      { key: 'nyang', label: '냥', toBase: 37.5 },
      { key: 'geun', label: '근(斤·약600g)', toBase: 600 },
      { key: 'gwan', label: '관(貫)', toBase: 3750 },
      { key: 'ounce', label: '온스', toBase: 28.35 },
      { key: 'pound', label: '파운드', toBase: 453.6 },
      { key: 'g', label: '그램', toBase: 1 },
      { key: 'kg', label: '킬로그램', toBase: 1000 },
      { key: 'seom', label: '섬(石·쌀≈144kg)', toBase: 144000 },
    ],
  },
  {
    key: 'vol', label: '부피', icon: '🪣', baseLabel: 'mL',
    units: [
      { key: 'hop', label: '홉', toBase: 180 },
      { key: 'doe', label: '되', toBase: 1800 },
      { key: 'mal', label: '말', toBase: 18000 },
      { key: 'pint', label: '파인트', toBase: 473 },
      { key: 'quart', label: '쿼트', toBase: 946 },
      { key: 'gallon', label: '갤런', toBase: 3785 },
      { key: 'L', label: '리터', toBase: 1000 },
      { key: 'mL', label: '밀리리터', toBase: 1 },
    ],
  },
  {
    key: 'area', label: '넓이', icon: '🌍', baseLabel: '㎡',
    units: [
      { key: 'pyeong', label: '평', toBase: 3.306 },
      { key: 'sqm', label: '제곱미터', toBase: 1 },
      { key: 'acre', label: '에이커', toBase: 4047 },
      { key: 'ha', label: '헥타르', toBase: 10000 },
      { key: 'majigi', label: '마지기(≈660㎡)', toBase: 660 },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────────────────
   localStorage 헬퍼 / 유틸
   ────────────────────────────────────────────────────────────────────────── */
const LS = 'sry:tool:currency-trade-ref:'
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function fmt(n: number): string {
  if (!isFinite(n)) return '-'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  let s: string
  if (abs >= 1000 || abs < 0.001) s = n.toPrecision(5)
  else s = n.toFixed(4)
  // 불필요한 0 제거
  if (s.indexOf('.') >= 0 && s.indexOf('e') < 0 && s.indexOf('E') < 0) {
    s = s.replace(/0+$/, '').replace(/\.$/, '')
  }
  return s
}

/* ──────────────────────────────────────────────────────────────────────────
   컴포넌트
   ────────────────────────────────────────────────────────────────────────── */
export default function CurrencyTradeRef({ payload }: { payload?: Record<string, unknown> }) {
  const initTab = typeof payload?.tab === 'string' && TABS.some((t) => t.key === payload.tab)
    ? (payload.tab as string)
    : null

  const [tab, setTab] = useState<string>(() => {
    if (initTab) return initTab
    try {
      const raw = localStorage.getItem(LS + 'tab')
      if (raw && TABS.some((t) => t.key === raw)) return raw
    } catch { /* ignore */ }
    return 'currency'
  })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({}) // subcat 펼침
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [pick, setPick] = useState<{ tabKey: string; cat: SubCat; item: Entry } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 환산기 상태
  const [convGroup, setConvGroup] = useState<string>('len')
  const [convFrom, setConvFrom] = useState<string>('ja')
  const [convVal, setConvVal] = useState<string>('1')
  const [showConv, setShowConv] = useState<boolean>(() => {
    try { return localStorage.getItem(LS + 'showConv') === '1' } catch { return false }
  })

  // 타이머 핸들(복사/토스트 자동 해제)
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'tab', tab) } catch { /* ignore */ } }, [tab])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  useEffect(() => { try { localStorage.setItem(LS + 'showConv', showConv ? '1' : '0') } catch { /* ignore */ } }, [showConv])

  // 언마운트 정리: 남은 타이머 제거(메모리 누수·언마운트 후 setState 방지)
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab) || TABS[0], [tab])
  const total = useMemo(() => TABS.reduce((n, t) => n + t.cats.reduce((m, c) => m + c.items.length, 0), 0), [])

  const favKey = (tabKey: string, catKey: string, name: string) => `${tabKey}::${catKey}::${name}`

  // 검색·필터 결과(현재 탭 기준). 검색은 전체 탭을 가로질러도 되게 옵션화.
  const q = query.trim().toLowerCase()
  const matched = useMemo(() => {
    const out: { tabKey: string; cat: SubCat; item: Entry }[] = []
    const scan = (t: TabDef) => {
      for (const c of t.cats) {
        for (const item of c.items) {
          if (onlyFav && !favs[favKey(t.key, c.key, item.name)]) continue
          if (q) {
            const hay = (item.name + ' ' + item.desc + ' ' + (item.tags || []).join(' ')).toLowerCase()
            if (!hay.includes(q)) continue
          }
          out.push({ tabKey: t.key, cat: c, item })
        }
      }
    }
    // 검색어가 있으면 전체 탭 검색, 없으면 현재 탭만
    if (q || onlyFav) TABS.forEach(scan)
    else scan(activeTab)
    return out
  }, [q, onlyFav, favs, activeTab])

  // 카테고리별 그룹핑(현재 표시용)
  const grouped = useMemo(() => {
    const map = new Map<string, { tabKey: string; cat: SubCat; items: Entry[] }>()
    for (const m of matched) {
      const k = m.tabKey + '::' + m.cat.key
      if (!map.has(k)) map.set(k, { tabKey: m.tabKey, cat: m.cat, items: [] })
      map.get(k)!.items.push(m.item)
    }
    return Array.from(map.values())
  }, [matched])

  const toggleOpen = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }))
  const isOpen = (k: string) => (q || onlyFav) ? true : (open[k] ?? true) // 검색 중엔 전부 펼침

  const toggleFav = (tabKey: string, catKey: string, name: string) => {
    const k = favKey(tabKey, catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const flash = (setter: (v: string | null) => void, timerRef: { current: number | null }, val: string, ms: number) => {
    setter(val)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setter(null), ms)
  }

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      flash(setCopied, copyTimer, id, 1400)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [])

  const entryText = (e: Entry, cat: SubCat) =>
    `${cat.icon} ${cat.label} · ${e.name} — ${e.desc}` + ((e.tags && e.tags.length) ? `  [${e.tags.join(', ')}]` : '')

  // 무작위 1개(현재 표시 풀에서)
  const rollRandom = () => {
    const pool = matched.length ? matched : (() => {
      const o: { tabKey: string; cat: SubCat; item: Entry }[] = []
      activeTab.cats.forEach((c) => c.items.forEach((item) => o.push({ tabKey: activeTab.key, cat: c, item })))
      return o
    })()
    if (!pool.length) { setPick(null); return }
    setPick((prev) => {
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.item.name === prev.item.name && p.cat.key === prev.cat.key) {
        p = pool[Math.floor(Math.random() * pool.length)]
      }
      return p
    })
  }

  /* ── 연계: 수집함 / 프로젝트 / 스니펫 ── */
  const stashEntry = (e: Entry, cat: SubCat) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${cat.icon} ${e.name}`, text: entryText(e, cat) })
    flash(setToast, toastTimer, `수집함에 ‘${e.name}’을(를) 담았습니다.`, 2000)
  }

  const projectEntry = (e: Entry, cat: SubCat, tabKey: string) => {
    if (!hasProjectBridge()) return
    const t = TABS.find((x) => x.key === tabKey)
    const bodyHtml = [
      `<p><b>${escapeHtml(cat.icon + ' ' + cat.label)} · ${escapeHtml(e.name)}</b></p>`,
      `<p>${escapeHtml(e.desc)}</p>`,
      (e.tags && e.tags.length) ? `<p><i>${escapeHtml(e.tags.join(' · '))}</i></p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '경제·교역 고증',
      title: `${e.name} (${t ? t.label : ''} · ${cat.label})`,
      bodyHtml,
    })
    if (id) flash(setToast, toastTimer, `프로젝트 자료 〈경제·교역 고증〉에 ‘${e.name}’을(를) 추가했습니다.`, 2200)
  }

  const snippetEntry = (e: Entry, cat: SubCat) => {
    addToLibrary('snippets', { text: entryText(e, cat), tags: ['경제', '고증', cat.label] })
    flash(setToast, toastTimer, `스니펫 라이브러리에 ‘${e.name}’을(를) 저장했습니다.`, 2000)
  }

  /* ── 환산기 계산 ── */
  const cg = CONV.find((g) => g.key === convGroup) || CONV[0]
  // convFrom 이 현재 그룹에 없으면 첫 단위로 보정
  useEffect(() => {
    if (!cg.units.some((u) => u.key === convFrom)) setConvFrom(cg.units[0].key)
  }, [convGroup]) // eslint-disable-line react-hooks/exhaustive-deps
  const fromUnit = cg.units.find((u) => u.key === convFrom) || cg.units[0]
  const valNum = parseFloat(convVal)
  const baseAmount = isFinite(valNum) ? valNum * fromUnit.toBase : NaN
  const copyConv = () => {
    const lines = cg.units.map((u) => `${fmt(baseAmount / u.toBase)} ${u.label}`)
    const text = `${convVal} ${fromUnit.label} =\n` + lines.map((l) => '  ' + l).join('\n') + `\n(근사 환산 · 화폐·교역·도량형 사전)`
    copy(text, 'conv')
  }

  /* ── 스타일 ── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 13, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px' }
  const tagStyle: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }

  return (
    <div style={wrap}>
      {/* 헤더 인트로 */}
      <div style={hint}>
        시대·문화별 <b>화폐·물가·교역품·도량형</b>을 모은 고증 사전입니다(자작 데이터, 총 <b>{total}항목</b>). 탭으로 분야를 고르고, 검색·펼침/접기·무작위로 찾아 클릭 복사하세요. 환산은 <b>감각용 근사치</b>입니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map((t) => {
          const on = t.key === tab && !q && !onlyFav
          return (
            <button
              key={t.key}
              className="minibtn"
              onClick={() => { setTab(t.key); setQuery(''); setOnlyFav(false) }}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
              title={t.intro}
            >
              <Emoji e={t.icon} /> {t.label}
            </button>
          )
        })}
        <button
          className="minibtn"
          onClick={() => setShowConv((v) => !v)}
          aria-pressed={showConv}
          style={{ marginLeft: 'auto', borderColor: showConv ? 'var(--accent)' : 'var(--border)', color: showConv ? 'var(--text)' : 'var(--muted)' }}
          title="길이·무게·부피·넓이 근사 환산기"
        >
          <Emoji e="🔢" /> 환산기
        </button>
      </div>

      {/* 환산기(접이식) */}
      {showConv && (
        <div style={{ ...card, background: 'var(--paper)', borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {CONV.map((g) => {
              const on = g.key === convGroup
              return (
                <button key={g.key} className="minibtn" onClick={() => setConvGroup(g.key)} aria-pressed={on}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={g.icon} /> {g.label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <input
              value={convVal}
              onChange={(e) => setConvVal(e.target.value)}
              inputMode="decimal"
              placeholder="수량"
              style={{ width: 96, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
            />
            <select
              value={convFrom}
              onChange={(e) => setConvFrom(e.target.value)}
              style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
            >
              {cg.units.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
            <span style={hint}>→ 모든 단위로</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copyConv}>
              {copied === 'conv' ? '✓ 복사됨' : <><Emoji e="📋" /> 결과 복사</>}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {cg.units.map((u) => (
              <div key={u.key}
                style={{ ...tagStyle, padding: '4px 8px', color: u.key === convFrom ? 'var(--accent)' : 'var(--text)', borderColor: u.key === convFrom ? 'var(--accent)' : 'var(--border)' }}>
                <b style={{ fontSize: 12 }}>{fmt(baseAmount / u.toBase)}</b> {u.label}
              </div>
            ))}
          </div>
          <div style={{ ...hint, marginTop: 6 }}>※ 전통 단위는 시대·지역·용도에 따라 실제 값이 달라, 위 환산은 글쓰기 감각을 위한 대략치입니다.</div>
        </div>
      )}

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색 (예: 비단, 후추, 품삯, 인플레이션, 되, 마일) — 전 분야 가로질러 찾습니다"
        style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        {(q || onlyFav) && <span style={hint}>전 분야 검색 중</span>}
        <span style={{ ...hint, marginLeft: 'auto' }}>{matched.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {pick && (
        <div style={{ ...card, background: 'var(--paper)', borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, color: 'var(--accent)' }}><Emoji e={pick.cat.icon} /> {pick.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{emojify(pick.item.name)}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setPick(null)}>✕</button>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, margin: '6px 0' }}>{emojify(pick.item.desc)}</div>
          {pick.item.tags && pick.item.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {pick.item.tags.map((t) => <span key={t} style={tagStyle}>#{t}</span>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(entryText(pick.item, pick.cat), 'pick')}>
              {copied === 'pick' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(pick.tabKey, pick.cat.key, pick.item.name)}>
              {favs[favKey(pick.tabKey, pick.cat.key, pick.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ ...card, background: 'var(--paper)', borderColor: 'var(--ok, var(--accent))', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 — 카테고리별 펼침/접기 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {grouped.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '26px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          grouped.map(({ tabKey, cat, items }) => {
            const gk = tabKey + '::' + cat.key
            const opened = isOpen(gk)
            return (
              <div key={gk} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* 카테고리 헤더 */}
                <button
                  className="minibtn"
                  onClick={() => toggleOpen(gk)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', width: '100%', background: 'var(--panel)' }}
                  aria-expanded={opened}
                >
                  <span style={{ fontSize: 13 }}>{opened ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}><Emoji e={cat.icon} /> {cat.label}</span>
                  <span style={{ ...hint, marginLeft: 6 }}>{items.length}항목</span>
                  {(q || onlyFav) && <span style={{ ...hint }}>· {TABS.find((t) => t.key === tabKey)?.label}</span>}
                </button>
                {cat.note && opened && <div style={{ ...hint, paddingLeft: 6 }}>{emojify(cat.note)}</div>}

                {/* 항목들 */}
                {opened && items.map((item) => {
                  const fk = favKey(tabKey, cat.key, item.name)
                  const isFav = !!favs[fk]
                  const cid = 'item:' + fk
                  return (
                    <div key={fk} style={card}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{emojify(item.name)}</span>
                        <button
                          className="minibtn"
                          title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                          onClick={() => toggleFav(tabKey, cat.key, item.name)}
                          style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{emojify(item.desc)}</div>
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                          {item.tags.map((t) => <span key={t} style={tagStyle}>#{t}</span>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                        <button className="minibtn" onClick={() => copy(entryText(item, cat), cid)}>
                          {copied === cid ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
                        </button>
                        <button className="minibtn" onClick={() => stashEntry(item, cat)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                          <Emoji e="📎" /> 수집함
                        </button>
                        <button className="minibtn" onClick={() => snippetEntry(item, cat)} title="스니펫 라이브러리에 저장">
                          <Emoji e="✂" /> 스니펫
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span className="linkbar-label" style={{ fontSize: 11.5, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={() => { if (pick) projectEntry(pick.item, pick.cat, pick.tabKey); else if (grouped[0] && grouped[0].items[0]) projectEntry(grouped[0].items[0], grouped[0].cat, grouped[0].tabKey) }}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '현재 무작위(또는 첫 항목)를 프로젝트 자료 〈경제·교역 고증〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button
          className="linkbtn"
          onClick={() => openToolLinked('economy-builder', { from: 'currency-trade-ref', tab })}
          title="경제 설정 빌더로 이어가기"
        >
          <Emoji e="🏦" /> 경제 설정 빌더 열기
        </button>
      </div>
    </div>
  )
}
