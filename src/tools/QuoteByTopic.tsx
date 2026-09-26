import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'quote-by-topic', name: '주제별 명언', icon: '📜', group: '영감·발상', intro: '주제 태그로 명언을 모아 인용·제사(에피그래프)에 활용', w: 560, h: 560 }

type Quote = { _id: string; content: string; author: string; tags?: string[] }

// HTML 본문에 넣을 때 특수문자(&,<,>) escape — bodyHtml 안전 처리.
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TAGS: { tag: string; label: string }[] = [
  { tag: 'love', label: '사랑' },
  { tag: 'wisdom', label: '지혜' },
  { tag: 'courage', label: '용기' },
  { tag: 'happiness', label: '행복' },
  { tag: 'friendship', label: '우정' },
  { tag: 'hope', label: '희망' },
  { tag: 'success', label: '성공' },
  { tag: 'inspirational', label: '영감' },
  { tag: 'life', label: '인생' },
  { tag: 'time', label: '시간' },
  { tag: 'change', label: '변화' },
  { tag: 'freedom', label: '자유' },
  { tag: 'truth', label: '진실' },
  { tag: 'knowledge', label: '지식' },
  { tag: 'faith', label: '믿음' },
  { tag: 'nature', label: '자연' },
]

const STORE_KEY = 'sry:tool:quote-by-topic'

export default function QuoteByTopic() {
  const [tag, setTag] = useState<string>('wisdom')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [highlightId, setHighlightId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const nonceRef = useRef(0)
  const mountedRef = useRef(true)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved.tag === 'string') setTag(saved.tag)
        if (saved && Array.isArray(saved.quotes)) setQuotes(saved.quotes)
        if (saved && typeof saved.highlightId === 'string') setHighlightId(saved.highlightId)
      }
    } catch { /* 무시 */ }
  }, [])

  // 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ tag, quotes, highlightId }))
    } catch { /* 무시 */ }
  }, [tag, quotes, highlightId])

  // 언마운트 정리
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      nonceRef.current++
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  async function fetchQuotes(selectedTag: string) {
    const myNonce = ++nonceRef.current
    setLoading(true)
    setError('')
    try {
      const url = `https://api.quotable.io/quotes?tags=${encodeURIComponent(selectedTag)}&limit=10`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`)
      const data = await res.json()
      if (myNonce !== nonceRef.current || !mountedRef.current) return
      const results: Quote[] = Array.isArray(data?.results) ? data.results : []
      setQuotes(results)
      if (results.length > 0) {
        setHighlightId(results[Math.floor(Math.random() * results.length)]._id)
      } else {
        setHighlightId('')
        setError('이 주제의 명언을 찾지 못했어요. 다른 주제를 골라보세요.')
      }
    } catch (e) {
      if (myNonce !== nonceRef.current || !mountedRef.current) return
      setQuotes([])
      setHighlightId('')
      setError('명언을 불러오지 못했어요. 네트워크/CORS 환경을 확인하거나 잠시 후 다시 시도하세요.')
    } finally {
      if (myNonce === nonceRef.current && mountedRef.current) setLoading(false)
    }
  }

  function randomize() {
    if (quotes.length === 0) return
    setHighlightId(quotes[Math.floor(Math.random() * quotes.length)]._id)
  }

  function flagCopied(key: string) {
    setCopied(key)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setCopied('')
    }, 1500)
  }

  async function copyText(text: string, key: string) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // 폴백: 임시 textarea
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flagCopied(key)
    } catch {
      flagCopied('fail')
    }
  }

  function epigraph(q: Quote) {
    return `“${q.content}”\n— ${q.author}`
  }

  function copyAll() {
    if (quotes.length === 0) return
    const text = quotes.map(epigraph).join('\n\n')
    copyText(text, 'all')
  }

  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setToast('')
    }, 2200)
  }

  const highlight = quotes.find(q => q._id === highlightId)
  const tagLabel = TAGS.find(t => t.tag === tag)?.label ?? tag

  // 현재 주제의 명언 목록(강조 명언을 맨 위에 표시)을 프로젝트 자료 〈인용〉 폴더에 추가.
  function addToProjectBinder() {
    if (quotes.length === 0 || !hasProjectBridge()) return
    const hl = quotes.find(q => q._id === highlightId)
    const items = hl ? [hl, ...quotes.filter(q => q._id !== hl._id)] : quotes
    const bodyHtml = items
      .map(q => {
        const star = hl && q._id === hl._id ? '★ ' : ''
        return `<p style="margin:0 0 14px;line-height:1.6;">${star}“${escapeHtml(q.content)}”<br/><span style="color:#888;">— ${escapeHtml(q.author)}</span></p>`
      })
      .join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인용',
      title: `명언 모음: ${tagLabel} (${quotes.length})`,
      bodyHtml,
      meta: {
        주제: tagLabel,
        태그: tag,
        개수: String(quotes.length),
        강조: hl ? `“${hl.content}” — ${hl.author}` : '',
      },
    })
    flashToast(id ? '프로젝트 자료 〈인용〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', fontFamily: 'inherit' }}>
      {/* 상단 컨트롤 */}
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flex: '0 0 auto' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>주제를 골라 명언을 모아보세요. 인용·제사(에피그래프)에 좋아요.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {TAGS.map(t => {
            const active = t.tag === tag
            return (
              <button
                key={t.tag}
                className="minibtn"
                onClick={() => setTag(t.tag)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent)' : 'var(--panel)',
                  color: active ? '#fff' : 'var(--text)',
                }}
                title={t.tag}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => fetchQuotes(tag)}
            disabled={loading}
            style={{
              cursor: loading ? 'default' : 'pointer',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#fff',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '불러오는 중…' : `“${tagLabel}” 명언 불러오기`}
          </button>
          <button
            className="minibtn"
            onClick={randomize}
            disabled={quotes.length === 0}
            style={{ cursor: quotes.length === 0 ? 'default' : 'pointer', borderRadius: 8, padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', opacity: quotes.length === 0 ? 0.5 : 1 }}
          >
            <Emoji e="🎲"/> 무작위 강조
          </button>
          <button
            className="minibtn"
            onClick={copyAll}
            disabled={quotes.length === 0}
            style={{ cursor: quotes.length === 0 ? 'default' : 'pointer', borderRadius: 8, padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', opacity: quotes.length === 0 ? 0.5 : 1 }}
          >
            {copied === 'all' ? '✓ 전체 복사됨' : '전체 복사'}
          </button>
          <button
            className="linkbtn"
            onClick={addToProjectBinder}
            disabled={quotes.length === 0 || !hasProjectBridge()}
            title={
              !hasProjectBridge()
                ? '프로젝트에 연결되어 있지 않습니다'
                : quotes.length === 0
                  ? '저장할 명언이 없습니다'
                  : `현재 “${tagLabel}” 명언 목록을 프로젝트 자료 〈인용〉에 추가`
            }
            style={{ cursor: (quotes.length === 0 || !hasProjectBridge()) ? 'default' : 'pointer', borderRadius: 8, padding: '6px 12px', fontSize: 13, opacity: (quotes.length === 0 || !hasProjectBridge()) ? 0.5 : 1 }}
          >
            <Emoji e="📄"/> 프로젝트에 추가
          </button>
        </div>
        {toast && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            {toast}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div style={{ flex: '1 1 auto', overflow: 'auto', padding: 12, background: 'var(--paper)' }}>
        {error && (
          <div style={{ padding: 10, borderRadius: 8, background: 'var(--panel)', border: '1px solid var(--warn)', color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* 강조 명언 */}
        {highlight && (
          <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--accent)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>오늘의 강조 · {tagLabel}</div>
            <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text)' }}>
              “{highlight.content}”
            </blockquote>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>— {highlight.author}</div>
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button
                className="minibtn"
                onClick={() => copyText(epigraph(highlight), 'hl')}
                style={{ cursor: 'pointer', borderRadius: 6, padding: '4px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)' }}
              >
                {copied === 'hl' ? '✓ 복사됨' : '제사로 복사'}
              </button>
            </div>
          </div>
        )}

        {/* 목록 */}
        {quotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quotes.map(q => {
              const isHl = q._id === highlightId
              return (
                <div
                  key={q._id}
                  onClick={() => setHighlightId(q._id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--panel)',
                    border: isHl ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>“{q.content}”</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>— {q.author}</span>
                    <button
                      className="minibtn"
                      onClick={(e) => { e.stopPropagation(); copyText(epigraph(q), q._id) }}
                      style={{ cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: 11, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', flex: '0 0 auto' }}
                    >
                      {copied === q._id ? '✓' : '복사'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          !error && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: '40px 16px', lineHeight: 1.7 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}><Emoji e="📜"/></div>
              주제 태그를 고르고 <b>“{tagLabel}” 명언 불러오기</b>를 눌러보세요.<br />
              마음에 드는 문장을 인용·제사로 바로 복사할 수 있어요.
            </div>
          )
        )}
        {copied === 'fail' && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)', textAlign: 'center' }}>복사에 실패했어요. 직접 선택해 복사해주세요.</div>
        )}
      </div>
    </div>
  )
}
