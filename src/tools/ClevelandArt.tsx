// 클리블랜드 미술관 CC0 갤러리 — 키 없는 공개 API로 전부 퍼블릭 도메인(CC0)인 소장품을 가져와 글쓰기 영감으로 삼는다.
// API(키 불필요·https·CORS):
//   목록/검색: https://openaccess-api.clevelandart.org/api/artworks?cc0=1&has_image=1&limit=20&q=Q&skip=N
//   → cc0=1 로 한정하므로 반환되는 모든 작품이 CC0(퍼블릭 도메인 헌정). has_image=1 로 이미지 있는 것만.
// [저작권 안전] cc0=1 결과만 사용하고, 추가로 share_license_status === 'CC0' 인 항목만 채택한다.
//   이미지(images.web.url)가 없으면 건너뛴다 → 안심하고 저장·전달 가능.
// react 외 import 는 오직 './linkbus' 만 허용.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary,
  openToolLinked,
  hasPendingPick,
  fulfillImagePick,
  getList,
  addToProject,
  hasProjectBridge,
  Emoji,
  emojify,
  type SharedImage,
} from './linkbus'

export const meta = { id: 'cleveland-art', name: '클리블랜드 CC0 갤러리', icon: '🏛️', group: '분위기·시각', intro: '클리블랜드 미술관의 CC0 작품에서 한 장면을 떠올리세요', w: 440, h: 660 }

const LICENSE_TEXT = 'CC0 · Cleveland Museum of Art Open Access'
const SOURCE_HOME = 'https://www.clevelandart.org/art/collection/search?royalty=cc0'
const PAGE = 20
// 버퍼 초기 검색어: 실제 사용자 입력(검색은 trim, 무작위는 빈 문자열)과 절대 겹치지 않는 표식.
const INIT_Q = 'init'

// 프로젝트 본문(HTML)에 들어갈 외부 텍스트는 &,<,> 를 반드시 escape 한다.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Art {
  id: number
  title: string
  artist: string
  date: string
  type: string
  culture: string
  img: string
  url: string
}

const SCENE_PROMPTS = [
  '이 작품 속으로 한 인물이 걸어 들어옵니다. 그가 가장 먼저 본 것은 무엇일까요?',
  '이 작품이 만들어지던 순간, 화면 밖에서는 무슨 일이 벌어지고 있었을까요?',
  '이 장면 직전의 1분을 한 문단으로 써보세요. 무엇이 이 순간을 만들었나요?',
  '이 작품의 빛과 그림자를 묘사하세요. 그 명암은 누구의 마음을 닮았나요?',
  '여기 등장하는(혹은 부재하는) 사람이 끝내 하지 못한 말은 무엇일까요?',
  '이 작품을 오래 바라본 한 사람이 있습니다. 그는 왜 떠나지 못했을까요?',
  '이 작품의 색·질감·온도를 단어 다섯 개로 적고, 그것으로 첫 문장을 만드세요.',
  '이 장면이 어떤 이야기의 마지막 페이지라면, 그 직전에 무슨 일이 있었을까요?',
  '이 작품이 누군가의 기억이라면, 그 기억은 행복일까요 후회일까요? 그려보세요.',
  '이 작품의 정적을 깨뜨리는 단 하나의 소리를 상상해 장면을 시작하세요.',
]

const buildUrl = (q: string, skip: number) =>
  'https://openaccess-api.clevelandart.org/api/artworks?cc0=1&has_image=1' +
  '&limit=' + PAGE + '&skip=' + skip +
  '&fields=id,title,creators,creation_date,culture,type,images,url,share_license_status' +
  (q ? '&q=' + encodeURIComponent(q) : '')

function normalize(j: unknown): Art | null {
  const o = j as Record<string, unknown> | null
  if (!o) return null
  // [저작권 안전] CC0 가 명시된 항목만 채택(cc0=1 질의로도 한정되지만 한 번 더 확인).
  const lic = String((o.share_license_status as string) || '').toUpperCase()
  if (lic && lic !== 'CC0') return null
  const images = o.images as Record<string, { url?: string }> | undefined
  const img = (images && images.web && images.web.url) || ''
  if (!img) return null // 이미지 없는 작품은 건너뜀
  const creators = Array.isArray(o.creators) ? (o.creators as Array<Record<string, unknown>>) : []
  const artistRaw = creators.length
    ? String(creators[0].description || creators[0].name_in_original_language || '')
    : ''
  const cultureArr = o.culture
  const culture = Array.isArray(cultureArr) ? cultureArr.map(String).join(', ') : String(cultureArr || '')
  return {
    id: Number(o.id) || 0,
    title: String(o.title || '').trim() || '제목 미상',
    artist: artistRaw.trim() || '작가 미상',
    date: String(o.creation_date || '').trim() || '연대 미상',
    type: String(o.type || '').trim(),
    culture: culture.trim(),
    img,
    url: String(o.url || '').trim(),
  }
}

async function fetchArtworks(q: string, skip: number, signal: AbortSignal): Promise<{ list: Art[]; total: number }> {
  const r = await fetch(buildUrl(q, skip), { signal })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const data: unknown[] = Array.isArray(j && j.data) ? j.data : []
  const total: number = Number(j && j.info && j.info.total) || data.length
  const list: Art[] = []
  for (const d of data) {
    const a = normalize(d)
    if (a) list.push(a)
  }
  return { list, total }
}

interface Props { payload?: Record<string, unknown> }

export default function ClevelandArt({ payload }: Props) {
  const pickMode = !!(payload && payload.pickMode) && hasPendingPick()

  const [query, setQuery] = useState('')
  const [art, setArt] = useState<Art | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [imgError, setImgError] = useState(false) // 이미지 깨짐 상태 — 깨진 URL 전파 방지용
  const [prompt, setPrompt] = useState(SCENE_PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')

  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const msgTimer = useRef<number | null>(null)
  // 같은 검색어로 받아온 묶음을 보관해 "다른 작품"이 새 요청 없이 즉시 동작하도록(API 부담↓).
  const bufRef = useRef<{ q: string; items: Art[]; total: number }>({ q: INIT_Q, items: [], total: 0 })

  const flashMsg = (m: string) => {
    setLinkMsg(m)
    if (msgTimer.current) clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => { if (mounted.current) setLinkMsg('') }, 1800)
  }

  const newPrompt = () => setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])

  // q 가 바뀌면(검색) 새로 가져오고, 아니면 버퍼에서 다음 작품을 보여준다. 버퍼가 비면 무작위 페이지를 새로 받는다.
  const load = async (q: string, forceFetch: boolean) => {
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setCopied(false); setImgError(false)
    try {
      const buf = bufRef.current
      // 버퍼 재사용 조건: 같은 검색어 + 강제 새로고침 아님 + 남은 항목 있음
      if (!forceFetch && buf.q === q && buf.items.length > 0) {
        const next = buf.items.shift() as Art
        if (my !== nonce.current || ac.signal.aborted) return
        setArt(next); newPrompt()
        return
      }
      // 무작위 위치(skip)에서 한 페이지를 받아 셔플 후 버퍼링
      let total = buf.q === q ? buf.total : 0
      let skip = total > PAGE ? Math.floor(Math.random() * Math.max(1, total - PAGE)) : 0
      let res = await fetchArtworks(q, skip, ac.signal)
      if (my !== nonce.current || ac.signal.aborted) return
      total = res.total
      // 처음 알게 된 total 로 다시 무작위 페이지를 한 번 더 시도(첫 페이지 편향 완화)
      if (skip === 0 && total > PAGE) {
        const reskip = Math.floor(Math.random() * Math.max(1, total - PAGE))
        try {
          const res2 = await fetchArtworks(q, reskip, ac.signal)
          if (my !== nonce.current || ac.signal.aborted) return
          if (res2.list.length) res = res2
        } catch (e) {
          if ((e as { name?: string })?.name === 'AbortError') return
          // 재시도 실패는 무시하고 첫 페이지 사용
        }
      }
      // Fisher–Yates 셔플
      const items = res.list.slice()
      for (let i = items.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1))
        const tmp = items[i]; items[i] = items[k]; items[k] = tmp
      }
      if (my !== nonce.current || ac.signal.aborted) return
      if (!items.length) {
        bufRef.current = { q, items: [], total }
        setArt(null)
        setErr(q ? `'${q}' 검색 결과가 없어요. 다른 검색어를 시도해 보세요.` : 'CC0 작품을 찾지 못했어요. 다시 시도해 주세요.')
        return
      }
      const first = items.shift() as Art
      bufRef.current = { q, items, total }
      setArt(first); newPrompt()
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) setErr('작품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load('', true)
    return () => {
      mounted.current = false
      acRef.current?.abort() // 언마운트 시 진행 중 요청 정리
      if (msgTimer.current) { clearTimeout(msgTimer.current); msgTimer.current = null }
    }
    // eslint-disable-next-line
  }, [])

  const onSearch = () => load(query.trim(), true)
  const onRandom = () => { setQuery(''); load('', true) }
  const onNext = () => load(bufRef.current.q === INIT_Q ? '' : bufRef.current.q, false)

  const copyText = () => {
    if (!art) return
    const lines = [
      `작품: ${art.title}`,
      `작가: ${art.artist}`,
      `연대: ${art.date}`,
      art.type ? `형식: ${art.type}` : '',
      art.culture ? `문화: ${art.culture}` : '',
      '',
      `떠오르는 장면: ${prompt}`,
      `라이선스: ${LICENSE_TEXT}`,
      art.url ? `출처: ${art.url}` : '',
    ].filter(Boolean)
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // 현재 작품을 SharedImage 형태로 변환(저작권 안전: CC0 만 채택했으므로 CC0 표기).
  const toSharedImage = (a: Art): Omit<SharedImage, 'id' | 'updated'> => ({
    url: a.img,
    title: a.title,
    credit: a.artist + (a.date ? ' · ' + a.date : ''),
    license: LICENSE_TEXT,
    source: a.url || SOURCE_HOME,
  })

  // [연계] 이미지 라이브러리에 저장(중복 url 은 건너뜀). 깨진 이미지는 저장하지 않는다(URL 전파 방지).
  const saveToImageLibrary = () => {
    if (!art || imgError) return
    const exists = getList('images').some((x) => x.url === art.img)
    if (exists) { flashMsg('이미 이미지 라이브러리에 있어요'); return }
    addToLibrary('images', toSharedImage(art))
    flashMsg('🖼 이미지 라이브러리에 저장했어요')
  }

  // [연계] 배경 설정집으로 이미지·정보를 전달하며 도구 열기. 깨진 이미지는 전달하지 않는다.
  const sendToSettingBible = () => {
    if (!art || imgError) return
    openToolLinked('setting-bible', {
      image: art.img,
      imageCredit: art.artist + ' · ' + LICENSE_TEXT,
      name: art.title,
      mood: prompt,
      source: art.url || SOURCE_HOME,
      license: LICENSE_TEXT,
    })
    flashMsg('🏞 배경 설정집으로 보냈어요')
  }

  // [연계] 무드보드로 이미지를 전달하며 열기. 깨진 이미지는 전달하지 않는다.
  const sendToMoodboard = () => {
    if (!art || imgError) return
    openToolLinked('moodboard-grid', {
      image: art.img,
      title: art.title,
      credit: art.artist + ' · ' + LICENSE_TEXT,
      license: LICENSE_TEXT,
      source: art.url || SOURCE_HOME,
    })
    flashMsg('🧩 무드보드로 보냈어요')
  }

  // [프로젝트 브리지] 현재 작품 정보 + 장면 질문을 'research(자료)/이미지 영감' 폴더 메모로 저장(CC0).
  const addToProjectMemo = () => {
    if (!art) return
    const rows: string[] = [
      `<p><b>작품</b>: ${esc(art.title)}</p>`,
      `<p><b>작가</b>: ${esc(art.artist)}</p>`,
      `<p><b>연대</b>: ${esc(art.date)}</p>`,
    ]
    if (art.type) rows.push(`<p><b>형식</b>: ${esc(art.type)}</p>`)
    if (art.culture) rows.push(`<p><b>문화</b>: ${esc(art.culture)}</p>`)
    rows.push(`<p><b>떠오르는 장면</b>: ${esc(prompt)}</p>`)
    rows.push(`<p><b>라이선스</b>: ${esc(LICENSE_TEXT)}</p>`)
    if (art.url) rows.push(`<p><b>출처</b>: ${esc(art.url)}</p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '이미지 영감',
      title: art.title,
      bodyHtml: rows.join('\n'),
      meta: {
        작가: art.artist,
        연대: art.date,
        라이선스: LICENSE_TEXT,
        ...(art.url ? { 출처: art.url } : {}),
      },
    })
    flashMsg(id ? '📄 프로젝트에 추가했어요' : '프로젝트에 추가하지 못했어요')
  }

  // [픽 모드] 갤러리 대신 이 도구가 호출됐을 때, 현재 작품을 픽 요청자에게 돌려준다.
  const usePick = () => {
    if (!art || imgError) return // 깨진 이미지는 픽 요청자에게 전달하지 않는다(URL 전파 방지)
    const ok = fulfillImagePick({
      id: 'cma_' + art.id,
      ...toSharedImage(art),
      updated: Date.now(),
    })
    if (ok) {
      openToolLinked(meta.id) // 요청 처리 후 자신을 일반 모드로 다시 열어(픽 창 정리)
      flashMsg('✅ 이 이미지를 전달했어요')
    } else {
      flashMsg('전달할 요청이 없어요')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        클리블랜드 미술관의 <b>퍼블릭 도메인(CC0)</b> 소장품을 무작위로 만나거나 검색해 글 속 한 장면을 떠올려 보세요.
      </div>

      {pickMode && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
          <Emoji e="🖼" /> 다른 도구가 이미지를 기다리고 있어요. 마음에 드는 작품에서 <b><Emoji e="✅" /> 이 이미지 사용</b>을 누르세요.
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch() }}
          placeholder="검색 (예: river, portrait, samurai)…"
          aria-label="작품 검색어"
          style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }}
        />
        <button className="minibtn" onClick={onSearch} disabled={loading}><Emoji e="🔍" /> 검색</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 24 }}>작품을 찾는 중…</div>
        )}
        {err && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', padding: 16 }}>{err}</div>
        )}
        {art && !loading && !err && (
          <>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
              {imgError ? (
                // 이미지 로드 실패 — 숨기지 않고 눈에 보이는 실패 상태로 안내(이 상태에선 저장·전달·사용 비활성).
                <div
                  role="alert"
                  style={{ width: '100%', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 20, color: 'var(--muted)', background: 'var(--paper)' }}
                >
                  <div style={{ fontSize: 28 }}><Emoji e="🖼️" /><Emoji e="❌" /></div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>이미지를 불러오지 못했어요</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    이미지가 깨져 저장·전달·사용은 잠시 막아두었어요.<br />
                    아래 <b><Emoji e="🔀" /> 다른 작품</b>으로 다시 시도해 보세요.
                  </div>
                </div>
              ) : (
                <img
                  src={art.img}
                  alt={art.title}
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain', background: 'var(--paper)' }}
                  onError={() => { if (mounted.current) setImgError(true) }}
                  onLoad={() => { if (mounted.current) setImgError(false) }}
                />
              )}
              {/* [저작권] 라이선스 배지 — CC0 만 채택했음을 명시. 이미지 깨짐 상태에선 숨김. */}
              {!imgError && (
                <span
                  className="license-badge"
                  style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10.5, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.62)', borderRadius: 6, padding: '3px 7px', letterSpacing: '.2px' }}
                >
                  {LICENSE_TEXT}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{art.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}><Emoji e="🎨" /> {art.artist}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <Emoji e="🕰" /> {art.date}
                {art.type ? ' · ' + art.type : ''}
              </div>
              {art.culture && (
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}><Emoji e="🌏" /> {art.culture}</div>
              )}
              <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
                <Emoji e="⚖️" /> 이 작품은 Cleveland Museum of Art Open Access 정책에 따른 CC0(퍼블릭 도메인 헌정)로, 자유롭게 활용할 수 있어요.
              </div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️" /> 이 작품의 장면</div>
              {prompt}
            </div>
            {art.url && (
              <a
                href={art.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none' }}
              >
                <Emoji e="🔗" /> 클리블랜드 미술관에서 보기
              </a>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={onNext} disabled={loading}><Emoji e="🔀" /> 다른 작품</button>
        <button className="minibtn" onClick={onRandom} disabled={loading}><Emoji e="🎲" /> 무작위(전체)</button>
        <button className="minibtn" onClick={newPrompt} disabled={!art || loading}><Emoji e="💡" /> 다른 질문</button>
        <button className="minibtn" onClick={copyText} disabled={!art || loading}>{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
      </div>

      {/* [연계] 프로젝트 추가 · 라이브러리 저장 · 배경 설정집·무드보드 전달 · (픽 모드 시) 이미지 사용 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {pickMode && (
          <button className="linkbtn btn-primary" onClick={usePick} disabled={!art || loading || imgError}><Emoji e="✅" /> 이 이미지 사용</button>
        )}
        <button className="linkbtn minibtn" onClick={addToProjectMemo} disabled={!art || loading || !hasProjectBridge()} title={hasProjectBridge() ? "'이미지 영감' 폴더에 메모로 추가" : '프로젝트에 연결되지 않았어요'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn minibtn" onClick={saveToImageLibrary} disabled={!art || loading || imgError}><Emoji e="🖼" /> 이미지 라이브러리에 저장</button>
        <button className="linkbtn minibtn" onClick={sendToSettingBible} disabled={!art || loading || imgError}><Emoji e="🏞" /> 배경 설정집으로 보내기</button>
        <button className="linkbtn minibtn" onClick={sendToMoodboard} disabled={!art || loading || imgError}><Emoji e="🧩" /> 무드보드로 보내기</button>
        {linkMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{emojify(linkMsg)}</span>}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
        모든 이미지·정보 출처: <a href={SOURCE_HOME} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--muted)' }}>Cleveland Museum of Art Open Access</a> · 라이선스 CC0(퍼블릭 도메인 헌정)
      </div>
    </div>
  )
}
