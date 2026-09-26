// 보여주기 변환기(Show, Don't Tell) — 감정어를 "설명"하지 말고 "보여주기".
//   감정(분노·불안·사랑·수치·슬픔·공포·기쁨 등 20+)을 고르면, 그 감정이 드러나는
//   신체 반응·표정·행동·내적 감각·생각의 묘사 단서를 Emotion Thesaurus 방식으로 모아 제시한다.
//   또한 본문을 붙여넣으면 "telling" 감정어("그는 화가 났다" 등)를 탐지해 보여주기로 바꿀 후보를 짚어준다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·라이브러리 불필요(100% 로컬 사전).
//   localStorage('sry:tool:show-dont-tell')에 입력 본문·선택 감정 자동 저장/복원. 저장은 공유 라이브러리(스니펫).
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'show-dont-tell', name: '보여주기 변환기', icon: '🎭', group: '교정·언어', intro: '감정을 고르면 신체 반응·표정·행동·생각의 묘사 단서를 제시하고, 본문 속 telling 감정어도 짚어줍니다', w: 560, h: 680 }

const LS = 'sry:tool:show-dont-tell'

// 묘사 단서의 다섯 축(Emotion Thesaurus 방식)
const FACETS = [
  { key: 'body', label: '신체 반응', icon: '💢', desc: '몸이 보이는 생리적 반응' },
  { key: 'face', label: '표정·몸짓', icon: '😶', desc: '얼굴·자세로 드러나는 단서' },
  { key: 'action', label: '행동', icon: '🏃', desc: '인물이 하는 행동·반응' },
  { key: 'inner', label: '내적 감각', icon: '🫀', desc: '인물이 안에서 느끼는 감각' },
  { key: 'thought', label: '생각·내면', icon: '💭', desc: '머릿속에 스치는 말·판단' },
] as const
type Facet = (typeof FACETS)[number]['key']

interface Emotion {
  key: string
  name: string
  icon: string
  // "telling"으로 흔히 쓰이는 형용/서술 어휘(탐지·치환 대상). 부분일치로 본문에서 찾는다.
  tells: string[]
  body: string[]
  face: string[]
  action: string[]
  inner: string[]
  thought: string[]
}

// 감정 22종 — 각 감정마다 다섯 축의 묘사 단서를 충분히. 전부 직접 쓴 창작 텍스트(저작권 안전).
const EMOTIONS: Emotion[] = [
  {
    key: 'anger', name: '분노', icon: '😡',
    tells: ['화가 났다', '화가 치밀', '분노했다', '분노가', '화났다', '열받', '분이', '격분', '노발대발'],
    body: ['관자놀이에 핏대가 솟았다', '턱 근육이 딱딱하게 굳었다', '귀밑까지 뜨겁게 달아올랐다', '손등에 핏줄이 불거졌다', '호흡이 짧고 거칠어졌다'],
    face: ['눈썹이 한가운데로 모였다', '콧잔등에 주름이 잡혔다', '입술이 한 일자로 다물렸다', '눈을 가늘게 뜨고 노려봤다', '얼굴이 벌겋게 상기됐다'],
    action: ['문을 쾅 닫고 나갔다', '주먹으로 책상을 내리쳤다', '쥐고 있던 종이를 구겨버렸다', '의자를 거칠게 밀어냈다', '상대의 말을 끊고 목소리를 높였다'],
    inner: ['뱃속에서 뜨거운 것이 치솟았다', '온몸의 피가 머리로 쏠리는 느낌', '목구멍까지 무언가 욱여 올라왔다', '가슴이 압력솥처럼 부글거렸다', '손끝이 떨릴 만큼 힘이 들어갔다'],
    thought: ['어떻게 나한테 이럴 수 있지', '한마디만 더 하면 참지 않겠어', '여기서 끝내지 않겠다고 다짐했다', '이건 명백한 모욕이었다', '용서할 생각 따위 없었다'],
  },
  {
    key: 'anxiety', name: '불안', icon: '😰',
    tells: ['불안했다', '불안해', '초조했다', '초조해', '안절부절', '걱정', '조마조마', '마음을 졸'],
    body: ['손바닥에 땀이 배어 나왔다', '심장이 평소보다 빠르게 뛰었다', '명치가 묵직하게 조여왔다', '입안이 바싹 말랐다', '어깨가 귀까지 솟아 있었다'],
    face: ['아랫입술을 자꾸 깨물었다', '시선이 한곳에 머물지 못했다', '미간에 옅은 주름이 잡혔다', '눈을 자주 깜빡였다', '억지로 지은 미소가 어색하게 흔들렸다'],
    action: ['손톱 끝을 만지작거렸다', '같은 자리를 의미 없이 서성였다', '휴대폰을 켰다 껐다 반복했다', '문 쪽을 자꾸 돌아봤다', '필요도 없는 짐을 정리하기 시작했다'],
    inner: ['뱃속이 허하게 가라앉았다', '숨을 깊이 들이쉬어도 채워지지 않았다', '온몸이 미세하게 떨려왔다', '귀가 멍하니 먼 소리만 들렸다', '발끝부터 서늘한 기운이 올라왔다'],
    thought: ['뭔가 잘못된 게 분명했다', '괜찮다고 되뇌었지만 믿기지 않았다', '최악의 장면이 자꾸 떠올랐다', '내가 무얼 놓친 건 아닐까', '시간이 너무 느리게 갔다'],
  },
  {
    key: 'love', name: '사랑', icon: '🥰',
    tells: ['사랑했다', '사랑해', '좋아했다', '반했다', '연모', '애틋', '설레', '사모'],
    body: ['상대를 볼 때마다 입꼬리가 저절로 올라갔다', '뺨이 은근하게 달아올랐다', '심장이 한 박자 빨리 뛰었다', '목소리가 평소보다 부드러워졌다', '손끝이 닿을 듯 가까워졌다'],
    face: ['눈매가 한없이 풀어졌다', '상대의 작은 농담에도 환하게 웃었다', '말없이 오래 바라보았다', '시선이 자꾸 그쪽으로 흘러갔다', '눈동자에 잔잔한 빛이 돌았다'],
    action: ['상대가 좋아할 것을 슬쩍 챙겨두었다', '먼저 우산을 그쪽으로 기울였다', '대화가 끝나는 게 아쉬워 말을 늘였다', '돌아가는 뒷모습을 오래 지켜봤다', '사소한 말도 잊지 않고 기억해뒀다'],
    inner: ['가슴 한쪽이 따뜻하게 차올랐다', '온몸이 간질간질한 기분이었다', '시간이 둘 사이에서만 천천히 흘렀다', '그 사람 곁에선 숨이 편안해졌다', '괜히 마음이 들떠 발끝이 가벼웠다'],
    thought: ['이 사람이라면 괜찮을 것 같았다', '하루 종일 그 얼굴이 떠올랐다', '오래 곁에 있고 싶다고 생각했다', '내일 또 볼 수 있을까 헤아렸다', '이런 게 좋아하는 마음이구나 싶었다'],
  },
  {
    key: 'shame', name: '수치', icon: '😳',
    tells: ['창피했다', '부끄러웠다', '수치스러', '민망했다', '쥐구멍', '낯이 뜨거', '망신'],
    body: ['귀 끝까지 화끈하게 달아올랐다', '얼굴이 순식간에 새빨개졌다', '목덜미가 뜨겁게 달궈졌다', '식은땀이 등을 타고 흘렀다', '말이 목에 걸려 나오지 않았다'],
    face: ['시선을 바닥으로 떨궜다', '고개를 푹 숙였다', '입술을 어색하게 깨물었다', '눈을 마주치지 못하고 피했다', '억지웃음으로 상황을 넘기려 했다'],
    action: ['손으로 얼굴을 가렸다', '괜히 머리카락을 만지작거렸다', '그 자리를 서둘러 벗어났다', '아무 일 없는 척 다른 곳을 봤다', '변명을 더듬더듬 늘어놓았다'],
    inner: ['바닥이 꺼져 사라지고 싶었다', '온몸이 뜨겁게 졸아드는 기분이었다', '심장이 부끄러움에 쿵쿵 뛰었다', '귓가에 사람들의 시선이 따갑게 박혔다', '속이 오그라드는 듯했다'],
    thought: ['아무도 못 봤기를 빌었다', '왜 하필 그런 말을 했을까', '지금 당장 사라지고 싶었다', '두고두고 떠오를 게 분명했다', '얼굴을 들 수가 없었다'],
  },
  {
    key: 'sadness', name: '슬픔', icon: '😢',
    tells: ['슬펐다', '슬퍼', '서글펐다', '비통', '서러웠다', '울적', '침울', '눈물이 났다'],
    body: ['눈가가 뜨거워지며 시야가 흐려졌다', '목이 콱 잠겨 말이 나오지 않았다', '어깨가 천천히 처졌다', '입꼬리가 아래로 무겁게 끌려 내려갔다', '호흡이 잘게 떨려 끊겼다'],
    face: ['눈을 깜빡일 때마다 물기가 맺혔다', '아랫입술이 가늘게 떨렸다', '시선이 초점 없이 한곳에 멈췄다', '미간이 안쓰럽게 좁혀졌다', '말없이 고개를 떨궜다'],
    action: ['소매로 눈가를 슬쩍 닦았다', '무릎을 끌어안고 웅크렸다', '아무 말 없이 자리를 떴다', '괜히 창밖만 오래 바라봤다', '음식을 앞에 두고도 손을 대지 못했다'],
    inner: ['가슴 한가운데가 묵직하게 내려앉았다', '온몸에서 힘이 빠져나갔다', '속이 텅 빈 듯 허전했다', '숨을 쉴 때마다 가슴이 결렸다', '눈물을 삼키느라 목이 아팠다'],
    thought: ['이제 다시는 돌아오지 않는다는 게 실감 났다', '왜 더 잘해주지 못했을까', '아무것도 손에 잡히지 않았다', '시간이 멈췄으면 싶었다', '혼자 남겨진 기분이었다'],
  },
  {
    key: 'fear', name: '공포', icon: '😱',
    tells: ['무서웠다', '두려웠다', '겁이 났다', '공포', '오싹', '소름', '겁먹', '질겁'],
    body: ['등줄기를 따라 식은땀이 흘렀다', '심장이 갈비뼈를 때릴 듯 뛰었다', '다리가 후들거려 힘이 풀렸다', '손가락 하나 까딱할 수 없었다', '숨이 얕고 빠르게 몰아쳤다'],
    face: ['눈을 크게 뜨고 한곳을 응시했다', '얼굴에서 핏기가 싹 가셨다', '입이 반쯤 벌어진 채 굳었다', '동공이 미세하게 흔들렸다', '턱이 덜덜 떨렸다'],
    action: ['저도 모르게 뒷걸음질 쳤다', '벽에 등을 바짝 붙였다', '소리가 난 쪽을 향해 굳어버렸다', '문고리를 더듬어 찾았다', '숨을 죽이고 미동도 하지 않았다'],
    inner: ['온몸의 털이 곤두서는 느낌이었다', '뱃속이 차갑게 얼어붙었다', '귓속에서 제 심장 소리만 크게 울렸다', '발밑이 꺼지는 듯했다', '식은 공기가 목덜미를 스쳤다'],
    thought: ['여기서 빠져나가야 한다는 생각뿐이었다', '제발 아무 일도 없기를 빌었다', '소리를 지르고 싶었지만 나오지 않았다', '무언가 잘못됐다는 직감이 들었다', '돌아보면 안 된다고 스스로 다그쳤다'],
  },
  {
    key: 'joy', name: '기쁨', icon: '😄',
    tells: ['기뻤다', '기뻐', '행복했다', '신났다', '들떴다', '환호', '날아갈', '뛸 듯이'],
    body: ['저절로 웃음이 터져 나왔다', '가슴이 풍선처럼 부풀어 올랐다', '발끝이 들썩일 만큼 들떴다', '온몸에 따뜻한 기운이 돌았다', '목소리가 한 톤 높아졌다'],
    face: ['눈가에 잔주름이 잡히도록 웃었다', '입이 귀에 걸렸다', '눈동자가 반짝반짝 빛났다', '볼이 발그레하게 상기됐다', '미소를 참으려다 결국 터뜨렸다'],
    action: ['두 팔을 번쩍 들어 올렸다', '곁에 있는 사람을 와락 끌어안았다', '제자리에서 폴짝 뛰었다', '소식을 알리려 곧장 전화를 걸었다', '콧노래가 절로 흘러나왔다'],
    inner: ['가슴이 벅차 숨이 가빠질 정도였다', '온몸에 전류가 흐르는 듯했다', '발이 땅에 닿지 않는 기분이었다', '속에서 환한 빛이 차오르는 듯했다', '웃음이 멈추질 않았다'],
    thought: ['드디어 해냈다는 실감이 밀려왔다', '이 순간을 영원히 기억하고 싶었다', '꿈이 아닐까 몇 번이고 되물었다', '모두에게 자랑하고 싶었다', '오늘만큼은 무엇이든 할 수 있을 것 같았다'],
  },
  {
    key: 'jealousy', name: '질투', icon: '😒',
    tells: ['질투했다', '질투가', '시샘', '부러웠다', '샘이 났다', '배가 아', '시기'],
    body: ['속이 뒤틀리며 명치가 조였다', '입안에 쓴맛이 돌았다', '미간이 저절로 찌푸려졌다', '손에 괜히 힘이 들어갔다', '가슴 한쪽이 따끔하게 결렸다'],
    face: ['상대를 곁눈질로 흘겨봤다', '억지로 웃었지만 눈은 차가웠다', '입술을 비죽 내밀었다', '시선을 일부러 다른 데로 돌렸다', '표정이 미묘하게 굳었다'],
    action: ['축하의 말을 건성으로 내뱉었다', '상대의 단점을 굳이 들춰냈다', '대화에서 슬그머니 빠졌다', '자기 것을 괜히 더 치켜세웠다', '그 자리를 핑계 대고 떠났다'],
    inner: ['뱃속에서 시큼한 것이 끓어올랐다', '왜 나는 아닐까 하는 생각에 속이 쓰렸다', '가슴이 좁아지는 듯 답답했다', '자꾸만 비교하게 되는 자신이 미웠다', '인정하기 싫은 마음이 목에 걸렸다'],
    thought: ['저게 뭐 그리 대단하냐고 깎아내렸다', '나라면 더 잘했을 거라고 생각했다', '왜 늘 저 사람만 잘되는 걸까', '겉으론 웃으며 속으론 인정하지 않았다', '내 차례는 언제 오는 걸까 헤아렸다'],
  },
  {
    key: 'disgust', name: '혐오', icon: '🤢',
    tells: ['역겨웠다', '혐오', '구역질', '메스꺼', '징그러', '넌더리', '진저리'],
    body: ['속이 울렁거리며 구역질이 올라왔다', '코를 찡그리며 숨을 참았다', '온몸에 소름이 돋았다', '입가가 일그러졌다', '저절로 몸이 움찔 물러났다'],
    face: ['콧잔등에 깊은 주름이 잡혔다', '입꼬리가 아래로 비틀렸다', '눈을 질끈 감았다', '인상을 잔뜩 구겼다', '혀를 차며 고개를 돌렸다'],
    action: ['손사래를 치며 거리를 뒀다', '코를 막고 한 발 물러섰다', '눈앞의 것을 멀찍이 밀어냈다', '서둘러 그 자리를 벗어났다', '소매로 입을 가렸다'],
    inner: ['위가 거꾸로 뒤집히는 듯했다', '목구멍 안쪽이 따끔하게 조였다', '온몸이 거부 반응으로 굳었다', '피부가 오싹하게 곤두섰다', '입안에 신물이 고였다'],
    thought: ['두 번 다시 보고 싶지 않았다', '저것만은 견딜 수 없었다', '어떻게 저럴 수 있나 싶었다', '당장 씻어내고 싶었다', '생각만 해도 진저리가 났다'],
  },
  {
    key: 'surprise', name: '놀람', icon: '😲',
    tells: ['놀랐다', '놀라', '깜짝', '경악', '기겁', '소스라', '아연실색'],
    body: ['숨이 턱 막혔다', '심장이 한 박자 멎었다 다시 뛰었다', '온몸이 순간 굳었다', '들고 있던 것을 떨어뜨릴 뻔했다', '어깨가 움찔 솟았다'],
    face: ['눈이 휘둥그레졌다', '입이 절로 벌어졌다', '눈썹이 위로 치솟았다', '동공이 크게 열렸다', '말문이 막힌 채 멍하니 바라봤다'],
    action: ['저도 모르게 한 걸음 물러섰다', '가슴에 손을 얹었다', '뒤를 홱 돌아봤다', '하던 동작을 그 자리에서 멈췄다', '소리 나는 쪽으로 고개를 돌렸다'],
    inner: ['머릿속이 한순간 새하얘졌다', '온몸에 찌릿한 전기가 흘렀다', '귓속이 잠깐 멍해졌다', '시간이 뚝 끊긴 듯했다', '심장이 목구멍까지 튀어 오른 기분이었다'],
    thought: ['지금 내가 본 게 맞나 의심했다', '이게 무슨 일인가 싶었다', '머릿속으로 상황이 정리되지 않았다', '믿기지 않아 한참을 멍하니 있었다', '뭐라고 반응해야 할지 몰랐다'],
  },
  {
    key: 'guilt', name: '죄책감', icon: '😔',
    tells: ['죄책감', '미안했다', '미안해', '자책', '죄스러', '양심의 가책', '면목이 없'],
    body: ['고개가 저절로 수그러졌다', '가슴이 묵직하게 짓눌렸다', '말끝이 자꾸 흐려졌다', '시선을 마주칠 수가 없었다', '손을 가만두지 못하고 매만졌다'],
    face: ['눈을 내리깔았다', '입술을 안으로 말아 깨물었다', '미간을 괴롭게 좁혔다', '억지로 짓는 표정이 일그러졌다', '상대의 눈을 피해 다른 곳을 봤다'],
    action: ['몇 번이고 사과의 말을 더듬었다', '괜히 그 사람을 위해 무언가를 챙겼다', '연락을 망설이다 결국 지웠다', '그 일을 떠올릴 때마다 한숨을 쉬었다', '뒤늦게라도 만회하려 애썼다'],
    inner: ['속이 무겁게 가라앉았다', '가슴 한구석이 따끔하게 찔렸다', '잠자리에서도 그 장면이 떠나지 않았다', '목구멍에 무언가 걸린 듯 답답했다', '스스로가 한없이 작게 느껴졌다'],
    thought: ['그러지 말았어야 했다고 곱씹었다', '다 내 탓이라는 생각이 떠나지 않았다', '용서받을 자격이 없다고 느꼈다', '되돌릴 수만 있다면 무엇이든 하고 싶었다', '그 사람 얼굴을 어떻게 보나 싶었다'],
  },
  {
    key: 'relief', name: '안도', icon: '😌',
    tells: ['안도했다', '안심', '다행이었다', '마음이 놓였다', '한시름', '한숨 돌'],
    body: ['굳었던 어깨에서 힘이 스르르 빠졌다', '참았던 숨을 길게 내쉬었다', '뻣뻣했던 목이 부드럽게 풀렸다', '손에 들어가 있던 긴장이 풀렸다', '가슴을 쓸어내렸다'],
    face: ['굳어 있던 표정이 천천히 누그러졌다', '눈가가 부드럽게 풀렸다', '옅은 미소가 번졌다', '꽉 다물었던 입술이 느슨해졌다', '눈을 잠시 감았다 떴다'],
    action: ['털썩 자리에 주저앉았다', '의자 등받이에 몸을 깊이 기댔다', '곁에 있는 사람의 손을 가만히 잡았다', '하늘을 올려다보며 숨을 골랐다', '비로소 다른 일에 눈을 돌렸다'],
    inner: ['묵직했던 가슴이 한결 가벼워졌다', '온몸의 긴장이 발끝으로 빠져나갔다', '막혔던 숨길이 트이는 듯했다', '속이 비로소 따뜻하게 풀렸다', '머릿속이 맑게 개는 느낌이었다'],
    thought: ['이제 됐다는 생각에 힘이 풀렸다', '큰일 나지 않아 정말 다행이었다', '괜히 마음 졸였구나 싶었다', '비로소 다른 생각을 할 수 있었다', '무사하다는 사실만으로 충분했다'],
  },
  {
    key: 'loneliness', name: '외로움', icon: '😞',
    tells: ['외로웠다', '외로워', '쓸쓸했다', '고독', '적적', '허전', '혼자라는'],
    body: ['괜히 두 팔로 제 몸을 감쌌다', '시선이 빈자리로 자꾸 향했다', '한숨이 잦아졌다', '목소리를 낼 일이 없어 입이 굳었다', '발걸음이 무겁게 느려졌다'],
    face: ['창밖을 오래도록 멍하니 바라봤다', '입가에서 웃음기가 사라졌다', '눈빛이 한 곳에 초점 없이 머물렀다', '말없이 고개를 떨궜다', '미소가 금세 흐려졌다'],
    action: ['읽지도 않을 메시지 목록을 괜히 넘겼다', '불 꺼진 방에 오래 앉아 있었다', '의미 없이 거리를 걸었다', '누군가에게 연락할까 망설이다 그만뒀다', '혼잣말을 중얼거렸다'],
    inner: ['가슴 한가운데가 휑하게 비었다', '온기가 닿지 않는 듯 서늘했다', '주위의 소음이 멀게만 느껴졌다', '속에서 찬바람이 도는 듯했다', '시간이 더디게 흘렀다'],
    thought: ['나를 떠올리는 사람이 있을까 헤아렸다', '이 자리에 아무도 없다는 게 실감 났다', '누구라도 곁에 있었으면 싶었다', '왜 늘 혼자인 걸까 곱씹었다', '말 한마디 나눌 사람이 그리웠다'],
  },
  {
    key: 'hope', name: '희망', icon: '🌟',
    tells: ['희망', '기대했다', '기대가', '바랐다', '설레는 마음으로', '잘될 거라'],
    body: ['가슴이 가볍게 부풀었다', '걸음에 절로 힘이 실렸다', '눈에 또렷한 생기가 돌았다', '고개를 곧게 들었다', '숨이 한결 깊고 편안해졌다'],
    face: ['눈동자가 먼 곳을 향해 반짝였다', '옅은 미소가 입가에 번졌다', '굳었던 표정이 환하게 펴졌다', '눈빛이 또렷해졌다', '입꼬리가 살며시 올라갔다'],
    action: ['계획을 적어 내려가기 시작했다', '내일을 위해 미리 준비를 챙겼다', '오랜만에 약속을 먼저 잡았다', '창문을 활짝 열어젖혔다', '미뤄둔 일에 손을 댔다'],
    inner: ['가슴 안쪽에서 작은 불씨가 살아났다', '온몸에 새로운 기운이 도는 듯했다', '앞이 조금씩 환해지는 느낌이었다', '속에서 따뜻한 기대가 차올랐다', '발끝까지 활기가 퍼졌다'],
    thought: ['이번엔 다를 거라는 예감이 들었다', '조금만 더 버티면 될 것 같았다', '내일이 기다려지는 건 오랜만이었다', '잘될 거라고 스스로를 다독였다', '길이 보이는 듯했다'],
  },
  {
    key: 'despair', name: '절망', icon: '😣',
    tells: ['절망', '절망했다', '막막했다', '눈앞이 캄캄', '낙담', '좌절', '포기'],
    body: ['온몸에서 힘이 한꺼번에 빠져나갔다', '다리가 풀려 그 자리에 주저앉았다', '눈앞이 흐릿하게 흔들렸다', '숨이 가슴 어딘가에 막혀 나오지 않았다', '손에 쥔 것을 맥없이 놓쳤다'],
    face: ['초점 잃은 눈이 허공을 향했다', '표정이 통째로 무너져 내렸다', '입술이 힘없이 벌어졌다', '얼굴에서 모든 빛이 사라졌다', '고개가 깊이 떨궈졌다'],
    action: ['아무것도 하지 못한 채 멍하니 앉아 있었다', '벽에 등을 기댄 채 미끄러져 내렸다', '울리는 전화도 받지 않았다', '하던 일을 그대로 손에서 놓았다', '무릎 사이에 얼굴을 묻었다'],
    inner: ['가슴이 텅 빈 채 무겁게 가라앉았다', '발밑이 끝없이 꺼지는 듯했다', '머릿속이 캄캄하게 닫혔다', '아무 소리도 들리지 않는 듯 먹먹했다', '몸과 마음이 통째로 식어버린 느낌이었다'],
    thought: ['더 이상 길이 없다고 느꼈다', '무얼 해도 소용없을 거라 생각했다', '여기까지인가 싶었다', '왜 하필 나에게 이런 일이 닥쳤을까', '아무것도 바라지 않게 됐다'],
  },
  {
    key: 'pride', name: '자부심', icon: '😎',
    tells: ['자랑스러', '뿌듯했다', '뿌듯해', '자부심', '으쓱', '우쭐'],
    body: ['가슴을 활짝 폈다', '턱을 살짝 들어 올렸다', '걸음이 당당해졌다', '어깨가 곧게 펴졌다', '목소리에 또렷한 힘이 실렸다'],
    face: ['입가에 흐뭇한 미소가 번졌다', '눈빛이 자신감으로 빛났다', '고개를 곧추세웠다', '옅게 콧대가 올라갔다', '주위를 천천히 둘러봤다'],
    action: ['결과물을 보란 듯 내보였다', '받은 상을 잘 보이는 곳에 두었다', '먼저 나서서 설명을 시작했다', '칭찬을 짐짓 겸손하게 받아넘겼다', '뒷짐을 지고 한발 물러나 바라봤다'],
    inner: ['가슴이 뿌듯하게 차올랐다', '온몸에 든든한 기운이 돌았다', '속에서 따뜻한 만족이 번졌다', '발끝까지 힘이 실리는 느낌이었다', '스스로가 한 뼘 커진 듯했다'],
    thought: ['해낼 줄 알았다고 속으로 되뇌었다', '내 노력이 헛되지 않았구나 싶었다', '이 정도는 나니까 가능했다고 생각했다', '누구에게 보여줘도 부끄럽지 않았다', '오늘만큼은 나를 칭찬해도 될 것 같았다'],
  },
  {
    key: 'confusion', name: '혼란', icon: '😵',
    tells: ['혼란', '혼란스러', '어리둥절', '얼떨떨', '갈피를 못', '헷갈'],
    body: ['고개를 갸웃하게 기울였다', '눈을 여러 번 깜빡였다', '이마를 손으로 짚었다', '말끝이 자꾸 끊겼다', '시선이 이곳저곳을 더듬었다'],
    face: ['미간을 좁히며 인상을 썼다', '입을 살짝 벌린 채 멈췄다', '눈동자가 초점을 잃고 흔들렸다', '한쪽 눈썹이 위로 올라갔다', '멍한 표정으로 굳었다'],
    action: ['같은 질문을 다시 되물었다', '받은 것을 이리저리 뒤집어 봤다', '머리를 긁적였다', '제자리에서 방향을 못 잡고 맴돌았다', '들은 말을 혼자 중얼거리며 곱씹었다'],
    inner: ['머릿속이 뒤엉킨 실타래 같았다', '생각의 갈피가 잡히지 않았다', '귓속이 웅웅 울리는 듯했다', '발밑이 묘하게 어긋난 느낌이었다', '무엇부터 정리해야 할지 막막했다'],
    thought: ['이게 대체 무슨 상황인지 몰랐다', '내가 뭘 잘못 들은 건 아닐까', '앞뒤가 도무지 맞지 않았다', '어디서부터 꼬인 걸까 헤아렸다', '확실한 게 하나도 없었다'],
  },
  {
    key: 'contempt', name: '경멸', icon: '🙄',
    tells: ['경멸', '한심했다', '얕봤다', '비웃', '깔봤다', '하찮', '같잖'],
    body: ['콧방귀를 피식 뀌었다', '입꼬리 한쪽만 비스듬히 올렸다', '눈을 위에서 아래로 훑었다', '팔짱을 끼고 거리를 뒀다', '고개를 옆으로 비스듬히 기울였다'],
    face: ['눈을 가늘게 뜨고 내려다봤다', '입가에 차가운 비웃음이 걸렸다', '눈썹을 한쪽만 치켜올렸다', '시선을 일부러 외면했다', '표정에서 온기가 싹 가셨다'],
    action: ['상대의 말을 끝까지 듣지 않았다', '들은 척도 않고 자리를 떴다', '혀를 짧게 차며 돌아섰다', '대꾸할 가치도 없다는 듯 어깨를 으쓱했다', '비아냥 섞인 말을 던졌다'],
    inner: ['속으로 한심하다고 단정 지었다', '상대가 한없이 작게 보였다', '굳이 상대할 마음조차 들지 않았다', '가슴속에 차가운 거리감이 자리했다', '시간 낭비라는 생각이 앞섰다'],
    thought: ['저 정도가 다인가 싶었다', '내 수준에 맞지 않는다고 여겼다', '겨우 저런 것에 흔들릴까 보냐 싶었다', '말을 섞을 가치도 없다고 판단했다', '한심하다는 말이 절로 떠올랐다'],
  },
  {
    key: 'nervous', name: '긴장', icon: '😬',
    tells: ['긴장했다', '긴장돼', '떨렸다', '떨려', '바짝', '식은땀'],
    body: ['손끝이 미세하게 떨렸다', '입안이 바짝 말라붙었다', '심장이 귓속까지 울리도록 뛰었다', '등에 땀이 한 줄기 흘렀다', '목소리가 갈라져 나왔다'],
    face: ['마른침을 꿀꺽 삼켰다', '눈을 자주 깜빡였다', '입술을 안으로 말아 다물었다', '시선이 한곳에 머물지 못하고 흔들렸다', '억지웃음이 어색하게 떠올랐다'],
    action: ['손을 바지에 슬쩍 문질렀다', '준비한 말을 속으로 다시 외웠다', '발끝으로 바닥을 톡톡 두드렸다', '물을 괜히 한 모금 마셨다', '차례를 기다리며 자세를 고쳤다'],
    inner: ['뱃속이 단단하게 조여왔다', '온몸이 미세하게 굳어 있었다', '숨을 깊이 쉬어도 가슴이 떨렸다', '발끝부터 긴장이 차올랐다', '주위 소리가 멀게 들렸다'],
    thought: ['제발 실수하지 말자고 되뇌었다', '드디어 내 차례가 왔다고 생각했다', '머릿속이 하얗게 비지 않기를 빌었다', '연습한 대로만 하자고 다짐했다', '시작만 하면 괜찮을 거라 다독였다'],
  },
  {
    key: 'gratitude', name: '감사', icon: '🙏',
    tells: ['고마웠다', '고마워', '감사했다', '감사해', '감격', '눈물겹'],
    body: ['눈가가 뜨겁게 차올랐다', '가슴이 따뜻하게 벅찼다', '말끝이 감격에 떨렸다', '저절로 두 손이 모였다', '고개가 깊이 숙여졌다'],
    face: ['눈시울을 붉히며 웃었다', '입가에 잔잔한 미소가 번졌다', '눈빛이 부드럽게 풀렸다', '울먹이며 입술을 깨물었다', '상대를 오래 바라봤다'],
    action: ['상대의 손을 두 손으로 감싸 쥐었다', '몇 번이고 고개를 숙여 인사했다', '받은 마음을 어떻게든 갚으려 했다', '진심을 담아 편지를 적었다', '말없이 어깨를 토닥였다'],
    inner: ['가슴 한가운데가 뭉클하게 차올랐다', '온몸이 따뜻한 기운으로 감싸였다', '코끝이 찡하게 시려왔다', '속에서 벅찬 감정이 솟구쳤다', '말로 다 못할 만큼 마음이 가득 찼다'],
    thought: ['이 은혜를 어떻게 갚아야 할까 싶었다', '곁에 이런 사람이 있어 다행이라 여겼다', '받은 마음을 오래 기억하기로 했다', '혼자였다면 못 했을 일이라 느꼈다', '말로는 부족할 만큼 고마웠다'],
  },
]

// ── 본문 telling 탐지 ───────────────────────────────────────────
interface TellWord { word: string; emotion: Emotion }
// 모든 감정의 tells 를 펼쳐 길이순(긴 표현 우선)으로 정렬 — 겹침/오탐 최소화
const ALL_TELLS: TellWord[] = (() => {
  const arr: TellWord[] = []
  for (const e of EMOTIONS) for (const w of e.tells) arr.push({ word: w, emotion: e })
  return arr.sort((a, b) => b.word.length - a.word.length)
})()

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const TELL_RE = new RegExp(ALL_TELLS.map((t) => escRe(t.word)).join('|'), 'g')
const TELL_INDEX = new Map<string, Emotion>(ALL_TELLS.map((t) => [t.word, t.emotion]))

interface Hit { word: string; emotion: Emotion; index: number; end: number; line: number }

function detect(text: string): Hit[] {
  if (!text) return []
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLine = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return lo + 1
  }
  const hits: Hit[] = []
  TELL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = TELL_RE.exec(text)) !== null) {
    if (guard++ > 20000) break
    const emo = TELL_INDEX.get(m[0])
    if (emo) hits.push({ word: m[0], emotion: emo, index: m.index, end: m.index + m[0].length, line: toLine(m.index) })
    if (m.index === TELL_RE.lastIndex) TELL_RE.lastIndex++
  }
  return hits
}

interface Seg { text: string; hit?: Hit }
function segmentize(text: string, hits: Hit[]): Seg[] {
  if (hits.length === 0) return [{ text }]
  const segs: Seg[] = []
  let cur = 0
  for (const h of hits) {
    if (h.index < cur) continue
    if (h.index > cur) segs.push({ text: text.slice(cur, h.index) })
    segs.push({ text: text.slice(h.index, h.end), hit: h })
    cur = h.end
  }
  if (cur < text.length) segs.push({ text: text.slice(cur) })
  return segs
}

interface Saved { text?: string; emo?: string; mode?: Mode }
type Mode = 'guide' | 'detect'

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ShowDontTell({ payload }: { payload?: Record<string, unknown> }) {
  const [mode, setMode] = useState<Mode>('guide')
  const [emoKey, setEmoKey] = useState<string>(EMOTIONS[0].key)
  const [text, setText] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const linkTimer = useRef<number | null>(null)

  // localStorage 복원(최초 1회). payload 로 받은 emotion/text 가 있으면 우선 반영.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Saved
        if (typeof s.text === 'string') setText(s.text)
        if (s.emo && EMOTIONS.some((e) => e.key === s.emo)) setEmoKey(s.emo)
        if (s.mode === 'guide' || s.mode === 'detect') setMode(s.mode)
      }
    } catch { /* 손상된 저장은 무시 */ }
    // payload 우선 적용
    const pe = payload?.emotion
    if (typeof pe === 'string') {
      const found = EMOTIONS.find((e) => e.key === pe || e.name === pe)
      if (found) { setEmoKey(found.key); setMode('guide') }
    }
    const pt = payload?.text
    if (typeof pt === 'string' && pt.trim()) { setText(pt); setMode('detect') }
    setLoaded(true)
    // payload 는 마운트 시 1회만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장(복원 완료 후부터)
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(LS, JSON.stringify({ text, emo: emoKey, mode } as Saved)) } catch { /* 용량 초과 등 무시 */ }
  }, [text, emoKey, mode, loaded])

  // 언마운트 정리
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
  }, [])

  const emo = useMemo(() => EMOTIONS.find((e) => e.key === emoKey) || EMOTIONS[0], [emoKey])

  const hits = useMemo(() => { try { return detect(text) } catch { return [] } }, [text])
  const segs = useMemo(() => { try { return segmentize(text, hits) } catch { return [{ text }] } }, [text, hits])

  // 탐지 결과를 감정별로 묶기
  const grouped = useMemo(() => {
    const map = new Map<string, { emotion: Emotion; count: number; words: Set<string>; lines: number[] }>()
    for (const h of hits) {
      const g = map.get(h.emotion.key)
      if (g) { g.count++; g.words.add(h.word); if (!g.lines.includes(h.line)) g.lines.push(h.line) }
      else map.set(h.emotion.key, { emotion: h.emotion, count: 1, words: new Set([h.word]), lines: [h.line] })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [hits])

  const flashCopied = (key: string) => {
    setCopiedKey(key)
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { setCopiedKey(null); copyTimer.current = null }, 1400)
  }
  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => { setLinkMsg(null); linkTimer.current = null }, 1800)
  }
  const safeCopy = (txt: string, onDone: () => void) => {
    if (!txt) return
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(txt).then(onDone).catch(() => { /* 권한 거부 graceful */ })
      } else {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        onDone()
      }
    } catch { /* 클립보드 미지원 무시 */ }
  }

  // 한 줄(단서) 복사
  const copyLine = (txt: string, key: string) => safeCopy(txt, () => flashCopied(key))

  // 한 축(facet) 전체 복사
  const copyFacet = (f: Facet, label: string) => {
    const items = (emo as unknown as Record<string, string[]>)[f]
    const txt = `[${emo.name} · ${label}]\n` + items.map((s) => `- ${s}`).join('\n')
    safeCopy(txt, () => flashCopied('facet:' + f))
  }

  // 현재 감정의 전체 묘사 단서를 하나의 텍스트로
  const buildGuideText = () => {
    const blocks = FACETS.map((f) => {
      const items = (emo as unknown as Record<string, string[]>)[f.key]
      return `${f.icon} ${f.label}\n` + items.map((x) => `- ${x}`).join('\n')
    }).join('\n\n')
    return `【${emo.name}】 보여주기 단서 (말하지 말고 보여주기)\n\n${blocks}`
  }

  const copyAllGuide = () => safeCopy(buildGuideText(), () => flashCopied('all'))

  // 스니펫 저장 — 공유 라이브러리
  const saveSnippet = () => {
    addToLibrary('snippets', { text: buildGuideText(), source: '보여주기 변환기', tags: ['보여주기', emo.name] })
    flashLink('스니펫으로 저장했습니다')
  }

  // 프로젝트에 추가 — 현재 감정의 보여주기 단서를 자료 폴더에 메모로
  const addGuideToProject = () => {
    const bodyHtml = FACETS.map((f) => {
      const items = (emo as unknown as Record<string, string[]>)[f.key]
      const lis = items.map((x) => `<li>${escHtml(x)}</li>`).join('')
      return `<p><b>${escHtml(f.icon)} ${escHtml(f.label)}</b></p><ul>${lis}</ul>`
    }).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '보여주기 단서',
      title: `${emo.name} · 보여주기 단서`,
      bodyHtml,
      meta: { 감정: emo.name, 출처: '보여주기 변환기' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // 탐지 결과 텍스트(복사용)
  const detectReport = useMemo(() => {
    if (grouped.length === 0) return ''
    const lines = ['[보여주기 점검 결과]', `telling 감정어 ${hits.length}건(${grouped.length}종 감정)`, '']
    for (const g of grouped) {
      lines.push(`• ${g.emotion.icon} ${g.emotion.name}: "${[...g.words].join('", "')}" ×${g.count} (줄 ${g.lines.slice(0, 8).join(', ')}${g.lines.length > 8 ? '…' : ''})`)
      lines.push(`  → 보여주기 예: ${g.emotion.body[0]} / ${g.emotion.action[0]}`)
    }
    return lines.join('\n')
  }, [grouped, hits.length])

  const sample = '그는 화가 났다. 그녀는 너무 불안했고, 나는 무서웠다. 합격 소식에 우리 모두 기뻤다. 그는 미안했지만 차마 말하지 못했다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, flexShrink: 0 }
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 13, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', userSelect: 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', fontWeight: active ? 700 : 400,
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }
  const lineItem: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', cursor: 'pointer', padding: '2px 4px', borderRadius: 6 }
  const taStyle: React.CSSProperties = {
    minHeight: 90, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const preview: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })

  return (
    <div style={wrap}>
      <div style={hint}>
        <Emoji e="🎭"/> 감정을 <b>설명</b>하지 말고 <b>보여주세요</b>. 감정을 고르면 신체 반응·표정·행동·내적 감각·생각의 묘사 단서를 제시하고, 본문 속 "telling" 감정어도 짚어줍니다. (전부 로컬 · 네트워크 불필요)
      </div>

      <div style={tabRow}>
        <span style={tab(mode === 'guide')} onClick={() => setMode('guide')} role="button" tabIndex={0}><Emoji e="🎭"/> 감정 → 보여주기</span>
        <span style={tab(mode === 'detect')} onClick={() => setMode('detect')} role="button" tabIndex={0}><Emoji e="🔍"/> 본문 telling 탐지</span>
      </div>

      {mode === 'guide' ? (
        <>
          {/* 감정 선택 칩 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 92, overflowY: 'auto', paddingRight: 2, flexShrink: 0 }}>
            {EMOTIONS.map((e) => {
              const on = e.key === emoKey
              return (
                <button
                  key={e.key}
                  className="minibtn"
                  onClick={() => setEmoKey(e.key)}
                  aria-pressed={on}
                  style={{ opacity: on ? 1 : 0.6, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}
                >
                  <Emoji e={e.icon}/> {e.name}
                </button>
              )
            })}
          </div>

          {/* 선택 감정 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}><Emoji e={emo.icon}/></span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{emo.name}</span>
            <span style={{ ...hint, fontSize: 11 }}>— "{emo.tells[0]}" 대신 아래를 보여주세요</span>
            <span style={{ marginLeft: 'auto' }}>
              <button className="minibtn" onClick={() => setEmoKey(pick(EMOTIONS.filter((e) => e.key !== emoKey)).key)} title="무작위 감정"><Emoji e="🎲"/></button>
            </span>
          </div>

          {/* 다섯 축 카드 */}
          <div style={scroll}>
            {FACETS.map((f) => {
              const items = (emo as unknown as Record<string, string[]>)[f.key]
              return (
                <div key={f.key} style={card}>
                  <div style={cardHead}>
                    <span style={{ fontSize: 15 }}><Emoji e={f.icon}/></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{f.label}</span>
                    <span style={{ ...hint, fontSize: 11 }}>{f.desc}</span>
                    <button
                      className="minibtn"
                      onClick={() => copyFacet(f.key, f.label)}
                      title={`${f.label} 전체 복사`}
                      style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', color: copiedKey === 'facet:' + f.key ? 'var(--ok)' : undefined, borderColor: copiedKey === 'facet:' + f.key ? 'var(--ok)' : 'var(--border)' }}
                    >
                      {copiedKey === 'facet:' + f.key ? <>✓ 복사됨</> : <Emoji e="📋"/>}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {items.map((it, i) => {
                      const key = `${f.key}:${i}`
                      const on = copiedKey === key
                      return (
                        <div
                          key={i}
                          style={{ ...lineItem, background: on ? 'var(--chrome-2)' : 'transparent', color: on ? 'var(--ok)' : 'var(--text)' }}
                          onClick={() => copyLine(it, key)}
                          title="클릭하여 복사"
                          role="button"
                          tabIndex={0}
                        >
                          • {it}{on ? '  ✓ 복사됨' : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={copyAllGuide}>{copiedKey === 'all' ? <>✓ 전체 복사됨</> : <><Emoji e="📋"/> 전체 단서 복사</>}</button>
          </div>

          <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
            <button className="linkbtn" onClick={addGuideToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? `「${emo.name}」의 보여주기 단서를 프로젝트 자료에 메모로 추가합니다` : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={saveSnippet} title="현재 감정의 보여주기 단서를 스니펫 라이브러리에 저장합니다"><Emoji e="✂️"/> 스니펫 저장</button>
            {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
          </div>

          <div style={hint}>제시된 단서는 출발점입니다. 그대로 나열하지 말고, 인물·상황에 맞는 한두 개를 골라 자기만의 묘사로 비틀어 쓰세요.</div>
        </>
      ) : (
        <>
          <textarea
            style={taStyle}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='원고를 붙여넣으세요. "화가 났다·불안했다·기뻤다" 같은 telling 감정어를 찾아 강조하고, 보여주기 후보를 제안합니다.'
            spellCheck={false}
            aria-label="보여주기 점검 입력"
          />
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...hint, flex: 1 }}>{text.trim() ? `telling 감정어 ${hits.length}건 탐지` : '본문을 붙여넣으면 telling 감정어를 강조합니다.'}</span>
            <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
            <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
            <button className="btn-primary" onClick={() => safeCopy(detectReport, () => flashCopied('report'))} disabled={grouped.length === 0} type="button">{copiedKey === 'report' ? '복사됨 ✓' : '결과 복사'}</button>
          </div>

          {text.trim() === '' ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}><Emoji e="🔍"/></div>
              <div>원고를 붙여넣으면 <b>"화가 났다·불안했다·기뻤다"</b> 같은<br />telling 감정어를 본문에 강조하고, 감정별 보여주기 후보를 제시합니다.</div>
              <div style={{ ...hint, fontSize: 11 }}>부분일치 사전이라 일부는 문맥상 자연스러울 수 있는 참고 항목입니다.</div>
            </div>
          ) : (
            <div style={scroll}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={sectionTitle}>본문 강조 — telling 감정어</div>
                <div style={preview}>
                  {segs.map((s, i) =>
                    s.hit ? (
                      <mark key={i} title={`${s.hit.emotion.name} — 보여주기로 바꿔보세요`} style={{ background: 'transparent', color: 'var(--warn)', fontWeight: 700, borderBottom: '2px solid var(--warn)', padding: '0 1px' }}>{s.text}</mark>
                    ) : (
                      <span key={i}>{s.text}</span>
                    ),
                  )}
                </div>
              </div>

              {grouped.length === 0 ? (
                <div style={empty}>
                  <div style={{ fontSize: 30 }}><Emoji e="✅"/></div>
                  <div>눈에 띄는 telling 감정어가 없습니다. 보여주기가 잘 되어 있네요!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={sectionTitle}>감정별 보여주기 후보 ({grouped.length}종) — 클릭하면 단서를 복사합니다</div>
                  {grouped.map((g) => (
                    <div key={g.emotion.key} style={card}>
                      <div style={cardHead}>
                        <span style={{ fontSize: 15 }}><Emoji e={g.emotion.icon}/></span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{g.emotion.name}</span>
                        <span style={tag('var(--warn)')}>{[...g.words].slice(0, 3).join(', ')}{g.words.size > 3 ? '…' : ''} ×{g.count}</span>
                        <span style={{ flex: 1 }} />
                        <button className="minibtn" onClick={() => { setEmoKey(g.emotion.key); setMode('guide') }} title="이 감정의 전체 단서 보기" style={{ fontSize: 11, padding: '2px 8px' }}>전체 보기 →</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[
                          { icon: '💢', t: g.emotion.body[0] },
                          { icon: '😶', t: g.emotion.face[0] },
                          { icon: '🏃', t: g.emotion.action[0] },
                          { icon: '💭', t: g.emotion.thought[0] },
                        ].map((row, i) => {
                          const key = `det:${g.emotion.key}:${i}`
                          const on = copiedKey === key
                          return (
                            <div key={i} style={{ ...lineItem, background: on ? 'var(--chrome-2)' : 'transparent', color: on ? 'var(--ok)' : 'var(--text)' }} onClick={() => copyLine(row.t, key)} title="클릭하여 복사" role="button" tabIndex={0}>
                              <Emoji e={row.icon}/> {row.t}{on ? '  ✓ 복사됨' : ''}
                            </div>
                          )
                        })}
                        <div style={{ ...hint, fontSize: 11, marginTop: 2 }}>줄 {g.lines.slice(0, 10).join(', ')}{g.lines.length > 10 ? '…' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={hint}>"telling"은 무조건 틀린 게 아닙니다. 빠르게 넘겨야 할 대목엔 오히려 효율적입니다. 다만 중요한 감정의 순간일수록 단서로 "보여주기"를 시도해 보세요.</div>
        </>
      )}

      <div className="license-note" style={{ ...hint, fontSize: 11 }}>모든 묘사 단서는 직접 작성한 창작 텍스트입니다. 외부 API·이미지·폰트를 사용하지 않습니다.</div>
    </div>
  )
}
