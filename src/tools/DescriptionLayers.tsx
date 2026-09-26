// 묘사 레이어 빌더 — 하나의 대상(인물/장소/사물)을 "오감(시·청·후·촉·미) × 거리(원경·중경·근경) × 정서"
// 레이어로 쪼개어 칸칸이 묘사를 채우고, 채운 레이어들을 거리 → 감각 순서로 엮어 한 편의 입체적 묘사 문단으로
// 자동 종합한다. 여러 대상을 저장·전환·복제·삭제하고, 칸마다 길잡이 예시 어휘를 제시한다.
// 자급식: react·linkbus 외 import 없음. 외부 네트워크/키/이미지/폰트 불필요(100% 로컬).
// 영속: localStorage 'sry:tool:description-layers' 자동 저장/복원. 언마운트 시 타이머 정리.
// 연계(linkbus): 완성 묘사를 프로젝트 자료 문서로 추가 / 스니펫 저장 / 배경 설정집·감각 팔레트로 보내기.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'description-layers', name: '묘사 레이어 빌더', icon: '🧅', group: '교정·언어', intro: '대상을 오감×거리×정서 레이어로 쪼개 칸칸이 채우고 입체적 묘사 한 문단으로 종합하세요', w: 880, h: 720 }

// ── 축 정의 ─────────────────────────────────────────────
type TargetKind = 'person' | 'place' | 'thing'
interface KindDef { key: TargetKind; label: string; icon: string }
const KINDS: KindDef[] = [
  { key: 'place', label: '장소', icon: '🏞️' },
  { key: 'person', label: '인물', icon: '🧑' },
  { key: 'thing', label: '사물', icon: '🗝️' },
]
function kindDef(k: TargetKind): KindDef { return KINDS.find((x) => x.key === k) || KINDS[0] }

// 거리(레이어 묶음) — 종합 시 이 순서로 카메라가 다가오듯 엮는다.
type DistKey = 'far' | 'mid' | 'near'
interface DistDef { key: DistKey; label: string; icon: string; hint: string; lead: string }
const DISTS: DistDef[] = [
  { key: 'far', label: '원경', icon: '🔭', hint: '멀리서 본 전체 윤곽·배경 속 위치·첫인상의 실루엣', lead: '멀리서 보면' },
  { key: 'mid', label: '중경', icon: '👀', hint: '몇 걸음 앞에서 드러나는 형태·색·움직임·관계', lead: '가까이 다가서자' },
  { key: 'near', label: '근경', icon: '🔬', hint: '손이 닿을 거리의 질감·디테일·미세한 결과 흔적', lead: '코앞에서는' },
]
function distDef(k: DistKey): DistDef { return DISTS.find((x) => x.key === k) || DISTS[0] }

// 오감 + 정서(여섯 번째 레이어). 정서는 거리와 무관한 단일 칸으로 둔다.
type SenseKey = 'sight' | 'sound' | 'smell' | 'touch' | 'taste'
interface SenseDef { key: SenseKey; label: string; icon: string }
const SENSES: SenseDef[] = [
  { key: 'sight', label: '시각', icon: '👁️' },
  { key: 'sound', label: '청각', icon: '👂' },
  { key: 'smell', label: '후각', icon: '👃' },
  { key: 'touch', label: '촉각', icon: '✋' },
  { key: 'taste', label: '미각', icon: '👅' },
]
function senseDef(k: SenseKey): SenseDef { return SENSES.find((x) => x.key === k) || SENSES[0] }

// 칸 키: `${senseKey}|${distKey}` (오감×거리 15칸) — 정서는 별도 필드.
type CellKey = string
const cellKey = (s: SenseKey, d: DistKey): CellKey => `${s}|${d}`

// ── 칸별 길잡이 ─────────────────────────────────────────
// 감각×거리 교차 칸마다 "무엇을 적으면 좋은지" 질문/예시 어휘. 대상 종류와 무관한 공통 발상 자극.
const CELL_HINTS: Record<SenseKey, Record<DistKey, string>> = {
  sight: {
    far: '전체 실루엣·윤곽선, 배경과의 대비, 색의 덩어리, 빛이 닿는 방향',
    mid: '형태와 비례, 색·재질의 분포, 움직임·자세, 주변과의 관계',
    near: '결·무늬·흠집, 미세한 색 변화, 빛이 만드는 그림자, 작은 디테일',
  },
  sound: {
    far: '멀리서 들리는 배경음, 공간이 만드는 울림, 소리의 유무 자체',
    mid: '대상이 내는 소리의 결, 리듬·간격, 다른 소리와 섞이는 양상',
    near: '귓가의 미세한 소리, 숨·마찰·삐걱임, 소리가 끊기는 순간',
  },
  smell: {
    far: '공기 전체에 깔린 냄새, 바람에 실려 오는 향, 첫 후각 인상',
    mid: '대상에서 번지는 냄새의 종류·강도, 다른 냄새와의 충돌',
    near: '코끝에 닿는 진한 향, 시간이 밴 냄새, 숨을 들이켤 때의 자극',
  },
  touch: {
    far: '공간의 온도·습도, 피부에 닿는 공기, 거리감이 주는 긴장',
    mid: '손을 뻗었을 때의 예상 감촉, 무게·밀도의 짐작, 표면의 기운',
    near: '직접 만진 질감, 온도, 누름·결·끈적임, 손끝에 남는 잔감각',
  },
  taste: {
    far: '입안에 도는 공기의 맛, 침이 고이거나 마르는 반응',
    mid: '맛이 연상되는 정도, 군침·메스꺼움 같은 몸의 예감',
    near: '실제로 맛본 첫맛·뒷맛, 혀에 남는 질감, 삼킨 뒤의 여운',
  },
}

// ── 데이터 모델 ─────────────────────────────────────────
interface Subject {
  id: string
  name: string
  kind: TargetKind
  // 오감×거리 칸 (15칸). 비어 있을 수 있다.
  cells: Record<CellKey, string>
  emotion: string   // 정서 레이어(이 대상이 불러일으키는 감정·분위기·의미)
  notes: string
  createdAt: number
  updatedAt: number
}

const LS_KEY = 'sry:tool:description-layers'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptySubject(kind: TargetKind = 'place'): Subject {
  const now = Date.now()
  return { id: newId(), name: '', kind, cells: {}, emotion: '', notes: '', createdAt: now, updatedAt: now }
}

// 채워진 칸 수(오감×거리, 공백 제외) — 진행률 표시용.
function filledCount(s: Subject): number {
  let n = 0
  for (const d of DISTS) for (const se of SENSES) {
    if ((s.cells[cellKey(se.key, d.key)] || '').trim()) n++
  }
  return n
}
const TOTAL_CELLS = SENSES.length * DISTS.length // 15

// ── 종합: 채워진 레이어를 거리→감각 순으로 엮어 한 문단으로 ──
// 자연스러운 한국어가 되도록 거리 도입어구 + 감각 라벨을 붙여 문장을 조립한다.
function synthesize(s: Subject): string {
  const name = (s.name || kindDef(s.kind).label).trim()
  const paras: string[] = []
  for (const d of DISTS) {
    const parts: string[] = []
    for (const se of SENSES) {
      const v = (s.cells[cellKey(se.key, d.key)] || '').trim()
      if (v) parts.push(v.replace(/\s*[.。]\s*$/, ''))
    }
    if (!parts.length) continue
    const body = parts.join('. ') + '.'
    paras.push(`${d.lead} ${body}`)
  }
  let text = ''
  if (paras.length) {
    text = paras.join(' ')
  }
  const emo = (s.emotion || '').trim()
  if (emo) {
    const e = emo.replace(/\s*[.。]\s*$/, '') + '.'
    text = text ? `${text} ${e}` : e
  }
  if (!text) return `‘${name}’을(를) 묘사할 레이어가 아직 비어 있습니다. 칸을 채우면 여기에 종합 문단이 만들어집니다.`
  return text
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 문서 본문(HTML) — 종합 문단 + 레이어 표.
function subjectBodyHtml(s: Subject): string {
  const parts: string[] = []
  parts.push(`<p><b>종합 묘사</b></p><p>${escHtml(synthesize(s))}</p>`)
  for (const d of DISTS) {
    const rows: string[] = []
    for (const se of SENSES) {
      const v = (s.cells[cellKey(se.key, d.key)] || '').trim()
      if (v) rows.push(`<li><b>${escHtml(se.icon + ' ' + se.label)}</b> — ${escHtml(v)}</li>`)
    }
    if (rows.length) parts.push(`<p><b>${escHtml(d.icon + ' ' + d.label)}</b></p><ul>${rows.join('')}</ul>`)
  }
  if (s.emotion.trim()) parts.push(`<p><b>🎭 정서·의미</b><br>${escHtml(s.emotion.trim())}</p>`)
  if (s.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${escHtml(s.notes.trim())}</p>`)
  return parts.join('')
}

// 텍스트 내보내기(복사·스니펫·수집함용).
function subjectText(s: Subject): string {
  const name = (s.name || kindDef(s.kind).label).trim()
  const lines: string[] = [`【${name}】 (${kindDef(s.kind).label}) 묘사 레이어`, '', synthesize(s), '']
  for (const d of DISTS) {
    const block: string[] = []
    for (const se of SENSES) {
      const v = (s.cells[cellKey(se.key, d.key)] || '').trim()
      if (v) block.push(`  ${se.icon} ${se.label}: ${v}`)
    }
    if (block.length) { lines.push(`[${d.icon} ${d.label}]`); lines.push(...block); lines.push('') }
  }
  if (s.emotion.trim()) { lines.push(`[🎭 정서·의미]`, `  ${s.emotion.trim()}`, '') }
  if (s.notes.trim()) { lines.push(`[🗒️ 메모]`, `  ${s.notes.trim()}`) }
  return lines.join('\n').trimEnd()
}

// 정규(canonical) 장소 필드맵 — 받는 허브(배경 설정집)에서 항목이 제자리(기본 칸)에 들어가도록
// 이 도구의 레이어 값을 표준 장소 키로 1:1 매핑한다(추가 전용, 기존 키 삭제 없음).
//   name←이름, kind←종류(장소/인물/사물 라벨), atmosphere←정서·의미,
//   appearance←시각 레이어(원경→중경→근경), sensory←청·후·촉·미 레이어, notes←메모.
function placeFieldsFrom(s: Subject): Record<string, string> {
  const fields: Record<string, string> = {}
  const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) fields[k] = t }
  put('name', (s.name || kindDef(s.kind).label).trim())
  put('kind', kindDef(s.kind).label)
  put('atmosphere', s.emotion)
  // 시각 레이어 → 외관/묘사(appearance), 그 외 감각 → 감각(sensory).
  const sightParts: string[] = []
  const senseParts: string[] = []
  for (const d of DISTS) for (const se of SENSES) {
    const v = (s.cells[cellKey(se.key, d.key)] || '').trim()
    if (!v) continue
    if (se.key === 'sight') sightParts.push(v)
    else senseParts.push(`${se.label}: ${v}`)
  }
  put('appearance', sightParts.join(' / '))
  put('sensory', senseParts.join(' / '))
  put('notes', s.notes)
  return fields
}

// ── localStorage 복원(손상·미지원 graceful) ──
interface Persisted { subjects: Subject[]; openId: string | null }
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { subjects: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.subjects) ? p.subjects : Array.isArray(p) ? p : []
    const subjects: Subject[] = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => {
      const cellsIn = (x.cells && typeof x.cells === 'object') ? x.cells as Record<string, unknown> : {}
      const cells: Record<string, string> = {}
      for (const k of Object.keys(cellsIn)) cells[k] = String(cellsIn[k] ?? '')
      const kind = (['person', 'place', 'thing'].includes(String(x.kind)) ? x.kind : 'place') as TargetKind
      return {
        id: String(x.id || newId()),
        name: String(x.name || ''),
        kind,
        cells,
        emotion: String(x.emotion || ''),
        notes: String(x.notes || ''),
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      }
    })
    const openId = typeof p?.openId === 'string' && subjects.some((s) => s.id === p.openId) ? p.openId : (subjects[0]?.id ?? null)
    return { subjects, openId }
  } catch { return { subjects: [], openId: null } }
}

// ── 컴포넌트 ────────────────────────────────────────────
interface ToolProps { payload?: Record<string, unknown> }

export default function DescriptionLayers({ payload }: ToolProps = {}) {
  const init = useRef(loadState())
  const [subjects, setSubjects] = useState<Subject[]>(init.current.subjects)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [activeDist, setActiveDist] = useState<DistKey>('far') // 격자가 좁을 때 한 거리만 보는 탭
  const [gridMode, setGridMode] = useState<'grid' | 'tabs'>('grid')
  const [toast, setToast] = useState<string>('')
  const [note, setNote] = useState<string>('') // 저장 경고 등
  const [showSynth, setShowSynth] = useState(true)

  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  // 페이로드로 진입(다른 도구에서 대상명을 넘겨받아 시작) — 한 번만 처리.
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    if (!payload) return
    const nm = typeof payload.placeName === 'string' ? payload.placeName
      : typeof payload.name === 'string' ? payload.name
      : typeof payload.title === 'string' ? payload.title : ''
    const pk = payload.kind
    const kind: TargetKind = (pk === 'person' || pk === 'place' || pk === 'thing') ? pk : 'place'
    const sensorySeed = typeof payload.sensory === 'string' ? payload.sensory.trim() : ''
    if (!nm && !sensorySeed) return
    const sub = emptySubject(kind)
    if (nm) sub.name = nm
    // 감각 팔레트 등에서 넘어온 묘사 텍스트는 원경 시각 칸의 출발점으로 둔다(사용자가 재배치).
    if (sensorySeed) sub.cells[cellKey('sight', 'far')] = sensorySeed.slice(0, 500)
    setSubjects((prev) => [sub, ...prev])
    setOpenId(sub.id)
  }, [payload])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ subjects, openId } satisfies Persisted)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [subjects, openId])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast(''); toastTimer.current = null }, 1800)
  }

  const opened = useMemo(() => (openId ? subjects.find((s) => s.id === openId) || null : null), [openId, subjects])

  // ── 대상 CRUD ──
  const addSubject = (kind: TargetKind = 'place') => {
    const s = emptySubject(kind)
    setSubjects((prev) => [s, ...prev])
    setOpenId(s.id)
    setConfirmDel(null)
  }
  const duplicateSubject = (id: string) => {
    setSubjects((prev) => {
      const src = prev.find((s) => s.id === id)
      if (!src) return prev
      const copy: Subject = { ...src, id: newId(), name: (src.name || kindDef(src.kind).label) + ' (사본)', cells: { ...src.cells }, createdAt: Date.now(), updatedAt: Date.now() }
      setOpenId(copy.id)
      const i = prev.findIndex((s) => s.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      return next
    })
    flash('대상을 복제했습니다')
  }
  const removeSubject = (id: string) => {
    setSubjects((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (openId === id) setOpenId(next[0]?.id ?? null)
      return next
    })
    setConfirmDel(null)
  }

  // 열린 대상 갱신 헬퍼.
  const patchOpen = (patch: Partial<Subject>) => {
    if (!openId) return
    setSubjects((prev) => prev.map((s) => (s.id === openId ? { ...s, ...patch, updatedAt: Date.now() } : s)))
  }
  const setCell = (s: SenseKey, d: DistKey, v: string) => {
    if (!opened) return
    const cells = { ...opened.cells, [cellKey(s, d)]: v }
    patchOpen({ cells })
  }
  const clearDistance = (d: DistKey) => {
    if (!opened) return
    const cells = { ...opened.cells }
    for (const se of SENSES) delete cells[cellKey(se.key, d)]
    patchOpen({ cells })
    flash(`${distDef(d).label} 칸을 비웠습니다`)
  }

  // ── 복사/연계 ──
  const safeCopy = (text: string, okMsg = '복사했습니다') => {
    const done = () => { if (mounted.current) flash(okMsg) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) flash('복사에 실패했어요') }
  }

  const copySynth = () => { if (opened) safeCopy(synthesize(opened), '종합 묘사를 복사했습니다') }
  const copyAll = () => { if (opened) safeCopy(subjectText(opened), '레이어 전체를 복사했습니다') }

  const toProject = () => {
    if (!opened) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다'); return }
    const name = (opened.name || kindDef(opened.kind).label).trim()
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '묘사',
      title: `묘사 — ${name}`,
      bodyHtml: subjectBodyHtml(opened),
      synopsis: synthesize(opened).slice(0, 120),
      meta: { 대상: name, 종류: kindDef(opened.kind).label, 채운칸: `${filledCount(opened)}/${TOTAL_CELLS}` },
    })
    flash(id ? '프로젝트 자료에 묘사 문서를 추가했습니다' : '프로젝트 추가에 실패했어요')
  }
  const saveSnippet = () => {
    if (!opened) return
    const name = (opened.name || kindDef(opened.kind).label).trim()
    addToLibrary('snippets', { text: synthesize(opened), source: '묘사 레이어 빌더', tags: ['묘사', kindDef(opened.kind).label, name] })
    flash('종합 묘사를 스니펫으로 저장했습니다')
  }
  const toStash = () => {
    if (!opened) return
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다'); return }
    const name = (opened.name || kindDef(opened.kind).label).trim()
    addToStash({ kind: 'note', label: `묘사 — ${name}`, text: subjectText(opened) })
    flash('수집함에 담았습니다')
  }
  const toSensoryPalette = () => {
    openToolLinked('sensory-palette', {})
    flash('감각 묘사 팔레트를 열었습니다')
  }
  const toSettingBible = () => {
    if (!opened) return
    const name = (opened.name || kindDef(opened.kind).label).trim()
    openToolLinked('setting-bible', { sensory: subjectText(opened), placeName: name, fields: placeFieldsFrom(opened) })
    flash('배경 설정집으로 보냈습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 196, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 24 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700 }

  const filled = opened ? filledCount(opened) : 0
  const pct = Math.round((filled / TOTAL_CELLS) * 100)

  return (
    <div style={wrap}>
      {/* 헤더 */}
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🧅"/></span>
        <strong style={{ fontSize: 14 }}>묘사 레이어 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{subjects.length}개 대상</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {toast}</span>}
        <div style={{ display: 'flex', gap: 4 }}>
          {KINDS.map((k) => (
            <button key={k.key} className="btn-primary" style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => addSubject(k.key)} title={`새 ${k.label} 묘사 시작`}>
              ＋<Emoji e={k.icon}/>{k.label}
            </button>
          ))}
        </div>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 대상 목록 */}
        <div style={sidebar}>
          {subjects.length === 0 ? (
            <div style={{ ...emptyBox, padding: 16, fontSize: 12 }}>
              아직 대상이 없어요.<br />위에서 <b>＋장소/인물/사물</b>로<br />첫 묘사를 시작하세요.
            </div>
          ) : (
            <div style={listArea}>
              {subjects.map((s) => {
                const active = s.id === openId
                const fc = filledCount(s)
                const kd = kindDef(s.kind)
                return (
                  <div
                    key={s.id}
                    onClick={() => { setOpenId(s.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}><Emoji e={kd.icon}/></span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name || <span style={{ color: 'var(--muted)' }}>(이름 없음)</span>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                      <div className={'progress' + (fc === TOTAL_CELLS ? ' ok' : '')} style={{ width: 70, height: 6 }}>
                        <span style={{ width: `${Math.round((fc / TOTAL_CELLS) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: fc === TOTAL_CELLS ? 'var(--ok)' : 'var(--muted)' }}>{fc}/{TOTAL_CELLS}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); duplicateSubject(s.id) }} title="복제">⧉</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id) }} title="삭제"><Emoji e="🗑️"/></button>
                    </div>
                    {confirmDel === s.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 대상을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); removeSubject(s.id) }}>삭제</button>
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

        {/* 메인 */}
        <div style={main}>
          {!opened ? (
            <div style={emptyBox}>
              왼쪽에서 대상을 고르거나 위에서 <b>새 대상</b>을 만들어 보세요.<br /><br />
              하나의 대상을 <b>오감(시·청·후·촉·미)</b> × <b>거리(원경·중경·근경)</b> × <b>정서</b>로 쪼개<br />
              칸칸이 채우면, 카메라가 다가오듯 엮인 <b>입체적 묘사 한 문단</b>이 자동으로 만들어집니다.
            </div>
          ) : (
            <>
              {/* 대상 머리글 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {KINDS.map((k) => (
                    <button
                      key={k.key}
                      className="minibtn"
                      onClick={() => patchOpen({ kind: k.key })}
                      aria-pressed={opened.kind === k.key}
                      style={{ borderColor: opened.kind === k.key ? 'var(--accent)' : 'var(--border)', background: opened.kind === k.key ? 'var(--chrome-2)' : undefined, fontWeight: opened.kind === k.key ? 700 : 400 }}
                      title={`${k.label}(으)로 분류`}
                    ><Emoji e={k.icon}/> {k.label}</button>
                  ))}
                </div>
                <input
                  value={opened.name}
                  onChange={(e) => patchOpen({ name: e.target.value })}
                  placeholder={`묘사할 ${kindDef(opened.kind).label} 이름 (예: ${opened.kind === 'person' ? '노부인 한씨' : opened.kind === 'thing' ? '녹슨 회중시계' : '비 내리는 부둣가'})`}
                  maxLength={80}
                  style={{ flex: 1, minWidth: 160, padding: '8px 10px', fontSize: 15, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className={'progress' + (filled === TOTAL_CELLS ? ' ok' : '')} style={{ width: 84 }}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: filled === TOTAL_CELLS ? 'var(--ok)' : 'var(--muted)' }}>{filled}/{TOTAL_CELLS}</span>
                </span>
              </div>

              {/* 보기 전환 */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={label}>레이어 보기:</span>
                <button className="minibtn" onClick={() => setGridMode('grid')} aria-pressed={gridMode === 'grid'} style={{ borderColor: gridMode === 'grid' ? 'var(--accent)' : 'var(--border)', fontWeight: gridMode === 'grid' ? 700 : 400 }}>▦ 격자(전체)</button>
                <button className="minibtn" onClick={() => setGridMode('tabs')} aria-pressed={gridMode === 'tabs'} style={{ borderColor: gridMode === 'tabs' ? 'var(--accent)' : 'var(--border)', fontWeight: gridMode === 'tabs' ? 700 : 400 }}>▭ 거리별 집중</button>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>칸마다 길잡이가 떠 있어요. 빈 칸은 종합에서 자동 생략됩니다.</span>
              </div>

              {/* 격자 모드 */}
              {gridMode === 'grid' ? (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 640, tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 84, position: 'sticky', left: 0, zIndex: 2, background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '7px 8px', fontSize: 11, color: 'var(--muted)', textAlign: 'left' }}>감각 ＼ 거리</th>
                        {DISTS.map((d) => (
                          <th key={d.key} style={{ background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', padding: '7px 8px', fontSize: 12, fontWeight: 700, textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span><Emoji e={d.icon}/> {d.label}</span>
                              <button className="minibtn" style={{ marginLeft: 'auto', padding: '1px 5px', fontSize: 10 }} title={`${d.label} 칸 비우기`} onClick={() => clearDistance(d.key)}>비움</button>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginTop: 2, lineHeight: 1.3 }}>{d.hint}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SENSES.map((se) => (
                        <tr key={se.key}>
                          <th style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--panel)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '6px 8px', fontSize: 12, fontWeight: 700, textAlign: 'left', verticalAlign: 'top' }}>
                            <div><Emoji e={se.icon}/></div>{se.label}
                          </th>
                          {DISTS.map((d) => {
                            const v = opened.cells[cellKey(se.key, d.key)] || ''
                            return (
                              <td key={d.key} style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: 4, verticalAlign: 'top' }}>
                                <textarea
                                  value={v}
                                  onChange={(e) => setCell(se.key, d.key, e.target.value)}
                                  placeholder={CELL_HINTS[se.key][d.key]}
                                  rows={3}
                                  style={{
                                    width: '100%', minHeight: 56, resize: 'vertical', boxSizing: 'border-box',
                                    padding: '6px 7px', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit',
                                    borderRadius: 7, border: '1px solid ' + (v.trim() ? 'var(--accent)' : 'var(--border)'),
                                    background: v.trim() ? 'var(--paper)' : 'var(--panel)', color: 'var(--text)',
                                  }}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* 거리별 집중 모드 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DISTS.map((d) => {
                      const dc = SENSES.filter((se) => (opened.cells[cellKey(se.key, d.key)] || '').trim()).length
                      const on = activeDist === d.key
                      return (
                        <button key={d.key} className="minibtn" onClick={() => setActiveDist(d.key)} aria-pressed={on}
                          style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, fontWeight: on ? 700 : 400 }}>
                          <Emoji e={d.icon}/> {d.label} <span style={{ color: dc ? 'var(--ok)' : 'var(--muted)' }}>{dc}/5</span>
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e={distDef(activeDist).icon}/> {distDef(activeDist).label} — {distDef(activeDist).hint}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SENSES.map((se) => {
                      const v = opened.cells[cellKey(se.key, activeDist)] || ''
                      return (
                        <div key={se.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ width: 56, flexShrink: 0, paddingTop: 6, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                            <div style={{ fontSize: 16 }}><Emoji e={se.icon}/></div>{se.label}
                          </div>
                          <textarea
                            value={v}
                            onChange={(e) => setCell(se.key, activeDist, e.target.value)}
                            placeholder={CELL_HINTS[se.key][activeDist]}
                            rows={2}
                            style={{
                              flex: 1, minHeight: 48, resize: 'vertical', boxSizing: 'border-box',
                              padding: '7px 9px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit',
                              borderRadius: 8, border: '1px solid ' + (v.trim() ? 'var(--accent)' : 'var(--border)'),
                              background: v.trim() ? 'var(--paper)' : 'var(--panel)', color: 'var(--text)',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 정서 레이어 + 메모 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ ...label, marginBottom: 4 }}><Emoji e="🎭"/> 정서·의미 레이어 <span style={{ fontWeight: 400 }}>— 이 대상이 불러일으키는 감정·분위기·상징</span></div>
                  <textarea
                    value={opened.emotion}
                    onChange={(e) => patchOpen({ emotion: e.target.value })}
                    placeholder="예: 보고 있으면 까닭 모를 그리움과 불안이 함께 차오른다. 떠나온 고향을 닮았다."
                    rows={2}
                    style={{ width: '100%', minHeight: 46, resize: 'vertical', boxSizing: 'border-box', padding: '7px 9px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ ...label, marginBottom: 4 }}><Emoji e="🗒️"/> 메모 <span style={{ fontWeight: 400 }}>(선택 · 종합엔 포함되지 않음)</span></div>
                  <textarea
                    value={opened.notes}
                    onChange={(e) => patchOpen({ notes: e.target.value })}
                    placeholder="시점·장면 맥락, 다듬을 방향 등"
                    rows={2}
                    style={{ width: '100%', minHeight: 46, resize: 'vertical', boxSizing: 'border-box', padding: '7px 9px', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              {/* 종합 묘사 */}
              <div style={{ border: '1px solid var(--accent)', borderRadius: 10, background: 'var(--chrome-2)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: showSynth ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-2)' }}><Emoji e="📝"/> 종합 묘사 (자동)</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>원경 → 중경 → 근경 → 정서 순으로 엮음</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => setShowSynth((v) => !v)}>{showSynth ? '접기' : '펼치기'}</button>
                  <button className="minibtn" onClick={copySynth}><Emoji e="📋"/> 종합 복사</button>
                </div>
                {showSynth && (
                  <div style={{ padding: '10px 12px', fontSize: 13.5, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: filled || opened.emotion.trim() ? 'var(--text)' : 'var(--muted)' }}>
                    {synthesize(opened)}
                  </div>
                )}
              </div>

              {/* 액션 + 연계 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="minibtn" onClick={copyAll}><Emoji e="📋"/> 레이어 전체 복사</button>
                <span style={{ flex: 1 }} />
              </div>
              <div className="linkbar">
                <span className="linkbar-label">연계:</span>
                <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 묘사를 프로젝트 자료(묘사 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="linkbtn" onClick={saveSnippet} title="종합 묘사를 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫 저장</button>
                <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '레이어 전체를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}><Emoji e="🧺"/> 수집함에 담기</button>
                <button className="linkbtn" onClick={toSettingBible} title="레이어 묘사를 배경 설정집으로 보내기"><Emoji e="🏛️"/> 배경 설정집으로</button>
                <button className="linkbtn" onClick={toSensoryPalette} title="감각 어휘가 막힐 때 감각 묘사 팔레트 열기"><Emoji e="🌿"/> 감각 팔레트 열기</button>
              </div>

              <div className="license-note" style={{ lineHeight: 1.6 }}>
                길잡이 예시는 출발점입니다. 그대로 쓰기보다 시점 인물의 감정·상황에 맞게 비틀어 자기만의 문장으로 발전시키세요.
                모든 텍스트는 직접 작성한 창작물이며 외부 API·이미지·폰트를 사용하지 않습니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
