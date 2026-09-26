// 자료 스크랩 보관함 — 메모(제목+본문)+출처 URL+태그를 저장하고, 태그/키워드 검색·필터,
// 항목 편집/삭제/순서 변경, 즐겨찾기, 전체/선택 마크다운 내보내기를 지원한다. 취재·자료조사 정리용.
// 자급식: react 외 import 없음. 외부 네트워크 불필요(전부 로컬). localStorage 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'research-clipper', name: '자료 스크랩 보관함', icon: '📎', group: '리서치·자료', intro: '취재·자료조사 메모를 출처·태그와 함께 저장하고 검색·내보내기하세요', w: 680, h: 580 }

interface Clip {
  id: string
  title: string
  body: string
  url: string
  tags: string[]
  fav: boolean
  created: number
  updated: number
}

const LS_KEY = 'sry:tool:research-clipper'

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 태그 문자열("a, b #c")을 정규화된 배열로. 중복·공백 제거, # 제거, 소문자화는 하지 않음(한글 보존).
function parseTags(raw: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (let t of raw.split(/[,\n#]/)) {
    t = t.trim().replace(/^#+/, '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function loadClips(): Clip[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && (typeof x.title === 'string' || typeof x.body === 'string'))
      .map((x): Clip => ({
        id: String(x.id || newId()),
        title: String(x.title || ''),
        body: String(x.body || ''),
        url: String(x.url || ''),
        tags: Array.isArray(x.tags) ? x.tags.map((t: unknown) => String(t)).filter(Boolean) : [],
        fav: !!x.fav,
        created: Number(x.created) || Date.now(),
        updated: Number(x.updated) || Number(x.created) || Date.now(),
      }))
  } catch {
    return []
  }
}

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return ''
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url
  }
}

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자 입력을 안전하게 처리)
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 스크랩 본문 + 출처 링크를 프로젝트 본문 HTML 로 변환
function clipToBodyHtml(c: Clip): string {
  const parts: string[] = []
  if (c.body) parts.push('<p>' + escHtml(c.body).replace(/\n/g, '<br>') + '</p>')
  if (c.tags.length) parts.push('<p>' + c.tags.map((t) => '#' + escHtml(t)).join(' ') + '</p>')
  if (c.url) parts.push('<p>출처: <a href="' + escHtml(c.url) + '">' + escHtml(hostOf(c.url)) + '</a></p>')
  if (!parts.length) parts.push('<p></p>')
  return parts.join('\n')
}

type SortKey = 'updated' | 'created' | 'title' | 'manual'

const empty = { title: '', body: '', url: '', tags: '' }

export default function ResearchClipper() {
  const [clips, setClips] = useState<Clip[]>(() => loadClips())
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('updated')

  // 폼 상태: editing === 'new' 면 추가, id 면 수정, null 이면 닫힘.
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ ...empty })

  const [note, setNote] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(clips))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 보관함이 사라질 수 있어요.')
    }
  }, [clips])

  // 복사 토스트 자동 해제
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
    return () => clearTimeout(t)
  }, [copied])

  // 편집 폼 열릴 때 제목에 포커스
  useEffect(() => {
    if (editing && titleRef.current) titleRef.current.focus()
  }, [editing])

  // 모든 태그 + 사용 횟수
  const allTags = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of clips) for (const t of c.tags) m.set(t, (m.get(t) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [clips])

  // 검색·필터·정렬 결과
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = clips.filter((c) => {
      if (favOnly && !c.fav) return false
      if (activeTag && !c.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())) return false
      if (q) {
        const hay = (c.title + ' ' + c.body + ' ' + c.url + ' ' + c.tags.join(' ')).toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    if (sort === 'manual') {
      // 저장된 배열 순서 유지(필터만 적용)
    } else if (sort === 'title') {
      list = [...list].sort((a, b) => (a.title || '무제').localeCompare(b.title || '무제'))
    } else if (sort === 'created') {
      list = [...list].sort((a, b) => b.created - a.created)
    } else {
      list = [...list].sort((a, b) => b.updated - a.updated)
    }
    return list
  }, [clips, query, activeTag, favOnly, sort])

  const openNew = () => {
    setForm({ ...empty, tags: activeTag || '' })
    setEditing('new')
  }
  const openEdit = (c: Clip) => {
    setForm({ title: c.title, body: c.body, url: c.url, tags: c.tags.join(', ') })
    setEditing(c.id)
  }
  const closeForm = () => { setEditing(null); setForm({ ...empty }) }

  const save = () => {
    const title = form.title.trim()
    const body = form.body.trim()
    if (!title && !body) { setNote('제목이나 본문 중 하나는 입력해 주세요.'); return }
    setNote('')
    const tags = parseTags(form.tags)
    const url = form.url.trim()
    const now = Date.now()
    if (editing === 'new') {
      const c: Clip = { id: newId(), title, body, url, tags, fav: false, created: now, updated: now }
      setClips((prev) => [c, ...prev])
    } else if (editing) {
      setClips((prev) => prev.map((c) => (c.id === editing ? { ...c, title, body, url, tags, updated: now } : c)))
    }
    closeForm()
  }

  const remove = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
    if (editing === id) closeForm()
  }
  const toggleFav = (id: string) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, fav: !c.fav, updated: Date.now() } : c)))

  // 순서 이동(수동 정렬에서만 의미) — 전체 배열 기준 인덱스로 이동
  const move = (id: string, dir: -1 | 1) => {
    setClips((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 재정렬(수동 정렬)
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setClips((prev) => {
      const fi = prev.findIndex((c) => c.id === from)
      const ti = prev.findIndex((c) => c.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  const copyText = async (text: string, label: string) => {
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
      if (mounted.current) setCopied(label)
    } catch {
      if (mounted.current) setNote('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  const clipToMd = (c: Clip): string => {
    const lines: string[] = []
    lines.push(`## ${c.title || '무제'}`)
    if (c.url) lines.push(`출처: [${hostOf(c.url)}](${c.url})`)
    if (c.tags.length) lines.push(`태그: ${c.tags.map((t) => '#' + t).join(' ')}`)
    lines.push(`기록: ${fmtDate(c.created)}`)
    if (c.body) { lines.push(''); lines.push(c.body) }
    return lines.join('\n')
  }

  const exportMd = (list: Clip[], label: string) => {
    if (!list.length) { setNote('내보낼 항목이 없습니다.'); return }
    const header = `# 자료 스크랩 보관함\n\n총 ${list.length}개 항목 · 내보낸 시각 ${fmtDate(Date.now())}\n`
    const md = header + '\n' + list.map(clipToMd).join('\n\n---\n\n') + '\n'
    copyText(md, label)
  }

  const downloadMd = (list: Clip[]) => {
    if (!list.length) { setNote('내보낼 항목이 없습니다.'); return }
    try {
      const header = `# 자료 스크랩 보관함\n\n총 ${list.length}개 항목 · 내보낸 시각 ${fmtDate(Date.now())}\n`
      const md = header + '\n' + list.map(clipToMd).join('\n\n---\n\n') + '\n'
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `research-clips-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 0)
    } catch {
      setNote('파일 내려받기에 실패했습니다.')
    }
  }

  // ── 프로젝트 연동: 스크랩을 자료 바인더 문서로 추가 ──
  const bridge = hasProjectBridge()
  const addOneToProject = (c: Clip): boolean => {
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료 스크랩',
      title: c.title || '무제',
      bodyHtml: clipToBodyHtml(c),
      meta: c.url ? { 출처: c.url } : undefined,
    })
    return !!id
  }
  const addListToProject = (list: Clip[]) => {
    if (!bridge) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!list.length) { setNote('추가할 항목이 없습니다.'); return }
    let ok = 0
    for (const c of list) { if (addOneToProject(c)) ok++ }
    if (ok) setCopied(`프로젝트에 ${ok}개 자료 추가`)
    else setNote('프로젝트에 추가하지 못했습니다.')
  }
  const addClipToProject = (c: Clip) => {
    if (!bridge) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (addOneToProject(c)) setCopied('프로젝트에 자료 추가')
    else setNote('프로젝트에 추가하지 못했습니다.')
  }

  const onFormKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save() }
    if (e.key === 'Escape') { e.preventDefault(); closeForm() }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const topRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
  const search: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tagBar: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const tagChip = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 9px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--panel)',
    color: active ? '#fff' : 'var(--muted)',
  })
  const ctrlRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }
  const sel: React.CSSProperties = { fontSize: 12, padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const card = (over: boolean): React.CSSProperties => ({
    border: '1px solid ' + (over ? 'var(--accent)' : 'var(--border)'),
    background: 'var(--panel)', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7,
    boxShadow: over ? '0 0 0 2px var(--accent) inset' : 'none',
  })
  const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8 }
  const titleCss: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4, wordBreak: 'break-word' }
  const bodyCss: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const metaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }
  const link: React.CSSProperties = { color: 'var(--accent)', textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const miniTag: React.CSSProperties = { fontSize: 11, padding: '2px 7px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }
  const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 3, color: 'var(--muted)' }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 12 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const overlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 20 }
  const modal: React.CSSProperties = { width: '100%', maxWidth: 520, maxHeight: '100%', overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 11, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }
  const fLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const fInput: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', boxSizing: 'border-box' }
  const fArea: React.CSSProperties = { ...fInput, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }

  const isEmpty = clips.length === 0
  const noResult = !isEmpty && filtered.length === 0

  return (
    <div style={wrap}>
      {/* 헤더: 검색 + 추가 */}
      <div style={head}>
        <div style={topRow}>
          <input
            style={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·본문·출처·태그 키워드 검색…"
            aria-label="검색"
          />
          {query && <button className="minibtn" onClick={() => setQuery('')} title="검색 지우기">✕</button>}
          <button className="btn-primary" onClick={openNew}>+ 스크랩</button>
        </div>

        {/* 태그 필터 */}
        {allTags.length > 0 && (
          <div style={tagBar}>
            <span style={tagChip(activeTag === null)} onClick={() => setActiveTag(null)}>전체 {clips.length}</span>
            {allTags.map(([t, n]) => (
              <span key={t} style={tagChip(activeTag?.toLowerCase() === t.toLowerCase())} onClick={() => setActiveTag(activeTag?.toLowerCase() === t.toLowerCase() ? null : t)} title={`${n}개 항목`}>#{t} {n}</span>
            ))}
          </div>
        )}

        {/* 정렬·필터·내보내기 컨트롤 */}
        <div style={ctrlRow}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            ★ 즐겨찾기만
          </label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            정렬
            <select style={sel} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="정렬 기준">
              <option value="updated">최근 수정순</option>
              <option value="created">등록순</option>
              <option value="title">제목순</option>
              <option value="manual">수동(드래그)</option>
            </select>
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{filtered.length}개</span>
            <button className="minibtn" onClick={() => exportMd(filtered, '현재 목록')} disabled={!filtered.length} title="현재 보이는 목록을 마크다운으로 복사"><Emoji e="📋"/> 복사</button>
            <button className="minibtn" onClick={() => downloadMd(filtered)} disabled={!filtered.length} title="현재 보이는 목록을 .md 파일로 저장">⬇ 내보내기</button>
            <button className="linkbtn" onClick={() => addListToProject(filtered)} disabled={!bridge || !filtered.length} title={bridge ? '현재 보이는 스크랩을 프로젝트 자료 바인더에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트 자료로 추가</button>
          </span>
        </div>

        {note && <div style={{ ...hint, color: 'var(--warn)' }}>{note}</div>}
        {copied && <div style={{ ...hint, color: 'var(--ok)' }}>✓ {copied.startsWith('프로젝트') ? copied + '했습니다.' : copied + ' 복사했습니다.'}</div>}
      </div>

      {/* 본문 목록 */}
      {isEmpty ? (
        <div style={emptyBox}>
          <div style={{ fontSize: 40 }}><Emoji e="📎"/></div>
          <div>아직 모아둔 자료가 없습니다.<br />취재 메모·인용·링크를 한 곳에 정리해 보세요.</div>
          <button className="btn-primary" onClick={openNew}>+ 첫 스크랩 추가</button>
        </div>
      ) : noResult ? (
        <div style={emptyBox}>
          <div style={{ fontSize: 34 }}><Emoji e="🔍"/></div>
          <div>조건에 맞는 자료가 없습니다.</div>
          <button className="minibtn" onClick={() => { setQuery(''); setActiveTag(null); setFavOnly(false) }}>필터 초기화</button>
        </div>
      ) : (
        <div style={body}>
          {filtered.map((c) => (
            <div
              key={c.id}
              style={card(dragOver === c.id)}
              draggable={sort === 'manual'}
              onDragStart={() => { if (sort === 'manual') dragId.current = c.id }}
              onDragOver={(e) => { if (sort === 'manual' && dragId.current) { e.preventDefault(); setDragOver(c.id) } }}
              onDragLeave={() => { if (dragOver === c.id) setDragOver(null) }}
              onDrop={(e) => { if (sort === 'manual') { e.preventDefault(); onDrop(c.id) } }}
              onDragEnd={() => { dragId.current = null; setDragOver(null) }}
            >
              <div style={cardTop}>
                {sort === 'manual' && <span title="드래그하여 순서 변경" style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 14, lineHeight: 1.4 }}>⠿</span>}
                <div style={titleCss}>{c.title || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>무제</span>}</div>
                <button style={{ ...iconBtn, color: c.fav ? 'var(--warn)' : 'var(--muted)' }} onClick={() => toggleFav(c.id)} title={c.fav ? '즐겨찾기 해제' : '즐겨찾기'} aria-label="즐겨찾기">{c.fav ? '★' : '☆'}</button>
                {sort === 'manual' && (
                  <>
                    <button style={iconBtn} onClick={() => move(c.id, -1)} title="위로" aria-label="위로">▲</button>
                    <button style={iconBtn} onClick={() => move(c.id, 1)} title="아래로" aria-label="아래로">▼</button>
                  </>
                )}
                <button style={iconBtn} onClick={() => copyText(clipToMd(c), '항목')} title="이 항목 복사" aria-label="복사"><Emoji e="📋"/></button>
                <button style={{ ...iconBtn, opacity: bridge ? 1 : 0.4, cursor: bridge ? 'pointer' : 'not-allowed' }} onClick={() => addClipToProject(c)} disabled={!bridge} title={bridge ? '이 스크랩을 프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'} aria-label="프로젝트 자료로 추가"><Emoji e="📄"/></button>
                <button style={iconBtn} onClick={() => openEdit(c)} title="수정" aria-label="수정"><Emoji e="✏️"/></button>
                <button style={{ ...iconBtn, color: 'var(--warn)' }} onClick={() => setConfirmDel(c.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
              </div>

              {c.body && <div style={bodyCss}>{c.body}</div>}

              {c.tags.length > 0 && (
                <div style={{ ...tagBar, gap: 5 }}>
                  {c.tags.map((t) => (
                    <span key={t} style={miniTag} onClick={() => setActiveTag(t)} title={`#${t} 로 필터`}>#{t}</span>
                  ))}
                </div>
              )}

              <div style={metaRow}>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer noopener" style={link} title={c.url}><Emoji e="🔗"/> {hostOf(c.url)}</a>
                )}
                <span style={{ marginLeft: 'auto' }} title={`등록 ${fmtDate(c.created)}`}>{fmtDate(c.updated)}</span>
              </div>

              {confirmDel === c.id && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 9, padding: '8px 10px', fontSize: 13 }}>
                  <span style={{ flex: 1 }}>이 자료를 삭제할까요?</span>
                  <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                  <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => remove(c.id)}>삭제</button>
                </div>
              )}
            </div>
          ))}
          <div style={hint}>총 {clips.length}개 중 {filtered.length}개 표시 · 보관함은 이 브라우저에 자동 저장됩니다.</div>
        </div>
      )}

      {/* 추가/수정 폼 모달 */}
      {editing && (
        <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) closeForm() }}>
          <div style={modal} onKeyDown={onFormKey}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{editing === 'new' ? '새 스크랩' : '스크랩 수정'}</strong>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={closeForm}>✕ 닫기</button>
            </div>
            <div>
              <label style={fLabel}>제목</label>
              <input ref={titleRef} style={fInput} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="자료 제목 (예: 19세기 런던 가로등)" maxLength={200} />
            </div>
            <div>
              <label style={fLabel}>본문 / 메모</label>
              <textarea style={fArea} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="인용문·요약·취재 메모를 적으세요…" />
            </div>
            <div>
              <label style={fLabel}>출처 URL (선택)</label>
              <input style={fInput} value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" inputMode="url" />
            </div>
            <div>
              <label style={fLabel}>태그 (쉼표·# 로 구분)</label>
              <input style={fInput} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="예: 역사, 런던, 고증" />
              {parseTags(form.tags).length > 0 && (
                <div style={{ ...tagBar, gap: 5, marginTop: 7 }}>
                  {parseTags(form.tags).map((t) => <span key={t} style={miniTag}>#{t}</span>)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="minibtn" onClick={closeForm} style={{ flex: 1 }}>취소</button>
              <button className="btn-primary" onClick={save} style={{ flex: 2 }} disabled={!form.title.trim() && !form.body.trim()}>{editing === 'new' ? '추가' : '저장'} (Ctrl+Enter)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
