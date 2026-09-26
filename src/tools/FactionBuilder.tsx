// 세력 설계기 — 작품 속 조직·세력(길드/왕국/교단/기업/반군 등)을 카드로 설계하는 도구.
// 각 세력: 이름/유형/목표/이념/수장/규모/상징/비밀 + '적대 세력'(다른 카드와의 관계) 정리.
// 좌측: 세력 목록(선택·검색·순서 이동·추가·삭제). 우측: 선택 세력 편집 + 다른 세력과의 관계 설정.
// 자급식: react 와 './linkbus' 만 import. 전부 로컬(외부 API 불필요).
// localStorage('sry:tool:faction-builder')에 JSON 자동 저장/복원 + 빈 상태 안내.
// 연계: 세력을 프로젝트 자료(세계관 › 세력)에 문서로 추가(addToProject). 언마운트 정리.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'faction-builder', name: '세력 설계기', icon: '⚔️', group: '구상·정리', intro: '조직·세력의 목표·이념·수장·세력 간 관계를 카드로 설계하세요', w: 700, h: 600 }

const LS_KEY = 'sry:tool:faction-builder'

// 세력 유형 — 라벨/아이콘.
interface FType { key: string; label: string; icon: string }
const FTYPES: FType[] = [
  { key: 'kingdom', label: '왕국·국가', icon: '👑' },
  { key: 'guild', label: '길드·조합', icon: '🛡️' },
  { key: 'order', label: '교단·종교', icon: '⛪' },
  { key: 'corp', label: '기업·상단', icon: '🏢' },
  { key: 'rebel', label: '반군·저항', icon: '🔥' },
  { key: 'criminal', label: '범죄·암흑', icon: '🗡️' },
  { key: 'military', label: '군대·기사단', icon: '⚔️' },
  { key: 'secret', label: '비밀결사', icon: '🕯️' },
  { key: 'tribe', label: '부족·씨족', icon: '🏹' },
  { key: 'other', label: '기타', icon: '🏴' },
]
function ftDef(k: string): FType { return FTYPES.find((t) => t.key === k) || FTYPES[FTYPES.length - 1] }

// 관계 유형 — 한 세력에서 다른 세력으로 향하는 관계의 성격.
interface RelDef { key: string; label: string; icon: string; color: string }
const REL_TYPES: RelDef[] = [
  { key: 'enemy', label: '적대', icon: '⚔️', color: 'var(--warn)' },
  { key: 'rival', label: '경쟁', icon: '🔥', color: '#d97706' },
  { key: 'ally', label: '동맹', icon: '🤝', color: 'var(--ok)' },
  { key: 'vassal', label: '예속', icon: '🔗', color: '#2563eb' },
  { key: 'overlord', label: '지배', icon: '👑', color: '#7c3aed' },
  { key: 'neutral', label: '중립', icon: '⚖️', color: 'var(--muted)' },
  { key: 'secret', label: '내통', icon: '🤫', color: '#db2777' },
]
function relDef(k: string): RelDef { return REL_TYPES.find((r) => r.key === k) || REL_TYPES[0] }

// 세력 → (대상 세력 id) 관계.
interface Relation { targetId: string; type: string; note: string }

// 사용자 정의 항목 — 라벨(항목 이름) + 값(자유 입력).
interface CustomField { id: string; label: string; value: string }

interface Faction {
  id: string
  name: string
  type: string        // FTYPE key
  goal: string        // 목표
  ideology: string    // 이념·신조
  leader: string      // 수장
  size: string        // 규모
  symbol: string      // 상징(문장/색/표어)
  secret: string      // 비밀
  notes: string       // 기타 메모
  relations: Relation[]
  custom: CustomField[] // 사용자 정의 항목(라벨 유지·값 자유 입력)
  etc: string           // 고정 '기타' 자유 입력
  createdAt: number
}

const REL_KEYS = REL_TYPES.map((r) => r.key)
const FT_KEYS = FTYPES.map((t) => t.key)

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Faction {
  return { id: '', name: '', type: 'kingdom', goal: '', ideology: '', leader: '', size: '', symbol: '', secret: '', notes: '', relations: [], custom: [], etc: '', createdAt: 0 }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태로 graceful.
function loadState(): { list: Faction[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Faction[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      name: String(x.name || ''),
      type: FT_KEYS.includes(x.type) ? x.type : 'kingdom',
      goal: String(x.goal || ''),
      ideology: String(x.ideology || ''),
      leader: String(x.leader || ''),
      size: String(x.size || ''),
      symbol: String(x.symbol || ''),
      secret: String(x.secret || ''),
      notes: String(x.notes || ''),
      relations: Array.isArray(x.relations)
        ? x.relations
            .filter((r: any) => r && typeof r === 'object' && r.targetId)
            .map((r: any) => ({ targetId: String(r.targetId), type: REL_KEYS.includes(r.type) ? r.type : 'enemy', note: String(r.note || '') }))
        : [],
      custom: Array.isArray(x.custom)
        ? x.custom
            .filter((c: any) => c && typeof c === 'object')
            .map((c: any) => ({ id: String(c.id || newId()), label: String(c.label || ''), value: String(c.value || '') }))
        : [],
      etc: String(x.etc || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    // 끊어진 관계(삭제된 대상) 정리는 렌더 시점에 처리(여기선 보존).
    const openId = typeof p?.openId === 'string' && list.some((f) => f.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

// 프로젝트 '세력' 문서 본문(HTML) 생성.
function factionBodyHtml(f: Faction, nameOf: (id: string) => string): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const def = ftDef(f.type)
  const parts: string[] = []
  parts.push(`<p><b>유형:</b> ${def.icon} ${escHtml(def.label)}</p>`)
  const rows: [string, string][] = [
    ['🎯 목표', v(f.goal)],
    ['📜 이념·신조', v(f.ideology)],
    ['👤 수장', v(f.leader)],
    ['📊 규모', v(f.size)],
    ['🏳️ 상징', v(f.symbol)],
  ]
  rows.forEach(([k, val]) => parts.push(`<p><b>${escHtml(k)}</b><br>${val}</p>`))
  const validRels = f.relations.filter((r) => nameOf(r.targetId))
  if (validRels.length) {
    const items = validRels.map((r) => {
      const rd = relDef(r.type)
      const nm = escHtml(nameOf(r.targetId))
      const note = r.note.trim() ? ` — ${escHtml(r.note.trim())}` : ''
      return `<li>${rd.icon} <b>${escHtml(rd.label)}</b> · ${nm}${note}</li>`
    }).join('')
    parts.push(`<p><b>🔗 세력 간 관계</b></p><ul>${items}</ul>`)
  }
  if (f.secret.trim()) parts.push(`<p><b>🔒 비밀</b><br>${v(f.secret)}</p>`)
  if (f.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${v(f.notes)}</p>`)
  // 사용자 정의 항목(라벨 있고 값이 비어있지 않은 것만).
  f.custom.forEach((c) => {
    if (c.label.trim() && c.value.trim()) parts.push(`<p><b>${escHtml(c.label.trim())}</b><br>${v(c.value)}</p>`)
  })
  if (f.etc.trim()) parts.push(`<p><b>🗒️ 기타</b><br>${v(f.etc)}</p>`)
  return parts.join('')
}

const norm = (s: string) => s.trim().toLowerCase()

export default function FactionBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Faction[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Faction | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
    }
  }, [])

  // payload 로 새 세력 이름 프리필(다른 도구에서 열 때).
  useEffect(() => {
    const nm = payload && typeof payload.name === 'string' ? payload.name.trim() : ''
    if (nm) {
      setEditing({ ...emptyForm(), id: newId(), name: nm })
      setOpenId(null)
    }
  }, [payload])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  const showFlash = (msg: string) => {
    if (!mounted.current) return
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2600)
  }

  const nameOf = (id: string): string => list.find((f) => f.id === id)?.name || ''

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (f: Faction) => { setEditing({ ...f, relations: f.relations.map((r) => ({ ...r })), custom: f.custom.map((c) => ({ ...c })) }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e: Faction = { ...editing }
    if (!e.name.trim()) e.name = '이름 없는 세력'
    if (!e.createdAt) e.createdAt = Date.now()
    // 끊어진 관계(없는 대상/자기 자신) 제거.
    e.relations = e.relations.filter((r) => r.targetId && r.targetId !== e.id)
    setList((prev) => {
      const exists = prev.some((f) => f.id === e.id)
      return exists ? prev.map((f) => (f.id === e.id ? e : f)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) =>
      prev
        .filter((f) => f.id !== id)
        // 다른 세력들이 가지고 있던 이 세력 대상 관계도 함께 제거.
        .map((f) => ({ ...f, relations: f.relations.filter((r) => r.targetId !== id) }))
    )
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((f) => f.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경(검색 중이 아닐 때만).
  const canDrag = norm(query) === ''
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((f) => f.id === from)
      const ti = prev.findIndex((f) => f.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // 텍스트 복사(클립보드 + 폴백).
  const copyText = (text: string, label = '복사됨') => {
    const done = () => showFlash(label)
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
    } catch { showFlash('복사 실패') }
  }

  // 한 세력 → 텍스트.
  const exportOne = (f: Faction): string => {
    const def = ftDef(f.type)
    const lines = [
      `# ${f.name}  (${def.icon} ${def.label})`,
      '',
      `· 목표: ${f.goal || '—'}`,
      `· 이념: ${f.ideology || '—'}`,
      `· 수장: ${f.leader || '—'}`,
      `· 규모: ${f.size || '—'}`,
      `· 상징: ${f.symbol || '—'}`,
    ]
    const rels = f.relations.filter((r) => nameOf(r.targetId))
    if (rels.length) {
      lines.push('', '관계:')
      rels.forEach((r) => {
        const rd = relDef(r.type)
        lines.push(`  ${rd.icon} ${rd.label} → ${nameOf(r.targetId)}${r.note.trim() ? ` (${r.note.trim()})` : ''}`)
      })
    }
    if (f.secret.trim()) lines.push('', `비밀: ${f.secret.trim()}`)
    if (f.notes.trim()) lines.push('', `메모: ${f.notes.trim()}`)
    f.custom.forEach((c) => {
      if (c.label.trim() && c.value.trim()) lines.push('', `${c.label.trim()}: ${c.value.trim()}`)
    })
    if (f.etc.trim()) lines.push('', `기타: ${f.etc.trim()}`)
    return lines.join('\n')
  }
  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // 프로젝트 연계 — 자료(research)/'세계관' 폴더에 '세력 — 이름' 문서로 추가.
  const toProject = (f: Faction) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되지 않았습니다'); return }
    const def = ftDef(f.type)
    const nm = f.name.trim() || '이름 없는 세력'
    // 다른 도구(인물 시트·갤러리 등)에 그대로 나타나도록 fields 맵에 사용자 정의 항목·기타 추가.
    const fields: Record<string, string> = {
      유형: def.label,
      수장: f.leader.trim() || '—',
      규모: f.size.trim() || '—',
    }
    f.custom.forEach((c) => {
      if (c.label.trim() && c.value.trim()) fields[c.label.trim()] = c.value.trim()
    })
    if (f.etc.trim()) fields.etc = f.etc.trim()
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `세력 — ${nm}`,
      bodyHtml: factionBodyHtml(f, nameOf),
      synopsis: f.goal.trim() || undefined,
      meta: fields,
    })
    showFlash(id ? '프로젝트 ‘자료 › 세계관’에 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const filtered = list.filter((f) => {
    const q = norm(query)
    if (!q) return true
    return norm(f.name).includes(q) || norm(f.goal).includes(q) || norm(f.ideology).includes(q) || norm(f.leader).includes(q)
  })

  const opened = openId ? list.find((f) => f.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', minHeight: 0 }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const sideHead: React.CSSProperties = { padding: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 24, gap: 12 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }} aria-hidden><Emoji e="⚔️" /></span>
        <strong style={{ fontSize: 15 }}>세력 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 세력</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 세력을 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 세력</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 목록 + 검색 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="세력 검색…" aria-label="세력 검색" />
          </div>
          {list.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: 14, textAlign: 'center' }}>
              아직 세력이 없어요.<br />오른쪽 위 <b>＋ 새 세력</b>으로<br />첫 조직을 설계해 보세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>‘{query}’에 맞는 세력이 없어요.</div>
          ) : (
            <div style={listArea}>
              {filtered.map((f) => {
                const active = f.id === openId || editing?.id === f.id
                const def = ftDef(f.type)
                const realIdx = list.findIndex((x) => x.id === f.id)
                const relCnt = f.relations.filter((r) => nameOf(r.targetId)).length
                return (
                  <div
                    key={f.id}
                    draggable={canDrag}
                    onDragStart={() => { if (canDrag) dragId.current = f.id }}
                    onDragOver={(e) => { if (!canDrag || !dragId.current) return; e.preventDefault(); if (dragOver !== f.id) setDragOver(f.id) }}
                    onDragLeave={() => { if (dragOver === f.id) setDragOver(null) }}
                    onDrop={(e) => { if (!canDrag) return; e.preventDefault(); onDrop(f.id) }}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(f.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === f.id && dragId.current ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {canDrag && <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>}
                      <span aria-hidden><Emoji e={def.icon} /></span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name || '(이름 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <span>{def.label}</span>
                      {relCnt > 0 && <><span>·</span><span>관계 {relCnt}</span></>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(f.id, -1) }} disabled={!canDrag || realIdx === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(f.id, 1) }} disabled={!canDrag || realIdx === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(f) }} title="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(f.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === f.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 세력을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(f.id) }}>삭제</button>
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
            <FormView editing={editing} setEditing={setEditing} list={list} onSave={saveForm} onCancel={cancelEdit} />
          ) : opened ? (
            <DetailView f={opened} nameOf={nameOf} onEdit={() => startEdit(opened)} copyText={copyText} exportOne={exportOne} onToProject={() => toProject(opened)} />
          ) : (
            <div style={empty}>
              <div style={{ fontSize: 34 }} aria-hidden><Emoji e="🏰" /></div>
              <div>
                왼쪽에서 세력을 고르거나<br /><b>＋ 새 세력</b>으로 만들어 보세요.<br /><br />
                <span style={{ fontSize: 12 }}>목표·이념·수장·규모·상징·비밀을 정리하고,<br />세력끼리 적대·동맹 관계로 엮을 수 있어요.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Faction
  setEditing: (f: Faction) => void
  list: Faction[]
  onSave: () => void
  onCancel: () => void
}) {
  const { editing, setEditing, list, onSave, onCancel } = props
  const set = (k: keyof Faction, v: any) => setEditing({ ...editing, [k]: v })
  const def = ftDef(editing.type)

  // 관계 대상 후보(자기 자신 제외).
  const others = list.filter((f) => f.id !== editing.id)

  const addRelation = () => {
    if (!others.length) return
    // 아직 관계가 없는 첫 대상을 기본값으로.
    const used = new Set(editing.relations.map((r) => r.targetId))
    const target = others.find((f) => !used.has(f.id)) || others[0]
    set('relations', [...editing.relations, { targetId: target.id, type: 'enemy', note: '' }])
  }
  const updRelation = (i: number, patch: Partial<Relation>) => {
    set('relations', editing.relations.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }
  const delRelation = (i: number) => set('relations', editing.relations.filter((_, j) => j !== i))

  // 사용자 정의 항목 — 이름을 입력받아 빈 입력칸을 추가(무작위 생성 없음).
  const addCustom = () => {
    const raw = window.prompt('새 항목 이름을 입력하세요 (예: 본거지, 동맹사, 창설일)')
    if (raw == null) return
    const label = raw.trim()
    if (!label) return
    set('custom', [...editing.custom, { id: newId(), label, value: '' }])
  }
  const updCustom = (i: number, value: string) => set('custom', editing.custom.map((c, j) => (j === i ? { ...c, value } : c)))
  const delCustom = (i: number) => set('custom', editing.custom.filter((_, j) => j !== i))

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 52, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 12 }
  const select: React.CSSProperties = { padding: '7px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>{editing.createdAt ? '세력 수정' : '새 세력 설계'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={field}>
        <div style={label}>세력 이름</div>
        <input style={input} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 은빛검 기사단" maxLength={80} autoFocus />
      </div>

      <div style={field}>
        <div style={label}>유형</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FTYPES.map((t) => (
            <button
              key={t.key}
              className={'minibtn' + (editing.type === t.key ? ' active' : '')}
              onClick={() => set('type', t.key)}
              style={{ borderColor: editing.type === t.key ? 'var(--accent)' : 'var(--border)', background: editing.type === t.key ? 'var(--chrome-2)' : undefined }}
            ><Emoji e={t.icon} /> {t.label}</button>
          ))}
        </div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🎯" /> 목표 (무엇을 이루려 하는가)</div>
        <textarea style={area} value={editing.goal} onChange={(e) => set('goal', e.target.value)} placeholder="예: 왕좌를 되찾고 옛 질서를 복원한다" maxLength={400} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="📜" /> 이념·신조 (무엇을 믿는가)</div>
        <textarea style={area} value={editing.ideology} onChange={(e) => set('ideology', e.target.value)} placeholder="예: 명예는 목숨보다 무겁다" maxLength={400} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ ...field, flex: 1 }}>
          <div style={label}><Emoji e="👤" /> 수장</div>
          <input style={input} value={editing.leader} onChange={(e) => set('leader', e.target.value)} placeholder="예: 단장 카엘" maxLength={80} />
        </div>
        <div style={{ ...field, flex: 1 }}>
          <div style={label}><Emoji e="📊" /> 규모</div>
          <input style={input} value={editing.size} onChange={(e) => set('size', e.target.value)} placeholder="예: 기사 200·종자 500" maxLength={80} />
        </div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🏳️" /> 상징 (문장·색·표어)</div>
        <input style={input} value={editing.symbol} onChange={(e) => set('symbol', e.target.value)} placeholder="예: 은빛 검과 푸른 장미, ‘끝까지 선다’" maxLength={120} />
      </div>

      {/* 세력 간 관계 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔗" /> 세력 간 관계</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={addRelation} disabled={others.length === 0} title={others.length === 0 ? '관계를 맺을 다른 세력이 없어요' : '관계 추가'}>＋ 관계</button>
        </div>
        {others.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, padding: '4px 2px' }}>
            다른 세력을 먼저 만들면 적대·동맹 등 관계를 연결할 수 있어요.
          </div>
        ) : editing.relations.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '4px 2px' }}>아직 관계가 없어요. ‘＋ 관계’로 추가하세요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {editing.relations.map((r, i) => {
              const rd = relDef(r.type)
              return (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13 }} aria-hidden><Emoji e={rd.icon} /></span>
                    <select style={select} value={r.type} onChange={(e) => updRelation(i, { type: e.target.value })} aria-label="관계 유형">
                      {REL_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>→</span>
                    <select style={{ ...select, flex: 1, minWidth: 100 }} value={r.targetId} onChange={(e) => updRelation(i, { targetId: e.target.value })} aria-label="대상 세력">
                      {others.map((f) => <option key={f.id} value={f.id}>{f.name || '(이름 없음)'}</option>)}
                    </select>
                    <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => delRelation(i)} title="관계 삭제">✕</button>
                  </div>
                  <input
                    style={{ ...input, marginTop: 6, fontSize: 12.5, padding: '6px 9px' }}
                    value={r.note}
                    onChange={(e) => updRelation(i, { note: e.target.value })}
                    placeholder="관계 메모 (선택) — 예: 국경 분쟁으로 전면전 직전"
                    maxLength={200}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🔒" /> 비밀 (숨겨진 약점·진실·음모)</div>
        <textarea style={area} value={editing.secret} onChange={(e) => set('secret', e.target.value)} placeholder="예: 수장은 적국의 첩자다" maxLength={400} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={area} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="역사, 거점, 자금원, 의식 등" maxLength={600} />
      </div>

      {/* 사용자 정의 항목 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🧩" /> 사용자 정의 항목</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가">＋ 항목 추가</button>
        </div>
        {editing.custom.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, padding: '4px 2px' }}>
            필요한 항목(예: 본거지·창설일·동맹사)을 직접 추가해 자유롭게 적을 수 있어요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {editing.custom.map((c, i) => (
              <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{emojify(c.label)}</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => delCustom(i)} title="항목 삭제">✕</button>
                </div>
                <textarea
                  style={{ ...area, minHeight: 44 }}
                  value={c.value}
                  onChange={(e) => updCustom(i, e.target.value)}
                  placeholder={`${c.label} 내용을 적어 주세요`}
                  maxLength={600}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 고정 '기타' 자유 입력 */}
      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 기타 (자유 입력)</div>
        <textarea
          style={{ ...area, minHeight: 80 }}
          value={editing.etc}
          onChange={(e) => set('etc', e.target.value)}
          placeholder="어떤 항목에도 들어가지 않는 내용을 자유롭게 적어 주세요."
          maxLength={2000}
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        선택한 유형: <Emoji e={def.icon} /> {def.label}
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  f: Faction
  nameOf: (id: string) => string
  onEdit: () => void
  copyText: (t: string, label?: string) => void
  exportOne: (f: Faction) => string
  onToProject: () => void
}) {
  const { f, nameOf, onEdit, copyText, exportOne, onToProject } = props
  const linked = hasProjectBridge()
  const def = ftDef(f.type)
  const rels = f.relations.filter((r) => nameOf(r.targetId))

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const rowS: React.CSSProperties = { marginBottom: 10 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const muted = <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }} aria-hidden><Emoji e={def.icon} /></span>
        <strong style={{ fontSize: 16, wordBreak: 'break-word' }}>{emojify(f.name)}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(f), '복사됨')} title="이 세력을 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      <div style={{ display: 'inline-block', fontSize: 12, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 10px', marginBottom: 14 }}>
        <Emoji e={def.icon} /> {def.label}
      </div>

      <div style={rowS}><div style={label}><Emoji e="🎯" /> 목표</div><div style={valS}>{f.goal ? emojify(f.goal) : muted}</div></div>
      <div style={rowS}><div style={label}><Emoji e="📜" /> 이념·신조</div><div style={valS}>{f.ideology ? emojify(f.ideology) : muted}</div></div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ ...rowS, flex: 1 }}><div style={label}><Emoji e="👤" /> 수장</div><div style={valS}>{f.leader ? emojify(f.leader) : muted}</div></div>
        <div style={{ ...rowS, flex: 1 }}><div style={label}><Emoji e="📊" /> 규모</div><div style={valS}>{f.size ? emojify(f.size) : muted}</div></div>
      </div>
      <div style={rowS}><div style={label}><Emoji e="🏳️" /> 상징</div><div style={valS}>{f.symbol ? emojify(f.symbol) : muted}</div></div>

      <div style={rowS}>
        <div style={label}><Emoji e="🔗" /> 세력 간 관계</div>
        {rels.length === 0 ? (
          <div style={{ ...valS, color: 'var(--muted)' }}>설정된 관계가 없어요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rels.map((r, i) => {
              const rd = relDef(r.type)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: rd.color, flexShrink: 0, whiteSpace: 'nowrap' }}><Emoji e={rd.icon} /> {rd.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>→</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{emojify(nameOf(r.targetId))}</span>
                    {r.note.trim() && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{emojify(r.note.trim())}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {f.secret.trim() && <div style={rowS}><div style={label}><Emoji e="🔒" /> 비밀</div><div style={valS}>{emojify(f.secret)}</div></div>}
      {f.notes.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 메모</div><div style={valS}>{emojify(f.notes)}</div></div>}

      {f.custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => (
        <div key={c.id} style={rowS}><div style={label}>{emojify(c.label.trim())}</div><div style={valS}>{emojify(c.value)}</div></div>
      ))}
      {f.etc.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 기타</div><div style={valS}>{emojify(f.etc)}</div></div>}

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 세력을 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>
    </div>
  )
}
