// 집필 플레이리스트 — 분위기별로 저작권 안전한 음원을 모아 나만의 작업용 플레이리스트를 만든다.
// 저작권 안전: Openverse 오디오에서 license=cc0,pdm(퍼블릭도메인/CC0)만 검색·재생(키 불필요·https·CORS).
//   가사 등 저작권 텍스트는 표시하지 않고, 각 트랙에 제작자/라이선스/출처를 표기한다.
// 기능(거의 앱 한 벌): 분위기/직접 검색 → 큐에 추가, 순차 자동재생(다음 곡), 셔플·반복, 곡 제거·순서 변경(↑↓·드래그),
//   재생바(재생/일시정지·이전/다음·탐색·음량), 여러 개의 명명 플레이리스트, 전체 localStorage 영속.
// 연계(linkbus): 현재 곡을 수집함/스니펫/프로젝트 자료로, 음악 갤러리·배경 설정집 등으로 이동.
// 언마운트 시 오디오/타이머/리스너 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToStash, hasStash,
  addToLibrary,
  addToProject, hasProjectBridge,
  openToolLinked, TOOL_RELATIONS,
  Emoji, emojify,
  type SharedSnippet,
} from './linkbus'

// ── HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 외부 데이터를 안전하게 처리) ──
function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const meta = { id: 'playlist-builder', name: '집필 플레이리스트', icon: '🎧', group: '분위기·시각', intro: '저작권 안전(CC0/PD) 음악을 분위기별로 모아 순차 재생되는 나만의 작업용 플레이리스트를 만드세요', w: 560, h: 680 }

const LS_KEY = 'sry:tool:playlist-builder'

// ── 분위기 프리셋(검색어) ──
type Mood = { key: string; label: string; q: string }
const MOODS: Mood[] = [
  { key: 'calm', label: '🌙 잔잔·피아노', q: 'calm piano ambient' },
  { key: 'focus', label: '🎯 집중·로파이', q: 'lofi chill study beat' },
  { key: 'classical', label: '🎻 클래식', q: 'classical orchestra' },
  { key: 'cinematic', label: '🎬 영화·웅장', q: 'cinematic epic soundtrack' },
  { key: 'jazz', label: '🎷 재즈', q: 'jazz instrumental' },
  { key: 'nature', label: '🌊 자연·앰비언트', q: 'nature ambient soundscape' },
  { key: 'fantasy', label: '🧝 신비·판타지', q: 'fantasy medieval mystical' },
  { key: 'tense', label: '🩸 긴장·서스펜스', q: 'dark tension suspense drone' },
  { key: 'melancholy', label: '🌧 우수·쓸쓸', q: 'melancholy sad strings' },
  { key: 'adventure', label: '🏔 활기·모험', q: 'upbeat adventure folk' },
]

// ── 타입 ──
interface Track {
  id: string            // openverse 결과 id 또는 url 해시
  title: string
  creator: string
  license: string       // 표기용(CC0 / Public Domain)
  url: string           // 재생 가능한 오디오 파일 url
  landing: string       // 원본·라이선스 페이지
  mood?: string         // 추가될 때의 분위기 라벨
  duration?: number     // 초(메타에 있으면)
}
interface Playlist {
  id: string
  name: string
  tracks: Track[]
}
type RepeatMode = 'off' | 'all' | 'one'
interface Persisted {
  playlists: Playlist[]
  activeId: string
  shuffle: boolean
  repeat: RepeatMode
  volume: number
}

// ── 검색 결과(아직 큐에 안 들어간 후보) ──
interface SearchHit extends Track { _key: string }

function licenseLabel(lic: string): string {
  const l = (lic || '').toLowerCase()
  if (l === 'cc0') return 'CC0'
  if (l === 'pdm') return 'Public Domain'
  return (lic || '').toUpperCase() || 'CC'
}
function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m + ':' + (s < 10 ? '0' : '') + s
}
function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}
const isAudioUrl = (u: string) => typeof u === 'string' && /\.(mp3|ogg|wav|flac|oga|m4a)(\?|$)/i.test(u)

// ── localStorage 로드/저장 ──
function loadState(): Persisted {
  const fallback = (): Persisted => {
    const pl: Playlist = { id: uid('pl'), name: '내 플레이리스트', tracks: [] }
    return { playlists: [pl], activeId: pl.id, shuffle: false, repeat: 'off', volume: 0.8 }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback()
    const p = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(p.playlists) || !p.playlists.length) return fallback()
    const playlists = p.playlists.map((x) => ({
      id: x.id || uid('pl'),
      name: typeof x.name === 'string' ? x.name : '플레이리스트',
      tracks: Array.isArray(x.tracks) ? x.tracks.filter((t) => t && typeof t.url === 'string') : [],
    }))
    const activeId = playlists.some((x) => x.id === p.activeId) ? (p.activeId as string) : playlists[0].id
    const repeat: RepeatMode = p.repeat === 'all' || p.repeat === 'one' ? p.repeat : 'off'
    const volume = typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1 ? p.volume : 0.8
    return { playlists, activeId, shuffle: !!p.shuffle, repeat, volume }
  } catch {
    return fallback()
  }
}

// ── Openverse 오디오 검색(CC0/PDM 만) ──
async function searchAudio(q: string, signal: AbortSignal, page: number): Promise<SearchHit[]> {
  const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=20&page=${page}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const list: unknown[] = Array.isArray(j?.results) ? j.results : []
  const hits: SearchHit[] = []
  const seen = new Set<string>()
  for (const x of list) {
    const o = x as { id?: string; url?: string; title?: string; creator?: string; license?: string; foreign_landing_url?: string; duration?: number }
    if (!o.url || !isAudioUrl(o.url)) continue
    if (seen.has(o.url)) continue
    seen.add(o.url)
    hits.push({
      id: o.id || o.url,
      _key: o.id || o.url,
      title: (o.title || '무제 음원').trim(),
      creator: (o.creator || '작자 미상').trim(),
      license: licenseLabel(o.license || ''),
      url: o.url,
      landing: o.foreign_landing_url || '',
      duration: typeof o.duration === 'number' ? Math.round(o.duration / 1000) : undefined,
    })
  }
  return hits
}

// ── 현재 곡을 분위기 메모 본문 HTML 로(음원 파일은 넣지 않고 출처만 링크) ──
function trackBodyHtml(t: Track, plName: string): string {
  const parts: string[] = []
  parts.push('<p>🎧 <b>' + escHtml(t.title) + '</b></p>')
  parts.push('<p>🎙 ' + escHtml(t.creator) + ' · ' + escHtml(t.license) + (t.mood ? ' · ' + escHtml(t.mood) : '') + '</p>')
  parts.push('<p>플레이리스트: ' + escHtml(plName) + '</p>')
  if (t.landing) parts.push('<p>출처: <a href="' + escHtml(t.landing) + '">Openverse</a></p>')
  return parts.join('\n')
}
function playlistBodyHtml(pl: Playlist): string {
  const rows = pl.tracks.map((t, i) =>
    '<li>' + escHtml(t.title) + ' — ' + escHtml(t.creator) + ' (' + escHtml(t.license) + ')' +
    (t.landing ? ' · <a href="' + escHtml(t.landing) + '">출처</a>' : '') + '</li>',
  )
  return '<p>🎧 <b>' + escHtml(pl.name) + '</b> · 총 ' + pl.tracks.length + '곡 (모두 CC0/퍼블릭도메인)</p>\n<ol>' + rows.join('\n') + '</ol>'
}

const REL_LABEL: Record<string, string> = {
  'music-gallery': '🎵 음악 갤러리', 'setting-bible': '🏞 배경 설정집', 'scene-forge': '🎬 장면 생성기',
  'character-sheet': '🪪 인물 시트', 'sensory-palette': '🌫 감각 팔레트', 'soundscape-mixer': '🎚 사운드스케이프',
  'ambient-sound': '🎧 앰비언트',
}

export default function PlaylistBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const { playlists, activeId, shuffle, repeat, volume } = state
  const active = playlists.find((p) => p.id === activeId) || playlists[0]

  // 검색
  const [mood, setMood] = useState<Mood>(MOODS[0])
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const pageRef = useRef(1)
  const lastSearchRef = useRef('')
  const acRef = useRef<AbortController | null>(null)

  // 재생
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [curIdx, setCurIdx] = useState(-1)     // active.tracks 기준 현재 인덱스
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)
  const [playErr, setPlayErr] = useState('')
  const orderRef = useRef<number[]>([])        // 셔플 순서(원곡 인덱스 배열)
  const orderPosRef = useRef(0)

  // UI
  const [tab, setTab] = useState<'search' | 'queue'>('search')
  const [toast, setToast] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState(false)
  const flash = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1600) }, [])

  // ── 영속: 상태 변화 시 저장 ──
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* 용량 초과 등 무시 */ }
  }, [state])

  // ── 페이로드(다른 도구에서 곡/검색어를 들고 열림) ──
  useEffect(() => {
    if (!payload) return
    const q = typeof payload.query === 'string' ? payload.query : (typeof payload.mood === 'string' ? payload.mood : '')
    if (q) { setTab('search'); setQuery(q); window.setTimeout(() => runSearch(q, 1), 0) }
    const t = payload.track as Partial<Track> | undefined
    if (t && typeof t.url === 'string' && isAudioUrl(t.url)) {
      addTrack({
        id: t.id || t.url, title: t.title || '무제 음원', creator: t.creator || '작자 미상',
        license: licenseLabel(t.license || 'cc0'), url: t.url, landing: t.landing || '', mood: t.mood,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ── 검색 실행 ──
  const runSearch = useCallback(async (q: string, page: number) => {
    const term = q.trim()
    if (!term) return
    acRef.current?.abort()
    const ac = new AbortController(); acRef.current = ac
    setSearching(true); setSearchErr('')
    if (page === 1) { setHits([]); lastSearchRef.current = term }
    try {
      const res = await searchAudio(term, ac.signal, page)
      if (ac.signal.aborted) return
      pageRef.current = page
      setHits((prev) => (page === 1 ? res : [...prev, ...res.filter((r) => !prev.some((p) => p._key === r._key))]))
      if (page === 1 && !res.length) setSearchErr('재생 가능한 CC0/PD 음원을 찾지 못했습니다. 다른 분위기나 검색어를 시도해보세요.')
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      setSearchErr('검색에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      if (!ac.signal.aborted) setSearching(false)
    }
  }, [])

  // 분위기 선택 → 즉시 검색
  const pickMood = (m: Mood) => { setMood(m); setQuery(''); runSearch(m.q, 1) }
  // 처음 마운트 시 기본 분위기 검색(페이로드 없을 때만)
  useEffect(() => {
    if (payload && (payload.query || payload.mood || payload.track)) return
    runSearch(MOODS[0].q, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 큐 조작 ──
  const setActive = (patch: (pl: Playlist) => Playlist) => {
    setState((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === s.activeId ? patch(p) : p)) }))
  }
  const addTrack = (t: Track, label?: string) => {
    setState((s) => {
      const pl = s.playlists.find((p) => p.id === s.activeId)
      if (!pl) return s
      if (pl.tracks.some((x) => x.url === t.url)) { flash('이미 플레이리스트에 있는 곡입니다.'); return s }
      const moodLabel = t.mood || mood.label
      const nt: Track = { ...t, id: t.id || uid('trk'), mood: moodLabel }
      return { ...s, playlists: s.playlists.map((p) => (p.id === s.activeId ? { ...p, tracks: [...p.tracks, nt] } : p)) }
    })
    flash('“' + (label || t.title) + '” 추가됨')
  }
  const removeAt = (i: number) => {
    setActive((pl) => ({ ...pl, tracks: pl.tracks.filter((_, idx) => idx !== i) }))
    // 현재 재생 인덱스 보정
    setCurIdx((c) => (i === c ? -1 : i < c ? c - 1 : c))
    if (i === curIdx) stop()
  }
  const moveTrack = (from: number, to: number) => {
    if (to < 0) return
    setActive((pl) => {
      if (to >= pl.tracks.length) return pl
      const arr = [...pl.tracks]
      const [m] = arr.splice(from, 1)
      arr.splice(to, 0, m)
      return { ...pl, tracks: arr }
    })
    setCurIdx((c) => {
      if (c === from) return Math.min(to, active.tracks.length - 1)
      if (from < c && to >= c) return c - 1
      if (from > c && to <= c) return c + 1
      return c
    })
  }
  const clearQueue = () => {
    if (!active.tracks.length) return
    if (!window.confirm('현재 플레이리스트의 모든 곡을 비울까요?')) return
    stop()
    setActive((pl) => ({ ...pl, tracks: [] }))
  }

  // ── 셔플 순서 만들기 ──
  const buildOrder = useCallback((startIdx: number) => {
    const n = active.tracks.length
    if (n === 0) { orderRef.current = []; orderPosRef.current = 0; return }
    if (!shuffle) {
      orderRef.current = Array.from({ length: n }, (_, i) => i)
      orderPosRef.current = Math.max(0, startIdx)
      return
    }
    const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== startIdx)
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[rest[i], rest[j]] = [rest[j], rest[i]] }
    orderRef.current = startIdx >= 0 ? [startIdx, ...rest] : rest
    orderPosRef.current = 0
  }, [active.tracks.length, shuffle])

  // ── 재생 제어 ──
  const playIndex = (i: number) => {
    if (i < 0 || i >= active.tracks.length) return
    buildOrder(i)
    setCurIdx(i)
    setPlayErr('')
    // src 교체는 effect 에서, 여기서는 재생 의도만
    setPlaying(true)
  }
  const stop = () => {
    setPlaying(false)
    try { const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0 } } catch { /* noop */ }
    setPos(0)
  }
  const togglePlay = () => {
    if (curIdx < 0) { if (active.tracks.length) playIndex(0); return }
    setPlaying((p) => !p)
  }
  const next = useCallback((auto = false) => {
    const n = active.tracks.length
    if (!n) return
    if (repeat === 'one' && auto && curIdx >= 0) {
      // 같은 곡 다시
      try { const a = audioRef.current; if (a) { a.currentTime = 0; a.play().catch(() => {}) } } catch { /* noop */ }
      return
    }
    if (!orderRef.current.length) buildOrder(curIdx)
    let np = orderPosRef.current + 1
    if (np >= orderRef.current.length) {
      if (repeat === 'all' || !auto) { buildOrder(shuffle ? -1 : 0); np = 0 }
      else { stop(); setCurIdx(-1); return } // 끝
    }
    orderPosRef.current = np
    const idx = orderRef.current[np]
    setCurIdx(idx)
    setPlaying(true)
  }, [active.tracks.length, repeat, curIdx, shuffle, buildOrder])
  const prev = () => {
    const n = active.tracks.length
    if (!n) return
    const a = audioRef.current
    if (a && a.currentTime > 3) { a.currentTime = 0; return } // 3초 넘으면 처음으로
    if (!orderRef.current.length) buildOrder(curIdx)
    let pp = orderPosRef.current - 1
    if (pp < 0) pp = repeat === 'all' ? orderRef.current.length - 1 : 0
    orderPosRef.current = pp
    setCurIdx(orderRef.current[pp])
    setPlaying(true)
  }

  // ── 오디오 element 와 상태 동기화 ──
  const curTrack = curIdx >= 0 && curIdx < active.tracks.length ? active.tracks[curIdx] : null
  // src 교체
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (!curTrack) { try { a.pause(); a.removeAttribute('src'); a.load() } catch { /* noop */ }; return }
    if (a.src !== curTrack.url) {
      try { a.src = curTrack.url; a.load() } catch { /* noop */ }
      setPos(0); setDur(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curTrack?.url])
  // 재생/일시정지 의도 반영
  useEffect(() => {
    const a = audioRef.current
    if (!a || !curTrack) return
    if (playing) { a.play().catch(() => { /* 자동재생 차단 등 — 사용자 조작 대기 */ }) }
    else { try { a.pause() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, curTrack?.url])
  // 음량
  useEffect(() => { const a = audioRef.current; if (a) a.volume = volume }, [volume])

  // ── 언마운트 정리: 검색 중단 + 오디오 정지·src 비우기 ──
  useEffect(() => () => {
    acRef.current?.abort()
    try {
      const a = audioRef.current
      if (a) { a.pause(); a.removeAttribute('src'); try { a.load() } catch { /* noop */ } }
    } catch { /* noop */ }
  }, [])

  // ── 플레이리스트 관리 ──
  const newPlaylist = () => {
    const pl: Playlist = { id: uid('pl'), name: '플레이리스트 ' + (playlists.length + 1), tracks: [] }
    stop(); setCurIdx(-1)
    setState((s) => ({ ...s, playlists: [...s.playlists, pl], activeId: pl.id }))
    setTab('queue')
  }
  const deletePlaylist = () => {
    if (playlists.length <= 1) { flash('마지막 플레이리스트는 삭제할 수 없습니다.'); return }
    if (!window.confirm('“' + active.name + '” 플레이리스트를 삭제할까요?')) return
    stop(); setCurIdx(-1)
    setState((s) => {
      const rest = s.playlists.filter((p) => p.id !== s.activeId)
      return { ...s, playlists: rest, activeId: rest[0].id }
    })
  }
  const renamePlaylist = (name: string) => setActive((pl) => ({ ...pl, name: name.slice(0, 40) || pl.name }))
  const switchPlaylist = (id: string) => { stop(); setCurIdx(-1); setState((s) => ({ ...s, activeId: id })) }

  // ── 연계 ──
  const bridge = hasProjectBridge()
  const stashOK = hasStash()
  const saveTrackSnippet = () => {
    if (!curTrack) return
    const item: Partial<SharedSnippet> = {
      text: `[집필 BGM] "${curTrack.title}" — ${curTrack.creator} (${curTrack.license})${curTrack.mood ? ' · ' + curTrack.mood : ''}`,
      source: '집필 플레이리스트', tags: ['음악', '플레이리스트'],
    }
    addToLibrary('snippets', item)
    flash('스니펫 라이브러리에 저장됨')
  }
  const stashTrack = () => {
    if (!curTrack) return
    addToStash({ kind: 'audio', label: curTrack.title + ' — ' + curTrack.creator, url: curTrack.landing || curTrack.url, credit: curTrack.creator + ' / ' + curTrack.license })
    flash('수집함에 담음')
  }
  const trackToProject = () => {
    if (!curTrack || !bridge) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 플레이리스트',
      title: curTrack.title + ' — ' + curTrack.creator,
      bodyHtml: trackBodyHtml(curTrack, active.name),
      meta: { 제작자: curTrack.creator, 라이선스: curTrack.license, 플레이리스트: active.name, ...(curTrack.mood ? { 분위기: curTrack.mood } : {}), ...(curTrack.landing ? { 출처: curTrack.landing } : {}) },
    })
    if (id) flash('프로젝트에 곡 메모 추가됨')
  }
  const playlistToProject = () => {
    if (!active.tracks.length || !bridge) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '집필 플레이리스트',
      title: active.name + ' (목록 ' + active.tracks.length + '곡)',
      bodyHtml: playlistBodyHtml(active),
      meta: { 곡수: String(active.tracks.length), 라이선스: 'CC0/Public Domain' },
    })
    if (id) flash('프로젝트에 목록 추가됨')
  }
  const toMusicGallery = () => openToolLinked('music-gallery', curTrack ? { mood: curTrack.mood } : { mood: mood.label })

  // ── 렌더 ──
  const C = { panel: 'var(--panel)', border: 'var(--border)', muted: 'var(--muted)', accent: 'var(--accent)', text: 'var(--text)' }
  const cardStyle: React.CSSProperties = { background: C.panel, border: '1px solid ' + C.border, borderRadius: 10, padding: 10 }
  const seekPct = dur > 0 ? (pos / dur) * 100 : 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: C.text, minHeight: 0 }}>
      {/* 헤더: 플레이리스트 선택/이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <select value={activeId} onChange={(e) => switchPlaylist(e.target.value)}
          style={{ flex: '1 1 140px', minWidth: 120, padding: '5px 8px', borderRadius: 8, border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: 13 }}>
          {playlists.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.tracks.length})</option>)}
        </select>
        <button className="minibtn" onClick={() => setEditName((v) => !v)} title="이름 변경"><Emoji e="✏️"/></button>
        <button className="minibtn" onClick={newPlaylist} title="새 플레이리스트">＋</button>
        <button className="minibtn danger" onClick={deletePlaylist} title="플레이리스트 삭제"><Emoji e="🗑"/></button>
      </div>
      {editName && (
        <input autoFocus value={active.name} onChange={(e) => renamePlaylist(e.target.value)} onBlur={() => setEditName(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditName(false) }}
          style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid ' + C.accent, background: C.panel, color: C.text, fontSize: 13 }} />
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className={'minibtn' + (tab === 'search' ? ' active' : '')} onClick={() => setTab('search')} style={{ flex: 1 }}><Emoji e="🔎"/> 곡 찾기</button>
        <button className={'minibtn' + (tab === 'queue' ? ' active' : '')} onClick={() => setTab('queue')} style={{ flex: 1 }}><Emoji e="🎵"/> 큐 ({active.tracks.length})</button>
      </div>

      {/* 본문 영역 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tab === 'search' ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {MOODS.map((m) => <button key={m.key} className={'minibtn' + (mood.key === m.key && !query ? ' active' : '')} onClick={() => pickMood(m)}>{emojify(m.label)}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); runSearch(query, 1) }} style={{ display: 'flex', gap: 6 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="직접 검색 (영어 권장: rain, piano, ambient…)"
                style={{ flex: 1, padding: '6px 9px', borderRadius: 8, border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: 13 }} />
              <button className="btn-primary" type="submit" disabled={searching || !query.trim()}>검색</button>
            </form>

            {searching && !hits.length && <div style={{ padding: 20, textAlign: 'center', color: C.muted }}>음원을 찾는 중…</div>}
            {searchErr && !hits.length && <div style={{ padding: 16, textAlign: 'center', color: C.muted }}>{searchErr}</div>}

            {hits.map((h) => {
              const inQueue = active.tracks.some((t) => t.url === h.url)
              return (
                <div key={h._key} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.title}>{h.title}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Emoji e="🎙"/> {h.creator} · <span className="license-badge">{h.license}</span>{h.duration ? ' · ' + fmtTime(h.duration) : ''}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => addTrack(h)} disabled={inQueue} title={inQueue ? '이미 추가됨' : '큐에 추가'}>{inQueue ? '✓' : '＋ 추가'}</button>
                </div>
              )
            })}
            {!!hits.length && (
              <button className="minibtn" onClick={() => runSearch(lastSearchRef.current || query || mood.q, pageRef.current + 1)} disabled={searching} style={{ alignSelf: 'center' }}>
                {searching ? '불러오는 중…' : '＋ 더 보기'}
              </button>
            )}
          </>
        ) : (
          <>
            {!active.tracks.length && (
              <div style={{ padding: 24, textAlign: 'center', color: C.muted, lineHeight: 1.6 }}>
                아직 곡이 없습니다.<br />‘곡 찾기’에서 분위기를 골라 추가해보세요.
              </div>
            )}
            {active.tracks.map((t, i) => {
              const isCur = i === curIdx
              return (
                <div key={t.id} draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveTrack(dragIdx, i); setDragIdx(null) }}
                  onDragEnd={() => setDragIdx(null)}
                  style={{
                    ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab',
                    borderColor: isCur ? C.accent : C.border,
                    boxShadow: isCur ? '0 0 0 1px ' + C.accent + ' inset' : 'none',
                    opacity: dragIdx === i ? 0.5 : 1,
                  }}>
                  <button className="minibtn" onClick={() => (isCur && playing ? setPlaying(false) : playIndex(i))}
                    title={isCur && playing ? '일시정지' : '재생'} style={{ width: 30 }}>
                    {isCur && playing ? '⏸' : '▶'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isCur ? 700 : 600, fontSize: 13.5, color: isCur ? C.accent : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>
                      {i + 1}. {t.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Emoji e="🎙"/> {t.creator} · <span className="license-badge">{t.license}</span>
                      {t.landing && <> · <a href={t.landing} target="_blank" rel="noreferrer noopener" style={{ color: C.muted }}>출처</a></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="minibtn" onClick={() => moveTrack(i, i - 1)} disabled={i === 0} title="위로" style={{ padding: '0 6px', lineHeight: 1.4 }}>▲</button>
                    <button className="minibtn" onClick={() => moveTrack(i, i + 1)} disabled={i === active.tracks.length - 1} title="아래로" style={{ padding: '0 6px', lineHeight: 1.4 }}>▼</button>
                  </div>
                  <button className="minibtn danger" onClick={() => removeAt(i)} title="제거">✕</button>
                </div>
              )
            })}
            {!!active.tracks.length && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <button className="minibtn danger" onClick={clearQueue}><Emoji e="🗑"/> 전체 비우기</button>
                <button className="linkbtn" onClick={playlistToProject} disabled={!bridge} title={bridge ? '곡 목록을 프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 목록을 프로젝트로</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 숨은 오디오 element + 재생바 */}
      <audio
        ref={audioRef}
        preload="none"
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration || 0)}
        onTimeUpdate={(e) => setPos((e.target as HTMLAudioElement).currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => { if (audioRef.current && !audioRef.current.ended) setPlaying(false) }}
        onEnded={() => next(true)}
        onError={() => { if (curTrack) { setPlayErr('이 음원은 재생할 수 없어 다음 곡으로 넘어갑니다.'); window.setTimeout(() => next(true), 600) } }}
      />

      <div style={{ ...cardStyle, padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 20 }}>{curTrack ? <Emoji e="🎧"/> : <Emoji e="🎵"/>}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {curTrack ? curTrack.title : '재생할 곡을 선택하세요'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {curTrack ? <><Emoji e="🎙"/> {curTrack.creator} · <span className="license-badge">{curTrack.license}</span></> : '큐에서 곡을 골라 ▶ 를 누르면 다음 곡까지 자동 재생됩니다'}
            </div>
          </div>
        </div>

        {/* 탐색 바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, color: C.muted }}>
          <span style={{ width: 34, textAlign: 'right' }}>{fmtTime(pos)}</span>
          <input type="range" min={0} max={dur || 0} step={0.1} value={Math.min(pos, dur || 0)}
            onChange={(e) => { const a = audioRef.current; if (a) { a.currentTime = Number(e.target.value); setPos(Number(e.target.value)) } }}
            disabled={!curTrack} style={{ flex: 1, accentColor: C.accent }} aria-label="재생 위치" />
          <span style={{ width: 34 }}>{fmtTime(dur)}</span>
        </div>
        {/* 진행 시각 표시(접근성 보조용 막대) */}
        <div style={{ height: 2, borderRadius: 2, background: C.border, overflow: 'hidden', marginTop: -3 }}>
          <div style={{ height: '100%', width: seekPct + '%', background: C.accent }} />
        </div>

        {/* 트랜스포트 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button className={'minibtn' + (shuffle ? ' active' : '')} onClick={() => setState((s) => ({ ...s, shuffle: !s.shuffle }))} title="셔플"><Emoji e="🔀"/></button>
          <button className="minibtn" onClick={prev} disabled={!active.tracks.length} title="이전">⏮</button>
          <button className="btn-primary" onClick={togglePlay} disabled={!active.tracks.length} style={{ minWidth: 46 }} title={playing ? '일시정지' : '재생'}>{playing ? '⏸' : '▶'}</button>
          <button className="minibtn" onClick={() => next(false)} disabled={!active.tracks.length} title="다음">⏭</button>
          <button className={'minibtn' + (repeat !== 'off' ? ' active' : '')}
            onClick={() => setState((s) => ({ ...s, repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' }))}
            title={repeat === 'one' ? '한 곡 반복' : repeat === 'all' ? '전체 반복' : '반복 끄기'}>
            {repeat === 'one' ? <Emoji e="🔂"/> : <Emoji e="🔁"/>}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12 }}>{volume === 0 ? <Emoji e="🔇"/> : <Emoji e="🔊"/>}</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setState((s) => ({ ...s, volume: Number(e.target.value) }))}
              style={{ width: 70, accentColor: C.accent }} aria-label="음량" />
          </span>
        </div>
        {playErr && <div style={{ fontSize: 11, color: C.muted }}>{playErr}</div>}
      </div>

      {/* 연계 + 토스트 + 라이선스 안내 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={saveTrackSnippet} disabled={!curTrack}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="minibtn" onClick={stashTrack} disabled={!curTrack || !stashOK} title={stashOK ? '현재 곡을 수집함에' : '수집함이 없습니다'}><Emoji e="🧺"/> 수집함</button>
        <button className="linkbtn" onClick={trackToProject} disabled={!curTrack || !bridge} title={bridge ? '현재 곡을 프로젝트 자료로' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 곡을 프로젝트로</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toMusicGallery}><Emoji e="🎵"/> 음악 갤러리</button>
        {(TOOL_RELATIONS['music-gallery'] || []).filter((id) => id !== 'music-gallery').map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>
      {toast && <div style={{ color: 'var(--ok)', fontSize: 12 }}>{toast}</div>}
      <div className="license-note">CC0/퍼블릭도메인 음원만 검색·재생합니다. 출처·제작자·라이선스를 표기하세요. 직접 재배포 시 각 라이선스를 확인하세요.</div>
    </div>
  )
}
