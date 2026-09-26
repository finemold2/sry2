// 적대자/빌런 설계기 — 좋은 적대자는 "자기 이야기의 주인공"이라는 작법 원리에 따라
//  목표(무엇을 원하는가) · 신념/자기정당화(왜 자신이 옳다고 믿는가) · 방법(어떻게 밀어붙이는가)
//  · 약점(어디서 무너지는가) · 주인공과의 주제적 대칭(거울: 같은 질문에 정반대로 답한 자)
//  · 위협 등급(이야기에 가하는 압박의 크기)을 슬롯+자유입력으로 설계한다.
//  슬롯 🔒 잠금 + 부분/전체 무작위 조합 생성(조합수 표시) + 구조 점검(약한 고리 진단).
//  여러 빌런을 저장·수정·삭제. localStorage 'sry:tool:antagonist-forge' 영속.
//  연계(linkbus): 인물 라이브러리 저장 · 프로젝트(자료 › 인물)에 적대자 카드 추가
//   · 좌측 바인더의 인물 파일을 드롭하면 "주인공"으로 받아 거울 대칭을 설계.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. 외부 미디어/키/네트워크 불필요.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary, addToProject, hasProjectBridge,
  getDragItem, isItemDrag, openToolLinked, type SharedCharacter,
  Emoji, emojify,
} from './linkbus'

export const meta = { id: 'antagonist-forge', name: '적대자 설계기', icon: '😈', group: '캐릭터', intro: '목표·신념(자기정당화)·방법·약점·주인공과의 거울 대칭·위협 등급으로 입체적 빌런 설계', w: 680, h: 640 }

// ── 슬롯 데이터 (자작 한국어 텍스트만 · 저작권 안전) ──
// 각 풀은 슬롯 문법역할이 일치하는 고유 항목만 담는다(명사구 자리엔 명사구, 종결문 자리엔 종결문).
// 슬롯끼리 곱집합으로 섞여도 모순이 없도록 각 항목은 다른 슬롯을 전제하지 않는 '독립' 표현이다.
const SLOT = {
  // 적대자가 진정으로 원하는 것(표면이 아닌 핵심 욕망) — '~하는 것' 명사구로 통일
  goal: [
    '세상을 자기 방식대로 다시 빚는 것', '잃어버린 것을 되찾는 것', '두 번 다시 약자가 되지 않는 것',
    '인정받지 못한 자신을 증명하는 것', '무너진 질서를 강제로 세우는 것', '사랑하는 이를 구하는 것',
    '과거의 죄를 지우는 것', '모두를 자신과 같게 만드는 것', '불멸 혹은 영원한 통제를 얻는 것',
    '심판자가 되어 세상을 벌하는 것', '진실을 영원히 묻어 두는 것', '자식·후계에게 모든 것을 물려주는 것',
    '고통을 끝낼 절대적 평화를 강제하는 것', '자신을 버린 세계에 복수하는 것',
    '아무도 자신을 떠나지 못하게 만드는 것', '한때 빼앗긴 자리를 되찾는 것',
    '세상의 모든 비밀을 손에 쥐는 것', '자신의 이름을 영원히 남기는 것',
    '두려움 없이 모두를 굽어보는 것', '낡은 세대를 끝장내고 새 시대를 여는 것',
    '약속을 어긴 자들에게 빠짐없이 빚을 받아 내는 것', '완벽한 작품으로 자신을 완성하는 것',
    '운명을 거슬러 정해진 결말을 바꾸는 것', '자신만 아는 진실로 세상을 깨우치는 것',
    '돌이킬 수 없는 선택을 한 자들을 심판하는 것', '모든 경쟁자를 영원히 침묵시키는 것',
    '잊힌 옛 영광을 되살리는 것', '누구도 자신을 함부로 대하지 못하게 만드는 것',
    '세상의 고삐를 단 한 손에 거머쥐는 것', '자신을 만든 자에게 똑같이 갚아 주는 것',
  ],
  // 자기정당화 — 빌런이 스스로를 영웅이라 믿는 논리(가장 중요한 슬롯) — 단정 종결문으로 통일
  belief: [
    '강한 자가 약한 자를 다스리는 것이 자연의 순리다', '소수의 희생으로 다수를 구할 수 있다면 정당하다',
    '질서를 위해서는 자유를 빼앗아야 한다', '사랑한다면 가두어서라도 지켜야 한다',
    '세상은 어차피 썩었으니 불태우고 다시 시작해야 한다', '나만이 진실을 감당할 자격이 있다',
    '먼저 상처 준 것은 세상이고 나는 되갚을 뿐이다', '고통이 없는 세계가 자유로운 세계보다 낫다',
    '약함은 죄이며 동정은 더 큰 악을 부른다', '목적이 옳다면 수단은 역사가 용서한다',
    '나는 누군가는 해야 할 더러운 일을 떠맡았을 뿐이다', '규칙을 어긴 자는 규칙 밖의 대가를 치러야 한다',
    '진정한 자비는 선택지를 없애 주는 것이다', '내가 겪은 일을 남도 겪어야 공평하다',
    '두려움이야말로 사람을 바르게 움직이는 유일한 힘이다', '준비된 소수가 어리석은 다수를 이끌어야 한다',
    '한번 무너진 신뢰는 영원히 되돌릴 수 없다', '용서는 다음 죄를 부르는 비겁한 변명일 뿐이다',
    '세상에 공짜는 없으니 모든 것에는 값을 치러야 한다', '내가 멈추면 더 잔인한 자가 그 자리를 차지한다',
    '진실은 다수에게 감당할 수 없는 독이다', '평등은 환상이며 누군가는 반드시 위에 서야 한다',
    '한 세대의 고통이 백 세대의 평안을 산다', '감정은 판단을 흐리는 사치에 불과하다',
    '내 손이 더러워져도 결과가 깨끗하면 그만이다', '약속을 어긴 세상에 내가 진 빚은 없다',
    '운명에 굴복하는 자만이 패배자로 남는다', '가장 큰 자비는 헛된 희망을 끊어 주는 것이다',
    '질서가 무너진 자리에는 더 큰 피가 흐른다', '나를 미워하는 자들도 결국 내게 기대게 된다',
  ],
  // 방법 — 목표를 향해 밀어붙이는 수단/스타일 — '~한다' 종결문(독립 행동)으로 통일
  method: [
    '공포로 굴복시킨다', '거짓과 선동으로 마음을 산다', '제도와 법을 무기로 휘두른다',
    '돈과 빚으로 옭아맨다', '약점을 잡아 협박한다', '은밀히 잠식하며 때를 기다린다',
    '폭력과 무력으로 짓밟는다', '신뢰를 얻은 뒤 배신한다', '정보를 독점해 통제한다',
    '추종자를 길러 대신 손을 더럽힌다', '상대의 소중한 것을 인질로 삼는다', '규칙을 바꿔 합법적으로 빼앗는다',
    '자비를 베푸는 척 의존하게 만든다', '분열을 부추겨 서로 싸우게 한다',
    '여론을 조작해 진실을 덮는다', '뒤에서 줄을 당겨 모두를 조종한다',
    '은혜를 베풀어 갚을 수 없는 빚을 지운다', '소문을 퍼뜨려 평판을 무너뜨린다',
    '가장 가까운 자부터 포섭해 고립시킨다', '시간을 끌어 상대를 지치게 만든다',
    '약속과 계약으로 옭아매 빠져나갈 길을 막는다', '공포와 호의를 번갈아 써 길들인다',
    '눈에 띄지 않게 판 자체를 뒤바꿔 놓는다', '대의를 내세워 희생을 강요한다',
    '실수를 유도해 빌미를 잡는다', '필요한 것을 독점해 매달리게 만든다',
    '거짓 적을 만들어 시선을 돌린다', '작은 양보로 더 큰 것을 빼앗는다',
    '두려움을 심어 스스로 무릎 꿇게 한다', '비밀을 사고팔며 모두를 저울 위에 올린다',
  ],
  // 약점/무너지는 지점 — 빌런을 입체적으로 만들고 결말을 가능케 함 — 명사구로 통일
  weakness: [
    '버림받을지 모른다는 깊은 두려움', '단 한 사람만은 끝내 해치지 못함', '자기 신념을 의심하는 순간의 균열',
    '과거의 상처를 건드리면 무너지는 통제력', '오만 — 누구도 자신을 이길 수 없다는 확신', '결코 인정하지 못하는 외로움',
    '한때의 이상을 기억나게 하는 존재', '논리로는 설명되지 않는 단 하나의 집착', '약속·규칙에 스스로 묶인 결벽',
    '들키면 끝나는 숨겨진 비밀', '대체 불가능한 측근에 대한 과한 의존', '죽음·소멸에 대한 본능적 공포',
    '자식·후계 앞에서만 드러나는 인간성', '한 번의 실패를 견디지 못하는 완벽주의',
    '칭찬 한마디에 쉽게 흔들리는 허영', '통제를 잃는 순간 폭발하는 분노',
    '옛 은인에게만은 거역하지 못하는 마음', '늘 한 수만 모자란 결정적 오판',
    '자신이 옳다는 것을 끝내 증명하려는 조바심', '혼자 남는 것을 견디지 못하는 공허',
    '한번 내뱉은 말은 결코 거두지 못하는 자존심', '특정한 날·장소 앞에서 무너지는 평정',
    '연민을 들키지 않으려다 도리어 드러나는 틈', '완벽한 계획에 깃든 단 하나의 맹점',
    '과거를 아는 이 앞에서 사라지는 위엄', '믿었던 이의 배신만은 상상조차 못 하는 순진함',
    '자신을 닮은 어린 존재 앞에서의 망설임', '쌓아 올린 명성을 잃을까 두려운 강박',
    '술·약·도박 같은 끊지 못하는 위안', '단 한 번도 받아 보지 못한 인정에 대한 갈증',
  ],
  // 주제적 대칭 — 주인공과 같은 상처/질문을 공유하되 정반대 답을 택한 거울(주인공 전제 슬롯)
  mirror: [
    '같은 상처를 받았지만, 주인공은 용서를 택하고 그는 복수를 택했다',
    '둘 다 무력함을 겪었지만, 주인공은 연대를 그는 지배를 택했다',
    '같은 이상을 품었지만, 주인공은 사람을 그는 결과를 우선했다',
    '둘 다 두려움에 쫓기지만, 주인공은 마주하고 그는 통제하려 한다',
    '같은 질문에 주인공은 "그럼에도 믿는다", 그는 "그래서 버린다"고 답한다',
    '주인공이 될 수도 있었던 미래 — 한 번의 선택만 달랐다',
    '같은 사랑을 했지만, 주인공은 놓아주고 그는 가두려 한다',
    '둘 다 옳음을 추구하나, 주인공은 의심을 그는 확신을 무기로 삼는다',
    '주인공이 외면한 진실을 그는 끝까지 응시한 대가로 괴물이 되었다',
    '같은 길의 끝 — 주인공이 멈춘 자리에서 그는 한 걸음 더 갔다',
    '같은 실패를 겪었지만, 주인공은 다시 일어서고 그는 세상을 원망했다',
    '둘 다 같은 스승을 두었으나, 주인공은 뜻을 그는 힘만을 물려받았다',
  ],
  // 기원/계기 — 빌런을 만든 결정적 사건(과거). '~한 일' 명사구로 통일(독립 표현).
  origin: [
    '믿었던 이에게 모든 것을 빼앗긴 일', '눈앞에서 소중한 사람을 잃은 일',
    '정의를 외쳤으나 아무도 듣지 않았던 일', '한순간의 실수로 모든 것을 망가뜨린 일',
    '구원을 빌었지만 끝내 외면당한 일', '재능을 가지고도 끝까지 인정받지 못한 일',
    '약속을 지켰는데 도리어 버림받은 일', '진실을 말한 대가로 모두에게 쫓겨난 일',
    '살아남기 위해 한 사람을 희생시킨 일', '돌봐 주던 곳이 하루아침에 무너진 일',
    '오랜 노력을 누군가에게 송두리째 빼앗긴 일', '죄 없이 누명을 쓰고 추락한 일',
    '간절히 매달린 손을 끝내 놓쳐 버린 일', '세상이 정한 규칙에 짓밟혀 본 일',
    '용서받을 기회조차 주어지지 않았던 일', '사랑이라 믿었던 것에 깊이 배신당한 일',
  ],
  // 상징/연출 — 빌런을 각인시키는 시각적·청각적 인장. 명사구로 통일(독립 표현).
  signature: [
    '늘 흐트러짐 없이 차려입은 단정한 옷차림', '결코 미소를 거두지 않는 서늘한 표정',
    '천천히 또박또박 끊어 말하는 낮은 목소리', '늘 한 박자 늦게 다가오는 발소리',
    '손에서 떠나지 않는 낡은 회중시계', '얼굴 절반을 가린 차가운 가면',
    '피처럼 붉은 한 송이의 꽃', '어디서든 풍기는 옅은 잿내',
    '상대의 이름을 부드럽게 부르는 버릇', '눈을 마주치되 결코 깜빡이지 않는 응시',
    '장갑을 벗지 않는 결벽', '오래된 자장가를 흥얼거리는 습관',
    '흠집 하나 없이 빛나는 검은 구두', '늘 정확히 같은 자리에 두는 물건들',
    '말끝마다 덧붙이는 차분한 존댓말', '떠난 자리마다 남는 한 가지 표식',
  ],
} as const

type SlotKey = keyof typeof SLOT

// 위협 등급 — 이야기에 가하는 압박의 크기/범위
interface Tier { key: string; label: string; icon: string; scope: string; hint: string }
const TIERS: Tier[] = [
  { key: 'personal', label: '개인 위협', icon: '🗡️', scope: '주인공 한 사람', hint: '주인공 개인의 안전·관계·목표를 직접 겨눈다. 가장 가깝고 절실한 압박.' },
  { key: 'circle', label: '공동체 위협', icon: '🏘️', scope: '주인공의 사람들', hint: '가족·친구·소속 집단 등 주인공이 지키려는 이들을 위협한다.' },
  { key: 'societal', label: '사회 위협', icon: '🏛️', scope: '도시·국가·계층', hint: '제도·질서·다수의 삶을 흔든다. 공적 무게가 실린다.' },
  { key: 'existential', label: '존재 위협', icon: '🌍', scope: '세계·종족·문명', hint: '세계 자체의 존속을 건다. 스케일이 크되 개인적 절실함과 연결돼야 공허하지 않다.' },
]
function tierDef(k: string): Tier { return TIERS.find((t) => t.key === k) || TIERS[0] }

// ── 데이터 모델 ──
interface Antagonist {
  id: string
  name: string
  protagonist: string          // 주인공(거울의 기준)
  goal: string
  belief: string
  method: string
  weakness: string
  mirror: string
  origin: string
  signature: string
  tier: string
  notes: string
  checks: Record<string, boolean>
  createdAt: number
}

const LS_KEY = 'sry:tool:antagonist-forge'

// 구조 점검 — 입체적 적대자가 갖추어야 할 약한 고리 진단 항목.
const DIAG_Q: { id: string; q: string; tip: string }[] = [
  { id: 'd1', q: '적대자가 자신을 "악당"이 아니라 "옳은 자"로 믿는가?', tip: '자기정당화가 분명할수록 빌런은 무서워집니다.' },
  { id: 'd2', q: '목표에 주인공의 목표와 직접 충돌하는 지점이 있는가?', tip: '둘이 같은 것을 두고 다투어야 갈등이 필연이 됩니다.' },
  { id: 'd3', q: '방법이 목표와 신념에서 자연스럽게 흘러나오는가?', tip: '신념 → 방법이 어긋나면 인물이 도구처럼 보입니다.' },
  { id: 'd4', q: '약점이 결말에서 패배(또는 변화)를 가능케 하는가?', tip: '약점은 결말을 여는 열쇠여야 합니다 — 너무 완벽하면 허무합니다.' },
  { id: 'd5', q: '주인공과 같은 상처/질문을 공유하는가? (거울)', tip: '주제적 대칭이 빌런을 단순한 장애물에서 의미로 끌어올립니다.' },
  { id: 'd6', q: '위협 등급이 추상적 스케일이 아니라 주인공에게 절실한가?', tip: '세계 멸망보다 "내 사람"이 더 무섭게 다가올 때가 많습니다.' },
  { id: 'd7', q: '적대자에게 작은 인간적 면모(연민의 틈)가 있는가?', tip: '한 줄의 인간성이 빌런을 잊히지 않게 만듭니다.' },
  { id: 'd8', q: '주인공보다 한 발 앞서거나 동등하게 강한가?', tip: '쉽게 이길 적은 긴장을 죽입니다.' },
  { id: 'd9', q: '적대자의 신념이 부분적으로는 일리가 있는가?', tip: '독자가 잠깐이라도 끄덕이면 위협이 깊어집니다.' },
  { id: 'd10', q: '이 적대자가 주인공을 변화시키거나 정체를 드러내는가?', tip: '좋은 적은 주인공을 진짜 모습으로 몰아붙입니다.' },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function ri(n: number): number { return Math.floor(Math.random() * n) }
function pick<T extends readonly unknown[]>(a: T): T[number] { return a[ri(a.length)] }

// 한국어 조사 — 앞 단어의 받침 유무를 보고 실제 형태 하나를 골라 붙인다.
// 괄호 이중표기("을(를)")를 절대 노출하지 않기 위한 헬퍼.
function hasBatchim(word: string): boolean {
  const m = (word || '').trim().match(/[가-힣][^가-힣]*$/) // 마지막 한글 음절 기준
  const ch = m ? m[0].charCodeAt(0) : NaN
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0 // 종성 인덱스 0 = 받침 없음
}
function josa(word: string, withB: string, noB: string): string {
  return (word || '').trim() + (hasBatchim(word) ? withB : noB)
}
const eul = (w: string) => josa(w, '을', '를')   // 을/를
const eun = (w: string) => josa(w, '은', '는')   // 은/는

// 빌런 이름(자작) — 분위기 있는 무작위 호칭.
const NAME_ADJ = ['잿빛', '검은', '창백한', '붉은', '무너진', '마지막', '침묵의', '서리', '깨진', '잊힌', '굶주린', '강철']
const NAME_NOUN = ['손', '왕', '재단사', '심판관', '늑대', '예언자', '수집가', '문지기', '거울', '재', '가시관', '사냥꾼', '어머니', '계산가']
function randName(): string { return pick(NAME_ADJ) + ' ' + pick(NAME_NOUN) }

const ROWS: { k: SlotKey; label: string; icon: string }[] = [
  { k: 'goal', label: '목표(핵심 욕망)', icon: '🎯' },
  { k: 'belief', label: '신념·자기정당화', icon: '⚖️' },
  { k: 'method', label: '방법', icon: '🩸' },
  { k: 'weakness', label: '약점', icon: '🩹' },
  { k: 'mirror', label: '주인공과의 거울', icon: '🪞' },
  { k: 'origin', label: '기원(빌런이 된 계기)', icon: '🕯️' },
  { k: 'signature', label: '상징·연출(각인되는 인장)', icon: '🎭' },
]

function emptyForm(): Antagonist {
  return { id: '', name: '', protagonist: '', goal: '', belief: '', method: '', weakness: '', mirror: '', origin: '', signature: '', tier: 'personal', notes: '', checks: {}, createdAt: 0 }
}

// 무작위 적대자 한 명 생성(잠긴 슬롯은 prev 유지).
function genAntagonist(prev: Antagonist | null, locked: Partial<Record<SlotKey | 'tier' | 'name', boolean>>): Antagonist {
  const base = prev || emptyForm()
  const out: Antagonist = { ...base, id: base.id || newId() }
  out.name = locked.name && base.name ? base.name : randName()
  for (const r of ROWS) out[r.k] = locked[r.k] && base[r.k] ? base[r.k] : (pick(SLOT[r.k]) as string)
  out.tier = locked.tier && base.tier ? base.tier : pick(TIERS).key
  return out
}

// 조합 수(전 슬롯 풀 크기의 곱 × 위협 등급). 고유 항목만 곱한다.
// goal30 × belief30 × method30 × weakness30 × mirror12 × origin16 × signature16 × tier4 ≈ 99.5억.
const COMBOS = (Object.keys(SLOT) as SlotKey[]).reduce((n, k) => n * SLOT[k].length, 1) * TIERS.length

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 목표 명사구('~하는 것')를 '~하기 위해'의 자연스러운 부사절로 변환.
// goal 풀은 모두 관형형+'것'('…는 것 / …은 것 / …ㄴ 것 / …을 것')인 명사구로 끝난다.
// 그대로 '것 위해'로 이으면 목적격 조사가 빠진 비문이 되므로, 관형형 어미를 '기'로 바꿔
// '…기 위해'를 만든다. (알 수 없는 형태는 목적격 조사를 붙인 '…을/를 위해'로 폴백해 문법성 보장.)
function goalForPurpose(goalRaw: string): string {
  const g = goalRaw.trim().replace(/[.。]$/, '')
  if (/는\s*것$/.test(g)) return g.replace(/는\s*것$/, '기')   // 되찾는 것 → 되찾기
  if (/은\s*것$/.test(g)) return g.replace(/은\s*것$/, '기')   // 얻은 것 → 얻기
  if (/을\s*것$/.test(g)) return g.replace(/을\s*것$/, '기')   // 얻을 것 → 얻기
  if (/ㄴ\s*것$/.test(g)) return g.replace(/ㄴ\s*것$/, '기')
  return eul(g) // 형태 불명: '것'이 아니어도 목적격 조사로 자연스럽게(…을/를 위해)
}

// 한 줄 요약(자연스러운 한국어 조립).
function summarize(a: Antagonist): string {
  const who = (a.name || '적대자').trim()
  const goal = goalForPurpose(a.goal || '무언가를 이루는 것')
  const method = (a.method || '수단을 가리지 않으며').trim().replace(/[.。]$/, '')
  const t = tierDef(a.tier)
  let s = `${eun(who)} ${goal} 위해 ${method}, ${eul(t.scope)} 위협한다`
  if (a.protagonist.trim()) {
    const p = a.protagonist.trim()
    s += ` — 그러나 ${josa(p, '이', '가')} 막아선다`
  }
  s += '.'
  return s
}

// 인물 카드 필드(프로젝트/라이브러리 공용).
function toCharacterFields(a: Antagonist): Record<string, string> {
  const t = tierDef(a.tier)
  const f: Record<string, string> = {
    name: a.name || '이름 미정 적대자',
    role: '적대자',
    goal: a.goal || '',
  }
  const personality = a.belief ? `자기정당화: ${a.belief}` : ''
  if (personality) f.personality = personality
  if (a.method) f.background = `방법: ${a.method}`
  const conflictParts: string[] = []
  if (a.weakness) conflictParts.push(`약점: ${a.weakness}`)
  if (a.mirror) conflictParts.push(`거울: ${a.mirror}`)
  conflictParts.push(`위협 등급: ${t.icon} ${t.label}(${t.scope})`)
  f.conflict = conflictParts.join(' · ')
  if (a.protagonist) f.relationships = `주인공 ‘${a.protagonist}’의 거울 대칭 적대자`
  if (a.notes) f.notes = a.notes
  return f
}

// 정규(표준) 캐릭터 필드 — 받는 허브(인물 시트/라이브러리)에서 항목이 기본 칸에 들어가도록
// linkbus 의 CHARACTER_FIELDS 키로 1:1 매핑한다. 뭉친 값은 분리·자연스러운 한국어로 조립.
function toCharacterCanonical(a: Antagonist): Record<string, string> {
  const t = tierDef(a.tier)
  const f: Record<string, string> = {
    name: (a.name || '이름 미정 적대자').trim(),
    role: '적대자',
  }
  if (a.goal.trim()) f.goal = a.goal.trim()                 // 목표/핵심 욕망 → goal
  if (a.belief.trim()) f.value = a.belief.trim()            // 신념·자기정당화 → 가치관(value)
  if (a.weakness.trim()) f.flaw = a.weakness.trim()         // 약점 → flaw
  // 거울 대칭(주인공과의 관계) → relations
  const rel: string[] = []
  if (a.protagonist.trim()) rel.push(`주인공: ${a.protagonist.trim()}`)
  if (a.mirror.trim()) rel.push(`거울 대칭: ${a.mirror.trim()}`)
  if (rel.length) f.relations = rel.join('\n')
  // 방법(정규 키 없음) + 기원 + 상징·연출 + 위협 등급 + 메모 → notes
  const noteParts: string[] = []
  if (a.method.trim()) noteParts.push(`방법: ${a.method.trim()}`)
  if (a.origin.trim()) noteParts.push(`기원: ${a.origin.trim()}`)
  if (a.signature.trim()) noteParts.push(`상징·연출: ${a.signature.trim()}`)
  noteParts.push(`위협 등급: ${t.icon} ${t.label}(${t.scope})`)
  if (a.notes.trim()) noteParts.push(a.notes.trim())
  f.notes = noteParts.join('\n')
  return f
}

// 프로젝트 본문(HTML) 생성.
function bodyHtml(a: Antagonist): string {
  const t = tierDef(a.tier)
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const parts: string[] = []
  parts.push(`<p><b>한 줄 요약:</b> ${escHtml(summarize(a))}</p>`)
  if (a.protagonist.trim()) parts.push(`<p>🫅 주인공(거울 기준): ${escHtml(a.protagonist.trim())}</p>`)
  parts.push(`<p><b>🎯 목표(핵심 욕망)</b><br>${v(a.goal)}</p>`)
  parts.push(`<p><b>⚖️ 신념·자기정당화</b><br>${v(a.belief)}</p>`)
  parts.push(`<p><b>🩸 방법</b><br>${v(a.method)}</p>`)
  parts.push(`<p><b>🩹 약점</b><br>${v(a.weakness)}</p>`)
  parts.push(`<p><b>🪞 주인공과의 거울 대칭</b><br>${v(a.mirror)}</p>`)
  parts.push(`<p><b>🕯️ 기원(빌런이 된 계기)</b><br>${v(a.origin)}</p>`)
  parts.push(`<p><b>🎭 상징·연출</b><br>${v(a.signature)}</p>`)
  parts.push(`<p><b>${escHtml(t.icon)} 위협 등급</b><br>${escHtml(t.label)} · ${escHtml(t.scope)}</p>`)
  if (a.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${escHtml(a.notes.trim())}</p>`)
  return parts.join('')
}

// 텍스트 내보내기.
function exportText(a: Antagonist): string {
  const t = tierDef(a.tier)
  const lines = [
    `# ${a.name || '(이름 미정)'} — 적대자`,
    '',
    `요약: ${summarize(a)}`,
    '',
    `· 주인공(거울 기준): ${a.protagonist || '—'}`,
    `· 목표: ${a.goal || '—'}`,
    `· 신념/자기정당화: ${a.belief || '—'}`,
    `· 방법: ${a.method || '—'}`,
    `· 약점: ${a.weakness || '—'}`,
    `· 거울 대칭: ${a.mirror || '—'}`,
    `· 기원: ${a.origin || '—'}`,
    `· 상징·연출: ${a.signature || '—'}`,
    `· 위협 등급: ${t.icon} ${t.label} (${t.scope})`,
  ]
  if (a.notes.trim()) { lines.push('', `메모: ${a.notes.trim()}`) }
  const checked = DIAG_Q.filter((q) => a.checks[q.id])
  lines.push('', `구조 점검: ${checked.length}/${DIAG_Q.length}`)
  checked.forEach((q) => lines.push(`  [v] ${q.q}`))
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Antagonist[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const tierKeys = TIERS.map((t) => t.key)
    const list: Antagonist[] = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
      id: String(x.id || newId()),
      name: String(x.name || ''),
      protagonist: String(x.protagonist || ''),
      goal: String(x.goal || ''),
      belief: String(x.belief || ''),
      method: String(x.method || ''),
      weakness: String(x.weakness || ''),
      mirror: String(x.mirror || ''),
      origin: String(x.origin || ''),
      signature: String(x.signature || ''),
      tier: tierKeys.includes(String(x.tier)) ? String(x.tier) : 'personal',
      notes: String(x.notes || ''),
      checks: x.checks && typeof x.checks === 'object' ? (x.checks as Record<string, boolean>) : {},
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function AntagonistForge({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Antagonist[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Antagonist | null>(null)
  const [locked, setLocked] = useState<Partial<Record<SlotKey | 'tier' | 'name', boolean>>>({})
  // 사용자 정의 항목(자유 라벨 + 직접 입력 값) · 고정 '기타' 자유 입력칸. 무작위 생성 시 값은 비우되 항목 정의는 유지.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [note, setNote] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 안내 자동 소거.
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => { if (mounted.current) setNote('') }, 2200)
    return () => window.clearTimeout(t)
  }, [note])

  // payload.protagonist 또는 .character 로 주인공 정보가 들어오면 신규 폼에 반영.
  const payloadHandled = useRef(false)
  useEffect(() => {
    if (payloadHandled.current || !payload) return
    payloadHandled.current = true
    const proto =
      (typeof payload.protagonist === 'string' && payload.protagonist) ||
      (payload.character && typeof payload.character === 'object' && typeof (payload.character as Record<string, unknown>).name === 'string'
        ? String((payload.character as Record<string, unknown>).name) : '')
    if (proto) startNewFor(proto)
    else if (payload.reroll) startNewGen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null); setCustom((prev) => prev.map((c) => ({ ...c, value: '' }))); setEtc('') }
  const startNewFor = (protagonist: string) => { setEditing({ ...emptyForm(), id: newId(), protagonist }); setOpenId(null); setConfirmDel(null); setCustom((prev) => prev.map((c) => ({ ...c, value: '' }))); setEtc(''); setNote(`주인공 ‘${protagonist}’의 거울로 적대자를 설계합니다`) }
  const startNewGen = () => { setEditing(genAntagonist(emptyForm(), {})); setOpenId(null); setConfirmDel(null); setCustom((prev) => prev.map((c) => ({ ...c, value: '' }))); setEtc('') }
  const startEdit = (a: Antagonist) => { setEditing({ ...a, checks: { ...a.checks } }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  // 사용자 정의 항목 추가/변경/삭제. 무작위로 채우지 않고 사용자가 직접 적는다.
  const addCustom = () => {
    const raw = window.prompt('추가할 항목 이름을 입력하세요 (예: 출신, 말버릇, 트라우마)')
    const label = (raw || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 무작위 조합(전체) — 편집 중이면 잠긴 슬롯/주인공/메모 유지하며 채운다.
  // 사용자 정의 항목의 '값'과 '기타'는 비우되(미리 만든 데이터 없음), 항목(이름) 정의는 유지한다.
  const rollAll = () => {
    setEditing((prev) => {
      const base = prev || { ...emptyForm(), id: newId() }
      return genAntagonist(base, locked)
    })
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }
  // 단일 슬롯만 다시.
  const rollSlot = (k: SlotKey) => setEditing((prev) => (prev ? { ...prev, [k]: pick(SLOT[k]) as string } : prev))
  const rollTier = () => setEditing((prev) => (prev ? { ...prev, tier: pick(TIERS).key } : prev))
  const rollName = () => setEditing((prev) => (prev ? { ...prev, name: randName() } : prev))
  const toggleLock = (k: SlotKey | 'tier' | 'name') => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.name.trim()) e.name = '이름 미정 적대자'
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => (prev.some((c) => c.id === e.id) ? prev.map((c) => (c.id === e.id ? e : c)) : [...prev, e]))
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  // 사이드바 순서 변경(HTML5 DnD).
  const onListDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((c) => c.id === from)
      const ti = prev.findIndex((c) => c.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  const toggleCheck = (qid: string) => {
    if (editing) { setEditing({ ...editing, checks: { ...editing.checks, [qid]: !editing.checks[qid] } }); return }
    if (!openId) return
    setList((prev) => prev.map((c) => (c.id === openId ? { ...c, checks: { ...c.checks, [qid]: !c.checks[qid] } } : c)))
  }

  // 클립보드 복사(폴백 포함).
  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setNote(label) }
    const fallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
      } catch { if (mounted.current) setNote('복사 실패') }
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback)
      else fallback()
    } catch { fallback() }
  }

  // 좌측 바인더 인물 파일 드롭 → 주인공으로 받아 거울 설계 시작.
  const onBinderDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const protoName = item.character?.name?.trim() || item.title?.trim() || ''
    if (!protoName) { setNote('드롭한 항목에서 인물 이름을 찾지 못했어요'); return }
    startNewFor(protoName)
  }

  // 사용자 정의 항목(값이 있는 것) + 기타(값이 있을 때)를 fields 맵에 합친다.
  // 키 = 라벨 그대로 → 인물 시트·라이브러리 등 다른 도구에 그대로 나타난다.
  const mergeExtras = (base: Record<string, string>): Record<string, string> => {
    const f = { ...base }
    for (const c of custom) {
      const label = c.label.trim()
      const val = c.value.trim()
      if (label && val) f[label] = val
    }
    if (etc.trim()) f.etc = etc.trim()
    return f
  }
  // 사용자 정의·기타를 사람이 읽는 텍스트 줄로 변환(복사/요약 보강용).
  const extrasLines = (): string[] => {
    const out: string[] = []
    for (const c of custom) {
      const label = c.label.trim()
      const val = c.value.trim()
      if (label && val) out.push(`· ${label}: ${val}`)
    }
    if (etc.trim()) out.push(`· 기타: ${etc.trim()}`)
    return out
  }

  // 인물 라이브러리 저장.
  const toLibrary = (a: Antagonist) => {
    const c: Partial<SharedCharacter> = {
      name: a.name || '이름 미정 적대자',
      role: '적대자',
      goal: a.goal,
      personality: a.belief,
      secret: a.weakness,
      notes: [a.method && `방법: ${a.method}`, a.mirror && `거울: ${a.mirror}`, a.notes].filter(Boolean).join('\n'),
      traits: [
        { k: '위협 등급', v: `${tierDef(a.tier).label} (${tierDef(a.tier).scope})` },
        ...(a.protagonist ? [{ k: '거울 기준 주인공', v: a.protagonist }] : []),
      ],
      fields: mergeExtras(toCharacterCanonical(a)),
      source: '적대자 설계기',
    }
    addToLibrary('characters', c)
    setNote('인물 라이브러리에 적대자를 저장했어요')
  }

  // 프로젝트(자료 › 인물)에 적대자 카드 추가.
  const toProject = (a: Antagonist) => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다'); return }
    const t = tierDef(a.tier)
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: a.name || '이름 미정 적대자',
      character: mergeExtras({ ...toCharacterFields(a), ...toCharacterCanonical(a) }),
      bodyHtml: bodyHtml(a),
      synopsis: summarize(a),
      meta: { 역할: '적대자', 위협등급: t.label, 주인공: a.protagonist || '—' },
    })
    setNote(id ? '프로젝트 ‘자료 › 인물’에 적대자 카드를 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((c) => c.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="😈" /></span>
        <strong style={{ fontSize: 15 }}>적대자 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}명 저장됨</span>
        <span style={{ flex: 1 }} />
        {note && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{note}</span>}
        <button className="minibtn" onClick={() => copyText(list.map(exportText).join('\n\n———\n\n'), '전체 복사됨')} disabled={list.length === 0} title="모든 적대자를 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 적대자</button>
      </div>

      <div style={body}>
        {/* 사이드바: 저장 목록 + 인물 드롭 수용 */}
        <div
          style={{ ...sidebar, outline: dropHot ? '2px dashed var(--accent)' : 'none', outlineOffset: -2 }}
          onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) } }}
          onDragLeave={() => { if (dropHot) setDropHot(false) }}
          onDrop={onBinderDrop}
        >
          {list.length === 0 ? (
            <div style={empty}>
              아직 설계한 적대자가 없어요.<br />위쪽 <b>＋ 새 적대자</b>로 시작하거나<br />
              <b><Emoji e="🎲" /> 무작위 조합</b>으로 영감을 얻으세요.<br /><br />
              <span style={{ fontSize: 11.5 }}>좌측 바인더의 <b>인물 파일</b>을 이 영역에<br />끌어다 놓으면 그 인물을<br /><b>주인공</b>으로 받아 거울 적대자를 설계합니다.</span>
            </div>
          ) : (
            <div style={listArea}>
              {list.map((a, i) => {
                const active = a.id === openId || (editing && editing.id === a.id)
                const t = tierDef(a.tier)
                const cnt = DIAG_Q.filter((q) => a.checks[q.id]).length
                return (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={() => { dragId.current = a.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== a.id) setDragOver(a.id) }}
                    onDragLeave={() => { if (dragOver === a.id) setDragOver(null) }}
                    onDrop={() => onListDrop(a.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(a.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === a.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--panel)' : 'var(--paper)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || '(이름 미정)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <span title={t.hint}><Emoji e={t.icon} /> {t.label}</span>
                      <span>·</span>
                      <span style={{ color: cnt === DIAG_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{DIAG_Q.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(a) }} title="수정"><Emoji e="✏️" /></button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(a.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === a.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 적대자를 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(a.id) }}>삭제</button>
                          <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </div>
                      </div>
                    )}
                    <button className="minibtn" style={{ width: '100%', marginTop: 4, padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); copyText(exportText(a), '복사됨') }} title="이 적대자 텍스트 복사"><Emoji e="📋" /> 복사</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 메인: 폼(설계/수정) · 상세 · 안내 */}
        <div style={main}>
          {editing ? (
            <FormView
              editing={editing} setEditing={setEditing}
              locked={locked} toggleLock={toggleLock}
              rollAll={rollAll} rollSlot={rollSlot} rollTier={rollTier} rollName={rollName}
              toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit}
              custom={custom} addCustom={addCustom} setCustomValue={setCustomValue} removeCustom={removeCustom}
              etc={etc} setEtc={setEtc}
            />
          ) : opened ? (
            <DetailView
              a={opened} onEdit={() => startEdit(opened)}
              toggleCheck={toggleCheck}
              onCopy={() => { const ex = extrasLines(); copyText(ex.length ? exportText(opened) + '\n' + ex.join('\n') : exportText(opened), '복사됨') }}
              onLibrary={() => toLibrary(opened)} onProject={() => toProject(opened)}
              onSheet={() => { openToolLinked('character-sheet', { character: { ...toCharacterFields(opened), fields: mergeExtras(toCharacterCanonical(opened)) } }); setNote('인물 시트로 보냈어요') }}
            />
          ) : (
            <div style={empty}>
              왼쪽에서 적대자를 고르거나<br /><b>＋ 새 적대자</b>로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12, lineHeight: 1.8 }}>
                좋은 적대자는 <b>자기 이야기의 주인공</b>입니다.<br />
                목표 · 신념(자기정당화) · 방법 · 약점,<br />그리고 <b>주인공과의 거울 대칭</b>으로 설계하세요.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 설계/수정 폼 ──
function FormView(props: {
  editing: Antagonist
  setEditing: (a: Antagonist) => void
  locked: Partial<Record<SlotKey | 'tier' | 'name', boolean>>
  toggleLock: (k: SlotKey | 'tier' | 'name') => void
  rollAll: () => void
  rollSlot: (k: SlotKey) => void
  rollTier: () => void
  rollName: () => void
  toggleCheck: (qid: string) => void
  onSave: () => void
  onCancel: () => void
  custom: { id: string; label: string; value: string }[]
  addCustom: () => void
  setCustomValue: (id: string, value: string) => void
  removeCustom: (id: string) => void
  etc: string
  setEtc: (v: string) => void
}) {
  const { editing, setEditing, locked, toggleLock, rollAll, rollSlot, rollTier, rollName, toggleCheck, onSave, onCancel, custom, addCustom, setCustomValue, removeCustom, etc, setEtc } = props
  const set = (k: keyof Antagonist, v: string) => setEditing({ ...editing, [k]: v })
  const checkedCnt = DIAG_Q.filter((q) => editing.checks[q.id]).length
  const preview = summarize(editing)

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 48, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 12 }
  const lockBtn = (k: SlotKey | 'tier' | 'name') => (
    <button className="minibtn" title={locked[k] ? '잠금해제(무작위에서 보호)' : '잠금(무작위에서 보호)'} onClick={() => toggleLock(k)} style={{ padding: '0 5px', color: locked[k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
  )
  const rollBtn = (fn: () => void) => (<button className="minibtn" title="이 항목만 무작위" onClick={fn} style={{ padding: '0 5px' }}><Emoji e="🎲" /></button>)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '적대자 수정' : '새 적대자 설계'}</strong>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
        <button className="minibtn" onClick={rollAll} title="잠긴 항목은 유지한 채 전체 무작위 조합"><Emoji e="🎲" /> 무작위 조합</button>
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      {/* 이름 + 주인공 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ ...field, flex: 1, minWidth: 200 }}>
          <div style={label}><Emoji e="😈" /> 적대자 이름/호칭 {lockBtn('name')} {rollBtn(rollName)}</div>
          <input style={input} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 잿빛 심판관, 박원장" maxLength={60} />
        </div>
        <div style={{ ...field, flex: 1, minWidth: 200 }}>
          <div style={label}><Emoji e="🫅" /> 주인공 (거울의 기준)</div>
          <input style={input} value={editing.protagonist} onChange={(e) => set('protagonist', e.target.value)} placeholder="누구의 적인가요? 예: 형사 도윤" maxLength={60} />
        </div>
      </div>

      {/* 핵심 5슬롯 */}
      {ROWS.map((r) => (
        <div key={r.k} style={field}>
          <div style={label}><Emoji e={r.icon} /> {r.label} {lockBtn(r.k)} {rollBtn(() => rollSlot(r.k))}</div>
          <textarea style={area} value={editing[r.k]} onChange={(e) => set(r.k, e.target.value)} placeholder={`예) ${SLOT[r.k][0]}`} maxLength={400} />
        </div>
      ))}

      {/* 위협 등급 */}
      <div style={field}>
        <div style={label}>위협 등급 (이야기에 가하는 압박) {lockBtn('tier')} {rollBtn(rollTier)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {TIERS.map((t) => (
            <button
              key={t.key}
              className={'minibtn' + (editing.tier === t.key ? ' active' : '')}
              onClick={() => set('tier', t.key)}
              style={{ borderColor: editing.tier === t.key ? 'var(--accent)' : 'var(--border)', background: editing.tier === t.key ? 'var(--panel)' : undefined }}
              title={t.hint}
            ><Emoji e={t.icon} /> {t.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e={tierDef(editing.tier).icon} /> {tierDef(editing.tier).scope} — {tierDef(editing.tier).hint}</div>
      </div>

      {/* 한 줄 요약 미리보기 */}
      <div style={{ padding: 12, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 한 줄 요약 (미리보기)</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{preview}</div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={area} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="등장 방식, 주인공과의 대결 구도, 결말에서의 패배/구원 등" maxLength={600} />
      </div>

      {/* 사용자 정의 항목 — 직접 라벨을 만들어 자유롭게 적는다(무작위 생성 안 함). */}
      <div style={field}>
        <div style={{ ...label, justifyContent: 'space-between' }}>
          <span><Emoji e="🧩" /> 사용자 정의 항목</span>
          <button className="minibtn" onClick={addCustom} title="새 항목을 직접 추가합니다">＋ 항목 추가</button>
        </div>
        {custom.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>＋ 항목 추가로 원하는 항목(출신·말버릇·트라우마 등)을 직접 만들어 적을 수 있어요. 추가한 항목은 인물 시트·라이브러리·프로젝트로도 함께 전달됩니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {custom.map((c) => (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emojify(c.label)}</span>
                  <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ padding: '0 6px', color: 'var(--warn)' }}>✕</button>
                </div>
                <textarea style={area} value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder={`${c.label}을(를) 직접 적어 주세요`} maxLength={600} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 고정 '기타' 자유 입력 — 항상 보임, 기본 비어 있음. */}
      <div style={field}>
        <div style={label}><Emoji e="🗃️" /> 기타 (자유 입력)</div>
        <textarea style={{ ...area, minHeight: 80 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="어디에도 들어가지 않는 자유로운 메모를 충분히 적어 두세요" maxLength={2000} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔎" /> 구조 점검 (입체적 빌런 진단)</span>
          <span style={{ fontSize: 11, color: checkedCnt === DIAG_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{DIAG_Q.length}</span>
        </div>
        <DiagList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  a: Antagonist
  onEdit: () => void
  toggleCheck: (qid: string) => void
  onCopy: () => void
  onLibrary: () => void
  onProject: () => void
  onSheet: () => void
}) {
  const { a, onEdit, toggleCheck, onCopy, onLibrary, onProject, onSheet } = props
  const linked = hasProjectBridge()
  const t = tierDef(a.tier)
  const checkedCnt = DIAG_Q.filter((q) => a.checks[q.id]).length

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const rowS: React.CSSProperties = { marginBottom: 10 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const dash = <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{a.name || '(이름 미정)'}</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }} title={t.hint}><Emoji e={t.icon} /> {t.label}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCopy} title="이 적대자를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--accent)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 한 줄 요약</div>
        <div style={{ fontSize: 14, lineHeight: 1.65, fontWeight: 500 }}>{summarize(a)}</div>
      </div>

      {a.protagonist.trim() && <div style={rowS}><div style={label}><Emoji e="🫅" /> 주인공 (거울 기준)</div><div style={valS}>{emojify(a.protagonist)}</div></div>}
      <div style={rowS}><div style={label}><Emoji e="🎯" /> 목표(핵심 욕망)</div><div style={valS}>{a.goal ? emojify(a.goal) : dash}</div></div>
      <div style={rowS}><div style={label}><Emoji e="⚖️" /> 신념·자기정당화</div><div style={valS}>{a.belief ? emojify(a.belief) : dash}</div></div>
      <div style={rowS}><div style={label}><Emoji e="🩸" /> 방법</div><div style={valS}>{a.method ? emojify(a.method) : dash}</div></div>
      <div style={rowS}><div style={label}><Emoji e="🩹" /> 약점</div><div style={valS}>{a.weakness ? emojify(a.weakness) : dash}</div></div>
      <div style={rowS}><div style={label}><Emoji e="🪞" /> 주인공과의 거울 대칭</div><div style={valS}>{a.mirror ? emojify(a.mirror) : dash}</div></div>
      <div style={rowS}><div style={label}><Emoji e={t.icon} /> 위협 등급</div><div style={valS}>{t.label} · {t.scope}<div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.hint}</div></div></div>
      {a.notes.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 메모</div><div style={valS}>{emojify(a.notes)}</div></div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔎" /> 구조 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === DIAG_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{DIAG_Q.length}</span>
        </div>
        <DiagList checks={a.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          망설여지는 항목이 곧 보강할 지점입니다. 특히 <b>자기정당화</b>와 <b>거울 대칭</b>이 흐릿하면 적대자가 단순한 장애물로 머뭅니다.
        </div>
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ marginTop: 16, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={onProject} disabled={!linked} title={linked ? '자료 › 인물 폴더에 적대자 카드 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={onSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={onLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
      </div>
    </div>
  )
}

// ── 구조 점검 체크리스트 ──
function DiagList(props: { checks: Record<string, boolean>; toggle: (qid: string) => void }) {
  const { checks, toggle } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {DIAG_Q.map((q) => {
        const on = !!checks[q.id]
        return (
          <label
            key={q.id}
            title={q.tip}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (on ? 'var(--ok)' : 'var(--border)'),
              background: on ? 'var(--panel)' : 'var(--paper)',
            }}
          >
            <input type="checkbox" checked={on} onChange={() => toggle(q.id)} style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: 'var(--ok)', cursor: 'pointer' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--muted)' }}>{q.q}</span>
              <span style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--muted)' }}>{q.tip}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
