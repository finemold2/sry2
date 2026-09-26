// 문단 흐름·리듬 시각화 — 본문을 문단(빈 줄 또는 줄바꿈 경계)으로 나눠
//   각 문단의 길이(문장 수 / 글자 수)를 막대·블록으로 그려 글의 "리듬"을 진단한다.
//   · 긴 문단의 연속(호흡이 무거움)·짧은 문단의 부재(완급 없음)·단조로움(편차 부족)을 경고.
//   · 대화 비율이 높은 문단은 별도 색/아이콘으로 표시.
//   · 블록을 클릭하면 해당 문단 전체를 아래에서 펼쳐 보여준다.
// 외부 API/라이브러리 없음 — 전부 로컬 정규식·계산·직접 그린 막대/스트립. react 와 './linkbus' 외 import 없음.
// 언마운트 정리: 복사 피드백 타이머 ref 정리. 좌측 바인더 파일 드롭 수용 + 프로젝트에 진단 추가.
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  addToProject, hasProjectBridge,
  getDragItem, isItemDrag,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'paragraph-flow-viz',
  name: '문단 흐름 시각화',
  icon: '🪜',
  group: '교정·언어',
  intro: '문단별 길이·문장수·대화비율을 막대와 스트립으로 그려 글의 리듬과 단조로움을 진단합니다',
  w: 540,
  h: 680,
}

// ── 진단 기준값(글자 수는 공백 제외) ───────────────────────────────
const LONG_CHARS = 320          // 이 글자 수 이상이면 "긴 문단"
const SHORT_CHARS = 60          // 이 글자 수 이하이면 "짧은 문단"
const LONG_RUN_WARN = 3         // 긴 문단이 이만큼 연속되면 경고
const DIALOGUE_HEAVY_PCT = 55   // 문단 내 대사 글자 비율이 이 이상이면 "대화 문단"
const MONO_CV = 0.32            // 길이 변동계수(표준편차/평균)가 이보다 작으면 단조로움 경고

// ── 따옴표(대화 추출용) ───────────────────────────────────────────
interface QuotePair { open: string; close: string }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”' },
  { open: '‘', close: '’' },
  { open: '「', close: '」' },
  { open: '『', close: '』' },
  { open: '"', close: '"' },
  { open: "'", close: "'" },
]

interface ParaInfo {
  idx: number
  text: string
  chars: number        // 공백 제외 글자 수
  sentences: number    // 문장 수
  dialogueChars: number
  dialoguePct: number  // 0~100
  isLong: boolean
  isShort: boolean
  isDialogue: boolean
}

// 공백·개행 제외 글자 수(코드포인트 단위로 세어 이모지/한글 결합도 합리적으로)
function visibleLen(s: string): number {
  return [...s.replace(/\s/g, '')].length
}

// 문단 분리: 빈 줄(연속 개행) 경계를 우선. 빈 줄이 전혀 없으면 단일 개행을 문단 경계로 대체.
function splitParagraphs(text: string): string[] {
  const norm = text.replace(/\r\n?/g, '\n')
  let parts = norm.split(/\n\s*\n+/)
  // 빈 줄 구분이 사실상 없어(문단이 1~2개로 뭉침) 단일 개행이 많은 글이면 줄 단위로 분리
  if (parts.length <= 2 && /\n/.test(norm)) {
    const byLine = norm.split(/\n+/)
    if (byLine.length > parts.length) parts = byLine
  }
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

// 문장 수: 마침표/물음표/느낌표/줄임표 등 종결부호를 기준으로(연속 부호는 하나로) 센다.
// 종결부호가 전혀 없으면 최소 1문장으로 본다.
function countSentences(s: string): number {
  const m = s.match(/[.!?。！？…]+/g)
  let n = m ? m.length : 0
  // 마지막이 종결부호로 끝나지 않고 본문이 남아 있으면 마지막 조각도 한 문장으로
  const tail = s.replace(/[.!?。！？…]+\s*$/, '')
  if (tail.trim().length > 0 && (!m || !/[.!?。！？…]+\s*$/.test(s))) {
    // 종결부호로 끝나지 않은 마지막 문장 보정
    if (n === 0 || !/[.!?。！？…]\s*$/.test(s.trim())) n += 1
  }
  return Math.max(1, n)
}

// 문단 내 대사(따옴표로 묶인 구간) 글자 수 — 가장 가까운 짝으로 닫는 단순 스캔.
// 영어 축약형(it's, don't) 오탐을 줄이기 위해 곧은 작은따옴표는 앞 글자가 영숫자면 통과시킨다.
function dialogueLen(text: string): number {
  const chars = [...text]
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)
  let total = 0
  let i = 0
  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (pair) {
      if (ch === "'" && isAlnum(chars[i - 1])) { i++; continue }
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
        if (cj === pair.close) { closed = true; break }
        inner += cj
        j++
      }
      if (closed) { total += visibleLen(inner); i = j + 1; continue }
    }
    i++
  }
  return total
}

// HTML escape(프로젝트에 추가 시 본문 안전)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 문단 길이에 따른 색
function paraColor(p: ParaInfo): string {
  if (p.isDialogue) return 'var(--ok)'
  if (p.isLong) return 'var(--warn)'
  if (p.isShort) return 'var(--muted)'
  return 'var(--accent)'
}

const SAMPLE = `밤이 깊었다. 창밖으로 눈이 내렸다.

그는 오래도록 책상 앞에 앉아 있었다. 펜은 손에 들려 있었지만 종이 위에서는 한 글자도 움직이지 않았다. 머릿속에는 수십 개의 문장이 떠올랐다가 사라졌고, 그 어느 것도 마음에 들지 않았다. 시계는 자정을 넘겼고, 방 안의 공기는 점점 무거워졌으며, 그의 어깨는 천천히 굳어 갔다. 그래도 그는 일어서지 않았다.

"이대로는 안 되겠어." 그가 중얼거렸다.

"뭐가?" 그녀가 문 너머에서 물었다.

"전부 다." 그는 펜을 내려놓았다. "처음부터 다시 써야 할 것 같아."

그녀는 대답하지 않았다.`

export default function ParagraphFlowViz({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [view, setView] = useState<'chars' | 'sentences'>('chars')
  const copyTimer = useRef<number | null>(null)
  const addTimer = useRef<number | null>(null)
  const aliveRef = useRef(true)

  // payload 로 본문을 받아 열렸으면(연계) 즉시 채움
  useEffect(() => {
    const p = payload as { text?: unknown } | undefined
    if (p && typeof p.text === 'string' && p.text.trim()) setText(p.text)
  }, [payload])

  // 언마운트 정리: 피드백 타이머
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (addTimer.current != null) clearTimeout(addTimer.current)
    }
  }, [])

  const analysis = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return null
    const raw = splitParagraphs(trimmed)
    if (raw.length === 0) return null

    const paras: ParaInfo[] = raw.map((t, idx) => {
      const chars = visibleLen(t)
      const sentences = countSentences(t)
      const dchars = dialogueLen(t)
      const dpct = chars > 0 ? (dchars / chars) * 100 : 0
      return {
        idx, text: t, chars, sentences,
        dialogueChars: dchars, dialoguePct: dpct,
        isLong: chars >= LONG_CHARS,
        isShort: chars <= SHORT_CHARS,
        isDialogue: dpct >= DIALOGUE_HEAVY_PCT,
      }
    })

    const n = paras.length
    const charList = paras.map((p) => p.chars)
    const sentList = paras.map((p) => p.sentences)
    const totalChars = charList.reduce((a, b) => a + b, 0)
    const totalSents = sentList.reduce((a, b) => a + b, 0)
    const avgChars = totalChars / n
    const avgSents = totalSents / n
    const maxChars = Math.max(...charList)
    const minChars = Math.min(...charList)
    const variance = charList.reduce((a, b) => a + (b - avgChars) * (b - avgChars), 0) / n
    const stdev = Math.sqrt(variance)
    const cv = avgChars > 0 ? stdev / avgChars : 0   // 변동계수: 낮을수록 단조로움
    const longCount = paras.filter((p) => p.isLong).length
    const shortCount = paras.filter((p) => p.isShort).length
    const dialogueCount = paras.filter((p) => p.isDialogue).length

    // 긴 문단의 최장 연속 길이(run) 계산
    let longestRun = 0
    let run = 0
    let runStart = -1
    let bestRunStart = -1
    for (let i = 0; i < paras.length; i++) {
      if (paras[i].isLong) {
        if (run === 0) runStart = i
        run++
        if (run > longestRun) { longestRun = run; bestRunStart = runStart }
      } else {
        run = 0
      }
    }

    // 진단 경고 수집
    const warnings: { level: 'warn' | 'note'; text: string }[] = []
    if (longestRun >= LONG_RUN_WARN) {
      warnings.push({ level: 'warn', text: `긴 문단이 ${longestRun}개 연속됩니다(${bestRunStart + 1}~${bestRunStart + longestRun}번). 사이에 짧은 문단을 넣으면 호흡이 트입니다.` })
    }
    if (cv < MONO_CV && n >= 4) {
      warnings.push({ level: 'warn', text: `문단 길이가 비슷비슷합니다(변동계수 ${cv.toFixed(2)}). 장·단 문단을 섞으면 리듬이 살아납니다.` })
    }
    if (shortCount === 0 && n >= 5) {
      warnings.push({ level: 'note', text: '짧은 문단이 하나도 없습니다. 결정적 순간엔 한 줄짜리 문단이 강조 효과를 줍니다.' })
    }
    if (longCount === 0 && n >= 5 && avgChars < 90) {
      warnings.push({ level: 'note', text: '문단이 전반적으로 짧습니다. 장면을 깊게 펼칠 땐 더 긴 호흡도 필요합니다.' })
    }
    if (n >= 6 && dialogueCount === 0) {
      warnings.push({ level: 'note', text: '대화 문단이 없습니다(서술 위주). 대사를 섞으면 장면에 생기가 더해집니다.' })
    }

    return {
      paras, n, totalChars, totalSents, avgChars, avgSents,
      maxChars, minChars, stdev, cv, longCount, shortCount, dialogueCount,
      longestRun, bestRunStart, warnings,
    }
  }, [text])

  const summaryText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[문단 흐름·리듬 진단]')
    lines.push(`문단 ${a.n}개 · 총 ${a.totalChars}자(공백 제외) · 총 ${a.totalSents}문장`)
    lines.push(`문단당 평균: ${a.avgChars.toFixed(0)}자 / ${a.avgSents.toFixed(1)}문장`)
    lines.push(`가장 긴 문단 ${a.maxChars}자 · 가장 짧은 문단 ${a.minChars}자`)
    lines.push(`길이 변동계수(리듬 다양성): ${a.cv.toFixed(2)} ${a.cv < MONO_CV ? '(단조로움 주의)' : '(양호)'}`)
    lines.push(`긴 문단 ${a.longCount}개 · 짧은 문단 ${a.shortCount}개 · 대화 문단 ${a.dialogueCount}개`)
    if (a.longestRun >= 2) lines.push(`긴 문단 최장 연속: ${a.longestRun}개`)
    if (a.warnings.length > 0) {
      lines.push('')
      lines.push('진단:')
      a.warnings.forEach((w) => lines.push(`- ${w.text}`))
    } else {
      lines.push('')
      lines.push('진단: 문단 리듬이 균형 잡혀 있습니다.')
    }
    return lines.join('\n')
  }, [analysis])

  const copy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      if (!aliveRef.current) return
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (aliveRef.current) setCopied(false) }, 1500)
    } catch {
      if (aliveRef.current) setCopied(false)
    }
  }

  const addProject = () => {
    if (!analysis) return
    const a = analysis
    const rows = a.paras.map((p) => {
      const tag = p.isDialogue ? '대화' : p.isLong ? '긴 문단' : p.isShort ? '짧은 문단' : '보통'
      const head = esc(p.text.length > 60 ? p.text.slice(0, 60) + '…' : p.text)
      return `<tr><td>${p.idx + 1}</td><td>${p.chars}</td><td>${p.sentences}</td><td>${Math.round(p.dialoguePct)}%</td><td>${tag}</td><td>${head}</td></tr>`
    }).join('')
    const warnHtml = a.warnings.length
      ? '<ul>' + a.warnings.map((w) => `<li>${esc(w.text)}</li>`).join('') + '</ul>'
      : '<p>문단 리듬이 균형 잡혀 있습니다.</p>'
    const bodyHtml =
      `<h2>문단 흐름·리듬 진단</h2>` +
      `<p>문단 ${a.n}개 · 총 ${a.totalChars}자 · 평균 ${a.avgChars.toFixed(0)}자/문단 · 변동계수 ${a.cv.toFixed(2)}</p>` +
      `<h3>진단</h3>${warnHtml}` +
      `<h3>문단별 표</h3>` +
      `<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>#</th><th>글자</th><th>문장</th><th>대화%</th><th>유형</th><th>첫머리</th></tr></thead><tbody>${rows}</tbody></table>`
    const id = addToProject({ root: 'research', folder: '진단', title: `문단 흐름 진단 (${a.n}문단)`, bodyHtml })
    if (id && aliveRef.current) {
      setAdded(true)
      if (addTimer.current != null) clearTimeout(addTimer.current)
      addTimer.current = window.setTimeout(() => { if (aliveRef.current) setAdded(false) }, 1600)
    }
  }

  // 좌측 바인더 파일 드롭 → 본문 채움
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      e.preventDefault()
      setText(item.text)
      setSelected(null)
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) }
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 92, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)',
    border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 16 }
  const segWrap: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
  const segBtn = (on: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer', border: 'none',
    background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--muted)',
  })

  const a = analysis
  const scaleMax = a ? Math.max(view === 'chars' ? a.maxChars : Math.max(...a.paras.map((p) => p.sentences)), 1) : 1
  const sel = a && selected != null ? a.paras[selected] : null

  return (
    <div style={wrap} onDragOver={onDragOver} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <div style={bar}>
        <div style={title}><Emoji e="🪜" /> 본문을 붙여넣거나 좌측 파일을 끌어다 놓으세요</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => { setText(SAMPLE); setSelected(null) }}>예시</button>
          <button className="minibtn" onClick={() => { setText(''); setSelected(null) }} disabled={!text}>↺ 지우기</button>
        </div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => { setText(e.target.value); setSelected(null) }}
        placeholder={'여기에 글을 붙여넣으세요. 빈 줄(또는 줄바꿈)로 문단을 나눠\n각 문단의 길이·문장수·대화비율을 막대와 스트립으로 그려 리듬을 진단합니다.'}
        spellCheck={false}
        aria-label="문단 흐름 시각화 입력"
      />

      {!a ? (
        <div style={empty}>
          글을 입력하면 문단마다 길이 막대가 그려지고<br />
          긴 문단의 연속·단조로움·대화 비율을 진단합니다.<br />
          <span style={{ fontSize: 11 }}>막대를 클릭하면 해당 문단을 펼쳐 봅니다.</span>
        </div>
      ) : (
        <div style={scroll}>
          {/* 통계 */}
          <div style={grid4}>
            <div style={stat}><div style={statVal}>{a.n}</div><div style={statLabel}>문단 수</div></div>
            <div style={stat}><div style={statVal}>{a.avgChars.toFixed(0)}</div><div style={statLabel}>평균 글자</div></div>
            <div style={stat}><div style={statVal}>{a.avgSents.toFixed(1)}</div><div style={statLabel}>평균 문장</div></div>
            <div style={stat}><div style={statVal}>{a.cv.toFixed(2)}</div><div style={statLabel}>리듬 다양성</div></div>
          </div>

          {/* 미니맵 스트립: 문단 길이를 가로 블록 폭으로(전체 한눈에) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={bar}>
              <div style={sectionTitle}><Emoji e="🗺️" /> 흐름 미니맵 (폭 = 길이)</div>
              <div style={hint}>클릭해 펼치기</div>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {a.paras.map((p) => {
                const flexBasis = Math.max(p.chars, 6)
                const isSel = selected === p.idx
                return (
                  <div
                    key={p.idx}
                    onClick={() => setSelected(isSel ? null : p.idx)}
                    title={`${p.idx + 1}번 · ${p.chars}자 · ${p.sentences}문장${p.isDialogue ? ' · 대화' : ''}`}
                    style={{
                      flexGrow: flexBasis, flexBasis: 0, minWidth: 4, cursor: 'pointer',
                      background: paraColor(p), opacity: isSel ? 1 : 0.82,
                      outline: isSel ? '2px solid var(--text)' : 'none', outlineOffset: -2,
                      transition: 'opacity .15s',
                    }}
                  />
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--muted)' }}>
              <span><span style={{ color: 'var(--accent)' }}>■</span> 보통</span>
              <span><span style={{ color: 'var(--warn)' }}>■</span> 긴 문단(≥{LONG_CHARS}자)</span>
              <span><span style={{ color: 'var(--muted)' }}>■</span> 짧은 문단(≤{SHORT_CHARS}자)</span>
              <span><span style={{ color: 'var(--ok)' }}>■</span> 대화 문단(≥{DIALOGUE_HEAVY_PCT}%)</span>
            </div>
          </div>

          {/* 진단 경고 */}
          {a.warnings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}><Emoji e="🔎" /> 리듬 진단</div>
              {a.warnings.map((w, i) => (
                <div key={i} style={{
                  background: 'var(--paper)',
                  border: `1px solid ${w.level === 'warn' ? 'var(--warn)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${w.level === 'warn' ? 'var(--warn)' : 'var(--accent)'}`,
                  borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.55,
                  color: 'var(--text)',
                }}>
                  <span style={{ marginRight: 6 }}>{w.level === 'warn' ? <Emoji e="⚠️" /> : <Emoji e="💡" />}</span>{w.text}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>
              ✓ 문단 리듬이 균형 잡혀 있습니다. 장·단 문단이 잘 섞여 있어요.
            </div>
          )}

          {/* 문단별 막대 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={bar}>
              <div style={sectionTitle}><Emoji e="📊" /> 문단별 {view === 'chars' ? '글자 수' : '문장 수'}</div>
              <div style={segWrap}>
                <button style={segBtn(view === 'chars')} onClick={() => setView('chars')}>글자</button>
                <button style={segBtn(view === 'sentences')} onClick={() => setView('sentences')}>문장</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {a.paras.map((p) => {
                const val = view === 'chars' ? p.chars : p.sentences
                const pct = Math.max(2, Math.round((val / scaleMax) * 100))
                const color = paraColor(p)
                const isSel = selected === p.idx
                return (
                  <div
                    key={p.idx}
                    onClick={() => setSelected(isSel ? null : p.idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 4, padding: '1px 2px', background: isSel ? 'var(--panel)' : 'transparent' }}
                    title={p.text.length > 80 ? p.text.slice(0, 80) + '…' : p.text}
                  >
                    <div style={{ width: 24, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{p.idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0, height: 18, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .25s' }} />
                      {p.isDialogue && (
                        <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, lineHeight: 1, pointerEvents: 'none' }}><Emoji e="💬" /></span>
                      )}
                    </div>
                    <div style={{ width: 34, textAlign: 'right', fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{val}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 선택 문단 펼치기 */}
          {sel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={bar}>
                <div style={sectionTitle}><Emoji e="📄" /> {sel.idx + 1}번 문단 — {sel.chars}자 · {sel.sentences}문장 · 대화 {Math.round(sel.dialoguePct)}%</div>
                <button className="minibtn" onClick={() => setSelected(null)}>닫기 ✕</button>
              </div>
              <div style={{ background: 'var(--paper)', border: `1px solid ${paraColor(sel)}`, borderLeft: `3px solid ${paraColor(sel)}`, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>
                {sel.text}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  color: paraColor(sel),
                }}>
                  {sel.isDialogue ? <><Emoji e="💬" /> 대화 문단</> : sel.isLong ? <><Emoji e="⚠️" /> 긴 문단</> : sel.isShort ? '· 짧은 문단' : '· 보통 문단'}
                </span>
                <button className="linkbtn" onClick={() => openToolLinked('sentence-length-viz', { text: sel.text })}>문장 길이 보기 →</button>
                <button className="linkbtn" onClick={() => openToolLinked('dialogue-ratio', { text: sel.text })}>대화/지문 비율 →</button>
              </div>
            </div>
          )}

          {/* 하단 액션 */}
          <div style={bar}>
            <div style={hint}>문단 = 빈 줄(또는 줄바꿈) 경계. 글자 수는 공백 제외 기준입니다.</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {hasProjectBridge() && (
                <button className="minibtn" onClick={addProject}>{added ? '✓ 추가됨' : <><Emoji e="📄" /> 프로젝트에 추가</>}</button>
              )}
              <button className="btn-primary" onClick={copy}>{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 결과 복사</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
