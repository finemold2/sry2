// 위키미디어 오늘의 그림(자유 라이선스) — 키 없는 공개 REST API로 위키백과 '오늘의 추천 그림(Picture of the Day)'을
// 가져와 글 한 장면을 떠올린다. 무작위 날짜로도 새 그림을 만날 수 있다.
// API(키 불필요·https·CORS): https://en.wikipedia.org/api/rest_v1/feed/featured/{YYYY}/{MM}/{DD}
//   응답의 image 필드(image.thumbnail.source · image.image.source · artist/credit/license/description/file_page)를 사용.
// [저작권 안전] 위키백과 '오늘의 그림'은 위키미디어 공용의 자유 라이선스(퍼블릭 도메인 / CC0 / CC BY / CC BY-SA) 작품만 노출됩니다.
//   각 그림의 라이선스·제작자·출처(파일 페이지)를 항상 함께 표기하므로, 표기를 유지하면 안심하고 활용·전달할 수 있어요.
// react 외 import 는 오직 './linkbus' 만 허용.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary,
  openToolLinked,
  hasPendingPick,
  fulfillImagePick,
  TOOL_RELATIONS,
  getList,
  addToProject,
  hasProjectBridge,
  Emoji,
  emojify,
  type SharedImage,
} from './linkbus'

export const meta = { id: 'wikimedia-art-daily', name: '오늘의 그림', icon: '🖼️', group: '분위기·시각', intro: '위키미디어 오늘의 추천 그림에서 한 장면을 떠올리세요', w: 440, h: 660 }

// 관련 도구 이름표(연계 버튼 라벨용) — id 가 relations 에 없으면 그리지 않는다.
// 'wikimedia-art-daily' 는 TOOL_RELATIONS 에 아직 없을 수 있으므로, 없으면 시각 계열 기본 묶음으로 대체한다.
const TOOL_LABELS: Record<string, string> = {
  'setting-bible': '🏞 배경 설정집',
  'moodboard-grid': '🧩 무드보드',
  'cover-mockup': '📕 책표지 목업',
  'imagination-gallery': '🖼 상상력 갤러리',
  'palette-lock': '🎨 팔레트',
  'met-museum-art': '🖼 메트 명작',
  'cleveland-art': '🏛 클리블랜드 명작',
}
const FALLBACK_RELATIONS = ['setting-bible', 'moodboard-grid', 'imagination-gallery', 'cover-mockup']

// 프로젝트 본문(HTML)에 들어갈 사용자/외부 텍스트는 &,<,> 를 반드시 escape 한다.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// HTML 조각(artist.html 등)에서 태그를 떼어내 평문만 남긴다(보안·일관성). 빈 문자열은 fallback 으로 대체.
const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface Picture {
  date: string          // YYYY-MM-DD (요청한 날짜)
  title: string         // 'File:...' 에서 정리한 이름
  rawTitle: string      // 원본 file 제목
  thumb: string         // 표시용(thumbnail.source)
  full: string          // 원본(image.source) — 저장/전달 시 우선 사용
  width: number
  height: number
  description: string   // 평문 설명
  artist: string        // 제작자(평문)
  credit: string        // 출처/저작 설명(평문)
  license: string       // 라이선스 표기(예: 'Public domain', 'CC0', 'CC BY-SA 4.0')
  licenseUrl: string
  filePage: string      // commons 파일 페이지(출처)
}

const SCENE_PROMPTS = [
  '이 그림 속으로 한 인물이 걸어 들어옵니다. 그가 가장 먼저 본 것은 무엇일까요?',
  '이 장면에서 들릴 법한 소리 세 가지를 적고, 그중 하나로 첫 문장을 시작하세요.',
  '이 그림의 빛과 그림자를 묘사하세요. 그 명암은 누구의 마음을 닮았나요?',
  '이 장면 직전의 1분을 한 문단으로 써보세요. 무엇이 이 순간을 만들었나요?',
  '여기 있는(혹은 부재하는) 사람이 끝내 하지 못한 말은 무엇일까요?',
  '이 풍경의 냄새와 온도를 단어 다섯 개로 적고, 그것으로 한 문장을 만드세요.',
  '이 그림이 어떤 이야기의 마지막 페이지라면, 그 직전에 무슨 일이 있었을까요?',
  '이 장면을 한 인물이 오래 바라봅니다. 그는 왜 떠나지 못할까요?',
  '이 그림이 누군가의 기억이라면, 그 기억은 행복일까요 후회일까요? 그려보세요.',
  '이 풍경 한가운데에 작은 비밀 하나를 숨겨보세요. 누가, 왜 그것을 감췄을까요?',
]

const FEED_URL = (y: string, m: string, d: string) =>
  `https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`

function pad(n: number) { return String(n).padStart(2, '0') }

// 'File:Golden_hour_at_bekol_savannah.jpg' → 'Golden hour at bekol savannah'
function cleanTitle(raw: string): string {
  let t = raw.replace(/^File:/i, '')
  t = t.replace(/\.(jpe?g|png|gif|tiff?|webp|svg)$/i, '')
  t = t.replace(/_/g, ' ').trim()
  return t || '제목 미상'
}

// 위키백과 '오늘의 그림' 추천 범위: 가장 이른 안정 데이터는 2015-05-01 경. 너무 옛 날짜는 image 가 비는 경우가 있어
// 무작위는 2016-01-01 ~ '어제' 사이에서 고른다(오늘은 표준시 차이로 비어 있을 수 있어 어제까지).
function randomDate(): { y: string; m: string; d: string } {
  const start = Date.UTC(2016, 0, 1)
  const end = Date.now() - 24 * 60 * 60 * 1000 // 어제
  const t = start + Math.random() * Math.max(0, end - start)
  const dt = new Date(t)
  return { y: String(dt.getUTCFullYear()), m: pad(dt.getUTCMonth() + 1), d: pad(dt.getUTCDate()) }
}

async function fetchPicture(y: string, m: string, d: string, signal: AbortSignal): Promise<Picture | null> {
  const r = await fetch(FEED_URL(y, m, d), { headers: { Accept: 'application/json' }, signal })
  if (!r.ok) throw new Error('status ' + r.status)
  const j = await r.json()
  const im = j?.image
  if (!im) return null
  const thumb: string = im?.thumbnail?.source || im?.image?.source || ''
  const full: string = im?.image?.source || im?.thumbnail?.source || ''
  if (!thumb && !full) return null

  const artist = stripTags(im?.artist?.text || im?.artist?.html || '') || '제작자 미상'
  const credit = stripTags(im?.credit?.text || im?.credit?.html || '')
  const description = stripTags(im?.description?.text || im?.description?.html || '')
  const license = (im?.license?.type || '').trim() || '자유 라이선스'
  const licenseUrl = (im?.license?.url || '').trim()
  const filePage = (im?.file_page || '').trim()
  const rawTitle = (im?.title || '').trim()

  return {
    date: `${y}-${m}-${d}`,
    title: cleanTitle(rawTitle),
    rawTitle,
    thumb: thumb || full,
    full: full || thumb,
    width: Number(im?.image?.width || im?.thumbnail?.width || 0),
    height: Number(im?.image?.height || im?.thumbnail?.height || 0),
    description,
    artist,
    credit,
    license,
    licenseUrl,
    filePage: filePage || 'https://commons.wikimedia.org/',
  }
}

interface Props { payload?: Record<string, unknown> }

export default function WikimediaArtDaily({ payload }: Props) {
  const pickMode = !!(payload && payload.pickMode) && hasPendingPick()

  const [pic, setPic] = useState<Picture | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [imgError, setImgError] = useState(false)
  const [prompt, setPrompt] = useState(SCENE_PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  const [isToday, setIsToday] = useState(true)

  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const msgTimer = useRef<number | null>(null)

  const flashMsg = (m: string) => {
    setLinkMsg(m)
    if (msgTimer.current) clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => { if (mounted.current) setLinkMsg('') }, 1800)
  }

  // mode: 'today' = 오늘 추천 그림, 'random' = 무작위 날짜. 오늘이 비어 있으면(시차) 어제로 자동 폴백.
  const load = async (mode: 'today' | 'random') => {
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setCopied(false); setImgError(false)
    setIsToday(mode === 'today')
    try {
      let found: Picture | null = null
      if (mode === 'today') {
        // 오늘 → (비면) 어제 순으로 시도(UTC 기준 데이터라 지역 시각상 오늘이 아직 없을 수 있음).
        for (let back = 0; back < 3 && !found; back++) {
          if (my !== nonce.current || ac.signal.aborted) return
          const dt = new Date(Date.now() - back * 24 * 60 * 60 * 1000)
          try {
            found = await fetchPicture(String(dt.getFullYear()), pad(dt.getMonth() + 1), pad(dt.getDate()), ac.signal)
          } catch {
            if (ac.signal.aborted) return
          }
        }
      } else {
        // 무작위: image 가 빈 날짜를 만날 수 있어 최대 6회 재시도.
        for (let i = 0; i < 6 && !found; i++) {
          if (my !== nonce.current || ac.signal.aborted) return
          const { y, m, d } = randomDate()
          try {
            found = await fetchPicture(y, m, d, ac.signal)
          } catch {
            if (ac.signal.aborted) return
          }
        }
      }
      if (my !== nonce.current || ac.signal.aborted) return
      if (found) {
        setPic(found)
        setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])
      } else {
        setErr('오늘의 그림을 찾지 못했어요. 잠시 후 다시 시도하거나 🎲 무작위 날짜를 눌러보세요.')
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) setErr('그림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load('today')
    return () => {
      mounted.current = false
      acRef.current?.abort() // 언마운트 시 진행 중 요청 정리
      if (msgTimer.current) { clearTimeout(msgTimer.current); msgTimer.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const licenseText = (p: Picture) => `${p.license} · 위키미디어 공용`

  const copyText = () => {
    if (!pic) return
    const lines = [
      `그림: ${pic.title}`,
      `제작자: ${pic.artist}`,
      pic.description ? `설명: ${pic.description}` : '',
      '',
      `떠오르는 장면: ${prompt}`,
      `라이선스: ${licenseText(pic)}`,
      `출처: ${pic.filePage}`,
    ].filter(Boolean)
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // 현재 그림을 SharedImage 형태로 변환. 저작권: 자유 라이선스이지만 출처/제작자 표기를 credit 에 함께 담는다.
  const toSharedImage = (p: Picture): Omit<SharedImage, 'id' | 'updated'> => ({
    url: p.full || p.thumb,
    title: p.title,
    credit: p.artist + (p.license ? ' · ' + p.license : ''),
    license: licenseText(p),
    source: p.filePage,
  })

  // [연계] 이미지 라이브러리에 저장(중복 url 은 건너뜀). 깨진 이미지는 저장하지 않는다(URL 전파 방지).
  const saveToImageLibrary = () => {
    if (!pic || imgError) return
    const url = pic.full || pic.thumb
    const exists = getList('images').some((x) => x.url === url)
    if (exists) { flashMsg('이미 이미지 라이브러리에 있어요'); return }
    addToLibrary('images', toSharedImage(pic))
    flashMsg('🖼 이미지 라이브러리에 저장했어요')
  }

  // [연계] 배경 설정집으로 이미지·정보를 전달하며 도구 열기. 깨진 이미지는 전달하지 않는다.
  const sendToSettingBible = () => {
    if (!pic || imgError) return
    // 정규(장소) 키 fields 를 함께 보내 받는 허브에서 제자리(기본 칸)에 들어가게 한다(손실 없는 표준 전달).
    const mood = pic.description || prompt
    const fields: Record<string, string> = { name: pic.title }
    if (mood) fields.atmosphere = mood                 // 분위기 → atmosphere
    if (pic.description) fields.appearance = pic.description  // 외관/자유 묘사 → appearance
    if (prompt) fields.notes = '떠오르는 장면: ' + prompt     // 장면 질문 → notes
    openToolLinked('setting-bible', {
      image: pic.full || pic.thumb,
      imageCredit: pic.artist + ' · ' + licenseText(pic),
      name: pic.title,
      mood,
      source: pic.filePage,
      license: licenseText(pic),
      fields,
    })
    flashMsg('🏞 배경 설정집으로 보냈어요')
  }

  // [연계] 임의의 관련 도구를 현재 그림과 함께 열기. 깨진 이미지면 URL 없이(빈 손으로) 연다.
  const openRelated = (toolId: string) => {
    if (!pic || imgError) { openToolLinked(toolId); return }
    openToolLinked(toolId, {
      image: pic.full || pic.thumb,
      title: pic.title,
      credit: pic.artist + ' · ' + licenseText(pic),
      license: licenseText(pic),
      source: pic.filePage,
    })
  }

  // [프로젝트 브리지] 현재 그림 정보 + 장면 질문을 'research(자료)/이미지 영감' 폴더 메모로 저장.
  const addToProjectMemo = () => {
    if (!pic) return
    const rows: string[] = [
      `<p><b>그림</b>: ${esc(pic.title)}</p>`,
      `<p><b>제작자</b>: ${esc(pic.artist)}</p>`,
    ]
    if (pic.description) rows.push(`<p><b>설명</b>: ${esc(pic.description)}</p>`)
    rows.push(`<p><b>떠오르는 장면</b>: ${esc(prompt)}</p>`)
    rows.push(`<p><b>라이선스</b>: ${esc(licenseText(pic))}</p>`)
    rows.push(`<p><b>출처</b>: <a href="${esc(pic.filePage)}">위키미디어 공용</a></p>`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '이미지 영감',
      title: pic.title,
      bodyHtml: rows.join('\n'),
      meta: {
        제작자: pic.artist,
        라이선스: licenseText(pic),
        출처: pic.filePage,
      },
    })
    flashMsg(id ? '📄 프로젝트에 추가했어요' : '프로젝트에 추가하지 못했어요')
  }

  // [픽 모드] 갤러리 대신 이 도구가 호출됐을 때, 현재 그림을 픽 요청자에게 돌려준다.
  const usePick = () => {
    if (!pic || imgError) return // 깨진 이미지는 픽 요청자에게 전달하지 않는다(URL 전파 방지)
    const ok = fulfillImagePick({
      id: 'wmpotd_' + pic.date,
      ...toSharedImage(pic),
      updated: Date.now(),
    })
    if (ok) {
      openToolLinked(meta.id) // 요청 처리 후 자신을 일반 모드로 다시 열어(픽 창 정리) — opener 가 없으면 무시됨
      flashMsg('✅ 이 이미지를 전달했어요')
    } else {
      flashMsg('전달할 요청이 없어요')
    }
  }

  const rels = TOOL_RELATIONS[meta.id]
  const relations = (rels && rels.length ? rels : FALLBACK_RELATIONS)
  const dateLabel = (d: string) => {
    const [y, m, dd] = d.split('-')
    return `${Number(y)}년 ${Number(m)}월 ${Number(dd)}일`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        위키백과 <b>오늘의 추천 그림</b>(자유 라이선스)을 만나 글 속 한 장면을 떠올려 보세요.
      </div>

      {pickMode && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
          <Emoji e="🖼" /> 다른 도구가 이미지를 기다리고 있어요. 마음에 드는 그림에서 <b><Emoji e="✅" /> 이 이미지 사용</b>을 누르세요.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 24 }}>오늘의 그림을 찾는 중…</div>
        )}
        {err && !loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', padding: 16, gap: 12 }}>
            <div style={{ fontSize: 28 }}><Emoji e="📡" /></div>
            <div style={{ lineHeight: 1.55 }}>{emojify(err)}</div>
            <button className="minibtn" onClick={() => load('random')}><Emoji e="🎲" /> 무작위 날짜로 시도</button>
          </div>
        )}
        {pic && !loading && !err && (
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
                    아래 <b><Emoji e="🎲" /> 무작위 그림</b>으로 다시 시도해 보세요.
                  </div>
                </div>
              ) : (
                <img
                  src={pic.thumb}
                  alt={pic.title}
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain', background: 'var(--paper)' }}
                  onError={() => { if (mounted.current) setImgError(true) }}
                  onLoad={() => { if (mounted.current) setImgError(false) }}
                />
              )}
              {/* [저작권] 라이선스 배지 — 자유 라이선스 + 표기 의무를 명시. 이미지 깨짐 상태에선 숨김. */}
              {!imgError && (
                <span
                  className="license-badge"
                  style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10.5, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.62)', borderRadius: 6, padding: '3px 7px', letterSpacing: '.2px' }}
                >
                  {licenseText(pic)}
                </span>
              )}
              {/* 날짜 배지(오늘/해당 날짜) */}
              <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 10.5, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: 6, padding: '3px 7px' }}>
                {isToday ? <><Emoji e="📅" /> 오늘</> : <><Emoji e="🎲" /> {dateLabel(pic.date)}</>}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{pic.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}><Emoji e="🎨" /> {emojify(pic.artist)}</div>
              {pic.description && (
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}><Emoji e="📝" /> {emojify(pic.description)}</div>
              )}
              <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>
                <Emoji e="⚖️" /> 위키미디어 공용의 <b>자유 라이선스</b>({pic.license}) 그림입니다. 제작자·출처 표기를 유지하면 자유롭게 활용할 수 있어요.
                {pic.licenseUrl && (
                  <>
                    {' '}
                    <a href={pic.licenseUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>라이선스 보기</a>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️" /> 이 그림의 장면</div>
              {emojify(prompt)}
            </div>

            <a
              href={pic.filePage}
              target="_blank"
              rel="noreferrer noopener"
              style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none' }}
            >
              <Emoji e="🔗" /> 위키미디어 공용에서 원본·출처 보기
            </a>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => load('today')} disabled={loading}><Emoji e="📅" /> 오늘의 그림</button>
        <button className="minibtn" onClick={() => load('random')} disabled={loading}><Emoji e="🎲" /> 무작위 그림</button>
        <button className="minibtn" onClick={() => setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])} disabled={!pic || loading}><Emoji e="💡" /> 다른 질문</button>
        <button className="minibtn" onClick={copyText} disabled={!pic || loading}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
      </div>

      {/* [연계] 프로젝트 추가 · 라이브러리 저장 · 배경 설정집 전달 · (픽 모드 시) 이미지 사용 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {pickMode && (
          <button className="linkbtn btn-primary" onClick={usePick} disabled={!pic || loading || imgError}><Emoji e="✅" /> 이 이미지 사용</button>
        )}
        <button className="linkbtn minibtn" onClick={addToProjectMemo} disabled={!pic || loading || !hasProjectBridge()} title={hasProjectBridge() ? "'이미지 영감' 폴더에 메모로 추가" : '프로젝트에 연결되지 않았어요'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn minibtn" onClick={saveToImageLibrary} disabled={!pic || loading || imgError}><Emoji e="🖼" /> 이미지 라이브러리에 저장</button>
        <button className="linkbtn minibtn" onClick={sendToSettingBible} disabled={!pic || loading || imgError}><Emoji e="🏞" /> 배경 설정집으로 보내기</button>
        {relations
          .filter((id) => id !== 'setting-bible') // 위 전용 버튼과 중복 방지
          .map((id) => (
            <button key={id} className="linkbtn minibtn" onClick={() => openRelated(id)} disabled={loading || imgError} title={`${TOOL_LABELS[id] || id} 열기`}>
              {emojify(TOOL_LABELS[id] || id)}
            </button>
          ))}
        {linkMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{emojify(linkMsg)}</span>}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>제목·설명을 단서 삼아, 떠오른 장면을 바로 원고에 적어보세요.</div>
    </div>
  )
}
