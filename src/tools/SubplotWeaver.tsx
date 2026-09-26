// 서브플롯 직조기 — 메인 플롯과 여러 서브플롯(로맨스/미스터리/성장 등)을 각각의 '레인'으로 두고,
// 레인마다 비트(사건)를 시간축 위에 배치한다. 서로 다른 레인의 비트가 같은 시점에 모이면
// '교차 지점'으로 표시해, 어떤 장면에서 줄거리들이 엮이는지 한눈에 본다.
// 서브플롯 CRUD(추가/이름변경/색/유형/삭제/순서), 비트 추가/수정/삭제/시점이동.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:subplot-weaver' 에 자동 저장/복원.
// 연계(linkbus): 직조한 플롯 구조를 실제 프로젝트 자료('research')/'플롯' 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'subplot-weaver', name: '서브플롯 직조', icon: '🧶', group: '구상·정리', intro: '메인 플롯과 서브플롯을 레인으로 두고 비트를 시간축에 배치해 교차 지점을 직조하세요', w: 820, h: 600 }

const LS_KEY = 'sry:tool:subplot-weaver'
const STEPS = 12          // 시간축 칸 수(0..STEPS-1)
const CROSS_TOL = 0       // 같은 칸(스텝)에 있으면 교차로 간주

// 서브플롯 유형 프리셋 — 라벨/이모지/색(시작값). 색은 CSS 변수 대신 고정 헥스(레인 구분용).
interface KindDef { key: string; label: string; icon: string; color: string }
const KINDS: KindDef[] = [
  { key: 'main', label: '메인', icon: '🎯', color: '#4a76d4' },
  { key: 'romance', label: '로맨스', icon: '💞', color: '#e0608a' },
  { key: 'mystery', label: '미스터리', icon: '🔍', color: '#8e5ad4' },
  { key: 'growth', label: '성장', icon: '🌱', color: '#0f9d58' },
  { key: 'rivalry', label: '경쟁/대립', icon: '⚔️', color: '#db4437' },
  { key: 'family', label: '가족', icon: '🏠', color: '#c98a2c' },
  { key: 'mentor', label: '스승/조력', icon: '🧭', color: '#2c9ec9' },
  { key: 'theme', label: '주제/상징', icon: '🕯️', color: '#7a7f8a' },
  { key: 'other', label: '기타', icon: '🧩', color: '#5f6b7a' },
]
const PALETTE = ['#4a76d4', '#e0608a', '#8e5ad4', '#0f9d58', '#db4437', '#c98a2c', '#2c9ec9', '#7a7f8a', '#d4a017', '#5f6b7a']
function kindDef(k: string): KindDef { return KINDS.find((x) => x.key === k) || KINDS[KINDS.length - 1] }

interface Beat { id: string; step: number; label: string; note: string }
interface Lane { id: string; name: string; kind: string; color: string; beats: Beat[] }
interface SaveShape { title: string; lanes: Lane[]; openLane: string | null }

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampStep(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.min(STEPS - 1, Math.max(0, v))
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function defaultLanes(): Lane[] {
  return [
    { id: newId(), name: '메인 플롯', kind: 'main', color: kindDef('main').color, beats: [
      { id: newId(), step: 0, label: '발단', note: '' },
      { id: newId(), step: 5, label: '중간점', note: '' },
      { id: newId(), step: 11, label: '절정', note: '' },
    ] },
    { id: newId(), name: '로맨스 서브플롯', kind: 'romance', color: kindDef('romance').color, beats: [
      { id: newId(), step: 2, label: '만남', note: '' },
      { id: newId(), step: 8, label: '갈등', note: '' },
    ] },
  ]
}

// localStorage 복원 — 미지원/손상 시 graceful.
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', lanes: defaultLanes(), openLane: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.lanes) ? p.lanes : []
    const lanes: Lane[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const kind = typeof x.kind === 'string' ? x.kind : 'other'
      const beats: Beat[] = Array.isArray(x.beats)
        ? x.beats.filter((b: any) => b && typeof b === 'object').map((b: any) => ({
            id: String(b.id || newId()),
            step: clampStep(b.step),
            label: String(b.label || ''),
            note: String(b.note || ''),
          }))
        : []
      return {
        id: String(x.id || newId()),
        name: String(x.name || '이름 없는 줄거리'),
        kind,
        color: typeof x.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(x.color) ? x.color : kindDef(kind).color,
        beats,
      }
    })
    if (lanes.length === 0) return { title: String(p?.title || ''), lanes: defaultLanes(), openLane: null }
    const openLane = typeof p?.openLane === 'string' && lanes.some((l) => l.id === p.openLane) ? p.openLane : null
    return { title: String(p?.title || ''), lanes, openLane }
  } catch { return { title: '', lanes: defaultLanes(), openLane: null } }
}

// 교차 지점 계산 — 스텝별로 비트를 가진 레인이 2개 이상이면 교차.
interface Cross { step: number; lanes: { lane: Lane; beats: Beat[] }[] }
function computeCrosses(lanes: Lane[]): Cross[] {
  const byStep = new Map<number, { lane: Lane; beats: Beat[] }[]>()
  lanes.forEach((lane) => {
    const grouped = new Map<number, Beat[]>()
    lane.beats.forEach((b) => {
      const k = b.step
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k)!.push(b)
    })
    grouped.forEach((beats, step) => {
      if (!byStep.has(step)) byStep.set(step, [])
      byStep.get(step)!.push({ lane, beats })
    })
  })
  const crosses: Cross[] = []
  Array.from(byStep.keys()).sort((a, b) => a - b).forEach((step) => {
    const entries = byStep.get(step)!
    if (entries.length >= 2) crosses.push({ step, lanes: entries })
  })
  return crosses
}

export default function SubplotWeaver({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [lanes, setLanes] = useState<Lane[]>(init.current.lanes)
  const [openLane, setOpenLane] = useState<string | null>(init.current.openLane)
  const [editBeat, setEditBeat] = useState<{ laneId: string; beatId: string } | null>(null)
  const [confirmDelLane, setConfirmDelLane] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const dragLane = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 외부에서 제목/서브플롯 씨앗 전달 시 1회 반영(예: 다른 도구에서 열기).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    if (typeof payload.title === 'string' && payload.title && !title.trim()) setTitle(payload.title)
    if (typeof payload.subplotName === 'string' && payload.subplotName) {
      const kind = typeof payload.subplotKind === 'string' ? payload.subplotKind : 'other'
      const lane: Lane = { id: newId(), name: payload.subplotName, kind, color: kindDef(kind).color, beats: [] }
      setLanes((prev) => [...prev, lane])
      setOpenLane(lane.id)
    }
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, lanes, openLane })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, lanes, openLane])

  // 토스트 자동 소거.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const crosses = computeCrosses(lanes)

  // ── 레인(서브플롯) CRUD ──
  const addLane = (kind = 'other') => {
    const used = lanes.map((l) => l.color)
    const color = PALETTE.find((c) => !used.includes(c)) || kindDef(kind).color
    const lane: Lane = { id: newId(), name: kindDef(kind).label + ' 서브플롯', kind, color, beats: [] }
    setLanes((prev) => [...prev, lane])
    setOpenLane(lane.id)
    setConfirmDelLane(null)
  }
  const patchLane = (laneId: string, patch: Partial<Lane>) =>
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, ...patch } : l)))
  const removeLane = (laneId: string) => {
    setLanes((prev) => prev.filter((l) => l.id !== laneId))
    if (openLane === laneId) setOpenLane(null)
    if (editBeat?.laneId === laneId) setEditBeat(null)
    setConfirmDelLane(null)
  }
  const moveLane = (laneId: string, dir: -1 | 1) => {
    setLanes((prev) => {
      const i = prev.findIndex((l) => l.id === laneId)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const onDropLane = (targetId: string) => {
    const from = dragLane.current
    dragLane.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setLanes((prev) => {
      const fi = prev.findIndex((l) => l.id === from)
      const ti = prev.findIndex((l) => l.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // ── 비트 CRUD ──
  const addBeat = (laneId: string, step: number) => {
    const beat: Beat = { id: newId(), step: clampStep(step), label: '', note: '' }
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, beats: [...l.beats, beat] } : l)))
    setEditBeat({ laneId, beatId: beat.id })
  }
  const patchBeat = (laneId: string, beatId: string, patch: Partial<Beat>) =>
    setLanes((prev) => prev.map((l) => (l.id === laneId
      ? { ...l, beats: l.beats.map((b) => (b.id === beatId ? { ...b, ...patch } : b)) }
      : l)))
  const removeBeat = (laneId: string, beatId: string) => {
    setLanes((prev) => prev.map((l) => (l.id === laneId ? { ...l, beats: l.beats.filter((b) => b.id !== beatId) } : l)))
    if (editBeat?.beatId === beatId) setEditBeat(null)
  }

  const editing = editBeat ? lanes.find((l) => l.id === editBeat.laneId)?.beats.find((b) => b.id === editBeat.beatId) || null : null
  const editingLane = editBeat ? lanes.find((l) => l.id === editBeat.laneId) || null : null

  // ── 내보내기/프로젝트 ──
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# ${title.trim() || '서브플롯 직조'}`)
    lines.push('')
    lanes.forEach((l) => {
      const d = kindDef(l.kind)
      lines.push(`## ${d.icon} ${l.name} (${d.label})`)
      const sorted = [...l.beats].sort((a, b) => a.step - b.step)
      if (sorted.length === 0) lines.push('  · (비트 없음)')
      sorted.forEach((b) => {
        lines.push(`  · [${b.step + 1}/${STEPS}] ${b.label || '(제목 없음)'}${b.note.trim() ? ' — ' + b.note.trim() : ''}`)
      })
      lines.push('')
    })
    if (crosses.length) {
      lines.push('## 🔗 교차 지점')
      crosses.forEach((c) => {
        const names = c.lanes.map((e) => `${kindDef(e.lane.kind).icon} ${e.lane.name}`).join(' × ')
        lines.push(`  · 시점 ${c.step + 1}: ${names}`)
      })
    }
    return lines.join('\n')
  }

  const buildHtml = (): string => {
    const parts: string[] = []
    lanes.forEach((l) => {
      const d = kindDef(l.kind)
      parts.push(`<p><b>${escHtml(d.icon + ' ' + l.name)}</b> <span style="color:#888">(${escHtml(d.label)})</span></p>`)
      const sorted = [...l.beats].sort((a, b) => a.step - b.step)
      if (sorted.length === 0) { parts.push('<p style="color:#888">· (비트 없음)</p>'); return }
      const items = sorted.map((b) =>
        `<li>[${b.step + 1}/${STEPS}] ${escHtml(b.label || '(제목 없음)')}${b.note.trim() ? ' — ' + escHtml(b.note.trim()) : ''}</li>`).join('')
      parts.push(`<ul>${items}</ul>`)
    })
    if (crosses.length) {
      parts.push('<p><b>🔗 교차 지점</b></p>')
      const items = crosses.map((c) => {
        const names = c.lanes.map((e) => escHtml(kindDef(e.lane.kind).icon + ' ' + e.lane.name)).join(' × ')
        return `<li>시점 ${c.step + 1}: ${names}</li>`
      }).join('')
      parts.push(`<ul>${items}</ul>`)
    }
    return parts.join('')
  }

  const copyAll = () => {
    const text = buildText()
    const done = () => { if (mounted.current) setToast('복사됨') }
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
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setToast('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: title.trim() ? `서브플롯 직조 — ${title.trim()}` : '서브플롯 직조',
      bodyHtml: buildHtml(),
      synopsis: `${lanes.length}개 줄거리 · 교차 ${crosses.length}곳`,
      meta: { 줄거리수: String(lanes.length), 교차지점: String(crosses.length) },
    })
    if (mounted.current) setToast(id ? '프로젝트 자료에 플롯 문서 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const linked = hasProjectBridge()
  const totalBeats = lanes.reduce((n, l) => n + l.beats.length, 0)

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const titleInput: React.CSSProperties = { flex: '0 1 220px', padding: '6px 9px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🧶"/></span>
        <strong style={{ fontSize: 15 }}>서브플롯 직조</strong>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목(선택)" maxLength={80} />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>줄거리 {lanes.length} · 비트 {totalBeats} · 교차 {crosses.length}</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
        <button className="minibtn" onClick={copyAll} disabled={lanes.length === 0} title="전체를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={() => addLane('other')} title="서브플롯 레인 추가">＋ 서브플롯</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {/* 유형 빠른 추가 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>유형으로 추가:</span>
        {KINDS.filter((k) => k.key !== 'other').map((k) => (
          <button key={k.key} className="minibtn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => addLane(k.key)} title={`${k.label} 레인 추가`}><Emoji e={k.icon}/> {k.label}</button>
        ))}
      </div>

      <div style={body}>
        {lanes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 24 }}>
            아직 줄거리 레인이 없어요.<br />위에서 <b>＋ 서브플롯</b> 또는 유형 버튼으로<br />메인 플롯과 서브플롯을 추가해 비트를 엮어 보세요.
          </div>
        ) : (
          <>
            {/* 시간축 눈금 */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px 4px', gap: 8 }}>
              <div style={{ width: 140, flexShrink: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>← 시작 · 시간축 · 끝 →</div>
              <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                {Array.from({ length: STEPS }).map((_, s) => {
                  const isCross = crosses.some((c) => c.step === s)
                  return (
                    <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: isCross ? 'var(--accent)' : 'var(--muted)', fontWeight: isCross ? 700 : 400 }}>{s + 1}</div>
                  )
                })}
              </div>
              <div style={{ width: 70, flexShrink: 0 }} />
            </div>

            {/* 레인들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 14px 14px' }}>
              {lanes.map((lane, i) => (
                <LaneRow
                  key={lane.id}
                  lane={lane} index={i} total={lanes.length}
                  crosses={crosses}
                  onAddBeat={(step) => addBeat(lane.id, step)}
                  onEditBeat={(bid) => setEditBeat({ laneId: lane.id, beatId: bid })}
                  onMoveBeatStep={(bid, step) => patchBeat(lane.id, bid, { step: clampStep(step) })}
                  onMoveLane={(dir) => moveLane(lane.id, dir)}
                  onRename={(name) => patchLane(lane.id, { name })}
                  onAskDelete={() => setConfirmDelLane(lane.id)}
                  confirmDel={confirmDelLane === lane.id}
                  onConfirmDelete={() => removeLane(lane.id)}
                  onCancelDelete={() => setConfirmDelLane(null)}
                  active={openLane === lane.id}
                  onSelect={() => setOpenLane(openLane === lane.id ? null : lane.id)}
                  onColor={(color) => patchLane(lane.id, { color })}
                  onKind={(kind) => patchLane(lane.id, { kind })}
                  dragOver={dragOver === lane.id}
                  onDragStart={() => { dragLane.current = lane.id }}
                  onDragOverRow={() => { if (dragOver !== lane.id) setDragOver(lane.id) }}
                  onDragLeaveRow={() => { if (dragOver === lane.id) setDragOver(null) }}
                  onDropRow={() => onDropLane(lane.id)}
                  onDragEndRow={() => { dragLane.current = null; setDragOver(null) }}
                />
              ))}
            </div>

            {/* 교차 지점 요약 */}
            <div style={{ margin: '0 14px 14px', padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}><Emoji e="🔗"/> 교차 지점 <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— 같은 시점에 둘 이상의 줄거리가 만나는 곳</span></div>
              {crosses.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>아직 교차 지점이 없어요. 서로 다른 레인의 비트를 같은 시점(같은 칸)에 두면 여기에 표시됩니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {crosses.map((c) => (
                    <div key={c.step} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--accent)', minWidth: 54 }}>시점 {c.step + 1}</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {c.lanes.map((e) => (
                          <span key={e.lane.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, fontSize: 11, color: '#fff', background: e.lane.color }}>
                            <Emoji e={kindDef(e.lane.kind).icon}/> {e.lane.name}
                            <span style={{ opacity: 0.85 }}>· {e.beats.map((b) => b.label || '비트').join(', ')}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 프로젝트 연계 */}
            <div className="linkbar" style={{ margin: '0 14px 16px' }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={toProject} disabled={!linked} title={linked ? '직조한 플롯 구조를 프로젝트 자료(플롯 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            </div>

            <div className="license-note" style={{ margin: '0 14px 14px', fontSize: 11, color: 'var(--muted)' }}>
              자체 제작 도구 — 외부 데이터/이미지 없음. 모든 내용은 이 브라우저에만 저장됩니다.
            </div>
          </>
        )}
      </div>

      {/* 비트 편집 오버레이 */}
      {editing && editingLane && (
        <BeatEditor
          lane={editingLane}
          beat={editing}
          onChange={(patch) => patchBeat(editingLane.id, editing.id, patch)}
          onDelete={() => removeBeat(editingLane.id, editing.id)}
          onClose={() => setEditBeat(null)}
        />
      )}
    </div>
  )
}

// ── 레인 한 줄 ──
function LaneRow(props: {
  lane: Lane; index: number; total: number; crosses: Cross[]
  onAddBeat: (step: number) => void; onEditBeat: (beatId: string) => void; onMoveBeatStep: (beatId: string, step: number) => void
  onMoveLane: (dir: -1 | 1) => void; onRename: (name: string) => void
  onAskDelete: () => void; confirmDel: boolean; onConfirmDelete: () => void; onCancelDelete: () => void
  active: boolean; onSelect: () => void; onColor: (c: string) => void; onKind: (k: string) => void
  dragOver: boolean; onDragStart: () => void; onDragOverRow: () => void; onDragLeaveRow: () => void; onDropRow: () => void; onDragEndRow: () => void
}) {
  const { lane, index, total, crosses, onAddBeat, onEditBeat, onMoveBeatStep, onMoveLane, onRename } = props
  const { onAskDelete, confirmDel, onConfirmDelete, onCancelDelete, active, onSelect, onColor, onKind } = props
  const { dragOver, onDragStart, onDragOverRow, onDragLeaveRow, onDropRow, onDragEndRow } = props
  const d = kindDef(lane.kind)
  const dragBeat = useRef<string | null>(null)

  // 트랙 내 클릭 위치 → 스텝.
  const trackRef = useRef<HTMLDivElement | null>(null)
  const stepFromClientX = (clientX: number): number => {
    const el = trackRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    if (r.width <= 0) return 0
    const ratio = (clientX - r.left) / r.width
    return clampStep(Math.floor(ratio * STEPS))
  }

  return (
    <div
      draggable
      onDragStart={(e) => { dragBeat.current = null; onDragStart(); e.dataTransfer.effectAllowed = 'move' }}
      onDragOver={(e) => { if (!dragBeat.current) { e.preventDefault(); onDragOverRow() } }}
      onDragLeave={onDragLeaveRow}
      onDrop={(e) => { if (!dragBeat.current) { e.preventDefault(); onDropRow() } }}
      onDragEnd={onDragEndRow}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 6px', borderRadius: 10,
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
        outline: dragOver ? '2px dashed var(--accent)' : 'none',
        background: active ? 'var(--chrome-2)' : 'var(--panel)',
      }}
    >
      {/* 레인 헤더 */}
      <div style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span title="드래그로 순서 변경" style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 12 }}>⠿</span>
          <span
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            title={active ? '강조 해제' : '이 레인 강조'}
            style={{ width: 11, height: 11, borderRadius: 3, background: lane.color, flexShrink: 0, cursor: 'pointer', boxShadow: active ? '0 0 0 2px var(--accent)' : '0 0 0 1px rgba(0,0,0,.15)' }}
          />
          <span style={{ fontSize: 13 }}><Emoji e={d.icon}/></span>
          <input
            value={lane.name}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            maxLength={40}
            style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'var(--text)', padding: '1px 0' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <select value={lane.kind} onChange={(e) => onKind(e.target.value)} onClick={(e) => e.stopPropagation()} title="유형" style={{ fontSize: 10, padding: '1px 2px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', maxWidth: 64 }}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.icon} {k.label}</option>)}
          </select>
          <input type="color" value={lane.color} onChange={(e) => onColor(e.target.value)} onClick={(e) => e.stopPropagation()} title="레인 색" style={{ width: 20, height: 18, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }} />
          <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={(e) => { e.stopPropagation(); onMoveLane(-1) }} disabled={index === 0} title="위로">▲</button>
          <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={(e) => { e.stopPropagation(); onMoveLane(1) }} disabled={index === total - 1} title="아래로">▼</button>
          <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); onAskDelete() }} title="레인 삭제"><Emoji e="🗑️"/></button>
        </div>
      </div>

      {/* 트랙 */}
      <div
        ref={trackRef}
        onDoubleClick={(e) => { e.stopPropagation(); onAddBeat(stepFromClientX(e.clientX)) }}
        onDragOver={(e) => { if (dragBeat.current) e.preventDefault() }}
        onDrop={(e) => {
          if (dragBeat.current) {
            e.preventDefault(); e.stopPropagation()
            onMoveBeatStep(dragBeat.current, stepFromClientX(e.clientX))
            dragBeat.current = null
          }
        }}
        title="빈 곳을 더블클릭하면 그 시점에 비트가 추가됩니다 · 비트를 드래그하면 시점 이동"
        style={{ flex: 1, position: 'relative', height: 44, borderRadius: 8, background: 'var(--paper)', border: '1px dashed var(--border)', cursor: 'copy', overflow: 'hidden' }}
      >
        {/* 칸 구분선 + 베이스 라인 */}
        {Array.from({ length: STEPS }).map((_, s) => {
          const isCross = crosses.some((c) => c.step === s)
          return (
            <div key={s} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(s / STEPS) * 100}%`, width: `${100 / STEPS}%`, borderLeft: s === 0 ? 'none' : '1px solid var(--border)', background: isCross ? 'color-mix(in srgb, var(--accent) 9%, transparent)' : 'transparent' }} />
          )
        })}
        <div style={{ position: 'absolute', left: 6, right: 6, top: '50%', height: 2, background: lane.color, opacity: 0.45, borderRadius: 2 }} />
        {/* 비트 */}
        {lane.beats.map((b) => {
          const left = ((b.step + 0.5) / STEPS) * 100
          const isCross = crosses.some((c) => c.step === b.step)
          return (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => { dragBeat.current = b.id; e.stopPropagation(); e.dataTransfer.effectAllowed = 'move' }}
              onDragEnd={(e) => { e.stopPropagation(); dragBeat.current = null }}
              onClick={(e) => { e.stopPropagation(); onEditBeat(b.id) }}
              title={`${b.label || '(제목 없음)'} · 시점 ${b.step + 1}/${STEPS}\n클릭: 수정 · 드래그: 시점 이동`}
              style={{
                position: 'absolute', top: '50%', left: `${left}%`, transform: 'translate(-50%,-50%)',
                maxWidth: `${100 / STEPS + 6}%`, display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 7px', borderRadius: 999, cursor: 'grab', userSelect: 'none',
                background: lane.color, color: '#fff', fontSize: 11, fontWeight: 600,
                boxShadow: isCross ? '0 0 0 2px var(--accent), 0 1px 3px rgba(0,0,0,.3)' : '0 1px 3px rgba(0,0,0,.3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {isCross && <span style={{ fontSize: 9 }}><Emoji e="🔗"/></span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label || '비트'}</span>
            </div>
          )
        })}
      </div>

      {/* 비트 추가 버튼(트랙 끝) */}
      <div style={{ width: 70, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="minibtn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); onAddBeat(Math.min(STEPS - 1, lane.beats.length ? Math.max(...lane.beats.map((x) => x.step)) + 1 : 0)) }} onMouseDown={(e) => e.stopPropagation()} title="이 레인에 비트 추가">＋ 비트</button>
      </div>

      {confirmDel && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', zIndex: 5, marginTop: 0, padding: 8, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11, boxShadow: '0 4px 14px rgba(0,0,0,.25)', left: 12, alignSelf: 'center' }}>
          <div style={{ marginBottom: 6, color: 'var(--warn)' }}>'{lane.name}' 레인을 삭제할까요? (비트도 함께)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary" style={{ padding: '3px 9px', fontSize: 11, background: 'var(--warn)' }} onClick={onConfirmDelete}>삭제</button>
            <button className="minibtn" style={{ padding: '3px 9px', fontSize: 11 }} onClick={onCancelDelete}>취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 비트 편집 오버레이 ──
function BeatEditor(props: {
  lane: Lane; beat: Beat
  onChange: (patch: Partial<Beat>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const { lane, beat, onChange, onDelete, onClose } = props
  const d = kindDef(lane.kind)
  const labelRef = useRef<HTMLInputElement | null>(null)

  // 진입 시 라벨 포커스 + ESC 닫기.
  useEffect(() => {
    const t = window.setTimeout(() => labelRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(420px, 100%)', maxHeight: '100%', overflow: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,.35)', boxSizing: 'border-box' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: lane.color, flexShrink: 0 }} />
          <strong style={{ fontSize: 14 }}><Emoji e={d.icon}/> 비트 편집</strong>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{lane.name}</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={onClose} title="닫기">✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={label}>비트 제목</div>
          <input ref={labelRef} style={input} value={beat.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="예: 첫 단서 발견 / 고백 / 배신" maxLength={60} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={label}>시점 (1 ~ {STEPS})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range" min={0} max={STEPS - 1} step={1} value={beat.step}
              onChange={(e) => onChange({ step: clampStep(e.target.value) })}
              style={{ flex: 1, accentColor: lane.color, cursor: 'pointer' }}
            />
            <span style={{ width: 56, textAlign: 'right', fontSize: 13, fontWeight: 700, color: lane.color }}>{beat.step + 1}/{STEPS}</span>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={label}>메모 (선택)</div>
          <textarea
            style={{ ...input, resize: 'vertical', minHeight: 70, lineHeight: 1.5, fontFamily: 'inherit' }}
            value={beat.note} onChange={(e) => onChange({ note: e.target.value })}
            placeholder="이 비트에서 무슨 일이 일어나는지, 다른 줄거리와 어떻게 엮이는지"
            maxLength={400}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => { onDelete(); onClose() }} title="이 비트 삭제"><Emoji e="🗑️"/> 삭제</button>
          <span style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  )
}
