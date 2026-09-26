// 시리즈 설정집 — 다권(多卷) 작품의 권(book) 단위 연속성·떡밥·핵심 사건을 한곳에서 관리하는 시리즈 바이블.
// 좌측: 권 목록(선택·추가·순서 이동·삭제). 우측: 선택 권 편집
//   ─ 한 줄 요약 / 부제·상태 / 핵심 사건(번호순) / 떡밥(심은 곳·회수 예정 권·상태) / 연속성 메모(분류별).
// 추가로 "떡밥 보드"(전 권 떡밥을 회수 상태별로 모아 보는 교차 시점) 제공 — 시리즈 전체에서 미회수 떡밥을 놓치지 않게.
// 모든 데이터는 localStorage('sry:tool:series-bible')에 JSON으로 자동 저장/복원. 빈 상태 안내 포함.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'series-bible', name: '시리즈 설정집', icon: '📚', group: '구상·정리', intro: '권(book)별 한 줄 요약·핵심 사건·떡밥(심은 것/회수 예정)·연속성 메모를 관리하는 시리즈 바이블', w: 720, h: 660 }

const LS_KEY = 'sry:tool:series-bible'

// 권 상태(집필 단계)
const BOOK_STATUS = ['구상', '집필 중', '초고', '퇴고', '완료', '출간'] as const
type BookStatus = (typeof BOOK_STATUS)[number]

// 떡밥(복선) 상태
const THREAD_STATUS = ['심음', '진행 중', '회수됨', '폐기'] as const
type ThreadStatus = (typeof THREAD_STATUS)[number]
const THREAD_STATUS_META: Record<ThreadStatus, { icon: string; color: string }> = {
  '심음': { icon: '🌱', color: 'var(--muted)' },
  '진행 중': { icon: '🔄', color: 'var(--accent)' },
  '회수됨': { icon: '✅', color: 'var(--ok)' },
  '폐기': { icon: '🗑️', color: 'var(--warn)' },
}

// 연속성 메모 분류
const NOTE_CATS = ['설정', '인물', '연표', '세계관', '기타'] as const
type NoteCat = (typeof NOTE_CATS)[number]
const NOTE_CAT_ICON: Record<NoteCat, string> = { '설정': '⚙️', '인물': '👤', '연표': '🗓️', '세계관': '🌍', '기타': '📌' }

interface Thread {
  id: string
  text: string            // 떡밥 내용(심은 단서)
  planted: string         // 심은 곳(장/장면 등 자유 메모)
  payoffBook: string      // 회수 예정 권 — 권 id 또는 '' (미정/외부)
  status: ThreadStatus
}

interface ContNote {
  id: string
  cat: NoteCat
  text: string
}

interface Book {
  id: string
  title: string           // 권 제목/번호 (예: "1권 — 새벽의 검")
  status: BookStatus
  logline: string         // 한 줄 요약
  events: string[]        // 핵심 사건(순서)
  threads: Thread[]       // 이 권에서 다루는 떡밥
  notes: ContNote[]       // 연속성 메모
  updatedAt: number
}

interface Store {
  seriesTitle: string
  books: Book[]
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function makeBook(title = ''): Book {
  return { id: newId(), title, status: BOOK_STATUS[0], logline: '', events: [], threads: [], notes: [], updatedAt: Date.now() }
}

function makeThread(): Thread {
  return { id: newId(), text: '', planted: '', payoffBook: '', status: '심음' }
}

// HTML escape(프로젝트 추가 시 bodyHtml 안전)
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const emptyStore = (): Store => ({ seriesTitle: '', books: [] })

// localStorage 복원 — 미지원/차단/손상 시 빈 상태로 graceful 처리. 누락 필드 기본값 보강.
function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyStore()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyStore()
    const books: Book[] = Array.isArray(p.books)
      ? p.books.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
          id: String(x.id || newId()),
          title: typeof x.title === 'string' ? x.title : '',
          status: (BOOK_STATUS as readonly string[]).includes(x.status) ? x.status : BOOK_STATUS[0],
          logline: typeof x.logline === 'string' ? x.logline : '',
          events: Array.isArray(x.events) ? x.events.filter((e: any) => typeof e === 'string') : [],
          threads: Array.isArray(x.threads)
            ? x.threads.filter((t: any) => t && typeof t === 'object').map((t: any) => ({
                id: String(t.id || newId()),
                text: typeof t.text === 'string' ? t.text : '',
                planted: typeof t.planted === 'string' ? t.planted : '',
                payoffBook: typeof t.payoffBook === 'string' ? t.payoffBook : '',
                status: (THREAD_STATUS as readonly string[]).includes(t.status) ? t.status : '심음',
              } as Thread))
            : [],
          notes: Array.isArray(x.notes)
            ? x.notes.filter((n: any) => n && typeof n === 'object').map((n: any) => ({
                id: String(n.id || newId()),
                cat: (NOTE_CATS as readonly string[]).includes(n.cat) ? n.cat : '기타',
                text: typeof n.text === 'string' ? n.text : '',
              } as ContNote))
            : [],
          updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
        } as Book))
      : []
    return { seriesTitle: typeof p.seriesTitle === 'string' ? p.seriesTitle : '', books }
  } catch {
    return emptyStore()
  }
}

// 권 번호 라벨(목록·셀렉트용) — 제목 없으면 "n권"
function bookLabel(b: Book, idx: number): string {
  return (b.title || '').trim() || `${idx + 1}권`
}

// 한 권을 텍스트로 직렬화(복사·내보내기)
function bookToText(b: Book, idx: number, books: Book[]): string {
  const L: string[] = []
  L.push(`# ${bookLabel(b, idx)}`)
  L.push(`상태: ${b.status}`)
  if (b.logline.trim()) L.push(`\n[한 줄 요약]\n${b.logline.trim()}`)
  const evs = b.events.filter((e) => e.trim())
  if (evs.length) L.push(`\n[핵심 사건]\n${evs.map((e, i) => `${i + 1}. ${e.trim()}`).join('\n')}`)
  const th = b.threads.filter((t) => t.text.trim())
  if (th.length) {
    L.push('\n[떡밥·복선]')
    th.forEach((t) => {
      const payoff = payoffLabel(t.payoffBook, books)
      const meta = [t.planted.trim() ? `심은 곳: ${t.planted.trim()}` : '', payoff ? `회수 예정: ${payoff}` : '', `상태: ${t.status}`].filter(Boolean).join(' · ')
      L.push(`- ${t.text.trim()}${meta ? `\n  (${meta})` : ''}`)
    })
  }
  const nt = b.notes.filter((n) => n.text.trim())
  if (nt.length) {
    L.push('\n[연속성 메모]')
    nt.forEach((n) => L.push(`- [${n.cat}] ${n.text.trim()}`))
  }
  return L.join('\n')
}

// 회수 예정 권 라벨 해석(권 id → "n권 제목", 미정/외부 처리)
function payoffLabel(payoffBook: string, books: Book[]): string {
  if (!payoffBook) return ''
  if (payoffBook === '__later__') return '이후 권(미정)'
  const i = books.findIndex((b) => b.id === payoffBook)
  return i >= 0 ? bookLabel(books[i], i) : ''
}

export default function SeriesBible({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [selectedId, setSelectedId] = useState<string>(() => {
    const init = loadStore()
    return init.books.length ? init.books[0].id : ''
  })
  const [confirmDel, setConfirmDel] = useState('')   // 삭제 확인 대기 권 id
  const [eventDraft, setEventDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [noteCat, setNoteCat] = useState<NoteCat>('설정')
  const [view, setView] = useState<'book' | 'threads'>('book') // 우측 모드: 권 편집 / 떡밥 보드
  const [threadFilter, setThreadFilter] = useState<'전체' | ThreadStatus>('전체')
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)

  const { books } = store
  const selected = books.find((b) => b.id === selectedId) || null

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // 선택 권이 사라지면 첫 권으로 보정.
  useEffect(() => {
    if (selectedId && !books.some((b) => b.id === selectedId)) {
      setSelectedId(books.length ? books[0].id : '')
    }
    setConfirmDel('')
    setEventDraft('')
    setNoteDraft('')
  }, [selectedId, books])

  // payload.title 들어오면 (다른 도구가 제목과 함께 열어준 경우) — 새 권으로 1회 추가.
  useEffect(() => {
    if (payloadDone.current) return
    const t = payload && typeof payload.title === 'string' ? (payload.title as string).trim() : ''
    const logline = payload && typeof payload.logline === 'string' ? (payload.logline as string) : (payload && typeof payload.query === 'string' ? (payload.query as string) : '')
    if (!t && !logline) return
    payloadDone.current = true
    const nb = makeBook(t)
    if (logline) nb.logline = logline
    setStore((prev) => ({ ...prev, books: [...prev.books, nb] }))
    if (mounted.current) { setSelectedId(nb.id); setView('book') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (msg: string) => {
    setCopied(msg)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1700)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch {
      flash('복사에 실패했어요. 직접 선택해 복사하세요.')
    }
  }

  // ── 권 CRUD ──
  const addBook = () => {
    const b = makeBook()
    setStore((prev) => ({ ...prev, books: [...prev.books, b] }))
    setSelectedId(b.id)
    setView('book')
  }

  const patchBook = (id: string, fields: Partial<Book>) => {
    setStore((prev) => ({ ...prev, books: prev.books.map((b) => (b.id === id ? { ...b, ...fields, updatedAt: Date.now() } : b)) }))
  }

  const removeBook = (id: string) => {
    setStore((prev) => {
      // 삭제되는 권을 회수 예정으로 가리키던 떡밥은 '미정'으로 정리(댕글링 참조 방지)
      const books = prev.books
        .filter((b) => b.id !== id)
        .map((b) => ({ ...b, threads: b.threads.map((t) => (t.payoffBook === id ? { ...t, payoffBook: '__later__' } : t)) }))
      return { ...prev, books }
    })
  }

  const moveBook = (id: string, dir: -1 | 1) => {
    setStore((prev) => {
      const i = prev.books.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.books.length) return prev
      const next = prev.books.slice()
      const tmp = next[i]; next[i] = next[j]; next[j] = tmp
      return { ...prev, books: next }
    })
  }

  // ── 핵심 사건 ──
  const addEvent = () => {
    if (!selected) return
    const t = eventDraft.trim()
    if (!t) return
    patchBook(selected.id, { events: [...selected.events, t] })
    setEventDraft('')
  }
  const editEvent = (idx: number, value: string) => {
    if (!selected) return
    const next = selected.events.slice(); next[idx] = value
    patchBook(selected.id, { events: next })
  }
  const removeEvent = (idx: number) => {
    if (!selected) return
    patchBook(selected.id, { events: selected.events.filter((_, i) => i !== idx) })
  }
  const moveEvent = (idx: number, dir: -1 | 1) => {
    if (!selected) return
    const j = idx + dir
    if (j < 0 || j >= selected.events.length) return
    const next = selected.events.slice()
    const tmp = next[idx]; next[idx] = next[j]; next[j] = tmp
    patchBook(selected.id, { events: next })
  }

  // ── 떡밥 ──
  const addThread = () => {
    if (!selected) return
    patchBook(selected.id, { threads: [...selected.threads, makeThread()] })
  }
  const patchThread = (tid: string, fields: Partial<Thread>) => {
    if (!selected) return
    patchBook(selected.id, { threads: selected.threads.map((t) => (t.id === tid ? { ...t, ...fields } : t)) })
  }
  const removeThread = (tid: string) => {
    if (!selected) return
    patchBook(selected.id, { threads: selected.threads.filter((t) => t.id !== tid) })
  }

  // ── 연속성 메모 ──
  const addNote = () => {
    if (!selected) return
    const t = noteDraft.trim()
    if (!t) return
    patchBook(selected.id, { notes: [...selected.notes, { id: newId(), cat: noteCat, text: t }] })
    setNoteDraft('')
  }
  const patchNote = (nid: string, fields: Partial<ContNote>) => {
    if (!selected) return
    patchBook(selected.id, { notes: selected.notes.map((n) => (n.id === nid ? { ...n, ...fields } : n)) })
  }
  const removeNote = (nid: string) => {
    if (!selected) return
    patchBook(selected.id, { notes: selected.notes.filter((n) => n.id !== nid) })
  }

  // ── 내보내기/복사 ──
  const copyBook = () => {
    if (!selected) return
    const idx = books.findIndex((b) => b.id === selected.id)
    copyText(bookToText(selected, idx, books), '이 권을 복사했어요')
  }
  const exportAll = () => {
    if (!books.length) return
    const head = store.seriesTitle.trim() ? `《${store.seriesTitle.trim()}》 시리즈 설정집\n` + '='.repeat(28) + '\n\n' : ''
    const body = books.map((b, i) => bookToText(b, i, books)).join('\n\n' + '─'.repeat(28) + '\n\n')
    copyText(head + body, `전체 ${books.length}권을 복사했어요`)
  }

  // ── 연계: 프로젝트 바인더에 추가 ──
  // 현재 권을 한 문서로 프로젝트(자료 › 시리즈 설정집/<시리즈명>)에 추가.
  const bookToHtml = (b: Book, idx: number): string => {
    const parts: string[] = []
    if (b.logline.trim()) parts.push(`<p><b>한 줄 요약</b><br/>${escHtml(b.logline.trim())}</p>`)
    const evs = b.events.filter((e) => e.trim())
    if (evs.length) parts.push(`<p><b>핵심 사건</b></p><ol>${evs.map((e) => `<li>${escHtml(e.trim())}</li>`).join('')}</ol>`)
    const th = b.threads.filter((t) => t.text.trim())
    if (th.length) {
      parts.push('<p><b>떡밥·복선</b></p><ul>' + th.map((t) => {
        const sm = THREAD_STATUS_META[t.status]
        const extra = [t.planted.trim() ? `심은 곳: ${escHtml(t.planted.trim())}` : '', payoffLabel(t.payoffBook, books) ? `회수 예정: ${escHtml(payoffLabel(t.payoffBook, books))}` : ''].filter(Boolean).join(' · ')
        return `<li>${sm.icon} ${escHtml(t.text.trim())} <span style="color:#888;">[${escHtml(t.status)}]</span>${extra ? `<br/><span style="color:#888;font-size:90%;">${extra}</span>` : ''}</li>`
      }).join('') + '</ul>')
    }
    const nt = b.notes.filter((n) => n.text.trim())
    if (nt.length) {
      parts.push('<p><b>연속성 메모</b></p><ul>' + nt.map((n) => `<li>${NOTE_CAT_ICON[n.cat]} <b>[${escHtml(n.cat)}]</b> ${escHtml(n.text.trim())}</li>`).join('') + '</ul>')
    }
    if (!parts.length) parts.push('<p style="color:#888;">(내용 없음)</p>')
    return `<p style="color:#888;">상태: ${escHtml(b.status)}</p>` + parts.join('')
  }

  const addBookToProject = () => {
    if (!selected || !hasProjectBridge()) return
    const idx = books.findIndex((b) => b.id === selected.id)
    const title = bookLabel(selected, idx)
    const folder = store.seriesTitle.trim() ? `시리즈 설정집/${store.seriesTitle.trim()}` : '시리즈 설정집'
    const meta: Record<string, string> = { 권: title, 상태: selected.status }
    if (selected.events.filter((e) => e.trim()).length) meta['핵심 사건'] = String(selected.events.filter((e) => e.trim()).length)
    const openTh = selected.threads.filter((t) => t.text.trim() && (t.status === '심음' || t.status === '진행 중')).length
    if (selected.threads.filter((t) => t.text.trim()).length) meta['미회수 떡밥'] = String(openTh)
    const id = addToProject({
      kind: 'text', root: 'research', folder,
      title,
      bodyHtml: bookToHtml(selected, idx),
      meta,
    })
    if (id) flash(`〈${folder}〉에 이 권을 추가했어요`)
    else flash('프로젝트 연동이 되어 있지 않아요')
  }

  // 전체 미회수 떡밥을 한 문서로 프로젝트에 추가
  const addThreadsToProject = () => {
    if (!hasProjectBridge()) return
    const rows: string[] = []
    books.forEach((b, i) => {
      b.threads.filter((t) => t.text.trim() && (t.status === '심음' || t.status === '진행 중')).forEach((t) => {
        const payoff = payoffLabel(t.payoffBook, books)
        rows.push(`<li><b>${escHtml(bookLabel(b, i))}</b> — ${THREAD_STATUS_META[t.status].icon} ${escHtml(t.text.trim())}${t.planted.trim() ? ` <span style="color:#888;">(심은 곳: ${escHtml(t.planted.trim())})</span>` : ''}${payoff ? ` <span style="color:#888;">→ 회수: ${escHtml(payoff)}</span>` : ''}</li>`)
      })
    })
    if (!rows.length) { flash('미회수 떡밥이 없어요'); return }
    const folder = store.seriesTitle.trim() ? `시리즈 설정집/${store.seriesTitle.trim()}` : '시리즈 설정집'
    const id = addToProject({
      kind: 'text', root: 'research', folder,
      title: `미회수 떡밥 정리 (${rows.length}개)`,
      bodyHtml: `<p>전 권에서 아직 회수되지 않은 떡밥·복선입니다.</p><ul>${rows.join('')}</ul>`,
      meta: { 분류: '떡밥 정리', 미회수: String(rows.length) },
    })
    if (id) flash(`미회수 떡밥 ${rows.length}개를 프로젝트에 추가했어요`)
  }

  // ── 드롭: 바인더 파일을 끌어다 놓으면 새 권으로 추가 ──
  const handleDropItem = (it: ReturnType<typeof getDragItem>) => {
    if (!it) return
    const title = (it.title || '').trim()
    const nb = makeBook(title)
    if (it.text) nb.logline = it.text.slice(0, 400).trim()
    setStore((prev) => ({ ...prev, books: [...prev.books, nb] }))
    setSelectedId(nb.id)
    setView('book')
    flash(`"${title || '문서'}"을(를) 새 권으로 추가했어요`)
  }

  // 전 권 떡밥 집계(떡밥 보드용)
  const allThreads = books.flatMap((b, i) =>
    b.threads.filter((t) => t.text.trim()).map((t) => ({ book: b, idx: i, thread: t })),
  )
  const threadCounts = THREAD_STATUS.reduce((acc, s) => { acc[s] = allThreads.filter((x) => x.thread.status === s).length; return acc }, {} as Record<ThreadStatus, number>)
  const filteredThreads = threadFilter === '전체' ? allThreads : allThreads.filter((x) => x.thread.status === threadFilter)

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const leftCol: React.CSSProperties = { width: 230, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const leftHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const editScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.55, fontFamily: 'inherit' }
  const small: React.CSSProperties = { padding: '6px 8px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', lineHeight: 1.7, padding: 24, gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }

  // 상태 배지(목록·셀렉트)
  const statusBadge = (s: BookStatus): React.CSSProperties => ({ fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px' })

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragEnter={(e) => { if (!isItemDrag(e)) return; e.preventDefault(); dragDepth.current++; setDropActive(true) }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) }}
      onDrop={(e) => { dragDepth.current = 0; setDropActive(false); const it = getDragItem(e); if (it) { e.preventDefault(); handleDropItem(it) } }}
    >
      <div style={head}>
        <span style={headTitle}><Emoji e="📚"/> 시리즈 설정집</span>
        <input
          style={{ ...small, flex: 1, minWidth: 80, maxWidth: 280 }}
          value={store.seriesTitle}
          onChange={(e) => setStore((prev) => ({ ...prev, seriesTitle: e.target.value }))}
          placeholder="시리즈 제목 (예: 새벽의 검 연대기)"
          aria-label="시리즈 제목"
          maxLength={80}
        />
        <span style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0 }}>{books.length}권</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)', whiteSpace: 'nowrap' }}>{copied}</span>}
        <button className="minibtn" onClick={exportAll} disabled={!books.length} title="시리즈 전체를 텍스트로 복사"><Emoji e="📋"/> 전체 내보내기</button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 좌측: 권 목록 */}
        <div style={leftCol}>
          <div style={leftHead}>
            <button className="btn-primary" onClick={addBook} style={{ width: '100%' }}>＋ 새 권</button>
            <button
              className="minibtn"
              onClick={() => setView((v) => (v === 'threads' ? 'book' : 'threads'))}
              style={{ width: '100%', borderColor: view === 'threads' ? 'var(--accent)' : 'var(--border)', color: view === 'threads' ? 'var(--accent)' : undefined }}
              title="전 권 떡밥을 회수 상태별로 모아 보기"
            >
              <Emoji e="🧵"/> 떡밥 보드{allThreads.length ? ` (${allThreads.length})` : ''}
            </button>
          </div>

          {books.length === 0 ? (
            <div style={{ ...emptyBox, padding: 16, fontSize: 13 }}>
              아직 권이 없어요.<br />위 <b>＋ 새 권</b>으로<br />첫 권을 만들어 보세요.
            </div>
          ) : (
            <div style={listWrap}>
              {books.map((b, idx) => {
                const active = view === 'book' && b.id === selectedId
                const openTh = b.threads.filter((t) => t.text.trim() && (t.status === '심음' || t.status === '진행 중')).length
                return (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedId(b.id); setView('book') }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 5,
                      boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{idx + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: b.title ? 'var(--text)' : 'var(--muted)' }}>
                        {b.title || `${idx + 1}권 (제목 없음)`}
                      </span>
                    </div>
                    {b.logline.trim() && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{b.logline.trim()}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={statusBadge(b.status)}>{b.status}</span>
                      {openTh > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }} title="미회수 떡밥"><Emoji e="🧵"/> {openTh}</span>}
                      <span style={{ flex: 1 }} />
                      <button style={tinyBtn} title="위로" disabled={idx <= 0} onClick={(e) => { e.stopPropagation(); moveBook(b.id, -1) }}>↑</button>
                      <button style={tinyBtn} title="아래로" disabled={idx >= books.length - 1} onClick={(e) => { e.stopPropagation(); moveBook(b.id, 1) }}>↓</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측 */}
        <div style={rightCol}>
          {view === 'threads' ? (
            // ── 떡밥 보드(전 권 교차 시점) ──
            <div style={editScroll}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={sectionTitle}><Emoji e="🧵"/> 떡밥 보드</div>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addThreadsToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '미회수 떡밥을 한 문서로 프로젝트에 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 미회수 떡밥 프로젝트에 추가</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['전체', ...THREAD_STATUS] as const).map((s) => {
                  const cnt = s === '전체' ? allThreads.length : threadCounts[s]
                  const on = threadFilter === s
                  return (
                    <button
                      key={s}
                      style={{ ...tinyBtn, padding: '5px 9px', background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--muted)', borderColor: on ? 'var(--accent)' : 'var(--border)' }}
                      onClick={() => setThreadFilter(s)}
                    >
                      {s === '전체' ? '전체' : <><Emoji e={THREAD_STATUS_META[s].icon}/> {s}</>} ({cnt})
                    </button>
                  )
                })}
              </div>
              {allThreads.length === 0 ? (
                <div style={{ ...emptyBox, alignItems: 'flex-start', textAlign: 'left', padding: '24px 4px' }}>
                  아직 등록된 떡밥이 없어요.<br />각 권 편집 화면의 <b><Emoji e="🧵"/> 떡밥·복선</b>에서 심은 단서와 회수 예정 권을 적어 두면<br />이곳에서 시리즈 전체의 미회수 떡밥을 한눈에 추적할 수 있어요.
                </div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ ...emptyBox, padding: '24px 4px' }}>이 상태의 떡밥이 없어요.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredThreads.map(({ book, idx, thread }) => {
                    const sm = THREAD_STATUS_META[thread.status]
                    const payoff = payoffLabel(thread.payoffBook, books)
                    return (
                      <div key={thread.id} style={{ ...panel, gap: 6, padding: '10px 12px', cursor: 'pointer' }} onClick={() => { setSelectedId(book.id); setView('book') }} title="이 권 편집으로 이동">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{bookLabel(book, idx)}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11.5, color: sm.color, fontWeight: 600 }}><Emoji e={sm.icon}/> {thread.status}</span>
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{thread.text.trim()}</div>
                        {(thread.planted.trim() || payoff) && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                            {thread.planted.trim() && <span><Emoji e="📍"/> 심은 곳: {thread.planted.trim()}</span>}
                            {payoff && <span><Emoji e="🎯"/> 회수 예정: {payoff}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : !selected ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 34 }}><Emoji e="📚"/></div>
              <div>왼쪽에서 권을 고르거나<br /><b>새 권</b>을 추가해 편집하세요.</div>
              <div style={{ fontSize: 12 }}>권별 한 줄 요약·핵심 사건·떡밥·연속성 메모를 채워<br />시리즈 전체의 일관성을 지켜 보세요.</div>
            </div>
          ) : (
            <div style={editScroll}>
              {/* 헤더: 제목/상태/액션 */}
              <div style={panel}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={label}>권 제목·번호</div>
                    <input style={input} value={selected.title} onChange={(e) => patchBook(selected.id, { title: e.target.value })} placeholder={`예: ${books.findIndex((b) => b.id === selected.id) + 1}권 — 새벽의 검`} maxLength={120} aria-label="권 제목" />
                  </div>
                  <div style={{ width: 130, flexShrink: 0 }}>
                    <div style={label}>상태</div>
                    <select style={{ ...input, cursor: 'pointer' }} value={selected.status} onChange={(e) => patchBook(selected.id, { status: e.target.value as BookStatus })} aria-label="권 상태">
                      {BOOK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={copyBook}><Emoji e="📋"/> 이 권 복사</button>
                  <button className="linkbtn" style={linkbtn} onClick={addBookToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 권을 프로젝트 바인더(자료 › 시리즈 설정집)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <span style={{ flex: 1 }} />
                  {confirmDel === selected.id ? (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--warn)' }}>정말 삭제?</span>
                      <button className="minibtn" onClick={() => setConfirmDel('')}>취소</button>
                      <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeBook(selected.id)}>삭제 확정</button>
                    </>
                  ) : (
                    <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(selected.id)} title="이 권 삭제"><Emoji e="🗑️"/> 삭제</button>
                  )}
                </div>
              </div>

              {/* 한 줄 요약 */}
              <div>
                <div style={label}><Emoji e="✍️"/> 한 줄 요약 (로그라인)</div>
                <textarea style={area} value={selected.logline} onChange={(e) => patchBook(selected.id, { logline: e.target.value })} placeholder="이 권을 한 문장으로 — 누가·무엇을 위해·어떤 대가를 치르는지…" />
              </div>

              {/* 핵심 사건 */}
              <div style={panel}>
                <div style={sectionTitle}><Emoji e="⭐"/> 핵심 사건 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>({selected.events.length})</span></div>
                {selected.events.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 권의 큰 줄기를 만드는 사건을 순서대로 적어 두세요.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.events.map((ev, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>{idx + 1}</span>
                        <textarea style={{ ...area, minHeight: 38, flex: 1 }} value={ev} onChange={(e) => editEvent(idx, e.target.value)} placeholder="사건 내용…" aria-label={`사건 ${idx + 1}`} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          <button style={tinyBtn} title="위로" disabled={idx === 0} onClick={() => moveEvent(idx, -1)}>↑</button>
                          <button style={tinyBtn} title="아래로" disabled={idx === selected.events.length - 1} onClick={() => moveEvent(idx, 1)}>↓</button>
                          <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="사건 삭제" onClick={() => removeEvent(idx)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...input, flex: 1 }} value={eventDraft} onChange={(e) => setEventDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEvent() } }} placeholder="새 사건을 적고 Enter…" aria-label="새 사건 입력" />
                  <button className="minibtn" onClick={addEvent} disabled={!eventDraft.trim()}>＋ 추가</button>
                </div>
              </div>

              {/* 떡밥·복선 */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={sectionTitle}><Emoji e="🧵"/> 떡밥·복선 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>({selected.threads.length})</span></div>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={addThread}>＋ 떡밥 추가</button>
                </div>
                {selected.threads.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 권에서 <b>심은 단서</b>와 <b>회수 예정 권</b>을 적어 두면, 떡밥 보드에서 시리즈 전체의 미회수 복선을 추적할 수 있어요.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selected.threads.map((t) => {
                      const sm = THREAD_STATUS_META[t.status]
                      return (
                        <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--paper)' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <textarea style={{ ...area, minHeight: 38, flex: 1 }} value={t.text} onChange={(e) => patchThread(t.id, { text: e.target.value })} placeholder="떡밥 내용 — 어떤 단서·복선을 심는가…" aria-label="떡밥 내용" />
                            <button style={{ ...tinyBtn, color: 'var(--warn)', flexShrink: 0 }} title="떡밥 삭제" onClick={() => removeThread(t.id)}>✕</button>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                              <div style={label}><Emoji e="📍"/> 심은 곳</div>
                              <input style={small} value={t.planted} onChange={(e) => patchThread(t.id, { planted: e.target.value })} placeholder="예: 3장 항구 장면" />
                            </div>
                            <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                              <div style={label}><Emoji e="🎯"/> 회수 예정</div>
                              <select style={{ ...small, cursor: 'pointer', width: '100%' }} value={t.payoffBook} onChange={(e) => patchThread(t.id, { payoffBook: e.target.value })} aria-label="회수 예정 권">
                                <option value="">미정</option>
                                {books.map((b, i) => <option key={b.id} value={b.id}>{bookLabel(b, i)}</option>)}
                                <option value="__later__">이후 권(미정)</option>
                              </select>
                            </div>
                            <div style={{ flex: '1 1 120px', minWidth: 110 }}>
                              <div style={label}>상태</div>
                              <select style={{ ...small, cursor: 'pointer', width: '100%', color: sm.color, fontWeight: 600 }} value={t.status} onChange={(e) => patchThread(t.id, { status: e.target.value as ThreadStatus })} aria-label="떡밥 상태">
                                {THREAD_STATUS.map((s) => <option key={s} value={s}>{THREAD_STATUS_META[s].icon} {s}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 연속성 메모 */}
              <div style={panel}>
                <div style={sectionTitle}><Emoji e="🔗"/> 연속성 메모 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>({selected.notes.length})</span></div>
                {selected.notes.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>권을 넘나들며 어긋나기 쉬운 설정·인물·연표를 기록해 두세요. (예: "주인공 눈 색은 회색", "A의 사망은 2권 종반")</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.notes.map((n) => (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <select style={{ ...small, width: 92, flexShrink: 0, cursor: 'pointer' }} value={n.cat} onChange={(e) => patchNote(n.id, { cat: e.target.value as NoteCat })} aria-label="메모 분류">
                          {NOTE_CATS.map((c) => <option key={c} value={c}>{NOTE_CAT_ICON[c]} {c}</option>)}
                        </select>
                        <textarea style={{ ...area, minHeight: 38, flex: 1 }} value={n.text} onChange={(e) => patchNote(n.id, { text: e.target.value })} placeholder="연속성 메모…" aria-label="연속성 메모" />
                        <button style={{ ...tinyBtn, color: 'var(--warn)', flexShrink: 0 }} title="메모 삭제" onClick={() => removeNote(n.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={{ ...small, width: 92, flexShrink: 0, cursor: 'pointer' }} value={noteCat} onChange={(e) => setNoteCat(e.target.value as NoteCat)} aria-label="새 메모 분류">
                    {NOTE_CATS.map((c) => <option key={c} value={c}>{NOTE_CAT_ICON[c]} {c}</option>)}
                  </select>
                  <input style={{ ...input, flex: 1 }} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }} placeholder="새 연속성 메모를 적고 Enter…" aria-label="새 연속성 메모 입력" />
                  <button className="minibtn" onClick={addNote} disabled={!noteDraft.trim()}>＋ 추가</button>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
                모든 변경은 이 브라우저에 자동 저장됩니다. 마지막 수정: {new Date(selected.updatedAt).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
