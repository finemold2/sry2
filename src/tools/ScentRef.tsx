// 향·냄새 묘사 사전 — 흔히 소홀히 다뤄지는 후각을 보강하는 로컬 레퍼런스.
// 장소·상황·감정별 냄새 어휘와, 그 냄새를 살린 묘사 문장 후보를 모았다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
// 모든 텍스트는 직접 작성한 창작 데이터(백과·외부 출처 베끼기 금지). 제어문자·특수 구분자 없음(일반 문자만).
import { useState, useEffect, useMemo, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'scent-ref',
  name: '향·냄새 묘사 사전',
  icon: '👃',
  group: '분위기·시각',
  intro: '장소·상황·감정별 냄새 어휘와 후각 묘사 문장을 찾아 가장 잊기 쉬운 감각을 채우세요',
  w: 660,
  h: 640,
}

// ---------- 데이터 모델 ----------
interface ScentEntry {
  name: string        // 냄새의 이름/대상
  words: string[]     // 그 냄새를 가리키는 어휘·형용(자작)
  lines: string[]     // 그 냄새를 살린 묘사 문장 후보(자작)
}
interface Section {
  key: string
  label: string
  icon: string
  axis: '장소' | '상황' | '감정'   // 무엇을 기준으로 묶었는가
  blurb: string                     // 이 묶음에 대한 한 줄 안내
  entries: ScentEntry[]
}

// ---------- 향·냄새 사전(자작 데이터) ----------
// 축 1) 장소 — 그 공간의 공기를 채우는 냄새
// 축 2) 상황 — 사건/행위가 남기는 냄새
// 축 3) 감정 — 정서와 결부되어 떠오르는 냄새(후각-기억의 결합)
const SECTIONS: Section[] = [
  // ===== 장소 =====
  {
    key: 'home', label: '집·실내', icon: '🏠', axis: '장소',
    blurb: '오래 머문 공간일수록 냄새는 사람을 닮는다.',
    entries: [
      { name: '오래 산 집', words: ['묵은 냄새', '사람 냄새', '눅진한 살내', '세월에 밴 향', '벽지에 스민 냄새'], lines: ['문을 열자 누군가 오래 살아온 냄새가 훅 끼쳤다.', '벽지마다 지난 끼니와 잠과 한숨이 켜켜이 배어 있었다.', '아무것도 두지 않아도 빈집에는 떠난 이의 냄새가 남는다.'] },
      { name: '갓 청소한 방', words: ['표백제 냄새', '비누 거품 향', '말끔한 무취', '레몬 향 세제', '걸레질한 물비린내'], lines: ['표백제의 알싸함이 코를 찔러, 방은 지나치게 깨끗해 낯설었다.', '걸레질 끝의 물비린내가 가라앉자 비로소 빈자리가 도드라졌다.', '레몬 향 세제 너머로, 지우려 했던 냄새가 옅게 비어져 나왔다.'] },
      { name: '주방', words: ['기름 전 냄새', '구수한 밥내', '마늘 볶는 냄새', '식초의 시큼함', '눌은밥의 고소함'], lines: ['마늘이 노릇하게 볶이는 냄새가 집안을 데우기 시작했다.', '식은 기름 냄새가 환풍기 자국처럼 천장에 들러붙어 있었다.', '눌은밥 긁는 고소한 냄새에, 누군가 아직 부엌에 있음을 알았다.'] },
      { name: '이불·침구', words: ['햇볕 냄새', '포근한 살내', '세탁세제 향', '눅눅한 잠내', '베개에 밴 머릿내'], lines: ['널어 말린 이불에서 한낮의 햇볕 냄새가 났다.', '베개에 코를 묻자 그 사람의 머릿내가 어렴풋이 남아 있었다.', '눅눅한 잠내가 밴 이불 속은, 떠나기 싫을 만큼 안온했다.'] },
      { name: '낡은 책·서재', words: ['바스러지는 종이 냄새', '곰팡내', '잉크 향', '나무 책장 냄새', '먼지의 마른 냄새'], lines: ['책장을 펼치자 누렇게 삭은 종이의 단내가 풀려 나왔다.', '오래된 책 특유의 곰팡내가 도리어 마음을 가라앉혔다.', '잉크와 풀 냄새가 밴 서재는, 시간이 더디 흐르는 방 같았다.'] },
    ],
  },
  {
    key: 'nature', label: '자연·바깥', icon: '🌿', axis: '장소',
    blurb: '계절과 날씨는 늘 냄새로 먼저 도착한다.',
    entries: [
      { name: '비 직전·직후', words: ['흙 냄새', '비린 물내', '먼지 가라앉는 냄새', '풋내', '젖은 아스팔트 냄새'], lines: ['비가 오기 전, 흙에서 비릿한 물내가 먼저 올라왔다.', '소나기가 지나자 마른 먼지가 가라앉으며 풋내가 번졌다.', '젖은 아스팔트의 미지근한 냄새가 도시를 한 겹 씻어 냈다.'] },
      { name: '숲·산', words: ['송진의 알싸함', '부엽토 냄새', '이끼의 눅눅함', '서늘한 풀내', '버섯의 흙내'], lines: ['소나무 사이를 지날 때마다 알싸한 송진 향이 폐를 찔렀다.', '발밑 부엽토에서 축축하고 깊은 흙 냄새가 올라왔다.', '이끼와 버섯의 눅눅한 냄새가 그늘진 골짜기에 고여 있었다.'] },
      { name: '바다·갯가', words: ['짭짤한 갯내', '비린 물내', '미역 냄새', '소금기', '뜨거운 모래 냄새'], lines: ['바람이 방향을 바꾸자 짭짤한 갯내가 단번에 밀려왔다.', '말라붙은 미역의 비린 냄새가 부두 전체에 깔려 있었다.', '뜨거운 모래에 달궈진 소금기가 입술까지 짜게 했다.'] },
      { name: '꽃·풀밭', words: ['달큰한 꽃향', '풋풋한 풀내', '꿀 같은 단내', '향긋한 봄바람', '풀 베인 냄새'], lines: ['갓 베어 낸 풀에서 푸르고 진한 풋내가 코를 찔렀다.', '바람마다 어디선가 달큰한 꽃향이 실려 왔다 사라졌다.', '풀밭에 누우니 꿀처럼 단 풀내가 온몸을 감쌌다.'] },
      { name: '눈·겨울 공기', words: ['차고 깨끗한 무취', '시린 냄새', '얼어붙은 금속 냄새', '장작 타는 향', '코끝이 아린 냉기'], lines: ['눈 오는 밤의 공기는 너무 차서 거의 냄새가 없었다.', '어디선가 장작 타는 냄새가 시린 공기에 따스하게 섞였다.', '숨을 들이쉴 때마다 코끝이 아릴 만큼 깨끗한 냉기가 들어찼다.'] },
    ],
  },
  {
    key: 'city', label: '거리·도시', icon: '🏙️', axis: '장소',
    blurb: '도시의 냄새는 늘 여러 겹으로 겹쳐 온다.',
    entries: [
      { name: '시장·노점', words: ['튀김 기름 냄새', '비린 생선 좌판', '향신료의 매캐함', '어묵 국물의 김', '익은 과일의 단내'], lines: ['골목을 들어서자 갓 튀긴 기름 냄새가 허기를 끌어냈다.', '생선 좌판의 비린내와 과일의 단내가 한 걸음마다 뒤바뀌었다.', '어묵 국물에서 오른 김이 향신료 냄새에 섞여 코를 데웠다.'] },
      { name: '지하철·버스', words: ['눅눅한 쇳내', '낯선 땀 냄새', '향수와 섬유유연제', '터널 바람의 텁텁함', '미지근한 환기구 냄새'], lines: ['문이 열릴 때마다 터널에서 텁텁하고 미지근한 바람이 밀려들었다.', '사람들 사이의 향수와 땀 냄새가 좁은 칸에 빽빽이 들어찼다.', '눅눅한 쇳내가 밴 손잡이를 잡고, 흔들리며 아침을 견뎠다.'] },
      { name: '뒷골목', words: ['하수구 냄새', '담배 연기', '젖은 종이 박스', '음식물 쓰레기 냄새', '눅눅한 콘크리트'], lines: ['좁은 뒷골목엔 하수구의 군내와 담배 연기가 엉겨 있었다.', '젖은 종이 박스의 눅눅한 냄새가 발걸음을 더디게 했다.', '음식물 쓰레기의 시큼한 냄새가 더위 속에서 부풀어 올랐다.'] },
      { name: '카페·빵집', words: ['진한 원두 향', '버터 굽는 냄새', '바닐라 시럽 향', '데운 우유의 고소함', '계피 설탕 냄새'], lines: ['문을 밀자 갓 볶은 원두의 진한 향이 얼굴을 덮었다.', '오븐에서 막 나온 버터 굽는 냄새에 발이 저절로 멈췄다.', '데운 우유의 고소함과 바닐라 향이 따뜻하게 코를 채웠다.'] },
      { name: '비 오는 도시', words: ['젖은 매연 냄새', '흙비 냄새', '미지근한 물내', '눅눅한 옷 냄새', '씻긴 콘크리트'], lines: ['빗물이 매연을 씻어 내리자, 도시는 잠시 흙 냄새를 되찾았다.', '젖은 외투에서 눅눅한 물비린내가 끈질기게 따라붙었다.', '씻긴 콘크리트의 미지근한 냄새가 처마 밑에 고여 있었다.'] },
    ],
  },
  {
    key: 'institution', label: '기관·특수 공간', icon: '🏥', axis: '장소',
    blurb: '소독·기계·금속처럼, 사람을 긴장시키는 냄새들.',
    entries: [
      { name: '병원', words: ['소독약 냄새', '알코올 솜의 알싸함', '표백된 시트의 무취', '약품 섞인 비닐 냄새', '멀건 환자식 냄새'], lines: ['코를 찌르는 소독약 냄새에, 들어서기도 전에 몸이 굳었다.', '알코올 솜의 알싸함 뒤로, 지우지 못한 병의 냄새가 비쳤다.', '표백된 시트에선 차라리 아무 냄새도 나지 않아 더 차가웠다.'] },
      { name: '학교·교실', words: ['분필 가루 냄새', '낡은 책상 나무 냄새', '지우개 고무 냄새', '급식 냄새', '햇볕에 데워진 교실 공기'], lines: ['분필 가루의 텁텁한 냄새가 오후의 햇살 속을 떠다녔다.', '낡은 책상에 밴 나무 냄새는 어느 해에도 변하지 않았다.', '복도 끝에서 급식 냄새가 퍼지면, 시계를 보지 않아도 알았다.'] },
      { name: '공장·작업장', words: ['기름과 쇠 냄새', '용접 탄내', '고무 타는 냄새', '시너의 독한 향', '먼지 섞인 매캐함'], lines: ['기계 사이마다 기름과 쇠 냄새가 진하게 배어 있었다.', '용접 불꽃이 튈 때마다 매캐한 탄내가 코를 찔렀다.', '시너의 독한 향이 머리를 띵하게 만들었다.'] },
      { name: '낡은 건물·폐가', words: ['눅눅한 곰팡내', '먼지의 묵은 냄새', '썩어 가는 나무 냄새', '습기에 절은 벽지 냄새', '갇힌 공기의 텁텁함'], lines: ['문을 열자 오래 갇혀 묵은 곰팡내가 한꺼번에 쏟아졌다.', '썩어 가는 나무와 먼지의 냄새가 발걸음마다 일어났다.', '습기에 절은 벽지 냄새에, 이 집의 버려진 햇수를 가늠했다.'] },
    ],
  },
  // ===== 상황 =====
  {
    key: 'cooking', label: '요리·음식', icon: '🍳', axis: '상황',
    blurb: '먹는 일은 가장 풍부한 후각의 사건이다.',
    entries: [
      { name: '고기 굽기', words: ['지글대는 기름 냄새', '눌은 단백질의 고소함', '연기의 매캐함', '마이야르의 진한 향', '탄 가장자리의 쓴내'], lines: ['철판에 고기가 닿자 고소한 기름 냄새가 사방으로 번졌다.', '연기가 머리카락에 배도록, 우리는 말없이 고기를 뒤집었다.', '살짝 탄 가장자리의 쌉쌀한 냄새마저 군침을 돌게 했다.'] },
      { name: '국·찌개 끓이기', words: ['구수한 육수 냄새', '된장의 구릿한 향', '매콤한 김의 매운 냄새', '마늘 풀린 국물 냄새', '오래 고은 진한 향'], lines: ['뚝배기가 보글거리며 구수한 된장 냄새를 피워 올렸다.', '매운 김이 코를 톡 쏘자, 빈속이 먼저 알아채고 울었다.', '오래 고은 육수 냄새가 부엌을 넘어 현관까지 마중 나왔다.'] },
      { name: '빵·과자 굽기', words: ['버터 녹는 냄새', '이스트의 시큼달큼함', '설탕 캐러멜화 향', '계피의 알싸한 단내', '갓 구운 빵의 고소함'], lines: ['오븐이 데워지자 버터 녹는 냄새가 집 안을 가득 채웠다.', '설탕이 졸아드는 달큰한 냄새 끝에 옅은 탄내가 비쳤다.', '갓 구운 빵의 고소함은 어떤 위로의 말보다 다정했다.'] },
      { name: '커피·차 내리기', words: ['갓 간 원두의 진한 향', '쌉쌀한 추출 향', '데운 우유의 고소함', '찻잎 우러나는 향', '뜨거운 김의 맑은 냄새'], lines: ['원두를 갈자 쌉쌀하고 진한 향이 아침을 또렷하게 깨웠다.', '찻물이 우러날수록 풀 같던 향이 둥글고 따뜻해졌다.', '잔에서 오른 김에서 맑은 차향이 콧속으로 스며들었다.'] },
    ],
  },
  {
    key: 'event', label: '사건·행위', icon: '🔥', axis: '상황',
    blurb: '불·피·연기처럼 한순간을 각인시키는 냄새.',
    entries: [
      { name: '불·화재', words: ['매캐한 연기 냄새', '탄내', '그을린 천 냄새', '녹은 플라스틱의 독한 냄새', '재의 마른 냄새'], lines: ['매캐한 연기가 목을 긁자, 그제야 위험이 실감 났다.', '꺼진 자리에는 그을린 천과 재의 마른 냄새만 남았다.', '녹은 플라스틱의 독한 냄새가 며칠이 지나도 가시지 않았다.'] },
      { name: '피·상처', words: ['비릿한 쇠 냄새', '소독약과 피 냄새', '마른 핏자국 냄새', '약솜 냄새', '거즈의 무취'], lines: ['손바닥의 상처에서 비릿한 쇠 냄새가 옅게 올라왔다.', '소독약 냄새 사이로, 가시지 않은 피 냄새가 비쳤다.', '마른 핏자국의 쇳내는 오래도록 코끝에 남아 있었다.'] },
      { name: '술자리', words: ['알싸한 술 냄새', '시큼한 맥주 냄새', '안주 기름 냄새', '담배 연기', '땀과 열기의 냄새'], lines: ['문을 열자 알싸한 술 냄새와 안주 기름 냄새가 뒤엉켰다.', '시큼한 맥주 냄새가 끈적한 테이블에 눌어붙어 있었다.', '담배 연기와 사람의 열기가 후끈한 냄새로 부풀어 올랐다.'] },
      { name: '오래된 물건 꺼낼 때', words: ['묵은 종이 냄새', '나프탈렌 냄새', '낡은 천의 텁텁함', '먼지 일어나는 냄새', '시간이 밴 냄새'], lines: ['상자를 열자 나프탈렌과 묵은 종이 냄새가 함께 풀려 나왔다.', '낡은 외투에선 잊고 있던 계절의 냄새가 났다.', '먼지가 일어나며, 닫아 두었던 시간이 통째로 코로 들어왔다.'] },
    ],
  },
  {
    key: 'body', label: '몸·사람', icon: '🧴', axis: '상황',
    blurb: '체취만큼 사람을 가까이 불러오는 냄새도 없다.',
    entries: [
      { name: '갓 씻은 사람', words: ['비누 향', '샴푸의 깨끗한 냄새', '물기 어린 살내', '로션 냄새', '따뜻한 김의 향'], lines: ['머리카락에서 아직 마르지 않은 샴푸 냄새가 났다.', '비누 향 너머로, 지워지지 않는 그 사람의 살내가 비쳤다.', '갓 씻은 목덜미에서 따뜻한 김과 로션 냄새가 함께 풍겼다.'] },
      { name: '땀·운동 뒤', words: ['짭짤한 땀내', '쇠비린 냄새', '데워진 살내', '운동복의 눅눅함', '열이 오른 냄새'], lines: ['목덜미를 타고 흐른 땀에서 옅은 쇠비린 냄새가 났다.', '운동복에 밴 눅눅한 땀내가 가방을 열자 훅 올라왔다.', '달아오른 몸에서 짭짤하고 더운 냄새가 피어올랐다.'] },
      { name: '향수·화장품', words: ['시트러스의 산뜻함', '머스크의 묵직함', '파우더의 보송한 향', '꽃 향수의 화사함', '알코올의 알싸한 첫향'], lines: ['스쳐 지나간 자리에 머스크의 묵직한 잔향이 남았다.', '시트러스 향수가 산뜻하게 코를 열었다 금세 옅어졌다.', '파우더의 보송한 향이, 오래 알던 사람처럼 익숙했다.'] },
      { name: '아기·노인', words: ['젖내', '분유 냄새', '포근한 살내', '노인 특유의 마른 냄새', '약 냄새 섞인 살내'], lines: ['아기의 정수리에서 분유와 젖내가 달큰하게 났다.', '할머니의 품에선 마른 풀 같은 노인의 냄새가 났다.', '포근한 살내에 옅은 약 냄새가 섞여, 세월을 짐작케 했다.'] },
    ],
  },
  // ===== 감정 =====
  {
    key: 'nostalgia', label: '그리움·추억', icon: '🕯️', axis: '감정',
    blurb: '후각은 가장 빠르게 과거로 데려가는 감각이다.',
    entries: [
      { name: '어린 시절', words: ['크레파스 냄새', '운동장 흙냄새', '분유 냄새', '할머니 부엌 냄새', '여름 방학의 풀내'], lines: ['크레파스 냄새 하나에, 잊고 있던 교실이 통째로 떠올랐다.', '비 온 운동장 흙냄새는 늘 열 살 무렵으로 데려다 놓았다.', '할머니의 부엌 냄새는 이제 어디에서도 다시 맡을 수 없었다.'] },
      { name: '떠난 사람', words: ['그 사람 옷에 밴 냄새', '베개에 남은 머릿내', '쓰던 향수의 잔향', '함께 먹던 음식 냄새', '비누 향의 기억'], lines: ['옷장을 열자 그 사람의 냄새가 아직 거기 매달려 있었다.', '쓰던 향수의 잔향만 스쳐도 가슴이 먼저 알아챘다.', '함께 먹던 음식 냄새에, 빈자리가 새삼 또렷해졌다.'] },
      { name: '고향·옛집', words: ['아궁이 장작 냄새', '마당 흙냄새', '장독대 된장 냄새', '오래된 마루 냄새', '연탄 냄새'], lines: ['장작 타는 냄새 한 줄기에 고향의 겨울이 되살아났다.', '마루의 오래된 나무 냄새는 발을 디디기도 전에 마중 나왔다.', '장독대에서 풍기던 된장 냄새가 코끝에 선명히 남아 있었다.'] },
    ],
  },
  {
    key: 'comfort', label: '안도·편안', icon: '☕', axis: '감정',
    blurb: '긴장이 풀리는 순간, 냄새가 먼저 우리를 안는다.',
    entries: [
      { name: '집에 돌아왔을 때', words: ['익숙한 살내', '저녁밥 냄새', '세제 향', '따뜻한 공기의 냄새', '현관에 밴 냄새'], lines: ['문을 열자 익숙한 집 냄새가 어깨의 힘을 풀어 주었다.', '현관에서부터 저녁밥 냄새가 마중 나와 하루를 받아 냈다.', '아무 일 없다는 듯한 집의 냄새가, 그날따라 사무치게 고마웠다.'] },
      { name: '따뜻한 음료', words: ['데운 우유 냄새', '코코아의 단내', '갓 우린 차향', '꿀물의 향긋함', '뜨거운 김의 냄새'], lines: ['데운 우유 냄새가 잔에서 올라오자 마음이 둥글어졌다.', '코코아의 단내를 들이쉬는 것만으로 추위가 한 겹 풀렸다.', '갓 우린 차향이 손끝부터 천천히 몸을 데웠다.'] },
      { name: '햇볕·빨래', words: ['햇볕 냄새', '뽀송한 섬유유연제 향', '말린 이불 냄새', '풀 먹인 천 냄새', '바람에 마른 냄새'], lines: ['햇볕에 말린 빨래에서 보송하고 따뜻한 냄새가 났다.', '이불에 밴 햇볕 냄새는 어떤 향수보다 안온했다.', '바람에 마른 천의 냄새가, 별일 없는 오후를 증명했다.'] },
    ],
  },
  {
    key: 'unease', label: '불안·불쾌', icon: '🌫️', axis: '감정',
    blurb: '꺼림칙함은 종종 코가 먼저 알아챈다.',
    entries: [
      { name: '낯선 위협', words: ['쇠비린 냄새', '탄내', '낯선 향수의 위화감', '소독약의 차가움', '가스 냄새'], lines: ['이유 없이 쇠비린 냄새가 코끝을 스치자 등이 곤두섰다.', '낯선 향수 냄새가 방에 남아 있어, 누군가 다녀갔음을 알았다.', '어디선가 옅은 가스 냄새가 났고, 본능이 먼저 멈춰 섰다.'] },
      { name: '부패·상함', words: ['시큼한 군내', '썩은 냄새', '비린 부패 냄새', '곰팡내', '쉰 음식 냄새'], lines: ['냉장고를 열자 시큼하게 쉰 냄새가 먼저 밀려 나왔다.', '어딘가 썩는 냄새가 옅게 깔려, 집안이 자꾸 신경 쓰였다.', '곰팡내가 코를 찌르자, 보지 않아도 어디가 상했는지 알았다.'] },
      { name: '긴장·두려움', words: ['땀에 밴 비린 냄새', '메마른 입의 텁텁함', '식은땀 냄새', '소독약 같은 차가운 냄새', '쇳내 섞인 공기'], lines: ['긴장하자 손바닥에서 식은땀의 비린 냄새가 났다.', '입이 바싹 마르고, 공기에서 쇳내 같은 차가움이 느껴졌다.', '두려움이 차오를수록, 익숙한 냄새조차 낯설게 일그러졌다.'] },
    ],
  },
  {
    key: 'desire', label: '설렘·욕망', icon: '💗', axis: '감정',
    blurb: '끌림은 말보다 먼저 냄새로 다가온다.',
    entries: [
      { name: '가까워진 거리', words: ['은은한 살내', '머리카락 냄새', '향수의 잔향', '데워진 체온의 냄새', '비누 향의 깨끗함'], lines: ['그 사람이 가까이 다가오자 은은한 살내가 코끝을 스쳤다.', '머리카락에서 나는 옅은 향수 냄새에 심장이 한 박자 어긋났다.', '데워진 체온의 냄새가, 어떤 고백보다 분명하게 다가왔다.'] },
      { name: '식욕·갈망', words: ['고기 굽는 냄새', '갓 구운 빵 냄새', '달큰한 디저트 향', '진한 초콜릿 냄새', '기름진 음식 냄새'], lines: ['고기 굽는 냄새가 번지자 빈속이 노골적으로 보챘다.', '갓 구운 빵 냄새에 발이 저절로 가게 앞에 멈춰 섰다.', '진한 초콜릿 냄새가, 참을 이유를 자꾸 지워 버렸다.'] },
    ],
  },
]

const AXES = [
  { key: '전체', label: '전체', icon: '✨' },
  { key: '장소', label: '장소', icon: '📍' },
  { key: '상황', label: '상황', icon: '🎬' },
  { key: '감정', label: '감정', icon: '💭' },
] as const

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

interface ToolProps { payload?: Record<string, unknown> }

export default function ScentRef({ payload }: ToolProps = {}) {
  // 검색어 / 축 필터 / 펼친 섹션 / 무작위 픽 / 복사·안내 표시
  const [query, setQuery] = useState('')
  const [axis, setAxis] = useState<string>('전체')
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [SECTIONS[0].key]: true }))
  const [pickItem, setPickItem] = useState<{ section: Section; entry: ScentEntry } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const linkTimer = useRef<number | null>(null)

  // localStorage 설정 복원(검색·축·펼침 상태)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sry:tool:scent-ref')
      if (raw) {
        const s = JSON.parse(raw) as { query?: string; axis?: string; open?: Record<string, boolean> }
        if (typeof s.query === 'string') setQuery(s.query)
        if (typeof s.axis === 'string') setAxis(s.axis)
        if (s.open && typeof s.open === 'object') setOpen(s.open)
      }
    } catch { /* 손상된 설정 무시 */ }
  }, [])

  // 설정 영속화
  useEffect(() => {
    try {
      localStorage.setItem('sry:tool:scent-ref', JSON.stringify({ query, axis, open }))
    } catch { /* 용량 초과 등 무시 */ }
  }, [query, axis, open])

  // 언마운트 시 타이머 정리(누수 방지)
  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    }
  }, [])

  const flashCopied = (id: string) => {
    setCopied(id)
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { setCopied(null); copyTimer.current = null }, 1400)
  }
  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => { setLinkMsg(null); linkTimer.current = null }, 1800)
  }

  const safeCopy = (text: string, id: string) => {
    try {
      navigator.clipboard?.writeText(text).then(() => flashCopied(id)).catch(() => { /* 권한 거부·미지원 graceful */ })
    } catch { /* 클립보드 미지원 무시 */ }
  }

  // 총 항목/어휘/문장 수(데이터 풍부함 표시)
  const stats = useMemo(() => {
    let entries = 0, words = 0, lines = 0
    for (const s of SECTIONS) {
      entries += s.entries.length
      for (const e of s.entries) { words += e.words.length; lines += e.lines.length }
    }
    return { sections: SECTIONS.length, entries, words, lines }
  }, [])

  // 축 필터 + 검색 적용 결과(섹션별로 일치하는 항목만)
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return SECTIONS
      .filter((s) => axis === '전체' || s.axis === axis)
      .map((s) => {
        if (!q) return { section: s, entries: s.entries }
        const matchSection = s.label.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q)
        const entries = s.entries.filter((e) =>
          matchSection ||
          e.name.toLowerCase().includes(q) ||
          e.words.some((w) => w.toLowerCase().includes(q)) ||
          e.lines.some((l) => l.toLowerCase().includes(q)),
        )
        return { section: s, entries }
      })
      .filter((g) => g.entries.length > 0)
  }, [axis, q])

  const matchCount = useMemo(() => filtered.reduce((n, g) => n + g.entries.length, 0), [filtered])

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  // 검색 중에는 일치한 섹션을 자동으로 펼쳐 보여 준다
  const isOpen = (key: string) => (q ? true : !!open[key])

  // 무작위 — 현재 필터 범위 안에서 항목 하나를 뽑는다
  const pickRandom = () => {
    const pool: { section: Section; entry: ScentEntry }[] = []
    for (const g of filtered) for (const e of g.entries) pool.push({ section: g.section, entry: e })
    if (!pool.length) return
    let next = rand(pool)
    if (pickItem && pool.length > 1 && next.entry.name === pickItem.entry.name) next = rand(pool)
    setPickItem(next)
    setOpen((o) => ({ ...o, [next.section.key]: true }))
  }

  // 한 항목을 텍스트로(복사·연계 공용)
  const entryText = (section: Section, e: ScentEntry) =>
    `[${section.label} · ${e.name}]\n어휘: ${e.words.join(', ')}\n\n` + e.lines.map((l) => `- ${l}`).join('\n')

  // HTML escape(&,<,>) — bodyHtml 안전 생성
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계] 한 항목을 수집함에 담기
  const stashEntry = (section: Section, e: ScentEntry) => {
    addToStash({ kind: 'note', label: `냄새 · ${e.name}`, text: entryText(section, e) })
    flashLink('수집함에 담았습니다')
  }
  // [연계] 한 항목을 스니펫 라이브러리에 저장
  const snippetEntry = (section: Section, e: ScentEntry) => {
    addToLibrary('snippets', { text: entryText(section, e), source: '향·냄새 묘사 사전', tags: ['후각', '냄새묘사', section.label, e.name] })
    flashLink('스니펫으로 저장했습니다')
  }
  // [연계] 한 항목을 프로젝트 자료에 메모로 추가
  const projectEntry = (section: Section, e: ScentEntry) => {
    const lis = e.lines.map((l) => `<li>${esc(l)}</li>`).join('')
    const bodyHtml = `<p><b>어휘</b> · ${esc(e.words.join(', '))}</p><p><b>묘사 문장</b></p><ul>${lis}</ul>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '냄새 묘사',
      title: `${e.name} · 후각 묘사`,
      bodyHtml,
      meta: { 분류: section.label, 기준: section.axis, 출처: '향·냄새 묘사 사전' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chip = (on: boolean): React.CSSProperties => ({ opacity: on ? 1 : 0.6, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        흔히 잊히는 <b>후각</b>을 채우기 위한 사전입니다. <b>장소·상황·감정</b>별 냄새 어휘와, 그 냄새를 살린 묘사 문장 후보를 모았습니다.
      </div>

      {/* 검색 + 축 필터 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="냄새·어휘·문장 검색 (예: 비, 소독약, 그리움)"
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        {query && <button className="minibtn" onClick={() => setQuery('')} title="검색어 지우기">✕</button>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        {AXES.map((a) => (
          <button key={a.key} className="minibtn" onClick={() => setAxis(a.key)} aria-pressed={axis === a.key} style={chip(axis === a.key)}>
            <Emoji e={a.icon} /> {a.label}
          </button>
        ))}
        <button className="btn-primary" onClick={pickRandom} style={{ marginLeft: 'auto' }} title="현재 범위에서 냄새 하나를 무작위로 뽑습니다"><Emoji e="🎲" /> 무작위 냄새</button>
      </div>

      {/* 무작위로 뽑힌 항목 강조 카드 */}
      {pickItem && (
        <div style={{ ...card, borderColor: 'var(--accent)', borderRadius: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}><Emoji e={pickItem.section.icon} /></span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pickItem.section.label}</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pickItem.entry.name}</span>
            <button className="minibtn" onClick={() => setPickItem(null)} title="닫기" style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {pickItem.entry.words.map((w, i) => (
              <span key={i} style={{ fontSize: 12, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{w}</span>
            ))}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
            “{rand(pickItem.entry.lines)}”
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="minibtn" onClick={() => safeCopy(entryText(pickItem.section, pickItem.entry), 'pick')} style={copied === 'pick' ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : undefined}>{copied === 'pick' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={pickRandom}><Emoji e="🎲" /> 다시</button>
          </div>
        </div>
      )}

      {/* 결과 수 */}
      <div style={{ ...hint, flexShrink: 0 }}>
        {q || axis !== '전체'
          ? <>일치 항목 <b style={{ color: 'var(--accent)' }}>{matchCount}</b>개</>
          : <>총 <b style={{ color: 'var(--accent)' }}>{stats.sections}</b>개 분류 · 항목 <b>{stats.entries}</b> · 어휘 <b>{stats.words}</b> · 묘사 문장 <b>{stats.lines}</b></>}
      </div>

      {/* 섹션(펼침/접힘) 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 && (
          <div style={{ ...hint, textAlign: 'center', padding: 20 }}>일치하는 냄새가 없습니다. 다른 말로 검색해 보세요.</div>
        )}
        {filtered.map((g) => {
          const s = g.section
          const opened = isOpen(s.key)
          return (
            <div key={s.key} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => toggle(s.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--panel)', border: 'none', borderBottom: opened ? '1px solid var(--border)' : 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{s.axis}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.entries.length}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{opened ? '▾' : '▸'}</span>
              </button>
              {opened && (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--paper)' }}>
                  <div style={hint}>{s.blurb}</div>
                  {g.entries.map((e) => (
                    <div key={e.name} style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--accent)' }}>{e.name}</span>
                        <button className="minibtn" onClick={() => safeCopy(entryText(s, e), e.name)} title="이 항목 복사" style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', ...(copied === e.name ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : {}) }}>{copied === e.name ? <>✓</> : <Emoji e="📋" />}</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {e.words.map((w, i) => (
                          <span key={i} style={{ fontSize: 12, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{w}</span>
                        ))}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {e.lines.map((l, i) => (
                          <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{l}</li>
                        ))}
                      </ul>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {hasStash() && <button className="linkbtn" onClick={() => stashEntry(s, e)} title="이 냄새 묘사를 수집함에 담습니다"><Emoji e="📎" /> 수집함</button>}
                        <button className="linkbtn" onClick={() => snippetEntry(s, e)} title="이 냄새 묘사를 스니펫 라이브러리에 저장합니다"><Emoji e="✂️" /> 스니펫</button>
                        <button className="linkbtn" onClick={() => projectEntry(s, e)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 냄새 묘사를 프로젝트 자료에 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 도구 연계 — 감각 묘사 팔레트로 이어 가기 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <button className="linkbtn" onClick={() => openToolLinked('sensory-palette')} title="장소별 오감 묘사를 함께 보려면 감각 묘사 팔레트를 엽니다">
          <Emoji e="🌿" /> 감각 묘사 팔레트 열기
        </button>
        {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
      </div>

      <div style={hint}>후각은 기억과 가장 깊이 얽힌 감각입니다. 어휘를 그대로 쓰기보다, 인물이 그 냄새에서 무엇을 떠올리는지로 묘사를 비틀어 보세요.</div>
      <div className="license-note" style={{ ...hint, fontSize: 11 }}>모든 어휘·문장은 직접 작성한 창작 텍스트입니다. 외부 이미지·API·폰트를 사용하지 않습니다.</div>
    </div>
  )
}
