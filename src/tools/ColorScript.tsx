// 컬러 스크립트 — 픽사식 '컬러 스크립트(color script)'를 글쓰기용으로 옮긴 도구.
//  장면을 순서대로 늘어놓고 각 장면에 '무드 색'을 지정하면, 가로 색 띠 타임라인으로
//  작품 전체의 감정·분위기 흐름을 한눈에 본다. 색의 온도(따뜻함/차가움)와 명도 흐름을
//  분석해 단조로움/급변을 진단하고, 그 흐름을 프로젝트 자료로 내보낸다.
//
// 규약: react 와 './linkbus' 외 import 금지 · 완전 로컬(외부 미디어/네트워크 없음) ·
//       localStorage 'sry:tool:color-script' 영속 · 언마운트 정리 · UI 한국어.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = {
  id: 'color-script',
  name: '컬러 스크립트',
  icon: '🎞️',
  group: '분위기·시각',
  intro: '장면마다 무드 색을 정해 작품 전체의 분위기를 가로 색 띠로 한눈에',
  w: 760,
  h: 620,
}

const LS_KEY = 'sry:tool:color-script'

// ── 데이터 ──────────────────────────────────────────────────
interface Scene {
  id: string
  title: string
  hex: string       // #RRGGBB (무드 색)
  weight: number    // 1~10 (타임라인에서 차지하는 비중 = 장면 길이/체감 시간)
  note: string      // 메모(이 장면의 분위기/사건 한 줄)
}
interface SaveShape { title: string; scenes: Scene[]; showWeights: boolean }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ── 색 유틸 ─────────────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return ('#' + to(r) + to(g) + to(b)).toUpperCase()
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}
function isValidHex(v: string): boolean { return /^#[0-9A-Fa-f]{6}$/.test(v) }
function normHex(raw: string): string | null {
  let v = raw.trim()
  if (v && !v.startsWith('#')) v = '#' + v
  return isValidHex(v) ? v.toUpperCase() : null
}
// 상대 휘도(0~1) — 대비/글자색 판단.
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function readableText(hex: string): string { return luminance(hex) > 0.42 ? '#101317' : '#FFFFFF' }
// 색 온도: 색상(hue) 기준으로 따뜻함(+)/차가움(-) -1~+1. 채도가 낮으면 중립으로 약화.
function warmth(hex: string): number {
  const { h, s } = hexToHsl(hex)
  // 0~60(빨강~노랑) 따뜻, 180~300(청록~보라) 차가움. cos 곡선으로 부드럽게.
  const base = Math.cos(((h - 40) * Math.PI) / 180) // h=40 에서 최대(+1), h=220 에서 최소(-1)
  return base * Math.min(1, s / 60)
}
// 두 hex 사이 지각 거리(대략) — RGB 유클리드.
function colorDist(a: string, b: string): number {
  const ca = hexToRgb(a), cb = hexToRgb(b)
  return Math.sqrt((ca.r - cb.r) ** 2 + (ca.g - cb.g) ** 2 + (ca.b - cb.b) ** 2) / 441.673 // 0~1
}

// 이름 있는 무드 색 프리셋 — 클릭으로 빠르게 칠하기.
const MOOD_PRESETS: { name: string; hex: string }[] = [
  { name: '새벽', hex: '#2E3A59' },
  { name: '여명', hex: '#E8A87C' },
  { name: '한낮', hex: '#FFD56B' },
  { name: '봄볕', hex: '#A8D08D' },
  { name: '청량', hex: '#5BC0BE' },
  { name: '하늘', hex: '#6FA8DC' },
  { name: '황혼', hex: '#C9627E' },
  { name: '노을', hex: '#E8603C' },
  { name: '핏빛', hex: '#9B1B30' },
  { name: '심연', hex: '#16213E' },
  { name: '안개', hex: '#B8B8B8' },
  { name: '숲그늘', hex: '#3E5641' },
  { name: '몽환', hex: '#8E7CC3' },
  { name: '차가운밤', hex: '#1B2A4A' },
  { name: '병원', hex: '#D9E4EC' },
  { name: '먼지', hex: '#8A7A66' },
]

// 색 온도 → 분위기 한 단어(요약용)
function warmthWord(w: number): string {
  if (w > 0.45) return '따뜻함'
  if (w > 0.12) return '온화함'
  if (w < -0.45) return '차가움'
  if (w < -0.12) return '서늘함'
  return '중립'
}

// 기본 예시 — 처음 열었을 때 비어 보이지 않게 3막 흐름의 색을 깐다.
function defaultScenes(): Scene[] {
  return [
    { id: newId(), title: '도입', hex: '#E8A87C', weight: 3, note: '평온한 일상, 따뜻한 아침빛' },
    { id: newId(), title: '발단', hex: '#6FA8DC', weight: 4, note: '서늘한 예감이 스며든다' },
    { id: newId(), title: '위기', hex: '#16213E', weight: 3, note: '가장 어두운 밤' },
    { id: newId(), title: '절정', hex: '#9B1B30', weight: 2, note: '핏빛 충돌' },
    { id: newId(), title: '결말', hex: '#FFD56B', weight: 4, note: '여명, 다시 빛이 든다' },
  ]
}

function clampWeight(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 3
  return Math.min(10, Math.max(1, v))
}

function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', scenes: defaultScenes(), showWeights: true }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', scenes: defaultScenes(), showWeights: true }
    const scenes: Scene[] = Array.isArray(p.scenes)
      ? p.scenes
          .filter((s: any) => s && typeof s === 'object' && isValidHex(String(s.hex || '')))
          .map((s: any) => ({
            id: String(s.id || newId()),
            title: String(s.title ?? ''),
            hex: String(s.hex).toUpperCase(),
            weight: clampWeight(s.weight),
            note: String(s.note ?? ''),
          }))
      : defaultScenes()
    return {
      title: typeof p.title === 'string' ? p.title : '',
      scenes: scenes.length ? scenes : defaultScenes(),
      showWeights: p.showWeights !== false,
    }
  } catch { return { title: '', scenes: defaultScenes(), showWeights: true } }
}

export default function ColorScript({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [docTitle, setDocTitle] = useState(init.current.title)
  const [scenes, setScenes] = useState<Scene[]>(init.current.scenes)
  const [showWeights, setShowWeights] = useState(init.current.showWeights)
  const [selId, setSelId] = useState<string | null>(init.current.scenes[0]?.id ?? null)
  const [note, setNote] = useState('')        // 경고/안내(warn 색)
  const [toast, setToast] = useState('')       // 성공 안내(ok 색)
  const [copied, setCopied] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── 마운트/언마운트 정리 ──
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []
    }
  }, [])
  const after = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { if (mounted.current) fn() }, ms)
    timers.current.push(t)
  }, [])
  const flashToast = useCallback((msg: string) => { setToast(msg); after(() => setToast(''), 2000) }, [after])
  const flashNote = useCallback((msg: string) => { setNote(msg); after(() => setNote(''), 2600) }, [after])

  // ── 자동 저장 ──
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title: docTitle, scenes, showWeights } as SaveShape)) }
    catch { if (mounted.current) flashNote('저장이 막혀 있어 새로고침 시 사라질 수 있어요(시크릿/용량초과).') }
  }, [docTitle, scenes, showWeights, flashNote])

  // ── 페이로드(다른 도구에서 색/장면을 들고 열기) ──
  useEffect(() => {
    if (!payload) return
    // 단색 hex 하나가 오면 새 장면으로 추가
    const ph = typeof payload.hex === 'string' ? normHex(payload.hex) : null
    const ptitle = typeof payload.title === 'string' ? payload.title : ''
    if (ph) {
      const sc: Scene = { id: newId(), title: ptitle || '가져온 색', hex: ph, weight: 3, note: '' }
      setScenes((prev) => [...prev, sc]); setSelId(sc.id)
      flashToast('색을 새 장면으로 추가했어요.')
      return
    }
    // 팔레트(hex 배열)가 오면 순서대로 장면 생성
    const arr = Array.isArray(payload.palette) ? payload.palette : (Array.isArray(payload.colors) ? payload.colors : null)
    if (arr) {
      const made: Scene[] = []
      arr.forEach((c, i) => { const hx = normHex(String(c)); if (hx) made.push({ id: newId(), title: `장면 ${i + 1}`, hex: hx, weight: 3, note: '' }) })
      if (made.length) { setScenes((prev) => [...prev, ...made]); setSelId(made[0].id); flashToast(`${made.length}색을 장면으로 가져왔어요.`) }
    }
  }, [payload, flashToast])

  const selected = useMemo(() => scenes.find((s) => s.id === selId) ?? null, [scenes, selId])
  const selHsl = useMemo(() => (selected ? hexToHsl(selected.hex) : { h: 210, s: 50, l: 50 }), [selected])

  // ── CRUD ──
  const addScene = (hex?: string, title?: string) => {
    const prevLast = scenes[scenes.length - 1]
    const sc: Scene = {
      id: newId(),
      title: title ?? `장면 ${scenes.length + 1}`,
      hex: hex ?? (prevLast ? prevLast.hex : '#6FA8DC'),
      weight: 3,
      note: '',
    }
    setScenes((prev) => [...prev, sc])
    setSelId(sc.id)
  }
  const removeScene = (id: string) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const next = prev.filter((s) => s.id !== id)
      if (selId === id) {
        const fallback = next[idx] || next[idx - 1] || next[0] || null
        setSelId(fallback ? fallback.id : null)
      }
      return next
    })
  }
  const duplicateScene = (id: string) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const copy: Scene = { ...prev[i], id: newId(), title: prev[i].title + ' (사본)' }
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      setSelId(copy.id)
      return next
    })
  }
  const patchScene = (id: string, patch: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const setSelHsl = (part: Partial<{ h: number; s: number; l: number }>) => {
    if (!selected) return
    const cur = hexToHsl(selected.hex)
    const h = part.h ?? cur.h, s = part.s ?? cur.s, l = part.l ?? cur.l
    patchScene(selected.id, { hex: hslToHex(h, s, l) })
  }
  const move = (id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const onReorderDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setScenes((prev) => {
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }
  const resetAll = () => {
    const d = defaultScenes()
    setScenes(d); setSelId(d[0].id); setDocTitle(''); flashToast('예시 흐름으로 초기화했어요.')
  }
  const reverseAll = () => setScenes((prev) => prev.slice().reverse())

  // ── 바인더 파일 드롭(좌측 원고/자료 → 장면으로) ──
  const onBinderDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropActive) setDropActive(true) }
  }
  const onBinderDrop = (e: React.DragEvent) => {
    const item = getDragItem(e)
    setDropActive(false)
    if (!item) return
    e.preventDefault()
    const prevLast = scenes[scenes.length - 1]
    const sc: Scene = {
      id: newId(),
      title: item.title || '문서 장면',
      hex: prevLast ? prevLast.hex : '#6FA8DC',
      weight: 3,
      note: (item.text || '').slice(0, 60),
    }
    setScenes((prev) => [...prev, sc]); setSelId(sc.id)
    flashToast(`'${sc.title}'을(를) 장면으로 추가했어요. 색을 지정하세요.`)
  }

  // ── 타임라인 비중 계산 ──
  const totalWeight = useMemo(() => scenes.reduce((s, x) => s + (showWeights ? x.weight : 1), 0) || 1, [scenes, showWeights])
  const widthPct = (s: Scene) => ((showWeights ? s.weight : 1) / totalWeight) * 100

  // ── 흐름 분석 ──
  const analysis = useMemo(() => {
    if (scenes.length < 2) return null
    const warms = scenes.map((s) => warmth(s.hex))
    const lums = scenes.map((s) => luminance(s.hex))
    const sats = scenes.map((s) => hexToHsl(s.hex).s)
    // 인접 색 변화량(지각 거리)
    const jumps: number[] = []
    for (let i = 1; i < scenes.length; i++) jumps.push(colorDist(scenes[i - 1].hex, scenes[i].hex))
    const avgJump = jumps.reduce((a, b) => a + b, 0) / jumps.length
    const maxJump = Math.max(...jumps)
    const maxJumpIdx = jumps.indexOf(maxJump)
    const lumRange = Math.max(...lums) - Math.min(...lums)
    const warmRange = Math.max(...warms) - Math.min(...warms)
    const avgSat = sats.reduce((a, b) => a + b, 0) / sats.length
    // 시작→끝 온도 추세
    const trend = warms[warms.length - 1] - warms[0]
    const msgs: { text: string; tone: 'ok' | 'warn' | 'muted' }[] = []
    if (avgJump < 0.12 && lumRange < 0.18) {
      msgs.push({ text: '색 변화가 거의 없어 분위기가 단조롭습니다. 절정 부근에서 색을 크게 대비시켜 보세요.', tone: 'warn' })
    } else if (avgJump > 0.42) {
      msgs.push({ text: '장면마다 색이 급변합니다. 너무 잦은 변화는 시각적 피로를 줍니다 — 비슷한 톤으로 묶어 완급을 주세요.', tone: 'warn' })
    } else {
      msgs.push({ text: '색의 변화에 적절한 완급이 있습니다. 좋은 분위기 흐름이에요.', tone: 'ok' })
    }
    if (lumRange < 0.18) msgs.push({ text: '명도(밝기) 폭이 좁습니다. 가장 어두운 장면을 더 어둡게 하면 절정이 도드라집니다.', tone: 'muted' })
    if (warmRange < 0.3) msgs.push({ text: '색 온도가 한쪽으로 치우쳐 있습니다(따뜻함/차가움 대비 부족).', tone: 'muted' })
    if (trend > 0.5) msgs.push({ text: '전체적으로 차가움→따뜻함으로 풀립니다. 희망적·해소형 결말의 색 흐름이에요.', tone: 'ok' })
    else if (trend < -0.5) msgs.push({ text: '전체적으로 따뜻함→차가움으로 가라앉습니다. 비극·하강형 색 흐름이에요.', tone: 'ok' })
    return { avgJump, maxJump, maxJumpIdx, lumRange, warmRange, avgSat, trend, msgs }
  }, [scenes])

  // ── 복사/내보내기 ──
  const safeCopy = (text: string, onDone: () => void) => {
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => { if (mounted.current) onDone() }).catch(() => { fallbackCopy(text, onDone) })
      else fallbackCopy(text, onDone)
    } catch { fallbackCopy(text, onDone) }
  }
  const fallbackCopy = (text: string, onDone: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      if (mounted.current) onDone()
    } catch { if (mounted.current) flashNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(docTitle.trim() ? `[컬러 스크립트] ${docTitle.trim()}` : '[컬러 스크립트]')
    lines.push('')
    scenes.forEach((s, i) => {
      const w = warmthWord(warmth(s.hex))
      lines.push(`${i + 1}. ${s.title || '(제목 없음)'}  ${s.hex}  (${w}, 비중 ${s.weight})${s.note ? '  — ' + s.note : ''}`)
    })
    if (analysis) {
      lines.push('')
      lines.push(`색 변화(평균/최대): ${analysis.avgJump.toFixed(2)} / ${analysis.maxJump.toFixed(2)}  ·  명도폭 ${analysis.lumRange.toFixed(2)}`)
      analysis.msgs.forEach((m) => lines.push(`· ${m.text}`))
    }
    return lines.join('\n')
  }
  const copyText = () => safeCopy(buildText(), () => { setCopied(true); after(() => setCopied(false), 1500) })
  const copyGradient = () => {
    if (!scenes.length) return
    // 비중에 비례한 위치로 선형 그라데이션 CSS 생성
    let acc = 0
    const stops: string[] = []
    scenes.forEach((s) => {
      const start = (acc / totalWeight) * 100
      acc += showWeights ? s.weight : 1
      const end = (acc / totalWeight) * 100
      stops.push(`${s.hex} ${start.toFixed(1)}%`, `${s.hex} ${end.toFixed(1)}%`)
    })
    const css = `background: linear-gradient(90deg, ${stops.join(', ')});`
    safeCopy(css, () => flashToast('CSS 그라데이션을 복사했어요.'))
  }

  // ── 프로젝트/수집함 연동 ──
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>컬러 스크립트</strong>${docTitle.trim() ? ' · ' + esc(docTitle.trim()) : ''} · 장면 ${scenes.length}개</p>`)
    // 색 띠를 표 한 줄로 시각화(에디터가 인라인 style 을 보존할 때를 대비)
    let acc = 0
    const cells = scenes.map((s) => {
      const w = ((showWeights ? s.weight : 1) / totalWeight) * 100
      acc += 1
      const fg = readableText(s.hex)
      return `<td style="background:${s.hex};color:${fg};width:${w.toFixed(1)}%;padding:8px 4px;text-align:center;font-size:11px;">${esc(s.title || '·')}</td>`
    }).join('')
    parts.push(`<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>${cells}</tr></table>`)
    parts.push('<ol>')
    scenes.forEach((s) => {
      const w = warmthWord(warmth(s.hex))
      parts.push(`<li><strong>${esc(s.title || '(제목 없음)')}</strong> — <code>${esc(s.hex)}</code> <span style="color:#888">(${w} · 비중 ${s.weight})</span>${s.note ? ' — ' + esc(s.note) : ''}</li>`)
    })
    parts.push('</ol>')
    if (analysis) {
      parts.push(`<p>색 변화 평균 ${analysis.avgJump.toFixed(2)} · 최대 ${analysis.maxJump.toFixed(2)} · 명도폭 ${analysis.lumRange.toFixed(2)}</p>`)
      parts.push('<ul>')
      analysis.msgs.forEach((m) => parts.push(`<li>${esc(m.text)}</li>`))
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge() || scenes.length === 0) return
    const meta: Record<string, string> = {
      장면수: String(scenes.length),
      색흐름: scenes.map((s) => s.hex).join(' → '),
    }
    if (analysis) { meta['평균색변화'] = analysis.avgJump.toFixed(2); meta['명도폭'] = analysis.lumRange.toFixed(2) }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분위기 메모',
      title: docTitle.trim() ? `컬러 스크립트 — ${docTitle.trim()}` : '컬러 스크립트',
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) flashToast('프로젝트 자료(분위기 메모)에 컬러 스크립트를 추가했어요.')
    else flashNote('프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    if (!hasStash() || scenes.length === 0) return
    addToStash({ kind: 'note', label: docTitle.trim() ? `컬러 스크립트 · ${docTitle.trim()}` : '컬러 스크립트', text: buildText() })
    flashToast('수집함에 담았어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 140, padding: '7px 10px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em', display: 'flex', alignItems: 'center', gap: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const labelCss: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', width: 14, flexShrink: 0 }

  const toneColor = (t: 'ok' | 'warn' | 'muted') => (t === 'ok' ? 'var(--ok)' : t === 'warn' ? 'var(--warn)' : 'var(--muted)')

  return (
    <div style={wrap} onDragOver={onBinderDragOver} onDragLeave={() => setDropActive(false)} onDrop={onBinderDrop}>
      {/* 헤더 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🎞️" /></span>
        <input style={titleInput} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="작품/시퀀스 제목 (선택)" maxLength={80} aria-label="컬러 스크립트 제목" />
        <button className="minibtn" onClick={copyText} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={copyGradient} disabled={!scenes.length} title="비중에 맞춘 CSS 선형 그라데이션 복사"><Emoji e="🎨" /> 그라데이션</button>
      </div>

      {dropActive && (
        <div style={{ ...hint, color: 'var(--accent)', padding: '6px 12px 0', fontWeight: 600 }}>여기에 놓으면 그 문서가 새 장면이 됩니다.</div>
      )}
      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 12px 0' }}>✓ {toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 12px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 가로 색 띠 타임라인 ── */}
        <div style={panel}>
          <div style={sectionTitle}>
            <span>색 띠 타임라인</span>
            <span style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={showWeights} onChange={(e) => setShowWeights(e.target.checked)} />
              비중대로 너비
            </label>
          </div>
          {scenes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '24px 8px' }}>
              장면이 없습니다. 아래 <b>＋ 장면</b>으로 추가하세요.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }} role="img" aria-label="장면별 무드 색 타임라인">
                {scenes.map((s) => {
                  const fg = readableText(s.hex)
                  const isSel = s.id === selId
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelId(s.id)}
                      title={`${s.title || '장면'} · ${s.hex} · ${warmthWord(warmth(s.hex))}`}
                      style={{
                        width: widthPct(s) + '%', minWidth: 8, height: '100%', background: s.hex, border: 'none',
                        cursor: 'pointer', padding: 0, position: 'relative', overflow: 'hidden',
                        boxShadow: isSel ? 'inset 0 0 0 3px var(--accent)' : 'none',
                      }}
                    >
                      <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, fontSize: 9.5, color: fg, opacity: 0.92, padding: '0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.title}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* 명도/온도 스파크라인 — 색 흐름의 변화를 선으로도 본다 */}
              <Sparkline scenes={scenes} widths={scenes.map(widthPct)} />
            </>
          )}
        </div>

        {/* ── 선택 장면 색 편집 ── */}
        {selected && (
          <div style={panel}>
            <div style={sectionTitle}>색 편집 · {selected.title || '장면'}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* 미리보기 + hex 입력 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 120, flexShrink: 0 }}>
                <div style={{ height: 64, borderRadius: 10, background: selected.hex, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: readableText(selected.hex), fontSize: 11, fontWeight: 600 }}>
                  {warmthWord(warmth(selected.hex))}
                </div>
                <input
                  value={selected.hex}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase()
                    patchScene(selected.id, { hex: v }) // 입력 중 자유 편집
                  }}
                  onBlur={(e) => { const n = normHex(e.target.value); if (n) patchScene(selected.id, { hex: n }); else { patchScene(selected.id, { hex: hslToHex(selHsl.h, selHsl.s, selHsl.l) }); flashNote('hex 형식이 올바르지 않아 되돌렸어요(#RRGGBB).') } }}
                  spellCheck={false}
                  maxLength={7}
                  aria-label="hex 색상 코드"
                  style={{ fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '6px 4px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
                />
              </div>
              {/* HSL 슬라이더 */}
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <SliderRow label="H" value={selHsl.h} min={0} max={360}
                  track={`linear-gradient(90deg, hsl(0 ${selHsl.s}% ${selHsl.l}%), hsl(60 ${selHsl.s}% ${selHsl.l}%), hsl(120 ${selHsl.s}% ${selHsl.l}%), hsl(180 ${selHsl.s}% ${selHsl.l}%), hsl(240 ${selHsl.s}% ${selHsl.l}%), hsl(300 ${selHsl.s}% ${selHsl.l}%), hsl(360 ${selHsl.s}% ${selHsl.l}%))`}
                  onChange={(v) => setSelHsl({ h: v })} suffix="°" />
                <SliderRow label="S" value={selHsl.s} min={0} max={100}
                  track={`linear-gradient(90deg, hsl(${selHsl.h} 0% ${selHsl.l}%), hsl(${selHsl.h} 100% ${selHsl.l}%))`}
                  onChange={(v) => setSelHsl({ s: v })} suffix="%" />
                <SliderRow label="L" value={selHsl.l} min={0} max={100}
                  track={`linear-gradient(90deg, #000, hsl(${selHsl.h} ${selHsl.s}% 50%), #fff)`}
                  onChange={(v) => setSelHsl({ l: v })} suffix="%" />
              </div>
            </div>

            {/* 무드 프리셋 */}
            <div style={{ marginTop: 10 }}>
              <div style={{ ...labelCss, width: 'auto', marginBottom: 5 }}>무드 프리셋</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {MOOD_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => patchScene(selected.id, { hex: p.hex })}
                    title={`${p.name} ${p.hex}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', borderRadius: 20,
                      border: '1px solid ' + (selected.hex === p.hex ? 'var(--accent)' : 'var(--border)'),
                      background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 비중 슬라이더 + 메모 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ ...labelCss, width: 'auto' }}>비중(길이)</span>
              <input type="range" min={1} max={10} step={1} value={selected.weight} onChange={(e) => patchScene(selected.id, { weight: clampWeight(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="장면 비중" />
              <span style={{ fontSize: 12, fontWeight: 700, width: 18, textAlign: 'right' }}>{selected.weight}</span>
            </div>
            <input
              value={selected.note}
              onChange={(e) => patchScene(selected.id, { note: e.target.value })}
              placeholder="이 장면의 분위기/사건 한 줄 (선택)"
              maxLength={120}
              aria-label="장면 메모"
              style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
            />
          </div>
        )}

        {/* ── 장면 목록(순서/CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>장면 순서</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{scenes.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={reverseAll} disabled={scenes.length < 2} title="순서 뒤집기">⇄ 역순</button>
            <button className="minibtn" onClick={resetAll} title="예시 3막 흐름으로 초기화">초기화</button>
            <button className="btn-primary" onClick={() => addScene()}>＋ 장면</button>
          </div>

          {scenes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '20px 8px' }}>
              아직 장면이 없어요.<br /><b>＋ 장면</b>으로 만들고 위에서 색을 칠하세요.<br />좌측 원고/자료 파일을 끌어다 놓아도 장면이 됩니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scenes.map((s, i) => {
                const isSel = s.id === selId
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => { dragId.current = s.id; try { e.dataTransfer.effectAllowed = 'move' } catch { /* noop */ } }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) }}
                    onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                    onDrop={(e) => { e.stopPropagation(); onReorderDrop(s.id) }}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => setSelId(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 9, cursor: 'pointer',
                      background: isSel ? 'var(--chrome-2)' : 'var(--paper)',
                      border: '1px solid ' + (isSel ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === s.id ? '2px dashed var(--accent)' : 'none', outlineOffset: -1,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', width: 16, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: s.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <input
                      value={s.title}
                      onChange={(e) => patchScene(s.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`장면 ${i + 1}`}
                      maxLength={40}
                      aria-label="장면 제목"
                      style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, padding: '4px 6px', borderRadius: 6, border: '1px solid transparent', background: 'transparent', color: 'var(--text)' }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>{s.hex}</span>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, -1)} disabled={i === 0} title="앞으로" aria-label="앞으로 이동">◀</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, 1)} disabled={i === scenes.length - 1} title="뒤로" aria-label="뒤로 이동">▶</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => duplicateScene(s.id)} title="복제" aria-label="복제">⧉</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeScene(s.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 분위기 흐름 진단 ── */}
        {analysis && (
          <div style={{ ...panel, borderLeft: `3px solid ${toneColor(analysis.msgs[0].tone)}` }}>
            <div style={sectionTitle}>분위기 흐름 진단</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              <span>평균 색변화 <strong style={{ color: 'var(--text)' }}>{analysis.avgJump.toFixed(2)}</strong></span>
              <span>최대 색변화 <strong style={{ color: 'var(--text)' }}>{analysis.maxJump.toFixed(2)}</strong></span>
              <span>명도폭 <strong style={{ color: 'var(--text)' }}>{analysis.lumRange.toFixed(2)}</strong></span>
              <span>온도추세 <strong style={{ color: 'var(--text)' }}>{analysis.trend > 0.1 ? '따뜻해짐' : analysis.trend < -0.1 ? '차가워짐' : '평탄'}</strong></span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {analysis.msgs.map((m, i) => (
                <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: m.tone === 'muted' ? 'var(--text)' : toneColor(m.tone) }}>{m.text}</li>
              ))}
            </ul>
            {analysis.maxJump > 0.5 && (
              <div style={{ ...hint, marginTop: 8 }}>가장 큰 색 전환은 <b>{scenes[analysis.maxJumpIdx]?.title || analysis.maxJumpIdx + 1}번</b> → <b>{scenes[analysis.maxJumpIdx + 1]?.title || analysis.maxJumpIdx + 2}번</b> 사이입니다. 작품의 전환점일 가능성이 높아요.</div>
            )}
          </div>
        )}

        {/* ── 연계 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!scenes.length || !hasProjectBridge()}
            title={hasProjectBridge() ? '컬러 스크립트(색 띠·장면·진단)를 프로젝트 자료의 "분위기 메모"에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
          {hasStash() && (
            <button className="linkbtn" onClick={toStash} disabled={!scenes.length} title="컬러 스크립트 요약을 수집함에 담기"><Emoji e="📥" /> 수집함에 담기</button>
          )}
        </div>

        <div style={hint}>
          타임라인의 색 칸을 누르면 그 장면이 선택되고, 위에서 색·비중·메모를 편집합니다. ⠿ 드래그 또는 ◀▶로 순서를 바꾸세요.
          '비중대로 너비'를 켜면 장면 길이(체감 시간)에 맞춰 띠 너비가 달라집니다. 모든 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}

// ── 보조 컴포넌트: HSL 슬라이더 한 줄 ──
function SliderRow({ label, value, min, max, track, onChange, suffix }: {
  label: string; value: number; min: number; max: number; track: string; onChange: (v: number) => void; suffix: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0, fontWeight: 700 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} 값`}
        style={{
          flex: 1, height: 14, appearance: 'none', WebkitAppearance: 'none',
          background: track, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--text)', width: 38, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{value}{suffix}</span>
    </div>
  )
}

// ── 보조 컴포넌트: 명도/온도 스파크라인(SVG) ──
// 색 띠 아래에 명도(밝기)와 온도(따뜻함/차가움)의 흐름을 두 선으로 겹쳐 보여준다.
function Sparkline({ scenes, widths }: { scenes: Scene[]; widths: number[] }) {
  if (scenes.length < 2) return null
  const W = 600, H = 56, PAD = 6
  // 각 장면의 중심 x 좌표 = 누적 너비의 중간
  let acc = 0
  const xs = scenes.map((_, i) => {
    const start = acc
    acc += widths[i]
    return PAD + ((start + widths[i] / 2) / 100) * (W - PAD * 2)
  })
  const lumY = (hex: string) => H - PAD - luminance(hex) * (H - PAD * 2)      // 밝을수록 위
  const warmY = (hex: string) => {
    const w = (warmth(hex) + 1) / 2 // 0~1
    return H - PAD - w * (H - PAD * 2) // 따뜻할수록 위
  }
  const lumPath = scenes.map((s, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${lumY(s.hex).toFixed(1)}`).join(' ')
  const warmPath = scenes.map((s, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${warmY(s.hex).toFixed(1)}`).join(' ')
  return (
    <div style={{ marginTop: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxHeight: 60 }} role="img" aria-label="명도와 색 온도 흐름">
        <path d={lumPath} fill="none" stroke="var(--muted)" strokeWidth={1.6} strokeDasharray="3 3" strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        <path d={warmPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {scenes.map((s, i) => (
          <g key={s.id}>
            <circle cx={xs[i]} cy={warmY(s.hex)} r={2.6} fill={s.hex} stroke="var(--paper)" strokeWidth={1} />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
        <span><span style={{ color: 'var(--accent)' }}>━</span> 색 온도(위=따뜻)</span>
        <span><span style={{ color: 'var(--muted)' }}>┄</span> 명도(위=밝음)</span>
      </div>
    </div>
  )
}
