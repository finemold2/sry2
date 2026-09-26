// 반복어 탐지 — textarea 에 붙여넣으면 짧은 거리 안에서 되풀이되는 같은 단어·종결어미를
// 로컬 정규식으로 찾아 목록·위치와 함께 보여준다. 문장 단조로움(같은 어미 연속 종결)도 점검한다.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬). 모든 분석은 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'repeated-word-finder', name: '반복어 탐지', icon: '🔁', group: '교정·언어', intro: '짧은 거리 안에 되풀이되는 단어·종결어미를 찾아 문장의 단조로움을 점검합니다', w: 540, h: 600 }

// ── 텍스트 유틸 ───────────────────────────────────────────────
// 줄/열 변환용 인덱스 → {line,col}
function makeLineCol(text: string) {
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  return (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 }
  }
}

// 토큰: 한글/영문/숫자가 섞인 '단어' 단위. 위치(시작 인덱스) 보존.
interface Token { word: string; norm: string; index: number; end: number }

// 한국어 조사·접사를 다듬어 어간을 근사한다(완전한 형태소 분석 아님).
// 예: 사람은/사람이/사람을 → 사람, 했다/했고/했지만 → 하- 근방으로는 정규화하지 않고
// 단어 표면형의 조사만 떼어 비교(과한 정규화로 오탐을 늘리지 않기 위함).
const JOSA = ['으로써', '으로서', '에서는', '에게서', '으로', '에서', '에게', '한테', '까지', '부터', '마저', '조차', '처럼', '만큼', '보다', '라고', '이라고', '은', '는', '이', '가', '을', '를', '의', '에', '도', '와', '과', '나', '랑', '이랑', '며', '면서', '고', '서']
function normalizeKo(w: string): string {
  let s = w
  // 끝의 문장부호 제거
  s = s.replace(/[.,!?;:"'’”“()\[\]{}…·~\-—]+$/u, '')
  if (s.length <= 1) return s
  // 가장 긴 조사부터 한 번만 제거(2글자 이상 어근 유지)
  for (const j of JOSA) {
    if (s.length > j.length + 1 && s.endsWith(j)) {
      return s.slice(0, s.length - j.length)
    }
  }
  return s
}

// 불용어(흔해서 반복돼도 자연스러운 말) — 반복 후보에서 제외
const STOP = new Set([
  '그리고', '그러나', '그래서', '그런데', '하지만', '그러면', '또는', '또한', '및', '즉', '곧',
  '나는', '내가', '너는', '우리', '그는', '그녀', '그들', '이것', '저것', '그것',
  '것', '수', '때', '등', '및', '거', '게', '걸', '저', '이', '그', '저런', '이런', '그런',
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'is', 'it', 'i', 'you', 'we', 'he', 'she', 'they', 'that', 'this', 'for', 'with', 'as', 'be', 'was', 'are',
])

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  // 한글/영문/숫자 연속 + 내부 어퍼스트로피/하이픈 허용
  const re = /[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > 200000) break
    const word = m[0]
    const norm = normalizeKo(word).toLowerCase()
    tokens.push({ word, norm, index: m.index, end: m.index + word.length })
  }
  return tokens
}

// ── 1) 근접 반복어 ───────────────────────────────────────────
// 같은 정규화 어근이 window(토큰 거리) 이내에서 재등장하면 한 묶음으로.
interface RepeatGroup {
  norm: string
  occurrences: Token[]   // 근접해 모인 출현들(2회 이상)
  minGap: number         // 가장 가까운 두 출현 사이 토큰 거리
}

function findRepeats(tokens: Token[], windowSize: number, minLen: number): RepeatGroup[] {
  // 어근별 출현 위치(토큰 인덱스) 모으기
  const byNorm = new Map<string, number[]>()
  tokens.forEach((t, i) => {
    if (t.norm.length < minLen) return
    if (STOP.has(t.norm)) return
    if (/^\d+$/.test(t.norm)) return // 순수 숫자 제외
    const arr = byNorm.get(t.norm)
    if (arr) arr.push(i); else byNorm.set(t.norm, [i])
  })

  const groups: RepeatGroup[] = []
  for (const [norm, idxs] of byNorm) {
    if (idxs.length < 2) continue
    // 인접 출현이 window 이내인 것들을 연결해 클러스터 구성
    let cluster: number[] = [idxs[0]]
    let minGap = Infinity
    const flush = () => {
      if (cluster.length >= 2) {
        // 클러스터 내 최소 간격 재계산
        let g = Infinity
        for (let k = 1; k < cluster.length; k++) g = Math.min(g, cluster[k] - cluster[k - 1])
        groups.push({ norm, occurrences: cluster.map((ti) => tokens[ti]), minGap: g })
      }
    }
    for (let k = 1; k < idxs.length; k++) {
      const gap = idxs[k] - idxs[k - 1]
      if (gap <= windowSize) {
        cluster.push(idxs[k])
        minGap = Math.min(minGap, gap)
      } else {
        flush()
        cluster = [idxs[k]]
        minGap = Infinity
      }
    }
    flush()
  }
  // 더 촘촘한(가까운) 반복부터, 동률이면 출현 많은 순
  groups.sort((a, b) => a.minGap - b.minGap || b.occurrences.length - a.occurrences.length || a.occurrences[0].index - b.occurrences[0].index)
  return groups
}

// ── 2) 종결어미 단조로움 ─────────────────────────────────────
// 문장 끝의 종결어미 패턴(-었다/-았다/-였다/-했다/-이다/-있다/-없다/-ㄴ다/-요/-다 등)을 추출,
// 같은 종결이 연속될 때 단조로움으로 표시한다.
interface EndingRow { ending: string; sentence: string; index: number }
const ENDING_PATTERNS: { key: string; re: RegExp; label: string }[] = [
  { key: 'eossda', re: /(었|았|였)다$/u, label: '-었다/았다/였다' },
  { key: 'haetda', re: /했다$/u, label: '-했다' },
  { key: 'itda', re: /있다$/u, label: '-있다' },
  { key: 'eopda', re: /없다$/u, label: '-없다' },
  { key: 'ida', re: /이?다$/u, label: '-(이)다' },
  { key: 'nda', re: /[는ㄴ]다$/u, label: '-(ㄴ/는)다' },
  { key: 'yo', re: /[요]$/u, label: '-요' },
  { key: 'da', re: /다$/u, label: '-다' },
  { key: 'en-ed', re: /ed$/iu, label: '-ed(영어 과거)' },
  { key: 'en-ing', re: /ing$/iu, label: '-ing' },
]

function splitSentences(text: string): { s: string; index: number }[] {
  const out: { s: string; index: number }[] = []
  const re = /[^.!?。！？…\n]+[.!?。！？…]*/gu
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > 100000) break
    const raw = m[0]
    const trimmed = raw.trim()
    if (trimmed) {
      const lead = raw.length - raw.trimStart().length
      out.push({ s: trimmed, index: m.index + lead })
    }
  }
  return out
}

function endingOf(sentence: string): { key: string; label: string } | null {
  // 마지막 단어(부호 제거) 기준
  const cleaned = sentence.replace(/[.,!?;:"'’”“()\[\]{}…·~\-—\s]+$/u, '')
  const lastWordMatch = cleaned.match(/[\p{L}\p{N}'’\-]+$/u)
  if (!lastWordMatch) return null
  const last = lastWordMatch[0]
  for (const p of ENDING_PATTERNS) {
    if (p.re.test(last)) return { key: p.key, label: p.label }
  }
  return null
}

interface MonotonyRun { key: string; label: string; rows: EndingRow[] }
function findMonotony(text: string, runMin: number): MonotonyRun[] {
  const sents = splitSentences(text)
  const ending = sents.map((x) => ({ ...x, e: endingOf(x.s) }))
  const runs: MonotonyRun[] = []
  let i = 0
  while (i < ending.length) {
    const cur = ending[i].e
    if (!cur) { i++; continue }
    let j = i + 1
    while (j < ending.length && ending[j].e && ending[j].e!.key === cur.key) j++
    const len = j - i
    if (len >= runMin) {
      runs.push({
        key: cur.key,
        label: cur.label,
        rows: ending.slice(i, j).map((x) => ({ ending: cur.label, sentence: x.s, index: x.index })),
      })
    }
    i = j
  }
  // 긴 연속부터
  runs.sort((a, b) => b.rows.length - a.rows.length || a.rows[0].index - b.rows[0].index)
  return runs
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

const SAMPLE = '그는 천천히 문을 열었다. 방 안은 어두웠다. 그는 불을 켰다. 책상 위에는 편지가 놓여 있었다. 그는 편지를 집어 들었다. 편지에는 짧은 글이 적혀 있었다. 그는 편지를 읽었다. 편지의 내용은 그를 놀라게 했다. 오랫동안 기다려 온 소식이었다. 그는 편지를 다시 한번 읽었다.'

export default function RepeatedWordFinder() {
  const [text, setText] = useState('')
  const [windowSize, setWindowSize] = useState(40) // 토큰 거리(근접 판단 창)
  const [minLen, setMinLen] = useState(2)          // 최소 어근 길이
  const [tab, setTab] = useState<'word' | 'ending'>('word')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const toLineCol = useMemo(() => makeLineCol(text), [text])

  const tokens = useMemo(() => {
    try { return tokenize(text) } catch { return [] }
  }, [text])

  const repeats = useMemo(() => {
    try { return findRepeats(tokens, windowSize, minLen) } catch { return [] }
  }, [tokens, windowSize, minLen])

  const monotony = useMemo(() => {
    try { return findMonotony(text, 3) } catch { return [] }
  }, [text])

  // 복사 텍스트
  const resultText = useMemo(() => {
    const lines: string[] = []
    if (repeats.length > 0) {
      lines.push('[근접 반복어]')
      repeats.forEach((g, i) => {
        const where = g.occurrences.map((o) => { const { line, col } = toLineCol(o.index); return `${line}:${col}` }).join(', ')
        lines.push(`${i + 1}. "${g.norm}" — ${g.occurrences.length}회 (최소 간격 ${g.minGap}단어) @ ${where}`)
      })
    }
    if (monotony.length > 0) {
      if (lines.length) lines.push('')
      lines.push('[종결어미 단조로움]')
      monotony.forEach((r, i) => {
        lines.push(`${i + 1}. ${r.label} 종결이 ${r.rows.length}문장 연속`)
        r.rows.forEach((row) => lines.push(`   · ${clip(row.sentence, 50)}`))
      })
    }
    return lines.join('\n')
  }, [repeats, monotony, toLineCol])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  // 본문에서 해당 위치를 선택
  const jumpTo = (index: number, end: number) => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(index, end) } catch { /* noop */ }
  }

  const hasInput = text.trim() !== ''

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 170, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const controls: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }
  const ctrlBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: active ? 700 : 500,
  })
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }
  const wordTag: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)', background: 'var(--chrome-2)', borderRadius: 6, padding: '1px 8px' }
  const countTag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const chipPos: React.CSSProperties = {
    fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'],
  }
  const posRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const sentRow: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, padding: '2px 0', cursor: 'pointer', borderLeft: '2px solid var(--warn)', paddingLeft: 8, marginTop: 4 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const sel: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>🔁 반복되는 단어·종결어미를 로컬에서 찾아 문장 단조로움을 점검합니다 (네트워크 불필요)</div>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="점검할 글을 여기에 붙여넣으세요. 입력하는 동안 실시간으로 분석됩니다."
        spellCheck={false}
        aria-label="점검할 텍스트 입력"
      />

      <div style={controls}>
        <div style={ctrlBox}>
          <span>근접 거리</span>
          <select style={sel} value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))} aria-label="근접 거리(단어)">
            <option value={20}>좁게 (20단어)</option>
            <option value={40}>보통 (40단어)</option>
            <option value={80}>넓게 (80단어)</option>
            <option value={9999}>전체</option>
          </select>
        </div>
        <div style={ctrlBox}>
          <span>최소 길이</span>
          <select style={sel} value={minLen} onChange={(e) => setMinLen(Number(e.target.value))} aria-label="최소 어근 길이">
            <option value={1}>1자 이상</option>
            <option value={2}>2자 이상</option>
            <option value={3}>3자 이상</option>
          </select>
        </div>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={!resultText} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      <div style={tabRow}>
        <span style={tabBtn(tab === 'word')} onClick={() => setTab('word')} role="button" tabIndex={0}>근접 반복어 {repeats.length}</span>
        <span style={tabBtn(tab === 'ending')} onClick={() => setTab('ending')} role="button" tabIndex={0}>종결어미 단조 {monotony.length}</span>
      </div>

      {!hasInput ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>📝</div>
          <div>글을 붙여넣으면 짧은 거리 안에서 되풀이되는 단어와<br />같은 종결어미(-었다·-했다·-있다 등)가 연속되는 곳을 찾습니다.</div>
          <div style={hint}>조사를 간단히 떼어 같은 말로 묶고, 흔한 말(불용어)은 제외합니다.</div>
        </div>
      ) : tab === 'word' ? (
        repeats.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 30 }}>✅</div>
            <div>설정한 거리 안에서 반복되는 단어가 없습니다.</div>
            <div style={hint}>'근접 거리'를 넓히면 더 멀리 떨어진 반복도 찾습니다.</div>
          </div>
        ) : (
          <div style={listWrap}>
            {repeats.slice(0, 100).map((g, i) => {
              const gapColor = g.minGap <= 8 ? 'var(--warn)' : g.minGap <= 20 ? 'var(--accent)' : 'var(--muted)'
              return (
                <div key={`${g.norm}-${g.occurrences[0].index}-${i}`} style={card}>
                  <div style={cardHead}>
                    <span style={wordTag}>{g.norm}</span>
                    <span style={countTag(gapColor)}>{g.occurrences.length}회</span>
                    <span style={countTag(gapColor)}>최소 간격 {g.minGap === 9999 ? '—' : `${g.minGap}단어`}</span>
                  </div>
                  <div style={posRow}>
                    {g.occurrences.map((o, k) => {
                      const { line, col } = toLineCol(o.index)
                      return (
                        <span
                          key={k}
                          style={chipPos}
                          onClick={() => jumpTo(o.index, o.end)}
                          title="클릭하면 본문에서 해당 위치를 선택합니다"
                        >
                          {o.word !== g.norm ? `${o.word} ` : ''}줄{line}·{col}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        monotony.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 30 }}>✅</div>
            <div>같은 종결어미가 3문장 이상 연속되는 곳이 없습니다.</div>
            <div style={hint}>종결을 다양하게 쓰고 있어 단조롭지 않습니다.</div>
          </div>
        ) : (
          <div style={listWrap}>
            {monotony.map((r, i) => (
              <div key={`${r.key}-${r.rows[0].index}-${i}`} style={card}>
                <div style={cardHead}>
                  <span style={wordTag}>{r.label}</span>
                  <span style={countTag('var(--warn)')}>{r.rows.length}문장 연속</span>
                  <span style={hint}>종결이 단조로워요 — 어미를 바꿔보세요</span>
                </div>
                {r.rows.map((row, k) => (
                  <div
                    key={k}
                    style={sentRow}
                    onClick={() => jumpTo(row.index, row.index + row.sentence.length)}
                    title="클릭하면 본문에서 해당 문장을 선택합니다"
                  >
                    {clip(row.sentence, 80)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
