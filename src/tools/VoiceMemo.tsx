// 음성 메모 — MediaRecorder 로 구술 아이디어를 녹음하고, 목록으로 보관·재생·관리한다.
//  · 녹음: 마이크 → MediaRecorder. 실시간 경과시간 + Web Audio AnalyserNode 로 라이브 파형.
//          일시정지/재개 지원. 녹음 중 화면이 꺼지지 않도록 Wake Lock(미지원 graceful).
//  · 받아쓰기(선택): 녹음과 동시에 SpeechRecognition 으로 한국어 받아쓰기를 시도(미지원 graceful).
//          인식된 텍스트는 메모의 '구술 메모'로 함께 저장되어 검색·연계에 쓰인다.
//  · 보관: 메타(제목·태그·길이·시각·텍스트)는 localStorage 영속. 오디오는 작으면 dataURL 로 함께 저장,
//          용량을 넘기면 메타만 보관(다음 새로고침엔 재생 불가)하고 그 사실을 표시한다.
//  · 재생: 인라인 <audio> 로 재생/탐색/배속. 제목·태그·텍스트 편집, 삭제, 텍스트 복사.
//  · 연계: 🧺 수집함에 담기(텍스트/오디오), 📄 프로젝트에 추가(받아쓴 텍스트를 자료 문서로).
// 권한 거부/미지원은 모두 안내만 하고 throw 하지 않는다. 언마운트 시 녹음·스트림·오디오·타이머·리스너 전부 정리.
import { useState, useEffect, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'voice-memo', name: '음성 메모', icon: '🎤', group: '집중·생산성', intro: '구술 아이디어를 녹음해 보관·재생하고 받아쓰기로 텍스트도 남깁니다', w: 560, h: 640 }

const STORE_KEY = 'sry:tool:voice-memo'
// 메모 하나의 오디오 dataURL 이 이 크기를 넘으면 영속 저장하지 않는다(localStorage 용량 보호).
const MAX_PERSIST_BYTES = 900 * 1024        // ≈ 0.9MB (인코딩 전 base64 길이 기준 근사)
// 전체 저장소가 이 크기에 가까우면 새 오디오 영속을 건너뛴다.
const MAX_TOTAL_BYTES = 4.2 * 1024 * 1024   // ≈ 4.2MB

// ---------- 자료 모델 ----------
interface Memo {
  id: string
  title: string
  tags: string[]
  text: string            // 받아쓴/직접 입력한 구술 메모
  dur: number             // 초
  created: number         // epoch ms
  mime: string            // 예: 'audio/webm'
  audio?: string          // dataURL(없으면 메타만 — 새로고침 후엔 재생 불가)
  size?: number           // 오디오 바이트(근사)
}

// ---------- 저장 ----------
function loadMemos(): Memo[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.map((m) => {
      const o = m as Partial<Memo>
      return {
        id: String(o.id || ''),
        title: String(o.title || ''),
        tags: Array.isArray(o.tags) ? o.tags.map(String) : [],
        text: String(o.text || ''),
        dur: typeof o.dur === 'number' ? o.dur : 0,
        created: typeof o.created === 'number' ? o.created : Date.now(),
        mime: String(o.mime || 'audio/webm'),
        audio: typeof o.audio === 'string' ? o.audio : undefined,
        size: typeof o.size === 'number' ? o.size : undefined,
      } as Memo
    }).filter((m) => m.id)
  } catch { return [] }
}

// 저장. 용량 초과 시 가장 오래된 메모의 오디오부터 비워 메타만 남기며 재시도한다.
function saveMemos(memos: Memo[]): { ok: boolean; trimmed: boolean } {
  let trimmed = false
  // 비휘발 사본(오래된 것부터 오디오를 떨굴 수 있게 정렬은 최신순 유지, 끝쪽이 오래된 것)
  const work = memos.map((m) => ({ ...m }))
  for (let attempt = 0; attempt < work.length + 1; attempt++) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(work))
      return { ok: true, trimmed }
    } catch {
      // 가장 오래된, 아직 오디오가 있는 메모의 오디오를 제거
      let dropped = false
      for (let i = work.length - 1; i >= 0; i--) {
        if (work[i].audio) { work[i] = { ...work[i], audio: undefined }; dropped = true; trimmed = true; break }
      }
      if (!dropped) {
        // 더 떨굴 오디오가 없으면 실패
        return { ok: false, trimmed }
      }
    }
  }
  return { ok: false, trimmed }
}

// Blob → dataURL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(r.error || new Error('read fail'))
    r.readAsDataURL(blob)
  })
}

// 지원되는 녹음 MIME 을 고른다(없으면 빈 문자열 → 브라우저 기본).
function pickMime(): string {
  const MR = (window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder
  if (!MR || typeof MR.isTypeSupported !== 'function') return ''
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg']
  for (const c of cands) { try { if (MR.isTypeSupported(c)) return c } catch {} }
  return ''
}

function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m + ':' + String(r).padStart(2, '0')
}
function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}
function fmtSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- SpeechRecognition(받아쓰기, 선택) ----------
interface SRLike {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  start: () => void; stop: () => void; abort: () => void
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}
function getSRCtor(): (new () => SRLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => SRLike; webkitSpeechRecognition?: new () => SRLike }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export default function VoiceMemo({ payload }: { payload?: Record<string, unknown> }) {
  const recSupported = typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window as unknown as { MediaRecorder?: unknown }).MediaRecorder
  const srSupported = !!getSRCtor()

  const [memos, setMemos] = useState<Memo[]>(() => loadMemos())
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)        // 녹음 경과(초)
  const [levels, setLevels] = useState<number[]>(() => new Array(48).fill(0)) // 라이브 파형
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [useDictation, setUseDictation] = useState<boolean>(srSupported)
  const [busy, setBusy] = useState(false)          // 저장 처리 중
  const [editId, setEditId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [toast, setToast] = useState('')

  // 녹음 인프라 refs
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef(0)        // performance.now 기준 시작
  const pausedAccumRef = useRef(0)      // 누적 일시정지 시간(ms)
  const pauseStartRef = useRef(0)
  const tickRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null)
  // 받아쓰기
  const srRef = useRef<SRLike | null>(null)
  const srTextRef = useRef('')          // 이번 녹음에서 받아쓴 누적 텍스트
  const srWantRef = useRef(false)
  // 재생 객체 URL 추적(언마운트 시 revoke)
  const urlMapRef = useRef<Map<string, string>>(new Map())
  // 미저장 경고를 막기 위해 진행중 여부
  const mountedRef = useRef(true)

  const flash = (m: string) => { setToast(m); window.setTimeout(() => { if (mountedRef.current) setToast('') }, 1700) }

  // payload 로 제목 시드(다른 도구에서 열 때)
  const seedTitleRef = useRef<string>('')
  useEffect(() => {
    if (payload && typeof payload.title === 'string') seedTitleRef.current = payload.title
  }, [payload])

  // ----- 영속 -----
  useEffect(() => {
    const r = saveMemos(memos)
    if (!r.ok) setNotice('저장 공간이 부족해 일부 녹음 오디오는 저장되지 않았습니다(메타만 보관).')
    else if (r.trimmed) setNotice('저장 공간 확보를 위해 오래된 녹음의 오디오가 정리되었습니다(메타는 유지).')
  }, [memos])

  // ----- 라이브 파형 -----
  const drawLoop = () => {
    const an = analyserRef.current
    if (!an) return
    const buf = new Uint8Array(an.fftSize)
    const sample = () => {
      const a = analyserRef.current
      if (!a) return
      a.getByteTimeDomainData(buf)
      // RMS → 0..1 레벨
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
      const rms = Math.sqrt(sum / buf.length)
      const level = Math.min(1, rms * 3.2)
      setLevels((prev) => {
        const next = prev.slice(1)
        next.push(level)
        return next
      })
      rafRef.current = window.requestAnimationFrame(sample)
    }
    rafRef.current = window.requestAnimationFrame(sample)
  }

  // ----- 경과 타이머 -----
  const startTick = () => {
    const tick = () => {
      const now = performance.now()
      const pausedNow = pauseStartRef.current ? (now - pauseStartRef.current) : 0
      const ms = now - startTimeRef.current - pausedAccumRef.current - pausedNow
      setElapsed(Math.max(0, ms / 1000))
      tickRef.current = window.setTimeout(tick, 200)
    }
    tickRef.current = window.setTimeout(tick, 200)
  }
  const stopTick = () => { if (tickRef.current) { clearTimeout(tickRef.current); tickRef.current = null } }

  // ----- Wake Lock -----
  const acquireWake = async () => {
    try {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      if (wl?.request) wakeRef.current = await wl.request('screen')
    } catch { /* 미지원/거부 — 무시 */ }
  }
  const releaseWake = () => { try { wakeRef.current?.release() } catch {} ; wakeRef.current = null }

  // ----- 받아쓰기 -----
  const startSR = () => {
    const Ctor = getSRCtor()
    if (!Ctor || !useDictation) return
    let sr: SRLike
    try { sr = new Ctor() } catch { return }
    sr.lang = 'ko-KR'; sr.continuous = true; sr.interimResults = false; sr.maxAlternatives = 1
    sr.onresult = (ev) => {
      let chunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) chunk += r[0]?.transcript ?? ''
      }
      const t = chunk.trim()
      if (t) {
        const base = srTextRef.current
        srTextRef.current = base + (base && !/\s$/.test(base) ? ' ' : '') + t
      }
    }
    sr.onerror = () => { /* no-speech/network 등 — 받아쓰기는 부가기능이라 무시 */ }
    sr.onend = () => { if (srWantRef.current) { try { sr.start() } catch { srWantRef.current = false } } }
    srRef.current = sr
    srWantRef.current = true
    try { sr.start() } catch { srWantRef.current = false }
  }
  const stopSR = () => {
    srWantRef.current = false
    const sr = srRef.current
    srRef.current = null
    if (sr) {
      try { sr.onresult = null; sr.onerror = null; sr.onend = null } catch {}
      try { sr.stop() } catch {}
      try { sr.abort() } catch {}
    }
  }

  // ----- 전체 녹음 그래프 해제 -----
  const teardownGraph = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try { sourceRef.current?.disconnect() } catch {}
    sourceRef.current = null
    try { analyserRef.current?.disconnect() } catch {}
    analyserRef.current = null
    const ctx = audioCtxRef.current
    audioCtxRef.current = null
    if (ctx) { try { ctx.close() } catch {} }
  }
  const stopStream = () => {
    const s = streamRef.current
    streamRef.current = null
    if (s) { for (const t of s.getTracks()) { try { t.stop() } catch {} } }
  }

  // ----- 녹음 시작 -----
  const startRecording = async () => {
    if (!recSupported) { setErr('이 브라우저(또는 환경)는 녹음(MediaRecorder)을 지원하지 않습니다.'); return }
    if (recording) return
    setErr(''); setNotice('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = (e as { name?: string })?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') setErr('마이크 권한이 거부되었습니다. 브라우저 주소창에서 마이크 권한을 허용해 주세요.')
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setErr('마이크를 찾을 수 없습니다. 마이크 연결을 확인해 주세요.')
      else setErr('마이크에 접근할 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인해 주세요.')
      return
    }
    streamRef.current = stream

    // MediaRecorder
    const mime = pickMime()
    let rec: MediaRecorder
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch {
      try { rec = new MediaRecorder(stream) } catch { setErr('녹음기를 초기화할 수 없습니다.'); stopStream(); return }
    }
    recorderRef.current = rec
    chunksRef.current = []
    rec.ondataavailable = (ev: BlobEvent) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data) }
    rec.onstop = () => { void finalizeRecording(rec.mimeType || mime || 'audio/webm') }

    // 파형용 Web Audio
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      sourceRef.current = src
      analyserRef.current = an
      drawLoop()
    } catch { /* 파형은 부가기능 — 실패해도 녹음은 진행 */ }

    // 받아쓰기
    srTextRef.current = ''
    if (useDictation && srSupported) startSR()

    // 타이머/상태
    startTimeRef.current = performance.now()
    pausedAccumRef.current = 0
    pauseStartRef.current = 0
    setElapsed(0)
    setLevels(new Array(48).fill(0))
    try { rec.start(250) } catch { try { rec.start() } catch {} }
    setRecording(true)
    setPaused(false)
    startTick()
    void acquireWake()
  }

  // ----- 일시정지/재개 -----
  const pauseRecording = () => {
    const rec = recorderRef.current
    if (!rec || !recording || paused) return
    try { rec.pause() } catch { return }
    pauseStartRef.current = performance.now()
    setPaused(true)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    srWantRef.current = false
    try { srRef.current?.stop() } catch {}
  }
  const resumeRecording = () => {
    const rec = recorderRef.current
    if (!rec || !recording || !paused) return
    try { rec.resume() } catch { return }
    if (pauseStartRef.current) { pausedAccumRef.current += performance.now() - pauseStartRef.current; pauseStartRef.current = 0 }
    setPaused(false)
    drawLoop()
    if (useDictation && srSupported) { srWantRef.current = true; try { srRef.current?.start() } catch { startSR() } }
  }

  // ----- 정지(→ finalize) -----
  const stopRecording = () => {
    const rec = recorderRef.current
    if (!rec) return
    stopTick()
    if (pauseStartRef.current) { pausedAccumRef.current += performance.now() - pauseStartRef.current; pauseStartRef.current = 0 }
    try { rec.stop() } catch { /* onstop 이 안 불릴 수 있음 */ }
    stopSR()
    releaseWake()
  }

  // 취소(저장 없이 중단)
  const cancelRecording = () => {
    const rec = recorderRef.current
    if (rec) { try { rec.onstop = null } catch {} ; try { rec.stop() } catch {} }
    recorderRef.current = null
    stopTick(); stopSR(); releaseWake(); teardownGraph(); stopStream()
    chunksRef.current = []
    srTextRef.current = ''
    setRecording(false); setPaused(false); setElapsed(0)
    setLevels(new Array(48).fill(0))
  }

  // ----- 녹음 마감: Blob 생성 → 메모로 저장 -----
  const finalizeRecording = async (mime: string) => {
    setBusy(true)
    stopTick(); teardownGraph()
    const dur = elapsedFinal()
    const want = srTextRef.current.trim()
    srTextRef.current = ''
    stopStream()
    const chunks = chunksRef.current
    chunksRef.current = []
    recorderRef.current = null
    setRecording(false); setPaused(false)

    let audio: string | undefined
    let size: number | undefined
    let blob: Blob | null = null
    try {
      blob = new Blob(chunks, { type: mime })
      size = blob.size
      if (blob.size === 0) {
        setErr('녹음된 오디오가 없습니다. 마이크 입력을 확인해 주세요.')
        setBusy(false)
        return
      }
      const totalNow = approxTotalBytes(memos)
      if (blob.size <= MAX_PERSIST_BYTES && totalNow + blob.size * 1.37 < MAX_TOTAL_BYTES) {
        audio = await blobToDataURL(blob)
      } else {
        setNotice('이 녹음은 용량이 커서 영속 저장하지 않았습니다(이번 세션에서만 재생 가능).')
        // 세션 내 재생은 객체 URL 로 가능하게 보관
      }
    } catch {
      setErr('녹음 데이터를 처리하지 못했습니다.')
      setBusy(false)
      return
    }

    const id = 'vm_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
    const baseTitle = seedTitleRef.current || ''
    seedTitleRef.current = ''
    const title = baseTitle || (want ? (want.length > 22 ? want.slice(0, 22) + '…' : want) : '음성 메모 ' + fmtDate(Date.now()))
    const memo: Memo = { id, title, tags: [], text: want, dur, created: Date.now(), mime, audio, size }

    // 영속 저장이 안 된(audio 없음) 경우에도 이번 세션 재생을 위해 객체 URL 매핑
    if (!audio && blob) {
      try { urlMapRef.current.set(id, URL.createObjectURL(blob)) } catch {}
    }

    setMemos((prev) => [memo, ...prev])
    setBusy(false)
    setEditId(id)
    flash('녹음을 저장했습니다' + (audio ? '' : ' (메타만 영속)'))
  }

  // finalize 시점의 정확한 길이(state 가 비동기라 ref 로 재계산)
  const elapsedFinal = (): number => {
    const now = performance.now()
    const ms = now - startTimeRef.current - pausedAccumRef.current
    return Math.max(0, ms / 1000)
  }

  // 저장소 사용량 근사(dataURL 길이 합)
  function approxTotalBytes(list: Memo[]): number {
    let n = 0
    for (const m of list) { if (m.audio) n += m.audio.length }
    return n
  }

  // ----- 재생용 src 얻기(영속 dataURL 우선, 없으면 세션 객체 URL) -----
  const srcFor = (m: Memo): string | undefined => m.audio || urlMapRef.current.get(m.id)

  // ----- 메모 편집/삭제 -----
  const patchMemo = (id: string, patch: Partial<Memo>) => {
    setMemos((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  const removeMemo = (id: string) => {
    const u = urlMapRef.current.get(id)
    if (u) { try { URL.revokeObjectURL(u) } catch {} ; urlMapRef.current.delete(id) }
    setMemos((prev) => prev.filter((m) => m.id !== id))
    if (editId === id) setEditId(null)
  }
  const clearAll = () => {
    if (!memos.length) return
    if (!window.confirm('저장된 음성 메모를 모두 삭제할까요? 되돌릴 수 없습니다.')) return
    for (const u of urlMapRef.current.values()) { try { URL.revokeObjectURL(u) } catch {} }
    urlMapRef.current.clear()
    setMemos([])
    setEditId(null)
  }

  // ----- 다운로드 -----
  const download = (m: Memo) => {
    const src = srcFor(m)
    if (!src) { flash('이 메모는 다운로드할 오디오가 없습니다'); return }
    try {
      const a = document.createElement('a')
      a.href = src
      const ext = m.mime.includes('mp4') ? 'm4a' : m.mime.includes('ogg') ? 'ogg' : m.mime.includes('mpeg') ? 'mp3' : 'webm'
      a.download = (m.title || 'voice-memo').replace(/[\\/:*?"<>|]+/g, '_') + '.' + ext
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch { flash('다운로드에 실패했습니다') }
  }

  // ----- 텍스트 복사 -----
  const copyText = async (m: Memo) => {
    const t = m.text.trim()
    if (!t) { flash('받아쓴 텍스트가 없습니다'); return }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(t)
      else {
        const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('텍스트를 복사했습니다')
    } catch { flash('복사에 실패했습니다') }
  }

  // ----- 연계: 수집함 -----
  const stashText = (m: Memo) => {
    const t = m.text.trim()
    if (!t) { flash('받아쓴 텍스트가 없습니다'); return }
    addToStash({ kind: 'memo', label: m.title || '음성 메모', text: t })
    flash('수집함에 담았습니다(텍스트)')
  }
  const stashAudio = (m: Memo) => {
    const src = srcFor(m)
    if (!src) { flash('담을 오디오가 없습니다'); return }
    addToStash({ kind: 'audio', label: (m.title || '음성 메모') + ' · ' + fmtDur(m.dur), url: src, mime: m.mime, text: m.text.trim() || undefined })
    flash('수집함에 담았습니다(오디오)')
  }

  // ----- 연계: 프로젝트 -----
  const toProject = (m: Memo) => {
    const t = m.text.trim()
    const bodyHtml = t
      ? t.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
      : `<p><i>받아쓴 텍스트가 없는 음성 메모(길이 ${esc(fmtDur(m.dur))}).</i></p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '음성 메모',
      title: m.title || '음성 메모 ' + fmtDate(m.created),
      bodyHtml,
      meta: { 출처: '음성 메모', 길이: fmtDur(m.dur), 녹음일시: fmtDate(m.created), 태그: m.tags.join(', ') },
    })
    flash(id ? '프로젝트 자료에 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  // ----- 언마운트 정리 -----
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // 녹음 중이면 핸들러 떼고 중단(저장 시도 안 함)
      const rec = recorderRef.current
      if (rec) { try { rec.ondataavailable = null; rec.onstop = null } catch {} ; try { rec.stop() } catch {} }
      recorderRef.current = null
      stopTick(); stopSR(); releaseWake(); teardownGraph(); stopStream()
      for (const u of urlMapRef.current.values()) { try { URL.revokeObjectURL(u) } catch {} }
      urlMapRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- 파생: 필터된 목록 -----
  const q = filter.trim().toLowerCase()
  const filtered = q
    ? memos.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.text.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)))
    : memos

  // ===================== 스타일 =====================
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const recCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const dot: React.CSSProperties = {
    width: 12, height: 12, borderRadius: '50%',
    background: recording && !paused ? 'var(--warn)' : paused ? '#e0a31e' : 'var(--muted)',
    boxShadow: recording && !paused ? '0 0 0 5px color-mix(in srgb, var(--warn) 22%, transparent)' : 'none',
    flex: '0 0 auto', animation: recording && !paused ? 'vm-pulse 1.2s ease-in-out infinite' : 'none',
  }
  const timer: React.CSSProperties = { fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }
  const waveBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 2, height: 48, padding: '0 2px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }
  const btnRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const errStyle: React.CSSProperties = { fontSize: 12.5, color: 'var(--warn)', lineHeight: 1.5, background: 'color-mix(in srgb, var(--warn) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)', borderRadius: 8, padding: '8px 10px' }
  const noticeStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 10px' }
  const sectionHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }
  const list: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const titleInput: React.CSSProperties = { font: 'inherit', fontWeight: 600, fontSize: 14, color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '1px dashed transparent', outline: 'none', padding: '2px 0', flex: 1, minWidth: 0 }
  const metaLine: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }
  const ta: React.CSSProperties = { font: 'inherit', fontSize: 13, lineHeight: 1.6, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', resize: 'vertical', minHeight: 54, width: '100%', boxSizing: 'border-box' }
  const tag: React.CSSProperties = { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent-2)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }
  const searchInput: React.CSSProperties = { font: 'inherit', fontSize: 13, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', width: 160 }

  // 정지/취소 중 라이브 영역 표시 여부
  const showLive = recording

  return (
    <div style={wrap}>
      <style>{`@keyframes vm-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* ===== 녹음 카드 ===== */}
      <div style={recCard}>
        <div style={headRow}>
          <span style={dot} aria-hidden />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {recording ? (paused ? '일시정지됨' : '녹음 중…') : '대기 중 — 녹음을 시작하세요'}
          </span>
          <span style={{ ...timer, marginLeft: 'auto' }}>{fmtDur(elapsed)}</span>
        </div>

        {showLive && (
          <div style={waveBox} aria-hidden>
            {levels.map((lv, i) => {
              const h = Math.max(3, Math.round(lv * 44))
              return (
                <div key={i} style={{
                  flex: 1, height: h, borderRadius: 2,
                  background: paused ? 'var(--muted)' : 'linear-gradient(var(--accent), var(--accent-2))',
                  transition: 'height .08s linear', alignSelf: 'center',
                }} />
              )
            })}
          </div>
        )}

        {!recording ? (
          <div style={btnRow}>
            <button className="btn-primary" onClick={startRecording} disabled={!recSupported || busy} style={{ minWidth: 130 }}>
              ● 녹음 시작
            </button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)', cursor: srSupported ? 'pointer' : 'not-allowed', opacity: srSupported ? 1 : 0.6 }}>
              <input type="checkbox" checked={useDictation && srSupported} disabled={!srSupported} onChange={(e) => setUseDictation(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              받아쓰기 동시 진행{srSupported ? '' : '(미지원)'}
            </label>
          </div>
        ) : (
          <div style={btnRow}>
            {!paused
              ? <button className="minibtn" onClick={pauseRecording}><Emoji e="⏸" /> 일시정지</button>
              : <button className="minibtn" onClick={resumeRecording}>▶ 재개</button>}
            <button className="btn-primary" onClick={stopRecording} style={{ minWidth: 110 }}><Emoji e="⏹" /> 정지·저장</button>
            <button className="minibtn danger" onClick={cancelRecording}>✕ 취소</button>
            {useDictation && srSupported && <span style={{ fontSize: 11.5, color: 'var(--muted)', alignSelf: 'center' }}><Emoji e="📝" /> 받아쓰는 중</span>}
          </div>
        )}

        {err && <div style={errStyle}>{err}</div>}
        {notice && <div style={noticeStyle}>{notice}</div>}
        {!recSupported && !err && (
          <div style={errStyle}>이 브라우저(또는 현재 환경)에서는 녹음을 사용할 수 없습니다. Chrome·Edge 등에서 마이크 권한을 허용해 주세요.</div>
        )}
        {busy && <div style={hint}>저장 처리 중…</div>}
      </div>

      {/* ===== 목록 ===== */}
      <div style={sectionHead}>
        <b style={{ fontSize: 14 }}>보관된 메모 <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{memos.length}</span></b>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {memos.length > 0 && (
            <input style={searchInput} placeholder="검색(제목·태그·내용)" value={filter} onChange={(e) => setFilter(e.target.value)} />
          )}
          {memos.length > 0 && <button className="minibtn danger" onClick={clearAll} title="모든 메모 삭제"><Emoji e="🗑" /> 전체삭제</button>}
        </div>
      </div>

      {memos.length === 0 ? (
        <div style={{ ...card, alignItems: 'center', textAlign: 'center', color: 'var(--muted)', padding: 22 }}>
          아직 저장된 음성 메모가 없습니다.{'\n'}떠오른 아이디어를 말로 녹음해 두면 여기에 쌓입니다.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, color: 'var(--muted)' }}>검색 결과가 없습니다.</div>
      ) : (
        <div style={list}>
          {filtered.map((m) => {
            const open = editId === m.id
            const src = srcFor(m)
            const persisted = !!m.audio
            return (
              <div key={m.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}><Emoji e="🎤" /></span>
                  <input
                    style={titleInput}
                    value={m.title}
                    onChange={(e) => patchMemo(m.id, { title: e.target.value })}
                    onFocus={(e) => (e.target.style.borderBottomColor = 'var(--border)')}
                    onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                    aria-label="메모 제목"
                  />
                  <button className="minibtn" onClick={() => setEditId(open ? null : m.id)} title="펼치기/접기">{open ? '▲' : '▼'}</button>
                </div>

                <div style={metaLine}>
                  <span><Emoji e="⏱" /> {fmtDur(m.dur)}</span>
                  <span><Emoji e="🕒" /> {fmtDate(m.created)}</span>
                  {m.size ? <span><Emoji e="💾" /> {fmtSize(m.size)}</span> : null}
                  {!persisted && <span style={{ color: 'var(--warn)' }}><Emoji e="⚠" /> 메타만 저장(새로고침 후 재생 불가)</span>}
                  {m.text.trim() && <span><Emoji e="📝" /> 텍스트 {m.text.trim().length}자</span>}
                </div>

                {m.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.tags.map((t, i) => <span key={i} style={tag}>#{t}</span>)}
                  </div>
                )}

                {src ? (
                  <audio controls src={src} style={{ width: '100%' }} preload="none" />
                ) : (
                  <div style={hint}>재생할 오디오가 없습니다(영속 저장되지 않은 메모입니다).</div>
                )}

                {open && (
                  <>
                    <textarea
                      style={ta}
                      value={m.text}
                      placeholder="구술 메모(받아쓴 내용을 다듬거나 직접 입력)…"
                      onChange={(e) => patchMemo(m.id, { text: e.target.value })}
                    />
                    <input
                      style={{ ...searchInput, width: '100%', boxSizing: 'border-box' }}
                      placeholder="태그(쉼표로 구분)"
                      value={m.tags.join(', ')}
                      onChange={(e) => patchMemo(m.id, { tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    />
                    <div style={btnRow}>
                      <button className="minibtn" onClick={() => copyText(m)}><Emoji e="📋" /> 텍스트 복사</button>
                      <button className="minibtn" onClick={() => download(m)} disabled={!src}>⬇ 다운로드</button>
                      <button className="minibtn danger" onClick={() => removeMemo(m.id)}><Emoji e="🗑" /> 삭제</button>
                    </div>

                    <div className="linkbar">
                      <span className="linkbar-label">연계:</span>
                      <button
                        className="linkbtn"
                        onClick={() => stashText(m)}
                        disabled={!hasStash() || !m.text.trim()}
                        title={!hasStash() ? '수집함을 사용할 수 없습니다' : (!m.text.trim() ? '받아쓴 텍스트가 없습니다' : '받아쓴 텍스트를 수집함에 담기')}
                      ><Emoji e="🧺" /> 텍스트 담기</button>
                      <button
                        className="linkbtn"
                        onClick={() => stashAudio(m)}
                        disabled={!hasStash() || !src}
                        title={!hasStash() ? '수집함을 사용할 수 없습니다' : (!src ? '담을 오디오가 없습니다' : '오디오를 수집함에 담기')}
                      ><Emoji e="🧺" /> 오디오 담기</button>
                      <button
                        className="linkbtn"
                        onClick={() => toProject(m)}
                        disabled={!hasProjectBridge()}
                        title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '받아쓴 텍스트를 프로젝트 자료 문서로 추가'}
                      ><Emoji e="📄" /> 프로젝트에 추가</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={hint}>
        녹음 메타(제목·태그·길이·텍스트)는 이 브라우저에 보관됩니다. 오디오는 용량이 작으면 함께 저장되어
        다시 열어도 재생할 수 있고, 너무 크면 메타만 저장됩니다. 마이크 권한이 필요하며 네트워크·API 키는 필요 없습니다.
      </div>

      {toast && (
        <div style={{ position: 'sticky', bottom: 0, alignSelf: 'center', fontSize: 12, color: 'var(--ok)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>✓ {toast}</div>
      )}
    </div>
  )
}
