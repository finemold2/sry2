// 문체 처방기(Prose Style Emulator) — 목표 문체(간결/만연/하드보일드/서정/유머/냉소 등)를 고르면
//   그 문체의 특징·권장 문장 길이·어휘 결·리듬·하지 말 것을 처방하고, "같은 한 문장"을 각 문체로
//   고쳐 쓴 변환 예시를 나란히 보여 준다. 예문은 직접 고르거나 무작위로 뽑을 수 있고, 모든 문체 변환을
//   한 번에 펼쳐 비교할 수 있다. 처방·변환을 복사/스니펫/수집함/프로젝트로 내보내고, 짝꿍 도구
//   '문장 리듬 연주'(prose-rhythm)를 연다.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(네트워크·외부 미디어·키 불필요).
//   모든 텍스트는 자작(저작권 안전). 제어문자·특수기호 미사용. 영속: localStorage 'sry:tool:prose-style-emulator'.
//   언마운트 시 타이머 정리. 한국어 UI.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'prose-style-emulator',
  name: '문체 처방기',
  icon: '🎭',
  group: '교정·언어',
  intro: '목표 문체별 특징·문장 길이·어휘·리듬 가이드와, 같은 문장을 각 문체로 고쳐 쓴 변환 예시를 보여 줍니다',
  w: 720,
  h: 760,
}

const LS_KEY = 'sry:tool:prose-style-emulator'

// ── 문체 데이터 모델 ───────────────────────────────────────────
interface StyleProfile {
  id: string
  name: string          // 한국어 문체 이름
  tag: string           // 한 줄 성격
  icon: string
  sentLen: string       // 권장 문장 길이
  rhythm: string        // 리듬/호흡
  feel: string          // 어휘·정서의 결
  traits: string[]      // 특징(불릿)
  vocab: string[]       // 즐겨 쓰는 어휘/표현
  avoid: string[]       // 피할 것
  devices: string[]     // 즐겨 쓰는 기법
}

// 예문 → 각 문체로 고쳐 쓴 변환. styleId 키로 매핑.
interface ExampleSet {
  id: string
  source: string                  // 중립적인 원문(한 문장 또는 짧은 두 문장)
  rewrites: Record<string, string>
}

// ── 문체 사전(자작) ───────────────────────────────────────────
const STYLES: StyleProfile[] = [
  {
    id: 'concise',
    name: '간결체',
    tag: '군더더기 없는 단문. 골격만 남긴다.',
    icon: '✂️',
    sentLen: '한 문장 8~18자, 한 문장에 한 정보',
    rhythm: '짧게-짧게-짧게. 마침표를 자주 찍어 호흡을 끊는다',
    feel: '건조하고 단단함. 형용사·부사는 최소.',
    traits: [
      '주어-서술어를 곧장 붙이고 수식을 덜어낸다.',
      '접속사("그리고/그래서") 대신 문장을 끊는다.',
      '한 문장에 사건 하나. 정보가 둘이면 자른다.',
      '추상명사("~의 것/~함")보다 동사로 말한다.',
    ],
    vocab: ['짧은 고유어 동사', '구체 명사', '숫자', '단음절 부사 절제'],
    avoid: ['이중부정', '겹수식("아주 매우")', '늘어지는 관형절', '~인 것 같다 류 추정 군더더기'],
    devices: ['단문 나열', '생략', '명사 종결', '대구(짧은 대칭)'],
  },
  {
    id: 'periodic',
    name: '만연체',
    tag: '길게 감아 도는 복문. 한 호흡에 세계를 담는다.',
    icon: '🌀',
    sentLen: '한 문장 40~120자, 절을 여러 겹 포갠다',
    rhythm: '쉼표로 굽이굽이 미루다 끝에서 매듭짓는다',
    feel: '유장하고 사색적. 부속절이 본절을 감싼다.',
    traits: [
      '관형절·부사절을 겹쳐 한 문장에 정황을 다 담는다.',
      '핵심 서술어를 문장 끝까지 미뤄 긴장을 만든다.',
      '쉼표·접속어로 흐름을 잇되 호흡이 끊기지 않게 한다.',
      '병렬 나열("~하고, ~하며, ~하면서")로 세부를 쌓는다.',
    ],
    vocab: ['관형형 어미', '부사절 연결어미', '추상·정황 명사', '연결어("~인 채로", "~기에")'],
    avoid: ['뜻이 흐려질 만큼의 만연', '주어-서술어 호응 어긋남', '같은 연결어미 반복'],
    devices: ['종속절 중첩', '서술어 후치', '긴 병렬', '삽입구'],
  },
  {
    id: 'hardboiled',
    name: '하드보일드',
    tag: '감정을 말하지 않고 행동과 사물로 보여 준다.',
    icon: '🚬',
    sentLen: '대개 단문, 가끔 무뚝뚝한 중문',
    rhythm: '툭툭 던지듯. 여백과 침묵을 활용한다',
    feel: '냉정·메마름. 감정어 대신 동작과 디테일.',
    traits: [
      '"슬펐다"를 쓰지 않는다. 행동으로 슬픔을 보여 준다.',
      '구체적 사물·동작 묘사로 정서를 대신한다.',
      '대화는 짧고 응수가 빠르다. 설명을 덧붙이지 않는다.',
      '관찰자처럼 거리를 두고 사실만 적는다.',
    ],
    vocab: ['구체 명사(담배·빗물·재떨이)', '동작 동사', '짧은 직접화법', '감정형용사 회피'],
    avoid: ['감정 직접 진술', '과장 비유', '내면 설명 장황', '느낌표 남발'],
    devices: ['행동 묘사로 감정 치환', '여백', '짧은 대화', '냉담한 관찰 시점'],
  },
  {
    id: 'lyric',
    name: '서정체',
    tag: '이미지와 감각으로 마음의 결을 어루만진다.',
    icon: '🌸',
    sentLen: '중문 위주, 호흡이 부드럽게 굽이친다',
    rhythm: '음악적. 모음·받침의 울림과 운율을 의식한다',
    feel: '섬세하고 따뜻함. 비유와 감각어가 풍부.',
    traits: [
      '시각·청각·후각 등 감각 이미지로 정서를 그린다.',
      '은유·직유로 추상을 만질 수 있게 만든다.',
      '말맛(소리의 결)을 살려 운율을 만든다.',
      '여운을 위해 문장 끝을 부드럽게 연다(명사·여운형 종결).',
    ],
    vocab: ['감각 형용사', '자연·빛·계절 이미지', '의태어·의성어', '비유 표현'],
    avoid: ['클리셰 비유("거울 같은 호수")', '감정 과잉', '뜻 없는 미사여구'],
    devices: ['은유·직유', '감각 전이(공감각)', '반복·점층', '여운 종결'],
  },
  {
    id: 'humor',
    name: '유머체',
    tag: '능청과 과장, 의외의 비교로 웃음을 만든다.',
    icon: '😏',
    sentLen: '중단문 혼합, 펀치라인은 짧게 떨어뜨린다',
    rhythm: '쌓다가-비튼다. 마지막에 반전 한 줄',
    feel: '경쾌·능청. 진지함과 시시함의 낙차로 웃긴다.',
    traits: [
      '큰일을 사소하게, 사소한 일을 거창하게 비튼다.',
      '구체적이고 엉뚱한 비교로 의외성을 만든다.',
      '펀치라인은 문장 맨 끝에 짧게 둔다.',
      '능청스러운 과장과 시치미를 섞는다.',
    ],
    vocab: ['엉뚱한 구체 명사', '과장 부사', '능청 종결("~더라/말이다")', '의외의 비유'],
    avoid: ['설명형 농담(웃음 포인트 풀이)', '같은 말장난 반복', '비꼼이 독해지는 것'],
    devices: ['과장', '낙차(앤티클라이맥스)', '의외의 병치', '딴청'],
  },
  {
    id: 'cynic',
    name: '냉소체',
    tag: '한 발 물러서 비꼬며 진실을 들춘다.',
    icon: '🙃',
    sentLen: '중문 위주, 반전 절을 끝에 붙인다',
    rhythm: '담담하게 진술하다 끝에서 찌른다',
    feel: '건조한 아이러니. 칭찬처럼 말하고 비꼰다.',
    traits: [
      '겉으로 긍정하며 속으로 부정하는 아이러니를 쓴다.',
      '상투적 미덕을 비틀어 들춘다.',
      '"물론", "당연히" 같은 능청 부사로 거리를 둔다.',
      '결론을 단정하지 않고 비꼬는 여운으로 남긴다.',
    ],
    vocab: ['아이러니 부사("물론/하긴")', '대조어', '완곡한 비꼼', '단정 회피 어미'],
    avoid: ['노골적 욕설·비난', '자기연민', '비꼼의 남용으로 메시지 실종'],
    devices: ['아이러니', '반어', '대조', '완곡어법'],
  },
  {
    id: 'plain',
    name: '담백체',
    tag: '꾸밈없이 또박또박. 누구나 읽기 쉽게.',
    icon: '🍚',
    sentLen: '한 문장 15~30자, 평이하고 고른 호흡',
    rhythm: '일정하고 안정적. 튀는 곳이 없다',
    feel: '차분·정직. 정보가 또렷이 전달된다.',
    traits: [
      '쉬운 단어와 표준 어순으로 또박또박 적는다.',
      '비유를 절제하고 사실을 그대로 전한다.',
      '한 문단에 한 생각을 담아 흐름이 깔끔하다.',
      '읽는 이를 헤매게 하는 모호함을 없앤다.',
    ],
    vocab: ['일상 어휘', '표준 어순', '명료한 접속어', '중립적 종결'],
    avoid: ['현학적 한자어 남용', '꼬인 이중수식', '뜻 모를 외래어'],
    devices: ['직설', '병렬 정렬', '명료한 접속', '한 문단 한 생각'],
  },
  {
    id: 'baroque',
    name: '화려체',
    tag: '수사와 비유를 겹겹이 두른 장식적 문장.',
    icon: '👑',
    sentLen: '긴 복문, 수식과 삽입이 풍성',
    rhythm: '장중하고 굽이친다. 점층으로 고조',
    feel: '웅장·과시적. 어휘가 호사스럽다.',
    traits: [
      '비유·대구·열거를 겹쳐 문장을 장식한다.',
      '고급 한자어·관념어로 격조를 높인다.',
      '점층과 반복으로 감정을 고조시킨다.',
      '삽입구로 정황을 화려하게 부연한다.',
    ],
    vocab: ['관념·추상 한자어', '대구 표현', '열거', '점층 부사'],
    avoid: ['뜻 없는 과장으로 공허해지는 것', '같은 수사 반복', '독자 피로'],
    devices: ['대구', '열거', '점층', '삽입·부연'],
  },
  {
    id: 'staccato',
    name: '스타카토체',
    tag: '한 단어, 한 조각씩 끊어 던지는 박력.',
    icon: '⚡',
    sentLen: '극단적 단문·단어 문장. 종종 1~5자',
    rhythm: '톡. 톡. 톡. 끊김 자체가 리듬이다',
    feel: '긴박·강렬. 속도와 충격을 만든다.',
    traits: [
      '단어 하나도 한 문장으로 떨어뜨린다.',
      '마침표로 시간을 멈췄다 다시 켠다.',
      '동작의 순간을 잘게 쪼개 긴장을 높인다.',
      '클라이맥스·액션 장면에 효과적이다.',
    ],
    vocab: ['단음절 동사·명사', '의성·의태어', '명령형', '한 단어 종결'],
    avoid: ['남용(전 장면을 끊으면 피로)', '의미 단절', '맥락 상실'],
    devices: ['극단 단문', '단어 문장', '반복', '리듬 절단'],
  },
  {
    id: 'stream',
    name: '의식의 흐름',
    tag: '구두점을 풀고 떠오르는 대로 흘려보낸다.',
    icon: '🌊',
    sentLen: '경계가 흐릿한 긴 흐름, 쉼표·줄표로 잇는다',
    rhythm: '끊김 없이 흐른다. 연상과 비약을 따른다',
    feel: '내밀·몽환. 생각의 날것이 그대로.',
    traits: [
      '논리 순서보다 연상의 순서를 따른다.',
      '마침표를 줄이고 생각을 이어 흘린다.',
      '감각·기억·현재가 뒤섞여 떠오른다.',
      '문법적 완결보다 심리적 진실을 좇는다.',
    ],
    vocab: ['연상 연결("그러고 보니/문득")', '감각 단편', '말줄임(...)', '자문자답'],
    avoid: ['장면 전체를 이걸로(가독성 붕괴)', '연상 없는 횡설수설'],
    devices: ['자유연상', '구두점 절제', '내적 독백', '시간 혼재'],
  },
  {
    id: 'epistle',
    name: '서간체',
    tag: '읽는 이에게 건네는 다정한 말투.',
    icon: '✉️',
    sentLen: '중문, 말을 거는 호흡',
    rhythm: '대화하듯 자연스럽다. 여백에 정이 묻는다',
    feel: '친근·고백적. 2인칭으로 거리를 좁힌다.',
    traits: [
      '"당신/그대"에게 직접 말을 건다.',
      '안부·고백·당부의 어조가 흐른다.',
      '구어적 종결("~답니다/~지요")로 다정함을 낸다.',
      '사적인 정황을 곁들여 진심을 전한다.',
    ],
    vocab: ['2인칭 호명', '안부 표현', '경어·구어 종결', '고백 어휘'],
    avoid: ['지나친 격식으로 거리가 멀어지는 것', '신파', '장황한 사설'],
    devices: ['직접 호명', '말 걸기', '고백', '여운 인사'],
  },
  {
    id: 'epic',
    name: '서사체',
    tag: '사건을 큰 시야로 묵직하게 펼쳐 든다.',
    icon: '🏔️',
    sentLen: '중장문, 시간·공간을 아우른다',
    rhythm: '느리고 장중하게 굴러간다',
    feel: '장엄·관조적. 한 사람보다 큰 흐름을 본다.',
    traits: [
      '개인을 시대·운명의 흐름 속에 놓는다.',
      '과거형 진술로 역사를 회고하듯 적는다.',
      '풍경·세월을 넓게 조망하며 묘사한다.',
      '단정적이고 묵직한 종결로 무게를 싣는다.',
    ],
    vocab: ['세월·운명·강·산 등 큰 명사', '과거 회상 어미', '관조 부사', '집합·전체 표현'],
    avoid: ['감정 과잉으로 스케일이 작아지는 것', '잡다한 디테일에 매몰'],
    devices: ['조망 묘사', '회상 시점', '운명 모티프', '장중 종결'],
  },
]

// ── 예문 사전(자작) — 같은 원문을 각 문체로 변환 ───────────────
const EXAMPLES: ExampleSet[] = [
  {
    id: 'rain-window',
    source: '비가 내리는 창가에서 그녀는 떠난 사람을 오래 생각했다.',
    rewrites: {
      concise: '비가 왔다. 그녀는 창가에 섰다. 떠난 사람을 생각했다.',
      periodic: '하루 종일 잿빛으로 가라앉은 하늘에서 비가 그칠 줄 모르고 내리던 그 오후, 그녀는 빗물이 흘러내리는 창유리에 이마를 댄 채, 이제는 돌아오지 않을 사람을 오래도록 생각하고 또 생각했다.',
      hardboiled: '비가 창을 두드렸다. 그녀는 식은 커피를 한 모금 마시고, 빈 의자를 바라보았다. 담배에 불을 붙였다.',
      lyric: '빗방울이 유리 위를 미끄러져 내리고, 그 물길을 따라 그녀의 마음도 한 사람에게로 천천히 흘러갔다.',
      humor: '비 오는 날 창가에 서면 누구나 영화 주인공이 된다더니, 그녀는 떠난 사람을 두 시간째 생각하다 결국 라면을 끓이러 갔다.',
      cynic: '물론 비 오는 창가에서 떠난 사람을 떠올리는 건 꽤나 운치 있는 일이었다. 그 사람이 마지막으로 한 일이 그녀의 우산을 가져간 것만 아니었다면.',
      plain: '비가 내렸다. 그녀는 창가에 서서 떠난 사람을 오래 생각했다.',
      baroque: '잿빛 구름이 끝없이 빗줄기를 풀어 헤치던 그 오후, 차갑게 식은 유리창 너머로, 그녀의 가슴속에는 떠나간 한 사람의 잔영이 강물처럼, 끝내 마르지 않는 강물처럼 굽이쳐 흘렀다.',
      staccato: '비. 창가. 그녀가 섰다. 빗방울. 또 빗방울. 그 사람. 없다.',
      stream: '비가 오네 또 비가 와 저 빗소리 그날도 이랬지 그 사람 우산을 두고 갔던 그날 아니 우산은 내가 두고 왔던가 모르겠어 창에 김이 서리고 손끝이 차고 그 사람 손도 차가웠는데...',
      epistle: '비 오는 창가에 서 있으면, 당신, 자꾸만 떠나신 그분 생각이 난답니다. 그치지 않는 비처럼요.',
      epic: '비는 그해 가을 내내 그치지 않았고, 창가에 선 그녀의 가슴에는 이미 떠나가 버린 한 사람의 시간이, 다시는 돌이킬 수 없는 강물이 되어 묵묵히 흐르고 있었다.',
    },
  },
  {
    id: 'old-man-walk',
    source: '노인은 지팡이를 짚고 시장을 천천히 걸었다.',
    rewrites: {
      concise: '노인이 지팡이를 짚었다. 시장을 걸었다. 천천히.',
      periodic: '평생을 이 거리에서 보낸 탓에 골목마다 사연이 배어 있는 그 시장을, 노인은 닳고 닳은 지팡이에 한쪽 몸을 의지한 채, 발걸음마다 지난 세월을 헤아리듯 더없이 천천히 걸어 나갔다.',
      hardboiled: '노인이 지팡이를 짚었다. 한 걸음. 또 한 걸음. 시장 바닥은 젖어 있었다.',
      lyric: '낡은 지팡이가 돌바닥을 톡, 톡 두드릴 때마다 노인의 그림자는 저무는 햇살 속으로 길게 늘어졌다.',
      humor: '노인은 지팡이를 짚고 시장을 걸었는데, 어찌나 천천히 걷는지 따라오던 비둘기가 먼저 지쳐 날아가 버렸다.',
      cynic: '노인은 지팡이를 짚고 시장을 천천히 걸었다. 빨리 걸어 봤자 마중 나올 사람도 없는 마당에, 서두를 이유가 어디 있겠는가.',
      plain: '노인은 지팡이를 짚고 시장을 천천히 걸었다.',
      baroque: '세월의 무게를 한 몸에 짊어진 노인은, 손때에 윤이 나도록 닳은 지팡이를 벗 삼아, 떠들썩한 장터의 한복판을 한 걸음 한 걸음, 마치 지난 생을 되짚듯 장중하게 걸어 나아갔다.',
      staccato: '지팡이. 톡. 한 걸음. 톡. 또 한 걸음. 노인. 시장. 느리게.',
      stream: '지팡이가 톡 톡 이 길을 몇 번이나 걸었더라 젊었을 적엔 여길 뛰어다녔는데 그 생선 가게 주인은 아직 살아 있나 다리가 무겁고 햇살이 따갑고 천천히 천천히...',
      epistle: '당신도 보셨다면 좋았을 텐데요. 그 노인이 지팡이를 짚고 시장을 얼마나 천천히, 정답게 걸으시던지요.',
      epic: '그 시장의 돌바닥은 한 노인의 평생을 기억하고 있었으니, 지팡이를 짚고 천천히 걸어가는 굽은 등 위로 한 시대가 저물고 있었다.',
    },
  },
  {
    id: 'phone-rings',
    source: '한밤중에 전화가 울렸고 그는 받지 않기로 했다.',
    rewrites: {
      concise: '한밤중에 전화가 울렸다. 그는 받지 않았다.',
      periodic: '모두가 잠든 깊은 밤, 어둠 속에서 느닷없이 울리기 시작한 전화벨 소리에 그는 잠시 천장을 응시했으나, 그 너머에 어떤 소식이 기다리고 있을지를 짐작하면서도, 끝내 수화기를 들지 않기로 마음먹었다.',
      hardboiled: '전화가 울렸다. 새벽 세 시였다. 그는 손을 뻗다 말았다. 다시 울렸다. 그는 돌아누웠다.',
      lyric: '어둠 속에서 전화벨이 가느다란 빛처럼 떨려 울렸지만, 그는 그 소리를 밤의 한 자락인 양 가만히 흘려보냈다.',
      humor: '한밤중에 전화가 울렸다. 그는 받지 않기로 했다. 이 시간에 거는 사람은 빚쟁이거나 잘못 건 사람, 둘 중 하나니까.',
      cynic: '한밤중에 전화가 울렸다. 그는 받지 않았다. 좋은 소식이 새벽 세 시에 전화로 오는 일 따위는 없으니까.',
      plain: '한밤중에 전화가 울렸다. 그는 전화를 받지 않기로 했다.',
      baroque: '온 세상이 침묵에 잠긴 그 깊은 밤, 어둠의 장막을 찢으며 날카롭게 울려 퍼지는 전화벨 소리 앞에서, 그는 가슴을 두드리는 불안과 거역할 수 없는 예감 사이에서, 끝내 그 부름을 외면하기로 결심하였다.',
      staccato: '벨. 새벽. 또 벨. 그가 멈췄다. 손. 거두었다. 침묵.',
      stream: '전화가 우네 이 시간에 누구지 받을까 말까 받으면 또 그 얘기겠지 안 받으면 마음이 무겁고 받으면 더 무겁고 벨소리가 어둠을 긁고 그냥 자자 그냥...',
      epistle: '그날 밤 전화가 울렸을 때, 당신 생각을 했답니다. 그래서 차마, 받지 못했지요.',
      epic: '그 한 통의 전화를 받지 않기로 한 밤으로부터, 그의 인생은 결코 되돌릴 수 없는 다른 강을 따라 흘러가기 시작했다.',
    },
  },
  {
    id: 'first-snow',
    source: '첫눈이 내리자 아이들이 마당으로 뛰어나왔다.',
    rewrites: {
      concise: '첫눈이 내렸다. 아이들이 마당으로 뛰어나왔다.',
      periodic: '간밤부터 조짐을 보이던 하늘이 마침내 그해 첫눈을 흩뿌리기 시작하자, 창에 코를 박은 채 그 순간만을 기다려 온 아이들은 신발도 제대로 꿰지 못한 채 일제히 마당으로 환호하며 뛰어나왔다.',
      hardboiled: '눈이 내렸다. 올해 첫눈이었다. 문이 열렸다. 아이들이 쏟아져 나왔다.',
      lyric: '하늘에서 흰 꽃잎 같은 첫눈이 내려앉자, 아이들의 웃음소리가 그 위로 종소리처럼 흩어졌다.',
      humor: '첫눈이 내리자 아이들이 마당으로 뛰어나왔고, 어른들은 출근길 빙판을 걱정하며 한숨을 내쉬었다.',
      cynic: '첫눈이 내리자 아이들이 환호하며 뛰어나왔다. 그 눈을 치울 사람이 누구인지는 아직 아무도 모른다는 듯이.',
      plain: '첫눈이 내리자 아이들이 마당으로 뛰어나왔다.',
      baroque: '잿빛 하늘이 비로소 그해의 첫 은빛 선물을 풀어 헤치던 순간, 기다림에 지친 아이들은 환호성과 함께, 마치 봇물이 터지듯 일제히 마당으로 쏟아져 나왔다.',
      staccato: '눈. 첫눈. 문. 쾅. 아이들. 와르르. 마당.',
      stream: '눈이다 첫눈이야 하얗다 차갑겠지 손 시리겠지 그래도 좋아 빨리 나가자 신발 어디 갔지 마당이 하얗다 발자국을 내야지 제일 먼저...',
      epistle: '오늘 첫눈이 내렸답니다. 아이들이 마당으로 뛰어나가는 걸 보며, 어릴 적 당신과 나를 떠올렸지요.',
      epic: '그해 첫눈이 마당을 하얗게 덮던 날, 까르르 뛰어나온 아이들은 알지 못했다. 그 겨울이 그들의 유년에 마지막으로 내린 눈이 되리라는 것을.',
    },
  },
  {
    id: 'closing-shop',
    source: '오랜 단골 식당이 문을 닫는다는 소식을 들었다.',
    rewrites: {
      concise: '단골 식당이 문을 닫는다. 오늘 들었다.',
      periodic: '이십 년 가까이 끼니마다 드나들며 주인 내외와 정을 나눠 온 그 골목 식당이, 더는 버틸 재간이 없어 이달을 끝으로 문을 닫는다는 소식을, 나는 늦은 점심을 먹으러 들렀다가 비로소 전해 들었다.',
      hardboiled: '단골 식당이 문을 닫는단다. 나는 국밥을 비웠다. 숟가락을 내려놓았다. 값을 치르고 나왔다.',
      lyric: '이십 년 동안 한결같던 그 식당의 불빛이 곧 꺼진다는 말에, 내 안의 한 시절도 함께 등을 내리는 듯했다.',
      humor: '단골 식당이 문을 닫는단다. 내 평생 단골 행세를 했지만 사실 메뉴는 늘 같은 거였다는 게 들통날 일은 이제 없겠다.',
      cynic: '오랜 단골 식당이 문을 닫는단다. 그렇게 자주 갔다면서, 정작 그 집을 살린 적은 없으니 슬퍼할 자격이 있는지 모르겠다.',
      plain: '오랜 단골 식당이 문을 닫는다는 소식을 들었다.',
      baroque: '스무 해 세월의 허기를 달래 주던 그 정겨운 식당이 마침내 마지막 등불을 끄려 한다는 비보 앞에서, 내 가슴속에는 함께 저물어 가는 한 시절의 추억이 노을처럼 붉게 번져 갔다.',
      staccato: '단골 식당. 폐업. 이번 달. 끝. 이십 년. 사라진다.',
      stream: '그 집이 문을 닫는다고 이십 년인데 첫 데이트도 거기였지 김치찌개 그 맛 어디서 또 먹나 주인 아주머니는 어디로 가시려나 골목이 비겠네 자꾸 비네...',
      epistle: '당신과 처음 마주 앉았던 그 식당, 기억하시지요. 그 집이 이달로 문을 닫는다고 합니다. 한 시절이 저무는 것 같아요.',
      epic: '그 골목의 작은 식당이 등불을 끄던 날, 거기 깃들었던 수많은 사람들의 끼니와 이야기와 세월도 함께 어둠 속으로 저물어 갔다.',
    },
  },
  {
    id: 'win-race',
    source: '그는 마지막 코너를 돌아 결승선을 향해 전력으로 달렸다.',
    rewrites: {
      concise: '마지막 코너였다. 그가 결승선으로 달렸다. 전력으로.',
      periodic: '두 다리가 더는 자기 것이 아닌 듯 무거워지고 폐가 불타는 듯한 고통이 밀려오는 와중에도, 오직 결승선의 흰 띠만을 눈에 담은 채, 그는 마지막 코너를 크게 돌아 남은 모든 힘을 한 번에 쏟아부으며 앞으로 내달렸다.',
      hardboiled: '마지막 코너. 그가 돌았다. 다리가 비명을 질렀다. 그는 무시했다. 결승선이 다가왔다.',
      lyric: '마지막 코너를 도는 그의 등 뒤로 함성이 파도처럼 부서지고, 결승선의 흰 띠가 손짓하듯 다가왔다.',
      humor: '그는 마지막 코너를 돌아 전력으로 달렸다. 평소 버스를 놓칠 때 이만큼만 뛰었어도 지각은 없었으리라.',
      cynic: '그는 결승선을 향해 전력으로 달렸다. 일 등에게만 박수가 쏟아진다는 사실을, 이 악물고 달리는 동안만큼은 잊은 채로.',
      plain: '그는 마지막 코너를 돌아 결승선을 향해 전력으로 달렸다.',
      baroque: '온몸의 핏줄이 터질 듯 부풀고 심장이 북처럼 울리는 가운데, 그는 마지막 굽이를 장렬히 돌아, 저 멀리 빛나는 결승선의 흰 띠를 향하여 남은 생의 전부를 쏟아붓듯 질주하였다.',
      staccato: '코너. 돈다. 다리. 폐. 불탄다. 결승선. 코앞. 더. 더!',
      stream: '코너야 돌자 다리가 안 들려 폐가 터질 것 같아 그래도 가야 해 흰 띠가 보여 조금만 조금만 더 함성이 멀어지고 다 멀어지고 오직 저 선만...',
      epistle: '당신이 봐 주었으면 했어요. 마지막 코너를 돌아, 내가 결승선을 향해 얼마나 온 힘을 다해 달렸는지를요.',
      epic: '마지막 코너를 도는 그 순간, 오랜 단련의 세월과 무수한 새벽의 땀이 한 줄기 질주가 되어, 그를 결승선 너머의 운명으로 밀어 보냈다.',
    },
  },
]

// ── 한국어 조사 헬퍼(받침 판별) ────────────────────────────────
// 마지막 한글 음절에 받침이 있는지 판정한다(한글 음절 = 0xAC00~0xD7A3, (code-0xAC00)%28!==0 이면 받침 있음).
function lastHasBatchim(word: string): { has: boolean; jong: number } {
  const w = word.trim()
  for (let i = w.length - 1; i >= 0; i--) {
    const c = w.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) {
      const jong = (c - 0xac00) % 28
      return { has: jong !== 0, jong }
    }
  }
  // 한글이 없으면(숫자/영문 등) 받침 없는 것으로 취급
  return { has: false, jong: 0 }
}
// 을/를
function objMarker(word: string): string { return lastHasBatchim(word).has ? '을' : '를' }
// 이/가
function subjMarker(word: string): string { return lastHasBatchim(word).has ? '이' : '가' }
// 은/는
function topicMarker(word: string): string { return lastHasBatchim(word).has ? '은' : '는' }
// 으로/로 (받침 없거나 ㄹ받침(jong===8)이면 '로')
function dirMarker(word: string): string {
  const { has, jong } = lastHasBatchim(word)
  return !has || jong === 8 ? '로' : '으로'
}

// ── 무작위 문체 문장 생성기 — 독립 슬롯 곱집합 ──────────────────
// 한 문장을 8개의 문법역할 독립 슬롯에서 하나씩 뽑아 조립한다.
// 슬롯 간 의미 전제가 없어 어떻게 섞여도 말이 된다(시간/장소 부사어 → 주어 →
//   심정부사 → 목적어 → ~하다 동사 → 종결어미 → 독립 여운절).
// 동사는 모두 '~하다' 한자어(규칙활용)라 종결어미와 항상 정확히 결합한다.
const GEN = {
  // 시간 부사어(문두). 그대로 쉼표로 잇는다.
  time: [
    '늦은 밤', '이른 새벽', '첫눈 오던 날', '비 내리던 오후', '한낮의 정적 속',
    '노을이 질 무렵', '장마가 시작되던 즈음', '바람이 차던 저녁', '눈발이 흩날리던 아침',
    '매미 울던 한여름', '낙엽이 지던 가을', '서리 내린 새벽', '달이 밝던 밤',
    '안개가 짙던 새벽', '폭염이 가시지 않던 밤', '첫서리가 내리던 날',
    '보름달이 뜨던 저녁', '겨울 문턱의 저녁',
  ], // 18
  // 장소 명사. 뒤에 '에서'를 붙인다.
  place: [
    '텅 빈 창가', '낡은 부둣가', '오래된 골목', '불 꺼진 부엌', '인적 끊긴 정류장',
    '먼지 앉은 서재', '문 닫은 시장', '버려진 간이역', '바람 부는 옥상', '눈 덮인 마당',
    '고요한 강변', '흐릿한 거울 앞', '빗물 고인 마당', '어두운 복도', '잿빛 갯벌',
    '텅 빈 강당', '낯선 여관방', '오래된 다락방',
  ], // 18
  // 주어 명사구. 이/가 조사 자동.
  subj: [
    '늙은 어부', '떠나온 여인', '말 없는 사내', '홀로 남은 아이', '지친 나그네',
    '이름 모를 손님', '돌아온 군인', '늙은 악사', '젖은 우산을 든 노인', '마지막 손님',
    '문상객 하나', '낯선 사내', '지난 계절의 그녀', '오래된 친구', '수척한 청년',
    '웬 노파', '잊힌 시인',
  ], // 17
  // 심정·태도 부사(조사 없음).
  adv: [
    '묵묵히', '오래도록', '천천히', '속절없이', '담담하게', '하염없이', '조심스레',
    '문득', '한참을', '넌지시', '가만히', '애써', '이내', '쓸쓸히', '말없이',
    '지그시', '덤덤하게',
  ], // 17
  // 목적어 명사구. 을/를 조사 자동.
  obj: [
    '지난 약속', '식은 찻잔', '빛바랜 사진', '부치지 못한 편지', '떠난 사람',
    '어긋난 인연', '잊힌 노래', '낡은 외투', '마지막 인사', '텅 빈 의자',
    '오래된 상처', '꺼져 가는 등불', '희미한 기억', '두고 온 우산', '못다 한 말',
    '첫 마음',
  ], // 16
  // 동사 어간(모두 '~하다' 한자어 — 종결어미와 규칙적으로 결합, 모두 목적어를 받는 타동사).
  verb: [
    '응시', '회상', '외면', '음미', '추억', '반추', '관조', '상기',
    '단념', '체념', '갈망', '애도', '추모', '회고', '복기', '상상',
  ], // 16
  // 종결어미('~하다'에 붙는 완결형 어미).
  end: [
    '했다', '하였다', '하고 있었다', '하고 말았다', '하기로 했다', '하는 듯했다',
    '할 뿐이었다', '하곤 했다', '하지 않을 수 없었다', '하고 또 했다', '해 버렸다',
    '하고는 했다', '할 따름이었다', '하기를 멈추지 않았다', '하다 말았다',
    '하고 있었던 것이다',
  ], // 16
  // 독립 여운절(앞 절을 전제하지 않는 완결문 — 어떤 조합과도 충돌 없음).
  tag: [
    '그뿐이었다.', '오래도록 그러했다.', '말은 없었다.', '아무도 몰랐다.',
    '그것으로 족했다.', '돌아오는 것은 없었다.', '시간은 흘렀다.', '대답은 없었다.',
    '그 밤은 길었다.', '후회는 늦었다.', '바람만 불었다.', '등불은 흔들렸다.',
    '문은 닫혀 있었다.', '빗소리만 남았다.', '그러고도 한참이었다.',
  ], // 15
}

// 무작위 문체 문장 조합수(고유 항목 곱집합).
const GEN_COMBOS =
  GEN.time.length * GEN.place.length * GEN.subj.length * GEN.adv.length *
  GEN.obj.length * GEN.verb.length * GEN.end.length * GEN.tag.length

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// 슬롯 하나씩 뽑아 받침에 맞는 조사로 한 문장을 조립한다.
function genSentence(): string {
  const time = pick(GEN.time)
  const place = pick(GEN.place)
  const subj = pick(GEN.subj)
  const adv = pick(GEN.adv)
  const obj = pick(GEN.obj)
  const verb = pick(GEN.verb)
  const end = pick(GEN.end)
  const tag = pick(GEN.tag)
  // [시간], [장소]에서 [주어]이/가 [부사] [목적어]을/를 [동사][어미] [여운절]
  return (
    time + ', ' + place + '에서 ' +
    subj + subjMarker(subj) + ' ' +
    adv + ' ' +
    obj + objMarker(obj) + ' ' +
    verb + end + '. ' +
    tag
  )
}

// 그룹: 어떤 문체에 어떤 클러스터인지(필터용)
const FAMILY: { id: string; label: string; styles: string[] }[] = [
  { id: 'all', label: '전체', styles: STYLES.map((s) => s.id) },
  { id: 'short', label: '짧고 단단한', styles: ['concise', 'staccato', 'hardboiled', 'plain'] },
  { id: 'long', label: '길고 유장한', styles: ['periodic', 'baroque', 'epic', 'stream'] },
  { id: 'warm', label: '서정·정서', styles: ['lyric', 'epistle', 'stream'] },
  { id: 'sharp', label: '비틀고 웃기는', styles: ['humor', 'cynic', 'hardboiled'] },
]

// ── 영속 설정 ──────────────────────────────────────────────────
interface Persist {
  styleId: string
  exampleIdx: number
  family: string
  custom: string        // 사용자가 직접 입력한 원문(있으면 변환 예시는 가이드 텍스트로 대체)
}
const DEFAULTS: Persist = { styleId: 'concise', exampleIdx: 0, family: 'all', custom: '' }

function loadPersist(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>
      return { ...DEFAULTS, ...p }
    }
  } catch { /* noop */ }
  return { ...DEFAULTS }
}

// HTML escape(프로젝트 본문 안전)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 조합 개수: 문체 x 예문 변환 (변환 카드 총 가짓수)
const COMBO_COUNT = STYLES.length * EXAMPLES.length

export default function ProseStyleEmulator({ payload }: { payload?: Record<string, unknown> }) {
  const init = useMemo(loadPersist, [])
  const [styleId, setStyleId] = useState(init.styleId)
  const [exampleIdx, setExampleIdx] = useState(init.exampleIdx)
  const [family, setFamily] = useState(init.family)
  const [custom, setCustom] = useState(init.custom)
  const [search, setSearch] = useState('')
  const [compareAll, setCompareAll] = useState(false)
  const [gens, setGens] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // 페이로드: 다른 도구에서 텍스트를 넘겨받으면 사용자 원문으로
  useEffect(() => {
    const incoming = (payload && (payload.text || payload.body || payload.source)) as string | undefined
    if (typeof incoming === 'string' && incoming.trim()) {
      setCustom(incoming.trim().slice(0, 400))
    }
  }, [payload])

  // 영속 저장
  useEffect(() => {
    const data: Persist = { styleId, exampleIdx, family, custom }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* noop */ }
  }, [styleId, exampleIdx, family, custom])

  // 언마운트 정리(토스트 타이머)
  useEffect(() => {
    return () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1600)
  }

  const copy = (text: string, label = '복사했습니다') => {
    try {
      navigator.clipboard.writeText(text).then(
        () => flash(label),
        () => flash('복사 실패'),
      )
    } catch { flash('복사 실패') }
  }

  const style = useMemo(() => STYLES.find((s) => s.id === styleId) || STYLES[0], [styleId])
  const example = EXAMPLES[Math.min(exampleIdx, EXAMPLES.length - 1)]

  // 패밀리 + 검색으로 거른 문체 목록
  const fam = FAMILY.find((f) => f.id === family) || FAMILY[0]
  const visibleStyles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return STYLES.filter((s) => {
      if (!fam.styles.includes(s.id)) return false
      if (!q) return true
      const hay = (s.name + ' ' + s.tag + ' ' + s.feel + ' ' + s.traits.join(' ') + ' ' + s.vocab.join(' ')).toLowerCase()
      return hay.includes(q)
    })
  }, [fam, search])

  // 선택 문체가 필터에서 사라지면 보이는 첫 항목으로 이동
  useEffect(() => {
    if (visibleStyles.length && !visibleStyles.some((s) => s.id === styleId)) {
      setStyleId(visibleStyles[0].id)
    }
  }, [visibleStyles, styleId])

  const rewriteFor = (sid: string) => example.rewrites[sid] || ''
  const currentRewrite = rewriteFor(styleId)

  // 처방 텍스트(복사/내보내기용)
  const prescriptionText = () => {
    const lines: string[] = []
    lines.push('[문체 처방] ' + style.name + ' — ' + style.tag)
    lines.push('권장 문장 길이: ' + style.sentLen)
    lines.push('리듬/호흡: ' + style.rhythm)
    lines.push('어휘·정서의 결: ' + style.feel)
    lines.push('')
    lines.push('특징')
    style.traits.forEach((t) => lines.push('- ' + t))
    lines.push('')
    lines.push('즐겨 쓰는 어휘: ' + style.vocab.join(', '))
    lines.push('즐겨 쓰는 기법: ' + style.devices.join(', '))
    lines.push('피할 것: ' + style.avoid.join(', '))
    lines.push('')
    lines.push('변환 예시')
    lines.push('원문: ' + example.source)
    lines.push(style.name + ': ' + currentRewrite)
    return lines.join('\n')
  }

  const prescriptionHtml = () => {
    const li = (arr: string[]) => arr.map((x) => '<li>' + esc(x) + '</li>').join('')
    return [
      '<h2>' + esc(style.name) + ' — ' + esc(style.tag) + '</h2>',
      '<p><strong>권장 문장 길이</strong>: ' + esc(style.sentLen) + '</p>',
      '<p><strong>리듬/호흡</strong>: ' + esc(style.rhythm) + '</p>',
      '<p><strong>어휘·정서의 결</strong>: ' + esc(style.feel) + '</p>',
      '<h3>특징</h3><ul>' + li(style.traits) + '</ul>',
      '<p><strong>즐겨 쓰는 어휘</strong>: ' + esc(style.vocab.join(', ')) + '</p>',
      '<p><strong>즐겨 쓰는 기법</strong>: ' + esc(style.devices.join(', ')) + '</p>',
      '<p><strong>피할 것</strong>: ' + esc(style.avoid.join(', ')) + '</p>',
      '<h3>변환 예시</h3>',
      '<p><em>원문</em>: ' + esc(example.source) + '</p>',
      '<p><strong>' + esc(style.name) + '</strong>: ' + esc(currentRewrite) + '</p>',
    ].join('')
  }

  const randomExample = () => {
    if (EXAMPLES.length <= 1) return
    let n = exampleIdx
    while (n === exampleIdx) n = Math.floor(Math.random() * EXAMPLES.length)
    setExampleIdx(n)
  }
  const randomStyle = () => {
    const pool = visibleStyles.length ? visibleStyles : STYLES
    if (pool.length <= 1) { if (pool[0]) setStyleId(pool[0].id); return }
    let s = styleId
    while (s === styleId) s = pool[Math.floor(Math.random() * pool.length)].id
    setStyleId(s)
  }
  // 무작위 문체 문장 5개 생성(독립 슬롯 곱집합)
  const rollSentences = () => {
    const out: string[] = []
    for (let i = 0; i < 5; i++) out.push(genSentence())
    setGens(out)
  }

  // ── 스타일 토큰 ──────────────────────────────────────────────
  const minibtn: React.CSSProperties = {
    fontSize: 12, padding: '4px 9px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)',
  }
  const primaryBtn: React.CSSProperties = {
    ...minibtn, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', fontWeight: 600,
  }
  const linkBtn: React.CSSProperties = {
    ...minibtn, background: 'transparent', borderStyle: 'dashed', color: 'var(--accent)',
  }
  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--text)',
    fontWeight: active ? 700 : 400,
  })
  const card: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: 12,
  }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', fontSize: 13 }}>
      {/* 헤더 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}><Emoji e="🎭"/> 문체 처방기</strong>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            문체 {STYLES.length}종 · 예문 {EXAMPLES.length}개 · 변환 카드 {COMBO_COUNT}가지 · 무작위 문장 {GEN_COMBOS.toLocaleString()}조합
          </span>
          <span style={{ flex: 1 }} />
          <button style={minibtn} onClick={() => setCompareAll((v) => !v)} title="모든 문체 변환을 한 번에 비교">
            {compareAll ? '◧ 처방 보기' : '⊞ 전체 비교'}
          </button>
        </div>
        {/* 패밀리 필터 + 검색 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {FAMILY.map((f) => (
            <button key={f.id} style={chip(family === f.id)} onClick={() => setFamily(f.id)}>{f.label}</button>
          ))}
          <span style={{ flex: 1 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="문체 검색"
            style={{
              fontSize: 12, padding: '5px 9px', borderRadius: 7, width: 130,
              border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)',
            }}
          />
        </div>
        {/* 문체 선택 칩 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {visibleStyles.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>검색 결과가 없습니다.</span>
          )}
          {visibleStyles.map((s) => (
            <button key={s.id} style={chip(styleId === s.id)} onClick={() => setStyleId(s.id)}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!compareAll ? (
          <>
            {/* 처방 카드 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}><Emoji e={style.icon}/></span>
                <strong style={{ fontSize: 16 }}>{style.name}</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{style.tag}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--paper)' }}>
                  <div style={label}>권장 문장 길이</div>
                  <div>{style.sentLen}</div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--paper)' }}>
                  <div style={label}>리듬 · 호흡</div>
                  <div>{style.rhythm}</div>
                </div>
                <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--paper)' }}>
                  <div style={label}>어휘 · 정서의 결</div>
                  <div>{style.feel}</div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>특징</div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                  {style.traits.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <div>
                  <span style={{ ...label, display: 'inline' }}>즐겨 쓰는 어휘 </span>
                  {style.vocab.map((v, i) => (
                    <span key={i} style={{ display: 'inline-block', fontSize: 11, padding: '2px 7px', margin: '2px 3px 0 0', borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--border)' }}>{v}</span>
                  ))}
                </div>
                <div>
                  <span style={{ ...label, display: 'inline' }}>즐겨 쓰는 기법 </span>
                  {style.devices.map((v, i) => (
                    <span key={i} style={{ display: 'inline-block', fontSize: 11, padding: '2px 7px', margin: '2px 3px 0 0', borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--border)' }}>{v}</span>
                  ))}
                </div>
                <div>
                  <span style={{ ...label, display: 'inline', color: '#c0392b' }}>피할 것 </span>
                  {style.avoid.map((v, i) => (
                    <span key={i} style={{ display: 'inline-block', fontSize: 11, padding: '2px 7px', margin: '2px 3px 0 0', borderRadius: 999, background: 'var(--paper)', border: '1px dashed #c0392b', color: '#c0392b' }}>{v}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <button style={minibtn} onClick={() => copy(prescriptionText(), '처방을 복사했습니다')}><Emoji e="📋"/> 처방 복사</button>
                <button style={minibtn} onClick={() => { addToLibrary('snippets', { text: prescriptionText(), tags: ['문체', style.name] }); flash('스니펫에 담았습니다') }}><Emoji e="🧩"/> 스니펫</button>
                {hasStash() && (
                  <button style={minibtn} onClick={() => { addToStash({ kind: 'note', label: '문체 처방 · ' + style.name, text: prescriptionText() }); flash('수집함에 담았습니다') }}><Emoji e="📎"/> 수집함</button>
                )}
                {hasProjectBridge() && (
                  <button style={primaryBtn} onClick={() => { addToProject({ root: 'research', folder: '문체 처방', title: '문체 · ' + style.name, bodyHtml: prescriptionHtml() }); flash('프로젝트에 추가했습니다') }}><Emoji e="📄"/> 프로젝트에 추가</button>
                )}
                <button style={linkBtn} onClick={() => openToolLinked('prose-rhythm', { text: currentRewrite })} title="문장 리듬을 소리로 들어 보기"><Emoji e="🎼"/> 문장 리듬 연주 열기</button>
              </div>
            </div>

            {/* 변환 예시 카드 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>같은 문장, {style.name}로 고쳐 쓰기</strong>
                <span style={{ flex: 1 }} />
                <button style={minibtn} onClick={randomExample} title="다른 예문으로"><Emoji e="🎲"/> 다른 예문</button>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{exampleIdx + 1} / {EXAMPLES.length}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>원문 (중립)</div>
                <div style={{ padding: 9, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)', lineHeight: 1.6, color: 'var(--muted)' }}>
                  {example.source}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={label}><Emoji e={style.icon}/> {style.name}로</div>
                <div style={{ padding: 11, borderRadius: 8, background: 'var(--paper)', border: '2px solid var(--accent)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {currentRewrite}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button style={minibtn} onClick={() => copy(currentRewrite, '변환 문장을 복사했습니다')}><Emoji e="📋"/> 복사</button>
                  <button style={minibtn} onClick={() => { addToLibrary('snippets', { text: currentRewrite, tags: ['문체변환', style.name] }); flash('스니펫에 담았습니다') }}><Emoji e="🧩"/> 스니펫</button>
                  {hasStash() && (
                    <button style={minibtn} onClick={() => { addToStash({ kind: 'note', label: style.name + ' 변환', text: currentRewrite }); flash('수집함에 담았습니다') }}><Emoji e="📎"/> 수집함</button>
                  )}
                  {hasProjectBridge() && (
                    <button style={minibtn} onClick={() => { addToProject({ root: 'research', folder: '문체 처방', title: style.name + ' 변환 예시', bodyHtml: '<p><em>원문</em>: ' + esc(example.source) + '</p><p><strong>' + esc(style.name) + '</strong>: ' + esc(currentRewrite) + '</p>' }); flash('프로젝트에 추가했습니다') }}><Emoji e="📄"/> 프로젝트</button>
                  )}
                </div>
              </div>

              {/* 직접 처방: 내 문장으로 연습하기 */}
              <div style={{ marginTop: 12, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                <div style={label}>내 문장으로 연습 (이 문체의 처방을 적용해 직접 고쳐 보세요)</div>
                <textarea
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="고쳐 쓰고 싶은 내 문장을 붙여넣어 보세요. 위 처방(문장 길이·리듬·어휘·피할 것)을 점검표로 삼아 손보면 됩니다."
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: 4,
                    fontSize: 13, lineHeight: 1.6, padding: 9, borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)',
                  }}
                />
                {custom.trim() && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
                      글자수 {custom.replace(/\s/g, '').length} · 점검: {style.sentLen}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button style={minibtn} onClick={() => copy(custom, '내 문장을 복사했습니다')}><Emoji e="📋"/> 복사</button>
                    <button style={linkBtn} onClick={() => openToolLinked('prose-rhythm', { text: custom })}><Emoji e="🎼"/> 리듬으로 듣기</button>
                  </div>
                )}
              </div>
            </div>

            {/* 무작위 문체 문장 생성기 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}><Emoji e="🎰"/> 무작위 문체 문장 생성</strong>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>독립 슬롯 곱집합 {GEN_COMBOS.toLocaleString()}가지</span>
                <span style={{ flex: 1 }} />
                <button style={primaryBtn} onClick={rollSentences}><Emoji e="🎲"/> 5문장 뽑기</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
                시간 · 장소 · 인물 · 심정 · 대상 · 동사 · 종결 · 여운, 여덟 자리를 독립으로 굴려 한 문장을 만듭니다.
                조사(이/가·을/를)는 받침을 보고 자동으로 골라 붙입니다. 마음에 드는 문장을 변주의 씨앗으로 삼으세요.
              </div>
              {gens.length === 0 ? (
                <div style={{ marginTop: 10, padding: 11, borderRadius: 8, background: 'var(--paper)', border: '1px dashed var(--border)', fontSize: 12, color: 'var(--muted)' }}>
                  '5문장 뽑기'를 눌러 무작위 문장을 받아 보세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {gens.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: 9, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, lineHeight: 1.7 }}>{g}</div>
                      <button style={minibtn} onClick={() => copy(g, '문장을 복사했습니다')} title="복사"><Emoji e="📋"/></button>
                      <button style={linkBtn} onClick={() => setCustom(g)} title="아래 연습칸으로 보내기"><Emoji e="✍️"/></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <button style={minibtn} onClick={() => copy(gens.join('\n'), '생성 문장을 모두 복사했습니다')}><Emoji e="📋"/> 전체 복사</button>
                    {hasStash() && (
                      <button style={minibtn} onClick={() => { addToStash({ kind: 'note', label: '무작위 문체 문장', text: gens.join('\n') }); flash('수집함에 담았습니다') }}><Emoji e="📎"/> 수집함</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* 전체 비교 모드 */
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>한 문장, {STYLES.length}가지 문체로</strong>
              <span style={{ flex: 1 }} />
              <button style={minibtn} onClick={randomExample}><Emoji e="🎲"/> 다른 예문</button>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{exampleIdx + 1} / {EXAMPLES.length}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={label}>원문 (중립)</div>
              <div style={{ padding: 9, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)', lineHeight: 1.6, color: 'var(--muted)' }}>
                {example.source}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {STYLES.map((s) => {
                const rw = example.rewrites[s.id] || ''
                const active = s.id === styleId
                return (
                  <div key={s.id} style={{ border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, padding: 9, background: 'var(--paper)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button style={chip(active)} onClick={() => { setStyleId(s.id); setCompareAll(false) }} title="이 문체 처방 보기"><Emoji e={s.icon}/> {s.name}</button>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.sentLen}</span>
                      <span style={{ flex: 1 }} />
                      <button style={minibtn} onClick={() => copy(rw, s.name + ' 변환을 복사했습니다')}><Emoji e="📋"/></button>
                    </div>
                    <div style={{ marginTop: 6, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rw}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={minibtn} onClick={() => {
                const all = ['원문: ' + example.source, ''].concat(STYLES.map((s) => s.name + ': ' + (example.rewrites[s.id] || ''))).join('\n')
                copy(all, '전체 비교를 복사했습니다')
              }}><Emoji e="📋"/> 전체 복사</button>
              {hasProjectBridge() && (
                <button style={primaryBtn} onClick={() => {
                  const body = '<p><em>원문</em>: ' + esc(example.source) + '</p>' + STYLES.map((s) => '<p><strong>' + esc(s.name) + '</strong>: ' + esc(example.rewrites[s.id] || '') + '</p>').join('')
                  addToProject({ root: 'research', folder: '문체 처방', title: '문체 비교 · ' + example.source.slice(0, 14), bodyHtml: body })
                  flash('프로젝트에 추가했습니다')
                }}><Emoji e="📄"/> 비교표 프로젝트에 추가</button>
              )}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, padding: '0 2px' }}>
          처방은 절대 규칙이 아니라 방향입니다. 한 글 안에서도 장면에 따라 문체를 갈아입어 보세요.
          긴장은 단문(간결·스타카토), 사색은 만연·서정, 거리감은 하드보일드·냉소가 어울립니다.
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ok, #2e7d32)', color: '#fff', padding: '7px 14px', borderRadius: 8,
          fontSize: 12, boxShadow: '0 2px 10px rgba(0,0,0,.25)', pointerEvents: 'none', zIndex: 5,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
