// 투고·공모전 추적기 (QueryTracker식) — 제출처(출판사/공모전/플랫폼)·작품·제출일·상태·마감·메모를
//   표로 관리한다. 상태별 색 배지, 마감 임박 정렬·강조, 필터/정렬/검색, 통계(상태별·수락률),
//   인라인 추가·수정·삭제·복제, CSV 내보내기, 프로젝트/수집함 연계까지 갖춘 '거의 앱 하나' 규모 도구.
// 자급식: react 와 './linkbus' 외 import 금지. 완전 로컬(외부 미디어/키 불필요).
//   모든 상태는 localStorage('sry:tool:submission-tracker')에 영속. 미지원/차단/손상 시 메모리만 graceful.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, getDragItem, isItemDrag } from './linkbus'
import { Emoji } from './linkbus'

export const meta = { id: 'submission-tracker', name: '투고·공모전 추적기', icon: '📮', group: '집중·생산성', intro: '출판사·공모전·플랫폼 투고 현황을 상태·마감별로 한눈에 추적합니다', w: 880, h: 640 }

const LS_KEY = 'sry:tool:submission-tracker'

// ── 도메인 모델 ─────────────────────────────────────────
type Status = 'prep' | 'submitted' | 'review' | 'accepted' | 'rejected' | 'withdrawn'
type Channel = 'publisher' | 'contest' | 'platform' | 'agent' | 'magazine' | 'etc'

interface Sub {
  id: string
  work: string        // 작품(투고작)
  place: string       // 제출처 이름
  channel: Channel    // 제출처 유형
  status: Status
  submitDate: string  // 제출일 YYYY-MM-DD (빈 값 허용)
  deadline: string    // 마감 YYYY-MM-DD (빈 값 허용)
  fee: string         // 응모료(자유 입력)
  url: string         // 링크
  notes: string       // 메모
  created: number
  updated: number
}

const STATUS: Record<Status, { label: string; color: string; bg: string; order: number }> = {
  prep:      { label: '준비',   color: '#9aa0a6', bg: 'rgba(154,160,166,.16)', order: 0 },
  submitted: { label: '제출',   color: '#4a90e2', bg: 'rgba(74,144,226,.16)',  order: 1 },
  review:    { label: '검토중', color: '#d99a2b', bg: 'rgba(217,154,43,.18)',  order: 2 },
  accepted:  { label: '수락',   color: '#2e9e5b', bg: 'rgba(46,158,91,.18)',   order: 3 },
  rejected:  { label: '거절',   color: '#d6534b', bg: 'rgba(214,83,75,.16)',   order: 4 },
  withdrawn: { label: '철회',   color: '#8a8a8a', bg: 'rgba(138,138,138,.14)', order: 5 },
}
const STATUS_ORDER: Status[] = ['prep', 'submitted', 'review', 'accepted', 'rejected', 'withdrawn']

const CHANNEL: Record<Channel, { label: string; icon: string }> = {
  publisher: { label: '출판사', icon: '🏢' },
  contest:   { label: '공모전', icon: '🏆' },
  platform:  { label: '플랫폼', icon: '🌐' },
  agent:     { label: '에이전시', icon: '🤝' },
  magazine:  { label: '잡지', icon: '📰' },
  etc:       { label: '기타', icon: '📌' },
}
const CHANNEL_ORDER: Channel[] = ['publisher', 'contest', 'platform', 'agent', 'magazine', 'etc']

type SortKey = 'deadline' | 'submitDate' | 'status' | 'place' | 'work' | 'updated'

// ── 유틸 ────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const MS_PER_DAY = 86400000
function startOfToday(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

// YYYY-MM-DD → 자정 Date(로컬). 유효하지 않으면 null.
function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dd = new Date(y, m - 1, d)
  if (isNaN(dd.getTime()) || dd.getMonth() !== m - 1) return null
  dd.setHours(0, 0, 0, 0)
  return dd
}

// 마감까지 남은 일수(오늘 자정 기준). 마감 없으면 null.
function daysToDeadline(s: string): number | null {
  const dd = parseDate(s)
  if (!dd) return null
  return Math.round((dd.getTime() - startOfToday().getTime()) / MS_PER_DAY)
}

// D-day 라벨
function ddayLabel(days: number | null): string {
  if (days == null) return '—'
  if (days === 0) return 'D-DAY'
  if (days > 0) return 'D-' + days
  return 'D+' + Math.abs(days)
}

function todayStr(): string {
  const d = startOfToday()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// ── 영속 ────────────────────────────────────────────────
function load(): Sub[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x): Sub => ({
        id: String(x.id || newId()),
        work: String(x.work || ''),
        place: String(x.place || ''),
        channel: (CHANNEL[x.channel as Channel] ? x.channel : 'publisher') as Channel,
        status: (STATUS[x.status as Status] ? x.status : 'prep') as Status,
        submitDate: typeof x.submitDate === 'string' ? x.submitDate : '',
        deadline: typeof x.deadline === 'string' ? x.deadline : '',
        fee: typeof x.fee === 'string' ? x.fee : '',
        url: typeof x.url === 'string' ? x.url : '',
        notes: typeof x.notes === 'string' ? x.notes : '',
        created: Number(x.created) || Date.now(),
        updated: Number(x.updated) || Date.now(),
      }))
  } catch {
    return []
  }
}

function emptyDraft(): Omit<Sub, 'id' | 'created' | 'updated'> {
  return { work: '', place: '', channel: 'publisher', status: 'prep', submitDate: '', deadline: '', fee: '', url: '', notes: '' }
}

export default function SubmissionTracker({ payload }: { payload?: Record<string, unknown> }) {
  const [subs, setSubs] = useState<Sub[]>(() => load())
  const [draft, setDraft] = useState(() => emptyDraft())
  const [editId, setEditId] = useState<string | null>(null)   // 인라인 편집 중인 행
  const [editBuf, setEditBuf] = useState<Sub | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filterChannel, setFilterChannel] = useState<Channel | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [sortAsc, setSortAsc] = useState(true)
  const [note, setNote] = useState('')   // 저장 경고
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, forceTick] = useState(0) // 자정 경과 시 D-day 갱신용

  // payload 로 작품명 프리필(다른 도구에서 열렸을 때)
  useEffect(() => {
    const t = payload && (payload.title || payload.work)
    if (typeof t === 'string' && t.trim()) {
      setDraft((d) => ({ ...d, work: t.trim() }))
      setShowForm(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    tickTimer.current = setInterval(() => { if (mounted.current) forceTick((n) => n + 1) }, 60000)
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (tickTimer.current) clearInterval(tickTimer.current)
    }
  }, [])

  // 변경 저장 (graceful)
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(subs))
      if (mounted.current && note) setNote('')
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 목록이 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 3200)
  }

  // ── CRUD ──────────────────────────────────────────────
  const addSub = () => {
    const work = draft.work.trim()
    const place = draft.place.trim()
    if (!work && !place) { flash('작품 또는 제출처 중 하나는 입력하세요.'); return }
    const now = Date.now()
    const rec: Sub = { ...draft, work, place, id: newId(), created: now, updated: now }
    setSubs((p) => [rec, ...p])
    setDraft(emptyDraft())
    setShowForm(false)
    flash('추가되었습니다.')
  }

  const remove = (id: string) => {
    setSubs((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setEditBuf(null) }
  }

  const duplicate = (s: Sub) => {
    const now = Date.now()
    setSubs((p) => [{ ...s, id: newId(), status: 'prep', submitDate: '', created: now, updated: now }, ...p])
    flash('복제했습니다(상태=준비).')
  }

  // 상태 빠른 변경(드롭다운)
  const setStatus = (id: string, status: Status) => {
    setSubs((p) => p.map((s) => {
      if (s.id !== id) return s
      const patch: Partial<Sub> = { status, updated: Date.now() }
      // 제출 상태로 바꾸는데 제출일이 비어 있으면 오늘로 자동 기록
      if ((status === 'submitted' || status === 'review') && !s.submitDate) patch.submitDate = todayStr()
      return { ...s, ...patch }
    }))
  }

  const startEdit = (s: Sub) => { setEditId(s.id); setEditBuf({ ...s }) }
  const cancelEdit = () => { setEditId(null); setEditBuf(null) }
  const saveEdit = () => {
    if (!editBuf) return
    const buf = editBuf
    setSubs((p) => p.map((s) => (s.id === buf.id ? { ...buf, work: buf.work.trim(), place: buf.place.trim(), updated: Date.now() } : s)))
    setEditId(null); setEditBuf(null)
    flash('수정되었습니다.')
  }

  const clearAll = () => {
    if (!subs.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 투고 기록을 삭제할까요? 되돌릴 수 없습니다.')) return
    setSubs([])
    setEditId(null); setEditBuf(null)
  }

  // 좌측 바인더 파일 드롭 → 작품으로 새 폼 프리필
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    setDraft({ ...emptyDraft(), work: item.title || '' })
    setShowForm(true)
    flash('"' + (item.title || '문서') + '"(으)로 새 투고 폼을 채웠어요.')
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ── 파생: 필터 + 정렬 ─────────────────────────────────
  const q = query.trim().toLowerCase()
  let view = subs.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    if (filterChannel !== 'all' && s.channel !== filterChannel) return false
    if (q) {
      const hay = (s.work + ' ' + s.place + ' ' + s.notes + ' ' + s.fee).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  view = view.slice().sort((a, b) => {
    let cmp = 0
    if (sortKey === 'deadline') {
      // 마감 임박 우선: 미래 마감(작은 양수) → 오늘 → 지난 마감 → 마감 없음(맨 뒤)
      const da = daysToDeadline(a.deadline)
      const db = daysToDeadline(b.deadline)
      const ka = da == null ? Number.POSITIVE_INFINITY : da
      const kb = db == null ? Number.POSITIVE_INFINITY : db
      cmp = ka - kb
    } else if (sortKey === 'submitDate') {
      cmp = (a.submitDate || '').localeCompare(b.submitDate || '')
    } else if (sortKey === 'status') {
      cmp = STATUS[a.status].order - STATUS[b.status].order
    } else if (sortKey === 'place') {
      cmp = a.place.localeCompare(b.place, 'ko')
    } else if (sortKey === 'work') {
      cmp = a.work.localeCompare(b.work, 'ko')
    } else if (sortKey === 'updated') {
      cmp = a.updated - b.updated
    }
    if (cmp === 0) cmp = b.updated - a.updated
    return sortAsc ? cmp : -cmp
  })

  // ── 통계 ──────────────────────────────────────────────
  const counts: Record<Status, number> = { prep: 0, submitted: 0, review: 0, accepted: 0, rejected: 0, withdrawn: 0 }
  for (const s of subs) counts[s.status]++
  const decided = counts.accepted + counts.rejected
  const acceptRate = decided > 0 ? Math.round((counts.accepted / decided) * 100) : null
  // 활성(준비/제출/검토중) 중 마감 7일 이내
  const imminent = subs.filter((s) => {
    if (s.status === 'accepted' || s.status === 'rejected' || s.status === 'withdrawn') return false
    const d = daysToDeadline(s.deadline)
    return d != null && d >= 0 && d <= 7
  })
  const overdue = subs.filter((s) => {
    if (s.status === 'accepted' || s.status === 'rejected' || s.status === 'withdrawn') return false
    const d = daysToDeadline(s.deadline)
    return d != null && d < 0
  })

  // ── 내보내기/연계 ─────────────────────────────────────
  function csvCell(v: string): string {
    const needs = /[",\n]/.test(v)
    const e = v.replace(/"/g, '""')
    return needs ? '"' + e + '"' : e
  }
  const exportCsv = () => {
    if (!subs.length) { flash('내보낼 기록이 없어요.'); return }
    const head = ['작품', '제출처', '유형', '상태', '제출일', '마감', '응모료', '링크', '메모']
    const rows = subs.map((s) => [s.work, s.place, CHANNEL[s.channel].label, STATUS[s.status].label, s.submitDate, s.deadline, s.fee, s.url, s.notes])
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    try {
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'submissions_' + todayStr() + '.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash('CSV 파일로 내보냈습니다.')
    } catch {
      flash('내보내기에 실패했어요.')
    }
  }

  function toProjectHtml(list: Sub[]): string {
    let out = '<table border="1" cellpadding="6" cellspacing="0">'
    out += '<tr><th>작품</th><th>제출처</th><th>유형</th><th>상태</th><th>제출일</th><th>마감</th><th>메모</th></tr>'
    for (const s of list) {
      out += '<tr>'
        + '<td>' + escHtml(s.work) + '</td>'
        + '<td>' + escHtml(s.place) + '</td>'
        + '<td>' + escHtml(CHANNEL[s.channel].label) + '</td>'
        + '<td>' + escHtml(STATUS[s.status].label) + '</td>'
        + '<td>' + escHtml(s.submitDate) + '</td>'
        + '<td>' + escHtml(s.deadline) + '</td>'
        + '<td>' + escHtml(s.notes) + '</td>'
        + '</tr>'
    }
    out += '</table>'
    return out
  }
  const exportToProject = () => {
    if (!subs.length) { flash('추가할 기록이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '투고 관리',
      title: '투고·공모전 현황 (' + todayStr() + ')',
      bodyHtml: toProjectHtml(view.length ? view : subs),
      meta: { 전체: String(subs.length), 수락: String(counts.accepted), 검토중: String(counts.review), 수락률: acceptRate == null ? '—' : acceptRate + '%' },
    })
    flash(id ? '프로젝트 자료 "투고 관리" 폴더에 현황표를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashOne = (s: Sub) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    const dl = s.deadline ? ' / 마감 ' + s.deadline + ' (' + ddayLabel(daysToDeadline(s.deadline)) + ')' : ''
    addToStash({
      kind: 'memo',
      label: (s.work || '무제') + ' → ' + (s.place || '미지정'),
      text: '[' + STATUS[s.status].label + '] ' + (s.work || '무제') + ' → ' + (s.place || '미지정') + ' (' + CHANNEL[s.channel].label + ')' + dl + (s.notes ? '\n' + s.notes : ''),
      url: s.url || undefined,
    })
    flash('수집함에 담았습니다.')
  }

  // ── 스타일 ────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const head: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '0 14px 14px' }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...input, cursor: 'pointer' }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3, display: 'block' }
  const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }

  const statChip = (s: Status): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: STATUS[s].color, background: STATUS[s].bg, border: '1px solid ' + STATUS[s].color + '44',
  })

  // 마감 셀 색: 지남=warn, 0~3일=accent(임박), 그 외 기본
  function ddColor(days: number | null, status: Status): string {
    if (status === 'accepted' || status === 'rejected' || status === 'withdrawn') return 'var(--muted)'
    if (days == null) return 'var(--muted)'
    if (days < 0) return 'var(--warn)'
    if (days <= 3) return 'var(--accent)'
    return 'var(--text)'
  }

  const th: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 1, background: 'var(--chrome-2)', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }
  const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, verticalAlign: 'top' }

  const sortArrow = (k: SortKey) => (sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : '')
  const clickSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((a) => !a)
    else { setSortKey(k); setSortAsc(k === 'place' || k === 'work' || k === 'deadline') }
  }

  const editInput: React.CSSProperties = { ...input, width: '100%', padding: '5px 7px', fontSize: 12.5 }

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div style={wrap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      {/* 헤더: 통계 + 액션 */}
      <div style={head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}><Emoji e="📮" /> 투고 현황</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>전체 {subs.length}</span>
          {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <span key={s} style={{ ...statChip(s), padding: '2px 8px', fontSize: 11.5 }}>{STATUS[s].label} {counts[s]}</span>
          ))}
          {acceptRate != null && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>수락률 <strong style={{ color: 'var(--ok)' }}>{acceptRate}%</strong> ({counts.accepted}/{decided})</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary" onClick={() => { setShowForm((v) => !v); if (!showForm) setDraft(emptyDraft()) }}>{showForm ? '닫기' : '＋ 새 투고'}</button>
        </div>
      </div>

      {/* 마감 임박/지남 경고 배너 */}
      {(imminent.length > 0 || overdue.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
          {overdue.length > 0 && (
            <span style={{ color: 'var(--warn)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setSortKey('deadline'); setSortAsc(true); setFilterStatus('all') }}>
              <Emoji e="⚠️" /> 마감 지남 {overdue.length}건
            </span>
          )}
          {imminent.length > 0 && (
            <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setSortKey('deadline'); setSortAsc(true); setFilterStatus('all') }}>
              <Emoji e="🔥" /> 7일 내 마감 {imminent.length}건
            </span>
          )}
        </div>
      )}

      {/* 새 투고 입력 폼 */}
      {showForm && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div style={field}>
              <label style={label}>작품(투고작)</label>
              <input style={input} value={draft.work} maxLength={120} placeholder="예: 단편 「유리정원」" onChange={(e) => setDraft({ ...draft, work: e.target.value })} />
            </div>
            <div style={field}>
              <label style={label}>제출처</label>
              <input style={input} value={draft.place} maxLength={120} placeholder="예: ○○문학상 / △△출판사" onChange={(e) => setDraft({ ...draft, place: e.target.value })} />
            </div>
            <div style={field}>
              <label style={label}>유형</label>
              <select style={sel} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as Channel })}>
                {CHANNEL_ORDER.map((c) => <option key={c} value={c}>{CHANNEL[c].icon} {CHANNEL[c].label}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={label}>상태</label>
              <select style={sel} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={label}>제출일</label>
              <input style={input} type="date" value={draft.submitDate} onChange={(e) => setDraft({ ...draft, submitDate: e.target.value })} />
            </div>
            <div style={field}>
              <label style={label}>마감</label>
              <input style={input} type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
            </div>
            <div style={field}>
              <label style={label}>응모료(선택)</label>
              <input style={input} value={draft.fee} maxLength={40} placeholder="예: 무료 / 30,000원" onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />
            </div>
            <div style={field}>
              <label style={label}>링크(선택)</label>
              <input style={input} value={draft.url} maxLength={400} placeholder="https://…" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
            </div>
          </div>
          <div style={field}>
            <label style={label}>메모(선택)</label>
            <textarea style={{ ...input, resize: 'vertical', minHeight: 48, fontFamily: 'inherit' }} value={draft.notes} maxLength={1000} placeholder="요구 분량, 담당자, 결과 발표일 등" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={addSub}>추가</button>
            <button className="minibtn" onClick={() => { setShowForm(false); setDraft(emptyDraft()) }}>취소</button>
          </div>
        </div>
      )}

      {/* 필터 줄 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <input style={{ ...input, flex: 1, minWidth: 140 }} value={query} placeholder="🔍 작품·제출처·메모 검색" onChange={(e) => setQuery(e.target.value)} />
        <select style={sel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Status | 'all')} title="상태 필터">
          <option value="all">상태: 전체</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label} ({counts[s]})</option>)}
        </select>
        <select style={sel} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value as Channel | 'all')} title="유형 필터">
          <option value="all">유형: 전체</option>
          {CHANNEL_ORDER.map((c) => <option key={c} value={c}>{CHANNEL[c].icon} {CHANNEL[c].label}</option>)}
        </select>
        {(query || filterStatus !== 'all' || filterChannel !== 'all') && (
          <button className="minibtn" onClick={() => { setQuery(''); setFilterStatus('all'); setFilterChannel('all') }}>필터 해제</button>
        )}
      </div>

      {note && <div style={{ padding: '8px 14px', color: 'var(--warn)', fontSize: 12 }}>{note}</div>}

      {/* 본문: 표 또는 빈 상태 */}
      <div style={body}>
        {subs.length === 0 ? (
          <div style={{ height: '100%', minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 12, padding: 20 }}>
            <div style={{ fontSize: 38 }}><Emoji e="📮" /></div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              아직 투고 기록이 없어요.<br />
              <strong style={{ color: 'var(--text)' }}>＋ 새 투고</strong> 로 첫 제출처를 등록하거나,<br />
              왼쪽 바인더의 원고 파일을 여기로 끌어다 놓아 보세요.
            </div>
            <button className="btn-primary" onClick={() => { setShowForm(true); setDraft(emptyDraft()) }}>＋ 첫 투고 추가</button>
          </div>
        ) : view.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7 }}>
            조건에 맞는 기록이 없어요.<br />검색어나 필터를 바꿔 보세요.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th} onClick={() => clickSort('work')}>작품{sortArrow('work')}</th>
                <th style={th} onClick={() => clickSort('place')}>제출처{sortArrow('place')}</th>
                <th style={th} onClick={() => clickSort('status')}>상태{sortArrow('status')}</th>
                <th style={th} onClick={() => clickSort('submitDate')}>제출일{sortArrow('submitDate')}</th>
                <th style={th} onClick={() => clickSort('deadline')}>마감{sortArrow('deadline')}</th>
                <th style={{ ...th, cursor: 'default' }}>메모</th>
                <th style={{ ...th, cursor: 'default', textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {view.map((s) => {
                const editing = editId === s.id && editBuf
                const days = daysToDeadline(s.deadline)
                if (editing && editBuf) {
                  return (
                    <tr key={s.id} style={{ background: 'var(--panel)' }}>
                      <td style={td}><input style={editInput} value={editBuf.work} maxLength={120} onChange={(e) => setEditBuf({ ...editBuf, work: e.target.value })} /></td>
                      <td style={td}>
                        <input style={editInput} value={editBuf.place} maxLength={120} onChange={(e) => setEditBuf({ ...editBuf, place: e.target.value })} />
                        <select style={{ ...editInput, marginTop: 4 }} value={editBuf.channel} onChange={(e) => setEditBuf({ ...editBuf, channel: e.target.value as Channel })}>
                          {CHANNEL_ORDER.map((c) => <option key={c} value={c}>{CHANNEL[c].icon} {CHANNEL[c].label}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <select style={editInput} value={editBuf.status} onChange={(e) => setEditBuf({ ...editBuf, status: e.target.value as Status })}>
                          {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS[st].label}</option>)}
                        </select>
                      </td>
                      <td style={td}><input style={editInput} type="date" value={editBuf.submitDate} onChange={(e) => setEditBuf({ ...editBuf, submitDate: e.target.value })} /></td>
                      <td style={td}><input style={editInput} type="date" value={editBuf.deadline} onChange={(e) => setEditBuf({ ...editBuf, deadline: e.target.value })} /></td>
                      <td style={td} colSpan={1}>
                        <textarea style={{ ...editInput, resize: 'vertical', minHeight: 40, fontFamily: 'inherit' }} value={editBuf.notes} maxLength={1000} onChange={(e) => setEditBuf({ ...editBuf, notes: e.target.value })} />
                        <input style={{ ...editInput, marginTop: 4 }} value={editBuf.fee} maxLength={40} placeholder="응모료" onChange={(e) => setEditBuf({ ...editBuf, fee: e.target.value })} />
                        <input style={{ ...editInput, marginTop: 4 }} value={editBuf.url} maxLength={400} placeholder="링크" onChange={(e) => setEditBuf({ ...editBuf, url: e.target.value })} />
                      </td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn-primary" onClick={saveEdit} style={{ marginBottom: 4 }}>저장</button><br />
                        <button className="minibtn" onClick={cancelEdit}>취소</button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={s.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.work || <span style={{ color: 'var(--muted)' }}>무제</span>}</div>
                      {s.fee && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}><Emoji e="💸" /> {s.fee}</div>}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span title={CHANNEL[s.channel].label}><Emoji e={CHANNEL[s.channel].icon} /></span>
                        {s.url ? (
                          <a className="linkbtn" href={s.url} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-all' }}>{s.place || '미지정'}</a>
                        ) : (
                          <span style={{ color: s.place ? 'var(--text)' : 'var(--muted)', wordBreak: 'break-all' }}>{s.place || '미지정'}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{CHANNEL[s.channel].label}</div>
                    </td>
                    <td style={td}>
                      <select
                        value={s.status}
                        onChange={(e) => setStatus(s.id, e.target.value as Status)}
                        style={{ ...statChip(s.status), border: '1px solid ' + STATUS[s.status].color + '55', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' as React.CSSProperties['MozAppearance'], paddingRight: 9 }}
                        title="상태 변경"
                      >
                        {STATUS_ORDER.map((st) => <option key={st} value={st} style={{ color: 'var(--text)', background: 'var(--paper)' }}>{STATUS[st].label}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: s.submitDate ? 'var(--text)' : 'var(--muted)' }}>{s.submitDate || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {s.deadline ? (
                        <div>
                          <div style={{ color: ddColor(days, s.status) }}>{s.deadline}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: ddColor(days, s.status) }}>{ddayLabel(days)}{days != null && days < 0 && s.status !== 'accepted' && s.status !== 'rejected' && s.status !== 'withdrawn' ? ' 지남' : ''}</div>
                        </div>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ ...td, maxWidth: 220 }}>
                      {s.notes ? <span style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block', maxHeight: 64, overflow: 'auto' }}>{s.notes}</span> : <span style={{ color: 'var(--border)' }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="minibtn" title="수정" onClick={() => startEdit(s)}><Emoji e="✏️" /></button>{' '}
                      <button className="minibtn" title="복제" onClick={() => duplicate(s)}>⧉</button>{' '}
                      {hasStash() && <><button className="minibtn" title="수집함에 담기" onClick={() => stashOne(s)}><Emoji e="📥" /></button>{' '}</>}
                      <button className="minibtn" title="삭제" onClick={() => remove(s.id)}><Emoji e="🗑️" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 푸터: 안내 + 연계 + 도구 */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toast && <div style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</div>}
        <div style={hint}>
          상태 배지를 눌러 바로 변경할 수 있고, ‘마감’ 머리글을 누르면 임박 순으로 정렬됩니다. 모든 기록은 이 브라우저에 자동 저장됩니다.
        </div>
        <div className="linkbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
          <button
            className="linkbtn"
            onClick={exportToProject}
            disabled={!subs.length || !hasProjectBridge()}
            title={hasProjectBridge() ? '현황표를 프로젝트 자료 "투고 관리" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={exportCsv} disabled={!subs.length} title="현황을 CSV 파일로 내보내기(엑셀에서 열 수 있음)"><Emoji e="⬇️" /> CSV 내보내기</button>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={clearAll} disabled={!subs.length}>전체 비우기</button>
        </div>
      </div>
    </div>
  )
}
