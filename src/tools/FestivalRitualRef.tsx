// 축제·의례·통과의례 사전 — 세시풍속·종교의례·관혼상제·성인식 등의 절차·상징·금기를
// 자작 텍스트로 정리한 로컬 레퍼런스. "그 자리에서 무엇을 하고, 무엇이 금기인가"를 빠르게 찾아
// 장면의 분위기·갈등·전환점(통과의례) 소재로 심는다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요.
// 데이터는 백과를 베끼지 않고 일반 상식을 직접 요약·표현한 자작 데이터다(고증은 작품 톤에 맞게 조정 권장).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'festival-ritual-ref', name: '축제·의례 사전', icon: '🎏', group: '리서치·자료', intro: '세시풍속·종교의례·관혼상제 등의 절차·상징·금기를 찾아 장면·갈등 소재로', w: 680, h: 620 }

// ---------- 데이터 타입 ----------
interface Item {
  name: string          // 항목 이름(절차/상징/금기/풍습)
  kind: 'step' | 'symbol' | 'taboo' | 'lore'  // 절차·순서 / 상징·의미 / 금기·삼감 / 풀이·배경
  body: string          // 한 줄 핵심 설명(자작)
  tags?: string[]       // 검색 보조 태그
}
interface Event {
  key: string
  label: string
  icon: string
  when?: string         // 시기/계기 표기
  intro: string         // 한 줄 소개
  items: Item[]
}

const KIND_LABEL: Record<Item['kind'], { label: string; icon: string; color: string }> = {
  step: { label: '절차·순서', icon: '🪜', color: 'var(--accent)' },
  symbol: { label: '상징·의미', icon: '🔆', color: 'var(--ok)' },
  taboo: { label: '금기·삼감', icon: '⛔', color: '#e06c6c' },
  lore: { label: '풀이·배경', icon: '📖', color: 'var(--muted)' },
}

// ===================== 자작 데이터: 축제·의례·통과의례 =====================
const EVENTS: Event[] = [
  {
    key: 'newyear', label: '설·새해', icon: '🎍', when: '음력 정월 초하루',
    intro: '한 해의 출발선. 조상께 절하고 어른께 세배하며, 첫날의 기운으로 일년의 길흉을 점친다.',
    items: [
      { kind: 'step', body: '아침 일찍 차례상을 차려 조상께 차례를 올린 뒤, 집안 어른께 차례로 세배를 드린다.', name: '차례와 세배', tags: ['차례', '세배', '조상'] },
      { kind: 'step', body: '세배를 받은 어른은 덕담을 건네고 아이들에게 세뱃돈을 준다.', name: '덕담과 세뱃돈', tags: ['덕담', '세뱃돈'] },
      { kind: 'symbol', body: '흰 떡국 한 그릇을 먹어야 비로소 나이 한 살을 더 먹는다고 여겼다. 긴 가래떡은 장수를, 둥근 떡은 새 출발을 뜻한다.', name: '떡국 한 그릇=한 살', tags: ['떡국', '나이', '장수'] },
      { kind: 'symbol', body: '새해 첫 꿈(정초 꿈)으로 한 해의 운을 점치고, 길몽은 함부로 말하지 않아야 이뤄진다고 믿었다.', name: '정초 꿈점', tags: ['꿈', '길몽', '점'] },
      { kind: 'lore', body: '설빔(새 옷)으로 갈아입어 묵은 때를 벗고, 복조리를 사 걸어 한 해의 복을 끌어 담는다.', name: '설빔과 복조리', tags: ['설빔', '복조리', '복'] },
      { kind: 'taboo', body: '설날 아침에 빗자루로 쓸거나 물·쓰레기를 밖에 버리면 들어온 복까지 쓸려 나간다 하여 삼갔다.', name: '청소·물 버리기 삼감', tags: ['청소', '복', '금기'] },
      { kind: 'taboo', body: '정초에 칼·가위로 무언가를 자르면 그 해의 인연·재물이 끊긴다 하여 꺼렸다.', name: '날붙이 사용 삼감', tags: ['칼', '가위', '끊김'] },
      { kind: 'lore', body: '윷놀이·널뛰기·연날리기로 액을 날리고, 연을 멀리 날려 보내 한 해의 액운을 함께 떠나보냈다.', name: '윷·널뛰기·연날리기', tags: ['윷', '널뛰기', '연'] },
    ],
  },
  {
    key: 'daeboreum', label: '정월 대보름', icon: '🌕', when: '음력 1월 15일',
    intro: '첫 보름달이 뜨는 밤. 한 해의 풍년과 건강을 빌고, 달을 보며 소원을 외친다.',
    items: [
      { kind: 'step', body: '아침에 일어나 부럼(호두·땅콩 등)을 깨물어 한 해 부스럼을 막고 이를 튼튼히 한다.', name: '부럼 깨기', tags: ['부럼', '호두', '치아'] },
      { kind: 'step', body: '아침 일찍 만나는 이의 이름을 불러 “내 더위 사가라”며 한 해의 더위를 미리 판다(더위팔기).', name: '더위팔기', tags: ['더위', '놀이'] },
      { kind: 'symbol', body: '오곡밥과 묵은 나물(진채)을 먹어 한 해 건강을 빌고, 귀밝이술 한 잔으로 귓병 없이 좋은 소식만 듣길 빈다.', name: '오곡밥·귀밝이술', tags: ['오곡밥', '나물', '귀밝이술'] },
      { kind: 'step', body: '달이 떠오르면 달맞이를 하며 절하고, 달빛의 빛깔로 그 해 풍흉을 점쳤다.', name: '달맞이와 달점', tags: ['달', '소원', '풍흉'] },
      { kind: 'lore', body: '들판에 불을 놓아 해충을 없애고 풀을 살찌우는 쥐불놀이로 한 해 농사의 액을 태운다.', name: '쥐불놀이', tags: ['쥐불', '불', '농사'] },
      { kind: 'taboo', body: '이 날 개에게 밥을 주면 개가 마른다 하여 굶기는 풍속(개보름쇠기)이 있었다.', name: '개에게 밥 안 주기', tags: ['개', '풍속'] },
      { kind: 'symbol', body: '다리밟기(답교)로 한 해 다리가 튼튼해진다 믿고, 자기 나이만큼 다리를 건넜다.', name: '다리밟기', tags: ['다리', '건강'] },
    ],
  },
  {
    key: 'dano', label: '단오', icon: '🌾', when: '음력 5월 5일',
    intro: '양기가 가장 성한 날. 창포물에 머리를 감고 그네·씨름으로 활력을 겨룬다.',
    items: [
      { kind: 'step', body: '여인들은 창포 삶은 물에 머리를 감고, 창포 뿌리를 깎아 비녀로 꽂아 액을 막았다.', name: '창포물에 머리 감기', tags: ['창포', '머리', '액막이'] },
      { kind: 'symbol', body: '높이 매단 그네를 뛰며 여인들이 하늘을 향해 솟아오르는 단오 그네는 해방·생명력의 상징으로 읽혔다.', name: '단오 그네뛰기', tags: ['그네', '여인', '생명력'] },
      { kind: 'symbol', body: '장사들이 모래판에서 씨름으로 힘을 겨루고, 이긴 이에게 황소를 상으로 주기도 했다.', name: '씨름과 황소상', tags: ['씨름', '힘', '황소'] },
      { kind: 'lore', body: '쑥·익모초를 뜯어 약으로 쓰고, 부적·쑥호랑이를 문에 걸어 잡귀와 병을 물리쳤다.', name: '쑥·부적 액막이', tags: ['쑥', '부적', '병'] },
      { kind: 'symbol', body: '임금이 신하에게 부채를 하사하던 단오선처럼, 더위를 앞두고 부채를 주고받는 풍속이 있었다.', name: '단오 부채(단오선)', tags: ['부채', '더위', '선물'] },
      { kind: 'taboo', body: '양기가 극에 달해 음양이 뒤집힌다 하여, 이 날 함부로 먼 길을 떠나거나 큰일을 벌이는 것을 꺼리기도 했다.', name: '큰일·원행 삼감', tags: ['양기', '원행', '금기'] },
    ],
  },
  {
    key: 'chuseok', label: '추석·한가위', icon: '🌝', when: '음력 8월 15일',
    intro: '가을걷이의 감사. 햇곡식으로 차례를 올리고 둥근 달 아래 강강술래로 풍요를 노래한다.',
    items: [
      { kind: 'step', body: '햇곡식·햇과일로 차례상을 차려 조상께 추수를 감사하고, 성묘하여 무덤의 풀을 베어 정돈한다(벌초).', name: '차례와 벌초·성묘', tags: ['차례', '성묘', '벌초'] },
      { kind: 'symbol', body: '반달 모양 송편을 빚되 “예쁘게 빚으면 예쁜 자식을 낳는다”는 말로 정성을 들였다. 솔잎을 깔아 향을 입힌다.', name: '송편 빚기', tags: ['송편', '반달', '자식'] },
      { kind: 'symbol', body: '둥근 보름달은 가득 찬 풍요와 가족의 화합을 뜻해, 달을 보며 소원을 빌었다.', name: '한가위 보름달', tags: ['달', '풍요', '화합'] },
      { kind: 'lore', body: '여인들이 손을 맞잡고 둥근 원을 그리며 강강술래를 돌아, 보름달과 풍요의 원을 몸으로 그렸다.', name: '강강술래', tags: ['강강술래', '원', '풍요'] },
      { kind: 'lore', body: '“더도 말고 덜도 말고 한가위만 같아라”는 말처럼, 가장 넉넉한 시절로 여겨졌다.', name: '한가위만 같아라', tags: ['풍요', '속담'] },
      { kind: 'step', body: '소·말에게도 햇곡으로 만든 음식을 먹이고 하루 쉬게 하여, 한 해 함께한 노고를 위로했다.', name: '가축 위로', tags: ['소', '노고', '위로'] },
    ],
  },
  {
    key: 'dongji', label: '동지', icon: '🥣', when: '양력 12월 22일경(아세)',
    intro: '밤이 가장 긴 날, 다시 해가 길어지기 시작하는 작은 설. 붉은 팥죽으로 잡귀를 쫓는다.',
    items: [
      { kind: 'symbol', body: '붉은 팥은 음기·잡귀를 물리치는 색이라, 팥죽을 쑤어 먹고 문·벽에 뿌려 액을 막았다.', name: '붉은 팥의 벽사', tags: ['팥', '붉은색', '잡귀'] },
      { kind: 'step', body: '팥죽에 자기 나이만큼 새알심(옹심이)을 넣어 먹어야 한 살을 더 먹는다고 여겼다(작은설).', name: '새알심과 나이', tags: ['새알심', '나이', '작은설'] },
      { kind: 'lore', body: '“동지가 지나면 해가 노루 꼬리만큼씩 길어진다”며, 어둠의 정점에서 빛의 회복을 기렸다.', name: '해가 길어지는 날', tags: ['해', '빛', '회복'] },
      { kind: 'lore', body: '관청에서 새해 달력을 나누어 주어, 동지를 새 절기의 시작으로 삼았다.', name: '달력 나눔', tags: ['달력', '절기'] },
      { kind: 'taboo', body: '동지가 음력 초순에 드는 ‘애동지’에는 아이에게 탈이 난다 하여 팥죽 대신 팥떡을 해 먹기도 했다.', name: '애동지엔 팥떡', tags: ['애동지', '팥떡', '아이'] },
    ],
  },
  {
    key: 'baekil', label: '백일·돌(出生儀禮)', icon: '🎂', when: '출생 100일·첫 생일',
    intro: '갓난아이가 험한 고비를 넘긴 첫 매듭. 백일과 돌로 무사한 성장을 축하하고 미래를 점친다.',
    items: [
      { kind: 'symbol', body: '백일에는 흰무리(백설기)를 백 집에 나누면 아이가 백 살까지 산다 하여 떡을 이웃에 돌렸다.', name: '백일 백설기 나눔', tags: ['백일', '백설기', '장수'] },
      { kind: 'symbol', body: '수수팥떡(붉은 팥고물)은 아이에게 드는 잡귀·액을 막아 준다 하여 돌상에 빠지지 않았다.', name: '수수팥떡 액막이', tags: ['수수팥떡', '액막이', '돌'] },
      { kind: 'step', body: '돌상에 책·붓·실·돈·활(또는 자) 등을 늘어놓고 아이가 먼저 집는 것으로 장래를 점쳤다(돌잡이).', name: '돌잡이', tags: ['돌잡이', '점', '장래'] },
      { kind: 'lore', body: '실은 장수, 책·붓은 학문, 돈·쌀은 부, 활·자는 무관·재주를 상징해 집는 물건마다 뜻을 풀이했다.', name: '돌잡이 물건의 뜻', tags: ['실', '책', '돈', '활'] },
      { kind: 'step', body: '아이에게 색동저고리·돌띠를 입히고, 길게 늘인 돌띠는 장수를 비는 뜻을 담았다.', name: '색동옷과 돌띠', tags: ['색동', '돌띠', '장수'] },
      { kind: 'taboo', body: '예부터 영아 사망이 잦아, 백일 전에는 아이를 함부로 밖에 데리고 나가거나 자랑하지 않는 조심이 있었다.', name: '백일 전 조심', tags: ['백일', '조심', '아이'] },
    ],
  },
  {
    key: 'gwanrye', label: '관례·성인식', icon: '🎓', when: '성년에 이르는 통과의례',
    intro: '아이가 어른으로 건너가는 문턱. 머리를 올리고 새 이름을 받아 사회의 일원이 된다.',
    items: [
      { kind: 'step', body: '남자는 땋은 머리를 올려 상투를 틀고 갓을 씌우며(관례), 여자는 머리를 올려 비녀를 꽂았다(계례).', name: '상투·비녀 올리기', tags: ['관례', '계례', '상투', '비녀'] },
      { kind: 'symbol', body: '성인이 된 이에게 본이름 외에 ‘자(字)’를 지어 주어, 어른들끼리는 이름 대신 자를 불러 예우했다.', name: '자(字)를 받음', tags: ['자', '이름', '예우'] },
      { kind: 'step', body: '큰손님(빈)을 모셔 의관을 갖춰 입히고 술을 내려, 어른의 책임과 도리를 일러 주었다.', name: '초례·훈계', tags: ['초례', '술', '훈계'] },
      { kind: 'lore', body: '관례를 치른 뒤에야 혼인할 자격이 생기고, 어른 대접을 받으며 호칭·말투도 달라졌다.', name: '혼인 자격과 대우', tags: ['혼인', '자격', '대우'] },
      { kind: 'symbol', body: '여러 문화권의 성인식(사냥·고행·문신·홀로 지내기 등)은 ‘옛 자아의 죽음과 새 자아의 탄생’을 상징한다.', name: '죽음과 재탄생의 상징', tags: ['성인식', '재탄생', '문화'] },
      { kind: 'taboo', body: '의례를 마치기 전 아이처럼 굴거나, 받은 자(字)를 함부로 손아랫사람이 부르는 것은 결례로 여겨졌다.', name: '자를 함부로 부름', tags: ['자', '결례'] },
    ],
  },
  {
    key: 'honrye', label: '혼례·결혼', icon: '💒', when: '두 집안이 맺어지는 의례',
    intro: '남녀가 한 가정을 이루는 큰 의례. 절차마다 약속과 길흉의 상징이 촘촘히 박혀 있다.',
    items: [
      { kind: 'step', body: '혼담→사주(사주단자 보냄)→택일→납폐(함 보냄)→대례(초례·교배례)의 순으로 절차가 이어졌다.', name: '혼례 절차의 순서', tags: ['사주', '택일', '납폐', '대례'] },
      { kind: 'symbol', body: '신랑집에서 보내는 함에는 혼서지와 청·홍 비단(채단)을 담아, 음양의 결합과 변치 않을 약속을 표했다.', name: '함과 채단', tags: ['함', '혼서지', '채단'] },
      { kind: 'step', body: '대례에서 신랑·신부가 마주 절하고(교배례) 한 표주박을 둘로 나눈 잔에 술을 나눠 마셔(합근례) 한 몸 됨을 맹세했다.', name: '교배례·합근례', tags: ['교배례', '합근례', '표주박'] },
      { kind: 'symbol', body: '폐백에서 시부모께 절을 올리면 어른이 대추·밤을 던져 주며 다산과 자손의 번성을 빌었다.', name: '폐백과 대추·밤', tags: ['폐백', '대추', '밤', '다산'] },
      { kind: 'symbol', body: '기러기는 한 번 짝을 맺으면 평생 함께한다 하여, 신랑이 나무 기러기를 바쳐 백년해로를 약속했다(전안례).', name: '나무 기러기(전안례)', tags: ['기러기', '백년해로', '전안례'] },
      { kind: 'taboo', body: '혼사에는 ‘끊다·헤어지다·다시·둘째’ 같은 불길한 말과 깨지는 물건을 금기로 삼았다.', name: '불길한 말·깨짐 금기', tags: ['금기', '말', '깨짐'] },
      { kind: 'lore', body: '신부가 연지·곤지를 찍는 것은 붉은빛으로 잡귀를 막고 부끄러움을 가리는 뜻으로 풀이된다.', name: '연지·곤지', tags: ['연지', '곤지', '붉은색'] },
    ],
  },
  {
    key: 'hwangap', label: '회갑·수연(壽宴)', icon: '🎉', when: '육십갑자 한 바퀴(60세)',
    intro: '천간지지가 한 바퀴 돌아 태어난 해로 되돌아온 날. 장수를 축하하고 효를 다하는 잔치다.',
    items: [
      { kind: 'lore', body: '60간지가 한 바퀴 돌아 태어난 간지로 돌아오므로 ‘다시 갑(甲)으로 돌아온다’ 하여 회갑(환갑)이라 한다.', name: '간지가 돌아온 날', tags: ['간지', '60', '환갑'] },
      { kind: 'step', body: '자손들이 색동옷을 입고 차례로 잔을 올리며 절하고, 부모의 만수무강을 빌었다(헌수).', name: '자손의 헌수', tags: ['헌수', '잔', '절'] },
      { kind: 'symbol', body: '큰상에 과일·과자를 높이 고여 쌓는 고임상은, 쌓인 높이만큼의 정성과 가문의 풍요를 보였다.', name: '높이 고인 큰상', tags: ['큰상', '고임', '풍요'] },
      { kind: 'symbol', body: '국수(장수면)·복숭아·거북·학·소나무 무늬는 모두 장수와 무병을 비는 상징으로 쓰였다.', name: '장수의 상징물', tags: ['국수', '거북', '학', '장수'] },
      { kind: 'lore', body: '칠순(고희)·팔순 등 이후의 수연도 같은 격식으로, 오래 산 것 자체를 복으로 여겨 크게 축하했다.', name: '칠순·팔순 수연', tags: ['칠순', '팔순', '수연'] },
    ],
  },
  {
    key: 'sangrye', label: '상례·장례', icon: '⚰️', when: '죽음을 보내는 의례',
    intro: '산 자와 죽은 자가 갈리는 자리. 절차의 한 단계마다 슬픔을 격식에 담아 망자를 보낸다.',
    items: [
      { kind: 'step', body: '운명 직후 지붕에 올라 망자의 옷을 흔들며 혼을 부르고(초혼·고복), 죽음을 공식적으로 알린다.', name: '초혼(고복)', tags: ['초혼', '고복', '혼'] },
      { kind: 'step', body: '시신을 깨끗이 씻기고(습) 옷을 입혀(염) 묶어, 입관까지의 절차를 정성껏 치른다.', name: '습·염·입관', tags: ['습', '염', '입관'] },
      { kind: 'symbol', body: '상주는 굵은 삼베 상복을 입어 슬픔과 거친 마음을 드러내고, 화려한 색과 장식을 일절 피했다.', name: '삼베 상복', tags: ['상복', '삼베', '슬픔'] },
      { kind: 'step', body: '발인하여 상여로 운구하고, 정해진 자리에 안장한 뒤 봉분을 짓는다. 상엿소리로 망자를 위로했다.', name: '발인·운구·안장', tags: ['발인', '상여', '안장'] },
      { kind: 'lore', body: '삼우(장례 후 사흘째 성묘)·졸곡을 거쳐, 일정 기간 상복을 입고 슬픔을 절제하는 거상(居喪)을 지켰다.', name: '삼우·거상', tags: ['삼우', '거상', '상기'] },
      { kind: 'taboo', body: '빈소에서 큰 소리로 웃거나, “호상이다·잘 가셨다”며 슬픔을 가볍게 만드는 말은 깊은 결례다.', name: '호상 운운 삼감', tags: ['호상', '말', '결례'] },
      { kind: 'symbol', body: '흰색을 죽음·애도의 색으로 보아 상복·만장에 쓰고, 경사에 흰옷을 입는 것은 금기로 삼았다.', name: '흰색=애도의 색', tags: ['흰색', '애도', '상복'] },
    ],
  },
  {
    key: 'jesa', label: '제사·기제(祭祀)', icon: '🕯️', when: '기일·명절의 조상 의례',
    intro: '돌아가신 조상을 모셔 흠향케 하는 자리. 모셔 들이고 음식을 권하고 다시 보내드린다.',
    items: [
      { kind: 'step', body: '신위를 모시고 향을 피워 조상을 청한 뒤(강신), 참석자가 함께 절하여 인사드린다(참신).', name: '강신·참신', tags: ['강신', '참신', '향'] },
      { kind: 'step', body: '첫 잔(초헌)·둘째 잔(아헌)·셋째 잔(종헌)을 차례로 올리고, 밥에 숟가락을 꽂아 흠향을 청한다(삽시).', name: '삼헌과 삽시', tags: ['초헌', '아헌', '종헌', '삽시'] },
      { kind: 'step', body: '문을 닫고 잠시 물러나 조상이 드시도록 기다린 뒤(합문·계문), 숭늉을 올리고 상을 거두며 보내드린다(사신).', name: '합문·사신', tags: ['합문', '사신', '숭늉'] },
      { kind: 'symbol', body: '진설은 ‘홍동백서·조율이시·어동육서·좌포우혜’ 같은 어구로 방위와 색을 맞추되, 가가례로 집마다 다르다.', name: '진설의 어구', tags: ['홍동백서', '조율이시', '가가례'] },
      { kind: 'taboo', body: '‘치’로 끝나는 생선(갈치·꽁치)·복숭아·붉은 양념(고춧가루)·마늘은 제수에 올리지 않는 금기가 흔하다.', name: '치·복숭아·양념 금기', tags: ['생선', '복숭아', '고춧가루'] },
      { kind: 'lore', body: '제사 음식(음복)을 나누어 먹어 조상의 복을 함께 받는다고 여겼다.', name: '음복', tags: ['음복', '복', '나눔'] },
    ],
  },
  {
    key: 'gut', label: '굿·무속 의례', icon: '🥁', when: '신을 청하는 무속 제의',
    intro: '무당이 신과 사람 사이를 잇는 자리. 춤·노래·공물로 신을 청해 액을 풀고 복을 빈다.',
    items: [
      { kind: 'step', body: '굿은 신을 청하는 청신, 신을 즐겁게 하는 오신, 소원을 비는 축원, 신을 돌려보내는 송신의 흐름을 갖는다.', name: '청신·오신·송신', tags: ['청신', '오신', '송신'] },
      { kind: 'symbol', body: '울긋불긋한 신복·방울·부채·신칼은 신의 위엄과 무당의 신통을 드러내는 무구다.', name: '신복과 무구', tags: ['신복', '방울', '신칼'] },
      { kind: 'symbol', body: '날이 선 작두날 위에 맨발로 올라서는 작두타기는, 신이 내려 해를 입지 않음을 증명하는 신성의 표시다.', name: '작두타기', tags: ['작두', '신내림', '신성'] },
      { kind: 'lore', body: '신이 무당의 입을 빌려 말하는 ‘공수’로 망자의 한이나 신의 뜻을 전하고, 산 자의 응어리를 풀어 준다.', name: '공수(신의 말)', tags: ['공수', '망자', '한'] },
      { kind: 'lore', body: '병굿·재수굿·진오기굿(망자 천도) 등 목적에 따라 굿의 종류와 절차가 달라진다.', name: '굿의 갈래', tags: ['병굿', '재수굿', '진오기'] },
      { kind: 'taboo', body: '신을 청한 자리에서 부정한 음식·부정 탄 사람을 들이거나, 의례를 비웃는 것은 신을 노하게 한다 하여 엄히 금했다.', name: '부정과 불경 금기', tags: ['부정', '불경', '금기'] },
    ],
  },
  {
    key: 'maeul', label: '마을 제의·동제', icon: '🌳', when: '정월·시월의 공동체 제사',
    intro: '온 마을이 함께 마을신께 올리는 제사. 한 해의 평안과 풍년, 역병의 물리침을 빈다.',
    items: [
      { kind: 'step', body: '부정 없는 제관을 미리 뽑아 금줄을 치고 몸과 마음을 깨끗이 하여(재계), 정해진 날 마을신께 제를 올린다.', name: '제관 선정과 재계', tags: ['제관', '재계', '금줄'] },
      { kind: 'symbol', body: '마을 어귀의 큰 나무(당산나무)·서낭당·장승은 마을을 지키는 신이 깃든 자리로 여겨졌다.', name: '당산나무·서낭당', tags: ['당산나무', '서낭', '장승'] },
      { kind: 'lore', body: '제가 끝나면 풍물을 울리며 지신밟기로 집집을 돌아 땅의 신을 달래고 한 해의 무탈을 빌었다.', name: '풍물과 지신밟기', tags: ['풍물', '지신밟기', '농악'] },
      { kind: 'symbol', body: '솟대 위 새는 하늘과 땅을 잇는 전령으로, 마을의 소원을 하늘에 전한다고 믿었다.', name: '솟대의 새', tags: ['솟대', '새', '전령'] },
      { kind: 'taboo', body: '제를 준비하는 기간에는 상가에 가거나 부정한 일을 보는 것을 엄금하고, 외부인의 출입도 막았다(금줄).', name: '부정 출입 금지', tags: ['금줄', '부정', '출입'] },
      { kind: 'lore', body: '제를 소홀히 하거나 신목을 함부로 베면 마을에 재앙이 든다는 금기담이 마을마다 전해졌다.', name: '신목 훼손의 재앙담', tags: ['신목', '재앙', '금기담'] },
    ],
  },
  {
    key: 'harvest', label: '서양 수확·축제', icon: '🎃', when: '추수·계절 전환의 축제',
    intro: '거둔 곡식과 계절의 매듭을 기리는 서양 축제들. 등불·가면·불·풍요의 상징이 등장한다.',
    items: [
      { kind: 'symbol', body: '여름과 겨울의 경계에서 산 자와 죽은 자의 문이 열린다고 믿어, 가면·등불로 떠도는 혼을 달래거나 쫓았다.', name: '경계의 밤(혼의 문)', tags: ['경계', '혼', '가면'] },
      { kind: 'symbol', body: '속을 파낸 호박·순무에 불을 켜 둔 등불은, 길 잃은 혼을 인도하거나 악령을 겁주는 빛으로 쓰였다.', name: '파낸 등불', tags: ['호박', '등불', '악령'] },
      { kind: 'lore', body: '수확을 마친 들에서 마지막 곡식 단으로 인형을 엮어, 곡식의 정령이 다음 해까지 머물게 한다고 믿었다.', name: '곡식 정령 인형', tags: ['수확', '정령', '곡식단'] },
      { kind: 'symbol', body: '한 해 가장 긴 밤(겨울 절정)에 큰 통나무를 태우는 불은, 어둠을 견디고 빛의 귀환을 비는 의미였다.', name: '한겨울의 불', tags: ['불', '겨울', '빛'] },
      { kind: 'lore', body: '봄을 부르는 축제에서는 가면·소란·역할 뒤바꿈으로 겨울의 질서를 깨고 새 계절의 생명력을 불러냈다.', name: '봄맞이 가면 소란', tags: ['봄', '가면', '뒤바꿈'] },
      { kind: 'symbol', body: '풍요·다산의 상징으로 알·토끼·꽃을 내세워, 새 생명과 부활의 계절을 기렸다.', name: '알·토끼·꽃의 다산', tags: ['알', '토끼', '다산'] },
    ],
  },
  {
    key: 'pilgrim', label: '순례·서원 의례', icon: '🧭', when: '맹세·정화의 여정',
    intro: '먼 성소를 향해 떠나거나 신께 약속을 거는 의례. 고행과 정화로 새 사람이 되어 돌아온다.',
    items: [
      { kind: 'step', body: '몸과 마음을 정화하는 금식·목욕·금기를 지킨 뒤, 정해진 복색을 갖추고 성소를 향해 길을 떠난다.', name: '정화와 출발', tags: ['정화', '금식', '복색'] },
      { kind: 'symbol', body: '맨발·고된 걸음·짐 지기 같은 고행은, 죄를 씻고 서원을 증명하는 정성으로 읽혔다.', name: '고행의 의미', tags: ['고행', '맨발', '서원'] },
      { kind: 'lore', body: '성소에 닿으면 정해진 방식으로 돌거나 절하고, 봉헌물·서원을 바쳐 약속을 완성한다.', name: '성소에서의 봉헌', tags: ['성소', '봉헌', '서원'] },
      { kind: 'symbol', body: '여정에서 얻은 표(조개껍데기·증표·물·흙)는 순례를 마쳤다는 증거이자 부적처럼 지녀졌다.', name: '순례의 증표', tags: ['증표', '부적', '여정'] },
      { kind: 'lore', body: '순례를 마친 자는 ‘옛 자아를 버리고 돌아온 사람’으로 대우받아, 호칭·지위가 달라지기도 했다.', name: '돌아온 자의 변화', tags: ['귀환', '변화', '대우'] },
      { kind: 'taboo', body: '서원을 어기거나 정해진 금기를 깨면 여정의 공덕이 사라진다 하여 끝까지 절제를 지켰다.', name: '서원·금기 위반', tags: ['서원', '금기', '공덕'] },
    ],
  },
]

// ---------- 영속(localStorage) ----------
const LS = 'sry:tool:festival-ritual-ref:'
const ALL_KEY = '__all__'

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function FestivalRitualRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.event 로 특정 의례를 열 수 있게(연계 진입)
  const initialEvent = typeof payload?.event === 'string' && EVENTS.some((s) => s.key === payload.event)
    ? (payload.event as string)
    : ALL_KEY

  const [query, setQuery] = useState('')
  const [event, setEvent] = useState<string>(() => {
    if (initialEvent !== ALL_KEY) return initialEvent
    try {
      const raw = localStorage.getItem(LS + 'event')
      if (raw && (raw === ALL_KEY || EVENTS.some((s) => s.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 종류 필터: step/symbol/taboo/lore (빈 = 전체)
  const [kindFilter, setKindFilter] = useState<Record<Item['kind'], boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'kinds')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return o as Record<Item['kind'], boolean>
      }
    } catch { /* ignore */ }
    return { step: false, symbol: false, taboo: false, lore: false }
  })
  // 펼친 의례(아코디언)
  const [openEvents, setOpenEvents] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'open')
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o === 'object') return o as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [random, setRandom] = useState<{ event: Event; item: Item } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 타이머 정리용
  const timers = useRef<number[]>([])
  const pushTimer = useCallback((id: number) => { timers.current.push(id) }, [])
  useEffect(() => {
    // 언마운트 정리: 남은 모든 타이머 해제
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  }, [])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'event', event) } catch { /* ignore */ } }, [event])
  useEffect(() => { try { localStorage.setItem(LS + 'kinds', JSON.stringify(kindFilter)) } catch { /* ignore */ } }, [kindFilter])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(openEvents)) } catch { /* ignore */ } }, [openEvents])

  const total = useMemo(() => EVENTS.reduce((n, s) => n + s.items.length, 0), [])
  const anyKind = useMemo(() => Object.values(kindFilter).some(Boolean), [kindFilter])
  const matchKind = useCallback((k: Item['kind']) => !anyKind || kindFilter[k], [anyKind, kindFilter])

  // 검색 + 종류 필터를 거친 (의례→항목) 묶음
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = event === ALL_KEY ? EVENTS : EVENTS.filter((s) => s.key === event)
    return pool.map((s) => {
      const items = s.items.filter((r) => {
        if (!matchKind(r.kind)) return false
        if (!q) return true
        const hay = (r.name + ' ' + r.body + ' ' + (r.tags || []).join(' ') + ' ' + s.label + ' ' + (s.when || '')).toLowerCase()
        return hay.includes(q)
      })
      return { event: s, items }
    }).filter((g) => g.items.length > 0)
  }, [query, event, matchKind])

  const shownCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])

  // 검색/필터가 걸려 있으면 결과가 있는 의례를 자동으로 펼친다.
  const searching = query.trim().length > 0 || anyKind
  const isOpen = useCallback((key: string) => {
    if (searching) return true
    return !!openEvents[key]
  }, [searching, openEvents])

  const toggleEvent = useCallback((key: string) => {
    setOpenEvents((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleKind = useCallback((k: Item['kind']) => {
    setKindFilter((prev) => ({ ...prev, [k]: !prev[k] }))
  }, [])

  const rollRandom = useCallback(() => {
    // 현재 의례/종류 필터 범위 안에서 무작위 1개(검색어 무시)
    const pool: { event: Event; item: Item }[] = (event === ALL_KEY ? EVENTS : EVENTS.filter((s) => s.key === event))
      .flatMap((s) => s.items.filter((r) => matchKind(r.kind)).map((item) => ({ event: s, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.event.key === prev.event.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [event, matchKind])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    const id = window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2300)
    pushTimer(id)
  }, [pushTimer])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      const t = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
      pushTimer(t)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }, [pushTimer])

  // 한 항목을 한 줄 텍스트로
  const itemLine = (s: Event, r: Item) =>
    `[${s.icon} ${s.label}] ${KIND_LABEL[r.kind].icon} ${r.name} — ${r.body}`

  // ----- 연계 1: 프로젝트 자료(research) 〈축제·의례〉 폴더에 항목 추가 -----
  const addItemToProject = useCallback((s: Event, r: Item) => {
    if (!hasProjectBridge()) return
    const kl = KIND_LABEL[r.kind]
    const bodyHtml = [
      `<p><b>${escapeHtml(s.icon + ' ' + s.label)}${s.when ? ' · ' + escapeHtml(s.when) : ''}</b></p>`,
      `<p><b>${escapeHtml(kl.icon + ' ' + kl.label)}</b> — ${escapeHtml(r.name)}</p>`,
      `<p>${escapeHtml(r.body)}</p>`,
      r.tags && r.tags.length ? `<p style="color:#888">태그: ${escapeHtml(r.tags.join(', '))}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '축제·의례',
      title: `${r.name} (${s.label} · ${kl.label})`,
      bodyHtml,
    })
    if (id) showToast(`프로젝트 자료 〈축제·의례〉에 ‘${r.name}’을(를) 추가했습니다.`)
  }, [showToast])

  // 한 의례 전체를 프로젝트에 한 문서로 추가
  const addEventToProject = useCallback((s: Event, items: Item[]) => {
    if (!hasProjectBridge()) return
    const lines = items.map((r) => {
      const kl = KIND_LABEL[r.kind]
      return `<li><b>${escapeHtml(kl.icon + ' ' + kl.label)} · ${escapeHtml(r.name)}</b> — ${escapeHtml(r.body)}</li>`
    }).join('')
    const bodyHtml = [
      `<p><b>${escapeHtml(s.icon + ' ' + s.label)}${s.when ? ' · ' + escapeHtml(s.when) : ''}</b></p>`,
      `<p>${escapeHtml(s.intro)}</p>`,
      `<ul>${lines}</ul>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '축제·의례',
      title: `${s.label} 정리 (${items.length}항)`,
      bodyHtml,
    })
    if (id) showToast(`〈${s.label}〉 ${items.length}항을 프로젝트 자료에 추가했습니다.`)
  }, [showToast])

  // ----- 연계 2: 수집함에 담기 -----
  const stashItem = useCallback((s: Event, r: Item) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${s.label}·${r.name}`, text: itemLine(s, r) })
    showToast(`수집함에 ‘${r.name}’을(를) 담았습니다.`)
  }, [showToast])

  // ----- 연계 3: 스니펫 라이브러리에 저장 -----
  const snippetItem = useCallback((s: Event, r: Item) => {
    addToLibrary('snippets', { text: itemLine(s, r), source: '축제·의례 사전', tags: [s.label, KIND_LABEL[r.kind].label] })
    showToast(`스니펫으로 ‘${r.name}’을(를) 저장했습니다.`)
  }, [showToast])

  // ----- 연계 4: 관련 도구 열기 -----
  const RELATED: { id: string; label: string }[] = [
    { id: 'social-etiquette-ref', label: '예법·금기 사전' },
    { id: 'color-symbolism-ref', label: '색채 상징 사전' },
    { id: 'historical-era-ref', label: '시대 배경 사전' },
    { id: 'world-wiki', label: '세계관 위키' },
  ]

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const kindBadge = (k: Item['kind']): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 700, color: KIND_LABEL[k].color,
    border: `1px solid ${KIND_LABEL[k].color}`, borderRadius: 6, padding: '1px 6px', flexShrink: 0,
  })

  return (
    <div style={wrap}>
      <div style={hint}>
        설·대보름·단오·추석·관혼상제·굿·동제 등 <b>{EVENTS.length}개 축제·의례</b>의 절차·상징·금기·풀이 <b>{total}항</b>을 모았습니다.
        “그 자리에서 무엇을 하고 무엇이 금기인가”를 찾아 장면의 분위기·갈등·통과의례에 심어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="절차·상징·금기 검색 (예: 떡국, 팥, 기러기, 폐백, 작두, 흰색)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 의례 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setEvent(ALL_KEY)} aria-pressed={event === ALL_KEY} style={chip(event === ALL_KEY)}><Emoji e="✨"/> 전체</button>
        {EVENTS.map((s) => (
          <button key={s.key} className="minibtn" onClick={() => setEvent(s.key)} aria-pressed={event === s.key} style={chip(event === s.key)} title={s.intro}>
            <Emoji e={s.icon}/> {s.label}
          </button>
        ))}
      </div>

      {/* 종류 필터 + 무작위 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 뽑기</button>
        {(Object.keys(KIND_LABEL) as Item['kind'][]).map((k) => (
          <button key={k} className="minibtn" onClick={() => toggleKind(k)} aria-pressed={!!kindFilter[k]} style={chip(!!kindFilter[k])} title={`${KIND_LABEL[k].label}만 보기`}>
            <Emoji e={KIND_LABEL[k].icon}/> {KIND_LABEL[k].label}
          </button>
        ))}
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}항 표시</span>
      </div>

      {/* 관련 도구 열기(연계) */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((t) => (
          <button key={t.id} className="linkbtn" onClick={() => openToolLinked(t.id)} title={`${t.label} 열기`}><Emoji e="🔗"/> {t.label}</button>
        ))}
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.event.icon}/> {random.event.label}</span>
            <span style={kindBadge(random.item.kind)}><Emoji e={KIND_LABEL[random.item.kind].icon}/> {KIND_LABEL[random.item.kind].label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{random.item.body}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemLine(random.event, random.item), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="linkbtn" onClick={() => addItemToProject(random.event, random.item)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈축제·의례〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => stashItem(random.event, random.item)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎"/> 수집함</button>
            <button className="linkbtn" onClick={() => snippetItem(random.event, random.item)} title="스니펫 라이브러리에 저장"><Emoji e="🧷"/> 스니펫 저장</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 의례별 아코디언 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            검색·필터 결과가 없습니다. 다른 말로 찾거나 필터를 해제해 보세요.
          </div>
        ) : (
          groups.map(({ event: s, items }) => {
            const open = isOpen(s.key)
            return (
              <div key={s.key} style={card}>
                {/* 의례 헤더(펼침/접기) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleEvent(s.key)}
                    aria-expanded={open}
                    title={open ? '접기' : '펼치기'}
                    style={{ flexShrink: 0 }}
                  >
                    {open ? '▾' : '▸'}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => toggleEvent(s.key)}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}><Emoji e={s.icon}/> {s.label}
                      {s.when && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>{s.when}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{s.intro}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{items.length}항</span>
                  <button
                    className="linkbtn"
                    onClick={() => addEventToProject(s, items)}
                    disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 의례 전체를 한 문서로 프로젝트에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                    style={{ flexShrink: 0 }}
                  >
                    <Emoji e="📄"/> 전체 추가
                  </button>
                </div>

                {/* 항목 목록 */}
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {items.map((r, i) => {
                      const rid = s.key + '::' + r.name + '::' + i
                      return (
                        <div key={rid} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                            <span style={kindBadge(r.kind)}><Emoji e={KIND_LABEL[r.kind].icon}/> {KIND_LABEL[r.kind].label}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
                          </div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{r.body}</div>
                          {r.tags && r.tags.length > 0 && (
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{r.tags.map((t) => '#' + t).join(' ')}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                            <button className="minibtn" onClick={() => copy(itemLine(s, r), rid)}>{copiedKey === rid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                            <button className="linkbtn" onClick={() => addItemToProject(s, r)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈축제·의례〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                            <button className="linkbtn" onClick={() => stashItem(s, r)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎"/> 수집함</button>
                            <button className="linkbtn" onClick={() => snippetItem(s, r)} title="스니펫 라이브러리에 저장"><Emoji e="🧷"/> 스니펫</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        <Emoji e="🎏"/> 의례는 시대·지역·가문마다 다르며 여기 정리는 자작 요약입니다. 작품의 톤·고증에 맞게 비틀거나 어겨서 인물의 전환점·갈등을 만들어 보세요.
      </div>
    </div>
  )
}
