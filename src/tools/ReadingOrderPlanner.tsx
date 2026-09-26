// 읽기 순서/구성 플래너 — 다중 POV·시간선·서브플롯의 장면들을 카드로 만들어,
//  ① 이야기 속 '시간순'(장면의 시점 값으로 자동 정렬)과
//  ② 독자에게 보여주는 '서사 순서(발표 순서)'(드래그로 자유 재배치)
// 두 배열을 나란히 비교한다. 두 순서가 어긋나는 지점(=회상/시간 도약 같은 비선형 구성)을
// 자동으로 표시해, 어디서 시간을 거슬러 보여주는지/건너뛰는지 한눈에 본다.
//
// 장면 CRUD(추가/수정/삭제/복제), POV·서브플롯·시점·상태·요약 필드, 드래그 재배치,
// 시점 자동정렬, 비선형(역행/도약) 자동 표시, POV·서브플롯 필터, 텍스트 복사,
// 좌측 바인더 파일 드롭으로 장면 가져오기, 프로젝트/수집함 연계까지.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:reading-order-planner'.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = { id: 'reading-order-planner', name: '읽기 순서 플래너', icon: '🔀', group: '구상·정리', intro: '다중 POV·시간선·서브플롯 장면을 카드로 두고 시간순과 서사(발표) 순서를 비교·재배치하세요', w: 920, h: 700 }

const LS_KEY = 'sry:tool:reading-order-planner'

// ── 데이터 모델 ─────────────────────────────────────────────
// time: 이야기 속 시점을 나타내는 정렬 키(숫자). 같은 값이면 timeLabel 로 사람이 읽을 라벨 표시.
interface Scene {
  id: string
  title: string
  pov: string            // 시점 인물(POV)
  subplot: string        // 서브플롯/줄거리 갈래
  time: number           // 시간선 정렬 키(작을수록 이야기상 먼저 일어남)
  timeLabel: string      // 시점 표시 라벨(예: '3년 전 봄', '1장 직후')
  summary: string        // 한 줄 요약/내용
  place: string          // 장소(선택)
  status: SceneStatus
  color: string          // 카드 강조색(POV 자동 배색을 덮어쓸 때)
}
type SceneStatus = 'idea' | 'draft' | 'done'

interface SaveShape {
  title: string
  scenes: Scene[]        // 장면 정의(순서 무관) — 시간순은 time 으로 정렬해 파생
  order: string[]        // 서사(발표) 순서: scene id 의 배열
  view: ViewMode
}
type ViewMode = 'compare' | 'narrative' | 'timeline'

const STATUS: Record<SceneStatus, { label: string; color: string; icon: string }> = {
  idea: { label: '구상', color: 'var(--muted)', icon: '○' },
  draft: { label: '초고', color: 'var(--warn)', icon: '◐' },
  done: { label: '완성', color: 'var(--ok)', icon: '●' },
}

// POV 별 자동 배색(색을 따로 지정 안 한 카드에 적용) — 좌측 띠 색으로 시각 구분.
const POV_PALETTE = ['#4a76d4', '#e0608a', '#0f9d58', '#c98a2c', '#8e5ad4', '#2c9ec9', '#db4437', '#7a7f8a', '#d4a017', '#5f6b7a']

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escMl(s: string): string { return escHtml(s).replace(/\n/g, '<br/>') }
function num(v: unknown, d = 0): number { const n = Number(v); return Number.isFinite(n) ? n : d }
function str(v: unknown, d = ''): string { return typeof v === 'string' ? v : d }

function mkScene(patch: Partial<Scene> = {}): Scene {
  return {
    id: newId(),
    title: '새 장면',
    pov: '',
    subplot: '',
    time: 0,
    timeLabel: '',
    summary: '',
    place: '',
    status: 'idea',
    color: '',
    ...patch,
  }
}

// 시연용 기본 예시 — 의도적으로 시간순과 서사순이 어긋나게(인 메디아스 레스 + 회상) 구성.
function seedScenes(): { scenes: Scene[]; order: string[] } {
  const a = mkScene({ title: '눈보라 속 추격', pov: '서연', subplot: '메인', time: 50, timeLabel: '현재 · 겨울', summary: '쫓기는 서연. 왜 이 지경이 되었는지는 아직 모른다.', place: '북역 플랫폼', status: 'draft' })
  const b = mkScene({ title: '첫 만남', pov: '서연', subplot: '로맨스', time: 10, timeLabel: '3년 전 봄', summary: '도서관에서 우연히 마주친 두 사람.', place: '시립 도서관', status: 'done' })
  const c = mkScene({ title: '배신의 밤', pov: '도진', subplot: '메인', time: 30, timeLabel: '1년 전 가을', summary: '도진이 비밀 문서를 빼돌린다.', place: '연구소', status: 'idea' })
  const d = mkScene({ title: '편지의 진실', pov: '서연', subplot: '로맨스', time: 40, timeLabel: '6개월 전', summary: '오래된 편지에서 드러나는 사실.', place: '서연의 방', status: 'idea' })
  const e = mkScene({ title: '플랫폼의 끝', pov: '도진', subplot: '메인', time: 55, timeLabel: '현재 · 직후', summary: '추격의 결말. 두 줄거리가 여기서 만난다.', place: '북역 플랫폼', status: 'idea' })
  const scenes = [a, b, c, d, e]
  // 서사순(발표 순서): 현재 위기 → 회상 → 회상 → 현재 마무리.
  const order = [a.id, b.id, c.id, d.id, e.id]
  return { scenes, order }
}

// localStorage 복원 — 미지원/손상 시 graceful.
function load(): SaveShape {
  const fresh = (): SaveShape => {
    const s = seedScenes()
    return { title: '', scenes: s.scenes, order: s.order, view: 'compare' }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fresh()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fresh()
    const arr = Array.isArray(p.scenes) ? p.scenes : null
    if (!arr) return fresh()
    const scenes: Scene[] = arr
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any): Scene => ({
        id: str(x.id) || newId(),
        title: str(x.title, '제목 없음'),
        pov: str(x.pov),
        subplot: str(x.subplot),
        time: num(x.time, 0),
        timeLabel: str(x.timeLabel),
        summary: str(x.summary),
        place: str(x.place),
        status: (['idea', 'draft', 'done'].includes(x.status) ? x.status : 'idea') as SceneStatus,
        color: /^#[0-9a-fA-F]{3,8}$/.test(str(x.color)) ? x.color : '',
      }))
    // order 정리: 존재하는 id 만 + 누락된 장면은 뒤에 붙임.
    const ids = new Set(scenes.map((s) => s.id))
    const savedOrder: string[] = Array.isArray(p.order) ? p.order.filter((id: unknown) => typeof id === 'string' && ids.has(id)) : []
    const seen = new Set(savedOrder)
    const order = [...savedOrder, ...scenes.filter((s) => !seen.has(s.id)).map((s) => s.id)]
    const view: ViewMode = ['compare', 'narrative', 'timeline'].includes(p.view) ? p.view : 'compare'
    return { title: str(p.title), scenes, order, view }
  } catch { return fresh() }
}

// POV → 색 매핑(자동 배색). POV 가 비어 있으면 회색.
function povColorMap(scenes: Scene[]): Map<string, string> {
  const m = new Map<string, string>()
  let i = 0
  for (const s of scenes) {
    const key = s.pov.trim()
    if (!key) continue
    if (!m.has(key)) { m.set(key, POV_PALETTE[i % POV_PALETTE.length]); i++ }
  }
  return m
}
function sceneColor(s: Scene, povColors: Map<string, string>): string {
  if (s.color) return s.color
  const key = s.pov.trim()
  if (key && povColors.has(key)) return povColors.get(key)!
  return 'var(--muted)'
}

// ── 컴포넌트 ─────────────────────────────────────────────
export default function ReadingOrderPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>()
  if (!init.current) init.current = load()

  const [title, setTitle] = useState(init.current.title)
  const [scenes, setScenes] = useState<Scene[]>(init.current.scenes)
  const [order, setOrder] = useState<string[]>(init.current.order)
  const [view, setView] = useState<ViewMode>(init.current.view)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterPov, setFilterPov] = useState<string>('') // '' = 전체
  const [filterSub, setFilterSub] = useState<string>('')
  const [note, setNote] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [dropActive, setDropActive] = useState(false)

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 드래그 상태(서사 순서 재배치) — id 와 드롭 위치 표시.
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 외부에서 제목/장면 씨앗 전달 시 1회 반영(다른 도구에서 열기).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    if (typeof payload.title === 'string' && payload.title && !title.trim()) setTitle(payload.title)
    if (typeof payload.sceneTitle === 'string' && payload.sceneTitle) {
      addScene({
        title: payload.sceneTitle,
        pov: typeof payload.pov === 'string' ? payload.pov : '',
        subplot: typeof payload.subplot === 'string' ? payload.subplot : '',
        summary: typeof payload.summary === 'string' ? payload.summary : '',
      })
    }
  }, [payload]) // eslint-disable-line react-hooks/exhaustive-deps

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, scenes, order, view })) }
    catch { flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true) }
  }, [title, scenes, order, view])

  function flash(msg: string, warn = false) {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3000)
  }

  // ── 장면 CRUD ──
  const addScene = (patch: Partial<Scene> = {}) => {
    // 새 장면 시점 기본값: 현재 최대 time + 10(끝에 자연스럽게 추가).
    const maxTime = scenes.reduce((m, s) => Math.max(m, s.time), 0)
    const sc = mkScene({ time: scenes.length ? maxTime + 10 : 0, ...patch })
    setScenes((prev) => [...prev, sc])
    setOrder((prev) => [...prev, sc.id])
    setEditingId(sc.id)
    return sc
  }
  const patchScene = (id: string, patch: Partial<Scene>) =>
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const removeScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    setOrder((prev) => prev.filter((x) => x !== id))
    if (editingId === id) setEditingId(null)
  }
  const duplicateScene = (id: string) => {
    const src = scenes.find((s) => s.id === id)
    if (!src) return
    const copy = mkScene({ ...src, id: undefined, title: src.title + ' (사본)', time: src.time + 1 })
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      return next
    })
    setOrder((prev) => {
      const i = prev.indexOf(id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy.id)
      return next
    })
    flash('장면을 복제했어요.')
  }

  // ── 서사(발표) 순서 재배치 ──
  const moveInOrder = (id: string, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) { flash(dir < 0 ? '이미 맨 처음입니다.' : '이미 맨 끝입니다.'); return prev }
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 드래그한 id 를 target id 앞으로(또는 끝으로) 옮긴다.
  const dropOnto = (targetId: string | null) => {
    const from = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!from || from === targetId) return
    setOrder((prev) => {
      const next = prev.filter((x) => x !== from)
      if (targetId === null) { next.push(from); return next }
      const ti = next.indexOf(targetId)
      if (ti < 0) { next.push(from); return next }
      next.splice(ti, 0, from)
      return next
    })
  }

  // 서사 순서를 시간순으로 리셋(시간순=서사순으로 만들기 → 완전 선형 구성).
  const sortNarrativeByTime = () => {
    if (!scenes.length) return
    if (typeof window !== 'undefined' && !window.confirm('서사(발표) 순서를 이야기 속 시간순으로 다시 정렬할까요?\n현재의 비선형 배치는 사라집니다.')) return
    const sorted = [...scenes].sort((a, b) => a.time - b.time || a.title.localeCompare(b.title)).map((s) => s.id)
    setOrder(sorted)
    flash('서사 순서를 시간순으로 정렬했어요(선형 구성).')
  }

  // ── 파생 데이터 ──
  const byId = new Map(scenes.map((s) => [s.id, s]))
  const narrativeScenes = order.map((id) => byId.get(id)).filter((s): s is Scene => !!s)
  const timelineScenes = [...scenes].sort((a, b) => a.time - b.time || a.title.localeCompare(b.title))
  // 시간순에서 각 장면의 순위(시간 위치) — 비선형 판정용.
  const timeRank = new Map<string, number>()
  timelineScenes.forEach((s, i) => timeRank.set(s.id, i))

  // 서사순을 훑으며 '시간 도약' 표시: 이전 장면보다 시간순위가 작으면(=과거로) 회상/역행.
  interface FlowFlag { backward: boolean; jump: number } // jump: 시간순위 차이(절댓값)
  const flowFlags = new Map<string, FlowFlag>()
  let prevRank: number | null = null
  for (const s of narrativeScenes) {
    const r = timeRank.get(s.id) ?? 0
    if (prevRank !== null) {
      const diff = r - prevRank
      flowFlags.set(s.id, { backward: diff < 0, jump: Math.abs(diff) })
    } else {
      flowFlags.set(s.id, { backward: false, jump: 0 })
    }
    prevRank = r
  }
  const backwardCount = narrativeScenes.filter((s) => flowFlags.get(s.id)?.backward).length
  const linear = backwardCount === 0

  const povColors = povColorMap(scenes)
  const povList = Array.from(new Set(scenes.map((s) => s.pov.trim()).filter(Boolean)))
  const subList = Array.from(new Set(scenes.map((s) => s.subplot.trim()).filter(Boolean)))

  const passFilter = (s: Scene) =>
    (!filterPov || s.pov.trim() === filterPov) && (!filterSub || s.subplot.trim() === filterSub)

  const editing = editingId ? byId.get(editingId) || null : null

  // ── 좌측 바인더 파일 드롭 → 장면 가져오기 ──
  const onDropFromBinder = (e: React.DragEvent) => {
    setDropActive(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch = item.character || {}
    addScene({
      title: item.title || '가져온 장면',
      pov: ch['pov'] || ch['시점'] || '',
      summary: (item.text || '').slice(0, 200),
    })
    flash(`바인더 파일 "${item.title}"을(를) 장면으로 가져왔어요.`)
  }

  // ── 내보내기 ──
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# ${title.trim() || '읽기 순서 플래너'}`)
    lines.push(`장면 ${scenes.length}개 · ${linear ? '선형 구성' : `비선형 구성(시간 역행 ${backwardCount}곳)`}`)
    lines.push('')
    lines.push('## 서사(발표) 순서')
    narrativeScenes.forEach((s, i) => {
      const f = flowFlags.get(s.id)
      const mark = f?.backward ? ' ⮌회상' : ''
      lines.push(`${i + 1}. ${s.title}${mark}`)
      const meta = [s.pov && `POV:${s.pov}`, s.subplot && `갈래:${s.subplot}`, s.timeLabel && `시점:${s.timeLabel}`].filter(Boolean).join(' · ')
      if (meta) lines.push(`   (${meta})`)
      if (s.summary.trim()) lines.push(`   ${s.summary.trim()}`)
    })
    lines.push('')
    lines.push('## 이야기 속 시간순')
    timelineScenes.forEach((s, i) => {
      lines.push(`${i + 1}. [${s.timeLabel || 't=' + s.time}] ${s.title}${s.pov ? ` (${s.pov})` : ''}`)
    })
    return lines.join('\n')
  }

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>${escHtml(title.trim() || '읽기 순서 플래너')}</strong> · 장면 ${scenes.length}개 · ${linear ? '선형 구성' : `비선형 구성(회상 ${backwardCount}곳)`}</p>`)
    parts.push('<p><strong>서사(발표) 순서</strong></p><ol>')
    narrativeScenes.forEach((s) => {
      const f = flowFlags.get(s.id)
      const meta = [s.pov && `POV:${s.pov}`, s.subplot && `갈래:${s.subplot}`, s.timeLabel && `시점:${s.timeLabel}`].filter(Boolean).join(' · ')
      parts.push(`<li>${escHtml(s.title)}${f?.backward ? ' <em>(회상/역행)</em>' : ''}${meta ? ` <span style="color:#888">(${escHtml(meta)})</span>` : ''}${s.summary.trim() ? `<br/>${escMl(s.summary.trim())}` : ''}</li>`)
    })
    parts.push('</ol>')
    parts.push('<p><strong>이야기 속 시간순</strong></p><ol>')
    timelineScenes.forEach((s) => {
      parts.push(`<li>[${escHtml(s.timeLabel || 't=' + s.time)}] ${escHtml(s.title)}${s.pov ? ` <span style="color:#888">(${escHtml(s.pov)})</span>` : ''}</li>`)
    })
    parts.push('</ol>')
    return parts.join('')
  }

  const copyAll = () => {
    const text = buildText()
    const done = () => flash('전체 구성을 클립보드에 복사했어요.')
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)); return }
    } catch {}
    fallbackCopy(text, done)
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사에 실패했어요. 내보내기 패널에서 직접 선택해 복사하세요.', true) }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (!scenes.length) { flash('내보낼 장면이 없어요.', true); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구성',
      title: title.trim() ? `읽기 순서 — ${title.trim()}` : '읽기 순서 구성',
      bodyHtml: buildHtml(),
      synopsis: `${scenes.length}개 장면 · ${linear ? '선형' : `비선형(회상 ${backwardCount})`}`,
      meta: { 장면수: String(scenes.length), 구성: linear ? '선형' : '비선형', 회상지점: String(backwardCount) },
    })
    flash(id ? '프로젝트 자료(구성)에 읽기 순서 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.', !id)
  }

  const sceneToStash = (s: Scene) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.', true); return }
    const meta = [s.pov && `POV:${s.pov}`, s.timeLabel && s.timeLabel].filter(Boolean).join(' · ')
    addToStash({ kind: 'note', label: s.title, text: `${s.title}${meta ? `\n(${meta})` : ''}${s.summary ? `\n${s.summary}` : ''}` })
    flash('수집함에 장면 메모를 담았어요.')
  }

  const clearAll = () => {
    if (!scenes.length) return
    if (typeof window !== 'undefined' && !window.confirm('모든 장면을 삭제할까요? 되돌릴 수 없습니다.')) return
    setScenes([]); setOrder([]); setEditingId(null)
    flash('모든 장면을 비웠어요.')
  }

  const linked = hasProjectBridge()

  // ── 스타일 ─────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const titleInput: React.CSSProperties = { flex: '0 1 200px', padding: '6px 9px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const segWrap: React.CSSProperties = { display: 'flex', gap: 4, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }
  const filterBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0, flexWrap: 'wrap', fontSize: 12 }
  const sel: React.CSSProperties = { fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12, position: 'relative' }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropActive(true) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false) }}
      onDrop={onDropFromBinder}
    >
      {/* 헤더 */}
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🔀"/></span>
        <strong style={{ fontSize: 15 }}>읽기 순서 플래너</strong>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목(선택)" maxLength={80} />
        <span style={{ flex: 1 }} />
        <div style={segWrap}>
          <button className="minibtn" style={view === 'compare' ? activeSeg : undefined} onClick={() => setView('compare')} title="시간순↔서사순 비교">⇄ 비교</button>
          <button className="minibtn" style={view === 'narrative' ? activeSeg : undefined} onClick={() => setView('narrative')} title="서사(발표) 순서 — 드래그 재배치"><Emoji e="📖"/> 서사순</button>
          <button className="minibtn" style={view === 'timeline' ? activeSeg : undefined} onClick={() => setView('timeline')} title="이야기 속 시간순"><Emoji e="🕰️"/> 시간순</button>
        </div>
        <button className="btn-primary" onClick={() => addScene()} title="새 장면 카드 추가">＋ 장면</button>
      </div>

      {/* 상태/필터 바 */}
      <div style={filterBar}>
        <span style={{ color: 'var(--muted)' }}>장면 <strong style={{ color: 'var(--text)' }}>{scenes.length}</strong></span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          color: '#fff', background: linear ? 'var(--ok)' : 'var(--warn)',
        }} title={linear ? '서사 순서가 시간순과 같아 선형으로 읽힙니다' : '서사 순서가 시간을 거슬러 오르는 지점이 있어 비선형(회상/도약)으로 읽힙니다'}>
          {linear ? '선형 구성' : `비선형 · 회상 ${backwardCount}곳`}
        </span>
        <span style={{ flex: 1 }} />
        {povList.length > 0 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
            POV
            <select style={sel} value={filterPov} onChange={(e) => setFilterPov(e.target.value)}>
              <option value="">전체</option>
              {povList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        )}
        {subList.length > 0 && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
            갈래
            <select style={sel} value={filterSub} onChange={(e) => setFilterSub(e.target.value)}>
              <option value="">전체</option>
              {subList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        )}
        <button className="minibtn" onClick={sortNarrativeByTime} disabled={!scenes.length} title="서사 순서를 시간순으로 다시 정렬(선형 구성으로)">⇊ 시간순 정렬</button>
      </div>

      {note && (
        <div style={{ padding: '7px 14px', fontSize: 12, color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note}</div>
      )}

      {/* 본문 */}
      <div style={body}>
        {dropActive && (
          <div style={{ position: 'absolute', inset: 8, zIndex: 20, border: '2px dashed var(--accent)', borderRadius: 12, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>
            여기에 놓으면 바인더 파일이 장면으로 추가됩니다
          </div>
        )}

        {scenes.length === 0 ? (
          <EmptyState onAdd={() => addScene()} />
        ) : view === 'compare' ? (
          <CompareView
            narrative={narrativeScenes} timeline={timelineScenes}
            flowFlags={flowFlags} timeRank={timeRank} povColors={povColors}
            filterPov={filterPov} filterSub={filterSub} passFilter={passFilter}
            onEdit={setEditingId}
            dragId={dragId} dragOverId={dragOverId} setDragOverId={setDragOverId}
            onDrop={dropOnto}
          />
        ) : view === 'narrative' ? (
          <NarrativeView
            narrative={narrativeScenes} flowFlags={flowFlags} povColors={povColors}
            passFilter={passFilter}
            onEdit={setEditingId} onMove={moveInOrder} onDup={duplicateScene} onStash={sceneToStash} onDelete={removeScene}
            dragId={dragId} dragOverId={dragOverId} setDragOverId={setDragOverId} onDropOnto={dropOnto}
          />
        ) : (
          <TimelineView
            timeline={timelineScenes} povColors={povColors} passFilter={passFilter}
            onEdit={setEditingId} onPatch={patchScene}
          />
        )}
      </div>

      {/* 연계 + 푸터 */}
      <div className="linkbar" style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button className="minibtn" onClick={copyAll} disabled={!scenes.length} title="전체 구성을 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={() => setShowExport((v) => !v)} disabled={!scenes.length} title="텍스트 미리보기/내보내기">⬆ 내보내기</button>
        <button className="linkbtn" onClick={toProject} disabled={!linked || !scenes.length} title={linked ? '읽기 순서 구성을 프로젝트 자료(구성 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>좌측 바인더 파일을 끌어다 놓으면 장면으로 가져옵니다</span>
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={clearAll} disabled={!scenes.length} title="전체 비우기"><Emoji e="🗑️"/> 전체 비우기</button>
      </div>

      {/* 내보내기 패널 */}
      {showExport && scenes.length > 0 && (
        <ExportPanel text={buildText()} onClose={() => setShowExport(false)} onCopy={copyAll} />
      )}

      {/* 장면 편집 오버레이 */}
      {editing && (
        <SceneEditor
          scene={editing}
          povColors={povColors}
          onChange={(patch) => patchScene(editing.id, patch)}
          onDup={() => duplicateScene(editing.id)}
          onDelete={() => { removeScene(editing.id) }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

const activeSeg: React.CSSProperties = { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }

// ── 빈 상태 ─────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.8, gap: 14, padding: 24 }}>
      <div style={{ fontSize: 44 }}><Emoji e="🔀"/></div>
      <div>
        아직 장면이 없어요.<br />
        다중 POV·시간선·서브플롯 장면을 카드로 추가하고<br />
        <strong>시간순</strong>과 <strong>서사(발표) 순서</strong>를 비교·재배치해 보세요.
      </div>
      <button className="btn-primary" onClick={onAdd}>＋ 첫 장면 만들기</button>
      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>좌측 바인더의 글 파일을 이 창으로 끌어다 놓아도 장면으로 가져올 수 있어요.</div>
    </div>
  )
}

// ── 카드(공용) ─────────────────────────────────────────────
interface CardProps {
  scene: Scene
  povColors: Map<string, string>
  dim?: boolean             // 필터에 안 걸린 카드 흐리게
  ordinal?: number          // 표시 번호
  flag?: { backward: boolean; jump: number }
  rankNote?: string         // 비교뷰에서 '시간순 N번' 같은 보조 표시
  draggable?: boolean
  dragOver?: boolean
  compact?: boolean
  onEdit?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDup?: () => void
  onStash?: () => void
  onDelete?: () => void
  onDragStart?: () => void
  onDragOver?: () => void
  onDrop?: () => void
  onDragEnd?: () => void
}
function SceneCard(props: CardProps) {
  const { scene: s, povColors, dim, ordinal, flag, rankNote, draggable, dragOver, compact } = props
  const color = sceneColor(s, povColors)
  const st = STATUS[s.status]
  const [hover, setHover] = useState(false)

  const card: React.CSSProperties = {
    position: 'relative',
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '9px 11px 9px 13px',
    borderRadius: 10,
    border: '1px solid ' + (dragOver ? 'var(--accent)' : 'var(--border)'),
    borderLeft: `4px solid ${color}`,
    background: hover ? 'var(--chrome-2)' : 'var(--panel)',
    opacity: dim ? 0.4 : 1,
    outline: dragOver ? '2px dashed var(--accent)' : 'none',
    cursor: props.onEdit ? 'pointer' : 'default',
    boxSizing: 'border-box',
    transition: 'opacity .15s, background .12s',
  }
  const titleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const tag = (bg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: bg, color: '#fff', whiteSpace: 'nowrap' })
  const subtag: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, fontSize: 10.5, background: 'var(--chrome-2)', color: 'var(--muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }

  return (
    <div
      style={card}
      draggable={draggable}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={props.onEdit}
      onDragStart={(e) => { if (draggable) { props.onDragStart?.(); e.dataTransfer.effectAllowed = 'move' } }}
      onDragOver={(e) => { if (draggable) { e.preventDefault(); props.onDragOver?.() } }}
      onDrop={(e) => { if (draggable) { e.preventDefault(); e.stopPropagation(); props.onDrop?.() } }}
      onDragEnd={() => props.onDragEnd?.()}
      title={props.onEdit ? '클릭하여 장면 편집' : undefined}
    >
      <div style={titleRow}>
        {draggable && <span style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 12, marginRight: 1 }} title="드래그로 순서 변경">⠿</span>}
        {ordinal !== undefined && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 18 }}>{ordinal}.</span>}
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || '(제목 없음)'}</span>
        <span title={st.label} style={{ color: st.color, fontSize: 13, flexShrink: 0 }}>{st.icon}</span>
        {flag?.backward && <span style={tag('var(--warn)')} title={`이전 장면보다 이야기상 과거 — 회상/시간 역행 (시간순 ${flag.jump}칸)`}>⮌ 회상</span>}
      </div>

      {!compact && s.summary.trim() && (
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45, opacity: 0.88, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.summary}</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {s.pov.trim() && <span style={tag(color)}><Emoji e="👤"/> {s.pov}</span>}
        {s.subplot.trim() && <span style={subtag}><Emoji e="🧵"/> {s.subplot}</span>}
        {(s.timeLabel.trim() || rankNote) && <span style={subtag}><Emoji e="🕰️"/> {s.timeLabel.trim() || rankNote}</span>}
        {s.place.trim() && <span style={subtag}><Emoji e="📍"/> {s.place}</span>}
        {rankNote && s.timeLabel.trim() && <span style={subtag}>{rankNote}</span>}
      </div>

      {(props.onMoveUp || props.onDup || props.onStash || props.onDelete) && (hover) && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2, background: 'var(--panel)', borderRadius: 6, padding: 1 }} onClick={(e) => e.stopPropagation()}>
          {props.onMoveUp && <button className="minibtn" style={miniIcon} title="앞으로(서사순)" onClick={props.onMoveUp}>↑</button>}
          {props.onMoveDown && <button className="minibtn" style={miniIcon} title="뒤로(서사순)" onClick={props.onMoveDown}>↓</button>}
          {props.onDup && <button className="minibtn" style={miniIcon} title="복제" onClick={props.onDup}>⎘</button>}
          {props.onStash && <button className="minibtn" style={miniIcon} title="수집함에 담기" onClick={props.onStash}><Emoji e="📥"/></button>}
          {props.onDelete && <button className="minibtn" style={{ ...miniIcon, color: 'var(--warn)' }} title="삭제" onClick={props.onDelete}><Emoji e="🗑"/></button>}
        </div>
      )}
    </div>
  )
}
const miniIcon: React.CSSProperties = { padding: '2px 5px', fontSize: 11, lineHeight: 1 }

// ── 비교 뷰(시간순 ↔ 서사순) ─────────────────────────────────────────────
function CompareView(props: {
  narrative: Scene[]; timeline: Scene[]
  flowFlags: Map<string, { backward: boolean; jump: number }>
  timeRank: Map<string, number>
  povColors: Map<string, string>
  filterPov: string; filterSub: string
  passFilter: (s: Scene) => boolean
  onEdit: (id: string) => void
  dragId: React.MutableRefObject<string | null>
  dragOverId: string | null
  setDragOverId: (id: string | null) => void
  onDrop: (targetId: string | null) => void
}) {
  const { narrative, timeline, flowFlags, timeRank, povColors, passFilter, onEdit, dragId, dragOverId, setDragOverId, onDrop } = props
  const hasFilter = !!props.filterPov || !!props.filterSub

  const col: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }
  const colHead: React.CSSProperties = { position: 'sticky', top: -12, zIndex: 1, background: 'var(--paper)', padding: '2px 0 6px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* 시간순 */}
      <div style={col}>
        <div style={colHead}><Emoji e="🕰️"/> 이야기 속 시간순 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(시점값으로 자동 정렬)</span></div>
        {timeline.map((s, i) => (
          <SceneCard key={s.id} scene={s} povColors={povColors} ordinal={i + 1} dim={hasFilter && !passFilter(s)} compact onEdit={() => onEdit(s.id)} />
        ))}
      </div>

      {/* 화살표 분리선 */}
      <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 18, paddingTop: 30 }}>⇄</div>

      {/* 서사순(드래그 재배치) */}
      <div style={col}>
        <div style={colHead}><Emoji e="📖"/> 서사(발표) 순서 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(드래그로 재배치)</span></div>
        {narrative.map((s) => {
          const rank = timeRank.get(s.id) ?? 0
          return (
            <SceneCard
              key={s.id} scene={s} povColors={povColors}
              flag={flowFlags.get(s.id)} rankNote={`시간순 ${rank + 1}번`}
              dim={hasFilter && !passFilter(s)} compact
              draggable dragOver={dragOverId === s.id}
              onEdit={() => onEdit(s.id)}
              onDragStart={() => { dragId.current = s.id }}
              onDragOver={() => { if (dragOverId !== s.id) setDragOverId(s.id) }}
              onDrop={() => onDrop(s.id)}
              onDragEnd={() => { dragId.current = null; setDragOverId(null) }}
            />
          )
        })}
        {/* 끝으로 떨어뜨리기 영역 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverId('__end__') }}
          onDrop={(e) => { e.preventDefault(); onDrop(null) }}
          style={{ height: 28, borderRadius: 8, border: '1px dashed ' + (dragOverId === '__end__' ? 'var(--accent)' : 'var(--border)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}
        >맨 끝으로</div>
      </div>
    </div>
  )
}

// ── 서사 순서 뷰(단일 열, 드래그 + 버튼 재배치) ─────────────────────────────────────────────
function NarrativeView(props: {
  narrative: Scene[]
  flowFlags: Map<string, { backward: boolean; jump: number }>
  povColors: Map<string, string>
  passFilter: (s: Scene) => boolean
  onEdit: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDup: (id: string) => void
  onStash: (s: Scene) => void
  onDelete: (id: string) => void
  dragId: React.MutableRefObject<string | null>
  dragOverId: string | null
  setDragOverId: (id: string | null) => void
  onDropOnto: (targetId: string | null) => void
}) {
  const { narrative, flowFlags, povColors, passFilter, onEdit, onMove, onDup, onStash, onDelete, dragId, dragOverId, setDragOverId, onDropOnto } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>독자가 읽는 순서대로 카드를 드래그하거나 ↑↓로 옮기세요. <b style={{ color: 'var(--warn)' }}>⮌ 회상</b> 표시는 이야기상 과거로 돌아가는 지점입니다.</div>
      {narrative.map((s, i) => (
        <SceneCard
          key={s.id} scene={s} povColors={povColors} ordinal={i + 1}
          flag={flowFlags.get(s.id)} dim={!passFilter(s)}
          draggable dragOver={dragOverId === s.id}
          onEdit={() => onEdit(s.id)}
          onMoveUp={i > 0 ? () => onMove(s.id, -1) : undefined}
          onMoveDown={i < narrative.length - 1 ? () => onMove(s.id, 1) : undefined}
          onDup={() => onDup(s.id)} onStash={() => onStash(s)} onDelete={() => onDelete(s.id)}
          onDragStart={() => { dragId.current = s.id }}
          onDragOver={() => { if (dragOverId !== s.id) setDragOverId(s.id) }}
          onDrop={() => onDropOnto(s.id)}
          onDragEnd={() => { dragId.current = null; setDragOverId(null) }}
        />
      ))}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverId('__end__') }}
        onDrop={(e) => { e.preventDefault(); onDropOnto(null) }}
        style={{ height: 30, borderRadius: 8, border: '1px dashed ' + (dragOverId === '__end__' ? 'var(--accent)' : 'var(--border)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: 'var(--muted)' }}
      >여기에 놓으면 맨 끝으로 이동</div>
    </div>
  )
}

// ── 시간순 뷰(시점값 조정) ─────────────────────────────────────────────
function TimelineView(props: {
  timeline: Scene[]
  povColors: Map<string, string>
  passFilter: (s: Scene) => boolean
  onEdit: (id: string) => void
  onPatch: (id: string, patch: Partial<Scene>) => void
}) {
  const { timeline, povColors, passFilter, onEdit, onPatch } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>이야기 속 시점값(time)이 작을수록 먼저 일어난 일입니다. 카드의 시점값을 조정하면 시간순이 다시 정렬됩니다.</div>
      {timeline.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          {/* 타임라인 레일 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
            <div style={{ width: 2, flex: i === 0 ? 0 : 1, minHeight: i === 0 ? 8 : 12, background: 'var(--border)' }} />
            <div style={{ width: 11, height: 11, borderRadius: 999, background: sceneColor(s, povColors), border: '2px solid var(--paper)', boxShadow: '0 0 0 1px var(--border)', flexShrink: 0 }} />
            <div style={{ width: 2, flex: i === timeline.length - 1 ? 0 : 1, minHeight: i === timeline.length - 1 ? 8 : 12, background: 'var(--border)' }} />
          </div>
          {/* 카드 + 시점 조정 */}
          <div style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
            <SceneCard scene={s} povColors={povColors} ordinal={i + 1} dim={!passFilter(s)} onEdit={() => onEdit(s.id)} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, paddingLeft: 4 }} onClick={(e) => e.stopPropagation()}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>시점값</span>
              <input
                type="number"
                value={s.time}
                onChange={(e) => onPatch(s.id, { time: num(e.target.value, s.time) })}
                style={{ width: 76, fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
                title="작을수록 이야기상 먼저"
              />
              <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} title="조금 앞으로(과거로)" onClick={() => onPatch(s.id, { time: s.time - 5 })}>−5</button>
              <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} title="조금 뒤로(미래로)" onClick={() => onPatch(s.id, { time: s.time + 5 })}>＋5</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 장면 편집 오버레이 ─────────────────────────────────────────────
function SceneEditor(props: {
  scene: Scene
  povColors: Map<string, string>
  onChange: (patch: Partial<Scene>) => void
  onDup: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const { scene: s, povColors, onChange, onDup, onDelete, onClose } = props
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => titleRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const row: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const half: React.CSSProperties = { flex: '1 1 130px', minWidth: 0 }
  const color = sceneColor(s, povColors)

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.34)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100%)', maxHeight: '100%', overflow: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,.35)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
          <strong style={{ fontSize: 14 }}>장면 편집</strong>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={onClose} title="닫기">✕</button>
        </div>

        <div style={{ marginBottom: 11 }}>
          <div style={label}>제목</div>
          <input ref={titleRef} style={input} value={s.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="장면 제목" maxLength={80} />
        </div>

        <div style={{ ...row, marginBottom: 11 }}>
          <div style={half}>
            <div style={label}>POV (시점 인물)</div>
            <input style={input} value={s.pov} onChange={(e) => onChange({ pov: e.target.value })} placeholder="예: 서연" maxLength={40} list="rop-pov-list" />
          </div>
          <div style={half}>
            <div style={label}>서브플롯/갈래</div>
            <input style={input} value={s.subplot} onChange={(e) => onChange({ subplot: e.target.value })} placeholder="예: 메인 / 로맨스" maxLength={40} />
          </div>
        </div>

        <div style={{ ...row, marginBottom: 11 }}>
          <div style={half}>
            <div style={label}>시점값(time) <span style={{ fontWeight: 400 }}>작을수록 먼저</span></div>
            <input type="number" style={input} value={s.time} onChange={(e) => onChange({ time: num(e.target.value, s.time) })} />
          </div>
          <div style={half}>
            <div style={label}>시점 라벨</div>
            <input style={input} value={s.timeLabel} onChange={(e) => onChange({ timeLabel: e.target.value })} placeholder="예: 3년 전 봄" maxLength={50} />
          </div>
        </div>

        <div style={{ marginBottom: 11 }}>
          <div style={label}>장소(선택)</div>
          <input style={input} value={s.place} onChange={(e) => onChange({ place: e.target.value })} placeholder="예: 시립 도서관" maxLength={50} />
        </div>

        <div style={{ marginBottom: 11 }}>
          <div style={label}>요약/내용</div>
          <textarea
            style={{ ...input, resize: 'vertical', minHeight: 72, lineHeight: 1.5, fontFamily: 'inherit' }}
            value={s.summary} onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="이 장면에서 무슨 일이 일어나는지"
            maxLength={600}
          />
        </div>

        <div style={{ ...row, marginBottom: 14, alignItems: 'flex-end' }}>
          <div style={half}>
            <div style={label}>상태</div>
            <select style={input} value={s.status} onChange={(e) => onChange({ status: e.target.value as SceneStatus })}>
              {(Object.keys(STATUS) as SceneStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].icon} {STATUS[k].label}</option>)}
            </select>
          </div>
          <div style={{ ...half, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={label}>카드 색</div>
              <input type="color" value={s.color || (color.startsWith('#') ? color : '#7a7f8a')} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 42, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }} title="POV 자동색을 덮어쓸 카드 색" />
            </div>
            {s.color && <button className="minibtn" style={{ fontSize: 11 }} onClick={() => onChange({ color: '' })} title="POV 자동색으로">자동색</button>}
          </div>
        </div>

        <datalist id="rop-pov-list">
          {Array.from(povColors.keys()).map((p) => <option key={p} value={p} />)}
        </datalist>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="minibtn" onClick={() => { onDup() }} title="이 장면 복제">⎘ 복제</button>
          <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => { if (typeof window === 'undefined' || window.confirm('이 장면을 삭제할까요?')) { onDelete(); onClose() } }} title="이 장면 삭제"><Emoji e="🗑"/> 삭제</button>
          <span style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  )
}

// ── 내보내기 패널 ─────────────────────────────────────────────
function ExportPanel({ text, onClose, onCopy }: { text: string; onClose: () => void; onCopy: () => void }) {
  const panel: React.CSSProperties = { borderTop: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46%' }
  const area: React.CSSProperties = {
    flex: 1, minHeight: 100, resize: 'none', width: '100%', boxSizing: 'border-box', padding: 10, fontSize: 12.5,
    lineHeight: 1.55, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)',
    color: 'var(--text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre', overflow: 'auto',
  }
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>내보내기 (텍스트)</strong>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" onClick={onCopy}>복사</button>
        <button className="minibtn" onClick={onClose}>닫기</button>
      </div>
      <textarea style={area} value={text} readOnly aria-label="내보내기 결과" onFocus={(e) => e.currentTarget.select()} />
    </div>
  )
}
