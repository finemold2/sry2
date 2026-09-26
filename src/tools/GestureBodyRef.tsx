// 몸짓·표정·바디랭귀지 사전 — 감정/상황별 비언어 표현(시선·손·자세·미세표정)을 묘사 문장 후보로 모은 로컬 사전.
// "말 대신 행동으로" 보여주기(Show, don't tell)를 돕는다. 자급식: 외부 네트워크·라이브러리 없음.
// react 와 './linkbus' 만 import. localStorage(즐겨찾기·마지막 카테고리·강도 필터)만 사용.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'gesture-body-ref', name: '몸짓·표정 사전', icon: '🙆', group: '리서치·자료', intro: '감정·상황별 시선·손·자세·미세표정을 묘사 문장으로 — 말 대신 행동으로 보여주기', w: 640, h: 580 }

// 채널(신체 부위/표현 경로) — 한 표현이 어느 채널을 쓰는지 태그
type Channel = '시선' | '얼굴' | '입' | '손' | '팔·어깨' | '자세' | '발·다리' | '호흡·목소리' | '피부·생리'
// 강도(은근함 ↔ 노골적) — 1: 미세, 2: 보통, 3: 뚜렷
type Intensity = 1 | 2 | 3

interface Beat {
  text: string          // 그대로 본문에 쓸 수 있는 묘사 문장 후보
  channels: Channel[]   // 사용된 신체 채널
  intensity: Intensity  // 강도
  note?: string         // 쓰임새/주의(과용 경고, 대체 등)
}
interface CatDef { key: string; label: string; icon: string; kind: '감정' | '상황'; intro: string; items: Beat[] }

// ───────────────────────── 자작 데이터: 감정 ─────────────────────────
const CATS: CatDef[] = [
  {
    key: 'joy', label: '기쁨·환희', icon: '😄', kind: '감정',
    intro: '터져 나오는 행복, 억누르지 못하는 들뜸. 눈가와 어깨가 먼저 말한다.',
    items: [
      { text: '눈꼬리에 잔주름이 잡히도록 웃었다. 입만이 아니라 눈까지 함께 휘는, 숨길 수 없는 웃음이었다.', channels: ['눈·얼굴' as Channel, '입'], intensity: 2, note: '진짜 웃음(뒤셴 미소)의 핵심은 눈가 주름.' },
      { text: '발끝이 저절로 까딱거렸다. 가만히 앉아 있으려 해도 몸이 박자를 타려 했다.', channels: ['발·다리'], intensity: 1, note: '억누른 들뜸을 발로 흘리는 미세 신호.' },
      { text: '어깨가 한 뼘쯤 올라가 있었다. 누가 봐도 가벼운, 짐을 내려놓은 사람의 자세였다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '말을 하다 말고 자꾸 웃음이 새어 나와, 손등으로 입을 가렸다.', channels: ['입', '손'], intensity: 2 },
      { text: '두 손을 가슴 앞에서 꼭 맞쥐고, 발뒤꿈치를 들썩였다.', channels: ['손', '발·다리'], intensity: 3, note: '아이 같은 환희. 인물 나이에 맞게 강도 조절.' },
      { text: '숨을 들이켜는 소리가 웃음에 섞여 끊겼다. 말보다 호흡이 먼저 들떴다.', channels: ['호흡·목소리'], intensity: 2 },
      { text: '눈을 크게 뜨고 상대를 바라보다, 참지 못하고 양손으로 얼굴을 감쌌다.', channels: ['시선', '손', '얼굴' as Channel], intensity: 3 },
      { text: '콧잔등에 주름이 잡히도록 활짝 웃으며 고개를 뒤로 젖혔다.', channels: ['얼굴' as Channel, '자세'], intensity: 3 },
    ],
  },
  {
    key: 'sad', label: '슬픔·비탄', icon: '😢', kind: '감정',
    intro: '안으로 가라앉는 무게. 시선은 아래로, 어깨는 안으로 말린다.',
    items: [
      { text: '시선이 자꾸 바닥으로 떨어졌다. 상대의 눈을 마주할 힘이 남아 있지 않았다.', channels: ['시선'], intensity: 2 },
      { text: '어깨가 안으로 둥글게 말리며, 몸 전체가 한 뼘 작아진 듯 보였다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '아랫입술을 안으로 말아 물었다. 떨림을 들키지 않으려는 안간힘이었다.', channels: ['입'], intensity: 2, note: '울음을 참는 전형적 미세표정.' },
      { text: '목울대가 한 번 크게 오르내렸다. 삼킨 것은 침이 아니라 울음이었다.', channels: ['호흡·목소리'], intensity: 1, note: '"울었다"보다 강하게 슬픔을 암시.' },
      { text: '눈을 깜빡일 때마다 속눈썹이 무겁게 내려앉았고, 그 끝이 젖어 빛났다.', channels: ['시선', '피부·생리'], intensity: 2 },
      { text: '두 손을 무릎 위에 가지런히 모았지만, 손가락 끝이 미세하게 떨렸다.', channels: ['손'], intensity: 1 },
      { text: '숨을 들이쉴 때 가슴이 들썩, 끊겨 들어갔다. 흐느낌을 누른 자국이었다.', channels: ['호흡·목소리'], intensity: 3 },
      { text: '말을 시작하려다 입을 다물고, 고개를 천천히 옆으로 돌렸다.', channels: ['입', '자세', '시선'], intensity: 2 },
    ],
  },
  {
    key: 'anger', label: '분노·격분', icon: '😠', kind: '감정',
    intro: '안에서 차오르는 압력. 턱·주먹·호흡이 단단해진다.',
    items: [
      { text: '턱 근육이 한 번 불끈 솟았다 가라앉았다. 이를 악문 흔적이었다.', channels: ['얼굴' as Channel], intensity: 2, note: '말없이 끓는 분노에 효과적.' },
      { text: '주먹을 천천히 쥐었다 폈다. 손톱이 손바닥에 자국을 낼 만큼.', channels: ['손'], intensity: 2 },
      { text: '콧구멍이 벌름거리며 호흡이 거칠어졌다. 들숨이 짧고 날카로웠다.', channels: ['호흡·목소리', '얼굴' as Channel], intensity: 2 },
      { text: '눈썹 사이에 깊은 골이 패였고, 시선은 한 점에 못 박혔다.', channels: ['얼굴' as Channel, '시선'], intensity: 2 },
      { text: '목소리는 오히려 낮아졌다. 한 음절씩 끊어 누르듯 내뱉었다.', channels: ['호흡·목소리'], intensity: 3, note: '고함보다 무서운 억눌린 분노.' },
      { text: '의자 등받이를 짚은 손가락이 하얗게 질리도록 힘이 들어갔다.', channels: ['손'], intensity: 3 },
      { text: '입꼬리가 한쪽만 비뚜로 올라갔다. 웃음이 아니라 경멸이었다.', channels: ['입'], intensity: 1, note: '미세표정 — 분노에 경멸이 섞일 때.' },
      { text: '상대를 향해 한 걸음 성큼 다가서며 가슴을 폈다. 물러설 생각이 없다는 자세였다.', channels: ['자세', '발·다리'], intensity: 3 },
    ],
  },
  {
    key: 'fear', label: '두려움·불안', icon: '😨', kind: '감정',
    intro: '몸이 움츠러들고 빨라진다. 시선은 출구를 찾고, 호흡은 얕아진다.',
    items: [
      { text: '눈이 평소보다 크게 벌어지며 흰자가 도드라졌다. 시선이 빠르게 좌우를 훑었다.', channels: ['시선', '얼굴' as Channel], intensity: 2, note: '공포의 대표 표정 + 출구 탐색.' },
      { text: '두 팔로 제 몸을 감싸 안았다. 누가 보호해 주지 않으니 스스로 끌어안았다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '침을 삼키는데 목이 말라 소리가 컸다. 입안이 바싹 말라 있었다.', channels: ['피부·생리', '호흡·목소리'], intensity: 2 },
      { text: '손바닥에 땀이 배어, 옷자락에 슬그머니 문질러 닦았다.', channels: ['손', '피부·생리'], intensity: 1 },
      { text: '한 발은 이미 문 쪽으로 살짝 틀어져 있었다. 도망칠 준비를 몸이 먼저 했다.', channels: ['발·다리', '자세'], intensity: 1, note: '발끝 방향은 "정말 가고 싶은 곳"을 누설.' },
      { text: '숨이 가슴 위쪽에서만 얕게 오갔다. 깊이 들이쉴 엄두가 나지 않았다.', channels: ['호흡·목소리'], intensity: 2 },
      { text: '어깨가 귀밑까지 솟구쳤다 천천히 내려왔다. 긴장이 목덜미에 뭉쳐 있었다.', channels: ['팔·어깨'], intensity: 2 },
      { text: '말끝이 떨려 흩어졌다. 단어를 다 맺기 전에 숨이 먼저 끊겼다.', channels: ['호흡·목소리'], intensity: 3 },
    ],
  },
  {
    key: 'surprise', label: '놀람·경악', icon: '😲', kind: '감정',
    intro: '한순간 멈춘 뒤 터지는 반응. 눈썹과 입이 가장 먼저 움직인다.',
    items: [
      { text: '눈썹이 순식간에 치솟고 이마에 가로주름이 그어졌다.', channels: ['얼굴' as Channel], intensity: 2, note: '놀람의 가장 빠른 신호. 0.5초면 사라진다.' },
      { text: '입이 반쯤 벌어진 채 잠시 멈췄다. 다음 말을 잊어버린 사람처럼.', channels: ['입'], intensity: 2 },
      { text: '들고 있던 것을 놓칠 뻔하다, 뒤늦게 두 손으로 황급히 움켜쥐었다.', channels: ['손'], intensity: 2 },
      { text: '한 박자 동안 모든 동작이 멎었다. 숨조차 멈춘 정지의 순간이었다.', channels: ['자세', '호흡·목소리'], intensity: 1, note: '놀람 직후의 "프리즈" — 동작을 멈춰서 보여준다.' },
      { text: '몸이 반사적으로 뒤로 한 발 물러나며 손이 가슴 앞을 막았다.', channels: ['발·다리', '손', '자세'], intensity: 3 },
      { text: '"어." 외마디 소리만 새어 나오고, 다음 말은 목에 걸렸다.', channels: ['호흡·목소리'], intensity: 2 },
      { text: '눈을 두어 번 빠르게 깜빡이며 자기가 본 것을 다시 확인했다.', channels: ['시선'], intensity: 1 },
    ],
  },
  {
    key: 'disgust', label: '혐오·역겨움', icon: '🤢', kind: '감정',
    intro: '밀어내는 감정. 코와 윗입술이 일그러지고, 몸은 거리를 둔다.',
    items: [
      { text: '윗입술이 한쪽으로 들리고 콧잔등에 주름이 잡혔다.', channels: ['입', '얼굴' as Channel], intensity: 2, note: '혐오의 핵심 미세표정.' },
      { text: '고개를 살짝 돌리며 몸을 뒤로 빼, 대상과 거리를 벌렸다.', channels: ['자세', '시선'], intensity: 2 },
      { text: '손바닥을 펼쳐 앞으로 내밀었다. "그만, 더는"이라는 무언의 차단이었다.', channels: ['손'], intensity: 2 },
      { text: '눈을 가늘게 뜨고 대상을 위아래로 훑어 내렸다.', channels: ['시선'], intensity: 1, note: '혐오에 경멸이 섞인 시선.' },
      { text: '입안에 신물이 도는 듯 침을 한 번 삼키고 미간을 좁혔다.', channels: ['피부·생리', '얼굴' as Channel], intensity: 2 },
      { text: '손가락 끝으로만 그것을 집어, 몸에서 최대한 멀리 떨어뜨려 들었다.', channels: ['손', '팔·어깨'], intensity: 3 },
    ],
  },
  {
    key: 'love', label: '애정·끌림', icon: '🥰', kind: '감정',
    intro: '향하는 마음. 거리는 좁아지고, 시선은 오래 머문다.',
    items: [
      { text: '시선이 상대의 얼굴 위에 평소보다 한 박자 더 오래 머물렀다.', channels: ['시선'], intensity: 1, note: '응시 시간은 호감을 누설한다.' },
      { text: '말하는 내내 상대 쪽으로 몸이 기울어 있었다. 자기도 모르게.', channels: ['자세'], intensity: 1 },
      { text: '귀 뒤로 머리카락을 넘기며 슬쩍 시선을 내렸다 다시 들었다.', channels: ['손', '시선'], intensity: 2, note: '수줍은 끌림의 흔한 단장 행동.' },
      { text: '두 사람의 발끝이 어느새 서로를 향해 마주 보고 있었다.', channels: ['발·다리'], intensity: 1, note: '발끝 정렬은 무의식적 관심의 신호.' },
      { text: '웃을 때 눈동자가 상대의 입가로, 다시 눈으로 부드럽게 오갔다.', channels: ['시선'], intensity: 2 },
      { text: '손이 탁자 위에서 상대의 손 쪽으로 조금씩, 망설이며 다가갔다.', channels: ['손'], intensity: 2 },
      { text: '목소리 끝이 평소보다 낮고 느려졌다. 둘만 아는 속도로.', channels: ['호흡·목소리'], intensity: 2 },
    ],
  },
  {
    key: 'shame', label: '수치·당황', icon: '😳', kind: '감정',
    intro: '숨고 싶은 마음. 얼굴은 달아오르고 시선은 갈 곳을 잃는다.',
    items: [
      { text: '목덜미부터 귀까지 열이 올라 붉게 물들었다.', channels: ['피부·생리'], intensity: 2, note: '홍조는 의지로 못 막는 진짜 신호.' },
      { text: '시선이 갈 곳을 잃고 천장, 바닥, 제 손을 차례로 더듬었다.', channels: ['시선'], intensity: 2 },
      { text: '괜히 옷깃을 매만지고, 있지도 않은 먼지를 털어냈다.', channels: ['손'], intensity: 1, note: '손이 할 일을 만들어 어색함을 흘린다.' },
      { text: '헛기침을 한 번 하고는 화제를 황급히 돌렸다.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '고개를 푹 숙이고 손가락으로 콧등을 꾹 눌렀다.', channels: ['자세', '손'], intensity: 2 },
      { text: '입가에 어정쩡한 웃음이 걸렸다. 웃는 것도 안 웃는 것도 아닌.', channels: ['입'], intensity: 1 },
    ],
  },
  {
    key: 'pride', label: '자부·당당함', icon: '😤', kind: '감정',
    intro: '공간을 차지하는 자세. 턱은 들리고 가슴은 펴진다.',
    items: [
      { text: '턱을 살짝 들고 어깨를 활짝 폈다. 시선은 상대를 똑바로 내려다보았다.', channels: ['자세', '시선', '팔·어깨'], intensity: 2 },
      { text: '두 손을 허리에 얹고 다리를 어깨너비로 벌려 섰다.', channels: ['손', '발·다리', '자세'], intensity: 2, note: '공간을 넓게 쓰는 "확장" 자세.' },
      { text: '입꼬리 한쪽이 천천히 올라가며 여유로운 미소가 번졌다.', channels: ['입'], intensity: 1 },
      { text: '팔짱을 끼되 가슴은 앞으로 내밀어, 닫힘이 아니라 과시처럼 보였다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '말끝마다 가볍게 고개를 끄덕여, 제 말에 스스로 도장을 찍었다.', channels: ['자세'], intensity: 1 },
      { text: '의자에 깊숙이 기대 다리를 꼬고, 두 손을 머리 뒤로 깍지 꼈다.', channels: ['자세', '손', '발·다리'], intensity: 3 },
    ],
  },
  {
    key: 'boredom', label: '지루함·무관심', icon: '🥱', kind: '감정',
    intro: '에너지가 빠진 몸. 시선은 흩어지고 동작은 늘어진다.',
    items: [
      { text: '턱을 손바닥에 괴고, 시선은 창밖 어딘가를 멍하니 좇았다.', channels: ['손', '시선', '자세'], intensity: 1 },
      { text: '손가락으로 탁자를 일정한 박자로 톡톡 두드렸다.', channels: ['손'], intensity: 1, note: '시간이 안 가는 사람의 무의식 동작.' },
      { text: '하품을 삼키려 입을 다물었지만 눈가에 물기가 비쳤다.', channels: ['입', '피부·생리'], intensity: 2 },
      { text: '의자에 비스듬히 미끄러져, 몸이 점점 아래로 흘러내렸다.', channels: ['자세'], intensity: 2 },
      { text: '시계를 슬쩍 보고, 또 슬쩍 보았다. 한 번보다 두 번이 더 길게.', channels: ['시선'], intensity: 1 },
      { text: '펜 끝을 빙글빙글 돌리며 딴생각에 잠긴 표정이었다.', channels: ['손', '얼굴' as Channel], intensity: 1 },
    ],
  },
  {
    key: 'deceit', label: '거짓·은폐', icon: '🤥', kind: '감정',
    intro: '들킬까 하는 긴장. 손과 시선이 평소와 어긋난다.',
    items: [
      { text: '말하면서 자기도 모르게 코끝이나 입가를 손으로 슬쩍 만졌다.', channels: ['손', '입'], intensity: 1, note: '거짓의 단정적 증거는 아님 — 어색함의 신호로 활용.' },
      { text: '눈을 마주치다 한순간 시선을 옆으로 미끄러뜨렸다 다시 붙였다.', channels: ['시선'], intensity: 2 },
      { text: '필요 이상으로 또박또박, 준비된 듯 매끄럽게 말이 흘러나왔다.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '발끝이 출입구 쪽으로 돌아가 있었다. 입은 머물러도 몸은 떠나려 했다.', channels: ['발·다리'], intensity: 1 },
      { text: '질문을 받자 침을 한 번 삼키고, 대답하기 전에 반 박자 멈췄다.', channels: ['피부·생리', '호흡·목소리'], intensity: 2 },
      { text: '두 손을 탁자 밑으로 슬그머니 내려, 보이지 않는 곳에 감췄다.', channels: ['손'], intensity: 2 },
    ],
  },
  {
    key: 'exhaustion', label: '피로·체념', icon: '😮‍💨', kind: '감정',
    intro: '바닥난 기운. 몸이 무겁게 가라앉고 한숨이 새어 나온다.',
    items: [
      { text: '긴 숨을 천천히 내쉬며 어깨가 푹 꺼졌다.', channels: ['호흡·목소리', '팔·어깨'], intensity: 2 },
      { text: '엄지와 검지로 콧대를 집어, 눈을 감은 채 잠시 멈췄다.', channels: ['손', '시선'], intensity: 2, note: '두통·소진의 흔한 제스처.' },
      { text: '두 손으로 얼굴을 쓸어내리고는 손바닥 사이로 천장을 올려다봤다.', channels: ['손', '시선'], intensity: 2 },
      { text: '걸음이 무거워져, 발을 끌듯이 천천히 옮겼다.', channels: ['발·다리'], intensity: 2 },
      { text: '말끝이 흐지부지 사라졌다. 끝까지 맺을 힘조차 남지 않은 듯.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '벽에 등을 기대고 그대로 스르르 주저앉았다.', channels: ['자세'], intensity: 3 },
    ],
  },
  // ───────────────────────── 자작 데이터: 상황 ─────────────────────────
  {
    key: 'lie-confront', label: '추궁·심문', icon: '🕵️', kind: '상황',
    intro: '한쪽은 캐묻고 한쪽은 버틴다. 거리·시선·손이 팽팽하게 맞선다.',
    items: [
      { text: '탁자 위로 몸을 기울여 거리를 좁히자, 상대는 그만큼 등받이로 물러났다.', channels: ['자세'], intensity: 2 },
      { text: '같은 질문을 다시 던지고, 대답 대신 침묵으로 빈자리를 길게 비워 두었다.', channels: ['호흡·목소리'], intensity: 1, note: '침묵은 상대가 채우게 만드는 압박이다.' },
      { text: '시선을 떼지 않은 채, 손가락으로 탁자를 한 번 똑 두드렸다.', channels: ['시선', '손'], intensity: 2 },
      { text: '대답하던 상대의 목소리가 한순간 반 음 높아졌다 가라앉았다.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '물병을 천천히 상대 쪽으로 밀어 주며, "천천히 말해도 돼"라고 했다. 친절이 곧 압박이었다.', channels: ['손'], intensity: 2 },
      { text: '추궁받는 쪽은 두 손을 무릎 사이에 끼우고, 어깨를 잔뜩 웅크렸다.', channels: ['손', '팔·어깨', '자세'], intensity: 2 },
    ],
  },
  {
    key: 'first-meet', label: '첫 만남·인사', icon: '🤝', kind: '상황',
    intro: '경계와 호감이 동시에 재어지는 순간. 거리·손·미소가 신호를 보낸다.',
    items: [
      { text: '악수를 나누며 상대가 손에 준 힘을 무의식적으로 가늠했다.', channels: ['손'], intensity: 1 },
      { text: '눈을 맞추고 짧게 미소 지었다가, 적당한 순간에 자연스럽게 시선을 풀었다.', channels: ['시선', '입'], intensity: 1 },
      { text: '발끝을 상대 쪽으로 돌려 정면으로 마주 섰다. 열린 자세였다.', channels: ['발·다리', '자세'], intensity: 1 },
      { text: '명함을 두 손으로 받쳐 들고 잠시 들여다본 뒤 조심스레 갈무리했다.', channels: ['손'], intensity: 2 },
      { text: '서로 한 걸음씩, 무례하지 않을 만큼의 거리를 두고 멈춰 섰다.', channels: ['자세'], intensity: 1 },
      { text: '인사말 끝에 살짝 고개를 숙였다. 말보다 몸이 먼저 예를 표했다.', channels: ['자세'], intensity: 1 },
    ],
  },
  {
    key: 'farewell', label: '이별·작별', icon: '🚶', kind: '상황',
    intro: '떠남과 머묾이 줄다리기하는 자리. 손과 발의 어긋남이 마음을 보인다.',
    items: [
      { text: '돌아서려다 한 번 멈춰, 어깨 너머로 뒤를 돌아보았다.', channels: ['자세', '시선'], intensity: 2 },
      { text: '손을 들어 흔들려다, 어중간하게 가슴 높이에서 멈췄다.', channels: ['손'], intensity: 1 },
      { text: '발은 떠나는 방향을 향했지만, 상체와 시선은 자꾸 뒤로 끌렸다.', channels: ['발·다리', '자세', '시선'], intensity: 2, note: '몸의 분열로 미련을 보여준다.' },
      { text: '잡았던 손을 놓는 데, 손가락이 마지막까지 한 박자 더 붙어 있었다.', channels: ['손'], intensity: 2 },
      { text: '"잘 가"라는 말을 두 번 했다. 처음 것은 너무 작아서.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '문이 닫히기 직전, 두 사람의 눈이 한 번 더 마주쳤다 흩어졌다.', channels: ['시선'], intensity: 2 },
    ],
  },
  {
    key: 'argument', label: '말다툼·언쟁', icon: '🗯️', kind: '상황',
    intro: '서로의 공간을 침범하고 방어한다. 손짓은 커지고 호흡은 빨라진다.',
    items: [
      { text: '손바닥으로 탁자를 짚으며 상대 쪽으로 상체를 들이밀었다.', channels: ['손', '자세'], intensity: 3 },
      { text: '말이 빨라지고 손짓이 커져, 허공을 자르듯 손날을 휘둘렀다.', channels: ['손', '호흡·목소리'], intensity: 2 },
      { text: '한쪽은 팔짱을 끼고 고개를 옆으로 틀어, 더는 듣지 않겠다는 벽을 세웠다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '말을 끊고 들어오자, 상대는 손바닥을 들어 "잠깐"이라며 막았다.', channels: ['손'], intensity: 2 },
      { text: '목소리가 한 옥타브 올라갔다가, 제풀에 갈라져 끊겼다.', channels: ['호흡·목소리'], intensity: 2 },
      { text: '한 사람이 의자를 뒤로 밀며 일어서자, 다른 사람도 반사적으로 따라 일어섰다.', channels: ['자세', '발·다리'], intensity: 3 },
    ],
  },
  {
    key: 'waiting', label: '기다림·초조', icon: '⏳', kind: '상황',
    intro: '시간이 안 가는 몸. 작은 반복 동작이 새어 나온다.',
    items: [
      { text: '발끝으로 바닥을 빠르게, 일정하게 까딱거렸다.', channels: ['발·다리'], intensity: 1 },
      { text: '휴대폰을 켰다 끄기를 반복했다. 새로 온 것이 없는 걸 알면서도.', channels: ['손'], intensity: 1 },
      { text: '문 쪽으로 자꾸 고개를 돌렸다. 소리가 날 때마다, 안 날 때도.', channels: ['시선', '자세'], intensity: 2 },
      { text: '손톱 옆 거스러미를 만지작거리다, 의식하고는 손을 멈췄다.', channels: ['손'], intensity: 1 },
      { text: '같은 자리를 천천히 왔다 갔다 했다. 세 걸음 가고 돌아서고.', channels: ['발·다리', '자세'], intensity: 2 },
      { text: '한숨을 내쉬고 시계를 보고, 다시 한숨을 내쉬었다.', channels: ['호흡·목소리', '시선'], intensity: 1 },
    ],
  },
  {
    key: 'crowd', label: '대중 앞·발표', icon: '🎤', kind: '상황',
    intro: '시선이 쏟아지는 자리. 긴장이 손끝·목소리·자세로 새어 나온다.',
    items: [
      { text: '입을 열기 전에 마른침을 삼키고, 손에 쥔 종이 끝을 매만졌다.', channels: ['피부·생리', '손'], intensity: 2 },
      { text: '한 사람씩 눈을 맞추려 시선을 천천히 좌에서 우로 옮겨 갔다.', channels: ['시선'], intensity: 1, note: '능숙한 발표자의 의도적 시선 분배.' },
      { text: '첫 문장에서 목소리가 갈라져, 헛기침으로 가다듬고 다시 시작했다.', channels: ['호흡·목소리'], intensity: 2 },
      { text: '손이 자꾸 주머니로 들어가려 해서, 일부러 앞으로 모아 쥐었다.', channels: ['손'], intensity: 1 },
      { text: '체중을 한 발에서 다른 발로 옮기며 무의식적으로 흔들거렸다.', channels: ['발·다리', '자세'], intensity: 1 },
      { text: '말의 속도가 점점 빨라지자, 스스로 한 박자 멈추고 호흡을 골랐다.', channels: ['호흡·목소리'], intensity: 1 },
    ],
  },
  {
    key: 'comfort', label: '위로·다독임', icon: '🫂', kind: '상황',
    intro: '거리를 좁혀 무게를 나눈다. 손과 자세가 부드럽게 향한다.',
    items: [
      { text: '말없이 옆에 앉아, 어깨가 가볍게 닿을 만큼의 거리에 머물렀다.', channels: ['자세'], intensity: 1 },
      { text: '등을 천천히, 일정한 리듬으로 토닥였다.', channels: ['손'], intensity: 2 },
      { text: '눈높이를 맞추려 무릎을 굽혀 자세를 낮췄다.', channels: ['자세', '발·다리'], intensity: 2, note: '시선을 같은 높이로 — 위압을 없애는 자세.' },
      { text: '손수건이나 물잔을, 말 대신 가만히 내밀었다.', channels: ['손'], intensity: 1 },
      { text: '목소리를 평소보다 낮고 느리게 깔아, 말의 내용보다 음색으로 안심시켰다.', channels: ['호흡·목소리'], intensity: 1 },
      { text: '떨리는 상대의 손 위에 제 손을 살며시 포개 얹었다.', channels: ['손'], intensity: 2 },
    ],
  },
  {
    key: 'threat', label: '위협·기싸움', icon: '😈', kind: '상황',
    intro: '공간과 시선으로 우열을 가린다. 누가 먼저 물러나는가.',
    items: [
      { text: '시선을 깜빡임 없이 고정한 채, 입은 닫고 있었다. 눈싸움의 시작이었다.', channels: ['시선'], intensity: 2 },
      { text: '천천히 거리를 좁히며, 상대의 개인 공간을 일부러 침범했다.', channels: ['자세', '발·다리'], intensity: 3 },
      { text: '말끝마다 어깨를 들썩이고 턱을 들어, 몸집을 부풀려 보였다.', channels: ['팔·어깨', '자세'], intensity: 2 },
      { text: '주먹을 쥐지 않고 손을 활짝 펴 허벅지 옆에 늘어뜨렸다. 언제든 움직일 준비.', channels: ['손'], intensity: 1, note: '긴장된 준비 자세 — 폭발 직전의 정적.' },
      { text: '목소리를 일부러 낮춰, 상대가 귀를 기울이게 만들었다. 위협은 작게 속삭일 때 더 컸다.', channels: ['호흡·목소리'], intensity: 3 },
      { text: '한쪽이 시선을 먼저 떨구자, 다른 쪽 입꼬리가 슬며시 올라갔다.', channels: ['시선', '입'], intensity: 2 },
    ],
  },
]

const LS = 'sry:tool:gesture-body-ref:'
const ALL_KEY = '__all__'
const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Hit { cat: CatDef; item: Beat }
const flatAll = (): Hit[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const intensityLabel: Record<Intensity, string> = { 1: '미세', 2: '보통', 3: '뚜렷' }

export default function GestureBodyRef({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    // payload 로 감정/상황 카테고리를 지정해 열 수 있음
    const want = payload && typeof payload.cat === 'string' ? String(payload.cat) : ''
    if (want && CATS.some((c) => c.key === want)) return want
    return ALL_KEY
  })
  const [kindFilter, setKindFilter] = useState<'전체' | '감정' | '상황'>('전체')
  const [maxIntensity, setMaxIntensity] = useState<Intensity>(3)
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Hit | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 떠 있는 복사·토스트 타이머 취소
  useEffect(() => () => { setCopiedKey(null); setToast(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, idx: number) => `${catKey}::${idx}`

  const pool = useMemo<Hit[]>(() => {
    let base = cat === ALL_KEY ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (kindFilter !== '전체') base = base.filter(({ cat: c }) => c.kind === kindFilter)
    base = base.filter(({ item }) => item.intensity <= maxIntensity)
    return base
  }, [cat, kindFilter, maxIntensity])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = pool
    // 즐겨찾기 필터(카테고리 키 + 항목 인덱스 기반)
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, c.items.indexOf(item))])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.text.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      (item.note ? item.note.toLowerCase().includes(q) : false) ||
      item.channels.some((ch) => ch.toLowerCase().includes(q)))
    return base
  }, [query, pool, onlyFav, favs])

  const rollRandom = useCallback(() => {
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item === prev.item) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
  }, [pool])

  const toggleFav = (catKey: string, idx: number) => {
    const k = favKey(catKey, idx)
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }

  // 연계: 수집함에 담기
  const stashOne = (h: Hit) => {
    addToStash({ kind: 'note', label: `몸짓·${h.cat.label}`, text: `${h.cat.icon} ${h.cat.label} — ${h.item.text}` })
    flash(`수집함에 ‘${h.cat.label}’ 몸짓 묘사를 담았습니다.`)
  }
  // 연계: 스니펫 라이브러리에 저장
  const snippetOne = (h: Hit) => {
    addToLibrary('snippets', {
      text: h.item.text,
      source: `몸짓·표정 사전 · ${h.cat.label}`,
      tags: ['몸짓', h.cat.kind, h.cat.label, ...h.item.channels, intensityLabel[h.item.intensity]],
    })
    flash(`스니펫으로 저장했습니다 — 다른 도구에서 꺼내 쓸 수 있어요.`)
  }
  // 연계: 프로젝트 자료에 추가(현재 무작위/지정 항목)
  const projectOne = (h: Hit) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(h.cat.icon + ' ' + h.cat.label)}</b> · <i>${escapeHtml(h.cat.kind)} / 강도 ${escapeHtml(intensityLabel[h.item.intensity])}</i></p>`,
      `<p>${escapeHtml(h.item.text)}</p>`,
      `<p style="color:#888">채널: ${escapeHtml(h.item.channels.join(', '))}</p>`,
      h.item.note ? `<p style="color:#888">메모: ${escapeHtml(h.item.note)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '몸짓·묘사', title: `${h.cat.label} — 비언어 묘사`, bodyHtml })
    if (id) flash(`프로젝트 자료 〈몸짓·묘사〉에 추가했습니다.`)
  }

  // 색상/스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const chip: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px', background: 'var(--paper)' }

  const renderActions = (h: Hit, idPrefix: string) => {
    const idx = h.cat.items.indexOf(h.item)
    const isFav = !!favs[favKey(h.cat.key, idx)]
    const copyId = idPrefix + ':copy'
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="minibtn" onClick={() => copy(h.item.text, copyId)}>
          {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
        </button>
        <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(h.cat.key, idx)}
          style={{ borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
          {isFav ? '★' : '☆'}
        </button>
        <button className="minibtn" onClick={() => stashOne(h)} disabled={!hasStash()}
          title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📎"/> 수집함</button>
        <button className="minibtn" onClick={() => snippetOne(h)} title="스니펫 라이브러리에 저장"><Emoji e="🧩"/> 스니펫</button>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        감정·상황별 시선·손·자세·미세표정을 <b>{total}개</b> 묘사 문장으로 모았습니다.
        “슬펐다”라고 쓰는 대신 <b>몸이 하는 말</b>로 보여 주세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="감정·상황·채널·문장으로 검색 (예: 시선, 주먹, 침묵, 손)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 종류 + 강도 필터 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['전체', '감정', '상황'] as const).map((k) => (
            <button key={k} className="minibtn" onClick={() => setKindFilter(k)} aria-pressed={kindFilter === k}
              style={{ borderColor: kindFilter === k ? 'var(--accent)' : 'var(--border)', color: kindFilter === k ? 'var(--text)' : 'var(--muted)' }}>
              {k}
            </button>
          ))}
        </div>
        <span style={{ ...hint, marginLeft: 6 }}>강도:</span>
        {([1, 2, 3] as Intensity[]).map((lv) => (
          <button key={lv} className="minibtn" onClick={() => setMaxIntensity(lv)} aria-pressed={maxIntensity === lv}
            title={`강도 ${intensityLabel[lv]}까지 표시`}
            style={{ borderColor: maxIntensity === lv ? 'var(--accent)' : 'var(--border)', color: maxIntensity === lv ? 'var(--text)' : 'var(--muted)' }}>
            ≤{intensityLabel[lv]}
          </button>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        {CATS.filter((c) => kindFilter === '전체' || c.kind === kindFilter).map((c) => {
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
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 몸짓</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 카드 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={chip}>{random.cat.kind}</span>
            <span style={chip}>강도 {intensityLabel[random.item.intensity]}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, margin: '8px 0' }}>{random.item.text}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {random.item.channels.map((ch) => <span key={ch} style={chip}>{ch}</span>)}
          </div>
          {random.item.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e="💡"/> {random.item.note}</div>}
          {renderActions(random, 'rand')}
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="linkbar-label" style={{ ...hint }}>연계:</span>
            <button className="linkbtn" onClick={() => projectOne(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '프로젝트 자료 〈몸짓·묘사〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('show-dont-tell', { text: random.item.text })}
              title="‘말하지 말고 보여주기’ 도구로 이어가기">
              <Emoji e="✍️"/> 보여주기 도구 열기
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 몸짓이 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말이나 강도 필터로 찾아보세요.'}
          </div>
        ) : (
          // 카테고리별로 묶어 펼쳐 보여줌(헤더 + 항목)
          groupByCat(filtered).map(({ cat: c, hits }) => (
            <div key={c.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0 6px', position: 'sticky', top: 0, background: 'var(--panel)', padding: '4px 2px', borderRadius: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e={c.icon}/> {c.label}</span>
                <span style={chip}>{c.kind}</span>
                <span style={{ ...hint, marginLeft: 'auto' }}>{c.intro}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hits.map((h) => {
                  const idx = c.items.indexOf(h.item)
                  return (
                    <div key={c.key + ':' + idx} style={card}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{h.item.text}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={chip}>강도 {intensityLabel[h.item.intensity]}</span>
                        {h.item.channels.map((ch) => <span key={ch} style={chip}>{ch}</span>)}
                      </div>
                      {h.item.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}><Emoji e="💡"/> {h.item.note}</div>}
                      {renderActions(h, c.key + ':' + idx)}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={hint}>
        몸짓은 감정의 라벨이 아니라 단서입니다. 한 장면에 너무 많이 쌓지 말고, 인물·상황에 맞는 한두 가지만 골라 심으세요.
        같은 몸짓도 강도·맥락에 따라 뜻이 달라집니다.
      </div>
    </div>
  )
}

// 필터된 결과를 카테고리 순서대로 묶기
function groupByCat(hits: Hit[]): { cat: CatDef; hits: Hit[] }[] {
  const order: string[] = []
  const map = new Map<string, { cat: CatDef; hits: Hit[] }>()
  for (const h of hits) {
    if (!map.has(h.cat.key)) { map.set(h.cat.key, { cat: h.cat, hits: [] }); order.push(h.cat.key) }
    map.get(h.cat.key)!.hits.push(h)
  }
  return order.map((k) => map.get(k)!)
}
