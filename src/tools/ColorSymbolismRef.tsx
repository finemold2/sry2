// 색채 상징 사전 — 색별 심리 효과·문화권별 의미(동/서양)·연상·배색 분위기를 정리한 로컬 레퍼런스.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
// 자작 텍스트 데이터만 사용(백과 베끼기 금지). 제어문자/특수 구분자 없음(일반 문자만).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'color-symbolism-ref',
  name: '색채 상징 사전',
  icon: '🎨',
  group: '분위기·시각',
  intro: '색별 심리·동서양 의미·연상·배색 분위기를 찾아 톤과 묘사에 쓰세요',
  w: 640,
  h: 620,
}

// ---------- 데이터 모델 ----------
interface ColorDef {
  name: string          // 한국어 색 이름
  alias?: string        // 영문/별칭
  hex: string           // 대표 색상값(미리보기용 자작 값)
  psych: string         // 심리 효과
  west: string          // 서양권 의미
  east: string          // 동양권 의미
  assoc: string[]       // 연상 키워드
  describe: string[]    // 묘사용 표현(자작)
  pairs: { with: string; mood: string }[] // 배색 분위기
}
interface CatDef { key: string; label: string; icon: string; colors: ColorDef[] }

// ---------- 색채 사전(자작 데이터, 12계열 60+색) ----------
const CATS: CatDef[] = [
  {
    key: 'red', label: '빨강 계열', icon: '🔴', colors: [
      {
        name: '진홍', alias: 'Crimson', hex: '#C0143C',
        psych: '심박을 끌어올리고 주의를 잡아채는 가장 자극적인 색. 식욕과 충동을 동시에 깨운다.',
        west: '열정과 순교, 희생의 피. 추기경의 옷과 사랑의 카드 위 붉은 하트로 이어진다.',
        east: '경사와 벽사(辟邪)의 색. 혼례·명절의 길함이자 액운을 막는 부적의 빛.',
        assoc: ['피', '불', '심장', '경고등', '연지', '단풍'],
        describe: ['상처 가장자리에서 번지는 진홍', '저무는 해가 구름에 들이부은 핏빛', '입술에 묻은 단 한 점의 붉음'],
        pairs: [{ with: '검정', mood: '치명적·관능적 긴장' }, { with: '금색', mood: '권위와 사치의 무게' }, { with: '회색', mood: '냉정 속의 단 한 점 정념' }],
      },
      {
        name: '주홍', alias: 'Vermilion', hex: '#E2452B',
        psych: '경계심과 활력을 동시에 자극한다. 위험과 축제 사이에서 시선을 붙든다.',
        west: '용기와 전쟁, 위험 신호. 소방차와 정지선의 단호한 외침.',
        east: '단청과 도장(인주)의 색. 사악을 물리치고 생명을 부르는 신성한 붉음.',
        assoc: ['인주', '단청', '용암', '석류', '경보'],
        describe: ['낡은 기둥에 칠해진 단청의 주홍', '도장밥처럼 또렷이 찍힌 결심', '식어가는 화로 속 마지막 잉걸불'],
        pairs: [{ with: '청록', mood: '강렬한 대비·이국적 활기' }, { with: '베이지', mood: '따뜻한 토속·전통의 온기' }, { with: '남색', mood: '축제 깃발의 선명한 대조' }],
      },
      {
        name: '버건디', alias: 'Burgundy', hex: '#6E1226',
        psych: '깊고 무거운 침잠. 성숙한 욕망과 절제된 사치를 동시에 풍긴다.',
        west: '와인과 가을, 귀족적 풍미. 깊은 정념과 세련된 위엄.',
        east: '늙은 술과 진한 단풍의 빛. 무르익어 떨어지기 직전의 농염함.',
        assoc: ['와인', '벨벳', '낙엽', '가죽 장정', '마른 장미'],
        describe: ['잔에 가라앉은 오래된 와인의 버건디', '낡은 가죽 소파에 밴 세월의 진홍', '식은 정념처럼 어둡게 고인 색'],
        pairs: [{ with: '금색', mood: '고전적 호사·서재의 무게' }, { with: '크림', mood: '부드러운 격조·따뜻한 안정' }, { with: '먹빛', mood: '비밀스러운 깊이' }],
      },
      {
        name: '코랄', alias: 'Coral', hex: '#FF7F66',
        psych: '따뜻함과 생기를 부드럽게 전한다. 다정하고 활기차되 공격적이지 않다.',
        west: '청춘과 활력, 바다의 생명. 산호처럼 살아 자라는 온기.',
        east: '복숭아빛 혈색, 건강한 생기. 젊음과 다정함의 살가운 빛.',
        assoc: ['산호', '복숭아', '노을 끝자락', '연어살', '여름'],
        describe: ['뺨에 번진 수줍은 코랄빛', '해질녘 마지막으로 물든 구름 가장자리', '갓 익은 살구의 따뜻한 살결'],
        pairs: [{ with: '청록', mood: '여름 바다·산뜻한 활기' }, { with: '아이보리', mood: '온화한 다정함' }, { with: '회청', mood: '차분한 생기' }],
      },
      {
        name: '장밋빛', alias: 'Rose', hex: '#D24A6E',
        psych: '낭만과 부드러운 열정. 사랑의 설렘과 여린 떨림을 함께 품는다.',
        west: '사랑과 비밀(sub rosa), 아름다움. 가시 돋친 헌신.',
        east: '연정과 화사함, 봄의 정취. 볼을 붉히는 수줍은 정.',
        assoc: ['장미', '연지', '봄볕', '입맞춤', '카네이션'],
        describe: ['창에 비친 노을이 벽을 물들인 장밋빛', '오래 쥐고 있던 꽃잎의 무른 분홍', '고백 직전 달아오른 두 뺨'],
        pairs: [{ with: '연두', mood: '봄정원·싱그러운 낭만' }, { with: '회색', mood: '절제된 우아함' }, { with: '금색', mood: '화려한 로맨스' }],
      },
    ],
  },
  {
    key: 'orange', label: '주황 계열', icon: '🟠', colors: [
      {
        name: '주황', alias: 'Orange', hex: '#F08A24',
        psych: '활기와 사교성을 북돋는다. 식욕을 돋우고 친근감을 높이는 따뜻한 자극.',
        west: '가을과 추수, 즐거움. 핼러윈의 호박과 풍요의 결실.',
        east: '귤과 단풍의 빛, 부와 무르익음. 따뜻한 환대의 색.',
        assoc: ['호박', '귤', '모닥불', '석양', '낙엽'],
        describe: ['모닥불에 비친 얼굴들의 주황 그림자', '잘 익은 감이 가지 끝에 매달린 빛', '저녁 골목을 적시는 가로등 불빛'],
        pairs: [{ with: '남색', mood: '석양과 황혼·따뜻한 대비' }, { with: '갈색', mood: '가을 들판의 풍요' }, { with: '청록', mood: '활기찬 보색 긴장' }],
      },
      {
        name: '호박색', alias: 'Amber', hex: '#D49A33',
        psych: '따뜻한 안정과 향수를 부른다. 시간이 멈춘 듯한 황금빛 정취.',
        west: '보존과 기억, 고대의 빛. 수천 년을 가둔 송진의 황금.',
        east: '꿀과 등불의 빛, 무르익은 시간. 노을 같은 그윽함.',
        assoc: ['꿀', '등불', '위스키', '송진', '저녁 햇살'],
        describe: ['창틈으로 스민 저녁 햇살이 방을 채운 호박빛', '유리잔 속에 갇힌 위스키의 황금', '오래된 책장에 밴 누런 시간'],
        pairs: [{ with: '먹빛', mood: '따뜻한 은신처·실내의 안온' }, { with: '청회색', mood: '향수 어린 저물녘' }, { with: '진초록', mood: '깊은 숲속 등불' }],
      },
      {
        name: '테라코타', alias: 'Terracotta', hex: '#B5603E',
        psych: '대지에 뿌리내린 안정과 소박함. 손때 묻은 따뜻함을 전한다.',
        west: '구운 흙과 지중해, 토속. 햇볕에 익은 벽돌의 정취.',
        east: '질그릇과 황토방, 흙의 정. 투박하나 정겨운 살림의 빛.',
        assoc: ['질그릇', '황토', '벽돌', '사막', '도자기'],
        describe: ['햇볕에 달궈진 황톳길의 테라코타', '오래된 항아리 표면의 거친 붉음', '저문 사막 언덕에 깔린 흙빛'],
        pairs: [{ with: '올리브', mood: '지중해 토속·자연의 조화' }, { with: '크림', mood: '소박한 따뜻함' }, { with: '청록', mood: '흙과 물의 대비' }],
      },
      {
        name: '살구색', alias: 'Apricot', hex: '#F2B27A',
        psych: '부드럽고 다정한 온기. 긴장을 풀고 안심을 부르는 순한 빛.',
        west: '다정함과 보살핌, 이른 아침. 손에 잡히는 소박한 행복.',
        east: '복숭아빛 살결, 건강과 다복. 발그레한 생기의 순함.',
        assoc: ['살구', '아침 햇살', '아기 살결', '크림', '봄'],
        describe: ['아침 커튼 사이로 번진 살구빛', '갓 구운 빵 껍질의 따뜻한 색', '잠든 아이의 발그레한 볼'],
        pairs: [{ with: '하늘색', mood: '맑은 아침·산뜻한 다정' }, { with: '회녹', mood: '편안한 자연' }, { with: '아이보리', mood: '포근한 안정' }],
      },
    ],
  },
  {
    key: 'yellow', label: '노랑 계열', icon: '🟡', colors: [
      {
        name: '노랑', alias: 'Yellow', hex: '#F2D02A',
        psych: '가장 밝고 눈에 잘 띄는 색. 명랑·낙천을 부르지만 과하면 불안과 경고가 된다.',
        west: '햇빛과 지성, 동시에 비겁·배신(유다의 옷). 빛과 경고의 양면.',
        east: '황제의 색, 중앙과 대지. 가장 존귀한 권위의 빛.',
        assoc: ['해', '병아리', '경고 표지', '개나리', '레몬'],
        describe: ['들판을 가득 채운 유채의 노랑', '신호등이 멈칫 깜빡이는 순간의 빛', '창에 부딪힌 봄 햇살의 환함'],
        pairs: [{ with: '검정', mood: '경고·강렬한 시선 집중' }, { with: '남색', mood: '맑은 대비·청량한 활기' }, { with: '회색', mood: '도시적 포인트' }],
      },
      {
        name: '겨자색', alias: 'Mustard', hex: '#C9A227',
        psych: '톤다운된 노랑의 차분한 깊이. 빈티지한 안정과 약간의 우수.',
        west: '레트로와 가을, 흙빛 노랑. 빛바랜 시절의 정취.',
        east: '늦가을 들녘과 누런 곡식. 무르익어 거두는 빛.',
        assoc: ['가을 들판', '오래된 책', '벼', '낡은 외투', '향신료'],
        describe: ['빛바랜 사진처럼 누런 겨자빛 들판', '오래 입어 색이 가라앉은 외투', '저물녘 벼이삭이 머금은 황금'],
        pairs: [{ with: '진초록', mood: '레트로·가을의 깊이' }, { with: '갈색', mood: '흙내 나는 안정' }, { with: '먹빛', mood: '빈티지한 무게' }],
      },
      {
        name: '금색', alias: 'Gold', hex: '#D4AF37',
        psych: '부와 영광을 직관적으로 환기한다. 시선을 끌고 가치를 격상시킨다.',
        west: '신성과 불변의 부, 후광. 변치 않는 영광의 광휘.',
        east: '복과 부귀, 황금빛 길함. 단청과 불상에 입힌 존귀.',
        assoc: ['금괴', '왕관', '후광', '메달', '단청'],
        describe: ['촛불에 어른거리는 금박의 광휘', '오래된 액자 가장자리의 바랜 금', '저무는 해가 강물에 부은 금빛'],
        pairs: [{ with: '진홍', mood: '왕가의 사치·권위' }, { with: '먹빛', mood: '고급스러운 격조' }, { with: '청록', mood: '보석함의 화려함' }],
      },
      {
        name: '크림색', alias: 'Cream', hex: '#F5ECCB',
        psych: '부드럽고 포근한 중립. 긴장을 낮추고 고전적 안정감을 준다.',
        west: '우아한 고전과 순함, 버터빛 안락. 시간이 깃든 따뜻한 흰빛.',
        east: '한지와 누른 무명의 빛, 소박한 정. 가라앉은 흰빛의 온기.',
        assoc: ['한지', '버터', '우유', '낡은 종이', '상아'],
        describe: ['오래된 편지지의 누런 크림빛', '아침 우유 한 잔의 부드러운 흰빛', '한지를 통과한 햇살의 온기'],
        pairs: [{ with: '버건디', mood: '고전적 안정·서재의 격조' }, { with: '회녹', mood: '편안한 자연주의' }, { with: '먹빛', mood: '단정한 대비' }],
      },
    ],
  },
  {
    key: 'green', label: '초록 계열', icon: '🟢', colors: [
      {
        name: '초록', alias: 'Green', hex: '#3FA84B',
        psych: '눈과 마음을 가장 편안하게 하는 색. 안정·균형·회복을 부른다.',
        west: '생명과 자연, 한편 질투(green-eyed)와 미숙. 성장과 부패의 양면.',
        east: '봄과 생기, 청춘. 동방 청룡의 빛이자 푸르른 시작.',
        assoc: ['숲', '새싹', '신호등', '이끼', '들판'],
        describe: ['비 갠 뒤 잎사귀마다 맺힌 초록', '여름 들판을 가득 메운 푸름', '오래 들여다본 숲의 깊은 녹음'],
        pairs: [{ with: '갈색', mood: '숲과 흙·자연의 안정' }, { with: '하양', mood: '청결한 산뜻함' }, { with: '진홍', mood: '크리스마스·강렬한 대비' }],
      },
      {
        name: '에메랄드', alias: 'Emerald', hex: '#1E8C6A',
        psych: '깊고 풍부한 초록의 고급감. 신비와 풍요, 차분한 자신감.',
        west: '재생과 희망, 보석의 부귀. 봄빛 생명의 광택.',
        east: '비취와 옥의 덕, 고결과 평안. 군자의 빛깔.',
        assoc: ['보석', '비취', '깊은 바다', '공작 깃털', '열대 잎'],
        describe: ['깊은 물속에서 흔들리는 에메랄드빛', '햇빛 받은 옥 표면의 매끄러운 광택', '열대 우림 그늘에 고인 짙은 초록'],
        pairs: [{ with: '금색', mood: '보석함·풍요로운 호사' }, { with: '먹빛', mood: '신비로운 깊이' }, { with: '크림', mood: '고급스러운 안정' }],
      },
      {
        name: '올리브', alias: 'Olive', hex: '#7A7B36',
        psych: '자연에 몸을 숨긴 듯한 차분함. 실용적이고 단단한 안정.',
        west: '평화와 화해(올리브 가지), 군용 위장. 견실한 흙빛 초록.',
        east: '쑥과 마른 잎의 빛, 소박한 자연. 산야에 깃든 빛.',
        assoc: ['군복', '올리브나무', '쑥', '마른 풀', '카키'],
        describe: ['저문 산비탈의 마른 풀 같은 올리브빛', '오래된 군용 천에 밴 칙칙한 초록', '햇볕에 바랜 들풀의 무딘 색'],
        pairs: [{ with: '테라코타', mood: '지중해·토속의 조화' }, { with: '크림', mood: '편안한 자연주의' }, { with: '먹빛', mood: '묵직한 견실함' }],
      },
      {
        name: '연두', alias: 'Lime green', hex: '#A8D84B',
        psych: '갓 돋은 생명의 발랄함. 가장 어리고 활기찬 신호.',
        west: '봄과 새출발, 풋풋함. 갓 깨어난 어린 생기.',
        east: '새싹과 어린 잎, 청신함. 막 트인 봄의 기운.',
        assoc: ['새싹', '봄나물', '청포도', '어린잎', '풋사과'],
        describe: ['봄 가지 끝에 막 돋은 연둣빛', '햇살을 통과한 어린잎의 투명한 초록', '갓 깎은 잔디의 싱그러운 냄새 같은 빛'],
        pairs: [{ with: '장밋빛', mood: '봄정원·싱그러운 낭만' }, { with: '하양', mood: '상쾌한 청량' }, { with: '회색', mood: '도시 속 생기' }],
      },
      {
        name: '청록', alias: 'Teal', hex: '#1E8A8A',
        psych: '차분한 균형과 치유. 머리를 식히고 신뢰를 주는 중간 빛.',
        west: '균형과 보호, 바다와 하늘 사이. 신비로운 평온.',
        east: '청자의 빛, 맑고 깊은 물. 정갈한 고요.',
        assoc: ['청자', '얕은 바다', '공작', '오리알', '병원 가운'],
        describe: ['얕은 산호초 위로 비친 청록의 물빛', '오래된 청자 표면의 은은한 광택', '비 갠 새벽 하늘과 바다가 맞닿은 색'],
        pairs: [{ with: '주홍', mood: '이국적·강렬한 보색 활기' }, { with: '금색', mood: '아르데코의 우아함' }, { with: '아이보리', mood: '청량한 안정' }],
      },
    ],
  },
  {
    key: 'blue', label: '파랑 계열', icon: '🔵', colors: [
      {
        name: '파랑', alias: 'Blue', hex: '#2D6CDF',
        psych: '심박을 낮추고 집중과 신뢰를 부른다. 가장 선호되나 차가운 거리감도 있다.',
        west: '평온과 충성, 한편 우울(blue)과 차가움. 하늘과 바다의 무한.',
        east: '맑은 하늘과 깊은 물, 청렴. 선비의 정갈한 빛.',
        assoc: ['하늘', '바다', '청바지', '얼음', '제복'],
        describe: ['한낮 정점에 닿은 하늘의 짙은 파랑', '먼바다가 수평선에서 짙어지는 빛', '차가운 유리창에 어린 겨울 하늘'],
        pairs: [{ with: '하양', mood: '청량·신뢰의 명료함' }, { with: '주황', mood: '하늘과 노을·따뜻한 대비' }, { with: '회색', mood: '도시적 침착함' }],
      },
      {
        name: '하늘색', alias: 'Sky blue', hex: '#7EC4E8',
        psych: '가볍고 시원한 해방감. 긴장을 풀고 트인 느낌을 준다.',
        west: '자유와 평화, 맑은 날. 트인 하늘의 낙천.',
        east: '봄하늘과 옅은 물빛, 청신. 산뜻한 트임.',
        assoc: ['봄하늘', '얕은 개울', '물망초', '여름 셔츠', '구름'],
        describe: ['갓 갠 봄날의 옅은 하늘빛', '얕은 개울 바닥까지 비치는 맑음', '커튼 사이로 들어온 트인 하늘'],
        pairs: [{ with: '살구색', mood: '맑은 아침·다정한 산뜻함' }, { with: '하양', mood: '구름 한 점 없는 청량' }, { with: '레몬', mood: '여름의 발랄함' }],
      },
      {
        name: '남색', alias: 'Navy', hex: '#1B2A55',
        psych: '깊은 신뢰와 권위. 차분하고 절제된 무게를 준다.',
        west: '권위와 격식, 밤바다. 정장과 제복의 신뢰.',
        east: '쪽빛과 깊은 밤, 단정함. 선비의 두루마기 빛.',
        assoc: ['밤바다', '제복', '쪽빛', '잉크', '심해'],
        describe: ['해 떨어진 직후 바다에 내린 남빛', '잉크병 바닥에 고인 짙은 어둠', '쪽으로 물들인 천의 깊은 푸름'],
        pairs: [{ with: '금색', mood: '격조·고전적 권위' }, { with: '주황', mood: '황혼·따뜻한 대조' }, { with: '하양', mood: '단정한 신뢰' }],
      },
      {
        name: '인디고', alias: 'Indigo', hex: '#3B3A8C',
        psych: '깊은 사색과 직관을 부른다. 신비와 권위 사이의 침잠.',
        west: '직관과 신비, 밤하늘 직전. 깊은 영성의 빛.',
        east: '쪽빛 짙음, 밤의 정적. 사색에 잠긴 푸름.',
        assoc: ['밤하늘', '쪽', '제비꽃 그늘', '심해', '잉크'],
        describe: ['별이 돋기 직전 하늘의 인디고', '깊은 물밑으로 가라앉는 푸른 어둠', '쪽빛이 가장 짙어진 천의 색'],
        pairs: [{ with: '은색', mood: '밤하늘·신비로운 정취' }, { with: '진홍', mood: '몽환적 긴장' }, { with: '크림', mood: '차분한 깊이' }],
      },
      {
        name: '청회색', alias: 'Slate blue', hex: '#5A7184',
        psych: '안개 낀 듯한 차분함과 거리감. 우수와 절제된 사색.',
        west: '비 오는 날과 우울, 절제. 잿빛 도는 푸름.',
        east: '먹빛 도는 산수화의 원경. 안개에 잠긴 산.',
        assoc: ['비 오는 날', '먼 산', '안개', '돌담', '겨울 바다'],
        describe: ['안개에 잠겨 윤곽만 남은 먼 산의 청회색', '오래 비를 맞은 돌담의 젖은 빛', '겨울 바다가 하늘과 구분되지 않는 색'],
        pairs: [{ with: '호박색', mood: '향수 어린 저물녘' }, { with: '하양', mood: '서늘한 정갈함' }, { with: '코랄', mood: '차분한 가운데 생기' }],
      },
    ],
  },
  {
    key: 'purple', label: '보라 계열', icon: '🟣', colors: [
      {
        name: '보라', alias: 'Purple', hex: '#7A3FB0',
        psych: '신비와 비범함을 환기한다. 창의와 영성, 약간의 불안한 매혹.',
        west: '왕권과 신비, 귀한 염료의 권위. 사치와 영성의 빛.',
        east: '자색의 존귀, 도가의 신선. 상서로운 기운의 색.',
        assoc: ['왕의 옷', '제비꽃', '황혼', '마법', '포도'],
        describe: ['해가 진 뒤 하늘에 번지는 보랏빛 여운', '제비꽃 그늘에 고인 짙은 색', '마법진에서 피어오르는 신비한 광채'],
        pairs: [{ with: '금색', mood: '왕가의 신비·사치' }, { with: '먹빛', mood: '몽환적 깊이' }, { with: '연두', mood: '비현실적 대비' }],
      },
      {
        name: '라벤더', alias: 'Lavender', hex: '#B9A7DE',
        psych: '마음을 가라앉히는 부드러운 진정. 우아하고 여린 평온.',
        west: '치유와 헌신, 정적. 향기로운 진정의 보랏빛.',
        east: '오동꽃과 옅은 자줏빛, 그윽함. 은은한 정취.',
        assoc: ['라벤더밭', '오동꽃', '비누', '봄 안개', '연보라 황혼'],
        describe: ['저녁 바람에 흔들리는 라벤더밭의 물결', '비누 거품이 머금은 옅은 보랏빛', '봄 안개에 번진 연한 자줏빛 하늘'],
        pairs: [{ with: '회색', mood: '절제된 우아함' }, { with: '크림', mood: '포근한 진정' }, { with: '연두', mood: '봄날의 여림' }],
      },
      {
        name: '자주', alias: 'Magenta', hex: '#C2298A',
        psych: '강렬하고 도발적인 화려함. 시선을 사로잡는 비범한 자기주장.',
        west: '비순응과 화려함, 인공적 강렬함. 도발의 색.',
        east: '진한 자색, 농염한 화사. 짙게 무르익은 빛.',
        assoc: ['네온사인', '자목련', '립스틱', '무대 조명', '진달래'],
        describe: ['밤거리를 적시는 네온의 자줏빛', '활짝 핀 자목련의 농염한 색', '무대 위로 쏟아지는 강렬한 조명'],
        pairs: [{ with: '검정', mood: '도발적·무대적 강렬함' }, { with: '청록', mood: '네온의 이국적 대비' }, { with: '금색', mood: '과시적 화려함' }],
      },
      {
        name: '자수정색', alias: 'Amethyst', hex: '#9966CC',
        psych: '평정과 영성을 부르는 맑은 보랏빛. 차분하면서도 신비롭다.',
        west: '평정과 절제, 보호의 보석. 취하지 않는 맑은 정신.',
        east: '자정(紫晶)의 영묘함, 정갈한 신비. 수정의 맑음.',
        assoc: ['자수정', '포도주잔', '저녁별', '수정구', '제비꽃'],
        describe: ['빛을 받아 속까지 비치는 자수정의 보라', '포도주잔에 비친 저녁의 색', '맑은 결정 속에 갇힌 영롱한 자줏빛'],
        pairs: [{ with: '은색', mood: '신비로운 정갈함' }, { with: '하양', mood: '맑은 평정' }, { with: '인디고', mood: '깊은 사색' }],
      },
    ],
  },
  {
    key: 'pink', label: '분홍 계열', icon: '🩷', colors: [
      {
        name: '분홍', alias: 'Pink', hex: '#F08CB4',
        psych: '다정함과 안심을 부른다. 공격성을 누그러뜨리는 부드러운 빛.',
        west: '사랑과 여성성, 순진. 부드러운 낭만.',
        east: '복사꽃과 연정, 화사함. 발그레한 봄의 정.',
        assoc: ['복사꽃', '솜사탕', '아기', '봄', '리본'],
        describe: ['만개한 복사꽃이 길을 덮은 분홍', '솜사탕처럼 부풀어 오른 노을', '아기 손바닥의 여린 살빛'],
        pairs: [{ with: '하양', mood: '청순·순한 다정' }, { with: '회색', mood: '세련된 부드러움' }, { with: '연두', mood: '봄정원의 산뜻함' }],
      },
      {
        name: '연분홍', alias: 'Blush', hex: '#F7C9D6',
        psych: '가장 여리고 순한 온기. 보호 본능과 안온함을 부른다.',
        west: '수줍음과 순결, 갓난아이. 손에 잡힐 듯 여린 빛.',
        east: '복사빛 살결, 연한 홍조. 발그레한 수줍음.',
        assoc: ['홍조', '벚꽃잎', '진주', '실크', '아침놀'],
        describe: ['뺨에 옅게 번진 연분홍 홍조', '바람에 떨어지는 벚꽃잎 한 장의 색', '아침놀이 구름 끝에 살짝 묻힌 빛'],
        pairs: [{ with: '아이보리', mood: '포근한 청순' }, { with: '회청', mood: '차분한 여림' }, { with: '진홍', mood: '농담의 그러데이션' }],
      },
      {
        name: '진분홍', alias: 'Hot pink', hex: '#E8338A',
        psych: '발랄하고 도발적인 활기. 명랑함과 자기주장을 동시에 외친다.',
        west: '발랄과 반항, 팝의 에너지. 거침없는 명랑.',
        east: '진달래와 연지의 짙음, 화려한 정. 또렷한 화사.',
        assoc: ['진달래', '네온 하트', '풍선껌', '플라밍고', '무대 의상'],
        describe: ['산자락을 물들인 진달래의 진분홍', '풍선껌처럼 톡 튀는 발랄한 색', '플라밍고 깃털의 선명한 분홍'],
        pairs: [{ with: '청록', mood: '발랄한 보색·팝' }, { with: '검정', mood: '도발적 강렬함' }, { with: '하양', mood: '명랑한 청량' }],
      },
    ],
  },
  {
    key: 'brown', label: '갈색 계열', icon: '🟤', colors: [
      {
        name: '갈색', alias: 'Brown', hex: '#7A5230',
        psych: '대지의 안정과 신뢰. 소박하고 견실하나 둔하게 느껴질 수도.',
        west: '대지와 소박, 신뢰. 흙과 나무의 견실함.',
        east: '흙빛과 메주, 살림의 정. 투박한 살림의 빛.',
        assoc: ['흙', '나무껍질', '커피', '가죽', '낙엽'],
        describe: ['비에 젖어 짙어진 흙의 갈색', '오래된 책상 표면의 손때 묻은 나뭇빛', '식어가는 커피잔 바닥의 진한 색'],
        pairs: [{ with: '초록', mood: '숲과 흙·자연의 안정' }, { with: '크림', mood: '따뜻한 소박함' }, { with: '청록', mood: '흙과 물의 대비' }],
      },
      {
        name: '카멜', alias: 'Camel', hex: '#C19A6B',
        psych: '따뜻하고 고급스러운 중립. 절제된 우아와 편안함.',
        west: '클래식과 럭셔리, 사막. 길든 가죽의 품격.',
        east: '누른 무명과 낙타털, 검소한 격조. 가라앉은 따뜻함.',
        assoc: ['낙타', '캐시미어', '사막', '비스킷', '가을 코트'],
        describe: ['오래 입어 길든 카멜 코트의 부드러운 빛', '사막 모래가 햇볕에 익은 황갈색', '갓 구운 비스킷의 노릇한 색'],
        pairs: [{ with: '먹빛', mood: '클래식한 격조' }, { with: '크림', mood: '편안한 우아함' }, { with: '진초록', mood: '가을의 깊이' }],
      },
      {
        name: '초콜릿', alias: 'Chocolate', hex: '#4A2C1A',
        psych: '진하고 묵직한 안정. 달콤한 풍요와 어둑한 깊이.',
        west: '풍요와 탐닉, 진한 단맛. 묵직한 위안.',
        east: '진한 누룽지와 먹빛 흙, 깊은 정. 무르익은 어둠.',
        assoc: ['다크초콜릿', '원두', '흙', '가죽 장정', '에스프레소'],
        describe: ['잘게 부순 다크초콜릿의 진한 갈색', '갓 볶은 원두에서 흐르는 짙은 빛', '비에 젖어 검게 가라앉은 진흙'],
        pairs: [{ with: '금색', mood: '풍요로운 호사' }, { with: '크림', mood: '달콤한 안정' }, { with: '주황', mood: '따뜻한 깊이' }],
      },
      {
        name: '베이지', alias: 'Beige', hex: '#D8C3A5',
        psych: '가장 무던한 중립. 배경에 녹아 긴장을 낮추고 안정시킨다.',
        west: '중립과 자연, 차분함. 시간이 깃든 부드러운 빛.',
        east: '무명과 한지, 검소한 살림. 담백한 바탕.',
        assoc: ['무명천', '모래', '한지', '리넨', '마른 갈대'],
        describe: ['바람에 마른 갈대밭의 베이지빛', '오래 빨아 색이 빠진 무명천', '저문 모래언덕의 부드러운 결'],
        pairs: [{ with: '먹빛', mood: '단정한 미니멀' }, { with: '올리브', mood: '자연주의 안정' }, { with: '진홍', mood: '따뜻한 포인트' }],
      },
    ],
  },
  {
    key: 'achromatic', label: '무채색', icon: '⚫', colors: [
      {
        name: '검정', alias: 'Black', hex: '#1A1A1A',
        psych: '무게와 권위, 깊이를 더한다. 보호색이자 미지의 불안을 함께 부른다.',
        west: '죽음과 애도, 동시에 우아·격식. 끝과 위엄의 양면.',
        east: '북방과 겨울, 현묘(玄)함. 깊은 어둠 속 근원의 빛.',
        assoc: ['밤', '먹', '상복', '연미복', '심연'],
        describe: ['빛 한 점 없는 깊은 동굴의 검정', '먹물이 화선지에 번지는 짙은 어둠', '연미복 자락에 어린 단정한 검음'],
        pairs: [{ with: '금색', mood: '고급스러운 권위' }, { with: '진홍', mood: '치명적 긴장' }, { with: '하양', mood: '극단의 명료한 대비' }],
      },
      {
        name: '하양', alias: 'White', hex: '#F7F7F2',
        psych: '비움과 청결, 시작. 정결하되 비어 있어 차갑거나 공허할 수 있다.',
        west: '순결과 평화, 신부의 빛. 결백과 신성.',
        east: '상복과 소복, 정한(情恨)의 흰빛. 죽음과 정결의 양면.',
        assoc: ['눈', '소복', '백지', '구름', '우유'],
        describe: ['밤새 내려 모든 것을 덮은 눈의 하양', '아무것도 적히지 않은 백지의 막막함', '햇빛에 바랜 광목천의 정갈함'],
        pairs: [{ with: '검정', mood: '극명한 대비·단호함' }, { with: '하늘색', mood: '청량한 트임' }, { with: '연분홍', mood: '청순한 부드러움' }],
      },
      {
        name: '회색', alias: 'Gray', hex: '#8A8A8E',
        psych: '중립과 균형, 동시에 모호함과 무기력. 결정하지 않는 어중간함.',
        west: '중립과 도시, 우울. 흑백 사이의 타협.',
        east: '잿빛과 안개, 무상. 흐려진 경계의 빛.',
        assoc: ['안개', '콘크리트', '재', '비둘기', '구름 낀 하늘'],
        describe: ['종일 흐려 빛이 없는 회색 하늘', '비에 젖은 콘크리트 벽의 음울한 빛', '타고 남은 재가 식어버린 색'],
        pairs: [{ with: '진홍', mood: '냉정 속 한 점 정념' }, { with: '연두', mood: '도시 속 생기' }, { with: '하양', mood: '미니멀한 정갈함' }],
      },
      {
        name: '은색', alias: 'Silver', hex: '#B8BCC2',
        psych: '차갑고 세련된 광택. 미래적이고 직관적인 인상.',
        west: '달과 직관, 이차적 영광. 차가운 우아.',
        east: '은장도와 거울, 정결. 달빛 같은 차가운 빛.',
        assoc: ['달', '거울', '금속', '서리', '칼날'],
        describe: ['차갑게 빛나는 칼날의 은빛', '서리 내린 새벽 유리창의 광택', '달빛이 물 위에 깔아놓은 길'],
        pairs: [{ with: '인디고', mood: '밤하늘·미래적 신비' }, { with: '검정', mood: '세련된 메탈릭' }, { with: '하양', mood: '차가운 청결' }],
      },
      {
        name: '먹빛', alias: 'Charcoal', hex: '#36383C',
        psych: '검정보다 부드러운 깊이. 진중하고 차분한 무게.',
        west: '진중함과 절제, 현대적 무게. 부드러운 어둠.',
        east: '먹과 벼루, 문인의 정취. 농담을 머금은 검음.',
        assoc: ['먹', '숯', '비구름', '흑연', '겨울 산'],
        describe: ['벼루에 갈린 먹이 머금은 부드러운 검음', '연필심이 종이에 남긴 흑연 빛', '비 오기 직전 무겁게 내려앉은 하늘'],
        pairs: [{ with: '호박색', mood: '따뜻한 은신처' }, { with: '크림', mood: '단정한 대비' }, { with: '금색', mood: '격조 있는 무게' }],
      },
    ],
  },
  {
    key: 'special', label: '특수·복합', icon: '✨', colors: [
      {
        name: '청자색', alias: 'Celadon', hex: '#A8C3A0',
        psych: '맑고 차분한 회녹빛. 정갈한 고요와 절제된 우아.',
        west: '도자기빛 평온, 절제. 부드러운 회녹.',
        east: '고려청자의 비색(翡色), 청아함. 맑은 비취빛.',
        assoc: ['청자', '연잎', '이끼 낀 돌', '안개 낀 산', '비 갠 하늘'],
        describe: ['비 갠 뒤 청자 표면에 어린 비색', '이끼가 곱게 앉은 오래된 돌의 빛', '연못 위로 펼쳐진 연잎의 회녹'],
        pairs: [{ with: '크림', mood: '정갈한 고요' }, { with: '먹빛', mood: '문인화의 격조' }, { with: '호박색', mood: '차분한 온기' }],
      },
      {
        name: '진주색', alias: 'Pearl', hex: '#F0EBE0',
        psych: '빛에 따라 어른거리는 은은한 광채. 우아하고 신비로운 부드러움.',
        west: '순결과 지혜, 인고의 결정. 상처가 빚은 광택.',
        east: '진주와 조개의 영롱, 고귀함. 은은히 어리는 빛.',
        assoc: ['진주', '조개 안쪽', '안개', '실크', '달무리'],
        describe: ['빛의 각도마다 색이 바뀌는 진주의 광택', '조개껍질 안쪽에 어린 무지갯빛', '달무리가 번진 듯 부연 흰빛'],
        pairs: [{ with: '회색', mood: '세련된 우아' }, { with: '연분홍', mood: '청초한 부드러움' }, { with: '은색', mood: '몽환적 광택' }],
      },
      {
        name: '구릿빛', alias: 'Copper', hex: '#B06A3C',
        psych: '따뜻한 금속 광택. 빈티지한 풍미와 견고한 온기.',
        west: '산업과 빈티지, 따뜻한 금속. 녹슬어 가는 정취.',
        east: '구리솥과 동거울, 오랜 살림. 손때 묻은 금속의 정.',
        assoc: ['구리솥', '녹', '가을 머리칼', '낡은 동전', '단풍'],
        describe: ['오래되어 푸르게 녹슬기 시작한 구릿빛', '햇볕에 빛나는 동전의 따뜻한 광택', '가을볕에 물든 머리칼의 적갈색'],
        pairs: [{ with: '청록', mood: '녹과 청동의 대비' }, { with: '먹빛', mood: '빈티지한 무게' }, { with: '크림', mood: '따뜻한 레트로' }],
      },
      {
        name: '와인색', alias: 'Maroon', hex: '#5C1A2B',
        psych: '깊고 어두운 붉음. 비밀스러운 정념과 묵직한 격조.',
        west: '깊은 정념과 비극, 가을. 어두운 사치.',
        east: '오래된 술과 마른 핏빛, 농염. 가라앉은 붉음.',
        assoc: ['오래된 와인', '마른 장미', '벨벳 커튼', '가죽 의자', '저녁 노을 끝'],
        describe: ['두꺼운 벨벳 커튼이 드리운 와인빛 그늘', '마른 장미 꽃잎의 거뭇한 붉음', '잔 바닥에 남은 와인 한 모금의 색'],
        pairs: [{ with: '금색', mood: '비밀스러운 호사' }, { with: '먹빛', mood: '어두운 깊이' }, { with: '크림', mood: '농담의 안정' }],
      },
      {
        name: '쪽빛', alias: 'Cobalt', hex: '#1E50C8',
        psych: '선명하고 깊은 파랑. 강렬한 신뢰와 차가운 결단.',
        west: '도자기 안료와 한밤, 선명한 권위. 단단한 파랑.',
        east: '청화백자의 쪽빛, 정갈한 기품. 또렷한 푸름.',
        assoc: ['청화백자', '한밤 바다', '쪽물', '잉크병', '겨울 하늘'],
        describe: ['청화백자에 그려진 선명한 쪽빛 무늬', '잉크병을 기울일 때 흐르는 짙은 파랑', '겨울 정오 하늘의 단단한 푸름'],
        pairs: [{ with: '하양', mood: '청화백자의 정갈함' }, { with: '금색', mood: '강렬한 격조' }, { with: '주홍', mood: '선명한 보색 긴장' }],
      },
    ],
  },
]

const LS = 'sry:tool:color-symbolism-ref:'
const ALL_KEY = '__all__'

type Flat = { cat: CatDef; color: ColorDef }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.colors.map((color) => ({ cat: c, color })))

// 한 색의 모든 텍스트를 검색 대상으로 합친다.
function haystack(color: ColorDef): string {
  return [
    color.name, color.alias || '', color.psych, color.west, color.east,
    color.assoc.join(' '), color.describe.join(' '),
    color.pairs.map((p) => p.with + ' ' + p.mood).join(' '),
  ].join(' ').toLowerCase()
}

// 복사·메모용 일반 텍스트(특수 구분자 없이 줄바꿈만).
function colorToText(c: ColorDef): string {
  return [
    c.name + (c.alias ? ' (' + c.alias + ')' : ''),
    '심리: ' + c.psych,
    '서양: ' + c.west,
    '동양: ' + c.east,
    '연상: ' + c.assoc.join(', '),
    '묘사: ' + c.describe.join(' / '),
    '배색: ' + c.pairs.map((p) => c.name + '+' + p.with + ' = ' + p.mood).join(' / '),
  ].join('\n')
}

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function colorToHtml(c: ColorDef): string {
  return [
    '<p><b>' + escapeHtml(c.name) + (c.alias ? ' (' + escapeHtml(c.alias) + ')' : '') + '</b></p>',
    '<p><b>심리</b> ' + escapeHtml(c.psych) + '</p>',
    '<p><b>서양</b> ' + escapeHtml(c.west) + '</p>',
    '<p><b>동양</b> ' + escapeHtml(c.east) + '</p>',
    '<p><b>연상</b> ' + escapeHtml(c.assoc.join(', ')) + '</p>',
    '<p><b>묘사</b><br>' + c.describe.map((d) => escapeHtml(d)).join('<br>') + '</p>',
    '<p><b>배색 분위기</b></p>',
    '<ul>' + c.pairs.map((p) => '<li>' + escapeHtml(c.name + ' + ' + p.with) + ' : ' + escapeHtml(p.mood) + '</li>').join('') + '</ul>',
  ].join('')
}

export default function ColorSymbolismRef({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 색 카드 키(catKey::name) 집합
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  const key = (catKey: string, name: string) => catKey + '::' + name

  // payload.color / payload.name 으로 특정 색을 바로 펼칠 수 있게(연계 진입)
  useEffect(() => {
    const want = (payload?.color ?? payload?.name) as string | undefined
    if (!want) return
    const f = flatAll().find((x) => x.color.name === want || x.color.alias === want)
    if (f) {
      setCat(ALL_KEY)
      setOpen((p) => ({ ...p, [key(f.cat.key, f.color.name)]: true }))
      setRandom(f)
    }
  }, [payload])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 보류 중인 타이머 모두 제거
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.colors.length, 0), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? flatAll() : flatAll().filter((x) => x.cat.key === cat)
    if (onlyFav) base = base.filter((x) => favs[key(x.cat.key, x.color.name)])
    if (q) base = base.filter((x) => haystack(x.color).includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const setTimer = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== t)
      fn()
    }, ms)
    timers.current.push(t)
  }, [])

  const flash = useCallback((id: string) => {
    setCopiedKey(id)
    setTimer(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
  }, [setTimer])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimer(() => setToast((t) => (t === msg ? null : t)), 2200)
  }, [setTimer])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => flash(id)).catch(() => { /* graceful */ })
    }
  }, [flash])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY ? flatAll() : flatAll().filter((x) => x.cat.key === cat)
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.color.name === prev.color.name) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 무작위로 뽑은 색은 자동으로 펼친다
      setOpen((p) => ({ ...p, [key(pick.cat.key, pick.color.name)]: true }))
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setOpen((p) => ({ ...p, [k]: !p[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  // ---------- 연계 ----------
  const stashColor = (c: ColorDef) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: c.name + ' 색채 상징', text: colorToText(c) })
    showToast('수집함에 ‘' + c.name + '’ 색채 메모를 담았습니다.')
  }
  const projectColor = (c: ColorDef) => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '색채·톤',
      title: c.name + ' 색채 상징',
      bodyHtml: colorToHtml(c),
    })
    if (id) showToast('프로젝트 자료 〈색채·톤〉에 ‘' + c.name + '’을(를) 추가했습니다.')
  }
  const snippetDescribe = (c: ColorDef) => {
    // 가장 쓸모 있는 묘사 한 줄을 스니펫 라이브러리에 저장
    const line = c.describe[Math.floor(Math.random() * c.describe.length)]
    addToLibrary('snippets', { text: line, tags: ['색채', c.name] })
    showToast('스니펫에 묘사 한 줄을 저장했습니다: ' + line)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const inputStyle: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const swatch = (hex: string, size = 18): React.CSSProperties => ({ width: size, height: size, borderRadius: 5, background: hex, border: '1px solid var(--border)', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' })
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginRight: 6 }
  const fieldRow: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, margin: '4px 0' }

  const renderColorBody = (c: ColorDef) => (
    <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
      <div style={fieldRow}><span style={fieldLabel}>심리</span>{c.psych}</div>
      <div style={fieldRow}><span style={fieldLabel}>서양</span>{c.west}</div>
      <div style={fieldRow}><span style={fieldLabel}>동양</span>{c.east}</div>
      <div style={fieldRow}>
        <span style={fieldLabel}>연상</span>
        {c.assoc.map((a, i) => (
          <span key={i} style={{ display: 'inline-block', fontSize: 11.5, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px', margin: '0 4px 4px 0' }}>{a}</span>
        ))}
      </div>
      <div style={{ ...fieldRow, marginTop: 6 }}><span style={fieldLabel}>묘사</span></div>
      <ul style={{ margin: '2px 0 6px', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
        {c.describe.map((d, i) => (
          <li key={i}>
            {d}
            <button className="minibtn" style={{ marginLeft: 6, padding: '0 6px', fontSize: 11 }} onClick={() => copy(d, c.name + ':desc:' + i)}>
              {copiedKey === c.name + ':desc:' + i ? '✓' : '복사'}
            </button>
          </li>
        ))}
      </ul>
      <div style={{ ...fieldRow, marginTop: 6 }}><span style={fieldLabel}>배색 분위기</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
        {c.pairs.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={swatch(c.hex, 14)} />
            <span style={{ color: 'var(--muted)' }}>+</span>
            <span>{p.with}</span>
            <span style={{ color: 'var(--muted)' }}>→</span>
            <span style={{ fontWeight: 600 }}>{p.mood}</span>
          </div>
        ))}
      </div>

      {/* 동작 + 연계 버튼 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="minibtn" onClick={() => copy(colorToText(c), c.name + ':all')}>
          {copiedKey === c.name + ':all' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
        </button>
        <button className="linkbtn" onClick={() => stashColor(c)} disabled={!hasStash()} title={hasStash() ? '이 색의 상징 메모를 수집함에 담기' : '수집함을 사용할 수 없습니다'}>
          <Emoji e="📎" /> 수집함
        </button>
        <button className="linkbtn" onClick={() => projectColor(c)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈색채·톤〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => snippetDescribe(c)} title="이 색의 묘사 한 줄을 스니펫 라이브러리에 저장">
          <Emoji e="✂" /> 스니펫 저장
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('color-mood-palette', { seed: c.hex })} title="이 색에서 출발하는 무작위 배색 팔레트 만들기">
          <Emoji e="🎨" /> 색 분위기 팔레트 열기
        </button>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        색별 <b>심리 효과</b>·<b>동/서양 문화권 의미</b>·<b>연상</b>·<b>배색 분위기</b>를 모은 사전입니다(총 <b>{total}색</b>, {CATS.length}계열). 검색하거나 무작위로 뽑아 톤·상징·묘사에 쓰세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="색 이름·의미·연상으로 검색 (예: 죽음, 신뢰, 노을, 권위)"
        style={inputStyle}
      />

      {/* 카테고리(계열) 펼침/필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 색 뽑기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="minibtn" onClick={() => setOpen({})} title="모든 카드 접기"><Emoji e="📁" /> 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}색 표시</span>
      </div>

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={swatch(random.color.hex, 28)} />
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{random.color.name}</span>
            {random.color.alias && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.color.alias}</span>}
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{random.color.hex}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 8, color: 'var(--text)' }}>{random.color.psych}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="minibtn" onClick={() => copy(colorToText(random.color), 'rand:all')}>
              {copiedKey === 'rand:all' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
            </button>
            <button className="linkbtn" onClick={() => stashColor(random.color)} disabled={!hasStash()}><Emoji e="📎" /> 수집함</button>
            <button className="linkbtn" onClick={() => projectColor(random.color)} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => snippetDescribe(random.color)}><Emoji e="✂" /> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--ok, var(--accent))', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 색이 없습니다. 카드의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, color }) => {
            const k = key(c.key, color.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, color.name)}>
                  <span style={swatch(color.hex, 22)} />
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{color.name}</span>
                  {color.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{color.alias}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, color.name) }}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {!isOpen && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color.psych}</div>}
                {isOpen && renderColorBody(color)}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>색은 정답이 아니라 출발점입니다. 문화권에 따라 뒤집히는 의미를 알고 톤·상징·묘사에 의도적으로 비틀어 써 보세요.</div>
    </div>
  )
}
