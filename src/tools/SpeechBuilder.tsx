// 연설/발표 구조 빌더 — 후킹(도입) → 핵심 메시지 → 근거 3개(에토스/파토스/로고스) → 반론 대응 → 행동 촉구(콜투액션)
// 의 흐름으로 발표를 구조화하고, 말수(어절) 기반으로 예상 발표 시간을 추정한다.
// 여러 연설을 저장·수정·삭제·순서 변경하며, 한 줄 흐름 요약을 자동 생성한다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:speech-builder' 자동 저장/복원.
// 연계(linkbus): 완성한 연설을 실제 프로젝트 자료('research')의 '연설' 폴더에 대본 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'speech-builder', name: '연설 구조 빌더', icon: '🎤', group: '구상·정리', intro: '후킹·핵심 메시지·근거 3개·반론 대응·행동 촉구로 발표를 설계하고 예상 시간을 봅니다', w: 660, h: 600 }

// ── 설득 호소 유형(에토스/파토스/로고스) ──
type AppealType = 'ethos' | 'pathos' | 'logos'
interface AppealDef { key: AppealType; label: string; icon: string; hint: string }
const APPEALS: AppealDef[] = [
  { key: 'ethos', label: '에토스', icon: '🏛️', hint: '신뢰·권위·인격 — 화자가 믿을 만함(경력, 사례, 공신력)' },
  { key: 'pathos', label: '파토스', icon: '❤️', hint: '감정·공감 — 청중의 마음을 움직임(이야기, 두려움, 희망)' },
  { key: 'logos', label: '로고스', icon: '📊', hint: '논리·근거 — 사실로 설득(데이터, 통계, 인과)' },
]
function appealDef(t: AppealType): AppealDef { return APPEALS.find((a) => a.key === t) || APPEALS[0] }

// 근거 슬롯: 호소 유형 + 주장 한 문장 + 뒷받침(예시/데이터)
interface Evidence { type: AppealType; claim: string; support: string }
function emptyEvidence(type: AppealType): Evidence { return { type, claim: '', support: '' } }

// 발표 점검 체크리스트 — 전달력·구조 점검 항목.
const CHECK_Q: { id: string; q: string }[] = [
  { id: 'c1', q: '첫 15초(후킹)가 청중의 시선을 붙잡는가?' },
  { id: 'c2', q: '핵심 메시지를 한 문장으로 말할 수 있는가?' },
  { id: 'c3', q: '근거 3개가 서로 다른 각도(신뢰·감정·논리)를 짚는가?' },
  { id: 'c4', q: '가장 강한 반론을 미리 인정하고 답했는가?' },
  { id: 'c5', q: '행동 촉구가 구체적이고 즉시 실행 가능한가?' },
  { id: 'c6', q: '주어진 시간 안에 들어오는가? (예상 시간 확인)' },
  { id: 'c7', q: '도입의 후킹과 마무리가 서로 호응(수미상관)하는가?' },
]

interface Speech {
  id: string
  title: string
  audience: string       // 청중
  goal: string           // 발표 목표(원하는 반응)
  hook: string           // 후킹(도입)
  coreMessage: string    // 핵심 메시지(한 문장)
  evidences: Evidence[]  // 근거 3개
  rebuttal: string       // 예상 반론
  rebuttalAnswer: string // 반론 대응
  cta: string            // 행동 촉구(콜투액션)
  wpm: number            // 분당 말수(어절) — 예상 시간 계산용
  checks: Record<string, boolean>
  notes: string
  createdAt: number
}

const LS_KEY = 'sry:tool:speech-builder'
const DEFAULT_WPM = 110 // 한국어 발표 평균: 분당 약 110어절(또렷한 속도)

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Speech {
  return {
    id: '', title: '', audience: '', goal: '', hook: '', coreMessage: '',
    evidences: [emptyEvidence('ethos'), emptyEvidence('pathos'), emptyEvidence('logos')],
    rebuttal: '', rebuttalAnswer: '', cta: '', wpm: DEFAULT_WPM, checks: {}, notes: '', createdAt: 0,
  }
}

// ── 말수(어절) 세기: 공백 기준 토큰 수 ──
function countWords(s: string): number {
  const t = (s || '').trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}
// 연설 전체 대본에 포함되는 텍스트들을 모아 총 어절 수 계산.
function totalWords(c: Speech): number {
  const parts = [c.hook, c.coreMessage, c.rebuttal, c.rebuttalAnswer, c.cta]
  c.evidences.forEach((e) => { parts.push(e.claim, e.support) })
  return parts.reduce((sum, p) => sum + countWords(p), 0)
}
// 예상 시간(초) — 어절 수 / 분당 어절 × 60.
function estimateSeconds(c: Speech): number {
  const w = totalWords(c)
  const wpm = c.wpm > 0 ? c.wpm : DEFAULT_WPM
  return Math.round((w / wpm) * 60)
}
function fmtDuration(sec: number): string {
  if (sec <= 0) return '0초'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}초`
  if (s === 0) return `${m}분`
  return `${m}분 ${s}초`
}

// 한 줄 흐름 요약 — 후킹 → 핵심 → 행동 촉구로 골격을 조립.
function summarize(c: Speech): string {
  const core = c.coreMessage.trim()
  const cta = c.cta.trim()
  if (!core && !cta && !c.hook.trim()) return '아직 비어 있는 연설입니다. 후킹과 핵심 메시지부터 채워 보세요.'
  const head = c.hook.trim() ? `「${trunc(c.hook.trim(), 40)}」(으)로 시작해` : '도입에 이어'
  const mid = core ? ` "${trunc(core, 50)}"을(를) 전하고` : ' 핵심 메시지를 전하고'
  const tail = cta ? `, 끝으로 "${trunc(cta, 40)}"을(를) 촉구합니다.` : ', 행동을 촉구하며 마칩니다.'
  return head + mid + tail
}
function trunc(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + '…' : s }

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '연설 대본' 문서 본문(HTML) 생성.
function speechBodyHtml(c: Speech): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
  const parts: string[] = []
  parts.push(`<p><b>흐름 요약:</b> ${escHtml(summarize(c))}</p>`)
  const meta: string[] = []
  if (c.audience.trim()) meta.push(`👥 청중: ${escHtml(c.audience.trim())}`)
  if (c.goal.trim()) meta.push(`🎯 목표: ${escHtml(c.goal.trim())}`)
  meta.push(`⏱️ 예상 시간: ${escHtml(fmtDuration(estimateSeconds(c)))} (약 ${totalWords(c)}어절 · ${c.wpm}어절/분)`)
  parts.push(`<p>${meta.join('<br>')}</p>`)
  parts.push(`<p><b>1) 🎣 후킹 (도입)</b><br>${v(c.hook)}</p>`)
  parts.push(`<p><b>2) 💡 핵심 메시지</b><br>${v(c.coreMessage)}</p>`)
  parts.push('<p><b>3) 📌 근거 3개</b></p>')
  c.evidences.forEach((e, i) => {
    const d = appealDef(e.type)
    parts.push(`<p style="margin-left:1em">${i + 1}. ${d.icon} <b>${escHtml(d.label)}</b> — ${v(e.claim)}<br>${e.support.trim() ? '↳ ' + escHtml(e.support.trim()) : dash}</p>`)
  })
  parts.push(`<p><b>4) 🛡️ 반론 대응</b><br>예상 반론: ${v(c.rebuttal)}<br>대응: ${v(c.rebuttalAnswer)}</p>`)
  parts.push(`<p><b>5) 🚀 행동 촉구 (콜투액션)</b><br>${v(c.cta)}</p>`)
  if (c.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${escHtml(c.notes.trim())}</p>`)
  return parts.join('')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function normEvidences(x: any): Evidence[] {
  const types: AppealType[] = ['ethos', 'pathos', 'logos']
  const arr = Array.isArray(x) ? x : []
  const out: Evidence[] = arr.slice(0, 6).map((e: any, i: number) => ({
    type: (types.includes(e?.type) ? e.type : types[i % 3]) as AppealType,
    claim: String(e?.claim || ''),
    support: String(e?.support || ''),
  }))
  // 최소 3개 보장(에토스/파토스/로고스 기본 슬롯)
  while (out.length < 3) out.push(emptyEvidence(types[out.length % 3]))
  return out
}
function loadState(): { list: Speech[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Speech[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      title: String(x.title || ''),
      audience: String(x.audience || ''),
      goal: String(x.goal || ''),
      hook: String(x.hook || ''),
      coreMessage: String(x.coreMessage || ''),
      evidences: normEvidences(x.evidences),
      rebuttal: String(x.rebuttal || ''),
      rebuttalAnswer: String(x.rebuttalAnswer || ''),
      cta: String(x.cta || ''),
      wpm: Number(x.wpm) > 0 ? Math.min(400, Math.round(Number(x.wpm))) : DEFAULT_WPM,
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      notes: String(x.notes || ''),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function SpeechBuilder() {
  const init = useRef(loadState())
  const [list, setList] = useState<Speech[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Speech | null>(null)
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

  // 복사/안내 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1800)
    return () => window.clearTimeout(t)
  }, [copied])

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (c: Speech) => { setEditing({ ...c, evidences: c.evidences.map((e) => ({ ...e })), checks: { ...c.checks } }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.title.trim()) e.title = (trunc(e.coreMessage.trim(), 30) || trunc(e.hook.trim(), 30) || '제목 없는 연설')
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

  // 텍스트 대본 내보내기.
  const exportOne = (c: Speech): string => {
    const lines = [
      `# ${c.title}`,
      '',
      `흐름: ${summarize(c)}`,
      '',
      `· 청중: ${c.audience || '—'}`,
      `· 목표: ${c.goal || '—'}`,
      `· 예상 시간: ${fmtDuration(estimateSeconds(c))} (약 ${totalWords(c)}어절 · ${c.wpm}어절/분)`,
      '',
      `1) 후킹: ${c.hook || '—'}`,
      `2) 핵심 메시지: ${c.coreMessage || '—'}`,
      '3) 근거 3개:',
    ]
    c.evidences.forEach((e, i) => {
      const d = appealDef(e.type)
      lines.push(`   ${i + 1}. [${d.label}] ${e.claim || '—'}`)
      if (e.support.trim()) lines.push(`      ↳ ${e.support.trim()}`)
    })
    lines.push(
      `4) 반론 대응:`,
      `   예상 반론: ${c.rebuttal || '—'}`,
      `   대응: ${c.rebuttalAnswer || '—'}`,
      `5) 행동 촉구: ${c.cta || '—'}`,
    )
    if (c.notes.trim()) { lines.push('', `메모: ${c.notes.trim()}`) }
    const checked = CHECK_Q.filter((q) => c.checks[q.id])
    lines.push('', `발표 점검: ${checked.length}/${CHECK_Q.length}`)
    checked.forEach((q) => lines.push(`  [v] ${q.q}`))
    return lines.join('\n')
  }
  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // 프로젝트 연동 — '연설 대본' 문서를 자료(research)/'연설' 폴더에 추가.
  const toProject = (c: Speech) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '연설',
      title: c.title?.trim() ? `연설 — ${c.title.trim()}` : '연설 대본',
      bodyHtml: speechBodyHtml(c),
      synopsis: summarize(c),
      meta: { 청중: c.audience.trim() || '—', 예상시간: fmtDuration(estimateSeconds(c)) },
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료에 연설 대본 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((c) => c.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 218, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🎤" /></span>
        <strong style={{ fontSize: 15 }}>연설 구조 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 저장됨</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 연설을 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 연설</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 저장 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 저장된 연설이 없어요.<br />오른쪽 위 <b>＋ 새 연설</b>로<br />첫 발표를 설계해 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((c, i) => {
                const active = c.id === openId || (editing && editing.id === c.id)
                const cnt = CHECK_Q.filter((q) => c.checks[q.id]).length
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
                      <span><Emoji e="⏱️" /> {fmtDuration(estimateSeconds(c))}</span>
                      <span>·</span>
                      <span style={{ color: cnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{CHECK_Q.length}</span>
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
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 연설을 삭제할까요?</div>
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
            <FormView editing={editing} setEditing={setEditing} toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit} />
          ) : opened ? (
            <DetailView c={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} copyText={copyText} exportOne={exportOne} onToProject={() => toProject(opened)} />
          ) : (
            <div style={empty}>
              왼쪽에서 연설을 고르거나<br /><b>＋ 새 연설</b>로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12 }}>후킹 → 핵심 메시지 → 근거 3개 → 반론 대응 → 행동 촉구<br />흐름으로 발표가 구조화되고, 예상 시간이 자동 계산됩니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 공통 입력 스타일 ──
const stLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
const stInput: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
const stArea: React.CSSProperties = { ...stInput, resize: 'vertical', minHeight: 52, lineHeight: 1.5, fontFamily: 'inherit' }
const stField: React.CSSProperties = { marginBottom: 12 }

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Speech; setEditing: (c: Speech) => void
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof Speech, v: any) => setEditing({ ...editing, [k]: v })
  const setEv = (i: number, patch: Partial<Evidence>) => {
    const evs = editing.evidences.map((e, idx) => (idx === i ? { ...e, ...patch } : e))
    setEditing({ ...editing, evidences: evs })
  }
  const addEv = () => setEditing({ ...editing, evidences: [...editing.evidences, emptyEvidence('logos')] })
  const removeEv = (i: number) => setEditing({ ...editing, evidences: editing.evidences.filter((_, idx) => idx !== i) })

  const sec = estimateSeconds(editing)
  const words = totalWords(editing)
  const checkedCnt = CHECK_Q.filter((q) => editing.checks[q.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '연설 수정' : '새 연설 설계'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={stField}>
        <div style={stLabel}>제목 (비우면 핵심 메시지로)</div>
        <input style={stInput} value={editing.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 신제품 발표 — 왜 지금인가" maxLength={80} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ ...stField, flex: 1 }}>
          <div style={stLabel}><Emoji e="👥" /> 청중</div>
          <input style={stInput} value={editing.audience} onChange={(e) => set('audience', e.target.value)} placeholder="예: 투자자, 신입사원" maxLength={60} />
        </div>
        <div style={{ ...stField, flex: 1 }}>
          <div style={stLabel}><Emoji e="🎯" /> 발표 목표 (원하는 반응)</div>
          <input style={stInput} value={editing.goal} onChange={(e) => set('goal', e.target.value)} placeholder="예: 투자 결정을 끌어내기" maxLength={80} />
        </div>
      </div>

      {/* 예상 시간 미터 */}
      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⏱️" /> 예상 발표 시간</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{fmtDuration(sec)}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          약 <b>{words}</b>어절 기준<br />말 속도: {editing.wpm}어절/분
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>말 속도</span>
          <input
            type="range" min={60} max={200} step={5}
            value={editing.wpm}
            onChange={(e) => set('wpm', Number(e.target.value))}
            style={{ width: 120, accentColor: 'var(--accent)' }}
            title="분당 어절 수(느린 60 ~ 빠른 200)"
          />
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{editing.wpm}</span>
        </div>
      </div>

      <div style={stField}>
        <div style={stLabel}>1) <Emoji e="🎣" /> 후킹 — 도입 (첫 15초)</div>
        <textarea style={stArea} value={editing.hook} onChange={(e) => set('hook', e.target.value)} placeholder="질문·충격적 사실·짧은 이야기로 시선을 붙잡기. 예: 매일 우리는 3시간을 이것에 쓰고 있습니다." maxLength={400} />
      </div>
      <div style={stField}>
        <div style={stLabel}>2) <Emoji e="💡" /> 핵심 메시지 — 한 문장으로</div>
        <textarea style={stArea} value={editing.coreMessage} onChange={(e) => set('coreMessage', e.target.value)} placeholder="청중이 단 하나만 기억해야 할 문장. 예: 작은 습관이 1년 뒤 인생을 바꿉니다." maxLength={200} />
      </div>

      {/* 근거 3개 (에토스/파토스/로고스) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...stLabel, marginBottom: 0 }}>3) <Emoji e="📌" /> 근거 — 에토스·파토스·로고스</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={addEv} title="근거 추가">＋ 근거</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {editing.evidences.map((ev, i) => {
            const d = appealDef(ev.type)
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 10, background: 'var(--panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{i + 1}.</span>
                  {APPEALS.map((a) => (
                    <button
                      key={a.key}
                      className={'minibtn' + (ev.type === a.key ? ' active' : '')}
                      style={{ padding: '3px 8px', fontSize: 11, borderColor: ev.type === a.key ? 'var(--accent)' : 'var(--border)', background: ev.type === a.key ? 'var(--chrome-2)' : undefined }}
                      onClick={() => setEv(i, { type: a.key })}
                      title={a.hint}
                    ><Emoji e={a.icon} /> {a.label}</button>
                  ))}
                  <span style={{ flex: 1 }} />
                  {editing.evidences.length > 1 && (
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeEv(i)} title="이 근거 삭제">✕</button>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 6 }}><Emoji e={d.icon} /> {d.hint}</div>
                <input style={{ ...stInput, marginBottom: 6 }} value={ev.claim} onChange={(e) => setEv(i, { claim: e.target.value })} placeholder={`주장 한 문장 (${d.label})`} maxLength={200} />
                <textarea style={{ ...stArea, minHeight: 40 }} value={ev.support} onChange={(e) => setEv(i, { support: e.target.value })} placeholder="뒷받침: 예시·데이터·경험·인용 등" maxLength={300} />
              </div>
            )
          })}
        </div>
      </div>

      {/* 반론 대응 */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 10, background: 'var(--panel)', marginBottom: 14 }}>
        <div style={{ ...stLabel, marginBottom: 8 }}>4) <Emoji e="🛡️" /> 반론 대응</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>예상 반론 (청중이 가질 의문)</div>
          <textarea style={{ ...stArea, minHeight: 40 }} value={editing.rebuttal} onChange={(e) => set('rebuttal', e.target.value)} placeholder="예: 시간이 너무 오래 걸리지 않나요?" maxLength={300} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>대응 (인정 후 반박)</div>
          <textarea style={{ ...stArea, minHeight: 40 }} value={editing.rebuttalAnswer} onChange={(e) => set('rebuttalAnswer', e.target.value)} placeholder="예: 처음엔 그렇지만, 둘째 주부터는 오히려 시간이 절약됩니다." maxLength={300} />
        </div>
      </div>

      <div style={stField}>
        <div style={stLabel}>5) <Emoji e="🚀" /> 행동 촉구 — 콜투액션</div>
        <textarea style={stArea} value={editing.cta} onChange={(e) => set('cta', e.target.value)} placeholder="청중이 지금 당장 할 한 가지. 예: 오늘 밤, 단 5분만 시작해 보세요." maxLength={300} />
      </div>

      {/* 한 줄 흐름 미리보기 */}
      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 흐름 요약 (미리보기)</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{summarize(editing)}</div>
      </div>

      <div style={stField}>
        <div style={stLabel}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={stArea} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="시각자료, 동선, 강조할 부분 등" maxLength={500} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...stLabel, marginBottom: 0 }}><Emoji e="✅" /> 발표 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  c: Speech; onEdit: () => void; toggleCheck: (qid: string) => void
  copyText: (t: string, label?: string) => void; exportOne: (c: Speech) => string; onToProject: () => void
}) {
  const { c, onEdit, toggleCheck, copyText, exportOne, onToProject } = props
  const linked = hasProjectBridge()
  const sec = estimateSeconds(c)
  const words = totalWords(c)
  const checkedCnt = CHECK_Q.filter((q) => c.checks[q.id]).length

  const rowS: React.CSSProperties = { marginBottom: 12 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const dash = <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>{c.title}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(c), '복사됨')} title="이 연설을 대본 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      {/* 시간 + 흐름 요약 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--accent)', textAlign: 'center', minWidth: 110 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⏱️" /> 예상 시간</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--accent)' }}>{fmtDuration(sec)}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>약 {words}어절 · {c.wpm}/분</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, padding: '10px 12px', borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 흐름 요약</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{summarize(c)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div><span style={stLabel}><Emoji e="👥" /> 청중</span> <span style={{ fontSize: 13 }}>{c.audience || dash}</span></div>
        <div><span style={stLabel}><Emoji e="🎯" /> 목표</span> <span style={{ fontSize: 13 }}>{c.goal || dash}</span></div>
      </div>

      <div style={rowS}><div style={stLabel}>1) <Emoji e="🎣" /> 후킹 (도입)</div><div style={valS}>{c.hook || dash}</div></div>
      <div style={rowS}><div style={stLabel}>2) <Emoji e="💡" /> 핵심 메시지</div><div style={{ ...valS, fontWeight: 600 }}>{c.coreMessage || dash}</div></div>

      <div style={rowS}>
        <div style={stLabel}>3) <Emoji e="📌" /> 근거 3개</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.evidences.map((e, i) => {
            const d = appealDef(e.type)
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{i + 1}. </span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}><Emoji e={d.icon} /> {d.label}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{e.claim || dash}</div>
                {e.support.trim() && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>↳ {e.support}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={rowS}>
        <div style={stLabel}>4) <Emoji e="🛡️" /> 반론 대응</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--panel)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>예상 반론</div>
          <div style={{ ...valS, marginBottom: 6 }}>{c.rebuttal || dash}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>대응</div>
          <div style={valS}>{c.rebuttalAnswer || dash}</div>
        </div>
      </div>

      <div style={rowS}><div style={stLabel}>5) <Emoji e="🚀" /> 행동 촉구 (콜투액션)</div><div style={{ ...valS, fontWeight: 600 }}>{c.cta || dash}</div></div>

      {c.notes.trim() && <div style={rowS}><div style={stLabel}><Emoji e="🗒️" /> 메모</div><div style={valS}>{c.notes}</div></div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...stLabel, marginBottom: 0 }}><Emoji e="✅" /> 발표 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === CHECK_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{CHECK_Q.length}</span>
        </div>
        <CheckList checks={c.checks} toggle={toggleCheck} />
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 연설을 프로젝트 자료(연설 폴더)에 대본 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
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
