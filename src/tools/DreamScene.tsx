// 꿈·초현실 장면 생성기 — 비논리적 공간×변형×상징×감각×불안요소 슬롯을 로컬 표에서 무작위 조합해
// 몽환/초현실 장면 글감을 만든다. 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage 만 사용.
// 연계(linkbus): 만든 장면을 스니펫('snippets')으로, 또는 프로젝트 자료('research')/'영감 메모' 폴더에 메모로 추가한다.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'dream-scene', name: '꿈 장면 생성기', icon: '🌙', group: '영감·발상', intro: '비논리적 공간·변형·상징·감각·불안의 슬롯을 조합해 몽환적 초현실 장면을 만드세요', w: 540, h: 640 }

const LS = 'sry:tool:dream-scene'

// ---------- 슬롯 정의 ----------
// 각 슬롯은 충분히 풍부한 로컬 표(faces). 5개 슬롯의 곱으로 수만 가지 조합이 나온다.
interface Slot { key: string; label: string; icon: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'space', label: '비논리적 공간', icon: '🌀',
    faces: [
      '바닥이 하늘로 이어진 계단',
      '문을 열 때마다 다른 계절이 펼쳐지는 복도',
      '천장이 바다인 도서관',
      '끝없이 같은 방으로 되돌아오는 회랑',
      '벽이 종이처럼 접히는 거실',
      '중력이 옆으로 흐르는 정거장',
      '거울 속에만 존재하는 정원',
      '발을 디딜 때마다 가라앉는 대리석 광장',
      '시계가 거꾸로 도는 기차역',
      '문턱을 넘으면 키가 절반이 되는 부엌',
      '천천히 물에 잠겨 가는 어린 시절의 교실',
      '복도가 입처럼 좁아졌다 넓어지는 병원',
      '바람이 안에서 부는 유리집',
      '계단을 오를수록 깊어지는 지하',
      '눈이 천장에서 솟아 바닥으로 떨어지는 광장',
      '모든 창이 같은 풍경을 보여주는 탑',
      '벽지 무늬가 살아 움직이는 침실',
      '발자국이 먼저 찍히고 뒤따라 걷게 되는 모래밭',
      '문이 없는데 자꾸 누군가 들어오는 다락',
      '바다가 수직으로 서 있는 해변',
      '책장이 미로처럼 끝없이 늘어나는 서점',
      '지평선이 둥글게 말려 머리 위로 닫히는 들판',
      '엘리베이터가 층이 아니라 기억을 지나는 호텔',
      '비가 위로 내리는 골목',
      '그림자만 남고 사물은 사라진 거리',
      '복도 끝이 처음 들어온 문으로 다시 이어지는 미술관',
      '발걸음 소리가 한참 뒤에야 들려오는 텅 빈 강당',
      '천장과 바닥이 수시로 자리를 바꾸는 다락방',
      '같은 다리를 건널 때마다 강폭이 넓어지는 강가',
      '문마다 다른 사람의 목소리가 새어 나오는 아파트 복도',
    ],
  },
  {
    key: 'transform', label: '변형·변신', icon: '🦋',
    faces: [
      '손가락이 천천히 나뭇가지로 자라난다',
      '얼굴이 만질 때마다 다른 사람의 것이 된다',
      '말하려는 단어가 입에서 나비가 되어 흩어진다',
      '걸음마다 몸이 조금씩 투명해진다',
      '눈을 감았다 뜰 때마다 옷이 바뀌어 있다',
      '머리카락이 물처럼 흘러내려 발밑에 고인다',
      '심장 소리가 점점 다른 방에서 들려온다',
      '거울 속의 내가 한 박자 늦게 따라 한다',
      '이름을 부를수록 상대의 윤곽이 흐려진다',
      '두 손이 어느새 낯선 이의 손이 되어 있다',
      '발이 바닥에 뿌리내려 떼어지지 않는다',
      '목소리가 어린 시절의 것으로 되돌아간다',
      '피부 위로 글자들이 떠올랐다 가라앉는다',
      '몸이 점점 가벼워져 천장에 닿는다',
      '그림자가 나와 반대 방향으로 걸어간다',
      '숨을 쉴 때마다 키가 한 뼘씩 줄어든다',
      '눈물이 작은 유리구슬이 되어 굴러간다',
      '얼굴의 한쪽이 천천히 가면으로 굳어 간다',
      '말 못 하던 동물이 갑자기 내 이름을 부른다',
      '손에 쥔 물건이 만질수록 더 무거워진다',
      '나이가 몇 분 단위로 늙었다 다시 어려진다',
      '몸의 색이 주변 벽과 같아져 사라진다',
      '두 발이 서로 다른 방향으로 걸으려 한다',
      '입을 열면 내 목소리가 아닌 합창이 새어 나온다',
      '내 그림자가 점점 부풀어 나를 삼키려 한다',
      '손바닥의 손금이 강물처럼 천천히 흐른다',
      '쥐고 있던 종이가 손안에서 새가 되어 날아오른다',
      '발끝부터 천천히 유리로 변해 굳어 간다',
      '내 등 뒤로 또 하나의 얼굴이 돋아난다',
      '걸음을 옮길 때마다 키가 한 뼘씩 자라난다',
    ],
  },
  {
    key: 'symbol', label: '반복되는 상징', icon: '🔑',
    faces: [
      '어디서나 같은 숫자가 새겨진 문',
      '계속 손에 쥐여지는 녹슨 열쇠',
      '아무도 받지 않는데 울리는 검은 전화기',
      '펼칠 때마다 빈 페이지뿐인 책',
      '한쪽만 남아 자꾸 따라오는 신발',
      '주인을 부르듯 울리는 먼 종소리',
      '바닥에 떨어진 채 깜빡이는 누군가의 사진',
      '아무리 닦아도 흐려지는 거울',
      '멈추지 않고 떨어지는 모래시계',
      '손금처럼 갈라지는 낡은 지도',
      '자물쇠 없는 자물쇠가 매달린 문',
      '맞지 않는 시각만 가리키는 시계',
      '바람도 없는데 흔들리는 빈 그네',
      '누군가 두고 간 김이 식지 않는 찻잔',
      '천장에서 내려온 한 가닥의 붉은 실',
      '이름이 지워진 묘비',
      '되감기는 카세트테이프 속 익숙한 목소리',
      '문틈으로 새어 나오는 끊이지 않는 음악',
      '계속 한 송이만 피어 있는 검은 꽃',
      '주워도 주워도 흩어지는 깃털',
      '발밑에 그려진 지워지지 않는 분필 선',
      '아무도 없는 식탁에 차려진 두 사람의 자리',
      '물 위에 떠 있는 불 꺼지지 않는 촛불',
      '쥐면 따뜻해지는 누군가의 손목시계',
      '문고리에 묶인 채 풀리지 않는 빛바랜 리본',
      '아무리 접어도 다시 펴지는 낡은 편지',
      '벽에 걸린 채 멈춘 시각을 가리키는 추 없는 괘종시계',
      '바닥에 떨어져 같은 음만 반복하는 오르골',
      '아무리 비워도 한 잔이 남아 있는 물병',
      '주머니에서 자꾸 나오는 한 장의 빛바랜 차표',
    ],
  },
  {
    key: 'sense', label: '뒤섞인 감각', icon: '👁️',
    faces: [
      '소리가 색으로 보이고 색이 냄새로 번진다',
      '빛이 손끝에 닿으면 차갑게 식는다',
      '침묵이 귀를 누를 만큼 무겁게 들린다',
      '비의 냄새가 혀끝에서 단맛으로 녹는다',
      '먼 곳의 속삭임이 등을 쓸어내린다',
      '어둠이 살갗에 끈적하게 들러붙는다',
      '발밑의 차가움이 머릿속에서 종소리로 울린다',
      '공기가 물처럼 무거워 천천히만 움직일 수 있다',
      '눈을 감아도 풍경이 더 또렷해진다',
      '냄새가 오래전 목소리를 불러낸다',
      '빛과 그림자가 손에 만져질 듯 두껍다',
      '심장 소리가 방 안을 채워 메아리친다',
      '바람이 피부에 글씨를 쓰듯 스친다',
      '맛이 기억처럼 입안에서 부풀어 오른다',
      '모든 소리가 물속에서처럼 멀고 둥글다',
      '시간이 끈적하게 늘어나 한 걸음이 한 시간 같다',
      '온기가 색으로 번져 손을 물들인다',
      '먼지조차 또렷이 노래하듯 떠다닌다',
      '눈물의 맛이 어느 여름의 냄새와 같다',
      '귀를 막아도 누군가의 숨소리만은 또렷하다',
      '발소리가 내 것이 아닌 박자로 울린다',
      '빛이 깜빡일 때마다 풍경이 한 겹씩 벗겨진다',
      '향기가 손가락 사이로 실처럼 빠져나간다',
      '정적 속에서 심장 두 개가 엇갈려 뛴다',
      '멀리서 들려오는 노래가 혀끝에서 쓴맛으로 맺힌다',
      '눈앞의 빛이 귓속에서 낮은 진동으로 울린다',
      '차가운 공기가 손끝에 닿으면 종이처럼 바스락거린다',
      '발밑의 그림자가 물처럼 차갑게 발목을 적신다',
      '햇살의 온기가 입안에서 설탕처럼 사르르 녹는다',
      '멀어지는 발소리가 가슴속에서 점점 환해진다',
    ],
  },
  {
    key: 'unease', label: '불안의 균열', icon: '🕯️',
    faces: [
      '뒤돌아보면 방금 지나온 길이 사라져 있다',
      '아무리 걸어도 문은 그대로 멀리 있다',
      '거울 속의 방에는 내가 없다',
      '누군가 내 이름을 부르는데 아무도 보이지 않는다',
      '시계가 멈췄는데 시간은 계속 흐른다',
      '말을 하려 하면 목소리가 나오지 않는다',
      '낯익은 얼굴인데 누구인지 끝내 떠오르지 않는다',
      '발을 떼려 할수록 더 깊이 잠긴다',
      '문을 잠갔는데 잠시 후 다시 열려 있다',
      '나를 빼고 모두가 같은 말을 되풀이한다',
      '거울이 한 박자 늦게 나를 따라 한다',
      '계단이 끝나지 않고 같은 층만 반복된다',
      '돌아갈 길을 분명히 외웠는데 모두 처음 보는 길이다',
      '사람들의 얼굴이 가까이 갈수록 흐려진다',
      '뒤에서 누군가 내 발맞춰 걷는 소리가 따라온다',
      '내가 쓴 글씨가 모르는 말로 바뀌어 있다',
      '잠에서 깼는데 여전히 같은 꿈속이다',
      '아끼던 것이 손안에서 모래처럼 흩어진다',
      '거리의 모든 시계가 각자 다른 시각을 가리킨다',
      '누군가 떠난 자리만 자꾸 비어 있다',
      '소리를 질러도 입 밖으로 새어 나오지 않는다',
      '문 너머에서 내 목소리가 나를 부른다',
      '한 사람만 빼고 모두가 나를 못 본 척한다',
      '집으로 가는 길이 매번 다른 곳에서 끝난다',
      '내가 방금 한 말을 벽이 그대로 따라 한다',
      '분명히 닫았던 창문이 어느새 활짝 열려 있다',
      '내 발자국이 나보다 앞서 저 멀리 찍혀 있다',
      '시간이 자정에서 한 발짝도 움직이지 않는다',
      '가까이 다가갈수록 출구가 한 걸음씩 물러난다',
      '방 안의 모든 그림 속 인물이 같은 곳을 바라본다',
    ],
  },
  {
    key: 'figure', label: '꿈속의 존재', icon: '👤',
    faces: [
      '얼굴 없는 손님',
      '나를 닮았지만 한 발 앞서 걷는 사람',
      '말없이 길을 가리키기만 하는 노인',
      '오래전 헤어진 친구의 어린 시절 모습',
      '계속 등만 보이는 흰옷의 누군가',
      '내 이름을 알고 있는 검은 고양이',
      '거울에서 걸어 나온 또 한 명의 나',
      '문 앞에 앉아 나를 기다리는 어린아이',
      '목소리만 남고 몸은 보이지 않는 안내자',
      '천천히 다가오는, 얼굴이 자꾸 바뀌는 사람',
      '창밖에서 안을 들여다보는 키 큰 그림자',
      '나에게만 보이는 늙은 개',
      '말을 걸면 연기처럼 흩어지는 여인',
      '내 발걸음을 그대로 따라 하는 쌍둥이',
      '모자를 깊이 눌러쓴 채 웃기만 하는 남자',
      '잠든 나를 내려다보는 낯선 아이',
      '바닥의 물웅덩이에서 올려다보는 누군가',
      '나보다 먼저 늙어 버린 동행',
      '이름을 부르면 한 명씩 사라지는 군중',
      '복도 끝에서 손짓하는 흰 드레스의 소녀',
      '내 그림자 속에 숨어 따라오는 작은 사람',
      '한쪽 눈만 깜빡이는 거대한 새',
      '내 목소리로 말하는 낯선 얼굴',
      '문틈으로 한쪽 눈만 내미는 누군가',
      '나를 알아보는 듯 고개 숙이는 행인',
      '계단 위에서 내려오지 않고 서 있는 형체',
      '내 뒤를 조용히 따라 걷는 검은 외투의 사내',
      '잠결마다 머리맡에 와 앉는 흰 나비 떼',
      '내 손을 잡아끄는, 보이지 않는 작은 손',
      '나를 부르며 점점 멀어지는 어머니의 뒷모습',
    ],
  },
]

// 슬롯 키 → 슬롯
const slotOf = (k: string) => SLOTS.find((s) => s.key === k)!

// ---------- 한국어 조사(받침) 헬퍼 ----------
// 마지막 글자의 받침 유무를 판정해 실제 조사 하나만 출력한다(괄호 이중표기 노출 금지).
function hasFinalConsonant(word: string): boolean {
  if (!word) return false
  const ch = word[word.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// 받침이 있으면 withJong, 없으면 without 을 붙여 돌려준다.
function withJosa(word: string, withJong: string, without: string): string {
  return word + (hasFinalConsonant(word) ? withJong : without)
}
const iGa = (w: string) => withJosa(w, '이', '가')     // 주격 조사

// 가능한 조합 수(활성 슬롯 면 수의 곱 × 도입부 변주 수).
// 도입부(OPENERS)는 매 생성마다 첫 문장을 실제로 다르게 만들므로 곱집합에 포함한다.
function combosOf(active: string[]): number {
  return active.reduce((acc, k) => acc * slotOf(k).faces.length, OPENERS.length)
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 자연수 천 단위 구분.
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 슬롯 결과들을 한 편의 몽환 장면 문단으로 엮는다(여러 도입부 템플릿으로 변주).
const OPENERS = [
  '꿈속에서 나는',
  '문을 열자',
  '눈을 떴을 때',
  '어느새 나는',
  '정신을 차려 보니',
  '잠결에 나는',
  '뒤척이다 보니 나는',
  '깊은 잠 속에서 나는',
]

function compose(by: Record<string, string>, opener: string): string {
  const sp = by.space, tr = by.transform, sy = by.symbol, se = by.sense, un = by.unease, fg = by.figure
  const parts: string[] = []
  if (sp) parts.push(`${opener} ${sp} 한가운데 서 있었다.`)
  if (sy) parts.push(`그곳에는 ${iGa(sy)} 있었고,`)
  if (fg) parts.push(`한쪽에서는 ${iGa(fg)} 나를 지켜보고 있었다.`)
  if (se) parts.push(`${se}.`)
  if (tr) parts.push(`그러는 사이 ${tr}.`)
  if (un) parts.push(`그리고 ${un}.`)
  if (parts.length === 0) return '슬롯을 골라 장면을 생성해 보세요.'
  return parts.join(' ').replace(/,\s*그/g, ', 그')
}

interface Saved { id: string; text: string; note: string }

function uid(): string {
  return 'd_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function DreamScene({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(저장/복원)
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [opener, setOpener] = useState<string>(OPENERS[0])
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [gen, setGen] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr
            .filter((s) => s && typeof s.text === 'string')
            .map((s) => ({ id: typeof s.id === 'string' ? s.id : uid(), text: String(s.text), note: typeof s.note === 'string' ? s.note : '' }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [toast, setToast] = useState('')
  const nonce = useRef(0)

  // payload로 즉시 1회 생성(연계로 열렸을 때)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (payload && payload.autogen) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 활성 슬롯 저장
  useEffect(() => {
    try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ }
  }, [active])

  // 보관 장면 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 빠진 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 토스트 자동 해제(언마운트 정리)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  // 생성 애니메이션 자동 해제(언마운트 정리)
  useEffect(() => {
    if (!gen) return
    const t = window.setTimeout(() => setGen(false), 380)
    return () => window.clearTimeout(t)
  }, [gen, results])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const generate = () => {
    const my = ++nonce.current
    setGen(true)
    setTab('gen')
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = slotOf(k)
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
    // 도입부도(잠금과 무관하게) 가볍게 변주
    setOpener(pick(OPENERS))
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const hasResults = active.some((k) => results[k])
  const sceneText = hasResults ? compose(results, opener) : ''

  const fullText = () => {
    const lines = active
      .filter((k) => results[k])
      .map((k) => `${slotOf(k).icon} ${slotOf(k).label}: ${results[k]}`)
      .join('\n')
    return `🌙 꿈 장면\n\n${sceneText}\n\n— 슬롯 —\n${lines}`
  }

  const copy = () => {
    if (!hasResults) return
    if (!navigator.clipboard) { setToast('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(fullText())
      .then(() => setToast('장면을 복사했습니다.'))
      .catch(() => setToast('복사에 실패했습니다. 직접 선택해 복사해 주세요.'))
  }

  const saveSnippet = () => {
    if (!hasResults) return
    addToLibrary('snippets', { text: sceneText, source: '꿈 장면 생성기', tags: ['꿈', '초현실', '영감'] })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 현재 장면을 보관함에 담기
  const keepScene = () => {
    if (!hasResults) return
    setSaved((prev) => [{ id: uid(), text: sceneText, note: '' }, ...prev])
    setToast('보관함에 담았습니다.')
  }

  // 프로젝트 자료 '영감 메모' 폴더에 추가
  const toProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = active
      .filter((k) => results[k])
      .map((k) => `<p><b>${escHtml(slotOf(k).icon)} ${escHtml(slotOf(k).label)}:</b> ${escHtml(results[k])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;">${escHtml(sceneText)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `🌙 ${sceneText.slice(0, 28)}${sceneText.length > 28 ? '…' : ''}`,
      bodyHtml,
      synopsis: sceneText.slice(0, 80),
      meta: { 유형: '꿈·초현실 장면', 슬롯수: String(active.filter((k) => results[k]).length) },
    })
    setToast(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 보관함 조작 ----
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
  const copySaved = (s: Saved) => {
    if (!navigator.clipboard) { setToast('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(s.text + (s.note ? `\n📝 ${s.note}` : ''))
      .then(() => setToast('복사했습니다.'))
      .catch(() => setToast('복사에 실패했습니다.'))
  }

  const combos = combosOf(active)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>비논리적 공간 · 변형 · 상징 · 감각 · 불안</b>의 슬롯을 조합해 한 편의 <b>몽환적 초현실 장면</b>을 만듭니다.
        마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴려 보세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🌙" /> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button
                  key={s.key}
                  className="minibtn"
                  onClick={() => toggleSlot(s.key)}
                  aria-pressed={on}
                  title={on ? '이 슬롯 끄기' : '이 슬롯 켜기'}
                  style={{
                    opacity: on ? 1 : 0.5,
                    borderColor: on ? 'var(--accent)' : 'var(--border)',
                    color: on ? 'var(--text)' : 'var(--muted)',
                  }}
                >
                  <Emoji e={s.icon} /> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          {/* 조합 수 */}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            현재 슬롯 조합 가능 수: <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지
          </div>

          {/* 슬롯 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = slotOf(k)
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .25s', transform: gen && !isLocked ? 'rotate(8deg) scale(1.18)' : 'none' }}>
                    <Emoji e={slot.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (gen && !isLocked ? '…' : face) : '— 생성해 주세요 —'}
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

          {/* 장면 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🌙" /> 꿈 장면</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {hasResults ? sceneText : '슬롯을 고르고 장면을 생성해 보세요.'}
            </div>
          </div>

          {/* 생성/재생성 */}
          <button className="btn-primary" onClick={generate}>
            {hasResults ? <><Emoji e="🔀" /> 다시 생성 (잠긴 슬롯 유지)</> : <><Emoji e="🌙" /> 꿈 장면 생성</>}
          </button>

          {/* 활용 버튼 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={copy} disabled={!hasResults} style={{ flex: 1 }}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!hasResults} style={{ flex: 1 }}><Emoji e="✂️" /> 스니펫</button>
            <button className="minibtn" onClick={keepScene} disabled={!hasResults} style={{ flex: 1 }}><Emoji e="⭐" /> 보관</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={toProject}
              disabled={!hasResults || !hasProjectBridge()}
              title={
                !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
                : !hasResults ? '먼저 장면을 생성해 주세요'
                : '현재 꿈 장면을 프로젝트 자료(영감 메모 폴더)에 메모로 추가'
              }
            >
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
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>〈생성〉 탭에서 마음에 드는 꿈 장면을 <Emoji e="⭐" /> 보관해 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={cardBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}><Emoji e="🌙" /></span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => copySaved(s)} title="복사"><Emoji e="📋" /></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.65 }}>{s.text}</div>
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="이 장면을 어떻게 쓸지 메모…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  background: 'var(--paper)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>꿈은 논리가 아니라 감정으로 이어집니다. 만들어진 조합은 출발점일 뿐, 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
