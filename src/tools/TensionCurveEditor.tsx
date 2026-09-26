// 긴장 곡선 편집기 — 이야기 구간(장면/챕터)별 긴장도(0~10)를 점으로 찍고,
// SVG 위에서 점을 위아래로 드래그해 직접 조절한다. 부드러운 스플라인 곡선으로 흐름을 시각화하고,
// '이상적 곡선(상승-절정-하강)' 가이드를 오버레이로 겹쳐 보며 내 곡선과의 편차를 진단한다.
// 구간 추가/이름변경/삭제/순서이동 CRUD 완비. 여러 곡선을 슬롯에 저장(localStorage).
// 자급식: react / './linkbus' 외 import 없음. 전부 로컬. 외부 네트워크 없음.
// Web API: Pointer Events(드래그), localStorage(영속). 미지원 시 graceful(슬라이더로 대체 가능).
// 언마운트 시 전역 pointermove/up 리스너·rAF·타이머 정리.
import { useEffect, useRef, useState, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'tension-curve',
  name: '긴장 곡선 편집기',
  icon: '📉',
  group: '구상·정리',
  intro: '구간별 긴장도를 점으로 찍고 드래그로 조절해 곡선으로 보고, 이상적 곡선(상승-절정-하강)과 겹쳐 진단하세요',
  w: 760,
  h: 640,
}

const LS_KEY = 'sry:tool:tension-curve'
const MINV = 0
const MAXV = 10

// ── 타입 ───────────────────────────────────────────────────
interface Point { id: string; name: string; v: number } // v: 0~10
interface Curve { id: string; title: string; points: Point[] }
type IdealShape = 'classic' | 'rollercoaster' | 'slowburn' | 'frontload' | 'twopeak' | 'flat'
interface Settings {
  showIdeal: boolean
  idealShape: IdealShape
  climaxPos: number   // 0~1, 절정 위치(가로 비율)
  smooth: boolean     // 스플라인(부드럽게) vs 꺾은선
}
interface SaveShape { curves: Curve[]; activeId: string; settings: Settings }

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampV(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 5
  return Math.min(MAXV, Math.max(MINV, Math.round(v * 10) / 10))
}
function clamp01(n: number): number { return Math.min(1, Math.max(0, n)) }

function defaultPoints(): Point[] {
  return [
    { id: newId(), name: '도입', v: 2 },
    { id: newId(), name: '발단', v: 3.5 },
    { id: newId(), name: '전개', v: 5 },
    { id: newId(), name: '위기', v: 7 },
    { id: newId(), name: '절정', v: 9.5 },
    { id: newId(), name: '하강', v: 5 },
    { id: newId(), name: '결말', v: 2.5 },
  ]
}
function defaultCurve(): Curve {
  return { id: newId(), title: '새 곡선', points: defaultPoints() }
}
const defaultSettings = (): Settings => ({ showIdeal: true, idealShape: 'classic', climaxPos: 0.78, smooth: true })

function load(): SaveShape {
  const fallback = (): SaveShape => { const c = defaultCurve(); return { curves: [c], activeId: c.id, settings: defaultSettings() } }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback()
    const curves: Curve[] = Array.isArray(p.curves)
      ? p.curves
          .filter((c: any) => c && typeof c === 'object' && Array.isArray(c.points))
          .map((c: any) => ({
            id: String(c.id || newId()),
            title: typeof c.title === 'string' ? c.title : '곡선',
            points: c.points
              .filter((q: any) => q && typeof q === 'object')
              .map((q: any) => ({ id: String(q.id || newId()), name: String(q.name ?? ''), v: clampV(q.v) })),
          }))
      : []
    if (curves.length === 0) return fallback()
    const s = (p.settings && typeof p.settings === 'object') ? p.settings : {}
    const settings: Settings = {
      showIdeal: typeof s.showIdeal === 'boolean' ? s.showIdeal : true,
      idealShape: ['classic', 'rollercoaster', 'slowburn', 'frontload', 'twopeak', 'flat'].includes(s.idealShape) ? s.idealShape : 'classic',
      climaxPos: typeof s.climaxPos === 'number' ? clamp01(s.climaxPos) : 0.78,
      smooth: typeof s.smooth === 'boolean' ? s.smooth : true,
    }
    const activeId = curves.some((c) => c.id === p.activeId) ? String(p.activeId) : curves[0].id
    return { curves, activeId, settings }
  } catch { return fallback() }
}

// 긴장도 → 라벨/색
function vLabel(v: number): string {
  if (v >= 9) return '최고조'
  if (v >= 7) return '고조'
  if (v >= 5) return '긴장'
  if (v >= 3) return '잔잔'
  if (v >= 1) return '평온'
  return '정적'
}
function vColor(v: number): string {
  // 0(차분 파랑) → 10(절정 빨강) 보간
  const t = clamp01(v / 10)
  const cold = [91, 134, 224]   // 파랑
  const hot = [224, 83, 61]     // 빨강
  const mid = [224, 154, 43]    // 주황(중간)
  let rgb: number[]
  if (t < 0.5) { const k = t / 0.5; rgb = cold.map((c, i) => Math.round(c + (mid[i] - c) * k)) }
  else { const k = (t - 0.5) / 0.5; rgb = mid.map((c, i) => Math.round(c + (hot[i] - c) * k)) }
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}

// ── 이상적 곡선(0~1 → 0~1 긴장) ──────────────────────────────
// x: 진행도(0~1), cp: 절정 위치(0~1). 반환: 0~1 긴장.
function idealAt(shape: IdealShape, x: number, cp: number): number {
  const c = Math.min(0.95, Math.max(0.4, cp))
  switch (shape) {
    case 'classic': {
      // 완만한 상승 → 절정 → 빠른 하강
      const base = 0.12
      if (x <= c) {
        const k = x / c
        // ease-in 상승(뒤로 갈수록 가팔라짐)
        return base + (1 - base) * Math.pow(k, 1.6)
      }
      const k = (x - c) / (1 - c)
      return 1 - (1 - 0.18) * Math.pow(k, 0.8)
    }
    case 'rollercoaster': {
      // 여러 번의 작은 봉우리 + 마지막 대절정
      const waves = 0.18 * (0.5 + 0.5 * Math.sin(x * Math.PI * 5 - Math.PI / 2))
      const rise = x <= c ? 0.15 + 0.85 * Math.pow(x / c, 1.4) : 1 - 0.8 * Math.pow((x - c) / (1 - c), 0.9)
      return clamp01(rise * 0.82 + waves)
    }
    case 'slowburn': {
      // 오래 잔잔히 유지하다 후반에 급격히 치솟음
      if (x <= c) return 0.1 + 0.35 * Math.pow(x / c, 2.4)
      const k = (x - c) / (1 - c)
      // 절정 직전 급상승 후 짧은 하강
      const peakAt = 0.7
      if (k <= peakAt) return 0.45 + 0.55 * Math.pow(k / peakAt, 1.3)
      return 1 - 0.7 * Math.pow((k - peakAt) / (1 - peakAt), 1.0)
    }
    case 'frontload': {
      // 초반에 강한 훅 → 잔잔 → 다시 절정
      const hook = 0.55 * Math.exp(-Math.pow((x - 0.08) / 0.1, 2))
      const main = x <= c ? 0.15 + 0.85 * Math.pow(x / c, 1.7) : 1 - 0.8 * Math.pow((x - c) / (1 - c), 0.9)
      return clamp01(Math.max(hook, main * 0.95))
    }
    case 'twopeak': {
      // 중간 절정(미드포인트) + 후반 대절정
      const p1 = 0.7 * Math.exp(-Math.pow((x - 0.45) / 0.12, 2))
      const p2 = 1.0 * Math.exp(-Math.pow((x - c) / 0.13, 2))
      const floor = 0.12 + 0.1 * x
      return clamp01(Math.max(floor, p1, p2))
    }
    case 'flat':
    default:
      return 0.5
  }
}
const SHAPE_LABEL: Record<IdealShape, string> = {
  classic: '고전형 (완만한 상승→절정→급하강)',
  rollercoaster: '롤러코스터형 (잦은 굴곡+대절정)',
  slowburn: '슬로우번형 (오래 잔잔→후반 폭발)',
  frontload: '훅형 (초반 강타→재상승 절정)',
  twopeak: '이중 절정형 (중간 미드포인트+후반)',
  flat: '평탄형 (참고용 기준선)',
}

// ── Catmull-Rom → 부드러운 path ─────────────────────────────
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}
function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export default function TensionCurveEditor({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [curves, setCurves] = useState<Curve[]>(init.current.curves)
  const [activeId, setActiveId] = useState<string>(init.current.activeId)
  const [settings, setSettings] = useState<Settings>(init.current.settings)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [rowDragOver, setRowDragOver] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const rowDragId = useRef<string | null>(null)
  const mounted = useRef(true)
  const dragInfo = useRef<{ id: string } | null>(null)
  const rafId = useRef<number | null>(null)
  const pendingV = useRef<number | null>(null)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const active = curves.find((c) => c.id === activeId) || curves[0]
  const points = active ? active.points : []

  // ── 페이로드(연계로 열렸을 때) ─────────────────────────────
  useEffect(() => {
    if (!payload) return
    // 비트/사건 배열을 받아 새 곡선으로 시드 (예: 플롯 피라미드 → 긴장 곡선)
    const seed = (payload.beats || payload.points) as unknown
    if (Array.isArray(seed) && seed.length) {
      const pts: Point[] = seed
        .map((b: any) => {
          if (b && typeof b === 'object') {
            const name = String(b.name ?? b.text ?? b.label ?? '')
            const v = clampV(b.v ?? b.tension ?? b.value ?? 5)
            return { id: newId(), name: name.slice(0, 40), v }
          }
          return null
        })
        .filter(Boolean) as Point[]
      if (pts.length) {
        const c: Curve = { id: newId(), title: typeof payload.title === 'string' ? String(payload.title) : '연계 곡선', points: pts }
        setCurves((prev) => [c, ...prev])
        setActiveId(c.id)
        flash('연계 데이터로 새 긴장 곡선을 만들었어요.')
      }
    } else if (typeof payload.title === 'string' && payload.title.trim()) {
      // 제목만 전달된 경우: 활성 곡선 제목에 반영
      const t = String(payload.title).trim()
      setCurves((prev) => prev.map((c) => (c.id === activeId ? { ...c, title: t } : c)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 영속 저장 ──────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ curves, activeId, settings } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [curves, activeId, settings])

  const flash = useCallback((m: string) => {
    if (!mounted.current) return
    setToast(m)
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  // ── SVG 좌표계 ─────────────────────────────────────────────
  const VBW = 700, VBH = 320
  const PADL = 38, PADR = 16, PADT = 18, PADB = 40
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const xAt = (i: number, n: number) => n <= 1 ? PADL + plotW / 2 : PADL + (i / (n - 1)) * plotW
  const yAtV = (v: number) => PADT + (1 - v / MAXV) * plotH
  const vAtY = (y: number) => clampV(((PADT + plotH - y) / plotH) * MAXV)
  const progAt = (i: number, n: number) => n <= 1 ? 0.5 : i / (n - 1)

  const n = points.length
  const svgPts = points.map((p, i) => ({ x: xAt(i, n), y: yAtV(p.v), p }))
  const myPath = settings.smooth ? smoothPath(svgPts) : linePath(svgPts)
  const myArea = svgPts.length
    ? `${(settings.smooth ? smoothPath(svgPts) : linePath(svgPts))} L${svgPts[svgPts.length - 1].x.toFixed(2)},${(PADT + plotH).toFixed(2)} L${svgPts[0].x.toFixed(2)},${(PADT + plotH).toFixed(2)} Z`
    : ''

  // 이상적 곡선 — 점 개수(또는 최소 24)로 샘플링
  const idealSamples = Math.max(n, 24)
  const idealPts = Array.from({ length: idealSamples }, (_, i) => {
    const t = idealSamples <= 1 ? 0.5 : i / (idealSamples - 1)
    const v = idealAt(settings.idealShape, t, settings.climaxPos) * MAXV
    return { x: PADL + t * plotW, y: yAtV(v) }
  })
  const idealPath = smoothPath(idealPts)

  // ── 편차 진단: 각 점의 이상값과 비교 ────────────────────────
  let avgDev = 0, maxDev = 0, myPeakIdx = -1, myPeakV = -1
  if (n > 0) {
    let sum = 0
    points.forEach((p, i) => {
      if (p.v > myPeakV) { myPeakV = p.v; myPeakIdx = i }
      const t = progAt(i, n)
      const iv = idealAt(settings.idealShape, t, settings.climaxPos) * MAXV
      const d = Math.abs(p.v - iv)
      sum += d
      if (d > maxDev) maxDev = d
    })
    avgDev = sum / n
  }
  const myPeakProg = myPeakIdx >= 0 ? progAt(myPeakIdx, n) : 0
  const vals = points.map((p) => p.v)
  const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0
  const deltas: number[] = []
  for (let i = 1; i < vals.length; i++) deltas.push(Math.abs(vals[i] - vals[i - 1]))
  const avgSwing = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0

  // 진단 메시지
  const diags: { msg: string; tone: 'ok' | 'warn' | 'muted' }[] = []
  if (n < 3) {
    diags.push({ msg: '구간을 3개 이상 만들면 곡선 흐름을 진단합니다.', tone: 'muted' })
  } else {
    if (range <= 2 && avgSwing < 1) diags.push({ msg: '곡선이 거의 평탄합니다. 절정과 골(저점)의 낙차를 키워 굴곡을 만드세요.', tone: 'warn' })
    if (settings.idealShape !== 'flat') {
      if (avgDev <= 1.2) diags.push({ msg: `이상적 ${SHAPE_LABEL[settings.idealShape].split(' ')[0]} 곡선과 매우 가깝습니다. 안정적인 구조예요.`, tone: 'ok' })
      else if (avgDev <= 2.6) diags.push({ msg: '이상적 곡선과 어느 정도 닮았으나 일부 구간이 어긋납니다. 점선과 차이가 큰 점을 손보세요.', tone: 'muted' })
      else diags.push({ msg: `이상적 곡선과 편차가 큽니다(평균 ${avgDev.toFixed(1)}). 구조를 의도한 것이 아니라면 흐름을 재배치해 보세요.`, tone: 'warn' })
    }
    // 절정 위치 점검
    if (settings.idealShape === 'classic' || settings.idealShape === 'slowburn') {
      if (myPeakProg < 0.45) diags.push({ msg: '절정(최고점)이 너무 앞쪽에 있습니다. 후반에 더 강한 봉우리를 두면 긴장이 살아납니다.', tone: 'warn' })
      else if (myPeakProg > 0.95 && n > 3) diags.push({ msg: '절정이 거의 끝에 붙어 있습니다. 하강·여운 구간을 조금 두면 마무리가 안정됩니다.', tone: 'muted' })
    }
    // 마지막이 최고점이면 결말 여운 부족
    if (n >= 4 && myPeakIdx === n - 1) diags.push({ msg: '마지막 구간이 최고조입니다. 결말의 여운(하강)이 없으면 급하게 끝난 느낌을 줄 수 있어요.', tone: 'muted' })
    if (diags.length === 0) diags.push({ msg: '곡선에 적절한 굴곡과 흐름이 있습니다.', tone: 'ok' })
  }

  // ── 드래그(Pointer): 점을 위아래로 끌어 긴장도 조절 ──────────
  const applyV = (id: string, v: number) => {
    setCurves((prev) => prev.map((c) => c.id === activeId ? { ...c, points: c.points.map((p) => p.id === id ? { ...p, v } : p) } : c))
  }
  const onPointPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    dragInfo.current = { id }
    setDragId(id)
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* noop */ }
  }
  // 전역 pointermove/up — 캡처가 없는 환경에서도 부드럽게 동작. 언마운트/종료 시 정리.
  useEffect(() => {
    if (!dragId) return
    const flush = () => {
      rafId.current = null
      if (pendingV.current != null && dragInfo.current) {
        applyV(dragInfo.current.id, pendingV.current)
        pendingV.current = null
      }
    }
    const toV = (clientY: number): number | null => {
      const svg = svgRef.current
      if (!svg) return null
      const r = svg.getBoundingClientRect()
      if (r.height === 0) return null
      const y = ((clientY - r.top) / r.height) * VBH
      return vAtY(y)
    }
    const onMove = (ev: PointerEvent) => {
      if (!dragInfo.current) return
      const v = toV(ev.clientY)
      if (v == null) return
      pendingV.current = v
      if (rafId.current == null) rafId.current = window.requestAnimationFrame(flush)
    }
    const onUp = () => {
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null }
      if (pendingV.current != null && dragInfo.current) { applyV(dragInfo.current.id, pendingV.current); pendingV.current = null }
      dragInfo.current = null
      if (mounted.current) setDragId(null)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, activeId])

  // 빈 영역 클릭 → 그 위치(가장 가까운 구간 사이)에 새 구간 삽입
  const onSvgClick = (e: React.MouseEvent) => {
    if (dragId) return
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    if (r.width === 0) return
    const x = ((e.clientX - r.left) / r.width) * VBW
    const y = ((e.clientY - r.top) / r.height) * VBH
    if (x < PADL - 4 || x > PADL + plotW + 4) return
    if (y < PADT - 4 || y > PADT + plotH + 4) return
    const v = vAtY(y)
    // 삽입 위치: x 기준으로 몇 번째 구간 사이인지
    let insertAt = n
    for (let i = 0; i < n; i++) { if (x < xAt(i, n)) { insertAt = i; break } }
    insertPoint(insertAt, v)
  }

  // ── CRUD ─────────────────────────────────────────────────
  const insertPoint = (idx: number, v: number) => {
    setCurves((prev) => prev.map((c) => {
      if (c.id !== activeId) return c
      const np = c.points.slice()
      const name = `구간 ${np.length + 1}`
      np.splice(Math.max(0, Math.min(np.length, idx)), 0, { id: newId(), name, v: clampV(v) })
      return { ...c, points: np }
    }))
  }
  const addPoint = () => {
    setCurves((prev) => prev.map((c) => {
      if (c.id !== activeId) return c
      const last = c.points[c.points.length - 1]
      return { ...c, points: [...c.points, { id: newId(), name: `구간 ${c.points.length + 1}`, v: last ? last.v : 5 }] }
    }))
  }
  const removePoint = (id: string) => {
    setCurves((prev) => prev.map((c) => c.id === activeId ? { ...c, points: c.points.filter((p) => p.id !== id) } : c))
    if (editingId === id) setEditingId(null)
  }
  const startEdit = (p: Point) => { setEditingId(p.id); setEditName(p.name) }
  const commitEdit = () => {
    if (!editingId) return
    const nm = editName.trim()
    setCurves((prev) => prev.map((c) => c.id === activeId ? { ...c, points: c.points.map((p) => p.id === editingId ? { ...p, name: nm || p.name } : p) } : c))
    setEditingId(null); setEditName('')
  }
  const cancelEdit = () => { setEditingId(null); setEditName('') }
  const movePoint = (id: string, dir: -1 | 1) => {
    setCurves((prev) => prev.map((c) => {
      if (c.id !== activeId) return c
      const arr = c.points
      const i = arr.findIndex((p) => p.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return c
      const next = arr.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...c, points: next }
    }))
  }
  const onRowDrop = (targetId: string) => {
    const from = rowDragId.current
    rowDragId.current = null
    setRowDragOver(null)
    if (!from || from === targetId) return
    setCurves((prev) => prev.map((c) => {
      if (c.id !== activeId) return c
      const arr = c.points.slice()
      const fi = arr.findIndex((p) => p.id === from)
      const ti = arr.findIndex((p) => p.id === targetId)
      if (fi < 0 || ti < 0) return c
      const [moved] = arr.splice(fi, 1)
      arr.splice(ti, 0, moved)
      return { ...c, points: arr }
    }))
  }
  const resetActive = () => {
    setCurves((prev) => prev.map((c) => c.id === activeId ? { ...c, points: defaultPoints() } : c))
    setEditingId(null)
  }

  // ── 곡선 슬롯 관리 ─────────────────────────────────────────
  const addCurve = () => {
    const c = defaultCurve()
    c.title = `곡선 ${curves.length + 1}`
    setCurves((prev) => [...prev, c])
    setActiveId(c.id)
  }
  const dupCurve = () => {
    if (!active) return
    const c: Curve = { id: newId(), title: active.title + ' (복제)', points: active.points.map((p) => ({ ...p, id: newId() })) }
    setCurves((prev) => [...prev, c])
    setActiveId(c.id)
  }
  const delCurve = () => {
    if (curves.length <= 1) { flash('마지막 곡선은 삭제할 수 없어요.'); return }
    setCurves((prev) => {
      const next = prev.filter((c) => c.id !== activeId)
      if (!next.some((c) => c.id === activeId)) setActiveId(next[0].id)
      return next
    })
  }
  const commitTitle = () => {
    const t = titleDraft.trim()
    setCurves((prev) => prev.map((c) => c.id === activeId ? { ...c, title: t || c.title } : c))
    setEditTitle(false)
  }

  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // ── 텍스트/HTML 내보내기 ───────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`[긴장 곡선] ${active ? active.title : ''}`)
    lines.push('')
    points.forEach((p, i) => {
      const bar = '█'.repeat(Math.round(p.v)) + '·'.repeat(MAXV - Math.round(p.v))
      lines.push(`${String(i + 1).padStart(2, ' ')}. ${(p.name || '구간').padEnd(8, ' ')} ${bar} ${p.v.toFixed(1)} (${vLabel(p.v)})`)
    })
    lines.push('')
    lines.push(`기준 곡선: ${SHAPE_LABEL[settings.idealShape]} · 절정 위치 ${Math.round(settings.climaxPos * 100)}%`)
    if (n >= 3 && settings.idealShape !== 'flat') lines.push(`이상 곡선 대비 평균 편차 ${avgDev.toFixed(1)} / 최대 ${maxDev.toFixed(1)}`)
    lines.push(`진폭 ${range.toFixed(1)} · 평균 변화량 ${avgSwing.toFixed(1)}`)
    diags.forEach((d) => lines.push(`진단: ${d.msg}`))
    return lines.join('\n')
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>긴장 곡선</strong>${active && active.title ? ' · ' + esc(active.title) : ''} · 구간 ${n}개</p>`)
    parts.push('<table border="1" cellpadding="4" style="border-collapse:collapse"><thead><tr><th>#</th><th>구간</th><th>긴장도</th><th>강도</th></tr></thead><tbody>')
    points.forEach((p, i) => {
      parts.push(`<tr><td>${i + 1}</td><td>${esc(p.name || '구간')}</td><td>${p.v.toFixed(1)} / 10</td><td>${esc(vLabel(p.v))}</td></tr>`)
    })
    parts.push('</tbody></table>')
    parts.push(`<p>기준 곡선: ${esc(SHAPE_LABEL[settings.idealShape])} · 절정 위치 ${Math.round(settings.climaxPos * 100)}%</p>`)
    if (n >= 3 && settings.idealShape !== 'flat') parts.push(`<p>이상 곡선 대비 평균 편차 ${avgDev.toFixed(1)} · 최대 ${maxDev.toFixed(1)} · 진폭 ${range.toFixed(1)}</p>`)
    diags.forEach((d) => parts.push(`<p>진단: ${esc(d.msg)}</p>`))
    return parts.join('')
  }
  const copy = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (mounted.current) setCopied(true)
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }
  const toProject = () => {
    if (!hasProjectBridge() || n === 0) return
    const meta: Record<string, string> = { 구간수: String(n), 기준곡선: SHAPE_LABEL[settings.idealShape].split(' ')[0], 진폭: range.toFixed(1) }
    if (n >= 3 && settings.idealShape !== 'flat') meta['평균편차'] = avgDev.toFixed(1)
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: active && active.title.trim() ? `긴장 곡선 — ${active.title.trim()}` : '긴장 곡선',
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) flash('✓ 프로젝트 자료(구조)에 긴장 곡선 문서를 추가했어요.')
    else setNote('프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: active && active.title ? `긴장 곡선 — ${active.title}` : '긴장 곡선', text: buildText() })
    flash('🧺 수집함에 담았어요.')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '24px 8px' }
  const selStyle: React.CSSProperties = { padding: '6px 8px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const toneColor = (t: 'ok' | 'warn' | 'muted') => t === 'ok' ? 'var(--ok)' : t === 'warn' ? 'var(--warn)' : 'var(--muted)'

  return (
    <div style={wrap}>
      {/* 헤더: 곡선 슬롯 선택 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="📉"/></span>
        <select
          style={{ ...selStyle, maxWidth: 200, fontWeight: 600 }}
          value={activeId}
          onChange={(e) => { setActiveId(e.target.value); setEditingId(null) }}
          aria-label="곡선 선택"
        >
          {curves.map((c) => <option key={c.id} value={c.id}>{c.title || '곡선'} ({c.points.length})</option>)}
        </select>
        <button className="minibtn" onClick={addCurve} title="새 곡선 추가">＋ 새 곡선</button>
        <button className="minibtn" onClick={dupCurve} title="현재 곡선 복제">⧉ 복제</button>
        <button className="minibtn" onClick={delCurve} title="현재 곡선 삭제" style={{ color: curves.length > 1 ? 'var(--warn)' : 'var(--muted)' }} disabled={curves.length <= 1}><Emoji e="🗑️"/></button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={copy} title="텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>{emojify(toast)}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{emojify(note)}</div>}

      <div style={body}>
        {/* 제목 편집 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTitle() } if (e.key === 'Escape') { e.preventDefault(); setEditTitle(false) } }}
              maxLength={60}
              aria-label="곡선 제목"
              style={{ flex: 1, padding: '7px 10px', fontSize: 15, fontWeight: 700, borderRadius: 9, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          ) : (
            <h2 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => { setTitleDraft(active ? active.title : ''); setEditTitle(true) }}
              title="클릭해서 곡선 제목 수정"
            >{active && active.title ? active.title : '제목 없는 곡선'}</h2>
          )}
        </div>

        {/* ── 곡선 캔버스 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>긴장 곡선 · 점을 위아래로 드래그해 긴장도를 조절하세요</span>
            <span style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.smooth} onChange={(e) => setSettings((s) => ({ ...s, smooth: e.target.checked }))} />
              부드럽게
            </label>
          </div>
          {n === 0 ? (
            <div style={empty}>구간이 없어요. <b>＋ 구간 추가</b>를 누르거나 그래프 안을 클릭해 점을 찍어 보세요.</div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VBW} ${VBH}`}
              width="100%"
              style={{ display: 'block', maxHeight: 340, touchAction: 'none', cursor: dragId ? 'ns-resize' : 'crosshair', userSelect: 'none' }}
              role="img"
              aria-label="긴장 곡선 그래프"
              onClick={onSvgClick}
            >
              {/* 가로 격자 + Y 라벨 */}
              {[0, 2, 4, 6, 8, 10].map((v) => {
                const y = yAtV(v)
                const major = v === 0 || v === 10
                return (
                  <g key={v}>
                    <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={major ? 1.4 : 1} strokeDasharray={major ? undefined : '2 4'} opacity={major ? 0.85 : 0.4} />
                    <text x={PADL - 6} y={y + 3.5} textAnchor="end" fontSize={9.5} fill="var(--muted)">{v}</text>
                  </g>
                )
              })}
              {/* 이상적 곡선 오버레이 */}
              {settings.showIdeal && settings.idealShape !== 'flat' && (
                <>
                  <path d={`${idealPath} L${idealPts[idealPts.length - 1].x.toFixed(2)},${(PADT + plotH).toFixed(2)} L${idealPts[0].x.toFixed(2)},${(PADT + plotH).toFixed(2)} Z`} fill="var(--accent-2)" opacity={0.06} />
                  <path d={idealPath} fill="none" stroke="var(--accent-2)" strokeWidth={2} strokeDasharray="6 5" opacity={0.7} strokeLinecap="round" />
                  <text x={VBW - PADR} y={PADT + 10} textAnchor="end" fontSize={9.5} fill="var(--accent-2)" opacity={0.85}>이상적 곡선(가이드)</text>
                </>
              )}
              {settings.showIdeal && settings.idealShape === 'flat' && (
                <line x1={PADL} y1={yAtV(5)} x2={VBW - PADR} y2={yAtV(5)} stroke="var(--accent-2)" strokeWidth={1.6} strokeDasharray="6 5" opacity={0.6} />
              )}
              {/* 내 곡선: 영역 + 선 */}
              {myArea && <path d={myArea} fill="var(--accent)" opacity={0.12} />}
              <path d={myPath} fill="none" stroke="var(--accent)" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
              {/* 점 + 드래그 핸들 + 라벨 */}
              {svgPts.map((sp, i) => {
                const isDrag = dragId === sp.p.id
                const isHover = hoverId === sp.p.id
                const r = isDrag ? 8 : isHover ? 7 : 5.5
                const label = sp.p.name || `${i + 1}`
                const shortLabel = label.length > 6 ? label.slice(0, 6) + '…' : label
                return (
                  <g key={sp.p.id}>
                    {/* 세로 가이드(드래그 시) */}
                    {isDrag && <line x1={sp.x} y1={PADT} x2={sp.x} y2={PADT + plotH} stroke={vColor(sp.p.v)} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />}
                    {/* 넓은 히트영역(터치 친화) */}
                    <circle cx={sp.x} cy={sp.y} r={16} fill="transparent" style={{ cursor: 'ns-resize' }}
                      onPointerDown={(e) => onPointPointerDown(e, sp.p.id)}
                      onPointerEnter={() => setHoverId(sp.p.id)}
                      onPointerLeave={() => setHoverId((h) => h === sp.p.id ? null : h)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <title>{`${label}: ${sp.p.v.toFixed(1)}/10 (${vLabel(sp.p.v)}) — 드래그로 조절`}</title>
                    </circle>
                    <circle cx={sp.x} cy={sp.y} r={r} fill={vColor(sp.p.v)} stroke="var(--paper)" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                    {/* 드래그/호버 시 값 말풍선 */}
                    {(isDrag || isHover) && (
                      <text x={sp.x} y={sp.y - 12} textAnchor="middle" fontSize={11} fontWeight={800} fill={vColor(sp.p.v)} style={{ pointerEvents: 'none' }}>{sp.p.v.toFixed(1)}</text>
                    )}
                    {/* X축 구간 이름 */}
                    <text x={sp.x} y={PADT + plotH + 16} textAnchor="middle" fontSize={9} fill={isHover || isDrag ? 'var(--text)' : 'var(--muted)'} style={{ pointerEvents: 'none' }}>{shortLabel}</text>
                  </g>
                )
              })}
            </svg>
          )}
          <div style={{ ...hint, marginTop: 4 }}>점을 위아래로 끌어 긴장도를 정하고, 그래프 빈 곳을 클릭하면 그 위치에 새 구간이 생깁니다. 점선은 이상적 곡선입니다.</div>
        </div>

        {/* ── 이상적 곡선 가이드 설정 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>이상적 곡선 가이드</span>
            <span style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.showIdeal} onChange={(e) => setSettings((s) => ({ ...s, showIdeal: e.target.checked }))} />
              겹쳐 보기
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              style={{ ...selStyle, flex: 1, minWidth: 200 }}
              value={settings.idealShape}
              onChange={(e) => setSettings((s) => ({ ...s, idealShape: e.target.value as IdealShape }))}
              aria-label="이상적 곡선 형태"
            >
              {(Object.keys(SHAPE_LABEL) as IdealShape[]).map((k) => <option key={k} value={k}>{SHAPE_LABEL[k]}</option>)}
            </select>
          </div>
          {settings.idealShape !== 'flat' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>절정 위치</span>
              <input
                type="range" min={40} max={95} value={Math.round(settings.climaxPos * 100)}
                onChange={(e) => setSettings((s) => ({ ...s, climaxPos: clamp01(Number(e.target.value) / 100) }))}
                style={{ flex: 1, accentColor: 'var(--accent-2)' }}
                aria-label="이상적 곡선 절정 위치"
              />
              <strong style={{ fontSize: 12.5, width: 42, textAlign: 'right', color: 'var(--accent-2)' }}>{Math.round(settings.climaxPos * 100)}%</strong>
            </div>
          )}
          {/* 진단 */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {diags.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: toneColor(d.tone), display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ flexShrink: 0 }}>{d.tone === 'ok' ? '✓' : d.tone === 'warn' ? '⚠' : '•'}</span>
                <span>{d.msg}</span>
              </div>
            ))}
          </div>
          {n >= 2 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              <span>진폭 <strong style={{ color: 'var(--text)' }}>{range.toFixed(1)}</strong></span>
              <span>평균 변화량 <strong style={{ color: 'var(--text)' }}>{avgSwing.toFixed(1)}</strong></span>
              {n >= 3 && settings.idealShape !== 'flat' && <span>이상 곡선 편차 <strong style={{ color: avgDev > 2.6 ? 'var(--warn)' : 'var(--text)' }}>{avgDev.toFixed(1)}</strong></span>}
              <span>최고점 <strong style={{ color: vColor(myPeakV) }}>{myPeakV >= 0 ? myPeakV.toFixed(1) : '-'}</strong> ({myPeakIdx >= 0 ? (points[myPeakIdx].name || `${myPeakIdx + 1}`) : '-'})</span>
            </div>
          )}
        </div>

        {/* ── 구간 목록(CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>구간</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{n}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetActive} title="기본 7구간으로 초기화">초기화</button>
            <button className="btn-primary" onClick={addPoint}>＋ 구간 추가</button>
          </div>
          {n === 0 ? (
            <div style={empty}>아직 구간이 없어요. <b>＋ 구간 추가</b>로 장면·챕터를 만들고 긴장도를 정해 보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {points.map((p, i) => {
                const isEd = editingId === p.id
                return (
                  <div
                    key={p.id}
                    draggable={!isEd}
                    onDragStart={() => { if (!isEd) rowDragId.current = p.id }}
                    onDragOver={(e) => { e.preventDefault(); if (rowDragOver !== p.id) setRowDragOver(p.id) }}
                    onDragLeave={() => { if (rowDragOver === p.id) setRowDragOver(null) }}
                    onDrop={() => onRowDrop(p.id)}
                    onDragEnd={() => { rowDragId.current = null; setRowDragOver(null) }}
                    onPointerEnter={() => setHoverId(p.id)}
                    onPointerLeave={() => setHoverId((h) => h === p.id ? null : h)}
                    style={{
                      background: hoverId === p.id ? 'var(--chrome-2)' : 'var(--paper)', borderRadius: 10, padding: '8px 10px',
                      border: '1px solid var(--border)',
                      outline: rowDragOver === p.id ? '2px dashed var(--accent)' : 'none',
                      transition: 'background .12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--muted)', width: 16, textAlign: 'right' }}>{i + 1}</span>
                      {isEd ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={commitEdit}
                          autoFocus
                          maxLength={40}
                          aria-label="구간 이름 수정"
                          style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                          onClick={() => startEdit(p)}
                          title="클릭해서 이름 수정"
                        >{p.name || `구간 ${i + 1}`}</span>
                      )}
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>{vLabel(p.v)}</span>
                      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, width: 34, textAlign: 'right', color: vColor(p.v) }}>{p.v.toFixed(1)}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => movePoint(p.id, -1)} disabled={i === 0} title="앞으로" aria-label="앞으로 이동">◀</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => movePoint(p.id, 1)} disabled={i === n - 1} title="뒤로" aria-label="뒤로 이동">▶</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => startEdit(p)} title="이름 수정" aria-label="이름 수정"><Emoji e="✏️"/></button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removePoint(p.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 12 }}>0</span>
                      <input
                        type="range" min={0} max={10} step={0.1} value={p.v}
                        onChange={(e) => applyV(p.id, clampV(e.target.value))}
                        style={{ flex: 1, accentColor: vColor(p.v) }}
                        aria-label={`${p.name || `구간 ${i + 1}`} 긴장도`}
                      />
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 14, textAlign: 'right' }}>10</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 연계 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!hasProjectBridge() || n === 0}
            title={hasProjectBridge() ? (n === 0 ? '추가할 구간이 없습니다' : '자료 › 구조 폴더에 긴장 곡선 문서로 추가') : '프로젝트에 연결되지 않았습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
          {hasStash() && (
            <button className="linkbtn" onClick={toStash} disabled={n === 0} title="긴장 곡선 요약을 수집함에 담기"><Emoji e="🧺"/> 수집함에 담기</button>
          )}
        </div>

        <div style={hint}>구간 이름을 클릭하거나 <Emoji e="✏️"/>로 바꾸고, 슬라이더 또는 그래프 점 드래그로 긴장도(0~10)를 정하세요. ⠿ 드래그·◀▶로 순서를 바꿀 수 있어요. 여러 곡선을 슬롯으로 저장하며, 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
