// 조언 한 줄 발상기 — 무작위 조언을 인물 대사/주제로 바꿔 글감을 떠올리게 한다.
// API: https://api.adviceslip.com/advice (키 불필요·https·CORS 허용)
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'advice-spark', name: '조언 한 줄 발상', icon: '💬', group: '영감·발상', intro: '무작위 조언 한 줄을 인물 대사·주제로 바꿔보세요', w: 420, h: 460 }

// HTML 본문에 넣을 때 특수문자(&,<,>) escape — bodyHtml 안전 처리.
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 조언을 받았을 때 떠올릴 만한 글감 질문들 — 무작위로 함께 제시한다.
const QUESTIONS = [
  '이 조언을 하는 인물은 누구일까요? 나이·직업·말투를 정해보세요.',
  '이 말을 들은 사람은 어떤 상황에 처해 있었을까요?',
  '이 조언을 끝까지 따르지 못한 인물의 이야기를 상상해보세요.',
  '이 문장이 마지막 대사라면, 그 직전엔 무슨 일이 있었을까요?',
  '이 조언을 정반대로 뒤집으면 어떤 이야기가 될까요?',
  '이 말을 누군가에게 처음 해준 사람은 어떤 표정이었을까요?',
  '이 조언이 새겨진 편지를 받은 인물의 하루를 묘사해보세요.',
  '이 한 줄을 제목으로 삼아 첫 문단을 써보세요.',
]

interface Advice { id: number; text: string }

// adviceslip은 캐시가 강해서 같은 결과가 반복될 수 있어 캐시버스터를 붙인다.
async function fetchAdvice(): Promise<Advice> {
  const r = await fetch(`https://api.adviceslip.com/advice?t=${Date.now()}_${Math.random()}`)
  if (!r.ok) throw new Error('bad status')
  const j = await r.json()
  const s = j && j.slip
  if (!s || !s.advice) throw new Error('empty')
  return { id: s.id, text: String(s.advice) }
}

export default function AdviceSpark() {
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [question, setQuestion] = useState(QUESTIONS[0])
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setCopied(false)
    try {
      const a = await fetchAdvice()
      setAdvice(a)
      setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])
    } catch {
      setErr('조언을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const copy = () => {
    if (!advice) return
    const t = `"${advice.text}"`
    navigator.clipboard?.writeText(t).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // 현재 표시된 조언 + 글감 질문을 프로젝트 자료 〈영감 메모〉 폴더에 메모로 추가.
  const addMemo = () => {
    if (!advice || !hasProjectBridge()) return
    const bodyHtml = [
      `<p style="font-size:16px;line-height:1.6;"><b>“${escapeHtml(advice.text)}”</b></p>`,
      `<hr/>`,
      `<p><b>✍️ 글감 질문:</b> ${escapeHtml(question)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `조언: ${advice.text.slice(0, 30)}${advice.text.length > 30 ? '…' : ''}`,
      bodyHtml,
    })
    flashToast(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 18px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, minHeight: 120 }
  const quoteStyle: React.CSSProperties = { fontSize: 20, lineHeight: 1.5, fontWeight: 600, color: 'var(--text)' }
  const msg: React.CSSProperties = { color: 'var(--muted)', fontSize: 15 }
  const qBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const toastBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>불러오는 중…</div>}
        {!loading && err && <div style={msg}>{err}</div>}
        {!loading && !err && advice && (
          <div style={quoteStyle}>“{advice.text}”</div>
        )}
        {!loading && !err && !advice && <div style={msg}>조언이 없습니다.</div>}
      </div>

      <div style={qBox}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}><Emoji e="✍️"/> 글감 질문</div>
        {question}
      </div>

      <div style={actions}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀"/> 다른 조언</button>
        <button
          className="minibtn"
          onClick={() => setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])}
        ><Emoji e="💡"/> 다른 글감 질문</button>
        <button className="minibtn" onClick={copy} disabled={!advice || loading}>
          {copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}
        </button>
      </div>

      {/* 연계: 현재 조언/글감을 프로젝트 자료 〈영감 메모〉에 메모로 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addMemo}
          disabled={!advice || loading || !hasProjectBridge()}
          title={
            !hasProjectBridge()
              ? '프로젝트에 연결되어 있지 않습니다'
              : !advice
                ? '저장할 조언이 없습니다'
                : '현재 조언과 글감 질문을 프로젝트 자료 〈영감 메모〉에 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && (
        <div style={toastBox}>{toast}</div>
      )}

      <div style={hint}>
        무작위 조언 한 줄을 받아, 이 말을 하는 인물·상황·주제를 상상해 글감으로 삼아보세요.
      </div>
    </div>
  )
}
