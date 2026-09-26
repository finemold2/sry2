// 비교작 정리(Comparable Titles / Comps) — "X 만나 Y" 식 비교작·장르 좌표·차별점으로 작품을 포지셔닝한다.
//  · 내 작품 한 줄 정의("A 만나 B")와 두 축(장르 좌표) 위 위치를 잡는다.
//  · 비교작(comp) 카드 CRUD: 제목/저자·작가/매체/연도/한줄소개 + 두 축 좌표 + "닮은 점/다른 점" + 별점(참고도).
//  · 장르 좌표 맵: 두 축 위에 내 작품과 비교작들을 점으로 흩뿌려 한눈에 포지셔닝.
//  · 차별점·포지셔닝 요약을 자동 조합해 표시 → 스니펫 라이브러리/수집함/프로젝트 자료〈기획〉으로.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/키 불필요. 전부 localStorage 영속.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = { id: 'comp-titles', name: '비교작 정리', icon: '🎯', group: '리서치·자료', intro: '“X 만나 Y” 비교작·장르 좌표·차별점으로 작품을 포지셔닝하세요', w: 720, h: 660 }

const LS_KEY = 'sry:tool:comp-titles'

// ---------- 데이터 모델 ----------
interface AxisDef { id: 'x' | 'y'; lowLabel: string; highLabel: string }
interface Comp {
  id: string
  title: string        // 비교작 제목
  creator: string      // 저자/작가/감독
  medium: string       // 매체(소설/웹툰/영화/드라마…)
  year: string         // 연도(자유 입력)
  blurb: string        // 한 줄 소개
  x: number            // 좌표 -100..100
  y: number            // 좌표 -100..100
  similar: string      // 닮은 점(이걸 가져온다)
  different: string    // 다른 점(이건 다르게 간다)
  stars: number        // 참고도 0..5
  color: string        // 점 색
  createdAt: number
}
interface State {
  myTitle: string          // 내 작품 가제
  pitchA: string           // "A 만나 B"의 A
  pitchB: string           // B
  myBlurb: string          // 내 작품 한 줄
  myX: number
  myY: number
  axes: { x: AxisDef; y: AxisDef }
  edge: string             // 한 줄 차별점(직접 입력, 비우면 자동 조합)
  comps: Comp[]
}

const DOT_COLORS = ['#4a76d4', '#db4437', '#0f9d58', '#b8860b', '#8a5a2c', '#7b53c6', '#0a9396', '#d4145a']
const MEDIA = ['소설', '장르소설', '웹소설', '웹툰', '만화', '영화', '드라마', '애니', '게임', '기타']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const clampN = (n: number, lo = -100, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))
const clampStars = (n: number) => Math.max(0, Math.min(5, Math.round(n)))

const blankComp = (i = 0): Comp => ({
  id: newId(), title: '', creator: '', medium: '소설', year: '', blurb: '',
  x: 0, y: 0, similar: '', different: '', stars: 3,
  color: DOT_COLORS[i % DOT_COLORS.length], createdAt: Date.now(),
})

function defaultState(): State {
  return {
    myTitle: '', pitchA: '', pitchB: '', myBlurb: '', myX: 0, myY: 0,
    axes: {
      x: { id: 'x', lowLabel: '진지·무거움', highLabel: '경쾌·가벼움' },
      y: { id: 'y', lowLabel: '현실·일상', highLabel: '환상·비현실' },
    },
    edge: '',
    comps: [],
  }
}

function sanitizeComp(x: unknown, i: number): Comp {
  const o = (x || {}) as Partial<Comp>
  return {
    id: String(o.id || newId()),
    title: String(o.title || ''),
    creator: String(o.creator || ''),
    medium: typeof o.medium === 'string' && o.medium ? o.medium : '소설',
    year: String(o.year || ''),
    blurb: String(o.blurb || ''),
    x: clampN(Number(o.x) || 0),
    y: clampN(Number(o.y) || 0),
    similar: String(o.similar || ''),
    different: String(o.different || ''),
    stars: clampStars(Number(o.stars ?? 3)),
    color: typeof o.color === 'string' && o.color ? o.color : DOT_COLORS[i % DOT_COLORS.length],
    createdAt: Number.isFinite(o.createdAt) ? Number(o.createdAt) : Date.now(),
  }
}

function loadState(): State {
  const base = defaultState()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    const ax = p?.axes || {}
    return {
      myTitle: String(p?.myTitle || ''),
      pitchA: String(p?.pitchA || ''),
      pitchB: String(p?.pitchB || ''),
      myBlurb: String(p?.myBlurb || ''),
      myX: clampN(Number(p?.myX) || 0),
      myY: clampN(Number(p?.myY) || 0),
      axes: {
        x: {
          id: 'x',
          lowLabel: String(ax?.x?.lowLabel || base.axes.x.lowLabel),
          highLabel: String(ax?.x?.highLabel || base.axes.x.highLabel),
        },
        y: {
          id: 'y',
          lowLabel: String(ax?.y?.lowLabel || base.axes.y.lowLabel),
          highLabel: String(ax?.y?.highLabel || base.axes.y.highLabel),
        },
      },
      edge: String(p?.edge || ''),
      comps: Array.isArray(p?.comps) ? p.comps.map(sanitizeComp) : [],
    }
  } catch {
    return base
  }
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 좌표(-100..100) → 0..100% 픽셀 비율. y는 위가 high 가 되도록 반전.
const toPctX = (v: number) => ((clampN(v) + 100) / 200) * 100
const toPctY = (v: number) => (1 - (clampN(v) + 100) / 200) * 100

// ---------- 포지셔닝 요약 자동 조합 ----------
function buildPitch(s: State): string {
  const a = s.pitchA.trim()
  const b = s.pitchB.trim()
  if (a && b) return `《${s.myTitle.trim() || '내 작품'}》은(는) “${a} 만나 ${b}”.`
  if (a) return `《${s.myTitle.trim() || '내 작품'}》은(는) “${a}” 계열.`
  return ''
}

function buildEdge(s: State): string {
  if (s.edge.trim()) return s.edge.trim()
  // 비교작들의 "다른 점"을 모아 한 줄 차별점으로 합성.
  const diffs = s.comps.map((c) => c.different.trim()).filter(Boolean)
  if (diffs.length) {
    const head = diffs.slice(0, 3).join(' · ')
    return `기존작과 달리 ${head}`
  }
  return ''
}

// 좌표 위치를 말로 풀어 위치 진술 생성.
function buildLocation(s: State): string {
  const ax = s.axes
  const pick = (v: number, low: string, high: string) => {
    if (v <= -34) return low
    if (v >= 34) return high
    return `${low}↔${high}의 중간`
  }
  const sx = pick(s.myX, ax.x.lowLabel, ax.x.highLabel)
  const sy = pick(s.myY, ax.y.lowLabel, ax.y.highLabel)
  return `좌표상 〈${sx}〉이면서 〈${sy}〉 쪽에 위치.`
}

export default function CompTitles({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [st, setSt] = useState<State>(init.current)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Comp>(() => blankComp(init.current.comps.length))
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [dropping, setDropping] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)   // 맵에서 드래그 중인 점

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)

  // payload(가제/한줄) 1회 적용
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (payload && typeof payload === 'object') {
      const t = typeof payload.title === 'string' ? payload.title : ''
      const b = typeof payload.blurb === 'string' ? payload.blurb
        : typeof payload.text === 'string' ? payload.text : ''
      if (t || b) {
        setSt((p) => ({ ...p, myTitle: p.myTitle || t, myBlurb: p.myBlurb || b }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장(용량/차단 시 안내)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st])

  const flash = useCallback((msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }, [])

  const copy = useCallback((text: string, tag: string) => {
    const done = () => {
      if (!mounted.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    }
    try {
      if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => flash('복사에 실패했습니다.'))
      else flash('이 환경에선 복사를 지원하지 않습니다.')
    } catch { flash('복사에 실패했습니다.') }
  }, [flash])

  // ---------- 상태 갱신 헬퍼 ----------
  const setS = (patch: Partial<State>) => setSt((p) => ({ ...p, ...patch }))
  const setAxis = (id: 'x' | 'y', side: 'lowLabel' | 'highLabel', v: string) =>
    setSt((p) => ({ ...p, axes: { ...p.axes, [id]: { ...p.axes[id], [side]: v } } }))
  const setDraftF = <K extends keyof Comp>(k: K, v: Comp[K]) => setDraft((d) => ({ ...d, [k]: v }))

  // ---------- 비교작 CRUD ----------
  const startNew = () => { setEditId(null); setDraft(blankComp(st.comps.length)) }
  const saveComp = () => {
    const d: Comp = { ...draft, title: draft.title.trim(), x: clampN(draft.x), y: clampN(draft.y), stars: clampStars(draft.stars) }
    if (!d.title) { flash('비교작 제목을 입력하세요.'); return }
    if (editId) {
      setSt((p) => ({ ...p, comps: p.comps.map((c) => (c.id === editId ? { ...d, id: editId, createdAt: c.createdAt } : c)) }))
      flash('비교작을 수정했습니다.')
    } else {
      setSt((p) => ({ ...p, comps: [...p.comps, { ...d, id: newId(), createdAt: Date.now() }] }))
      flash('비교작을 추가했습니다.')
    }
    setEditId(null)
    setDraft(blankComp(st.comps.length + 1))
  }
  const editComp = (c: Comp) => { setEditId(c.id); setDraft({ ...c }) }
  const removeComp = (id: string) => {
    setSt((p) => ({ ...p, comps: p.comps.filter((c) => c.id !== id) }))
    if (editId === id) { setEditId(null); setDraft(blankComp(st.comps.length)) }
  }
  const cancelEdit = () => { setEditId(null); setDraft(blankComp(st.comps.length)) }

  // ---------- 좌측 바인더 파일 드롭 → 비교작 초안 채우기 ----------
  const onDrop = (e: React.DragEvent) => {
    setDropping(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    setEditId(null)
    setDraft((d) => ({
      ...blankComp(st.comps.length),
      color: d.color,
      title: item.title || d.title,
      blurb: (item.text || '').slice(0, 120),
    }))
    flash(`〈${item.title}〉을(를) 비교작 초안으로 불러왔습니다.`)
  }

  // ---------- 좌표 맵 드래그 ----------
  const ptFromEvent = (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const el = mapRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return null
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    return { x: clampN(px * 200 - 100), y: clampN((1 - py) * 200 - 100) }
  }
  const onMapPointerMove = useCallback((e: PointerEvent) => {
    if (!dragId) return
    const pt = ptFromEvent(e)
    if (!pt) return
    if (dragId === '__me__') setSt((p) => ({ ...p, myX: pt.x, myY: pt.y }))
    else setSt((p) => ({ ...p, comps: p.comps.map((c) => (c.id === dragId ? { ...c, x: pt.x, y: pt.y } : c)) }))
  }, [dragId])
  const endDrag = useCallback(() => setDragId(null), [])
  useEffect(() => {
    if (!dragId) return
    window.addEventListener('pointermove', onMapPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onMapPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [dragId, onMapPointerMove, endDrag])

  // ---------- 파생값 ----------
  const pitch = useMemo(() => buildPitch(st), [st])
  const edge = useMemo(() => buildEdge(st), [st])
  const location = useMemo(() => buildLocation(st), [st])
  const sortedComps = useMemo(() => [...st.comps].sort((a, b) => b.stars - a.stars || a.createdAt - b.createdAt), [st.comps])

  // 포지셔닝 요약 텍스트(복사/내보내기용)
  const summaryText = useMemo(() => {
    const lines: string[] = []
    lines.push(`# 작품 포지셔닝 — ${st.myTitle.trim() || '(가제 없음)'}`)
    if (pitch) lines.push(pitch.replace(/《|》/g, '').trim())
    if (st.myBlurb.trim()) lines.push(`한 줄: ${st.myBlurb.trim()}`)
    lines.push(`장르 좌표: ${st.axes.x.lowLabel}↔${st.axes.x.highLabel} / ${st.axes.y.lowLabel}↔${st.axes.y.highLabel}`)
    lines.push(location)
    if (edge) lines.push(`차별점: ${edge}`)
    if (st.comps.length) {
      lines.push('', `비교작 ${st.comps.length}편:`)
      sortedComps.forEach((c) => {
        const meta = [c.creator, c.medium, c.year].filter(Boolean).join('·')
        lines.push(`- ${'★'.repeat(c.stars)}${'☆'.repeat(5 - c.stars)} 《${c.title}》${meta ? ` (${meta})` : ''}`)
        if (c.blurb.trim()) lines.push(`    ${c.blurb.trim()}`)
        if (c.similar.trim()) lines.push(`    닮은 점: ${c.similar.trim()}`)
        if (c.different.trim()) lines.push(`    다른 점: ${c.different.trim()}`)
      })
    }
    return lines.join('\n')
  }, [st, pitch, edge, location, sortedComps])

  // ---------- 연계: 프로젝트 자료〈기획〉에 포지셔닝 문서 추가 ----------
  const addPositioningDoc = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const row = (label: string, v: string) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v || '-')}</p>`
    const parts: string[] = []
    if (pitch) parts.push(`<p style="font-size:16px;line-height:1.7;"><b>${escapeHtml(pitch.replace(/《|》/g, ''))}</b></p>`)
    if (st.myBlurb.trim()) parts.push(`<p style="line-height:1.7;">${escapeHtml(st.myBlurb.trim())}</p>`)
    parts.push('<hr/>')
    parts.push(row('장르 좌표 X', `${st.axes.x.lowLabel} ↔ ${st.axes.x.highLabel}`))
    parts.push(row('장르 좌표 Y', `${st.axes.y.lowLabel} ↔ ${st.axes.y.highLabel}`))
    parts.push(row('내 위치', location))
    if (edge) parts.push(row('차별점', edge))
    if (st.comps.length) {
      parts.push(`<hr/><p><b>비교작 ${st.comps.length}편</b></p>`)
      sortedComps.forEach((c) => {
        const m = [c.creator, c.medium, c.year].filter(Boolean).join(' · ')
        const sub: string[] = []
        if (c.blurb.trim()) sub.push(`${escapeHtml(c.blurb.trim())}`)
        if (c.similar.trim()) sub.push(`<i>닮은 점</i> ${escapeHtml(c.similar.trim())}`)
        if (c.different.trim()) sub.push(`<i>다른 점</i> ${escapeHtml(c.different.trim())}`)
        parts.push(
          `<p style="margin:8px 0 2px;"><b>${'★'.repeat(c.stars)}${'☆'.repeat(5 - c.stars)} 《${escapeHtml(c.title)}》</b>${m ? ` <span style="opacity:.7">(${escapeHtml(m)})</span>` : ''}</p>`
          + (sub.length ? `<p style="margin:0 0 6px;line-height:1.6;">${sub.join('<br/>')}</p>` : ''),
        )
      })
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `🎯 포지셔닝 — ${st.myTitle.trim() || '내 작품'}`,
      bodyHtml: parts.join(''),
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 포지셔닝 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 비교작 카드 1장을 개별 문서로
  const addCompDoc = (c: Comp) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const m = [c.creator, c.medium, c.year].filter(Boolean).join(' · ')
    const row = (label: string, v: string) => (v.trim() ? `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v.trim())}</p>` : '')
    const bodyHtml = [
      m ? `<p style="opacity:.75">${escapeHtml(m)}</p>` : '',
      `<p>참고도: ${'★'.repeat(c.stars)}${'☆'.repeat(5 - c.stars)}</p>`,
      row('한 줄 소개', c.blurb),
      row('닮은 점(가져올 것)', c.similar),
      row('다른 점(차별점)', c.different),
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `비교작 · 《${c.title}》`, bodyHtml,
    })
    flash(id ? `《${c.title}》 카드를 프로젝트 〈기획〉에 추가했습니다.` : '프로젝트에 추가하지 못했습니다.')
  }

  const saveSnippet = () => {
    if (!pitch && !st.myBlurb.trim() && !edge) { flash('요약할 내용이 없습니다.'); return }
    addToLibrary('snippets', { text: summaryText, source: '비교작 정리', tags: ['포지셔닝', '비교작'] })
    flash('포지셔닝 요약을 스니펫 라이브러리에 저장했습니다.')
  }
  const toStash = () => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `포지셔닝 — ${st.myTitle.trim() || '내 작품'}`, text: summaryText })
    flash('수집함에 담았습니다.')
  }

  const hasAnything = !!(pitch || st.myBlurb.trim() || edge || st.comps.length)

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 150 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const pitchBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'keep-all' }

  // 별점 입력
  const Stars = ({ value, onPick }: { value: number; onPick: (n: number) => void }) => (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onPick(n === value ? n - 1 : n)} title={`참고도 ${n}`} aria-label={`참고도 ${n}점`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, color: n <= value ? 'var(--accent)' : 'var(--muted)' }}>
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </span>
  )

  // 좌표 슬라이더
  const AxisSlider = ({ value, onChange, lo, hi }: { value: number; onChange: (n: number) => void; lo: string; hi: string }) => (
    <div>
      <input type="range" min={-100} max={100} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
        <span>← {lo}</span><span>{hi} →</span>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎯"/> 비교작 정리</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>“X 만나 Y” · 장르 좌표 · 차별점</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(summaryText, 'all')} disabled={!hasAnything}>{copied === 'all' ? '✓ 복사됨' : '⬇ 요약 복사'}</button>
        </div>
      </div>

      <div
        style={{ ...body, outline: dropping ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
        onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropping(true) } }}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
      >
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {/* 내 작품 정의 */}
        <div style={card}>
          <h4 style={sectionTitle}>① 내 작품 — “X 만나 Y”로 한 줄에 잡기</h4>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>작품 가제</label>
            <input style={input} value={st.myTitle} onChange={(e) => setS({ myTitle: e.target.value })} placeholder="예: 새벽의 등대지기" maxLength={80} />
          </div>
          <div style={{ ...twoRow, marginBottom: 6 }}>
            <div style={col}>
              <label style={fieldLabel}>X (이 작품의 분위기/세계)</label>
              <input style={input} value={st.pitchA} onChange={(e) => setS({ pitchA: e.target.value })} placeholder="예: 《미스트》" maxLength={60} />
            </div>
            <div style={{ ...col, flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 8, color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>만나</div>
            <div style={col}>
              <label style={fieldLabel}>Y (여기에 더할 색)</label>
              <input style={input} value={st.pitchB} onChange={(e) => setS({ pitchB: e.target.value })} placeholder="예: 《리틀 포레스트》" maxLength={60} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={fieldLabel}>한 줄 소개(선택)</label>
            <input style={input} value={st.myBlurb} onChange={(e) => setS({ myBlurb: e.target.value })} placeholder="예: 폐쇄된 어촌에서 벌어지는 따뜻한 미스터리" maxLength={140} />
          </div>
          {pitch && <div style={{ ...pitchBox, marginTop: 12 }}>{pitch}</div>}
        </div>

        {/* 장르 좌표 맵 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>② 장르 좌표 — 점을 끌어 위치를 잡으세요</h4>
            <span style={{ ...hint, marginLeft: 'auto' }}>축 이름은 직접 바꿀 수 있어요</span>
          </div>

          {/* 축 이름 편집 */}
          <div style={{ ...twoRow, marginBottom: 12 }}>
            <div style={col}>
              <label style={fieldLabel}>가로축(X)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...input, fontSize: 12 }} value={st.axes.x.lowLabel} onChange={(e) => setAxis('x', 'lowLabel', e.target.value)} placeholder="왼쪽" maxLength={20} />
                <input style={{ ...input, fontSize: 12 }} value={st.axes.x.highLabel} onChange={(e) => setAxis('x', 'highLabel', e.target.value)} placeholder="오른쪽" maxLength={20} />
              </div>
            </div>
            <div style={col}>
              <label style={fieldLabel}>세로축(Y)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...input, fontSize: 12 }} value={st.axes.y.lowLabel} onChange={(e) => setAxis('y', 'lowLabel', e.target.value)} placeholder="아래" maxLength={20} />
                <input style={{ ...input, fontSize: 12 }} value={st.axes.y.highLabel} onChange={(e) => setAxis('y', 'highLabel', e.target.value)} placeholder="위" maxLength={20} />
              </div>
            </div>
          </div>

          {/* 좌표 평면 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {/* 세로축 라벨 */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: 'var(--muted)', writingMode: 'vertical-rl', textAlign: 'center', padding: '4px 0' }}>
              <span>{st.axes.y.highLabel}</span>
              <span>{st.axes.y.lowLabel}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div
                ref={mapRef}
                style={{
                  position: 'relative', width: '100%', aspectRatio: '4 / 3',
                  background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
                  overflow: 'hidden', touchAction: 'none', cursor: dragId ? 'grabbing' : 'default',
                }}
              >
                {/* 십자 가이드 */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--border)' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--border)' }} />

                {/* 비교작 점 */}
                {st.comps.map((c) => (
                  <div
                    key={c.id}
                    onPointerDown={(e) => { e.preventDefault(); setDragId(c.id) }}
                    title={`${c.title} — 끌어서 이동`}
                    style={{
                      position: 'absolute', left: `${toPctX(c.x)}%`, top: `${toPctY(c.y)}%`,
                      transform: 'translate(-50%,-50%)', cursor: 'grab', touchAction: 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      maxWidth: 110, zIndex: dragId === c.id ? 5 : 1,
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, border: '2px solid var(--paper)', boxShadow: '0 0 0 1px ' + c.color }} />
                    <span style={{ fontSize: 10, color: 'var(--text)', background: 'color-mix(in srgb, var(--paper) 80%, transparent)', padding: '0 3px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{c.title || '(무제)'}</span>
                  </div>
                ))}

                {/* 내 작품 점 */}
                <div
                  onPointerDown={(e) => { e.preventDefault(); setDragId('__me__') }}
                  title="내 작품 — 끌어서 이동"
                  style={{
                    position: 'absolute', left: `${toPctX(st.myX)}%`, top: `${toPctY(st.myY)}%`,
                    transform: 'translate(-50%,-50%)', cursor: 'grab', touchAction: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, zIndex: dragId === '__me__' ? 6 : 2,
                  }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', border: '3px solid var(--paper)', boxShadow: '0 0 0 1px var(--accent), var(--shadow)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 9 }}>★</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--paper) 85%, transparent)', padding: '0 4px', borderRadius: 4, whiteSpace: 'nowrap' }}>{st.myTitle.trim() || '내 작품'}</span>
                </div>
              </div>
              {/* 가로축 라벨 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                <span>← {st.axes.x.lowLabel}</span><span>{st.axes.x.highLabel} →</span>
              </div>
            </div>
          </div>
          {location && <div style={{ ...hint, marginTop: 10, color: 'var(--text)' }}><Emoji e="📍"/> {location}</div>}
        </div>

        {/* 비교작 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>③ {editId ? <><Emoji e="✏️"/> 비교작 수정</> : '비교작 추가'} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11.5 }}>— 좌측 바인더 파일을 끌어다 놓아도 됩니다</span></h4>
          <div style={{ ...twoRow, marginBottom: 8 }}>
            <div style={{ ...col, flex: 2, minWidth: 180 }}>
              <label style={fieldLabel}>제목 *</label>
              <input style={input} value={draft.title} onChange={(e) => setDraftF('title', e.target.value)} placeholder="예: 《미스트》" maxLength={80} />
            </div>
            <div style={col}>
              <label style={fieldLabel}>저자·감독</label>
              <input style={input} value={draft.creator} onChange={(e) => setDraftF('creator', e.target.value)} placeholder="예: 스티븐 킹" maxLength={60} />
            </div>
          </div>
          <div style={{ ...twoRow, marginBottom: 8 }}>
            <div style={col}>
              <label style={fieldLabel}>매체</label>
              <select style={{ ...input, cursor: 'pointer' }} value={draft.medium} onChange={(e) => setDraftF('medium', e.target.value)}>
                {MEDIA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={col}>
              <label style={fieldLabel}>연도</label>
              <input style={input} value={draft.year} onChange={(e) => setDraftF('year', e.target.value)} placeholder="예: 2007" maxLength={12} />
            </div>
            <div style={{ ...col, flex: '0 0 auto' }}>
              <label style={fieldLabel}>참고도</label>
              <div style={{ paddingTop: 5 }}><Stars value={draft.stars} onPick={(n) => setDraftF('stars', n)} /></div>
            </div>
            <div style={{ ...col, flex: '0 0 auto' }}>
              <label style={fieldLabel}>점 색</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 4 }}>
                {DOT_COLORS.map((c) => (
                  <button key={c} onClick={() => setDraftF('color', c)} title={c} aria-label={`색 ${c}`}
                    style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: draft.color === c ? '2px solid var(--text)' : '2px solid var(--border)', padding: 0 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={fieldLabel}>한 줄 소개</label>
            <input style={input} value={draft.blurb} onChange={(e) => setDraftF('blurb', e.target.value)} placeholder="이 작품은 어떤 이야기인가" maxLength={140} />
          </div>
          <div style={{ ...twoRow, marginBottom: 8 }}>
            <div style={col}>
              <label style={fieldLabel}>닮은 점 — 이걸 가져온다</label>
              <textarea style={{ ...input, resize: 'vertical', minHeight: 48, fontFamily: 'inherit' }} value={draft.similar} onChange={(e) => setDraftF('similar', e.target.value)} placeholder="예: 밀폐 공간의 긴장감, 군중 심리" maxLength={300} />
            </div>
            <div style={col}>
              <label style={fieldLabel}>다른 점 — 이건 다르게 간다(차별점)</label>
              <textarea style={{ ...input, resize: 'vertical', minHeight: 48, fontFamily: 'inherit' }} value={draft.different} onChange={(e) => setDraftF('different', e.target.value)} placeholder="예: 공포 대신 공동체의 회복에 초점" maxLength={300} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>좌표 — 슬라이더 또는 맵에서 점을 끌어 조정</label>
            <div style={twoRow}>
              <div style={col}><AxisSlider value={draft.x} onChange={(n) => setDraftF('x', n)} lo={st.axes.x.lowLabel} hi={st.axes.x.highLabel} /></div>
              <div style={col}><AxisSlider value={draft.y} onChange={(n) => setDraftF('y', n)} lo={st.axes.y.lowLabel} hi={st.axes.y.highLabel} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveComp}>{editId ? '수정 저장' : '＋ 비교작 추가'}</button>
            {editId ? <button className="minibtn" onClick={cancelEdit}>취소</button>
              : <button className="minibtn" onClick={startNew}>초기화</button>}
          </div>
        </div>

        {/* 비교작 목록 (CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>④ 비교작 목록 · {st.comps.length}편 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11.5 }}>(참고도순)</span></h4>
          {st.comps.length === 0 ? (
            <div style={empty}>
              아직 비교작이 없습니다.<br />
              위에서 “X 만나 Y”의 X·Y로 떠올린 작품들을 비교작으로 추가해 보세요.<br />
              <span style={{ fontSize: 12 }}>좌측 바인더의 자료 파일을 이 영역에 <b>끌어다 놓으면</b> 제목·내용이 초안으로 채워집니다.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sortedComps.map((c) => {
                const m = [c.creator, c.medium, c.year].filter(Boolean).join(' · ')
                return (
                  <div key={c.id} style={{ background: 'var(--chrome-2)', border: '1px solid ' + (editId === c.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <b style={{ fontSize: 13.5 }}>《{c.title || '(무제)'}》</b>
                      <span style={{ fontSize: 11, color: 'var(--accent)' }}>{'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}</span>
                      {m && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m}</span>}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title="이 카드를 프로젝트 〈기획〉에 추가" onClick={() => addCompDoc(c)} disabled={!hasProjectBridge()}><Emoji e="📄"/></button>
                        <button style={iconBtn} title="요약 복사" onClick={() => {
                          const t = [`《${c.title}》${m ? ` (${m})` : ''}`, c.blurb && `소개: ${c.blurb}`, c.similar && `닮은 점: ${c.similar}`, c.different && `다른 점: ${c.different}`].filter(Boolean).join('\n')
                          copy(t, 'c' + c.id)
                        }}>{copied === 'c' + c.id ? '✓' : '복사'}</button>
                        <button style={iconBtn} title="수정" onClick={() => editComp(c)}><Emoji e="✏️"/></button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeComp(c.id)}><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                    {c.blurb.trim() && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)', wordBreak: 'keep-all' }}>{c.blurb}</div>}
                    {(c.similar.trim() || c.different.trim()) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, lineHeight: 1.55 }}>
                        {c.similar.trim() && <span style={{ flex: 1, minWidth: 160, color: 'var(--ok)' }}>＋ 닮은 점: <span style={{ color: 'var(--text)' }}>{c.similar}</span></span>}
                        {c.different.trim() && <span style={{ flex: 1, minWidth: 160, color: 'var(--warn)' }}>↗ 다른 점: <span style={{ color: 'var(--text)' }}>{c.different}</span></span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 차별점·포지셔닝 요약 */}
        <div style={card}>
          <h4 style={sectionTitle}>⑤ 한 줄 차별점 & 포지셔닝</h4>
          <label style={fieldLabel}>차별점 — 직접 적거나, 비워두면 비교작들의 “다른 점”으로 자동 조합</label>
          <input style={input} value={st.edge} onChange={(e) => setS({ edge: e.target.value })} placeholder={edge && !st.edge ? `자동: ${edge}` : '예: 재난물의 긴장에 회복의 온기를 더한 “따뜻한 미스터리”'} maxLength={200} />
          {(pitch || edge || st.myBlurb.trim()) && (
            <div style={{ ...pitchBox, marginTop: 12, borderColor: 'var(--border)' }}>
              {pitch && <div style={{ fontWeight: 700 }}>{pitch}</div>}
              {st.myBlurb.trim() && <div style={{ marginTop: 4, fontSize: 13.5 }}>{st.myBlurb.trim()}</div>}
              {edge && <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--accent-2)' }}>차별점: {edge}</div>}
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>{location}</div>
            </div>
          )}

          {/* 연계 버튼 */}
          <div className="linkbar" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={addPositioningDoc} disabled={!hasProjectBridge() || !hasAnything}
              title={hasProjectBridge() ? '포지셔닝 전체를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="minibtn" onClick={saveSnippet} disabled={!hasAnything} title="포지셔닝 요약을 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
            <button className="minibtn" onClick={toStash} disabled={!hasStash() || !hasAnything} title="포지셔닝 요약을 수집함에 담기"><Emoji e="🧺"/> 수집함</button>
            <button className="minibtn" onClick={() => copy(summaryText, 'all2')} disabled={!hasAnything}>{copied === 'all2' ? '✓ 복사됨' : <><Emoji e="📋"/> 요약 복사</>}</button>
          </div>
        </div>

        <div style={hint}>
          “비교작(comps)”은 투고서·기획서·플랫폼 소개에서 작품을 한눈에 자리매김하는 도구입니다.
          잘 알려진 작품을 끌어와 <b>“A 만나 B”</b>로 분위기를 압축하고, 무엇을 <b>가져오고(닮은 점)</b> 무엇을 <b>다르게(다른 점)</b> 가는지 또렷이 하면 작품의 빈칸(시장의 틈)이 드러납니다.
          입력·비교작·좌표는 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
