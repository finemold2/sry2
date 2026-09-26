// 시나리오 포맷 도우미 — 씬 헤딩(슬러그라인: 실내/외·장소·시간)·지문(action)·인물명·대사·지시(parenthetical)를
//  형식에 맞게 입력하면 표준 시나리오 형태로 미리보기·정렬해 보여준다. 씬 추가/관리(CRUD).
// 자급식: react 외 import 은 './linkbus' 만. 외부 네트워크 없음(전부 로컬). 모든 데이터는 localStorage 자동 저장/복원.
// 연계: 완성한 대본을 프로젝트 원고('draft')의 〈시나리오〉 폴더에 text 문서로 추가.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'screenplay-formatter', name: '시나리오 포맷 도우미', icon: '🎬', group: '구상·정리', intro: '씬 헤딩·지문·대사·지시를 표준 시나리오 형식으로 정렬해 미리보기하세요', w: 720, h: 640 }

const LS_KEY = 'sry:tool:screenplay-formatter'

// ---- 요소(element) 종류 ----
type ElType = 'action' | 'character' | 'paren' | 'dialogue' | 'transition'
const EL_LABEL: Record<ElType, string> = {
  action: '지문(action)',
  character: '인물명',
  paren: '지시(parenthetical)',
  dialogue: '대사',
  transition: '전환(transition)',
}
const EL_ORDER: ElType[] = ['action', 'character', 'paren', 'dialogue', 'transition']

type IntExt = 'INT.' | 'EXT.' | 'INT./EXT.'
const INTEXT: { key: IntExt; label: string }[] = [
  { key: 'INT.', label: '실내(INT.)' },
  { key: 'EXT.', label: '실외(EXT.)' },
  { key: 'INT./EXT.', label: '실내외(INT./EXT.)' },
]

interface Element {
  id: string
  type: ElType
  text: string
}
interface Scene {
  id: string
  intext: IntExt
  place: string
  time: string
  elements: Element[]
}

const TIME_PRESETS = ['낮', '밤', '아침', '저녁', '새벽', '해질녘', '연속', '잠시 후', 'DAY', 'NIGHT', 'MORNING', 'LATER']
const TRANSITIONS = ['CUT TO:', 'FADE OUT.', 'FADE IN:', 'DISSOLVE TO:', 'SMASH CUT TO:', '암전.']

function newId(prefix: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function blankScene(): Scene {
  return { id: newId('sc'), intext: 'INT.', place: '', time: '낮', elements: [] }
}

// 슬러그라인(씬 헤딩) 표준 표기: "INT. 장소 - 시간"
function slugline(s: Scene): string {
  const place = (s.place || '〔장소〕').trim() || '〔장소〕'
  const time = (s.time || '').trim()
  return `${s.intext} ${place.toUpperCase()}${time ? ' - ' + time.toUpperCase() : ''}`
}

const VALID_TYPES: ElType[] = EL_ORDER
const VALID_INTEXT: IntExt[] = ['INT.', 'EXT.', 'INT./EXT.']

function loadState(): { scenes: Scene[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { scenes: [] }
    const p = JSON.parse(raw)
    const scenes: Scene[] = Array.isArray(p?.scenes)
      ? p.scenes.map((s: unknown) => {
          const sc = s as Partial<Scene>
          return {
            id: String(sc?.id || newId('sc')),
            intext: VALID_INTEXT.includes(sc?.intext as IntExt) ? (sc!.intext as IntExt) : 'INT.',
            place: String(sc?.place || ''),
            time: String(sc?.time || ''),
            elements: Array.isArray(sc?.elements)
              ? sc!.elements!
                  .filter((e) => e && VALID_TYPES.includes((e as Element).type))
                  .map((e) => ({ id: String((e as Element).id || newId('el')), type: (e as Element).type, text: String((e as Element).text || '') }))
              : [],
          }
        })
      : []
    return { scenes }
  } catch {
    return { scenes: [] }
  }
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ScreenplayFormatter({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [scenes, setScenes] = useState<Scene[]>(init.current.scenes)
  const [activeId, setActiveId] = useState<string>(() => init.current.scenes[0]?.id || '')
  const [draftType, setDraftType] = useState<ElType>('action')
  const [draftText, setDraftText] = useState('')
  const [note, setNote] = useState('')
  const [warn, setWarn] = useState(false)
  const [copied, setCopied] = useState(false)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload 로 초기 지문이 넘어오면 첫 씬을 만들어 채운다(연계 진입).
  useEffect(() => {
    const seed = typeof payload?.action === 'string' ? (payload.action as string).trim()
      : typeof payload?.text === 'string' ? (payload.text as string).trim() : ''
    if (seed && scenes.length === 0) {
      const sc = blankScene()
      if (typeof payload?.place === 'string') sc.place = payload.place as string
      sc.elements = [{ id: newId('el'), type: 'action', text: seed }]
      setScenes([sc])
      setActiveId(sc.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ scenes }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes])

  const flash = (msg: string, w = false) => {
    setNote(msg); setWarn(w)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const active = scenes.find((s) => s.id === activeId) || null

  // ---- 씬 CRUD ----
  const addScene = () => {
    const sc = blankScene()
    setScenes((p) => [...p, sc])
    setActiveId(sc.id)
    flash('씬을 추가했습니다.')
  }
  const removeScene = (id: string) => {
    setScenes((p) => {
      const idx = p.findIndex((s) => s.id === id)
      const next = p.filter((s) => s.id !== id)
      if (id === activeId) setActiveId(next[Math.max(0, idx - 1)]?.id || next[0]?.id || '')
      return next
    })
  }
  const moveScene = (id: string, dir: -1 | 1) => {
    setScenes((p) => {
      const i = p.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }
  const patchScene = (id: string, patch: Partial<Scene>) =>
    setScenes((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  // ---- 요소 CRUD ----
  const addElement = () => {
    if (!active) { flash('먼저 씬을 추가하세요.', true); return }
    const text = draftText.trim()
    // 인물명/전환은 자동 대문자/정규화, 빈 대사·지문은 막는다.
    if (draftType !== 'transition' && !text) { flash('내용을 입력하세요.', true); return }
    const el: Element = {
      id: newId('el'),
      type: draftType,
      text:
        draftType === 'character' ? text.toUpperCase()
        : draftType === 'paren' ? text.replace(/^\(?/, '').replace(/\)?$/, '')
        : text,
    }
    patchScene(active.id, { elements: [...active.elements, el] })
    setDraftText('')
    if (draftType === 'character') setDraftType('dialogue')      // 인물명 다음엔 대사를 받기 쉽게
    else if (draftType === 'paren') setDraftType('dialogue')
    draftRef.current?.focus()
  }
  const removeElement = (elId: string) => {
    if (!active) return
    patchScene(active.id, { elements: active.elements.filter((e) => e.id !== elId) })
  }
  const moveElement = (elId: string, dir: -1 | 1) => {
    if (!active) return
    const arr = active.elements
    const i = arr.findIndex((e) => e.id === elId)
    if (i < 0) return
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    const n = arr.slice()
    ;[n[i], n[j]] = [n[j], n[i]]
    patchScene(active.id, { elements: n })
  }
  const editElement = (elId: string, text: string) => {
    if (!active) return
    patchScene(active.id, { elements: active.elements.map((e) => (e.id === elId ? { ...e, text } : e)) })
  }

  // ---- 표준 텍스트 출력(복사·내보내기·프로젝트 본문 공통) ----
  const sceneToLines = (s: Scene, n: number): string[] => {
    const out: string[] = []
    out.push(`${n}. ${slugline(s)}`)
    out.push('')
    s.elements.forEach((e) => {
      if (e.type === 'action') { out.push(e.text); out.push('') }
      else if (e.type === 'character') { out.push('\t\t\t' + e.text.toUpperCase()) }
      else if (e.type === 'paren') { out.push('\t\t(' + e.text + ')') }
      else if (e.type === 'dialogue') { out.push('\t' + e.text); out.push('') }
      else if (e.type === 'transition') { out.push('\t\t\t\t\t' + (e.text || 'CUT TO:').toUpperCase()); out.push('') }
    })
    return out
  }
  const fullText = (): string =>
    scenes.length === 0 ? '' : scenes.flatMap((s, i) => sceneToLines(s, i + 1)).join('\n').trim()

  const copyAll = async () => {
    const t = fullText()
    if (!t) { flash('내보낼 내용이 없습니다.', true); return }
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(t)
      else throw new Error('no clipboard')
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false) }, 1400)
    } catch {
      flash('복사에 실패했습니다. 미리보기에서 직접 선택해 복사하세요.', true)
    }
  }

  // ---- 프로젝트 원고에 시나리오 문서로 추가 ----
  const elementToHtml = (e: Element): string => {
    if (e.type === 'action') return `<p>${escapeHtml(e.text)}</p>`
    if (e.type === 'character') return `<p style="margin-left:3.5em;font-weight:bold;">${escapeHtml(e.text.toUpperCase())}</p>`
    if (e.type === 'paren') return `<p style="margin-left:2.5em;font-style:italic;">(${escapeHtml(e.text)})</p>`
    if (e.type === 'dialogue') return `<p style="margin-left:1.5em;">${escapeHtml(e.text)}</p>`
    return `<p style="text-align:right;font-weight:bold;">${escapeHtml((e.text || 'CUT TO:').toUpperCase())}</p>`
  }
  const sceneToHtml = (s: Scene, n: number): string => {
    const head = `<p style="font-weight:bold;">${n}. ${escapeHtml(slugline(s))}</p>`
    const body = s.elements.map(elementToHtml).join('')
    return head + body
  }
  const addProjectDoc = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (scenes.length === 0) { flash('먼저 씬을 만들고 내용을 채우세요.', true); return }
    const bodyHtml = scenes.map((s, i) => sceneToHtml(s, i + 1)).join('<p>&nbsp;</p>')
    const title = scenes[0] && scenes[0].place ? `시나리오 — ${scenes[0].place}` : '시나리오'
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '시나리오',
      title,
      bodyHtml,
      synopsis: scenes.map((s, i) => `${i + 1}. ${slugline(s)}`).join(' / '),
      meta: { 씬: String(scenes.length) },
    })
    flash(id ? '프로젝트 원고 〈시나리오〉 폴더에 대본을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const elementCount = scenes.reduce((n, s) => n + s.elements.length, 0)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const cols: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const leftCol: React.CSSProperties = { width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const select: React.CSSProperties = { ...input, width: 'auto' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '24px 14px', border: '1px dashed var(--border)', borderRadius: 10 }
  const chip = (active2: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active2 ? 'var(--accent)' : 'var(--border)'),
    background: active2 ? 'var(--accent)' : 'var(--chrome-2)', color: active2 ? '#fff' : 'var(--text)',
  })
  // 미리보기(표준 시나리오 정렬) — 고정폭 글꼴, 요소별 들여쓰기.
  const preview: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 18px', background: 'var(--paper)', fontFamily: '"Courier New", ui-monospace, monospace', fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎬" /> 시나리오 포맷 도우미</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>씬 {scenes.length} · 요소 {elementCount}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={copyAll} disabled={scenes.length === 0}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}</button>
          <button className="btn-primary" onClick={addScene}>＋ 씬 추가</button>
        </div>
      </div>

      {note && (
        <div style={{ margin: '8px 16px 0', fontSize: 12, lineHeight: 1.6, color: warn ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          {warn ? '⚠ ' : '✓ '}{note}
        </div>
      )}

      {scenes.length === 0 ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={empty}>
            아직 씬이 없습니다.<br />
            <b>＋ 씬 추가</b>를 눌러 첫 씬을 만든 뒤<br />
            <b>실내/외 · 장소 · 시간</b>으로 씬 헤딩을 정하고,<br />
            지문(action) · 인물명 · 대사 · 지시(parenthetical)를 더해 보세요.<br />
            <span style={{ fontSize: 12 }}>오른쪽에 표준 시나리오 형식으로 정렬되어 미리보기됩니다.</span>
          </div>
        </div>
      ) : (
        <div style={cols}>
          {/* 씬 목록 */}
          <div style={leftCol}>
            <div style={{ ...label, padding: '8px 12px 4px', fontWeight: 700 }}>씬 목록</div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {scenes.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    cursor: 'pointer', borderRadius: 8, padding: '7px 9px',
                    border: '1px solid ' + (s.id === activeId ? 'var(--accent)' : 'var(--border)'),
                    background: s.id === activeId ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>S#{i + 1}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      <button style={iconBtn} title="위로" onClick={(e) => { e.stopPropagation(); moveScene(s.id, -1) }} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={(e) => { e.stopPropagation(); moveScene(s.id, 1) }} disabled={i === scenes.length - 1}>▼</button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="씬 삭제" onClick={(e) => { e.stopPropagation(); removeScene(s.id) }}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.4, wordBreak: 'break-all' }}>{slugline(s)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{s.elements.length}개 요소</div>
                </div>
              ))}
            </div>
          </div>

          {/* 편집 + 미리보기 */}
          <div style={rightCol}>
            {active && (
              <div style={{ overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)', maxHeight: '58%' }}>
                {/* 씬 헤딩 */}
                <div style={card}>
                  <div style={{ ...label, marginBottom: 6, fontWeight: 700 }}>씬 헤딩 (슬러그라인)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <div style={label}>실내/외</div>
                      <select style={select} value={active.intext} onChange={(e) => patchScene(active.id, { intext: e.target.value as IntExt })}>
                        {INTEXT.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={label}>장소</div>
                      <input style={input} value={active.place} onChange={(e) => patchScene(active.id, { place: e.target.value })} placeholder="예: 형사과 사무실" maxLength={80} />
                    </div>
                    <div style={{ minWidth: 110 }}>
                      <div style={label}>시간</div>
                      <input style={input} value={active.time} onChange={(e) => patchScene(active.id, { time: e.target.value })} placeholder="낮 / 밤 …" list="splay-times" maxLength={40} />
                      <datalist id="splay-times">{TIME_PRESETS.map((t) => <option key={t} value={t} />)}</datalist>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontFamily: '"Courier New", monospace', fontSize: 12.5, color: 'var(--accent)', wordBreak: 'break-all' }}>{slugline(active)}</div>
                </div>

                {/* 요소 입력 */}
                <div style={card}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {EL_ORDER.map((t) => (
                      <button key={t} onClick={() => setDraftType(t)} style={chip(draftType === t)}>{EL_LABEL[t]}</button>
                    ))}
                  </div>
                  {draftType === 'transition' ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {TRANSITIONS.map((tr) => (
                        <button key={tr} className="minibtn" onClick={() => { if (active) { patchScene(active.id, { elements: [...active.elements, { id: newId('el'), type: 'transition', text: tr }] }) } }}>{tr}</button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <textarea
                        ref={draftRef}
                        style={{ ...input, minHeight: draftType === 'action' ? 60 : 40, resize: 'vertical', fontFamily: 'inherit' }}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addElement() } }}
                        placeholder={
                          draftType === 'action' ? '지문 — 장면에서 보이고 들리는 것을 현재형으로 (Ctrl+Enter로 추가)'
                          : draftType === 'character' ? '인물명 — 대사를 말하는 인물 (자동 대문자)'
                          : draftType === 'paren' ? '지시 — 대사 직전 인물의 동작·어조 (괄호 자동)'
                          : '대사 — 인물이 말하는 내용'
                        }
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button className="btn-primary" onClick={addElement}>＋ {EL_LABEL[draftType]} 추가</button>
                        <span style={{ ...label, alignSelf: 'center' }}>Ctrl+Enter</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 이 씬의 요소 목록(편집·이동·삭제) */}
                <div style={card}>
                  <div style={{ ...label, marginBottom: 8, fontWeight: 700 }}>이 씬의 요소 · {active.elements.length}개</div>
                  {active.elements.length === 0 ? (
                    <div style={{ ...label, padding: '6px 2px' }}>위에서 지문·인물명·대사·지시를 더해 씬을 채우세요.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {active.elements.map((el, i) => (
                        <div key={el.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 5px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 3 }}>{EL_LABEL[el.type]}</span>
                          <input
                            style={{ ...input, flex: 1, fontFamily: el.type === 'character' || el.type === 'transition' ? '"Courier New", monospace' : 'inherit' }}
                            value={el.text}
                            onChange={(e) => editElement(el.id, el.type === 'character' || el.type === 'transition' ? e.target.value.toUpperCase() : e.target.value)}
                            placeholder={EL_LABEL[el.type]}
                          />
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginTop: 3 }}>
                            <button style={iconBtn} title="위로" onClick={() => moveElement(el.id, -1)} disabled={i === 0}>▲</button>
                            <button style={iconBtn} title="아래로" onClick={() => moveElement(el.id, 1)} disabled={i === active.elements.length - 1}>▼</button>
                            <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeElement(el.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 표준 시나리오 미리보기 */}
            <div style={{ ...label, padding: '8px 18px 0', fontWeight: 700 }}>표준 시나리오 미리보기</div>
            <div style={preview}>
              {scenes.map((s, i) => (
                <div key={s.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{i + 1}. {slugline(s)}</div>
                  <div style={{ height: 8 }} />
                  {s.elements.length === 0 && <div style={{ color: 'var(--muted)' }}>(빈 씬)</div>}
                  {s.elements.map((el) => {
                    if (el.type === 'action') return <p key={el.id} style={{ margin: '0 0 10px' }}>{el.text}</p>
                    if (el.type === 'character') return <p key={el.id} style={{ margin: '0', paddingLeft: '32%', fontWeight: 700, textTransform: 'uppercase' }}>{el.text}</p>
                    if (el.type === 'paren') return <p key={el.id} style={{ margin: '0', paddingLeft: '24%', fontStyle: 'italic', color: 'var(--muted)' }}>({el.text})</p>
                    if (el.type === 'dialogue') return <p key={el.id} style={{ margin: '0 0 10px', paddingLeft: '16%', paddingRight: '10%' }}>{el.text}</p>
                    return <p key={el.id} style={{ margin: '0 0 10px', textAlign: 'right', fontWeight: 700, textTransform: 'uppercase' }}>{el.text || 'CUT TO:'}</p>
                  })}
                </div>
              ))}
            </div>

            {/* 연계 */}
            <div className="linkbar" style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={addProjectDoc}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '전체 씬을 프로젝트 원고 〈시나리오〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              >
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
