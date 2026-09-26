// 상식 한 조각 — 무작위 상식 질문·정답·분야를 받아 "이 사실을 이야기 소재로" 떠올리게 한다.
// API: https://opentdb.com/api.php?amount=1 (키 불필요·https·CORS 허용)
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'trivia-spark', name: '상식 한 조각', icon: '🧠', group: '영감·발상', intro: '무작위 상식 한 조각을 이야기 소재로 바꿔보세요', w: 440, h: 520 }

interface Trivia {
  category: string
  question: string
  answer: string
}

// 상식 한 조각을 받았을 때 떠올릴 만한 글감 질문들 — 무작위로 함께 제시한다.
const PROMPTS = [
  '이 사실을 처음 알게 된 인물의 반응을 한 장면으로 써보세요.',
  '이 지식이 이야기의 결정적 단서가 된다면 어떤 사건일까요?',
  '이 사실을 굳게 믿었지만 틀렸던 인물의 이야기를 상상해보세요.',
  '이 한 조각을 술자리에서 꺼내는 인물은 어떤 사람일까요?',
  '이 사실이 통하지 않는 세계가 있다면 어떤 모습일까요?',
  '이 지식을 둘러싸고 두 인물이 다툰다면 무슨 일이 벌어질까요?',
  '이 사실을 소재로 한 첫 문장을 지금 바로 써보세요.',
  '100년 뒤, 이 상식은 어떻게 바뀌어 전해질까요?',
]

// opentdb 응답의 HTML 엔티티(&quot;, &#039; 등)를 디코드한다.
function decodeEntities(s: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea')
    el.innerHTML = s
    return el.value
  }
  // 폴백: 자주 쓰이는 엔티티만 수동 치환
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&ldquo;|&rdquo;/g, '"')
}

const randPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 안전하게 처리)
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 현재 상식 + 소재 질문을 프로젝트 본문 HTML 로 변환
function triviaToBodyHtml(t: Trivia, prompt: string): string {
  return [
    '<p><strong>Q.</strong> ' + escHtml(t.question) + '</p>',
    '<p><strong>A.</strong> ' + escHtml(t.answer) + '</p>',
    '<p>분야: ' + escHtml(t.category) + '</p>',
    '<p><strong>✍️ 이 사실을 이야기 소재로</strong><br>' + escHtml(prompt) + '</p>',
  ].join('\n')
}

export default function TriviaSpark() {
  const [trivia, setTrivia] = useState<Trivia | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState('')

  const nonceRef = useRef(0)
  const aliveRef = useRef(true)

  const bridge = hasProjectBridge()

  const load = useCallback(async () => {
    const myNonce = ++nonceRef.current
    setLoading(true)
    setErr('')
    setTrivia(null)
    setRevealed(false)
    setCopied('')
    setSaved('')
    try {
      const res = await fetch('https://opentdb.com/api.php?amount=1')
      if (!res.ok) throw new Error('bad status ' + res.status)
      const json = await res.json()
      const item = json && Array.isArray(json.results) ? json.results[0] : null
      if (!item || !item.question || !item.correct_answer) throw new Error('empty')
      const t: Trivia = {
        category: decodeEntities(String(item.category || '상식')),
        question: decodeEntities(String(item.question)),
        answer: decodeEntities(String(item.correct_answer)),
      }
      // 경쟁 상태 방지: 마지막 요청이 아니거나 언마운트된 경우 무시
      if (myNonce !== nonceRef.current || !aliveRef.current) return
      setTrivia(t)
      setPrompt(randPrompt())
    } catch {
      if (myNonce !== nonceRef.current || !aliveRef.current) return
      setErr('상식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (myNonce === nonceRef.current && aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      // 언마운트 정리: 진행 중 응답이 상태를 건드리지 못하게 막는다
      aliveRef.current = false
      nonceRef.current++
    }
  }, [load])

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag)
      setTimeout(() => {
        if (aliveRef.current) setCopied('')
      }, 1300)
    }).catch(() => {})
  }

  // 현재 상식(질문/정답/분야)과 소재 질문을 자료 메모로 프로젝트에 추가
  const addToProjectClick = () => {
    if (!trivia || !bridge) return
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: '상식 소재 — ' + trivia.question,
      bodyHtml: triviaToBodyHtml(trivia, prompt),
      meta: { 분야: trivia.category, 정답: trivia.answer },
    })
    if (id) {
      setSaved('프로젝트 자료에 추가했습니다.')
      setTimeout(() => { if (aliveRef.current) setSaved('') }, 1800)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
  const hint: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', flex: 1, lineHeight: 1.5 }
  const scroll: React.CSSProperties = { flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper)', padding: 14 }
  const center: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: 30 }
  const tag: React.CSSProperties = { display: 'inline-block', fontSize: 12, color: 'var(--accent)', fontWeight: 600, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px' }
  const qStyle: React.CSSProperties = { margin: '10px 0 0', fontSize: 17, lineHeight: 1.55, fontWeight: 600 }
  const ansBox: React.CSSProperties = { marginTop: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }
  const promptBox: React.CSSProperties = { marginTop: 12, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={hint}>무작위 상식 한 조각을 받아, 그 사실을 이야기 소재로 굴려보세요.</span>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? '뽑는 중…' : <><Emoji e="🎲"/> 다른 상식</>}
        </button>
      </div>

      <div style={scroll}>
        {loading && <div style={center}>상식을 불러오는 중…</div>}

        {!loading && err && (
          <div style={center}>
            <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji e="📡"/></div>
            <div>{err}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={load}>다시 시도</button>
          </div>
        )}

        {!loading && !err && !trivia && <div style={center}>표시할 상식이 없습니다.</div>}

        {!loading && !err && trivia && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>
              <span style={tag}><Emoji e="📚"/> {trivia.category}</span>
            </div>

            <p style={qStyle}>{trivia.question}</p>

            <div style={ansBox}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>정답</div>
              {revealed ? (
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ok)' }}>{trivia.answer}</div>
              ) : (
                <button className="minibtn" onClick={() => setRevealed(true)}><Emoji e="👁️"/> 정답 보기</button>
              )}
            </div>

            <div style={promptBox}>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}><Emoji e="✍️"/> 이 사실을 이야기 소재로</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{prompt}</div>
              <div style={actions}>
                <button className="minibtn" onClick={() => setPrompt(randPrompt())}><Emoji e="💡"/> 다른 질문</button>
                <button className="minibtn" onClick={() => copy(prompt, 'q')}>
                  {copied === 'q' ? '✓ 복사됨' : '질문 복사'}
                </button>
                <button
                  className="minibtn"
                  onClick={() => copy(`[${trivia.category}]\nQ. ${trivia.question}\nA. ${trivia.answer}\n\n${prompt}`, 'all')}
                >
                  {copied === 'all' ? '✓ 복사됨' : '소재 전체 복사'}
                </button>
                <button
                  className="linkbtn"
                  onClick={addToProjectClick}
                  disabled={!bridge}
                  title={bridge ? '현재 상식과 소재 질문을 프로젝트 자료(소재)로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
              {saved && <div style={{ fontSize: 13, color: 'var(--ok)', marginTop: 8 }}>✓ {saved}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
