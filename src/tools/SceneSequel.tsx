// 장면-시퀄 빌더 (드와이트 스웨인 『Techniques of the Selling Writer』) —
// 이야기를 능동 단위 '장면(Scene)'과 반응 단위 '시퀄(Sequel)'로 번갈아 짠다.
//   · 장면 = 목표(Goal) → 갈등(Conflict) → 재난(Disaster): 인물이 무언가를 좇다 더 나빠진다.
//   · 시퀄 = 반응(Reaction) → 딜레마(Dilemma) → 결정(Decision): 재난을 소화하고 다음 목표를 정한다.
// 한 '묶음(Beat)'은 장면 카드 + 시퀄 카드로 이루어지며, 결정이 다음 묶음의 목표로 이어진다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:scene-sequel' 에 자동 저장/복원.
// 연계(linkbus): 묶음을 실제 프로젝트 원고('draft')/'장면' 폴더에 문서로 추가 · 텍스트 복사.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'scene-sequel', name: '장면-시퀄 빌더', icon: '🎬', group: '구상·정리', intro: '드와이트 스웨인의 장면(목표·갈등·재난)과 시퀄(반응·딜레마·결정)을 번갈아 짜세요', w: 660, h: 600 }

// ── 데이터 모델 ──
interface SceneCard { goal: string; conflict: string; disaster: string }
interface SequelCard { reaction: string; dilemma: string; decision: string }
interface Beat {
  id: string
  title: string
  pov: string          // 시점 인물(선택)
  scene: SceneCard
  sequel: SequelCard
  notes: string
  createdAt: number
}

const LS_KEY = 'sry:tool:scene-sequel'

// 각 칸의 라벨/설명/플레이스홀더 — 폼·상세·내보내기에서 공유.
const SCENE_FIELDS: { key: keyof SceneCard; icon: string; label: string; hint: string; ph: string }[] = [
  { key: 'goal', icon: '🎯', label: '목표', hint: '인물이 이 장면에서 능동적으로 좇는 구체적·즉각적 목표', ph: '예: 사라진 동생의 마지막 행적을 알아내려 옛 친구를 찾아간다' },
  { key: 'conflict', icon: '⚔️', label: '갈등', hint: '목표를 가로막는 점증하는 장애물·반대(주고받기식 충돌)', ph: '예: 친구는 입을 닫고, 캐물을수록 위협하며 자리를 피하려 한다' },
  { key: 'disaster', icon: '💥', label: '재난', hint: '장면 끝의 반전·악화 — 목표가 좌절되고 상황이 더 나빠진다', ph: '예: 친구가 동생의 죽음을 암시하고 사라진다. 도리어 의심을 산다' },
]
const SEQUEL_FIELDS: { key: keyof SequelCard; icon: string; label: string; hint: string; ph: string }[] = [
  { key: 'reaction', icon: '😣', label: '반응', hint: '재난에 대한 감정적 반응 — 충격·분노·절망(즉각적, 비논리적)', ph: '예: 분노와 죄책감에 휩싸여 밤새 거리를 헤맨다' },
  { key: 'dilemma', icon: '🤔', label: '딜레마', hint: '나쁜 선택지뿐인 상황 — 어느 쪽도 안전하지 않다', ph: '예: 경찰에 알리면 자신이 용의자가 되고, 직접 캐면 위험에 빠진다' },
  { key: 'decision', icon: '🧭', label: '결정', hint: '딜레마 끝에 내리는 능동적 선택 → 다음 장면의 목표가 된다', ph: '예: 위험을 무릅쓰고 친구가 일하던 항구를 직접 파헤치기로 한다' },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyBeat(): Beat {
  return {
    id: '', title: '', pov: '',
    scene: { goal: '', conflict: '', disaster: '' },
    sequel: { reaction: '', dilemma: '', decision: '' },
    notes: '', createdAt: 0,
  }
}

function str(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v) }

// 한 묶음의 채움 정도(0~6) — 진행 표시용.
function filledCount(b: Beat): number {
  let n = 0
  ;([b.scene.goal, b.scene.conflict, b.scene.disaster, b.sequel.reaction, b.sequel.dilemma, b.sequel.decision]).forEach((v) => { if (v.trim()) n++ })
  return n
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function htmlBreaks(s: string): string { return escHtml(s.trim()).replace(/\n/g, '<br>') }

// 프로젝트 문서 본문(HTML) — 장면(목표·갈등·재난) + 시퀄(반응·딜레마·결정).
function beatBodyHtml(b: Beat): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? htmlBreaks(s) : dash)
  const parts: string[] = []
  if (b.pov.trim()) parts.push(`<p>🎭 시점: ${escHtml(b.pov.trim())}</p>`)
  parts.push('<p><b>🎬 장면 (Scene)</b></p>')
  SCENE_FIELDS.forEach((f) => parts.push(`<p>${f.icon} <b>${f.label}</b><br>${v(b.scene[f.key])}</p>`))
  parts.push('<p><b>🔄 시퀄 (Sequel)</b></p>')
  SEQUEL_FIELDS.forEach((f) => parts.push(`<p>${f.icon} <b>${f.label}</b><br>${v(b.sequel[f.key])}</p>`))
  if (b.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${htmlBreaks(b.notes)}</p>`)
  return parts.join('')
}

// 텍스트 내보내기 — 한 묶음.
function exportBeat(b: Beat, idx?: number): string {
  const head = (idx != null ? `${idx + 1}. ` : '') + (b.title.trim() || '제목 없는 묶음')
  const lines: string[] = [`# ${head}`]
  if (b.pov.trim()) lines.push(`시점: ${b.pov.trim()}`)
  lines.push('', '[장면] 목표→갈등→재난')
  SCENE_FIELDS.forEach((f) => lines.push(`· ${f.icon} ${f.label}: ${b.scene[f.key].trim() || '—'}`))
  lines.push('', '[시퀄] 반응→딜레마→결정')
  SEQUEL_FIELDS.forEach((f) => lines.push(`· ${f.icon} ${f.label}: ${b.sequel[f.key].trim() || '—'}`))
  if (b.notes.trim()) lines.push('', `메모: ${b.notes.trim()}`)
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Beat[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Beat[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const sc = (x.scene && typeof x.scene === 'object') ? x.scene : {}
      const sq = (x.sequel && typeof x.sequel === 'object') ? x.sequel : {}
      return {
        id: str(x.id) || newId(),
        title: str(x.title),
        pov: str(x.pov),
        scene: { goal: str(sc.goal), conflict: str(sc.conflict), disaster: str(sc.disaster) },
        sequel: { reaction: str(sq.reaction), dilemma: str(sq.dilemma), decision: str(sq.decision) },
        notes: str(x.notes),
        createdAt: Number(x.createdAt) || Date.now(),
      }
    })
    const openId = typeof p?.openId === 'string' && list.some((b) => b.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function SceneSequel({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Beat[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Beat | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const flashNonce = useRef(0)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 들어온 목표/제목으로 새 묶음 미리 채우기(연계 진입). 1회만.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const goal = str(payload.goal) || str(payload.text) || str(payload.decision)
    const title = str(payload.title)
    if (!goal && !title) return
    const b = { ...emptyBeat(), id: newId() }
    b.title = title
    b.scene.goal = goal
    if (mounted.current) { setEditing(b); setOpenId(null) }
  }, [payload])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 안내 메시지 자동 소거(nonce 로 경쟁 방지).
  const showFlash = (msg: string) => {
    setFlash(msg)
    const n = ++flashNonce.current
    window.setTimeout(() => { if (mounted.current && flashNonce.current === n) setFlash('') }, 1800)
  }

  const startNew = (seedGoal?: string) => {
    const b = { ...emptyBeat(), id: newId() }
    if (seedGoal) b.scene.goal = seedGoal
    setEditing(b); setOpenId(null); setConfirmDel(null)
  }
  const startEdit = (b: Beat) => {
    setEditing({ ...b, scene: { ...b.scene }, sequel: { ...b.sequel } })
    setConfirmDel(null)
  }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e: Beat = { ...editing, scene: { ...editing.scene }, sequel: { ...editing.sequel } }
    if (!e.title.trim()) e.title = e.scene.goal.trim().slice(0, 40) || '제목 없는 묶음'
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((b) => b.id === e.id)
      return exists ? prev.map((b) => (b.id === e.id ? e : b)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((b) => b.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경(HTML5 DnD — 전역 포인터 리스너 없음).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((b) => b.id === from)
      const ti = prev.findIndex((b) => b.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // "결정 → 다음 목표": 이 묶음의 결정을 목표로 삼는 새 묶음을 생성.
  const chainFromDecision = (b: Beat) => {
    const d = b.sequel.decision.trim()
    if (!d) { showFlash('결정이 비어 있어 이어갈 수 없어요'); return }
    startNew(d)
    showFlash('결정을 다음 장면의 목표로 이어갑니다')
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => showFlash(label)
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
    } catch { showFlash('복사 실패') }
  }
  const exportAll = (): string => list.map((b, i) => exportBeat(b, i)).join('\n\n———\n\n')

  // 프로젝트 연동 — 묶음을 원고(draft)/'장면' 폴더에 문서로 추가.
  const toProject = (b: Beat) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '장면',
      title: b.title.trim() ? `장면-시퀄 — ${b.title.trim()}` : '장면-시퀄',
      bodyHtml: beatBodyHtml(b),
      synopsis: b.scene.goal.trim() || b.scene.disaster.trim() || undefined,
      meta: {
        시점: b.pov.trim() || '—',
        재난: b.scene.disaster.trim().slice(0, 60) || '—',
        결정: b.sequel.decision.trim().slice(0, 60) || '—',
      },
    })
    showFlash(id ? '프로젝트 원고(장면 폴더)에 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((b) => b.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 224, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🎬"/></span>
        <strong style={{ fontSize: 15 }}>장면-시퀄 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 묶음</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 묶음을 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={() => startNew()}>＋ 새 묶음</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 묶음 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 묶음이 없어요.<br />오른쪽 위 <b>＋ 새 묶음</b>으로<br />첫 장면을 짜 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((b, i) => {
                const active = b.id === openId || (editing && editing.id === b.id)
                const cnt = filledCount(b)
                return (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={() => { dragId.current = b.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== b.id) setDragOver(b.id) }}
                    onDragLeave={() => { if (dragOver === b.id) setDragOver(null) }}
                    onDrop={() => onDrop(b.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(b.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === b.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title || '(제목 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      {b.pov.trim() && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}><Emoji e="🎭"/> {b.pov.trim()}</span>}
                      <span style={{ flex: 1 }} />
                      <span style={{ color: cnt === 6 ? 'var(--ok)' : 'var(--muted)' }}>{cnt}/6</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(b.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(b.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(b) }} title="수정"><Emoji e="✏️"/></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(b.id) }} title="삭제"><Emoji e="🗑️"/></button>
                    </div>
                    {confirmDel === b.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 묶음을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(b.id) }}>삭제</button>
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

        {/* 메인: 폼 / 상세 / 안내 */}
        <div style={main}>
          {editing ? (
            <FormView editing={editing} setEditing={setEditing} onSave={saveForm} onCancel={cancelEdit} />
          ) : opened ? (
            <DetailView
              b={opened}
              onEdit={() => startEdit(opened)}
              onChain={() => chainFromDecision(opened)}
              onCopy={() => copyText(exportBeat(opened), '복사됨')}
              onToProject={() => toProject(opened)}
            />
          ) : (
            <div style={empty}>
              왼쪽에서 묶음을 고르거나 <b>＋ 새 묶음</b>으로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12, lineHeight: 1.9, textAlign: 'left', display: 'inline-block' }}>
                <Emoji e="🎬"/> <b>장면</b> = 목표 → 갈등 → 재난<br />
                <Emoji e="🔄"/> <b>시퀄</b> = 반응 → 딜레마 → 결정<br />
                <span style={{ color: 'var(--muted)' }}>결정이 다음 장면의 목표로 이어집니다.</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 폼(신규/수정) ──
function FormView(props: { editing: Beat; setEditing: (b: Beat) => void; onSave: () => void; onCancel: () => void }) {
  const { editing, setEditing, onSave, onCancel } = props
  const setTop = (k: 'title' | 'pov' | 'notes', v: string) => setEditing({ ...editing, [k]: v })
  const setScene = (k: keyof SceneCard, v: string) => setEditing({ ...editing, scene: { ...editing.scene, [k]: v } })
  const setSequel = (k: keyof SequelCard, v: string) => setEditing({ ...editing, sequel: { ...editing.sequel, [k]: v } })

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 11 }

  const card = (accent: string): React.CSSProperties => ({ border: '1px solid var(--border)', borderTop: '3px solid ' + accent, borderRadius: 10, padding: 12, marginBottom: 14, background: 'var(--panel)' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '묶음 수정' : '새 장면-시퀄 묶음'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
        <div style={{ ...field, flex: 1.6 }}>
          <div style={label}>제목 (비우면 목표 첫 줄로)</div>
          <input style={input} value={editing.title} onChange={(e) => setTop('title', e.target.value)} placeholder="예: 항구의 추적" maxLength={80} />
        </div>
        <div style={{ ...field, flex: 1 }}>
          <div style={label}><Emoji e="🎭"/> 시점 인물 (선택)</div>
          <input style={input} value={editing.pov} onChange={(e) => setTop('pov', e.target.value)} placeholder="예: 도윤" maxLength={40} />
        </div>
      </div>

      {/* 장면 카드 */}
      <div style={card('var(--accent)')}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><Emoji e="🎬"/> 장면 <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>· 능동 단위 (목표 → 갈등 → 재난)</span></div>
        {SCENE_FIELDS.map((f) => (
          <div key={f.key} style={field}>
            <div style={label}><Emoji e={f.icon}/> {f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{f.hint}</div>
            <textarea style={area} value={editing.scene[f.key]} onChange={(e) => setScene(f.key, e.target.value)} placeholder={f.ph} maxLength={500} />
          </div>
        ))}
      </div>

      {/* 시퀄 카드 */}
      <div style={card('var(--warn)')}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><Emoji e="🔄"/> 시퀄 <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>· 반응 단위 (반응 → 딜레마 → 결정)</span></div>
        {SEQUEL_FIELDS.map((f) => (
          <div key={f.key} style={field}>
            <div style={label}><Emoji e={f.icon}/> {f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{f.hint}</div>
            <textarea style={area} value={editing.sequel[f.key]} onChange={(e) => setSequel(f.key, e.target.value)} placeholder={f.ph} maxLength={500} />
          </div>
        ))}
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🗒️"/> 메모 (선택)</div>
        <textarea style={area} value={editing.notes} onChange={(e) => setTop('notes', e.target.value)} placeholder="배경·소도구·복선·다음 묶음 연결 아이디어 등" maxLength={600} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: { b: Beat; onEdit: () => void; onChain: () => void; onCopy: () => void; onToProject: () => void }) {
  const { b, onEdit, onChain, onCopy, onToProject } = props
  const linked = hasProjectBridge()
  const canChain = !!b.sequel.decision.trim()

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }
  const val: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const dash = <span style={{ color: 'var(--muted)' }}>—</span>
  const card = (accent: string): React.CSSProperties => ({ border: '1px solid var(--border)', borderLeft: '3px solid ' + accent, borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--panel)' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</strong>
        {b.pov.trim() && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e="🎭"/> {b.pov.trim()}</span>}
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCopy} title="이 묶음을 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️"/> 수정</button>
      </div>

      <div style={card('var(--accent)')}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><Emoji e="🎬"/> 장면 <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>· 목표 → 갈등 → 재난</span></div>
        {SCENE_FIELDS.map((f, i) => (
          <div key={f.key} style={{ marginBottom: i === SCENE_FIELDS.length - 1 ? 0 : 10 }}>
            <div style={label}><Emoji e={f.icon}/> {f.label}</div>
            <div style={val}>{b.scene[f.key].trim() || dash}</div>
          </div>
        ))}
      </div>

      <div style={card('var(--warn)')}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}><Emoji e="🔄"/> 시퀄 <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>· 반응 → 딜레마 → 결정</span></div>
        {SEQUEL_FIELDS.map((f, i) => (
          <div key={f.key} style={{ marginBottom: i === SEQUEL_FIELDS.length - 1 ? 0 : 10 }}>
            <div style={label}><Emoji e={f.icon}/> {f.label}</div>
            <div style={val}>{b.sequel[f.key].trim() || dash}</div>
          </div>
        ))}
      </div>

      {b.notes.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div style={label}><Emoji e="🗒️"/> 메모</div>
          <div style={val}>{b.notes}</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
        결정은 다음 장면의 목표가 됩니다. <b>결정 → 다음 목표</b>로 이야기를 이어가세요.
      </div>

      <div className="linkbar" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={onChain} disabled={!canChain} title={canChain ? '이 묶음의 결정을 목표로 삼는 새 묶음을 만듭니다' : '결정 칸을 채우면 이어갈 수 있어요'}><Emoji e="➡️"/> 결정 → 다음 목표</button>
        <button className="linkbtn" onClick={onToProject} disabled={!linked} title={linked ? '이 묶음을 프로젝트 원고(장면 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      <div className="license-note" style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        구조 출처: 드와이트 스웨인(Dwight V. Swain), 『Techniques of the Selling Writer』(1965)의 Scene &amp; Sequel 개념. 본 도구는 집필 보조용 빈 양식만 제공하며 원문 텍스트를 포함하지 않습니다.
      </div>
    </div>
  )
}
