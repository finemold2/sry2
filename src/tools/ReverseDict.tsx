// 뜻으로 단어 찾기(역방향 사전) — 설명·뜻을 입력하면 그 의미에 가까운 단어 후보를 가져온다.
// API: Datamuse(api.datamuse.com) — 키 불필요·https·CORS 허용. ml=means-like(의미 유사), rel_syn=동의어, rel_trg=연상어.
import { useState, useRef } from 'react'

export const meta = { id: 'reverse-dict', name: '뜻으로 단어 찾기', icon: '🔎', group: '언어·어휘', intro: '설명을 입력하면 그 뜻에 맞는 단어 후보를 찾아줍니다', w: 420, h: 560 }

type Mode = 'ml' | 'rel_syn' | 'rel_trg'
const MODES: { key: Mode; label: string; param: string; hint: string }[] = [
  { key: 'ml', label: '뜻으로 찾기', param: 'ml', hint: '의미를 풀어 쓰면 그 뜻에 가까운 단어를 찾습니다' },
  { key: 'rel_syn', label: '동의어', param: 'rel_syn', hint: '입력한 단어와 비슷한 뜻의 단어를 찾습니다' },
  { key: 'rel_trg', label: '연상어', param: 'rel_trg', hint: '입력한 단어에서 흔히 떠올리는 연관 단어를 찾습니다' },
]

const EXAMPLES = [
  'a feeling of deep sadness',
  'someone who studies the stars',
  'the smell after rain',
  'fear of being forgotten',
  'a place where two rivers meet',
  'soft golden evening light',
  'longing for a place you cannot return to',
  'the moment just before sleep',
  'a word that sounds like what it means',
  'happiness found in small things',
]

interface Word { word: string; score?: number; tags?: string[] }

export default function ReverseDict() {
  const [mode, setMode] = useState<Mode>('ml')
  const [q, setQ] = useState('')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [searched, setSearched] = useState(false)
  const nonce = useRef(0)

  const cur = MODES.find((m) => m.key === mode) || MODES[0]

  const search = async (term: string, m: Mode) => {
    const text = term.trim()
    if (!text) { setErr('찾고 싶은 뜻이나 단어를 입력하세요.'); return }
    const my = ++nonce.current
    const param = (MODES.find((x) => x.key === m) || MODES[0]).param
    setLoading(true); setErr(''); setSearched(true)
    try {
      const r = await fetch(`https://api.datamuse.com/words?${param}=${encodeURIComponent(text)}&max=60&md=p`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j: Word[] = await r.json()
      if (my !== nonce.current) return
      setWords(Array.isArray(j) ? j : [])
    } catch {
      if (my === nonce.current) { setErr('단어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.'); setWords([]) }
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const randomExample = () => {
    const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setMode('ml'); setQ(ex); search(ex, 'ml')
  }

  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}) }
  const copyAll = () => { if (words.length) copy(words.map((w) => w.word).join(', ')) }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <button key={m.key} className="minibtn" onClick={() => { setMode(m.key); if (q.trim()) search(q, m.key) }}
            style={mode === m.key ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(q, mode) }}
          placeholder={mode === 'ml' ? '예: 비 온 뒤의 냄새 / smell after rain' : '예: 행복 / happy'}
          style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
        />
        <button className="btn-primary" onClick={() => search(q, mode)} disabled={loading}>찾기</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{cur.hint} · 영어 입력이 가장 정확합니다.</div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>찾는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>{err}</div>}
        {!loading && !err && !searched && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', lineHeight: 1.6 }}>
            떠오르지 않는 단어가 있나요?<br />그 뜻을 풀어 적으면 알맞은 단어를 찾아드립니다.
          </div>
        )}
        {!loading && !err && searched && words.length === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>일치하는 단어가 없습니다. 다른 표현으로 시도해 보세요.</div>
        )}
        {!loading && !err && words.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {words.map((w, i) => (
              <button key={w.word + i} className="minibtn" title="클릭하면 복사됩니다" onClick={() => copy(w.word)}
                style={{ background: 'var(--chrome-2)', borderColor: 'var(--border)' }}>
                {w.word}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={randomExample}>🎲 랜덤 예시</button>
        <button className="minibtn" onClick={copyAll} disabled={!words.length}>📋 전체 복사</button>
        <button className="minibtn" onClick={() => { setQ(''); setWords([]); setErr(''); setSearched(false) }}>지우기</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        단어를 누르면 클립보드에 복사됩니다. 글이 막혔을 땐 뜻만 적고 알맞은 단어를 골라 바로 원고에 넣어보세요.
      </div>
    </div>
  )
}
