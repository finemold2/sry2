// 세계 지도 장소 탐색 — 키 불필요·CORS 허용 공개 API로 장소를 검색하고 지도를 미리본다.
//  · 장소 검색: Nominatim(OpenStreetMap) https://nominatim.openstreetmap.org/search?format=json&q=… (키 없음·CORS)
//    → 결과의 위도/경도/표시명을 받아온다. 브라우저에서 User-Agent 헤더는 설정할 수 없으니 그냥 fetch 한다.
//  · 지도 표시: 받은 좌표로 OpenStreetMap 임베드(export/embed.html?bbox=…&marker=lat,lon)를 <iframe> 으로 띄운다.
//  · 용도: 작품의 무대를 실제 지형으로 답사·취재(배경 자료). 지도·지명 데이터는 © OpenStreetMap 기여자(ODbL).
//  · 연계: 선택한 장소를 setting 카드(자료 › 장소)로 프로젝트에 추가하거나, 공유 장소 라이브러리에 저장한다.
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

export const meta = { id: 'map-explorer', name: '세계 지도 탐색', icon: '🗺️', group: '리서치·자료', intro: '실제 장소를 검색해 지도로 답사하고 무대 자료로 옮기세요', w: 720, h: 620 }

// 본문 HTML 에 들어갈 텍스트의 &,<,> 이스케이프(프로젝트 저장용).
const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Hit {
  id: string
  name: string        // display_name (표시명)
  shortName: string   // name 또는 표시명 첫 토막
  lat: number
  lon: number
  type: string        // class/type 결합(예: place·city)
  bbox?: [number, number, number, number] // [south, north, west, east] (Nominatim boundingbox 순서)
}

// 첫 검색 비어 있을 때 영감을 주는 예시(실제 장소).
const SEEDS = ['파리', '교토', '이스탄불', '아이슬란드 레이캬비크', '사하라 사막', '베네치아', '에든버러', '제주도', '마추픽추', '프라하']

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Nominatim 한 건을 Hit 로 정규화. 좌표가 숫자가 아니면 null.
function toHit(r: any): Hit | null {
  const lat = parseFloat(r?.lat)
  const lon = parseFloat(r?.lon)
  if (!isFinite(lat) || !isFinite(lon)) return null
  const display = typeof r?.display_name === 'string' ? r.display_name : ''
  const short = typeof r?.name === 'string' && r.name.trim() ? r.name.trim() : (display.split(',')[0] || '').trim()
  let bbox: Hit['bbox']
  if (Array.isArray(r?.boundingbox) && r.boundingbox.length === 4) {
    const b = r.boundingbox.map((x: any) => parseFloat(x))
    if (b.every((n: number) => isFinite(n))) bbox = [b[0], b[1], b[2], b[3]]
  }
  const cls = typeof r?.class === 'string' ? r.class : ''
  const typ = typeof r?.type === 'string' ? r.type : ''
  return {
    id: (r?.place_id != null ? String(r.place_id) : uid()),
    name: display || short || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    shortName: short || display || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat, lon,
    type: [cls, typ].filter(Boolean).join('·'),
    bbox,
  }
}

// 좌표(+선택적 bbox)로 OpenStreetMap 임베드 iframe URL 구성.
// bbox 순서: 임베드는 ?bbox=minLon,minLat,maxLon,maxLat 를 기대(west,south,east,north).
function embedSrc(h: Hit): string {
  let west: number, south: number, east: number, north: number
  if (h.bbox) {
    const [bs, bn, bw, be] = h.bbox // [south, north, west, east]
    south = Math.min(bs, bn); north = Math.max(bs, bn)
    west = Math.min(bw, be); east = Math.max(bw, be)
    // 너무 큰 영역이면(국가 전체 등) 마커가 점이 되어버리지 않게 그대로 두되, 너무 작으면 약간 패딩.
    if (east - west < 0.01) { west -= 0.02; east += 0.02 }
    if (north - south < 0.01) { south -= 0.02; north += 0.02 }
  } else {
    const pad = 0.05
    west = h.lon - pad; east = h.lon + pad
    south = h.lat - pad; north = h.lat + pad
  }
  const bboxStr = `${west},${south},${east},${north}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bboxStr)}&layer=mapnik&marker=${h.lat},${h.lon}`
}

// 외부에서 큰 지도로 열어 보는 링크.
function osmLink(h: Hit): string {
  return `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=12/${h.lat}/${h.lon}`
}

export default function MapExplorer({ payload }: { payload?: Record<string, unknown> }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [searched, setSearched] = useState(false)
  const [sel, setSel] = useState<Hit | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapErr, setMapErr] = useState(false)
  const [notes, setNotes] = useState('')      // 답사 메모(선택 장소에 대한 사용자 메모)
  const [toast, setToast] = useState('')

  const libPlaces = useLibraryList('places')

  const mounted = useRef(true)
  const searchNonce = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const payloadDone = useRef(false)
  const mapTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      searchNonce.current++ // 진행 중 검색 응답 무효화
      if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null }
      if (mapTimer.current) { clearTimeout(mapTimer.current); mapTimer.current = null }
    }
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
  }

  const runSearch = async (term: string) => {
    const word = (term || '').trim()
    if (!word) { setResults([]); setSearched(false); setErr(''); return }
    const my = ++searchNonce.current
    setLoading(true); setErr(''); setSearched(true)
    try {
      // 키 불필요·CORS 허용·https. addressdetails 없이 가벼운 검색. 한국어 우선 표기.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=12&accept-language=ko&q=${encodeURIComponent(word)}`
      const r = await fetch(url)
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      if (my !== searchNonce.current || !mounted.current) return
      const hits = (Array.isArray(j) ? j : []).map(toHit).filter((h): h is Hit => !!h)
      setResults(hits)
      if (hits.length) selectHit(hits[0]) // 첫 결과를 자동으로 지도에 표시
    } catch {
      if (my === searchNonce.current && mounted.current) {
        setErr('검색에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.')
        setResults([])
      }
    } finally {
      if (my === searchNonce.current && mounted.current) setLoading(false)
    }
  }

  // 결과 선택 → 지도 표시. 메모는 장소가 바뀌면 비운다.
  const selectHit = (h: Hit) => {
    setSel(h)
    setNotes('')
    setMapErr(false)
    setMapLoading(true)
    // iframe onError 가 모든 브라우저에서 신뢰되지 않으므로, 로딩 표시는 타임아웃으로 거둔다.
    if (mapTimer.current) clearTimeout(mapTimer.current)
    mapTimer.current = window.setTimeout(() => { if (mounted.current) setMapLoading(false) }, 1500)
  }

  const randomSeed = () => {
    const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]
    setQ(s); runSearch(s)
  }

  // payload.query 로 열리면(다른 도구가 장소명을 넘겨준 경우) 그 장소를 1회 검색.
  useEffect(() => {
    if (payloadDone.current) return
    const fromPlace = payload && typeof (payload as any).place === 'object' && (payload as any).place
      ? String((payload as any).place?.name || '')
      : ''
    const initial = (payload && typeof payload.query === 'string' && payload.query.trim())
      ? payload.query.trim()
      : fromPlace
    payloadDone.current = true
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

  // 선택 장소 → SharedPlace(라이브러리 저장용).
  const toShared = (h: Hit): Omit<SharedPlace, 'updated'> => {
    const nm = h.shortName || '(이름 없는 장소)'
    const kd = h.type || '실제 장소'
    const geo = `위도 ${h.lat.toFixed(5)}, 경도 ${h.lon.toFixed(5)}${h.name && h.name !== nm ? ` (${h.name})` : ''}`
    const nt = [h.name, notes.trim()].filter(Boolean).join('\n\n')
    // 정규 장소 필드(name, kind, geography, notes) — 받는 허브에서 기본 칸에 들어가도록 표준 키로 매핑.
    const fields: Record<string, string> = { name: nm, kind: kd, geography: geo }
    if (nt) fields.notes = nt
    return {
      id: uid(),
      name: nm,
      kind: kd,
      notes: nt,
      fields,
      source: `OpenStreetMap (위도 ${h.lat.toFixed(5)}, 경도 ${h.lon.toFixed(5)}) · © OpenStreetMap 기여자, ODbL`,
    }
  }

  // 공유 장소 라이브러리에 저장.
  const saveToLibrary = () => {
    if (!sel) return
    addToLibrary('places', toShared(sel))
    flash('장소를 라이브러리에 저장했어요')
  }

  // 프로젝트 바인더(자료 › 장소)에 setting 카드로 추가.
  const saveToProject = () => {
    if (!sel || !hasProjectBridge()) return
    const name = sel.shortName || '(이름 없는 장소)'
    const coord = `위도 ${sel.lat.toFixed(5)}, 경도 ${sel.lon.toFixed(5)}`
    const note = notes.trim()

    // setting 카드 필드맵: name, location, type, notes (+ 정규 장소키 geography/kind 추가)
    const character: Record<string, string> = {
      name,
      location: sel.name,        // 전체 표시명(상세 위치)
      geography: `${coord}${sel.name && sel.name !== name ? ` · ${sel.name}` : ''}`, // 정규: 지형/위치
    }
    if (sel.type) { character.type = sel.type; character.kind = sel.type } // 종류/유형 → kind(정규)
    const noteParts: string[] = [`좌표: ${coord}`]
    if (note) noteParts.push(note)
    noteParts.push('지도·지명 데이터 © OpenStreetMap 기여자 (ODbL)')
    character.notes = noteParts.join('\n\n')

    // 본문 HTML — 위치·좌표·메모·지도 링크·출처.
    const body: string[] = []
    body.push(`<p><strong>${esc(name)}</strong></p>`)
    body.push(`<p>${esc(sel.name)}</p>`)
    body.push(`<p>${esc(coord)}</p>`)
    if (note) body.push(`<p>${esc(note).replace(/\n/g, '<br>')}</p>`)
    body.push(`<p><a href="${esc(osmLink(sel))}">OpenStreetMap에서 지도 보기 →</a></p>`)
    body.push(`<p><em>지도·지명 데이터 © OpenStreetMap 기여자 (ODbL)</em></p>`)

    const id = addToProject({
      kind: 'setting',
      folder: '장소',
      title: name,
      character,
      bodyHtml: body.join('\n'),
      meta: {
        위치: sel.name.length > 80 ? sel.name.slice(0, 79) + '…' : sel.name,
        좌표: coord,
        출처: 'OpenStreetMap',
      },
    })
    flash(id ? '프로젝트에 장소 카드를 추가했어요' : '프로젝트 연동이 되어 있지 않아요')
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); runSearch(q) }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', minHeight: 0, fontSize: 14 }
  const formBar: React.CSSProperties = { display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }
  const body: React.CSSProperties = { flex: 1, display: 'flex', minHeight: 0 }
  const leftCol: React.CSSProperties = { width: '38%', minWidth: 180, maxWidth: 300, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--panel)', display: 'flex', flexDirection: 'column' }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }
  const muted: React.CSSProperties = { color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }
  const licenseNote: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'break-word' }
  const area: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 60, lineHeight: 1.55, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={formBar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="장소를 검색하세요 (예: 교토, 사하라 사막, 베네치아)"
          style={input}
          aria-label="장소 검색"
        />
        <button type="submit" className="btn-primary"><Emoji e="🔍" /> 검색</button>
        <button type="button" className="minibtn" onClick={randomSeed} title="예시 장소로 검색"><Emoji e="🔀" /> 예시</button>
      </form>

      <div style={body}>
        {/* 검색 결과 목록 */}
        <div style={leftCol}>
          {loading && <div style={{ padding: 14, ...muted }}>검색 중…</div>}
          {!loading && err && (
            <div style={{ padding: 14, ...muted }}>
              {err}
              <div style={{ marginTop: 10 }}><button className="minibtn" onClick={() => runSearch(q)}>다시 시도</button></div>
            </div>
          )}
          {!loading && !err && !searched && (
            <div style={{ padding: 14, ...muted }}>
              찾고 싶은 실제 장소를 검색해 보세요.<br />작품의 무대를 지도로 답사하고<br />무대 자료로 옮길 수 있어요.
              <div style={{ marginTop: 10 }}><button className="minibtn" onClick={randomSeed}><Emoji e="🔀" /> 예시로 시작</button></div>
            </div>
          )}
          {!loading && !err && searched && results.length === 0 && (
            <div style={{ padding: 14, ...muted }}>검색 결과가 없어요. 다른 이름으로 시도해 보세요.</div>
          )}
          {!loading && !err && results.map((h) => {
            const active = sel?.id === h.id
            return (
              <button
                key={h.id}
                onClick={() => selectHit(h)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, lineHeight: 1.4,
                  background: active ? 'var(--chrome-2)' : 'transparent', color: 'var(--text)',
                  borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="📍" /> {h.shortName}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 10.5, marginTop: 2 }}>
                  {h.type ? h.type + ' · ' : ''}{h.lat.toFixed(3)}, {h.lon.toFixed(3)}
                </div>
              </button>
            )
          })}
        </div>

        {/* 지도 + 상세 */}
        <div style={rightCol}>
          {!sel ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, padding: 24, ...muted }}>
              <div style={{ fontSize: 38 }}><Emoji e="🗺️" /></div>
              <div>왼쪽에서 장소를 검색해 고르면<br />여기에 지도가 표시됩니다.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
              {/* 제목/좌표 */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}><Emoji e="📍" /> {sel.shortName}</div>
                <div style={{ ...muted, fontSize: 12, marginTop: 2 }}>{sel.name}</div>
                <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>위도 {sel.lat.toFixed(5)} · 경도 {sel.lon.toFixed(5)}{sel.type ? ` · ${sel.type}` : ''}</div>
              </div>

              {/* 지도 iframe */}
              <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
                {mapErr ? (
                  <div style={{ padding: 24, textAlign: 'center', ...muted }}>
                    지도를 불러오지 못했어요.
                    <div style={{ marginTop: 10 }}>
                      <a href={osmLink(sel)} target="_blank" rel="noopener noreferrer"><button className="minibtn"><Emoji e="🔗" /> OpenStreetMap에서 열기</button></a>
                    </div>
                  </div>
                ) : (
                  <>
                    {mapLoading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...muted, fontSize: 13, background: 'var(--chrome-2)', zIndex: 1 }}>
                        지도 불러오는 중…
                      </div>
                    )}
                    <iframe
                      key={sel.id}
                      title={`${sel.shortName} 지도`}
                      src={embedSrc(sel)}
                      style={{ width: '100%', height: 320, border: 'none', display: 'block' }}
                      loading="lazy"
                      onLoad={() => { if (mounted.current) setMapLoading(false) }}
                      onError={() => { if (mounted.current) { setMapLoading(false); setMapErr(true) } }}
                    />
                  </>
                )}
              </div>

              {/* 지도 출처 표기(저작권) */}
              <div className="license-note" style={licenseNote}>
                <span className="license-badge" style={{ display: 'inline-block', fontSize: 10.5, padding: '1px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--chrome-2)', marginRight: 6 }}>출처·라이선스</span>
                지도·지명 데이터 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>OpenStreetMap</a> 기여자 · ODbL · 검색: Nominatim
              </div>

              {/* 답사 메모 */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}><Emoji e="✏️" /> 답사 메모</div>
                <textarea
                  style={area}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="이 장소에서 받은 인상, 작품 속 무대로 쓸 아이디어를 적어두세요…"
                  aria-label="답사 메모"
                />
              </div>

              {/* 액션·연계 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <button className="minibtn" onClick={() => copy(`${sel.shortName} (${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)})\n${sel.name}\n${osmLink(sel)}`, '복사했어요')}><Emoji e="📋" /> 정보 복사</button>
                <button className="minibtn" onClick={() => copy(`${sel.lat}, ${sel.lon}`, '좌표를 복사했어요')}><Emoji e="📐" /> 좌표 복사</button>
                <a href={osmLink(sel)} target="_blank" rel="noopener noreferrer"><button className="minibtn"><Emoji e="🔗" /> 큰 지도로 열기</button></a>
                <button
                  className="linkbtn"
                  style={linkbtn}
                  onClick={saveToLibrary}
                  title="이 장소를 공유 장소 라이브러리에 저장(설정집 등에서 사용)"
                >
                  <Emoji e="🔗" /> 장소 라이브러리에 저장{libPlaces.length ? ` (${libPlaces.length})` : ''}
                </button>
                <button
                  className="linkbtn"
                  style={linkbtn}
                  onClick={saveToProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '이 장소를 프로젝트 바인더(자료 › 장소)에 setting 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
                >
                  <Emoji e="📄" /> 프로젝트에 추가
                </button>
                {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
