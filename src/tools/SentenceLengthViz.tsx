// 문장 길이 시각화 — 텍스트를 문장 단위로 분리해 각 문장 길이를 막대 그래프로 보여준다.
// 평균/최장/최단 길이, 너무 긴 문장(40자+) 강조로 글의 리듬을 점검한다.
// 외부 API 없음(전부 로컬 정규식·계산). react 외 import 없음. 타이머는 복사 피드백용이며 언마운트 시 정리.
import { useState, useMemo, useRef, useEffect } from 'react'

export const meta = { id: 'sentence-length-viz', name: '문장 길이 시각화', icon: '📊', group: '교정·언어', intro: '문장 길이를 막대 그래프로 보여주고 너무 긴 문장을 짚어 글의 리듬을 점검합니다', w: 480, h: 620 }

// 너무 긴 문장 기준(글자 수, 공백 제외)
const LONG_THRESHOLD = 40

interface SentInfo { text: string; len: number; idx: number; isLong: boolean }

// 문장 분리: 마침표/물음표/느낌표(연속 포함, 줄임표 등)와 개행을 경계로 자른다. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 문장 길이: 공백을 제외한 글자 수(체감 분량에 더 가깝다)
function sentenceLength(s: string): number {
  return s.replace(/\s+/g, '').length
}

export default function SentenceLengthViz({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 피드백 타이머 정리
  useEffect(() => {
    return () => {
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
    const raw = splitSentences(trimmed)
    if (raw.length === 0) return null

    const sents: SentInfo[] = raw.map((s, idx) => {
      const len = sentenceLength(s)
      return { text: s, len, idx, isLong: len >= LONG_THRESHOLD }
    })

    const lengths = sents.map((s) => s.len)
    const n = sents.length
    const total = lengths.reduce((a, b) => a + b, 0)
    const avg = n > 0 ? total / n : 0
    const max = Math.max(...lengths)
    const min = Math.min(...lengths)
    const longCount = sents.filter((s) => s.isLong).length
    // 길이 표준편차(리듬의 다양성 지표): 클수록 장·단문이 섞여 리듬이 살아 있다.
    const variance = n > 0 ? lengths.reduce((a, b) => a + (b - avg) * (b - avg), 0) / n : 0
    const stdev = Math.sqrt(variance)

    const longest = sents.reduce((a, b) => (b.len > a.len ? b : a), sents[0])
    const shortest = sents.reduce((a, b) => (b.len < a.len ? b : a), sents[0])

    return { sents, n, total, avg, max, min, longCount, stdev, longest, shortest }
  }, [text])

  const summaryText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[문장 길이 점검 결과]')
    lines.push(`문장 ${a.n}개 · 총 ${a.total}자(공백 제외)`)
    lines.push(`평균 길이: ${a.avg.toFixed(1)}자`)
    lines.push(`최장: ${a.max}자 / 최단: ${a.min}자`)
    lines.push(`길이 편차(다양성): ${a.stdev.toFixed(1)}`)
    lines.push(`너무 긴 문장(${LONG_THRESHOLD}자+): ${a.longCount}개`)
    return lines.join('\n')
  }, [analysis])

  const copy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 16 }

  const a = analysis
  // 막대 최대 폭 기준(최장 문장이 100%가 되도록)
  const scaleMax = a ? Math.max(a.max, 1) : 1

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}>📊 점검할 글을 붙여넣으세요</div>
        <button className="minibtn" onClick={() => setText('')} disabled={!text}>↺ 지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 글을 붙여넣으세요. 문장 부호(. ? !)와 줄바꿈으로 문장을 나눠 길이를 막대로 보여줍니다."
        spellCheck={false}
        aria-label="문장 길이 시각화 입력"
      />

      {!a ? (
        <div style={empty}>
          글을 입력하면 문장마다 길이 막대가 그려지고<br />평균·최장·최단과 너무 긴 문장이 표시됩니다.
        </div>
      ) : (
        <div style={scroll}>
          <div style={grid4}>
            <div style={stat}><div style={statVal}>{a.n}</div><div style={statLabel}>문장 수</div></div>
            <div style={stat}><div style={statVal}>{a.avg.toFixed(1)}</div><div style={statLabel}>평균 길이</div></div>
            <div style={stat}><div style={statVal}>{a.max}</div><div style={statLabel}>최장</div></div>
            <div style={stat}><div style={statVal}>{a.min}</div><div style={statLabel}>최단</div></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={bar}>
              <div style={sectionTitle}>📈 문장별 길이 (공백 제외 글자 수)</div>
              <div style={hint}>{LONG_THRESHOLD}자 이상 강조 · 길이 편차 {a.stdev.toFixed(1)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {a.sents.map((s) => {
                const pct = Math.max(2, Math.round((s.len / scaleMax) * 100))
                const color = s.isLong ? 'var(--warn)' : 'var(--accent)'
                return (
                  <div key={s.idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={s.text}>
                    <div style={{ width: 26, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{s.idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0, height: 18, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .25s' }} />
                    </div>
                    <div style={{ width: 30, textAlign: 'right', fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{s.len}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {a.longCount > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>⚠️ 너무 긴 문장 ({a.longCount}개) — 끊어 쓰면 리듬이 살아납니다</div>
              {a.sents.filter((s) => s.isLong).slice(0, 12).map((s) => (
                <div key={s.idx} style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--warn)', fontWeight: 700, fontSize: 11, marginRight: 6 }}>{s.idx + 1}번 · {s.len}자</span>
                  <span style={{ color: 'var(--text)' }}>{s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
              ✓ {LONG_THRESHOLD}자를 넘는 문장이 없습니다. 호흡이 안정적이에요.
            </div>
          )}

          <div style={hint}>
            길이 편차가 클수록 장·단문이 섞여 리듬이 살아 있습니다. 비슷한 길이만 이어지면 단조롭게 읽힐 수 있어요.
          </div>

          <div style={bar}>
            <div style={hint}>공백을 제외한 글자 수 기준으로 로컬 계산합니다.</div>
            <button className="btn-primary" onClick={copy}>{copied ? '✓ 복사됨' : '📋 결과 복사'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
