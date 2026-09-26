// 스프린트 리그 — 글쓰기 스프린트(집중 집필) 세션을 누적 기록해 "리그"처럼 관리하는 도구.
//  · 내장 타이머(카운트다운/카운트업)로 세션을 진행하고, 끝나면 단어수를 입력해 기록 저장.
//  · 수동 기록(과거 세션) 추가도 가능.
//  · 일/주 통계, 분당 단어수(WPM), 최고 기록(최다 단어·최장 시간·최고 속도), 막대 그래프(최근 14일),
//    주간 합계 그래프, 연속 집필일(현재/최장), 레벨·등급(누적 단어 기반).
// 영속: localStorage 'sry:tool:sprint-league'. 외부 네트워크/라이브러리 없음.
// 연계: 세션 1건 또는 전체 통계를 프로젝트 자료/초고에 추가, 수집함에 담기.
// 언마운트 시 타이머·오디오·리스너 정리.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'sprint-league', name: '스프린트 리그', icon: '🏆', group: '집중·생산성', intro: '글쓰기 스프린트를 타이머로 진행·기록하고 일/주 통계·최고 기록·연속일을 관리하세요', w: 720, h: 760 }

// ─────────────────────────────────────────────────────────── 모델 ───
interface Sprint {
  id: string
  ts: number          // 기록 시각(완료 시각) ms
  durMin: number      // 진행 시간(분) — 소수 허용
  words: number       // 작성 단어수
  label?: string      // 메모/프로젝트명
}
interface Store {
  sprints: Sprint[]
  defDurMin: number   // 마지막으로 쓴 타이머 길이
}

const SKEY = 'sry:tool:sprint-league'
const DAY_MS = 24 * 60 * 60 * 1000
const PRESETS = [5, 10, 15, 20, 25, 30, 45, 60]
const RECENT_DAYS = 14

// 누적 단어 기반 등급(리그) 정의 — 낮은→높은 순.
const LEAGUES = [
  { min: 0, name: '브론즈', icon: '🥉', color: '#b08d57' },
  { min: 2000, name: '실버', icon: '🥈', color: '#9aa3ad' },
  { min: 8000, name: '골드', icon: '🥇', color: '#e0b341' },
  { min: 20000, name: '플래티넘', icon: '💠', color: '#37c6c0' },
  { min: 50000, name: '다이아', icon: '💎', color: '#5aa9ff' },
  { min: 100000, name: '마스터', icon: '👑', color: '#c07bff' },
  { min: 200000, name: '그랜드마스터', icon: '🏆', color: '#ff7b54' },
]

// ─────────────────────────────────────────────────────── 유틸 ───
function uid(): string {
  return 's_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// 로컬 타임존 'YYYY-MM-DD'
function dayKey(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
function fmtDur(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}초`
  const whole = Math.floor(min)
  const sec = Math.round((min - whole) * 60)
  if (sec === 0) return `${whole}분`
  return `${whole}분 ${sec}초`
}
function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function wpm(words: number, durMin: number): number {
  if (durMin <= 0) return 0
  return words / durMin
}
function clampNum(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function load(): Store {
  const def: Store = { sprints: [], defDurMin: 20 }
  try {
    const raw = localStorage.getItem(SKEY)
    if (!raw) return def
    const p = JSON.parse(raw) as Partial<Store>
    const sprints = Array.isArray(p.sprints)
      ? p.sprints.filter((s): s is Sprint =>
          !!s && typeof s.id === 'string' && typeof s.ts === 'number' &&
          typeof s.durMin === 'number' && typeof s.words === 'number')
      : []
    return {
      sprints: sprints.sort((a, b) => b.ts - a.ts),
      defDurMin: typeof p.defDurMin === 'number' ? clampNum(p.defDurMin, 1, 240) : 20,
    }
  } catch {
    return def
  }
}
function save(s: Store) {
  try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch { /* 용량/차단 무시 */ }
}

// ─────────────────────────────────────── 파생 통계 ───
interface Stats {
  total: number
  totalWords: number
  totalMin: number
  todayWords: number
  todaySprints: number
  weekWords: number
  weekSprints: number
  avgWpm: number
  bestWords: Sprint | null
  bestDur: Sprint | null
  bestWpm: Sprint | null
  curStreak: number
  longStreak: number
  activeDays: number
}
function computeStats(sprints: Sprint[]): Stats {
  const today = startOfDay(new Date())
  const weekStart = today.getTime() - 6 * DAY_MS
  let totalWords = 0, totalMin = 0
  let todayWords = 0, todaySprints = 0
  let weekWords = 0, weekSprints = 0
  let bestWords: Sprint | null = null
  let bestDur: Sprint | null = null
  let bestWpm: Sprint | null = null
  const dset = new Set<string>()
  const todayKey = dayKey(today)
  for (const s of sprints) {
    totalWords += s.words
    totalMin += s.durMin
    dset.add(dayKey(s.ts))
    if (dayKey(s.ts) === todayKey) { todayWords += s.words; todaySprints++ }
    if (s.ts >= weekStart) { weekWords += s.words; weekSprints++ }
    if (!bestWords || s.words > bestWords.words) bestWords = s
    if (!bestDur || s.durMin > bestDur.durMin) bestDur = s
    // 최고 속도는 최소 1분 이상 세션에서만(짧은 세션 왜곡 방지)
    if (s.durMin >= 1 && (!bestWpm || wpm(s.words, s.durMin) > wpm(bestWpm.words, bestWpm.durMin))) bestWpm = s
  }
  // 스트릭
  let curStreak = 0
  let cursor = dset.has(todayKey) ? today : new Date(today.getTime() - DAY_MS)
  while (dset.has(dayKey(cursor))) { curStreak++; cursor = new Date(cursor.getTime() - DAY_MS) }
  let longStreak = 0
  if (dset.size > 0) {
    const sorted = Array.from(dset).sort()
    let run = 1; longStreak = 1
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + 'T00:00:00')
      const cur = new Date(sorted[i] + 'T00:00:00')
      const diff = Math.round((cur.getTime() - prev.getTime()) / DAY_MS)
      if (diff === 1) { run++; if (run > longStreak) longStreak = run }
      else if (diff !== 0) run = 1
    }
  }
  return {
    total: sprints.length,
    totalWords, totalMin,
    todayWords, todaySprints,
    weekWords, weekSprints,
    avgWpm: totalMin > 0 ? totalWords / totalMin : 0,
    bestWords, bestDur, bestWpm,
    curStreak, longStreak,
    activeDays: dset.size,
  }
}

function leagueFor(totalWords: number) {
  let idx = 0
  for (let i = 0; i < LEAGUES.length; i++) if (totalWords >= LEAGUES[i].min) idx = i
  const cur = LEAGUES[idx]
  const next = LEAGUES[idx + 1] || null
  const into = totalWords - cur.min
  const span = next ? next.min - cur.min : 0
  const pct = next ? clampNum(into / span, 0, 1) : 1
  return { cur, next, pct, toNext: next ? next.min - totalWords : 0 }
}

// 최근 N일 일별 합계(오래된→오늘)
function dailySeries(sprints: Sprint[], days: number): { key: string; label: string; words: number; min: number; count: number }[] {
  const today = startOfDay(new Date())
  const buckets: Record<string, { words: number; min: number; count: number }> = {}
  for (const s of sprints) {
    const k = dayKey(s.ts)
    if (!buckets[k]) buckets[k] = { words: 0, min: 0, count: 0 }
    buckets[k].words += s.words; buckets[k].min += s.durMin; buckets[k].count++
  }
  const out: { key: string; label: string; words: number; min: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS)
    const k = dayKey(d)
    const b = buckets[k] || { words: 0, min: 0, count: 0 }
    out.push({ key: k, label: `${d.getMonth() + 1}/${d.getDate()}`, ...b })
  }
  return out
}
// 최근 N주 주별 합계(월요일 시작 주)
function weeklySeries(sprints: Sprint[], weeks: number): { label: string; words: number; count: number }[] {
  const today = startOfDay(new Date())
  // 이번 주 월요일
  const dow = (today.getDay() + 6) % 7 // 월=0
  const thisMon = new Date(today.getTime() - dow * DAY_MS)
  const out: { label: string; words: number; count: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = thisMon.getTime() - w * 7 * DAY_MS
    const end = start + 7 * DAY_MS
    let words = 0, count = 0
    for (const s of sprints) if (s.ts >= start && s.ts < end) { words += s.words; count++ }
    const sd = new Date(start)
    out.push({ label: `${sd.getMonth() + 1}/${sd.getDate()}`, words, count })
  }
  return out
}

// ───────────────────────────────────────────────── 컴포넌트 ───
type TimerMode = 'down' | 'up'
type Tab = 'overview' | 'history'

export default function SprintLeague({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(load)
  const [tab, setTab] = useState<Tab>('overview')

  // 타이머 상태
  const [mode, setMode] = useState<TimerMode>('down')
  const [durMin, setDurMin] = useState<number>(() => store.defDurMin)
  const [durInput, setDurInput] = useState<string>(() => String(store.defDurMin))
  const [running, setRunning] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0) // 누적 경과(초)
  const [finished, setFinished] = useState(false)  // 카운트다운 완료(단어 입력 대기)

  // 단어 입력(세션 완료 후/수동)
  const [wordInput, setWordInput] = useState('')
  const [labelInput, setLabelInput] = useState('')

  // 수동 기록 폼
  const [manualOpen, setManualOpen] = useState(false)
  const [mWords, setMWords] = useState('')
  const [mMin, setMMin] = useState('20')
  const [mLabel, setMLabel] = useState('')

  const [toast, setToast] = useState('')

  const intervalRef = useRef<number | null>(null)
  const startStampRef = useRef<number>(0)   // 진행 시작 절대시각
  const baseSecRef = useRef<number>(0)      // 일시정지 누적분
  const audioCtxRef = useRef<AudioContext | null>(null)
  const toastTimer = useRef<number | null>(null)

  const stats = useMemo(() => computeStats(store.sprints), [store.sprints])
  const league = useMemo(() => leagueFor(stats.totalWords), [stats.totalWords])
  const daily = useMemo(() => dailySeries(store.sprints, RECENT_DAYS), [store.sprints])
  const weekly = useMemo(() => weeklySeries(store.sprints, 8), [store.sprints])

  // payload 로 외부에서 단어/시간/메모 프리필(예: 다른 도구에서 스프린트 결과 넘김)
  useEffect(() => {
    if (!payload) return
    if (typeof payload.words === 'number' && payload.words > 0) setWordInput(String(Math.round(payload.words)))
    if (typeof payload.durMin === 'number' && payload.durMin > 0) {
      const c = clampNum(payload.durMin, 0.1, 240)
      setMMin(String(c)); setManualOpen(true)
    }
    if (typeof payload.label === 'string') { setLabelInput(payload.label); setMLabel(payload.label) }
    // 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속화
  useEffect(() => { save(store) }, [store])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === SKEY) setStore(load()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  // 알림음(Web Audio) — graceful
  const beep = useCallback(() => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') { ctx = new Ctor(); audioCtxRef.current = ctx }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      ;[880, 1175, 1568].forEach((f, i) => {
        const osc = ctx!.createOscillator(); const g = ctx!.createGain()
        osc.type = 'sine'; osc.frequency.value = f
        const t0 = now + i * 0.16, t1 = t0 + 0.16
        g.gain.setValueAtTime(0.0001, t0)
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t1)
        osc.connect(g); g.connect(ctx!.destination)
        osc.start(t0); osc.stop(t1 + 0.02)
      })
    } catch { /* 오디오 미지원 무시 */ }
  }, [])

  // 타이머 틱 — 절대시각 기반(탭 스로틀링에도 정확). down 모드는 0 도달 시 자동 완료.
  useEffect(() => {
    if (!running) return
    startStampRef.current = Date.now()
    const targetSec = durMin * 60
    const tick = () => {
      const sec = baseSecRef.current + (Date.now() - startStampRef.current) / 1000
      if (mode === 'down' && sec >= targetSec) {
        setElapsedSec(targetSec)
        if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
        setRunning(false)
        setFinished(true)
        beep()
        return
      }
      setElapsedSec(sec)
    }
    intervalRef.current = window.setInterval(tick, 200)
    tick()
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
      // 일시정지: 경과 누적분 보존
      baseSecRef.current = baseSecRef.current + (Date.now() - startStampRef.current) / 1000
    }
    // durMin/mode 변경은 정지 상태에서만 발생하므로 deps 단순화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (toastTimer.current != null) { clearTimeout(toastTimer.current); toastTimer.current = null }
      const ctx = audioCtxRef.current
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  // ── 타이머 제어 ──
  const commitDur = () => {
    const n = parseFloat(durInput)
    const c = clampNum(Number.isFinite(n) ? n : 20, 1, 240)
    setDurMin(c); setDurInput(String(c))
    setStore(s => ({ ...s, defDurMin: c }))
    if (!running) { setElapsedSec(0); baseSecRef.current = 0 }
  }
  const pickPreset = (m: number) => {
    if (running) return
    setMode('down'); setDurMin(m); setDurInput(String(m))
    setStore(s => ({ ...s, defDurMin: m }))
    setElapsedSec(0); baseSecRef.current = 0; setFinished(false)
  }
  const startTimer = () => {
    if (running) return
    if (finished) return
    setFinished(false)
    setRunning(true)
  }
  const pauseTimer = () => setRunning(false)
  const resumeTimer = () => { if (!finished) setRunning(true) }
  const resetTimer = () => {
    setRunning(false); setFinished(false)
    setElapsedSec(0); baseSecRef.current = 0
  }
  // 카운트업 모드에서 "여기서 끝내기" → 단어 입력 단계로
  const stopAndLog = () => {
    setRunning(false)
    setFinished(true)
  }

  // ── 기록 저장 ──
  const recordSession = () => {
    const w = parseInt(wordInput, 10)
    if (!Number.isFinite(w) || w < 0) { flash('단어수를 입력하세요'); return }
    // 실제 진행 분: 카운트다운은 durMin, 카운트업은 경과. 단, 완료 직전 경과치 우선.
    const actualMin = mode === 'down'
      ? durMin
      : Math.max(0.1, Math.round((elapsedSec / 60) * 100) / 100)
    const sp: Sprint = {
      id: uid(), ts: Date.now(),
      durMin: mode === 'down' ? durMin : actualMin,
      words: w,
      label: labelInput.trim() || undefined,
    }
    setStore(s => ({ ...s, sprints: [sp, ...s.sprints].sort((a, b) => b.ts - a.ts) }))
    // PB 알림
    const prevBestW = stats.bestWords?.words ?? -1
    const prevBestWpm = stats.bestWpm && stats.bestWpm.durMin >= 1 ? wpm(stats.bestWpm.words, stats.bestWpm.durMin) : -1
    const thisWpm = sp.durMin >= 1 ? wpm(sp.words, sp.durMin) : -1
    if (w > prevBestW) flash(`🏆 신기록! 최다 단어 ${w.toLocaleString()}자`)
    else if (thisWpm > prevBestWpm && thisWpm >= 0) flash(`⚡ 신기록! 최고 속도 ${thisWpm.toFixed(0)} WPM`)
    else flash(`기록 저장됨 · ${w.toLocaleString()}단어`)
    // 리셋
    setWordInput(''); setLabelInput('')
    setFinished(false); setElapsedSec(0); baseSecRef.current = 0
  }

  const addManual = () => {
    const w = parseInt(mWords, 10)
    const m = parseFloat(mMin)
    if (!Number.isFinite(w) || w < 0) { flash('단어수를 확인하세요'); return }
    if (!Number.isFinite(m) || m <= 0) { flash('시간을 확인하세요'); return }
    const sp: Sprint = {
      id: uid(), ts: Date.now(),
      durMin: clampNum(m, 0.1, 600), words: w,
      label: mLabel.trim() || undefined,
    }
    setStore(s => ({ ...s, sprints: [sp, ...s.sprints].sort((a, b) => b.ts - a.ts) }))
    flash(`수동 기록 추가됨 · ${w.toLocaleString()}단어`)
    setMWords(''); setMLabel(''); setManualOpen(false)
  }

  const deleteSprint = (id: string) => {
    setStore(s => ({ ...s, sprints: s.sprints.filter(x => x.id !== id) }))
  }
  const clearAll = () => {
    if (window.confirm('모든 스프린트 기록을 삭제할까요? 되돌릴 수 없습니다.')) {
      setStore(s => ({ ...s, sprints: [] }))
      flash('전체 기록 삭제됨')
    }
  }

  // ── 연계: 통계 요약을 프로젝트/수집함으로 ──
  const statsSummaryText = useCallback(() => {
    const lines = [
      `[스프린트 리그] ${league.cur.icon} ${league.cur.name} 리그`,
      `누적: ${stats.total}세션 · ${stats.totalWords.toLocaleString()}단어 · ${fmtDur(stats.totalMin)}`,
      `오늘: ${stats.todaySprints}세션 · ${stats.todayWords.toLocaleString()}단어`,
      `이번 주: ${stats.weekSprints}세션 · ${stats.weekWords.toLocaleString()}단어`,
      `평균 속도: ${stats.avgWpm.toFixed(1)} WPM · 활동일 ${stats.activeDays}일 · 현재 연속 ${stats.curStreak}일(최장 ${stats.longStreak}일)`,
      stats.bestWords ? `최다 단어: ${stats.bestWords.words.toLocaleString()}단어 (${fmtDur(stats.bestWords.durMin)})` : '',
      stats.bestWpm ? `최고 속도: ${wpm(stats.bestWpm.words, stats.bestWpm.durMin).toFixed(0)} WPM` : '',
      stats.bestDur ? `최장 시간: ${fmtDur(stats.bestDur.durMin)}` : '',
    ].filter(Boolean)
    return lines.join('\n')
  }, [stats, league])

  const exportToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다'); return }
    const recent = store.sprints.slice(0, 30)
    const rows = recent.map(s =>
      `<tr><td>${esc(fmtDate(s.ts))}</td><td>${esc(fmtDur(s.durMin))}</td><td>${s.words.toLocaleString()}</td><td>${wpm(s.words, s.durMin).toFixed(0)}</td><td>${esc(s.label || '')}</td></tr>`
    ).join('')
    const bodyHtml =
      `<p>${esc(statsSummaryText()).replace(/\n/g, '<br>')}</p>` +
      `<p><b>최근 ${recent.length}개 세션</b></p>` +
      `<table border="1" cellspacing="0" cellpadding="4"><tr><th>일시</th><th>시간</th><th>단어</th><th>WPM</th><th>메모</th></tr>${rows}</table>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 기록',
      title: `스프린트 리그 — ${dayKey(Date.now())}`,
      bodyHtml,
      meta: {
        리그: `${league.cur.name}`,
        총세션: String(stats.total),
        누적단어: String(stats.totalWords),
        '평균WPM': stats.avgWpm.toFixed(1),
        현재연속일: String(stats.curStreak),
      },
    })
    flash(id ? '프로젝트 자료에 추가됨' : '프로젝트 추가 실패')
  }

  const stashStats = () => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다'); return }
    addToStash({ kind: 'memo', label: '스프린트 리그 통계', text: statsSummaryText() })
    flash('수집함에 담음')
  }

  // ── 타이머 표시값 ──
  const targetSec = durMin * 60
  const remainSec = mode === 'down' ? Math.max(0, targetSec - elapsedSec) : elapsedSec
  const liveWpm = elapsedSec > 0 && wordInput.trim()
    ? wpm(parseInt(wordInput, 10) || 0, elapsedSec / 60)
    : 0
  const progress = mode === 'down' && targetSec > 0 ? clampNum(elapsedSec / targetSec, 0, 1) : 0
  const ringColor = finished ? 'var(--ok)' : 'var(--accent)'

  // 차트 최대값
  const dailyMax = Math.max(1, ...daily.map(d => d.words))
  const weeklyMax = Math.max(1, ...weekly.map(w => w.words))

  // ─────────────────────────────────────── 스타일 ───
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px', flexWrap: 'wrap' }
  const tabsRow: React.CSSProperties = { display: 'flex', gap: 6, padding: '0 14px 8px', borderBottom: '1px solid var(--border)' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--text)' : 'var(--muted)', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 500,
  })
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
  const input: React.CSSProperties = { boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const statGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const statCard: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }
  const statLbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 4 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 헤더: 리그 배지 */}
      <div style={header}>
        <div style={{ fontSize: 30 }}><Emoji e={league.cur.icon} /></div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: league.cur.color }}>{league.cur.name} 리그</div>
          <div style={{ ...hint, marginTop: 2 }}>
            누적 {stats.totalWords.toLocaleString()}단어
            {league.next ? ` · 다음 ${league.next.name}까지 ${league.toNext.toLocaleString()}단어` : ' · 최고 등급 달성!'}
          </div>
          {/* 리그 진행 막대 */}
          <div style={{ height: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
            <div style={{ height: '100%', width: `${(league.pct * 100).toFixed(1)}%`, background: league.cur.color, transition: 'width .3s' }} />
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={tabsRow}>
        <button style={tabBtn(tab === 'overview')} onClick={() => setTab('overview')}><Emoji e="🏟" /> 대시보드</button>
        <button style={tabBtn(tab === 'history')} onClick={() => setTab('history')}><Emoji e="📜" /> 기록 ({stats.total})</button>
      </div>

      {tab === 'overview' ? (
        <div style={body}>
          {/* ── 타이머 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="⏱" /> 스프린트 타이머</div>
            {/* 모드 + 프리셋 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button className={mode === 'down' ? 'btn-primary' : 'minibtn'} disabled={running}
                onClick={() => { if (!running) { setMode('down'); resetTimer() } }}><Emoji e="⏳" /> 카운트다운</button>
              <button className={mode === 'up' ? 'btn-primary' : 'minibtn'} disabled={running}
                onClick={() => { if (!running) { setMode('up'); resetTimer() } }}><Emoji e="⏱" /> 스톱워치</button>
            </div>

            {mode === 'down' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {PRESETS.map(p => (
                  <button key={p} className={durMin === p && !running ? 'btn-primary' : 'minibtn'} disabled={running}
                    onClick={() => pickPreset(p)}>{p}분</button>
                ))}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input style={{ ...input, width: 64 }} type="number" min={1} max={240} value={durInput}
                    disabled={running}
                    onChange={e => setDurInput(e.target.value)}
                    onBlur={commitDur}
                    onKeyDown={e => { if (e.key === 'Enter') { commitDur(); (e.target as HTMLInputElement).blur() } }}
                    aria-label="사용자 지정 분" />
                  <span style={label}>분</span>
                </span>
              </div>
            )}

            {/* 타이머 디스플레이 */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{
                width: 150, height: 150, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: mode === 'down'
                  ? `conic-gradient(${ringColor} ${progress * 360}deg, var(--chrome-2) 0deg)`
                  : 'var(--chrome-2)',
                transition: 'background .3s linear',
              }}>
                <div style={{
                  width: 126, height: 126, borderRadius: '50%', background: 'var(--paper)',
                  border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: finished ? 'var(--ok)' : 'var(--text)' }}>
                    {fmtClock(remainSec)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {finished ? '완료!' : mode === 'down' ? `${durMin}분 집중` : '경과 시간'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                {!finished && !running && (
                  <button className="btn-primary" onClick={startTimer} style={{ padding: '10px 14px', fontWeight: 700 }}>
                    ▶ {elapsedSec > 0 ? '이어서' : '시작'}
                  </button>
                )}
                {running && (
                  <button className="minibtn" onClick={pauseTimer} style={{ padding: '10px 14px' }}>⏸ 일시정지</button>
                )}
                {!running && !finished && elapsedSec > 0 && (
                  <button className="minibtn" onClick={resumeTimer} style={{ padding: '8px 14px' }}>▶ 재개</button>
                )}
                {mode === 'up' && (running || elapsedSec > 0) && !finished && (
                  <button className="minibtn" onClick={stopAndLog} style={{ padding: '8px 14px' }}>⏹ 끝내고 기록</button>
                )}
                {(elapsedSec > 0 || finished) && (
                  <button className="linkbtn" onClick={resetTimer} style={{ fontSize: 12 }}>↺ 타이머 리셋</button>
                )}
                {elapsedSec > 0 && (
                  <div style={{ ...hint }}>경과 {fmtDur(elapsedSec / 60)}</div>
                )}
              </div>
            </div>

            {/* 세션 완료 → 단어 입력 */}
            {(finished || (mode === 'up' && elapsedSec > 0)) && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px dashed var(--accent)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="📝" /> 이번 세션 결과 기록</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input style={{ ...input, width: 110 }} type="number" min={0} placeholder="단어수"
                    value={wordInput} onChange={e => setWordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') recordSession() }}
                    aria-label="작성 단어수" autoFocus />
                  <span style={label}>단어</span>
                  <input style={{ ...input, flex: 1, minWidth: 120 }} type="text" placeholder="메모/프로젝트(선택)"
                    value={labelInput} onChange={e => setLabelInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') recordSession() }} />
                </div>
                {liveWpm > 0 && (
                  <div style={hint}>예상 속도: <b style={{ color: 'var(--accent)' }}>{liveWpm.toFixed(0)} WPM</b></div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={recordSession}>✓ 기록 저장</button>
                  <button className="minibtn" onClick={() => { setFinished(false); resetTimer(); setWordInput(''); setLabelInput('') }}>취소</button>
                </div>
              </div>
            )}
          </div>

          {/* ── 통계 요약 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="📊" /> 통계</div>
            <div style={statGrid}>
              <div style={statCard}><div style={statNum}>{stats.todayWords.toLocaleString()}</div><div style={statLbl}>오늘 단어</div></div>
              <div style={statCard}><div style={statNum}>{stats.weekWords.toLocaleString()}</div><div style={statLbl}>이번 주 단어</div></div>
              <div style={statCard}><div style={statNum}>{stats.avgWpm.toFixed(0)}</div><div style={statLbl}>평균 WPM</div></div>
              <div style={statCard}><div style={statNum}>{stats.total}</div><div style={statLbl}>총 세션</div></div>
              <div style={statCard}><div style={statNum}>{stats.curStreak}</div><div style={statLbl}>현재 연속일</div></div>
              <div style={statCard}><div style={statNum}>{stats.longStreak}</div><div style={statLbl}>최장 연속일</div></div>
              <div style={statCard}><div style={statNum}>{stats.activeDays}</div><div style={statLbl}>활동일</div></div>
              <div style={statCard}><div style={statNum}>{Math.round(stats.totalMin)}</div><div style={statLbl}>총 집필(분)</div></div>
            </div>
          </div>

          {/* ── 최고 기록 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="🏅" /> 최고 기록</div>
            {stats.total === 0 ? (
              <div style={hint}>아직 기록이 없습니다. 타이머로 첫 스프린트를 시작해 보세요!</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📚" /> 최다 단어</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{stats.bestWords ? stats.bestWords.words.toLocaleString() : 0}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}> 단어</span></div>
                  {stats.bestWords && <div style={hint}>{fmtDur(stats.bestWords.durMin)} · {fmtDate(stats.bestWords.ts)}</div>}
                </div>
                <div style={{ flex: '1 1 150px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="⚡" /> 최고 속도</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{stats.bestWpm ? wpm(stats.bestWpm.words, stats.bestWpm.durMin).toFixed(0) : 0}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}> WPM</span></div>
                  {stats.bestWpm && <div style={hint}>{stats.bestWpm.words.toLocaleString()}단어 / {fmtDur(stats.bestWpm.durMin)}</div>}
                </div>
                <div style={{ flex: '1 1 150px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="⏳" /> 최장 시간</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{stats.bestDur ? fmtDur(stats.bestDur.durMin) : '-'}</div>
                  {stats.bestDur && <div style={hint}>{stats.bestDur.words.toLocaleString()}단어 · {fmtDate(stats.bestDur.ts)}</div>}
                </div>
              </div>
            )}
          </div>

          {/* ── 일별 막대 그래프 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="📈" /> 최근 {RECENT_DAYS}일 (일별 단어수)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130, paddingTop: 4 }}>
              {daily.map((d, i) => {
                const isToday = i === daily.length - 1
                const h = d.words > 0 ? Math.max(4, (d.words / dailyMax) * 110) : 2
                return (
                  <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}
                    title={`${d.label}: ${d.words.toLocaleString()}단어 · ${d.count}세션`}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', height: 12, whiteSpace: 'nowrap' }}>
                      {d.words > 0 ? (d.words >= 1000 ? (d.words / 1000).toFixed(1) + 'k' : d.words) : ''}
                    </div>
                    <div style={{
                      width: '100%', maxWidth: 26, height: h, borderRadius: '4px 4px 2px 2px',
                      background: d.words > 0 ? (isToday ? 'var(--warn)' : 'var(--accent)') : 'var(--chrome-2)',
                      transition: 'height .3s', alignSelf: 'center',
                    }} />
                    <div style={{ fontSize: 9, color: isToday ? 'var(--text)' : 'var(--muted)', fontWeight: isToday ? 700 : 400, whiteSpace: 'nowrap' }}>{d.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 주별 그래프 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="🗓" /> 최근 8주 (주별 단어수)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 44, fontSize: 11, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{w.label}~</div>
                  <div style={{ flex: 1, height: 18, background: 'var(--chrome-2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${(w.words / weeklyMax * 100).toFixed(1)}%`, background: i === weekly.length - 1 ? 'var(--ok)' : 'var(--accent)', transition: 'width .3s', minWidth: w.words > 0 ? 3 : 0 }} />
                  </div>
                  <div style={{ width: 70, fontSize: 11, textAlign: 'right', flexShrink: 0 }}>{w.words.toLocaleString()}<span style={{ color: 'var(--muted)' }}> ·{w.count}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 수동 기록 + 연계 ── */}
          <div style={card}>
            <div style={sectionTitle}><Emoji e="➕" /> 수동 기록 / 내보내기</div>
            {!manualOpen ? (
              <button className="minibtn" onClick={() => setManualOpen(true)}>＋ 과거 세션 직접 추가</button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <input style={{ ...input, width: 100 }} type="number" min={0} placeholder="단어수" value={mWords} onChange={e => setMWords(e.target.value)} aria-label="단어수" />
                <input style={{ ...input, width: 90 }} type="number" min={0.1} step={0.5} placeholder="분" value={mMin} onChange={e => setMMin(e.target.value)} aria-label="분" />
                <input style={{ ...input, flex: 1, minWidth: 120 }} type="text" placeholder="메모(선택)" value={mLabel} onChange={e => setMLabel(e.target.value)} />
                <button className="btn-primary" onClick={addManual}>추가</button>
                <button className="minibtn" onClick={() => setManualOpen(false)}>닫기</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button className="minibtn" onClick={exportToProject} disabled={!hasProjectBridge() || stats.total === 0}
                title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '통계와 최근 기록을 프로젝트 자료에 추가'}><Emoji e="📁" /> 프로젝트에 통계 추가</button>
              <button className="minibtn" onClick={stashStats} disabled={!hasStash() || stats.total === 0}
                title={!hasStash() ? '수집함에 연결되어 있지 않습니다' : '통계 요약을 수집함에 담기'}><Emoji e="📌" /> 수집함에 통계</button>
            </div>
          </div>

          <div style={hint}>스프린트 = 정해진 시간 동안 멈추지 않고 쓰는 집필 훈련. 타이머로 진행한 뒤 작성한 단어수를 입력하면 자동으로 통계가 쌓입니다. 모든 기록은 이 브라우저에만 저장됩니다.</div>
        </div>
      ) : (
        // ───────────────────────── 기록 탭 ─────────────────────────
        <div style={body}>
          {store.sprints.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>
              아직 기록된 스프린트가 없습니다.<br />대시보드에서 타이머로 첫 세션을 진행해 보세요.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...hint, flex: 1 }}>총 {store.sprints.length}개 세션 · {stats.totalWords.toLocaleString()}단어</div>
                <button className="linkbtn" onClick={clearAll} style={{ fontSize: 12, color: 'var(--err, var(--warn))' }}>전체 삭제</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {store.sprints.map(s => {
                  const w = wpm(s.words, s.durMin)
                  const isBest = stats.bestWords?.id === s.id || stats.bestWpm?.id === s.id || stats.bestDur?.id === s.id
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                      background: 'var(--panel)', border: `1px solid ${isBest ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{s.words.toLocaleString()}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>단어 · {fmtDur(s.durMin)} · {w.toFixed(0)} WPM</span>
                          {stats.bestWords?.id === s.id && <span title="최다 단어" style={{ fontSize: 12 }}><Emoji e="🏆" /></span>}
                          {stats.bestWpm?.id === s.id && <span title="최고 속도" style={{ fontSize: 12 }}><Emoji e="⚡" /></span>}
                          {stats.bestDur?.id === s.id && <span title="최장 시간" style={{ fontSize: 12 }}><Emoji e="⏳" /></span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fmtDate(s.ts)}{s.label ? ` · ${s.label}` : ''}
                        </div>
                      </div>
                      <button className="linkbtn" onClick={() => deleteSprint(s.id)} title="삭제" style={{ fontSize: 12, flexShrink: 0 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--paper)', padding: '8px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.25)', zIndex: 20, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </div>
  )
}
