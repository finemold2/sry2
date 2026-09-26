// 마감 카운트다운 — 마감 날짜·목표 분량을 입력하면 남은 일수, 하루 권장 분량, D-day를 계산해 보여준다.
// 외부 네트워크 불필요. localStorage 로 입력값을 저장한다.
import { useState, useEffect } from 'react'
import { getWritingStats } from './linkbus'

export const meta = { id: 'deadline-countdown', name: '마감 카운트다운', icon: '⏳', group: '집중·생산성', intro: '마감일과 목표 분량으로 남은 일수·하루 권장 분량을 계산합니다', w: 420, h: 520 }

const LS = (k: string) => `sry:tool:deadline-countdown:${k}`

// 안전하게 localStorage 에서 문자열을 읽는다(차단/예외 graceful).
function loadStr(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(LS(key))
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

// 안전하게 localStorage 에 저장한다(용량 초과/차단 graceful).
function saveStr(key: string, val: string) {
  try {
    localStorage.setItem(LS(key), val)
  } catch {
    /* 저장 실패는 무시 */
  }
}

// 오늘 자정(로컬) 기준 Date — 남은 '일수' 를 날짜 단위로 계산하기 위함.
function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const MS_PER_DAY = 86400000

// 단위 라벨(매·하루 분량 표기에 사용)
const UNITS = ['자', '단어', '쪽', '챕터'] as const
type Unit = typeof UNITS[number]

export default function DeadlineCountdown() {
  // 기본 마감일: 오늘로부터 14일 뒤 (YYYY-MM-DD)
  const defaultDeadline = () => {
    const d = startOfToday()
    d.setDate(d.getDate() + 14)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const [title, setTitle] = useState(() => loadStr('title', ''))
  const [deadline, setDeadline] = useState(() => loadStr('deadline', '') || defaultDeadline())
  const [target, setTarget] = useState(() => loadStr('target', '50000'))
  const [done, setDone] = useState(() => loadStr('done', '0'))
  const [unit, setUnit] = useState<Unit>(() => {
    const u = loadStr('unit', '자')
    return (UNITS as readonly string[]).includes(u) ? (u as Unit) : '자'
  })
  // 코어 SSOT: 실제 원고 진행(전체/오늘 단어). 마감 진행을 실제 원고로 맞출 수 있게 표시·채우기.
  const [stats, setStats] = useState(() => getWritingStats())
  useEffect(() => {
    const refresh = () => setStats(getWritingStats())
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  // 실시간 D-day 갱신용 — 자정을 넘기면 남은 일수가 줄어들도록 1분마다 now 갱신.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id) // 언마운트 정리
  }, [])

  // 입력 저장 (디바운스: 변경 후 잠시 뒤 저장, 언마운트 시 타이머 정리)
  useEffect(() => {
    const id = setTimeout(() => {
      saveStr('title', title)
      saveStr('deadline', deadline)
      saveStr('target', target)
      saveStr('done', done)
      saveStr('unit', unit)
    }, 300)
    return () => clearTimeout(id)
  }, [title, deadline, target, done, unit])

  // ── 계산 ───────────────────────────────────────────────
  const targetNum = Math.max(0, Math.floor(Number(target) || 0))
  const doneNum = Math.max(0, Math.floor(Number(done) || 0))
  const remainAmount = Math.max(0, targetNum - doneNum)

  // 마감일 파싱 (YYYY-MM-DD 자정 기준). 유효하지 않으면 null.
  let deadlineDate: Date | null = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const [y, m, d] = deadline.split('-').map(Number)
    const dd = new Date(y, m - 1, d)
    if (!isNaN(dd.getTime()) && dd.getMonth() === m - 1) {
      dd.setHours(0, 0, 0, 0)
      deadlineDate = dd
    }
  }

  const today = startOfToday()
  // now 의존(자정 경과 반영): today 는 now 시점 기준으로 다시 계산
  void now

  let daysLeft: number | null = null
  if (deadlineDate) {
    daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / MS_PER_DAY)
  }

  const isPast = daysLeft != null && daysLeft < 0
  const isToday = daysLeft === 0
  // 권장 분량 계산에 쓰는 '남은 작업일' (오늘 포함, 최소 1)
  const workDays = daysLeft == null ? 0 : Math.max(1, daysLeft + 1)
  // 마감 경과 시에도 '오늘 권장'이 사라지지 않도록: 남은 분량 전부를 오늘 몫으로 본다(작업일 1로 취급).
  const perDay = daysLeft != null && remainAmount > 0
    ? (isPast ? remainAmount : Math.ceil(remainAmount / workDays))
    : 0

  const progress = targetNum > 0 ? Math.min(100, Math.round((doneNum / targetNum) * 100)) : 0
  const complete = targetNum > 0 && doneNum >= targetNum

  // D-day 문자열
  let dday = '—'
  if (daysLeft != null) {
    if (isToday) dday = 'D-DAY'
    else if (daysLeft > 0) dday = `D-${daysLeft}`
    else dday = `D+${Math.abs(daysLeft)}`
  }

  const ddayColor = complete ? 'var(--ok)' : isPast ? 'var(--warn)' : 'var(--accent)'

  const reset = () => {
    setTitle('')
    setDeadline(defaultDeadline())
    setTarget('50000')
    setDone('0')
    setUnit('자')
  }

  // ── 스타일 ─────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflowY: 'auto' }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const row: React.CSSProperties = { display: 'flex', gap: 10 }
  const field: React.CSSProperties = { flex: 1, minWidth: 0 }
  const ddayCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }
  const ddayBig: React.CSSProperties = { fontSize: 40, fontWeight: 800, lineHeight: 1.1, color: ddayColor, letterSpacing: 1 }
  const statRow: React.CSSProperties = { display: 'flex', gap: 10 }
  const statBox: React.CSSProperties = { flex: 1, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: 'var(--text)' }
  const statLbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3 }
  const barOuter: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }
  const barInner: React.CSSProperties = { height: '100%', width: `${progress}%`, background: complete ? 'var(--ok)' : 'var(--accent)', transition: 'width .3s' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={field}>
        <label style={label} htmlFor="dc-title">작업 제목 (선택)</label>
        <input id="dc-title" style={input} value={title} maxLength={60}
          placeholder="예: 장편소설 초고"
          onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={field}>
        <label style={label} htmlFor="dc-deadline">마감 날짜</label>
        <input id="dc-deadline" type="date" style={input} value={deadline}
          onChange={e => setDeadline(e.target.value)} />
      </div>

      <div style={row}>
        <div style={field}>
          <label style={label} htmlFor="dc-target">목표 분량</label>
          <input id="dc-target" type="number" min={0} step={1} style={input} value={target}
            inputMode="numeric"
            onChange={e => setTarget(e.target.value)} />
        </div>
        <div style={{ ...field, flex: '0 0 90px' }}>
          <label style={label} htmlFor="dc-unit">단위</label>
          <select id="dc-unit" style={input} value={unit}
            onChange={e => setUnit(e.target.value as Unit)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div style={field}>
        <label style={label} htmlFor="dc-done">현재까지 진행 분량</label>
        <input id="dc-done" type="number" min={0} step={1} style={input} value={done}
          inputMode="numeric"
          onChange={e => setDone(e.target.value)} />
        {stats && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>원고 기준: 전체 <b>{stats.draftTotal.toLocaleString()}</b>단어 · 오늘 <b>{stats.todayWords.toLocaleString()}</b>단어</span>
            {unit === '단어' && (
              <button className="minibtn" onClick={() => setDone(String(stats.draftTotal))}>원고 전체로 채우기</button>
            )}
          </div>
        )}
      </div>

      <div style={ddayCard}>
        {title.trim() && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{title.trim()}</div>}
        <div style={ddayBig}>{dday}</div>
        <div style={{ fontSize: 12, color: (!complete && (isPast || isToday)) ? 'var(--warn)' : 'var(--muted)', marginTop: 6 }}>
          {deadlineDate == null && '마감 날짜를 입력하세요'}
          {deadlineDate != null && complete && '🎉 목표 분량을 달성했어요!'}
          {deadlineDate != null && !complete && isPast && `마감 +${Math.abs(daysLeft!)}일 경과 — 오늘 ${remainAmount.toLocaleString()}${unit} 마무리!`}
          {deadlineDate != null && !complete && isToday && '오늘이 마감! 끝까지 가요'}
          {deadlineDate != null && !complete && !isPast && !isToday && `${daysLeft}일 남았습니다`}
        </div>
      </div>

      <div style={statRow}>
        <div style={statBox}>
          <div style={statNum}>{daysLeft == null ? '—' : isPast ? 0 : daysLeft + 1}</div>
          <div style={statLbl}>남은 작업일(오늘 포함)</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: perDay > 0 ? 'var(--accent)' : 'var(--text)' }}>
            {complete ? '0' : perDay > 0 ? perDay.toLocaleString() : '—'}
          </div>
          <div style={statLbl}>하루 권장 분량({unit})</div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>
          <span>진행률</span>
          <span>{doneNum.toLocaleString()} / {targetNum.toLocaleString()} {unit} ({progress}%)</span>
        </div>
        <div style={barOuter}><div style={barInner} /></div>
      </div>

      <div style={hint}>
        {complete
          ? '목표를 모두 채웠습니다. 새 작업을 위해 값을 조정해 보세요.'
          : isPast
            ? `마감이 지났지만 아직 ${remainAmount.toLocaleString()}${unit} 남았어요. 오늘 마무리하거나 새 마감일을 정해 다시 배분해 보세요.`
            : `오늘 포함 매일 약 ${perDay > 0 ? perDay.toLocaleString() : '0'}${unit}씩 쓰면 마감에 맞출 수 있어요.`}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="minibtn" onClick={reset}>↺ 초기화</button>
      </div>
    </div>
  )
}
