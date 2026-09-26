// 인물 과거사 생성기 — 인물의 '등뼈'가 되는 과거사를 다섯 슬롯의 로컬 조합으로 대량 생성한다.
//   ① 어린 시절(자라온 환경) × ② 결정적 사건(인생을 비튼 한 점) × ③ 상실(잃은 것) ×
//   ④ 형성된 신념(그 결과 품게 된 믿음/규칙) × ⑤ 비밀(아무에게도 말 못한 것).
//   슬롯별 🔒 잠금 + 부분 재생성(🎲), 조합수(천만+) 표시, 보관함(localStorage 자동 저장/복원).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage 만 사용. 외부 네트워크/미디어 불필요.
// 연계(linkbus): 과거사를 character 라이브러리에 저장 / 프로젝트(인물)에 카드로 추가 / 수집함에 담기 /
//   인물 시트(character-sheet)를 데이터와 함께 열기.
import { useEffect, useMemo, useState } from 'react'
import {
  addToProject,
  hasProjectBridge,
  openToolLinked,
  addToLibrary,
  addToStash,
  hasStash,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'character-backstory-gen',
  name: '인물 과거사 생성기',
  icon: '📜',
  group: '캐릭터',
  intro: '어린 시절×결정적 사건×상실×형성된 신념×비밀로 인물의 등뼈가 되는 과거사를 빚으세요',
  w: 580,
  h: 680,
}

const LS = 'sry:tool:character-backstory-gen'

// ── ① 어린 시절(자라온 환경) — 인물의 토양. ──
const CHILDHOOD: string[] = [
  '가난하지만 웃음이 끊이지 않던 대가족의 막내로 자랐다',
  '엄격한 규율 아래, 칭찬 한마디 들어본 적 없는 집에서 컸다',
  '부모가 일찍 떠나, 조부모 손에서 옛이야기를 들으며 자랐다',
  '늘 이사를 다녀 어느 곳도 고향이라 부르지 못한 채 컸다',
  '부유했지만 부모의 무관심 속에 텅 빈 큰 집에서 혼자 자랐다',
  '병약해서 또래와 어울리지 못하고 책과 창밖만 보며 컸다',
  '거리에서, 누구의 보호도 없이 스스로 살아남는 법을 배우며 자랐다',
  '천재라 불리며 어른들의 기대를 한 몸에 지고 자랐다',
  '형제들 틈에서 늘 비교당하며 두 번째로 밀려난 채 컸다',
  '전쟁이나 재난의 그늘 아래, 두려움을 친구 삼아 자랐다',
  '떠돌이 예인·상인 무리를 따라 한곳에 머물지 못하고 컸다',
  '신앙심 깊은 공동체의 규율 속, 의심은 죄라 배우며 자랐다',
  '한부모의 손에서, 어른 노릇을 대신하며 일찍 철이 들었다',
  '시골의 자연 속에서 짐승과 흙을 벗 삼아 거리낌 없이 자랐다',
  '명문가의 후계자로, 가문의 무게를 어릴 때부터 짊어졌다',
  '입양되어, 닮은 데 하나 없는 가족 사이에서 겉돌며 컸다',
  '늘 아픈 가족을 돌보느라 제 어린 시절을 누려보지 못했다',
  '뛰어난 형제의 그림자에 가려, 있어도 없는 듯 컸다',
  '거짓말과 술수가 일상인 집에서, 누구도 믿지 않는 법을 배웠다',
  '낯선 땅으로 옮겨 와, 말도 풍습도 다른 곳에서 이방인으로 자랐다',
  '예술이나 학문에 미친 부모 밑에서, 재능 아니면 사랑받지 못했다',
  '폭력이 오가는 집에서, 숨죽이고 눈치 보는 법부터 익혔다',
  '모두가 떠받드는 마을의 자랑으로, 실수가 허락되지 않았다',
  '버려진 채 보육 시설을 전전하며, 정 붙일 새 없이 컸다',
  '빚쟁이를 피해 야반도주를 거듭하는 부모를 따라 숨어 살며 컸다',
  '귀하게 얻은 외동으로, 온 집안의 사랑과 통제를 한꺼번에 받으며 자랐다',
  '바다와 배 위에서, 뭍의 규칙은 모른 채 거친 사내들 틈에서 컸다',
  '하인과 시종이 시중드는 저택에서, 또래 친구 하나 없이 외롭게 자랐다',
]

// ── ② 결정적 사건(인생을 비튼 한 점) — 과거사의 척추. ──
const EVENT: string[] = [
  '믿었던 사람의 배신으로 모든 것이 한순간에 무너진 날',
  '자신의 선택이 누군가를 돌이킬 수 없는 길로 몰아넣은 사건',
  '간신히 살아남았지만 곁의 사람은 끝내 돌아오지 못한 사고',
  '평생 우러러보던 존재의 추악한 진실을 우연히 알게 된 순간',
  '한 번의 비겁함이 평생의 낙인이 되어버린 일',
  '온 힘을 다해 지키려 했던 것이 눈앞에서 부서진 날',
  '거짓말 하나가 눈덩이처럼 불어 돌이킬 수 없게 된 사건',
  '재능을 처음 인정받았으나, 그 대가가 너무 컸던 일',
  '쫓기듯 고향과 사람들을 등지고 떠나야 했던 밤',
  '용서받을 수 없는 일을 저지르고도 들키지 않은 채 살아온 비밀',
  '가족을 살리려 끔찍한 거래에 손을 댄 사건',
  '눈앞의 불의를 보고도 끝내 침묵해버린 그날',
  '운명처럼 만난 한 사람이 인생의 방향을 통째로 바꿔놓은 순간',
  '죽음의 문턱에서 살아 돌아와, 세상이 달라 보이게 된 일',
  '오랜 누명을 쓰고 모든 것을 빼앗긴 채 추방당한 사건',
  '복수를 맹세하게 만든, 결코 잊을 수 없는 그 한 장면',
  '자신이 옳다 믿고 한 일이 끔찍한 결과를 부른 사건',
  '한순간의 충동이 평생을 옭아맨 돌이킬 수 없는 선택',
  '세상이 무너지는 줄 알았던 거대한 상실 뒤, 홀로 남겨진 일',
  '비밀을 지키려다 더 큰 거짓의 늪에 빠져버린 사건',
  '간절히 바라던 것을 손에 넣은 바로 그 순간, 모든 것을 잃은 일',
  '어린 날의 약속을 지키지 못해 평생을 빚진 채 살아온 사건',
  '구해줄 수 있었던 사람을 외면하고 떠나버린 그 길목',
  '자신을 키워준 손에 칼을 겨눠야 했던 운명의 밤',
  '평생을 바친 일이 한순간에 거짓으로 들통나 무너진 사건',
  '낯선 이의 친절이 알고 보니 거대한 함정이었던 일',
  '제 손으로 내린 결정이 수많은 사람의 운명을 갈라놓은 순간',
  '오랜 세월 찾아 헤매던 답을 마침내 얻었으나 차라리 모를 것을 후회한 일',
]

// ── ③ 상실(그 결과 잃은 것) — 과거사의 빈자리. ──
const LOSS: string[] = [
  '세상에서 가장 사랑하던 사람',
  '자기 자신에 대한 믿음',
  '돌아갈 집과 고향',
  '한때 품었던 순수한 꿈',
  '사람을 믿는 마음',
  '이름과 신분, 살아온 모든 흔적',
  '죄책감 없이 잠들 수 있는 밤',
  '평범하게 살 수 있는 자격',
  '한쪽 감각, 혹은 몸의 일부',
  '둘도 없던 단 하나의 친구',
  '신을, 혹은 세상의 정의를 믿던 마음',
  '되찾을 수 없는 어린 시절',
  '자신이 옳다는 확신',
  '두려움 없이 사랑할 용기',
  '지켜야 했던 사람들 앞에서의 떳떳함',
  '한 번 더 기회가 있으리란 희망',
  '자신의 진짜 이름을 말할 자유',
  '누군가에게 온전히 기댈 수 있는 능력',
  '과거의 자신으로 돌아갈 길',
  '세상이 살 만한 곳이라는 믿음',
  '아침을 기다릴 줄 아는 마음',
  '평생을 함께하기로 한 약속',
  '거울 속 자신을 똑바로 보는 일',
  '소리 내어 웃을 줄 알던 시절',
  '아무 조건 없이 받았던 한 사람의 신뢰',
  '오래 지켜온 가문의 이름과 명예',
]

// ── ④ 형성된 신념(그 결과 품게 된 믿음/규칙) — 인물의 행동을 지배하는 축. ──
const BELIEF: string[] = [
  '"먼저 마음을 주는 쪽이 반드시 다친다."',
  '"강하지 않으면 살아남을 자격조차 없다."',
  '"누구도, 무엇도 끝까지 믿어선 안 된다."',
  '"내 손으로 지키지 않으면 아무도 지켜주지 않는다."',
  '"잘못은 반드시 대가를 치러야 한다 — 나 자신부터."',
  '"진실은 사람을 구하지 않는다. 때론 거짓이 더 친절하다."',
  '"한 번 떠난 것은 결코 돌아오지 않는다."',
  '"사랑은 약점이고, 약점은 빼앗기기 마련이다."',
  '"세상은 공평하지 않으니, 내가 직접 저울을 바로잡겠다."',
  '"무릎 꿇지 않으려면 아무것도 바라지 말아야 한다."',
  '"용서받을 수 없다면, 차라리 잊혀지는 편이 낫다."',
  '"내가 가진 모든 것은 언젠가 반드시 사라진다."',
  '"약한 자에게 세상은 이유 없이 잔인하다."',
  '"누군가를 살리려면 다른 누군가를 버려야만 한다."',
  '"완벽하지 않으면 사랑받을 가치도 없다."',
  '"내가 멈추는 순간 모든 것이 무너진다."',
  '"진짜 나를 보여주면 결국 버림받는다."',
  '"빚진 것은 무슨 수를 써서라도 갚아야 한다."',
  '"희망을 품는 것이 가장 위험한 일이다."',
  '"세상을 바꿀 수 없다면, 적어도 나만은 더럽히지 않겠다."',
  '"기대하지 않으면 실망할 일도 없다."',
  '"내가 먼저 떠나야, 떠나는 뒷모습을 보지 않는다."',
  '"빚을 지면 반드시 약점이 된다 — 누구에게도 신세 지지 않겠다."',
  '"진심은 들키는 순간 무기가 되어 돌아온다."',
  '"멈춰 서서 슬퍼할 틈에 차라리 한 걸음 더 나아간다."',
  '"내가 옳다고 증명하는 길은 끝까지 살아남는 것뿐이다."',
]

// ── ⑤ 비밀(아무에게도 말 못한 것) — 과거사의 잠긴 방. ──
const SECRET: string[] = [
  '그 사건의 진짜 책임이 자신에게 있다는 사실',
  '지금의 이름도, 과거도 전부 꾸며낸 것이라는 사실',
  '가장 미워하는 사람을 사실은 가장 닮고 싶어 한다는 것',
  '오래전 누군가의 죽음을 막을 수 있었음을 안다는 것',
  '겉으로 섬기는 대의를 마음속으론 믿지 않는다는 것',
  '한때 자신이 가장 경멸하던 부류였다는 과거',
  '매일 밤 같은 악몽에 시달리며 잠들지 못한다는 것',
  '곁의 사람을 지키기 위해 끔찍한 거짓을 이어가고 있다는 것',
  '돌아갈 수만 있다면 모든 것을 다르게 했으리란 후회',
  '아직도 떠난 사람을 향한 복수를 마음에 품고 있다는 것',
  '자신이 누군가의 잃어버린 혈육일지 모른다는 의심',
  '겉보기와 달리 글을 모른다거나, 치명적 약점을 숨기고 있다는 것',
  '사랑하는 이를 위해 다른 누군가를 희생시킨 적이 있다는 것',
  '자신이 두려워하는 그 일을 사실은 직접 저질렀다는 것',
  '겉으로 강한 척하지만 혼자서는 단 하루도 못 견딘다는 것',
  '한 번 더 같은 상황이 와도 똑같이 비겁할 것을 안다는 것',
  '오래된 약속 때문에 평생 한 사람을 몰래 지켜보고 있다는 것',
  '자신이 물려받은 핏줄, 혹은 능력의 진짜 정체',
  '죄를 덮으려 무덤까지 가져갈 거짓 증언을 했다는 것',
  '아직도 그 사람을 잊지 못하고 매일 떠올린다는 것',
  '지금 곁에 둔 사람을 처음엔 다른 목적으로 접근했다는 것',
  '남들이 우러러보는 자신의 업적이 사실은 남의 것이라는 것',
  '믿는 척하는 신념을 등지고 몰래 반대편을 돕고 있다는 것',
  '제 손으로 불태운 편지 한 통이 모든 비극의 시작이었다는 것',
  '겉으로 미워하는 척하는 그 사람이 사실은 유일한 버팀목이라는 것',
  '언젠가 모든 것을 버리고 도망칠 계획을 오래전부터 세워두었다는 것',
]

// ── ⑥ 겉으로 드러나는 모습(표면) — 상처가 바깥으로 새어 나오는 얼굴. ──
//    '겉으로는 …' 뒤에 자연스럽게 이어지는 종결문(독립적으로 성립).
const MASK: string[] = [
  '겉으로는 늘 웃는 낯으로, 속을 들키는 법이 없다',
  '겉으로는 누구에게나 무뚝뚝하고 거리를 둔다',
  '겉으로는 더없이 예의 바르고 빈틈없어 보인다',
  '겉으로는 농담을 달고 살며 분위기를 가볍게 만든다',
  '겉으로는 차분하고 침착해 좀처럼 동요하지 않는다',
  '겉으로는 자신만만하고 거침없어 보인다',
  '겉으로는 모든 일에 시큰둥하고 무심한 척한다',
  '겉으로는 따뜻하고 친절해 사람들이 쉽게 기댄다',
  '겉으로는 까칠하고 날이 서 있어 가까이하기 어렵다',
  '겉으로는 한없이 성실하고 모범적으로 보인다',
  '겉으로는 화려하고 떠들썩하게 사람들의 눈길을 끈다',
  '겉으로는 조용하고 눈에 띄지 않게 처신한다',
  '겉으로는 냉정하고 계산적인 사람처럼 군다',
  '겉으로는 호탕하고 시원시원해 속을 다 보여주는 듯하다',
  '겉으로는 어딘가 늘 지쳐 보이고 말수가 적다',
  '겉으로는 짓궂고 능청스러워 진심을 가늠하기 힘들다',
  '겉으로는 빈틈없이 단정하고 절제된 모습을 유지한다',
  '겉으로는 거칠고 위협적인 인상을 일부러 풍긴다',
  '겉으로는 천진하고 순박해 의심을 받지 않는다',
  '겉으로는 도도하고 콧대 높은 사람으로 비친다',
  '겉으로는 누구보다 든든하고 믿음직스럽게 행동한다',
  '겉으로는 매사에 신중하고 좀처럼 속내를 내비치지 않는다',
  '겉으로는 장난기 가득하지만 정작 자기 얘기는 하지 않는다',
  '겉으로는 부드럽고 다정하나 결정적인 순간엔 선을 긋는다',
  '겉으로는 무심한 듯하면서도 사람을 세심히 살핀다',
  '겉으로는 활기차고 밝아 그늘이라곤 없어 보인다',
]

// ── ⑦ 대처 방식(상처를 다루는 손버릇) — 갈등 앞에서 튀어나오는 습관. ──
//    '갈등 앞에서는 …' 뒤에 이어지는 종결문(독립적으로 성립).
const COPING: string[] = [
  '갈등 앞에서는 먼저 거리를 두고 혼자 삭이려 한다',
  '갈등 앞에서는 농담으로 분위기를 흩뜨려 화제를 돌린다',
  '갈등 앞에서는 일에 파묻혀 감정을 외면한다',
  '갈등 앞에서는 상대보다 먼저 공격해 주도권을 쥔다',
  '갈등 앞에서는 한 발 물러나 상황을 끝까지 관찰한다',
  '갈등 앞에서는 책임을 떠안고 혼자 짊어지려 한다',
  '갈등 앞에서는 침묵으로 벽을 세우고 입을 닫는다',
  '갈등 앞에서는 논리를 앞세워 차갑게 따져 든다',
  '갈등 앞에서는 자리를 피해 어디론가 사라져버린다',
  '갈등 앞에서는 무엇이든 통제하려 들며 계획에 매달린다',
  '갈등 앞에서는 상대의 마음을 먼저 헤아려 자신을 뒤로 미룬다',
  '갈등 앞에서는 분노를 안으로 삼켰다가 엉뚱한 데서 터뜨린다',
  '갈등 앞에서는 끝까지 버티며 결코 먼저 굽히지 않는다',
  '갈등 앞에서는 웃어넘기며 아무렇지 않은 척한다',
  '갈등 앞에서는 작은 일도 곱씹으며 오래 자책한다',
  '갈등 앞에서는 핑계와 거짓으로 위기를 모면하려 한다',
  '갈등 앞에서는 누군가에게 기대 위로받으려 든다',
  '갈등 앞에서는 규칙과 명분을 방패처럼 내세운다',
  '갈등 앞에서는 정면으로 부딪쳐 끝장을 보려 한다',
  '갈등 앞에서는 손에 잡히는 일부터 하나씩 정리하려 한다',
  '갈등 앞에서는 상대를 시험하듯 일부러 떠본다',
  '갈등 앞에서는 모든 걸 자기 탓으로 돌려 사과부터 한다',
  '갈등 앞에서는 차라리 관계를 먼저 끊어버리려 한다',
  '갈등 앞에서는 겉으론 수긍하고 속으론 다른 길을 준비한다',
  '갈등 앞에서는 감정을 숨긴 채 지나치게 예의를 차린다',
  '갈등 앞에서는 한참을 미루다 막판에 몰려서야 움직인다',
]

// ── 인물 역할 후보 ──
const ROLES = ['주인공', '조력자', '적대자', '멘토', '라이벌', '연인', '가족', '동료', '관찰자']

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

// ── 조사 자동 선택 — 앞 글자의 받침 유무를 보고 실제 조사 하나를 골라 출력 ──
//   괄호 이중표기('을(를)' 등)를 절대 노출하지 않도록 한글 종성을 계산한다.
//   인용부호("…") 등 비한글로 끝나면 받침 없는 형태(보수적)로 처리.
function lastHangul(s: string): string {
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i]
    if (c >= '가' && c <= '힣') return c
  }
  return ''
}
// 받침(종성) 유무. 'ㄹ' 받침은 '으로/로' 판정에서 따로 본다.
function jongIndex(ch: string): number {
  if (!ch) return -1
  return (ch.charCodeAt(0) - 0xac00) % 28 // 0 = 받침 없음
}
function hasJong(word: string): boolean {
  const ch = lastHangul(word)
  return ch ? jongIndex(ch) !== 0 : false
}
// 을/를, 이/가, 은/는
function josaEul(word: string): string { return word + (hasJong(word) ? '을' : '를') }
function josaI(word: string): string { return word + (hasJong(word) ? '이' : '가') }
function josaNeun(word: string): string { return word + (hasJong(word) ? '은' : '는') }
// 으로/로 — 받침 없음 또는 'ㄹ'(종성 8) 받침이면 '로'
function josaRo(word: string): string {
  const j = jongIndex(lastHangul(word))
  return word + ((j <= 0 || j === 8) ? '로' : '으로')
}
void josaI; void josaRo // 현재 미사용(향후 슬롯 확장 대비)

interface Gen {
  childhood: string
  event: string
  loss: string
  belief: string
  secret: string
  mask: string
  coping: string
}
type SlotKey = keyof Gen

function genOne(): Gen {
  return {
    childhood: pick(CHILDHOOD),
    event: pick(EVENT),
    loss: pick(LOSS),
    belief: pick(BELIEF),
    secret: pick(SECRET),
    mask: pick(MASK),
    coping: pick(COPING),
  }
}

// 조합수: 7개 슬롯(어린 시절×결정적 사건×상실×신념×비밀×표면×대처)의 곱.
const COMBOS =
  CHILDHOOD.length * EVENT.length * LOSS.length * BELIEF.length *
  SECRET.length * MASK.length * COPING.length

const SLOT_ROWS: { k: SlotKey; label: string; icon: string }[] = [
  { k: 'childhood', label: '어린 시절(토양)', icon: '🌱' },
  { k: 'event', label: '결정적 사건(전환점)', icon: '⚡' },
  { k: 'loss', label: '상실(잃은 것)', icon: '🕯️' },
  { k: 'belief', label: '형성된 신념(축)', icon: '🧭' },
  { k: 'secret', label: '비밀(잠긴 방)', icon: '🔑' },
  { k: 'mask', label: '겉으로 드러나는 모습(표면)', icon: '🎭' },
  { k: 'coping', label: '대처 방식(손버릇)', icon: '🌀' },
]

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화. & 먼저.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 인물 호칭(이름 없으면 '이 인물')
function whoOf(name: string): string {
  return name.trim() ? name.trim() : '이 인물'
}

// 과거사 한 묶음을 평문으로 (복사·라이브러리·수집함용)
function genToText(g: Gen, name: string): string {
  const who = whoOf(name)
  return (
    `📜 ${who}의 과거사\n` +
    `· 🌱 어린 시절: ${josaNeun(who)} ${g.childhood}.\n` +
    `· ⚡ 결정적 사건: ${g.event}.\n` +
    `· 🕯️ 상실: 그 일로 ${josaEul(g.loss)} 잃었다.\n` +
    `· 🧭 형성된 신념: 그래서 마음에 새겼다 — ${g.belief}\n` +
    `· 🔑 비밀: 그러나 아무에게도 말하지 못한다 — ${g.secret}.\n` +
    `· 🎭 겉으로: ${g.mask}.\n` +
    `· 🌀 대처: ${g.coping}.`
  )
}

// 서사형 한 문단(요약/시놉시스용)
function genToNarrative(g: Gen, name: string): string {
  const who = whoOf(name)
  return (
    `${josaNeun(who)} ${g.childhood}. 그러던 어느 날, ${g.event}. ` +
    `그 일로 ${josaNeun(who)} ${josaEul(g.loss)} 잃었고, 마음 깊이 ${g.belief} 라는 믿음을 새겼다. ` +
    `${g.mask}. 그래서 ${g.coping}. ` +
    `그리고 지금도 아무에게도 말하지 못한 비밀이 하나 있다 — ${g.secret}.`
  )
}

// 프로젝트 본문(HTML)
function genToBodyHtml(g: Gen, name: string): string {
  const who = escHtml(whoOf(name))
  return (
    `<p><strong>📜 ${who}의 과거사</strong></p>` +
    `<p><strong>🌱 어린 시절:</strong> ${escHtml(josaNeun(who))} ${escHtml(g.childhood)}.</p>` +
    `<p><strong>⚡ 결정적 사건:</strong> ${escHtml(g.event)}.</p>` +
    `<p><strong>🕯️ 상실:</strong> 그 일로 ${escHtml(josaEul(g.loss))} 잃었다.</p>` +
    `<p><strong>🧭 형성된 신념:</strong> ${escHtml(g.belief)}</p>` +
    `<p><strong>🔑 비밀:</strong> ${escHtml(g.secret)}.</p>` +
    `<p><strong>🎭 겉으로 드러나는 모습:</strong> ${escHtml(g.mask)}.</p>` +
    `<p><strong>🌀 대처 방식:</strong> ${escHtml(g.coping)}.</p>` +
    `<hr/>` +
    `<p>${escHtml(genToNarrative(g, name))}</p>`
  )
}

interface Saved {
  id: string
  name: string
  role: string
  childhood: string
  event: string
  loss: string
  belief: string
  secret: string
  mask: string
  coping: string
  note: string
}

function uid(): string {
  return 'bs_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((s) => s && typeof s.childhood === 'string')
      .map((s) => ({
        id: typeof s.id === 'string' ? s.id : uid(),
        name: typeof s.name === 'string' ? s.name : '',
        role: typeof s.role === 'string' ? s.role : ROLES[0],
        childhood: String(s.childhood),
        event: typeof s.event === 'string' ? s.event : '',
        loss: typeof s.loss === 'string' ? s.loss : '',
        belief: typeof s.belief === 'string' ? s.belief : '',
        secret: typeof s.secret === 'string' ? s.secret : '',
        mask: typeof s.mask === 'string' ? s.mask : '',
        coping: typeof s.coping === 'string' ? s.coping : '',
        note: typeof s.note === 'string' ? s.note : '',
      }))
  } catch { return [] }
}

export default function CharacterBackstoryGen({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>(ROLES[0])
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [toast, setToast] = useState('')
  // 사용자 정의 항목(라벨+값, 사용자가 직접 작성) — 무작위 생성 대상 아님
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  // 고정 '기타' 자유 입력
  const [etc, setEtc] = useState('')

  // 외부 payload(이름·역할)로 시작값 반영(마운트 1회)
  useMemo(() => {
    if (payload && typeof payload.name === 'string') setName(payload.name)
    if (payload && typeof payload.role === 'string' && ROLES.includes(payload.role)) setRole(payload.role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 보관함 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 토스트 정리(언마운트/재설정 시 타이머 해제)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  const flash = (m: string) => setToast(m)

  // 전체 생성(잠긴 슬롯 유지) — 사용자 정의 항목의 값과 '기타'는 비우되 항목(라벨)은 유지
  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of SLOT_ROWS) {
        if (locked[r.k]) next[r.k] = prev[r.k]
      }
      return next
    })
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // 사용자 정의 항목: 추가 / 값 변경 / 삭제
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 말버릇, 가문 문장, 좌우명)')
    if (label == null) return
    const trimmed = label.trim()
    if (!trimmed) return
    setCustom((prev) => [...prev, { id: uid(), label: trimmed, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))
  // 항목만 다시
  const rollOne = (k: SlotKey) => {
    if (locked[k]) return
    setG((prev) => {
      const fresh = genOne()
      return { ...prev, [k]: fresh[k] }
    })
  }
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const who = whoOf(name)

  const copyCur = () => {
    const text = genToText(g, name) + extraToText()
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 돼요'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했어요')).catch(() => flash('복사 실패'))
  }

  const saveCur = () => {
    const rec: Saved = {
      id: uid(), name: name.trim(), role,
      childhood: g.childhood, event: g.event, loss: g.loss, belief: g.belief, secret: g.secret,
      mask: g.mask, coping: g.coping, note: '',
    }
    setSaved((prev) => [rec, ...prev])
    flash('보관함에 저장했어요')
  }

  // 수집함에 담기 — 과거사 전문을 메모로
  const toStash = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없어요'); return }
    addToStash({ kind: 'note', label: `📜 ${who}의 과거사`, text: genToText(g, name) + extraToText() })
    flash('수집함에 담았어요')
  }

  // 사용자 정의 항목 + 기타 → 필드 맵(값이 비어있지 않은 것만). 키 = 항목 라벨 그대로, 기타는 'etc'.
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) {
      const v = c.value.trim()
      const key = c.label.trim()
      if (v && key) out[key] = v
    }
    const e = etc.trim()
    if (e) out.etc = e
    return out
  }

  // 정규 캐릭터 필드(키→값) — 받는 허브(인물 시트/라이브러리)에서 제자리에 들어가도록 표준 키로 매핑
  const canonFields = (): Record<string, string> => ({
    name: name.trim() || '(이름 미정)',
    role,
    value: g.belief.replace(/^"|"$/g, ''),        // 형성된 신념 → 가치관
    personality: `형성된 신념 — ${g.belief} / 겉으로는 ${g.mask}`, // 신념·표면이 빚어낸 성격
    secret: g.secret,                              // 비밀 → 비밀
    background: `어린 시절: ${g.childhood}. 결정적 사건: ${g.event}. 상실: ${josaEul(g.loss)} 잃음. 대처: ${g.coping}.`, // 토양·전환점·상실·대처 → 배경
    notes: genToNarrative(g, name),                // 서사 요약 → 메모
    ...extraFields(),                              // 사용자 정의 항목 + 기타(비어있지 않은 것만)
  })

  // 사용자 정의 항목 + 기타를 평문으로(복사·수집함·프로젝트 본문 부가)
  const extraToText = (): string => {
    const lines: string[] = []
    for (const c of custom) {
      const v = c.value.trim()
      const key = c.label.trim()
      if (v && key) lines.push(`· ${key}: ${v}`)
    }
    const e = etc.trim()
    if (e) lines.push(`· 기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  // character 라이브러리에 인물로 저장 — 과거사를 인물 필드로 매핑
  const toLibrary = () => {
    const rec = addToLibrary('characters', {
      name: name.trim() || '(이름 미정)',
      role,
      personality: `형성된 신념: ${g.belief}`,
      goal: `과거사 토양: ${g.childhood}`,
      secret: g.secret,
      notes: genToNarrative(g, name),
      fields: canonFields(),
      source: '인물 과거사 생성기',
    })
    flash(rec ? '인물 라이브러리에 저장했어요' : '저장에 실패했어요')
  }

  // 프로젝트 자료(인물)에 과거사 카드 추가
  // 사용자 정의 항목 + 기타 → 본문 HTML 부가(비어있지 않은 것만)
  const extraToHtml = (): string => {
    const rows: string[] = []
    for (const c of custom) {
      const v = c.value.trim()
      const key = c.label.trim()
      if (v && key) rows.push(`<p><strong>${escHtml(key)}:</strong> ${escHtml(v)}</p>`)
    }
    const e = etc.trim()
    if (e) rows.push(`<p><strong>기타:</strong> ${escHtml(e)}</p>`)
    return rows.length ? `<hr/>${rows.join('')}` : ''
  }

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `과거사 — ${name.trim() ? name.trim() : '인물'}`,
      bodyHtml: genToBodyHtml(g, name) + extraToHtml(),
      synopsis: genToNarrative(g, name).slice(0, 120),
      meta: { 인물: name.trim() || '미정', 역할: role, 핵심신념: g.belief.replace(/^"|"$/g, '') },
    })
    flash(id ? '프로젝트 자료(인물)에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  // 인물 시트로 — 과거사를 정규 시트 필드로 매핑하여 열기(받는 칸에 제자리로)
  const toSheet = () => {
    const fields = canonFields()
    openToolLinked('character-sheet', { character: fields })
    flash('인물 시트로 보냈어요')
  }

  // 보관함 조작
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const loadToGen = (s: Saved) => {
    setG({ childhood: s.childhood, event: s.event, loss: s.loss, belief: s.belief, secret: s.secret, mask: s.mask, coping: s.coping })
    if (s.name) setName(s.name)
    if (ROLES.includes(s.role)) setRole(s.role)
    setLocked({})
    setTab('gen')
    flash('생성기로 불러왔어요')
  }
  const copySaved = (s: Saved) => {
    const g2: Gen = { childhood: s.childhood, event: s.event, loss: s.loss, belief: s.belief, secret: s.secret, mask: s.mask, coping: s.coping }
    const text = genToText(g2, s.name) + (s.note ? `\n📝 ${s.note}` : '')
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 돼요'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했어요')).catch(() => flash('복사 실패'))
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const inputStyle: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const line: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>어린 시절</b> · <b>결정적 사건</b> · <b>상실</b> · <b>형성된 신념</b> · <b>비밀</b>의 다섯 조각으로
        인물의 <b>등뼈가 되는 과거사</b>를 빚으세요. 마음에 드는 조각은 <Emoji e="🔒"/> 잠그고 나머지만 다시 굴립니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📜"/> 생성기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {tab === 'gen' && (
        <>
          {/* 인물 정보(선택) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="인물 이름(선택)"
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, minWidth: 90 }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* 결과 + 슬롯 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {/* 서사 카드 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 10px' }}>
                  <Emoji e="📜"/> {who}의 과거사
                </span>
              </div>
              <div style={line}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🌱"/> </span>
                <b>{who}</b>{hasJong(who) ? '은' : '는'} {g.childhood}.
              </div>
              <div style={line}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="⚡"/> </span>
                그러던 어느 날, {g.event}.
              </div>
              <div style={line}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🕯️"/> </span>
                그 일로 <b>{g.loss}</b>{hasJong(g.loss) ? '을' : '를'} 잃었다.
              </div>
              <div style={{ ...line, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🧭"/> 형성된 신념 — </span>
                마음에 새겼다: {g.belief}
              </div>
              <div style={{ ...line, background: 'var(--paper)', border: '1px solid var(--warn)', borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}><Emoji e="🔑"/> 비밀 — </span>
                그러나 아무에게도 말하지 못한다: {g.secret}.
              </div>
              <div style={line}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🎭"/> </span>
                {g.mask}.
              </div>
              <div style={line}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🌀"/> </span>
                그래서 {g.coping}.
              </div>
            </div>

            {/* 슬롯(잠금/부분 재생성) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SLOT_ROWS.map((r) => {
                const val = g[r.k]
                return (
                  <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 8px' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 132, flexShrink: 0 }}><Emoji e={r.icon}/> {r.label}</span>
                    <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>{val}</span>
                    <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)}
                      style={{ padding: '0 5px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                    <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 5px' }}><Emoji e="🎲"/></button>
                  </div>
                )
              })}
            </div>

            {/* 사용자 정의 항목 — 직접 작성(무작위 생성 안 함) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>사용자 정의 항목</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addCustom} title="직접 작성할 항목을 추가합니다">＋ 항목 추가</button>
              </div>
              {custom.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 132, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 작성…"
                    style={{ ...inputStyle, flex: 1, minWidth: 80 }}
                  />
                  <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ padding: '0 6px', borderColor: 'var(--warn)', color: 'var(--warn)' }}>✕</button>
                </div>
              ))}
            </div>

            {/* 고정 '기타' 자유 입력 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>기타</span>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="자유롭게 적어두세요 — 외모·관계·말투·메모 등 무엇이든…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* 생성/복사/저장 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🎲"/> 과거사 생성 / 다시 섞기</button>
            <button className="minibtn" onClick={copyCur}><Emoji e="📋"/> 복사</button>
            <button className="minibtn" onClick={saveCur}><Emoji e="⭐"/> 보관</button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연동:</span>
            <button className="linkbtn" onClick={toStash} disabled={!hasStash()}
              title={hasStash() ? '과거사 전문을 수집함에 담기' : '수집함을 사용할 수 없습니다'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 과거사를 프로젝트 자료(인물)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toLibrary} title="이 인물을 공유 라이브러리(인물)에 저장 — 시트·관계도 등에서 사용"><Emoji e="🗂️"/> 인물 라이브러리</button>
            <button className="linkbtn" onClick={toSheet} title="이 과거사를 인물 시트로 열기"><Emoji e="🪪"/> 인물 시트로</button>
          </div>

          <div style={{ ...hint, color: toast ? 'var(--ok)' : 'var(--muted)' }}>
            {toast || '과거사는 인물이 "왜 그렇게 행동하는가"의 답입니다. 신념과 비밀은 현재의 갈등으로 곧장 이어집니다.'}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="📜"/></div>
              보관한 과거사가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 인물 과거사를 모아보세요.</span>
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>
                  <Emoji e="📜"/> {s.name || '인물'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {s.role}</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => loadToGen(s)} title="생성기로 불러오기" style={{ padding: '0 6px' }}>↩</button>
                <button className="minibtn" onClick={() => copySaved(s)} title="복사" style={{ padding: '0 6px' }}><Emoji e="📋"/></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ padding: '0 6px', borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <div><span style={{ color: 'var(--muted)' }}><Emoji e="🌱"/></span> {s.childhood}.</div>
                <div><span style={{ color: 'var(--muted)' }}><Emoji e="⚡"/></span> {s.event}.</div>
                <div><span style={{ color: 'var(--muted)' }}><Emoji e="🕯️"/></span> {s.loss}{hasJong(s.loss) ? '을' : '를'} 잃음.</div>
                <div><span style={{ color: 'var(--accent)' }}><Emoji e="🧭"/></span> {s.belief}</div>
                <div><span style={{ color: 'var(--warn)' }}><Emoji e="🔑"/></span> {s.secret}.</div>
                {s.mask && <div><span style={{ color: 'var(--muted)' }}><Emoji e="🎭"/></span> {s.mask}.</div>}
                {s.coping && <div><span style={{ color: 'var(--muted)' }}><Emoji e="🌀"/></span> {s.coping}.</div>}
              </div>
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="이 과거사를 내 인물에게 어떻게 쓸지 메모…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          ))}
          {saved.length > 0 && <div style={hint}>보관한 과거사는 자동 저장됩니다. ↩ 로 생성기에 불러와 슬롯을 잠그고 변주할 수 있어요.</div>}
        </div>
      )}
    </div>
  )
}
