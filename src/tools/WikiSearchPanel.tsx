// 위키백과 검색+요약 미리보기 — 키 불필요·CORS 허용 공개 API(ko.wikipedia.org)로 자료를 찾는다.
// 검색: REST v1 search/page, 요약: api/rest_v1/page/summary/{title}. 모두 https·키 불필요.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'wiki-search-panel', name: '위키백과 검색', icon: '📖', group: '리서치·자료', intro: '키워드로 위키백과를 찾아 요약을 미리보고 글감으로 옮기세요', w: 460, h: 600 }

// 프로젝트 저장 시 본문 HTML 에 들어갈 텍스트의 &,<,> 를 이스케이프한다.
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface SearchItem { id: number; key: string; title: string; excerpt: string; description?: string | null }
interface Summary { title: string; extract: string; description?: string; url?: string; thumb?: string }

const SEEDS = ['세종대왕', '광합성', '르네상스', '블랙홀', '인공지능', '조선왕조실록', '진화', '카프카', '실크로드', '양자역학', '바흐', '제주도', '미토콘드리아', '냉전', '고흐']

// 검색 결과의 excerpt 에는 <span class="searchmatch"> 등 HTML 이 섞여 있어 태그를 제거한다.
function stripTags(s: string): string {
  const t = (s || '').replace(/<[^>]+>/g, '')
  const el = typeof document !== 'undefined' ? document.createElement('textarea') : null
  if (el) { el.innerHTML = t; return el.value }
  return t
}

export default function WikiSearchPanel() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [searched, setSearched] = useState(false)

  const [sel, setSel] = useState<SearchItem | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sumLoading, setSumLoading] = useState(false)
  const [sumErr, setSumErr] = useState('')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')

  const searchNonce = useRef(0)
  const sumNonce = useRef(0)

  const runSearch = async (term: string) => {
    const word = term.trim()
    if (!word) { setResults([]); setSearched(false); setSearchErr(''); return }
    const my = ++searchNonce.current
    setSearching(true); setSearchErr(''); setSearched(true)
    try {
      const r = await fetch(`https://ko.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(word)}&limit=10`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (my !== searchNonce.current) return
      const pages: SearchItem[] = (j.pages || []).map((p: { id: number; key: string; title: string; excerpt?: string; description?: string | null }) => ({
        id: p.id, key: p.key, title: p.title, excerpt: stripTags(p.excerpt || ''), description: p.description,
      }))
      setResults(pages)
    } catch {
      if (my === searchNonce.current) { setSearchErr('검색에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setResults([]) }
    } finally {
      if (my === searchNonce.current) setSearching(false)
    }
  }

  const loadSummary = async (item: SearchItem) => {
    const my = ++sumNonce.current
    setSel(item); setSummary(null); setSumErr(''); setSumLoading(true); setCopied('')
    try {
      const r = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.key || item.title)}`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (my !== sumNonce.current) return
      setSummary({
        title: j.title || item.title,
        extract: j.extract || '',
        description: j.description,
        url: j.content_urls?.desktop?.page,
        thumb: j.thumbnail?.source,
      })
    } catch {
      if (my === sumNonce.current) setSumErr('요약을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === sumNonce.current) setSumLoading(false)
    }
  }

  const randomTopic = () => {
    const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(seed); runSearch(seed)
  }

  // 첫 진입 시 무작위 주제로 채워 빈 화면을 피한다.
  useEffect(() => { randomTopic() /* eslint-disable-next-line */ }, [])

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }

  // 현재 보고 있는 위키 문서(제목/요약/링크)를 '자료조사' 폴더의 자료(text/research)로 저장.
  const saveToProject = () => {
    if (!summary) return
    const parts: string[] = []
    if (summary.description) parts.push(`<p><em>${esc(summary.description)}</em></p>`)
    if (summary.extract) parts.push(`<p>${esc(summary.extract)}</p>`)
    if (summary.url) parts.push(`<p><a href="${esc(summary.url)}">위키백과에서 전체 글 보기 →</a></p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: summary.title,
      bodyHtml: parts.join('\n'),
      meta: summary.url ? { 출처: '위키백과', 링크: summary.url } : { 출처: '위키백과' },
    })
    if (id) {
      setToast('프로젝트에 추가됨!')
      setTimeout(() => setToast(''), 1600)
    }
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); runSearch(q) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', minHeight: 0 }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="찾을 주제를 입력하세요 (예: 르네상스)"
          style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
        <button type="submit" className="btn-primary"><Emoji e="🔍"/> 검색</button>
        <button type="button" className="minibtn" onClick={randomTopic} title="무작위 주제로 새로 검색"><Emoji e="🔀"/> 랜덤</button>
      </form>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 결과 목록 */}
        <div style={{ width: '42%', minWidth: 150, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--panel)' }}>
          {searching && <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13 }}>검색 중…</div>}
          {!searching && searchErr && <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>{searchErr}</div>}
          {!searching && !searchErr && searched && results.length === 0 && (
            <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>검색 결과가 없습니다. 다른 키워드로 시도해 보세요.</div>
          )}
          {!searching && !searchErr && results.map((it) => (
            <button
              key={it.id}
              onClick={() => loadSummary(it)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, lineHeight: 1.35,
                background: sel?.id === it.id ? 'var(--chrome-2)' : 'transparent',
                color: 'var(--text)', borderLeft: sel?.id === it.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              {it.description && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{it.description}</div>}
              {it.excerpt && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>{it.excerpt}</div>}
            </button>
          ))}
        </div>

        {/* 요약 패널 */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }}>
          {!sel && !sumLoading && <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>왼쪽 목록에서 항목을 클릭하면 요약이 여기에 표시됩니다.</div>}
          {sumLoading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>요약 불러오는 중…</div>}
          {!sumLoading && sumErr && (
            <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
              {sumErr}
              {sel && <div style={{ marginTop: 10 }}><button className="minibtn" onClick={() => sel && loadSummary(sel)}>다시 시도</button></div>}
            </div>
          )}
          {!sumLoading && !sumErr && summary && (
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{summary.title}</div>
              {summary.description && <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>{summary.description}</div>}
              {summary.thumb && (
                <img src={summary.thumb} alt={summary.title} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }} />
              )}
              <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary.extract || '요약 본문이 없습니다.'}</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {summary.extract && <button className="btn-primary" onClick={() => copy(summary.extract, 'summary')}><Emoji e="📋"/> 요약 복사</button>}
                {summary.extract && <button className="minibtn" onClick={() => copy(`${summary.title} — ${summary.extract}${summary.url ? '\n출처: ' + summary.url : ''}`, 'cite')}><Emoji e="📝"/> 출처와 함께 복사</button>}
                {summary.url && <button className="minibtn" onClick={() => copy(summary.url || '', 'url')}><Emoji e="🔗"/> 링크 복사</button>}
                <button
                  className="linkbtn"
                  onClick={saveToProject}
                  disabled={!hasProjectBridge() || !summary}
                  title={hasProjectBridge() ? '이 위키 문서를 자료(자료조사 폴더)로 저장' : '프로젝트가 연결되지 않았습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
              {toast && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8 }}>{toast}</div>}
              {copied && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8 }}>복사했습니다 — 원고에 붙여넣어 활용하세요.</div>}

              <div style={{ marginTop: 16, padding: 10, borderRadius: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                <Emoji e="💡"/> 글감 질문: <b style={{ color: 'var(--text)' }}>{summary.title}</b>에 대해 사람들이 흔히 오해하는 점은 무엇일까요? 이 주제를 내 이야기·글의 한 장면과 어떻게 연결할 수 있을까요?
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
