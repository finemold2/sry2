// 판타지 시그니처 생성기(대형 조합) — 이 장르의 심장인 '마법/권능 시스템'을 통째로 빚어내는 대형 생성기.
//   13개 슬롯(원천·매개·발동·자원·대가·한계·금기·등급체계·사회적 위상·부작용·각성 계기·시스템 연출·시그니처 명) ×
//   잠금(🔒)/부분 재생성(🎲) + 총 조합수 표시(1조 이상). 도시에의 하드/소프트 매직·샌더슨 3법칙(규칙·대가·한계·금기·확장)에 근거.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(잠금/마지막 결과)만 사용. 언마운트 정리.
// 연계(linkbus): 빚어낸 마법 시스템을 프로젝트 자료 〈마법체계〉 폴더에 메모로 추가 · 스니펫 라이브러리 저장 · 관련 판타지 도구 열기.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'fan-genre-signature', name: '판타지 시그니처 생성기', icon: '🪄', group: '생성기', genre: '판타지', intro: '이 세계만의 마법/권능 시스템을 원천·대가·한계·금기까지 통째로 빚어냅니다', w: 560, h: 680 }

const LS = 'sry:tool:fan-genre-signature'

// ---------- 슬롯 풀(로컬·판타지 특화) ----------
// 각 슬롯은 충분히 다양하게. 조합수 = 모든 슬롯 풀 길이의 곱 → 1조(10^12) 이상 보장.
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'source', label: '원천', icon: '🌌', hint: '힘은 어디서 오는가(신/자연/혈통/계약)',
    pool: [
      '대지의 숨결인 마나(魔力)의 흐름', '별빛이 응결된 천상의 에테르', '죽은 자들의 영역에서 새어 나오는 명계의 기(氣)',
      '잊힌 신과 맺은 피의 계약', '혈통을 따라 흐르는 고대 용의 정수', '세계수의 뿌리를 타고 오르는 생명의 수액',
      '심연에서 속삭이는 외신(外神)의 권능', '자신의 영혼을 연료로 태우는 내면의 불꽃', '정령과의 공명(共鳴)으로 빌려 오는 자연의 힘',
      '룬 문자에 봉인된 태초의 언어', '꿈과 현실 사이 ‘틈’에서 흘러드는 환몽력(幻夢力)', '별자리의 운행에 묶인 점성(占星)의 기운',
      '잃어버린 기억을 대가로 끌어올리는 망각의 권능', '심장 속에 깃든 정령석(精靈石)의 박동', '신성한 피(성흔)로 발현되는 교단의 은총',
      '세계의 ‘규칙’ 자체를 해석해 다시 쓰는 권능', '그림자에 새겨진 전생(前生)의 업', '대지의 균열에서 솟는 마정석(魔晶石)의 광휘',
    ],
  },
  {
    key: 'medium', label: '매개', icon: '🔧', hint: '힘을 다루는 도구·통로',
    pool: [
      '몸 안에 새겨진 마력 회로(서클)', '손끝에 그리는 마법진(陣)', '음절마다 힘이 깃든 영창(詠唱)',
      '피부에 떠오르는 성흔(聖痕) 문양', '계약으로 묶인 사역마(使役魔)', '진명(眞名)을 부르는 단 한 마디',
      '악기처럼 ‘연주’하는 가락', '검에 두른 오러(검기)', '룬을 새긴 인챈트 장비',
      '문신처럼 새긴 룬어(語)', '소환한 정령과의 합일(合一)', '제물을 바치는 제의(祭儀)',
      '카드·타로에 봉인한 권능', '피로 그리는 혈진(血陣)', '눈에 깃든 마안(魔眼)',
      '두드리면 권능이 깨어나는 도깨비방망이형 영물(靈物)', '시간을 되감는 회중시계형 아티팩트',
    ],
  },
  {
    key: 'trigger', label: '발동', icon: '⚡', hint: '어떻게 켜지는가',
    pool: [
      '진명을 정확히 발음할 때', '피를 매개로 계약 문구를 읊을 때', '심장 박동을 의지로 가속할 때',
      '특정 성좌가 하늘에 정렬할 때', '강렬한 감정(분노·슬픔·각오)이 임계를 넘을 때', '대가를 먼저 ‘선불’로 지불할 때',
      '봉인된 진(陣)의 마지막 획을 그을 때', '달이 차거나 기우는 순간', '상대와 시선을 맞춰 마안이 발동할 때',
      '정해진 손짓(인장)을 맺을 때', '제물의 마지막 숨이 끊길 때', '잊었던 진실을 기억해 내는 순간',
      '음률의 마지막 음이 닿을 때', '죽음의 문턱을 한 번 넘어섰다 돌아올 때', '세계의 ‘규칙 문장’을 소리 내어 고쳐 읽을 때',
    ],
  },
  {
    key: 'fuel', label: '자원', icon: '🔋', hint: '무엇을 연료로 쓰는가',
    pool: [
      '체내의 마나(고갈되면 탈진)', '생명력 그 자체(쓸수록 수명이 깎인다)', '기억(쓰면 일부를 영영 잊는다)',
      '감정(소진되면 무감각해진다)', '피(과다하면 빈혈·실혈)', '영혼의 조각(되돌릴 수 없이 닳는다)',
      '대기 중의 정령 농도(척박한 땅에선 무력)', '계약한 신의 가호(눈 밖에 나면 끊긴다)', '별의 기운(낮에는 약하고 밤에 강하다)',
      '쌓아 둔 업(業)·인연(다 쓰면 운이 메마른다)', '마정석(소모품, 비싸고 깨지기 쉽다)', '잠(쓰면 며칠씩 깨어 있어야 한다)',
      '타인에게서 빌린 마력(빚처럼 갚아야 한다)', '시간(미래의 며칠을 당겨 쓴다)',
    ],
  },
  {
    key: 'cost', label: '대가', icon: '⚖️', hint: '쓰면 무엇을 잃는가(샌더슨 2법칙)',
    pool: [
      '쓸 때마다 수명이 한 줌씩 줄어든다', '강한 권능일수록 기억 한 조각을 영영 잃는다', '대가로 신체 일부가 돌처럼 굳어 간다',
      '쓴 만큼 감정이 메말라 결국 무감각해진다', '권능에 비례해 광기가 정신을 잠식한다', '발동마다 누군가와의 인연(혈연·연인)이 흐려진다',
      '힘을 쓴 자리에 검은 낙인이 번져 간다', '몸에 ‘마(魔)’가 쌓여 끝내 인간이 아니게 된다', '쓸수록 외신의 속삭임이 또렷해진다',
      '권능의 반동이 가장 사랑하는 이에게 옮겨붙는다', '한 번 쓸 때마다 빚처럼 ‘대가의 날’이 적립된다', '잠시 후 반드시 그만큼의 고통을 되돌려받는다',
      '쓴 능력은 한동안 봉인되어 다시 못 쓴다', '대가로 세계의 균형이 미세하게 비틀린다(나비효과)',
    ],
  },
  {
    key: 'limit', label: '한계', icon: '🚧', hint: '무엇을 못 하는가(샌더슨 1법칙)',
    pool: [
      '죽은 자는 결코 되살리지 못한다', '한 번 본 마법만 모방할 수 있다', '자기 자신에게는 쓸 수 없다',
      '거짓을 말하면 권능이 즉시 끊긴다', '하루에 단 한 번만 발동된다', '물(또는 불·금속) 앞에서는 무력해진다',
      '시야 안의 대상에게만 닿는다', '같은 권능을 두 번 연속 쓰지 못한다', '계약의 문구를 벗어나는 일은 절대 못 한다',
      '신성한 땅·결계 안에서는 봉인된다', '자기 이름이 불리면 강제로 해제된다', '정해진 ‘질문’에만 응답하는 형태로만 작동한다',
      '거리가 멀어질수록 급격히 약해진다', '한 번 약속(예언)한 결과는 되돌릴 수 없다', '타인의 의지를 끝내 완전히 꺾지는 못한다',
    ],
  },
  {
    key: 'taboo', label: '금기', icon: '🚫', hint: '건드리면 파국인 것(금주·禁呪)',
    pool: [
      '죽은 자를 되살리는 사령술(死靈術)', '타인의 영혼을 강제로 바꿔치기하는 환혼술', '시간을 거슬러 과거를 고쳐 쓰는 역행',
      '진명을 훔쳐 상대를 종속시키는 명박술(命縛術)', '제 영혼을 봉인해 불사를 얻는 리치화(化)', '세계의 ‘규칙 문장’을 통째로 다시 쓰는 개찬(改竄)',
      '외신을 현세로 불러내는 강림 의식', '산 자를 제물로 바치는 인신공양', '두 영혼을 하나로 융합하는 금합(禁合)',
      '운명(예언)을 정면으로 거스르는 역천(逆天)', '신의 권능을 훔쳐 흉내 내는 신위 모독', '봉인된 고대의 마왕을 깨우는 해봉(解封)',
    ],
  },
  {
    key: 'tier', label: '등급체계', icon: '🪜', hint: '강함을 가시화하는 서열(웹소설 관습)',
    pool: [
      '1서클~9서클(마법사 위계)', 'F~SS급 각성자 등급(헌터 협회 공인)', '견습·정식·달인·대마법사·현자의 칭호',
      '동·은·금·미스릴·아다만티움 메달', '하급·중급·상급·초월·신화(神話) 위계', '회색·청·자·적·금빛 오러 색으로 가늠하는 경지',
      '룬 각인의 ‘획수’로 매기는 단계', '계약한 정령의 위계(하급정령~정령왕)', '별 한 개~별 일곱 개(성좌 등급)',
      '평민·기사·소드마스터·소드그랜드마스터', '레벨·스탯·스킬 트리(시스템 수치화)', '입문·개안·심상·탈각·우화등선의 경지',
    ],
  },
  {
    key: 'status', label: '사회적 위상', icon: '🏛️', hint: '이 힘을 가진 자의 사회적 지위',
    pool: [
      '국왕도 함부로 못 하는 마탑(魔塔)의 주인', '교단의 성직자로 신성시되는 존재', '협회에 등록되어 관리·감시받는 각성자',
      '천대받고 화형당하던 박해의 대상', '귀족 가문의 비전(祕傳)으로만 전해지는 특권', '용병처럼 사고팔리는 ‘소모품’ 전력',
      '나라의 무기로 징집·통제되는 병기', '음지에서 거래되는 금기의 기술자', '평민이 동경하는 영웅·셀럽',
      '왕실 직속의 궁정 마법사', '떠돌이 현자로 신비화된 은둔자', '길드에 소속되어 의뢰를 수행하는 모험가',
    ],
  },
  {
    key: 'sideeffect', label: '부작용', icon: '🩸', hint: '몸·정신에 남는 흔적',
    pool: [
      '발동 후 며칠씩 고열과 악몽에 시달린다', '동공이 빛나고 머리칼이 탈색된다', '권능을 쓴 손이 검게 괴사해 간다',
      '환청·환각으로 현실과 환상이 섞인다', '체온이 비정상적으로 떨어진다(또는 끓어오른다)', '말을 더듬거나 한동안 목소리를 잃는다',
      '감정의 기복이 극단으로 치닫는다', '코피·각혈이 잦아진다', '잠들면 권능이 제멋대로 발현된다',
      '피부에 룬 자국이 번지고 통증이 남는다', '시간 감각이 무너져 며칠을 통째로 잊는다', '권능을 쓸 때마다 키나 손톱이 기형적으로 자란다',
    ],
  },
  {
    key: 'awaken', label: '각성 계기', icon: '🌱', hint: '주인공이 이 힘을 처음 얻는 순간',
    pool: [
      '죽음의 문턱에서 회귀(回歸)하며 눈을 뜬다', '게이트 너머로 빨려 들어갔다 살아 돌아온다', '봉인된 고대 유물에 손을 댄 순간 각성한다',
      '가문에 버림받은 밑바닥에서 숨은 혈통이 깨어난다', '소설/게임 속 세계로 빙의해 시스템을 부여받는다', '죽어 가는 스승이 마지막 권능을 물려준다',
      '한계까지 몰린 분노가 잠든 힘을 폭발시킨다', '계약을 제안하는 존재의 목소리를 받아들인다', '예언이 가리키던 ‘표식’이 몸에 떠오른다',
      '전생의 기억이 한꺼번에 밀려 들어온다', '죽음 직전 누군가의 영혼/유산이 깃든다', '평범한 줄 알았던 자신이 사실 봉인된 신/마왕이었음을 깨닫는다',
    ],
  },
  {
    key: 'render', label: '시스템 연출', icon: '🖥️', hint: '독자에게 보이는 형식',
    pool: [
      '눈앞에 반투명 ‘상태창’이 뜬다', '도깨비/성좌가 메시지로 개입한다', '레벨업·스킬 습득 알림음이 울린다',
      '발동 시 발밑에 거대한 마법진이 그려진다', '권능마다 고유한 ‘진명’이 음각으로 떠오른다', '오러가 색으로 가시화되어 경지를 드러낸다',
      '시야에 적의 약점/수치가 표시된다', '퀘스트 창과 보상이 게임처럼 제시된다', '룬어 자막이 허공에 흘러간다',
      '연출 없이 ‘분위기’로만 암시한다(소프트 매직)', '발동 전후로 세계의 색·소리가 바뀐다', '시스템 상점에서 능력을 구매·교환한다',
    ],
  },
  {
    key: 'signame', label: '시그니처 명', icon: '✨', hint: '이 시스템/대표 권능의 이름',
    pool: [
      '여명의 서약(Oath of Dawn)', '잿더미 진명(眞名)', '심연의 계약자', '별을 읽는 자',
      '회귀의 룬', '명계의 문지기', '용의 숨결(드래곤 브레스)', '무한 회로(永劫의 서클)',
      '예언의 검', '영혼 저울', '망각의 술식', '성흔의 빛',
      '심상세계(心象世界)', '봉인된 왕관', '운명을 고쳐 쓰는 펜', '그림자 군주',
      '천 개의 가면', '마지막 정령왕', '금단의 아홉 번째 서클', '잠든 신의 권속',
    ],
  },
]

// 조합을 한 번 더 갈래내는 ‘설계 기조’(같은 슬롯 조합도 기조에 따라 결이 달라진다 → 조합수에 포함)
interface Tone { key: string; label: string; desc: string }
const TONES: Tone[] = [
  { key: 'hard', label: '하드 매직', desc: '규칙·대가·한계가 명시적 — 복선 회수형(샌더슨식). 갈등을 마법으로 풀 수 있다.' },
  { key: 'soft', label: '소프트 매직', desc: '규칙은 신비에 가려 둔다 — 경이·위협 연출용(톨킨식). 플롯 해결엔 쓰지 않는다.' },
  { key: 'webnovel', label: '웹소설(시스템)', desc: '수치화·등급·즉각 보상 — 사이다 리듬의 성장 가시화.' },
  { key: 'grimdark', label: '다크 판타지', desc: '대가와 부작용이 잔혹하게 — 힘은 곧 저주, 회색지대의 윤리.' },
]

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => {
  // 1조 이상은 한국어 ‘조/억’ 단위로 가독성 있게 표기
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  return n.toLocaleString('ko-KR')
}

// 총 조합수 = 모든 슬롯 풀 길이의 곱 × 기조 수. 부동소수 정밀도 영향이 적도록 곱만 계산.
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1) * TONES.length

// HTML 이스케이프(프로젝트 본문 안전화 — & < > 필수)
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Picks = Record<string, string>

export default function GenreSignature({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Picks>({})
  const [toneKey, setToneKey] = useState<string>(TONES[0].key)
  const [toneLocked, setToneLocked] = useState(false)
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // payload.genre 활용 — 다른 도구에서 장르를 넘겨받으면 기조 기본값을 맞춰 준다(웹소설 장르 컨텍스트면 시스템 기조).
  useEffect(() => {
    const g = String(payload?.genre ?? '')
    if (/웹소설|시스템|헌터|게이트/.test(g)) setToneKey('webnovel')
    else if (/다크|그림다크|grimdark/i.test(g)) setToneKey('grimdark')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마지막 결과/잠금 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as { picks?: Picks; toneKey?: string; locked?: Record<string, boolean>; toneLocked?: boolean }
        if (p.picks && typeof p.picks === 'object') {
          const valid: Picks = {}
          SLOTS.forEach((s) => { if (typeof p.picks![s.key] === 'string') valid[s.key] = p.picks![s.key] })
          if (Object.keys(valid).length) setPicks(valid)
        }
        if (typeof p.toneKey === 'string' && TONES.some((t) => t.key === p.toneKey)) setToneKey(p.toneKey)
        if (p.locked && typeof p.locked === 'object') setLocked(p.locked)
        if (typeof p.toneLocked === 'boolean') setToneLocked(p.toneLocked)
      }
    } catch { /* ignore */ }
  }, [])

  // 결과/잠금 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ picks, toneKey, locked, toneLocked })) } catch { /* ignore */ }
  }, [picks, toneKey, locked, toneLocked])

  // 첫 진입 시 한 번 굴려 빈 상태 방지
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      const next: Picks = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setPicks(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(() => setSpinning(false), 380)
    return () => window.clearTimeout(t)
  }, [spinning, picks])

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const generate = useCallback(() => {
    setCopied(false); setSaved(false)
    setSpinning(true)
    setPicks((prev) => {
      const next: Picks = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 동일 완화
        next[s.key] = v
      })
      return next
    })
    if (!toneLocked) {
      setToneKey((cur) => {
        let t = pick(TONES.map((x) => x.key))
        if (t === cur && TONES.length > 1) t = pick(TONES.map((x) => x.key))
        return t
      })
    }
  }, [locked, toneLocked])

  const rollOne = (key: string) => {
    setCopied(false); setSaved(false)
    setPicks((prev) => {
      const s = SLOTS.find((x) => x.key === key)!
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const ready = SLOTS.every((s) => picks[s.key])
  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 텍스트 요약(복사·스니펫용)
  const summaryText = () => {
    if (!ready) return ''
    const lines = SLOTS.map((s) => `${s.icon} ${s.label}: ${picks[s.key]}`)
    return [
      `【판타지 시그니처】 ${picks.signame}  (기조: ${tone.label})`,
      ...lines,
      ``,
      `※ ${tone.desc}`,
    ].join('\n')
  }

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(summaryText()).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('클립보드 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(영감 메모로 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: summaryText(),
      source: '판타지 시그니처 생성기',
      tags: ['판타지', '마법체계', '권능', tone.label, picks.signame],
    })
    setSaved(true); window.setTimeout(() => setSaved(false), 1500)
    flash('스니펫 라이브러리에 마법 시스템을 저장했습니다.')
  }

  // 프로젝트 자료 〈마법체계〉 폴더에 메모로 추가 — 시그니처 + 슬롯 분해(세계관 설계용)
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b> <span style="color:#888;">(${escHtml(s.hint)})</span><br/>${escHtml(picks[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:17px;"><b>🪄 ${escHtml(picks.signame)}</b></p>`,
      `<p style="color:#888;">기조 — <b>${escHtml(tone.label)}</b> · ${escHtml(tone.desc)}</p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '마법체계',
      title: `🪄 ${picks.signame} (${tone.label})`,
      bodyHtml,
      synopsis: `${picks.source} · 대가: ${picks.cost} · 한계: ${picks.limit}`.slice(0, 140),
      meta: { 기조: tone.label, 원천: picks.source, 대가: picks.cost, 한계: picks.limit, 금기: picks.taboo, 등급체계: picks.tier },
    })
    flash(id ? '프로젝트 자료 〈마법체계〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        이 세계만의 <b>마법/권능 시스템</b>을 <b>원천·매개·발동·자원·대가·한계·금기·등급·위상·부작용·각성·연출</b>까지 통째로 빚어냅니다.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요. <b>대가와 한계</b>가 좋은 마법 시스템의 핵심입니다.
      </div>

      {/* 조합수 + 기조 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>
          <Emoji e="🎲"/> {fmt(COMBOS)}가지 조합
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>({COMBOS.toLocaleString('ko-KR')})</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>기조</span>
        {TONES.map((t) => {
          const on = t.key === toneKey
          return (
            <button key={t.key} className="minibtn" onClick={() => { setToneKey(t.key); setCopied(false); setSaved(false) }}
              aria-pressed={on} title={t.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={() => setToneLocked((v) => !v)} title={toneLocked ? '기조 고정 해제' : '기조 고정'}
          style={{ borderColor: toneLocked ? 'var(--accent)' : 'var(--border)' }}>
          {toneLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
        </button>
      </div>

      {/* 시그니처 헤더 카드 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}><Emoji e="🪄"/> 이 세계의 시그니처 마법</div>
        <div style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1.35,
          color: ready ? 'var(--text)' : 'var(--muted)',
          transition: 'opacity .2s', opacity: spinning ? 0.5 : 1,
        }}>
          {ready ? (spinning ? '…빚어내는 중…' : picks.signame) : '생성해 보세요.'}
        </div>
        {ready && !spinning && (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6 }}>
            <b style={{ color: 'var(--ok)' }}>{tone.label}</b> · {tone.desc}
          </div>
        )}
      </div>

      {/* 슬롯 분해(잠금/부분 재생성 단위) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => {
          const v = picks[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 11px',
            }}>
              <div style={{
                fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0,
                transition: 'transform .25s',
                transform: spinning && !isLocked ? 'rotate(14deg) scale(1.15)' : 'none',
              }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span> · {s.hint}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (spinning && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} disabled={isLocked} title="이 슬롯만 다시"
                style={{ flexShrink: 0, padding: '0 6px' }}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, padding: '0 6px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate}><Emoji e="🎲"/> 시그니처 생성 / 다시 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장">
          {saved ? <>✓ 저장됨</> : <><Emoji e="⭐"/> 스니펫</>}
        </button>
      </div>

      {/* 프로젝트 연계 + 관련 도구 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={
            !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
            : !ready ? '먼저 시그니처를 생성해주세요'
            : '생성한 마법 시스템과 슬롯 분해를 프로젝트 자료 〈마법체계〉 폴더에 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('prophecy-generator', { genre: '판타지' })} title="이 시스템에 얽힌 예언 만들기">
          <Emoji e="🔮"/> 예언 생성기
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: '판타지' })} title="세계관 위키에 정리">
          <Emoji e="📚"/> 세계관 위키
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { genre: '판타지' })} title="배경 설정집으로">
          <Emoji e="🗺️"/> 배경 설정집
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>
        좋은 마법 시스템은 ‘무엇을 할 수 있는가’보다 <b>대가·한계·금기</b>가 더 흥미롭습니다(샌더슨 제2법칙).
        하드 매직이면 이 대가·한계가 결말의 복선 회수로 돌아오게 설계해 보세요.
      </div>
    </div>
  )
}
