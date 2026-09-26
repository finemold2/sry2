// 집필 의식(루틴) — 자리에 앉아 글을 쓰기 직전의 마음·환경을 정돈하는 "출정 의식".
//   1) 사전 체크리스트: 책상 정리·물 한 잔·방해 차단 등 나만의 준비 항목을 하나씩 체크.
//   2) 워밍업 타이머: 기본 5분(커스텀 가능) 호흡/자유쓰기 워밍업. 단계 안내 호흡 가이드 + 알림음.
//   3) 오늘의 목표 한 줄: 이번 세션 "단 하나"를 못 박는다.
//   → 모두 마치면 "이제 쓰자" — 선택한 집중 도구를 목표와 함께 openToolLinked 로 띄운다.
// 의식은 통째로 프리셋(여러 루틴)으로 저장·전환, 진행 streak(연속 수행) 기록, 프로젝트에 목표 기록 가능.
// react 와 './linkbus' 외 import 없음 / 완전 로컬(외부 미디어 없음) / Web Audio·구조화 데이터는 graceful.
// 영속: localStorage 'sry:tool:writing-ritual'. 언마운트 시 타이머·오디오 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import { openToolLinked, addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'writing-ritual', name: '집필 의식', icon: '🕯️', group: '집중·생산성', intro: '체크리스트·워밍업 타이머·목표 한 줄로 마음을 정돈하고 “이제 쓰자”로 집중에 들어갑니다', w: 480, h: 700 }

const NS = 'sry:tool:writing-ritual'

// ── 연결 가능한 집중 도구(존재하지 않으면 openToolLinked 가 graceful 무시) ──
const FOCUS_TOOLS: { id: string; label: string; icon: string }[] = [
  { id: 'focus-lock', label: '집중 잠금', icon: '🔒' },
  { id: 'pomodoro-timer', label: '포모도로', icon: '🍅' },
  { id: 'session-goal', label: '세션 목표', icon: '🎯' },
  { id: 'word-sprint-game', label: '워드 스프린트', icon: '⚡' },
  { id: 'ambient-sound', label: '앰비언트 사운드', icon: '🎧' },
  { id: 'ruthless-mode', label: '무자비 모드', icon: '🔥' },
  { id: 'interval-timer', label: '인터벌 타이머', icon: '⏱️' },
]

// ── 워밍업 호흡/안내 단계(타이머 길이에 맞춰 비율 배분) ──
const WARMUP_STEPS: { label: string; hint: string; ratio: number }[] = [
  { label: '자리 잡기', hint: '의자에 깊이 앉아 어깨의 힘을 빼세요.', ratio: 0.18 },
  { label: '들이쉬기', hint: '코로 천천히 숨을 들이쉽니다.', ratio: 0.16 },
  { label: '멈추기', hint: '잠깐 숨을 머금고 마음을 비웁니다.', ratio: 0.12 },
  { label: '내쉬기', hint: '입으로 길게 내쉬며 잡생각을 흘려보냅니다.', ratio: 0.16 },
  { label: '문장 떠올리기', hint: '오늘 쓸 첫 문장을 머릿속으로 그려봅니다.', ratio: 0.22 },
  { label: '출발 준비', hint: '손가락을 풀고, 곧 첫 줄을 씁니다.', ratio: 0.16 },
]

interface ChecklistItem { id: string; text: string; done: boolean }
interface Ritual {
  id: string
  name: string
  checklist: ChecklistItem[]
  warmupSec: number
  focusToolId: string
}
interface Persisted {
  rituals: Ritual[]
  activeId: string
  goal: string
  sound: boolean
  // streak(연속 수행) 기록
  streak: number
  best: number
  lastDay: string | null   // 'YYYY-MM-DD'
  totalRuns: number
}

const DEFAULT_CHECK = (): ChecklistItem[] => ([
  { id: cid(), text: '책상·화면을 깔끔히 정리했다', done: false },
  { id: cid(), text: '물/차 한 잔을 곁에 두었다', done: false },
  { id: cid(), text: '휴대폰을 무음/멀리 두었다', done: false },
  { id: cid(), text: '알림·메신저를 닫았다', done: false },
  { id: cid(), text: '지난 원고의 마지막 문단을 다시 읽었다', done: false },
])

function cid(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* graceful */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function defaultRitual(name = '기본 의식'): Ritual {
  return { id: cid(), name, checklist: DEFAULT_CHECK(), warmupSec: 300, focusToolId: 'focus-lock' }
}

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// 어제 날짜 문자열(streak 연속 판정용)
function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function loadState(): Persisted {
  const base: Persisted = {
    rituals: [defaultRitual()],
    activeId: '',
    goal: '',
    sound: true,
    streak: 0, best: 0, lastDay: null, totalRuns: 0,
  }
  base.activeId = base.rituals[0].id
  try {
    const raw = localStorage.getItem(NS)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Persisted>
    const rituals = Array.isArray(p.rituals) && p.rituals.length
      ? p.rituals.filter(r => r && typeof r.name === 'string').map(r => ({
          id: String(r.id || cid()),
          name: String(r.name),
          checklist: Array.isArray(r.checklist)
            ? r.checklist.filter(c => c && typeof c.text === 'string').map(c => ({ id: String(c.id || cid()), text: String(c.text), done: !!c.done }))
            : DEFAULT_CHECK(),
          warmupSec: clampSec(Number(r.warmupSec)),
          focusToolId: typeof r.focusToolId === 'string' ? r.focusToolId : 'focus-lock',
        }))
      : base.rituals
    const activeId = rituals.some(r => r.id === p.activeId) ? String(p.activeId) : rituals[0].id
    return {
      rituals,
      activeId,
      goal: typeof p.goal === 'string' ? p.goal : '',
      sound: p.sound !== false,
      streak: Number.isFinite(p.streak) ? Number(p.streak) : 0,
      best: Number.isFinite(p.best) ? Number(p.best) : 0,
      lastDay: typeof p.lastDay === 'string' ? p.lastDay : null,
      totalRuns: Number.isFinite(p.totalRuns) ? Number(p.totalRuns) : 0,
    }
  } catch {
    return base
  }
}

function clampSec(n: number): number {
  if (!Number.isFinite(n)) return 300
  return Math.max(60, Math.min(1800, Math.round(n)))
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function WritingRitual({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(loadState)
  const { rituals, activeId, goal, sound } = state
  const active = rituals.find(r => r.id === activeId) || rituals[0]

  // 워밍업 타이머
  const [remaining, setRemaining] = useState(active.warmupSec)
  const [running, setRunning] = useState(false)
  const [finishedWarmup, setFinishedWarmup] = useState(false)

  // 항목 추가 입력 / 의식 이름 편집 / 토스트
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [toast, setToast] = useState('')

  const tickRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)
  const endAtRef = useRef<number | null>(null)
  const [soundSupported] = useState(() => typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext))

  // payload.goal 로 외부에서 목표를 주입(다른 도구에서 열 때)
  useEffect(() => {
    const g = payload && typeof payload.goal === 'string' ? payload.goal : ''
    if (g) setState(s => ({ ...s, goal: g }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 활성 의식이 바뀌면 타이머를 그 길이로 초기화(진행 중이 아닐 때)
  useEffect(() => {
    if (!running) { setRemaining(active.warmupSec); setFinishedWarmup(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active.warmupSec])

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(NS, JSON.stringify(state)) } catch { /* 차단/용량 graceful */ }
  }, [state])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === NS) { try { setState(loadState()) } catch { /* graceful */ } } }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 마운트/언마운트 정리
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (tickRef.current != null) { clearInterval(tickRef.current); tickRef.current = null }
      if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null }
      const ctx = audioCtxRef.current
      audioCtxRef.current = null
      try { if (ctx && ctx.state !== 'closed') ctx.close() } catch { /* graceful */ }
    }
  }, [])

  const flash = useCallback((m: string) => {
    if (!mounted.current) return
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 3200)
  }, [])

  // 알림음(Web Audio) — count 만큼 부드러운 종소리. 미지원/꺼짐 시 무시.
  const chime = useCallback((count = 1) => {
    if (!sound) return
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') { ctx = new Ctor(); audioCtxRef.current = ctx }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 528 + i * 90
        const t0 = now + i * 0.34
        const t1 = t0 + 0.9
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, t1)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t0); osc.stop(t1 + 0.02)
      }
    } catch { /* 오디오 미지원 graceful */ }
  }, [sound])

  // ── 워밍업 타이머 구동 ──
  const stopTick = () => { if (tickRef.current != null) { clearInterval(tickRef.current); tickRef.current = null } }

  const startWarmup = () => {
    if (running) return
    if (remaining <= 0) setRemaining(active.warmupSec)
    const startRemain = remaining <= 0 ? active.warmupSec : remaining
    endAtRef.current = Date.now() + startRemain * 1000
    setRunning(true)
    setFinishedWarmup(false)
    chime(1) // 시작 알림
    stopTick()
    tickRef.current = window.setInterval(() => {
      if (endAtRef.current == null) return
      const left = Math.round((endAtRef.current - Date.now()) / 1000)
      if (left <= 0) {
        stopTick()
        endAtRef.current = null
        setRemaining(0)
        setRunning(false)
        setFinishedWarmup(true)
        chime(3)
      } else {
        setRemaining(left)
      }
    }, 250)
  }
  const pauseWarmup = () => { stopTick(); endAtRef.current = null; setRunning(false) }
  const resetWarmup = () => { stopTick(); endAtRef.current = null; setRunning(false); setRemaining(active.warmupSec); setFinishedWarmup(false) }
  const skipWarmup = () => { stopTick(); endAtRef.current = null; setRunning(false); setRemaining(0); setFinishedWarmup(true) }

  // 현재 워밍업 단계 계산(경과 비율 기준)
  const elapsed = active.warmupSec - remaining
  const stepInfo = (() => {
    if (active.warmupSec <= 0) return { idx: 0, step: WARMUP_STEPS[0] }
    const frac = Math.min(1, Math.max(0, elapsed / active.warmupSec))
    let acc = 0
    for (let i = 0; i < WARMUP_STEPS.length; i++) {
      acc += WARMUP_STEPS[i].ratio
      if (frac < acc || i === WARMUP_STEPS.length - 1) return { idx: i, step: WARMUP_STEPS[i] }
    }
    return { idx: 0, step: WARMUP_STEPS[0] }
  })()

  // ── 상태 변경 헬퍼(불변) ──
  const patchActive = (fn: (r: Ritual) => Ritual) => {
    setState(s => ({ ...s, rituals: s.rituals.map(r => (r.id === s.activeId ? fn(r) : r)) }))
  }

  const toggleItem = (id: string) => patchActive(r => ({ ...r, checklist: r.checklist.map(c => (c.id === id ? { ...c, done: !c.done } : c)) }))
  const removeItem = (id: string) => patchActive(r => ({ ...r, checklist: r.checklist.filter(c => c.id !== id) }))
  const addItem = () => {
    const t = draft.trim()
    if (!t) return
    patchActive(r => ({ ...r, checklist: [...r.checklist, { id: cid(), text: t, done: false }] }))
    setDraft('')
  }
  const resetChecks = () => patchActive(r => ({ ...r, checklist: r.checklist.map(c => ({ ...c, done: false })) }))
  const setWarmupSec = (sec: number) => {
    const v = clampSec(sec)
    patchActive(r => ({ ...r, warmupSec: v }))
    if (!running) setRemaining(v)
  }
  const setFocusTool = (tid: string) => patchActive(r => ({ ...r, focusToolId: tid }))

  // 의식 프리셋 관리
  const addRitual = () => {
    const r = defaultRitual(`의식 ${rituals.length + 1}`)
    setState(s => ({ ...s, rituals: [...s.rituals, r], activeId: r.id }))
    flash('새 의식을 만들었어요. 항목을 자유롭게 다듬어 보세요.')
  }
  const dupRitual = () => {
    const r: Ritual = { ...active, id: cid(), name: active.name + ' 사본', checklist: active.checklist.map(c => ({ ...c, id: cid(), done: false })) }
    setState(s => ({ ...s, rituals: [...s.rituals, r], activeId: r.id }))
    flash('의식을 복제했어요.')
  }
  const delRitual = () => {
    if (rituals.length <= 1) { flash('마지막 의식은 삭제할 수 없어요.'); return }
    setState(s => {
      const left = s.rituals.filter(r => r.id !== s.activeId)
      return { ...s, rituals: left, activeId: left[0].id }
    })
  }
  const commitRename = () => {
    const v = renameVal.trim()
    if (v) patchActive(r => ({ ...r, name: v }))
    setRenaming(false)
  }

  // 진행률
  const total = active.checklist.length
  const doneCount = active.checklist.filter(c => c.done).length
  const checksReady = total === 0 || doneCount === total
  const warmupReady = finishedWarmup || active.warmupSec <= 0 || remaining <= 0
  const goalReady = goal.trim().length > 0
  const allReady = checksReady && warmupReady && goalReady

  // streak 적립(하루 1회) — 오늘 처음 의식을 완수하면 연속 기록 갱신
  const recordRun = () => {
    setState(s => {
      const today = todayStr()
      if (s.lastDay === today) return { ...s, totalRuns: s.totalRuns + 1 }
      const cont = s.lastDay === yesterdayStr()
      const streak = cont ? s.streak + 1 : 1
      return { ...s, lastDay: today, streak, best: Math.max(s.best, streak), totalRuns: s.totalRuns + 1 }
    })
  }

  // "이제 쓰자" — streak 적립 후 선택 집중 도구를 목표와 함께 띄운다.
  const nowWrite = () => {
    recordRun()
    const tid = active.focusToolId || 'focus-lock'
    openToolLinked(tid, { goal: goal.trim(), fromRitual: true })
    flash(`준비 완료 — “${FOCUS_TOOLS.find(t => t.id === tid)?.label || '집중 도구'}”로 들어갑니다. 좋은 글 쓰세요!`)
  }

  // 목표를 프로젝트 자료에 기록(연계)
  const saveGoalToProject = () => {
    if (!goalReady) { flash('먼저 오늘의 목표를 한 줄 적어주세요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const checks = active.checklist.map(c => `<li>${c.done ? '☑' : '☐'} ${escHtml(c.text)}</li>`).join('')
    const body =
      `<p><strong>오늘의 목표</strong></p><p>${escHtml(goal.trim())}</p>` +
      `<p><strong>의식: ${escHtml(active.name)}</strong> · 워밍업 ${Math.round(active.warmupSec / 60)}분</p>` +
      (checks ? `<ul>${checks}</ul>` : '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 일지', title: `집필 의식 — ${todayStr()}`,
      bodyHtml: body, meta: { 목표: goal.trim(), 의식: active.name, 연속: String(state.streak) },
    })
    flash(id ? '프로젝트 자료 “집필 일지”에 오늘의 목표를 기록했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 목표를 수집함에 담기(연계)
  const stashGoal = () => {
    if (!goalReady) { flash('먼저 오늘의 목표를 한 줄 적어주세요.'); return }
    addToStash({ kind: 'note', label: '오늘의 목표', text: goal.trim() })
    flash('수집함에 오늘의 목표를 담았어요.')
  }

  // ── 스타일(인라인 + CSS 변수) ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const select: React.CSSProperties = { flex: 1, minWidth: 120, padding: '7px 9px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 8 }
  const muted: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', marginBottom: 6 }
  const stepBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '6px 0' }
  const clock: React.CSSProperties = { fontSize: 46, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: running ? 'var(--accent)' : 'var(--text)' }
  const stepLabel: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: warmupReady && !running ? 'var(--ok)' : 'var(--accent)' }
  const ring: React.CSSProperties = { position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }
  const badge = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 9px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--panel)', color: on ? 'var(--ok)' : 'var(--muted)' })
  const goalInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: 15, borderRadius: 10, border: `1px solid ${goalReady ? 'var(--ok)' : 'var(--border)'}`, background: 'var(--paper)', color: 'var(--text)', outline: 'none' }
  const linkbar: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 2 }
  const del: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: 2 }
  const focusBtn = (on: boolean): React.CSSProperties => ({ fontSize: 12, padding: '6px 9px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--accent) 18%, var(--panel))' : 'var(--panel)', color: 'var(--text)', cursor: 'pointer' })

  // 진행 링(SVG 대신 conic-gradient)
  const ringFrac = active.warmupSec > 0 ? Math.min(1, elapsed / active.warmupSec) : 1
  const ringBg: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: '50%',
    background: `conic-gradient(${warmupReady ? 'var(--ok)' : 'var(--accent)'} ${ringFrac * 360}deg, var(--chrome-2) 0deg)`,
    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))',
    mask: 'radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))',
  }

  return (
    <div style={wrap}>
      {/* ── 헤더: 의식 선택/관리 + streak ── */}
      <div style={card}>
        <div style={head}>
          {renaming ? (
            <input
              style={input}
              value={renameVal}
              autoFocus
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
              onBlur={commitRename}
              aria-label="의식 이름"
              maxLength={40}
            />
          ) : (
            <select style={select} value={activeId} onChange={e => setState(s => ({ ...s, activeId: e.target.value }))} aria-label="의식 선택">
              {rituals.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button className="minibtn" title="이름 바꾸기" onClick={() => { setRenameVal(active.name); setRenaming(true) }}><Emoji e="✏️"/></button>
          <button className="minibtn" title="새 의식" onClick={addRitual}>＋</button>
          <button className="minibtn" title="복제" onClick={dupRitual}>⧉</button>
          <button className="minibtn" title="삭제" onClick={delRitual} disabled={rituals.length <= 1}><Emoji e="🗑️"/></button>
        </div>
        <div style={{ ...head, marginTop: 10, justifyContent: 'space-between' }}>
          <span style={badge(state.streak > 0)}><Emoji e="🔥"/> 연속 {state.streak}일</span>
          <span style={badge(false)}>★ 최고 {state.best}일</span>
          <span style={badge(false)}>총 {state.totalRuns}회</span>
        </div>
      </div>

      {/* ── 1) 사전 체크리스트 ── */}
      <div style={card}>
        <div style={sectionTitle}>
          <span>① 사전 체크리스트 <span style={{ color: checksReady ? 'var(--ok)' : 'var(--muted)', fontWeight: 600 }}>({doneCount}/{total})</span></span>
          <button className="minibtn" onClick={resetChecks} disabled={doneCount === 0}>모두 해제</button>
        </div>
        <div>
          {active.checklist.length === 0 ? (
            <div style={muted}>항목이 없어요. 아래에 나만의 준비 항목을 추가해 보세요.</div>
          ) : active.checklist.map(c => (
            <div key={c.id} style={checkRow}>
              <input type="checkbox" checked={c.done} onChange={() => toggleItem(c.id)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} aria-label={c.text} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', color: c.done ? 'var(--muted)' : 'var(--text)', textDecoration: c.done ? 'line-through' : 'none', cursor: 'pointer' }} onClick={() => toggleItem(c.id)}>{c.text}</span>
              <button style={del} className="minibtn" title="삭제" onClick={() => removeItem(c.id)}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            style={input}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            placeholder="준비 항목 추가 후 Enter…"
            maxLength={120}
            aria-label="체크리스트 항목 추가"
          />
          <button className="btn-primary" onClick={addItem} disabled={!draft.trim()}>추가</button>
        </div>
      </div>

      {/* ── 2) 워밍업 타이머 ── */}
      <div style={card}>
        <div style={sectionTitle}>
          <span>② 워밍업 <span style={{ color: warmupReady ? 'var(--ok)' : 'var(--muted)', fontWeight: 600 }}>{Math.round(active.warmupSec / 60)}분</span></span>
          <label style={{ ...muted, display: 'flex', alignItems: 'center', gap: 5, cursor: soundSupported ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={sound && soundSupported} disabled={!soundSupported} onChange={e => setState(s => ({ ...s, sound: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
            {soundSupported ? '알림음' : '알림음 미지원'}
          </label>
        </div>

        <div style={stepBox}>
          <div style={ring}>
            <div style={ringBg} />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div style={clock}>{fmtClock(remaining)}</div>
            </div>
          </div>
          <div style={stepLabel}>{warmupReady && !running ? '✓ 워밍업 완료' : `${stepInfo.idx + 1}. ${stepInfo.step.label}`}</div>
          <div style={{ ...muted, textAlign: 'center', minHeight: 18 }}>{warmupReady && !running ? '몸과 마음이 데워졌어요. 이제 목표를 못 박을 차례.' : stepInfo.step.hint}</div>
        </div>

        {/* 시간 프리셋 + 직접 설정 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
          {[3, 5, 10, 15].map(m => (
            <button key={m} className={active.warmupSec === m * 60 ? 'btn-primary' : 'minibtn'} onClick={() => setWarmupSec(m * 60)} disabled={running}>{m}분</button>
          ))}
          <input
            type="number" min={1} max={30}
            value={Math.round(active.warmupSec / 60)}
            onChange={e => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) setWarmupSec(n * 60) }}
            disabled={running}
            style={{ width: 60, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
            aria-label="워밍업 분"
            title="직접 분 입력"
          />
        </div>

        <div style={actions}>
          {!running ? (
            <button className="btn-primary" onClick={startWarmup}>{remaining < active.warmupSec && remaining > 0 ? '▶ 이어서' : '▶ 워밍업 시작'}</button>
          ) : (
            <button className="minibtn" onClick={pauseWarmup}>⏸ 일시정지</button>
          )}
          <button className="minibtn" onClick={resetWarmup} disabled={remaining === active.warmupSec && !running}>↺ 리셋</button>
          <button className="minibtn" onClick={skipWarmup} disabled={warmupReady}>⏭ 건너뛰기</button>
        </div>
      </div>

      {/* ── 3) 오늘의 목표 한 줄 ── */}
      <div style={card}>
        <div style={sectionTitle}>
          <span>③ 오늘의 목표 한 줄</span>
          <span style={{ color: goalReady ? 'var(--ok)' : 'var(--muted)', fontSize: 12 }}>{goalReady ? '✓' : '필수'}</span>
        </div>
        <input
          style={goalInput}
          value={goal}
          onChange={e => setState(s => ({ ...s, goal: e.target.value }))}
          placeholder="예) 3장 도입부를 끝까지 초고로 쏟아낸다"
          maxLength={160}
          aria-label="오늘의 목표"
        />
        <div style={{ ...muted, marginTop: 6 }}>“단 하나”만 적으세요. 막연한 ‘많이 쓰기’보다 구체적인 한 문장이 손을 움직이게 합니다.</div>
      </div>

      {/* ── 집중 도구 선택 + 이제 쓰자 ── */}
      <div style={card}>
        <div style={sectionTitle}><span>들어갈 집중 도구</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FOCUS_TOOLS.map(t => (
            <button key={t.id} style={focusBtn(active.focusToolId === t.id)} onClick={() => setFocusTool(t.id)} title={`${t.label}로 들어가기`}>
              <Emoji e={t.icon}/> {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={badge(checksReady)}>{checksReady ? '✓' : '○'} 체크리스트</span>
          <span style={badge(warmupReady)}>{warmupReady ? '✓' : '○'} 워밍업</span>
          <span style={badge(goalReady)}>{goalReady ? '✓' : '○'} 목표</span>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 12, padding: '12px', fontSize: 16, fontWeight: 700, opacity: allReady ? 1 : 0.92 }}
          onClick={nowWrite}
          title={allReady ? '집중 도구로 들어갑니다' : '세 단계를 모두 마치면 가장 좋아요(지금 들어갈 수도 있습니다)'}
        >
          <Emoji e="🕯️"/> {allReady ? '이제 쓰자!' : '이제 쓰자 (준비를 마저 해도 좋아요)'}
        </button>
        {!allReady && <div style={{ ...muted, textAlign: 'center', marginTop: 6 }}>아직 {[!checksReady && '체크리스트', !warmupReady && '워밍업', !goalReady && '목표'].filter(Boolean).join('·')}가 남았어요.</div>}
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', lineHeight: 1.5 }}>{toast}</div>}

      {/* ── 연계 ── */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={saveGoalToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '오늘의 목표·체크 상태를 자료 “집필 일지”에 기록' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        {hasStash() && <button className="linkbtn" onClick={stashGoal} title="오늘의 목표를 수집함에 담기"><Emoji e="📌"/> 수집함에 담기</button>}
        <button className="linkbtn" onClick={() => openToolLinked('session-goal', goalReady ? { goal: goal.trim() } : undefined)} title="세션 목표 도구 열기"><Emoji e="🎯"/> 세션 목표</button>
        <button className="linkbtn" onClick={() => openToolLinked('breathing-timer')} title="집중 호흡 도구 열기"><Emoji e="🫁"/> 집중 호흡</button>
      </div>

      <div style={muted}>
        의식은 통째로 여러 개 만들어 저장할 수 있어요(아침/밤, 단편/장편 등). 진행은 이 브라우저에 자동 저장되며, 하루에 한 번 “이제 쓰자”를 누르면 연속 수행(streak)이 쌓입니다.
      </div>
    </div>
  )
}
