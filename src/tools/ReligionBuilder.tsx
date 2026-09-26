// 신앙·신화 체계 설계기 — 작품 세계의 종교를 일관되게 설계한다.
// 핵심 항목: 신·신적 존재(deities)/창조·기원 신화(myth)/교리·믿음(doctrine)/의례·축제(rites)/
//   성직 구조·조직(clergy)/금기·계율(taboo)/내세관·사후세계(afterlife)/이단·분파·박해(heresy).
// 각 항목에 예시 힌트를 주고, 여러 종교를 저장·수정·삭제·순서 변경(드래그)한다.
// 깊이를 더하는 "설계 질문" 체크리스트로 빈틈을 자가 점검한다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:religion-builder' 자동 저장/복원.
// 연계(linkbus): 설계한 종교를 실제 프로젝트 자료('research')/'세계관' 폴더에 '종교' 문서로 추가한다(addToProject).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'religion-builder', name: '신앙·신화 설계기', icon: '⛩️', group: '구상·정리', intro: '신·창조신화·교리·의례·성직·금기·내세·이단으로 작품 세계의 종교를 설계하세요', w: 640, h: 600 }

// 종교의 여덟 핵심 항목 정의 — 라벨/아이콘/도움말/예시 placeholder.
interface FieldDef { key: FieldKey; label: string; icon: string; hint: string; eg: string }
type FieldKey = 'deities' | 'myth' | 'doctrine' | 'rites' | 'clergy' | 'taboo' | 'afterlife' | 'heresy'
const FIELDS: FieldDef[] = [
  { key: 'deities', label: '신·신적 존재', icon: '🌟', hint: '누구를(무엇을) 믿는가 — 신의 수·성격·권능·관계', eg: '예: 일곱 빛의 신 "테아". 그 아래로 계절을 다스리는 사계의 화신들. 신은 직접 모습을 드러내지 않고 별빛으로만 말한다.' },
  { key: 'myth', label: '창조·기원 신화', icon: '📜', hint: '세계와 인간은 어떻게 생겨났는가 — 시작과 끝의 이야기', eg: '예: 태초의 어둠 속에서 테아가 자신의 눈을 뽑아 첫 별을 밝혔고, 그 빛의 부스러기에서 인간이 태어났다.' },
  { key: 'doctrine', label: '교리·핵심 믿음', icon: '📖', hint: '무엇을 옳다 여기고 어떻게 살라 하는가 — 가르침·세계관', eg: '예: 모든 생명은 빌려온 빛이며, 죽을 때 더 밝게 갚아야 한다. 어둠을 두려워 말고 끌어안아 빛으로 바꾸라.' },
  { key: 'rites', label: '의례·축제', icon: '🕯️', hint: '믿음을 어떻게 행하는가 — 예배·통과의례·절기·성지', eg: '예: 동지에 모든 불을 끄고 별을 세는 "장야제". 성인이 되면 손바닥에 별 문양을 새기는 점등식.' },
  { key: 'clergy', label: '성직 구조·조직', icon: '⛪', hint: '누가 신과 사람을 잇는가 — 위계·권력·선발·수입', eg: '예: 최상위 "별의 눈" 대사제 한 명, 그 아래 빛지기·등불사·견습. 사제는 결혼이 금지되고 십일조로 운영된다.' },
  { key: 'taboo', label: '금기·계율', icon: '⛔', hint: '절대 해서는 안 되는 것 — 어기면 받는 벌·정화', eg: '예: 밤에 산 자의 이름을 부르는 것은 금기. 어기면 별이 그 영혼을 데려간다 믿어 7일간 빛을 멀리하는 정화를 한다.' },
  { key: 'afterlife', label: '내세관·사후세계', icon: '🌌', hint: '죽으면 어디로 가는가 — 영혼·심판·구원·환생', eg: '예: 선한 영혼은 별이 되어 밤하늘에 오르고, 빛을 갚지 못한 영혼은 새벽에 스러져 다시 어둠으로 돌아간다.' },
  { key: 'heresy', label: '이단·분파·박해', icon: '🔥', hint: '믿음은 어떻게 갈라지고 충돌하는가 — 분파·이단·탄압', eg: '예: "어둠도 신성하다" 주장하는 흑성파는 이단으로 몰려 화형당했다. 변방에는 옛 달의 신을 섬기는 토착 신앙이 남아 있다.' },
]
function fieldDef(k: FieldKey): FieldDef { return FIELDS.find((f) => f.key === k) || FIELDS[0] }

// 설계 질문 체크리스트 — 종교가 입체적이고 이야기와 맞물리는지 자가 점검.
const CHECK_Q: { id: string; q: string }[] = [
  { id: 'c1', q: '신이 실재하며 세상에 개입하는가, 아니면 믿음만 있고 증거는 없는가?' },
  { id: 'c2', q: '이 종교가 평범한 사람의 하루(인사·식사·관혼상제)에 어떻게 스며들어 있는가?' },
  { id: 'c3', q: '신앙이 정치·경제·계급 등 권력 구조와 어떻게 얽혀 있는가?' },
  { id: 'c4', q: '신자가 "잘못 살았다"고 느끼는 죄·타락의 기준이 분명한가?' },
  { id: 'c5', q: '교리에 모순이나 빈틈이 있어 분파·이단이 갈라질 여지가 있는가?' },
  { id: 'c6', q: '이 종교를 믿지 않는 사람·다른 신앙은 어떻게 취급되는가?' },
  { id: 'c7', q: '주인공의 갈등·선택이 이 종교와 부딪치거나 흔들리는 지점이 있는가?' },
  { id: 'c8', q: '의례·상징·성물이 장면에서 시각적·감각적으로 그려질 만큼 구체적인가?' },
]

interface Religion {
  id: string
  name: string
  tagline: string          // 한 줄 콘셉트
  deities: string
  myth: string
  doctrine: string
  rites: string
  clergy: string
  taboo: string
  afterlife: string
  heresy: string
  notes: string
  checks: Record<string, boolean>
  custom: { id: string; label: string; value: string }[]   // 사용자 정의 항목(라벨 + 자유 입력)
  etc: string                                               // 고정 '기타' 자유 입력
  createdAt: number
}

const LS_KEY = 'sry:tool:religion-builder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Religion {
  return { id: '', name: '', tagline: '', deities: '', myth: '', doctrine: '', rites: '', clergy: '', taboo: '', afterlife: '', heresy: '', notes: '', checks: {}, custom: [], etc: '', createdAt: 0 }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '종교' 문서 본문(HTML) 생성.
function religionBodyHtml(r: Religion): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (t: string) => (t.trim() ? escHtml(t.trim()).replace(/\n/g, '<br>') : dash)
  const parts: string[] = []
  if (r.tagline.trim()) parts.push(`<p><i>${escHtml(r.tagline.trim())}</i></p>`)
  FIELDS.forEach((f) => {
    parts.push(`<p><b>${f.icon} ${escHtml(f.label)}</b><br>${v(r[f.key])}</p>`)
  })
  r.custom.forEach((c) => {
    if (c.value.trim()) parts.push(`<p><b>➕ ${escHtml(c.label.trim() || '항목')}</b><br>${v(c.value)}</p>`)
  })
  if (r.etc.trim()) parts.push(`<p><b>🧩 기타</b><br>${v(r.etc)}</p>`)
  if (r.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${v(r.notes)}</p>`)
  const checked = CHECK_Q.filter((q) => r.checks[q.id])
  if (checked.length) {
    parts.push(`<p><b>✅ 설계 질문 점검 (${checked.length}/${CHECK_Q.length})</b><br>${checked.map((q) => '· ' + escHtml(q.q)).join('<br>')}</p>`)
  }
  return parts.join('')
}

// 텍스트 내보내기(복사용).
function exportOne(r: Religion): string {
  const lines: string[] = [`# ${r.name || '이름 없는 종교'}`]
  if (r.tagline.trim()) lines.push('', r.tagline.trim())
  FIELDS.forEach((f) => {
    lines.push('', `■ ${f.icon} ${f.label}`, (r[f.key].trim() || '—'))
  })
  r.custom.forEach((c) => {
    if (c.value.trim()) lines.push('', `■ ➕ ${c.label.trim() || '항목'}`, c.value.trim())
  })
  if (r.etc.trim()) { lines.push('', '🧩 기타', r.etc.trim()) }
  if (r.notes.trim()) { lines.push('', '🗒️ 메모', r.notes.trim()) }
  const checked = CHECK_Q.filter((q) => r.checks[q.id])
  lines.push('', `설계 질문 점검: ${checked.length}/${CHECK_Q.length}`)
  checked.forEach((q) => lines.push(`  [v] ${q.q}`))
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Religion[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Religion[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      name: String(x.name || ''),
      tagline: String(x.tagline || ''),
      deities: String(x.deities || ''),
      myth: String(x.myth || ''),
      doctrine: String(x.doctrine || ''),
      rites: String(x.rites || ''),
      clergy: String(x.clergy || ''),
      taboo: String(x.taboo || ''),
      afterlife: String(x.afterlife || ''),
      heresy: String(x.heresy || ''),
      notes: String(x.notes || ''),
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      custom: Array.isArray(x.custom)
        ? x.custom.filter((c: any) => c && typeof c === 'object').map((c: any) => ({ id: String(c.id || newId()), label: String(c.label || ''), value: String(c.value || '') }))
        : [],
      etc: String(x.etc || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((r) => r.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function ReligionBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Religion[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Religion | null>(null)
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
  const startEdit = (r: Religion) => { setEditing({ ...r, checks: { ...r.checks }, custom: r.custom.map((c) => ({ ...c })) }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.name.trim()) e.name = (e.tagline.trim() || '이름 없는 종교')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((r) => r.id === e.id)
      return exists ? prev.map((r) => (r.id === e.id ? e : r)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((r) => r.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((r) => r.id === id)
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
      const fi = prev.findIndex((r) => r.id === from)
      const ti = prev.findIndex((r) => r.id === targetId)
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
    setList((prev) => prev.map((r) => (r.id === openId ? { ...r, checks: { ...r.checks, [qid]: !r.checks[qid] } } : r)))
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

  // 프로젝트 연동 — '종교' 문서를 자료(research)/'세계관' 폴더에 추가.
  const toProject = (r: Religion) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    // 커스텀 항목·기타도 메타(필드)에 실어 다른 도구(DB/인스펙터 등)에 그대로 나타나게 한다.
    const meta: Record<string, string> = { 신: r.deities.trim().slice(0, 40) || '—', 내세: r.afterlife.trim().slice(0, 40) || '—' }
    r.custom.forEach((c) => { const label = c.label.trim(); if (label && c.value.trim() && !meta[label]) meta[label] = c.value.trim().slice(0, 80) })
    if (r.etc.trim() && !meta['기타']) meta['기타'] = r.etc.trim().slice(0, 80)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: r.name?.trim() ? `종교 — ${r.name.trim()}` : '종교',
      bodyHtml: religionBodyHtml(r),
      synopsis: r.tagline.trim() || undefined,
      icon: '⛩️',
      meta,
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료에 종교 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((r) => r.id === openId) || null : null

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
        <span style={{ fontSize: 18 }}><Emoji e="⛩️" /></span>
        <strong style={{ fontSize: 15 }}>신앙·신화 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 저장됨</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 종교를 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 종교</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 저장 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 저장된 종교가 없어요.<br />오른쪽 위 <b>＋ 새 종교</b>로<br />첫 신앙을 설계해 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((r, i) => {
                const active = r.id === openId || (editing && editing.id === r.id)
                const filled = FIELDS.filter((f) => r[f.key].trim()).length
                const cnt = CHECK_Q.filter((q) => r.checks[q.id]).length
                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() => { dragId.current = r.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== r.id) setDragOver(r.id) }}
                    onDragLeave={() => { if (dragOver === r.id) setDragOver(null) }}
                    onDrop={() => onDrop(r.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(r.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === r.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '(이름 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <span style={{ color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</span>
                      <span>·</span>
                      <span style={{ color: cnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{CHECK_Q.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(r.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(r.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(r) }} title="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(r.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === r.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 종교를 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(r.id) }}>삭제</button>
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
            <DetailView r={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} copyText={copyText} onToProject={() => toProject(opened)} />
          ) : (
            <div style={empty}>
              왼쪽에서 종교를 고르거나<br /><b>＋ 새 종교</b>로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12 }}>신 ＋ 창조신화 ＋ 교리 ＋ 의례 ＋ 성직 구조 ＋ 금기 ＋ 내세관 ＋ 이단<br />— 여덟 기둥으로 살아 있는 신앙을 세웁니다.</span>
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
  editing: Religion; setEditing: (r: Religion) => void
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof Religion, v: any) => setEditing({ ...editing, [k]: v })
  const filled = FIELDS.filter((f) => editing[f.key].trim()).length
  const checkedCnt = CHECK_Q.filter((q) => editing.checks[q.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '종교 수정' : '새 종교'}</strong>
        <span style={{ fontSize: 11, color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={fieldS}>
        <div style={labelS}>이름 (비우면 콘셉트로)</div>
        <input style={inputS} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 별빛 교단 (테아 신앙)" maxLength={80} />
      </div>
      <div style={fieldS}>
        <div style={labelS}>✦ 한 줄 콘셉트 (선택)</div>
        <input style={inputS} value={editing.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="예: 빛은 빌려온 것이니, 죽을 때 더 밝게 갚으라" maxLength={120} />
      </div>

      {FIELDS.map((f) => (
        <div key={f.key} style={fieldS}>
          <div style={labelS}><Emoji e={f.icon} /> {f.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{f.hint}</div>
          <textarea
            style={areaS}
            value={editing[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            placeholder={f.eg}
            maxLength={1500}
          />
        </div>
      ))}

      {/* 사용자 정의 항목 — 라벨을 직접 정하고 내용을 자유롭게 적는다(무작위 생성 없음). */}
      {editing.custom.map((c) => (
        <div key={c.id} style={fieldS}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="➕" /> {c.label.trim() || '(이름 없는 항목)'}</span>
            <span style={{ flex: 1 }} />
            <button
              className="minibtn"
              style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }}
              title="이 항목 삭제"
              onClick={() => set('custom', editing.custom.filter((x) => x.id !== c.id))}
            >✕</button>
          </div>
          <textarea
            style={areaS}
            value={c.value}
            onChange={(e) => set('custom', editing.custom.map((x) => (x.id === c.id ? { ...x, value: e.target.value } : x)))}
            placeholder={`'${c.label.trim() || '항목'}' 내용을 직접 적어 보세요`}
            maxLength={1500}
          />
        </div>
      ))}

      <div style={fieldS}>
        <button
          className="minibtn"
          style={{ fontSize: 12 }}
          title="원하는 이름의 항목을 직접 추가합니다"
          onClick={() => {
            const label = window.prompt('추가할 항목 이름을 적어 주세요 (예: 성물, 달력, 음악, 복식)')
            const t = (label || '').trim()
            if (!t) return
            set('custom', [...editing.custom, { id: newId(), label: t, value: '' }])
          }}
        >＋ 항목 추가</button>
      </div>

      <div style={fieldS}>
        <div style={labelS}><Emoji e="🧩" /> 기타</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>위 항목에 담기 어려운 내용을 자유롭게 적어 두세요.</div>
        <textarea
          style={{ ...areaS, minHeight: 90 }}
          value={editing.etc}
          onChange={(e) => set('etc', e.target.value)}
          placeholder="예: 다른 종교와의 관계, 역사적 사건, 미정 설정, 참고 자료 등 무엇이든 자유롭게"
          maxLength={4000}
        />
      </div>

      <div style={fieldS}>
        <div style={labelS}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={areaS} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="아이디어, 실제 신화에서 빌려온 모티프, 미해결 질문 등" maxLength={1000} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="✅" /> 설계 질문 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  r: Religion; onEdit: () => void; toggleCheck: (qid: string) => void
  copyText: (t: string, label?: string) => void; onToProject: () => void
}) {
  const { r, onEdit, toggleCheck, copyText, onToProject } = props
  const linked = hasProjectBridge()
  const checkedCnt = CHECK_Q.filter((q) => r.checks[q.id]).length

  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 15 }}>{r.name}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(r), '복사됨')} title="이 종교를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>
      {r.tagline.trim() && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>{r.tagline}</div>}

      {FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}><Emoji e={f.icon} /> {f.label}</div>
          <div style={valS}>{r[f.key].trim() ? r[f.key] : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
        </div>
      ))}

      {r.custom.filter((c) => c.value.trim()).map((c) => (
        <div key={c.id} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}><Emoji e="➕" /> {c.label.trim() || '항목'}</div>
          <div style={valS}>{c.value}</div>
        </div>
      ))}

      {r.etc.trim() && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}><Emoji e="🧩" /> 기타</div>
          <div style={valS}>{r.etc}</div>
        </div>
      )}

      {r.notes.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelS}><Emoji e="🗒️" /> 메모</div>
          <div style={valS}>{r.notes}</div>
        </div>
      )}

      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...labelS, marginBottom: 0 }}><Emoji e="✅" /> 설계 질문 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={r.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          답이 망설여지는 항목이 곧 신앙의 빈틈입니다. 일상에 스며들고 권력과 얽힐수록 종교는 더 살아 있게 됩니다.
        </div>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 종교를 프로젝트 자료(세계관 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
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
