// 무작위 명언·인용 글감 — 키 없는 공개 API로 매번 다른 문장을 가져와 글쓰기 영감을 준다.
// 1순위: api.quotable.io(키없음·CORS), 2순위: dummyjson.com/quotes/random(키없음·https·CORS 확인됨),
// 최후: 내장 명언 풀(네트워크 실패해도 절대 깨지지 않음). 모두 키 불필요·https.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'random-quote', name: '무작위 명언 글감', icon: '💬', group: '영감·발상', intro: '명언 한 줄에서 오늘의 글감을 찾으세요', w: 420, h: 520 }

interface Quote { text: string; author: string }

// 글감 질문 — 가져온 인용문을 글쓰기로 잇게 해 준다.
const SPARKS = [
  '이 문장으로 글을 시작한다면, 다음 한 문장은 무엇일까요?',
  '이 말에 동의하나요, 반대하나요? 당신의 경험으로 답해 보세요.',
  '이 문장을 정반대로 뒤집으면 어떤 이야기가 될까요?',
  '이 말이 가장 절실했던 순간을 한 장면으로 묘사해 보세요.',
  '이 인용문을 마지막 줄로 하는 짧은 이야기의 도입부를 써보세요.',
  '이 문장을 어떤 인물의 좌우명이라 상상하고, 그 사람을 소개해 보세요.',
  '이 말이 위로가 될 사람은 누구일까요? 그에게 보내는 편지를 시작하세요.',
  '이 문장에서 핵심 단어 하나를 골라, 그 단어로 자유롭게 써내려 가세요.',
  '이 인용문이 거짓이라면 세상은 어떻게 달라질까요?',
  '오늘 하루를 이 문장에 비추어 한 문단으로 돌아보세요.',
]

// 네트워크가 모두 막혔을 때 쓰는 내장 명언(공용·출처 분명).
const FALLBACK: Quote[] = [
  { text: '시작이 반이다.', author: '아리스토텔레스' },
  { text: '천 리 길도 한 걸음부터.', author: '노자' },
  { text: '아는 것이 힘이다.', author: '프랜시스 베이컨' },
  { text: '나는 생각한다, 고로 존재한다.', author: '르네 데카르트' },
  { text: '인생은 가까이서 보면 비극이지만 멀리서 보면 희극이다.', author: '찰리 채플린' },
  { text: '오늘 할 수 있는 일에 전력을 다하라. 그러면 내일은 한 걸음 더 진보한다.', author: '아이작 뉴턴' },
  { text: '미래를 예측하는 가장 좋은 방법은 미래를 창조하는 것이다.', author: '피터 드러커' },
  { text: '행복은 습관이다. 그것을 몸에 지녀라.', author: '엘버트 허버드' },
  { text: '실패는 성공의 어머니다.', author: '토머스 에디슨' },
  { text: '가장 어두운 밤도 끝나고 해는 떠오른다.', author: '빅토르 위고' },
]

function pickFallback(): Quote {
  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
}

// 1순위 — quotable.io (키 없음·CORS). 사용 불가 시 throw 되어 다음 단계로 넘어간다.
async function fetchQuotable(): Promise<Quote> {
  const r = await fetch('https://api.quotable.io/random')
  if (!r.ok) throw new Error('quotable http ' + r.status)
  const j = await r.json()
  if (!j || !j.content) throw new Error('quotable empty')
  return { text: String(j.content), author: String(j.author || '미상') }
}

// 2순위 — dummyjson (키 없음·https·CORS 확인됨).
async function fetchDummy(): Promise<Quote> {
  const r = await fetch('https://dummyjson.com/quotes/random')
  if (!r.ok) throw new Error('dummyjson http ' + r.status)
  const j = await r.json()
  if (!j || !j.quote) throw new Error('dummyjson empty')
  return { text: String(j.quote), author: String(j.author || '미상') }
}

export default function RandomQuote() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [spark, setSpark] = useState(SPARKS[0])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const nonce = useRef(0)
  const bridge = hasProjectBridge()

  const load = async () => {
    const my = ++nonce.current
    setLoading(true); setNote(''); setCopied(false); setSaved(false)
    let q: Quote | null = null
    try {
      q = await fetchQuotable()
    } catch {
      try {
        q = await fetchDummy()
      } catch {
        q = pickFallback()
        if (my === nonce.current) setNote('온라인 명언을 불러오지 못해 내장 명언을 보여드립니다.')
      }
    }
    if (my === nonce.current) {
      setQuote(q)
      setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const copy = () => {
    if (!quote) return
    const txt = `“${quote.text}” — ${quote.author}`
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // 현재 명언을 프로젝트 바인더에 자료('인용' 폴더, 텍스트)로 추가.
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const addToProj = () => {
    if (!quote) return
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인용',
      title: `“${quote.text}” — ${quote.author}`,
      bodyHtml: `<blockquote>“${esc(quote.text)}”</blockquote><p>— ${esc(quote.author)}</p>`,
      meta: { 저자: quote.author },
    })
    if (id) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, minHeight: 0 }
  const quoteStyle: React.CSSProperties = { fontSize: 20, lineHeight: 1.5, fontWeight: 600, wordBreak: 'keep-all' }
  const authorStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 14, textAlign: 'right' }
  const sparkBox: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }
  const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--muted)' }}>명언을 불러오는 중…</div>}
        {!loading && quote && (
          <>
            <div style={quoteStyle}>“{quote.text}”</div>
            <div style={authorStyle}>— {quote.author}</div>
          </>
        )}
        {!loading && !quote && <div style={{ textAlign: 'center', color: 'var(--muted)' }}>명언이 없습니다. ‘다시’를 눌러 주세요.</div>}
      </div>

      {note && <div style={{ ...hint, color: 'var(--accent)' }}>{note}</div>}

      <div style={sparkBox}><Emoji e="✍️" /> {spark}</div>

      <div style={actions}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀" /> 다른 명언</button>
        <button className="minibtn" onClick={() => setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])} disabled={loading}><Emoji e="✍️" /> 다른 글감 질문</button>
        <button className="minibtn" onClick={copy} disabled={loading || !quote}>{copied ? <><Emoji e="✅" /> 복사됨</> : <><Emoji e="📋" /> 글쓰기에 복사</>}</button>
        <button className="linkbtn" onClick={addToProj} disabled={loading || !quote || !bridge} title={bridge ? '현재 명언을 프로젝트 자료(인용)로 추가' : '프로젝트에 연결되어 있지 않습니다'}>{saved ? <><Emoji e="✅" /> 추가됨</> : <><Emoji e="📄" /> 프로젝트에 추가</>}</button>
      </div>

      <div style={hint}>마음에 드는 문장이 나올 때까지 ‘다른 명언’을 눌러 보세요. 인용문을 복사해 원고 첫 줄로 삼거나, 글감 질문에 답하며 한 문단을 채워 보세요.</div>
    </div>
  )
}
