// 회상(플래시백) 배치 설계기 — 회상별로 트리거·진입 신호·복귀 신호·현재 서사와의 연결·목적을
// 정리하고, 회상 남용/늘어짐·시점 혼동을 점검한다.
// 작법 원리:
//   · 회상은 "지금 이 순간 왜 이게 떠오르는가"의 트리거가 있어야 한다(현재 사건과의 인과).
//   · 진입/복귀 신호(시제·서식·구분선·감각 단서)가 명확해야 독자가 길을 잃지 않는다.
//   · 회상의 목적(동기 설명/복선/대비/긴장 지연)이 분명해야 하며, 같은 정보의 반복·과도한 길이·
//     너무 잦은 빈도는 현재 서사의 추진력을 떨어뜨린다.
//   · POV(시점)·시제 혼동 방지: 회상은 그 장면을 누가/어느 시제로 보는지 일관해야 한다.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:flashback-planner'.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, type ResolvedItem, Emoji } from './linkbus'

export const meta = { id: 'flashback-planner', name: '회상 배치 설계기', icon: '⏳', group: '구상·정리', intro: '회상(플래시백)별 트리거·진입/복귀 신호·현재 서사 연결·목적을 정리하고 남용·늘어짐·시점 혼동을 점검합니다', w: 760, h: 620 }

const LS_KEY = 'sry:tool:flashback-planner'

// 회상의 목적(작법) — 회상을 넣는 이유
type Purpose = 'motive' | 'foreshadow' | 'contrast' | 'tension' | 'worldbuild' | 'other'
const PURPOSES: { v: Purpose; label: string }[] = [
  { v: 'motive', label: '동기·배경 설명' },
  { v: 'foreshadow', label: '복선·단서 심기' },
  { v: 'contrast', label: '현재와 대비' },
  { v: 'tension', label: '긴장 지연·정보 통제' },
  { v: 'worldbuild', label: '세계관·관계 정보' },
  { v: 'other', label: '기타' },
]
// 시제/시점 — 회상을 서술하는 방식(혼동 방지 점검에 사용)
type Tense = 'past' | 'pastperfect' | 'present' | 'unset'
const TENSES: { v: Tense; label: string }[] = [
  { v: 'unset', label: '미지정' },
  { v: 'past', label: '과거형 (-했다)' },
  { v: 'pastperfect', label: '대과거 (-했었다)' },
  { v: 'present', label: '현재형(생생한 회상)' },
]

interface Flashback {
  id: string
  title: string       // 회상 이름(예: 어린 시절 사고)
  placeAt: string     // 현재 서사 속 삽입 위치(장/장면)
  trigger: string     // 트리거 — 현재의 무엇이 이 회상을 불러오나
  enterCue: string    // 진입 신호 — 회상으로 들어가는 신호(구분선/시제/감각)
  exitCue: string     // 복귀 신호 — 현재로 돌아오는 신호
  link: string        // 현재 서사와의 연결 — 회상이 지금 장면에 무엇을 더하나
  purpose: Purpose    // 목적
  tense: Tense        // 회상 서술 시제
  pov: string         // 누구의 시점으로 보는 회상인가
  length: number      // 분량(0~5: 한 줄~한 챕터)
  note: string        // 메모
}
interface SaveShape { items: Flashback[]; title: string; baseTense: Tense }

const LENGTH_LABELS = ['미정', '한두 줄', '한 단락', '여러 단락', '한 장면', '챕터급(길다)']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function str(v: unknown): string { return typeof v === 'string' ? v : '' }
function isPurpose(v: unknown): v is Purpose { return PURPOSES.some((p) => p.v === v) }
function isTense(v: unknown): v is Tense { return TENSES.some((t) => t.v === v) }
function clampLen(v: unknown): number { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0 }

function load(): SaveShape {
  const empty: SaveShape = { items: [], title: '', baseTense: 'unset' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const items: Flashback[] = Array.isArray(p.items)
      ? p.items
          .filter((r: unknown) => r && typeof r === 'object')
          .map((r: Record<string, unknown>) => ({
            id: String(r.id || newId()),
            title: str(r.title),
            placeAt: str(r.placeAt),
            trigger: str(r.trigger),
            enterCue: str(r.enterCue),
            exitCue: str(r.exitCue),
            link: str(r.link),
            purpose: isPurpose(r.purpose) ? r.purpose : 'motive',
            tense: isTense(r.tense) ? r.tense : 'unset',
            pov: str(r.pov),
            length: clampLen(r.length),
            note: str(r.note),
          }))
      : []
    return { items, title: str(p.title), baseTense: isTense(p.baseTense) ? p.baseTense : 'unset' }
  } catch { return empty }
}

const emptyDraft = (): Omit<Flashback, 'id'> => ({
  title: '', placeAt: '', trigger: '', enterCue: '', exitCue: '', link: '',
  purpose: 'motive', tense: 'unset', pov: '', length: 2, note: '',
})

const purposeLabel = (p: Purpose) => PURPOSES.find((x) => x.v === p)?.label || p
const tenseLabel = (t: Tense) => TENSES.find((x) => x.v === t)?.label || t

export default function FlashbackPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>(load())
  const [items, setItems] = useState<Flashback[]>(init.current.items)
  const [title, setTitle] = useState<string>(init.current.title)
  const [baseTense, setBaseTense] = useState<Tense>(init.current.baseTense)

  // 폼(추가/편집 공용). editId === null 이면 새 회상 추가 폼.
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<Flashback, 'id'>>(emptyDraft())
  const [formOpen, setFormOpen] = useState(false)

  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 초기 회상 1건 받기(연계로 열렸을 때) — 마운트 1회만
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const p = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
    if (!p) return
    const t = str(p.title) || str(p.text)
    const trg = str(p.trigger)
    if (t.trim() || trg.trim()) {
      setItems((prev) => [...prev, { id: newId(), ...emptyDraft(), title: t.trim().slice(0, 80), trigger: trg.trim() }])
      if (mounted.current) setSaved('연계로 회상 1건이 추가되었습니다')
      setTimeout(() => { if (mounted.current) setSaved('') }, 1800)
    }
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ items, title, baseTense } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [items, title, baseTense])

  // ── 폼 제어 ────────────────────────────────────────────────
  const startAdd = () => { setEditId(null); setDraft(emptyDraft()); setFormOpen(true); if (mounted.current) setNote('') }
  const startEdit = (r: Flashback) => {
    const { id: _id, ...rest } = r
    void _id
    setEditId(r.id); setDraft(rest); setFormOpen(true); if (mounted.current) setNote('')
  }
  const cancelForm = () => { setFormOpen(false); setEditId(null) }
  const setD = <K extends keyof Omit<Flashback, 'id'>>(k: K, v: Omit<Flashback, 'id'>[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const commitForm = () => {
    const t = draft.title.trim()
    const trg = draft.trigger.trim()
    if (!t && !trg) { if (mounted.current) setNote('최소한 회상 이름이나 트리거 중 하나는 적어 주세요.'); return }
    const clean: Omit<Flashback, 'id'> = {
      ...draft,
      title: t, placeAt: draft.placeAt.trim(), trigger: trg,
      enterCue: draft.enterCue.trim(), exitCue: draft.exitCue.trim(),
      link: draft.link.trim(), pov: draft.pov.trim(), note: draft.note.trim(),
    }
    if (editId) {
      setItems((prev) => prev.map((r) => r.id === editId ? { ...clean, id: editId } : r))
    } else {
      setItems((prev) => [...prev, { ...clean, id: newId() }])
    }
    setFormOpen(false); setEditId(null)
  }

  const remove = (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id))
    if (editId === id) { setFormOpen(false); setEditId(null) }
  }
  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const clearAll = () => { if (items.length) setItems([]) }

  // ── 좌측 바인더 파일 드롭 수용 — 끌어온 문서를 트리거 후보/회상으로 ──
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) } }
  const onDragLeave = () => { if (dropHot) setDropHot(false) }
  const onDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const it: ResolvedItem | null = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const d = emptyDraft()
    d.title = (it.title || '').slice(0, 80)
    if (it.text) d.note = it.text.replace(/\s+/g, ' ').trim().slice(0, 280)
    setItems((prev) => [...prev, { ...d, id: newId() }])
    if (mounted.current) { setSaved(`'${it.title || '문서'}'를 회상 항목으로 담았어요`); setTimeout(() => { if (mounted.current) setSaved('') }, 1800) }
  }

  // ── 점검(작법 경고) ────────────────────────────────────────
  const total = items.length
  const issues: { rid: string | null; level: 'warn' | 'info'; text: string }[] = []

  // 항목별 점검
  items.forEach((r, i) => {
    const nm = r.title.trim() || `회상 #${i + 1}`
    if (!r.trigger.trim()) issues.push({ rid: r.id, level: 'warn', text: `${nm}: 트리거가 비어 있어요 — "지금 왜 이 회상이 떠오르는가"가 없으면 삽입이 임의적으로 보입니다.` })
    if (!r.link.trim()) issues.push({ rid: r.id, level: 'warn', text: `${nm}: 현재 서사와의 연결이 비어 있어요 — 이 회상이 지금 장면에 무엇을 더하나요?` })
    if (!r.enterCue.trim() || !r.exitCue.trim()) issues.push({ rid: r.id, level: 'info', text: `${nm}: 진입/복귀 신호가 비어 있어요 — 독자가 시점·시제 전환을 놓칠 수 있습니다.` })
    if (r.length >= 5) issues.push({ rid: r.id, level: 'warn', text: `${nm}: 분량이 '챕터급'이에요 — 회상이 길면 현재 서사의 추진력이 끊깁니다. 잘게 쪼개거나 줄일 수 있는지 보세요.` })
  })

  // 시점/시제 혼동 점검
  const povSet = new Set(items.map((r) => r.pov.trim()).filter(Boolean).map((s) => s.toLowerCase()))
  if (povSet.size >= 3) issues.push({ rid: null, level: 'info', text: `회상 시점(POV)이 ${povSet.size}종으로 갈립니다 — 한 작품 안에서 회상 시점이 너무 다양하면 독자가 누구의 기억인지 혼동합니다.` })
  if (baseTense !== 'unset') {
    const sameAsBase = items.filter((r) => r.tense !== 'unset' && r.tense === baseTense)
    if (sameAsBase.length > 0) {
      const nms = sameAsBase.map((r) => r.title.trim() || '무제').slice(0, 3).join(', ')
      issues.push({ rid: null, level: 'warn', text: `회상 시제가 현재 서사 시제(${tenseLabel(baseTense)})와 같은 항목이 있어요(${nms}…) — 시제로 회상을 구분한다면 회상은 대과거나 다른 표지가 필요합니다.` })
    }
  }

  // 남용·빈도 점검(전역)
  if (total >= 6) issues.push({ rid: null, level: 'warn', text: `회상이 ${total}건으로 많은 편이에요 — 회상이 잦으면 현재 서사가 멈춰 서고 추진력이 떨어집니다. 통합하거나 일부를 현재 시점 정보로 옮기는 걸 고려하세요.` })
  // 중복 목적(같은 정보 반복) 점검
  const purposeCount = new Map<Purpose, number>()
  items.forEach((r) => purposeCount.set(r.purpose, (purposeCount.get(r.purpose) || 0) + 1))
  purposeCount.forEach((c, p) => { if (c >= 3) issues.push({ rid: null, level: 'info', text: `'${purposeLabel(p)}' 목적의 회상이 ${c}건이에요 — 같은 목적의 회상이 반복되면 정보가 중복될 수 있어요. 하나로 합칠 수 있는지 보세요.` }) })
  // 연속 배치 점검(현재 서사 위치가 비면 흐름 파악 어려움 안내)
  const placedCount = items.filter((r) => r.placeAt.trim()).length
  if (total >= 2 && placedCount < total) issues.push({ rid: null, level: 'info', text: `삽입 위치(장/장면)가 비어 있는 회상이 ${total - placedCount}건이에요 — 위치를 적으면 회상이 한 곳에 몰렸는지 점검할 수 있어요.` })

  const warnCount = issues.filter((x) => x.level === 'warn').length
  const totalLen = items.reduce((s, r) => s + r.length, 0)

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[회상 배치] ${title.trim()}` : '[회상 배치 설계]')
    lines.push(`회상 ${total}건 · 현재 서사 시제: ${tenseLabel(baseTense)}`)
    lines.push('')
    items.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.title.trim() || '(무제 회상)'}  [${purposeLabel(r.purpose)} / ${LENGTH_LABELS[r.length]}]`)
      if (r.placeAt.trim()) lines.push(`   · 삽입 위치: ${r.placeAt.trim()}`)
      lines.push(`   · 트리거: ${r.trigger.trim() || '(미기재)'}`)
      lines.push(`   · 진입 신호: ${r.enterCue.trim() || '(미기재)'}`)
      lines.push(`   · 복귀 신호: ${r.exitCue.trim() || '(미기재)'}`)
      lines.push(`   · 현재 서사 연결: ${r.link.trim() || '(미기재)'}`)
      lines.push(`   · 시점/시제: ${r.pov.trim() || '(미지정)'} / ${tenseLabel(r.tense)}`)
      if (r.note.trim()) lines.push(`   · 메모: ${r.note.trim()}`)
    })
    if (issues.length) {
      lines.push('')
      lines.push(`[점검 ${issues.length}건 · 경고 ${warnCount}]`)
      issues.forEach((x) => lines.push(`${x.level === 'warn' ? '⚠' : 'ℹ'} ${x.text}`))
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
      if (mounted.current) { setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1500) }
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (title.trim()) parts.push(`<p><em>${esc(title.trim())}</em></p>`)
    parts.push(`<p>회상 ${total}건 · 현재 서사 시제: ${esc(tenseLabel(baseTense))}</p>`)
    if (total === 0) { parts.push('<p>(회상 없음)</p>'); return parts.join('') }
    parts.push('<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>회상</th><th>삽입 위치</th><th>트리거</th><th>진입 신호</th><th>복귀 신호</th><th>현재 연결</th><th>시점/시제</th><th>목적</th><th>분량</th></tr></thead><tbody>')
    items.forEach((r) => {
      parts.push('<tr>' + [
        r.title.trim() || '(무제)', r.placeAt.trim() || '-', r.trigger.trim() || '-',
        r.enterCue.trim() || '-', r.exitCue.trim() || '-', r.link.trim() || '-',
        `${r.pov.trim() || '미지정'} / ${tenseLabel(r.tense)}`, purposeLabel(r.purpose), LENGTH_LABELS[r.length],
      ].map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>')
    })
    parts.push('</tbody></table>')
    if (issues.length) {
      parts.push(`<p><strong>점검 ${issues.length}건 (경고 ${warnCount})</strong></p><ul>`)
      issues.forEach((x) => parts.push(`<li>${x.level === 'warn' ? '⚠ ' : 'ℹ '}${esc(x.text)}</li>`))
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: title.trim() ? `회상 배치 — ${title.trim()}` : '회상 배치 설계',
      bodyHtml: buildBodyHtml(),
      meta: { 회상수: String(total), 경고: String(warnCount), 총분량점수: String(totalLen) },
    })
    if (mounted.current) {
      setSaved(id ? '✓ 프로젝트 자료(플롯)에 회상 배치표 추가됨' : '프로젝트에 연결되지 않았습니다')
      setTimeout(() => { if (mounted.current) setSaved('') }, 1800)
    }
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, outline: dropHot ? '2px dashed var(--accent)' : 'none', outlineOffset: -6 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, fontSize: 13, padding: '7px 9px' }
  const selStyle: React.CSSProperties = { ...smallInput, cursor: 'pointer' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, padding: '20px 8px' }
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }
  const statChip = (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
    padding: '4px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: `1px solid ${color}`, color: 'var(--text)',
  })

  const fieldWrap = (label: string, el: React.ReactNode): React.ReactNode => (
    <div style={{ minWidth: 0 }}><span style={fieldLabel}>{label}</span>{el}</div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="⏳" /></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목 (선택)" maxLength={80} aria-label="작품 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div
        style={body}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* 안내 */}
        <div style={hint}>
          <strong style={{ color: 'var(--text)' }}>회상(플래시백) 배치</strong> — 좋은 회상은 <em>트리거</em>(지금 왜 떠오르나)·<em>진입/복귀 신호</em>(독자 길잡이)·<em>현재 서사와의 연결</em>(지금 장면에 무엇을 더하나)·<em>목적</em>이 분명합니다. 회상이 잦거나 길면 현재의 추진력이 끊기니 점검하세요. 좌측 파일을 끌어와 회상으로 담을 수 있어요.
        </div>

        {/* 현재 서사 기준 시제 + 통계 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={statChip('var(--border)')}>회상 {total}건</span>
          <span style={statChip(warnCount > 0 ? 'var(--warn)' : 'var(--ok)')}>{warnCount > 0 ? <><Emoji e="⚠" /> 경고 {warnCount}</> : <>✓ 경고 없음</>}</span>
          <span style={statChip('var(--border)')}>총 분량점수 {totalLen}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>현재 서사 시제:</span>
            <select style={{ ...selStyle, width: 'auto' }} value={baseTense} onChange={(e) => setBaseTense(e.target.value as Tense)} aria-label="현재 서사 시제">
              {TENSES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </span>
        </div>

        {/* 점검 결과 */}
        {issues.length > 0 && (
          <div style={{ background: 'var(--chrome-2)', border: `1px solid ${warnCount > 0 ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 10, padding: '9px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>점검 {issues.length}건 (경고 {warnCount})</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {issues.map((x, i) => (
                <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: x.level === 'warn' ? 'var(--text)' : 'var(--muted)' }}>
                  <span style={{ marginRight: 4 }}>{x.level === 'warn' ? <Emoji e="⚠" /> : <Emoji e="ℹ" />}</span>{x.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 추가 버튼 / 폼 */}
        {!formOpen ? (
          <button className="btn-primary" onClick={startAdd} style={{ alignSelf: 'flex-start' }}>+ 회상 추가</button>
        ) : (
          <div style={{ ...panel, border: '1px solid var(--accent)' }}>
            <div style={sectionTitle}>{editId ? '회상 수정' : '새 회상'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {fieldWrap('회상 이름', <input style={input} value={draft.title} onChange={(e) => setD('title', e.target.value)} placeholder="예: 어린 시절 화재" maxLength={80} autoFocus aria-label="회상 이름" />)}
                {fieldWrap('현재 서사 속 삽입 위치', <input style={input} value={draft.placeAt} onChange={(e) => setD('placeAt', e.target.value)} placeholder="예: 7장 / 12장면 / 재회 직후" maxLength={120} aria-label="삽입 위치" />)}
              </div>
              {fieldWrap('트리거 — 현재의 무엇이 이 회상을 불러오나?', <input style={input} value={draft.trigger} onChange={(e) => setD('trigger', e.target.value)} placeholder="예: 불에 탄 냄새를 맡는다 / 옛 사진을 본다" maxLength={200} aria-label="트리거" />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {fieldWrap('진입 신호 (회상으로 들어가는 표지)', <input style={smallInput} value={draft.enterCue} onChange={(e) => setD('enterCue', e.target.value)} placeholder="예: 구분선 / 시제 전환 / 감각 단서" maxLength={160} aria-label="진입 신호" />)}
                {fieldWrap('복귀 신호 (현재로 돌아오는 표지)', <input style={smallInput} value={draft.exitCue} onChange={(e) => setD('exitCue', e.target.value)} placeholder="예: 누가 부르는 소리 / 현재 시제 복귀" maxLength={160} aria-label="복귀 신호" />)}
              </div>
              {fieldWrap('현재 서사와의 연결 — 지금 장면에 무엇을 더하나?', <input style={input} value={draft.link} onChange={(e) => setD('link', e.target.value)} placeholder="예: 주인공이 불을 두려워하는 이유를 독자에게 보여줌" maxLength={200} aria-label="현재 서사 연결" />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {fieldWrap('목적', (
                  <select style={selStyle} value={draft.purpose} onChange={(e) => setD('purpose', e.target.value as Purpose)} aria-label="목적">
                    {PURPOSES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                  </select>
                ))}
                {fieldWrap('회상 서술 시제', (
                  <select style={selStyle} value={draft.tense} onChange={(e) => setD('tense', e.target.value as Tense)} aria-label="회상 시제">
                    {TENSES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {fieldWrap('시점(POV) — 누구의 기억인가', <input style={smallInput} value={draft.pov} onChange={(e) => setD('pov', e.target.value)} placeholder="예: 주인공 / 1인칭 / 어머니" maxLength={80} aria-label="시점" />)}
                {fieldWrap(`분량: ${LENGTH_LABELS[draft.length]}`, (
                  <input type="range" min={0} max={5} step={1} value={draft.length} onChange={(e) => setD('length', clampLen(Number(e.target.value)))} style={{ width: '100%', accentColor: 'var(--accent)' }} aria-label="분량" />
                ))}
              </div>
              {fieldWrap('메모 (선택)', <textarea style={{ ...input, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }} value={draft.note} onChange={(e) => setD('note', e.target.value)} placeholder="추가 메모" maxLength={500} aria-label="메모" />)}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={commitForm}>{editId ? '저장' : '추가'}</button>
                <button className="minibtn" onClick={cancelForm}>취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 회상 목록 */}
        <div style={panel}>
          <div style={sectionTitle}>회상 목록 (현재 서사 순서대로 배치)</div>
          {items.length === 0 ? (
            <div style={empty}>
              아직 등록된 회상이 없어요.<br />
              위의 <strong>+ 회상 추가</strong>로 첫 회상을 설계하거나, 좌측 파일을 끌어와 담아 보세요.<br />
              <span style={{ fontSize: 12 }}>트리거(왜 지금 떠오르나)와 현재 서사와의 연결부터 적으면 좋아요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((r, idx) => {
                const hasWarn = issues.some((x) => x.rid === r.id && x.level === 'warn')
                return (
                  <div key={r.id} style={{ background: 'var(--chrome-2)', border: `1px solid ${hasWarn ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--muted)', minWidth: 22 }}>#{idx + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>
                        {r.title.trim() || <em style={{ color: 'var(--muted)', fontWeight: 400 }}>(무제 회상)</em>}
                        {r.placeAt.trim() && <span style={{ fontSize: 11.5, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}><Emoji e="📍" /> {r.placeAt.trim()}</span>}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', borderRadius: 6, padding: '2px 7px' }}>{purposeLabel(r.purpose)}</span>
                      <span style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>{LENGTH_LABELS[r.length]}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontSize: 12, color: 'var(--muted)' }}>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>트리거:</b> {r.trigger.trim() || <em style={{ opacity: 0.6 }}>미기재</em>}</span>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>연결:</b> {r.link.trim() || <em style={{ opacity: 0.6 }}>미기재</em>}</span>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>진입:</b> {r.enterCue.trim() || <em style={{ opacity: 0.6 }}>미기재</em>}</span>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>복귀:</b> {r.exitCue.trim() || <em style={{ opacity: 0.6 }}>미기재</em>}</span>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>시점:</b> {r.pov.trim() || <em style={{ opacity: 0.6 }}>미지정</em>}</span>
                      <span><b style={{ color: 'var(--text)', fontWeight: 600 }}>시제:</b> {tenseLabel(r.tense)}</span>
                    </div>
                    {r.note.trim() && <div style={{ fontSize: 11.5, color: 'var(--muted)', borderTop: '1px dashed var(--border)', paddingTop: 4 }}><Emoji e="📝" /> {r.note}</div>}
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => move(r.id, -1)} disabled={idx === 0} title="위로" aria-label="위로 이동">▲</button>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => move(r.id, 1)} disabled={idx === items.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => startEdit(r)} title="수정" aria-label="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => remove(r.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 동작 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 <strong style={{ color: 'var(--text)' }}>{total}</strong>건</span>
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}</button>
          <button className="minibtn" onClick={clearAll} disabled={items.length === 0} title="모든 회상 삭제">전체 비우기</button>
        </div>

        {/* 프로젝트 연동 */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '회상 배치표를 프로젝트 자료(플롯)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>
        {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>{saved}</div>}

        {/* 저작권/출처: 외부 콘텐츠 없음 — 사용자 입력만 다룹니다 */}
        <div className="license-note" style={{ ...hint, marginTop: 2 }}>
          이 도구는 외부 이미지·텍스트를 불러오지 않으며, 입력한 내용만 이 브라우저(localStorage)에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
