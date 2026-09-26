// 대조 인물(포일) 생성기 — 주인공의 가치/방법/결말을 비추는 거울 인물을 만든다.
//  핵심 발상: 포일은 "주인공과 닮은 출발점(공통점)"에서 "결정적 차이"로 갈라져,
//  대비 축(가치관·방법·세계관·결말 등)을 따라 주인공의 선택을 부각하고 주제를 강화한다.
//  슬롯 구조: 공통의 출발점 × 갈라지는 대비 축 × 결정적 차이 × 주제적 대조 × 관계 역학.
//  슬롯별 🔒 잠금 + 부분 재생성. 연계: 수집함·프로젝트 인물카드·인물 라이브러리·관계도 열기.
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'character-foil-gen', name: '대조 인물(포일) 생성기', icon: '🪞', group: '캐릭터', intro: '주인공을 비추는 거울 인물을 대비 축·공통점·결정적 차이로 생성해 주제를 강화', w: 600, h: 700 }

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function pickN<T>(a: T[], n: number): T[] {
  const pool = [...a]; const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(ri(pool.length), 1)[0])
  return out
}
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 한글 받침 유무 판정 → 조사를 실제로 하나만 골라 붙인다(괄호 이중표기 금지).
function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없는 것으로 처리
  return (code - 0xac00) % 28 !== 0
}
// '받침유무' 에 따라 josa[0]/josa[1] 중 하나를 붙인 'word+조사' 반환. (예: ['을','를'])
function withJosa(word: string, josa: [string, string]): string {
  return word + (hasBatchim(word) ? josa[0] : josa[1])
}

const NAMES_KO = ['도윤', '서아', '시우', '하준', '지호', '예린', '민재', '수빈', '서준', '하린', '윤서', '지안', '채원', '정우', '소율', '태오', '유나', '건우', '다은', '재이']
const SURNAME_KO = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황', '안', '송']
const NAMES_EN = ['Aria', 'Kai', 'Noah', 'Luna', 'Ezra', 'Mara', 'Ivo', 'Sera', 'Dane', 'Vera', 'Lior', 'Nadia', 'Cael', 'Rin', 'Orla', 'Sol']
const NAMES_FANTASY = ['엘드린', '카엘', '세라피나', '모르간', '리안드라', '드라크', '아엘', '베르딘', '실라', '오르넬', '타비온', '카산', '느브', '레이아스']
type NameStyle = 'ko' | 'en' | 'fantasy'
const NAME_LABEL: Record<NameStyle, string> = { ko: '한국어', en: '영문', fantasy: '판타지' }
function randName(s: NameStyle): string {
  if (s === 'ko') return pick(SURNAME_KO) + pick(NAMES_KO)
  if (s === 'fantasy') return pick(NAMES_FANTASY)
  return pick(NAMES_EN)
}

// 대비 축: 주인공과 포일이 갈라지는 "차원". 각 축은 한 쌍의 대립항(좌=한 극, 우=반대 극).
interface Axis { id: string; label: string; left: string; right: string; theme: string }
const AXES: Axis[] = [
  { id: 'value', label: '가치관', left: '정의·원칙', right: '실리·생존', theme: '무엇을 위해 사는가' },
  { id: 'method', label: '방법', left: '정공법·대화', right: '술수·폭력', theme: '목적은 수단을 정당화하는가' },
  { id: 'order', label: '질서관', left: '질서·체제 수호', right: '자유·체제 전복', theme: '체제는 지킬 가치가 있는가' },
  { id: 'past', label: '과거와의 관계', left: '과거를 끌어안음', right: '과거를 끊어냄', theme: '상처를 어떻게 다룰 것인가' },
  { id: 'trust', label: '인간관', left: '사람을 믿음', right: '사람을 의심함', theme: '타인은 구원인가 위협인가' },
  { id: 'self', label: '자아관', left: '자기 희생', right: '자기 보존', theme: '나를 버려서라도 지킬 것이 있는가' },
  { id: 'hope', label: '세계관', left: '낙관·희망', right: '비관·체념', theme: '세상은 나아질 수 있는가' },
  { id: 'rule', label: '규범', left: '규칙을 지킴', right: '규칙을 깨뜨림', theme: '옳음은 규칙 안에 있는가' },
  { id: 'love', label: '관계 방식', left: '헌신·집착', right: '거리두기·초연', theme: '사랑은 붙드는 것인가 놓는 것인가' },
  { id: 'truth', label: '진실관', left: '진실을 밝힘', right: '거짓으로 지킴', theme: '진실은 언제나 옳은가' },
  { id: 'fate', label: '운명관', left: '운명에 맞섬', right: '운명에 순응', theme: '인간은 운명을 바꿀 수 있는가' },
  { id: 'time', label: '시간관', left: '미래를 봄', right: '현재만 삼', theme: '내일을 위해 오늘을 견딜 것인가' },
  { id: 'duty', label: '책임관', left: '책임을 떠안음', right: '책임을 미룸', theme: '누구의 잘못까지 내 것인가' },
  { id: 'fear', label: '두려움의 처리', left: '두려움을 직면함', right: '두려움을 외면함', theme: '약함을 인정해야 강해지는가' },
  { id: 'group', label: '소속관', left: '공동체를 우선함', right: '개인을 우선함', theme: '나와 우리 중 무엇이 먼저인가' },
  { id: 'change', label: '변화관', left: '스스로를 바꿈', right: '세상을 바꿈', theme: '바뀌어야 할 것은 나인가 세상인가' },
  { id: 'guilt', label: '죄책감', left: '속죄로 갚음', right: '망각으로 덮음', theme: '잘못은 갚을 수 있는가 잊어야 하는가' },
  { id: 'power', label: '힘에 대한 태도', left: '힘을 경계함', right: '힘을 추구함', theme: '강해지는 것은 옳은 일인가' },
]

// 공통의 출발점 — 포일과 주인공이 "닮은꼴"임을 보여 주는 뿌리(이래서 거울이 된다).
const COMMON = [
  '같은 상처(어린 시절의 상실)에서 출발했다',
  '같은 스승 아래서 배웠으나 다르게 자랐다',
  '같은 목표를 향하지만 다른 길로 간다',
  '같은 재능을 타고났으나 다르게 썼다',
  '한때 가장 가까운 벗이었다',
  '같은 신념을 품었던 시절이 있었다',
  '같은 고향, 같은 배경에서 자랐다',
  '같은 사람을 사랑했(거나 잃었)다',
  '같은 배신을 겪었으나 다른 결심을 했다',
  '거울처럼 닮은 처지에 놓여 있다',
  '한때 같은 꿈을 나눈 동료였다',
  '같은 약점(같은 두려움)을 공유한다',
  '같은 선택의 기로에 똑같이 섰던 적이 있다',
  '같은 핏줄(형제·자매·혈육)이다',
  '같은 사건의 생존자로, 같은 기억을 짊어진다',
  '한때 같은 사람을 우러러보며 닮고 싶어 했다',
  '같은 빈곤(같은 결핍) 속에서 자라났다',
  '같은 실패를 겪었으나 다른 교훈을 얻었다',
  '서로의 부족함을 채워 주던 짝이었다',
  '같은 비밀을 함께 지켜 온 사이였다',
  '같은 책임(같은 무게)을 나눠 지던 동료였다',
  '나란히 같은 시작점에 서 있던 경쟁자였다',
]

// 결정적 차이 — 닮은꼴이 어디서 갈라졌나(한 번의 선택/사건).
const DIVERGE = [
  '결정적 순간, 한 명은 용서했고 한 명은 복수를 택했다',
  '같은 유혹 앞에서 한 명은 거절했고 한 명은 굴복했다',
  '한 명은 두려움에 맞섰고, 한 명은 두려움에 잡아먹혔다',
  '같은 상실을 한 명은 사랑으로, 한 명은 증오로 바꿨다',
  '한 명은 남기로, 한 명은 떠나기로 결심했다',
  '같은 권력을 한 명은 내려놓았고 한 명은 움켜쥐었다',
  '한 명은 규칙을 지켰고, 한 명은 규칙을 깼다',
  '같은 진실 앞에서 한 명은 밝혔고 한 명은 묻었다',
  '한 명은 약속을 지켰고, 한 명은 약속을 저버렸다',
  '같은 희생의 요구에 한 명은 자신을, 한 명은 타인을 바쳤다',
  '한 명은 손을 내밀었고, 한 명은 등을 돌렸다',
  '같은 시험에서 한 명은 견뎠고 한 명은 무너졌다',
  '같은 분노를 한 명은 다스렸고 한 명은 휘둘렀다',
  '한 명은 떳떳이 책임졌고, 한 명은 남에게 떠넘겼다',
  '같은 기회를 한 명은 사양했고 한 명은 가로챘다',
  '한 명은 진실을 감당했고, 한 명은 거짓으로 도망쳤다',
  '같은 죄책감을 한 명은 속죄로, 한 명은 변명으로 다뤘다',
  '한 명은 약자의 편에 섰고, 한 명은 강자의 편에 붙었다',
  '같은 고독 속에서 한 명은 사람을 찾았고 한 명은 마음을 닫았다',
  '한 명은 끝까지 묻고 답을 구했고, 한 명은 일찍 단념했다',
]

// 주제적 대조 — 이 포일이 작품 주제에 던지는 질문(주인공 선택의 의미를 비춤).
const THEME_Q = [
  '“만약 주인공도 한 발만 어긋났다면?”을 보여 준다',
  '주인공이 끝내 거부한 길을 대신 걸어 보여 준다',
  '주인공이 옳다는 증거를 반례로써 입증한다',
  '주인공이 가진 것의 대가(잃은 것)를 드러낸다',
  '주인공의 신념이 시험받는 거울로 작동한다',
  '“정상적인 반응”이 무엇이었을지 보여 줘 주인공의 비범함을 부각한다',
  '같은 비극이 다른 선택으로 어떻게 갈리는지 증명한다',
  '주인공이 외면한 진실을 대신 말한다',
  '독자가 주인공에게 품을 수 있는 의심을 대신 안고 간다',
  '주인공의 성장(혹은 타락)을 측정하는 눈금이 된다',
  '주제의 반대편을 끝까지 밀어붙여 결론을 선명하게 한다',
  '“그래도 인간은 달라질 수 있는가”라는 물음을 떠안는다',
  '주인공의 신념이 치러야 할 진짜 값을 대신 보여 준다',
  '“쉬운 길”을 택했을 때의 결말을 미리 비춘다',
  '주인공이 두려워하던 미래의 모습을 구현해 보인다',
  '같은 출발점이 정반대 끝에 닿을 수 있음을 증명한다',
  '주인공이 차마 인정 못 한 욕망을 대신 드러낸다',
  '“정의란 누구의 것인가”라는 질문을 끝까지 밀어붙인다',
  '주인공의 선택이 우연이 아니었음을 대비로 확증한다',
  '독자가 주인공을 다시 보게 만드는 잣대가 된다',
]

// 결말 대조 — 거울의 끝(주인공과 다른 도착점).
const ENDING = [
  '주인공이 구원받을 때, 포일은 파멸로 떨어진다',
  '주인공이 떠날 때, 포일은 끝내 그 자리에 남는다',
  '주인공이 변할 때, 포일은 끝내 변하지 못한다',
  '주인공이 잃을 때, 포일은 얻지만 공허하다',
  '둘 다 같은 결말을 맞지만, 이르는 길이 정반대다',
  '포일이 먼저 무너져 주인공에게 마지막 경고가 된다',
  '주인공이 살아남고, 포일은 자신의 선택의 대가를 치른다',
  '포일이 마지막에 주인공의 길로 돌아서며 주제를 봉인한다',
  '주인공이 패배하는 듯하나, 포일의 승리가 더 텅 비어 있다',
  '둘은 끝내 화해하지 못한 채 각자의 진실을 안고 헤어진다',
  '주인공이 용서받을 때, 포일은 끝내 자신을 용서하지 못한다',
  '포일이 주인공을 살리고 자신은 스러져 거울을 완성한다',
  '주인공이 짐을 내려놓을 때, 포일은 그 짐을 끌어안고 남는다',
  '둘 다 원하던 것을 얻지만, 그 의미가 정반대로 갈린다',
  '포일이 이기지만, 그 승리가 주인공의 패배보다 외롭다',
  '주인공이 앞으로 나아갈 때, 포일은 과거에 영영 갇힌다',
  '포일이 끝에서야 잘못을 깨닫지만 돌이키기엔 늦는다',
  '둘은 마지막에 손을 맞잡지만, 가야 할 곳은 서로 다르다',
]

// 관계 역학 — 둘이 이야기 속에서 어떻게 부딪치는가.
const DYNAMIC = [
  '맞수(라이벌) — 끊임없이 충돌하며 서로를 단련시킨다',
  '거울 같은 적 — 가장 닮았기에 가장 위험한 적',
  '한때의 벗 — 우정이 대립으로 식어 간다',
  '그림자 — 주인공이 될 수도 있었던 또 다른 자아',
  '유혹자 — 포일이 주인공을 자기 길로 끌어당긴다',
  '심판자 — 주인공의 선택을 끊임없이 시험하고 추궁한다',
  '동행자 — 같은 길을 걷다 어느 분기점에서 갈라진다',
  '대척점 — 직접 만나지 않아도 서로의 존재만으로 대비된다',
  '스승과 배신 — 같은 가르침에서 정반대 결론에 이른 사제',
  '혈육의 대립 — 같은 피, 정반대의 길',
  '구원자 — 주인공을 끝내 자신의 길에서 끌어내려 한다',
  '경쟁자 — 같은 목표를 두고 정반대 방식으로 다툰다',
  '거울 친구 — 곁에 머물며 다른 선택지를 끊임없이 비춘다',
  '미래의 경고 — 주인공이 될지 모를 모습을 앞서 보여 준다',
  '과거의 잔영 — 주인공이 두고 온 자아처럼 따라붙는다',
  '협력하는 적 — 같은 위기 앞에선 손잡되 끝내 갈라선다',
  '추격자 — 주인공의 신념을 집요하게 뒤쫓아 추궁한다',
  '동전의 양면 — 한 사건의 빛과 그림자를 나눠 진다',
]

// 갈등 발화점 — 둘이 정면으로 부딪치는 장면 씨앗.
const CLASH = [
  '같은 사람을 두고 정반대의 방식으로 지키려 한다',
  '한 사건의 책임을 서로 다른 곳에 묻는다',
  '같은 증거를 정반대로 해석한다',
  '한쪽의 자비가 다른 쪽에는 약점으로 보인다',
  '같은 약속을 한쪽은 지키려, 한쪽은 깨려 한다',
  '서로의 방법이 자신의 가치를 모욕한다고 느낀다',
  '한쪽이 옳다면 다른 쪽의 인생이 거짓이 된다',
  '구할 수 있는 건 단 하나, 둘은 다른 것을 고른다',
  '같은 목표를 두고 한쪽은 정공법을, 한쪽은 술수를 쓴다',
  '한쪽의 신념이 다른 쪽에게는 위선으로 비친다',
  '같은 위기에서 한쪽은 멈추자, 한쪽은 밀어붙이자 한다',
  '한쪽이 지키려는 비밀을 다른 쪽이 들춰내려 한다',
  '같은 희생을 한쪽은 막으려, 한쪽은 받아들이려 한다',
  '한쪽의 자비가 다른 쪽에게는 무책임으로 들린다',
  '같은 과거를 한쪽은 묻자, 한쪽은 밝히자 다툰다',
  '둘 다 옳다고 믿기에 어느 쪽도 물러서지 못한다',
]

// 위험한 강점 — 포일이 가진, 주인공에게 없는 "치명적 무기"(명사구). 거울의 매력과 위협을 동시에 만든다.
// (명사구로만 적어 둔다 → 화면에서 "…을/를 무기로 삼는다" 처럼 조사를 실제로 골라 붙인다.)
const FLAW: string[] = [
  '망설임 없는 결단력',
  '목적을 위해서라면 무엇이든 버리는 냉정함',
  '사람의 약점을 꿰뚫어 보는 통찰',
  '거짓을 진실처럼 말하는 화술',
  '죄책감에 흔들리지 않는 강철 같은 의지',
  '한번 정한 길을 끝까지 가는 집념',
  '두려움을 모르는 대담함',
  '상대를 자기편으로 만드는 매력',
  '필요할 때 망설임 없이 손을 더럽히는 결기',
  '어떤 상황도 자기에게 유리하게 바꾸는 수완',
  '감정을 완벽히 숨기는 침착함',
  '한계를 두지 않는 야망',
  '고통을 견디고 이용하는 인내',
  '누구도 믿지 않기에 누구에게도 배신당하지 않는 경계심',
]

interface Foil {
  nameStyle: NameStyle
  name: string
  proName: string          // 주인공 이름(편집 가능, 비교 기준)
  axes: Axis[]             // 선택된 대비 축(2~3개)
  proPole: ('left' | 'right')[] // 각 축에서 주인공이 선 극
  common: string
  diverge: string
  themeQ: string
  ending: string
  dynamic: string
  clash: string
  archetype: string
  motto: string            // 포일의 좌우명(주인공과 대비되는)
  flaw: string             // 위험한 강점(명사구) — 주인공에게 없는 치명적 무기
}

const FOIL_ARCHETYPE = ['그림자형', '맞수형', '유혹자형', '거울형', '심판자형', '잃어버린 형제형', '타락한 거울형', '대안적 자아형', '추락한 영웅형', '냉소적 현실가형', '구원받지 못한 자형', '비뚤어진 스승형', '먼저 무너진 자형', '되돌아온 배신자형']
const MOTTOS = [
  '“세상은 그렇게 단순하지 않아.”',
  '“네가 옳다고 나도 옳은 건 아니야.”',
  '“나는 살아남는 쪽을 택했을 뿐이야.”',
  '“그 길의 끝이 어떤지, 나는 알아.”',
  '“우리는 같은 곳에서 시작했어. 잊지 마.”',
  '“네가 못 한 걸 내가 했을 뿐이야.”',
  '“이게 진짜 세상이야. 네 동화가 아니라.”',
  '“언젠가 너도 내 자리에 서게 될 거야.”',
  '“나는 후회하지 않아. 너는?”',
  '“너의 정의가 누군가를 죽였어.”',
  '“착하게 살아서 남은 게 뭐였지?”',
  '“나는 현실을 봤고, 너는 동화를 봤어.”',
  '“네가 망설이는 사이, 나는 지켰어.”',
  '“우리 중 누가 더 비겁한지는 끝에 가서 알게 돼.”',
  '“희망은 약한 자들의 위안일 뿐이야.”',
  '“네가 옳다고 믿는 만큼, 나도 믿어.”',
  '“손을 더럽힌 건 나지만, 살아남은 것도 나야.”',
  '“언젠가 너도 내 말을 이해하게 될 거야.”',
]

function genFoil(prevProName?: string, prevStyle?: NameStyle): Foil {
  const nameStyle = prevStyle ?? pick(['ko', 'en', 'fantasy'] as NameStyle[])
  const n = 2 + ri(2) // 2~3 축
  const axes = pickN(AXES, n)
  return {
    nameStyle,
    name: randName(nameStyle),
    proName: prevProName ?? '주인공',
    axes,
    proPole: axes.map(() => (Math.random() < 0.5 ? 'left' : 'right')),
    common: pick(COMMON),
    diverge: pick(DIVERGE),
    themeQ: pick(THEME_Q),
    ending: pick(ENDING),
    dynamic: pick(DYNAMIC),
    clash: pick(CLASH),
    archetype: pick(FOIL_ARCHETYPE),
    motto: pick(MOTTOS),
    flaw: pick(FLAW),
  }
}

// 조합수 추정(대비 축 2개 선택[순서 무관 아님: 좌/우 극이 달라 순서 의미 있음] × 극 방향 × 텍스트 슬롯들)
// 매 결과에 실제로 곱해지는 고유 슬롯만 센다: 축쌍 × 극(4) × 공통 × 갈림 × 주제 × 결말 × 역학 × 충돌 × 원형 × 좌우명 × 위험한 강점.
const axisPairs = AXES.length * (AXES.length - 1)
const COMBOS = axisPairs * 4 * COMMON.length * DIVERGE.length * THEME_Q.length * ENDING.length * DYNAMIC.length * CLASH.length * FOIL_ARCHETYPE.length * MOTTOS.length * FLAW.length

type SlotKey = 'common' | 'diverge' | 'themeQ' | 'ending' | 'dynamic' | 'clash' | 'archetype' | 'motto' | 'flaw' | 'name'

const LKEY = 'sry:tool:character-foil-gen'
interface Saved { proName: string; nameStyle: NameStyle; foils: SavedFoil[] }
interface SavedFoil { id: string; name: string; text: string }

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(LKEY)
    if (raw) { const p = JSON.parse(raw) as Partial<Saved>; return { proName: p.proName || '주인공', nameStyle: p.nameStyle || 'ko', foils: Array.isArray(p.foils) ? p.foils : [] } }
  } catch { /* noop */ }
  return { proName: '주인공', nameStyle: 'ko', foils: [] }
}

export default function CharacterFoilGen({ payload }: { payload?: Record<string, unknown> }) {
  const init = useMemo(() => loadSaved(), [])
  const [proName, setProName] = useState(init.proName)
  const [nameStyle, setNameStyle] = useState<NameStyle>(init.nameStyle)
  const [f, setF] = useState<Foil>(() => genFoil(init.proName, init.nameStyle))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockedAxes, setLockedAxes] = useState(false)
  const [saved, setSaved] = useState<SavedFoil[]>(init.foils)
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { setToast(''); toastTimer.current = null }, 1800)
  }

  // payload 로 주인공 이름/특성이 넘어오면 반영
  useMemo(() => {
    const c = payload?.character as Record<string, unknown> | undefined
    const pn = (payload?.proName as string) || (c?.name as string)
    if (pn) { setProName(pn); setF((prev) => ({ ...prev, proName: pn })) }
    // eslint-disable-next-line
  }, [])

  const persist = (foils: SavedFoil[], pn = proName, ns = nameStyle) => {
    setSaved(foils)
    try { localStorage.setItem(LKEY, JSON.stringify({ proName: pn, nameStyle: ns, foils } as Saved)) } catch { /* noop */ }
  }

  const rollAll = () => {
    setF((prev) => {
      const next = genFoil(proName, nameStyle)
      if (lockedAxes) { next.axes = prev.axes; next.proPole = prev.proPole }
      const keys: SlotKey[] = ['common', 'diverge', 'themeQ', 'ending', 'dynamic', 'clash', 'archetype', 'motto', 'flaw', 'name']
      for (const k of keys) if (locked[k]) (next as unknown as Record<string, unknown>)[k] = (prev as unknown as Record<string, unknown>)[k]
      next.proName = proName; next.nameStyle = nameStyle
      return next
    })
    // 사용자 정의 항목은 정의(라벨)는 유지하되 값만 비운다. 기타도 비운다.
    setCustom((cs) => cs.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }
  const rollSlot = (k: SlotKey) => setF((prev) => {
    const fresh = genFoil(proName, nameStyle)
    return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Foil
  })
  const rollAxes = () => setF((prev) => {
    if (lockedAxes) return prev
    const fresh = genFoil(proName, nameStyle)
    return { ...prev, axes: fresh.axes, proPole: fresh.proPole }
  })
  const flipPole = (i: number) => setF((prev) => {
    const proPole = [...prev.proPole]; proPole[i] = proPole[i] === 'left' ? 'right' : 'left'
    return { ...prev, proPole }
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 사용자 정의 항목: 라벨을 입력받아 빈 값 입력칸을 추가한다(무작위 생성하지 않음).
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')
    const t = (label || '').trim()
    if (!t) return
    setCustom((cs) => [...cs, { id: 'cf_' + Date.now().toString(36) + '_' + ri(1e6).toString(36), label: t, value: '' }])
  }
  const setCustomValue = (id: string, v: string) => setCustom((cs) => cs.map((c) => (c.id === id ? { ...c, value: v } : c)))
  const removeCustom = (id: string) => setCustom((cs) => cs.filter((c) => c.id !== id))

  // 다른 도구로 보내는 캐릭터 객체의 fields 에 합칠 사용자 정의·기타 항목(값이 있을 때만)
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) { const l = c.label.trim(); const v = c.value.trim(); if (l && v) out[l] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }
  // 복사/요약 텍스트에 덧붙일 사용자 정의·기타 줄(값이 있을 때만)
  const extraLines = (): string[] => {
    const L: string[] = []
    for (const c of custom) { const l = c.label.trim(); const v = c.value.trim(); if (l && v) L.push(`■ ${l}: ${v}`) }
    const e = etc.trim(); if (e) L.push('■ 기타: ' + e)
    return L
  }

  // 한 축의 양극: 주인공 극 / 포일 극(반대)
  const poleText = (ax: Axis, pole: 'left' | 'right') => (pole === 'left' ? ax.left : ax.right)
  const foilPole = (i: number): 'left' | 'right' => (f.proPole[i] === 'left' ? 'right' : 'left')
  // 위험한 강점(명사구)을 완성 문장으로 — 받침에 맞춰 은/는·을/를 을 실제로 골라 붙인다(괄호 이중표기 금지).
  const flawSentence = () => `${withJosa(f.name, ['은', '는'])} ${withJosa(f.flaw, ['을', '를'])} 무기로 삼는다`

  const axisLines = () => f.axes.map((ax, i) =>
    `${ax.label}: ${proName} → ${poleText(ax, f.proPole[i])}  /  ${f.name} → ${poleText(ax, foilPole(i))}   (질문: ${ax.theme})`
  )

  const summaryText = () => {
    const L: string[] = []
    L.push(`【대조 인물(포일): ${f.name}】  — ${f.archetype}`)
    L.push(`기준 주인공: ${proName}`)
    L.push(`좌우명: ${f.motto}`)
    L.push('')
    L.push('■ 대비 축 (거울이 갈라지는 차원)')
    axisLines().forEach((l) => L.push('  · ' + l))
    L.push('')
    L.push('■ 닮은꼴(공통의 출발점): ' + f.common)
    L.push('■ 결정적 차이(갈라진 지점): ' + f.diverge)
    L.push('■ 위험한 강점: ' + flawSentence())
    L.push('■ 관계 역학: ' + f.dynamic)
    L.push('■ 충돌 발화점: ' + f.clash)
    L.push('■ 주제적 대조: ' + f.themeQ)
    L.push('■ 결말 대조: ' + f.ending)
    extraLines().forEach((l) => L.push(l))
    return L.join('\n')
  }

  const bodyHtml = () => {
    const p = (s: string) => `<p>${esc(s)}</p>`
    const li = (s: string) => `<li>${esc(s)}</li>`
    return [
      p(`대조 인물(포일): ${f.name} — ${f.archetype}`),
      p(`기준 주인공: ${proName}`),
      p(`좌우명: ${f.motto}`),
      `<p><b>대비 축</b></p><ul>${axisLines().map(li).join('')}</ul>`,
      p(`닮은꼴: ${f.common}`),
      p(`결정적 차이: ${f.diverge}`),
      p(`위험한 강점: ${flawSentence()}`),
      p(`관계 역학: ${f.dynamic}`),
      p(`충돌 발화점: ${f.clash}`),
      p(`주제적 대조: ${f.themeQ}`),
      p(`결말 대조: ${f.ending}`),
      ...extraLines().map((l) => p(l)),
    ].join('')
  }

  const copy = () => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사했습니다')).catch(() => flash('복사 실패')) }
  const saveLocal = () => {
    const rec: SavedFoil = { id: 'foil_' + Date.now().toString(36) + '_' + ri(1e6).toString(36), name: f.name, text: summaryText() }
    persist([rec, ...saved].slice(0, 30))
    flash('이 포일을 저장했습니다')
  }
  const removeSaved = (id: string) => persist(saved.filter((s) => s.id !== id))

  const stash = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다'); return }
    addToStash({ kind: 'note', label: `포일 인물 · ${f.name}`, text: summaryText() })
    flash('수집함에 담았습니다')
  }
  const toLibrary = () => {
    const role = `대조 인물(포일) · ${f.archetype}`
    const goal = `${proName}의 거울 — ${f.themeQ}`
    const personality = f.axes.map((ax, i) => `${ax.label}: ${poleText(ax, foilPole(i))}`).join(' · ')
    const value = f.axes.map((ax, i) => `${ax.label}: ${poleText(ax, foilPole(i))} (vs ${proName}: ${poleText(ax, f.proPole[i])})`).join(' · ')
    const c: Partial<SharedCharacter> = {
      name: f.name,
      role,
      goal,
      secret: f.diverge,
      personality,
      notes: summaryText(),
      // 정규 캐릭터 필드 — 받는 허브(인물 시트)에서 항목이 제자리에 들어가게 표준 키로 매핑
      fields: {
        name: f.name,
        role,
        goal,
        value,                                                 // 대비 축(가치관) → value
        personality,
        secret: f.diverge,                                     // 결정적 차이 → secret
        motivation: f.clash,                                   // 충돌 발화점 → motivation
        strength: flawSentence(),                              // 위험한 강점 → strength
        background: f.common,                                  // 공통의 출발점(닮은꼴) → background
        relations: f.dynamic,                                  // 관계 역학 → relations
        arc: f.ending,                                         // 결말 대조 → arc(성장 곡선)
        notes: summaryText(),
        ...extraFields(),                                      // 사용자 정의 항목(라벨=키) + 기타(etc) — 값이 있을 때만
      },
      source: '대조 인물(포일) 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const role = `대조 인물(포일) · ${f.archetype}`
    const goal = `${proName}의 거울`
    const personality = f.axes.map((ax, i) => `${ax.label}: ${poleText(ax, foilPole(i))} (vs ${proName}: ${poleText(ax, f.proPole[i])})`).join(' · ')
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: `${f.name} (포일)`,
      character: {
        name: f.name,
        role,
        goal,
        personality,
        conflict: f.clash,
        background: f.common,
        notes: f.motto,
        // 정규 캐릭터 필드(추가) — 받는 인물 카드에서 표준 칸에 들어가게 매핑(기존 키 유지)
        value: personality,                                    // 대비 축(가치관) → value
        secret: f.diverge,                                     // 결정적 차이 → secret
        motivation: f.clash,                                   // 충돌 발화점 → motivation
        strength: flawSentence(),                              // 위험한 강점 → strength
        relations: f.dynamic,                                  // 관계 역학 → relations
        arc: f.ending,                                         // 결말 대조 → arc
        ...extraFields(),                                      // 사용자 정의 항목(라벨=키) + 기타(etc) → 카드 필드. 값이 있을 때만
      },
      bodyHtml: bodyHtml(),
      meta: { 유형: '대조 인물(포일)', 원형: f.archetype, 기준주인공: proName, 관계: f.dynamic.split(' — ')[0] },
    })
    if (id) flash('프로젝트 ‘자료 › 인물’에 포일 카드를 추가했습니다 (바인더·DB 확인)')
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // 작은 슬롯 행 렌더러
  const SlotRow = (k: SlotKey, label: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px' }}>
      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 78, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.45 }}>{value}</span>
      <button className="minibtn" title={locked[k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(k)} style={{ padding: '0 3px', color: locked[k] ? 'var(--accent)' : 'var(--muted)' }}><>{locked[k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</></button>
      <button className="minibtn" title="이 항목만 다시" onClick={() => rollSlot(k)} disabled={!!locked[k]} style={{ padding: '0 3px' }}><Emoji e="🎲"/></button>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      {/* 상단: 기준 주인공 + 이름 스타일 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>기준 주인공</span>
        <input
          value={proName}
          onChange={(e) => { const v = e.target.value; setProName(v); setF((prev) => ({ ...prev, proName: v })); persist(saved, v) }}
          placeholder="주인공 이름"
          style={{ width: 110, fontSize: 12, padding: '3px 6px', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5 }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>포일 이름</span>
        {(Object.keys(NAME_LABEL) as NameStyle[]).map((s) => (
          <button key={s} className={'minibtn' + (nameStyle === s ? ' active' : '')} onClick={() => { setNameStyle(s); setF((prev) => ({ ...prev, nameStyle: s, name: randName(s) })); persist(saved, proName, s) }}>{NAME_LABEL[s]}</button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {/* 헤더 카드: 포일 정체성 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}><Emoji e="🪞"/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{f.name}</span>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>{f.archetype}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>↔ {proName}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}>{f.motto}</div>
        </div>
      </div>

      {/* 대비 축 표 — 포일의 핵심 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}>대비 축 (거울이 갈라지는 차원)</span>
          <button className="minibtn" title={lockedAxes ? '잠금해제' : '잠금'} onClick={() => setLockedAxes((v) => !v)} style={{ marginLeft: 'auto', padding: '0 4px', color: lockedAxes ? 'var(--accent)' : 'var(--muted)' }}><>{lockedAxes ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</></button>
          <button className="minibtn" title="대비 축 다시" onClick={rollAxes} disabled={lockedAxes} style={{ padding: '0 4px' }}><Emoji e="🎲"/></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {f.axes.map((ax, i) => (
            <div key={ax.id + i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 22px 1fr', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{ax.label}</span>
              <span style={{ fontSize: 11.5, textAlign: 'right', padding: '2px 6px', borderRadius: 5, background: 'var(--paper)', border: '1px solid var(--border)' }} title={`${proName}의 극`}>
                <b style={{ color: 'var(--text)' }}>{proName}</b><br /><span style={{ color: 'var(--accent)' }}>{poleText(ax, f.proPole[i])}</span>
              </span>
              <button className="minibtn" title="주인공 극 좌우 바꾸기" onClick={() => flipPole(i)} style={{ padding: 0, justifySelf: 'center' }}>⇄</button>
              <span style={{ fontSize: 11.5, padding: '2px 6px', borderRadius: 5, background: 'var(--paper)', border: '1px solid var(--border)' }} title={`${f.name}의 극(반대)`}>
                <b style={{ color: 'var(--text)' }}>{f.name}</b><br /><span style={{ color: 'var(--ok)' }}>{poleText(ax, foilPole(i))}</span>
              </span>
              <span style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--muted)', paddingLeft: 68 }}>질문: {ax.theme}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 텍스트 슬롯들 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SlotRow('common', '닮은꼴', f.common)}
        {SlotRow('diverge', '갈라진 지점', f.diverge)}
        {SlotRow('flaw', '위험한 강점', flawSentence())}
        {SlotRow('dynamic', '관계 역학', f.dynamic)}
        {SlotRow('clash', '충돌 발화점', f.clash)}
        {SlotRow('themeQ', '주제적 대조', f.themeQ)}
        {SlotRow('ending', '결말 대조', f.ending)}
        {SlotRow('archetype', '포일 원형', f.archetype)}
        {SlotRow('motto', '좌우명', f.motto)}

        {/* 사용자 정의 항목 — 직접 라벨/내용 입력. 무작위 생성 시 값만 비워짐(라벨 유지) */}
        {custom.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 78, flexShrink: 0, paddingTop: 4 }} title={c.label}>{c.label}</span>
            <input
              value={c.value}
              onChange={(e) => setCustomValue(c.id, e.target.value)}
              placeholder="내용을 직접 입력"
              style={{ flex: 1, fontSize: 12, padding: '3px 6px', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5 }}
            />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)} style={{ padding: '0 4px' }}>✕</button>
          </div>
        ))}
        <div>
          <button className="minibtn" onClick={addCustom}>＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px' }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>기타</span>
          <textarea
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
            placeholder="자유롭게 메모하세요 (다른 도구로 함께 전달됩니다)"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, lineHeight: 1.45, padding: '4px 6px', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {saved.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0' }}>저장된 포일 {saved.length}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px' }}>
                  <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.text}>{s.name}</span>
                  <button className="minibtn" title="복사" onClick={() => { navigator.clipboard?.writeText(s.text).then(() => flash('복사했습니다')).catch(() => {}) }} style={{ padding: '0 4px' }}><Emoji e="📋"/></button>
                  <button className="minibtn" title="삭제" onClick={() => removeSaved(s.id)} style={{ padding: '0 4px' }}><Emoji e="🗑"/></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 생성/복사 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 포일 생성</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={saveLocal}><Emoji e="💾"/> 이 포일 저장</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄"/> 프로젝트에 포일 카드 추가</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥"/> 인물 라이브러리</button>
        <button className="linkbtn" onClick={stash} disabled={!hasStash()}><Emoji e="📎"/> 수집함</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { focus: f.name, pair: [proName, f.name] })}><Emoji e="🕸"/> 관계도 열기</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)', minHeight: 14 }}>
        {toast || '포일은 주인공과 “닮은 출발점”에서 “결정적 차이”로 갈라져 주제를 비춥니다. 대비 축의 ⇄로 주인공 극을 바꿔 가며 거울을 조율하세요.'}
      </div>
    </div>
  )
}
