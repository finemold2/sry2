// 세계 시계 — 여러 도시의 현재 시각을 동시에 보여준다. 시대물·해외 배경 장면의 시차/시각 참고용.
// 외부 네트워크·라이브러리 없음. 브라우저 내장 Intl.DateTimeFormat(timeZone) 으로만 각 도시의 로컬 시각을 계산한다.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'world-clock', name: '세계 시계', icon: '🌐', group: '유틸·참고', intro: '주요 도시들의 현재 시각을 한눈에 (시대물·해외 배경 참고)', w: 420, h: 560 }

const STORAGE_KEY = 'sry:tool:world-clock:cities'

interface City {
  label: string // 한국어 표시명
  tz: string    // IANA timeZone
}

// 추가 가능한 주요 도시 목록 (IANA timeZone). 모두 브라우저 내장 데이터로 처리된다.
const CATALOG: City[] = [
  { label: '서울', tz: 'Asia/Seoul' },
  { label: '도쿄', tz: 'Asia/Tokyo' },
  { label: '베이징', tz: 'Asia/Shanghai' },
  { label: '홍콩', tz: 'Asia/Hong_Kong' },
  { label: '타이베이', tz: 'Asia/Taipei' },
  { label: '방콕', tz: 'Asia/Bangkok' },
  { label: '싱가포르', tz: 'Asia/Singapore' },
  { label: '자카르타', tz: 'Asia/Jakarta' },
  { label: '뉴델리', tz: 'Asia/Kolkata' },
  { label: '두바이', tz: 'Asia/Dubai' },
  { label: '이스탄불', tz: 'Europe/Istanbul' },
  { label: '모스크바', tz: 'Europe/Moscow' },
  { label: '카이로', tz: 'Africa/Cairo' },
  { label: '아테네', tz: 'Europe/Athens' },
  { label: '로마', tz: 'Europe/Rome' },
  { label: '베를린', tz: 'Europe/Berlin' },
  { label: '파리', tz: 'Europe/Paris' },
  { label: '런던', tz: 'Europe/London' },
  { label: '리스본', tz: 'Europe/Lisbon' },
  { label: '상파울루', tz: 'America/Sao_Paulo' },
  { label: '뉴욕', tz: 'America/New_York' },
  { label: '시카고', tz: 'America/Chicago' },
  { label: '덴버', tz: 'America/Denver' },
  { label: '로스앤젤레스', tz: 'America/Los_Angeles' },
  { label: '멕시코시티', tz: 'America/Mexico_City' },
  { label: '호놀룰루', tz: 'Pacific/Honolulu' },
  { label: '시드니', tz: 'Australia/Sydney' },
  { label: '오클랜드', tz: 'Pacific/Auckland' },
]

const DEFAULT_TZS = ['Asia/Seoul', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
const MAX_CITIES = 12

// 저장된 timeZone 목록을 안전하게 읽는다(차단/손상 graceful). CATALOG 에 없는 값은 버린다.
function loadCities(): City[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const found = arr
          .filter((x) => typeof x === 'string')
          .map((tz) => CATALOG.find((c) => c.tz === tz))
          .filter((c): c is City => !!c)
        if (found.length) return found.slice(0, MAX_CITIES)
      }
    }
  } catch {
    /* 무시 — 기본값 사용 */
  }
  return DEFAULT_TZS.map((tz) => CATALOG.find((c) => c.tz === tz)).filter((c): c is City => !!c)
}

function saveCities(cities: City[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities.map((c) => c.tz)))
  } catch {
    /* 저장 실패는 무시 */
  }
}

// 해당 timeZone 의 현재 시:분:초 / 날짜 / 요일을 포맷한다. 미지원 timeZone 은 graceful 처리.
function formatFor(tz: string, now: Date): { time: string; date: string; supported: boolean } {
  try {
    const time = new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(now)
    const date = new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz, month: 'long', day: 'numeric', weekday: 'short',
    }).format(now)
    return { time, date, supported: true }
  } catch {
    return { time: '--:--:--', date: '미지원 시간대', supported: false }
  }
}

// 로컬(브라우저) 기준 대비 시차(시간)를 추정해 'KST+9' 식 라벨로 만든다.
function offsetLabel(tz: string, now: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const part = dtf.formatToParts(now).find((p) => p.type === 'timeZoneName')
    if (part && part.value) return part.value.replace('GMT', 'UTC')
  } catch {
    /* 폴백으로 계산 */
  }
  // 폴백: 로컬 시각과 대상 timeZone 시각의 차이를 분 단위로 계산.
  try {
    const asUTC = (d: Date, zone: string) => {
      const p = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).formatToParts(d)
      const g = (t: string) => Number(p.find((x) => x.type === t)?.value || 0)
      return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'))
    }
    const diffMin = Math.round((asUTC(now, tz) - asUTC(now, 'UTC')) / 60000)
    const sign = diffMin >= 0 ? '+' : '-'
    const h = Math.floor(Math.abs(diffMin) / 60)
    const m = Math.abs(diffMin) % 60
    return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
  } catch {
    return ''
  }
}

export default function WorldClock() {
  const [cities, setCities] = useState<City[]>(() => loadCities())
  const [now, setNow] = useState<Date>(() => new Date())
  const [pick, setPick] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  // 1초마다 현재 시각 갱신. 언마운트 시 정리.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // 도시 목록 변경 시 저장.
  useEffect(() => {
    saveCities(cities)
  }, [cities])

  // 복사 타이머 정리.
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current) }, [])

  // 아직 추가되지 않은 도시들 (셀렉트 옵션).
  const available = CATALOG.filter((c) => !cities.some((x) => x.tz === c.tz))

  const addCity = (tz: string) => {
    if (!tz) return
    const city = CATALOG.find((c) => c.tz === tz)
    if (!city) return
    setCities((prev) => (prev.some((c) => c.tz === tz) || prev.length >= MAX_CITIES ? prev : [...prev, city]))
    setPick('')
  }

  const removeCity = (tz: string) => {
    setCities((prev) => prev.filter((c) => c.tz !== tz))
  }

  const reset = () => setCities(DEFAULT_TZS.map((tz) => CATALOG.find((c) => c.tz === tz)).filter((c): c is City => !!c))

  // 현재 화면의 모든 도시 시각을 텍스트로 복사.
  const copy = () => {
    const lines = cities.map((c) => {
      const f = formatFor(c.tz, now)
      const off = offsetLabel(c.tz, now)
      return `${c.label} (${off}) — ${f.date} ${f.time}`
    })
    const text = `🌐 세계 시계 (${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(now)} 기준)\n` + lines.join('\n')
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 복사 실패 graceful */ })
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const toolbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const select: React.CSSProperties = { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const list: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }
  const cardMain: React.CSSProperties = { flex: 1, minWidth: 0 }
  const cityName: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }
  const offText: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 500 }
  const dateText: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 3 }
  const timeText: React.CSSProperties = { fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: 'var(--accent)', lineHeight: 1, whiteSpace: 'nowrap' }
  const xbtn: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, flex: '0 0 auto' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, padding: 20 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={toolbar}>
        <select
          style={select}
          value={pick}
          onChange={(e) => addCity(e.target.value)}
          disabled={available.length === 0 || cities.length >= MAX_CITIES}
        >
          <option value="">
            {cities.length >= MAX_CITIES ? `최대 ${MAX_CITIES}개까지` : available.length === 0 ? '모든 도시 추가됨' : '+ 도시 추가…'}
          </option>
          {available.map((c) => (
            <option key={c.tz} value={c.tz}>{c.label}</option>
          ))}
        </select>
        <button className="minibtn" onClick={copy} disabled={cities.length === 0}>
          {copied ? '✓ 복사됨' : '📋 복사'}
        </button>
        <button className="minibtn" onClick={reset}>↺ 기본</button>
      </div>

      {cities.length === 0 ? (
        <div style={empty}>
          표시할 도시가 없습니다.<br />위에서 도시를 추가해 보세요.
        </div>
      ) : (
        <div style={list}>
          {cities.map((c) => {
            const f = formatFor(c.tz, now)
            const off = offsetLabel(c.tz, now)
            return (
              <div key={c.tz} style={card}>
                <div style={cardMain}>
                  <div style={cityName}>
                    <span>{c.label}</span>
                    {off && <span style={offText}>{off}</span>}
                  </div>
                  <div style={dateText}>{f.date}</div>
                </div>
                <div style={{ ...timeText, color: f.supported ? 'var(--accent)' : 'var(--warn)' }}>{f.time}</div>
                <button
                  style={xbtn}
                  onClick={() => removeCity(c.tz)}
                  title={`${c.label} 제거`}
                  aria-label={`${c.label} 제거`}
                >✕</button>
              </div>
            )
          })}
        </div>
      )}

      <div style={hint}>
        브라우저 내장 시간대 데이터로 1초마다 갱신됩니다. 시차는 서머타임(DST)을 반영합니다. 해외·시대물 장면의 시각 설정 참고용.
      </div>
    </div>
  )
}
