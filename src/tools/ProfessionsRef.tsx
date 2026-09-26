// 직업 사전 — 인물의 직업을 '진짜 그 일을 하는 사람'처럼 묘사하기 위한 로컬 자료집.
//  직업별로 하루 일과·전문 용어/은어·도구·직업병·갈등거리·계층을 정리한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계 + 관련 도구 열기.
//  ※ 백과 베끼기 없이 직접 작성한 요약·표현. 디테일은 '서사용 출발점'이지 업계 매뉴얼이 아니다.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'professions-ref',
  name: '직업 사전',
  icon: '🧰',
  group: '리서치·자료',
  intro: '직업별 하루 일과·전문 용어/은어·도구·직업병·갈등거리·계층을 정리해 인물 직업 묘사에 활용',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
interface Entry {
  name: string          // 직업명
  aka?: string          // 별칭·세부 직군
  day?: string          // 하루 일과(서사용 단면)
  terms?: string[]      // 전문 용어·은어(현장 말투)
  tools?: string[]      // 도구·장비
  hazards?: string[]    // 직업병·위험·피로
  conflicts?: string[]  // 갈등거리·드라마 소재
  hierarchy?: string    // 계층·서열·승진 구조
  detail?: string       // 묘사 디테일·작가 메모
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(직접 작성) ----------
const CATS: CatDef[] = [
  {
    key: 'medical', label: '의료·돌봄', icon: '🩺',
    note: '생사와 교대근무가 엮인 직군. 피로·감정노동·서열이 드라마의 연료가 된다.',
    items: [
      {
        name: '응급실 간호사', aka: 'ER 간호사·응급간호',
        day: '인계로 시작해 인계로 끝난다. 트리아지(중증도 분류)로 밀려드는 환자를 가르고, 활력징후를 재고, 수액을 걸고, 보호자를 달랜다. 식사는 거른 채로, 화장실은 참은 채로. 코드(심정지) 한 번이면 한 시간이 통째로 증발한다.',
        terms: ['트리아지(중증도 분류)', '코드 블루(심정지 대응)', '바이탈(활력징후)', '라인 잡는다(정맥 확보)', '디씨(퇴원/중단)', '풀방(병상 만실)', '나이트(야간 근무)'],
        tools: ['혈압계·산소포화도 측정기', '수액 세트·주사기', '제세동기', '청진기', '간호기록 단말기', '항상 두 켤레인 편한 신발'],
        hazards: ['하지정맥류·만성 요통', '교대근무 수면장애', '감정 소진(번아웃)', '주삿바늘 자상 위험', '폭언·폭력 노출'],
        conflicts: ['살릴 수 없는 환자 앞의 무력감', '의사 지시와 환자 상태 사이의 직업적 판단 충돌', '보호자의 책임 전가', '신참과 고참의 일머리 갈등', '인력 부족으로 떠넘겨지는 책임'],
        hierarchy: '신규 → 일반 → 책임(차지) → 수간호사 → 간호부장. 연차와 ‘일머리’가 곧 권위.',
        detail: '손등에 펜으로 적은 메모, 알코올솜 냄새, 늘 차가운 손. 퇴근해도 귀에 모니터 알람음이 남는다.',
      },
      {
        name: '외과 의사', aka: '집도의·서전',
        day: '컨퍼런스→회진→수술. 수술방에선 손 씻고(스크럽) 들어가 몇 시간을 선 채로 집중. 응급 콜이 오면 새벽이든 명절이든 달려간다. 차트와 동의서, 합병증 설명까지가 일이다.',
        terms: ['스크럽(소독·세척)', '오픈/클로즈(절개·봉합)', '온콜(대기 호출)', '컨퍼런스(증례 회의)', '합병증', '경과 관찰', '루틴(정규 수술)'],
        tools: ['메스·겸자·봉합기구', '수술 현미경·내시경', '수술등', '영상의학 판독 모니터', '루페(확대경)'],
        hazards: ['장시간 기립으로 인한 허리·목', '손목 건초염', '소송·합병증 스트레스', '수면 박탈'],
        conflicts: ['수술해도 못 살리는 환자', '동의서 너머 가족의 원망', '병원 경영 논리 vs 환자 이익', '실력은 좋지만 인성은 글러먹은 선배', '신기술 도입을 둘러싼 세대 갈등'],
        hierarchy: '인턴 → 레지던트 → 펠로우 → 전문의 → 과장/교수. 집도 경험과 케이스 수가 명함.',
        detail: '수술복 위로 드러난 시계 자국, 마스크에 눌린 콧등, 손가락의 매듭 묶는 습관.',
      },
      {
        name: '구급대원', aka: '응급구조사·EMT',
        day: '출동벨이 울리면 30초 안에 차에 오른다. 도로를 가르며 현장으로, 좁은 계단·골목을 들것 들고 오른다. 처치하며 병원으로 무전, 인계하면 다시 대기. 한 끼를 못 먹는 날도 흔하다.',
        terms: ['출동(디스패치)', '인계', 'CPR(심폐소생)', '백밸브 마스크', '코드(중증 코드)', '핫존/콜드존(위험 구역)'],
        tools: ['들것·척추고정판', '자동제세동기(AED)', '산소통', '응급 키트', '무전기'],
        hazards: ['허리 부상(무게 들기)', '교통사고 위험', '외상후 스트레스', '감염 노출'],
        conflicts: ['살릴 수 있었다는 자책', '취객·폭력 신고자', '응급실 인계 지연', '동료를 잃는 사고', '가짜 신고와 진짜 응급 사이의 판단'],
        hierarchy: '구급대원 → 선임 → 팀장. 현장 경험과 침착함이 곧 신뢰.',
        detail: '장갑 벗을 때 나는 땀, 사이렌이 멈춘 뒤의 정적, 환자 보호자가 따라 부르는 목소리.',
      },
      {
        name: '요양보호사', aka: '돌봄노동자·케어기버',
        day: '어르신 기상·세면·식사·복약·이동을 돕는다. 기저귀를 갈고, 욕창을 살피고, 말동무가 된다. 몸을 들어 옮기는 일이 하루에도 수십 번. 보호자에겐 보고, 어르신에겐 가족 대용.',
        terms: ['수발', '체위변경(욕창 예방)', '와상(누워만 지냄)', '낙상(넘어짐)', '복약 관리', '인지(치매 관련)'],
        tools: ['이동용 휠체어·리프트', '위생장갑·기저귀', '혈압계', '미끄럼방지 매트'],
        hazards: ['허리·어깨 손상', '감정노동·무력감', '저임금·고강도', '폭언 노출'],
        conflicts: ['가족도 외면한 노인을 떠맡음', '학대 의심과 신고의 딜레마', '저임금과 사명감 사이', '치매 어르신의 폭력', '죽음을 가까이서 반복적으로 겪음'],
        hierarchy: '대개 평면적. 시설장·간호조무사 아래에서 가장 손이 많이 가는 자리.',
        detail: '손에 밴 로션 냄새, 어르신 이름을 다정히 부르는 말투, 굽은 허리.',
      },
      {
        name: '약사', aka: '조제사',
        day: '처방전을 검토하고, 약을 짓고, 복약지도를 한다. 약물 상호작용을 체크하고, 일반약 상담을 받고, 재고를 맞춘다. 카운터 너머로 하루 종일 사람을 만난다.',
        terms: ['조제', '복약지도', '병용금기(같이 쓰면 안 되는 약)', '대체조제', '처방전', 'OTC(일반약)'],
        tools: ['자동 조제기', '약품 데이터베이스', '계수 트레이', '저울', '냉장 보관고'],
        hazards: ['장시간 기립', '집중 피로', '약물 분진 노출'],
        conflicts: ['의사 처방의 오류를 발견했을 때', '단골의 약물 오남용 의심', '판매 압박과 양심', '무자격 상담 요구'],
        hierarchy: '근무약사 → 관리약사 → 약국장/개국. 면허가 진입장벽.',
        detail: '하얀 가운, 정확히 세는 손, ‘식후 30분’을 백 번도 더 말하는 입버릇.',
      },
    ],
  },
  {
    key: 'law', label: '법·공권력', icon: '⚖️',
    note: '권한과 책임이 무겁고, 절차와 정의 사이의 틈이 갈등을 만든다.',
    items: [
      {
        name: '형사', aka: '강력계 형사·수사관',
        day: '사건이 터지면 현장으로. 탐문하고, CCTV를 돌려보고, 통신·금융 기록을 뒤진다. 잠복은 며칠씩, 식사는 차 안에서. 조서를 꾸미고, 검찰에 송치하고, 다음 사건이 또 들어온다.',
        terms: ['탐문', '잠복', '입건/송치', '피의자/참고인', '알리바이', '현장 보존', '용의선상', '진술 번복'],
        tools: ['수첩·녹취기', '무전기', '수갑', '감식 키트(현장 협조)', '낡은 업무용 차'],
        hazards: ['불규칙한 식사·수면', '위험한 검거', '외상후 스트레스', '음주·흡연 의존'],
        conflicts: ['심증은 있으나 증거가 없음', '실적 압박과 진실 사이', '내부 비리·은폐', '가족과의 시간 부재', '범인을 놓쳤다는 자책'],
        hierarchy: '순경 → 경장 → 경사 → 경위… 계급사회. 실적과 검거가 명함.',
        detail: '구겨진 양복, 손때 묻은 수첩, 사건 현장 사진을 벽에 붙이는 습관, 짙은 다크서클.',
      },
      {
        name: '변호사', aka: '소송대리인',
        day: '의뢰인 상담, 서면 작성, 증거 정리, 법정 출석. 판례를 뒤지고, 전략을 짜고, 합의 협상을 한다. 마감(서면 제출 기한)에 쫓기고, 수임료와 양심 사이에서 줄을 탄다.',
        terms: ['수임', '서면(준비서면)', '변론', '입증책임', '항소/상고', '합의', '구속영장', '무죄추정'],
        tools: ['판례 데이터베이스', '서류 가방', '법전', '녹취·메모 도구'],
        hazards: ['과로·만성 스트레스', '감정노동', '평판 리스크'],
        conflicts: ['유죄가 분명한 의뢰인 변호', '돈 되는 사건 vs 옳은 사건', '의뢰인의 거짓말', '대형 로펌의 물량 공세', '이긴 뒤의 공허함'],
        hierarchy: '어소시에이트(고용변호사) → 파트너 → 시니어. 송무 vs 자문 트랙이 갈린다.',
        detail: '잘 다린 셔츠, 서류 위 형광펜 줄, 법정에서의 목소리 전환, 늦은 밤 사무실 불빛.',
      },
      {
        name: '판사', aka: '법관',
        day: '기록을 읽고, 변론을 듣고, 판결문을 쓴다. 하루에도 여러 사건을 다루며, 한 사람의 인생을 좌우하는 결정을 내린다. 합의(재판부 협의)와 고독한 숙고를 오간다.',
        terms: ['공판', '선고', '양형(형량 결정)', '구속/불구속', '기각/인용', '판결문', '심급'],
        tools: ['기록 더미', '법전·판례집', '법대(높은 자리)', '법봉(상징)'],
        hazards: ['판단의 무게', '사회적 비판', '고립감', '과중한 사건 부담'],
        conflicts: ['법대로 vs 정의로운가', '여론과 법리 사이', '오판의 두려움', '재판부 내 의견 대립'],
        hierarchy: '배석판사 → 재판장(부장판사) → 법원장. 경력과 신망이 쌓일수록 무게.',
        detail: '검은 법복, 신중한 어투, 감정을 드러내지 않는 표정, 판결 전의 긴 침묵.',
      },
      {
        name: '교도관', aka: '교정직 공무원',
        day: '점호로 시작해 점호로 끝난다. 수감자 동선을 통제하고, 면회를 관리하고, 작업·운동 시간을 감독한다. 긴장의 끈을 놓을 수 없는 폐쇄 공간에서의 교대근무.',
        terms: ['점호(인원 확인)', '계호(감시·호송)', '징벌방(독거)', '면회', '출역(작업)', '검방(방 검사)'],
        tools: ['열쇠 꾸러미·통제실', '무전기', '제압 장비', 'CCTV 모니터'],
        hazards: ['긴장 상태 상시 유지', '폭력·인질 위험', '심리적 고립', '교대근무 피로'],
        conflicts: ['교화 vs 처벌', '수감자와의 미묘한 신뢰', '내부 부패·청탁', '바깥세상과 단절된 일상', '재범하는 출소자를 다시 보는 일'],
        hierarchy: '교위 → 교감 → 교정관. 계급제 공무원 조직.',
        detail: '철문 잠그는 소리, 절도 있는 걸음, 감정을 숨긴 무표정, 퇴근 후에도 남는 긴장.',
      },
    ],
  },
  {
    key: 'trade', label: '기술·현장직', icon: '🔧',
    note: '몸과 손으로 세상을 짓고 고치는 사람들. 위험·자부심·견습 문화가 짙다.',
    items: [
      {
        name: '용접공', aka: '용접사·철공',
        day: '도면을 보고 부재를 맞춰 점용접(가용접)으로 잡은 뒤 본용접. 불꽃과 슬래그를 뒤집어쓰며 자세를 바꿔 가며 붙인다. 고소작업·밀폐공간이면 안전이 곧 목숨.',
        terms: ['가용접(임시 고정)', '본용접', '슬래그(찌꺼기)', '비드(용접선)', '기공(결함)', '아크(전기 불꽃)', '입화(불티)'],
        tools: ['용접기·용접봉', '용접면(헬멧)', '그라인더', '가죽 앞치마·장갑', '치핑해머'],
        hazards: ['전광성 안염(눈 화상)', '금속 흄 흡입', '화상·불티', '추락·밀폐공간 질식'],
        conflicts: ['공기(공사 기간) 압박 vs 안전', '하청 구조의 저임금', '베테랑의 텃세', '눈에 안 보이는 결함의 책임'],
        hierarchy: '잡부/조공 → 기공 → 반장 → 작업반장. 자격증과 ‘붙여본 양’이 실력.',
        detail: '햇볕에 그을린 목, 작업복의 탄 자국, 면(헬멧)을 탁 내리는 손동작, 불꽃 냄새.',
      },
      {
        name: '전기기사', aka: '전공·전기기능사',
        day: '배전반을 점검하고, 차단기를 내리고, 배선을 끌고, 결선한다. 정전 작업은 새벽이나 휴일. 활선(전기 흐르는 상태) 작업은 한순간의 방심이 사고.',
        terms: ['활선/정전 작업', '결선(배선 연결)', '차단기(브레이커)', '누전', '접지', '배전반', '단상/삼상'],
        tools: ['검전기·테스터(멀티미터)', '절연 장갑·공구', '와이어 스트리퍼', '안전대(고소)'],
        hazards: ['감전·아크 플래시', '추락', '화상'],
        conflicts: ['안전 절차 생략 압박', '오래된 배선의 책임 소재', '면허·무면허 시공 갈등'],
        hierarchy: '보조 → 기능사 → 기사 → 기술사. 자격증 등급이 곧 단가.',
        detail: '허리춤 공구벨트의 무게, 색깔로 외운 배선 규칙, ‘이거 안 끊었지?’를 두 번 확인하는 버릇.',
      },
      {
        name: '목수', aka: '대목·인테리어 목공',
        day: '치수를 재고, 자르고, 맞추고, 박는다. 골조부터 마감까지. 톱밥을 뒤집어쓰고 무릎을 꿇었다 폈다. 한 치의 오차가 전체를 틀어지게 한다.',
        terms: ['먹줄(기준선)', '재단(자르기)', '결구(짜맞춤)', '수평/수직 본다', '마감', '하자', '실측'],
        tools: ['전동 톱·드릴·타카', '대패·끌', '수평계·줄자', '먹통(먹줄통)'],
        hazards: ['절단·끼임 사고', '톱밥·분진 흡입', '관절·허리 부담', '소음성 난청'],
        conflicts: ['싸게 빨리 vs 제대로', '설계와 현실의 어긋남', '집주인의 변덕', '하자 보수 책임'],
        hierarchy: '데모도(보조) → 기공 → 도편수(우두머리). 손맛과 눈썰미가 경력.',
        detail: '연필을 귀에 꽂는 습관, 손바닥의 굳은살, 나무 향, 두드려보고 듣는 소리.',
      },
      {
        name: '자동차 정비사', aka: '카센터 기술자·미캐닉',
        day: '입고된 차의 증상을 듣고 진단기를 물린다. 리프트로 차를 올려 하체를 보고, 부품을 갈고, 시운전한다. 손에 기름때, 코에 엔진오일 냄새.',
        terms: ['진단(스캐너)', '리프트(차 올림)', '하체', '얼라인먼트(정렬)', '소모품', '엔진경고등', '시운전'],
        tools: ['진단기(OBD 스캐너)', '리프트', '소켓·렌치 세트', '잭', '토크렌치'],
        hazards: ['손 끼임·화상', '낙하물', '유해물질(오일·세척제) 노출', '근골격계 부담'],
        conflicts: ['과잉 정비 vs 정직한 견적', '고객의 불신', '중고 부품 논란', '시간당 공임 압박'],
        hierarchy: '견습 → 정비기능사 → 정비기사 → 공장장/사장. 진단 실력이 평판.',
        detail: '손톱 밑 기름때, 작업복 명찰, 엔진 소리만 듣고 짚어내는 감, 헝겊으로 손 닦는 동작.',
      },
      {
        name: '농부', aka: '경작자·축산농',
        day: '해 뜨기 전 들에 나간다. 파종·물대기·방제·수확이 절기를 따라 돈다. 날씨가 곧 생계. 기계를 돌리고, 비료를 주고, 시세를 살핀다. 쉬는 날이 따로 없다.',
        terms: ['파종(씨뿌리기)', '방제(병해충 관리)', '관수(물대기)', '수확', '연작 피해', '시세', '하우스(비닐온실)'],
        tools: ['트랙터·경운기', '관수 설비', '농약 분무기', '비닐하우스', '저장 창고'],
        hazards: ['농기계 사고', '농약 노출', '폭염·한파 노출', '관절 손상'],
        conflicts: ['날씨·기후 변화', '농산물 값 폭락', '고령화·일손 부족', '대형 유통의 단가 후려치기', '땅을 둘러싼 가족 갈등'],
        hierarchy: '대개 가족 단위. 마을·작목반의 연장자가 발언권.',
        detail: '햇볕에 탄 주름, 흙 묻은 장화, 하늘을 올려다보는 버릇, 작물을 자식처럼 부르는 말투.',
      },
      {
        name: '어부', aka: '선원·연근해 어업인',
        day: '물때를 보고 새벽에 출항. 그물을 내리고 올리고, 잡은 것을 분류하고, 항으로 돌아와 위판한다. 파도와 날씨가 목숨값. 만선과 빈 그물 사이를 오간다.',
        terms: ['물때(조석)', '출어/귀항', '어획', '위판(경매)', '만선', '그물 손질', '어장'],
        tools: ['어선·엔진', '그물·통발', '어군탐지기', '윈치(그물 감개)', '구명조끼'],
        hazards: ['해상 조난·실족', '저체온증', '그물·로프 사고', '불규칙한 수면'],
        conflicts: ['빈 그물의 생계 불안', '어장 분쟁', '연료비 vs 어획량', '날씨에 발 묶임', '바다에서 동료를 잃는 일'],
        hierarchy: '선원 → 갑판장 → 선장. 선장의 ‘바다 읽는 눈’이 절대적.',
        detail: '소금기에 절은 손, 비릿한 냄새, 수평선을 가늠하는 눈, 거친 손마디.',
      },
    ],
  },
  {
    key: 'service', label: '서비스·접객', icon: '🍽️',
    note: '사람을 상대하는 감정노동의 최전선. 미소 뒤의 피로가 이야기가 된다.',
    items: [
      {
        name: '바리스타', aka: '커피 추출사',
        day: '오픈 전 그라인더를 세팅하고 머신을 예열한다. 주문이 몰리면 샷을 내리고, 스팀으로 우유를 데우고, 라테아트를 그린다. 마감엔 머신을 분해해 청소.',
        terms: ['샷(에스프레소 추출)', '도징/탬핑(가루 담기·다지기)', '스티밍(우유 데우기)', '추출 시간', '원두 블렌딩', '드립', '오픈/마감'],
        tools: ['에스프레소 머신', '그라인더', '탬퍼', '밀크 피처', '저울·타이머'],
        hazards: ['손목·어깨 반복 부담', '화상(스팀)', '장시간 기립', '카페인 의존'],
        conflicts: ['진상 손님', '예술 vs 회전율', '저임금·잦은 이직', '체인점 매뉴얼과 자기 색깔'],
        hierarchy: '파트타임 → 정직원 → 매니저 → 점장. 바 안에서의 손 빠르기가 인정.',
        detail: '앞치마, 손등의 작은 화상 자국, 원두 향을 맡고 상태를 아는 코, 잔을 닦는 손.',
      },
      {
        name: '호텔 컨시어지', aka: '프런트·게스트 서비스',
        day: '체크인·체크아웃을 처리하고, 예약을 조율하고, 손님의 까다로운 요청을 ‘안 된다’ 없이 풀어낸다. 미소는 직무의 일부. VIP 응대엔 디테일이 생명.',
        terms: ['체크인/아웃', '오버부킹(초과 예약)', '컴플레인(불만)', '업그레이드', 'VIP 노티스', '하우스키핑(객실 정비)'],
        tools: ['예약 관리 시스템', '전화·무전', '지역 정보 노트', '단정한 유니폼'],
        hazards: ['감정노동', '야간 근무', '서서 일하기'],
        conflicts: ['무리한 요청과 규정 사이', '오버부킹 사태 수습', '진상 VIP', '팁·청탁의 윤리'],
        hierarchy: '벨맨/프런트 → 컨시어지 → 당직 매니저 → 총지배인. 응대 평판이 자산.',
        detail: '흐트러지지 않는 미소, 이름을 기억하는 능력, 손님이 등 돌린 뒤의 한숨.',
      },
      {
        name: '주방장', aka: '셰프·조리장',
        day: '식재료를 검수하고, 밑준비(미장플라스)를 시키고, 피크 타임엔 패스(완성 라인)에서 모든 접시를 점검한다. 불 앞에서 몇 시간. 고함과 정적이 교차하는 전쟁터.',
        terms: ['미장플라스(밑준비)', '패스(서빙 라인)', '피크 타임', '플레이팅', '온더플라이(즉석 추가)', '86(품절)', '브리가드(주방 편제)'],
        tools: ['칼 세트', '화구·오븐', '저울·온도계', '냄비·팬', '스테인리스 작업대'],
        hazards: ['화상·자상', '장시간 기립', '고온 환경', '번아웃·과음'],
        conflicts: ['예술 vs 원가', '주방 위계의 폭력성', '서빙과 주방의 갈등', '리뷰 한 줄에 무너지는 자존심'],
        hierarchy: '막내 → 라인쿡 → 수셰프 → 헤드셰프. 주방은 군대식 위계가 강하다.',
        detail: '칼자국 난 손, 화상 자국, 간을 보는 새끼손가락, 접시를 ‘딱’ 내려놓는 소리.',
      },
      {
        name: '미용사', aka: '헤어 디자이너',
        day: '예약 손님을 받아 상담하고, 커트·펌·염색을 한다. 서서 팔을 든 채 몇 시간. 손님의 인생사를 듣는 상담사이기도 하다. 마감엔 바닥의 머리카락을 쓴다.',
        terms: ['시술', '베이스(밑색)', '펌(파마)', '리터치(뿌리 염색)', '레이어(층)', '단골', '인턴(스태프)'],
        tools: ['가위·클리퍼', '드라이어·고데기', '염색 도구', '거울 앞 의자'],
        hazards: ['손목·어깨 부담', '약품(염모제) 노출', '하지정맥류', '장시간 기립'],
        conflicts: ['손님의 ‘알아서 예쁘게’', '실패한 시술 책임', '인턴의 박봉·도제 문화', '단골 이탈'],
        hierarchy: '인턴(스태프) → 디자이너 → 원장. 단골 수가 곧 매출.',
        detail: '거울로 손님과 눈 맞추는 대화, 가위 소리, 약품 냄새, 자기 머리는 늘 손볼 새 없는 아이러니.',
      },
    ],
  },
  {
    key: 'office', label: '사무·전문직', icon: '💼',
    note: '회의·메일·마감으로 굴러가는 실내 노동. 보이지 않는 정치와 권태가 갈등.',
    items: [
      {
        name: '회계사', aka: '공인회계사·세무',
        day: '장부를 맞추고, 재무제표를 검토하고, 감사 현장에 나간다. 결산기·세무 신고철엔 야근이 일상. 숫자 한 칸의 오차가 큰일이 된다.',
        terms: ['결산', '감사', '재무제표', '분개(분류 기입)', '세무조정', '대차(차변·대변)', '시즌(바쁜 철)'],
        tools: ['회계 소프트웨어·스프레드시트', '계산기', '전표·증빙 더미', '듀얼 모니터'],
        hazards: ['눈·목·손목 피로', '시즌 과로', '책임 스트레스'],
        conflicts: ['분식회계 압박과 양심', '고객사의 무리한 요구', '시즌 번아웃', '실수 한 줄의 책임'],
        hierarchy: '수습 → 회계사 → 매니저 → 파트너. 자격증과 클라이언트가 자산.',
        detail: '형광펜으로 줄친 장부, 두드리는 계산기, 결산기의 컵라면, 떨어지지 않는 안경.',
      },
      {
        name: '기자', aka: '취재기자·리포터',
        day: '아이템 회의 후 취재처로. 사람을 만나고, 자료를 캐고, 마감 시간에 쫓겨 기사를 친다. 특종을 좇고, 데스크의 빨간 줄에 다시 고친다. 사건은 시간을 가리지 않는다.',
        terms: ['데스크(편집 책임자)', '발제(아이템 제안)', '취재원', '오프더레코드', '마감', '단독/특종', '받아쓰기'],
        tools: ['노트북·녹취기', '취재 수첩', '카메라', '연락처 목록'],
        hazards: ['불규칙한 생활', '취재 위험', '소송·압력', '번아웃'],
        conflicts: ['진실 vs 데스크의 방향', '취재원 보호', '오보의 무게', '광고주 눈치', '특종 경쟁'],
        hierarchy: '수습 → 기자 → 차장 → 부장 → 편집국장. 발 빠르기와 인맥이 실력.',
        detail: '늘 울리는 휴대폰, 수첩 빼곡한 약어, ‘마감 5분 전’의 손놀림, 커피로 버티는 눈.',
      },
      {
        name: '프로그래머', aka: '개발자·소프트웨어 엔지니어',
        day: '스탠드업 회의 후 이슈를 잡아 코드를 짠다. 버그를 추적하고, 리뷰를 받고, 배포한다. 한 줄 때문에 밤을 새우기도. 회의와 알림이 집중을 끊는다.',
        terms: ['배포(릴리스)', '버그/디버깅', '리팩터링', '커밋/머지', '코드 리뷰', '스프린트', '롤백', '핫픽스'],
        tools: ['에디터·IDE', '버전 관리(깃)', '터미널', '듀얼 모니터', '이슈 트래커'],
        hazards: ['거북목·손목 터널증후군', '눈 피로', '운동 부족', '번아웃'],
        conflicts: ['기획의 무리한 일정', '기술 부채 vs 빠른 출시', '온콜(장애 대응) 호출', '리뷰를 둘러싼 자존심', '레거시 코드와의 싸움'],
        hierarchy: '주니어 → 시니어 → 리드 → 아키텍트/매니저. 실력과 도메인 지식이 곧 권위.',
        detail: '키보드 소리, 모니터 불빛에 비친 얼굴, 화이트보드 낙서, ‘내 컴에선 되는데’ 입버릇.',
      },
      {
        name: '교사', aka: '담임·교과 교사',
        day: '조회·수업·생활지도·상담·행정업무가 종일 이어진다. 수업 준비는 퇴근 후, 채점은 주말. 학생·학부모·관리자 사이의 줄타기. 한 명도 놓치지 않으려는 분투.',
        terms: ['수업안(지도안)', '생활지도', '담임', '학부모 상담', '평가', '공문(행정)', '진도'],
        tools: ['교재·판서 도구', '출석부·성적 시스템', '교실', '프레젠테이션'],
        hazards: ['목·성대 혹사', '감정노동', '행정 과부하', '번아웃'],
        conflicts: ['교육 vs 입시·성적', '학부모 민원', '문제 학생 지도', '행정업무에 밀리는 수업', '교권 추락'],
        hierarchy: '교사 → 부장교사 → 교감 → 교장. 연차와 보직이 발언권.',
        detail: '분필 가루 묻은 손, 쉰 목소리, 학생 이름을 외우는 노력, 늘 부족한 시간.',
      },
      {
        name: '디자이너', aka: '그래픽·UI 디자이너',
        day: '브리프를 받아 시안을 만들고, 피드백에 따라 수정에 수정을 거듭한다. 마감에 쫓겨 색·여백·폰트를 다듬는다. ‘조금만 더 키워달라’는 요청과 영원히 싸운다.',
        terms: ['시안(드래프트)', '레퍼런스', '컨펌(승인)', '레이아웃', '여백(여유 공간)', '리비전(수정본)', '톤앤매너'],
        tools: ['그래픽 소프트웨어', '태블릿·펜', '색상 팔레트', '폰트 라이브러리'],
        hazards: ['손목·목 부담', '눈 피로', '야근', '창작 압박'],
        conflicts: ['취향 vs 데이터', '끝없는 수정 요청', '저작권·표절 시비', '단가 후려치기', '컨펌권을 가진 비전문가'],
        hierarchy: '주니어 → 시니어 → 아트디렉터. 포트폴리오가 곧 명함.',
        detail: '단축키로 움직이는 손, 1px에 예민한 눈, ‘이게 최종이 아니라더니’의 자조, 색약 검수 습관.',
      },
    ],
  },
  {
    key: 'art', label: '예술·창작', icon: '🎭',
    note: '불안정한 수입과 자아실현 사이. 무대 뒤의 노동과 고독이 드라마.',
    items: [
      {
        name: '배우', aka: '연기자',
        day: '오디션을 보고, 대본을 외우고, 리허설을 한다. 촬영은 새벽부터 밤까지 대기와 짧은 본방의 반복. 감정을 켰다 끄고, 카메라가 멈추면 다시 자기로 돌아온다.',
        terms: ['오디션', '리딩(대본 읽기)', '리허설', '컷/오케이', '대기', '캐릭터 구축', '롱테이크'],
        tools: ['대본·형광펜', '분장 도구', '의상', '대기실'],
        hazards: ['불안정한 수입', '감정 소진', '외모 압박', '불규칙한 생활'],
        conflicts: ['연기 vs 흥행', '캐스팅 정치', '이미지에 갇힘', '무명의 긴 터널', '동료와의 비교'],
        hierarchy: '단역 → 조연 → 주연. 인지도·티켓파워가 서열.',
        detail: '대본 모서리의 접힌 자국, 감정을 불러오는 호흡, 카메라 앞뒤로 달라지는 표정.',
      },
      {
        name: '음악가', aka: '연주자·세션',
        day: '하루 몇 시간씩 연습한다. 리허설, 공연, 녹음 세션을 오간다. 손가락이 곧 밥줄. 무대 위 몇 분을 위해 보이지 않는 수천 시간을 쌓는다.',
        terms: ['리허설', '세션(녹음 참여)', '튜닝', '솔로/합주', '악보', '레퍼토리', '리허설 마크'],
        tools: ['악기', '메트로놈', '악보·보면대', '녹음 장비'],
        hazards: ['손·관절 부상', '청력 손상', '무대 불안', '불안정 수입'],
        conflicts: ['예술 vs 생계', '슬럼프', '동료와의 호흡', '실력 정체', '대중성과 자기 음악'],
        hierarchy: '학생 → 연주자 → 수석/리더. 실력과 명성이 절대적.',
        detail: '손끝의 굳은살, 악기를 다루는 조심스러운 손, 무대 직전의 떨림과 집중.',
      },
      {
        name: '소설가', aka: '작가·문필가',
        day: '책상 앞에 앉는 일이 가장 어렵다. 쓰고 지우고, 자료를 찾고, 마감과 싸운다. 영감을 기다리지 않고 매일 일정량을 친다. 고독이 작업 환경이다.',
        terms: ['초고', '퇴고(고쳐쓰기)', '마감', '플롯', '시놉시스', '교정·교열', '슬럼프(막힘)'],
        tools: ['노트북·원고지', '취재 노트', '자료 더미', '커피'],
        hazards: ['거북목·허리', '고립·우울', '불안정 수입', '눈 피로'],
        conflicts: ['예술성 vs 판매', '마감 공포', '백지의 압박', '평론·악플', '자기 의심'],
        hierarchy: '대개 단독. 등단·수상·판매가 ‘급’을 가른다.',
        detail: '늘어가는 빈 컵, 산책하며 중얼거리는 대사, 메모로 가득한 휴대폰, 마감 전의 폭주.',
      },
      {
        name: '영화 촬영감독', aka: 'DP·촬영기사',
        day: '콘티를 보고 카메라·조명을 설계한다. 현장에서 앵글과 빛을 잡고, 무거운 장비를 옮기며 한 컷에 수십 번 다시 찍는다. 해가 지기 전 ‘매직아워’를 노린다.',
        terms: ['앵글/구도', '조명 세팅', '매직아워(황혼)', '컷/테이크', '핸드헬드', '트래킹(이동 촬영)', '콘티'],
        tools: ['카메라·렌즈', '조명 장비', '삼각대·짐벌', '노출계', '모니터'],
        hazards: ['무거운 장비로 인한 허리·어깨', '장시간 야외', '불규칙한 수면'],
        conflicts: ['감독의 비전 vs 현실', '시간·예산 압박', '날씨와의 싸움', '스태프 안전'],
        hierarchy: '촬영부 막내 → 포커스풀러 → 촬영감독. 현장 장악력이 곧 신뢰.',
        detail: '손으로 만드는 프레임, 빛을 읽는 눈, 무거운 장비를 진 어깨, ‘한 번만 더’의 집착.',
      },
    ],
  },
  {
    key: 'transport', label: '운송·물류', icon: '🚚',
    note: '도로·하늘·바다 위의 노동. 시간 압박과 안전이 매 순간 부딪힌다.',
    items: [
      {
        name: '택시 기사', aka: '운전기사',
        day: '교대로 차를 받아 거리로 나선다. 손님을 태우고 목적지로, 빈 차로 돌아 다시 콜을 잡는다. 밤낮이 바뀌고, 길 위에서 온갖 사람을 만난다.',
        terms: ['콜(호출)', '사납금(입금 기준)', '교대', '빈차/예약', '내비', '단거리/장거리', '진상 손님'],
        tools: ['차량·미터기', '내비게이션', '카드 단말기', '블랙박스'],
        hazards: ['장시간 운전·요통', '교통사고', '취객·시비', '불규칙 수면'],
        conflicts: ['사납금 압박', '취객·승차 거부 시비', '플랫폼 수수료', '심야의 위험'],
        hierarchy: '대개 평면적. 회사 소속/개인택시로 갈림.',
        detail: '룸미러로 보는 눈, 손에 익은 길, 라디오 소리, 밤거리의 피로한 어깨.',
      },
      {
        name: '항공 승무원', aka: '객실 승무원·캐빈크루',
        day: '브리핑 후 기내를 점검하고, 탑승을 돕고, 안전 시연을 한다. 식음료 서비스, 비상 대응, 까다로운 승객 응대까지. 시차와 기압을 몸으로 견딘다.',
        terms: ['브리핑', '캐빈(객실)', '갤리(기내 주방)', '레이오버(체류)', '터뷸런스(난기류)', '안전 시연', '퍼서(사무장)'],
        tools: ['서비스 카트', '안전 장비', '유니폼·캐리어', '응급 키트'],
        hazards: ['시차·수면장애', '기압·건조', '감정노동', '하지 부종'],
        conflicts: ['서비스 vs 안전 권한', '진상 승객', '체력 한계', '잦은 비행과 사생활'],
        hierarchy: '승무원 → 선임 → 사무장(퍼서). 비행시간과 노선이 경력.',
        detail: '흐트러지지 않는 매무새, 좁은 갤리에서의 손놀림, 시차에 절은 눈, 늘 신은 굽 낮은 구두.',
      },
      {
        name: '택배 기사', aka: '배송 기사',
        day: '새벽 분류로 시작한다. 차에 물건을 싣고 동선을 짜 하루 수백 개를 돈다. 계단을 오르내리고, 시간에 쫓기고, 부재중과 반품을 처리한다. 끼니는 차 안에서.',
        terms: ['분류(까대기)', '배송 동선', '집화', '부재(부재중)', '반품', '물량', '터미널'],
        tools: ['배송 차량', '단말기(스캐너)', '카트', '안전화'],
        hazards: ['근골격계 손상', '과로', '교통사고', '계단 낙상'],
        conflicts: ['물량 폭증과 단가', '시간 압박 vs 안전', '고객 컴플레인', '갑질·분실 책임'],
        hierarchy: '대개 개인사업자(위탁). 구역과 물량이 곧 수입.',
        detail: '땀에 젖은 등, 빠른 걸음, 계단 두 칸씩, ‘문 앞에 두고 갑니다’ 문자.',
      },
      {
        name: '선장', aka: '항해사·캡틴',
        day: '항로를 짜고, 날씨를 읽고, 선원을 지휘한다. 입출항·당직을 관리하고, 항해 일지를 쓴다. 배 위의 모든 책임이 한 사람에게 모인다.',
        terms: ['항로', '당직(워치)', '입출항', '항해일지', '좌현/우현', '닻 내림(투묘)', '기관(엔진)'],
        tools: ['해도·레이더', '나침반·GPS', '무전기', '쌍안경', '조타기'],
        hazards: ['해상 조난', '고립·장기 항해', '책임 스트레스', '불규칙 수면'],
        conflicts: ['일정 vs 안전 항해', '선원 통솔', '악천후 판단', '바다 위 고독한 결정'],
        hierarchy: '실습 → 항해사(3등→1등) → 선장. 면허 등급과 항해 경력이 권위.',
        detail: '수평선을 읽는 눈, 절제된 명령, 흔들림에 익은 다리, 항해일지의 깔끔한 글씨.',
      },
    ],
  },
  {
    key: 'finance', label: '금융·상업', icon: '💰',
    note: '돈과 신뢰가 거래되는 곳. 숫자 뒤의 욕망과 압박이 갈등을 빚는다.',
    items: [
      {
        name: '은행원', aka: '창구 직원·여신담당',
        day: '창구를 열어 입출금·송금·상담을 처리한다. 대출 심사, 카드·보험 권유, 마감 시재(현금 맞추기)까지. 숫자 한 자릿수의 오차도 용납되지 않는다.',
        terms: ['시재(현금 정산)', '여신(대출)', '수신(예금)', '연체', '한도', '실적', 'KYC(고객 확인)'],
        tools: ['창구 단말기', '계수기(돈 세는 기계)', '도장·인증 장비', 'CCTV'],
        hazards: ['실적 압박', '감정노동', '책임 스트레스', '장시간 앉기'],
        conflicts: ['고객 이익 vs 판매 실적', '대출 거절의 미안함', '강매 압박', '시재 사고의 공포'],
        hierarchy: '행원 → 대리 → 과장 → 지점장. 실적이 곧 평가.',
        detail: '돈을 세는 빠른 손, 도장 찍는 소리, ‘다음 손님’ 호출, 마감 후 시재 맞추는 긴장.',
      },
      {
        name: '부동산 중개사', aka: '공인중개사',
        day: '매물을 확보하고, 손님에게 집을 보여주고(임장), 계약을 중개한다. 가격을 조율하고, 등기·대출을 챙긴다. 발품이 곧 실적, 한 건 성사가 한 달 수입.',
        terms: ['매물', '임장(현장 방문)', '실거래가', '복비(중개수수료)', '전세/월세', '권리분석', '계약금/잔금'],
        tools: ['매물 시스템', '차량', '계약서·인장', '줄자·나침반'],
        hazards: ['불안정 수입', '발품 피로', '진상 고객', '책임 분쟁'],
        conflicts: ['양쪽 손님의 이해 충돌', '허위 매물 유혹', '계약 파기', '동종업자 경쟁', '하자 책임'],
        hierarchy: '대개 개인 사무소. 지역 장악과 단골이 자산.',
        detail: '늘 울리는 전화, 집 보여주며 짚는 장단점, 명함을 돌리는 손, 발 빠른 걸음.',
      },
      {
        name: '시장 상인', aka: '소상공인·노점',
        day: '새벽 도매시장에서 물건을 떼 온다. 진열하고, 호객하고, 흥정하고, 단골과 안부를 나눈다. 날씨와 손님 발길에 하루 매출이 출렁인다.',
        terms: ['떼다(도매 구입)', '마진', '단골', '떨이(떨이판매)', '자릿세', '에누리(흥정)', '개시(첫 손님)'],
        tools: ['좌판·진열대', '저울', '거스름돈 통', '비닐·봉투'],
        hazards: ['장시간 기립', '날씨 노출', '무거운 짐', '불안정 수입'],
        conflicts: ['대형마트·온라인과의 경쟁', '자릿세·임대료', '재고·폐기 손실', '상인 간 자리 다툼'],
        hierarchy: '대개 평면적. 시장 번영회·연장자가 발언권.',
        detail: '거친 손, 정겨운 호객, 단골 이름을 부르는 정, 저울 눈금을 보는 익숙함.',
      },
    ],
  },
  {
    key: 'science', label: '과학·연구', icon: '🔬',
    note: '검증과 반복의 세계. 성과 압박과 진리 추구 사이의 외로운 노동.',
    items: [
      {
        name: '연구원', aka: '과학자·박사후연구원',
        day: '실험을 설계하고, 반복하고, 데이터를 분석한다. 논문을 읽고 쓰고, 세미나를 발표하고, 연구비를 따낸다. 실패가 일상이고, 한 줄 결과를 위해 몇 달을 쏟는다.',
        terms: ['실험 설계', '재현(반복 검증)', '논문(페이퍼)', '피어리뷰(심사)', '그랜트(연구비)', '데이터셋', '리젝(게재 거절)'],
        tools: ['실험 장비', '분석 소프트웨어', '실험 노트', '안전 후드'],
        hazards: ['시약·방사선 노출', '눈·목 피로', '성과 압박', '고용 불안'],
        conflicts: ['성과 vs 진실성', '연구비 경쟁', '데이터 조작 유혹', '지도교수와의 갈등', '재현 안 되는 결과'],
        hierarchy: '대학원생 → 박사후 → 책임연구원 → 교수/PI. 논문과 인용이 명함.',
        detail: '실험 노트의 빼곡한 기록, 밤새 돌아가는 장비, 결과를 기다리는 초조함, 커피로 버티는 새벽.',
      },
      {
        name: '천문 관측자', aka: '관측천문학자',
        day: '맑은 밤을 기다려 망원경을 돌린다. 날씨가 곧 데이터. 밤새 관측하고 낮엔 잔다. 거대한 데이터에서 미세한 신호를 캐낸다. 우주의 시간 단위로 인내한다.',
        terms: ['관측 시간 배정', '시상(대기 안정도)', '노출', '캘리브레이션(보정)', '적색편이', '광도', '원격 관측'],
        tools: ['망원경·검출기', '데이터 분석 코드', '천문대 돔', '기상 모니터'],
        hazards: ['야간 근무·수면 역전', '고지대 산소 부족', '추위', '고립'],
        conflicts: ['흐린 날씨로 날아간 관측 기회', '관측 시간 경쟁', '데이터 해석 논쟁', '성과의 더딤'],
        hierarchy: '대학원생 → 연구원 → 교수. 발견과 논문이 명성.',
        detail: '별을 보지 않고 화면을 보는 아이러니, 돔이 열리는 소리, 밤하늘에 익은 눈, 두꺼운 외투.',
      },
      {
        name: '법의학자', aka: '부검의·법의관',
        day: '시신을 부검하고, 사인을 규명하고, 감정서를 쓴다. 법정에 증인으로 선다. 냄새와 죽음에 무뎌지지 않으면서도 객관을 지켜야 하는 일.',
        terms: ['부검(검시)', '사인 규명', '시반/시강', '감정서', '생활반응', '사망시각 추정', '독성 분석'],
        tools: ['부검 도구', '현미경', '계측기', '시료 보관', '보호장구'],
        hazards: ['감염 위험', '정신적 부담', '악취 노출', '법정 스트레스'],
        conflicts: ['진실 vs 외압', '유족의 감정', '법정에서의 공방', '죽음을 매일 마주하는 무게'],
        hierarchy: '수련의 → 법의관 → 부장. 감정 경력과 증언 신뢰도가 권위.',
        detail: '냉정한 손, 감정서의 건조한 문체, 죽음 앞의 직업적 침착, 퇴근 후 비누 냄새 집착.',
      },
    ],
  },
  {
    key: 'public', label: '공공·안전', icon: '🚒',
    note: '공익과 위험이 맞닿은 직군. 사명감과 관료제 사이의 마찰이 이야기.',
    items: [
      {
        name: '소방관', aka: '구조·진압대원',
        day: '대기와 출동의 반복. 벨이 울리면 장비를 챙겨 불·사고 현장으로. 진압·구조·구급을 오간다. 훈련과 장비 점검이 일상, 한 번의 출동에 목숨을 건다.',
        terms: ['출동', '진압', '구조', '잔불 정리', '인명 검색', '관창(호스 노즐)', '백드래프트(역화)'],
        tools: ['소방 호스·관창', '공기호흡기(SCBA)', '방화복', '구조 장비', '사다리차'],
        hazards: ['화상·연기 흡입', '붕괴·추락', '외상후 스트레스', '발암물질 노출'],
        conflicts: ['구하지 못한 생명의 자책', '장비·인력 부족', '관료제의 벽', '동료를 잃는 사고', '가짜 신고'],
        hierarchy: '소방사 → 소방장 → 소방위… 계급사회. 현장 경험이 곧 신뢰.',
        detail: '땀과 그을음 냄새, 무거운 장비의 무게, 출동 후의 침묵, 동료를 부르는 콜사인.',
      },
      {
        name: '군인', aka: '직업군인·부사관/장교',
        day: '기상 점호로 시작해 훈련·근무·정비·경계가 종일 이어진다. 명령 체계 안에서 움직이고, 장비를 관리하고, 부하를 통솔한다. 비상 대기가 일상.',
        terms: ['점호', '경계근무', '훈련(FTX)', '상황(비상)', '계급', '보고', '하달(명령 전달)'],
        tools: ['개인 화기·장비', '통신 장비', '전술 차량', '관물대'],
        hazards: ['훈련·작전 위험', '고립·이동 잦음', '위계 스트레스', '외상후 스트레스'],
        conflicts: ['명령 vs 양심', '위계의 부조리', '가족과의 이별', '실전의 공포', '진급 경쟁'],
        hierarchy: '병 → 부사관 → 위관 → 영관 → 장성. 계급이 곧 세계.',
        detail: '각 잡힌 자세, 절제된 말, 군화 광내는 습관, 비상벨에 반사적으로 일어나는 몸.',
      },
      {
        name: '환경미화원', aka: '청소노동자',
        day: '동트기 전 거리로 나선다. 쓰레기를 수거하고, 거리를 쓸고, 분리수거를 처리한다. 무거운 봉투를 들어 차에 싣는 일의 반복. 도시가 깨어나기 전에 일이 끝난다.',
        terms: ['수거', '적재', '분리수거', '노선(수거 구역)', '집하장', '대형 폐기물', '새벽 작업'],
        tools: ['청소차·집게', '빗자루·삽', '안전조끼·장갑', '봉투'],
        hazards: ['교통사고(새벽 도로)', '근골격계 손상', '날카로운 폐기물', '악취·감염'],
        conflicts: ['저평가받는 노동의 자존', '무단 투기와의 싸움', '안전 장비 부족', '새벽 근무의 위험'],
        hierarchy: '대개 평면적. 반장이 노선·인원 배분.',
        detail: '형광 조끼, 거친 손, 새벽 거리의 정적, 무심히 버려진 것 앞의 한숨.',
      },
      {
        name: '사회복지사', aka: '복지 담당·케이스워커',
        day: '대상자를 방문하고, 상담하고, 서비스를 연결한다. 서류와 행정에 파묻히고, 위기 가정을 챙기고, 한정된 예산을 배분한다. 도울 수 없는 한계 앞에서 매일 부딪힌다.',
        terms: ['사례 관리', '가정 방문', '연계(서비스 연결)', '바우처', '대상자', '위기 개입', '상담 일지'],
        tools: ['상담 기록·시스템', '차량', '가방(서류·물품)', '연락망'],
        hazards: ['감정노동·대리외상', '폭력 노출(방문)', '행정 과부하', '무력감'],
        conflicts: ['예산 vs 필요', '도울 수 없는 한계', '행정과 현장의 괴리', '신고와 개입의 딜레마', '번아웃'],
        hierarchy: '사회복지사 → 팀장 → 관장. 현장 경험과 자격이 신뢰.',
        detail: '가방 가득한 서류, 약자 앞의 다정함과 직업적 거리, 못 도운 날의 무거운 발걸음.',
      },
    ],
  },
]

const LS = 'sry:tool:professions-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 텍스트(필드 라벨 포함)
const TEXT_FIELDS: { k: keyof Entry; label: string; list?: boolean }[] = [
  { k: 'aka', label: '세부 직군' },
  { k: 'day', label: '하루 일과' },
  { k: 'terms', label: '전문 용어·은어', list: true },
  { k: 'tools', label: '도구·장비', list: true },
  { k: 'hazards', label: '직업병·위험', list: true },
  { k: 'conflicts', label: '갈등거리', list: true },
  { k: 'hierarchy', label: '계층·서열' },
  { k: 'detail', label: '묘사 디테일' },
]

function fieldToString(item: Entry, k: keyof Entry): string {
  const v = item[k]
  if (Array.isArray(v)) return v.join(', ')
  return v ? String(v) : ''
}

function plainText(f: Flat): string {
  const lines = [`🧰 ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 직업 묘사를 위한 창작 참고 자료. 디테일은 작품 설정·시대에 맞춰 각색하세요.</i></p>`,
  ].join('')
}

export default function ProfessionsRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.job / payload.role 이 오면 검색 힌트로 활용(인물 시트에서 직업을 가지고 열릴 수 있음)
  const jobHint = typeof payload?.job === 'string' ? (payload.job as string)
    : typeof payload?.role === 'string' ? (payload.role as string) : ''

  const [query, setQuery] = useState(jobHint)
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
    addToStash({ kind: 'note', label: `직업: ${f.item.name}`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 직업 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[직업 자료] ${plainText(f)}`,
      source: '직업 사전',
      tags: ['직업', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '직업 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분야: f.cat.label, 세부직군: f.item.aka || '', 계층: f.item.hierarchy ? '있음' : '' },
    })
    if (id) flash(`프로젝트 자료 〈직업 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { display: 'inline-block', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, margin: '2px 4px 2px 0', cursor: 'pointer', color: 'var(--text)' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
      {TEXT_FIELDS.map((fd) => {
        const v = item[fd.k]
        if (!v || (Array.isArray(v) && v.length === 0)) return null
        return (
          <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
            {fd.list && Array.isArray(v) ? (
              <span>
                {v.map((w, i) => (
                  <span
                    key={i}
                    style={chip}
                    title="클릭해 이 표현만 복사"
                    onClick={() => copy(String(w), `chip:${item.name}:${fd.k}:${i}`)}
                  >
                    {copiedKey === `chip:${item.name}:${fd.k}:${i}` ? '✓ 복사됨' : String(w)}
                  </span>
                ))}
              </span>
            ) : (
              <span>{String(v)}</span>
            )}
          </div>
        )
      })}
    </div>
  )

  const actionRow = (f: Flat, scope: string) => (
    <>
      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => copy(plainText(f), scope)}>
          {copiedKey === scope ? '✓ 복사됨' : <><Emoji e="📋"/> 전체 복사</>}
        </button>
        <button className="minibtn" onClick={() => saveSnippet(f)}><Emoji e="💾"/> 스니펫 저장</button>
        <button className="minibtn" onClick={() => toggleFav(f.cat.key, f.item.name)}>
          {favs[favKey(f.cat.key, f.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
      </div>
      <div className="linkbar" style={{ marginTop: 8 }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => toStash(f)} disabled={!hasStash()}
          title={hasStash() ? '이 직업 자료를 플로팅 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
          <Emoji e="📎"/> 수집함
        </button>
        <button className="linkbtn" onClick={() => toProject(f)} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈직업 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn"
          onClick={() => openToolLinked('character-sheet', { job: f.item.name, role: f.item.name, profession: f.item.name })}
          title="이 직업으로 인물 시트 열기">
          <Emoji e="🧑‍🎤"/> 인물 시트
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
        <Emoji e="🧰"/> <b style={{ color: 'var(--text)' }}>직업 사전</b> — 인물을 ‘진짜 그 일을 하는 사람’처럼 그리기 위한 자료집.
        하루 일과·전문 용어/은어·도구·직업병·갈등거리·계층을 정리했습니다. 디테일은 작품의 시대·설정에 맞춰 각색하세요.
      </div>

      <div style={hint}>
        총 <b>{total}개</b> 직업을 분야별로 정리했습니다. 검색·펼침으로 찾고, 무작위로 영감을 얻고,
        용어 칩은 클릭해 한 단어씩 복사하거나, 수집함·스니펫·프로젝트로 보내세요.
        {jobHint ? <>  (전달된 직업 힌트: <b>{jobHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="직업·용어·갈등으로 검색 (예: 교대근무, 잠복, 번아웃, 야간)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 직업</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기"><Emoji e="🧑‍🎤"/> 인물 시트 열기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 직업이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.day && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.day}
                  </div>
                )}
                {open && renderFields(item)}
                {open && actionRow({ cat: c, item }, 'item:' + fk)}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>직업 묘사의 힘은 디테일에서 옵니다. 용어 한마디, 손버릇 하나가 인물을 ‘진짜’로 만듭니다.</div>
    </div>
  )
}
