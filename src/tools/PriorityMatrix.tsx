// 우선순위 매트릭스(아이젠하워) — 아이디어/할 일을 "중요도 × 긴급도" 4분면에 카드로 배치한다.
//  · 4분면: 지금 한다(중요+긴급) / 계획한다(중요) / 위임한다(긴급) / 버린다(둘 다 아님)
//  · 카드 CRUD: 추가·인라인 편집(제목/메모)·삭제·완료 토글·복제, 분면 간 드래그(HTML5 DnD)로 이동.
//  · 4분면 외에 "미분류" 보관함(inbox)을 두어 빠르게 쏟아낸 뒤 분류할 수 있다.
//  · 각 카드에 색 라벨·완료 표시·생성순 정렬, 분면별 개수/완료 진행률 표시.
//  · 자급식: react + './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:priority-matrix' 자동 저장/복원.
//  · 미지원/차단 graceful, 언마운트 시 타이머 정리.
// 연계(linkbus): 📄 정리본을 프로젝트 자료('할 일' 폴더)에 분면별 문서로 추가, 🧺 카드를 수집함에 메모로 담기.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = {
  id: 'priority-matrix',
  name: '우선순위 매트릭스',
  icon: '🧭',
  group: '구상·정리',
  intro: '아이디어·할 일을 중요도×긴급도 4분면(아이젠하워)에 카드로 배치해 무엇부터 할지 가립니다',
  w: 880,
  h: 660,
}

const LS_KEY = 'sry:tool:priority-matrix'

// ── 분면 정의 ─────────────────────────────────────────────
// q1: 중요+긴급, q2: 중요+비긴급, q3: 비중요+긴급, q4: 비중요+비긴급, inbox: 미분류
type Quad = 'q1' | 'q2' | 'q3' | 'q4' | 'inbox'
interface QuadDef {
  id: Quad
  title: string
  action: string
  desc: string
  color: string   // 강조색(CSS 변수 또는 hex)
  emoji: string
}
const QUADS: QuadDef[] = [
  { id: 'q1', title: '중요 · 긴급', action: '지금 한다', desc: '위기·마감 임박. 즉시 처리하세요.', color: '#e5484d', emoji: '🔥' },
  { id: 'q2', title: '중요 · 비긴급', action: '계획한다', desc: '성장·집필의 핵심. 시간을 미리 확보하세요.', color: '#30a46c', emoji: '🌱' },
  { id: 'q3', title: '비중요 · 긴급', action: '위임/최소화', desc: '방해·잡무. 줄이거나 맡기세요.', color: '#f5a623', emoji: '📨' },
  { id: 'q4', title: '비중요 · 비긴급', action: '버린다', desc: '시간 낭비. 과감히 덜어내세요.', color: '#8b8d98', emoji: '🗑️' },
]
const QUAD_MAP: Record<Quad, QuadDef> = {
  q1: QUADS[0], q2: QUADS[1], q3: QUADS[2], q4: QUADS[3],
  inbox: { id: 'inbox', title: '미분류', action: '분류 대기', desc: '떠오른 항목을 일단 여기로.', color: 'var(--muted)', emoji: '📥' },
}

// 카드 색 라벨(선택) — 시각적 구분용
const LABELS = [
  { id: '', name: '없음', color: 'transparent' },
  { id: 'red', name: '빨강', color: '#e5484d' },
  { id: 'amber', name: '주황', color: '#f5a623' },
  { id: 'green', name: '초록', color: '#30a46c' },
  { id: 'blue', name: '파랑', color: '#4493f8' },
  { id: 'purple', name: '보라', color: '#8e4ec6' },
]

interface Card {
  id: string
  title: string
  note: string
  quad: Quad
  label: string
  done: boolean
  created: number
}
interface SaveShape { title: string; cards: Card[] }

// ── 유틸 ──────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const isQuad = (v: unknown): v is Quad => v === 'q1' || v === 'q2' || v === 'q3' || v === 'q4' || v === 'inbox'

function sampleCards(): Card[] {
  const t = Date.now()
  return [
    { id: newId(), title: '마감 원고 교정', note: '편집자 회신 전까지', quad: 'q1', label: 'red', done: false, created: t + 1 },
    { id: newId(), title: '다음 장 개요 잡기', note: '핵심 갈등 정리', quad: 'q2', label: 'green', done: false, created: t + 2 },
    { id: newId(), title: '메일 회신', note: '', quad: 'q3', label: 'amber', done: false, created: t + 3 },
    { id: newId(), title: 'SNS 무한 스크롤', note: '습관적으로 보는 것', quad: 'q4', label: '', done: false, created: t + 4 },
    { id: newId(), title: '떠오른 소재: 폐역 이야기', note: '나중에 분류', quad: 'inbox', label: 'purple', done: false, created: t + 5 },
  ]
}

// localStorage 복원 — 미지원/손상 시 graceful(샘플 카드).
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', cards: sampleCards() }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', cards: sampleCards() }
    const cards: Card[] = Array.isArray(p.cards)
      ? p.cards
          .filter((c: any) => c && typeof c === 'object' && typeof c.title === 'string')
          .map((c: any, i: number) => ({
            id: String(c.id || newId()),
            title: String(c.title),
            note: typeof c.note === 'string' ? c.note : '',
            quad: isQuad(c.quad) ? c.quad : 'inbox',
            label: typeof c.label === 'string' ? c.label : '',
            done: !!c.done,
            created: Number.isFinite(c.created) ? c.created : Date.now() + i,
          }))
      : []
    return { title: typeof p.title === 'string' ? p.title : '', cards }
  } catch { return { title: '', cards: sampleCards() } }
}

export default function PriorityMatrix({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [cards, setCards] = useState<Card[]>(init.current.cards)
  const [draft, setDraft] = useState('')
  const [draftQuad, setDraftQuad] = useState<Quad>('inbox')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOverQuad, setDragOverQuad] = useState<Quad | null>(null)
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 외부에서 payload.text(또는 .title)로 카드를 받아 미분류로 투입(도구 연계)
  useEffect(() => {
    const txt = payload && (typeof payload.text === 'string' ? payload.text : typeof payload.title === 'string' ? payload.title : '')
    if (txt && txt.trim()) {
      const pq = isQuad(payload?.quad) ? (payload!.quad as Quad) : 'inbox'
      setCards((prev) => [...prev, { id: newId(), title: txt.trim().slice(0, 200), note: '', quad: pq, label: '', done: false, created: Date.now() }])
    }
    // payload 는 마운트 시 한 번만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, cards } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, cards])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }

  // ── CRUD ─────────────────────────────────────────────────
  const addCard = () => {
    const t = draft.trim()
    if (!t) return
    setCards((prev) => [...prev, { id: newId(), title: t.slice(0, 200), note: '', quad: draftQuad, label: '', done: false, created: Date.now() }])
    setDraft('')
  }
  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const duplicateCard = (id: string) => {
    setCards((prev) => {
      const c = prev.find((x) => x.id === id)
      if (!c) return prev
      return [...prev, { ...c, id: newId(), title: c.title + ' (복사)', done: false, created: Date.now() }]
    })
  }
  const toggleDone = (id: string) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))
  const moveTo = (id: string, quad: Quad) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, quad } : c)))

  const startEdit = (c: Card) => { setEditingId(c.id); setEditTitle(c.title); setEditNote(c.note); setEditLabel(c.label) }
  const cancelEdit = () => { setEditingId(null); setEditTitle(''); setEditNote(''); setEditLabel('') }
  const commitEdit = () => {
    if (!editingId) return
    const t = editTitle.trim()
    if (!t) { removeCard(editingId); cancelEdit(); return } // 제목 비우면 삭제
    setCards((prev) => prev.map((c) => (c.id === editingId ? { ...c, title: t.slice(0, 200), note: editNote.trim().slice(0, 500), label: editLabel } : c)))
    cancelEdit()
  }

  const clearDone = () => {
    const n = cards.filter((c) => c.done).length
    if (!n) { flash('완료한 카드가 없어요.'); return }
    setCards((prev) => prev.filter((c) => !c.done))
    flash(`완료한 카드 ${n}개를 비웠어요.`)
  }
  const resetAll = () => { setCards(sampleCards()); cancelEdit(); flash('예시 카드로 초기화했어요.') }
  const clearAll = () => { if (cards.length) { setCards([]); cancelEdit(); flash('모든 카드를 비웠어요.') } }

  // ── 드래그 이동(HTML5 DnD — 전역 포인터 리스너 없음, 안전) ──
  const onDropQuad = (quad: Quad) => {
    const from = dragId.current
    dragId.current = null
    setDragOverQuad(null)
    if (!from) return
    moveTo(from, quad)
  }

  const onAddKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addCard() }
  }
  const onEditTitleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // ── 집계 ─────────────────────────────────────────────────
  const byQuad = (q: Quad) => cards.filter((c) => c.quad === q)
  const total = cards.length
  const doneCount = cards.filter((c) => c.done).length
  const inboxCount = byQuad('inbox').length

  // ── 텍스트/HTML 정리본 ────────────────────────────────────
  const ORDER: Quad[] = ['q1', 'q2', 'q3', 'q4', 'inbox']
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>우선순위 매트릭스</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 카드 ${total}개 (완료 ${doneCount})</p>`)
    for (const q of ORDER) {
      const list = byQuad(q)
      if (!list.length) continue
      const def = QUAD_MAP[q]
      parts.push(`<p><strong>${def.emoji} ${esc(def.title)} — ${esc(def.action)}</strong></p>`)
      parts.push('<ul>')
      for (const c of list) {
        const box = c.done ? '☑' : '☐'
        const ttl = c.done ? '<s>' + esc(c.title) + '</s>' : esc(c.title)
        const memo = c.note.trim() ? ' — <em>' + esc(c.note.trim()) + '</em>' : ''
        parts.push(`<li>${box} ${ttl}${memo}</li>`)
      }
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[우선순위 매트릭스] ${title.trim()}` : '[우선순위 매트릭스]')
    for (const q of ORDER) {
      const list = byQuad(q)
      if (!list.length) continue
      const def = QUAD_MAP[q]
      lines.push('')
      lines.push(`${def.emoji} ${def.title} — ${def.action}`)
      for (const c of list) lines.push(`  ${c.done ? '[x]' : '[ ]'} ${c.title}${c.note.trim() ? ' — ' + c.note.trim() : ''}`)
    }
    return lines.join('\n')
  }

  const copyText = async () => {
    if (!total) { flash('복사할 카드가 없어요.'); return }
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('정리본을 클립보드에 복사했어요.')
    } catch { flash('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  // 연계: 정리본을 프로젝트 자료('할 일' 폴더)에 분면별 문서로 추가.
  const toProject = () => {
    if (!total) { flash('추가할 카드가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const meta: Record<string, string> = {
      카드수: String(total), 완료: String(doneCount),
      '지금한다': String(byQuad('q1').length), '계획한다': String(byQuad('q2').length),
      '위임': String(byQuad('q3').length), '버린다': String(byQuad('q4').length),
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '할 일',
      title: title.trim() ? `우선순위 — ${title.trim()}` : '우선순위 매트릭스',
      bodyHtml: buildHtml(),
      meta,
    })
    flash(id ? '프로젝트 자료 "할 일" 폴더에 정리본을 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 연계: 카드 하나를 수집함에 메모로 담기.
  const stashCard = (c: Card) => {
    if (!hasStash()) { flash('수집함을 사용할 수 없어요.'); return }
    const label = `[${QUAD_MAP[c.quad].action}] ${c.title}`
    addToStash({ kind: 'memo', label: label.slice(0, 80), text: c.note.trim() ? `${c.title}\n${c.note.trim()}` : c.title })
    flash('수집함에 담았어요.')
  }

  // ── 스타일 ────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const titleInput: React.CSSProperties = { flex: '1 1 160px', minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const addRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const addInput: React.CSSProperties = { flex: '1 1 200px', minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { padding: '8px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 12, minHeight: 0 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  const renderCard = (c: Card) => {
    const lab = LABELS.find((l) => l.id === c.label)
    const isEd = editingId === c.id
    if (isEd) {
      return (
        <div key={c.id} style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <input
            value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={onEditTitleKey} autoFocus maxLength={200}
            placeholder="제목(비우면 삭제)" aria-label="카드 제목 수정"
            style={{ padding: '6px 8px', fontSize: 13, fontWeight: 600, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
          <textarea
            value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={500} rows={2}
            placeholder="메모(선택)" aria-label="카드 메모 수정"
            style={{ padding: '6px 8px', fontSize: 12, lineHeight: 1.45, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>색:</span>
            {LABELS.map((l) => (
              <button
                key={l.id} onClick={() => setEditLabel(l.id)} title={l.name} aria-label={`색 ${l.name}`}
                style={{
                  width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: l.id ? l.color : 'transparent',
                  border: l.id ? (editLabel === l.id ? '2px solid var(--text)' : '1px solid var(--border)') : (editLabel === '' ? '2px solid var(--text)' : '1px dashed var(--border)'),
                }}
              >{l.id ? '' : '∅'}</button>
            ))}
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={cancelEdit}>취소</button>
            <button className="btn-primary" onClick={commitEdit}>저장</button>
          </div>
        </div>
      )
    }
    return (
      <div
        key={c.id}
        draggable
        onDragStart={(e) => { dragId.current = c.id; try { e.dataTransfer.effectAllowed = 'move' } catch {} }}
        onDragEnd={() => { dragId.current = null; setDragOverQuad(null) }}
        style={{
          background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
          borderLeft: lab && lab.id ? `4px solid ${lab.color}` : '1px solid var(--border)',
          padding: '8px 9px', cursor: 'grab', opacity: c.done ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <input
            type="checkbox" checked={c.done} onChange={() => toggleDone(c.id)}
            style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
            aria-label={`${c.title} 완료`}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              onClick={() => startEdit(c)}
              title="클릭해서 편집"
              style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', cursor: 'text', textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)' }}
            >{c.title}</div>
            {c.note.trim() && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.note}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 6, justifyContent: 'flex-end' }}>
          <button className="minibtn" style={miniIcon} onClick={() => startEdit(c)} title="편집" aria-label="편집"><Emoji e="✏️"/></button>
          <button className="minibtn" style={miniIcon} onClick={() => duplicateCard(c.id)} title="복제" aria-label="복제">⧉</button>
          {hasStash() && <button className="minibtn" style={miniIcon} onClick={() => stashCard(c)} title="수집함에 담기" aria-label="수집함에 담기"><Emoji e="🧺"/></button>}
          <button className="minibtn" style={{ ...miniIcon, color: 'var(--warn)' }} onClick={() => removeCard(c.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
        </div>
      </div>
    )
  }

  const renderQuadPanel = (def: QuadDef, height: number | string) => {
    const list = byQuad(def.id).filter((c) => !hideDone || !c.done)
    const allInQuad = byQuad(def.id)
    const done = allInQuad.filter((c) => c.done).length
    const over = dragOverQuad === def.id
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move' } catch {}; if (dragOverQuad !== def.id) setDragOverQuad(def.id) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { if (dragOverQuad === def.id) setDragOverQuad(null) } }}
        onDrop={() => onDropQuad(def.id)}
        style={{
          display: 'flex', flexDirection: 'column', minHeight: 0, height,
          background: 'var(--panel)', borderRadius: 12,
          border: `1px solid ${over ? def.color : 'var(--border)'}`,
          outline: over ? `2px dashed ${def.color}` : 'none',
          borderTop: `3px solid ${def.color}`,
          boxSizing: 'border-box', transition: 'outline-color .1s',
        }}
      >
        <div style={{ padding: '9px 11px 7px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 14 }}><Emoji e={def.emoji}/></span>
            <span style={{ fontSize: 13, fontWeight: 800, color: def.color }}>{def.action}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{def.title}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{done}/{allInQuad.length}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{def.desc}</div>
        </div>
        <div style={{ flex: 1, minHeight: 60, overflowY: 'auto', padding: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, padding: 10, minHeight: 50 }}>
              {allInQuad.length > 0 && hideDone ? '완료 카드만 있어요.' : '여기로 카드를 끌어다 놓거나\n위에서 추가하세요.'}
            </div>
          ) : list.map(renderCard)}
        </div>
      </div>
    )
  }

  const miniIcon: React.CSSProperties = { padding: '2px 6px', fontSize: 11, lineHeight: 1.2 }

  return (
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🧭"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="보드 제목 (예: 이번 주 집필)" maxLength={80} aria-label="보드 제목" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--accent)' }} />
          완료 숨기기
        </label>
        <button className="minibtn" onClick={copyText} title="정리본 텍스트 복사"><Emoji e="📋"/> 복사</button>
        <button
          className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || total === 0}
          title={hasProjectBridge() ? (total === 0 ? '추가할 카드가 없습니다' : '자료 › 할 일 폴더에 분면별 정리본 문서로 추가') : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {/* 카드 추가 */}
      <div style={addRow}>
        <input style={addInput} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onAddKey} placeholder="할 일·아이디어를 적고 Enter…" maxLength={200} aria-label="새 카드 입력" />
        <select style={sel} value={draftQuad} onChange={(e) => setDraftQuad(e.target.value as Quad)} aria-label="추가할 분면" title="추가할 분면">
          <option value="inbox">📥 미분류</option>
          <option value="q1">🔥 지금 한다</option>
          <option value="q2">🌱 계획한다</option>
          <option value="q3">📨 위임/최소화</option>
          <option value="q4">🗑️ 버린다</option>
        </select>
        <button className="btn-primary" onClick={addCard} disabled={!draft.trim()}>＋ 추가</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>{toast}</div>}

      <div style={body}>
        {/* 4분면 격자 — 가로(긴급도)·세로(중요도) 축 */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, minHeight: 0 }}>
          {/* 세로 축 라벨 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', width: 22, flexShrink: 0, color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>↑ 더 중요</span>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>덜 중요 ↓</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={grid}>
              {/* 윗줄: 중요 / 아랫줄: 비중요 · 왼칸: 긴급 / 오른칸: 비긴급 */}
              {renderQuadPanel(QUAD_MAP.q1, 230)}
              {renderQuadPanel(QUAD_MAP.q2, 230)}
              {renderQuadPanel(QUAD_MAP.q3, 230)}
              {renderQuadPanel(QUAD_MAP.q4, 230)}
            </div>
            {/* 가로 축 라벨 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 11, fontWeight: 700, padding: '0 4px' }}>
              <span>← 더 긴급</span>
              <span>덜 긴급 →</span>
            </div>
          </div>
        </div>

        {/* 미분류 보관함 */}
        {(inboxCount > 0 || draftQuad === 'inbox') && (
          <div>{renderQuadPanel(QUAD_MAP.inbox, 'auto')}</div>
        )}

        {/* 요약 + 정리 동작 */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span>전체 <strong style={{ color: 'var(--text)' }}>{total}</strong></span>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong></span>
          <span style={{ color: '#e5484d' }}>지금 {byQuad('q1').length}</span>
          <span style={{ color: '#30a46c' }}>계획 {byQuad('q2').length}</span>
          <span style={{ color: '#f5a623' }}>위임 {byQuad('q3').length}</span>
          <span style={{ color: '#8b8d98' }}>버림 {byQuad('q4').length}</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={clearDone} disabled={doneCount === 0}>완료 비우기</button>
          <button className="minibtn" onClick={resetAll}>예시로 초기화</button>
          <button className="minibtn" onClick={clearAll} disabled={total === 0} style={{ color: 'var(--warn)' }}>전체 비우기</button>
        </div>

        <div style={hint}>
          카드를 드래그해 분면을 옮기고, 카드를 눌러 제목·메모·색을 편집하세요. 체크로 완료 표시합니다.
          <b> 지금 한다</b>(중요·긴급)는 즉시, <b>계획한다</b>(중요·비긴급)는 시간을 미리 확보하는 것이 핵심입니다. 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
