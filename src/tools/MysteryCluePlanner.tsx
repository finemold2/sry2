// 단서·레드헤링 배치기 — 미스터리·추리 작가가 진짜 단서(true clue)와 거짓 단서(red herring)를
// 챕터별로 배치하고, '공정한 단서(fair-play)' 원칙을 점검하는 구조 도구.
//  · CRUD: 단서를 만들고(유형/챕터/심은 사람/가리키는 곳/회수 챕터 등) 수정·삭제·순서 변경.
//  · 회수 여부 체크: 심은 단서를 어디서 회수(payoff)했는지 표시 → 미회수 단서를 경고.
//  · 공정성 점검: '범인을 가리키는 단서가 결말 전에 독자에게 제시되었는가' 등 fair-play 체크리스트.
//  · 챕터 타임라인 뷰: 각 챕터에 어떤 진짜/거짓 단서가 놓였는지 한눈에.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:mystery-clue-planner'.
// 연계(linkbus): 단서 배치표를 실제 프로젝트 자료('research')/'사건' 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-clue-planner',
  name: '단서·레드헤링 배치기',
  icon: '🔍',
  group: '구조',
  genre: '미스터리·추리',
  intro: '진짜 단서와 거짓 단서(레드헤링)를 챕터별로 배치하고 공정한 단서 원칙을 점검하세요',
  w: 860,
  h: 660,
}

const LS_KEY = 'sry:tool:mystery-clue-planner'

// ── 단서 유형 ──
type ClueKind = 'true' | 'herring'
interface KindDef { key: ClueKind; label: string; icon: string; color: string; hint: string }
const KINDS: KindDef[] = [
  { key: 'true', label: '진짜 단서', icon: '🟢', color: 'var(--ok)', hint: '진상·범인·트릭을 정직하게 가리키는 단서. 사후에 "그때 그랬구나" 납득되어야 한다.' },
  { key: 'herring', label: '거짓 단서(레드헤링)', icon: '🔴', color: 'var(--warn)', hint: '엉뚱한 방향으로 의심을 끄는 미끼. 결국 합리적으로 해명·기각되어야 공정하다.' },
]
function kindDef(k: ClueKind): KindDef { return KINDS.find((d) => d.key === k) || KINDS[0] }

// ── 단서가 제시되는 방식(독자에게 어떻게 노출되나) ──
const CHANNELS = ['대사·증언', '물증·현장', '행동·반응', '서술·묘사', '문서·기록', '회상·과거', '전문가 분석', '우연·사고'] as const
type Channel = typeof CHANNELS[number]

// ── 공정한 단서(fair-play) 점검 항목 — 진짜 단서/레드헤링별로 다른 질문 ──
const FAIR_TRUE: { id: string; q: string }[] = [
  { id: 't1', q: '이 단서가 결말(범인 공개) 이전에 독자에게 분명히 제시되는가?' },
  { id: 't2', q: '탐정이 아는 정보를 독자도 같은 시점에 알 수 있는가? (정보 은닉이 아닌가)' },
  { id: 't3', q: '사후에 다시 읽으면 "이미 답이 있었다"고 납득되는가?' },
  { id: 't4', q: '결정적 단서가 우연·초자연이 아니라 논리로 이어지는가?' },
]
const FAIR_HERRING: { id: string; q: string }[] = [
  { id: 'h1', q: '이 레드헤링이 그럴듯하게 잘못된 결론으로 유도하는가?' },
  { id: 'h2', q: '결말 전에 합리적으로 해명·기각되어 독자가 속았다고 화나지 않는가?' },
  { id: 'h3', q: '진짜 단서를 가리는 역할을 하되, 부정행위(거짓 서술)에 기대지 않는가?' },
]
function fairFor(k: ClueKind) { return k === 'true' ? FAIR_TRUE : FAIR_HERRING }

interface Clue {
  id: string
  title: string          // 단서 한 줄
  kind: ClueKind
  chapter: string        // 심은 챕터/장면 라벨 (자유 입력: '1장', '프롤로그' 등)
  channel: Channel       // 제시 방식
  plantedBy: string      // 누가/무엇이 흘렸나(인물·상황)
  pointsTo: string       // 무엇을 가리키나(진짜: 진상 / 거짓: 오인 대상)
  recovered: boolean     // 회수(payoff)되었나
  recoverChapter: string // 회수 챕터
  detail: string         // 상세 메모
  checks: Record<string, boolean>
  createdAt: number
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Clue {
  return {
    id: '', title: '', kind: 'true', chapter: '', channel: '물증·현장',
    plantedBy: '', pointsTo: '', recovered: false, recoverChapter: '',
    detail: '', checks: {}, createdAt: 0,
  }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── localStorage 복원(미지원/손상 시 graceful) ──
function loadState(): { list: Clue[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Clue[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      title: String(x.title || ''),
      kind: (x.kind === 'herring' ? 'herring' : 'true') as ClueKind,
      chapter: String(x.chapter || ''),
      channel: (CHANNELS.includes(x.channel) ? x.channel : '물증·현장') as Channel,
      plantedBy: String(x.plantedBy || ''),
      pointsTo: String(x.pointsTo || ''),
      recovered: !!x.recovered,
      recoverChapter: String(x.recoverChapter || ''),
      detail: String(x.detail || ''),
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

// 챕터 라벨 → 정렬 가중치(숫자가 있으면 그 숫자로, 없으면 큰 값) — 타임라인 정렬용.
function chapterWeight(label: string): number {
  const m = label.match(/\d+/)
  if (m) return parseInt(m[0], 10)
  const low = label.trim()
  if (/프롤로그|서막|서장/.test(low)) return -1
  if (/에필로그|종막|결말/.test(low)) return 99999
  return 50000
}

export default function MysteryCluePlanner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Clue[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Clue | null>(null)
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [filter, setFilter] = useState<'all' | ClueKind | 'unrecovered'>('all')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const mounted = useRef(true)

  // payload.genre 맥락(장르 도구함에서 열림) — 안내 문구에만 가볍게 반영.
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장(차단/용량초과 graceful).
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 복사/안내 자동 소거(언마운트 정리).
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1700)
    return () => window.clearTimeout(t)
  }, [copied])

  // ── CRUD ──
  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (c: Clue) => { setEditing({ ...c, checks: { ...c.checks } }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.title.trim()) e.title = '제목 없는 단서'
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((c) => c.id === e.id)
      return exists ? prev.map((c) => (c.id === e.id ? e : c)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const toggleRecovered = (id: string) => {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, recovered: !c.recovered } : c)))
    if (editing?.id === id) setEditing({ ...editing, recovered: !editing.recovered })
  }

  const toggleCheck = (qid: string) => {
    if (editing) { setEditing({ ...editing, checks: { ...editing.checks, [qid]: !editing.checks[qid] } }); return }
    if (!openId) return
    setList((prev) => prev.map((c) => (c.id === openId ? { ...c, checks: { ...c.checks, [qid]: !c.checks[qid] } } : c)))
  }

  // ── 복사 ──
  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setCopied(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setCopied('복사 실패') }
  }

  // ── 통계 ──
  const trueCount = list.filter((c) => c.kind === 'true').length
  const herringCount = list.filter((c) => c.kind === 'herring').length
  const unrecovered = list.filter((c) => !c.recovered)
  // 진짜 단서가 하나라도 결말 전에 독자에게 제시되었는지(공정성 핵심 t1)
  const trueClues = list.filter((c) => c.kind === 'true')
  const fairTruePresented = trueClues.some((c) => c.checks['t1'])
  const fairTrueAllPresented = trueClues.length > 0 && trueClues.every((c) => c.checks['t1'])

  // ── 내보내기 텍스트 ──
  function clueToText(c: Clue): string {
    const d = kindDef(c.kind)
    const lines = [
      `[${d.label}] ${c.title}`,
      `  · 챕터: ${c.chapter || '—'} / 제시: ${c.channel}`,
      `  · 심은 곳: ${c.plantedBy || '—'}`,
      `  · 가리키는 곳: ${c.pointsTo || '—'}`,
      `  · 회수: ${c.recovered ? `✔ (${c.recoverChapter || '챕터 미지정'})` : '✘ 미회수'}`,
    ]
    if (c.detail.trim()) lines.push(`  · 메모: ${c.detail.trim()}`)
    const checked = fairFor(c.kind).filter((q) => c.checks[q.id])
    if (checked.length) lines.push(`  · 공정성 점검 ${checked.length}/${fairFor(c.kind).length}`)
    return lines.join('\n')
  }
  function exportAll(): string {
    const ordered = [...list].sort((a, b) => chapterWeight(a.chapter) - chapterWeight(b.chapter))
    const head = `# 단서·레드헤링 배치표\n진짜 단서 ${trueCount} · 레드헤링 ${herringCount} · 미회수 ${unrecovered.length}\n`
    return head + '\n' + ordered.map(clueToText).join('\n\n')
  }

  // ── 프로젝트 본문(HTML) ──
  function bodyHtml(): string {
    const ordered = [...list].sort((a, b) => chapterWeight(a.chapter) - chapterWeight(b.chapter))
    const dash = '<span style="color:#888">—</span>'
    const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
    const parts: string[] = []
    parts.push(`<p><b>단서 ${list.length}개</b> — 진짜 ${trueCount} · 레드헤링 ${herringCount} · 미회수 ${unrecovered.length}</p>`)
    ordered.forEach((c) => {
      const d = kindDef(c.kind)
      const checked = fairFor(c.kind).filter((q) => c.checks[q.id]).length
      parts.push(
        `<p><b>${escHtml(d.icon)} [${escHtml(d.label)}] ${v(c.title)}</b><br>` +
        `챕터: ${v(c.chapter)} · 제시: ${escHtml(c.channel)}<br>` +
        `심은 곳: ${v(c.plantedBy)}<br>` +
        `가리키는 곳: ${v(c.pointsTo)}<br>` +
        `회수: ${c.recovered ? `✔ ${v(c.recoverChapter)}` : '✘ 미회수'}` +
        (c.detail.trim() ? `<br>메모: ${escHtml(c.detail.trim())}` : '') +
        (checked ? `<br>공정성 점검 ${checked}/${fairFor(c.kind).length}` : '') +
        `</p>`,
      )
    })
    if (unrecovered.length) {
      parts.push(`<p><b>⚠ 미회수 단서 ${unrecovered.length}개</b>: ${unrecovered.map((c) => escHtml(c.title)).join(', ')}</p>`)
    }
    return parts.join('')
  }

  // 프로젝트 연동 — '사건' 폴더에 단서 배치표 문서를 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    if (!list.length) { if (mounted.current) setCopied('먼저 단서를 추가해 주세요'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: '단서·레드헤링 배치표',
      bodyHtml: bodyHtml(),
      synopsis: `진짜 ${trueCount} · 레드헤링 ${herringCount} · 미회수 ${unrecovered.length}`,
      meta: { 진짜단서: String(trueCount), 레드헤링: String(herringCount), 미회수: String(unrecovered.length) },
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료(사건)에 배치표 추가됨' : '프로젝트 추가에 실패했어요')
  }

  // ── 표시용 정렬·필터 ──
  const filtered = list.filter((c) => {
    if (filter === 'all') return true
    if (filter === 'unrecovered') return !c.recovered
    return c.kind === filter
  })

  const opened = openId ? list.find((c) => c.id === openId) || null : null
  const linked = hasProjectBridge()

  // ── 타임라인 그룹 ──
  const timelineGroups = (() => {
    const m = new Map<string, Clue[]>()
    for (const c of filtered) {
      const key = c.chapter.trim() || '(챕터 미지정)'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(c)
    }
    return [...m.entries()].sort((a, b) => chapterWeight(a[0]) - chapterWeight(b[0]))
  })()

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 12 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }
  const pill = (on: boolean, color = 'var(--accent)'): React.CSSProperties => ({
    borderColor: on ? color : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)',
    background: on ? 'var(--chrome-2)' : undefined,
  })

  const ClueRow = (c: Clue, i: number) => {
    const d = kindDef(c.kind)
    const active = c.id === openId || (editing && editing.id === c.id)
    const idxInList = list.findIndex((x) => x.id === c.id)
    return (
      <div
        key={c.id}
        onClick={() => { setEditing(null); setOpenId(c.id); setConfirmDel(null) }}
        style={{
          border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
          background: active ? 'var(--chrome-2)' : 'var(--panel)',
          borderLeft: `3px solid ${d.color}`,
          borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span title={d.label} style={{ fontSize: 12 }}><Emoji e={d.icon} /></span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || '(제목 없음)'}</span>
          <span style={{ fontSize: 11, color: c.recovered ? 'var(--ok)' : 'var(--warn)', whiteSpace: 'nowrap' }} title={c.recovered ? '회수됨' : '미회수'}>
            {c.recovered ? '✔회수' : '✘미회수'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span><Emoji e="📖" /> {c.chapter || '챕터 미지정'}</span>
          <span>·</span>
          <span>{c.channel}</span>
          {c.pointsTo.trim() && (<><span>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>→ {c.pointsTo}</span></>)}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, -1) }} disabled={idxInList <= 0} title="위로">▲</button>
          <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, 1) }} disabled={idxInList >= list.length - 1} title="아래로">▼</button>
          <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); toggleRecovered(c.id) }} title="회수 표시 토글">{c.recovered ? '↩ 회수취소' : '✔ 회수'}</button>
          <span style={{ flex: 1 }} />
          <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(c) }} title="수정"><Emoji e="✏️" /></button>
          <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(c.id) }} title="삭제"><Emoji e="🗑️" /></button>
        </div>
        {confirmDel === c.id && (
          <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
            <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 단서를 삭제할까요?</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(c.id) }}>삭제</button>
              <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🔍" /></span>
        <strong style={{ fontSize: 15 }}>단서·레드헤링 배치기</strong>
        <span style={{ color: 'var(--ok)', fontSize: 12 }}><Emoji e="🟢" /> {trueCount}</span>
        <span style={{ color: 'var(--warn)', fontSize: 12 }}><Emoji e="🔴" /> {herringCount}</span>
        <span style={{ color: unrecovered.length ? 'var(--warn)' : 'var(--muted)', fontSize: 12 }}>미회수 {unrecovered.length}</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={!list.length} title="전체 배치표를 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 단서</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 보기 전환 + 필터 + 목록/타임라인 */}
        <div style={sidebar}>
          <div style={{ display: 'flex', gap: 6, padding: '8px 8px 0', flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => setView('list')} aria-pressed={view === 'list'} style={pill(view === 'list')}>목록</button>
            <button className="minibtn" onClick={() => setView('timeline')} aria-pressed={view === 'timeline'} style={pill(view === 'timeline')}><Emoji e="📖" /> 챕터순</button>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '6px 8px 0', flexWrap: 'wrap' }}>
            <button className="minibtn" style={{ ...pill(filter === 'all'), padding: '2px 8px', fontSize: 11 }} onClick={() => setFilter('all')}>전체</button>
            <button className="minibtn" style={{ ...pill(filter === 'true', 'var(--ok)'), padding: '2px 8px', fontSize: 11 }} onClick={() => setFilter('true')}><Emoji e="🟢" /> 진짜</button>
            <button className="minibtn" style={{ ...pill(filter === 'herring', 'var(--warn)'), padding: '2px 8px', fontSize: 11 }} onClick={() => setFilter('herring')}><Emoji e="🔴" /> 거짓</button>
            <button className="minibtn" style={{ ...pill(filter === 'unrecovered', 'var(--warn)'), padding: '2px 8px', fontSize: 11 }} onClick={() => setFilter('unrecovered')}>✘ 미회수</button>
          </div>

          {list.length === 0 ? (
            <div style={empty}>
              아직 배치한 단서가 없어요.<br />오른쪽 위 <b>＋ 새 단서</b>로<br />첫 단서를 심어 보세요.
              <br /><br /><span style={{ fontSize: 11 }}>진짜 단서와 레드헤링을<br />챕터별로 배치하고<br />회수를 추적합니다.</span>
            </div>
          ) : view === 'list' ? (
            <div style={listArea}>
              {filtered.length === 0
                ? <div style={{ ...empty, padding: 12 }}>이 필터에 해당하는 단서가 없어요.</div>
                : filtered.map((c, i) => ClueRow(c, i))}
            </div>
          ) : (
            <div style={listArea}>
              {timelineGroups.length === 0
                ? <div style={{ ...empty, padding: 12 }}>표시할 단서가 없어요.</div>
                : timelineGroups.map(([chap, clues]) => (
                  <div key={chap}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', padding: '4px 2px', position: 'sticky', top: 0, background: 'var(--panel)' }}><Emoji e="📖" /> {chap} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({clues.length})</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                      {clues.map((c, i) => ClueRow(c, i))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 메인: 폼(신규/수정) 또는 상세 또는 공정성 대시보드 */}
        <div style={main}>
          {editing ? (
            <FormView
              editing={editing} setEditing={setEditing}
              field={field} label={label} input={input} area={area}
              toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit}
            />
          ) : opened ? (
            <DetailView c={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} toggleRecovered={() => toggleRecovered(opened.id)} copyText={copyText} clueToText={clueToText} label={label} />
          ) : (
            <FairDashboard
              genreCtx={genreCtx}
              trueCount={trueCount} herringCount={herringCount}
              unrecovered={unrecovered} trueClues={trueClues}
              fairTruePresented={fairTruePresented} fairTrueAllPresented={fairTrueAllPresented}
              onOpen={(id) => { setOpenId(id); setEditing(null) }}
              onNew={startNew}
            />
          )}
        </div>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ flexShrink: 0, padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!linked || !list.length}
          title={!linked ? '프로젝트에 연결되어 있지 않습니다' : !list.length ? '먼저 단서를 추가해 주세요' : '단서 배치표를 프로젝트 자료(사건 폴더)에 문서로 추가'}
        ><Emoji e="📄" /> 프로젝트에 추가 (사건)</button>
      </div>
    </div>
  )
}

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Clue; setEditing: (c: Clue) => void
  field: React.CSSProperties; label: React.CSSProperties; input: React.CSSProperties; area: React.CSSProperties
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, field, label, input, area, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof Clue, v: any) => setEditing({ ...editing, [k]: v })
  const d = kindDef(editing.kind)
  const fairQ = fairFor(editing.kind)
  const checkedCnt = fairQ.filter((q) => editing.checks[q.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '단서 수정' : '새 단서 배치'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={field}>
        <div style={label}>단서 한 줄</div>
        <input style={input} value={editing.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 피해자 손에 쥔 찢어진 기차표" maxLength={120} autoFocus />
      </div>

      <div style={field}>
        <div style={label}>유형</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {KINDS.map((k) => (
            <button key={k.key} className="minibtn"
              onClick={() => set('kind', k.key)}
              style={{ borderColor: editing.kind === k.key ? k.color : 'var(--border)', background: editing.kind === k.key ? 'var(--chrome-2)' : undefined, flex: 1 }}
              title={k.hint}
            ><Emoji e={k.icon} /> {k.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e={d.icon} /> {d.hint}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, ...field }}>
        <div style={{ flex: 1 }}>
          <div style={label}><Emoji e="📖" /> 심은 챕터/장면</div>
          <input style={input} value={editing.chapter} onChange={(e) => set('chapter', e.target.value)} placeholder="예: 3장 / 프롤로그" maxLength={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={label}>제시 방식</div>
          <select style={{ ...input, cursor: 'pointer' }} value={editing.channel} onChange={(e) => set('channel', e.target.value)}>
            {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🪤" /> 누가/무엇이 흘렸나 (심은 출처)</div>
        <input style={input} value={editing.plantedBy} onChange={(e) => set('plantedBy', e.target.value)} placeholder="예: 집사의 어긋난 증언 / 현장에 남은 진흙 자국" maxLength={120} />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🎯" /> 무엇을 가리키나 {editing.kind === 'true' ? '(진상·범인)' : '(오인 대상 — 엉뚱한 용의자)'}</div>
        <input style={input} value={editing.pointsTo} onChange={(e) => set('pointsTo', e.target.value)} placeholder={editing.kind === 'true' ? '예: 진범의 왼손잡이 습관' : '예: 무고한 조카에게 의심이 쏠림'} maxLength={120} />
      </div>

      <div style={field}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (editing.recovered ? 'var(--ok)' : 'var(--border)'), background: editing.recovered ? 'var(--chrome-2)' : 'var(--panel)' }}>
          <input type="checkbox" checked={editing.recovered} onChange={() => set('recovered', !editing.recovered)} style={{ width: 16, height: 16, accentColor: 'var(--ok)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>이 단서를 회수(payoff)했다</span>
        </label>
        {editing.recovered && (
          <div style={{ marginTop: 8 }}>
            <div style={label}>회수 챕터</div>
            <input style={input} value={editing.recoverChapter} onChange={(e) => set('recoverChapter', e.target.value)} placeholder="예: 12장 (탐정의 추리에서 해명)" maxLength={40} />
          </div>
        )}
      </div>

      <div style={field}>
        <div style={label}>상세 메모 (선택)</div>
        <textarea style={area} value={editing.detail} onChange={(e) => set('detail', e.target.value)} placeholder="이 단서를 어떻게 심고/감추고/회수할지, 독자 오인을 어떻게 유도할지 등" maxLength={600} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="⚖️" /> 공정한 단서(fair-play) 점검 — {d.label}</span>
          <span style={{ fontSize: 11, color: checkedCnt === fairQ.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{fairQ.length}</span>
        </div>
        <CheckList items={fairQ} checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  c: Clue; onEdit: () => void; toggleCheck: (qid: string) => void; toggleRecovered: () => void
  copyText: (t: string, label?: string) => void; clueToText: (c: Clue) => string; label: React.CSSProperties
}) {
  const { c, onEdit, toggleCheck, toggleRecovered, copyText, clueToText, label } = props
  const d = kindDef(c.kind)
  const fairQ = fairFor(c.kind)
  const checkedCnt = fairQ.filter((q) => c.checks[q.id]).length
  const rowS: React.CSSProperties = { marginBottom: 10 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const muted = <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}><Emoji e={d.icon} /></span>
        <strong style={{ fontSize: 15 }}>{c.title}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(clueToText(c), '복사됨')} title="이 단서를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${d.color}`, color: d.color, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
        <Emoji e={d.icon} /> {d.label}
      </div>

      <div style={rowS}><div style={label}><Emoji e="📖" /> 심은 챕터/장면</div><div style={valS}>{c.chapter || muted} <span style={{ color: 'var(--muted)' }}>· {c.channel}</span></div></div>
      <div style={rowS}><div style={label}><Emoji e="🪤" /> 심은 출처</div><div style={valS}>{c.plantedBy || muted}</div></div>
      <div style={rowS}><div style={label}><Emoji e="🎯" /> 가리키는 곳 {c.kind === 'true' ? '(진상)' : '(오인 대상)'}</div><div style={valS}>{c.pointsTo || muted}</div></div>

      <div style={{ ...rowS, padding: 10, borderRadius: 9, border: '1px solid ' + (c.recovered ? 'var(--ok)' : 'var(--warn)'), background: 'var(--chrome-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.recovered ? 'var(--ok)' : 'var(--warn)' }}>{c.recovered ? '✔ 회수됨' : '✘ 미회수'}</span>
          {c.recovered && c.recoverChapter && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {c.recoverChapter}</span>}
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={toggleRecovered}>{c.recovered ? '↩ 회수 취소' : '✔ 회수 표시'}</button>
        </div>
        {!c.recovered && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6, lineHeight: 1.5 }}>심은 단서는 반드시 어디선가 회수(해명·결정타)되어야 합니다. 체호프의 총 — 걸어둔 총은 발사돼야 합니다.</div>}
      </div>

      {c.detail.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 메모</div><div style={valS}>{c.detail}</div></div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="⚖️" /> 공정한 단서 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === fairQ.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{fairQ.length}</span>
        </div>
        <CheckList items={fairQ} checks={c.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          망설여지는 항목이 곧 공정성이 흔들리는 지점입니다. 독자가 "속았다"가 아니라 "내가 놓쳤다"고 느끼게 하세요.
        </div>
      </div>
    </div>
  )
}

// ── 공정성 대시보드(선택 없음 상태) ──
function FairDashboard(props: {
  genreCtx: string
  trueCount: number; herringCount: number
  unrecovered: Clue[]; trueClues: Clue[]
  fairTruePresented: boolean; fairTrueAllPresented: boolean
  onOpen: (id: string) => void; onNew: () => void
}) {
  const { genreCtx, trueCount, herringCount, unrecovered, trueClues, fairTruePresented, fairTrueAllPresented, onNew } = props
  const total = trueCount + herringCount

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--muted)', gap: 12 }}>
        <div style={{ fontSize: 44 }}><Emoji e="🔍" /></div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>단서·레드헤링 배치기</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.7, maxWidth: 380 }}>
          진짜 단서(<Emoji e="🟢" />)와 거짓 단서(<Emoji e="🔴" /> 레드헤링)를 챕터별로 심고,<br />
          <b>공정한 단서(fair-play)</b> 원칙을 점검하세요.<br />
          심은 단서는 어디서 <b>회수</b>했는지 추적해 빠뜨림을 막습니다.
          {genreCtx === '미스터리·추리' && <><br /><span style={{ color: 'var(--accent)' }}>의외의 범인은 공정한 단서 위에서만 빛납니다.</span></>}
        </div>
        <button className="btn-primary" onClick={onNew}>＋ 첫 단서 심기</button>
      </div>
    )
  }

  const Stat = ({ icon, n, label, color }: { icon: string; n: number; label: string; color: string }) => (
    <div style={{ flex: 1, minWidth: 90, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--chrome-2)', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}><Emoji e={icon} /> {n}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )

  // 공정성 신호등
  const fairItems: { ok: boolean; warn: boolean; text: string }[] = [
    { ok: trueCount > 0, warn: trueCount === 0, text: trueCount > 0 ? `진짜 단서가 ${trueCount}개 심어져 있습니다.` : '진짜 단서가 하나도 없습니다 — 추리가 성립하려면 진상을 가리키는 단서가 필요합니다.' },
    { ok: fairTrueAllPresented, warn: !fairTruePresented && trueCount > 0, text: fairTrueAllPresented ? '모든 진짜 단서가 결말 전 독자에게 제시됩니다(공정).' : fairTruePresented ? '일부 진짜 단서만 결말 전에 제시 표시됨 — 나머지도 점검하세요.' : trueCount > 0 ? '진짜 단서의 "결말 전 제시" 점검이 비어 있습니다(t1).' : '진짜 단서를 추가하면 제시 여부를 점검할 수 있습니다.' },
    { ok: herringCount > 0, warn: false, text: herringCount > 0 ? `레드헤링 ${herringCount}개로 독자의 의심을 분산합니다.` : '레드헤링이 없습니다 — 진상이 너무 빨리 드러날 수 있습니다(선택).' },
    { ok: unrecovered.length === 0, warn: unrecovered.length > 0, text: unrecovered.length === 0 ? '모든 단서가 회수되었습니다 — 미회수 복선 없음.' : `미회수 단서 ${unrecovered.length}개 — 심어두고 회수하지 않으면 독자가 허탈해집니다.` },
  ]

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}><Emoji e="⚖️" /> 공정성 대시보드</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat icon="🟢" n={trueCount} label="진짜 단서" color="var(--ok)" />
        <Stat icon="🔴" n={herringCount} label="레드헤링" color="var(--warn)" />
        <Stat icon="✘" n={unrecovered.length} label="미회수" color={unrecovered.length ? 'var(--warn)' : 'var(--muted)'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
        {fairItems.map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 9,
            border: '1px solid ' + (it.ok ? 'var(--ok)' : it.warn ? 'var(--warn)' : 'var(--border)'),
            background: 'var(--panel)',
          }}>
            <span style={{ fontSize: 14 }}><Emoji e={it.ok ? '✅' : it.warn ? '⚠️' : 'ℹ️'} /></span>
            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: it.ok ? 'var(--text)' : it.warn ? 'var(--warn)' : 'var(--muted)' }}>{it.text}</span>
          </div>
        ))}
      </div>

      {unrecovered.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)', marginBottom: 6 }}><Emoji e="⚠" /> 회수되지 않은 단서</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {unrecovered.map((c) => (
              <button key={c.id} className="minibtn" onClick={() => props.onOpen(c.id)}
                style={{ textAlign: 'left', justifyContent: 'flex-start', borderColor: 'var(--warn)' }}>
                <Emoji e={kindDef(c.kind).icon} /> {c.title} <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {c.chapter || '챕터 미지정'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <b>공정한 단서(fair-play)의 핵심</b>: 독자는 탐정과 같은 정보를 같은 시점에 받아야 합니다.
        진짜 단서는 결말 전에 제시하되 레드헤링·서술로 가리고, 모든 단서는 결국 회수하세요.
        왼쪽 목록·챕터순 보기에서 단서를 골라 상세를 점검할 수 있습니다.
      </div>
    </div>
  )
}

// ── 공통 체크리스트 ──
function CheckList(props: { items: { id: string; q: string }[]; checks: Record<string, boolean>; toggle: (qid: string) => void }) {
  const { items, checks, toggle } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((q) => {
        const on = !!checks[q.id]
        return (
          <label key={q.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid ' + (on ? 'var(--ok)' : 'var(--border)'),
            background: on ? 'var(--chrome-2)' : 'var(--panel)',
          }}>
            <input type="checkbox" checked={on} onChange={() => toggle(q.id)} style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: 'var(--ok)', cursor: 'pointer' }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--muted)' }}>{q.q}</span>
          </label>
        )
      })}
    </div>
  )
}
