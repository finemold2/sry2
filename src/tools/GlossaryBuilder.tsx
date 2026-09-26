// 작품 용어집·사전 — 고유명사·설정 용어를 표제어+뜻+분류(+별칭·발음·관련어·메모)로 등록·검색·관리한다.
//  · 가나다(ABC) 자동 정렬 + 첫 글자(초성/알파벳) 묶음 인덱스, 분류 필터, 즐겨찾기, 전문 검색.
//  · 표제어/별칭 충돌을 실시간 중복 경고(같은 이름·별칭이 이미 있으면 노란 경고).
//  · CRUD 전부 localStorage('sry:tool:glossary-builder') 영속 + 빈 상태 안내.
//  · 연계: addToProject(kind:text, folder:'용어집') 로 항목 하나 또는 전체 용어집을 실제 프로젝트 자료에 문서로 추가.
// react 와 './linkbus' 외 import 금지 · 완전 로컬 · 언마운트 정리.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'glossary-builder', name: '작품 용어집·사전', icon: '📔', group: '구상·정리', intro: '고유명사·설정 용어를 표제어·뜻·분류로 등록하고 가나다순 검색·관리하세요', w: 760, h: 680 }

const LS_KEY = 'sry:tool:glossary-builder'

interface Term {
  id: string
  term: string        // 표제어
  reading: string     // 발음/표기(로마자·원어 등)
  category: string    // 분류
  def: string         // 뜻·설명
  aliases: string[]   // 별칭·이표기
  related: string     // 관련어(쉼표 구분 표시용)
  note: string        // 집필 메모(주의·일관성)
  fav: boolean        // 즐겨찾기
  createdAt: number
  updatedAt: number
}

interface Persisted {
  terms: Term[]
  categories: string[]   // 사용자 정의 분류(순서 보존)
}

// 기본 분류 — 작품 용어집에서 흔한 갈래. 사용자가 자유 입력으로 늘릴 수 있다.
const DEFAULT_CATEGORIES = ['인물', '지명·장소', '조직·세력', '사물·도구', '능력·마법', '종족·생물', '사건·역사', '제도·문화', '개념·용어', '기타']

const ALL = '__all__'
const FAV = '__fav__'

// ---------- localStorage ----------
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { terms: [], categories: [...DEFAULT_CATEGORIES] }
    const p = JSON.parse(raw)
    const terms: Term[] = Array.isArray(p?.terms)
      ? p.terms
          .filter((x: unknown) => x && typeof (x as Term).term === 'string')
          .map((x: Partial<Term>) => ({
            id: String(x.id || newId()),
            term: String(x.term || ''),
            reading: String(x.reading || ''),
            category: String(x.category || '기타'),
            def: String(x.def || ''),
            aliases: Array.isArray(x.aliases) ? x.aliases.map((a) => String(a)).filter(Boolean) : [],
            related: String(x.related || ''),
            note: String(x.note || ''),
            fav: !!x.fav,
            createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
            updatedAt: Number.isFinite(x.updatedAt) ? (x.updatedAt as number) : Date.now(),
          }))
      : []
    const rawCats: string[] = Array.isArray(p?.categories)
      ? (p.categories as unknown[]).map((c) => String(c)).filter(Boolean)
      : []
    const cats: string[] = rawCats.length ? [...new Set(rawCats)] : [...DEFAULT_CATEGORIES]
    // 항목이 쓰는 분류는 빠짐없이 포함
    for (const t of terms) if (t.category && !cats.includes(t.category)) cats.push(t.category)
    return { terms, categories: cats }
  } catch {
    return { terms: [], categories: [...DEFAULT_CATEGORIES] }
  }
}

// ---------- 가나다 정렬·인덱싱 ----------
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
// 쌍자음/된소리는 기본 자음 묶음으로 합쳐 보기 좋게.
const CHO_BUCKET: Record<string, string> = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' }

function firstBucket(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return '#'
  const ch = s[0]
  const code = ch.charCodeAt(0)
  // 한글 음절: 초성 추출
  if (code >= 0xac00 && code <= 0xd7a3) {
    const cho = CHO[Math.floor((code - 0xac00) / 588)]
    return CHO_BUCKET[cho] || cho
  }
  // 한글 자모 그대로
  if (CHO.includes(ch)) return CHO_BUCKET[ch] || ch
  // 영문
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase()
  // 숫자
  if (/[0-9]/.test(ch)) return '0-9'
  return '#'
}

// 정렬 키: 한글 < 영문 < 숫자/기타. 한글은 유니코드 순(=가나다순)으로 충분.
function sortKey(t: Term): string {
  const s = (t.term || '').trim()
  const b = firstBucket(s)
  // 그룹 우선순위 접두어로 한글→영문→숫자→기타 순서 보장
  let g = '3'
  if (CHO.includes(b)) g = '0'
  else if (/^[A-Z]$/.test(b)) g = '1'
  else if (b === '0-9') g = '2'
  return g + '' + s.toLocaleLowerCase('ko')
}

// HTML 이스케이프 (프로젝트 본문 안전 삽입) — &,<,> 필수.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 정규화(중복 비교용): 공백 제거 + 소문자.
function norm(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}

const blankDraft = (cat: string): Omit<Term, 'id' | 'createdAt' | 'updatedAt'> => ({
  term: '', reading: '', category: cat || '기타', def: '', aliases: [], related: '', note: '', fav: false,
})

export default function GlossaryBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [terms, setTerms] = useState<Term[]>(init.current.terms)
  const [categories, setCategories] = useState<string[]>(init.current.categories)

  // 검색·필터
  const [q, setQ] = useState('')
  const [filterCat, setFilterCat] = useState<string>(ALL)

  // 편집 폼
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => blankDraft(init.current.categories[0] || '기타'))
  const [aliasInput, setAliasInput] = useState('')
  const [newCat, setNewCat] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [note, setNote] = useState('')         // 경고/저장 안내(폼 상단)
  const [toast, setToast] = useState('')        // 동작 결과 토스트(하단)
  const [copiedId, setCopiedId] = useState('')

  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const termRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 초기 표제어 전달 시 폼 열고 채우기(연계 진입).
  useEffect(() => {
    if (!payload) return
    const pterm = typeof payload.term === 'string' ? payload.term : ''
    const pdef = typeof payload.def === 'string' ? payload.def : (typeof payload.text === 'string' ? payload.text : '')
    if (pterm || pdef) {
      setShowForm(true)
      setEditId(null)
      setDraft({ ...blankDraft(init.current.categories[0] || '기타'), term: pterm, def: pdef })
    }
    // payload 는 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ terms, categories } as Persisted))
    } catch {
      if (mounted.current) flashToast('이 브라우저에서 저장이 막혀 새로고침하면 사라질 수 있어요.', true)
    }
  }, [terms, categories])

  function flashToast(msg: string, _warn = false) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }
  function flashNote(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3200)
  }

  // ---------- 중복 검사 ----------
  // 표제어/별칭의 정규화 집합 → 항목 id 들. 자기 자신은 제외하고 충돌 찾기.
  const dupOf = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of terms) {
      const names = [t.term, ...t.aliases].map(norm).filter(Boolean)
      for (const n of new Set(names)) {
        const arr = map.get(n) || []
        arr.push(t.id)
        map.set(n, arr)
      }
    }
    return map
  }, [terms])

  // 현재 폼 입력이 기존 항목과 충돌하는지(편집 중인 자신 제외).
  const draftConflict = useMemo(() => {
    const candidates = [draft.term, ...draft.aliases].map(norm).filter(Boolean)
    const hits = new Set<string>()
    for (const c of candidates) {
      const ids = dupOf.get(c)
      if (!ids) continue
      for (const id of ids) if (id !== editId) hits.add(id)
    }
    if (!hits.size) return null
    const names = terms.filter((t) => hits.has(t.id)).map((t) => t.term)
    return names
  }, [draft.term, draft.aliases, dupOf, editId, terms])

  // ---------- 표시 목록(필터+검색+정렬+그룹) ----------
  const filtered = useMemo(() => {
    const ql = norm(q)
    let base = terms
    if (filterCat === FAV) base = base.filter((t) => t.fav)
    else if (filterCat !== ALL) base = base.filter((t) => t.category === filterCat)
    if (ql) {
      base = base.filter((t) =>
        norm(t.term).includes(ql) ||
        t.aliases.some((a) => norm(a).includes(ql)) ||
        norm(t.reading).includes(ql) ||
        norm(t.def).includes(ql) ||
        norm(t.related).includes(ql) ||
        norm(t.note).includes(ql) ||
        norm(t.category).includes(ql))
    }
    return [...base].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ko'))
  }, [terms, filterCat, q])

  // 첫 글자(초성/알파벳) 묶음으로 그룹화 — 가나다 인덱스.
  const grouped = useMemo(() => {
    const groups: { key: string; items: Term[] }[] = []
    let cur: { key: string; items: Term[] } | null = null
    for (const t of filtered) {
      const k = firstBucket(t.term)
      if (!cur || cur.key !== k) { cur = { key: k, items: [] }; groups.push(cur) }
      cur.items.push(t)
    }
    return groups
  }, [filtered])

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of terms) m[t.category] = (m[t.category] || 0) + 1
    return m
  }, [terms])
  const favCount = useMemo(() => terms.filter((t) => t.fav).length, [terms])

  // ---------- 폼 동작 ----------
  const openNew = () => {
    setEditId(null)
    const cat = filterCat !== ALL && filterCat !== FAV ? filterCat : (categories[0] || '기타')
    setDraft(blankDraft(cat))
    setAliasInput('')
    setShowForm(true)
    setNote('')
    setTimeout(() => termRef.current?.focus(), 30)
  }
  const openEdit = (t: Term) => {
    setEditId(t.id)
    setDraft({ term: t.term, reading: t.reading, category: t.category, def: t.def, aliases: [...t.aliases], related: t.related, note: t.note, fav: t.fav })
    setAliasInput('')
    setShowForm(true)
    setNote('')
    setTimeout(() => termRef.current?.focus(), 30)
  }
  const closeForm = () => { setShowForm(false); setEditId(null); setAliasInput(''); setNote('') }

  const setField = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const commitAlias = () => {
    const a = aliasInput.trim()
    if (!a) return
    if (draft.aliases.some((x) => norm(x) === norm(a)) || norm(a) === norm(draft.term)) { setAliasInput(''); return }
    setField('aliases', [...draft.aliases, a])
    setAliasInput('')
  }
  const removeAlias = (a: string) => setField('aliases', draft.aliases.filter((x) => x !== a))

  const addCategory = () => {
    const c = newCat.trim()
    if (!c) return
    if (categories.includes(c)) { setField('category', c); setNewCat(''); return }
    setCategories((p) => [...p, c])
    setField('category', c)
    setNewCat('')
  }

  const save = () => {
    const t = draft.term.trim()
    if (!t) { flashNote('표제어를 입력하세요.'); termRef.current?.focus(); return }
    const now = Date.now()
    const cleaned = {
      term: t,
      reading: draft.reading.trim(),
      category: draft.category || '기타',
      def: draft.def.trim(),
      aliases: draft.aliases.map((a) => a.trim()).filter(Boolean),
      related: draft.related.trim(),
      note: draft.note.trim(),
      fav: draft.fav,
    }
    if (editId) {
      setTerms((p) => p.map((x) => (x.id === editId ? { ...x, ...cleaned, updatedAt: now } : x)))
      flashToast(`‘${t}’ 항목을 수정했습니다.`)
    } else {
      const rec: Term = { id: newId(), ...cleaned, createdAt: now, updatedAt: now }
      setTerms((p) => [rec, ...p])
      flashToast(`‘${t}’ 항목을 용어집에 추가했습니다.`)
    }
    // 분류가 목록에 없으면 등록
    if (cleaned.category && !categories.includes(cleaned.category)) setCategories((p) => [...p, cleaned.category])
    closeForm()
  }

  const remove = (id: string) => {
    const t = terms.find((x) => x.id === id)
    setTerms((p) => p.filter((x) => x.id !== id))
    if (editId === id) closeForm()
    flashToast(t ? `‘${t.term}’ 항목을 삭제했습니다.` : '삭제했습니다.')
  }
  const toggleFav = (id: string) => setTerms((p) => p.map((x) => (x.id === id ? { ...x, fav: !x.fav, updatedAt: Date.now() } : x)))

  // ---------- 복사·내보내기 ----------
  const copy = (text: string, tag: string) => {
    const done = () => {
      setCopiedId(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopiedId('') }, 1400)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    else fallbackCopy(text, done)
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text
      ta.style.position = 'fixed'; ta.style.left = '-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flashToast('복사에 실패했습니다. 직접 선택해 복사하세요.', true) }
  }
  const termPlain = (t: Term): string => {
    const head = t.term + (t.reading ? ` [${t.reading}]` : '') + (t.aliases.length ? ` (${t.aliases.join(', ')})` : '')
    const lines = [`${head} — ${t.category}`]
    if (t.def) lines.push(t.def)
    if (t.related) lines.push(`관련어: ${t.related}`)
    if (t.note) lines.push(`메모: ${t.note}`)
    return lines.join('\n')
  }
  const exportAll = () => {
    if (!filtered.length) { flashToast('내보낼 항목이 없습니다.'); return }
    const scope = filterCat === ALL ? '' : filterCat === FAV ? ' (즐겨찾기)' : ` (${filterCat})`
    const text = `# 용어집${scope} · ${filtered.length}개\n\n` + grouped.map((g) =>
      `[${g.key}]\n` + g.items.map((t) => termPlain(t)).join('\n\n'),
    ).join('\n\n')
    copy(text, 'export')
    flashToast(`표시된 ${filtered.length}개 항목을 텍스트로 복사했습니다.`)
  }

  // ---------- 프로젝트 연계 ----------
  const termHtml = (t: Term): string => {
    const head =
      `<b>${escHtml(t.term)}</b>` +
      (t.reading ? ` <span>[${escHtml(t.reading)}]</span>` : '') +
      ` <i>— ${escHtml(t.category)}</i>` +
      (t.aliases.length ? ` <span>(별칭: ${escHtml(t.aliases.join(', '))})</span>` : '')
    const parts = [`<p>${head}</p>`]
    if (t.def) parts.push(`<p>${escHtml(t.def)}</p>`)
    if (t.related) parts.push(`<p>관련어: ${escHtml(t.related)}</p>`)
    if (t.note) parts.push(`<p>메모: ${escHtml(t.note)}</p>`)
    return parts.join('')
  }
  const addOneToProject = (t: Term) => {
    if (!hasProjectBridge()) { flashToast('프로젝트에 연결되어 있지 않습니다.', true); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '용어집',
      title: t.term,
      bodyHtml: termHtml(t),
      meta: { 분류: t.category, ...(t.reading ? { 표기: t.reading } : {}), ...(t.aliases.length ? { 별칭: t.aliases.join(', ') } : {}) },
    })
    flashToast(id ? `프로젝트 자료 〈용어집〉에 ‘${t.term}’ 항목을 추가했습니다.` : '프로젝트에 추가하지 못했습니다.', !id)
  }
  const addAllToProject = () => {
    if (!hasProjectBridge()) { flashToast('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (!filtered.length) { flashToast('추가할 항목이 없습니다.'); return }
    const scope = filterCat === ALL ? '' : filterCat === FAV ? ' (즐겨찾기)' : ` (${filterCat})`
    const bodyHtml = grouped.map((g) =>
      `<p><b>― ${escHtml(g.key)} ―</b></p>` + g.items.map((t) => termHtml(t)).join('<hr/>'),
    ).join('<hr/>')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '용어집',
      title: `용어집${scope} (${filtered.length}개)`,
      bodyHtml,
      meta: { 항목수: String(filtered.length) },
    })
    flashToast(id ? `프로젝트 자료 〈용어집〉에 ${filtered.length}개 항목을 문서로 추가했습니다.` : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const onTermKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save() }
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }
  const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const catChip = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)',
  })

  const totalTerms = terms.length

  return (
    <div style={wrap}>
      {/* 헤더: 검색 + 추가 */}
      <div style={head}>
        <div style={row}>
          <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="📔" /> 작품 용어집·사전</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>표제어 {totalTerms}개 · 분류 {categories.length}갈래</span>
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}>＋ 표제어 추가</button>
        </div>
        <div style={row}>
          <input
            style={{ ...input, flex: 1, minWidth: 160 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="표제어·뜻·별칭·메모 검색…"
            aria-label="용어 검색"
          />
          {q && <button className="minibtn" onClick={() => setQ('')}>✕ 지우기</button>}
          <button className="minibtn" onClick={exportAll} disabled={!filtered.length} title="표시된 항목을 텍스트로 복사">
            {copiedId === 'export' ? '✓ 복사됨' : '⬇ 텍스트 복사'}
          </button>
        </div>
        {/* 분류 필터 */}
        <div style={{ ...row, gap: 6 }}>
          <button style={catChip(filterCat === ALL)} onClick={() => setFilterCat(ALL)}>전체 {totalTerms}</button>
          <button style={catChip(filterCat === FAV)} onClick={() => setFilterCat(FAV)} disabled={false} title="즐겨찾기">★ {favCount}</button>
          {categories.filter((c) => catCounts[c]).map((c) => (
            <button key={c} style={catChip(filterCat === c)} onClick={() => setFilterCat(c)}>{c} {catCounts[c]}</button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div style={body}>
        {/* 편집 폼 */}
        {showForm && (
          <div style={{ ...card, border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{editId ? <><Emoji e="✏️" /> 표제어 수정</> : '＋ 새 표제어'}</h4>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={closeForm}>닫기</button>
            </div>

            {note && <div style={{ ...hint, color: 'var(--warn)', marginBottom: 8 }}>{note}</div>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label style={label}>표제어 *</label>
                <input ref={termRef} style={{ ...input, width: '100%' }} value={draft.term} onChange={(e) => setField('term', e.target.value)} onKeyDown={onTermKey} placeholder="예: 아르카니아, 시간정지, 흑요석 검" maxLength={80} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={label}>발음·표기</label>
                <input style={{ ...input, width: '100%' }} value={draft.reading} onChange={(e) => setField('reading', e.target.value)} onKeyDown={onTermKey} placeholder="예: Arcania" maxLength={60} />
              </div>
            </div>

            {/* 중복 경고 */}
            {draftConflict && (
              <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--warn)', marginBottom: 10, lineHeight: 1.55 }}>
                <Emoji e="⚠" /> 같은 이름/별칭이 이미 있습니다: <b>{draftConflict.join(', ')}</b>. 그대로 저장하면 중복 등록됩니다.
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={label}>분류</label>
              <div style={{ ...row, gap: 6 }}>
                {categories.map((c) => (
                  <button key={c} style={catChip(draft.category === c)} onClick={() => setField('category', c)}>{c}</button>
                ))}
              </div>
              <div style={{ ...row, gap: 6, marginTop: 6 }}>
                <input style={{ ...input, flex: 1, minWidth: 120 }} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }} placeholder="새 분류 추가…" maxLength={20} />
                <button className="minibtn" onClick={addCategory} disabled={!newCat.trim()}>분류 추가</button>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={label}>뜻·설명</label>
              <textarea style={{ ...input, width: '100%', minHeight: 78, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }} value={draft.def} onChange={(e) => setField('def', e.target.value)} placeholder="이 용어가 작품 안에서 무엇을 가리키는지, 설정·유래·규칙을 적으세요." maxLength={1200} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={label}>별칭·이표기 (같은 대상을 가리키는 다른 이름)</label>
              <div style={{ ...row, gap: 6, marginBottom: draft.aliases.length ? 6 : 0 }}>
                <input style={{ ...input, flex: 1, minWidth: 140 }} value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitAlias() } }} placeholder="별칭 입력 후 Enter" maxLength={60} />
                <button className="minibtn" onClick={commitAlias} disabled={!aliasInput.trim()}>추가</button>
              </div>
              {draft.aliases.length > 0 && (
                <div style={{ ...row, gap: 6 }}>
                  {draft.aliases.map((a) => (
                    <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 8px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
                      {a}
                      <button onClick={() => removeAlias(a)} style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }} title="제거">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={label}>관련어</label>
                <input style={{ ...input, width: '100%' }} value={draft.related} onChange={(e) => setField('related', e.target.value)} placeholder="쉼표로 구분 (예: 마법탑, 대마법사)" maxLength={200} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={label}>집필 메모</label>
                <input style={{ ...input, width: '100%' }} value={draft.note} onChange={(e) => setField('note', e.target.value)} placeholder="표기 일관성·주의점 (예: 항상 한자 병기)" maxLength={200} />
              </div>
            </div>

            <div style={{ ...row, gap: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.fav} onChange={(e) => setField('fav', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                ★ 즐겨찾기(핵심 용어)
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="minibtn" onClick={closeForm}>취소</button>
                <button className="btn-primary" onClick={save} disabled={!draft.term.trim()} title="Ctrl/⌘+Enter">{editId ? '수정 저장' : '용어집에 추가'}</button>
              </div>
            </div>
          </div>
        )}

        {/* 목록 / 빈 상태 */}
        {totalTerms === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '34px 18px', color: 'var(--muted)', lineHeight: 1.8 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}><Emoji e="📔" /></div>
            <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>아직 등록된 용어가 없습니다.</div>
            작품의 <b>고유명사</b>(인물·지명·조직)와 <b>설정 용어</b>(능력·사물·개념)를<br />
            표제어로 모아 두면 표기 일관성을 지키고 빠르게 찾아볼 수 있어요.<br />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={openNew}>＋ 첫 표제어 추가</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '26px 16px', color: 'var(--muted)' }}>
            {q ? <>“{q}” 검색 결과가 없습니다.</> : '이 분류에 해당하는 용어가 없습니다.'}
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', minWidth: 26 }}>{g.key}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.items.length}</span>
              </div>
              {g.items.map((t) => {
                const isDup = (dupOf.get(norm(t.term)) || []).length > 1
                return (
                  <div key={t.id} style={{ ...card, padding: '11px 13px', border: '1px solid ' + (editId === t.id ? 'var(--accent)' : 'var(--border)') }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, wordBreak: 'break-all' }}>{t.term}</span>
                      {t.reading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>[{t.reading}]</span>}
                      <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{t.category}</span>
                      {t.fav && <span title="즐겨찾기" style={{ color: 'var(--accent)', fontSize: 12 }}>★</span>}
                      {isDup && <span title="같은 이름의 항목이 둘 이상 있습니다" style={{ fontSize: 11, color: 'var(--warn)' }}><Emoji e="⚠" /> 중복</span>}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button style={iconBtn} title={t.fav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(t.id)}>{t.fav ? '★' : '☆'}</button>
                        <button style={iconBtn} title="복사" onClick={() => copy(termPlain(t), 'c' + t.id)}>{copiedId === 'c' + t.id ? <>✓</> : <Emoji e="📋" />}</button>
                        <button style={iconBtn} title="프로젝트 자료 〈용어집〉에 추가" onClick={() => addOneToProject(t)} disabled={!hasProjectBridge()}><Emoji e="📄" /></button>
                        <button style={iconBtn} title="수정" onClick={() => openEdit(t)}><Emoji e="✏️" /></button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => remove(t.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>
                    {t.def && <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{t.def}</div>}
                    {(t.aliases.length > 0 || t.related || t.note) && (
                      <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {t.aliases.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>별칭: {t.aliases.join(', ')}</div>}
                        {t.related && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>관련어: {t.related}</div>}
                        {t.note && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}><Emoji e="📝" /> {emojify(t.note)}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}

        {totalTerms > 0 && (
          <div style={hint}>
            표제어를 클릭하지 말고 우측 버튼으로 ☆즐겨찾기·<Emoji e="📋" />복사·<Emoji e="📄" />프로젝트추가·<Emoji e="✏️" />수정·<Emoji e="🗑️" />삭제하세요.
            목록은 가나다(→영문→숫자)순으로 자동 정렬되며 이 브라우저에 자동 저장됩니다.
          </div>
        )}
      </div>

      {/* 하단: 연계 + 토스트 */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="linkbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={addAllToProject}
            disabled={!hasProjectBridge() || filtered.length === 0}
            title={!hasProjectBridge()
              ? '프로젝트에 연결되어 있지 않습니다'
              : filtered.length === 0
                ? '추가할 항목이 없습니다'
                : `현재 표시된 ${filtered.length}개 항목을 프로젝트 자료 〈용어집〉 폴더에 문서로 추가`}
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <span style={{ ...hint, marginLeft: 'auto' }}>{toast || (filtered.length !== totalTerms ? `${filtered.length} / ${totalTerms}개 표시` : `${totalTerms}개 표제어`)}</span>
        </div>
      </div>
    </div>
  )
}
