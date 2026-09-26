// 찾기·바꾸기 스튜디오 — 긴 원고에서 찾기→바꾸기. 대소문자/온전한 단어/정규식 토글,
// 매치 하이라이트 미리보기·매치 개수, "모두 바꾸기" 전 결과 미리보기(원본/변경 비교),
// 결과 복사·프로젝트 추가. 원본은 절대 건드리지 않고(별도 보존), 바꾼 결과만 산출한다.
// 자족식: react 와 './linkbus' 외 import 없음. 100% 로컬(네트워크/키/외부 미디어 불필요).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag, Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'find-replace-studio',
  name: '찾기·바꾸기 스튜디오',
  icon: '🔎',
  group: '교정·언어',
  intro: '긴 원고에서 찾기·바꾸기 — 대소문자/온전한 단어/정규식, 매치 하이라이트와 미리보기, 모두 바꾸기 전 비교',
  w: 760,
  h: 680,
}

// ── 영속 ──────────────────────────────────────────────────────
const LS_KEY = 'sry:tool:find-replace-studio'

interface Preset {
  id: string
  name: string
  find: string
  repl: string
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}
interface Persisted {
  presets: Preset[]
}
function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return { presets: Array.isArray(p.presets) ? p.presets : [] }
    }
  } catch { /* noop */ }
  return { presets: [] }
}
function savePersisted(p: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)) } catch { /* 용량초과 무시 */ }
}
function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// ── 정규식 안전 빌더 ──────────────────────────────────────────
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface BuildResult { re: RegExp | null; error: string }
// 옵션에 맞는 전역 정규식 생성. 실패 시 error 메시지.
function buildRegex(find: string, opts: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }): BuildResult {
  if (find === '') return { re: null, error: '' }
  let pattern: string
  if (opts.regex) {
    pattern = find
  } else {
    pattern = escapeRegExp(find)
  }
  if (opts.wholeWord) {
    // 유니코드 단어 경계(한글 포함): 앞뒤가 단어문자가 아닐 때만. \b 는 한글에 부정확하므로 lookaround 사용.
    pattern = `(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`
  }
  let flags = 'gm'
  if (!opts.caseSensitive) flags += 'i'
  flags += 'u'
  try {
    return { re: new RegExp(pattern, flags), error: '' }
  } catch (e) {
    // 유니코드 모드에서 패턴이 유효하지 않으면 비유니코드로 폴백 시도
    try {
      return { re: new RegExp(pattern, flags.replace('u', '')), error: '' }
    } catch (e2) {
      const msg = (e2 instanceof Error ? e2.message : String(e2)) || (e instanceof Error ? e.message : String(e))
      return { re: null, error: '정규식 오류: ' + msg }
    }
  }
}

interface Match { start: number; end: number; text: string }
// 모든 매치 위치 수집(zero-length 매치는 무한루프 방지 처리).
function findAllMatches(text: string, re: RegExp | null, cap = 100000): Match[] {
  if (!re || text === '') return []
  const out: Match[] = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > cap) break
    const start = m.index
    const end = start + m[0].length
    out.push({ start, end, text: m[0] })
    if (m[0].length === 0) re.lastIndex = re.lastIndex + 1 // zero-length 전진
  }
  return out
}

// 치환 결과(미리보기에 쓸 세그먼트도 함께 생성). $1 등 그룹 참조 지원(정규식 모드).
interface ReplaceOutput {
  result: string
  count: number
  // 미리보기 세그먼트: 변경 전/후를 위치별로 비교하기 위한 조각들
  segments: { type: 'same' | 'del' | 'ins'; text: string }[]
}
function applyReplace(text: string, re: RegExp | null, repl: string, regexMode: boolean): ReplaceOutput {
  if (!re || text === '') return { result: text, count: 0, segments: text ? [{ type: 'same', text }] : [] }
  const matches = findAllMatches(text, re)
  if (matches.length === 0) return { result: text, count: 0, segments: [{ type: 'same', text }] }
  let result = ''
  const segs: ReplaceOutput['segments'] = []
  let cursor = 0
  for (const mt of matches) {
    if (mt.start > cursor) {
      const same = text.slice(cursor, mt.start)
      result += same
      segs.push({ type: 'same', text: same })
    }
    // 치환 텍스트 계산
    let replaced: string
    if (regexMode) {
      // 단일 매치에 대한 그룹참조 치환: 해당 조각만 다시 매치시켜 String.replace 활용
      const single = buildSingleReplace(mt.text, re, repl)
      replaced = single
    } else {
      replaced = repl
    }
    if (mt.text !== '') segs.push({ type: 'del', text: mt.text })
    if (replaced !== '') segs.push({ type: 'ins', text: replaced })
    result += replaced
    cursor = mt.end
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor)
    result += tail
    segs.push({ type: 'same', text: tail })
  }
  return { result, count: matches.length, segments: segs }
}
// 정규식 모드에서 한 매치 텍스트에 그룹참조($1 등)를 적용
function buildSingleReplace(matchText: string, re: RegExp, repl: string): string {
  try {
    const local = new RegExp(re.source, re.flags.replace('g', ''))
    return matchText.replace(local, repl)
  } catch {
    return repl
  }
}

// 하이라이트 미리보기용: 원본을 매치 기준으로 [일반|매치] 조각으로 분할
interface HiSeg { text: string; hit: boolean; idx: number }
function splitForHighlight(text: string, matches: Match[]): HiSeg[] {
  if (matches.length === 0) return text ? [{ text, hit: false, idx: -1 }] : []
  const segs: HiSeg[] = []
  let cursor = 0
  matches.forEach((mt, i) => {
    if (mt.start > cursor) segs.push({ text: text.slice(cursor, mt.start), hit: false, idx: -1 })
    segs.push({ text: text.slice(mt.start, mt.end), hit: true, idx: i })
    cursor = mt.end
  })
  if (cursor < text.length) segs.push({ text: text.slice(cursor), hit: false, idx: -1 })
  return segs
}

const SAMPLE = `봄이 왔다. 봄바람이 불었다. 그녀는 봄을 좋아했다.
"봄은 언제나 짧아." 그가 말했다. 봄의 끝에서 우리는 만났다.
The spring came. Spring is short. SPRING ends quickly.`

export default function FindReplaceStudio({ payload }: { payload?: Record<string, unknown> }) {
  // 원본(보존 대상) — 절대 in-place 수정하지 않는다.
  const [source, setSource] = useState<string>(typeof payload?.text === 'string' ? (payload.text as string) : '')
  const [find, setFind] = useState<string>(typeof payload?.find === 'string' ? (payload.find as string) : '')
  const [repl, setRepl] = useState<string>('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)

  const [view, setView] = useState<'highlight' | 'preview'>('highlight')
  const [committed, setCommitted] = useState<string | null>(null) // 모두 바꾸기를 확정한 결과(있으면 표시)
  const [committedCount, setCommittedCount] = useState(0)

  const [presets, setPresets] = useState<Preset[]>(() => loadPersisted().presets)
  const [presetName, setPresetName] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)
  const sourceRef = useRef<HTMLTextAreaElement | null>(null)

  // 언마운트 정리(타이머)
  useEffect(() => () => {
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
  }, [])

  // 프리셋 영속
  useEffect(() => { savePersisted({ presets }) }, [presets])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }, [])

  // 옵션이나 검색어가 바뀌면 확정 결과는 무효화(혼동 방지)
  useEffect(() => { setCommitted(null) }, [find, repl, caseSensitive, wholeWord, regex, source])

  const opts = useMemo(() => ({ caseSensitive, wholeWord, regex }), [caseSensitive, wholeWord, regex])
  const built = useMemo(() => buildRegex(find, opts), [find, opts])

  const matches = useMemo(() => {
    try { return findAllMatches(source, built.re) } catch { return [] }
  }, [source, built.re])

  const replaceOut = useMemo(() => {
    try { return applyReplace(source, built.re, repl, regex) } catch { return { result: source, count: 0, segments: [] as ReplaceOutput['segments'] } }
  }, [source, built.re, repl, regex])

  const highlightSegs = useMemo(() => splitForHighlight(source, matches), [source, matches])

  // 결과 텍스트(복사/추가에 쓰는 산출물): 확정된 게 있으면 그걸, 없으면 미리보기 치환결과
  const outputText = committed != null ? committed : replaceOut.result
  const outputCount = committed != null ? committedCount : replaceOut.count

  const hasSource = source.trim() !== ''
  const hasFind = find !== ''

  // ── 동작 ──
  const doReplaceAll = () => {
    if (!built.re || matches.length === 0) { flash('바꿀 매치가 없습니다'); return }
    setCommitted(replaceOut.result)
    setCommittedCount(replaceOut.count)
    setView('preview')
    flash(`${replaceOut.count}곳을 바꿨습니다 (원본은 그대로 보존됨)`)
  }
  // 확정 결과를 원본 입력란으로 끌어와 추가 작업(연쇄 치환) 가능 — 사용자가 명시적으로 선택
  const adoptResult = () => {
    if (committed == null) return
    setSource(committed)
    setCommitted(null)
    setView('highlight')
    flash('결과를 입력란으로 가져왔습니다')
  }
  const undoCommit = () => {
    setCommitted(null)
    flash('미리보기로 되돌렸습니다 (원본 유지)')
  }
  const clearAll = () => {
    setSource(''); setFind(''); setRepl(''); setCommitted(null); setView('highlight')
    sourceRef.current?.focus()
  }
  const swap = () => { setFind(repl); setRepl(find) }

  const copyText = (key: string, value: string) => {
    if (!value) return
    const done = () => {
      setCopied(key)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(null), 1400)
    }
    try {
      const p = navigator.clipboard?.writeText(value)
      if (p && typeof p.then === 'function') p.then(done).catch(() => {
        fallbackCopy(value); done()
      })
      else { if (!navigator.clipboard) fallbackCopy(value); done() }
    } catch { fallbackCopy(value); done() }
  }
  function fallbackCopy(value: string) {
    try {
      const ta = document.createElement('textarea')
      ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    } catch { /* noop */ }
  }

  // 프로젝트에 추가(결과 텍스트를 문서로)
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const addResultToProject = () => {
    if (!outputText.trim()) { flash('추가할 결과가 없습니다'); return }
    const paras = outputText.split(/\n/).map((ln) => `<p>${escapeHtml(ln) || '&nbsp;'}</p>`).join('')
    const title = `찾기·바꾸기 결과 (${outputCount}곳 변경)`
    const id = addToProject({ root: 'research', folder: '교정', title, bodyHtml: paras, meta: { 찾기: find, 바꾸기: repl, 변경수: String(outputCount) } })
    flash(id ? '프로젝트에 추가했습니다 📄' : '프로젝트 연결이 없습니다')
  }
  const stashResult = () => {
    if (!outputText.trim()) { flash('담을 결과가 없습니다'); return }
    addToStash({ kind: 'memo', label: `찾기·바꾸기 결과 (${outputCount}곳)`, text: outputText })
    flash('수집함에 담았습니다')
  }

  // 프리셋 CRUD
  const savePreset = () => {
    const name = presetName.trim() || (find ? `"${find.slice(0, 16)}" → "${repl.slice(0, 16)}"` : '무제 프리셋')
    const p: Preset = { id: uid('fr'), name, find, repl, caseSensitive, wholeWord, regex }
    setPresets((prev) => [p, ...prev])
    setPresetName('')
    flash('프리셋 저장됨')
  }
  const applyPreset = (p: Preset) => {
    setFind(p.find); setRepl(p.repl); setCaseSensitive(p.caseSensitive); setWholeWord(p.wholeWord); setRegex(p.regex)
    setShowPresets(false)
    flash(`프리셋 적용: ${p.name}`)
  }
  const deletePreset = (id: string) => setPresets((prev) => prev.filter((x) => x.id !== id))

  // 좌측 바인더 파일 드롭 → 원본으로
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (item?.text != null) {
      e.preventDefault()
      setSource(item.text)
      setCommitted(null)
      flash(`"${item.title}" 본문을 불러왔습니다`)
    }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const titleBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const titleTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)' }

  const frRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch' }
  const inputBox: React.CSSProperties = {
    boxSizing: 'border-box', width: '100%', background: 'var(--paper)', color: 'var(--text)',
    border: `1px solid ${built.error ? 'var(--warn, #d9534f)' : 'var(--border)'}`, borderRadius: 9, padding: '9px 11px',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }
  const replInput: React.CSSProperties = { ...inputBox, border: '1px solid var(--border)' }
  const fieldLabel: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginBottom: 3, fontWeight: 600, letterSpacing: '.02em' }
  const fieldCol: React.CSSProperties = { display: 'flex', flexDirection: 'column' }
  const swapBtn: React.CSSProperties = { alignSelf: 'flex-end', marginBottom: 1, padding: '8px 9px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--chrome-2, var(--panel))', color: 'var(--text)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }

  const optRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
  const toggle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2, var(--panel))',
    color: active ? 'var(--paper)' : 'var(--text)', fontWeight: active ? 700 : 500,
  })
  const countTag = (color: string): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 7, padding: '3px 9px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] })

  const taSource: React.CSSProperties = {
    minHeight: 96, maxHeight: 170, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'color-mix(in srgb, var(--accent) 12%, var(--paper))' : 'var(--paper)',
    color: 'var(--text)', border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '11px 13px', fontSize: 14.5, lineHeight: 1.65, outline: 'none', fontFamily: 'inherit',
  }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', userSelect: 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--paper)' : 'var(--text)', fontWeight: active ? 700 : 500,
  })
  const previewBox: React.CSSProperties = {
    flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const hiMark: React.CSSProperties = { background: 'color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--text)', borderRadius: 3, padding: '0 1px', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent)' }
  const delMark: React.CSSProperties = { background: 'color-mix(in srgb, var(--warn, #d9534f) 22%, transparent)', color: 'var(--muted)', textDecoration: 'line-through', borderRadius: 3, padding: '0 1px' }
  const insMark: React.CSSProperties = { background: 'color-mix(in srgb, var(--ok, #3c9a5f) 26%, transparent)', color: 'var(--text)', borderRadius: 3, padding: '0 1px', fontWeight: 600 }

  const actionRow: React.CSSProperties = { display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const errStyle: React.CSSProperties = { fontSize: 11.5, color: 'var(--warn, #d9534f)', minHeight: 14 }

  const sheet: React.CSSProperties = { position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--paper) 88%, transparent)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', padding: 16, gap: 10, zIndex: 5, boxSizing: 'border-box' }
  const presetCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }

  const matchCountColor = matches.length === 0 ? 'var(--muted)' : 'var(--accent)'

  return (
    <div style={wrap}>
      {/* 헤더 */}
      <div style={titleBar}>
        <div style={titleTxt}><Emoji e="🔎"/> 원본은 보존하고 바꾼 결과만 미리보기·복사·프로젝트 추가 (100% 로컬)</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="minibtn" type="button" onClick={() => setShowPresets(true)} title="저장한 찾기·바꾸기 프리셋"><Emoji e="⭐"/> 프리셋 {presets.length > 0 ? `(${presets.length})` : ''}</button>
        </div>
      </div>

      {/* 원본 입력 */}
      <textarea
        ref={sourceRef}
        style={taSource}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        placeholder="원고 텍스트를 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 본문을 불러옵니다. (원본은 보존됩니다)"
        spellCheck={false}
        aria-label="원본 텍스트"
      />

      {/* 찾기 / 바꾸기 */}
      <div style={frRow}>
        <div style={fieldCol}>
          <span style={fieldLabel}>찾기</span>
          <input
            style={inputBox}
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={regex ? '정규식 패턴 (예: 봄\\w*)' : '찾을 문자열'}
            spellCheck={false}
            aria-label="찾을 문자열"
          />
        </div>
        <button style={swapBtn} type="button" onClick={swap} title="찾기 ↔ 바꾸기 맞바꾸기" disabled={!find && !repl}>⇄</button>
        <div style={fieldCol}>
          <span style={fieldLabel}>바꾸기{regex ? ' ($1 그룹참조 가능)' : ''}</span>
          <input
            style={replInput}
            value={repl}
            onChange={(e) => setRepl(e.target.value)}
            placeholder={regex ? '치환 (예: $1님)' : '바꿀 문자열 (비우면 삭제)'}
            spellCheck={false}
            aria-label="바꿀 문자열"
          />
        </div>
      </div>

      {/* 옵션 토글 + 매치 수 */}
      <div style={optRow}>
        <span style={toggle(caseSensitive)} role="button" tabIndex={0} onClick={() => setCaseSensitive((v) => !v)} title="대소문자를 구분합니다">Aa 대소문자</span>
        <span style={toggle(wholeWord)} role="button" tabIndex={0} onClick={() => setWholeWord((v) => !v)} title="단어 전체가 일치할 때만(부분 일치 제외)">⟦단어⟧ 온전한 단어</span>
        <span style={toggle(regex)} role="button" tabIndex={0} onClick={() => setRegex((v) => !v)} title="정규식 패턴으로 검색합니다">.* 정규식</span>
        <span style={{ flex: 1 }} />
        {hasFind && !built.error && <span style={countTag(matchCountColor)}>매치 {matches.length}곳</span>}
      </div>
      <div style={errStyle}>{built.error}</div>

      {/* 미리보기 탭 */}
      <div style={tabRow}>
        <span style={tabBtn(view === 'highlight')} role="button" tabIndex={0} onClick={() => setView('highlight')}><Emoji e="🖍"/> 매치 하이라이트</span>
        <span style={tabBtn(view === 'preview')} role="button" tabIndex={0} onClick={() => setView('preview')}><Emoji e="👁"/> 바꾼 결과 미리보기</span>
        <span style={{ flex: 1 }} />
        {committed != null && <span style={countTag('var(--ok, #3c9a5f)')}>✓ 확정됨 {committedCount}곳</span>}
      </div>

      {/* 미리보기 본문 */}
      {!hasSource ? (
        <div style={emptyBox}>
          <div style={{ fontSize: 30 }}><Emoji e="📝"/></div>
          <div>원고를 붙여넣고 찾기·바꾸기를 입력하면<br />매치가 하이라이트되고, 바꾼 결과를 미리 볼 수 있습니다.</div>
          <div style={hint}>모두 바꾸기를 눌러도 위 입력란의 <b>원본은 그대로 보존</b>됩니다.</div>
          <button className="minibtn" type="button" onClick={() => setSource(SAMPLE)}>예시 넣기</button>
        </div>
      ) : view === 'highlight' ? (
        <div style={previewBox} aria-label="매치 하이라이트 미리보기">
          {!hasFind ? (
            <span style={{ color: 'var(--muted)' }}>{source}</span>
          ) : built.error ? (
            <span style={{ color: 'var(--muted)' }}>정규식을 수정하면 하이라이트가 표시됩니다.</span>
          ) : matches.length === 0 ? (
            <span style={{ color: 'var(--muted)' }}>일치하는 곳이 없습니다.<br /><br />{source}</span>
          ) : (
            highlightSegs.map((s, i) => s.hit
              ? <mark key={i} style={hiMark} title={`매치 ${s.idx + 1}`}>{s.text}</mark>
              : <span key={i}>{s.text}</span>)
          )}
        </div>
      ) : (
        <div style={previewBox} aria-label="바꾼 결과 미리보기">
          {!hasFind || built.error ? (
            <span style={{ color: 'var(--muted)' }}>{committed != null ? committed : source}</span>
          ) : replaceOut.count === 0 && committed == null ? (
            <span style={{ color: 'var(--muted)' }}>바꿀 매치가 없습니다.<br /><br />{source}</span>
          ) : committed != null ? (
            // 확정 결과는 깔끔한 결과 텍스트만
            <span>{committed}</span>
          ) : (
            // 변경 전/후 비교(삭제=취소선, 삽입=강조)
            replaceOut.segments.map((s, i) => {
              if (s.type === 'same') return <span key={i}>{s.text}</span>
              if (s.type === 'del') return <span key={i} style={delMark} title="삭제될 부분">{s.text}</span>
              return <span key={i} style={insMark} title="삽입될 부분">{s.text}</span>
            })
          )}
        </div>
      )}

      {/* 액션 */}
      <div style={actionRow}>
        {committed == null ? (
          <button className="btn-primary" type="button" onClick={doReplaceAll} disabled={!hasFind || !!built.error || matches.length === 0}>
            모두 바꾸기 ({matches.length}곳)
          </button>
        ) : (
          <>
            <button className="btn-primary" type="button" onClick={adoptResult} title="확정 결과를 입력란으로 가져와 이어서 작업">↥ 결과를 입력란으로</button>
            <button className="minibtn" type="button" onClick={undoCommit}>↩ 되돌리기(미리보기)</button>
          </>
        )}
        <input
          style={{ ...replInput, flex: '0 0 auto', width: 130, padding: '6px 9px', fontSize: 12 }}
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="프리셋 이름(선택)"
          aria-label="프리셋 이름"
        />
        <button className="minibtn" type="button" onClick={savePreset} disabled={!hasFind} title="현재 찾기·바꾸기·옵션을 저장"><Emoji e="⭐"/> 프리셋 저장</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" type="button" onClick={() => copyText('out', outputText)} disabled={!outputText} title="결과 텍스트 복사">
          {copied === 'out' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 결과 복사</>}
        </button>
        {hasProjectBridge() && (
          <button className="linkbtn" type="button" onClick={addResultToProject} disabled={!outputText.trim()} title="바꾼 결과를 프로젝트 문서로 추가"><Emoji e="📄"/> 프로젝트에 추가</button>
        )}
        {hasStash() && (
          <button className="minibtn" type="button" onClick={stashResult} disabled={!outputText.trim()} title="결과를 수집함에 담기"><Emoji e="🧺"/> 수집함</button>
        )}
        <button className="minibtn" type="button" onClick={clearAll} disabled={!source && !find && !repl}>↺ 비우기</button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 8, whiteSpace: 'nowrap' }}>
          {emojify(toast)}
        </div>
      )}

      {/* 프리셋 시트 */}
      {showPresets && (
        <div style={sheet}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ fontSize: 14 }}><Emoji e="⭐"/> 저장한 프리셋</b>
            <button className="minibtn" type="button" onClick={() => setShowPresets(false)}>닫기 ✕</button>
          </div>
          {presets.length === 0 ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 28 }}><Emoji e="📭"/></div>
              <div>저장한 프리셋이 없습니다.</div>
              <div style={hint}>자주 쓰는 찾기·바꾸기(예: 두 칸 공백→한 칸)를 저장해 두면 한 번에 불러옵니다.</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {presets.map((p) => (
                <div key={p.id} style={presetCard}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{p.find}" → "{p.repl}"
                      {p.caseSensitive ? ' · Aa' : ''}{p.wholeWord ? ' · 단어' : ''}{p.regex ? ' · 정규식' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="minibtn" type="button" onClick={() => applyPreset(p)}>적용</button>
                    <button className="minibtn" type="button" onClick={() => deletePreset(p.id)} title="삭제"><Emoji e="🗑"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
