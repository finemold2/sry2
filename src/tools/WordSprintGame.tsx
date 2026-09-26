// 워드 스프린트 게임 — 제한시간 안에 목표 단어수에 도전하는 글쓰기 게임.
// react/linkbus 외 import 없음. 타이머는 unmount/정지 시 clearInterval 로 정리한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge } from './linkbus'

export const meta = { id: 'word-sprint-game', name: '워드 스프린트', icon: '⚡', group: '집중·생산성', intro: '제한시간 안에 목표 단어수에 도전하는 글쓰기 게임', w: 460, h: 560 }

const NS = 'sry:tool:word-sprint-game:'

// 선택 가능한 제한시간(분)과 기본 목표 단어수
const DURATIONS = [
  { min: 5, words: 150 },
  { min: 10, words: 300 },
  { min: 15, words: 450 },
]

type Phase = 'idle' | 'running' | 'done'

// 공백 기준 단어 수 계산(한글/영문 모두 공백 분리 단위로 셈). 빈 토큰 제외.
function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  const m = t.match(/\S+/g)
  return m ? m.length : 0
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function loadGoal(): number {
  try {
    const v = localStorage.getItem(NS + 'goal')
    if (v) { const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) return n }
  } catch { /* localStorage 미지원/거부 graceful */ }
  return DURATIONS[0].words
}
function loadMin(): number {
  try {
    const v = localStorage.getItem(NS + 'min')
    if (v) { const n = parseInt(v, 10); if (DURATIONS.some(d => d.min === n)) return n }
  } catch { /* graceful */ }
  return DURATIONS[0].min
}

export default function WordSprintGame() {
  const [durMin, setDurMin] = useState<number>(loadMin)
  const [goal, setGoal] = useState<number>(loadGoal)
  const [phase, setPhase] = useState<Phase>('idle')
  const [text, setText] = useState('')
  const [remaining, setRemaining] = useState<number>(loadMin() * 60) // 초
  const [success, setSuccess] = useState(false)
  const [saved, setSaved] = useState('')

  const endAtRef = useRef<number>(0)        // 종료 예정 timestamp(ms)
  const timerRef = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const words = countWords(text)
  const progress = goal > 0 ? Math.min(1, words / goal) : 0

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // 언마운트 시 타이머 정리
  useEffect(() => () => clearTimer(), [clearTimer])

  // 시간/목표 변경(대기 중일 때) — 남은 시간 동기화 및 저장
  useEffect(() => {
    if (phase === 'idle') setRemaining(durMin * 60)
    try { localStorage.setItem(NS + 'min', String(durMin)) } catch { /* graceful */ }
  }, [durMin, phase])
  useEffect(() => {
    try { localStorage.setItem(NS + 'goal', String(goal)) } catch { /* graceful */ }
  }, [goal])

  const finish = useCallback((didSucceed: boolean) => {
    clearTimer()
    setSuccess(didSucceed)
    setPhase('done')
  }, [clearTimer])

  // 타이머 루프: endAt 기준으로 남은 시간 계산(드리프트 방지)
  const tick = useCallback(() => {
    const left = (endAtRef.current - Date.now()) / 1000
    if (left <= 0) {
      setRemaining(0)
      // 시간 종료 시점의 단어 수로 성공 여부 판정
      setText(curr => {
        finish(countWords(curr) >= goal)
        return curr
      })
      return
    }
    setRemaining(left)
  }, [finish, goal])

  const start = useCallback(() => {
    clearTimer()
    setText('')
    setSuccess(false)
    setPhase('running')
    const total = durMin * 60
    setRemaining(total)
    endAtRef.current = Date.now() + total * 1000
    timerRef.current = window.setInterval(tick, 250)
    // 포커스는 렌더 이후
    setTimeout(() => { try { taRef.current?.focus() } catch { /* graceful */ } }, 0)
  }, [clearTimer, durMin, tick])

  const stop = useCallback(() => {
    // 중도 포기 — 현재 단어 수로 판정
    finish(words >= goal)
  }, [finish, words, goal])

  const reset = useCallback(() => {
    clearTimer()
    setPhase('idle')
    setText('')
    setSuccess(false)
    setRemaining(durMin * 60)
  }, [clearTimer, durMin])

  // 목표 달성 즉시 성공 처리(달리는 중일 때)
  useEffect(() => {
    if (phase === 'running' && words >= goal && goal > 0) {
      finish(true)
    }
  }, [phase, words, goal, finish])

  // 프로젝트 브리지 — 스프린트로 쓴 본문을 원고 초고 문서로 저장.
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1600) }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const body = text.trim()
    if (!body) return
    // 제목: 본문 첫 줄(특수문자 정리·길이 제한). 비어 있으면 단어수로 대체.
    const firstLine = body.split('\n').map((l) => l.trim()).find(Boolean) || ''
    const titleRaw = firstLine.replace(/[“”"]/g, '').trim()
    const title = '스프린트 — ' + (titleRaw ? (titleRaw.length > 24 ? titleRaw.slice(0, 24) + '…' : titleRaw) : `${words}단어`)
    // 본문: 빈 줄 기준 단락 분리, 줄바꿈은 <br> 로 보존(HTML escape 필수).
    const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const bodyHtml = paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '초고',
      title,
      bodyHtml,
      meta: {
        출처: '워드 스프린트',
        단어수: String(words),
        목표: String(goal),
        제한시간: `${durMin}분`,
        결과: phase === 'done' ? (success ? '성공' : '미달') : '작성 중',
      },
    })
    flash(id ? '프로젝트 초고에 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  const onPickDuration = (d: { min: number; words: number }) => {
    if (phase === 'running') return
    setDurMin(d.min)
    setGoal(d.words)
  }

  const onGoalChange = (v: string) => {
    if (phase === 'running') return
    const n = parseInt(v, 10)
    if (Number.isFinite(n) && n >= 0) setGoal(n)
    else if (v === '') setGoal(0)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const statBar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'stretch' }
  const statBox: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--text)' }
  const statSub: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 2 }
  const track: React.CSSProperties = { height: 12, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }
  const fill: React.CSSProperties = {
    height: '100%',
    width: `${(progress * 100).toFixed(1)}%`,
    background: success ? 'var(--ok)' : 'var(--accent)',
    transition: 'width .2s linear',
  }
  const ta: React.CSSProperties = {
    flex: 1, minHeight: 120, resize: 'none', boxSizing: 'border-box',
    padding: 12, borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--paper)', color: 'var(--text)', fontSize: 15, lineHeight: 1.6,
    fontFamily: 'inherit', outline: 'none',
  }
  const banner = (bg: string): React.CSSProperties => ({
    padding: '10px 12px', borderRadius: 10, textAlign: 'center', fontWeight: 700,
    border: '1px solid var(--border)', background: bg, color: 'var(--text)',
  })
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const lowTime = phase === 'running' && remaining <= 30

  return (
    <div style={wrap}>
      {/* 설정(대기 중에만 변경 가능) */}
      <div style={row}>
        {DURATIONS.map(d => {
          const active = durMin === d.min
          return (
            <button
              key={d.min}
              className={active ? 'btn-primary' : 'minibtn'}
              onClick={() => onPickDuration(d)}
              disabled={phase === 'running'}
            >{d.min}분</button>
          )
        })}
        <span style={label}>목표</span>
        <input
          type="number"
          min={0}
          value={goal === 0 ? '' : goal}
          onChange={e => onGoalChange(e.target.value)}
          disabled={phase === 'running'}
          style={{ width: 70, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
          aria-label="목표 단어수"
        />
        <span style={label}>단어</span>
      </div>

      {/* 상태판 */}
      <div style={statBar}>
        <div style={statBox}>
          <div style={statNum}>{words}<span style={{ fontSize: 13, color: 'var(--muted)' }}> / {goal}</span></div>
          <div style={statSub}>단어</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: lowTime ? 'var(--warn)' : 'var(--text)' }}>{fmtTime(remaining)}</div>
          <div style={statSub}>남은 시간</div>
        </div>
      </div>

      {/* 진행 막대 */}
      <div style={track} aria-label="진행률">
        <div style={fill} />
      </div>

      {/* 결과 배너 */}
      {phase === 'done' && success && (
        <div style={banner('color-mix(in srgb, var(--ok) 22%, var(--panel))')}>
          🎉 성공! {words}단어를 채웠어요{remaining > 0 ? ` (남은 시간 ${fmtTime(remaining)})` : ''}
        </div>
      )}
      {phase === 'done' && !success && (
        <div style={banner('color-mix(in srgb, var(--warn) 22%, var(--panel))')}>
          ⏱ 종료 — {words}/{goal}단어 (목표까지 {Math.max(0, goal - words)}단어)
        </div>
      )}

      {/* 입력 영역 */}
      <textarea
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={phase === 'idle' ? '시작을 누르면 입력할 수 있어요. 멈추지 말고 써 내려가세요!' : '여기에 마음껏 써 내려가세요…'}
        disabled={phase !== 'running'}
        spellCheck={false}
        style={{ ...ta, opacity: phase === 'running' ? 1 : 0.7 }}
      />

      {/* 컨트롤 */}
      <div style={row}>
        {phase !== 'running'
          ? <button className="btn-primary" onClick={start}>{phase === 'done' ? '🔁 다시 도전' : '▶ 시작'}</button>
          : <button className="minibtn" onClick={stop}>■ 종료</button>}
        {(phase === 'done' || text) && (
          <button className="minibtn" onClick={reset}>↺ 초기화</button>
        )}
      </div>

      <div style={hint}>
        {phase === 'idle' && '제한시간과 목표 단어수를 고르고 시작하세요. 시간 안에 목표를 채우면 성공!'}
        {phase === 'running' && '멈추지 말고 쓰세요 — 목표 단어수에 도달하면 즉시 성공 처리됩니다.'}
        {phase === 'done' && (success ? '잘했어요! 다시 도전해 기록을 늘려보세요.' : '아쉽지만 다음엔 더 잘할 수 있어요. 다시 도전!')}
      </div>

      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || !text.trim()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!text.trim() ? '저장할 글이 없습니다' : '스프린트로 쓴 본문을 프로젝트 초고에 추가')}
        >📄 프로젝트에 추가</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
