// 명문장 스와이프 파일 — 책·글·영화에서 인상 깊은 문장과 표현을 출처·맥락과 함께 수집하고,
//   태그로 분류, 전문 검색으로 찾고, 무작위 한 문장을 "영감"으로 띄운다.
//   수집한 문장은 스니펫 라이브러리 / 수집함 / 프로젝트 바인더로 보낼 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. 영속은 localStorage.
//   Web API: clipboard(복사·붙여넣기 파싱)·speechSynthesis(낭독, 미지원 graceful) 사용,
//   언마운트 시 speechSynthesis.cancel() 로 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToLibrary, addToStash, hasStash, addToProject, hasProjectBridge, openToolLinked,
  Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'swipe-file',
  name: '명문장 스와이프 파일',
  icon: '✂️',
  group: '영감·발상',
  intro: '인상 깊은 문장·표현을 출처와 함께 모으고, 무작위로 띄워 영감을 얻으세요',
  w: 720,
  h: 660,
}

// ───────────────────────── 데이터 모델 ─────────────────────────
interface Entry {
  id: string
  text: string            // 인용·표현 본문(필수)
  source?: string         // 출처(책·글·영화·인물)
  author?: string         // 저자·말한 사람
  page?: string           // 페이지·위치(예: p.42, 03:12)
  note?: string           // 왜 인상 깊었나 / 내 메모
  tags: string[]
  category: string        // 분류(문장·표현·어휘·대사·문단 …)
  fav: boolean
  color: string           // 카드 강조색(스와이프 무드)
  created: number
  updated: number
  seen: number            // 영감 모드에서 노출된 횟수
  love: number            // ♥ 반응 횟수(자주 곱씹은 문장)
}

const LS = 'sry:tool:swipe-file'
const LS_V = 'sry:tool:swipe-file:view' // 보기 설정(탭·정렬 등)

const CATEGORIES = [
  { key: 'sentence', label: '문장', icon: '📝' },
  { key: 'phrase', label: '표현', icon: '🔤' },
  { key: 'word', label: '어휘', icon: '🈯' },
  { key: 'dialogue', label: '대사', icon: '💬' },
  { key: 'passage', label: '문단', icon: '📜' },
  { key: 'metaphor', label: '비유·이미지', icon: '🌈' },
  { key: 'opening', label: '첫 문장', icon: '🚪' },
  { key: 'closing', label: '끝 문장', icon: '🏁' },
] as const

const COLORS = ['#4a76d4', '#d4794a', '#4ab07a', '#9b59b6', '#d4a14a', '#d44a6e', '#4ab5c4', '#7a7f87']

const catLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? k
const catIcon = (k: string) => CATEGORIES.find((c) => c.key === k)?.icon ?? '📌'

// 출처 자동 정리 — "이름, 『책』" 형태로 보여줄 한 줄 문자열
function citationOf(e: Entry): string {
  const bits: string[] = []
  if (e.author) bits.push(e.author)
  if (e.source) bits.push(`『${e.source}』`)
  if (e.page) bits.push(e.page)
  return bits.join(', ')
}

function uid(): string {
  return 'sw_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function nowSample(): Entry[] {
  // 첫 실행 시 사용법을 보여주는 예시 3개(저작권 안전·공용/직접 작성).
  const t = Date.now()
  const mk = (p: Partial<Entry>): Entry => ({
    id: uid(), text: '', tags: [], category: 'sentence', fav: false,
    color: COLORS[Math.floor(Math.random() * COLORS.length)], created: t, updated: t, seen: 0, love: 0, ...p,
  })
  return [
    mk({
      text: '시작이 반이다.',
      author: '아리스토텔레스', source: '정치학', category: 'phrase',
      note: '미루는 마음이 들 때 떠올릴 한마디.',
      tags: ['시작', '용기'], color: '#4ab07a',
    }),
    mk({
      text: '인생은 가까이서 보면 비극이지만 멀리서 보면 희극이다.',
      author: '찰리 채플린', category: 'sentence',
      note: '거리감·시점 전환을 다룬 장면에 변주해 쓸 만함.',
      tags: ['시점', '아이러니'], color: '#9b59b6',
    }),
    mk({
      text: '가장 어두운 밤도 끝나고 해는 떠오른다.',
      author: '빅토르 위고', source: '레 미제라블', category: 'sentence',
      note: '희망의 이미지. 결말 직전 분위기 전환에.',
      tags: ['희망', '이미지'], color: '#d4a14a',
    }),
  ]
}

// 붙여넣기·일괄 입력 파서.
//  - 빈 줄로 항목 구분, 항목 마지막에 "— 저자, 출처" 또는 "- 저자" 가 있으면 분리.
//  - 한 줄 안에 따옴표가 있으면 따옴표 안쪽을 본문으로.
function parseBulk(raw: string): { text: string; author?: string; source?: string }[] {
  const blocks = raw.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const out: { text: string; author?: string; source?: string }[] = []
  const dashRe = /\s*[—–-]{1,2}\s*(.+)$/ // 끝에 붙은 출처 표기
  for (const block of blocks) {
    // 블록 내부의 줄들을 합치되, 마지막 줄이 출처 표기면 분리
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    let author: string | undefined
    let source: string | undefined
    let body = block
    const last = lines[lines.length - 1]
    const m = last.match(/^[—–-]{1,2}\s*(.+)$/)
    if (m && lines.length > 1) {
      body = lines.slice(0, -1).join(' ')
      const attr = m[1]
      const parts = attr.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      author = parts[0]
      if (parts[1]) source = parts[1].replace(/[『』「」"“”]/g, '')
    } else {
      // 끝에 — 출처 가 같은 줄에 붙은 경우
      const inline = body.match(dashRe)
      if (inline && body.indexOf(inline[1]) > 4) {
        const attr = inline[1]
        body = body.slice(0, body.length - inline[0].length).trim()
        const parts = attr.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
        author = parts[0]
        if (parts[1]) source = parts[1].replace(/[『』「」"“”]/g, '')
      } else {
        body = lines.join(' ')
      }
    }
    body = body.replace(/^["“”'']+|["“”'']+$/g, '').trim()
    if (body) out.push({ text: body, author, source })
  }
  return out
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SwipeFile({ payload }: { payload?: Record<string, unknown> }) {
  // ── 영속 상태 ──
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          // 누락 필드 보정(구버전 호환)
          return arr.map((x: Partial<Entry>): Entry => ({
            id: x.id || uid(),
            text: String(x.text || ''),
            source: x.source, author: x.author, page: x.page, note: x.note,
            tags: Array.isArray(x.tags) ? x.tags : [],
            category: x.category || 'sentence',
            fav: !!x.fav,
            color: x.color || COLORS[0],
            created: x.created || Date.now(),
            updated: x.updated || Date.now(),
            seen: x.seen || 0,
            love: x.love || 0,
          })).filter((e) => e.text)
        }
      }
    } catch { /* noop */ }
    return nowSample()
  })

  // ── 보기 상태 ──
  const [tab, setTab] = useState<'inspire' | 'collect' | 'browse'>('inspire')
  const [query, setQuery] = useState('')
  const [filterCat, setFilterCat] = useState<string>('') // '' = 전체
  const [filterTag, setFilterTag] = useState<string>('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [sort, setSort] = useState<'recent' | 'created' | 'alpha' | 'love'>('recent')

  // ── 영감(스와이프) 상태 ──
  const [current, setCurrent] = useState<Entry | null>(null)
  const [revealNote, setRevealNote] = useState(false)
  const deckRef = useRef<string[]>([]) // 셔플된 id 큐(반복 방지)

  // ── 수집/편집 입력 상태 ──
  const blank = useCallback((): Partial<Entry> => ({
    text: '', source: '', author: '', page: '', note: '',
    tags: [], category: 'sentence', color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }), [])
  const [draft, setDraft] = useState<Partial<Entry>>(blank())
  const [tagInput, setTagInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const stashOn = hasStash()
  const bridgeOn = hasProjectBridge()

  // ── 영속 저장 ──
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(entries)) } catch { /* 용량 초과 무시 */ }
  }, [entries])
  useEffect(() => {
    try {
      localStorage.setItem(LS_V, JSON.stringify({ tab, sort, filterCat, onlyFav }))
    } catch { /* noop */ }
  }, [tab, sort, filterCat, onlyFav])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_V)
      if (raw) {
        const v = JSON.parse(raw)
        if (v.tab) setTab(v.tab)
        if (v.sort) setSort(v.sort)
        if (typeof v.filterCat === 'string') setFilterCat(v.filterCat)
        if (typeof v.onlyFav === 'boolean') setOnlyFav(v.onlyFav)
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  // ── 외부에서 payload 로 문장이 전달되면 수집 탭에 채운다(다른 도구 → 스와이프 파일) ──
  useEffect(() => {
    if (!payload) return
    const text = (payload.text ?? payload.quote ?? payload.snippet) as string | undefined
    if (text && String(text).trim()) {
      setDraft({
        ...blank(),
        text: String(text).trim(),
        author: (payload.author as string) || '',
        source: (payload.source as string) || '',
      })
      setTab('collect')
      setEditingId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ── speechSynthesis 정리(언마운트) ──
  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel() } catch { /* noop */ }
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  // ───────── 파생 데이터 ─────────
  const allTags = useMemo(() => {
    const m = new Map<string, number>()
    entries.forEach((e) => e.tags.forEach((t) => m.set(t, (m.get(t) || 0) + 1)))
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [entries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = entries
    if (filterCat) list = list.filter((e) => e.category === filterCat)
    if (filterTag) list = list.filter((e) => e.tags.includes(filterTag))
    if (onlyFav) list = list.filter((e) => e.fav)
    if (q) {
      list = list.filter((e) =>
        e.text.toLowerCase().includes(q) ||
        (e.source || '').toLowerCase().includes(q) ||
        (e.author || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)))
    }
    const arr = [...list]
    switch (sort) {
      case 'created': arr.sort((a, b) => b.created - a.created); break
      case 'alpha': arr.sort((a, b) => a.text.localeCompare(b.text)); break
      case 'love': arr.sort((a, b) => b.love - a.love || b.updated - a.updated); break
      default: arr.sort((a, b) => b.updated - a.updated)
    }
    return arr
  }, [entries, query, filterCat, filterTag, onlyFav, sort])

  // ───────── 영감(스와이프) 로직 ─────────
  // 현재 필터(전체/카테고리/즐겨찾기)를 존중하되, 검색어는 무시한 풀에서 무작위 노출.
  const inspirePool = useMemo(() => {
    let pool = entries
    if (filterCat) pool = pool.filter((e) => e.category === filterCat)
    if (onlyFav) pool = pool.filter((e) => e.fav)
    return pool
  }, [entries, filterCat, onlyFav])

  const drawNext = useCallback(() => {
    const pool = inspirePool
    if (!pool.length) { setCurrent(null); return }
    // 셔플 큐가 비었으면 다시 채움(같은 한 바퀴 안에서 중복 안 띄움)
    if (deckRef.current.length === 0) {
      const ids = pool.map((e) => e.id)
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
          ;[ids[i], ids[j]] = [ids[j], ids[i]]
      }
      // 직전 카드가 큐 맨 앞이면 뒤로 미룸
      if (current && ids.length > 1 && ids[ids.length - 1] === current.id) {
        ids.unshift(ids.pop() as string)
      }
      deckRef.current = ids
    }
    let nextId = deckRef.current.pop()
    // 풀에서 빠진(삭제된) id 건너뛰기
    while (nextId && !pool.some((e) => e.id === nextId)) nextId = deckRef.current.pop()
    if (!nextId) { setCurrent(null); return }
    setRevealNote(false)
    setCurrent(pool.find((e) => e.id === nextId) || null)
    // 노출 횟수 +1
    setEntries((prev) => prev.map((e) => (e.id === nextId ? { ...e, seen: e.seen + 1 } : e)))
  }, [inspirePool, current])

  // 영감 탭 진입/풀 변화 시 카드가 없으면 한 장 뽑기
  useEffect(() => {
    if (tab === 'inspire' && !current && inspirePool.length) drawNext()
    // 현재 카드가 풀에서 사라졌으면 새로 뽑기
    if (tab === 'inspire' && current && !inspirePool.some((e) => e.id === current.id)) drawNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, inspirePool])

  // ───────── CRUD ─────────
  const startEdit = (e: Entry) => {
    setEditingId(e.id)
    setDraft({ ...e })
    setTagInput('')
    setTab('collect')
  }

  const resetDraft = () => { setDraft(blank()); setEditingId(null); setTagInput('') }

  const commitTagInput = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (!t) return
    const cur = draft.tags || []
    if (!cur.includes(t)) setDraft((d) => ({ ...d, tags: [...(d.tags || []), t] }))
    setTagInput('')
  }

  const saveDraft = () => {
    const text = (draft.text || '').trim()
    if (!text) { flash('문장을 입력해 주세요.'); return }
    // tagInput 에 남은 값도 흡수
    let tags = draft.tags || []
    const pending = tagInput.trim().replace(/^#/, '')
    if (pending && !tags.includes(pending)) tags = [...tags, pending]
    const t = Date.now()
    if (editingId) {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? {
        ...e,
        text,
        source: (draft.source || '').trim() || undefined,
        author: (draft.author || '').trim() || undefined,
        page: (draft.page || '').trim() || undefined,
        note: (draft.note || '').trim() || undefined,
        tags,
        category: draft.category || 'sentence',
        color: draft.color || e.color,
        updated: t,
      } : e)))
      flash('수정했습니다.')
    } else {
      const e: Entry = {
        id: uid(), text,
        source: (draft.source || '').trim() || undefined,
        author: (draft.author || '').trim() || undefined,
        page: (draft.page || '').trim() || undefined,
        note: (draft.note || '').trim() || undefined,
        tags,
        category: draft.category || 'sentence',
        fav: false,
        color: draft.color || COLORS[0],
        created: t, updated: t, seen: 0, love: 0,
      }
      setEntries((prev) => [e, ...prev])
      flash('스와이프 파일에 담았습니다.')
    }
    setTagInput('')
    resetDraft()
  }

  const remove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (current?.id === id) drawNext()
    if (editingId === id) resetDraft()
  }

  const toggleFav = (id: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, fav: !e.fav, updated: Date.now() } : e)))

  const love = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, love: e.love + 1, updated: Date.now() } : e)))
    flash('♥ 곱씹은 문장에 추가했어요.')
  }

  const importBulk = () => {
    const parsed = parseBulk(bulkText)
    if (!parsed.length) { flash('인식된 문장이 없습니다. 빈 줄로 항목을 나눠 보세요.'); return }
    const t = Date.now()
    const items: Entry[] = parsed.map((p, i) => ({
      id: uid(), text: p.text, source: p.source, author: p.author,
      tags: [], category: 'sentence', fav: false,
      color: COLORS[(i) % COLORS.length], created: t + i, updated: t + i, seen: 0, love: 0,
    }))
    setEntries((prev) => [...items, ...prev])
    setBulkText(''); setBulkOpen(false)
    flash(`${items.length}개 문장을 가져왔습니다.`)
  }

  const pasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText()
      if (txt) { setBulkText((b) => (b ? b + '\n\n' + txt : txt)) }
      else flash('클립보드가 비어 있습니다.')
    } catch { flash('클립보드 읽기를 사용할 수 없습니다. 직접 붙여넣어 주세요.') }
  }

  // ── 클립보드/낭독 ──
  const plainOf = (e: Entry) => {
    const c = citationOf(e)
    return c ? `“${e.text}” — ${c}` : `“${e.text}”`
  }
  const copy = (e: Entry) => {
    navigator.clipboard?.writeText(plainOf(e))
      .then(() => flash('복사했습니다.'))
      .catch(() => flash('복사를 사용할 수 없습니다.'))
  }
  const speak = (e: Entry) => {
    const synth = window.speechSynthesis
    if (!synth) { flash('이 브라우저는 음성 낭독을 지원하지 않습니다.'); return }
    try {
      synth.cancel()
      const u = new SpeechSynthesisUtterance(e.text)
      u.lang = /[가-힣]/.test(e.text) ? 'ko-KR' : 'en-US'
      u.rate = 0.95
      synth.speak(u)
    } catch { flash('낭독을 시작할 수 없습니다.') }
  }

  // ── 연계: 스니펫 / 수집함 / 프로젝트 ──
  const toSnippet = (e: Entry) => {
    addToLibrary('snippets', {
      text: plainOf(e),
      source: citationOf(e) || '명문장 스와이프 파일',
      tags: [catLabel(e.category), ...e.tags],
    })
    flash('스니펫 라이브러리에 저장했습니다.')
  }
  const toStash = (e: Entry) => {
    addToStash({ kind: 'note', label: citationOf(e) || '명문장', text: plainOf(e) })
    flash('수집함에 담았습니다.')
  }
  const toProject = (e: Entry) => {
    const body = [
      `<blockquote>“${escapeHtml(e.text)}”</blockquote>`,
      citationOf(e) ? `<p>— ${escapeHtml(citationOf(e))}</p>` : '',
      e.note ? `<p><b>메모</b><br/>${escapeHtml(e.note)}</p>` : '',
      e.tags.length ? `<p>${e.tags.map((t) => '#' + escapeHtml(t)).join(' ')}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '명문장',
      title: e.text.length > 40 ? e.text.slice(0, 40) + '…' : e.text,
      bodyHtml: body,
      meta: { 출처: citationOf(e) || '', 분류: catLabel(e.category) },
    })
    if (id) flash('프로젝트 자료 〈명문장〉에 추가했습니다.')
  }

  // 전체 내보내기(텍스트로 복사) — 백업/공유용
  const exportAll = () => {
    const txt = entries.map((e) => {
      const c = citationOf(e)
      const lines = [`“${e.text}”`]
      if (c) lines.push(`— ${c}`)
      if (e.note) lines.push(`메모: ${e.note}`)
      if (e.tags.length) lines.push(e.tags.map((t) => '#' + t).join(' '))
      return lines.join('\n')
    }).join('\n\n')
    navigator.clipboard?.writeText(txt)
      .then(() => flash(`${entries.length}개 문장을 클립보드로 내보냈습니다.`))
      .catch(() => flash('내보내기를 사용할 수 없습니다.'))
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px', flexWrap: 'wrap' }
  const tabBtn = (on: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'var(--accent)' : 'var(--panel)', color: on ? '#fff' : 'var(--muted)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  })
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 14px' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const tagChip = (on: boolean): React.CSSProperties => ({
    fontSize: 11, padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--panel)',
    color: on ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap',
  })

  // ───────────────────────── 렌더: 카드 한 장(목록용) ─────────────────────────
  const renderCard = (e: Entry) => (
    <div key={e.id} style={{
      background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `4px solid ${e.color}`,
      borderRadius: 10, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}><Emoji e={catIcon(e.category)} /> {catLabel(e.category)}</span>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, fontWeight: 500, wordBreak: 'keep-all', flex: 1 }}>“{e.text}”</div>
        <button className="minibtn" title={e.fav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(e.id)}
          style={{ flexShrink: 0, borderColor: e.fav ? 'var(--accent)' : 'var(--border)' }}>{e.fav ? '★' : '☆'}</button>
      </div>
      {citationOf(e) && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>— {citationOf(e)}</div>}
      {e.note && <div style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--panel)', borderRadius: 8, padding: '6px 9px', lineHeight: 1.5 }}><Emoji e="💭" /> {e.note}</div>}
      {e.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {e.tags.map((t) => (
            <span key={t} style={tagChip(filterTag === t)} onClick={() => { setFilterTag((p) => (p === t ? '' : t)); setTab('browse') }}>#{t}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="minibtn" onClick={() => copy(e)}><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={() => speak(e)}><Emoji e="🔊" /> 낭독</button>
        <button className="minibtn" onClick={() => love(e.id)} title="자주 곱씹는 문장">♥ {e.love > 0 ? e.love : ''}</button>
        <button className="minibtn" onClick={() => startEdit(e)}><Emoji e="✏️" /> 편집</button>
        <button className="minibtn danger" onClick={() => remove(e.id)} title="삭제"><Emoji e="🗑️" /></button>
        <span style={{ flex: 1 }} />
        <button className="linkbtn" onClick={() => toSnippet(e)} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
        {stashOn && <button className="linkbtn" onClick={() => toStash(e)}><Emoji e="🧺" /> 수집함에 담기</button>}
        {bridgeOn && <button className="linkbtn" onClick={() => toProject(e)}><Emoji e="📄" /> 프로젝트에 추가</button>}
      </div>
    </div>
  )

  // ───────────────────────── 렌더 ─────────────────────────
  return (
    <div style={wrap}>
      {/* 헤더: 탭 + 카운트 */}
      <div style={head}>
        <button style={tabBtn(tab === 'inspire')} onClick={() => setTab('inspire')}><Emoji e="✨" /> 영감</button>
        <button style={tabBtn(tab === 'collect')} onClick={() => { setTab('collect') }}><Emoji e="➕" /> 담기</button>
        <button style={tabBtn(tab === 'browse')} onClick={() => setTab('browse')}><Emoji e="📚" /> 모음 {entries.length > 0 && `(${entries.length})`}</button>
        <span style={{ flex: 1 }} />
        {tab === 'browse' && entries.length > 0 && (
          <button className="minibtn" onClick={exportAll} title="전체를 텍스트로 클립보드에 복사"><Emoji e="⬇️" /> 내보내기</button>
        )}
      </div>

      {/* ───────── 영감 탭 ───────── */}
      {tab === 'inspire' && (
        <div style={body}>
          {/* 영감 풀 필터(카테고리·즐겨찾기) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <button className="minibtn" onClick={() => { setFilterCat(''); deckRef.current = [] }}
              style={{ borderColor: !filterCat ? 'var(--accent)' : 'var(--border)', color: !filterCat ? 'var(--text)' : 'var(--muted)' }}>전체</button>
            {CATEGORIES.map((c) => (
              <button key={c.key} className="minibtn" onClick={() => { setFilterCat((p) => (p === c.key ? '' : c.key)); deckRef.current = [] }}
                style={{ borderColor: filterCat === c.key ? 'var(--accent)' : 'var(--border)', color: filterCat === c.key ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
            ))}
            <button className="minibtn" onClick={() => { setOnlyFav((v) => !v); deckRef.current = [] }}
              style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
          </div>

          {inspirePool.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 16px', lineHeight: 1.7 }}>
              {entries.length === 0
                ? <>아직 모은 문장이 없습니다.<br />{emojify('‘➕ 담기’ 탭에서 인상 깊은 문장을 추가해 보세요.')}</>
                : <>이 필터에 해당하는 문장이 없습니다.<br />필터를 바꾸거나 즐겨찾기를 해제해 보세요.</>}
              {entries.length === 0 && <div style={{ marginTop: 14 }}><button className="btn-primary" onClick={() => setTab('collect')}>문장 담으러 가기</button></div>}
            </div>
          ) : current ? (
            <div
              style={{
                background: 'var(--paper)', border: '1px solid var(--border)',
                borderTop: `5px solid ${current.color}`, borderRadius: 14, padding: '26px 24px',
                display: 'flex', flexDirection: 'column', gap: 16, minHeight: 220,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: current.color, fontWeight: 700 }}><Emoji e={catIcon(current.category)} /> {catLabel(current.category)}</span>
                {current.seen > 1 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {current.seen}번째 마주침</span>}
                <span style={{ flex: 1 }} />
                <button className="minibtn" title={current.fav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(current.id)}
                  style={{ borderColor: current.fav ? 'var(--accent)' : 'var(--border)' }}>{current.fav ? '★' : '☆'}</button>
              </div>

              <div style={{ fontSize: 22, lineHeight: 1.55, fontWeight: 600, wordBreak: 'keep-all', flex: 1, display: 'flex', alignItems: 'center' }}>
                “{current.text}”
              </div>

              {citationOf(current) && <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'right' }}>— {citationOf(current)}</div>}

              {current.note && (
                revealNote
                  ? <div style={{ fontSize: 13, lineHeight: 1.55, background: 'var(--panel)', borderRadius: 10, padding: '10px 12px' }}><Emoji e="💭" /> {current.note}</div>
                  : <button className="minibtn" onClick={() => setRevealNote(true)} style={{ alignSelf: 'flex-start' }}><Emoji e="💭" /> 내 메모 보기</button>
              )}

              {current.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {current.tags.map((t) => <span key={t} style={tagChip(false)} onClick={() => { setFilterTag(t); setTab('browse') }}>#{t}</span>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn-primary" onClick={drawNext}><Emoji e="🔀" /> 다음 문장</button>
                <button className="minibtn" onClick={() => copy(current)}><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={() => speak(current)}><Emoji e="🔊" /> 낭독</button>
                <button className="minibtn" onClick={() => love(current.id)} title="자주 곱씹는 문장">♥ {current.love > 0 ? current.love : ''}</button>
                <button className="minibtn" onClick={() => startEdit(current)}><Emoji e="✏️" /> 편집</button>
              </div>

              <div className="linkbar">
                <span className="linkbar-label">보내기:</span>
                <button className="linkbtn" onClick={() => toSnippet(current)}><Emoji e="✂️" /> 스니펫</button>
                {stashOn && <button className="linkbtn" onClick={() => toStash(current)}><Emoji e="🧺" /> 수집함에 담기</button>}
                {bridgeOn && <button className="linkbtn" onClick={() => toProject(current)}><Emoji e="📄" /> 프로젝트에 추가</button>}
                <button className="linkbtn" onClick={() => openToolLinked('warmup-prompt', { text: current.text })} title="이 문장으로 글쓰기 워밍업 열기"><Emoji e="🏃" /> 워밍업으로</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              <button className="btn-primary" onClick={drawNext}><Emoji e="✨" /> 문장 띄우기</button>
            </div>
          )}

          <div style={{ ...hint, marginTop: 14 }}>
            ‘다음 문장’으로 무작위 한 문장을 띄워 영감을 얻으세요. 한 바퀴를 다 돌 때까지 같은 문장이 반복되지 않습니다.
            마음을 울린 문장엔 ♥를, 다시 보고 싶은 문장엔 ★를 남겨 두세요.
          </div>
        </div>
      )}

      {/* ───────── 담기/편집 탭 ───────── */}
      {tab === 'collect' && (
        <div style={body}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{editingId ? <><Emoji e="✏️" /> 문장 편집</> : <><Emoji e="➕" /> 새 문장 담기</>}</div>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setBulkOpen((v) => !v)}>{bulkOpen ? '한 개씩 입력' : <><Emoji e="📥" /> 여러 개 한 번에</>}</button>
            </div>

            {/* 일괄 입력 */}
            {bulkOpen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={hint}>
                  여러 문장을 <b>빈 줄</b>로 구분해 붙여넣으세요. 문장 끝에 <code>— 저자, 출처</code> 를 적으면 자동으로 분리됩니다.
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'“시작이 반이다.”\n— 아리스토텔레스, 정치학\n\n가장 어두운 밤도 끝나고 해는 떠오른다.\n— 빅토르 위고'}
                  style={{ ...inputStyle, minHeight: 150, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={importBulk} disabled={!bulkText.trim()}><Emoji e="📥" /> 가져오기</button>
                  <button className="minibtn" onClick={pasteFromClipboard}><Emoji e="📋" /> 클립보드에서 붙여넣기</button>
                  <button className="minibtn" onClick={() => setBulkText('')} disabled={!bulkText}>지우기</button>
                  <span style={{ ...hint, marginLeft: 'auto', alignSelf: 'center' }}>
                    {bulkText.trim() ? `${parseBulk(bulkText).length}개 인식` : ''}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={draft.text || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  placeholder="인상 깊은 문장·표현을 그대로 적어 주세요"
                  style={{ ...inputStyle, minHeight: 84, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55, fontSize: 14.5 }}
                />

                {/* 분류 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORIES.map((c) => {
                    const on = (draft.category || 'sentence') === c.key
                    return (
                      <button key={c.key} className="minibtn" onClick={() => setDraft((d) => ({ ...d, category: c.key }))}
                        style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
                    )
                  })}
                </div>

                {/* 출처 메타 */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input style={{ ...inputStyle, flex: '1 1 140px', width: 'auto' }} value={draft.author || ''} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} placeholder="저자·말한 사람" />
                  <input style={{ ...inputStyle, flex: '1 1 160px', width: 'auto' }} value={draft.source || ''} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))} placeholder="출처(책·글·영화)" />
                  <input style={{ ...inputStyle, flex: '0 1 110px', width: 'auto' }} value={draft.page || ''} onChange={(e) => setDraft((d) => ({ ...d, page: e.target.value }))} placeholder="위치(p.42)" />
                </div>

                {/* 메모 */}
                <textarea
                  value={draft.note || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  placeholder="왜 인상 깊었나요? 어떻게 쓸 수 있을까요? (선택)"
                  style={{ ...inputStyle, minHeight: 54, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />

                {/* 태그 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1, width: 'auto' }}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTagInput() } }}
                      placeholder="태그 입력 후 Enter (예: 희망, 시점, 비유)"
                    />
                    <button className="minibtn" onClick={commitTagInput} disabled={!tagInput.trim()}>＋ 태그</button>
                  </div>
                  {(draft.tags && draft.tags.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {draft.tags.map((t) => (
                        <span key={t} style={{ ...tagChip(true) }} onClick={() => setDraft((d) => ({ ...d, tags: (d.tags || []).filter((x) => x !== t) }))} title="클릭하면 제거">#{t} ✕</span>
                      ))}
                    </div>
                  )}
                  {/* 기존 태그 빠른 추가 */}
                  {allTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {allTags.slice(0, 12).filter(([t]) => !(draft.tags || []).includes(t)).map(([t]) => (
                        <span key={t} style={tagChip(false)} onClick={() => setDraft((d) => ({ ...d, tags: [...(d.tags || []), t] }))}>＋ #{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 색상(스와이프 무드) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={hint}>카드 색</span>
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setDraft((d) => ({ ...d, color: c }))} title="카드 강조색"
                      style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: (draft.color === c) ? '3px solid var(--text)' : '2px solid var(--border)' }} />
                  ))}
                </div>

                {/* 저장 */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={saveDraft}>{editingId ? <><Emoji e="✅" /> 수정 저장</> : <><Emoji e="✂️" /> 스와이프 파일에 담기</>}</button>
                  {editingId && <button className="minibtn" onClick={resetDraft}>취소</button>}
                  {!editingId && (draft.text || draft.note || (draft.tags || []).length) && <button className="minibtn" onClick={resetDraft}>비우기</button>}
                </div>
              </>
            )}

            <div style={{ ...hint, marginTop: 4 }}>
              {emojify('모은 문장은 자동 저장됩니다(이 브라우저). 카드의 ‘✂️ 스니펫’으로 라이브러리에, ‘📄 프로젝트에 추가’로 원고 자료에 보낼 수 있어요.')}
            </div>
          </div>
        </div>
      )}

      {/* ───────── 모음(브라우즈) 탭 ───────── */}
      {tab === 'browse' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 검색·정렬 바 */}
          <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="문장·출처·저자·메모·태그 검색" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="minibtn" onClick={() => setFilterCat('')}
                style={{ borderColor: !filterCat ? 'var(--accent)' : 'var(--border)', color: !filterCat ? 'var(--text)' : 'var(--muted)' }}>전체 분류</button>
              {CATEGORIES.map((c) => (
                <button key={c.key} className="minibtn" onClick={() => setFilterCat((p) => (p === c.key ? '' : c.key))}
                  style={{ borderColor: filterCat === c.key ? 'var(--accent)' : 'var(--border)', color: filterCat === c.key ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon} /> {c.label}</button>
              ))}
              <button className="minibtn" onClick={() => setOnlyFav((v) => !v)}
                style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
            </div>
            {/* 태그 필터 */}
            {allTags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={hint}>태그:</span>
                {filterTag && <span style={tagChip(true)} onClick={() => setFilterTag('')}>#{filterTag} ✕</span>}
                {allTags.filter(([t]) => t !== filterTag).slice(0, 14).map(([t, n]) => (
                  <span key={t} style={tagChip(false)} onClick={() => setFilterTag(t)}>#{t} <span style={{ opacity: 0.6 }}>{n}</span></span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={hint}>정렬:</span>
              {([['recent', '최근 수정'], ['created', '담은 순'], ['alpha', '가나다'], ['love', '♥ 많은']] as const).map(([k, label]) => (
                <button key={k} className="minibtn" onClick={() => setSort(k)}
                  style={{ borderColor: sort === k ? 'var(--accent)' : 'var(--border)', color: sort === k ? 'var(--text)' : 'var(--muted)' }}>{label}</button>
              ))}
              <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length} / {entries.length}개</span>
            </div>
          </div>

          {/* 목록 */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 16px', lineHeight: 1.7 }}>
                {entries.length === 0
                  ? <>{emojify('아직 모은 문장이 없습니다. ‘➕ 담기’에서 시작하세요.')}</>
                  : <>검색·필터에 맞는 문장이 없습니다.</>}
              </div>
            ) : filtered.map(renderCard)}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--paper)', padding: '8px 14px', borderRadius: 999,
          fontSize: 12.5, boxShadow: 'var(--shadow-md)', zIndex: 5, maxWidth: '88%', textAlign: 'center',
        }}>{toast}</div>
      )}
    </div>
  )
}
