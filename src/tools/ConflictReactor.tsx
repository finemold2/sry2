// 갈등 원자로 — 인물(당사자)들의 가치관·목표를 입력하면, 가치/목표의 충돌도를 계산해
//   가장 뜨거운 대립쌍을 찾고, 그 대립을 시드 기반(결정론적)으로 여러 갈래의 '충돌 연쇄 시나리오'로
//   분기 생성한다. 각 노드는 행동→반응→악화의 단계를 가지며, 분기마다 온도(긴장도)가 누적된다.
//   characters 라이브러리 수용/저장, 바인더 드롭/페이로드 수용, 시나리오를 프로젝트 자료에 추가.
// 자급식: react 와 ./linkbus 외 import 없음. 전부 로컬 계산. localStorage 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag, openToolLinked,
  type SharedCharacter, type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'conflict-reactor',
  name: '갈등 원자로',
  icon: '💥',
  group: '갈등',
  intro: '인물들의 가치관·목표를 넣으면 충돌 연쇄 시나리오를 분기 생성합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:conflict-reactor'

// ───────────────────────── 결정론적 의사난수(시드=문자열 해시) ─────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length) % arr.length] }

// ───────────────────────── 데이터 모델 ─────────────────────────
interface Agent {
  id: string
  name: string
  value: string   // 가치관(신념·원칙)
  goal: string    // 목표(욕망)
  fear: string    // 두려움(선택) — 압박 강화에 사용
}
interface State {
  agents: Agent[]
  topic: string          // 이 갈등의 무대/사건(선택)
  seed: number           // 분기 재생성용 시드
  selectedPair: string   // 'i-j'
  branchDepth: number    // 분기 깊이 2~4
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyAgent(): Agent { return { id: newId(), name: '', value: '', goal: '', fear: '' } }

function loadState(): State {
  const base: State = { agents: [emptyAgent(), emptyAgent()], topic: '', seed: 1, selectedPair: '', branchDepth: 3 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    const agents: Agent[] = Array.isArray(p?.agents)
      ? p.agents.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
        id: String(x.id || newId()),
        name: String(x.name || ''),
        value: String(x.value || ''),
        goal: String(x.goal || ''),
        fear: String(x.fear || ''),
      }))
      : base.agents
    return {
      agents: agents.length ? agents : base.agents,
      topic: String(p?.topic || ''),
      seed: Number(p?.seed) || 1,
      selectedPair: typeof p?.selectedPair === 'string' ? p.selectedPair : '',
      branchDepth: [2, 3, 4].includes(Number(p?.branchDepth)) ? Number(p.branchDepth) : 3,
    }
  } catch { return base }
}

// ───────────────────────── 충돌도 계산(결정론) ─────────────────────────
// 대립 신호어: 같은 축의 반대편 단어가 두 인물에 나뉘어 등장하면 충돌 가산.
const OPPOSITION_AXES: string[][] = [
  ['자유', '통제', '질서', '복종', '규율'],
  ['정의', '복수', '용서', '처벌', '자비'],
  ['진실', '거짓', '비밀', '폭로', '은폐'],
  ['사랑', '의무', '명예', '욕망', '책임'],
  ['생존', '희생', '구원', '파괴'],
  ['돈', '명성', '권력', '안전', '가족'],
  ['전통', '변화', '혁명', '보수', '진보'],
  ['개인', '집단', '국가', '신', '믿음'],
  ['이성', '감정', '본능', '신념'],
  ['승리', '평화', '타협', '지배'],
]
function tokenize(s: string): string[] {
  return (s || '').toLowerCase().split(/[^0-9a-z가-힣]+/).filter((w) => w.length >= 2)
}
function agentText(a: Agent): string { return [a.value, a.goal, a.fear].join(' ') }

// 두 인물 사이 충돌 온도(0~100). 결정론적.
function tensionScore(a: Agent, b: Agent): number {
  const ta = new Set(tokenize(agentText(a)))
  const tb = new Set(tokenize(agentText(b)))
  if (ta.size === 0 || tb.size === 0) return 0
  let score = 0
  // 1) 같은 축 서로 다른 극 → 직접 대립(강하게 가산)
  OPPOSITION_AXES.forEach((axis) => {
    const inA = axis.filter((w) => [...ta].some((t) => t.includes(w)))
    const inB = axis.filter((w) => [...tb].some((t) => t.includes(w)))
    inA.forEach((wa) => inB.forEach((wb) => { if (wa !== wb) score += 14 }))
  })
  // 2) 목표 충돌: 한쪽 목표 토큰이 다른쪽 두려움/가치에 등장 → 위협 관계
  const goalsA = new Set(tokenize(a.goal)), goalsB = new Set(tokenize(b.goal))
  const fvA = new Set(tokenize(a.value + ' ' + a.fear)), fvB = new Set(tokenize(b.value + ' ' + b.fear))
  goalsA.forEach((g) => { if (fvB.has(g)) score += 10 })
  goalsB.forEach((g) => { if (fvA.has(g)) score += 10 })
  // 3) 같은 자원/목표를 동시에 추구 → 경쟁(겹침이 클수록 가산)
  let overlap = 0
  goalsA.forEach((g) => { if (goalsB.has(g)) overlap++ })
  score += overlap * 8
  // 4) 가치 토큰 자체 겹침이 적을수록(이질성) 소폭 가산
  let valOverlap = 0
  const vA = new Set(tokenize(a.value)), vB = new Set(tokenize(b.value))
  vA.forEach((v) => { if (vB.has(v)) valOverlap++ })
  const valDiff = Math.max(vA.size, vB.size) - valOverlap
  score += Math.min(valDiff, 5) * 2
  return Math.max(0, Math.min(100, Math.round(score)))
}

// 대립 축 라벨(설명용) — 두 인물 사이 가장 두드러진 충돌 축을 찾는다.
function dominantAxis(a: Agent, b: Agent): string {
  const ta = new Set(tokenize(agentText(a)))
  const tb = new Set(tokenize(agentText(b)))
  let best = ''
  let bestN = 0
  OPPOSITION_AXES.forEach((axis) => {
    const inA = axis.filter((w) => [...ta].some((t) => t.includes(w)))
    const inB = axis.filter((w) => [...tb].some((t) => t.includes(w)))
    let n = 0
    inA.forEach((wa) => inB.forEach((wb) => { if (wa !== wb) { n++ } }))
    if (n > bestN) { bestN = n; const wa = inA[0]; const wb = inB.find((x) => x !== wa) || inB[0]; best = `${wa} ↔ ${wb}` }
  })
  return best
}

// ───────────────────────── 분기 시나리오 생성(결정론) ─────────────────────────
type Branch = 'escalate' | 'concede' | 'deceive'
interface BranchDef { key: Branch; label: string; heat: number; tone: string }
const BRANCHES: BranchDef[] = [
  { key: 'escalate', label: '격화', heat: 22, tone: '정면으로 부딪쳐 판을 키운다' },
  { key: 'concede', label: '후퇴·타협', heat: 6, tone: '한발 물러서지만 불씨를 남긴다' },
  { key: 'deceive', label: '기만·우회', heat: 14, tone: '겉으로 협력하며 뒤로 칼을 간다' },
]
function branchDef(k: Branch): BranchDef { return BRANCHES.find((b) => b.key === k) || BRANCHES[0] }

// 액션/반응 어휘 — 결정론적 조합. 화면 텍스트에 생이모지 없음.
const ACTIONS: Record<Branch, string[]> = {
  escalate: ['공개적으로 맞선다', '최후통첩을 던진다', '동맹을 끌어모은다', '약점을 폭로한다', '실력 행사에 나선다'],
  concede: ['표면적으로 양보한다', '시간을 벌며 물러난다', '제3자에게 중재를 청한다', '조건부 휴전을 제안한다', '핵심만 사수하고 후퇴한다'],
  deceive: ['거짓 합의를 내민다', '정보를 흘려 함정을 판다', '내통자를 심는다', '약속을 미끼로 쓴다', '두 얼굴로 양다리를 건다'],
}
const REACTIONS: string[] = [
  '의심을 품고 경계를 강화한다', '예상 밖의 카드로 반격한다', '주변을 자기 편으로 돌린다',
  '결정적 증거를 손에 넣는다', '감정이 폭발해 선을 넘는다', '약속을 빌미로 역공한다',
  '뒤늦게 배신을 알아챈다', '값비싼 대가를 치르고 버틴다',
]
const WORSEN: string[] = [
  '돌이킬 수 없는 선을 넘는다', '제3자가 끼어들어 판이 뒤집힌다', '숨겨둔 비밀이 새어 나온다',
  '신뢰가 완전히 무너진다', '희생자가 생긴다', '시간 제한이 코앞에 닥친다',
  '양쪽 모두 퇴로가 막힌다', '엉뚱한 사람이 대가를 치른다',
]

interface ScenarioNode {
  id: string
  depth: number
  branch: Branch
  actor: string
  target: string
  heat: number      // 누적 온도
  action: string
  reaction: string
  worsen: string
  children: ScenarioNode[]
}

// 한 대립쌍에서 분기 트리 생성. (A→B 행동, B의 반응, 악화) × depth.
function buildTree(a: Agent, b: Agent, seed: number, baseHeat: number, depth: number): ScenarioNode[] {
  const aName = a.name.trim() || '인물A'
  const bName = b.name.trim() || '인물B'
  const grow = (parentId: string, d: number, heat: number, actorIsA: boolean): ScenarioNode[] => {
    if (d > depth) return []
    return BRANCHES.map((bd) => {
      const actor = actorIsA ? aName : bName
      const target = actorIsA ? bName : aName
      const rng = mulberry32(hashStr(`${seed}|${parentId}|${bd.key}|${d}|${actor}`))
      const action = pick(rng, ACTIONS[bd.key])
      const reaction = pick(rng, REACTIONS)
      const worsen = pick(rng, WORSEN)
      const nh = Math.min(100, heat + bd.heat + Math.floor(rng() * 6))
      const node: ScenarioNode = {
        id: `${parentId}>${bd.key}`,
        depth: d, branch: bd.key, actor, target,
        heat: nh, action, reaction, worsen,
        children: grow(`${parentId}>${bd.key}`, d + 1, nh, !actorIsA),
      }
      return node
    })
  }
  return grow('root', 1, baseHeat, true)
}

// 한 경로(루트→리프)를 따라 시나리오 문장으로 직렬화.
function pathToLines(path: ScenarioNode[]): string[] {
  return path.map((n, i) => {
    const bd = branchDef(n.branch)
    return `${i + 1}. [${bd.label} · 온도 ${n.heat}] ${n.actor} → ${n.target}: ${n.action}. ${n.target}은(는) ${n.reaction}. 그 결과 ${n.worsen}.`
  })
}

// 가장 뜨거운 리프 경로(엔딩 후보) 추출.
function hottestPaths(roots: ScenarioNode[], limit: number): ScenarioNode[][] {
  const paths: ScenarioNode[][] = []
  const walk = (node: ScenarioNode, acc: ScenarioNode[]) => {
    const next = [...acc, node]
    if (node.children.length === 0) { paths.push(next); return }
    node.children.forEach((c) => walk(c, next))
  }
  roots.forEach((r) => walk(r, []))
  paths.sort((x, y) => (y[y.length - 1].heat) - (x[x.length - 1].heat))
  return paths.slice(0, limit)
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ConflictReactor({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<State | null>(null)
  if (!init.current) init.current = loadState()
  const [agents, setAgents] = useState<Agent[]>(init.current.agents)
  const [topic, setTopic] = useState(init.current.topic)
  const [seed, setSeed] = useState(init.current.seed)
  const [selectedPair, setSelectedPair] = useState(init.current.selectedPair)
  const [branchDepth, setBranchDepth] = useState(init.current.branchDepth)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [dropping, setDropping] = useState(false)
  const mounted = useRef(true)

  const characters = useLibraryList('characters')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ agents, topic, seed, selectedPair, branchDepth })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 입력이 사라질 수 있어요.') }
  }, [agents, topic, seed, selectedPair, branchDepth])

  // 안내 자동 소거
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => { if (mounted.current) setNote('') }, 2600)
    return () => window.clearTimeout(t)
  }, [note])

  // payload.text / payload.characters 수용 — 최초 1회
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text.trim() : ''
    if (t && !topic) setTopic(t.slice(0, 200))
    // payload.agents(이전 도구가 보낸 가치/목표 묶음) 수용
    const pa = (payload as any).agents
    if (Array.isArray(pa) && pa.length) {
      const mapped: Agent[] = pa.slice(0, 6).map((x: any) => ({
        id: newId(),
        name: String(x?.name || ''),
        value: String(x?.value || ''),
        goal: String(x?.goal || ''),
        fear: String(x?.fear || ''),
      }))
      if (mapped.some((m) => m.name || m.value || m.goal)) setAgents(mapped)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setAgent = (id: string, patch: Partial<Agent>) =>
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const addAgent = () => setAgents((prev) => (prev.length >= 6 ? prev : [...prev, emptyAgent()]))
  const removeAgent = (id: string) =>
    setAgents((prev) => (prev.length <= 2 ? prev : prev.filter((a) => a.id !== id)))

  // 라이브러리 캐릭터 → 당사자 채우기(빈 슬롯 우선, 없으면 추가)
  const fillFromCharacter = (c: SharedCharacter) => {
    const f = c.fields || {}
    const value = (f.value || c.personality || '').toString().trim()
    const goal = (f.goal || c.goal || '').toString().trim()
    const fear = (f.fear || '').toString().trim()
    const a: Agent = { id: newId(), name: (c.name || f.name || '').toString().trim(), value, goal, fear }
    setAgents((prev) => {
      const emptyIdx = prev.findIndex((x) => !x.name.trim() && !x.value.trim() && !x.goal.trim())
      if (emptyIdx >= 0) { const next = prev.slice(); next[emptyIdx] = { ...a, id: prev[emptyIdx].id }; return next }
      if (prev.length >= 6) { setNote('당사자는 최대 6명까지예요.'); return prev }
      return [...prev, a]
    })
    setNote(`'${a.name || '인물'}' 추가됨`)
  }

  // 바인더 드롭 → 캐릭터 카드면 가치/목표 추출
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropping(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    const ch = item.character || {}
    const value = (ch.value || ch.personality || '').toString().trim()
    const goal = (ch.goal || ch.motivation || '').toString().trim()
    const fear = (ch.fear || '').toString().trim()
    const name = (ch.name || item.title || '').toString().trim()
    if (!name && !value && !goal) {
      // 본문 텍스트만 있는 문서면 무대/사건으로 받음
      if (item.text) { setTopic(item.text.slice(0, 200)); setNote('문서 내용을 무대/사건으로 받았어요.') }
      return
    }
    const a: Agent = { id: newId(), name, value, goal, fear }
    setAgents((prev) => {
      const emptyIdx = prev.findIndex((x) => !x.name.trim() && !x.value.trim() && !x.goal.trim())
      if (emptyIdx >= 0) { const next = prev.slice(); next[emptyIdx] = { ...a, id: prev[emptyIdx].id }; return next }
      if (prev.length >= 6) return prev
      return [...prev, a]
    })
    setNote(`'${name || '인물'}' 드롭으로 추가됨`)
  }

  // ── 충돌 행렬 계산 ──
  const filled = useMemo(() => agents.filter((a) => a.name.trim() || a.value.trim() || a.goal.trim()), [agents])
  const pairs = useMemo(() => {
    const out: { key: string; a: Agent; b: Agent; score: number; axis: string }[] = []
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i], b = agents[j]
        if (!(a.name.trim() || a.value.trim() || a.goal.trim())) continue
        if (!(b.name.trim() || b.value.trim() || b.goal.trim())) continue
        out.push({ key: `${a.id}|${b.id}`, a, b, score: tensionScore(a, b), axis: dominantAxis(a, b) })
      }
    }
    out.sort((x, y) => y.score - x.score)
    return out
  }, [agents])

  // 선택된 대립쌍(없으면 가장 뜨거운 쌍)
  const activePair = useMemo(() => {
    if (!pairs.length) return null
    return pairs.find((p) => p.key === selectedPair) || pairs[0]
  }, [pairs, selectedPair])

  const tree = useMemo(() => {
    if (!activePair) return [] as ScenarioNode[]
    return buildTree(activePair.a, activePair.b, hashStr(`${seed}|${activePair.key}|${topic}`), Math.round(activePair.score / 2), branchDepth)
  }, [activePair, seed, topic, branchDepth])

  const hotPaths = useMemo(() => hottestPaths(tree, 3), [tree])

  const reactorTemp = pairs.length ? pairs[0].score : 0

  // ── 라이브러리 저장: 현재 당사자들을 characters 로 ──
  const saveAgentsToLibrary = () => {
    let n = 0
    filled.forEach((a) => {
      if (!a.name.trim()) return
      addToLibrary('characters', {
        name: a.name.trim(),
        fields: {
          name: a.name.trim(),
          ...(a.value.trim() ? { value: a.value.trim() } : {}),
          ...(a.goal.trim() ? { goal: a.goal.trim() } : {}),
          ...(a.fear.trim() ? { fear: a.fear.trim() } : {}),
        },
        source: 'conflict-reactor',
      })
      n++
    })
    setNote(n ? `${n}명을 인물 라이브러리에 저장했어요.` : '이름이 있는 당사자가 없어요.')
  }

  // ── 프로젝트 시나리오 문서 ──
  const scenarioBodyHtml = (): string => {
    if (!activePair) return ''
    const parts: string[] = []
    parts.push(`<p><b>대립:</b> ${escHtml(activePair.a.name || '인물A')} ↔ ${escHtml(activePair.b.name || '인물B')} (충돌 온도 ${activePair.score})</p>`)
    if (activePair.axis) parts.push(`<p><b>핵심 대립 축:</b> ${escHtml(activePair.axis)}</p>`)
    if (topic.trim()) parts.push(`<p><b>무대/사건:</b> ${escHtml(topic.trim())}</p>`)
    parts.push('<hr>')
    parts.push('<p><b>유력 연쇄 시나리오 (가장 뜨거운 분기)</b></p>')
    hotPaths.forEach((path, idx) => {
      const last = path[path.length - 1]
      parts.push(`<p><b>분기 ${idx + 1} — 최종 온도 ${last.heat}</b></p>`)
      parts.push('<ol>' + pathToLines(path).map((l) => `<li>${escHtml(l.replace(/^\d+\.\s*/, ''))}</li>`).join('') + '</ol>')
    })
    return parts.join('')
  }
  const toProject = () => {
    if (!activePair) { setNote('먼저 당사자 2명 이상에 가치/목표를 입력하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '갈등',
      title: `갈등 연쇄 — ${activePair.a.name || '인물A'} vs ${activePair.b.name || '인물B'}`,
      bodyHtml: scenarioBodyHtml(),
      synopsis: `${activePair.a.name || '인물A'} ↔ ${activePair.b.name || '인물B'} (온도 ${activePair.score}) ${activePair.axis}`.trim(),
      meta: { 충돌온도: String(activePair.score), 대립축: activePair.axis || '—' },
    })
    setNote(id ? '프로젝트 자료에 시나리오 문서 추가됨' : '프로젝트 추가에 실패했어요.')
  }

  const toStash = () => {
    if (!activePair) { setNote('먼저 대립쌍을 만들어 주세요.'); return }
    if (!hasStash()) { setNote('수집함에 연결되어 있지 않습니다.'); return }
    const txt = hotPaths.map((p, i) => `[분기 ${i + 1}]\n` + pathToLines(p).join('\n')).join('\n\n')
    addToStash({ kind: 'memo', label: `갈등 연쇄: ${activePair.a.name || 'A'} vs ${activePair.b.name || 'B'}`, text: txt })
    setNote('수집함에 담았어요.')
  }

  const openInBuilder = () => {
    if (!activePair) return
    openToolLinked('conflict-builder', {
      character: activePair.a.name || '',
      desire: activePair.a.goal || '',
      stakes: activePair.b.goal || '',
      text: `${activePair.a.name || 'A'} ↔ ${activePair.b.name || 'B'} / 축: ${activePair.axis}`,
    })
  }

  const reroll = () => { setSeed((s) => (s % 999999) + 7); setExpanded({}) }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 38, lineHeight: 1.45, fontFamily: 'inherit' }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 10, background: 'var(--panel)' }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, margin: '4px 0 8px', color: 'var(--text)' }

  const heatColor = (h: number) => h >= 70 ? '#e5484d' : h >= 45 ? '#e08c00' : h >= 25 ? '#d6a700' : '#8a8f98'

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropping) setDropping(true) } }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <div style={header}>
        <strong style={{ fontSize: 14 }}>갈등 원자로</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>당사자 {filled.length}명</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: heatColor(reactorTemp), fontWeight: 700 }} title="가장 뜨거운 대립쌍의 충돌 온도">원자로 온도 {reactorTemp}</span>
      </div>

      {note && <div style={{ padding: '5px 12px', fontSize: 11.5, color: 'var(--accent)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}
      {dropping && <div style={{ padding: '5px 12px', fontSize: 11.5, color: 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>여기에 놓으면 인물의 가치·목표를 당사자로 받습니다</div>}

      <div style={scroll}>
        {/* 무대/사건 */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>무대 · 사건 (선택)</div>
          <input style={input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="이 충돌이 벌어지는 상황. 예: 무너진 회사의 마지막 이사회" maxLength={200} />
        </div>

        {/* 라이브러리에서 불러오기 */}
        {characters.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={label}>인물 라이브러리에서 당사자 채우기</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {characters.slice(0, 12).map((c) => (
                <button key={c.id} className="minibtn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => fillFromCharacter(c)} title="이 인물의 가치관/목표를 당사자로 가져옵니다">{c.name || '이름없음'}</button>
              ))}
            </div>
          </div>
        )}

        {/* 당사자 입력 */}
        <div style={sectionTitle}>당사자 — 가치관과 목표</div>
        {agents.map((a, i) => (
          <div key={a.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>당사자 {i + 1}</span>
              <span style={{ flex: 1 }} />
              {agents.length > 2 && (
                <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeAgent(a.id)} title="이 당사자 제거">제거</button>
              )}
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={label}>이름</div>
              <input style={input} value={a.name} onChange={(e) => setAgent(a.id, { name: e.target.value })} placeholder="예: 단장 서윤" maxLength={40} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={label}>가치관 · 신념</div>
              <textarea style={area} value={a.value} onChange={(e) => setAgent(a.id, { value: e.target.value })} placeholder="무엇을 옳다 여기는가. 예: 질서와 복종이 모두를 지킨다" maxLength={200} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={label}>목표 · 욕망</div>
              <textarea style={area} value={a.goal} onChange={(e) => setAgent(a.id, { goal: e.target.value })} placeholder="무엇을 손에 넣으려 하는가. 예: 조직의 권력을 장악한다" maxLength={200} />
            </div>
            <div>
              <div style={label}>두려움 (선택)</div>
              <input style={input} value={a.fear} onChange={(e) => setAgent(a.id, { fear: e.target.value })} placeholder="잃을까 두려운 것. 예: 통제력을 잃는 것" maxLength={120} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className="minibtn" onClick={addAgent} disabled={agents.length >= 6}>＋ 당사자 추가</button>
          <button className="minibtn" onClick={saveAgentsToLibrary} title="이름 있는 당사자를 인물 라이브러리에 저장">인물 라이브러리에 저장</button>
        </div>

        {/* 충돌 행렬 */}
        <div style={sectionTitle}>충돌 행렬 — 어느 쌍이 가장 뜨거운가</div>
        {pairs.length === 0 ? (
          <div style={{ padding: 14, border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--muted)', fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
            당사자 2명 이상에 <b>가치관</b>과 <b>목표</b>를 입력하면<br />충돌도가 자동 계산됩니다.<br />
            <span style={{ fontSize: 11 }}>왼쪽 바인더의 인물 카드를 끌어다 놓거나, 위 라이브러리 버튼으로 채워도 됩니다.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {pairs.map((p) => {
              const active = activePair && p.key === activePair.key
              return (
                <button
                  key={p.key}
                  onClick={() => { setSelectedPair(p.key); setExpanded({}) }}
                  style={{
                    textAlign: 'left', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                    background: active ? 'var(--chrome-2)' : 'var(--panel)', borderRadius: 9, padding: '8px 10px', cursor: 'pointer', color: 'var(--text)',
                  }}
                  title="이 대립을 선택해 연쇄 시나리오를 봅니다"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(p.a.name || '인물A')} <span style={{ color: 'var(--muted)' }}>vs</span> {(p.b.name || '인물B')}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: heatColor(p.score) }}>온도 {p.score}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.score}%`, background: heatColor(p.score) }} />
                  </div>
                  {p.axis && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>핵심 축: {p.axis}</div>}
                </button>
              )
            })}
          </div>
        )}

        {/* 분기 시나리오 */}
        {activePair && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
              <span style={sectionTitle}>충돌 연쇄 분기</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>깊이</span>
              {[2, 3, 4].map((d) => (
                <button key={d} className={'minibtn' + (branchDepth === d ? ' active' : '')} style={{ padding: '2px 7px', fontSize: 11, borderColor: branchDepth === d ? 'var(--accent)' : 'var(--border)', background: branchDepth === d ? 'var(--chrome-2)' : undefined }} onClick={() => { setBranchDepth(d); setExpanded({}) }}>{d}</button>
              ))}
              <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={reroll} title="같은 입력에서 다른 분기 조합 생성">다시 굴리기</button>
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
              각 단계에서 <b>격화</b> · <b>후퇴·타협</b> · <b>기만·우회</b> 세 갈래로 갈라집니다. 온도가 높을수록 파국에 가깝습니다.
            </div>

            <div style={{ marginBottom: 14 }}>
              {tree.map((n) => (
                <TreeNode key={n.id} node={n} expanded={expanded} setExpanded={setExpanded} heatColor={heatColor} />
              ))}
            </div>

            {/* 유력 분기 요약 */}
            <div style={sectionTitle}>가장 뜨거운 분기 (엔딩 후보)</div>
            <div style={{ marginBottom: 14 }}>
              {hotPaths.map((path, idx) => {
                const last = path[path.length - 1]
                return (
                  <div key={idx} style={{ ...card, borderColor: heatColor(last.heat) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>분기 {idx + 1}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: heatColor(last.heat) }}>최종 온도 {last.heat}</span>
                    </div>
                    {pathToLines(path).map((l, k) => (
                      <div key={k} style={{ fontSize: 12, lineHeight: 1.55, marginBottom: 4, color: 'var(--text)' }}>{l}</div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* 연계 */}
            <div className="linkbar" style={{ flexWrap: 'wrap', gap: 6 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '시나리오를 프로젝트 자료(갈등 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 시나리오 추가</button>
              <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '분기 요약을 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>수집함에 담기</button>
              <button className="linkbtn" onClick={openInBuilder} title="이 대립을 갈등 설계기로 열기">갈등 설계기로 열기</button>
            </div>
            <div className="license-note" style={{ marginTop: 8 }}>
              충돌 온도와 분기는 입력한 가치·목표 텍스트만으로 결정론적 계산됩니다. 외부 전송 없음.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── 분기 트리 노드(재귀) ─────────────────────────
function TreeNode(props: {
  node: ScenarioNode
  expanded: Record<string, boolean>
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  heatColor: (h: number) => string
}) {
  const { node, expanded, setExpanded, heatColor } = props
  const open = !!expanded[node.id]
  const bd = branchDef(node.branch)
  const hasKids = node.children.length > 0
  const indent = (node.depth - 1) * 12

  return (
    <div style={{ marginLeft: indent, borderLeft: node.depth > 1 ? '1px solid var(--border)' : 'none', paddingLeft: node.depth > 1 ? 8 : 0 }}>
      <div
        onClick={() => hasKids && setExpanded((p) => ({ ...p, [node.id]: !p[node.id] }))}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 8px', marginBottom: 4,
          border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)',
          cursor: hasKids ? 'pointer' : 'default',
        }}
      >
        <span style={{ width: 14, flexShrink: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>{hasKids ? (open ? '−' : '+') : '·'}</span>
        <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999, color: '#fff', background: heatColor(node.heat) }}>{bd.label}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.5 }}>
          <b>{node.actor}</b> → {node.target}: {node.action}.
          {' '}
          <span style={{ color: 'var(--muted)' }}>{node.target}은(는) {node.reaction}. 그 결과 {node.worsen}.</span>
        </span>
        <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: heatColor(node.heat) }}>{node.heat}</span>
      </div>
      {open && node.children.map((c) => (
        <TreeNode key={c.id} node={c} expanded={expanded} setExpanded={setExpanded} heatColor={heatColor} />
      ))}
    </div>
  )
}
