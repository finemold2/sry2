// 시점 추적기 — 챕터/장면 행마다 POV 인물·인칭·시제를 기록하는 표.
// 인물은 색으로 구분하고, 인칭/시제가 불규칙하면(소수파 행) 경고를 표시한다.
// 행 추가/삭제·수정·순서 이동 완비. react 외 import 없음. 외부 네트워크 불필요.
// localStorage 자동 저장/복원(차단 시 graceful 처리). 텍스트 내보내기/복사 지원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'pov-tracker', name: '시점 추적기', icon: '🎯', group: '구상·정리', intro: '챕터·장면마다 POV 인물·인칭·시제를 기록하고 시점이 불규칙하면 경고합니다', w: 680, h: 540 }

const LS_KEY = 'sry:tool:pov-tracker'

// 인칭/시제 선택지
const PERSONS = [
  { key: '1', label: '1인칭' },
  { key: '3-limited', label: '3인칭 제한' },
  { key: '3-omni', label: '3인칭 전지' },
  { key: '2', label: '2인칭' },
] as const
const TENSES = [
  { key: 'past', label: '과거' },
  { key: 'present', label: '현재' },
  { key: 'future', label: '미래' },
] as const
const personLabel = (k: string) => PERSONS.find((p) => p.key === k)?.label || '미지정'
const tenseLabel = (k: string) => TENSES.find((t) => t.key === k)?.label || '미지정'

// 프로젝트 본문(HTML) 삽입 전 필수 이스케이프(&, <, >).
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 인물 이름별 색 — 이름 해시로 안정적 배정.
const COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8a5cd6', '#d2473b', '#2bb6c0', '#c9772b', '#5a7fd6', '#d65aa8']
function colorForName(name: string): string {
  const n = name.trim()
  if (!n) return 'var(--muted)'
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

interface Row {
  id: string
  chapter: string // 챕터/장면 라벨
  pov: string // POV 인물
  person: string // 인칭
  tense: string // 시제
  note: string // 메모
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function blankRow(chapter = ''): Row {
  return { id: newId(), chapter, pov: '', person: '3-limited', tense: 'past', note: '' }
}

function loadRows(): Row[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    if (!Array.isArray(p)) return []
    return p
      .filter((r: any) => r && typeof r === 'object')
      .map((r: any) => ({
        id: String(r.id || newId()),
        chapter: String(r.chapter ?? '').slice(0, 60),
        pov: String(r.pov ?? '').slice(0, 40),
        person: PERSONS.some((x) => x.key === r.person) ? String(r.person) : '3-limited',
        tense: TENSES.some((x) => x.key === r.tense) ? String(r.tense) : 'past',
        note: String(r.note ?? '').slice(0, 200),
      }))
  } catch {
    return []
  }
}

// 다수결 기준으로 소수파(불규칙) 값을 가려낸다.
function majority(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  let best: string | null = null
  let bestN = 0
  let tie = false
  counts.forEach((n, v) => {
    if (n > bestN) { best = v; bestN = n; tie = false }
    else if (n === bestN) tie = true
  })
  // 동률이거나 항목 1개뿐이면 기준 없음
  if (tie || counts.size <= 1) return null
  return best
}

export default function POVTracker() {
  const initial = useRef<Row[]>(loadRows())
  const [rows, setRows] = useState<Row[]>(initial.current)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false) // 바인더 파일 드래그 진입 시각 피드백
  const [dropToast, setDropToast] = useState('')   // 드롭 성공 토스트
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const dropTimer = useRef<number | null>(null)
  const dragDepth = useRef(0) // 자식 요소 위 enter/leave 중첩 카운트

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (dropTimer.current != null) clearTimeout(dropTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rows))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [rows])

  // ===== CRUD =====
  const addRow = () => {
    setRows((prev) => [...prev, blankRow()])
  }
  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }
  const moveRow = (id: string, dir: -1 | 1) => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const clearAll = () => {
    if (!rows.length) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('모든 행을 지울까요? 되돌릴 수 없습니다.')) return
    setRows([])
    setNote('')
  }

  // ===== 바인더 파일 → 도구 드롭 =====
  // 드롭된 인물 파일을 새 행의 POV 인물로 추가(이름 = character.name || title).
  const showDropToast = (msg: string) => {
    if (!mounted.current) return
    setDropToast(msg)
    if (dropTimer.current != null) clearTimeout(dropTimer.current)
    dropTimer.current = window.setTimeout(() => { if (mounted.current) setDropToast('') }, 1800)
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault() }
  }
  const onDragEnter = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    dragDepth.current += 1
    if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const name = (it.character?.name || it.title || '').trim().slice(0, 40)
    if (!name) { setNote('이름을 찾을 수 없어 행을 추가하지 못했어요.'); return }
    const row = { ...blankRow(), pov: name }
    setRows((prev) => [...prev, row])
    setNote('')
    showDropToast(`✓ POV 인물로 「${name}」 행을 추가했어요.`)
  }

  // ===== 불규칙 판정 (인칭/시제) =====
  const personMaj = majority(rows.map((r) => r.person))
  const tenseMaj = majority(rows.map((r) => r.tense))
  const isPersonOdd = (r: Row) => personMaj != null && r.person !== personMaj
  const isTenseOdd = (r: Row) => tenseMaj != null && r.tense !== tenseMaj
  const oddCount = rows.filter((r) => isPersonOdd(r) || isTenseOdd(r)).length

  // 등장 POV 인물(범례)
  const povNames = Array.from(new Set(rows.map((r) => r.pov.trim()).filter(Boolean)))

  // ===== 내보내기 =====
  const exportText = (): string => {
    const lines: string[] = ['# 시점 추적표', '']
    if (!rows.length) { lines.push('(행 없음)'); return lines.join('\n') }
    rows.forEach((r, i) => {
      const flags: string[] = []
      if (isPersonOdd(r)) flags.push('인칭 불규칙')
      if (isTenseOdd(r)) flags.push('시제 불규칙')
      const head = `${i + 1}. ${r.chapter.trim() || '(제목 없음)'}`
      const body = `POV: ${r.pov.trim() || '미지정'} / ${personLabel(r.person)} / ${tenseLabel(r.tense)}`
      lines.push(head)
      lines.push(`   ${body}${flags.length ? `  ⚠ ${flags.join(', ')}` : ''}`)
      if (r.note.trim()) lines.push(`   메모: ${r.note.trim()}`)
    })
    if (personMaj || tenseMaj) {
      lines.push('', '## 기준(다수)')
      if (personMaj) lines.push(`- 인칭: ${personLabel(personMaj)}`)
      if (tenseMaj) lines.push(`- 시제: ${tenseLabel(tenseMaj)}`)
    }
    return lines.join('\n')
  }
  const copyText = async () => {
    const txt = exportText()
    const done = () => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); done(); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        done()
      } catch {
        if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.')
      }
    }
  }

  // ===== 프로젝트 연동: 시점 추적표를 「구조」 폴더 문서로 저장 =====
  // 표(table) HTML 로 내보내고, 다수 기준·불규칙 행 요약을 덧붙인다.
  const buildProjectHtml = (): string => {
    const head = ['#', '챕터·장면', 'POV 인물', '인칭', '시제', '메모', '비고']
    const headHtml = head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
    const rowsHtml = rows.map((r, i) => {
      const flags: string[] = []
      if (isPersonOdd(r)) flags.push('인칭 불규칙')
      if (isTenseOdd(r)) flags.push('시제 불규칙')
      const cells = [
        String(i + 1),
        r.chapter.trim() || '(제목 없음)',
        r.pov.trim() || '미지정',
        personLabel(r.person),
        tenseLabel(r.tense),
        r.note.trim(),
        flags.join(', '),
      ]
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    }).join('')
    const table = `<table><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`

    const summary: string[] = []
    if (personMaj) summary.push(`<li>기준 인칭: ${escapeHtml(personLabel(personMaj))}</li>`)
    if (tenseMaj) summary.push(`<li>기준 시제: ${escapeHtml(tenseLabel(tenseMaj))}</li>`)
    if (oddCount > 0) summary.push(`<li>불규칙한 행: ${oddCount}개 (의도한 시점 전환인지 확인)</li>`)
    const summaryHtml = summary.length ? `<hr /><p><strong>기준·점검</strong></p><ul>${summary.join('')}</ul>` : ''

    return table + summaryHtml
  }

  const exportToProject = () => {
    if (isEmpty) { setNote('내보낼 행이 없어요. 먼저 행을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '시점 추적표',
      bodyHtml: buildProjectHtml(),
      meta: {
        장면수: String(rows.length),
        기준인칭: personMaj ? personLabel(personMaj) : '—',
        기준시제: tenseMaj ? tenseLabel(tenseMaj) : '—',
        불규칙: String(oddCount),
      },
    })
    if (!mounted.current) return
    if (id) setNote('✓ 프로젝트 「구조」 폴더에 시점 추적표를 문서로 추가했어요.')
    else setNote('프로젝트에 시점 추적표를 추가하지 못했어요.')
  }

  // ===== 스타일 =====
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }
  const cellInput: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const cellSelect: React.CSSProperties = { ...cellInput, padding: '6px 6px', cursor: 'pointer' }
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', padding: '0 6px 6px' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const warnPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 14%, transparent)', border: '1px solid var(--warn)', borderRadius: 6, padding: '1px 5px', whiteSpace: 'nowrap' }

  const isEmpty = rows.length === 0

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent, #3d7fd6)', outlineOffset: -4, borderRadius: 8 } : wrap}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 바인더 파일 드롭 안내 오버레이 */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent, #3d7fd6) 10%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
            <Emoji e="🎯"/> 여기에 놓으면 POV 인물 행으로 추가
          </div>
        </div>
      )}

      {/* 드롭 성공 토스트 */}
      {dropToast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 40, fontSize: 12.5, fontWeight: 700, color: 'var(--ok, #3fa35a)', background: 'var(--paper)', border: '1px solid var(--ok, #3fa35a)', borderRadius: 999, padding: '6px 14px', boxShadow: '0 4px 14px rgba(0,0,0,.16)', pointerEvents: 'none' }}>
          {dropToast}
        </div>
      )}

      {/* 상단 도구막대 */}
      <div style={topbar}>
        <div style={{ fontSize: 13, fontWeight: 700, marginRight: 'auto' }}><Emoji e="🎯"/> 시점 추적표</div>
        <button className="btn-primary" onClick={addRow}>＋ 행 추가</button>
        <button className="minibtn" onClick={copyText} disabled={isEmpty} title="표를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={exportToProject}
          disabled={isEmpty || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '시점 추적표를 프로젝트 「구조」 폴더에 문서로 추가'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={clearAll} disabled={isEmpty} title="전체 삭제"><Emoji e="🗑️"/> 전체 비우기</button>
      </div>

      {/* 요약/경고 줄 */}
      {!isEmpty && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '7px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>
            기준 인칭 <b style={{ color: 'var(--text)' }}>{personMaj ? personLabel(personMaj) : '—'}</b>
            {'  ·  '}
            기준 시제 <b style={{ color: 'var(--text)' }}>{tenseMaj ? tenseLabel(tenseMaj) : '—'}</b>
          </span>
          {oddCount > 0 ? (
            <span style={{ ...warnPill, fontSize: 11.5 }}>⚠ 불규칙한 행 {oddCount}개 — 의도한 시점 전환인지 확인하세요</span>
          ) : (
            <span style={{ color: 'var(--ok)', fontWeight: 700 }}>✓ 시점·시제 일관</span>
          )}
        </div>
      )}

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: '40px 24px', gap: 14 }}>
            <div>
              아직 기록한 장면이 없어요.<br />
              <b style={{ color: 'var(--text)' }}>＋ 행 추가</b>를 눌러 챕터·장면별로<br />
              POV 인물·인칭·시제를 기록해 보세요.
            </div>
            <button className="btn-primary" onClick={addRow}>＋ 첫 행 추가</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 28 }}>#</th>
                <th style={{ ...th, minWidth: 120 }}>챕터·장면</th>
                <th style={{ ...th, minWidth: 110 }}>POV 인물</th>
                <th style={{ ...th, width: 120 }}>인칭</th>
                <th style={{ ...th, width: 92 }}>시제</th>
                <th style={{ ...th, minWidth: 120 }}>메모</th>
                <th style={{ ...th, width: 78, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pOdd = isPersonOdd(r)
                const tOdd = isTenseOdd(r)
                const odd = pOdd || tOdd
                const c = colorForName(r.pov)
                return (
                  <tr key={r.id} style={{ background: odd ? 'color-mix(in srgb, var(--warn) 8%, transparent)' : i % 2 ? 'transparent' : 'color-mix(in srgb, var(--muted) 5%, transparent)' }}>
                    <td style={{ padding: '5px 6px', fontSize: 12, color: 'var(--muted)', fontWeight: 700, verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], borderLeft: odd ? '3px solid var(--warn)' : '3px solid transparent' }}>{i + 1}</td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                      <input
                        style={cellInput}
                        value={r.chapter}
                        onChange={(e) => updateRow(r.id, { chapter: e.target.value.slice(0, 60) })}
                        placeholder="예: 1장 / 도입"
                        maxLength={60}
                        aria-label={`${i + 1}행 챕터·장면`}
                      />
                    </td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 11, height: 11, borderRadius: '50%', background: c, flexShrink: 0, border: '1px solid var(--border)' }} aria-hidden />
                        <input
                          style={cellInput}
                          value={r.pov}
                          onChange={(e) => updateRow(r.id, { pov: e.target.value.slice(0, 40) })}
                          placeholder="인물 이름"
                          maxLength={40}
                          aria-label={`${i + 1}행 POV 인물`}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                      <select
                        style={{ ...cellSelect, color: pOdd ? 'var(--warn)' : 'var(--text)', borderColor: pOdd ? 'var(--warn)' : 'var(--border)', fontWeight: pOdd ? 700 : 400 }}
                        value={r.person}
                        onChange={(e) => updateRow(r.id, { person: e.target.value })}
                        aria-label={`${i + 1}행 인칭`}
                      >
                        {PERSONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                      <select
                        style={{ ...cellSelect, color: tOdd ? 'var(--warn)' : 'var(--text)', borderColor: tOdd ? 'var(--warn)' : 'var(--border)', fontWeight: tOdd ? 700 : 400 }}
                        value={r.tense}
                        onChange={(e) => updateRow(r.id, { tense: e.target.value })}
                        aria-label={`${i + 1}행 시제`}
                      >
                        {TENSES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle' }}>
                      <input
                        style={cellInput}
                        value={r.note}
                        onChange={(e) => updateRow(r.id, { note: e.target.value.slice(0, 200) })}
                        placeholder="비고(선택)"
                        maxLength={200}
                        aria-label={`${i + 1}행 메모`}
                      />
                    </td>
                    <td style={{ padding: '5px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <button className="minibtn" style={{ padding: '2px 6px' }} onClick={() => moveRow(r.id, -1)} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', marginLeft: 3 }} onClick={() => moveRow(r.id, 1)} disabled={i === rows.length - 1} title="아래로">▼</button>
                      <button className="minibtn" style={{ padding: '2px 6px', marginLeft: 3 }} onClick={() => removeRow(r.id)} title="이 행 삭제">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* 경고 상세 + 범례 */}
        {!isEmpty && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {oddCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'color-mix(in srgb, var(--warn) 8%, transparent)', border: '1px solid var(--warn)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>⚠ 불규칙한 시점·시제 ({oddCount}개)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {rows.map((r, i) => {
                    const pOdd = isPersonOdd(r)
                    const tOdd = isTenseOdd(r)
                    if (!pOdd && !tOdd) return null
                    return (
                      <div key={r.id} style={{ fontSize: 12, color: 'var(--text)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <b style={{ minWidth: 20 }}>{i + 1}.</b>
                        <span style={{ color: 'var(--muted)' }}>{r.chapter.trim() || '(제목 없음)'}</span>
                        {pOdd && <span style={warnPill}>인칭 {personLabel(r.person)}</span>}
                        {tOdd && <span style={warnPill}>시제 {tenseLabel(r.tense)}</span>}
                      </div>
                    )
                  })}
                </div>
                <div style={hint}>다수와 다른 인칭/시제 행을 표시한 것입니다. 의도한 시점 전환이라면 무시해도 됩니다.</div>
              </div>
            )}

            {povNames.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase' }}>POV 인물 색 범례</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {povNames.map((nm) => (
                    <span key={nm} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px 3px 8px' }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: colorForName(nm), flexShrink: 0 }} aria-hidden />
                      {nm}
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>×{rows.filter((r) => r.pov.trim() === nm).length}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={hint}>모든 행은 이 브라우저에 자동 저장됩니다. 인칭·시제는 가장 많은 값을 기준으로 보고, 다른 값이 있으면 경고합니다.</div>
          </div>
        )}
      </div>
    </div>
  )
}
