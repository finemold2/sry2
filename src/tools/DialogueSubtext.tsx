// 대사 서브텍스트 빌더 — 표면 대사(겉으로 하는 말)와 속마음(서브텍스트, 진짜 의도)을 쌍으로 작성해
// "말과 진심의 간극"을 의식적으로 설계한다. 한 장면의 대사 쌍을 추가·수정·삭제·순서 변경하며,
// 각 쌍에 화자·전술(어떻게 돌려 말하는가)·간극 메모를 붙인다. 내장 예시로 빠르게 감을 잡는다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:dialogue-subtext' 자동 저장/복원.
// 연계(linkbus): 작성한 대사/서브텍스트 표를 프로젝트 자료('research')의 '대사' 폴더에 문서로 추가하고,
//               전체를 공유 스니펫으로도 저장한다.
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'dialogue-subtext', name: '대사 서브텍스트 빌더', icon: '🎭', group: '구상·정리', intro: '표면 대사와 속마음을 쌍으로 써서 말과 진심의 간극을 설계하세요', w: 640, h: 580 }

// 서브텍스트 전술 — 진심을 직접 말하지 않고 돌려 표현하는 방식.
interface Tactic { key: string; label: string; icon: string; hint: string }
const TACTICS: Tactic[] = [
  { key: 'evade', label: '회피', icon: '🌫️', hint: '핵심을 비켜 다른 말로 덮는다 (화제 돌리기·딴청)' },
  { key: 'mask', label: '가면', icon: '🙂', hint: '반대 감정을 연기한다 (괜찮은 척·웃으며 분노)' },
  { key: 'test', label: '떠보기', icon: '🎣', hint: '상대 속을 떠보려 일부러 던지는 말' },
  { key: 'attack', label: '에둘러 공격', icon: '🗡️', hint: '칭찬·농담·질문에 가시를 숨긴다 (비꼼·돌려까기)' },
  { key: 'plead', label: '에둘러 호소', icon: '🥺', hint: '직접 부탁 못 하고 빙 돌려 도움·애정을 구한다' },
  { key: 'control', label: '통제', icon: '♟️', hint: '겉은 부드럽게, 실제로는 상대를 움직이려 한다' },
  { key: 'confess', label: '새어나옴', icon: '💧', hint: '숨기려다 진심이 말실수·침묵으로 새어나온다' },
  { key: 'none', label: '직설', icon: '➡️', hint: '말과 진심이 거의 일치 — 간극이 작은 대사' },
]
function tacticDef(k: string): Tactic { return TACTICS.find((t) => t.key === k) || TACTICS[0] }

interface Pair {
  id: string
  speaker: string   // 화자
  surface: string   // 표면 대사 (겉으로 하는 말)
  subtext: string   // 속마음 (서브텍스트, 진짜 의도)
  tactic: string    // 전술
  gap: string       // 간극 메모 (왜 이렇게 말하는가)
}

// 내장 예시 — 클릭하면 새 쌍으로 채워 감을 잡게 한다.
const EXAMPLES: Omit<Pair, 'id'>[] = [
  { speaker: '연인', surface: '늦었네. 밥은 먹었어?', subtext: '왜 연락도 없이 늦었어. 걱정했고 서운해.', tactic: 'mask', gap: '서운함을 챙김으로 포장 — 다툼이 두려워 본심을 숨긴다.' },
  { speaker: '부장', surface: '자네라면 충분히 더 할 수 있을 텐데.', subtext: '이 정도로는 부족해. 다시 해.', tactic: 'attack', gap: '질책을 격려처럼 — 직접 비난 대신 압박을 넣는다.' },
  { speaker: '아들', surface: '됐어, 나 혼자 해도 돼.', subtext: '사실은 도와줬으면 좋겠어. 먼저 손 내밀어 줘.', tactic: 'plead', gap: '자존심 때문에 거절로 호소 — 반대로 말한다.' },
  { speaker: '용의자', surface: '그 시간엔 집에 있었습니다, 형사님.', subtext: '들키면 끝이다. 표정 관리해야 해.', tactic: 'mask', gap: '평정을 연기 — 떨림을 들키지 않으려 또박또박 말한다.' },
]

const LS_KEY = 'sry:tool:dialogue-subtext'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyPair(): Pair {
  return { id: newId(), speaker: '', surface: '', subtext: '', tactic: 'mask', gap: '' }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { scene: string; list: Pair[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { scene: '', list: [] }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Pair[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      speaker: String(x.speaker || ''),
      surface: String(x.surface || ''),
      subtext: String(x.subtext || ''),
      tactic: TACTICS.some((t) => t.key === x.tactic) ? String(x.tactic) : 'mask',
      gap: String(x.gap || ''),
    }))
    return { scene: typeof p?.scene === 'string' ? p.scene : '', list }
  } catch { return { scene: '', list: [] } }
}

// 텍스트 내보내기용 한 쌍 직렬화.
function pairToText(p: Pair, i: number): string {
  const t = tacticDef(p.tactic)
  const who = p.speaker.trim() || '인물'
  const lines = [
    `${i + 1}. [${who}] ${t.icon} ${t.label}`,
    `   말  : ${p.surface.trim() || '—'}`,
    `   진심: ${p.subtext.trim() || '—'}`,
  ]
  if (p.gap.trim()) lines.push(`   간극: ${p.gap.trim()}`)
  return lines.join('\n')
}

export default function DialogueSubtext({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [scene, setScene] = useState(init.current.scene)
  const [list, setList] = useState<Pair[]>(init.current.list)
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 받은 초기 텍스트(예: 다른 도구에서 대사 전달) → 첫 쌍 표면 대사로.
  useEffect(() => {
    if (!payload) return
    const seed = typeof payload.surface === 'string' ? payload.surface
      : typeof payload.text === 'string' ? payload.text : ''
    if (seed.trim() && list.length === 0) {
      setList([{ ...emptyPair(), surface: seed.trim() }])
    }
    // 의도적으로 mount 시 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scene, list })) }
    catch { if (mounted.current) setFlash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [scene, list])

  // 안내 메시지 자동 소거.
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
    return () => window.clearTimeout(t)
  }, [flash])

  const addPair = () => setList((prev) => [...prev, emptyPair()])
  const addExample = (ex: Omit<Pair, 'id'>) => setList((prev) => [...prev, { ...ex, id: newId() }])

  const setField = (id: string, k: keyof Pair, v: string) =>
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, [k]: v } : p)))

  const remove = (id: string) => {
    setList((prev) => prev.filter((p) => p.id !== id))
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경 (HTML5 DnD — 전역 포인터 리스너 없음, 안전).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((p) => p.id === from)
      const ti = prev.findIndex((p) => p.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // 채워진(표면 또는 진심이 있는) 쌍만 산출물에 포함.
  const filled = list.filter((p) => p.surface.trim() || p.subtext.trim())

  const exportText = (): string => {
    const head = scene.trim() ? `# ${scene.trim()}\n\n` : ''
    return head + filled.map(pairToText).join('\n\n')
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

  // 프로젝트 '대사 서브텍스트' 문서 본문(HTML) — 표(겉말 vs 진심) 형태.
  const bodyHtml = (): string => {
    const dash = '<span style="color:#888">—</span>'
    const cell = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
    const th = 'padding:6px 8px;border:1px solid #ccc;text-align:left;background:#f2f2f2;font-size:13px'
    const td = 'padding:6px 8px;border:1px solid #ccc;vertical-align:top;font-size:13px'
    const rows = filled.map((p) => {
      const t = tacticDef(p.tactic)
      return `<tr>
<td style="${td}">${cell(p.speaker)}</td>
<td style="${td}">${cell(p.surface)}</td>
<td style="${td}">${cell(p.subtext)}</td>
<td style="${td}">${t.icon} ${escHtml(t.label)}</td>
<td style="${td}">${cell(p.gap)}</td>
</tr>`
    }).join('')
    return `<table style="border-collapse:collapse;width:100%">
<thead><tr>
<th style="${th}">화자</th><th style="${th}">표면 대사(겉말)</th><th style="${th}">속마음(서브텍스트)</th><th style="${th}">전술</th><th style="${th}">간극 메모</th>
</tr></thead>
<tbody>${rows}</tbody></table>`
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되지 않았습니다'); return }
    if (filled.length === 0) { setFlash('내보낼 대사가 없어요'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '대사',
      title: scene.trim() ? `대사 서브텍스트 — ${scene.trim()}` : '대사 서브텍스트',
      bodyHtml: bodyHtml(),
      synopsis: `대사 쌍 ${filled.length}개 — 말과 진심의 간극 설계`,
      meta: { 대사쌍: String(filled.length), 장면: scene.trim() || '—' },
    })
    setFlash(id ? '프로젝트 자료에 대사 문서 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const toSnippet = () => {
    if (filled.length === 0) { setFlash('저장할 대사가 없어요'); return }
    addToLibrary('snippets', { text: exportText(), source: '대사 서브텍스트 빌더', tags: ['대사', '서브텍스트', ...(scene.trim() ? [scene.trim()] : [])] })
    setFlash('스니펫으로 저장됨')
  }

  const linked = hasProjectBridge()

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 46, lineHeight: 1.5, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🎭"/></span>
        <strong style={{ fontSize: 15 }}>대사 서브텍스트 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filled.length}/{list.length} 쌍</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportText(), '전체 복사됨')} disabled={filled.length === 0} title="대사 쌍 전체를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={addPair}>＋ 대사 쌍</button>
      </div>

      <div style={scroll}>
        {/* 장면 제목 */}
        <div style={{ marginBottom: 14 }}>
          <div style={label}><Emoji e="🎬"/> 장면 (선택)</div>
          <input style={input} value={scene} onChange={(e) => setScene(e.target.value)} placeholder="이 대사들이 오가는 장면. 예: 비 오는 날 현관에서의 재회" maxLength={100} />
        </div>

        {/* 안내 + 예시 */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text)', marginBottom: 8 }}>
            인물은 진심을 그대로 말하지 않습니다. <b>표면 대사</b>(겉으로 하는 말)와 <b>속마음</b>(진짜 의도)을 따로 적어
            그 <b>간극</b>을 의식적으로 키우면 대사에 긴장과 깊이가 생깁니다.
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>예시로 시작하기 ↓</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="minibtn" onClick={() => addExample(ex)} title={`${ex.surface}\n→ ${ex.subtext}`} style={{ fontSize: 11 }}>
                <Emoji e={tacticDef(ex.tactic).icon}/> {ex.speaker}: “{ex.surface.length > 14 ? ex.surface.slice(0, 14) + '…' : ex.surface}”
              </button>
            ))}
          </div>
        </div>

        {/* 대사 쌍 목록 */}
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '32px 16px' }}>
            아직 대사 쌍이 없어요.<br />
            위 <b>예시</b>를 누르거나 오른쪽 위 <b>＋ 대사 쌍</b>으로 시작하세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((p, i) => {
              const t = tacticDef(p.tactic)
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => { dragId.current = p.id }}
                  onDragOver={(e) => { e.preventDefault(); if (dragOver !== p.id) setDragOver(p.id) }}
                  onDragLeave={() => { if (dragOver === p.id) setDragOver(null) }}
                  onDrop={() => onDrop(p.id)}
                  onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                  style={{
                    border: '1px solid var(--border)',
                    outline: dragOver === p.id ? '2px dashed var(--accent)' : 'none',
                    background: 'var(--panel)', borderRadius: 11, padding: 12,
                  }}
                >
                  {/* 쌍 헤더: 핸들·번호·화자·이동·삭제 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13 }} title="드래그로 순서 변경">⠿</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, minWidth: 18 }}>#{i + 1}</span>
                    <input
                      style={{ ...input, padding: '5px 8px', fontSize: 13, maxWidth: 180 }}
                      value={p.speaker}
                      onChange={(e) => setField(p.id, 'speaker', e.target.value)}
                      placeholder="화자 (예: 도윤)"
                      maxLength={40}
                    />
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, -1)} disabled={i === 0} title="위로">▲</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, 1)} disabled={i === list.length - 1} title="아래로">▼</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmDel(p.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>

                  {confirmDel === p.id && (
                    <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 12 }}>
                      <span style={{ color: 'var(--warn)', marginRight: 8 }}>이 대사 쌍을 삭제할까요?</span>
                      <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={() => remove(p.id)}>삭제</button>
                      <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11, marginLeft: 5 }} onClick={() => setConfirmDel(null)}>취소</button>
                    </div>
                  )}

                  {/* 표면 대사 ↔ 속마음 (간극 시각화) */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ ...label, color: 'var(--accent)' }}><Emoji e="💬"/> 표면 대사 — 겉으로 하는 말</div>
                      <textarea style={area} value={p.surface} onChange={(e) => setField(p.id, 'surface', e.target.value)} placeholder='실제로 입 밖에 내는 말. 예: "괜찮아, 신경 쓰지 마."' maxLength={400} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 18, alignSelf: 'center' }} title="말과 진심의 간극">↕</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ ...label, color: 'var(--warn)' }}><Emoji e="🧠"/> 속마음 — 진짜 의도(서브텍스트)</div>
                      <textarea style={area} value={p.subtext} onChange={(e) => setField(p.id, 'subtext', e.target.value)} placeholder='입 밖에 내지 않는 진심. 예: "사실은 네가 알아채 주길 바라."' maxLength={400} />
                    </div>
                  </div>

                  {/* 전술 선택 */}
                  <div style={{ marginTop: 10 }}>
                    <div style={label}><Emoji e="🎚️"/> 전술 — 진심을 어떻게 돌려 말하는가</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {TACTICS.map((tc) => (
                        <button
                          key={tc.key}
                          className={'minibtn' + (p.tactic === tc.key ? ' active' : '')}
                          onClick={() => setField(p.id, 'tactic', tc.key)}
                          style={{ fontSize: 11, padding: '3px 8px', borderColor: p.tactic === tc.key ? 'var(--accent)' : 'var(--border)', background: p.tactic === tc.key ? 'var(--chrome-2)' : undefined }}
                          title={tc.hint}
                        ><Emoji e={tc.icon}/> {tc.label}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}><Emoji e={t.icon}/> {t.label}: {t.hint}</div>
                  </div>

                  {/* 간극 메모 */}
                  <div style={{ marginTop: 10 }}>
                    <div style={label}><Emoji e="↔️"/> 간극 메모 (선택) — 왜 진심을 그대로 말하지 못하는가</div>
                    <textarea style={{ ...area, minHeight: 38 }} value={p.gap} onChange={(e) => setField(p.id, 'gap', e.target.value)} placeholder="이 인물이 본심을 숨기는 이유·두려움·관계 맥락" maxLength={300} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 연계 */}
        <div className="linkbar" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <span className="linkbar-label">연계:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!linked || filled.length === 0}
            title={!linked ? '프로젝트에 연결되어 있지 않습니다' : filled.length === 0 ? '내보낼 대사가 없습니다' : '대사/서브텍스트 표를 프로젝트 자료(대사 폴더)에 추가'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
          <button
            className="linkbtn"
            onClick={toSnippet}
            disabled={filled.length === 0}
            title={filled.length === 0 ? '저장할 대사가 없습니다' : '전체 대사 쌍을 공유 스니펫으로 저장'}
          ><Emoji e="📌"/> 스니펫으로 저장</button>
        </div>

        <div className="license-note" style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          예시·전술 분류는 일반적 작법 개념으로 본 도구가 직접 작성했습니다(자작/오픈). 모든 입력과 산출물은 이 브라우저에만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
