// 문장 리듬 분석·연주(Prose Rhythm) — 원고를 문장 단위로 쪼개 길이를 막대로 시각화하고,
//   Web Audio 로 "문장 길이 → 음 높이/음 길이"를 매핑해 글의 리듬을 실제 소리로 들려준다(연주).
//   짧은 문장 = 높고 빠른 음, 긴 문장 = 낮고 긴 음. 비슷한 길이만 이어지는 단조로운 구간을 자동 경고한다.
// 자급식: react 와 './linkbus' 외 import 없음. 분석은 100% 로컬(네트워크·라이브러리 불필요).
//   Web Audio 미지원 시 graceful — 시각화·분석은 그대로 동작, 연주만 비활성.
//   영속: 본문/설정은 localStorage 'sry:tool:prose-rhythm' 에 자동 저장/복원.
//   언마운트 시 오디오 그래프·타이머·rAF·리스너 정리. 연계: 바인더 드래그 수용 + 프로젝트/수집함 내보내기.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = { id: 'prose-rhythm', name: '문장 리듬 연주', icon: '🎼', group: '교정·언어', intro: '원고를 문장으로 나눠 길이를 막대로 보여주고, Web Audio로 길이를 음 높이·길이에 매핑해 글의 리듬을 들려줍니다(단조 구간 경고)', w: 640, h: 720 }

const LS_KEY = 'sry:tool:prose-rhythm'

// ── 음계(스케일) 프리셋 ───────────────────────────────────────
// 짧은 문장일수록 음이 높아지도록, 낮은 음 → 높은 음 순으로 반음 오프셋을 정의(루트 기준).
interface Scale { id: string; name: string; steps: number[] }
const SCALES: Scale[] = [
  { id: 'major-pent', name: '장음계 5음(밝음)', steps: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] },
  { id: 'minor-pent', name: '단음계 5음(차분)', steps: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22] },
  { id: 'major', name: '장음계 7음', steps: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16] },
  { id: 'dorian', name: '도리안(고풍)', steps: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15] },
  { id: 'chromatic', name: '반음계(긴장)', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
]

// ── 음색(웨이브폼) 프리셋 ─────────────────────────────────────
const TIMBRES: { id: OscillatorType; name: string }[] = [
  { id: 'sine', name: '맑은(sine)' },
  { id: 'triangle', name: '부드러운(triangle)' },
  { id: 'square', name: '또렷한(square)' },
  { id: 'sawtooth', name: '풍부한(saw)' },
]

// ── 설정 ──────────────────────────────────────────────────────
interface Settings {
  scaleId: string
  timbre: OscillatorType
  root: number          // MIDI 루트 음(낮은 기준음). 48=C3
  tempo: number         // 한 음의 기본 박(ms) — 문장 길이에 비례해 늘어남
  volume: number        // 0~1
  longThreshold: number // 너무 긴 문장 기준(공백 제외 글자 수)
}
const DEFAULTS: Settings = { scaleId: 'major-pent', timbre: 'triangle', root: 50, tempo: 230, volume: 0.5, longThreshold: 40 }

// ── 문장 분리 ─────────────────────────────────────────────────
// 종결부호(. ? ! 。！？…)+공백, 또는 개행 경계로 자른다. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
// 문장 길이: 공백 제외 글자 수(체감 분량에 더 가깝다)
function visibleLen(s: string): number {
  return s.replace(/\s+/g, '').length
}

// ── 문장 정보 ─────────────────────────────────────────────────
interface SentInfo {
  idx: number
  text: string
  len: number
  isLong: boolean
  endMark: '.' | '?' | '!' | '…' | '·' // 종결부호 유형(연주 시 악센트에 사용)
}

const END_RE = /([?？!！]|[.。]{1,}|…|\.{3,})\s*$/
function endMarkOf(s: string): SentInfo['endMark'] {
  const m = s.match(END_RE)
  if (!m) return '·'
  const t = m[1]
  if (/[?？]/.test(t)) return '?'
  if (/[!！]/.test(t)) return '!'
  if (t === '…' || /\.{3,}/.test(t)) return '…'
  return '.'
}

// ── 분석 ──────────────────────────────────────────────────────
interface Analysis {
  sents: SentInfo[]
  n: number
  total: number
  avg: number
  max: number
  min: number
  stdev: number
  cv: number           // 변동계수(표준편차/평균) — 리듬의 다양성 지표
  longCount: number
  monotony: MonotonyRun[]
  rhythmScore: number  // 0~100, 리듬 다양성 점수
}
// 단조로운 구간: 길이가 평균 대비 좁은 폭(±tolerance) 안에서 minRun개 이상 연달아 이어지는 구간
interface MonotonyRun { start: number; end: number; count: number; avgLen: number }

function detectMonotony(sents: SentInfo[]): MonotonyRun[] {
  const runs: MonotonyRun[] = []
  if (sents.length < 4) return runs
  const MIN_RUN = 4        // 4문장 이상 연속이면 단조 후보
  const TOL = 6            // 인접 문장 길이 차가 이 값 이하이면 "비슷한 길이"
  let i = 0
  while (i < sents.length) {
    let j = i
    while (j + 1 < sents.length && Math.abs(sents[j + 1].len - sents[j].len) <= TOL) j++
    const count = j - i + 1
    if (count >= MIN_RUN) {
      const slice = sents.slice(i, j + 1)
      const avgLen = slice.reduce((a, s) => a + s.len, 0) / count
      runs.push({ start: i, end: j, count, avgLen })
    }
    i = j + 1
  }
  return runs
}

function analyze(text: string, longThreshold: number): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const raw = splitSentences(trimmed)
  if (raw.length === 0) return null
  const sents: SentInfo[] = raw.map((s, idx) => {
    const len = visibleLen(s)
    return { idx, text: s, len, isLong: len >= longThreshold, endMark: endMarkOf(s) }
  })
  const lengths = sents.map((s) => s.len)
  const n = sents.length
  const total = lengths.reduce((a, b) => a + b, 0)
  const avg = total / n
  const max = Math.max(...lengths)
  const min = Math.min(...lengths)
  const variance = lengths.reduce((a, b) => a + (b - avg) * (b - avg), 0) / n
  const stdev = Math.sqrt(variance)
  const cv = avg > 0 ? stdev / avg : 0
  const longCount = sents.filter((s) => s.isLong).length
  const monotony = detectMonotony(sents)
  // 리듬 점수: 변동계수(다양성)를 0~100으로 환산하되, 단조 구간이 길수록 감점.
  const monoPenalty = monotony.reduce((a, m) => a + m.count, 0)
  const base = Math.max(0, Math.min(100, cv * 140)) // cv 0.7 부근이면 100 근처
  const penalty = n > 0 ? Math.min(45, (monoPenalty / n) * 60) : 0
  const rhythmScore = Math.round(Math.max(0, Math.min(100, base - penalty)))
  return { sents, n, total, avg, max, min, stdev, cv, longCount, monotony, rhythmScore }
}

// ── MIDI → 주파수 ─────────────────────────────────────────────
function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12)
}

// 문장 길이 → 스케일 음정 인덱스(짧을수록 높은 음).
// 길이를 [min,max] 구간에서 0~(steps-1) 로 정규화하고, 짧은 문장이 위(높은 인덱스)로 가도록 뒤집는다.
function lenToNoteIndex(len: number, min: number, max: number, stepCount: number): number {
  if (max <= min) return Math.floor(stepCount / 2)
  const t = (len - min) / (max - min)        // 0(짧음)~1(김)
  const inv = 1 - t                          // 짧음=1(높음)
  return Math.round(inv * (stepCount - 1))
}

// 문장 길이 → 음 길이(ms). 긴 문장일수록 오래 울린다.
function lenToDuration(len: number, min: number, max: number, tempo: number): number {
  if (max <= min) return tempo
  const t = (len - min) / (max - min)
  return Math.round(tempo * (0.6 + t * 1.4))  // 0.6배 ~ 2.0배
}

// ── 저장/복원 ─────────────────────────────────────────────────
interface SaveShape { text: string; settings: Settings }
function clampNum(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def
}
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { text: '', settings: { ...DEFAULTS } }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { text: '', settings: { ...DEFAULTS } }
    const s = p.settings || {}
    const timbre: OscillatorType = TIMBRES.some((t) => t.id === s.timbre) ? s.timbre : DEFAULTS.timbre
    const scaleId = SCALES.some((sc) => sc.id === s.scaleId) ? s.scaleId : DEFAULTS.scaleId
    return {
      text: typeof p.text === 'string' ? p.text : '',
      settings: {
        scaleId, timbre,
        root: clampNum(s.root, 36, 72, DEFAULTS.root),
        tempo: clampNum(s.tempo, 90, 600, DEFAULTS.tempo),
        volume: clampNum(s.volume, 0, 1, DEFAULTS.volume),
        longThreshold: clampNum(s.longThreshold, 20, 120, DEFAULTS.longThreshold),
      },
    }
  } catch { return { text: '', settings: { ...DEFAULTS } } }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const SAMPLE = `밤이 깊었다. 그는 창가에 섰다. 멀리서 개가 짖었다.
바람이 불었고, 나뭇잎이 흔들렸으며, 그 소리는 마치 누군가 조용히 흐느끼는 것처럼 길고 가늘게 이어져 방 안의 정적을 천천히 갉아먹었다.
그녀가 물었다. "왜 안 자?" 대답은 없었다. 시계가 세 번 울렸다.`

export default function ProseRhythm({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [text, setText] = useState(() => {
    const fromPayload = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    return fromPayload || init.current.text
  })
  const [settings, setSettings] = useState<Settings>(init.current.settings)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null) // 연주 중 강조할 문장 인덱스
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // refs
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([])
  const stepTimer = useRef<number | null>(null)
  const playState = useRef<{ i: number; sents: SentInfo[]; min: number; max: number } | null>(null)

  const supported = typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

  // ── 분석(메모) ──────────────────────────────────────────────
  const analysis = useMemo(() => analyze(text, settings.longThreshold), [text, settings.longThreshold])

  // ── 영속(자동 저장, graceful) ───────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, settings } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [text, settings])

  // ── 토스트 자동 소거 ────────────────────────────────────────
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2200)
    return () => window.clearTimeout(t)
  }, [saved])

  // ── 마스터 볼륨 즉시 반영 ──────────────────────────────────
  useEffect(() => {
    const g = masterRef.current, ctx = ctxRef.current
    if (g && ctx) { try { g.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.02) } catch { g.gain.value = settings.volume } }
  }, [settings.volume])

  // ── 정리: 진행 중인 모든 오디오 노드·타이머 해제 ─────────────
  const stopAllNodes = () => {
    const arr = nodesRef.current
    nodesRef.current = []
    for (const n of arr) {
      try { n.osc.stop() } catch { /* noop */ }
      try { n.osc.disconnect() } catch { /* noop */ }
      try { n.gain.disconnect() } catch { /* noop */ }
    }
  }
  const stopPlayback = () => {
    if (stepTimer.current != null) { clearTimeout(stepTimer.current); stepTimer.current = null }
    stopAllNodes()
    playState.current = null
    if (mounted.current) { setPlaying(false); setCurrent(null) }
    try { ctxRef.current?.suspend() } catch { /* noop */ }
  }

  // ── 한 음 재생 ──────────────────────────────────────────────
  const playNote = (ctx: AudioContext, master: GainNode, freq: number, durMs: number, accent: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = settings.timbre
    osc.frequency.value = freq
    const now = ctx.currentTime
    const dur = durMs / 1000
    const peak = Math.max(0.04, Math.min(1, 0.55 * accent))
    // ADSR(짧은 어택, 부드러운 릴리즈)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.012)
    gain.gain.setValueAtTime(peak, now + Math.max(0.02, dur * 0.5))
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + dur + 0.05)
    const entry = { osc, gain }
    nodesRef.current.push(entry)
    // 끝난 노드는 목록에서 제거(메모리 정리)
    osc.onended = () => {
      try { osc.disconnect() } catch { /* noop */ }
      try { gain.disconnect() } catch { /* noop */ }
      nodesRef.current = nodesRef.current.filter((x) => x !== entry)
    }
  }

  // ── 시퀀스 진행(한 문장 → 한 음) ───────────────────────────
  const scale = useMemo(() => SCALES.find((s) => s.id === settings.scaleId) || SCALES[0], [settings.scaleId])
  const tick = () => {
    const ctx = ctxRef.current, master = masterRef.current, st = playState.current
    if (!ctx || !master || !st) { stopPlayback(); return }
    if (st.i >= st.sents.length) { stopPlayback(); return }
    const s = st.sents[st.i]
    const noteIdx = lenToNoteIndex(s.len, st.min, st.max, scale.steps.length)
    const semis = scale.steps[Math.max(0, Math.min(scale.steps.length - 1, noteIdx))]
    const freq = midiToFreq(settings.root + semis)
    const dur = lenToDuration(s.len, st.min, st.max, settings.tempo)
    // 종결부호별 악센트: 느낌표/물음표는 조금 강하게, 말줄임표는 여리게.
    const accent = s.endMark === '!' ? 1.25 : s.endMark === '?' ? 1.1 : s.endMark === '…' ? 0.7 : 1.0
    try { playNote(ctx, master, freq, dur, accent) } catch { /* noop */ }
    if (mounted.current) setCurrent(s.idx)
    st.i++
    // 다음 음은 현재 음 길이 + 짧은 쉼(문장 사이 호흡) 뒤에
    const gap = dur + Math.round(settings.tempo * 0.18)
    stepTimer.current = window.setTimeout(tick, gap)
  }

  const startPlay = async () => {
    if (!supported || !analysis) return
    setNote('')
    try {
      let ctx = ctxRef.current
      if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AC()
        ctxRef.current = ctx
      }
      if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* noop */ } }
      if (!masterRef.current) {
        const master = ctx.createGain()
        master.gain.value = settings.volume
        master.connect(ctx.destination)
        masterRef.current = master
      } else {
        masterRef.current.gain.value = settings.volume
      }
      // 새 시퀀스 시작
      if (stepTimer.current != null) { clearTimeout(stepTimer.current); stepTimer.current = null }
      stopAllNodes()
      playState.current = { i: 0, sents: analysis.sents, min: analysis.min, max: analysis.max }
      setPlaying(true)
      setCurrent(null)
      tick()
    } catch {
      setNote('오디오를 시작할 수 없습니다.')
      stopPlayback()
    }
  }

  const togglePlay = () => { if (playing) stopPlayback(); else startPlay() }

  // 설정(스케일/음색/루트/템포) 변경 시: 연주 중이면 다음 음부터 자연히 반영됨(state 참조). 별도 처리 불필요.

  // ── 언마운트 정리 ───────────────────────────────────────────
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (stepTimer.current != null) clearTimeout(stepTimer.current)
      stopAllNodes()
      const ctx = ctxRef.current
      ctxRef.current = null
      masterRef.current = null
      if (ctx) { try { ctx.close() } catch { /* noop */ } }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 텍스트/HTML 리포트 ──────────────────────────────────────
  const buildText = (): string => {
    const a = analysis
    if (!a) return ''
    const L: string[] = []
    L.push('[문장 리듬 분석]')
    L.push(`문장 ${a.n}개 · 총 ${a.total}자(공백 제외) · 평균 ${a.avg.toFixed(1)}자`)
    L.push(`최장 ${a.max}자 / 최단 ${a.min}자 · 길이 편차 ${a.stdev.toFixed(1)} · 다양성(CV) ${a.cv.toFixed(2)}`)
    L.push(`리듬 점수 ${a.rhythmScore}/100 · 너무 긴 문장(${settings.longThreshold}자+) ${a.longCount}개`)
    if (a.monotony.length > 0) {
      L.push('')
      L.push('— 단조로운 구간(비슷한 길이 연속) —')
      a.monotony.forEach((m) => L.push(`· ${m.start + 1}~${m.end + 1}번 문장(${m.count}개) 길이가 ${m.avgLen.toFixed(0)}자 부근으로 비슷합니다. 장·단문을 섞으면 리듬이 살아납니다.`))
    } else {
      L.push('')
      L.push('단조 경고: 없음 (장·단문이 잘 섞여 리듬이 살아 있습니다)')
    }
    return L.join('\n')
  }
  const buildHtml = (): string => {
    const a = analysis
    if (!a) return ''
    const P: string[] = []
    P.push(`<p><strong>문장 리듬 분석</strong> · 문장 ${a.n}개 · 총 ${a.total}자(공백 제외) · 평균 ${a.avg.toFixed(1)}자</p>`)
    P.push(`<p>최장 ${a.max}자 / 최단 ${a.min}자 · 길이 편차 ${a.stdev.toFixed(1)} · 다양성(CV) ${a.cv.toFixed(2)} · 리듬 점수 ${a.rhythmScore}/100</p>`)
    if (a.monotony.length > 0) {
      P.push('<p><strong>단조로운 구간(비슷한 길이 연속)</strong></p><ul>')
      a.monotony.forEach((m) => P.push(`<li>${m.start + 1}~${m.end + 1}번 문장(${m.count}개) 길이가 ${m.avgLen.toFixed(0)}자 부근으로 비슷합니다.</li>`))
      P.push('</ul>')
    } else {
      P.push('<p>단조 경고: 없음 (장·단문이 잘 섞여 리듬이 살아 있습니다)</p>')
    }
    return P.join('')
  }

  // ── 복사/내보내기 ──────────────────────────────────────────
  const markCopied = () => {
    setCopied(true)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
  }
  const fallbackCopy = (s: string): boolean => {
    try {
      const ta = document.createElement('textarea')
      ta.value = s; ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
  const copy = async () => {
    const s = buildText()
    if (!s) return
    try { await navigator.clipboard.writeText(s); markCopied() }
    catch { if (fallbackCopy(s)) markCopied(); else setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }
  const toProject = () => {
    if (!hasProjectBridge() || !analysis) return
    const a = analysis
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '문장 리듬 분석',
      bodyHtml: buildHtml(),
      meta: {
        문장수: String(a.n),
        평균길이: a.avg.toFixed(1),
        최장: String(a.max),
        최단: String(a.min),
        다양성CV: a.cv.toFixed(2),
        리듬점수: a.rhythmScore + '/100',
        단조구간: String(a.monotony.length),
      },
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    const s = buildText()
    if (!s || !hasStash()) return
    addToStash({ kind: 'note', label: '문장 리듬 분석', text: s })
    if (mounted.current) setSaved(true)
  }

  // ── 바인더 파일 드롭(본문 불러오기) ─────────────────────────
  const onDrop = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      stopPlayback()
      setText(item.text)
      setNote(`"${item.title || '문서'}" 본문을 불러왔습니다.`)
    } else if (item) {
      setNote('이 파일에는 분석할 본문 텍스트가 없습니다.')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  const a = analysis
  const monotonySet = useMemo(() => {
    const set = new Set<number>()
    if (a) for (const m of a.monotony) for (let i = m.start; i <= m.end; i++) set.add(i)
    return set
  }, [a])
  const scaleMax = a ? Math.max(a.max, 1) : 1

  // ── 스타일 ──────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const taStyle: React.CSSProperties = {
    minHeight: 110, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '24px 12px' }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const selStyle: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }
  const ctrlLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', minWidth: 58, flexShrink: 0 }

  // 리듬 점수 색
  const scoreColor = !a ? 'var(--muted)' : a.rhythmScore >= 60 ? 'var(--ok)' : a.rhythmScore >= 35 ? 'var(--accent)' : 'var(--warn)'

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🎼" /></span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>문장 리듬 연주</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => { stopPlayback(); setText(''); setNote('') }} disabled={!text}>↺ 지우기</button>
        <button className="minibtn" onClick={() => { stopPlayback(); setText(SAMPLE); setNote('예시 글을 넣었어요. ▶로 리듬을 들어보세요.') }}><Emoji e="📝" /> 예시</button>
        <button className="minibtn" onClick={copy} disabled={!a} title="분석 리포트를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        {hasStash() && <button className="minibtn" onClick={toStash} disabled={!a} title="수집함에 분석 담기"><Emoji e="📥" /> 수집함</button>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || !a}
          title={hasProjectBridge() ? (a ? '자료 › 구조 폴더에 리듬 분석으로 추가' : '먼저 본문을 입력하세요') : '프로젝트에 연결되지 않았습니다'}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 분석을 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {!supported && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>이 브라우저는 Web Audio를 지원하지 않아 연주는 비활성됩니다. 시각화·분석은 그대로 사용할 수 있어요.</div>}

      <div style={body}>
        {/* 입력 */}
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          placeholder={'원고를 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.\n\n문장 부호(. ? !)와 줄바꿈으로 문장을 나눠 길이를 막대로 보여주고, ▶로 리듬을 들려줍니다.'}
          spellCheck={false}
          aria-label="문장 리듬 분석 원고 입력"
        />

        {/* 연주 컨트롤 */}
        <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={togglePlay}
            disabled={!supported || !a}
            style={{ minWidth: 132 }}
            title={!supported ? 'Web Audio 미지원' : !a ? '먼저 본문을 입력하세요' : playing ? '연주 정지' : '문장 리듬 연주'}
          >
            {playing ? '⏹ 정지' : '▶ 리듬 연주'}
          </button>
          {playing && current != null && a && (
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              ♪ {current + 1} / {a.n} 번째 문장
            </span>
          )}
          <span style={{ flex: 1 }} />
          <div style={row}>
            <span style={{ fontSize: 13 }}><Emoji e="🔊" /></span>
            <input type="range" min={0} max={1} step={0.01} value={settings.volume}
              onChange={(e) => setSettings((s) => ({ ...s, volume: parseFloat(e.target.value) }))}
              disabled={!supported}
              style={{ width: 90, accentColor: 'var(--accent)' }} aria-label="볼륨" />
          </div>
          <button className="minibtn" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
            {showSettings ? '⚙ 설정 ▲' : '⚙ 설정 ▼'}
          </button>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={row}>
              <span style={ctrlLabel}>음계</span>
              <select style={selStyle} value={settings.scaleId} onChange={(e) => setSettings((s) => ({ ...s, scaleId: e.target.value }))}>
                {SCALES.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              <span style={ctrlLabel}>음색</span>
              <select style={selStyle} value={settings.timbre} onChange={(e) => setSettings((s) => ({ ...s, timbre: e.target.value as OscillatorType }))}>
                {TIMBRES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={ctrlLabel}>음 높이</span>
              <input type="range" min={36} max={66} step={1} value={settings.root}
                onChange={(e) => setSettings((s) => ({ ...s, root: parseInt(e.target.value, 10) }))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="기준 음 높이" />
              <span style={{ ...hint, minWidth: 46, textAlign: 'right' }}>{settings.root <= 47 ? '낮게' : settings.root >= 58 ? '높게' : '보통'}</span>
            </div>
            <div style={row}>
              <span style={ctrlLabel}>빠르기</span>
              <input type="range" min={120} max={520} step={10} value={settings.tempo}
                onChange={(e) => setSettings((s) => ({ ...s, tempo: parseInt(e.target.value, 10) }))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="빠르기" />
              <span style={{ ...hint, minWidth: 46, textAlign: 'right' }}>{settings.tempo <= 200 ? '빠름' : settings.tempo >= 380 ? '느림' : '보통'}</span>
            </div>
            <div style={row}>
              <span style={ctrlLabel}>긴 문장</span>
              <input type="range" min={25} max={90} step={1} value={settings.longThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, longThreshold: parseInt(e.target.value, 10) }))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="긴 문장 기준" />
              <span style={{ ...hint, minWidth: 46, textAlign: 'right' }}>{settings.longThreshold}자+</span>
            </div>
            <div style={hint}>짧은 문장 = 높고 빠른 음 · 긴 문장 = 낮고 긴 음. 종결부호(! ? …)에 따라 셈여림이 달라집니다.</div>
          </div>
        )}

        {!a ? (
          <div style={empty}>
            원고를 입력하면 문장마다 길이 막대가 그려지고<br />
            평균·최장·최단·리듬 점수가 표시됩니다.<br />
            ▶ 버튼으로 글의 리듬을 소리로 들어볼 수 있어요.
          </div>
        ) : (
          <>
            {/* 요약 */}
            <div style={grid4}>
              <div style={stat}><div style={statVal}>{a.n}</div><div style={statLabel}>문장 수</div></div>
              <div style={stat}><div style={statVal}>{a.avg.toFixed(1)}</div><div style={statLabel}>평균 길이</div></div>
              <div style={stat}><div style={statVal}>{a.stdev.toFixed(1)}</div><div style={statLabel}>길이 편차</div></div>
              <div style={stat}><div style={{ ...statVal, color: scoreColor }}>{a.rhythmScore}</div><div style={statLabel}>리듬 점수</div></div>
            </div>

            {/* 단조 경고 */}
            {a.monotony.length > 0 ? (
              <div style={{ ...panel, borderLeft: '3px solid var(--warn)' }}>
                <div style={sectionTitle}><Emoji e="⚠️" /> 단조로운 구간 ({a.monotony.length}) — 비슷한 길이가 연달아 이어집니다</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {a.monotony.map((m, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--warn)', background: 'var(--chrome-2)', borderRadius: 6, padding: '1px 6px' }}>
                        {m.start + 1}~{m.end + 1}번
                      </span>
                      <span style={{ minWidth: 0 }}>{m.count}문장이 {m.avgLen.toFixed(0)}자 부근으로 비슷합니다. 사이에 짧은(또는 긴) 문장을 넣어 리듬을 살려 보세요.</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...panel, borderLeft: '3px solid var(--ok)', color: 'var(--ok)', fontSize: 13, fontWeight: 600 }}>
                ✓ 단조로운 구간이 없습니다. 장·단문이 잘 섞여 리듬이 살아 있어요.
              </div>
            )}

            {/* 문장별 길이 막대 + 연주 강조 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}><Emoji e="📊" /> 문장별 길이 (공백 제외 글자 수)</span>
                <span style={hint}>최장 {a.max}자 · 최단 {a.min}자</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {a.sents.map((s) => {
                  const pct = Math.max(2, Math.round((s.len / scaleMax) * 100))
                  const isCur = current === s.idx
                  const inMono = monotonySet.has(s.idx)
                  const color = s.isLong ? 'var(--warn)' : 'var(--accent)'
                  return (
                    <div key={s.idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: isCur ? 'var(--chrome-2)' : 'transparent',
                        borderRadius: 6, padding: '1px 2px', transition: 'background .12s',
                      }}
                      title={s.text}>
                      <div style={{ width: 26, textAlign: 'right', fontSize: 11, color: isCur ? 'var(--accent)' : 'var(--muted)', fontWeight: isCur ? 700 : 400, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{s.idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0, height: 18, background: inMono ? 'rgba(220,160,40,0.14)' : 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative', outline: isCur ? '2px solid var(--accent)' : 'none' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: isCur ? 1 : 0.85, borderRadius: 4, transition: 'width .25s' }} />
                      </div>
                      <div style={{ width: 32, textAlign: 'right', fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{s.len}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ ...hint, marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span><span style={{ color: 'var(--accent)' }}>■</span> 보통 문장</span>
                <span><span style={{ color: 'var(--warn)' }}>■</span> {settings.longThreshold}자+ 긴 문장</span>
                <span><span style={{ background: 'rgba(220,160,40,0.5)', padding: '0 6px', borderRadius: 3 }}>　</span> 단조 구간</span>
              </div>
            </div>

            {/* 리듬 점수 설명 */}
            <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...sectionTitle, marginBottom: 4 }}><Emoji e="🎵" /> 리듬 점수 {a.rhythmScore}/100</div>
                <div style={{ height: 10, background: 'var(--chrome-2)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${a.rhythmScore}%`, height: '100%', background: scoreColor, borderRadius: 6, transition: 'width .25s' }} />
                </div>
                <div style={{ ...hint, marginTop: 6 }}>
                  장·단문이 다양하게 섞일수록(길이 변동계수가 클수록) 점수가 높습니다. 비슷한 길이만 이어지면 낮아져요.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={hint}>모든 소리는 브라우저에서 직접 생성됩니다(네트워크·파일 불필요). 분석은 정규식 기반 근사값입니다.</div>
              <button className="btn-primary" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 분석 복사</>}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
