// 관계 열역학 — 인물쌍 관계의 "온도"(-100 차가움 ~ +100 뜨거움)를 시간축(장면/회차)으로 모델링한다.
//  사건(만남·배신·구원·고백·다툼 등)을 특정 인물쌍에 가하면, 그 변화가 관계망 전체로 "열전도"처럼 파급된다.
//  - 직접 당사자에게 큰 변화, 공통 지인에게 감쇠된 간접 변화가 전달되어 한 사건이 전체 분위기를 바꾼다.
//  - 시간축을 따라 각 쌍의 온도 곡선을 SVG 라인차트로 시각화하고, 현재 상태를 온도 히트맵 격자로 보여준다.
//  - 균형(평형)·휘발성·결속도 같은 열역학적 지표를 계산해 관계망의 안정성을 분석한다.
// 연계: useLibraryList('characters')로 인물 수용, 바인더 드롭/payload.character 수용,
//       addToProject로 관계 연표 문서화, addToStash로 사건 메모, openToolLinked('relationship-map')로 관계도 연결.
// import 는 react 와 './linkbus' 만. 외부 네트워크 없음. localStorage 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'relationship-thermo',
  name: '관계 열역학',
  icon: '🌡️',
  group: '캐릭터',
  intro: '인물쌍 관계 온도를 시간축으로 모델링하고, 사건이 관계망 전체로 파급되는 변화를 시뮬',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:relationship-thermo'

// ───────── 모델 ─────────
interface Person { id: string; name: string }
// 사건 유형: 직접 당사자 온도 변화량(delta) + 파급 계수(spread, 공통 지인에게 전달되는 비율)
interface EventType { key: string; label: string; delta: number; spread: number }
const EVENT_TYPES: EventType[] = [
  { key: 'meet', label: '운명적 만남', delta: 22, spread: 0.15 },
  { key: 'confess', label: '고백/애정', delta: 30, spread: 0.1 },
  { key: 'rescue', label: '구원/희생', delta: 34, spread: 0.25 },
  { key: 'gift', label: '호의/배려', delta: 12, spread: 0.08 },
  { key: 'reconcile', label: '화해', delta: 26, spread: 0.2 },
  { key: 'collab', label: '협력/공조', delta: 14, spread: 0.18 },
  { key: 'misunderstand', label: '오해', delta: -16, spread: 0.12 },
  { key: 'quarrel', label: '다툼', delta: -22, spread: 0.2 },
  { key: 'betray', label: '배신', delta: -40, spread: 0.35 },
  { key: 'rivalry', label: '경쟁/대립', delta: -18, spread: 0.22 },
  { key: 'loss', label: '상실/이별', delta: -30, spread: 0.28 },
  { key: 'secret', label: '비밀 폭로', delta: -24, spread: 0.3 },
]
const eventOf = (k: string) => EVENT_TYPES.find((e) => e.key === k) || EVENT_TYPES[0]

interface SimEvent { id: string; t: number; a: string; b: string; type: string; note: string }
interface Store { people: Person[]; events: SimEvent[]; span: number }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const pairKey = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a)

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { people: [], events: [], span: 12 }
    const p = JSON.parse(raw)
    const people: Person[] = Array.isArray(p?.people)
      ? p.people.filter((x: any) => x && typeof x.name === 'string')
          .map((x: any) => ({ id: String(x.id || newId()), name: String(x.name).slice(0, 32) }))
      : []
    const ids = new Set(people.map((x) => x.id))
    const events: SimEvent[] = Array.isArray(p?.events)
      ? p.events.filter((e: any) => e && ids.has(String(e.a)) && ids.has(String(e.b)) && String(e.a) !== String(e.b))
          .map((e: any) => ({
            id: String(e.id || newId()),
            t: clamp(Math.round(Number(e.t) || 1), 1, 200),
            a: String(e.a),
            b: String(e.b),
            type: EVENT_TYPES.some((x) => x.key === e.type) ? e.type : 'meet',
            note: String(e.note || '').slice(0, 120),
          }))
      : []
    const span = clamp(Math.round(Number(p?.span) || 12), 4, 60)
    return { people, events, span }
  } catch {
    return { people: [], events: [], span: 12 }
  }
}

// ───────── 시뮬레이션 엔진 ─────────
// 시간축 1..span 각 시점에서, 모든 인물쌍의 온도를 누적 계산한다.
// 기본 규칙:
//  - 모든 쌍은 0(중립)에서 시작.
//  - 각 시점에 그 시점의 사건들을 적용: 직접 쌍에 delta, 두 당사자와 각각 연결된 "공통 지인"에게 spread 만큼 간접 전달.
//    (간접 전달 부호는 사건의 부호를 따른다 — 좋은 일은 주변까지 데우고, 나쁜 일은 주변까지 식힌다.)
//  - 매 시점 미세한 평형 복귀(냉각): 온도는 0 쪽으로 6% 수렴(관계는 시간이 지나면 무뎌진다).
// 결과: 쌍키 -> 시점별 온도 배열(길이 span+1, index 0 = 시작 0).
interface SimResult {
  series: Map<string, number[]>        // pairKey -> [t0..tSpan]
  current: Map<string, number>         // pairKey -> 마지막 시점 온도
  neighborsAt: (t: number, id: string) => Set<string> // t 시점까지 형성된 직접 관계 이웃
}

function simulate(people: Person[], events: SimEvent[], span: number): SimResult {
  const ids = people.map((p) => p.id)
  const series = new Map<string, number[]>()
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      series.set(pairKey(ids[i], ids[j]), new Array(span + 1).fill(0))

  // 시점별 사건 버킷
  const byTime = new Map<number, SimEvent[]>()
  for (const e of events) {
    const t = clamp(e.t, 1, span)
    if (!byTime.has(t)) byTime.set(t, [])
    byTime.get(t)!.push(e)
  }

  // 직접 관계 이웃(절대온도 6 이상으로 한 번이라도 엮인 쌍) 누적 추적
  const linked = new Map<string, Set<string>>()
  ids.forEach((id) => linked.set(id, new Set()))
  const link = (x: string, y: string) => { linked.get(x)?.add(y); linked.get(y)?.add(x) }

  const cur = new Map<string, number>()
  series.forEach((_, k) => cur.set(k, 0))

  for (let t = 1; t <= span; t++) {
    // 1) 냉각(평형 복귀)
    cur.forEach((v, k) => cur.set(k, v * 0.94))

    // 2) 이번 시점 사건 적용
    const evs = byTime.get(t) || []
    for (const ev of evs) {
      const et = eventOf(ev.type)
      const dk = pairKey(ev.a, ev.b)
      if (cur.has(dk)) cur.set(dk, clamp(cur.get(dk)! + et.delta, -100, 100))
      link(ev.a, ev.b)

      // 간접 파급: a 또는 b 의 기존 이웃(공통 지인 포함)에게 감쇠 전달
      if (et.spread > 0) {
        const touched = new Set<string>()
        const propagate = (anchor: string, partner: string) => {
          const ns = linked.get(anchor)
          if (!ns) return
          ns.forEach((nb) => {
            if (nb === partner || nb === ev.a || nb === ev.b) return
            const pk = pairKey(partner, nb)
            if (!cur.has(pk)) return
            const key = pk + '#' + partner
            if (touched.has(key)) return
            touched.add(key)
            const indirect = et.delta * et.spread
            cur.set(pk, clamp(cur.get(pk)! + indirect, -100, 100))
          })
        }
        propagate(ev.a, ev.b) // a 의 지인들 ↔ b
        propagate(ev.b, ev.a) // b 의 지인들 ↔ a
      }
    }

    // 3) 기록
    cur.forEach((v, k) => { series.get(k)![t] = Math.round(v * 10) / 10 })
  }

  const current = new Map<string, number>()
  series.forEach((arr, k) => current.set(k, arr[span]))

  // 특정 시점까지 형성된 이웃(현재는 전체 누적과 동일하지만 인터페이스 유지)
  const neighborsAt = (_t: number, id: string) => linked.get(id) || new Set<string>()
  return { series, current, neighborsAt }
}

// 온도 -> 색(파랑 차가움 → 회색 중립 → 빨강 뜨거움)
function tempColor(v: number): string {
  const x = clamp(v, -100, 100)
  if (x >= 0) {
    const t = x / 100
    const r = Math.round(130 + t * 95)
    const g = Math.round(120 - t * 70)
    const b = Math.round(120 - t * 95)
    return `rgb(${r},${g},${b})`
  } else {
    const t = -x / 100
    const r = Math.round(120 - t * 75)
    const g = Math.round(125 - t * 30)
    const b = Math.round(135 + t * 90)
    return `rgb(${r},${g},${b})`
  }
}
function tempWord(v: number): string {
  if (v >= 70) return '열렬'
  if (v >= 35) return '따뜻'
  if (v >= 12) return '온화'
  if (v > -12) return '미온'
  if (v > -35) return '서늘'
  if (v > -70) return '냉랭'
  return '결빙'
}

interface Props { payload?: Record<string, unknown> }

export default function RelationshipThermo({ payload }: Props) {
  const init = useRef<Store>(loadStore())
  const [people, setPeople] = useState<Person[]>(init.current.people)
  const [events, setEvents] = useState<SimEvent[]>(init.current.events)
  const [span, setSpan] = useState<number>(init.current.span)
  const [note, setNote] = useState('')

  const libChars = useLibraryList('characters')

  // 새 사건 입력 폼
  const [draftName, setDraftName] = useState('')
  const [evA, setEvA] = useState('')
  const [evB, setEvB] = useState('')
  const [evType, setEvType] = useState('meet')
  const [evT, setEvT] = useState(1)
  const [evNote, setEvNote] = useState('')

  // 보기: 어떤 쌍 곡선을 강조할지
  const [focusPair, setFocusPair] = useState<string | null>(null)

  // 드롭 피드백
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 드래그 깊이 카운터가 어긋나 dropActive 가 잔존하는 경우를 위한 안전망:
  // 드래그가 끝나면(dragend/drop) 어디서 발생하든 카운터·표시 상태를 강제로 초기화한다.
  useEffect(() => {
    const reset = () => { dragDepth.current = 0; if (mounted.current) setDropActive(false) }
    window.addEventListener('dragend', reset)
    window.addEventListener('drop', reset)
    return () => {
      window.removeEventListener('dragend', reset)
      window.removeEventListener('drop', reset)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ people, events, span })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.') }
  }, [people, events, span])

  // 인물 추가 헬퍼(중복 이름 방지)
  const addPerson = (rawName: string): string | null => {
    const name = rawName.trim().slice(0, 32)
    if (!name) return null
    let createdId: string | null = null
    setPeople((prev) => {
      if (prev.some((p) => p.name.trim() === name.trim())) return prev
      const p = { id: newId(), name }
      createdId = p.id
      return [...prev, p]
    })
    return createdId
  }

  // payload.character 수용
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const raw = (payload as Record<string, unknown>).character
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    let added = 0
    for (const c of list) {
      if (c && typeof c === 'object' && typeof (c as any).name === 'string' && (c as any).name.trim()) {
        if (addPerson((c as any).name)) added++
      }
    }
    // payload.text 를 사건 메모 초안으로
    const ptext = (payload as Record<string, unknown>).text
    if (typeof ptext === 'string' && ptext.trim()) setEvNote(ptext.replace(/\s+/g, ' ').trim().slice(0, 120))
    if (mounted.current && added > 0) setNote(`인물 ${added}명을 추가했어요.`)
  }, [payload]) // eslint-disable-line

  // 라이브러리 인물 가져오기
  const importLib = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    const existing = new Set(people.map((p) => p.name.trim()))
    let added = 0
    for (const c of libChars as SharedCharacter[]) {
      const nm = (c.name || '').trim()
      if (!nm || existing.has(nm)) continue
      existing.add(nm)
      if (addPerson(nm)) added++
    }
    setNote(added > 0 ? `라이브러리 인물 ${added}명을 추가했어요.` : '라이브러리 인물이 이미 모두 있어요.')
  }

  // 바인더 드롭 → 인물 추가
  const onDropItem = (e: React.DragEvent) => {
    dragDepth.current = 0; setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const name = (it.character?.name || it.title || '').trim()
    if (!name) { setNote('드롭한 파일에서 이름을 찾지 못했어요.'); return }
    const id = addPerson(name)
    setNote(id ? `‘${name}’ 인물을 추가했어요.` : `‘${name}’ 인물은 이미 있어요.`)
  }

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
    setEvents((prev) => prev.filter((e) => e.a !== id && e.b !== id))
    if (evA === id) setEvA('')
    if (evB === id) setEvB('')
  }

  // 사건 추가
  const addEvent = () => {
    if (!evA || !evB) { setNote('사건의 두 인물을 모두 고르세요.'); return }
    if (evA === evB) { setNote('서로 다른 두 인물을 고르세요.'); return }
    const ev: SimEvent = { id: newId(), t: clamp(Math.round(evT), 1, span), a: evA, b: evB, type: evType, note: evNote.slice(0, 120) }
    setEvents((prev) => [...prev, ev].sort((x, y) => x.t - y.t))
    setEvNote('')
    setFocusPair(pairKey(evA, evB))
    setNote('')
  }
  const removeEvent = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id))

  const clearAll = () => {
    if (!people.length && !events.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 인물·사건을 지울까요? 되돌릴 수 없습니다.')) return
    setPeople([]); setEvents([]); setFocusPair(null); setEvA(''); setEvB('')
  }

  // ───────── 시뮬레이션 결과 ─────────
  const sim = useMemo(() => simulate(people, events, span), [people, events, span])
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name || '?'

  // 활성 쌍(사건이 한 번이라도 닿은 쌍)만 곡선/목록에 노출
  const activePairs = useMemo(() => {
    const set = new Set<string>()
    const arr: { key: string; a: string; b: string }[] = []
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        const k = pairKey(people[i].id, people[j].id)
        const ser = sim.series.get(k)
        if (ser && ser.some((v) => Math.abs(v) > 0.5) && !set.has(k)) {
          set.add(k); arr.push({ key: k, a: people[i].id, b: people[j].id })
        }
      }
    return arr
  }, [people, sim])

  // 열역학 지표
  const metrics = useMemo(() => {
    const vals = activePairs.map((p) => sim.current.get(p.key) || 0)
    const n = vals.length
    const avg = n ? vals.reduce((s, v) => s + v, 0) / n : 0
    // 휘발성: 각 활성 쌍의 시계열 변화량 절대값 합 평균(관계가 얼마나 요동치는가)
    let vol = 0
    for (const p of activePairs) {
      const ser = sim.series.get(p.key)!
      let d = 0
      for (let t = 1; t < ser.length; t++) d += Math.abs(ser[t] - ser[t - 1])
      vol += d
    }
    vol = n ? vol / n : 0
    // 양극성: 가장 뜨거운 쌍 - 가장 차가운 쌍(관계망의 긴장 폭)
    const hot = n ? Math.max(...vals) : 0
    const cold = n ? Math.min(...vals) : 0
    // 결속도: 양(+)인 쌍 비율
    const warmRatio = n ? Math.round((vals.filter((v) => v > 12).length / n) * 100) : 0
    return { n, avg, vol, hot, cold, polar: hot - cold, warmRatio }
  }, [activePairs, sim])

  // ───────── 곡선 차트 좌표 ─────────
  const CH_W = 420, CH_H = 150, PAD_L = 28, PAD_R = 8, PAD_T = 10, PAD_B = 18
  const innerW = CH_W - PAD_L - PAD_R
  const innerH = CH_H - PAD_T - PAD_B
  const xAt = (t: number) => PAD_L + (span <= 0 ? 0 : (t / span) * innerW)
  const yAt = (v: number) => PAD_T + ((100 - v) / 200) * innerH
  const pairColor = (key: string) => {
    // 결정론적 색(쌍키 해시) — 단, 강조 시 온도색 우선
    let h = 0
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
    return `hsl(${h % 360},58%,52%)`
  }

  // ───────── 내보내기 / 연동 산출 ─────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    const out: string[] = []
    out.push('<h2>관계 온도 연표</h2>')
    out.push('<p>시간 단위: 장면/회차 1 ~ ' + span + '. 온도 범위 -100(결빙) ~ +100(열렬).</p>')
    out.push('<h3>사건 연표</h3>')
    if (!events.length) out.push('<p>(사건 없음)</p>')
    else out.push('<ol>' + events.map((e) =>
      '<li>[' + e.t + '] ' + esc(nameOf(e.a)) + ' - ' + esc(nameOf(e.b)) + ' : ' + esc(eventOf(e.type).label) +
      (e.note ? ' — ' + esc(e.note) : '') + '</li>').join('') + '</ol>')
    out.push('<h3>현재 관계 온도</h3>')
    if (!activePairs.length) out.push('<p>(아직 형성된 관계 없음)</p>')
    else out.push('<ul>' + activePairs.map((p) => {
      const v = sim.current.get(p.key) || 0
      return '<li>' + esc(nameOf(p.a)) + ' - ' + esc(nameOf(p.b)) + ' : ' + v.toFixed(0) + '도 (' + tempWord(v) + ')</li>'
    }).join('') + '</ul>')
    out.push('<h3>관계망 지표</h3>')
    out.push('<ul>' +
      '<li>평균 온도: ' + metrics.avg.toFixed(1) + '도</li>' +
      '<li>휘발성(요동): ' + metrics.vol.toFixed(1) + '</li>' +
      '<li>양극성(긴장 폭): ' + metrics.polar.toFixed(0) + '</li>' +
      '<li>따뜻한 관계 비율: ' + metrics.warmRatio + '%</li>' +
      '</ul>')
    return out.join('\n')
  }

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!activePairs.length) { setNote('내보낼 관계 데이터가 없어요. 사건을 먼저 추가하세요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '관계 온도 연표', bodyHtml: buildHtml() })
    setNote(id ? '프로젝트 자료 › 인물 폴더에 관계 온도 연표를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashHottest = () => {
    if (!hasStash()) { setNote('수집함에 연결되어 있지 않아요.'); return }
    if (!activePairs.length) { setNote('담을 관계가 없어요.'); return }
    const sorted = [...activePairs].sort((x, y) => Math.abs(sim.current.get(y.key)!) - Math.abs(sim.current.get(x.key)!))
    const top = sorted.slice(0, 5)
    const text = top.map((p) => {
      const v = sim.current.get(p.key) || 0
      return nameOf(p.a) + ' - ' + nameOf(p.b) + ': ' + v.toFixed(0) + '도(' + tempWord(v) + ')'
    }).join('\n')
    addToStash({ kind: 'memo', label: '관계 온도 요약', text })
    setNote('가장 극적인 관계들을 수집함에 담았어요.')
  }

  const copyText = async () => {
    const txt = buildHtml().replace(/<[^>]+>/g, (m) => (m === '</li>' ? '\n' : m === '</p>' || m.startsWith('<h') ? '\n' : '')).replace(/\n{2,}/g, '\n').trim()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('관계 연표를 복사했어요.'); return }
      throw new Error('no clip')
    } catch {
      try {
        const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('관계 연표를 복사했어요.')
      } catch { setNote('복사에 실패했어요.') }
    }
  }

  // 관계도로 보내기(인물 + 사건을 관계 라벨로)
  const openMap = () => {
    const chars = people.map((p) => ({ name: p.name }))
    openToolLinked('relationship-map', { character: chars })
    setNote('인물 관계도를 열었어요. 거기서 관계선을 그려 보세요.')
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...input, padding: '6px 8px' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  const isEmpty = people.length === 0

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -6 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      {dropActive && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '6px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>
          여기에 놓으면 인물로 추가됩니다
        </div>
      )}

      {/* 상단: 인물 추가 + 액션 */}
      <div style={bar}>
        <input
          style={{ ...input, flex: 1, minWidth: 110 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { const id = addPerson(draftName); setDraftName(''); if (!id) setNote('같은 이름이 이미 있어요.') } }}
          placeholder="인물 이름 + Enter"
          maxLength={32}
          aria-label="인물 이름"
        />
        <button className="btn-primary" onClick={() => { const id = addPerson(draftName); setDraftName(''); if (!id && draftName.trim()) setNote('같은 이름이 이미 있어요.') }} disabled={!draftName.trim()}>인물 추가</button>
        <button className="minibtn" onClick={importLib} disabled={!libChars.length} title="공유 라이브러리 인물 가져오기">라이브러리 불러오기{libChars.length ? ` (${libChars.length})` : ''}</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={scroll}>
        {isEmpty ? (
          <div style={{ ...card, alignItems: 'flex-start' }}>
            <div style={sLabel}>시작하기</div>
            <div style={hint}>
              인물을 두 명 이상 추가하면, 그들 사이에 사건(만남·배신·화해 등)을 넣어 관계 온도를 시간축으로 시뮬할 수 있어요.<br />
              위 입력칸에 이름을 적거나, 좌측 바인더의 인물 문서를 끌어다 놓거나, <b style={{ color: 'var(--text)' }}>라이브러리 불러오기</b>로 저장된 인물을 가져오세요.<br />
              사건 하나가 당사자뿐 아니라 공통 지인 관계로 열처럼 번져 관계망 전체를 바꿉니다.
            </div>
          </div>
        ) : (
          <>
            {/* 인물 칩 */}
            <div style={card}>
              <div style={sLabel}>인물 {people.length}명</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {people.map((p) => (
                  <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--border)', fontSize: 13 }}>
                    {p.name}
                    <button className="minibtn" style={{ padding: '0 5px', fontSize: 12, lineHeight: 1.4 }} onClick={() => removePerson(p.id)} title="삭제">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* 시간 길이 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={sLabel}>시간축 길이(장면/회차)</span>
                <input type="range" min={4} max={60} value={span} onChange={(e) => setSpan(clamp(Number(e.target.value), 4, 60))} style={{ flex: 1 }} aria-label="시간축 길이" />
                <b style={{ width: 26, textAlign: 'right' }}>{span}</b>
              </div>
            </div>

            {/* 사건 입력 */}
            <div style={card}>
              <div style={sLabel}>사건 가하기</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select style={{ ...sel, flex: 1, minWidth: 90 }} value={evA} onChange={(e) => setEvA(e.target.value)} aria-label="인물 A">
                  <option value="">인물 A</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select style={{ ...sel, flex: 1, minWidth: 90 }} value={evB} onChange={(e) => setEvB(e.target.value)} aria-label="인물 B">
                  <option value="">인물 B</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select style={{ ...sel, flex: 1, minWidth: 120 }} value={evType} onChange={(e) => setEvType(e.target.value)} aria-label="사건 유형">
                  {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.delta > 0 ? '+' : ''}{t.delta})</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
                  시점
                  <input type="number" min={1} max={span} value={evT} onChange={(e) => setEvT(clamp(Number(e.target.value) || 1, 1, span))} style={{ ...input, width: 56, padding: '5px 6px' }} aria-label="사건 시점" />
                </label>
              </div>
              <input style={input} value={evNote} onChange={(e) => setEvNote(e.target.value)} maxLength={120} placeholder="사건 메모(선택, 예: 비 오는 옥상에서)" aria-label="사건 메모" />
              <button className="btn-primary" onClick={addEvent} disabled={people.length < 2}>사건 추가</button>
              <div style={hint}>선택한 사건은 두 당사자 온도를 크게 바꾸고, 각자의 공통 지인 관계로 감쇠된 변화를 전파합니다.</div>
            </div>

            {/* 온도 곡선 차트 */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={sLabel}>관계 온도 곡선</div>
                {focusPair && <button className="minibtn" style={{ fontSize: 11, padding: '1px 7px' }} onClick={() => setFocusPair(null)}>강조 해제</button>}
              </div>
              {activePairs.length === 0 ? (
                <div style={hint}>아직 사건이 없어요. 위에서 사건을 가하면 곡선이 그려집니다.</div>
              ) : (
                <svg width="100%" viewBox={`0 0 ${CH_W} ${CH_H}`} style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
                  {/* 0도 기준선 + 격자 */}
                  {[100, 50, 0, -50, -100].map((g) => (
                    <g key={g}>
                      <line x1={PAD_L} y1={yAt(g)} x2={CH_W - PAD_R} y2={yAt(g)} stroke={g === 0 ? 'var(--muted)' : 'var(--border)'} strokeWidth={g === 0 ? 1.2 : 0.7} strokeDasharray={g === 0 ? undefined : '2 3'} />
                      <text x={2} y={yAt(g) + 3} fontSize={8} fill="var(--muted)">{g}</text>
                    </g>
                  ))}
                  {/* 사건 시점 표시(작은 막대) */}
                  {events.map((e) => (
                    <line key={e.id} x1={xAt(e.t)} y1={PAD_T} x2={xAt(e.t)} y2={CH_H - PAD_B} stroke={eventOf(e.type).delta >= 0 ? 'rgba(200,90,70,0.18)' : 'rgba(70,110,200,0.18)'} strokeWidth={1} />
                  ))}
                  {/* 곡선 */}
                  {activePairs.map((p) => {
                    const ser = sim.series.get(p.key)!
                    const dim = focusPair != null && focusPair !== p.key
                    const focused = focusPair === p.key
                    const d = ser.map((v, t) => `${t === 0 ? 'M' : 'L'}${xAt(t).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')
                    return (
                      <path
                        key={p.key}
                        d={d}
                        fill="none"
                        stroke={focused ? tempColor(sim.current.get(p.key) || 0) : pairColor(p.key)}
                        strokeWidth={focused ? 2.6 : 1.6}
                        opacity={dim ? 0.18 : 0.92}
                        strokeLinejoin="round"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFocusPair(focusPair === p.key ? null : p.key)}
                      />
                    )
                  })}
                  {/* x축 끝 라벨 */}
                  <text x={PAD_L} y={CH_H - 4} fontSize={8} fill="var(--muted)">1</text>
                  <text x={CH_W - PAD_R} y={CH_H - 4} fontSize={8} fill="var(--muted)" textAnchor="end">{span}</text>
                </svg>
              )}
              <div style={hint}>곡선을 누르면 그 인물쌍을 강조합니다. 빨강=뜨거움, 파랑=차가움. 세로 줄은 사건 발생 시점.</div>
            </div>

            {/* 현재 관계 온도 목록(히트) */}
            {activePairs.length > 0 && (
              <div style={card}>
                <div style={sLabel}>현재 관계 온도 (시점 {span})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[...activePairs].sort((x, y) => (sim.current.get(y.key)! - sim.current.get(x.key)!)).map((p) => {
                    const v = sim.current.get(p.key) || 0
                    const focused = focusPair === p.key
                    return (
                      <div
                        key={p.key}
                        onClick={() => setFocusPair(focusPair === p.key ? null : p.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 5px', borderRadius: 6, background: focused ? 'var(--panel)' : 'transparent' }}
                      >
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nameOf(p.a)} - {nameOf(p.b)}
                        </span>
                        {/* 온도 바 */}
                        <span style={{ position: 'relative', width: 90, height: 10, borderRadius: 5, background: 'var(--border)', flexShrink: 0, overflow: 'hidden' }}>
                          <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--muted)' }} />
                          <span style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', background: tempColor(v), left: v >= 0 ? '50%' : `${50 + v / 2}%`, width: `${Math.abs(v) / 2}%` }} />
                        </span>
                        <b style={{ width: 38, textAlign: 'right', fontSize: 12, color: tempColor(v) }}>{v.toFixed(0)}</b>
                        <span style={{ width: 30, fontSize: 11, color: 'var(--muted)' }}>{tempWord(v)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 열역학 지표 */}
            {activePairs.length > 0 && (
              <div style={card}>
                <div style={sLabel}>관계망 열역학 지표</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {[
                    { k: '평균 온도', v: metrics.avg.toFixed(1), tip: '관계망 전체 분위기' },
                    { k: '휘발성', v: metrics.vol.toFixed(0), tip: '관계가 얼마나 요동치는가' },
                    { k: '양극성', v: metrics.polar.toFixed(0), tip: '가장 뜨거운-차가운 차이(긴장 폭)' },
                    { k: '따뜻한 비율', v: metrics.warmRatio + '%', tip: '우호적 관계 비중' },
                  ].map((m) => (
                    <div key={m.k} title={m.tip} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.k}</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <div style={hint}>
                  {metrics.polar > 120 ? '양극성이 매우 높아요 — 갈등과 애정이 공존하는 드라마틱한 구도입니다.'
                    : metrics.vol > 80 ? '관계가 크게 요동쳐요 — 사건 밀도가 높은 격동기입니다.'
                    : metrics.avg > 25 ? '관계망이 전반적으로 따뜻합니다 — 위기 사건을 넣어 긴장을 만들어 보세요.'
                    : metrics.avg < -15 ? '관계망이 차갑게 식어 있어요 — 화해/구원 사건으로 반전을 만들 수 있어요.'
                    : '균형 잡힌 관계망입니다. 사건을 더해 변화를 관찰해 보세요.'}
                </div>
              </div>
            )}

            {/* 사건 연표 */}
            {events.length > 0 && (
              <div style={card}>
                <div style={sLabel}>사건 연표 {events.length}건</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 170, overflowY: 'auto' }}>
                  {events.map((e) => {
                    const et = eventOf(e.type)
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '3px 4px', borderRadius: 6 }}>
                        <span style={{ width: 22, textAlign: 'center', fontWeight: 700, color: 'var(--muted)' }}>{e.t}</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: et.delta >= 0 ? tempColor(60) : tempColor(-60), flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <b>{nameOf(e.a)}-{nameOf(e.b)}</b> {et.label}{e.note ? ' · ' + e.note : ''}
                        </span>
                        <button className="minibtn" style={{ padding: '0 5px', fontSize: 11 }} onClick={() => removeEvent(e.id)} title="삭제">×</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 액션 / 연계 */}
            <div style={card}>
              <div style={sLabel}>내보내기 · 연계</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="linkbtn" onClick={addToProjectDoc} disabled={!hasProjectBridge() || !activePairs.length} title="관계 온도 연표를 프로젝트 바인더(자료 › 인물)에 추가">프로젝트에 추가</button>
                <button className="minibtn" onClick={stashHottest} disabled={!hasStash() || !activePairs.length} title="가장 극적인 관계를 수집함에 담기">수집함에 담기</button>
                <button className="minibtn" onClick={copyText} disabled={!activePairs.length} title="텍스트로 복사">복사</button>
                <button className="minibtn" onClick={clearAll} disabled={isEmpty}>전체 비우기</button>
              </div>
              <div className="linkbar">
                <span className="linkbar-label">함께 열기:</span>
                <button className="linkbtn" onClick={openMap} title="인물 관계도 도구로 인물을 전달해 엽니다">인물 관계도</button>
                <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기">인물 시트</button>
              </div>
              <div style={hint}>모든 인물·사건·시뮬 결과는 이 브라우저에 자동 저장됩니다.</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
