import { useState, useEffect } from 'react'
import { addToProject, hasProjectBridge } from './linkbus'

export const meta = { id: 'random-wiki-spark', name: '위키 소재 발굴', icon: '🎲', group: '영감·발상', intro: '위키백과 무작위 글로 이야기 소재를 캐냅니다', w: 460, h: 600 }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Wiki = {
  title: string
  extract: string
  description?: string
  thumbnail?: { source: string }
  content_urls?: { desktop?: { page?: string } }
}

const PROMPTS = [
  (t: string) => `만약 '${t}'을(를) 주인공으로 한 짧은 이야기를 쓴다면 어떤 사건으로 시작할까?`,
  (t: string) => `'${t}'에 얽힌 비밀이 하나 있다면 무엇일까? 그것을 아는 사람은 누구일까?`,
  (t: string) => `'${t}'을(를) 처음 본 어린아이의 시선으로 한 장면을 묘사해 보자.`,
  (t: string) => `100년 뒤, '${t}'은(는) 사람들에게 어떻게 기억될까?`,
  (t: string) => `'${t}'와(과) 전혀 어울리지 않는 두 인물을 한 방에 두면 무슨 일이 벌어질까?`,
  (t: string) => `'${t}'이(가) 사라진 세상을 상상해 보자. 가장 먼저 달라지는 것은?`,
]

export default function RandomWikiSpark() {
  const [data, setData] = useState<Wiki | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch('https://ko.wikipedia.org/api/rest_v1/page/random/summary', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error('응답 오류 ' + res.status)
      const json: Wiki = await res.json()
      if (!json || !json.title) throw new Error('빈 결과')
      setData(json)
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)](json.title))
    } catch (e) {
      setError('소재를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function shufflePrompt() {
    if (data) setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)](data.title))
  }

  function copy(text: string, tag: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(tag)
    setTimeout(() => setCopied(''), 1200)
  }

  function saveToProject() {
    if (!data) return
    const url = data.content_urls?.desktop?.page
    const parts: string[] = []
    if (data.description) parts.push(`<p><em>${esc(data.description)}</em></p>`)
    if (data.extract) parts.push(`<p>${esc(data.extract)}</p>`)
    if (prompt) parts.push(`<p><strong>✍️ 이 소재로 이야기:</strong> ${esc(prompt)}</p>`)
    if (url) parts.push(`<p><a href="${esc(url)}">위키백과에서 전체 글 보기 →</a></p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: data.title,
      bodyHtml: parts.join('\n'),
      meta: url ? { 출처: '위키백과', 링크: url } : { 출처: '위키백과' },
    })
    if (id) {
      setToast('프로젝트에 추가됨!')
      setTimeout(() => setToast(''), 1600)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          글이 막혔을 때, 무작위 지식에서 영감을 캐 보세요.
        </span>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? '뽑는 중…' : '🎲 다른 소재'}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--paper)',
          padding: 14,
        }}
      >
        {loading && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30 }}>소재를 불러오는 중…</div>
        )}

        {!loading && error && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
            <div>{error}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={load}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && !data && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 30 }}>표시할 소재가 없습니다.</div>
        )}

        {!loading && !error && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.thumbnail?.source && (
              <img
                src={data.thumbnail.source}
                alt={data.title}
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              />
            )}

            <div>
              <h2 style={{ margin: '0 0 2px', fontSize: 20 }}>{data.title}</h2>
              {data.description && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{data.description}</div>
              )}
            </div>

            <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14 }}>
              {data.extract || '요약이 제공되지 않은 글입니다.'}
            </p>

            <div
              style={{
                background: 'var(--chrome-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
                ✍️ 이 소재로 이야기
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{prompt}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={shufflePrompt}>
                  🔀 다른 질문
                </button>
                <button className="minibtn" onClick={() => copy(prompt, 'q')}>
                  {copied === 'q' ? '복사됨!' : '질문 복사'}
                </button>
                <button
                  className="minibtn"
                  onClick={() => copy(`${data.title}\n\n${data.extract}\n\n${prompt}`, 'all')}
                >
                  {copied === 'all' ? '복사됨!' : '소재 전체 복사'}
                </button>
              </div>
              <div className="linkbar" style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  className="linkbtn"
                  onClick={saveToProject}
                  disabled={!hasProjectBridge() || !data}
                  title={hasProjectBridge() ? '이 위키 소재를 자료(소재 폴더)로 저장' : '프로젝트가 연결되지 않았습니다'}
                >
                  📄 프로젝트에 추가
                </button>
                {toast && <span style={{ fontSize: 12, color: 'var(--accent)', alignSelf: 'center' }}>{toast}</span>}
              </div>
            </div>

            {data.content_urls?.desktop?.page && (
              <a
                href={data.content_urls.desktop.page}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
              >
                위키백과에서 전체 글 보기 →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
