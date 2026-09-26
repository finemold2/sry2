// 스토리 타로 — 22 메이저 아르카나를 '서사 기능'(여정/시련/그림자/전환…)으로 매핑한 발상 덱.
//  막힌 장면을 셔플로 돌파한다. 정·역방향(빛/그림자) 해석, 스프레드(한 장/세 장 과거-현재-미래/다섯 장 여정),
//  라이브러리의 인물·장소를 끌어와 카드 의미를 실제 등장인물에 결합한 맞춤 프롬프트 생성.
//  결정론적 의사난수(문자열 해시 시드) + 시계 시드 둘 다 지원 — '오늘의 한 장'은 날짜 고정, '다시 섞기'는 무작위.
// 외부 네트워크/라이브러리 없음. react 와 ./linkbus 만 import.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  openToolLinked,
  type ToolPayload,
} from './linkbus'

export const meta = {
  id: 'story-tarot',
  name: '스토리 타로',
  icon: '🎴',
  group: '영감·발상',
  intro: '22 메이저 아르카나를 서사 기능으로 매핑한 발상 덱 — 셔플로 막힌 장면을 돌파하세요',
  w: 460,
  h: 620,
}

const LS = 'sry:tool:story-tarot'

// ── 메이저 아르카나 22장: 각 카드에 '서사 기능'을 부여 ───────────────────────
//  fn      : 한 줄 서사 기능(여정/시련/그림자/전환 등)
//  up      : 정방향(빛) — 장면을 앞으로 미는 동력
//  rev     : 역방향(그림자) — 장면을 비트는 함정/그늘
//  prompt  : 막힌 장면에 던지는 돌파 질문
//  beat    : 구조상 잘 맞는 비트(발단/상승/위기/절정/하강/결말 중)
interface Arcana {
  no: number
  name: string
  fn: string
  up: string
  rev: string
  prompt: string
  beat: string
  key: string // 한 단어 키워드(시각 배지용, 글리프 아님)
}
const DECK: Arcana[] = [
  { no: 0, name: '바보', fn: '시작 · 무모한 도약', key: '출발', beat: '발단',
    up: '아무것도 모른 채 길을 나서는 순수한 충동. 잃을 게 없어 가장 자유롭다.',
    rev: '준비 없는 자만이 부르는 추락. 경고를 무시한 대가가 닥친다.',
    prompt: '주인공이 결과를 전혀 모른 채 한 발 내딛게 만드는 사건은 무엇인가?' },
  { no: 1, name: '마법사', fn: '의지 · 가용 자원의 발견', key: '의지', beat: '발단',
    up: '필요한 도구가 이미 손안에 있음을 깨닫고 능동적으로 판을 짠다.',
    rev: '재능을 속임수로 쓰거나, 가진 패를 보고도 쓰지 못한다.',
    prompt: '주인공이 지금 손에 쥐고 있으면서도 아직 쓰지 못한 무기는 무엇인가?' },
  { no: 2, name: '여사제', fn: '비밀 · 감춰진 진실', key: '비밀', beat: '상승',
    up: '말하지 않은 직관과 봉인된 지식. 침묵 속에 답이 잠겨 있다.',
    rev: '감춘 것이 곪아 터지거나, 외면한 직관이 화를 부른다.',
    prompt: '이 장면에서 한 인물만 알고 아직 입 밖에 내지 않은 것은 무엇인가?' },
  { no: 3, name: '여황제', fn: '풍요 · 돌봄과 창조', key: '풍요', beat: '상승',
    up: '생명을 길러내는 따뜻한 힘. 관계와 토양이 무르익는다.',
    rev: '과보호가 숨을 막거나, 풍요가 게으름과 정체로 굳는다.',
    prompt: '누군가의 보살핌이 오히려 주인공을 옭아매는 순간을 넣을 수 있을까?' },
  { no: 4, name: '황제', fn: '질서 · 권위와 통제', key: '질서', beat: '상승',
    up: '규칙과 구조로 세계를 다스리는 안정된 힘.',
    rev: '경직된 통제와 폭압. 질서가 사람을 짓누른다.',
    prompt: '주인공이 따라야 할 규칙과 진짜 옳은 것이 충돌하는 지점은 어디인가?' },
  { no: 5, name: '교황', fn: '전통 · 가르침과 신념', key: '신념', beat: '상승',
    up: '물려받은 지혜와 공동체의 믿음이 길을 안내한다.',
    rev: '맹목적 교리와 위선. 가르침이 족쇄가 된다.',
    prompt: '주인공이 의심 없이 믿어온 가르침이 흔들리는 계기를 만든다면?' },
  { no: 6, name: '연인', fn: '선택 · 가치의 갈림길', key: '선택', beat: '위기',
    up: '마음으로 하나가 되거나, 정체성을 건 결정을 내린다.',
    rev: '잘못된 짝, 분열, 유혹에 굴복하는 흔들림.',
    prompt: '주인공이 둘 중 하나만 가질 수 있는 두 가지 사랑(혹은 가치)은 무엇인가?' },
  { no: 7, name: '전차', fn: '돌파 · 의지로 밀어붙임', key: '돌파', beat: '상승',
    up: '상반된 힘을 통제해 한 방향으로 질주하는 승리의 추진력.',
    rev: '제어 잃은 폭주, 방향 없는 공격성, 자멸하는 질주.',
    prompt: '주인공이 모든 것을 걸고 정면 돌파를 택하면 무엇을 깔아뭉개게 되는가?' },
  { no: 8, name: '힘', fn: '인내 · 내면의 길들임', key: '인내', beat: '위기',
    up: '폭력이 아닌 부드러움으로 야수를 다스리는 용기.',
    rev: '억눌린 분노, 자기 의심, 통제력 상실.',
    prompt: '주인공이 힘이 아니라 다정함으로 이겨야만 하는 상대는 누구인가?' },
  { no: 9, name: '은둔자', fn: '성찰 · 홀로 진실을 찾음', key: '성찰', beat: '하강',
    up: '세상에서 물러나 내면의 등불로 답을 비춘다.',
    rev: '고립이 도피가 되거나, 지혜를 끌어안고 숨어버린다.',
    prompt: '주인공이 혼자가 되어서야 비로소 보게 되는 진실은 무엇인가?' },
  { no: 10, name: '운명의 수레바퀴', fn: '전환 · 거스를 수 없는 변화', key: '전환', beat: '위기',
    up: '운이 돌고 판이 뒤집힌다. 우연이 운명이 된다.',
    rev: '내리막의 불운, 통제 밖의 추락, 반복되는 악순환.',
    prompt: '주인공의 의지와 무관하게 모든 판을 뒤집는 사건을 끼워 넣는다면?' },
  { no: 11, name: '정의', fn: '심판 · 인과의 청산', key: '심판', beat: '위기',
    up: '저지른 일에 합당한 결과가 돌아온다. 진실이 저울에 오른다.',
    rev: '부당한 판결, 책임 회피, 비뚤어진 저울.',
    prompt: '주인공이 과거에 저지른 일의 대가를 지금 치르게 한다면 무엇인가?' },
  { no: 12, name: '매달린 사람', fn: '정지 · 관점의 전복', key: '전복', beat: '하강',
    up: '거꾸로 매달려 세상을 새로 본다. 멈춤이 깨달음을 준다.',
    rev: '무의미한 희생, 빠져나오지 못하는 교착, 순교 흉내.',
    prompt: '주인공이 한 발도 못 움직일 때, 멈춤 자체가 답이 되는 장면은?' },
  { no: 13, name: '죽음', fn: '종말 · 강제된 끝과 변형', key: '종말', beat: '절정',
    up: '한 시대가 끝나야 다음이 시작된다. 낡은 자아의 매장.',
    rev: '끝을 거부한 채 시체를 끌어안고 변화를 막는다.',
    prompt: '주인공이 반드시 버려야만 다음으로 갈 수 있는 것은 무엇인가?' },
  { no: 14, name: '절제', fn: '연금 · 대립의 융합', key: '균형', beat: '하강',
    up: '상극을 섞어 새로운 것을 빚는 끈기. 중용과 치유.',
    rev: '과잉과 불균형, 섞이지 못해 부패하는 조합.',
    prompt: '서로 못 어울리는 두 인물(혹은 힘)을 한 그릇에 섞으면 무엇이 태어나는가?' },
  { no: 15, name: '악마', fn: '속박 · 욕망의 사슬', key: '속박', beat: '위기',
    up: '쾌락·집착·중독에 스스로를 묶는다. 그림자의 유혹.',
    rev: '사슬을 끊고 벗어나거나, 더 깊은 어둠으로 빠진다.',
    prompt: '주인공이 끊지 못하면서도 끊었다고 믿는 욕망의 사슬은 무엇인가?' },
  { no: 16, name: '탑', fn: '붕괴 · 거짓 토대의 파괴', key: '붕괴', beat: '절정',
    up: '거짓 위에 세운 모든 것이 한순간에 무너진다. 충격적 각성.',
    rev: '재앙을 미루다 더 크게 터지거나, 폐허에 매달린다.',
    prompt: '주인공이 안전하다 믿은 것이 단숨에 무너지는 사건은 무엇인가?' },
  { no: 17, name: '별', fn: '희망 · 폐허 뒤의 회복', key: '희망', beat: '하강',
    up: '무너진 자리에 다시 빛이 든다. 치유와 새 약속.',
    rev: '꺼져가는 희망, 냉소, 길을 잃은 신앙.',
    prompt: '모든 것을 잃은 뒤에도 주인공이 끝내 붙드는 작은 빛은 무엇인가?' },
  { no: 18, name: '달', fn: '환영 · 불안과 착란', key: '환영', beat: '위기',
    up: '진실과 거짓이 뒤섞인 안갯속. 무의식과 직관의 영역.',
    rev: '두려움이 걷히거나, 망상에 더 깊이 빠진다.',
    prompt: '주인공이 본 것이 진짜였는지 끝내 확신하지 못하게 만든다면?' },
  { no: 19, name: '태양', fn: '명료 · 드러난 진실의 기쁨', key: '명료', beat: '결말',
    up: '안개가 걷히고 모든 것이 환히 드러난다. 활력과 성취.',
    rev: '과시·자만, 혹은 빛이 가린 미세한 그늘.',
    prompt: '마침내 모든 것이 밝혀졌을 때, 주인공의 가장 큰 기쁨은 무엇인가?' },
  { no: 20, name: '심판', fn: '각성 · 부름과 부활', key: '각성', beat: '결말',
    up: '지난 삶을 결산하고 더 높은 부름에 응답한다. 거듭남.',
    rev: '부름을 외면하거나, 자기 단죄에 갇힌다.',
    prompt: '주인공이 과거를 청산하고 전혀 다른 사람으로 일어서는 순간은?' },
  { no: 21, name: '세계', fn: '완성 · 여정의 통합', key: '완성', beat: '결말',
    up: '모든 조각이 제자리를 찾아 하나의 원을 이룬다. 귀환과 통합.',
    rev: '미완의 마무리, 닫지 못한 고리, 떠나지 못함.',
    prompt: '주인공의 여정을 하나로 닫는 마지막 조각은 무엇이어야 하는가?' },
]

// ── 스프레드(배열) 정의 ──────────────────────────────────────────────────
interface Spread { id: string; name: string; n: number; roles: { role: string; q: string }[] }
const SPREADS: Spread[] = [
  { id: 'one', name: '한 장 · 막힌 곳 돌파', n: 1, roles: [
    { role: '돌파의 한 장', q: '지금 이 장면에 필요한 단 하나의 힘' },
  ] },
  { id: 'three', name: '세 장 · 과거 / 현재 / 미래', n: 3, roles: [
    { role: '과거', q: '여기까지 끌고 온 뿌리' },
    { role: '현재', q: '지금 인물을 옥죄는 핵심' },
    { role: '미래', q: '이대로 가면 향하는 곳' },
  ] },
  { id: 'cross', name: '다섯 장 · 인물의 여정', n: 5, roles: [
    { role: '부름', q: '주인공을 끌어낸 사건' },
    { role: '장애', q: '길을 막는 시련' },
    { role: '그림자', q: '맞서야 할 내면의 어둠' },
    { role: '조력', q: '뜻밖에 손 내미는 힘' },
    { role: '귀결', q: '여정이 닿는 변화' },
  ] },
]

// ── 결정론적 의사난수(문자열 해시 시드) ──────────────────────────────────
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// 시드 기반 셔플 + 정/역방향 결정
interface DrawnCard { card: Arcana; reversed: boolean; role: string; q: string }
function drawSpread(spread: Spread, seed: number): DrawnCard[] {
  const rnd = mulberry32(seed)
  const idx = DECK.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const picks = idx.slice(0, spread.n)
  return picks.map((p, i) => ({
    card: DECK[p],
    reversed: rnd() < 0.4, // 40% 역방향(그림자)
    role: spread.roles[i].role,
    q: spread.roles[i].q,
  }))
}

// 오늘 날짜 시드(YYYY-MM-DD)
function todaySeed(): number {
  const d = new Date()
  const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  return hashSeed('story-tarot:' + k)
}

// HTML 이스케이프(프로젝트 본문 주입 안전화)
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 장의 해석 텍스트(라이브러리 인물명 대입)
function interpret(d: DrawnCard, hero: string): { meaning: string; prompt: string } {
  const meaning = d.reversed ? d.card.rev : d.card.up
  let prompt = d.card.prompt
  if (hero) prompt = prompt.replace(/주인공/g, hero)
  return { meaning, prompt }
}

interface SavedSpread {
  id: string
  when: number
  spreadName: string
  hero: string
  cards: { no: number; reversed: boolean; role: string }[]
}

interface Persist {
  spreadId: string
  heroName: string
  note: string
  saved: SavedSpread[]
}
function loadPersist(): Persist {
  const base: Persist = { spreadId: 'three', heroName: '', note: '', saved: [] }
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        spreadId: typeof p.spreadId === 'string' ? p.spreadId : base.spreadId,
        heroName: typeof p.heroName === 'string' ? p.heroName : '',
        note: typeof p.note === 'string' ? p.note : '',
        saved: Array.isArray(p.saved) ? p.saved.filter((s: unknown) => s && typeof (s as SavedSpread).id === 'string') : [],
      }
    }
  } catch { /* ignore */ }
  return base
}

export default function StoryTarot({ payload }: { payload?: ToolPayload }) {
  const persisted = useRef<Persist>(loadPersist())
  const [spreadId, setSpreadId] = useState<string>(persisted.current.spreadId)
  const [heroName, setHeroName] = useState<string>(persisted.current.heroName)
  const [note, setNote] = useState<string>(persisted.current.note)
  const [saved, setSaved] = useState<SavedSpread[]>(persisted.current.saved)
  const [seed, setSeed] = useState<number>(() => todaySeed())
  const [restored, setRestored] = useState<DrawnCard[] | null>(null) // 보관함에서 직접 복원한 카드(있으면 시드보다 우선)
  const [flipped, setFlipped] = useState<Record<number, boolean>>({}) // 카드별 펼침(앞면) 상태
  const [tab, setTab] = useState<'draw' | 'saved'>('draw')
  const [toast, setToast] = useState('')
  const [dropOn, setDropOn] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPayloadRef = useRef<string | null>(null) // 동일 payload 재처리(재섞임) 방지 가드

  const characters = useLibraryList('characters')
  const places = useLibraryList('places')

  const spread = useMemo(() => SPREADS.find((s) => s.id === spreadId) || SPREADS[0], [spreadId])
  const drawn = useMemo(() => restored || drawSpread(spread, seed), [restored, spread, seed])

  // payload 로 들어온 텍스트/인물명 수용
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : ''
    const h = typeof payload.hero === 'string' ? payload.hero
      : typeof payload.name === 'string' ? payload.name : ''
    // 동일 payload 가 다시 들어오면(부모 리렌더 등) 재섞임을 막는다 — 결정론 보장
    const sig = (h || '') + '\x00' + (t || '')
    if (lastPayloadRef.current === sig) return
    lastPayloadRef.current = sig
    if (h) setHeroName(h)
    if (t && !note) setNote(t.slice(0, 400))
    // 새 페이로드가 오면 새로 한 장 섞기 — hero/text 기반 결정론 시드(시계 시드 제거)
    setRestored(null)
    setSeed(hashSeed('payload:' + (h || '') + ':' + (t || '')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 영속 저장
  useEffect(() => {
    const p: Persist = { spreadId, heroName, note, saved }
    try { localStorage.setItem(LS, JSON.stringify(p)) } catch { /* graceful */ }
  }, [spreadId, heroName, note, saved])

  // 토스트 정리
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  // 셔플(무작위 시드) — 카드는 처음엔 뒷면, 펼치며 공개
  const shuffle = () => {
    setSeed((Math.random() * 0xffffffff) >>> 0)
    setRestored(null)
    setFlipped({})
  }
  const drawToday = () => {
    setSeed(todaySeed())
    setRestored(null)
    setFlipped({})
  }
  const flipAll = () => {
    const all: Record<number, boolean> = {}
    drawn.forEach((_, i) => { all[i] = true })
    setFlipped(all)
  }
  const flipOne = (i: number) => setFlipped((p) => ({ ...p, [i]: !p[i] }))

  // 좌측 바인더 문서 드롭 → 본문 텍스트를 장면 메모로 수용
  const onDrop = (e: React.DragEvent) => {
    setDropOn(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    if (item.character && item.character.name) setHeroName(item.character.name)
    const txt = (item.text || '').trim()
    if (txt) {
      setNote(txt.slice(0, 600))
      setSeed(hashSeed('drop:' + item.id + ':' + txt.length))
      setRestored(null)
      setFlipped({})
      flash(`〈${item.title}〉의 내용을 막힌 장면으로 받았습니다. 카드를 펼쳐보세요.`)
    } else {
      flash(`〈${item.title}〉를 받았습니다.`)
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDropOn(true) }
  }

  const allFlipped = drawn.length > 0 && drawn.every((_, i) => flipped[i])

  // 텍스트 직렬화(복사/스니펫/스태시)
  const asText = (): string => {
    const head = `[스토리 타로] ${spread.name}${heroName ? ` · 주인공: ${heroName}` : ''}`
    const body = drawn.map((d) => {
      const { meaning, prompt } = interpret(d, heroName)
      const dir = d.reversed ? '역방향(그림자)' : '정방향(빛)'
      return [
        `■ ${d.role} — ${d.card.no}. ${d.card.name} (${dir})`,
        `  기능: ${d.card.fn}`,
        `  의미: ${meaning}`,
        `  돌파 질문: ${prompt}`,
      ].join('\n')
    }).join('\n\n')
    const tail = note ? `\n\n[막힌 장면 메모]\n${note}` : ''
    return `${head}\n\n${body}${tail}`
  }

  const bodyHtml = (): string => {
    const rows = drawn.map((d) => {
      const { meaning, prompt } = interpret(d, heroName)
      const dir = d.reversed ? '역방향(그림자)' : '정방향(빛)'
      return [
        `<p><strong>${esc(d.role)} — ${d.card.no}. ${esc(d.card.name)} <span style="color:#888">(${dir})</span></strong></p>`,
        `<p>기능: ${esc(d.card.fn)}</p>`,
        `<p>의미: ${esc(meaning)}</p>`,
        `<p>돌파 질문: ${esc(prompt)}</p>`,
      ].join('')
    }).join('<hr/>')
    const memo = note ? `<hr/><p><strong>막힌 장면 메모</strong></p><p>${esc(note).replace(/\n/g, '<br/>')}</p>` : ''
    return `<p><strong>스토리 타로 · ${esc(spread.name)}</strong>${heroName ? ` <span style="color:#888">주인공: ${esc(heroName)}</span>` : ''}</p>${rows}${memo}`
  }

  const copy = () => {
    const t = asText()
    if (!navigator.clipboard) { flash('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(t).then(() => flash('스프레드를 클립보드에 복사했습니다.')).catch(() => flash('복사에 실패했습니다.'))
  }

  // 연계 1: 스니펫 라이브러리에 저장(다른 도구가 활용)
  const saveSnippet = () => {
    addToLibrary('snippets', {
      text: asText(),
      source: 'story-tarot',
      tags: ['타로', '발상', spread.name],
    })
    flash('스니펫 라이브러리에 저장했습니다. 다른 도구에서 불러 쓸 수 있어요.')
  }

  // 연계 2: 프로젝트 자료 '영감 메모'에 문서로 추가
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `타로 스프레드 — ${spread.name}${heroName ? ` (${heroName})` : ''}`,
      bodyHtml: bodyHtml(),
      synopsis: drawn.map((d) => `${d.card.name}${d.reversed ? '(역)' : ''}`).join(' · '),
      meta: { 스프레드: spread.name, 주인공: heroName || '미지정', 카드수: String(drawn.length) },
    })
    flash(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // 연계 3: 수집함에 담기
  const toStash = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'memo', label: `타로 ${spread.name}`, text: asText() })
    flash('수집함에 담았습니다.')
  }

  // 연계 4: 한 인물을 라이브러리에 메모 캐릭터로(현재 스프레드의 그림자/약점을 비밀로)
  const seedCharacter = () => {
    const shadow = drawn.find((d) => d.reversed) || drawn[0]
    const driver = drawn.find((d) => !d.reversed) || drawn[0]
    const name = heroName || `타로 인물 ${characters.length + 1}`
    addToLibrary('characters', {
      name,
      role: '타로에서 발상',
      fields: {
        name,
        goal: driver.card.prompt.replace(/주인공/g, name),
        flaw: `${shadow.card.name}(역): ${shadow.card.rev}`,
        secret: `${shadow.card.name}이(가) 가리키는 감춰진 동력`,
        arc: drawn.map((d) => `${d.role}: ${d.card.fn}`).join(' / '),
        notes: `스토리 타로 ${spread.name}에서 도출`,
      },
    })
    flash(`인물 〈${name}〉을(를) 라이브러리에 추가했습니다.`)
  }

  // 연계 5: 관련 도구를 데이터와 함께 열기
  const openRelated = (toolId: string) => {
    openToolLinked(toolId, {
      text: asText(),
      hero: heroName,
      tarot: drawn.map((d) => ({ name: d.card.name, fn: d.card.fn, reversed: d.reversed, role: d.role })),
    })
  }

  // 현재 스프레드를 도구 내부 보관함에 저장
  const saveCurrent = () => {
    const rec: SavedSpread = {
      id: 'sp_' + Date.now().toString(36),
      when: Date.now(),
      spreadName: spread.name,
      hero: heroName,
      cards: drawn.map((d) => ({ no: d.card.no, reversed: d.reversed, role: d.role })),
    }
    setSaved((prev) => [rec, ...prev].slice(0, 50))
    flash('이 스프레드를 보관함에 저장했습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const restoreSaved = (s: SavedSpread) => {
    const sp = SPREADS.find((x) => x.name === s.spreadName)
    if (sp) setSpreadId(sp.id)
    setHeroName(s.hero)
    // 저장된 카드 배열로 스프레드를 그대로 재구성(시드와 무관하게 직접 복원)
    const cards: DrawnCard[] = s.cards.map((c, i) => {
      const card = DECK.find((x) => x.no === c.no) || DECK[0]
      const sr = sp?.roles?.[i]
      return {
        card,
        reversed: !!c.reversed,
        role: c.role,
        q: sr ? sr.q : '',
      }
    })
    setRestored(cards)
    // 복원한 카드는 곧바로 펼쳐 보이도록
    const all: Record<number, boolean> = {}
    cards.forEach((_, i) => { all[i] = true })
    setFlipped(all)
    setTab('draw')
    flash('보관한 스프레드의 카드를 그대로 복원했습니다.')
  }

  // 스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }

  return (
    <div
      style={{ ...wrap, outline: dropOn ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={onDragOver}
      onDragLeave={() => setDropOn(false)}
      onDrop={onDrop}
    >
      <div style={hint}>
        22장의 메이저 아르카나를 <b>서사 기능</b>으로 다시 읽는 발상 덱입니다. 막힌 장면을 적고 카드를 펼쳐, 정방향(빛)과 역방향(그림자) 중 어느 쪽이 지금 필요한지 골라 돌파하세요. 좌측 바인더 문서를 끌어다 놓으면 그 내용을 받습니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('draw')} aria-pressed={tab === 'draw'}
          style={{ borderColor: tab === 'draw' ? 'var(--accent)' : 'var(--border)', color: tab === 'draw' ? 'var(--text)' : 'var(--muted)' }}>
          덱 펼치기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          보관함 ({saved.length})
        </button>
      </div>

      {tab === 'draw' && (
        <>
          {/* 스프레드 선택 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SPREADS.map((s) => (
              <button key={s.id} className="minibtn" onClick={() => { setSpreadId(s.id); setRestored(null); setFlipped({}) }} aria-pressed={spreadId === s.id}
                style={{ borderColor: spreadId === s.id ? 'var(--accent)' : 'var(--border)', color: spreadId === s.id ? 'var(--text)' : 'var(--muted)', fontSize: 11 }}>
                {s.name}
              </button>
            ))}
          </div>

          {/* 주인공 입력 + 라이브러리 인물 가져오기 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="field"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="주인공 이름(선택) — 질문에 자동 대입"
              style={{ flex: 1, minWidth: 140, fontSize: 13 }}
            />
            {characters.length > 0 && (
              <select
                className="field"
                value=""
                onChange={(e) => { if (e.target.value) setHeroName(e.target.value) }}
                style={{ fontSize: 12, maxWidth: 130 }}
                title="라이브러리 인물에서 선택"
              >
                <option value="">인물 선택…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 막힌 장면 메모 */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="막힌 장면을 한두 줄로 적어보세요 — 카드 해석의 배경이 됩니다."
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
          />

          {/* 컨트롤 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 110 }} onClick={shuffle}>다시 섞기</button>
            <button className="minibtn" onClick={drawToday} title="날짜에 고정된 결정론적 한 벌">오늘의 패</button>
            <button className="minibtn" onClick={flipAll} disabled={allFlipped}>모두 펼치기</button>
          </div>

          {/* 카드 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, paddingRight: 2 }}>
            {drawn.map((d, i) => {
              const open = !!flipped[i]
              const { meaning, prompt } = interpret(d, heroName)
              const accent = d.reversed ? 'var(--warn)' : 'var(--accent)'
              return (
                <div key={i} style={cardBox}>
                  {/* 헤더: 역할 + 정/역 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: accent, border: `1px solid ${accent}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                      {d.role}
                    </span>
                    <span style={{ flex: 1 }} />
                    {open && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.card.beat}</span>
                    )}
                  </div>

                  {!open ? (
                    // 뒷면(미공개) — 클릭하면 펼침
                    <button
                      onClick={() => flipOne(i)}
                      style={{
                        height: 86, borderRadius: 10, cursor: 'pointer',
                        border: '1px solid var(--border)',
                        background: 'repeating-linear-gradient(45deg, var(--panel), var(--panel) 8px, var(--paper) 8px, var(--paper) 16px)',
                        color: 'var(--muted)', fontSize: 13, letterSpacing: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="카드를 펼치기"
                    >
                      뒤집어 펼치기
                    </button>
                  ) : (
                    // 앞면(공개)
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        width: 56, minHeight: 80, borderRadius: 8, flexShrink: 0,
                        border: `1px solid ${accent}`, background: 'var(--paper)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                        transform: d.reversed ? 'rotate(180deg)' : 'none',
                      }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>{d.card.no}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.card.key}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 15 }}>{d.card.name}</b>
                          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{d.reversed ? '역방향 · 그림자' : '정방향 · 빛'}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 4px' }}>{d.card.fn} · {d.q}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>{meaning}</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 6, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
                          <span style={{ color: accent, fontWeight: 700 }}>돌파 질문: </span>{prompt}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button className="minibtn" style={{ fontSize: 11 }} onClick={() => flipOne(i)}>다시 덮기</button>
                          <button className="minibtn" style={{ fontSize: 11 }}
                            onClick={() => {
                              const cur = note ? note + '\n' : ''
                              setNote(cur + `→ [${d.card.name}${d.reversed ? '(역)' : ''}] ${prompt}`)
                              flash('돌파 질문을 메모에 옮겼습니다.')
                            }}>메모에 적용</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 산출/연계 */}
          {allFlipped && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={copy}>복사</button>
              <button className="minibtn" onClick={saveSnippet}>스니펫 저장</button>
              <button className="minibtn" onClick={saveCurrent}>보관함 저장</button>
            </div>
          )}

          <div className="linkbar" style={{ flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || !allFlipped}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !allFlipped ? '먼저 모든 카드를 펼치세요' : '프로젝트 자료 〈영감 메모〉에 추가'}>
              프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toStash} disabled={!hasStash() || !allFlipped}
              title={!hasStash() ? '수집함을 사용할 수 없습니다' : '수집함에 담기'}>
              수집함에 담기
            </button>
            <button className="linkbtn" onClick={seedCharacter} disabled={!allFlipped}
              title="현재 스프레드를 토대로 인물을 라이브러리에 추가">
              인물로 발상
            </button>
            <button className="linkbtn" onClick={() => openRelated('plot-twist-deck')} disabled={!allFlipped} title="반전 카드덱 열기">
              반전 카드덱
            </button>
            <button className="linkbtn" onClick={() => openRelated('hero-journey-map')} disabled={!allFlipped} title="영웅 여정 지도 열기">
              영웅 여정 지도
            </button>
          </div>

          {places.length > 0 && (
            <div style={hint}>라이브러리 장소 {places.length}곳도 배경으로 떠올려 보세요 — 예: 〈{places[0].name}〉에서 이 카드가 펼쳐진다면.</div>
          )}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 14px', lineHeight: 1.6 }}>
              보관한 스프레드가 없습니다. 카드를 모두 펼친 뒤 〈보관함 저장〉을 눌러보세요.
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} style={cardBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b style={{ fontSize: 13 }}>{s.spreadName}</b>
                {s.hero && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {s.hero}</span>}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(s.when).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                {s.cards.map((c, ci) => {
                  const card = DECK.find((x) => x.no === c.no)
                  return (
                    <span key={ci}>{ci > 0 ? ' · ' : ''}{c.role}: {card?.name || '?'}{c.reversed ? '(역)' : ''}</span>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="minibtn" style={{ fontSize: 11 }} onClick={() => restoreSaved(s)}>불러오기</button>
                <button className="minibtn" style={{ fontSize: 11, borderColor: 'var(--warn)', color: 'var(--warn)' }} onClick={() => removeSaved(s.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>{toast}</div>
      )}

      <div className="license-note">상징은 출발점일 뿐 — 같은 카드도 인물과 상황에 맞춰 자유롭게 비틀어 쓰세요. 모든 계산은 브라우저에서만 이뤄집니다.</div>
    </div>
  )
}
