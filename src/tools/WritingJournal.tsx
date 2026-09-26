// 집필 저널 — 날짜별 집필 일지(쓴 양/기분/날씨·집중도·메모·태그)를 작성·저장하고,
// 달력 보기와 목록(타임라인) 보기를 전환하며, 연속 기록(스트릭)·통계·검색을 제공한다.
// 한 항목을 또는 기간 전체를 addToProject 로 프로젝트 자료에 일지 모음 문서로 내보낼 수 있다.
// 규약: react 와 './linkbus' 외 import 없음 / 외부 네트워크 없음 / localStorage 영속 /
//       미지원(저장 거부 등) graceful / 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji, emojify } from './linkbus'

export const meta = { id: 'writing-journal', name: '집필 저널', icon: '📔', group: '집중·생산성', intro: '날짜별로 쓴 양·기분·메모를 적는 집필 일지. 달력/목록 보기와 연속 기록', w: 760, h: 640 }

const NS = 'sry:tool:writing-journal:'
const KEY_ENTRIES = NS + 'entries'    // { 'YYYY-MM-DD': Entry }
const KEY_GOAL = NS + 'goal'          // 일일 목표 단어수
const KEY_PROMPT = NS + 'prompt'      // 마지막으로 본 회고 질문 인덱스
const DEFAULT_GOAL = 800

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// 기분 5단계(이모지·라벨·색). value 가 클수록 좋음.
const MOODS: { v: number; emoji: string; label: string; color: string }[] = [
  { v: 1, emoji: '😖', label: '괴로움', color: '#e15554' },
  { v: 2, emoji: '😕', label: '버거움', color: '#e88c3a' },
  { v: 3, emoji: '😐', label: '그저그럼', color: '#c9a227' },
  { v: 4, emoji: '🙂', label: '괜찮음', color: '#5a9e54' },
  { v: 5, emoji: '😄', label: '신남', color: '#3a8ee8' },
]
const moodOf = (v?: number) => MOODS.find((m) => m.v === v)

// 집중도 3단계
const FOCUS: { v: number; emoji: string; label: string }[] = [
  { v: 1, emoji: '🌫️', label: '산만' },
  { v: 2, emoji: '🌤️', label: '보통' },
  { v: 3, emoji: '🎯', label: '몰입' },
]

// 회고 질문(로컬, 저작권 무관 — 직접 작성). 새 항목 만들 때 영감.
const PROMPTS = [
  '오늘 가장 잘 풀린 장면이나 문장은?',
  '막혔던 부분은 무엇이고 어떻게 넘겼나?',
  '내일의 나에게 남기는 한 문장.',
  '오늘 인물에 대해 새로 알게 된 점은?',
  '버린 아이디어 중 아까운 것은?',
  '오늘의 집필을 한 단어로 표현하면?',
  '다음에 쓸 첫 문장을 미리 적어둔다면?',
  '오늘 가장 방해가 된 것은 무엇이었나?',
  '읽거나 본 것 중 영감이 된 것은?',
  '지금 이야기에서 가장 설레는 부분은?',
]

interface Entry {
  date: string          // 'YYYY-MM-DD'
  words: number         // 그날 쓴 양(자/단어)
  minutes: number       // 집필 시간(분)
  mood?: number         // 1~5
  focus?: number        // 1~3
  note: string          // 자유 메모
  tags: string[]        // 태그
  updated: number
}
type EntryMap = Record<string, Entry>

// 로컬 타임존 기준 'YYYY-MM-DD'. UTC 변환 날짜 밀림 방지.
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const DAY_MS = 86400000
function parseKey(k: string): Date | null {
  const [y, m, d] = k.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function emptyEntry(date: string): Entry {
  return { date, words: 0, minutes: 0, note: '', tags: [], updated: 0 }
}

function loadEntries(): EntryMap {
  try {
    const raw = localStorage.getItem(KEY_ENTRIES)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const out: EntryMap = {}
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (!v || typeof v !== 'object') continue
        out[k] = {
          date: k,
          words: Number.isFinite(v.words) && v.words >= 0 ? Math.round(v.words) : 0,
          minutes: Number.isFinite(v.minutes) && v.minutes >= 0 ? Math.round(v.minutes) : 0,
          mood: v.mood >= 1 && v.mood <= 5 ? v.mood : undefined,
          focus: v.focus >= 1 && v.focus <= 3 ? v.focus : undefined,
          note: typeof v.note === 'string' ? v.note : '',
          tags: Array.isArray(v.tags) ? v.tags.filter((t: unknown) => typeof t === 'string').slice(0, 12) : [],
          updated: Number.isFinite(v.updated) ? v.updated : 0,
        }
      }
      return out
    }
  } catch { /* 손상/미지원 graceful */ }
  return {}
}
function saveEntries(m: EntryMap) {
  try { localStorage.setItem(KEY_ENTRIES, JSON.stringify(m)) } catch { /* 저장 거부 graceful */ }
}
function loadGoal(): number {
  try {
    const v = localStorage.getItem(KEY_GOAL)
    if (v) { const n = parseInt(v, 10); if (Number.isFinite(n) && n >= 0) return n }
  } catch { /* graceful */ }
  return DEFAULT_GOAL
}

// 항목이 "비어있는지"(저장 가치 없음) 판정
function isBlank(e: Entry): boolean {
  return e.words === 0 && e.minutes === 0 && !e.mood && !e.focus && !e.note.trim() && e.tags.length === 0
}

// 현재 연속일: 오늘(또는 어제)부터 거꾸로 "기록 있는 날" 연속 카운트
function currentStreak(m: EntryMap): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let count = 0
  let cursor = m[dayKey(today)] ? today : new Date(today.getTime() - DAY_MS)
  while (m[dayKey(cursor)]) {
    count++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return count
}
function longestStreak(m: EntryMap): number {
  const keys = Object.keys(m).sort()
  if (keys.length === 0) return 0
  let best = 1, run = 1
  for (let i = 1; i < keys.length; i++) {
    const a = parseKey(keys[i - 1])!, b = parseKey(keys[i])!
    const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS)
    if (diff === 1) { run++; if (run > best) best = run }
    else if (diff !== 0) run = 1
  }
  return best
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function fmtDateLong(k: string): string {
  const d = parseKey(k)
  if (!d) return k
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`
}
function fmtMin(min: number): string {
  if (min <= 0) return '0분'
  const h = Math.floor(min / 60), m = min % 60
  return (h ? `${h}시간 ` : '') + (m || !h ? `${m}분` : '').trim() || `${h}시간`
}

type ViewMode = 'cal' | 'list'

export default function WritingJournal({ payload }: { payload?: Record<string, unknown> }) {
  const [entries, setEntries] = useState<EntryMap>(loadEntries)
  const [goal, setGoal] = useState<number>(loadGoal)
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayKey = dayKey(today)

  const [view, setView] = useState<ViewMode>('cal')
  const [month, setMonth] = useState<{ y: number; m: number }>(() => ({ y: today.getFullYear(), m: today.getMonth() }))
  const [selected, setSelected] = useState<string>(() => {
    const p = payload?.date
    return typeof p === 'string' && parseKey(p) ? p : todayKey
  })
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [note, setNote] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [toast, setToast] = useState('')

  // 편집 중인 항목(선택일 기준) — 작업용 상태
  const [draft, setDraft] = useState<Entry>(() => emptyEntry(todayKey))
  const [tagInput, setTagInput] = useState('')
  const [prompt, setPrompt] = useState<string>(() => {
    try { const i = parseInt(localStorage.getItem(KEY_PROMPT) || '', 10); if (Number.isFinite(i)) return PROMPTS[i % PROMPTS.length] } catch { /* */ }
    return PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  })

  const flashTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 선택일 변경 → 드래프트 동기화
  useEffect(() => {
    const e = entries[selected]
    setDraft(e ? { ...e, tags: [...e.tags] } : emptyEntry(selected))
    setTagInput('')
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // 목표 즉시 저장
  useEffect(() => { try { localStorage.setItem(KEY_GOAL, String(goal)) } catch { /* graceful */ } }, [goal])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === KEY_ENTRIES) {
        const fresh = loadEntries()
        setEntries(fresh)
        // 현재 선택일이 외부에서 바뀌었으면 드래프트도 갱신(단 입력 중 덮어쓰지 않도록 selected 만 반영)
      } else if (ev.key === KEY_GOAL) setGoal(loadGoal())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(''); toastTimer.current = null }, 1800)
  }, [])

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { setSavedFlash(false); flashTimer.current = null }, 1200)
  }, [])

  // ── 저장/삭제 ──
  const persist = useCallback((next: EntryMap) => { setEntries(next); saveEntries(next) }, [])

  const saveDraft = useCallback(() => {
    const e: Entry = { ...draft, date: selected, note, tags: draft.tags, updated: Date.now() }
    setEntries((prev) => {
      const next = { ...prev }
      if (isBlank(e)) { delete next[selected] }
      else next[selected] = e
      saveEntries(next)
      return next
    })
    flashSaved()
  }, [draft, note, selected, flashSaved])

  // note 는 별도 textarea 상태 — 드래프트 로드 시 동기화
  useEffect(() => { setNote(draft.note) }, [draft.date]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteEntry = useCallback((key: string) => {
    setEntries((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }; delete next[key]; saveEntries(next); return next
    })
    if (key === selected) { setDraft(emptyEntry(key)); setNote('') }
    showToast('일지 삭제됨')
  }, [selected, showToast])

  const setField = <K extends keyof Entry>(k: K, v: Entry[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const toggleMood = (v: number) => setDraft((d) => ({ ...d, mood: d.mood === v ? undefined : v }))
  const toggleFocus = (v: number) => setDraft((d) => ({ ...d, focus: d.focus === v ? undefined : v }))

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (!t) return
    setDraft((d) => d.tags.includes(t) || d.tags.length >= 12 ? d : { ...d, tags: [...d.tags, t] })
    setTagInput('')
  }
  const removeTag = (t: string) => setDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== t) }))

  const nextPrompt = () => {
    const idx = (PROMPTS.indexOf(prompt) + 1 + PROMPTS.length) % PROMPTS.length
    setPrompt(PROMPTS[idx])
    try { localStorage.setItem(KEY_PROMPT, String(idx)) } catch { /* */ }
  }
  const insertPrompt = () => {
    setNote((n) => (n.trim() ? n.replace(/\s*$/, '\n\n') : '') + `· ${prompt}\n`)
  }

  // ── 파생 통계 ──
  const allKeys = useMemo(() => Object.keys(entries), [entries])
  const totals = useMemo(() => {
    let words = 0, minutes = 0, moodSum = 0, moodCount = 0
    for (const k of allKeys) {
      const e = entries[k]
      words += e.words; minutes += e.minutes
      if (e.mood) { moodSum += e.mood; moodCount++ }
    }
    return {
      words, minutes, days: allKeys.length,
      avgMood: moodCount ? moodSum / moodCount : 0,
      avgWords: allKeys.length ? Math.round(words / allKeys.length) : 0,
    }
  }, [allKeys, entries])

  const cur = useMemo(() => currentStreak(entries), [entries])
  const longest = useMemo(() => longestStreak(entries), [entries])

  const allTags = useMemo(() => {
    const c: Record<string, number> = {}
    for (const k of allKeys) for (const t of entries[k].tags) c[t] = (c[t] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [allKeys, entries])

  // 이달 통계
  const monthStats = useMemo(() => {
    const prefix = `${month.y}-${String(month.m + 1).padStart(2, '0')}-`
    let words = 0, days = 0, goalMet = 0
    for (const k of allKeys) {
      if (!k.startsWith(prefix)) continue
      const e = entries[k]; words += e.words; days++
      if (goal > 0 && e.words >= goal) goalMet++
    }
    return { words, days, goalMet }
  }, [allKeys, entries, month, goal])

  // 달력 셀
  const cells = useMemo<(Date | null)[]>(() => {
    const first = new Date(month.y, month.m, 1)
    const pad = first.getDay()
    const dim = new Date(month.y, month.m + 1, 0).getDate()
    const arr: (Date | null)[] = []
    for (let i = 0; i < pad; i++) arr.push(null)
    for (let d = 1; d <= dim; d++) arr.push(new Date(month.y, month.m, d))
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [month])

  // 목록(타임라인) — 검색/태그 필터 적용, 최신순
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allKeys
      .filter((k) => {
        const e = entries[k]
        if (tagFilter && !e.tags.includes(tagFilter)) return false
        if (q) {
          const hay = (e.note + ' ' + e.tags.join(' ') + ' ' + k).toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => (a < b ? 1 : -1))
  }, [allKeys, entries, query, tagFilter])

  const goMonth = (delta: number) => setMonth((v) => {
    const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }
  })
  const goTodayBtn = () => { setMonth({ y: today.getFullYear(), m: today.getMonth() }); setSelected(todayKey); setView('cal') }

  const selectDay = (k: string) => {
    // 선택 변경 전 현재 드래프트 자동 저장(입력 손실 방지)
    const e: Entry = { ...draft, date: selected, note, tags: draft.tags, updated: Date.now() }
    setEntries((prev) => {
      const next = { ...prev }
      if (isBlank(e)) delete next[selected]; else next[selected] = e
      saveEntries(next); return next
    })
    setSelected(k)
    const d = parseKey(k)
    if (d && (d.getFullYear() !== month.y || d.getMonth() !== month.m)) setMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  // 달성도 색
  const cellColor = (e?: Entry): string => {
    if (!e) return 'var(--chrome-2)'
    if (e.mood) return moodOf(e.mood)!.color + '33'
    if (e.words > 0 && goal > 0) {
      const r = e.words / goal
      if (r >= 1) return 'color-mix(in srgb, var(--ok) 55%, var(--chrome-2))'
      return 'color-mix(in srgb, var(--ok) 28%, var(--chrome-2))'
    }
    if (e.words > 0 || e.note.trim()) return 'color-mix(in srgb, var(--accent) 22%, var(--chrome-2))'
    return 'var(--chrome-2)'
  }

  // ── 내보내기 ──
  const entryToHtml = (e: Entry): string => {
    const m = moodOf(e.mood), f = FOCUS.find((x) => x.v === e.focus)
    const metaBits = [
      e.words > 0 ? `${e.words.toLocaleString()}자` : '',
      e.minutes > 0 ? fmtMin(e.minutes) : '',
      m ? `${m.emoji} ${m.label}` : '',
      f ? `${f.emoji} ${f.label}` : '',
      goal > 0 && e.words >= goal ? '🎯 목표 달성' : '',
    ].filter(Boolean).join(' · ')
    const noteHtml = e.note.trim()
      ? e.note.trim().split(/\n+/).map((p) => `<p>${escapeHtml(p)}</p>`).join('')
      : ''
    const tagsHtml = e.tags.length ? `<p style="color:#888;">${e.tags.map((t) => '#' + escapeHtml(t)).join(' ')}</p>` : ''
    return [
      `<h3>${escapeHtml(fmtDateLong(e.date))}</h3>`,
      metaBits ? `<p style="color:#666;font-size:13px;">${escapeHtml(metaBits)}</p>` : '',
      noteHtml, tagsHtml,
    ].filter(Boolean).join('')
  }

  const exportRange = (scope: 'one' | 'month' | 'all') => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다'); return }
    let keys: string[]
    let title: string
    if (scope === 'one') {
      const e = entries[selected]
      if (!e) { showToast('이 날짜에 저장된 일지가 없습니다'); return }
      keys = [selected]; title = `집필 일지 — ${fmtDateLong(selected)}`
    } else if (scope === 'month') {
      const prefix = `${month.y}-${String(month.m + 1).padStart(2, '0')}-`
      keys = allKeys.filter((k) => k.startsWith(prefix)).sort()
      if (!keys.length) { showToast('이번 달 일지가 없습니다'); return }
      title = `집필 일지 — ${month.y}년 ${month.m + 1}월`
    } else {
      keys = [...allKeys].sort()
      if (!keys.length) { showToast('저장된 일지가 없습니다'); return }
      title = `집필 일지 모음 (${keys.length}일)`
    }
    const sumWords = keys.reduce((s, k) => s + entries[k].words, 0)
    const header = `<p style="color:#888;font-size:12px;">${keys.length}일 · 누적 ${sumWords.toLocaleString()}자 · 내보낸 날짜 ${escapeHtml(fmtDateLong(todayKey))}</p><hr/>`
    const body = header + keys.map((k) => entryToHtml(entries[k])).join('<hr/>')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 일지', title,
      bodyHtml: body, icon: '📔',
      meta: { 일수: String(keys.length), 누적단어수: String(sumWords) },
    })
    showToast(id ? '프로젝트 자료 〈집필 일지〉에 추가됨' : '추가에 실패했습니다')
  }

  const stashEntry = () => {
    const e = entries[selected]
    if (!e) { showToast('저장된 일지가 없습니다'); return }
    if (!hasStash()) { showToast('수집함에 연결되어 있지 않습니다'); return }
    const text = e.note.trim() || `${e.words}자 · ${fmtMin(e.minutes)}`
    addToStash({ kind: 'note', label: `일지 ${selected}`, text })
    showToast('수집함에 담았습니다')
  }

  const selEntry = entries[selected]
  const selDate = parseKey(selected)
  const isFutureSel = selDate ? selDate.getTime() > today.getTime() : false
  const draftGoalPct = goal > 0 ? Math.round((draft.words / goal) * 100) : 0

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const seg: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 13, cursor: 'pointer', border: 'none', font: 'inherit',
    background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text)',
  })
  const body: React.CSSProperties = { flex: 1, display: 'flex', gap: 14, padding: 14, overflow: 'hidden', minHeight: 0 }
  const leftPane: React.CSSProperties = { flex: '1 1 360px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', minHeight: 0 }
  const rightPane: React.CSSProperties = { flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', minHeight: 0 }
  const statRow: React.CSSProperties = { display: 'flex', gap: 8 }
  const statBox: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }
  const statSub: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }
  const dowRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }
  const editBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const numInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 14 }
  const textArea: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 14, lineHeight: 1.55, resize: 'vertical', minHeight: 92, fontFamily: 'inherit' }
  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '6px 9px', borderRadius: 9, cursor: 'pointer', fontSize: 15, border: '1px solid var(--border)',
    background: active ? (color ? color + '33' : 'var(--accent)') : 'var(--chrome-2)',
    outline: active ? `2px solid ${color || 'var(--accent)'}` : 'none', outlineOffset: -1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, color: 'var(--text)',
  })
  const tagPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', fontSize: 12 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const listItem: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }
  const swatch = (bg: string): React.CSSProperties => ({ width: 13, height: 13, borderRadius: 4, border: '1px solid var(--border)', background: bg })

  return (
    <div style={wrap}>
      {/* 헤더: 보기 전환 + 통계 + 목표 */}
      <div style={header}>
        <div style={seg} role="tablist" aria-label="보기 전환">
          <button style={segBtn(view === 'cal')} onClick={() => setView('cal')} role="tab" aria-selected={view === 'cal'}><Emoji e="📅" /> 달력</button>
          <button style={segBtn(view === 'list')} onClick={() => setView('list')} role="tab" aria-selected={view === 'list'}><Emoji e="📜" /> 목록</button>
        </div>
        <button className="minibtn" onClick={goTodayBtn}>오늘</button>
        <span style={{ ...hint, marginLeft: 6 }}><Emoji e="🔥" /> 연속 <b style={{ color: 'var(--accent)' }}>{cur}</b>일 · 최장 {longest}일 · 총 {totals.days}일</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={fieldLabel}>일일 목표</span>
          <input type="number" min={0} value={goal === 0 ? '' : goal}
            onChange={(e) => { const n = parseInt(e.target.value, 10); setGoal(e.target.value === '' ? 0 : (Number.isFinite(n) && n >= 0 ? n : goal)) }}
            style={{ ...numInput, width: 78 }} aria-label="일일 목표 단어수" />
          <span style={fieldLabel}>자</span>
        </span>
      </div>

      <div style={body}>
        {/* 왼쪽: 달력 또는 목록 */}
        <div style={leftPane}>
          {/* 누적 통계 */}
          <div style={statRow}>
            <div style={statBox}><div style={statNum}>{totals.words.toLocaleString()}</div><div style={statSub}>누적 단어수</div></div>
            <div style={statBox}><div style={statNum}>{fmtMin(totals.minutes)}</div><div style={statSub}>누적 시간</div></div>
            <div style={statBox}><div style={statNum}>{totals.avgWords.toLocaleString()}</div><div style={statSub}>일평균</div></div>
            <div style={statBox}><div style={statNum}>{totals.avgMood ? <><Emoji e={moodOf(Math.round(totals.avgMood))?.emoji || ''} /> {totals.avgMood.toFixed(1)}</> : '–'}</div><div style={statSub}>평균 기분</div></div>
          </div>

          {view === 'cal' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="minibtn" onClick={() => goMonth(-1)} aria-label="이전 달">‹</button>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{month.y}년 {month.m + 1}월</div>
                <button className="minibtn" onClick={() => goMonth(1)} aria-label="다음 달">›</button>
              </div>
              <div style={{ ...hint, textAlign: 'center', marginTop: -4 }}>
                이달 {monthStats.days}일 · {monthStats.words.toLocaleString()}자{goal > 0 ? ` · 목표 달성 ${monthStats.goalMet}일` : ''}
              </div>
              <div style={dowRow}>
                {DOW.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, padding: '2px 0', color: i === 0 ? 'var(--warn)' : i === 6 ? 'var(--accent)' : 'var(--muted)' }}>{d}</div>
                ))}
              </div>
              <div style={grid}>
                {cells.map((d, i) => {
                  if (!d) return <div key={i} style={{ aspectRatio: '1/1' }} />
                  const k = dayKey(d)
                  const e = entries[k]
                  const isToday = k === todayKey
                  const isSel = k === selected
                  const isFuture = d.getTime() > today.getTime()
                  const m = moodOf(e?.mood)
                  return (
                    <button key={i} onClick={() => selectDay(k)}
                      title={e ? `${k}${e.words ? ` · ${e.words.toLocaleString()}자` : ''}${m ? ` · ${m.label}` : ''}${e.note.trim() ? ' · 메모 있음' : ''}` : `${k} · 기록 없음`}
                      style={{
                        aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        borderRadius: 8, padding: 2, cursor: 'pointer', font: 'inherit', color: 'var(--text)',
                        border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: cellColor(e),
                        opacity: isFuture ? 0.5 : 1,
                        outline: isToday ? '2px solid var(--warn)' : 'none', outlineOffset: -2,
                      }}>
                      <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500 }}>{d.getDate()}</span>
                      {m ? <span style={{ fontSize: 11, lineHeight: 1 }}><Emoji e={m.emoji} /></span>
                        : e?.words ? <span style={{ fontSize: 8.5, color: 'var(--muted)', lineHeight: 1 }}>{e.words >= 1000 ? `${(e.words / 1000).toFixed(1)}k` : e.words}</span>
                          : e?.note.trim() ? <span style={{ fontSize: 9, lineHeight: 1 }}>✎</span> : null}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--muted)', flexWrap: 'wrap', marginTop: 2 }}>
                <span>기분:</span>
                {MOODS.map((m) => (<span key={m.v} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><span style={swatch(m.color + '33')} /><Emoji e={m.emoji} /></span>))}
                <span style={{ marginLeft: 'auto' }}>오늘 = 노란 테두리</span>
              </div>
            </>
          ) : (
            <>
              {/* 목록: 검색 + 태그 필터 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="메모·태그·날짜 검색"
                  style={{ ...numInput, flex: 1, minWidth: 140 }} aria-label="검색" />
                {tagFilter && <button className="minibtn" onClick={() => setTagFilter('')}>#{tagFilter} ✕</button>}
              </div>
              {allTags.length > 0 && !tagFilter && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {allTags.slice(0, 10).map((t) => (
                    <button key={t} className="minibtn" style={{ fontSize: 11.5 }} onClick={() => setTagFilter(t)}>#{t}</button>
                  ))}
                </div>
              )}
              {listed.length === 0 ? (
                <div style={{ ...hint, padding: 20, textAlign: 'center' }}>
                  {allKeys.length === 0 ? '아직 작성한 일지가 없습니다. 달력에서 날짜를 골라 오늘의 집필을 기록해 보세요.' : '검색/필터에 맞는 일지가 없습니다.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {listed.map((k) => {
                    const e = entries[k]
                    const m = moodOf(e.mood), f = FOCUS.find((x) => x.v === e.focus)
                    return (
                      <div key={k} style={{ ...listItem, borderColor: k === selected ? 'var(--accent)' : 'var(--border)' }}
                        onClick={() => { setSelected(k); const d = parseKey(k); if (d) setMonth({ y: d.getFullYear(), m: d.getMonth() }) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{fmtDateLong(k)}</span>
                          {k === todayKey && <span style={{ fontSize: 10, color: 'var(--warn)' }}>오늘</span>}
                          <span style={{ marginLeft: 'auto', fontSize: 16 }}>{m && <Emoji e={m.emoji} />}{f && <Emoji e={f.emoji} />}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {emojify([e.words > 0 ? `${e.words.toLocaleString()}자` : '', e.minutes > 0 ? fmtMin(e.minutes) : '', goal > 0 && e.words >= goal ? '🎯 달성' : ''].filter(Boolean).join(' · ') || '기록만')}
                        </div>
                        {e.note.trim() && <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.note.trim()}</div>}
                        {e.tags.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{e.tags.map((t) => <span key={t} style={{ fontSize: 11, color: 'var(--accent)' }}>#{t}</span>)}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 오른쪽: 선택일 편집 */}
        <div style={rightPane}>
          <div style={editBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{fmtDateLong(selected)}</div>
              {selected === todayKey && <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 700 }}>오늘</span>}
              {isFutureSel && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(미래)</span>}
            </div>

            {/* 쓴 양 / 시간 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>쓴 양 (자)</div>
                <input type="number" min={0} value={draft.words || ''} placeholder="0"
                  onChange={(e) => setField('words', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={numInput} aria-label="쓴 양" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>집필 시간 (분)</div>
                <input type="number" min={0} value={draft.minutes || ''} placeholder="0"
                  onChange={(e) => setField('minutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={numInput} aria-label="집필 시간(분)" />
              </div>
            </div>
            {goal > 0 && draft.words > 0 && (
              <div style={{ marginTop: -2 }}>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--chrome-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, draftGoalPct)}%`, height: '100%', background: draft.words >= goal ? 'var(--ok)' : 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 11, color: draft.words >= goal ? 'var(--ok)' : 'var(--muted)', marginTop: 3 }}>
                  목표의 {draftGoalPct}%{draft.words >= goal ? <> · 달성 <Emoji e="🎉" /></> : ` · ${(goal - draft.words).toLocaleString()}자 남음`}
                </div>
              </div>
            )}

            {/* 기분 */}
            <div>
              <div style={fieldLabel}>오늘의 기분</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                {MOODS.map((m) => (
                  <button key={m.v} onClick={() => toggleMood(m.v)} title={m.label} style={chip(draft.mood === m.v, m.color)}>
                    <span><Emoji e={m.emoji} /></span><span style={{ fontSize: 9.5, color: 'var(--muted)' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 집중도 */}
            <div>
              <div style={fieldLabel}>집중도</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                {FOCUS.map((f) => (
                  <button key={f.v} onClick={() => toggleFocus(f.v)} title={f.label} style={chip(draft.focus === f.v)}>
                    <span><Emoji e={f.emoji} /></span><span style={{ fontSize: 9.5, color: 'var(--muted)' }}>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 + 회고 질문 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={fieldLabel}>일지 / 메모</div>
                <button className="linkbtn" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={insertPrompt} title="회고 질문을 메모에 넣기">+ 질문 넣기</button>
                <button className="linkbtn" style={{ fontSize: 11 }} onClick={nextPrompt} title="다른 질문">↻</button>
              </div>
              <div style={{ ...hint, fontStyle: 'italic', margin: '3px 0 5px' }}><Emoji e="💭" /> {prompt}</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="오늘 집필은 어땠나요? 무엇을 썼고 무엇이 어려웠나요…"
                style={textArea} aria-label="일지 메모" />
            </div>

            {/* 태그 */}
            <div>
              <div style={fieldLabel}>태그</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="예: 초고, 퇴고, 슬럼프" style={{ ...numInput, flex: 1 }} aria-label="태그 입력" />
                <button className="minibtn" onClick={addTag}>추가</button>
              </div>
              {draft.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {draft.tags.map((t) => (
                    <span key={t} style={tagPill}>#{t}
                      <span onClick={() => removeTag(t)} style={{ cursor: 'pointer', color: 'var(--muted)', fontWeight: 700 }} role="button" aria-label={`${t} 태그 삭제`}>✕</span>
                    </span>
                  ))}
                </div>
              )}
              {allTags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                  {allTags.filter((t) => !draft.tags.includes(t)).slice(0, 6).map((t) => (
                    <button key={t} className="linkbtn" style={{ fontSize: 11 }} onClick={() => { if (draft.tags.length < 12) setField('tags', [...draft.tags, t]) }}>+#{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 저장/삭제 */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveDraft}>{savedFlash ? '✓ 저장됨' : '저장'}</button>
              {selEntry && <button className="minibtn" onClick={() => deleteEntry(selected)} title="이 날짜 일지 삭제"><Emoji e="🗑" /> 삭제</button>}
            </div>
          </div>

          {/* 연계: 내보내기 / 수집함 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={fieldLabel}>내보내기 · 연계</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="linkbtn" onClick={() => exportRange('one')} disabled={!hasProjectBridge() || !selEntry}
                title={hasProjectBridge() ? '이 날짜 일지를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 이 날짜</button>
              <button className="linkbtn" onClick={() => exportRange('month')} disabled={!hasProjectBridge() || monthStats.days === 0}
                title="이번 달 일지 전체를 프로젝트 자료에 추가"><Emoji e="🗓" /> 이번 달</button>
              <button className="linkbtn" onClick={() => exportRange('all')} disabled={!hasProjectBridge() || allKeys.length === 0}
                title="모든 일지를 한 문서로 프로젝트 자료에 추가"><Emoji e="📚" /> 전체</button>
              {hasStash() && <button className="linkbtn" onClick={stashEntry} disabled={!selEntry} title="이 일지 메모를 수집함에 담기"><Emoji e="📌" /> 수집함</button>}
            </div>
            <div style={hint}>
              일지는 이 브라우저(localStorage)에만 저장됩니다. 〈프로젝트에 추가〉를 누르면 좌측 바인더의 자료 → 〈집필 일지〉 폴더에 문서로 들어갑니다.
            </div>
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.22)', zIndex: 5 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
