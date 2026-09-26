// 독자 주의 시뮬레이터 — 휴리스틱으로 독자가 문단별로 스킴(건너읽기)/이탈할 위험을 예측한다.
//  · 문단 길이(너무 길면 눈이 미끄러짐)
//  · 정보 밀도(고유 토큰 비율·긴 단어 비율 — 너무 빽빽하면 부담)
//  · 반복(직전 문단과의 어휘 중복·문단 내 단어 반복 — 지루함)
//  · 대사 비율(따옴표 구간이 많으면 가독성↑, 주의 회복)
//  · 문장 길이 편차(전부 비슷하면 단조로움)
// 위 신호를 0~100 '이탈 위험' 점수로 합성하고, 독자의 '주의 에너지'를 문단을 따라 시뮬레이션해
// 어디서 떨어지는지 곡선으로 그린다. 전부 브라우저 로컬 계산. react 와 ./linkbus 외 import 없음.
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
} from './linkbus'

export const meta = {
  id: 'attention-simulator',
  name: '독자 주의 시뮬레이터',
  icon: '👁️',
  group: '구조',
  intro: '문단 길이·정보 밀도·반복·대사 비율을 휴리스틱으로 분석해 독자가 건너읽거나 이탈할 구간을 예측·하이라이트합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:attention-simulator'

// ── 문자열 해시(결정론적 의사난수 시드용) ──────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ── 토큰화: 한글/영문/숫자 단어만 추출(소문자화) ──────────────────────
function tokenize(s: string): string[] {
  const m = s.toLowerCase().match(/[가-힣]+|[a-z]+|[0-9]+/g)
  return m || []
}

// 공백 제외 글자수
function visLen(s: string): number {
  return s.replace(/\s+/g, '').length
}

// 따옴표 구간(대사) 길이 측정 — 곧은/둥근 따옴표·낫표 지원
const QUOTE_OPEN: Record<string, string> = { '“': '”', '‘': '’', '「': '」', '『': '』', '"': '"', "'": "'" }
function dialogueChars(s: string): number {
  const chars = [...s]
  let total = 0
  let i = 0
  while (i < chars.length) {
    const close = QUOTE_OPEN[chars[i]]
    if (close) {
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        if (chars[j] === close) { closed = true; break }
        if (chars[j] === '\n' && chars[j + 1] === '\n') break
        inner += chars[j]
        j++
      }
      if (closed) { total += visLen(inner); i = j + 1; continue }
    }
    i++
  }
  return total
}

// 문장 분리(문단 내)
function splitSentences(s: string): string[] {
  return s.split(/(?<=[.!?。！？…]+)\s+/).map((x) => x.trim()).filter(Boolean)
}

// ── 문단별 분석 결과 ─────────────────────────────────────────────────
interface ParaSignals {
  idx: number
  text: string
  chars: number            // 공백 제외 글자수
  lengthRisk: number       // 0~1
  densityRisk: number      // 0~1 (정보 밀도가 높을수록↑)
  repeatRisk: number       // 0~1 (반복/단조)
  monotonyRisk: number     // 0~1 (문장 길이 단조)
  dialogueRelief: number   // 0~1 (대사 비율 — 위험을 낮춤)
  risk: number             // 0~100 종합 이탈 위험
  energy: number           // 0~100 시뮬레이션된 독자 주의 에너지(문단 끝 시점)
  topRepeatWord?: string   // 가장 많이 반복된 단어
  topRepeatCount?: number
}

interface Analysis {
  paras: ParaSignals[]
  avgRisk: number
  worst: ParaSignals | null
  minEnergy: number
  dropParaIdx: number      // 에너지가 임계 아래로 처음 떨어진 문단(-1: 없음)
  totalChars: number
  dialoguePct: number
}

// 0~1 값을 부드럽게 압축(과도한 극단 완화)
function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x }

// 이상적 문단 길이(공백 제외 글자수) 대비 위험. 짧으면 0, 길수록 1로 포화.
function lengthRiskOf(chars: number): number {
  // 200자 부근부터 위험 상승, 600자에서 거의 1
  if (chars <= 180) return clamp01((chars - 60) / 600) // 너무 짧아도 약간(흐름 끊김)은 무시 수준
  return clamp01(0.2 + (chars - 180) / 520 * 0.8)
}

function analyzeParagraphs(text: string): Analysis | null {
  const blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
  // 빈 줄 구분이 없으면 단일 개행으로라도 나눠 본다(문단 의도 추정)
  let raw = blocks
  if (raw.length <= 1) {
    const byLine = text.split(/\n+/).map((b) => b.trim()).filter(Boolean)
    if (byLine.length > 1) raw = byLine
  }
  if (raw.length === 0) return null

  const paras: ParaSignals[] = []
  let prevTokens: Set<string> = new Set()
  let totalChars = 0
  let totalDialogue = 0

  for (let i = 0; i < raw.length; i++) {
    const t = raw[i]
    const chars = visLen(t)
    totalChars += chars
    const toks = tokenize(t)
    const tokSet = new Set(toks)

    // 정보 밀도: 고유 토큰 비율(높을수록 새 정보가 많음) + 긴 단어(4자+) 비율
    const uniqRatio = toks.length ? tokSet.size / toks.length : 0
    const longWords = toks.filter((w) => w.length >= 4).length
    const longRatio = toks.length ? longWords / toks.length : 0
    // 밀도가 높을수록(고유어 多 + 긴단어 多) 인지 부하↑. 다만 너무 낮아도(반복) 다른 신호가 잡음.
    const densityRisk = clamp01(uniqRatio * 0.55 + longRatio * 0.9 - 0.25)

    // 문단 내 단어 반복
    const freq = new Map<string, number>()
    for (const w of toks) if (w.length >= 2) freq.set(w, (freq.get(w) || 0) + 1)
    let topRepeatWord: string | undefined
    let topRepeatCount = 0
    freq.forEach((c, w) => { if (c > topRepeatCount) { topRepeatCount = c; topRepeatWord = w } })
    const inParaRepeat = toks.length ? clamp01((topRepeatCount - 1) / Math.max(4, toks.length / 6)) : 0

    // 직전 문단과의 어휘 중복(연속해서 같은 어휘면 지루함)
    let overlap = 0
    if (prevTokens.size && tokSet.size) {
      let common = 0
      tokSet.forEach((w) => { if (prevTokens.has(w)) common++ })
      overlap = common / tokSet.size
    }
    const repeatRisk = clamp01(inParaRepeat * 0.6 + overlap * 0.7)

    // 문장 길이 단조성: 문장 길이 편차가 작을수록 리듬이 단조 → 위험
    const sents = splitSentences(t)
    let monotonyRisk = 0
    if (sents.length >= 2) {
      const lens = sents.map((s) => visLen(s))
      const avg = lens.reduce((a, b) => a + b, 0) / lens.length
      const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) * (b - avg), 0) / lens.length)
      const cv = avg ? sd / avg : 0 // 변동계수
      monotonyRisk = clamp01(0.6 - cv) // cv 가 0.6 미만이면 단조 위험
    } else if (sents.length === 1 && chars > 120) {
      monotonyRisk = 0.5 // 긴 한 문장(만연체)
    }

    // 대사 비율(주의 회복 요인)
    const dchars = dialogueChars(t)
    totalDialogue += dchars
    const dialogueRelief = chars ? clamp01(dchars / chars) : 0

    // ── 종합 이탈 위험(0~100) ──
    const lengthRisk = lengthRiskOf(chars)
    let risk =
      lengthRisk * 34 +
      densityRisk * 26 +
      repeatRisk * 24 +
      monotonyRisk * 16
    // 대사가 많으면 시선이 가벼워져 위험 완화(최대 -22)
    risk -= dialogueRelief * 22
    // 결정론적 미세 흔들림(시드: 문단 내용) — 동일 입력엔 항상 동일
    const jitter = ((hashStr(t) % 100) / 100 - 0.5) * 4
    risk = Math.max(0, Math.min(100, risk + jitter))

    paras.push({
      idx: i, text: t, chars,
      lengthRisk, densityRisk, repeatRisk, monotonyRisk, dialogueRelief,
      risk, energy: 0, topRepeatWord, topRepeatCount,
    })
    prevTokens = tokSet
  }

  // ── 주의 에너지 시뮬레이션 ──
  // 독자는 100의 에너지로 시작. 위험이 높은 문단을 지날수록 에너지가 빠지고,
  // 대사/짧은 문단은 에너지를 회복시킨다. 에너지가 낮을수록 다음 위험에 더 취약(누적 피로).
  let energy = 100
  let minEnergy = 100
  let dropParaIdx = -1
  const DROP_LINE = 45
  for (const p of paras) {
    // 위험에 비례한 소모(+ 누적 피로: 에너지 낮으면 소모↑)
    const fatigue = 1 + (100 - energy) / 160
    const drain = (p.risk / 100) * 26 * fatigue
    // 회복: 대사·적정 길이일수록
    const recover = p.dialogueRelief * 14 + (p.risk < 30 ? 8 : 0)
    energy = Math.max(0, Math.min(100, energy - drain + recover))
    p.energy = energy
    if (energy < minEnergy) minEnergy = energy
    if (dropParaIdx < 0 && energy < DROP_LINE) dropParaIdx = p.idx
  }

  const avgRisk = paras.reduce((a, p) => a + p.risk, 0) / paras.length
  const worst = paras.reduce<ParaSignals | null>((a, p) => (!a || p.risk > a.risk ? p : a), null)
  const dialoguePct = totalChars ? (totalDialogue / totalChars) * 100 : 0

  return { paras, avgRisk, worst, minEnergy, dropParaIdx, totalChars, dialoguePct }
}

// 위험도 → 색/라벨
function riskTier(r: number): { color: string; label: string } {
  if (r >= 68) return { color: '#e5484d', label: '이탈 위험 높음' }
  if (r >= 48) return { color: '#f5a623', label: '스킴 가능성' }
  if (r >= 30) return { color: '#3aa0ff', label: '보통' }
  return { color: '#30a46c', label: '몰입 양호' }
}

function riskCause(p: ParaSignals): string {
  const causes: Array<[number, string]> = [
    [p.lengthRisk, '문단이 길어 눈이 미끄러짐'],
    [p.densityRisk, '정보가 빽빽해 인지 부담'],
    [p.repeatRisk, '어휘 반복으로 단조로움'],
    [p.monotonyRisk, '문장 길이가 비슷해 리듬 약함'],
  ]
  causes.sort((a, b) => b[0] - a[0])
  const top = causes[0]
  if (!top || top[0] < 0.22) {
    return p.dialogueRelief > 0.3 ? '대사가 시선을 끌어 양호' : '특이 위험 없음'
  }
  return top[1]
}

export default function AttentionSimulator({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)
  const aliveRef = useRef(true)

  const snippets = useLibraryList('snippets')

  // 복원
  useEffect(() => {
    aliveRef.current = true
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { text?: string }
        if (typeof p.text === 'string') setText(p.text)
      }
    } catch { /* noop */ }
    return () => {
      aliveRef.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (noteTimer.current != null) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload.text 수용 — 편집 중 본문 유실 방지(빈 입력일 때만 수용)
  useEffect(() => {
    const pt = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (pt && pt.trim()) setText((prev) => (prev.trim() ? prev : pt))
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text })) } catch { /* noop */ }
  }, [text])

  const analysis = useMemo<Analysis | null>(() => {
    const t = text.trim()
    if (!t) return null
    try { return analyzeParagraphs(text) } catch { return null }
  }, [text])

  const flash = (set: (v: any) => void, val: any, timerRef: React.MutableRefObject<number | null>, reset: any, ms = 1500) => {
    set(val)
    if (timerRef.current != null) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { if (aliveRef.current) set(reset) }, ms)
  }

  const reportText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[독자 주의 시뮬레이션]')
    lines.push(`문단 ${a.paras.length}개 · 전체 ${a.totalChars}자 · 대사 비율 ${Math.round(a.dialoguePct)}%`)
    lines.push(`평균 이탈 위험 ${Math.round(a.avgRisk)}/100 · 최저 주의 에너지 ${Math.round(a.minEnergy)}/100`)
    if (a.dropParaIdx >= 0) lines.push(`주의가 임계 아래로 떨어지는 지점: ${a.dropParaIdx + 1}번째 문단`)
    if (a.worst) lines.push(`가장 위험한 문단: ${a.worst.idx + 1}번째 (위험 ${Math.round(a.worst.risk)}, 원인: ${riskCause(a.worst)})`)
    lines.push('')
    a.paras.forEach((p) => {
      lines.push(`#${p.idx + 1} 위험 ${Math.round(p.risk)} · 에너지 ${Math.round(p.energy)} · ${riskCause(p)}`)
    })
    return lines.join('\n')
  }, [analysis])

  const copy = async () => {
    if (!reportText) return
    try { await navigator.clipboard.writeText(reportText); if (aliveRef.current) flash(setCopied, true, copyTimer, false) } catch { /* noop */ }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && item.text && item.text.trim()) {
      setText(item.text)
      flash(setSavedNote, `'${item.title}' 본문을 불러왔습니다`, noteTimer, '')
      return
    }
    try {
      const plain = e.dataTransfer.getData('text/plain')
      if (plain && plain.trim()) setText(plain)
    } catch { /* noop */ }
  }

  const saveReportSnippet = () => {
    if (!reportText) return
    addToLibrary('snippets', { text: reportText, source: '독자 주의 시뮬레이터', tags: ['주의분석', '구조'] })
    flash(setSavedNote, '분석 리포트를 스니펫 라이브러리에 저장했습니다', noteTimer, '')
  }

  const stashReport = () => {
    if (!reportText || !hasStash()) return
    addToStash({ kind: 'memo', label: '독자 주의 분석', text: reportText })
    flash(setSavedNote, '수집함에 분석 메모를 담았습니다', noteTimer, '')
  }

  const sendToProject = () => {
    if (!analysis || !hasProjectBridge()) return
    const a = analysis
    const rows = a.paras.map((p) =>
      `<li>문단 ${p.idx + 1}: 위험 <b>${Math.round(p.risk)}</b> / 에너지 ${Math.round(p.energy)} — ${riskCause(p)}</li>`,
    ).join('')
    const body =
      `<p>평균 이탈 위험 <b>${Math.round(a.avgRisk)}</b>/100, 최저 주의 에너지 <b>${Math.round(a.minEnergy)}</b>/100, 대사 비율 ${Math.round(a.dialoguePct)}%.</p>` +
      (a.dropParaIdx >= 0 ? `<p>주의가 임계 아래로 떨어지는 지점: <b>${a.dropParaIdx + 1}</b>번째 문단.</p>` : '') +
      `<ol>${rows}</ol>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조분석',
      title: `독자 주의 분석 (${new Date().toLocaleDateString()})`,
      bodyHtml: body,
      synopsis: `평균 위험 ${Math.round(a.avgRisk)} · 최저 에너지 ${Math.round(a.minEnergy)}`,
      meta: { 평균위험: String(Math.round(a.avgRisk)), 최저에너지: String(Math.round(a.minEnergy)), 문단수: String(a.paras.length) },
    })
    flash(setSavedNote, id ? '프로젝트 자료(구조분석)에 리포트를 추가했습니다' : '프로젝트에 연결되지 않았습니다', noteTimer, '')
  }

  const openSentenceViz = () => {
    if (!analysis) return
    const target = (selIdx != null && analysis.paras[selIdx]) ? analysis.paras[selIdx].text : text
    openToolLinked('sentence-length-viz', { text: target })
  }

  const useSnippet = (t: string) => { if (t && t.trim()) setText(t) }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const barRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 16 }

  const a = analysis

  // 에너지 곡선 SVG 좌표 계산
  const curve = useMemo(() => {
    if (!a || a.paras.length === 0) return null
    const W = 100, H = 100
    const n = a.paras.length
    const pts = a.paras.map((p, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W
      const y = H - (p.energy / 100) * H
      return { x, y, p }
    })
    const path = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ')
    const area = `${path} L${pts[pts.length - 1].x.toFixed(2)},${H} L${pts[0].x.toFixed(2)},${H} Z`
    return { pts, path, area, W, H }
  }, [a])

  return (
    <div style={wrap}>
      <div style={barRow}>
        <div style={title}>본문을 붙여넣거나 좌측 바인더 문서를 끌어다 놓으세요</div>
        <button className="minibtn" onClick={() => { setText(''); setSelIdx(null) }} disabled={!text}>지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={onDrop}
        onDragOver={(e) => { if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        placeholder={'빈 줄로 구분된 문단 단위로 분석합니다.\n\n예) 첫 문단...\n\n둘째 문단...\n\n바인더 문서를 끌어다 놓거나, 아래 스니펫에서 불러올 수도 있습니다.'}
        spellCheck={false}
        aria-label="독자 주의 분석 본문 입력"
      />

      {savedNote && <div style={{ ...hint, color: 'var(--accent)' }}>{savedNote}</div>}

      {!a ? (
        <div style={empty}>
          <div>문단별로 독자의 시선이 머무는지, 건너읽거나 이탈할 위험이 있는지<br />길이·정보 밀도·반복·대사 비율로 예측합니다.</div>
          {snippets.length > 0 && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>스니펫 라이브러리에서 불러오기</div>
              {snippets.slice(0, 5).map((s) => (
                <button key={s.id} className="minibtn" style={{ textAlign: 'left', whiteSpace: 'normal' }} onClick={() => useSnippet(s.text)}>
                  {s.text.length > 60 ? s.text.slice(0, 60) + '…' : s.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={scroll}>
          {/* 핵심 지표 */}
          <div style={grid3}>
            <div style={stat}><div style={{ ...statVal, color: riskTier(a.avgRisk).color }}>{Math.round(a.avgRisk)}</div><div style={statLabel}>평균 이탈 위험</div></div>
            <div style={stat}><div style={statVal}>{Math.round(a.minEnergy)}</div><div style={statLabel}>최저 주의 에너지</div></div>
            <div style={stat}><div style={statVal}>{a.paras.length}</div><div style={statLabel}>문단 수</div></div>
          </div>

          {/* 주의 에너지 곡선 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>주의 에너지 곡선 (문단 진행 →)</div>
            {curve && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
                <svg viewBox={`0 0 ${curve.W} ${curve.H}`} preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
                  {/* 임계선 45 */}
                  <line x1={0} y1={curve.H - 45} x2={curve.W} y2={curve.H - 45} stroke="#e5484d" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.6} />
                  <path d={curve.area} fill="var(--accent)" opacity={0.12} />
                  <path d={curve.path} fill="none" stroke="var(--accent)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
                  {curve.pts.map((pt, i) => (
                    <circle
                      key={i} cx={pt.x} cy={pt.y} r={selIdx === i ? 2.6 : 1.7}
                      fill={riskTier(pt.p.risk).color}
                      stroke={selIdx === i ? 'var(--text)' : 'none'} strokeWidth={0.6}
                      vectorEffect="non-scaling-stroke" style={{ cursor: 'pointer' }}
                      onClick={() => setSelIdx(i === selIdx ? null : i)}
                    >
                      <title>{`문단 ${i + 1}: 에너지 ${Math.round(pt.p.energy)} / 위험 ${Math.round(pt.p.risk)}`}</title>
                    </circle>
                  ))}
                </svg>
                <div style={{ ...hint, display: 'flex', justifyContent: 'space-between' }}>
                  <span>점선은 이탈 임계(45)</span>
                  <span>{a.dropParaIdx >= 0 ? `${a.dropParaIdx + 1}번째 문단에서 임계 이하로` : '임계 이하 구간 없음'}</span>
                </div>
              </div>
            )}
          </div>

          {/* 문단별 위험 막대 + 하이라이트 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>문단별 이탈 위험 (클릭해 자세히)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {a.paras.map((p) => {
                const tier = riskTier(p.risk)
                const sel = selIdx === p.idx
                return (
                  <div key={p.idx}>
                    <div
                      onClick={() => setSelIdx(sel ? null : p.idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{p.idx + 1}</span>
                      <div style={{ flex: 1, height: 16, background: 'var(--chrome-2)', borderRadius: 5, overflow: 'hidden', border: sel ? '1px solid var(--text)' : '1px solid var(--border)' }}>
                        <div style={{ width: `${p.risk}%`, height: '100%', background: tier.color, transition: 'width .2s' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{Math.round(p.risk)}</span>
                    </div>
                    {sel && (
                      <div style={{ margin: '6px 0 8px 30px', background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${tier.color}`, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tier.color }}>{tier.label} · {riskCause(p)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
                          {p.text.length > 260 ? p.text.slice(0, 260) + '…' : p.text}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                          {[
                            ['길이', p.lengthRisk, `${p.chars}자`],
                            ['밀도', p.densityRisk, ''],
                            ['반복', p.repeatRisk, p.topRepeatWord && (p.topRepeatCount || 0) >= 3 ? `'${p.topRepeatWord}' ${p.topRepeatCount}회` : ''],
                            ['단조', p.monotonyRisk, ''],
                            ['대사', p.dialogueRelief, p.dialogueRelief > 0 ? `${Math.round(p.dialogueRelief * 100)}%` : ''],
                          ].map(([label, val, extra]) => {
                            const v = val as number
                            const isRelief = label === '대사'
                            const strong = isRelief ? v > 0.3 : v > 0.5
                            return (
                              <span key={label as string} style={{
                                padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)',
                                background: strong ? (isRelief ? '#30a46c22' : '#e5484d22') : 'var(--chrome-2)',
                                color: strong ? (isRelief ? '#30a46c' : '#e5484d') : 'var(--muted)', fontWeight: 600,
                              }}>
                                {label as string} {Math.round(v * 100)}{extra ? ` · ${extra}` : ''}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {a.worst && (
            <div style={{ ...hint }}>
              가장 손볼 곳: <b style={{ color: riskTier(a.worst.risk).color }}>{a.worst.idx + 1}번째 문단</b> — {riskCause(a.worst)}.
              {a.dialoguePct < 8 ? ' 대사·짧은 호흡을 더하면 주의가 회복됩니다.' : ''}
            </div>
          )}

          {/* 연계/저장 액션 */}
          <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="linkbtn minibtn" onClick={openSentenceViz}>문장 길이 시각화로 보내기</button>
            <button className="minibtn" onClick={saveReportSnippet}>스니펫으로 저장</button>
            {hasStash() && <button className="minibtn" onClick={stashReport}>수집함에 담기</button>}
            {hasProjectBridge() && <button className="minibtn" onClick={sendToProject}>프로젝트에 추가</button>}
          </div>

          <div style={barRow}>
            <div style={hint}>휴리스틱 근사값입니다. 실제 독자 반응을 대체하지 않으며, 손볼 후보를 빠르게 찾는 용도입니다.</div>
            <button className="btn-primary" onClick={copy}>{copied ? '복사됨' : '리포트 복사'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
