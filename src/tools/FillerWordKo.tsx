// 군더더기 표현 점검 — textarea 에 붙여넣으면 그리고/그래서/하지만/사실/정말/그냥/약간/뭔가 등
// 접속·간투사·강조 부사 같은 '군더더기'의 빈도를 로컬에서 집계해 상위 목록과 과다 경고, 문장 다이어트 팁을 보여준다.
// 자급식: react 외 import 없음. 외부 네트워크·API 키 불필요(100% 로컬 정규식·계산). 언마운트 시 복사 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'filler-word-ko', name: '군더더기 표현 점검', icon: '🧹', group: '교정·언어', intro: '그리고·사실·정말·그냥 같은 군더더기 말버릇을 집계해 과다 사용을 짚고 문장 다이어트를 돕습니다', w: 520, h: 600 }

// ── 군더더기 사전 ───────────────────────────────────────────────
// cat: 분류 / words: 표면형(가장 긴 것부터 매칭되도록 정렬은 빌드 시 처리) / tip: 다이어트 팁
type Cat = '접속' | '간투사' | '강조' | '완충' | '상투'
interface FillerDef {
  cat: Cat
  words: string[]
  tip: string
}

const FILLERS: FillerDef[] = [
  {
    cat: '접속',
    words: ['그리고', '그래서', '그러나', '하지만', '그런데', '그러므로', '따라서', '또한', '게다가', '아울러', '그리하여', '그렇지만', '한편'],
    tip: '문장 첫머리의 접속어는 대개 빼도 흐름이 이어집니다. 정말 필요한 곳만 남기세요.',
  },
  {
    cat: '간투사',
    words: ['음', '어', '뭐', '뭔가', '저기', '그', '이제', '막', '좀', '그냥', '딱', '되게'],
    tip: '말버릇에서 온 간투사는 글에서 군더더기로 읽힙니다. 대부분 삭제해도 무방합니다.',
  },
  {
    cat: '강조',
    words: ['정말', '진짜', '너무', '매우', '아주', '굉장히', '엄청', '완전', '무척', '대단히', '몹시', '워낙'],
    tip: '강조 부사를 남발하면 오히려 힘이 빠집니다. 구체적 묘사로 바꾸거나 하나만 남기세요.',
  },
  {
    cat: '완충',
    words: ['사실', '솔직히', '개인적으로', '어떻게 보면', '말하자면', '이를테면', '어찌 보면', '약간', '조금', '다소', '거의', '대체로', '일종의', '일단', '아마', '아마도', '왠지', '어쩌면'],
    tip: '단정을 피하려는 완충어는 글을 흐릿하게 만듭니다. 주장을 분명히 할 곳에선 덜어내세요.',
  },
  {
    cat: '상투',
    words: ['것 같다', '인 것 같다', '라고 생각한다', '라고 본다', '하는 부분', '있어서', '의 경우', '에 대해서', '에 대한', '를 통해서', '를 통해', '에 있어서', '함에 있어'],
    tip: '상투적 군말은 문장을 늘어뜨립니다. 능동·간결한 표현으로 다듬으면 또렷해집니다.',
  },
]

const CAT_COLOR: Record<Cat, string> = {
  접속: 'var(--accent)',
  간투사: 'var(--warn)',
  강조: 'var(--warn)',
  완충: 'var(--muted)',
  상투: 'var(--muted)',
}

// 정규식 특수문자 이스케이프
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 표면형 → 정의 역참조 테이블 + 매칭용 통합 정규식
// 긴 표현이 먼저 매칭되도록 길이 내림차순으로 정렬한다.
interface FillerEntry { word: string; cat: Cat; tip: string }
const ENTRIES: FillerEntry[] = (() => {
  const list: FillerEntry[] = []
  for (const f of FILLERS) for (const w of f.words) list.push({ word: w, cat: f.cat, tip: f.tip })
  list.sort((a, b) => b.word.length - a.word.length)
  return list
})()
const ENTRY_MAP: Record<string, FillerEntry> = (() => {
  const m: Record<string, FillerEntry> = {}
  for (const e of ENTRIES) if (!m[e.word]) m[e.word] = e
  return m
})()
// 통합 정규식(전역). 한글 단어 경계 대용으로, 매칭 후 앞뒤가 같은 한글 음절에 붙어있지 않은지 별도 검증한다.
const MASTER_RE = new RegExp(ENTRIES.map((e) => esc(e.word)).join('|'), 'g')

// ── 분석 ───────────────────────────────────────────────
interface CountRow { word: string; cat: Cat; tip: string; count: number; per1000: number }
interface Analysis {
  rows: CountRow[]          // 빈도순 정렬된 군더더기 목록(0 제외)
  totalFiller: number       // 군더더기 총 횟수
  totalChars: number        // 공백 제외 글자 수
  totalWords: number        // 어절 수(공백 기준)
  sentenceCount: number     // 문장 수
  fillerPerSentence: number // 문장당 군더더기
  ratio: number             // 군더더기 어절 비율(0~1)
  warnings: { word: string; count: number; per1000: number }[] // 과다 경고
}

// 매칭이 '단어'로서 유효한지: 매치 앞뒤가 다른 한글 음절과 직접 붙어있으면(합성어 내부) 제외.
function isWordBoundary(text: string, start: number, end: number, word: string): boolean {
  const before = start > 0 ? text[start - 1] : ''
  const after = end < text.length ? text[end] : ''
  // 한 글자 간투사(음/어/그/막/좀/딱 등)는 합성어 오탐이 잦으므로 양옆 모두 비한글일 때만 인정
  const isHangul = (ch: string) => /[가-힣]/.test(ch)
  if (word.length === 1) {
    return !isHangul(before) && !isHangul(after)
  }
  // 다글자 표현은 앞이 한글에 붙으면(앞말 일부일 가능성) 제외. 뒤는 조사·어미가 붙을 수 있어 허용.
  if (isHangul(before)) {
    // 단, 접속어/완충어가 문두·공백 뒤가 아니라 앞말에 바로 붙은 경우만 거른다.
    return false
  }
  return true
}

function analyze(text: string): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const counts: Record<string, number> = {}
  MASTER_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = MASTER_RE.exec(text)) !== null) {
    if (guard++ > 100000) break
    const w = m[0]
    const start = m.index
    const end = start + w.length
    if (isWordBoundary(text, start, end, w)) {
      counts[w] = (counts[w] || 0) + 1
    }
    if (m.index === MASTER_RE.lastIndex) MASTER_RE.lastIndex++ // 0-길이 방지(이론상 없음)
  }

  const totalChars = (text.replace(/\s/g, '').match(/[\s\S]/g) || []).length
  const words = trimmed.split(/\s+/).filter(Boolean)
  const totalWords = words.length
  const sentences = trimmed.split(/(?<=[.!?。！？…])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
  const sentenceCount = sentences.length || 1

  const rows: CountRow[] = Object.keys(counts)
    .map((w) => {
      const e = ENTRY_MAP[w]
      const count = counts[w]
      return {
        word: w,
        cat: e ? e.cat : ('상투' as Cat),
        tip: e ? e.tip : '',
        count,
        per1000: totalChars > 0 ? (count / totalChars) * 1000 : 0,
      }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))

  const totalFiller = rows.reduce((a, r) => a + r.count, 0)
  const ratio = totalWords > 0 ? Math.min(1, totalFiller / totalWords) : 0
  const fillerPerSentence = totalFiller / sentenceCount

  // 과다 경고: 천자당 8회 이상이거나 절대 5회 이상 등장한 표현
  const warnings = rows
    .filter((r) => r.per1000 >= 8 || r.count >= 5)
    .map((r) => ({ word: r.word, count: r.count, per1000: r.per1000 }))

  return { rows, totalFiller, totalChars, totalWords, sentenceCount, fillerPerSentence, ratio, warnings }
}

// 전체 다이어트 등급
function dietGrade(ratio: number): { label: string; color: string } {
  const pct = ratio * 100
  if (pct < 3) return { label: '담백함', color: 'var(--ok)' }
  if (pct < 6) return { label: '양호', color: 'var(--ok)' }
  if (pct < 10) return { label: '약간 군살', color: 'var(--warn)' }
  return { label: '군더더기 과다', color: 'var(--warn)' }
}

const SAMPLE = '그리고 사실 나는 그냥 정말 너무 피곤했다. 하지만 어쩌면 그게 좋은 것 같다. 그런데 솔직히 약간 걱정도 되고, 뭔가 진짜 막막한 느낌이 들었다. 그래서 일단 조금 쉬기로 했는데, 사실 그냥 계속 일하는 게 나은 것 같다는 생각도 들었다. 정말 너무 복잡한 부분이 많아서, 아마도 다시 생각해 봐야 할 것 같다.'

export default function FillerWordKo() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeCat, setActiveCat] = useState<'all' | Cat>('all')
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const analysis = useMemo(() => {
    try { return analyze(text) } catch { return null }
  }, [text])

  const catCounts = useMemo(() => {
    const c: Record<Cat, number> = { 접속: 0, 간투사: 0, 강조: 0, 완충: 0, 상투: 0 }
    if (analysis) for (const r of analysis.rows) c[r.cat] += r.count
    return c
  }, [analysis])

  const shownRows = useMemo(() => {
    if (!analysis) return []
    return activeCat === 'all' ? analysis.rows : analysis.rows.filter((r) => r.cat === activeCat)
  }, [analysis, activeCat])

  const resultText = useMemo(() => {
    if (!analysis || analysis.rows.length === 0) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[군더더기 표현 점검 결과]')
    lines.push(`전체 어절 ${a.totalWords} · 글자(공백제외) ${a.totalChars} · 문장 ${a.sentenceCount}개`)
    lines.push(`군더더기 총 ${a.totalFiller}회 · 비율 ${(a.ratio * 100).toFixed(1)}% · 문장당 ${a.fillerPerSentence.toFixed(1)}회`)
    lines.push('')
    lines.push('— 상위 군더더기 —')
    a.rows.forEach((r, i) => {
      lines.push(`${i + 1}. "${r.word}" [${r.cat}] ${r.count}회 (천자당 ${r.per1000.toFixed(1)})`)
    })
    if (a.warnings.length > 0) {
      lines.push('')
      lines.push('— 과다 사용 경고 —')
      for (const w of a.warnings) lines.push(`· "${w.word}" ${w.count}회 — 덜어내길 권합니다`)
    }
    return lines.join('\n')
  }, [analysis])

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

  const a = analysis
  const grade = a ? dietGrade(a.ratio) : null
  const maxCount = a && a.rows.length > 0 ? a.rows[0].count : 1

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }

  const ScoreBig = () => grade && a ? (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: grade.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], minWidth: 70, textAlign: 'center' }}>
        {(a.ratio * 100).toFixed(1)}<span style={{ fontSize: 14 }}>%</span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: grade.color }}>{grade.label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>전체 어절 중 군더더기 비율 · 문장당 {a.fillerPerSentence.toFixed(1)}회</div>
        <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, a.ratio * 100 * 6)}%`, height: '100%', background: grade.color, transition: 'width .3s' }} />
        </div>
      </div>
    </div>
  ) : null

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}><Emoji e="🧹"/> 군더더기 말버릇을 로컬에서 집계합니다 (네트워크 불필요)</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="점검할 글을 여기에 붙여넣으세요. 그리고·사실·정말·그냥 같은 군더더기 빈도를 실시간 집계합니다."
        spellCheck={false}
        aria-label="군더더기 점검 텍스트 입력"
      />

      <div style={chipRow}>
        <span style={chip(activeCat === 'all', 'var(--accent)')} onClick={() => setActiveCat('all')} role="button" tabIndex={0}>전체 {a ? a.totalFiller : 0}</span>
        {(['접속', '간투사', '강조', '완충', '상투'] as Cat[]).map((c) => (
          <span key={c} style={chip(activeCat === c, CAT_COLOR[c])} onClick={() => setActiveCat(c)} role="button" tabIndex={0}>{c} {catCounts[c]}</span>
        ))}
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={!a || a.rows.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {!a ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}><Emoji e="🧹"/></div>
          <div>글을 붙여넣으면 그리고·그래서·하지만·사실·정말·<br />그냥·약간·뭔가 같은 군더더기 빈도를 집계합니다.</div>
          <div style={hint}>접속어·간투사·강조 부사·완충어·상투구를 분류해 과다 사용을 짚어드립니다.</div>
        </div>
      ) : a.rows.length === 0 ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}><Emoji e="✅"/></div>
          <div>발견된 군더더기 표현이 없습니다. 담백한 글입니다!</div>
        </div>
      ) : (
        <div style={scroll}>
          <div style={grid3}>
            <div style={stat}><div style={statVal}>{a.totalFiller}</div><div style={statLabel}>군더더기 총 횟수</div></div>
            <div style={stat}><div style={statVal}>{a.totalWords}</div><div style={statLabel}>전체 어절</div></div>
            <div style={stat}><div style={statVal}>{a.sentenceCount}</div><div style={statLabel}>문장 수</div></div>
          </div>

          <ScoreBig />

          {a.warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}><Emoji e="⚠️"/> 과다 사용 ({a.warnings.length}개) — 덜어내면 글이 또렷해집니다</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {a.warnings.map((w) => (
                  <span key={w.word} style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '5px 9px', fontSize: 13 }}>
                    <b style={{ color: 'var(--warn)' }}>{w.word}</b>
                    <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>{w.count}회 · 천자당 {w.per1000.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}><Emoji e="📊"/> 상위 군더더기 {activeCat !== 'all' ? `· ${activeCat}` : ''} ({shownRows.length})</div>
            {shownRows.length === 0 ? (
              <div style={hint}>선택한 분류에 해당하는 표현이 없습니다.</div>
            ) : (
              shownRows.map((r) => (
                <div key={r.word} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={tag(CAT_COLOR[r.cat])}>{r.cat}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.word}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{r.count}회</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>천자당 {r.per1000.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--chrome-2)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((r.count / maxCount) * 100)}%`, height: '100%', background: CAT_COLOR[r.cat], transition: 'width .3s' }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}><Emoji e="✂️"/> 문장 다이어트 팁</div>
            {[...new Set(shownRows.map((r) => r.tip).filter(Boolean))].slice(0, 5).map((t, i) => (
              <div key={i} style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                {t}
              </div>
            ))}
          </div>

          <div style={hint}>형태소 분석 없이 표면형을 정규식으로 집계한 근사값입니다. 의도된 강조·반복은 그대로 두셔도 됩니다.</div>
        </div>
      )}
    </div>
  )
}
