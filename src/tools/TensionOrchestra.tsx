// 긴장 오케스트라 — 복수 플롯라인(메인/서브/로맨스/미스터리 등)을 악기 트랙처럼 겹쳐
// 각 트랙의 긴장도(0~10)를 마디(장면 구간)별로 배치하고, 모든 트랙을 합산한 "합주 곡선"을
// 함께 시각화한다. 같은 마디에 절정이 몰리는 동시 절정(과부하) 구간과, 모든 트랙이 잠잠한
// 긴장 공백 구간을 자동 경고한다. 트랙/마디 CRUD, 합주 가중치, 정규화 보기, 스니펫/프로젝트 연동.
// 자급식: react / './linkbus' 외 import 없음. 전부 로컬 결정론적 계산. 외부 네트워크 없음.
// Web API: Pointer Events(셀 드래그 입력), localStorage(영속), Clipboard. 언마운트 시 리스너/rAF 정리.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, addToStash, hasStash,
  openToolLinked, useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
} from './linkbus'

export const meta = {
  id: 'tension-orchestra',
  name: '긴장 오케스트라',
  icon: '🎻',
  group: '플롯',
  intro: '복수 플롯라인의 긴장도를 악기 트랙처럼 겹쳐 합주 곡선으로 시각화하고, 동시 절정과 공백 구간을 경고합니다',
  w: 520,
  h: 640,
}

const LS_KEY = 'sry:tool:tension-orchestra'
const MAXV = 10
const MINBARS = 4
const MAXBARS = 40

// ── 타입 ───────────────────────────────────────────────────
interface Track {
  id: string
  name: string
  color: string      // 트랙 고유 색(팔레트 인덱스에서 부여)
  weight: number     // 합주 가중치 0.2~2
  values: number[]   // 마디별 긴장도 0~10, 길이 = bars
  muted: boolean     // 합주에서 제외(독주 점검용)
}
interface SaveShape {
  bars: number
  barNames: string[]
  tracks: Track[]
  normalize: boolean   // 합주 곡선 정규화(최대=10) 보기
  showEnsemble: boolean
}

// 악기 결 팔레트(트랙 색)
const PALETTE = ['#e0533d', '#3f8de0', '#46b06f', '#c277e0', '#e0a32b', '#2bb3c7', '#e06aa0', '#8a8f2b']

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampV(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(MAXV, Math.max(0, Math.round(v * 10) / 10))
}
function clampW(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.min(2, Math.max(0.2, Math.round(v * 100) / 100))
}
function clampBars(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 8
  return Math.min(MAXBARS, Math.max(MINBARS, v))
}
// 문자열 → 결정론 해시(시드)
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

const DEFAULT_TRACK_NAMES = ['메인 플롯', '로맨스 라인', '미스터리 라인']
// 결정론적 시드 곡선(트랙 이름 해시 + 인덱스 패턴) — 빈 입력일 때 데모 윤곽
function seedValues(name: string, bars: number, kind: number): number[] {
  const seed = hash(name + ':' + kind)
  const phase = (seed % 100) / 100
  const out: number[] = []
  for (let i = 0; i < bars; i++) {
    const t = bars <= 1 ? 0.5 : i / (bars - 1)
    // 기본 상승-절정-하강 + 트랙별 위상차로 절정 시점을 분산
    const peak = 0.55 + 0.35 * phase
    let v: number
    if (t <= peak) v = 1.5 + 8 * Math.pow(t / peak, 1.5)
    else v = 9.5 - 7 * Math.pow((t - peak) / (1 - peak), 0.9)
    // 잔물결
    v += 0.8 * Math.sin(t * Math.PI * (2 + (seed % 3)) + phase * 6)
    out.push(clampV(v))
  }
  return out
}
function makeTrack(name: string, idx: number, bars: number): Track {
  return {
    id: newId(),
    name,
    color: PALETTE[idx % PALETTE.length],
    weight: 1,
    values: seedValues(name, bars, idx),
    muted: false,
  }
}
function flatValues(bars: number, v = 0): number[] { return Array.from({ length: bars }, () => v) }
function resize(arr: number[], bars: number): number[] {
  if (arr.length === bars) return arr.map(clampV)
  const out: number[] = []
  for (let i = 0; i < bars; i++) out.push(clampV(arr[i] != null ? arr[i] : 0))
  return out
}

function defaultState(): SaveShape {
  const bars = 8
  return {
    bars,
    barNames: Array.from({ length: bars }, (_, i) => `${i + 1}막`),
    tracks: DEFAULT_TRACK_NAMES.map((nm, i) => makeTrack(nm, i, bars)),
    normalize: false,
    showEnsemble: true,
  }
}

function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return defaultState()
    const bars = clampBars(p.bars)
    const tracks: Track[] = Array.isArray(p.tracks)
      ? p.tracks
          .filter((t: any) => t && typeof t === 'object')
          .map((t: any, i: number): Track => ({
            id: String(t.id || newId()),
            name: typeof t.name === 'string' ? t.name : `트랙 ${i + 1}`,
            color: typeof t.color === 'string' ? t.color : PALETTE[i % PALETTE.length],
            weight: clampW(t.weight),
            values: resize(Array.isArray(t.values) ? t.values : [], bars),
            muted: !!t.muted,
          }))
      : []
    if (tracks.length === 0) return defaultState()
    const barNames: string[] = Array.from({ length: bars }, (_, i) => {
      const n = Array.isArray(p.barNames) ? p.barNames[i] : undefined
      return typeof n === 'string' && n ? n : `${i + 1}막`
    })
    return {
      bars,
      barNames,
      tracks,
      normalize: !!p.normalize,
      showEnsemble: p.showEnsemble !== false,
    }
  } catch { return defaultState() }
}

// 긴장도 → 라벨
function vLabel(v: number): string {
  if (v >= 9) return '최고조'
  if (v >= 7) return '고조'
  if (v >= 5) return '긴장'
  if (v >= 3) return '잔잔'
  if (v >= 1) return '평온'
  return '정적'
}
// 셀 농도 색(트랙 색 + 알파)
function cellBg(color: string, v: number): string {
  const a = 0.08 + (v / MAXV) * 0.82
  return hexA(color, a)
}
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

// Catmull-Rom 스무딩 path
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
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

export default function TensionOrchestra({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [bars, setBars] = useState<number>(init.current.bars)
  const [barNames, setBarNames] = useState<string[]>(init.current.barNames)
  const [tracks, setTracks] = useState<Track[]>(init.current.tracks)
  const [normalize, setNormalize] = useState<boolean>(init.current.normalize)
  const [showEnsemble, setShowEnsemble] = useState<boolean>(init.current.showEnsemble)

  const [editTrack, setEditTrack] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [hoverCell, setHoverCell] = useState<{ t: string; b: number } | null>(null)
  const [selBar, setSelBar] = useState<number | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const [toast, setToast] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [showLib, setShowLib] = useState(false)

  const snippets = useLibraryList('snippets')
  const mounted = useRef(true)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const paintRef = useRef<{ track: string; val: number } | null>(null)
  const [painting, setPainting] = useState(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const flash = useCallback((m: string) => { if (mounted.current) setToast(m) }, [])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
    return () => window.clearTimeout(id)
  }, [toast])
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  // ── 페이로드 수용 ─────────────────────────────────────────
  useEffect(() => {
    if (!payload) return
    // 1) 트랙 배열({name, values}) 또는 곡선 점 배열 → 새 트랙으로 추가
    const seedTracks = payload.tracks as unknown
    if (Array.isArray(seedTracks) && seedTracks.length) {
      const added: Track[] = []
      seedTracks.forEach((t: any, i) => {
        if (t && typeof t === 'object') {
          const nm = String(t.name ?? t.title ?? `유입 트랙 ${i + 1}`)
          const vals = Array.isArray(t.values) ? resize(t.values, init.current.bars)
            : Array.isArray(t.points) ? resize(t.points.map((p: any) => clampV(p?.v ?? p?.tension ?? p)), init.current.bars)
              : seedValues(nm, init.current.bars, i)
          added.push({ id: newId(), name: nm, color: PALETTE[(tracks.length + i) % PALETTE.length], weight: 1, values: vals, muted: false })
        }
      })
      if (added.length) { setTracks((prev) => [...prev, ...added]); flash('연계 데이터로 트랙을 추가했어요.') }
      return
    }
    // 2) 단일 곡선(beats/points) → 한 트랙으로
    const pts = (payload.beats || payload.points) as unknown
    if (Array.isArray(pts) && pts.length) {
      const vals = resize(pts.map((p: any) => clampV(p?.v ?? p?.tension ?? p?.value ?? p)), init.current.bars)
      const nm = typeof payload.title === 'string' ? String(payload.title) : '유입 라인'
      setTracks((prev) => [...prev, { id: newId(), name: nm, color: PALETTE[prev.length % PALETTE.length], weight: 1, values: vals, muted: false }])
      flash('연계 곡선을 새 트랙으로 추가했어요.')
      return
    }
    // 3) 텍스트(드롭/스니펫) → 문장 수에 비례한 윤곽 트랙
    const txt = typeof payload.text === 'string' ? payload.text : ''
    if (txt.trim()) ingestText(txt, typeof payload.title === 'string' ? String(payload.title) : '원고 라인')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 영속 저장 ─────────────────────────────────────────────
  useEffect(() => {
    const data: SaveShape = { bars, barNames, tracks, normalize, showEnsemble }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.') }
  }, [bars, barNames, tracks, normalize, showEnsemble])

  // ── 합주 계산 ─────────────────────────────────────────────
  const active = useMemo(() => tracks.filter((t) => !t.muted), [tracks])
  const ensembleRaw = useMemo(() => {
    const out: number[] = flatValues(bars, 0)
    for (let b = 0; b < bars; b++) {
      let s = 0
      active.forEach((t) => { s += (t.values[b] || 0) * t.weight })
      out[b] = s
    }
    return out
  }, [active, bars])
  const ensMax = Math.max(1, ...ensembleRaw)
  const ensemble = normalize ? ensembleRaw.map((v) => (v / ensMax) * MAXV) : ensembleRaw
  const ensembleScaleMax = normalize ? MAXV : Math.max(MAXV, ensMax)

  // 마디별: 절정에 가까운 트랙 수(>=7), 합주 부하
  const barStats = useMemo(() => {
    return Array.from({ length: bars }, (_, b) => {
      let peaks = 0, sumActive = 0, maxV = 0, contributors = 0
      active.forEach((t) => {
        const v = t.values[b] || 0
        if (v >= 7) peaks++
        if (v > 0.5) contributors++
        sumActive += v
        if (v > maxV) maxV = v
      })
      return { b, peaks, sumActive, maxV, contributors, load: ensembleRaw[b] }
    })
  }, [active, bars, ensembleRaw])

  // ── 진단(동시 절정/공백/단조 등) ───────────────────────────
  const diags = useMemo(() => {
    const d: { msg: string; tone: 'ok' | 'warn' | 'muted' }[] = []
    if (active.length === 0) { d.push({ msg: '울리는 트랙이 없습니다. 트랙의 음소거를 해제하세요.', tone: 'muted' }); return d }
    // 동시 절정(과부하): 절정 트랙이 2개 이상 몰린 마디
    const overload = barStats.filter((s) => s.peaks >= 2)
    if (overload.length) {
      const labels = overload.slice(0, 4).map((s) => barNames[s.b] || `${s.b + 1}막`).join(', ')
      d.push({ msg: `동시 절정 과부하: ${labels}${overload.length > 4 ? ' 외' : ''} 마디에서 ${overload.map((s) => s.peaks).reduce((a, b) => Math.max(a, b), 0)}개 라인이 함께 절정에 달합니다. 독자가 어느 갈등에 집중할지 분산됩니다 — 한 라인을 앞당기거나 늦추세요.`, tone: 'warn' })
    }
    // 긴장 공백: 모든 트랙이 잠잠한 마디
    const voids: number[] = barStats.filter((s) => s.maxV < 3 && s.sumActive < active.length * 2).map((s) => s.b)
    if (voids.length) {
      const labels = voids.slice(0, 4).map((b) => barNames[b] || `${b + 1}막`).join(', ')
      d.push({ msg: `긴장 공백: ${labels}${voids.length > 4 ? ' 외' : ''} 마디는 모든 라인이 잠잠합니다. 최소 한 라인에 미세 긴장(질문·불안·시한)을 넣어 페이지를 넘기게 하세요.`, tone: 'warn' })
    }
    // 합주 절정 위치
    let peakB = 0; let peakV = -1
    ensembleRaw.forEach((v, b) => { if (v > peakV) { peakV = v; peakB = b } })
    const peakProg = bars <= 1 ? 0.5 : peakB / (bars - 1)
    if (peakProg < 0.45) d.push({ msg: `합주 절정(${barNames[peakB] || `${peakB + 1}막`})이 앞쪽에 있습니다. 후반에 더 강한 합주 봉우리를 만들면 추진력이 살아납니다.`, tone: 'muted' })
    else if (peakProg > 0.96 && bars > 3) d.push({ msg: '합주 절정이 끝에 붙어 있습니다. 하강·여운 마디를 두면 마무리가 안정됩니다.', tone: 'muted' })
    // 라인 단독 캐리(혼자만 일함)
    if (active.length >= 2) {
      const totals = active.map((t) => t.values.reduce((a, b) => a + b, 0) * t.weight)
      const sum = totals.reduce((a, b) => a + b, 0) || 1
      const maxShare = Math.max(...totals) / sum
      if (maxShare > 0.6) {
        const idx = totals.indexOf(Math.max(...totals))
        d.push({ msg: `'${active[idx].name}' 한 라인이 전체 긴장의 ${Math.round(maxShare * 100)}%를 떠받칩니다. 다른 라인이 침묵 중이면 받쳐줄 보조 긴장을 더하세요.`, tone: 'muted' })
      }
    }
    // 합주 단조(낙차 부족)
    const eMin = Math.min(...ensembleRaw), eMax = Math.max(...ensembleRaw)
    if (eMax - eMin < eMax * 0.35 && eMax > 0) d.push({ msg: '합주 곡선의 낙차가 작아 평탄하게 느껴질 수 있습니다. 골(저점)을 더 깊게 파 대비를 만드세요.', tone: 'muted' })
    if (d.length === 0) d.push({ msg: '여러 라인이 서로 어긋난 박자로 긴장을 주고받아 합주가 균형 있게 흐릅니다.', tone: 'ok' })
    return d
  }, [active, barStats, barNames, ensembleRaw, bars])

  // ── 셀 값 입력(클릭/드래그 페인트) ─────────────────────────
  const setCell = useCallback((trackId: string, b: number, v: number) => {
    setTracks((prev) => prev.map((t) => {
      if (t.id !== trackId) return t
      const vals = t.values.slice()
      vals[b] = clampV(v)
      return { ...t, values: vals }
    }))
  }, [])
  const cellValFromPointer = (clientY: number, cellEl: HTMLElement): number => {
    const r = cellEl.getBoundingClientRect()
    if (r.height === 0) return 0
    const rel = 1 - (clientY - r.top) / r.height
    return clampV(rel * MAXV)
  }
  const onCellDown = (e: React.PointerEvent<HTMLDivElement>, trackId: string, b: number) => {
    e.preventDefault()
    const v = cellValFromPointer(e.clientY, e.currentTarget)
    paintRef.current = { track: trackId, val: v }
    setCell(trackId, b, v)
    setPainting(true)
  }
  // 드래그 페인트: 같은 트랙 행 위를 지나가면 해당 마디에 동일 값 채우기
  useEffect(() => {
    if (!painting) return
    const onMove = (ev: PointerEvent) => {
      if (!paintRef.current) return
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
      if (!el) return
      const cell = el.closest('[data-cell]') as HTMLElement | null
      if (!cell) return
      const tid = cell.getAttribute('data-track') || ''
      const b = Number(cell.getAttribute('data-bar'))
      if (tid !== paintRef.current.track || !Number.isFinite(b)) return
      const v = cellValFromPointer(ev.clientY, cell)
      setCell(tid, b, v)
    }
    const onUp = () => { paintRef.current = null; if (mounted.current) setPainting(false) }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [painting, setCell])

  // ── 트랙 CRUD ─────────────────────────────────────────────
  const addTrack = () => {
    const nm = `라인 ${tracks.length + 1}`
    setTracks((prev) => [...prev, makeTrack(nm, prev.length, bars)])
  }
  const addBlankTrack = () => {
    const nm = `라인 ${tracks.length + 1}`
    setTracks((prev) => [...prev, { id: newId(), name: nm, color: PALETTE[prev.length % PALETTE.length], weight: 1, values: flatValues(bars, 0), muted: false }])
  }
  const delTrack = (id: string) => {
    if (tracks.length <= 1) { flash('마지막 트랙은 삭제할 수 없어요.'); return }
    setTracks((prev) => prev.filter((t) => t.id !== id))
  }
  const toggleMute = (id: string) => setTracks((prev) => prev.map((t) => t.id === id ? { ...t, muted: !t.muted } : t))
  const cycleColor = (id: string) => setTracks((prev) => prev.map((t) => {
    if (t.id !== id) return t
    const i = PALETTE.indexOf(t.color)
    return { ...t, color: PALETTE[(i + 1) % PALETTE.length] }
  }))
  const setWeight = (id: string, w: number) => setTracks((prev) => prev.map((t) => t.id === id ? { ...t, weight: clampW(w) } : t))
  const startEdit = (t: Track) => { setEditTrack(t.id); setEditName(t.name) }
  const commitEdit = () => {
    if (!editTrack) return
    const nm = editName.trim()
    setTracks((prev) => prev.map((t) => t.id === editTrack ? { ...t, name: nm || t.name } : t))
    setEditTrack(null); setEditName('')
  }
  const clearTrack = (id: string) => setTracks((prev) => prev.map((t) => t.id === id ? { ...t, values: flatValues(bars, 0) } : t))

  // ── 마디 CRUD ─────────────────────────────────────────────
  const setBarCount = (n: number) => {
    const nb = clampBars(n)
    setBars(nb)
    setBarNames((prev) => Array.from({ length: nb }, (_, i) => prev[i] || `${i + 1}막`))
    setTracks((prev) => prev.map((t) => ({ ...t, values: resize(t.values, nb) })))
    setSelBar((s) => (s != null && s >= nb ? null : s))
  }
  const renameBar = (b: number, name: string) => setBarNames((prev) => prev.map((x, i) => i === b ? name : x))

  // ── 텍스트 흡수: 문장 길이 분포 → 윤곽 트랙 ────────────────
  const ingestText = (txt: string, name: string) => {
    const sents = txt.replace(/\s+/g, ' ').split(/(?<=[.!?。！？…])\s|(?<=[다요])\.\s/).filter((s) => s.trim().length > 0)
    const nb = bars
    const vals: number[] = []
    for (let i = 0; i < nb; i++) {
      const from = Math.floor((i / nb) * sents.length)
      const to = Math.max(from + 1, Math.floor(((i + 1) / nb) * sents.length))
      const seg = sents.slice(from, to)
      // 휴리스틱: 짧은 문장·구두점 밀도·감탄/물음표 → 긴장 ↑
      let score = 0
      seg.forEach((s) => {
        const len = s.length
        const punct = (s.match(/[!?！？…—-]/g) || []).length
        const shortBoost = len < 30 ? 2.2 : len < 60 ? 1.2 : 0.5
        score += shortBoost + punct * 1.3
      })
      const norm = seg.length ? score / seg.length : 0
      vals.push(clampV(Math.min(MAXV, norm * 2.2)))
    }
    setTracks((prev) => [...prev, { id: newId(), name, color: PALETTE[prev.length % PALETTE.length], weight: 1, values: vals, muted: false }])
    flash('원고 텍스트의 문장 밀도를 분석해 긴장 윤곽 트랙을 만들었어요.')
  }

  // 스니펫 → 트랙
  const fromSnippet = (text: string, label: string) => { ingestText(text, label || '스니펫 라인'); setShowLib(false) }

  // 드롭(바인더 문서)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropOver(false)
    const item = getDragItem(e)
    if (item && item.text) ingestText(item.text, item.title || '원고 라인')
    else if (item) flash('이 문서에는 본문 텍스트가 없어 트랙을 만들 수 없어요.')
  }

  // ── 내보내기/연동 ─────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildText = (): string => {
    const lines: string[] = []
    lines.push('[긴장 오케스트라] 합주 분석')
    lines.push(`마디 ${bars} · 트랙 ${tracks.length}(활성 ${active.length})`)
    lines.push('')
    tracks.forEach((t) => {
      const bar = t.values.map((v) => '0123456789'[Math.min(9, Math.round(v))]).join('')
      lines.push(`${t.muted ? '(음소거) ' : ''}${t.name} [w${t.weight}]  ${bar}`)
    })
    lines.push('')
    lines.push('합주 ' + (normalize ? '(정규화) ' : '') + ensembleRaw.map((v, b) => `${barNames[b] || (b + 1)}=${v.toFixed(1)}`).join('  '))
    lines.push('')
    diags.forEach((d) => lines.push(`진단: ${d.msg}`))
    return lines.join('\n')
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>긴장 오케스트라</strong> · 마디 ${bars} · 트랙 ${tracks.length}(활성 ${active.length})</p>`)
    parts.push('<table border="1" cellpadding="3" style="border-collapse:collapse"><thead><tr><th>트랙</th>')
    for (let b = 0; b < bars; b++) parts.push(`<th>${esc(barNames[b] || String(b + 1))}</th>`)
    parts.push('</tr></thead><tbody>')
    tracks.forEach((t) => {
      parts.push(`<tr><td>${esc(t.name)}${t.muted ? ' (음소거)' : ''}</td>`)
      t.values.forEach((v) => parts.push(`<td style="text-align:center">${v.toFixed(0)}</td>`))
      parts.push('</tr>')
    })
    parts.push('<tr><td><strong>합주</strong></td>')
    ensembleRaw.forEach((v) => parts.push(`<td style="text-align:center"><strong>${v.toFixed(1)}</strong></td>`))
    parts.push('</tr></tbody></table>')
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
    if (!hasProjectBridge()) return
    const peakB = ensembleRaw.indexOf(Math.max(...ensembleRaw))
    const meta: Record<string, string> = {
      마디수: String(bars), 트랙수: String(tracks.length), 활성트랙: String(active.length),
      합주절정: barNames[peakB] || `${peakB + 1}막`,
      경고: String(diags.filter((d) => d.tone === 'warn').length),
    }
    const id = addToProject({ kind: 'text', root: 'research', folder: '구조', title: '긴장 오케스트라 — 합주 분석', bodyHtml: buildHtml(), meta })
    if (!mounted.current) return
    if (id) flash('프로젝트 자료(구조)에 합주 분석 문서를 추가했어요.')
    else setNote('프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: '긴장 오케스트라 합주 분석', text: buildText() })
    flash('수집함에 담았어요.')
  }
  // 활성 합주 곡선을 스니펫 라이브러리에 저장(다른 도구가 받아 씀)
  const saveSnippet = () => {
    const body = buildText()
    addToLibrary('snippets', { text: body, source: 'tension-orchestra', tags: ['긴장곡선', '플롯', '합주'] })
    flash('합주 분석을 스니펫 라이브러리에 저장했어요.')
  }
  // 합주 곡선을 긴장 곡선 편집기로 (점 배열로 변환해) 열기
  const openCurve = () => {
    const beats = ensembleRaw.map((v, b) => ({ name: barNames[b] || `${b + 1}막`, v: clampV((v / ensembleScaleMax) * MAXV) }))
    openToolLinked('tension-curve', { title: '합주 곡선', beats })
    flash('긴장 곡선 편집기로 합주 곡선을 보냈어요.')
  }

  // ── 그래프 좌표 ───────────────────────────────────────────
  const VBW = 480, VBH = 150, PADL = 6, PADR = 6, PADT = 10, PADB = 6
  const plotW = VBW - PADL - PADR, plotH = VBH - PADT - PADB
  const xAt = (b: number) => bars <= 1 ? PADL + plotW / 2 : PADL + (b / (bars - 1)) * plotW
  const yAt = (v: number, max: number) => PADT + (1 - v / max) * plotH

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.5 }
  const selStyle: React.CSSProperties = { padding: '5px 7px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const toneColor = (t: 'ok' | 'warn' | 'muted') => t === 'ok' ? 'var(--ok)' : t === 'warn' ? 'var(--warn)' : 'var(--muted)'

  // 마디 헤더 폭(트랙 행과 정렬)
  const NAMECOL = 96
  const gridCols = `${NAMECOL}px repeat(${bars}, minmax(0,1fr))`

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 16 }}>🎻</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>긴장 오케스트라</span>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
          마디
          <input type="number" min={MINBARS} max={MAXBARS} value={bars}
            onChange={(e) => setBarCount(Number(e.target.value))}
            style={{ ...selStyle, width: 52 }} aria-label="마디 수" />
        </label>
        <button className="minibtn" onClick={copy} title="텍스트로 복사">{copied ? '복사됨' : '복사'}</button>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 12px 0' }}>{toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 12px 0' }}>{note}</div>}

      <div
        style={body}
        onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropOver) setDropOver(true) } }}
        onDragLeave={() => setDropOver(false)}
        onDrop={onDrop}
      >
        {dropOver && (
          <div style={{ ...panel, borderStyle: 'dashed', borderColor: 'var(--accent)', textAlign: 'center', color: 'var(--accent)', fontSize: 12.5 }}>
            바인더 문서를 놓으면 본문 문장 밀도를 분석해 긴장 윤곽 트랙으로 추가합니다.
          </div>
        )}

        {/* ── 합주 그래프 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={sectionTitle}>합주 곡선과 트랙 겹침</span>
            <span style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={showEnsemble} onChange={(e) => setShowEnsemble(e.target.checked)} /> 합주선
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} /> 정규화
            </label>
          </div>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 170 }} role="img" aria-label="합주 곡선 그래프">
            {/* 격자 */}
            {[0, 0.5, 1].map((f) => {
              const y = PADT + (1 - f) * plotH
              return <line key={f} x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray={f === 0 || f === 1 ? undefined : '2 4'} opacity={0.5} />
            })}
            {/* 동시 절정/공백 마디 음영 */}
            {barStats.map((s) => {
              if (s.peaks < 2 && !(s.maxV < 3 && s.sumActive < active.length * 2)) return null
              const x0 = bars <= 1 ? PADL : PADL + (Math.max(0, s.b - 0.5) / (bars - 1)) * plotW
              const x1 = bars <= 1 ? VBW - PADR : PADL + (Math.min(bars - 1, s.b + 0.5) / (bars - 1)) * plotW
              const danger = s.peaks >= 2
              return <rect key={'sh' + s.b} x={x0} y={PADT} width={Math.max(2, x1 - x0)} height={plotH}
                fill={danger ? 'var(--warn)' : 'var(--muted)'} opacity={danger ? 0.13 : 0.08} />
            })}
            {/* 각 트랙 곡선 */}
            {tracks.map((t) => {
              if (t.muted) return null
              const pts = t.values.map((v, b) => ({ x: xAt(b), y: yAt(v, MAXV) }))
              return <path key={t.id} d={smoothPath(pts)} fill="none" stroke={t.color} strokeWidth={1.6} opacity={0.55} strokeLinejoin="round" strokeLinecap="round" />
            })}
            {/* 합주 곡선 + 영역 */}
            {showEnsemble && active.length > 0 && (() => {
              const pts = ensemble.map((v, b) => ({ x: xAt(b), y: yAt(v, ensembleScaleMax) }))
              const area = `${smoothPath(pts)} L${pts[pts.length - 1].x.toFixed(2)},${(PADT + plotH).toFixed(2)} L${pts[0].x.toFixed(2)},${(PADT + plotH).toFixed(2)} Z`
              return <g>
                <path d={area} fill="var(--accent)" opacity={0.14} />
                <path d={smoothPath(pts)} fill="none" stroke="var(--accent)" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            })()}
          </svg>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {tracks.map((t) => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, opacity: t.muted ? 0.4 : 1 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, display: 'inline-block' }} />
                {t.name}{t.muted ? ' (음소거)' : ''}
              </span>
            ))}
          </div>
        </div>

        {/* ── 트랙 x 마디 그리드(악보) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={sectionTitle}>악보 — 셀을 위아래로 끌어 긴장도를 칠하세요</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={addTrack} title="윤곽 시드 트랙 추가">트랙 추가</button>
            <button className="minibtn" onClick={addBlankTrack} title="0으로 빈 트랙 추가">빈 트랙</button>
          </div>
          <div ref={gridRef} style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: NAMECOL + bars * 26 }}>
              {/* 마디 헤더 */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, marginBottom: 3 }}>
                <div />
                {Array.from({ length: bars }, (_, b) => {
                  const st = barStats[b]
                  const danger = st.peaks >= 2
                  const isVoid = st.maxV < 3 && st.sumActive < active.length * 2
                  return (
                    <div key={b}
                      onClick={() => setSelBar((s) => s === b ? null : b)}
                      title={`${barNames[b] || (b + 1)} · 합주 ${ensembleRaw[b].toFixed(1)} · 절정 라인 ${st.peaks}`}
                      style={{
                        fontSize: 9, textAlign: 'center', cursor: 'pointer',
                        padding: '1px 0', borderRadius: 4, lineHeight: 1.1, minWidth: 0, overflow: 'hidden',
                        background: selBar === b ? 'var(--accent)' : danger ? hexA('#e0533d', 0.18) : isVoid ? hexA('#888888', 0.12) : 'transparent',
                      }}
                    >
                      <span style={{ color: selBar === b ? '#fff' : danger ? 'var(--warn)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{barNames[b] || b + 1}</span>
                    </div>
                  )
                })}
              </div>
              {/* 트랙 행 */}
              {tracks.map((t) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, marginBottom: 2, alignItems: 'stretch', opacity: t.muted ? 0.45 : 1 }}>
                  {/* 트랙 라벨 셀 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                    <span onClick={() => cycleColor(t.id)} title="색 변경" style={{ width: 9, height: 9, borderRadius: 2, background: t.color, flexShrink: 0, cursor: 'pointer' }} />
                    {editTrack === t.id ? (
                      <input value={editName} autoFocus maxLength={24}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditTrack(null) } }}
                        style={{ flex: 1, minWidth: 0, padding: '2px 4px', fontSize: 11, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        aria-label="트랙 이름" />
                    ) : (
                      <span onClick={() => startEdit(t)} title="클릭해서 이름 수정" style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}>{t.name}</span>
                    )}
                  </div>
                  {/* 마디 셀(값 페인트) */}
                  {t.values.map((v, b) => {
                    const isHover = hoverCell && hoverCell.t === t.id && hoverCell.b === b
                    const isSel = selBar === b
                    return (
                      <div key={b}
                        data-cell data-track={t.id} data-bar={b}
                        onPointerDown={(e) => onCellDown(e, t.id, b)}
                        onPointerEnter={() => setHoverCell({ t: t.id, b })}
                        onPointerLeave={() => setHoverCell((h) => h && h.t === t.id && h.b === b ? null : h)}
                        title={`${t.name} · ${barNames[b] || (b + 1)} · ${v.toFixed(1)} (${vLabel(v)})`}
                        style={{
                          height: 22, borderRadius: 4, cursor: 'ns-resize', position: 'relative',
                          background: cellBg(t.color, v),
                          border: isSel ? '1px solid var(--accent)' : isHover ? `1px solid ${t.color}` : '1px solid transparent',
                          touchAction: 'none', minWidth: 0, userSelect: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: v >= 5.5 ? '#fff' : 'var(--text)', pointerEvents: 'none', opacity: v < 0.4 ? 0.25 : 0.9 }}>{v >= 0.4 ? v.toFixed(0) : ''}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
              {/* 합주 합계 행 */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>합주</div>
                {ensembleRaw.map((v, b) => {
                  const t01 = ensembleScaleMax > 0 ? v / ensembleScaleMax : 0
                  return (
                    <div key={b} title={`합주 ${v.toFixed(1)}`} style={{ height: 20, borderRadius: 4, background: hexA('#5b86e0', 0.12 + t01 * 0.7), display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: t01 > 0.5 ? '#fff' : 'var(--text)' }}>{v.toFixed(0)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div style={{ ...hint, marginTop: 6 }}>셀을 누른 채 위아래로 끌면 그 높이만큼 긴장도가 칠해집니다. 마디 이름을 클릭하면 아래에서 편집할 수 있어요.</div>
        </div>

        {/* ── 트랙 설정(가중치/음소거/삭제) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={sectionTitle}>트랙 설정</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tracks.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setShowLib((s) => !s)} title="스니펫 라이브러리에서 트랙 만들기">{showLib ? '닫기' : `스니펫 (${snippets.length})`}</button>
          </div>
          {showLib && (
            <div style={{ marginBottom: 8, maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {snippets.length === 0 ? (
                <div style={hint}>저장된 스니펫이 없습니다. 다른 도구에서 텍스트를 스니펫으로 담으면 여기서 긴장 윤곽 트랙으로 만들 수 있어요.</div>
              ) : snippets.slice(0, 30).map((s) => (
                <button key={s.id} className="minibtn" style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: 11, lineHeight: 1.4 }}
                  onClick={() => fromSnippet(s.text, (s.tags && s.tags[0]) || '스니펫 라인')}
                  title="이 스니펫의 문장 밀도로 트랙 만들기">
                  {s.text.slice(0, 60)}{s.text.length > 60 ? '…' : ''}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tracks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: t.muted ? 0.5 : 1 }}>{t.name}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                  비중
                  <input type="range" min={0.2} max={2} step={0.1} value={t.weight} onChange={(e) => setWeight(t.id, Number(e.target.value))} style={{ width: 64, accentColor: t.color }} aria-label={`${t.name} 비중`} />
                  <strong style={{ width: 22, textAlign: 'right', color: 'var(--text)' }}>{t.weight.toFixed(1)}</strong>
                </label>
                <button className="minibtn" style={{ padding: '2px 6px', fontSize: 10, color: t.muted ? 'var(--accent)' : 'var(--muted)' }} onClick={() => toggleMute(t.id)} title={t.muted ? '합주에 포함' : '합주에서 제외(독주 점검)'}>{t.muted ? '독주' : '음소거'}</button>
                <button className="minibtn" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => clearTrack(t.id)} title="값 초기화(0)">비우기</button>
                <button className="minibtn" style={{ padding: '2px 6px', fontSize: 10, color: 'var(--warn)' }} onClick={() => delTrack(t.id)} title="트랙 삭제" disabled={tracks.length <= 1}>삭제</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 마디 편집(선택 시) ── */}
        {selBar != null && selBar < bars && (
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={sectionTitle}>마디 편집</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setSelBar(null)}>닫기</button>
            </div>
            <input value={barNames[selBar] || ''} maxLength={24}
              onChange={(e) => renameBar(selBar, e.target.value)}
              placeholder="마디 이름(예: 1막, 발단, 추격전)"
              style={{ width: '100%', padding: '6px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 8 }}
              aria-label="마디 이름" />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              합주 부하 <strong style={{ color: 'var(--text)' }}>{ensembleRaw[selBar].toFixed(1)}</strong>
              {' · '}절정 라인 <strong style={{ color: barStats[selBar].peaks >= 2 ? 'var(--warn)' : 'var(--text)' }}>{barStats[selBar].peaks}</strong>
              {' · '}참여 라인 <strong style={{ color: 'var(--text)' }}>{barStats[selBar].contributors}</strong>
              {barStats[selBar].peaks >= 2 && <div style={{ color: 'var(--warn)', marginTop: 4 }}>동시 절정 마디입니다. 한 라인을 인접 마디로 옮겨 절정을 어긋나게 하세요.</div>}
              {barStats[selBar].maxV < 3 && barStats[selBar].sumActive < active.length * 2 && <div style={{ color: 'var(--warn)', marginTop: 4 }}>긴장 공백 마디입니다. 한 라인에 작은 불씨를 넣으세요.</div>}
            </div>
          </div>
        )}

        {/* ── 진단 ── */}
        <div style={panel}>
          <div style={{ ...sectionTitle, marginBottom: 8 }}>합주 진단</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {diags.map((d, i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: 1.55, color: toneColor(d.tone), display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ flexShrink: 0, fontWeight: 800 }}>{d.tone === 'ok' ? '✓' : d.tone === 'warn' ? '!' : '·'}</span>
                <span>{d.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 연계 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button className="linkbtn" onClick={openCurve} title="합주 곡선을 긴장 곡선 편집기로 보내기">긴장 곡선으로</button>
          <button className="linkbtn" onClick={saveSnippet} title="합주 분석을 스니펫 라이브러리에 저장">스니펫 저장</button>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 구조 폴더에 합주 분석 문서 추가' : '프로젝트에 연결되지 않았습니다'}>프로젝트에 추가</button>
          {hasStash() && <button className="linkbtn" onClick={toStash} title="합주 분석 요약을 수집함에 담기">수집함에 담기</button>}
        </div>

        <div style={hint}>여러 플롯라인을 트랙으로 겹쳐 합주 곡선을 만들고, 같은 마디에 절정이 몰리는 과부하와 모두 잠잠한 공백을 경고합니다. 좌측 바인더 문서를 끌어다 놓거나 스니펫을 불러오면 문장 밀도를 분석해 긴장 윤곽 트랙으로 만듭니다. 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
