// 재난 시뮬 — 세계(지역)에 재난(역병/전쟁/기후변화)을 투입하면 인구·경제·사회·치안·식량의
// 연쇄 반응을 단계별(턴)로 결정론적 시뮬레이션한다. 각 재난은 매 턴 다섯 지표에 작용하고,
// 지표 간에도 상호작용(식량 붕괴→사회불안→치안악화→경제하락→인구감소 등)이 일어난다.
// 임계치를 넘으면 "사건"(폭동/대탈출/정변/혁신 등)이 발생해 흐름을 바꾸고 연표로 기록된다.
// SVG 라인차트로 지표 추이를 시각화하고, 결과를 세계관 연표/장소 설정으로 내보낸다.
// 자급식: react 와 ./linkbus 만 import. 전부 로컬 결정론(시드=장소명/제목 해시).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  PLACE_FIELDS,
} from './linkbus'

export const meta = {
  id: 'world-disaster-sim', name: '재난 시뮬', icon: '🌋', group: '세계관',
  intro: '세계에 재난(역병·전쟁·기후변화)을 투입해 인구·경제·사회의 연쇄 반응을 단계별로 시뮬레이션하세요',
  w: 500, h: 620,
}

const LS_KEY = 'sry:tool:world-disaster-sim'

// ── 지표 정의 ───────────────────────────────────────────────
// 다섯 지표. 0~100 척도. 높을수록 좋음(생존·안정).
type MetricKey = 'population' | 'economy' | 'social' | 'security' | 'food'
interface Metric { key: MetricKey; label: string; color: string }
const METRICS: Metric[] = [
  { key: 'population', label: '인구', color: '#e06c75' },
  { key: 'economy', label: '경제', color: '#e5a04a' },
  { key: 'social', label: '사회안정', color: '#56b6c2' },
  { key: 'security', label: '치안', color: '#61afef' },
  { key: 'food', label: '식량', color: '#98c379' },
]
type State = Record<MetricKey, number>

// ── 재난 정의 ───────────────────────────────────────────────
// 각 재난은 매 턴 지표에 직접 가하는 압력(per-turn delta)을 가진다.
// decay: 시간이 갈수록 압력이 약해지는 정도(1=일정, <1 점차 완화, >1 점차 격화).
interface Disaster {
  key: string; label: string; desc: string
  pressure: Partial<Record<MetricKey, number>>
  decay: number
}
const DISASTERS: Disaster[] = [
  {
    key: 'plague', label: '역병', desc: '치명적 전염병이 퍼진다. 인구가 직접 줄고, 노동력 상실로 경제·식량이 흔들린다.',
    pressure: { population: -7, economy: -4, social: -3, food: -2 }, decay: 0.92,
  },
  {
    key: 'war', label: '전쟁', desc: '무력 충돌이 발발한다. 치안·경제가 급락하고 인구가 소모된다.',
    pressure: { security: -8, economy: -6, population: -4, social: -3 }, decay: 1.04,
  },
  {
    key: 'climate', label: '기후변화', desc: '장기 기후 재난(가뭄·홍수). 식량이 서서히 무너지며 사회를 압박한다.',
    pressure: { food: -6, economy: -2, social: -2 }, decay: 1.02,
  },
  {
    key: 'famine', label: '대기근', desc: '흉작이 겹쳐 식량이 바닥난다. 굶주림이 인구와 사회를 동시에 갉는다.',
    pressure: { food: -9, population: -3, social: -4 }, decay: 0.97,
  },
  {
    key: 'collapse', label: '경제붕괴', desc: '금융·교역이 마비된다. 경제가 무너지며 사회불안과 치안악화를 부른다.',
    pressure: { economy: -9, social: -4, security: -3 }, decay: 0.95,
  },
  {
    key: 'unrest', label: '내란', desc: '정권에 맞선 봉기. 사회안정과 치안이 붕괴하고 경제가 정지한다.',
    pressure: { social: -8, security: -7, economy: -4 }, decay: 1.0,
  },
  {
    key: 'quake', label: '대지진', desc: '도시 기반시설이 붕괴한다. 한 번에 큰 충격을 주지만 점차 복구된다.',
    pressure: { economy: -7, population: -5, food: -3, security: -3 }, decay: 0.82,
  },
  {
    key: 'magic', label: '이계 침공', desc: '미지의 위협이 세계를 덮친다. 모든 지표가 동시에 압박받는다.',
    pressure: { population: -4, economy: -4, social: -4, security: -5, food: -3 }, decay: 1.03,
  },
]
const DIS_MAP: Record<string, Disaster> = Object.fromEntries(DISASTERS.map((d) => [d.key, d]))

// ── 시드 의사난수 (장소명/제목 해시) ──────────────────────────
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

// ── 사건(임계 이벤트) ────────────────────────────────────────
// 시뮬 도중 지표가 특정 조건을 만족하면 발생. 흐름을 꺾고(추가 델타) 연표에 남는다.
interface SimEvent { turn: number; title: string; detail: string; delta: Partial<Record<MetricKey, number>> }

// ── 한 회분(시드+초기상태+재난+턴수)에서 전체 시계열을 결정론적으로 계산 ──
interface SimResult { series: State[]; events: SimEvent[] }
function simulate(init: State, disasterKey: string, turns: number, seed: number, intensity: number): SimResult {
  const dis = DIS_MAP[disasterKey] || DISASTERS[0]
  const rnd = mulberry(seed ^ hashStr(disasterKey))
  const series: State[] = [{ ...init }]
  const events: SimEvent[] = []
  const fired = new Set<string>()
  let cur: State = { ...init }
  let press = 1 // 누적 감쇠 계수

  for (let t = 1; t <= turns; t++) {
    const next: State = { ...cur }
    // 1) 재난 직접 압력 (강도 배율 + 약간의 무작위 흔들림)
    for (const m of METRICS) {
      const base = dis.pressure[m.key] || 0
      if (base) {
        const noise = 0.85 + rnd() * 0.3
        next[m.key] = next[m.key] + base * press * intensity * noise
      }
    }
    // 2) 지표 간 연쇄 상호작용 (낮을수록 다른 지표를 끌어내림)
    const lowFood = cur.food < 40 ? (40 - cur.food) * 0.06 : 0
    const lowEcon = cur.economy < 40 ? (40 - cur.economy) * 0.05 : 0
    const lowSec = cur.security < 40 ? (40 - cur.security) * 0.06 : 0
    const lowSocial = cur.social < 40 ? (40 - cur.social) * 0.05 : 0
    next.social -= lowFood + lowEcon * 0.5
    next.security -= lowSocial
    next.economy -= lowSec + lowSocial * 0.4
    next.population -= lowFood * 0.7 + lowSec * 0.3
    next.food -= lowEcon * 0.3
    // 3) 자연 회복(완만한 평균 회귀) — 지표가 낮아도 사회는 적응한다
    for (const m of METRICS) {
      const recover = (52 - next[m.key]) * 0.018
      if (recover > 0) next[m.key] += recover
    }
    for (const m of METRICS) next[m.key] = clamp(next[m.key])

    // 4) 임계 사건 — 조건 만족 시 1회 발생
    const tryEvent = (id: string, cond: boolean, ev: () => SimEvent) => {
      if (cond && !fired.has(id)) { fired.add(id); const e = ev(); events.push(e); for (const k in e.delta) next[k as MetricKey] = clamp(next[k as MetricKey] + (e.delta[k as MetricKey] || 0)) }
    }
    tryEvent('riot', next.social < 25 && next.security < 35, () => ({
      turn: t, title: '대규모 폭동', detail: '굶주림과 불안이 임계에 달해 거리에 봉기가 일었다. 치안이 한층 무너진다.',
      delta: { security: -8, economy: -5, social: 4 },
    }))
    tryEvent('exodus', next.population < 35 && next.food < 30, () => ({
      turn: t, title: '대탈출', detail: '살길을 찾아 사람들이 땅을 버리고 떠난다. 남은 자들의 부담은 줄지만 공동체는 텅 비어간다.',
      delta: { population: -6, social: 6, food: 8 },
    }))
    tryEvent('coup', next.security < 20 && next.social < 30, () => ({
      turn: t, title: '정변', detail: '무력으로 권력이 교체된다. 강압적 질서가 잠시 치안을 되돌리지만 자유는 위축된다.',
      delta: { security: 14, social: -6, economy: -3 },
    }))
    tryEvent('aid', next.economy < 25 && next.food < 25 && t > Math.floor(turns / 3), () => ({
      turn: t, title: '외부 구호', detail: '이웃 세력이 구호 물자를 보낸다. 최악의 아사를 면하지만 의존이 시작된다.',
      delta: { food: 16, economy: 6, social: 4 },
    }))
    tryEvent('innovate', cur.economy > 55 && cur.social > 55 && rnd() > 0.5 && t > 2, () => ({
      turn: t, title: '위기 혁신', detail: '재난이 역설적으로 기술·제도 혁신을 촉발한다. 회복력이 단단해진다.',
      delta: { economy: 8, food: 6, social: 5 },
    }))
    tryEvent('collapse', next.economy < 12 && next.security < 12 && next.social < 12, () => ({
      turn: t, title: '문명 붕괴', detail: '질서·경제·공동체가 한꺼번에 무너진다. 세계는 암흑기로 진입한다.',
      delta: {},
    }))

    cur = next
    series.push({ ...cur })
    press *= dis.decay
  }
  return { series, events }
}

// ── 결과 요약/판정 ──────────────────────────────────────────
function verdict(last: State): { grade: string; color: string; text: string } {
  const avg = METRICS.reduce((s, m) => s + last[m.key], 0) / METRICS.length
  if (avg >= 65) return { grade: '회복', color: '#98c379', text: '세계는 충격을 견뎌내고 새 질서로 안정되었다.' }
  if (avg >= 45) return { grade: '상흔', color: '#e5a04a', text: '깊은 상처를 안았지만 세계는 가까스로 존속한다.' }
  if (avg >= 25) return { grade: '쇠퇴', color: '#e06c75', text: '구조가 무너지고 세계는 긴 쇠퇴기에 접어든다.' }
  return { grade: '붕괴', color: '#be4b4b', text: '문명은 한계를 넘어섰다. 폐허와 생존자만 남는다.' }
}

interface SaveShape { title: string; place: string; disasterKey: string; turns: number; intensity: number; init: State }
const DEFAULT_INIT: State = { population: 80, economy: 70, social: 72, security: 75, food: 78 }

function load(): SaveShape {
  const def: SaveShape = { title: '', place: '', disasterKey: 'plague', turns: 12, intensity: 1, init: { ...DEFAULT_INIT } }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return def
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return def
    const init = { ...DEFAULT_INIT }
    if (p.init && typeof p.init === 'object') for (const m of METRICS) if (typeof p.init[m.key] === 'number') init[m.key] = clamp(p.init[m.key])
    return {
      title: typeof p.title === 'string' ? p.title : '',
      place: typeof p.place === 'string' ? p.place : '',
      disasterKey: DIS_MAP[p.disasterKey] ? p.disasterKey : 'plague',
      turns: Number.isFinite(p.turns) ? Math.max(4, Math.min(30, Math.round(p.turns))) : 12,
      intensity: Number.isFinite(p.intensity) ? Math.max(0.5, Math.min(2, p.intensity)) : 1,
      init,
    }
  } catch { return def }
}

export default function WorldDisasterSim({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [place, setPlace] = useState(init.current.place)
  const [disasterKey, setDisasterKey] = useState(init.current.disasterKey)
  const [turns, setTurns] = useState(init.current.turns)
  const [intensity, setIntensity] = useState(init.current.intensity)
  const [start, setStart] = useState<State>(init.current.init)
  const [dropHi, setDropHi] = useState(false)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [playTurn, setPlayTurn] = useState<number | null>(null) // 재생 중 표시 턴(null=전체)
  const [playing, setPlaying] = useState(false)
  const mounted = useRef(true)
  const places = useLibraryList('places')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 수용: 장소명/제목/본문 텍스트
  useEffect(() => {
    if (!payload) return
    const p = payload as Record<string, unknown>
    if (typeof p.place === 'string' && p.place && !place) setPlace(p.place)
    if (typeof p.title === 'string' && p.title && !title) setTitle(p.title)
    if (typeof p.text === 'string' && p.text && !place && !p.place) setPlace(String(p.text).slice(0, 40))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, place, disasterKey, turns, intensity, init: start } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, place, disasterKey, turns, intensity, start])

  useEffect(() => { if (!saved) return; const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2200); return () => window.clearTimeout(t) }, [saved])

  // 시드: 제목+장소+재난 — 같은 입력은 항상 같은 결과(결정론)
  const seed = useMemo(() => hashStr((title || 'world') + '|' + (place || '대륙') + '|' + disasterKey), [title, place, disasterKey])
  const result = useMemo(() => simulate(start, disasterKey, turns, seed, intensity), [start, disasterKey, turns, seed, intensity])
  const series = result.series
  const last = series[series.length - 1]
  const v = verdict(last)
  const dis = DIS_MAP[disasterKey]

  // 재생(턴별 애니메이션) — 인터벌은 playTurn 증가만 담당(순수 업데이터)
  useEffect(() => {
    if (!playing) return
    if (playTurn === null) setPlayTurn(0)
    const iv = window.setInterval(() => {
      setPlayTurn((p) => (p === null ? 0 : p) + 1)
    }, 420)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, turns])

  // 재생 정지 처리 — 마지막 턴에 도달하면 재생을 멈추고 전체 보기로 되돌린다
  useEffect(() => {
    if (!playing || playTurn === null) return
    if (playTurn >= turns) { setPlaying(false); setPlayTurn(null) }
  }, [playTurn, turns, playing])

  const shownTurn = playTurn === null ? turns : Math.min(playTurn, turns)

  // ── 장소 라이브러리에서 불러오기 ─────────────────────────────
  const loadPlace = (name: string) => { setPlace(name); setPlayTurn(null); setPlaying(false) }

  // ── 바인더 드롭 수용 ────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropHi(false)
    const it = getDragItem(e)
    if (it) { setPlace(it.title || place); if (it.text && !title) setTitle((it.title || '').slice(0, 40)) }
  }

  // 지표 슬라이더
  const setMetric = (k: MetricKey, n: number) => { setStart((s) => ({ ...s, [k]: clamp(n) })); setPlayTurn(null) }
  const randomizeStart = () => {
    const rnd = mulberry(hashStr((place || '') + Date.now().toString(36)))
    const s = {} as State
    for (const m of METRICS) s[m.key] = Math.round(55 + rnd() * 35)
    setStart(s); setPlayTurn(null)
  }
  const resetStart = () => { setStart({ ...DEFAULT_INIT }); setPlayTurn(null) }

  // ── 차트 좌표 ───────────────────────────────────────────────
  const VBW = 460, VBH = 190, PADL = 26, PADR = 10, PADT = 10, PADB = 22
  const plotW = VBW - PADL - PADR, plotH = VBH - PADT - PADB
  const xAt = (i: number) => PADL + (turns <= 0 ? 0 : (i / turns) * plotW)
  const yAt = (val: number) => PADT + (1 - val / 100) * plotH

  // ── 텍스트/HTML 빌드 ────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildLines = (): string[] => {
    const ls: string[] = []
    ls.push(`[재난 시뮬] ${place || '미지의 세계'}${title ? ' — ' + title : ''}`)
    ls.push(`재난: ${dis.label} · 기간 ${turns}턴 · 강도 ${intensity.toFixed(1)}배`)
    ls.push('')
    ls.push('초기 상태 → 최종 상태')
    for (const m of METRICS) ls.push(`  ${m.label}: ${Math.round(start[m.key])} → ${Math.round(last[m.key])}`)
    ls.push('')
    ls.push(`판정: [${v.grade}] ${v.text}`)
    if (result.events.length) {
      ls.push('')
      ls.push('연표(주요 사건):')
      for (const e of result.events) ls.push(`  ${e.turn}턴 · ${e.title} — ${e.detail}`)
    }
    return ls
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>재난 시뮬</strong> · ${esc(place || '미지의 세계')}${title ? ' — ' + esc(title) : ''}</p>`)
    parts.push(`<p>재난 <strong>${esc(dis.label)}</strong> · 기간 ${turns}턴 · 강도 ${intensity.toFixed(1)}배</p>`)
    parts.push('<p>지표 변화 (초기 → 최종)</p><ul>')
    for (const m of METRICS) parts.push(`<li>${esc(m.label)}: ${Math.round(start[m.key])} → ${Math.round(last[m.key])}</li>`)
    parts.push('</ul>')
    parts.push(`<p>판정: <strong>[${esc(v.grade)}]</strong> ${esc(v.text)}</p>`)
    if (result.events.length) {
      parts.push('<p>연표 (주요 사건)</p><ol>')
      for (const e of result.events) parts.push(`<li>${e.turn}턴 · <strong>${esc(e.title)}</strong> — ${esc(e.detail)}</li>`)
      parts.push('</ol>')
    }
    return parts.join('')
  }

  const copy = async () => {
    const text = buildLines().join('\n')
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
      if (mounted.current) { setNote('연표를 클립보드에 복사했어요.') ; window.setTimeout(() => { if (mounted.current) setNote('') }, 1600) }
    } catch { if (mounted.current) setNote('복사에 실패했어요.') }
  }

  // ── 연동: 프로젝트 / 장소 라이브러리 / 수집함 / 관련 도구 ──────
  const toProject = () => {
    if (!hasProjectBridge()) return
    const meta: Record<string, string> = { 재난: dis.label, 기간: `${turns}턴`, 강도: `${intensity.toFixed(1)}배`, 판정: v.grade }
    for (const m of METRICS) meta[m.label] = `${Math.round(start[m.key])}→${Math.round(last[m.key])}`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: `재난 연대기 — ${dis.label}${place ? ' · ' + place : ''}`,
      bodyHtml: buildHtml(), meta,
    })
    if (!mounted.current) return
    if (id) setSaved(true); else setNote('프로젝트에 연결되지 않았습니다.')
  }
  const toPlaceLibrary = () => {
    // 재난 후 세계 상태를 장소 카드(정규 PLACE_FIELDS 키)로 저장 → 설정집/지도 도구와 공유
    const histKey = PLACE_FIELDS.find((f) => f.key === 'history') ? 'history' : 'etc'
    const fields: Record<string, string> = {
      name: place || `${dis.label}의 세계`,
      kind: '재난 이후',
      atmosphere: `${v.grade} · ${v.text}`,
      [histKey]: buildLines().slice(2).join('\n'),
      dangers: dis.label,
      notes: result.events.map((e) => `${e.turn}턴 ${e.title}`).join(' / ') || '특이 사건 없음',
    }
    addToLibrary('places', { name: place || `${dis.label}의 세계`, kind: '재난 이후', fields, source: '재난 시뮬' })
    if (mounted.current) { setNote('재난 이후 세계를 장소 라이브러리에 저장했어요.'); window.setTimeout(() => { if (mounted.current) setNote('') }, 1800) }
  }
  const toStash = () => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: `재난 시뮬 · ${dis.label}${place ? ' · ' + place : ''}`, text: buildLines().join('\n') })
    if (mounted.current) { setNote('수집함에 연표 메모를 담았어요.'); window.setTimeout(() => { if (mounted.current) setNote('') }, 1600) }
  }
  const toTimeline = () => {
    // 관련 도구(사건 연표)를 사건 데이터와 함께 연다
    openToolLinked('event-timeline', {
      title: `재난 연표 — ${dis.label}`,
      text: result.events.map((e) => `${e.turn}턴 · ${e.title}: ${e.detail}`).join('\n'),
      events: result.events.map((e) => ({ when: `${e.turn}턴`, label: e.title, note: e.detail })),
    })
  }

  // ── 스타일 ──────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 11 }
  const sec: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const inp: React.CSSProperties = { padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap} onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHi) setDropHi(true) } }} onDragLeave={() => dropHi && setDropHi(false)} onDrop={onDrop}>
      <div style={{ ...head, outline: dropHi ? '2px dashed var(--accent)' : 'none', outlineOffset: -2 }}>
        <input style={{ ...inp, flex: 1, minWidth: 120, fontWeight: 600 }} value={place} onChange={(e) => { setPlace(e.target.value); setPlayTurn(null) }} placeholder="세계/지역 이름" aria-label="장소" maxLength={50} />
        <input style={{ ...inp, flex: 1, minWidth: 100 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="시나리오 제목(선택)" aria-label="제목" maxLength={50} />
      </div>

      {dropHi && <div style={{ ...hint, color: 'var(--accent)', padding: '6px 12px 0' }}>바인더 문서를 놓으면 그 제목을 세계 이름으로 사용합니다.</div>}
      {note && <div style={{ ...hint, color: note.includes('실패') || note.includes('막') ? 'var(--warn)' : 'var(--ok)', padding: '6px 12px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 장소 라이브러리 불러오기 ── */}
        {places.length > 0 && (
          <div style={panel}>
            <div style={sec}>장소 라이브러리에서 불러오기</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {places.slice(0, 12).map((p) => (
                <button key={p.id} className="minibtn" onClick={() => loadPlace(p.name)} title={`'${p.name}'를 시뮬 대상으로`}>{p.name || '이름없는 장소'}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── 재난 선택 ── */}
        <div style={panel}>
          <div style={sec}>투입할 재난</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
            {DISASTERS.map((d) => (
              <button
                key={d.key}
                onClick={() => { setDisasterKey(d.key); setPlayTurn(null); setPlaying(false) }}
                style={{
                  padding: '8px 6px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid ' + (disasterKey === d.key ? 'var(--accent)' : 'var(--border)'),
                  background: disasterKey === d.key ? 'var(--accent)' : 'var(--chrome-2)',
                  color: disasterKey === d.key ? '#fff' : 'var(--text)',
                }}
              >{d.label}</button>
            ))}
          </div>
          <div style={{ ...hint, marginTop: 8 }}>{dis.desc}</div>
        </div>

        {/* ── 초기 상태(슬라이더) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...sec, marginBottom: 0 }}>세계 초기 상태</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={randomizeStart} title="장소명 기반 무작위 초기값">무작위</button>
            <button className="minibtn" onClick={resetStart} title="표준값으로">초기화</button>
          </div>
          {METRICS.map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 52, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{m.label}</span>
              <input type="range" min={0} max={100} step={1} value={Math.round(start[m.key])} onChange={(e) => setMetric(m.key, Number(e.target.value))} style={{ flex: 1, accentColor: m.color }} aria-label={`${m.label} 초기값`} />
              <span style={{ width: 26, textAlign: 'right', fontSize: 12, fontWeight: 700, color: m.color, flexShrink: 0 }}>{Math.round(start[m.key])}</span>
            </div>
          ))}
        </div>

        {/* ── 기간/강도 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 140 }}>
              <div style={sec}>기간(턴) · {turns}</div>
              <input type="range" min={4} max={30} step={1} value={turns} onChange={(e) => { setTurns(Number(e.target.value)); setPlayTurn(null) }} style={{ width: '100%', accentColor: 'var(--accent)' }} aria-label="기간" />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              <div style={sec}>재난 강도 · {intensity.toFixed(1)}배</div>
              <input type="range" min={0.5} max={2} step={0.1} value={intensity} onChange={(e) => { setIntensity(Number(e.target.value)); setPlayTurn(null) }} style={{ width: '100%', accentColor: 'var(--warn)' }} aria-label="강도" />
            </label>
          </div>
        </div>

        {/* ── 추이 차트 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ ...sec, marginBottom: 0 }}>연쇄 반응 추이 {playTurn !== null && `· ${shownTurn}/${turns}턴`}</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => { setPlaying((p) => !p); if (!playing && (playTurn === null || playTurn >= turns)) setPlayTurn(0) }} title="턴별로 재생">{playing ? '일시정지' : '재생'}</button>
            <button className="minibtn" onClick={() => { setPlaying(false); setPlayTurn(null) }} title="전체 보기">전체</button>
          </div>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 200 }} role="img" aria-label="지표 추이 그래프">
            {[0, 25, 50, 75, 100].map((g) => (
              <g key={g}>
                <line x1={PADL} y1={yAt(g)} x2={VBW - PADR} y2={yAt(g)} stroke="var(--border)" strokeWidth={1} strokeDasharray={g === 0 ? undefined : '2 4'} opacity={0.5} />
                <text x={PADL - 4} y={yAt(g) + 3} textAnchor="end" fontSize={8} fill="var(--muted)">{g}</text>
              </g>
            ))}
            {/* 사건 표시(세로선) */}
            {result.events.filter((e) => e.turn <= shownTurn).map((e, i) => (
              <line key={i} x1={xAt(e.turn)} y1={PADT} x2={xAt(e.turn)} y2={VBH - PADB} stroke="var(--warn)" strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
            ))}
            {/* 각 지표 라인 */}
            {METRICS.map((m) => {
              const path = series.slice(0, shownTurn + 1).map((s, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(s[m.key]).toFixed(1)}`).join(' ')
              return <path key={m.key} d={path} fill="none" stroke={m.color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
            })}
            {/* 현재 턴 마커 */}
            {playTurn !== null && (
              <line x1={xAt(shownTurn)} y1={PADT} x2={xAt(shownTurn)} y2={VBH - PADB} stroke="var(--accent)" strokeWidth={1.4} opacity={0.8} />
            )}
          </svg>
          {/* 범례 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {METRICS.map((m) => (
              <span key={m.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: m.color, display: 'inline-block' }} />
                {m.label} <strong style={{ color: m.color }}>{Math.round(series[shownTurn][m.key])}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* ── 판정 ── */}
        <div style={{ ...panel, borderLeft: `3px solid ${v.color}` }}>
          <div style={sec}>최종 판정</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: v.color }}>{v.grade}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 3 }}>{v.text}</div>
        </div>

        {/* ── 연표(사건) ── */}
        <div style={panel}>
          <div style={sec}>연표 · 주요 사건 {result.events.length}건</div>
          {result.events.length === 0 ? (
            <div style={hint}>이 조건에서는 임계 사건이 발생하지 않았어요. 강도를 높이거나 초기값을 낮춰 보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {result.events.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--accent)', width: 38 }}>{e.turn}턴</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{e.title}</div>
                    <div style={{ ...hint, marginTop: 1 }}>{e.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 내보내기/연동 ── */}
        <div style={panel}>
          <div style={sec}>내보내기 · 연동</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={copy} title="연표를 텍스트로 복사">복사</button>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 세계관에 연대기 문서로 추가' : '프로젝트에 연결되지 않음'}>프로젝트에 추가</button>
            <button className="linkbtn" onClick={toPlaceLibrary} title="재난 이후 세계를 장소 라이브러리에 저장">장소로 저장</button>
            <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '수집함에 메모로 담기' : '수집함 미연결'}>수집함</button>
            <button className="linkbtn" onClick={toTimeline} title="타임라인 도구를 사건과 함께 열기">타임라인 열기</button>
          </div>
          <div className="license-note" style={{ marginTop: 8 }}>모든 계산은 브라우저에서 결정론적으로 수행됩니다(같은 입력=같은 결과). 외부 전송 없음.</div>
        </div>
      </div>
    </div>
  )
}
