// 영어 유의어/반의어/연관어 사전 — Datamuse 공개 API(키 불필요·https·CORS 허용) 사용.
// rel_syn(유의어), rel_ant(반의어), rel_trg(연관어)로 단어를 입력하면 탭별 결과를 보여주고, 단어 클릭 시 클립보드로 복사한다.
import { useState, useRef } from 'react'

export const meta = { id: 'thesaurus-panel', name: '영어 유의어 사전', icon: '📖', group: '언어·어휘', intro: '영어 단어의 유의어·반의어·연관어를 찾아 글에 활용', w: 400, h: 560 }

type Tab = 'syn' | 'ant' | 'trg'
const TABS: { key: Tab; label: string; rel: string; empty: string }[] = [
  { key: 'syn', label: '유의어', rel: 'rel_syn', empty: '유의어를 찾지 못했습니다.' },
  { key: 'ant', label: '반의어', rel: 'rel_ant', empty: '반의어를 찾지 못했습니다.' },
  { key: 'trg', label: '연관어', rel: 'rel_trg', empty: '연관어를 찾지 못했습니다.' },
]

interface DMWord { word: string; score?: number }

const EXAMPLES = ['happy', 'beautiful', 'fast', 'sad', 'strong', 'idea', 'love', 'dark', 'bright', 'silence']

export default function ThesaurusPanel() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('syn')
  // 탭별 결과 캐시
  const [results, setResults] = useState<Record<Tab, string[]>>({ syn: [], ant: [], trg: [] })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)

  const search = async (raw: string) => {
    const w = raw.trim().toLowerCase()
    if (!w) return
    const my = ++nonce.current
    setQuery(w); setLoading(true); setErr(''); setCopied('')
    setResults({ syn: [], ant: [], trg: [] })
    try {
      const fetched = await Promise.all(
        TABS.map(async (t) => {
          try {
            const r = await fetch(`https://api.datamuse.com/words?${t.rel}=${encodeURIComponent(w)}&max=50`)
            if (!r.ok) throw new Error('bad response')
            const j: DMWord[] = await r.json()
            return (Array.isArray(j) ? j : []).map((x) => x.word).filter(Boolean)
          } catch {
            return [] as string[]
          }
        })
      )
      if (my === nonce.current) {
        setResults({ syn: fetched[0], ant: fetched[1], trg: fetched[2] })
      }
    } catch {
      if (my === nonce.current) setErr('단어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); search(input) }
  const randomExample = () => {
    const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setInput(ex); search(ex)
  }
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text); setTimeout(() => setCopied(''), 1200)
    }).catch(() => {})
  }
  const copyAll = () => {
    const list = results[tab]
    if (list.length) copy(list.join(', '))
  }

  const list = results[tab]
  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box', padding: 2 }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="영어 단어 입력 (예: happy)"
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--paper)', color: 'var(--text)', fontSize: 14, outline: 'none', minWidth: 0,
          }}
        />
        <button type="submit" className="btn-primary">검색</button>
        <button type="button" className="minibtn" onClick={randomExample} title="예시 단어로 검색">🎲</button>
      </form>

      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'minibtn' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
            style={{ flex: 1 }}
          >
            {t.label}{results[t.key].length ? ` (${results[t.key].length})` : ''}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border)',
        background: 'var(--panel)', padding: 10, minHeight: 0,
      }}>
        {!query && !loading && (
          <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
            영어 단어를 입력하면 <b>유의어·반의어·연관어</b>를 찾아줍니다.<br />
            단어를 클릭하면 클립보드에 복사돼 바로 글에 활용할 수 있어요.<br />
            적절한 표현이 떠오르지 않을 때 🎲 버튼으로 영감을 얻어보세요.
          </div>
        )}
        {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>불러오는 중…</div>}
        {err && !loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{err}</div>}
        {query && !loading && !err && (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
              <b style={{ color: 'var(--accent)' }}>{query}</b> 의 {activeTab.label}
            </div>
            {list.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{activeTab.empty}</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {list.map((w, i) => (
                  <button
                    key={w + i}
                    onClick={() => copy(w)}
                    title="클릭하면 복사"
                    style={{
                      padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                      border: '1px solid var(--border)',
                      background: copied === w ? 'var(--accent)' : 'var(--chrome-2)',
                      color: copied === w ? '#fff' : 'var(--text)', transition: 'background .15s',
                    }}
                  >
                    {copied === w ? '✓ 복사됨' : w}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="minibtn" onClick={() => search(query || input)} disabled={!query && !input.trim()}>🔄 다시</button>
        <button className="minibtn" onClick={copyAll} disabled={!list.length} style={{ flex: 1 }}>
          📋 {activeTab.label} 전체 복사
        </button>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>
        단어를 클릭하면 복사됩니다 · 데이터: Datamuse
      </div>
    </div>
  )
}
