// Try/Fail 사이클 엔진 — 주인공의 시도→결과를 단계별로 쌓아 상승하는 긴장 플롯을 만든다.
//  결과 유형은 두 가지: '예, 그러나'(부분 성공이지만 새 문제) / '아니오, 게다가'(실패에 악화까지).
//  이 두 패턴을 번갈아 쌓으면 매 시도가 상황을 더 꼬이게 만들어 긴장이 상승한다(상승 곡선 시각화).
//  각 단계는 시도·결과 입력 + 유형 토글, 추가/삭제/순서 변경. 마지막에 해결(클라이맥스)·교훈.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:try-fail-cycle' 자동 저장/복원.
// 연계(linkbus): 완성된 사이클을 프로젝트 원고/자료의 '플롯' 폴더에 문서로 추가, 텍스트 복사.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'try-fail-cycle', name: 'Try/Fail 사이클', icon: '🎢', group: '구상·정리', intro: '시도→결과(예,그러나 / 아니오,게다가)를 쌓아 상승 긴장 플롯을 만드세요', w: 660, h: 600 }

// 결과 유형 — 상승 플롯의 핵심 두 패턴(스노우플레이크/사우스파크 작법의 "but / therefore").
type Outcome = 'yesBut' | 'noAnd'
interface OutcomeDef { key: Outcome; label: string; short: string; icon: string; color: string; hint: string; connector: string }
const OUTCOMES: OutcomeDef[] = [
  { key: 'yesBut', label: '예, 그러나', short: '예,그러나', icon: '🟡', color: 'var(--warn)', hint: '시도는 (부분) 성공하지만, 그 대가로 새로운 문제가 생긴다.', connector: '그러나' },
  { key: 'noAnd', label: '아니오, 게다가', short: '아니오,게다가', icon: '🔴', color: 'var(--accent)', hint: '시도가 실패하고, 게다가 상황이 더 나빠진다.', connector: '게다가' },
]
function outDef(o: Outcome): OutcomeDef { return OUTCOMES.find((x) => x.key === o) || OUTCOMES[0] }

interface Step {
  id: string
  attempt: string   // 주인공이 한 시도
  outcome: Outcome  // 결과 유형
  result: string    // 결과(그러나/게다가로 이어지는 내용)
}
interface Cycle {
  premise: string       // 주인공의 목표(욕망)
  resolution: string    // 마지막 해결(클라이맥스에서 어떻게 이기거나 지는가)
  lesson: string        // 교훈/변화(선택)
  steps: Step[]
}

const LS_KEY = 'sry:tool:try-fail-cycle'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyCycle(): Cycle {
  return {
    premise: '',
    resolution: '',
    lesson: '',
    steps: [
      { id: newId(), attempt: '', outcome: 'yesBut', result: '' },
      { id: newId(), attempt: '', outcome: 'noAnd', result: '' },
    ],
  }
}

// localStorage 복원 — 미지원/손상 시 graceful(기본 빈 사이클).
function loadCycle(): Cycle {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyCycle()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyCycle()
    const rawSteps = Array.isArray(p.steps) ? p.steps : []
    const steps: Step[] = rawSteps
      .filter((s: unknown) => s && typeof s === 'object')
      .map((s: Record<string, unknown>) => ({
        id: String(s.id || newId()),
        attempt: String(s.attempt || ''),
        outcome: (s.outcome === 'noAnd' ? 'noAnd' : 'yesBut') as Outcome,
        result: String(s.result || ''),
      }))
    return {
      premise: String(p.premise || ''),
      resolution: String(p.resolution || ''),
      lesson: String(p.lesson || ''),
      steps: steps.length ? steps : emptyCycle().steps,
    }
  } catch { return emptyCycle() }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const dash = (s: string) => (s.trim() ? s.trim() : '—')

// 텍스트 내보내기 — 플레인 텍스트(복사용).
function exportText(c: Cycle): string {
  const lines: string[] = []
  lines.push('# Try/Fail 사이클')
  lines.push('')
  lines.push(`목표: ${dash(c.premise)}`)
  lines.push('')
  c.steps.forEach((s, i) => {
    const d = outDef(s.outcome)
    lines.push(`${i + 1}. [시도] ${dash(s.attempt)}`)
    lines.push(`   → [${d.label}] ${dash(s.result)}`)
  })
  lines.push('')
  lines.push(`해결(클라이맥스): ${dash(c.resolution)}`)
  if (c.lesson.trim()) lines.push(`교훈/변화: ${c.lesson.trim()}`)
  return lines.join('\n')
}

// 프로젝트 문서 본문(HTML) — 목표 + 단계별 시도/결과 + 해결/교훈.
function bodyHtml(c: Cycle): string {
  const muted = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : muted)
  const parts: string[] = []
  parts.push(`<p><b>🎯 목표:</b> ${v(c.premise)}</p>`)
  parts.push('<p><b>🎢 시도 / 결과 (상승 긴장)</b></p>')
  parts.push('<ol>')
  c.steps.forEach((s) => {
    const d = outDef(s.outcome)
    parts.push(`<li><b>시도:</b> ${v(s.attempt)}<br>${escHtml(d.icon)} <b>${escHtml(d.label)}:</b> ${v(s.result)}</li>`)
  })
  parts.push('</ol>')
  parts.push(`<p><b>🏁 해결(클라이맥스):</b> ${v(c.resolution)}</p>`)
  if (c.lesson.trim()) parts.push(`<p><b>💡 교훈/변화:</b> ${escHtml(c.lesson.trim())}</p>`)
  return parts.join('')
}

// 긴장 곡선 점수 — 단계가 진행될수록 상승, '아니오,게다가'는 더 가파르게(상승 긴장 시각화용).
function tensionPoints(c: Cycle): number[] {
  let t = 0
  return c.steps.map((s) => {
    t += s.outcome === 'noAnd' ? 2 : 1
    return t
  })
}

export default function TryFailCycle({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Cycle>(loadCycle())
  const [cycle, setCycle] = useState<Cycle>(init.current)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const flashNonce = useRef(0) // 경쟁상태 방지: 마지막 flash 만 유효

  // 페이로드로 목표를 미리 채워 열릴 수 있게(연계 진입). 빈입력 graceful.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const p = payload || {}
    const pre = typeof p.premise === 'string' ? p.premise : typeof p.goal === 'string' ? p.goal : ''
    if (pre.trim()) setCycle((c) => (c.premise.trim() ? c : { ...c, premise: pre.trim() }))
  }, [payload])

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만(graceful).
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cycle)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [cycle])

  // flash 자동 소거 — nonce 로 경쟁상태/언마운트 정리.
  useEffect(() => {
    if (!flash) return
    const myNonce = ++flashNonce.current
    const t = window.setTimeout(() => { if (mounted.current && flashNonce.current === myNonce) setFlash('') }, 1800)
    return () => window.clearTimeout(t)
  }, [flash])

  // ── 단계 편집 ──
  const setStep = (id: string, patch: Partial<Step>) =>
    setCycle((c) => ({ ...c, steps: c.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  const addStep = (afterId?: string) =>
    setCycle((c) => {
      // 직전 단계와 다른 유형을 기본값으로 제안(번갈아 쌓이는 상승 패턴 유도).
      const last = c.steps[c.steps.length - 1]
      const nextOutcome: Outcome = last && last.outcome === 'yesBut' ? 'noAnd' : 'yesBut'
      const ns: Step = { id: newId(), attempt: '', outcome: nextOutcome, result: '' }
      if (!afterId) return { ...c, steps: [...c.steps, ns] }
      const i = c.steps.findIndex((s) => s.id === afterId)
      if (i < 0) return { ...c, steps: [...c.steps, ns] }
      const steps = c.steps.slice()
      steps.splice(i + 1, 0, ns)
      return { ...c, steps }
    })

  const removeStep = (id: string) => {
    setCycle((c) => ({ ...c, steps: c.steps.filter((s) => s.id !== id) }))
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) =>
    setCycle((c) => {
      const i = c.steps.findIndex((s) => s.id === id)
      if (i < 0) return c
      const j = i + dir
      if (j < 0 || j >= c.steps.length) return c
      const steps = c.steps.slice()
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      return { ...c, steps }
    })

  // 드래그 순서 변경 (HTML5 DnD — 전역 포인터 리스너 없음).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setCycle((c) => {
      const fi = c.steps.findIndex((s) => s.id === from)
      const ti = c.steps.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return c
      const steps = c.steps.slice()
      const [moved] = steps.splice(fi, 1)
      steps.splice(ti, 0, moved)
      return { ...c, steps }
    })
  }

  const resetAll = () => {
    setCycle(emptyCycle())
    setConfirmDel(null)
    setFlash('초기화했어요')
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setFlash(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setFlash('복사 실패') }
  }

  // 프로젝트 연동 — '플롯' 폴더에 사이클 문서 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setFlash('프로젝트에 연결되지 않았습니다'); return }
    const title = cycle.premise.trim() ? `Try/Fail 사이클 — ${cycle.premise.trim().slice(0, 40)}` : 'Try/Fail 사이클'
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '플롯',
      title,
      bodyHtml: bodyHtml(cycle),
      synopsis: cycle.premise.trim() || undefined,
      meta: { 단계수: String(cycle.steps.length), 목표: cycle.premise.trim() || '—' },
    })
    if (mounted.current) setFlash(id ? '프로젝트(플롯)에 문서 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const linked = hasProjectBridge()
  const points = tensionPoints(cycle)
  const yesCount = cycle.steps.filter((s) => s.outcome === 'yesBut').length
  const noCount = cycle.steps.length - yesCount

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 46, lineHeight: 1.5, fontFamily: 'inherit' }
  const card: React.CSSProperties = { padding: 12, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)', marginBottom: 12 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🎢" /></span>
        <strong style={{ fontSize: 15 }}>Try/Fail 사이클</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{cycle.steps.length}단계 · <Emoji e="🟡" />{yesCount} <Emoji e="🔴" />{noCount}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportText(cycle), '복사됨')} title="사이클 전체를 텍스트로 복사">복사</button>
        <button className="minibtn danger" onClick={resetAll} title="모든 내용을 비웁니다">초기화</button>
        <button className="btn-primary" onClick={() => addStep()}>＋ 단계 추가</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={scroll}>
        {/* 목표(전제) */}
        <div style={card}>
          <div style={label}><Emoji e="🎯" /> 주인공의 목표 (욕망)</div>
          <textarea style={area} value={cycle.premise} onChange={(e) => setCycle((c) => ({ ...c, premise: e.target.value }))} placeholder="주인공이 이루려는 것. 예: 마을을 위협하는 용을 처치한다" maxLength={300} />
        </div>

        {/* 긴장 곡선 */}
        <TensionCurve points={points} steps={cycle.steps} />

        {/* 안내 */}
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7, margin: '4px 2px 10px' }}>
          매 시도의 결과를 <b style={{ color: 'var(--warn)' }}>예, 그러나</b>(부분 성공+새 문제) 또는 <b style={{ color: 'var(--accent)' }}>아니오, 게다가</b>(실패+악화)로 정하세요.
          두 패턴이 번갈아 쌓이면 상황이 점점 꼬여 긴장이 상승합니다.
        </div>

        {/* 단계들 */}
        {cycle.steps.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '28px 16px', lineHeight: 1.7 }}>
            단계가 없습니다.<br />오른쪽 위 <b>＋ 단계 추가</b>로 첫 시도를 만들어 보세요.
          </div>
        ) : (
          cycle.steps.map((s, i) => {
            const d = outDef(s.outcome)
            const over = dragOver === s.id
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => { dragId.current = s.id }}
                onDragOver={(e) => { e.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) }}
                onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                onDrop={() => onDrop(s.id)}
                onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                style={{
                  ...card,
                  borderColor: over ? 'var(--accent)' : 'var(--border)',
                  outline: over ? '2px dashed var(--accent)' : 'none',
                  borderLeft: `4px solid ${d.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13 }} title="드래그로 순서 변경">⠿</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--accent)',
                    width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>시도 {i + 1}</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => move(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => move(s.id, 1)} disabled={i === cycle.steps.length - 1} title="아래로">▼</button>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => addStep(s.id)} title="이 아래에 단계 추가">＋</button>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmDel(s.id)} title="삭제"><Emoji e="🗑️" /></button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={label}><Emoji e="🎬" /> 시도 — 주인공이 한 행동</div>
                  <textarea style={area} value={s.attempt} onChange={(e) => setStep(s.id, { attempt: e.target.value })} placeholder="예: 정문으로 정면 돌파를 시도한다" maxLength={300} />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={label}>결과 유형</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {OUTCOMES.map((o) => {
                      const active = s.outcome === o.key
                      return (
                        <button
                          key={o.key}
                          className="minibtn"
                          onClick={() => setStep(s.id, { outcome: o.key })}
                          title={o.hint}
                          style={{
                            borderColor: active ? o.color : 'var(--border)',
                            background: active ? 'var(--chrome-2)' : undefined,
                            color: active ? o.color : 'var(--text)',
                            fontWeight: active ? 700 : 400,
                          }}
                        ><Emoji e={o.icon} /> {o.label}</button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}><Emoji e={d.icon} /> {d.hint}</div>
                </div>

                <div>
                  <div style={label}><Emoji e={d.icon} /> 결과 — “{d.connector}…”로 이어지는 전개</div>
                  <textarea
                    style={area}
                    value={s.result}
                    onChange={(e) => setStep(s.id, { result: e.target.value })}
                    placeholder={s.outcome === 'yesBut'
                      ? '예: 문은 열렸으나, 경보가 울려 적들이 몰려온다'
                      : '예: 문은 잠겨 있고, 게다가 함정이 작동해 부상을 입는다'}
                    maxLength={300}
                  />
                </div>

                {confirmDel === s.id && (
                  <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 12 }}>
                    <div style={{ marginBottom: 6, color: 'var(--warn)' }}>이 단계를 삭제할까요?</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" style={{ padding: '3px 9px', fontSize: 11, background: 'var(--warn)' }} onClick={() => removeStep(s.id)}>삭제</button>
                      <button className="minibtn" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* 해결 + 교훈 */}
        <div style={{ ...card, borderLeft: '4px solid var(--ok)' }}>
          <div style={label}><Emoji e="🏁" /> 해결 (클라이맥스) — 마지막 시도가 어떻게 결판나는가</div>
          <textarea style={area} value={cycle.resolution} onChange={(e) => setCycle((c) => ({ ...c, resolution: e.target.value }))} placeholder="누적된 압박을 뚫고(또는 무너지며) 목표가 어떻게 결말나는지. 예: 약점을 깨닫고 용의 둥지를 무너뜨린다" maxLength={400} />
        </div>
        <div style={card}>
          <div style={label}><Emoji e="💡" /> 교훈 / 변화 (선택)</div>
          <textarea style={area} value={cycle.lesson} onChange={(e) => setCycle((c) => ({ ...c, lesson: e.target.value }))} placeholder="이 여정으로 주인공은 무엇을 깨닫거나 어떻게 변했는가" maxLength={300} />
        </div>

        {/* 프로젝트 연계 */}
        <div className="linkbar" style={{ marginTop: 6, marginBottom: 8 }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!linked}
            title={linked ? '이 사이클을 프로젝트 원고(플롯 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={() => copyText(exportText(cycle), '복사됨')} title="텍스트로 복사"><Emoji e="📋" /> 텍스트 복사</button>
        </div>

        {/* 저작권/출처 표기 — 텍스트/구조는 사용자 창작물, 작법 개념은 공개 지식 */}
        <div className="license-note" style={{ marginTop: 4, lineHeight: 1.6 }}>
          입력한 내용은 모두 사용자 창작물입니다. ‘예, 그러나 / 아니오, 게다가’는 널리 공유된 공개 작법 개념(Public Domain)으로, 외부 데이터·이미지를 사용하지 않습니다.
        </div>
      </div>
    </div>
  )
}

// ── 긴장 상승 곡선(SVG) — 단계 누적 점수를 꺾은선으로(상승 곡선 시각화) ──
function TensionCurve({ points, steps }: { points: number[]; steps: Step[] }) {
  if (points.length === 0) return null
  const W = 100, H = 100, padX = 4, padY = 8
  const maxT = Math.max(1, points[points.length - 1])
  const n = points.length
  const xAt = (i: number) => (n === 1 ? W / 2 : padX + (i / (n - 1)) * (W - padX * 2))
  const yAt = (t: number) => H - padY - (t / maxT) * (H - padY * 2)
  const coords = points.map((t, i) => ({ x: xAt(i), y: yAt(t) }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${H - padY} L ${coords[0].x.toFixed(1)} ${H - padY} Z`

  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}><Emoji e="📈" /> 긴장 상승 곡선 (단계 누적)</div>
      <div style={{ position: 'relative', width: '100%', height: 90 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          <path d={areaPath} fill="var(--accent)" opacity={0.12} />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {coords.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={2.4} fill={outDef(steps[i].outcome).color} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
        <span>시작</span>
        <span>{steps.length}단계 진행 →</span>
        <span>클라이맥스</span>
      </div>
    </div>
  )
}
