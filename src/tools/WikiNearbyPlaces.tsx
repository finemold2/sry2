// 위키 주변 장소 탐색 — 한 장소를 검색해 그 좌표 주변에 있는 위키백과 문서(명소·지명)를 거리순으로 모은다.
//  · 장소→좌표: Nominatim(OpenStreetMap) https://nominatim.openstreetmap.org/search?format=json&q=… (키 없음·CORS·https)
//  · 주변 문서: 위키백과 GeoSearch
//      https://ko.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord={lat}|{lon}&gsradius=10000&gslimit=20&format=json&origin=*
//    한국어 결과가 비면 영어(en.wikipedia.org)로 폴백한다. origin=* 로 CORS 허용.
//  · 용도: 작품 무대 주변에 실제로 무엇이 있는지(랜드마크·지명·유적) 배경 답사·취재.
//  · 연계: 고른 주변 장소를 setting 카드(자료 › 장소)로 프로젝트에 추가하거나, 공유 장소 라이브러리에 저장.
//  · 저작권: 지명·좌표는 © OpenStreetMap 기여자(ODbL), 문서 요약·제목은 위키백과(CC BY-SA). 출처를 함께 남긴다.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import {
  addToLibrary,
  addToProject,
  hasProjectBridge,
  useLibraryList,
  Emoji,
  type SharedPlace,
} from './linkbus'

export const meta = { id: 'wiki-nearby-places', name: '위키 주변 장소 탐색', icon: '📍', group: '리서치·자료', intro: '한 장소 주변의 실제 명소·지명을 위키백과에서 거리순으로 모아 무대 답사에 쓰세요', w: 720, h: 640 }

// 본문 HTML 에 들어갈 텍스트의 &,<,> 이스케이프(프로젝트 저장용).
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const LS_KEY = 'sry:tool:wiki-nearby-places'

// 검색한 중심 장소(좌표 + 표시명).
interface Center {
  name: string        // display_name(표시명)
  shortName: string   // name 또는 표시명 첫 토막
  lat: number
  lon: number
}

// 위키 GeoSearch 한 건(주변 문서).
interface Nearby {
  pageid: number
  title: string
  lat: number
  lon: number
  dist: number        // 미터(위키가 제공)
  lang: 'ko' | 'en'   // 어느 위키에서 왔는지
}

const SEEDS = ['경복궁', '파리 에펠탑', '교토', '이스탄불', '베네치아', '제주도', '에든버러', '뉴욕 센트럴파크']

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 거리(m)를 사람이 읽기 좋은 문자열로.
function fmtDist(m: number): string {
  if (!isFinite(m)) return ''
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)}km`
}

// Nominatim 한 건 → Center. 좌표가 숫자가 아니면 null.
function toCenter(r: any): Center | null {
  const lat = parseFloat(r?.lat)
  const lon = parseFloat(r?.lon)
  if (!isFinite(lat) || !isFinite(lon)) return null
  const display = typeof r?.display_name === 'string' ? r.display_name : ''
  const short = typeof r?.name === 'string' && r.name.trim() ? r.name.trim() : (display.split(',')[0] || '').trim()
  return {
    name: display || short || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    shortName: short || display || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat, lon,
  }
}

// 위키 GeoSearch 응답 → Nearby[].
function toNearby(j: any, lang: 'ko' | 'en'): Nearby[] {
  const arr = j?.query?.geosearch
  if (!Array.isArray(arr)) return []
  return arr
    .map((g: any): Nearby | null => {
      const lat = Number(g?.lat)
      const lon = Number(g?.lon)
      const pageid = Number(g?.pageid)
      const title = typeof g?.title === 'string' ? g.title : ''
      if (!title || !isFinite(lat) || !isFinite(lon)) return null
      return { pageid: isFinite(pageid) ? pageid : 0, title, lat, lon, dist: Number(g?.dist) || 0, lang }
    })
    .filter((n: Nearby | null): n is Nearby => !!n)
    .sort((a: Nearby, b: Nearby) => a.dist - b.dist)
}

// 위키 문서 URL(언어별).
function wikiUrl(n: Nearby): string {
  const host = n.lang === 'ko' ? 'ko.wikipedia.org' : 'en.wikipedia.org'
  return `https://${host}/wiki/${encodeURIComponent(n.title.replace(/ /g, '_'))}`
}

// OpenStreetMap 좌표 링크.
function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
}

// localStorage 에서 마지막 검색어 복원(graceful).
function loadLastQuery(): string {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return ''
    const p = JSON.parse(raw)
    return typeof p?.q === 'string' ? p.q : ''
  } catch { return '' }
}

export default function WikiNearbyPlaces({ payload }: { payload?: Record<string, unknown> }) {
  const [q, setQ] = useState(() => loadLastQuery())
  const [center, setCenter] = useState<Center | null>(null)
  const [list, setList] = useState<Nearby[]>([])
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('')        // 진행 표시(좌표 찾는 중 / 주변 검색 중)
  const [err, setErr] = useState('')
  const [searched, setSearched] = useState(false)
  const [radius, setRadius] = useState(10000)   // 미터(위키 gsradius, 최대 10000)
  const [toast, setToast] = useState('')

  const libPlaces = useLibraryList('places')

  const mounted = useRef(true)
  const nonce = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      nonce.current++ // 진행 중 응답 무효화
      if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null }
    }
  }, [])

  // 마지막 검색어 저장(graceful).
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ q })) } catch { /* 차단/용량초과 무시 */ }
  }, [q])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
  }

  // 위키 GeoSearch 한 언어 호출.
  const fetchGeo = async (lat: number, lon: number, lang: 'ko' | 'en', gsradius: number): Promise<Nearby[]> => {
    const host = lang === 'ko' ? 'ko.wikipedia.org' : 'en.wikipedia.org'
    const url = `https://${host}/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${gsradius}&gslimit=20&format=json&origin=*`
    const r = await fetch(url)
    if (!r.ok) throw new Error('http ' + r.status)
    const j = await r.json()
    return toNearby(j, lang)
  }

  const runSearch = async (term: string, gsradius = radius) => {
    const word = (term || '').trim()
    if (!word) { setCenter(null); setList([]); setSearched(false); setErr(''); return }
    const my = ++nonce.current
    setLoading(true); setErr(''); setSearched(true); setList([]); setCenter(null)
    try {
      // 1) 장소 → 좌표 (Nominatim, 키없음·CORS·https, 한국어 우선 표기)
      setPhase('장소의 좌표를 찾는 중…')
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(word)}`
      const gr = await fetch(geoUrl)
      if (!gr.ok) throw new Error('geo http ' + gr.status)
      const gj = await gr.json()
      if (my !== nonce.current || !mounted.current) return
      const c = (Array.isArray(gj) && gj.length ? toCenter(gj[0]) : null)
      if (!c) {
        setErr(`‘${word}’의 위치를 찾지 못했어요. 다른 이름(도시·랜드마크)으로 시도해 보세요.`)
        setLoading(false); setPhase('')
        return
      }
      setCenter(c)

      // 2) 주변 위키 문서 (ko, 비면 en 폴백)
      setPhase('주변 위키 문서를 찾는 중…')
      let near = await fetchGeo(c.lat, c.lon, 'ko', gsradius)
      if (my !== nonce.current || !mounted.current) return
      if (near.length === 0) {
        const enNear = await fetchGeo(c.lat, c.lon, 'en', gsradius)
        if (my !== nonce.current || !mounted.current) return
        near = enNear
      }
      setList(near)
    } catch {
      if (my === nonce.current && mounted.current) {
        setErr('검색에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.')
        setList([])
      }
    } finally {
      if (my === nonce.current && mounted.current) { setLoading(false); setPhase('') }
    }
  }

  const randomSeed = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(s); runSearch(s)
  }

  // 반경 변경 시 중심이 있으면 다시 검색.
  const changeRadius = (r: number) => {
    setRadius(r)
    if (center) runSearch(q, r)
  }

  // payload.query / payload.place 로 열리면 1회 자동 검색.
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const fromPlace = payload && typeof (payload as any).place === 'object' && (payload as any).place
      ? String((payload as any).place?.name || '')
      : ''
    const initial = (payload && typeof payload.query === 'string' && payload.query.trim())
      ? payload.query.trim()
      : fromPlace
    if (initial) { setQ(initial); runSearch(initial) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const copy = (text: string, msg: string) => {
    const done = () => flash(msg)
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => flash('복사에 실패했어요.')) }
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        done()
      }
    } catch { flash('복사에 실패했어요.') }
  }

  // 주변 장소 → SharedPlace(라이브러리 저장용).
  const toShared = (n: Nearby): Omit<SharedPlace, 'updated'> => {
    const coord = `위도 ${n.lat.toFixed(5)}, 경도 ${n.lon.toFixed(5)}`
    const history = center ? `${center.shortName}에서 ${fmtDist(n.dist)} 거리` : ''
    const notes = [
      center ? `중심 장소: ${center.shortName}` : '',
      `좌표: ${coord}`,
      `위키백과 문서: ${wikiUrl(n)}`,
    ].filter(Boolean).join('\n')
    // 정규 장소 키(PLACE_FIELDS)로 1:1 매핑 — 받는 배경 설정집에서 제자리에 들어가도록.
    const fields: Record<string, string> = {
      name: n.title,
      kind: '실제 명소·지명',
      geography: coord,
    }
    if (history) fields.history = history
    if (notes) fields.notes = notes
    return {
      id: uid(),
      name: n.title,
      kind: '실제 명소·지명',
      history: history || undefined,
      notes,
      fields,
      source: `위키백과(${n.lang === 'ko' ? '한국어' : '영어'}, CC BY-SA) · 좌표 © OpenStreetMap 기여자(ODbL)`,
    }
  }

  const saveToLibrary = (n: Nearby) => {
    addToLibrary('places', toShared(n))
    flash(`‘${n.title}’을(를) 장소 라이브러리에 저장했어요`)
  }

  // 프로젝트 바인더(자료 › 장소)에 setting 카드로 추가.
  const saveToProject = (n: Nearby) => {
    if (!hasProjectBridge()) { flash('프로젝트 연동이 되어 있지 않아요'); return }
    const coord = `위도 ${n.lat.toFixed(5)}, 경도 ${n.lon.toFixed(5)}`
    const distLabel = center ? `${center.shortName}에서 ${fmtDist(n.dist)}` : ''
    const url = wikiUrl(n)

    const character: Record<string, string> = { name: n.title, type: '실제 명소·지명' }
    if (distLabel) character.location = distLabel
    const noteParts: string[] = [`좌표: ${coord}`]
    if (distLabel) noteParts.push(`거리: ${distLabel}`)
    noteParts.push(`위키백과: ${url}`)
    noteParts.push('문서 © 위키백과 기여자(CC BY-SA) · 좌표 © OpenStreetMap 기여자(ODbL)')
    character.notes = noteParts.join('\n\n')
    // 정규 장소 키(PLACE_FIELDS)를 추가로 매핑 — 기존 키는 유지하고 표준 칸에도 들어가도록.
    character.kind = '실제 명소·지명'        // 종류 → kind
    character.geography = coord              // 좌표(지형/위치) → geography

    const body: string[] = []
    body.push(`<p><strong>${esc(n.title)}</strong></p>`)
    if (distLabel) body.push(`<p>${esc(distLabel)}</p>`)
    body.push(`<p>${esc(coord)}</p>`)
    body.push(`<p><a href="${esc(url)}">위키백과에서 보기 →</a></p>`)
    body.push(`<p><a href="${esc(osmLink(n.lat, n.lon))}">지도에서 위치 보기 →</a></p>`)
    body.push(`<p><em>문서 © 위키백과 기여자(CC BY-SA) · 좌표 © OpenStreetMap 기여자(ODbL)</em></p>`)

    const id = addToProject({
      kind: 'setting',
      folder: '장소',
      title: n.title,
      character,
      bodyHtml: body.join('\n'),
      meta: {
        유형: '실제 명소·지명',
        ...(distLabel ? { 거리: distLabel } : {}),
        좌표: coord,
        출처: `위키백과(${n.lang === 'ko' ? 'ko' : 'en'})`,
      },
    })
    flash(id ? `‘${n.title}’을(를) 프로젝트에 추가했어요` : '프로젝트 연동이 되어 있지 않아요')
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); runSearch(q) }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', minHeight: 0, fontSize: 14, boxSizing: 'border-box' }
  const formBar: React.CSSProperties = { display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const muted: React.CSSProperties = { color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }
  const licenseNote: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'break-word', padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, background: 'var(--panel)' }
  const radii: { label: string; v: number }[] = [
    { label: '2km', v: 2000 }, { label: '5km', v: 5000 }, { label: '10km', v: 10000 },
  ]

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={formBar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="중심 장소를 검색하세요 (예: 경복궁, 파리 에펠탑)"
          style={input}
          aria-label="중심 장소 검색"
        />
        <button type="submit" className="btn-primary"><Emoji e="🔍"/> 주변 찾기</button>
        <button type="button" className="minibtn" onClick={randomSeed} title="예시 장소로 검색"><Emoji e="🔀"/> 예시</button>
        <span style={{ ...muted, fontSize: 11.5, marginLeft: 4 }}>반경</span>
        {radii.map((r) => (
          <button
            key={r.v}
            type="button"
            className="minibtn"
            onClick={() => changeRadius(r.v)}
            style={radius === r.v ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title={`반경 ${r.label} 안의 위키 문서`}
          >
            {r.label}
          </button>
        ))}
      </form>

      <div style={scroll}>
        {loading && <div style={{ padding: 18, textAlign: 'center', ...muted }}>{phase || '검색 중…'}</div>}

        {!loading && err && (
          <div style={{ padding: 16, ...muted }}>
            {err}
            <div style={{ marginTop: 10 }}><button className="minibtn" onClick={() => runSearch(q)}>다시 시도</button></div>
          </div>
        )}

        {!loading && !err && !searched && (
          <div style={{ padding: 18, ...muted, textAlign: 'center' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}><Emoji e="📍"/></div>
            작품 무대가 될 장소를 검색하면<br />그 주변에 실제로 있는 명소·지명을<br />위키백과에서 거리순으로 모아 보여줘요.
            <div style={{ marginTop: 12 }}><button className="minibtn" onClick={randomSeed}><Emoji e="🔀"/> 예시로 시작</button></div>
          </div>
        )}

        {!loading && !err && searched && center && (
          <>
            <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}><Emoji e="📍"/> {center.shortName} 주변</div>
              <div style={{ ...muted, fontSize: 12, marginTop: 2 }}>{center.name}</div>
              <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>
                위도 {center.lat.toFixed(5)} · 경도 {center.lon.toFixed(5)} · 반경 {fmtDist(radius)} · {list.length}곳
              </div>
            </div>

            {list.length === 0 ? (
              <div style={{ ...muted, padding: 8 }}>이 반경 안에서 위키백과 문서를 찾지 못했어요. 반경을 넓히거나 다른 장소로 시도해 보세요.</div>
            ) : (
              list.map((n) => (
                <div key={`${n.lang}-${n.pageid}-${n.title}`} style={card}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-word' }}>{n.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600 }}>{fmtDist(n.dist)}</span>
                    {n.lang === 'en' && <span style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 5px' }}>EN</span>}
                  </div>
                  <div style={{ ...muted, fontSize: 11, marginTop: 3 }}>위도 {n.lat.toFixed(4)} · 경도 {n.lon.toFixed(4)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <a href={wikiUrl(n)} target="_blank" rel="noopener noreferrer"><button className="minibtn"><Emoji e="📖"/> 위키 문서</button></a>
                    <a href={osmLink(n.lat, n.lon)} target="_blank" rel="noopener noreferrer"><button className="minibtn"><Emoji e="🗺️"/> 지도</button></a>
                    <button className="minibtn" onClick={() => copy(`${n.title} (${center.shortName}에서 ${fmtDist(n.dist)})\n위도 ${n.lat}, 경도 ${n.lon}\n${wikiUrl(n)}`, '복사했어요')}><Emoji e="📋"/> 복사</button>
                    <button
                      className="linkbtn"
                      style={linkbtn}
                      onClick={() => saveToLibrary(n)}
                      title="이 장소를 공유 장소 라이브러리에 저장(설정집 등에서 사용)"
                    >
                      <Emoji e="🔗"/> 라이브러리
                    </button>
                    <button
                      className="linkbtn"
                      style={linkbtn}
                      onClick={() => saveToProject(n)}
                      disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '이 장소를 프로젝트 바인더(자료 › 장소)에 setting 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
                    >
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {toast && <div style={{ padding: '6px 12px', fontSize: 12.5, color: 'var(--ok)', flexShrink: 0 }}>{toast}</div>}

      <div className="license-note" style={licenseNote}>
        <span className="license-badge" style={{ display: 'inline-block', fontSize: 10.5, padding: '1px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--paper)', marginRight: 6 }}>출처·라이선스</span>
        주변 문서: <a href="https://ko.wikipedia.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>위키백과</a> GeoSearch(CC BY-SA) · 좌표·지명: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>OpenStreetMap</a> 기여자(ODbL) · 검색: Nominatim
        {libPlaces.length ? <span style={{ marginLeft: 8 }}>· 장소 라이브러리 {libPlaces.length}개</span> : null}
      </div>
    </div>
  )
}
