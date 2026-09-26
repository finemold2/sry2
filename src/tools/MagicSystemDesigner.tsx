// 마법·능력 체계 설계기 — 원천(source)/규칙·한계(rules)/대가(cost)/금기(taboo)/발현 방식(manifestation)/
// 사회적 영향(society) 항목으로 마법(또는 초능력) 체계를 일관되게 설계한다. 각 항목에 예시 힌트를 제공하고,
// 여러 체계를 저장·수정·삭제·순서 변경한다. 자급식: react·linkbus 외 import 없음. 전부 로컬.
// localStorage 'sry:tool:magic-system-designer' 에 자동 저장/복원.
// 연계(linkbus): 설계한 체계를 실제 프로젝트 자료('research')/'세계관' 폴더에 '마법 체계' 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'magic-system-designer', name: '마법 체계 설계기', icon: '✨', group: '구상·정리', intro: '원천·규칙·대가·금기·발현·사회적 영향으로 마법 체계를 일관되게 설계하세요', w: 640, h: 580 }

// 체계의 여섯 핵심 항목 정의 — 라벨/아이콘/도움말/예시 placeholder.
interface FieldDef { key: FieldKey; label: string; icon: string; hint: string; eg: string }
type FieldKey = 'source' | 'rules' | 'cost' | 'taboo' | 'manifestation' | 'society'
const FIELDS: FieldDef[] = [
  { key: 'source', label: '원천', icon: '🔮', hint: '힘은 어디서 오는가 — 출처와 근원', eg: '예: 별빛이 닿은 자에게 깃드는 "성흔". 밤하늘의 별자리에 따라 속성이 갈린다.' },
  { key: 'rules', label: '규칙·한계', icon: '📏', hint: '무엇이 가능하고 무엇이 불가능한가 — 일관된 법칙', eg: '예: 한 번에 하나의 원소만 다룬다. 시야 밖의 대상은 조종할 수 없다. 비가 오면 불 계열이 약해진다.' },
  { key: 'cost', label: '대가', icon: '🩸', hint: '힘을 쓰면 무엇을 치르는가 — 자원·수명·기억·고통', eg: '예: 마력 한 줌마다 기억 한 조각이 지워진다. 대규모 술법은 시전자의 수명을 깎는다.' },
  { key: 'taboo', label: '금기', icon: '⛔', hint: '절대 해서는 안 되는 것 — 어기면 벌어지는 일', eg: '예: 죽은 자를 되살리는 술법은 금기. 어기면 시전자의 그림자가 폭주해 산 자를 삼킨다.' },
  { key: 'manifestation', label: '발현 방식', icon: '🌀', hint: '어떻게 발동하는가 — 주문·도구·제스처·감정·문양', eg: '예: 손등의 문양을 피로 그어 활성화. 노래로 영창하며, 음정이 틀리면 술법이 흩어진다.' },
  { key: 'society', label: '사회적 영향', icon: '🏛️', hint: '이 힘이 세계·계급·제도·문화를 어떻게 바꾸는가', eg: '예: 성흔자는 귀족 계급을 형성. 무성흔자는 천민으로 차별받고, 성흔 측정 의식이 성인식이 되었다.' },
]
function fieldDef(k: FieldKey): FieldDef { return FIELDS.find((f) => f.key === k) || FIELDS[0] }

// 일관성 점검 체크리스트 — 탄탄한 체계인지 자가 점검.
const CHECK_Q: { id: string; q: string }[] = [
  { id: 'c1', q: '힘의 원천이 명확하고, 누가 어떻게 얻는지 설명되는가?' },
  { id: 'c2', q: '"무엇이 불가능한가"가 분명한가? (한계 없는 힘은 긴장을 죽인다)' },
  { id: 'c3', q: '대가가 충분히 무겁고 매번 일관되게 적용되는가?' },
  { id: 'c4', q: '금기를 어겼을 때의 결과가 구체적인가?' },
  { id: 'c5', q: '발현 방식이 장면에서 시각적으로 그려지는가?' },
  { id: 'c6', q: '이 힘이 사회·경제·권력 구조에 미친 영향이 드러나는가?' },
  { id: 'c7', q: '주인공이 이 규칙을 영리하게(편법 아님) 활용할 여지가 있는가?' },
  { id: 'c8', q: '체계의 빈틈으로 결말을 "데우스 엑스 마키나"로 풀 위험은 없는가?' },
]

interface CustomField { id: string; label: string; value: string }

interface MagicSystem {
  id: string
  name: string
  tagline: string          // 한 줄 콘셉트
  source: string
  rules: string
  cost: string
  taboo: string
  manifestation: string
  society: string
  notes: string
  checks: Record<string, boolean>
  createdAt: number
  custom: CustomField[]    // 사용자 정의 항목(라벨+자유 입력값)
  etc: string              // 고정 '기타' 자유 입력
}

const LS_KEY = 'sry:tool:magic-system-designer'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): MagicSystem {
  return { id: '', name: '', tagline: '', source: '', rules: '', cost: '', taboo: '', manifestation: '', society: '', notes: '', checks: {}, createdAt: 0, custom: [], etc: '' }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '마법 체계' 문서 본문(HTML) 생성.
function systemBodyHtml(s: MagicSystem): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (t: string) => (t.trim() ? escHtml(t.trim()).replace(/\n/g, '<br>') : dash)
  const parts: string[] = []
  if (s.tagline.trim()) parts.push(`<p><i>${escHtml(s.tagline.trim())}</i></p>`)
  FIELDS.forEach((f) => {
    parts.push(`<p><b>${f.icon} ${escHtml(f.label)}</b><br>${v(s[f.key])}</p>`)
  })
  ;(s.custom || []).forEach((c) => {
    if (c.value.trim()) parts.push(`<p><b>${escHtml(c.label.trim() || '항목')}</b><br>${v(c.value)}</p>`)
  })
  if (s.etc.trim()) parts.push(`<p><b>🗒️ 기타</b><br>${v(s.etc)}</p>`)
  if (s.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${v(s.notes)}</p>`)
  const checked = CHECK_Q.filter((q) => s.checks[q.id])
  if (checked.length) {
    parts.push(`<p><b>✅ 일관성 점검 (${checked.length}/${CHECK_Q.length})</b><br>${checked.map((q) => '· ' + escHtml(q.q)).join('<br>')}</p>`)
  }
  return parts.join('')
}

// 텍스트 내보내기(복사용).
function exportOne(s: MagicSystem): string {
  const lines: string[] = [`# ${s.name || '제목 없는 마법 체계'}`]
  if (s.tagline.trim()) lines.push('', s.tagline.trim())
  FIELDS.forEach((f) => {
    lines.push('', `■ ${f.icon} ${f.label}`, (s[f.key].trim() || '—'))
  })
  ;(s.custom || []).forEach((c) => {
    if (c.value.trim()) lines.push('', `■ ${c.label.trim() || '항목'}`, c.value.trim())
  })
  if (s.etc.trim()) { lines.push('', '🗒️ 기타', s.etc.trim()) }
  if (s.notes.trim()) { lines.push('', '🗒️ 메모', s.notes.trim()) }
  const checked = CHECK_Q.filter((q) => s.checks[q.id])
  lines.push('', `일관성 점검: ${checked.length}/${CHECK_Q.length}`)
  checked.forEach((q) => lines.push(`  [v] ${q.q}`))
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: MagicSystem[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: MagicSystem[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      name: String(x.name || ''),
      tagline: String(x.tagline || ''),
      source: String(x.source || ''),
      rules: String(x.rules || ''),
      cost: String(x.cost || ''),
      taboo: String(x.taboo || ''),
      manifestation: String(x.manifestation || ''),
      society: String(x.society || ''),
      notes: String(x.notes || ''),
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      createdAt: Number(x.createdAt) || Date.now(),
      custom: Array.isArray(x.custom)
        ? x.custom.filter((c: any) => c && typeof c === 'object').map((c: any) => ({ id: String(c.id || newId()), label: String(c.label || ''), value: String(c.value || '') }))
        : [],
      etc: String(x.etc || ''),
    }))
    const openId = typeof p?.openId === 'string' && list.some((s) => s.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function MagicSystemDesigner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<MagicSystem[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<MagicSystem | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 이름 등이 넘어오면 새 폼에 채워 시작(연계 진입).
  useEffect(() => {
    if (!payload) return
    const name = typeof payload.name === 'string' ? payload.name : ''
    const tagline = typeof payload.tagline === 'string' ? payload.tagline : ''
    if (name || tagline) {
      setEditing({ ...emptyForm(), id: newId(), name, tagline })
      setOpenId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 안내 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1800)
    return () => window.clearTimeout(t)
  }, [copied])

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (s: MagicSystem) => { setEditing({ ...s, checks: { ...s.checks } }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.name.trim()) e.name = (e.tagline.trim() || '제목 없는 마법 체계')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((s) => s.id === e.id)
      return exists ? prev.map((s) => (s.id === e.id ? e : s)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((s) => s.id === id)
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
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === targetId)
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
    setList((prev) => prev.map((s) => (s.id === openId ? { ...s, checks: { ...s.checks, [qid]: !s.checks[qid] } } : s)))
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

  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // 프로젝트 연동 — '마법 체계' 문서를 자료(research)/'세계관' 폴더에 추가.
  const toProject = (s: MagicSystem) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    const meta: Record<string, string> = { 원천: s.source.trim().slice(0, 40) || '—', 대가: s.cost.trim().slice(0, 40) || '—' }
    ;(s.custom || []).forEach((c) => {
      const key = c.label.trim()
      if (key && c.value.trim()) meta[key] = c.value.trim().slice(0, 40)
    })
    if (s.etc.trim()) meta.etc = s.etc.trim().slice(0, 40)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: s.name?.trim() ? `마법 체계 — ${s.name.trim()}` : '마법 체계',
      bodyHtml: systemBodyHtml(s),
      synopsis: s.tagline.trim() || undefined,
      icon: '✨',
      meta,
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료에 마법 체계 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 214, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="✨"/></span>
        <strong style={{ fontSize: 15 }}>마법 체계 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 저장됨</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 마법 체계를 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 체계</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 저장 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 저장된 마법 체계가 없어요.<br />오른쪽 위 <b>＋ 새 체계</b>로<br />첫 체계를 설계해 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((s, i) => {
                const active = s.id === openId || (editing && editing.id === s.id)
                const filled = FIELDS.filter((f) => s[f.key].trim()).length
                const cnt = CHECK_Q.filter((q) => s.checks[q.id]).length
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => { dragId.current = s.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) }}
                    onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                    onDrop={() => onDrop(s.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(s.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === s.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '(제목 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <span style={{ color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</span>
                      <span>·</span>
                      <span style={{ color: cnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{CHECK_Q.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(s.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(s.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(s) }} title="수정"><Emoji e="✏️"/></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id) }} title="삭제"><Emoji e="🗑️"/></button>
                    </div>
                    {confirmDel === s.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 체계를 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(s.id) }}>삭제</button>
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
            <FormView editing={editing} setEditing={setEditing} toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit} />
          ) : opened ? (
            <DetailView s={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} copyText={copyText} onToProject={() => toProject(opened)} />
          ) : (
            <div style={empty}>
              왼쪽에서 체계를 고르거나<br /><b>＋ 새 체계</b>로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12 }}>원천 ＋ 규칙·한계 ＋ 대가 ＋ 금기 ＋ 발현 ＋ 사회적 영향<br />— 여섯 기둥으로 탄탄한 마법 체계를 세웁니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 공통 라벨/입력 스타일.
const labelS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
const inputS: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
const areaS: React.CSSProperties = { ...inputS, resize: 'vertical', minHeight: 58, lineHeight: 1.5, fontFamily: 'inherit' }
const fieldS: React.CSSProperties = { marginBottom: 13 }

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: MagicSystem; setEditing: (s: MagicSystem) => void
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof MagicSystem, v: any) => setEditing({ ...editing, [k]: v })
  const filled = FIELDS.filter((f) => editing[f.key].trim()).length
  const checkedCnt = CHECK_Q.filter((q) => editing.checks[q.id]).length

  // 사용자 정의 항목 — 이름 입력받아 빈 입력칸 추가(무작위 생성 안 함).
  const custom = editing.custom || []
  const addCustom = () => {
    const label = (window.prompt('새 항목 이름을 입력하세요', '') || '').trim()
    if (!label) return
    setEditing({ ...editing, custom: [...custom, { id: newId(), label, value: '' }] })
  }
  const setCustomValue = (id: string, value: string) => {
    setEditing({ ...editing, custom: custom.map((c) => (c.id === id ? { ...c, value } : c)) })
  }
  const removeCustom = (id: string) => {
    setEditing({ ...editing, custom: custom.filter((c) => c.id !== id) })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '마법 체계 수정' : '새 마법 체계'}</strong>
        <span style={{ fontSize: 11, color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={fieldS}>
        <div style={labelS}>이름 (비우면 콘셉트로)</div>
        <input style={inputS} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 성흔(星痕) 마법" maxLength={80} />
      </div>
      <div style={fieldS}>
        <div style={labelS}>✦ 한 줄 콘셉트 (선택)</div>
        <input style={inputS} value={editing.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="예: 별의 가호를 받은 자만이 다루는, 기억을 태우는 힘" maxLength={120} />
      </div>

      {FIELDS.map((f) => (
        <div key={f.key} style={fieldS}>
          <div style={labelS}><Emoji e={f.icon}/> {f.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{f.hint}</div>
          <textarea
            style={areaS}
            value={editing[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            placeholder={f.eg}
            maxLength={1200}
          />
        </div>
      ))}

      {/* 사용자 정의 항목 */}
      <div style={fieldS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="➕"/> 사용자 정의 항목</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={addCustom} title="이름을 정해 빈 항목을 추가합니다">＋ 항목 추가</button>
        </div>
        {custom.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>필요한 항목을 직접 만들어 자유롭게 적을 수 있어요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {custom.map((c) => (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...labelS, marginBottom: 0, color: 'var(--text)' }}>{c.label || '항목'}</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
                </div>
                <textarea style={areaS} value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder={`${c.label || '항목'} 내용을 직접 적어 주세요`} maxLength={1200} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 고정 '기타' */}
      <div style={fieldS}>
        <div style={labelS}><Emoji e="🗒️"/> 기타</div>
        <textarea style={{ ...areaS, minHeight: 84 }} value={editing.etc} onChange={(e) => set('etc', e.target.value)} placeholder="위 항목에 담기 어려운 내용을 자유롭게 적어 주세요." maxLength={4000} />
      </div>

      <div style={fieldS}>
        <div style={labelS}><Emoji e="🗒️"/> 메모 (선택)</div>
        <textarea style={areaS} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="아이디어, 변형 유파, 미해결 질문 등" maxLength={1000} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="✅"/> 일관성 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  s: MagicSystem; onEdit: () => void; toggleCheck: (qid: string) => void
  copyText: (t: string, label?: string) => void; onToProject: () => void
}) {
  const { s, onEdit, toggleCheck, copyText, onToProject } = props
  const linked = hasProjectBridge()
  const checkedCnt = CHECK_Q.filter((q) => s.checks[q.id]).length

  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 15 }}>{s.name}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(s), '복사됨')} title="이 체계를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️"/> 수정</button>
      </div>
      {s.tagline.trim() && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>{s.tagline}</div>}

      {FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}><Emoji e={f.icon}/> {f.label}</div>
          <div style={valS}>{s[f.key].trim() ? s[f.key] : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
        </div>
      ))}

      {(s.custom || []).filter((c) => c.value.trim()).map((c) => (
        <div key={c.id} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}>{c.label || '항목'}</div>
          <div style={valS}>{c.value}</div>
        </div>
      ))}

      {s.etc.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelS}><Emoji e="🗒️"/> 기타</div>
          <div style={valS}>{s.etc}</div>
        </div>
      )}

      {s.notes.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelS}><Emoji e="🗒️"/> 메모</div>
          <div style={valS}>{s.notes}</div>
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="✅"/> 일관성 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={s.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          답이 망설여지는 항목이 곧 체계의 빈틈입니다. 한계와 대가가 분명할수록 마법은 더 매력적이 됩니다.
        </div>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 마법 체계를 프로젝트 자료(세계관 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>
    </div>
  )
}

// ── 공통 체크리스트 ──
function CheckList(props: { checks: Record<string, boolean>; toggle: (qid: string) => void }) {
  const { checks, toggle } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {CHECK_Q.map((q) => {
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
