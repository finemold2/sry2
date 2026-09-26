// 세계 지도 스케치 — 격자에 지형 타일(바다·평야·숲·산·사막·도시)을 칠해 가상 세계의 지도를 손쉽게 그린다.
// 팔레트에서 지형을 고르고, 캔버스를 드래그해 채우거나 지우며, 지명 라벨을 원하는 칸에 찍는다.
// 격자·라벨·크기는 localStorage('sry:tool:world-map-sketch')에 자동 저장/복원한다.
// 산출: ① PNG 다운로드(로컬 캔버스 → toDataURL, 외부 의존 없음) ② 텍스트 범례를 프로젝트(자료 > '세계관')에 추가.
// react / './linkbus' 외 import 없음 · 외부 네트워크/라이브러리 없음(완전 로컬) · 언마운트 시 타이머 정리.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'world-map-sketch', name: '세계 지도 스케치', icon: '🗺️', group: '분위기·시각', intro: '격자에 지형 타일을 칠해 가상 세계 지도를 그리고 PNG·범례로 내보내세요', w: 640, h: 680 }

const NS = 'sry:tool:world-map-sketch'

// HTML escape(&,<,>) — addToProject bodyHtml 안전화
function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 지형 팔레트(고정). 'erase'는 빈 칸(바다 아님, 미지의 영역)으로 되돌린다.
interface Terrain { id: string; label: string; color: string; icon: string }
const TERRAINS: Terrain[] = [
  { id: 'sea', label: '바다', color: '#2E6FA7', icon: '🌊' },
  { id: 'plain', label: '평야', color: '#8FBF6B', icon: '🌾' },
  { id: 'forest', label: '숲', color: '#2F7A47', icon: '🌲' },
  { id: 'mountain', label: '산', color: '#8A7B66', icon: '⛰️' },
  { id: 'desert', label: '사막', color: '#E3CB7E', icon: '🏜️' },
  { id: 'city', label: '도시', color: '#C24B4B', icon: '🏙️' },
]
const TERRAIN_BY_ID: Record<string, Terrain> = Object.fromEntries(TERRAINS.map((t) => [t.id, t]))
const EMPTY_COLOR = '#0E1726' // 빈 칸(미지의 영역)
const GRID_COLOR = 'rgba(255,255,255,0.10)'

// 선택 가능한 격자 크기(가로×세로) 프리셋
const SIZE_PRESETS: { cols: number; rows: number }[] = [
  { cols: 12, rows: 9 },
  { cols: 16, rows: 12 },
  { cols: 20, rows: 14 },
  { cols: 24, rows: 18 },
  { cols: 30, rows: 20 },
]
const DEFAULT_COLS = 20
const DEFAULT_ROWS = 14
const isValidSize = (c: number, r: number) => SIZE_PRESETS.some((s) => s.cols === c && s.rows === r)
const CELL = 28 // 셀 픽셀 크기(캔버스 렌더 기준)

interface LabelMark { id: string; x: number; y: number; text: string }
interface State {
  cols: number
  rows: number
  // 셀 지형: 행*열 1차원 배열. 빈 칸은 '' (미지의 영역)
  cells: string[]
  labels: LabelMark[]
}

function blankCells(cols: number, rows: number): string[] {
  return new Array(cols * rows).fill('')
}

const DEFAULT_STATE: State = {
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  cells: blankCells(DEFAULT_COLS, DEFAULT_ROWS),
  labels: [],
}

function uid(): string {
  return 'lb_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// 저장 상태 로드 — 크기와 셀 배열 길이가 어긋나면 안전하게 보정한다.
function loadState(): State {
  try {
    const raw = localStorage.getItem(NS)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object') {
        const cols = isValidSize(p.cols, p.rows) ? p.cols : DEFAULT_COLS
        const rows = isValidSize(p.cols, p.rows) ? p.rows : DEFAULT_ROWS
        const need = cols * rows
        let cells: string[] = Array.isArray(p.cells) ? p.cells.map((c: unknown) => (typeof c === 'string' && TERRAIN_BY_ID[c] ? c : '')) : []
        if (cells.length !== need) {
          const fixed = blankCells(cols, rows)
          for (let i = 0; i < Math.min(cells.length, need); i++) fixed[i] = cells[i]
          cells = fixed
        }
        const labels: LabelMark[] = Array.isArray(p.labels)
          ? p.labels
              .filter((l: unknown) => l && typeof l === 'object')
              .map((l: { id?: string; x?: number; y?: number; text?: string }) => ({
                id: typeof l.id === 'string' ? l.id : uid(),
                x: Math.max(0, Math.min(cols - 1, Math.round(Number(l.x) || 0))),
                y: Math.max(0, Math.min(rows - 1, Math.round(Number(l.y) || 0))),
                text: String(l.text || '').slice(0, 40),
              }))
              .filter((l: LabelMark) => l.text.trim() !== '')
          : []
        return { cols, rows, cells, labels }
      }
    }
  } catch { /* 미지원/거부/파싱실패 graceful */ }
  return { ...DEFAULT_STATE, cells: blankCells(DEFAULT_COLS, DEFAULT_ROWS) }
}

type Mode = 'paint' | 'erase' | 'label'

export default function WorldMapSketch({ payload: _payload }: { payload?: Record<string, unknown> }) {
  const [st, setSt] = useState<State>(loadState)
  const [brush, setBrush] = useState<string>('plain')   // 선택된 지형
  const [mode, setMode] = useState<Mode>('paint')        // 칠하기 / 지우기 / 라벨
  const [supported, setSupported] = useState(true)
  const [savedToProject, setSavedToProject] = useState(false)
  const [copied, setCopied] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')       // 라벨 모드에서 찍을 텍스트
  const [note, setNote] = useState('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const painting = useRef(false)        // 드래그 칠하기 중인지
  const lastCell = useRef<number>(-1)   // 드래그 중복 적용 방지
  const mounted = useRef(true)
  const projTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (projTimer.current !== null) clearTimeout(projTimer.current)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(NS, JSON.stringify(st)) } catch { /* 저장 실패 graceful */ }
  }, [st])

  const CW = st.cols * CELL
  const CH = st.rows * CELL

  // 캔버스 렌더 — 셀/그리드/라벨을 다시 그린다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try { ctx = canvas.getContext('2d') } catch { ctx = null }
    if (!ctx) { setSupported(false); return }
    setSupported(true)
    const c = ctx

    // 배경(빈 칸 = 미지의 영역)
    c.fillStyle = EMPTY_COLOR
    c.fillRect(0, 0, CW, CH)

    // 셀 채우기
    for (let i = 0; i < st.cells.length; i++) {
      const id = st.cells[i]
      if (!id) continue
      const t = TERRAIN_BY_ID[id]
      if (!t) continue
      const cx = (i % st.cols) * CELL
      const cy = Math.floor(i / st.cols) * CELL
      c.fillStyle = t.color
      c.fillRect(cx, cy, CELL, CELL)
    }

    // 격자선
    c.strokeStyle = GRID_COLOR
    c.lineWidth = 1
    c.beginPath()
    for (let x = 0; x <= st.cols; x++) { c.moveTo(x * CELL + 0.5, 0); c.lineTo(x * CELL + 0.5, CH) }
    for (let y = 0; y <= st.rows; y++) { c.moveTo(0, y * CELL + 0.5); c.lineTo(CW, y * CELL + 0.5) }
    c.stroke()

    // 라벨(지명) — 핀 점 + 글자(테두리로 가독성 확보)
    c.textAlign = 'center'
    c.textBaseline = 'bottom'
    c.font = '600 13px "Malgun Gothic", system-ui, sans-serif'
    for (const lb of st.labels) {
      const px = lb.x * CELL + CELL / 2
      const py = lb.y * CELL + CELL / 2
      // 핀
      c.fillStyle = '#FFFFFF'
      c.beginPath()
      c.arc(px, py, 3.5, 0, Math.PI * 2)
      c.fill()
      c.lineWidth = 1.5
      c.strokeStyle = '#1B1B1B'
      c.stroke()
      // 글자(검은 테두리 + 흰 글자)
      const ty = py - 6
      c.lineWidth = 3
      c.strokeStyle = 'rgba(0,0,0,0.85)'
      c.strokeText(lb.text, px, ty)
      c.fillStyle = '#FFFFFF'
      c.fillText(lb.text, px, ty)
    }
  }, [st, CW, CH])

  // 화면 좌표 → 셀 인덱스
  const cellIndexFromEvent = (clientX: number, clientY: number): { idx: number; gx: number; gy: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    // 캔버스는 CSS로 축소될 수 있으므로 비율 보정
    const scaleX = CW / rect.width
    const scaleY = CH / rect.height
    const px = (clientX - rect.left) * scaleX
    const py = (clientY - rect.top) * scaleY
    const gx = Math.floor(px / CELL)
    const gy = Math.floor(py / CELL)
    if (gx < 0 || gy < 0 || gx >= st.cols || gy >= st.rows) return null
    return { idx: gy * st.cols + gx, gx, gy }
  }

  const applyCell = (idx: number) => {
    setSt((prev) => {
      const next = prev.cells.slice()
      const val = mode === 'erase' ? '' : brush
      if (next[idx] === val) return prev
      next[idx] = val
      return { ...prev, cells: next }
    })
  }

  const addLabel = (gx: number, gy: number) => {
    const text = labelDraft.trim().slice(0, 40)
    if (!text) { setNote('라벨로 찍을 지명을 먼저 입력하세요.'); return }
    setNote('')
    setSt((prev) => ({ ...prev, labels: [...prev.labels, { id: uid(), x: gx, y: gy, text }] }))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!supported) return
    const hit = cellIndexFromEvent(e.clientX, e.clientY)
    if (!hit) return
    if (mode === 'label') { addLabel(hit.gx, hit.gy); return }
    painting.current = true
    lastCell.current = hit.idx
    applyCell(hit.idx)
    try { (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId) } catch { /* 미지원 무시 */ }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current || mode === 'label') return
    const hit = cellIndexFromEvent(e.clientX, e.clientY)
    if (!hit || hit.idx === lastCell.current) return
    lastCell.current = hit.idx
    applyCell(hit.idx)
  }

  const endPaint = () => { painting.current = false; lastCell.current = -1 }

  const clearAll = () => {
    if (!st.cells.some((c) => c) && st.labels.length === 0) return
    setSt((prev) => ({ ...prev, cells: blankCells(prev.cols, prev.rows), labels: [] }))
    setNote('')
  }

  const removeLabel = (id: string) => {
    setSt((prev) => ({ ...prev, labels: prev.labels.filter((l) => l.id !== id) }))
  }

  // 크기 변경 — 기존 칠을 좌상단 기준으로 최대한 보존한다.
  const resize = (cols: number, rows: number) => {
    setSt((prev) => {
      if (prev.cols === cols && prev.rows === rows) return prev
      const next = blankCells(cols, rows)
      const copyCols = Math.min(prev.cols, cols)
      const copyRows = Math.min(prev.rows, rows)
      for (let y = 0; y < copyRows; y++) {
        for (let x = 0; x < copyCols; x++) {
          next[y * cols + x] = prev.cells[y * prev.cols + x] || ''
        }
      }
      const labels = prev.labels.filter((l) => l.x < cols && l.y < rows)
      return { ...prev, cols, rows, cells: next, labels }
    })
  }

  // 통계(범례·면적 요약)
  const counts: Record<string, number> = {}
  for (const id of st.cells) if (id) counts[id] = (counts[id] || 0) + 1
  const total = st.cols * st.rows
  const usedTerrains = TERRAINS.filter((t) => counts[t.id])

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'world-map.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      if (mounted.current) setNote('이 환경에서는 PNG로 저장할 수 없습니다. 다른 브라우저에서 시도해 보세요.')
    }
  }

  // 텍스트 범례 생성(복사·프로젝트 공통)
  const buildLegendText = (): string => {
    const lines: string[] = []
    lines.push(`세계 지도 스케치 (${st.cols}×${st.rows} 격자, 총 ${total}칸)`)
    lines.push('')
    lines.push('[지형 범례]')
    if (usedTerrains.length === 0) {
      lines.push('아직 칠한 지형이 없습니다.')
    } else {
      for (const t of usedTerrains) {
        const n = counts[t.id]
        const pct = Math.round((n / total) * 100)
        lines.push(`${t.icon} ${t.label}: ${n}칸 (${pct}%)`)
      }
    }
    if (st.labels.length) {
      lines.push('')
      lines.push('[지명]')
      for (const lb of st.labels) lines.push(`• ${lb.text} — (${lb.x + 1}열, ${lb.y + 1}행)`)
    }
    return lines.join('\n')
  }

  const copyLegend = () => {
    const text = buildLegendText()
    try {
      navigator.clipboard?.writeText(text).then(() => {
        if (!mounted.current) return
        setCopied(true)
        if (copyTimer.current !== null) clearTimeout(copyTimer.current)
        copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
      }).catch(() => {})
    } catch { /* 클립보드 미지원·권한 거부 무시 */ }
  }

  const addLegendToProject = () => {
    if (!hasProjectBridge()) return
    const terrRows = usedTerrains.length
      ? usedTerrains.map((t) => {
          const n = counts[t.id]
          const pct = Math.round((n / total) * 100)
          return `<li><b>${esc(t.icon + ' ' + t.label)}</b>: ${n}칸 (${pct}%)</li>`
        }).join('')
      : '<li>아직 칠한 지형이 없습니다.</li>'
    const labelRows = st.labels.length
      ? '<p><b>지명</b></p><ul>' + st.labels.map((lb) => `<li>${esc(lb.text)} — (${lb.x + 1}열, ${lb.y + 1}행)</li>`).join('') + '</ul>'
      : ''
    const bodyHtml =
      `<p><b>세계 지도 스케치</b> · ${st.cols}×${st.rows} 격자 (총 ${total}칸)</p>` +
      `<p><b>지형 범례</b></p><ul>${terrRows}</ul>` +
      labelRows +
      `<p style="color:#888">PNG 이미지는 도구에서 "⬇️ PNG 저장"으로 따로 내려받아 보관하세요.</p>`
    const id = addToProject({
      root: 'research',
      folder: '세계관',
      title: `세계 지도 스케치 (${st.cols}×${st.rows})`,
      bodyHtml,
      meta: { 격자: `${st.cols}×${st.rows}`, 지형수: String(usedTerrains.length), 지명수: String(st.labels.length) },
    })
    if (id && mounted.current) {
      setSavedToProject(true)
      if (projTimer.current !== null) clearTimeout(projTimer.current)
      projTimer.current = window.setTimeout(() => { if (mounted.current) setSavedToProject(false) }, 1500)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--accent)', fontWeight: 700 }
  const sectionRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }
  const isEmpty = !st.cells.some((c) => c) && st.labels.length === 0

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, flexShrink: 0 }}>
        팔레트에서 지형을 고르고 격자를 <b>드래그해 칠하세요</b>. 라벨 모드로 지명을 찍고, PNG·범례로 내보낼 수 있습니다.
      </div>

      {/* 팔레트 / 모드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div style={sectionRow}>
          <span style={labelStyle}>지형</span>
          {TERRAINS.map((t) => {
            const active = mode === 'paint' && brush === t.id
            return (
              <button
                key={t.id}
                className="minibtn"
                onClick={() => { setBrush(t.id); setMode('paint') }}
                title={`${t.label}로 칠하기`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  boxShadow: active ? '0 0 0 1px var(--accent) inset' : 'none',
                }}
              >
                <span style={{ width: 13, height: 13, borderRadius: 3, background: t.color, border: '1px solid rgba(0,0,0,0.3)', display: 'inline-block' }} />
                <Emoji e={t.icon} /> {t.label}
              </button>
            )
          })}
        </div>

        <div style={sectionRow}>
          <span style={labelStyle}>모드</span>
          <button
            className="minibtn"
            onClick={() => setMode('paint')}
            style={{ borderColor: mode === 'paint' ? 'var(--accent)' : 'var(--border)', color: mode === 'paint' ? 'var(--accent)' : 'var(--text)' }}
          ><Emoji e="🖌" /> 칠하기</button>
          <button
            className="minibtn"
            onClick={() => setMode('erase')}
            style={{ borderColor: mode === 'erase' ? 'var(--accent)' : 'var(--border)', color: mode === 'erase' ? 'var(--accent)' : 'var(--text)' }}
          ><Emoji e="🧽" /> 지우기</button>
          <button
            className="minibtn"
            onClick={() => setMode('label')}
            style={{ borderColor: mode === 'label' ? 'var(--accent)' : 'var(--border)', color: mode === 'label' ? 'var(--accent)' : 'var(--text)' }}
          ><Emoji e="🏷" /> 라벨</button>

          <span style={{ ...labelStyle, marginLeft: 8 }}>크기</span>
          <select
            value={`${st.cols}x${st.rows}`}
            onChange={(e) => { const [c, r] = e.target.value.split('x').map(Number); resize(c, r) }}
            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
            aria-label="격자 크기"
          >
            {SIZE_PRESETS.map((s) => (
              <option key={`${s.cols}x${s.rows}`} value={`${s.cols}x${s.rows}`}>{s.cols}×{s.rows}</option>
            ))}
          </select>
        </div>

        {/* 라벨 입력(라벨 모드일 때) */}
        {mode === 'label' && (
          <div style={sectionRow}>
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="지명 입력 후 격자를 클릭 (예: 은빛 항구)"
              maxLength={40}
              style={{ flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
            />
          </div>
        )}
      </div>

      {note && <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5, flexShrink: 0 }}>{note}</div>}

      {/* 캔버스(스크롤 가능 영역) */}
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 10 }}>
        {supported ? (
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPaint}
            onPointerLeave={endPaint}
            onPointerCancel={endPaint}
            style={{
              width: CW, height: CH, maxWidth: '100%', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)', touchAction: 'none',
              cursor: mode === 'label' ? 'crosshair' : mode === 'erase' ? 'cell' : 'pointer',
              imageRendering: 'pixelated', display: 'block',
            }}
          />
        ) : (
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
            이 환경에서는 캔버스를 지원하지 않습니다. 설정은 저장되며, 캔버스를 지원하는 브라우저에서 지도를 그릴 수 있습니다.
          </div>
        )}
      </div>

      {/* 빈 상태 안내 */}
      {isEmpty && supported && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, flexShrink: 0 }}>
          아직 빈 지도입니다. 위에서 <b>지형</b>을 고른 뒤 격자를 드래그해 대륙과 바다를 그려 보세요.
        </div>
      )}

      {/* 범례(칠한 지형 요약) */}
      {usedTerrains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
          {usedTerrains.map((t) => {
            const n = counts[t.id]
            const pct = Math.round((n / total) * 100)
            return (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: t.color, border: '1px solid rgba(0,0,0,0.3)', display: 'inline-block' }} />
                {t.label} {pct}%
              </span>
            )
          })}
        </div>
      )}

      {/* 지명 목록(삭제 가능) */}
      {st.labels.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, maxHeight: 96, overflowY: 'auto' }}>
          <span style={labelStyle}>지명 ({st.labels.length})</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {st.labels.map((lb) => (
              <span key={lb.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px' }}>
                <Emoji e="📍" /> {lb.text}
                <button className="minibtn" onClick={() => removeLabel(lb.id)} title="이 지명 삭제" style={{ padding: '0 5px', lineHeight: 1.4 }}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" onClick={downloadPng} disabled={!supported}><Emoji e="⬇️" /> PNG 저장</button>
        <button className="minibtn" onClick={copyLegend} disabled={isEmpty}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 범례 복사</>}</button>
        <button
          className="linkbtn"
          onClick={addLegendToProject}
          disabled={isEmpty || !hasProjectBridge()}
          title={hasProjectBridge() ? '지형 범례·지명을 프로젝트(자료 > 세계관)에 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}
        >
          {savedToProject ? <>✓ 추가됨</> : <><Emoji e="📄" /> 프로젝트에 추가</>}
        </button>
        <button className="minibtn" onClick={clearAll} disabled={isEmpty} style={{ marginLeft: 'auto' }}><Emoji e="🗑" /> 전체 지우기</button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        격자·지형·지명은 자동 저장됩니다. PNG는 로컬에서 생성되며 외부 전송이 없습니다. 지형 색은 직접 만든 것이므로 자유롭게 사용하세요.
      </div>
    </div>
  )
}
