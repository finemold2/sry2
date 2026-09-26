// 프라이타크 피라미드 — 발단/상승/절정/하강/대단원 5단계를 피라미드로 시각화하고
// 각 단계에 사건을 CRUD(추가/수정/삭제/순서)하며, 사건의 긴장도로 긴장 곡선을 그린다.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:plot-pyramid' 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'plot-pyramid', name: '플롯 피라미드', icon: '🔺', group: '구상·정리', intro: '프라이타크 피라미드 5단계로 사건을 배치하고 긴장 곡선을 그려보세요', w: 640, h: 560 }

const LS_KEY = 'sry:tool:plot-pyramid'

// ── 5단계 정의 ─────────────────────────────────────────────
type StageKey = 'exposition' | 'rising' | 'climax' | 'falling' | 'denouement'
interface StageDef { key: StageKey; label: string; sub: string; color: string; tip: string }
const STAGES: StageDef[] = [
  { key: 'exposition', label: '발단', sub: 'Exposition', color: '#5b8def', tip: '인물·배경·상황을 소개하고 갈등의 씨앗을 심는 단계입니다.' },
  { key: 'rising', label: '상승', sub: 'Rising Action', color: '#3fb27f', tip: '사건이 얽히고 긴장이 점점 고조되며 절정을 향해 치닫는 단계입니다.' },
  { key: 'climax', label: '절정', sub: 'Climax', color: '#e0533d', tip: '갈등이 최고조에 이르는 전환점. 이야기의 운명이 결정됩니다.' },
  { key: 'falling', label: '하강', sub: 'Falling Action', color: '#d99a2b', tip: '절정 이후 사건이 정리되며 결말로 향하는 단계입니다.' },
  { key: 'denouement', label: '대단원', sub: 'Denouement', color: '#8b6fc4', tip: '갈등이 해소되고 이야기가 마무리되는 단계입니다.' },
]
const STAGE_MAP: Record<StageKey, StageDef> = STAGES.reduce((m, s) => { m[s.key] = s; return m }, {} as Record<StageKey, StageDef>)

interface Beat { id: string; stage: StageKey; text: string; tension: number } // tension 1~10
interface SaveShape { beats: Beat[]; title: string }

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampTension(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 5
  return Math.min(10, Math.max(1, v))
}
function isStage(k: unknown): k is StageKey {
  return typeof k === 'string' && (k in STAGE_MAP)
}
function load(): SaveShape {
  const empty: SaveShape = { beats: [], title: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const beats = Array.isArray(p.beats) ? p.beats
      .filter((b: any) => b && typeof b.text === 'string' && isStage(b.stage))
      .map((b: any) => ({ id: String(b.id || newId()), stage: b.stage as StageKey, text: String(b.text), tension: clampTension(b.tension) }))
      : []
    return { beats, title: typeof p.title === 'string' ? p.title : '' }
  } catch { return empty }
}

// 단계별 기본 긴장도(슬라이더 초깃값 가이드)
const DEFAULT_TENSION: Record<StageKey, number> = { exposition: 2, rising: 5, climax: 9, falling: 5, denouement: 2 }

export default function PlotPyramid({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [beats, setBeats] = useState<Beat[]>(() => load().beats)
  const [title, setTitle] = useState<string>(() => load().title)
  const [active, setActive] = useState<StageKey>('exposition')   // 현재 편집 중 단계
  const [draft, setDraft] = useState('')
  const [draftTension, setDraftTension] = useState<number>(DEFAULT_TENSION['exposition'])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editTension, setEditTension] = useState(5)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  // [연계] 보낸 작품 제목(payload.title) — 비어 있을 때만 채움
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (t) setTitle((prev) => prev || t)
  }, [payload]) // eslint-disable-line
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ beats, title } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [beats, title])

  // 단계 전환 시 새 사건 기본 긴장도를 단계 기준으로
  useEffect(() => { setDraftTension(DEFAULT_TENSION[active]) }, [active])

  const beatsOf = (k: StageKey) => beats.filter((b) => b.stage === k)

  // ── CRUD ─────────────────────────────────────────────────
  const add = () => {
    const t = draft.trim()
    if (!t) return
    setBeats((prev) => [...prev, { id: newId(), stage: active, text: t, tension: clampTension(draftTension) }])
    setDraft('')
    setDraftTension(DEFAULT_TENSION[active])
  }
  const remove = (id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const startEdit = (b: Beat) => { setEditingId(b.id); setEditText(b.text); setEditTension(b.tension) }
  const cancelEdit = () => { setEditingId(null); setEditText('') }
  const commitEdit = () => {
    const t = editText.trim()
    if (!editingId) return
    if (!t) { remove(editingId); setEditingId(null); return }
    setBeats((prev) => prev.map((b) => b.id === editingId ? { ...b, text: t, tension: clampTension(editTension) } : b))
    setEditingId(null); setEditText('')
  }
  // 같은 단계 안에서 순서 이동
  const move = (id: string, dir: -1 | 1) => {
    setBeats((prev) => {
      const b = prev.find((x) => x.id === id)
      if (!b) return prev
      const sameStage = prev.filter((x) => x.stage === b.stage)
      const idxInStage = sameStage.findIndex((x) => x.id === id)
      const swapWith = sameStage[idxInStage + dir]
      if (!swapWith) return prev
      // 전체 배열에서 두 항목의 위치를 교환
      const ai = prev.findIndex((x) => x.id === id)
      const bi = prev.findIndex((x) => x.id === swapWith.id)
      const next = prev.slice()
      ;[next[ai], next[bi]] = [next[bi], next[ai]]
      return next
    })
  }
  const clearStage = (k: StageKey) => setBeats((prev) => prev.filter((b) => b.stage !== k))
  const clearAll = () => { if (beats.length) setBeats([]) }

  const onAddKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add() } }
  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // ── 텍스트 내보내기/복사 ───────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[플롯 피라미드] ${title.trim()}` : '[플롯 피라미드]')
    lines.push('')
    for (const s of STAGES) {
      const list = beatsOf(s.key)
      lines.push(`■ ${s.label} (${s.sub})`)
      if (list.length === 0) { lines.push('  · (사건 없음)') }
      else list.forEach((b, i) => lines.push(`  ${i + 1}. [긴장 ${b.tension}/10] ${b.text}`))
      lines.push('')
    }
    const total = beats.length
    lines.push(`총 사건 ${total}개`)
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
      if (mounted.current) { setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1500) }
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  // ── 프로젝트(바인더)로 플롯 문서 추가 ──────────────────────
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  // 5단계(발단~대단원) 제목 + 입력 단락을 HTML 본문으로 구성
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (title.trim()) parts.push(`<p><em>${esc(title.trim())}</em></p>`)
    for (const s of STAGES) {
      parts.push(`<h2>${esc(s.label)} (${esc(s.sub)})</h2>`)
      const list = beatsOf(s.key)
      if (list.length === 0) parts.push('<p>(사건 없음)</p>')
      else list.forEach((b) => parts.push(`<p>[긴장 ${b.tension}/10] ${esc(b.text)}</p>`))
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: '플롯 구조',
      bodyHtml: buildBodyHtml(),
      meta: { 사건수: String(beats.length), 절정: STAGE_MAP.climax.label },
    })
    if (mounted.current) {
      setSaved(id ? '✓ 프로젝트 자료에 플롯 문서 추가됨' : '프로젝트에 연결되지 않았습니다')
      setTimeout(() => { if (mounted.current) setSaved('') }, 1800)
    }
  }

  // ── 피라미드 SVG 좌표 계산 ─────────────────────────────────
  // 피라미드(삼각형) 모양으로 5개 단계 라벨을 배치. 절정이 꼭대기.
  const VBW = 600, VBH = 220
  const apexX = VBW / 2
  // 단계별 (x,y) 라벨 중심 위치 — 좌→정점→우 로 오름/내림
  const stagePos: Record<StageKey, { x: number; y: number }> = {
    exposition: { x: 70, y: 190 },
    rising: { x: 200, y: 110 },
    climax: { x: apexX, y: 30 },
    falling: { x: 400, y: 110 },
    denouement: { x: 530, y: 190 },
  }
  // 삼각형 외곽선
  const triPoints = `40,200 ${apexX},20 560,200`

  // ── 긴장 곡선: 사건들을 단계 순서대로 배치해 꺾은선 ──────────
  const curveOrder: Beat[] = STAGES.flatMap((s) => beatsOf(s.key))
  const CW = 600, CH = 150, PADX = 24, PADY = 16
  const curvePts = curveOrder.map((b, i) => {
    const x = curveOrder.length <= 1 ? CW / 2 : PADX + (i / (curveOrder.length - 1)) * (CW - PADX * 2)
    const y = PADY + (1 - (b.tension - 1) / 9) * (CH - PADY * 2)
    return { x, y, b }
  })
  const curvePath = curvePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = curvePts.length
    ? `M${curvePts[0].x.toFixed(1)},${(CH - PADY).toFixed(1)} ` +
      curvePts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${curvePts[curvePts.length - 1].x.toFixed(1)},${(CH - PADY).toFixed(1)} Z`
    : ''

  const activeDef = STAGE_MAP[active]
  const activeList = beatsOf(active)
  const total = beats.length

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, padding: '18px 8px' }

  const stageChip = (s: StageDef): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer',
    padding: '6px 8px', borderRadius: 9,
    border: active === s.key ? `2px solid ${s.color}` : '2px solid transparent',
    background: active === s.key ? 'var(--chrome-2)' : 'transparent',
  })

  return (
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🔺"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/플롯 제목 (선택)" maxLength={80} aria-label="플롯 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 피라미드 시각화 ── */}
        <div style={panel}>
          <div style={sectionTitle}>프라이타크 피라미드 · 단계를 눌러 사건을 편집하세요</div>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 230 }} role="img" aria-label="플롯 피라미드">
            <polygon points={triPoints} fill="none" stroke="var(--border)" strokeWidth={2} />
            {STAGES.map((s) => {
              const p = stagePos[s.key]
              const cnt = beatsOf(s.key).length
              const isActive = active === s.key
              return (
                <g key={s.key} style={{ cursor: 'pointer' }} onClick={() => setActive(s.key)}>
                  <circle cx={p.x} cy={p.y} r={isActive ? 13 : 10} fill={s.color} stroke="var(--paper)" strokeWidth={2} opacity={cnt > 0 ? 1 : 0.55} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{cnt}</text>
                  <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize={14} fontWeight={isActive ? 800 : 600} fill="var(--text)">{s.label}</text>
                  <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize={9.5} fill="var(--muted)">{s.sub}</text>
                </g>
              )
            })}
          </svg>
          {/* 단계 칩(접근성/터치 보조) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 6 }}>
            {STAGES.map((s) => (
              <div key={s.key} style={stageChip(s)} onClick={() => setActive(s.key)} role="button" aria-pressed={active === s.key} aria-label={`${s.label} 단계 선택`}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, fontWeight: active === s.key ? 800 : 600 }}>{s.label}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{beatsOf(s.key).length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 긴장 곡선 미리보기 ── */}
        <div style={panel}>
          <div style={sectionTitle}>긴장도 곡선 미리보기 · 발단→대단원 순서</div>
          {curveOrder.length === 0 ? (
            <div style={empty}>사건을 추가하면 긴장 곡선이 그려집니다.</div>
          ) : (
            <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 170 }} role="img" aria-label="긴장도 곡선">
              {/* 가로 격자선 */}
              {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
                const y = PADY + g * (CH - PADY * 2)
                return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
              })}
              {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.12} />}
              <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {curvePts.map((p) => (
                <g key={p.b.id}>
                  <circle cx={p.x} cy={p.y} r={4} fill={STAGE_MAP[p.b.stage].color} stroke="var(--paper)" strokeWidth={1.5}>
                    <title>{`[${STAGE_MAP[p.b.stage].label}] ${p.b.text} (긴장 ${p.b.tension}/10)`}</title>
                  </circle>
                </g>
              ))}
            </svg>
          )}
          <div style={{ ...hint, marginTop: 4 }}>점에 마우스를 올리면 사건 내용이 보입니다. 높을수록 긴장이 큰 장면입니다.</div>
        </div>

        {/* ── 활성 단계 사건 편집 ── */}
        <div style={{ ...panel, borderTop: `3px solid ${activeDef.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: activeDef.color }} />
            <strong style={{ fontSize: 15 }}>{activeDef.label}</strong>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{activeDef.sub} · 사건 {activeList.length}개</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => clearStage(active)} disabled={activeList.length === 0} title="이 단계의 사건 모두 삭제">이 단계 비우기</button>
          </div>
          <div style={{ ...hint, marginBottom: 10 }}>{activeDef.tip}</div>

          {/* 추가 폼 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input style={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onAddKey} placeholder={`${activeDef.label} 단계의 사건을 입력하고 Enter…`} maxLength={300} aria-label="사건 입력" />
            <button className="btn-primary" onClick={add} disabled={!draft.trim()}>추가</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>긴장도</span>
            <input type="range" min={1} max={10} value={draftTension} onChange={(e) => setDraftTension(Number(e.target.value))} style={{ flex: 1, accentColor: activeDef.color }} aria-label="새 사건 긴장도" />
            <strong style={{ fontSize: 13, width: 42, textAlign: 'right', color: activeDef.color }}>{draftTension}/10</strong>
          </div>

          {/* 사건 목록 */}
          {activeList.length === 0 ? (
            <div style={empty}>이 단계에는 아직 사건이 없어요.<br />위 입력칸에 첫 사건을 적어 보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeList.map((b, i) => {
                const isEd = editingId === b.id
                return (
                  <div key={b.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                    {isEd ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input style={input} value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={onEditKey} maxLength={300} autoFocus aria-label="사건 수정" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>긴장도</span>
                          <input type="range" min={1} max={10} value={editTension} onChange={(e) => setEditTension(Number(e.target.value))} style={{ flex: 1, accentColor: activeDef.color }} aria-label="긴장도 수정" />
                          <strong style={{ fontSize: 13, width: 42, textAlign: 'right', color: activeDef.color }}>{editTension}/10</strong>
                          <button className="btn-primary" onClick={commitEdit}>저장</button>
                          <button className="minibtn" onClick={cancelEdit}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                          <button className="minibtn" style={{ padding: '0 6px', lineHeight: 1.4 }} onClick={() => move(b.id, -1)} disabled={i === 0} title="위로" aria-label="위로 이동">▲</button>
                          <button className="minibtn" style={{ padding: '0 6px', lineHeight: 1.4 }} onClick={() => move(b.id, 1)} disabled={i === activeList.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                        </div>
                        <span title="긴장도" style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', background: activeDef.color, borderRadius: 7, padding: '2px 7px', minWidth: 30, textAlign: 'center' }}>{b.tension}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' }}>{b.text}</span>
                        <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => startEdit(b)} title="수정" aria-label="수정"><Emoji e="✏️"/></button>
                        <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => remove(b.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 하단 요약/전체 동작 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 사건 <strong style={{ color: 'var(--text)' }}>{total}</strong>개</span>
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
          <button className="minibtn" onClick={clearAll} disabled={total === 0} title="모든 단계의 사건 삭제">전체 비우기</button>
        </div>
        {/* ── 프로젝트 연동 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '5단계(발단~대단원) 플롯을 프로젝트 자료에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 플롯 문서 추가</button>
        </div>
        {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>{saved}</div>}

        <div style={hint}>각 단계를 눌러 사건을 추가·수정·삭제하고 ▲▼로 순서를 바꾸세요. 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
