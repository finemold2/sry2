// 세션 목표(로컬) — 이번 세션의 목표 글자수를 정하고, 자유 기록칸에 쓴 글자수를 실시간 집계해
// 진행 막대(%)와 남은 분량을 보여준다. 목표 달성 시 축하 배너. 목표·본문은 localStorage 저장.
// react 외 import 없음 / 외부 네트워크 없음 / 언마운트 시 타이머·이벤트 정리.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'session-goal', name: '세션 목표', icon: '🎯', group: '집중·생산성', intro: '이번 세션 목표 글자수를 정하고 진행률을 실시간으로 확인하세요', w: 460, h: 580 }

const NS = 'sry:tool:session-goal:'
const PRESETS = [300, 500, 1000, 2000]

// 공백 제외 여부와 무관하게 '글자수'는 전체 문자 길이로 센다(한국어 원고 관행에 맞춤).
// Array.from 으로 이모지·서로게이트 쌍을 1글자로 안전하게 집계.
function countChars(text: string): number {
  if (!text) return 0
  try {
    return Array.from(text).length
  } catch {
    return text.length
  }
}

function loadGoal(): number {
  try {
    const v = localStorage.getItem(NS + 'goal')
    if (v) { const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) return n }
  } catch { /* localStorage 미지원/거부 graceful */ }
  return PRESETS[1]
}

function loadText(): string {
  try {
    return localStorage.getItem(NS + 'text') || ''
  } catch { /* graceful */ }
  return ''
}

export default function SessionGoal() {
  const [goal, setGoal] = useState<number>(loadGoal)
  const [text, setText] = useState<string>(loadText)
  const [celebrated, setCelebrated] = useState(false) // 달성 순간 1회만 축하 강조

  const saveTimer = useRef<number | null>(null)

  const chars = countChars(text)
  const remaining = Math.max(0, goal - chars)
  const progress = goal > 0 ? Math.min(1, chars / goal) : 0
  const reached = goal > 0 && chars >= goal
  const pct = Math.round(progress * 100)

  // 목표 변경 즉시 저장(가벼움)
  useEffect(() => {
    try { localStorage.setItem(NS + 'goal', String(goal)) } catch { /* graceful */ }
  }, [goal])

  // 본문은 디바운스 저장(타이핑마다 쓰기 부담 줄임). 언마운트/변경 시 타이머 정리.
  useEffect(() => {
    if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null }
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(NS + 'text', text) } catch { /* graceful */ }
      saveTimer.current = null
    }, 400)
    return () => {
      if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null }
    }
  }, [text])

  // 언마운트 시 마지막 본문 즉시 저장(디바운스 미반영분 보존)
  useEffect(() => {
    return () => {
      try { localStorage.setItem(NS + 'text', text) } catch { /* graceful */ }
    }
    // text 를 의존성에 넣지 않음 — 최신값은 클로저로 캡처되며 언마운트 시 1회만 실행되게 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 다른 탭에서 같은 키 변경 시 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === NS + 'goal') setGoal(loadGoal())
        else if (e.key === NS + 'text') setText(loadText())
      } catch { /* graceful */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 달성 상태 추적 — 도달하면 축하 1회 강조, 목표 미달로 내려가면 초기화
  useEffect(() => {
    if (reached) setCelebrated(true)
    else setCelebrated(false)
  }, [reached])

  const onGoalInput = (v: string) => {
    if (v === '') { setGoal(0); return }
    const n = parseInt(v, 10)
    if (Number.isFinite(n) && n >= 0) setGoal(n)
  }

  const clearText = () => {
    setText('')
    try { localStorage.setItem(NS + 'text', '') } catch { /* graceful */ }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const goalInput: React.CSSProperties = { width: 86, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const statBar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'stretch' }
  const statBox: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--text)' }
  const statSub: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 }
  const track: React.CSSProperties = { height: 14, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', position: 'relative' }
  const fill: React.CSSProperties = {
    height: '100%',
    width: `${(progress * 100).toFixed(1)}%`,
    background: reached ? 'var(--ok)' : 'var(--accent)',
    transition: 'width .2s linear, background .3s',
  }
  const pctLabel: React.CSSProperties = {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: 'var(--text)', mixBlendMode: 'difference',
  }
  const banner = (bg: string): React.CSSProperties => ({
    padding: '10px 12px', borderRadius: 10, textAlign: 'center', fontWeight: 700,
    border: '1px solid var(--border)', background: bg, color: 'var(--text)',
  })
  const ta: React.CSSProperties = {
    flex: 1, minHeight: 160, resize: 'none', boxSizing: 'border-box',
    padding: 12, borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--paper)', color: 'var(--text)', fontSize: 15, lineHeight: 1.7,
    fontFamily: 'inherit', outline: 'none',
  }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 목표 설정 */}
      <div style={row}>
        <span style={label}>목표 글자수</span>
        <input
          type="number"
          min={0}
          value={goal === 0 ? '' : goal}
          onChange={e => onGoalInput(e.target.value)}
          style={goalInput}
          aria-label="목표 글자수"
        />
        <span style={label}>자</span>
      </div>
      <div style={row}>
        {PRESETS.map(p => (
          <button
            key={p}
            className={goal === p ? 'btn-primary' : 'minibtn'}
            onClick={() => setGoal(p)}
          >{p.toLocaleString()}자</button>
        ))}
      </div>

      {/* 상태판 */}
      <div style={statBar}>
        <div style={statBox}>
          <div style={statNum}>{chars.toLocaleString()}</div>
          <div style={statSub}>현재 글자수</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: reached ? 'var(--ok)' : 'var(--text)' }}>
            {reached ? '0' : remaining.toLocaleString()}
          </div>
          <div style={statSub}>남은 분량</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: reached ? 'var(--ok)' : 'var(--accent)' }}>{pct}%</div>
          <div style={statSub}>달성률</div>
        </div>
      </div>

      {/* 진행 막대 */}
      <div style={track} aria-label={`진행률 ${pct}%`}>
        <div style={fill} />
        <div style={pctLabel}>{pct}%</div>
      </div>

      {/* 달성 축하 */}
      {reached && celebrated && (
        <div style={banner('color-mix(in srgb, var(--ok) 22%, var(--panel))')}>
          🎉 목표 달성! {chars.toLocaleString()}자를 채웠어요{chars > goal ? ` (+${(chars - goal).toLocaleString()}자)` : ''}
        </div>
      )}

      {/* 자유 기록칸 */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="여기에 이번 세션의 글을 자유롭게 써 내려가세요. 글자수가 실시간으로 집계됩니다…"
        spellCheck={false}
        style={ta}
        aria-label="세션 기록"
      />

      {/* 컨트롤 */}
      <div style={row}>
        {text && <button className="minibtn" onClick={clearText}>↺ 본문 비우기</button>}
        <span style={{ ...hint, marginLeft: 'auto' }}>로컬 저장됨 · 새로고침해도 유지</span>
      </div>

      <div style={hint}>
        목표 글자수를 정하고 아래 칸에 쓰면 진행률과 남은 분량이 실시간으로 계산됩니다. 목표·본문은 이 브라우저에만 저장됩니다.
      </div>
    </div>
  )
}
