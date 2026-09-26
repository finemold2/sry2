// 집필 스트릭 — 오늘 집필을 체크하면 연속일을 기록하고, 최근 8주 잔디 히트맵·현재/최장 스트릭을 보여준다.
// 저장은 localStorage(날짜별 'YYYY-MM-DD' 집합)만 사용한다. 외부 네트워크·라이브러리 없음.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getWritingStats } from './linkbus'

export const meta = { id: 'streak-tracker', name: '집필 스트릭', icon: '🔥', group: '집중·생산성', intro: '매일 집필을 체크해 연속일과 잔디를 기록하세요', w: 440, h: 520 }

const STORAGE_KEY = 'sry:tool:streak-tracker:days'
const WEEKS = 8
const DAY_MS = 24 * 60 * 60 * 1000

// 로컬 타임존 기준 'YYYY-MM-DD' 키. UTC 변환으로 인한 날짜 밀림을 피한다.
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 자정 기준 Date (시/분/초 제거)
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function loadDays(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === 'string'))
    return new Set()
  } catch {
    return new Set()
  }
}

function saveDays(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    /* 저장 불가(프라이빗 모드/용량 초과 등) 시 무시 — 화면 상태는 유지 */
  }
}

// 연속 집필일(현재 스트릭): 오늘 또는 어제부터 거꾸로 연속된 날 수.
function currentStreak(set: Set<string>): number {
  const today = startOfDay(new Date())
  let count = 0
  // 오늘 체크 안 했으면 어제부터 세어, 어제까지의 연속을 끊기지 않은 것으로 본다.
  let cursor = set.has(dayKey(today)) ? today : new Date(today.getTime() - DAY_MS)
  // 시작점이 어제인데 어제도 없으면 0.
  while (set.has(dayKey(cursor))) {
    count++
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return count
}

// 최장 스트릭: 전체 기록에서 가장 긴 연속 구간.
function longestStreak(set: Set<string>): number {
  if (set.size === 0) return 0
  const sorted = Array.from(set).sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const cur = new Date(sorted[i] + 'T00:00:00')
    const diff = Math.round((cur.getTime() - prev.getTime()) / DAY_MS)
    if (diff === 1) {
      run++
      if (run > best) best = run
    } else if (diff === 0) {
      // 중복 키 방어 — 무시
    } else {
      run = 1
    }
  }
  return best
}

// 최근 WEEKS주 잔디 그리드. 일요일 시작 열 정렬.
// 반환: weeks[col][row] = Date | null
function buildGrid(): (Date | null)[][] {
  const today = startOfDay(new Date())
  // 이번 주의 토요일(주 끝)을 그리드의 마지막 날로 잡아 오늘이 항상 포함되게 한다.
  const endOfWeek = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS)
  const totalDays = WEEKS * 7
  const start = new Date(endOfWeek.getTime() - (totalDays - 1) * DAY_MS)
  const cols: (Date | null)[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const col: (Date | null)[] = []
    for (let r = 0; r < 7; r++) {
      const d = new Date(start.getTime() + (w * 7 + r) * DAY_MS)
      col.push(d > today ? null : d) // 미래 날짜는 빈 칸
    }
    cols.push(col)
  }
  return cols
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function StreakTracker() {
  const [days, setDays] = useState<Set<string>>(() => loadDays())
  const [grid, setGrid] = useState(() => buildGrid())
  // 코어 SSOT: 실제 원고를 쓴 날(project.writingHistory)을 자동으로 집필일에 합산 — Footer/대시보드와 숫자 일치.
  const [writeDays, setWriteDays] = useState<Set<string>>(() => { const s = getWritingStats(); return new Set(s ? Object.keys(s.dayWords) : []) })

  // 다른 탭/창에서 같은 키를 변경하면 동기화한다. 창 포커스 시 원고 집필일·잔디 그리드도 갱신.
  // 자정을 넘겨 창을 열어둬도 1분 간격으로 날짜 변경을 감지해 그리드/오늘칸/연속일을 다시 계산한다.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDays(loadDays())
    }
    const refreshWrite = () => { const s = getWritingStats(); setWriteDays(new Set(s ? Object.keys(s.dayWords) : [])) }
    // 마운트 시점의 '오늘' 키. 날짜가 바뀌면 그리드를 다시 만든다(날짜가 같으면 새 배열을 만들지 않아 불필요 재렌더 방지).
    let lastDayKey = dayKey(new Date())
    const refreshGrid = () => {
      const k = dayKey(new Date())
      if (k !== lastDayKey) {
        lastDayKey = k
        setGrid(buildGrid())
        refreshWrite() // 날짜 변경 시 원고 집필일도 함께 갱신
      }
    }
    const onFocus = () => { refreshWrite(); refreshGrid() }
    refreshWrite()
    const tick = window.setInterval(refreshGrid, 60 * 1000)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // 수동 체크일 ∪ 원고 집필일 — 스트릭/잔디/총계의 기준(원고를 쓴 날은 체크 없이도 집필일로 인정).
  const effDays = useMemo(() => new Set<string>([...days, ...writeDays]), [days, writeDays])
  const todayKey = dayKey(new Date())
  const checkedToday = effDays.has(todayKey)

  const toggleToday = useCallback(() => {
    setDays((prev) => {
      const next = new Set(prev)
      if (next.has(todayKey)) next.delete(todayKey)
      else next.add(todayKey)
      saveDays(next)
      return next
    })
  }, [todayKey])

  const cur = currentStreak(effDays)
  const longest = longestStreak(effDays)
  const total = effDays.size

  const lvlColor = (has: boolean): string => (has ? 'var(--accent)' : 'var(--chrome-2)')

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 16, boxSizing: 'border-box', color: 'var(--text)', overflowY: 'auto' }
  const statsRow: React.CSSProperties = { display: 'flex', gap: 10 }
  const statCard: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 26, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }
  const statLbl: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 4 }
  const heatBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }
  const gridWrap: React.CSSProperties = { display: 'flex', gap: 4, alignItems: 'flex-start' }
  const dowCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginRight: 2 }
  const cellBase: React.CSSProperties = { width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)' }
  const dowCellBase: React.CSSProperties = { width: 16, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }
  const legend: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--muted)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <button
        className={checkedToday ? 'minibtn' : 'btn-primary'}
        onClick={toggleToday}
        style={{ fontSize: 16, padding: '14px 16px', fontWeight: 700 }}
      >
        {checkedToday ? '✓ 오늘 집필 완료 (취소하려면 클릭)' : '🔥 오늘 집필 체크'}
      </button>

      <div style={statsRow}>
        <div style={statCard}>
          <div style={statNum}>{cur}</div>
          <div style={statLbl}>현재 연속일</div>
        </div>
        <div style={statCard}>
          <div style={statNum}>{longest}</div>
          <div style={statLbl}>최장 연속일</div>
        </div>
        <div style={statCard}>
          <div style={statNum}>{total}</div>
          <div style={statLbl}>총 집필일</div>
        </div>
      </div>

      <div style={heatBox}>
        <div style={sectionTitle}>최근 {WEEKS}주 잔디</div>
        <div style={gridWrap}>
          <div style={dowCol}>
            {DOW_LABELS.map((lbl, i) => (
              <div key={lbl} style={dowCellBase}>{i % 2 === 1 ? lbl : ''}</div>
            ))}
          </div>
          {grid.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {col.map((d, ri) => {
                if (!d) return <div key={ri} style={{ ...cellBase, border: '1px dashed var(--border)', background: 'transparent', opacity: 0.4 }} />
                const k = dayKey(d)
                const has = effDays.has(k)
                const wrote = writeDays.has(k)
                const isToday = k === todayKey
                return (
                  <div
                    key={ri}
                    title={`${k}${has ? (wrote ? ' · 원고 집필' : ' · 체크') : ''}`}
                    style={{
                      ...cellBase,
                      background: lvlColor(has),
                      outline: isToday ? '2px solid var(--warn)' : 'none',
                      outlineOffset: isToday ? 1 : 0,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div style={legend}>
          <span>안 함</span>
          <span style={{ ...cellBase, width: 14, height: 14, background: 'var(--chrome-2)' }} />
          <span style={{ ...cellBase, width: 14, height: 14, background: 'var(--accent)' }} />
          <span>집필함</span>
          <span style={{ marginLeft: 'auto' }}>오늘은 노란 테두리</span>
        </div>
      </div>

      <div style={hint}>
        실제로 원고를 쓴 날은 자동으로 집필일로 집계됩니다(코어 집필 기록과 동일 — Footer·대시보드와 같은 숫자). 글을 안 쓴 날도 직접 체크해 연속일을 이어갈 수 있어요. 하루를 건너뛰면 현재 연속일이 초기화됩니다.
      </div>
    </div>
  )
}
