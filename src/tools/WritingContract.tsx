// 집필 자기 계약서 — "나와의 계약서"를 작성하고 매일 진행을 기록하는 도구.
//   목표(작품/총분량)·기간(시작~마감)·일일 할당·집필 시간대·보상·벌칙·서명을 입력하면
//   격식 있는 계약서 텍스트를 생성하고, 오늘 달성 체크로 누적 진행률을 추적한다.
//   남은 기간 대비 필요 페이스를 계산해 뒤처지면 경고를 띄운다.
//   저장은 localStorage 만, 외부 네트워크·라이브러리·이미지 없음.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'writing-contract', name: '집필 자기 계약서', icon: '✍️', group: '집중·생산성', intro: '나와의 계약서를 쓰고 매일 달성을 체크하며 페이스를 관리하세요', w: 880, h: 700 }

const STORAGE_KEY = 'sry:tool:writing-contract'
const DAY_MS = 24 * 60 * 60 * 1000

// ---------- 타입 ----------
type Unit = 'chars' | 'words' | 'pages' | 'manuscript' // 자/단어/쪽/원고지(200자)
interface Contract {
  signer: string          // 서명자(작가) 이름
  workTitle: string       // 작품 제목
  goalAmount: number      // 목표 총량
  unit: Unit
  startDate: string       // YYYY-MM-DD
  endDate: string         // YYYY-MM-DD
  dailyQuota: number      // 사용자가 명시한 일일 할당(0이면 자동 계산)
  writeTime: string       // 집필 시간대 (예: "매일 밤 9시~11시")
  restDays: number[]      // 휴무 요일(0=일 ... 6=토)
  reward: string          // 보상
  penalty: string         // 벌칙
  oath: string            // 추가 다짐 한 줄
  signedAt: number | null // 서명(계약 발효) 시각
}
interface LogEntry { amount: number; note?: string } // 날짜별 그날 달성한 양
interface Persisted { contract: Contract; log: Record<string, LogEntry> }

const UNIT_LABEL: Record<Unit, string> = { chars: '자', words: '단어', pages: '쪽', manuscript: '매(원고지)' }
const UNIT_FULL: Record<Unit, string> = { chars: '글자', words: '단어', pages: '페이지', manuscript: '원고지(200자)' }
const DOW = ['일', '월', '화', '수', '목', '금', '토']

// ---------- 날짜 유틸 (로컬 타임존 기준) ----------
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseKey(k: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return null
  const d = new Date(k + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}
function todayKey(): string { return dayKey(new Date()) }
function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)
}
function addDaysKey(k: string, n: number): string {
  const d = parseKey(k)
  if (!d) return k
  return dayKey(new Date(d.getTime() + n * DAY_MS))
}
// 시작~끝 사이에서 휴무 요일을 제외한 "집필 가능일" 수.
function workableDays(startKey: string, endKey: string, restDays: number[]): number {
  const s = parseKey(startKey), e = parseKey(endKey)
  if (!s || !e || e < s) return 0
  const rest = new Set(restDays)
  let count = 0
  for (let t = startOfDay(s).getTime(); t <= startOfDay(e).getTime(); t += DAY_MS) {
    if (!rest.has(new Date(t).getDay())) count++
  }
  return count
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return '0'
  return Math.round(n).toLocaleString('ko-KR')
}
function fmtKDate(k: string): string {
  const d = parseKey(k)
  if (!d) return k
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${DOW[d.getDay()]})`
}

// ---------- 기본값 / 영속 ----------
function defaultContract(): Contract {
  const now = new Date()
  const end = new Date(now.getTime() + 29 * DAY_MS) // 30일 챌린지 기본
  return {
    signer: '', workTitle: '', goalAmount: 50000, unit: 'chars',
    startDate: dayKey(now), endDate: dayKey(end),
    dailyQuota: 0, writeTime: '', restDays: [],
    reward: '', penalty: '', oath: '', signedAt: null,
  }
}
function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      const c = { ...defaultContract(), ...(p.contract || {}) }
      if (!Array.isArray(c.restDays)) c.restDays = []
      const log: Record<string, LogEntry> = {}
      if (p.log && typeof p.log === 'object') {
        for (const [k, v] of Object.entries(p.log)) {
          if (!parseKey(k)) continue
          const a = Number((v as LogEntry)?.amount)
          if (isFinite(a)) log[k] = { amount: a, note: (v as LogEntry)?.note }
        }
      }
      return { contract: c, log }
    }
  } catch { /* 손상 데이터 무시 */ }
  return { contract: defaultContract(), log: {} }
}
function save(p: Persisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* 용량/프라이빗 모드 무시 */ }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------- 진행/페이스 계산 ----------
interface Derived {
  done: number            // 누적 달성량
  remaining: number       // 남은 양
  pct: number             // 진행률 0~100
  totalWorkable: number   // 전체 집필 가능일
  daysElapsed: number     // 시작부터 오늘까지 경과 집필가능일(오늘 포함, 단 시작 전이면 0)
  daysLeft: number        // 오늘 포함 남은 집필 가능일
  autoQuota: number       // 자동 일일 할당(목표/전체가능일)
  quota: number           // 실제 일일 할당(명시값 우선)
  neededPerDay: number    // 지금부터 마감까지 매일 채워야 할 양
  expectedByToday: number // 예정대로라면 오늘까지 했어야 할 누적량
  pace: number            // 진척도(done / expectedByToday), 1 이상이면 순항
  status: 'before' | 'ontrack' | 'behind' | 'ahead' | 'over' | 'done' | 'invalid'
  daysToDeadline: number  // 오늘부터 마감까지 달력일(휴무 포함)
  todayDone: number       // 오늘 기록량
  todayMet: boolean       // 오늘 할당 충족?
}

function derive(c: Contract, log: Record<string, LogEntry>): Derived {
  const tk = todayKey()
  const today = parseKey(tk)!
  const s = parseKey(c.startDate)
  const e = parseKey(c.endDate)
  const done = Object.values(log).reduce((a, l) => a + (isFinite(l.amount) ? l.amount : 0), 0)
  const goal = Math.max(0, c.goalAmount || 0)
  const remaining = Math.max(0, goal - done)
  const pct = goal > 0 ? Math.min(100, (done / goal) * 100) : 0
  const todayDone = log[tk]?.amount || 0

  if (!s || !e || e < s || goal <= 0) {
    return {
      done, remaining, pct, totalWorkable: 0, daysElapsed: 0, daysLeft: 0,
      autoQuota: 0, quota: 0, neededPerDay: 0, expectedByToday: 0, pace: 0,
      status: 'invalid', daysToDeadline: 0, todayDone, todayMet: false,
    }
  }

  const totalWorkable = workableDays(c.startDate, c.endDate, c.restDays)
  const autoQuota = totalWorkable > 0 ? goal / totalWorkable : goal
  const quota = c.dailyQuota > 0 ? c.dailyQuota : autoQuota

  // 경과/남은 집필 가능일
  const clampToday = today < s ? new Date(s.getTime() - DAY_MS) : (today > e ? e : today)
  const daysElapsed = today < s ? 0 : workableDays(c.startDate, dayKey(clampToday), c.restDays)
  const fromKey = today < s ? c.startDate : (today > e ? c.endDate : tk)
  const daysLeft = today > e ? 0 : workableDays(fromKey, c.endDate, c.restDays)
  const daysToDeadline = Math.max(0, diffDays(today, e) + (today <= e ? 1 : 0))

  const neededPerDay = daysLeft > 0 ? remaining / daysLeft : remaining
  const expectedByToday = Math.min(goal, autoQuota * daysElapsed)
  const pace = expectedByToday > 0 ? done / expectedByToday : (done > 0 ? 2 : 1)

  let status: Derived['status']
  if (done >= goal) status = 'done'
  else if (today < s) status = 'before'
  else if (today > e) status = 'over'
  else if (done >= expectedByToday * 1.05) status = 'ahead'
  else if (done >= expectedByToday * 0.92) status = 'ontrack'
  else status = 'behind'

  const todayMet = todayDone >= quota - 1e-9 && quota > 0

  return {
    done, remaining, pct, totalWorkable, daysElapsed, daysLeft,
    autoQuota, quota, neededPerDay, expectedByToday, pace,
    status, daysToDeadline, todayDone, todayMet,
  }
}

// ---------- 계약서 본문 생성 ----------
function contractLines(c: Contract, d: Derived): string[] {
  const unit = UNIT_LABEL[c.unit]
  const L: string[] = []
  L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  L.push('        집 필 자 기 계 약 서')
  L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  L.push('')
  L.push(`저 ${c.signer || '(서명자)'}는(은) 나 자신과 다음과 같이 약속한다.`)
  L.push('')
  L.push('제1조 (목표)')
  L.push(`  작품 「${c.workTitle || '제목 미정'}」을(를)`)
  L.push(`  ${fmtNum(c.goalAmount)}${unit} 분량으로 완성한다.`)
  L.push('')
  L.push('제2조 (기간)')
  L.push(`  ${fmtKDate(c.startDate)}부터`)
  L.push(`  ${fmtKDate(c.endDate)}까지 (총 ${d.daysToDeadline > 0 ? d.totalWorkable : d.totalWorkable}일의 집필 가능일).`)
  L.push('')
  L.push('제3조 (일일 할당)')
  L.push(`  하루 ${fmtNum(d.quota)}${unit} 이상 집필한다${c.dailyQuota > 0 ? '' : ' (목표·기간에 따른 자동 산정)'}.`)
  if (c.writeTime.trim()) L.push(`  집필 시간: ${c.writeTime.trim()}.`)
  if (c.restDays.length) L.push(`  휴무: ${c.restDays.slice().sort().map((x) => DOW[x]).join('·')}요일.`)
  L.push('')
  if (c.reward.trim()) {
    L.push('제4조 (보상)')
    L.push(`  계약을 완수하면 스스로에게: ${c.reward.trim()}`)
    L.push('')
  }
  if (c.penalty.trim()) {
    L.push('제5조 (벌칙)')
    L.push(`  계약을 어기면: ${c.penalty.trim()}`)
    L.push('')
  }
  if (c.oath.trim()) {
    L.push('제6조 (다짐)')
    L.push(`  ${c.oath.trim()}`)
    L.push('')
  }
  L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  L.push(c.signedAt ? `서명일: ${fmtKDate(dayKey(new Date(c.signedAt)))}` : '서명일: (미서명)')
  L.push(`서명: ${c.signer || '________'}  ✍️`)
  L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return L
}
function contractText(c: Contract, d: Derived): string { return contractLines(c, d).join('\n') }

// ---------- 작은 시각화: 진행 막대 + 페이스 라인 ----------
function ProgressBar({ pct, expectedPct, status }: { pct: number; expectedPct: number; status: Derived['status'] }) {
  const color = status === 'behind' || status === 'over' ? 'var(--err, #d9534f)'
    : status === 'done' || status === 'ahead' ? 'var(--ok, #2e9e5b)'
    : 'var(--accent)'
  return (
    <div style={{ position: 'relative', height: 26, background: 'var(--chrome-2, #e9e9ef)', borderRadius: 13, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transition: 'width .3s ease', borderRadius: 13 }} />
      {/* 예정선 — 지금쯤 와 있어야 할 위치 */}
      {expectedPct > 0 && expectedPct < 100 && (
        <div title="예정 진행선" style={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(100, expectedPct)}%`, width: 2, background: 'var(--text)', opacity: 0.55 }} />
      )}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: pct > 52 ? '#fff' : 'var(--text)', textShadow: pct > 52 ? '0 1px 2px rgba(0,0,0,.3)' : 'none' }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  )
}

// ---------- 최근 N일 미니 차트 (일일 달성 vs 할당) ----------
function MiniChart({ contract, log, quota }: { contract: Contract; log: Record<string, LogEntry>; quota: number }) {
  const days = useMemo(() => {
    const arr: { key: string; amount: number; dow: number }[] = []
    const today = parseKey(todayKey())!
    const s = parseKey(contract.startDate)
    const N = 21
    for (let i = N - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS)
      const k = dayKey(d)
      if (s && d < s) continue
      arr.push({ key: k, amount: log[k]?.amount || 0, dow: d.getDay() })
    }
    return arr
  }, [contract.startDate, log])
  const max = Math.max(quota, ...days.map((x) => x.amount), 1)
  if (!days.length) return null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, padding: '0 2px' }}>
        {days.map((x) => {
          const h = max > 0 ? (x.amount / max) * 100 : 0
          const met = quota > 0 && x.amount >= quota - 1e-9
          const isRest = contract.restDays.includes(x.dow)
          const isToday = x.key === todayKey()
          return (
            <div key={x.key} title={`${fmtKDate(x.key)} · ${fmtNum(x.amount)}${UNIT_LABEL[contract.unit]}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minWidth: 6 }}>
              <div style={{
                height: `${Math.max(x.amount > 0 ? 4 : 0, h)}%`,
                background: x.amount === 0 ? 'var(--chrome-2,#e3e3ea)' : met ? 'var(--ok,#2e9e5b)' : 'var(--accent)',
                borderRadius: 3, border: isToday ? '2px solid var(--warn,#e0a800)' : 'none', boxSizing: 'border-box',
                opacity: isRest && x.amount === 0 ? 0.4 : 1,
              }} />
            </div>
          )
        })}
      </div>
      {/* 할당선 */}
      <div style={{ position: 'relative', height: 0 }} />
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>최근 {days.length}일</span>
        <span>할당 {fmtNum(quota)}{UNIT_LABEL[contract.unit]}/일 · <span style={{ color: 'var(--ok,#2e9e5b)' }}>■</span> 달성 <span style={{ color: 'var(--accent)' }}>■</span> 부족</span>
      </div>
    </div>
  )
}

export default function WritingContract({ payload }: { payload?: Record<string, unknown> }) {
  const [data, setData] = useState<Persisted>(() => load())
  const [tab, setTab] = useState<'sign' | 'track'>(() => (load().contract.signedAt ? 'track' : 'sign'))
  const [todayInput, setTodayInput] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  const { contract, log } = data
  const d = useMemo(() => derive(contract, log), [contract, log])

  // payload 로 작품 제목/목표 초기 채움(연계 시)
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.title === 'string' ? payload.title : ''
    const g = Number(payload.goalAmount)
    if (t || isFinite(g)) {
      setData((prev) => ({
        ...prev,
        contract: {
          ...prev.contract,
          workTitle: t && !prev.contract.workTitle ? t : prev.contract.workTitle,
          goalAmount: isFinite(g) && g > 0 ? g : prev.contract.goalAmount,
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장
  useEffect(() => { save(data) }, [data])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setData(load()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  // 오늘 입력 칸을 기존 기록으로 채움
  useEffect(() => {
    const tk = todayKey()
    setTodayInput(log[tk]?.amount ? String(log[tk].amount) : '')
  }, [log])

  const patchContract = useCallback((patch: Partial<Contract>) => {
    setData((prev) => ({ ...prev, contract: { ...prev.contract, ...patch } }))
  }, [])

  const toggleRest = useCallback((dow: number) => {
    setData((prev) => {
      const set = new Set(prev.contract.restDays)
      if (set.has(dow)) set.delete(dow); else set.add(dow)
      return { ...prev, contract: { ...prev.contract, restDays: Array.from(set).sort() } }
    })
  }, [])

  const sign = useCallback(() => {
    if (!contract.signer.trim()) { flash('서명자 이름을 입력하세요.'); return }
    if (d.status === 'invalid') { flash('목표·기간을 올바르게 입력하세요.'); return }
    patchContract({ signedAt: Date.now() })
    setTab('track')
    flash('계약이 발효되었습니다. 매일 달성을 기록하세요!')
  }, [contract.signer, d.status, patchContract, flash])

  const unsign = useCallback(() => {
    patchContract({ signedAt: null })
    setTab('sign')
    flash('서명을 해제하고 편집 모드로 돌아왔습니다.')
  }, [patchContract, flash])

  // 오늘 기록 저장(절대값으로 세팅)
  const recordToday = useCallback(() => {
    const v = Number(todayInput)
    if (!isFinite(v) || v < 0) { flash('0 이상의 숫자를 입력하세요.'); return }
    setData((prev) => {
      const next = { ...prev.log }
      const tk = todayKey()
      if (v === 0) delete next[tk]
      else next[tk] = { amount: v, note: prev.log[tk]?.note }
      return { ...prev, log: next }
    })
    flash(v > 0 ? `오늘 ${fmtNum(v)}${UNIT_LABEL[contract.unit]} 기록!` : '오늘 기록을 비웠습니다.')
  }, [todayInput, contract.unit, flash])

  // 오늘 할당 채우기(빠른 체크)
  const meetTodayQuota = useCallback(() => {
    const q = Math.round(d.quota)
    setData((prev) => {
      const next = { ...prev.log }
      const tk = todayKey()
      next[tk] = { amount: Math.max(q, prev.log[tk]?.amount || 0), note: prev.log[tk]?.note }
      return { ...prev, log: next }
    })
    setTodayInput(String(Math.round(d.quota)))
    flash('오늘 할당을 달성으로 표시했습니다. ✓')
  }, [d.quota, flash])

  const copyContract = useCallback(async () => {
    const text = contractText(contract, d)
    try {
      await navigator.clipboard.writeText(text)
      flash('계약서를 클립보드에 복사했습니다.')
    } catch {
      // 폴백: 임시 textarea
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        flash('계약서를 복사했습니다.')
      } catch { flash('복사에 실패했습니다.') }
    }
  }, [contract, d, flash])

  const sendToProject = useCallback(() => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const lines = contractLines(contract, d)
    const bodyHtml = '<div style="font-family:serif;line-height:1.7;">'
      + lines.map((l) => {
        const t = l.trim()
        if (!t) return '<p style="margin:6px 0;">&nbsp;</p>'
        if (/^━+$/.test(t)) return '<hr/>'
        if (/^제\d+조/.test(t)) return `<p style="margin:10px 0 2px;font-weight:700;">${escapeHtml(l)}</p>`
        if (/^( {2,})/.test(l)) return `<p style="margin:2px 0 2px 16px;">${escapeHtml(t)}</p>`
        return `<p style="margin:4px 0;">${escapeHtml(t)}</p>`
      }).join('')
      + `<hr/><p style="color:#666;font-size:13px;">진행률 ${d.pct.toFixed(1)}% · 누적 ${fmtNum(d.done)}/${fmtNum(contract.goalAmount)}${UNIT_LABEL[contract.unit]}</p>`
      + '</div>'
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 계획',
      title: `집필 계약서 — ${contract.workTitle || '제목 미정'}`,
      bodyHtml,
      meta: {
        유형: '집필 자기 계약서',
        목표: `${fmtNum(contract.goalAmount)}${UNIT_LABEL[contract.unit]}`,
        기간: `${contract.startDate} ~ ${contract.endDate}`,
        진행률: `${d.pct.toFixed(1)}%`,
      },
    })
    flash(id ? '프로젝트 〈집필 계획〉에 추가했습니다.' : '추가하지 못했습니다.')
  }, [contract, d, flash])

  const resetAll = useCallback(() => {
    if (!window.confirm('계약과 모든 진행 기록을 삭제하고 처음부터 시작할까요?')) return
    setData({ contract: defaultContract(), log: {} })
    setTab('sign')
    flash('초기화했습니다.')
  }, [flash])

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', overflow: 'hidden', fontSize: 14 }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
    background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 13,
  })
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, marginBottom: 10, color: 'var(--text)' }

  const unitL = UNIT_LABEL[contract.unit]

  // 페이스 경고 메시지
  const paceMsg = (() => {
    switch (d.status) {
      case 'invalid': return { tone: 'warn', text: '목표·기간을 올바르게 입력하면 페이스를 계산해 드립니다.' }
      case 'before': return { tone: 'ok', text: `아직 시작 전입니다. ${fmtKDate(contract.startDate)}부터 하루 ${fmtNum(d.quota)}${unitL}.` }
      case 'done': return { tone: 'ok', text: `🎉 목표 달성! 계약을 완수했습니다. 보상: ${contract.reward.trim() || '스스로에게 칭찬을!'}` }
      case 'over': return { tone: d.done >= contract.goalAmount ? 'ok' : 'err', text: d.done >= contract.goalAmount ? '마감 후 목표 달성 완료.' : `⏰ 마감이 지났습니다. ${fmtNum(d.remaining)}${unitL} 미달.` }
      case 'ahead': return { tone: 'ok', text: `🚀 순항 중! 예정보다 ${fmtNum(d.done - d.expectedByToday)}${unitL} 앞서 있습니다.` }
      case 'ontrack': return { tone: 'ok', text: `👍 계획대로 진행 중. 남은 ${d.daysLeft}일간 하루 ${fmtNum(d.neededPerDay)}${unitL}.` }
      case 'behind': return { tone: 'err', text: `⚠️ 뒤처지는 중! 예정보다 ${fmtNum(d.expectedByToday - d.done)}${unitL} 부족. 마감하려면 남은 ${d.daysLeft}일간 하루 ${fmtNum(d.neededPerDay)}${unitL} 필요.` }
      default: return { tone: 'ok', text: '' }
    }
  })()
  const toneColor: Record<string, string> = { ok: 'var(--ok,#2e9e5b)', warn: 'var(--warn,#e0a800)', err: 'var(--err,#d9534f)' }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="✍️"/></span>
        <strong style={{ fontSize: 15 }}>집필 자기 계약서</strong>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={tabBtn(tab === 'sign')} onClick={() => setTab('sign')}>{contract.signedAt ? '계약서' : '작성'}</button>
          <button style={tabBtn(tab === 'track')} onClick={() => setTab('track')}>진행 추적</button>
        </div>
      </div>

      {/* ===== 작성/계약서 탭 ===== */}
      {tab === 'sign' && (
        <div style={body}>
          {!contract.signedAt ? (
            <>
              <div style={card}>
                <div style={sectionTitle}>1. 누가 · 무엇을</div>
                <div style={row2}>
                  <div>
                    <label style={label}>서명자(작가) 이름</label>
                    <input style={input} value={contract.signer} placeholder="예: 홍길동" onChange={(e) => patchContract({ signer: e.target.value })} />
                  </div>
                  <div>
                    <label style={label}>작품 제목</label>
                    <input style={input} value={contract.workTitle} placeholder="예: 여름의 끝" onChange={(e) => patchContract({ workTitle: e.target.value })} />
                  </div>
                </div>
                <div style={{ ...row2, marginTop: 12 }}>
                  <div>
                    <label style={label}>목표 분량</label>
                    <input style={input} type="number" min={0} value={contract.goalAmount} onChange={(e) => patchContract({ goalAmount: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label style={label}>단위</label>
                    <select style={input} value={contract.unit} onChange={(e) => patchContract({ unit: e.target.value as Unit })}>
                      {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_FULL[u]}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={card}>
                <div style={sectionTitle}>2. 언제까지</div>
                <div style={row2}>
                  <div>
                    <label style={label}>시작일</label>
                    <input style={input} type="date" value={contract.startDate} onChange={(e) => patchContract({ startDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={label}>마감일</label>
                    <input style={input} type="date" value={contract.endDate} onChange={(e) => patchContract({ endDate: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={label}>휴무 요일 (선택 — 할당 계산에서 제외)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DOW.map((nm, i) => (
                      <button key={i} className="minibtn" onClick={() => toggleRest(i)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700,
                        background: contract.restDays.includes(i) ? 'var(--accent)' : 'transparent',
                        color: contract.restDays.includes(i) ? '#fff' : 'var(--text)',
                      }}>{nm}</button>
                    ))}
                  </div>
                </div>
                {d.status !== 'invalid' && (
                  <div style={{ marginTop: 12, fontSize: 13, padding: '10px 12px', background: 'var(--paper)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                    총 <b>{d.totalWorkable}일</b>의 집필 가능일 · 자동 일일 할당 <b style={{ color: 'var(--accent)' }}>{fmtNum(d.autoQuota)}{unitL}/일</b>
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={sectionTitle}>3. 하루 약속</div>
                <div style={row2}>
                  <div>
                    <label style={label}>일일 할당 (0이면 자동 = {fmtNum(d.autoQuota)}{unitL})</label>
                    <input style={input} type="number" min={0} value={contract.dailyQuota} placeholder="0 (자동)" onChange={(e) => patchContract({ dailyQuota: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label style={label}>집필 시간대</label>
                    <input style={input} value={contract.writeTime} placeholder="예: 매일 밤 9시~11시" onChange={(e) => patchContract({ writeTime: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={card}>
                <div style={sectionTitle}>4. 보상 · 벌칙 · 다짐</div>
                <label style={label}>완수 보상</label>
                <input style={input} value={contract.reward} placeholder="예: 가고 싶던 여행 떠나기" onChange={(e) => patchContract({ reward: e.target.value })} />
                <label style={{ ...label, marginTop: 12 }}>위반 벌칙</label>
                <input style={input} value={contract.penalty} placeholder="예: 한 주 동안 디저트 금지" onChange={(e) => patchContract({ penalty: e.target.value })} />
                <label style={{ ...label, marginTop: 12 }}>한 줄 다짐</label>
                <input style={input} value={contract.oath} placeholder="예: 완벽보다 완성. 매일 한 줄이라도 쓴다." onChange={(e) => patchContract({ oath: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn-primary" style={{ padding: '12px 20px', fontSize: 15, fontWeight: 800 }} onClick={sign}><Emoji e="✍️"/> 서명하고 계약 발효</button>
                <button className="minibtn" onClick={resetAll} style={{ marginLeft: 'auto' }}>초기화</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                서명하면 계약서가 완성되고 〈진행 추적〉 탭에서 매일 달성을 기록할 수 있습니다. 모든 데이터는 이 브라우저에만 저장됩니다.
              </div>
            </>
          ) : (
            // 발효된 계약서 — 격식 있는 표시
            <>
              <div style={{ ...card, background: 'var(--paper)', borderWidth: 2, padding: '22px 26px', fontFamily: 'serif' }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
                  {contractText(contract, d)}
                </pre>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={copyContract}><Emoji e="📋"/> 계약서 복사</button>
                {hasProjectBridge() && <button className="linkbtn" onClick={sendToProject}><Emoji e="📄"/> 프로젝트에 추가</button>}
                <button className="minibtn" onClick={() => setTab('track')}>진행 추적 →</button>
                <button className="minibtn" onClick={unsign} style={{ marginLeft: 'auto' }}><Emoji e="✏️"/> 계약 수정</button>
                <button className="minibtn" onClick={resetAll}>초기화</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== 진행 추적 탭 ===== */}
      {tab === 'track' && (
        <div style={body}>
          {!contract.signedAt && (
            <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>
              아직 서명한 계약이 없습니다. 그래도 진행은 기록할 수 있어요.
              <div style={{ marginTop: 10 }}><button className="btn-primary" onClick={() => setTab('sign')}>계약서 작성하러 가기</button></div>
            </div>
          )}

          {/* 진행 요약 */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={sectionTitle}>{contract.workTitle || '내 작품'} 진행</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtNum(d.done)} / {fmtNum(contract.goalAmount)}{unitL}</div>
            </div>
            <ProgressBar pct={d.pct} expectedPct={contract.goalAmount > 0 ? (d.expectedByToday / contract.goalAmount) * 100 : 0} status={d.status} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 14 }}>
              {[
                { n: fmtNum(d.remaining) + unitL, l: '남은 분량' },
                { n: d.daysLeft + '일', l: '남은 집필일' },
                { n: fmtNum(d.neededPerDay) + unitL, l: '필요 페이스/일' },
                { n: fmtNum(d.quota) + unitL, l: '계약 할당/일' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 4px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {paceMsg.text && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.5, background: 'var(--paper)', border: `1px solid ${toneColor[paceMsg.tone]}`, color: toneColor[paceMsg.tone] }}>
                {emojify(paceMsg.text)}
              </div>
            )}
          </div>

          {/* 오늘 기록 */}
          <div style={card}>
            <div style={sectionTitle}>오늘 ({fmtKDate(todayKey())})</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={label}>오늘까지 쓴 양 ({unitL})</label>
                <input style={input} type="number" min={0} value={todayInput}
                  onChange={(e) => setTodayInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') recordToday() }}
                  placeholder={`예: ${Math.round(d.quota) || 1000}`} />
              </div>
              <button className="btn-primary" onClick={recordToday} style={{ padding: '9px 16px' }}>기록</button>
              <button className="minibtn" onClick={meetTodayQuota} style={{ padding: '9px 14px' }}>할당 채움 ✓</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              {d.todayMet
                ? <span style={{ color: 'var(--ok,#2e9e5b)', fontWeight: 700 }}>✓ 오늘 할당 달성 ({fmtNum(d.todayDone)}/{fmtNum(d.quota)}{unitL})</span>
                : <span style={{ color: 'var(--muted)' }}>오늘 {fmtNum(d.todayDone)}{unitL} 기록 · 할당까지 <b style={{ color: 'var(--err,#d9534f)' }}>{fmtNum(Math.max(0, d.quota - d.todayDone))}{unitL}</b> 남음</span>}
            </div>
          </div>

          {/* 미니 차트 */}
          <div style={card}>
            <div style={sectionTitle}>일일 달성 추이</div>
            {Object.keys(log).length === 0
              ? <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '18px 0' }}>아직 기록이 없습니다. 위에서 오늘 쓴 양을 입력해 보세요.</div>
              : <MiniChart contract={contract} log={log} quota={d.quota} />}
          </div>

          {/* 기록 목록(최근) */}
          {Object.keys(log).length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>기록 ({Object.keys(log).length}일)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {Object.entries(log).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([k, v]) => {
                  const met = d.quota > 0 && v.amount >= d.quota - 1e-9
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: met ? 'var(--ok,#2e9e5b)' : 'var(--muted)' }}>{met ? '✓' : '·'}</span>
                      <span>{fmtKDate(k)}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmtNum(v.amount)}{unitL}</span>
                      <button className="minibtn" title="이 날 기록 삭제" style={{ padding: '2px 8px', fontSize: 12 }}
                        onClick={() => setData((prev) => { const n = { ...prev.log }; delete n[k]; return { ...prev, log: n } })}>✕</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={copyContract}><Emoji e="📋"/> 계약서 복사</button>
            {hasProjectBridge() && <button className="linkbtn" onClick={sendToProject}><Emoji e="📄"/> 프로젝트에 추가</button>}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--paper)', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.25)', zIndex: 50, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
