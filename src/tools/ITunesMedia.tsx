// 미디어 검색(음악·영화·책 자료) — iTunes Search API(키 불필요·https·CORS 허용)로 작품·아티스트를 찾는다.
// https://itunes.apple.com/search?term=Q&limit=12 — 제목/아티스트/유형/연도/썸네일.
// 작품 속 음악·영화 인용 고증과 분위기 참고에 활용. 결과는 클립보드 복사 가능.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'itunes-media', name: '미디어 검색', icon: '🎬', group: '리서치·자료', intro: '음악·영화·책 자료를 검색해 인용 고증·분위기 참고에 활용하세요', w: 460, h: 620 }

interface Media {
  key: string
  title: string
  artist: string
  kind: string
  year: string
  art?: string
  url: string
}

const SEEDS = ['Beatles', 'Hans Zimmer', 'jazz', 'Studio Ghibli', 'Bach', 'Nirvana', 'film score', 'Radiohead', 'classical', 'Ennio Morricone']

// API kind/wrapperType 값을 한국어 유형으로 매핑
const KIND_LABEL: Record<string, string> = {
  song: '음악',
  'music-video': '뮤직비디오',
  'feature-movie': '영화',
  'tv-episode': 'TV 에피소드',
  ebook: '전자책',
  podcast: '팟캐스트',
  'podcast-episode': '팟캐스트',
  audiobook: '오디오북',
  'software': '앱',
  'coached-audio': '오디오',
}
const WRAPPER_LABEL: Record<string, string> = {
  track: '음악·영상',
  collection: '앨범·모음',
  artist: '아티스트',
  audiobook: '오디오북',
}

function labelOf(d: any): string {
  if (d?.kind && KIND_LABEL[d.kind]) return KIND_LABEL[d.kind]
  if (d?.wrapperType && WRAPPER_LABEL[d.wrapperType]) return WRAPPER_LABEL[d.wrapperType]
  return d?.kind || d?.wrapperType || '미디어'
}

function yearOf(d: any): string {
  const r: string = d?.releaseDate || ''
  const m = r.match(/^(\d{4})/)
  return m ? m[1] : '연도 미상'
}

function biggerArt(u?: string): string | undefined {
  // 100x100 썸네일을 더 큰 해상도로 치환(없으면 원본 사용)
  if (!u) return undefined
  return u.replace(/\/\d+x\d+bb?\.(jpg|png)/, '/200x200bb.$1')
}

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자/외부 데이터를 안전하게 처리)
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 미디어를 프로젝트 자료 본문 HTML 로 변환(제목/아티스트/유형/연도 + 출처 링크). IP 이미지는 넣지 않는다.
function mediaToBodyHtml(m: Media): string {
  const parts: string[] = []
  parts.push('<p>' + escHtml(m.artist) + ' · ' + escHtml(m.kind) + ' · ' + escHtml(m.year) + '</p>')
  if (m.url) parts.push('<p>출처: <a href="' + escHtml(m.url) + '">iTunes</a></p>')
  return parts.join('\n')
}

async function search(q: string, signal?: AbortSignal): Promise<Media[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=12`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const results: any[] = Array.isArray(j?.results) ? j.results : []
  return results.map((d, i) => ({
    key: String(d.trackId || d.collectionId || d.artistId || `${d.trackName || ''}-${i}`),
    title: (d.trackName || d.collectionName || d.artistName || '제목 미상').trim(),
    artist: (d.artistName || d.collectionName || '미상').trim(),
    kind: labelOf(d),
    year: yearOf(d),
    art: biggerArt(d.artworkUrl100 || d.artworkUrl60 || d.artworkUrl30),
    url: d.trackViewUrl || d.collectionViewUrl || d.artistViewUrl || '',
  }))
}

export default function ITunesMedia() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [searched, setSearched] = useState(false)
  const [proj, setProj] = useState('')
  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)

  const run = async (term: string) => {
    const query = term.trim()
    if (!query) return
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setCopied(''); setSearched(true)
    try {
      const list = await search(query, ac.signal)
      if (my === nonce.current && !ac.signal.aborted) setItems(list)
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) { setErr('미디어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setItems([]) }
    } finally {
      if (my === nonce.current && !ac.signal.aborted) setLoading(false)
    }
  }

  const randomSearch = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(s)
    run(s)
  }

  useEffect(() => {
    randomSearch()
    return () => { acRef.current?.abort() } // 언마운트 시 진행 중 요청 정리
    // eslint-disable-next-line
  }, [])

  const copyOne = (m: Media) => {
    const text = `${m.title} — ${m.artist} (${m.kind}, ${m.year})`
    navigator.clipboard?.writeText(text).then(() => { setCopied(m.key); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }
  const copyAll = () => {
    if (!items.length) return
    const text = items.map((m) => `· ${m.title} — ${m.artist} (${m.kind}, ${m.year})`).join('\n')
    navigator.clipboard?.writeText(text).then(() => { setCopied('__all__'); setTimeout(() => setCopied(''), 1500) }).catch(() => {})
  }

  // ── 프로젝트 연동: 표시된 미디어를 자료조사 자료(분위기 참고용)로 추가 ──
  const bridge = hasProjectBridge()
  const addOne = (m: Media): boolean => {
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: `${m.title} — ${m.artist}`,
      bodyHtml: mediaToBodyHtml(m),
      meta: { 유형: m.kind, 연도: m.year, 아티스트: m.artist, ...(m.url ? { 출처: m.url } : {}) },
    })
    return !!id
  }
  const showProj = (msg: string) => { setProj(msg); setTimeout(() => setProj(''), 1800) }
  const addMediaToProject = (m: Media) => {
    if (!bridge || !addOne(m)) return
    showProj('✓ 프로젝트에 자료 추가했습니다.')
  }
  const addAllToProject = () => {
    if (!bridge || !items.length) return
    let ok = 0
    for (const m of items) if (addOne(m)) ok++
    if (ok) showProj(`✓ 프로젝트에 ${ok}개 자료 추가했습니다.`)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(q) }}
          placeholder="음악·영화·책·아티스트 검색 (예: Hans Zimmer)"
          style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn-primary" onClick={() => run(q)} disabled={loading}>검색</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={randomSearch} disabled={loading}><Emoji e="🔀"/> 랜덤 키워드</button>
        <button className="minibtn" onClick={copyAll} disabled={!items.length}>{copied === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 목록 전체 복사</>}</button>
        <button className="linkbtn" onClick={addAllToProject} disabled={!bridge || !items.length} title={bridge ? '표시된 미디어를 프로젝트 자료조사 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {proj && <div style={{ color: 'var(--ok)', fontSize: 12 }}>{proj}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>불러오는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>{err}</div>}
        {!loading && !err && searched && !items.length && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</div>}
        {!loading && !err && items.map((m) => (
          <div key={m.key} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {m.art ? <img src={m.art} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget.style.display = 'none') }} /> : <span style={{ fontSize: 22 }}><Emoji e="🎵"/></span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.artist}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, color: 'var(--accent)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>{m.kind}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{m.year}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copyOne(m)}>{copied === m.key ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                <button className="linkbtn" onClick={() => addMediaToProject(m)} disabled={!bridge} title={bridge ? '이 미디어를 프로젝트 자료조사 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                {m.url && <a href={m.url} target="_blank" rel="noreferrer noopener" className="minibtn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}><Emoji e="🔗"/> 보기</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 11 }}>출처: iTunes Search API. 작품 속 음악·영화 인용 고증과 장면 분위기 참고로 활용하세요.</div>
    </div>
  )
}
