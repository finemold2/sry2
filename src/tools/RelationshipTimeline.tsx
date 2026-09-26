// 관계 변화 타임라인 — 두 인물(공유 라이브러리에서 선택하거나 직접 입력) 사이의 관계가
// 시간에 따라 어떻게 변하는지(우호/적대/연정/무관심 등) 시점별로 기록하고,
//  ① 친밀도(-5~+5) 꺽은선 곡선  ② 시점별 관계 '상태' 단계 띠(밴드)  두 방식으로 시각화한다.
// 시점 추가/삭제/이름·메모 수정/순서이동(CRUD), 상태/친밀도 슬라이더, 진단(급변·전환점) 제공.
// 자급식: react 와 './linkbus' 만 import. 전부 로컬(외부 네트워크 불필요 → 저작권 안전).
// localStorage 'sry:tool:relationship-timeline' 자동 저장/복원(차단 시 graceful).
// 연계: useLibraryList('characters') 로 두 인물을 고르고, payload.{a,b} 로도 사전 선택.
//       addToProject 로 '자료 › 인물' 폴더에 관계 타임라인 문서를 추가. 인물 시트/관계도 함께 열기.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList, openToolLinked, addToProject, hasProjectBridge,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'relationship-timeline',
  name: '관계 타임라인',
  icon: '💞',
  group: '구상·정리',
  intro: '두 인물의 관계가 시점별로 어떻게 변하는지(우호·적대·연정 등) 곡선과 단계 띠로 시각화하세요',
  w: 760,
  h: 620,
}

const LS_KEY = 'sry:tool:relationship-timeline'
const MINV = -5
const MAXV = 5

// ── 관계 '상태' 분류 — 색으로 구분(곡선 점·단계 띠에 사용) ─────────────
interface RelState { key: string; label: string; color: string }
const REL_STATES: RelState[] = [
  { key: 'love', label: '연정', color: '#e0518b' },
  { key: 'warm', label: '우호', color: '#3fa35a' },
  { key: 'ally', label: '동맹', color: '#3d7fd6' },
  { key: 'neutral', label: '무관심', color: '#7a8493' },
  { key: 'tense', label: '긴장', color: '#e0992b' },
  { key: 'rivalry', label: '경쟁', color: '#c9772b' },
  { key: 'hostile', label: '적대', color: '#d2473b' },
  { key: 'betrayal', label: '배신', color: '#8a5cd6' },
]
const stateOf = (k: string): RelState =>
  REL_STATES.find((s) => s.key === k) || REL_STATES[3]

// 상태 기본 친밀도(상태를 고르면 슬라이더 초깃값으로 제안) — 사용자가 다시 조정 가능.
const STATE_DEFAULT_VALUE: Record<string, number> = {
  love: 5, warm: 3, ally: 2, neutral: 0, tense: -1, rivalry: -2, hostile: -4, betrayal: -3,
}

interface Point {
  id: string
  when: string     // 시점 라벨(예: '1장', '재회', '3년 후')
  state: string    // RelState.key
  value: number    // 친밀도 -5~+5
  note: string     // 변화 계기/메모
}
interface Store {
  title: string
  aName: string
  bName: string
  points: Point[]
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampValue(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.min(MAXV, Math.max(MINV, v))
}

function defaultPoints(): Point[] {
  return [
    { id: newId(), when: '첫 만남', state: 'neutral', value: 0, note: '' },
    { id: newId(), when: '가까워짐', state: 'warm', value: 3, note: '' },
    { id: newId(), when: '갈등', state: 'hostile', value: -3, note: '' },
  ]
}

// localStorage 복원 — 미지원/손상 시 graceful.
function load(): Store {
  const fallback = (): Store => ({ title: '', aName: '', bName: '', points: defaultPoints() })
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback()
    const points: Point[] = Array.isArray(p.points)
      ? p.points
          .filter((x: any) => x && typeof x === 'object')
          .map((x: any) => ({
            id: String(x.id || newId()),
            when: String(x.when ?? '').slice(0, 40),
            state: REL_STATES.some((s) => s.key === x.state) ? String(x.state) : 'neutral',
            value: clampValue(x.value),
            note: String(x.note ?? '').slice(0, 300),
          }))
      : defaultPoints()
    return {
      title: typeof p.title === 'string' ? p.title.slice(0, 80) : '',
      aName: typeof p.aName === 'string' ? p.aName.slice(0, 40) : '',
      bName: typeof p.bName === 'string' ? p.bName.slice(0, 40) : '',
      points: points.length ? points : defaultPoints(),
    }
  } catch { return fallback() }
}

// 친밀도 → 라벨(곡선 보조 설명)
function valueWord(v: number): string {
  if (v >= 4) return '매우 가까움'
  if (v >= 2) return '가까움'
  if (v >= 1) return '약간 호의'
  if (v === 0) return '중립'
  if (v <= -4) return '매우 적대'
  if (v <= -2) return '적대'
  return '약간 냉랭'
}

interface Props { payload?: Record<string, unknown> }

export default function RelationshipTimeline({ payload }: Props) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [aName, setAName] = useState(init.current.aName)
  const [bName, setBName] = useState(init.current.bName)
  const [points, setPoints] = useState<Point[]>(init.current.points)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWhen, setEditWhen] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [view, setView] = useState<'curve' | 'band'>('curve')

  const libChars = useLibraryList('characters')
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ title, aName, bName, points } as Store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [title, aName, bName, points])

  // 토스트 자동 소거.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  // ── [연계] payload.{a,b} 또는 payload.characters 로 두 인물 사전 선택 ──
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const pick = (v: unknown): string =>
      typeof v === 'string' ? v
        : v && typeof v === 'object' && typeof (v as any).name === 'string' ? (v as any).name : ''
    let na = pick((payload as any).a)
    let nb = pick((payload as any).b)
    const arr = (payload as any).characters
    if ((!na || !nb) && Array.isArray(arr)) {
      if (!na) na = pick(arr[0])
      if (!nb) nb = pick(arr[1])
    }
    if (na.trim()) setAName(na.trim().slice(0, 40))
    if (nb.trim()) setBName(nb.trim().slice(0, 40))
    if (mounted.current && (na.trim() || nb.trim())) setToast('전달받은 인물을 선택했어요.')
  }, [payload]) // eslint-disable-line

  // ── CRUD ──────────────────────────────────────────────────
  const addPoint = () => {
    setPoints((prev) => {
      const last = prev[prev.length - 1]
      const n = prev.length + 1
      return [...prev, {
        id: newId(),
        when: `시점 ${n}`,
        state: last ? last.state : 'neutral',
        value: last ? last.value : 0,
        note: '',
      }]
    })
    setToast('시점을 추가했어요.')
  }
  const removePoint = (id: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const setValue = (id: string, v: number) =>
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, value: clampValue(v) } : p)))
  // 상태 변경 시 친밀도를 그 상태의 기본값 쪽으로 부드럽게 제안(현재 부호와 어긋날 때만).
  const setState = (id: string, key: string) =>
    setPoints((prev) => prev.map((p) => {
      if (p.id !== id) return p
      const def = STATE_DEFAULT_VALUE[key]
      const misaligned = (def > 0 && p.value < 0) || (def < 0 && p.value > 0) || (def === 0 && Math.abs(p.value) > 2)
      return { ...p, state: key, value: misaligned ? def : p.value }
    }))
  const setNoteFor = (id: string, txt: string) =>
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, note: txt.slice(0, 300) } : p)))

  const startEdit = (p: Point) => { setEditingId(p.id); setEditWhen(p.when) }
  const cancelEdit = () => { setEditingId(null); setEditWhen('') }
  const commitEdit = () => {
    if (!editingId) return
    const nm = editWhen.trim()
    setPoints((prev) => prev.map((p) => (p.id === editingId ? { ...p, when: (nm || p.when).slice(0, 40) } : p)))
    setEditingId(null); setEditWhen('')
  }
  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }
  const move = (id: string, dir: -1 | 1) => {
    setPoints((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 드래그 순서 변경(HTML5 DnD — 전역 포인터 리스너 없음, 안전).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setPoints((prev) => {
      const fi = prev.findIndex((p) => p.id === from)
      const ti = prev.findIndex((p) => p.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }
  const resetAll = () => {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('시점을 기본 3개로 초기화할까요?')) return
    setPoints(defaultPoints()); setEditingId(null); setToast('초기화했어요.')
  }

  // ── 인물 선택(라이브러리) ──────────────────────────────────
  const swap = () => { setAName(bName); setBName(aName) }
  const pairLabel = `${aName.trim() || '인물 A'} ↔ ${bName.trim() || '인물 B'}`

  // ── 진단(전환점·급변 점검) ────────────────────────────────
  const vals = points.map((p) => p.value)
  const deltas: number[] = []
  for (let i = 1; i < vals.length; i++) deltas.push(vals[i] - vals[i - 1])
  const absDeltas = deltas.map(Math.abs)
  const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0
  const avgSwing = absDeltas.length ? absDeltas.reduce((s, d) => s + d, 0) / absDeltas.length : 0
  // 부호가 뒤집히는(우호↔적대) 전환점 개수
  let flips = 0
  for (let i = 1; i < vals.length; i++) {
    if ((vals[i - 1] > 0 && vals[i] < 0) || (vals[i - 1] < 0 && vals[i] > 0)) flips++
  }
  // 가장 큰 변화 구간
  let biggestIdx = -1, biggestMag = 0
  absDeltas.forEach((d, i) => { if (d > biggestMag) { biggestMag = d; biggestIdx = i } })

  let diagnosis = ''
  let diagColor = 'var(--muted)'
  if (points.length < 2) {
    diagnosis = '시점을 2개 이상 기록하면 관계 변화를 진단합니다.'
  } else if (range <= 1 && avgSwing < 0.6) {
    diagnosis = '관계가 거의 변하지 않습니다. 두 인물 사이에 사건·전환점을 더해 보세요.'
    diagColor = 'var(--warn)'
  } else if (flips >= 1) {
    const big = biggestIdx >= 0 ? points[biggestIdx + 1]?.when : ''
    diagnosis = `우호↔적대가 ${flips}번 뒤집히는 뚜렷한 전환점이 있습니다${big ? ` (가장 큰 변화: “${big}”)` : ''}. 입체적인 관계 곡선이에요.`
    diagColor = 'var(--ok)'
  } else if (range >= 5) {
    diagnosis = '관계가 한 방향으로 크게 변합니다(점진적 심화·악화). 중간에 작은 반전을 넣으면 더 입체적입니다.'
    diagColor = 'var(--muted)'
  } else {
    diagnosis = '변화는 있으나 완만합니다. 절정 부근에서 친밀도 진폭을 키워 보세요.'
    diagColor = 'var(--muted)'
  }

  // ── SVG 좌표 계산(곡선) ───────────────────────────────────
  const VBW = 700, VBH = 250
  const PADL = 40, PADR = 18, PADT = 16, PADB = 38
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const xAt = (i: number) => points.length <= 1 ? PADL + plotW / 2 : PADL + (i / (points.length - 1)) * plotW
  const yAt = (v: number) => PADT + (1 - (v - MINV) / (MAXV - MINV)) * plotH
  const pts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value), p }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  // 곡선 아래 면적(0 기준) — 시각적 강조
  const areaPath = pts.length >= 2
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${yAt(0).toFixed(1)} L${pts[0].x.toFixed(1)},${yAt(0).toFixed(1)} Z`
    : ''

  // ── 텍스트/HTML 내보내기 ──────────────────────────────────
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const buildText = (): string => {
    const L: string[] = []
    L.push(`[관계 타임라인] ${pairLabel}${title.trim() ? ` — ${title.trim()}` : ''}`)
    L.push('')
    points.forEach((p, i) => {
      const sign = p.value > 0 ? `+${p.value}` : `${p.value}`
      L.push(`${i + 1}. ${p.when || `시점 ${i + 1}`} : ${stateOf(p.state).label} (친밀도 ${sign}, ${valueWord(p.value)})${p.note ? `\n   계기: ${p.note}` : ''}`)
    })
    if (points.length >= 2) {
      L.push('')
      L.push(`진폭 ${range} · 평균 변화량 ${avgSwing.toFixed(1)} · 전환점 ${flips}회`)
      L.push(`진단: ${diagnosis}`)
    }
    return L.join('\n')
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>관계 타임라인</strong> · ${esc(pairLabel)}${title.trim() ? ' · ' + esc(title.trim()) : ''} · 시점 ${points.length}개</p>`)
    parts.push('<ol>')
    points.forEach((p, i) => {
      const sign = p.value > 0 ? `+${p.value}` : `${p.value}`
      parts.push(`<li><strong>${esc(p.when || `시점 ${i + 1}`)}</strong> — ${esc(stateOf(p.state).label)} (친밀도 ${sign}, ${esc(valueWord(p.value))})${p.note ? '<br/>계기: ' + esc(p.note) : ''}</li>`)
    })
    parts.push('</ol>')
    if (points.length >= 2) {
      parts.push(`<p>진폭 ${range} · 평균 변화량 ${avgSwing.toFixed(1)} · 전환점 ${flips}회</p>`)
      parts.push(`<p>진단: ${esc(diagnosis)}</p>`)
    }
    return parts.join('')
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
      if (mounted.current) setToast('타임라인을 텍스트로 복사했어요.')
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!points.length) { setNote('추가할 시점이 없어요.'); return }
    const meta: Record<string, string> = {
      인물: pairLabel,
      시점수: String(points.length),
    }
    if (points.length >= 2) {
      meta['진폭'] = String(range)
      meta['전환점'] = String(flips)
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: `관계 타임라인 — ${pairLabel}${title.trim() ? ` (${title.trim()})` : ''}`,
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) setToast('프로젝트 자료 › 인물 폴더에 관계 타임라인을 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요. 연결 상태를 확인해 주세요.')
  }

  // ── 스타일 ────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', minHeight: 0 }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 120, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '22px 8px' }
  const personInput: React.CSSProperties = { padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }

  // 라이브러리 인물명 datalist(중복 제거)
  const libNames = Array.from(new Set(libChars.map((c) => (c.name || '').trim()).filter(Boolean)))

  return (
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="💞" /></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="관계 제목 (선택, 예: 라이벌에서 연인으로)" maxLength={80} aria-label="관계 제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || points.length === 0}
          title={hasProjectBridge() ? (points.length === 0 ? '추가할 시점이 없습니다' : '자료 › 인물 폴더에 관계 타임라인 문서로 추가') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ {toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 두 인물 선택 ── */}
        <div style={panel}>
          <div style={sectionTitle}>두 인물</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              style={{ ...personInput, flex: 1 }}
              list="reltl-libnames"
              value={aName}
              onChange={(e) => setAName(e.target.value.slice(0, 40))}
              placeholder="인물 A (입력 또는 라이브러리에서 선택)"
              aria-label="인물 A"
            />
            <button className="minibtn" onClick={swap} title="두 인물 자리 바꾸기" style={{ flexShrink: 0 }}>⇄</button>
            <input
              style={{ ...personInput, flex: 1 }}
              list="reltl-libnames"
              value={bName}
              onChange={(e) => setBName(e.target.value.slice(0, 40))}
              placeholder="인물 B (입력 또는 라이브러리에서 선택)"
              aria-label="인물 B"
            />
          </div>
          <datalist id="reltl-libnames">
            {libNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          {libNames.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              <span style={{ ...hint, marginRight: 2 }}>라이브러리:</span>
              {libChars.slice(0, 12).map((c) => {
                const nm = (c.name || '').trim()
                if (!nm) return null
                return (
                  <button
                    key={c.id}
                    className="minibtn"
                    style={{ padding: '2px 8px', fontSize: 11.5 }}
                    title={`${nm}을(를) 빈 칸(A→B)에 넣기`}
                    onClick={() => {
                      if (!aName.trim()) setAName(nm.slice(0, 40))
                      else if (!bName.trim() && nm.trim() !== aName.trim()) setBName(nm.slice(0, 40))
                      else setToast('두 칸이 이미 차 있어요. 칸을 비우거나 직접 바꿔 주세요.')
                    }}
                  >{nm}</button>
                )
              })}
            </div>
          ) : (
            <div style={{ ...hint, marginTop: 8 }}>인물 시트·캐릭터 모델에서 인물을 저장하면 여기 라이브러리에서 바로 고를 수 있어요.</div>
          )}
        </div>

        {/* ── 시각화(곡선 / 단계 띠) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...sectionTitle, marginBottom: 0, flex: 1 }}>{pairLabel} · 관계 변화</span>
            <button className={'minibtn' + (view === 'curve' ? ' active' : '')} style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setView('curve')}><Emoji e="📈" /> 친밀도 곡선</button>
            <button className={'minibtn' + (view === 'band' ? ' active' : '')} style={{ padding: '3px 9px', fontSize: 11.5 }} onClick={() => setView('band')}><Emoji e="🪜" /> 단계 띠</button>
          </div>

          {points.length === 0 ? (
            <div style={empty}>시점을 추가하면 관계 변화가 시각화됩니다.</div>
          ) : view === 'curve' ? (
            <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 260 }} role="img" aria-label="친밀도 곡선">
              {/* 가로 격자 + Y 라벨 */}
              {[5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5].map((v) => {
                const y = yAt(v)
                const major = v === 0
                return (
                  <g key={v}>
                    <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={major ? 1.5 : 1} strokeDasharray={major ? undefined : '2 4'} opacity={major ? 0.9 : 0.4} />
                    {(v === 5 || v === 0 || v === -5) && (
                      <text x={PADL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{v > 0 ? `+${v}` : v}</text>
                    )}
                  </g>
                )
              })}
              {/* 면적 + 곡선 */}
              {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.08} />}
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {/* 점(상태색) + 시점 라벨 */}
              {pts.map((pp, i) => {
                const c = stateOf(pp.p.state).color
                return (
                  <g key={pp.p.id}>
                    <circle cx={pp.x} cy={pp.y} r={5} fill={c} stroke="var(--paper)" strokeWidth={1.6}>
                      <title>{`${pp.p.when || `시점 ${i + 1}`}: ${stateOf(pp.p.state).label} (${pp.p.value > 0 ? '+' : ''}${pp.p.value})`}</title>
                    </circle>
                    <text x={pp.x} y={VBH - 14} textAnchor="middle" fontSize={9.5} fill="var(--muted)">
                      {(pp.p.when || `${i + 1}`).length > 6 ? (pp.p.when || `${i + 1}`).slice(0, 6) + '…' : (pp.p.when || `${i + 1}`)}
                    </text>
                  </g>
                )
              })}
            </svg>
          ) : (
            // ── 단계 띠(밴드): 시점마다 상태색 칸을 가로로 잇고, 변할 때마다 색이 바뀜 ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 46 }}>
                {points.map((p, i) => {
                  const st = stateOf(p.state)
                  const changed = i === 0 || points[i - 1].state !== p.state
                  return (
                    <div
                      key={p.id}
                      title={`${p.when || `시점 ${i + 1}`}: ${st.label}`}
                      style={{
                        flex: 1, minWidth: 0, background: st.color, color: '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '4px 2px', borderLeft: i === 0 ? 'none' : (changed ? '2px solid var(--paper)' : '1px solid rgba(255,255,255,0.25)'),
                        fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{changed ? st.label : '·'}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex' }}>
                {points.map((p, i) => (
                  <div key={p.id} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 9.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                    {(p.when || `${i + 1}`)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 상태 색 범례 */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {REL_STATES.map((s) => (
              <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── 진단 ── */}
        <div style={{ ...panel, borderLeft: `3px solid ${diagColor}` }}>
          <div style={sectionTitle}>변화 점검</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: diagColor === 'var(--muted)' ? 'var(--text)' : diagColor }}>{diagnosis}</div>
          {points.length >= 2 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>진폭 <strong style={{ color: 'var(--text)' }}>{range}</strong></span>
              <span>평균 변화량 <strong style={{ color: 'var(--text)' }}>{avgSwing.toFixed(1)}</strong></span>
              <span>전환점(우호↔적대) <strong style={{ color: 'var(--text)' }}>{flips}</strong>회</span>
            </div>
          )}
        </div>

        {/* ── 시점 편집(CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>시점</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{points.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetAll} title="기본 3개 시점으로 초기화">초기화</button>
            <button className="btn-primary" onClick={addPoint}>＋ 시점 추가</button>
          </div>

          {points.length === 0 ? (
            <div style={empty}>
              아직 시점이 없어요.<br />
              <b>＋ 시점 추가</b>로 관계가 변하는 순간을 만들고<br />상태와 친밀도를 정해 보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {points.map((p, i) => {
                const isEd = editingId === p.id
                const st = stateOf(p.state)
                return (
                  <div
                    key={p.id}
                    draggable={!isEd}
                    onDragStart={() => { if (!isEd) dragId.current = p.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== p.id) setDragOver(p.id) }}
                    onDragLeave={() => { if (dragOver === p.id) setDragOver(null) }}
                    onDrop={() => onDrop(p.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    style={{
                      background: 'var(--chrome-2)', borderRadius: 10, padding: '9px 10px',
                      border: '1px solid var(--border)', borderLeft: `4px solid ${st.color}`,
                      outline: dragOver === p.id ? '2px dashed var(--accent)' : 'none',
                    }}
                  >
                    {/* 1행: 핸들 + 시점이름 + 상태라벨 + 값 + 동작 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'center' }}>{i + 1}</span>
                      {isEd ? (
                        <input
                          value={editWhen}
                          onChange={(e) => setEditWhen(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={commitEdit}
                          autoFocus
                          maxLength={40}
                          aria-label="시점 이름 수정"
                          style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                          onClick={() => startEdit(p)}
                          title="클릭해서 시점 이름 수정"
                        >{p.when || `시점 ${i + 1}`}</span>
                      )}
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: st.color }}>{st.label}</span>
                      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, width: 30, textAlign: 'right', color: p.value > 0 ? 'var(--ok)' : p.value < 0 ? 'var(--warn)' : 'var(--muted)' }}>{p.value > 0 ? `+${p.value}` : p.value}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, -1)} disabled={i === 0} title="위로" aria-label="위로 이동">▲</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, 1)} disabled={i === points.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removePoint(p.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️" /></button>
                      </div>
                    </div>

                    {/* 2행: 상태 선택 칩 */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {REL_STATES.map((s) => {
                        const on = p.state === s.key
                        return (
                          <button
                            key={s.key}
                            className="minibtn"
                            onClick={() => setState(p.id, s.key)}
                            style={{ padding: '2px 8px', fontSize: 11, borderColor: on ? s.color : 'var(--border)', color: on ? '#fff' : 'var(--text)', background: on ? s.color : 'var(--paper)', borderWidth: 1.5, fontWeight: on ? 700 : 400 }}
                            aria-pressed={on}
                          >{s.label}</button>
                        )
                      })}
                    </div>

                    {/* 3행: 친밀도 슬라이더 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 16 }}>-5</span>
                      <input
                        type="range" min={MINV} max={MAXV} step={1} value={p.value}
                        onChange={(e) => setValue(p.id, Number(e.target.value))}
                        style={{ flex: 1, accentColor: st.color }}
                        aria-label={`${p.when || `시점 ${i + 1}`} 친밀도`}
                      />
                      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, width: 16, textAlign: 'right' }}>+5</span>
                    </div>

                    {/* 4행: 변화 계기 메모 */}
                    <input
                      value={p.note}
                      onChange={(e) => setNoteFor(p.id, e.target.value)}
                      maxLength={300}
                      placeholder="변화의 계기·사건 메모 (선택)"
                      aria-label="변화 계기 메모"
                      style={{ width: '100%', marginTop: 8, padding: '6px 9px', fontSize: 12.5, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* [연계] 함께 열기 */}
        <div style={panel}>
          <div style={sectionTitle}>연계 도구</div>
          <div className="linkbar">
            <span className="linkbar-label">함께 열기:</span>
            <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { characters: [aName, bName].filter((n) => n.trim()) })} title="인물 관계도 도구를 엽니다"><Emoji e="🕸️" /> 인물 관계도</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 도구를 엽니다"><Emoji e="🧑‍🎤" /> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('emotion-arc')} title="감정 곡선 도구를 엽니다"><Emoji e="📈" /> 감정 곡선</button>
          </div>
          <div style={{ ...hint, marginTop: 8 }}>
            시점 이름을 클릭하거나 ⠿ 드래그·▲▼로 순서를 바꾸고, 상태 칩과 슬라이더로 관계를 정하세요.
            모든 내용은 이 브라우저에 자동 저장됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
