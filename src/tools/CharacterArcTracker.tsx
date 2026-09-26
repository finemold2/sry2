// 인물 아크 추적기 — 인물(행) × 챕터/비트(열) 매트릭스로 각 시점의 감정·관계·믿음 변화를 한눈에 추적한다.
//  · 행: 인물(직접 추가하거나 인물 라이브러리에서 가져오기). 열: 챕터/비트(시간축).
//  · 각 셀: 감정(상태+강도) / 관계(대상·온도) / 믿음(현재 신념) + 사건 메모. 셀을 눌러 편집.
//  · 한 인물의 가로줄을 따라 감정 강도 스파크라인을 그려 아크의 기복을 시각화.
//  · 행/열 추가·삭제·이름변경·순서이동. 전부 로컬(localStorage 'sry:tool:character-arc').
// 자급식: react·linkbus 외 import 없음. 외부 네트워크/미디어 없음. 언마운트 정리.
// 연계(linkbus): 인물 라이브러리에서 행 가져오기 · 각 인물 아크 문서를 프로젝트 자료〈인물〉에 추가 · 매트릭스 전체를 텍스트로 복사.
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, useLibraryList, addToStash, hasStash, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'character-arc', name: '인물 아크 추적기', icon: '📈', group: '구상·정리', intro: '인물 × 챕터/비트 매트릭스로 감정·관계·믿음의 변화를 추적하고 아크 기복을 시각화', w: 920, h: 700 }

const LS_KEY = 'sry:tool:character-arc'

// ── 도메인 모델 ──
type Dim = 'emotion' | 'relation' | 'belief'
interface Cell {
  emotion: string     // 이 시점의 지배 감정/심리 상태
  intensity: number   // 감정 강도 0~5 (아크 곡선의 y값)
  relation: string    // 핵심 관계의 상태(대상·관계 변화)
  warmth: number      // 관계 온도 -3(적대) ~ +3(친밀), 0 중립
  belief: string      // 이 시점에 인물이 믿는 것(거짓믿음/진실)
  event: string       // 이 비트에서 일어난 사건/계기(짧게)
}
interface Row {
  id: string
  name: string
  role: string        // 역할(주인공/조력자 등) — 표기용
  color: string       // 행 강조색(스파크라인/배지)
  fromLib?: string    // 라이브러리 인물 id(중복 가져오기 방지)
  cells: Record<string, Cell> // colId → Cell
}
interface Col {
  id: string
  name: string        // 챕터/비트 이름
  kind: 'chapter' | 'beat' | 'act'
}
interface Doc {
  title: string
  rows: Row[]
  cols: Col[]
  focusDim: Dim       // 셀 본문에서 강조해 보여줄 차원
}

const DIMS: { key: Dim; label: string; icon: string; short: string }[] = [
  { key: 'emotion', label: '감정·심리', icon: '🎭', short: '감정' },
  { key: 'relation', label: '관계', icon: '🤝', short: '관계' },
  { key: 'belief', label: '믿음·신념', icon: '🧭', short: '믿음' },
]

// 감정 강도 프리셋(라벨 + 색) — 0 평온 ~ 5 격렬
const INTENSITY = [
  { v: 0, label: '평온', c: '#9aa3ad' },
  { v: 1, label: '잔잔', c: '#6fae7a' },
  { v: 2, label: '동요', c: '#caa53d' },
  { v: 3, label: '고조', c: '#e08a3c' },
  { v: 4, label: '격렬', c: '#db5b3c' },
  { v: 5, label: '극한', c: '#b5292a' },
]
function intMeta(v: number) { return INTENSITY[Math.max(0, Math.min(5, Math.round(v)))] }

// 관계 온도 프리셋 -3 ~ +3
const WARMTH = [
  { v: -3, label: '적대', e: '⚔️' },
  { v: -2, label: '불신', e: '🧊' },
  { v: -1, label: '서먹', e: '🌫️' },
  { v: 0, label: '중립', e: '➖' },
  { v: 1, label: '호의', e: '🌤️' },
  { v: 2, label: '신뢰', e: '🤝' },
  { v: 3, label: '친밀', e: '❤️' },
]
function warmthMeta(v: number) { return WARMTH.find((w) => w.v === Math.max(-3, Math.min(3, Math.round(v)))) || WARMTH[3] }

const ROW_COLORS = ['#5b86e0', '#db5b3c', '#0f9d58', '#9c5bd6', '#caa53d', '#3aa6b9', '#d6577f', '#7a8a3c', '#c0712f', '#5566aa']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function blankCell(): Cell {
  return { emotion: '', intensity: 0, relation: '', warmth: 0, belief: '', event: '' }
}
function cellEmpty(c: Cell): boolean {
  return !c.emotion.trim() && !c.relation.trim() && !c.belief.trim() && !c.event.trim() && c.intensity === 0 && c.warmth === 0
}

function defaultDoc(): Doc {
  const cols: Col[] = [
    { id: newId(), name: '도입', kind: 'beat' },
    { id: newId(), name: '1막', kind: 'act' },
    { id: newId(), name: '중간점', kind: 'beat' },
    { id: newId(), name: '위기', kind: 'beat' },
    { id: newId(), name: '절정', kind: 'beat' },
    { id: newId(), name: '결말', kind: 'beat' },
  ]
  return { title: '인물 아크', rows: [], cols, focusDim: 'emotion' }
}

// localStorage 복원 — 손상/미지원 graceful.
function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultDoc()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return defaultDoc()
    const cols: Col[] = Array.isArray(p.cols)
      ? p.cols.filter((c: unknown) => c && typeof c === 'object').map((c: Record<string, unknown>) => ({
          id: String(c.id || newId()),
          name: String(c.name || '비트'),
          kind: (c.kind === 'chapter' || c.kind === 'act') ? c.kind : 'beat',
        }))
      : defaultDoc().cols
    const colIds = new Set(cols.map((c) => c.id))
    const rows: Row[] = Array.isArray(p.rows)
      ? p.rows.filter((r: unknown) => r && typeof r === 'object').map((r: Record<string, unknown>, i: number) => {
          const cells: Record<string, Cell> = {}
          const rc = (r.cells && typeof r.cells === 'object') ? r.cells as Record<string, unknown> : {}
          for (const cid of Object.keys(rc)) {
            if (!colIds.has(cid)) continue
            const c = rc[cid] as Record<string, unknown>
            if (!c || typeof c !== 'object') continue
            cells[cid] = {
              emotion: String(c.emotion || ''),
              intensity: clampNum(c.intensity, 0, 5, 0),
              relation: String(c.relation || ''),
              warmth: clampNum(c.warmth, -3, 3, 0),
              belief: String(c.belief || ''),
              event: String(c.event || ''),
            }
          }
          return {
            id: String(r.id || newId()),
            name: String(r.name || `인물 ${i + 1}`),
            role: String(r.role || ''),
            color: typeof r.color === 'string' ? r.color : ROW_COLORS[i % ROW_COLORS.length],
            fromLib: typeof r.fromLib === 'string' ? r.fromLib : undefined,
            cells,
          }
        })
      : []
    return {
      title: String(p.title || '인물 아크'),
      rows, cols,
      focusDim: (p.focusDim === 'relation' || p.focusDim === 'belief') ? p.focusDim : 'emotion',
    }
  } catch { return defaultDoc() }
}
function clampNum(v: unknown, lo: number, hi: number, def: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const dash = (s: string) => (s && s.trim() ? s.trim() : '—')

// ── 텍스트 내보내기(전체 매트릭스) ──
function exportText(d: Doc): string {
  const out: string[] = []
  out.push(`# ${d.title || '인물 아크'} — 인물 아크 추적`)
  out.push('')
  for (const r of d.rows) {
    out.push(`## ${r.name}${r.role ? ` (${r.role})` : ''}`)
    for (const col of d.cols) {
      const c = r.cells[col.id]
      if (!c || cellEmpty(c)) continue
      const bits: string[] = []
      if (c.event.trim()) bits.push(`사건: ${c.event.trim()}`)
      if (c.emotion.trim() || c.intensity) bits.push(`감정: ${dash(c.emotion)} [${intMeta(c.intensity).label}]`)
      if (c.relation.trim() || c.warmth) bits.push(`관계: ${dash(c.relation)} [${warmthMeta(c.warmth).label}]`)
      if (c.belief.trim()) bits.push(`믿음: ${c.belief.trim()}`)
      out.push(`- [${col.name}] ${bits.join(' · ')}`)
    }
    out.push('')
  }
  return out.join('\n').trim()
}

// 한 인물의 아크 문서 본문(HTML).
function rowBodyHtml(r: Row, cols: Col[]): string {
  const parts: string[] = []
  if (r.role) parts.push(`<p><b>역할:</b> ${escHtml(r.role)}</p>`)
  parts.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">')
  parts.push('<tr><th>비트</th><th>사건</th><th>감정(강도)</th><th>관계(온도)</th><th>믿음</th></tr>')
  for (const col of cols) {
    const c = r.cells[col.id]
    if (!c || cellEmpty(c)) continue
    parts.push(
      `<tr><td><b>${escHtml(col.name)}</b></td>` +
      `<td>${escHtml(dash(c.event))}</td>` +
      `<td>${escHtml(dash(c.emotion))} <i>[${escHtml(intMeta(c.intensity).label)}]</i></td>` +
      `<td>${escHtml(dash(c.relation))} <i>[${escHtml(warmthMeta(c.warmth).label)}]</i></td>` +
      `<td>${escHtml(dash(c.belief))}</td></tr>`
    )
  }
  parts.push('</table>')
  return parts.join('')
}

export default function CharacterArcTracker({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Doc>(loadDoc())
  const [doc, setDoc] = useState<Doc>(init.current)
  const [edit, setEdit] = useState<{ rowId: string; colId: string } | null>(null)
  const [flash, setFlash] = useState('')
  const [warn, setWarn] = useState('')
  const [pickLib, setPickLib] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'row' | 'col'; id: string } | null>(null)
  const characters = useLibraryList('characters')
  const mounted = useRef(true)
  const flashNonce = useRef(0)
  const colDrag = useRef<string | null>(null)
  const rowDrag = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.character 로 들어오면 행으로 추가(연계 진입).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const c = payload?.character as Record<string, unknown> | undefined
    if (c && typeof c.name === 'string' && c.name.trim()) {
      setDoc((d) => {
        if (d.rows.some((r) => r.name === c.name)) return d
        return { ...d, rows: [...d.rows, mkRow(String(c.name), typeof c.role === 'string' ? c.role : '', d.rows.length)] }
      })
    }
  }, [payload])

  // 자동 저장 — 차단/용량초과 graceful.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(doc)) }
    catch { if (mounted.current) setWarn('이 브라우저에서 저장이 막혀 새로고침하면 내용이 사라질 수 있어요.') }
  }, [doc])

  useEffect(() => {
    if (!flash) return
    const my = ++flashNonce.current
    const t = window.setTimeout(() => { if (mounted.current && flashNonce.current === my) setFlash('') }, 2000)
    return () => window.clearTimeout(t)
  }, [flash])

  function mkRow(name: string, role: string, idx: number, fromLib?: string): Row {
    return { id: newId(), name: name || `인물 ${idx + 1}`, role: role || '', color: ROW_COLORS[idx % ROW_COLORS.length], fromLib, cells: {} }
  }

  // ── 행 조작 ──
  const addRow = () => setDoc((d) => ({ ...d, rows: [...d.rows, mkRow('', '', d.rows.length)] }))
  const addRowFromLib = (c: SharedCharacter) => {
    setDoc((d) => {
      if (c.id && d.rows.some((r) => r.fromLib === c.id)) { return d }
      const row = mkRow(c.name || '이름 없음', c.role || '', d.rows.length, c.id)
      return { ...d, rows: [...d.rows, row] }
    })
    setFlash(`‘${c.name || '인물'}’을(를) 행으로 추가했어요`)
  }
  const renameRow = (id: string, name: string) => setDoc((d) => ({ ...d, rows: d.rows.map((r) => r.id === id ? { ...r, name } : r) }))
  const setRowRole = (id: string, role: string) => setDoc((d) => ({ ...d, rows: d.rows.map((r) => r.id === id ? { ...r, role } : r) }))
  const cycleRowColor = (id: string) => setDoc((d) => ({ ...d, rows: d.rows.map((r) => {
    if (r.id !== id) return r
    const i = ROW_COLORS.indexOf(r.color)
    return { ...r, color: ROW_COLORS[(i + 1) % ROW_COLORS.length] }
  }) }))
  const removeRow = (id: string) => { setDoc((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id) })); setConfirm(null) }
  const moveRow = (id: string, dir: -1 | 1) => setDoc((d) => {
    const i = d.rows.findIndex((r) => r.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= d.rows.length) return d
    const rows = d.rows.slice(); [rows[i], rows[j]] = [rows[j], rows[i]]; return { ...d, rows }
  })

  // ── 열 조작 ──
  const addCol = () => setDoc((d) => ({ ...d, cols: [...d.cols, { id: newId(), name: `비트 ${d.cols.length + 1}`, kind: 'beat' }] }))
  const renameCol = (id: string, name: string) => setDoc((d) => ({ ...d, cols: d.cols.map((c) => c.id === id ? { ...c, name } : c) }))
  const cycleColKind = (id: string) => setDoc((d) => ({ ...d, cols: d.cols.map((c) => {
    if (c.id !== id) return c
    const order: Col['kind'][] = ['beat', 'chapter', 'act']
    return { ...c, kind: order[(order.indexOf(c.kind) + 1) % order.length] }
  }) }))
  const removeCol = (id: string) => {
    setDoc((d) => ({ ...d, cols: d.cols.filter((c) => c.id !== id), rows: d.rows.map((r) => { const cells = { ...r.cells }; delete cells[id]; return { ...r, cells } }) }))
    setConfirm(null)
    if (edit?.colId === id) setEdit(null)
  }
  const moveCol = (id: string, dir: -1 | 1) => setDoc((d) => {
    const i = d.cols.findIndex((c) => c.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= d.cols.length) return d
    const cols = d.cols.slice(); [cols[i], cols[j]] = [cols[j], cols[i]]; return { ...d, cols }
  })

  // 드래그로 열 순서 변경(헤더).
  const dropCol = (targetId: string) => {
    const from = colDrag.current; colDrag.current = null; setDragOver(null)
    if (!from || from === targetId) return
    setDoc((d) => {
      const fi = d.cols.findIndex((c) => c.id === from), ti = d.cols.findIndex((c) => c.id === targetId)
      if (fi < 0 || ti < 0) return d
      const cols = d.cols.slice(); const [m] = cols.splice(fi, 1); cols.splice(ti, 0, m); return { ...d, cols }
    })
  }
  // 드래그로 행 순서 변경(첫 칸 핸들).
  const dropRow = (targetId: string) => {
    const from = rowDrag.current; rowDrag.current = null; setDragOver(null)
    if (!from || from === targetId) return
    setDoc((d) => {
      const fi = d.rows.findIndex((r) => r.id === from), ti = d.rows.findIndex((r) => r.id === targetId)
      if (fi < 0 || ti < 0) return d
      const rows = d.rows.slice(); const [m] = rows.splice(fi, 1); rows.splice(ti, 0, m); return { ...d, rows }
    })
  }

  // ── 셀 편집 ──
  const cellOf = (r: Row, colId: string): Cell => r.cells[colId] || blankCell()
  const setCell = (rowId: string, colId: string, patch: Partial<Cell>) => setDoc((d) => ({
    ...d,
    rows: d.rows.map((r) => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: { ...cellOf(r, colId), ...patch } } } : r),
  }))
  const clearCell = (rowId: string, colId: string) => setDoc((d) => ({
    ...d, rows: d.rows.map((r) => { if (r.id !== rowId) return r; const cells = { ...r.cells }; delete cells[colId]; return { ...r, cells } }),
  }))

  // ── 연계 ──
  const copyAll = () => { copyText(exportText(doc), '전체 매트릭스를 복사했어요') }
  const copyText = (text: string, label: string) => {
    const done = () => { if (mounted.current) setFlash(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fb(text, done))
      else fb(text, done)
    } catch { fb(text, done) }
  }
  const fb = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setFlash('복사에 실패했어요') }
  }

  const rowToProject = (r: Row) => {
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되어 있지 않습니다'); return }
    const filled = doc.cols.filter((c) => { const cell = r.cells[c.id]; return cell && !cellEmpty(cell) }).length
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `${r.name || '인물'} — 아크 추적`,
      bodyHtml: rowBodyHtml(r, doc.cols),
      synopsis: `${doc.cols.length}개 비트 중 ${filled}개 기록`,
      meta: { 역할: r.role || '—', 기록비트: `${filled}/${doc.cols.length}` },
    })
    setFlash(id ? `‘${r.name}’ 아크를 프로젝트 자료〈인물〉에 추가했어요` : '프로젝트 추가에 실패했어요')
  }

  // 전체를 한 문서로(모든 인물).
  const allToProject = () => {
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되어 있지 않습니다'); return }
    if (doc.rows.length === 0) { setFlash('먼저 인물(행)을 추가하세요'); return }
    const body = doc.rows.map((r) => `<h3>${escHtml(r.name)}${r.role ? ` <span style="color:#888">(${escHtml(r.role)})</span>` : ''}</h3>${rowBodyHtml(r, doc.cols)}`).join('<hr/>')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `${doc.title || '인물 아크'} — 아크 추적표`,
      bodyHtml: body,
      synopsis: `${doc.rows.length}명 × ${doc.cols.length}비트 아크 매트릭스`,
      meta: { 인물수: String(doc.rows.length), 비트수: String(doc.cols.length) },
    })
    setFlash(id ? '전체 아크 추적표를 프로젝트에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  // 행 → 인물 라이브러리(현재 마지막 비트의 상태를 traits 로).
  const rowToLibrary = (r: Row) => {
    const last = [...doc.cols].reverse().find((c) => { const cell = r.cells[c.id]; return cell && !cellEmpty(cell) })
    const cell = last ? r.cells[last.id] : undefined
    const traits = cell ? [
      { k: '감정(최종)', v: cell.emotion },
      { k: '관계(최종)', v: cell.relation },
      { k: '믿음(최종)', v: cell.belief },
    ].filter((t) => t.v.trim()) : []
    // 정규 캐릭터 필드(키→값) 추가 — 받는 허브(인물 시트 등)에서 항목이 제자리에 들어가게.
    // 이 도구가 실제로 가진 값만 1:1 매핑. 비트별 아크 기록은 성장 곡선(arc)로.
    const arcText = exportRow(r)
    const fields: Record<string, string> = {}
    if (r.name && r.name.trim()) fields.name = r.name.trim()
    if (r.role && r.role.trim()) fields.role = r.role.trim()
    if (cell) {
      if (cell.emotion.trim()) fields.personality = cell.emotion.trim()
      if (cell.belief.trim()) fields.value = cell.belief.trim()
    }
    if (arcText.trim()) { fields.arc = arcText.trim(); fields.notes = arcText.trim() }
    addToLibrary('characters', { name: r.name || '인물', role: r.role || undefined, traits, fields, notes: exportRow(r), source: '인물 아크 추적기' })
    setFlash(`‘${r.name}’을(를) 인물 라이브러리에 저장했어요`)
  }
  const exportRow = (r: Row): string => {
    const lines: string[] = []
    for (const col of doc.cols) {
      const c = r.cells[col.id]; if (!c || cellEmpty(c)) continue
      lines.push(`[${col.name}] ${dash(c.event)} / 감정 ${dash(c.emotion)} / 관계 ${dash(c.relation)} / 믿음 ${dash(c.belief)}`)
    }
    return lines.join('\n')
  }

  const stashRow = (r: Row) => {
    if (!hasStash()) { setFlash('수집함을 사용할 수 없습니다'); return }
    addToStash({ kind: 'note', label: `${r.name} 아크`, text: exportRow(r) || `${r.name} (기록 없음)` })
    setFlash(`‘${r.name}’ 아크를 수집함에 담았어요`)
  }

  const resetAll = () => { setDoc(defaultDoc()); setConfirm(null); setEdit(null); setFlash('초기화했어요') }

  // 라이브러리에서 아직 안 가져온 인물.
  const availableChars = characters.filter((c) => !doc.rows.some((r) => r.fromLib === c.id))
  const linked = hasProjectBridge()

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14 }
  const th: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 2, background: 'var(--chrome-2)', borderBottom: '2px solid var(--border)' }
  const tdBase: React.CSSProperties = { border: '1px solid var(--border)', verticalAlign: 'top', padding: 0 }

  const focus = doc.focusDim
  const editingRow = edit ? doc.rows.find((r) => r.id === edit.rowId) : null
  const editingCol = edit ? doc.cols.find((c) => c.id === edit.colId) : null
  const editingCell = editingRow && edit ? cellOf(editingRow, edit.colId) : null

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="📈" /></span>
        <input
          value={doc.title}
          onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
          placeholder="추적표 제목"
          style={{ fontSize: 15, fontWeight: 700, border: '1px solid transparent', background: 'transparent', color: 'var(--text)', borderRadius: 6, padding: '3px 6px', width: 150 }}
          maxLength={60}
        />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{doc.rows.length}명 · {doc.cols.length}비트</span>
        {/* 강조 차원 토글 — 셀에 어떤 차원을 크게 보여줄지 */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
          {DIMS.map((dm) => (
            <button key={dm.key} className="minibtn" onClick={() => setDoc((d) => ({ ...d, focusDim: dm.key }))}
              style={{ padding: '3px 8px', fontSize: 11.5, borderColor: focus === dm.key ? 'var(--accent)' : 'var(--border)', color: focus === dm.key ? 'var(--accent)' : 'var(--text)', fontWeight: focus === dm.key ? 700 : 400 }}
              title={`셀에서 ${dm.label}을(를) 강조`}>
              <Emoji e={dm.icon} /> {dm.short}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={copyAll} title="전체 매트릭스를 텍스트로 복사">복사</button>
        <button className="minibtn danger" onClick={() => setConfirm({ kind: 'row', id: '__reset__' })} title="모든 내용 초기화">초기화</button>
      </div>

      {warn && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{warn}</div>}

      <div style={scroll}>
        {/* 라이브러리에서 인물 가져오기 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={addRow}>＋ 인물 행</button>
          <button className="minibtn" onClick={addCol}>＋ 비트 열</button>
          <button className="minibtn" onClick={() => setPickLib((v) => !v)} disabled={availableChars.length === 0}
            title={availableChars.length ? '인물 라이브러리에서 행으로 가져오기' : '가져올 라이브러리 인물이 없습니다'}>
            <Emoji e="👥" /> 라이브러리에서 가져오기{availableChars.length ? ` (${availableChars.length})` : ''}
          </button>
          <span style={{ flex: 1 }} />
          <button className="linkbtn" onClick={allToProject} disabled={!linked} title={linked ? '전체 추적표를 프로젝트 자료〈인물〉에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>

        {pickLib && availableChars.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 12, background: 'var(--panel)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>가져올 인물을 고르세요</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableChars.map((c) => (
                <button key={c.id} className="minibtn" onClick={() => addRowFromLib(c)} title={c.role || ''}>
                  <Emoji e="👤" /> {c.name || '이름 없음'}{c.role ? ` · ${c.role}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {doc.rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '40px 16px', lineHeight: 1.8, border: '1px dashed var(--border)', borderRadius: 12 }}>
            아직 인물(행)이 없습니다.<br />
            <b>＋ 인물 행</b>으로 직접 추가하거나, <b><Emoji e="👥" /> 라이브러리에서 가져오기</b>로 인물을 불러오세요.<br />
            <span style={{ fontSize: 12 }}>각 셀을 누르면 그 비트의 <b>감정·관계·믿음</b> 변화를 기록할 수 있어요.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 120 + doc.cols.length * 150 }}>
              <thead>
                <tr>
                  <th style={{ ...th, ...tdBase, minWidth: 150, width: 150, textAlign: 'left', padding: '8px 10px', borderLeft: 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 \ 비트</span>
                  </th>
                  {doc.cols.map((col, ci) => (
                    <th
                      key={col.id}
                      style={{ ...th, ...tdBase, minWidth: 150, width: 150, padding: '6px 8px' }}
                      draggable
                      onDragStart={() => { colDrag.current = col.id }}
                      onDragOver={(e) => { e.preventDefault(); if (dragOver !== 'col:' + col.id) setDragOver('col:' + col.id) }}
                      onDragLeave={() => { if (dragOver === 'col:' + col.id) setDragOver(null) }}
                      onDrop={() => dropCol(col.id)}
                      onDragEnd={() => { colDrag.current = null; setDragOver(null) }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <span style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                        <span className="arc-kind" onClick={() => cycleColKind(col.id)} title="유형 전환(비트/챕터/막)"
                          style={{ fontSize: 9.5, padding: '0 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', lineHeight: '15px' }}>
                          {col.kind === 'chapter' ? '챕터' : col.kind === 'act' ? '막' : '비트'}
                        </span>
                        <span style={{ flex: 1 }} />
                        <button className="arc-icon" onClick={() => moveCol(col.id, -1)} disabled={ci === 0} title="왼쪽으로">◀</button>
                        <button className="arc-icon" onClick={() => moveCol(col.id, 1)} disabled={ci === doc.cols.length - 1} title="오른쪽으로">▶</button>
                        <button className="arc-icon" onClick={() => setConfirm({ kind: 'col', id: col.id })} title="열 삭제" style={{ color: 'var(--warn)' }}>×</button>
                      </div>
                      <input
                        value={col.name}
                        onChange={(e) => renameCol(col.id, e.target.value)}
                        placeholder="비트 이름"
                        style={{ width: '100%', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        maxLength={40}
                      />
                      {confirm?.kind === 'col' && confirm.id === col.id && (
                        <div style={{ marginTop: 5, fontSize: 11, color: 'var(--warn)' }}>
                          삭제? <button className="arc-icon" style={{ color: 'var(--warn)' }} onClick={() => removeCol(col.id)}>예</button>
                          <button className="arc-icon" onClick={() => setConfirm(null)}>아니오</button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((r, ri) => (
                  <ArcRowView
                    key={r.id}
                    row={r} rowIndex={ri} cols={doc.cols} focus={focus} tdBase={tdBase}
                    rowCount={doc.rows.length}
                    onEditCell={(colId) => setEdit({ rowId: r.id, colId })}
                    onRename={renameRow} onRole={setRowRole} onColor={() => cycleRowColor(r.id)}
                    onMove={moveRow} onAskDelete={() => setConfirm({ kind: 'row', id: r.id })}
                    confirmDelete={confirm?.kind === 'row' && confirm.id === r.id}
                    onConfirmDelete={() => removeRow(r.id)} onCancelDelete={() => setConfirm(null)}
                    onToProject={() => rowToProject(r)} onToLibrary={() => rowToLibrary(r)} onStash={() => stashRow(r)}
                    linked={linked} stashable={hasStash()}
                    rowDrag={rowDrag} dragOver={dragOver} setDragOver={setDragOver} onDropRow={dropRow}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 범례 */}
        {doc.rows.length > 0 && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 11, color: 'var(--muted)', alignItems: 'center' }}>
            <span><Emoji e="📉" /> 곡선 = 감정 강도 변화(가로=비트)</span>
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              강도:
              {INTENSITY.map((it) => <span key={it.v} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><i style={{ width: 9, height: 9, borderRadius: 2, background: it.c, display: 'inline-block' }} />{it.label}</span>)}
            </span>
          </div>
        )}

        {/* 초기화 확인 */}
        {confirm?.kind === 'row' && confirm.id === '__reset__' && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--warn)', fontSize: 12.5 }}>
            <div style={{ marginBottom: 8, color: 'var(--warn)' }}>모든 인물·비트·기록을 지우고 처음 상태로 되돌릴까요?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ background: 'var(--warn)' }} onClick={resetAll}>초기화</button>
              <button className="minibtn" onClick={() => setConfirm(null)}>취소</button>
            </div>
          </div>
        )}

        <div className="license-note" style={{ marginTop: 14, lineHeight: 1.6 }}>
          입력한 내용은 모두 사용자 창작물이며 이 브라우저(localStorage)에만 저장됩니다. 외부 데이터·이미지를 사용하지 않습니다.
        </div>
      </div>

      {/* 셀 편집 패널 */}
      {edit && editingRow && editingCol && editingCell && (
        <CellEditor
          rowName={editingRow.name} colName={editingCol.name} cell={editingCell}
          onChange={(patch) => setCell(edit.rowId, edit.colId, patch)}
          onClear={() => { clearCell(edit.rowId, edit.colId); setEdit(null) }}
          onClose={() => setEdit(null)}
        />
      )}

      <style>{`
        .arc-icon { border: 1px solid var(--border); background: var(--paper); color: var(--muted); cursor: pointer; font-size: 10px; line-height: 1; padding: 2px 5px; border-radius: 5px; }
        .arc-icon:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .arc-icon:disabled { opacity: .35; cursor: default; }
        .arc-cell { cursor: pointer; transition: background .12s; }
        .arc-cell:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
      `}</style>
    </div>
  )
}

// ── 한 인물(행) — 메타 칸 + 비트 셀들 + 스파크라인 ──
function ArcRowView(props: {
  row: Row; rowIndex: number; rowCount: number; cols: Col[]; focus: Dim; tdBase: React.CSSProperties
  onEditCell: (colId: string) => void
  onRename: (id: string, v: string) => void; onRole: (id: string, v: string) => void; onColor: () => void
  onMove: (id: string, dir: -1 | 1) => void; onAskDelete: () => void
  confirmDelete: boolean; onConfirmDelete: () => void; onCancelDelete: () => void
  onToProject: () => void; onToLibrary: () => void; onStash: () => void
  linked: boolean; stashable: boolean
  rowDrag: React.MutableRefObject<string | null>; dragOver: string | null; setDragOver: (v: string | null) => void; onDropRow: (id: string) => void
}) {
  const { row: r, cols, focus, tdBase, rowIndex, rowCount } = props
  const [open, setOpen] = useState(false) // 행 액션(연계) 펼침
  const over = props.dragOver === 'row:' + r.id

  // 감정 강도 시퀀스(스파크라인) — 셀이 비어도 위치는 유지.
  const intens = cols.map((c) => { const cell = r.cells[c.id]; return cell ? cell.intensity : 0 })
  const hasAny = cols.some((c) => { const cell = r.cells[c.id]; return cell && !cellEmpty(cell) })

  return (
    <tr style={{ borderTop: over ? '2px solid var(--accent)' : undefined }}>
      {/* 인물 메타 칸 (sticky 좌측) */}
      <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 1, background: 'var(--panel)', minWidth: 150, width: 150, padding: 8, borderLeft: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span
            draggable
            onDragStart={() => { props.rowDrag.current = r.id }}
            onDragOver={(e) => { e.preventDefault(); if (props.dragOver !== 'row:' + r.id) props.setDragOver('row:' + r.id) }}
            onDragLeave={() => { if (props.dragOver === 'row:' + r.id) props.setDragOver(null) }}
            onDrop={() => props.onDropRow(r.id)}
            onDragEnd={() => { props.rowDrag.current = null; props.setDragOver(null) }}
            style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
          <button onClick={props.onColor} title="행 색상 변경" style={{ width: 12, height: 12, borderRadius: 3, background: r.color, border: '1px solid rgba(0,0,0,.2)', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          <span style={{ flex: 1 }} />
          <button className="arc-icon" onClick={() => props.onMove(r.id, -1)} disabled={rowIndex === 0} title="위로">▲</button>
          <button className="arc-icon" onClick={() => props.onMove(r.id, 1)} disabled={rowIndex === rowCount - 1} title="아래로">▼</button>
          <button className="arc-icon" onClick={props.onAskDelete} title="행 삭제" style={{ color: 'var(--warn)' }}>×</button>
        </div>
        <input
          value={r.name} onChange={(e) => props.onRename(r.id, e.target.value)} placeholder="인물 이름"
          style={{ width: '100%', fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 4, borderLeft: `3px solid ${r.color}` }}
          maxLength={40}
        />
        <input
          value={r.role} onChange={(e) => props.onRole(r.id, e.target.value)} placeholder="역할(선택)"
          style={{ width: '100%', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', background: 'var(--paper)', color: 'var(--muted)', boxSizing: 'border-box' }}
          maxLength={30}
        />
        {/* 스파크라인 */}
        <div style={{ marginTop: 6 }}>
          <Sparkline values={intens} color={r.color} active={hasAny} />
        </div>
        {/* 행 액션 */}
        <div style={{ marginTop: 5 }}>
          <button className="arc-icon" style={{ width: '100%', textAlign: 'center' }} onClick={() => setOpen((v) => !v)}>{open ? '연동 닫기 ▲' : '연동 ▾'}</button>
        </div>
        {open && (
          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button className="linkbtn" style={{ fontSize: 11, padding: '3px 6px' }} onClick={props.onToProject} disabled={!props.linked} title={props.linked ? '이 인물 아크를 프로젝트 자료〈인물〉에 문서로' : '프로젝트 미연결'}><Emoji e="📄" /> 프로젝트</button>
            <button className="linkbtn" style={{ fontSize: 11, padding: '3px 6px' }} onClick={props.onToLibrary}><Emoji e="📥" /> 라이브러리</button>
            {props.stashable && <button className="linkbtn" style={{ fontSize: 11, padding: '3px 6px' }} onClick={props.onStash}><Emoji e="📎" /> 수집함</button>}
          </div>
        )}
        {props.confirmDelete && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--warn)' }}>
            이 인물 삭제? <button className="arc-icon" style={{ color: 'var(--warn)' }} onClick={props.onConfirmDelete}>예</button>
            <button className="arc-icon" onClick={props.onCancelDelete}>아니오</button>
          </div>
        )}
      </td>

      {/* 비트 셀들 */}
      {cols.map((col) => {
        const cell = r.cells[col.id]
        const c = cell || blankCell()
        const empty = !cell || cellEmpty(c)
        return (
          <td key={col.id} style={{ ...tdBase, minWidth: 150, width: 150, height: 1 }}>
            <div className="arc-cell" onClick={() => props.onEditCell(col.id)}
              style={{ padding: 8, minHeight: 92, height: '100%', display: 'flex', flexDirection: 'column', gap: 4, boxSizing: 'border-box' }}
              title="눌러서 이 비트의 감정·관계·믿음 편집">
              {empty ? (
                <div style={{ color: 'var(--muted)', fontSize: 11.5, opacity: .7, margin: 'auto', textAlign: 'center' }}>＋ 기록</div>
              ) : (
                <CellPreview cell={c} focus={focus} color={r.color} />
              )}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

// 셀 미리보기 — 강조 차원을 크게, 나머지는 배지로.
function CellPreview({ cell, focus, color }: { cell: Cell; focus: Dim; color: string }) {
  const im = intMeta(cell.intensity)
  const wm = warmthMeta(cell.warmth)
  const main =
    focus === 'emotion' ? (cell.emotion.trim() || (cell.intensity ? im.label : '')) :
    focus === 'relation' ? (cell.relation.trim() || (cell.warmth ? wm.label : '')) :
    cell.belief.trim()
  return (
    <>
      {cell.event.trim() && (
        <div style={{ fontSize: 10.5, color: 'var(--muted)', borderLeft: `2px solid ${color}`, paddingLeft: 5, lineHeight: 1.4, marginBottom: 1 }}>
          {trunc(cell.event, 40)}
        </div>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {main ? trunc(main, 54) : <span style={{ color: 'var(--muted)', fontWeight: 400 }}>—</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
        {(cell.intensity > 0 || cell.emotion.trim()) && (
          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 5, color: '#fff', background: im.c }} title={`감정 강도: ${im.label}`}><Emoji e="🎭" /> {im.label}</span>
        )}
        {(cell.warmth !== 0 || cell.relation.trim()) && (
          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)' }} title={`관계 온도: ${wm.label}`}><Emoji e={wm.e} /> {wm.label}</span>
        )}
        {cell.belief.trim() && (
          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)' }} title={`믿음: ${cell.belief}`}><Emoji e="🧭" /></span>
        )}
      </div>
    </>
  )
}
function trunc(s: string, n: number): string { const t = s.trim(); return t.length > n ? t.slice(0, n) + '…' : t }

// ── 감정 강도 스파크라인(SVG) ──
function Sparkline({ values, color, active }: { values: number[]; color: string; active: boolean }) {
  const W = 100, H = 26, pad = 3
  const n = values.length
  if (n === 0) return null
  const xAt = (i: number) => n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2)
  const yAt = (v: number) => H - pad - (v / 5) * (H - pad * 2)
  const pts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 26, display: 'block', opacity: active ? 1 : .35 }} aria-hidden>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.8} fill={intMeta(values[i]).c} vectorEffect="non-scaling-stroke" />)}
    </svg>
  )
}

// ── 셀 편집 패널(하단 시트) ──
function CellEditor({ rowName, colName, cell, onChange, onClear, onClose }: {
  rowName: string; colName: string; cell: Cell
  onChange: (patch: Partial<Cell>) => void; onClear: () => void; onClose: () => void
}) {
  // ESC 로 닫기.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sheet: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '72%', overflow: 'auto', background: 'var(--paper)', borderTop: '2px solid var(--accent)', boxShadow: '0 -8px 24px rgba(0,0,0,.18)', zIndex: 10, borderTopLeftRadius: 12, borderTopRightRadius: 12 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const block: React.CSSProperties = { marginBottom: 14 }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.28)' }} onClick={onClose} />
      <div style={sheet}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
          <strong style={{ fontSize: 14 }}>{rowName || '인물'}</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{colName}</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={onClear} title="이 셀의 모든 기록 비우기">셀 비우기</button>
          <button className="btn-primary" onClick={onClose}>완료</button>
        </div>

        <div style={{ padding: 16 }}>
          <div style={block}>
            <div style={label}><Emoji e="📌" /> 사건 / 계기 — 이 비트에서 무슨 일이 있었나</div>
            <textarea style={{ ...input, minHeight: 44, resize: 'vertical', lineHeight: 1.5 }} value={cell.event}
              onChange={(e) => onChange({ event: e.target.value })} placeholder="예: 동료의 배신을 알게 된다" maxLength={200} />
          </div>

          <div style={block}>
            <div style={label}><Emoji e="🎭" /> 감정 / 심리 상태</div>
            <textarea style={{ ...input, minHeight: 40, resize: 'vertical', lineHeight: 1.5 }} value={cell.emotion}
              onChange={(e) => onChange({ emotion: e.target.value })} placeholder="예: 충격과 분노, 그러나 애써 침착함을 가장" maxLength={200} />
            <div style={{ marginTop: 8 }}>
              <div style={{ ...label, marginBottom: 6 }}>감정 강도: <b style={{ color: intMeta(cell.intensity).c }}>{intMeta(cell.intensity).label}</b> ({cell.intensity}/5)</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {INTENSITY.map((it) => {
                  const on = cell.intensity === it.v
                  return (
                    <button key={it.v} className="minibtn" onClick={() => onChange({ intensity: it.v })}
                      style={{ padding: '3px 9px', fontSize: 11.5, borderColor: on ? it.c : 'var(--border)', background: on ? it.c : undefined, color: on ? '#fff' : 'var(--text)', fontWeight: on ? 700 : 400 }}>
                      {it.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={block}>
            <div style={label}><Emoji e="🤝" /> 관계 변화 — 누구와의 관계가 어떻게</div>
            <textarea style={{ ...input, minHeight: 40, resize: 'vertical', lineHeight: 1.5 }} value={cell.relation}
              onChange={(e) => onChange({ relation: e.target.value })} placeholder="예: 멘토와 결정적으로 등을 돌린다" maxLength={200} />
            <div style={{ marginTop: 8 }}>
              <div style={{ ...label, marginBottom: 6 }}>관계 온도: <b><Emoji e={warmthMeta(cell.warmth).e} /> {warmthMeta(cell.warmth).label}</b></div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {WARMTH.map((w) => {
                  const on = cell.warmth === w.v
                  return (
                    <button key={w.v} className="minibtn" onClick={() => onChange({ warmth: w.v })}
                      style={{ padding: '3px 8px', fontSize: 11.5, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, color: on ? 'var(--accent)' : 'var(--text)', fontWeight: on ? 700 : 400 }}
                      title={w.label}>
                      <Emoji e={w.e} /> {w.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={block}>
            <div style={label}><Emoji e="🧭" /> 믿음 / 신념 — 이 시점에 인물이 믿는 것</div>
            <textarea style={{ ...input, minHeight: 44, resize: 'vertical', lineHeight: 1.5 }} value={cell.belief}
              onChange={(e) => onChange({ belief: e.target.value })} placeholder="예: ‘누구도 믿을 수 없다’ — 거짓믿음이 굳어진다" maxLength={200} />
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
            세 차원(감정·관계·믿음)이 비트마다 어떻게 변하는지 채우면 가로줄을 따라 인물의 아크가 드러납니다. <b>ESC</b> 또는 바깥을 눌러 닫을 수 있어요.
          </div>
        </div>
      </div>
    </div>
  )
}
