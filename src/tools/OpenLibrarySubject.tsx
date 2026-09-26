// 주제별 도서 탐색 — 배경 자료조사용. Open Library Subjects API(키 불필요·HTTPS·CORS 허용)로 주제 대표 도서를 모은다.
// https://openlibrary.org/subjects/{subject}.json?limit=15 — 제목/저자/연도. 결과는 클립보드 복사 가능.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'openlibrary-subject', name: '주제별 도서 탐색', icon: '🗂️', group: '리서치·자료', intro: '주제어로 대표 도서를 모아 배경 자료조사에 활용하세요', w: 440, h: 600 }

interface Work { key: string; title: string; author: string; year: string; cover?: string; url?: string }

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자/외부 텍스트를 안전하게 처리)
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const SEEDS = ['war', 'medicine', 'space', 'love', 'magic', 'history', 'ocean', 'travel', 'art', 'mystery', 'psychology', 'philosophy', 'cooking', 'science']

function normSubject(s: string) {
  // 공백→underscore, 소문자화. 주제 슬러그 규약에 맞춤.
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

async function fetchSubject(subject: string, signal: AbortSignal): Promise<Work[]> {
  const slug = normSubject(subject)
  const r = await fetch(`https://openlibrary.org/subjects/${encodeURIComponent(slug)}.json?limit=15`, { headers: { Accept: 'application/json' }, signal })
  if (!r.ok) throw new Error('status ' + r.status)
  const j = await r.json()
  const works: any[] = Array.isArray(j?.works) ? j.works : []
  return works.map((w, i) => ({
    key: (typeof w?.key === 'string' && w.key) || `w-${i}`,
    title: (typeof w?.title === 'string' && w.title.trim()) || '제목 미상',
    author: Array.isArray(w?.authors) && w.authors.length ? w.authors.map((a: any) => a?.name).filter(Boolean).join(', ') || '저자 미상' : '저자 미상',
    year: typeof w?.first_publish_year === 'number' ? String(w.first_publish_year) : '연도 미상',
    cover: typeof w?.cover_id === 'number' ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg` : undefined,
    url: typeof w?.key === 'string' ? `https://openlibrary.org${w.key}` : undefined,
  }))
}

export default function OpenLibrarySubject() {
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState('')
  const acRef = useRef<AbortController | null>(null)
  const nonce = useRef(0)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = async (term: string) => {
    const query = term.trim()
    if (!query) { setErr('주제어를 입력해 주세요. 예: war, medicine, space'); return }
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(''); setSubject(query)
    try {
      const list = await fetchSubject(query, ac.signal)
      if (ac.signal.aborted || my !== nonce.current) return
      setWorks(list)
      if (!list.length) setErr('해당 주제의 도서를 찾지 못했습니다. 다른 주제어(영문)를 시도해 보세요.')
    } catch (e) {
      if (ac.signal.aborted || my !== nonce.current) return
      setErr('도서를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setWorks([])
    } finally {
      if (!ac.signal.aborted && my === nonce.current) setLoading(false)
    }
  }

  const randomSubject = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(s)
    run(s)
  }

  useEffect(() => {
    randomSubject()
    return () => {
      acRef.current?.abort()
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }
  const copyOne = (w: Work) => copy(`${w.title} — ${w.author} (${w.year})`, w.key)
  const copyAll = () => {
    if (!works.length) return
    copy(`🗂️ 주제 "${subject}" 대표 도서\n\n` + works.map((w) => `· ${w.title} — ${w.author} (${w.year})`).join('\n'), '__all__')
  }

  const bridge = hasProjectBridge()

  // 현재 주제의 대표 도서 목록을 자료 메모(HTML)로 변환
  function worksToBodyHtml(): string {
    const parts: string[] = []
    parts.push('<p>🗂️ 주제 <b>' + escHtml(subject) + '</b> 대표 도서 (' + works.length + '권)</p>')
    parts.push('<ul>')
    for (const w of works) {
      let li = '<li>' + escHtml(w.title) + ' — ' + escHtml(w.author) + ' (' + escHtml(w.year) + ')'
      if (w.url) li += ' [<a href="' + escHtml(w.url) + '">상세</a>]'
      li += '</li>'
      parts.push(li)
    }
    parts.push('</ul>')
    parts.push('<p>출처: Open Library Subjects</p>')
    return parts.join('\n')
  }

  // 현재 주제의 대표 도서 목록을 프로젝트 자료 바인더("자료조사" 폴더)에 추가
  const addToProjectClick = () => {
    if (!bridge || !works.length) return
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: `주제별 도서 · ${subject} (${works.length}권)`,
      bodyHtml: worksToBodyHtml(),
    })
    if (id) {
      setSaved('프로젝트 자료 "자료조사" 폴더에 추가했습니다.')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(''), 2000)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(q) }}
          placeholder="주제어 입력 (예: war, medicine, space)"
          style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn-primary" onClick={() => run(q)} disabled={loading}>탐색</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={randomSubject}><Emoji e="🔀"/> 랜덤 주제</button>
        <button className="minibtn" onClick={copyAll} disabled={!works.length}>{copied === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 목록 전체 복사</>}</button>
        <button
          className="linkbtn"
          onClick={addToProjectClick}
          disabled={!bridge || !works.length}
          title={bridge ? '현재 주제의 대표 도서 목록을 프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {saved && (
        <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>✓ {saved}</div>
      )}

      {subject && !err && (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          주제 <b style={{ color: 'var(--accent)' }}>{subject}</b>{!loading && works.length ? ` · ${works.length}권` : ''}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>불러오는 중…</div>}
        {!loading && err && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji e="📡"/></div>
            <div>{err}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={() => run(q || subject)}>다시 시도</button>
          </div>
        )}
        {!loading && !err && works.map((w) => (
          <div key={w.key} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 68, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {w.cover ? <img src={w.cover} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span style={{ fontSize: 20 }}><Emoji e="📕"/></span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{w.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{w.author}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 1 }}>{w.year}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copyOne(w)}>{copied === w.key ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                {w.url && <a href={w.url} target="_blank" rel="noreferrer" className="minibtn" style={{ textDecoration: 'none' }}>자세히 →</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 11 }}>출처: Open Library Subjects. 주제어는 영문이 잘 맞습니다. 복사한 서지정보를 자료조사 메모·참고문헌에 붙여넣으세요.</div>
    </div>
  )
}
