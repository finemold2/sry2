// 발음 유사어 찾기 — 말놀이·시·각운·동음이의·언어유희용. 한 단어와 "소리가 비슷한" 단어들을 모아준다.
// API: Datamuse(api.datamuse.com) sl=sounds-like — 키 불필요·https·CORS 허용.
//   https://api.datamuse.com/words?sl={word}&max=30
// 검색 기록은 localStorage('sry:tool:sound-alike-words')에 자동 저장/복원(추가·삭제·순서·전체삭제). 단어 클릭 시 복사.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'sound-alike-words', name: '발음 유사어', icon: '🔊', group: '언어·어휘', intro: '소리가 비슷한 단어들을 모아 말놀이·시·언어유희에 활용하세요', w: 460, h: 600 }

const LS_KEY = 'sry:tool:sound-alike-words'
const EXAMPLES = ['glamour', 'silence', 'shadow', 'whisper', 'ocean', 'wonder', 'tomorrow', 'echo', 'fortune', 'mirror', 'thunder', 'crimson']

interface Word { word: string; score?: number; numSyllables?: number }
interface HistItem { id: string; term: string; updated: number }

function loadHist(): HistItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    if (!Array.isArray(p)) return []
    return p.filter((x): x is HistItem => x && typeof x.id === 'string' && typeof x.term === 'string')
  } catch { return [] }
}

export default function SoundAlikeWords({ payload }: { payload?: Record<string, unknown> }) {
  const [input, setInput] = useState('')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [queried, setQueried] = useState('')
  const [copied, setCopied] = useState('')
  const [hist, setHist] = useState<HistItem[]>(() => loadHist())
  const nonce = useRef(0)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      nonce.current++          // 진행 중 요청 결과 무시
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 기록 영속화
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(hist)) } catch { /* 용량 초과 등 무시 */ }
  }, [hist])

  const pushHist = (term: string) => {
    setHist((prev) => {
      const rest = prev.filter((h) => h.term.toLowerCase() !== term.toLowerCase())
      return [{ id: 'h_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36), term, updated: Date.now() }, ...rest].slice(0, 40)
    })
  }

  const search = async (raw: string) => {
    const term = raw.trim()
    if (!term) { setErr('단어를 입력해 주세요. (영어 단어 기준입니다)'); return }
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied('')
    try {
      const r = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(term)}&md=s&max=30`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j: Word[] = await r.json()
      if (my !== nonce.current || !mounted.current) return
      const list = Array.isArray(j) ? j : []
      setWords(list)
      setQueried(term)
      if (list.length) pushHist(term)
    } catch {
      if (my === nonce.current && mounted.current) { setErr('발음 유사어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setWords([]); setQueried(term) }
    } finally {
      if (my === nonce.current && mounted.current) setLoading(false)
    }
  }

  // [연계] 다른 도구에서 payload.word(또는 text)로 단어를 넘겨받으면 1회 자동 검색.
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = (payload?.word ?? payload?.text) as unknown
    if (typeof raw !== 'string' || !raw.trim() || consumed.current === raw) return
    consumed.current = raw
    setInput(raw)
    search(raw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); search(input) }

  const randomExample = () => {
    const w = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setInput(w); search(w)
  }

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      if (!mounted.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    }).catch(() => {})
  }
  const copyAll = () => { if (words.length) copy(words.map((w) => w.word).join(', '), 'all') }

  // ── 기록 CRUD: 삭제 / 순서(위·아래) / 전체삭제 ──
  const removeHist = (id: string) => setHist((prev) => prev.filter((h) => h.id !== id))
  const clearHist = () => setHist([])
  const moveHist = (id: string, dir: -1 | 1) => setHist((prev) => {
    const i = prev.findIndex((h) => h.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= prev.length) return prev
    const next = prev.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box', overflow: 'auto' }
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, outline: 'none' }
  const chip: React.CSSProperties = { padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input style={inputStyle} value={input} onChange={(e) => setInput(e.target.value)} placeholder="영어 단어 입력 (예: glamour)" aria-label="발음 유사어를 찾을 단어" />
        <button type="submit" className="btn-primary" disabled={loading}>찾기</button>
      </form>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="minibtn" onClick={randomExample}>🎲 랜덤 단어</button>
        {queried && <button type="button" className="minibtn" onClick={() => search(queried)} title="같은 단어로 다시 검색">🔄 다시</button>}
        {words.length > 0 && <button type="button" className="minibtn" onClick={copyAll}>{copied === 'all' ? '✓ 복사됨' : '📋 전체 복사'}</button>}
      </div>

      <div style={{ flex: 1, minHeight: 120, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>발음이 비슷한 단어를 찾는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>{err}</div>}
        {!loading && !err && !queried && (
          <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            <div style={{ marginBottom: 8 }}>소리가 비슷한 단어를 모아 동음이의 말놀이·각운·언어유희(말장난)·시의 한 줄을 떠올려 보세요.</div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>예시 단어로 시작하기:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EXAMPLES.slice(0, 8).map((w) => (
                <span key={w} style={chip} role="button" onClick={() => { setInput(w); search(w) }}>{w}</span>
              ))}
            </div>
          </div>
        )}
        {!loading && !err && queried && words.length === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            「{queried}」와(과) 발음이 비슷한 단어를 찾지 못했습니다.<br />철자를 확인하거나 다른 영어 단어를 시도해 보세요.
          </div>
        )}
        {!loading && !err && words.length > 0 && (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>「{queried}」와(과) 발음이 비슷한 단어 · {words.length}개</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {words.map((w) => (
                <button
                  key={w.word}
                  type="button"
                  onClick={() => copy(w.word, w.word)}
                  title={(w.numSyllables ? w.numSyllables + '음절 · ' : '') + '클릭하면 복사'}
                  style={{ ...chip, background: copied === w.word ? 'var(--accent)' : 'var(--paper)', color: copied === w.word ? '#fff' : 'var(--text)', borderColor: copied === w.word ? 'var(--accent)' : 'var(--border)' }}
                >
                  {copied === w.word ? '✓ ' + w.word : w.word}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>검색 기록</span>
          {hist.length > 0 && <button type="button" className="linkbtn" onClick={clearHist}>전체 삭제</button>}
        </div>
        {hist.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 2px' }}>아직 검색 기록이 없습니다. 단어를 검색하면 여기에 쌓입니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
            {hist.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)' }}>
                <button type="button" className="linkbtn" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => { setInput(h.term); search(h.term) }} title="다시 검색">{h.term}</button>
                <button type="button" className="minibtn" onClick={() => moveHist(h.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button type="button" className="minibtn" onClick={() => moveHist(h.id, 1)} disabled={i === hist.length - 1} title="아래로">▼</button>
                <button type="button" className="minibtn" onClick={() => removeHist(h.id)} title="삭제">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        단어를 클릭하면 클립보드에 복사됩니다. 비슷한 소리의 단어로 말장난·각운·동음이의 한 줄을 바로 이어 써보세요.
      </div>
      <div className="license-note" style={{ color: 'var(--muted)', fontSize: 11 }}>
        데이터 출처: Datamuse API (api.datamuse.com) · 키 불필요 · 영어 단어 기준
      </div>
    </div>
  )
}
