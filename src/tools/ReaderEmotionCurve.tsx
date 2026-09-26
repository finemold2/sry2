// 독자 감정 곡선 설계 — 목표로 하는 독자의 감정(긴장/몰입의 높낮이) 곡선을 직접 그리거나
// 구조 템플릿(3막·영웅 여정·기승전결 등)으로 불러온 뒤, 그 곡선의 모양을 거꾸로 분석해
// 각 구간에 어떤 장면/비트를 배치해야 하는지를 역설계로 제안한다.
//  - 곡선 편집: 점을 끌어 올리거나 내려 봉우리/골짜기를 만든다(SVG, 결정론적).
//  - 역설계: 기울기(상승/하강/고조)·국소 정점(클라이맥스)·골짜기(휴지)를 검출해 비트를 제안.
//  - 분석: 평균 긴장도·변동성·정점/저점 개수·단조 구간 경고 등 곡선 진단.
//  - 연동: 바인더 문서/payload 텍스트의 길이를 받아 구간 매핑, 라이브러리 스니펫에서 비트 흡수,
//          비트를 스니펫 라이브러리에 저장, 수집함 담기, 프로젝트 「비트」 문서로 내보내기,
//          관련 도구(장면 플래너·플롯 피라미드) 열기.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  addToLibrary, useLibraryList,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
  type ToolPayload, type SharedSnippet,
} from './linkbus'

export const meta = {
  id: 'reader-emotion-curve',
  name: '독자 감정 곡선 설계',
  icon: '📉',
  group: '구상·정리',
  intro: '목표 감정 곡선을 그리면 그에 맞는 장면 배치와 비트를 역설계로 제안합니다',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:reader-emotion-curve'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
// 곡선은 N개의 정규화 높이값(0..100). x는 등간격, y가 독자 긴장/몰입도.
interface CurveState {
  points: number[]          // 높이값 배열(0..100)
  template: string          // 적용한 템플릿 id('' = 자유)
  title: string             // 이 곡선/작품 제목
  scope: string             // 단위(작품 전체/한 권/한 화 등)
  beats: Record<number, string> // 구간 index → 사용자가 적어 둔 비트 메모
}

const DEFAULT_N = 12

// ── 구조 템플릿(곡선 프리셋) ──────────────────────────────────────────────────
// 각 템플릿은 0..100 높이 시퀀스. 길이가 달라도 리샘플해서 적용한다.
interface Template { id: string; name: string; note: string; shape: number[] }
const TEMPLATES: Template[] = [
  {
    id: 'three-act', name: '3막 구조', note: '도입-상승-전환-위기-절정-해소',
    shape: [22, 28, 38, 34, 52, 60, 48, 70, 82, 96, 40, 24],
  },
  {
    id: 'hero', name: '영웅의 여정', note: '일상-소명-시련-심연-귀환',
    shape: [18, 26, 20, 44, 58, 50, 78, 64, 92, 70, 38, 28],
  },
  {
    id: 'kishōtenketsu', name: '기승전결', note: '평온-전개-비약(전)-결말',
    shape: [30, 36, 44, 50, 46, 54, 88, 72, 96, 78, 40, 30],
  },
  {
    id: 'fichtean', name: '피히테 곡선', note: '연속 위기로 계단식 상승',
    shape: [30, 48, 38, 60, 50, 74, 62, 86, 72, 98, 56, 30],
  },
  {
    id: 'tragedy', name: '비극(추락)', note: '상승 후 가차없는 하강',
    shape: [40, 56, 70, 82, 92, 76, 60, 46, 34, 22, 14, 8],
  },
  {
    id: 'romance', name: '로맨스 W형', note: '만남-갈등-위기-재회',
    shape: [34, 58, 72, 44, 30, 52, 70, 50, 36, 64, 88, 70],
  },
  {
    id: 'mystery', name: '미스터리', note: '의문-단서-반전-해명',
    shape: [44, 38, 54, 48, 64, 56, 76, 60, 92, 50, 70, 34],
  },
  {
    id: 'webnovel', name: '웹소설 사이다', note: '고비-사이다 반복, 회당 절정',
    shape: [40, 26, 66, 36, 78, 44, 86, 52, 94, 58, 90, 48],
  },
]

// ── 유틸: 문자열 시드 의사난수(결정론적) ──────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function clamp(v: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, v)) }

// 임의 길이 shape 를 n개로 선형 리샘플.
function resample(shape: number[], n: number): number[] {
  if (shape.length === 0) return new Array(n).fill(50)
  if (shape.length === 1) return new Array(n).fill(clamp(shape[0]))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (shape.length - 1)
    const a = Math.floor(t)
    const b = Math.min(shape.length - 1, a + 1)
    const f = t - a
    out.push(clamp(Math.round(shape[a] * (1 - f) + shape[b] * f)))
  }
  return out
}

// 칸 수가 바뀔 때 beats(구간 index → 메모)를 비율 기준으로 재매핑.
function remapBeats(beats: Record<number, string>, oldN: number, newN: number): Record<number, string> {
  if (oldN <= 1 || newN <= 1) return { ...beats }
  const out: Record<number, string> = {}
  for (const k of Object.keys(beats)) {
    const oi = Number(k)
    const ni = Math.round((oi / (oldN - 1)) * (newN - 1))
    if (beats[oi]) out[ni] = beats[oi]
  }
  return out
}

// ── 비트 어휘(역설계 제안용) — 곡선의 국소 형태별로 어떤 장면을 둘지 ─────────────
// 결정론적으로 시드(곡선 위치+모양)에 따라 변형을 고른다.
const BEAT_LIB = {
  rise: [
    '갈등의 씨앗을 심는다 — 인물이 작은 결심을 한다',
    '위협이 모습을 드러낸다 — 판이 한 단계 커진다',
    '대가를 치르며 전진한다 — 무언가를 잃고 얻는다',
    '추격/대결의 압박이 조여 온다',
    '비밀의 일부가 드러나 판단을 흔든다',
  ],
  fall: [
    '한숨 돌리는 휴지 — 인물의 내면을 비춘다',
    '관계를 정비한다 — 동료/연인과의 장면',
    '여운과 성찰 — 방금 일어난 사건의 무게를 곱씹는다',
    '거짓 안도 — 평온 속에 다음 위협의 복선',
    '일상으로의 짧은 회귀 — 잃은 것을 환기',
  ],
  peak: [
    '절정 — 가장 큰 대가를 건 정면 충돌',
    '폭로/반전 — 모든 전제가 뒤집힌다',
    '선택의 순간 — 돌이킬 수 없는 결단',
    '희생 — 인물이 가장 소중한 것을 내건다',
    '대결의 정점 — 힘과 의지가 맞부딪친다',
  ],
  valley: [
    '심연 — 모든 것을 잃은 듯한 바닥',
    '의심과 고립 — 믿음이 무너진다',
    '재정비의 고요 — 다시 일어설 준비',
    '관계의 균열 — 가까운 이와 멀어진다',
    '내적 패배 — 스스로에 대한 회의',
  ],
  flat_high: ['높은 긴장의 지속 — 일촉즉발의 교착, 단 길어지면 피로해진다'],
  flat_low: ['낮은 긴장의 지속 — 정보 정리 구간, 단 길어지면 지루해진다'],
  open: [
    '훅 — 첫 장면에서 의문/매력으로 독자를 붙잡는다',
    '세계와 인물의 일상을 보여 주되 균열의 단서를 심는다',
  ],
  close: [
    '해소 — 갈등이 가라앉고 변화가 정착된다',
    '새 균형 — 인물이 어떻게 달라졌는지 보여 준다',
    '여운/후크 — 다음 이야기로의 작은 문을 남긴다',
  ],
}

type BeatKind = keyof typeof BEAT_LIB

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length] }

// ── 곡선 → 비트 역설계 ─────────────────────────────────────────────────────────
interface BeatSuggestion {
  i: number
  height: number
  kind: BeatKind
  kindLabel: string
  slope: number          // 직전 대비 변화량
  text: string
  tag: string            // 짧은 라벨
}

const KIND_LABEL: Record<BeatKind, string> = {
  rise: '상승', fall: '하강', peak: '정점', valley: '저점',
  flat_high: '고긴장 유지', flat_low: '저긴장 유지', open: '도입', close: '결말',
}
const KIND_COLOR: Record<BeatKind, string> = {
  rise: 'var(--accent)', fall: '#7c8aa3', peak: 'var(--warn)', valley: '#5b8def',
  flat_high: 'var(--warn)', flat_low: 'var(--muted)', open: 'var(--ok)', close: 'var(--ok)',
}

function reverseEngineer(points: number[], titleSeed: string): BeatSuggestion[] {
  const n = points.length
  const out: BeatSuggestion[] = []
  const seedBase = hashStr(titleSeed)
  for (let i = 0; i < n; i++) {
    const h = points[i]
    const prev = i > 0 ? points[i - 1] : h
    const next = i < n - 1 ? points[i + 1] : h
    const slope = h - prev
    let kind: BeatKind
    const isLocalMax = h >= prev && h >= next && (h > prev || h > next)
    const isLocalMin = h <= prev && h <= next && (h < prev || h < next)
    if (i === 0) kind = 'open'
    else if (i === n - 1) kind = 'close'
    else if (isLocalMax && h >= 62) kind = 'peak'
    else if (isLocalMin && h <= 42) kind = 'valley'
    else if (slope >= 8) kind = 'rise'
    else if (slope <= -8) kind = 'fall'
    else if (h >= 62) kind = 'flat_high'
    else kind = 'flat_low'

    const seed = (seedBase + i * 2654435761 + h * 40503) >>> 0
    const text = pick(BEAT_LIB[kind], seed)
    out.push({ i, height: h, kind, kindLabel: KIND_LABEL[kind], slope, text, tag: KIND_LABEL[kind] })
  }
  return out
}

// ── 곡선 진단(분석) ────────────────────────────────────────────────────────────
interface Diagnosis { label: string; tone: 'ok' | 'warn' | 'info'; text: string }
function diagnose(points: number[]): { avg: number; variance: number; peaks: number; valleys: number; climaxAt: number; notes: Diagnosis[] } {
  const n = points.length
  const avg = Math.round(points.reduce((a, b) => a + b, 0) / n)
  const variance = Math.round(Math.sqrt(points.reduce((a, b) => a + (b - avg) ** 2, 0) / n))
  let peaks = 0, valleys = 0, climaxAt = 0, climaxVal = -1
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? points[i - 1] : points[i]
    const next = i < n - 1 ? points[i + 1] : points[i]
    if (points[i] >= prev && points[i] >= next && (points[i] > prev || points[i] > next) && points[i] >= 55) peaks++
    if (points[i] <= prev && points[i] <= next && (points[i] < prev || points[i] < next) && points[i] <= 45) valleys++
    if (points[i] > climaxVal) { climaxVal = points[i]; climaxAt = i }
  }
  const notes: Diagnosis[] = []
  // 절정 위치
  const climaxPct = Math.round((climaxAt / (n - 1)) * 100)
  if (climaxPct < 55) notes.push({ label: '절정 위치', tone: 'warn', text: `최고 긴장점이 ${climaxPct}% 지점으로 이릅니다. 보통 70~90% 후반부에 두면 가속이 살아납니다.` })
  else if (climaxPct > 96) notes.push({ label: '절정 위치', tone: 'info', text: `절정이 거의 끝(${climaxPct}%)에 있습니다. 해소·여운을 위한 하강 구간을 한두 칸 남겨 두세요.` })
  else notes.push({ label: '절정 위치', tone: 'ok', text: `절정이 ${climaxPct}% 지점 — 후반 가속에 적절합니다.` })
  // 변동성
  if (variance < 10) notes.push({ label: '기복', tone: 'warn', text: `긴장의 기복이 작습니다(편차 ${variance}). 봉우리와 골짜기를 키워 리듬을 만드세요.` })
  else if (variance > 32) notes.push({ label: '기복', tone: 'info', text: `기복이 매우 큽니다(편차 ${variance}). 독자가 멀미하지 않도록 짧은 휴지 구간을 확인하세요.` })
  else notes.push({ label: '기복', tone: 'ok', text: `긴장의 리듬이 건강합니다(편차 ${variance}).` })
  // 시작 높이
  if (points[0] >= 60) notes.push({ label: '도입', tone: 'info', text: '시작부터 긴장이 높습니다(인 메디아스 레스). 곧이어 숨 고를 구간을 두면 좋습니다.' })
  else if (points[0] <= 18) notes.push({ label: '도입', tone: 'warn', text: '도입이 매우 낮습니다. 첫 칸에 작은 훅(의문/매력)을 심어 이탈을 막으세요.' })
  // 단조 지속 구간(같은 방향 4칸 이상 거의 평탄)
  let flatRun = 1, maxFlat = 1, flatStart = 0, maxFlatStart = 0
  for (let i = 1; i < n; i++) {
    if (Math.abs(points[i] - points[i - 1]) <= 4) { flatRun++; if (flatRun > maxFlat) { maxFlat = flatRun; maxFlatStart = flatStart } }
    else { flatRun = 1; flatStart = i }
  }
  if (maxFlat >= 4) notes.push({ label: '평탄 구간', tone: 'warn', text: `${maxFlatStart + 1}~${maxFlatStart + maxFlat}칸이 거의 평탄합니다(${maxFlat}칸). 사건이나 반전을 넣어 처짐을 막으세요.` })
  // 끝 처리
  if (points[n - 1] >= points[climaxAt] - 6 && climaxAt !== n - 1) notes.push({ label: '결말', tone: 'info', text: '끝이 절정만큼 높습니다. 의도된 절벽 엔딩이 아니라면 약간의 하강(해소)을 고려하세요.' })
  return { avg, variance, peaks, valleys, climaxAt, notes }
}

// ── 로드/세이브 ────────────────────────────────────────────────────────────────
function freshState(): CurveState {
  return { points: resample(TEMPLATES[0].shape, DEFAULT_N), template: 'three-act', title: '', scope: '작품 전체', beats: {} }
}
function loadState(): CurveState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return freshState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return freshState()
    const pts = Array.isArray(p.points) ? p.points.map((v: unknown) => clamp(Number(v) || 0)) : null
    if (!pts || pts.length < 4) return freshState()
    const beats: Record<number, string> = {}
    if (p.beats && typeof p.beats === 'object') for (const k of Object.keys(p.beats)) { const v = p.beats[k]; if (typeof v === 'string') beats[Number(k)] = v }
    return {
      points: pts,
      template: typeof p.template === 'string' ? p.template : '',
      title: typeof p.title === 'string' ? p.title : '',
      scope: typeof p.scope === 'string' ? p.scope : '작품 전체',
      beats,
    }
  } catch { return freshState() }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ReaderEmotionCurve({ payload }: { payload?: ToolPayload }) {
  const initial = useRef<CurveState>()
  if (!initial.current) initial.current = loadState()

  const [state, setState] = useState<CurveState>(initial.current)
  const [note, setNote] = useState('')
  const [activeBeat, setActiveBeat] = useState<number | null>(null) // 우측 패널에서 선택된 칸
  const [tab, setTab] = useState<'beats' | 'diagnose'>('beats')
  const [dropHover, setDropHover] = useState(false)
  const [copied, setCopied] = useState(false)
  const dragDepth = useRef(0)
  const mounted = useRef(true)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragIdx = useRef<number | null>(null)
  // 마지막으로 적용한 템플릿 id 보관(자유 곡선이 되어도 '초기화'가 이 템플릿으로 되돌리도록).
  const lastTemplate = useRef<string>(initial.current.template || 'three-act')

  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침 시 내용이 초기화될 수 있어요.') }
  }, [state])

  // payload 수용: text(원고)·title 받으면 길이 기반으로 칸 수 추천 + 제목 채움.
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : ''
    const ti = typeof payload.title === 'string' ? payload.title : ''
    if (!t && !ti) return
    setState((s) => {
      const next = { ...s }
      if (ti && !s.title) next.title = ti
      if (t) {
        // 글자 수에 따라 5~24칸으로 추천(약 1,500자/칸).
        const n = clamp(Math.round(t.length / 1500), 5, 24)
        if (Math.abs(n - s.points.length) >= 2) {
          next.beats = remapBeats(s.beats, s.points.length, n)
          next.points = resample(s.points, n)
        }
      }
      return next
    })
    setNote('드롭한 내용을 반영했어요. 글 길이에 맞춰 구간 수를 조정할 수 있습니다.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const n = state.points.length

  // ── 곡선 편집(SVG 좌표 변환) ─────────────────────────────────────────────────
  const VW = 1000, VH = 360, PADX = 36, PADY = 24
  const xOf = useCallback((i: number) => PADX + (i / (n - 1)) * (VW - PADX * 2), [n])
  const yOf = useCallback((h: number) => PADY + (1 - h / 100) * (VH - PADY * 2), [])

  const heightFromEvent = useCallback((clientY: number): number => {
    const svg = svgRef.current
    if (!svg) return 50
    const rect = svg.getBoundingClientRect()
    const rel = (clientY - rect.top) / rect.height // 0..1 (위=0)
    const yView = rel * VH
    const h = (1 - (yView - PADY) / (VH - PADY * 2)) * 100
    return clamp(Math.round(h))
  }, [])

  const setPoint = useCallback((i: number, h: number) => {
    setState((s) => {
      const pts = [...s.points]
      pts[i] = clamp(h)
      return { ...s, points: pts, template: '' } // 손대면 자유 곡선
    })
  }, [])

  const onPointerDownNode = useCallback((i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    dragIdx.current = i
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
    setActiveBeat(i)
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdx.current == null) return
    setPoint(dragIdx.current, heightFromEvent(e.clientY))
  }, [setPoint, heightFromEvent])
  const onPointerUp = useCallback(() => { dragIdx.current = null }, [])

  // 적용: 템플릿
  const applyTemplate = useCallback((id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    lastTemplate.current = id
    setState((s) => ({ ...s, points: resample(t.shape, s.points.length), template: id }))
    setNote(`「${t.name}」 곡선을 적용했어요. 점을 끌어 자유롭게 다듬으세요.`)
  }, [])

  // 칸 수 변경(리샘플로 모양 유지)
  const changeN = useCallback((dir: -1 | 1) => {
    setState((s) => {
      const nn = clamp(s.points.length + dir * 2, 5, 24)
      if (nn === s.points.length) return s
      // beats index 는 비율 기준으로 재매핑
      const remapped = remapBeats(s.beats, s.points.length, nn)
      return { ...s, points: resample(s.points, nn), beats: remapped, template: '' }
    })
  }, [])

  const smooth = useCallback(() => {
    setState((s) => {
      const p = s.points
      const out = p.map((v, i) => {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)]
        return clamp(Math.round((a + 2 * v + b) / 4))
      })
      return { ...s, points: out, template: '' }
    })
  }, [])

  const reset = useCallback(() => {
    applyTemplate(state.template || lastTemplate.current)
  }, [applyTemplate, state.template])

  // 역설계 + 진단(메모)
  const suggestions = useMemo(() => reverseEngineer(state.points, state.title || 'curve'), [state.points, state.title])
  const dx = useMemo(() => diagnose(state.points), [state.points])

  // ── 라이브러리 스니펫에서 비트 흡수: 선택 칸에 스니펫 텍스트를 비트 메모로 넣기 ──
  const absorbSnippet = useCallback((sn: SharedSnippet) => {
    if (activeBeat == null) { setNote('먼저 곡선에서 칸 하나를 선택하세요.'); return }
    setState((s) => ({ ...s, beats: { ...s.beats, [activeBeat]: (sn.text || '').slice(0, 400) } }))
    setNote(`선택한 ${activeBeat + 1}칸에 스니펫을 비트로 넣었어요.`)
  }, [activeBeat])

  // 제안 비트를 그 칸의 메모로 채택
  const adoptSuggestion = useCallback((i: number, text: string) => {
    setState((s) => ({ ...s, beats: { ...s.beats, [i]: text } }))
  }, [])

  const setBeatText = useCallback((i: number, text: string) => {
    setState((s) => { const b = { ...s.beats }; if (text) b[i] = text; else delete b[i]; return { ...s, beats: b } })
  }, [])

  // ── 텍스트 빌드(복사/내보내기/수집함 공용) ───────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = []
    lines.push(`# 독자 감정 곡선 — ${state.title || '제목 미정'} (${state.scope})`)
    const tpl = TEMPLATES.find((t) => t.id === state.template)
    lines.push(`구조: ${tpl ? tpl.name : '자유 곡선'} · ${n}구간 · 평균 긴장 ${dx.avg} · 편차 ${dx.variance} · 정점 ${dx.peaks} · 저점 ${dx.valleys}`)
    lines.push('')
    suggestions.forEach((b) => {
      const memo = state.beats[b.i]
      lines.push(`## ${b.i + 1}/${n}  [${b.kindLabel}] 긴장 ${b.height}`)
      lines.push(`   제안: ${b.text}`)
      if (memo) lines.push(`   비트: ${memo}`)
    })
    lines.push('')
    lines.push('# 진단')
    dx.notes.forEach((d) => lines.push(`- (${d.label}) ${d.text}`))
    return lines.join('\n').trimEnd() + '\n'
  }, [state, n, dx, suggestions])

  const copyAll = useCallback(() => {
    const text = buildText()
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { if (mounted.current) setNote('클립보드 복사가 막혀 있어요.') })
  }, [buildText])

  // ── 라이브러리: 비트 묶음을 스니펫으로 저장 ──────────────────────────────────
  const saveAsSnippet = useCallback(() => {
    const text = buildText()
    addToLibrary('snippets', { text, source: 'reader-emotion-curve', tags: ['감정곡선', '비트시트', state.scope].filter(Boolean) })
    setNote('곡선 비트시트를 스니펫 라이브러리에 저장했어요. 다른 도구에서 불러 쓸 수 있어요.')
  }, [buildText, state.scope])

  // ── 수집함 ──────────────────────────────────────────────────────────────────
  const stash = useCallback(() => {
    if (!hasStash()) { setNote('수집함이 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'memo', label: `감정곡선: ${state.title || '제목 미정'}`, text: buildText() })
    setNote('수집함에 비트시트를 담았어요.')
  }, [buildText, state.title])

  // ── 프로젝트로 내보내기: 각 칸을 「비트」 폴더 문서로(또는 한 문서로 종합) ──────
  const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const exportToProject = useCallback(() => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    const tpl = TEMPLATES.find((t) => t.id === state.template)
    const rows = suggestions.map((b) => {
      const memo = state.beats[b.i]
      return `<p><strong>${b.i + 1}/${n} [${escapeHtml(b.kindLabel)}] 긴장 ${b.height}</strong><br/>` +
        `제안: ${escapeHtml(b.text)}` + (memo ? `<br/>비트: ${escapeHtml(memo)}` : '') + '</p>'
    }).join('')
    const diag = dx.notes.map((d) => `<li>(${escapeHtml(d.label)}) ${escapeHtml(d.text)}</li>`).join('')
    const bodyHtml =
      `<p><strong>구조</strong>: ${escapeHtml(tpl ? tpl.name : '자유 곡선')} · ${n}구간 · 평균 긴장 ${dx.avg} · 편차 ${dx.variance}</p><hr/>` +
      rows + `<hr/><p><strong>진단</strong></p><ul>${diag}</ul>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '비트',
      title: `감정곡선 — ${state.title || '제목 미정'}`,
      bodyHtml,
      synopsis: `${tpl ? tpl.name : '자유 곡선'} · 절정 ${Math.round((dx.climaxAt / (n - 1)) * 100)}% 지점`,
      meta: { 구조: tpl ? tpl.name : '자유', 구간수: String(n), 평균긴장: String(dx.avg), 편차: String(dx.variance) },
    })
    setNote(id ? '프로젝트 자료 「비트」 폴더에 비트시트 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [state, n, dx, suggestions])

  // ── 관련 도구 열기(비트 텍스트 동봉) ─────────────────────────────────────────
  const openInScenePlanner = useCallback(() => {
    openToolLinked('scene-list', { text: buildText(), title: state.title || '감정곡선 비트' })
    setNote('장면 플래너를 비트시트와 함께 열었어요.')
  }, [buildText, state.title])
  const openInPlotPyramid = useCallback(() => {
    openToolLinked('plot-pyramid', { text: buildText(), title: state.title || '감정곡선' })
  }, [buildText, state.title])

  // ── 바인더 문서 드롭 → 길이로 구간 매핑 + 제목 ───────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    dragDepth.current = 0; setDropHover(false)
    if (!it) return
    e.preventDefault()
    const t = it.text || ''
    setState((s) => {
      const next = { ...s }
      if (it.title && !s.title) next.title = it.title
      if (t) { const nn = clamp(Math.round(t.length / 1500), 5, 24); if (Math.abs(nn - s.points.length) >= 2) { next.beats = remapBeats(s.beats, s.points.length, nn); next.points = resample(s.points, nn) } }
      return next
    })
    setNote(`「${it.title}」을(를) 반영했어요(길이 기준 구간 추천).`)
  }, [])
  const onDragOver = useCallback((e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }, [])
  const onDragEnter = useCallback((e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current += 1; setDropHover(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropHover(false) }, [])

  // ── SVG path 구성 ────────────────────────────────────────────────────────────
  const linePath = useMemo(() => {
    return state.points.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(h).toFixed(1)}`).join(' ')
  }, [state.points, xOf, yOf])
  const areaPath = useMemo(() => {
    const top = state.points.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(h).toFixed(1)}`).join(' ')
    return `${top} L ${xOf(n - 1).toFixed(1)} ${(VH - PADY).toFixed(1)} L ${xOf(0).toFixed(1)} ${(VH - PADY).toFixed(1)} Z`
  }, [state.points, xOf, yOf, n])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const labelS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 600 }

  return (
    <div
      style={dropHover ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      {dropHover && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--panel)', border: '1px dashed var(--accent)', borderRadius: 10, padding: '10px 16px' }}>
            여기에 놓으면 글 길이에 맞춰 구간을 추천합니다
          </div>
        </div>
      )}

      {/* 상단: 제목/범위/템플릿 */}
      <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="field" style={{ flex: '2 1 160px', minWidth: 120 }}
            value={state.title} placeholder="작품/회차 제목"
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} maxLength={80}
          />
          <select className="field" style={{ flex: '1 1 110px' }} value={state.scope} onChange={(e) => setState((s) => ({ ...s, scope: e.target.value }))}>
            <option>작품 전체</option><option>한 권/시즌</option><option>한 화/챕터</option><option>한 장면</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={labelS}>구조 템플릿</span>
          {TEMPLATES.map((t) => (
            <button key={t.id} className="minibtn" title={t.note} onClick={() => applyTemplate(t.id)}
              style={{ padding: '3px 8px', fontSize: 11, borderColor: state.template === t.id ? 'var(--accent)' : 'var(--border)', background: state.template === t.id ? 'color-mix(in srgb, var(--accent) 16%, var(--paper))' : 'var(--paper)', fontWeight: state.template === t.id ? 700 : 400 }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 곡선 캔버스 */}
      <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
        <svg
          ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', touchAction: 'none', cursor: dragIdx.current != null ? 'grabbing' : 'default', userSelect: 'none' }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          role="img" aria-label="독자 감정 곡선 편집 영역"
        >
          {/* 배경 격자(긴장 25/50/75) */}
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={PADX} y1={yOf(g)} x2={VW - PADX} y2={yOf(g)} stroke="var(--border)" strokeWidth={g === 50 ? 1.4 : 0.8} strokeDasharray={g === 50 ? '0' : '4 6'} opacity={0.7} />
              <text x={6} y={yOf(g) + 4} fontSize={20} fill="var(--muted)">{g}</text>
            </g>
          ))}
          {/* 절정 표시 세로선 */}
          <line x1={xOf(dx.climaxAt)} y1={PADY} x2={xOf(dx.climaxAt)} y2={VH - PADY} stroke="var(--warn)" strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
          {/* 면 + 선 */}
          <path d={areaPath} fill="color-mix(in srgb, var(--accent) 14%, transparent)" stroke="none" />
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
          {/* 노드 */}
          {state.points.map((h, i) => {
            const sug = suggestions[i]
            return (
              <g key={i}>
                {/* 드래그 히트영역(크게) */}
                <circle cx={xOf(i)} cy={yOf(h)} r={20} fill="transparent" style={{ cursor: 'grab' }} onPointerDown={onPointerDownNode(i)} />
                <circle cx={xOf(i)} cy={yOf(h)} r={activeBeat === i ? 8 : 5.5}
                  fill={activeBeat === i ? 'var(--warn)' : 'var(--paper)'} stroke={KIND_COLOR[sug.kind]} strokeWidth={2.4} pointerEvents="none" />
                <text x={xOf(i)} y={VH - 4} fontSize={18} textAnchor="middle" fill={activeBeat === i ? 'var(--text)' : 'var(--muted)'} fontWeight={activeBeat === i ? 700 : 400}>{i + 1}</text>
              </g>
            )
          })}
        </svg>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
          <span style={labelS}>구간 {n}</span>
          <button className="minibtn" style={{ padding: '2px 8px' }} onClick={() => changeN(-1)} disabled={n <= 5} title="구간 줄이기">−</button>
          <button className="minibtn" style={{ padding: '2px 8px' }} onClick={() => changeN(1)} disabled={n >= 24} title="구간 늘리기">+</button>
          <button className="minibtn" style={{ padding: '2px 8px' }} onClick={smooth} title="곡선 매끄럽게">완만하게</button>
          <button className="minibtn" style={{ padding: '2px 8px' }} onClick={reset} title="현재 템플릿으로 되돌리기">초기화</button>
          <div style={{ flex: 1 }} />
          <span style={{ ...labelS, color: 'var(--muted)' }}>점을 위아래로 끌어 긴장 높낮이를 그리세요</span>
        </div>
      </div>

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '5px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span><button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">x</button>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 12px 0', flexShrink: 0 }}>
        <TabBtn on={tab === 'beats'} onClick={() => setTab('beats')}>비트 역설계</TabBtn>
        <TabBtn on={tab === 'diagnose'} onClick={() => setTab('diagnose')}>곡선 진단</TabBtn>
        <div style={{ flex: 1 }} />
        <span style={{ ...labelS, alignSelf: 'center' }}>평균 {dx.avg} · 편차 {dx.variance} · 정점 {dx.peaks}</span>
      </div>

      {/* 본문(스크롤) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 12px 12px' }}>
        {tab === 'beats' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((b) => {
              const open = activeBeat === b.i
              const memo = state.beats[b.i] || ''
              return (
                <div key={b.i} onClick={() => setActiveBeat(open ? null : b.i)}
                  style={{ background: 'var(--paper)', border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`, borderLeft: `3px solid ${KIND_COLOR[b.kind]}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', minWidth: 30 }}>{b.i + 1}/{n}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: KIND_COLOR[b.kind], border: `1px solid ${KIND_COLOR[b.kind]}`, borderRadius: 999, padding: '1px 8px' }}>{b.kindLabel}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>긴장 {b.height}</span>
                    {memo && <span style={{ fontSize: 11, color: 'var(--ok)' }}>· 비트 작성됨</span>}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--text)' }}>{b.text}</div>
                  {open && (
                    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      <textarea
                        className="field" style={{ width: '100%', minHeight: 54, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                        value={memo} placeholder="이 구간에 둘 실제 장면/비트를 적어 두세요"
                        onChange={(e) => setBeatText(b.i, e.target.value)} maxLength={400}
                      />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        <button className="minibtn" style={{ padding: '2px 8px' }} onClick={() => adoptSuggestion(b.i, b.text)} title="제안 문구를 비트로 채택">제안 채택</button>
                        {memo && <button className="minibtn" style={{ padding: '2px 8px', color: 'var(--warn)' }} onClick={() => setBeatText(b.i, '')}>비우기</button>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 스니펫 흡수 영역 */}
            {snippets.length > 0 && (
              <div style={{ marginTop: 4, border: '1px dashed var(--border)', borderRadius: 10, padding: 8 }}>
                <div style={{ ...labelS, marginBottom: 6 }}>스니펫에서 비트 가져오기{activeBeat == null ? ' (먼저 칸 선택)' : ` (${activeBeat + 1}칸으로)`}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                  {snippets.slice(0, 8).map((sn) => (
                    <button key={sn.id} className="minibtn" disabled={activeBeat == null} onClick={() => absorbSnippet(sn)}
                      style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11.5, lineHeight: 1.4, whiteSpace: 'normal' }}>
                      {(sn.text || '').slice(0, 60) || '(빈 스니펫)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { k: '평균 긴장', v: dx.avg }, { k: '기복(편차)', v: dx.variance },
                { k: '정점 수', v: dx.peaks }, { k: '저점 수', v: dx.valleys },
                { k: '절정 위치', v: `${Math.round((dx.climaxAt / (n - 1)) * 100)}%` },
              ].map((m) => (
                <div key={m.k} style={{ flex: '1 1 80px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{m.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.k}</div>
                </div>
              ))}
            </div>
            {dx.notes.map((d, i) => (
              <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${d.tone === 'warn' ? 'var(--warn)' : d.tone === 'ok' ? 'var(--ok)' : 'var(--accent)'}`, borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: d.tone === 'warn' ? 'var(--warn)' : d.tone === 'ok' ? 'var(--ok)' : 'var(--accent)' }}>{d.label}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 3 }}>{d.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 액션/연계 바 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="minibtn" onClick={copyAll} title="비트시트 전체 복사">{copied ? '복사됨' : '복사'}</button>
        <button className="linkbtn" onClick={saveAsSnippet} title="스니펫 라이브러리에 저장">스니펫 저장</button>
        <button className="linkbtn" onClick={stash} disabled={!hasStash()} title="수집함에 담기">수집함</button>
        <button className="linkbtn" onClick={exportToProject} disabled={!hasProjectBridge()} title="프로젝트 자료 「비트」 폴더로 내보내기">프로젝트에 추가</button>
        <button className="linkbtn" onClick={openInScenePlanner} title="장면 플래너 열기">장면 플래너로</button>
        <button className="linkbtn" onClick={openInPlotPyramid} title="플롯 피라미드 열기">플롯 피라미드로</button>
      </div>
    </div>
  )
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="minibtn" onClick={onClick}
      style={{ padding: '4px 12px', fontSize: 12, fontWeight: on ? 700 : 400, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'color-mix(in srgb, var(--accent) 14%, var(--paper))' : 'var(--paper)' }}>
      {children}
    </button>
  )
}
