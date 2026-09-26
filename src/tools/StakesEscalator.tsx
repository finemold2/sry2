// 위험 상승 설계기(Stakes Escalator) — "실패하면 잃는 것"을 단계별로 점증 설계한다.
// 개인 → 관계 → 공동체 → 세계처럼 영향 범위가 넓어질수록 판돈(stakes)이 커지도록,
// 각 단계마다 (촉발 사건 / 위험에 처한 것 / 실패의 대가 / 시한·압박)을 기록하고 순서를 조정한다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:stakes-escalator' 자동 저장/복원.
// 연계(linkbus): 설계한 상승 곡선을 실제 프로젝트 자료('research')/'플롯' 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'stakes-escalator', name: '위험 상승 설계기', icon: '📈', group: '구상·정리', intro: '개인→관계→공동체→세계로 "실패하면 잃는 것"을 단계별로 키워보세요', w: 660, h: 580 }

// 영향 범위(scope) — 작을수록 사적, 클수록 세계적. 정렬·라벨·색조 기준.
type Scope = 'self' | 'relation' | 'community' | 'world' | 'cosmic'
interface ScopeDef { key: Scope; label: string; icon: string; hint: string; rank: number }
const SCOPES: ScopeDef[] = [
  { key: 'self', label: '개인', icon: '🧍', hint: '인물 자신의 목숨·명예·정체성·꿈', rank: 1 },
  { key: 'relation', label: '관계', icon: '👥', hint: '가족·연인·친구·동료 등 가까운 사람들', rank: 2 },
  { key: 'community', label: '공동체', icon: '🏘️', hint: '마을·조직·도시·집단의 안위', rank: 3 },
  { key: 'world', label: '세계', icon: '🌍', hint: '국가·문명·인류 전체의 운명', rank: 4 },
  { key: 'cosmic', label: '우주·차원', icon: '🌌', hint: '시간·차원·존재 자체 등 그 이상의 판돈', rank: 5 },
]
function scopeDef(s: Scope): ScopeDef { return SCOPES.find((x) => x.key === s) || SCOPES[0] }
const SCOPE_KEYS: Scope[] = SCOPES.map((s) => s.key)

interface Stage {
  id: string
  scope: Scope
  trigger: string   // 이 단계로 끌어올리는 촉발 사건/전환점
  atRisk: string    // 이 단계에서 위험에 처한 것(걸린 가치)
  cost: string      // 실패하면 잃는 것(구체적 대가)
  pressure: string  // 시한·압박(데드라인, 추격, 카운트다운 등)
}

interface Doc {
  premise: string   // 전체 이야기/인물의 핵심 욕망(상승의 출발점)
  stages: Stage[]
  notes: string
}

const LS_KEY = 'sry:tool:stakes-escalator'
const MAX_STAGES = 12

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 다음 추가할 단계의 기본 범위 — 마지막 단계보다 한 칸 넓게(최대 cosmic).
function nextScope(stages: Stage[]): Scope {
  if (stages.length === 0) return 'self'
  const last = scopeDef(stages[stages.length - 1].scope).rank
  const found = SCOPES.find((s) => s.rank === Math.min(last + 1, SCOPES.length))
  return (found || SCOPES[SCOPES.length - 1]).key
}

function makeStage(scope: Scope): Stage {
  return { id: newId(), scope, trigger: '', atRisk: '', cost: '', pressure: '' }
}

function emptyDoc(): Doc {
  return { premise: '', stages: [makeStage('self'), makeStage('relation')], notes: '' }
}

// 상승 단조성 점검 — 각 단계의 범위가 (느슨하게) 오름차순인지. 내려가면 경고.
function monotonicWarnings(stages: Stage[]): number[] {
  const warn: number[] = []
  for (let i = 1; i < stages.length; i++) {
    if (scopeDef(stages[i].scope).rank < scopeDef(stages[i - 1].scope).rank) warn.push(i)
  }
  return warn
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 단계 한 줄 요약.
function stageLine(st: Stage, idx: number): string {
  const d = scopeDef(st.scope)
  const cost = st.cost.trim() || '무언가'
  return `${idx + 1}. [${d.label}] 실패하면 ${cost.replace(/[.。]$/, '')}을(를) 잃는다`
}

// 프로젝트 문서 본문(HTML) — 전제 + 단계별 상승 표 + 메모.
function buildBodyHtml(doc: Doc): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const parts: string[] = []
  if (doc.premise.trim()) parts.push(`<p><b>전제 / 핵심 욕망:</b> ${escHtml(doc.premise.trim())}</p>`)
  parts.push('<p><b>위험 상승 곡선</b></p>')
  doc.stages.forEach((st, i) => {
    const d = scopeDef(st.scope)
    parts.push(
      `<p><b>${i + 1}. ${d.icon} ${escHtml(d.label)}</b></p>` +
      `<p>· 촉발: ${v(st.trigger)}<br>` +
      `· 위험에 처한 것: ${v(st.atRisk)}<br>` +
      `· 실패의 대가: ${v(st.cost)}<br>` +
      `· 시한·압박: ${v(st.pressure)}</p>`,
    )
  })
  if (doc.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${escHtml(doc.notes.trim())}</p>`)
  return parts.join('')
}

// 텍스트 내보내기.
function buildText(doc: Doc): string {
  const lines: string[] = ['# 위험 상승 설계']
  if (doc.premise.trim()) lines.push('', `전제/핵심 욕망: ${doc.premise.trim()}`)
  lines.push('')
  doc.stages.forEach((st, i) => {
    const d = scopeDef(st.scope)
    lines.push(`【${i + 1}】 ${d.icon} ${d.label}`)
    lines.push(`  · 촉발: ${st.trigger.trim() || '—'}`)
    lines.push(`  · 위험에 처한 것: ${st.atRisk.trim() || '—'}`)
    lines.push(`  · 실패의 대가: ${st.cost.trim() || '—'}`)
    lines.push(`  · 시한·압박: ${st.pressure.trim() || '—'}`)
    lines.push('')
  })
  lines.push('— 상승 요약 —')
  doc.stages.forEach((st, i) => lines.push(stageLine(st, i)))
  if (doc.notes.trim()) lines.push('', `메모: ${doc.notes.trim()}`)
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadDoc(): Doc {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyDoc()
    const p = JSON.parse(raw)
    const rawStages = Array.isArray(p?.stages) ? p.stages : []
    const stages: Stage[] = rawStages
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        id: String(x.id || newId()),
        scope: (SCOPE_KEYS.includes(x.scope) ? x.scope : 'self') as Scope,
        trigger: String(x.trigger || ''),
        atRisk: String(x.atRisk || ''),
        cost: String(x.cost || ''),
        pressure: String(x.pressure || ''),
      }))
    return {
      premise: String(p?.premise || ''),
      stages: stages.length ? stages : emptyDoc().stages,
      notes: String(p?.notes || ''),
    }
  } catch { return emptyDoc() }
}

export default function StakesEscalator({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadDoc())
  const [doc, setDoc] = useState<Doc>(init.current)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const payloadApplied = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 전제가 전달되면(연계 열기) 비어 있을 때 한 번 채운다.
  useEffect(() => {
    if (payloadApplied.current || !payload) return
    payloadApplied.current = true
    const p = (payload.premise ?? payload.desire ?? payload.title) as unknown
    if (typeof p === 'string' && p.trim()) {
      setDoc((d) => (d.premise.trim() ? d : { ...d, premise: p.trim() }))
    }
  }, [payload])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(doc)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [doc])

  // 안내 토스트 자동 소거.
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
    return () => window.clearTimeout(t)
  }, [flash])

  const setStage = (id: string, patch: Partial<Stage>) =>
    setDoc((d) => ({ ...d, stages: d.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  const addStage = () => {
    setDoc((d) => {
      if (d.stages.length >= MAX_STAGES) return d
      return { ...d, stages: [...d.stages, makeStage(nextScope(d.stages))] }
    })
  }

  const removeStage = (id: string) =>
    setDoc((d) => (d.stages.length <= 1 ? d : { ...d, stages: d.stages.filter((s) => s.id !== id) }))

  const move = (id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const i = d.stages.findIndex((s) => s.id === id)
      if (i < 0) return d
      const j = i + dir
      if (j < 0 || j >= d.stages.length) return d
      const next = d.stages.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, stages: next }
    })
  }

  // 드래그 순서 변경 (HTML5 DnD — 전역 포인터 리스너 없음, 안전).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setDoc((d) => {
      const fi = d.stages.findIndex((s) => s.id === from)
      const ti = d.stages.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return d
      const next = d.stages.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return { ...d, stages: next }
    })
  }

  // 범위 기준 자동 정렬(상승 순서로 재배치).
  const sortByScope = () =>
    setDoc((d) => ({ ...d, stages: d.stages.slice().sort((a, b) => scopeDef(a.scope).rank - scopeDef(b.scope).rank) }))

  const resetAll = () => { setDoc(emptyDoc()); setConfirmReset(false); setFlash('초기화했어요') }

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

  // 프로젝트 연동 — 위험 상승 문서를 자료(research)/'플롯' 폴더에 추가.
  const linked = hasProjectBridge()
  const toProject = () => {
    if (!linked) { if (mounted.current) setFlash('프로젝트에 연결되지 않았습니다'); return }
    const top = doc.stages.length ? scopeDef(doc.stages[doc.stages.length - 1].scope).label : '—'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: '위험 상승 설계',
      bodyHtml: buildBodyHtml(doc),
      synopsis: doc.premise.trim() || `${doc.stages.length}단계 위험 상승 (최종: ${top})`,
      meta: { 단계수: String(doc.stages.length), 최종범위: top },
    })
    if (mounted.current) setFlash(id ? '프로젝트 자료에 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const warnings = monotonicWarnings(doc.stages)
  const isEmpty = doc.stages.every((s) => !s.trigger.trim() && !s.atRisk.trim() && !s.cost.trim() && !s.pressure.trim()) && !doc.premise.trim()

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 44, lineHeight: 1.5, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="📈" /></span>
        <strong style={{ fontSize: 15 }}>위험 상승 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{doc.stages.length}단계</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={sortByScope} title="범위(개인→세계) 순으로 재정렬" disabled={doc.stages.length < 2}>↕ 자동 정렬</button>
        <button className="minibtn" onClick={() => copyText(buildText(doc), '전체 복사됨')} disabled={isEmpty} title="전체를 텍스트로 복사">내보내기</button>
        <button className="minibtn" onClick={() => setConfirmReset(true)} disabled={isEmpty} title="모두 지우기" style={{ color: 'var(--warn)' }}>초기화</button>
        <button className="btn-primary" onClick={addStage} disabled={doc.stages.length >= MAX_STAGES} title={doc.stages.length >= MAX_STAGES ? '최대 단계 수에 도달했어요' : '단계 추가'}>＋ 단계 추가</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {confirmReset && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--warn)' }}>
          <span>모든 단계와 내용을 지울까요?</span>
          <span style={{ flex: 1 }} />
          <button className="btn-primary" style={{ background: 'var(--warn)', padding: '3px 10px', fontSize: 12 }} onClick={resetAll}>지우기</button>
          <button className="minibtn" onClick={() => setConfirmReset(false)}>취소</button>
        </div>
      )}

      <div style={scroll}>
        {/* 전제 / 핵심 욕망 */}
        <div style={{ marginBottom: 14 }}>
          <div style={label}><Emoji e="🎯" /> 전제 · 핵심 욕망 (상승의 출발점)</div>
          <input
            style={input}
            value={doc.premise}
            onChange={(e) => setDoc((d) => ({ ...d, premise: e.target.value }))}
            placeholder="예: 도윤은 사라진 동생을 찾으려 한다"
            maxLength={160}
          />
        </div>

        {warnings.length > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--warn)' }}>
            <Emoji e="⚠️" /> {warnings.map((i) => i + 1).join(', ')}단계에서 영향 범위가 앞 단계보다 좁아져요.
            긴장이 오히려 떨어질 수 있어요 — 순서를 바꾸거나 <b>자동 정렬</b>로 점검해 보세요.
          </div>
        )}

        {/* 단계 카드들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {doc.stages.map((st, i) => {
            const d = scopeDef(st.scope)
            const isWarn = warnings.includes(i)
            const filled = scopeDef(st.scope).rank
            return (
              <div
                key={st.id}
                draggable
                onDragStart={() => { dragId.current = st.id }}
                onDragOver={(e) => { e.preventDefault(); if (dragOver !== st.id) setDragOver(st.id) }}
                onDragLeave={() => { if (dragOver === st.id) setDragOver(null) }}
                onDrop={() => onDrop(st.id)}
                onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                style={{
                  border: '1px solid ' + (isWarn ? 'var(--warn)' : 'var(--border)'),
                  outline: dragOver === st.id ? '2px dashed var(--accent)' : 'none',
                  borderRadius: 11, padding: 12, background: 'var(--panel)',
                }}
              >
                {/* 카드 헤더: 번호 · 범위 선택 · 이동/삭제 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span title="드래그로 순서 변경" style={{ cursor: 'grab', color: 'var(--muted)' }}>⠿</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                    background: 'var(--accent)', color: '#fff', flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}><Emoji e={d.icon} /> {d.label}</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 12 }} onClick={() => move(st.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 12 }} onClick={() => move(st.id, 1)} disabled={i === doc.stages.length - 1} title="아래로">▼</button>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 12, color: 'var(--warn)' }} onClick={() => removeStage(st.id)} disabled={doc.stages.length <= 1} title={doc.stages.length <= 1 ? '최소 한 단계는 있어야 해요' : '이 단계 삭제'}><Emoji e="🗑️" /></button>
                </div>

                {/* 범위 선택 (영향 범위 = 판돈 크기) */}
                <div style={{ marginBottom: 10 }}>
                  <div style={label}>영향 범위 (넓을수록 판돈이 큼)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SCOPES.map((sc) => {
                      const on = sc.key === st.scope
                      return (
                        <button
                          key={sc.key}
                          className={'minibtn' + (on ? ' active' : '')}
                          onClick={() => setStage(st.id, { scope: sc.key })}
                          title={sc.hint}
                          style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined }}
                        ><Emoji e={sc.icon} /> {sc.label}</button>
                      )
                    })}
                  </div>
                  {/* 상승 막대 — 범위 등급 시각화 */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                    {SCOPES.map((sc) => (
                      <span key={sc.key} style={{
                        flex: 1, height: 5, borderRadius: 3,
                        background: sc.rank <= filled ? 'var(--accent)' : 'var(--border)',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}><Emoji e={d.icon} /> {d.label}: {d.hint}</div>
                </div>

                {/* 4개 입력: 촉발 / 위험에 처한 것 / 실패의 대가 / 시한·압박 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div>
                    <div style={label}><Emoji e="⚡" /> 촉발 사건 (이 단계로 끌어올리는 전환점)</div>
                    <textarea style={area} value={st.trigger} onChange={(e) => setStage(st.id, { trigger: e.target.value })} placeholder="무엇이 판돈을 키우는가? 예: 협박범이 가족까지 노리기 시작한다" maxLength={300} />
                  </div>
                  <div>
                    <div style={label}><Emoji e="🛡️" /> 위험에 처한 것 (지금 걸린 가치)</div>
                    <textarea style={area} value={st.atRisk} onChange={(e) => setStage(st.id, { atRisk: e.target.value })} placeholder="이 단계에서 지켜야 할 것. 예: 가족의 안전" maxLength={300} />
                  </div>
                  <div>
                    <div style={label}><Emoji e="💥" /> 실패하면 잃는 것 (구체적 대가)</div>
                    <textarea style={area} value={st.cost} onChange={(e) => setStage(st.id, { cost: e.target.value })} placeholder="되돌릴 수 없는 손실. 예: 동생의 목숨" maxLength={300} />
                  </div>
                  <div>
                    <div style={label}><Emoji e="⏳" /> 시한 · 압박 (선택)</div>
                    <textarea style={area} value={st.pressure} onChange={(e) => setStage(st.id, { pressure: e.target.value })} placeholder="데드라인·추격·카운트다운 등. 예: 자정까지 몸값 전달" maxLength={300} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 메모 */}
        <div style={{ marginTop: 14 }}>
          <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
          <textarea
            style={area}
            value={doc.notes}
            onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))}
            placeholder="반전, 가짜 안도감, 최저점, 마지막 판돈 등을 메모하세요"
            maxLength={600}
          />
        </div>

        {/* 도움말 + 연계 */}
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          위로 갈수록 영향 범위가 넓어지도록(개인→관계→공동체→세계) 배치하면 긴장이 자연스럽게 상승합니다.
          단, 마지막엔 다시 <b>개인적인 것</b>으로 좁혀 감정의 무게를 더하는 변주도 좋습니다.
        </div>

        <div className="linkbar" style={{ marginTop: 14 }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!linked}
            title={linked ? '위험 상승 곡선을 프로젝트 자료(플롯 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>

        <div className="license-note" style={{ marginTop: 12, fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          이 도구는 자체 제작 글쓰기 보조 양식입니다. 외부 저작물을 포함하지 않으며, 입력한 내용은 이 브라우저에만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
