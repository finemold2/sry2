// 타자 속도(WPM) 측정 — textarea 에 자유롭게 치면 실시간 분당 단어수/글자수/경과시간을 보여준다.
// 자급식: react 외 import 없음. 측정은 첫 입력 순간부터 시작하고 빈 입력이면 리셋한다.
import { useState, useEffect, useRef, useCallback } from 'react'

export const meta = { id: 'wpm-meter', name: '타자 속도 측정', icon: '⌨️', group: '집중·생산성', intro: '자유롭게 타이핑하며 분당 단어수·글자수·경과시간을 확인하세요', w: 460, h: 480 }

// 영문 단어 수: 공백/개행 기준으로 분리한 비어있지 않은 토큰 수
function countEnglishWords(s: string): number {
  const m = s.trim()
  if (!m) return 0
  return m.split(/\s+/).filter(Boolean).length
}

// 한글 음절(가-힣) 수
function countHangulSyllables(s: string): number {
  const m = s.match(/[가-힣]/g)
  return m ? m.length : 0
}

// 한국어 어절 수: 한글이 하나라도 포함된 공백 구분 토큰 수
function countHangulEojeol(s: string): number {
  const m = s.trim()
  if (!m) return 0
  return m.split(/\s+/).filter(t => /[가-힣]/.test(t)).length
}

// 전체 글자 수(공백 포함/제외)
function countChars(s: string): { all: number; noSpace: number } {
  return { all: s.length, noSpace: s.replace(/\s/g, '').length }
}

export default function WpmMeter() {
  const [text, setText] = useState('')
  const [startAt, setStartAt] = useState<number | null>(null) // 첫 입력 시각(ms)
  const [now, setNow] = useState<number>(() => Date.now())
  const timerRef = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 입력이 진행 중일 때만 경과시간을 1초마다 갱신한다.
  useEffect(() => {
    if (startAt == null) return
    timerRef.current = window.setInterval(() => setNow(Date.now()), 250)
    return () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [startAt])

  // 언마운트 시 타이머 정리(안전망)
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    if (v.length === 0) {
      // 모두 지우면 측정 리셋
      setStartAt(null)
      setNow(Date.now())
      return
    }
    if (startAt == null) {
      const t = Date.now()
      setStartAt(t)
      setNow(t)
    }
  }, [startAt])

  const reset = useCallback(() => {
    setText('')
    setStartAt(null)
    setNow(Date.now())
    if (timerRef.current != null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    taRef.current?.focus()
  }, [])

  const elapsedMs = startAt == null ? 0 : Math.max(0, now - startAt)
  const minutes = elapsedMs / 60000
  const safeMin = minutes > 0 ? minutes : 0

  const enWords = countEnglishWords(text)
  const eojeol = countHangulEojeol(text)
  const syllables = countHangulSyllables(text)
  const chars = countChars(text)

  // 분당 환산(경과 1초 미만이면 0으로 표기해 과장된 값 방지)
  const perMin = (n: number) => (safeMin >= 1 / 60 && n > 0 ? Math.round(n / safeMin) : 0)
  const enWpm = perMin(enWords)
  const eojeolPm = perMin(eojeol)
  const syllPm = perMin(syllables)
  const cpm = perMin(chars.noSpace)

  const fmtTime = (ms: number) => {
    const total = Math.floor(ms / 1000)
    const mm = Math.floor(total / 60)
    const ss = total % 60
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: '2px 0' }
  const taStyle: React.CSSProperties = {
    flex: 1, minHeight: 90, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.6, outline: 'none',
    fontFamily: 'inherit',
  }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const timeBox: React.CSSProperties = { fontSize: 15, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={timeBox}>⏱ 경과 <b>{fmtTime(elapsedMs)}</b>{startAt == null && ' · 입력하면 시작'}</div>
        <button className="minibtn" onClick={reset} disabled={text.length === 0 && startAt == null}>↺ 리셋</button>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={onChange}
        placeholder="여기에 자유롭게 타이핑하세요. 첫 글자를 입력하는 순간 측정이 시작됩니다."
        spellCheck={false}
        aria-label="타자 입력 영역"
      />

      <div>
        <div style={sectionTitle}>🇰🇷 한국어 (어절·음절 기준)</div>
        <div style={grid}>
          <div style={stat}><div style={statVal}>{eojeolPm}</div><div style={statLabel}>어절/분</div></div>
          <div style={stat}><div style={statVal}>{syllPm}</div><div style={statLabel}>음절/분</div></div>
          <div style={stat}><div style={statVal}>{eojeol} / {syllables}</div><div style={statLabel}>어절 / 음절</div></div>
        </div>
      </div>

      <div>
        <div style={sectionTitle}>🔤 영문·공통</div>
        <div style={grid}>
          <div style={stat}><div style={statVal}>{enWpm}</div><div style={statLabel}>단어/분 (WPM)</div></div>
          <div style={stat}><div style={statVal}>{cpm}</div><div style={statLabel}>글자/분 (CPM)</div></div>
          <div style={stat}><div style={statVal}>{chars.all}</div><div style={statLabel}>총 글자수</div></div>
        </div>
      </div>

      <div style={hint}>
        첫 입력 순간부터 경과시간을 재며, 한국어는 어절·음절을, 영문은 단어를 기준으로 분당 속도를 계산합니다. 모두 지우면 초기화됩니다.
      </div>
    </div>
  )
}
