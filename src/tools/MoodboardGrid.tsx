// 무드보드 그리드 — 키워드를 입력하면 Openverse(키 불필요·CORS 허용) 이미지 9장을 3×3 그리드로 모아
// 작품의 분위기를 한눈에 시각화한다. 로딩/실패/빈결과 graceful, 경쟁상태 방지(nonce ref), 언마운트 정리.
// 저작권 안전: CC0/퍼블릭도메인(pdm)만 요청하고, 각 타일에 제작자·라이선스를 표기한다.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

// HTML escape(&,<,>) — bodyHtml 안전화
function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const meta = { id: 'moodboard-grid', name: '무드보드', icon: '🧩', group: '분위기·시각', intro: '키워드로 이미지 9장을 모아 작품 분위기를 시각화', w: 460, h: 600 }

interface Pic { id: string; url: string; title: string; creator: string; source: string; license: string }

const SUGGESTIONS = ['비 내리는 도시 밤', '안개 낀 숲', '오래된 도서관', '겨울 바다', '네온 골목', '낡은 카페', '폐허가 된 성', '여름 들판']

// 라이선스 코드 → 사람이 읽는 표기(저작권 안전 자료만)
const LICENSE_LABEL: Record<string, string> = { cc0: 'CC0', pdm: 'Public Domain' }
function licenseLabel(code: string): string {
  const k = (code || '').toLowerCase()
  return LICENSE_LABEL[k] || (code ? code.toUpperCase() : 'CC0')
}

const TOOL_ID = 'moodboard-grid'

interface Props { payload?: Record<string, unknown> }

export default function MoodboardGrid({ payload }: Props = {}) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [pics, setPics] = useState<Pic[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  // [연계] 감정 색보정(query) → 즉시 검색 / 클리블랜드·메트 명화(image) → 보드 맨 앞에 카드 추가
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const s = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() : '')
    if (s('image')) {
      const pic: Pic = { id: 'linked:' + s('image'), url: s('image'), title: s('title') || '연계 이미지', creator: s('credit'), source: s('source'), license: s('license') || 'Public Domain' }
      setPics((prev) => (prev.some((x) => x.url === pic.url) ? prev : [pic, ...prev]))
      setSubmitted((prev) => prev || pic.title)
      setErr('')
    } else if (s('query') || s('q')) {
      const q = s('query') || s('q')
      setQuery(q); search(q)
    }
  }, [payload]) // eslint-disable-line
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [addedToProject, setAddedToProject] = useState(false)
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const search = async (q: string) => {
    const term = q.trim()
    if (!term) return
    const my = ++nonce.current
    setSubmitted(term)
    setLoading(true); setErr(''); setPics([]); setHidden({}); setSaved({}); setCopied(false); setAddedToProject(false)
    try {
      // 저작권 안전: CC0·퍼블릭도메인(pdm)만 요청
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}&license=cc0,pdm&page_size=9`)
      if (!r.ok) throw new Error('bad status ' + r.status)
      const j = await r.json()
      const list: Pic[] = (j.results || [])
        .filter((x: { url?: string }) => x && x.url)
        .map((x: { id?: string; url: string; title?: string; creator?: string; source?: string; license?: string }, i: number) => ({
          id: x.id || x.url || String(i),
          url: x.url,
          title: x.title || term,
          creator: x.creator || '작자 미상',
          source: x.source || 'Openverse',
          license: licenseLabel(x.license || 'cc0'),
        }))
      if (my !== nonce.current || !mounted.current) return
      setPics(list)
      if (!list.length) setErr('결과가 없습니다. 다른 키워드로 시도해 보세요.')
    } catch {
      if (my !== nonce.current || !mounted.current) return
      setErr('이미지를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current && mounted.current) setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search(query)
  }

  const copyList = () => {
    const visible = pics.filter((p) => !hidden[p.id])
    if (!visible.length) return
    const body = visible.map((p) => `• ${p.title} — ${p.creator} (${p.source}, ${p.license})\n  ${p.url}`).join('\n')
    const text = `무드보드: ${submitted}\n${body}`
    try {
      navigator.clipboard?.writeText(text).then(() => {
        if (!mounted.current) return
        setCopied(true)
        setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
      }).catch(() => {})
    } catch { /* 클립보드 미지원·권한 거부 무시 */ }
  }

  // 연계: 현재 무드보드 키워드 + 이미지 출처 목록을 프로젝트(무드보드 폴더) 메모로 저장
  const addProjectMemo = () => {
    const visible = pics.filter((p) => !hidden[p.id])
    if (!visible.length || !hasProjectBridge()) return
    const items = visible.map((p) =>
      `<li><b>${esc(p.title)}</b> — ${esc(p.creator)} (${esc(p.source)}, ${esc(p.license)})<br>` +
      `<a href="${esc(p.url)}" target="_blank" rel="noreferrer">${esc(p.url)}</a></li>`
    ).join('')
    const bodyHtml =
      `<p><b>무드보드 키워드:</b> ${esc(submitted)}</p>` +
      `<p>이미지 출처 (${visible.length}장 · Openverse, CC0/Public Domain):</p>` +
      `<ul>${items}</ul>`
    const id = addToProject({
      root: 'research',
      folder: '무드보드',
      title: `무드보드 · ${submitted}`,
      bodyHtml,
      meta: { 키워드: submitted, 이미지수: String(visible.length), 출처: 'Openverse (CC0/PD)' },
    })
    if (id && mounted.current) {
      setAddedToProject(true)
      setTimeout(() => { if (mounted.current) setAddedToProject(false) }, 1500)
    }
  }

  // 연계: 라이브러리(이미지)에 저장
  const saveToLibrary = (p: Pic) => {
    addToLibrary('images', {
      url: p.url,
      title: p.title,
      credit: `${p.creator} (${p.source})`,
      license: p.license,
      source: 'Openverse',
    })
    if (!mounted.current) return
    setSaved((s) => ({ ...s, [p.id]: true }))
    setTimeout(() => { if (mounted.current) setSaved((s) => ({ ...s, [p.id]: false })) }, 1500)
  }

  // 연계: 배경 설정집으로 이미지 보내기
  const sendToSettingBible = (p: Pic) => {
    openToolLinked('setting-bible', {
      image: {
        url: p.url,
        title: p.title,
        credit: `${p.creator} (${p.source})`,
        license: p.license,
        source: 'Openverse',
      },
    })
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const visiblePics = pics.filter((p) => !hidden[p.id])
  const related = TOOL_RELATIONS[TOOL_ID] || []
  const RELATED_LABEL: Record<string, string> = { 'setting-bible': '🗺️ 배경 설정집', 'cover-mockup': '📔 표지 목업', 'imagination-gallery': '🖼️ 상상 갤러리' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        키워드를 입력하면 관련 이미지 <b>9장</b>을 모아 작품의 분위기를 시각화합니다.
      </div>

      {/* 검색 입력 */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="예: 비 내리는 도시 밤"
          style={{
            flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 9, fontSize: 14,
            background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none',
          }}
        />
        <button className="btn-primary" onClick={() => search(query)} disabled={loading || !query.trim()}>
          {loading ? '검색 중…' : <><Emoji e="🔍"/> 모으기</>}
        </button>
      </div>

      {/* 추천 키워드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className="minibtn" onClick={() => { setQuery(s); search(s) }} disabled={loading}>{s}</button>
        ))}
      </div>

      {/* 그리드 영역 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 14 }}>
            <Emoji e="🧩"/> 이미지를 모으는 중…
          </div>
        )}

        {!loading && err && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: 16, lineHeight: 1.6 }}>
            {err}
          </div>
        )}

        {!loading && !err && !submitted && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16, lineHeight: 1.6 }}>
            키워드를 입력하거나 위 추천어를 눌러 무드보드를 만들어 보세요.
          </div>
        )}

        {!loading && !err && submitted && visiblePics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {visiblePics.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${p.title} — ${p.creator} (${p.source}, ${p.license})`}
                  style={{
                    position: 'relative', display: 'block', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden',
                    background: 'var(--chrome-2)', border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={p.url}
                    alt={p.title}
                    loading="lazy"
                    onError={() => setHidden((h) => ({ ...h, [p.id]: true }))}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* 라이선스 배지 */}
                  <span className="license-badge" style={{ position: 'absolute', left: 4, bottom: 4 }}>{p.license}</span>
                </a>
                {/* 제작자/라이선스 표기 */}
                <div className="license-note" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${p.creator} · ${p.license}`}>
                  {p.creator} · {p.license}
                </div>
                {/* 타일별 연계 버튼 */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="linkbtn"
                    style={{ flex: 1, justifyContent: 'center', padding: '2px 4px' }}
                    onClick={() => saveToLibrary(p)}
                    title="공유 라이브러리에 이미지로 저장"
                  >
                    {saved[p.id] ? '✓ 저장됨' : <><Emoji e="💾"/> 저장</>}
                  </button>
                  <button
                    className="linkbtn"
                    style={{ flex: 1, justifyContent: 'center', padding: '2px 4px' }}
                    onClick={() => sendToSettingBible(p)}
                    title="배경 설정집으로 이 이미지를 보냅니다"
                  >
                    <Emoji e="🗺️"/> 설정집
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 모든 이미지가 깨져 숨겨진 경우 */}
        {!loading && !err && submitted && pics.length > 0 && visiblePics.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: 16, lineHeight: 1.6 }}>
            표시할 수 있는 이미지가 없습니다. 다른 키워드로 시도해 보세요.
          </div>
        )}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button className="minibtn" onClick={() => search(submitted || query)} disabled={loading || (!submitted && !query.trim())}><Emoji e="🔄"/> 다시 모으기</button>
        <button className="minibtn" onClick={copyList} disabled={!visiblePics.length}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 목록 복사</>}</button>
        <button
          className="linkbtn"
          onClick={addProjectMemo}
          disabled={!visiblePics.length || !hasProjectBridge()}
          title={hasProjectBridge() ? '키워드와 이미지 출처 목록을 프로젝트(무드보드 폴더) 메모로 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}
        >
          {addedToProject ? '✓ 추가됨' : <><Emoji e="📄"/> 프로젝트에 추가</>}
        </button>
        {!!visiblePics.length && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{visiblePics.length}장 · Openverse(CC0/PD)</span>}
      </div>

      {/* 연계 도구 바 */}
      {related.length > 0 && (
        <div className="linkbar" style={{ flexShrink: 0 }}>
          <span className="linkbar-label">연계</span>
          {related.map((rid) => (
            <button key={rid} className="linkbtn" onClick={() => openToolLinked(rid)} title="관련 도구 열기">
              {emojify(RELATED_LABEL[rid] || rid)}
            </button>
          ))}
        </div>
      )}

      <div className="license-note" style={{ flexShrink: 0 }}>모두 퍼블릭도메인/CC0 이미지입니다(Openverse). 별도 표기 없이 자유롭게 활용할 수 있으나, 가능하면 제작자를 함께 적어 주세요.</div>
    </div>
  )
}
