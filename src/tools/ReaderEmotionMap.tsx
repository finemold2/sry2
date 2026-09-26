// 독자 감정 지도 — "인물이 느끼는 감정"이 아니라 "독자가 느끼길 의도한 감정"을 장면별로 설계한다.
//  · 장면마다: 의도 감정(긴장/연민/통쾌/불안/설렘 등) + 강도 + 실제로 쓴 장치(복선/시점/문장 길이…) + 인물 감정(대비 확인용) 메모.
//  · 색 띠 타임라인: 감정 종류=색, 강도=띠 높이/진하기. 한눈에 "독자 감정 곡선"을 본다.
//  · 인물 감정과 독자 감정이 어긋나게(드라마틱 아이러니) 또는 같게 설계했는지 점검.
//  · 장면 CRUD(추가/수정/삭제/순서이동/드래그), 단조로움·완급 진단, 좌측 바인더 파일 드롭으로 장면 생성.
// 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:reader-emotion-map' 자동 저장/복원. 외부 네트워크·미디어·키 불필요.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'reader-emotion-map', name: '독자 감정 지도', icon: '🎭', group: '구상·정리', intro: '장면별로 “독자가 느끼길 의도한 감정”과 그 장치를 매핑해 감정 곡선을 설계하세요(인물 감정과 구분)', w: 760, h: 640 }

const LS_KEY = 'sry:tool:reader-emotion-map'
const MIN_INT = 1
const MAX_INT = 5

// ── 감정 팔레트(자작 색·이모지만) ─────────────────────────────
// 독자에게 일으키려는 정서. 각자 고유 색으로 색 띠를 칠한다.
interface EmotionDef { key: string; label: string; icon: string; color: string }
const EMOTIONS: EmotionDef[] = [
  { key: 'tension',  label: '긴장',  icon: '😬', color: '#e8633a' },
  { key: 'unease',   label: '불안',  icon: '😟', color: '#b56db0' },
  { key: 'sympathy', label: '연민',  icon: '🥺', color: '#5b8def' },
  { key: 'thrill',   label: '통쾌',  icon: '😤', color: '#f0a83a' },
  { key: 'flutter',  label: '설렘',  icon: '💗', color: '#ec6f9e' },
  { key: 'awe',      label: '경이',  icon: '😮', color: '#3aa6b9' },
  { key: 'sorrow',   label: '슬픔',  icon: '😢', color: '#4f6db5' },
  { key: 'fear',     label: '공포',  icon: '😱', color: '#7a4fb5' },
  { key: 'curious',  label: '호기심', icon: '🧐', color: '#3ab96f' },
  { key: 'warmth',   label: '온정',  icon: '🤗', color: '#e0a64d' },
  { key: 'anger',    label: '분노',  icon: '😡', color: '#d9433a' },
  { key: 'relief',   label: '안도',  icon: '😌', color: '#6fb95b' },
  { key: 'laugh',    label: '웃음',  icon: '😄', color: '#e8c23a' },
  { key: 'disgust',  label: '역겨움', icon: '🤢', color: '#8a9b3a' },
  { key: 'hope',     label: '희망',  icon: '🌱', color: '#4db98f' },
]
const EMAP: Record<string, EmotionDef> = EMOTIONS.reduce((m, e) => { m[e.key] = e; return m }, {} as Record<string, EmotionDef>)
function emoOf(key: string): EmotionDef { return EMAP[key] || { key, label: key || '미정', icon: '⬜', color: 'var(--muted)' } }

// ── 장치(독자 감정을 일으키는 실제 기법) — 자작 분류 ───────────
const DEVICES: { group: string; items: string[] }[] = [
  { group: '구조·정보', items: ['복선', '떡밥 회수', '시한폭탄(데드라인)', '정보 격차(독자만 앎)', '미스터리(독자도 모름)', '반전', '클리프행어'] },
  { group: '시점·거리', items: ['시점 밀착(1인칭/근접)', '시점 멀어짐(관조)', '시점 전환', '신뢰할 수 없는 화자'] },
  { group: '문장·리듬', items: ['짧은 문장(속도↑)', '긴 만연체(지연)', '여백·침묵', '반복·후렴', '대사 위주', '묘사 위주'] },
  { group: '감각·이미지', items: ['감각 묘사', '대비(밝음↔어둠)', '상징·은유', '날씨·배경 활용', '소리·냄새'] },
  { group: '인물·관계', items: ['공감 빌드업', '약점 노출', '희생', '배신', '재회', '관계 긴장'] },
  { group: '기대·정서', items: ['기대 형성 후 충족', '기대 배반', '아이러니', '유머', '여운'] },
]

interface Scene {
  id: string
  title: string
  intended: string      // 의도한 독자 감정 key
  intensity: number     // 1~5
  devices: string[]     // 사용한 장치
  charEmotion: string   // 인물이 느끼는 감정(자유 텍스트) — 독자 감정과 대비 확인용
  note: string          // 메모
}
interface SaveShape { title: string; scenes: Scene[] }

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampInt(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 3
  return Math.min(MAX_INT, Math.max(MIN_INT, v))
}
function intensityLabel(n: number): string {
  return ['', '아주 약하게', '약하게', '보통', '강하게', '아주 강하게'][clampInt(n)] || '보통'
}
function defaultScenes(): Scene[] {
  return [
    { id: newId(), title: '도입부', intended: 'curious', intensity: 2, devices: ['미스터리(독자도 모름)'], charEmotion: '평온', note: '' },
    { id: newId(), title: '전환점', intended: 'tension', intensity: 4, devices: ['시한폭탄(데드라인)', '짧은 문장(속도↑)'], charEmotion: '당황', note: '' },
    { id: newId(), title: '절정', intended: 'thrill', intensity: 5, devices: ['떡밥 회수', '반전'], charEmotion: '결의', note: '' },
  ]
}
function sanitizeScene(s: any): Scene {
  const intended = (s && typeof s.intended === 'string' && EMAP[s.intended]) ? s.intended : 'tension'
  return {
    id: String(s?.id || newId()),
    title: String(s?.title ?? ''),
    intended,
    intensity: clampInt(s?.intensity),
    devices: Array.isArray(s?.devices) ? s.devices.filter((d: any) => typeof d === 'string').slice(0, 20) : [],
    charEmotion: String(s?.charEmotion ?? ''),
    note: String(s?.note ?? ''),
  }
}
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', scenes: defaultScenes() }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', scenes: defaultScenes() }
    const scenes: Scene[] = Array.isArray(p.scenes) ? p.scenes.filter((s: any) => s && typeof s === 'object').map(sanitizeScene) : defaultScenes()
    return { title: typeof p.title === 'string' ? p.title : '', scenes }
  } catch { return { title: '', scenes: defaultScenes() } }
}

export default function ReaderEmotionMap({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [scenes, setScenes] = useState<Scene[]>(init.current.scenes)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 장면 제목/인물감정 초기 주입(연계 도구에서 열릴 때)
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    const text = typeof payload.text === 'string' ? payload.text.trim() : ''
    if (!t && !text) return
    setScenes((prev) => [...prev, {
      id: newId(), title: t || '새 장면', intended: 'tension', intensity: 3,
      devices: [], charEmotion: '', note: text ? text.slice(0, 200) : '',
    }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, scenes } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, scenes])

  // 토스트 자동 소거
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
    return () => window.clearTimeout(t)
  }, [copied])
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2000)
    return () => window.clearTimeout(t)
  }, [saved])
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => { if (mounted.current) setNote('') }, 4000)
    return () => window.clearTimeout(t)
  }, [note])

  // ── CRUD ─────────────────────────────────────────────────
  const addScene = (preset?: Partial<Scene>) => {
    setScenes((prev) => {
      const n = prev.length + 1
      const sc: Scene = {
        id: newId(), title: preset?.title ?? `장면 ${n}`,
        intended: preset?.intended ?? 'tension', intensity: clampInt(preset?.intensity ?? 3),
        devices: preset?.devices ?? [], charEmotion: preset?.charEmotion ?? '', note: preset?.note ?? '',
      }
      // 새 장면은 자동으로 펼침
      window.setTimeout(() => { if (mounted.current) setExpandedId(sc.id) }, 0)
      return [...prev, sc]
    })
  }
  const removeScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    if (editingId === id) setEditingId(null)
    if (expandedId === id) setExpandedId(null)
  }
  const patchScene = (id: string, patch: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const toggleDevice = (id: string, dev: string) => {
    setScenes((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const has = s.devices.includes(dev)
      return { ...s, devices: has ? s.devices.filter((d) => d !== dev) : [...s.devices, dev] }
    }))
  }
  const startEdit = (s: Scene) => { setEditingId(s.id); setEditTitle(s.title) }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  const commitEdit = () => {
    if (!editingId) return
    const nm = editTitle.trim()
    setScenes((prev) => prev.map((s) => (s.id === editingId ? { ...s, title: nm || s.title } : s)))
    setEditingId(null); setEditTitle('')
  }
  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }
  const move = (id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  // 드래그 순서 변경(HTML5 DnD)
  const onReorderDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setScenes((prev) => {
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }
  const resetAll = () => { setScenes(defaultScenes()); setEditingId(null); setExpandedId(null) }

  // 좌측 바인더 파일 드롭 → 장면 생성
  const onPanelDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropActive) setDropActive(true) }
  }
  const onPanelDragLeave = () => { if (dropActive) setDropActive(false) }
  const onPanelDrop = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDropActive(false)
    const item = getDragItem(e)
    if (!item) return
    addScene({ title: item.title || '새 장면', charEmotion: '', note: item.text ? item.text.slice(0, 200) : '' })
  }

  // ── 진단(독자 감정 흐름) ──────────────────────────────────
  const ints = scenes.map((s) => s.intensity)
  const deltas: number[] = []
  for (let i = 1; i < ints.length; i++) deltas.push(Math.abs(ints[i] - ints[i - 1]))
  const avgSwing = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
  const peak = ints.length ? Math.max(...ints) : 0
  const uniqueEmotions = new Set(scenes.map((s) => s.intended)).size
  // 인물 감정 ↔ 독자 의도 감정의 의도적 어긋남(아이러니) 추정: 인물감정이 적힌 장면 비율
  const withChar = scenes.filter((s) => s.charEmotion.trim()).length

  let diagnosis = ''
  let diagColor = 'var(--muted)'
  if (scenes.length < 2) {
    diagnosis = '장면을 2개 이상 만들면 독자 감정 흐름을 진단합니다.'
  } else if (uniqueEmotions === 1) {
    diagnosis = '모든 장면이 같은 감정을 노립니다. 한 정서만 길게 이어지면 독자가 무뎌져요 — 결이 다른 감정(예: 긴장 사이에 온정/웃음)을 끼워 완급을 주세요.'
    diagColor = 'var(--warn)'
  } else if (avgSwing < 0.6 && peak < 4) {
    diagnosis = '강도 변화가 평탄하고 절정도 약합니다. 한두 장면의 강도를 끌어올려 독자 정서에 봉우리를 만드세요.'
    diagColor = 'var(--warn)'
  } else if (avgSwing >= 2.5) {
    diagnosis = '장면마다 정서 강도가 급격히 출렁입니다. 너무 잦은 고강도는 피로를 줘요 — 사이에 낮은 장면(숨 고르기)을 두세요.'
    diagColor = 'var(--warn)'
  } else if (peak >= 4 && uniqueEmotions >= 3) {
    diagnosis = '감정 종류가 다양하고 또렷한 절정이 있습니다. 독자 정서 설계가 탄탄해요.'
    diagColor = 'var(--ok)'
  } else {
    diagnosis = '흐름은 잡혔으나 다소 완만합니다. 절정 장면의 강도와 장치를 보강해 보세요.'
  }

  // ── 색 띠 타임라인 좌표 ────────────────────────────────────
  const VBW = 700, VBH = 150
  const PADL = 8, PADR = 8, PADT = 10, PADB = 26
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const n = scenes.length
  const bandW = n > 0 ? plotW / n : plotW

  // ── 텍스트/HTML 빌드 ──────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[독자 감정 지도] ${title.trim()}` : '[독자 감정 지도]')
    lines.push('')
    scenes.forEach((s, i) => {
      const e = emoOf(s.intended)
      lines.push(`${i + 1}. ${s.title || '(제목 없음)'}`)
      lines.push(`   · 독자 의도 감정: ${e.icon} ${e.label} (강도 ${s.intensity}/5, ${intensityLabel(s.intensity)})`)
      if (s.charEmotion.trim()) lines.push(`   · 인물 감정: ${s.charEmotion.trim()}`)
      if (s.devices.length) lines.push(`   · 장치: ${s.devices.join(', ')}`)
      if (s.note.trim()) lines.push(`   · 메모: ${s.note.trim()}`)
    })
    lines.push('')
    if (scenes.length >= 2) {
      lines.push(`감정 종류 ${uniqueEmotions}가지 / 평균 강도변화 ${avgSwing.toFixed(1)} / 최고 강도 ${peak}`)
      lines.push(`진단: ${diagnosis}`)
    }
    return lines.join('\n')
  }
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>독자 감정 지도</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 장면 ${scenes.length}개</p>`)
    parts.push('<p style="font-size:.9em;color:#888">독자가 느끼길 의도한 감정과 그 장치를 장면 순서대로 정리.</p>')
    parts.push('<ol>')
    scenes.forEach((s, i) => {
      const e = emoOf(s.intended)
      const bits: string[] = []
      bits.push(`<strong>${esc(s.title || `장면 ${i + 1}`)}</strong>`)
      bits.push(`독자 의도: ${esc(e.icon + ' ' + e.label)} (강도 ${s.intensity}/5)`)
      if (s.charEmotion.trim()) bits.push(`인물 감정: ${esc(s.charEmotion.trim())}`)
      if (s.devices.length) bits.push(`장치: ${esc(s.devices.join(', '))}`)
      if (s.note.trim()) bits.push(`메모: ${esc(s.note.trim())}`)
      parts.push(`<li>${bits.join(' — ')}</li>`)
    })
    parts.push('</ol>')
    if (scenes.length >= 2) {
      parts.push(`<p>감정 종류 ${uniqueEmotions}가지 · 평균 강도변화 ${avgSwing.toFixed(1)} · 최고 강도 ${peak}</p>`)
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
      if (mounted.current) setCopied(true)
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }
  const toProject = () => {
    if (!hasProjectBridge() || scenes.length === 0) return
    const meta: Record<string, string> = { 장면수: String(scenes.length) }
    if (scenes.length >= 2) {
      meta['감정종류'] = String(uniqueEmotions)
      meta['최고강도'] = String(peak)
      meta['평균강도변화'] = avgSwing.toFixed(1)
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `독자 감정 지도 — ${title.trim()}` : '독자 감정 지도',
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 연결되지 않았습니다.')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2, var(--panel))', flexShrink: 0 }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '24px 8px' }
  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    fontSize: 11, padding: '4px 8px', borderRadius: 999, cursor: 'pointer', userSelect: 'none',
    border: `1px solid ${active ? (color || 'var(--accent)') : 'var(--border)'}`,
    background: active ? (color ? color + '22' : 'var(--accent)') : 'transparent',
    color: active ? (color || 'var(--text)') : 'var(--muted)',
    fontWeight: active ? 700 : 500,
  })

  return (
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🎭"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/시퀀스 제목 (선택)" maxLength={80} aria-label="제목" />
        <button className="minibtn" onClick={copy} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || scenes.length === 0}
          title={hasProjectBridge() ? (scenes.length === 0 ? '추가할 장면이 없습니다' : '자료 › 구조 폴더에 독자 감정 지도 문서로 추가') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 프로젝트 자료(구조)에 독자 감정 지도 문서를 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div
        style={{ ...body, outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
        onDragOver={onPanelDragOver}
        onDragLeave={onPanelDragLeave}
        onDrop={onPanelDrop}
      >
        {/* ── 색 띠 타임라인 ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>독자 감정 색 띠 · 색=감정, 높이/진하기=강도</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" style={{ fontSize: 11 }} onClick={() => openToolLinked('emotion-arc')} title="인물의 감정 곡선 도구 열기"><Emoji e="📈"/> 인물 감정 곡선</button>
          </div>
          {scenes.length === 0 ? (
            <div style={empty}>장면을 추가하면 독자 감정 색 띠가 그려집니다.</div>
          ) : (
            <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 160 }} role="img" aria-label="독자 감정 색 띠 타임라인" preserveAspectRatio="none">
              {scenes.map((s, i) => {
                const e = emoOf(s.intended)
                const x = PADL + i * bandW
                const frac = (clampInt(s.intensity)) / MAX_INT
                const h = plotH * (0.32 + 0.68 * frac)
                const y = PADT + (plotH - h)
                const op = 0.42 + 0.58 * frac
                const label = (s.title || `${i + 1}`)
                const short = label.length > 6 ? label.slice(0, 6) + '…' : label
                return (
                  <g key={s.id}>
                    <rect x={x + 1.5} y={y} width={Math.max(1, bandW - 3)} height={h} rx={4} fill={e.color} opacity={op} stroke={e.color} strokeWidth={0.8}>
                      <title>{`${label}: ${e.label} (강도 ${s.intensity}/5)`}</title>
                    </rect>
                    <text x={x + bandW / 2} y={y + 13} textAnchor="middle" fontSize={11} aria-hidden>{e.icon}</text>
                    <text x={x + bandW / 2} y={VBH - 13} textAnchor="middle" fontSize={9.5} fill="var(--muted)">{short}</text>
                    <text x={x + bandW / 2} y={VBH - 2} textAnchor="middle" fontSize={8.5} fill={e.color} fontWeight={700}>{e.label}·{s.intensity}</text>
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        {/* ── 진단 ── */}
        <div style={{ ...panel, borderLeft: `3px solid ${diagColor}` }}>
          <div style={sectionTitle}>독자 감정 흐름 진단</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: diagColor === 'var(--muted)' ? 'var(--text)' : diagColor }}>{diagnosis}</div>
          {scenes.length >= 2 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>감정 종류 <strong style={{ color: 'var(--text)' }}>{uniqueEmotions}</strong></span>
              <span>평균 강도변화 <strong style={{ color: 'var(--text)' }}>{avgSwing.toFixed(1)}</strong></span>
              <span>최고 강도 <strong style={{ color: 'var(--text)' }}>{peak}</strong></span>
              <span>인물감정 기록 <strong style={{ color: 'var(--text)' }}>{withChar}/{scenes.length}</strong></span>
            </div>
          )}
          {scenes.length >= 2 && withChar > 0 && (
            <div style={{ ...hint, marginTop: 6 }}>팁: 인물 감정과 <b>독자 의도 감정</b>을 일부러 어긋나게 두면(인물은 모르고 독자만 위험을 앎) 드라마틱 아이러니가 생깁니다.</div>
          )}
        </div>

        {/* ── 장면 목록(CRUD) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>장면</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{scenes.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetAll} title="기본 3개 장면으로 초기화">초기화</button>
            <button className="btn-primary" onClick={() => addScene()}>＋ 장면 추가</button>
          </div>

          {scenes.length === 0 ? (
            <div style={empty}>
              아직 장면이 없어요.<br />
              <b>＋ 장면 추가</b>로 장면을 만들고, 각 장면에서<br />
              <b>독자가 느끼길 의도한 감정</b>과 그걸 일으키는 <b>장치</b>를 정해 보세요.<br />
              <span style={{ fontSize: 11 }}>좌측 바인더의 파일(장면 문서)을 여기로 끌어다 놓아도 장면이 만들어집니다.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenes.map((s, i) => {
                const isEd = editingId === s.id
                const isOpen = expandedId === s.id
                const e = emoOf(s.intended)
                return (
                  <div
                    key={s.id}
                    draggable={!isEd}
                    onDragStart={(ev) => { if (!isEd) { dragId.current = s.id; try { ev.dataTransfer.effectAllowed = 'move' } catch { /* noop */ } } }}
                    onDragOver={(ev) => { if (dragId.current) { ev.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) } }}
                    onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                    onDrop={(ev) => { if (dragId.current) { ev.preventDefault(); onReorderDrop(s.id) } }}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    style={{
                      background: 'var(--chrome-2, var(--paper))', borderRadius: 10,
                      border: '1px solid var(--border)', borderLeft: `4px solid ${e.color}`,
                      outline: dragOver === s.id ? '2px dashed var(--accent)' : 'none',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 헤더 행 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13, flexShrink: 0 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'right' }}>{i + 1}</span>
                      {isEd ? (
                        <input
                          value={editTitle}
                          onChange={(ev) => setEditTitle(ev.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={commitEdit}
                          autoFocus
                          maxLength={60}
                          aria-label="장면 제목 수정"
                          style={{ flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 13, borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <span
                          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                          onClick={() => startEdit(s)}
                          title="클릭해서 제목 수정"
                        >{s.title || `장면 ${i + 1}`}</span>
                      )}
                      <span style={{ flexShrink: 0, fontSize: 12, color: e.color, fontWeight: 700 }} title={`독자 의도: ${e.label}`}><Emoji e={e.icon}/> {e.label}</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>강도 {s.intensity}</span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, -1)} disabled={i === 0} title="위로" aria-label="위로 이동">▲</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(s.id, 1)} disabled={i === scenes.length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setExpandedId(isOpen ? null : s.id)} title={isOpen ? '접기' : '펼쳐서 편집'} aria-label="펼치기">{isOpen ? '▾' : '▸'}</button>
                        <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeScene(s.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </div>

                    {/* 펼침 편집부 */}
                    {isOpen && (
                      <div style={{ padding: '4px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* 의도 감정 선택 */}
                        <div>
                          <div style={{ ...sectionTitle, marginTop: 8 }}>독자가 느끼길 의도한 감정</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {EMOTIONS.map((em) => (
                              <span key={em.key} role="button" tabIndex={0}
                                onClick={() => patchScene(s.id, { intended: em.key })}
                                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); patchScene(s.id, { intended: em.key }) } }}
                                style={chip(s.intended === em.key, em.color)}
                                title={em.label}
                              ><Emoji e={em.icon}/> {em.label}</span>
                            ))}
                          </div>
                        </div>

                        {/* 강도 */}
                        <div>
                          <div style={{ ...sectionTitle, marginBottom: 4 }}>강도 — {intensityLabel(s.intensity)} ({s.intensity}/5)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 10, color: 'var(--muted)', width: 16 }}>약</span>
                            <input type="range" min={MIN_INT} max={MAX_INT} step={1} value={s.intensity}
                              onChange={(ev) => patchScene(s.id, { intensity: clampInt(ev.target.value) })}
                              style={{ flex: 1, accentColor: e.color }}
                              aria-label={`${s.title || '장면'} 강도`} />
                            <span style={{ fontSize: 10, color: 'var(--muted)', width: 16, textAlign: 'right' }}>강</span>
                          </div>
                        </div>

                        {/* 장치 */}
                        <div>
                          <div style={{ ...sectionTitle, marginBottom: 4 }}>이 감정을 일으키는 장치 <span style={{ fontWeight: 400 }}>({s.devices.length}개 선택)</span></div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {DEVICES.map((grp) => (
                              <div key={grp.group}>
                                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 4 }}>{grp.group}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {grp.items.map((dev) => {
                                    const on = s.devices.includes(dev)
                                    return (
                                      <span key={dev} role="button" tabIndex={0}
                                        onClick={() => toggleDevice(s.id, dev)}
                                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleDevice(s.id, dev) } }}
                                        style={chip(on)}
                                        title={on ? '클릭해서 해제' : '클릭해서 선택'}
                                      >{on ? '✓ ' : ''}{dev}</span>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 인물 감정(대비) */}
                        <div>
                          <div style={{ ...sectionTitle, marginBottom: 4 }}>이 장면에서 인물이 느끼는 감정 <span style={{ fontWeight: 400 }}>(독자 감정과 대비 확인)</span></div>
                          <input
                            value={s.charEmotion}
                            onChange={(ev) => patchScene(s.id, { charEmotion: ev.target.value })}
                            placeholder="예: 인물은 안심하지만 독자는 불안 (아이러니)"
                            maxLength={120}
                            aria-label="인물 감정"
                            style={{ width: '100%', padding: '6px 9px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }}
                          />
                          {s.charEmotion.trim() && emoOf(s.intended).label !== s.charEmotion.trim() && (
                            <div style={{ ...hint, marginTop: 4, color: e.color }}>대비: 인물 “{s.charEmotion.trim()}” ↔ 독자 의도 “{e.label}”</div>
                          )}
                        </div>

                        {/* 메모 */}
                        <div>
                          <div style={{ ...sectionTitle, marginBottom: 4 }}>메모</div>
                          <textarea
                            value={s.note}
                            onChange={(ev) => patchScene(s.id, { note: ev.target.value })}
                            placeholder="이 장면에서 감정을 어떻게 끌어낼지 메모…"
                            rows={2}
                            maxLength={500}
                            aria-label="메모"
                            style={{ width: '100%', padding: '6px 9px', fontSize: 12.5, lineHeight: 1.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={hint}>
          핵심: 이 도구는 인물의 감정이 아니라 <b>“독자가 느끼길 의도한 감정”</b>을 설계합니다. ▸ 로 장면을 펼쳐 의도 감정·강도·장치를 정하세요.
          ⠿ 드래그 또는 ▲▼로 순서를 바꾸고, 색 띠로 전체 감정 흐름을 점검하세요. 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
