// 감각 묘사 팔레트 — 장소/상황을 고르면 그 공간의 오감(시각·청각·후각·촉각·미각) 묘사 어휘를
// 모아 보여준다. 감각 묘사가 막힐 때 참고용. 외부 네트워크/라이브러리 없이 로컬 데이터만 사용한다.
// 모든 어휘는 직접 작성한 창작 텍스트(저작권 안전)이며, 외부 API·이미지·폰트를 일절 사용하지 않는다.
import { useState, useEffect, useRef } from 'react'
import { openToolLinked, addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sensory-palette', name: '감각 묘사 팔레트', icon: '🌿', group: '영감·발상', intro: '장소를 고르면 오감 묘사 어휘를 모아 보여줍니다', w: 460, h: 620 }

interface Place {
  key: string
  name: string
  icon: string
  // 오감별 묘사 어휘·표현 모음
  sight: string[]
  sound: string[]
  smell: string[]
  touch: string[]
  taste: string[]
}

// 장소/상황 30+ — 각 장소마다 다섯 감각의 묘사 표현을 충분히.
const PLACES: Place[] = [
  {
    key: 'market', name: '시장', icon: '🛒',
    sight: ['색색의 좌판이 끝없이 늘어선 골목', '천막 사이로 비스듬히 떨어지는 햇살', '쌓아 올린 과일 더미의 붉고 노란 빛', '오가는 사람들로 출렁이는 인파', '흥정하느라 휘젓는 손짓'],
    sound: ['호객하는 상인의 걸걸한 목소리', '도마 위 칼질 소리', '동전이 부딪쳐 짤그랑거리는 소리', '여기저기서 터지는 흥정과 웃음', '카트 바퀴가 돌바닥을 구르는 소리'],
    smell: ['갓 튀긴 기름 냄새', '비릿한 생선 좌판의 짠내', '익은 과일의 달큰한 향', '향신료가 뒤섞인 매캐한 공기', '뜨거운 어묵 국물의 김 오른 냄새'],
    touch: ['끈적하게 들러붙는 한여름의 열기', '발에 채는 미끄러운 좌판 바닥', '손끝에 닿는 차가운 비닐봉지', '사람들 어깨에 떠밀리는 느낌', '거스름돈의 축축한 지폐'],
    taste: ['공짜로 맛본 시식 과일의 새콤함', '입천장을 데우는 뜨끈한 국물', '혀에 남는 짭짤한 군것질', '달큰하게 퍼지는 호떡의 흑설탕', '입안 가득 퍼지는 기름진 전 맛'],
  },
  {
    key: 'forest', name: '숲', icon: '🌲',
    sight: ['나뭇잎 사이로 부서져 내리는 빛줄기', '이끼로 뒤덮인 축축한 바위', '안개가 낮게 깔린 나무 둥치', '바람에 일렁이는 우거진 수관', '발치에 흩어진 마른 솔잎'],
    sound: ['멀리서 들려오는 새의 지저귐', '발밑에서 바스락거리는 낙엽', '바람에 쓸리는 나뭇가지 소리', '어딘가 졸졸 흐르는 시냇물', '딱따구리가 나무를 두드리는 소리'],
    smell: ['축축한 흙과 부엽토의 냄새', '소나무에서 풍기는 알싸한 송진', '비 온 뒤의 풋풋한 풀냄새', '버섯과 이끼의 눅눅한 향', '서늘하고 깨끗한 공기'],
    touch: ['뺨을 스치는 서늘하고 습한 공기', '발바닥에 푹신하게 밟히는 흙', '거친 나무껍질의 까슬함', '얼굴에 걸리는 거미줄', '손에 묻는 축축한 이끼'],
    taste: ['입안에 감도는 흙내 섞인 공기', '손에 딴 산딸기의 시큼달큼함', '차갑고 미네랄 같은 샘물', '씁쓸한 풀잎의 맛', '코끝에서 입으로 번지는 솔향'],
  },
  {
    key: 'sea', name: '바다', icon: '🌊',
    sight: ['수평선까지 펼쳐진 푸른 물결', '햇빛에 부서지는 윤슬', '하얗게 부서지는 파도의 포말', '갈매기가 점점이 떠 있는 하늘', '젖은 모래 위에 남은 발자국'],
    sound: ['끊임없이 밀려왔다 빠지는 파도 소리', '끼룩대는 갈매기 울음', '바람에 펄럭이는 파라솔', '멀리서 우는 뱃고동', '발밑 모래가 사그락거리는 소리'],
    smell: ['짭짤하고 비릿한 갯내', '바닷바람에 실린 미역 냄새', '뜨거운 모래에 달궈진 공기', '선크림의 달짝지근한 향', '말라붙은 소금기'],
    touch: ['발가락 사이로 빠져나가는 고운 모래', '발목을 휘감는 차가운 물', '햇볕에 따끔하게 익는 어깨', '피부에 들러붙는 끈적한 소금기', '얼굴에 부딪는 거센 바닷바람'],
    taste: ['입술에 닿는 짠 바닷물', '혀끝에 남는 소금기', '바람에 실려 오는 비릿한 맛', '시원하게 들이켠 음료의 청량함', '회 한 점의 쫄깃한 단맛'],
  },
  {
    key: 'hospital', name: '병원', icon: '🏥',
    sight: ['형광등이 균일하게 비추는 흰 복도', '커튼으로 나뉜 병상들', '점멸하는 모니터의 초록 그래프', '바퀴 달린 링거 거치대', '바닥에 반사된 차가운 빛'],
    sound: ['규칙적으로 삑삑대는 심전도 소리', '복도를 굴러가는 카트 바퀴', '안내 방송의 무미건조한 목소리', '슬리퍼가 끌리는 발소리', '커튼이 스르륵 젖혀지는 소리'],
    smell: ['코를 찌르는 소독약 냄새', '알코올 솜의 알싸함', '비닐과 약품이 섞인 공기', '멀건 병원 식판의 냄새', '표백된 시트의 무취에 가까운 냄새'],
    touch: ['차갑게 와닿는 금속 침대 난간', '빳빳하게 풀 먹인 시트', '팔에 감기는 혈압계의 압박', '손등에 꽂힌 주삿바늘의 따끔함', '서늘하게 식은 공기'],
    taste: ['입안에 도는 쇠 맛 같은 약 기운', '미지근하고 밍밍한 미음', '혀에 남는 알약의 쓴맛', '마른 입을 적시는 미지근한 물', '식욕을 잃게 하는 소독약 냄새의 뒷맛'],
  },
  {
    key: 'battlefield', name: '전쟁터', icon: '⚔️',
    sight: ['포연이 자욱하게 깔린 잿빛 들판', '여기저기 패인 포탄 구덩이', '하늘을 가르는 섬광', '진흙에 박힌 부서진 장비', '멀리 번지는 화염의 붉은 빛'],
    sound: ['귀를 찢는 포성과 총성', '머리 위를 스치는 탄환의 휘파람', '고함과 비명이 뒤섞인 아우성', '땅을 울리는 묵직한 진동', '잠시 찾아온 불길한 정적'],
    smell: ['매캐한 화약 냄새', '타들어가는 흙과 금속의 냄새', '비릿한 피 냄새', '젖은 진흙의 눅눅함', '연기에 그을린 공기'],
    touch: ['발목까지 빠지는 질척한 진흙', '폭발의 충격파가 가슴을 때리는 느낌', '손에 쥔 차가운 금속의 무게', '땀과 흙으로 뒤범벅된 피부', '귓속을 울리는 먹먹함'],
    taste: ['입안에 들어찬 흙먼지', '혀에 감도는 쇠 맛 같은 피', '바싹 마른 입의 갈증', '연기가 목구멍을 긁는 매캐함', '식어버린 전투식량의 텁텁함'],
  },
  {
    key: 'cafe', name: '카페', icon: '☕',
    sight: ['김이 모락모락 오르는 커피잔', '창으로 비껴드는 오후의 햇살', '잔잔히 흔들리는 라떼의 거품 무늬', '책장을 넘기는 사람들', '벽에 걸린 빛바랜 그림'],
    sound: ['에스프레소 머신의 칙칙거리는 소리', '잔잔하게 흐르는 배경 음악', '도자기 잔이 받침에 닿는 소리', '나직한 대화와 웃음', '원두를 갈아내는 그라인더 소리'],
    smell: ['진하게 볶인 원두 향', '갓 구운 빵의 버터 냄새', '달콤한 바닐라 시럽', '우유가 데워지는 고소한 향', '따뜻하고 아늑한 공기'],
    touch: ['손바닥을 데우는 따뜻한 머그', '매끈한 나무 테이블의 결', '폭신한 소파에 기댄 느낌', '입술에 닿는 부드러운 우유 거품', '창가로 스미는 미지근한 볕'],
    taste: ['쌉싸름하게 퍼지는 에스프레소', '부드럽게 감도는 우유의 단맛', '혀에 남는 캐러멜의 끈적함', '입안을 적시는 미지근한 물', '디저트의 진한 초콜릿 맛'],
  },
  {
    key: 'snowynight', name: '눈 오는 밤', icon: '🌨️',
    sight: ['가로등 불빛 아래 떨어지는 눈송이', '소복이 쌓여 푸르스름한 골목', '입김처럼 뿌옇게 흐려진 창', '발자국 하나 없는 새하얀 거리', '검은 하늘을 채우는 흰 점들'],
    sound: ['눈 위를 밟는 뽀드득 소리', '먹먹할 만큼 깊은 정적', '멀리서 울리는 종소리', '바람에 흩날리는 눈가루의 사각거림', '집집마다 새어 나오는 희미한 소음'],
    smell: ['차고 깨끗한 겨울 공기', '코끝이 시린 무취의 냄새', '어디선가 풍기는 장작 타는 향', '눈에 젖은 흙냄새', '얼어붙은 금속의 서늘함'],
    touch: ['뺨에 닿아 녹는 차가운 눈송이', '손끝이 곱아드는 추위', '입에서 피어오르는 하얀 입김', '목덜미로 파고드는 찬 바람', '장갑 속에서도 시린 손가락'],
    taste: ['혀에 닿아 사라지는 눈의 차가움', '코끝까지 시린 찬 공기의 맛', '입안을 데우는 따뜻한 코코아', '얼얼하게 식은 입술', '뜨거운 호빵의 팥소 단맛'],
  },
  {
    key: 'rain', name: '비 오는 거리', icon: '🌧️',
    sight: ['젖은 아스팔트에 번진 네온 불빛', '우산들이 물결치는 횡단보도', '유리창을 타고 흐르는 빗줄기', '물웅덩이에 비친 흐린 하늘', '처마 끝에서 떨어지는 물방울'],
    sound: ['지붕을 두드리는 빗소리', '타이어가 물을 가르는 소리', '우산 위로 떨어지는 빗방울', '하수구로 콸콸 흐르는 물', '멀리서 우르릉대는 천둥'],
    smell: ['비 냄새, 흙에서 올라오는 비릿한 향', '젖은 아스팔트의 미지근한 냄새', '축축한 콘크리트의 냄새', '비에 씻긴 풀냄새', '눅눅한 옷에 밴 물비린내'],
    touch: ['목덜미를 타고 흐르는 빗물', '신발 속까지 젖어드는 축축함', '얼굴에 들이치는 빗방울', '손에 쥔 우산 손잡이의 차가움', '옷에 들러붙는 젖은 천'],
    taste: ['입술에 닿는 미지근한 빗물', '비에 섞인 흙내', '눅눅하게 가라앉은 공기의 맛', '추위에 마시는 따뜻한 차', '입안에 도는 쇠 맛 같은 빗물'],
  },
  {
    key: 'library', name: '도서관', icon: '📚',
    sight: ['천장까지 빼곡한 책장', '먼지가 떠다니는 햇살 한 줄기', '줄지어 늘어선 열람 책상', '누렇게 바랜 책장의 가장자리', '고요히 책에 몰두한 사람들'],
    sound: ['책장을 넘기는 사각사각 소리', '의자가 끌리는 작은 소음', '먼 곳에서 들리는 기침 소리', '연필이 종이를 긁는 소리', '귀가 멍할 만큼 깊은 정적'],
    smell: ['오래된 종이의 바스러지는 냄새', '낡은 책의 곰팡내 섞인 향', '나무 책장의 은은한 냄새', '먼지가 내려앉은 공기', '잉크와 풀의 희미한 냄새'],
    touch: ['손끝에 닿는 거친 책장 가장자리', '매끄러운 책 표지의 감촉', '서늘하게 식은 실내 공기', '먼지가 묻어나는 책등', '딱딱한 나무 의자의 등받이'],
    taste: ['입안에 도는 마른 먼지의 텁텁함', '몰래 삼킨 사탕의 단맛', '메마른 입을 적시는 미지근한 물', '오래 머문 공기의 텁텁한 맛', '집중에 깜빡 잊은 텅 빈 입'],
  },
  {
    key: 'kitchen', name: '부엌', icon: '🍳',
    sight: ['지글지글 익어가는 프라이팬', '도마 위에 가지런히 썬 채소', '냄비에서 피어오르는 김', '햇살이 비치는 창가의 화분', '물기가 맺힌 싱크대'],
    sound: ['기름이 튀며 자글거리는 소리', '도마 위 경쾌한 칼질', '끓는 물이 보글거리는 소리', '식기가 부딪치는 달그락 소리', '환풍기가 돌아가는 윙윙거림'],
    smell: ['마늘이 노릇하게 볶이는 냄새', '구수하게 끓는 국물 냄새', '갓 지은 밥의 단내', '버터가 녹는 고소한 향', '생강과 간장의 알싸한 향'],
    touch: ['손에 닿는 따뜻한 그릇', '칼자루의 매끈한 무게', '뜨거운 김에 데워진 얼굴', '미끄러운 비눗물 묻은 손', '갓 씻은 채소의 차가운 물기'],
    taste: ['간을 보느라 맛본 국물의 짭짤함', '혀를 데우는 뜨거운 한 술', '입안에 퍼지는 감칠맛', '달콤하게 졸아든 양념', '집어 먹은 채소의 아삭한 맛'],
  },
  {
    key: 'subway', name: '지하철', icon: '🚇',
    sight: ['창에 비친 어두운 터널', '줄지어 선 무표정한 사람들', '깜빡이는 노선도의 불빛', '손잡이에 매달린 손들', '스크린도어 너머 들어오는 열차'],
    sound: ['덜컹거리며 달리는 레일 소리', '문 닫힘을 알리는 경고음', '안내 방송의 또렷한 목소리', '이어폰에서 새어 나오는 음악', '바퀴가 끼익 멈추는 마찰음'],
    smell: ['눅눅하고 쇳내 나는 공기', '사람들 사이의 향수와 땀 냄새', '터널에서 밀려오는 텁텁한 바람', '환기구의 미지근한 냄새', '아침 출근길의 커피 향'],
    touch: ['흔들림에 휘청이는 몸', '손잡이의 차갑고 미끈한 금속', '몸을 스치는 낯선 어깨', '문틈으로 밀려드는 찬 바람', '딱딱하게 식은 좌석'],
    taste: ['입안에 도는 텁텁한 공기', '아침에 마신 커피의 뒷맛', '메마른 입의 갈증', '졸음에 텁텁해진 입안', '몰래 씹는 껌의 박하향'],
  },
  {
    key: 'temple', name: '산사', icon: '⛩️',
    sight: ['처마 끝에 매달린 풍경', '돌계단을 따라 늘어선 단풍', '향 연기가 피어오르는 법당', '이끼 낀 석탑', '안개에 잠긴 산봉우리'],
    sound: ['은은하게 울리는 풍경 소리', '낮게 깔리는 목탁 소리', '바람에 흔들리는 댓잎', '먼 산에서 우는 새', '계곡물이 흐르는 소리'],
    smell: ['그윽하게 번지는 향내', '오래된 나무 기둥의 냄새', '산에서 내려오는 풀내음', '눅눅한 흙냄새', '비 갠 뒤의 맑은 공기'],
    touch: ['맨발에 닿는 차가운 마룻바닥', '손끝에 닿는 거친 돌탑', '서늘하게 감도는 산 공기', '햇볕에 데워진 댓돌', '이마에 닿는 시원한 바람'],
    taste: ['입안에 감도는 맑은 약수', '혀에 남는 향내의 쌉쌀함', '담백한 절밥의 슴슴함', '차가운 산공기의 맛', '진하게 우린 녹차의 떫음'],
  },
  {
    key: 'attic', name: '다락방', icon: '🪜',
    sight: ['먼지를 뒤집어쓴 낡은 상자들', '작은 창으로 비껴드는 빛 한 줄기', '거미줄이 쳐진 서까래', '빛바랜 사진과 오래된 가구', '구석에 쌓인 추억의 잔해'],
    sound: ['삐걱대는 나무 바닥', '지붕을 긁는 바람 소리', '어딘가에서 부스럭대는 작은 소리', '먼지가 가라앉는 듯한 정적', '계단을 오르는 발소리의 메아리'],
    smell: ['켜켜이 쌓인 먼지 냄새', '오래된 나무와 종이의 향', '눅눅한 곰팡이 냄새', '낡은 옷가지의 텁텁한 냄새', '시간이 멈춘 듯한 묵은 공기'],
    touch: ['손끝에 두껍게 묻어나는 먼지', '거친 나무 상자의 결', '서늘하고 정체된 공기', '낡은 천의 보풀거림', '삐걱이는 바닥의 불안한 흔들림'],
    taste: ['목을 막는 먼지의 텁텁함', '메마른 공기의 텁텁한 맛', '기침이 날 듯 칼칼한 입안', '오래 머문 공기의 묵은 맛', '가져온 물 한 모금의 미지근함'],
  },
  {
    key: 'desert', name: '사막', icon: '🏜️',
    sight: ['지평선까지 출렁이는 모래언덕', '아지랑이가 일렁이는 뜨거운 대기', '구름 한 점 없는 새파란 하늘', '바람에 흩날리는 모래 줄기', '뼈처럼 마른 가시덤불'],
    sound: ['귓가를 스치는 메마른 바람', '발밑에서 흘러내리는 모래', '아무 소리도 없는 광막한 적막', '멀리서 들리는 모래의 사각거림', '밤이 되면 우는 정체 모를 짐승'],
    smell: ['바싹 마른 흙과 돌의 냄새', '뜨겁게 달궈진 공기', '먼지 섞인 건조한 바람', '식물이라곤 없는 무취의 대기', '밤이 되면 내려앉는 서늘한 냄새'],
    touch: ['살갗을 찌르는 뜨거운 햇볕', '신발 속으로 파고드는 모래', '쩍쩍 갈라지는 마른 입술', '낮과 밤의 극단적인 온도차', '바람에 따갑게 부딪는 모래알'],
    taste: ['입안에 서걱이는 모래', '갈증으로 바싹 마른 혀', '먼지 섞인 텁텁한 공기', '아껴 마시는 미지근한 물 한 모금', '소금기로 마른 입술의 맛'],
  },
  {
    key: 'school', name: '교실', icon: '🏫',
    sight: ['창가로 쏟아지는 오후의 햇살', '분필 가루가 떠다니는 칠판 앞', '줄 맞춰 늘어선 책상들', '게시판에 붙은 빛바랜 안내문', '교실 뒤편에 걸린 시간표'],
    sound: ['분필이 칠판을 긁는 소리', '종이 울리는 수업 종', '왁자지껄한 쉬는 시간', '책장을 넘기는 사각거림', '의자 끄는 소리의 합창'],
    smell: ['분필 가루의 텁텁한 냄새', '오래된 책상 나무의 냄새', '도시락에서 풍기는 음식 냄새', '햇볕에 데워진 교실 공기', '지우개 가루의 고무 냄새'],
    touch: ['손에 묻는 분필 가루', '낙서로 패인 책상의 거친 표면', '딱딱한 나무 의자', '창으로 드는 따뜻한 볕', '땀이 밴 손바닥의 끈적함'],
    taste: ['몰래 까먹은 사탕의 단맛', '점심시간 급식의 익숙한 맛', '메마른 입의 갈증', '졸음에 텁텁해진 입안', '매점 빵의 달큰함'],
  },
  {
    key: 'graveyard', name: '묘지', icon: '🪦',
    sight: ['줄지어 늘어선 잿빛 비석', '안개가 낮게 깔린 잔디밭', '시든 꽃다발과 빛바랜 사진', '비스듬히 기운 오래된 묘비', '까마귀가 앉은 앙상한 나무'],
    sound: ['바람에 흔들리는 마른 풀', '멀리서 우는 까마귀', '나뭇가지가 삐걱대는 소리', '발밑에서 밟히는 마른 잎', '무겁게 가라앉은 정적'],
    smell: ['축축한 흙과 풀의 냄새', '시든 꽃의 시큼한 향', '비 온 뒤의 눅눅한 공기', '돌 비석의 차가운 냄새', '서늘하게 가라앉은 냄새'],
    touch: ['손끝에 닿는 차가운 비석', '발에 밟히는 축축한 잔디', '목덜미를 스치는 서늘한 바람', '이끼 낀 돌의 거친 표면', '으스스하게 곤두선 소름'],
    taste: ['입안에 도는 흙내', '메마른 입의 텁텁함', '차가운 공기의 서늘한 맛', '긴장에 마른 침', '바람에 실려 오는 풀내'],
  },
  {
    key: 'amusement', name: '놀이공원', icon: '🎡',
    sight: ['빙글빙글 도는 화려한 회전목마', '하늘로 솟구치는 롤러코스터', '색색의 풍선과 깃발', '밤하늘을 수놓는 불꽃놀이', '줄지어 걸린 반짝이는 전구'],
    sound: ['신나는 놀이기구 음악', '터져 나오는 비명과 환호', '풍선 터지는 소리', '먹거리 노점의 호객 소리', '회전목마의 경쾌한 멜로디'],
    smell: ['달콤한 솜사탕 냄새', '버터 향 가득한 팝콘', '기름에 튀긴 핫도그 냄새', '캐러멜 시럽의 끈적한 향', '사람들 사이의 들뜬 공기'],
    touch: ['안전바를 꽉 쥔 손', '바람에 휘날리는 머리카락', '롤러코스터의 떨어지는 무중력감', '손에 든 끈적한 솜사탕', '햇볕에 데워진 손잡이'],
    taste: ['혀에서 녹아내리는 솜사탕', '짭짤한 팝콘의 버터 맛', '시원하게 들이켠 탄산음료', '달콤한 아이스크림', '입가에 묻은 케첩의 새콤함'],
  },
  {
    key: 'office', name: '사무실', icon: '🏢',
    sight: ['줄지어 선 칸막이 책상', '형광등이 균일하게 비추는 천장', '모니터에 가득한 표와 문서', '창밖으로 보이는 도시 풍경', '쌓여 있는 서류 더미'],
    sound: ['키보드를 두드리는 타닥 소리', '복합기가 돌아가는 소리', '울리는 전화벨', '나직하게 오가는 업무 대화', '에어컨 바람의 윙윙거림'],
    smell: ['갓 뽑은 커피 향', '복사기의 토너 냄새', '데워진 전자기기의 미세한 냄새', '점심 무렵 풍기는 음식 냄새', '건조한 실내 공기'],
    touch: ['매끈한 키보드의 자판', '손목에 닿는 차가운 책상', '에어컨의 서늘한 바람', '딱딱한 사무 의자', '손에 쥔 따뜻한 머그'],
    taste: ['식어버린 커피의 쓴맛', '서랍 속 사탕의 단맛', '메마른 입의 갈증', '점심 후 입안에 남은 텁텁함', '졸음을 쫓는 박하사탕'],
  },
  {
    key: 'mountaintop', name: '산 정상', icon: '⛰️',
    sight: ['발아래 펼쳐진 구름 바다', '능선을 따라 이어진 산줄기', '눈부시게 파란 하늘', '바람에 펄럭이는 깃발', '아득히 작아진 마을'],
    sound: ['귓전을 때리는 거센 바람', '먼 곳에서 메아리치는 소리', '숨이 가쁜 자신의 거친 호흡', '깃발이 펄럭이는 소리', '광활한 고요'],
    smell: ['차고 희박한 고산의 공기', '바위와 마른 풀의 냄새', '눈이 녹은 서늘한 냄새', '맑고 깨끗한 대기', '바람에 실린 풀내음'],
    touch: ['살을 에는 차가운 바람', '가빠진 숨에 시린 폐', '바위에 닿는 거친 손바닥', '땀이 식어 서늘해진 등', '햇볕과 찬 바람의 엇갈림'],
    taste: ['차고 희박한 공기의 맛', '정상에서 마신 물 한 모금', '땀에 밴 짭짤한 입술', '들고 온 초콜릿의 달콤함', '메마른 입의 갈증'],
  },
  {
    key: 'aquarium', name: '수족관', icon: '🐠',
    sight: ['푸르게 일렁이는 거대한 수조', '유유히 헤엄치는 물고기 떼', '천천히 떠다니는 해파리', '물결에 흔들리는 빛 무늬', '어둠 속에 빛나는 수조의 불빛'],
    sound: ['웅웅대는 여과기 소리', '물방울이 보글거리는 소리', '낮게 흐르는 잔잔한 음악', '아이들의 들뜬 탄성', '발소리가 울리는 어두운 통로'],
    smell: ['비릿한 물 냄새', '소금기 섞인 습한 공기', '차갑고 눅눅한 냄새', '청소용 약품의 희미한 냄새', '서늘하게 가라앉은 공기'],
    touch: ['유리에 닿는 차가운 손바닥', '서늘하고 습한 공기', '어두운 통로의 미끈한 난간', '수조에서 번지는 차가운 기운', '바닥에 맺힌 물기'],
    taste: ['입안에 도는 비릿한 습기', '서늘한 공기의 맛', '매점에서 산 음료의 시원함', '메마른 입의 갈증', '습한 공기에 텁텁해진 입안'],
  },
  {
    key: 'bakery', name: '빵집', icon: '🥖',
    sight: ['진열대에 가지런히 놓인 빵들', '오븐에서 막 꺼낸 노릇한 식빵', '유리 너머 부풀어 오르는 반죽', '설탕가루가 뿌려진 페이스트리', '따뜻한 조명 아래 빛나는 진열장'],
    sound: ['오븐 타이머가 울리는 소리', '빵을 자르는 사각 소리', '집게가 쟁반에 부딪는 소리', '계산대의 잔잔한 인사', '반죽을 치대는 둔탁한 소리'],
    smell: ['갓 구운 빵의 고소한 냄새', '버터가 녹는 진한 향', '이스트가 부푼 시큼달큼한 냄새', '오븐에서 퍼지는 따뜻한 공기', '계피와 설탕의 달콤한 향'],
    touch: ['손에 든 따끈한 빵의 온기', '바삭한 크러스트의 부서짐', '말랑하게 눌리는 빵의 속살', '집게의 차가운 금속', '입가에 묻는 설탕가루'],
    taste: ['입안에서 녹는 부드러운 크림', '바삭하고 고소한 크러스트', '달콤하게 퍼지는 버터 향', '촉촉한 빵 속살의 단맛', '혀에 남는 계피의 알싸함'],
  },
  {
    key: 'rooftop', name: '옥상', icon: '🌃',
    sight: ['발아래 펼쳐진 도시의 불빛', '하늘을 가르는 비행기의 깜빡임', '난간 너머 아득한 거리', '빨래가 널린 옥상 한 켠', '구름 사이로 비치는 달'],
    sound: ['멀리서 올라오는 도시의 소음', '바람에 펄럭이는 빨래', '간간이 들리는 자동차 경적', '옥상 문이 삐걱이는 소리', '밤의 적막을 채우는 풀벌레'],
    smell: ['시원하게 부는 밤바람', '도시 위로 깔린 매연 냄새', '빨래에 밴 햇볕 냄새', '어디선가 풍기는 저녁 냄새', '서늘하게 식은 콘크리트 냄새'],
    touch: ['난간에 닿는 차가운 쇠', '뺨을 스치는 시원한 밤바람', '발밑의 거친 콘크리트', '목덜미로 스미는 서늘함', '햇볕에 데워졌다 식어가는 바닥'],
    taste: ['시원하게 들이켠 캔 음료', '밤공기의 서늘한 맛', '입술에 닿는 찬 바람', '몰래 피운 담배의 텁텁함', '메마른 입의 갈증'],
  },
  {
    key: 'spring', name: '봄날 들판', icon: '🌸',
    sight: ['바람에 일렁이는 연둣빛 풀밭', '흐드러지게 핀 들꽃', '날아다니는 나비와 벌', '아지랑이가 피어오르는 지평선', '꽃잎이 흩날리는 길'],
    sound: ['살랑이는 봄바람 소리', '재잘대는 새들의 지저귐', '윙윙대는 벌의 날갯짓', '풀잎이 부딪는 사각거림', '멀리서 들리는 아이들의 웃음'],
    smell: ['풋풋한 새 풀냄새', '달큰한 꽃향기', '따스하게 데워진 흙냄새', '봄바람에 실린 향긋함', '비 갠 뒤의 싱그러운 공기'],
    touch: ['뺨을 간질이는 따뜻한 봄바람', '발에 밟히는 부드러운 풀', '손끝에 닿는 보드라운 꽃잎', '햇볕에 데워진 등', '풀잎에 맺힌 서늘한 이슬'],
    taste: ['입안에 감도는 풀내음', '달큰한 꽃향의 뒷맛', '상큼한 공기의 맛', '들고 온 음료의 시원함', '봄나물의 쌉쌀한 맛'],
  },
  {
    key: 'bar', name: '술집', icon: '🍻',
    sight: ['어둑한 조명 아래 늘어선 술병', '거품이 이는 맥주잔', '바 카운터에 비친 불빛', '북적이는 사람들의 실루엣', '천장에 매달린 노란 전구'],
    sound: ['잔이 부딪치는 건배 소리', '왁자한 웃음과 떠드는 소리', '낮게 깔린 배경 음악', '병뚜껑 따는 소리', '주문을 외치는 목소리'],
    smell: ['알싸한 술 냄새', '안주로 튀긴 기름 냄새', '담배 연기 섞인 공기', '구운 고기의 고소한 향', '시큼한 맥주 냄새'],
    touch: ['손에 쥔 차가운 맥주잔', '미끈한 카운터의 표면', '입술에 닿는 잔의 거품', '끈적한 테이블의 자국', '사람들 사이의 후끈한 열기'],
    taste: ['목을 타고 넘어가는 시원한 맥주', '쌉싸름한 첫 모금', '짭짤한 안주의 감칠맛', '입안에 도는 알코올의 화함', '혀에 남는 탄산의 톡 쏨'],
  },
  {
    key: 'cave', name: '동굴', icon: '🕳️',
    sight: ['손전등 빛에 드러나는 종유석', '칠흑 같은 어둠', '물기에 반짝이는 암벽', '천장에서 떨어지는 물방울', '발치에 고인 검은 웅덩이'],
    sound: ['똑똑 떨어지는 물방울 소리', '발소리가 울리는 메아리', '먹먹할 만큼 깊은 정적', '저 멀리 흐르는 지하수', '날갯짓하는 박쥐 소리'],
    smell: ['눅눅한 흙과 돌의 냄새', '차갑고 축축한 공기', '곰팡내 섞인 묵은 냄새', '물비린내', '광물 같은 서늘한 냄새'],
    touch: ['손에 닿는 축축하고 차가운 바위', '발밑의 미끄러운 돌', '서늘하게 감도는 한기', '천장에서 떨어지는 차가운 물방울', '어둠 속에서 더듬는 거친 벽'],
    taste: ['입안에 도는 흙내', '광물 같은 차가운 물맛', '눅눅한 공기의 텁텁함', '메마른 입의 긴장', '서늘한 공기의 맛'],
  },
  {
    key: 'station', name: '기차역', icon: '🚉',
    sight: ['플랫폼에 들어오는 열차', '전광판에 깜빡이는 출발 시각', '캐리어를 끄는 사람들', '철로가 멀리 뻗어나간 풍경', '벤치에 앉아 기다리는 사람들'],
    sound: ['들어오는 열차의 기적 소리', '안내 방송의 또렷한 목소리', '캐리어 바퀴가 굴러가는 소리', '플랫폼을 울리는 발소리', '문이 닫히는 경고음'],
    smell: ['기름과 쇠 냄새', '플랫폼에 떠도는 매연', '대합실의 군것질 냄새', '비에 젖은 콘크리트', '들어오는 바람의 텁텁함'],
    touch: ['열차가 일으키는 바람', '캐리어 손잡이의 차가운 금속', '딱딱한 대기실 의자', '발밑을 울리는 진동', '플랫폼에 부는 서늘한 바람'],
    taste: ['대합실에서 산 커피의 쓴맛', '입안에 도는 매연의 텁텁함', '서둘러 삼킨 간식의 단맛', '메마른 입의 갈증', '긴장에 마른 입안'],
  },
  {
    key: 'autumn', name: '가을 골목', icon: '🍂',
    sight: ['노랗게 물든 은행나무', '바닥에 수북이 쌓인 낙엽', '비스듬히 길어진 오후의 그림자', '바람에 흩날리는 단풍잎', '주황빛으로 익은 노을'],
    sound: ['발밑에서 바스락대는 낙엽', '바람에 굴러가는 마른 잎', '멀리서 들리는 풍경 소리', '나뭇가지가 흔들리는 소리', '한가로운 거리의 소음'],
    smell: ['마른 낙엽의 바스러지는 냄새', '서늘하고 청량한 가을 공기', '어디선가 풍기는 군밤 냄새', '익어가는 과일의 단내', '흙냄새 섞인 선선한 바람'],
    touch: ['뺨을 스치는 선선한 바람', '발에 밟히는 바삭한 낙엽', '햇볕에 데워졌다 서늘해지는 공기', '손끝에 닿는 마른 잎의 거칢', '목덜미로 스미는 가을의 한기'],
    taste: ['따끈한 군밤의 포슬한 단맛', '서늘한 공기의 청량한 맛', '익은 감의 달콤함', '들고 온 따뜻한 차', '입안에 감도는 마른 잎 냄새'],
  },
  {
    key: 'concert', name: '공연장', icon: '🎤',
    sight: ['눈부시게 쏟아지는 조명', '어둠 속에 일렁이는 응원봉', '무대를 가득 채운 연주자들', '환호하는 관객의 물결', '천장까지 솟구치는 연기'],
    sound: ['고막을 울리는 베이스의 진동', '함성으로 가득 찬 객석', '터져 나오는 박수와 환호', '악기들이 어우러진 선율', '귓속을 채우는 압도적인 음량'],
    smell: ['무대 연기의 매캐한 냄새', '사람들 사이의 후끈한 열기', '땀에 젖은 공기', '향수가 뒤섞인 냄새', '먼지 섞인 조명의 열기'],
    touch: ['발끝까지 전해지는 음악의 진동', '맞부딪는 사람들의 어깨', '손이 얼얼하도록 치는 박수', '후끈하게 달아오른 공기', '땀에 젖어 들러붙는 옷'],
    taste: ['목이 쉬도록 외친 뒤의 갈증', '서둘러 들이켠 물 한 모금', '들뜬 흥분에 마른 입', '땀에 밴 짭짤한 입술', '메마른 입의 텁텁함'],
  },
  {
    key: 'oldhouse', name: '폐가', icon: '🏚️',
    sight: ['깨진 창으로 드는 희미한 빛', '벗겨진 벽지와 곰팡이 자국', '거미줄이 늘어진 천장', '먼지를 뒤집어쓴 가구', '바닥에 흩어진 잔해'],
    sound: ['삐걱대는 마룻바닥', '바람에 덜컹이는 창문', '어딘가에서 들리는 정체 모를 소리', '천장에서 떨어지는 물방울', '무겁게 가라앉은 정적'],
    smell: ['눅눅한 곰팡내', '먼지가 가득한 묵은 공기', '썩어가는 나무 냄새', '오래 갇힌 텁텁한 냄새', '습기에 절은 벽지 냄새'],
    touch: ['손끝에 묻어나는 두꺼운 먼지', '삐걱이는 불안한 바닥', '서늘하고 정체된 공기', '거친 벗겨진 벽', '발에 밟히는 부서진 잔해'],
    taste: ['목을 막는 곰팡내의 텁텁함', '먼지 섞인 공기의 맛', '기침이 날 듯 칼칼한 입안', '긴장에 마른 침', '묵은 공기의 텁텁한 뒷맛'],
  },
]

const SENSES = [
  { key: 'sight', label: '시각', icon: '👁️' },
  { key: 'sound', label: '청각', icon: '👂' },
  { key: 'smell', label: '후각', icon: '👃' },
  { key: 'touch', label: '촉각', icon: '✋' },
  { key: 'taste', label: '미각', icon: '👅' },
] as const

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

interface ToolProps { payload?: Record<string, unknown> }

export default function SensoryPalette({ payload }: ToolProps = {}) {
  const [activeKey, setActiveKey] = useState<string>(PLACES[0].key)
  const [copiedSense, setCopiedSense] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  // 연계 동작 결과 안내(저장됨/전달됨)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  // 복사·안내 표시 타이머 정리(언마운트 시 누수 방지)
  const copyTimer = useRef<number | null>(null)
  const linkTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    }
  }, [])

  const place = PLACES.find((p) => p.key === activeKey) || PLACES[0]

  const selectPlace = (key: string) => {
    setActiveKey(key)
    setCopiedSense(null)
    setCopiedAll(false)
  }

  const randomPlace = () => {
    // 같은 장소가 연달아 나오지 않도록 한 번 더 시도
    let p = pick(PLACES)
    if (p.key === activeKey && PLACES.length > 1) p = pick(PLACES)
    selectPlace(p.key)
  }

  const flashCopied = (mark: (() => void)) => {
    mark()
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => {
      setCopiedSense(null)
      setCopiedAll(false)
      copyTimer.current = null
    }, 1400)
  }

  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => {
      setLinkMsg(null)
      linkTimer.current = null
    }, 1800)
  }

  const safeCopy = (text: string, onDone: () => void) => {
    try {
      navigator.clipboard?.writeText(text).then(onDone).catch(() => { /* 권한 거부·미지원 graceful */ })
    } catch { /* 클립보드 미지원 무시 */ }
  }

  const copySense = (senseKey: string, label: string) => {
    const items = (place as unknown as Record<string, string[]>)[senseKey]
    if (!items || !items.length) return
    const text = `[${place.name} · ${label}]\n` + items.map((s) => `- ${s}`).join('\n')
    safeCopy(text, () => flashCopied(() => setCopiedSense(senseKey)))
  }

  // 현재 장소의 오감 묘사를 하나의 텍스트로 합친다(연계 전달·스니펫 저장용)
  const buildSensoryText = () => {
    const blocks = SENSES.map((s) => {
      const items = (place as unknown as Record<string, string[]>)[s.key]
      return `${s.icon} ${s.label}\n` + items.map((x) => `- ${x}`).join('\n')
    }).join('\n\n')
    return `【${place.name}】 감각 묘사\n\n${blocks}`
  }

  const copyAll = () => {
    const text = `${buildSensoryText()}`
    safeCopy(text, () => flashCopied(() => setCopiedAll(true)))
  }

  // [연계] 이 감각 묘사를 배경 설정집으로 — 장소 이름과 합친 묘사 텍스트를 함께 전달
  const sendToSettingBible = () => {
    const text = buildSensoryText()
    // 받는 허브(배경 설정집)에서 항목이 정규 칸에 들어가도록 정규 장소 키 fields 추가(기존 키는 유지)
    openToolLinked('setting-bible', {
      sensory: text,
      placeName: place.name,
      fields: { name: place.name, sensory: text },
    })
    flashLink('배경 설정집으로 보냈습니다')
  }

  // [연계] 스니펫 저장 — 공유 라이브러리에 감각 묘사 텍스트를 추가
  const saveSnippet = () => {
    const text = buildSensoryText()
    addToLibrary('snippets', { text, source: '감각 팔레트', tags: ['감각묘사', place.name] })
    flashLink('스니펫으로 저장했습니다')
  }

  // HTML 특수문자 escape(&,<,>) — bodyHtml 안전 생성용
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [프로젝트] 현재 장소의 오감 묘사 어휘 모음을 자료(research)의 "감각 묘사" 폴더에 메모로 추가
  const addToProjectMemo = () => {
    const bodyHtml = SENSES.map((s) => {
      const items = (place as unknown as Record<string, string[]>)[s.key]
      const lis = items.map((x) => `<li>${esc(x)}</li>`).join('')
      return `<p><b>${esc(s.icon)} ${esc(s.label)}</b></p><ul>${lis}</ul>`
    }).join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '감각 묘사',
      title: `${place.name} · 오감 묘사`,
      bodyHtml,
      meta: { 장소: place.name, 출처: '감각 묘사 팔레트' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        장소·상황을 고르면 그 공간의 <b>오감(시각·청각·후각·촉각·미각)</b> 묘사 어휘를 모아 보여줍니다. 묘사가 막힐 때 출발점으로 삼으세요.
      </div>

      {/* 장소 선택 칩 — 가로 스크롤 영역 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 96, overflowY: 'auto', paddingRight: 2, flexShrink: 0 }}>
        {PLACES.map((p) => {
          const on = p.key === activeKey
          return (
            <button
              key={p.key}
              className="minibtn"
              onClick={() => selectPlace(p.key)}
              aria-pressed={on}
              style={{
                opacity: on ? 1 : 0.6,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
                fontWeight: on ? 700 : 400,
              }}
            >
              <Emoji e={p.icon} /> {p.name}
            </button>
          )
        })}
      </div>

      {/* 선택 장소 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}><Emoji e={place.icon} /></span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{place.name}</span>
        <span style={{ marginLeft: 'auto' }}>
          <button className="minibtn" onClick={randomPlace} title="무작위 장소로 이동"><Emoji e="🎲" /> 무작위 장소</button>
        </span>
      </div>

      {/* 오감 카드 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {SENSES.map((s) => {
          const items = (place as unknown as Record<string, string[]>)[s.key]
          return (
            <div
              key={s.key}
              style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 15 }}><Emoji e={s.icon} /></span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{s.label}</span>
                <button
                  className="minibtn"
                  onClick={() => copySense(s.key, s.label)}
                  title={`${s.label} 묘사 복사`}
                  style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', color: copiedSense === s.key ? 'var(--ok)' : undefined, borderColor: copiedSense === s.key ? 'var(--ok)' : 'var(--border)' }}
                >
                  {copiedSense === s.key ? <>✓ 복사됨</> : <Emoji e="📋" />}
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {items.map((it, i) => (
                  <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)' }}>{it}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={randomPlace}><Emoji e="🎲" /> 무작위 장소</button>
        <button className="minibtn" onClick={copyAll}>{copiedAll ? <>✓ 전체 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}</button>
      </div>

      {/* 도구 연계 — 다른 도구로 보내거나 공유 라이브러리에 저장 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <button
          className="linkbtn"
          onClick={addToProjectMemo}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? `「${place.name}」의 오감 묘사 어휘를 프로젝트 자료에 메모로 추가합니다` : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button
          className="linkbtn"
          onClick={sendToSettingBible}
          title={`「${place.name}」의 감각 묘사를 배경 설정집으로 보냅니다`}
        >
          <Emoji e="🏛️" /> 이 감각 묘사를 배경 설정집으로
        </button>
        <button
          className="linkbtn"
          onClick={saveSnippet}
          title="현재 장소의 감각 묘사를 스니펫 라이브러리에 저장합니다"
        >
          <Emoji e="✂️" /> 스니펫 저장
        </button>
        {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
      </div>

      <div style={hint}>제시된 어휘는 출발점입니다. 그대로 쓰기보다, 인물의 감정과 상황에 맞게 비틀어 자기만의 묘사로 발전시켜 보세요.</div>
      <div className="license-note" style={{ ...hint, fontSize: 11 }}>모든 묘사 어휘는 직접 작성한 창작 텍스트입니다. 외부 이미지·API·폰트를 사용하지 않습니다.</div>
    </div>
  )
}
