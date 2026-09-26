// 상상력 자극 갤러리 — 무료·키 없는 공개 API로 매일/무작위로 바뀌는 명화·사진을 보여주고 글감을 떠올리게 한다.
// 시카고 미술관(api.artic.edu), Lorem Picsum(picsum.photos), Openverse(api.openverse.org) — 모두 키 불필요·CORS 허용.
// [저작권 안전] 명화는 is_public_domain===true 작품만, Openverse 는 license=cc0,pdm(퍼블릭도메인/CC0)만, picsum 폴백은 Unsplash 라이선스.
// [초상권 보호] '인물' 카테고리는 실존 인물 사진(Openverse 사진형 검색)을 쓰지 않고, 퍼블릭 도메인 명화·조각 속 인물(portrait/figure)만 사용한다.
// 모든 Openverse 결과는 foreign_landing_url(원본 랜딩)을 출처 링크로 받아 표기한다(없으면 url).
// react 와 './linkbus' 만 import 한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary,
  openToolLinked,
  fulfillImagePick,
  hasPendingPick,
  TOOL_RELATIONS,
  addToProject,
  hasProjectBridge,
  Emoji,
  emojify,
} from './linkbus'

// bodyHtml 에 넣을 텍스트는 HTML escape 필수(&,<,>).
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const meta = { id: 'imagination-gallery', name: '상상력 자극 갤러리', icon: '🖼', group: '영감·발상', intro: '매번 바뀌는 명화·사진으로 글감을 떠올리세요', w: 420, h: 560 }

type Cat = 'masterpiece' | 'landscape' | 'portrait' | 'abstract' | 'space'
const CATS: { key: Cat; label: string }[] = [
  { key: 'masterpiece', label: '🖼 명화' },
  { key: 'landscape', label: '🏞 풍경' },
  { key: 'portrait', label: '👤 인물' },
  { key: 'abstract', label: '🌀 추상' },
  { key: 'space', label: '🌌 우주·자연' },
]

// 저작권 안전한 이미지만 다룬다. license 는 표기·뱃지용 ('CC0' | 'Public Domain' | 'Unsplash License').
// link: 출처(원본 랜딩) URL — Openverse 는 foreign_landing_url(없으면 url), 그 외는 작품/원본 페이지.
interface Pic { url: string; title: string; credit: string; license: string; source: string; link?: string }

const PROMPTS = [
  '이 장면 직전에 무슨 일이 있었을까? 한 문단으로 써보세요.',
  '이 그림 속 인물이 숨기고 있는 비밀은 무엇일까요?',
  '이 풍경에 어울리는 첫 문장을 지어보세요.',
  '여기서 들리는 소리·냄새·온도를 묘사해보세요.',
  '이 장면을 본 누군가가 울었습니다. 왜일까요?',
  '이 이미지를 마지막 장면으로 하는 이야기의 도입부를 써보세요.',
  '여기 등장하지 않은 한 사람의 시점에서 이 순간을 묘사하세요.',
  '이 그림에 제목을 붙이고, 그 제목으로 시작하는 이야기를 상상하세요.',
  '10년 뒤, 이 장소는 어떻게 변했을까요?',
  '이 이미지가 누군가의 꿈이라면, 그는 무엇을 두려워하고 있을까요?',
]

// 연계 버튼에 쓸 관련 도구 이름(레지스트리는 import 불가하므로 최소 매핑만 둔다).
const TOOL_NAMES: Record<string, string> = {
  'setting-bible': '🗺️ 배경 설정집',
  'moodboard-grid': '🧩 무드보드',
  'character-model': '🎭 캐릭터 모델',
  'cover-mockup': '📕 책표지 목업',
  'met-museum-art': '🖼️ 메트 명작',
}

// 시카고 미술관(artic) PD 작품을 Pic 으로 변환. 출처 링크는 작품 상세 페이지(www.artic.edu/artworks/<id>).
function articToPic(a: { id?: number; title?: string; image_id: string; artist_display?: string }): Pic {
  return {
    url: `https://www.artic.edu/iiif/2/${a.image_id}/full/843,/0/default.jpg`,
    title: a.title || '무제',
    credit: ((a.artist_display || '작자 미상').split('\n')[0]) + ' · Art Institute of Chicago',
    license: 'Public Domain',
    source: 'Art Institute of Chicago',
    link: a.id ? `https://www.artic.edu/artworks/${a.id}` : 'https://www.artic.edu/iiif/2/' + a.image_id,
  }
}

// 명화: 퍼블릭 도메인(is_public_domain===true) 작품만 사용. q 가 있으면 해당 주제(예: portrait/figure)로 검색, 없으면 무작위 페이지.
// [초상권] 실존 인물 사진을 쓰지 않고, PD 회화·조각 속 인물을 q='portrait figure painting sculpture' 등으로 가져오기 위한 공용 함수.
async function fetchArtic(signal?: AbortSignal, q?: string): Promise<Pic> {
  const MAX = 4
  for (let i = 0; i < MAX; i++) {
    let url: string
    if (q) {
      const page = 1 + Math.floor(Math.random() * 20)
      url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&page=${page}&limit=30&fields=id,title,image_id,artist_display,is_public_domain`
    } else {
      const page = 1 + Math.floor(Math.random() * 80)
      url = `https://api.artic.edu/api/v1/artworks?page=${page}&limit=30&fields=id,title,image_id,artist_display,is_public_domain`
    }
    const r = await fetch(url, { signal })
    if (!r.ok) continue
    const j = await r.json()
    const pd = (j.data || []).filter(
      (a: { image_id?: string; is_public_domain?: boolean }) => a.image_id && a.is_public_domain === true,
    )
    if (!pd.length) continue // 이 페이지에 PD 작품이 없으면 다른 페이지/검색 재시도
    return articToPic(pd[Math.floor(Math.random() * pd.length)])
  }
  throw new Error('no public-domain art')
}

// 인물: 초상권 보호를 위해 실존 인물 사진을 쓰지 않고, PD 명화·조각 속 인물(portrait/figure)만 사용.
// 검색 실패 시 회화·풍경 등 일반 PD 작품으로 폴백한다.
async function fetchArticPortrait(signal?: AbortSignal): Promise<Pic> {
  const queries = ['portrait painting', 'portrait sculpture', 'figure painting', 'portrait of a man', 'portrait of a woman']
  const q = queries[Math.floor(Math.random() * queries.length)]
  return fetchArtic(signal, q).catch(() => fetchArtic(signal, 'portrait')).catch(() => fetchArtic(signal))
}

// Openverse: 퍼블릭 도메인/CC0(license=cc0,pdm)만 요청. 제작자·라이선스 표기.
async function fetchOpenverse(q: string, signal?: AbortSignal): Promise<Pic> {
  const r = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&page=${1 + Math.floor(Math.random() * 10)}&page_size=20`,
    { signal },
  )
  if (!r.ok) throw new Error('openverse http')
  const j = await r.json()
  const list = (j.results || []).filter((x: { url?: string }) => x.url)
  if (!list.length) throw new Error('no img')
  const x = list[Math.floor(Math.random() * list.length)]
  const lic = String(x.license || '').toLowerCase()
  const license = lic === 'cc0' ? 'CC0' : 'Public Domain' // pdm = public domain mark
  const provider = x.source || x.provider || 'Openverse'
  // 출처 링크: 원본 랜딩(foreign_landing_url) 우선, 없으면 이미지 url. (출처표기 강화)
  const link = x.foreign_landing_url || x.url
  return {
    url: x.url,
    title: x.title || q,
    credit: (x.creator || '작자 미상') + ' · ' + provider + ' (' + license + ')',
    license,
    source: 'Openverse · ' + provider,
    link,
  }
}

// 폴백: Lorem Picsum(=Unsplash 사진). Unsplash 라이선스(무료)로 표기.
function fetchPicsum(seed: string): Pic {
  return {
    url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/520`,
    title: '무작위 사진',
    credit: 'Lorem Picsum · Unsplash 라이선스(무료)',
    license: 'Unsplash License',
    source: 'Lorem Picsum (Unsplash)',
  }
}

export default function ImaginationGallery({ payload }: { payload?: Record<string, unknown> }) {
  const pickMode = payload?.pickMode === true
  const [cat, setCat] = useState<Cat>('masterpiece')
  const [pic, setPic] = useState<Pic | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [note, setNote] = useState('') // 연계 동작 안내 메시지
  // [연계] 무드링(cat) 이 보낸 갤러리 카테고리로 시작
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const c = typeof payload.cat === 'string' ? payload.cat : ''
    if (CATS.some((x) => x.key === c)) setCat(c as Cat)
  }, [payload]) // eslint-disable-line
  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)
  const alive = useRef(true)

  const load = async (c: Cat) => {
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setNote('')
    try {
      let p: Pic
      if (c === 'masterpiece') p = await fetchArtic(ac.signal).catch(() => fetchPicsum('art' + Math.random()))
      else if (c === 'landscape') p = await fetchOpenverse('landscape scenery', ac.signal).catch(() => fetchPicsum('landscape' + Math.random()))
      // [초상권] 인물: 실존 인물 사진 미사용 → PD 명화·조각 속 인물. 검색/폴백 모두 회화·풍경 PD 로.
      else if (c === 'portrait') p = await fetchArticPortrait(ac.signal).catch(() => fetchPicsum('art-portrait' + Math.random()))
      else if (c === 'abstract') p = await fetchOpenverse('abstract art', ac.signal).catch(() => fetchPicsum('abstract' + Math.random()))
      else p = await fetchOpenverse('nature landscape galaxy nebula', ac.signal).catch(() => fetchPicsum('space' + Math.random()))
      if (my === nonce.current && alive.current) { setPic(p); setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]) }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current && alive.current) setErr('이미지를 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current && alive.current) setLoading(false)
    }
  }
  useEffect(() => { load(cat) /* eslint-disable-next-line */ }, [cat])
  // 언마운트 시 진행 중 요청 정리 + 비동기 setState 가드
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; acRef.current?.abort() }
  }, [])

  // 연계: 공유 이미지 라이브러리에 저장
  const saveToLibrary = () => {
    if (!pic) return
    addToLibrary('images', { url: pic.url, title: pic.title, credit: pic.credit, license: pic.license, source: pic.link || pic.source })
    setNote('🖼 이미지 라이브러리에 저장했습니다. (다른 도구에서 바로 쓸 수 있어요)')
  }
  // 연계: 배경 설정집으로 이미지 보내기
  const sendToSettingBible = () => {
    if (!pic) return
    openToolLinked('setting-bible', { image: pic.url, imageCredit: pic.credit, license: pic.license, name: pic.title, source: pic.source, link: pic.link })
    setNote('🏞 배경 설정집으로 이미지를 보냈습니다.')
  }
  // pickMode: 이미지 픽 요청에 응답
  const usePick = () => {
    if (!pic) return
    const ok = fulfillImagePick({ id: '', url: pic.url, title: pic.title, credit: pic.credit, license: pic.license, source: pic.link || pic.source, updated: Date.now() })
    setNote(ok ? '✅ 이 이미지를 요청한 도구로 보냈습니다. 이 창은 닫아도 됩니다.' : '대기 중인 이미지 요청이 없습니다.')
  }

  // 연계: 현재 이미지 정보(제목/출처/라이선스) + 글감 질문을 자료('이미지 영감') 메모로 저장.
  // PD/CC0 이미지만 다루므로 출처 표기로서 이미지 URL 링크를 포함한다.
  const saveToProject = () => {
    if (!pic) return
    const landing = pic.link || pic.url
    const bodyHtml =
      `<p><img src="${esc(pic.url)}" alt="${esc(pic.title)}" /></p>` +
      `<p><b>제목:</b> ${esc(pic.title)}</p>` +
      `<p><b>출처:</b> ${esc(pic.credit)} (${esc(pic.source)})</p>` +
      `<p><b>라이선스:</b> ${esc(pic.license)}</p>` +
      `<p><b>원본 출처:</b> <a href="${esc(landing)}">${esc(landing)}</a></p>` +
      `<p><b>이미지 URL:</b> <a href="${esc(pic.url)}">${esc(pic.url)}</a></p>` +
      `<hr/>` +
      `<p><b>💡 글감 질문</b></p>` +
      `<p>${esc(prompt)}</p>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '이미지 영감',
      title: pic.title || '이미지 영감',
      bodyHtml,
      meta: { 출처: pic.credit, 라이선스: pic.license, 소스: pic.source, 원본출처: landing, URL: pic.url },
    })
    setNote(id ? '📄 프로젝트 자료(이미지 영감)에 메모로 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const related = TOOL_RELATIONS[meta.id] || []
  const showPick = pickMode || hasPendingPick()

  return (
    <div className="imag-wrap">
      <div className="imag-cats">
        {CATS.map((c) => (
          <button key={c.key} className={'minibtn' + (cat === c.key ? ' active' : '')} onClick={() => setCat(c.key)}>{emojify(c.label)}</button>
        ))}
      </div>
      <div className="imag-stage">
        {loading && <div className="imag-msg">불러오는 중…</div>}
        {err && !loading && <div className="imag-msg">{err}</div>}
        {pic && !loading && !err && (
          <>
            <img className="imag-img" src={pic.url} alt={pic.title} onError={() => setErr('이미지 로드 실패 — 다른 이미지를 시도하세요.')} />
            <div className="imag-caption">
              <b>{pic.title}</b>
              <span>
                {pic.credit} <span className="license-badge">{pic.license}</span>
              </span>
              {(pic.link || pic.url) && (
                <span className="license-note">
                  원본 출처:{' '}
                  <a href={pic.link || pic.url} target="_blank" rel="noopener noreferrer">{pic.link || pic.url}</a>
                </span>
              )}
            </div>
          </>
        )}
      </div>
      {cat === 'portrait' && (
        <div className="license-note">실존 인물 사진 미사용(초상권 보호) · 명화 속 인물·풍경만</div>
      )}
      <div className="imag-prompt"><Emoji e="💡" /> {prompt}</div>
      <div className="imag-actions">
        <button className="btn-primary" onClick={() => load(cat)}><Emoji e="🔀" /> 다른 이미지</button>
        <button className="minibtn" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}><Emoji e="💡" /> 다른 글감 질문</button>
      </div>

      {/* 연계 동작 버튼 */}
      {pic && !loading && !err && (
        <div className="imag-actions">
          <button className="minibtn" onClick={saveToLibrary}><Emoji e="🖼" /> 이미지 라이브러리에 저장</button>
          <button className="minibtn" onClick={sendToSettingBible}><Emoji e="🏞" /> 배경 설정집으로 보내기</button>
          <button className="linkbtn" onClick={saveToProject} disabled={!hasProjectBridge() || !pic}><Emoji e="📄" /> 프로젝트에 추가</button>
          {showPick && <button className="btn-primary" onClick={usePick}><Emoji e="✅" /> 이 이미지 사용</button>}
        </div>
      )}
      {note && <div className="license-note">{emojify(note)}</div>}

      <div className="license-note">
        명화는 퍼블릭 도메인(Public Domain) 작품만, 사진은 CC0/퍼블릭 도메인 또는 Unsplash 라이선스만 사용합니다. 실존 인물 사진은 쓰지 않으며(초상권 보호), '인물'은 명화 속 인물·풍경만 보여줍니다. 제작자·라이선스·원본 출처 링크를 함께 표기하니 그대로 출처를 남겨 주세요.
      </div>

      {/* 관련 도구 연계 바 */}
      {related.length > 0 && (
        <div className="linkbar">
          <span className="linkbar-label">연계</span>
          {related.map((id) => (
            <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>{emojify(TOOL_NAMES[id] || id)}</button>
          ))}
        </div>
      )}

      <div className="imag-hint">매번 다른 명화·사진을 무작위로 가져옵니다. 보고 떠오른 장면을 바로 원고에 적어보세요.</div>
    </div>
  )
}
