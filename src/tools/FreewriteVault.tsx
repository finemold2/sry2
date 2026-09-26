// 자유쓰기 보관소(Freewrite Vault) — 타임드 자유쓰기 세션(5/10/15분·커스텀)을 실행하고,
//  멈추지 않고 쓰도록 독려(정체 감지 시 넛지·페이드)하며, 결과를 날짜·태그와 함께 보관·검색하는 도구.
//  보관된 항목은 열람/편집/삭제하고, 프로젝트 초고로 보낼 수 있다.
// 규약: react 와 './linkbus' 외 import 금지. localStorage 'sry:tool:freewrite-vault:*'.
//  언마운트 시 모든 타이머/리스너 정리. UI 한국어, 인라인 style + CSS변수.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = {
  id: 'freewrite-vault',
  name: '자유쓰기 보관소',
  icon: '🌊',
  group: '집중·생산성',
  intro: '타임드 자유쓰기 세션을 달리고 날짜·태그로 보관·검색',
  w: 560,
  h: 660,
}

// ─────────────────────────────────────────────────────────────
// 영속 키
const NS = 'sry:tool:freewrite-vault:'
const K_ENTRIES = NS + 'entries'
const K_PREFS = NS + 'prefs'

// ─────────────────────────────────────────────────────────────
// 모델
interface Entry {
  id: string
  ts: number              // 생성 시각(ms)
  text: string
  title: string           // 사용자 지정 또는 자동(첫 줄)
  tags: string[]
  durationMin: number     // 설정한 제한시간(분)
  elapsedSec: number      // 실제 경과(초)
  words: number           // 보관 시점 단어 수
  chars: number           // 보관 시점 글자 수
  completed: boolean       // 시간 끝까지 달렸는지
}

interface Prefs {
  durMin: number          // 마지막 선택 시간
  custom: number          // 커스텀 분
  nudge: boolean          // 정체 넛지
  fade: boolean           // 정체 시 글자 흐려짐(타자 멈추면 사라질 듯한 압박)
  hideText: boolean       // 진짜 자유쓰기(쓰는 글을 가림)
}

type Phase = 'setup' | 'running' | 'review' | 'browse'

// ─────────────────────────────────────────────────────────────
// 유틸
const PRESETS = [5, 10, 15] as const
const STALL_MS = 6000           // 이 시간 이상 타자가 없으면 "정체"로 간주

function countWords(t: string): number {
  const s = t.trim()
  if (!s) return 0
  const m = s.match(/[^\s]+/g)
  return m ? m.length : 0
}
function countChars(t: string): number {
  return t.replace(/\s/g, '').length
}
function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
function fmtDate(ts: number): string {
  try {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch { return '' }
}
function relDay(ts: number): string {
  const now = new Date()
  const d = new Date(ts)
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((a - b) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff === 2) return '그저께'
  if (diff > 0 && diff < 7) return `${diff}일 전`
  return ''
}
function autoTitle(text: string): string {
  const line = text.split('\n').map(l => l.trim()).find(Boolean) || ''
  const clean = line.replace(/[“”"']/g, '').trim()
  if (!clean) return ''
  return clean.length > 30 ? clean.slice(0, 30) + '…' : clean
}
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'fw_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function parseTags(raw: string): string[] {
  return Array.from(new Set(
    raw.split(/[,，#\n]+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean)
  )).slice(0, 12)
}

function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(K_ENTRIES)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x.text === 'string')
      .map((x): Entry => ({
        id: String(x.id || newId()),
        ts: Number(x.ts) || Date.now(),
        text: String(x.text),
        title: String(x.title || ''),
        tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, 12) : [],
        durationMin: Number(x.durationMin) || 0,
        elapsedSec: Number(x.elapsedSec) || 0,
        words: Number(x.words) || countWords(String(x.text)),
        chars: Number(x.chars) || countChars(String(x.text)),
        completed: !!x.completed,
      }))
  } catch { return [] }
}
function loadPrefs(): Prefs {
  const base: Prefs = { durMin: 10, custom: 20, nudge: true, fade: false, hideText: false }
  try {
    const raw = localStorage.getItem(K_PREFS)
    if (!raw) return base
    const p = JSON.parse(raw)
    return {
      durMin: Number(p.durMin) > 0 ? Number(p.durMin) : base.durMin,
      custom: Number(p.custom) > 0 ? Number(p.custom) : base.custom,
      nudge: p.nudge !== false,
      fade: !!p.fade,
      hideText: !!p.hideText,
    }
  } catch { return base }
}

// 멈추지 말고 쓰라는 독려 문구(정체 시 순환)
const NUDGES = [
  '계속 써요 — 손을 멈추지 말고!',
  '생각이 안 나면 “생각이 안 난다”라고 그대로 쓰세요.',
  '문장이 어색해도 괜찮아요. 그냥 흘려보내세요.',
  '지우지 말고 앞으로만 가세요.',
  '지금 떠오르는 단어 아무거나 적어요.',
  '숨 쉬듯 쓰세요. 평가는 나중에.',
  '한 단어라도 더. 멈추면 사라져요.',
]

// ─────────────────────────────────────────────────────────────
export default function FreewriteVault({ payload }: { payload?: Record<string, unknown> }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [entries, setEntries] = useState<Entry[]>(loadEntries)
  const [phase, setPhase] = useState<Phase>('setup')

  // 세션 상태
  const [text, setText] = useState('')
  const [remaining, setRemaining] = useState(prefs.durMin * 60)
  const [stalled, setStalled] = useState(false)
  const [nudgeIdx, setNudgeIdx] = useState(0)
  const [revealOnce, setRevealOnce] = useState(false) // hideText 모드에서 잠깐 보기

  // 보관/편집 상태
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewTags, setReviewTags] = useState('')
  const [savedFlag, setSavedFlag] = useState(false)
  const [toast, setToast] = useState('')

  // 탐색 상태
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editTags, setEditTags] = useState('')

  // refs / 타이머
  const endAtRef = useRef(0)
  const startAtRef = useRef(0)
  const tickRef = useRef<number | null>(null)
  const lastKeyRef = useRef(Date.now())
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const mountedRef = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const words = countWords(text)
  const chars = countChars(text)
  const elapsed = phase === 'running' ? Math.round((Date.now() - startAtRef.current) / 1000) : 0

  // ── 정리: 언마운트 시 모든 타이머 제거
  const clearTick = useCallback(() => {
    if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTick()
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (revealTimer.current) clearTimeout(revealTimer.current)
    }
  }, [clearTick])

  // ── 영속 저장
  useEffect(() => {
    try { localStorage.setItem(K_PREFS, JSON.stringify(prefs)) } catch { /* graceful */ }
  }, [prefs])
  useEffect(() => {
    try { localStorage.setItem(K_ENTRIES, JSON.stringify(entries)) } catch {
      flash('저장 공간이 가득 찼어요. 오래된 항목을 정리해 주세요.')
    }
  }, [entries])

  // ── payload: 외부에서 텍스트/태그를 받아 바로 세션 검토로 진입(선택적 연계)
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : ''
    if (t) {
      setText(t)
      setReviewTitle(typeof payload.title === 'string' ? payload.title : autoTitle(t))
      if (Array.isArray(payload.tags)) setReviewTags(payload.tags.map(String).join(', '))
      setPhase('review')
    }
    // payload 는 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(msg: string) {
    if (!mountedRef.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mountedRef.current) setToast('') }, 2600)
  }

  // ── 세션 시작
  const startSession = useCallback((min: number) => {
    clearTick()
    const m = Math.max(1, Math.min(180, Math.round(min)))
    setText('')
    setStalled(false)
    setNudgeIdx(0)
    setRevealOnce(false)
    setPrefs(p => ({ ...p, durMin: m }))
    const total = m * 60
    setRemaining(total)
    const now = Date.now()
    startAtRef.current = now
    endAtRef.current = now + total * 1000
    lastKeyRef.current = now
    setPhase('running')
    setTimeout(() => { try { taRef.current?.focus() } catch { /* noop */ } }, 30)
  }, [clearTick])

  // ── 세션 종료(검토로 이동)
  const endSession = useCallback((completed: boolean) => {
    clearTick()
    setPhase('review')
    setReviewTitle(prev => prev || autoTitle(text))
    setReviewTags('')
    setSavedFlag(false)
    setStalled(false)
    // completed 플래그를 보관에 쓰기 위해 ref 대신 review 단계에서 remaining 으로 판단
    void completed
  }, [clearTick, text])

  // ── 러닝 타이머 루프(드리프트 방지) + 정체 감지 + 넛지
  useEffect(() => {
    if (phase !== 'running') return
    tickRef.current = window.setInterval(() => {
      const now = Date.now()
      const left = (endAtRef.current - now) / 1000
      if (left <= 0) {
        setRemaining(0)
        endSession(true)
        return
      }
      setRemaining(left)
      // 정체 감지
      const idle = now - lastKeyRef.current
      const isStall = idle >= STALL_MS
      setStalled(prev => {
        if (isStall && !prev) setNudgeIdx(i => (i + 1) % NUDGES.length)
        return isStall
      })
    }, 250)
    return () => clearTick()
  }, [phase, endSession, clearTick])

  // ── 타자 입력 시 정체 해제
  const onType = (v: string) => {
    setText(v)
    lastKeyRef.current = Date.now()
    if (stalled) setStalled(false)
  }

  // hideText 모드에서 잠깐 보기(3초)
  const peek = () => {
    setRevealOnce(true)
    if (revealTimer.current) clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => { if (mountedRef.current) setRevealOnce(false) }, 3000)
  }

  // ── 보관 저장
  const saveEntry = () => {
    const body = text.trim()
    if (!body) { flash('보관할 글이 없어요.'); return }
    const completed = remaining <= 0
    const entry: Entry = {
      id: newId(),
      ts: Date.now(),
      text: body,
      title: (reviewTitle.trim() || autoTitle(body) || '제목 없는 자유쓰기'),
      tags: parseTags(reviewTags),
      durationMin: prefs.durMin,
      elapsedSec: Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)) || prefs.durMin * 60,
      words: countWords(body),
      chars: countChars(body),
      completed,
    }
    setEntries(prev => [entry, ...prev])
    setSavedFlag(true)
    flash('보관소에 저장했어요.')
  }

  // 검토 단계에서 버리고 새로 시작
  const discardAndSetup = () => {
    setText('')
    setReviewTitle('')
    setReviewTags('')
    setSavedFlag(false)
    setPhase('setup')
  }

  // ── 항목 삭제
  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (openId === id) setOpenId(null)
    if (editId === id) setEditId(null)
  }

  // ── 항목 편집 저장
  const startEdit = (e: Entry) => {
    setEditId(e.id)
    setEditDraft(e.text)
    setEditTags(e.tags.join(', '))
  }
  const saveEdit = () => {
    if (!editId) return
    const body = editDraft.trim()
    setEntries(prev => prev.map(e => e.id === editId ? {
      ...e,
      text: body,
      title: (e.title || autoTitle(body) || '제목 없는 자유쓰기'),
      tags: parseTags(editTags),
      words: countWords(body),
      chars: countChars(body),
    } : e))
    setEditId(null)
    flash('수정했어요.')
  }

  // ── 모든 태그(빈도순)
  const allTags = useMemo(() => {
    const cnt: Record<string, number> = {}
    for (const e of entries) for (const t of e.tags) cnt[t] = (cnt[t] || 0) + 1
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [entries])

  // ── 검색·필터 결과
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(e => {
      if (activeTag && !e.tags.includes(activeTag)) return false
      if (!q) return true
      return (
        e.title.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [entries, query, activeTag])

  // ── 통계
  const totalWords = useMemo(() => entries.reduce((s, e) => s + e.words, 0), [entries])
  const totalSessions = entries.length

  // ── 프로젝트/수집함 연계
  const entryToHtml = (e: Entry): string => {
    const paras = e.text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    return paras.map(p => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('') || `<p>${escHtml(e.text)}</p>`
  }
  const sendToProject = (e: Entry) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '자유쓰기',
      title: e.title,
      bodyHtml: entryToHtml(e),
      meta: {
        출처: '자유쓰기 보관소',
        날짜: fmtDate(e.ts),
        단어수: String(e.words),
        제한시간: `${e.durationMin}분`,
        태그: e.tags.join(', '),
      },
    })
    flash(id ? '프로젝트 초고 "자유쓰기" 폴더에 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }
  const stashEntry = (e: Entry) => {
    if (!hasStash()) { flash('수집함이 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: e.title, text: e.text })
    flash('수집함에 담았어요.')
  }

  // 검토 단계의 현재 글을 즉시 프로젝트로(저장 없이도)
  const reviewToProject = () => {
    const body = text.trim()
    if (!body) { flash('보낼 글이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const paras = body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    const bodyHtml = paras.map(p => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '자유쓰기',
      title: reviewTitle.trim() || autoTitle(body) || '자유쓰기',
      bodyHtml,
      meta: { 출처: '자유쓰기 보관소', 단어수: String(words), 제한시간: `${prefs.durMin}분`, 태그: parseTags(reviewTags).join(', ') },
    })
    flash(id ? '프로젝트 초고에 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ─────────────────────────────────────────────────────────────
  // 스타일
  const C = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' } as React.CSSProperties,
    pad: { padding: 14, boxSizing: 'border-box' } as React.CSSProperties,
    tabbar: { display: 'flex', gap: 6, padding: '10px 14px 0', flexShrink: 0 } as React.CSSProperties,
    body: { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box' } as React.CSSProperties,
    row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } as React.CSSProperties,
    label: { fontSize: 12, color: 'var(--muted)' } as React.CSSProperties,
    input: { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    card: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 } as React.CSSProperties,
    statRow: { display: 'flex', gap: 8 } as React.CSSProperties,
    statBox: { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' } as React.CSSProperties,
    statNum: { fontSize: 20, fontWeight: 700, lineHeight: 1.1 } as React.CSSProperties,
    statSub: { fontSize: 11, color: 'var(--muted)', marginTop: 2 } as React.CSSProperties,
    hint: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 } as React.CSSProperties,
    tagChip: (active: boolean): React.CSSProperties => ({
      fontSize: 11.5, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
      background: active ? 'var(--accent)' : 'var(--chrome-2)',
      color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
    }),
  }

  // ── 탭 버튼
  const TabBtn = ({ id, children }: { id: Phase; children: React.ReactNode }) => {
    const isActive = phase === id || (id === 'setup' && (phase === 'running' || phase === 'review'))
    const goSetup = () => {
      if (phase === 'running') return // 달리는 중엔 잠금
      setPhase('setup')
    }
    return (
      <button
        className={isActive ? 'btn-primary' : 'minibtn'}
        onClick={id === 'browse' ? () => setPhase('browse') : goSetup}
        style={{ flex: 1 }}
        disabled={phase === 'running'}
      >{children}</button>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 렌더: 세션 진행
  const renderRunning = () => {
    const total = prefs.durMin * 60
    const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 0
    const low = remaining <= 30
    const hide = prefs.hideText && !revealOnce
    const faded = prefs.fade && stalled
    return (
      <div style={{ ...C.body, gap: 10 }}>
        <div style={C.statRow}>
          <div style={C.statBox}>
            <div style={{ ...C.statNum, color: low ? 'var(--warn)' : 'var(--text)' }}>{fmtClock(remaining)}</div>
            <div style={C.statSub}>남은 시간</div>
          </div>
          <div style={C.statBox}>
            <div style={C.statNum}>{words}</div>
            <div style={C.statSub}>단어</div>
          </div>
          <div style={C.statBox}>
            <div style={C.statNum}>{chars}</div>
            <div style={C.statSub}>글자</div>
          </div>
        </div>

        {/* 진행 막대 */}
        <div style={{ height: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(progress * 100).toFixed(1)}%`, background: low ? 'var(--warn)' : 'var(--accent)', transition: 'width .25s linear' }} />
        </div>

        {/* 넛지 배너 */}
        {prefs.nudge && stalled && (
          <div style={{ padding: '8px 12px', borderRadius: 10, textAlign: 'center', fontWeight: 600, fontSize: 13.5, border: '1px solid var(--warn)', background: 'color-mix(in srgb, var(--warn) 16%, var(--panel))', color: 'var(--text)' }}>
            <Emoji e="✍️" /> {NUDGES[nudgeIdx]}
          </div>
        )}

        {/* 입력 영역 */}
        <textarea
          ref={taRef}
          value={text}
          onChange={e => onType(e.target.value)}
          placeholder="멈추지 말고 써 내려가세요…"
          spellCheck={false}
          style={{
            flex: 1, minHeight: 160, resize: 'none', boxSizing: 'border-box',
            padding: 14, borderRadius: 12, border: '1px solid ' + (faded ? 'var(--warn)' : 'var(--border)'),
            background: 'var(--paper)', color: hide ? 'transparent' : 'var(--text)',
            textShadow: hide ? '0 0 8px var(--muted)' : 'none',
            caretColor: 'var(--accent)',
            fontSize: 16, lineHeight: 1.7, fontFamily: 'inherit', outline: 'none',
            opacity: faded ? 0.35 : 1, transition: 'opacity .4s ease, border-color .3s ease',
          }}
        />

        <div style={C.row}>
          <button className="minibtn danger" onClick={() => endSession(false)}>■ 종료하고 보관</button>
          {prefs.hideText && <button className="minibtn" onClick={peek}><Emoji e="👁" /> 잠깐 보기</button>}
          <span style={{ ...C.hint, marginLeft: 'auto' }}>경과 {fmtClock(elapsed)}</span>
        </div>
        {prefs.hideText && <div style={C.hint}>진짜 자유쓰기: 쓰는 글이 흐려져 다시 읽고 고치고 싶은 충동을 막아요. 종료하면 전체가 보여요.</div>}
      </div>
    )
  }

  // 렌더: 세션 설정
  const renderSetup = () => (
    <div style={C.body}>
      <div style={C.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>새 자유쓰기 세션</div>
        <div style={C.hint}>제한시간을 정하고 시작하세요. 멈추지 말고, 지우지 말고, 끝까지 흘려보내는 게 핵심이에요.</div>
        <div style={{ ...C.row, marginTop: 12 }}>
          {PRESETS.map(m => (
            <button
              key={m}
              className={prefs.durMin === m ? 'btn-primary' : 'minibtn'}
              onClick={() => setPrefs(p => ({ ...p, durMin: m }))}
            >{m}분</button>
          ))}
          <span style={{ ...C.label, marginLeft: 6 }}>커스텀</span>
          <input
            type="number" min={1} max={180} value={prefs.custom}
            onChange={e => {
              const n = parseInt(e.target.value, 10)
              setPrefs(p => ({ ...p, custom: Number.isFinite(n) ? Math.max(1, Math.min(180, n)) : p.custom }))
            }}
            style={{ ...C.input, width: 64 }}
            aria-label="커스텀 분"
          />
          <span style={C.label}>분</span>
          <button
            className={!PRESETS.includes(prefs.durMin as 5) && prefs.durMin === prefs.custom ? 'btn-primary' : 'minibtn'}
            onClick={() => setPrefs(p => ({ ...p, durMin: p.custom }))}
          >적용</button>
        </div>
      </div>

      <div style={C.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>독려 옵션</div>
        <label style={{ ...C.row, cursor: 'pointer', marginBottom: 8 }}>
          <input type="checkbox" checked={prefs.nudge} onChange={e => setPrefs(p => ({ ...p, nudge: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13.5 }}>정체 넛지 — 6초 이상 멈추면 격려 문구 표시</span>
        </label>
        <label style={{ ...C.row, cursor: 'pointer', marginBottom: 8 }}>
          <input type="checkbox" checked={prefs.fade} onChange={e => setPrefs(p => ({ ...p, fade: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13.5 }}>정체 페이드 — 멈추면 글이 흐려져 압박을 줌</span>
        </label>
        <label style={{ ...C.row, cursor: 'pointer' }}>
          <input type="checkbox" checked={prefs.hideText} onChange={e => setPrefs(p => ({ ...p, hideText: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13.5 }}>가린 쓰기 — 쓰는 글을 흐릿하게 가려 되읽기 방지</span>
        </label>
      </div>

      <button className="btn-primary" style={{ fontSize: 16, padding: '12px' }} onClick={() => startSession(prefs.durMin)}>
        ▶ {prefs.durMin}분 자유쓰기 시작
      </button>

      {/* 요약 통계 */}
      {totalSessions > 0 && (
        <div style={C.statRow}>
          <div style={C.statBox}>
            <div style={C.statNum}>{totalSessions}</div>
            <div style={C.statSub}>보관된 세션</div>
          </div>
          <div style={C.statBox}>
            <div style={C.statNum}>{totalWords.toLocaleString()}</div>
            <div style={C.statSub}>누적 단어</div>
          </div>
          <div style={C.statBox}>
            <div style={C.statNum}>{allTags.length}</div>
            <div style={C.statSub}>태그</div>
          </div>
        </div>
      )}
      <div style={C.hint}>모든 글은 이 브라우저에 자동 저장됩니다. “보관소” 탭에서 날짜·태그로 찾아볼 수 있어요.</div>
    </div>
  )

  // 렌더: 세션 검토(저장)
  const renderReview = () => {
    const completed = remaining <= 0
    return (
      <div style={C.body}>
        <div style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'center', fontWeight: 700, border: '1px solid var(--border)', background: completed ? 'color-mix(in srgb, var(--ok) 18%, var(--panel))' : 'var(--panel)' }}>
          {completed ? <><Emoji e="⏱" /> 시간 종료 — 끝까지 달렸어요!</> : <>■ 세션을 멈췄어요</>} · {words}단어 / {chars}자
        </div>

        <div>
          <div style={C.label}>제목</div>
          <input
            value={reviewTitle}
            onChange={e => setReviewTitle(e.target.value)}
            placeholder={autoTitle(text) || '제목 없는 자유쓰기'}
            style={{ ...C.input, width: '100%', marginTop: 4 }}
          />
        </div>
        <div>
          <div style={C.label}>태그 (쉼표·# 로 구분)</div>
          <input
            value={reviewTags}
            onChange={e => setReviewTags(e.target.value)}
            placeholder="예: 아이디어, 회고, 인물"
            style={{ ...C.input, width: '100%', marginTop: 4 }}
          />
          {parseTags(reviewTags).length > 0 && (
            <div style={{ ...C.row, marginTop: 6 }}>
              {parseTags(reviewTags).map(t => <span key={t} style={C.tagChip(false)}>#{t}</span>)}
            </div>
          )}
        </div>

        {/* 작성한 글 미리보기 */}
        <div style={{ ...C.card, flex: 1, minHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, background: 'var(--paper)' }}>
          {text.trim() || <span style={C.hint}>작성한 내용이 없습니다.</span>}
        </div>

        <div style={C.row}>
          {!savedFlag
            ? <button className="btn-primary" onClick={saveEntry} disabled={!text.trim()}><Emoji e="💾" /> 보관소에 저장</button>
            : <button className="btn-primary" onClick={() => setPhase('browse')}><Emoji e="📂" /> 보관소에서 보기</button>}
          <button className="minibtn" onClick={() => startSession(prefs.durMin)}><Emoji e="🔁" /> 다시 쓰기</button>
          <button className="minibtn danger" onClick={discardAndSetup}>버리기</button>
        </div>

        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          <button className="linkbtn" onClick={reviewToProject} disabled={!hasProjectBridge() || !text.trim()}
            title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 글을 프로젝트 초고로 보내기'}><Emoji e="📄" /> 프로젝트 초고로</button>
        </div>
        {savedFlag && <div style={{ fontSize: 12, color: 'var(--ok)' }}>✓ 보관됨 — 보관소 탭에서 언제든 다시 볼 수 있어요.</div>}
      </div>
    )
  }

  // 렌더: 보관소 탐색
  const renderBrowse = () => {
    const opened = openId ? entries.find(e => e.id === openId) : null
    if (opened) return renderEntryDetail(opened)
    return (
      <div style={C.body}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="🔍 제목·내용·태그 검색…"
          style={{ ...C.input, width: '100%' }}
          aria-label="보관소 검색"
        />
        {allTags.length > 0 && (
          <div style={{ ...C.row, gap: 6 }}>
            <span
              style={C.tagChip(activeTag === null)}
              onClick={() => setActiveTag(null)}
            >전체</span>
            {allTags.map(t => (
              <span key={t} style={C.tagChip(activeTag === t)} onClick={() => setActiveTag(activeTag === t ? null : t)}>#{t}</span>
            ))}
          </div>
        )}

        <div style={{ ...C.row, justifyContent: 'space-between' }}>
          <span style={C.hint}>{filtered.length}개 항목{activeTag ? ` · #${activeTag}` : ''}{query ? ` · "${query}"` : ''}</span>
          {entries.length > 0 && (
            <button className="minibtn danger" onClick={() => { if (filtered.length && window.confirm(`보이는 ${filtered.length}개 항목을 삭제할까요?`)) { const ids = new Set(filtered.map(e => e.id)); setEntries(prev => prev.filter(e => !ids.has(e.id))) } }}>
              표시 항목 삭제
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 20 }}>
            {entries.length === 0
              ? <span>아직 보관된 자유쓰기가 없어요.<br />“세션” 탭에서 첫 글을 써 보세요.</span>
              : <span>검색 결과가 없어요.</span>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => {
              const rel = relDay(e.ts)
              return (
                <div key={e.id} style={{ ...C.card, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }} onClick={() => setOpenId(e.id)}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                    {e.completed && <span title="끝까지 달림" style={{ fontSize: 12 }}><Emoji e="⏱" /></span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {e.text.replace(/\n+/g, ' ')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(e.ts)}{rel ? ` · ${rel}` : ''}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {e.words}단어 · {e.durationMin}분</span>
                    {e.tags.map(t => <span key={t} style={{ ...C.tagChip(false), padding: '1px 7px', fontSize: 10.5 }}>#{t}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 렌더: 항목 상세/편집
  const renderEntryDetail = (e: Entry) => {
    const editing = editId === e.id
    return (
      <div style={C.body}>
        <div style={C.row}>
          <button className="minibtn" onClick={() => { setOpenId(null); setEditId(null) }}>← 목록</button>
          <span style={{ ...C.hint, marginLeft: 'auto' }}>{fmtDate(e.ts)} · {e.words}단어 · {e.chars}자 · {e.durationMin}분{e.completed ? ' · 완주' : ''}</span>
        </div>

        <div style={{ fontWeight: 700, fontSize: 17 }}>{e.title}</div>

        {editing ? (
          <>
            <textarea
              value={editDraft}
              onChange={ev => setEditDraft(ev.target.value)}
              spellCheck={false}
              style={{ flex: 1, minHeight: 180, resize: 'none', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 15, lineHeight: 1.7, fontFamily: 'inherit', outline: 'none' }}
            />
            <div>
              <div style={C.label}>태그</div>
              <input value={editTags} onChange={ev => setEditTags(ev.target.value)} style={{ ...C.input, width: '100%', marginTop: 4 }} placeholder="쉼표·# 로 구분" />
            </div>
            <div style={C.row}>
              <button className="btn-primary" onClick={saveEdit}>저장</button>
              <button className="minibtn" onClick={() => setEditId(null)}>취소</button>
            </div>
          </>
        ) : (
          <>
            {e.tags.length > 0 && (
              <div style={{ ...C.row, gap: 6 }}>
                {e.tags.map(t => <span key={t} style={C.tagChip(activeTag === t)} onClick={() => { setActiveTag(t); setOpenId(null) }}>#{t}</span>)}
              </div>
            )}
            <div style={{ ...C.card, flex: 1, minHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8, background: 'var(--paper)' }}>
              {e.text}
            </div>
            <div style={C.row}>
              <button className="minibtn" onClick={() => startEdit(e)}><Emoji e="✏️" /> 편집</button>
              <button className="minibtn" onClick={() => { try { navigator.clipboard?.writeText(e.text); flash('복사했어요.') } catch { flash('복사를 지원하지 않는 환경이에요.') } }}><Emoji e="📋" /> 복사</button>
              <button className="minibtn danger" onClick={() => { if (window.confirm('이 항목을 삭제할까요?')) removeEntry(e.id) }}><Emoji e="🗑️" /> 삭제</button>
            </div>
            <div className="linkbar">
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={() => sendToProject(e)} disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '프로젝트 초고 "자유쓰기" 폴더로' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트 초고로</button>
              <button className="linkbtn" onClick={() => stashEntry(e)} disabled={!hasStash()}
                title={hasStash() ? '수집함에 메모로 담기' : '수집함이 연결되어 있지 않습니다'}><Emoji e="📥" /> 수집함에 담기</button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={C.wrap}>
      {/* 탭 */}
      <div style={C.tabbar}>
        <TabBtn id="setup"><Emoji e="✍️" /> 세션{phase === 'running' ? ' (진행 중)' : phase === 'review' ? ' (검토)' : ''}</TabBtn>
        <TabBtn id="browse"><Emoji e="📂" /> 보관소{totalSessions ? ` (${totalSessions})` : ''}</TabBtn>
      </div>

      {phase === 'setup' && renderSetup()}
      {phase === 'running' && renderRunning()}
      {phase === 'review' && renderReview()}
      {phase === 'browse' && renderBrowse()}

      {toast && (
        <div style={{ flexShrink: 0, padding: '8px 14px', fontSize: 12.5, color: 'var(--ok)', borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
