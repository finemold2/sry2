// 모티프·상징 추적기 — 작품에서 반복할 모티프/상징을 등록·관리하고, 어느 지점에 몇 번 등장하는지
// 집계해 일관성을 점검한다. 자급식: react 외 import 없음(linkbus 만 허용), 외부 네트워크 없음.
// 모든 데이터는 localStorage 에 JSON 으로 자동 저장/복원된다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'motif-tracker', name: '모티프·상징 추적기', icon: '🔁', group: '구상·정리', intro: '반복할 모티프·상징을 등록하고 등장 지점·횟수로 일관성을 점검하세요', w: 680, h: 640 }

const LS_KEY = 'sry:tool:motif-tracker'

// 한 번의 등장 기록 — 어느 지점(장/장면/페이지 등)에서 어떻게 쓰였는지.
interface Appearance {
  id: string
  where: string   // 등장 지점 라벨 (예: '1장', '결말', '3-2 장면')
  note: string    // 그 지점에서의 쓰임(선택)
}

// 하나의 모티프/상징.
interface Motif {
  id: string
  name: string         // 이름 (예: 비, 거울, 흰 새)
  meaning: string      // 의미·상징하는 바
  category: CatKey     // 분류
  appearances: Appearance[]
  createdAt: number
  updatedAt: number
}

type CatKey = 'object' | 'image' | 'color' | 'sound' | 'action' | 'phrase' | 'place' | 'other'
const CATEGORIES: { key: CatKey; label: string; icon: string }[] = [
  { key: 'object', label: '사물', icon: '🔮' },
  { key: 'image', label: '이미지', icon: '🖼️' },
  { key: 'color', label: '색', icon: '🎨' },
  { key: 'sound', label: '소리', icon: '🔔' },
  { key: 'action', label: '행위', icon: '🤲' },
  { key: 'phrase', label: '문구·대사', icon: '💬' },
  { key: 'place', label: '장소', icon: '🏚️' },
  { key: 'other', label: '기타', icon: '✴️' },
]
const CAT_MAP: Record<CatKey, { label: string; icon: string }> =
  CATEGORIES.reduce((a, c) => { a[c.key] = { label: c.label, icon: c.icon }; return a }, {} as Record<CatKey, { label: string; icon: string }>)
const isCat = (v: unknown): v is CatKey => typeof v === 'string' && (CATEGORIES.some((c) => c.key === v))

// 예시 모티프 — 빈 화면에서 시작을 돕는 학습용 샘플.
interface Example { name: string; meaning: string; category: CatKey; wheres: string[] }
const EXAMPLES: Example[] = [
  { name: '비', meaning: '정화·슬픔·되돌릴 수 없음', category: 'image', wheres: ['도입', '이별 장면', '결말'] },
  { name: '거울', meaning: '자기 인식·이중성·진실의 직면', category: 'object', wheres: ['1장', '전환점'] },
  { name: '붉은색', meaning: '욕망·위험·피의 예고', category: 'color', wheres: ['첫 만남', '절정'] },
  { name: '시계 소리', meaning: '죽음의 임박·되돌릴 수 없는 시간', category: 'sound', wheres: ['중반', '결말'] },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadMotifs(): Motif[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p) ? p : Array.isArray(p?.motifs) ? p.motifs : []
    return arr
      .filter((x: unknown) => x && typeof (x as Motif).name === 'string')
      .map((x: Partial<Motif>) => ({
        id: String(x.id || newId()),
        name: String(x.name || '').slice(0, 80),
        meaning: String(x.meaning || ''),
        category: isCat(x.category) ? x.category : 'other',
        appearances: Array.isArray(x.appearances)
          ? x.appearances
              .filter((a) => a && typeof (a as Appearance).where === 'string')
              .map((a: Partial<Appearance>) => ({
                id: String(a.id || newId()),
                where: String(a.where || '').slice(0, 60),
                note: String(a.note || '').slice(0, 200),
              }))
          : [],
        createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
        updatedAt: Number.isFinite(x.updatedAt) ? (x.updatedAt as number) : Date.now(),
      }))
  } catch {
    return []
  }
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function MotifTracker() {
  const init = useRef(loadMotifs())
  const [motifs, setMotifs] = useState<Motif[]>(init.current)

  // 입력 폼(추가/수정)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [meaning, setMeaning] = useState('')
  const [category, setCategory] = useState<CatKey>('object')

  // 등장 추가용 임시 입력 (모티프 id → {where, note})
  const [appDraft, setAppDraft] = useState<Record<string, { where: string; note: string }>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [showEx, setShowEx] = useState(false)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ motifs }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
  }, [motifs])

  const flashNote = (msg: string, _warn = false) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.', true)
    }
  }

  // ---- CRUD: 모티프 ----
  const resetForm = () => { setEditId(null); setName(''); setMeaning(''); setCategory('object') }

  const submitMotif = () => {
    const nm = name.trim()
    if (!nm) { flashNote('모티프 이름을 입력하세요.', true); return }
    if (editId) {
      setMotifs((p) => p.map((m) => (m.id === editId ? { ...m, name: nm, meaning: meaning.trim(), category, updatedAt: Date.now() } : m)))
      flashNote('수정했습니다.')
    } else {
      const dup = motifs.some((m) => m.name.trim() === nm)
      const rec: Motif = { id: newId(), name: nm, meaning: meaning.trim(), category, appearances: [], createdAt: Date.now(), updatedAt: Date.now() }
      setMotifs((p) => [rec, ...p])
      setExpanded((e) => ({ ...e, [rec.id]: true }))
      flashNote(dup ? `'${nm}' 모티프를 추가했습니다(같은 이름이 이미 있어요).` : `'${nm}' 모티프를 추가했습니다.`, dup)
    }
    resetForm()
  }

  const editMotif = (m: Motif) => {
    setEditId(m.id); setName(m.name); setMeaning(m.meaning); setCategory(m.category)
    flashNote('수정 중입니다. 위 입력칸에서 고친 뒤 저장하세요.')
  }

  const removeMotif = (id: string) => {
    setMotifs((p) => p.filter((m) => m.id !== id))
    if (editId === id) resetForm()
    flashNote('삭제했습니다.')
  }

  const move = (id: string, dir: -1 | 1) => {
    setMotifs((p) => {
      const i = p.findIndex((m) => m.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  // ---- CRUD: 등장 지점 ----
  const setDraft = (mid: string, patch: Partial<{ where: string; note: string }>) =>
    setAppDraft((d) => ({ ...d, [mid]: { where: d[mid]?.where || '', note: d[mid]?.note || '', ...patch } }))

  const addAppearance = (mid: string) => {
    const d = appDraft[mid]
    const where = (d?.where || '').trim()
    if (!where) { flashNote('등장 지점을 입력하세요(예: 1장, 결말).', true); return }
    const rec: Appearance = { id: newId(), where, note: (d?.note || '').trim() }
    setMotifs((p) => p.map((m) => (m.id === mid ? { ...m, appearances: [...m.appearances, rec], updatedAt: Date.now() } : m)))
    setAppDraft((s) => ({ ...s, [mid]: { where: '', note: '' } }))
  }

  const removeAppearance = (mid: string, aid: string) =>
    setMotifs((p) => p.map((m) => (m.id === mid ? { ...m, appearances: m.appearances.filter((a) => a.id !== aid), updatedAt: Date.now() } : m)))

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }))

  const applyExample = (ex: Example) => {
    const rec: Motif = {
      id: newId(), name: ex.name, meaning: ex.meaning, category: ex.category,
      appearances: ex.wheres.map((w) => ({ id: newId(), where: w, note: '' })),
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setMotifs((p) => [rec, ...p])
    setExpanded((e) => ({ ...e, [rec.id]: true }))
    setShowEx(false)
    flashNote(`예시 '${ex.name}' 모티프를 추가했습니다.`)
  }

  // ---- 집계·일관성 ----
  const totalAppearances = motifs.reduce((s, m) => s + m.appearances.length, 0)
  // 같은 등장 지점(where)에 여러 모티프가 몰려 있는지 — 장면 과부하 점검용.
  const whereCount: Record<string, number> = {}
  motifs.forEach((m) => m.appearances.forEach((a) => { const k = a.where.trim(); if (k) whereCount[k] = (whereCount[k] || 0) + 1 }))

  // 텍스트 내보내기(복사)
  const exportAll = () => {
    if (!motifs.length) { flashNote('내보낼 모티프가 없습니다.'); return }
    const lines = motifs.map((m, i) => {
      const cat = CAT_MAP[m.category]?.label || m.category
      const apps = m.appearances.length
        ? m.appearances.map((a) => `    - ${a.where}${a.note ? `: ${a.note}` : ''}`).join('\n')
        : '    - (등장 지점 미기록)'
      return [
        `[${i + 1}] ${m.name}  (${cat}) · ${m.appearances.length}회`,
        `  의미: ${m.meaning || '-'}`,
        `  등장:`,
        apps,
      ].join('\n')
    })
    copy(`# 모티프·상징 목록 (${motifs.length}개 / 총 ${totalAppearances}회 등장)\n\n${lines.join('\n\n')}`, 'export')
    flashNote('모티프 목록을 텍스트로 복사했습니다.')
  }

  const addAllToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (!motifs.length) { flashNote('추가할 모티프가 없습니다.', true); return }
    const rows = motifs.map((m) => {
      const cat = CAT_MAP[m.category]?.label || m.category
      const apps = m.appearances.length
        ? `<ul style="margin:4px 0 0;padding-left:18px;">${m.appearances.map((a) => `<li>${escapeHtml(a.where)}${a.note ? ` — ${escapeHtml(a.note)}` : ''}</li>`).join('')}</ul>`
        : `<p style="color:#888;margin:4px 0 0;">등장 지점 미기록</p>`
      return `<div style="margin:0 0 14px;"><p style="margin:0;"><b>${escapeHtml(m.name)}</b> <span style="color:#888;">(${escapeHtml(cat)} · ${m.appearances.length}회)</span></p><p style="margin:2px 0 0;">의미: ${escapeHtml(m.meaning || '-')}</p>${apps}</div>`
    })
    const bodyHtml = `<p>총 ${motifs.length}개 모티프 · ${totalAppearances}회 등장</p><hr/>${rows.join('')}`
    const id = addToProject({ kind: 'text', root: 'research', folder: '주제', title: '모티프·상징 목록', bodyHtml })
    flashNote(id ? '프로젝트 자료 〈주제〉 폴더에 모티프 목록 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const addOneToProject = (m: Motif) => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.', true); return }
    const cat = CAT_MAP[m.category]?.label || m.category
    const apps = m.appearances.length
      ? `<ul style="margin:4px 0 0;padding-left:18px;">${m.appearances.map((a) => `<li>${escapeHtml(a.where)}${a.note ? ` — ${escapeHtml(a.note)}` : ''}</li>`).join('')}</ul>`
      : `<p style="color:#888;">등장 지점 미기록</p>`
    const bodyHtml = `<p><b>분류:</b> ${escapeHtml(cat)} · <b>등장:</b> ${m.appearances.length}회</p><p><b>의미:</b> ${escapeHtml(m.meaning || '-')}</p><p style="margin-top:8px;"><b>등장 지점</b></p>${apps}`
    const id = addToProject({ kind: 'text', root: 'research', folder: '주제', title: `모티프 — ${m.name}`, bodyHtml })
    flashNote(id ? `프로젝트 자료 〈주제〉 폴더에 '${m.name}' 문서를 추가했습니다.` : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? motifs.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.meaning.toLowerCase().includes(q) ||
        m.appearances.some((a) => a.where.toLowerCase().includes(q) || a.note.toLowerCase().includes(q)))
    : motifs

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, padding: '6px 9px', fontSize: 13, borderRadius: 8 }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 170 }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const motifRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const countPill: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }
  const catPill: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }
  const appItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🔁" /> 모티프·상징 추적기</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{motifs.length}개 · 총 {totalAppearances}회 등장</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>예시 모티프 — 눌러서 추가</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.name} style={{ ...motifRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span><Emoji e={CAT_MAP[ex.category]?.icon} /></span>
                    <b style={{ fontSize: 13 }}>{ex.name}</b>
                    <span style={catPill}>{CAT_MAP[ex.category]?.label}</span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>추가</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.meaning}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>등장 예: {ex.wheres.join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력(추가/수정) */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️" /> 모티프 수정</> : '모티프 추가'}</h4>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}>
              <label style={fieldLabel}>이름</label>
              <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 비, 거울, 흰 새"
                maxLength={80} onKeyDown={(e) => { if (e.key === 'Enter') submitMotif() }} />
            </div>
            <div style={{ ...col, flex: '0 0 auto', minWidth: 0 }}>
              <label style={fieldLabel}>분류</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => setCategory(c.key)} style={chip(category === c.key)} title={c.label}><Emoji e={c.icon} /> {c.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>의미·상징하는 바 (선택)</label>
            <input style={input} value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="예: 정화와 슬픔, 되돌릴 수 없음" maxLength={200} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={submitMotif}>{editId ? '수정 저장' : <><Emoji e="➕" /> 추가</>}</button>
            {editId && <button className="minibtn" onClick={resetForm}>취소</button>}
          </div>
        </div>

        {/* 목록 + 검색 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>모티프 목록 · {shown.length}{q ? `/${motifs.length}` : ''}개</h4>
            <input style={{ ...smallInput, width: 'auto', flex: 1, minWidth: 120, maxWidth: 220 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·의미·지점 검색" />
            <button className="minibtn" onClick={exportAll} disabled={!motifs.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>

          {motifs.length === 0 ? (
            <div style={empty}>
              아직 등록한 모티프·상징이 없습니다.<br />
              위에서 <b>이름</b>을 적고 <b>추가</b>를 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단 <b><Emoji e="📚" /> 예시</b>로 시작해 보세요.</span>
            </div>
          ) : shown.length === 0 ? (
            <div style={empty}>'{query}' 와(과) 일치하는 모티프가 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {shown.map((m) => {
                const idx = motifs.findIndex((x) => x.id === m.id)
                const open = expanded[m.id] ?? (m.appearances.length > 0)
                const draft = appDraft[m.id] || { where: '', note: '' }
                return (
                  <div key={m.id} style={{ ...motifRow, border: '1px solid ' + (editId === m.id ? 'var(--accent)' : 'var(--border)') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button style={{ ...iconBtn, padding: '2px 6px' }} title={open ? '접기' : '펼치기'} onClick={() => toggle(m.id)}>{open ? '▾' : '▸'}</button>
                      <span title={CAT_MAP[m.category]?.label}><Emoji e={CAT_MAP[m.category]?.icon} /></span>
                      <b style={{ fontSize: 13.5 }}>{emojify(m.name)}</b>
                      <span style={catPill}>{CAT_MAP[m.category]?.label}</span>
                      <span style={countPill} title="등장 횟수">{m.appearances.length}회</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title="위로" onClick={() => move(m.id, -1)} disabled={!!q || idx === 0}>▲</button>
                        <button style={iconBtn} title="아래로" onClick={() => move(m.id, 1)} disabled={!!q || idx === motifs.length - 1}>▼</button>
                        <button style={iconBtn} title="이 모티프 복사" onClick={() => copy(`${m.name} (${CAT_MAP[m.category]?.label}) — ${m.meaning || '-'} · ${m.appearances.length}회: ${m.appearances.map((a) => a.where).join(', ') || '미기록'}`, 'm' + m.id)}>{copied === 'm' + m.id ? '✓' : '복사'}</button>
                        <button style={iconBtn} title="수정" onClick={() => editMotif(m)}><Emoji e="✏️" /></button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeMotif(m.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>

                    {m.meaning && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{emojify(m.meaning)}</div>}

                    {open && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
                        {m.appearances.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>아직 등장 지점이 없습니다. 아래에 추가하세요.</div>
                        ) : (
                          m.appearances.map((a, ai) => (
                            <div key={a.id} style={appItem}>
                              <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16 }}>{ai + 1}.</span>
                              <b style={{ flexShrink: 0 }}>{emojify(a.where)}</b>
                              {a.note && <span style={{ color: 'var(--muted)', flex: 1, wordBreak: 'keep-all' }}>— {emojify(a.note)}</span>}
                              <button style={{ ...iconBtn, marginLeft: 'auto', color: 'var(--warn)' }} title="이 등장 삭제" onClick={() => removeAppearance(m.id, a.id)}>✕</button>
                            </div>
                          ))
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <input style={{ ...smallInput, width: 'auto', flex: '0 0 120px' }} value={draft.where}
                            onChange={(e) => setDraft(m.id, { where: e.target.value })}
                            placeholder="등장 지점 (1장…)" maxLength={60}
                            onKeyDown={(e) => { if (e.key === 'Enter') addAppearance(m.id) }} />
                          <input style={{ ...smallInput, width: 'auto', flex: 1, minWidth: 120 }} value={draft.note}
                            onChange={(e) => setDraft(m.id, { note: e.target.value })}
                            placeholder="그 지점의 쓰임 (선택)" maxLength={200}
                            onKeyDown={(e) => { if (e.key === 'Enter') addAppearance(m.id) }} />
                          <button className="minibtn" onClick={() => addAppearance(m.id)}>＋ 등장</button>
                        </div>
                        <div className="linkbar" style={{ marginTop: 4 }}>
                          <span className="linkbar-label">연계:</span>
                          <button className="linkbtn" onClick={() => addOneToProject(m)} disabled={!hasProjectBridge()}
                            title={hasProjectBridge() ? '이 모티프를 프로젝트 자료 〈주제〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                            <Emoji e="📄" /> 프로젝트에 추가
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 일관성 점검 */}
        {motifs.length > 0 && (
          <div style={card}>
            <h4 style={sectionTitle}>일관성 점검</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {motifs.filter((m) => m.appearances.length === 1).length > 0 && (
                <div style={{ ...hint, color: 'var(--warn)' }}>
                  <Emoji e="⚠" /> 단 1회만 등장하는 모티프: {motifs.filter((m) => m.appearances.length === 1).map((m) => m.name).join(', ')}
                  <span style={{ color: 'var(--muted)' }}> — 모티프는 반복될 때 의미가 생깁니다. 다른 지점에도 심어보세요.</span>
                </div>
              )}
              {motifs.filter((m) => m.appearances.length === 0).length > 0 && (
                <div style={hint}>
                  · 등장 지점 미기록: {motifs.filter((m) => m.appearances.length === 0).map((m) => m.name).join(', ')}
                </div>
              )}
              {Object.entries(whereCount).filter(([, c]) => c >= 3).length > 0 && (
                <div style={hint}>
                  · 한 지점에 몰린 모티프(과부하 주의): {Object.entries(whereCount).filter(([, c]) => c >= 3).map(([w, c]) => `${w}(${c}개)`).join(', ')}
                </div>
              )}
              <div style={hint}>
                · 분류 분포: {CATEGORIES.filter((c) => motifs.some((m) => m.category === c.key)).map((c, i, arr) => (
                  <span key={c.key}><Emoji e={c.icon} />{c.label} {motifs.filter((m) => m.category === c.key).length}{i < arr.length - 1 ? ' · ' : ''}</span>
                ))}
              </div>
            </div>

            <div className="linkbar" style={{ marginTop: 12 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={addAllToProject} disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '전체 모티프 목록을 프로젝트 자료 〈주제〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                <Emoji e="📄" /> 프로젝트에 전체 추가
              </button>
            </div>
          </div>
        )}

        <div style={hint}>
          모티프(반복되는 소재·이미지)와 상징(추상적 의미를 담은 사물)은 <b>반복</b>으로 힘을 얻습니다.
          등장 지점을 기록해 두면 처음·중간·끝에 고르게 심어 변주했는지, 의미가 일관된지 한눈에 점검할 수 있어요.
          목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
