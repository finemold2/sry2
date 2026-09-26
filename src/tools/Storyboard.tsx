// 스토리보드/콘티 — 영화·웹툰 콘티처럼 순차 패널을 쌓아 장면 흐름을 설계한다.
//  · 패널마다: 캔버스 스케치(펜/지우개/구도 가이드 오버레이) + 장면 설명 + 카메라/구도 메모(샷·앵글·무브)
//  · 패널 추가/복제/삭제, 드래그로 순서 바꾸기, 격자(보드)·집중(한 패널 크게) 두 가지 보기.
//  · 캔버스는 PNG dataURL 로 localStorage 영속. 구도 가이드(삼분할/중앙/대각선)는 그리기 위에 비파괴 오버레이.
//  · 완전 로컬: react 와 './linkbus' 외 import 없음. 외부 미디어 미사용. Web API(canvas) 미지원 시 graceful.
//  · 영속 localStorage 'sry:tool:storyboard'. 언마운트 정리.
//  · 연계: 좌측 바인더 파일 드롭 → 패널 설명 채움(getDragItem). addToProject 로 콘티를 프로젝트 문서로.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'storyboard', name: '스토리보드/콘티', icon: '🎞️', group: '분위기·시각', intro: '순차 패널로 장면을 스케치하고 구도·설명을 메모하는 콘티 보드', w: 940, h: 680 }

const LS_KEY = 'sry:tool:storyboard'
const CW = 480   // 캔버스 논리 폭(저장 해상도)
const CH = 270   // 16:9
const PEN_COLORS = ['#222831', '#db4437', '#1a73e8', '#0f9d58', '#f4b400', '#ffffff']
const PEN_SIZES = [2, 4, 7, 12]

// 샷 사이즈 / 앵글 / 카메라 무브 프리셋(콘티 용어)
const SHOTS = ['', '익스트림 롱샷(ELS)', '롱샷(LS)', '풀샷(FS)', '미디엄샷(MS)', '바스트샷', '클로즈업(CU)', '익스트림 클로즈업(ECU)', '투샷', '오버더숄더(OTS)', 'POV']
const ANGLES = ['', '아이레벨', '하이앵글', '로우앵글', '버드아이', '웜즈아이', '더치앵글', '탑다운']
const MOVES = ['', '고정(픽스)', '팬', '틸트', '줌인', '줌아웃', '달리인', '달리아웃', '트래킹', '핸드헬드', '크레인', '페이드']

// 구도 가이드(비파괴 오버레이)
type Guide = 'none' | 'thirds' | 'center' | 'diagonal' | 'golden'
const GUIDE_LABEL: Record<Guide, string> = { none: '없음', thirds: '삼분할', center: '중앙', diagonal: '대각선', golden: '황금나선' }

interface Panel {
  id: string
  title: string
  desc: string
  shot: string
  angle: string
  move: string
  dialog: string      // 대사/내레이션
  sound: string       // 효과음/음악 큐
  dur: string         // 길이(초/컷 수 등 자유)
  guide: Guide
  img: string         // 스케치 PNG dataURL ('' = 빈 캔버스)
}
interface SaveShape { title: string; panels: Panel[]; view: 'board' | 'focus'; focusId: string | null }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function emptyPanel(n: number): Panel {
  return { id: newId(), title: `컷 ${n}`, desc: '', shot: '', angle: '', move: '', dialog: '', sound: '', dur: '', guide: 'thirds', img: '' }
}
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', panels: [emptyPanel(1)], view: 'board', focusId: null }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') throw new Error('bad')
    const panels: Panel[] = Array.isArray(p.panels) && p.panels.length
      ? p.panels.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>, i: number) => ({
          id: typeof x.id === 'string' ? x.id : newId(),
          title: typeof x.title === 'string' ? x.title : `컷 ${i + 1}`,
          desc: typeof x.desc === 'string' ? x.desc : '',
          shot: typeof x.shot === 'string' ? x.shot : '',
          angle: typeof x.angle === 'string' ? x.angle : '',
          move: typeof x.move === 'string' ? x.move : '',
          dialog: typeof x.dialog === 'string' ? x.dialog : '',
          sound: typeof x.sound === 'string' ? x.sound : '',
          dur: typeof x.dur === 'string' ? x.dur : '',
          guide: (['none', 'thirds', 'center', 'diagonal', 'golden'].includes(x.guide as string) ? x.guide : 'thirds') as Guide,
          img: typeof x.img === 'string' ? x.img : '',
        }))
      : [emptyPanel(1)]
    return {
      title: typeof p.title === 'string' ? p.title : '',
      panels,
      view: p.view === 'focus' ? 'focus' : 'board',
      focusId: typeof p.focusId === 'string' ? p.focusId : null,
    }
  } catch { return { title: '', panels: [emptyPanel(1)], view: 'board', focusId: null } }
}

// ── 캔버스: 한 패널 스케치 에디터 ─────────────────────────────
interface SketchProps {
  panel: Panel
  color: string
  size: number
  erase: boolean
  big: boolean              // 집중 보기(큰 캔버스)
  onCommit: (img: string) => void  // 그리기 끝나면 dataURL 저장
}
function Sketch({ panel, color, size, erase, big, onCommit }: SketchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const supported = useRef(true)
  const painted = useRef('')   // 캔버스에 마지막으로 반영한 img(자기 커밋 무시·외부 변경만 재그림)

  // 배경 스케치(panel.img)를 캔버스에 복원 — 가이드는 별도 SVG 오버레이라 비파괴.
  // 우리가 방금 그려서 커밋한 이미지(painted)와 같으면 다시 그리지 않아 깜빡임을 막는다.
  const repaint = useCallback((img: string) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) { supported.current = false; return }
    painted.current = img
    ctx.clearRect(0, 0, CW, CH)
    if (img) {
      const im = new Image()
      im.onload = () => { try { ctx.drawImage(im, 0, 0, CW, CH) } catch { /* noop */ } }
      im.src = img
    }
  }, [])

  // 패널 전환 시(또는 외부에서 img 변경, 예: 🧽 지우기) 캔버스를 다시 그린다.
  useEffect(() => {
    if (panel.img === painted.current) return  // 자기 커밋이면 이미 화면에 있음 → 스킵
    repaint(panel.img)
  }, [panel.id, panel.img, repaint])

  const pos = (e: React.PointerEvent) => {
    const cv = canvasRef.current
    if (!cv) return { x: 0, y: 0 }
    const r = cv.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * CW, y: ((e.clientY - r.top) / r.height) * CH }
  }
  const start = (e: React.PointerEvent) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) { supported.current = false; return }
    drawing.current = true
    last.current = pos(e)
    try { cv.setPointerCapture(e.pointerId) } catch { /* noop */ }
    // 점 한 번에 찍히도록 시작점에도 짧은 선
    drawSeg(ctx, last.current, last.current)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    drawSeg(ctx, last.current || p, p)
    last.current = p
  }
  const drawSeg = (ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }) => {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size
    if (erase) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.restore()
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    const cv = canvasRef.current
    if (!cv) return
    try {
      const data = cv.toDataURL('image/png')
      painted.current = data   // 자기 커밋 표시 → 재그림(깜빡임) 방지
      onCommit(data)
    } catch { /* 보안/미지원 무시 */ }
  }

  const boxStyle: React.CSSProperties = {
    position: 'relative', width: '100%', aspectRatio: `${CW} / ${CH}`,
    background: '#fbfbfb', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)',
  }

  return (
    <div style={boxStyle}>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: erase ? 'cell' : 'crosshair' }}
      />
      <GuideOverlay guide={panel.guide} />
      {!supported.current && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted)', background: 'rgba(255,255,255,.7)' }}>
          이 브라우저에서는 스케치를 지원하지 않습니다.
        </div>
      )}
      {!big && <span style={{ position: 'absolute', left: 4, top: 4, fontSize: 9, color: 'var(--muted)', pointerEvents: 'none', opacity: .5 }}>{CW}×{CH}</span>}
    </div>
  )
}

// 비파괴 구도 가이드(SVG 오버레이) — 그림에 섞이지 않음
function GuideOverlay({ guide }: { guide: Guide }) {
  if (guide === 'none') return null
  const stroke = 'rgba(74,118,212,0.55)'
  const sw = 1
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {guide === 'thirds' && (
        <g stroke={stroke} strokeWidth={sw} fill="none">
          <line x1={CW / 3} y1={0} x2={CW / 3} y2={CH} />
          <line x1={(2 * CW) / 3} y1={0} x2={(2 * CW) / 3} y2={CH} />
          <line x1={0} y1={CH / 3} x2={CW} y2={CH / 3} />
          <line x1={0} y1={(2 * CH) / 3} x2={CW} y2={(2 * CH) / 3} />
        </g>
      )}
      {guide === 'center' && (
        <g stroke={stroke} strokeWidth={sw} fill="none">
          <line x1={CW / 2} y1={0} x2={CW / 2} y2={CH} />
          <line x1={0} y1={CH / 2} x2={CW} y2={CH / 2} />
          <circle cx={CW / 2} cy={CH / 2} r={Math.min(CW, CH) / 6} />
        </g>
      )}
      {guide === 'diagonal' && (
        <g stroke={stroke} strokeWidth={sw} fill="none">
          <line x1={0} y1={0} x2={CW} y2={CH} />
          <line x1={CW} y1={0} x2={0} y2={CH} />
        </g>
      )}
      {guide === 'golden' && (
        <g stroke={stroke} strokeWidth={sw} fill="none">
          <line x1={CW * 0.618} y1={0} x2={CW * 0.618} y2={CH} />
          <line x1={CW * 0.382} y1={0} x2={CW * 0.382} y2={CH} />
          <line x1={0} y1={CH * 0.618} x2={CW} y2={CH * 0.618} />
          <line x1={0} y1={CH * 0.382} x2={CW} y2={CH * 0.382} />
          <path d={`M ${CW * 0.618} 0 A ${CW * 0.618} ${CW * 0.618} 0 0 1 ${CW} ${CW * 0.382}`} opacity={0.7} />
        </g>
      )}
    </svg>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function Storyboard({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [panels, setPanels] = useState<Panel[]>(init.current.panels)
  const [view, setView] = useState<'board' | 'focus'>(init.current.view)
  const [focusId, setFocusId] = useState<string | null>(init.current.focusId || (init.current.panels[0]?.id ?? null))

  // 그리기 도구 상태(영속 불필요 — 세션 한정)
  const [color, setColor] = useState(PEN_COLORS[0])
  const [penSize, setPenSize] = useState(PEN_SIZES[1])
  const [erase, setErase] = useState(false)

  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [dropOver, setDropOver] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 들어온 제목/설명을 첫 패널에 반영(연계 진입)
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.title === 'string' ? payload.title : ''
    const d = typeof payload.desc === 'string' ? payload.desc : (typeof payload.text === 'string' ? payload.text : '')
    if (!t && !d) return
    setPanels((prev) => {
      if (!prev.length) return prev
      const first = { ...prev[0] }
      if (t && !first.title.trim()) first.title = t
      if (d && !first.desc.trim()) first.desc = d
      return [first, ...prev.slice(1)]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 용량 초과(스케치가 많으면) graceful 안내
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ title, panels, view, focusId } as SaveShape))
      if (note) setNote('')
    } catch {
      if (mounted.current) setNote('저장 공간이 가득 찼어요(스케치가 많은 듯). 일부 컷을 정리하면 다시 저장됩니다.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, panels, view, focusId])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const flash = (m: string) => { if (mounted.current) setToast(m) }

  // ── 패널 CRUD ───────────────────────────────────────────────
  const patch = (id: string, p: Partial<Panel>) => setPanels((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const addPanel = (afterId?: string) => {
    setPanels((prev) => {
      const np = emptyPanel(prev.length + 1)
      if (!afterId) { queueFocus(np.id); return [...prev, np] }
      const i = prev.findIndex((x) => x.id === afterId)
      const next = [...prev]
      next.splice(i + 1, 0, np)
      queueFocus(np.id)
      return next
    })
  }
  const dupPanel = (id: string) => {
    setPanels((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      if (i < 0) return prev
      const copy: Panel = { ...prev[i], id: newId(), title: prev[i].title + ' (복제)' }
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return next
    })
    flash('컷을 복제했습니다')
  }
  const removePanel = (id: string) => {
    setPanels((prev) => {
      if (prev.length <= 1) { flash('마지막 컷은 지울 수 없어요'); return prev }
      const next = prev.filter((x) => x.id !== id)
      if (focusId === id) setFocusId(next[0]?.id ?? null)
      return next
    })
  }
  const clearSketch = (id: string) => { patch(id, { img: '' }); flash('스케치를 지웠습니다') }
  const movePanel = (id: string, dir: -1 | 1) => {
    setPanels((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 새 컷을 만들고 집중 보기면 그걸 펼치도록
  const queueFocus = (id: string) => { if (view === 'focus') setTimeout(() => mounted.current && setFocusId(id), 0) }

  // ── 드래그로 순서 바꾸기(보드 보기) ─────────────────────────
  const onDragStartPanel = (e: React.DragEvent, id: string) => {
    dragId.current = id
    try { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move' } catch { /* noop */ }
  }
  const onDragOverPanel = (e: React.DragEvent, id: string) => {
    if (dragId.current && dragId.current !== id) { e.preventDefault(); setDragOver(id) }
  }
  const onDropPanel = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    const from = dragId.current
    setDragOver(null)
    dragId.current = null
    if (!from || from === id) return
    setPanels((prev) => {
      const fi = prev.findIndex((x) => x.id === from)
      const ti = prev.findIndex((x) => x.id === id)
      if (fi < 0 || ti < 0) return prev
      const next = [...prev]
      const [m] = next.splice(fi, 1)
      next.splice(ti, 0, m)
      return next
    })
  }

  // ── 바인더 파일 드롭 → 패널 설명 채우기 ─────────────────────
  const onItemDragOver = (e: React.DragEvent, id: string) => {
    if (isItemDrag(e)) { e.preventDefault(); setDropOver(id) }
  }
  const onItemDrop = (e: React.DragEvent, id: string) => {
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    setDropOver(null)
    const text = (it.text || '').trim()
    patch(id, {
      title: it.title || undefined,
      desc: text ? text.slice(0, 600) : undefined,
    })
    flash(`"${it.title}" 내용을 컷에 넣었습니다`)
  }

  // ── 산출물(콘티 텍스트) ─────────────────────────────────────
  const lineFor = (p: Panel, i: number) => {
    const cam = [p.shot, p.angle, p.move].filter(Boolean).join(' · ')
    const bits = [
      `[${i + 1}] ${p.title}`,
      cam ? `  카메라: ${cam}` : '',
      p.dur ? `  길이: ${p.dur}` : '',
      p.desc ? `  ${p.desc}` : '',
      p.dialog ? `  대사: ${p.dialog}` : '',
      p.sound ? `  사운드: ${p.sound}` : '',
    ].filter(Boolean)
    return bits.join('\n')
  }
  const fullText = () => {
    const head = (title.trim() ? title.trim() + '\n' : '') + `콘티 ${panels.length}컷\n`
    return head + '\n' + panels.map(lineFor).join('\n\n')
  }
  const copyText = () => {
    try {
      navigator.clipboard?.writeText(fullText()).then(() => flash('콘티 텍스트를 복사했습니다')).catch(() => flash('복사에 실패했습니다'))
    } catch { flash('복사를 지원하지 않습니다') }
  }
  const toStash = () => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: (title.trim() || '스토리보드') + ` · ${panels.length}컷`, text: fullText() })
    flash('수집함에 담았습니다')
  }
  const toProject = () => {
    if (!hasProjectBridge()) return
    const rows = panels.map((p, i) => {
      const cam = [p.shot, p.angle, p.move].filter(Boolean).join(' · ')
      const imgCell = p.img
        ? `<img src="${esc(p.img)}" alt="컷 ${i + 1} 스케치" style="width:240px;border:1px solid #ccc;border-radius:6px;display:block"/>`
        : '<span style="color:#999">(스케치 없음)</span>'
      const meta = [
        cam ? `<div><b>카메라</b> ${esc(cam)}</div>` : '',
        p.dur ? `<div><b>길이</b> ${esc(p.dur)}</div>` : '',
        p.desc ? `<div>${esc(p.desc)}</div>` : '',
        p.dialog ? `<div><b>대사</b> ${esc(p.dialog)}</div>` : '',
        p.sound ? `<div><b>사운드</b> ${esc(p.sound)}</div>` : '',
      ].filter(Boolean).join('')
      return `<tr><td style="vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee;width:32px;font-weight:bold">${i + 1}</td>` +
        `<td style="vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee">${imgCell}</td>` +
        `<td style="vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee"><div style="font-weight:bold;margin-bottom:4px">${esc(p.title)}</div>${meta}</td></tr>`
    }).join('')
    const bodyHtml =
      `<p><b>${esc(title.trim() || '스토리보드')}</b> — 총 ${panels.length}컷</p>` +
      `<table style="border-collapse:collapse;width:100%"><thead><tr>` +
      `<th style="text-align:left;padding:4px 8px;border-bottom:2px solid #ccc">#</th>` +
      `<th style="text-align:left;padding:4px 8px;border-bottom:2px solid #ccc">스케치</th>` +
      `<th style="text-align:left;padding:4px 8px;border-bottom:2px solid #ccc">내용</th>` +
      `</tr></thead><tbody>${rows}</tbody></table>`
    const id = addToProject({
      root: 'research', folder: '스토리보드',
      title: (title.trim() || '스토리보드') + ` · ${panels.length}컷`,
      bodyHtml,
      meta: { 컷수: String(panels.length), 종류: '콘티' },
    })
    flash(id ? '프로젝트에 콘티를 추가했습니다' : '프로젝트에 연결되어 있지 않습니다')
  }

  // ── 공용 작은 컴포넌트 ──────────────────────────────────────
  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { placeholder?: string; textarea?: boolean; rows?: number; select?: string[] }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: 'var(--muted)' }}>
      {label}
      {opts?.select ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={selStyle}>
          {opts.select.map((o) => <option key={o} value={o}>{o === '' ? '— 선택 —' : o}</option>)}
        </select>
      ) : opts?.textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder} rows={opts.rows || 3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts?.placeholder} style={inputStyle} />
      )}
    </label>
  )

  const drawBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>펜</span>
      {PEN_COLORS.map((c) => (
        <button key={c} title={c} onClick={() => { setColor(c); setErase(false) }}
          style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: (!erase && color === c) ? '2px solid var(--accent)' : '1px solid var(--border)', boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ccc' : 'none' }} />
      ))}
      <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
      {PEN_SIZES.map((s) => (
        <button key={s} className="minibtn" onClick={() => setPenSize(s)} style={{ minWidth: 30, color: penSize === s ? 'var(--accent)' : undefined, fontWeight: penSize === s ? 700 : 400 }} title={`굵기 ${s}px`}>{s}</button>
      ))}
      <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <button className="minibtn" onClick={() => setErase((e) => !e)} style={{ color: erase ? 'var(--accent)' : undefined, fontWeight: erase ? 700 : 400 }}><Emoji e="🩹" /> {erase ? '지우개 ON' : '지우개'}</button>
    </div>
  )

  const focusPanel = panels.find((p) => p.id === focusId) || panels[0] || null

  // ── 렌더 ────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', boxSizing: 'border-box' }}>
      {/* 상단: 제목 + 보기 전환 + 액션 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="콘티 제목 (예: 추격 시퀀스)"
          style={{ ...inputStyle, flex: 1, minWidth: 160, fontSize: 14, fontWeight: 600 }}
        />
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button className="minibtn" onClick={() => setView('board')} style={{ borderRadius: 0, border: 'none', background: view === 'board' ? 'var(--chrome-2)' : 'transparent', color: view === 'board' ? 'var(--accent)' : undefined }}>▦ 보드</button>
          <button className="minibtn" onClick={() => setView('focus')} style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid var(--border)', background: view === 'focus' ? 'var(--chrome-2)' : 'transparent', color: view === 'focus' ? 'var(--accent)' : undefined }}>◳ 집중</button>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{panels.length}컷</span>
      </div>

      {/* 그리기 도구 막대(항상 노출 — 보드/집중 공통) */}
      <div style={{ flexShrink: 0 }}>{drawBar}</div>

      {/* 본문 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingRight: 2 }}>
        {view === 'board' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10, alignItems: 'start' }}>
            {panels.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => onDragStartPanel(e, p.id)}
                onDragOver={(e) => { onDragOverPanel(e, p.id); onItemDragOver(e, p.id) }}
                onDragLeave={() => { setDragOver(null); setDropOver(null) }}
                onDrop={(e) => { if (isItemDrag(e)) onItemDrop(e, p.id); else onDropPanel(e, p.id) }}
                style={{
                  border: '1px solid ' + (dragOver === p.id ? 'var(--accent)' : dropOver === p.id ? 'var(--ok)' : 'var(--border)'),
                  borderRadius: 10, padding: 8, background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 6,
                  boxShadow: dragOver === p.id ? '0 0 0 2px var(--accent)' : 'none',
                }}
              >
                {/* 헤더: 번호·제목·이동 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span title="드래그로 순서 변경" style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 13, userSelect: 'none' }}>⠿</span>
                  <span style={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                  <input value={p.title} onChange={(e) => patch(p.id, { title: e.target.value })} placeholder="컷 제목" style={{ ...inputStyle, flex: 1, fontSize: 13, fontWeight: 600, padding: '4px 7px' }} />
                </div>

                {/* 스케치 */}
                <Sketch panel={p} color={color} size={penSize} erase={erase} big={false} onCommit={(img) => patch(p.id, { img })} />

                {/* 가이드 토글 + 스케치 정리 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>구도</span>
                  {(Object.keys(GUIDE_LABEL) as Guide[]).map((g) => (
                    <button key={g} className="minibtn" onClick={() => patch(p.id, { guide: g })} style={{ padding: '1px 5px', fontSize: 10, color: p.guide === g ? 'var(--accent)' : undefined, fontWeight: p.guide === g ? 700 : 400 }}>{GUIDE_LABEL[g]}</button>
                  ))}
                  <button className="minibtn" onClick={() => clearSketch(p.id)} style={{ marginLeft: 'auto', padding: '1px 6px', fontSize: 10 }} title="이 컷의 스케치만 지우기"><Emoji e="🧽" /></button>
                </div>

                {/* 카메라 메모 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {field('샷', p.shot, (v) => patch(p.id, { shot: v }), { select: SHOTS })}
                  {field('앵글', p.angle, (v) => patch(p.id, { angle: v }), { select: ANGLES })}
                  {field('무브', p.move, (v) => patch(p.id, { move: v }), { select: MOVES })}
                  {field('길이', p.dur, (v) => patch(p.id, { dur: v }), { placeholder: '예: 3초 / 2컷' })}
                </div>

                {/* 설명 */}
                {field('장면 설명', p.desc, (v) => patch(p.id, { desc: v }), { textarea: true, rows: 2, placeholder: '무슨 일이 벌어지는가? (바인더 파일을 끌어 놓아도 됩니다)' })}

                {/* 액션 */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => movePanel(p.id, -1)} disabled={i === 0} title="앞으로" style={{ padding: '2px 7px' }}>◀</button>
                  <button className="minibtn" onClick={() => movePanel(p.id, 1)} disabled={i === panels.length - 1} title="뒤로" style={{ padding: '2px 7px' }}>▶</button>
                  <button className="minibtn" onClick={() => { setFocusId(p.id); setView('focus') }} title="크게 보기/편집" style={{ padding: '2px 7px' }}><Emoji e="🔍" /> 펼치기</button>
                  <button className="minibtn" onClick={() => dupPanel(p.id)} title="복제" style={{ padding: '2px 7px' }}>⎘</button>
                  <button className="minibtn" onClick={() => addPanel(p.id)} title="이 뒤에 컷 추가" style={{ padding: '2px 7px' }}>＋</button>
                  <button className="minibtn" onClick={() => removePanel(p.id)} title="삭제" style={{ padding: '2px 7px', color: 'var(--warn)', marginLeft: 'auto' }}><Emoji e="🗑" /></button>
                </div>
              </div>
            ))}

            {/* 새 컷 타일 */}
            <button
              onClick={() => addPanel()}
              style={{ minHeight: 220, border: '2px dashed var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
            >
              <span style={{ fontSize: 28 }}>＋</span>새 컷 추가
            </button>
          </div>
        ) : (
          // ── 집중 보기: 한 컷 크게 + 좌측 썸네일 스트립 ──
          focusPanel && (
            <div style={{ display: 'flex', gap: 10, height: '100%', minHeight: 0 }}>
              {/* 썸네일 스트립 */}
              <div style={{ width: 96, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingRight: 2 }}>
                {panels.map((p, i) => (
                  <button
                    key={p.id}
                    draggable
                    onDragStart={(e) => onDragStartPanel(e, p.id)}
                    onDragOver={(e) => onDragOverPanel(e, p.id)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => onDropPanel(e, p.id)}
                    onClick={() => setFocusId(p.id)}
                    title={p.title}
                    style={{
                      position: 'relative', padding: 0, cursor: 'pointer', borderRadius: 7, overflow: 'hidden',
                      border: '2px solid ' + (p.id === focusId ? 'var(--accent)' : dragOver === p.id ? 'var(--ok)' : 'var(--border)'),
                      background: '#fbfbfb', aspectRatio: `${CW} / ${CH}`,
                    }}
                  >
                    {p.img
                      ? <img src={p.img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>빈 컷</span>}
                    <span style={{ position: 'absolute', left: 2, top: 2, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
                  </button>
                ))}
                <button className="minibtn" onClick={() => addPanel()} style={{ padding: '6px 0' }}>＋</button>
              </div>

              {/* 큰 편집 영역 */}
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}
                onDragOver={(e) => onItemDragOver(e, focusPanel.id)}
                onDragLeave={() => setDropOver(null)}
                onDrop={(e) => { if (isItemDrag(e)) onItemDrop(e, focusPanel.id) }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700 }}>{panels.findIndex((x) => x.id === focusPanel.id) + 1}</span>
                  <input value={focusPanel.title} onChange={(e) => patch(focusPanel.id, { title: e.target.value })} placeholder="컷 제목" style={{ ...inputStyle, flex: 1, fontSize: 15, fontWeight: 600 }} />
                </div>

                <div style={{ maxWidth: 640 }}>
                  <Sketch panel={focusPanel} color={color} size={penSize} erase={erase} big onCommit={(img) => patch(focusPanel.id, { img })} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>구도 가이드</span>
                  {(Object.keys(GUIDE_LABEL) as Guide[]).map((g) => (
                    <button key={g} className="minibtn" onClick={() => patch(focusPanel.id, { guide: g })} style={{ color: focusPanel.guide === g ? 'var(--accent)' : undefined, fontWeight: focusPanel.guide === g ? 700 : 400 }}>{GUIDE_LABEL[g]}</button>
                  ))}
                  <button className="minibtn" onClick={() => clearSketch(focusPanel.id)} style={{ marginLeft: 'auto' }}><Emoji e="🧽" /> 스케치 지우기</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {field('샷 사이즈', focusPanel.shot, (v) => patch(focusPanel.id, { shot: v }), { select: SHOTS })}
                  {field('카메라 앵글', focusPanel.angle, (v) => patch(focusPanel.id, { angle: v }), { select: ANGLES })}
                  {field('카메라 무브', focusPanel.move, (v) => patch(focusPanel.id, { move: v }), { select: MOVES })}
                </div>

                {field('장면 설명', focusPanel.desc, (v) => patch(focusPanel.id, { desc: v }), { textarea: true, rows: 3, placeholder: '이 컷에서 무슨 일이 벌어지는가? 인물의 동작·표정·배경을 적으세요.' })}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  {field('대사 / 내레이션', focusPanel.dialog, (v) => patch(focusPanel.id, { dialog: v }), { textarea: true, rows: 2, placeholder: '말풍선·자막·내레이션' })}
                  {field('사운드 / 음악', focusPanel.sound, (v) => patch(focusPanel.id, { sound: v }), { textarea: true, rows: 2, placeholder: '효과음·BGM 큐' })}
                </div>
                {field('길이 / 타이밍', focusPanel.dur, (v) => patch(focusPanel.id, { dur: v }), { placeholder: '예: 약 3초 / 2컷 분량' })}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => movePanel(focusPanel.id, -1)} disabled={panels[0]?.id === focusPanel.id}>◀ 앞으로</button>
                  <button className="minibtn" onClick={() => movePanel(focusPanel.id, 1)} disabled={panels[panels.length - 1]?.id === focusPanel.id}>뒤로 ▶</button>
                  <button className="minibtn" onClick={() => dupPanel(focusPanel.id)}>⎘ 복제</button>
                  <button className="minibtn" onClick={() => addPanel(focusPanel.id)}>＋ 뒤에 컷 추가</button>
                  <button className="minibtn" onClick={() => removePanel(focusPanel.id)} style={{ color: 'var(--warn)', marginLeft: 'auto' }}><Emoji e="🗑" /> 이 컷 삭제</button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* 하단: 전역 액션 + 연계 */}
      <div className="linkbar" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
        <span className="linkbar-label">콘티</span>
        <button className="btn-primary" onClick={() => addPanel()} style={{ padding: '4px 10px' }}>＋ 컷 추가</button>
        <button className="minibtn" onClick={copyText}><Emoji e="📋" /> 텍스트 복사</button>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '스케치 포함 콘티 표를 프로젝트(스토리보드 폴더) 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        {hasStash() && <button className="linkbtn" onClick={toStash}><Emoji e="📥" /> 수집함에 담기</button>}
      </div>

      {toast && <div style={{ fontSize: 11.5, color: 'var(--ok)', flexShrink: 0 }}>✓ {toast}</div>}
      {note && <div style={{ fontSize: 11.5, color: 'var(--warn)', flexShrink: 0 }}>⚠ {note}</div>}
    </div>
  )
}

// 공용 인라인 스타일
const inputStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 7, fontSize: 12.5, background: 'var(--paper)', color: 'var(--text)',
  border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box', width: '100%',
}
const selStyle: React.CSSProperties = { ...inputStyle, padding: '5px 6px', cursor: 'pointer' }
