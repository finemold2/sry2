// 집필 RPG — 집필을 게임화한다(Habitica/4thewords식).
//  · 쓴 글자수로 XP 적립 → 레벨업(곡선형 필요 XP), 직업/타이틀, 체력(HP)·연속일(스트릭).
//  · 일일 퀘스트(오늘 목표 글자수 / 연속일 유지 / 스프린트 1회) — 완료 시 보상 XP·코인.
//  · 업적(배지) 30여 종 — 누적 글자수·레벨·스트릭·세션·스프린트 조건 충족 시 해금.
//  · 글자수는 (1) 내장 기록칸에 직접 쓰거나 (2) "+오늘 분량 추가" 수동 입력으로 반영.
//  · 진행 막대·레벨 원형·퀘스트 카드·업적 그리드·집필 로그. 매일 자정 기준 일일 리셋.
// 규칙 준수: react/linkbus 외 import 없음 · 외부 네트워크 없음 · localStorage 영속 ·
//           언마운트 시 타이머/리스너 정리 · 미지원 환경 graceful · UI 한국어.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'writing-rpg',
  name: '집필 RPG',
  icon: '⚔️',
  group: '집중·생산성',
  intro: '쓴 글자수로 XP·레벨업, 일일 퀘스트·업적·스트릭으로 집필을 게임처럼',
  w: 560,
  h: 720,
}

const NS = 'sry:tool:writing-rpg'

// ───────────────────────── 날짜 유틸 ─────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function diffDays(aKey: string, bKey: string): number {
  // a - b (일). 둘 다 'YYYY-MM-DD'.
  const a = new Date(aKey + 'T00:00:00')
  const b = new Date(bKey + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / DAY_MS)
}

// 글자수: 전체 문자 수(공백 포함). 이모지·서로게이트 쌍을 1글자로.
function countChars(text: string): number {
  if (!text) return 0
  try { return Array.from(text).length } catch { return text.length }
}

// ───────────────────────── 레벨/직업 ─────────────────────────
// 누적 XP → 레벨. 필요 XP 곡선: 레벨 L 도달까지 합 = 100 * (L-1) + 25 * (L-1)^2 정도의 완만한 증가.
// 레벨 L→L+1 에 필요한 XP:
function xpForLevel(level: number): number {
  return 80 + (level - 1) * 60
}
// 누적 XP 로부터 레벨/레벨내 진행 계산
function levelFromXp(totalXp: number): { level: number; into: number; need: number; floor: number } {
  let level = 1
  let acc = 0
  // 안전 상한(과도 루프 방지)
  while (level < 999) {
    const need = xpForLevel(level)
    if (totalXp < acc + need) {
      return { level, into: totalXp - acc, need, floor: acc }
    }
    acc += need
    level++
  }
  return { level, into: 0, need: xpForLevel(level), floor: acc }
}

// 직업(타이틀) — 레벨 구간별. 분위기용.
const CLASSES = [
  { min: 1, name: '견습 필경사', icon: '🪶' },
  { min: 4, name: '이야기 수습생', icon: '📜' },
  { min: 7, name: '문장 기사', icon: '🗡️' },
  { min: 11, name: '서사 마법사', icon: '🪄' },
  { min: 16, name: '플롯 연금술사', icon: '⚗️' },
  { min: 22, name: '세계의 건축가', icon: '🏯' },
  { min: 30, name: '전설의 작가', icon: '👑' },
]
function classFor(level: number) {
  let c = CLASSES[0]
  for (const k of CLASSES) if (level >= k.min) c = k
  return c
}

// XP 환산: 글자당 XP. 너무 빠른 레벨업 방지 위해 분수 환산.
const XP_PER_CHAR = 0.05 // 100자 = 5XP
function xpFromChars(chars: number): number {
  return Math.floor(chars * XP_PER_CHAR)
}

// ───────────────────────── 상태 모델 ─────────────────────────
interface DayRecord {
  chars: number        // 그 날 반영된 총 글자수
  sprints: number      // 그 날 완료한 스프린트 수
  questXp: number      // 그 날 퀘스트 보상으로 받은 XP(중복 수령 방지 표시용)
}
interface QuestState {
  goalClaimed: boolean   // 오늘 목표 글자수 보상 수령
  streakClaimed: boolean // 오늘 연속일 유지 보상 수령
  sprintClaimed: boolean // 오늘 스프린트 보상 수령
}
interface SessionLog {
  t: number            // timestamp
  chars: number        // 이 세션에서 추가된 글자수
  src: string          // '기록칸' | '수동' | '스프린트'
  xp: number           // 이 세션으로 얻은 XP
}
interface SaveState {
  v: number
  totalXp: number
  coins: number
  totalChars: number      // 누적 글자수(전 기간)
  totalSessions: number   // 누적 세션 수
  totalSprints: number    // 누적 스프린트 수
  days: Record<string, DayRecord>
  lastActiveDay: string   // 마지막으로 글을 반영한 날(스트릭 계산)
  todayKey: string        // 일일 리셋 기준
  quest: QuestState
  dailyGoal: number
  badges: string[]        // 해금된 업적 id
  logs: SessionLog[]      // 최근 세션 로그(상한)
  draft: string           // 기록칸 본문(반영 안 된 임시)
}

const LOG_LIMIT = 40

function defaultState(): SaveState {
  return {
    v: 1,
    totalXp: 0,
    coins: 0,
    totalChars: 0,
    totalSessions: 0,
    totalSprints: 0,
    days: {},
    lastActiveDay: '',
    todayKey: dayKey(new Date()),
    quest: { goalClaimed: false, streakClaimed: false, sprintClaimed: false },
    dailyGoal: 800,
    badges: [],
    logs: [],
    draft: '',
  }
}

function load(): SaveState {
  try {
    const raw = localStorage.getItem(NS)
    if (raw) {
      const p = JSON.parse(raw) as Partial<SaveState>
      const base = defaultState()
      const merged: SaveState = {
        ...base,
        ...p,
        quest: { ...base.quest, ...(p.quest || {}) },
        days: p.days && typeof p.days === 'object' ? p.days : {},
        badges: Array.isArray(p.badges) ? p.badges : [],
        logs: Array.isArray(p.logs) ? p.logs.slice(0, LOG_LIMIT) : [],
      }
      return merged
    }
  } catch { /* 미지원/거부 graceful */ }
  return defaultState()
}
function save(s: SaveState) {
  try { localStorage.setItem(NS, JSON.stringify(s)) } catch { /* 용량/프라이빗 graceful */ }
}

// 일일 리셋: 날짜가 바뀌었으면 오늘 키 갱신·퀘스트 초기화.
function rollDay(s: SaveState): SaveState {
  const today = dayKey(new Date())
  if (s.todayKey === today) return s
  return {
    ...s,
    todayKey: today,
    quest: { goalClaimed: false, streakClaimed: false, sprintClaimed: false },
  }
}

// 현재 스트릭(연속 집필일): 오늘 또는 어제부터 거꾸로 연속된, chars>0 인 날의 수.
function currentStreak(days: Record<string, DayRecord>): number {
  const has = (k: string) => !!days[k] && days[k].chars > 0
  const today = startOfDay(new Date())
  let cursor = has(dayKey(today)) ? today : new Date(today.getTime() - DAY_MS)
  let count = 0
  while (has(dayKey(cursor))) {
    count++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return count
}
function longestStreak(days: Record<string, DayRecord>): number {
  const keys = Object.keys(days).filter((k) => days[k].chars > 0).sort()
  if (keys.length === 0) return 0
  let best = 1, run = 1
  for (let i = 1; i < keys.length; i++) {
    const d = diffDays(keys[i], keys[i - 1])
    if (d === 1) { run++; if (run > best) best = run }
    else if (d === 0) { /* 중복 방어 */ }
    else run = 1
  }
  return best
}

// ───────────────────────── 업적(배지) ─────────────────────────
interface BadgeDef {
  id: string
  name: string
  icon: string
  desc: string
  // 충족 여부 판정에 쓰는 파생 지표
  test: (ctx: BadgeCtx) => boolean
}
interface BadgeCtx {
  level: number
  totalChars: number
  totalSessions: number
  totalSprints: number
  curStreak: number
  longest: number
  todayChars: number
  coins: number
  daysWritten: number
}
const BADGES: BadgeDef[] = [
  { id: 'first-word', name: '첫 문장', icon: '✍️', desc: '처음으로 글자를 반영했다', test: (c) => c.totalChars >= 1 },
  { id: 'c-100', name: '백 글자', icon: '💯', desc: '누적 100자', test: (c) => c.totalChars >= 100 },
  { id: 'c-1k', name: '천 글자', icon: '📄', desc: '누적 1,000자', test: (c) => c.totalChars >= 1000 },
  { id: 'c-5k', name: '단편 한 편', icon: '📃', desc: '누적 5,000자', test: (c) => c.totalChars >= 5000 },
  { id: 'c-20k', name: '중편 작가', icon: '📚', desc: '누적 20,000자', test: (c) => c.totalChars >= 20000 },
  { id: 'c-50k', name: '장편의 길', icon: '📕', desc: '누적 50,000자', test: (c) => c.totalChars >= 50000 },
  { id: 'c-100k', name: '대하소설', icon: '🏛️', desc: '누적 100,000자', test: (c) => c.totalChars >= 100000 },
  { id: 'lv-3', name: '초보 탈출', icon: '🌱', desc: '레벨 3 도달', test: (c) => c.level >= 3 },
  { id: 'lv-5', name: '본궤도', icon: '⭐', desc: '레벨 5 도달', test: (c) => c.level >= 5 },
  { id: 'lv-10', name: '두 자리 레벨', icon: '🔟', desc: '레벨 10 도달', test: (c) => c.level >= 10 },
  { id: 'lv-20', name: '베테랑', icon: '🎖️', desc: '레벨 20 도달', test: (c) => c.level >= 20 },
  { id: 'lv-30', name: '전설', icon: '👑', desc: '레벨 30 도달', test: (c) => c.level >= 30 },
  { id: 'st-3', name: '삼일 연속', icon: '🔥', desc: '3일 연속 집필', test: (c) => c.curStreak >= 3 || c.longest >= 3 },
  { id: 'st-7', name: '한 주 완주', icon: '📆', desc: '7일 연속 집필', test: (c) => c.curStreak >= 7 || c.longest >= 7 },
  { id: 'st-14', name: '습관의 힘', icon: '💪', desc: '14일 연속 집필', test: (c) => c.curStreak >= 14 || c.longest >= 14 },
  { id: 'st-30', name: '한 달 개근', icon: '🏆', desc: '30일 연속 집필', test: (c) => c.curStreak >= 30 || c.longest >= 30 },
  { id: 'st-100', name: '백일장', icon: '🎇', desc: '100일 연속 집필', test: (c) => c.curStreak >= 100 || c.longest >= 100 },
  { id: 'sp-1', name: '첫 스프린트', icon: '⚡', desc: '스프린트 1회 완료', test: (c) => c.totalSprints >= 1 },
  { id: 'sp-10', name: '질주', icon: '🏃', desc: '스프린트 10회', test: (c) => c.totalSprints >= 10 },
  { id: 'sp-50', name: '단거리의 달인', icon: '🥇', desc: '스프린트 50회', test: (c) => c.totalSprints >= 50 },
  { id: 'se-10', name: '꾸준함', icon: '🧱', desc: '세션 10회', test: (c) => c.totalSessions >= 10 },
  { id: 'se-50', name: '성실한 손', icon: '🛠️', desc: '세션 50회', test: (c) => c.totalSessions >= 50 },
  { id: 'se-200', name: '집필 기계', icon: '🤖', desc: '세션 200회', test: (c) => c.totalSessions >= 200 },
  { id: 'day-big', name: '폭주의 날', icon: '🌋', desc: '하루 3,000자 이상', test: (c) => c.todayChars >= 3000 },
  { id: 'day-huge', name: '미친 생산성', icon: '🚀', desc: '하루 6,000자 이상', test: (c) => c.todayChars >= 6000 },
  { id: 'coin-100', name: '소소한 부자', icon: '🪙', desc: '코인 100 보유', test: (c) => c.coins >= 100 },
  { id: 'coin-500', name: '금고', icon: '💰', desc: '코인 500 보유', test: (c) => c.coins >= 500 },
  { id: 'days-30', name: '한 달의 흔적', icon: '🗓️', desc: '서로 다른 30일 집필', test: (c) => c.daysWritten >= 30 },
  { id: 'days-100', name: '백 개의 발자국', icon: '👣', desc: '서로 다른 100일 집필', test: (c) => c.daysWritten >= 100 },
]

// ───────────────────────── 보상 정의 ─────────────────────────
const QUEST_REWARD = {
  goal: { xp: 60, coins: 10 },
  streak: { xp: 30, coins: 5 },
  sprint: { xp: 40, coins: 8 },
}

const GOAL_PRESETS = [300, 500, 800, 1200, 2000]

// ───────────────────────── 컴포넌트 ─────────────────────────
type Tab = 'play' | 'quests' | 'badges' | 'log'

export default function WritingRPG({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<SaveState>(() => rollDay(load()))
  const [tab, setTab] = useState<Tab>('play')
  const [manualInput, setManualInput] = useState('')
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'xp' | 'level' | 'badge' } | null>(null)
  const [levelUpFx, setLevelUpFx] = useState<number | null>(null) // 새 레벨 표시용
  const [newBadges, setNewBadges] = useState<BadgeDef[]>([])

  const saveTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)
  const fxTimer = useRef<number | null>(null)
  const badgeTimer = useRef<number | null>(null)
  const dayCheckTimer = useRef<number | null>(null)
  const prevLevelRef = useRef<number>(levelFromXp(state.totalXp).level)

  // payload 로 스프린트 결과 등이 들어오면 자동 반영(연계). 예: { addChars, source }
  const payloadHandled = useRef(false)

  // ── 영속: 디바운스 저장 ──
  useEffect(() => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      save(state)
      saveTimer.current = null
    }, 300)
    return () => {
      if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null }
    }
  }, [state])

  // ── 언마운트 시 즉시 저장 + 모든 타이머 정리 ──
  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null }
      if (toastTimer.current !== null) { clearTimeout(toastTimer.current); toastTimer.current = null }
      if (fxTimer.current !== null) { clearTimeout(fxTimer.current); fxTimer.current = null }
      if (badgeTimer.current !== null) { clearTimeout(badgeTimer.current); badgeTimer.current = null }
      if (dayCheckTimer.current !== null) { clearInterval(dayCheckTimer.current); dayCheckTimer.current = null }
      // 최신 상태를 한 번 더 저장(디바운스 미반영 보존). 클로저 캡처 최신값 사용.
      save(stateRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 언마운트 저장용 최신 상태 ref
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ── 다른 탭 동기화 ──
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NS) setState(rollDay(load()))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ── 자정 넘어가면 일일 리셋(1분마다 점검) ──
  useEffect(() => {
    dayCheckTimer.current = window.setInterval(() => {
      setState((s) => {
        const rolled = rollDay(s)
        return rolled === s ? s : rolled
      })
    }, 60 * 1000)
    return () => {
      if (dayCheckTimer.current !== null) { clearInterval(dayCheckTimer.current); dayCheckTimer.current = null }
    }
  }, [])

  // ── 토스트 ──
  const showToast = useCallback((msg: string, tone: 'ok' | 'xp' | 'level' | 'badge' = 'ok') => {
    setToast({ msg, tone })
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(null); toastTimer.current = null }, 2200)
  }, [])

  // ── 파생 지표 ──
  const lvInfo = useMemo(() => levelFromXp(state.totalXp), [state.totalXp])
  const cls = classFor(lvInfo.level)
  const curStreak = useMemo(() => currentStreak(state.days), [state.days])
  const longest = useMemo(() => longestStreak(state.days), [state.days])
  const daysWritten = useMemo(() => Object.keys(state.days).filter((k) => state.days[k].chars > 0).length, [state.days])
  const today = state.days[state.todayKey] || { chars: 0, sprints: 0, questXp: 0 }
  const draftChars = countChars(state.draft)

  // HP(체력): 스트릭에 비례한 분위기 게이지. 오늘 안 쓰면 줄어드는 느낌을 위해 표시만.
  const maxHp = 100
  const hp = useMemo(() => {
    // 오늘 썼으면 풀피, 어제까지만 썼으면 70%, 그 이상 끊기면 점감.
    if (today.chars > 0) return maxHp
    const last = state.lastActiveDay
    if (!last) return Math.round(maxHp * 0.5)
    const gap = diffDays(state.todayKey, last)
    if (gap <= 1) return Math.round(maxHp * 0.7)
    return Math.max(10, Math.round(maxHp * (0.7 - (gap - 1) * 0.15)))
  }, [today.chars, state.lastActiveDay, state.todayKey])

  // ── 업적 자동 해금(상태 변경 시 점검) ──
  useEffect(() => {
    const ctx: BadgeCtx = {
      level: lvInfo.level,
      totalChars: state.totalChars,
      totalSessions: state.totalSessions,
      totalSprints: state.totalSprints,
      curStreak,
      longest,
      todayChars: today.chars,
      coins: state.coins,
      daysWritten,
    }
    const unlocked = BADGES.filter((b) => !state.badges.includes(b.id) && b.test(ctx))
    if (unlocked.length > 0) {
      setState((s) => ({ ...s, badges: [...s.badges, ...unlocked.map((b) => b.id)], coins: s.coins + unlocked.length * 15 }))
      setNewBadges((prev) => [...prev, ...unlocked])
      const b = unlocked[0]
      showToast(`🏅 업적 해금: ${b.name}${unlocked.length > 1 ? ` 외 ${unlocked.length - 1}` : ''} (+${unlocked.length * 15}🪙)`, 'badge')
      if (badgeTimer.current !== null) clearTimeout(badgeTimer.current)
      badgeTimer.current = window.setTimeout(() => { setNewBadges([]); badgeTimer.current = null }, 4000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalChars, state.totalSprints, state.totalSessions, state.coins, lvInfo.level, curStreak, longest, today.chars, daysWritten])

  // ── 레벨업 감지 ──
  useEffect(() => {
    const lv = lvInfo.level
    if (lv > prevLevelRef.current) {
      setLevelUpFx(lv)
      showToast(`🎉 레벨 업! Lv.${lv} ${classFor(lv).name}`, 'level')
      if (fxTimer.current !== null) clearTimeout(fxTimer.current)
      fxTimer.current = window.setTimeout(() => { setLevelUpFx(null); fxTimer.current = null }, 2600)
    }
    prevLevelRef.current = lv
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvInfo.level])

  // ── 핵심: 글자수 반영(세션 기록) ──
  const applyChars = useCallback((chars: number, src: string) => {
    if (!Number.isFinite(chars) || chars <= 0) return
    const gained = xpFromChars(chars)
    setState((s) => {
      const tk = s.todayKey
      const prevDay = s.days[tk] || { chars: 0, sprints: 0, questXp: 0 }
      const nextDay: DayRecord = { ...prevDay, chars: prevDay.chars + chars }
      const log: SessionLog = { t: Date.now(), chars, src, xp: gained }
      return {
        ...s,
        totalXp: s.totalXp + gained,
        totalChars: s.totalChars + chars,
        totalSessions: s.totalSessions + 1,
        days: { ...s.days, [tk]: nextDay },
        lastActiveDay: tk,
        logs: [log, ...s.logs].slice(0, LOG_LIMIT),
      }
    })
    showToast(`+${chars.toLocaleString()}자 · +${gained} XP`, 'xp')
  }, [showToast])

  // payload 자동 반영(스프린트 등에서 글자수 전달 시)
  useEffect(() => {
    if (payloadHandled.current || !payload) return
    const add = Number((payload as Record<string, unknown>).addChars)
    if (Number.isFinite(add) && add > 0) {
      payloadHandled.current = true
      const src = typeof payload.source === 'string' ? (payload.source as string) : '연계'
      applyChars(Math.floor(add), src)
      // 스프린트로 들어온 경우 스프린트 카운트도 증가
      if (payload.sprint) {
        setState((s) => {
          const tk = s.todayKey
          const prevDay = s.days[tk] || { chars: 0, sprints: 0, questXp: 0 }
          return { ...s, totalSprints: s.totalSprints + 1, days: { ...s.days, [tk]: { ...prevDay, sprints: prevDay.sprints + 1 } } }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ── 기록칸 → 반영(추가분만 누적, 본문 비움) ──
  const commitDraft = useCallback(() => {
    const c = countChars(state.draft)
    if (c <= 0) return
    applyChars(c, '기록칸')
    setState((s) => ({ ...s, draft: '' }))
  }, [state.draft, applyChars])

  // ── 수동 글자수 추가 ──
  const addManual = useCallback(() => {
    const n = parseInt(manualInput.replace(/[^\d]/g, ''), 10)
    if (!Number.isFinite(n) || n <= 0) return
    applyChars(n, '수동')
    setManualInput('')
  }, [manualInput, applyChars])

  // ── 스프린트 1회 직접 기록(연계 도구 없이도) ──
  const markSprint = useCallback(() => {
    setState((s) => {
      const tk = s.todayKey
      const prevDay = s.days[tk] || { chars: 0, sprints: 0, questXp: 0 }
      return { ...s, totalSprints: s.totalSprints + 1, days: { ...s.days, [tk]: { ...prevDay, sprints: prevDay.sprints + 1 } } }
    })
    showToast('⚡ 스프린트 1회 기록', 'ok')
  }, [showToast])

  // ── 퀘스트 수령 ──
  const claimGoal = useCallback(() => {
    setState((s) => {
      if (s.quest.goalClaimed) return s
      const t = s.days[s.todayKey] || { chars: 0, sprints: 0, questXp: 0 }
      if (t.chars < s.dailyGoal) return s
      return {
        ...s,
        totalXp: s.totalXp + QUEST_REWARD.goal.xp,
        coins: s.coins + QUEST_REWARD.goal.coins,
        quest: { ...s.quest, goalClaimed: true },
      }
    })
    showToast(`✅ 목표 달성 보상 +${QUEST_REWARD.goal.xp} XP · +${QUEST_REWARD.goal.coins}🪙`, 'ok')
  }, [showToast])

  const claimStreak = useCallback(() => {
    setState((s) => {
      if (s.quest.streakClaimed) return s
      const t = s.days[s.todayKey] || { chars: 0, sprints: 0, questXp: 0 }
      if (t.chars <= 0) return s
      return {
        ...s,
        totalXp: s.totalXp + QUEST_REWARD.streak.xp,
        coins: s.coins + QUEST_REWARD.streak.coins,
        quest: { ...s.quest, streakClaimed: true },
      }
    })
    showToast(`✅ 연속일 유지 보상 +${QUEST_REWARD.streak.xp} XP · +${QUEST_REWARD.streak.coins}🪙`, 'ok')
  }, [showToast])

  const claimSprint = useCallback(() => {
    setState((s) => {
      if (s.quest.sprintClaimed) return s
      const t = s.days[s.todayKey] || { chars: 0, sprints: 0, questXp: 0 }
      if (t.sprints <= 0) return s
      return {
        ...s,
        totalXp: s.totalXp + QUEST_REWARD.sprint.xp,
        coins: s.coins + QUEST_REWARD.sprint.coins,
        quest: { ...s.quest, sprintClaimed: true },
      }
    })
    showToast(`✅ 스프린트 보상 +${QUEST_REWARD.sprint.xp} XP · +${QUEST_REWARD.sprint.coins}🪙`, 'ok')
  }, [showToast])

  // ── 퀘스트 상태 계산 ──
  const goalDone = today.chars >= state.dailyGoal
  const streakDone = today.chars > 0
  const sprintDone = today.sprints > 0

  // ── 전체 초기화 ──
  const resetAll = useCallback(() => {
    if (!window.confirm('모든 진행(레벨·XP·업적·기록)을 초기화할까요? 되돌릴 수 없습니다.')) return
    const fresh = defaultState()
    setState(fresh)
    save(fresh)
    prevLevelRef.current = 1
    showToast('초기화 완료', 'ok')
  }, [showToast])

  // ── 연계: 프로젝트에 모험 기록 추가 ──
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = useCallback(() => {
    const ctx = { lvInfo, cls, curStreak, longest }
    const earnedBadges = BADGES.filter((b) => state.badges.includes(b.id))
    const bodyHtml =
      `<p><strong>${esc(cls.icon + ' ' + cls.name)}</strong> · Lv.${ctx.lvInfo.level}</p>` +
      `<ul>` +
      `<li>누적 글자수: ${state.totalChars.toLocaleString()}자</li>` +
      `<li>총 XP: ${state.totalXp.toLocaleString()} · 코인: ${state.coins}</li>` +
      `<li>현재 연속일: ${curStreak}일 · 최장: ${longest}일</li>` +
      `<li>세션: ${state.totalSessions}회 · 스프린트: ${state.totalSprints}회</li>` +
      `<li>해금 업적: ${earnedBadges.length} / ${BADGES.length}</li>` +
      `</ul>` +
      (earnedBadges.length
        ? `<p>${esc(earnedBadges.map((b) => `${b.icon} ${b.name}`).join(' · '))}</p>`
        : '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 기록',
      title: `집필 RPG 기록 — Lv.${ctx.lvInfo.level} (${dayKey(new Date())})`,
      bodyHtml,
      meta: {
        레벨: String(ctx.lvInfo.level),
        직업: cls.name,
        누적글자수: String(state.totalChars),
        연속일: String(curStreak),
        업적: `${earnedBadges.length}/${BADGES.length}`,
      },
    })
    showToast(id ? '📄 프로젝트에 기록 추가됨' : '프로젝트에 연결되지 않았습니다', 'ok')
  }, [state, lvInfo, cls, curStreak, longest, showToast])

  const toStash = useCallback(() => {
    addToStash({
      kind: 'note',
      label: `집필 RPG — Lv.${lvInfo.level} ${cls.name}`,
      text: `누적 ${state.totalChars.toLocaleString()}자 · 연속 ${curStreak}일 · 업적 ${state.badges.length}/${BADGES.length}`,
    })
    showToast('🧺 수집함에 담음', 'ok')
  }, [lvInfo.level, cls.name, state.totalChars, state.badges.length, curStreak, showToast])

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }
  const header: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))' }
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const tabsRow: React.CSSProperties = { display: 'flex', gap: 4, padding: '8px 10px 0', borderBottom: '1px solid var(--border)' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 4px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
    border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--accent)' : 'var(--muted)',
  })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const track: React.CSSProperties = { height: 12, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', position: 'relative' }

  const pctLevel = lvInfo.need > 0 ? Math.min(1, lvInfo.into / lvInfo.need) : 0
  const pctGoal = state.dailyGoal > 0 ? Math.min(1, today.chars / state.dailyGoal) : 0

  // 원형 레벨 배지
  const ring = (pct: number): React.CSSProperties => ({
    width: 72, height: 72, borderRadius: '50%',
    background: `conic-gradient(var(--accent) ${pct * 360}deg, var(--chrome-2) 0deg)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  })
  const ringInner: React.CSSProperties = {
    width: 58, height: 58, borderRadius: '50%', background: 'var(--panel)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
  }

  const earnedCount = state.badges.length

  return (
    <div style={wrap}>
      {/* ── 헤더: 캐릭터 요약 ── */}
      <div style={header}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={ring(pctLevel)} title={`다음 레벨까지 ${Math.max(0, lvInfo.need - lvInfo.into)} XP`}>
            <div style={ringInner}>
              <div style={{ fontSize: 18, lineHeight: 1 }}><Emoji e={cls.icon} /></div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>Lv.{lvInfo.level}</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{cls.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              XP {lvInfo.into}/{lvInfo.need} · 다음까지 {Math.max(0, lvInfo.need - lvInfo.into)}
            </div>
            {/* HP 게이지(분위기) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 22 }}>HP</span>
              <div style={{ ...track, height: 8, flex: 1 }}>
                <div style={{ height: '100%', width: `${hp}%`, background: hp >= 70 ? 'var(--ok)' : hp >= 40 ? 'var(--warn)' : '#e2574c', transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 30, textAlign: 'right' }}>{hp}%</span>
            </div>
          </div>
        </div>
        {/* 통계 칩 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Chip icon="🪙" label="코인" value={state.coins.toLocaleString()} />
          <Chip icon="🔥" label="연속" value={`${curStreak}일`} />
          <Chip icon="📝" label="누적" value={`${state.totalChars.toLocaleString()}자`} />
          <Chip icon="🏅" label="업적" value={`${earnedCount}/${BADGES.length}`} />
        </div>
      </div>

      {/* ── 탭 ── */}
      <div style={tabsRow}>
        <button style={tabBtn(tab === 'play')} onClick={() => setTab('play')}><Emoji e="⚔️" /> 집필</button>
        <button style={tabBtn(tab === 'quests')} onClick={() => setTab('quests')}><Emoji e="📜" /> 퀘스트</button>
        <button style={tabBtn(tab === 'badges')} onClick={() => setTab('badges')}><Emoji e="🏅" /> 업적</button>
        <button style={tabBtn(tab === 'log')} onClick={() => setTab('log')}><Emoji e="📖" /> 기록</button>
      </div>

      {/* ── 본문 ── */}
      <div style={body}>
        {tab === 'play' && (
          <>
            {/* 오늘 진행 */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>오늘의 분량</span>
                <span style={{ fontSize: 12, color: goalDone ? 'var(--ok)' : 'var(--muted)' }}>
                  {today.chars.toLocaleString()} / {state.dailyGoal.toLocaleString()}자
                </span>
              </div>
              <div style={track}>
                <div style={{ height: '100%', width: `${(pctGoal * 100).toFixed(1)}%`, background: goalDone ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>일일 목표</span>
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g}
                    className={state.dailyGoal === g ? 'btn-primary' : 'minibtn'}
                    onClick={() => setState((s) => ({ ...s, dailyGoal: g }))}
                    style={{ padding: '3px 8px', fontSize: 11.5 }}
                  >{g.toLocaleString()}</button>
                ))}
              </div>
            </div>

            {/* 기록칸 */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}><Emoji e="✍️" /> 집필 기록칸</div>
              <textarea
                value={state.draft}
                onChange={(e) => setState((s) => ({ ...s, draft: e.target.value }))}
                placeholder="여기에 써 내려가세요. '분량 반영'을 누르면 글자수가 XP·진행도로 들어갑니다 (본문은 비워집니다)."
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box',
                  padding: 10, borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--paper)', color: 'var(--text)', fontSize: 14.5, lineHeight: 1.6,
                  fontFamily: 'inherit', outline: 'none',
                }}
                aria-label="집필 기록칸"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>현재 {draftChars.toLocaleString()}자 (≈ +{xpFromChars(draftChars)} XP)</span>
                <button className="btn-primary" onClick={commitDraft} disabled={draftChars <= 0} style={{ marginLeft: 'auto' }}>
                  ⬆ 분량 반영
                </button>
              </div>
            </div>

            {/* 수동 입력 + 스프린트 */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>다른 에디터에서 쓴 분량 반영</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addManual() }}
                  placeholder="예: 1200"
                  style={{ width: 110, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
                  aria-label="추가할 글자수"
                />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>자</span>
                <button className="minibtn" onClick={addManual} disabled={!manualInput.trim()}>+ 추가</button>
                <button className="minibtn" onClick={markSprint} style={{ marginLeft: 'auto' }}><Emoji e="⚡" /> 스프린트 1회</button>
              </div>
              <div style={{ ...hint, marginTop: 8 }}>
                실제 글자수는 자율 보고제입니다. 워드 스프린트 도구로 달리고 그 결과를 여기에 반영해도 좋아요.
              </div>
            </div>

            {/* 연계 */}
            <div className="linkbar">
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={() => openToolLinked('word-sprint-game')} title="워드 스프린트 도구 열기"><Emoji e="⚡" /> 워드 스프린트</button>
              <button className="linkbtn" onClick={() => openToolLinked('streak-tracker')} title="집필 스트릭 도구 열기"><Emoji e="🔥" /> 스트릭</button>
              {hasProjectBridge() && (
                <button className="linkbtn" onClick={toProject} title="현재 캐릭터·업적을 프로젝트에 기록"><Emoji e="📄" /> 프로젝트에 추가</button>
              )}
              {hasStash() && (
                <button className="linkbtn" onClick={toStash} title="요약을 수집함에 담기"><Emoji e="🧺" /> 수집함에 담기</button>
              )}
            </div>
          </>
        )}

        {tab === 'quests' && (
          <>
            <div style={hint}>매일 자정에 새 퀘스트가 갱신됩니다. 조건을 채우면 보상을 받으세요.</div>
            <QuestCard
              icon="🎯" title={`오늘 ${state.dailyGoal.toLocaleString()}자 쓰기`}
              progress={`${today.chars.toLocaleString()} / ${state.dailyGoal.toLocaleString()}자`}
              done={goalDone} claimed={state.quest.goalClaimed}
              reward={`+${QUEST_REWARD.goal.xp} XP · +${QUEST_REWARD.goal.coins}🪙`}
              onClaim={claimGoal} pct={pctGoal}
            />
            <QuestCard
              icon="🔥" title="오늘 집필해 연속일 유지"
              progress={streakDone ? `유지 중 · 연속 ${curStreak}일` : '아직 오늘 글이 없어요'}
              done={streakDone} claimed={state.quest.streakClaimed}
              reward={`+${QUEST_REWARD.streak.xp} XP · +${QUEST_REWARD.streak.coins}🪙`}
              onClaim={claimStreak} pct={streakDone ? 1 : 0}
            />
            <QuestCard
              icon="⚡" title="스프린트 1회 완료"
              progress={`오늘 ${today.sprints}회 완료`}
              done={sprintDone} claimed={state.quest.sprintClaimed}
              reward={`+${QUEST_REWARD.sprint.xp} XP · +${QUEST_REWARD.sprint.coins}🪙`}
              onClaim={claimSprint} pct={sprintDone ? 1 : 0}
            />
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>오늘 받은 일일 보상 합계</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                {(Number(state.quest.goalClaimed) * QUEST_REWARD.goal.xp +
                  Number(state.quest.streakClaimed) * QUEST_REWARD.streak.xp +
                  Number(state.quest.sprintClaimed) * QUEST_REWARD.sprint.xp)} XP
              </div>
            </div>
          </>
        )}

        {tab === 'badges' && (
          <>
            <div style={hint}>업적 {earnedCount}/{BADGES.length} 해금 — 조건을 채우면 자동으로 열리고 코인을 받습니다.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {BADGES.map((b) => {
                const got = state.badges.includes(b.id)
                return (
                  <div
                    key={b.id}
                    title={b.desc}
                    style={{
                      border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                      background: got ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'var(--chrome-2)',
                      opacity: got ? 1 : 0.55,
                    }}
                  >
                    <div style={{ fontSize: 24, lineHeight: 1, filter: got ? 'none' : 'grayscale(1)' }}>{got ? <Emoji e={b.icon} /> : <Emoji e="🔒" />}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>{b.desc}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'log' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatCell label="총 세션" value={state.totalSessions.toLocaleString()} />
              <StatCell label="총 스프린트" value={state.totalSprints.toLocaleString()} />
              <StatCell label="집필한 날" value={`${daysWritten}일`} />
              <StatCell label="최장 연속" value={`${longest}일`} />
            </div>
            {state.logs.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                아직 기록이 없습니다. 분량을 반영하면 여기에 세션이 쌓입니다.
              </div>
            ) : (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>최근 세션</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {state.logs.map((l, i) => (
                    <div key={l.t + '-' + i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 8px', background: 'var(--chrome-2)', borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>{emojify(l.src === '스프린트' ? '⚡' : l.src === '수동' ? '✏️' : '✍️')}</span>
                      <span style={{ flex: 1, color: 'var(--text)' }}>{l.chars.toLocaleString()}자 <span style={{ color: 'var(--muted)' }}>· {l.src}</span></span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>+{l.xp} XP</span>
                      <span style={{ color: 'var(--muted)', width: 96, textAlign: 'right' }}>{fmtAgo(l.t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex' }}>
              <button className="minibtn danger" onClick={resetAll} style={{ marginLeft: 'auto' }}>전체 초기화</button>
            </div>
            <div style={hint}>모든 진행은 이 브라우저에만 저장됩니다. 다른 기기로는 옮겨지지 않습니다.</div>
          </>
        )}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div
          style={{
            position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)',
            padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
            color: '#fff', boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap', maxWidth: '92%',
            overflow: 'hidden', textOverflow: 'ellipsis',
            background:
              toast.tone === 'level' ? 'linear-gradient(90deg, var(--accent), var(--accent-2, var(--accent)))' :
              toast.tone === 'badge' ? '#b8860b' :
              toast.tone === 'xp' ? 'var(--accent)' : 'var(--ok)',
            zIndex: 5,
          }}
        >{emojify(toast.msg)}</div>
      )}

      {/* ── 레벨업 오버레이 ── */}
      {levelUpFx !== null && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            background: 'color-mix(in srgb, var(--accent) 16%, transparent)', zIndex: 6,
          }}
        >
          <div style={{ fontSize: 52, lineHeight: 1 }}><Emoji e={classFor(levelUpFx).icon} /></div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', marginTop: 8, textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>LEVEL UP!</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>Lv.{levelUpFx} · {classFor(levelUpFx).name}</div>
        </div>
      )}

      {/* ── 신규 업적 플로팅(토스트와 별개로 강조) ── */}
      {newBadges.length > 0 && tab !== 'badges' && (
        <div
          style={{
            position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5,
          }}
        >
          {newBadges.slice(0, 3).map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#b8860b', color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>
              <span style={{ fontSize: 16 }}><Emoji e={b.icon} /></span>{b.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 소형 컴포넌트 ─────────────────────────
function Chip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11.5 }}>
      <span><Emoji e={icon} /></span>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 800, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 110, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function QuestCard(props: {
  icon: string; title: string; progress: string; done: boolean; claimed: boolean;
  reward: string; onClaim: () => void; pct: number
}) {
  const { icon, title, progress, done, claimed, reward, onClaim, pct } = props
  return (
    <div
      style={{
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12,
        opacity: claimed ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 24, lineHeight: 1 }}><Emoji e={icon} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{progress}</div>
        </div>
        {claimed ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)' }}>✓ 수령함</span>
        ) : (
          <button className="btn-primary" onClick={onClaim} disabled={!done} style={{ padding: '6px 12px', fontSize: 12 }}>
            {done ? '보상 받기' : '진행 중'}
          </button>
        )}
      </div>
      <div style={{ height: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
        <div style={{ height: '100%', width: `${(Math.min(1, pct) * 100).toFixed(1)}%`, background: done ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>보상 {reward}</div>
    </div>
  )
}

// 상대 시간 표기
function fmtAgo(t: number): string {
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}
