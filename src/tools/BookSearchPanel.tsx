// 도서 검색 — 자료조사·레퍼런스용. Open Library Search API(키 불필요·HTTPS·CORS 허용)로 책을 찾아준다.
// https://openlibrary.org/search.json?q=Q&limit=12 — 제목/저자/연도. 결과는 클립보드 복사 가능.
// 저작권 안전화: 표지 이미지는 Open Library 가 제공하지만 출판사 등 제3자 저작권 대상이다.
//   표지 <img> 는 화면상의 "미리보기·식별 보조용"으로만 노출하고, 저장(addBook)되는 데이터에는
//   표지 URL 을 절대 포함하지 않는다(서지 텍스트만 저장). 표지 표시는 토글로 끌 수 있다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addReference, hasReferenceBridge, Emoji } from './linkbus'

export const meta = { id: 'book-search', name: '도서 검색', icon: '📚', group: '리서치·자료', intro: '자료조사·레퍼런스용 책을 검색하세요', w: 440, h: 580 }

interface Book { key: string; title: string; author: string; year: string; cover?: string }

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 외부 서지정보를 안전하게 처리)
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Open Library key(예: '/works/OL12345W')에서 식별자만 추출
function bookId(key: string): string {
  return key.replace(/^\/(works|books)\//, '')
}

const SEEDS = ['글쓰기', '소설 작법', '신화', '심리학', '역사', '철학', '우주', '바다', '여행', '예술', '기억', '도시', '문학', '과학']

async function search(q: string): Promise<Book[]> {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12`)
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const docs: any[] = j.docs || []
  return docs.map((d) => ({
    key: d.key || d.title || Math.random().toString(36),
    title: d.title || '제목 미상',
    author: (d.author_name && d.author_name.length ? d.author_name.join(', ') : '저자 미상'),
    year: d.first_publish_year ? String(d.first_publish_year) : '연도 미상',
    // cover 는 화면 미리보기 전용. 저장 데이터에는 절대 넣지 않는다(아래 addBook 참조).
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
  }))
}

export default function BookSearchPanel() {
  const [q, setQ] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState('')
  const [showCovers, setShowCovers] = useState(true) // 표지 미리보기 표시 on/off (기본 on)
  const [refSaved, setRefSaved] = useState('')
  const nonce = useRef(0)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridge = hasProjectBridge()
  const refBridge = hasReferenceBridge()

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (refSavedTimer.current) clearTimeout(refSavedTimer.current)
  }, [])

  const run = async (term: string) => {
    const query = term.trim()
    if (!query) return
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied('')
    try {
      const list = await search(query)
      if (my === nonce.current) setBooks(list)
    } catch {
      if (my === nonce.current) { setErr('도서를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setBooks([]) }
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const randomSearch = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(s)
    run(s)
  }

  useEffect(() => { randomSearch() /* eslint-disable-next-line */ }, [])

  const copyOne = (b: Book) => {
    const text = `${b.title} — ${b.author} (${b.year})`
    navigator.clipboard?.writeText(text).then(() => { setCopied(b.key); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }
  const copyAll = () => {
    if (!books.length) return
    const text = books.map((b) => `· ${b.title} — ${b.author} (${b.year})`).join('\n')
    navigator.clipboard?.writeText(text).then(() => { setCopied('__all__'); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }

  // 표시 중인 도서(제목/저자/연도/식별자)를 프로젝트 자료조사 폴더에 추가.
  // 저작권 안전화: 표지 이미지(b.cover)는 출판사 등 제3자 저작권 대상이므로
  //   저장 데이터에 절대 포함하지 않는다 — 아래 bodyHtml/meta 는 서지 텍스트와 Open Library 출처 링크만 담는다.
  const addBook = (b: Book) => {
    if (!bridge) return
    const id = bookId(b.key)
    const olUrl = b.key.startsWith('/') ? `https://openlibrary.org${b.key}` : undefined
    const bodyHtml = [
      '<p>📚 도서 검색 (Open Library)</p>',
      '<p><b>제목:</b> ' + escHtml(b.title) + '</p>',
      '<p><b>저자:</b> ' + escHtml(b.author) + '</p>',
      '<p><b>출판연도:</b> ' + escHtml(b.year) + '</p>',
      '<p><b>식별자:</b> ' + escHtml(id) + '</p>',
      olUrl ? '<p>출처: <a href="' + escHtml(olUrl) + '">Open Library</a></p>' : '',
      // 표지 URL 은 의도적으로 저장하지 않음(제3자 저작권). 서지 텍스트만 보존.
    ].filter(Boolean).join('\n')
    const meta: Record<string, string> = { 저자: b.author, 연도: b.year, 식별자: id }
    if (olUrl) meta['출처'] = olUrl
    const made = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: `📚 ${b.title} — ${b.author} (${b.year})`,
      bodyHtml,
      meta,
    })
    if (made) {
      setSaved(b.key)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(''), 2000)
    }
  }

  // 표시 중인 도서를 프로젝트 참고문헌(서지)에 직접 추가 — 손으로 재입력할 필요 없음.
  // 표지 URL 은 서지에 포함하지 않는다(제3자 저작권). '저자 미상'/'연도 미상' 같은 자리표시 문자열은 비워 둔다.
  const addBookToReferences = (b: Book) => {
    if (!refBridge) return
    const authors = b.author && b.author !== '저자 미상'
      ? b.author.split(',').map((a) => a.trim()).filter(Boolean)
      : []
    const olUrl = b.key.startsWith('/') ? `https://openlibrary.org${b.key}` : undefined
    const id = addReference({
      type: 'book',
      title: b.title || '제목 미상',
      authors,
      year: b.year && b.year !== '연도 미상' ? b.year : undefined,
      url: olUrl,
    })
    if (id) {
      setRefSaved(b.key)
      if (refSavedTimer.current) clearTimeout(refSavedTimer.current)
      refSavedTimer.current = setTimeout(() => setRefSaved(''), 2000)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(q) }}
          placeholder="제목·저자·주제로 검색 (예: 신화, 글쓰기)"
          style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn-primary" onClick={() => run(q)}>검색</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="minibtn" onClick={randomSearch}><Emoji e="🔀"/> 랜덤 주제</button>
        <button className="minibtn" onClick={copyAll} disabled={!books.length}>{copied === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 목록 전체 복사</>}</button>
        <button
          className="minibtn"
          onClick={() => setShowCovers((v) => !v)}
          title="표지 미리보기는 식별 보조용입니다. 끄면 📕 플레이스홀더로 표시됩니다."
        >
          {showCovers ? <><Emoji e="🖼️"/> 표지 켜짐</> : <><Emoji e="📕"/> 표지 꺼짐</>}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>불러오는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>{err}</div>}
        {!loading && !err && !books.length && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</div>}
        {!loading && !err && books.map((b) => (
          <div key={b.key} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
            {/* 표지 이미지: 미리보기·식별 보조용 전용. 토글로 끄면 📕 플레이스홀더. 저장 데이터에는 미포함. */}
            <div style={{ width: 48, height: 68, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {showCovers && b.cover ? (
                <>
                  <img src={b.cover} alt={`${b.title} 표지 미리보기`} title="미리보기·식별 보조용 (출판사 등 제3자 저작권)" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget.style.display = 'none') }} />
                  <span className="license-badge" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 8, lineHeight: 1.2, textAlign: 'center', padding: '1px 0', background: 'rgba(0,0,0,0.55)', color: '#fff' }}>식별용</span>
                </>
              ) : (
                <span style={{ fontSize: 20 }}><Emoji e="📕"/></span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{b.author}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 1 }}>{b.year}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
                <button className="minibtn" onClick={() => copyOne(b)}>{copied === b.key ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                <button
                  className="linkbtn"
                  onClick={() => addBookToReferences(b)}
                  disabled={!refBridge}
                  title={refBridge ? '이 도서를 프로젝트 참고문헌(서지)에 추가(표지 이미지 제외)' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="🔖"/> 참고문헌에 추가
                </button>
                <button
                  className="linkbtn"
                  onClick={() => addBook(b)}
                  disabled={!bridge}
                  title={bridge ? '이 도서를 프로젝트 자료조사 폴더에 추가(서지 텍스트만, 표지 이미지 제외)' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
                {refSaved === b.key && <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>✓ 참고문헌에 추가됨</span>}
                {saved === b.key && <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>✓ 자료조사에 추가됨</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="license-note" style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.5 }}>
        표지 이미지는 Open Library 제공 — 출판사 등 제3자 저작권. 미리보기·식별 보조용으로만 표시되며 원고·상업적 재사용 금지. 프로젝트에 추가 시 표지 이미지는 저장되지 않고 서지정보(제목·저자·연도·식별자)만 저장됩니다.
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 11 }}>출처: Open Library. 자료조사·레퍼런스로 활용하고, 복사한 서지정보를 원고 각주·참고문헌에 붙여넣으세요.</div>
    </div>
  )
}
