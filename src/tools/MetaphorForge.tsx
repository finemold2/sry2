// 은유·비유 대장간(MetaphorForge) — 원관념(추상)×보조관념(구체)×공통 근거(감각/움직임)×분위기를 굴려
//  은유·직유 문장을 대량 생성한다. 작법 원리: 비유는 "원관념(tenor)을 보조관념(vehicle)에 빗대되,
//  둘을 잇는 공통 근거(ground=감각·움직임·상태)가 선명할 때" 살아 있다. 그래서 네 번째 슬롯으로
//  '공통 근거'를 두어, 단순 단어 결합이 아니라 "왜 그렇게 닮았는가"를 품은 문장을 만든다.
//  형식(은유/직유/의인/확장)·진부함 경고·잠금/재생성·조합 수 표시·스니펫/프로젝트 저장 포함.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만. 외부 API/미디어 불필요.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'metaphor-forge', name: '은유·비유 대장간', icon: '🔥', group: '영감·발상', intro: '원관념×보조관념×공통 근거×분위기를 굴려 은유·직유를 대량으로 벼려내세요', w: 580, h: 680 }

const LS = 'sry:tool:metaphor-forge'

// ---- 슬롯 정의 ----
// tenor  = 원관념(빗대어질 추상 개념)
// vehicle= 보조관념(구체적 사물·존재) — 명사 형태
// ground = 공통 근거(둘을 잇는 감각/움직임/상태) — '~다/~한' 서술 핵으로 쓰기 쉬운 어간
// mood   = 분위기(문장 끝맛을 결정)
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'tenor', label: '원관념(추상)', icon: '💭', desc: '빗대어질 추상 개념',
    // 모두 추상 명사(주어·목적어 자리에 들어갈 명사). 고유 60개.
    faces: [
      '그리움', '두려움', '외로움', '분노', '사랑', '슬픔', '희망', '절망',
      '기억', '시간', '침묵', '거짓말', '진실', '죄책감', '용기', '질투',
      '권태', '욕망', '자유', '운명', '후회', '기다림', '비밀', '이별',
      '믿음', '의심', '연민', '집착', '망설임', '환희', '수치심', '향수',
      '미련', '서글픔', '두근거림', '설렘', '체념', '원망', '동경', '경외',
      '안도', '불안', '권력', '명예', '욕심', '죄의식', '수치', '연정',
      '회한', '갈망', '허무', '고독', '향락', '연륜', '오기', '한(恨)',
      '정(情)', '서러움', '애도', '환멸',
    ],
  },
  {
    key: 'vehicle', label: '보조관념(구체)', icon: '🪨', desc: '빗댈 구체적 사물·존재',
    // 모두 구체 명사구. 고유 54개.
    faces: [
      '낡은 우물', '식어 가는 난로', '깨진 거울', '닻 없는 배', '마른 강바닥',
      '녹슨 열쇠', '꺼지기 직전의 촛불', '버려진 등대', '얼어붙은 호수', '금이 간 도자기',
      '실 끊긴 연', '서랍 속 편지', '오래된 시계태엽', '거미줄에 걸린 빗방울', '바닥난 모래시계',
      '문턱에 쌓인 먼지', '한겨울의 빈 둥지', '물에 번진 잉크', '꺼진 잿더미', '닳아 버린 문고리',
      '안개 낀 부두', '뿌리째 뽑힌 나무', '봉인된 항아리', '떠도는 깃털', '벼랑 끝의 돌멩이',
      '식은 찻잔', '낡은 외투', '잠긴 다락방', '썰물 진 갯벌', '빛바랜 사진첩',
      '닫힌 덧창', '얼룩진 유리창', '풀린 실타래', '녹아내리는 양초', '바람 빠진 풍선',
      '말라붙은 분수', '버려진 정류장', '눈 쌓인 벤치', '낡은 회전목마', '먼지 앉은 피아노',
      '깨진 보온병', '늘어진 카세트테이프', '곰팡이 핀 책장', '구겨진 지도', '멈춘 회중시계',
      '바스러진 낙엽', '식어 버린 인두', '닳은 계단', '버려진 부둣가의 그물', '재가 된 편지',
      '깨진 술병', '말라죽은 화분', '녹슨 그네', '물 빠진 수족관',
    ],
  },
  {
    key: 'ground', label: '공통 근거(감각/움직임)', icon: '🌀', desc: '둘을 잇는 감각·움직임·상태',
    // 모두 '~다'로 끝나는 서술(종결). 다른 슬롯을 전제하지 않는 독립 서술. 고유 46개.
    faces: [
      '천천히 가라앉는다', '소리 없이 번진다', '안에서부터 식어 간다', '조금씩 닳아 없어진다',
      '깊은 곳에 고여 있다', '가장자리부터 무너진다', '바람에 흩어진다', '겉은 단단하나 속이 비었다',
      '손에 잡힐 듯 잡히지 않는다', '오래 묵힐수록 짙어진다', '한순간에 부서진다', '말없이 쌓여 간다',
      '밤이 되면 더 또렷해진다', '닿으면 사라진다', '제자리에서 굳어 버렸다', '틈으로 새어 나온다',
      '겹겹이 포개져 있다', '뜨겁다 곧 차가워진다', '메마른 채 갈라진다', '문득 솟구쳤다 잦아든다',
      '무게도 없이 짓누른다', '어둠 속에서 빛난다', '뿌리째 흔들린다', '잔잔히 일렁인다',
      '온기 없이 식어 있다', '느리게 스며든다', '소리 없이 저문다', '깊이 잠겨 떠오르지 않는다',
      '결을 따라 갈라진다', '한참을 맴돌다 멎는다', '서서히 빛을 잃는다', '안개처럼 자욱하다',
      '한 켜씩 벗겨진다', '닳을수록 매끈해진다', '잿빛으로 바래 간다', '소리 없이 무너져 내린다',
      '오래 머물다 떠난다', '바닥에 고요히 깔린다', '실금처럼 번져 간다', '제풀에 사그라든다',
      '메아리처럼 되돌아온다', '천천히 굳어 간다', '바스러질 듯 위태롭다', '깊이 패어 남는다',
      '바람결에 묻어 온다', '오래도록 식지 않는다',
    ],
  },
  {
    key: 'mood', label: '분위기', icon: '🎨', desc: '보조관념을 물들이는 관형(형용)',
    // 모두 관형형(명사 수식). 고유 30개.
    faces: [
      '쓸쓸한', '서늘한', '아련한', '날카로운', '먹먹한', '담담한',
      '아득한', '서글픈', '고요한', '아릿한', '메마른', '애틋한',
      '나른한', '결연한', '황량한', '먹먹하고 따뜻한',
      '서늘하고 푸른', '바스러질 듯한', '낡고 정겨운', '희미한',
      '차갑고 투명한', '어둡고 깊은', '눅눅한', '무거운',
      '아슴푸레한', '스산한', '적막한', '아련하고 시린',
      '바래고 따스한', '서글프고 단단한',
    ],
  },
  {
    key: 'scene', label: '정황(때·곳)', icon: '🌗', desc: '문장을 여는 때·자리 (부사절)',
    // 모두 '~면,/~에,/~서,' 류로 이어지는 독립 부사절(앞 문장을 자연스레 연다). 고유 38개.
    faces: [
      '비 내리는 밤이면', '텅 빈 새벽이면', '눈 쌓인 골목에서', '인적 끊긴 거리에서',
      '해 질 무렵이면', '아무도 없는 방 안에서', '바람 부는 언덕에서', '낯선 도시의 밤에',
      '문득 잠 깬 한밤중에', '오래된 골목을 지날 때면', '첫눈이 내리던 날', '계절이 바뀔 무렵이면',
      '불 꺼진 거실에서', '안개 낀 새벽 강가에서', '빗소리가 잦아들 무렵', '먼 기적 소리가 들려올 때면',
      '낙엽 지는 가을 오후에', '한참을 걷다 멈춰 서면', '오래 비운 집에 돌아오면', '창밖이 어둑해질 무렵이면',
      '잠들지 못한 새벽이면', '늦여름의 소나기 속에서', '문득 옛 노래가 흘러나오면', '달빛만 환한 마당에서',
      '겨울 끝자락의 정류장에서', '눈먼 듯 환한 한낮에', '식어 버린 찻잔을 앞에 두면', '오래된 사진을 들출 때면',
      '한 해의 끝에 다다르면', '먼 길을 돌아온 저녁이면', '빈 운동장을 가로지를 때면', '비에 젖은 처마 밑에서',
      '서리 내린 이른 아침에', '불빛 드문 시골길에서', '파도 소리가 멀어질 무렵', '낡은 일기를 펼치면',
      '노을이 다 사그라들 무렵', '홀로 남겨진 대합실에서',
    ],
  },
  {
    key: 'coda', label: '여운(맺음)', icon: '🪶', desc: '끝에 남기는 한 줄 (독립 종결)',
    // 모두 다른 슬롯을 전제하지 않는 자족적 종결 한 문장. 끝에 덧붙는 여운. 고유 36개.
    faces: [
      '그렇게 또 하루가 저문다.', '말은 끝내 입안에서 맴돌았다.', '나는 오래 그 자리에 서 있었다.',
      '아무 일도 일어나지 않았다.', '돌아갈 길은 보이지 않았다.', '그 밤은 유난히 길었다.',
      '시간은 아랑곳없이 흘렀다.', '나는 끝내 뒤돌아보지 않았다.', '창밖에는 여전히 비가 내렸다.',
      '대답은 어디에도 없었다.', '그 마음을 차마 부르지 못했다.', '계절은 또 한 번 바뀌고 있었다.',
      '나는 그저 숨을 골랐다.', '불빛 하나가 멀리서 깜빡였다.', '아무도 그 이름을 묻지 않았다.',
      '나는 천천히 눈을 감았다.', '바람은 곧 멎을 듯 멎지 않았다.', '그 자리에 침묵만 남았다.',
      '나는 한 걸음도 떼지 못했다.', '어느새 거리에 불이 켜졌다.', '끝내 아무 말도 하지 못했다.',
      '먼 데서 종소리가 울렸다.', '나는 가만히 고개를 떨구었다.', '하늘은 무심히 맑아 갔다.',
      '그 모든 것이 어제 같았다.', '나는 다시 길을 나섰다.', '문은 오래도록 닫혀 있었다.',
      '눈물은 끝내 흐르지 않았다.', '나는 그 온기를 오래 기억했다.', '세상은 아무 일 없이 환했다.',
      '나는 천천히 그곳을 떠났다.', '남은 것은 긴 침묵뿐이었다.', '아침은 어김없이 다시 왔다.',
      '나는 그 말을 끝내 삼켰다.', '등 뒤로 문이 조용히 닫혔다.', '그리고 모든 것이 고요해졌다.',
    ],
  },
]

const SLOT_BY: Record<string, Slot> = Object.fromEntries(SLOTS.map((s) => [s.key, s]))

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 한국어 받침 판정 — 조사(이/가, 은/는, 을/를, 와/과) 선택용.
// 끝의 괄호 한자/병기(예: '한(恨)', '향수(鄕愁)')는 앞 한글 음절로 판정.
function hasFinalConsonant(word: string): boolean {
  let m = String(word).trim()
  m = m.replace(/\([^)]*\)\s*$/, '').trim()
  const ch = m.charCodeAt(m.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0
}
const josaEunNeun = (w: string) => w + (hasFinalConsonant(w) ? '은' : '는')
const josaIga = (w: string) => w + (hasFinalConsonant(w) ? '이' : '가')
const josaEulReul = (w: string) => w + (hasFinalConsonant(w) ? '을' : '를')
const josaWaGwa = (w: string) => w + (hasFinalConsonant(w) ? '과' : '와')
const josaCheoreom = (w: string) => w + '처럼'

// 근거(서술형) → 관형형(명사 수식)으로 거칠게 변환: "천천히 가라앉는다" → "천천히 가라앉는".
function toAdnominal(s: string): string {
  let t = String(s).trim()
  t = t.replace(/[.。!?]+$/, '')
  // ~ㄴ다/는다/다 어미를 관형형으로
  if (/[가-힣]ㄴ다$/.test(t)) return t // 안전장치(거의 없음)
  t = t
    .replace(/간다$/, '가는')
    .replace(/온다$/, '오는')
    .replace(/난다$/, '나는')
    .replace(/든다$/, '드는')
    .replace(/는다$/, '는')
    .replace(/진다$/, '지는')
    .replace(/한다$/, '하는')
    .replace(/된다$/, '되는')
    .replace(/린다$/, '리는')
    .replace(/った$/, '')
  // 받침 있는 '있다/없다/같다' 류 형용/존재
  t = t
    .replace(/있다$/, '있는')
    .replace(/없다$/, '없는')
    .replace(/같다$/, '같은')
    .replace(/짙어진다$/, '짙어지는')
  // 일반 동사 '~ㄴ다' 패턴: 받침 없는 어간 + ㄴ다 → 어간+ㄴ는 형태가 부자연 → 통째로 끝의 '다'를 '는'으로
  if (/다$/.test(t)) {
    // '...핀다','...섞인다' 등 받침 동사: 'ㄴ다' 제거 후 '는'
    if (/ㄴ다$/.test(t)) t = t.replace(/ㄴ다$/, '는')
    else t = t.replace(/다$/, '는')
  }
  return t
}

// 근거(서술형)에서 끝맺음을 다듬어 종결: "천천히 가라앉는다" 그대로 쓰되 분위기 형용을 앞에 붙임.
function moodPrefix(mood: string): string {
  return mood ? mood + ' ' : ''
}

// 정황(부사절) → 문장 머리에 ", " 와 함께 자연스레 연다. "비 내리는 밤이면" → "비 내리는 밤이면, ".
function scenePrefix(scene: string): string {
  const s = String(scene || '').trim().replace(/[,，]\s*$/, '')
  return s ? s + ', ' : ''
}
// 여운(자족 종결) → 본문 뒤에 한 칸 띄고 덧붙인다. 다른 슬롯을 전제하지 않는 독립 문장.
function codaSuffix(coda: string): string {
  const c = String(coda || '').trim()
  return c ? ' ' + c : ''
}

// ---- 비유 형식(은유/직유/의인/확장) ----
// 각 형식은 굴린 슬롯 결과를 받아 한 문장(혹은 짧은 두 문장)으로 엮는다.
type FormKind = 'simile' | 'metaphor' | 'personify' | 'extended'
interface FormDef { key: FormKind; label: string; icon: string; needs: string[]; build: (by: Record<string, string>) => string }

// 정황(scene)은 문장을 여는 부사절, 여운(coda)은 끝에 덧대는 자족 종결.
// 둘 다 다른 슬롯을 전제하지 않아 어떤 조합과 섞여도 의미 충돌이 없다(슬롯 독립성).
const FORMS: FormDef[] = [
  {
    key: 'simile', label: '직유', icon: '〜처럼', needs: ['tenor', 'vehicle', 'mood', 'scene', 'coda'],
    build: (by) => {
      const t = by.tenor, v = by.vehicle, g = by.ground, m = by.mood, sc = by.scene, cd = by.coda
      if (!t || !v) return ''
      const veh = m ? `${moodPrefix(m)}${v}` : v
      const core = g
        ? `${josaEunNeun(t)} ${josaCheoreom(veh)} ${g}.`
        : `${josaEunNeun(t)} ${josaCheoreom(veh)} 다가온다.`
      return `${scenePrefix(sc)}${core}${codaSuffix(cd)}`
    },
  },
  {
    key: 'metaphor', label: '은유', icon: '〜이다', needs: ['tenor', 'vehicle', 'mood', 'scene', 'coda'],
    build: (by) => {
      const t = by.tenor, v = by.vehicle, g = by.ground, m = by.mood, sc = by.scene, cd = by.coda
      if (!t || !v) return ''
      const veh = m ? `${moodPrefix(m)}${v}` : v
      const base = `${scenePrefix(sc)}${josaEunNeun(t)} 한 ${veh}다`
      const core = g ? `${base}. 그것은 ${g}.` : `${base}.`
      return `${core}${codaSuffix(cd)}`
    },
  },
  {
    key: 'personify', label: '의인·활유', icon: '🫧', needs: ['tenor', 'ground', 'mood', 'scene', 'coda'],
    build: (by) => {
      const t = by.tenor, g = by.ground, m = by.mood, v = by.vehicle, sc = by.scene, cd = by.coda
      if (!t || !g) return ''
      const lead = m ? `${moodPrefix(m)}${t}` : t
      const core = v
        ? `${josaIga(lead)} ${toAdnominal(g)} ${v}처럼 내 곁을 서성인다.`
        : `${josaIga(lead)} ${g}.`
      return `${scenePrefix(sc)}${core}${codaSuffix(cd)}`
    },
  },
  {
    key: 'extended', label: '확장 은유', icon: '📜', needs: ['tenor', 'vehicle', 'ground', 'mood', 'scene', 'coda'],
    build: (by) => {
      const t = by.tenor, v = by.vehicle, g = by.ground, m = by.mood, sc = by.scene, cd = by.coda
      if (!t || !v || !g) return ''
      const veh = m ? `${moodPrefix(m)}${v}` : v
      const core = `${scenePrefix(sc)}${josaEunNeun(t)} ${veh}였다. ${toAdnominal(g)}, 그러나 끝내 ${josaEulReul(t)} 닮은. 나는 그 ${v} 앞에서 오래 머물렀다.`
      return `${core}${codaSuffix(cd)}`
    },
  },
]
const FORM_BY: Record<string, FormDef> = Object.fromEntries(FORMS.map((f) => [f.key, f]))

// ---- 진부함(클리셰) 사전 ----
// 너무 닳은 비유 결합. 원관념·보조관념·근거의 흔한 짝을 부분 문자열로 감지해 경고만 띄운다(차단 아님).
interface Cliche { match: (by: Record<string, string>, sentence: string) => boolean; note: string }
const CLICHES: Cliche[] = [
  { note: '“사랑은 불/불꽃” 계열은 매우 흔합니다.', match: (b) => b.tenor === '사랑' && /난로|촛불|잿더미/.test(b.vehicle || '') },
  { note: '“시간은 흐른다/강물” 계열은 닳은 비유입니다.', match: (b) => b.tenor === '시간' && /강바닥|모래시계|시계태엽/.test(b.vehicle || '') },
  { note: '“희망의 등불/등대”는 상투적입니다. 한 번 비틀어 보세요.', match: (b) => b.tenor === '희망' && /등대|촛불/.test(b.vehicle || '') },
  { note: '“마음의 거울”류는 흔합니다.', match: (b) => /거울/.test(b.vehicle || '') && /진실|기억|사랑/.test(b.tenor || '') },
  { note: '“~처럼 흩어진다/번진다”는 자주 쓰입니다. 동사를 바꿔 보세요.', match: (b) => /흩어진다|번진다/.test(b.ground || '') },
  { note: '추상+추상은 비유가 흐려집니다(보조관념이 추상에 가깝습니다).', match: (b) => /그리움|두려움|외로움/.test(b.vehicle || '') },
  { note: '“이별은 ~”에 “식어”류 근거는 예측 가능합니다.', match: (b) => b.tenor === '이별' && /식어|식은|식는/.test(b.ground || '') },
]
function findCliches(by: Record<string, string>, sentence: string): string[] {
  const out: string[] = []
  for (const c of CLICHES) { try { if (c.match(by, sentence)) out.push(c.note) } catch { /* noop */ } }
  return out
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; form: string; rows: string; note: string }

export default function MetaphorForge({ payload }: { payload?: Record<string, unknown> }) {
  // 형식 선택(기본 직유) — 저장/복원
  const [form, setForm] = useState<FormKind>(() => {
    try {
      const raw = localStorage.getItem(LS + ':form')
      if (raw && FORMS.some((f) => f.key === raw)) return raw as FormKind
    } catch { /* ignore */ }
    return 'simile'
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'mf_' + i,
            text: String(s.text),
            form: typeof s.form === 'string' ? s.form : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
            note: typeof s.note === 'string' ? s.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 원관념/형식 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const wantForm = payload?.form
    if (typeof wantForm === 'string' && FORMS.some((f) => f.key === wantForm)) setForm(wantForm as FormKind)
    const wantTenor = payload?.tenor
    if (typeof wantTenor === 'string' && wantTenor.trim()) {
      setResults((prev) => ({ ...prev, tenor: wantTenor.trim() }))
      setLocked((prev) => ({ ...prev, tenor: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':form', form) } catch { /* ignore */ } }, [form])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 굴림 애니메이션 자동 해제
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  // 모든 슬롯을 항상 굴린다(형식이 안 쓰는 슬롯도 채워 두면 형식 전환이 매끄럽다).
  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((slot) => {
        if (locked[slot.key] && prev[slot.key]) return // 잠긴 슬롯 유지
        let f = pick(slot.faces)
        if (f === prev[slot.key] && slot.faces.length > 1) f = pick(slot.faces)
        next[slot.key] = f
      })
      return next
    })
  }, [locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  // 좌측 바인더 파일을 드롭하면 그 제목을 원관념으로 채운다(잠금).
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    const title = (item.title || '').trim()
    if (!title) return
    setResults((prev) => ({ ...prev, tenor: title }))
    setLocked((prev) => ({ ...prev, tenor: true }))
    setToast(`〈${title}〉을(를) 원관념으로 가져왔습니다.`)
  }

  const def = FORM_BY[form]
  const by: Record<string, string> = {}
  SLOTS.forEach((s) => { if (results[s.key]) by[s.key] = results[s.key] })
  const sentence = def ? def.build(by) : ''
  const hasSentence = !!sentence

  // 이 형식이 실제로 쓰는 슬롯 수만큼만 조합수 계산(원관념이 잠겨 외부값이면 그 슬롯은 1로).
  const comboCount = (() => {
    // mood 는 모든 형식이 분위기로 활용 → 포함
    const keys = Array.from(new Set([...(def?.needs || []), 'mood']))
    return keys.reduce((acc, k) => {
      const s = SLOT_BY[k]
      if (!s) return acc
      // 잠긴(고정) 슬롯은 1가지로 — 외부에서 들어온 원관념 등
      if (locked[k] && results[k]) return acc
      return acc * s.faces.length
    }, 1)
  })()

  const cliches = hasSentence ? findCliches(by, sentence) : []

  const rowsText = () => SLOTS
    .filter((s) => results[s.key])
    .map((s) => `${s.icon} ${s.label}: ${results[s.key]}`)
    .join('\n')

  const formLabel = def ? def.label : ''

  const saveCurrent = () => {
    if (!hasSentence) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === sentence)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'mf_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: sentence,
        form: formLabel,
        rows: rowsText(),
        note: '',
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 문장 + 슬롯 분해 + 진부함 경고.
  const bodyHtmlFor = (text: string, rows: string, formName: string, warns: string[]) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    const warnLines = warns.length
      ? `<hr/><p style="color:#b8860b;"><b>진부함 경고</b></p>` + warns.map((w) => `<p style="color:#b8860b;">⚠ ${escHtml(w)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:16px;line-height:1.9;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      formName ? `<p><b>형식:</b> ${escHtml(formName)}</p>` : '',
      rowLines,
      warnLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 비유를 자료(research)/'비유·표현' 폴더 문서로 추가.
  const addSentenceToProject = () => {
    if (!hasSentence) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '비유·표현',
      title: `🔥 ${formLabel} — ${sentence.slice(0, 24)}${sentence.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(sentence, rowsText(), formLabel, cliches),
      synopsis: sentence,
      meta: { 형식: formLabel, 원관념: by.tenor || '—', 보조관념: by.vehicle || '—' },
    })
    setToast(id ? '프로젝트 자료 〈비유·표현〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 라이브러리 저장(여러 도구 공유).
  const saveSnippet = (text: string, formName: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[${formName || '비유'}] ${text}`,
      source: '은유·비유 대장간',
      tags: ['글감', '비유', '표현', formName].filter(Boolean) as string[],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '비유·표현',
      title: `🔥 ${s.form || '비유'} — ${s.text.slice(0, 24)}${s.text.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.form, []) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈비유·표현〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  // 이 형식이 핵심으로 쓰는 슬롯(강조용)
  const usedSet = new Set(def ? [...def.needs, 'mood'] : [])

  return (
    <div style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dragOver) setDragOver(true) } }}
      onDragLeave={() => { if (dragOver) setDragOver(false) }}
      onDrop={onDrop}
    >
      <div style={hint}>
        <b>원관념(추상)</b>을 <b>보조관념(구체)</b>에 빗대되, 둘을 잇는 <b>공통 근거(감각·움직임)</b>가 선명할 때 비유가 살아납니다.
        슬롯을 굴려 직유·은유·의인·확장 은유를 벼려내고, 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하세요. 좌측 파일을 끌어다 놓으면 그 제목이 원관념이 됩니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🔥" /> 벼리기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 형식 선택 */}
          <div style={chipRow}>
            {FORMS.map((f) => {
              const on = form === f.key
              return (
                <button key={f.key} className="minibtn" onClick={() => setForm(f.key)} aria-pressed={on}
                  title={`${f.label} 형식`}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                  {f.label}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            이 형식의 가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(comboCount)}</b>가지 {comboCount >= 1e8 ? '(억 단위 이상)' : comboCount >= 10000 ? '(수만+ 이상)' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((slot) => {
              const k = slot.key
              const face = results[k]
              const isLocked = !!locked[k]
              const used = usedSet.has(k)
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--panel)', border: '1px solid ' + (used ? 'var(--border)' : 'var(--border)'),
                  borderRadius: 10, padding: '10px 12px', opacity: used ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}{used ? '' : ' · 이 형식에선 미사용'}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 비유 */}
          <div style={{ background: 'var(--paper)', border: '1px solid ' + (dragOver ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🔥" /> {formLabel}</div>
            <div style={{ fontSize: 16, lineHeight: 1.85, color: hasSentence ? 'var(--text)' : 'var(--muted)' }}>
              {sentence || '슬롯을 굴리면, 한 줄의 비유가 벼려집니다.'}
            </div>
          </div>

          {/* 진부함 경고 */}
          {cliches.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--warn)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--warn)', lineHeight: 1.6 }}>
              <b><Emoji e="⚠" /> 진부함 경고</b>
              {cliches.map((c, i) => <div key={i}>· {c}</div>)}
              <div style={{ color: 'var(--muted)', marginTop: 4 }}>경고일 뿐 막지 않습니다. 슬롯 하나만 다시 굴려 신선하게 비틀어 보세요.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🔥" /> 벼리기 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('sentence', `${sentence}\n\n${rowsText()}`)} disabled={!hasSentence}>
              {copiedKey === 'sentence' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasSentence}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(sentence, formLabel)} disabled={!hasSentence} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addSentenceToProject} disabled={!hasSentence || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasSentence ? '먼저 비유를 굴려주세요' : '현재 비유를 프로젝트 자료 〈비유·표현〉 폴더에 문서로 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 비유가 없습니다.<br />
              <span style={{ fontSize: 12 }}>벼리기 탭에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 비유를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.form && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{s.form}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.form)} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 비유를 어느 장면·인물에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 비유를 프로젝트 자료 〈비유·표현〉 폴더에 추가'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>비유는 출발점입니다. 벼려 낸 문장을 내 인물·장면의 결에 맞춰 다시 두드려 보세요.</div>
    </div>
  )
}
