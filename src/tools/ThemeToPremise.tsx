// 주제→전제 변환기 — 추상 주제(예: "복수의 공허함")를 구체 전제(인물+상황+딜레마)로 변환.
//  주제는 ① 풍부한 자작 카테고리 사전에서 고르거나 ② 직접 입력. 각 주제는 "이 주제를 드러내는"
//  슬롯 풀(인물/상황/딜레마/대가/아이러니)을 굴려 한 문단짜리 구체 전제로 변환한다.
//  슬롯별 잠금(🔒) → 잠긴 슬롯은 유지하고 나머지만 재생성. 조합수 표시.
//  자급식: 외부 네트워크·라이브러리 없음(react + ./linkbus 만, Math.random + localStorage).
//  연계: 📎 수집함 / 💾 스니펫 / 📄 프로젝트 자료 〈전제〉 폴더 / 🔗 전제·What-if 생성기 열기.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'theme-to-premise', name: '주제→전제 변환기', icon: '🎭', group: '영감·발상', intro: '추상 주제를 인물·상황·딜레마가 살아있는 구체 전제로 바꿔드립니다', w: 500, h: 680 }

// ---------- 슬롯 정의 ----------
// 각 슬롯은 "주제를 드러내는" 일반 풀(주제 무관) + 일부 주제는 전용 풀로 더 밀착시킨다.
interface ThemeDef {
  id: string
  name: string          // 예: 복수의 공허함
  question: string      // 이 주제가 던지는 질문(가이드)
  // 주제 전용 슬롯 보강(없으면 일반 풀 사용)
  heroes?: string[]
  situations?: string[]
  dilemmas?: string[]
  costs?: string[]
  ironies?: string[]
  desires?: string[]
  catalysts?: string[]
}

// ---------- 한국어 조사 헬퍼 ----------
// 앞 단어 마지막 글자의 받침 유무로 실제 조사 하나를 골라 붙인다("을(를)" 노출 금지).
function hasJong(word: string): boolean {
  const s = word.trim()
  if (!s) return false
  const ch = s[s.length - 1]
  const code = ch.codePointAt(0) ?? 0
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없는 것으로 처리
  return (code - 0xac00) % 28 !== 0
}
const eul = (w: string) => w + (hasJong(w) ? '을' : '를')   // 을/를
const iga = (w: string) => w + (hasJong(w) ? '이' : '가')   // 이/가
const eunn = (w: string) => w + (hasJong(w) ? '은' : '는')  // 은/는
const euro = (w: string) => {                               // 으로/로 (ㄹ 받침은 '로')
  const s = w.trim()
  const ch = s[s.length - 1]
  const code = ch ? (ch.codePointAt(0) ?? 0) : 0
  if (code < 0xac00 || code > 0xd7a3) return w + '로'
  const j = (code - 0xac00) % 28
  return w + (j === 0 || j === 8 ? '로' : '으로') // 받침 없음 또는 ㄹ → '로'
}
const ida = (w: string) => w + (hasJong(w) ? '이다' : '다') // 이다/다

interface ThemeCategory { id: string; label: string; icon: string; themes: ThemeDef[] }

// ---------- 일반(주제 무관) 슬롯 풀 — 어떤 주제든 구체화에 쓰인다 ----------
// 인물(명사구) — 종결문이 아니라 "~한 사람" 형태의 명사구만. 30종.
const HERO_POOL: string[] = [
  '평생을 한 가지 목표에 바쳐온 노인', '모든 것을 잃고 막 다시 시작하려는 청년',
  '겉으로는 성공했지만 속이 텅 빈 중년', '남의 기대 속에 자신을 잃어버린 모범생',
  '거짓말로 쌓아 올린 삶을 사는 사람', '한 번의 선택을 평생 후회해 온 사람',
  '가족을 위해 자신을 지워온 가장', '누구에게도 진심을 들킨 적 없는 외톨이',
  '한때 빛났으나 이제는 잊혀진 사람', '늘 옳은 일을 해왔다고 믿는 사람',
  '복수만을 연료로 살아온 사람', '사랑을 받아본 적 없어 줄 줄도 모르는 사람',
  '두 세계 어디에도 속하지 못한 경계인', '약속을 지키려다 모든 걸 건 사람',
  '진실을 알면서도 침묵해 온 목격자', '자기 자신을 가장 두려워하는 사람',
  '남의 인생을 대신 살아온 그림자 같은 사람', '한 번도 자기 뜻대로 살아본 적 없는 사람',
  '버려진 기억을 끌어안고 자란 고아', '완벽해 보이려 평생을 애써 온 사람',
  '돌아갈 곳을 스스로 불태워 버린 사람', '약자를 지키려다 강자가 되어버린 사람',
  '믿음을 잃고도 믿는 척을 멈추지 못하는 사람', '재능을 가졌으나 용기를 잃은 사람',
  '타인의 고통을 외면한 대가를 치르는 사람', '한평생 남을 위해 살다 자신을 잊은 사람',
  '한순간의 영웅이 되었다가 추락한 사람', '진심을 숨기는 데만 능숙해진 사람',
  '용서를 구할 사람이 이미 떠나버린 사람', '늦게야 사랑을 깨달은 사람',
]
// 상황(시점·정황을 가리키는 부사구) — 명사 자리·종결 자리 둘 다 아닌, 문장 머리에 놓이는 시간/정황구. 28종.
const SITUATION_POOL: string[] = [
  '오랜 목표를 마침내 손에 넣기 직전',
  '돌이킬 수 없는 선택의 문턱에 선 순간',
  '믿었던 모든 것이 거짓이었음을 알게 된 직후',
  '단 하루, 모든 것을 결정할 시간만 남은 채',
  '잃은 줄 알았던 것이 눈앞에 다시 나타났을 때',
  '자신이 한 일의 결과를 처음으로 마주한 자리에서',
  '도망쳐 온 과거가 정확히 따라잡은 순간',
  '지켜온 것과 갈망하던 것 중 하나만 택해야 할 때',
  '세상이 자신을 시험대에 올려놓은 가운데',
  '가장 가까운 사람에게 진실을 말해야 하는 밤',
  '평온해 보이던 일상에 균열이 생긴 직후',
  '되돌릴 마지막 기회가 주어진 순간',
  '오래 미뤄온 약속의 기한이 끝나가는 새벽',
  '모두가 등을 돌리고 홀로 남은 자리에서',
  '한순간의 실수가 모든 것을 바꿔놓은 다음 날',
  '잊고 싶던 사람이 문 앞에 다시 찾아온 저녁',
  '버텨온 거짓이 무너지기 직전의 침묵 속에서',
  '간절히 바라던 일이 너무 늦게 이루어진 순간',
  '낯선 도시에 빈손으로 도착한 첫날',
  '마지막이라 믿었던 이별이 번복된 순간',
  '오래 감춰온 비밀이 곧 드러날 처지에 놓인 채',
  '의지하던 사람이 사라진 빈자리를 마주한 아침',
  '한 번 더 같은 선택지 앞에 다시 서게 된 때',
  '모든 길이 막혀 단 하나의 문만 남은 상황에서',
  '쌓아온 모든 것을 걸어야 하는 결단의 자리에서',
  '되찾을 수 없는 것을 되찾으려 손을 뻗은 순간',
  '진심과 체면 중 하나를 골라야 하는 자리에서',
  '오래 외면해 온 진실과 마침내 마주 앉은 밤',
]
// 딜레마(종결문 — 두 선택지가 대립하는 완결 문장). 26종.
const DILEMMA_POOL: string[] = [
  '옳은 길은 자신을 파괴하고, 쉬운 길은 영혼을 갉아먹는다',
  '진실을 말하면 사랑을 잃고, 침묵하면 자신을 잃는다',
  '복수를 완성하면 살아갈 이유가 사라지고, 멈추면 지난 세월이 무너진다',
  '구원하려는 그 사람이 곧 자신을 파멸시킬 존재다',
  '얻으려면 자신이 가장 소중히 여기던 것을 내놓아야 한다',
  '지킨다는 것이 곧 가두는 일이 되어버린다',
  '용서하면 비겁자가 되고, 응징하면 그들과 같아진다',
  '머물면 시들고, 떠나면 모든 인연이 끊어진다',
  '믿음을 지키면 모두를 위험에 빠뜨리고, 배신하면 자신을 견딜 수 없다',
  '꿈을 좇으면 가족을 등지고, 곁에 남으면 자신을 죽인다',
  '기억을 지우면 고통도 사라지지만 사랑했던 흔적까지 잃는다',
  '정의를 세우려면 자신이 사랑한 사람을 무너뜨려야 한다',
  '진실을 덮으면 평화가 오고, 밝히면 모두가 무너진다',
  '약속을 지키면 자신이 죽고, 어기면 신뢰가 죽는다',
  '도와주면 그가 무너지고, 외면하면 자신이 무너진다',
  '떠나면 자유를 얻지만 그를 영영 잃고, 남으면 그 반대다',
  '이기면 모든 것을 잃은 자가 되고, 지면 모든 것을 건 의미가 사라진다',
  '과거를 인정하면 현재가 무너지고, 부정하면 미래가 거짓이 된다',
  '맞서면 짓밟히고, 굴복하면 스스로를 경멸하게 된다',
  '말하면 한 사람을 살리고 여럿을 죽이며, 침묵하면 그 반대다',
  '돌아가면 잊고 살 수 있고, 나아가면 두 번 다시 못 돌아온다',
  '손을 잡으면 함께 가라앉고, 놓으면 혼자 살아남는다',
  '복종하면 안전하지만 자신이 사라지고, 거부하면 그 반대다',
  '진심을 보이면 약점이 되고, 감추면 외로움이 깊어진다',
  '책임을 지면 모두를 잃고, 떠넘기면 자신을 잃는다',
  '사랑을 택하면 의무를 저버리고, 의무를 택하면 사랑이 식는다',
]
// 대가(명사구 — "~것/~신념" 형태로 끝나는 잃게 될 무언가). 24종.
const COST_POOL: string[] = [
  '그가 평생 쌓아온 신념',
  '단 하나뿐인 진짜 관계',
  '자신을 자신이게 한 이름',
  '두 번 다시 오지 않을 기회',
  '아직 갚지 못한 마음의 빚',
  '돌아갈 고향이라는 환상',
  '무너지지 않는다고 믿었던 자존심',
  '죄책감 없이 잠드는 밤',
  '미래의 자신을 향한 약속',
  '사랑한다고 말할 자격',
  '아무에게도 보이지 않던 순수한 마음',
  '오래 지켜온 한 사람과의 신의',
  '세상을 향한 마지막 믿음',
  '되찾을 수 없는 어린 날의 자신',
  '평범하게 살 수 있던 삶',
  '누구도 빼앗지 못하던 평온',
  '오직 자신만 알던 비밀스러운 꿈',
  '남은 생을 함께하기로 한 약속',
  '한 번도 의심하지 않던 자기 자신',
  '돌이켜 자랑스러울 떳떳함',
  '곁에 남은 마지막 한 사람',
  '아직 식지 않은 가슴속 열정',
  '잃을 것이 없다고 믿던 자유',
  '스스로를 용서할 수 있는 권리',
]
// 아이러니(종결문 — 마지막 반전을 그리는 완결 문장). 22종.
const IRONY_POOL: string[] = [
  '간절히 손에 넣은 그 순간, 그것이 더는 의미 없어진다',
  '지키려던 것을 지키는 방법이 그것을 망가뜨리는 일뿐이다',
  '가장 미워한 사람이 가장 자신을 닮았음을 깨닫는다',
  '자유를 얻은 뒤에야 그 자유가 가장 큰 감옥임을 안다',
  '진실을 밝히고 나니 차라리 거짓이 나았음을 알게 된다',
  '승리한 자리에 남은 것은 더 이상 함께할 사람이 없다는 사실뿐이다',
  '복수가 끝난 자리에 채울 수 없는 텅 빈 공간만 남는다',
  '구원받은 사람은 정작 그 구원을 원하지 않았다',
  '도망쳐 온 자기 자신이 마지막에 기다리고 있었다',
  '용서하고 나서야 용서받을 수 없는 쪽이 자신임을 안다',
  '버리고 나서야 그것이 전부였음을 깨닫는다',
  '이기고도 끝내 진 사람은 자기 자신이었다',
  '구하려던 사람을 결국 자기 손으로 잃는다',
  '가장 두려워하던 운명을 피하려다 그 운명을 불러들인다',
  '해답을 찾고 보니 처음의 질문이 틀렸던 것이었다',
  '돌아온 자리에는 떠나기 전의 자신이 더는 없다',
  '모두를 속였으나 정작 속은 사람은 자기 자신이었다',
  '지키려 든 거리가 끝내 사랑을 식게 만든다',
  '간절히 잊으려 할수록 그 기억은 더 선명해진다',
  '가장 멀리 도망친 곳에서 가장 가까운 진실과 만난다',
  '얻은 것의 무게가 잃은 것의 무게를 끝내 넘지 못한다',
  '자유로워진 다음에야 묶여 있을 때가 행복이었음을 안다',
]
// 동력(명사 — 인물을 움직이는 갈망/감정). "~을 움직이는 것은 X(이)다" 자리. 22종.
const DESIRE_POOL: string[] = [
  '인정받고 싶다는 오랜 갈망',
  '무너진 자존심을 되찾으려는 집념',
  '사랑하는 이를 지키려는 절박함',
  '잃어버린 자신을 되찾으려는 열망',
  '죄를 씻고 싶다는 간절함',
  '복수를 끝내야 한다는 강박',
  '누구에게도 지지 않으려는 자존심',
  '소속되고 싶다는 외로운 바람',
  '진실을 알아야겠다는 집요함',
  '평범하게 살고 싶다는 소박한 꿈',
  '버림받지 않으려는 두려움',
  '자유로워지고 싶다는 갈증',
  '약속을 끝내 지키려는 고집',
  '사라지기 전에 무언가를 남기려는 조바심',
  '용서받고 싶다는 말 못 할 소망',
  '한 번이라도 진짜 자신이 되고 싶다는 욕구',
  '잊히고 싶지 않다는 외침',
  '되돌리고 싶다는 후회의 무게',
  '아무도 못 가진 것을 가지려는 야망',
  '안전하고 싶다는 본능적인 두려움',
  '의미 있는 존재이고 싶다는 갈망',
  '상처를 되갚아 주고 싶다는 분노',
]
// 촉매(명사구 — 모든 것을 뒤흔드는 사건). "X을(를) 계기로" 자리. 22종.
const CATALYST_POOL: string[] = [
  '오래 묻혀 있던 비밀이 담긴 편지 한 통',
  '죽은 줄 알았던 사람의 갑작스러운 등장',
  '잊고 지내던 과거에서 걸려 온 한 통의 전화',
  '되돌릴 수 없게 만든 단 한 번의 거짓말',
  '우연히 마주친 옛 얼굴',
  '남겨진 유언 한 줄',
  '예고 없이 닥친 시한부 선고',
  '믿었던 사람의 갑작스러운 배신',
  '오래 감춰온 진실이 적힌 낡은 일기장',
  '돌이킬 수 없게 어긋난 약속',
  '문득 손에 들어온 위험한 비밀',
  '한밤중 걸려 온 도움을 청하는 목소리',
  '뜻하지 않게 떠맡게 된 누군가의 부탁',
  '오래전 묻어둔 잘못이 드러난 사건',
  '운명처럼 다시 마주친 옛 원수',
  '거절할 수 없는 한 번의 제안',
  '낯선 사람이 남기고 간 한 마디',
  '되찾을 마지막 기회라는 통보',
  '눈앞에서 벌어진 돌이킬 수 없는 사고',
  '오래 기다린 답장의 도착',
  '버려진 줄 알았던 물건이 돌아온 일',
  '누구도 예상 못 한 한 사람의 죽음',
]

// ---------- 주제 사전(카테고리 풍부) ----------
const CATEGORIES: ThemeCategory[] = [
  {
    id: 'revenge', label: '복수·정의', icon: '⚔️',
    themes: [
      {
        id: 'empty-revenge', name: '복수의 공허함', question: '대가를 치르고 손에 넣은 복수는 정말 무엇을 채워주는가?',
        heroes: ['오직 복수만을 연료로 십 년을 버텨온 사람', '잃은 가족의 이름으로 살아온 추적자', '복수의 칼을 갈며 자신을 잃어버린 사람'],
        dilemmas: ['복수를 완성하면 살아갈 이유가 사라지고, 멈추면 지난 세월이 무너진다', '응징하면 그들과 같아지고, 용서하면 죽은 이를 배신하는 것 같다'],
        ironies: ['복수가 끝난 자리에 채울 수 없는 텅 빈 공간만 남는다', '가장 미워한 사람이 가장 자신을 닮았음을 깨닫는다'],
        desires: ['빼앗긴 것을 끝내 되갚아 주고 싶다는 분노', '죽은 이에게 떳떳하고 싶다는 집념'],
        catalysts: ['원수의 행방이 적힌 한 줄의 단서', '복수의 대상이 먼저 손 내민 화해의 제안'],
      },
      { id: 'cost-of-justice', name: '정의의 대가', question: '옳음을 세우기 위해 무엇까지 무너뜨릴 수 있는가?', dilemmas: ['정의를 세우려면 자신이 사랑한 사람을 무너뜨려야 한다', '법을 지키면 약자가 죽고, 어기면 자신이 괴물이 된다'] },
      { id: 'mercy', name: '용서의 무게', question: '용서는 약함인가, 가장 어려운 강함인가?', ironies: ['용서하고 나서야 용서받을 수 없는 쪽이 자신임을 안다'] },
      { id: 'eye-for-eye', name: '폭력의 순환', question: '되갚음은 어디에서 끝나는가, 끝나기는 하는가?' },
    ],
  },
  {
    id: 'identity', label: '정체성·자아', icon: '🪞',
    themes: [
      { id: 'true-self', name: '진짜 나를 찾는 일', question: '남이 기대하는 나를 벗으면 무엇이 남는가?', heroes: ['남의 기대 속에 자신을 잃어버린 모범생', '평생 가면을 쓰고 살아온 사람'] },
      { id: 'mask', name: '가면과 진실', question: '쓰고 있던 가면이 곧 얼굴이 되어버렸다면?', ironies: ['진실을 밝히고 나니 차라리 거짓이 나았음을 알게 된다'] },
      { id: 'belonging', name: '소속과 경계', question: '어디에도 속하지 못한 사람의 자리는 어디인가?', heroes: ['두 세계 어디에도 속하지 못한 경계인'] },
      { id: 'self-deception', name: '자기기만', question: '가장 끈질기게 속이는 상대가 자기 자신일 때.', heroes: ['거짓말로 쌓아 올린 삶을 사는 사람'] },
      { id: 'reinvention', name: '다시 태어남', question: '과거를 지우고 새 사람이 될 수 있는가?', heroes: ['모든 것을 잃고 막 다시 시작하려는 청년'] },
    ],
  },
  {
    id: 'love', label: '사랑·관계', icon: '💞',
    themes: [
      { id: 'sacrifice-love', name: '희생하는 사랑', question: '사랑은 어디까지 자신을 지워도 되는가?', dilemmas: ['지킨다는 것이 곧 가두는 일이 되어버린다', '곁에 남으면 자신을 죽이고, 떠나면 그를 죽인다'] },
      { id: 'unworthy', name: '사랑받을 자격', question: '사랑을 받아본 적 없는 사람은 사랑할 수 있는가?', heroes: ['사랑을 받아본 적 없어 줄 줄도 모르는 사람'] },
      { id: 'betrayal', name: '배신과 신뢰', question: '한 번 깨진 믿음은 다시 세워질 수 있는가?', dilemmas: ['믿음을 지키면 모두를 위험에 빠뜨리고, 배신하면 자신을 견딜 수 없다'] },
      { id: 'letting-go', name: '놓아주는 일', question: '사랑하기에 떠나보낸다는 말은 진실인가, 변명인가?' },
      { id: 'forbidden', name: '금지된 사랑', question: '세상이 막는 사랑은 지킬 가치가 있는가?' },
    ],
  },
  {
    id: 'power', label: '권력·욕망', icon: '👑',
    themes: [
      { id: 'corruption', name: '권력의 부패', question: '선한 사람도 권력을 쥐면 변하는가?', ironies: ['지키려던 것을 지키는 방법이 그것을 망가뜨리는 일뿐이다'] },
      { id: 'ambition', name: '야망의 끝', question: '정상에 올랐을 때 발밑에 남은 것은 무엇인가?', heroes: ['겉으로는 성공했지만 속이 텅 빈 중년'], ironies: ['승리한 자리에 남은 것은 더 이상 함께할 사람이 없다는 사실뿐이다'] },
      { id: 'greed', name: '끝없는 욕심', question: '충분하다는 것은 어디에 있는가?' },
      { id: 'freedom-cage', name: '자유라는 감옥', question: '모든 것에서 풀려난 자는 정말 자유로운가?', ironies: ['자유를 얻은 뒤에야 그 자유가 가장 큰 감옥임을 안다'] },
    ],
  },
  {
    id: 'mortality', label: '죽음·시간', icon: '⏳',
    themes: [
      { id: 'finite-time', name: '유한한 시간', question: '끝이 정해졌을 때 무엇이 진짜 중요해지는가?', situations: ['시한부 선고 뒤 남은 시간을 마주한 채', '단 하루, 모든 것을 결정할 시간만 남은 채'] },
      { id: 'legacy', name: '남기는 것', question: '사라진 뒤 무엇으로 기억되고 싶은가?', heroes: ['평생을 한 가지 목표에 바쳐온 노인'] },
      { id: 'grief', name: '상실과 애도', question: '잃은 것을 어떻게 품고 살아가는가?', costs: ['아직 작별 인사를 건네지 못한 마음'] },
      { id: 'mortality-meaning', name: '죽음 앞의 의미', question: '끝이 있기에 삶은 의미를 갖는가, 잃는가?' },
    ],
  },
  {
    id: 'truth', label: '진실·기억', icon: '🔍',
    themes: [
      { id: 'inconvenient-truth', name: '불편한 진실', question: '모두를 다치게 할 진실도 밝혀야 하는가?', dilemmas: ['진실을 말하면 사랑을 잃고, 침묵하면 자신을 잃는다'] },
      { id: 'memory', name: '기억의 무게', question: '잊는 것은 구원인가, 또 다른 상실인가?', dilemmas: ['기억을 지우면 고통도 사라지지만 사랑했던 흔적까지 잃는다'] },
      { id: 'silent-witness', name: '침묵한 목격자', question: '아는 자의 침묵은 죄가 되는가?', heroes: ['진실을 알면서도 침묵해 온 목격자'] },
      { id: 'rewritten-past', name: '다시 쓰인 과거', question: '기억과 사실이 어긋날 때 무엇을 믿는가?' },
    ],
  },
  {
    id: 'freedom', label: '자유·운명', icon: '🕊️',
    themes: [
      { id: 'free-will', name: '선택할 자유', question: '정해진 운명 앞에서 선택은 의미가 있는가?' },
      { id: 'escape', name: '탈출과 새 삶', question: '도망쳐 온 그곳에서 정말 벗어났는가?', ironies: ['도망쳐 온 자기 자신이 마지막에 기다리고 있었다'] },
      { id: 'duty-vs-desire', name: '의무와 욕망', question: '해야 할 일과 하고 싶은 일이 충돌할 때.', dilemmas: ['꿈을 좇으면 가족을 등지고, 곁에 남으면 자신을 죽인다'] },
      { id: 'belonging-price', name: '소속의 대가', question: '받아들여지기 위해 무엇을 버려야 하는가?' },
    ],
  },
  {
    id: 'hope', label: '희망·구원', icon: '🌅',
    themes: [
      { id: 'redemption', name: '구원의 가능성', question: '돌이킬 수 없는 잘못도 속죄할 수 있는가?', heroes: ['한 번의 선택을 평생 후회해 온 사람'] },
      { id: 'unwanted-savior', name: '원치 않는 구원', question: '구원받는 사람이 그것을 거부한다면?', dilemmas: ['구원하려는 그 사람이 곧 자신을 파멸시킬 존재다'], ironies: ['구원받은 사람은 정작 그 구원을 원하지 않았다'] },
      { id: 'small-hope', name: '작은 희망의 힘', question: '절망 속 단 하나의 불씨는 무엇을 바꾸는가?' },
      { id: 'faith-test', name: '믿음의 시험', question: '믿어온 모든 것이 흔들릴 때 무엇이 남는가?', heroes: ['늘 옳은 일을 해왔다고 믿는 사람'] },
    ],
  },
]

const ALL_THEMES = CATEGORIES.flatMap((c) => c.themes)

const LS = 'sry:tool:theme-to-premise:'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

const BASE_POOL: Record<SlotKey, string[]> = {
  hero: HERO_POOL, situation: SITUATION_POOL, dilemma: DILEMMA_POOL,
  cost: COST_POOL, irony: IRONY_POOL, desire: DESIRE_POOL, catalyst: CATALYST_POOL,
}
const themeExtra = (theme: ThemeDef, key: SlotKey): string[] | undefined => (
  key === 'hero' ? theme.heroes : key === 'situation' ? theme.situations
  : key === 'dilemma' ? theme.dilemmas : key === 'cost' ? theme.costs
  : key === 'irony' ? theme.ironies : key === 'desire' ? theme.desires : theme.catalysts
)
// 한 주제에 대한 슬롯별 유효 풀(전용 풀 ∪ 일반 풀; 중복 제거)
function poolFor(theme: ThemeDef | null, key: SlotKey): string[] {
  const base = BASE_POOL[key]
  if (!theme) return base
  const extra = themeExtra(theme, key)
  if (!extra || extra.length === 0) return base
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of [...extra, ...base]) { if (!seen.has(v)) { seen.add(v); out.push(v) } }
  return out
}

type SlotKey = 'hero' | 'situation' | 'dilemma' | 'cost' | 'irony' | 'desire' | 'catalyst'
interface SlotMeta { key: SlotKey; label: string; icon: string }
const SLOTS: SlotMeta[] = [
  { key: 'hero', label: '인물', icon: '🧑' },
  { key: 'situation', label: '상황', icon: '🌪️' },
  { key: 'catalyst', label: '촉매(사건)', icon: '⚡' },
  { key: 'desire', label: '동력(갈망)', icon: '🔥' },
  { key: 'dilemma', label: '딜레마', icon: '⚖️' },
  { key: 'cost', label: '대가', icon: '💸' },
  { key: 'irony', label: '아이러니', icon: '🌀' },
]

// 굴린 결과를 한 문단 전제로 엮는다. (조사는 받침에 맞춰 실제로 하나만 출력)
function compose(r: Record<string, string>): string {
  const { hero, situation, catalyst, desire, dilemma, cost, irony } = r
  if (!hero || !situation) return ''
  const lines: string[] = []
  lines.push(`${situation}, ${iga(hero)} 있다.`)
  if (catalyst) lines.push(`${euro(catalyst)} 모든 것이 흔들리기 시작한다.`)
  if (desire) lines.push(`${eunn('그를 움직이는 것')} ${ida(desire)}.`)
  if (dilemma) lines.push(`그는 선택의 기로에 선다 — ${dilemma}.`)
  if (cost) lines.push(`무엇을 택하든 잃게 될 것은 ${ida(cost)}.`)
  if (irony) lines.push(`그리고 마지막에, ${irony}.`)
  return lines.join(' ').replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim()
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ThemeToPremise({ payload }: { payload?: Record<string, unknown> }) {
  // 선택된 주제(사전 id) 또는 직접 입력 텍스트
  const [themeId, setThemeId] = useState<string>(() => {
    try { const v = localStorage.getItem(LS + 'themeId'); if (v && (v === '__custom' || ALL_THEMES.some((t) => t.id === v))) return v } catch { /* ignore */ }
    return ALL_THEMES[0].id
  })
  const [customTheme, setCustomTheme] = useState<string>(() => {
    try { return localStorage.getItem(LS + 'custom') || '' } catch { return '' }
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'expanded'); if (r) return JSON.parse(r) } catch { /* ignore */ }
    return { [CATEGORIES[0].id]: true }
  })
  const [query, setQuery] = useState('')

  const [results, setResults] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'results')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o }
    } catch { /* ignore */ }
    return {}
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(LS + 'locked'); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o } } catch { /* ignore */ }
    return {}
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const nonceRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)
  const seededRef = useRef(false)

  // 현재 주제 정의 / 표시 이름
  const isCustom = themeId === '__custom'
  const theme: ThemeDef | null = isCustom ? null : (ALL_THEMES.find((t) => t.id === themeId) || null)
  const themeName = isCustom ? (customTheme.trim() || '나만의 주제') : (theme?.name || '')
  const themeQuestion = isCustom ? '직접 입력한 주제를 인물·상황·딜레마로 구체화합니다.' : (theme?.question || '')

  // payload 로 주제 텍스트를 받으면 직접 입력 모드로 채운다(선택)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    const incoming = payload && (typeof payload.theme === 'string' ? payload.theme : typeof payload.text === 'string' ? payload.text : '')
    if (incoming && typeof incoming === 'string' && incoming.trim()) {
      // 사전에 같은 이름이 있으면 그 주제, 없으면 직접 입력
      const match = ALL_THEMES.find((t) => t.name === incoming.trim())
      if (match) setThemeId(match.id)
      else { setThemeId('__custom'); setCustomTheme(incoming.trim()) }
    }
    if (Object.keys(results).length === 0) {
      const next: Record<string, string> = {}
      const th = match0(incoming)
      SLOTS.forEach((s) => { next[s.key] = pick(poolFor(th, s.key)) })
      setResults(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 시드 시점의 주제(payload 우선) 추정용
  function match0(incoming: string | '' | undefined): ThemeDef | null {
    if (incoming && incoming.trim()) {
      const m = ALL_THEMES.find((t) => t.name === incoming.trim())
      if (m) return m
      return null
    }
    return ALL_THEMES.find((t) => t.id === themeId) || null
  }

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'themeId', themeId) } catch { /* ignore */ } }, [themeId])
  useEffect(() => { try { localStorage.setItem(LS + 'custom', customTheme) } catch { /* ignore */ } }, [customTheme])
  useEffect(() => { try { localStorage.setItem(LS + 'expanded', JSON.stringify(expanded)) } catch { /* ignore */ } }, [expanded])
  useEffect(() => { try { localStorage.setItem(LS + 'results', JSON.stringify(results)) } catch { /* ignore */ } }, [results])
  useEffect(() => { try { localStorage.setItem(LS + 'locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  // 주제 전환 시: 잠긴 슬롯이 새 주제 풀에 없으면 잠금 해제(데이터 일관성)
  const selectTheme = useCallback((id: string) => {
    setThemeId(id)
    setCopied(false)
  }, [])

  const rollAll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    const th = isCustom ? null : (ALL_THEMES.find((t) => t.id === themeId) || null)
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        const pool = poolFor(th, s.key)
        if (locked[s.key] && prev[s.key] && pool.includes(prev[s.key])) return // 잠긴 슬롯 유지
        let v = pick(pool)
        if (v === prev[s.key] && pool.length > 1) v = pick(pool)
        next[s.key] = v
      })
      return next
    })
  }, [locked, themeId, isCustom])

  const rollOne = useCallback((key: SlotKey) => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    const th = isCustom ? null : (ALL_THEMES.find((t) => t.id === themeId) || null)
    const pool = poolFor(th, key)
    setResults((prev) => {
      let v = pick(pool)
      if (v === prev[key] && pool.length > 1) v = pick(pool)
      return { ...prev, [key]: v }
    })
  }, [themeId, isCustom])

  // 굴림 애니메이션 자동 해제
  useEffect(() => {
    if (!rolling) return
    const my = nonceRef.current
    const t = window.setTimeout(() => { if (nonceRef.current === my) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: SlotKey) => setLocked((p) => ({ ...p, [key]: !p[key] }))
  const toggleCat = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  // 조합수(현재 주제 기준 각 슬롯 풀 크기의 곱)
  const comboCount = (() => {
    const th = isCustom ? null : theme
    return SLOTS.reduce((n, s) => n * poolFor(th, s.key).length, 1)
  })()

  const premise = compose(results)
  const hasAll = !!results.hero && !!results.situation
  const ready = !!premise && hasAll && (!isCustom || customTheme.trim().length > 0)

  const fullText = ready
    ? `【주제】 ${themeName}\n【질문】 ${themeQuestion}\n\n${premise}`
    : ''

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 📎 수집함
  const toStash = () => {
    if (!ready) { flash('먼저 전제를 완성하세요.'); return }
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `🎭 전제: ${themeName}`, text: fullText })
    flash('📎 수집함에 담았습니다.')
  }

  // 💾 스니펫 라이브러리
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: premise, source: `주제→전제: ${themeName}`, tags: ['전제', themeName] })
    flash('💾 스니펫 라이브러리에 저장했습니다.')
  }

  // 📄 프로젝트 자료 〈전제〉 폴더
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS.filter((s) => results[s.key])
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(results[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p><b>🎭 주제:</b> ${esc(themeName)}</p>`,
      `<p style="color:#888;"><i>${esc(themeQuestion)}</i></p>`,
      `<hr/>`,
      `<p style="font-size:15px;line-height:1.75;">${esc(premise)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '전제',
      title: `🎭 ${esc(themeName)} — ${esc(premise).slice(0, 40)}`,
      bodyHtml,
    })
    flash(id ? '📄 프로젝트 자료 〈전제〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 🔗 전제·What-if 생성기로 넘기기
  const openPremiseGen = () => {
    openToolLinked('premise-generator', ready ? { theme: themeName, text: premise } : { theme: themeName })
  }

  // ---------- 검색 필터 ----------
  const q = query.trim().toLowerCase()
  const filteredCats = q
    ? CATEGORIES.map((c) => ({
        ...c,
        themes: c.themes.filter((t) => t.name.toLowerCase().includes(q) || t.question.toLowerCase().includes(q)),
      })).filter((c) => c.themes.length > 0)
    : CATEGORIES

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const sectionBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }

  const lockedCount = SLOTS.filter((s) => locked[s.key]).length

  return (
    <div style={wrap}>
      <div style={hint}>
        추상 <b>주제</b>를 <b>인물 · 상황 · 딜레마 · 대가 · 아이러니</b>로 굴려 한 문단짜리 구체 전제로 바꿉니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하세요.
      </div>

      {/* 주제 선택 영역 */}
      <div style={sectionBox}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주제 검색…"
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
          />
          <button
            className="minibtn"
            title="아무 주제나 무작위 선택"
            onClick={() => { const t = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)]; selectTheme(t.id); const cat = CATEGORIES.find((c) => c.themes.some((x) => x.id === t.id)); if (cat) setExpanded((p) => ({ ...p, [cat.id]: true })) }}
          ><Emoji e="🎲"/> 주제</button>
        </div>

        <div style={{ maxHeight: 132, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
          {filteredCats.map((c) => {
            const open = q ? true : !!expanded[c.id]
            return (
              <div key={c.id}>
                <button
                  className="minibtn"
                  onClick={() => toggleCat(c.id)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}
                  aria-expanded={open}
                >
                  <span><Emoji e={c.icon}/> {c.label} <span style={{ opacity: 0.6 }}>({c.themes.length})</span></span>
                  <span style={{ opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 2px 6px' }}>
                    {c.themes.map((t) => {
                      const active = !isCustom && themeId === t.id
                      return (
                        <button
                          key={t.id}
                          className={active ? 'btn-primary' : 'minibtn'}
                          onClick={() => selectTheme(t.id)}
                          title={t.question}
                          style={{ fontSize: 11.5, padding: '3px 8px' }}
                        >{t.name}</button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {filteredCats.length === 0 && <div style={hint}>“{query}”에 맞는 주제가 없습니다.</div>}
        </div>

        {/* 직접 입력 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <button
            className={isCustom ? 'btn-primary' : 'minibtn'}
            onClick={() => selectTheme('__custom')}
            style={{ fontSize: 11.5, flexShrink: 0 }}
            title="나만의 주제를 직접 입력"
          ><Emoji e="✍️"/> 직접</button>
          <input
            value={customTheme}
            onChange={(e) => { setCustomTheme(e.target.value); if (!isCustom) setThemeId('__custom') }}
            placeholder="예: 복수의 공허함, 자유의 대가…"
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', opacity: isCustom ? 1 : 0.6 }}
          />
        </div>
      </div>

      {/* 현재 주제 + 조합수 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Emoji e="🎭"/> <span style={{ color: 'var(--accent)' }}>{themeName || '주제를 고르세요'}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          이 주제 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(comboCount)}</b>가지 · {lockedCount > 0 ? <><Emoji e="🔒"/> {lockedCount}개 고정</> : '고정 없음'}
        </div>
      </div>
      {themeQuestion && <div style={{ ...hint, fontStyle: 'italic' }}>“{themeQuestion}”</div>}

      {/* 슬롯 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
        {SLOTS.map((s) => {
          const v = results[s.key]
          const isLocked = !!locked[s.key]
          const poolLen = poolFor(isCustom ? null : theme, s.key).length
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.7 }}>({poolLen})</span></div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }} aria-pressed={isLocked}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            </div>
          )
        })}
      </div>

      {/* 완성 전제 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 12.5 }}><Emoji e="🎭"/> 구체화된 전제</div>
        <div style={{ fontSize: 14, lineHeight: 1.65, color: ready ? 'var(--text)' : 'var(--muted)', maxHeight: 120, overflowY: 'auto' }}>
          {premise || (isCustom && !customTheme.trim() ? '먼저 주제를 입력하고 슬롯을 굴리세요.' : '슬롯을 굴려 전제를 만들어 보세요.')}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🎲"/> 전제로 변환</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={toStash} disabled={!ready} title="완성된 전제를 수집함에 담기"><Emoji e="📎"/> 수집함</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '프로젝트 자료 〈전제〉 폴더에 추가'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={openPremiseGen} title="이 주제를 전제·What-if 생성기로 이어서 굴리기"><Emoji e="🔗"/> What-if 생성기</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div style={hint}>잠긴 슬롯은 그대로 두고 나머지만 다시 굴립니다. 전제는 출발점일 뿐 — 자유롭게 다듬어 보세요.</div>

      {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 주제·슬롯 문구는 이 도구가 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
