// 음악 갤러리(영감) — 갤러리처럼 무작위/그날그날 바뀌는 음원을 가져와 재생하며 글감을 떠올린다.
// 저작권 안전: Openverse 오디오에서 license=cc0,pdm(퍼블릭도메인/CC0)만 가져온다(키 불필요·https).
// 가사 등 저작권 텍스트는 표시하지 않는다. 각 트랙에 제작자/라이선스/출처 표기.
// 연계(linkbus): 배경 설정집·인물 시트로 분위기 전달, 분위기 메모를 공유 라이브러리에 저장.
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, TOOL_RELATIONS, Emoji, emojify, type SharedSnippet } from './linkbus'

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자/외부 데이터를 안전하게 처리)
function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const meta = { id: 'music-gallery', name: '음악 갤러리(영감)', icon: '🎵', group: '분위기·시각', intro: '저작권 안전(CC0/PD) 음악을 들으며 글감을 떠올리세요', w: 440, h: 580 }

const REL_LABEL: Record<string, string> = {
  'setting-bible': '🏞 배경 설정집', 'character-sheet': '🪪 인물 시트', 'scene-forge': '🎬 장면 생성기', 'sensory-palette': '🌫 감각 팔레트',
}

type Mood = { key: string; label: string; q: string }
const MOODS: Mood[] = [
  { key: 'calm', label: '🌙 잔잔·피아노', q: 'calm piano ambient' },
  { key: 'classical', label: '🎻 클래식', q: 'classical orchestra' },
  { key: 'cinematic', label: '🎬 영화·웅장', q: 'cinematic epic soundtrack' },
  { key: 'jazz', label: '🎷 재즈', q: 'jazz instrumental' },
  { key: 'nature', label: '🌊 자연·앰비언트', q: 'nature ambient soundscape' },
  { key: 'fantasy', label: '🧝 신비·판타지', q: 'fantasy medieval mystical' },
  { key: 'tense', label: '🩸 긴장·서스펜스', q: 'dark tension suspense drone' },
  { key: 'adventure', label: '🏔 활기·모험', q: 'upbeat adventure folk' },
]
const PROMPTS = [
  '이 곡이 흐르는 한 장면을 떠올려, 첫 문장을 적어보세요.',
  '이 음악의 주인공은 누구일까요? 그는 지금 무엇을 느끼고 있나요?',
  '이 선율에 어울리는 날씨와 장소를 묘사해보세요.',
  '이 곡이 한 인물의 테마곡이라면, 그 인물의 가장 큰 비밀은 무엇일까요?',
  '음악이 절정에 이르는 순간, 이야기에서는 무슨 일이 벌어지나요?',
  '이 곡을 들으며 떠오른 색과 냄새를 적고, 그것으로 한 문단을 써보세요.',
  '이 음악이 끝나는 장면을 상상해 마지막 한 줄을 지어보세요.',
]

interface Track { title: string; creator: string; license: string; url: string; landing: string }

function licenseLabel(lic: string): string {
  const l = (lic || '').toLowerCase()
  if (l === 'cc0') return 'CC0'
  if (l === 'pdm') return 'Public Domain'
  return (lic || '').toUpperCase() || 'CC'
}

// 현재 곡(제목/제작자/라이선스/분위기) + 글감을 분위기 메모 본문 HTML 로 변환. 음원 파일은 넣지 않고 출처만 링크.
function memoBodyHtml(track: Track, moodLabel: string, prompt: string): string {
  const parts: string[] = []
  parts.push('<p>🎵 <b>' + escHtml(track.title) + '</b></p>')
  parts.push('<p>🎙 ' + escHtml(track.creator) + ' · ' + escHtml(track.license) + ' · ' + escHtml(moodLabel) + '</p>')
  if (prompt) parts.push('<p>✍️ 글감: ' + escHtml(prompt) + '</p>')
  if (track.landing) parts.push('<p>출처: <a href="' + escHtml(track.landing) + '">Openverse</a></p>')
  return parts.join('\n')
}

async function fetchTrack(q: string, signal: AbortSignal, dayPage: number): Promise<Track> {
  // license=cc0,pdm 로 저작권 걱정 없는 음원만. 무작위 페이지 + 그날 시드 페이지 혼합.
  const page = 1 + (Math.random() < 0.5 ? dayPage % 8 : Math.floor(Math.random() * 12))
  const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=20&page=${page}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const list: unknown[] = Array.isArray(j?.results) ? j.results : []
  const playable = list.filter((x) => {
    const o = x as { url?: string }
    return typeof o.url === 'string' && /\.(mp3|ogg|wav|flac|oga)(\?|$)/i.test(o.url)
  })
  const pool = (playable.length ? playable : list) as { url?: string; title?: string; creator?: string; license?: string; foreign_landing_url?: string }[]
  if (!pool.length) throw new Error('no audio')
  const a = pool[Math.floor(Math.random() * pool.length)]
  if (!a.url) throw new Error('no url')
  return {
    title: (a.title || '무제 음원').trim(),
    creator: (a.creator || '작자 미상').trim(),
    license: licenseLabel(a.license || ''),
    url: a.url,
    landing: a.foreign_landing_url || '',
  }
}

export default function MusicGallery({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [mood, setMood] = useState<Mood>(MOODS[0])
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [saved, setSaved] = useState(false)
  const [proj, setProj] = useState('')
  // [연계] 무드링(mood/moodName/q)·사운드 큐시트(query) 가 보낸 분위기로 즉시 검색(커스텀 무드)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const s = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() : '')
    const known = MOODS.find((m) => m.key === s('mood'))
    if (known) { setMood(known); return }
    const q = s('q') || s('query') || s('mood')
    if (q) setMood({ key: 'linked:' + q, label: '🔗 ' + (s('moodName') || q), q })
  }, [payload]) // eslint-disable-line
  const nonce = useRef(0)
  const acRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dayPage = useRef(Math.floor(Date.now() / 86400000) % 8)

  const load = async (m: Mood) => {
    const my = ++nonce.current
    acRef.current?.abort()
    // 새 곡을 찾기 시작할 때 이전 곡을 즉시 정지(겹침·잔존 방지)
    try { audioRef.current?.pause() } catch { /* noop */ }
    const ac = new AbortController(); acRef.current = ac
    setLoading(true); setErr(''); setSaved(false)
    try {
      let t: Track | null = null
      for (let i = 0; i < 3 && !t; i++) {
        try { t = await fetchTrack(m.q, ac.signal, dayPage.current) } catch (e) { if (ac.signal.aborted) return; if (i === 2) throw e }
      }
      if (my !== nonce.current || ac.signal.aborted) return
      // 새 track 적용 직전에도 이전 곡 정지
      try { audioRef.current?.pause() } catch { /* noop */ }
      setTrack(t)
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) setErr('음원을 불러오지 못했습니다. 다른 분위기나 다시 시도를 눌러주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => { load(mood); /* eslint-disable-next-line */ }, [mood])
  // src 교체 직후 새 음원을 로드(이전 곡 버퍼/재생 잔존 제거)
  useEffect(() => {
    if (!track) return
    try { audioRef.current?.pause(); audioRef.current?.load() } catch { /* noop */ }
  }, [track])
  // 언마운트 시 재생 정지 + src 비우기
  useEffect(() => () => {
    acRef.current?.abort()
    try {
      const a = audioRef.current
      if (a) { a.pause(); a.removeAttribute('src'); try { a.load() } catch { /* noop */ } }
    } catch { /* noop */ }
  }, [])

  const saveMoodMemo = () => {
    if (!track) return
    const item: Partial<SharedSnippet> = { text: `[음악·${mood.label}] "${track.title}" — ${track.creator} (${track.license}). 떠오른 글감: ${prompt}`, source: '음악 갤러리', tags: ['음악', mood.key] }
    addToLibrary('snippets', item)
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  // ── 프로젝트 연동: 현재 곡 + 글감을 '분위기 메모' 폴더 자료로 추가 ──
  const bridge = hasProjectBridge()
  const addMemoToProject = () => {
    if (!track || !bridge) return
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '분위기 메모',
      title: `${track.title} — ${track.creator}`,
      bodyHtml: memoBodyHtml(track, mood.label, prompt),
      meta: { 제작자: track.creator, 라이선스: track.license, 분위기: mood.label, 글감: prompt, ...(track.landing ? { 출처: track.landing } : {}) },
    })
    if (!id) return
    setProj('✓ 프로젝트에 분위기 메모를 추가했습니다.')
    setTimeout(() => setProj(''), 1800)
  }
  const toSetting = () => { if (track) openToolLinked('setting-bible', { mood: mood.label.replace(/^[^ ]+ /, ''), musicNote: `${track.title} — ${track.creator}` }) }
  const toCharacter = () => { if (track) openToolLinked('character-sheet', { themeSong: { title: track.title, creator: track.creator, license: track.license, mood: mood.label } }) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>분위기를 고르면 저작권 걱정 없는 음악(CC0/퍼블릭도메인)을 가져옵니다. 들으며 떠오른 장면을 바로 적어보세요.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MOODS.map((m) => <button key={m.key} className={'minibtn' + (mood.key === m.key ? ' active' : '')} onClick={() => setMood(m)}>{emojify(m.label)}</button>)}
        {/* [연계] 다른 도구가 보낸 커스텀 분위기(기본 목록에 없음)는 활성 칩으로 함께 표시 */}
        {!MOODS.some((m) => m.key === mood.key) && <button className="minibtn active" onClick={() => setMood(mood)} title={'검색어: ' + mood.q}>{emojify(mood.label)}</button>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 24 }}>음원을 찾는 중…</div>}
        {err && !loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', padding: 16 }}>{err}</div>}
        {track && !loading && !err && (
          <>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}><Emoji e="🎵"/> {track.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}><Emoji e="🎙"/> {track.creator} · <span className="license-badge">{track.license}</span></div>
              <audio ref={audioRef} src={track.url} controls preload="none" style={{ width: '100%' }} onError={() => setErr('이 음원은 재생할 수 없습니다. 다시 시도를 눌러주세요.')} />
              {track.landing && <a href={track.landing} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}><Emoji e="🔗"/> 원본·라이선스 보기 (Openverse)</a>}
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️"/> 글감</div>{prompt}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => load(mood)} disabled={loading}><Emoji e="🔀"/> 다른 곡</button>
        <button className="minibtn" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])} disabled={!track}><Emoji e="💡"/> 다른 글감</button>
        <button className="minibtn" onClick={saveMoodMemo} disabled={!track}>{saved ? <>✓ 저장됨</> : <><Emoji e="📥"/> 분위기 메모 저장</>}</button>
        <button className="linkbtn" onClick={addMemoToProject} disabled={!bridge || !track} title={bridge ? '현재 곡과 글감을 프로젝트 \'분위기 메모\' 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>
      {proj && <div style={{ color: 'var(--ok)', fontSize: 12 }}>{proj}</div>}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toSetting} disabled={!track}><Emoji e="🏞"/> 배경 분위기로</button>
        <button className="linkbtn" onClick={toCharacter} disabled={!track}><Emoji e="🎭"/> 캐릭터 테마곡</button>
        {(TOOL_RELATIONS['music-gallery'] || []).filter((id) => id !== 'setting-bible' && id !== 'character-sheet').map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>
      <div className="license-note">CC0/퍼블릭도메인 음원만 재생합니다. 곡을 직접 재배포하려면 각 라이선스를 확인하세요.</div>
    </div>
  )
}
