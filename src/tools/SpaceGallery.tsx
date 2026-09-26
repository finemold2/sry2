// 우주·자연 갤러리(영감) — NASA Image and Video Library 의 무료·키 없는 공개 API 로
// 우주·자연 사진을 무작위/검색으로 가져와 SF·우주 배경 글감을 떠올리게 한다.
// API(키 불필요·https·CORS): https://images-api.nasa.gov/search?q=Q&media_type=image
//   응답: collection.items[] → 각 item 의 data[0](title/description/nasa_id/date_created/...)
//        과 links[0].href(이미지 URL)을 사용한다.
// [저작권 안전] NASA 미디어는 원칙적으로 퍼블릭 도메인(저작권 없음)으로, 출처(NASA) 표기 후 자유 활용 가능.
//   (개별 사진에 제3자 권리가 섞일 수 있으므로 출처·제작자 표기를 함께 남긴다.)
// react 와 './linkbus' 만 import 한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary,
  openToolLinked,
  fulfillImagePick,
  hasPendingPick,
  TOOL_RELATIONS,
  getList,
  addToProject,
  hasProjectBridge,
  Emoji,
  emojify,
  type SharedImage,
} from './linkbus'

export const meta = { id: 'space-gallery', name: '우주·자연 갤러리', icon: '🌌', group: '분위기·시각', intro: 'NASA 우주·자연 사진으로 SF·우주 배경을 떠올리세요', w: 440, h: 660 }

// 프로젝트 본문(HTML)에 들어갈 텍스트는 &,<,> 를 반드시 escape 한다.
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const LICENSE_TEXT = 'Public Domain · NASA'

// 무작위 모드에서 돌려쓸 우주·자연 검색어 후보(영문 — NASA API 가 영문 메타데이터 기반).
const RANDOM_QUERIES = [
  'nebula', 'galaxy', 'supernova', 'star cluster', 'aurora', 'planet surface',
  'deep space', 'spiral galaxy', 'cosmic dust', 'solar flare', 'milky way',
  'space station', 'astronaut', 'lunar surface', 'mars landscape', 'comet',
  'earth from space', 'star forming region', 'black hole', 'asteroid',
]

// SF·우주 배경 영감 질문.
const PROMPTS = [
  '이 광경을 처음 본 인물의 첫 마디를 한 줄로 적어보세요.',
  '이곳에 도착한 우주선의 승무원은 무엇을 찾으러 왔을까요?',
  '이 풍경 너머에 인류가 모르는 무엇이 숨어 있을까요?',
  '이 빛이 지구에 닿기까지 수천 년이 걸렸다면, 그 사이 무슨 일이 있었을까요?',
  '이 장면을 마지막으로 본 사람의 이야기로 도입부를 써보세요.',
  '이 천체에 이름을 붙이고, 그 이름에 얽힌 전설을 상상하세요.',
  '여기서 들려올 리 없는 소리 하나를 상상해 장면을 시작하세요.',
  '이 풍경을 고향이라 부르는 존재가 있다면, 그들의 하루는 어떨까요?',
  '이 이미지가 어느 항해일지의 마지막 기록이라면, 그 직전에 무슨 일이?',
  '이 광활함 앞에서 한 인물이 끝내 내린 결정은 무엇일까요?',
  '이 천체가 인물의 내면을 비춘다면, 그는 지금 어떤 마음일까요?',
  '먼 미래, 이곳을 두고 두 문명이 다툰다면 무엇을 위해서일까요?',
]

// 연계 버튼 라벨(레지스트리는 import 불가하므로 최소 매핑만 둔다).
const TOOL_LABELS: Record<string, string> = {
  'setting-bible': '🗺️ 배경 설정집',
  'moodboard-grid': '🧩 무드보드',
  'character-model': '🎭 캐릭터 모델',
  'cover-mockup': '📕 책표지 목업',
  'imagination-gallery': '🖼 상상력 갤러리',
  'met-museum-art': '🖼️ 메트 명작',
}

interface SpacePic {
  id: string
  url: string
  title: string
  description: string
  center: string
  date: string
  creator: string
  pageUrl: string
}

const SEARCH_URL = (q: string) =>
  `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image`

// NASA API 한 페이지(collection.items)에서 이미지 URL 이 있는 항목을 SpacePic 으로 정규화.
function pickFrom(items: unknown[], random: boolean): SpacePic | null {
  const usable = items.filter((it) => {
    const o = it as { links?: { href?: string }[]; data?: unknown[] }
    return Array.isArray(o?.links) && o.links[0]?.href && Array.isArray(o?.data) && o.data[0]
  })
  if (!usable.length) return null
  const chosen = random ? usable[Math.floor(Math.random() * usable.length)] : usable[0]
  const o = chosen as {
    links: { href: string }[]
    data: {
      title?: string; description?: string; nasa_id?: string
      center?: string; date_created?: string; secondary_creator?: string
    }[]
  }
  const d = o.data[0]
  const nasaId = d.nasa_id || ''
  return {
    id: 'nasa_' + (nasaId || Math.random().toString(36).slice(2)),
    url: o.links[0].href,
    title: (d.title || '무제').trim(),
    description: (d.description || '').trim(),
    center: (d.center || '').trim(),
    date: d.date_created ? d.date_created.slice(0, 10) : '',
    creator: (d.secondary_creator || '').trim(),
    pageUrl: nasaId ? `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}` : '',
  }
}

async function fetchSpace(q: string, random: boolean, signal?: AbortSignal): Promise<SpacePic> {
  const r = await fetch(SEARCH_URL(q), { signal })
  if (!r.ok) throw new Error('nasa http ' + r.status)
  const j = await r.json()
  const items: unknown[] = j?.collection?.items
  if (!Array.isArray(items) || !items.length) throw new Error('no results')
  const pic = pickFrom(items, random)
  if (!pic) throw new Error('no usable image')
  return pic
}

export default function SpaceGallery({ payload }: { payload?: Record<string, unknown> }) {
  const pickMode = payload?.pickMode === true

  const [query, setQuery] = useState('')
  const [pic, setPic] = useState<SpacePic | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [imgError, setImgError] = useState(false) // 이미지 로드 실패 — 깨진 URL 전파 방지
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [note, setNote] = useState('') // 연계 동작 안내
  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)
  const alive = useRef(true)
  const noteTimer = useRef<number | null>(null)

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (alive.current) setNote('') }, 2200)
  }

  // q 가 비면 무작위 검색어로 무작위 이미지, 있으면 그 검색어로 첫 결과.
  const load = async (q: string, random: boolean) => {
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setNote(''); setImgError(false)
    const used = q.trim() || RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)]
    try {
      const p = await fetchSpace(used, random || !q.trim(), ac.signal)
      if (my !== nonce.current || !alive.current) return
      setPic(p)
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my !== nonce.current || !alive.current) return
      const msg = (e as Error)?.message === 'no results'
        ? `'${used}' 에 대한 우주·자연 사진을 찾지 못했어요. 다른 검색어를 시도해 보세요.`
        : '이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      setErr(msg)
    } finally {
      if (my === nonce.current && alive.current) setLoading(false)
    }
  }

  // 최초: 무작위 우주 사진. 언마운트 시 진행 중 요청·타이머 정리.
  useEffect(() => {
    alive.current = true
    load('', true)
    return () => {
      alive.current = false
      acRef.current?.abort()
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
    // eslint-disable-next-line
  }, [])

  const onSearch = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    load(query, false)
  }

  // 현재 사진을 SharedImage 형태로 (저작권: NASA 퍼블릭 도메인).
  const toShared = (p: SpacePic): Omit<SharedImage, 'id' | 'updated'> => ({
    url: p.url,
    title: p.title,
    credit: [p.creator, p.center, 'NASA'].filter(Boolean).join(' · '),
    license: LICENSE_TEXT,
    source: p.pageUrl || 'https://images.nasa.gov/',
  })

  // [연계] 이미지 라이브러리에 저장(중복 url 은 건너뜀, 깨진 이미지는 저장 안 함).
  const saveToLibrary = () => {
    if (!pic || imgError) return
    if (getList('images').some((x) => x.url === pic.url)) { flash('이미 이미지 라이브러리에 있어요'); return }
    addToLibrary('images', toShared(pic))
    flash('🖼 이미지 라이브러리에 저장했어요')
  }

  // [연계] 배경 설정집으로 이미지·정보 전달(깨진 이미지는 전달 안 함).
  const sendToSettingBible = () => {
    if (!pic || imgError) return
    openToolLinked('setting-bible', {
      image: pic.url,
      imageCredit: [pic.creator, pic.center, 'NASA'].filter(Boolean).join(' · '),
      license: LICENSE_TEXT,
      name: pic.title,
      mood: prompt,
      source: pic.pageUrl || 'https://images.nasa.gov/',
    })
    flash('🗺️ 배경 설정집으로 보냈어요')
  }

  // [연계] 관련 도구를 현재 사진과 함께 열기(깨진 이미지면 URL 없이 연다).
  const openRelated = (toolId: string) => {
    if (!pic || imgError) { openToolLinked(toolId); return }
    openToolLinked(toolId, {
      image: pic.url,
      title: pic.title,
      credit: [pic.creator, pic.center, 'NASA'].filter(Boolean).join(' · '),
      license: LICENSE_TEXT,
      source: pic.pageUrl || 'https://images.nasa.gov/',
    })
  }

  // [프로젝트 브리지] 현재 사진 정보 + 영감 질문을 자료('우주 배경') 폴더 메모로 저장(PD).
  const saveToProject = () => {
    if (!pic) return
    const rows: string[] = []
    if (!imgError) rows.push(`<p><img src="${esc(pic.url)}" alt="${esc(pic.title)}" /></p>`)
    rows.push(`<p><b>제목:</b> ${esc(pic.title)}</p>`)
    if (pic.description) rows.push(`<p><b>설명:</b> ${esc(pic.description)}</p>`)
    if (pic.center) rows.push(`<p><b>제공:</b> ${esc(pic.center)}</p>`)
    if (pic.creator) rows.push(`<p><b>제작:</b> ${esc(pic.creator)}</p>`)
    if (pic.date) rows.push(`<p><b>날짜:</b> ${esc(pic.date)}</p>`)
    rows.push(`<p><b>라이선스:</b> ${esc(LICENSE_TEXT)}</p>`)
    if (pic.pageUrl) rows.push(`<p><b>출처:</b> <a href="${esc(pic.pageUrl)}">${esc(pic.pageUrl)}</a></p>`)
    rows.push('<hr/>')
    rows.push('<p><b>🚀 영감 질문</b></p>')
    rows.push(`<p>${esc(prompt)}</p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '우주 배경',
      title: pic.title || '우주·자연 사진',
      bodyHtml: rows.join('\n'),
      meta: {
        라이선스: LICENSE_TEXT,
        ...(pic.center ? { 제공: pic.center } : {}),
        ...(pic.date ? { 날짜: pic.date } : {}),
        ...(pic.pageUrl ? { 출처: pic.pageUrl } : {}),
      },
    })
    flash(id ? '📄 프로젝트 자료(우주 배경)에 추가했어요' : '프로젝트에 추가하지 못했어요')
  }

  // [픽 모드] 대기 중인 이미지 픽 요청에 현재 사진을 전달.
  const usePick = () => {
    if (!pic || imgError) return
    const ok = fulfillImagePick({ id: pic.id, ...toShared(pic), updated: Date.now() })
    if (ok) {
      openToolLinked(meta.id) // 요청 처리 후 자신을 일반 모드로 다시 열어 픽 창 정리(opener 없으면 무시)
      flash('✅ 이 이미지를 요청한 도구로 보냈어요')
    } else {
      flash('대기 중인 이미지 요청이 없어요')
    }
  }

  const relations = TOOL_RELATIONS[meta.id] || []
  const showPick = pickMode || hasPendingPick()
  const credit = pic ? [pic.creator, pic.center, 'NASA'].filter(Boolean).join(' · ') : ''

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        NASA의 <b>퍼블릭 도메인</b> 우주·자연 사진을 검색하거나 무작위로 만나 SF·우주 배경을 떠올려 보세요.
      </div>

      {showPick && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
          <Emoji e="🖼" /> 다른 도구가 이미지를 기다리고 있어요. 마음에 드는 사진에서 <b><Emoji e="✅" /> 이 이미지 사용</b>을 누르세요.
        </div>
      )}

      {/* 검색 */}
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 6 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어 (예: nebula, mars, aurora) — 비우면 무작위"
          style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 13, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8 }}
        />
        <button type="submit" className="minibtn" disabled={loading}><Emoji e="🔍" /> 검색</button>
      </form>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 24 }}>우주를 탐사하는 중…</div>
        )}
        {err && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', padding: 16, lineHeight: 1.5 }}>{err}</div>
        )}
        {pic && !loading && !err && (
          <>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
              {imgError ? (
                <div
                  role="alert"
                  style={{ width: '100%', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 20, color: 'var(--muted)', background: 'var(--paper)' }}
                >
                  <div style={{ fontSize: 28 }}><Emoji e="🛰️" /><Emoji e="❌" /></div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>이미지를 불러오지 못했어요</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    이미지가 깨져 저장·전달·사용은 잠시 막아두었어요.<br />
                    아래 <b><Emoji e="🔀" /> 다른 사진</b>으로 다시 시도해 보세요.
                  </div>
                </div>
              ) : (
                <img
                  src={pic.url}
                  alt={pic.title}
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain', background: 'var(--paper)' }}
                  onError={() => { if (alive.current) setImgError(true) }}
                  onLoad={() => { if (alive.current) setImgError(false) }}
                />
              )}
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
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{pic.title}</div>
              {credit && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}><Emoji e="🛰" /> {credit}</div>}
              {pic.date && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="🕰" /> {pic.date}</div>}
              {pic.description && (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}>{pic.description}</div>
              )}
              <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
                <Emoji e="⚖️" /> NASA 미디어는 원칙적으로 퍼블릭 도메인(저작권 없음)으로 자유롭게 활용할 수 있어요. 출처(NASA)를 함께 남겨 주세요.
              </div>
            </div>

            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="🚀" /> SF·우주 배경 영감</div>
              {prompt}
            </div>

            {pic.pageUrl && (
              <a
                href={pic.pageUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none' }}
              >
                <Emoji e="🔗" /> NASA Image Library 에서 보기
              </a>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => load(query, true)} disabled={loading}><Emoji e="🔀" /> 다른 사진</button>
        <button className="minibtn" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])} disabled={!pic || loading}><Emoji e="💡" /> 다른 질문</button>
      </div>

      {/* [연계] 프로젝트 추가 · 라이브러리 저장 · 배경 설정집 · 관련 도구 · (픽 모드) 이미지 사용 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {showPick && (
          <button className="linkbtn btn-primary" onClick={usePick} disabled={!pic || loading || imgError}><Emoji e="✅" /> 이 이미지 사용</button>
        )}
        <button className="linkbtn minibtn" onClick={saveToProject} disabled={!pic || loading || !hasProjectBridge()} title={hasProjectBridge() ? "'우주 배경' 폴더에 메모로 추가" : '프로젝트에 연결되지 않았어요'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn minibtn" onClick={saveToLibrary} disabled={!pic || loading || imgError}><Emoji e="🖼" /> 이미지 라이브러리에 저장</button>
        <button className="linkbtn minibtn" onClick={sendToSettingBible} disabled={!pic || loading || imgError}><Emoji e="🗺️" /> 배경 설정집으로 보내기</button>
        {relations
          .filter((id) => id !== 'setting-bible') // 위 전용 버튼과 중복 방지
          .map((id) => (
            <button key={id} className="linkbtn minibtn" onClick={() => openRelated(id)} disabled={loading} title={`${TOOL_LABELS[id] || id} 열기`}>
              {emojify(TOOL_LABELS[id] || id)}
            </button>
          ))}
        {note && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{emojify(note)}</span>}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
        모든 사진은 NASA Image and Video Library(키 불필요·공개 API)에서 가져오며 퍼블릭 도메인입니다. 출처(NASA)를 그대로 남겨 주세요.
      </div>
    </div>
  )
}
