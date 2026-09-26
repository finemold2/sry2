// 단어 빈도 분석 — textarea 에 글을 붙여넣으면 어절(단어) 빈도 상위 30개를 막대로 보여준다.
// 한국어는 어절 끝의 조사·어미를 가볍게 떼어내(휴리스틱) 같은 낱말을 묶고, 불용어(은/는/이/가 등)
// 제외 토글을 제공한다. 자주 쓰는 단어(입버릇)를 자각해 글을 다듬는 용도.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 계산). 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'word-frequency', name: '단어 빈도 분석', icon: '📊', group: '교정·언어', intro: '글에서 자주 쓴 단어 상위 30개를 막대로 보여줍니다 (조사·불용어 제외 토글)', w: 480, h: 620 }

// ── 불용어(stopword) ───────────────────────────────────────────────
// 단독 토큰으로 흔히 떨어져 나오는 조사·접속·지시·대명사 등. 의미 약한 기능어 위주.
const STOPWORDS = new Set<string>([
  // 조사/보조사(단독 어절로 분리됐을 때)
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '에게', '께', '한테', '으로', '로',
  '와', '과', '도', '만', '까지', '부터', '보다', '처럼', '같이', '마다', '조차', '마저', '밖에',
  '이나', '나', '이라도', '라도', '든지', '든', '이며', '며', '하고', '랑', '이랑',
  // 접속/부사
  '그리고', '그러나', '그런데', '그래서', '하지만', '또', '또한', '즉', '및', '혹은', '또는',
  '따라서', '그러므로', '그러면', '그럼', '한편', '게다가', '더욱이', '아울러', '왜냐하면',
  // 지시/대명사/의존
  '이것', '그것', '저것', '이런', '그런', '저런', '이렇게', '그렇게', '저렇게',
  '여기', '거기', '저기', '이때', '그때', '나', '너', '우리', '저희', '그', '그녀', '것', '수', '때', '등',
  // 빈출 기능어/감탄
  '좀', '잘', '더', '못', '안', '안된', '아주', '매우', '너무', '정말', '진짜', '그냥', '약간',
  '뭐', '왜', '어디', '누가', '무슨', '어떤', '어느', '아', '음', '응', '네', '예', '아니',
  // 영어 흔한 불용어
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'them', 'his', 'her', 'their', 'my', 'your',
  'so', 'not', 'no', 'do', 'did', 'does', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'from', 'up', 'out', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'into', 'over',
])

// 한국어 어절 끝에 자주 붙는 조사·어미 후보(긴 것부터). 어간이 1글자 이상 남을 때만 떼어낸다.
const KO_SUFFIXES = [
  '으로부터', '에게서', '으로서', '으로써', '이라고', '라고', '에서는', '에서도', '에게는',
  '까지', '부터', '에게', '에서', '으로', '이라', '이며', '이고', '한테', '처럼', '같이',
  '마다', '조차', '마저', '밖에', '이나', '이란', '이든', '에는', '에도', '에만',
  '은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도', '만', '로', '나', '며',
]

interface WordCount { word: string; count: number }

// 토큰화: 한글 음절 묶음 / 라틴 단어 / 숫자 를 추출. 그 외 기호·공백은 구분자.
function tokenize(text: string): string[] {
  if (!text) return []
  const m = text.match(/[가-힣]+|[A-Za-z][A-Za-z'’-]*|[0-9]+/g)
  return m ? m : []
}

// 한국어 어절 정규화: 끝의 조사·어미를 한 번만 가볍게 제거(어간 보존). 비한글 토큰은 그대로.
function normalizeKo(tok: string): string {
  if (!/[가-힣]/.test(tok)) return tok
  if (tok.length <= 1) return tok
  for (const suf of KO_SUFFIXES) {
    if (tok.length > suf.length && tok.endsWith(suf)) {
      return tok.slice(0, tok.length - suf.length)
    }
  }
  return tok
}

interface Analysis {
  list: WordCount[]      // 빈도 내림차순(상위 30 잘라낸 것)
  totalTokens: number    // 집계 대상 토큰 총수(필터 적용 후)
  uniqueCount: number    // 고유 단어 수(필터 적용 후)
  maxCount: number       // 1위 빈도(막대 정규화용)
}

function analyze(text: string, opts: { excludeStop: boolean; stripJosa: boolean; minLen: number }): Analysis | null {
  const tokens = tokenize(text)
  if (tokens.length === 0) return null

  const map = new Map<string, number>()
  let total = 0
  for (const raw of tokens) {
    let w = opts.stripJosa ? normalizeKo(raw) : raw
    // 영어는 소문자로 통일해 같은 단어로 집계
    const cmp = /[A-Za-z]/.test(w) && !/[가-힣]/.test(w) ? w.toLowerCase() : w
    if (!cmp) continue
    if (cmp.length < opts.minLen) continue
    if (opts.excludeStop && STOPWORDS.has(cmp)) continue
    map.set(cmp, (map.get(cmp) || 0) + 1)
    total++
  }

  if (map.size === 0) return null

  const list = [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))

  const top = list.slice(0, 30)
  return {
    list: top,
    totalTokens: total,
    uniqueCount: map.size,
    maxCount: top.length > 0 ? top[0].count : 0,
  }
}

const SAMPLE = '나는 오늘 글을 썼다. 글을 쓰는 일은 어렵지만 즐겁다. 나는 매일 조금씩 글을 쓴다. 오늘의 글은 어제의 글보다 조금 더 길어졌다. 글을 쓰면서 나는 나를 더 잘 알게 된다. 그리고 글은 나를 자유롭게 한다.'

export default function WordFrequency({ payload }: { payload?: Record<string, unknown> }) {
  const initialText = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
  const [text, setText] = useState(initialText)
  const [excludeStop, setExcludeStop] = useState(true)
  const [stripJosa, setStripJosa] = useState(true)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const result = useMemo(() => {
    try {
      const t = text.trim()
      if (!t) return null
      return analyze(t, { excludeStop, stripJosa, minLen: 1 })
    } catch {
      return null
    }
  }, [text, excludeStop, stripJosa])

  const resultText = useMemo(() => {
    if (!result || result.list.length === 0) return ''
    const lines: string[] = []
    lines.push('[단어 빈도 — 상위 ' + result.list.length + '개]')
    lines.push('집계 단어 ' + result.totalTokens + '개 · 고유 ' + result.uniqueCount + '종' + (excludeStop ? ' · 불용어 제외' : ''))
    result.list.forEach((w, i) => {
      lines.push((i + 1) + '. ' + w.word + ' — ' + w.count + '회')
    })
    return lines.join('\n')
  }, [result, excludeStop])

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

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 92, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const ctrlRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const toggle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const statRow: React.CSSProperties = { display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }
  const statNum: React.CSSProperties = { color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }
  const rowS: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
  const rankS: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', width: 20, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const wordS: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text)', width: 96, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const barTrack: React.CSSProperties = { flex: 1, minWidth: 0, height: 16, background: 'var(--chrome-2)', borderRadius: 5, overflow: 'hidden' }
  const cntS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', width: 40, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>📊 글을 붙여넣으면 자주 쓴 단어를 셉니다 (네트워크 불필요)</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="분석할 글을 여기에 붙여넣으세요. 입력하는 동안 실시간으로 단어 빈도를 셉니다."
        spellCheck={false}
        aria-label="분석할 텍스트 입력"
      />

      <div style={ctrlRow}>
        <span
          style={toggle(excludeStop)}
          onClick={() => setExcludeStop((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExcludeStop((v) => !v) } }}
          title="은/는/이/가 등 조사·접속어 같은 의미 약한 단어를 집계에서 뺍니다"
        >{excludeStop ? '✓ ' : ''}불용어 제외</span>
        <span
          style={toggle(stripJosa)}
          onClick={() => setStripJosa((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStripJosa((v) => !v) } }}
          title="어절 끝의 조사·어미를 가볍게 떼어 같은 낱말로 묶습니다 (예: 글을·글은 → 글)"
        >{stripJosa ? '✓ ' : ''}조사 묶기</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={!result || result.list.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>📝</div>
          <div>글을 붙여넣으면 자주 쓴 단어 상위 30개를<br />막대그래프로 보여줍니다.</div>
          <div style={hint}>같은 단어를 너무 반복하지 않았는지(입버릇) 자각하는 데 도움이 됩니다.</div>
        </div>
      ) : !result || result.list.length === 0 ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>🔍</div>
          <div>집계할 단어가 없습니다. 글을 더 입력하거나<br />불용어 제외를 꺼 보세요.</div>
        </div>
      ) : (
        <>
          <div style={statRow}>
            <span>집계 단어 <span style={statNum}>{result.totalTokens}</span></span>
            <span>고유 <span style={statNum}>{result.uniqueCount}</span>종</span>
            <span>상위 <span style={statNum}>{result.list.length}</span>개 표시</span>
          </div>
          <div style={listWrap}>
            {result.list.map((w, i) => {
              const pct = result.maxCount > 0 ? Math.max(4, Math.round((w.count / result.maxCount) * 100)) : 0
              return (
                <div key={w.word + '-' + i} style={rowS}>
                  <span style={rankS}>{i + 1}</span>
                  <span style={wordS} title={w.word}>{w.word}</span>
                  <span style={barTrack}>
                    <span style={{ display: 'block', width: pct + '%', height: '100%', background: 'var(--accent)', borderRadius: 5, transition: 'width .25s' }} />
                  </span>
                  <span style={cntS}>{w.count}회</span>
                </div>
              )
            })}
            <div style={{ ...hint, marginTop: 6 }}>형태소 분석 없이 어절 단위로 센 근사값입니다. '조사 묶기'는 끝의 조사·어미를 휴리스틱으로 떼어냅니다.</div>
          </div>
        </>
      )}
    </div>
  )
}
