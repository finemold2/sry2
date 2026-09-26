// 고유명사 발음 가이드 — 작품 속 인물/지명/조직 등 고유명사의 발음을 한곳에 정리한다.
//  · 표제어 CRUD(추가/수정/삭제) + localStorage 영속('sry:tool:pronunciation-guide')
//  · 한글 발음 표기 + 로마자 근사(자동 보조 변환) + 강세(음절 분해 후 표시) + 유래/메모
//  · 분류·검색·정렬, 발음 음절 표시(•음절• 형태), 한글 입력 시 로마자 자동 추정 버튼
//  · 연계: addToProject 로 발음 가이드 표를 자료 폴더에 문서로, 단건/전체 모두 지원
// react 와 './linkbus' 외 import 금지. 완전 로컬(외부 미디어/키/네트워크 불필요).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = {
  id: 'pronunciation-guide',
  name: '발음 가이드',
  icon: '🗣️',
  group: '구상·정리',
  intro: '작품 속 이름·지명의 발음(한글/로마자 근사)과 강세·유래를 정리하는 표제어 사전',
  w: 640,
  h: 720,
}

// ───────────────────────── 데이터 모델 ─────────────────────────
type Category = 'person' | 'place' | 'org' | 'item' | 'term' | 'other'
interface Entry {
  id: string
  term: string          // 표제어(고유명사 원형)
  hangul: string        // 한글 발음 표기
  roman: string         // 로마자 근사 표기
  stress: string        // 강세/음절 메모 (예: "두 번째 음절 강세")
  category: Category
  origin: string        // 유래 메모
  notes: string         // 자유 메모(흔한 오발음 등)
  favorite: boolean
  created: number
  updated: number
}

const LS_KEY = 'sry:tool:pronunciation-guide'

const CATS: { key: Category; label: string; icon: string }[] = [
  { key: 'person', label: '인물', icon: '🧑' },
  { key: 'place', label: '지명', icon: '🗺️' },
  { key: 'org', label: '조직·세력', icon: '⚔️' },
  { key: 'item', label: '물건·유물', icon: '🗝️' },
  { key: 'term', label: '용어·개념', icon: '📖' },
  { key: 'other', label: '기타', icon: '✴️' },
]
const catOf = (k: Category) => CATS.find((c) => c.key === k) || CATS[5]

// ───────────────────────── 유틸 ─────────────────────────
const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* noop */ }
  return 'pg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 손상/차단에 강한 로드
function load(): Entry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x.term === 'string')
      .map((x): Entry => ({
        id: String(x.id || newId()),
        term: String(x.term || ''),
        hangul: String(x.hangul || ''),
        roman: String(x.roman || ''),
        stress: String(x.stress || ''),
        category: (CATS.some((c) => c.key === x.category) ? x.category : 'other') as Category,
        origin: String(x.origin || ''),
        notes: String(x.notes || ''),
        favorite: !!x.favorite,
        created: Number(x.created) || Date.now(),
        updated: Number(x.updated) || Date.now(),
      }))
  } catch {
    return []
  }
}

// ─── 한글 → 로마자 근사 변환(국어의 로마자 표기법 근사) ───
// 한글 발음 표기를 입력했을 때 로마자 표기를 자동 보조 채움. 표준과 다를 수 있는 근사값.
const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']
const JONG_PHON = ['', 'k', 'kk', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

type Syl = { cho: number; jung: number; jong: number; ch?: undefined } | { ch: string; cho?: undefined }

function decompose(text: string): Syl[] {
  const out: Syl[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00
      out.push({ cho: Math.floor(s / 588), jung: Math.floor((s % 588) / 28), jong: s % 28 })
    } else out.push({ ch })
  }
  return out
}

function liaison(jongPhon: string, nextCho: number): [string, string | null] {
  const baseMap: Record<string, string> = {
    k: 'k', kk: 'k', ks: 'k', lk: 'k', n: 'n', nj: 'n', nh: 'n',
    t: 't', s: 't', ss: 't', j: 't', ch: 't', h: 't',
    l: 'l', lm: 'm', lb: 'l', ls: 'l', lt: 'l', lp: 'p', lh: 'l',
    m: 'm', p: 'p', ps: 'p', ng: 'ng',
  }
  const jongRo = baseMap[jongPhon] ?? ''
  if (jongPhon === '') return ['', null]
  if (nextCho === 11) { // 다음 초성 ㅇ → 연음
    const lia: Record<string, [string, string]> = {
      k: ['', 'g'], kk: ['', 'kk'], ks: ['k', 's'], lk: ['l', 'g'],
      n: ['', 'n'], nj: ['n', 'j'], nh: ['', 'n'],
      t: ['', 'd'], s: ['', 's'], ss: ['', 'ss'], j: ['', 'j'], ch: ['', 'ch'], h: ['', ''],
      l: ['', 'r'], lm: ['l', 'm'], lb: ['l', 'b'], ls: ['l', 's'], lt: ['l', 't'], lp: ['l', 'p'], lh: ['l', ''],
      m: ['', 'm'], p: ['', 'b'], ps: ['p', 's'], ng: ['ng', ''],
    }
    const m = lia[jongPhon]
    if (m) return [m[0], m[1]]
    return [jongRo, null]
  }
  if (jongRo === 'l' && nextCho === 2) return ['l', 'l']
  const nasal = nextCho === 2 || nextCho === 6
  if (nasal) {
    if (jongRo === 'k') return ['ng', null]
    if (jongRo === 'p') return ['m', null]
    if (jongRo === 't') return ['n', null]
  }
  if (nextCho === 5) {
    if (jongRo === 'n') return ['l', 'l']
    if (jongRo === 'l') return ['l', 'l']
    if (jongRo === 'k') return ['ng', 'n']
    if (jongRo === 'p') return ['m', 'n']
    if (jongRo === 'm' || jongRo === 'ng') return [jongRo, 'n']
  }
  return [jongRo, null]
}

function romanize(text: string): string {
  const syls = decompose(text) as (Record<string, unknown>)[]
  for (let i = 0; i < syls.length; i++) {
    const cur = syls[i]
    if ('ch' in cur && cur.ch !== undefined) continue
    if ((cur.jong as number) === 0) continue
    const next = syls[i + 1]
    if (!next || ('ch' in next && next.ch !== undefined)) continue
    const [keep, moved] = liaison(JONG_PHON[cur.jong as number], next.cho as number)
    cur._keep = keep
    if (moved !== null) next._ovr = moved
  }
  let res = ''
  for (let i = 0; i < syls.length; i++) {
    const cur = syls[i]
    if ('ch' in cur && cur.ch !== undefined) { res += cur.ch as string; continue }
    res += (cur._ovr as string | undefined) ?? CHO[cur.cho as number]
    res += JUNG[cur.jung as number]
    if ((cur.jong as number) !== 0) res += (cur._keep as string | undefined) ?? JONG[cur.jong as number]
  }
  return res
}
const capWord = (s: string) => s.split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')

// 한글 발음 표기를 음절 단위 칩으로 분해(시각적 강세 표시용)
function hangulSyllables(s: string): string[] {
  const out: string[] = []
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (code >= 0xac00 && code <= 0xd7a3) out.push(ch)
    else if (/\s/.test(ch)) { /* 공백은 구분만 */ }
    else out.push(ch)
  }
  return out
}

const blank = (cat: Category = 'person'): Omit<Entry, 'id' | 'created' | 'updated'> => ({
  term: '', hangul: '', roman: '', stress: '', category: cat, origin: '', notes: '', favorite: false,
})

type SortKey = 'updated' | 'term' | 'category'

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function PronunciationGuide({ payload }: { payload?: Record<string, unknown> }) {
  const [entries, setEntries] = useState<Entry[]>(() => load())
  const [query, setQuery] = useState('')
  const [filterCat, setFilterCat] = useState<Category | 'all' | 'fav'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [editingId, setEditingId] = useState<string | null>(null) // null=닫힘, ''=신규
  const [draft, setDraft] = useState(blank())
  const [toast, setToast] = useState('')
  const [warn, setWarn] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const termRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // payload 로 표제어가 들어오면 신규 작성 폼을 미리 채워 연다(다른 도구에서 보내기 지원)
  useEffect(() => {
    if (!payload) return
    const term = typeof payload.term === 'string' ? payload.term : (typeof payload.name === 'string' ? payload.name : '')
    if (term) {
      setDraft({ ...blank(), term })
      setEditingId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장(차단/용량초과 graceful)
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(entries))
      if (mounted.current && warn) setWarn('')
    } catch {
      if (mounted.current) setWarn('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const flash = useCallback((msg: string) => {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2600)
  }, [])

  // ── 목록 필터/정렬 ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = entries.filter((e) => {
      if (filterCat === 'fav') { if (!e.favorite) return false }
      else if (filterCat !== 'all') { if (e.category !== filterCat) return false }
      if (!q) return true
      return (
        e.term.toLowerCase().includes(q) ||
        e.hangul.toLowerCase().includes(q) ||
        e.roman.toLowerCase().includes(q) ||
        e.origin.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      if (sortKey === 'term') return a.term.localeCompare(b.term, 'ko')
      if (sortKey === 'category') return a.category.localeCompare(b.category) || a.term.localeCompare(b.term, 'ko')
      return b.updated - a.updated
    })
    return list
  }, [entries, query, filterCat, sortKey])

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: entries.length, fav: entries.filter((e) => e.favorite).length }
    for (const c of CATS) m[c.key] = entries.filter((e) => e.category === c.key).length
    return m
  }, [entries])

  // ── CRUD ──
  const openNew = () => {
    setDraft(blank(filterCat !== 'all' && filterCat !== 'fav' ? filterCat : 'person'))
    setEditingId('')
    setConfirmClear(false)
    setTimeout(() => termRef.current?.focus(), 30)
  }
  const openEdit = (e: Entry) => {
    setDraft({ term: e.term, hangul: e.hangul, roman: e.roman, stress: e.stress, category: e.category, origin: e.origin, notes: e.notes, favorite: e.favorite })
    setEditingId(e.id)
    setConfirmClear(false)
    setTimeout(() => termRef.current?.focus(), 30)
  }
  const closeForm = () => { setEditingId(null) }

  const save = () => {
    const term = draft.term.trim()
    if (!term) { flash('표제어를 입력하세요.'); termRef.current?.focus(); return }
    const now = Date.now()
    const clean = {
      term,
      hangul: draft.hangul.trim(),
      roman: draft.roman.trim(),
      stress: draft.stress.trim(),
      category: draft.category,
      origin: draft.origin.trim(),
      notes: draft.notes.trim(),
      favorite: draft.favorite,
    }
    if (editingId) {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...clean, updated: now } : e)))
      flash('수정했어요.')
    } else {
      setEntries((prev) => [{ id: newId(), created: now, updated: now, ...clean }, ...prev])
      flash('표제어를 추가했어요.')
    }
    setEditingId(null)
  }

  const remove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (editingId === id) setEditingId(null)
    flash('삭제했어요.')
  }
  const toggleFav = (id: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, favorite: !e.favorite, updated: Date.now() } : e)))

  const clearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return }
    setEntries([])
    setConfirmClear(false)
    setEditingId(null)
    flash('전체 삭제했어요.')
  }

  // ── 로마자 자동 추정(폼 내부) ──
  const autoRoman = () => {
    const src = draft.hangul.trim() || draft.term.trim()
    if (!src) { flash('한글 발음 표기 또는 표제어를 먼저 입력하세요.'); return }
    try {
      const r = capWord(romanize(src).trim())
      if (!r) { flash('한글이 포함되어야 자동 변환됩니다.'); return }
      setDraft((d) => ({ ...d, roman: r }))
    } catch { flash('변환에 실패했어요.') }
  }

  // ── 복사 ──
  const copyText = (t: string, label = '복사됨') => {
    if (!t) return
    const done = () => flash(label)
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done))
    else fallbackCopy(t, done)
  }
  const fallbackCopy = (t: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      done()
    } catch { flash('복사 실패 — 직접 선택하세요.') }
  }
  const lineOf = (e: Entry) => {
    const parts = [e.term]
    if (e.hangul) parts.push(`[${e.hangul}]`)
    if (e.roman) parts.push(`(${e.roman})`)
    return parts.join(' ')
  }

  // ── 연계: 프로젝트/수집함 ──
  const entryHtml = (e: Entry) => {
    const c = catOf(e.category)
    let h = `<p><strong>${esc(e.term)}</strong> <span style="color:#888">— ${esc(c.icon + ' ' + c.label)}</span></p>`
    h += '<ul>'
    if (e.hangul) h += `<li>한글 발음: ${esc(e.hangul)}</li>`
    if (e.roman) h += `<li>로마자 근사: ${esc(e.roman)}</li>`
    if (e.stress) h += `<li>강세·음절: ${esc(e.stress)}</li>`
    if (e.origin) h += `<li>유래: ${esc(e.origin)}</li>`
    if (e.notes) h += `<li>메모: ${esc(e.notes)}</li>`
    h += '</ul>'
    return h
  }

  const sendOneToProject = (e: Entry) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '발음 가이드', icon: '🗣️',
      title: e.term + ' 발음',
      bodyHtml: entryHtml(e),
      meta: {
        한글발음: e.hangul || '-',
        로마자: e.roman || '-',
        분류: catOf(e.category).label,
      },
    })
    flash(id ? `자료 〈발음 가이드〉에 “${e.term}”을(를) 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  const sendAllToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!filtered.length) { flash('내보낼 표제어가 없어요.'); return }
    // 분류별로 묶어 표 형태(목록)로 직렬화
    const byCat = new Map<Category, Entry[]>()
    for (const e of filtered) {
      const arr = byCat.get(e.category) || []
      arr.push(e); byCat.set(e.category, arr)
    }
    let body = `<p>고유명사 발음 가이드 — 표제어 ${filtered.length}개${query.trim() ? ` (검색 “${esc(query.trim())}”)` : ''}.</p>`
    for (const c of CATS) {
      const arr = byCat.get(c.key)
      if (!arr || !arr.length) continue
      body += `<p><strong>${esc(c.icon + ' ' + c.label)}</strong></p><ul>`
      for (const e of arr) {
        const sub: string[] = []
        if (e.hangul) sub.push(`한글 [${esc(e.hangul)}]`)
        if (e.roman) sub.push(`로마자 ${esc(e.roman)}`)
        if (e.stress) sub.push(`강세 ${esc(e.stress)}`)
        body += `<li><strong>${esc(e.term)}</strong>${sub.length ? ' — ' + sub.join(' · ') : ''}`
        if (e.origin) body += `<br><span style="color:#888">유래: ${esc(e.origin)}</span>`
        if (e.notes) body += `<br><span style="color:#888">메모: ${esc(e.notes)}</span>`
        body += '</li>'
      }
      body += '</ul>'
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '발음 가이드', icon: '🗣️',
      title: '발음 가이드 — 표제어 ' + filtered.length + '개',
      bodyHtml: body,
      meta: { 표제어수: String(filtered.length) },
    })
    flash(id ? `자료 〈발음 가이드〉에 표제어 ${filtered.length}개를 표로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  const stashOne = (e: Entry) => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: e.term + ' 발음', text: lineOf(e) + (e.stress ? ` · 강세: ${e.stress}` : '') })
    flash('수집함에 담았어요.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const toolbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const search: React.CSSProperties = { flex: 1, minWidth: 130, padding: '8px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const select: React.CSSProperties = { padding: '7px 9px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const chips: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const listBox: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--chrome-2)', padding: '10px 12px' }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 18 }
  const fieldLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3 }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 46, lineHeight: 1.5 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }
  const iconBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 4, color: 'var(--muted)' }

  const editing = editingId !== null

  // ── 폼 화면 ──
  if (editing) {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="minibtn" onClick={closeForm}>← 목록</button>
          <strong style={{ fontSize: 14 }}>{editingId ? '표제어 수정' : '새 표제어'}</strong>
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.favorite} onChange={(e) => setDraft((d) => ({ ...d, favorite: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
            <Emoji e="⭐" /> 즐겨찾기
          </label>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }}>
          <div>
            <div style={fieldLabel}>표제어 (고유명사) *</div>
            <input ref={termRef} style={inp} value={draft.term} maxLength={120}
              onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
              placeholder="예: Saoirse, 카에루레아, 발할라" />
          </div>

          <div>
            <div style={fieldLabel}>분류</div>
            <div style={chips}>
              {CATS.map((c) => (
                <button key={c.key} className={'minibtn' + (draft.category === c.key ? ' active' : '')}
                  onClick={() => setDraft((d) => ({ ...d, category: c.key }))}>
                  <Emoji e={c.icon} /> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={fieldLabel}>한글 발음 표기</div>
              <input style={inp} value={draft.hangul} maxLength={120}
                onChange={(e) => setDraft((d) => ({ ...d, hangul: e.target.value }))}
                placeholder="예: 서셔, 카에루레아" />
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>로마자 근사</span>
                <button className="linkbtn" style={{ fontSize: 10.5, padding: '1px 7px' }} onClick={autoRoman} title="한글 발음/표제어를 국어의 로마자 표기법(근사)으로 자동 채웁니다"><Emoji e="🔤" /> 자동</button>
              </div>
              <input style={inp} value={draft.roman} maxLength={120}
                onChange={(e) => setDraft((d) => ({ ...d, roman: e.target.value }))}
                placeholder="예: Seosyeo / Kaerurea" />
            </div>
          </div>

          <div>
            <div style={fieldLabel}>강세·음절 메모</div>
            <input style={inp} value={draft.stress} maxLength={160}
              onChange={(e) => setDraft((d) => ({ ...d, stress: e.target.value }))}
              placeholder="예: 첫 음절 강세 / 'SUR-sha'처럼 두 음절로" />
          </div>

          <div>
            <div style={fieldLabel}>유래 메모</div>
            <textarea style={ta} value={draft.origin} maxLength={600}
              onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))}
              placeholder="이름의 어원·의미·작명 의도 등 (예: 고대 게일어로 '자유')" />
          </div>

          <div>
            <div style={fieldLabel}>메모 (흔한 오발음·주의)</div>
            <textarea style={ta} value={draft.notes} maxLength={600}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="예: 독자들이 '사오이르세'로 잘못 읽기 쉬움 — 본문 첫 등장에 발음 힌트" />
          </div>

          <div style={hint}>* 표제어는 필수입니다. 입력은 이 브라우저에 자동 저장됩니다. (저장: Ctrl/⌘+Enter)</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={save}>{editingId ? '저장' : '추가'}</button>
          <button className="minibtn" onClick={closeForm}>취소</button>
          {editingId && (
            <button className="minibtn danger" style={{ marginLeft: 'auto' }} onClick={() => remove(editingId)}><Emoji e="🗑️" /> 삭제</button>
          )}
        </div>
        {toast && <div style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</div>}
      </div>
    )
  }

  // ── 목록 화면 ──
  return (
    <div style={wrap}>
      <div style={toolbar}>
        <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="표제어·발음·유래 검색…" aria-label="검색" />
        <select style={select} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="정렬">
          <option value="updated">최근 수정순</option>
          <option value="term">가나다순</option>
          <option value="category">분류순</option>
        </select>
        <button className="btn-primary" onClick={openNew}>＋ 표제어</button>
      </div>

      <div style={chips}>
        <button className={'minibtn' + (filterCat === 'all' ? ' active' : '')} onClick={() => setFilterCat('all')}>전체 {counts.all}</button>
        <button className={'minibtn' + (filterCat === 'fav' ? ' active' : '')} onClick={() => setFilterCat('fav')}><Emoji e="⭐" /> {counts.fav}</button>
        {CATS.map((c) => (
          <button key={c.key} className={'minibtn' + (filterCat === c.key ? ' active' : '')} onClick={() => setFilterCat(c.key)}>
            <Emoji e={c.icon} /> {c.label} {counts[c.key] || 0}
          </button>
        ))}
      </div>

      {warn && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{warn}</div>}

      {entries.length === 0 ? (
        <div style={emptyBox}>
          <div style={{ fontSize: 30 }}><Emoji e="🗣️" /></div>
          <div>아직 등록된 발음이 없어요.</div>
          <div style={{ fontSize: 12.5 }}>작품 속 헷갈리는 이름·지명의 발음을<br />한곳에 모아 일관되게 관리하세요.</div>
          <button className="btn-primary" onClick={openNew} style={{ marginTop: 4 }}>＋ 첫 표제어 추가</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyBox}>
          <div>조건에 맞는 표제어가 없어요.</div>
          <button className="minibtn" onClick={() => { setQuery(''); setFilterCat('all') }}>필터 초기화</button>
        </div>
      ) : (
        <div style={listBox}>
          {filtered.map((e) => {
            const c = catOf(e.category)
            const syl = hangulSyllables(e.hangul)
            return (
              <div key={e.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <button style={{ ...iconBtn, color: e.favorite ? 'var(--accent)' : 'var(--muted)', fontSize: 15 }}
                    onClick={() => toggleFav(e.id)} title={e.favorite ? '즐겨찾기 해제' : '즐겨찾기'}>
                    {e.favorite ? '★' : '☆'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, wordBreak: 'break-word' }}>{e.term}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '0 7px' }}><Emoji e={c.icon} /> {c.label}</span>
                    </div>

                    {(e.hangul || e.roman) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
                        {e.hangul && (
                          <span
                            onClick={() => copyText(e.hangul, '한글 발음 복사됨')}
                            title="클릭하면 한글 발음 복사"
                            style={{ display: 'inline-flex', gap: 2, alignItems: 'center', cursor: 'pointer', fontSize: 15, color: 'var(--accent)', fontWeight: 600 }}>
                            {syl.length > 1
                              ? syl.map((s, i) => (
                                <span key={i} style={{ borderBottom: '2px solid color-mix(in srgb, var(--accent) 40%, transparent)', padding: '0 1px', borderRadius: 2 }}>{s}</span>
                              ))
                              : <span>{e.hangul}</span>}
                          </span>
                        )}
                        {e.roman && (
                          <span onClick={() => copyText(e.roman, '로마자 복사됨')} title="클릭하면 로마자 복사"
                            style={{ cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                            /{e.roman}/
                          </span>
                        )}
                      </div>
                    )}

                    {e.stress && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}><Emoji e="🎯" /> {e.stress}</div>}
                    {e.origin && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}><span style={{ opacity: 0.8 }}>유래</span> {e.origin}</div>}
                    {e.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}><span style={{ opacity: 0.8 }}>메모</span> {e.notes}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="minibtn" onClick={() => openEdit(e)}><Emoji e="✏️" /> 수정</button>
                  <button className="minibtn" onClick={() => copyText(lineOf(e), '복사됨')} title="표제어 [한글] (로마자) 복사"><Emoji e="📋" /> 복사</button>
                  {hasStash() && <button className="minibtn" onClick={() => stashOne(e)}><Emoji e="📥" /> 수집함</button>}
                  <button className="linkbtn" onClick={() => sendOneToProject(e)} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 표제어를 프로젝트 자료 〈발음 가이드〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                  <button className="minibtn danger" style={{ marginLeft: 'auto' }} onClick={() => remove(e.id)} title="삭제"><Emoji e="🗑️" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div className="linkbar" style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          <span className="linkbar-label">연계</span>
          <button className="linkbtn" onClick={sendAllToProject} disabled={!hasProjectBridge() || filtered.length === 0}
            title={hasProjectBridge() ? `현재 보이는 ${filtered.length}개를 분류별 표로 프로젝트 자료에 추가` : '프로젝트에 연결되어 있지 않습니다'}>
            <Emoji e="📄" /> 전체를 프로젝트로 ({filtered.length})
          </button>
          <button className="minibtn danger" style={{ marginLeft: 'auto' }} onClick={clearAll}>
            {confirmClear ? '정말 전체 삭제?' : '전체 비우기'}
          </button>
          {confirmClear && <button className="minibtn" onClick={() => setConfirmClear(false)}>취소</button>}
        </div>
      )}

      <div style={hint}>
        {toast || '표제어를 추가해 작품의 고유명사 발음을 일관되게 관리하세요. 한글 발음 칸을 클릭하면 음절별로 표시되고, 발음/로마자를 클릭하면 복사됩니다.'}
      </div>
    </div>
  )
}
