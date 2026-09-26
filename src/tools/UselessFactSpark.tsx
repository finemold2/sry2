// 뜻밖의 사실 발상기 — 무작위로 가져온 잡지식 한 줄을 글감으로 바꿔 한 문단을 떠올리게 한다.
// API: https://uselessfacts.jsph.pl/api/v2/facts/random?language=en (키 불필요·https·CORS 허용)
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'useless-fact-spark', name: '뜻밖의 사실 발상', icon: '🤯', group: '영감·발상', intro: '뜻밖의 잡지식 한 줄에서 한 문단을 출발시켜 보세요', w: 420, h: 520 }

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자에게 보이는 텍스트를 안전하게 처리)
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 사실 한 줄을 받았을 때 떠올릴 만한 글감 질문들 — 무작위로 함께 제시한다.
const SPARKS = [
  '이 사실을 처음 알게 된 인물의 하루를 한 문단으로 써보세요.',
  '이 사실이 어떤 이야기의 결정적 단서가 된다면, 그 장면을 묘사해 보세요.',
  '이 사실을 믿지 않는 사람과 믿는 사람의 대화로 한 문단을 채워 보세요.',
  '이 사실이 사실은 거짓이라면, 세상은 어떻게 달라질까요?',
  '이 사실을 소재로 한 문장짜리 광고 카피를 써보세요.',
  '이 사실에서 떠오른 단어 하나로 자유롭게 한 문단을 써내려 가세요.',
  '이 사실을 누군가에게 자랑하는 편지의 첫 문단을 써보세요.',
  '이 사실을 첫 문장으로 삼아, 전혀 다른 방향으로 이야기를 이어 보세요.',
  '이 사실이 일어나지 않은 세계를 상상해 한 문단으로 그려 보세요.',
  '이 사실에 숨은 감정(놀람·두려움·우스움)을 골라 그 감정으로 한 문단을 써보세요.',
]

interface Fact { text: string; source: string }

// 잡지식 사실 가져오기 — 키 없음·https·CORS. 캐시가 강할 수 있어 캐시버스터를 붙인다.
async function fetchFact(signal: AbortSignal): Promise<Fact> {
  const r = await fetch(
    `https://uselessfacts.jsph.pl/api/v2/facts/random?language=en&t=${Date.now()}_${Math.random()}`,
    { signal },
  )
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const text = j && j.text
  if (!text) throw new Error('empty')
  return { text: String(text), source: String((j && j.source) || '') }
}

export default function UselessFactSpark() {
  const [fact, setFact] = useState<Fact | null>(null)
  const [spark, setSpark] = useState(SPARKS[0])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const nonce = useRef(0)
  const ctrl = useRef<AbortController | null>(null)
  const bridge = hasProjectBridge()

  const load = () => {
    const my = ++nonce.current
    ctrl.current?.abort()
    const ac = new AbortController()
    ctrl.current = ac
    setLoading(true); setErr(''); setCopied(false); setSaved(false)
    fetchFact(ac.signal)
      .then((f) => {
        if (my !== nonce.current) return
        setFact(f)
        setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])
      })
      .catch((e) => {
        if (my !== nonce.current || (e && e.name === 'AbortError')) return
        setErr('사실을 불러오지 못했습니다. 다시 시도해 주세요.')
      })
      .finally(() => {
        if (my === nonce.current) setLoading(false)
      })
  }

  useEffect(() => {
    load()
    return () => { nonce.current++; ctrl.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = () => {
    if (!fact) return
    const txt = `${fact.text}\n\n✍️ ${spark}`
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // 현재 뜻밖의 사실 + 출발 질문을 자료 메모로 프로젝트에 추가
  const saveToProject = () => {
    if (!fact) return
    const bodyHtml =
      '<p>🤯 ' + escHtml(fact.text) + '</p>\n' +
      '<p>✍️ ' + escHtml(spark) + '</p>'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: fact.text.length > 40 ? fact.text.slice(0, 40) + '…' : fact.text,
      bodyHtml,
      meta: fact.source ? { 출처: fact.source } : undefined,
    })
    if (id) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, minHeight: 0, overflow: 'auto' }
  const factStyle: React.CSSProperties = { fontSize: 18, lineHeight: 1.6, fontWeight: 600, wordBreak: 'keep-all' }
  const msg: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 15 }
  const sparkBox: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }
  const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>사실을 불러오는 중…</div>}
        {!loading && err && <div style={msg}>{err}</div>}
        {!loading && !err && fact && (
          <>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}><Emoji e="🤯"/> 뜻밖의 사실</div>
            <div style={factStyle}>{emojify(fact.text)}</div>
          </>
        )}
        {!loading && !err && !fact && <div style={msg}>사실이 없습니다. ‘다른 사실’을 눌러 주세요.</div>}
      </div>

      <div style={sparkBox}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}><Emoji e="✍️"/> 한 문단 글감</div>
        {spark}
      </div>

      <div style={actions}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀"/> 다른 사실</button>
        <button className="minibtn" onClick={() => setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])} disabled={loading}><Emoji e="💡"/> 다른 글감 질문</button>
        <button className="minibtn" onClick={copy} disabled={loading || !fact}>{copied ? <><Emoji e="✅"/> 복사됨</> : <><Emoji e="📋"/> 글쓰기에 복사</>}</button>
        <button
          className="linkbtn"
          onClick={saveToProject}
          disabled={loading || !fact || !bridge}
          title={bridge ? '이 사실과 출발 질문을 프로젝트 자료(소재)로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ color: 'var(--ok)', fontSize: 13 }}>✓ 프로젝트 자료(소재)에 추가했습니다.</div>}

      <div style={hint}>뜻밖의 잡지식 한 줄을 받아, 그 사실에서 출발하는 한 문단을 글감 질문에 답하며 써보세요. 마음에 드는 사실이 나올 때까지 ‘다른 사실’을 눌러도 좋습니다.</div>
    </div>
  )
}
