// 극적 아이러니 / 정보 격차 설계기 —
//  "누가 무엇을 아는가" 매트릭스(인물 × 비밀/사실, 각 칸 = 앎/모름/오해/의심)를 만들어
//  독자만 아는 긴장(극적 아이러니)·반전 타이밍을 설계한다.
//  · 비밀/사실(열) CRUD + 독자 인지 상태(독자가 아는가) + 공개 타이밍(reveal beat) 설정.
//  · 인물(행) CRUD. 각 칸을 클릭해 그 인물이 그 사실을 어떻게 아는지 순환 토글.
//  · 자동 분석: 극적 아이러니(독자는 아는데 인물은 모름/오해), 임박한 폭로, 오해의 시한폭탄 등을 짚어준다.
//  · 공개 타이밍 순으로 정렬한 "폭로 타임라인"으로 반전 배치를 본다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 없음. 언마운트 정리.
// 저장: localStorage 'sry:tool:dramatic-irony-planner' 자동 저장/복원(손상/차단 graceful).
// 연계(linkbus): 매트릭스+분석을 프로젝트 자료('구조' 폴더)에 HTML 문서로 추가.
//   좌측 바인더 인물/문서 드롭 → 인물 행 또는 사실 열로 추가.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'dramatic-irony-planner', name: '극적 아이러니 설계', icon: '🎭', group: '구상·정리', intro: '누가 무엇을 아는가 매트릭스로 독자만 아는 긴장과 반전 타이밍을 설계해요', w: 900, h: 620 }

const LS_KEY = 'sry:tool:dramatic-irony-planner'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
// 칸의 앎 상태: 모름 / 앎 / 오해(틀린 사실을 믿음) / 의심(눈치챔)
type Know = 'unknown' | 'knows' | 'mistaken' | 'suspects'

interface Person {
  id: string
  name: string
  note: string        // 역할/메모
}
interface Fact {
  id: string
  label: string       // 비밀/사실 이름(예: "왕자는 사실 살아 있다")
  detail: string      // 진실(실제로 무엇인가)
  readerKnows: Know   // 독자의 인지 상태(독자도 한 명의 '관찰자')
  revealBeat: string  // 공개 타이밍(자유 텍스트: 예 "2막 중간점", "12장")
  color: string       // 열 색(자작 팔레트)
}
interface PlanState {
  title: string
  people: Person[]
  facts: Fact[]
  // 칸 상태: cells["personId|factId"] = Know  (없으면 'unknown' 기본)
  cells: Record<string, Know>
}

const KNOW_META: Record<Know, { label: string; short: string; icon: string; color: string; bg: string }> = {
  unknown:  { label: '모름',   short: '−',  icon: '·',  color: 'var(--muted)', bg: 'transparent' },
  knows:    { label: '앎',     short: '앎', icon: '●', color: 'var(--ok)',    bg: 'rgba(15,157,88,0.14)' },
  mistaken: { label: '오해',   short: '오', icon: '✗', color: 'var(--warn)',  bg: 'rgba(219,68,55,0.16)' },
  suspects: { label: '의심',   short: '의', icon: '◐', color: 'var(--accent)', bg: 'rgba(74,118,212,0.15)' },
}
const KNOW_ORDER: Know[] = ['unknown', 'knows', 'mistaken', 'suspects']
function nextKnow(k: Know): Know {
  const i = KNOW_ORDER.indexOf(k)
  return KNOW_ORDER[(i + 1) % KNOW_ORDER.length]
}

// 자작 열 색 팔레트(저작권 안전)
const FACT_COLORS = ['#5b8def', '#a855f7', '#22a06b', '#f0b429', '#ef6461', '#0ea5e9', '#d946ef', '#84cc16', '#fb923c', '#14b8a6']

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID()
  } catch { /* ignore */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
const cellKey = (pid: string, fid: string) => pid + '|' + fid

function emptyPlan(): PlanState {
  return { title: '', people: [], facts: [], cells: {} }
}

// 첫 사용자에게 보여줄 예시(빈 상태일 때만 시드): 고전적 극적 아이러니 한 장면.
function seedPlan(): PlanState {
  const p = emptyPlan()
  p.title = '예시 · 독자만 아는 진실'
  const mk = (name: string, note: string): Person => { const x = { id: newId('per'), name, note }; p.people.push(x); return x }
  const mf = (label: string, detail: string, readerKnows: Know, revealBeat: string, color: string): Fact => {
    const x = { id: newId('fact'), label, detail, readerKnows, revealBeat, color }
    p.facts.push(x); return x
  }
  const a = mk('주인공', '진실에 가장 가까이 있으나 한 가지를 모른다')
  const b = mk('연인', '비밀을 품고 있다')
  const c = mk('악역', '거짓을 흘리는 자')
  const f1 = mf('연인은 적의 첩자다', '연인은 사실 적 진영에 정보를 넘기고 있다', 'knows', '3막 폭로(클라이맥스)', FACT_COLORS[0])
  const f2 = mf('편지는 위조되었다', '주인공이 받은 편지는 악역이 꾸민 가짜다', 'knows', '2막 중간점', FACT_COLORS[1])
  const f3 = mf('주인공의 출생 비밀', '주인공은 왕가의 후계자다', 'suspects', '결말', FACT_COLORS[2])
  // 칸 상태(극적 아이러니가 보이도록)
  p.cells[cellKey(a.id, f1.id)] = 'unknown'   // 주인공은 첩자임을 모름 → 독자만 앎(긴장)
  p.cells[cellKey(b.id, f1.id)] = 'knows'      // 연인 본인은 앎
  p.cells[cellKey(c.id, f1.id)] = 'knows'      // 악역도 앎
  p.cells[cellKey(a.id, f2.id)] = 'mistaken'   // 주인공은 편지를 진짜로 오해 → 위험한 오해
  p.cells[cellKey(b.id, f2.id)] = 'suspects'
  p.cells[cellKey(c.id, f2.id)] = 'knows'      // 악역은 위조를 앎
  p.cells[cellKey(a.id, f3.id)] = 'unknown'
  p.cells[cellKey(b.id, f3.id)] = 'unknown'
  p.cells[cellKey(c.id, f3.id)] = 'suspects'
  return p
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증 + 누락 보정.
function loadPlan(): { plan: PlanState; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { plan: seedPlan(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { plan: seedPlan(), seeded: true }
    const people: Person[] = []
    const pSeen = new Set<string>()
    if (Array.isArray(parsed.people)) {
      for (const x of parsed.people) {
        if (!x || typeof x.name !== 'string') continue
        const id = String(x.id || newId('per'))
        if (pSeen.has(id)) continue
        pSeen.add(id)
        people.push({ id, name: String(x.name), note: typeof x.note === 'string' ? x.note : '' })
      }
    }
    const facts: Fact[] = []
    const fSeen = new Set<string>()
    if (Array.isArray(parsed.facts)) {
      for (let i = 0; i < parsed.facts.length; i++) {
        const x = parsed.facts[i]
        if (!x || typeof x.label !== 'string') continue
        const id = String(x.id || newId('fact'))
        if (fSeen.has(id)) continue
        fSeen.add(id)
        const rk: Know = KNOW_ORDER.includes(x.readerKnows) ? x.readerKnows : 'unknown'
        facts.push({
          id,
          label: String(x.label),
          detail: typeof x.detail === 'string' ? x.detail : '',
          readerKnows: rk,
          revealBeat: typeof x.revealBeat === 'string' ? x.revealBeat : '',
          color: typeof x.color === 'string' ? x.color : FACT_COLORS[i % FACT_COLORS.length],
        })
      }
    }
    const cells: Record<string, Know> = {}
    if (parsed.cells && typeof parsed.cells === 'object') {
      const validP = new Set(people.map((x) => x.id))
      const validF = new Set(facts.map((x) => x.id))
      for (const k of Object.keys(parsed.cells)) {
        const parts = String(k).split('|')
        if (parts.length !== 2) continue
        if (!validP.has(parts[0]) || !validF.has(parts[1])) continue
        const v = parsed.cells[k]
        if (KNOW_ORDER.includes(v) && v !== 'unknown') cells[k] = v
      }
    }
    const title = typeof parsed.title === 'string' ? parsed.title : ''
    return { plan: { title, people, facts, cells }, seeded: false }
  } catch {
    return { plan: seedPlan(), seeded: true }
  }
}

// ── 분석 ─────────────────────────────────────────────────────────────────────
interface Insight { kind: 'irony' | 'reversal' | 'gap' | 'reader-blind' | 'safe'; tone: 'tension' | 'warn' | 'info'; text: string }

function getCell(plan: PlanState, pid: string, fid: string): Know {
  return plan.cells[cellKey(pid, fid)] || 'unknown'
}

// 한 사실에 대한 분석 요약
function analyzeFact(plan: PlanState, fact: Fact): Insight[] {
  const out: Insight[] = []
  const states = plan.people.map((p) => ({ p, k: getCell(plan, p.id, fact.id) }))
  const ignorant = states.filter((s) => s.k === 'unknown')
  const mistaken = states.filter((s) => s.k === 'mistaken')
  const knowers = states.filter((s) => s.k === 'knows')
  const suspect = states.filter((s) => s.k === 'suspects')
  const readerKnows = fact.readerKnows === 'knows'

  // 극적 아이러니: 독자(또는 일부 인물)는 아는데, 무대 위 인물은 모르거나 오해.
  if (readerKnows && (ignorant.length + mistaken.length) > 0) {
    const victims = [...mistaken, ...ignorant].map((s) => s.p.name).slice(0, 6).join(', ')
    out.push({
      kind: 'irony', tone: 'tension',
      text: `극적 아이러니: 독자는 "${fact.label}"을(를) 아는데 ${victims}${(ignorant.length + mistaken.length) > 6 ? ' 등' : ''}은(는) ${mistaken.length ? '오해하거나 ' : ''}모릅니다. 독자만 아는 긴장이 작동합니다.`,
    })
  }
  // 오해는 시한폭탄(잘못된 믿음이 행동을 그르친다)
  if (mistaken.length > 0) {
    out.push({
      kind: 'reversal', tone: 'warn',
      text: `오해(시한폭탄): ${mistaken.map((s) => s.p.name).join(', ')}이(가) 진실과 어긋나게 믿고 있어요. 진실이 드러날 때 큰 반전이 됩니다${fact.revealBeat ? ` → 공개: ${fact.revealBeat}` : ' → 공개 타이밍을 정해 두세요'}.`,
    })
  }
  // 독자가 모름 = 미스터리/서스펜스 잠재(인물은 아는데 독자만 모름)
  if (!readerKnows && knowers.length > 0) {
    out.push({
      kind: 'reader-blind', tone: 'info',
      text: `독자 사각: ${knowers.map((s) => s.p.name).join(', ')}은(는) 아는데 독자는 모릅니다. 미스터리/궁금증을 만들거나, 시점 인물을 통해 흘릴 수 있어요.`,
    })
  }
  // 의심자: 폭로 직전 압력
  if (suspect.length > 0) {
    out.push({
      kind: 'gap', tone: 'info',
      text: `의심: ${suspect.map((s) => s.p.name).join(', ')}이(가) 눈치채는 중 — 폭로가 가까워지는 압력입니다.`,
    })
  }
  return out
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function DramaticIronyPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ plan: PlanState; seeded: boolean }>()
  if (!initial.current) initial.current = loadPlan()

  const [plan, setPlan] = useState<PlanState>(initial.current.plan)
  const [note, setNote] = useState(initial.current.seeded ? '예시 매트릭스를 채워 두었어요. 칸을 클릭해 상태를 바꾸거나, 비우고 새로 시작하세요.' : '')
  const [tab, setTab] = useState<'matrix' | 'timeline' | 'analysis'>('matrix')
  const [editPerson, setEditPerson] = useState<{ id: string | 'new' } | null>(null)
  const [editFact, setEditFact] = useState<{ id: string | 'new' } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ kind: 'person' | 'fact'; id: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)
  const dropDepth = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 사실/인물을 받으면 추가(다른 도구 연계 진입점)
  const payloadApplied = useRef(false)
  useEffect(() => {
    if (payloadApplied.current || !payload) return
    payloadApplied.current = true
    const factLabel = typeof payload.fact === 'string' ? payload.fact.trim()
      : typeof payload.secret === 'string' ? payload.secret.trim() : ''
    const personName = typeof payload.person === 'string' ? payload.person.trim()
      : typeof payload.name === 'string' ? payload.name.trim() : ''
    if (factLabel) {
      setPlan((prev) => addFact(prev, factLabel, typeof payload.detail === 'string' ? payload.detail : ''))
      setNote(`연계로 받은 사실 "${factLabel}"을(를) 열로 추가했어요.`)
    } else if (personName) {
      setPlan((prev) => addPerson(prev, personName, typeof payload.note === 'string' ? payload.note : ''))
      setNote(`연계로 받은 인물 "${personName}"을(를) 행으로 추가했어요.`)
    }
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // 저장 — 차단/용량초과 graceful
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(plan))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [plan])

  // ── CRUD 순수 함수(setPlan 콜백에서 호출) ───────────────────────────────────
  const totalPeople = plan.people.length
  const totalFacts = plan.facts.length

  // ── 인물 CRUD ──────────────────────────────────────────────────────────────
  const upsertPerson = useCallback((id: string | 'new', name: string, noteText: string) => {
    const nm = name.trim()
    if (!nm) return
    setPlan((prev) => {
      if (id === 'new') return addPerson(prev, nm, noteText.trim())
      return { ...prev, people: prev.people.map((p) => p.id === id ? { ...p, name: nm, note: noteText.trim() } : p) }
    })
    setEditPerson(null)
  }, [])

  const deletePerson = useCallback((id: string) => {
    setPlan((prev) => {
      const cells = { ...prev.cells }
      Object.keys(cells).forEach((k) => { if (k.split('|')[0] === id) delete cells[k] })
      return { ...prev, people: prev.people.filter((p) => p.id !== id), cells }
    })
    setConfirmDel(null)
  }, [])

  const movePerson = useCallback((id: string, dir: -1 | 1) => {
    setPlan((prev) => {
      const i = prev.people.findIndex((p) => p.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.people.length) return prev
      const people = [...prev.people]
      ;[people[i], people[j]] = [people[j], people[i]]
      return { ...prev, people }
    })
  }, [])

  // ── 사실 CRUD ──────────────────────────────────────────────────────────────
  const upsertFact = useCallback((id: string | 'new', f: { label: string; detail: string; readerKnows: Know; revealBeat: string }) => {
    const label = f.label.trim()
    if (!label) return
    setPlan((prev) => {
      if (id === 'new') {
        const np = addFact(prev, label, f.detail.trim())
        const created = np.facts[np.facts.length - 1]
        return { ...np, facts: np.facts.map((x) => x.id === created.id ? { ...x, readerKnows: f.readerKnows, revealBeat: f.revealBeat.trim() } : x) }
      }
      return { ...prev, facts: prev.facts.map((x) => x.id === id ? { ...x, label, detail: f.detail.trim(), readerKnows: f.readerKnows, revealBeat: f.revealBeat.trim() } : x) }
    })
    setEditFact(null)
  }, [])

  const deleteFact = useCallback((id: string) => {
    setPlan((prev) => {
      const cells = { ...prev.cells }
      Object.keys(cells).forEach((k) => { if (k.split('|')[1] === id) delete cells[k] })
      return { ...prev, facts: prev.facts.filter((f) => f.id !== id), cells }
    })
    setConfirmDel(null)
  }, [])

  const moveFact = useCallback((id: string, dir: -1 | 1) => {
    setPlan((prev) => {
      const i = prev.facts.findIndex((f) => f.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.facts.length) return prev
      const facts = [...prev.facts]
      ;[facts[i], facts[j]] = [facts[j], facts[i]]
      return { ...prev, facts }
    })
  }, [])

  // 칸 토글(인물 × 사실 앎 상태 순환)
  const cycleCell = useCallback((pid: string, fid: string) => {
    setPlan((prev) => {
      const k = cellKey(pid, fid)
      const cur = prev.cells[k] || 'unknown'
      const nx = nextKnow(cur)
      const cells = { ...prev.cells }
      if (nx === 'unknown') delete cells[k]
      else cells[k] = nx
      return { ...prev, cells }
    })
  }, [])

  // 독자 인지 상태 토글(헤더에서)
  const cycleReader = useCallback((fid: string) => {
    setPlan((prev) => ({
      ...prev,
      facts: prev.facts.map((f) => f.id === fid ? { ...f, readerKnows: nextKnow(f.readerKnows) } : f),
    }))
  }, [])

  // 바인더 파일(인물/문서) 드롭 → 인물 또는 사실로 추가
  const addDroppedItem = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }) => {
    const title = (it.title || '').trim() || '제목 없음'
    if (it.character) {
      const c = it.character
      const noteText = ['role', 'occupation', 'goal', 'secret', 'description', 'notes']
        .map((kk) => (typeof c[kk] === 'string' ? c[kk].trim() : '')).filter(Boolean).join(' · ').slice(0, 400)
      setPlan((prev) => addPerson(prev, title, noteText))
      setNote(`바인더 인물 "${title}"을(를) 행으로 추가했어요.`)
    } else {
      const detail = (typeof it.text === 'string' ? it.text : '').slice(0, 800).trim()
      setPlan((prev) => addFact(prev, title, detail))
      setNote(`바인더 문서 "${title}"을(를) 사실 열로 추가했어요.`)
    }
  }, [])

  // ── 분석 집계 ────────────────────────────────────────────────────────────────
  const allInsights = useMemo(() => {
    const grouped = plan.facts.map((f) => ({ fact: f, insights: analyzeFact(plan, f) }))
    return grouped
  }, [plan])

  const ironyCount = useMemo(() =>
    allInsights.reduce((n, g) => n + g.insights.filter((i) => i.kind === 'irony').length, 0)
  , [allInsights])
  const reversalCount = useMemo(() =>
    allInsights.reduce((n, g) => n + g.insights.filter((i) => i.kind === 'reversal').length, 0)
  , [allInsights])

  // 폭로 타임라인: 공개 타이밍 텍스트 그대로 그룹핑(빈 값은 '미정')
  const timeline = useMemo(() => {
    const order: string[] = []
    const map: Record<string, Fact[]> = {}
    plan.facts.forEach((f) => {
      const key = f.revealBeat.trim() || '미정'
      if (!map[key]) { map[key] = []; order.push(key) }
      map[key].push(f)
    })
    // '미정'은 항상 뒤로
    order.sort((a, b) => (a === '미정' ? 1 : 0) - (b === '미정' ? 1 : 0))
    return order.map((k) => ({ beat: k, facts: map[k] }))
  }, [plan.facts])

  // ── 내보내기/복사/프로젝트 ───────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = []
    lines.push('# 극적 아이러니 / 정보 격차 설계' + (plan.title ? ` — ${plan.title}` : ''), '')
    lines.push('## 누가 무엇을 아는가', '')
    // 표(마크다운 유사)
    const head = ['인물 / 사실', ...plan.facts.map((f) => f.label)]
    lines.push(head.join(' | '))
    plan.people.forEach((p) => {
      const row = [p.name, ...plan.facts.map((f) => KNOW_META[getCell(plan, p.id, f.id)].label)]
      lines.push(row.join(' | '))
    })
    lines.push(['(독자)', ...plan.facts.map((f) => KNOW_META[f.readerKnows].label)].join(' | '))
    lines.push('')
    lines.push('## 사실 / 비밀', '')
    plan.facts.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.label}`)
      if (f.detail) lines.push(`   진실: ${f.detail}`)
      lines.push(`   독자: ${KNOW_META[f.readerKnows].label}` + (f.revealBeat ? ` · 공개: ${f.revealBeat}` : ''))
    })
    lines.push('')
    lines.push('## 분석', '')
    allInsights.forEach((g) => {
      if (!g.insights.length) return
      lines.push(`▸ ${g.fact.label}`)
      g.insights.forEach((ins) => lines.push(`   - ${ins.text}`))
    })
    if (allInsights.every((g) => !g.insights.length)) lines.push('(아직 짚어낼 긴장/반전이 없어요. 칸을 채워 보세요.)')
    return lines.join('\n').trimEnd() + '\n'
  }, [plan, allInsights])

  const copyAll = useCallback(() => {
    navigator.clipboard?.writeText(buildText()).then(() => {
      setCopied(true)
      window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {
      if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.')
    })
  }, [buildText])

  const exportFile = useCallback(() => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dramatic-irony.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    }
  }, [buildText])

  const buildHtml = useCallback((): string => {
    const parts: string[] = []
    if (plan.title) parts.push(`<p><em>${escHtml(plan.title)}</em></p>`)
    // 매트릭스 표
    parts.push('<h2>누가 무엇을 아는가</h2>')
    parts.push('<table border="1" cellpadding="5" cellspacing="0"><thead><tr><th>인물 / 사실</th>')
    plan.facts.forEach((f) => { parts.push(`<th>${escHtml(f.label)}</th>`) })
    parts.push('</tr></thead><tbody>')
    plan.people.forEach((p) => {
      parts.push(`<tr><td><strong>${escHtml(p.name)}</strong></td>`)
      plan.facts.forEach((f) => { parts.push(`<td>${escHtml(KNOW_META[getCell(plan, p.id, f.id)].label)}</td>`) })
      parts.push('</tr>')
    })
    parts.push('<tr><td><em>(독자)</em></td>')
    plan.facts.forEach((f) => { parts.push(`<td><em>${escHtml(KNOW_META[f.readerKnows].label)}</em></td>`) })
    parts.push('</tr></tbody></table>')
    // 사실 목록
    parts.push('<h2>사실 / 비밀</h2><ol>')
    plan.facts.forEach((f) => {
      let li = `<strong>${escHtml(f.label)}</strong>`
      if (f.detail) li += `<br>진실: ${escHtml(f.detail)}`
      li += `<br>독자: ${escHtml(KNOW_META[f.readerKnows].label)}`
      if (f.revealBeat) li += ` · 공개: ${escHtml(f.revealBeat)}`
      parts.push('<li>' + li + '</li>')
    })
    parts.push('</ol>')
    // 분석
    parts.push('<h2>분석</h2>')
    let any = false
    allInsights.forEach((g) => {
      if (!g.insights.length) return
      any = true
      parts.push(`<p><strong>${escHtml(g.fact.label)}</strong></p><ul>`)
      g.insights.forEach((ins) => parts.push(`<li>${escHtml(ins.text)}</li>`))
      parts.push('</ul>')
    })
    if (!any) parts.push('<p><em>아직 짚어낼 긴장/반전이 없어요.</em></p>')
    return parts.join('')
  }, [plan, allInsights])

  const addPlanToProject = useCallback(() => {
    if (totalFacts === 0 && totalPeople === 0) { setNote('프로젝트에 추가할 내용이 없어요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '극적 아이러니 설계' + (plan.title ? ` — ${plan.title}` : ''),
      bodyHtml: buildHtml(),
      meta: { 인물수: String(totalPeople), 사실수: String(totalFacts), 극적아이러니: String(ironyCount), 반전후보: String(reversalCount) },
    })
    setNote(id ? '프로젝트 자료 "구조" 폴더에 설계 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [plan.title, totalFacts, totalPeople, ironyCount, reversalCount, buildHtml])

  const resetAll = useCallback(() => {
    setPlan(emptyPlan())
    setConfirmReset(false)
    setNote('모두 비웠어요. 인물과 사실을 새로 추가해 보세요.')
  }, [])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const tabBar: React.CSSProperties = { display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }

  const tabBtn = (key: typeof tab, label: string): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 12.5, borderRadius: 8, cursor: 'pointer',
    border: '1px solid ' + (tab === key ? 'var(--accent)' : 'var(--border)'),
    background: tab === key ? 'var(--accent)' : 'var(--panel)',
    color: tab === key ? '#fff' : 'var(--text)', fontWeight: tab === key ? 700 : 500,
  })

  return (
    <div
      style={{ ...wrap, outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dropDepth.current += 1; setDropActive(true) } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dropDepth.current = Math.max(0, dropDepth.current - 1); if (dropDepth.current === 0) setDropActive(false) } }}
      onDrop={(e) => {
        dropDepth.current = 0
        setDropActive(false)
        const it = getDragItem(e)
        if (it) { e.preventDefault(); addDroppedItem(it) }
      }}
    >
      {/* 툴바 */}
      <div style={toolbar}>
        <span style={{ fontSize: 15, fontWeight: 700 }}><Emoji e="🎭" /> 극적 아이러니 설계</span>
        {titleEditing ? (
          <input
            autoFocus
            value={plan.title}
            onChange={(e) => setPlan((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => setTitleEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setTitleEditing(false) }}
            placeholder="제목(선택)"
            maxLength={80}
            style={{ padding: '3px 8px', fontSize: 12.5, borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', minWidth: 140 }}
          />
        ) : (
          <span
            onClick={() => setTitleEditing(true)}
            title="클릭해서 제목 편집"
            style={{ fontSize: 12.5, color: plan.title ? 'var(--text)' : 'var(--muted)', cursor: 'text', border: '1px dashed transparent', padding: '2px 4px', borderRadius: 6 }}
          >{plan.title || '+ 제목'}</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>아이러니 {ironyCount} · 반전후보 {reversalCount}</span>
        <button className="minibtn" onClick={copyAll} title="텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmReset(true)} title="모두 비우기"><Emoji e="🗑️" /> 비우기</button>
      </div>

      {/* 탭 */}
      <div style={tabBar}>
        <button style={tabBtn('matrix', '매트릭스')} onClick={() => setTab('matrix')}><Emoji e="📊" /> 매트릭스</button>
        <button style={tabBtn('timeline', '타임라인')} onClick={() => setTab('timeline')}><Emoji e="⏱️" /> 폭로 타임라인</button>
        <button style={tabBtn('analysis', '분석')} onClick={() => setTab('analysis')}><Emoji e="🔍" /> 분석</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setEditPerson({ id: 'new' })} title="인물(행) 추가">＋ 인물</button>
        <button className="minibtn" onClick={() => setEditFact({ id: 'new' })} title="비밀/사실(열) 추가">＋ 사실</button>
      </div>

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 본문 탭 */}
      <div style={body}>
        {tab === 'matrix' && (
          <MatrixView
            plan={plan}
            onCycleCell={cycleCell}
            onCycleReader={cycleReader}
            onEditPerson={(id) => setEditPerson({ id })}
            onEditFact={(id) => setEditFact({ id })}
            onDelPerson={(id) => setConfirmDel({ kind: 'person', id })}
            onDelFact={(id) => setConfirmDel({ kind: 'fact', id })}
            onMovePerson={movePerson}
            onMoveFact={moveFact}
            onAddPerson={() => setEditPerson({ id: 'new' })}
            onAddFact={() => setEditFact({ id: 'new' })}
          />
        )}
        {tab === 'timeline' && (
          <TimelineView timeline={timeline} onEditFact={(id) => setEditFact({ id })} />
        )}
        {tab === 'analysis' && (
          <AnalysisView groups={allInsights} ironyCount={ironyCount} reversalCount={reversalCount} hasFacts={totalFacts > 0} />
        )}
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addPlanToProject}
          disabled={(totalFacts === 0 && totalPeople === 0) || !hasProjectBridge()}
          title={hasProjectBridge() ? '매트릭스+분석을 프로젝트 자료 "구조" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>좌측 인물/문서를 끌어다 놓으면 행/열로 추가돼요.</span>
      </div>

      {/* 인물 편집 모달 */}
      {editPerson && (
        <PersonEditor
          person={editPerson.id === 'new' ? undefined : plan.people.find((p) => p.id === editPerson.id)}
          onCancel={() => setEditPerson(null)}
          onSave={(name, n) => upsertPerson(editPerson.id, name, n)}
        />
      )}

      {/* 사실 편집 모달 */}
      {editFact && (
        <FactEditor
          fact={editFact.id === 'new' ? undefined : plan.facts.find((f) => f.id === editFact.id)}
          onCancel={() => setEditFact(null)}
          onSave={(f) => upsertFact(editFact.id, f)}
        />
      )}

      {/* 삭제 확인 */}
      {confirmDel && (() => {
        const isP = confirmDel.kind === 'person'
        const name = isP
          ? plan.people.find((p) => p.id === confirmDel.id)?.name
          : plan.facts.find((f) => f.id === confirmDel.id)?.label
        if (!name) return null
        return (
          <Overlay onClose={() => setConfirmDel(null)}>
            <div style={modalCard}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{isP ? '인물 삭제' : '사실 삭제'}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                「{name}」을(를) 삭제할까요?<br />관련된 칸 상태도 함께 사라집니다. 되돌릴 수 없어요.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => isP ? deletePerson(confirmDel.id) : deleteFact(confirmDel.id)}>삭제</button>
              </div>
            </div>
          </Overlay>
        )
      })()}

      {/* 전체 초기화 확인 */}
      {confirmReset && (
        <Overlay onClose={() => setConfirmReset(false)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>모두 비우기</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              인물·사실·칸 상태를 모두 지우고 처음부터 시작할까요?<br />되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmReset(false)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={resetAll}>비우기</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ── 순수 헬퍼: 인물/사실 추가 ───────────────────────────────────────────────────
function addPerson(prev: PlanState, name: string, note: string): PlanState {
  return { ...prev, people: [...prev.people, { id: newId('per'), name, note }] }
}
function addFact(prev: PlanState, label: string, detail: string): PlanState {
  const color = FACT_COLORS[prev.facts.length % FACT_COLORS.length]
  return { ...prev, facts: [...prev.facts, { id: newId('fact'), label, detail, readerKnows: 'unknown', revealBeat: '', color }] }
}

// ── 매트릭스 뷰 ────────────────────────────────────────────────────────────────
function MatrixView({
  plan, onCycleCell, onCycleReader, onEditPerson, onEditFact, onDelPerson, onDelFact, onMovePerson, onMoveFact, onAddPerson, onAddFact,
}: {
  plan: PlanState
  onCycleCell: (pid: string, fid: string) => void
  onCycleReader: (fid: string) => void
  onEditPerson: (id: string) => void
  onEditFact: (id: string) => void
  onDelPerson: (id: string) => void
  onDelFact: (id: string) => void
  onMovePerson: (id: string, dir: -1 | 1) => void
  onMoveFact: (id: string, dir: -1 | 1) => void
  onAddPerson: () => void
  onAddFact: () => void
}) {
  if (plan.people.length === 0 && plan.facts.length === 0) {
    return (
      <EmptyState
        title="아직 매트릭스가 비어 있어요"
        lines={['먼저 비밀/사실(열)과 인물(행)을 추가하세요.', '칸을 클릭하면 모름 → 앎 → 오해 → 의심 순으로 바뀌어요.', '"독자" 행을 함께 설정하면 극적 아이러니가 자동으로 짚여요.']}
        actions={(
          <>
            <button className="btn-primary" onClick={onAddFact}>＋ 첫 사실 추가</button>
            <button className="minibtn" onClick={onAddPerson}>＋ 인물 추가</button>
          </>
        )}
      />
    )
  }

  const cellBase: React.CSSProperties = { border: '1px solid var(--border)', padding: 0, textAlign: 'center', verticalAlign: 'middle' }
  const thLeft: React.CSSProperties = { ...cellBase, position: 'sticky', left: 0, zIndex: 2, background: 'var(--panel)', minWidth: 150, maxWidth: 210, textAlign: 'left' }

  return (
    <div style={{ overflow: 'auto' }}>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5, color: 'var(--muted)', alignItems: 'center' }}>
        <span>칸 클릭으로 순환:</span>
        {KNOW_ORDER.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: KNOW_META[k].bg, border: '1px solid var(--border)', color: KNOW_META[k].color, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{KNOW_META[k].short}</span>
            {KNOW_META[k].label}
          </span>
        ))}
      </div>

      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...thLeft, zIndex: 3, top: 0, position: 'sticky' }}>
              <div style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12 }}>인물 ＼ 사실</div>
            </th>
            {plan.facts.map((f, fi) => (
              <th key={f.id} style={{ ...cellBase, minWidth: 130, maxWidth: 170, background: 'var(--panel)', borderTop: `3px solid ${f.color}`, verticalAlign: 'top' }}>
                <div style={{ padding: '7px 7px 5px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word', textAlign: 'left' }}>{f.label}</div>
                  {f.revealBeat && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, textAlign: 'left' }}><Emoji e="⏱" /> {f.revealBeat}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, flexWrap: 'wrap' }}>
                    <button className="minibtn" style={miniS} title="왼쪽으로" disabled={fi === 0} onClick={() => onMoveFact(f.id, -1)}>◀</button>
                    <button className="minibtn" style={miniS} title="오른쪽으로" disabled={fi === plan.facts.length - 1} onClick={() => onMoveFact(f.id, 1)}>▶</button>
                    <button className="minibtn" style={miniS} title="편집" onClick={() => onEditFact(f.id)}><Emoji e="✏️" /></button>
                    <button className="minibtn" style={{ ...miniS, color: 'var(--warn)' }} title="삭제" onClick={() => onDelFact(f.id)}><Emoji e="🗑️" /></button>
                  </div>
                </div>
              </th>
            ))}
            {plan.facts.length === 0 && (
              <th style={{ ...cellBase, padding: 10, color: 'var(--muted)', fontWeight: 500, minWidth: 160 }}>
                <button className="minibtn" onClick={onAddFact}>＋ 사실 열 추가</button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* 독자 행(특별 강조) */}
          {plan.facts.length > 0 && (
            <tr>
              <th style={{ ...thLeft, background: 'var(--chrome-2)' }}>
                <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}><Emoji e="👁️" /></span>
                  <span style={{ fontWeight: 700 }}>독자</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>관찰자</span>
                </div>
              </th>
              {plan.facts.map((f) => (
                <td key={f.id} style={{ ...cellBase, background: 'var(--chrome-2)' }}>
                  <KnowCell state={f.readerKnows} onClick={() => onCycleReader(f.id)} emphasized />
                </td>
              ))}
            </tr>
          )}

          {/* 인물 행 */}
          {plan.people.map((p, pi) => (
            <tr key={p.id}>
              <th style={thLeft}>
                <div style={{ padding: '7px 10px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, wordBreak: 'break-word' }}>{p.name}</div>
                  {p.note && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word', maxHeight: 32, overflow: 'hidden' }}>{p.note}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, flexWrap: 'wrap' }}>
                    <button className="minibtn" style={miniS} title="위로" disabled={pi === 0} onClick={() => onMovePerson(p.id, -1)}>▲</button>
                    <button className="minibtn" style={miniS} title="아래로" disabled={pi === plan.people.length - 1} onClick={() => onMovePerson(p.id, 1)}>▼</button>
                    <button className="minibtn" style={miniS} title="편집" onClick={() => onEditPerson(p.id)}><Emoji e="✏️" /></button>
                    <button className="minibtn" style={{ ...miniS, color: 'var(--warn)' }} title="삭제" onClick={() => onDelPerson(p.id)}><Emoji e="🗑️" /></button>
                  </div>
                </div>
              </th>
              {plan.facts.map((f) => (
                <td key={f.id} style={cellBase}>
                  <KnowCell state={getCell(plan, p.id, f.id)} onClick={() => onCycleCell(p.id, f.id)} />
                </td>
              ))}
            </tr>
          ))}

          {plan.people.length === 0 && plan.facts.length > 0 && (
            <tr>
              <th style={thLeft}>
                <div style={{ padding: 10 }}>
                  <button className="minibtn" onClick={onAddPerson}>＋ 인물 행 추가</button>
                </div>
              </th>
              {plan.facts.map((f) => <td key={f.id} style={{ ...cellBase, color: 'var(--muted)', fontSize: 11 }}>—</td>)}
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={onAddPerson}>＋ 인물</button>
        <button className="minibtn" onClick={onAddFact}>＋ 사실</button>
      </div>
    </div>
  )
}

function KnowCell({ state, onClick, emphasized }: { state: Know; onClick: () => void; emphasized?: boolean }) {
  const m = KNOW_META[state]
  return (
    <button
      onClick={onClick}
      title={`${m.label} (클릭해서 변경)`}
      style={{
        width: '100%', minWidth: 56, height: 40, border: 'none', cursor: 'pointer',
        background: m.bg, color: m.color, fontSize: emphasized ? 14 : 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        fontFamily: 'inherit', outline: emphasized && state !== 'unknown' ? '1px dashed currentColor' : 'none', outlineOffset: -3,
      }}
    >
      <span style={{ fontSize: 11 }}>{m.icon}</span>
      <span style={{ fontSize: 11 }}>{state === 'unknown' ? '' : m.label}</span>
    </button>
  )
}

// ── 폭로 타임라인 뷰 ───────────────────────────────────────────────────────────
function TimelineView({ timeline, onEditFact }: { timeline: { beat: string; facts: Fact[] }[]; onEditFact: (id: string) => void }) {
  if (timeline.length === 0) {
    return <EmptyState title="공개할 사실이 없어요" lines={['사실을 추가하고 "공개 타이밍(reveal beat)"을 적어 두면', '여기서 폭로 순서대로 묶여 반전 배치를 볼 수 있어요.']} actions={null} />
  }
  return (
    <div style={{ position: 'relative', paddingLeft: 18 }}>
      <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
      {timeline.map((slot, i) => (
        <div key={slot.beat + i} style={{ position: 'relative', marginBottom: 18 }}>
          <div style={{ position: 'absolute', left: -16, top: 4, width: 12, height: 12, borderRadius: '50%', background: slot.beat === '미정' ? 'var(--muted)' : 'var(--accent)', border: '2px solid var(--paper)' }} />
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: slot.beat === '미정' ? 'var(--muted)' : 'var(--text)' }}>
            {slot.beat === '미정' ? <><Emoji e="⏳" /> 공개 타이밍 미정</> : <><Emoji e="⏱" /> {slot.beat}</>}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 6 }}>({slot.facts.length}건)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {slot.facts.map((f) => (
              <div key={f.id} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${f.color}`, borderRadius: 9, padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, wordBreak: 'break-word' }}>{f.label}</div>
                  {f.detail && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45, wordBreak: 'break-word' }}>진실: {f.detail}</div>}
                  <div style={{ fontSize: 10.5, marginTop: 4, color: KNOW_META[f.readerKnows].color, fontWeight: 600 }}>
                    독자: {KNOW_META[f.readerKnows].label}
                  </div>
                </div>
                <button className="minibtn" style={miniS} title="편집" onClick={() => onEditFact(f.id)}><Emoji e="✏️" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 분석 뷰 ────────────────────────────────────────────────────────────────────
function AnalysisView({ groups, ironyCount, reversalCount, hasFacts }: { groups: { fact: Fact; insights: Insight[] }[]; ironyCount: number; reversalCount: number; hasFacts: boolean }) {
  if (!hasFacts) {
    return <EmptyState title="분석할 내용이 없어요" lines={['매트릭스에 인물·사실을 채우면', '극적 아이러니, 오해(시한폭탄), 독자 사각을 자동으로 짚어 드려요.']} actions={null} />
  }
  const toneStyle = (tone: Insight['tone']): React.CSSProperties => ({
    borderLeft: `3px solid ${tone === 'tension' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--muted)'}`,
  })
  const active = groups.filter((g) => g.insights.length > 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Stat label="극적 아이러니" value={ironyCount} color="var(--accent)" />
        <Stat label="반전 후보(오해)" value={reversalCount} color="var(--warn)" />
        <Stat label="사실 수" value={groups.length} color="var(--ok)" />
      </div>
      {active.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 10 }}>
          아직 짚어낼 긴장/반전이 없어요. 칸을 채우고, 특히 <strong>독자 행</strong>을 "앎"으로 두면 인물의 무지/오해와 대비되어 극적 아이러니가 나타납니다.
        </div>
      ) : active.map((g) => (
        <div key={g.fact.id} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: g.fact.color, flexShrink: 0 }} />
            {g.fact.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.insights.map((ins, i) => (
              <div key={i} style={{ ...toneStyle(ins.tone), background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px', fontSize: 12, lineHeight: 1.55 }}>
                {ins.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── 빈 상태 안내 ───────────────────────────────────────────────────────────────
function EmptyState({ title, lines, actions }: { title: string; lines: string[]; actions: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: '40px 16px', minHeight: 220 }}>
      <div style={{ fontSize: 32 }}><Emoji e="🎭" /></div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>{actions}</div>}
    </div>
  )
}

const miniS: React.CSSProperties = { padding: '2px 6px', fontSize: 10.5, lineHeight: 1.1, minWidth: 0 }

// ── 모달 오버레이 ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
    >
      {children}
    </div>
  )
}
const modalCard: React.CSSProperties = {
  width: '100%', maxWidth: 380, background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', boxSizing: 'border-box',
  maxHeight: '90%', overflow: 'auto',
}
const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
const labelS: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

// ── 인물 편집기 ───────────────────────────────────────────────────────────────
function PersonEditor({ person, onCancel, onSave }: { person?: Person; onCancel: () => void; onSave: (name: string, note: string) => void }) {
  const [name, setName] = useState(person?.name || '')
  const [note, setNote] = useState(person?.note || '')
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => onSave(name, note)
  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 400 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{person ? '인물 편집' : '새 인물(행)'}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelS}>이름 *</label>
          <input ref={ref} style={inputBase} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="예: 주인공, 연인, 형사…" maxLength={80} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelS}>역할 / 메모</label>
          <textarea style={{ ...inputBase, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="이 인물의 위치, 무엇을 노리는지…" maxLength={400} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>{person ? '저장' : '추가'}</button>
        </div>
      </div>
    </Overlay>
  )
}

// ── 사실 편집기 ───────────────────────────────────────────────────────────────
function FactEditor({ fact, onCancel, onSave }: { fact?: Fact; onCancel: () => void; onSave: (f: { label: string; detail: string; readerKnows: Know; revealBeat: string }) => void }) {
  const [label, setLabel] = useState(fact?.label || '')
  const [detail, setDetail] = useState(fact?.detail || '')
  const [readerKnows, setReaderKnows] = useState<Know>(fact?.readerKnows || 'unknown')
  const [revealBeat, setRevealBeat] = useState(fact?.revealBeat || '')
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => onSave({ label, detail, readerKnows, revealBeat })
  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 440 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{fact ? '사실/비밀 편집' : '새 비밀/사실(열)'}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 14 }}>이야기 속 하나의 정보 — 누가 알고 누가 모르는지로 긴장을 만듭니다.</div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelS}>비밀/사실 이름 *</label>
          <input ref={ref} style={inputBase} value={label} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder='예: "연인은 사실 적의 첩자다"' maxLength={140} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelS}>진실(실제로 무엇인가)</label>
          <textarea style={{ ...inputBase, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }} value={detail}
            onChange={(e) => setDetail(e.target.value)} placeholder="실제 사실 관계. '오해'는 이와 어긋나는 믿음을 뜻해요." maxLength={1000} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelS}>독자는 이 사실을…</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KNOW_ORDER.map((k) => (
              <button key={k} onClick={() => setReaderKnows(k)} style={{
                padding: '6px 12px', fontSize: 12.5, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid ' + (readerKnows === k ? KNOW_META[k].color : 'var(--border)'),
                background: readerKnows === k ? KNOW_META[k].bg : 'var(--paper)',
                color: readerKnows === k ? KNOW_META[k].color : 'var(--text)', fontWeight: readerKnows === k ? 700 : 500,
              }}>{KNOW_META[k].label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>독자가 "앎"이면 인물의 무지·오해와 대비되어 극적 아이러니가 생깁니다.</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelS}>공개 타이밍(reveal beat)</label>
          <input style={inputBase} value={revealBeat} onChange={(e) => setRevealBeat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder='예: "2막 중간점", "12장", "결말"' maxLength={80} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!label.trim()}>{fact ? '저장' : '추가'}</button>
        </div>
      </div>
    </Overlay>
  )
}
