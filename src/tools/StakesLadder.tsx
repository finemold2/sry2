// 위기 사다리(Stakes Ladder) — 갈등의 판돈(스테이크)을 개인 → 관계 → 공동체 → 세계 단계로
// 사다리처럼 한 칸씩 올리며 각 단(rung)의 위협(무엇이 위험해지는가)·대가(실패의 값)·전환점을 정의해
// 이야기의 고조(escalation)를 설계한다. 시각적 사다리에서 드래그로 순서를 바꾸고, 단계 색으로 고조의 흐름을 본다.
//
// - 여러 개의 사다리를 만들고(작품·스토리라인별), 각 사다리에 단(rung)을 CRUD·순서 변경.
// - 단마다: 제목 / 4단계(개인·관계·공동체·세계) / 위협 / 대가 / 전환점(이걸 누르면 다음 칸으로) / 비가역 여부.
// - 좌측 시각 사다리: 단을 드래그로 재정렬, 클릭으로 편집, 단계별 색 띠로 고조 곡선을 한눈에.
// - 고조 점검: 인접 단의 단계가 거꾸로 내려가면(고조가 풀리면) 경고를 표시.
// - 전부 로컬. react·linkbus 외 import 없음. localStorage 'sry:tool:stakes-ladder'.
// - 연계: 좌측 바인더 파일을 사다리에 드롭하면 단으로 추가, '📄 프로젝트에 추가'(folder:'구조').
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'stakes-ladder', name: '위기 사다리', icon: '🪜', group: '구상·정리', intro: '판돈을 개인→관계→공동체→세계로 올려 고조를 설계하세요', w: 940, h: 660 }

// ── 고조 단계(tier) 정의 — 사다리의 칸이 올라갈수록 판돈의 범위가 넓어진다 ──
type Tier = 'self' | 'relation' | 'community' | 'world'
interface TierDef { key: Tier; label: string; icon: string; level: number; color: string; hint: string; phrase: string }
const TIERS: TierDef[] = [
  { key: 'self', label: '개인', icon: '🧍', level: 1, color: '#5b8def', hint: '인물 자신의 안전·자존·생존·내면이 위태로워진다', phrase: '자기 자신' },
  { key: 'relation', label: '관계', icon: '🤝', level: 2, color: '#3fb27f', hint: '사랑·가족·우정·신뢰 등 가까운 관계가 위태로워진다', phrase: '소중한 관계' },
  { key: 'community', label: '공동체', icon: '🏘️', level: 3, color: '#e0a23a', hint: '집단·조직·도시·계층 등 더 넓은 공동체가 위태로워진다', phrase: '공동체' },
  { key: 'world', label: '세계', icon: '🌍', level: 4, color: '#d9534f', hint: '세계·인류·질서·미래 그 자체가 위태로워진다', phrase: '세계 전체' },
]
function tierDef(t: Tier): TierDef { return TIERS.find((x) => x.key === t) || TIERS[0] }

// ── 데이터 모델 ──
interface Rung {
  id: string
  title: string
  tier: Tier
  threat: string      // 무엇이 위험에 처하는가
  cost: string        // 실패하면 치르는 대가
  trigger: string     // 이 칸으로 올라서게 만드는 사건/전환점
  irreversible: boolean
  notes: string
}
interface Ladder {
  id: string
  name: string
  rungs: Rung[]
  createdAt: number
}

const LS_KEY = 'sry:tool:stakes-ladder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyRung(): Rung {
  return { id: newId(), title: '', tier: 'self', threat: '', cost: '', trigger: '', irreversible: false, notes: '' }
}

// 새 사다리는 친절하게 4단계 한 칸씩 시드(고조의 골격) — 비워둬도 무방하게 텍스트는 빈 값.
function seededLadder(name: string): Ladder {
  return {
    id: newId(), name, createdAt: Date.now(),
    rungs: TIERS.map((t) => ({ ...emptyRung(), tier: t.key, title: '' })),
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── localStorage 로드(손상/미지원 graceful) ──
interface SavedState { ladders: Ladder[]; activeId: string | null; openRungId: string | null }
function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ladders: [], activeId: null, openRungId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.ladders) ? p.ladders : Array.isArray(p) ? p : []
    const tiers: Tier[] = ['self', 'relation', 'community', 'world']
    const ladders: Ladder[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      name: String(x.name || '제목 없는 사다리'),
      createdAt: Number(x.createdAt) || Date.now(),
      rungs: (Array.isArray(x.rungs) ? x.rungs : []).filter((r: any) => r && typeof r === 'object').map((r: any) => ({
        id: String(r.id || newId()),
        title: String(r.title || ''),
        tier: (tiers.includes(r.tier) ? r.tier : 'self') as Tier,
        threat: String(r.threat || ''),
        cost: String(r.cost || ''),
        trigger: String(r.trigger || ''),
        irreversible: !!r.irreversible,
        notes: String(r.notes || ''),
      })),
    }))
    const activeId = typeof p?.activeId === 'string' && ladders.some((l) => l.id === p.activeId) ? p.activeId : (ladders[0]?.id ?? null)
    const active = ladders.find((l) => l.id === activeId)
    const openRungId = typeof p?.openRungId === 'string' && active?.rungs.some((r) => r.id === p.openRungId) ? p.openRungId : null
    return { ladders, activeId, openRungId }
  } catch { return { ladders: [], activeId: null, openRungId: null } }
}

// 사다리 → 텍스트(복사/내보내기)
function ladderToText(l: Ladder): string {
  const lines: string[] = [`# ${l.name}  (위기 사다리)`, '']
  l.rungs.forEach((r, i) => {
    const d = tierDef(r.tier)
    lines.push(`${i + 1}. [${d.label}] ${r.title || '(제목 없음)'}${r.irreversible ? '  ⚠비가역' : ''}`)
    if (r.trigger.trim()) lines.push(`   ↑ 전환점: ${r.trigger.trim()}`)
    if (r.threat.trim()) lines.push(`   ⚠ 위협: ${r.threat.trim()}`)
    if (r.cost.trim()) lines.push(`   💰 대가: ${r.cost.trim()}`)
    if (r.notes.trim()) lines.push(`   🗒 ${r.notes.trim()}`)
    lines.push('')
  })
  return lines.join('\n').trimEnd()
}

// 사다리 → 프로젝트 본문(HTML)
function ladderToHtml(l: Ladder): string {
  const parts: string[] = []
  parts.push('<p><b>위기 사다리</b> — 판돈이 개인→관계→공동체→세계로 고조됩니다.</p>')
  l.rungs.forEach((r, i) => {
    const d = tierDef(r.tier)
    const dash = '<span style="color:#888">—</span>'
    const v = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
    parts.push(`<p><b>${i + 1}. [${escHtml(d.label)}] ${escHtml(r.title || '(제목 없음)')}</b>${r.irreversible ? ' <span style="color:#d9534f">⚠ 비가역</span>' : ''}</p>`)
    parts.push(`<p style="margin-left:1em">↑ 전환점: ${v(r.trigger)}<br>⚠ 위협: ${v(r.threat)}<br>💰 대가: ${v(r.cost)}${r.notes.trim() ? `<br>🗒 ${escHtml(r.notes.trim())}` : ''}</p>`)
  })
  return parts.join('')
}

export default function StakesLadder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [ladders, setLadders] = useState<Ladder[]>(init.current.ladders)
  const [activeId, setActiveId] = useState<string | null>(init.current.activeId)
  const [openRungId, setOpenRungId] = useState<string | null>(init.current.openRungId)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [confirmDelLadder, setConfirmDelLadder] = useState(false)
  const [dropActive, setDropActive] = useState(false) // 바인더 파일 드롭 표시
  // 사다리 내 단 드래그
  const dragRung = useRef<string | null>(null)
  const [dragOverRung, setDragOverRung] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 초기 사다리명 받을 수 있게(선택)
  useEffect(() => {
    const pName = typeof payload?.title === 'string' ? (payload.title as string) : ''
    if (pName && ladders.length === 0) {
      const l = seededLadder(pName)
      setLadders([l]); setActiveId(l.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ladders, activeId, openRungId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [ladders, activeId, openRungId])

  // flash 자동 소거
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700)
    return () => window.clearTimeout(t)
  }, [flash])

  const active = activeId ? ladders.find((l) => l.id === activeId) || null : null
  const openRung = active && openRungId ? active.rungs.find((r) => r.id === openRungId) || null : null

  // ── 사다리 CRUD ──
  const addLadder = () => {
    const name = '위기 사다리 ' + (ladders.length + 1)
    const l = seededLadder(name)
    setLadders((p) => [...p, l]); setActiveId(l.id); setOpenRungId(null)
    setConfirmDelLadder(false)
  }
  const removeLadder = () => {
    if (!active) return
    setLadders((p) => {
      const next = p.filter((l) => l.id !== active.id)
      const nextActive = next[0]?.id ?? null
      setActiveId(nextActive); setOpenRungId(null)
      return next
    })
    setConfirmDelLadder(false)
  }
  const startRename = () => { if (!active) return; setRenameVal(active.name); setRenaming(true) }
  const commitRename = () => {
    if (!active) return
    const nm = renameVal.trim() || active.name
    setLadders((p) => p.map((l) => (l.id === active.id ? { ...l, name: nm } : l)))
    setRenaming(false)
  }

  // 활성 사다리의 rungs 갱신 헬퍼
  const setRungs = (fn: (rungs: Rung[]) => Rung[]) => {
    if (!active) return
    setLadders((p) => p.map((l) => (l.id === active.id ? { ...l, rungs: fn(l.rungs) } : l)))
  }

  // ── 단(rung) CRUD ──
  const addRung = (afterId?: string, tier?: Tier) => {
    if (!active) return
    const r = { ...emptyRung() }
    // 새 단의 단계는 직전 단보다 한 칸 위(고조)로 기본값 추천
    if (tier) r.tier = tier
    else {
      const last = active.rungs[active.rungs.length - 1]
      if (last) r.tier = TIERS[Math.min(tierDef(last.tier).level, TIERS.length - 1)].key
    }
    setRungs((rungs) => {
      if (!afterId) return [...rungs, r]
      const i = rungs.findIndex((x) => x.id === afterId)
      if (i < 0) return [...rungs, r]
      const next = rungs.slice(); next.splice(i + 1, 0, r); return next
    })
    setOpenRungId(r.id)
  }
  const updateRung = (id: string, patch: Partial<Rung>) => {
    setRungs((rungs) => rungs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const removeRung = (id: string) => {
    setRungs((rungs) => rungs.filter((r) => r.id !== id))
    if (openRungId === id) setOpenRungId(null)
  }
  const moveRung = (id: string, dir: -1 | 1) => {
    setRungs((rungs) => {
      const i = rungs.findIndex((r) => r.id === id)
      if (i < 0) return rungs
      const j = i + dir
      if (j < 0 || j >= rungs.length) return rungs
      const next = rungs.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 드래그 재정렬(사다리 내부)
  const dropRungOn = (targetId: string) => {
    const from = dragRung.current
    dragRung.current = null
    setDragOverRung(null)
    if (!from || from === targetId) return
    setRungs((rungs) => {
      const fi = rungs.findIndex((r) => r.id === from)
      const ti = rungs.findIndex((r) => r.id === targetId)
      if (fi < 0 || ti < 0) return rungs
      const next = rungs.slice()
      const [m] = next.splice(fi, 1)
      next.splice(ti, 0, m)
      return next
    })
  }

  // ── 좌측 바인더 파일 드롭 → 단으로 추가 ──
  const onDropToLadder = (e: React.DragEvent) => {
    setDropActive(false)
    const item = getDragItem(e)
    if (!item || !active) return
    e.preventDefault()
    const r = { ...emptyRung(), title: item.title || '새 단', threat: (item.text || '').slice(0, 160) }
    setRungs((rungs) => [...rungs, r])
    setOpenRungId(r.id)
    setFlash(`'${item.title}'을(를) 단으로 추가했어요`)
  }

  // ── 복사/내보내기 ──
  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setFlash(label) }
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
    } catch { if (mounted.current) setFlash('복사 실패') }
  }

  // ── 프로젝트 연계 ──
  const toProject = () => {
    if (!active) return
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `위기 사다리 — ${active.name}`,
      bodyHtml: ladderToHtml(active),
      synopsis: `${active.rungs.length}단계 고조 설계 (개인→세계)`,
      meta: { 단수: String(active.rungs.length), 최고단계: tierDef(highestTier(active)).label },
    })
    setFlash(id ? '프로젝트 구조 폴더에 사다리 추가됨' : '프로젝트 추가에 실패했어요')
  }

  // ── 고조 분석 ──
  function highestTier(l: Ladder): Tier {
    let best = TIERS[0]
    l.rungs.forEach((r) => { const d = tierDef(r.tier); if (d.level > best.level) best = d })
    return best.key
  }
  // 인접 단의 단계가 내려가는(고조가 풀리는) 지점 인덱스
  const dipIndexes = (() => {
    const out = new Set<number>()
    if (!active) return out
    for (let i = 1; i < active.rungs.length; i++) {
      if (tierDef(active.rungs[i].tier).level < tierDef(active.rungs[i - 1].tier).level) out.add(i)
    }
    return out
  })()
  const tierSpread = (() => {
    if (!active || active.rungs.length === 0) return 0
    const levels = active.rungs.map((r) => tierDef(r.tier).level)
    return Math.max(...levels) - Math.min(...levels)
  })()

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const leftCol: React.CSSProperties = { width: 360, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 24 }

  // 사다리 선택 드롭다운(여러 사다리)
  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🪜" /></span>
        <strong style={{ fontSize: 15 }}>위기 사다리</strong>
        {ladders.length > 0 && (
          <select
            value={activeId || ''}
            onChange={(e) => { setActiveId(e.target.value); setOpenRungId(null); setConfirmDelLadder(false); setRenaming(false) }}
            style={{ padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', maxWidth: 220 }}
            title="작업할 사다리 선택"
          >
            {ladders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {active && <button className="minibtn" onClick={startRename} title="이름 변경"><Emoji e="✏️" /> 이름</button>}
        {active && (
          confirmDelLadder
            ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--warn)' }}>사다리 삭제?</span>
                <button className="btn-primary" style={{ background: 'var(--warn)', padding: '4px 8px', fontSize: 12 }} onClick={removeLadder}>삭제</button>
                <button className="minibtn" onClick={() => setConfirmDelLadder(false)}>취소</button>
              </span>
            : <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDelLadder(true)} title="이 사다리 삭제"><Emoji e="🗑️" /></button>
        )}
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        {active && <button className="minibtn" onClick={() => copyText(ladderToText(active), '복사됨')} title="이 사다리를 텍스트로 복사">복사</button>}
        <button className="btn-primary" onClick={addLadder}>＋ 새 사다리</button>
      </div>

      {renaming && active && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <input
            autoFocus value={renameVal} maxLength={60}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            style={{ flex: 1, padding: '6px 9px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
            placeholder="사다리 이름"
          />
          <button className="btn-primary" onClick={commitRename}>확인</button>
          <button className="minibtn" onClick={() => setRenaming(false)}>취소</button>
        </div>
      )}

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {ladders.length === 0 || !active ? (
        <div style={empty}>
          아직 위기 사다리가 없어요.<br />
          오른쪽 위 <b>＋ 새 사다리</b>로 첫 사다리를 만들어 보세요.<br /><br />
          <span style={{ fontSize: 12, lineHeight: 1.8 }}>
            판돈을 <b>개인 → 관계 → 공동체 → 세계</b>로 한 칸씩 올리며<br />
            각 단의 <b>위협·대가·전환점</b>을 정의해 이야기의 고조를 설계합니다.
          </span>
        </div>
      ) : (
        <div style={body}>
          {/* ── 좌: 시각 사다리 ── */}
          <div style={leftCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
              <span>고조 폭</span>
              <SpreadBar spread={tierSpread} />
              <span style={{ flex: 1 }} />
              <span>{active.rungs.length}단</span>
            </div>
            <div
              onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropActive(true) } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false) }}
              onDrop={onDropToLadder}
              style={{
                flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0,
                outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -4,
              }}
            >
              {active.rungs.length === 0 ? (
                <div style={{ ...empty, padding: 20 }}>단(rung)이 없습니다.<br />아래 <b>＋ 단 추가</b>로 첫 칸을 올리세요.</div>
              ) : (
                // 위가 가장 높은 판돈이 되도록 역순으로 렌더(사다리는 위로 올라간다)
                active.rungs.slice().reverse().map((r, revIdx) => {
                  const idx = active.rungs.length - 1 - revIdx
                  const d = tierDef(r.tier)
                  const isOpen = r.id === openRungId
                  const isDip = dipIndexes.has(idx)
                  return (
                    <div key={r.id}>
                      {/* 칸 사이 사다리 가로대 + 칸 사이 추가 */}
                      {revIdx > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', height: 18, gap: 4, paddingLeft: 22 }}>
                          <div style={{ flex: 1, borderTop: '2px dotted var(--border)' }} />
                          <button
                            className="minibtn"
                            style={{ padding: '0 6px', fontSize: 11, lineHeight: '16px' }}
                            title="여기(이 칸 위)에 단 추가"
                            onClick={() => addRung(r.id)}
                          >＋</button>
                          <div style={{ flex: 1, borderTop: '2px dotted var(--border)' }} />
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={() => { dragRung.current = r.id }}
                        onDragOver={(e) => { if (dragRung.current) { e.preventDefault(); if (dragOverRung !== r.id) setDragOverRung(r.id) } }}
                        onDragLeave={() => { if (dragOverRung === r.id) setDragOverRung(null) }}
                        onDrop={() => dropRungOn(r.id)}
                        onDragEnd={() => { dragRung.current = null; setDragOverRung(null) }}
                        onClick={() => setOpenRungId(isOpen ? null : r.id)}
                        style={{
                          position: 'relative', display: 'flex', gap: 8, cursor: 'pointer', userSelect: 'none',
                          border: '1px solid ' + (isOpen ? 'var(--accent)' : 'var(--border)'),
                          outline: dragOverRung === r.id ? '2px dashed var(--accent)' : 'none', outlineOffset: -2,
                          borderRadius: 10, padding: '9px 10px 9px 8px', background: isOpen ? 'var(--chrome-2)' : 'var(--panel)',
                          borderLeft: `5px solid ${d.color}`,
                        }}
                      >
                        {/* 단계 레벨 도트(고조 게이지) */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }} title={`${d.label} (레벨 ${d.level}/4)`}>
                          {[4, 3, 2, 1].map((lv) => (
                            <span key={lv} style={{ width: 7, height: 7, borderRadius: 2, background: lv <= d.level ? d.color : 'var(--border)' }} />
                          ))}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}><Emoji e={d.icon} /> {d.label}</span>
                            {r.irreversible && <span style={{ fontSize: 10, color: '#fff', background: 'var(--warn)', borderRadius: 4, padding: '1px 4px' }} title="되돌릴 수 없는 단계">비가역</span>}
                            {isDip && <span style={{ fontSize: 10, color: 'var(--warn)' }} title="앞 칸보다 판돈이 낮아져 고조가 풀립니다"><Emoji e="⚠" /> 고조↓</span>}
                            <span style={{ flex: 1 }} />
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{idx + 1}칸</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(제목 없음)</span>}
                          </div>
                          {(r.threat.trim() || r.cost.trim()) && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {r.threat.trim() && <span><Emoji e="⚠" /> {r.threat.trim()}</span>}
                              {r.threat.trim() && r.cost.trim() && <span> · </span>}
                              {r.cost.trim() && <span><Emoji e="💰" /> {r.cost.trim()}</span>}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
                            <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); moveRung(r.id, -1) }} disabled={idx === 0} title="아래로(판돈 낮춤)">▼</button>
                            <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); moveRung(r.id, 1) }} disabled={idx === active.rungs.length - 1} title="위로(판돈 높임)">▲</button>
                            <span style={{ flex: 1 }} />
                            <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); removeRung(r.id) }} title="단 삭제"><Emoji e="🗑️" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => addRung()}>＋ 단 추가 (맨 위)</button>
            </div>
          </div>

          {/* ── 우: 단 편집 / 안내 / 연계 ── */}
          <div style={rightCol}>
            {openRung ? (
              <RungEditor
                key={openRung.id}
                rung={openRung}
                index={active.rungs.findIndex((r) => r.id === openRung.id)}
                total={active.rungs.length}
                onChange={(patch) => updateRung(openRung.id, patch)}
                onClose={() => setOpenRungId(null)}
                onDelete={() => removeRung(openRung.id)}
              />
            ) : (
              <LadderGuide ladder={active} />
            )}

            <div style={{ flex: 1 }} />
            <div className="linkbar" style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={toProject}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '이 사다리를 프로젝트 자료(구조 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              ><Emoji e="📄" /> 프로젝트에 추가</button>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>좌측 바인더 파일을 사다리에 드롭하면 단으로 추가됩니다.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 고조 폭 막대 ──
function SpreadBar({ spread }: { spread: number }) {
  const max = TIERS.length - 1 // 3
  const pct = max ? Math.round((spread / max) * 100) : 0
  const color = spread >= 3 ? 'var(--ok)' : spread >= 2 ? '#e0a23a' : 'var(--warn)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 70, height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', height: '100%', width: pct + '%', background: color }} />
      </span>
      <span style={{ color }}>{spread}/{max}</span>
    </span>
  )
}

// ── 단(rung) 편집 패널 ──
function RungEditor(props: {
  rung: Rung; index: number; total: number
  onChange: (patch: Partial<Rung>) => void
  onClose: () => void; onDelete: () => void
}) {
  const { rung, index, total, onChange, onClose, onDelete } = props
  const [confirmDel, setConfirmDel] = useState(false)
  const d = tierDef(rung.tier)

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 13 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}><Emoji e={d.icon} /> {d.label}</span>
        <strong style={{ fontSize: 14 }}>{index + 1}번째 단 편집</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>(총 {total}단)</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onClose}>닫기</button>
      </div>

      <div style={field}>
        <div style={label}>단 제목 (이 칸에서 벌어지는 일)</div>
        <input style={input} value={rung.title} maxLength={90} autoFocus
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="예: 협박 편지가 도착한다" />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="📶" /> 판돈의 범위 (고조 단계)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {TIERS.map((t) => {
            const on = rung.tier === t.key
            return (
              <button
                key={t.key}
                className={'minibtn' + (on ? ' active' : '')}
                onClick={() => onChange({ tier: t.key })}
                style={{ borderColor: on ? t.color : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, color: on ? t.color : undefined, fontWeight: on ? 700 : 400 }}
                title={t.hint}
              ><Emoji e={t.icon} /> {t.label}</button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e={d.icon} /> <b>{d.label}</b>: {d.hint}</div>
      </div>

      <div style={field}>
        <div style={label}>↑ 전환점 (이 칸으로 올라서게 만든 사건)</div>
        <textarea style={area} value={rung.trigger} maxLength={300}
          onChange={(e) => onChange({ trigger: e.target.value })}
          placeholder="앞 칸에서 무슨 일이 터져 판돈이 이만큼 커졌나요? 예: 적이 가족의 위치를 알아냈다" />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="⚠" /> 위협 (무엇이 위험에 처하는가)</div>
        <textarea style={area} value={rung.threat} maxLength={400}
          onChange={(e) => onChange({ threat: e.target.value })}
          placeholder={`${d.phrase}에게 닥치는 위험. 예: 형의 목숨이 인질로 잡힌다`} />
      </div>

      <div style={field}>
        <div style={label}><Emoji e="💰" /> 대가 (실패하면 치르는 값)</div>
        <textarea style={area} value={rung.cost} maxLength={400}
          onChange={(e) => onChange({ cost: e.target.value })}
          placeholder="이 단에서 지면 돌이킬 수 없게 잃는 것. 예: 형을 잃고, 도시는 적의 손에 넘어간다" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={rung.irreversible} onChange={(e) => onChange({ irreversible: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--warn)', cursor: 'pointer' }} />
        <span><Emoji e="🔒" /> <b>비가역</b> — 이 단을 넘으면 되돌릴 수 없다 (배수의 진)</span>
      </label>

      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={area} value={rung.notes} maxLength={500}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="복선, 등장인물 반응, 장면 아이디어 등" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {confirmDel ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--warn)', alignSelf: 'center' }}>이 단을 삭제할까요?</span>
            <button className="btn-primary" style={{ background: 'var(--warn)', padding: '5px 10px', fontSize: 12 }} onClick={onDelete}>삭제</button>
            <button className="minibtn" onClick={() => setConfirmDel(false)}>취소</button>
          </>
        ) : (
          <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(true)}><Emoji e="🗑️" /> 이 단 삭제</button>
        )}
      </div>
    </div>
  )
}

// ── 사다리 개요/가이드(단 미선택 시) ──
function LadderGuide({ ladder }: { ladder: Ladder }) {
  const counts = TIERS.map((t) => ({ t, n: ladder.rungs.filter((r) => r.tier === t.key).length }))
  const filled = ladder.rungs.filter((r) => r.threat.trim() && r.cost.trim()).length
  const irr = ladder.rungs.filter((r) => r.irreversible).length
  const top = ladder.rungs.length ? tierDef(ladder.rungs.reduce((a, r) => (tierDef(r.tier).level > tierDef(a.tier).level ? r : a)).tier) : null

  const card: React.CSSProperties = { padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 12 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }

  return (
    <div>
      <div style={{ ...card, borderColor: 'var(--accent)' }}>
        <div style={label}><Emoji e="📊" /> 사다리 개요</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13 }}>
          <span><b style={{ fontSize: 18 }}>{ladder.rungs.length}</b> 단</span>
          <span>위협·대가 완성 <b>{filled}</b>/{ladder.rungs.length}</span>
          <span>비가역 <b>{irr}</b></span>
          <span>최고 판돈 {top ? <b style={{ color: top.color }}><Emoji e={top.icon} /> {top.label}</b> : '—'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {counts.map(({ t, n }) => (
            <div key={t.key} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15 }}><Emoji e={t.icon} /></div>
              <div style={{ fontSize: 11, color: t.color, fontWeight: 700, marginTop: 2 }}>{t.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>{n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={label}><Emoji e="🪜" /> 위기 사다리란?</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.75, color: 'var(--text)' }}>
          갈등에서 <b>걸린 것(판돈·stakes)</b>을 한 칸씩 키워 긴장을 끌어올리는 설계 도구입니다.
          판돈의 범위를 <b style={{ color: TIERS[0].color }}>개인</b> →
          <b style={{ color: TIERS[1].color }}> 관계</b> →
          <b style={{ color: TIERS[2].color }}> 공동체</b> →
          <b style={{ color: TIERS[3].color }}> 세계</b> 순으로 넓히며,
          각 단마다 <b>전환점</b>으로 올라서고 <b>위협</b>과 <b>대가</b>를 구체화하세요.
        </div>
        <ul style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--muted)', margin: '10px 0 0', paddingLeft: 18 }}>
          <li>위 칸일수록 판돈이 커지도록 단을 배치하세요(드래그·▲▼).</li>
          <li>판돈이 앞 칸보다 낮아지면 <span style={{ color: 'var(--warn)' }}><Emoji e="⚠" /> 고조↓</span> 경고가 뜹니다.</li>
          <li><b>비가역</b> 표시로 되돌릴 수 없는 분기점을 못박으세요.</li>
          <li>단을 클릭하면 오른쪽에서 자세히 편집할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  )
}
