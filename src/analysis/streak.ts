// 집필 연속일(streak)·배지 — writingHistory 에서 동기부여 지표를 파생(영속 상태 0).
//
// ── 단일 진실원천(SSOT) ──────────────────────────────────────────────────────
// 집필량의 단일 진실원천은 project.writingHistory 다.
//   · store.recordWriting() 이 실제 원고 증분(그날 순증가 단어 수)을 DayStat.words 에 기록한다.
//   · Footer·StatisticsModal·이 모듈의 streak/pace/badge 는 모두 이 한 곳에서만 파생한다.
// 작가 대시보드·집필 스트릭 도구는 도구 격리(react·./linkbus 만 import) 때문에 스토어를
// 직접 못 읽어 각자 localStorage 에 '수기 입력' 기반 기록을 따로 쌓는다. 그래서 그 화면의
// 오늘/주간/연속일 숫자는 통계(이 모듈) 화면과 다를 수 있다 — 이는 데이터 출처가 다르기 때문이다.
// 이를 좁히려면 도구가 payload(linkbus)로 아래 dayWords() 결과를 받아 SSOT 에 수렴해야 한다.
// (대시보드는 이미 payload.todayWords 로 오늘 분량을 1회 시드한다.)
import type { DayStat, Project } from '../model'

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return ymd(dt)
}
export function todayYmd(): string {
  return ymd(new Date())
}

export interface StreakInfo {
  current: number
  longest: number
  totalDays: number
  personalBest: number
  wroteToday: boolean
}

export function computeStreak(history: Record<string, DayStat>): StreakInfo {
  const days = Object.values(history)
    .filter((d) => d.words > 0)
    .map((d) => d.date)
    .sort()
  const set = new Set(days)
  const today = todayYmd()
  const yesterday = addDays(today, -1)
  const wroteToday = set.has(today)

  // 현재 연속: 오늘(쓴 경우) 또는 어제부터 거꾸로 연속된 날 수
  let current = 0
  let cur = wroteToday ? today : set.has(yesterday) ? yesterday : ''
  while (cur && set.has(cur)) {
    current++
    cur = addDays(cur, -1)
  }

  // 최장 연속
  let longest = 0
  let run = 0
  let prev = ''
  for (const d of days) {
    if (prev && addDays(prev, 1) === d) run++
    else run = 1
    if (run > longest) longest = run
    prev = d
  }

  const personalBest = days.reduce((mx, d) => Math.max(mx, history[d]?.words || 0), 0)
  return { current, longest, totalDays: days.length, personalBest, wroteToday }
}

/**
 * SSOT 의 일자별 순증가 단어 수 맵({ 'YYYY-MM-DD': words }).
 * recordWriting 이 적립한 실제 원고 증분을 그대로 노출한다(words>0 인 날만).
 * 대시보드·스트릭 도구가 payload(linkbus)로 받아 자기 화면을 SSOT 에 수렴시킬 때,
 * 또는 잔디/주간 합계를 통계 화면과 동일하게 그릴 때 공유한다(원본 history 는 변형하지 않음).
 */
export function dayWords(history: Record<string, DayStat>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const d of Object.values(history)) {
    if (d && d.words > 0) out[d.date] = d.words
  }
  return out
}

export interface PaceInfo {
  perDay: number
  todayWritten: number
  todayRemaining: number
  daysLeft: number
  deadline: string
  met: boolean
}

/** 마감 역산: 오늘 권장 단어와 잔여치. 마감/목표 없으면 null. */
export function dailyPace(project: Project, totalDraftWords: number): PaceInfo | null {
  const deadline = project.settings.deadline
  const target = project.settings.projectTarget
  if (!deadline || !target) return null
  const today = todayYmd()
  if (deadline < today) return null
  // 오늘 포함 남은 일수
  let daysLeft = 1
  let d = today
  while (d < deadline) {
    daysLeft++
    d = addDays(d, 1)
  }
  const remaining = Math.max(0, target - totalDraftWords)
  const perDay = Math.ceil(remaining / Math.max(1, daysLeft))
  const todayWritten = project.writingHistory[today]?.words || 0
  const todayRemaining = Math.max(0, perDay - todayWritten)
  return { perDay, todayWritten, todayRemaining, daysLeft, deadline, met: todayWritten >= perDay }
}

export interface Badge {
  id: string
  label: string
  desc: string
  earned: boolean
}

export function computeBadges(streak: StreakInfo, totalDraftWords: number): Badge[] {
  const defs: { id: string; label: string; desc: string; ok: boolean }[] = [
    { id: 'first', label: '첫 발자국', desc: '하루라도 집필', ok: streak.totalDays >= 1 },
    { id: 'streak3', label: '3일 연속', desc: '3일 연속 집필', ok: streak.longest >= 3 },
    { id: 'streak7', label: '일주일 연속', desc: '7일 연속 집필', ok: streak.longest >= 7 },
    { id: 'streak30', label: '한 달 연속', desc: '30일 연속 집필', ok: streak.longest >= 30 },
    { id: 'days30', label: '꾸준함 30일', desc: '총 30일 집필', ok: streak.totalDays >= 30 },
    { id: 'best1k', label: '하루 1,000단어', desc: '하루 1,000단어 돌파', ok: streak.personalBest >= 1000 },
    { id: 'best3k', label: '폭주 3,000단어', desc: '하루 3,000단어 돌파', ok: streak.personalBest >= 3000 },
    { id: 'words10k', label: '1만 단어', desc: '원고 10,000단어', ok: totalDraftWords >= 10000 },
    { id: 'words50k', label: '5만 단어(노벨)', desc: '원고 50,000단어', ok: totalDraftWords >= 50000 },
    { id: 'words100k', label: '10만 단어 대작', desc: '원고 100,000단어', ok: totalDraftWords >= 100000 },
  ]
  return defs.map((d) => ({ id: d.id, label: d.label, desc: d.desc, earned: d.ok }))
}
