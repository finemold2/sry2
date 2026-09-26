// 위키낱말사전 패널 — 단어의 정의/품사를 조회한다.
// Wikimedia REST API(키 불필요·https·CORS 허용: access-control-allow-origin: *) 사용.
// ko.wiktionary 우선 시도 후 미지원/없으면 en.wiktionary 로 폴백. 정의 목록과 예문을 보여주고 복사한다.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'wiktionary-panel', name: '위키낱말사전', icon: '📚', group: '언어·어휘', intro: '단어의 정의·품사를 위키낱말사전에서 조회', w: 440, h: 580 }

// REST definition API 응답 타입(언어코드 → 항목 배열)
interface WkExample { example?: string }
interface WkDefinition { definition?: string; parsedExamples?: WkExample[]; examples?: string[] }
interface WkEntry { partOfSpeech?: string; language?: string; definitions?: WkDefinition[] }
type WkResponse = Record<string, WkEntry[]>

interface Def { text: string; examples: string[] }
interface Sense { partOfSpeech: string; defs: Def[] }
interface Result { word: string; source: string; senses: Sense[] }

// 영어로 내려오는 품사 라벨을 한국어로 매핑(소문자 비교)
const POS_KO: Record<string, string> = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
  pronoun: '대명사', preposition: '전치사', conjunction: '접속사',
  interjection: '감탄사', determiner: '한정사', article: '관사', numeral: '수사',
  particle: '조사', suffix: '접미사', prefix: '접두사', 'proper noun': '고유명사',
  phrase: '구', idiom: '관용구', symbol: '기호', abbreviation: '약어',
  contraction: '축약형', 'verb form': '동사형', 'noun form': '명사형',
}

const SOURCES: { lang: string; label: string }[] = [
  { lang: 'ko', label: '한국어' },
  { lang: 'en', label: '영어' },
]

// HTML 태그/엔티티 제거 — 정의·예문은 HTML 조각으로 내려온다.
function stripHtml(html: string): string {
  if (!html) return ''
  let s = html.replace(/<[^>]*>/g, ' ')
  // 흔한 HTML 엔티티 복원
  const ent: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
  }
  s = s.replace(/&[a-zA-Z#0-9]+;/g, (m) => ent[m] ?? ' ')
  return s.replace(/\s+/g, ' ').trim()
}

function posLabel(pos: string): string {
  const key = (pos || '').trim().toLowerCase()
  return POS_KO[key] || pos || '기타'
}

// 한 언어의 응답을 표준 구조로 변환
function parseEntries(entries: WkEntry[], lang: string): Result | null {
  if (!Array.isArray(entries) || !entries.length) return null
  const senses: Sense[] = []
  for (const e of entries) {
    const defs: Def[] = []
    for (const d of (e.definitions || [])) {
      const text = stripHtml(d.definition || '')
      if (!text) continue
      const examples: string[] = []
      for (const ex of (d.parsedExamples || [])) {
        const t = stripHtml(ex.example || '')
        if (t) examples.push(t)
      }
      for (const ex of (d.examples || [])) {
        const t = stripHtml(ex)
        if (t && !examples.includes(t)) examples.push(t)
      }
      defs.push({ text, examples: examples.slice(0, 3) })
    }
    if (defs.length) senses.push({ partOfSpeech: e.partOfSpeech || '', defs: defs.slice(0, 8) })
  }
  if (!senses.length) return null
  const src = SOURCES.find((s) => s.lang === lang)?.label || lang
  return { word: '', source: src, senses }
}

// ko 우선 → 실패/없음 시 en 폴백
async function lookup(word: string, signal: AbortSignal): Promise<Result> {
  const w = word.trim()
  let lastErr: unknown = null
  for (const { lang } of SOURCES) {
    try {
      const url = `https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`
      const r = await fetch(url, { signal, headers: { accept: 'application/json' } })
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status}`); continue }
      const j: WkResponse = await r.json()
      // 해당 언어 항목 우선, 없으면 응답에 담긴 첫 항목 배열 사용
      const entries = j[lang] || Object.values(j)[0] || []
      const parsed = parseEntries(entries, lang)
      if (parsed) { parsed.word = w; return parsed }
    } catch (e) {
      if (signal.aborted) throw e
      lastErr = e
    }
  }
  throw lastErr || new Error('not found')
}

export default function WiktionaryPanel() {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const acRef = useRef<AbortController | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리: 진행 중 요청 취소 + 타이머 해제
  useEffect(() => () => {
    acRef.current?.abort()
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const run = async (word: string) => {
    const w = word.trim()
    if (!w) { setErr('조회할 단어를 입력하세요.'); return }
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setCopied(''); setResult(null)
    try {
      const res = await lookup(w, ac.signal)
      if (!ac.signal.aborted) setResult(res)
    } catch (e) {
      if (ac.signal.aborted) return
      setResult(null)
      setErr(`'${w}'의 정의를 찾지 못했습니다. 철자를 확인하거나 다른 단어로 시도하세요.`)
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  const copyAll = () => {
    if (!result) return
    const lines: string[] = [result.word]
    for (const s of result.senses) {
      lines.push(`\n[${posLabel(s.partOfSpeech)}]`)
      s.defs.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.text}`)
        d.examples.forEach((ex) => lines.push(`   예: ${ex}`))
      })
    }
    copy(lines.join('\n'), '전체')
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') run(q) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', background: 'var(--panel)', boxSizing: 'border-box' }}>
      {/* 검색 바 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="단어 입력 (예: 사랑, love)"
          spellCheck={false}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 14, minWidth: 0,
            border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', outline: 'none',
          }}
        />
        <button className="btn-primary" onClick={() => run(q)} disabled={loading}>🔍 조회</button>
      </div>

      {result && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyAll}>📋 전체 복사{copied === '전체' ? ' ✓' : ''}</button>
        </div>
      )}

      {/* 본문 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 12, borderRadius: 10, minHeight: 0,
        border: '1px solid var(--border)', background: 'var(--paper)',
      }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>찾는 중…</div>}

        {!loading && err && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, lineHeight: 1.6 }}>{err}</div>
        )}

        {!loading && !err && !result && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, lineHeight: 1.7 }}>
            단어를 조회하면 <b>위키낱말사전</b>의 품사별 정의와 예문을 보여줍니다.<br />
            한국어 단어는 한국어판을, 없으면 영어판에서 찾습니다.
          </div>
        )}

        {!loading && !err && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 표제어 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{result.word}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 999, color: 'var(--muted)',
                background: 'var(--chrome-2)', border: '1px solid var(--border)',
              }}>
                {result.source} 위키낱말사전
              </span>
            </div>

            {/* 품사별 정의 */}
            {result.senses.map((s, si) => (
              <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 999, background: 'var(--chrome-2)', color: 'var(--accent)',
                  border: '1px solid var(--border)',
                }}>
                  {posLabel(s.partOfSpeech)}
                </div>
                {s.defs.map((d, di) => (
                  <div key={di} style={{
                    padding: '8px 10px', borderRadius: 8, background: 'var(--panel)',
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ lineHeight: 1.55 }}>
                      <span style={{ color: 'var(--muted)', marginRight: 6 }}>{di + 1}.</span>{d.text}
                    </div>
                    {d.examples.map((ex, ei) => (
                      <div key={ei} style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        “{ex}”
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <button
                        className="minibtn"
                        onClick={() => copy(d.examples.length ? `${d.text}\n예: ${d.examples.join(' / ')}` : d.text, `${si}-${di}`)}
                      >
                        📋 복사{copied === `${si}-${di}` ? ' ✓' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        출처: 위키낱말사전(Wiktionary) · 키 없는 공개 API
      </div>
    </div>
  )
}
