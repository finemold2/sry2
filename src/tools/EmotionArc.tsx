// 감정 곡선 에디터 — 챕터/비트 행마다 주인공의 감정값(-5~+5)을 슬라이더로 입력하고,
// SVG 꺾은선 곡선으로 감정 흐름을 시각화한다. 행 추가/삭제/이름변경/순서이동(CRUD) 완비.
// 기복(변동폭) 점검으로 곡선이 너무 평탄하거나 과격한지 진단한다.
// 자급식: react 외 import 없음. 전부 로컬. localStorage 'sry:tool:emotion-arc' 에 자동 저장/복원.
// 프로젝트 연동: react/linkbus 만 추가 import(프로젝트 브리지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'emotion-arc', name: '감정 곡선', icon: '📈', group: '구상·정리', intro: '챕터·비트별 주인공 감정값을 슬라이더로 입력해 감정 흐름을 곡선으로 시각화하세요', w: 680, h: 560 }

const LS_KEY = 'sry:tool:emotion-arc'
const MINV = -5
const MAXV = 5

interface Beat { id: string; name: string; value: number }
interface SaveShape { title: string; beats: Beat[] }

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
function defaultBeats(): Beat[] {
  return [
    { id: newId(), name: '1장', value: 0 },
    { id: newId(), name: '2장', value: -2 },
    { id: newId(), name: '3장', value: 3 },
  ]
}
// localStorage 복원 — 미지원/손상 시 graceful.
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', beats: defaultBeats() }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', beats: defaultBeats() }
    const beats: Beat[] = Array.isArray(p.beats)
      ? p.beats
          .filter((b: any) => b && typeof b === 'object')
          .map((b: any) => ({ id: String(b.id || newId()), name: String(b.name ?? ''), value: clampValue(b.value) }))
      : defaultBeats()
    return { title: typeof p.title === 'string' ? p.title : '', beats }
  } catch { return { title: '', beats: defaultBeats() } }
}

// 감정값 → 색 (음수 차갑게, 양수 따뜻하게)
function valueColor(v: number): string {
  if (v > 0) return 'var(--ok)'
  if (v < 0) return 'var(--warn)'
  return 'var(--muted)'
}
// 감정값 → 라벨
function valueLabel(v: number): string {
  if (v >= 4) return '환희'
  if (v >= 2) return '기쁨'
  if (v >= 1) return '약간 긍정'
  if (v === 0) return '평온'
  if (v <= -4) return '절망'
  if (v <= -2) return '괴로움'
  return '약간 부정'
}

export default function EmotionArc() {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [beats, setBeats] = useState<Beat[]>(init.current.beats)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, beats } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, beats])

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

  // ── CRUD ─────────────────────────────────────────────────
  const addBeat = () => {
    setBeats((prev) => {
      const last = prev[prev.length - 1]
      const n = prev.length + 1
      return [...prev, { id: newId(), name: `${n}장`, value: last ? last.value : 0 }]
    })
  }
  const removeBeat = (id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const setValue = (id: string, v: number) => {
    setBeats((prev) => prev.map((b) => (b.id === id ? { ...b, value: clampValue(v) } : b)))
  }
  const startEdit = (b: Beat) => { setEditingId(b.id); setEditName(b.name) }
  const cancelEdit = () => { setEditingId(null); setEditName('') }
  const commitEdit = () => {
    if (!editingId) return
    const nm = editName.trim()
    setBeats((prev) => prev.map((b) => (b.id === editingId ? { ...b, name: nm || b.name } : b)))
    setEditingId(null); setEditName('')
  }
  const move = (id: string, dir: -1 | 1) => {
    setBeats((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 드래그 순서 변경 (HTML5 DnD — 전역 포인터 리스너 없음, 안전)
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setBeats((prev) => {
      const fi = prev.findIndex((b) => b.id === from)
      const ti = prev.findIndex((b) => b.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }
  const resetAll = () => { setBeats(defaultBeats()); setEditingId(null) }

  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // ── 기복(변동폭) 점검 ──────────────────────────────────────
  // 인접 비트 간 감정 변화량의 평균/최대, 전체 진폭으로 곡선의 역동성을 진단.
  const vals = beats.map((b) => b.value)
  const deltas: number[] = []
  for (let i = 1; i < vals.length; i++) deltas.push(Math.abs(vals[i] - vals[i - 1]))
  const totalSwing = deltas.reduce((s, d) => s + d, 0)
  const avgSwing = deltas.length ? totalSwing / deltas.length : 0
  const maxSwing = deltas.length ? Math.max(...deltas) : 0
  const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0
  let diagnosis = ''
  let diagColor = 'var(--muted)'
  if (beats.length < 2) {
    diagnosis = '비트를 2개 이상 입력하면 감정 기복을 진단합니다.'
  } else if (range <= 1 && avgSwing < 0.6) {
    diagnosis = '감정선이 거의 평탄합니다. 독자가 지루할 수 있어요 — 굴곡(반전·위기)을 더해 보세요.'
    diagColor = 'var(--warn)'
  } else if (avgSwing >= 4) {
    diagnosis = '비트마다 감정이 급격히 출렁입니다. 너무 잦은 반전은 피로감을 줄 수 있어요 — 완급을 조절해 보세요.'
    diagColor = 'var(--warn)'
  } else if (range >= 6 && avgSwing >= 1.5) {
    diagnosis = '감정선에 뚜렷한 굴곡과 적절한 완급이 있습니다. 좋은 흐름이에요.'
    diagColor = 'var(--ok)'
  } else {
    diagnosis = '감정선에 변화는 있으나 다소 완만합니다. 절정 부근의 진폭을 키워 보세요.'
    diagColor = 'var(--muted)'
  }

  // ── SVG 좌표 계산 ──────────────────────────────────────────
  const VBW = 640, VBH = 260
  const PADL = 40, PADR = 18, PADT = 18, PADB = 34
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const xAt = (i: number) => beats.length <= 1 ? PADL + plotW / 2 : PADL + (i / (beats.length - 1)) * plotW
  const yAt = (v: number) => PADT + (1 - (v - MINV) / (MAXV - MINV)) * plotH // +5 위, -5 아래
  const zeroY = yAt(0)
  const pts = beats.map((b, i) => ({ x: xAt(i), y: yAt(b.value), b }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // ── 텍스트 내보내기/복사 ───────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[감정 곡선] ${title.trim()}` : '[감정 곡선]')
    lines.push('')
    beats.forEach((b, i) => {
      const sign = b.value > 0 ? `+${b.value}` : `${b.value}`
      lines.push(`${i + 1}. ${b.name || '(이름 없음)'} : ${sign} (${valueLabel(b.value)})`)
    })
    lines.push('')
    if (beats.length >= 2) {
      lines.push(`진폭(최고-최저): ${range} / 평균 변화량: ${avgSwing.toFixed(1)} / 최대 변화량: ${maxSwing}`)
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
  // HTML 이스케이프 — bodyHtml 본문에 사용자 입력을 안전하게 넣기 위함.
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 챕터별 감정값 목록을 HTML 본문으로 — 비트 순서대로 값/라벨, 끝에 기복 요약 포함.
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>감정 곡선</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 비트 ${beats.length}개</p>`)
    parts.push('<ol>')
    beats.forEach((b, i) => {
      const sign = b.value > 0 ? `+${b.value}` : `${b.value}`
      parts.push(`<li>${esc(b.name || `비트 ${i + 1}`)} : ${sign} (${esc(valueLabel(b.value))})</li>`)
    })
    parts.push('</ol>')
    if (beats.length >= 2) {
      parts.push(`<p>진폭(최고-최저) ${range} · 평균 변화량 ${avgSwing.toFixed(1)} · 최대 변화량 ${maxSwing}</p>`)
      parts.push(`<p>진단: ${esc(diagnosis)}</p>`)
    }
    return parts.join('')
  }
  // 프로젝트(자료 › 구조 폴더)에 "감정 곡선" 문서로 추가.
  const toProject = () => {
    if (!hasProjectBridge() || beats.length === 0) return
    const meta: Record<string, string> = { 비트수: String(beats.length) }
    if (beats.length >= 2) {
      meta['진폭'] = String(range)
      meta['평균변화량'] = avgSwing.toFixed(1)
      meta['최대변화량'] = String(maxSwing)
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `감정 곡선 — ${title.trim()}` : '감정 곡선',
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
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="📈"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/감정선 제목 (선택)" maxLength={80} aria-label="감정선 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || beats.length === 0}
          title={hasProjectBridge() ? (beats.length === 0 ? '추가할 비트가 없습니다' : '자료 › 구조 폴더에 감정 곡선 문서로 추가') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 프로젝트 자료(구조)에 감정 곡선 문서를 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 감정 곡선 시각화 ── */}
        <div style={panel}>
          <div style={sectionTitle}>감정 흐름 곡선 · 위(+5)는 긍정, 아래(-5)는 부정</div>
          {beats.length === 0 ? (
            <div style={empty}>비트를 추가하면 감정 곡선이 그려집니다.</div>
          ) : (
            <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 270 }} role="img" aria-label="감정 곡선 그래프">
              {/* 가로 격자선 + Y 라벨 (-5 ~ +5) */}
              {[5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5].map((v) => {
                const y = yAt(v)
                const major = v === 0
                return (
                  <g key={v}>
                    <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={major ? 1.5 : 1} strokeDasharray={major ? undefined : '2 4'} opacity={major ? 0.9 : 0.45} />
                    {(v % 1 === 0 && (v === 5 || v === 0 || v === -5)) && (
                      <text x={PADL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{v > 0 ? `+${v}` : v}</text>
                    )}
                  </g>
                )
              })}
              {/* 곡선 */}
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {/* 점 + 라벨 */}
              {pts.map((p, i) => (
                <g key={p.b.id}>
                  <circle cx={p.x} cy={p.y} r={4.5} fill={valueColor(p.b.value)} stroke="var(--paper)" strokeWidth={1.5}>
                    <title>{`${p.b.name || `비트 ${i + 1}`}: ${p.b.value > 0 ? '+' : ''}${p.b.value} (${valueLabel(p.b.value)})`}</title>
                  </circle>
                  {/* X축 비트 이름 (간단히) */}
                  <text x={p.x} y={VBH - 12} textAnchor="middle" fontSize={9.5} fill="var(--muted)">
                    {(p.b.name || `${i + 1}`).length > 5 ? (p.b.name || `${i + 1}`).slice(0, 5) + '…' : (p.b.name || `${i + 1}`)}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* ── 기복 점검 ── */}
        <div style={{ ...panel, borderLeft: `3px solid ${diagColor}` }}>
          <div style={sectionTitle}>기복 점검</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: diagColor === 'var(--muted)' ? 'var(--text)' : diagColor }}>{diagnosis}</div>
          {beats.length >= 2 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>진폭 <strong style={{ color: 'var(--text)' }}>{range}</strong></span>
              <span>평균 변화량 <strong style={{ color: 'var(--text)' }}>{avgSwing.toFixed(1)}</strong></span>
              <span>최대 변화량 <strong style={{ color: 'var(--text)' }}>{maxSwing}</strong></span>
            </div>
          )}
        </div>

        {/* ── 비트 행 편집 (CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>비트 / 챕터</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{beats.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetAll} title="기본 3개 비트로 초기화">초기화</button>
            <button className="btn-primary" onClick={addBeat}>＋ 비트 추가</button>
          </div>

          {beats.length === 0 ? (
            <div style={empty}>
              아직 비트가 없어요.<br />
              <b>＋ 비트 추가</b>로 챕터·장면을 만들고<br />슬라이더로 감정값을 정해 보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {beats.map((b, i) => {
                const isEd = editingId === b.id
                return (
                  <div
                    key={b.id}
                    draggable={!isEd}
                    onDragStart={() => { if (!isEd) dragId.current = b.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== b.id) setDragOver(b.id) }}
                    onDragLeave={() => { if (dragOver === b.id) setDragOver(null) }}
                    onDrop={() => onDrop(b.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    style={{
                      background: 'var(--chrome-2)', borderRadius: 10, padding: '8px 10px',
                      border: '1px solid var(--border)',
                      outline: dragOver === b.id ? '2px dashed var(--accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                      {isEd ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={commitEdit}
                          autoFocus
                          maxLength={40}
                          aria-label="비트 이름 수정"
                          style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                          onClick={() => startEdit(b)}
                          title="클릭해서 이름 수정"
                        >{b.name || `비트 ${i + 1}`}</span>
                      )}
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>{valueLabel(b.value)}</span>
                      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, width: 30, textAlign: 'right', color: valueColor(b.value) }}>{b.value > 0 ? `+${b.value}` : b.value}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(b.id, -1)} disabled={i === 0} title="위로" aria-label="위로 이동">▲</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(b.id, 1)} disabled={i === beats.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => startEdit(b)} title="이름 수정" aria-label="이름 수정"><Emoji e="✏️"/></button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeBeat(b.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 16 }}>-5</span>
                      <input
                        type="range" min={MINV} max={MAXV} step={1} value={b.value}
                        onChange={(e) => setValue(b.id, Number(e.target.value))}
                        style={{ flex: 1, accentColor: valueColor(b.value) }}
                        aria-label={`${b.name || `비트 ${i + 1}`} 감정값`}
                      />
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 16, textAlign: 'right' }}>+5</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={hint}>비트 이름을 클릭하거나 <Emoji e="✏️"/>로 바꾸고, 슬라이더로 감정(-5~+5)을 정하세요. ⠿ 드래그 또는 ▲▼로 순서를 바꿀 수 있어요. 내용은 이 브라우저에 자동 저장됩니다.</div>
      </div>
    </div>
  )
}
