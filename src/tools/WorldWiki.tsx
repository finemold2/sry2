// 세계관 위키 — 페이지(제목+본문) 작성·편집·삭제·순서변경, 좌측 목록+검색, 본문 안 [[페이지명]] 위키링크로 이동(없으면 새로 생성).
// 자급식: react 외 import 없음. 모든 데이터는 localStorage('sry:tool:world-wiki')에 JSON 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag } from './linkbus'

export const meta = { id: 'world-wiki', name: '세계관 위키', icon: '📚', group: '구상·정리', intro: '설정 자료를 페이지로 정리하고 [[링크]]로 연결하세요', w: 720, h: 600 }

interface Page { id: string; title: string; body: string; created: number; updated: number }
interface Store { pages: Page[]; activeId: string | null }

const LS_KEY = 'sry:tool:world-wiki'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// localStorage 읽기 — 미지원/차단/손상 시 빈 상태로 graceful 처리.
function load(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { pages: [], activeId: null }
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.pages)) return { pages: [], activeId: null }
    const pages: Page[] = parsed.pages
      .filter((p: any) => p && typeof p.title === 'string')
      .map((p: any) => ({
        id: String(p.id || newId()),
        title: String(p.title),
        body: typeof p.body === 'string' ? p.body : '',
        created: Number(p.created) || Date.now(),
        updated: Number(p.updated) || Date.now(),
      }))
    const ids = new Set(pages.map((p) => p.id))
    const activeId = typeof parsed.activeId === 'string' && ids.has(parsed.activeId) ? parsed.activeId : (pages[0]?.id ?? null)
    return { pages, activeId }
  } catch {
    return { pages: [], activeId: null }
  }
}

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

const norm = (s: string) => s.trim().toLowerCase()

// 본문을 안전한 HTML 로 변환 — 특수문자 이스케이프 후 줄바꿈을 <br> 로.
function bodyToHtml(body: string): string {
  const esc = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc.replace(/\r\n|\r|\n/g, '<br>')
}

// 본문에서 [[페이지명]] 링크를 토큰화 — 텍스트/링크 조각으로 분해.
type Token = { type: 'text'; text: string } | { type: 'link'; name: string }
function tokenize(body: string): Token[] {
  const tokens: Token[] = []
  const re = /\[\[([^\[\]]+?)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', text: body.slice(last, m.index) })
    const name = m[1].trim()
    if (name) tokens.push({ type: 'link', name })
    else tokens.push({ type: 'text', text: m[0] })
    last = re.lastIndex
  }
  if (last < body.length) tokens.push({ type: 'text', text: body.slice(last) })
  return tokens
}

export default function WorldWiki({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => load())
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [fileOver, setFileOver] = useState(false) // 바인더 파일 드래그 진입 시 시각 피드백
  const dragDepth = useRef(0) // 중첩 enter/leave 카운트로 깜빡임 방지

  const mounted = useRef(true)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const copyTimer = useRef<number | null>(null)
  const payloadDone = useRef(false) // payload.place/character 를 1회만 소비(중복 페이지 생성 방지)
  // [연계] 참고 도구가 보낸 검색어(payload.q | title 문자열)로 위키 검색
  const handledQuery = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledQuery.current === payload) return
    handledQuery.current = payload
    const q = typeof payload.q === 'string' ? payload.q.trim() : typeof payload.title === 'string' ? payload.title.trim() : ''
    if (q) setQuery(q)
  }, [payload]) // eslint-disable-line

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 변경 시 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  const { pages, activeId } = store
  const active = pages.find((p) => p.id === activeId) || null

  // 편집 모드 진입 시 드래프트 동기화.
  useEffect(() => {
    if (editing && active) {
      setDraftTitle(active.title)
      setDraftBody(active.body)
    }
  }, [editing, activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = pages.filter((p) => {
    const q = norm(query)
    if (!q) return true
    return norm(p.title).includes(q) || norm(p.body).includes(q)
  })

  const setActive = (id: string | null) => {
    setEditing(false)
    setConfirmDel(null)
    setStore((s) => ({ ...s, activeId: id }))
  }

  // 새 페이지 생성(빈 제목 자동 번호). 생성 후 바로 편집.
  const createPage = (title?: string): Page => {
    const base = (title ?? '').trim() || `새 페이지 ${pages.length + 1}`
    const now = Date.now()
    const page: Page = { id: newId(), title: base, body: '', created: now, updated: now }
    setStore((s) => ({ pages: [...s.pages, page], activeId: page.id }))
    return page
  }

  const onNew = () => {
    const p = createPage()
    setDraftTitle(p.title)
    setDraftBody('')
    setEditing(true)
  }

  const onEdit = () => {
    if (!active) return
    setDraftTitle(active.title)
    setDraftBody(active.body)
    setEditing(true)
  }

  const onSave = () => {
    if (!active) return
    const title = draftTitle.trim() || '제목 없음'
    setStore((s) => ({
      ...s,
      pages: s.pages.map((p) => (p.id === active.id ? { ...p, title, body: draftBody, updated: Date.now() } : p)),
    }))
    setEditing(false)
  }

  const onCancel = () => {
    setEditing(false)
    // 빈 페이지(제목·본문 모두 비어있고 방금 만든 것)면 정리: 사용자가 즉시 취소한 새 페이지 제거.
    if (active && active.body === '' && /^새 페이지 \d+$/.test(active.title) && draftBody.trim() === '') {
      removePage(active.id)
    }
  }

  const removePage = (id: string) => {
    setStore((s) => {
      const idx = s.pages.findIndex((p) => p.id === id)
      const next = s.pages.filter((p) => p.id !== id)
      let nextActive = s.activeId
      if (s.activeId === id) {
        nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null
      }
      return { pages: next, activeId: nextActive }
    })
    setConfirmDel(null)
    setEditing(false)
  }

  // [[링크]] 클릭 — 같은 제목 페이지로 이동, 없으면 생성 후 이동.
  const followLink = (name: string) => {
    const target = pages.find((p) => norm(p.title) === norm(name))
    if (target) { setActive(target.id) }
    else { createPage(name); setEditing(false); setConfirmDel(null) }
  }

  // 본문 textarea 커서 위치에 [[]] 삽입(편의).
  const insertLink = () => {
    const ta = bodyRef.current
    if (!ta) { setDraftBody((b) => b + '[[]]'); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = draftBody.slice(start, end)
    const inserted = `[[${sel}]]`
    const next = draftBody.slice(0, start) + inserted + draftBody.slice(end)
    setDraftBody(next)
    requestAnimationFrame(() => {
      try {
        ta.focus()
        const caret = start + 2 + sel.length
        ta.setSelectionRange(caret, caret)
      } catch {}
    })
  }

  const copyPage = () => {
    if (!active) return
    const text = `# ${active.title}\n\n${active.body}`
    const done = () => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(fallbackCopy) }
      else fallbackCopy()
    } catch { fallbackCopy() }
    function fallbackCopy() {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        done()
      } catch {}
    }
  }

  // 현재 페이지를 프로젝트 자료(세계관 폴더)에 문서로 추가 — 줄바꿈은 <br> 로 변환.
  const toProject = () => {
    if (!active) return
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const title = active.title.trim() || '제목 없음'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title,
      bodyHtml: bodyToHtml(active.body),
    })
    if (!mounted.current) return
    if (id) {
      setNote(`‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 문서로 추가했어요. (바인더·DB 확인)`)
    } else {
      setNote('프로젝트에 문서를 추가하지 못했어요.')
    }
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 4000)
  }

  // 전체 위키를 마크다운 묶음으로 내보내기(다운로드).
  const exportAll = () => {
    if (!pages.length) return
    const text = pages.map((p) => `# ${p.title}\n\n${p.body}`).join('\n\n---\n\n')
    try {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'world-wiki.md'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setNote('내보내기에 실패했어요. 복사 버튼을 이용해 주세요.')
    }
  }

  // 드래그로 목록 순서 변경 — 검색 중이 아닐 때만 활성.
  const canDrag = norm(query) === ''
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return }
    setStore((s) => {
      const arr = [...s.pages]
      const from = arr.findIndex((p) => p.id === dragId)
      const to = arr.findIndex((p) => p.id === targetId)
      if (from < 0 || to < 0) return s
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { ...s, pages: arr }
    })
    setDragId(null)
    setOverId(null)
  }

  // 본문에 등장하는 모든 위키링크의 존재 여부(빨간링크 표시용).
  const exists = (name: string) => pages.some((p) => norm(p.title) === norm(name))

  // 인물/장소 카드 → 위키 본문 평문 변환(character 가 있는 항목 드롭 시).
  const cardToBody = (c: Record<string, string>): string => {
    const labels: Record<string, string> = {
      name: '이름', role: '역할', age: '나이', occupation: '직업', appearance: '외모',
      personality: '성격', habits: '습관', background: '배경', goal: '목표', conflict: '갈등',
      arc: '변화', type: '유형', location: '위치', atmosphere: '분위기', description: '묘사',
      history: '역사', notes: '메모',
    }
    return Object.keys(c)
      .filter((k) => typeof c[k] === 'string' && c[k].trim() !== '')
      .map((k) => `${labels[k] || k}: ${c[k].trim()}`)
      .join('\n')
  }

  // 바인더 파일 드롭 — 문서로 새 위키 페이지 생성(제목=title, 본문=text). 같은 제목 있으면 갱신.
  const acceptDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setFileOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const title = (it.title || '').trim() || '제목 없음'
    const body = it.character ? cardToBody(it.character) : (it.text || '').slice(0, 4000)
    const now = Date.now()
    const existing = pages.find((p) => norm(p.title) === norm(title))
    if (existing) {
      setStore((s) => ({
        ...s,
        pages: s.pages.map((p) => (p.id === existing.id ? { ...p, body, updated: now } : p)),
        activeId: existing.id,
      }))
    } else {
      const page: Page = { id: newId(), title, body, created: now, updated: now }
      setStore((s) => ({ pages: [...s.pages, page], activeId: page.id }))
    }
    setEditing(false)
    setConfirmDel(null)
    if (!mounted.current) return
    setNote(existing ? `‘${title}’ 위키 페이지를 드롭한 내용으로 갱신했어요.` : `‘${title}’ 위키 페이지를 새로 만들었어요.`)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 4000)
  }

  // payload.place / payload.character 로 열린 경우(관련 도구 연계) — 새 위키 페이지 1회 생성.
  // 카드(필드 맵)를 acceptDrop 과 동일한 cardToBody 로 평문화하여 본문에 넣는다.
  useEffect(() => {
    if (payloadDone.current) return
    const raw =
      payload && typeof payload.place === 'object' && payload.place ? (payload.place as Record<string, unknown>) :
      payload && typeof payload.character === 'object' && payload.character ? (payload.character as Record<string, unknown>) :
      null
    if (!raw) return
    payloadDone.current = true
    // 최상위 문자열 필드 + 정규 fields 맵을 합쳐 평문화용 카드(문자열만)로 구성.
    const card: Record<string, string> = {}
    for (const k of Object.keys(raw)) {
      if (k === 'fields') continue
      const v = raw[k]
      if (typeof v === 'string') card[k] = v
    }
    if (raw.fields && typeof raw.fields === 'object') {
      const f = raw.fields as Record<string, unknown>
      for (const k of Object.keys(f)) {
        const v = f[k]
        if (typeof v === 'string') card[k] = v
      }
    }
    const title = (card.name || '').trim() || '제목 없음'
    const body = cardToBody(card)
    const now = Date.now()
    const page: Page = { id: newId(), title, body, created: now, updated: now }
    setStore((s) => ({ pages: [...s.pages, page], activeId: page.id }))
    setEditing(false)
    setConfirmDel(null)
    if (!mounted.current) return
    setNote(`‘${title}’ 위키 페이지를 새로 만들었어요.`)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 4000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // --- styles ---
  const C = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 } as React.CSSProperties,
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 } as React.CSSProperties,
    title: { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 } as React.CSSProperties,
    spacer: { flex: 1 } as React.CSSProperties,
    main: { flex: 1, minHeight: 0, display: 'flex' } as React.CSSProperties,
    side: { width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' } as React.CSSProperties,
    sideHead: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 } as React.CSSProperties,
    search: { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 } as React.CSSProperties,
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } as React.CSSProperties,
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' } as React.CSSProperties,
    input: { width: '100%', padding: '10px 12px', fontSize: 18, fontWeight: 700, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    textarea: { width: '100%', flex: 1, minHeight: 200, padding: '12px 14px', fontSize: 14, lineHeight: 1.7, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' } as React.CSSProperties,
    bodyText: { fontSize: 14.5, lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } as React.CSSProperties,
    pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 4, wordBreak: 'break-word' } as React.CSSProperties,
    metaLine: { fontSize: 12, color: 'var(--muted)', marginBottom: 16 } as React.CSSProperties,
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 } as React.CSSProperties,
    note: { fontSize: 12, color: 'var(--warn)', padding: '6px 14px', flexShrink: 0 } as React.CSSProperties,
    editBar: { display: 'flex', gap: 8, padding: '10px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center' } as React.CSSProperties,
    editArea: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 20px' } as React.CSSProperties,
  }

  const itemStyle = (p: Page): React.CSSProperties => ({
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid ' + (p.id === activeId ? 'var(--accent)' : 'transparent'),
    background: p.id === activeId ? 'var(--paper)' : (overId === p.id ? 'var(--paper)' : 'transparent'),
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 13.5,
    lineHeight: 1.35,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    opacity: dragId === p.id ? 0.45 : 1,
    outline: overId === p.id && dragId ? '1px dashed var(--accent)' : 'none',
  })

  const linkStyle = (ok: boolean): React.CSSProperties => ({
    color: ok ? 'var(--accent)' : 'var(--warn)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
    fontWeight: 600,
  })

  const preview = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    return t.length > 42 ? t.slice(0, 42) + '…' : t
  }

  return (
    <div
      style={fileOver ? { ...C.wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : C.wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { dragDepth.current += 1; setFileOver(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setFileOver(false) } } }}
      onDrop={(e) => { const it = getDragItem(e); if (it) { e.preventDefault(); acceptDrop(e) } }}
    >
      <div style={C.topbar}>
        <div style={C.title}><span aria-hidden>📚</span> 세계관 위키</div>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pages.length}개 페이지</span>
        <button className="minibtn" onClick={exportAll} disabled={!pages.length} title="전체를 마크다운으로 내보내기">내보내기</button>
        <button className="btn-primary" onClick={onNew}>+ 새 페이지</button>
      </div>

      {note && <div style={C.note}>{note}</div>}

      <div style={C.main}>
        {/* 좌측: 목록 + 검색 */}
        <div style={C.side}>
          <div style={C.sideHead}>
            <input
              style={C.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="페이지 검색…"
              aria-label="페이지 검색"
            />
          </div>
          <div style={C.list}>
            {pages.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6, padding: 10, textAlign: 'center' }}>
                아직 페이지가 없어요.<br />‘+ 새 페이지’로 시작하세요.
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 10, textAlign: 'center' }}>‘{query}’에 맞는 페이지가 없어요.</div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  style={itemStyle(p)}
                  onClick={() => setActive(p.id)}
                  draggable={canDrag}
                  onDragStart={(e) => { if (!canDrag) return; setDragId(p.id); try { e.dataTransfer.effectAllowed = 'move' } catch {} }}
                  onDragOver={(e) => { if (!canDrag || !dragId) return; e.preventDefault(); if (overId !== p.id) setOverId(p.id) }}
                  onDragLeave={() => { if (overId === p.id) setOverId(null) }}
                  onDrop={(e) => { if (!canDrag) return; e.preventDefault(); onDrop(p.id) }}
                  onDragEnd={() => { setDragId(null); setOverId(null) }}
                  title={canDrag ? '드래그하여 순서 변경' : p.title}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(p.id) } }}
                >
                  <span style={{ fontWeight: p.id === activeId ? 700 : 500, wordBreak: 'break-word' }}>{p.title}</span>
                  {preview(p.body) && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{preview(p.body)}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 본문 */}
        <div style={C.content}>
          {!active ? (
            <div style={C.empty}>
              <div style={{ fontSize: 34 }} aria-hidden>🗺️</div>
              <div>
                설정 자료를 페이지로 정리해 보세요.<br />
                본문에 <strong style={{ color: 'var(--accent)' }}>[[페이지명]]</strong> 을 적으면 서로 연결됩니다.<br />
                (없는 페이지를 가리키면 클릭 시 새로 만들어져요.)
              </div>
              <button className="btn-primary" onClick={onNew}>+ 첫 페이지 만들기</button>
            </div>
          ) : editing ? (
            <>
              <div style={C.editArea}>
                <input
                  style={C.input}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="페이지 제목"
                  aria-label="페이지 제목"
                  maxLength={120}
                />
                <textarea
                  ref={bodyRef}
                  style={C.textarea}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder={'본문을 작성하세요…\n\n다른 페이지를 연결하려면 [[페이지명]] 처럼 적으세요.'}
                  aria-label="페이지 본문"
                />
              </div>
              <div style={C.editBar}>
                <button className="minibtn" onClick={insertLink} title="커서 위치에 [[ ]] 링크 삽입">[[링크]] 삽입</button>
                <div style={C.spacer} />
                <button className="minibtn" onClick={onCancel}>취소</button>
                <button className="btn-primary" onClick={onSave}>저장</button>
              </div>
            </>
          ) : (
            <>
              <div style={C.body}>
                <div style={C.pageTitle}>{active.title}</div>
                <div style={C.metaLine}>
                  수정 {fmtDate(active.updated)} · 생성 {fmtDate(active.created)}
                </div>
                {active.body.trim() === '' ? (
                  <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
                    아직 내용이 없어요. ‘편집’을 눌러 설정을 채워 보세요.
                  </div>
                ) : (
                  <div style={C.bodyText}>
                    {tokenize(active.body).map((tk, i) =>
                      tk.type === 'text' ? (
                        <span key={i}>{tk.text}</span>
                      ) : (
                        <span
                          key={i}
                          style={linkStyle(exists(tk.name))}
                          onClick={() => followLink(tk.name)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') followLink(tk.name) }}
                          title={exists(tk.name) ? `${tk.name} 페이지로 이동` : `${tk.name} 페이지 새로 만들기`}
                        >
                          {tk.name}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
              <div style={C.editBar}>
                <button className="minibtn" onClick={copyPage}>{copied ? '복사됨 ✓' : '복사'}</button>
                <button
                  className="linkbtn"
                  onClick={toProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '이 페이지를 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}
                >
                  📄 프로젝트 문서로 추가
                </button>
                <div style={C.spacer} />
                {confirmDel === active.id ? (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--warn)', marginRight: 4 }}>삭제할까요?</span>
                    <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                    <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removePage(active.id)}>삭제 확인</button>
                  </>
                ) : (
                  <>
                    <button className="minibtn" onClick={() => setConfirmDel(active.id)}>삭제</button>
                    <button className="btn-primary" onClick={onEdit}>편집</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
