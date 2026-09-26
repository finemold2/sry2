// 갈등 설계기 — 인물의 욕망 + 장애물(유형) + 이해관계(위기에 걸린 것)로 갈등을 구조화하고
// 한 줄 요약을 자동 생성, 갈등 강화 질문 체크리스트로 압박을 점검한다. 여러 갈등을 저장·수정·삭제·순서 변경.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:conflict-builder' 에 자동 저장/복원.
// 연계(linkbus): 설계한 갈등을 실제 프로젝트 자료('research')에 '갈등 설계' 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'conflict-builder', name: '갈등 설계기', icon: '⚔️', group: '구상·정리', intro: '욕망·장애물·이해관계로 갈등을 설계하고 강화 질문으로 점검하세요', w: 620, h: 560 }

type ObstacleType = 'inner' | 'interpersonal' | 'social' | 'nature' | 'fate'

interface ObTypeDef { key: ObstacleType; label: string; icon: string; hint: string; phrase: string }
const OB_TYPES: ObTypeDef[] = [
  { key: 'inner', label: '내적', icon: '🧠', hint: '인물 자신의 두려움·결함·신념·중독·트라우마', phrase: '자기 안의' },
  { key: 'interpersonal', label: '대인', icon: '🤝', hint: '다른 인물의 반대·배신·경쟁·사랑', phrase: '맞서는 사람인' },
  { key: 'social', label: '사회', icon: '🏛️', hint: '제도·관습·계급·법·여론·시대의 벽', phrase: '사회의 벽인' },
  { key: 'nature', label: '자연', icon: '🌋', hint: '재난·환경·질병·짐승·생존 조건', phrase: '자연의 힘인' },
  { key: 'fate', label: '운명', icon: '🔮', hint: '예언·저주·죽음·시간·거스를 수 없는 흐름', phrase: '거스를 수 없는' },
]
function obDef(t: ObstacleType): ObTypeDef { return OB_TYPES.find((o) => o.key === t) || OB_TYPES[0] }

// 강화 질문 체크리스트 — 갈등을 더 압박하기 위한 점검 항목.
const SHARPEN_Q: { id: string; q: string }[] = [
  { id: 'q1', q: '욕망이 인물에게 정말 절실한가? 포기하면 무엇을 잃는가?' },
  { id: 'q2', q: '장애물이 욕망만큼 강한가? 너무 쉽게 넘을 수 있진 않은가?' },
  { id: 'q3', q: '시간 제한(데드라인)을 걸어 압박을 키울 수 있는가?' },
  { id: 'q4', q: '상황이 더 나빠질 여지(악화)는 충분한가?' },
  { id: 'q5', q: '인물이 둘 다 가질 수 없는 가치 사이에서 선택해야 하는가?' },
  { id: 'q6', q: '장애물에 정당한 이유가 있어 단순한 악역이 아닌가?' },
  { id: 'q7', q: '실패의 대가가 구체적이고 되돌릴 수 없는가?' },
  { id: 'q8', q: '인물의 결함이 갈등을 스스로 악화시키는가?' },
  { id: 'q9', q: '독자가 양쪽 모두에 공감할 수 있는가?' },
  { id: 'q10', q: '이 갈등이 인물을 변화시키거나 정체를 드러내는가?' },
]

interface Conflict {
  id: string
  title: string
  character: string
  desire: string
  obstacleType: ObstacleType
  obstacle: string
  stakes: string
  checks: Record<string, boolean>
  notes: string
  createdAt: number
}

const LS_KEY = 'sry:tool:conflict-builder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Conflict {
  return { id: '', title: '', character: '', desire: '', obstacleType: 'inner', obstacle: '', stakes: '', checks: {}, notes: '', createdAt: 0 }
}

// 한 줄 갈등 요약 생성 — 입력값으로 자연스러운 한국어 문장 조립.
function summarize(c: Conflict): string {
  const who = (c.character || '주인공').trim()
  const want = (c.desire || '무언가를 원하지만').trim()
  const def = obDef(c.obstacleType)
  const ob = (c.obstacle || '장애물').trim()
  const stk = (c.stakes || '').trim()
  let s = `${who}은(는) ${want.replace(/[.。]$/, '')}을(를) 원하지만, ${def.phrase} ${ob.replace(/[.。]$/, '')}이(가) 이를 가로막는다`
  if (stk) s += `. 실패하면 ${stk.replace(/[.。]$/, '')}을(를) 잃는다`
  s += '.'
  return s
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '갈등 설계' 문서 본문(HTML) 생성 — 욕망/장애물/이해관계 + 한 줄 요약.
function conflictBodyHtml(c: Conflict): string {
  const def = obDef(c.obstacleType)
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const rows = [
    ['🎯 욕망', v(c.desire)],
    [`🧱 장애물 · ${def.icon} ${def.label}`, v(c.obstacle)],
    ['💥 이해관계 (위기에 걸린 것)', v(c.stakes)],
  ]
  const parts: string[] = []
  parts.push(`<p><b>한 줄 요약:</b> ${escHtml(summarize(c))}</p>`)
  if (c.character.trim()) parts.push(`<p>👤 인물: ${escHtml(c.character.trim())}</p>`)
  rows.forEach(([k, val]) => parts.push(`<p><b>${escHtml(k)}</b><br>${val}</p>`))
  if (c.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${escHtml(c.notes.trim())}</p>`)
  return parts.join('')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Conflict[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Conflict[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      title: String(x.title || ''),
      character: String(x.character || ''),
      desire: String(x.desire || ''),
      obstacleType: (['inner', 'interpersonal', 'social', 'nature', 'fate'].includes(x.obstacleType) ? x.obstacleType : 'inner') as ObstacleType,
      obstacle: String(x.obstacle || ''),
      stakes: String(x.stakes || ''),
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      notes: String(x.notes || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function ConflictBuilder({ payload }: { payload?: Record<string, unknown> } = {}) {
  const init = useRef(loadState())
  const [list, setList] = useState<Conflict[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Conflict | null>(null) // 폼 상태(신규/수정)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 복사 안내 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  // [연계] 갈등 리액터·장르 갈등 합성기 등이 보낸 내용으로 새 갈등 폼을 미리 채움(사용자가 확인 후 저장)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const s = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() : '')
    const has = ['title', 'character', 'desire', 'obstacle', 'stakes', 'text', 'note'].some((k) => s(k))
    if (!has) return
    setEditing({ ...emptyForm(), id: newId(), title: s('title'), character: s('character'), desire: s('desire'), obstacle: s('obstacle'), stakes: s('stakes'), notes: [s('text'), s('note')].filter(Boolean).join('\n') })
    setOpenId(null); setConfirmDel(null)
    setNote('연계로 받은 내용을 새 갈등 폼에 채웠어요. 다듬은 뒤 저장하세요.')
  }, [payload]) // eslint-disable-line
  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (c: Conflict) => { setEditing({ ...c, checks: { ...c.checks } }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.title.trim()) e.title = (e.character.trim() || '제목 없는 갈등')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((c) => c.id === e.id)
      return exists ? prev.map((c) => (c.id === e.id ? e : c)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((c) => c.id === id)
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
      const fi = prev.findIndex((c) => c.id === from)
      const ti = prev.findIndex((c) => c.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  const toggleCheck = (qid: string) => {
    if (editing) { setEditing({ ...editing, checks: { ...editing.checks, [qid]: !editing.checks[qid] } }); return }
    if (!openId) return
    setList((prev) => prev.map((c) => (c.id === openId ? { ...c, checks: { ...c.checks, [qid]: !c.checks[qid] } } : c)))
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setCopied(label) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setCopied('복사 실패') }
  }

  const exportOne = (c: Conflict): string => {
    const def = obDef(c.obstacleType)
    const checked = SHARPEN_Q.filter((q) => c.checks[q.id])
    const lines = [
      `# ${c.title}`,
      '',
      `요약: ${summarize(c)}`,
      '',
      `· 인물: ${c.character || '—'}`,
      `· 욕망: ${c.desire || '—'}`,
      `· 장애물(${def.icon} ${def.label}): ${c.obstacle || '—'}`,
      `· 이해관계(걸린 것): ${c.stakes || '—'}`,
    ]
    if (c.notes.trim()) { lines.push('', `메모: ${c.notes.trim()}`) }
    lines.push('', `강화 점검: ${checked.length}/${SHARPEN_Q.length}`)
    checked.forEach((q) => lines.push(`  [v] ${q.q}`))
    return lines.join('\n')
  }
  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // 프로젝트 연동 — '갈등 설계' 문서를 자료(research)/'갈등' 폴더에 추가.
  const toProject = (c: Conflict) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '갈등',
      title: c.title?.trim() ? `갈등 설계 — ${c.title.trim()}` : '갈등 설계',
      bodyHtml: conflictBodyHtml(c),
      synopsis: summarize(c),
      meta: { 인물: c.character.trim() || '—', 장애물유형: obDef(c.obstacleType).label },
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료에 갈등 문서 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((c) => c.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 52, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 12 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️" /></span>
        <strong style={{ fontSize: 15 }}>갈등 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 저장됨</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 갈등을 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 갈등</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 저장 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 저장된 갈등이 없어요.<br />오른쪽 위 <b>＋ 새 갈등</b>으로<br />첫 갈등을 설계해 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((c, i) => {
                const active = c.id === openId || (editing && editing.id === c.id)
                const def = obDef(c.obstacleType)
                const cnt = SHARPEN_Q.filter((q) => c.checks[q.id]).length
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => { dragId.current = c.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== c.id) setDragOver(c.id) }}
                    onDragLeave={() => { if (dragOver === c.id) setDragOver(null) }}
                    onDrop={() => onDrop(c.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(c.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === c.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || '(제목 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <span><Emoji e={def.icon} /> {def.label}</span>
                      <span>·</span>
                      <span style={{ color: cnt === SHARPEN_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{SHARPEN_Q.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(c) }} title="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(c.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === c.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 갈등을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(c.id) }}>삭제</button>
                          <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 메인: 폼(신규/수정) 또는 상세보기 또는 안내 */}
        <div style={main}>
          {editing ? (
            <FormView
              editing={editing} setEditing={setEditing}
              field={field} label={label} input={input} area={area}
              toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit}
            />
          ) : opened ? (
            <DetailView c={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} copyText={copyText} exportOne={exportOne} onToProject={() => toProject(opened)} label={label} />
          ) : (
            <div style={empty}>
              왼쪽에서 갈등을 고르거나<br /><b>＋ 새 갈등</b>으로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12 }}>욕망 ＋ 장애물 ＋ 걸린 것 → 한 줄 갈등이 만들어집니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Conflict; setEditing: (c: Conflict) => void
  field: React.CSSProperties; label: React.CSSProperties; input: React.CSSProperties; area: React.CSSProperties
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, field, label, input, area, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof Conflict, v: any) => setEditing({ ...editing, [k]: v })
  const def = obDef(editing.obstacleType)
  const preview = summarize(editing)
  const checkedCnt = SHARPEN_Q.filter((q) => editing.checks[q.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '갈등 수정' : '새 갈등 설계'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={field}>
        <div style={label}>제목 (비우면 인물명으로)</div>
        <input style={input} value={editing.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 진실과 충성 사이" maxLength={80} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="👤" /> 인물</div>
        <input style={input} value={editing.character} onChange={(e) => set('character', e.target.value)} placeholder="누구의 갈등인가요? 예: 형사 도윤" maxLength={60} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="🎯" /> 욕망 (무엇을 원하는가)</div>
        <textarea style={area} value={editing.desire} onChange={(e) => set('desire', e.target.value)} placeholder="인물이 절실히 원하는 것. 예: 동생의 누명을 벗기는 것" maxLength={300} />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🧱" /> 장애물 유형</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {OB_TYPES.map((o) => (
            <button
              key={o.key}
              className={'minibtn' + (editing.obstacleType === o.key ? ' active' : '')}
              onClick={() => set('obstacleType', o.key)}
              style={{ borderColor: editing.obstacleType === o.key ? 'var(--accent)' : 'var(--border)', background: editing.obstacleType === o.key ? 'var(--chrome-2)' : undefined }}
              title={o.hint}
            ><Emoji e={o.icon} /> {o.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}><Emoji e={def.icon} /> {def.label}: {def.hint}</div>
        <textarea style={area} value={editing.obstacle} onChange={(e) => set('obstacle', e.target.value)} placeholder={`욕망을 가로막는 구체적 장애물 (${def.label}). 예: 진범이 인물의 상관이다`} maxLength={300} />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="💥" /> 이해관계 — 위기에 걸린 것 (실패의 대가)</div>
        <textarea style={area} value={editing.stakes} onChange={(e) => set('stakes', e.target.value)} placeholder="실패하면 무엇을 잃는가? 예: 동생의 자유와 자신의 직위" maxLength={300} />
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 갈등 한 줄 요약 (미리보기)</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{preview}</div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={area} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="전개 아이디어, 전환점, 결말 방향 등" maxLength={500} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔥" /> 갈등 강화 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === SHARPEN_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{SHARPEN_Q.length}</span>
        </div>
        <CheckList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  c: Conflict; onEdit: () => void; toggleCheck: (qid: string) => void
  copyText: (t: string, label?: string) => void; exportOne: (c: Conflict) => string
  onToProject: () => void; label: React.CSSProperties
}) {
  const { c, onEdit, toggleCheck, copyText, exportOne, onToProject, label } = props
  const linked = hasProjectBridge()
  const def = obDef(c.obstacleType)
  const summary = summarize(c)
  const checkedCnt = SHARPEN_Q.filter((q) => c.checks[q.id]).length

  const rowS: React.CSSProperties = { marginBottom: 10 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>{c.title}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(c), '복사됨')} title="이 갈등을 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--accent)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 갈등 한 줄 요약</div>
        <div style={{ fontSize: 14, lineHeight: 1.65, fontWeight: 500 }}>{summary}</div>
      </div>

      <div style={rowS}><div style={label}><Emoji e="👤" /> 인물</div><div style={valS}>{c.character || <span style={{ color: 'var(--muted)' }}>—</span>}</div></div>
      <div style={rowS}><div style={label}><Emoji e="🎯" /> 욕망</div><div style={valS}>{c.desire || <span style={{ color: 'var(--muted)' }}>—</span>}</div></div>
      <div style={rowS}>
        <div style={label}><Emoji e="🧱" /> 장애물 <span style={{ color: 'var(--accent)' }}>· <Emoji e={def.icon} /> {def.label}</span></div>
        <div style={valS}>{c.obstacle || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
      </div>
      <div style={rowS}><div style={label}><Emoji e="💥" /> 위기에 걸린 것</div><div style={valS}>{c.stakes || <span style={{ color: 'var(--muted)' }}>—</span>}</div></div>
      {c.notes.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 메모</div><div style={valS}>{c.notes}</div></div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔥" /> 갈등 강화 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === SHARPEN_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{SHARPEN_Q.length}</span>
        </div>
        <CheckList checks={c.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          질문에 체크하며 약한 고리를 점검하세요. 답이 망설여지는 항목이 곧 보강할 지점입니다.
        </div>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 갈등을 프로젝트 자료(갈등 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 갈등 문서 추가</button>
      </div>
    </div>
  )
}

// ── 공통 체크리스트 ──
function CheckList(props: { checks: Record<string, boolean>; toggle: (qid: string) => void }) {
  const { checks, toggle } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {SHARPEN_Q.map((q) => {
        const on = !!checks[q.id]
        return (
          <label
            key={q.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (on ? 'var(--ok)' : 'var(--border)'),
              background: on ? 'var(--chrome-2)' : 'var(--panel)',
            }}
          >
            <input type="checkbox" checked={on} onChange={() => toggle(q.id)} style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: 'var(--ok)', cursor: 'pointer' }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--muted)' }}>{q.q}</span>
          </label>
        )
      })}
    </div>
  )
}
