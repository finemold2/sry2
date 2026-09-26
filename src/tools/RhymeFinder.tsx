// 운율/라임 찾기 — 시·가사 창작용. Datamuse(api.datamuse.com) 공개 API 사용: 키 불필요·https·CORS 허용.
// rel_rhy(완전운), rel_nry(근접운). 영어 단어 기준으로 운율 후보를 모아 글쓰기에 활용하도록 복사 제공.
import { useState, useRef } from 'react'

export const meta = { id: 'rhyme-finder', name: '운율·라임 찾기 (영어 전용)', icon: '🎵', group: '언어·어휘', intro: '영어 단어와 운이 맞는 말들을 찾아 가사·시 쓰기에 활용하세요 (Datamuse · 영어 전용)', w: 460, h: 600 }

type Mode = 'rhy' | 'nry'
const MODES: { key: Mode; label: string; rel: string; desc: string }[] = [
  { key: 'rhy', label: '완전운 (정확히 맞는 운)', rel: 'rel_rhy', desc: '끝소리가 완전히 일치하는 단어' },
  { key: 'nry', label: '근접운 (비슷한 운)', rel: 'rel_nry', desc: '느슨하게 운이 비슷한 단어' },
]

const EXAMPLES = ['forget', 'shadow', 'ocean', 'dream', 'fire', 'heart', 'rain', 'moon', 'silence', 'tomorrow', 'wonder', 'broken']

interface Word { word: string; score?: number; numSyllables?: number }

export default function RhymeFinder() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('rhy')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [queried, setQueried] = useState('')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)

  const search = async (raw: string, m: Mode) => {
    const term = raw.trim()
    if (!term) { setErr('단어를 입력해 주세요. (영어 단어 기준입니다)'); return }
    if (/[가-힣]/.test(term)) { setErr('이 도구는 영어 운율만 지원합니다(Datamuse). 한국어 라임은 지원하지 않아요 — 영어 단어를 입력해 주세요.'); setWords([]); return }
    const rel = (MODES.find((x) => x.key === m) || MODES[0]).rel
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied('')
    try {
      const r = await fetch(`https://api.datamuse.com/words?${rel}=${encodeURIComponent(term)}&md=s&max=80`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j: Word[] = await r.json()
      if (my !== nonce.current) return
      setWords(Array.isArray(j) ? j : [])
      setQueried(term)
    } catch {
      if (my === nonce.current) { setErr('운율을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setWords([]) }
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); search(input, mode) }

  const switchMode = (m: Mode) => {
    setMode(m)
    if (queried) search(queried, m)
  }

  const randomExample = () => {
    const w = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setInput(w)
    search(w, mode)
  }

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  const copyAll = () => {
    if (!words.length) return
    copy(words.map((w) => w.word).join(', '), 'all')
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const inputStyle: React.CSSProperties = { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, outline: 'none' }
  const chip: React.CSSProperties = { padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input style={inputStyle} value={input} onChange={(e) => setInput(e.target.value)} placeholder="영어 단어 입력 (예: dream)" aria-label="운율을 찾을 단어" />
        <button type="submit" className="btn-primary">찾기</button>
      </form>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODES.map((mo) => (
          <button key={mo.key} type="button" className={'minibtn' + (mode === mo.key ? ' active' : '')} onClick={() => switchMode(mo.key)} title={mo.desc}>{mo.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="minibtn" onClick={randomExample}>🎲 랜덤 단어</button>
        {queried && <button type="button" className="minibtn" onClick={() => search(queried, mode)} title="같은 단어로 다시 검색">🔄 다시</button>}
        {words.length > 0 && <button type="button" className="minibtn" onClick={copyAll}>{copied === 'all' ? '✓ 복사됨' : '📋 전체 복사'}</button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, minHeight: 0 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>운율을 찾는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>{err}</div>}
        {!loading && !err && !queried && (
          <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            <div style={{ marginBottom: 8 }}>운율이 맞는 단어를 찾아 시·가사·라임을 지을 때 영감을 얻으세요.</div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>예시 단어로 시작하기:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EXAMPLES.slice(0, 8).map((w) => (
                <span key={w} style={chip} onClick={() => { setInput(w); search(w, mode) }} role="button">{w}</span>
              ))}
            </div>
          </div>
        )}
        {!loading && !err && queried && words.length === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            「{queried}」와(과) 운이 맞는 단어를 찾지 못했습니다.<br />다른 단어나 다른 운율 모드를 시도해 보세요.
          </div>
        )}
        {!loading && !err && words.length > 0 && (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
              「{queried}」의 {mode === 'rhy' ? '완전운' : '근접운'} · {words.length}개
            </div>
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

      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        단어를 클릭하면 클립보드에 복사됩니다. 떠오른 운율을 골라 시·가사 한 줄을 바로 이어 써보세요. (Datamuse · 영어)
      </div>
    </div>
  )
}
