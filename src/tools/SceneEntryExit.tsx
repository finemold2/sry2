// 장면 진입·퇴장 (scene-entry-exit) — "늦게 들어가 일찍 나오기(Enter late, leave early)" 원칙으로
// 장면의 군더더기 진입부/퇴장부를 진단·제안한다. 한 장면을 줄 단위로 쪼개, 각 줄이
//   · 진입부(도입/세팅/이동/정리 같은 워밍업)인지
//   · 본론(갈등·결정·전환점 같은 핵심 동력)인지
//   · 퇴장부(마무리/여운/정리 같은 식어버린 꼬리)인지
// 를 결정론적 휴리스틱으로 점수화하고, "여기부터 시작 / 여기서 끝" 권장 구간을 제시한다.
// 절단 시 잘려나갈 분량·핵심 보존 여부를 시뮬레이션하고, 다듬은 장면을 만들어 준다.
//
// 자급식: react·linkbus 외 import 없음. 전부 브라우저 로컬 계산(외부 네트워크 없음).
// localStorage 'sry:tool:scene-entry-exit' 에 입력/상태 자동 저장·복원.
// 연계(linkbus):
//   · payload.text / 좌측 바인더 문서 드롭(getDragItem) / 스니펫 라이브러리에서 본문 수용
//   · addToProject 로 다듬은 장면을 원고('draft')/'장면' 폴더에 문서 추가
//   · addToStash 로 진단 메모를 수집함에 담기
//   · addToLibrary('snippets', …) 로 다듬은 장면을 스니펫으로 저장
//   · openToolLinked('scene-list'|'scene-sequel'|…) 로 관련 도구를 데이터와 함께 열기
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToLibrary, addToProject, addToStash, getDragItem, hasProjectBridge, hasStash,
  isItemDrag, openToolLinked, useLibraryList,
} from './linkbus'

export const meta = {
  id: 'scene-entry-exit',
  name: '장면 진입·퇴장',
  icon: '🚪',
  group: '구조',
  intro: '"늦게 들어가 일찍 나오기" 원칙으로 장면의 군더더기 진입/퇴장을 진단하고 시작·끝 지점을 제안합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:scene-entry-exit'

// ───────────────────────── 휴리스틱 사전 ─────────────────────────
// 결정론적: 같은 입력 → 같은 진단. 한국어 글쓰기 맥락의 신호어 묶음.

// 진입부(워밍업) 신호: 시간·장소 세팅, 도착/이동, 일상 묘사, 준비 동작
const ENTRY_SIGNALS: { re: RegExp; w: number; tag: string }[] = [
  { re: /(아침|새벽|저녁|밤|오후|오전|정오|한낮|해질|동틀|날이\s*밝)/, w: 2, tag: '시간 세팅' },
  { re: /(눈을\s*떴|잠에서\s*깼|일어났|기지개|이불|침대에서)/, w: 3, tag: '기상 도입' },
  { re: /(도착했|들어섰|들어왔|문을\s*열고|걸어\s*들어|당도|향했|걸음을\s*옮)/, w: 2, tag: '이동/도착' },
  { re: /(여느\s*때|늘\s*그랬|평소처럼|언제나처럼|매일|일상)/, w: 3, tag: '일상 묘사' },
  { re: /(날씨|하늘|구름|바람이\s*불|햇살|풍경이)/, w: 1, tag: '배경 묘사' },
  { re: /(준비했|챙겼|옷을\s*입|신발을|가방을|채비)/, w: 2, tag: '준비 동작' },
  { re: /(\b그날은\b|\b그날\b|이야기는|시작은|먼저)/, w: 1, tag: '도입 어구' },
]

// 본론(핵심) 신호: 갈등·결정·발견·전환·감정 고조·대사
const CORE_SIGNALS: { re: RegExp; w: number; tag: string }[] = [
  { re: /(하지만|그러나|그런데|그때|갑자기|순간|돌연|문득)/, w: 3, tag: '전환' },
  { re: /(소리쳤|외쳤|쏘아붙|따졌|반박|대들|노려|쏘아보)/, w: 3, tag: '대립' },
  { re: /(결심했|결정했|마음을\s*먹|선택했|각오|다짐)/, w: 4, tag: '결정' },
  { re: /(깨달았|알아챘|발견했|들켰|드러났|밝혀|폭로)/, w: 4, tag: '발견/폭로' },
  { re: /(왜|어떻게|정말|진짜|설마|도대체|어째서)\s*[^.?!]*\?/, w: 2, tag: '질문/추궁' },
  { re: /["“'][^"”']{2,}["”']/, w: 2, tag: '대사' },
  { re: /(피가|심장이|숨이\s*막|손이\s*떨|온몸이|식은땀|소름)/, w: 2, tag: '신체 반응' },
  { re: /(죽|죽음|배신|위협|칼|총|불길|비명|쓰러)/, w: 3, tag: '위기' },
]

// 퇴장부(식은 꼬리) 신호: 마무리·정리·여운·시간 경과·다음으로 넘어감
const EXIT_SIGNALS: { re: RegExp; w: number; tag: string }[] = [
  { re: /(그렇게\s*해서|그리하여|결국|마침내|그 후|이후로|그날\s*이후)/, w: 3, tag: '결말 정리' },
  { re: /(돌아왔|돌아갔|집으로|방으로|자리로|발길을\s*돌)/, w: 2, tag: '귀가/퇴장' },
  { re: /(잠이\s*들|눈을\s*감|불을\s*껐|하루가\s*저물|잠자리)/, w: 3, tag: '하루 마무리' },
  { re: /(생각했다|되뇌었|곱씹|되새|곰곰이|머릿속에)/, w: 1, tag: '내적 정리' },
  { re: /(시간이\s*흘|며칠이|얼마\s*후|다음\s*날|이튿날|한참)/, w: 2, tag: '시간 경과' },
  { re: /(한숨을\s*쉬|어깨를\s*늘어|털어놓|마음이\s*놓|안도)/, w: 2, tag: '긴장 해소' },
  { re: /(여운|아련|희미|점점\s*멀어|사라져\s*갔)/, w: 1, tag: '여운' },
]

interface LineScore {
  idx: number
  text: string
  entry: number
  core: number
  exit: number
  entryTags: string[]
  coreTags: string[]
  exitTags: string[]
  blank: boolean
}

interface Analysis {
  lines: LineScore[]
  startIdx: number       // 권장 시작 줄(이 줄부터 살림)
  endIdx: number         // 권장 끝 줄(이 줄까지 살림, 포함)
  coreFirst: number      // 첫 본론 줄
  coreLast: number       // 마지막 본론 줄
  entryCut: number       // 잘려나갈 진입부 줄 수
  exitCut: number        // 잘려나갈 퇴장부 줄 수
  entryChars: number     // 잘려나갈 진입부 글자수
  exitChars: number
  totalChars: number
  hasCore: boolean
}

function str(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v) }

// HTML 인 본문에서 텍스트만 추출(드롭/payload 가 HTML 일 수 있음).
function htmlToText(s: string): string {
  if (!/[<&]/.test(s)) return s
  let t = s
  t = t.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  t = t.replace(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
  t = t.replace(/<[^>]+>/g, '')
  t = t.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
  return t
}

function scoreSignals(line: string, table: { re: RegExp; w: number; tag: string }[]): { score: number; tags: string[] } {
  let score = 0
  const tags: string[] = []
  for (const s of table) {
    if (s.re.test(line)) { score += s.w; if (tags.length < 3 && !tags.includes(s.tag)) tags.push(s.tag) }
  }
  return { score, tags }
}

// 줄 길이에 따른 약한 가중: 아주 짧은 줄은 본론 동력이 낮다고 본다(결정론적).
function analyze(text: string): Analysis {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n')
  const lines: LineScore[] = rawLines.map((t, i) => {
    const trimmed = t.trim()
    const blank = trimmed.length === 0
    const e = scoreSignals(trimmed, ENTRY_SIGNALS)
    const c = scoreSignals(trimmed, CORE_SIGNALS)
    const x = scoreSignals(trimmed, EXIT_SIGNALS)
    return { idx: i, text: t, entry: e.score, core: c.score, exit: x.score, entryTags: e.tags, coreTags: c.tags, exitTags: x.tags, blank }
  })

  const contentIdx = lines.filter((l) => !l.blank).map((l) => l.idx)
  const totalChars = lines.reduce((a, l) => a + l.text.trim().length, 0)

  if (contentIdx.length === 0) {
    return { lines, startIdx: 0, endIdx: rawLines.length - 1, coreFirst: -1, coreLast: -1, entryCut: 0, exitCut: 0, entryChars: 0, exitChars: 0, totalChars, hasCore: false }
  }

  // 본론 줄: core 점수가 우세하고 0 이상인 줄.
  const isCore = (l: LineScore) => l.core > 0 && l.core >= l.entry && l.core >= l.exit
  const coreLines = lines.filter((l) => !l.blank && isCore(l))
  const hasCore = coreLines.length > 0

  let coreFirst = -1, coreLast = -1
  if (hasCore) { coreFirst = coreLines[0].idx; coreLast = coreLines[coreLines.length - 1].idx }

  // 권장 시작: 첫 본론 직전까지의 "연속 진입부"를 잘라낸다.
  // 앞에서부터, 본론이 시작되기 전이면서 (진입 신호가 본론보다 강한) 줄을 건너뛴다.
  let startIdx = contentIdx[0]
  if (hasCore) {
    for (const i of contentIdx) {
      if (i >= coreFirst) break
      const l = lines[i]
      const looksEntry = l.entry >= l.core && (l.entry > 0 || l.core === 0)
      if (looksEntry) startIdx = nextContent(lines, i, contentIdx)
      else break
    }
    if (startIdx > coreFirst || startIdx < 0) startIdx = coreFirst
  }

  // 권장 끝: 마지막 본론 이후의 "연속 퇴장부"를 잘라낸다.
  let endIdx = contentIdx[contentIdx.length - 1]
  if (hasCore) {
    for (let k = contentIdx.length - 1; k >= 0; k--) {
      const i = contentIdx[k]
      if (i <= coreLast) break
      const l = lines[i]
      const looksExit = l.exit >= l.core && (l.exit > 0 || l.core === 0)
      if (looksExit) endIdx = prevContent(lines, i, contentIdx)
      else break
    }
    if (endIdx < coreLast || endIdx < 0) endIdx = coreLast
  }

  if (startIdx < 0) startIdx = contentIdx[0]
  if (endIdx < 0) endIdx = contentIdx[contentIdx.length - 1]
  if (endIdx < startIdx) endIdx = startIdx

  // 절단 시뮬레이션: 시작 이전·끝 이후의 내용 줄 수/글자수.
  let entryCut = 0, exitCut = 0, entryChars = 0, exitChars = 0
  for (const i of contentIdx) {
    if (i < startIdx) { entryCut++; entryChars += lines[i].text.trim().length }
    else if (i > endIdx) { exitCut++; exitChars += lines[i].text.trim().length }
  }

  return { lines, startIdx, endIdx, coreFirst, coreLast, entryCut, exitCut, entryChars, exitChars, totalChars, hasCore }
}

function nextContent(lines: LineScore[], from: number, contentIdx: number[]): number {
  for (const i of contentIdx) if (i > from) return i
  return lines.length - 1
}
function prevContent(lines: LineScore[], from: number, contentIdx: number[]): number {
  for (let k = contentIdx.length - 1; k >= 0; k--) if (contentIdx[k] < from) return contentIdx[k]
  return 0
}

// 다듬은(trim 된) 장면 텍스트.
function trimmedScene(a: Analysis): string {
  return a.lines.filter((l) => l.idx >= a.startIdx && l.idx <= a.endIdx).map((l) => l.text).join('\n').replace(/^\n+|\n+$/g, '')
}
function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function trimmedHtml(a: Analysis): string {
  const t = trimmedScene(a)
  return t.split('\n').map((ln) => (ln.trim() ? `<p>${escHtml(ln)}</p>` : '<p><br></p>')).join('')
}

// 진단 점수(0~100): 본론 대비 군더더기 비율. 높을수록 군더더기 적음.
function tightness(a: Analysis): number {
  if (a.totalChars === 0) return 0
  const cut = a.entryChars + a.exitChars
  return Math.max(0, Math.min(100, Math.round((1 - cut / Math.max(1, a.totalChars)) * 100)))
}

interface SavedState { text: string }
function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) { const p = JSON.parse(raw); return { text: str(p?.text) } }
  } catch { /* noop */ }
  return { text: '' }
}

export default function SceneEntryExit({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState<string>(() => loadState().text)
  const [flash, setFlash] = useState('')
  const [showSource, setShowSource] = useState<'preview' | 'trimmed'>('preview')
  const [dropOn, setDropOn] = useState(false)
  const mounted = useRef(true)
  const flashNonce = useRef(0)
  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.text 수용(연계 진입). 1회.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const incoming = htmlToText(str(payload.text) || str(payload.body) || str(payload.bodyHtml))
    if (incoming.trim() && mounted.current) setText(incoming)
  }, [payload])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text })) }
    catch { /* 용량/차단 무시 */ }
  }, [text])

  const showFlash = (msg: string) => {
    setFlash(msg)
    const n = ++flashNonce.current
    window.setTimeout(() => { if (mounted.current && flashNonce.current === n) setFlash('') }, 2000)
  }

  const analysis = useMemo(() => analyze(text), [text])
  const hasText = text.trim().length > 0
  const tight = tightness(analysis)

  // ── 드롭(바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropOn(false)
    const item = getDragItem(e)
    if (item && (item.text || '').trim()) { setText(htmlToText(item.text || '')); showFlash(`'${item.title}' 본문을 불러왔어요`); return }
    let plain = ''
    try { plain = e.dataTransfer.getData('text/plain') } catch { /* noop */ }
    if (plain.trim()) { setText(htmlToText(plain)); showFlash('드롭한 텍스트를 불러왔어요') }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) {
      e.preventDefault(); if (!dropOn) setDropOn(true)
    }
  }

  const copyText = (t: string, label = '복사됨') => {
    const done = () => showFlash(label)
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done))
      else fallbackCopy(t, done)
    } catch { fallbackCopy(t, done) }
  }
  const fallbackCopy = (t: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { showFlash('복사 실패') }
  }

  // 진단 리포트 텍스트.
  const reportText = (): string => {
    const a = analysis
    const L: string[] = ['[장면 진입·퇴장 진단 — 늦게 들어가 일찍 나오기]']
    L.push(`타이트함 점수: ${tight}/100`)
    if (!a.hasCore) { L.push('핵심(갈등·결정·전환) 신호를 찾지 못했습니다. 장면의 동력을 분명히 해 보세요.'); return L.join('\n') }
    L.push(`권장 시작: ${a.startIdx + 1}번째 줄  /  권장 끝: ${a.endIdx + 1}번째 줄`)
    if (a.entryCut > 0) L.push(`잘라낼 진입부: ${a.entryCut}줄 / 약 ${a.entryChars}자 — 본론 전 워밍업`)
    else L.push('진입부: 이미 본론에 가깝게 시작합니다.')
    if (a.exitCut > 0) L.push(`잘라낼 퇴장부: ${a.exitCut}줄 / 약 ${a.exitChars}자 — 본론 후 식은 꼬리`)
    else L.push('퇴장부: 이미 본론 가까이에서 끝납니다.')
    return L.join('\n')
  }

  const applyTrim = () => {
    const t = trimmedScene(analysis)
    if (!t.trim()) { showFlash('다듬을 본문이 없어요'); return }
    setText(t)
    showFlash('권장 구간으로 다듬었어요')
  }

  const toProject = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되지 않았습니다'); return }
    const t = trimmedScene(analysis)
    if (!t.trim()) { showFlash('내보낼 본문이 없어요'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: '다듬은 장면 — 진입·퇴장',
      bodyHtml: trimmedHtml(analysis),
      synopsis: `타이트함 ${tight}/100 · 진입 -${analysis.entryCut}줄 · 퇴장 -${analysis.exitCut}줄`,
      meta: { 타이트함: `${tight}/100`, 진입절단: `${analysis.entryCut}줄`, 퇴장절단: `${analysis.exitCut}줄` },
    })
    showFlash(id ? '프로젝트 원고(장면 폴더)에 추가됨' : '프로젝트 추가 실패')
  }

  const toStash = () => {
    if (!hasStash()) { showFlash('수집함이 없습니다'); return }
    addToStash({ kind: 'memo', label: '장면 진입·퇴장 진단', text: reportText() })
    showFlash('수집함에 진단 메모를 담았어요')
  }

  const toSnippet = () => {
    const t = trimmedScene(analysis)
    if (!t.trim()) { showFlash('저장할 본문이 없어요'); return }
    addToLibrary('snippets', { text: t, source: '장면 진입·퇴장(다듬음)', tags: ['장면', '다듬음'] })
    showFlash('스니펫 라이브러리에 저장했어요')
  }

  const loadSnippet = (sText: string) => { setText(htmlToText(sText)); showFlash('스니펫을 불러왔어요') }

  const openRelated = (id: string) => {
    openToolLinked(id, { text: trimmedScene(analysis) || text })
    showFlash('관련 도구를 열었어요')
  }

  // ───────────────────────── styles ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const bodyArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const ta: React.CSSProperties = { width: '100%', minHeight: 120, padding: '9px 11px', fontSize: 13, lineHeight: 1.6, borderRadius: 9, border: '1px solid ' + (dropOn ? 'var(--accent)' : 'var(--border)'), outline: dropOn ? '2px dashed var(--accent)' : 'none', background: 'var(--panel)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }
  const cardS: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--panel)' }
  const labelS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }

  return (
    <div style={wrap}>
      <div style={header}>
        <strong style={{ fontSize: 14 }}>장면 진입·퇴장</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>늦게 들어가 일찍 나오기</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => { setText(''); showFlash('비웠어요') }} disabled={!hasText} title="입력 비우기">지우기</button>
      </div>

      <div style={bodyArea}>
        {/* 입력 */}
        <div>
          <div style={labelS}>장면 본문 (줄 단위로 분석합니다 · 좌측 바인더 문서를 끌어다 놓아도 됩니다)</div>
          <textarea
            style={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDropOn(false)}
            placeholder={'장면을 한 단락씩 줄바꿈으로 붙여 넣으세요.\n예)\n아침 햇살에 눈을 떴다. 여느 때처럼 커피를 내리고 창밖을 봤다.\n그때 문이 벌컥 열리며 그가 소리쳤다. "당장 나와!"\n나는 결심했다. 도망치지 않기로.\n그렇게 해서 긴 하루가 끝났다. 나는 침대에 누워 천장을 봤다.'}
          />
          {!hasText && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.7 }}>
              빈 입력입니다. 본문을 붙여넣거나, 바인더 문서를 끌어다 놓거나, 아래 스니펫에서 불러오세요.
            </div>
          )}
        </div>

        {/* 스니펫 라이브러리 수용 */}
        {!hasText && snippets.length > 0 && (
          <div style={cardS}>
            <div style={labelS}>스니펫에서 불러오기</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
              {snippets.slice(0, 12).map((s) => (
                <button key={s.id} className="minibtn" style={{ textAlign: 'left', justifyContent: 'flex-start', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => loadSnippet(s.text)} title={s.text}>
                  {s.text.trim().slice(0, 48) || '(빈 스니펫)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 진단 요약 */}
        {hasText && (
          <div style={cardS}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>타이트함</div>
              <ScoreBar value={tight} />
              <div style={{ fontSize: 15, fontWeight: 700, minWidth: 54, textAlign: 'right' }}>{tight}<span style={{ fontSize: 11, color: 'var(--muted)' }}>/100</span></div>
            </div>
            {analysis.hasCore ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <Stat label="권장 시작" main={`${analysis.startIdx + 1}번째 줄`} sub={analysis.entryCut > 0 ? `진입부 ${analysis.entryCut}줄 절단` : '바로 본론'} warn={analysis.entryCut > 0} />
                <Stat label="권장 끝" main={`${analysis.endIdx + 1}번째 줄`} sub={analysis.exitCut > 0 ? `퇴장부 ${analysis.exitCut}줄 절단` : '본론에서 마무리'} warn={analysis.exitCut > 0} />
                <Stat label="줄여낼 분량" main={`약 ${analysis.entryChars + analysis.exitChars}자`} sub={`전체 ${analysis.totalChars}자 중`} warn={analysis.entryChars + analysis.exitChars > 0} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.7 }}>
                핵심 동력(갈등·결정·발견·전환) 신호를 찾지 못했습니다. 이 장면이 무엇을 향해 움직이는지 한 문장이라도 분명히 드러내 보세요. 그래야 어디서 들어가고 나올지가 정해집니다.
              </div>
            )}
            {analysis.hasCore && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 9, lineHeight: 1.7 }}>
                핵심 구간은 {analysis.coreFirst + 1}~{analysis.coreLast + 1}번째 줄로 추정됩니다. 진입부는 본론 직전까지, 퇴장부는 본론 직후부터 군더더기로 봅니다.
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <button className="btn-primary" onClick={applyTrim} disabled={!analysis.hasCore || (analysis.entryCut === 0 && analysis.exitCut === 0)} title="권장 시작·끝 구간만 남기고 다듬습니다">권장 구간으로 다듬기</button>
              <button className="minibtn" onClick={() => copyText(trimmedScene(analysis), '다듬은 본문 복사됨')} disabled={!analysis.hasCore}>다듬은 본문 복사</button>
              <button className="minibtn" onClick={() => copyText(reportText(), '진단 복사됨')}>진단 복사</button>
            </div>
          </div>
        )}

        {/* 줄별 진단 / 다듬은 미리보기 */}
        {hasText && (
          <div style={cardS}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <button className="minibtn" style={tabStyle(showSource === 'preview')} onClick={() => setShowSource('preview')}>줄별 진단</button>
              <button className="minibtn" style={tabStyle(showSource === 'trimmed')} onClick={() => setShowSource('trimmed')}>다듬은 미리보기</button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>진입 / 본론 / 퇴장</span>
            </div>

            {showSource === 'preview' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' }}>
                {analysis.lines.filter((l) => !l.blank).length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>내용 줄이 없습니다.</div>
                )}
                {analysis.lines.map((l) => {
                  if (l.blank) return null
                  const kept = analysis.hasCore && l.idx >= analysis.startIdx && l.idx <= analysis.endIdx
                  const kind = lineKind(l, analysis)
                  return (
                    <div key={l.idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: kept ? 1 : 0.5, padding: '4px 6px', borderRadius: 7, background: kept ? 'transparent' : 'var(--chrome-2)', borderLeft: '3px solid ' + kindColor(kind) }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', minWidth: 22, textAlign: 'right', flexShrink: 0, marginTop: 2 }}>{l.idx + 1}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.55, wordBreak: 'break-word', textDecoration: kept ? 'none' : 'line-through' }}>{l.text.trim()}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3, alignItems: 'center' }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: kindColor(kind) }}>{kindLabel(kind)}</span>
                          {[...l.entryTags, ...l.coreTags, ...l.exitTags].slice(0, 4).map((t, i) => (
                            <span key={i} style={{ fontSize: 9.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px' }}>{t}</span>
                          ))}
                          {!kept && <span style={{ fontSize: 9.5, color: 'var(--warn)' }}>· 절단 제안</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflowY: 'auto', padding: '6px 8px', borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--border)' }}>
                  {trimmedScene(analysis) || <span style={{ color: 'var(--muted)' }}>(다듬을 본문이 없습니다)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  원본 {analysis.totalChars}자 → 다듬은 본문 {trimmedScene(analysis).replace(/\s/g, '').length}자 (공백 제외 추정)
                </div>
              </div>
            )}
          </div>
        )}

        {/* 연계 */}
        {hasText && (
          <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '다듬은 장면을 원고(장면 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
            <button className="linkbtn" onClick={toSnippet} title="다듬은 장면을 스니펫 라이브러리에 저장">스니펫 저장</button>
            <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '진단 메모를 수집함에 담기' : '수집함이 없습니다'}>수집함에 담기</button>
            <button className="linkbtn" onClick={() => openRelated('scene-list')} title="장면 목록 도구를 다듬은 본문과 함께 열기">장면 목록 열기</button>
            <button className="linkbtn" onClick={() => openRelated('scene-sequel')} title="장면-시퀄 빌더를 본문과 함께 열기">장면-시퀄 열기</button>
            <button className="linkbtn" onClick={() => openRelated('plot-pyramid')} title="플롯 피라미드를 본문과 함께 열기">플롯 피라미드 열기</button>
          </div>
        )}

        <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          원칙 출처: "Enter the scene late, leave early"(William Goldman 등 시나리오 작법에서 널리 통용). 본 도구는 줄별 신호어 기반의 결정론적 휴리스틱으로 진입/퇴장 후보를 제안할 뿐, 최종 판단은 작가의 몫입니다. 모든 계산은 브라우저 안에서만 이뤄집니다.
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 보조 컴포넌트 ─────────────────────────
type Kind = 'entry' | 'core' | 'exit' | 'neutral'
function lineKind(l: LineScore, a: Analysis): Kind {
  if (a.hasCore && l.idx >= a.coreFirst && l.idx <= a.coreLast && l.core >= l.entry && l.core >= l.exit && l.core > 0) return 'core'
  if (l.core > 0 && l.core >= l.entry && l.core >= l.exit) return 'core'
  if (l.entry > l.exit && l.entry > 0) return 'entry'
  if (l.exit > l.entry && l.exit > 0) return 'exit'
  if (l.entry > 0) return 'entry'
  if (l.exit > 0) return 'exit'
  return 'neutral'
}
function kindColor(k: Kind): string {
  if (k === 'core') return 'var(--ok)'
  if (k === 'entry') return 'var(--accent)'
  if (k === 'exit') return 'var(--warn)'
  return 'var(--border)'
}
function kindLabel(k: Kind): string {
  if (k === 'core') return '본론'
  if (k === 'entry') return '진입부'
  if (k === 'exit') return '퇴장부'
  return '중립'
}

function tabStyle(active: boolean): React.CSSProperties {
  return { borderColor: active ? 'var(--accent)' : 'var(--border)', color: active ? 'var(--accent)' : 'var(--text)', fontWeight: active ? 700 : 500 }
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 75 ? 'var(--ok)' : value >= 45 ? 'var(--accent)' : 'var(--warn)'
  return (
    <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ width: `${Math.max(2, value)}%`, height: '100%', background: color, transition: 'width .25s' }} />
    </div>
  )
}

function Stat({ label, main, sub, warn }: { label: string; main: string; sub: string; warn?: boolean }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--paper)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{main}</div>
      <div style={{ fontSize: 10.5, color: warn ? 'var(--warn)' : 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}
