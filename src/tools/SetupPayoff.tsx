// 복선·회수 추적기(체호프의 총) — 설정(setup)–회수(payoff) 쌍을 표로 관리한다.
// 각 쌍: 설명 / 심은 위치 / 회수 위치 / 상태(미회수·회수됨). 미회수 항목 경고.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:setup-payoff' 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'setup-payoff', name: '복선·회수 추적기', icon: '🔫', group: '구상·정리', intro: '체호프의 총: 심은 복선(설정)과 회수를 표로 관리하고 미회수 복선을 경고합니다', w: 720, h: 580 }

const LS_KEY = 'sry:tool:setup-payoff'

type Status = 'open' | 'paid'   // open=미회수, paid=회수됨
interface Row {
  id: string
  desc: string       // 복선 설명(무엇을 심었나)
  setupAt: string    // 심은 위치(장/장면/페이지)
  payoffAt: string   // 회수 위치
  status: Status
  note: string       // 메모(선택)
}
interface SaveShape { rows: Row[]; title: string }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function isStatus(s: unknown): s is Status { return s === 'open' || s === 'paid' }
function str(v: unknown): string { return typeof v === 'string' ? v : '' }

function load(): SaveShape {
  const empty: SaveShape = { rows: [], title: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const rows: Row[] = Array.isArray(p.rows)
      ? p.rows
          .filter((r: unknown) => r && typeof r === 'object' && typeof (r as Row).desc === 'string')
          .map((r: Record<string, unknown>) => ({
            id: String(r.id || newId()),
            desc: str(r.desc),
            setupAt: str(r.setupAt),
            payoffAt: str(r.payoffAt),
            status: isStatus(r.status) ? r.status : 'open',
            note: str(r.note),
          }))
      : []
    return { rows, title: str(p.title) }
  } catch { return empty }
}

export default function SetupPayoff({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>(load())
  const [rows, setRows] = useState<Row[]>(init.current.rows)
  const [title, setTitle] = useState<string>(init.current.title)

  // 새 복선 입력 폼
  const [dDesc, setDDesc] = useState('')
  const [dSetup, setDSetup] = useState('')
  // 편집 상태
  const [editId, setEditId] = useState<string | null>(null)
  const [eDesc, setEDesc] = useState('')
  const [eSetup, setESetup] = useState('')
  const [ePayoff, setEPayoff] = useState('')
  const [eNote, setENote] = useState('')
  // 필터
  const [filter, setFilter] = useState<'all' | Status>('all')

  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 초기 복선 1건 받기(연계로 열렸을 때) — 마운트 1회만
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const d = payload && typeof payload === 'object' ? str((payload as Record<string, unknown>).desc) : ''
    const s = payload && typeof payload === 'object' ? str((payload as Record<string, unknown>).setupAt) : ''
    if (d.trim()) {
      setRows((prev) => [{ id: newId(), desc: d.trim(), setupAt: s.trim(), payoffAt: '', status: 'open', note: '' }, ...prev])
    }
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ rows, title } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [rows, title])

  // ── CRUD ─────────────────────────────────────────────────
  const add = () => {
    const d = dDesc.trim()
    if (!d) return
    setRows((prev) => [...prev, { id: newId(), desc: d, setupAt: dSetup.trim(), payoffAt: '', status: 'open', note: '' }])
    setDDesc(''); setDSetup('')
  }
  const onAddKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add() } }

  const remove = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (editId === id) setEditId(null)
  }
  // 상태 토글 — 회수됨으로 바꿀 때 회수 위치가 비어 있으면 편집을 열어 입력 유도
  const toggleStatus = (r: Row) => {
    if (r.status === 'open') {
      if (!r.payoffAt.trim()) { startEdit(r); if (mounted.current) setNote('회수 위치를 입력한 뒤 "회수됨"으로 표시하면 좋아요.'); return }
      setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'paid' } : x))
    } else {
      setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'open' } : x))
    }
  }

  const startEdit = (r: Row) => {
    setEditId(r.id); setEDesc(r.desc); setESetup(r.setupAt); setEPayoff(r.payoffAt); setENote(r.note)
    if (mounted.current) setNote('')
  }
  const cancelEdit = () => { setEditId(null) }
  const commitEdit = () => {
    if (!editId) return
    const d = eDesc.trim()
    if (!d) { remove(editId); setEditId(null); return }
    const payoff = ePayoff.trim()
    setRows((prev) => prev.map((r) => r.id === editId
      ? { ...r, desc: d, setupAt: eSetup.trim(), payoffAt: payoff, note: eNote.trim(),
          // 회수 위치를 채우면 자동으로 회수됨, 지우면 미회수로
          status: payoff ? 'paid' : 'open' }
      : r))
    setEditId(null)
  }
  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const move = (id: string, dir: -1 | 1) => {
    setRows((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const clearAll = () => { if (rows.length) setRows([]) }

  // ── 파생 ───────────────────────────────────────────────────
  const openCount = rows.filter((r) => r.status === 'open').length
  const paidCount = rows.length - openCount
  const shown = rows.filter((r) => filter === 'all' ? true : r.status === filter)

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const statusLabel = (s: Status) => s === 'paid' ? '회수됨' : '미회수'
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[복선·회수] ${title.trim()}` : '[복선·회수 추적]')
    lines.push(`총 ${rows.length}건 · 회수됨 ${paidCount} · 미회수 ${openCount}`)
    lines.push('')
    rows.forEach((r, i) => {
      lines.push(`${i + 1}. [${statusLabel(r.status)}] ${r.desc}`)
      lines.push(`   · 심은 곳: ${r.setupAt.trim() || '(미기재)'}`)
      lines.push(`   · 회수 곳: ${r.payoffAt.trim() || '(미회수)'}`)
      if (r.note.trim()) lines.push(`   · 메모: ${r.note.trim()}`)
    })
    if (openCount > 0) {
      lines.push('')
      lines.push(`⚠ 미회수 복선 ${openCount}건 — 회수하거나 의도적 미해결인지 점검하세요.`)
    }
    return lines.join('\n')
  }
  const copy = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (mounted.current) { setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1500) }
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  // 프로젝트(바인더)로 표 문서 추가 — HTML 표
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (title.trim()) parts.push(`<p><em>${esc(title.trim())}</em></p>`)
    parts.push(`<p>총 ${rows.length}건 · 회수됨 ${paidCount} · 미회수 ${openCount}</p>`)
    if (rows.length === 0) { parts.push('<p>(복선 없음)</p>'); return parts.join('') }
    parts.push('<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>상태</th><th>복선</th><th>심은 위치</th><th>회수 위치</th><th>메모</th></tr></thead><tbody>')
    rows.forEach((r) => {
      parts.push(`<tr><td>${esc(statusLabel(r.status))}</td><td>${esc(r.desc)}</td><td>${esc(r.setupAt.trim() || '-')}</td><td>${esc(r.payoffAt.trim() || '-')}</td><td>${esc(r.note.trim() || '-')}</td></tr>`)
    })
    parts.push('</tbody></table>')
    if (openCount > 0) parts.push(`<p>⚠ 미회수 복선 ${openCount}건 — 회수하거나 의도적 미해결인지 점검하세요.</p>`)
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: title.trim() ? `복선·회수 — ${title.trim()}` : '복선·회수 추적',
      bodyHtml: buildBodyHtml(),
      meta: { 복선수: String(rows.length), 회수됨: String(paidCount), 미회수: String(openCount) },
    })
    if (mounted.current) {
      setSaved(id ? '✓ 프로젝트 자료(플롯)에 복선표 추가됨' : '프로젝트에 연결되지 않았습니다')
      setTimeout(() => { if (mounted.current) setSaved('') }, 1800)
    }
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, fontSize: 13, padding: '7px 9px' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, padding: '20px 8px' }
  const th: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textAlign: 'left', padding: '0 6px' }

  const statChip = (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
    padding: '4px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: `1px solid ${color}`, color: 'var(--text)',
  })
  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)',
  })

  const statusBadge = (s: Status): React.CSSProperties => ({
    flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 7, padding: '3px 9px',
    background: s === 'paid' ? 'var(--ok)' : 'var(--warn)', cursor: 'pointer', whiteSpace: 'nowrap',
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🔫"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목 (선택)" maxLength={80} aria-label="작품 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* 안내 */}
        <div style={hint}>
          <strong style={{ color: 'var(--text)' }}>체호프의 총</strong> — "1막에서 벽에 총을 걸었다면 3막에서 반드시 발사돼야 한다." 심은 복선(설정)과 회수 지점을 짝지어 관리하고, 잊힌 복선이 없는지 점검하세요.
        </div>

        {/* 통계 + 미회수 경고 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={statChip('var(--border)')}>전체 {rows.length}</span>
          <span style={statChip('var(--ok)')}>✓ 회수됨 {paidCount}</span>
          <span style={statChip('var(--warn)')}>● 미회수 {openCount}</span>
        </div>
        {openCount > 0 && (
          <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            ⚠ <strong>미회수 복선 {openCount}건</strong>이 있습니다. 회수하거나, 의도적으로 열린 결말인지 확인하세요.
          </div>
        )}

        {/* 추가 폼 */}
        <div style={panel}>
          <div style={sectionTitle}>복선 추가</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={input} value={dDesc} onChange={(e) => setDDesc(e.target.value)} onKeyDown={onAddKey} placeholder="복선 설명 — 무엇을 심었나요? (예: 책상 서랍 속 낡은 권총)" maxLength={300} aria-label="복선 설명" />
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={smallInput} value={dSetup} onChange={(e) => setDSetup(e.target.value)} onKeyDown={onAddKey} placeholder="심은 위치 (예: 1장 / 3장면 / p.12)" maxLength={120} aria-label="심은 위치" />
              <button className="btn-primary" onClick={add} disabled={!dDesc.trim()} style={{ flexShrink: 0 }}>추가</button>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>보기:</span>
          <button style={filterBtn(filter === 'all')} onClick={() => setFilter('all')}>전체 {rows.length}</button>
          <button style={filterBtn(filter === 'open')} onClick={() => setFilter('open')}>미회수 {openCount}</button>
          <button style={filterBtn(filter === 'paid')} onClick={() => setFilter('paid')}>회수됨 {paidCount}</button>
        </div>

        {/* 표 */}
        <div style={panel}>
          {rows.length === 0 ? (
            <div style={empty}>아직 등록된 복선이 없어요.<br />위에서 첫 복선을 심어 보세요.</div>
          ) : shown.length === 0 ? (
            <div style={empty}>이 조건에 해당하는 복선이 없어요.</div>
          ) : (
            <>
              {/* 헤더(데스크톱) */}
              <div style={{ display: 'flex', gap: 8, padding: '0 2px 8px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ ...th, width: 64, flexShrink: 0 }}>상태</span>
                <span style={{ ...th, flex: 2 }}>복선 설명</span>
                <span style={{ ...th, flex: 1 }}>심은 위치</span>
                <span style={{ ...th, flex: 1 }}>회수 위치</span>
                <span style={{ ...th, width: 92, flexShrink: 0, textAlign: 'right' }}>동작</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {shown.map((r) => {
                  const isEd = editId === r.id
                  const realIdx = rows.findIndex((x) => x.id === r.id)
                  if (isEd) {
                    return (
                      <div key={r.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input style={input} value={eDesc} onChange={(e) => setEDesc(e.target.value)} onKeyDown={onEditKey} placeholder="복선 설명" maxLength={300} autoFocus aria-label="복선 설명 수정" />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input style={{ ...smallInput, minWidth: 140 }} value={eSetup} onChange={(e) => setESetup(e.target.value)} onKeyDown={onEditKey} placeholder="심은 위치" maxLength={120} aria-label="심은 위치 수정" />
                          <input style={{ ...smallInput, minWidth: 140 }} value={ePayoff} onChange={(e) => setEPayoff(e.target.value)} onKeyDown={onEditKey} placeholder="회수 위치 (입력 시 자동 '회수됨')" maxLength={120} aria-label="회수 위치 수정" />
                        </div>
                        <input style={smallInput} value={eNote} onChange={(e) => setENote(e.target.value)} onKeyDown={onEditKey} placeholder="메모 (선택)" maxLength={300} aria-label="메모 수정" />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn-primary" onClick={commitEdit}>저장</button>
                          <button className="minibtn" onClick={cancelEdit}>취소</button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <button
                        style={{ ...statusBadge(r.status), border: 'none', width: 64, flexShrink: 0 }}
                        onClick={() => toggleStatus(r)}
                        title={r.status === 'paid' ? '클릭하면 미회수로' : '클릭하면 회수됨으로'}
                        aria-label="상태 전환"
                      >{r.status === 'paid' ? '✓ 회수' : '● 미회수'}</button>
                      <span style={{ flex: 2, minWidth: 0, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', textDecoration: r.status === 'paid' ? 'none' : 'none' }}>
                        {r.desc}
                        {r.note.trim() && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}><Emoji e="📝"/> {r.note}</span>}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--muted)', wordBreak: 'break-word' }}>{r.setupAt.trim() || <em style={{ opacity: 0.6 }}>-</em>}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: r.payoffAt.trim() ? 'var(--text)' : 'var(--muted)', wordBreak: 'break-word' }}>{r.payoffAt.trim() || <em style={{ opacity: 0.6 }}>미회수</em>}</span>
                      <div style={{ width: 92, flexShrink: 0, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => move(r.id, -1)} disabled={realIdx === 0} title="위로" aria-label="위로 이동">▲</button>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => move(r.id, 1)} disabled={realIdx === rows.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => startEdit(r)} title="수정" aria-label="수정"><Emoji e="✏️"/></button>
                        <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => remove(r.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* 하단 동작 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 <strong style={{ color: 'var(--text)' }}>{rows.length}</strong>건</span>
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
          <button className="minibtn" onClick={clearAll} disabled={rows.length === 0} title="모든 복선 삭제">전체 비우기</button>
        </div>

        {/* 프로젝트 연동 */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '복선·회수 표를 프로젝트 자료(플롯)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>
        {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>{saved}</div>}

        {/* 저작권/출처: 외부 콘텐츠 없음 — 사용자 입력만 다룹니다 */}
        <div className="license-note" style={{ ...hint, marginTop: 2 }}>
          이 도구는 외부 이미지·텍스트를 불러오지 않으며, 입력한 내용만 이 브라우저(localStorage)에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
