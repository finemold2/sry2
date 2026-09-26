// 동의어로 다양화 — 텍스트를 붙여넣으면 과다 반복된 단어를 빈도순으로 찾아준다.
// 영단어는 Datamuse 공개 API(키 불필요·https·CORS 허용)로 유의어(ml=뜻이 가까운 말)를 제안해
// 표현 반복을 해소하도록 돕고, 한국어 단어는 형태소 분석이 어려워 빈도만 표시한다.
// react 외 import 없음. 외부 API 는 Datamuse 만(https). nonce ref 로 경쟁상태 방지, 언마운트 시 정리.
import { useState, useMemo, useRef, useEffect } from 'react'

export const meta = { id: 'synonym-variety', name: '동의어로 다양화', icon: '🔁', group: '교정·언어', intro: '과다 반복된 단어를 찾아 영단어는 유의어를 제안해 표현 반복을 해소합니다', w: 480, h: 640 }

// ── 토큰/빈도 분석(전부 로컬) ─────────────────────────────────────
// 영어 불용어: 반복돼도 자연스러운 기능어는 제외.
const EN_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with',
  'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'do', 'does', 'did', 'have',
  'has', 'had', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'there', 'here',
  'so', 'no', 'not', 'too', 'very', 'just', 'than', 'then', 'from', 'up', 'out', 'about', 'into',
  'over', 'after', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'shall',
  'who', 'whom', 'what', 'which', 'when', 'where', 'why', 'how', 'all', 'any', 'each', 'few',
  'more', 'most', 'some', 'such', 'only', 'own', 'same', 'also', 'one', 's', 't', 're', 've', 'll', 'd', 'm',
])

// 한국어 흔한 조사/어미는 단어에 붙어있어 정확히 떼기 어렵다 → 분석은 공백 토큰 기준으로만 한다.
interface WordStat { word: string; count: number; lang: 'en' | 'ko' }

function analyze(text: string): { stats: WordStat[]; total: number } {
  // 영단어: 알파벳 토큰 / 한국어: 한글 토큰. 각각 소문자/원형 키로 집계.
  const enMap = new Map<string, number>()
  const koMap = new Map<string, number>()

  const enTokens = text.match(/[A-Za-z][A-Za-z'’-]*/g) || []
  for (const raw of enTokens) {
    const w = raw.toLowerCase().replace(/[^a-z]/g, '')
    if (w.length < 3 || EN_STOP.has(w)) continue
    enMap.set(w, (enMap.get(w) || 0) + 1)
  }

  // 한국어: 한글이 포함된 공백 단위 토큰. 2글자 이상만.
  const koTokens = text.split(/\s+/).filter((t) => /[가-힣]/.test(t))
  for (const raw of koTokens) {
    // 양끝 구두점 제거
    const w = raw.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, '')
    if (w.length < 2 || !/[가-힣]/.test(w)) continue
    koMap.set(w, (koMap.get(w) || 0) + 1)
  }

  const stats: WordStat[] = []
  for (const [word, count] of enMap) if (count >= 2) stats.push({ word, count, lang: 'en' })
  for (const [word, count] of koMap) if (count >= 2) stats.push({ word, count, lang: 'ko' })
  // 빈도 내림차순, 같으면 알파벳/가나다순
  stats.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'ko'))

  const total = enTokens.length + koTokens.length
  return { stats, total }
}

interface DMWord { word: string; score?: number }

const SAMPLE = `The detective was very tired. The case was difficult and the detective could not sleep. He looked at the difficult evidence again. The room was dark and quiet. The detective thought the case felt impossible, but he was a stubborn detective. The dark room grew darker. He walked to the dark window and looked out at the quiet street, thinking about the difficult, difficult truth.`

export default function SynonymVariety() {
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null) // 선택된 영단어(소문자)
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      nonce.current++ // 진행 중 요청 결과 무효화
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
    }
  }, [])

  const { stats, total } = useMemo(() => analyze(text), [text])

  const fetchSynonyms = async (word: string) => {
    const w = word.trim().toLowerCase()
    if (!w) return
    const my = ++nonce.current
    setSelected(w); setLoading(true); setErr(''); setSynonyms([])
    try {
      const r = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(w)}&max=8`)
      if (!r.ok) throw new Error('bad response')
      const j: DMWord[] = await r.json()
      const list = (Array.isArray(j) ? j : [])
        .map((x) => x.word)
        .filter((x): x is string => !!x && x.toLowerCase() !== w)
      if (mounted.current && my === nonce.current) setSynonyms(list)
    } catch {
      if (mounted.current && my === nonce.current) setErr('유의어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.')
    } finally {
      if (mounted.current && my === nonce.current) setLoading(false)
    }
  }

  const copy = (s: string) => {
    navigator.clipboard?.writeText(s).then(() => {
      if (!mounted.current) return
      setCopied(s)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1200)
    }).catch(() => {})
  }

  const enCount = stats.filter((s) => s.lang === 'en').length
  const koCount = stats.filter((s) => s.lang === 'ko').length
  const maxCount = stats.length ? stats[0].count : 0
  const selectedStat = selected ? stats.find((s) => s.word === selected && s.lang === 'en') : undefined

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
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: active ? 'var(--chrome-2)' : 'var(--panel)',
    boxShadow: active ? 'inset 0 0 0 1px var(--accent)' : 'none',
  })

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}>🔁 글을 붙여넣어 반복 단어를 찾으세요</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setText(SAMPLE)} disabled={!!text} title="예시 글 넣기">예시</button>
          <button className="minibtn" onClick={() => { setText(''); setSelected(null); setSynonyms([]); setErr('') }} disabled={!text}>↺ 지우기</button>
        </div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 글을 붙여넣으세요. 2회 이상 반복된 단어를 빈도순으로 찾아, 영단어는 클릭하면 유의어를 제안합니다."
        spellCheck={false}
        aria-label="동의어 다양화 입력"
      />

      {!text.trim() ? (
        <div style={empty}>
          글을 붙여넣으면 과다 반복된 단어를 빈도순으로 보여줍니다.<br />
          영단어를 누르면 <b>Datamuse</b>로 유의어를 찾아<br />표현 반복을 해소할 수 있어요.<br />
          (한국어 단어는 빈도만 표시합니다)
        </div>
      ) : stats.length === 0 ? (
        <div style={empty}>
          2회 이상 반복된 단어가 없습니다.<br />표현이 잘 다양화되어 있네요. 👍
        </div>
      ) : (
        <div style={scroll}>
          <div style={hint}>
            전체 {total}개 토큰 중 반복어 {stats.length}개 (영어 {enCount} · 한국어 {koCount}).
            {enCount > 0 ? ' 영단어를 눌러 유의어를 확인하세요.' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.slice(0, 40).map((s) => {
              const active = selected === s.word && s.lang === 'en'
              const isEn = s.lang === 'en'
              const barW = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0
              return (
                <div
                  key={s.lang + ':' + s.word}
                  style={{ ...rowStyle(active), cursor: isEn ? 'pointer' : 'default' }}
                  onClick={isEn ? () => fetchSynonyms(s.word) : undefined}
                  title={isEn ? '클릭하면 유의어를 찾습니다' : '한국어 단어는 빈도만 표시'}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                    background: isEn ? 'var(--accent)' : 'var(--chrome-2)',
                    color: isEn ? '#fff' : 'var(--muted)', flexShrink: 0,
                  }}>{isEn ? 'EN' : 'KO'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.word}</span>
                  <div style={{ flex: 1, minWidth: 24, height: 6, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${barW}%`, height: '100%', background: isEn ? 'var(--accent)' : 'var(--warn)', transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{s.count}회</span>
                  {isEn && <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{active ? '▾' : '›'}</span>}
                </div>
              )
            })}
            {stats.length > 40 && <div style={hint}>… 외 {stats.length - 40}개 더 (상위 40개만 표시)</div>}
          </div>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div style={bar}>
                <div style={sectionTitle}>
                  <b style={{ color: 'var(--accent)' }}>{selected}</b>
                  {selectedStat ? ` (${selectedStat.count}회)` : ''} 의 유의어
                </div>
                <button className="minibtn" onClick={() => fetchSynonyms(selected)} disabled={loading}>🔄 다시</button>
              </div>
              {loading && <div style={hint}>불러오는 중…</div>}
              {err && !loading && <div style={hint}>{err}</div>}
              {!loading && !err && synonyms.length === 0 && <div style={hint}>유의어를 찾지 못했습니다.</div>}
              {!loading && !err && synonyms.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {synonyms.map((w, i) => (
                      <button
                        key={w + i}
                        onClick={() => copy(w)}
                        title="클릭하면 복사"
                        style={{
                          padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                          border: '1px solid var(--border)',
                          background: copied === w ? 'var(--ok)' : 'var(--chrome-2)',
                          color: copied === w ? '#fff' : 'var(--text)', transition: 'background .15s',
                        }}
                      >
                        {copied === w ? '✓ 복사됨' : w}
                      </button>
                    ))}
                  </div>
                  <div style={hint}>유의어를 클릭하면 복사됩니다 · 반복된 곳 일부를 바꿔 표현을 다양화하세요.</div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        반복 분석은 로컬 처리 · 유의어 데이터: Datamuse (키 불필요)
      </div>
    </div>
  )
}
