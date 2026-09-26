// 플롯 구멍 탐지기 — 흔한 플롯 허점(동기 결여·편의적 우연·정보 비일관·능력 들쭉날쭉·시간선 모순·체호프의 총 미회수 등)을
// 카테고리별 체크리스트로 원고를 점검한다. 각 항목마다 상태(미점검/통과/의심/구멍)와 자유 메모를 남기고, 검색·펼침/접기·무작위 점검·클릭 복사 지원.
// 모든 상태(항목 상태·메모·사용자 항목·삭제한 기본 항목·접힘)는 localStorage('sry:tool:plot-hole-detector')에 자동 저장/복원.
// 자급식: react 와 './linkbus' 외 import 없음. localStorage 미지원/차단/손상 시 메모리만 사용하며 graceful 처리(throw 금지). 언마운트 시 타이머 정리.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'plot-hole-detector', name: '플롯 구멍 탐지기', icon: '🕳️', group: '교정·언어', intro: '동기 결여·편의적 우연·시간선 모순·미회수 복선 등 흔한 플롯 허점을 체크리스트로 점검', w: 720, h: 660 }

const LS_KEY = 'sry:tool:plot-hole-detector'

type Status = 'none' | 'ok' | 'suspect' | 'hole'

interface CheckItem {
  q: string      // 점검 질문
  why: string    // 왜 문제인지/무엇을 보는지
}
interface Category {
  id: string
  name: string
  icon: string
  desc: string
  items: CheckItem[]
}

// ── 자작 점검 카테고리(흔한 플롯 허점) ── 백과 베끼기 없이 직접 작성한 점검 질문들.
const CATEGORIES: Category[] = [
  {
    id: 'motive',
    name: '동기·욕망',
    icon: '🎯',
    desc: '인물이 왜 그렇게 행동하는가',
    items: [
      { q: '주인공이 위험을 무릅쓰는 이유가 독자에게 분명히 전달되는가', why: '동기가 약하면 모든 행동이 작위적으로 읽힌다' },
      { q: '인물이 더 쉬운 선택지를 두고 굳이 어려운 길을 택할 납득할 이유가 있는가', why: '편한 해결책을 안 쓰는 이유가 없으면 플롯이 억지가 된다' },
      { q: '왜 지금인가 — 사건이 하필 이 시점에 시작되는 계기가 있는가', why: '오랫동안 가능했던 일을 지금 하는 동기가 없으면 작위적이다' },
      { q: '안타고니스트의 목표와 그 나름의 논리가 설득력 있는가', why: '악당이 까닭 없이 악하면 갈등의 무게가 사라진다' },
      { q: '인물이 위험을 알면서도 무모하게 행동한다면 그 이유가 성격으로 뒷받침되는가', why: '플롯 편의를 위한 멍청한 결정은 몰입을 깬다' },
      { q: '조연이 주인공을 돕는 이유가 그 인물의 이해관계로 설명되는가', why: '동기 없는 조력자는 작가의 손가락처럼 보인다' },
      { q: '인물이 비밀을 끝까지 숨기는 이유가 단지 줄거리를 늘리기 위한 것은 아닌가', why: '간단히 말하면 끝날 일을 숨기는 건 흔한 억지다' },
      { q: '사랑·복수·구원 등 큰 동기가 구체적 사건으로 뒷받침되는가', why: '추상적 동기만으로는 행동을 정당화하지 못한다' },
    ],
  },
  {
    id: 'coincidence',
    name: '편의적 우연',
    icon: '🎲',
    desc: '우연·데우스 엑스 마키나',
    items: [
      { q: '주인공을 곤경에서 구하는 우연(때맞춘 도움·우연한 발견)이 있는가', why: '우연이 위기를 해결하면 긴장이 거짓이 된다' },
      { q: '필요한 정보·물건·인물이 너무 마침맞게 등장하지 않는가', why: '편의적 등장은 작가가 짜놓은 티가 난다' },
      { q: '결말의 해결책이 앞에서 깔아둔 단서 없이 갑자기 나타나지 않는가', why: '데우스 엑스 마키나는 약속 위반이다' },
      { q: '우연을 쓴다면 그것이 주인공을 돕는 게 아니라 곤경에 빠뜨리는 방향인가', why: '곤경을 만드는 우연은 허용되지만 구원하는 우연은 반칙으로 느껴진다' },
      { q: '두 인물이 우연히 마주치는 장면에 개연성 있는 까닭이 있는가', why: '넓은 세계에서의 우연한 재회는 설명이 필요하다' },
      { q: '적이 결정적 순간에 갑자기 무능해지거나 실수하지 않는가', why: '플롯을 위해 적을 바보로 만들면 위협이 사라진다' },
      { q: '주인공이 어려운 문제를 운·재능만으로 너무 쉽게 넘기지 않는가', why: '노력 없는 성취는 카타르시스를 깎는다' },
    ],
  },
  {
    id: 'info',
    name: '정보 일관성',
    icon: '📚',
    desc: '누가 무엇을 언제 아는가',
    items: [
      { q: '인물이 자기가 알 수 없는 정보를 알고 행동하지 않는가', why: '정보 누수는 가장 흔한 논리 구멍이다' },
      { q: '한 번 밝혀진 사실이 뒤에서 모순되게 다뤄지지 않는가', why: '설정 변경은 독자 신뢰를 깬다' },
      { q: '인물이 이미 알았어야 할 사실에 뒤늦게 놀라지 않는가', why: '정보 흐름이 어긋나면 장면이 헛돈다' },
      { q: '중요한 정보가 인물 사이에서 자연스럽게 전달되는 경로가 있는가', why: '말없이 공유된 정보는 텔레파시처럼 보인다' },
      { q: '독자에게는 보여준 정보를 인물이 모르는 상황이 일관되게 유지되는가', why: '극적 아이러니의 규칙이 흔들리면 혼란스럽다' },
      { q: '거짓 정보·소문이 나중에 정정되거나 책임지는가', why: '풀리지 않은 오해는 미회수 떡밥이 된다' },
      { q: '전문 지식(의학·법·기술)이 인물의 배경으로 설명 가능한가', why: '갑자기 만능 전문가가 되는 건 편의적이다' },
    ],
  },
  {
    id: 'ability',
    name: '능력·규칙',
    icon: '⚖️',
    desc: '힘·기술·마법의 들쭉날쭉',
    items: [
      { q: '인물의 능력(체력·기술·마법)이 장면마다 들쭉날쭉하지 않은가', why: '편한 만큼 세지는 능력은 긴장을 죽인다' },
      { q: '강력한 능력·도구를 정작 필요한 위기에서 쓰지 않는 까닭이 있는가', why: '왜 안 쓰는지 설명이 없으면 명백한 구멍이다' },
      { q: '세계의 규칙(마법 체계·과학 설정)이 처음 정한 한계를 끝까지 지키는가', why: '규칙을 어기면 모든 긴장이 의미를 잃는다' },
      { q: '능력에 대가·한계·쿨다운이 있고 그것이 일관되게 적용되는가', why: '무제한 능력은 갈등을 무력화한다' },
      { q: '인물이 새 능력을 얻는다면 그 과정과 시점이 정당화되는가', why: '갑작스러운 각성은 데우스 엑스 마키나의 변형이다' },
      { q: '적과 아군의 능력 균형이 갈등을 가능하게 하는가', why: '한쪽이 압도적이면 싸움이 성립하지 않는다' },
      { q: '치료·부활·되돌리기 같은 능력이 위기의 무게를 깎지 않는가', why: '죽음이 되돌려지면 죽음의 긴장이 사라진다' },
    ],
  },
  {
    id: 'timeline',
    name: '시간선',
    icon: '⏳',
    desc: '순서·소요 시간·동시성',
    items: [
      { q: '사건의 선후 관계가 앞뒤로 모순되지 않는가', why: '시간선 꼬임은 다시 읽을 때 바로 드러난다' },
      { q: '이동·작업에 걸리는 시간이 현실적이고 일관되는가', why: '하룻밤에 대륙을 횡단하면 독자가 멈춘다' },
      { q: '여러 인물의 동시 진행 사건이 같은 시간축에서 맞아떨어지는가', why: '교차 편집은 시간 정렬이 어긋나기 쉽다' },
      { q: '계절·요일·시각·나이가 경과한 시간과 일치하는가', why: '겨울이 갑자기 여름이 되는 실수는 흔하다' },
      { q: '인물의 나이와 과거 사건 연도가 산술적으로 맞는가', why: '회상 속 나이 계산은 자주 어긋난다' },
      { q: '플래시백·플래시포워드가 현재 시간선과 명확히 구분되는가', why: '경계가 모호하면 독자가 길을 잃는다' },
      { q: '데드라인(시한)이 설정됐다면 그 시간 압박이 일관되게 작동하는가', why: '긴박하다더니 한가하게 행동하면 모순이다' },
    ],
  },
  {
    id: 'chekhov',
    name: '복선·회수',
    icon: '🔫',
    desc: '체호프의 총·심긴 단서',
    items: [
      { q: '강조해 등장시킨 물건·인물·능력이 나중에 쓰이는가(체호프의 총)', why: '주목시켜 놓고 안 쓰면 독자는 배신감을 느낀다' },
      { q: '뿌린 복선이 모두 회수되는가', why: '미회수 복선은 미완성으로 읽힌다' },
      { q: '반전의 단서가 미리 공정하게 깔려 있는가', why: '단서 없는 반전은 속임수로 느껴진다' },
      { q: '예언·꿈·암시가 결말과 정합적으로 연결되는가', why: '띄워놓은 떡밥은 거두어야 한다' },
      { q: '도입에서 던진 중심 질문에 결말이 응답하는가', why: '열어둔 질문은 닫아야 만족을 준다' },
      { q: '서브플롯이 본 줄거리와 엮이고 매듭지어지는가', why: '붕 뜬 서브플롯은 분량 낭비다' },
      { q: '중요해 보였던 인물·설정이 흐지부지 사라지지 않는가', why: '비중을 준 요소의 실종은 구멍이다' },
      { q: '제목·상징·반복 모티프가 결말에서 의미를 회수하는가', why: '의미를 회수하지 않은 상징은 장식에 그친다' },
    ],
  },
  {
    id: 'agency',
    name: '주체성·인과',
    icon: '🪢',
    desc: '주인공의 선택과 인과 사슬',
    items: [
      { q: '주인공의 선택이 사건을 이끄는가, 아니면 휩쓸리기만 하는가', why: '수동적 주인공은 이야기의 동력을 잃게 한다' },
      { q: '결말이 주인공의 행동·결단의 결과로 도달되는가', why: '남이 다 해결해주면 주인공의 의미가 없다' },
      { q: '주요 사건들이 인과(때문에/그래서)로 연결되는가, 단순 나열인가', why: '"그리고"의 연속은 플롯이 아니라 사건 목록이다' },
      { q: '갈등을 회피하지 않고 정면으로 다루는 장면이 충분한가', why: '대화로 다 풀릴 일을 미루면 억지 갈등이다' },
      { q: '인물의 실패가 다음 사건의 원인이 되며 판돈을 키우는가', why: '실패가 무의미하면 시도-실패 사이클이 헛돈다' },
      { q: '주인공의 변화(아크)가 행동을 통해 증명되는가', why: '말로만 성장하면 설득력이 없다' },
    ],
  },
  {
    id: 'stakes',
    name: '판돈·위협',
    icon: '🔥',
    desc: '무엇을 잃는가, 위협의 진정성',
    items: [
      { q: '실패했을 때 잃을 것(판돈)이 독자에게 구체적으로 와닿는가', why: '판돈이 모호하면 위기가 긴장되지 않는다' },
      { q: '위협이 실제로 실현 가능하다고 믿게 만드는 근거가 있는가', why: '한 번도 실현되지 않는 위협은 공허해진다' },
      { q: '시리즈·속편이 예고돼 주인공의 죽음 위협이 비어 보이지 않는가', why: '안전하다고 느껴지면 긴장이 사라진다' },
      { q: '판돈이 이야기 후반으로 갈수록 커지는가', why: '판돈이 정체되면 중반이 늘어진다' },
      { q: '개인적 판돈(인물이 소중히 여기는 것)이 거대한 판돈과 결합되는가', why: '세계 멸망보다 한 사람의 상실이 더 와닿는다' },
      { q: '안전지대로 도망칠 수 있는데 굳이 위험에 머무는 이유가 있는가', why: '도망 안 가는 이유가 없으면 위협이 가짜다' },
    ],
  },
  {
    id: 'logistics',
    name: '물리·정황',
    icon: '🧭',
    desc: '공간·소지품·생계 등 현실 정합',
    items: [
      { q: '장면 속 공간 배치(위치·거리·동선)가 모순 없이 그려지는가', why: '방 구조가 장면마다 달라지는 실수는 흔하다' },
      { q: '인물의 소지품·옷·상처 상태가 장면 사이에 일관되는가', why: '없던 물건을 갑자기 꺼내면 독자가 멈춘다' },
      { q: '인물이 먹고·자고·돈을 버는 등 기본 생계가 무리 없이 설명되는가', why: '생계가 증발한 인물은 비현실적으로 보인다' },
      { q: '부상·질병의 회복 속도가 현실적이고 일관되는가', why: '치명상이 다음 장면에서 멀쩡하면 모순이다' },
      { q: '통신·이동 수단의 가용성이 설정과 일치하는가', why: '연락 가능하면서 안 하는 이유가 필요하다' },
      { q: '군중·목격자가 있을 장소에서 비밀 행동이 들키지 않는 까닭이 있는가', why: '백주대낮의 은밀한 행동은 정황상 어색하다' },
      { q: '시신·증거·흔적의 처리가 빠짐없이 다뤄지는가', why: '사라진 증거는 추리·범죄물의 큰 구멍이다' },
    ],
  },
  {
    id: 'consistency',
    name: '설정·캐릭터 일관',
    icon: '🧬',
    desc: '성격·관계·세계관의 항상성',
    items: [
      { q: '인물의 성격·말투가 처음부터 끝까지 일관되는가(이유 없는 돌변 금지)', why: '플롯 편의를 위한 성격 변화는 티가 난다' },
      { q: '인물 간 관계의 온도(친밀·적대)가 사건에 따라 정합적으로 변하는가', why: '갑작스러운 관계 변화는 개연성이 필요하다' },
      { q: '인물의 외형·이름·나이·배경이 앞뒤로 모순되지 않는가', why: '눈 색·이름 철자 변화 같은 실수는 자주 놓친다' },
      { q: '세계의 사회·경제·정치 규칙이 일관되게 작동하는가', why: '세계관 규칙의 임의 변경은 신뢰를 깬다' },
      { q: '문화·언어·기술 수준이 시대·세계 설정과 어긋나지 않는가', why: '시대착오(아나크로니즘)는 몰입을 깬다' },
      { q: '인물의 가치관·신념에 반하는 행동에 충분한 동기가 있는가', why: '신념을 어기는 행동은 큰 사건으로 정당화돼야 한다' },
      { q: '단역·군중의 반응이 상황의 심각성에 걸맞은가', why: '엄청난 사건에 무덤덤한 주변은 비현실적이다' },
    ],
  },
]

// 색은 모두 정의된 CSS 변수만 사용(--danger 미정의 → 사용 금지). 구멍=빨강(--warn), 의심=강조(--accent), 통과=초록(--ok).
const STATUS_META: Record<Status, { label: string; icon: string; color: string }> = {
  none: { label: '미점검', icon: '○', color: 'var(--muted)' },
  ok: { label: '통과', icon: '✓', color: 'var(--ok)' },
  suspect: { label: '의심', icon: '?', color: 'var(--accent)' },
  hole: { label: '구멍', icon: '!', color: 'var(--warn)' },
}
const STATUS_ORDER: Status[] = ['none', 'ok', 'suspect', 'hole']

interface UserItem { id: string; q: string }
interface Persisted {
  status: Record<string, Status>   // 항목 id -> 상태
  notes: Record<string, string>    // 항목 id -> 메모
  removed: string[]                // 삭제한 기본 항목 id
  userItems: Record<string, UserItem[]> // catId -> 사용자 항목
  collapsed: Record<string, boolean>     // catId -> 접힘
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyState(): Persisted {
  return { status: {}, notes: {}, removed: [], userItems: {}, collapsed: {} }
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태. 누락·이상 필드는 기본값으로 보강(throw 금지).
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const status: Record<string, Status> = {}
    if (p.status && typeof p.status === 'object') {
      for (const k of Object.keys(p.status)) {
        const v = p.status[k]
        if (v === 'ok' || v === 'suspect' || v === 'hole' || v === 'none') status[k] = v
      }
    }
    const notes: Record<string, string> = {}
    if (p.notes && typeof p.notes === 'object') {
      for (const k of Object.keys(p.notes)) if (typeof p.notes[k] === 'string') notes[k] = p.notes[k]
    }
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') {
      for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    }
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) {
          userItems[k] = arr
            .filter((x: any) => x && typeof x.q === 'string')
            .map((x: any) => ({ id: String(x.id || newId()), q: String(x.q) }))
        }
      }
    }
    const removed = Array.isArray(p.removed) ? p.removed.filter((x: any) => typeof x === 'string') : []
    return { status, notes, removed, userItems, collapsed }
  } catch {
    return emptyState()
  }
}

const defId = (catId: string, idx: number) => `d:${catId}:${idx}`

interface MergedItem { id: string; q: string; why?: string; user: boolean }
function catItems(cat: Category, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  cat.items.forEach((it, idx) => {
    const id = defId(cat.id, idx)
    if (state.removed.includes(id)) return
    out.push({ id, q: it.q, why: it.why, user: false })
  })
  ;(state.userItems[cat.id] || []).forEach((u) => out.push({ id: u.id, q: u.q, user: true }))
  return out
}

export default function PlotHoleDetector({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null) // 무작위 점검으로 강조된 항목
  const [flash, setFlash] = useState('')
  const [storeWarn, setStoreWarn] = useState('')
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const hlTimer = useRef<number | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
      if (hlTimer.current) { clearTimeout(hlTimer.current); hlTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setStoreWarn('이 브라우저에서 저장이 막혀 있어 새로고침하면 점검 내용이 사라질 수 있어요.') }
  }, [state])

  // 페이로드로 검색어가 들어오면 적용(연계 진입 지원).
  useEffect(() => {
    if (payload && typeof payload.query === 'string') setQuery(payload.query as string)
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      showFlash(okMsg)
    } catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  // 항목 상태 순환(미점검 → 통과 → 의심 → 구멍 → 미점검)
  const cycleStatus = (id: string) => {
    setState((s) => {
      const cur = s.status[id] || 'none'
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length]
      return { ...s, status: { ...s.status, [id]: next } }
    })
  }
  const setStatus = (id: string, st: Status) => setState((s) => ({ ...s, status: { ...s.status, [id]: st } }))

  const setNote = (id: string, text: string) => setState((s) => ({ ...s, notes: { ...s.notes, [id]: text } }))

  const toggleCollapse = (catId: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [catId]: !s.collapsed[catId] } }))

  const addUserItem = (catId: string) => {
    const q = (drafts[catId] || '').trim()
    if (!q) return
    const item: UserItem = { id: newId(), q }
    setState((s) => ({ ...s, userItems: { ...s.userItems, [catId]: [...(s.userItems[catId] || []), item] } }))
    setDrafts((d) => ({ ...d, [catId]: '' }))
  }

  const removeItem = (catId: string, id: string, isUser: boolean) => {
    setState((s) => {
      const status = { ...s.status }; delete status[id]
      const notes = { ...s.notes }; delete notes[id]
      if (isUser) {
        const arr = (s.userItems[catId] || []).filter((u) => u.id !== id)
        return { ...s, status, notes, userItems: { ...s.userItems, [catId]: arr } }
      }
      return { ...s, status, notes, removed: [...s.removed, id] }
    })
  }

  const resetAll = () => setState((s) => ({ ...s, status: {} }))

  // ── 무작위 점검: 아직 미점검(none)인 항목 하나로 스크롤·강조 ──
  const randomCheck = () => {
    const pool: { catId: string; id: string }[] = []
    CATEGORIES.forEach((c) => {
      catItems(c, state).forEach((it) => { if ((state.status[it.id] || 'none') === 'none') pool.push({ catId: c.id, id: it.id }) })
    })
    if (pool.length === 0) { showFlash('미점검 항목이 없어요. 모두 점검했습니다.'); return }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    // 접혀 있으면 펼치고 강조
    setState((s) => (s.collapsed[pick.catId] ? { ...s, collapsed: { ...s.collapsed, [pick.catId]: false } } : s))
    setHighlight(pick.id)
    if (hlTimer.current) clearTimeout(hlTimer.current)
    hlTimer.current = window.setTimeout(() => { if (mounted.current) setHighlight(null) }, 2600)
    // 다음 페인트 후 스크롤
    window.setTimeout(() => {
      const el = rowRefs.current[pick.id]
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 60)
  }

  // ── 통계 ──
  const all: { cat: Category; items: MergedItem[] }[] = CATEGORIES.map((c) => ({ cat: c, items: catItems(c, state) }))
  const total = all.reduce((a, c) => a + c.items.length, 0)
  const counts: Record<Status, number> = { none: 0, ok: 0, suspect: 0, hole: 0 }
  all.forEach((c) => c.items.forEach((it) => { counts[(state.status[it.id] || 'none') as Status]++ }))
  const checked = total - counts.none
  const pct = total ? Math.round((checked / total) * 100) : 0

  // 검색 필터(질문·메모·카테고리명 대상)
  const ql = query.trim().toLowerCase()
  const filtered = all.map(({ cat, items }) => {
    if (!ql) return { cat, items }
    const catHit = cat.name.toLowerCase().includes(ql) || cat.desc.toLowerCase().includes(ql)
    const fitems = items.filter((it) =>
      catHit || it.q.toLowerCase().includes(ql) || (it.why || '').toLowerCase().includes(ql) || (state.notes[it.id] || '').toLowerCase().includes(ql))
    return { cat, items: fitems }
  }).filter((c) => c.items.length > 0)

  // ── 내보내기 텍스트(구멍·의심 우선 요약 + 전체) ──
  const buildReport = (): string => {
    const lines: string[] = ['# 플롯 구멍 점검', `진행: ${checked}/${total} (${pct}%)  ·  구멍 ${counts.hole} / 의심 ${counts.suspect} / 통과 ${counts.ok}`, '']
    const flagged: string[] = []
    all.forEach(({ cat, items }) => {
      items.forEach((it) => {
        const st = (state.status[it.id] || 'none') as Status
        if (st === 'hole' || st === 'suspect') {
          const note = (state.notes[it.id] || '').trim()
          flagged.push(`- [${STATUS_META[st].label}] (${cat.name}) ${it.q}${note ? '  → ' + note : ''}`)
        }
      })
    })
    if (flagged.length) { lines.push('## 점검 필요(구멍·의심)'); lines.push(...flagged); lines.push('') }
    all.forEach(({ cat, items }) => {
      lines.push(`## ${cat.icon} ${cat.name}`)
      items.forEach((it) => {
        const st = (state.status[it.id] || 'none') as Status
        const note = (state.notes[it.id] || '').trim()
        lines.push(`- [${STATUS_META[st].label}] ${it.q}${note ? '  // ' + note : ''}`)
      })
      lines.push('')
    })
    return lines.join('\n').trim()
  }

  // ── 프로젝트 연동: 점검 결과를 '기획' 폴더 문서로 ──
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>진행: ${checked}/${total} (${pct}%)</strong> — 구멍 ${counts.hole} · 의심 ${counts.suspect} · 통과 ${counts.ok}</p>`)
    const flagged: { st: Status; cat: string; q: string; note: string }[] = []
    all.forEach(({ cat, items }) => items.forEach((it) => {
      const st = (state.status[it.id] || 'none') as Status
      if (st === 'hole' || st === 'suspect') flagged.push({ st, cat: cat.name, q: it.q, note: (state.notes[it.id] || '').trim() })
    }))
    if (flagged.length) {
      parts.push('<h3>점검 필요 (구멍·의심)</h3>')
      flagged.forEach((f) => parts.push(`<p>${STATUS_META[f.st].icon} <strong>[${esc(f.st === 'hole' ? '구멍' : '의심')}]</strong> (${esc(f.cat)}) ${esc(f.q)}${f.note ? ' — ' + esc(f.note) : ''}</p>`))
    }
    all.forEach(({ cat, items }) => {
      parts.push(`<h3>${esc(cat.icon + ' ' + cat.name)}</h3>`)
      items.forEach((it) => {
        const st = (state.status[it.id] || 'none') as Status
        const note = (state.notes[it.id] || '').trim()
        parts.push(`<p>${STATUS_META[st].icon} ${esc(it.q)}${note ? ' <em>// ' + esc(note) + '</em>' : ''}</p>`)
      })
    })
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setStoreWarn('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `플롯 구멍 점검 (구멍 ${counts.hole}·의심 ${counts.suspect})`,
      bodyHtml: toBodyHtml(),
      meta: { 진행: `${checked}/${total} (${pct}%)`, 구멍: String(counts.hole), 의심: String(counts.suspect), 통과: String(counts.ok) },
    })
    showFlash(id ? "프로젝트 '기획' 폴더에 점검 결과를 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }

  const stashFlagged = () => {
    const flagged: string[] = []
    all.forEach(({ cat, items }) => items.forEach((it) => {
      const st = (state.status[it.id] || 'none') as Status
      if (st === 'hole' || st === 'suspect') {
        const note = (state.notes[it.id] || '').trim()
        flagged.push(`[${st === 'hole' ? '구멍' : '의심'}] (${cat.name}) ${it.q}${note ? ' → ' + note : ''}`)
      }
    }))
    if (!flagged.length) { showFlash('수집할 구멍·의심 항목이 없어요.'); return }
    addToStash({ kind: 'note', label: `플롯 구멍 ${counts.hole}·의심 ${counts.suspect}`, text: flagged.join('\n') })
    showFlash('수집함에 점검 결과를 담았어요')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const sub: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const input: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 6, flexShrink: 0 }
  const chip: React.CSSProperties = { fontSize: 11.5, padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border)', whiteSpace: 'nowrap' }

  const statBadge = (st: Status, n: number) => (
    <span key={st} style={{ ...chip, color: STATUS_META[st].color }}>
      <strong style={{ marginRight: 4 }}>{STATUS_META[st].icon}</strong>{STATUS_META[st].label} {n}
    </span>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🕳️"/> 플롯 구멍 탐지기</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || total === 0}
          title={hasProjectBridge() ? "점검 결과를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        {hasStash() && (
          <button className="linkbtn" onClick={stashFlagged} disabled={counts.hole + counts.suspect === 0} title="구멍·의심 항목을 수집함에 담기"><Emoji e="📎"/> 수집함</button>
        )}
        <button
          className="linkbtn"
          onClick={() => openToolLinked('continuity-notes')}
          title="연속성 노트 열기(장면별 시간·장소·소품 모순 점검)"
        ><Emoji e="🧩"/> 연속성 노트</button>
      </div>

      <div style={sub}>
        <input
          style={{ ...input, flex: 1, minWidth: 160 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="점검 항목·메모 검색…"
          aria-label="점검 항목 검색"
        />
        {query && <button style={tinyBtn} onClick={() => setQuery('')} title="검색 지우기">✕</button>}
        <button className="minibtn" onClick={randomCheck} title="미점검 항목 하나로 이동"><Emoji e="🎲"/> 무작위 점검</button>
        <button className="minibtn" onClick={() => copyText(buildReport(), '점검 보고서를 복사했어요')} disabled={total === 0} title="점검 보고서를 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={resetAll} disabled={checked === 0} title="모든 상태 초기화">↺ 초기화</button>
      </div>

      <div style={{ ...sub, gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>진행 {checked}/{total} · {pct}%</span>
        <div style={{ flex: 1, minWidth: 60, height: 7, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: counts.hole ? 'var(--warn)' : (pct >= 100 ? 'var(--ok)' : 'var(--accent)'), transition: 'width .25s ease' }} />
        </div>
        {statBadge('hole', counts.hole)}
        {statBadge('suspect', counts.suspect)}
        {statBadge('ok', counts.ok)}
      </div>

      {storeWarn && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{storeWarn}</div>}

      <div style={body}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 12px', fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
            '{query}' 에 해당하는 점검 항목이 없어요.
          </div>
        ) : filtered.map(({ cat, items }) => {
          const open = !state.collapsed[cat.id]
          const draft = drafts[cat.id] || ''
          const catHoles = items.filter((it) => state.status[it.id] === 'hole').length
          const catSus = items.filter((it) => state.status[it.id] === 'suspect').length
          return (
            <div key={cat.id} style={card}>
              <div style={catHead} onClick={() => toggleCollapse(cat.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 17, flexShrink: 0 }}><Emoji e={cat.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                {catHoles > 0 && <span style={{ ...chip, color: 'var(--warn)' }}>구멍 {catHoles}</span>}
                {catSus > 0 && <span style={{ ...chip, color: 'var(--accent)' }}>의심 {catSus}</span>}
                <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{items.length}</span>
              </div>

              {open && (
                <div>
                  {items.map((it) => {
                    const st = (state.status[it.id] || 'none') as Status
                    const sm = STATUS_META[st]
                    const noteOpen = editingNote === it.id
                    const noteVal = state.notes[it.id] || ''
                    const isHl = highlight === it.id
                    return (
                      <div
                        key={it.id}
                        ref={(el) => { rowRefs.current[it.id] = el }}
                        style={{
                          borderTop: '1px solid var(--border)',
                          padding: '9px 12px',
                          background: isHl ? 'var(--chrome-2)' : (st === 'hole' ? 'color-mix(in srgb, var(--warn) 9%, transparent)' : st === 'suspect' ? 'color-mix(in srgb, var(--accent) 9%, transparent)' : 'transparent'),
                          transition: 'background .3s ease',
                          boxShadow: isHl ? 'inset 3px 0 0 var(--accent-2)' : (st === 'hole' ? 'inset 3px 0 0 var(--warn)' : st === 'suspect' ? 'inset 3px 0 0 var(--accent)' : 'none'),
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                          <button
                            onClick={() => cycleStatus(it.id)}
                            title={`상태: ${sm.label} (눌러서 변경)`}
                            style={{
                              flexShrink: 0, width: 26, height: 26, borderRadius: 7, cursor: 'pointer', marginTop: 1,
                              border: `1.5px solid ${sm.color}`, background: 'var(--paper)', color: sm.color,
                              fontSize: 15, fontWeight: 800, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >{sm.icon}</button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              onClick={() => copyText(it.q, '질문을 복사했어요')}
                              title="클릭하면 질문 복사"
                              style={{ fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: st === 'ok' ? 'var(--muted)' : 'var(--text)' }}
                            >
                              {it.q}
                              {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                            </div>
                            {it.why && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>↳ {it.why}</div>}
                            {noteVal.trim() && !noteOpen && (
                              <div
                                onClick={() => setEditingNote(it.id)}
                                style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.55, padding: '5px 8px', borderRadius: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)', cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                title="눌러서 메모 수정"
                              ><Emoji e="📝"/> {noteVal}</div>
                            )}
                            {noteOpen && (
                              <div style={{ marginTop: 6 }}>
                                <textarea
                                  autoFocus
                                  value={noteVal}
                                  onChange={(e) => setNote(it.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditingNote(null) } }}
                                  placeholder="이 항목에 대한 메모(어느 장면이 의심스러운지, 어떻게 고칠지)…"
                                  rows={2}
                                  style={{ ...input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                                  aria-label="항목 메모"
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                                  <button style={tinyBtn} onClick={() => setEditingNote(null)}>닫기</button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <button style={{ ...tinyBtn, color: STATUS_META.ok.color, padding: '3px 6px', borderColor: st === 'ok' ? STATUS_META.ok.color : 'var(--border)' }} title="통과" onClick={() => setStatus(it.id, st === 'ok' ? 'none' : 'ok')}>✓</button>
                              <button style={{ ...tinyBtn, color: STATUS_META.suspect.color, padding: '3px 6px', borderColor: st === 'suspect' ? STATUS_META.suspect.color : 'var(--border)' }} title="의심" onClick={() => setStatus(it.id, st === 'suspect' ? 'none' : 'suspect')}>?</button>
                              <button style={{ ...tinyBtn, color: STATUS_META.hole.color, padding: '3px 6px', borderColor: st === 'hole' ? STATUS_META.hole.color : 'var(--border)' }} title="구멍" onClick={() => setStatus(it.id, st === 'hole' ? 'none' : 'hole')}>!</button>
                            </div>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                              <button style={tinyBtn} title={noteVal.trim() ? '메모 수정' : '메모 추가'} onClick={() => setEditingNote(noteOpen ? null : it.id)}><Emoji e="📝"/></button>
                              <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="이 항목 삭제" onClick={() => removeItem(cat.id, it.id, it.user)}>✕</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* 사용자 점검 항목 추가 */}
                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <input
                      style={{ ...input, flex: 1 }}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(cat.id) } }}
                      placeholder={`${cat.name}에 내 점검 질문 추가…`}
                      maxLength={200}
                      aria-label={`${cat.name} 점검 항목 추가`}
                    />
                    <button className="minibtn" onClick={() => addUserItem(cat.id)} disabled={!draft.trim()}>＋ 추가</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.65, paddingBottom: 4 }}>
          상태 버튼을 눌러 <strong style={{ color: 'var(--ok)' }}>통과</strong>/<strong style={{ color: 'var(--accent)' }}>의심</strong>/<strong style={{ color: 'var(--warn)' }}>구멍</strong>을 표시하고, 항목 질문을 누르면 복사됩니다. <Emoji e="📝"/>로 장면별 메모를 남기세요.
          '구멍·의심'으로 표시한 항목은 보고서 맨 위에 모아 정리되어 프로젝트 '기획' 폴더로 보낼 수 있어요. 모든 점검 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
