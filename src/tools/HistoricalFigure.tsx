// 역사 인물 자료 — 실존 인물의 공개 정보(위키백과)를 찾아 생애 요약을 보고, 모델로 '변주'한다.
//  검색: ko.wikipedia action=query&list=search (키 불필요·CORS origin=*), 요약: REST v1 summary(ko→en 폴백).
//  "베끼기"가 아니라 모델로 두고 변형하는 글쓰기 질문을 제공. 출처(위키백과 CC BY-SA)를 표기한다.
//  react 와 './linkbus' 외 import 금지.
import { useState, useEffect, useRef } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary, removeFromLibrary, useLibraryList,
  Emoji, emojify,
  type SharedSnippet,
} from './linkbus'

export const meta = { id: 'historical-figure', name: '역사 인물 자료', icon: '🏛️', group: '리서치·자료', intro: '실존 역사 인물의 공개 자료를 찾아 모델로 변주하세요', w: 560, h: 640 }

// bodyHtml/속성에 넣는 텍스트의 &,<,> escape
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 검색 snippet 의 <span class="searchmatch"> 등 HTML 제거 + 엔티티 해제
function stripTags(s: string): string {
  const t = (s || '').replace(/<[^>]+>/g, '')
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea')
    el.innerHTML = t
    return el.value
  }
  return t
}

const STORE_KEY = 'sry:tool:historical-figure'
const LKEY = 'historical-figure'

interface SearchItem { pageid: number; title: string; snippet: string }
interface Figure {
  title: string
  extract: string
  description?: string
  thumb?: string
  url?: string
  lang: 'ko' | 'en'
}

const SEEDS = ['이순신', '세종대왕', '신사임당', '클레오파트라', '레오나르도 다 빈치', '잔 다르크', '마리 퀴리', '나폴레옹', '안중근', '허난설헌']

// 모델로 '변주'하는 질문(그대로 베끼지 않도록 유도) — {n}=인물명
const VARIATIONS: ((n: string) => string)[] = [
  (n) => `'${n}'의 결정적 선택을 정반대로 바꾼 인물을 만든다면, 그는 무엇을 두려워할까?`,
  (n) => `'${n}'와(과) 같은 시대·직업이지만 이름·성별·신념이 다른 가상 인물을 한 명 빚어보자.`,
  (n) => `'${n}'의 가장 유명한 업적을, 전혀 다른 분야(예: 요리·항해·음악)로 옮겨 변주해보자.`,
  (n) => `'${n}'이(가) 끝내 이루지 못한 일을 대신 이루는 후손/제자 캐릭터를 상상해보자.`,
  (n) => `'${n}'의 공식 기록과 어긋나는 '숨겨진 동기'를 가진 가상 인물로 재해석해보자.`,
  (n) => `'${n}'을(를) 현대(또는 미래·다른 세계)로 옮기면 어떤 직업·갈등을 겪을까?`,
]

export default function HistoricalFigure({ payload }: { payload?: Record<string, unknown> }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [searched, setSearched] = useState(false)

  const [sel, setSel] = useState<SearchItem | null>(null)
  const [fig, setFig] = useState<Figure | null>(null)
  const [figLoading, setFigLoading] = useState(false)
  const [figErr, setFigErr] = useState('')

  const [variation, setVariation] = useState('')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')

  const saved = useLibraryList('snippets')
  // 이 도구가 저장한 인물 자료만(태그로 구분)
  const myFigures = saved.filter((s) => (s.tags || []).includes('역사인물'))

  const searchNonce = useRef(0)
  const figNonce = useRef(0)
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 마지막 검색어/선택 복원
  useEffect(() => {
    mounted.current = true
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const j = JSON.parse(raw)
        if (j && typeof j.q === 'string') setQ(j.q)
      }
    } catch { /* 무시 */ }
    return () => {
      mounted.current = false
      searchNonce.current++
      figNonce.current++
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // 검색어 저장
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ q })) } catch { /* 무시 */ }
  }, [q])

  // payload 로 인물명을 받으면 즉시 검색(연계 진입)
  useEffect(() => {
    const seed = (payload?.query || payload?.name || payload?.title)
    if (typeof seed === 'string' && seed.trim()) {
      setQ(seed)
      runSearch(seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flashCopied(key: string) {
    setCopied(key)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
  }
  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 1800)
  }

  async function runSearch(term: string) {
    const word = (term || '').trim()
    if (!word) { setResults([]); setSearched(false); setSearchErr(''); return }
    const my = ++searchNonce.current
    setSearching(true); setSearchErr(''); setSearched(true)
    try {
      const url = `https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(word)}&format=json&origin=*`
      const r = await fetch(url)
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (my !== searchNonce.current || !mounted.current) return
      const list: SearchItem[] = (j?.query?.search || []).map((p: { pageid: number; title: string; snippet?: string }) => ({
        pageid: p.pageid, title: p.title, snippet: stripTags(p.snippet || ''),
      }))
      setResults(list)
    } catch {
      if (my === searchNonce.current && mounted.current) { setSearchErr('검색에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.'); setResults([]) }
    } finally {
      if (my === searchNonce.current && mounted.current) setSearching(false)
    }
  }

  async function loadFigure(item: SearchItem) {
    const my = ++figNonce.current
    setSel(item); setFig(null); setFigErr(''); setFigLoading(true); setVariation(''); setCopied('')
    try {
      // 1) 한국어 위키 요약
      let data: Figure | null = null
      try {
        const r = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`)
        if (r.ok) {
          const j = await r.json()
          if (j && j.extract) {
            data = {
              title: j.title || item.title,
              extract: j.extract || '',
              description: j.description,
              thumb: j.thumbnail?.source,
              url: j.content_urls?.desktop?.page,
              lang: 'ko',
            }
          }
        }
      } catch { /* 폴백 시도 */ }
      // 2) 한국어가 비면 영어 위키로 폴백
      if (!data) {
        const r2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`)
        if (r2.ok) {
          const j2 = await r2.json()
          if (j2 && j2.extract) {
            data = {
              title: j2.title || item.title,
              extract: j2.extract || '',
              description: j2.description,
              thumb: j2.thumbnail?.source,
              url: j2.content_urls?.desktop?.page,
              lang: 'en',
            }
          }
        }
      }
      if (my !== figNonce.current || !mounted.current) return
      if (!data) throw new Error('no summary')
      setFig(data)
      setVariation(VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)](data.title))
    } catch {
      if (my === figNonce.current && mounted.current) setFigErr('생애 요약을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === figNonce.current && mounted.current) setFigLoading(false)
    }
  }

  function randomSeed() {
    const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(seed); runSearch(seed)
  }

  function shuffleVariation() {
    if (fig) setVariation(VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)](fig.title))
  }

  async function copy(text: string, key: string) {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashCopied(key)
    } catch { flashCopied('fail') }
  }

  // 인물 라이브러리(텍스트만)에 저장 — 공유 snippets 에 '역사인물' 태그로 보관
  function saveToLibrary() {
    if (!fig) return
    const credit = fig.lang === 'ko' ? '위키백과(한국어)' : 'Wikipedia(English)'
    const lines = [
      fig.title,
      fig.description ? `(${fig.description})` : '',
      '',
      fig.extract,
      '',
      `변주 질문: ${variation}`,
      `출처: ${credit}${fig.url ? ' — ' + fig.url : ''} · CC BY-SA`,
    ].filter((x) => x !== undefined)
    addToLibrary('snippets', {
      text: lines.join('\n'),
      source: credit,
      tags: ['역사인물', fig.title],
    } as Partial<SharedSnippet>)
    flashToast('인물 라이브러리에 저장했습니다.')
  }

  function delFromLibrary(id: string) {
    removeFromLibrary('snippets', id)
  }

  // 프로젝트 자료 〈인물 자료〉 폴더에 text 문서로 추가
  function saveToProjectBinder() {
    if (!fig || !hasProjectBridge()) return
    const credit = fig.lang === 'ko' ? '위키백과(한국어)' : 'Wikipedia(English)'
    const parts: string[] = []
    if (fig.description) parts.push(`<p><em>${esc(fig.description)}</em></p>`)
    if (fig.extract) parts.push(`<p>${esc(fig.extract)}</p>`)
    if (variation) parts.push(`<p><strong>✍️ 모델로 변주:</strong> ${esc(variation)}</p>`)
    parts.push(`<p style="color:#888;font-size:12px;">⚠️ 그대로 베끼지 말고, 영감·출발점으로만 활용하세요.</p>`)
    if (fig.url) parts.push(`<p><a href="${esc(fig.url)}">${esc(credit)}에서 전체 글 보기 →</a></p>`)
    parts.push(`<p style="color:#888;font-size:11px;">출처: ${esc(credit)} (CC BY-SA)</p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인물 자료',
      title: fig.title,
      bodyHtml: parts.join('\n'),
      meta: {
        출처: credit,
        라이선스: 'CC BY-SA',
        ...(fig.url ? { 링크: fig.url } : {}),
        ...(fig.description ? { 설명: fig.description } : {}),
      },
    })
    flashToast(id ? '프로젝트 자료 〈인물 자료〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); runSearch(q) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', minHeight: 0 }}>
      {/* 검색 바 */}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flex: '0 0 auto' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="역사 인물 이름 (예: 이순신, 클레오파트라)"
          style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
        <button type="submit" className="btn-primary"><Emoji e="🔍"/> 검색</button>
        <button type="button" className="minibtn" onClick={randomSeed} title="예시 인물로 검색"><Emoji e="🔀"/> 예시</button>
      </form>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 결과 + 라이브러리 */}
        <div style={{ width: '40%', minWidth: 160, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--panel)', display: 'flex', flexDirection: 'column' }}>
          {/* 검색 결과 */}
          <div style={{ flex: '1 1 auto' }}>
            {searching && <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13 }}>검색 중…</div>}
            {!searching && searchErr && (
              <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
                {searchErr}
                <div style={{ marginTop: 8 }}><button className="minibtn" onClick={() => runSearch(q)}>다시 시도</button></div>
              </div>
            )}
            {!searching && !searchErr && searched && results.length === 0 && (
              <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>검색 결과가 없습니다. 다른 이름으로 시도해 보세요.</div>
            )}
            {!searching && !searchErr && !searched && (
              <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
                위에서 실존 역사 인물의 이름을 검색하세요.<br />공개된 위키백과 자료로 생애 요약을 봅니다.
              </div>
            )}
            {!searching && !searchErr && results.map((it) => (
              <button
                key={it.pageid}
                onClick={() => loadFigure(it)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, lineHeight: 1.35,
                  background: sel?.pageid === it.pageid ? 'var(--chrome-2)' : 'transparent',
                  color: 'var(--text)', borderLeft: sel?.pageid === it.pageid ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600 }}>{emojify(it.title)}</div>
                {it.snippet && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>{emojify(it.snippet)}</div>}
              </button>
            ))}
          </div>

          {/* 인물 라이브러리(텍스트만) */}
          <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
            <div style={{ padding: '8px 11px 4px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5 }}>
              <Emoji e="📚"/> 인물 라이브러리 ({myFigures.length})
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto', padding: '0 6px 8px' }}>
              {myFigures.length === 0 ? (
                <div style={{ padding: '4px 6px 8px', color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.5 }}>
                  저장한 인물이 없습니다. 요약을 보고 〈라이브러리에 저장〉을 눌러 보관하세요.
                </div>
              ) : myFigures.map((s) => {
                const name = (s.tags || []).find((t) => t !== '역사인물') || (s.text || '').split('\n')[0]
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px' }}>
                    <button
                      className="linkbtn"
                      onClick={() => { setQ(name); runSearch(name) }}
                      title="이 인물 다시 검색"
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {emojify(name)}
                    </button>
                    <button
                      className="minibtn"
                      onClick={() => copy(s.text, 'lib-' + s.id)}
                      title="저장된 자료 복사"
                      style={{ flex: '0 0 auto', fontSize: 11, padding: '3px 6px' }}
                    >
                      {copied === 'lib-' + s.id ? '✓' : '복사'}
                    </button>
                    <button
                      className="minibtn"
                      onClick={() => delFromLibrary(s.id)}
                      title="라이브러리에서 삭제"
                      style={{ flex: '0 0 auto', fontSize: 11, padding: '3px 6px' }}
                    >
                      <Emoji e="🗑"/>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 상세(생애 요약) */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }}>
          {!sel && !figLoading && (
            <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
              왼쪽 목록에서 인물을 선택하면 생애 요약이 여기에 표시됩니다.<br /><br />
              실존 인물의 자료는 <b style={{ color: 'var(--text)' }}>그대로 베끼는 용도가 아니라</b>, 가상 인물을 빚는 <b style={{ color: 'var(--text)' }}>모델·출발점</b>으로 쓰세요.
            </div>
          )}
          {figLoading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>생애 요약 불러오는 중…</div>}
          {!figLoading && figErr && (
            <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
              {figErr}
              {sel && <div style={{ marginTop: 10 }}><button className="minibtn" onClick={() => sel && loadFigure(sel)}>다시 시도</button></div>}
            </div>
          )}
          {!figLoading && !figErr && fig && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{emojify(fig.title)}</div>
              {fig.description && <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 10 }}>{emojify(fig.description)}</div>}
              {fig.thumb && (
                <img src={fig.thumb} alt={fig.title} style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10 }} />
              )}
              <div style={{ fontSize: 13.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{fig.extract ? emojify(fig.extract) : '요약 본문이 없습니다.'}</div>
              {fig.lang === 'en' && (
                <div className="license-note" style={{ marginTop: 6 }}>한국어 요약이 없어 영어 위키백과 요약을 표시합니다.</div>
              )}

              {/* 변주 질문 */}
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}><Emoji e="✍️"/> 이 인물을 모델로 변주</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{emojify(variation)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={shuffleVariation}><Emoji e="🔀"/> 다른 질문</button>
                  <button className="minibtn" onClick={() => copy(variation, 'var')}>{copied === 'var' ? '✓ 복사됨' : '질문 복사'}</button>
                </div>
              </div>

              {/* 액션 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {fig.extract && <button className="btn-primary" onClick={() => copy(fig.extract, 'sum')}>{copied === 'sum' ? '✓ 복사됨' : <><Emoji e="📋"/> 요약 복사</>}</button>}
                <button className="minibtn" onClick={saveToLibrary}><Emoji e="📚"/> 라이브러리에 저장</button>
                {fig.url && <button className="minibtn" onClick={() => copy(fig.url || '', 'url')}>{copied === 'url' ? '✓ 복사됨' : <><Emoji e="🔗"/> 링크 복사</>}</button>}
                <button
                  className="linkbtn"
                  onClick={saveToProjectBinder}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '이 인물 자료를 〈인물 자료〉 폴더에 추가' : '프로젝트가 연결되지 않았습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
              {copied === 'fail' && <div style={{ color: 'var(--warn)', fontSize: 12, marginTop: 8 }}>복사에 실패했어요. 직접 선택해 복사해주세요.</div>}
              {toast && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8 }}>{toast}</div>}

              {/* 출처/저작권 */}
              <div className="license-note" style={{ marginTop: 14, lineHeight: 1.6 }}>
                출처: {fig.lang === 'ko' ? '위키백과(한국어)' : 'Wikipedia(English)'} · 텍스트 CC BY-SA 4.0
                {fig.url && <> · <a href={fig.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>원문</a></>}
                <br />실존 인물의 사진·기록을 그대로 베끼지 말고, 영감·출발점으로만 활용하세요.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
