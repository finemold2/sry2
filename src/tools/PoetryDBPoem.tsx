// 무작위 시 가져오기(영감) — 키 없는 공개 API로 영시 한 편을 가져와 글쓰기 영감을 준다.
// API: https://poetrydb.org/random (키 불필요·https·CORS 허용)
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'poetrydb-poem', name: '무작위 시 영감', icon: '📜', group: '영감·발상', intro: '무작위 영시 한 편에서 오늘의 정서를 빌려보세요', w: 440, h: 560 }

interface Poem { title: string; author: string; lines: string[] }

// HTML 본문에 넣을 때 특수문자(&,<,>) escape — bodyHtml 안전 처리.
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 편당 본문이 길 수 있어 화면엔 일부만 보여준다.
const PREVIEW_LINES = 12

// "이 시의 정서로 글쓰기" 질문 — 가져온 시의 분위기를 글감으로 잇게 해 준다.
const SPARKS = [
  '이 시가 자아내는 정서를 한 단어로 고른 뒤, 그 감정이 가득한 장면을 묘사해 보세요.',
  '이 시의 화자는 지금 어디에 있을까요? 그 공간을 당신의 문장으로 그려보세요.',
  '이 시와 같은 분위기로, 오늘 하루를 한 문단으로 써보세요.',
  '이 시의 첫 줄을 한국어로 옮긴다면? 그 문장으로 글을 시작해 보세요.',
  '이 시가 누군가에게 보내는 편지라면, 받는 사람은 누구일까요? 답장을 써보세요.',
  '이 시에서 가장 마음에 닿는 한 줄을 골라, 그 줄을 제목 삼아 글을 써보세요.',
  '이 시의 정서를 정반대로 뒤집으면 어떤 이야기가 될까요?',
  '이 시를 읽은 인물의 표정과 그 직후의 행동을 한 장면으로 상상해 보세요.',
]

// poetrydb는 캐시가 강해 같은 결과가 반복될 수 있어 캐시버스터를 붙인다.
async function fetchRandomPoem(): Promise<Poem> {
  const r = await fetch(`https://poetrydb.org/random?t=${Date.now()}_${Math.random()}`)
  if (!r.ok) throw new Error('bad status ' + r.status)
  const j = await r.json()
  const p = Array.isArray(j) ? j[0] : j
  if (!p || !Array.isArray(p.lines)) throw new Error('empty')
  return {
    title: String(p.title || '무제'),
    author: String(p.author || '미상'),
    lines: p.lines.map((l: unknown) => String(l)),
  }
}

export default function PoetryDBPoem() {
  const [poem, setPoem] = useState<Poem | null>(null)
  const [spark, setSpark] = useState(SPARKS[0])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const nonce = useRef(0)
  const alive = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridge = hasProjectBridge()

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (alive.current) setToast('') }, 2200)
  }

  const load = async () => {
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false)
    try {
      const p = await fetchRandomPoem()
      if (!alive.current || my !== nonce.current) return
      setPoem(p)
      setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])
    } catch {
      if (!alive.current || my !== nonce.current) return
      setErr('시를 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (alive.current && my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const copy = () => {
    if (!poem) return
    const txt = `${poem.title}\n— ${poem.author}\n\n${poem.lines.join('\n')}`
    navigator.clipboard?.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => { if (alive.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // 현재 시(제목/저자/본문 일부)와 정서 질문을 프로젝트 자료 〈인용〉 폴더에 저장.
  // PoetryDB 수록작은 퍼블릭 도메인이라 본문 일부 인용이 가능하다.
  const addToProj = () => {
    if (!poem || !hasProjectBridge()) return
    const shown = poem.lines.slice(0, PREVIEW_LINES)
    const remain = Math.max(0, poem.lines.length - PREVIEW_LINES)
    const bodyHtml = [
      `<p style="color:#888;font-size:12px;">PoetryDB · 퍼블릭 도메인</p>`,
      `<p style="font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(shown.join('\n'))}</p>`,
      remain > 0 ? `<p style="color:#888;font-size:12px;">… 외 ${remain}줄</p>` : '',
      `<hr/>`,
      `<p><b>✍️ 정서 질문:</b> ${escapeHtml(spark)}</p>`,
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인용',
      title: `${poem.title} — ${poem.author}`,
      bodyHtml,
      meta: { 출처: 'PoetryDB', 저자: poem.author, 라이선스: 'Public Domain' },
    })
    flashToast(id ? '프로젝트 자료 〈인용〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const preview = poem ? poem.lines.slice(0, PREVIEW_LINES) : []
  const more = poem ? Math.max(0, poem.lines.length - PREVIEW_LINES) : 0

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, minHeight: 0, overflow: 'auto' }
  const titleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all' }
  const authorStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 13 }
  const bodyStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text)', marginTop: 4 }
  const moreStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, marginTop: 6 }
  const msg: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', margin: 'auto' }
  const sparkBox: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }
  const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const toastBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>시를 불러오는 중…</div>}
        {!loading && err && <div style={msg}>{err}</div>}
        {!loading && !err && poem && (
          <>
            <div style={titleStyle}>{poem.title}</div>
            <div style={authorStyle}>— {poem.author}</div>
            <div style={bodyStyle}>{preview.join('\n')}</div>
            {more > 0 && <div style={moreStyle}>… 외 {more}줄 (복사하면 전문이 담깁니다)</div>}
          </>
        )}
        {!loading && !err && !poem && <div style={msg}>시가 없습니다. ‘다른 시’를 눌러 주세요.</div>}
      </div>

      <div style={sparkBox}><Emoji e="✍️"/> {spark}</div>

      <div style={actions}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀"/> 다른 시</button>
        <button className="minibtn" onClick={() => setSpark(SPARKS[Math.floor(Math.random() * SPARKS.length)])} disabled={loading}><Emoji e="💡"/> 다른 글감 질문</button>
        <button className="minibtn" onClick={copy} disabled={loading || !poem}>{copied ? <><Emoji e="✅"/> 복사됨</> : <><Emoji e="📋"/> 시 전문 복사</>}</button>
      </div>

      {/* 연계: 현재 시(제목/저자/본문 일부)와 정서 질문을 프로젝트 자료 〈인용〉에 저장(PoetryDB=퍼블릭 도메인) */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addToProj}
          disabled={loading || !poem || !bridge}
          title={
            !bridge
              ? '프로젝트에 연결되어 있지 않습니다'
              : !poem
                ? '저장할 시가 없습니다'
                : '현재 시와 정서 질문을 프로젝트 자료 〈인용〉에 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={toastBox}>{toast}</div>}

      <div style={hint}>키 없이 공개된 영시 모음(PoetryDB)에서 무작위로 한 편을 가져옵니다. 마음에 드는 정서가 나올 때까지 ‘다른 시’를 눌러보고, 그 분위기를 빌려 한 문단을 써보세요.</div>
    </div>
  )
}
