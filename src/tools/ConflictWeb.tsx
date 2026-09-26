// 인물 갈등 매트릭스 — 인물 목록(행=주체, 열=상대) 격자에 "행 인물이 열 인물에게 무엇을 원하나"를
// 셀로 입력해 인물 사이의 욕망·갈등·관계를 한눈에 본다. 셀마다 욕망 텍스트 + 갈등 강도(0~3)·관계 색을 지정.
// 인물은 직접 추가하거나 공유 라이브러리(useLibraryList)에서 불러오고, payload.character 로 받은 인물도 추가.
// 자급식: react·'./linkbus' 외 import 없음. 전부 로컬(외부 네트워크 불필요 → 저작권 안전).
// localStorage 'sry:tool:conflict-web' 자동 저장/복원. 언마운트 정리. 로딩 없음(동기), 빈/실패 graceful.
// 연계(linkbus): 매트릭스를 표 형태 HTML 문서로 만들어 프로젝트 자료(자료 › 인물)에 추가. 텍스트 복사.
import { useEffect, useRef, useState } from 'react'
import { useLibraryList, openToolLinked, addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'conflict-web', name: '인물 갈등 매트릭스', icon: '🪢', group: '구상·정리', intro: '인물×인물 격자에 누가 누구에게 무엇을 원하는지 적어 갈등 관계망을 한눈에 보세요', w: 760, h: 600 }

const LS_KEY = 'sry:tool:conflict-web'

// 관계 유형 — 셀 테두리/배경 색으로 구분(RelationshipMap 과 통일).
interface RelType { key: string; label: string; color: string }
const REL_TYPES: RelType[] = [
  { key: 'none', label: '미설정', color: '#7a8493' },
  { key: 'family', label: '가족', color: '#e0992b' },
  { key: 'lover', label: '연인', color: '#e0518b' },
  { key: 'friend', label: '친구', color: '#3fa35a' },
  { key: 'enemy', label: '적', color: '#d2473b' },
  { key: 'colleague', label: '동료', color: '#3d7fd6' },
  { key: 'mentor', label: '스승', color: '#8a5cd6' },
  { key: 'rival', label: '경쟁자', color: '#c9772b' },
]
const relOf = (k: string): RelType => REL_TYPES.find((r) => r.key === k) || REL_TYPES[0]

// 갈등 강도 0~3 — 강할수록 진한 표시.
const INTENSITY: { v: number; label: string; mark: string }[] = [
  { v: 0, label: '없음', mark: '·' },
  { v: 1, label: '약함', mark: '○' },
  { v: 2, label: '보통', mark: '◐' },
  { v: 3, label: '강함', mark: '●' },
]
const intOf = (v: number) => INTENSITY.find((i) => i.v === v) || INTENSITY[0]

interface Person { id: string; name: string }
// 셀 키: `${rowId}>${colId}` (행 인물이 열 인물에게 원하는 것 = 방향성 있음)
interface Cell { want: string; rel: string; intensity: number }
interface Store { people: Person[]; cells: Record<string, Cell> }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const cellKey = (rowId: string, colId: string) => rowId + '>' + colId

function sanitizeCell(raw: any): Cell {
  const want = typeof raw?.want === 'string' ? raw.want.slice(0, 300) : ''
  const rel = typeof raw?.rel === 'string' && REL_TYPES.some((r) => r.key === raw.rel) ? raw.rel : 'none'
  const intensity = [0, 1, 2, 3].includes(raw?.intensity) ? raw.intensity : 0
  return { want, rel, intensity }
}
const cellIsEmpty = (c?: Cell) => !c || (!c.want.trim() && c.rel === 'none' && !c.intensity)

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { people: [], cells: {} }
    const p = JSON.parse(raw)
    const people: Person[] = Array.isArray(p?.people)
      ? p.people.filter((x: any) => x && typeof x.name === 'string').map((x: any) => ({ id: String(x.id || newId()), name: String(x.name).slice(0, 40) }))
      : []
    const ids = new Set(people.map((x) => x.id))
    const cells: Record<string, Cell> = {}
    if (p?.cells && typeof p.cells === 'object') {
      for (const k of Object.keys(p.cells)) {
        const [a, b] = k.split('>')
        if (!ids.has(a) || !ids.has(b) || a === b) continue // 깨진/대각선 셀 제거
        const c = sanitizeCell(p.cells[k])
        if (!cellIsEmpty(c)) cells[k] = c
      }
    }
    return { people, cells }
  } catch {
    return { people: [], cells: {} }
  }
}

// 공유 인물 → 표시 이름만 사용(이미지/사진은 안 씀 → 저작권 안전).
function charName(c: Partial<SharedCharacter>): string { return (c.name || '').trim().slice(0, 40) }

interface ConflictWebProps { payload?: Record<string, unknown> }

export default function ConflictWeb({ payload }: ConflictWebProps) {
  const initial = useRef<Store>(loadStore())
  const [people, setPeople] = useState<Person[]>(initial.current.people)
  const [cells, setCells] = useState<Record<string, Cell>>(initial.current.cells)
  const [draftName, setDraftName] = useState('')
  const [note, setNote] = useState('')
  const [sel, setSel] = useState<{ row: string; col: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // 셀 편집 폼
  const [editWant, setEditWant] = useState('')
  const [editRel, setEditRel] = useState('none')
  const [editInt, setEditInt] = useState(0)

  const libChars = useLibraryList('characters')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장(빈 셀은 저장에서 제외해 용량 절약)
  useEffect(() => {
    try {
      const slim: Record<string, Cell> = {}
      for (const k of Object.keys(cells)) if (!cellIsEmpty(cells[k])) slim[k] = cells[k]
      localStorage.setItem(LS_KEY, JSON.stringify({ people, cells: slim }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [people, cells])

  // ===== 인물 추가 공용 헬퍼(중복 이름 방지) → 추가된 id 또는 null =====
  const addNamedPerson = (rawName: string): string | null => {
    const name = rawName.trim().slice(0, 40)
    if (!name) return null
    let createdId: string | null = null
    setPeople((prev) => {
      if (prev.some((p) => p.name.trim() === name.trim())) return prev
      const p: Person = { id: newId(), name }
      createdId = p.id
      return [...prev, p]
    })
    return createdId
  }

  // ===== [연계] payload.character 로 들어온 인물을 행/열에 추가 =====
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const raw = (payload as Record<string, unknown>).character
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    let added = 0
    for (const c of list) {
      if (!c || typeof c !== 'object') continue
      const nm = charName(c as Partial<SharedCharacter>)
      if (nm && addNamedPerson(nm)) added++
    }
    if (mounted.current) {
      if (added > 0) setNote(`인물 ${added}명을 매트릭스에 추가했어요.`)
      else if (list.length) setNote('받은 인물이 이미 모두 추가되어 있어요.')
    }
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // ===== [연계] 공유 라이브러리 인물 전체 불러오기 =====
  const importLibraryChars = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 저장된 인물이 없어요. 인물 시트·캐릭터 모델에서 먼저 추가하세요.'); return }
    const existing = new Set(people.map((p) => p.name.trim()))
    let added = 0
    for (const c of libChars) {
      const nm = charName(c)
      if (!nm || existing.has(nm)) continue
      existing.add(nm)
      if (addNamedPerson(nm)) added++
    }
    setNote(added > 0 ? `라이브러리 인물 ${added}명을 추가했어요.` : '라이브러리 인물이 이미 모두 들어 있어요.')
  }

  const addPerson = () => {
    const id = addNamedPerson(draftName)
    setDraftName('')
    if (id) setNote('')
    else if (draftName.trim()) setNote('같은 이름의 인물이 이미 있어요.')
  }

  // ===== [연계] 바인더 파일을 도구창에 드롭 → 참가 인물로 추가 =====
  const handleDrop = (e: React.DragEvent) => {
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    setDragOver(false)
    // 인물 카드면 character.name, 일반 문서면 title 을 인물 이름으로 사용
    const nm = (it.character?.name || it.title || '').trim()
    if (!nm) { setNote('이름이 없는 파일이라 인물로 추가하지 못했어요.'); return }
    if (addNamedPerson(nm)) setNote(`'${nm}' 인물을 매트릭스에 추가했어요.`)
    else setNote(`'${nm}' 인물이 이미 매트릭스에 있어요.`)
  }

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
    setCells((prev) => {
      const next: Record<string, Cell> = {}
      for (const k of Object.keys(prev)) {
        const [a, b] = k.split('>')
        if (a !== id && b !== id) next[k] = prev[k]
      }
      return next
    })
    setSel((s) => (s && (s.row === id || s.col === id) ? null : s))
  }

  const movePerson = (id: string, dir: -1 | 1) => {
    setPeople((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const renamePerson = (id: string, value: string) => {
    const nm = value.slice(0, 40)
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name: nm } : p)))
  }

  // ===== 셀 선택/편집 =====
  const openCell = (row: string, col: string) => {
    if (row === col) return
    const c = cells[cellKey(row, col)] || { want: '', rel: 'none', intensity: 0 }
    setSel({ row, col })
    setEditWant(c.want)
    setEditRel(c.rel)
    setEditInt(c.intensity)
    setNote('')
  }
  const saveCell = () => {
    if (!sel) return
    const c: Cell = { want: editWant.trim().slice(0, 300), rel: editRel, intensity: editInt }
    setCells((prev) => {
      const next = { ...prev }
      const k = cellKey(sel.row, sel.col)
      if (cellIsEmpty(c)) delete next[k]
      else next[k] = c
      return next
    })
    setSel(null)
    setNote('')
  }
  const clearCell = () => {
    if (!sel) return
    setCells((prev) => { const next = { ...prev }; delete next[cellKey(sel.row, sel.col)]; return next })
    setSel(null)
  }

  const clearAll = () => {
    if (!people.length && !Object.keys(cells).length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 인물과 갈등 입력을 지울까요? 되돌릴 수 없습니다.')) return
    setPeople([]); setCells({}); setSel(null)
  }

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name || '?'
  const isEmpty = people.length === 0
  const filledCount = Object.keys(cells).filter((k) => !cellIsEmpty(cells[k])).length

  // ===== 텍스트 내보내기 =====
  const exportText = (): string => {
    const lines: string[] = ['# 인물 갈등 매트릭스', '', '형식: [주체] → [상대] : 원하는 것 (관계 / 갈등 강도)', '']
    if (isEmpty) { lines.push('(인물 없음)'); return lines.join('\n') }
    let any = false
    for (const r of people) {
      for (const c of people) {
        if (r.id === c.id) continue
        const cell = cells[cellKey(r.id, c.id)]
        if (cellIsEmpty(cell)) continue
        any = true
        const rt = relOf(cell.rel)
        const it = intOf(cell.intensity)
        const tags = [rt.key !== 'none' ? rt.label : '', cell.intensity ? `갈등 ${it.label}` : ''].filter(Boolean).join(' / ')
        lines.push(`- ${r.name} → ${c.name} : ${cell.want || '(욕망 미기재)'}${tags ? `  (${tags})` : ''}`)
      }
    }
    if (!any) lines.push('(입력된 갈등 없음)')
    return lines.join('\n')
  }
  const copyText = async () => {
    const txt = exportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('매트릭스를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('매트릭스를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
    }
  }

  // ===== [연계] 표 HTML 로 프로젝트(자료 › 인물)에 추가 =====
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push('<p>행 인물이 <b>열 인물에게</b> 무엇을 원하는지(욕망·갈등)를 정리한 매트릭스입니다.</p>')
    // 격자 표
    parts.push('<table border="1" cellpadding="6" cellspacing="0">')
    parts.push('<tr><th>주체 ＼ 상대</th>' + people.map((c) => '<th>' + esc(c.name) + '</th>').join('') + '</tr>')
    for (const r of people) {
      const tds = people.map((c) => {
        if (r.id === c.id) return '<td>—</td>'
        const cell = cells[cellKey(r.id, c.id)]
        if (cellIsEmpty(cell)) return '<td></td>'
        const rt = relOf(cell.rel)
        const it = intOf(cell.intensity)
        const tags = [rt.key !== 'none' ? rt.label : '', cell.intensity ? '갈등 ' + it.label : ''].filter(Boolean).join(' / ')
        return '<td>' + (cell.want ? esc(cell.want) : '') + (tags ? '<br><i>' + esc(tags) + '</i>' : '') + '</td>'
      }).join('')
      parts.push('<tr><th>' + esc(r.name) + '</th>' + tds + '</tr>')
    }
    parts.push('</table>')
    // 목록 요약(읽기 쉬운 형태)
    const listItems: string[] = []
    for (const r of people) for (const c of people) {
      if (r.id === c.id) continue
      const cell = cells[cellKey(r.id, c.id)]
      if (cellIsEmpty(cell)) continue
      const rt = relOf(cell.rel)
      const it = intOf(cell.intensity)
      const tags = [rt.key !== 'none' ? rt.label : '', cell.intensity ? '갈등 ' + it.label : ''].filter(Boolean).join(' / ')
      listItems.push('<li>' + esc(r.name) + ' → ' + esc(c.name) + ' : ' + (cell.want ? esc(cell.want) : '(욕망 미기재)') + (tags ? ' <i>(' + esc(tags) + ')</i>' : '') + '</li>')
    }
    if (listItems.length) { parts.push('<h2>갈등 목록</h2><ul>' + listItems.join('') + '</ul>') }
    return parts.join('\n')
  }

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (isEmpty) { setNote('추가할 인물이 없어요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '인물 갈등 매트릭스', bodyHtml: buildHtml() })
    if (id) setNote('프로젝트 자료 › 인물 폴더에 갈등 매트릭스를 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요. 연결 상태를 확인해 주세요.')
  }

  // ===== 스타일 =====
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const gridBox: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--paper)', padding: 12 }
  const side: React.CSSProperties = { width: 244, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--panel)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const sInput: React.CSSProperties = { ...input, width: '100%' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const th: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 2, background: 'var(--chrome-2)', border: '1px solid var(--border)', padding: '6px 8px', fontSize: 12, fontWeight: 700, minWidth: 96, maxWidth: 140, verticalAlign: 'middle' }
  const corner: React.CSSProperties = { ...th, left: 0, zIndex: 3, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }
  const rowHead: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 1, background: 'var(--chrome-2)', border: '1px solid var(--border)', padding: '6px 8px', fontSize: 12, fontWeight: 700, maxWidth: 140, verticalAlign: 'middle' }

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {/* 상단 도구막대 */}
      <div style={topbar}>
        <input
          style={{ ...input, flex: 1, minWidth: 120 }}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}
          placeholder="인물 이름을 입력하고 Enter…"
          maxLength={40}
          aria-label="인물 이름"
        />
        <button className="btn-primary" onClick={addPerson} disabled={!draftName.trim()}>＋ 인물 추가</button>
        <button
          className="minibtn"
          onClick={importLibraryChars}
          disabled={!libChars.length}
          title={libChars.length ? `공유 라이브러리 인물 ${libChars.length}명을 행/열로 불러옵니다` : '공유 라이브러리에 인물이 없습니다'}
        ><Emoji e="📥" /> 라이브러리 인물 불러오기{libChars.length ? ` (${libChars.length})` : ''}</button>
        <button
          className="linkbtn"
          onClick={addToProjectDoc}
          disabled={isEmpty || !hasProjectBridge()}
          title={hasProjectBridge() ? '갈등 매트릭스를 표 문서로 프로젝트 바인더(자료 › 인물)에 추가' : '프로젝트에 연결되어 있지 않아요'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={copyText} disabled={isEmpty} title="매트릭스를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={clearAll} disabled={isEmpty && !Object.keys(cells).length} title="전체 삭제"><Emoji e="🗑️" /> 전체 비우기</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 격자 */}
        <div style={gridBox}>
          {isEmpty ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24 }}>
              아직 인물이 없어요.<br />
              위 입력칸에 이름을 적고 <b style={{ color: 'var(--text)' }}>＋ 인물 추가</b>를 누르거나,<br />
              <b style={{ color: 'var(--text)' }}><Emoji e="📥" /> 라이브러리 인물 불러오기</b>로 저장된 인물을 가져오세요.<br />
              인물이 2명 이상이면 격자 셀을 눌러 <b style={{ color: 'var(--text)' }}>누가 누구에게 무엇을 원하는지</b>를 적을 수 있어요.
            </div>
          ) : (
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={corner}>주체 ＼ 상대</th>
                  {people.map((c) => (
                    <th key={c.id} style={th} title={c.name}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((r) => (
                  <tr key={r.id}>
                    <th style={rowHead} title={r.name}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    </th>
                    {people.map((c) => {
                      if (r.id === c.id) {
                        return <td key={c.id} style={{ border: '1px solid var(--border)', background: 'var(--panel)', minWidth: 96, maxWidth: 140 }} />
                      }
                      const cell = cells[cellKey(r.id, c.id)]
                      const empty = cellIsEmpty(cell)
                      const rt = relOf(cell?.rel || 'none')
                      const it = intOf(cell?.intensity || 0)
                      const active = sel && sel.row === r.id && sel.col === c.id
                      const tinted = !empty && rt.key !== 'none'
                      return (
                        <td
                          key={c.id}
                          onClick={() => openCell(r.id, c.id)}
                          title={empty ? `${r.name} → ${c.name}` : `${r.name} → ${c.name}`}
                          style={{
                            border: active ? '2px solid var(--accent)' : tinted ? `2px solid ${rt.color}` : '1px solid var(--border)',
                            background: tinted ? rt.color + '22' : empty ? 'var(--paper)' : 'var(--chrome-2)',
                            minWidth: 96, maxWidth: 140, height: 56, padding: '5px 7px', fontSize: 12, lineHeight: 1.4,
                            cursor: 'pointer', verticalAlign: 'top', overflow: 'hidden', boxSizing: 'border-box',
                          }}
                        >
                          {empty ? (
                            <span style={{ color: 'var(--muted)', fontSize: 18 }}>＋</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
                              <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {cell!.want || <span style={{ color: 'var(--muted)' }}>(욕망 미기재)</span>}
                              </div>
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                                {rt.key !== 'none' && (
                                  <span style={{ color: rt.color, fontWeight: 700 }}>{rt.label}</span>
                                )}
                                {cell!.intensity > 0 && (
                                  <span title={`갈등 ${it.label}`} style={{ color: 'var(--muted)' }}>{it.mark}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isEmpty && people.length < 2 && (
            <div style={{ ...hint, marginTop: 12 }}>인물이 2명 이상일 때 격자에 갈등을 입력할 수 있어요.</div>
          )}
          {!isEmpty && (
            <div className="license-note" style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
              모든 데이터는 직접 입력한 것이며 이 브라우저에만 자동 저장됩니다(외부 전송 없음). 인물 이름·욕망 텍스트는 사용자 창작물입니다.
            </div>
          )}
        </div>

        {/* 우측 패널 — 셀 편집 / 인물 목록 / 연계 */}
        <div style={side}>
          {sel ? (
            <div style={card}>
              <div style={sLabel}>갈등 입력</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <b>{nameOf(sel.row)}</b>
                <span style={{ color: 'var(--muted)' }}> 이(가) </span>
                <b>{nameOf(sel.col)}</b>
                <span style={{ color: 'var(--muted)' }}> 에게 원하는 것</span>
              </div>
              <textarea
                style={{ ...sInput, resize: 'vertical', minHeight: 72, fontFamily: 'inherit', lineHeight: 1.5 }}
                value={editWant}
                onChange={(e) => setEditWant(e.target.value)}
                maxLength={300}
                placeholder="예: 아버지의 인정을 받고 싶다 / 비밀을 지키게 하려 한다"
                aria-label="원하는 것"
                autoFocus
              />
              <div style={sLabel}>관계</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REL_TYPES.map((t) => (
                  <button
                    key={t.key}
                    className="minibtn"
                    onClick={() => setEditRel(t.key)}
                    style={{ borderColor: editRel === t.key ? t.color : 'var(--border)', color: editRel === t.key ? t.color : 'var(--text)', borderWidth: 2, fontWeight: editRel === t.key ? 700 : 400 }}
                  >
                    {t.key !== 'none' && <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: t.color, marginRight: 5, verticalAlign: 'middle' }} />}{t.label}
                  </button>
                ))}
              </div>
              <div style={sLabel}>갈등 강도</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {INTENSITY.map((i) => (
                  <button
                    key={i.v}
                    className="minibtn"
                    onClick={() => setEditInt(i.v)}
                    style={{ flex: 1, borderColor: editInt === i.v ? 'var(--accent)' : 'var(--border)', borderWidth: 2, fontWeight: editInt === i.v ? 700 : 400 }}
                    title={i.label}
                  >{i.mark}<span style={{ fontSize: 10, display: 'block' }}>{i.label}</span></button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={saveCell}>저장</button>
                <button className="minibtn" onClick={clearCell} title="이 셀 비우기"><Emoji e="🗑️" /> 비우기</button>
                <button className="minibtn" onClick={() => setSel(null)} title="닫기">✕</button>
              </div>
            </div>
          ) : (
            <div style={card}>
              <div style={sLabel}>안내</div>
              <div style={hint}>
                격자의 셀을 클릭하면 <b style={{ color: 'var(--text)' }}>행 인물이 열 인물에게 원하는 것</b>을 적을 수 있어요.
                방향이 있으므로 A→B 와 B→A 는 다른 칸입니다.
                입력 {filledCount}칸.
              </div>
            </div>
          )}

          {/* 인물 목록 — 순서 변경·이름 수정·삭제 */}
          <div style={card}>
            <div style={sLabel}>인물 {people.length}명</div>
            {people.length === 0 ? (
              <div style={hint}>아직 없음</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {people.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      style={{ ...input, flex: 1, minWidth: 0, padding: '5px 7px', fontSize: 12 }}
                      value={p.name}
                      onChange={(e) => renamePerson(p.id, e.target.value)}
                      maxLength={40}
                      aria-label={`인물 ${i + 1} 이름`}
                    />
                    <button className="minibtn" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => movePerson(p.id, -1)} disabled={i === 0} title="위로">▲</button>
                    <button className="minibtn" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => movePerson(p.id, 1)} disabled={i === people.length - 1} title="아래로">▼</button>
                    <button className="minibtn" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => removePerson(p.id)} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 관계 색 범례 */}
          <div style={card}>
            <div style={sLabel}>관계 색 범례</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {REL_TYPES.filter((t) => t.key !== 'none').map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: t.color + '33', border: `2px solid ${t.color}`, flexShrink: 0 }} />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
            <div style={hint}>강도 표시: {INTENSITY.filter((i) => i.v > 0).map((i) => `${i.mark} ${i.label}`).join(' · ')}</div>
          </div>

          {/* [연계] 관련 도구 */}
          <div style={card}>
            <div style={sLabel}>연계 도구</div>
            <div className="linkbar">
              <span className="linkbar-label">함께 열기:</span>
              <button className="linkbtn" onClick={() => openToolLinked('relationship-map')} title="인물 관계도 도구를 엽니다"><Emoji e="🕸️" /> 관계도</button>
              <button className="linkbtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 설계기 도구를 엽니다"><Emoji e="⚔️" /> 갈등 설계기</button>
              <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 도구를 엽니다"><Emoji e="🧑‍🎤" /> 인물 시트</button>
            </div>
            <div style={hint}>인물 시트·캐릭터 모델에서 만든 인물은 공유 라이브러리에 모이고, 위 <b><Emoji e="📥" /> 불러오기</b>로 매트릭스에 추가할 수 있어요.</div>
          </div>

          <div style={hint}>모든 인물·갈등 입력은 이 브라우저에 자동 저장됩니다.</div>
        </div>
      </div>
    </div>
  )
}
