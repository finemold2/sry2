// 긴장도 그래프 — 장면들을 순서대로 나열하고 각 장면의 긴장/위기 수치(0~100)를
// SVG 위에 점으로 찍어 꺾은선 곡선으로 페이싱을 시각화한다.
//  · 점을 직접 드래그(포인터 이벤트)해 수치를 즉시 조절(라이브러리 없이 직접 구현).
//  · 장면 추가/삭제/이름변경/순서이동(▲▼ + 목록 드래그) CRUD 완비.
//  · 평탄 구간(연속해서 변화가 거의 없는 장면들) 자동 경고 — 페이싱 지루함 진단.
//  · localStorage 'sry:tool:tension-graph' 자동 저장/복원. addToProject 연계.
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬·외부 미디어/네트워크 불필요.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'tension-graph', name: '긴장도 그래프', icon: '📉', group: '구상·정리', intro: '장면별 긴장·위기 수치(0~100)를 점으로 찍어 페이싱 곡선으로 시각화하고 평탄 구간을 경고합니다', w: 720, h: 600 }

const LS_KEY = 'sry:tool:tension-graph'
const MINV = 0
const MAXV = 100

interface Scene { id: string; name: string; value: number }
interface SaveShape { title: string; scenes: Scene[] }

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampValue(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.min(MAXV, Math.max(MINV, v))
}
function defaultScenes(): Scene[] {
  return [
    { id: newId(), name: '발단', value: 15 },
    { id: newId(), name: '전개', value: 35 },
    { id: newId(), name: '위기', value: 60 },
    { id: newId(), name: '절정', value: 90 },
    { id: newId(), name: '결말', value: 25 },
  ]
}
// localStorage 복원 — 미지원/손상 시 graceful.
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', scenes: defaultScenes() }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', scenes: defaultScenes() }
    const scenes: Scene[] = Array.isArray(p.scenes)
      ? p.scenes
          .filter((s: any) => s && typeof s === 'object')
          .map((s: any) => ({ id: String(s.id || newId()), name: String(s.name ?? ''), value: clampValue(s.value) }))
      : defaultScenes()
    return { title: typeof p.title === 'string' ? p.title : '', scenes }
  } catch { return { title: '', scenes: defaultScenes() } }
}

// 긴장값 → 색 (낮으면 차분, 높으면 위기 강조)
function valueColor(v: number): string {
  if (v >= 75) return 'var(--warn)'
  if (v >= 45) return 'var(--accent)'
  return 'var(--ok)'
}
// 긴장값 → 라벨
function valueLabel(v: number): string {
  if (v >= 85) return '극도의 위기'
  if (v >= 65) return '고조'
  if (v >= 45) return '긴장'
  if (v >= 25) return '잔잔'
  return '평온'
}

// 평탄 구간 탐지: 인접 변화량이 임계 이하로 연속되는 길이 ≥ 3 (3개 장면 이상 거의 변화 없음)
const FLAT_DELTA = 8        // 인접 장면 간 변화가 이 값 이하이면 '거의 같음'으로 간주
const FLAT_MIN_LEN = 3      // 거의 같은 장면이 이만큼 연속되면 평탄 구간 경고
interface FlatRun { start: number; end: number } // 장면 인덱스 [start..end] 포함

function findFlatRuns(scenes: Scene[]): FlatRun[] {
  const runs: FlatRun[] = []
  if (scenes.length < FLAT_MIN_LEN) return runs
  let runStart = 0
  for (let i = 1; i <= scenes.length; i++) {
    const cont = i < scenes.length && Math.abs(scenes[i].value - scenes[i - 1].value) <= FLAT_DELTA
    if (!cont) {
      const len = i - runStart // 포함 장면 수
      if (len >= FLAT_MIN_LEN) runs.push({ start: runStart, end: i - 1 })
      runStart = i
    }
  }
  return runs
}

export default function TensionGraph({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [scenes, setScenes] = useState<Scene[]>(init.current.scenes)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const dragId = useRef<string | null>(null)        // 목록 행 드래그(순서 변경)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [activePoint, setActivePoint] = useState<string | null>(null) // 그래프에서 드래그 중인 점
  const svgRef = useRef<SVGSVGElement | null>(null)
  const draggingPoint = useRef<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 들어온 제목(연계로 열렸을 때) 한 번 반영
  useEffect(() => {
    if (payload && typeof payload.title === 'string' && payload.title && !init.current.title) {
      setTitle(String(payload.title))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, scenes } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, scenes])

  // 복사 안내 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  // 프로젝트 추가 토스트 자동 소거.
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2000)
    return () => window.clearTimeout(t)
  }, [saved])

  // ── SVG 좌표 계산 ──────────────────────────────────────────
  const VBW = 680, VBH = 300
  const PADL = 38, PADR = 16, PADT = 18, PADB = 40
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const xAt = (i: number) => scenes.length <= 1 ? PADL + plotW / 2 : PADL + (i / (scenes.length - 1)) * plotW
  const yAt = (v: number) => PADT + (1 - (v - MINV) / (MAXV - MINV)) * plotH // 100 위, 0 아래
  const valFromY = (y: number) => clampValue(MINV + (1 - (y - PADT) / plotH) * (MAXV - MINV))
  // 점이 위치한 x 좌표에서 인덱스를 역산(드래그 중 가장 가까운 점)
  const indexFromX = (x: number) => {
    if (scenes.length <= 1) return 0
    const f = (x - PADL) / plotW * (scenes.length - 1)
    return Math.min(scenes.length - 1, Math.max(0, Math.round(f)))
  }

  const pts = scenes.map((s, i) => ({ x: xAt(i), y: yAt(s.value), s }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  // 곡선 아래 영역(시각적 채움)
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${yAt(0).toFixed(1)} L${pts[0].x.toFixed(1)},${yAt(0).toFixed(1)} Z`
    : ''

  // ── 그래프 점 드래그(포인터 이벤트로 직접 구현) ───────────────
  // SVG 클라이언트 좌표를 viewBox 좌표로 변환
  const clientToVB = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    if (!r.width || !r.height) return { x: 0, y: 0 }
    return { x: (clientX - r.left) / r.width * VBW, y: (clientY - r.top) / r.height * VBH }
  }
  const setValue = (id: string, v: number) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, value: clampValue(v) } : s)))
  }
  // 전역 포인터 이동/해제 — 드래그 중에만 부착, 반드시 정리.
  useEffect(() => {
    if (!draggingPoint.current) return
    const onMove = (e: PointerEvent) => {
      const id = draggingPoint.current
      if (!id) return
      const { y } = clientToVB(e.clientX, e.clientY)
      setValue(id, valFromY(y))
    }
    const onUp = () => {
      draggingPoint.current = null
      if (mounted.current) setActivePoint(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // activePoint 변경(드래그 시작) 시 리스너를 (재)부착
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoint])

  const startPointDrag = (id: string, e: React.PointerEvent) => {
    e.preventDefault()
    draggingPoint.current = id
    setActivePoint(id)
  }
  // SVG 빈 영역 클릭/드래그 — 가장 가까운 점을 잡아 조절(점이 작아도 쉽게)
  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (scenes.length === 0) return
    const { x, y } = clientToVB(e.clientX, e.clientY)
    const i = indexFromX(x)
    const s = scenes[i]
    if (!s) return
    draggingPoint.current = s.id
    setActivePoint(s.id)
    setValue(s.id, valFromY(y))
  }

  // ── CRUD ─────────────────────────────────────────────────
  const addScene = () => {
    setScenes((prev) => {
      const last = prev[prev.length - 1]
      const n = prev.length + 1
      return [...prev, { id: newId(), name: `장면 ${n}`, value: last ? clampValue(last.value) : 30 }]
    })
  }
  const removeScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const startEdit = (s: Scene) => { setEditingId(s.id); setEditName(s.name) }
  const cancelEdit = () => { setEditingId(null); setEditName('') }
  const commitEdit = () => {
    if (!editingId) return
    const nm = editName.trim()
    setScenes((prev) => prev.map((s) => (s.id === editingId ? { ...s, name: nm || s.name } : s)))
    setEditingId(null); setEditName('')
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
  // 목록 행 드래그 순서 변경 (HTML5 DnD)
  const onRowDrop = (targetId: string) => {
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
  const resetAll = () => { setScenes(defaultScenes()); setEditingId(null) }

  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // ── 좌측 바인더 파일 드롭 → 장면으로 추가 ───────────────────
  const onLibDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropActive) setDropActive(true) }
  }
  const onLibDragLeave = () => { if (dropActive) setDropActive(false) }
  const onLibDrop = (e: React.DragEvent) => {
    setDropActive(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    setScenes((prev) => [...prev, { id: newId(), name: item.title || `장면 ${prev.length + 1}`, value: 40 }])
  }

  // ── 평탄 구간 + 페이싱 진단 ─────────────────────────────────
  const flatRuns = findFlatRuns(scenes)
  const flatIdx = new Set<number>()
  flatRuns.forEach((r) => { for (let i = r.start; i <= r.end; i++) flatIdx.add(i) })
  const vals = scenes.map((s) => s.value)
  const deltas: number[] = []
  for (let i = 1; i < vals.length; i++) deltas.push(Math.abs(vals[i] - vals[i - 1]))
  const avgSwing = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
  const peak = vals.length ? Math.max(...vals) : 0
  const peakIdx = vals.indexOf(peak)
  const range = vals.length ? peak - Math.min(...vals) : 0

  let diagnosis = ''
  let diagColor = 'var(--muted)'
  if (scenes.length < 2) {
    diagnosis = '장면을 2개 이상 두면 페이싱을 진단합니다.'
  } else if (flatRuns.length > 0) {
    const segs = flatRuns.map((r) => `${r.start + 1}~${r.end + 1}장면`).join(', ')
    diagnosis = `평탄 구간 발견(${segs}). 긴장의 변화가 거의 없어 독자가 지루할 수 있어요 — 작은 위기/반전이나 완급의 밀고 당김을 넣어 보세요.`
    diagColor = 'var(--warn)'
  } else if (range <= 15 && avgSwing < 8) {
    diagnosis = '곡선 전체가 평평합니다. 절정과 저점의 대비를 키워 페이싱에 굴곡을 주세요.'
    diagColor = 'var(--warn)'
  } else if (avgSwing >= 35) {
    diagnosis = '장면마다 긴장이 급격히 오르내립니다. 너무 잦은 출렁임은 피로를 줄 수 있어요 — 완급을 다듬어 보세요.'
    diagColor = 'var(--warn)'
  } else if (peakIdx >= 0 && peakIdx < scenes.length - 1 && peak >= 70) {
    diagnosis = `절정(${peakIdx + 1}장면, ${peak})이 후반부에 자리하고 굴곡도 충분합니다. 좋은 페이싱이에요.`
    diagColor = 'var(--ok)'
  } else {
    diagnosis = '변화는 있으나 절정이 약하거나 이릅니다. 클라이맥스의 긴장을 더 끌어올려 보세요.'
    diagColor = 'var(--muted)'
  }

  // ── 텍스트 내보내기/복사 ───────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[긴장도 그래프] ${title.trim()}` : '[긴장도 그래프]')
    lines.push('')
    scenes.forEach((s, i) => {
      const flat = flatIdx.has(i) ? ' (평탄)' : ''
      lines.push(`${i + 1}. ${s.name || '(이름 없음)'} : ${s.value} (${valueLabel(s.value)})${flat}`)
    })
    lines.push('')
    if (scenes.length >= 2) {
      lines.push(`최고 긴장: ${peak}${peakIdx >= 0 ? ` (${peakIdx + 1}장면)` : ''} / 진폭: ${range} / 평균 변화량: ${avgSwing.toFixed(1)}`)
      lines.push(`진단: ${diagnosis}`)
    }
    return lines.join('\n')
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

  // ── 프로젝트 연동 ──────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>긴장도 그래프</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 장면 ${scenes.length}개</p>`)
    parts.push('<ol>')
    scenes.forEach((s, i) => {
      const flat = flatIdx.has(i) ? ' — 평탄 구간' : ''
      parts.push(`<li>${esc(s.name || `장면 ${i + 1}`)} : ${s.value} (${esc(valueLabel(s.value))})${flat}</li>`)
    })
    parts.push('</ol>')
    if (scenes.length >= 2) {
      parts.push(`<p>최고 긴장 ${peak}${peakIdx >= 0 ? ` (${peakIdx + 1}장면)` : ''} · 진폭 ${range} · 평균 변화량 ${avgSwing.toFixed(1)}</p>`)
      parts.push(`<p>진단: ${esc(diagnosis)}</p>`)
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge() || scenes.length === 0) return
    const meta: Record<string, string> = { 장면수: String(scenes.length) }
    if (scenes.length >= 2) {
      meta['최고긴장'] = String(peak)
      meta['진폭'] = String(range)
      meta['평균변화량'] = avgSwing.toFixed(1)
      if (flatRuns.length) meta['평탄구간'] = String(flatRuns.length)
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `긴장도 그래프 — ${title.trim()}` : '긴장도 그래프',
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 연결되지 않았습니다.')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '24px 8px' }

  return (
    <div style={wrap} onDragOver={onLibDragOver} onDragLeave={onLibDragLeave} onDrop={onLibDrop}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="📉"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/페이싱 제목 (선택)" maxLength={80} aria-label="긴장도 그래프 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || scenes.length === 0}
          title={hasProjectBridge() ? (scenes.length === 0 ? '추가할 장면이 없습니다' : '자료 › 구조 폴더에 긴장도 그래프 문서로 추가') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 프로젝트 자료(구조)에 긴장도 그래프 문서를 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {dropActive && <div style={{ ...hint, color: 'var(--accent)', padding: '6px 14px 0' }}>여기에 놓으면 그 파일이 새 장면으로 추가됩니다.</div>}

      <div style={body}>
        {/* ── 긴장도 곡선 시각화 (점 드래그) ── */}
        <div style={panel}>
          <div style={sectionTitle}>긴장도 곡선 · 위(100)는 위기 고조, 아래(0)는 평온 · 점을 위아래로 드래그해 조절</div>
          {scenes.length === 0 ? (
            <div style={empty}>장면을 추가하면 긴장도 곡선이 그려집니다.</div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VBW} ${VBH}`}
              width="100%"
              style={{ display: 'block', maxHeight: 320, touchAction: 'none', userSelect: 'none', cursor: activePoint ? 'ns-resize' : 'crosshair' }}
              role="img"
              aria-label="긴장도 곡선 그래프"
              onPointerDown={onSvgPointerDown}
            >
              {/* 가로 격자선 + Y 라벨 (0 ~ 100) */}
              {[0, 25, 50, 75, 100].map((v) => {
                const y = yAt(v)
                const major = v === 50
                return (
                  <g key={v}>
                    <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={major ? 1.5 : 1} strokeDasharray={major ? undefined : '2 4'} opacity={major ? 0.8 : 0.45} />
                    <text x={PADL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{v}</text>
                  </g>
                )
              })}

              {/* 평탄 구간 음영(경고) */}
              {flatRuns.map((r, k) => {
                const x1 = xAt(r.start)
                const x2 = xAt(r.end)
                return (
                  <rect
                    key={'flat' + k}
                    x={Math.min(x1, x2) - 6}
                    y={PADT}
                    width={Math.abs(x2 - x1) + 12}
                    height={plotH}
                    fill="var(--warn)"
                    opacity={0.1}
                  >
                    <title>평탄 구간 — 긴장 변화가 거의 없습니다</title>
                  </rect>
                )
              })}

              {/* 곡선 아래 채움 */}
              {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.08} />}
              {/* 곡선 */}
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

              {/* 점 + 라벨 (드래그 핸들) */}
              {pts.map((p, i) => {
                const isActive = activePoint === p.s.id
                const isFlat = flatIdx.has(i)
                const isPeak = i === peakIdx && peak >= 70 && scenes.length >= 2
                return (
                  <g key={p.s.id}>
                    {/* 잡기 쉬운 투명 히트영역 */}
                    <circle cx={p.x} cy={p.y} r={14} fill="transparent" style={{ cursor: 'ns-resize' }} onPointerDown={(e) => startPointDrag(p.s.id, e)} />
                    {/* 절정 표시 */}
                    {isPeak && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="var(--warn)" strokeWidth={1} opacity={0.5} />}
                    <circle
                      cx={p.x} cy={p.y}
                      r={isActive ? 7 : 5}
                      fill={valueColor(p.s.value)}
                      stroke={isFlat ? 'var(--warn)' : 'var(--paper)'}
                      strokeWidth={isFlat ? 2 : 1.5}
                      style={{ cursor: 'ns-resize', pointerEvents: 'none' }}
                    >
                      <title>{`${p.s.name || `장면 ${i + 1}`}: ${p.s.value} (${valueLabel(p.s.value)})`}</title>
                    </circle>
                    {/* 드래그 중 값 말풍선 */}
                    {isActive && (
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--text)">{p.s.value}</text>
                    )}
                    {/* X축 장면 이름 */}
                    <text x={p.x} y={VBH - 14} textAnchor="middle" fontSize={9.5} fill={isFlat ? 'var(--warn)' : 'var(--muted)'}>
                      {(p.s.name || `${i + 1}`).length > 6 ? (p.s.name || `${i + 1}`).slice(0, 6) + '…' : (p.s.name || `${i + 1}`)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
          {scenes.length > 0 && (
            <div style={{ ...hint, marginTop: 6 }}>점을 위아래로 끌어 긴장 수치를 조절하세요. 곡선 아무 곳이나 눌러도 가장 가까운 장면이 잡힙니다.</div>
          )}
        </div>

        {/* ── 페이싱 진단 / 평탄 구간 경고 ── */}
        <div style={{ ...panel, borderLeft: `3px solid ${diagColor}` }}>
          <div style={sectionTitle}>페이싱 진단</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: diagColor === 'var(--muted)' ? 'var(--text)' : diagColor }}>
            {diagColor === 'var(--warn)' ? <><Emoji e="⚠"/> </> : diagColor === 'var(--ok)' ? <>✓ </> : ''}{diagnosis}
          </div>
          {scenes.length >= 2 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>최고 긴장 <strong style={{ color: 'var(--text)' }}>{peak}</strong></span>
              <span>진폭 <strong style={{ color: 'var(--text)' }}>{range}</strong></span>
              <span>평균 변화량 <strong style={{ color: 'var(--text)' }}>{avgSwing.toFixed(1)}</strong></span>
              {flatRuns.length > 0 && <span style={{ color: 'var(--warn)' }}>평탄 구간 <strong>{flatRuns.length}</strong></span>}
            </div>
          )}
        </div>

        {/* ── 장면 목록 편집 (CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>장면</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{scenes.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetAll} title="기본 5장 구조로 초기화">초기화</button>
            <button className="btn-primary" onClick={addScene}>＋ 장면 추가</button>
          </div>

          {scenes.length === 0 ? (
            <div style={empty}>
              아직 장면이 없어요.<br />
              <b>＋ 장면 추가</b>로 장면을 만들고<br />그래프의 점을 드래그하거나 슬라이더로 긴장 수치를 정해 보세요.<br />
              <span style={{ fontSize: 12 }}>좌측 파일을 이 창에 끌어다 놓아 장면으로 담을 수도 있어요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenes.map((s, i) => {
                const isEd = editingId === s.id
                const isFlat = flatIdx.has(i)
                return (
                  <div
                    key={s.id}
                    draggable={!isEd}
                    onDragStart={() => { if (!isEd) dragId.current = s.id }}
                    onDragOver={(e) => { if (dragId.current) { e.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) } }}
                    onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                    onDrop={() => onRowDrop(s.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    style={{
                      background: 'var(--chrome-2)', borderRadius: 10, padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderLeft: isFlat ? '3px solid var(--warn)' : '1px solid var(--border)',
                      outline: dragOver === s.id ? '2px dashed var(--accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)', width: 18, textAlign: 'right' }}>{i + 1}</span>
                      {isEd ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={commitEdit}
                          autoFocus
                          maxLength={40}
                          aria-label="장면 이름 수정"
                          style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                          onClick={() => startEdit(s)}
                          title="클릭해서 이름 수정"
                        >{s.name || `장면 ${i + 1}`}{isFlat && <span style={{ color: 'var(--warn)', fontSize: 11, marginLeft: 6 }}>평탄</span>}</span>
                      )}
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>{valueLabel(s.value)}</span>
                      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, width: 30, textAlign: 'right', color: valueColor(s.value) }}>{s.value}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, -1)} disabled={i === 0} title="앞으로" aria-label="앞으로 이동">▲</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, 1)} disabled={i === scenes.length - 1} title="뒤로" aria-label="뒤로 이동">▼</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => startEdit(s)} title="이름 수정" aria-label="이름 수정"><Emoji e="✏️"/></button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeScene(s.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 16 }}>0</span>
                      <input
                        type="range" min={MINV} max={MAXV} step={1} value={s.value}
                        onChange={(e) => setValue(s.id, Number(e.target.value))}
                        style={{ flex: 1, accentColor: valueColor(s.value) }}
                        aria-label={`${s.name || `장면 ${i + 1}`} 긴장 수치`}
                      />
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 22, textAlign: 'right' }}>100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={hint}>장면 이름을 클릭하거나 <Emoji e="✏️"/>로 바꾸고, 그래프 점 드래그·슬라이더로 긴장(0~100)을 정하세요. ⠿ 드래그 또는 ▲▼로 순서를 바꿀 수 있어요. 평탄 구간은 <Emoji e="⚠"/>로 표시됩니다. 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
