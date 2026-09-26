// 캐릭터 음성 보드 — 인물마다 speechSynthesis 목소리/속도/높이/음량을 지정해 두고,
//  대사를 그 인물의 '목소리'로 낭독한다. 여러 인물의 대사를 한 대본에 줄줄이 쌓아 순차 재생하면
//  실제 배우들이 모여 읽는 '대본 리딩(테이블 리드)'처럼 들린다 → 대사 톤·호흡·말맛을 귀로 점검.
//
// 구성:
//  1) 출연진(cast): 공유 인물 라이브러리(characters)에서 자동으로 가져오거나, 이 도구에서 직접 추가.
//     인물마다 목소리·속도(rate)·높이(pitch)·음량(volume)·색을 저장. 🔊로 한 줄 시범 낭독.
//  2) 대본(script): 줄마다 '화자(인물 또는 내레이션)'와 '대사'를 지정. ▶ 전체 리딩으로 순차 재생,
//     현재 읽는 줄을 강조. 일시정지/이어재생/정지, 줄 추가·삭제·순서 이동, 붙여넣기 자동 파싱("이름: 대사").
//  3) 연계: 대본을 프로젝트 원고/자료에 문서로 추가, 수집함에 메모로 담기.
//
// 자급식: react 와 './linkbus' 외 import 없음. 키 불필요·완전 로컬 Web API(speechSynthesis)만 사용.
// 미지원(헤드리스/구형 브라우저) graceful 안내. 언마운트 시 speechSynthesis.cancel·타이머·리스너 정리.
// 영속: localStorage 'sry:tool:character-voice-board'.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useLibraryList,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'character-voice-board', name: '캐릭터 음성 보드', icon: '🎙️', group: '구상·정리', intro: '인물마다 목소리를 정해두고 대사를 낭독 · 여러 인물 대사를 순차 재생하는 대본 리딩', w: 660, h: 720 }

const LS_KEY = 'sry:tool:character-voice-board'

// ───────────── speechSynthesis 지원 여부(헤드리스/구형 대비) ─────────────
function ttsSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
  } catch {
    return false
  }
}

// ───────────── 유틸 ─────────────
function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function clamp(n: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, n)) }

// 출연진 색상 팔레트(말풍선 식별용)
const CAST_COLORS = ['#5b86e0', '#e07a5f', '#5f9d6e', '#b06ad4', '#d4a13a', '#3aabb5', '#d45f8a', '#7a8794']
const NARRATOR_ID = '__narrator__'

// ───────────── 영속 타입 ─────────────
interface VoiceProfile {
  rate: number       // 0.5 ~ 2
  pitch: number      // 0 ~ 2
  volume: number     // 0 ~ 1
  voiceURI: string | null
}
interface CastMember {
  id: string         // 라이브러리 인물이면 'lib:<charId>', 직접 추가면 'cast_...'
  name: string
  color: string
  profile: VoiceProfile
  fromLibrary?: boolean
}
interface ScriptLine {
  id: string
  speaker: string    // cast id 또는 NARRATOR_ID
  text: string
}
interface Persisted {
  cast: CastMember[]
  lines: ScriptLine[]
  title: string
}

function defaultProfile(): VoiceProfile { return { rate: 1, pitch: 1, volume: 1, voiceURI: null } }

function loadPersisted(): Persisted {
  const base: Persisted = { cast: [], lines: [], title: '제목 없는 대본' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return base
    return {
      cast: Array.isArray(o.cast) ? o.cast : [],
      lines: Array.isArray(o.lines) ? o.lines : [],
      title: typeof o.title === 'string' ? o.title : base.title,
    }
  } catch {
    return base
  }
}

// "이름: 대사" 형태의 붙여넣기를 줄 목록으로 파싱(이름 매칭은 호출부에서 처리).
function parseScript(src: string): { name: string | null; text: string }[] {
  const out: { name: string | null; text: string }[] = []
  const rows = src.split(/\r?\n/)
  for (const row of rows) {
    const line = row.trim()
    if (!line) continue
    // "이름: 대사" / "이름 : 대사" / "이름) 대사" 같은 흔한 대본 표기 허용. 이름은 너무 길면 화자 아님.
    const m = line.match(/^\s*([^:：)\]]{1,20})\s*[:：)\]]\s*(.+)$/)
    if (m && m[2].trim()) {
      out.push({ name: m[1].trim(), text: m[2].trim() })
    } else {
      out.push({ name: null, text: line })
    }
  }
  return out
}

export default function CharacterVoiceBoard({ payload }: { payload?: Record<string, unknown> }) {
  const supported = ttsSupported()
  const init = useRef<Persisted>(loadPersisted())
  const libChars = useLibraryList('characters')

  const [cast, setCast] = useState<CastMember[]>(init.current.cast)
  const [lines, setLines] = useState<ScriptLine[]>(init.current.lines)
  const [title, setTitle] = useState<string>(init.current.title)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [editingVoice, setEditingVoice] = useState<string | null>(null) // 음성 설정 펼친 cast id
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [activeLine, setActiveLine] = useState<number>(-1)
  const [error, setError] = useState<string>('')
  const [flash, setFlash] = useState<string>('')

  const [newName, setNewName] = useState('')           // 직접 출연진 추가용
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [draftSpeaker, setDraftSpeaker] = useState<string>(NARRATOR_ID) // 새 줄 화자 기본값
  const [draftText, setDraftText] = useState('')

  const nonceRef = useRef(0)         // 재생 세션 토큰(경쟁상태 방지)
  const linesRef = useRef<ScriptLine[]>(lines)
  const castRef = useRef<CastMember[]>(cast)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // 최신 값 ref 동기화(낭독 콜백 내부에서 안정적으로 참조)
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { castRef.current = cast }, [cast])
  useEffect(() => { voicesRef.current = voices }, [voices])

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cast, lines, title } as Persisted)) } catch { /* 용량 초과 등 graceful */ }
  }, [cast, lines, title])

  const showFlash = useCallback((msg: string) => {
    if (!mounted.current) return
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2600)
  }, [])

  // ───────────── 목소리 목록 로드(비동기로 채워지는 브라우저 대응) ─────────────
  useEffect(() => {
    if (!supported) return
    let alive = true
    const refresh = () => {
      try {
        const list = window.speechSynthesis.getVoices() || []
        if (alive) setVoices(list)
      } catch { /* graceful */ }
    }
    refresh()
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
    } catch {
      try { (window.speechSynthesis as SpeechSynthesis).onvoiceschanged = refresh } catch { /* noop */ }
    }
    return () => {
      alive = false
      try { window.speechSynthesis.removeEventListener?.('voiceschanged', refresh) } catch { /* noop */ }
    }
  }, [supported])

  // ───────────── 언마운트 정리: 진행 세션 무효화 + cancel + 타이머 ─────────────
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      nonceRef.current++
      try { if (ttsSupported()) window.speechSynthesis.cancel() } catch { /* noop */ }
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // ───────────── 페이로드: 다른 도구에서 인물/대사 전달받기(선택) ─────────────
  useEffect(() => {
    if (!payload) return
    // { character: { name } } 또는 { name } 으로 인물 한 명을 출연진에 추가
    const ch = (payload.character as Record<string, unknown> | undefined)
    const pname = (typeof payload.name === 'string' ? payload.name : (typeof ch?.name === 'string' ? ch.name as string : ''))
    if (pname) {
      setCast(prev => prev.some(c => c.name === pname) ? prev : [...prev, makeCast(pname, prev.length)])
    }
    // { text } 로 대본 텍스트 전달 → 파싱하여 줄 추가
    if (typeof payload.text === 'string' && payload.text.trim()) {
      ingestPaste(payload.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ───────────── 출연진 관리 ─────────────
  function makeCast(name: string, idx: number, opts?: { id?: string; fromLibrary?: boolean }): CastMember {
    return {
      id: opts?.id || uid('cast'),
      name,
      color: CAST_COLORS[idx % CAST_COLORS.length],
      profile: defaultProfile(),
      fromLibrary: opts?.fromLibrary,
    }
  }

  const addCustomCast = () => {
    const name = newName.trim()
    if (!name) return
    if (cast.some(c => c.name === name)) { showFlash('이미 출연 중인 이름이에요.'); return }
    setCast(prev => [...prev, makeCast(name, prev.length)])
    setNewName('')
  }

  // 라이브러리 인물을 출연진에 합류(중복 방지: 같은 lib id)
  const addFromLibrary = (ch: SharedCharacter) => {
    const libId = 'lib:' + ch.id
    if (cast.some(c => c.id === libId)) { showFlash('이미 출연 중인 인물이에요.'); return }
    setCast(prev => [...prev, makeCast(ch.name || '이름 없는 인물', prev.length, { id: libId, fromLibrary: true })])
    showFlash(`'${ch.name}' 출연진 합류`)
  }

  const removeCast = (id: string) => {
    setCast(prev => prev.filter(c => c.id !== id))
    // 이 인물이 화자인 줄은 내레이션으로 되돌림(데이터 유실 방지)
    setLines(prev => prev.map(l => l.speaker === id ? { ...l, speaker: NARRATOR_ID } : l))
    if (editingVoice === id) setEditingVoice(null)
    if (draftSpeaker === id) setDraftSpeaker(NARRATOR_ID)
  }

  const patchProfile = (id: string, patch: Partial<VoiceProfile>) => {
    setCast(prev => prev.map(c => c.id === id ? { ...c, profile: { ...c.profile, ...patch } } : c))
  }

  // ───────────── 대본(줄) 관리 ─────────────
  const addLine = () => {
    const t = draftText.trim()
    if (!t) return
    setLines(prev => [...prev, { id: uid('ln'), speaker: draftSpeaker, text: t }])
    setDraftText('')
  }
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))
  const updateLineText = (id: string, text: string) => setLines(prev => prev.map(l => l.id === id ? { ...l, text } : l))
  const updateLineSpeaker = (id: string, speaker: string) => setLines(prev => prev.map(l => l.id === id ? { ...l, speaker } : l))
  const moveLine = (idx: number, dir: -1 | 1) => {
    setLines(prev => {
      const next = [...prev]
      const j = idx + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }
  const clearScript = () => {
    if (status !== 'idle') stop()
    setLines([])
  }

  // 붙여넣기 텍스트("이름: 대사" 줄들) → 줄 목록으로. 이름이 출연진과 매칭되면 그 화자로, 새 이름이면 출연진 자동 추가.
  const ingestPaste = (src: string) => {
    const parsed = parseScript(src)
    if (parsed.length === 0) { showFlash('가져올 대사를 찾지 못했어요.'); return }
    setCast(prevCast => {
      let nextCast = prevCast
      const newLines: ScriptLine[] = []
      for (const p of parsed) {
        let speaker = NARRATOR_ID
        if (p.name) {
          const found = nextCast.find(c => c.name === p.name)
          if (found) {
            speaker = found.id
          } else {
            const nc = makeCast(p.name, nextCast.length)
            nextCast = [...nextCast, nc]
            speaker = nc.id
          }
        }
        newLines.push({ id: uid('ln'), speaker, text: p.text })
      }
      setLines(prevLines => [...prevLines, ...newLines])
      return nextCast
    })
    showFlash(`${parsed.length}줄을 대본에 추가했어요.`)
  }

  // ───────────── 낭독 엔진 ─────────────
  const pickVoiceForProfile = (profile: VoiceProfile): SpeechSynthesisVoice | null => {
    const vs = voicesRef.current
    if (vs.length === 0) return null
    if (profile.voiceURI) {
      const v = vs.find(v => v.voiceURI === profile.voiceURI)
      if (v) return v
    }
    const ko = vs.find(v => /^ko/i.test(v.lang))
    return ko ?? vs[0] ?? null
  }

  const makeUtterance = (text: string, profile: VoiceProfile): SpeechSynthesisUtterance | null => {
    let u: SpeechSynthesisUtterance
    try { u = new SpeechSynthesisUtterance(text) } catch { return null }
    const v = pickVoiceForProfile(profile)
    if (v) { u.voice = v; u.lang = v.lang }
    u.rate = clamp(profile.rate, 0.5, 2)
    u.pitch = clamp(profile.pitch, 0, 2)
    u.volume = clamp(profile.volume, 0, 1)
    return u
  }

  // 한 줄(인물 한 명)만 시범 낭독 — 다른 재생은 중단.
  const speakOne = (member: CastMember, text: string) => {
    setError('')
    if (!supported) return
    if (!text.trim()) { showFlash('낭독할 대사가 비어 있어요.'); return }
    const myNonce = ++nonceRef.current
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setStatus('idle'); setActiveLine(-1)
    const u = makeUtterance(text, member.profile)
    if (!u) { setError('이 환경에서는 음성 합성을 사용할 수 없습니다.'); return }
    u.onerror = (ev) => {
      const err = (ev as SpeechSynthesisErrorEvent).error
      if (err === 'interrupted' || err === 'canceled') return
      if (nonceRef.current === myNonce) setError('낭독 중 오류가 발생했습니다.')
    }
    window.setTimeout(() => {
      if (nonceRef.current !== myNonce) return
      try { window.speechSynthesis.speak(u) } catch { setError('낭독을 시작할 수 없습니다.') }
    }, 0)
  }

  // 한 인물의 목소리 점검용 샘플 발화
  const testVoice = (member: CastMember) => {
    speakOne(member, `안녕하세요, 저는 ${member.name} 입니다. 이 목소리로 대사를 읽어 드릴게요.`)
  }

  // 화자 → 음성 프로필 해석(내레이션은 기본 프로필)
  const profileForSpeaker = (speakerId: string): { profile: VoiceProfile } => {
    if (speakerId === NARRATOR_ID) return { profile: defaultProfile() }
    const c = castRef.current.find(c => c.id === speakerId)
    return { profile: c ? c.profile : defaultProfile() }
  }

  // 대본 전체 순차 낭독(세션 nonce 로 경쟁상태 방지) — 한 줄 끝나면 다음 줄.
  const speakLineAt = (idx: number, myNonce: number) => {
    if (!ttsSupported()) return
    const arr = linesRef.current
    if (idx >= arr.length) {
      if (nonceRef.current === myNonce) { setStatus('idle'); setActiveLine(-1) }
      return
    }
    const line = arr[idx]
    if (!line.text.trim()) { speakLineAt(idx + 1, myNonce); return } // 빈 줄 건너뜀
    const { profile } = profileForSpeaker(line.speaker)
    const u = makeUtterance(line.text, profile)
    if (!u) { setError('이 환경에서는 음성 합성을 사용할 수 없습니다.'); setStatus('idle'); return }
    u.onstart = () => { if (nonceRef.current === myNonce) setActiveLine(idx) }
    u.onend = () => { if (nonceRef.current === myNonce) speakLineAt(idx + 1, myNonce) }
    u.onerror = (ev) => {
      if (nonceRef.current !== myNonce) return
      const err = (ev as SpeechSynthesisErrorEvent).error
      if (err === 'interrupted' || err === 'canceled') return
      setError('낭독 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setStatus('idle'); setActiveLine(-1)
    }
    try { window.speechSynthesis.speak(u) } catch { setError('낭독을 시작할 수 없습니다.'); setStatus('idle') }
  }

  const playAll = (fromIdx = 0) => {
    setError('')
    if (!supported) return
    const arr = linesRef.current
    if (arr.length === 0 || arr.every(l => !l.text.trim())) { showFlash('읽을 대사가 없어요. 먼저 대본을 작성하세요.'); return }
    const myNonce = ++nonceRef.current
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    setStatus('playing'); setActiveLine(-1)
    window.setTimeout(() => {
      if (nonceRef.current !== myNonce) return
      speakLineAt(fromIdx, myNonce)
    }, 0)
  }

  const togglePause = () => {
    if (!supported) return
    try {
      if (status === 'playing') { window.speechSynthesis.pause(); setStatus('paused') }
      else if (status === 'paused') { window.speechSynthesis.resume(); setStatus('playing') }
    } catch { /* graceful */ }
  }

  const stop = () => {
    nonceRef.current++
    try { if (supported) window.speechSynthesis.cancel() } catch { /* noop */ }
    setStatus('idle'); setActiveLine(-1)
  }

  // ───────────── 연계: 프로젝트/수집함 ─────────────
  const speakerName = (id: string): string => id === NARRATOR_ID ? '내레이션' : (castRef.current.find(c => c.id === id)?.name || '인물')
  const scriptPlainText = (): string => lines.map(l => l.speaker === NARRATOR_ID ? l.text : `${speakerName(l.speaker)}: ${l.text}`).join('\n')

  const sendToProject = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트가 연결되어 있지 않아요.'); return }
    if (lines.length === 0) { showFlash('대본이 비어 있어요.'); return }
    const bodyHtml = lines.map(l => {
      if (l.speaker === NARRATOR_ID) return `<p><i>${esc(l.text)}</i></p>`
      return `<p><b>${esc(speakerName(l.speaker))}</b>: ${esc(l.text)}</p>`
    }).join('')
    const id = addToProject({
      root: 'draft',
      folder: '대본 리딩',
      title: title.trim() || '대본 리딩',
      bodyHtml,
      meta: { 출연: cast.map(c => c.name).join(', ') || '—', 줄수: String(lines.length) },
    })
    showFlash(id ? '프로젝트 원고에 대본을 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashScript = () => {
    if (!hasStash()) { showFlash('수집함을 사용할 수 없어요.'); return }
    if (lines.length === 0) { showFlash('대본이 비어 있어요.'); return }
    addToStash({ kind: 'note', label: title.trim() || '대본 리딩', text: scriptPlainText() })
    showFlash('수집함에 대본을 담았어요.')
  }

  // ───────────── 파생 데이터 ─────────────
  const koVoices = voices.filter(v => /^ko/i.test(v.lang))
  const otherVoices = voices.filter(v => !/^ko/i.test(v.lang))
  // 라이브러리에 있으나 아직 출연하지 않은 인물(빠른 합류 후보)
  const libCandidates = libChars.filter(ch => ch.name && !cast.some(c => c.id === 'lib:' + ch.id))
  const lineCountByPlaying = status !== 'idle' && activeLine >= 0 ? `${activeLine + 1}/${lines.length}` : ''

  // ───────────── 스타일(인라인 + CSS 변수) ─────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }
  const inputStyle: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }
  const selectStyle: React.CSSProperties = { background: 'var(--chrome-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 7px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }
  const note: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const warnBox: React.CSSProperties = { fontSize: 13, color: 'var(--warn)', lineHeight: 1.6 }
  const sliderWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }
  const sliderLabel: React.CSSProperties = { width: 40, flexShrink: 0 }
  const sliderVal: React.CSSProperties = { width: 38, textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const chip = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 })

  // ───────────── 미지원 환경 graceful ─────────────
  if (!supported) {
    return (
      <div style={wrap}>
        <div style={{ ...panel, gap: 10 }}>
          <div style={sectionTitle}><Emoji e="🎙️" /> 캐릭터 음성 보드</div>
          <div style={warnBox}>
            이 환경에서는 음성 합성(Web Speech speechSynthesis)을 사용할 수 없습니다.
            헤드리스 브라우저이거나 지원하지 않는 브라우저일 수 있습니다.
          </div>
          <div style={note}>
            Chrome·Edge·Safari 등 최신 데스크톱 브라우저에서 다시 시도하면, 인물마다 목소리를 정해 두고
            대사를 그 인물의 목소리로 낭독하거나 여러 인물의 대사를 순차로 읽어 주는 대본 리딩을 쓸 수 있어요.
            아래에서 대본을 미리 작성해 두는 것은 지금도 가능합니다.
          </div>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="대본 제목" aria-label="대본 제목" />
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {/* 제목 + 전체 재생 컨트롤 */}
      <div style={panel}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: 1, minWidth: 160, fontWeight: 600 }} value={title} onChange={e => setTitle(e.target.value)} placeholder="대본 제목" aria-label="대본 제목" />
          {status === 'idle' ? (
            <button className="btn-primary" onClick={() => playAll(0)} disabled={lines.length === 0}><Emoji e="▶" /> 전체 리딩</button>
          ) : (
            <button className="btn-primary" onClick={togglePause}>{status === 'paused' ? <><Emoji e="▶" /> 이어 재생</> : <><Emoji e="⏸" /> 일시정지</>}</button>
          )}
          <button className="minibtn" onClick={stop} disabled={status === 'idle'}><Emoji e="⏹" /> 정지</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={note}>
            {status === 'playing' && `리딩 중 ${lineCountByPlaying}`}
            {status === 'paused' && '일시정지됨'}
            {status === 'idle' && `출연 ${cast.length}명 · 대사 ${lines.length}줄`}
          </span>
          {voices.length === 0 && <span style={note}>· 목소리 불러오는 중…</span>}
        </div>
        {error && <div style={warnBox}><Emoji e="⚠" /> {error}</div>}
      </div>

      {/* 출연진(cast) */}
      <div style={panel}>
        <div style={sectionTitle}><Emoji e="🎭" /> 출연진 <span style={{ ...note, fontWeight: 400 }}>· 인물마다 목소리를 지정하세요</span></div>

        {cast.length === 0 && <div style={note}>아직 출연진이 없어요. 아래에서 인물을 추가하거나, 라이브러리 인물을 합류시키세요.</div>}

        {cast.map((m) => {
          const open = editingVoice === m.id
          const sel = m.profile.voiceURI ?? (pickVoiceForProfile(m.profile)?.voiceURI ?? '')
          return (
            <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={chip(m.color)} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                {m.fromLibrary && <span className="license-badge" title="공유 인물 라이브러리에서 합류">라이브러리</span>}
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => testVoice(m)} title="이 목소리로 시범 낭독"><Emoji e="🔊" /> 들어보기</button>
                <button className="minibtn" onClick={() => setEditingVoice(open ? null : m.id)} title="목소리/속도/높이 설정">{open ? <>▲ 닫기</> : <><Emoji e="🎚" /> 음성 설정</>}</button>
                <button className="minibtn danger" onClick={() => removeCast(m.id)} title="출연진에서 제외">✕</button>
              </div>

              {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...note, width: 40, flexShrink: 0 }}>목소리</span>
                    <select
                      style={{ ...selectStyle, flex: 1, minWidth: 120 }}
                      value={m.profile.voiceURI ?? sel}
                      onChange={e => patchProfile(m.id, { voiceURI: e.target.value || null })}
                      aria-label={`${m.name} 목소리 선택`}
                    >
                      {koVoices.length > 0 && (
                        <optgroup label="한국어">
                          {koVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                        </optgroup>
                      )}
                      {otherVoices.length > 0 && (
                        <optgroup label="기타 언어">
                          {otherVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div style={sliderWrap}>
                    <span style={sliderLabel}>속도</span>
                    <input type="range" min={0.5} max={2} step={0.1} value={m.profile.rate} onChange={e => patchProfile(m.id, { rate: Number(e.target.value) })} style={{ flex: 1, accentColor: m.color }} aria-label={`${m.name} 속도`} />
                    <span style={sliderVal}>{m.profile.rate.toFixed(1)}x</span>
                  </div>
                  <div style={sliderWrap}>
                    <span style={sliderLabel}>높이</span>
                    <input type="range" min={0} max={2} step={0.1} value={m.profile.pitch} onChange={e => patchProfile(m.id, { pitch: Number(e.target.value) })} style={{ flex: 1, accentColor: m.color }} aria-label={`${m.name} 높이`} />
                    <span style={sliderVal}>{m.profile.pitch.toFixed(1)}</span>
                  </div>
                  <div style={sliderWrap}>
                    <span style={sliderLabel}>음량</span>
                    <input type="range" min={0} max={1} step={0.05} value={m.profile.volume} onChange={e => patchProfile(m.id, { volume: Number(e.target.value) })} style={{ flex: 1, accentColor: m.color }} aria-label={`${m.name} 음량`} />
                    <span style={sliderVal}>{Math.round(m.profile.volume * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 직접 추가 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustomCast() }}
            placeholder="인물 이름 추가(예: 지우)"
            aria-label="출연진 이름 추가"
          />
          <button className="minibtn" onClick={addCustomCast} disabled={!newName.trim()}>+ 출연 추가</button>
        </div>

        {/* 라이브러리 인물 빠른 합류 */}
        {libCandidates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={note}>라이브러리에서 합류:</span>
            {libCandidates.slice(0, 12).map(ch => (
              <button key={ch.id} className="linkbtn" onClick={() => addFromLibrary(ch)} title={`'${ch.name}'를 출연진에 추가`}><Emoji e="👤" /> {ch.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* 대본(script) */}
      <div style={{ ...panel, flex: 1, minHeight: 160 }}>
        <div style={sectionTitle}>
          <Emoji e="📜" /> 대본
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={() => setPasteOpen(o => !o)} title="‘이름: 대사’ 형식의 글을 붙여넣어 일괄 추가"><Emoji e="📥" /> 붙여넣기 가져오기</button>
          <button className="minibtn danger" onClick={clearScript} disabled={lines.length === 0} title="대본 비우기"><Emoji e="🗑" /> 비우기</button>
        </div>

        {pasteOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px dashed var(--border)', borderRadius: 8, padding: 8 }}>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={'대본을 붙여넣으세요. 예)\n지우: 너 정말 갈 거야?\n도현: 어쩔 수 없잖아.\n(설명·지문은 그대로 내레이션으로 들어갑니다.)'}
              aria-label="대본 붙여넣기"
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" onClick={() => { ingestPaste(pasteText); setPasteText(''); setPasteOpen(false) }} disabled={!pasteText.trim()}>가져오기</button>
              <button className="minibtn" onClick={() => { setPasteText(''); setPasteOpen(false) }}>취소</button>
              <span style={note}>‘이름: 대사’는 해당 인물 대사로, 없는 이름은 출연진에 자동 추가됩니다.</span>
            </div>
          </div>
        )}

        {/* 줄 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lines.length === 0 && <div style={note}>아직 대사가 없어요. 아래에서 화자를 고르고 대사를 입력해 추가하세요.</div>}
          {lines.map((l, i) => {
            const isActive = i === activeLine
            const c = l.speaker === NARRATOR_ID ? null : cast.find(x => x.id === l.speaker)
            const col = c?.color || 'var(--muted)'
            return (
              <div
                key={l.id}
                style={{
                  display: 'flex', gap: 6, alignItems: 'flex-start',
                  border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                  background: isActive ? 'color-mix(in srgb, var(--accent) 14%, var(--paper))' : 'var(--paper)',
                  borderLeft: '3px solid ' + col,
                  borderRadius: 8, padding: '6px 7px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                  <select
                    style={{ ...selectStyle, maxWidth: 110 }}
                    value={l.speaker}
                    onChange={e => updateLineSpeaker(l.id, e.target.value)}
                    aria-label={`${i + 1}번째 줄 화자`}
                  >
                    <option value={NARRATOR_ID}>🎬 내레이션</option>
                    {cast.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="minibtn" style={{ padding: '1px 5px' }} onClick={() => moveLine(i, -1)} disabled={i === 0} title="위로">▲</button>
                    <button className="minibtn" style={{ padding: '1px 5px' }} onClick={() => moveLine(i, 1)} disabled={i === lines.length - 1} title="아래로">▼</button>
                  </div>
                </div>
                <textarea
                  style={{ ...inputStyle, flex: 1, minHeight: 38, resize: 'vertical', lineHeight: 1.5 }}
                  value={l.text}
                  onChange={e => updateLineText(l.id, e.target.value)}
                  aria-label={`${i + 1}번째 대사`}
                  spellCheck={false}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                  <button
                    className="minibtn"
                    style={{ padding: '2px 6px' }}
                    onClick={() => { if (c) speakOne(c, l.text); else speakOne(makeCast('내레이션', 0, { id: NARRATOR_ID }), l.text) }}
                    title="이 줄만 낭독"
                  ><Emoji e="🔊" /></button>
                  <button className="minibtn danger" style={{ padding: '2px 6px' }} onClick={() => removeLine(l.id)} title="줄 삭제">✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 새 줄 작성 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
          <select style={{ ...selectStyle, maxWidth: 110, flexShrink: 0 }} value={draftSpeaker} onChange={e => setDraftSpeaker(e.target.value)} aria-label="새 줄 화자">
            <option value={NARRATOR_ID}>🎬 내레이션</option>
            {cast.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <textarea
            style={{ ...inputStyle, flex: 1, minHeight: 38, resize: 'vertical', lineHeight: 1.5 }}
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addLine() } }}
            placeholder="대사 입력 후 + 줄 추가 (Ctrl+Enter)"
            aria-label="새 대사"
            spellCheck={false}
          />
          <button className="minibtn" style={{ flexShrink: 0 }} onClick={addLine} disabled={!draftText.trim()}>+ 줄</button>
        </div>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        {hasProjectBridge() && (
          <button className="linkbtn" onClick={sendToProject} disabled={lines.length === 0} title="대본을 프로젝트 원고에 문서로 추가"><Emoji e="📄" /> 프로젝트에 추가</button>
        )}
        {hasStash() && (
          <button className="linkbtn" onClick={stashScript} disabled={lines.length === 0} title="대본을 수집함에 메모로 담기"><Emoji e="🧺" /> 수집함에 담기</button>
        )}
        <span style={{ flex: 1 }} />
        <span style={note}>대본을 귀로 들으면 대사 톤·호흡·인물별 말맛 차이가 잘 드러납니다.</span>
      </div>

      {flash && <div className="license-note" style={{ color: 'var(--ok)' }}>{flash}</div>}
    </div>
  )
}
