// 사운드 큐 시트 — 장면별로 흐를 음악·효과음·앰비언트·정적의 "큐(cue)"를 적어 한 편의 소리 지도를 만든다.
//  · 장면(Scene): 제목·분위기 한 줄. 그 아래 큐 목록을 순서대로 쌓는다.
//  · 큐(Cue): 종류(🎵음악/🔊효과음/🌫앰비언트/🤫정적), 제목, 타이밍(언제), 분위기 메모, 볼륨/페이드, 비고.
//  · "이 장면 음악 찾기" → openToolLinked('music-gallery', { query }) 로 음악 갤러리를 분위기와 함께 띄운다.
//  · 좌측 바인더 파일(장면 문서 등)을 드래그해 장면으로 추가 가능(getDragItem).
//  · 전부 localStorage('sry:tool:sound-cue-sheet')에 자동 저장/복원. 미지원/차단/손상 시 graceful.
//  · 연계: 장면 큐 시트를 프로젝트 자료 문서로 추가(addToProject), 스니펫/수집함 담기.
// react 와 './linkbus' 외 import 금지. 외부 미디어 미사용.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge, openToolLinked,
  addToLibrary, addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'sound-cue-sheet',
  name: '사운드 큐 시트',
  icon: '🎚️',
  group: '분위기·시각',
  intro: '장면별 음악·효과음 분위기를 큐로 정리하고, 바로 "이 장면 음악 찾기"로 이어집니다',
  w: 720,
  h: 660,
}

const LS_KEY = 'sry:tool:sound-cue-sheet'

// ---------- 데이터 모델 ----------
type CueType = 'music' | 'sfx' | 'ambient' | 'silence'
interface Cue {
  id: string
  type: CueType
  title: string       // 곡명/효과음 이름 등(없어도 됨)
  cueAt: string       // 언제(예: "장면 시작", "그가 문을 열 때")
  mood: string        // 분위기 한 줄(음악 검색어로도 쓰임)
  volume: number      // 0~100
  fade: FadeKind      // 페이드 처리
  loop: boolean       // 반복(앰비언트/음악)
  note: string        // 비고
}
type FadeKind = 'none' | 'in' | 'out' | 'inout' | 'cross'
interface Scene {
  id: string
  title: string
  mood: string        // 장면 전체 분위기 한 줄
  collapsed: boolean
  cues: Cue[]
}
interface Persisted {
  scenes: Scene[]
  v: number
}

const CUE_TYPES: { key: CueType; label: string; icon: string; desc: string }[] = [
  { key: 'music',   label: '음악',     icon: '🎵', desc: 'BGM·테마·삽입곡' },
  { key: 'sfx',     label: '효과음',   icon: '🔊', desc: '문소리·발소리·총성 등' },
  { key: 'ambient', label: '앰비언트', icon: '🌫️', desc: '비·바람·잡음 등 배경음' },
  { key: 'silence', label: '정적',     icon: '🤫', desc: '의도적인 무음·긴장의 공백' },
]
function cueMeta(t: CueType) { return CUE_TYPES.find((c) => c.key === t) || CUE_TYPES[0] }

const FADES: { key: FadeKind; label: string }[] = [
  { key: 'none',  label: '없음' },
  { key: 'in',    label: '페이드 인' },
  { key: 'out',   label: '페이드 아웃' },
  { key: 'inout', label: '인+아웃' },
  { key: 'cross', label: '크로스페이드' },
]
function fadeLabel(f: FadeKind) { return (FADES.find((x) => x.key === f) || FADES[0]).label }

// ---------- 유틸 ----------
function newId(prefix: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}
function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function clampVol(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!isFinite(v)) return 70
  return Math.max(0, Math.min(100, Math.round(v)))
}

function makeCue(type: CueType = 'music'): Cue {
  return { id: newId('cue'), type, title: '', cueAt: '', mood: '', volume: type === 'silence' ? 0 : 70, fade: type === 'music' ? 'in' : 'none', loop: type === 'ambient', note: '' }
}
function makeScene(title = '새 장면', mood = ''): Scene {
  return { id: newId('scn'), title, mood, collapsed: false, cues: [] }
}

// ---------- 영속(로드/정규화) ----------
function emptyState(): Persisted { return { scenes: [], v: 1 } }
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return seedState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object' || !Array.isArray(p.scenes)) return seedState()
    const scenes: Scene[] = p.scenes.map((s: any) => ({
      id: String(s?.id || newId('scn')),
      title: typeof s?.title === 'string' ? s.title : '장면',
      mood: typeof s?.mood === 'string' ? s.mood : '',
      collapsed: !!s?.collapsed,
      cues: Array.isArray(s?.cues) ? s.cues.map((c: any): Cue => ({
        id: String(c?.id || newId('cue')),
        type: (['music', 'sfx', 'ambient', 'silence'].includes(c?.type) ? c.type : 'music') as CueType,
        title: typeof c?.title === 'string' ? c.title : '',
        cueAt: typeof c?.cueAt === 'string' ? c.cueAt : '',
        mood: typeof c?.mood === 'string' ? c.mood : '',
        volume: clampVol(c?.volume),
        fade: (['none', 'in', 'out', 'inout', 'cross'].includes(c?.fade) ? c.fade : 'none') as FadeKind,
        loop: !!c?.loop,
        note: typeof c?.note === 'string' ? c.note : '',
      })) : [],
    }))
    return { scenes, v: 1 }
  } catch {
    return seedState()
  }
}
// 첫 실행 예시 한 장면(빈 화면 대신 사용법을 바로 보여준다)
function seedState(): Persisted {
  const s = makeScene('1. 빗속의 첫 만남', '쓸쓸하고 미묘한 설렘')
  s.cues = [
    { ...makeCue('ambient'), title: '거리의 빗소리', cueAt: '장면 시작', mood: '도시의 밤비, 차분함', volume: 45, fade: 'in', loop: true, note: '대사 들어가면 살짝 줄이기' },
    { ...makeCue('music'), title: '', cueAt: '두 사람 눈 마주칠 때', mood: '잔잔한 피아노, 설렘', volume: 65, fade: 'inout', loop: false, note: '음악 갤러리에서 후보 찾기' },
    { ...makeCue('sfx'), title: '우산 펼치는 소리', cueAt: '그가 우산을 건넬 때', mood: '', volume: 80, fade: 'none', loop: false, note: '' },
  ]
  return { scenes: [s], v: 1 }
}

// ---------- 텍스트/HTML 내보내기 ----------
function cueLine(c: Cue): string {
  const m = cueMeta(c.type)
  const bits: string[] = [m.icon + ' ' + m.label]
  if (c.cueAt) bits.push('[' + c.cueAt + ']')
  if (c.title) bits.push('「' + c.title + '」')
  if (c.mood) bits.push('— ' + c.mood)
  const extra: string[] = []
  if (c.type !== 'silence') extra.push('vol ' + c.volume)
  if (c.fade !== 'none') extra.push(fadeLabel(c.fade))
  if (c.loop) extra.push('반복')
  if (extra.length) bits.push('(' + extra.join(', ') + ')')
  if (c.note) bits.push('※ ' + c.note)
  return bits.join(' ')
}
function sceneText(s: Scene): string {
  const lines = [`■ ${s.title}${s.mood ? ' — ' + s.mood : ''}`]
  if (!s.cues.length) lines.push('  (큐 없음)')
  s.cues.forEach((c, i) => lines.push(`  ${i + 1}. ${cueLine(c)}`))
  return lines.join('\n')
}
function allText(scenes: Scene[]): string {
  return ['🎚️ 사운드 큐 시트', '', ...scenes.map(sceneText)].join('\n\n')
}
function sceneHtml(s: Scene): string {
  const parts: string[] = []
  parts.push('<p><strong>🎬 ' + escHtml(s.title) + '</strong>' + (s.mood ? ' — ' + escHtml(s.mood) : '') + '</p>')
  if (!s.cues.length) { parts.push('<p>(큐 없음)</p>'); return parts.join('') }
  parts.push('<ul>')
  s.cues.forEach((c) => parts.push('<li>' + escHtml(cueLine(c)) + '</li>'))
  parts.push('</ul>')
  return parts.join('')
}

export default function SoundCueSheet({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [note, setNote] = useState('')          // 하단 안내(저장 실패 등 영구성)
  const [flash, setFlashMsg] = useState('')      // 일시적 성공 토스트
  const [dragOver, setDragOver] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const mounted = useRef(true)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didPayload = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만, 동작은 유지
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침 시 큐 시트가 사라질 수 있어요.') }
  }, [state])

  // 페이로드로 장면 정보가 들어오면 1회 장면 추가(다른 도구가 "이 장면 사운드" 연계 시)
  useEffect(() => {
    if (didPayload.current || !payload) return
    didPayload.current = true
    const title = typeof payload.title === 'string' ? payload.title : (typeof payload.scene === 'string' ? payload.scene : '')
    const mood = typeof payload.mood === 'string' ? payload.mood : ''
    if (title || mood) {
      setState((s) => ({ ...s, scenes: [makeScene(title || '새 장면', mood), ...s.scenes] }))
      toast('장면을 큐 시트에 추가했어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toast(msg: string) {
    setFlashMsg(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => { if (mounted.current) setFlashMsg('') }, 1900)
  }

  // ---------- 장면 CRUD ----------
  function addScene() {
    setState((s) => ({ ...s, scenes: [...s.scenes, makeScene('장면 ' + (s.scenes.length + 1))] }))
  }
  function patchScene(id: string, patch: Partial<Scene>) {
    setState((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  }
  function removeScene(id: string) {
    setState((s) => ({ ...s, scenes: s.scenes.filter((x) => x.id !== id) }))
  }
  function duplicateScene(id: string) {
    setState((s) => {
      const idx = s.scenes.findIndex((x) => x.id === id)
      if (idx < 0) return s
      const src = s.scenes[idx]
      const copy: Scene = {
        ...src,
        id: newId('scn'),
        title: src.title + ' (복사)',
        collapsed: false,
        cues: src.cues.map((c) => ({ ...c, id: newId('cue') })),
      }
      const arr = s.scenes.slice()
      arr.splice(idx + 1, 0, copy)
      return { ...s, scenes: arr }
    })
  }
  function moveScene(id: string, dir: -1 | 1) {
    setState((s) => {
      const arr = s.scenes.slice()
      const i = arr.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return s
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t
      return { ...s, scenes: arr }
    })
  }
  function toggleCollapse(id: string) {
    setState((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id === id ? { ...x, collapsed: !x.collapsed } : x)) }))
  }
  function collapseAll(v: boolean) {
    setState((s) => ({ ...s, scenes: s.scenes.map((x) => ({ ...x, collapsed: v })) }))
  }

  // ---------- 큐 CRUD ----------
  function addCue(sceneId: string, type: CueType = 'music') {
    setState((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id === sceneId ? { ...x, cues: [...x.cues, makeCue(type)] } : x)) }))
  }
  function patchCue(sceneId: string, cueId: string, patch: Partial<Cue>) {
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((x) => (x.id !== sceneId ? x : { ...x, cues: x.cues.map((c) => (c.id === cueId ? { ...c, ...patch } : c)) })),
    }))
  }
  function removeCue(sceneId: string, cueId: string) {
    setState((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id !== sceneId ? x : { ...x, cues: x.cues.filter((c) => c.id !== cueId) })) }))
  }
  function duplicateCue(sceneId: string, cueId: string) {
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((x) => {
        if (x.id !== sceneId) return x
        const i = x.cues.findIndex((c) => c.id === cueId)
        if (i < 0) return x
        const arr = x.cues.slice()
        arr.splice(i + 1, 0, { ...x.cues[i], id: newId('cue') })
        return { ...x, cues: arr }
      }),
    }))
  }
  function moveCue(sceneId: string, cueId: string, dir: -1 | 1) {
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((x) => {
        if (x.id !== sceneId) return x
        const arr = x.cues.slice()
        const i = arr.findIndex((c) => c.id === cueId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= arr.length) return x
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t
        return { ...x, cues: arr }
      }),
    }))
  }

  // ---------- 음악 갤러리 연계 ----------
  function findMusic(sceneMood: string, cueMood?: string) {
    const q = [cueMood, sceneMood].filter((x) => x && x.trim()).join(' ').trim()
    openToolLinked('music-gallery', q ? { query: q, mood: q } : undefined)
    toast(q ? '음악 갤러리를 열었어요(분위기 전달).' : '음악 갤러리를 열었어요.')
  }

  // ---------- 드롭(바인더 파일 → 장면) ----------
  function onDrop(e: React.DragEvent) {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const mood = item.character?.mood || ''
    setState((s) => ({ ...s, scenes: [...s.scenes, makeScene(item.title || '장면', mood)] }))
    toast(`"${item.title}" 을(를) 장면으로 추가했어요.`)
  }
  function onDragOver(e: React.DragEvent) {
    if (isItemDrag(e)) { e.preventDefault(); if (!dragOver) setDragOver(true) }
  }
  function onDragLeave() { if (dragOver) setDragOver(false) }

  // ---------- 내보내기·연계 ----------
  const bridge = hasProjectBridge()
  const stash = hasStash()
  const totalCues = state.scenes.reduce((a, s) => a + s.cues.length, 0)

  async function copyAll() {
    const text = allText(state.scenes)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      toast('큐 시트를 복사했어요.')
    } catch { toast('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  function sceneToProject(s: Scene) {
    if (!bridge) { toast('프로젝트에 연결되어 있지 않아요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사운드 큐',
      title: '🎚️ ' + s.title + (s.mood ? ' — ' + s.mood : ''),
      bodyHtml: sceneHtml(s),
      meta: { 분위기: s.mood || '—', 큐: String(s.cues.length) },
    })
    toast(id ? `'사운드 큐' 폴더에 "${s.title}" 시트를 추가했어요.` : '프로젝트에 연결되지 않았습니다.')
  }
  function allToProject() {
    if (!bridge) { toast('프로젝트에 연결되어 있지 않아요.'); return }
    const body = state.scenes.map(sceneHtml).join('<hr/>')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사운드 큐',
      title: '🎚️ 사운드 큐 시트 (전체)',
      bodyHtml: body || '<p>(장면 없음)</p>',
      meta: { 장면: String(state.scenes.length), 큐: String(totalCues) },
    })
    toast(id ? `'사운드 큐' 폴더에 전체 시트를 추가했어요.` : '프로젝트에 연결되지 않았습니다.')
  }
  function sceneToSnippet(s: Scene) {
    addToLibrary('snippets', { text: sceneText(s), source: '사운드 큐 시트', tags: ['사운드', '큐', s.title].filter(Boolean) })
    toast('스니펫 라이브러리에 저장했어요.')
  }
  function sceneToStash(s: Scene) {
    if (!stash) { toast('수집함이 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'note', label: '🎚️ ' + s.title, text: sceneText(s) })
    toast('수집함에 담았어요.')
  }

  function clearAll() {
    setState(emptyState())
    setConfirmClear(false)
    toast('모든 장면을 비웠어요.')
  }

  // ---------- 스타일 ----------
  const accentBy: Record<CueType, string> = { music: 'var(--accent)', sfx: 'var(--ok, #2bb673)', ambient: '#6c7bd1', silence: 'var(--muted)' }
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, position: 'relative' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const scHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 6, flexShrink: 0 }
  const labelS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3, display: 'block' }
  const noteS: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }
  const selS: React.CSSProperties = { ...input, padding: '6px 8px', cursor: 'pointer' }

  return (
    <div
      style={wrap}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div style={head}>
        <span style={headTitle}><Emoji e="🎚️"/> 사운드 큐 시트</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>장면 {state.scenes.length} · 큐 {totalCues}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="btn-primary" onClick={addScene} title="새 장면 추가">＋ 장면</button>
        <button className="minibtn" onClick={() => collapseAll(true)} disabled={!state.scenes.length} title="모두 접기">▸ 접기</button>
        <button className="minibtn" onClick={() => collapseAll(false)} disabled={!state.scenes.length} title="모두 펼치기">▾ 펼치기</button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="linkbtn" onClick={() => findMusic('')} title="음악 갤러리 열기"><Emoji e="🎵"/> 음악 갤러리 열기</button>
        <button className="minibtn" onClick={copyAll} disabled={!state.scenes.length} title="전체 큐 시트를 텍스트로 복사"><Emoji e="📋"/> 전체 복사</button>
        <button className="linkbtn" onClick={allToProject} disabled={!bridge || !state.scenes.length} title={bridge ? "전체 시트를 프로젝트 '사운드 큐' 폴더에 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <span style={{ flex: 1 }} />
        {confirmClear ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--warn)' }}>모두 삭제할까요?</span>
            <button style={{ ...tinyBtn, color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={clearAll}>삭제</button>
            <button style={tinyBtn} onClick={() => setConfirmClear(false)}>취소</button>
          </>
        ) : (
          <button className="minibtn" onClick={() => setConfirmClear(true)} disabled={!state.scenes.length} title="모든 장면 삭제"><Emoji e="🗑"/> 전체 비우기</button>
        )}
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {state.scenes.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 16px', lineHeight: 1.7 }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}><Emoji e="🎚️"/></div>
            아직 장면이 없어요. <b>＋ 장면</b> 으로 첫 장면을 만들고,<br />
            그 안에 흐를 음악·효과음·앰비언트 <b>큐</b>를 쌓아 보세요.<br />
            <span style={noteS}>좌측 바인더의 장면 문서를 이 창으로 끌어다 놓아도 장면이 됩니다.</span>
          </div>
        )}

        {state.scenes.map((s, sIdx) => (
          <div key={s.id} style={card}>
            {/* 장면 머리글 */}
            <div style={scHead}>
              <button style={{ ...tinyBtn, padding: '4px 6px' }} onClick={() => toggleCollapse(s.id)} title={s.collapsed ? '펼치기' : '접기'}>{s.collapsed ? '▸' : '▾'}</button>
              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, fontWeight: 700, minWidth: 20 }}>{sIdx + 1}</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  style={{ ...input, fontWeight: 700, background: 'transparent', border: '1px solid transparent', padding: '4px 6px' }}
                  value={s.title}
                  placeholder="장면 제목"
                  onChange={(e) => patchScene(s.id, { title: e.target.value })}
                  aria-label="장면 제목"
                />
                <input
                  style={{ ...input, fontSize: 12, background: 'transparent', border: '1px solid transparent', padding: '2px 6px', color: 'var(--muted)' }}
                  value={s.mood}
                  placeholder="장면 분위기 한 줄 (음악 검색에 사용)"
                  onChange={(e) => patchScene(s.id, { mood: e.target.value })}
                  aria-label="장면 분위기"
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>큐 {s.cues.length}</span>
              <button style={tinyBtn} title="위로" disabled={sIdx === 0} onClick={() => moveScene(s.id, -1)}>↑</button>
              <button style={tinyBtn} title="아래로" disabled={sIdx === state.scenes.length - 1} onClick={() => moveScene(s.id, 1)}>↓</button>
              <button style={tinyBtn} title="복제" onClick={() => duplicateScene(s.id)}>⧉</button>
              <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="장면 삭제" onClick={() => removeScene(s.id)}>✕</button>
            </div>

            {!s.collapsed && (
              <div style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 장면 단위 액션 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="linkbtn" onClick={() => findMusic(s.mood)} title="이 장면 분위기로 음악 갤러리에서 곡 찾기"><Emoji e="🎵"/> 이 장면 음악 찾기</button>
                  <button className="minibtn" onClick={() => sceneToProject(s)} disabled={!bridge} title={bridge ? "이 장면 큐 시트를 프로젝트 자료로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 이 장면 추가</button>
                  <button className="minibtn" onClick={() => sceneToSnippet(s)} title="이 장면 큐를 스니펫 라이브러리에 저장"><Emoji e="🔖"/> 스니펫</button>
                  {stash && <button className="minibtn" onClick={() => sceneToStash(s)} title="이 장면 큐를 수집함에 담기"><Emoji e="📥"/> 수집함</button>}
                </div>

                {/* 큐 목록 */}
                {s.cues.length === 0 ? (
                  <div style={{ ...noteS, padding: '6px 2px' }}>아직 큐가 없어요. 아래에서 음악·효과음·앰비언트·정적 큐를 추가하세요.</div>
                ) : (
                  s.cues.map((c, cIdx) => {
                    const m = cueMeta(c.type)
                    const accent = accentBy[c.type]
                    return (
                      <div key={c.id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 10, background: 'var(--paper)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* 줄 1: 종류 + 순서/액션 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, width: 18, flexShrink: 0 }}>{cIdx + 1}</span>
                          <select style={{ ...selS, width: 'auto', flex: '0 0 auto' }} value={c.type} onChange={(e) => patchCue(s.id, c.id, { type: e.target.value as CueType })} aria-label="큐 종류" title={m.desc}>
                            {CUE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                          </select>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.desc}</span>
                          <span style={{ flex: 1 }} />
                          {c.type === 'music' && (
                            <button style={{ ...tinyBtn, color: accent, borderColor: accent }} title="이 큐 분위기로 음악 찾기" onClick={() => findMusic(s.mood, c.mood)}><Emoji e="🎵"/> 곡 찾기</button>
                          )}
                          <button style={tinyBtn} title="위로" disabled={cIdx === 0} onClick={() => moveCue(s.id, c.id, -1)}>↑</button>
                          <button style={tinyBtn} title="아래로" disabled={cIdx === s.cues.length - 1} onClick={() => moveCue(s.id, c.id, 1)}>↓</button>
                          <button style={tinyBtn} title="복제" onClick={() => duplicateCue(s.id, c.id)}>⧉</button>
                          <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="큐 삭제" onClick={() => removeCue(s.id, c.id)}>✕</button>
                        </div>

                        {/* 줄 2: 제목 + 타이밍 */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {c.type !== 'silence' && (
                            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                              <label style={labelS}>{c.type === 'music' ? '곡명(선택)' : '소리 이름'}</label>
                              <input style={input} value={c.title} placeholder={c.type === 'music' ? '예: Nocturne / 미정' : '예: 문 닫히는 소리'} onChange={(e) => patchCue(s.id, c.id, { title: e.target.value })} />
                            </div>
                          )}
                          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                            <label style={labelS}>큐 타이밍 (언제)</label>
                            <input style={input} value={c.cueAt} placeholder="예: 장면 시작 / 그가 돌아설 때" onChange={(e) => patchCue(s.id, c.id, { cueAt: e.target.value })} />
                          </div>
                        </div>

                        {/* 줄 3: 분위기 메모(정적이면 효과 설명) */}
                        <div>
                          <label style={labelS}>{c.type === 'silence' ? '정적의 효과(메모)' : '분위기 메모 (음악 검색에도 사용)'}</label>
                          <input style={input} value={c.mood} placeholder={c.type === 'silence' ? '예: 숨 막히는 침묵, 시계 초침만' : '예: 어둡고 긴장된, 첼로'} onChange={(e) => patchCue(s.id, c.id, { mood: e.target.value })} />
                        </div>

                        {/* 줄 4: 볼륨/페이드/반복 */}
                        {c.type !== 'silence' && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                              <label style={labelS}>볼륨 <b style={{ color: 'var(--text)' }}>{c.volume}</b></label>
                              <input type="range" min={0} max={100} value={c.volume} onChange={(e) => patchCue(s.id, c.id, { volume: clampVol(e.target.value) })} style={{ width: '100%', accentColor: accent, cursor: 'pointer' }} aria-label="볼륨" />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={labelS}>페이드</label>
                              <select style={{ ...selS, width: 'auto' }} value={c.fade} onChange={(e) => patchCue(s.id, c.id, { fade: e.target.value as FadeKind })} aria-label="페이드">
                                {FADES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                              </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer', paddingBottom: 7 }}>
                              <input type="checkbox" checked={c.loop} onChange={(e) => patchCue(s.id, c.id, { loop: e.target.checked })} style={{ width: 15, height: 15, accentColor: accent, cursor: 'pointer' }} />
                              반복
                            </label>
                          </div>
                        )}

                        {/* 줄 5: 비고 */}
                        <div>
                          <label style={labelS}>비고</label>
                          <input style={input} value={c.note} placeholder="연출 메모(예: 대사 들어가면 줄이기)" onChange={(e) => patchCue(s.id, c.id, { note: e.target.value })} />
                        </div>
                      </div>
                    )
                  })
                )}

                {/* 큐 추가 버튼들 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 9 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', alignSelf: 'center' }}>큐 추가:</span>
                  {CUE_TYPES.map((t) => (
                    <button key={t.key} className="minibtn" onClick={() => addCue(s.id, t.key)} title={t.desc}><Emoji e={t.icon}/> {t.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {state.scenes.length > 0 && (
          <div style={noteS}>
            장면마다 큐를 순서대로 쌓아 한 편의 <b>소리 지도</b>를 만드세요. <b><Emoji e="🎵"/> 이 장면 음악 찾기</b>를 누르면 그 장면의 분위기로 음악 갤러리가 열립니다.
            모든 내용은 이 브라우저에 자동 저장됩니다.
          </div>
        )}
      </div>

      {/* 드래그 오버레이 */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px dashed var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 18px', fontWeight: 600, color: 'var(--text)' }}><Emoji e="📎"/> 놓으면 이 파일이 새 장면이 됩니다</div>
        </div>
      )}
    </div>
  )
}
