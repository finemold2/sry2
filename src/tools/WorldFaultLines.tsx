// 세계 단층선 — 세계의 사회적 긴장(계급/종교/자원/민족 등)을 지질 '단층'처럼 모델링해
//   어디서 갈등이 먼저 터질지(발화점)를 결정론적으로 예측·시각화하는 대형 도구.
//   각 단층(긴장축)은 두 '판'(대립 세력)이 마주치는 경계이며, 압력(불만)·마찰(억압)·
//   변위속도(긴장 누적속도)·결합도(다른 단층과의 연동)로 스트레스를 쌓는다.
//   스트레스가 임계점을 넘으면 '파열'(폭동·전쟁·봉기 등)이 일어난다 — 이를 발화점으로 계산한다.
//
// 핵심 모델(전부 브라우저 로컬 계산, 외부 API 없음):
//   - 각 단층: type(긴장 종류) · pressure(0~100 누적불만) · friction(0~100 억압강도) ·
//     slip(0~100 변위속도=긴장 증가율) · place(선택: 라이브러리 장소) · note
//   - 스트레스 지수 S = 0.45*pressure + 0.30*slip + 0.25*friction (억압은 잠시 막지만 한번에 더 크게 터짐)
//   - 임계점 T = 100 - friction*0.35 (억압이 셀수록 한계점이 높지만 그만큼 파열 규모가 큼)
//   - 발화 위험도 = clamp(S - T + 50) → 0~100. 결합도(coupling)로 인접 단층끼리 위험 전이.
//   - 예상 파열 시점(틱) ≈ 남은 여유(T-S 환산) / slip → 짧을수록 임박.
//   - 시뮬레이션: 틱마다 slip 만큼 스트레스 누적 + 결합 전이, 임계 초과 단층 '파열'(연쇄 가능) → 타임라인 기록.
//
// 연계(linkbus): useLibraryList('places') 로 기존 장소 수용, 단층을 장소에 묶기 / addToLibrary('places')
//   로 발화점 보고서를 장소 메모로 저장, getDragItem 로 바인더 문서 드롭(텍스트→메모), payload.text 수용,
//   addToProject 로 〈세계관〉 폴더에 위기 보고서 문서 추가, addToStash 로 수집함 담기,
//   openToolLinked('worldbuilding-q'|'conflict-builder'|'setting-bible') 로 관련 도구 열기.
// import 는 react 와 './linkbus' 만 사용한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'world-fault-lines',
  name: '세계 단층선',
  icon: '🗺️',
  group: '세계관',
  intro: '사회적 긴장을 지질 단층처럼 매핑해 갈등 발화점을 시뮬레이션·예측합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:world-fault-lines'

// ── 긴장 종류(판 경계 유형) ──────────────────────────────────────────
interface FaultType {
  id: string
  label: string
  // 두 대립 판의 기본 이름(편집 가능 시작값)
  plateA: string
  plateB: string
  hue: number
  hint: string
}
const FAULT_TYPES: FaultType[] = [
  { id: 'class', label: '계급', plateA: '지배층', plateB: '피지배층', hue: 8, hint: '부와 권력의 분배 격차' },
  { id: 'religion', label: '종교', plateA: '국교/정통', plateB: '이단/이교', hue: 268, hint: '신앙·교리·성직 권력' },
  { id: 'resource', label: '자원', plateA: '자원 보유', plateB: '자원 결핍', hue: 38, hint: '물·식량·광물·마력 분배' },
  { id: 'ethnic', label: '민족', plateA: '주류 민족', plateB: '소수 민족', hue: 200, hint: '혈통·언어·정체성' },
  { id: 'region', label: '지역', plateA: '중앙', plateB: '변방', hue: 150, hint: '수도와 변경의 자치·세금' },
  { id: 'gen', label: '세대', plateA: '구세대', plateB: '신세대', hue: 320, hint: '가치관·권력 이양' },
  { id: 'tech', label: '기술/힘', plateA: '능력자', plateB: '비능력자', hue: 188, hint: '마법·기술 접근권 격차' },
  { id: 'ideology', label: '이념', plateA: '전통/질서', plateB: '개혁/자유', hue: 96, hint: '사회 방향성 대립' },
]
const TYPE_BY_ID: Record<string, FaultType> = Object.fromEntries(FAULT_TYPES.map((t) => [t.id, t]))

// ── 데이터 모델 ──────────────────────────────────────────────────────
interface Fault {
  id: string
  type: string
  plateA: string
  plateB: string
  pressure: number // 0~100 누적 불만
  friction: number // 0~100 억압 강도
  slip: number // 0~100 긴장 누적 속도(변위)
  coupling: number // 0~100 다른 단층과의 연동(전이) 강도
  placeId?: string
  placeName?: string
  note?: string
}
interface State {
  faults: Fault[]
  worldName: string
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)

function stressOf(f: Fault): number {
  return clamp(0.45 * f.pressure + 0.3 * f.slip + 0.25 * f.friction)
}
function thresholdOf(f: Fault): number {
  return clamp(100 - f.friction * 0.35, 30, 100)
}
// 발화 위험도 0~100 (임계 대비 현재 스트레스)
function riskOf(f: Fault): number {
  return clamp(stressOf(f) - thresholdOf(f) + 50)
}
// 예상 파열까지 남은 '틱' (slip 0 이면 무한대 표시)
function ticksToRupture(f: Fault): number | null {
  const margin = thresholdOf(f) - stressOf(f)
  if (margin <= 0) return 0
  if (f.slip <= 0) return null
  // slip 한 틱당 누적 증가 환산(스트레스 가중치 0.45/0.30 반영, 근사)
  const perTick = (f.slip / 100) * 6 + 0.4
  return Math.max(1, Math.round(margin / perTick))
}
function riskBand(r: number): { label: string; color: string } {
  if (r >= 85) return { label: '파열 임박', color: '#e5484d' }
  if (r >= 65) return { label: '위험', color: '#e5894d' }
  if (r >= 45) return { label: '불안정', color: '#e3c44d' }
  if (r >= 25) return { label: '경계', color: '#7bb86f' }
  return { label: '안정', color: '#5aa9e6' }
}

// 문자열 해시 → 의사난수 시드(결정론)
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const newFault = (type: string): Fault => {
  const t = TYPE_BY_ID[type] || FAULT_TYPES[0]
  // 입력 기반 의사난수로 그럴듯한 초기값(결정론: type+시간 미사용, type만)
  const rnd = mulberry(hash(t.id + '|seed'))
  return {
    id: 'flt_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e5).toString(36),
    type: t.id,
    plateA: t.plateA,
    plateB: t.plateB,
    pressure: 30 + round(rnd() * 30),
    friction: 30 + round(rnd() * 30),
    slip: 20 + round(rnd() * 30),
    coupling: 20 + round(rnd() * 25),
  }
}

function load(): State {
  const fallback: State = { faults: [], worldName: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback
    const faults: Fault[] = Array.isArray(p.faults)
      ? p.faults
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Record<string, unknown>) => ({
            id: typeof x.id === 'string' ? x.id : 'flt_' + Math.random().toString(36).slice(2),
            type: typeof x.type === 'string' && TYPE_BY_ID[x.type] ? x.type : 'class',
            plateA: typeof x.plateA === 'string' ? x.plateA : '판 A',
            plateB: typeof x.plateB === 'string' ? x.plateB : '판 B',
            pressure: clamp(Number(x.pressure) || 0),
            friction: clamp(Number(x.friction) || 0),
            slip: clamp(Number(x.slip) || 0),
            coupling: clamp(Number(x.coupling) || 0),
            placeId: typeof x.placeId === 'string' ? x.placeId : undefined,
            placeName: typeof x.placeName === 'string' ? x.placeName : undefined,
            note: typeof x.note === 'string' ? x.note : undefined,
          }))
      : []
    return { faults, worldName: typeof p.worldName === 'string' ? p.worldName : '' }
  } catch {
    return fallback
  }
}

interface QuakeEvent {
  tick: number
  faultId: string
  label: string
  magnitude: number // 1~10
  chained: boolean
}

export default function WorldFaultLines({ payload }: { payload?: Record<string, unknown> }) {
  const places = useLibraryList('places')
  const [state, setState] = useState<State>(() => load())
  const [selId, setSelId] = useState<string>('')
  const [addType, setAddType] = useState<string>('class')
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [timeline, setTimeline] = useState<QuakeEvent[]>([])
  const [simHorizon, setSimHorizon] = useState(60)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.')
    }
  }, [state])

  // payload.text(원고/메모) → 새 단층의 메모로, payload.placeId → 단층을 그 장소에 연결
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const text = typeof payload.text === 'string' ? payload.text.trim() : ''
    const pid = typeof payload.placeId === 'string' ? payload.placeId : ''
    if (text || pid) {
      const f = newFault(addType)
      if (text) f.note = text.slice(0, 600)
      if (pid) {
        const pl = places.find((p) => p.id === pid)
        if (pl) {
          f.placeId = pl.id
          f.placeName = pl.name
        }
      }
      setState((s) => ({ ...s, faults: [f, ...s.faults] }))
      setSelId(f.id)
      flash('전달받은 내용으로 단층을 만들었어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      if (mounted.current) setNote('')
    }, 2800)
  }

  const sel = state.faults.find((f) => f.id === selId) || null

  // 결합도 기반 인접 전이 행렬 — 같은 장소/같은 판 이름 공유 시 더 강하게 묶인다.
  const couplingPairs = useMemo(() => {
    const pairs: { a: string; b: string; w: number }[] = []
    const fs = state.faults
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const A = fs[i]
        const B = fs[j]
        let w = (A.coupling + B.coupling) / 2 / 100
        if (A.placeId && A.placeId === B.placeId) w += 0.35
        if (A.plateA === B.plateA || A.plateB === B.plateB || A.plateA === B.plateB) w += 0.2
        w = Math.min(1, w)
        if (w > 0.12) pairs.push({ a: A.id, b: B.id, w })
      }
    }
    return pairs
  }, [state.faults])

  const sorted = useMemo(
    () => [...state.faults].sort((a, b) => riskOf(b) - riskOf(a)),
    [state.faults],
  )
  const hottest = sorted[0] || null
  const avgRisk = state.faults.length
    ? round(state.faults.reduce((n, f) => n + riskOf(f), 0) / state.faults.length)
    : 0

  // ── 조작 ──
  const addFault = () => {
    const f = newFault(addType)
    setState((s) => ({ ...s, faults: [f, ...s.faults] }))
    setSelId(f.id)
  }
  const removeFault = (id: string) => {
    setState((s) => ({ ...s, faults: s.faults.filter((f) => f.id !== id) }))
    if (selId === id) setSelId('')
  }
  const patch = (id: string, p: Partial<Fault>) =>
    setState((s) => ({ ...s, faults: s.faults.map((f) => (f.id === id ? { ...f, ...p } : f)) }))

  const attachPlace = (id: string, pid: string) => {
    if (!pid) {
      patch(id, { placeId: undefined, placeName: undefined })
      return
    }
    const pl = places.find((p) => p.id === pid)
    patch(id, { placeId: pid, placeName: pl?.name })
  }

  // ── 드롭(바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const txt = (item.text || '').trim()
    const f = newFault(addType)
    f.note = txt ? `[${item.title}]\n${txt.slice(0, 500)}` : item.title
    setState((s) => ({ ...s, faults: [f, ...s.faults] }))
    setSelId(f.id)
    flash(`「${item.title}」을(를) 단층 메모로 받았어요.`)
  }

  // ── 시뮬레이션: 미래 horizon 틱 동안 어디서 먼저 터지는지 ──
  const runSim = () => {
    if (!state.faults.length) {
      flash('먼저 단층을 추가하세요.')
      return
    }
    const seed = hash((state.worldName || 'world') + '|' + state.faults.map((f) => f.id).join(','))
    const rnd = mulberry(seed)
    // 가변 작업 사본(스트레스만 누적, 임계 넘으면 파열 후 일부 해소+여진)
    const work = state.faults.map((f) => ({
      id: f.id,
      type: f.type,
      stress: stressOf(f),
      threshold: thresholdOf(f),
      slip: f.slip,
      friction: f.friction,
      cooldown: 0,
      label: `${f.plateA} ↔ ${f.plateB}`,
    }))
    const idx: Record<string, number> = {}
    work.forEach((w, i) => (idx[w.id] = i))
    const events: QuakeEvent[] = []
    for (let tick = 1; tick <= simHorizon; tick++) {
      // 1) 누적
      for (const w of work) {
        if (w.cooldown > 0) {
          w.cooldown--
          continue
        }
        const inc = (w.slip / 100) * 6 + 0.4 + (rnd() - 0.5) * 2
        w.stress = clamp(w.stress + inc)
      }
      // 2) 파열 검사(연쇄: 파열 시 결합된 단층에 스트레스 전이)
      let ruptured = true
      let chainedThisTick = false
      const firedThisTick = new Set<string>()
      while (ruptured) {
        ruptured = false
        for (const w of work) {
          if (w.cooldown > 0 || w.stress < w.threshold || firedThisTick.has(w.id)) continue
          firedThisTick.add(w.id)
          ruptured = true
          // 억압이 강할수록(임계 높음) 파열 규모가 큼
          const mag = clamp(2 + (w.stress - 50) / 12 + w.friction / 28, 1, 10)
          events.push({
            tick,
            faultId: w.id,
            label: w.label,
            magnitude: round(mag * 10) / 10,
            chained: chainedThisTick,
          })
          // 해소 + 쿨다운(재발까지의 회복기), 억압 강할수록 더 오래 눌렸다 약하게 해소
          w.stress = clamp(w.stress - (35 + rnd() * 15) * (1 - w.friction / 220))
          w.cooldown = 3 + round(rnd() * 4)
          // 전이
          for (const p of couplingPairs) {
            const other = p.a === w.id ? p.b : p.b === w.id ? p.a : ''
            if (!other) continue
            const ow = work[idx[other]]
            if (!ow) continue
            const transfer = (mag / 10) * p.w * 22
            ow.stress = clamp(ow.stress + transfer)
            chainedThisTick = true
          }
        }
        if (ruptured) chainedThisTick = true
      }
    }
    setTimeline(events)
    if (!events.length) {
      flash(`${simHorizon}틱 동안 파열이 일어나지 않았어요 — 비교적 안정적입니다.`)
    } else {
      const first = events[0]
      flash(`첫 파열: ${first.tick}틱째 「${first.label}」 (규모 ${first.magnitude}).`)
    }
  }

  // 발화점 텍스트 보고서
  const buildReport = (): string => {
    const lines: string[] = []
    lines.push(`■ 세계 단층선 진단${state.worldName ? ' — ' + state.worldName : ''}`)
    lines.push(`단층 ${state.faults.length}개 · 평균 발화 위험도 ${avgRisk}/100`)
    lines.push('')
    sorted.forEach((f, i) => {
      const r = riskOf(f)
      const b = riskBand(r)
      const tt = ticksToRupture(f)
      const t = TYPE_BY_ID[f.type]
      lines.push(`${i + 1}. [${t?.label || '?'}] ${f.plateA} ↔ ${f.plateB}`)
      lines.push(
        `   위험도 ${round(r)} (${b.label}) · 스트레스 ${round(stressOf(f))}/임계 ${round(thresholdOf(f))}` +
          (tt === 0 ? ' · 이미 임계 초과' : tt == null ? '' : ` · 예상 파열 약 ${tt}틱 후`),
      )
      lines.push(`   불만 ${f.pressure} · 억압 ${f.friction} · 긴장속도 ${f.slip} · 연동 ${f.coupling}`)
      if (f.placeName) lines.push(`   발화 예상지: ${f.placeName}`)
      if (f.note) lines.push(`   메모: ${f.note.replace(/\n/g, ' ')}`)
      lines.push('')
    })
    if (timeline.length) {
      lines.push(`■ 시뮬레이션(${simHorizon}틱) — 파열 ${timeline.length}건`)
      timeline.slice(0, 24).forEach((e) => {
        lines.push(`   ${e.tick}틱: 「${e.label}」 규모 ${e.magnitude}${e.chained ? ' (연쇄)' : ''}`)
      })
    }
    return lines.join('\n')
  }

  const copyReport = async () => {
    if (!state.faults.length) {
      flash('먼저 단층을 추가하세요.')
      return
    }
    const text = buildReport()
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flash('진단 보고서를 복사했어요.')
    } catch {
      flash('복사에 실패했어요.')
    }
  }

  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const reportHtml = (): string => {
    const parts: string[] = []
    parts.push(
      `<p style="color:#888;">세계 단층선 진단 — 단층 ${state.faults.length}개 · 평균 발화 위험도 ${avgRisk}/100</p>`,
    )
    sorted.forEach((f, i) => {
      const r = round(riskOf(f))
      const b = riskBand(r)
      const tt = ticksToRupture(f)
      const t = TYPE_BY_ID[f.type]
      parts.push(`<h3>${escapeHtml(`${i + 1}. [${t?.label || '?'}] ${f.plateA} ↔ ${f.plateB}`)}</h3>`)
      parts.push(
        `<p><b>발화 위험도 ${r} (${escapeHtml(b.label)})</b> — 스트레스 ${round(stressOf(f))} / 임계 ${round(
          thresholdOf(f),
        )}${tt === 0 ? ' · 이미 임계 초과' : tt == null ? '' : ` · 예상 파열 약 ${tt}틱 후`}</p>`,
      )
      parts.push(
        `<p>불만(압력) ${f.pressure} · 억압(마찰) ${f.friction} · 긴장 누적속도 ${f.slip} · 연동 ${f.coupling}</p>`,
      )
      if (f.placeName) parts.push(`<p>발화 예상지: ${escapeHtml(f.placeName)}</p>`)
      if (f.note) parts.push(`<p>${escapeHtml(f.note).replace(/\n/g, '<br/>')}</p>`)
    })
    if (timeline.length) {
      parts.push(`<h3>${escapeHtml(`시뮬레이션(${simHorizon}틱) — 파열 ${timeline.length}건`)}</h3>`)
      parts.push(
        '<p>' +
          timeline
            .slice(0, 40)
            .map((e) => escapeHtml(`${e.tick}틱: 「${e.label}」 규모 ${e.magnitude}${e.chained ? ' (연쇄)' : ''}`))
            .join('<br/>') +
          '</p>',
      )
    }
    return parts.join('')
  }

  const addReportToProject = () => {
    if (!hasProjectBridge()) {
      flash('프로젝트에 연결되어 있지 않아요.')
      return
    }
    if (!state.faults.length) {
      flash('먼저 단층을 추가하세요.')
      return
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `단층선 진단${state.worldName ? ' — ' + state.worldName : ''}`,
      bodyHtml: reportHtml(),
      synopsis: hottest ? `최대 위험: ${hottest.plateA} ↔ ${hottest.plateB} (${round(riskOf(hottest))})` : '',
    })
    flash(id ? '프로젝트 자료 〈세계관〉에 진단 보고서를 추가했어요.' : '추가하지 못했어요.')
  }

  const stashReport = () => {
    if (!hasStash()) {
      flash('수집함을 사용할 수 없어요.')
      return
    }
    if (!state.faults.length) {
      flash('먼저 단층을 추가하세요.')
      return
    }
    addToStash({ kind: 'memo', label: '세계 단층선 진단', text: buildReport() })
    flash('수집함에 진단을 담았어요.')
  }

  // 선택 단층을 발화점으로 장소 라이브러리에 저장(없는 장소면 새로 생성)
  const saveAsPlace = (f: Fault) => {
    const r = round(riskOf(f))
    const b = riskBand(r)
    const t = TYPE_BY_ID[f.type]
    const dangers = `${t?.label || '갈등'} 단층: ${f.plateA} ↔ ${f.plateB} · 발화 위험도 ${r}(${b.label})`
    const secrets = f.note || ''
    if (f.placeId && places.some((p) => p.id === f.placeId)) {
      flash('이미 장소에 연결되어 있어요 — 새 발화점 장소를 만들려면 연결을 해제하세요.')
      return
    }
    const name = f.placeName || `${f.plateA}·${f.plateB} 분쟁지`
    const rec = addToLibrary('places', {
      name,
      kind: '분쟁 발화점',
      mood: b.label,
      fields: {
        name,
        kind: '분쟁 발화점',
        atmosphere: `${b.label} — ${t?.label || ''} 긴장`,
        dangers,
        history: `누적 불만 ${f.pressure} · 억압 ${f.friction} · 긴장속도 ${f.slip}`,
        secrets,
      },
      source: '세계 단층선',
    })
    patch(f.id, { placeId: rec.id, placeName: rec.name })
    flash(`「${name}」을(를) 장소 라이브러리에 발화점으로 저장했어요.`)
  }

  const clearAll = () => {
    setState({ faults: [], worldName: state.worldName })
    setTimeline([])
    setSelId('')
    flash('모든 단층을 지웠어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text)',
    boxSizing: 'border-box',
    fontSize: 13.5,
  }
  const head: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 11, background: 'var(--panel)', overflow: 'hidden' }
  const input: React.CSSProperties = {
    padding: '6px 9px',
    fontSize: 13,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--paper)',
    color: 'var(--text)',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const small: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const label = (txt: string) => <span style={{ fontSize: 11.5, color: 'var(--muted)', minWidth: 54 }}>{txt}</span>

  const Slider = (props: { v: number; on: (n: number) => void; hue?: number; title?: string }) => (
    <input
      type="range"
      min={0}
      max={100}
      value={props.v}
      title={props.title}
      onChange={(e) => props.on(Number(e.target.value))}
      style={{ flex: 1, minWidth: 80, accentColor: props.hue != null ? `hsl(${props.hue} 70% 50%)` : 'var(--accent)' }}
    />
  )

  return (
    <div
      style={wrap}
      onDragOver={(e) => {
        if (isItemDrag(e)) {
          e.preventDefault()
          if (!dragOver) setDragOver(true)
        }
      }}
      onDragLeave={() => dragOver && setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={head}>
        <div style={row}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>세계 단층선</span>
          <span style={{ flex: 1 }} />
          <input
            style={{ ...input, width: 130 }}
            placeholder="세계 이름(선택)"
            value={state.worldName}
            onChange={(e) => setState((s) => ({ ...s, worldName: e.target.value }))}
          />
        </div>
        <div style={row}>
          <select style={{ ...input, flex: 1, minWidth: 110 }} value={addType} onChange={(e) => setAddType(e.target.value)}>
            {FAULT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={addFault} title="이 종류의 새 단층(긴장축) 추가">
            + 단층 추가
          </button>
        </div>
        <div style={row}>
          <span style={{ ...small, whiteSpace: 'nowrap' }}>단층 {state.faults.length} · 평균위험 </span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', minWidth: 90 }}>
            <div style={{ height: '100%', width: `${avgRisk}%`, background: riskBand(avgRisk).color, transition: 'width .25s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: riskBand(avgRisk).color, minWidth: 30, textAlign: 'right' }}>{avgRisk}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--accent)' }}>{note}</div>}
        {dragOver && <div style={{ fontSize: 12, color: 'var(--accent)' }}>여기에 놓으면 문서 내용을 단층 메모로 가져옵니다.</div>}
      </div>

      <div style={body}>
        {state.faults.length === 0 && (
          <div style={{ ...card, padding: 16, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>세계의 갈등을 지질 단층처럼 읽습니다</div>
            <div style={small}>
              계급·종교·자원·민족 같은 사회적 긴장은 두 세력이 맞닿은 '단층'입니다. 불만(압력)이 쌓이고
              억압(마찰)이 그것을 눌러두지만, 한계를 넘으면 한꺼번에 파열(폭동·전쟁·봉기)합니다.
              위에서 종류를 골라 단층을 추가하면 발화 위험도와 예상 파열 시점이 계산됩니다.
            </div>
            <div style={{ ...small, marginTop: 8 }}>
              왼쪽 바인더의 문서를 이 창에 끌어다 놓거나, 장소 라이브러리의 장소를 단층에 연결할 수 있어요.
              {places.length > 0 ? ` (사용 가능한 장소 ${places.length}곳)` : ''}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={addFault}>첫 단층 만들기</button>
              <button className="linkbtn" onClick={() => openToolLinked('worldbuilding-q')}>세계관 설문지 열기</button>
            </div>
          </div>
        )}

        {sorted.map((f, rank) => {
          const r = riskOf(f)
          const b = riskBand(r)
          const tt = ticksToRupture(f)
          const t = TYPE_BY_ID[f.type] || FAULT_TYPES[0]
          const open = selId === f.id
          const S = stressOf(f)
          const T = thresholdOf(f)
          return (
            <div key={f.id} style={{ ...card, borderColor: open ? b.color : 'var(--border)' }}>
              {/* 헤더: 단층선 시각화 */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSelId(open ? '' : f.id)}
              >
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'center', flexShrink: 0 }}>#{rank + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 6, background: `hsl(${t.hue} 60% 50% / .18)`, color: `hsl(${t.hue} 65% 45%)`, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{f.plateA}</span>
                    <span style={{ color: b.color, fontWeight: 800 }}>↯</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{f.plateB}</span>
                  </div>
                  {/* 단층 스트레스 게이지(임계선 표시) */}
                  <div style={{ marginTop: 6, position: 'relative', height: 12, borderRadius: 6, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${S}%`, background: `linear-gradient(90deg, hsl(${t.hue} 55% 55% / .55), ${b.color})`, transition: 'width .25s' }} />
                    <div title={`임계 ${round(T)}`} style={{ position: 'absolute', left: `${T}%`, top: -2, bottom: -2, width: 2, background: '#000', opacity: 0.55 }} />
                  </div>
                  <div style={{ ...small, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: b.color, fontWeight: 700 }}>{b.label} {round(r)}</span>
                    <span>스트레스 {round(S)} / 임계 {round(T)}</span>
                    {tt === 0 ? <span style={{ color: '#e5484d', fontWeight: 700 }}>임계 초과</span> : tt != null ? <span>약 {tt}틱 후</span> : <span>정체</span>}
                    {f.placeName && <span>· 발화지 {f.placeName}</span>}
                  </div>
                </div>
                <button className="minibtn" onClick={(e) => { e.stopPropagation(); removeFault(f.id) }} title="단층 삭제" style={{ flexShrink: 0 }}>
                  ✕
                </button>
              </div>

              {open && (
                <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 9, borderTop: '1px solid var(--border)' }}>
                  <div style={row}>
                    <input style={{ ...input, flex: 1, minWidth: 90 }} value={f.plateA} onChange={(e) => patch(f.id, { plateA: e.target.value })} placeholder="대립 세력 A" />
                    <span style={{ color: b.color, fontWeight: 800 }}>↯</span>
                    <input style={{ ...input, flex: 1, minWidth: 90 }} value={f.plateB} onChange={(e) => patch(f.id, { plateB: e.target.value })} placeholder="대립 세력 B" />
                  </div>
                  <div style={row}>
                    {label('종류')}
                    <select style={{ ...input, flex: 1 }} value={f.type} onChange={(e) => patch(f.id, { type: e.target.value })}>
                      {FAULT_TYPES.map((tt2) => (
                        <option key={tt2.id} value={tt2.id}>{tt2.label} — {tt2.hint}</option>
                      ))}
                    </select>
                  </div>
                  <div style={row}>
                    {label('불만 압력')}
                    <Slider v={f.pressure} on={(n) => patch(f.id, { pressure: n })} hue={8} title="누적된 불만/요구" />
                    <span style={{ ...small, width: 26, textAlign: 'right' }}>{f.pressure}</span>
                  </div>
                  <div style={row}>
                    {label('억압 마찰')}
                    <Slider v={f.friction} on={(n) => patch(f.id, { friction: n })} hue={210} title="권력이 긴장을 눌러두는 힘(임계점을 높이지만 파열 규모를 키움)" />
                    <span style={{ ...small, width: 26, textAlign: 'right' }}>{f.friction}</span>
                  </div>
                  <div style={row}>
                    {label('긴장 속도')}
                    <Slider v={f.slip} on={(n) => patch(f.id, { slip: n })} hue={40} title="긴장이 쌓이는 속도(변위)" />
                    <span style={{ ...small, width: 26, textAlign: 'right' }}>{f.slip}</span>
                  </div>
                  <div style={row}>
                    {label('연동도')}
                    <Slider v={f.coupling} on={(n) => patch(f.id, { coupling: n })} hue={150} title="다른 단층으로 충격이 전이되는 강도(연쇄 폭발)" />
                    <span style={{ ...small, width: 26, textAlign: 'right' }}>{f.coupling}</span>
                  </div>
                  <div style={row}>
                    {label('장소 연결')}
                    <select style={{ ...input, flex: 1 }} value={f.placeId || ''} onChange={(e) => attachPlace(f.id, e.target.value)} title="발화가 예상되는 장소(라이브러리)">
                      <option value="">— 연결 안 함 —</option>
                      {places.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    style={{ ...input, width: '100%', minHeight: 46, resize: 'vertical', lineHeight: 1.5 }}
                    value={f.note || ''}
                    onChange={(e) => patch(f.id, { note: e.target.value })}
                    placeholder="이 단층의 배경·도화선·예상 시나리오 메모…"
                  />
                  <div style={{ ...small, lineHeight: 1.6, padding: '6px 8px', borderRadius: 8, background: 'var(--chrome-2)' }}>
                    진단: <b style={{ color: b.color }}>{b.label}</b> — {
                      r >= 85 ? '도화선 하나면 즉시 폭발할 상태. 작은 사건이 봉기/전쟁의 방아쇠가 됩니다.'
                      : r >= 65 ? '긴장이 가시화되는 단계. 시위·태업·국지 충돌이 빈발합니다.'
                      : r >= 45 ? '잠재 갈등이 표면화되기 시작. 불씨를 관리하지 않으면 악화됩니다.'
                      : r >= 25 ? '안정적이나 압력이 누적 중. 장기적으로 주시할 축입니다.'
                      : '현재로선 잠잠합니다. 다른 단층의 연쇄로 흔들릴 수 있습니다.'
                    }
                    {f.friction > 65 && ' 강한 억압이 폭발을 미루지만, 터질 땐 더 격렬할 것입니다.'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => saveAsPlace(f)} title="이 단층을 장소 라이브러리에 발화점으로 저장">발화점→장소 저장</button>
                    <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { text: `${f.plateA} ↔ ${f.plateB}`, title: `${t.label} 갈등` })} title="갈등 빌더로 이 대립을 전개">갈등 빌더로</button>
                    <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { placeId: f.placeId })} title="배경 설정집 열기">설정집 열기</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 시뮬레이션 패널 */}
        {state.faults.length > 0 && (
          <div style={{ ...card, padding: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700 }}>미래 시뮬레이션</span>
              <span style={{ flex: 1 }} />
              {label('기간(틱)')}
              <input type="range" min={20} max={200} step={10} value={simHorizon} onChange={(e) => setSimHorizon(Number(e.target.value))} style={{ width: 100, accentColor: 'var(--accent)' }} />
              <span style={{ ...small, width: 30, textAlign: 'right' }}>{simHorizon}</span>
              <button className="btn-primary" onClick={runSim}>실행</button>
            </div>
            <div style={{ ...small, marginTop: 6, lineHeight: 1.6 }}>
              현재 압력·속도·연동을 바탕으로 미래에 어느 단층이 먼저, 어떤 규모로, 어떻게 연쇄 파열하는지 추정합니다.
            </div>
            {timeline.length > 0 && (
              <div style={{ marginTop: 9 }}>
                {/* 타임라인 막대 */}
                <div style={{ position: 'relative', height: 54, borderRadius: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {timeline.map((e, i) => {
                    const t = TYPE_BY_ID[state.faults.find((x) => x.id === e.faultId)?.type || 'class'] || FAULT_TYPES[0]
                    const left = (e.tick / simHorizon) * 100
                    const h = 14 + (e.magnitude / 10) * 38
                    return (
                      <div
                        key={i}
                        title={`${e.tick}틱 · ${e.label} · 규모 ${e.magnitude}${e.chained ? ' (연쇄)' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          bottom: 0,
                          width: 3,
                          height: h,
                          background: e.chained ? `hsl(${t.hue} 70% 60%)` : `hsl(${t.hue} 70% 45%)`,
                          opacity: e.chained ? 0.7 : 1,
                          borderRadius: 2,
                        }}
                      />
                    )
                  })}
                </div>
                <div style={{ ...small, marginTop: 5, maxHeight: 96, overflow: 'auto' }}>
                  {timeline.slice(0, 30).map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ width: 44, textAlign: 'right', color: 'var(--muted)' }}>{e.tick}틱</span>
                      <span style={{ flex: 1 }}>{e.label} · 규모 {e.magnitude}{e.chained ? ' (연쇄)' : ''}</span>
                    </div>
                  ))}
                  {timeline.length > 30 && <div style={{ color: 'var(--muted)' }}>… 외 {timeline.length - 30}건</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {state.faults.length > 0 && (
          <div className="license-note" style={{ ...small, lineHeight: 1.6 }}>
            모델: 스트레스 = 0.45·불만 + 0.30·속도 + 0.25·억압. 임계점 = 100 − 억압·0.35.
            억압은 파열을 미루지만 임계 초과 시 규모를 키웁니다. 모든 계산은 이 브라우저에서만 이루어지며 자동 저장됩니다.
          </div>
        )}
      </div>

      {/* 하단 액션 바 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="linkbtn" onClick={addReportToProject} disabled={!hasProjectBridge() || !state.faults.length} title="진단 보고서를 프로젝트 자료에 추가">
          프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={stashReport} disabled={!hasStash() || !state.faults.length}>수집함</button>
        <button className="minibtn" onClick={copyReport} disabled={!state.faults.length}>보고서 복사</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={clearAll} disabled={!state.faults.length} style={{ color: state.faults.length ? 'var(--warn)' : undefined }}>전체 비우기</button>
      </div>
    </div>
  )
}
