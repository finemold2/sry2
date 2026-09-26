// 메트로폴리탄 미술관 명작(영감) — 키 없는 공개 API로 무작위 소장품을 가져와 글쓰기 영감으로 삼는다.
// API(키 불필요·https·CORS):
//   목록: https://collectionapi.metmuseum.org/public/collection/v1/objects
//   상세: https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}
// 이미지(primaryImageSmall)가 있는 작품만 노출, 없으면 최대 8회까지 다른 id로 재시도.
// [저작권 안전] The Met Open Access 정책에 따라 isPublicDomain === true 인 작품(CC0)만 채택한다.
//   퍼블릭 도메인이 아니거나 이미지가 없으면 건너뛰고 다른 id 로 재시도 → 안심하고 저장·전달 가능.
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
  type SharedImage,
  Emoji,
  emojify,
} from './linkbus'

export const meta = { id: 'met-museum-art', name: '메트 명작 영감', icon: '🖼️', group: '분위기·시각', intro: '메트 미술관 명작에서 글 한 장면을 떠올리세요', w: 440, h: 640 }

// 관련 도구 이름표(연계 버튼 라벨용) — id 가 relations 에 없으면 그리지 않는다.
const TOOL_LABELS: Record<string, string> = {
  'setting-bible': '🏞 배경 설정집',
  'moodboard-grid': '🧩 무드보드',
  'cover-mockup': '📕 책표지 목업',
  'imagination-gallery': '🖼 상상력 갤러리',
  'palette-lock': '🎨 팔레트',
}

const LICENSE_TEXT = 'CC0 · The Met Open Access'

// 프로젝트 본문(HTML)에 들어갈 사용자/외부 텍스트는 &,<,> 를 반드시 escape 한다.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Art {
  id: number
  title: string
  artist: string
  date: string
  medium: string
  culture: string
  img: string
  url: string
}

const SCENE_PROMPTS = [
  '이 그림 속으로 한 인물이 걸어 들어옵니다. 그가 가장 먼저 본 것은 무엇일까요?',
  '이 작품이 그려지던 순간, 화면 밖에서는 무슨 일이 벌어지고 있었을까요?',
  '이 장면 직전의 1분을 한 문단으로 써보세요. 무엇이 이 순간을 만들었나요?',
  '이 작품 속 빛과 그림자를 묘사하세요. 그 명암은 누구의 마음을 닮았나요?',
  '여기 등장하는(혹은 부재하는) 사람이 끝내 하지 못한 말은 무엇일까요?',
  '이 그림을 오래 바라본 한 사람이 있습니다. 그는 왜 떠나지 못했을까요?',
  '이 작품의 색·질감·온도를 단어 다섯 개로 적고, 그것으로 첫 문장을 만드세요.',
  '이 장면이 어떤 이야기의 마지막 페이지라면, 그 직전에 무슨 일이 있었을까요?',
  '이 작품이 누군가의 기억이라면, 그 기억은 행복일까요 후회일까요? 그려보세요.',
  '이 그림 속 정적을 깨뜨리는 단 하나의 소리를 상상해 장면을 시작하세요.',
]

const LIST_URL = 'https://collectionapi.metmuseum.org/public/collection/v1/objects'
const OBJ_URL = (id: number) => `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
const MAX_TRIES = 8

async function fetchObjectIds(signal?: AbortSignal): Promise<number[]> {
  const r = await fetch(LIST_URL, { signal })
  if (!r.ok) throw new Error('list http')
  const j = await r.json()
  const ids: number[] = Array.isArray(j?.objectIDs) ? j.objectIDs : []
  if (!ids.length) throw new Error('no ids')
  return ids
}

async function fetchOne(id: number, signal?: AbortSignal): Promise<Art | null> {
  const r = await fetch(OBJ_URL(id), { signal })
  if (!r.ok) return null
  const j = await r.json()
  // [저작권 안전] 퍼블릭 도메인(CC0)이 확정된 작품만 채택. 아니면 건너뛰고 다른 id 재시도.
  if (j?.isPublicDomain !== true) return null
  const img: string = j?.primaryImageSmall || ''
  if (!img) return null // 이미지 없는 작품은 건너뜀
  return {
    id: j.objectID,
    title: (j.title || '제목 미상').trim(),
    artist: (j.artistDisplayName || '작가 미상').trim(),
    date: (j.objectDate || '연대 미상').trim(),
    medium: (j.medium || '').trim(),
    culture: (j.culture || '').trim(),
    img,
    url: j.objectURL || '',
  }
}

interface Props { payload?: Record<string, unknown> }

export default function MetMuseumArt({ payload }: Props) {
  const pickMode = !!(payload && payload.pickMode) && hasPendingPick()

  const [art, setArt] = useState<Art | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [imgError, setImgError] = useState(false) // 이미지 깨짐(로드 실패) 상태 — 깨진 URL 전파 방지용
  const [prompt, setPrompt] = useState(SCENE_PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  const nonce = useRef(0)
  const idsRef = useRef<number[]>([])
  const acRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const msgTimer = useRef<number | null>(null)

  const flashMsg = (m: string) => {
    setLinkMsg(m)
    if (msgTimer.current) clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => { if (mounted.current) setLinkMsg('') }, 1800)
  }

  const load = async () => {
    const my = ++nonce.current
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setCopied(false); setImgError(false)
    try {
      // id 목록은 한 번만 받아 캐시
      if (!idsRef.current.length) {
        idsRef.current = await fetchObjectIds(ac.signal)
      }
      const ids = idsRef.current
      let found: Art | null = null
      for (let i = 0; i < MAX_TRIES && !found; i++) {
        if (my !== nonce.current || ac.signal.aborted) return
        const id = ids[Math.floor(Math.random() * ids.length)]
        try {
          found = await fetchOne(id, ac.signal)
        } catch {
          // 개별 조회 실패는 무시하고 다른 id 재시도
          if (ac.signal.aborted) return
        }
      }
      if (my !== nonce.current || ac.signal.aborted) return
      if (found) {
        setArt(found)
        setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])
      } else {
        setErr('퍼블릭 도메인(CC0) 작품을 찾지 못했습니다. 다시 시도해 주세요.')
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) setErr('작품을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
      acRef.current?.abort() // 언마운트 시 진행 중 요청 정리
      if (msgTimer.current) { clearTimeout(msgTimer.current); msgTimer.current = null }
    }
    // eslint-disable-next-line
  }, [])

  const copyText = () => {
    if (!art) return
    const lines = [
      `작품: ${art.title}`,
      `작가: ${art.artist}`,
      `연대: ${art.date}`,
      art.medium ? `재료: ${art.medium}` : '',
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

  // 현재 작품을 SharedImage 형태로 변환(저작권 안전: 퍼블릭 도메인만 채택했으므로 CC0 표기).
  const toSharedImage = (a: Art): Omit<SharedImage, 'id' | 'updated'> => ({
    url: a.img,
    title: a.title,
    credit: a.artist + (a.date ? ' · ' + a.date : ''),
    license: LICENSE_TEXT,
    source: a.url || 'https://www.metmuseum.org/',
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
      source: art.url || 'https://www.metmuseum.org/',
      license: LICENSE_TEXT,
    })
    flashMsg('🏞 배경 설정집으로 보냈어요')
  }

  // [연계] 임의의 관련 도구를 현재 작품과 함께 열기. 깨진 이미지면 URL 없이(빈 손으로) 연다.
  const openRelated = (toolId: string) => {
    if (!art || imgError) { openToolLinked(toolId); return }
    openToolLinked(toolId, {
      image: art.img,
      title: art.title,
      credit: art.artist + ' · ' + LICENSE_TEXT,
      license: LICENSE_TEXT,
      source: art.url || 'https://www.metmuseum.org/',
    })
  }

  // [프로젝트 브리지] 현재 명작 정보 + 장면 질문을 'research(자료)/이미지 영감' 폴더 메모로 저장(CC0).
  const addToProjectMemo = () => {
    if (!art) return
    const rows: string[] = [
      `<p><b>작품</b>: ${esc(art.title)}</p>`,
      `<p><b>작가</b>: ${esc(art.artist)}</p>`,
      `<p><b>연대</b>: ${esc(art.date)}</p>`,
    ]
    if (art.medium) rows.push(`<p><b>재료</b>: ${esc(art.medium)}</p>`)
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
      id: 'met_' + art.id,
      ...toSharedImage(art),
      updated: Date.now(),
    })
    if (ok) {
      openToolLinked(meta.id) // 요청 처리 후 자신을 일반 모드로 다시 열어(픽 창 정리) — opener 가 없으면 무시됨
      flashMsg('✅ 이 이미지를 전달했어요')
    } else {
      flashMsg('전달할 요청이 없어요')
    }
  }

  const relations = (TOOL_RELATIONS[meta.id] || [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        메트로폴리탄 미술관의 <b>퍼블릭 도메인(CC0)</b> 소장품을 무작위로 만나 글 속 한 장면을 떠올려 보세요.
      </div>

      {pickMode && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
          <Emoji e="🖼" /> 다른 도구가 이미지를 기다리고 있어요. 마음에 드는 작품에서 <b><Emoji e="✅" /> 이 이미지 사용</b>을 누르세요.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 24 }}>명작을 찾는 중…</div>
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
                    아래 <b><Emoji e="🔀" /> 다른 명작</b>으로 다시 시도해 보세요.
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
              {/* [저작권] 라이선스 배지 — 퍼블릭 도메인(CC0)만 채택했음을 명시. 이미지 깨짐 상태에선 숨김. */}
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
                {art.culture ? ' · ' + art.culture : ''}
              </div>
              {art.medium && (
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}><Emoji e="🧱" /> {art.medium}</div>
              )}
              <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
                <Emoji e="⚖️" /> 이 작품은 The Met Open Access 정책에 따른 퍼블릭 도메인(CC0)으로, 자유롭게 활용할 수 있어요.
              </div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️" /> 이 작품에서 떠오르는 장면</div>
              {prompt}
            </div>
            {art.url && (
              <a
                href={art.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none' }}
              >
                <Emoji e="🔗" /> 메트 미술관에서 보기
              </a>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀" /> 다른 명작</button>
        <button className="minibtn" onClick={() => setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])} disabled={!art || loading}><Emoji e="💡" /> 다른 질문</button>
        <button className="minibtn" onClick={copyText} disabled={!art || loading}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
      </div>

      {/* [연계] 라이브러리 저장 · 배경 설정집 전달 · (픽 모드 시) 이미지 사용 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {pickMode && (
          <button className="linkbtn btn-primary" onClick={usePick} disabled={!art || loading || imgError}><Emoji e="✅" /> 이 이미지 사용</button>
        )}
        <button className="linkbtn minibtn" onClick={addToProjectMemo} disabled={!art || loading || !hasProjectBridge()} title={hasProjectBridge() ? "'이미지 영감' 폴더에 메모로 추가" : '프로젝트에 연결되지 않았어요'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn minibtn" onClick={saveToImageLibrary} disabled={!art || loading || imgError}><Emoji e="🖼" /> 이미지 라이브러리에 저장</button>
        <button className="linkbtn minibtn" onClick={sendToSettingBible} disabled={!art || loading || imgError}><Emoji e="🏞" /> 배경 설정집으로 보내기</button>
        {relations
          .filter((id) => id !== 'setting-bible') // 위 전용 버튼과 중복 방지
          .map((id) => (
            <button key={id} className="linkbtn minibtn" onClick={() => openRelated(id)} disabled={loading || imgError} title={`${TOOL_LABELS[id] || id} 열기`}>
              {emojify(TOOL_LABELS[id] || id)}
            </button>
          ))}
        {linkMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{linkMsg}</span>}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>제목·작가·연대를 단서 삼아, 떠오른 장면을 바로 원고에 적어보세요.</div>
    </div>
  )
}
