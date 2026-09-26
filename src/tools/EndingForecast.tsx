// 결말 예보 — 현재까지 쌓은 설정 요인(톤·정의·대가·운명관 등 11개 슬라이더)과 미해결 복선/실,
// 그리고 인물 아크의 방향을 입력으로, 가능한 "결말 분기" 6종(상승/씁쓸한 승리/희생/순환/파멸/열린결말 등)에
// 대한 "기상 확률"을 결정론적으로 예측한다. 각 분기는 확률 막대 + 날씨 비유(맑음~폭풍) + 근거 요약으로 표시.
// 미해결 실(복선/떡밥)은 "우산 경고"로 묶어 결말 전 회수 권고. 인물별 아크 도착점도 함께 예보.
//   - 자급식: react / './linkbus' 외 import 없음. 외부 네트워크/API 없음. 전부 로컬 결정론 계산.
//   - 연동: 인물 라이브러리(characters) 수용·아크 예보 → 캐릭터 라이브러리에 노트 저장,
//           좌측 바인더 드롭/payload.text 로 원고를 받아 미해결 실 자동 추출,
//           addToProject 로 '결말 예보 리포트'를 자료에 추가, addToStash 로 시나리오 메모,
//           openToolLinked 로 관련 플롯 도구 열기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge, addToStash, hasStash,
  openToolLinked, useLibraryList, addToLibrary, updateInLibrary,
  getDragItem, isItemDrag,
} from './linkbus'

export const meta = {
  id: 'ending-forecast',
  name: '결말 예보',
  icon: '🔮',
  group: '플롯',
  intro: '설정·복선·아크에서 가능한 결말 분기와 "기상 확률"을 예보하고 미해결 실을 경고합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:ending-forecast'

// ── 결정론 유틸 ────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}
function clamp(n: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, n)) }
function pct(n: number): string { return Math.round(n) + '%' }

// ── 설정 요인 슬라이더(축) ─────────────────────────────────
// 각 축은 0~100. 왼쪽 라벨(0) ↔ 오른쪽 라벨(100)의 성향.
interface Axis { key: string; left: string; right: string; tip: string }
const AXES: Axis[] = [
  { key: 'tone', left: '비극적', right: '희망적', tip: '작품 전반의 정서 기조' },
  { key: 'justice', left: '부조리', right: '권선징악', tip: '세계가 정의에 보답하는 정도' },
  { key: 'cost', left: '무대가', right: '큰 희생', tip: '목표 달성에 치를 대가의 크기' },
  { key: 'agency', left: '운명론', right: '자유의지', tip: '인물이 결말을 바꿀 수 있는가' },
  { key: 'closure', left: '열린', right: '닫힌', tip: '결말의 매듭/봉합 정도' },
  { key: 'irony', left: '직선적', right: '반전적', tip: '아이러니·역설의 강도' },
  { key: 'scope', left: '개인적', right: '세계적', tip: '결말이 흔드는 판의 크기' },
  { key: 'love', left: '냉혹', right: '관계 회복', tip: '관계/사랑의 성취 비중' },
  { key: 'moral', left: '회색', right: '명료', tip: '도덕적 선악의 명료함' },
  { key: 'realism', left: '환상적', right: '현실적', tip: '핍진성 vs 환상성' },
  { key: 'cycle', left: '단절', right: '순환', tip: '시작으로 돌아오는 회귀 구조' },
]
type AxisVals = Record<string, number>
const defaultAxes = (): AxisVals => Object.fromEntries(AXES.map((a) => [a.key, 50]))

// ── 결말 분기 정의 ─────────────────────────────────────────
// score 함수: 축 값(0~100)을 받아 이 분기의 "원점수"를 낸다(결정론).
interface Branch {
  id: string
  name: string
  blurb: string
  // 날씨 5단계 비유(확률 높을수록 맑음 쪽). [최저확률대상]
  score: (v: AxisVals) => number
  reasons: (v: AxisVals) => string[]
}
const A = (v: AxisVals, k: string) => clamp(v[k] ?? 50, 0, 100)

const BRANCHES: Branch[] = [
  {
    id: 'triumph',
    name: '완전한 승리',
    blurb: '주인공이 대가를 넘어 목표를 이루고 세계가 보답한다.',
    score: (v) => 0.5 * A(v, 'tone') + 0.5 * A(v, 'justice') + 0.4 * A(v, 'love') + 0.3 * A(v, 'agency') + 0.2 * A(v, 'closure') - 0.5 * A(v, 'cost') - 0.3 * A(v, 'irony'),
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'justice') > 60) r.push('세계가 정의에 보답하는 성향이 강함')
      if (A(v, 'cost') < 40) r.push('치를 대가가 작아 깨끗한 승리가 가능')
      if (A(v, 'tone') > 60) r.push('희망적 기조가 상승 결말을 끌어당김')
      return r
    },
  },
  {
    id: 'bittersweet',
    name: '씁쓸한 승리',
    blurb: '목표는 이루나 잃은 것의 무게가 승리를 물들인다.',
    score: (v) => 0.45 * A(v, 'cost') + 0.4 * A(v, 'justice') + 0.35 * A(v, 'irony') + 0.25 * A(v, 'moral') - 0.4 * Math.abs(A(v, 'tone') - 50) + 30,
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'cost') > 55) r.push('큰 희생이 승리에 그늘을 드리움')
      if (Math.abs(A(v, 'tone') - 50) < 25) r.push('희망과 비극의 중간 기조가 양가적 결말에 적합')
      if (A(v, 'irony') > 55) r.push('아이러니가 승리의 의미를 비틀음')
      return r
    },
  },
  {
    id: 'sacrifice',
    name: '희생적 결말',
    blurb: '주인공이 자신을 내어주고 남은 이들에게 미래를 남긴다.',
    score: (v) => 0.6 * A(v, 'cost') + 0.4 * A(v, 'love') + 0.3 * A(v, 'scope') + 0.25 * A(v, 'moral') - 0.4 * A(v, 'agency') - 0.2 * A(v, 'tone') + 10,
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'cost') > 60) r.push('대가 축이 높아 자기희생의 개연성이 큼')
      if (A(v, 'love') > 55) r.push('관계 회복 비중이 희생의 동기를 강화')
      if (A(v, 'scope') > 60) r.push('세계적 판이 한 사람의 희생을 요구')
      return r
    },
  },
  {
    id: 'tragic',
    name: '파멸/비극',
    blurb: '대가를 치르고도 무너진다. 부조리가 인물을 압도한다.',
    score: (v) => 0.6 * (100 - A(v, 'tone')) + 0.45 * (100 - A(v, 'justice')) + 0.3 * A(v, 'cost') + 0.25 * (100 - A(v, 'agency')) - 0.3 * A(v, 'love') - 20,
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'tone') < 40) r.push('비극적 기조가 하강 결말을 끌어당김')
      if (A(v, 'justice') < 40) r.push('부조리한 세계가 노력을 배신')
      if (A(v, 'agency') < 40) r.push('운명론적 설정이 회피 불가능을 암시')
      return r
    },
  },
  {
    id: 'cycle',
    name: '순환/회귀',
    blurb: '끝이 곧 시작. 같은 자리로 돌아오거나 다음 세대로 넘어간다.',
    score: (v) => 0.7 * A(v, 'cycle') + 0.3 * A(v, 'irony') + 0.2 * (100 - A(v, 'closure')) + 0.15 * (100 - A(v, 'agency')) - 0.2 * A(v, 'justice'),
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'cycle') > 55) r.push('순환 구조 성향이 회귀 결말을 강하게 시사')
      if (A(v, 'closure') < 45) r.push('느슨한 매듭이 열린 순환에 어울림')
      if (A(v, 'irony') > 55) r.push('역설이 끝-시작의 겹침을 강화')
      return r
    },
  },
  {
    id: 'open',
    name: '열린 결말',
    blurb: '결정적 답을 보류하고 해석을 독자에게 넘긴다.',
    score: (v) => 0.7 * (100 - A(v, 'closure')) + 0.3 * (100 - A(v, 'moral')) + 0.25 * A(v, 'realism') + 0.2 * A(v, 'irony') - 0.3 * A(v, 'justice') - 10,
    reasons: (v) => {
      const r: string[] = []
      if (A(v, 'closure') < 40) r.push('낮은 봉합도가 명시적 해답을 거부')
      if (A(v, 'moral') < 45) r.push('도덕적 회색지대가 단정적 끝을 피함')
      if (A(v, 'realism') > 60) r.push('현실적 핍진성이 깔끔한 종결을 거부')
      return r
    },
  },
]

// 날씨 비유: 확률(0~100) → 단계
function weather(p: number): { label: string; bar: string; color: string } {
  if (p >= 45) return { label: '맑음 (유력)', bar: '청명', color: '#46b06f' }
  if (p >= 28) return { label: '구름 조금 (가능)', bar: '엷은 구름', color: '#3f8de0' }
  if (p >= 16) return { label: '흐림 (낮음)', bar: '흐림', color: '#e0a32b' }
  if (p >= 8) return { label: '비 (희박)', bar: '약한 비', color: '#c277e0' }
  return { label: '폭풍 (거의 없음)', bar: '폭풍', color: '#e0533d' }
}

// ── 미해결 실(복선/떡밥) ───────────────────────────────────
interface Thread { id: string; text: string; resolved: boolean }
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 원고 텍스트에서 미회수 가능성이 높은 "실" 후보 문장을 휴리스틱으로 추출(결정론).
const SEED_WORDS = ['비밀', '약속', '복수', '예언', '저주', '편지', '열쇠', '진실', '정체', '사라진', '돌아오', '언젠가', '반드시', '숨겨', '의문', '수상', '왜', '누가', '미스터리', '단서', '계획', '경고', '운명', '잊지']
function extractThreads(text: string, limit = 12): string[] {
  if (!text) return []
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ')
  const sents = clean.split(/(?<=[.!?。…])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 6 && s.length <= 120)
  const scored = sents.map((s) => {
    let sc = 0
    for (const w of SEED_WORDS) if (s.includes(w)) sc += 1
    if (/[?？]$/.test(s)) sc += 1
    return { s, sc }
  }).filter((x) => x.sc > 0)
  // 점수 내림차순, 동점은 문장 해시로 안정 정렬(결정론)
  scored.sort((a, b) => (b.sc - a.sc) || (hash(a.s) - hash(b.s)))
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of scored) {
    const key = x.s.slice(0, 24)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(x.s)
    if (out.length >= limit) break
  }
  return out
}

// ── 인물 아크 예보 ─────────────────────────────────────────
// 라이브러리 캐릭터의 목표/약점/역할에서 도착점 비유를 결정론으로 뽑는다.
const ARC_ENDS = [
  '욕망을 이루지만 자신을 잃는다',
  '약점을 극복하고 한 단계 성숙한다',
  '끝내 약점에 발목 잡혀 추락한다',
  '목표를 포기하고 더 큰 것을 얻는다',
  '비밀이 드러나며 관계가 재편된다',
  '희생으로 다른 이의 길을 연다',
  '제자리로 돌아오지만 시선이 바뀐다',
  '적과 화해하거나 동화된다',
]
interface ArcPick { name: string; role: string; end: string; conf: number }
function arcForChar(name: string, role: string, goal: string, flaw: string, axes: AxisVals): ArcPick {
  const seed = hash(name + '|' + role + '|' + goal + '|' + flaw)
  let idx = seed % ARC_ENDS.length
  // 설정 축이 도착점을 보정: 비극적/대가↑ → 추락·희생 쪽, 희망적 → 성숙 쪽
  if (A(axes, 'tone') < 35 && (idx === 1 || idx === 3)) idx = (seed % 2 === 0) ? 2 : 5
  if (A(axes, 'tone') > 70 && (idx === 2)) idx = 1
  if (A(axes, 'cost') > 70 && idx !== 5 && (seed >> 3) % 3 === 0) idx = 5
  const conf = 45 + (seed % 45)
  return { name, role: role || '인물', end: ARC_ENDS[idx], conf }
}

// ── 저장 형태 ──────────────────────────────────────────────
interface SaveShape {
  axes: AxisVals
  threads: Thread[]
  premise: string
  selectedChars: string[]   // 라이브러리 캐릭터 id
}
function loadSave(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<SaveShape>
      return {
        axes: { ...defaultAxes(), ...(p.axes || {}) },
        threads: Array.isArray(p.threads) ? p.threads.filter((t) => t && typeof t.text === 'string').map((t) => ({ id: t.id || newId(), text: String(t.text), resolved: !!t.resolved })) : [],
        premise: typeof p.premise === 'string' ? p.premise : '',
        selectedChars: Array.isArray(p.selectedChars) ? p.selectedChars.filter((x) => typeof x === 'string') : [],
      }
    }
  } catch { /* ignore */ }
  return { axes: defaultAxes(), threads: [], premise: '', selectedChars: [] }
}

export default function EndingForecast({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadSave())
  const [axes, setAxes] = useState<AxisVals>(init.current.axes)
  const [threads, setThreads] = useState<Thread[]>(init.current.threads)
  const [premise, setPremise] = useState(init.current.premise)
  const [selectedChars, setSelectedChars] = useState<string[]>(init.current.selectedChars)
  const [draftText, setDraftText] = useState('')
  const [newThread, setNewThread] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const [flash, setFlash] = useState('')
  const [tab, setTab] = useState<'forecast' | 'threads' | 'arcs'>('forecast')

  const chars = useLibraryList('characters')

  // payload 수용: payload.text(원고) → 실 추출 후보, payload.premise → 전제
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : ''
    if (t) setDraftText((d) => d || t)
    const pr = typeof payload.premise === 'string' ? payload.premise : (typeof payload.title === 'string' ? payload.title : '')
    if (pr) setPremise((p) => p || pr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ axes, threads, premise, selectedChars } as SaveShape)) } catch { /* noop */ }
  }, [axes, threads, premise, selectedChars])

  // flash 정리
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(''), 2200)
    return () => window.clearTimeout(t)
  }, [flash])

  // ── 예보 계산 ──
  const forecast = useMemo(() => {
    const raw = BRANCHES.map((b) => ({ b, raw: b.score(axes) }))
    // 미해결 실 비중이 높으면 '열린'을 약간 끌어올리고 '완전한 승리'를 누른다(개연성 보정)
    const unresolved = threads.filter((t) => !t.resolved).length
    const total = threads.length || 1
    const openFactor = unresolved / total
    const adjusted = raw.map(({ b, raw }) => {
      let s = raw
      if (b.id === 'open') s += openFactor * 25
      if (b.id === 'triumph') s -= openFactor * 20
      if (b.id === 'cycle') s += openFactor * 8
      return { b, s: Math.max(0.5, s) }
    })
    // softmax-ish 정규화 → 확률
    const sum = adjusted.reduce((a, x) => a + x.s, 0)
    const probs = adjusted.map((x) => ({ b: x.b, p: (x.s / sum) * 100 }))
    probs.sort((a, b) => b.p - a.p)
    return probs
  }, [axes, threads])

  const top = forecast[0]

  // ── 인물 아크 예보 ──
  const arcs: ArcPick[] = useMemo(() => {
    const picked = chars.filter((c) => selectedChars.includes(c.id))
    const list = picked.length ? picked : chars.slice(0, 4)
    return list.slice(0, 8).map((c) => {
      const f = c.fields || {}
      const goal = f.goal || c.goal || ''
      const flaw = f.flaw || ''
      const role = f.role || c.role || ''
      return arcForChar(c.name || '무명', role, goal, flaw, axes)
    })
  }, [chars, selectedChars, axes])

  // ── 동작 ──
  const setAxis = (k: string, n: number) => setAxes((a) => ({ ...a, [k]: clamp(n, 0, 100) }))
  const resetAxes = () => setAxes(defaultAxes())

  const addThread = (text: string) => {
    const t = text.trim()
    if (!t) return
    setThreads((prev) => [{ id: newId(), text: t, resolved: false }, ...prev])
  }
  const toggleThread = (id: string) => setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, resolved: !t.resolved } : t)))
  const removeThread = (id: string) => setThreads((prev) => prev.filter((t) => t.id !== id))

  const ingestDraft = () => {
    const cands = extractThreads(draftText)
    if (!cands.length) { setFlash('추출된 실 후보가 없어요. 더 긴 원고를 넣어보세요.'); return }
    // 중복 제외 후 실제 추가분을 업데이터 밖에서 계산해 정확한 개수를 안내
    const have = new Set(threads.map((t) => t.text.slice(0, 24)))
    const adds = cands.filter((c) => !have.has(c.slice(0, 24))).map((c) => ({ id: newId(), text: c, resolved: false }))
    setThreads((prev) => [...adds, ...prev])
    setTab('threads')
    if (adds.length) setFlash(adds.length + '개의 실 후보를 추출했어요. 회수 여부를 표시하세요.')
    else setFlash('새로 추가할 실 후보가 없어요. 이미 모두 등록되어 있습니다.')
  }

  const onDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const it = getDragItem(e)
    if (it) {
      e.preventDefault()
      if (it.text) setDraftText(it.text)
      if (it.title && !premise) setPremise(it.title)
      setFlash('바인더 문서 "' + (it.title || '문서') + '"를 받았어요. 실 추출을 눌러보세요.')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }

  const toggleChar = (id: string) =>
    setSelectedChars((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // 리포트 텍스트(복사/내보내기 공용)
  const reportText = useMemo(() => {
    const lines: string[] = []
    lines.push('[결말 예보 리포트]')
    if (premise) lines.push('전제: ' + premise)
    lines.push('')
    lines.push('= 결말 분기 기상 확률 =')
    forecast.forEach((f, i) => {
      lines.push((i + 1) + '. ' + f.b.name + ' — ' + pct(f.p) + ' (' + weather(f.p).label + ')')
      lines.push('   ' + f.b.blurb)
      const rs = f.b.reasons(axes)
      if (rs.length) lines.push('   근거: ' + rs.join(' / '))
    })
    const unresolved = threads.filter((t) => !t.resolved)
    lines.push('')
    lines.push('= 미해결 실 경고 (' + unresolved.length + '/' + threads.length + ') =')
    if (!unresolved.length) lines.push('   모든 실이 회수 표시됨.')
    unresolved.forEach((t) => lines.push('   - ' + t.text))
    if (arcs.length) {
      lines.push('')
      lines.push('= 인물 아크 도착점 예보 =')
      arcs.forEach((a) => lines.push('   - ' + a.name + ' (' + a.role + '): ' + a.end + ' [신뢰도 ' + a.conf + '%]'))
    }
    return lines.join('\n')
  }, [forecast, threads, arcs, premise, axes])

  const reportHtml = useMemo(() => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const parts: string[] = []
    if (premise) parts.push('<p><strong>전제</strong> ' + esc(premise) + '</p>')
    parts.push('<p><strong>결말 분기 기상 확률</strong></p><ol>')
    forecast.forEach((f) => {
      parts.push('<li><strong>' + esc(f.b.name) + '</strong> — ' + pct(f.p) + ' (' + esc(weather(f.p).label) + ')<br>' + esc(f.b.blurb) + '</li>')
    })
    parts.push('</ol>')
    const unresolved = threads.filter((t) => !t.resolved)
    parts.push('<p><strong>미해결 실 (' + unresolved.length + '/' + threads.length + ')</strong></p><ul>')
    if (!unresolved.length) parts.push('<li>모든 실이 회수 표시됨</li>')
    unresolved.forEach((t) => parts.push('<li>' + esc(t.text) + '</li>'))
    parts.push('</ul>')
    if (arcs.length) {
      parts.push('<p><strong>인물 아크 도착점 예보</strong></p><ul>')
      arcs.forEach((a) => parts.push('<li>' + esc(a.name) + ' (' + esc(a.role) + '): ' + esc(a.end) + ' [신뢰도 ' + a.conf + '%]</li>'))
      parts.push('</ul>')
    }
    return parts.join('')
  }, [forecast, threads, arcs, premise])

  const toProject = () => {
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯 분석',
      title: '결말 예보 — ' + (premise ? premise.slice(0, 24) : top ? top.b.name : '리포트'),
      bodyHtml: reportHtml,
      synopsis: top ? (top.b.name + ' ' + pct(top.p) + ' 유력') : '결말 예보',
      meta: {
        유력결말: top ? top.b.name : '',
        유력확률: top ? pct(top.p) : '',
        미해결실: String(threads.filter((t) => !t.resolved).length),
      },
    })
    setFlash(id ? '프로젝트 자료(플롯 분석)에 리포트를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  const toStash = () => {
    if (!hasStash()) { setFlash('수집함이 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'memo', label: '결말 예보' + (top ? ' — ' + top.b.name : ''), text: reportText })
    setFlash('수집함에 결말 예보를 담았어요.')
  }

  const saveArcsToLibrary = () => {
    if (!arcs.length) { setFlash('예보할 인물이 없습니다. 인물 라이브러리에 인물을 추가하세요.'); return }
    const seenNames = new Set<string>()
    arcs.forEach((a) => {
      if (seenNames.has(a.name)) return
      seenNames.add(a.name)
      const arcNote = '결말 예보: ' + a.end + ' (신뢰도 ' + a.conf + '%)'
      const existing = chars.find((c) => (c.name || '무명') === a.name)
      if (existing) {
        updateInLibrary('characters', existing.id, {
          fields: { ...(existing.fields || {}), name: a.name, role: a.role, arc: arcNote },
        })
      } else {
        addToLibrary('characters', {
          name: a.name,
          fields: { name: a.name, role: a.role, arc: arcNote },
          source: 'ending-forecast',
        })
      }
    })
    setFlash(arcs.length + '명의 아크 예보를 인물 라이브러리에 노트로 저장했어요.')
  }

  const copyReport = () => {
    if (!navigator.clipboard) { setFlash('이 환경은 클립보드 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(reportText).then(() => setFlash('리포트를 복사했어요.')).catch(() => setFlash('복사에 실패했어요.'))
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const box: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }
  const scroll: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }

  const unresolvedCount = threads.filter((t) => !t.resolved).length

  return (
    <div
      style={{ ...wrap, outline: dropHot ? '2px dashed var(--accent)' : 'none' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={() => setDropHot(false)}
    >
      <div style={hint}>
        설정 요인과 미해결 복선, 인물 아크로 <b>가능한 결말</b>의 기상 확률을 예보합니다.
        좌측 바인더 문서를 끌어다 놓으면 원고에서 미회수 <b>실</b>을 자동 추출합니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([['forecast', '예보'], ['threads', '미해결 실 (' + unresolvedCount + ')'], ['arcs', '아크 예보']] as const).map(([id, label]) => (
          <button key={id} className="minibtn" onClick={() => setTab(id)} aria-pressed={tab === id}
            style={{ borderColor: tab === id ? 'var(--accent)' : 'var(--border)', color: tab === id ? 'var(--text)' : 'var(--muted)', flex: 1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* 전제 입력(공통) */}
      <input
        className="field"
        value={premise}
        onChange={(e) => setPremise(e.target.value)}
        placeholder="작품 전제 한 줄 (선택) — 예: 복수를 좇던 검객이 진실 앞에 선다"
        style={{ fontSize: 13 }}
      />

      {tab === 'forecast' && (
        <div style={scroll}>
          {/* 대표 예보 카드 */}
          {top && (
            <div style={{ ...box, borderColor: weather(top.p).color }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>가장 유력한 결말</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{top.b.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: weather(top.p).color }}>{pct(top.p)}</div>
                <div style={{ fontSize: 12, color: weather(top.p).color, fontWeight: 700 }}>{weather(top.p).label}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{top.b.blurb}</div>
            </div>
          )}

          {/* 전체 분기 확률 막대 */}
          <div style={box}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>결말 분기 기상 확률</div>
            {forecast.map((f) => {
              const w = weather(f.p)
              const rs = f.b.reasons(axes)
              return (
                <div key={f.b.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f.b.name}</span>
                    <span style={{ fontSize: 11, color: w.color, fontWeight: 700 }}>{w.bar}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: 'right' }}>{pct(f.p)}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', marginTop: 3 }}>
                    <div style={{ width: clamp(f.p, 0, 100) + '%', height: '100%', background: w.color, transition: 'width .25s' }} />
                  </div>
                  {rs.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>{rs.join(' · ')}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 우산 경고 */}
          {unresolvedCount > 0 && (
            <div style={{ ...box, borderColor: 'var(--warn)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>우산 경고 — 미해결 실 {unresolvedCount}개</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                결말 전에 회수하지 않으면 독자에게 "흐림"이 남습니다. [미해결 실] 탭에서 회수 여부를 점검하세요.
              </div>
            </div>
          )}

          {/* 설정 요인 슬라이더 */}
          <div style={box}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>설정 요인 (예보 입력)</span>
              <button className="minibtn" onClick={resetAxes}>가운데로</button>
            </div>
            {AXES.map((ax) => (
              <div key={ax.key} style={{ marginBottom: 8 }} title={ax.tip}>
                <div style={{ display: 'flex', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                  <span>{ax.left}</span>
                  <span style={{ flex: 1, textAlign: 'center', color: 'var(--text)', fontWeight: 600 }}>{A(axes, ax.key)}</span>
                  <span>{ax.right}</span>
                </div>
                <input
                  type="range" min={0} max={100} step={1}
                  value={A(axes, ax.key)}
                  onChange={(e) => setAxis(ax.key, Number(e.target.value))}
                  style={{ width: '100%' }}
                  aria-label={ax.left + ' 대 ' + ax.right}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'threads' && (
        <div style={scroll}>
          {/* 원고 → 실 추출 */}
          <div style={box}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>원고에서 미해결 실 추출</div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="원고/시놉시스를 붙여넣거나 좌측 바인더 문서를 끌어다 놓으세요. 비밀·약속·예언·복수 같은 단서 문장을 골라냅니다."
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
            />
            <button className="btn-primary" style={{ marginTop: 6, width: '100%' }} onClick={ingestDraft} disabled={!draftText.trim()}>
              원고에서 실 후보 추출
            </button>
          </div>

          {/* 수동 추가 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="field"
              value={newThread}
              onChange={(e) => setNewThread(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { addThread(newThread); setNewThread('') } }}
              placeholder="실(복선/떡밥) 직접 추가 후 엔터"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button className="minibtn" onClick={() => { addThread(newThread); setNewThread('') }} disabled={!newThread.trim()}>추가</button>
          </div>

          {/* 실 목록 */}
          {threads.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 12px', lineHeight: 1.6, fontSize: 13 }}>
              아직 등록된 실이 없습니다.<br />원고를 넣어 자동 추출하거나 직접 추가하세요.
            </div>
          )}
          {threads.map((t) => (
            <div key={t.id} style={{ ...box, display: 'flex', alignItems: 'center', gap: 8, opacity: t.resolved ? 0.55 : 1 }}>
              <button className="minibtn" onClick={() => toggleThread(t.id)} title={t.resolved ? '회수 해제' : '회수 완료로 표시'}
                style={{ borderColor: t.resolved ? 'var(--ok)' : 'var(--warn)', color: t.resolved ? 'var(--ok)' : 'var(--warn)', minWidth: 64 }}>
                {t.resolved ? '회수됨' : '미회수'}
              </button>
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45, textDecoration: t.resolved ? 'line-through' : 'none' }}>{t.text}</span>
              <button className="minibtn" onClick={() => removeThread(t.id)} title="삭제" style={{ borderColor: 'var(--border)' }}>삭제</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'arcs' && (
        <div style={scroll}>
          <div style={box}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>인물 선택 (라이브러리)</div>
            {chars.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                인물 라이브러리가 비어 있습니다. 캐릭터 도구에서 인물을 만들면 여기서 아크 도착점을 예보합니다.
                <div style={{ marginTop: 6 }}>
                  <button className="linkbtn" onClick={() => openToolLinked('character-forge', { from: 'ending-forecast' })}>인물 만들러 가기</button>
                </div>
              </div>
            )}
            {chars.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {chars.slice(0, 24).map((c) => {
                  const on = selectedChars.includes(c.id)
                  return (
                    <button key={c.id} className="minibtn" onClick={() => toggleChar(c.id)}
                      style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                      {c.name || '무명'}
                    </button>
                  )
                })}
              </div>
            )}
            {chars.length > 0 && (
              <div style={{ ...hint, marginTop: 6 }}>선택 없으면 상위 인물 자동 예보. 설정 요인(기조/대가)이 도착점을 보정합니다.</div>
            )}
          </div>

          {arcs.map((a, i) => (
            <div key={a.name + i} style={box}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.role}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>신뢰도 {a.conf}%</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{a.end}</div>
            </div>
          ))}

          {arcs.length > 0 && (
            <button className="minibtn" onClick={saveArcsToLibrary}>아크 예보를 인물 라이브러리에 저장</button>
          )}
        </div>
      )}

      {/* 연계 바 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '결말 예보 리포트를 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함 미연결'}>수집함</button>
        <button className="linkbtn" onClick={copyReport}>리포트 복사</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { premise })} title="반전 카드덱 열기">반전 카드</button>
        <button className="linkbtn" onClick={() => openToolLinked('tension-orchestra', { premise })} title="긴장 곡선으로">긴장 곡선</button>
      </div>

      {flash && <div style={{ ...hint, color: 'var(--ok)' }}>{flash}</div>}
    </div>
  )
}
