// 고전 도서관 — 퍼블릭도메인 명작 탐색(Wikisource · 위키문헌).
//  미디어위키 API(origin=* 로 브라우저 CORS 허용) — 한국어(ko.wikisource) 우선, 부족/없으면 영어(en.wikisource) 폴백.
//  키워드 검색 + 무작위 추천. 항목 링크(위키문헌), 발췌(extracts), "이 작품에서 영감" → 스니펫 저장 / 프로젝트 자료조사 폴더 추가.
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'classic-library', name: '고전 도서관', icon: '📜', group: '리서치·자료', intro: '퍼블릭도메인 명작을 탐색하고 영감을 얻으세요', w: 460, h: 600 }

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 외부 서지정보를 안전하게 처리)
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// MediaWiki search snippet(HTML) → 순수 텍스트(태그 제거 + 엔티티 정리)
function stripHtml(s: string): string {
  if (!s) return ''
  const t = s.replace(/<[^>]*>/g, '')
  return t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const WIKI_LABEL: Record<WikiLang, string> = { ko: '한국어', en: '영어' }
const WIKI_HOST: Record<WikiLang, string> = { ko: 'https://ko.wikisource.org', en: 'https://en.wikisource.org' }

const SEEDS = ['neverland', 'mythology', 'ghost', 'sea', 'adventure', 'love', 'detective', 'war', 'fairy tales', 'philosophy', 'dystopia', 'travel', 'shakespeare', 'gothic', 'frankenstein', 'odyssey']

type WikiLang = 'ko' | 'en'

interface Work {
  id: string            // `${lang}:${title}` — 안정적 고유키
  title: string
  snippet: string       // 태그 제거된 검색 발췌(있으면)
  lang: WikiLang
  pageUrl: string       // https://{lang}.wikisource.org/wiki/{title}
}

function makeWork(title: string, snippetHtml: string, lang: WikiLang): Work {
  return {
    id: `${lang}:${title}`,
    title: title || '제목 미상',
    snippet: stripHtml(snippetHtml || ''),
    lang,
    pageUrl: `${WIKI_HOST[lang]}/wiki/${encodeURIComponent(title)}`,
  }
}

// ---------- API: 검색 ----------
async function searchWiki(lang: WikiLang, query: string, signal: AbortSignal): Promise<Work[]> {
  const url = `${WIKI_HOST[lang]}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=20&format=json&origin=*`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const arr: any[] = j?.query?.search
  if (!Array.isArray(arr)) return []
  return arr
    .filter((d) => d && typeof d.title === 'string')
    .map((d) => makeWork(d.title, typeof d.snippet === 'string' ? d.snippet : '', lang))
}

// ---------- API: 무작위 ----------
async function randomWiki(lang: WikiLang, limit: number, signal: AbortSignal): Promise<Work[]> {
  const url = `${WIKI_HOST[lang]}/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=${limit}&format=json&origin=*`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const arr: any[] = j?.query?.random
  if (!Array.isArray(arr)) return []
  return arr
    .filter((d) => d && typeof d.title === 'string')
    .map((d) => makeWork(d.title, '', lang))
}

// ---------- API: 발췌(선택 항목) ----------
async function fetchExtract(work: Work, signal: AbortSignal): Promise<string> {
  const url = `${WIKI_HOST[work.lang]}/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=600&titles=${encodeURIComponent(work.title)}&format=json&origin=*`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const pages = j?.query?.pages
  if (pages && typeof pages === 'object') {
    for (const k of Object.keys(pages)) {
      const ex = pages[k]?.extract
      if (typeof ex === 'string' && ex.trim()) return ex.trim()
    }
  }
  return ''
}

export default function ClassicLibrary({ payload }: { payload?: Record<string, unknown> }) {
  const initial = typeof payload?.query === 'string' ? (payload.query as string) : ''
  const [q, setQ] = useState(initial)
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')          // 작업 결과(스니펫/프로젝트) 토스트
  const [busyId, setBusyId] = useState('')        // 발췌 가져오는 중인 항목 id
  const nonce = useRef(0)
  const ac = useRef<AbortController | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bridge = hasProjectBridge()

  useEffect(() => () => {
    ac.current?.abort()
    if (flashTimer.current) clearTimeout(flashTimer.current)
  }, [])

  const toast = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 2200)
  }

  // 공용 로더: nonce 경쟁상태/언마운트 정리 — runner 가 Work[] 를 반환
  const load = (runner: (signal: AbortSignal) => Promise<Work[]>) => {
    const my = ++nonce.current
    ac.current?.abort()
    const controller = new AbortController()
    ac.current = controller
    setLoading(true); setErr('')
    runner(controller.signal)
      .then((list) => { if (my === nonce.current) setWorks(list) })
      .catch((e) => {
        if (controller.signal.aborted || my !== nonce.current) return
        setErr('작품을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')
        setWorks([])
        void e
      })
      .finally(() => { if (my === nonce.current) setLoading(false) })
  }

  // 검색: 한국어(ko) 우선 → 결과 없으면 영어(en) 폴백
  const runSearch = (term: string) => {
    const query = term.trim()
    if (!query) { setWorks([]); setErr(''); return }
    load(async (signal) => {
      const ko = await searchWiki('ko', query, signal)
      if (ko.length) return ko
      return searchWiki('en', query, signal)
    })
  }

  // 무작위 추천: ko 우선, 부족하면 en 으로 채움
  const randomPick = () => {
    setQ('')
    load(async (signal) => {
      const ko = await randomWiki('ko', 12, signal)
      if (ko.length >= 12) return ko
      const en = await randomWiki('en', 12 - ko.length, signal)
      const seen = new Set(ko.map((w) => w.id))
      return [...ko, ...en.filter((w) => !seen.has(w.id))]
    })
  }

  // 최초: 페이로드 검색어가 있으면 검색, 없으면 무작위 추천
  useEffect(() => {
    if (initial.trim()) runSearch(initial)
    else randomPick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 임시(논나운스) 발췌 취득 — 사용자가 항목별로 누르므로 자체 컨트롤러로 처리(목록 로딩과 독립)
  const withExtract = async (w: Work): Promise<string> => {
    const controller = new AbortController()
    try { return await fetchExtract(w, controller.signal) }
    catch { return '' }
  }

  // "이 작품에서 영감" → 공유 스니펫에 저장(여러 도구가 함께 사용)
  const inspire = async (w: Work) => {
    setBusyId(w.id)
    const extract = await withExtract(w)
    setBusyId('')
    const body = extract || w.snippet || '발췌 정보 없음'
    const text = `[고전 영감] ${w.title} (${WIKI_LABEL[w.lang]} 위키문헌)\n${body}\n출처: Wikisource(퍼블릭도메인) ${w.pageUrl}`
    addToLibrary('snippets', { text, source: 'Wikisource (PD)', tags: ['고전', '영감', '위키문헌'] })
    toast('스니펫에 저장됨 — 영감 메모로 재사용하세요')
  }

  // 표시 중인 작품을 프로젝트 자료조사 폴더에 추가(발췌 + 출처)
  const addBook = async (w: Work) => {
    if (!bridge) return
    setBusyId(w.id)
    const extract = await withExtract(w)
    setBusyId('')
    const body = extract || w.snippet || ''
    const bodyHtml = [
      '<p>📜 고전 도서관 (Wikisource · 위키문헌 · 퍼블릭도메인)</p>',
      '<p><b>제목:</b> ' + escHtml(w.title) + '</p>',
      '<p><b>언어:</b> ' + escHtml(WIKI_LABEL[w.lang]) + '</p>',
      body ? '<p><b>발췌:</b> ' + escHtml(body) + '</p>' : '',
      '<p><b>출처:</b> <a href="' + escHtml(w.pageUrl) + '">위키문헌에서 보기</a> · 퍼블릭도메인(저작권 만료)</p>',
    ].filter(Boolean).join('\n')
    const m: Record<string, string> = { 언어: WIKI_LABEL[w.lang], 출처: w.pageUrl, 라이선스: 'Public Domain (Wikisource)' }
    const made = addToProject({
      kind: 'text',
      root: 'research',
      folder: '고전 자료',
      title: `📜 ${w.title}`,
      bodyHtml,
      meta: m,
    })
    if (made) toast('프로젝트 「고전 자료」 폴더에 추가됨')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch(q) }}
          placeholder="제목·주제로 검색 (예: Frankenstein, 신화, Shakespeare)"
          style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="btn-primary" onClick={() => runSearch(q)}>검색</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={randomPick}><Emoji e="🔀"/> 무작위 추천</button>
        <span className="license-badge" title="모든 작품은 저작권이 만료된 퍼블릭도메인입니다 (위키문헌)">Public Domain</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>불러오는 중…</div>}
        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>{err}</div>}
        {!loading && !err && !works.length && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>검색 결과가 없습니다. 다른 검색어를 입력하거나 무작위 추천을 눌러 보세요.</div>
        )}
        {!loading && !err && works.map((w) => (
          <div key={w.id} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 68, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20 }}><Emoji e="📖"/></span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{w.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span><Emoji e="🌐"/> {WIKI_LABEL[w.lang]} 위키문헌</span>
              </div>
              {w.snippet && (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{w.snippet}</div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                <a className="linkbtn" href={w.pageUrl} target="_blank" rel="noopener noreferrer" title="위키문헌에서 전문 읽기"><Emoji e="📖"/> 읽기</a>
                <button className="minibtn" onClick={() => inspire(w)} disabled={busyId === w.id} title="이 작품을 영감 스니펫으로 저장"><Emoji e="✨"/> 이 작품에서 영감</button>
                <button
                  className="linkbtn"
                  onClick={() => addBook(w)}
                  disabled={!bridge || busyId === w.id}
                  title={bridge ? '이 작품을 프로젝트 「고전 자료」 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {flash && <div className="license-note" style={{ color: 'var(--ok)', fontWeight: 600 }}>✓ {flash}</div>}
      <div className="license-note">
        출처: <a href="https://wikisource.org" target="_blank" rel="noopener noreferrer">Wikisource(위키문헌)</a> · 수록 작품은 저작권이 만료된 <b>퍼블릭도메인(PD)</b>입니다. 본문을 인용·번안·재창작에 자유롭게 활용할 수 있습니다.
      </div>
    </div>
  )
}
