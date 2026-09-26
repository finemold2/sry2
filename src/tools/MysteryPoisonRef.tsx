// 독극물·살해수법 사전 — 미스터리·추리 창작 참고용 로컬 자료집.
//  ⚠ 실행·제조 안내가 아니라, 추리소설의 트릭·검시·수사 묘사를 위한 '창작 자료'로 구성한다.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 스니펫 저장 + 프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-poison-ref',
  name: '독극물·살해수법 사전',
  icon: '☠️',
  group: '지식 사전',
  genre: '미스터리·추리',
  intro: '독극물·물리적 수법·위장 자살/사고를 증상·발현시간·검출난이도·트릭 관점으로 정리한 창작 참고 자료',
  w: 640,
  h: 660,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '창작 묘사용 단서'이지 실행 지침이 아니다. 입수경로/수법은 '서사 설정' 수준의 모호한 표현으로만 적는다.
interface Entry {
  name: string          // 명칭(또는 수법명)
  aka?: string          // 이칭·별칭
  onset?: string        // 발현 시간(서사용)
  symptom?: string      // 증상·묘사 단서
  detect?: string       // 검출 난이도(수사·검시 관점)
  source?: string       // 입수·등장 경로(서사 설정 수준)
  trick?: string        // 추리 트릭·반전 포인트
  caution?: string      // 고증·작가 유의(클리셰·오류 주의)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집 ----------
const CATS: CatDef[] = [
  {
    key: 'plant', label: '식물·자연독', icon: '🌿',
    note: '예부터 추리소설이 사랑한 ‘우아한 독’. 정원·약초·차(茶)에 숨기기 좋아 가정 미스터리의 단골.',
    items: [
      { name: '바곳(투구꽃·아코니틴)', aka: '몽크스후드', onset: '수십 분 내 빠르게', symptom: '입·혀의 얼얼함과 마비감, 저림이 번지다 부정맥·호흡곤란으로. 의식은 끝까지 또렷하게 그려지곤 한다.', detect: '예전엔 ‘완전범죄의 독’으로 불릴 만큼 잡기 어려웠으나, 현대 분석에서는 검출 가능 — 시대 배경이 트릭의 핵심.', source: '관상용 정원초·민간 약재로 등장시키는 설정이 흔함.', trick: '“정원 가꾸기가 취미인 노부인” 같은 무해해 보이는 인물에 붙이면 의외의 범인 카드가 된다.', caution: '맛이 거의 없다는 통념과 달리 자극적 풍미가 있다는 기록도 — 음식에 숨기는 트릭의 개연성을 따져 묘사.' },
      { name: '디기탈리스(폭스글러브)', aka: '디곡신 계열', onset: '시간 단위로 서서히', symptom: '메스꺼움·시야가 노랗게·황시증, 느려지거나 뒤엉키는 맥박. 심장약을 ‘과하게’ 쓴 듯 보이게 만들 수 있다.', detect: '심장약 성분과 겹쳐, 지병이 있는 피해자라면 자연사로 위장하기 쉬움 — 약물 농도 감정이 분기점.', source: '실제 강심제 원료라 ‘약을 바꿔치기’ 트릭과 잘 맞는다.', trick: '심장병 환자의 평소 약에 섞어 ‘지병 악화’로 보이게 하는 고전적 위장 살인.', caution: '치료약이자 독이라는 양면성을 활용하면 동기·기회 묘사가 자연스러워진다.' },
      { name: '주목(택솔·택신)', aka: '서양주목 열매·잎', onset: '수 시간', symptom: '어지럼·복통 뒤 갑작스러운 심정지. 외상이 없어 ‘급사’처럼 보인다.', detect: '특수 분석이 필요해 일반 부검에서 놓치기 쉬운 편 — 검시관의 ‘의심’ 여부가 사건을 가른다.', source: '오래된 정원·교회 묘지의 상록수로 분위기까지 챙길 수 있다.', trick: '“정원의 붉은 열매를 아이가 먹었다”는 사고처럼 꾸며 타살을 덮는 변형.' },
      { name: '독미나리(시쿠톡신)', aka: '워터헴록', onset: '빠르게(수십 분)', symptom: '격렬한 경련·발작. 발견 시 상황이 처참해 ‘발작성 질환’으로 오인될 수 있다.', detect: '식물 동정이 어려워 ‘무엇을 먹었는가’가 미궁 — 위 내용물 감정이 단서.', source: '미나리·셀러리와 닮아 ‘착각해 먹은 사고’ 설정으로 자주 등장.', trick: '식용 산나물과 혼입시켜 사고사로 위장하는 시골 배경 미스터리.' },
      { name: '벨라도나(아트로핀)', aka: '디들리 나이트셰이드', onset: '30분~수 시간', symptom: '동공 확대, 헛것을 보는 섬망, 마른 피부, 빠른 맥박. “뜨겁고 붉고 마르고 미친” 고전 증상.', detect: '항콜린 증상은 다른 약물과 겹쳐 오진을 부르기 쉬움.', source: '역사물·고딕 배경의 ‘마녀의 약초’로 분위기를 입히기 좋다.', trick: '점안액(동공 확대용) 형태로 등장시켜 ‘미용·의료’ 맥락으로 숨기는 변형.' },
      { name: '협죽도(올레안드린)', aka: '올레안더', onset: '수 시간', symptom: '구토·복통과 함께 치명적 부정맥. 디기탈리스와 유사한 심장 작용.', detect: '심장 독성 성분으로 표적 분석 전엔 놓치기 쉬움.', source: '가로수·정원수로 흔해 ‘일상 속 독’이라는 아이러니를 준다.', trick: '“가지로 꼬치를 구워 먹었다”류의 도시전설형 사고 위장.' },
      { name: '피마자(리신)', aka: '캐스터빈', onset: '수 시간~하루 지연', symptom: '섭취·흡입 경로에 따라 다르나, 시차를 둔 장기 손상으로 ‘서서히 무너지는’ 전개에 적합.', detect: '특수 검사가 필요해 사인 규명이 늦어지는 ‘지연 발각’ 플롯에 어울림.', source: '관상용·공업용 씨앗에서 비롯한다는 설정 수준으로만 다룬다.', trick: '발현이 늦어 ‘마지막으로 만난 사람’ 알리바이가 흔들리는 시간 트릭.', caution: '실제 가공·정제 묘사는 피하고 ‘이미 만들어진 독’이 어디서 왔는지에 서사 초점을 둘 것.' },
      { name: '독버섯(아마톡신)', aka: '알광대버섯 류', onset: '6~24시간 뒤 1차 증상, 이후 호전됐다 악화', symptom: '처음엔 식중독처럼 보이다가 며칠 뒤 간·신장이 무너지는 ‘2상성’ 경과.', detect: '초기 호전기 때문에 ‘회복한 줄 알았던’ 피해자가 뒤늦게 사망 — 사인 추적이 까다롭다.', source: '채집한 야생 버섯·요리 사고로 자연스럽게 끼워 넣을 수 있다.', trick: '“같이 먹은 사람은 멀쩡하다”는 모순으로 1인분에만 섞인 트릭을 암시.' },
    ],
  },
  {
    key: 'mineral', label: '광물·금속·고전독', icon: '⚗️',
    note: '빅토리아·황금기 추리의 주역. ‘무미·무취’ 신화와 검출 기술의 발달이 시대 트릭을 좌우한다.',
    items: [
      { name: '비소', aka: '‘상속 가루’·아세닉', onset: '급성은 수 시간, 만성은 수주에 걸쳐', symptom: '급성은 격심한 위장 증상(콜레라 오인), 만성은 권태·색소침착·신경증으로 ‘병약함’처럼 보인다.', detect: '마시 검사 이후 검출이 가능해진 역사 — 시대 배경에 따라 ‘완전범죄→발각’이 갈린다. 모발·손톱에 장기 축적이 남는다.', source: '과거 약·색소·쥐약 등 일상 곳곳에 있었다는 ‘시대적 흔함’이 동기·기회의 토양.', trick: '소량을 오래 먹여 ‘지병으로 시들어 죽은’ 것처럼 꾸미는 만성 독살 — 유산 상속 동기와 결합.', caution: '“무미무취라 절대 못 잡는다”는 흔한 오해. 현대·근대 감식에서는 잘 잡히므로 시대 고증이 중요.' },
      { name: '청산가리(시안화물)', aka: '사이아나이드', onset: '즉각적(수초~수분)', symptom: '쓴 아몬드 향(맡지 못하는 사람도 많음), 급격한 호흡곤란·경련, 선홍빛 피부.', detect: '휘발성이라 시간이 지나면 농도가 떨어져 ‘늦게 부검하면 놓친다’는 트릭이 성립.', source: '도금·사진·공업 약품 등 ‘직업적 접근’ 설정과 잘 맞는다.', trick: '즉사성을 이용한 ‘바로 그 자리, 그 음료’ 알리바이·캡슐 시한 트릭(삼킨 뒤 늦게 녹는 캡슐).', caution: '향을 맡는 능력은 유전적으로 갈린다는 점이 ‘아무도 못 알아챘다’의 개연성 장치가 된다.' },
      { name: '안티몬', aka: '주석연(酒石鉛)과 혼동 주의', onset: '비소와 유사하게', symptom: '지속적 구토·탈수로 ‘위장병’처럼 보인다. 비소 살인의 ‘사촌’ 격.', detect: '비소만 의심하던 수사관의 허를 찌르는 ‘다른 금속’ 설정이 가능.', source: '과거 토제(吐劑)·약재로 쓰였다는 역사적 배경 활용.', trick: '비소 검사만 통과시키고 안티몬으로 바꾼 ‘분석의 사각지대’ 트릭.' },
      { name: '탈륨', aka: '‘독살자의 독’', onset: '하루~수일 지연', symptom: '뒤늦게 머리카락이 빠지고 손발 저림·통증이 번지는 특징적 경과.', detect: '증상이 모호해 신경질환으로 오진되기 쉬움 — ‘탈모’가 결정적 단서로 등장하는 후반 반전.', source: '과거 쥐약·제모제 등에 쓰였다는 설정 수준으로만 다룬다.', trick: '발현이 늦어 용의선상이 넓어지는 ‘시간 분산’ 트릭. 탈모 단서로 명탐정이 독을 특정.' },
      { name: '수은', aka: '머큐리', onset: '형태에 따라 급성~만성', symptom: '떨림·잇몸 변화·정서 불안(‘미친 모자장수’). 만성 노출이 ‘기행·광기’로 비친다.', detect: '직업·환경 노출과 구분이 어려워 ‘의도성’ 입증이 쟁점.', source: '온도계·도금·옛 약 등 시대적 소재.', trick: '서서히 정신을 무너뜨려 ‘스스로 무너진 사람’으로 몰아가는 심리·독성 복합 트릭.' },
      { name: '납', aka: '연(鉛)중독', onset: '만성(수주~수개월)', symptom: '복통·빈혈·인지 저하가 천천히. ‘노화·치매’로 오인되기 쉽다.', detect: '느린 진행 탓에 타살 의심 자체가 늦다.', source: '낡은 수도관·도료·식기(고증물) 등 ‘생활 환경’에 숨긴다.', trick: '특정인의 식기·식수원만 오염시켜 ‘환경 사고’로 위장.' },
    ],
  },
  {
    key: 'pharma', label: '약물·과용·상호작용', icon: '💊',
    note: '현대 미스터리의 무대. ‘약을 약으로 죽인다’ — 처방·과용·금기 조합이 트릭의 핵심.',
    items: [
      { name: '진정·수면제 과용', aka: '바르비투르·벤조 계열(총칭)', onset: '복용량·내성에 따라', symptom: '깊은 졸음→혼수, 호흡 억제. ‘잠든 채’ 발견되어 자살·사고 위장에 쓰인다.', detect: '혈중 농도 감정과 ‘처방 이력 대비 과한 양’이 단서.', source: '본인 처방약을 활용하는 ‘가까운 사람’ 범행 설정.', trick: '술과 함께 ‘우발적 과용’처럼 꾸미는 위장 자살. 처방전·약통 잔량의 모순이 반전 열쇠.' },
      { name: '인슐린 과주입', aka: '저혈당 유도', onset: '주입 후 비교적 빠르게', symptom: '식은땀·혼란·경련 뒤 혼수. 당뇨가 없는 사람에게는 의외의 사인.', detect: '인슐린은 체내에서 빠르게 분해돼 ‘거의 흔적이 남지 않는다’는 점이 고전적 난제 — 주사 자국·C-펩타이드 비율이 결정타.', source: '의료인·간병인 등 ‘약을 다루는 직업’ 용의자와 결합.', trick: '“간병하던 가족·간호인” 카드 + 미세한 주사 자국이라는 단서. 의학 미스터리의 단골.', caution: '“완전히 못 잡는다”는 과거 통념. 현대 감식에서는 단서가 남으므로 시대·환경을 설정해 개연성 확보.' },
      { name: '해열진통제 만성 과용', aka: '아세트아미노펜 계열(총칭)', onset: '하루~며칠 지연', symptom: '초기엔 멀쩡하다가 시차를 두고 간 기능이 무너지는 ‘지연성’.', detect: '시간차 때문에 ‘마지막 만남’과 사망 시점이 어긋나 알리바이가 흔들린다.', source: '흔한 상비약이라 ‘누구나 접근 가능’ — 용의자 압축이 어렵다.', trick: '소량씩 오래 먹여 ‘약을 자주 먹던 사람’의 자업자득처럼 보이게 하는 만성 트릭.' },
      { name: '심장약·혈압약 조작', aka: '용량 바꿔치기', onset: '약효에 따라', symptom: '혈압·맥박의 급변으로 ‘지병 악화’처럼 보인다.', detect: '약통 잔량·처방 기록과 ‘실제 복용 흔적’의 불일치가 핵심.', source: '동거 가족·돌봄제공자가 ‘약 관리’를 맡은 상황.', trick: '진짜 약을 가짜와 바꿔치거나 용량을 조작해 ‘약을 안 먹어서/잘못 먹어서’로 몰아가기.' },
      { name: '약물 상호작용(금기 조합)', aka: '병용 금기', onset: '조합·체질에 따라', symptom: '단독으로는 안전한 두 약이 함께 들어가 치명적 부작용을 일으킨다.', detect: '각 약은 ‘정상 처방’이라 의심을 비껴가는 ‘조합의 범죄’ — 약력 전체를 봐야 보인다.', source: '여러 의사에게 따로 처방받게 유도하는 ‘정보 비대칭’ 설정.', trick: '범인이 직접 독을 주지 않고 ‘금기 약을 더하기만’ 해 손을 더럽히지 않는 영리한 트릭.' },
      { name: '국소마취제 과량', aka: '리도카인 계열(총칭)', onset: '빠르게', symptom: '어지럼·이명·경련 뒤 심정지. 시술 현장이면 ‘의료 사고’로 묻히기 쉽다.', detect: '투여 경로·용량 기록과의 대조가 관건.', source: '치과·시술 등 ‘의료 무대’ 미스터리에 어울린다.', trick: '정상 시술로 위장된 살인 — 차트 위변조가 부가 트릭이 된다.' },
    ],
  },
  {
    key: 'gas', label: '기체·환경·질식', icon: '🌫️',
    note: '“방 안에 있었을 뿐인데” — 환경 자체를 흉기로 쓰는 부류. 밀실·사고 위장과 궁합이 좋다.',
    items: [
      { name: '일산화탄소', aka: 'CO·연탄/배기가스', onset: '농도에 따라 서서히~빠르게', symptom: '두통·졸음·판단력 저하로 ‘도망치지 못한 채’ 의식을 잃는다. 선홍빛 시반이 특징.', detect: '혈중 카복시헤모글로빈 수치가 결정적. 환기·기구 상태가 ‘사고냐 타살이냐’를 가른다.', source: '난방기구·차고·보일러 결함 등 ‘생활 사고’로 위장하기 쉽다.', trick: '환기구를 막거나 기구를 고의로 손봐 ‘불운한 사고’로 꾸미는 고전 트릭. 밀실 변형에 자주 쓰임.', caution: '선홍빛 시반은 추리의 단서로 즐겨 쓰이는 ‘시각적 표지’ — 검시 장면 묘사에 활용.' },
      { name: '연기·유독가스(화재)', aka: '흡입 손상', onset: '노출 즉시', symptom: '기도 화상·그을음, 검댕. 화재가 ‘사인’인지 ‘은폐 수단’인지가 쟁점.', detect: '기도 내 그을음·혈중 가스 수치로 ‘불나기 전 이미 죽었는가’를 가린다 — 방화 미스터리의 핵심 감정.', source: '방화로 시신과 증거를 함께 태우려는 은폐 설정.', trick: '“불이 나서 죽은 게 아니라, 죽은 뒤 불을 질렀다”를 검시가 뒤집는 반전.' },
      { name: '저산소·질소 치환', aka: '불활성 기체', onset: '빠르게', symptom: '경고 없이 의식이 흐려진다(괴롭지 않게 묘사되곤 함). 외상이 없다.', detect: '특이 흔적이 적어 ‘왜 죽었는지 모를’ 밀폐 공간 사망 — 환경·환기 조사가 단서.', source: '실험실·산업 설비·잠수 등 ‘특수 환경’ 무대.', trick: '폐쇄 공간의 기체 조성을 바꿔 외상 없는 죽음을 만드는 산업 미스터리.' },
      { name: '교살·액살(질식)', aka: '경부 압박', onset: '즉시', symptom: '안검·결막의 점상출혈, 목의 색흔(끈·손자국). 질식의 ‘기계적’ 흔적.', detect: '색흔의 형태·방향, 설골 골절 여부로 타살/자살/사고를 구분 — 검시의 정석.', source: '근접·격정 범행에 어울려 ‘우발 vs 계획’ 논쟁을 만든다.', trick: '“스스로 목맸다(자살)”로 꾸민 위장 — 색흔 각도·이단성(二段性) 흔적이 모순을 드러낸다.', caution: '점상출혈·설골 등은 검시 묘사의 단골 키워드. 과장 없이 ‘단서’로만 쓰면 리얼리티가 산다.' },
      { name: '익사·익수 위장', aka: '수중 사망', onset: '상황에 따라', symptom: '폐·부비동의 물, 플랑크톤 등. ‘물에 빠져 죽었나, 빠뜨려졌나’가 핵심.', detect: '규조류 검사·생활반응으로 ‘물에 들어갈 때 살아 있었는지’를 가린다.', source: '욕조·호수·바다 등 ‘사고처럼 보이는’ 무대.', trick: '다른 곳에서 살해 후 물에 유기 → ‘익사 사고’ 위장을 검시가 부정하는 반전.' },
    ],
  },
  {
    key: 'physical', label: '물리·외력·흉기', icon: '🔪',
    note: '검시·법의학이 빛나는 영역. 상처의 ‘모양·각도·순서’가 거짓 진술을 무너뜨린다.',
    items: [
      { name: '둔기 외상', aka: '타박·함몰', onset: '즉시~지연(두부 손상은 시차)', symptom: '함몰·열창, 때로 ‘말짱히 걷다가’ 시차를 두고 악화되는 두부 출혈.', detect: '상처 형태로 흉기의 종류를 역추적. 머리 손상은 ‘넘어진 사고냐 가격이냐’가 쟁점.', source: '주변 사물(난로 받침·트로피 등)이 즉석 흉기가 되는 가정 미스터리.', trick: '“계단에서 굴렀다”류 사고 위장 — 상처 위치·반복성이 모순을 드러낸다(낙상은 보통 한 곳).' },
      { name: '예기(칼·자상)', aka: '절창·자창', onset: '출혈량에 따라', symptom: '상처의 깊이·각도·방어흔(손·팔)으로 ‘저항했는가’를 읽는다.', detect: '자살 위장 시 ‘주저흔’의 유무, 이용 손(오른손잡이/왼손잡이)·각도가 결정적.', source: '주방·작업장 등 ‘흉기가 일상에 있는’ 공간.', trick: '타살을 자살로 꾸몄을 때, 도달 불가능한 각도·방어흔의 존재가 트릭을 깬다.', caution: '방어흔·주저흔은 검시 반전의 단골. 흉기를 ‘쥔 손’과 상처 방향의 일치 여부를 묘사에 활용.' },
      { name: '추락', aka: '고소 낙하', onset: '즉시', symptom: '손상 패턴이 ‘착지 자세·높이’와 일치하는지가 관건.', detect: '난간 흔적·신발·도약 거리로 ‘스스로 뛰었나, 밀렸나’를 가린다.', source: '옥상·절벽·계단 등 ‘사고·자살처럼 보이는’ 무대.', trick: '밀어 떨어뜨린 뒤 자살로 위장 — 출발 지점에서 떨어진 ‘착지 거리’가 타살을 시사.' },
      { name: '감전', aka: '전격사', onset: '즉시', symptom: '유입·유출부의 전류반(전류흔), 외관상 ‘심장마비’로 보일 수 있다.', detect: '전류반·접촉부의 미세 손상이 단서 — 없으면 ‘자연사’로 묻힐 위험.', source: '욕실·전기기구 결함 등 ‘생활 사고’ 위장.', trick: '물 + 전기기구로 ‘감전 사고’를 연출 — 회로·기구 조작 흔적이 반전 단서.' },
      { name: '저체온·고체온', aka: '환경 노출', onset: '환경에 따라 서서히', symptom: '저체온은 역설적 탈의(옷을 벗는) 같은 기이한 행동 흔적, 고체온은 탈수.', detect: '환경·정황과 시신 상태의 정합성이 핵심. ‘왜 거기서 그렇게?’가 의심의 출발.', source: '산·설원·밀폐 차량 등 ‘자연이 흉기’가 되는 무대.', trick: '약물·구속으로 빠져나오지 못하게 한 뒤 ‘조난 사고’로 위장하는 복합 트릭.' },
    ],
  },
  {
    key: 'forensic', label: '검시·수사 단서', icon: '🔬',
    note: '독·수법을 ‘어떻게 들키는가’의 사전. 명탐정이 진실을 끄집어내는 도구 상자.',
    items: [
      { name: '사망시각 추정', aka: '시반·시강·체온', onset: '사후 시간 경과', symptom: '시반(피의 침하)·시강(시신 경직)·직장 체온의 변화로 사망 시각의 ‘창(窓)’을 좁힌다.', detect: '환경 온도·체격이 변수라 ‘정확한 시각’은 범위로만 — 알리바이 트릭의 핵심 무대.', source: '— (수사 기법)', trick: '난방·냉방으로 시신 온도를 조작해 ‘사망 시각’을 속이는 알리바이 트릭. 시반의 ‘이동’이 시신 이동을 폭로.' },
      { name: '시반의 위치', aka: '사후 혈액 침하', onset: '사후 수 시간 고정', symptom: '눕힌 자세에 따라 피가 아래로 몰려 굳는다 — 한 번 고정되면 잘 안 바뀐다.', detect: '시반 위치가 ‘발견된 자세’와 안 맞으면 시신을 옮겼다는 증거.', source: '— (수사 기법)', trick: '“현장에서 죽었다”는 진술을, 자세와 어긋난 시반이 정면으로 반박.' },
      { name: '위 내용물·소화 정도', aka: '최후의 만찬', onset: '식후 경과', symptom: '위 속 음식의 소화 정도로 ‘마지막 식사 후 얼마 만에 죽었는가’를 추정.', detect: '“같이 저녁을 먹었다”는 알리바이를 소화 단계가 무너뜨린다.', source: '— (수사 기법)', trick: '식사 메뉴·소화 상태로 ‘사망 시각’을 역산하는 고전 단서.' },
      { name: '독물 분석의 한계', aka: '표적 검사 vs 미지의 독', onset: '—', symptom: '독물 검사는 ‘무엇을 찾을지’ 정해야 잘 잡힌다 — 의심하지 않으면 못 찾는다.', detect: '검시관이 ‘특정 독’을 의심해야 표적 분석이 돌아간다는 점이 트릭의 빈틈.', source: '— (수사 기법)', trick: '흔치 않은 독을 써서 ‘찾을 생각조차 못 하게’ 만드는 트릭 — 사소한 단서가 검사 방향을 바꾼다.' },
      { name: '독성학적 알리바이', aka: '발현 시간 = 시간 트릭', onset: '독마다 다른 잠복기', symptom: '독의 ‘발현까지 걸리는 시간’이 곧 범행 시각의 알리바이가 된다.', detect: '발현이 느린 독일수록 ‘마지막 접촉자’ 알리바이가 흔들려 용의선상이 넓어진다.', source: '— (수사 기법)', trick: '지연성 독으로 ‘함께 있던 시간’과 ‘죽은 시간’을 떼어놓는 시간 분리 트릭.' },
      { name: '생활반응', aka: '상처가 생전인가 사후인가', onset: '—', symptom: '출혈·붓기 같은 ‘살아 있을 때만 생기는 반응’으로 손상의 선후를 가린다.', detect: '“불·물·추락이 사인”이라는 위장을, 생활반응의 유무가 뒤집는다.', source: '— (수사 기법)', trick: '죽인 뒤 사고로 위장해도, 사후에 생긴 상처엔 생활반응이 없어 진실이 드러난다.' },
    ],
  },
  {
    key: 'stage', label: '위장 자살·사고', icon: '🎭',
    note: '“타살을 무엇으로 보이게 하는가”의 카탈로그. 위장의 ‘허점’이 곧 단서다.',
    items: [
      { name: '위장 자살(목맴)', aka: '교사 위장', onset: '—', symptom: '끈자국(색흔)의 방향·이단성, 결찰 매듭의 위치로 ‘스스로인지’를 본다.', detect: '발이 바닥에 닿는 높이, 의자의 부재, 손의 닿지 않는 매듭이 모순을 만든다.', source: '독방·서재 등 ‘혼자였다’를 전제하는 무대.', trick: '교살 후 목매단 듯 꾸미지만, 이단성 색흔·점상출혈 패턴이 어긋난다.' },
      { name: '위장 자살(약물)', aka: '과용 위장', onset: '—', symptom: '유서·약통·잔량의 ‘이야기’가 너무 깔끔하면 오히려 의심.', detect: '약을 삼킨 시각과 글씨·정황의 불일치, 강제로 먹인 흔적(구강 손상)이 단서.', source: '우울·지병 등 ‘납득되는 동기’를 깔아두는 설정.', trick: '유서의 필적·문체, 자판 입력 시각 메타데이터가 위장을 폭로하는 현대적 변형.' },
      { name: '위장 사고(낙상·계단)', aka: '실족 위장', onset: '—', symptom: '낙상은 보통 한 곳에 손상이 몰리는데, 여러 곳·여러 방향 손상은 ‘맞았다’는 신호.', detect: '손상 분포·반복성, 현장의 미끄럼 흔적 유무가 사고/타살을 가른다.', source: '노인·음주 등 ‘사고가 그럴듯한’ 정황을 활용.', trick: '“술 취해 굴렀다”를 손상 패턴이 부정.' },
      { name: '위장 사고(화재)', aka: '방화 은폐', onset: '—', symptom: '발화 지점·촉진제 흔적, 기도 그을음의 유무.', detect: '시신이 ‘불나기 전에 이미 죽었는가’(기도 그을음·혈중 가스)가 핵심.', source: '증거 인멸을 노린 방화 무대.', trick: '살해 후 방화로 증거를 태우려 하지만, 검시가 ‘선(先) 사망’을 밝혀낸다.' },
      { name: '위장 사고(차량·도로)', aka: '뺑소니·운전 위장', onset: '—', symptom: '충돌 손상과 사망 원인의 불일치 — ‘차에 치이기 전에 이미’.', detect: '범퍼 높이와 손상 위치, 사후 손상 여부(생활반응)가 단서.', source: '음주운전·뺑소니로 묻으려는 도로 무대.', trick: '다른 방법으로 죽인 뒤 차로 친 듯 꾸미는 이중 위장.' },
      { name: '알리바이 공작', aka: '시간·장소 위장', onset: '—', symptom: '사망 시각·발현 시간·시신 상태를 조작해 ‘그때 거기 없었다’를 꾸민다.', detect: '시반·체온·소화·독성 발현이 만든 ‘시간의 모순’이 알리바이를 깬다.', source: '— (서사 트릭)', trick: '온도 조작·지연성 독·시신 이동 등 ‘시간 그 자체’를 속이는 본격 트릭의 총집합.' },
    ],
  },
]

const LS = 'sry:tool:mystery-poison-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 단서 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '이칭' },
  { k: 'onset', label: '발현 시간' },
  { k: 'symptom', label: '증상·묘사 단서' },
  { k: 'detect', label: '검출 난이도' },
  { k: 'source', label: '등장·입수 경로' },
  { k: 'trick', label: '추리 트릭' },
  { k: 'caution', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`☠️ ${f.item.name}  (${f.cat.label})`]
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
    `<p><i>※ 추리·미스터리 창작 참고 자료. 실제 사용·재현을 위한 정보가 아닙니다.</i></p>`,
  ].join('')
}

export default function MysteryPoisonRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 오면 검색 힌트로 활용(맥락 활용)
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
        return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
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

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[수법 자료] ${plainText(f)}`,
      source: '독극물·살해수법 사전 (미스터리·추리)',
      tags: ['미스터리', '추리', '수법', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '수법·트릭 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 발현시간: f.item.onset || '', 검출난이도: f.item.detect ? '주의' : '' },
    })
    if (id) flash(`프로젝트 자료 〈수법·트릭 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

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
        <Emoji e="⚠️"/> <b style={{ color: 'var(--text)' }}>창작 참고 자료</b>입니다. 추리·미스터리의 트릭·검시·수사 묘사를 위한 서사용 단서이며,
        실제 제조·사용·재현을 위한 정보가 아닙니다. 디테일은 ‘이야기의 개연성’에 맞춰 각색해 쓰세요.
      </div>

      <div style={hint}>
        독극물·물리적 수법·검시 단서·위장 자살/사고 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 트릭 영감을 얻고, 클릭해 복사하거나 스니펫·프로젝트로 보내세요.
        {genreHint && genreHint !== '미스터리·추리' ? <>  (전달된 맥락: <b>{genreHint}</b>)</> : null}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·증상·트릭으로 검색 (예: 알리바이, 위장 자살, 발현 시간)"
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 자료</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
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
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈수법·트릭 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('setup-payoff')} title="복선·회수 추적기 열기"><Emoji e="🔫"/> 복선·회수 추적기</button>
            <button className="linkbtn" onClick={() => openToolLinked('event-timeline')} title="사건 연대표 열기(알리바이·시간 트릭 정리)"><Emoji e="🕰️"/> 사건 연대표</button>
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
                {!open && item.symptom && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.symptom}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>자료는 정답이 아니라 출발점입니다. 시대 배경·검식 수준에 맞춰 ‘무엇이 들키고 무엇이 숨는지’를 비틀어 트릭을 설계하세요.</div>
    </div>
  )
}
