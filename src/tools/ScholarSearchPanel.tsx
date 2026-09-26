import { useState, useEffect } from 'react'
import { addToProject, hasProjectBridge, addReference, hasReferenceBridge } from './linkbus'

export const meta = { id: 'scholar-search', name: '학술 논문 검색', icon: '📚', group: '리서치·자료', intro: 'Crossref로 논문을 검색해 글감과 근거 자료를 찾습니다', w: 560, h: 640 }

// 프로젝트 본문은 HTML 로 전달되므로 사용자/외부 데이터를 안전하게 이스케이프
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

type Work = {
  doi: string
  title: string
  authors: string[]
  year: string
  journal: string
  url: string
}

const EXAMPLES = [
  'climate change adaptation',
  'artificial intelligence ethics',
  'reading comprehension',
  'urban green space wellbeing',
  'remote work productivity',
  'sleep and memory',
  'creativity divergent thinking',
  'microbiome gut brain',
  'social media adolescents',
  'language learning motivation',
]

export default function ScholarSearchPanel() {
  const [query, setQuery] = useState('')
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [copied, setCopied] = useState('')

  async function search(q: string) {
    const term = q.trim()
    if (!term) return
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const res = await fetch(
        'https://api.crossref.org/works?query=' + encodeURIComponent(term) + '&rows=10'
      )
      if (!res.ok) throw new Error('요청 실패 (' + res.status + ')')
      const data = await res.json()
      const items: any[] = data?.message?.items || []
      const mapped: Work[] = items.map((it) => {
        const title = Array.isArray(it.title) && it.title.length ? it.title[0] : '(제목 없음)'
        const authors: string[] = Array.isArray(it.author)
          ? it.author
              .map((a: any) => [a.given, a.family].filter(Boolean).join(' ').trim())
              .filter(Boolean)
          : []
        const dateParts =
          it['published-print']?.['date-parts'] ||
          it['published-online']?.['date-parts'] ||
          it.published?.['date-parts'] ||
          it.issued?.['date-parts']
        const year = Array.isArray(dateParts) && dateParts[0] && dateParts[0][0] ? String(dateParts[0][0]) : ''
        const journal =
          Array.isArray(it['container-title']) && it['container-title'].length
            ? it['container-title'][0]
            : ''
        const doi = it.DOI || ''
        return {
          doi,
          title,
          authors,
          year,
          journal,
          url: it.URL || (doi ? 'https://doi.org/' + doi : ''),
        }
      })
      setWorks(mapped)
    } catch (e: any) {
      setError(e?.message ? '검색 중 오류가 발생했습니다: ' + e.message : '검색 중 오류가 발생했습니다.')
      setWorks([])
    } finally {
      setLoading(false)
    }
  }

  function randomSearch() {
    const pick = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setQuery(pick)
    search(pick)
  }

  useEffect(() => {
    randomSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function copyText(text: string, tag: string) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(tag)
        setTimeout(() => setCopied(''), 1500)
      },
      () => {}
    ).catch(() => {})
  }

  function citationOf(w: Work) {
    const a = w.authors.length ? w.authors.slice(0, 3).join(', ') + (w.authors.length > 3 ? ' 외' : '') : '저자 미상'
    const parts = [a, w.year ? '(' + w.year + ')' : '', w.title]
    if (w.journal) parts.push(w.journal)
    if (w.doi) parts.push('https://doi.org/' + w.doi)
    return parts.filter(Boolean).join('. ')
  }

  // 논문 1편을 프로젝트 자료 본문 HTML 로 변환(제목/저자/연도/저널/DOI)
  function workToBodyHtml(w: Work): string {
    const parts: string[] = []
    const authors = w.authors.length ? w.authors.join(', ') : '저자 미상'
    parts.push('<p>저자: ' + escHtml(authors) + '</p>')
    const meta = [w.journal, w.year].filter(Boolean).join(' · ')
    if (meta) parts.push('<p>' + escHtml(meta) + '</p>')
    if (w.doi) {
      const doiUrl = 'https://doi.org/' + w.doi
      parts.push('<p>DOI: <a href="' + escHtml(doiUrl) + '">' + escHtml(w.doi) + '</a></p>')
    }
    if (w.url) parts.push('<p>원문: <a href="' + escHtml(w.url) + '">' + escHtml(w.url) + '</a></p>')
    parts.push('<p>인용: ' + escHtml(citationOf(w)) + '</p>')
    return parts.join('\n')
  }

  // 표시 중인 논문을 프로젝트 참고문헌(서지)에 직접 추가 — 손으로 재입력할 필요 없음.
  const refBridge = hasReferenceBridge()
  function addWorkToReferences(w: Work, tag: string) {
    if (!refBridge) return
    const id = addReference({
      type: 'article',
      title: w.title || '(제목 없음)',
      authors: w.authors,
      year: w.year || undefined,
      container: w.journal || undefined,
      doi: w.doi || undefined,
      url: w.url || undefined,
    })
    if (id) {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1800)
    }
  }

  // 표시 중인 논문(제목/저자/연도/DOI)을 프로젝트 자료조사 폴더에 자료로 저장
  const bridge = hasProjectBridge()
  function addWorkToProject(w: Work, tag: string) {
    if (!bridge) return
    const meta: Record<string, string> = {}
    if (w.authors.length) meta['저자'] = w.authors.join(', ')
    if (w.year) meta['연도'] = w.year
    if (w.journal) meta['저널'] = w.journal
    if (w.doi) meta['DOI'] = w.doi
    if (w.url) meta['원문'] = w.url
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: w.title || '(제목 없음)',
      bodyHtml: workToBodyHtml(w),
      meta: Object.keys(meta).length ? meta : undefined,
    })
    if (id) {
      setCopied(tag)
      setTimeout(() => setCopied(''), 1800)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search(query)
          }}
          placeholder="검색어 입력 (예: climate change)"
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--paper)',
            color: 'var(--text)',
            fontSize: 14,
          }}
        />
        <button className="btn-primary" onClick={() => search(query)} disabled={loading}>
          검색
        </button>
        <button className="minibtn" onClick={randomSearch} disabled={loading} title="랜덤 주제로 다시 검색">
          🎲 랜덤
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span>추천 주제:</span>
        {EXAMPLES.slice(0, 5).map((ex) => (
          <button
            key={ex}
            className="minibtn"
            onClick={() => {
              setQuery(ex)
              search(ex)
            }}
            disabled={loading}
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            {ex}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {loading && <div style={{ color: 'var(--muted)', padding: 20, textAlign: 'center' }}>불러오는 중…</div>}

        {!loading && error && (
          <div style={{ color: 'var(--accent)', padding: 16, textAlign: 'center' }}>
            {error}
            <div style={{ marginTop: 10 }}>
              <button className="minibtn" onClick={() => search(query)}>
                다시 시도
              </button>
            </div>
          </div>
        )}

        {!loading && !error && searched && works.length === 0 && (
          <div style={{ color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
            결과가 없습니다. 다른 검색어를 시도해 보세요.
          </div>
        )}

        {!loading &&
          !error &&
          works.map((w, i) => (
            <div
              key={(w.doi || '') + i}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{w.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {w.authors.length ? w.authors.slice(0, 4).join(', ') + (w.authors.length > 4 ? ' 외' : '') : '저자 미상'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {[w.journal, w.year].filter(Boolean).join(' · ') || '연도/저널 정보 없음'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {w.doi && (
                  <button className="minibtn" onClick={() => copyText(w.doi, 'doi' + i)}>
                    {copied === 'doi' + i ? '복사됨!' : 'DOI 복사'}
                  </button>
                )}
                <button className="minibtn" onClick={() => copyText(citationOf(w), 'cite' + i)}>
                  {copied === 'cite' + i ? '복사됨!' : '인용문 복사'}
                </button>
                <button
                  className="linkbtn"
                  onClick={() => addWorkToReferences(w, 'ref' + i)}
                  disabled={!refBridge}
                  title={refBridge ? '이 논문을 프로젝트 참고문헌(서지)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  {copied === 'ref' + i ? '추가됨!' : '🔖 참고문헌에 추가'}
                </button>
                <button
                  className="linkbtn"
                  onClick={() => addWorkToProject(w, 'proj' + i)}
                  disabled={!bridge}
                  title={bridge ? '이 논문을 프로젝트 자료조사 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  {copied === 'proj' + i ? '추가됨!' : '📄 프로젝트에 추가'}
                </button>
                {w.url && (
                  <a
                    className="minibtn"
                    href={w.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                  >
                    원문 열기 ↗
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>

      {copied.startsWith('proj') && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>
          ✓ 프로젝트 자료조사에 논문을 추가했습니다.
        </div>
      )}

      {copied.startsWith('ref') && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>
          ✓ 프로젝트 참고문헌에 논문을 추가했습니다.
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        출처: Crossref · 검색 결과를 글의 근거 자료와 인용으로 활용해 보세요.
      </div>
    </div>
  )
}
