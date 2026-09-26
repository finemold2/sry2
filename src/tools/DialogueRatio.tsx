// 대화/지문 비율 — 텍스트에서 따옴표로 묶인 대사와 그 밖의 지문을 구분해 비율을 계산한다.
// 큰따옴표/작은따옴표(곧은/둥근 모두 지원)로 감싼 구간을 대사로 보고, 나머지를 지문으로 본다.
// 외부 API 없음(전부 로컬 파싱·계산). react 외 import 없음. 언마운트 안전(타이머 ref 정리).
import { useState, useMemo, useRef, useEffect } from 'react'

export const meta = { id: 'dialogue-ratio', name: '대화/지문 비율', icon: '💬', group: '교정·언어', intro: '대사와 지문의 글자수 비율·대사 개수·평균 길이로 장면 균형을 점검합니다', w: 480, h: 620 }

// ── 따옴표 정의 ───────────────────────────────────────────────
// 여는따옴표 → 닫는따옴표 매핑. 곧은따옴표는 같은 문자가 여닫이를 겸한다.
interface QuotePair { open: string; close: string; sameChar: boolean }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”', sameChar: false }, // 둥근 큰따옴표
  { open: '‘', close: '’', sameChar: false }, // 둥근 작은따옴표
  { open: '「', close: '」', sameChar: false }, // 낫표
  { open: '『', close: '』', sameChar: false }, // 겹낫표
  { open: '"', close: '"', sameChar: true },   // 곧은 큰따옴표
  { open: "'", close: "'", sameChar: true },   // 곧은 작은따옴표
]
const OPENERS = new Set(PAIRS.map((p) => p.open))

// 대사 한 조각
interface Dialogue { text: string; len: number; quote: string }

// 공백을 제외한 "글자수" (한글/영문/숫자/문장부호 모두 포함하되 공백·개행만 제외)
function visibleLen(s: string): number {
  return [...s.replace(/\s/g, '')].length
}

// ── 파싱: 따옴표로 묶인 구간을 대사로, 나머지를 지문으로 추출 ──────────────
// 곧은따옴표는 여닫이가 같아 토글 방식으로, 둥근따옴표는 스택 없이 가장 가까운 짝으로 닫는다.
// 작은따옴표(' / ’)는 영어 축약형(it's, don't)·소유격에서 오탐이 잦으므로,
// 앞 글자가 알파벳/숫자이면(=축약형) 닫는 따옴표 후보로만 보고 새 대사 시작으로는 보지 않는다.
function parse(text: string): { dialogues: Dialogue[]; narrationChars: number; dialogueChars: number } {
  const dialogues: Dialogue[] = []
  let narration = '' // 따옴표 밖 텍스트 누적(지문)
  const chars = [...text]
  let i = 0

  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)

  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)

    if (pair) {
      // 곧은 작은따옴표는 축약형/소유격 오탐 방지: 직전 글자가 영숫자·한글이면 따옴표 아닌 부호로 취급
      if (ch === "'" && isAlnum(chars[i - 1])) {
        narration += ch
        i++
        continue
      }
      // 닫는 따옴표를 찾는다
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        // 곧은 작은따옴표 닫힘도 축약형 보호: 직전(=inner 마지막) 글자가 영숫자면 닫지 않고 본문으로
        if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) {
          inner += cj
          j++
          continue
        }
        if (cj === pair.close) {
          closed = true
          break
        }
        // 줄바꿈이 두 번 이상 연속되면(문단 경계) 따옴표가 닫히지 않은 것으로 보고 중단
        if (cj === '\n' && chars[j + 1] === '\n') break
        inner += cj
        j++
      }

      if (closed) {
        const trimmed = inner.trim()
        if (trimmed.length > 0) {
          dialogues.push({ text: trimmed, len: visibleLen(trimmed), quote: pair.open + pair.close })
        }
        i = j + 1
      } else {
        // 닫히지 않은 따옴표는 지문으로 흡수
        narration += ch
        i++
      }
    } else {
      narration += ch
      i++
    }
  }

  const dialogueChars = dialogues.reduce((a, d) => a + d.len, 0)
  const narrationChars = visibleLen(narration)
  return { dialogues, narrationChars, dialogueChars }
}

// 균형 코멘트
function balanceComment(dialoguePct: number, hasContent: boolean): { label: string; color: string } {
  if (!hasContent) return { label: '내용 없음', color: 'var(--muted)' }
  if (dialoguePct >= 70) return { label: '대사 중심 (지문이 적어요)', color: 'var(--warn)' }
  if (dialoguePct >= 50) return { label: '대사가 다소 많은 편', color: 'var(--accent)' }
  if (dialoguePct >= 30) return { label: '대사·지문 균형', color: 'var(--ok)' }
  if (dialoguePct >= 12) return { label: '지문 중심 (대사 적당)', color: 'var(--ok)' }
  if (dialoguePct > 0) return { label: '지문 위주 (대사가 거의 없어요)', color: 'var(--accent)' }
  return { label: '대사 없음 (전부 지문)', color: 'var(--muted)' }
}

export default function DialogueRatio({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showList, setShowList] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
    }
  }, [])

  // 다른 도구에서 본문과 함께 열렸을 때 payload.text 를 1회 흡수(빈 칸일 때만)
  useEffect(() => {
    const t = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (t.trim()) setText((prev) => (prev.trim() ? prev : t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const analysis = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return null
    let parsed
    try {
      parsed = parse(text)
    } catch {
      return null
    }
    const { dialogues, narrationChars, dialogueChars } = parsed
    const total = dialogueChars + narrationChars
    if (total === 0) return null

    const dialoguePct = (dialogueChars / total) * 100
    const narrationPct = 100 - dialoguePct
    const count = dialogues.length
    const avgLen = count > 0 ? dialogueChars / count : 0
    const lens = dialogues.map((d) => d.len)
    const maxLen = lens.length ? Math.max(...lens) : 0
    const minLen = lens.length ? Math.min(...lens) : 0
    const longest = dialogues.find((d) => d.len === maxLen) || null

    const bal = balanceComment(dialoguePct, true)

    return {
      dialogues, count, dialogueChars, narrationChars, total,
      dialoguePct, narrationPct, avgLen, maxLen, minLen, longest, bal,
    }
  }, [text])

  const summaryText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[대화/지문 비율]')
    lines.push(`대사 ${Math.round(a.dialoguePct)}% : 지문 ${Math.round(a.narrationPct)}% (공백 제외 글자수 기준)`)
    lines.push(`대사 글자수 ${a.dialogueChars}자 · 지문 글자수 ${a.narrationChars}자`)
    lines.push(`대사 개수 ${a.count}개 · 평균 대사 길이 ${a.avgLen.toFixed(1)}자`)
    if (a.count > 0) lines.push(`가장 긴 대사 ${a.maxLen}자 · 가장 짧은 대사 ${a.minLen}자`)
    lines.push(`장면 균형: ${a.bal.label}`)
    return lines.join('\n')
  }, [analysis])

  const copy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      if (!aliveRef.current) return
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => {
        if (aliveRef.current) setCopied(false)
      }, 1500)
    } catch {
      if (aliveRef.current) setCopied(false)
    }
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 100, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 16 }

  const a = analysis

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}>💬 소설·시나리오 본문을 붙여넣으세요</div>
        <button className="minibtn" onClick={() => { setText(''); setShowList(false) }} disabled={!text}>↺ 지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'따옴표로 묶인 부분을 대사로 봅니다.\n예) "안녕." 그는 천천히 고개를 들었다. “오랜만이야.”\n큰따옴표(" “”), 작은따옴표(‘’), 낫표(「」 『』) 지원'}
        spellCheck={false}
        aria-label="대화 지문 비율 입력"
      />

      {!a ? (
        <div style={empty}>
          본문을 입력하면 대사와 지문의 비율,<br />대사 개수·평균 길이를 분석합니다.
        </div>
      ) : (
        <div style={scroll}>
          {/* 비율 막대 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionTitle}>📊 대사 : 지문 비율 (공백 제외 글자수)</div>
            <div style={{ display: 'flex', height: 34, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                width: `${a.dialoguePct}%`, background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, minWidth: a.dialoguePct > 0 ? 0 : 0, overflow: 'hidden', whiteSpace: 'nowrap',
              }}>
                {a.dialoguePct >= 14 ? `대사 ${Math.round(a.dialoguePct)}%` : ''}
              </div>
              <div style={{
                width: `${a.narrationPct}%`, background: 'var(--chrome-2)', color: 'var(--text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap',
              }}>
                {a.narrationPct >= 14 ? `지문 ${Math.round(a.narrationPct)}%` : ''}
              </div>
            </div>
            <div style={{ ...bar }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>● 대사 {Math.round(a.dialoguePct)}%</span>
                {'  '}
                <span style={{ fontWeight: 700 }}>● 지문 {Math.round(a.narrationPct)}%</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: a.bal.color }}>{a.bal.label}</div>
            </div>
          </div>

          {/* 통계 */}
          <div style={grid3}>
            <div style={stat}><div style={statVal}>{a.count}</div><div style={statLabel}>대사 개수</div></div>
            <div style={stat}><div style={statVal}>{a.avgLen.toFixed(1)}</div><div style={statLabel}>평균 대사 길이</div></div>
            <div style={stat}><div style={statVal}>{a.maxLen}</div><div style={statLabel}>가장 긴 대사</div></div>
          </div>
          <div style={grid3}>
            <div style={stat}><div style={statVal}>{a.dialogueChars}</div><div style={statLabel}>대사 글자수</div></div>
            <div style={stat}><div style={statVal}>{a.narrationChars}</div><div style={statLabel}>지문 글자수</div></div>
            <div style={stat}><div style={statVal}>{a.total}</div><div style={statLabel}>전체 글자수</div></div>
          </div>

          {a.longest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>🗣️ 가장 긴 대사 ({a.maxLen}자)</div>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.6 }}>
                {a.longest.text.length > 160 ? a.longest.text.slice(0, 160) + '…' : a.longest.text}
              </div>
            </div>
          )}

          {a.count > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={bar}>
                <div style={sectionTitle}>📋 대사 목록 ({a.count}개)</div>
                <button className="minibtn" onClick={() => setShowList((v) => !v)}>
                  {showList ? '접기 ▲' : '펼치기 ▼'}
                </button>
              </div>
              {showList && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {a.dialogues.slice(0, 200).map((d, i) => (
                    <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{i + 1}.</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{d.text.length > 120 ? d.text.slice(0, 120) + '…' : d.text}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{d.len}자</span>
                    </div>
                  ))}
                  {a.dialogues.length > 200 && (
                    <div style={hint}>대사가 많아 200개까지만 표시합니다.</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={bar}>
            <div style={hint}>따옴표로 감싼 구간만 대사로 셉니다(영어 축약형 보정 포함). 비율은 공백 제외 글자수 기준 근사값입니다.</div>
            <button className="btn-primary" onClick={copy}>{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
