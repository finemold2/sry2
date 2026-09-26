// 질병·역병 사전 — 역사·판타지·메디컬 창작 고증 참고용 로컬 자료집.
//  ⚠ 의학 자문이 아니라, 질병·역병의 '서사적 개연성'(증상·전염·경과·사회적 파장·시대별 대응)을 위한 창작 자료다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API/미디어/네트워크 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 뽑기 + 클릭 복사 + 스니펫 저장 + 수집함 + 프로젝트 연계.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'disease-plague-ref',
  name: '질병·역병 사전',
  icon: '🦠',
  group: '리서치·자료',
  intro: '역병·전염병·열병·기생충·환경병·정신질환·가상 역병의 증상·전염·경과·사회 파장·시대별 치료를 역사/판타지/메디컬 고증용으로 정리',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '창작 묘사용 단서'이지 실제 진단·치료 지침이 아니다.
interface Entry {
  name: string          // 명칭
  aka?: string          // 이칭·시대 명칭·범주
  era?: string          // 주로 등장한 시대·배경
  cause?: string        // 병인(서사적 설명)
  spread?: string       // 전염 경로·확산 양상
  signs?: string        // 증상·겉으로 드러나는 묘사
  course?: string       // 경과·잠복·치사 양상
  social?: string       // 사회적 파장·공포·낙인
  treatHist?: string    // 시대별 치료(과거~당대의 대응·민간요법)
  treatNow?: string     // 현대적 이해·대처(고증 참고)
  story?: string        // 이야기 활용 포인트
  myth?: string         // 흔한 오류·클리셰 주의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 (전부 직접 작성한 요약·표현 — 백과 베끼기 없음) ----------
const CATS: CatDef[] = [
  {
    key: 'plague', label: '대역병·범유행', icon: '⚰️',
    note: '한 도시·대륙을 휩쓰는 거대 전염병. 사회 질서·신앙·권력 구조까지 뒤흔든다.',
    items: [
      {
        name: '검은 죽음(흑사병)', aka: '대역병·페스트', era: '중세 후기·르네상스',
        cause: '쥐·벼룩에 깃든 보이지 않는 병독(당대인은 ‘오염된 공기’나 천벌로 여김).',
        spread: '항구·교역로를 따라 배·마차로 번진다. 쥐가 죽어 나가면 곧 사람 차례라는 흉조.',
        signs: '겨드랑이·사타구니에 달걀만 한 멍울(가래톳)이 솟고, 피부에 검은 반점. 고열·헛소리·검게 변하는 손발끝.',
        course: '며칠 만에 멀쩡하던 이가 시신이 된다. 폐로 번지면 기침으로 옮으며 더 빠르게 죽는다.',
        social: '마을이 텅 비고, 시신을 묻을 사람조차 모자라 구덩이에 던진다. 유대인·이방인·마녀에게 책임을 돌리는 광기, 채찍질 고행단, 종말 신앙이 들끓는다.',
        treatHist: '향료 가면(부리 의사)·식초 적신 천·방혈·가래톳 절개·기도·격리(40일 검역, ‘콰란타’의 어원). 효과는 미미했다.',
        treatNow: '세균성 질환으로 항생제로 치료 가능, 위생·방역으로 확산을 끊는다는 이해.',
        story: '인구의 1/3이 사라진 세계 — 노동력 붕괴로 신분 질서가 흔들리고, 살아남은 자의 죄책감과 한탕주의가 공존한다.',
        myth: '“부리 가면이 병을 막았다”는 오해 — 그건 악취를 거르려는 미신적 장비였다.',
      },
      {
        name: '땀병(발한병)', aka: '잉글랜드 땀열', era: '르네상스 초기',
        cause: '원인 모를 급성 열병(서사적으로 ‘악취·습기·죄’ 탓으로 여겨짐).',
        spread: '도시에서 갑자기 솟구쳐 신분을 가리지 않고 덮친다 — 부유한 자도 예외 없다는 공포.',
        signs: '갑작스런 오한·극심한 식은땀·심장 두근거림·탈진. 멀쩡히 아침을 먹던 이가 저녁에 죽기도.',
        course: '“정오에 멀쩡, 자정에 시신” — 하루 안에 결판나는 무서운 속도.',
        social: '발병하면 모두가 문을 걸어 잠그고, 도시가 하루아침에 유령 거리가 된다. 원인을 모르니 더 큰 공포.',
        treatHist: '땀을 ‘내보내야 낫는다’며 이불을 겹겹이 덮어 더 위험해지기도. 향초·기도·도피.',
        treatNow: '정확한 병원체는 끝내 미상 — 바이러스성 열병으로 추정만 하는 ‘미해결 역병’.',
        story: '정체불명·초고속 치사라는 점에서 미스터리·스릴러의 역병 모델로 탁월하다.',
        myth: '“땀을 많이 내면 낫는다”는 당대 처치는 오히려 탈수를 부른 역효과.',
      },
      {
        name: '붉은 기침병', aka: '폐역병(가상·역사 혼합)', era: '근세 도시',
        cause: '겨울 도시의 매연·밀집·영양 부족이 겹쳐 폐를 좀먹는 ‘기침 역병’.',
        spread: '좁은 셋방·작업장에서 기침으로 옮는다. 가난한 구역부터 번진다.',
        signs: '마른기침이 점점 피 섞인 기침으로, 밤마다 식은땀, 야위어 가는 몸과 발갛게 상기된 뺨.',
        course: '몇 달에 걸쳐 서서히 사위어 간다 — 빠른 죽음보다 ‘천천히 꺼지는’ 비극.',
        social: '예술가·시인의 ‘낭만적 병’으로 미화되기도(창백한 미모의 클리셰), 실제로는 빈민가의 학살자.',
        treatHist: '맑은 공기·산속 요양원·우유와 휴식. 격리 요양 외엔 속수무책.',
        treatNow: '결핵 계열 만성 감염으로 이해 — 약물 장기 복용으로 완치 가능.',
        story: '서서히 죽어가는 인물의 ‘마지막 작품’, 요양원에서 피어나는 관계 등 멜로·시대극에 적합.',
        myth: '“각혈 한 번 하고 곧 죽는다”는 과장 — 실제론 몇 달, 때론 몇 년의 긴 쇠락.',
      },
      {
        name: '소금기근열', aka: '난민 역병(가상)', era: '전쟁·기근기',
        cause: '오염된 물·굶주림·시신 더미가 겹친 피난길에서 창궐.',
        spread: '식수와 배설물이 섞이는 난민 행렬·포위된 성에서 폭발적으로 번진다.',
        signs: '쌀뜨물 같은 설사로 급격히 마르고, 눈이 움푹 들어가며 손끝이 쪼그라든다. 갈증과 경련.',
        course: '탈수로 하루이틀 만에 무너지기도 — 물만 잃지 않으면 살 길이 있는 역설.',
        social: '성·진영 안에서 ‘오염원’을 색출하려는 의심, 우물을 둘러싼 다툼, 버려지는 약자.',
        treatHist: '맑은 우물 사수·환자 격리·시신 신속 매장. 깨끗한 물과 소금물이 생명줄.',
        treatNow: '수인성 전염병 — 경구 수액(소금·당)으로 탈수를 막는 단순한 처치가 핵심.',
        story: '포위전·피난 서사의 ‘보이지 않는 적’ — 적군보다 우물과 위생이 생사를 가른다.',
        myth: '“독한 술로 소독하면 낫는다”는 오해 — 마실 물의 청결이 본질이다.',
      },
      {
        name: '잿빛 무름병', aka: '가상 범유행 역병', era: '아무 시대·디스토피아',
        cause: '서사 세계의 미지 병원체 — 작가가 규칙을 정해 쓰는 ‘설계용’ 역병.',
        spread: '접촉·비말·매개체 중 무엇으로 옮길지 ‘규칙’을 정하라 — 규칙이 곧 긴장의 설계도.',
        signs: '피부가 잿빛으로 굳고 감각이 무뎌지며, 말기엔 손끝부터 부스러진다(상징적 묘사).',
        course: '잠복기·전염력·치사율의 ‘3요소’를 정하면 사회 붕괴 속도가 결정된다.',
        social: '격리선·낙인·매점매석·면역자 차별 — 인간성이 시험대에 오른다.',
        treatHist: '세계관에 맞춰 설계 — 사제의 정화술, 연금술 해독제, 혹은 ‘치료법 없음’.',
        treatNow: '(가상) — 백신·치료제 개발 경쟁 자체를 플롯의 시계로 삼을 수 있다.',
        story: '역병의 3요소(잠복·전염·치사)를 먼저 정하면 사회 묘사가 저절로 따라온다.',
        myth: '“치료제가 우연히 뚝딱” 나오는 전개는 김이 샌다 — 대가·부작용·희생을 붙여라.',
      },
    ],
  },
  {
    key: 'fever', label: '열병·발진성 전염병', icon: '🤒',
    note: '고열과 발진으로 도시를 휩쓰는 급성 전염병들. 어린이·약자에게 특히 가혹하다.',
    items: [
      {
        name: '꽃마마(두창)', aka: '천연두·마마', era: '고대~근세',
        cause: '눈에 안 보이는 병독(당대엔 ‘마마신’으로 의인화해 모셨다).',
        spread: '기침·접촉·딱지로 옮는다. 한번 돌면 마을의 아이들을 차례로 데려간다.',
        signs: '고열 뒤 온몸에 농포(곪은 물집)가 돋아 얼굴까지 뒤덮는다. 가려움과 악취, 헛소리.',
        course: '살아남아도 곰보 자국(얽은 자국)이 평생 남는다 — ‘얼굴에 새겨진 생존 증명’.',
        social: '마마신을 노엽게 할까 봐 환자에게 좋은 말만 하고, 손님으로 ‘배웅’하는 의례. 얼굴 흉터로 인한 차별.',
        treatHist: '격리·금줄·붉은 천·우두 접종(인류 최초의 백신적 시도, 팔에 ‘심는’ 인두법).',
        treatNow: '백신으로 지구상에서 박멸된 첫 질병 — 역사물에서만 살아 있는 ‘옛 공포’.',
        story: '곰보 자국은 인물의 과거(역병에서 살아남음)를 얼굴에 새기는 강력한 외형 설정.',
        myth: '“흉터 없이 깨끗이 낫는다”는 드물다 — 살아남음의 대가는 보통 얼굴에 남는다.',
      },
      {
        name: '붉은 발진열', aka: '홍역·마진(가상 혼합)', era: '전근대',
        cause: '극히 잘 옮는 발진성 병독.',
        spread: '한 명이 기침하면 같은 방 사람이 거의 다 옮을 만큼 전염력이 강하다.',
        signs: '고열·눈물·콧물 뒤 입안 작은 흰 점, 이어 귀 뒤부터 온몸으로 번지는 붉은 발진.',
        course: '대개 발진이 가라앉으며 낫지만, 약한 아이는 폐·뇌로 번져 위험.',
        social: '아이가 줄줄이 앓아 서당·시장이 멈추고, ‘아이 잡는 병’으로 두려워한다.',
        treatHist: '어두운 방에 눕히고 안정·수분·따뜻하게. 발진을 ‘잘 내보내야’ 낫는다는 속설.',
        treatNow: '백신으로 예방 가능, 비타민·수분 보충이 회복을 돕는다는 이해.',
        story: '한 마을 아이들이 동시에 앓는 장면은 공동체의 무력감과 연대를 그리기에 좋다.',
        myth: '“발진이 나면 다 나은 것”은 오해 — 발진 뒤 합병증이 진짜 고비다.',
      },
      {
        name: '늪열(학질)', aka: '말라리아·간일열·삼일열', era: '고대~식민지 시대',
        cause: '늪·고인 물의 ‘나쁜 공기(말라리아=나쁜 공기)’ 탓으로 여겨졌다 — 실은 모기 매개.',
        spread: '습지·강가에서 밤마다 모기에 물려 옮는다. 늪을 메우거나 떠나야 벗어난다.',
        signs: '오한으로 이가 딱딱 부딪칠 만큼 떨다가, 펄펄 끓는 고열, 이어 흠뻑 젖는 땀 — 이 발작이 며칠 간격으로 반복.',
        course: '주기적 발작(하루걸러·이틀걸러)으로 사람을 야금야금 갉아 먹는다. 비장이 붓고 누렇게 뜬다.',
        social: '개척지·식민지·습지 도시의 ‘풍토병’ — 그곳에 오래 산 자만이 견디는 통과의례.',
        treatHist: '기나나무 껍질(키니네)의 쓴 가루가 특효로 통했다 — 열대 탐험·전쟁의 필수품.',
        treatNow: '기생충성 질환으로 항말라리아제·모기장·방충으로 대응한다는 이해.',
        story: '주기적 발작은 ‘예측 가능한 약점’ — 결정적 순간에 발작이 도지는 긴장 장치로 쓰기 좋다.',
        myth: '“늪의 나쁜 공기를 마셔 걸린다”는 당대 통설 — 실제 매개는 모기다.',
      },
      {
        name: '장미열', aka: '발진티푸스(가상 혼합)', era: '전쟁·감옥·빈민가',
        cause: '이(蝨)와 불결한 밀집 환경에서 번지는 ‘감옥열·기근열’.',
        spread: '몸에 들끓는 이를 통해 감옥·참호·난민촌에서 폭발적으로 번진다.',
        signs: '극심한 두통·고열·헛소리, 몸통에 번지는 장밋빛 발진. ‘열에 들떠 횡설수설’.',
        course: '고열과 의식 혼탁이 며칠 이어지며, 쇠약한 이는 그 와중에 숨진다.',
        social: '감옥·군대·기근 현장의 단골 — ‘이를 잡는 것’이 곧 방역이 되는 세계.',
        treatHist: '머리·옷을 삶고 이를 박멸, 격리·청결이 거의 유일한 대응.',
        treatNow: '세균성 — 위생과 항생제로 다스린다는 이해(서사용 참고).',
        story: '감옥·참호물의 ‘보이지 않는 간수’ — 형기를 마치기 전 열병으로 쓰러지는 운명.',
        myth: '“더러워서 그냥 앓는 병”이 아니라, 구체적 매개(이)와 환경이 있는 전염병이다.',
      },
      {
        name: '황금열', aka: '황열(가상 혼합)', era: '대항해·열대 항구',
        cause: '열대 항구의 모기 매개 열병 — 배를 타고 신대륙·항구로 퍼졌다.',
        spread: '항구 도시에서 모기에 물려 옮으며, 입항한 배가 ‘죽음을 실어 온다’.',
        signs: '고열·근육통·황달(눈·피부가 노래짐), 심하면 검은 피를 토한다(흑색 구토).',
        course: '회복기에 들었다 다시 악화하는 ‘속임수 단계’가 있어 더 잔인하다.',
        social: '검역 깃발(황색기)을 단 배는 입항 금지 — 항구 도시의 격리·봉쇄 드라마.',
        treatHist: '검역·격리·모기 서식지(고인 물) 제거가 결정적 전환점이 되었다.',
        treatNow: '바이러스성, 백신으로 예방 — 모기 방제가 핵심이라는 이해.',
        story: '황색 검역기·입항 거부·갇힌 항구는 대항해·해양물의 강렬한 긴장 무대.',
        myth: '“회복하면 끝”이 아니다 — 잠깐 나아졌다 급격히 악화하는 단계가 비극의 핵심.',
      },
    ],
  },
  {
    key: 'gut', label: '수인성·소화기 전염병', icon: '🚰',
    note: '오염된 물·음식으로 번지는 병들. 도시의 우물·하수·위생이 곧 생사를 가른다.',
    items: [
      {
        name: '쌀뜨물 설사병', aka: '콜레라·괴질', era: '근대 도시',
        cause: '오염된 우물·하수가 섞인 식수(당대엔 ‘독한 공기’로 오해).',
        spread: '한 우물이 오염되면 그 물을 먹는 거리 전체가 무너진다 — ‘우물 지도’가 곧 감염 지도.',
        signs: '쌀뜨물 같은 물설사와 구토로 순식간에 탈수, 눈이 꺼지고 손끝이 푸르게 쪼그라든다.',
        course: '아침에 멀쩡하던 이가 저녁에 위독해질 만큼 빠르다 — 물을 잃는 속도가 곧 죽음의 속도.',
        social: '도시 빈민가를 휩쓸며 ‘청결한 물’이 권력·계급의 문제임을 드러낸다. 우물 봉쇄·집단 매장.',
        treatHist: '오염된 우물 손잡이를 떼어 막은 것이 역학(疫學)의 시초 일화 — 깨끗한 물이 곧 처방.',
        treatNow: '경구 수액(소금+설탕물)으로 탈수만 막아도 대부분 살아난다는 단순·강력한 처치.',
        story: '‘어느 우물이 오염됐나’를 추적하는 과정은 그 자체로 추리·역학 미스터리가 된다.',
        myth: '“나쁜 공기 탓”이라며 향을 피우던 대응은 헛수고 — 핵심은 마시는 물의 청결.',
      },
      {
        name: '느린 열병(장열)', aka: '장티푸스', era: '전근대~근대',
        cause: '오염된 물·음식 속 병균, 때로 무증상 보균자(‘건강해 보이는 전파자’).',
        spread: '보균자가 만진 음식·물을 통해 조용히 번진다 — 멀쩡한 요리사가 역병의 진원일 수 있다.',
        signs: '계단식으로 오르는 고열, 배의 장밋빛 반점, 멍한 의식(‘티푸스성 무표정’), 변비와 설사 교대.',
        course: '몇 주에 걸쳐 서서히 끓다가, 장 출혈·천공이라는 늦은 고비가 온다.',
        social: '무증상 보균자라는 개념은 ‘죄 없는 전파자’의 비극·낙인을 낳는다.',
        treatHist: '격리·청결·영양·해열, 보균자 색출. 깨끗한 식수·손 씻기가 예방의 핵심.',
        treatNow: '세균성 — 항생제로 치료, 위생·백신으로 예방한다는 이해.',
        story: '“병을 옮기는 줄도 모르는 건강한 요리사” 설정은 죄와 낙인의 강렬한 드라마.',
        myth: '“환자만 격리하면 끝”이 아니다 — 멀쩡해 보이는 보균자가 더 무섭다.',
      },
      {
        name: '붉은배앓이', aka: '이질·적리', era: '군대·기근·전근대',
        cause: '오염된 물·음식으로 장이 헐어 피고름 섞인 설사를 한다.',
        spread: '진영·수용소·기근 현장에서 손과 물을 통해 빠르게 번진다.',
        signs: '피와 점액이 섞인 잦은 설사, 쥐어짜는 복통과 뒤가 묵직한 느낌(잔변감), 발열.',
        course: '탈수와 쇠약이 겹쳐 약자부터 쓰러진다 — 행군·농성 중 ‘조용한 학살자’.',
        social: '군대의 전투력을 ‘적군보다 더’ 깎아먹는 병 — 위생병·취사장이 전세를 좌우한다.',
        treatHist: '맑은 물·격리·청결, 손 씻기와 끓인 물. 환자 배설물 처리가 관건.',
        treatNow: '세균·아메바성 — 수분 보충과 약물로 대응한다는 이해.',
        story: '“적의 칼보다 설사가 무서운 행군” — 보급·위생이 승패를 가르는 전쟁 리얼리즘.',
        myth: '“독한 음식 탓에 잠깐 배탈”로 가볍게 그리면 전쟁 역병의 무게가 사라진다.',
      },
      {
        name: '회충병', aka: '기생충 감염', era: '농경 사회 전반',
        cause: '거름·오염된 흙·날것을 통해 몸에 들어오는 기생충.',
        spread: '맨발 농사·인분 거름·덜 익힌 음식으로 흔하게 옮는다 — 풍토적 ‘일상의 병’.',
        signs: '배가 더부룩하고 자주 아프며, 잘 먹어도 마르고 창백해진다(영양을 빼앗김). 아이는 발육이 더디다.',
        course: '서서히 기력을 갉아 ‘이유 없이 시들어가는’ 만성 쇠약. 심하면 장을 막기도.',
        social: '가난·불결의 표지로 낙인. ‘잘 먹는데 왜 마르나’라는 미스터리의 단서가 되기도.',
        treatHist: '구충 민간요법(쓴 약초·기름), 손 씻기·익혀 먹기·거름 관리.',
        treatNow: '구충제로 간단히 치료, 위생·식품 관리로 예방한다는 이해.',
        story: '“먹어도 마르는 아이”는 가난·환경을 드러내는 조용한 디테일로 쓰기 좋다.',
        myth: '“기생충은 옛날 병”이라는 인식과 달리 환경에 따라 흔한 만성병이다.',
      },
    ],
  },
  {
    key: 'chronic', label: '만성·환경·결핍성 질환', icon: '🍂',
    note: '천천히 몸을 갉는 병들. 환경·영양·노동이 빚어낸, 시대상이 묻어나는 질환들.',
    items: [
      {
        name: '바다병(괴혈병)', aka: '뱃사람의 저주', era: '대항해 시대',
        cause: '신선한 채소·과일을 오래 못 먹어 생기는 결핍병(당대엔 원인 미상의 ‘배의 저주’).',
        spread: '전염이 아니다 — 긴 항해·포위·겨울 농성처럼 신선식이 끊긴 곳이면 어디서든.',
        signs: '잇몸이 붓고 피가 나며 이가 흔들려 빠진다, 오래된 상처가 다시 벌어지고, 온몸에 멍과 무력감.',
        course: '몇 주~몇 달의 결핍이 쌓여 서서히 무너진다 — 신선식 한 입이면 거짓말처럼 호전.',
        social: '장거리 항해의 최대 적 — 선원의 절반을 잃기도 했다. ‘귤·양배추를 실으면 산다’는 경험적 지혜.',
        treatHist: '감귤·양배추 절임·솔잎차로 낫는다는 경험적 발견 — 항해 식량의 혁명.',
        treatNow: '비타민 C 결핍증으로 이해 — 보충하면 빠르게 회복한다는 지식.',
        story: '“귤 한 상자가 함대를 살린다” — 보급·항해 서사의 결정적 반전 소재.',
        myth: '“전염병”으로 오해하기 쉽지만 옮지 않는다 — 핵심은 ‘무엇을 먹었나’.',
      },
      {
        name: '광부폐', aka: '진폐·검은폐', era: '산업화 시대',
        cause: '탄광·채석장의 미세 먼지를 오래 들이마셔 폐가 굳어가는 직업병.',
        spread: '전염이 아니다 — 같은 갱도에서 일한 이들이 ‘함께 늙어 죽는’ 노동의 병.',
        signs: '점점 숨이 가빠지고 검은 가래를 뱉으며, 비탈만 올라도 헐떡인다. 손톱이 둥글게 변한다.',
        course: '수년~수십 년에 걸쳐 폐가 돌처럼 굳어 결국 숨을 못 쉬게 된다.',
        social: '광산 마을 전체가 같은 병으로 사위어 가는 풍경 — 산업화의 그림자와 노동 착취의 상징.',
        treatHist: '갱도 환기·마스크·작업 시간 제한 외엔 막을 길이 없던 시절.',
        treatNow: '예방이 전부 — 분진 차단·환기가 핵심이며 굳은 폐는 되돌릴 수 없다는 이해.',
        story: '광부 아버지와 아들이 같은 기침을 시작하는 장면은 세대를 잇는 비극을 압축한다.',
        myth: '“잠깐 쉬면 낫는다”가 아니다 — 굳은 폐는 회복되지 않는 비가역적 손상.',
      },
      {
        name: '연독(납 중독)', aka: '화가병·연관병', era: '고대~근세',
        cause: '납 그릇·납 화장품·납 단 포도주를 오래 쓰며 몸에 쌓인 중독.',
        spread: '전염이 아니다 — 부유층의 식기·화장·물 배관처럼 ‘생활 속’에 숨어 있다.',
        signs: '잇몸의 푸른 줄, 극심한 복통(연산통), 손목이 처지는 마비, 점점 흐려지는 정신과 발작.',
        course: '서서히 쌓여 ‘원인 모를 광증·복통·마비’로 나타난다 — 진단 없는 시대엔 저주로 여겨졌다.',
        social: '귀족·예술가의 ‘우아한 독’ — 화장과 사치가 곧 병이 되는 아이러니.',
        treatHist: '원인을 몰라 사혈·기도로 헛수고. 납을 멀리하는 것만이 유일한 회복.',
        treatNow: '중금속 중독으로 이해 — 노출 차단·해독 치료(킬레이션)로 대응한다는 지식.',
        story: '“원인 모를 광증”의 정체가 식기·화장품이었다는 반전은 미스터리에 적합.',
        myth: '“정신병·저주”로만 그리면 진짜 원인(생활 속 중독)의 서늘함을 놓친다.',
      },
      {
        name: '햇빛결핍 구루병', aka: '곱사병(뼈 연화)', era: '산업도시·매연기',
        cause: '햇빛·영양 부족으로 뼈가 무르게 자라는 어린이 결핍병.',
        spread: '전염이 아니다 — 햇빛 안 드는 좁은 골목·매연 자욱한 공업도시의 아이들에게.',
        signs: '다리가 휘고(O자·X자), 가슴뼈가 튀어나오며, 키가 더디고 뼈가 잘 부러진다.',
        course: '자라는 내내 뼈가 휘어 굳어, 평생 가는 변형으로 남는다.',
        social: '햇빛 없는 도시 빈민가의 ‘구부정한 아이들’ — 산업화·도시 빈곤의 상징.',
        treatHist: '햇볕 쬐기·간유(생선 기름)·신선한 음식이 효험으로 알려졌다.',
        treatNow: '비타민 D·칼슘 결핍으로 이해 — 햇빛·영양 보충으로 예방·교정한다는 지식.',
        story: '“해를 못 보고 자란 아이”의 휜 다리는 환경을 몸에 새긴 강력한 외형 묘사.',
        myth: '“가난해서 약하게 태어났다”가 아니라, 햇빛·영양이라는 구체적 결핍의 결과.',
      },
    ],
  },
  {
    key: 'mind', label: '정신·신경 질환(시대상)', icon: '🌀',
    note: '시대마다 다르게 ‘읽힌’ 마음과 신경의 병. 오해·낙인·치료의 역사가 짙게 묻어난다.',
    items: [
      {
        name: '우울증(멜랑콜리)', aka: '검은 담즙·울증', era: '고대~현대',
        cause: '고대엔 ‘검은 담즙’이 넘쳐서라 여겼다 — 기질·체액의 불균형으로 설명.',
        spread: '전염은 아니나, 시대마다 ‘게으름·죄·예술가의 숙명’으로 다르게 해석됐다.',
        signs: '깊은 무기력·끝없는 슬픔, 잠과 입맛의 변화, 스스로를 탓하는 생각, 즐거움이 사라진 무채색의 나날.',
        course: '파도처럼 오갈 수도, 오래 가라앉을 수도 — 회복엔 시간과 곁의 손길이 필요하다.',
        social: '‘의지박약’이라는 오랜 오해와 낙인 vs ‘섬세한 영혼의 그늘’이라는 미화 — 둘 다 진실을 가린다.',
        treatHist: '체액 균형(사혈·식이), 음악·산책·전지요법, 때로 격리. 이해보다 처방이 앞섰다.',
        treatNow: '뇌·환경·심리가 얽힌 질환으로 이해 — 상담·약물·지지로 다스린다는 관점.',
        story: '인물의 ‘무기력’을 게으름이 아닌 병으로 그리면 깊이가 생긴다 — 곁의 인물의 반응이 관계를 드러낸다.',
        myth: '“마음만 다잡으면 낫는다”는 위험한 통념 — 의지의 문제로 환원하지 말 것.',
      },
      {
        name: '전쟁 신경증', aka: '셸 쇼크·외상후 스트레스', era: '근현대 전쟁',
        cause: '극한의 공포·죽음의 목격이 마음에 남긴 깊은 상흔.',
        spread: '전염은 아니나, 같은 전장을 겪은 부대원들이 함께 시달린다.',
        signs: '갑작스런 굉음에 몸이 굳고, 악몽·환청, 멍한 침묵 또는 폭발하는 분노, 손 떨림.',
        course: '집에 돌아와도 ‘전장이 따라온다’ — 평범한 일상의 소음이 방아쇠가 된다.',
        social: '한때 ‘비겁·꾀병’으로 매도되어 처벌받기도 — 시대가 마음의 상처를 인정하기까지의 잔혹사.',
        treatHist: '‘정신력 부족’으로 몰아 전기·격리 등 가혹한 처치, 혹은 무시.',
        treatNow: '트라우마 반응으로 이해 — 상담·안정화·지지 공동체로 회복을 돕는다는 관점.',
        story: '“돌아왔지만 돌아오지 못한” 참전 인물 — 천둥소리에 무너지는 한 장면이 전쟁의 무게를 압축한다.',
        myth: '“시간이 지나면 저절로 잊힌다”는 오해 — 방치된 상처는 더 깊어진다.',
      },
      {
        name: '히스테리아(역사적 오진)', aka: '떠도는 자궁설', era: '고대~19세기',
        cause: '여성의 다양한 증상을 ‘자궁이 떠돈다’는 엉터리 이론으로 뭉뚱그린 역사적 오진 범주.',
        spread: '전염이 아니라, 한 시대의 ‘여성 병리화’라는 편견이 만든 진단명.',
        signs: '실신·발작·마비·실어 등 제각각의 증상을 한 이름으로 묶어, 실제 병을 가렸다.',
        course: '오진의 역사 — 진짜 신경·신체·심리 질환들이 ‘히스테리’ 한 단어에 파묻혔다.',
        social: '여성을 통제·감금·치료라는 명목으로 억압한 도구 — 젠더·권력의 어두운 의학사.',
        treatHist: '격리·강제 휴식·물치료 등, 환자를 ‘다스리는’ 데 초점을 둔 비인간적 처치.',
        treatNow: '폐기된 개념 — 각 증상은 개별 신경·심리 질환으로 재분류된다는 이해.',
        story: '“병명이 곧 억압의 도구였던” 시대 — 부당한 진단에 맞서는 인물의 저항 서사에 적합.',
        myth: '“실제로 있던 병”이 아니다 — 편견이 만든 진단명임을 분명히 다뤄야 한다.',
      },
      {
        name: '광장 광기(집단 히스테리)', aka: '춤추는 역병·집단 발작', era: '중세~근세',
        cause: '극심한 스트레스·공포·신앙이 한 무리에 ‘옮듯’ 번지는 심리적 전염.',
        spread: '한 사람의 발작·환각이 군중에 퍼져 마을 전체가 같은 증상을 보이기도.',
        signs: '멈추지 못하는 춤·웃음·울음·실신이 무리 안에 연쇄적으로 번진다.',
        course: '며칠~몇 주 들끓다 가라앉는다 — 군중의 불안이 사그라들면 함께 잦아든다.',
        social: '천벌·악마·마법으로 해석되어 마녀사냥·집단 처벌로 번지기 쉽다.',
        treatHist: '굿·구마·격리·음악 진정 등 — 원인을 못 짚어 의례로 다뤘다.',
        treatNow: '집단 심인성 반응으로 이해 — 불안의 진원을 가라앉히는 것이 핵심이라는 관점.',
        story: '“이유 없이 온 마을이 춤추다 쓰러진다”는 초자연·미스터리·역사극에 강렬한 소재.',
        myth: '“다 같이 꾀병”이 아니다 — 본인들에겐 통제 불가능한 진짜 증상이다.',
      },
    ],
  },
  {
    key: 'fantasy', label: '판타지·SF 가상 역병', icon: '🐉',
    note: '세계관 설정용 가상 질병. 마법·저주·외계·생체병기 등 ‘규칙이 있는 환상의 병’.',
    items: [
      {
        name: '마나열(주력 고갈병)', aka: '마법사의 소진', era: '하이 판타지',
        cause: '마력을 과하게 쏟아 몸의 ‘마나 통로’가 타들어가며 생기는 병.',
        spread: '전염은 아니나, 마법 의존이 심한 사회·전쟁터에서 흔하다.',
        signs: '손끝의 마법 문양이 검게 그을리고, 고열·환각·마력 역류로 발작. 눈동자가 빛을 잃는다.',
        course: '쉬면 회복되나, 한계를 넘으면 마나 통로가 영구히 막혀 다시는 마법을 못 쓴다.',
        social: '마법사 길드의 ‘은퇴 병’ — 재능을 다 태운 자의 쓸쓸한 말년이라는 정서.',
        treatHist: '세계관 설정 — 마나 안정제, 영맥(靈脈) 요양지, 봉인 의식 등 ‘규칙 있는 치료’를 정하라.',
        treatNow: '(가상) — 비용·제약을 정해두면 마법 남용에 무게가 실린다.',
        story: '“이 주문을 또 쓰면 다시는 마법을 못 쓴다”는 설정은 마법사의 결단에 긴장을 준다.',
        myth: '“무한정 마법을 써도 멀쩡”하면 긴장이 사라진다 — 대가를 분명히 설계하라.',
      },
      {
        name: '석화병', aka: '굳어가는 저주', era: '판타지·신화',
        cause: '고대의 저주·괴물의 시선·금단의 보물에 닿아 몸이 서서히 돌이 되는 병.',
        spread: '저주의 ‘조건’(시선·접촉·이름)을 정하면 전파 규칙이 된다.',
        signs: '손끝·발끝부터 차고 단단해지며 감각이 사라진다, 피부에 돌결무늬가 번진다.',
        course: '진행 속도(며칠/몇 주)와 ‘멈추는 조건’을 정하라 — 시계가 곧 플롯의 긴장.',
        social: '석화된 이를 ‘조각상’으로 모시는 마을, 저주받은 자에 대한 추방·연민.',
        treatHist: '세계관 설정 — 저주의 근원 파괴, 성물의 눈물, 진명(眞名) 회복 등 ‘해법의 대가’를 정하라.',
        treatNow: '(가상) — 부분 석화로 흉터처럼 남기면 후유 설정이 깊어진다.',
        story: '“닷새 안에 저주의 근원을 찾지 못하면 완전히 돌이 된다”는 카운트다운 퀘스트의 고전.',
        myth: '“키스 한 번에 즉시 해제” 같은 손쉬운 해법은 김이 샌다 — 해법에도 희생을 붙여라.',
      },
      {
        name: '월광 광증', aka: '늑대병·달의 열병', era: '다크 판타지·호러',
        cause: '저주받은 피·짐승에게 물린 상처를 통해 달이 차면 짐승으로 변하는 병.',
        spread: '물린 상처를 통해 옮는다 — 살아남은 피해자가 다음 보균자가 되는 비극의 연쇄.',
        signs: '보름이 가까우면 열·식은땀·근육통, 후각·청각이 예민해지고 밤마다 사나운 충동.',
        course: '달의 주기에 매여 ‘평소엔 사람, 보름엔 짐승’ — 본인이 통제 못 하는 변신의 공포.',
        social: '마을의 의심·밤의 사냥꾼·은(銀)에 대한 미신 — 정체가 들통날까 두려운 이중생활.',
        treatHist: '세계관 설정 — 은 족쇄·달 없는 골방·성수·약초 진정제 등 ‘억제와 대가’를 정하라.',
        treatNow: '(가상) — 완치 대신 ‘억제·공존’으로 두면 캐릭터의 평생 짐이 된다.',
        story: '“보름이 사흘 남았다”는 달력 자체가 시한폭탄이 되는 강력한 긴장 장치.',
        myth: '“변신 중에도 이성이 멀쩡”하면 공포가 약해진다 — 통제 상실의 두려움이 핵심.',
      },
      {
        name: '잿빛 기억병', aka: '망각 역병(SF)', era: 'SF·디스토피아',
        cause: '신경에 작용하는 미지의 병원체·오염 물질이 기억을 갉아먹는다.',
        spread: '접촉·공기·데이터 등 세계관에 맞게 매개를 정하라 — ‘무엇을 통해 잊는가’.',
        signs: '최근 기억부터 안개처럼 사라지고, 사람·이름·길을 잃어간다. 같은 질문을 반복한다.',
        course: '서서히 자아가 지워져 ‘몸은 살아도 그 사람은 사라지는’ 비극. 진행이 멈추는 조건을 정하라.',
        social: '기억을 ‘기록·이식’하는 기술이 권력이 되고, 잊은 자를 분류·격리하는 사회.',
        treatHist: '(세계관 설정) — 기억 백업, 신경 정화, 인공 보철 기억 등 ‘대가 있는 해법’.',
        treatNow: '(가상) — 되살린 기억이 ‘진짜인지’ 의심하게 만들면 철학적 깊이가 생긴다.',
        story: '“자신이 누구인지 적어둔 쪽지에 의지해 사는” 인물은 정체성 SF의 강렬한 중심.',
        myth: '“약 하나로 기억이 완전 복원”되면 상실의 무게가 사라진다 — 흉터를 남겨라.',
      },
      {
        name: '균사 잠식병', aka: '포자 감염(SF 호러)', era: 'SF·아포칼립스',
        cause: '몸에 뿌리내려 숙주를 조종·변형시키는 기생 균사·포자.',
        spread: '포자 흡입·물림·균사 접촉으로 옮으며, 감염자가 ‘퍼뜨리는 매개’가 된다.',
        signs: '피부 밑으로 번지는 균사 무늬, 점점 무뎌지는 자아, 숙주의 행동이 ‘끌려가듯’ 변한다.',
        course: '잠복기엔 멀쩡하다 어느 순간 ‘넘어가는’ 임계점 — 그 전에 끊을 수 있을지가 긴장.',
        social: '감염 의심자 색출·격리선·‘아직 사람인가’를 둘러싼 윤리적 딜레마.',
        treatHist: '(세계관 설정) — 절단·소작·화염, 혹은 균과의 공생을 택하는 분기.',
        treatNow: '(가상) — 면역자·반쯤 감염된 자를 두면 회색지대의 드라마가 풍부해진다.',
        story: '“물린 동료가 언제 넘어갈지 모른다”는 의심은 아포칼립스 서스펜스의 핵심 연료.',
        myth: '“감염되면 즉시 괴물”보다, 서서히 변해가는 ‘유예의 공포’가 더 무섭다.',
      },
    ],
  },
]

const LS = 'sry:tool:disease-plague-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const flatOf = (catKey: string): Flat[] =>
  catKey === ALL ? flatAll() : CATS.filter((c) => c.key === catKey).flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 필드 라벨 묶음
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭·범주' },
  { k: 'era', label: '시대·배경' },
  { k: 'cause', label: '병인(서사)' },
  { k: 'spread', label: '전염·확산' },
  { k: 'signs', label: '증상·겉모습' },
  { k: 'course', label: '경과·치사' },
  { k: 'social', label: '사회적 파장' },
  { k: 'treatHist', label: '시대별 치료' },
  { k: 'treatNow', label: '현대적 이해' },
  { k: 'story', label: '이야기 활용' },
  { k: 'myth', label: '흔한 오류·유의' },
]

function plainText(f: Flat): string {
  const lines = [`🦠 ${f.item.name}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 역사·판타지·메디컬 창작 고증용 참고 자료입니다. 의학적 자문·실제 진단·치료 지침이 아닙니다.</i></p>`,
  ].join('')
}

export default function DiseasePlagueRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 안내 힌트로 활용(맥락 활용)
  const genreHint = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
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

  const total = CATS.reduce((n, c) => n + c.items.length, 0)
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const q = query.trim().toLowerCase()
  let filtered: Flat[] = flatOf(cat)
  if (onlyFav) filtered = filtered.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
  if (q) {
    filtered = filtered.filter(({ cat: c, item }) => {
      if (c.label.toLowerCase().includes(q)) return true
      if (item.name.toLowerCase().includes(q)) return true
      return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
    })
  }

  const rollRandom = () => {
    const pool = flatOf(cat)
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }

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

  // 스니펫 라이브러리 저장(글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[질병·역병 자료] ${plainText(f)}`,
      source: '질병·역병 사전',
      tags: ['질병', '역병', '고증', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 수집함에 담기
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’을(를) 담았습니다.`)
  }

  // 프로젝트 자료에 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '질병·역병 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대: f.item.era || '', 전염: f.item.spread ? '경로 있음' : '비전염' },
    })
    if (id) flash(`프로젝트 자료 〈질병·역병 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  // 위중도 대신 ‘전염성’ 표지: 전염 경로 유무로 색을 달리한다(서사 척도)
  const spreadBadge = (item: Entry): { text: string; color: string } | null => {
    if (!item.spread) return null
    const s = item.spread
    if (s.includes('전염은 아니') || s.includes('전염이 아니')) return { text: '비전염', color: 'var(--ok)' }
    return { text: '전염성', color: 'var(--accent)' }
  }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 창작 참고용 명시 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="⚠" /> <b style={{ color: 'var(--text)' }}>창작 고증 참고 자료</b>입니다. 역사·판타지·메디컬 묘사의 개연성을 돕는 서사용 단서이며,
        <b style={{ color: 'var(--text)' }}> 의학적 자문이나 실제 진단·치료 지침이 아닙니다.</b> 실제 건강 문제는 전문 의료에 따르세요.
      </div>

      <div style={hint}>
        대역병·열병·수인성·만성/환경병·정신질환·가상 역병 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        증상·전염·경과·사회적 파장·시대별 치료를 검색·펼침으로 찾고, 무작위로 영감을 얻고, 복사·수집함·스니펫·프로젝트로 보내세요.
        {genreHint ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·증상·전염·시대로 검색 (예: 고열, 우물, 격리, 모기, 저주, 중세)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 뽑기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('injury-recovery-ref')}
          title="부상·회복 리얼리즘 사전 열기(부상·응급처치·회복 고증)" style={{ marginLeft: 4 }}>
          <Emoji e="🩹" /> 부상·회복 사전
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 자료를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
              <Emoji e="📎" /> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈질병·역병 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('injury-recovery-ref')} title="부상·회복 리얼리즘 사전 열기"><Emoji e="🩹" /> 부상·회복 사전</button>
          </div>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 자료가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            const badge = spreadBadge(item)
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  {badge && (
                    <span style={{ fontSize: 10.5, color: badge.color, border: `1px solid ${badge.color}`, borderRadius: 6, padding: '1px 5px', flexShrink: 0 }}>
                      {badge.text}
                    </span>
                  )}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && item.signs && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.signs}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾" /> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
                      <Emoji e="📎" /> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄" /> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>역병은 ‘병’이 아니라 ‘사회’를 비춥니다 — 누가 먼저 죽고, 누구를 탓하며, 무엇으로 막으려 했는지가 시대를 드러냅니다.</div>
    </div>
  )
}
