// 플롯 풍동(Plot Wind Tunnel) — 한 장면/결정을 바꾸면 후속 사건이 어떻게 달라지는지
// '나비효과'를 분기 트리로 시뮬레이션한다. 기준 사건(seed event)에서 선택지(분기)를 갈래로 뻗고,
// 각 분기마다 (파급 강도 / 영향 받는 인물·축 / 새로 생기는 갈등 / 닫히는·열리는 가능성)을 기록하면,
// 결정론적 전파 엔진이 누적 충격·불안정도·연쇄 깊이를 계산해 '가장 거센 바람(=최대 파급 경로)'을 짚어준다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬 계산. localStorage 'sry:tool:plot-wind-tunnel' 자동 저장/복원.
// 연계(linkbus):
//  - useLibraryList('characters') 로 등장인물을 분기의 '영향 인물' 후보로 수용
//  - getDragItem/isItemDrag 로 좌측 바인더 장면 문서를 드롭 → 기준 사건으로 채택(텍스트 발췌)
//  - payload.text / payload.title / payload.seed 수용
//  - addToProject 로 시나리오 보고서를 자료('research')/'플롯' 폴더 문서로
//  - addToStash 로 선택 경로를 수집함 메모로
//  - openToolLinked('stakes-escalator' 등)로 관련 도구를 데이터와 함께 열기
//  - addToLibrary('snippets', …) 로 최종 경로 시나리오를 스니펫 라이브러리에 저장
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary, useLibraryList,
  getDragItem, isItemDrag,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'plot-wind-tunnel',
  name: '플롯 풍동',
  icon: '🌀',
  group: '플롯',
  intro: '한 장면을 바꾸면 후속 사건이 어떻게 달라지는지 나비효과를 분기 트리로 시뮬레이션',
  w: 500,
  h: 620,
}

// ── 데이터 모델 ──────────────────────────────────────────────────────────
// 트리 노드: 기준 사건(root)에서 출발해 분기(선택지)로 뻗는다.
type Axis = 'plot' | 'relation' | 'theme' | 'world' | 'character'
interface AxisDef { key: Axis; label: string; hint: string }
const AXES: AxisDef[] = [
  { key: 'plot', label: '사건', hint: '줄거리·사건의 전개 자체가 달라짐' },
  { key: 'relation', label: '관계', hint: '인물 사이 관계·신뢰·동맹이 흔들림' },
  { key: 'character', label: '인물', hint: '인물의 성격·신념·내적 변화가 생김' },
  { key: 'theme', label: '주제', hint: '작품이 말하려는 의미·메시지가 이동함' },
  { key: 'world', label: '세계', hint: '설정·세계의 규칙·판세가 바뀜' },
]
function axisDef(a: Axis): AxisDef { return AXES.find((x) => x.key === a) || AXES[0] }
const AXIS_KEYS: Axis[] = AXES.map((a) => a.key)

interface Node {
  id: string
  parent: string | null     // null = 루트(기준 사건)
  label: string             // 분기 선택지 한 줄(예: "도윤이 진실을 숨긴다")
  consequence: string       // 이 선택이 부르는 후속 사건(서술)
  impact: number            // 파급 강도 1~5 (이 한 걸음이 일으키는 충격)
  axis: Axis                // 어느 축에 가장 큰 변화를 주는가
  people: string[]          // 영향 받는 인물 이름
  opens: string             // 새로 열리는 가능성/갈등
  closes: string            // 닫히는 가능성(되돌릴 수 없게 됨)
}

interface Doc {
  seed: string              // 기준 사건(바꿀 장면/결정)
  seedNote: string          // 기준 사건 보충(원래 어떻게 흘렀는가)
  nodes: Node[]             // 분기 노드들(루트 제외)
  notes: string
}

const LS_KEY = 'sry:tool:plot-wind-tunnel'
const ROOT = 'root'
const MAX_NODES = 60
const MAX_DEPTH = 6

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function makeNode(parent: string | null): Node {
  return { id: newId(), parent, label: '', consequence: '', impact: 3, axis: 'plot', people: [], opens: '', closes: '' }
}

function emptyDoc(): Doc {
  return { seed: '', seedNote: '', nodes: [], notes: '' }
}

// ── 결정론적 전파 엔진 ─────────────────────────────────────────────────────
// 누적 충격(cumImpact): 루트→이 노드 경로의 impact 합.
// 연쇄 깊이(depth): 루트로부터의 단계 수.
// 불안정도(turbulence): 경로상 '닫히는 가능성'이 채워진 횟수 + 축이 바뀐 횟수 가중.
//   되돌릴 수 없는 변화와 잦은 축 이동이 많을수록 이야기가 거세게 휘몰아친다는 비유.
interface Metric { depth: number; cumImpact: number; turbulence: number; reach: number }

function childrenOf(nodes: Node[], parent: string | null): Node[] {
  return nodes.filter((n) => n.parent === parent)
}

function depthOf(nodes: Node[], id: string): number {
  let d = 0
  let cur = nodes.find((n) => n.id === id)
  const seen = new Set<string>()
  while (cur && cur.parent && cur.parent !== ROOT && !seen.has(cur.id)) {
    seen.add(cur.id)
    cur = nodes.find((n) => n.id === cur!.parent)
    d++
  }
  return d
}

// 루트 또는 임의 노드까지의 경로(루트 제외 노드 배열, 위→아래).
function pathTo(nodes: Node[], id: string): Node[] {
  const path: Node[] = []
  const seen = new Set<string>()
  let cur = nodes.find((n) => n.id === id)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    path.unshift(cur)
    if (!cur.parent || cur.parent === ROOT) break
    cur = nodes.find((n) => n.id === cur!.parent)
  }
  return path
}

function metricFor(nodes: Node[], id: string): Metric {
  const path = pathTo(nodes, id)
  let cumImpact = 0
  let turbulence = 0
  let prevAxis: Axis | null = null
  const reachSet = new Set<string>()
  for (const n of path) {
    cumImpact += n.impact
    if (n.closes.trim()) turbulence += 2
    if (prevAxis !== null && prevAxis !== n.axis) turbulence += 1
    prevAxis = n.axis
    n.people.forEach((p) => reachSet.add(p.trim()))
  }
  return { depth: path.length, cumImpact, turbulence, reach: reachSet.size }
}

// 모든 리프(말단) 경로 중 누적 충격이 최대인 경로 = '가장 거센 바람'.
function strongestLeaf(nodes: Node[]): string | null {
  const leaves = nodes.filter((n) => childrenOf(nodes, n.id).length === 0)
  if (!leaves.length) return null
  let best: { id: string; score: number } | null = null
  for (const lf of leaves) {
    const m = metricFor(nodes, lf.id)
    const score = m.cumImpact * 10 + m.turbulence * 3 + m.reach
    if (!best || score > best.score) best = { id: lf.id, score }
  }
  return best ? best.id : null
}

// 전체 통계.
interface Stats { branches: number; maxDepth: number; maxImpact: number; leaves: number; axisSpread: number }
function statsOf(nodes: Node[]): Stats {
  if (!nodes.length) return { branches: 0, maxDepth: 0, maxImpact: 0, leaves: 0, axisSpread: 0 }
  let maxDepth = 0, maxImpact = 0
  const leaves = nodes.filter((n) => childrenOf(nodes, n.id).length === 0).length
  const axes = new Set<Axis>()
  for (const n of nodes) {
    const m = metricFor(nodes, n.id)
    if (m.depth > maxDepth) maxDepth = m.depth
    if (m.cumImpact > maxImpact) maxImpact = m.cumImpact
    axes.add(n.axis)
  }
  return { branches: nodes.length, maxDepth, maxImpact, leaves, axisSpread: axes.size }
}

// ── 분기 제안(결정론적 의사난수) ─────────────────────────────────────────────
// 입력 기반 시드 해시 — 같은 기준 사건이면 같은 제안이 나오도록.
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}
const BRANCH_SEEDS: { label: string; axis: Axis; opens: string; closes: string }[] = [
  { label: '정반대로 결정한다', axis: 'plot', opens: '예상 밖의 동선이 열린다', closes: '원래 계획된 결말이 막힌다' },
  { label: '결정을 미룬다', axis: 'relation', opens: '관계가 한 박자 유예된다', closes: '신뢰의 적기가 지나간다' },
  { label: '진실을 숨긴다', axis: 'character', opens: '비밀이라는 시한폭탄이 생긴다', closes: '솔직함의 길이 닫힌다' },
  { label: '제3자가 개입한다', axis: 'world', opens: '판이 흔들리고 변수 인물이 등장', closes: '둘만의 문제가 아니게 된다' },
  { label: '대가를 먼저 치른다', axis: 'theme', opens: '주제가 희생으로 기운다', closes: '안전한 회피가 불가능해진다' },
  { label: '협력 대신 배신한다', axis: 'relation', opens: '새로운 적대 구도가 생긴다', closes: '동맹의 가능성이 닫힌다' },
]
function suggestBranch(seed: string, idx: number): Node {
  const h = hashStr(seed + '#' + idx)
  const pick = BRANCH_SEEDS[h % BRANCH_SEEDS.length]
  const impact = 2 + (h % 4) // 2~5
  return { id: newId(), parent: ROOT, label: pick.label, consequence: '', impact, axis: pick.axis, people: [], opens: pick.opens, closes: pick.closes }
}

// ── 직렬화 ────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyDoc()
    const p = JSON.parse(raw)
    const rawNodes = Array.isArray(p?.nodes) ? p.nodes : []
    const nodes: Node[] = rawNodes
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        id: String(x.id || newId()),
        parent: x.parent == null ? ROOT : String(x.parent),
        label: String(x.label || ''),
        consequence: String(x.consequence || ''),
        impact: Math.min(5, Math.max(1, Number(x.impact) || 3)),
        axis: (AXIS_KEYS.includes(x.axis) ? x.axis : 'plot') as Axis,
        people: Array.isArray(x.people) ? x.people.map((s: any) => String(s)).filter(Boolean) : [],
        opens: String(x.opens || ''),
        closes: String(x.closes || ''),
      }))
    return {
      seed: String(p?.seed || ''),
      seedNote: String(p?.seedNote || ''),
      nodes,
      notes: String(p?.notes || ''),
    }
  } catch { return emptyDoc() }
}

// 보고서(HTML) — 기준 사건 + 분기 트리(들여쓰기) + 최대 파급 경로.
function buildBodyHtml(doc: Doc): string {
  const dash = '<span style="color:#888">-</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const parts: string[] = []
  parts.push(`<p><b>기준 사건(바꾼 장면):</b> ${v(doc.seed)}</p>`)
  if (doc.seedNote.trim()) parts.push(`<p>원래 흐름: ${escHtml(doc.seedNote.trim())}</p>`)
  parts.push('<p><b>나비효과 분기</b></p>')
  const render = (parent: string | null, depth: number) => {
    childrenOf(doc.nodes, parent).forEach((n) => {
      const d = axisDef(n.axis)
      const pad = depth * 18
      const people = n.people.length ? ` / 영향: ${escHtml(n.people.join(', '))}` : ''
      parts.push(
        `<p style="margin-left:${pad}px">` +
        `<b>${'>'.repeat(Math.max(1, depth + 1))} ${v(n.label)}</b> ` +
        `<span style="color:#888">[${escHtml(d.label)} / 파급 ${n.impact}]</span>${people}<br>` +
        (n.consequence.trim() ? `후속: ${escHtml(n.consequence.trim())}<br>` : '') +
        (n.opens.trim() ? `열림: ${escHtml(n.opens.trim())}<br>` : '') +
        (n.closes.trim() ? `닫힘: ${escHtml(n.closes.trim())}` : '') +
        `</p>`,
      )
      render(n.id, depth + 1)
    })
  }
  render(ROOT, 0)
  const strong = strongestLeaf(doc.nodes)
  if (strong) {
    const path = pathTo(doc.nodes, strong)
    const m = metricFor(doc.nodes, strong)
    parts.push(`<p><b>가장 거센 경로</b> (누적 파급 ${m.cumImpact} / 불안정 ${m.turbulence} / 인물 ${m.reach}명)</p>`)
    parts.push(`<p>${path.map((n) => escHtml(n.label.trim() || '(미정)')).join(' &rarr; ')}</p>`)
  }
  if (doc.notes.trim()) parts.push(`<p><b>메모</b><br>${escHtml(doc.notes.trim())}</p>`)
  return parts.join('')
}

function buildText(doc: Doc): string {
  const lines: string[] = ['# 플롯 풍동 — 나비효과 시뮬레이션', '']
  lines.push(`기준 사건: ${doc.seed.trim() || '(미정)'}`)
  if (doc.seedNote.trim()) lines.push(`원래 흐름: ${doc.seedNote.trim()}`)
  lines.push('')
  const render = (parent: string | null, depth: number) => {
    childrenOf(doc.nodes, parent).forEach((n) => {
      const d = axisDef(n.axis)
      const indent = '  '.repeat(depth)
      lines.push(`${indent}- ${n.label.trim() || '(미정)'} [${d.label}/파급${n.impact}]`)
      if (n.consequence.trim()) lines.push(`${indent}  후속: ${n.consequence.trim()}`)
      if (n.people.length) lines.push(`${indent}  영향: ${n.people.join(', ')}`)
      if (n.opens.trim()) lines.push(`${indent}  열림: ${n.opens.trim()}`)
      if (n.closes.trim()) lines.push(`${indent}  닫힘: ${n.closes.trim()}`)
      render(n.id, depth + 1)
    })
  }
  render(ROOT, 0)
  const strong = strongestLeaf(doc.nodes)
  if (strong) {
    const path = pathTo(doc.nodes, strong)
    const m = metricFor(doc.nodes, strong)
    lines.push('', `가장 거센 경로 (누적 파급 ${m.cumImpact}/불안정 ${m.turbulence}):`)
    lines.push('  ' + path.map((n) => n.label.trim() || '(미정)').join(' -> '))
  }
  if (doc.notes.trim()) lines.push('', `메모: ${doc.notes.trim()}`)
  return lines.join('\n')
}

export default function PlotWindTunnel({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadDoc())
  const [doc, setDoc] = useState<Doc>(init.current)
  const [flash, setFlash] = useState('')
  const [note, setNote] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [selected, setSelected] = useState<string | null>(null) // 펼친/편집 중 노드
  const [dropActive, setDropActive] = useState(false)
  const [peopleInput, setPeopleInput] = useState('')
  const mounted = useRef(true)
  const payloadApplied = useRef(false)

  const characters = useLibraryList('characters')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드(연계 열기/드롭)로 기준 사건이 전달되면 비어 있을 때 한 번 채운다.
  useEffect(() => {
    if (payloadApplied.current || !payload) return
    payloadApplied.current = true
    const s = (payload.seed ?? payload.text ?? payload.title) as unknown
    if (typeof s === 'string' && s.trim()) {
      const txt = s.trim().slice(0, 220)
      setDoc((d) => (d.seed.trim() ? d : { ...d, seed: txt }))
    }
  }, [payload])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(doc)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [doc])

  // 안내 토스트 자동 소거.
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
    return () => window.clearTimeout(t)
  }, [flash])

  const stats = useMemo(() => statsOf(doc.nodes), [doc.nodes])
  const strongId = useMemo(() => strongestLeaf(doc.nodes), [doc.nodes])
  const strongPathIds = useMemo(() => new Set(strongId ? pathTo(doc.nodes, strongId).map((n) => n.id) : []), [doc.nodes, strongId])

  // ── 편집 동작 ─────────────────────────────────────────────────────────
  const setNode = (id: string, patch: Partial<Node>) =>
    setDoc((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))

  const addBranch = (parent: string | null) => {
    if (doc.nodes.length >= MAX_NODES) return
    if (parent && parent !== ROOT) {
      const pd = depthOf(doc.nodes, parent)
      if (pd + 1 >= MAX_DEPTH) return
    }
    const node = makeNode(parent)
    setDoc((d) => ({ ...d, nodes: [...d.nodes, node] }))
    setSelected(node.id)
  }

  // 노드와 그 하위 전체 삭제.
  const removeNode = (id: string) => {
    setDoc((d) => {
      const toRemove = new Set<string>([id])
      let changed = true
      while (changed) {
        changed = false
        for (const n of d.nodes) {
          if (n.parent && toRemove.has(n.parent) && !toRemove.has(n.id)) { toRemove.add(n.id); changed = true }
        }
      }
      return { ...d, nodes: d.nodes.filter((n) => !toRemove.has(n.id)) }
    })
    if (selected === id) setSelected(null)
  }

  // 기준 사건 기반 분기 자동 제안(빈 트리거나 루트에 직접 추가).
  const seedBranches = () => {
    const s = doc.seed.trim()
    if (!s) { setFlash('먼저 기준 사건을 적어주세요'); return }
    setDoc((d) => {
      const existing = childrenOf(d.nodes, ROOT).length
      const want = Math.min(3, MAX_NODES - d.nodes.length)
      if (want <= 0) return d
      const fresh: Node[] = []
      for (let i = 0; i < want; i++) fresh.push(suggestBranch(s, existing + i))
      return { ...d, nodes: [...d.nodes, ...fresh] }
    })
    setFlash('분기 제안을 추가했어요')
  }

  // 인물 토글(라이브러리 캐릭터 칩).
  const togglePerson = (id: string, name: string) => {
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.map((n) => {
        if (n.id !== id) return n
        const has = n.people.includes(name)
        return { ...n, people: has ? n.people.filter((p) => p !== name) : [...n.people, name] }
      }),
    }))
  }
  const addPersonText = (id: string) => {
    const name = peopleInput.trim()
    if (!name) return
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id && !n.people.includes(name) ? { ...n, people: [...n.people, name] } : n)),
    }))
    setPeopleInput('')
  }

  const resetAll = () => { setDoc(emptyDoc()); setSelected(null); setConfirmReset(false); setFlash('초기화했어요') }

  // 드롭(바인더 장면 → 기준 사건).
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropActive(false)
    const item = getDragItem(e)
    if (!item) return
    const text = (item.text || item.title || '').trim()
    if (!text) { setFlash('가져올 텍스트가 없어요'); return }
    const excerpt = text.replace(/\s+/g, ' ').slice(0, 220)
    setDoc((d) => ({ ...d, seed: excerpt, seedNote: d.seedNote || ('출처: ' + item.title) }))
    setFlash('장면을 기준 사건으로 가져왔어요')
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setFlash(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setFlash('복사 실패') }
  }

  // ── 연계 ─────────────────────────────────────────────────────────────
  const linkedProject = hasProjectBridge()
  const linkedStash = hasStash()

  const toProject = () => {
    if (!linkedProject) { setFlash('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: '플롯 풍동: ' + (doc.seed.trim().slice(0, 24) || '나비효과'),
      bodyHtml: buildBodyHtml(doc),
      synopsis: `${stats.branches}개 분기 / 최대 깊이 ${stats.maxDepth} / 최대 누적 파급 ${stats.maxImpact}`,
      meta: { 분기수: String(stats.branches), 최대깊이: String(stats.maxDepth), 최대파급: String(stats.maxImpact) },
    })
    setFlash(id ? '프로젝트 자료에 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const strongestToStash = () => {
    if (!linkedStash) { setFlash('수집함에 연결되지 않았습니다'); return }
    if (!strongId) { setFlash('먼저 분기를 만들어주세요'); return }
    const path = pathTo(doc.nodes, strongId)
    const text = '가장 거센 경로:\n' + path.map((n, i) => `${i + 1}. ${n.label.trim() || '(미정)'}${n.consequence.trim() ? ' — ' + n.consequence.trim() : ''}`).join('\n')
    addToStash({ kind: 'memo', label: '플롯 풍동 경로', text })
    setFlash('수집함에 담았어요')
  }

  const pathToSnippet = (leafId: string) => {
    const path = pathTo(doc.nodes, leafId)
    const text = (doc.seed.trim() ? '기준: ' + doc.seed.trim() + '\n' : '') +
      path.map((n, i) => `${i + 1}. ${n.label.trim() || '(미정)'}${n.consequence.trim() ? ' — ' + n.consequence.trim() : ''}`).join('\n')
    addToLibrary('snippets', { text, source: '플롯 풍동', tags: ['플롯', '나비효과'] })
    setFlash('스니펫 라이브러리에 저장했어요')
  }

  const openStakes = () => {
    if (!strongId) { setFlash('먼저 분기를 만들어주세요'); return }
    const path = pathTo(doc.nodes, strongId)
    const premise = doc.seed.trim() || (path[0] && path[0].label.trim()) || ''
    openToolLinked('stakes-escalator', { premise, title: premise })
    setFlash('위험 상승 설계기를 열었어요')
  }

  const isEmpty = !doc.seed.trim() && doc.nodes.length === 0

  // ── styles ────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 40, lineHeight: 1.5, fontFamily: 'inherit' }
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '2px 8px', fontSize: 11.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--text)',
  })

  // 충격 강도 → 막대 색.
  const impactColor = (v: number) => (v >= 5 ? 'var(--warn)' : v >= 4 ? 'var(--accent)' : v >= 3 ? '#7aa2f7' : 'var(--border)')

  // 재귀 트리 렌더.
  const renderTree = (parent: string | null, depth: number): React.ReactNode => {
    const kids = childrenOf(doc.nodes, parent)
    if (!kids.length) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginLeft: depth === 0 ? 0 : 14, paddingLeft: depth === 0 ? 0 : 8, borderLeft: depth === 0 ? 'none' : '2px solid var(--border)' }}>
        {kids.map((n) => {
          const open = selected === n.id
          const m = metricFor(doc.nodes, n.id)
          const onStrong = strongPathIds.has(n.id)
          const d = axisDef(n.axis)
          const canDeepen = depth + 1 < MAX_DEPTH
          return (
            <div key={n.id}>
              <div
                style={{
                  border: '1px solid ' + (onStrong ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 9, background: onStrong ? 'var(--chrome-2)' : 'var(--panel)',
                  padding: open ? 10 : '7px 9px',
                }}
              >
                {/* 노드 헤더 한 줄 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => setSelected(open ? null : n.id)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{open ? '[-]' : '[+]'}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: open ? 'normal' : 'nowrap' }}>
                    {n.label.trim() || '(분기 내용을 적어주세요)'}
                  </span>
                  <span title={d.hint} style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 5px', flexShrink: 0 }}>{d.label}</span>
                  {/* 파급 강도 막대 */}
                  <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} style={{ width: 4, height: 12, borderRadius: 1, background: i <= n.impact ? impactColor(n.impact) : 'var(--border)' }} />
                    ))}
                  </span>
                </div>

                {/* 접힌 상태 메타 */}
                {!open && (n.people.length > 0 || childrenOf(doc.nodes, n.id).length > 0) && (
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, marginLeft: 18 }}>
                    {childrenOf(doc.nodes, n.id).length > 0 && `갈래 ${childrenOf(doc.nodes, n.id).length}`}
                    {n.people.length > 0 && (childrenOf(doc.nodes, n.id).length > 0 ? ' / ' : '') + `영향 ${n.people.length}명`}
                    {` / 누적 파급 ${m.cumImpact}`}
                  </div>
                )}

                {/* 펼친 편집 */}
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 9 }}>
                    <div>
                      <div style={label}>분기 선택지 (이 갈림길에서 무엇을 다르게 하는가)</div>
                      <input style={input} value={n.label} onChange={(e) => setNode(n.id, { label: e.target.value })} placeholder="예: 도윤이 진실을 끝까지 숨긴다" maxLength={120} />
                    </div>
                    <div>
                      <div style={label}>후속 사건 (이 선택이 부르는 결과)</div>
                      <textarea style={area} value={n.consequence} onChange={(e) => setNode(n.id, { consequence: e.target.value })} placeholder="이어서 무슨 일이 벌어지는가" maxLength={400} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 140px' }}>
                        <div style={label}>변화의 축</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {AXES.map((ax) => (
                            <span key={ax.key} title={ax.hint} style={chip(ax.key === n.axis)} onClick={() => setNode(n.id, { axis: ax.key })}>{ax.label}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <div style={label}>파급 강도: {n.impact}</div>
                        <input type="range" min={1} max={5} step={1} value={n.impact} onChange={(e) => setNode(n.id, { impact: Number(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div>
                      <div style={label}>영향 받는 인물</div>
                      {characters.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                          {characters.slice(0, 24).map((c) => (
                            <span key={c.id} style={chip(n.people.includes(c.name))} onClick={() => togglePerson(n.id, c.name)}>{c.name || '이름없음'}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          style={{ ...input, flex: 1 }}
                          value={selected === n.id ? peopleInput : ''}
                          onChange={(e) => setPeopleInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPersonText(n.id) } }}
                          placeholder="인물 직접 입력 후 Enter"
                          maxLength={40}
                        />
                        <button className="minibtn" onClick={() => addPersonText(n.id)}>추가</button>
                      </div>
                      {n.people.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                          {n.people.map((p) => (
                            <span key={p} style={{ ...chip(true), cursor: 'pointer' }} onClick={() => togglePerson(n.id, p)} title="클릭하면 제거">{p} x</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 140px' }}>
                        <div style={label}>새로 열리는 가능성</div>
                        <textarea style={area} value={n.opens} onChange={(e) => setNode(n.id, { opens: e.target.value })} placeholder="이 선택으로 생기는 기회·갈등" maxLength={240} />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <div style={label}>닫히는 가능성 (불안정 가중)</div>
                        <textarea style={area} value={n.closes} onChange={(e) => setNode(n.id, { closes: e.target.value })} placeholder="되돌릴 수 없게 되는 것" maxLength={240} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="minibtn" onClick={() => addBranch(n.id)} disabled={!canDeepen || doc.nodes.length >= MAX_NODES} title={canDeepen ? '이 분기에서 다시 갈라지기' : '최대 깊이에 도달했어요'}>하위 분기</button>
                      {childrenOf(doc.nodes, n.id).length === 0 && (
                        <button className="minibtn" onClick={() => pathToSnippet(n.id)} title="이 경로(루트→여기)를 스니펫으로 저장">경로 저장</button>
                      )}
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>깊이 {m.depth} / 누적 {m.cumImpact} / 불안정 {m.turbulence}</span>
                      <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => removeNode(n.id)} title="이 분기와 하위 전체 삭제">삭제</button>
                    </div>
                  </div>
                )}
              </div>
              {/* 자식 트리 */}
              {renderTree(n.id, depth + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={wrap} onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropActive) setDropActive(true) } }} onDragLeave={() => setDropActive(false)} onDrop={onDrop}>
      <div style={header}>
        <strong style={{ fontSize: 14 }}>플롯 풍동</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>분기 {stats.branches} / 깊이 {stats.maxDepth}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 11.5, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(buildText(doc), '전체 복사됨')} disabled={isEmpty}>내보내기</button>
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmReset(true)} disabled={isEmpty}>초기화</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 11.5, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {dropActive && (
        <div style={{ padding: '6px 12px', fontSize: 11.5, color: 'var(--accent)', background: 'var(--chrome-2)', borderBottom: '1px dashed var(--accent)' }}>여기에 놓으면 장면을 기준 사건으로 가져옵니다</div>
      )}

      {confirmReset && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--warn)' }}>
          <span>모든 분기와 내용을 지울까요?</span>
          <span style={{ flex: 1 }} />
          <button className="btn-primary" style={{ background: 'var(--warn)', padding: '3px 10px', fontSize: 12 }} onClick={resetAll}>지우기</button>
          <button className="minibtn" onClick={() => setConfirmReset(false)}>취소</button>
        </div>
      )}

      <div style={scroll}>
        {/* 기준 사건(루트) */}
        <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: 11, background: 'var(--chrome-2)', marginBottom: 12 }}>
          <div style={label}>기준 사건 — 바꿀 장면 / 결정 (풍동에 넣을 모형)</div>
          <input style={input} value={doc.seed} onChange={(e) => setDoc((d) => ({ ...d, seed: e.target.value }))} placeholder="예: 도윤이 살인을 목격하고 신고할지 망설이는 순간" maxLength={220} />
          <div style={{ marginTop: 8 }}>
            <div style={label}>원래 흐름 (바꾸기 전에는 어떻게 됐는가, 선택)</div>
            <textarea style={area} value={doc.seedNote} onChange={(e) => setDoc((d) => ({ ...d, seedNote: e.target.value }))} placeholder="기준선이 되는 원래 전개" maxLength={300} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => addBranch(ROOT)} disabled={doc.nodes.length >= MAX_NODES}>＋ 분기 추가</button>
            <button className="minibtn" onClick={seedBranches} disabled={doc.nodes.length >= MAX_NODES} title="기준 사건으로부터 분기 갈래를 제안">분기 제안</button>
          </div>
        </div>

        {/* 빈 상태 안내 */}
        {doc.nodes.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, border: '1px dashed var(--border)', borderRadius: 10 }}>
            기준 사건을 적고 <b>분기 추가</b>로 "만약 다르게 했다면?"을 갈래로 펼쳐보세요.<br />
            각 분기에서 다시 갈라져 나비효과를 깊게 시뮬레이션할 수 있어요.<br />
            좌측 바인더의 장면 문서를 이 창에 끌어다 놓으면 기준 사건으로 가져옵니다.
            {characters.length > 0 && <><br />등장인물 {characters.length}명을 분기의 영향 인물로 바로 지정할 수 있어요.</>}
          </div>
        )}

        {/* 분기 트리 */}
        {doc.nodes.length > 0 && (
          <div style={{ marginBottom: 12 }}>{renderTree(ROOT, 0)}</div>
        )}

        {/* 풍동 분석 패널 */}
        {doc.nodes.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 11, background: 'var(--panel)', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>풍동 분석</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {[
                { k: '분기', v: stats.branches },
                { k: '말단', v: stats.leaves },
                { k: '최대 깊이', v: stats.maxDepth },
                { k: '최대 누적 파급', v: stats.maxImpact },
                { k: '관여 축', v: stats.axisSpread + '/' + AXES.length },
              ].map((s) => (
                <div key={s.k} style={{ flex: '1 1 80px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 4px', background: 'var(--paper)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.k}</div>
                </div>
              ))}
            </div>
            {strongId && (() => {
              const path = pathTo(doc.nodes, strongId)
              const m = metricFor(doc.nodes, strongId)
              return (
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>가장 거센 경로 (누적 파급 {m.cumImpact} / 불안정 {m.turbulence} / 인물 {m.reach}명)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                    {path.map((n, i) => (
                      <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 11.5 }}>{n.label.trim() || '(미정)'}</span>
                        {i < path.length - 1 && <span style={{ color: 'var(--muted)' }}>&rarr;</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 메모 */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>메모 (선택)</div>
          <textarea style={area} value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} placeholder="어느 경로를 본편으로 채택할지, 버린 갈래의 활용 등" maxLength={500} />
        </div>

        {/* 연계 */}
        <div className="linkbar" style={{ flexWrap: 'wrap', gap: 6 }}>
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!linkedProject} title={linkedProject ? '시나리오 보고서를 프로젝트 자료(플롯)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
          <button className="linkbtn" onClick={strongestToStash} disabled={!linkedStash || !strongId} title={linkedStash ? '가장 거센 경로를 수집함 메모로' : '수집함에 연결되어 있지 않습니다'}>수집함에 담기</button>
          <button className="linkbtn" onClick={() => strongId && pathToSnippet(strongId)} disabled={!strongId} title="가장 거센 경로를 스니펫 라이브러리에 저장">경로를 스니펫으로</button>
          <button className="linkbtn" onClick={openStakes} disabled={!strongId} title="이 경로의 판돈을 위험 상승 설계기로 이어 작업">위험 상승 설계기 열기</button>
        </div>

        <div className="license-note" style={{ marginTop: 12, fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          누적 파급은 경로상 각 분기의 파급 강도 합, 불안정도는 되돌릴 수 없는 변화와 변화 축 이동을 합산한 결정론적 지표입니다.
          외부 저작물을 포함하지 않으며, 입력한 내용은 이 브라우저에만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
