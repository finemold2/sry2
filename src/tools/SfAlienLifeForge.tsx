// 외계 생명 생성기 — 생화학기반×형태×감각×사회성×지능×의사소통×서식지×인간과의 관계 8개 슬롯의
// 로컬 표를 조합해 SF·과학소설용 외계 생명체를 무작위로 빚어낸다(수백억 가지 조합).
// 자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 외 import 없음.
// Math.random + localStorage(잠금/현재 결과 저장)만 사용. 스니펫·프로젝트(세계관) 저장 지원.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sf-alien-life-forge', name: '외계 생명 생성기', icon: '👽', group: '생성기', genre: 'SF·과학소설', intro: '생화학기반·형태·감각·사회성·지능·의사소통·인간관계를 조합해 외계 생명을 빚으세요', w: 540, h: 680 }

// 슬롯 정의 — 각 슬롯은 라벨·아이콘·후보 표(faces)를 가진다.
interface Slot { key: string; label: string; icon: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'biochem', label: '생화학 기반', icon: '🧪',
    faces: [
      '탄소-물 기반(지구형이나 좌선성 아미노산을 쓴다)',
      '실리콘-탄소 혼성 골격에 황산 용매를 쓴다',
      '암모니아를 물 대신 용매로 삼는 저온 생화학',
      '메탄·에테인 호수에서 사는 극저온 액화탄화수소 대사',
      '황화수소를 산소처럼 들이마시는 환원성 호흡계',
      '암석의 화학에너지만 먹는 무기영양 화학합성 생물',
      '체내에 광합성 공생체를 길러 햇빛을 직접 먹는다',
      '방사선을 멜라닌으로 흡수해 에너지로 바꾼다',
      '플라스마 자기장 속 전하 패턴으로만 존재하는 비물질 생명',
      '결정 격자에 정보를 새기며 자라는 규산염 생명',
      '초임계 이산화탄소를 혈액처럼 순환시킨다',
      '체액이 액체 금속(수은·갈륨)이라 전기를 직접 다룬다',
      '얼음 결정 사이 염수 통로에서만 대사하는 빙저 생명',
      '과산화수소를 부동액 삼아 영하에서도 얼지 않는다',
      '불소 화학을 기반으로 산화불소를 들이마신다',
      '나노 규모 자기조립 분자가 군집해 한 개체를 이룬다',
      '대사 없이 외부 열원의 온도 차로만 움직이는 열기관 생명',
      '두 개의 독립된 게놈이 한 세포에 공존하는 이중유전체',
      '비단백질 RNA 유사 가닥으로만 정보를 저장한다',
      '체내에서 핵융합 미세반응을 일으켜 스스로 빛을 낸다',
    ],
  },
  {
    key: 'morphology', label: '형태', icon: '🐙',
    faces: [
      '방사대칭의 다섯 갈래 몸, 어느 쪽이든 앞이 된다',
      '연체동물처럼 골격 없이 흐르며 틈으로 스며든다',
      '키틴질 외골격에 마디진 여섯 다리와 두 쌍의 더듬이',
      '거대한 단일 세포가 사람만 한 크기로 부푼 아메바형',
      '수백 개의 작은 개체가 한 군체로 헤엄치는 사이펀형',
      '나무처럼 뿌리를 내리고도 천천히 걸어 다니는 보행 식물',
      '기체주머니로 떠다니는 풍선형, 촉수를 늘어뜨린다',
      '거울 대칭이 깨진 비대칭 몸으로 한쪽이 크게 발달했다',
      '몸의 절반이 투명해 내부 장기가 그대로 비친다',
      '필요할 때 여러 부분으로 흩어졌다 다시 합쳐지는 군집체',
      '바퀴처럼 몸을 말아 굴러 이동하는 환형 생물',
      '깃털 같은 섬모로 뒤덮여 공기 중 입자를 거른다',
      '두 개의 머리가 번갈아 깨어 쉼 없이 활동한다',
      '액체 상태와 고체 상태를 오가며 형태를 바꾼다',
      '거대한 한 장의 막처럼 펼쳐져 지면을 덮는다',
      '내부에 작은 위성 개체들을 품고 다니는 모선형 몸',
      '결정질 외피가 자라며 평생 부피가 늘기만 한다',
      '뼈 대신 가압된 수압으로 몸을 지탱하는 유체골격',
      '날개와 지느러미와 다리가 모두 같은 부속지의 변형이다',
      '몸 표면 전체가 눈·입·귀의 기능을 동시에 한다',
      '성장 단계마다 전혀 다른 생물처럼 탈바꿈한다',
      '거대한 단일 신경다발이 식물처럼 가지를 뻗은 형태',
      '자기 부상으로 지면에서 살짝 떠 미끄러진다',
      '몸을 둘로 쪼개도 각각이 온전한 개체로 자란다',
      '평소엔 먼지처럼 흩어졌다 위협 시 단단히 뭉친다',
      '거울처럼 빛나는 금속 피부로 주변을 반사한다',
    ],
  },
  {
    key: 'senses', label: '감각', icon: '👁️',
    faces: [
      '자외선·적외선까지 보는 사극(四極) 색각을 가진다',
      '눈이 없고 온몸으로 전기장의 미세한 일그러짐을 읽는다',
      '박쥐처럼 초음파를 쏘아 어둠 속 형태를 그린다',
      '자기장을 보는 감각으로 행성의 자북을 항상 안다',
      '냄새 분자 하나까지 구별해 과거의 흔적을 시간순으로 읽는다',
      '온도의 미세한 차이를 색처럼 선명하게 지각한다',
      '땅의 진동만으로 수 킬로 밖 발걸음을 식별한다',
      '편광을 감지해 매끄러운 표면의 굴절을 본다',
      '중력의 방향과 세기를 직접 느끼는 균형 감각',
      '주변 생물의 심장박동을 전기적으로 엿듣는다',
      '시간의 흐름 자체를 인간보다 수십 배 느리게 체감한다',
      '소리를 색으로, 빛을 소리로 뒤섞어 받아들인다(공감각)',
      '기압과 습도의 변화로 날씨를 며칠 전에 안다',
      '방사선의 세기를 통증처럼 또렷이 느낀다',
      '동족의 감정을 페로몬으로 직접 들이마신다',
      '한 번에 360도 전 방향을 동시에 지각한다',
      '극히 느린 화학 변화—녹과 부패—를 실시간으로 본다',
      '먼 별빛의 적색편이를 눈으로 분별한다',
      '물체의 질량과 밀도를 손대지 않고 가늠한다',
      '자기 몸 바깥 수 미터까지를 피부처럼 느낀다',
      '소리의 메아리로 빈 공간의 부피를 정확히 잰다',
      '생체 전기로 거짓과 긴장을 거의 틀림없이 읽는다',
      '빛이 전혀 없는 환경에 적응해 발광 신호로만 본다',
      '꿈이나 수면 중 타자의 뇌파 잔향을 희미하게 받는다',
    ],
  },
  {
    key: 'sociality', label: '사회성', icon: '🐜',
    faces: [
      '하나의 여왕 정신을 중심으로 한 초개체 군집',
      '완전한 단독 생활, 번식기에만 잠깐 마주친다',
      '셋이 한 조를 이뤄야 온전히 기능하는 삼인일조 사회',
      '나이 든 개체에게 기억을 통째로 물려주는 계승 사회',
      '평생 한 짝과 신경계를 부분적으로 잇고 산다',
      '계급도 지도자도 없는 완전한 수평적 합의제',
      '필요할 때 수천이 한 마음으로 융합했다 흩어진다',
      '둥지를 공유하나 서로 거의 무관심한 느슨한 군락',
      '경쟁 없이 자원을 끊임없이 나누는 증여 경제',
      '강한 위계와 의례로 질서를 유지하는 카스트 사회',
      '개체가 죽으면 기억을 공동 저장소에 업로드한다',
      '서로 다른 두 종이 한 사회를 이루는 공생 문명',
      '유년·성년·노년이 전혀 다른 역할의 별개 계급이다',
      '거짓말이 생리적으로 불가능해 모두가 투명하다',
      '주기적으로 사회 전체를 해체했다 새로 조직한다',
      '한 개체가 곧 한 가문이자 한 도시인 거대 단독자',
      '갈등을 의례적 결투가 아닌 합동 명상으로 푼다',
      '낯선 자를 무조건 환대하는 손님 우선 규범',
      '집단 전체가 한 번에 같은 꿈을 공유하며 잔다',
      '세대 간 빚과 약속을 수백 년간 기억해 갚는다',
      '개인의 이름이 없고 맡은 역할로만 불린다',
      '번식 가능한 소수와 불임의 다수로 나뉜 진사회성',
    ],
  },
  {
    key: 'intelligence', label: '지능', icon: '🧠',
    faces: [
      '개체는 단순하나 군집 전체로는 천재적인 분산 지능',
      '논리보다 패턴과 직관으로 사고하는 비선형 지성',
      '과거·현재·미래를 한 덩어리로 인식하는 비시간적 사고',
      '도구를 쓰지 않지만 몸 자체를 정교하게 변형해 문제를 푼다',
      '수학과 음악을 같은 언어로 다루는 추상 지능',
      '개체 지능은 낮으나 수억 년 진화로 본능에 지혜가 새겨졌다',
      '거짓·은유·허구를 이해 못 하는 철저한 문자적 사고',
      '한 번 배운 것은 종 전체가 즉시 공유하는 집단 학습',
      '자의식이 없는 듯하나 놀랍도록 정밀한 무의식적 설계자',
      '꿈속에서 깨어 있을 때보다 더 깊이 사고한다',
      '감정을 계산처럼, 논리를 감정처럼 다루는 역전된 인지',
      '죽음을 모르기에 수천 년 단위로 계획을 세운다',
      '한 가지 문제에 평생을 거는 극단적 단일 집중형',
      '여러 자아가 한 몸에서 토론하며 결정하는 다중정신',
      '인과를 거꾸로—결과에서 원인으로—추론하는 사고',
      '언어 이전의 직접적 개념 전달로 사고하는 전(前)언어 지성',
      '망각을 못 해 모든 것을 영원히 기억하는 부담을 진다',
      '추상적 진리보다 구체적 관계만을 진리로 여긴다',
      '자신을 끊임없이 재설계하는 자기개조형 지능',
      '느리지만 결코 같은 실수를 두 번 하지 않는다',
    ],
  },
  {
    key: 'communication', label: '의사소통', icon: '🔊',
    faces: [
      '피부 색소를 실시간으로 바꿔 그림처럼 말한다',
      '냄새 분자의 조합으로 문장을 짓는 화학 언어',
      '인간 가청 범위 밖의 초저주파로 수 킬로를 가로질러 말한다',
      '발광 패턴의 깜빡임으로 모스 부호 같은 빛 언어를 쓴다',
      '전기장의 파형을 변조해 직접 신경에 신호를 보낸다',
      '진동을 땅으로 흘려보내 발밑으로 듣는 지진 언어',
      '온도 무늬를 몸에 띄워 적외선으로만 읽히는 메시지',
      '자기장의 미세한 떨림으로 침묵 속에 대화한다',
      '춤과 몸짓의 정교한 안무가 곧 완결된 문장이다',
      '서로의 몸 일부를 잠시 융합해 기억을 직접 건넨다',
      '한 단어가 문맥에 따라 수백 뜻을 갖는 극단적 다의어',
      '소리·빛·냄새를 동시에 겹쳐 한 번에 여러 층을 말한다',
      '말이 곧 행동이라 거짓 약속을 입에 담지 못한다',
      '노래 한 곡에 종족의 역사 전체를 압축해 전한다',
      '침묵의 길이와 간격 자체가 의미를 지닌다',
      '페로몬으로 감정을, 진동으로 사실을 따로 나눠 전한다',
      '상대의 이름을 부를 때마다 새 이름을 즉석에서 짓는다',
      '문자가 없고 모든 지식을 운율에 실어 구전한다',
      '거리에 따라 전혀 다른 언어 체계로 갈아 쓴다',
      '한 번 한 말은 결정처럼 굳어 물리적 기록으로 남는다',
      '뜻이 아니라 감정의 정확한 강도만을 전달한다',
      '두 개체가 동시에 말해야 한 문장이 완성된다',
      '극도로 느려, 한 문장을 며칠에 걸쳐 천천히 발화한다',
      '빛의 편광 방향을 돌려 비밀 메시지를 겹쳐 보낸다',
    ],
  },
  {
    key: 'habitat', label: '서식지', icon: '🪐',
    faces: [
      '두 항성을 도는 행성이라 그림자가 늘 둘로 갈라진다',
      '항성에 한 면만 향한 조석고정 행성의 영원한 황혼대',
      '두꺼운 구름에 갇혀 별빛이 닿지 않는 어두운 온실 행성',
      '중력이 지구의 세 배라 모든 것이 낮고 단단하다',
      '가스 행성의 상층 대기를 떠다니는 거대 부유 생태계',
      '얼음 위성의 두꺼운 빙각 아래 어두운 지하 바다',
      '하루가 수백 년이라 한 계절이 한 생애만큼 길다',
      '끊임없이 화산이 터지는 젊은 행성의 용암 평원 가장자리',
      '대기가 거의 없어 낮밤의 온도 차가 극단적인 사막 세계',
      '행성 전체가 하나의 거대한 바다로 덮인 물의 세계',
      '소행성대를 떠도는 작은 천체들 사이의 미소중력 환경',
      '강한 방사선이 쏟아지는 항성 가까이의 작열하는 궤도',
      '두꺼운 메탄 안개가 깔린 극저온 위성의 호숫가',
      '자전축이 크게 기울어 극단적 계절이 번갈아 닥치는 땅',
      '거대한 고리의 그림자가 지표를 가로지르는 행성',
      '땅속 깊은 동굴망에서만 살아가는 지하 생태계',
      '항성풍에 깎인 행성의 영원히 바람 부는 능선',
      '간헐적으로 액체가 흐르다 마르는 메마른 협곡 지대',
      '오로라가 끊이지 않는 강한 자기장의 극지방',
      '서로 가까이 도는 두 행성이 조수처럼 서로를 끌어당기는 곳',
      '두꺼운 얼음과 암석이 층층이 쌓인 죽은 위성의 표면',
      '뜨거운 간헐천과 얼음이 맞닿은 좁은 생존 가능 지대',
      '먼지 폭풍이 일 년 내내 멈추지 않는 붉은 평원',
      '항성이 죽어 가며 점점 차가워지는 저무는 세계',
    ],
  },
  {
    key: 'relation', label: '인간과의 관계', icon: '🤝',
    faces: [
      '인간을 처음 본 미지의 존재—호기심도 적의도 아직 없다',
      '오래전 인간을 관찰해 왔으나 한 번도 모습을 드러내지 않았다',
      '인간을 자기보다 어린 후배 종으로 여겨 너그러이 가르친다',
      '인간의 감정을 이해 못 해 선의가 번번이 재앙이 된다',
      '교역 상대로서 냉정하나 약속만은 절대 어기지 않는다',
      '인간을 위협으로 보아 조용히 격리·관찰하려 한다',
      '인간 문명을 흠모해 어설프게 흉내 내려 한다',
      '인간과 공생하면 서로의 약점을 정확히 메워 준다',
      '인간을 숙주나 매개체로 삼으려는 본능을 숨기고 있다',
      '인간의 죽음을 이해 못 해 시신을 되살리려 한다',
      '한 인간과 깊이 결속하면 종 전체가 그를 기억한다',
      '인간의 언어를 배우려다 뜻밖의 오해를 거듭한다',
      '인간을 두려워해 접촉할수록 더 깊이 숨는다',
      '먼 과거 인간과 맺은 잊힌 계약의 마지막 이행자다',
      '인간을 예술 작품처럼 감상하되 개입은 하지 않는다',
      '인간의 폭력성을 시험하려 일부러 갈등을 빚는다',
      '인간에게 구원처럼 보이지만 대가가 끔찍하다',
      '인간 아이만은 본능적으로 보호하려 든다',
      '인간을 동등한 동료로 여겨 거리낌 없이 협력한다',
      '인간을 자신들의 신화 속 예언된 존재로 오인한다',
      '인간과 닿으면 양쪽 다 서서히 서로를 닮아 간다',
      '인간을 이해하려 한 개체가 일부러 인간 곁에 남았다',
    ],
  },
]

const LS = 'sry:tool:sf-alien-life-forge:'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 받침 유무 판정 — 마지막 한글 음절의 종성을 보고 조사를 고른다.
// 한글이 아니면(라틴 종명 등) 받침 없음으로 간주(영어 자모 뒤엔 '를/는/가/로'가 자연스럽다).
function hasBatchim(word: string): boolean {
  const m = word.match(/[가-힣](?=[^가-힣]*$)/)
  if (!m) return false
  return ((m[0].charCodeAt(0) - 0xac00) % 28) !== 0
}
// 앞말 받침에 맞는 조사를 붙인다. '으로/로'는 ㄹ 받침이면 '로'를 쓴다.
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const lastHangul = word.match(/[가-힣](?=[^가-힣]*$)/)
  if (withBatchim === '으로' && lastHangul) {
    const jong = (lastHangul[0].charCodeAt(0) - 0xac00) % 28
    if (jong === 8) return word + withoutBatchim // ㄹ 받침 → '로'
  }
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim)
}

// 총 조합수(슬롯별 후보 개수의 곱) — 수백억 단위.
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.faces.length, 1)
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

type Result = Record<string, string>

// 종 이름 자동 생성용 음절 풀(라틴 학명풍) — 결과 식별·제목용.
const NAME_A = ['Xeno', 'Astro', 'Cryo', 'Lumi', 'Vorta', 'Nebu', 'Thal', 'Quor', 'Sila', 'Myco', 'Heli', 'Pyro', 'Aqua', 'Umbra', 'Ferro', 'Plasm', 'Glaci', 'Volu']
const NAME_B = ['morph', 'pode', 'thra', 'vex', 'cyte', 'goth', 'phage', 'lith', 'nara', 'drix', 'sapis', 'forma', 'genus', 'spira', 'noma', 'vora']

function makeName(): string {
  return `${pick(NAME_A)}${pick(NAME_B)}`
}

// 슬롯 결과들을 자연스러운 종 개요 문단으로 엮는다.
function compose(r: Result): string {
  if (!SLOTS.some((s) => r[s.key])) return ''
  const parts: string[] = []
  if (r.biochem) parts.push(`이 생명체는 ${r.biochem}.`)
  if (r.morphology) parts.push(`형태는 ${r.morphology}.`)
  if (r.senses) parts.push(`감각은 ${r.senses}.`)
  if (r.sociality) parts.push(`사회는 ${r.sociality}.`)
  if (r.intelligence) parts.push(`지능은 ${r.intelligence}.`)
  if (r.communication) parts.push(`소통은 ${r.communication}.`)
  if (r.habitat) parts.push(`서식지는 ${r.habitat}.`)
  if (r.relation) parts.push(`인간과의 관계는—${r.relation}.`)
  return parts.join(' ')
}

export default function SfAlienLifeForge({ payload }: { payload?: Record<string, unknown> }) {
  // 현재 결과(슬롯별 면) — 저장된 값 복원, 없으면 비움(첫 진입 시 자동 생성).
  const [result, setResult] = useState<Result>(() => {
    try {
      const raw = localStorage.getItem(LS + 'result')
      if (raw) {
        const p = JSON.parse(raw) as Result
        if (p && typeof p === 'object') {
          const next: Result = {}
          SLOTS.forEach((s) => { if (typeof p[s.key] === 'string' && s.faces.includes(p[s.key])) next[s.key] = p[s.key] })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [name, setName] = useState<string>(() => {
    try { const n = localStorage.getItem(LS + 'name'); if (n) return n } catch { /* ignore */ }
    return ''
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'locked')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, boolean>
        if (p && typeof p === 'object') {
          const next: Record<string, boolean> = {}
          SLOTS.forEach((s) => { if (p[s.key]) next[s.key] = true })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [count, setCount] = useState(0) // 지금까지 굴린 횟수(이 세션)

  const mounted = useRef(true)
  const rollTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 결과/잠금/이름 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'result', JSON.stringify(result)) } catch { /* ignore */ }
  }, [result])
  useEffect(() => {
    try { localStorage.setItem(LS + 'locked', JSON.stringify(locked)) } catch { /* ignore */ }
  }, [locked])
  useEffect(() => {
    try { localStorage.setItem(LS + 'name', name) } catch { /* ignore */ }
  }, [name])

  // 한 번 굴리기 — 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const roll = useCallback(() => {
    setCopied(false); setSaved(false)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        // 같은 값 연속 방지(후보가 2개 이상일 때)
        let f = pick(s.faces)
        if (f === prev[s.key] && s.faces.length > 1) f = pick(s.faces)
        next[s.key] = f
      })
      return next
    })
    setName(makeName()) // 종 이름은 매 굴림마다 새로(잠금과 무관한 보조 식별자)
    setCount((c) => c + 1)
    setRolling(true)
  }, [locked])

  // 첫 진입: 저장된 결과가 없으면 자동 생성.
  useEffect(() => {
    const hasAny = SLOTS.some((s) => result[s.key])
    if (!hasAny) roll()
    else if (!name) setName(makeName())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제
  useEffect(() => {
    if (!rolling) return
    if (rollTimer.current) window.clearTimeout(rollTimer.current)
    rollTimer.current = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => { if (rollTimer.current) window.clearTimeout(rollTimer.current) }
  }, [rolling, result])

  // 언마운트 시 모든 타이머 정리
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      ;[rollTimer, copyTimer, saveTimer, toastTimer].forEach((t) => { if (t.current) window.clearTimeout(t.current) })
    }
  }, [])

  const toggleLock = (key: string) => {
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 슬롯 하나만 다시 굴리기(재생성)
  const rerollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setCopied(false); setSaved(false)
    setResult((prev) => {
      let f = pick(slot.faces)
      if (f === prev[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, [key]: f }
    })
    setRolling(true)
  }

  const hasResult = SLOTS.some((s) => result[s.key])
  const description = compose(result)
  const lockedCount = SLOTS.filter((s) => locked[s.key]).length
  const title = name || '외계 생명'

  const plainText = () => {
    const lines = SLOTS.filter((s) => result[s.key]).map((s) => `${s.icon} ${s.label}: ${result[s.key]}`)
    return `${title} (외계 생명)\n\n${lines.join('\n')}\n\n📖 ${description}`
  }

  const copy = () => {
    if (!hasResult) return
    navigator.clipboard?.writeText(plainText()).then(() => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 3000)
  }

  // 스니펫 라이브러리에 저장(여러 도구가 함께 읽는 공유 영감 메모)
  const saveSnippet = () => {
    if (!hasResult) return
    addToLibrary('snippets', {
      text: plainText(),
      source: '외계 생명 생성기',
      tags: ['외계생명', 'SF', result.biochem ? result.biochem.slice(0, 12) : ''].filter(Boolean) as string[],
    })
    setSaved(true)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 1500)
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // HTML 특수문자 escape(&,<,> 필수)
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 외계 생명을 프로젝트 자료 〈세계관〉 폴더에 문서로 추가
  const toProject = () => {
    if (!hasResult) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const rows = SLOTS.filter((s) => result[s.key])
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}</b> · ${esc(result[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>📖 ${esc(description)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const metaRows: Record<string, string> = {}
    SLOTS.forEach((s) => { if (result[s.key]) metaRows[s.label] = result[s.key].slice(0, 60) })
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `👽 ${title}`,
      bodyHtml,
      synopsis: description.slice(0, 120) || undefined,
      icon: '👽',
      meta: metaRows,
    })
    flash(id ? `‘${title}’${josa(title, '을', '를')} 프로젝트 ‘자료 › 세계관’에 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        여덟 슬롯(<b>생화학 기반·형태·감각·사회성·지능·의사소통·서식지·인간과의 관계</b>)을 조합해 SF용 외계 생명을 빚습니다.
        총 <b>{fmtNum(TOTAL_COMBOS)}</b>가지 조합(수백억+). 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {!hasResult ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, lineHeight: 1.6 }}>
            아래 <b><Emoji e="🎲"/> 생명 빚어내기</b> 버튼으로 첫 외계 생명을 만들어 보세요.
          </div>
        ) : (
          <>
            {/* 종 이름 카드 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 11px' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}><Emoji e="👽"/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>종 이름 (가칭)</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.3, fontStyle: 'italic' }}>{title}</div>
              </div>
              <button className="minibtn" onClick={() => setName(makeName())} title="종 이름만 다시" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
            </div>

            {SLOTS.map((s) => {
              const face = result[s.key]
              const isLocked = !!locked[s.key]
              return (
                <div
                  key={s.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '9px 11px',
                  }}
                >
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}>
                    <Emoji e={s.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '—'}
                    </div>
                  </div>
                  <button
                    className="minibtn"
                    onClick={() => rerollOne(s.key)}
                    title="이 슬롯만 다시"
                    style={{ flexShrink: 0 }}
                    disabled={isLocked}
                  >
                    <Emoji e="🎲"/>
                  </button>
                  <button
                    className="minibtn"
                    onClick={() => toggleLock(s.key)}
                    title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    aria-pressed={isLocked}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}

            {/* 종 개요 카드 */}
            {description && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', marginTop: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}><Emoji e="📖"/> 종(種) 개요</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)' }}>{description}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 상태 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>가능 조합 {fmtNum(TOTAL_COMBOS)}가지</span>
        <span>{lockedCount > 0 ? <><Emoji e="🔒"/> {`${lockedCount}개 고정 · `}</> : ''}이번 세션 {count}회 굴림</span>
      </div>

      {/* 주 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲"/> 생명 빚어내기</button>
        <button className="minibtn" onClick={copy} disabled={!hasResult}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!hasResult} title="스니펫 라이브러리에 저장">{saved ? '✓ 저장됨' : <><Emoji e="💾"/> 스니펫</>}</button>
      </div>

      {/* 프로젝트 연동 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasResult || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 외계 생명을 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center', lineHeight: 1.5 }}>{toast}</div>
      )}

      <div style={hint}>조합은 출발점일 뿐입니다. 생화학과 형태가 그 생명의 사회·소통을 어떻게 결정짓는지 따져 가며 당신의 세계에 맞게 다듬어 보세요.</div>
    </div>
  )
}
