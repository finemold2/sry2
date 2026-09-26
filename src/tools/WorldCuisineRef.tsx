// 식문화 사전 — 지역·시대별 음식·식재료·조리법·식사 예절, 그리고 향·맛·질감 묘사 어휘를 모은 완전 로컬 레퍼런스.
// 장면의 감각 묘사용 자료집. 모든 데이터는 자작 요약·표현(백과 베끼기 없음). 외부 네트워크/키/미디어 불필요.
// react 와 './linkbus' 외 import 금지. 데이터는 카테고리별로 풍부하게.
import { useEffect, useRef, useState } from 'react'
import { addToStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'world-cuisine-ref', name: '식문화 사전', icon: '🍲', group: '리서치·자료', intro: '지역·시대별 음식·식재료·향·맛 묘사 어휘로 장면을 살리세요', w: 460, h: 620 }

// ---------- 데이터 타입 ----------
interface Entry {
  name: string      // 항목 이름
  tag?: string      // 곁다리 분류(지역/시대/계열)
  desc: string      // 자작 요약(감각 중심)
}
interface Cat {
  id: string
  title: string
  icon: string
  hint: string
  items: Entry[]
}

// ---------- 자작 데이터 (백과 베끼기 금지, 묘사용 요약) ----------
const CATS: Cat[] = [
  {
    id: 'region-dish', title: '지역별 대표 음식', icon: '🌍', hint: '무대 배경을 잡을 때',
    items: [
      { name: '온돌 위 뜨끈한 국밥', tag: '한반도', desc: '뽀얀 사골 국물에 밥을 말아 김이 자욱하게 오른다. 깍두기 국물을 한 숟갈 떠 넣으면 시큼한 향이 번진다.' },
      { name: '간장에 조린 생선', tag: '동아시아', desc: '진간장과 무가 어우러져 짭짤하면서 달큰하다. 살을 발라내면 결대로 부서지며 단맛이 배어 있다.' },
      { name: '향신료가 겹겹인 카레', tag: '남아시아', desc: '강황의 노란빛 위로 정향과 카더멈 향이 층을 이룬다. 첫 입은 부드럽다가 뒤늦게 매운 기운이 올라온다.' },
      { name: '얇게 구운 납작빵', tag: '서아시아', desc: '화덕 벽에 붙여 구워 가장자리가 부풀고 군데군데 그을렸다. 찢으면 안쪽에서 따뜻한 김이 새어 나온다.' },
      { name: '올리브유에 절인 채소', tag: '지중해', desc: '햇볕 머금은 토마토와 가지에 허브가 엉겨 있다. 입에 넣으면 기름의 풀 향과 산미가 동시에 퍼진다.' },
      { name: '오래 끓인 고기 스튜', tag: '중부 유럽', desc: '붉은 와인과 함께 몇 시간을 졸여 고기가 포크에 닿자마자 풀린다. 진한 갈색 소스에 빵을 적셔 먹는다.' },
      { name: '훈제한 소시지', tag: '북유럽', desc: '참나무 연기 향이 껍질에 깊이 배어 있다. 깨물면 톡 터지며 기름이 입안을 채운다.' },
      { name: '옥수수 반죽 부침', tag: '중앙아메리카', desc: '갓 구운 반죽에서 구수한 단내가 난다. 매콤한 소스와 고수를 얹으면 향이 코를 찌른다.' },
      { name: '숯불에 구운 소고기', tag: '남아메리카', desc: '굵은 소금만 뿌려 겉은 검게 그을리고 속은 붉다. 칼을 대면 육즙이 도마 위로 번진다.' },
      { name: '땅속 화덕 통구이', tag: '오세아니아', desc: '달군 돌과 잎으로 덮어 흙냄새와 연기 향이 살에 스민다. 부드럽게 익어 손으로 결을 뜯는다.' },
      { name: '향신밥과 양고기', tag: '북아프리카', desc: '말린 과일과 견과가 섞인 밥 위에 양고기가 얹힌다. 계피와 단맛, 고기 기름이 한데 어우러진다.' },
      { name: '발효시킨 콩 반찬', tag: '동아시아', desc: '쿰쿰한 발효 향이 먼저 닿고, 짭짤한 감칠맛이 혀에 오래 남는다. 호불호가 분명한 냄새다.' },
      { name: '코코넛밀크 국수', tag: '동남아시아', desc: '진한 코코넛에 라임과 고추가 어우러져 달고 시고 맵다. 국수를 건지면 향이 김과 함께 올라온다.' },
      { name: '차게 식힌 비트 수프', tag: '동유럽', desc: '선명한 자줏빛에 사워크림이 분홍 소용돌이를 그린다. 한 모금 넘기면 흙내 섞인 단맛이 시원하게 퍼진다.' },
    ],
  },
  {
    id: 'era-food', title: '시대별 식탁', icon: '⏳', hint: '시대물 고증·분위기',
    items: [
      { name: '고대 화로의 곡물죽', tag: '고대', desc: '거칠게 빻은 곡물을 토기에 끓인다. 꿀이나 말린 무화과로 단맛을 더하고, 그릇째 손으로 데워가며 먹는다.' },
      { name: '중세 연회의 통구이', tag: '중세', desc: '커다란 고기를 통째 꼬챙이에 꿰어 돌려 굽는다. 향신료는 부의 상징이라 후추 한 알도 귀하게 다룬다.' },
      { name: '수도원의 검소한 빵', tag: '중세', desc: '호밀로 빚어 거뭇하고 단단하다. 묽은 수프에 적셔야 겨우 베어 먹을 만큼 질기다.' },
      { name: '대항해의 절임 식량', tag: '근세', desc: '소금에 절인 고기와 딱딱한 비스킷이 항해의 전부다. 벌레를 골라내고 물에 불려 겨우 씹는다.' },
      { name: '궁중 연회의 색 고명', tag: '근세 동아시아', desc: '오색 고명을 한 점씩 올려 그릇이 작은 정원 같다. 맛보다 보기 좋게, 격식에 맞게 차린다.' },
      { name: '산업도시의 길거리 끼니', tag: '근대', desc: '공장 종소리에 맞춰 종이에 싼 튀김을 손에 들고 걸으며 먹는다. 기름내와 식초 냄새가 골목에 밴다.' },
      { name: '전시의 배급 식단', tag: '근대', desc: '계란 가루와 통조림으로 끼니를 잇는다. 설탕 한 숟갈도 아껴 차에 넣고, 빵 부스러기까지 모은다.' },
      { name: '전후 풍요의 통조림 잔치', tag: '현대 초', desc: '반짝이는 깡통을 따 한자리에 늘어놓는다. 가공된 단맛과 짠맛이 풍요의 표시로 여겨진다.' },
      { name: '냉장고 시대의 간편식', tag: '현대', desc: '얼린 음식을 데워 빠르게 차린다. 어디서 먹어도 같은 맛이라 향수와 편리가 뒤섞인다.' },
      { name: '미래 도시의 배양 단백', tag: '미래', desc: '실험실에서 길러낸 살점이 진짜와 거의 같다. 사람들은 향을 첨가해 옛 기억의 맛을 흉내 낸다.' },
    ],
  },
  {
    id: 'ingredient', title: '식재료 묘사', icon: '🧺', hint: '재료의 빛깔·결',
    items: [
      { name: '갓 빻은 후추', desc: '검은 알갱이가 으스러지며 매캐하고 화한 향이 톡 쏜다. 혀끝이 잠시 얼얼하다.' },
      { name: '말린 고추', desc: '주름진 붉은 껍질이 바스락거린다. 부수면 씨가 흩어지고 매운 가루가 콧속을 자극한다.' },
      { name: '갓 짜낸 우유', desc: '미지근한 온기가 남아 있고 풀 냄새가 옅게 섞여 있다. 표면에 옅은 거품이 떠 있다.' },
      { name: '잘 익은 토마토', desc: '손에 쥐면 무게가 묵직하고 껍질이 팽팽하다. 베면 즙과 씨가 한꺼번에 흘러나온다.' },
      { name: '버터', desc: '연노란 덩어리가 칼날에 부드럽게 갈린다. 데우면 견과 같은 고소한 향을 풍기며 거품이 인다.' },
      { name: '꿀', desc: '호박빛이 숟가락을 타고 끊기지 않는 실처럼 흘러내린다. 꽃향이 단맛 뒤에 옅게 남는다.' },
      { name: '생강', desc: '울퉁불퉁한 뿌리를 자르면 매운 즙이 배어 나온다. 알싸한 향이 손가락에 오래 머문다.' },
      { name: '마늘', desc: '얇은 껍질이 사각거리며 벗겨진다. 으깨면 강렬한 냄새가 손과 도마에 진하게 밴다.' },
      { name: '갓 구운 빵', desc: '겉은 갈색으로 단단하고 두드리면 속이 비어 통통 울린다. 가르면 김과 함께 효모 향이 퍼진다.' },
      { name: '소금', desc: '굵은 결정이 햇빛에 반짝인다. 손끝으로 집어 뿌리면 톡톡 떨어지는 소리가 난다.' },
      { name: '레몬', desc: '껍질을 긁으면 노란 기름이 톡 튀며 상큼한 향이 흩어진다. 즙은 입안을 오므리게 할 만큼 시다.' },
      { name: '말린 허브', desc: '손바닥에 비비면 바스러지며 마른 풀과 흙이 섞인 향이 일어난다.' },
      { name: '신선한 생선', desc: '비늘이 은빛으로 빛나고 눈이 맑다. 바닷바람 같은 비릿함이 살짝 돈다.' },
      { name: '숙성한 치즈', desc: '단단한 덩어리에 곰팡이의 푸른 결이 박혀 있다. 잘라내면 짙고 쿰쿰한 향이 진동한다.' },
      { name: '쌀', desc: '씻으면 뽀얀 물이 흐르고 알갱이가 손가락 사이로 매끄럽게 빠진다. 익으면 윤기가 돈다.' },
      { name: '말린 버섯', desc: '쪼그라든 갈색 조각이 물에 닿자 천천히 펴진다. 우러난 물에서 흙과 숲의 향이 난다.' },
    ],
  },
  {
    id: 'cooking', title: '조리법·불 다루기', icon: '🔥', hint: '주방 장면 동작',
    items: [
      { name: '센 불에 볶기', desc: '기름이 달궈져 연기가 오르고, 재료를 넣자 요란하게 지글거린다. 팬을 흔들 때마다 불꽃이 솟구친다.' },
      { name: '약불에 졸이기', desc: '국물이 보글보글 작은 거품을 올리며 천천히 줄어든다. 향이 부엌을 채우고 색이 짙어진다.' },
      { name: '오래 고기', desc: '뼈와 살을 몇 시간 우려 국물이 뽀얗게 변한다. 위로 떠오른 기름을 국자로 걷어낸다.' },
      { name: '숯불에 굽기', desc: '벌건 숯 위에서 기름이 떨어지며 연기가 확 인다. 겉이 노릇해지고 그을린 줄무늬가 생긴다.' },
      { name: '기름에 튀기기', desc: '반죽이 끓는 기름에 닿자 거품을 일으키며 떠오른다. 점점 황금빛으로 부풀고 바삭한 소리가 난다.' },
      { name: '김에 찌기', desc: '솥뚜껑 틈으로 김이 새어 나오고 물방울이 맺힌다. 뚜껑을 열면 뜨거운 수증기가 얼굴을 덮친다.' },
      { name: '연기에 훈제하기', desc: '낮은 온도의 연기 속에 오래 두어 향이 속까지 밴다. 표면이 진한 갈색으로 윤이 난다.' },
      { name: '소금·식초에 절이기', desc: '재료를 양념에 담가 며칠 둔다. 색이 변하고 단단해지며 시큼하고 짭짤한 향이 항아리에 고인다.' },
      { name: '발효시키기', desc: '항아리 속에서 천천히 부글거리며 쿰쿰한 향이 익는다. 시간이 흐를수록 깊고 복잡한 맛이 든다.' },
      { name: '재워 양념 배게 하기', desc: '간장과 향신료에 고기를 담가 손으로 주무른다. 양념이 결 사이로 스며 색이 짙어진다.' },
      { name: '반죽 치대기', desc: '밀가루에 물을 부어 손바닥으로 누르고 접기를 반복한다. 차츰 매끈하고 탄력 있게 뭉쳐진다.' },
      { name: '약불에 데치기', desc: '끓는 물에 잠깐 담갔다 건진다. 채소가 선명해지고 아삭함은 그대로 남는다.' },
    ],
  },
  {
    id: 'etiquette', title: '식사 예절·풍습', icon: '🍴', hint: '문화 차이·인물 행동',
    items: [
      { name: '연장자 먼저', tag: '동아시아', desc: '윗사람이 수저를 들기 전엔 누구도 손대지 않는다. 어긋나면 눈빛만으로 무례가 전해진다.' },
      { name: '손으로 먹기', tag: '남아시아·서아시아', desc: '오른손으로만 음식을 집는다. 왼손을 쓰면 결례로 여겨 조심스럽게 손끝만 사용한다.' },
      { name: '잔 채워 주기', tag: '동아시아', desc: '자기 잔은 스스로 채우지 않는다. 상대의 잔이 비면 두 손으로 따라 주는 것이 정이다.' },
      { name: '빵을 나눠 찢기', tag: '지중해', desc: '한 덩어리 빵을 손으로 떼어 돌린다. 칼로 자르지 않고 나누는 행위 자체가 환대의 표시다.' },
      { name: '식탁의 침묵', tag: '여러 문화', desc: '입에 음식을 문 채 말하지 않는다. 소리 내어 먹는 것이 예의인 곳도, 무례인 곳도 있다.' },
      { name: '접시를 비울지 남길지', tag: '문화 대비', desc: '깨끗이 비우는 게 감사인 곳이 있고, 조금 남겨야 충분했다는 뜻인 곳이 있다. 오해가 생기기 쉽다.' },
      { name: '건배의 시선', tag: '유럽', desc: '잔을 부딪칠 때 상대의 눈을 본다. 시선을 피하면 불운이 따른다는 농담 같은 믿음이 있다.' },
      { name: '신발과 식탁', tag: '동아시아', desc: '바닥에 앉아 먹기에 신을 벗고 들어선다. 발을 식기 쪽으로 뻗는 것은 큰 결례다.' },
      { name: '손님 먼저 권하기', tag: '여러 문화', desc: '주인은 가장 좋은 부위를 손님 앞에 놓는다. 세 번쯤 사양하다 받는 것이 예의인 곳도 있다.' },
      { name: '식전 감사', tag: '여러 문화', desc: '먹기 전 짧게 감사를 표한다. 침묵의 기도이거나, 식재료에 건네는 인사이거나, 함께한 이를 향한 말이다.' },
      { name: '공동 그릇', tag: '여러 문화', desc: '큰 그릇에 둘러앉아 각자 덜어 먹는다. 자기 수저를 공동 그릇에 넣을지 따로 둘지가 미묘한 규칙이다.' },
      { name: '식후의 차', tag: '여러 문화', desc: '식사 끝에 차나 단것을 내며 자리가 길어진다. 손님이 곧 일어서면 섭섭하게 여긴다.' },
    ],
  },
  {
    id: 'aroma', title: '향(嗅) 묘사 어휘', icon: '👃', hint: '냄새로 장면 깔기',
    items: [
      { name: '구수한', desc: '곡물이나 견과를 볶을 때 나는, 따뜻하고 둥근 냄새. 코를 편안하게 한다.' },
      { name: '매캐한', desc: '연기나 향신료가 코를 찌르는 자극적인 냄새. 기침이 날 듯 콧속이 따끔하다.' },
      { name: '쿰쿰한', desc: '발효나 묵은 것에서 나는 깊고 무거운 냄새. 익숙하면 군침이 돌고, 낯설면 얼굴을 찌푸리게 한다.' },
      { name: '비릿한', desc: '날생선·피에서 도는 금속 섞인 냄새. 바다나 도축장을 떠올리게 한다.' },
      { name: '알싸한', desc: '생강·마늘처럼 코를 톡 쏘며 화하게 퍼지는 냄새. 잠깐 정신이 든다.' },
      { name: '고소한', desc: '기름과 참깨가 데워질 때의 진하고 기름진 냄새. 침이 고이게 한다.' },
      { name: '달큰한', desc: '졸인 간장이나 캐러멜에서 나는, 단맛이 섞인 따뜻한 냄새.' },
      { name: '풋풋한', desc: '갓 딴 채소·허브의 풀 비린, 싱그러운 냄새. 입에 넣기 전부터 신선함이 느껴진다.' },
      { name: '훈연한', desc: '나무 연기가 깊이 밴, 그을음 섞인 묵직한 냄새. 모닥불 곁의 기억을 부른다.' },
      { name: '시큼한', desc: '식초·발효 채소에서 나는 코끝을 찡하게 하는 신 냄새. 군침과 거부감을 동시에 부른다.' },
      { name: '향긋한', desc: '꽃·과일·차에서 나는 가볍고 맑은 향. 들이마시면 기분이 풀린다.' },
      { name: '눅진한', desc: '오래 끓인 기름진 국물에서 올라오는, 진하고 끈적한 냄새.' },
      { name: '쌉싸름한', desc: '커피·약초에서 나는 살짝 탄 듯한 쓴 냄새. 정신을 깨운다.' },
    ],
  },
  {
    id: 'taste', title: '맛(味) 묘사 어휘', icon: '👅', hint: '혀에 닿는 감각',
    items: [
      { name: '감칠맛 도는', desc: '국물이나 발효 음식에서 혀를 휘감으며 오래 남는 깊은 맛. 한 입 더 부르는 맛.' },
      { name: '얼얼하게 매운', desc: '입안이 화끈거리다 못해 얼얼해지고 이마에 땀이 맺힌다. 매운데도 자꾸 손이 간다.' },
      { name: '톡 쏘는', desc: '탄산이나 식초가 혀를 찌르듯 자극한다. 잠이 달아날 만큼 정신이 든다.' },
      { name: '입안 가득 단', desc: '꿀이나 졸인 과일처럼 진한 단맛이 혀 전체를 덮는다. 뒤가 살짝 텁텁하다.' },
      { name: '짭조름한', desc: '바닷물 같은 짠맛이 적당히 배어 군침이 돈다. 밥을 부르는 맛.' },
      { name: '시원하고 칼칼한', desc: '맑은 국물에 매운 기운이 더해져 목을 시원하게 쓸어내린다. 해장에 어울린다.' },
      { name: '담백한', desc: '기름기와 자극이 적어 재료 본연의 맛이 은은히 드러난다. 물리지 않는다.' },
      { name: '느끼한', desc: '기름이 입안을 코팅하듯 무겁게 남는다. 신 것이나 채소를 찾게 된다.' },
      { name: '새콤달콤한', desc: '신맛과 단맛이 번갈아 혀를 자극한다. 침샘이 자극되어 식욕을 돋운다.' },
      { name: '쌉싸름한', desc: '쓴맛이 혀뿌리에 살짝 걸린다. 단맛이나 기름과 만나면 오히려 깊어진다.' },
      { name: '심심한', desc: '간이 약해 맛이 도드라지지 않는다. 자극에 지친 입에는 위로가 된다.' },
      { name: '진하고 묵직한', desc: '오래 끓인 국물처럼 맛이 두텁게 깔린다. 한 모금에 속이 든든해진다.' },
      { name: '개운한', desc: '먹고 나도 입안이 깔끔하다. 뒷맛이 가벼워 자리가 산뜻하게 끝난다.' },
    ],
  },
  {
    id: 'texture', title: '질감·온도 어휘', icon: '🥄', hint: '씹고 삼키는 감각',
    items: [
      { name: '바삭한', desc: '베어 물자 경쾌한 소리를 내며 부서진다. 갓 튀긴 것의 신호.' },
      { name: '쫄깃한', desc: '씹을수록 탄력 있게 되돌아온다. 면이나 떡에서 즐기는 식감.' },
      { name: '부드럽게 풀리는', desc: '입에 넣자마자 결을 따라 부서지며 사르르 녹는다. 오래 익힌 고기의 보람.' },
      { name: '아삭한', desc: '신선한 채소가 이 사이에서 시원하게 끊긴다. 물기 머금은 소리가 난다.' },
      { name: '걸쭉한', desc: '숟가락이 무겁게 끌리는 농도. 입안을 천천히 덮으며 든든하게 넘어간다.' },
      { name: '뜨끈한', desc: '김이 오르는 온기가 손과 목을 데운다. 추운 날 한 그릇의 위안.' },
      { name: '차갑게 식힌', desc: '입천장이 시릴 만큼 시원하다. 더운 날 맛이 더 또렷하게 느껴진다.' },
      { name: '미지근한', desc: '뜨겁지도 차갑지도 않아 맛이 밋밋하게 늘어진다. 식어버린 음식의 아쉬움.' },
      { name: '촉촉한', desc: '씹을 때마다 즙이 배어 나와 입안을 적신다. 마르지 않은 살의 풍요.' },
      { name: '퍽퍽한', desc: '수분이 빠져 입안에서 뭉쳐진다. 국물이나 음료를 찾게 만든다.' },
      { name: '입안에서 녹는', desc: '씹을 새도 없이 체온에 무너진다. 지방이나 설탕이 만든 호사.' },
      { name: '쩐득한', desc: '이에 들러붙듯 늘어진다. 떼어 먹는 재미와 번거로움이 함께 있다.' },
    ],
  },
  {
    id: 'scene', title: '식사 장면 글감', icon: '✏️', hint: '바로 쓰는 묘사 단서',
    items: [
      { name: '혼자 먹는 끼니', desc: '식어가는 음식 앞에서 인물의 외로움을 드러내 보세요. 무엇을, 왜, 누구를 떠올리며 먹는가.' },
      { name: '화해의 식탁', desc: '말없이 음식을 덜어 주는 손짓으로 용서를 그려보세요. 대사 없이 정적과 향만으로.' },
      { name: '낯선 음식 앞에서', desc: '처음 보는 음식에 인물이 어떻게 반응하는지로 성격을 보여주세요. 호기심인가 경계인가.' },
      { name: '명절의 부엌', desc: '여러 세대가 부대끼는 부엌의 소음·열기·냄새를 한 문단으로 채워보세요.' },
      { name: '굶주린 자의 식사', desc: '오래 굶은 인물이 처음 마주한 한 끼를 묘사해 보세요. 절제와 폭식 사이.' },
      { name: '독이 든 만찬', desc: '겉으로 화려한 식탁 아래 흐르는 긴장을 음식 묘사로 감춰보세요.' },
      { name: '이별 전 마지막 식사', desc: '평범한 메뉴에 작별의 무게를 실어보세요. 누구도 음식 이야기를 하지 않는다.' },
      { name: '계급이 드러나는 상차림', desc: '같은 공간 다른 식탁으로 신분 차이를 보여주세요. 그릇·재료·자리.' },
      { name: '기억을 부르는 맛', desc: '한 입에 어린 시절이 떠오르는 순간을 써보세요. 어떤 맛이 어떤 장면을 불러오는가.' },
      { name: '대접받지 못한 손님', desc: '소홀한 상차림으로 인물 사이의 균열을 암시해 보세요.' },
      { name: '함께 만드는 요리', desc: '두 인물이 손을 맞춰 음식을 만드는 동안 관계가 드러나게 해보세요.' },
      { name: '식탁 위 권력', desc: '누가 먼저 먹고, 누가 따라 주고, 누가 치우는지로 자리의 위계를 그려보세요.' },
    ],
  },
]

const LKEY = 'sry:tool:world-cuisine-ref'

// 사용자 추가 항목(자료 보강) — 카테고리별 텍스트 묶음으로 보관
interface UserItem { id: string; cat: string; name: string; desc: string }
function loadUser(): UserItem[] {
  try {
    const raw = localStorage.getItem(LKEY)
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as UserItem[] }
  } catch { /* noop */ }
  return []
}
function saveUser(arr: UserItem[]) {
  try { localStorage.setItem(LKEY, JSON.stringify(arr)) } catch { /* noop */ }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 검색 매칭
function matches(e: Entry, q: string): boolean {
  if (!q) return true
  const hay = (e.name + ' ' + (e.tag || '') + ' ' + e.desc).toLowerCase()
  return hay.includes(q)
}

export default function WorldCuisineRef({ payload }: { payload?: Record<string, unknown> }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    CATS.forEach((c, i) => { o[c.id] = i < 2 }) // 처음 두 카테고리만 펼침
    return o
  })
  const [picked, setPicked] = useState<{ cat: Cat; e: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState('')
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<UserItem[]>(() => loadUser())
  const [draftCat, setDraftCat] = useState(CATS[0].id)
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  // payload 로 검색어/카테고리 초기 지정 가능
  useEffect(() => {
    if (!payload) return
    const pq = typeof payload.query === 'string' ? payload.query : ''
    if (pq) setQ(pq)
    const pc = typeof payload.cat === 'string' ? payload.cat : ''
    if (pc && CATS.some((c) => c.id === pc)) setOpen((o) => ({ ...o, [pc]: true }))
  }, [payload])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  const bridge = hasProjectBridge()
  const ql = q.trim().toLowerCase()

  // 카테고리별 표시 항목(자작 + 사용자 추가 병합)
  const catItems = (c: Cat): Entry[] => {
    const extra = user.filter((u) => u.cat === c.id).map<Entry>((u) => ({ name: u.name, tag: '내가 추가', desc: u.desc }))
    return [...c.items, ...extra]
  }

  const filteredCats = CATS.map((c) => ({ cat: c, items: catItems(c).filter((e) => matches(e, ql)) }))
  const totalHits = filteredCats.reduce((n, x) => n + x.items.length, 0)

  // 무작위 뽑기 — 검색 필터 반영
  const drawRandom = () => {
    const pool: { cat: Cat; e: Entry }[] = []
    filteredCats.forEach(({ cat, items }) => items.forEach((e) => pool.push({ cat, e })))
    if (!pool.length) { flash('뽑을 항목이 없습니다.'); return }
    const hit = pool[Math.floor(Math.random() * pool.length)]
    setPicked(hit)
    setOpen((o) => ({ ...o, [hit.cat.id]: true }))
  }

  const entryText = (cat: Cat, e: Entry): string =>
    `[${cat.title}] ${e.name}${e.tag ? ` (${e.tag})` : ''}\n${e.desc}`

  const copyEntry = (cat: Cat, e: Entry, key: string) => {
    const text = entryText(cat, e)
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedKey(''), 1400)
    }).catch(() => {})
  }

  // 연계 1) 수집함에 담기
  const stashEntry = (cat: Cat, e: Entry) => {
    addToStash({ kind: 'note', label: `🍲 ${e.name}`, text: entryText(cat, e) })
    flash('수집함에 담았습니다.')
  }

  // 연계 2) 스니펫 라이브러리 저장
  const snippetEntry = (cat: Cat, e: Entry) => {
    addToLibrary('snippets', { text: entryText(cat, e), tags: ['식문화', cat.title], source: '식문화 사전' })
    flash('스니펫으로 저장했습니다.')
  }

  // 연계 3) 프로젝트 자료에 추가
  const projectEntry = (cat: Cat, e: Entry) => {
    if (!bridge) return
    const body = `<p>🍲 <b>${escHtml(e.name)}</b>${e.tag ? ' (' + escHtml(e.tag) + ')' : ''}</p>\n<p>${escHtml(e.desc)}</p>\n<p style="color:#888">분류: ${escHtml(cat.title)}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '식문화 자료',
      title: `식문화 · ${e.name}`, bodyHtml: body,
      meta: { 분류: cat.title, 곁분류: e.tag || '—' },
    })
    if (id) flash('프로젝트 "식문화 자료" 폴더에 추가했습니다.')
  }

  // 사용자 항목 추가/삭제
  const addUser = () => {
    const name = draftName.trim(), desc = draftDesc.trim()
    if (!name || !desc) { flash('이름과 묘사를 모두 입력하세요.'); return }
    const item: UserItem = { id: 'u_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36), cat: draftCat, name, desc }
    const next = [item, ...user]
    setUser(next); saveUser(next)
    setDraftName(''); setDraftDesc('')
    setOpen((o) => ({ ...o, [draftCat]: true }))
    flash('항목을 추가했습니다.')
  }
  const removeUser = (name: string, cat: string) => {
    const next = user.filter((u) => !(u.name === name && u.cat === cat))
    setUser(next); saveUser(next)
    flash('항목을 삭제했습니다.')
  }
  const isUserItem = (cat: Cat, e: Entry): boolean =>
    e.tag === '내가 추가' && user.some((u) => u.cat === cat.id && u.name === e.name)

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 10, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const inputS: React.CSSProperties = { flex: 1, minWidth: 120, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 13 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13, fontWeight: 700 }
  const itemS: React.CSSProperties = { padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.5 }
  const tagS: React.CSSProperties = { fontSize: 10.5, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px', marginLeft: 6 }
  const actRow: React.CSSProperties = { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }

  return (
    <div style={wrap}>
      {/* 상단: 검색 + 무작위 + 도구 연계 */}
      <div style={topRow}>
        <input
          style={inputS}
          placeholder="음식·재료·향·맛 검색 (예: 매운, 발효, 중세)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button className="minibtn" onClick={() => setQ('')}>✕</button>}
        <button className="btn-primary" onClick={drawRandom}><Emoji e="🎲"/> 무작위</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ql ? `검색 결과 ${totalHits}건` : `${CATS.length}개 분류 · 총 ${CATS.reduce((n, c) => n + c.items.length, 0) + user.length}개 항목`}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowAdd((v) => !v)}>{showAdd ? <>✕ 닫기</> : <><Emoji e="➕"/> 항목 추가</>}</button>
        <button className="linkbtn" onClick={() => openToolLinked('sensory-palette')} title="감각 팔레트 도구 열기"><Emoji e="🎨"/> 감각 팔레트</button>
      </div>

      {/* 항목 추가(CRUD) */}
      {showAdd && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select value={draftCat} onChange={(e) => setDraftCat(e.target.value)} style={{ ...inputS, flex: 'none' }}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
          </select>
          <input style={{ ...inputS, flex: 'none' }} placeholder="항목 이름" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          <textarea style={{ ...inputS, flex: 'none', minHeight: 52, resize: 'vertical', fontFamily: 'inherit' }} placeholder="감각 묘사(자작)" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
          <button className="btn-primary" onClick={addUser}>저장</button>
        </div>
      )}

      {/* 무작위 뽑은 항목 */}
      {picked && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: 10, fontSize: 12.5, lineHeight: 1.5 }}>
          <div style={{ marginBottom: 2 }}>
            <b style={{ color: 'var(--accent)' }}><Emoji e={picked.cat.icon}/> {picked.e.name}</b>
            {picked.e.tag && <span style={tagS}>{picked.e.tag}</span>}
          </div>
          <div style={{ color: 'var(--text)' }}>{picked.e.desc}</div>
          <div style={actRow}>
            <button className="minibtn" onClick={() => copyEntry(picked.cat, picked.e, 'pick')}>{copiedKey === 'pick' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="linkbtn" onClick={() => stashEntry(picked.cat, picked.e)}><Emoji e="📎"/> 수집함</button>
            <button className="linkbtn" onClick={() => snippetEntry(picked.cat, picked.e)}><Emoji e="🧩"/> 스니펫</button>
            {bridge && <button className="linkbtn" onClick={() => projectEntry(picked.cat, picked.e)}><Emoji e="📄"/> 프로젝트에 추가</button>}
            <button className="minibtn" onClick={() => setPicked(null)}>✕</button>
          </div>
        </div>
      )}

      {/* 카테고리 목록 */}
      <div style={scroll}>
        {filteredCats.map(({ cat, items }) => {
          if (ql && items.length === 0) return null
          const isOpen = ql ? true : !!open[cat.id]
          return (
            <div key={cat.id}>
              <div style={catHead} onClick={() => !ql && setOpen((o) => ({ ...o, [cat.id]: !o[cat.id] }))}>
                <span>{isOpen ? '▾' : '▸'}</span>
                <span><Emoji e={cat.icon}/></span>
                <span style={{ flex: 1 }}>{cat.title}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>{cat.hint} · {items.length}</span>
              </div>
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                  {items.map((e, i) => {
                    const key = cat.id + '_' + i + '_' + e.name
                    return (
                      <div key={key} style={itemS}>
                        <div>
                          <b>{e.name}</b>
                          {e.tag && <span style={tagS}>{e.tag}</span>}
                          {isUserItem(cat, e) && (
                            <button className="minibtn" style={{ float: 'right', padding: '0 6px' }} onClick={() => removeUser(e.name, cat.id)} title="내가 추가한 항목 삭제"><Emoji e="🗑"/></button>
                          )}
                        </div>
                        <div style={{ color: 'var(--muted)', marginTop: 3 }}>{e.desc}</div>
                        <div style={actRow}>
                          <button className="minibtn" onClick={() => copyEntry(cat, e, key)}>{copiedKey === key ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                          <button className="linkbtn" onClick={() => stashEntry(cat, e)}><Emoji e="📎"/> 수집함</button>
                          <button className="linkbtn" onClick={() => snippetEntry(cat, e)}><Emoji e="🧩"/> 스니펫</button>
                          {bridge && <button className="linkbtn" onClick={() => projectEntry(cat, e)}><Emoji e="📄"/> 프로젝트</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {ql && totalHits === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, fontSize: 13 }}>
            '{q}'에 해당하는 항목이 없습니다. 다른 말로 검색해 보세요.
          </div>
        )}
      </div>

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600, textAlign: 'center' }}>✓ {toast}</div>
      )}
    </div>
  )
}
