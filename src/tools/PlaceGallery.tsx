// 장소 갤러리 — 공유 라이브러리('places')에 모인 장소들을 이미지·이름·분위기 카드로 한눈에 펼쳐
//   둘러보고, 카드를 눌러 상세(역사·규칙·오감·메모)를 보고, "🗺️ 배경 설정집으로" 보내 이어쓴다.
// 장소는 배경 설정집 등에서 '🔗 라이브러리에 저장'을 누르면 공유 라이브러리에 쌓인다.
//   이 갤러리는 그 장소들을 읽기(useLibraryList) 전용으로 보여주는 진열장이다(편집은 설정집에서).
// 저작권: 표시되는 이미지는 라이브러리에 저장될 때 출처·라이선스가 함께 보관된 것만(생성형/PD/CC0/명시 라이선스).
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지). 외부 API·네트워크 없음(완전 로컬).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  Emoji,
  emojify,
  type SharedPlace,
} from './linkbus'

export const meta = { id: 'place-gallery', name: '장소 갤러리', icon: '🏞️', group: '구상·정리', intro: '라이브러리에 모은 장소들을 분위기 카드로 둘러보세요', w: 640, h: 620 }

// 프로젝트 본문(HTML)에 들어갈 텍스트는 &,<,> 를 반드시 escape.
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 보기 방식 — localStorage 영속.
type ViewMode = 'grid' | 'list'
type SortMode = 'recent' | 'name' | 'kind'

const LS_KEY = 'sry:tool:place-gallery'

interface Persisted { view: ViewMode; sort: SortMode }
const DEFAULTS: Persisted = { view: 'grid', sort: 'recent' }

function loadPrefs(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      view: p.view === 'list' ? 'list' : 'grid',
      sort: p.sort === 'name' || p.sort === 'kind' ? p.sort : 'recent',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

// 유형 → 대표 이모지(이미지 없는 장소 카드의 플레이스홀더용). 알 수 없으면 기본.
const KIND_ICON: Record<string, string> = {
  '도시': '🏙️', '마을': '🏘️', '건물': '🏛️', '자연': '🌲', '지하·던전': '🕳️',
  '왕국·국가': '🏰', '이세계·차원': '🌌', '바다·하늘': '🌊', '기타': '📍',
}
const iconFor = (kind?: string) => (kind && KIND_ICON[kind]) || '🏞️'

// 한 장소를 사람이 읽는 텍스트(상세 복사용)로 직렬화.
function placeToText(p: SharedPlace): string {
  const L: string[] = []
  L.push(`# ${p.name || '(이름 없는 장소)'}`)
  if (p.kind) L.push(`유형: ${p.kind}`)
  if (p.mood?.trim()) L.push(`\n[분위기]\n${p.mood.trim()}`)
  if (p.history?.trim()) L.push(`\n[역사]\n${p.history.trim()}`)
  if (p.rules?.trim()) L.push(`\n[규칙·관습]\n${p.rules.trim()}`)
  if (p.sensory?.trim()) L.push(`\n[오감 묘사]\n${p.sensory.trim()}`)
  if (p.notes?.trim()) L.push(`\n[메모·사건]\n${p.notes.trim()}`)
  if (p.image?.trim()) L.push(`\n[이미지]\n${p.image.trim()}${p.imageCredit?.trim() ? `\n출처: ${p.imageCredit.trim()}` : ''}`)
  return L.join('\n')
}

// 장소 상세 → 프로젝트 본문 HTML.
function placeToHtml(p: SharedPlace, imgOk: boolean): string {
  const rows: string[] = []
  if (p.image?.trim() && imgOk) rows.push(`<p><img src="${esc(p.image)}" alt="${esc(p.name)}" /></p>`)
  rows.push(`<p><b>유형:</b> ${esc(p.kind || '미지정')}</p>`)
  if (p.mood?.trim()) rows.push(`<p><b>분위기:</b> ${esc(p.mood.trim())}</p>`)
  if (p.history?.trim()) rows.push(`<p><b>역사:</b> ${esc(p.history.trim())}</p>`)
  if (p.rules?.trim()) rows.push(`<p><b>규칙·관습:</b> ${esc(p.rules.trim())}</p>`)
  if (p.sensory?.trim()) rows.push(`<p><b>오감 묘사:</b> ${esc(p.sensory.trim())}</p>`)
  if (p.notes?.trim()) rows.push(`<p><b>메모·사건:</b> ${esc(p.notes.trim())}</p>`)
  if (p.imageCredit?.trim()) rows.push(`<p><b>이미지 출처:</b> ${esc(p.imageCredit.trim())}</p>`)
  if (p.source) rows.push(`<p><b>출처:</b> ${esc(p.source)}</p>`)
  return rows.join('\n')
}

export default function PlaceGallery({ payload }: { payload?: Record<string, unknown> }) {
  const places = useLibraryList('places')

  const [prefs, setPrefs] = useState<Persisted>(() => loadPrefs())
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('') // '' = 전체
  const [openId, setOpenId] = useState<string>('')          // 상세 오버레이 대상 id
  const [brokenImgs, setBrokenImgs] = useState<Record<string, boolean>>({}) // 깨진 이미지 url 집합
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const noteTimer = useRef<number | null>(null)

  // 외부 도구가 검색어를 함께 열어준 경우(예: 설정집의 장소명) 1회 반영.
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    const q = payload && typeof payload.query === 'string' ? (payload.query as string) : ''
    if (q) { payloadDone.current = true; setQuery(q) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 보기/정렬 설정 영속.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)) } catch { /* 저장 차단/용량초과 무시 */ }
  }, [prefs])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, 2000)
  }

  const markBroken = (url: string) => {
    if (!url) return
    setBrokenImgs((prev) => (prev[url] ? prev : { ...prev, [url]: true }))
  }
  const isBroken = (url?: string) => !!url && !!brokenImgs[url]

  // 라이브러리에 존재하는 유형 목록(필터 칩용).
  const kinds = useMemo(() => {
    const set = new Set<string>()
    places.forEach((p) => { if (p.kind && p.kind.trim()) set.add(p.kind.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [places])

  // 선택된 유형이 사라지면(장소 삭제 등) 전체로 보정.
  useEffect(() => {
    if (kindFilter && !kinds.includes(kindFilter)) setKindFilter('')
  }, [kinds, kindFilter])

  // 검색·필터·정렬 적용.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = places.filter((p) => {
      if (kindFilter && (p.kind || '') !== kindFilter) return false
      if (!q) return true
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.kind || '').toLowerCase().includes(q) ||
        (p.mood || '').toLowerCase().includes(q) ||
        (p.sensory || '').toLowerCase().includes(q) ||
        (p.history || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q)
      )
    })
    arr = arr.slice()
    if (prefs.sort === 'name') arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
    else if (prefs.sort === 'kind') arr.sort((a, b) => (a.kind || '힣').localeCompare(b.kind || '힣', 'ko') || (a.name || '').localeCompare(b.name || '', 'ko'))
    else arr.sort((a, b) => (b.updated || 0) - (a.updated || 0)) // recent
    return arr
  }, [places, query, kindFilter, prefs.sort])

  // 상세 대상 장소가 사라지면 오버레이 닫기.
  const openPlace = openId ? places.find((p) => p.id === openId) || null : null
  useEffect(() => {
    if (openId && !places.some((p) => p.id === openId)) setOpenId('')
  }, [openId, places])

  // Esc 로 상세 닫기.
  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId('') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  // ── 연계: 배경 설정집으로 ──
  // 장소는 이미 공유 라이브러리에 있으므로 설정집의 '📥 라이브러리에서 가져오기'에 그대로 나타난다.
  // 더해 이미지/이름을 payload 로 전달 → 설정집이 현재/새 장소에 이미지를 graceful 하게 첨부할 수 있다.
  // 이 갤러리가 가진 장소 값을 정규 장소 키로 1:1 매핑한 fields 를 만든다(받는 허브가 제자리에 넣도록).
  // 정규 키: name, kind, atmosphere, appearance, sensory, geography, climate, history, culture,
  //          inhabitants, rules, dangers, landmarks, secrets, notes. (mood→atmosphere)
  // 이미 정규화된 p.fields 가 있으면 보존하고, 알려진 값을 덮어쓰지 않게 추가만 한다.
  const placeFields = (p: SharedPlace): Record<string, string> => {
    const f: Record<string, string> = { ...(p.fields || {}) }
    const put = (k: string, v?: string) => { if (!f[k] && v && v.trim()) f[k] = v.trim() }
    put('name', p.name)
    put('kind', p.kind)
    put('atmosphere', p.mood)
    put('sensory', p.sensory)
    put('history', p.history)
    put('rules', p.rules)
    put('notes', p.notes)
    return f
  }

  const sendToSettingBible = (p: SharedPlace) => {
    const useImg = p.image?.trim() && !isBroken(p.image)
    openToolLinked('setting-bible', {
      name: p.name,
      query: p.name,
      ...(useImg ? { image: p.image, imageCredit: p.imageCredit || '', mood: p.mood || '' } : {}),
      fields: placeFields(p), // 정규 장소 키 매핑(받는 설정집이 기본 칸에 바로 채움)
      place: p, // 향후 설정집이 place 페이로드를 직접 소비할 경우 대비(현재는 라이브러리 경유)
    })
    flash('🗺️ 배경 설정집을 열었어요. ‘라이브러리에서 가져오기’에서 이 장소를 추가하세요.')
  }

  // ── 연계: 프로젝트 자료(장소)로 ──
  const sendToProject = (p: SharedPlace) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '장소',
      title: p.name || '장소',
      bodyHtml: placeToHtml(p, !isBroken(p.image)),
      meta: {
        ...(p.kind ? { 유형: p.kind } : {}),
        ...(p.mood?.trim() ? { 분위기: p.mood.trim().replace(/\s+/g, ' ').slice(0, 80) } : {}),
        ...(p.image?.trim() && !isBroken(p.image) ? { 이미지: '있음' } : {}),
      },
    })
    flash(id ? '📄 프로젝트 자료(장소)에 추가했어요' : '프로젝트에 추가하지 못했어요')
  }

  // ── 연계: 수집함에 담기(이미지가 있으면 이미지, 없으면 메모) ──
  const stash = (p: SharedPlace) => {
    if (!hasStash()) { flash('수집함을 사용할 수 없어요'); return }
    const useImg = p.image?.trim() && !isBroken(p.image)
    if (useImg) {
      addToStash({ kind: 'image', label: p.name || '장소 이미지', url: p.image, credit: p.imageCredit || undefined })
    } else {
      addToStash({ kind: 'note', label: p.name || '장소', text: placeToText(p) })
    }
    flash('🧺 수집함에 담았어요')
  }

  // 상세 텍스트 클립보드 복사(미지원/실패 graceful).
  const copyDetail = async (p: SharedPlace) => {
    const text = placeToText(p)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('📋 장소 내용을 복사했어요')
    } catch {
      flash('복사에 실패했어요. 직접 선택해 복사하세요.')
    }
  }

  // ── 스타일(인라인 + CSS 변수) ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, position: 'relative' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const search: React.CSSProperties = { flex: 1, minWidth: 140, padding: '8px 11px', fontSize: 13, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const chip = (active: boolean): React.CSSProperties => ({
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--muted)',
    cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap',
  })
  const selectStyle: React.CSSProperties = { padding: '6px 8px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }
  const listCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
  const cardBase: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--panel)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', lineHeight: 1.75, padding: 28, gap: 14, minHeight: 240 }
  const badge: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' }
  const placeholder: React.CSSProperties = { width: '100%', aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: 'var(--chrome-2)', color: 'var(--muted)' }

  // 그리드 카드 한 장.
  const renderGridCard = (p: SharedPlace) => {
    const showImg = p.image?.trim() && !isBroken(p.image)
    return (
      <div
        key={p.id}
        style={cardBase}
        onClick={() => setOpenId(p.id)}
        title={`${p.name || '(이름 없는 장소)'} — 자세히 보기`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(p.id) } }}
      >
        {showImg ? (
          <img
            src={p.image}
            alt={p.name || '장소'}
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', background: 'var(--chrome-2)' }}
            loading="lazy"
            onError={() => markBroken(p.image!)}
          />
        ) : (
          <div style={placeholder}><Emoji e={iconFor(p.kind)} /></div>
        )}
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.name ? 'var(--text)' : 'var(--muted)' }}>
            {p.name || '(이름 없는 장소)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={badge}><Emoji e={iconFor(p.kind)} /> {p.kind || '미지정'}</span>
          </div>
          {p.mood?.trim() && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {p.mood.trim()}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 리스트 행 한 줄.
  const renderListRow = (p: SharedPlace) => {
    const showImg = p.image?.trim() && !isBroken(p.image)
    return (
      <div
        key={p.id}
        style={{ ...cardBase, flexDirection: 'row', alignItems: 'stretch' }}
        onClick={() => setOpenId(p.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(p.id) } }}
      >
        {showImg ? (
          <img src={p.image} alt={p.name || '장소'} style={{ width: 92, minWidth: 92, alignSelf: 'stretch', objectFit: 'cover', background: 'var(--chrome-2)' }} loading="lazy" onError={() => markBroken(p.image!)} />
        ) : (
          <div style={{ width: 92, minWidth: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'var(--chrome-2)', color: 'var(--muted)' }}><Emoji e={iconFor(p.kind)} /></div>
        )}
        <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.name ? 'var(--text)' : 'var(--muted)' }}>{p.name || '(이름 없는 장소)'}</span>
            <span style={badge}>{p.kind || '미지정'}</span>
          </div>
          {p.mood?.trim() && (
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.mood.trim()}</div>
          )}
        </div>
      </div>
    )
  }

  // 상세 한 섹션(라벨 + 내용).
  const detailSection = (icon: string, label: string, value?: string) => {
    if (!value?.trim()) return null
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Emoji e={icon} /> {label}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value.trim()}</div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={titleStyle}><Emoji e="🏞️" /> 장소 갤러리</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{places.length}곳</span>
        <span style={{ flex: 1 }} />
        <input
          style={search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 이름·유형·분위기·묘사 검색"
          aria-label="장소 검색"
        />
        {query && <button className="minibtn" onClick={() => setQuery('')} title="검색어 지우기">✕</button>}
      </div>

      {places.length > 0 && (
        <div style={toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <button style={chip(!kindFilter)} onClick={() => setKindFilter('')}>전체</button>
            {kinds.map((k) => (
              <button key={k} style={chip(kindFilter === k)} onClick={() => setKindFilter(kindFilter === k ? '' : k)}>
                <Emoji e={iconFor(k)} /> {k}
              </button>
            ))}
          </div>
          <select
            style={selectStyle}
            value={prefs.sort}
            onChange={(e) => setPrefs((s) => ({ ...s, sort: e.target.value as SortMode }))}
            aria-label="정렬"
            title="정렬 방식"
          >
            <option value="recent">최근 추가순</option>
            <option value="name">이름순</option>
            <option value="kind">유형순</option>
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={chip(prefs.view === 'grid')} onClick={() => setPrefs((s) => ({ ...s, view: 'grid' }))} title="격자 보기">▦</button>
            <button style={chip(prefs.view === 'list')} onClick={() => setPrefs((s) => ({ ...s, view: 'list' }))} title="목록 보기">☰</button>
          </div>
        </div>
      )}

      <div style={scroll}>
        {places.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontSize: 44 }}><Emoji e="🏞️" /></div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>아직 진열할 장소가 없어요</div>
            <div style={{ fontSize: 13 }}>
              장소는 <b>공유 라이브러리</b>에 모입니다.<br />
              <b>배경 설정집</b>에서 장소를 만든 뒤<br />
              <b><Emoji e="🔗" /> 라이브러리에 저장</b>을 누르면<br />
              이곳에 카드로 나타나요.
            </div>
            <button className="btn-primary" onClick={() => openToolLinked('setting-bible')}><Emoji e="🗺️" /> 배경 설정집 열기</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontSize: 38 }}><Emoji e="🔍" /></div>
            <div style={{ fontSize: 14 }}>
              {query.trim() ? `‘${query.trim()}’에 맞는 장소가 없어요.` : '이 유형의 장소가 없어요.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {query && <button className="minibtn" onClick={() => setQuery('')}>검색어 지우기</button>}
              {kindFilter && <button className="minibtn" onClick={() => setKindFilter('')}>유형 필터 해제</button>}
            </div>
          </div>
        ) : (
          <div style={prefs.view === 'grid' ? grid : listCol}>
            {filtered.map((p) => (prefs.view === 'grid' ? renderGridCard(p) : renderListRow(p)))}
          </div>
        )}
      </div>

      {/* 하단 안내/토스트 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
        <span style={{ flex: 1 }}>카드를 누르면 상세를 보고, 거기서 <b>배경 설정집·프로젝트·수집함</b>으로 보낼 수 있어요.</span>
        {note && <span style={{ color: 'var(--ok)', flexShrink: 0 }}>{emojify(note)}</span>}
      </div>

      {/* ── 상세 오버레이 ── */}
      {openPlace && (
        <div
          onClick={() => setOpenId('')}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 5 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 460, maxHeight: '100%', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.35)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <Emoji e={iconFor(openPlace.kind)} /> {openPlace.name || '(이름 없는 장소)'}
              </span>
              <button className="minibtn" onClick={() => setOpenId('')} title="닫기 (Esc)">✕</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {openPlace.image?.trim() && !isBroken(openPlace.image) ? (
                <div>
                  <img
                    src={openPlace.image}
                    alt={openPlace.name || '장소'}
                    style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }}
                    onError={() => markBroken(openPlace.image!)}
                  />
                  {openPlace.imageCredit?.trim() && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      <span className="license-badge" style={{ display: 'inline-block', fontSize: 10, padding: '1px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--chrome-2)', marginRight: 6 }}>출처·라이선스</span>
                      {openPlace.imageCredit.trim()}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...placeholder, aspectRatio: 'auto', height: 120, borderRadius: 10, border: '1px solid var(--border)' }}><Emoji e={iconFor(openPlace.kind)} /></div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={badge}><Emoji e={iconFor(openPlace.kind)} /> {openPlace.kind || '유형 미지정'}</span>
                {openPlace.source && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {openPlace.source}</span>}
              </div>

              {detailSection('🌫️', '분위기', openPlace.mood)}
              {detailSection('📜', '역사', openPlace.history)}
              {detailSection('⚖️', '규칙·관습', openPlace.rules)}
              {detailSection('🖐️', '오감 묘사', openPlace.sensory)}
              {detailSection('⭐', '메모·사건', openPlace.notes)}

              {!openPlace.mood?.trim() && !openPlace.history?.trim() && !openPlace.rules?.trim() && !openPlace.sensory?.trim() && !openPlace.notes?.trim() && (
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>아직 적힌 설정이 없어요. 배경 설정집에서 분위기·역사·규칙 등을 채워보세요.</div>
              )}
            </div>

            {/* 상세 하단 연계 버튼 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center' }}>
              <button className="btn-primary linkbtn" onClick={() => sendToSettingBible(openPlace)}><Emoji e="🗺️" /> 배경 설정집으로</button>
              <button className="minibtn linkbtn" onClick={() => sendToProject(openPlace)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? "프로젝트 자료 ‘장소’ 폴더에 추가" : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 프로젝트에</button>
              {hasStash() && <button className="minibtn linkbtn" onClick={() => stash(openPlace)} title="수집함에 담기"><Emoji e="🧺" /> 수집함</button>}
              <button className="minibtn" onClick={() => copyDetail(openPlace)} title="이 장소 내용을 복사"><Emoji e="📋" /> 복사</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
