// 작가 대시보드(홈) — 개인 집필 현황을 한 화면에.
//  · 오늘/이번 주 목표 분량 진행(단위는 targetUnit 단일 출처: 단어/자. 직접 입력 + 빠른 +/- 기록)
//  · 연속 집필일(현재/최장) + 최근 5주 미니 잔디 (집필 스트릭 도구의 기록도 읽어 합산)
//  · 최근 연 도구 빠른 실행(openToolLinked) + 자주 쓰는 도구 즐겨찾기
//  · 오늘의 글감 한 줄(내장 프롬프트, 날짜 기반 회전)
//  · 빠른 메모(수집함에 담기) + 로컬 메모 목록
// react 와 './linkbus' 외 import 없음 / 외부 네트워크 없음 / 영속 localStorage.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { openToolLinked, addToStash, hasStash, getWritingStats, Emoji, type WritingStats } from './linkbus'

export const meta = { id: 'writer-dashboard', name: '작가 대시보드', icon: '🏠', group: '집중·생산성', intro: '오늘/이번 주 목표, 연속 집필일, 빠른 실행, 오늘의 글감, 메모를 한 화면에', w: 760, h: 760 }

// ── localStorage 네임스페이스 (규약: sry:tool:<id>) ──
const NS = 'sry:tool:writer-dashboard:'
const K_LOG = NS + 'log'        // { 'YYYY-MM-DD': 글자수누계 }
const K_GOALS = NS + 'goals'    // { day:number, week:number }
const K_RECENT = NS + 'recent'  // string[] (도구 id, 최신 우선)
const K_FAVS = NS + 'favs'      // string[] (즐겨찾기 도구 id)
const K_MEMOS = NS + 'memos'    // { id, text, ts }[]
// 집필 스트릭 도구가 쓰는 키(읽기 전용으로 합산해 연속일을 풍부하게)
const K_STREAK = 'sry:tool:streak-tracker:days'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_GOALS = { day: 1000, week: 5000 }
const DAY_PRESETS = [500, 1000, 2000, 3000]
const QUICK_STEPS = [100, 250, 500, -100]

// ── 목표 단위 단일 출처(targetUnit) ──────────────────────────────────────────
// 코어(프로젝트 설정)는 단위를 settings.targetUnit('words'|'chars')로 관리하고,
// 이 도구는 그동안 '자'(chars)로만 표기해 코어의 '단어'와 혼용돼 목표 비교가 헷갈렸다.
// 도구는 react·./linkbus 만 import 할 수 있어 스토어를 직접 못 읽으므로,
//  · payload.targetUnit 으로 코어 단위를 받아 반영(연계 확장 대비),
//  · 못 받으면 마지막으로 본 단위(영속) → 기본 'chars' 로 폴백한다.
// 모든 진행 위젯이 아래의 단일 unitLabel/fmtCount 를 쓰도록 통일한다.
type TargetUnit = 'words' | 'chars'
const K_UNIT = NS + 'unit'        // 마지막으로 확인된 목표 단위(payload 미수신 시 폴백)
const DEFAULT_UNIT: TargetUnit = 'chars'
// 단위 라벨(코어와 동일 어휘: words→단어, chars→자).
const UNIT_LABEL: Record<TargetUnit, string> = { words: '단어', chars: '자' }
function normUnit(u: unknown): TargetUnit | null {
  return u === 'words' || u === 'chars' ? u : null
}

// 자주 함께 쓰는 도구(즐겨찾기 후보 + 기본 빠른 실행). registry 를 import 할 수 없으므로 inline.
const SUGGESTED: { id: string; name: string; icon: string }[] = [
  { id: 'session-goal', name: '세션 목표', icon: '🎯' },
  { id: 'pomodoro-timer', name: '뽀모도로', icon: '🍅' },
  { id: 'warmup-prompt', name: '글쓰기 워밍업', icon: '🔥' },
  { id: 'streak-tracker', name: '집필 스트릭', icon: '🔥' },
  { id: 'word-sprint', name: '단어 스프린트', icon: '⚡' },
  { id: 'focus-lock', name: '집중 잠금', icon: '🔒' },
  { id: 'ambient-sound', name: '앰비언트 사운드', icon: '🎧' },
  { id: 'deadline-countdown', name: '마감 카운트다운', icon: '⏳' },
  { id: 'kanban-writing', name: '집필 칸반', icon: '🗂️' },
  { id: 'character-sheet', name: '인물 시트', icon: '🧑‍🎤' },
  { id: 'scene-list', name: '장면 목록', icon: '🎬' },
  { id: 'tool-hub', name: '도구 허브', icon: '🧰' },
]
const NAME_BY_ID: Record<string, { name: string; icon: string }> = Object.fromEntries(
  SUGGESTED.map((s) => [s.id, { name: s.name, icon: s.icon }]),
)

// ── 날짜 유틸(로컬 타임존 기준) ──
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
// 월요일 시작 주: 이번 주의 날짜 키 7개
function weekKeys(ref: Date): string[] {
  const today = startOfDay(ref)
  const dow = (today.getDay() + 6) % 7 // 월=0 … 일=6
  const monday = new Date(today.getTime() - dow * DAY_MS)
  return Array.from({ length: 7 }, (_, i) => dayKey(new Date(monday.getTime() + i * DAY_MS)))
}

// ── 로드/세이브(graceful) ──
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return (v ?? fallback) as T
  } catch { return fallback }
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 미지원/용량초과 graceful */ }
}
// 집필 스트릭 도구의 날짜 집합(배열)을 읽어온다.
function loadStreakDays(): string[] {
  try {
    const raw = localStorage.getItem(K_STREAK)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch { return [] }
}

// ── 스트릭 계산: 글자 기록이 있는 날 ∪ 스트릭 도구 체크일 ──
function activeDaySet(log: Record<string, number>, streakDays: string[]): Set<string> {
  const s = new Set<string>(streakDays)
  for (const [k, v] of Object.entries(log)) if (v > 0) s.add(k)
  return s
}
function currentStreak(set: Set<string>): number {
  const today = startOfDay(new Date())
  let count = 0
  let cursor = set.has(dayKey(today)) ? today : new Date(today.getTime() - DAY_MS)
  while (set.has(dayKey(cursor))) { count++; cursor = new Date(cursor.getTime() - DAY_MS) }
  return count
}
function longestStreak(set: Set<string>): number {
  if (set.size === 0) return 0
  const sorted = Array.from(set).sort()
  let best = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const cur = new Date(sorted[i] + 'T00:00:00')
    const diff = Math.round((cur.getTime() - prev.getTime()) / DAY_MS)
    if (diff === 1) { run++; if (run > best) best = run }
    else if (diff !== 0) run = 1
  }
  return best
}

// ── 오늘의 글감(내장, 날짜 기반 회전) ──
const SPARKS = [
  '인물이 오늘 절대 하지 않을 한 가지를 정하고, 그걸 하게 만드는 상황을 써보세요.',
  '장면 하나를 골라 "그래서 무엇이 달라졌는가?"에 한 문장으로 답해보세요.',
  '대사 한 줄을 속마음과 정반대가 되게 고쳐 써보세요(서브텍스트).',
  '가장 약한 문단을 찾아, 명사·동사만 남기고 형용사·부사를 절반으로 줄여보세요.',
  '주인공이 가장 두려워하는 결말을 한 줄로 적고, 그 방향으로 한 발 밀어보세요.',
  '오늘 쓸 장면의 첫 문장을 다섯 가지 버전으로 써보고 하나만 고르세요.',
  '인물에게 비밀을 하나 더 주고, 그 비밀이 새어 나오는 순간을 상상해보세요.',
  '배경(장소) 한 곳을 다섯 감각 중 평소 안 쓰는 감각으로 묘사해보세요.',
  '갈등을 "둘 다 옳다"로 다시 설계해보세요. 누구도 악당이 아니게.',
  '챕터 마지막 줄을 다음 장을 안 읽고는 못 배기게 고쳐보세요(클리프행어).',
  '오늘 분량의 절반만 쓰되, 한 문장도 고치지 말고 끝까지 밀어붙여보세요.',
  '인물 한 명에게 "원하는 것"과 "필요한 것"을 따로 적어보세요. 둘은 충돌하나요?',
  '가장 긴 문장을 찾아 두세 문장으로 쪼개 호흡을 바꿔보세요.',
  '장면을 다른 인물의 시점(POV)에서 한 문단만 다시 써보세요.',
  '"보여주기"로 바꿀 설명 한 줄을 골라 행동·감각·대사로 풀어보세요.',
  '오늘의 한 단어를 정하고(예: 균열, 빛, 빚), 그 단어가 스며든 장면을 써보세요.',
  '인물이 거짓말을 하는 장면을 쓰고, 독자만 진실을 알게 해보세요.',
  '결말을 먼저 한 줄로 쓰고, 거기서 거꾸로 오늘 장면을 설계해보세요.',
  '대화에서 지문을 모두 지웠다가, 꼭 필요한 행동 두 개만 다시 넣어보세요.',
  '오늘 쓰기 싫은 장면을 10분만, 엉망이어도 좋으니 끝까지 써보세요.',
  '인물의 손이 무엇을 하고 있는지로 그의 감정을 드러내 보세요.',
  '세계관 규칙 하나를 정하고, 그 규칙을 어기면 벌어질 대가를 써보세요.',
  '한 장면에 "시계(마감/제한시간)"를 더해 긴장을 끌어올려보세요.',
  '가장 좋아하는 문장을 일부러 지워보세요. 그래도 장면이 사나요?',
]
function todaySpark(offset = 0): string {
  const epochDay = Math.floor((startOfDay(new Date()).getTime()) / DAY_MS)
  return SPARKS[((epochDay + offset) % SPARKS.length + SPARKS.length) % SPARKS.length]
}

interface Memo { id: string; text: string; ts: number }

export default function WriterDashboard({ payload }: { payload?: Record<string, unknown> }) {
  const [log, setLog] = useState<Record<string, number>>(() => loadJSON(K_LOG, {}))
  const [goals, setGoals] = useState(() => ({ ...DEFAULT_GOALS, ...loadJSON(K_GOALS, {}) }))
  const [recent, setRecent] = useState<string[]>(() => loadJSON<string[]>(K_RECENT, []))
  const [favs, setFavs] = useState<string[]>(() => loadJSON<string[]>(K_FAVS, ['session-goal', 'pomodoro-timer', 'warmup-prompt', 'streak-tracker']))
  const [memos, setMemos] = useState<Memo[]>(() => loadJSON<Memo[]>(K_MEMOS, []))
  const [streakDays, setStreakDays] = useState<string[]>(() => loadStreakDays())
  const [memoText, setMemoText] = useState('')
  const [sparkOffset, setSparkOffset] = useState(0)
  const [manual, setManual] = useState('') // 오늘 분량 직접 입력 임시값
  const [flash, setFlash] = useState('')
  // 목표 단위(단일 출처): payload.targetUnit 우선, 없으면 마지막 확인값(영속) → 기본.
  const [unit, setUnit] = useState<TargetUnit>(() => normUnit(loadJSON<unknown>(K_UNIT, null)) ?? DEFAULT_UNIT)
  const flashTimer = useRef<number | null>(null)
  // payload 로 들어온 오늘 분량(project.writingHistory[today].words)으로 1회 자동 시드했는지.
  const seededRef = useRef(false)

  // 코어 집필 통계(SSOT: project.writingHistory) — Footer/통계 화면과 동일한 숫자. 열 때·창 포커스 시 갱신.
  const [ssot, setSsot] = useState<WritingStats | null>(() => getWritingStats())
  useEffect(() => {
    const refresh = () => setSsot(getWritingStats())
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const tk = dayKey(new Date())
  const today = log[tk] || 0
  const wk = useMemo(() => weekKeys(new Date()), [])
  const weekTotal = wk.reduce((sum, k) => sum + (log[k] || 0), 0)
  const daySet = useMemo(() => activeDaySet(log, streakDays), [log, streakDays])
  const cur = currentStreak(daySet)
  const longest = longestStreak(daySet)

  // 단일 단위 라벨 + 카운트 표기 함수 — 모든 진행 위젯이 동일하게 사용(혼용 방지).
  const unitLabel = UNIT_LABEL[unit]
  const fmtCount = useCallback((n: number) => `${n.toLocaleString()}${unitLabel}`, [unitLabel])

  // payload 로 들어온 단위/오늘 분량 반영(코어 연계·자동 시드)
  //  · targetUnit: 코어 설정 단위를 받아 표기를 통일(영속해 다음 표시에도 유지).
  //  · todayWords: 코어 project.writingHistory[today].words 로 오늘 분량을 1회 자동 시드.
  //    (수기 입력값이 더 크면 보존 — 데이터를 줄이지 않는다. 자동 집계가 수기 기록을 덮지 않음.)
  //  · addWords: 기존 동작(증분 누적) 유지.
  useEffect(() => {
    const pu = normUnit(payload?.targetUnit)
    if (pu) setUnit(pu)
    const seed = Number(payload?.todayWords)
    if (!seededRef.current && Number.isFinite(seed) && seed >= 0) {
      seededRef.current = true
      setLog((prev) => {
        const have = prev[tk] || 0
        if (seed <= have) return prev // 기존(수기) 값이 더 크면 보존
        const next = { ...prev }
        if (seed <= 0) delete next[tk]; else next[tk] = seed
        return next
      })
    }
    const inc = Number(payload?.addWords)
    if (Number.isFinite(inc) && inc > 0) bumpToday(inc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 단위 영속(payload 미수신 시 다음 표시에도 같은 단위 유지)
  useEffect(() => { saveJSON(K_UNIT, unit) }, [unit])

  // 영속 저장
  useEffect(() => { saveJSON(K_LOG, log) }, [log])
  useEffect(() => { saveJSON(K_GOALS, goals) }, [goals])
  useEffect(() => { saveJSON(K_RECENT, recent) }, [recent])
  useEffect(() => { saveJSON(K_FAVS, favs) }, [favs])
  useEffect(() => { saveJSON(K_MEMOS, memos) }, [memos])

  // 다른 탭/창에서 같은 키 변경 시 동기화 + 스트릭 도구 변경 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K_LOG) setLog(loadJSON(K_LOG, {}))
      else if (e.key === K_GOALS) setGoals({ ...DEFAULT_GOALS, ...loadJSON(K_GOALS, {}) })
      else if (e.key === K_RECENT) setRecent(loadJSON<string[]>(K_RECENT, []))
      else if (e.key === K_FAVS) setFavs(loadJSON<string[]>(K_FAVS, []))
      else if (e.key === K_MEMOS) setMemos(loadJSON<Memo[]>(K_MEMOS, []))
      else if (e.key === K_STREAK) setStreakDays(loadStreakDays())
      else if (e.key === K_UNIT) { const u = normUnit(loadJSON<unknown>(K_UNIT, null)); if (u) setUnit(u) }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 언마운트 시 플래시 타이머 정리
  useEffect(() => () => { if (flashTimer.current !== null) { clearTimeout(flashTimer.current); flashTimer.current = null } }, [])

  const toast = useCallback((m: string) => {
    setFlash(m)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { setFlash(''); flashTimer.current = null }, 1800)
  }, [])

  // 오늘 글자수 가감(0 미만 방지)
  function bumpToday(delta: number) {
    setLog((prev) => {
      const next = { ...prev }
      const v = Math.max(0, (next[tk] || 0) + delta)
      if (v === 0) delete next[tk]; else next[tk] = v
      return next
    })
  }
  function setTodayAbsolute(v: number) {
    setLog((prev) => {
      const next = { ...prev }
      if (v <= 0) delete next[tk]; else next[tk] = v
      return next
    })
  }

  // 도구 빠른 실행 — 최근 목록 갱신 후 연계로 띄움
  const open = useCallback((id: string) => {
    setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8))
    openToolLinked(id)
  }, [])
  const toggleFav = (id: string) =>
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 12)))

  // 빠른 메모: 로컬 목록 + (가능하면) 수집함에 담기
  const addMemo = () => {
    const t = memoText.trim()
    if (!t) return
    const memo: Memo = { id: 'm_' + Date.now().toString(36), text: t, ts: Date.now() }
    setMemos((prev) => [memo, ...prev].slice(0, 50))
    if (hasStash()) { addToStash({ kind: 'memo', text: t, label: '대시보드 메모' }); toast('메모 저장 + 수집함에 담음') }
    else toast('메모 저장됨')
    setMemoText('')
  }
  const removeMemo = (id: string) => setMemos((prev) => prev.filter((m) => m.id !== id))

  // 빠른 실행에 보일 도구: 최근(이름 알려진 것) + 즐겨찾기 + 제안 — 중복 제거
  const recentResolved = recent.filter((id) => NAME_BY_ID[id]).slice(0, 6)
  const favResolved = favs.filter((id) => NAME_BY_ID[id])

  // 진행률
  const dayPct = goals.day > 0 ? Math.min(1, today / goals.day) : 0
  const weekPct = goals.week > 0 ? Math.min(1, weekTotal / goals.week) : 0
  const dayDone = goals.day > 0 && today >= goals.day
  const weekDone = goals.week > 0 && weekTotal >= goals.week

  // 메모 시각(상대)
  const relTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60_000) return '방금'
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + '분 전'
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + '시간 전'
    return Math.floor(diff / 86_400_000) + '일 전'
  }

  // 최근 5주 미니 잔디(월요일 시작)
  const grid = useMemo(() => {
    const today = startOfDay(new Date())
    const dow = (today.getDay() + 6) % 7
    const thisMon = new Date(today.getTime() - dow * DAY_MS)
    const WEEKS = 5
    const start = new Date(thisMon.getTime() - (WEEKS - 1) * 7 * DAY_MS)
    const cols: (Date | null)[][] = []
    for (let w = 0; w < WEEKS; w++) {
      const col: (Date | null)[] = []
      for (let r = 0; r < 7; r++) {
        const d = new Date(start.getTime() + (w * 7 + r) * DAY_MS)
        col.push(d > today ? null : d)
      }
      cols.push(col)
    }
    return cols
  }, [tk])

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflowY: 'auto' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }
  const h1: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: 0 }
  const sub: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const grids2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10 }
  const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }
  const track: React.CSSProperties = { height: 14, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', position: 'relative' }
  const fill = (pct: number, done: boolean): React.CSSProperties => ({ height: '100%', width: `${(pct * 100).toFixed(1)}%`, background: done ? 'var(--ok)' : 'var(--accent)', transition: 'width .3s, background .3s' })
  const pctLabel: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text)', mixBlendMode: 'difference' }
  const rowWrap: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const numInput: React.CSSProperties = { width: 92, padding: '5px 7px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }
  const statBig: React.CSSProperties = { fontSize: 22, fontWeight: 800, lineHeight: 1.1 }
  const goalLine: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }
  const cell = (lvl: number): React.CSSProperties => ({ width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border)', background: lvl === 0 ? 'var(--chrome-2)' : `color-mix(in srgb, var(--accent) ${30 + lvl * 23}%, transparent)` })
  const chipBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }
  const sparkBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.55, wordBreak: 'keep-all', minHeight: 48, display: 'flex', alignItems: 'center' }
  const ta: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' }
  const memoItem: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }

  // 잔디 칸 레벨(0~3): 글자수 비례
  const lvlOf = (k: string): number => {
    const v = log[k] || 0
    const checked = streakDays.includes(k)
    if (v <= 0) return checked ? 2 : 0
    if (v >= goals.day && goals.day > 0) return 3
    if (v >= goals.day / 2 && goals.day > 0) return 2
    return 1
  }

  const greet = (() => {
    const h = new Date().getHours()
    if (h < 5) return '늦은 밤이네요'
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '좋은 오후예요'
    return '좋은 저녁이에요'
  })()

  return (
    <div style={wrap}>
      <div style={header}>
        <h1 style={h1}><Emoji e="🏠" /> 작가 대시보드</h1>
        <span style={sub}>{greet} · 오늘 {fmtCount(today)} · 이번 주 {fmtCount(weekTotal)}</span>
      </div>

      {/* 원고 기준(코어와 동일) — 실제 원고에서 자동 집계된 단일 진실원천. 아래 '목표'는 직접 입력값이라 다를 수 있음. */}
      {ssot && (
        <div style={{ ...card, gap: 6 }}>
          <div style={cardTitle}><Emoji e="📊" /> 원고 기준(단어 집계) <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(코어 자동 집계 · 항상 단어 단위)</span></div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span><b style={statBig}>{ssot.todayWords.toLocaleString()}</b> <span style={sub}>오늘 단어</span></span>
            <span><b style={statBig}>{ssot.currentStreak}</b> <span style={sub}>연속 집필일(최장 {ssot.longestStreak})</span></span>
            <span><b style={statBig}>{ssot.totalDays}</b> <span style={sub}>총 집필일</span></span>
            <span><b style={statBig}>{ssot.draftTotal.toLocaleString()}</b> <span style={sub}>원고 전체 단어</span></span>
          </div>
          <div style={hint}>아래 ‘오늘/이번 주 목표’는 직접 입력하는 목표 트래커입니다(원고 자동 집계와 별개).</div>
        </div>
      )}

      {/* 오늘의 글감 */}
      <div style={card}>
        <div style={cardTitle}><Emoji e="✨" /> 오늘의 글감</div>
        <div style={sparkBox}>{todaySpark(sparkOffset)}</div>
        <div style={rowWrap}>
          <button className="minibtn" onClick={() => setSparkOffset((o) => o + 1)}><Emoji e="🔀" /> 다른 글감</button>
          <button
            className="minibtn"
            onClick={() => {
              const t = todaySpark(sparkOffset)
              if (hasStash()) { addToStash({ kind: 'memo', text: t, label: '오늘의 글감' }); toast('글감을 수집함에 담음') }
              else { setMemos((prev) => [{ id: 'm_' + Date.now().toString(36), text: t, ts: Date.now() }, ...prev].slice(0, 50)); toast('글감을 메모에 저장') }
            }}
          ><Emoji e="📥" /> 담기</button>
          <button className="linkbtn" style={{ marginLeft: 'auto' }} onClick={() => open('warmup-prompt')}><Emoji e="🔥" /> 워밍업 열기</button>
        </div>
      </div>

      {/* 목표 진행 */}
      <div style={grids2}>
        {/* 오늘 목표 */}
        <div style={card}>
          <div style={cardTitle}><Emoji e="🎯" /> 오늘 목표 {dayDone && <span style={{ color: 'var(--ok)' }}>· 달성!</span>}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...statBig, color: dayDone ? 'var(--ok)' : 'var(--accent)' }}>{today.toLocaleString()}</span>
            <span style={sub}>/ {goals.day.toLocaleString()}{unitLabel} ({Math.round(dayPct * 100)}%)</span>
          </div>
          <div style={track} aria-label={`오늘 진행률 ${Math.round(dayPct * 100)}%`}>
            <div style={fill(dayPct, dayDone)} /><div style={pctLabel}>{Math.round(dayPct * 100)}%</div>
          </div>
          <div style={rowWrap}>
            {QUICK_STEPS.map((s) => (
              <button key={s} className="minibtn" onClick={() => bumpToday(s)}>{s > 0 ? `+${s}` : s}{unitLabel}</button>
            ))}
            <input
              style={numInput} type="number" placeholder="직접 입력" value={manual}
              onChange={(e) => setManual(e.target.value)}
              aria-label={`오늘 ${unitLabel}수 직접 입력`}
            />
            <button
              className="minibtn"
              disabled={manual === ''}
              onClick={() => { const n = parseInt(manual, 10); if (Number.isFinite(n)) setTodayAbsolute(n); setManual('') }}
            >설정</button>
          </div>
          <div style={hint}>
            여기 숫자는 직접 입력해야 채워집니다(원고 자동 집계 아님). 본문과 자동 연동되면 자동으로 시드됩니다.
          </div>
          <div style={goalLine}>
            <span>오늘 목표</span>
            <span style={rowWrap as React.CSSProperties}>
              {DAY_PRESETS.map((p) => (
                <button key={p} className={goals.day === p ? 'btn-primary' : 'minibtn'} style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => setGoals((g) => ({ ...g, day: p }))}>{p.toLocaleString()}</button>
              ))}
            </span>
          </div>
        </div>

        {/* 이번 주 목표 + 스트릭 */}
        <div style={card}>
          <div style={cardTitle}><Emoji e="📅" /> 이번 주 목표 {weekDone && <span style={{ color: 'var(--ok)' }}>· 달성!</span>}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...statBig, color: weekDone ? 'var(--ok)' : 'var(--accent)' }}>{weekTotal.toLocaleString()}</span>
            <span style={sub}>/ {goals.week.toLocaleString()}{unitLabel} ({Math.round(weekPct * 100)}%)</span>
          </div>
          <div style={track} aria-label={`이번 주 진행률 ${Math.round(weekPct * 100)}%`}>
            <div style={fill(weekPct, weekDone)} /><div style={pctLabel}>{Math.round(weekPct * 100)}%</div>
          </div>
          <div style={goalLine}>
            <span>주간 목표</span>
            <span style={rowWrap as React.CSSProperties}>
              <input
                style={{ ...numInput, width: 96 }} type="number" min={0}
                value={goals.week === 0 ? '' : goals.week}
                onChange={(e) => { const n = parseInt(e.target.value, 10); setGoals((g) => ({ ...g, week: Number.isFinite(n) && n >= 0 ? n : 0 })) }}
                aria-label={`주간 목표 ${unitLabel}수`}
              />
              <span style={sub}>{unitLabel}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
            <div><div style={{ ...statBig, color: 'var(--accent)' }}><Emoji e="🔥" /> {cur}</div><div style={hint}>현재 연속일</div></div>
            <div><div style={statBig}>{longest}</div><div style={hint}>최장 연속일</div></div>
            <div><div style={statBig}>{daySet.size}</div><div style={hint}>총 집필일</div></div>
          </div>
        </div>
      </div>

      {/* 최근 5주 잔디 */}
      <div style={card}>
        <div style={cardTitle}><Emoji e="🌱" /> 최근 5주 집필 잔디</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          {grid.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {col.map((d, ri) => {
                if (!d) return <div key={ri} style={{ width: 16, height: 16, borderRadius: 4, border: '1px dashed var(--border)', opacity: 0.4 }} />
                const k = dayKey(d)
                const isToday = k === tk
                const v = log[k] || 0
                return (
                  <div
                    key={ri}
                    title={`${k}${v > 0 ? ` · ${fmtCount(v)}` : (streakDays.includes(k) ? ' · 집필함' : '')}`}
                    style={{ ...cell(lvlOf(k)), outline: isToday ? '2px solid var(--warn)' : 'none', outlineOffset: 1 }}
                  />
                )
              })}
            </div>
          ))}
          <div style={{ ...hint, marginLeft: 'auto', alignSelf: 'flex-end' }}>오늘은 노란 테두리</div>
        </div>
        <div style={hint}>칸 색은 그날 분량({unitLabel}, 오늘 목표 대비)에 따라 진해집니다. 집필 스트릭 도구의 체크 기록도 함께 반영됩니다.</div>
      </div>

      {/* 빠른 실행 */}
      <div style={card}>
        <div style={cardTitle}><Emoji e="⚡" /> 빠른 실행 <span style={{ fontWeight: 400, ...sub }}>클릭하면 도구가 열립니다</span></div>
        {favResolved.length > 0 && (
          <>
            <div style={hint}><Emoji e="⭐" /> 즐겨찾기</div>
            <div style={rowWrap}>
              {favResolved.map((id) => (
                <button key={id} style={chipBtn} onClick={() => open(id)} title={NAME_BY_ID[id].name + ' 열기'}>
                  <span><Emoji e={NAME_BY_ID[id].icon} /></span><span>{NAME_BY_ID[id].name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {recentResolved.length > 0 && (
          <>
            <div style={hint}><Emoji e="🕘" /> 최근 연 도구</div>
            <div style={rowWrap}>
              {recentResolved.map((id) => (
                <button key={id} style={chipBtn} onClick={() => open(id)} title={NAME_BY_ID[id].name + ' 다시 열기'}>
                  <span><Emoji e={NAME_BY_ID[id].icon} /></span><span>{NAME_BY_ID[id].name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div style={hint}>＋ 더 열기 (별을 눌러 즐겨찾기)</div>
        <div style={rowWrap}>
          {SUGGESTED.map((s) => {
            const isFav = favs.includes(s.id)
            return (
              <span key={s.id} style={{ ...chipBtn, paddingRight: 4 }}>
                <button onClick={() => open(s.id)} title={s.name + ' 열기'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}>
                  <span><Emoji e={s.icon} /></span><span>{s.name}</span>
                </button>
                <button onClick={() => toggleFav(s.id)} title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'} aria-label="즐겨찾기 토글" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: isFav ? 'var(--warn)' : 'var(--muted)', padding: '0 2px' }}>{isFav ? '★' : '☆'}</button>
              </span>
            )
          })}
        </div>
      </div>

      {/* 빠른 메모 */}
      <div style={card}>
        <div style={cardTitle}><Emoji e="📝" /> 빠른 메모 <span style={{ fontWeight: 400, ...sub }}>{hasStash() ? '저장 + 수집함에 담김' : '로컬 저장'}</span></div>
        <textarea
          style={ta} value={memoText} onChange={(e) => setMemoText(e.target.value)}
          placeholder="떠오른 아이디어·할 일·문장을 적어두세요. (Ctrl+Enter 로 담기)"
          spellCheck={false}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addMemo() } }}
        />
        <div style={rowWrap}>
          <button className="btn-primary" onClick={addMemo} disabled={!memoText.trim()}><Emoji e="📥" /> 담기</button>
          {memos.length > 0 && <button className="minibtn" onClick={() => setMemos([])} style={{ marginLeft: 'auto' }}>전체 비우기</button>}
        </div>
        {memos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {memos.map((m) => (
              <div key={m.id} style={memoItem}>
                <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</span>
                <span style={{ ...hint, whiteSpace: 'nowrap' }}>{relTime(m.ts)}</span>
                <button className="minibtn" style={{ padding: '1px 6px' }} onClick={() => removeMemo(m.id)} aria-label="메모 삭제">×</button>
              </div>
            ))}
          </div>
        )}
        {memos.length === 0 && <div style={hint}>아직 메모가 없습니다. 위에 적고 담아보세요.</div>}
      </div>

      {flash && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>✓ {flash}</div>}

      <div style={hint}>모든 기록은 이 브라우저에만 저장됩니다. 빠른 실행은 같은 화면의 도구 창으로 열립니다.</div>
    </div>
  )
}
