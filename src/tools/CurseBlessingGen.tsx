// 저주·축복 생성기(조합형) — 서두×대상×효과×조건×해제법×봉인 슬롯을 무작위로 굴려
//   저주 / 축복 / 계약 한 편을 만들어 마법·운명 소재로 쓴다.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(잠금/모드/즐겨찾기)만 사용.
// 연계(linkbus): 생성한 주문(들)을 스니펫 라이브러리에 저장 + 프로젝트 자료 〈영감 메모〉 폴더에 문서로 추가.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'curse-blessing-gen', name: '저주·축복 생성기', icon: '🪄', group: '영감·발상', intro: '서두·대상·효과·조건·해제법·봉인 슬롯을 굴려 저주·축복·계약을 만드세요', w: 540, h: 660 }

const LS = 'sry:tool:curse-blessing-gen'

// ---------- 조사 헬퍼 ----------
// 한국어 받침 유무에 따라 조사를 골라 붙인다. "을(를)" 같은 괄호 이중표기를 절대 노출하지 않는다.
const hasFinalConsonant = (word: string): boolean => {
  const ch = word.charCodeAt(word.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (ch - 0xac00) % 28 !== 0
}
// 와/과 (예: 대상와(과) → 대상과 / 대상와)
const gwa = (word: string): string => word + (hasFinalConsonant(word) ? '과' : '와')

// ---------- 모드(저주 / 축복 / 계약) ----------
type ModeKey = 'curse' | 'blessing' | 'pact'
interface TplParts { opener: string; target: string; effect: string; cond: string; undo: string; seal: string }
interface Mode {
  key: ModeKey
  label: string
  icon: string
  // 한 줄 주문을 엮는 템플릿.
  template: (p: TplParts) => string
}
const MODES: Mode[] = [
  {
    key: 'curse', label: '저주', icon: '🩸',
    template: (p) => `${p.opener} ${p.target}에게 저주를 내리노라. ${p.effect} 다만 ${p.cond}, 그때에야 ${p.undo} 비로소 풀리리라. ${p.seal}`,
  },
  {
    key: 'blessing', label: '축복', icon: '🌟',
    template: (p) => `${p.opener} ${p.target}에게 축복을 내리노라. ${p.effect} 그러나 ${p.cond}, ${p.undo} 그 은총은 사그라들리라. ${p.seal}`,
  },
  {
    key: 'pact', label: '계약', icon: '📜',
    template: (p) => `${p.opener} ${gwa(p.target)} 계약을 맺노라. ${p.effect} 그 대가로 ${p.cond}, ${p.undo}만이 이 계약을 무를 수 있노라. ${p.seal}`,
  },
]

// ---------- 슬롯 풀(서두 × 대상 × 효과 × 조건 × 해제법 × 봉인) ----------
// 효과/조건/해제법은 모드별로 결이 다르므로 모드별 풀을 둔다. 서두·대상·봉인은 공용.
interface SlotDef { key: SlotKey; label: string; icon: string }
type SlotKey = 'opener' | 'target' | 'effect' | 'cond' | 'undo' | 'seal'
const SLOTS: SlotDef[] = [
  { key: 'opener', label: '서두', icon: '📯' },
  { key: 'target', label: '대상', icon: '🎯' },
  { key: 'effect', label: '효과', icon: '✨' },
  { key: 'cond', label: '조건', icon: '⚖️' },
  { key: 'undo', label: '해제법', icon: '🔑' },
  { key: 'seal', label: '봉인', icon: '🕯️' },
]

// 서두(공용) — 주문을 여는 호명/선언. 문법상 독립된 도입부라 어느 모드·대상과도 자연스럽게 결합한다.
const OPENERS = [
  '하늘과 땅을 증인으로 삼아 이르노니,', '오래된 말로 선언하노니,', '잊힌 신들의 이름으로 명하노니,',
  '첫 새벽의 빛 아래 새기노니,', '깊은 밤의 침묵을 빌려 말하노니,', '세 갈래 바람을 불러 고하노니,',
  '꺼지지 않는 불 앞에서 맹세하노니,', '흐르는 강물에 띄워 보내노니,', '돌에 새겨 영원히 남기노니,',
  '바다 끝에서 메아리치게 하노니,', '달이 차오르는 이 밤에 봉하노니,', '재가 된 옛 서약을 딛고 이르노니,',
  '북녘의 별을 우러러 청하노니,', '문턱과 문턱 사이에서 명하노니,', '거울 너머의 이름으로 부르노니,',
  '뿌리 깊은 나무에 기대어 고하노니,', '천 년을 잠든 봉인을 깨워 이르노니,', '서리 내린 새벽에 약속하노니,',
  '핏줄을 따라 흐르게 하노니,', '안개가 길을 지운 자리에서 명하노니,', '종소리가 멎은 순간에 선포하노니,',
  '잿빛 까마귀를 사자로 삼아 전하노니,', '가장 낮은 곳의 진실로 맹세하노니,', '일곱 문을 지나 이르노니,',
  '이름 없는 별의 빛으로 새기노니,', '꿈과 생시의 경계에서 고하노니,', '마지막 촛농이 떨어지기 전에 이르노니,',
  '땅속 깊이 잠든 약속을 깨워 명하노니,', '바람에 흩어지지 않을 말로 선언하노니,', '두 세계가 맞닿은 자리에서 봉하노니,',
  '오래 침묵하던 입을 열어 이르노니,', '눈 감은 신상 앞에서 청하노니,', '깨어진 거울의 조각마다 새기노니,',
  '먼 천둥을 증인 삼아 선포하노니,', '시들지 않는 화관을 걸고 맹세하노니,', '잊지 못할 이 밤의 이름으로 명하노니,',
  '검은 잉크가 마르기 전에 새기노니,', '대를 잇는 약속으로 봉하노니,', '저무는 해의 마지막 빛으로 이르노니,',
  '아무도 듣지 못할 낮은 목소리로 고하노니,',
]

// 대상(공용)
const TARGETS = [
  '이름을 부른 자', '피를 흘린 가문', '약속을 어긴 왕', '거울을 들여다본 아이', '문지방을 넘은 이방인',
  '마지막 등불을 끈 자', '서약을 깨뜨린 기사', '죽은 자의 물건을 탐낸 자', '달 없는 밤에 태어난 아이',
  '신의 이름을 거짓으로 부른 사제', '일곱 번째 자식', '도둑맞은 왕관을 쓴 자', '잠든 숲을 짓밟은 자',
  '바다에 침을 뱉은 뱃사람', '약속의 반지를 잃은 연인', '스승을 배신한 제자', '울지 않는 신부',
  '그림자를 판 상인', '이 글을 읽는 자', '대를 이어 내려온 핏줄', '문장(紋章)을 더럽힌 후손',
  '남의 무덤을 파헤친 도굴꾼', '거짓 증언으로 사람을 죽인 판관', '제 자식을 버린 어미', '신탁을 비웃은 학자',
  '성물을 훔쳐 판 도둑', '맹세의 술잔을 엎은 군주', '국경의 비석을 옮긴 자', '굶주린 손님을 내쫓은 주인',
  '불 꺼진 화로를 떠난 파수꾼', '죽은 연인을 되살리려 한 마법사', '왕의 이름을 흉내 낸 광대', '봉인된 책을 펼친 사서',
  '제 그림자를 두려워하는 폭군', '약초를 독으로 바꾼 의원', '강물의 흐름을 막은 영주', '잠든 용을 깨운 사냥꾼',
  '거짓 점괘를 판 점쟁이', '동족의 피로 칼을 적신 전사', '은혜를 원수로 갚은 종', '별을 훔치려 한 어린 마녀',
  '맹인을 속여 길을 잃게 한 안내인', '천 년 묵은 약속을 깬 사제왕', '제 이름을 세 번 부정한 배교자', '죽은 이의 얼굴을 빌린 둔갑술사',
  '마지막 씨앗을 불태운 농부', '신부를 두 번 버린 사내',
  '제 그림자를 밟고 도망친 겁쟁이', '신성한 샘에 독을 푼 마녀', '죽은 왕의 자리를 빼앗은 섭정',
]

// 봉인(공용) — 주문을 닫는 선언/봉인 문구. 문법상 독립된 마무리라 어느 모드·내용과도 충돌하지 않는다.
const SEALS = [
  '이로써 봉인하노라.', '말한 대로 이루어지리라.', '거두는 자는 없으리라.', '이 말은 돌이킬 수 없으리라.',
  '하늘이 듣고, 땅이 새기리라.', '바람이 이 말을 실어 나르리라.', '세월도 이 약속을 지우지 못하리라.',
  '그 누구도 이 매듭을 풀지 못하리라.', '별이 떨어져도 이 말은 남으리라.', '재가 되어도 그 뜻은 살아 있으리라.',
  '이 약속에 거짓은 없노라.', '들은 자는 증인이 되리라.', '봉한 입을 다시 열 자 없으리라.',
  '이 말씀은 강물처럼 흐르리라.', '끝의 끝까지 효력을 잃지 않으리라.', '돌에 새긴 듯 변치 않으리라.',
  '잊는 자에게도 잊히지 않으리라.', '낮과 밤을 가리지 않고 이어지리라.', '그림자조차 이 말을 따르리라.',
  '시작과 끝이 하나로 묶이노라.', '이 봉인은 피로써 지켜지리라.', '약속은 약속으로 남으리라.',
  '천지가 뒤집혀도 흔들리지 않으리라.', '마지막 숨까지 함께하리라.', '이 글자는 영영 마르지 않으리라.',
  '듣지 못한 자에게도 닿으리라.', '문을 닫고, 열쇠를 던지노라.', '이름이 곧 증표가 되리라.',
  '이로써 매듭은 단단히 묶였노라.', '꺼지지 않는 불처럼 이어지리라.', '말은 곧 법이 되리라.',
  '이 약속을 어기는 자에게 화가 있으리라.', '침묵조차 이 말을 거역하지 못하리라.', '한 번 새긴 것은 영원히 남으리라.',
  '하늘의 별만큼 오래 가리라.', '되돌리려는 손은 재가 되리라.', '이 말씀에 끝은 없노라.',
  '깨어 있는 자도, 잠든 자도 알게 되리라.', '봉인 위에 봉인을 더하노라.', '이로써 모든 말을 마치노라.',
]

// 모드별 풀
const POOLS: Record<ModeKey, { effect: string[]; cond: string[]; undo: string[] }> = {
  curse: {
    effect: [
      '거울에 비친 제 얼굴을 영영 알아보지 못하리라.', '사랑하는 이의 이름을 입에 담는 순간 잊게 되리라.',
      '잠들 때마다 가장 두려워하는 죽음을 다시 겪으리라.', '그가 흘린 눈물은 모두 핏물로 변하리라.',
      '거짓을 말할 때마다 손가락 하나씩 돌이 되리라.', '그가 사랑하면 그 대상은 반드시 시들어 죽으리라.',
      '낮의 기억은 밤마다 깨끗이 지워지리라.', '그의 그림자가 제 뜻대로 움직여 그를 배신하리라.',
      '먹는 음식은 모두 재의 맛이 나리라.', '거울도, 물도, 그 누구의 눈동자도 그를 비추지 않으리라.',
      '그가 부른 노래는 듣는 이를 슬픔에 잠기게 하리라.', '나이를 거꾸로 먹어 끝내 아이로 사라지리라.',
      '한 해에 하루씩 가장 소중한 기억을 잃으리라.', '그가 만지는 모든 꽃은 검게 타들어 가리라.',
      '잠들면 깨지 못하고, 깨면 잠들지 못하리라.', '그의 입에서 나온 약속은 모두 거짓이 되어 부서지리라.',
      '그의 그림자는 갈수록 짧아져 마침내 사라지리라.', '거울 속의 제 모습이 먼저 늙어 가는 것을 지켜보리라.',
      '그가 부르는 이름은 모두 입속에서 재가 되리라.', '발길이 닿는 길마다 안개가 그를 가두리라.',
      '그가 쓴 글자는 마르기도 전에 스스로 지워지리라.', '한밤중에 제 이름을 부르는 목소리에 시달리리라.',
      '가장 따뜻한 불 앞에서도 끝없이 추위를 느끼리라.', '그가 웃을 때마다 가까운 이 하나가 등을 돌리리라.',
      '잠든 사이 누군가 그의 얼굴을 조금씩 바꾸어 가리라.', '그의 발자국은 뒤따르는 자에게만 보이리라.',
      '말하려는 진실은 늘 거짓으로 뒤바뀌어 나오리라.', '그가 손에 쥔 것은 모래처럼 새어 나가리라.',
      '거울을 볼 때마다 낯선 얼굴이 그를 마주 보리라.', '그가 아끼던 물건은 하나씩 스스로 부서지리라.',
      '꿈에서 본 길은 깨어나면 모두 막다른 골목이 되리라.', '그의 목소리는 가까운 이에게만 들리지 않으리라.',
      '그가 심은 것은 무엇이든 뿌리째 말라 죽으리라.', '거리에서 마주치는 모두가 그를 처음 보는 듯 굴리라.',
      '밤마다 잃어버린 것을 찾아 헤매다 새벽을 맞으리라.', '그가 만진 물은 손이 닿는 순간 흐려지리라.',
      '제 그림자가 들려주는 거짓말을 진실로 믿게 되리라.', '한 걸음 내디딜 때마다 지난 한 가지를 잊으리라.',
      '그가 부르는 노랫말은 모두 슬픈 결말로 끝나리라.', '거울 없이는 제 모습을 단 한 번도 떠올리지 못하리라.',
      '그의 그림자는 햇빛 아래에서만 그를 떠나려 하리라.', '잠들 때마다 하루씩 어려져 끝내 갓난아이로 돌아가리라.',
      '그가 사랑한다 말하면 그 말이 곧 이별의 신호가 되리라.', '손끝에 닿는 모든 글씨가 알 수 없는 문자로 변하리라.',
      '그가 지나간 자리에는 늘 차가운 그늘만 남으리라.', '거울 속 그림자가 그보다 한 박자 늦게 움직이리라.',
      '가장 기쁜 날에도 까닭 모를 눈물이 멈추지 않으리라.', '그가 외운 모든 이름은 사흘이면 머릿속에서 흩어지리라.',
    ],
    cond: [
      '같은 죄를 진 자에게 진심으로 용서를 빌 때', '제 손으로 가장 아끼던 것을 불태울 때',
      '거짓 없이 일곱 밤을 울며 참회할 때', '저주를 내린 자의 무덤에 백 송이 꽃을 심을 때',
      '제가 해친 이의 후손을 목숨 걸고 구할 때', '달이 세 번 차고 기우는 동안 침묵을 지킬 때',
      '제 이름을 스스로 영원히 버릴 때', '한 번도 사랑한 적 없는 이를 진정으로 사랑할 때',
      '제가 빼앗은 것을 두 배로 갚을 때', '죽음 앞에서 진실만을 고백할 때',
      '제가 무너뜨린 집을 제 손으로 다시 세울 때', '가장 미워하던 원수의 상처를 손수 싸맬 때',
      '한겨울 맨발로 천 리 길을 걸어 사죄할 때', '제가 흘린 피만큼의 자비를 낯선 이에게 베풀 때',
      '평생 모은 재물을 가난한 이들에게 모두 나눌 때', '제 손으로 끊었던 인연을 다시 잇기 위해 무릎 꿇을 때',
      '거짓으로 얻은 이름을 사람들 앞에서 스스로 벗을 때', '한 해 동안 단 한 마디 거짓도 입에 담지 않을 때',
      '제가 외면했던 약한 이를 끝까지 지켜낼 때', '버려두었던 무덤을 찾아 손수 흙을 덮을 때',
      '제 손으로 깨뜨린 약속을 늦게나마 끝내 지킬 때', '가장 두려워하던 진실을 사람들 앞에 털어놓을 때',
      '빼앗은 자리를 본래 주인에게 돌려주고 물러설 때', '제 잘못으로 다친 이의 짐을 평생 대신 질 때',
      '한 점 거짓도 없이 제 죄를 글로 적어 남길 때', '미워하던 마음을 내려놓고 먼저 손을 내밀 때',
      '제가 태운 것과 똑같은 것을 새로 길러 바칠 때', '잊고 살던 옛 은인을 찾아 빚을 갚을 때',
      '제 욕심으로 막았던 길을 다시 열어 줄 때', '죽어 가는 이를 위해 제 몫의 시간을 내어 줄 때',
      '한 번도 베푼 적 없는 자비를 원수에게 베풀 때', '제 이름을 건 맹세를 끝까지 저버리지 않을 때',
      '버린 자식을 찾아 무릎 꿇고 용서를 구할 때', '제가 더럽힌 우물을 맑아질 때까지 손수 퍼낼 때',
      '거짓 증언으로 해친 이의 누명을 스스로 벗겨 줄 때', '평생 외면하던 신 앞에 진심으로 무릎 꿇을 때',
      '제 손으로 빼앗은 노래를 본래 주인에게 돌려줄 때', '한 해 내내 매일 한 가지 선행을 거르지 않을 때',
      '제가 떠나보낸 이의 자리를 평생 비워 둘 때', '가장 아끼던 비밀을 끝내 사람들 앞에 내려놓을 때',
    ],
    undo: [
      '아무 대가도 바라지 않는 누군가의 입맞춤으로', '제 피로 쓴 진실한 참회의 글로',
      '잊혔던 옛 이름을 다시 불러줌으로', '제가 흘리게 한 눈물만큼의 눈물을 대신 흘려줌으로',
      '저주받은 줄도 모르고 베푼 낯선 이의 친절로', '스스로 목숨을 내어 다른 생명을 살림으로',
      '깨진 약속을 끝내 지켜냄으로', '제 손으로 깨뜨린 거울을 다시 맞춰 붙임으로',
      '한 번도 사랑받지 못한 이가 건넨 진심 어린 위로로', '천 리 밖에서 찾아온 옛 벗의 변치 않은 우정으로',
      '제 이름을 모르는 아이가 무심코 건넨 손길로', '버려졌던 무덤에 누군가 몰래 피워 둔 등불로',
      '원수의 자식이 베푼 뜻밖의 자비로', '가장 추운 밤 낯선 이가 내어 준 한 자락 온기로',
      '잊혔던 자장가를 끝까지 불러 준 누군가의 목소리로', '대가 없이 흘려보낸 단 한 방울의 진실한 눈물로',
      '제가 버린 자가 끝내 거두어들인 용서로', '이름조차 남기지 않은 은인의 마지막 선행으로',
      '깨어진 거울 조각을 하나하나 주워 모은 정성으로', '오래 미뤄 둔 사죄를 늦게나마 전한 진심으로',
      '아무도 보지 않는 곳에서 베푼 한 번의 친절로', '잃어버린 줄도 몰랐던 것을 되찾아 준 손길로',
      '제 몫을 기꺼이 내어 준 가난한 이의 베풂으로', '미워하던 이가 끝내 건넨 진심 어린 화해로',
      '죽어 가는 이를 위해 밤새 지킨 누군가의 기도로', '한 번도 갚지 못한 빚을 대신 갚아 준 마음으로',
      '제가 끊은 인연을 다시 이어 준 누군가의 용기로', '버려졌던 노래를 다시 불러 준 어린아이의 목소리로',
      '돌려받기를 바라지 않고 내어 준 단 한 번의 도움으로', '먼 길을 돌아와 끝내 지켜 낸 약속으로',
      '제가 외면했던 이가 끝내 내민 화해의 손길로', '한 번도 본 적 없는 후손이 대신 치른 속죄로',
      '버려진 사당에 누군가 다시 밝힌 향불로', '제가 빼앗은 노래를 되찾아 불러 준 목소리로',
      '아무도 모르게 흘려보낸 진심 어린 기도로', '오래 미워했던 형제가 끝내 건넨 포옹으로',
      '제 잘못을 알면서도 감싸 준 어린아이의 믿음으로', '죽어 가는 원수가 마지막으로 베푼 용서로',
      '잊혔던 무덤을 찾아 손수 풀을 뽑아 준 정성으로', '제가 끊어 낸 핏줄이 다시 내민 손으로',
    ],
  },
  blessing: {
    effect: [
      '그가 심은 씨앗은 무엇이든 사흘이면 열매를 맺으리라.', '그의 말 한마디면 다친 짐승도 일어서리라.',
      '어떤 상처도 그의 손길 아래 흉터 없이 아물리라.', '그가 가는 길에는 길 잃은 자가 없으리라.',
      '그의 노래는 굳은 마음도 녹이리라.', '그가 잠든 곳에는 어떤 악몽도 깃들지 못하리라.',
      '그가 흘린 눈물은 메마른 땅을 적시는 샘이 되리라.', '거짓말하는 자는 그 앞에서 입을 다물게 되리라.',
      '그가 부르면 잃었던 것이 제 발로 돌아오리라.', '그의 미소를 본 자는 그날의 슬픔을 잊으리라.',
      '그가 머무는 집에는 굶주림이 들지 못하리라.', '그가 내민 손을 잡은 자는 결코 길에서 죽지 않으리라.',
      '그가 읽은 책의 지혜는 결코 잊히지 않으리라.', '그의 곁에서는 시든 꽃도 다시 피어나리라.',
      '그가 약속하면 하늘도 그 말을 지키리라.', '그가 용서하면 그 죄는 흔적조차 남지 않으리라.',
      '그가 건넨 말은 듣는 이의 두려움을 잠재우리라.', '그의 발길이 닿은 마른 땅에서 샘이 솟으리라.',
      '그가 안아 준 아이는 평생 길을 잃지 않으리라.', '그의 등불은 가장 깊은 밤에도 꺼지지 않으리라.',
      '그가 지나간 들판에는 이듬해 곱절의 곡식이 자라리라.', '그의 이름을 부른 자는 그날 하루 안녕하리라.',
      '그가 끓인 한 그릇은 굶주린 백 사람을 먹이리라.', '그의 손이 닿은 악기는 스스로 고운 소리를 내리라.',
      '그가 다독인 마음에는 다시 미움이 깃들지 못하리라.', '그가 심은 나무는 백 년을 마르지 않고 자라리라.',
      '그의 곁에서 잠든 자는 잊었던 좋은 꿈을 되찾으리라.', '그가 건넨 물 한 모금이 병든 이를 일으키리라.',
      '그가 길을 물으면 바람이 방향을 일러 주리라.', '그의 따뜻한 말은 얼어붙은 강도 녹이리라.',
      '그가 거둔 아이들은 평생 서로를 형제로 여기리라.', '그가 머문 자리에는 늘 은은한 향기가 남으리라.',
      '그의 기도는 가장 먼 곳의 외로운 이에게도 닿으리라.', '그가 쓴 편지는 받는 이의 마음을 어루만지리라.',
      '그가 다스리는 땅에는 흉년이 들지 못하리라.', '그의 손을 거친 상처는 더 단단한 살로 아물리라.',
      '그가 부른 비는 메마른 골짜기마다 고루 내리리라.', '그의 눈길이 머문 어린 짐승은 두려움을 잊으리라.',
      '그가 건넨 한 송이 꽃은 시들지 않고 향을 잃지 않으리라.', '그가 잠재운 분노는 다시 타오르지 못하리라.',
      '그가 어루만진 흉터는 더는 아프지 않으리라.', '그의 발자국이 남은 길은 누구도 길을 잃지 않으리라.',
      '그가 지켜본 씨앗은 가뭄에도 끝내 싹을 틔우리라.', '그의 웃음을 들은 갓난아이는 평생 잘 웃으리라.',
      '그가 내어 준 자리는 늘 가장 따뜻한 곳이 되리라.', '그의 손에 들린 등불은 길 잃은 배를 항구로 이끌리라.',
      '그가 거둔 곡식은 나누어도 줄지 않으리라.', '그가 베푼 친절은 일곱 사람을 거쳐 다시 그에게 돌아오리라.',
    ],
    cond: [
      '제 이익을 위해 그 힘을 단 한 번이라도 쓸 때', '받은 은총을 누구에게도 나누지 않을 때',
      '교만하여 제 힘이 제 것이라 믿을 때', '약한 자의 부탁을 외면할 때',
      '거짓으로 그 능력을 자랑할 때', '대가를 바라고 손을 내밀 때',
      '두려움에 못 이겨 그 힘을 감출 때', '한 번이라도 복수를 위해 그 힘을 휘두를 때',
      '베푼 일을 두고두고 생색낼 때', '제 행운을 당연한 권리로 여길 때',
      '받은 복을 혼자만 누리려 문을 닫아걸 때', '도움을 청하는 손을 귀찮다며 뿌리칠 때',
      '제 이름을 높이려 남의 공을 가로챌 때', '약속을 가벼이 여겨 손쉽게 저버릴 때',
      '굶주린 이를 곁에 두고 제 배만 채울 때', '받은 친절을 당연하게 여겨 고마움을 잊을 때',
      '제 힘을 자랑하려 일부러 위태로운 자를 만들 때', '베풀 수 있으면서도 인색하게 손을 움츠릴 때',
      '진실을 알면서도 침묵으로 약한 이를 저버릴 때', '제 안위를 위해 동행을 길에 버려둘 때',
      '받은 만큼 돌려줄 수 있는데도 등을 돌릴 때', '남의 슬픔을 구경거리로 삼아 웃을 때',
      '제 손에 쥔 것을 끝내 한 줌도 내려놓지 않을 때', '도움을 받고도 그 은혜를 끝내 모른 척할 때',
      '약속한 자리에 끝끝내 나타나지 않을 때', '제 잘못을 약한 이에게 떠넘겨 벌하게 할 때',
      '베푼 손길에 보답을 강요하며 빚으로 삼을 때', '제 행운을 빌미로 남을 깔보고 멸시할 때',
      '곤경에 빠진 벗을 모른 체 지나칠 때', '받은 지혜를 제 잇속을 위해서만 쓸 때',
      '가진 것을 잃을까 두려워 끝내 나누지 못할 때', '약한 자의 몫까지 욕심내어 가로챌 때',
      '진심 어린 사죄를 끝내 받아 주지 않을 때', '제 편이 아니라는 이유로 도움을 거둘 때',
      '베풂을 자랑 삼아 사람들 앞에서 떠벌릴 때', '받은 복을 운이 아니라 제 능력이라 우길 때',
      '가난한 이의 눈물을 못 본 척 지나칠 때', '제 손해를 꺼려 마땅한 정의를 외면할 때',
      '도움을 미루고 미루다 끝내 때를 놓칠 때', '베풀 마음 없이 마지못해 손을 내밀 때',
    ],
    undo: [
      '잊었던 겸손을 되찾아 무릎 꿇음으로', '받은 만큼을 아낌없이 되돌려줌으로',
      '제 이름 없이 베푼 단 한 번의 선행으로', '교만을 인정하고 진심으로 뉘우침으로',
      '가장 미워하던 이를 먼저 용서함으로', '제 행운을 가장 불운한 이에게 양보함으로',
      '대가 없는 사랑을 다시 배움으로', '받은 축복을 일곱 사람에게 흘려보냄으로',
      '닫아걸었던 문을 다시 활짝 열어 줌으로', '뿌리쳤던 손을 찾아가 다시 맞잡음으로',
      '가로챈 공을 본래 주인에게 돌려줌으로', '저버린 약속을 늦게나마 끝내 지켜냄으로',
      '제 몫을 덜어 굶주린 이를 먹임으로', '잊었던 고마움을 진심으로 다시 전함으로',
      '위태로운 이를 제 손으로 끝까지 지켜냄으로', '움츠렸던 손을 펴 아낌없이 베풂으로',
      '침묵으로 저버린 진실을 용기 내어 밝힘으로', '길에 버려둔 동행을 되돌아가 거두어 옴으로',
      '돌렸던 등을 다시 돌려 손을 내밂으로', '비웃었던 슬픔에 진심으로 함께 울어 줌으로',
      '쥐고 있던 것을 한 줌 기꺼이 내려놓음으로', '모른 척했던 은혜에 뒤늦게라도 보답함으로',
      '어긴 약속의 자리로 끝내 돌아옴으로', '약한 이에게 떠넘긴 잘못을 제 것으로 인정함으로',
      '빚으로 삼았던 베풂을 대가 없이 돌려줌으로', '멸시했던 이에게 진심으로 머리를 숙임으로',
      '지나쳤던 벗에게 되돌아가 손을 내밂으로', '제 잇속으로만 쓰던 지혜를 모두와 나눔으로',
      '잃을까 두려워 움켜쥔 것을 기꺼이 풀어놓음으로', '가로챈 몫을 약한 이에게 곱절로 돌려줌으로',
      '외면했던 가난한 이의 끼니를 평생 챙겨 줌으로', '생색냈던 베풂을 조용히 다시 이어 감으로',
      '깔보았던 이에게 먼저 다가가 벗이 되어 줌으로', '받은 복을 헤아려 그 곱절을 세상에 흘려보냄으로',
      '구경거리 삼았던 슬픔에 진심으로 손을 보탬으로', '빚으로 삼았던 친절을 흔쾌히 없던 일로 함으로',
      '제 행운을 운이라 인정하고 겸손히 감사함으로', '약한 이의 몫을 끝까지 지켜 돌려줌으로',
      '늦었던 도움을 한달음에 달려가 채워 줌으로', '마지못해 내밀던 손을 진심으로 다시 잡아 줌으로',
    ],
  },
  pact: {
    effect: [
      '원하는 단 하나의 소원이 반드시 이루어지리라.', '죽음조차 그대를 데려가지 못하리라.',
      '그대의 적은 그대 앞에서 힘을 잃으리라.', '그대가 손대는 것은 무엇이든 황금이 되리라.',
      '그대는 모든 언어와 짐승의 말을 알아듣게 되리라.', '그대의 모습은 늙지도 변하지도 않으리라.',
      '그대는 한 번 본 것을 결코 잊지 않으리라.', '그대가 바라는 자의 마음을 마음대로 얻으리라.',
      '그대의 칼은 어떤 갑옷도 가르리라.', '그대는 한 번의 죽음을 무를 권리를 얻으리라.',
      '그대는 미래의 한 자락을 꿈으로 엿보리라.', '그대의 상처는 해가 뜨면 모두 아물리라.',
      '그대의 말 한마디로 사람들의 발길을 멈추게 하리라.', '그대는 어떤 자물쇠 앞에서도 문이 열리리라.',
      '그대가 부르면 잠든 바람도 깨어나 따르리라.', '그대는 한 해에 단 하루, 죽은 이와 말을 나누리라.',
      '그대의 그림자는 그대를 위해 대신 싸우리라.', '그대는 어떤 독도 그대를 해치지 못하리라.',
      '그대가 디딘 자리에서는 길이 저절로 열리리라.', '그대는 거짓을 한눈에 꿰뚫어 보게 되리라.',
      '그대의 한 마디는 천 사람의 마음을 움직이리라.', '그대는 불 속에서도 머리카락 한 올 그을리지 않으리라.',
      '그대가 쓴 글은 읽는 모든 이를 사로잡으리라.', '그대는 잃어버린 것이 어디 있는지 늘 알게 되리라.',
      '그대의 발걸음은 가장 깊은 물 위에서도 가라앉지 않으리라.', '그대는 단 한 번, 시간을 하루 되돌릴 수 있으리라.',
      '그대의 눈은 어둠 속에서도 대낮처럼 보게 되리라.', '그대는 어떤 맹세도 거짓인지 단번에 알아채리라.',
      '그대의 손에 들린 무기는 결코 부러지지 않으리라.', '그대는 가장 높은 탑도 단숨에 오르게 되리라.',
      '그대가 청하면 가장 사나운 짐승도 무릎을 꿇으리라.', '그대는 한 사람의 운명을 단 한 번 바꿀 수 있으리라.',
      '그대의 목소리는 가장 먼 곳에서도 또렷이 들리리라.', '그대는 어떤 병도 그대를 오래 붙들지 못하리라.',
      '그대가 잠들면 원하는 곳 어디로든 꿈으로 갈 수 있으리라.', '그대는 적의 다음 한 수를 미리 보게 되리라.',
      '그대의 약속은 듣는 모두를 절로 믿게 만들리라.', '그대는 단 한 번, 죽은 자를 하루 동안 불러내리라.',
      '그대가 디딘 땅에서는 메마른 샘도 다시 솟으리라.', '그대는 어떤 거짓 얼굴도 진짜를 가리지 못하리라.',
      '그대의 이름을 들은 적은 싸우기도 전에 물러서리라.', '그대는 가장 깊은 상처도 하룻밤이면 잊게 되리라.',
      '그대가 손을 들면 폭풍도 잠시 숨을 죽이리라.', '그대는 한 번 약속한 일을 결코 어기지 못하게 되리라.',
      '그대의 발자취는 쫓는 자의 눈에서 사라지리라.', '그대는 어떤 미로에서도 출구를 찾아내리라.',
      '그대가 거둔 재물은 손에서 쉬 흩어지지 않으리라.', '그대는 단 하루, 누구의 모습으로도 변할 수 있으리라.',
    ],
    cond: [
      '첫아이의 이름을 부르는 권리를 내게 넘길 것', '그대 목소리를 영원히 내게 바칠 것',
      '칠 년마다 가장 아끼는 것을 하나씩 내게 줄 것', '그대 그림자를 담보로 맡길 것',
      '죽는 날 그대 영혼을 내게 거둘 것', '평생 단 한 사람에게도 진실을 말하지 못할 것',
      '보름달마다 내 이름을 일곱 번 부를 것', '그대 가장 행복한 기억 하나를 내게 팔 것',
      '내가 청할 때 단 한 번 무엇이든 거절하지 못할 것', '그대 자손이 같은 계약을 이어 맺을 것',
      '평생 그대 얼굴이 거울에 비치지 않게 둘 것', '해마다 가장 사랑하는 이의 이름 하나를 잊을 것',
      '죽는 날까지 그대 웃음소리를 내게 맡길 것', '평생 단 한 곳, 고향 땅을 다시 밟지 못할 것',
      '그대 눈물 한 방울도 다시는 흘리지 못할 것', '내가 부르면 한밤중이라도 곧장 달려올 것',
      '그대 이름을 스스로 입에 담지 못할 것', '칠 년에 한 번 하루를 통째로 내게 바칠 것',
      '그대 첫사랑의 기억을 영영 내게 넘길 것', '평생 별빛 아래에서는 잠들지 못할 것',
      '그대 노래를 다시는 사람들 앞에서 부르지 못할 것', '죽는 날 그대 무덤을 내가 정하게 둘 것',
      '평생 단 한 가지 거짓말도 들키지 않게 할 것', '내가 보낸 자를 결코 문전에서 돌려보내지 못할 것',
      '그대 그림자가 늘 나를 향하게 둘 것', '해마다 가장 귀한 보물을 하나씩 강에 흘려보낼 것',
      '평생 누구의 사랑도 끝까지 믿지 못하게 될 것', '그대 마지막 숨을 내가 거두게 둘 것',
      '내가 묻는 말에 단 한 번도 거짓을 답하지 못할 것', '평생 그대 진짜 이름을 누구에게도 알리지 못할 것',
      '칠 년마다 가장 가까운 벗 하나와 멀어질 것', '그대 손으로 직접 같은 계약을 또 권하게 될 것',
      '평생 단 하루도 온전히 행복하지 못할 것', '내가 잠들 때 그대도 함께 잠들어야 할 것',
      '그대 가문의 문장을 내 표식으로 바꿔 걸 것', '죽는 날까지 내 이름을 입 밖에 내지 못할 것',
      '평생 같은 꿈을 매일 밤 되풀이해 꿀 것', '그대 가장 깊은 비밀을 내게 모두 털어놓을 것',
      '내가 청하는 단 하나의 부탁을 끝내 들어줄 것', '평생 그대 손으로 맺은 어떤 약속도 깨지 못할 것',
    ],
    undo: [
      '내 진짜 이름을 알아내어 부르는 일', '계약서를 불태우고 그 재를 강에 흘려보내는 일',
      '나보다 더 큰 빚을 내게 지우는 일', '대신 계약을 떠맡을 다른 영혼을 데려오는 일',
      '바친 것과 똑같은 것을 일곱 배로 되찾아 오는 일', '계약을 맺은 그 자리에서 다시 만나 무릎 꿇리는 일',
      '한 점 사심 없는 누군가의 희생', '내가 가장 두려워하는 단 하나의 진실',
      '내가 잃어버린 옛 이름을 되찾아 돌려주는 일', '내 봉인이 새겨진 거울을 산산이 깨뜨리는 일',
      '나조차 풀지 못한 오래된 수수께끼를 풀어내는 일', '내가 한 번도 받아 본 적 없는 진심 어린 용서',
      '계약의 첫 글자를 적은 깃펜을 되찾아 부러뜨리는 일', '나를 옭아맨 더 오래된 계약을 끝내 밝혀내는 일',
      '바친 그림자를 본래 임자에게 되돌려 붙이는 일', '내가 단 한 번도 이긴 적 없는 내기에서 나를 꺾는 일',
      '계약의 증인이 된 별이 다시 같은 자리에 뜨는 일', '내가 두려워하는 단 하나의 이름을 면전에서 외치는 일',
      '바친 목소리를 노래로 되돌려 내 귀에 들려주는 일', '나를 만든 더 큰 손의 인장을 찾아내는 일',
      '내가 거둔 영혼을 모두 제 발로 떠나보내는 일', '봉인된 계약서를 한 글자도 빠짐없이 거꾸로 읽는 일',
      '내가 잊고 싶은 단 하나의 죄를 사람들 앞에 들추는 일', '바친 기억을 고스란히 되찾아 내 앞에 펼쳐 보이는 일',
      '나와 똑같은 계약을 맺은 자를 찾아 함께 무를 일', '내가 결코 건너지 못하는 강 너머로 나를 부르는 일',
      '계약을 맺던 밤의 달을 다시 그 자리에 띄우는 일', '내가 가장 아끼던 것을 되찾아 내게 돌려주는 일',
      '나조차 거역하지 못하는 더 높은 이름을 빌려 오는 일', '내가 한 번도 흘려 본 적 없는 진짜 눈물을 흘리게 하는 일',
      '내가 첫 계약을 새긴 돌비석을 찾아 깨뜨리는 일', '나를 옭아맨 주문을 한 글자도 틀리지 않고 거꾸로 외는 일',
      '내가 가장 두려워하는 빛 속으로 나를 끌어내는 일', '바친 첫아이의 이름을 도로 불러 그 권리를 되찾는 일',
      '내가 천 년 전 잃은 심장을 찾아 되돌려 주는 일', '나조차 답하지 못한 마지막 질문에 끝내 답하는 일',
      '계약의 잉크에 쓰인 진짜 피의 주인을 밝혀내는 일', '내가 봉인한 문을 연 적 없는 열쇠로 여는 일',
      '나를 부린 더 오래된 주인의 이름을 면전에서 외치는 일', '내가 거둔 모든 약속을 한날한시에 스스로 풀게 하는 일',
    ],
  },
}

const SLOT_VALUES = (mode: ModeKey, key: SlotKey): string[] => {
  if (key === 'opener') return OPENERS
  if (key === 'target') return TARGETS
  if (key === 'seal') return SEALS
  return POOLS[mode][key]
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 조합수: 서두 × 대상 × 효과 × 조건 × 해제법 × 봉인
function combos(mode: ModeKey): number {
  const p = POOLS[mode]
  return OPENERS.length * TARGETS.length * p.effect.length * p.cond.length * p.undo.length * SEALS.length
}
const fmt = (n: number) => n.toLocaleString('ko-KR')

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface SlotState { opener: string; target: string; effect: string; cond: string; undo: string; seal: string }
const emptySlots = (): SlotState => ({ opener: '', target: '', effect: '', cond: '', undo: '', seal: '' })

const composeText = (mode: Mode, s: SlotState): string =>
  mode.template({ opener: s.opener, target: s.target, effect: s.effect, cond: s.cond, undo: s.undo, seal: s.seal })

interface Fav { id: string; mode: ModeKey; slots: SlotState; text: string }

export default function CurseBlessingGen({ payload }: { payload?: Record<string, unknown> }) {
  const initMode: ModeKey =
    payload && typeof payload.mode === 'string' && MODES.some((m) => m.key === payload.mode)
      ? (payload.mode as ModeKey)
      : (() => {
          try {
            const raw = localStorage.getItem(LS + ':mode')
            if (raw && MODES.some((m) => m.key === raw)) return raw as ModeKey
          } catch { /* ignore */ }
          return 'curse'
        })()

  const [mode, setMode] = useState<ModeKey>(initMode)
  const [slots, setSlots] = useState<SlotState>(emptySlots)
  const [locked, setLocked] = useState<Record<SlotKey, boolean>>({ opener: false, target: false, effect: false, cond: false, undo: false, seal: false })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<'gen' | 'fav'>('gen')
  const [favs, setFavs] = useState<Fav[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((f) => f && typeof f.text === 'string').map((f) => ({
            id: typeof f.id === 'string' ? f.id : 'f_' + Math.random().toString(36).slice(2),
            mode: MODES.some((m) => m.key === f.mode) ? f.mode : 'curse',
            slots: { opener: '', target: '', effect: '', cond: '', undo: '', seal: '', ...(f.slots || {}) },
            text: String(f.text),
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const toastTimer = useRef<number | null>(null)

  // 모드 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':mode', mode) } catch { /* ignore */ }
  }, [mode])

  // 즐겨찾기 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 토스트 자동 해제 + 언마운트 정리
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 모드를 바꾸면 효과/조건/해제법 풀이 달라지므로 잠기지 않은 칸은 비운다(서두·대상·봉인은 공용이라 유지).
  const switchMode = (m: ModeKey) => {
    if (m === mode) return
    setMode(m)
    setSlots((prev) => ({
      opener: prev.opener,
      target: prev.target,
      effect: locked.effect ? prev.effect : '',
      cond: locked.cond ? prev.cond : '',
      undo: locked.undo ? prev.undo : '',
      seal: prev.seal,
    }))
    setCopied(false)
  }

  const roll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    setSlots((prev) => {
      const next: SlotState = { ...prev }
      ;(['opener', 'target', 'effect', 'cond', 'undo', 'seal'] as SlotKey[]).forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 칸은 유지
        const pool = SLOT_VALUES(mode, k)
        let v = pick(pool)
        if (v === prev[k] && pool.length > 1) v = pick(pool) // 같은 값 연속 방지
        next[k] = v
      })
      return next
    })
  }, [mode, locked])

  const rerollOne = (k: SlotKey) => {
    setCopied(false)
    setRolling(true)
    setSlots((prev) => {
      const pool = SLOT_VALUES(mode, k)
      let v = pick(pool)
      if (v === prev[k] && pool.length > 1) v = pick(pool)
      return { ...prev, [k]: v }
    })
  }

  const toggleLock = (k: SlotKey) => setLocked((prev) => ({ ...prev, [k]: !prev[k] }))

  const modeObj = MODES.find((m) => m.key === mode)!
  const ready = !!(slots.opener && slots.target && slots.effect && slots.cond && slots.undo && slots.seal)
  const text = ready ? composeText(modeObj, slots) : ''

  const plainBlock = () =>
    [
      `${modeObj.icon} ${modeObj.label}`,
      `📯 서두: ${slots.opener}`,
      `🎯 대상: ${slots.target}`,
      `✨ 효과: ${slots.effect}`,
      `⚖️ 조건: ${slots.cond}`,
      `🔑 해제법: ${slots.undo}`,
      `🕯️ 봉인: ${slots.seal}`,
      '',
      `📜 ${text}`,
    ].join('\n')

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(plainBlock()).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장 — 영감 메모로 재사용.
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: `[${modeObj.label}] ${text}`,
      source: '저주·축복 생성기',
      tags: ['글감', '마법', '운명', modeObj.label],
    })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 즐겨찾기(보관함) 추가
  const addFav = () => {
    if (!ready) return
    setFavs((prev) => [
      { id: 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), mode, slots: { ...slots }, text },
      ...prev,
    ])
    flash('보관함에 추가했습니다.')
  }
  const removeFav = (id: string) => setFavs((prev) => prev.filter((f) => f.id !== id))
  const restoreFav = (f: Fav) => {
    setMode(f.mode)
    setSlots({ ...f.slots })
    setLocked({ opener: false, target: false, effect: false, cond: false, undo: false, seal: false })
    setTab('gen')
    setCopied(false)
  }

  // 프로젝트 연동 — 생성한 주문을 자료(research)/〈영감 메모〉 폴더에 문서로 추가.
  const bodyHtml = (m: Mode, s: SlotState, t: string) =>
    [
      `<p style="font-size:15px;line-height:1.7;"><b>${esc(m.icon)} ${esc(t)}</b></p>`,
      `<hr/>`,
      `<p><b>📯 서두:</b> ${esc(s.opener)}</p>`,
      `<p><b>🎯 대상:</b> ${esc(s.target)}</p>`,
      `<p><b>✨ 효과:</b> ${esc(s.effect)}</p>`,
      `<p><b>⚖️ 조건:</b> ${esc(s.cond)}</p>`,
      `<p><b>🔑 해제법:</b> ${esc(s.undo)}</p>`,
      `<p><b>🕯️ 봉인:</b> ${esc(s.seal)}</p>`,
    ].join('')

  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `${modeObj.icon} ${modeObj.label} — ${slots.target}`,
      bodyHtml: bodyHtml(modeObj, slots, text),
      synopsis: text,
      meta: { 유형: modeObj.label, 대상: slots.target },
    })
    flash(id ? '프로젝트 자료 〈영감 메모〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const total = combos(mode)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>서두·대상·효과·조건·해제법·봉인</b> 슬롯을 굴려 <b>저주·축복·계약</b> 한 편을 만드세요. 마음에 드는 칸은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴릴 수 있습니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🪄"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('fav')} aria-pressed={tab === 'fav'}
          style={{ borderColor: tab === 'fav' ? 'var(--accent)' : 'var(--border)', color: tab === 'fav' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({favs.length})
        </button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 모드 선택 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {MODES.map((m) => {
              const on = m.key === mode
              return (
                <button key={m.key} className="minibtn" onClick={() => switchMode(m.key)} aria-pressed={on}
                  style={{ flex: 1, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                  <Emoji e={m.icon}/> {m.label}
                </button>
              )
            })}
          </div>

          {/* 조합수 */}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 {modeObj.label} 조합: <b style={{ color: 'var(--accent)' }}>{fmt(total)}</b>가지
          </div>

          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((sl) => {
              const isLocked = !!locked[sl.key]
              const val = slots[sl.key]
              return (
                <div key={sl.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                    <Emoji e={sl.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sl.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: val ? 'var(--text)' : 'var(--muted)' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rerollOne(sl.key)} title="이 칸만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(sl.key)} title={isLocked ? '고정 해제' : '이 칸 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성된 주문 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="📜"/> {modeObj.label}문</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: ready ? 'var(--text)' : 'var(--muted)' }}>
              {ready ? text : '슬롯을 굴려 주문을 완성하세요.'}
            </div>
          </div>

          {/* 동작 버튼 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={roll}><Emoji e="🎲"/> 굴리기 / 다시 섞기</button>
            <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={addFav} disabled={!ready} style={{ flex: 1 }}><Emoji e="⭐"/> 보관함에 담기</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!ready} style={{ flex: 1 }} title="스니펫 라이브러리에 저장"><Emoji e="🧷"/> 스니펫 저장</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !ready ? '먼저 주문을 완성하세요' : '생성한 주문을 프로젝트 자료(영감 메모 폴더)에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>

          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
          <div style={hint}>주문은 출발점일 뿐입니다. 같은 조합도 내 세계관·인물에 맞춰 자유롭게 비틀어 보세요.</div>
        </>
      )}

      {tab === 'fav' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {favs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 주문이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관함에 담기를 눌러 모아보세요.</span>
            </div>
          )}
          {favs.map((f) => {
            const m = MODES.find((x) => x.key === f.mode)!
            return (
              <div key={f.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                    <Emoji e={m.icon}/> {m.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => restoreFav(f)} title="생성 탭으로 불러오기">↩ 불러오기</button>
                  <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(`[${m.label}] ${f.text}`).catch(() => { /* graceful */ }); flash('복사했습니다.') }} title="복사"><Emoji e="📋"/></button>
                  <button className="minibtn" onClick={() => removeFav(f.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{f.text}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🎯"/> {f.slots.target}</div>
              </div>
            )
          })}
          {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
        </div>
      )}
    </div>
  )
}
