// 글감 룰렛 휠 — 회전하는 원형 휠(SVG)에 글감 요소를 넣고 돌려서 무작위 당첨 → 글감 문장을 만든다.
//  · 여러 휠(인물/장소/사건/사물/감정 등)을 동시에 두고, 각 휠은 항목을 자유 편집(추가/수정/삭제/색)할 수 있다.
//  · 개별 휠 굴리기 + 전체 굴리기. 결과 잠금(🔒) 지원. 당첨 요소를 템플릿으로 엮어 한 줄 글감 생성.
//  · 굴린 글감은 히스토리에 쌓이고, 스니펫 라이브러리·수집함·프로젝트(영감 메모)로 보낼 수 있다.
// 자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 만 import.
//  · Web Audio(스핀 틱 소리)·speechSynthesis(글감 낭독)는 미지원 시 graceful. requestAnimationFrame/타이머/오디오는 언마운트 시 정리.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  addToLibrary, addToStash, hasStash,
  addToProject, hasProjectBridge,
  openToolLinked, TOOL_RELATIONS,
  Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'prompt-wheel',
  name: '글감 룰렛 휠',
  icon: '🎡',
  group: '영감·발상',
  intro: '회전하는 룰렛 휠을 돌려 무작위 글감을 뽑고, 여러 휠의 당첨을 엮어 한 줄 글감을 만드세요',
  w: 880,
  h: 680,
}

const LS = 'sry:tool:prompt-wheel'

// ---------- 색 팔레트(세그먼트 배경) ----------
const PALETTE = [
  '#e0607a', '#e0a96a', '#d9c84a', '#6fb86a', '#5fc9a3',
  '#56b6c2', '#5b86e0', '#7b6ee0', '#b06ed8', '#d86ea8',
  '#c98a5a', '#8aa05a',
]

// 텍스트 대비를 위한 단순 명도 판단(흰/검 선택)
function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#1b1b1b' : '#ffffff'
}

// ---------- 데이터 모델 ----------
interface Seg { id: string; text: string; color: string }
interface Wheel {
  id: string
  name: string
  icon: string
  // 글감 조합 시 이 휠의 역할(연결어 템플릿용). 자유 텍스트.
  role: string
  segs: Seg[]
  enabled: boolean
  // 현재 당첨 세그먼트 인덱스(-1 = 미당첨). 화면 회전 각도는 별도.
  winner: number
  angle: number      // 누적 회전 각(deg)
  locked: boolean    // 잠금 시 전체 굴리기에서 제외(결과 유지)
}

function uid(p: string) {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}
function mkSeg(text: string, i: number): Seg {
  return { id: uid('s'), text, color: PALETTE[i % PALETTE.length] }
}
function recolor(segs: Seg[]): Seg[] {
  return segs.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }))
}

// ---------- 기본 휠 프리셋(충분히 다양하게) ----------
function preset(name: string, icon: string, role: string, items: string[]): Wheel {
  return {
    id: uid('w'),
    name, icon, role,
    segs: items.map((t, i) => mkSeg(t, i)),
    enabled: true, winner: -1, angle: 0, locked: false,
  }
}
function defaultWheels(): Wheel[] {
  return [
    preset('인물', '🧑', '주인공', [
      '늙은 등대지기', '도망친 신부', '말 못 하는 소년', '퇴역한 마술사', '거짓말쟁이 점쟁이',
      '기억을 잃은 형사', '비를 부르는 여자', '시간을 파는 상인', '폐교의 마지막 교사', '떠돌이 시계공',
    ]),
    preset('장소', '🗺️', '무대', [
      '안개 낀 항구', '문 닫은 놀이공원', '지하 도서관', '눈 덮인 산장', '밤의 종착역',
      '바닷속 우체국', '버려진 천문대', '끝없는 계단의 집', '시간이 멈춘 마을', '구름 위의 등대',
    ]),
    preset('사건', '⚡', '사건', [
      '갑작스러운 정전', '오지 않는 막차', '사라진 이웃', '한 통의 협박 전화', '예고 없는 폭설',
      '뒤바뀐 가방', '되풀이되는 하루', '한밤중의 노크', '멈춰버린 모든 시계', '돌연 사라진 그림자',
    ]),
    preset('사물', '🔑', '단서', [
      '멈춘 회중시계', '주인 없는 편지', '깨진 거울 조각', '낡은 오르골', '이름이 지워진 열쇠',
      '말을 거는 라디오', '녹슨 나침반', '봉인된 유리병', '낯선 사진 한 장', '울리지 않는 종',
    ]),
    preset('감정', '💗', '정서', [
      '말하지 못한 죄책감', '오래된 그리움', '서늘한 안도', '되돌릴 수 없는 후회', '낯선 질투',
      '잔잔한 체념', '조용한 용서', '뒤늦은 깨달음', '벅찬 해방감', '이유 없는 불안',
    ]),
  ]
}

// ---------- 글감 문장 조합 ----------
// 역할(role) 키워드에 맞춰 자연스러운 연결어를 붙인다(휴리스틱).
function composeLine(parts: { wheel: Wheel; text: string }[]): string {
  if (!parts.length) return '휠을 돌려 글감을 뽑아보세요.'
  const byRole = (r: string) => parts.find((p) => p.wheel.role.includes(r) || p.wheel.name.includes(r))?.text
  const person = byRole('인물') || byRole('주인공')
  const place = byRole('장소') || byRole('무대')
  const event = byRole('사건')
  const object = byRole('단서') || byRole('사물')
  const emotion = byRole('감정') || byRole('정서')
  // 핵심 역할이 충분하면 템플릿 문장, 아니면 단순 나열.
  const used = new Set<string>()
  const seg: string[] = []
  if (person) { seg.push(`「${person}」`); used.add(person) }
  if (place) { seg.push(`${place}에서`); used.add(place) }
  if (event) { seg.push(`${event}을(를) 마주하고`); used.add(event) }
  if (object) { seg.push(`${object}을(를) 두고`); used.add(object) }
  if (emotion) { seg.push(`${emotion}에 휩싸인다`); used.add(emotion) }
  // 템플릿에 안 들어간 나머지(커스텀 휠)는 괄호로 덧붙임
  const extras = parts.filter((p) => !used.has(p.text)).map((p) => `${p.wheel.icon} ${p.text}`)
  let line = seg.join(' ')
  if (!line) line = parts.map((p) => p.text).join(' · ')
  else if (!emotion) line += ' — 이야기를 시작해 보세요.'
  if (extras.length) line += `  (${extras.join(' / ')})`
  return line
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface HistItem { id: string; line: string; picks: { name: string; icon: string; text: string }[]; t: number }

// ---------- 영속 상태 ----------
interface Persist { wheels: Wheel[]; history: HistItem[]; soundOn: boolean }

function loadPersist(): Persist {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>
      if (p && Array.isArray(p.wheels) && p.wheels.length) {
        const wheels: Wheel[] = p.wheels
          .filter((w) => w && Array.isArray(w.segs))
          .map((w) => ({
            id: typeof w.id === 'string' ? w.id : uid('w'),
            name: typeof w.name === 'string' ? w.name : '휠',
            icon: typeof w.icon === 'string' ? w.icon : '🎡',
            role: typeof w.role === 'string' ? w.role : '',
            segs: recolor((w.segs as Seg[]).filter((s) => s && typeof s.text === 'string')
              .map((s) => ({ id: typeof s.id === 'string' ? s.id : uid('s'), text: String(s.text), color: typeof s.color === 'string' ? s.color : '#888' }))),
            enabled: w.enabled !== false,
            winner: -1, angle: 0, locked: !!w.locked,
          }))
          .filter((w) => w.segs.length > 0)
        if (wheels.length) {
          const history: HistItem[] = Array.isArray(p.history)
            ? p.history.filter((h) => h && typeof h.line === 'string').slice(0, 60).map((h) => ({
                id: typeof h.id === 'string' ? h.id : uid('h'),
                line: String(h.line),
                picks: Array.isArray(h.picks) ? h.picks : [],
                t: typeof h.t === 'number' ? h.t : Date.now(),
              }))
            : []
          return { wheels, history, soundOn: p.soundOn !== false }
        }
      }
    }
  } catch { /* ignore */ }
  return { wheels: defaultWheels(), history: [], soundOn: true }
}

// 이징(감속) — 처음 빠르고 끝에서 천천히 멈춤
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3) }

export default function PromptWheel({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Persist>(loadPersist())
  const [wheels, setWheels] = useState<Wheel[]>(init.current.wheels)
  const [history, setHistory] = useState<HistItem[]>(init.current.history)
  const [soundOn, setSoundOn] = useState<boolean>(init.current.soundOn)
  const [tab, setTab] = useState<'wheels' | 'history'>('wheels')
  const [editing, setEditing] = useState<string | null>(null) // 편집 중인 휠 id
  const [toast, setToast] = useState('')
  const [spinningIds, setSpinningIds] = useState<string[]>([])
  const [line, setLine] = useState('휠을 돌려 글감을 뽑아보세요.')
  const [speaking, setSpeaking] = useState(false)

  // payload 로 초기 토픽/항목 주입(선택) — 예: openToolLinked('prompt-wheel', { addItems:['x','y'], toWheel:'인물' })
  const payloadDone = useRef(false)

  // ---- 애니메이션/오디오 자원 ----
  const rafRef = useRef<Map<string, number>>(new Map())
  const audioRef = useRef<AudioContext | null>(null)
  const tickGapRef = useRef<Map<string, number>>(new Map())  // 마지막 틱 발생 누적각 추적
  const toastTimer = useRef<number | null>(null)

  // ---------- 영속 저장(디바운스 없이 변경 시 즉시; 단 angle/winner 등 휘발 필드는 제외) ----------
  useEffect(() => {
    const slim: Persist = {
      wheels: wheels.map((w) => ({ ...w, angle: 0, winner: -1, locked: w.locked })),
      history,
      soundOn,
    }
    try { localStorage.setItem(LS, JSON.stringify(slim)) } catch { /* 용량 초과 graceful */ }
  }, [wheels, history, soundOn])

  // ---------- 토스트 ----------
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }, [])

  // ---------- 오디오 틱(미지원 graceful) ----------
  const ensureAudio = useCallback((): AudioContext | null => {
    if (!soundOn) return null
    try {
      if (!audioRef.current) {
        const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        if (!Ctor) return null
        audioRef.current = new Ctor()
      }
      if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => {})
      return audioRef.current
    } catch { return null }
  }, [soundOn])

  const playTick = useCallback((pitch = 1) => {
    const ctx = ensureAudio()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = 320 * pitch + Math.random() * 60
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.07)
    } catch { /* noop */ }
  }, [ensureAudio])

  const playWin = useCallback(() => {
    const ctx = ensureAudio()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      ;[523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = f
        const start = now + i * 0.08
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)
        osc.connect(gain).connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.3)
      })
    } catch { /* noop */ }
  }, [ensureAudio])

  // ---------- 언마운트 정리 ----------
  useEffect(() => {
    const rafs = rafRef.current
    return () => {
      rafs.forEach((id) => cancelAnimationFrame(id))
      rafs.clear()
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      try { if ('speechSynthesis' in window) window.speechSynthesis.cancel() } catch { /* noop */ }
      const ctx = audioRef.current
      if (ctx) { try { ctx.close() } catch { /* noop */ } audioRef.current = null }
    }
  }, [])

  // soundOn 끄면 오디오 컨텍스트 닫기(리소스 절약)
  useEffect(() => {
    if (!soundOn && audioRef.current) {
      try { audioRef.current.close() } catch { /* noop */ }
      audioRef.current = null
    }
  }, [soundOn])

  // ---------- 글감 한 줄 재계산(당첨 결과 기반) ----------
  const recomputeLine = useCallback((ws: Wheel[]) => {
    const parts = ws
      .filter((w) => w.enabled && w.winner >= 0 && w.segs[w.winner])
      .map((w) => ({ wheel: w, text: w.segs[w.winner].text }))
    setLine(composeLine(parts))
  }, [])

  // ---------- 스핀(한 휠) ----------
  // 목표: winner 인덱스를 무작위로 정하고, 포인터(위쪽 12시)에 그 세그먼트가 오도록 각도 애니메이션.
  const spinWheel = useCallback((wheelId: string, opts?: { silentLine?: boolean }): Promise<number> => {
    return new Promise((resolve) => {
      setWheels((prev) => {
        const idx = prev.findIndex((w) => w.id === wheelId)
        if (idx < 0) { resolve(-1); return prev }
        const w = prev[idx]
        if (w.segs.length === 0) { resolve(-1); return prev }
        if (rafRef.current.has(wheelId)) { resolve(w.winner); return prev } // 이미 도는 중

        const n = w.segs.length
        const segAng = 360 / n
        const target = Math.floor(Math.random() * n)
        // 포인터는 12시(위). 세그먼트 i 의 중앙이 위로 오려면 angle ≡ -(i*segAng + segAng/2) (mod 360)
        const desiredMod = ((-(target * segAng + segAng / 2)) % 360 + 360) % 360
        const curMod = ((w.angle % 360) + 360) % 360
        const turns = 4 + Math.floor(Math.random() * 3) // 4~6바퀴
        let delta = desiredMod - curMod
        if (delta < 0) delta += 360
        const totalDelta = turns * 360 + delta
        const from = w.angle
        const to = w.angle + totalDelta
        const dur = 2600 + Math.random() * 900
        const startT = performance.now()
        tickGapRef.current.set(wheelId, from)

        const step = (now: number) => {
          const t = Math.min(1, (now - startT) / dur)
          const eased = easeOutCubic(t)
          const ang = from + totalDelta * eased
          // 틱 사운드: 세그먼트 경계를 지날 때마다
          const lastTickAng = tickGapRef.current.get(wheelId) ?? from
          if (ang - lastTickAng >= segAng) {
            tickGapRef.current.set(wheelId, lastTickAng + segAng)
            playTick(1 + (1 - t) * 0.4)
          }
          setWheels((cur) => cur.map((x) => (x.id === wheelId ? { ...x, angle: ang } : x)))
          if (t < 1) {
            rafRef.current.set(wheelId, requestAnimationFrame(step))
          } else {
            rafRef.current.delete(wheelId)
            tickGapRef.current.delete(wheelId)
            playWin()
            setWheels((cur) => {
              const next = cur.map((x) => (x.id === wheelId ? { ...x, angle: to, winner: target } : x))
              if (!opts?.silentLine) recomputeLine(next)
              return next
            })
            setSpinningIds((s) => s.filter((id) => id !== wheelId))
            resolve(target)
          }
        }
        setSpinningIds((s) => (s.includes(wheelId) ? s : [...s, wheelId]))
        rafRef.current.set(wheelId, requestAnimationFrame(step))
        return prev.map((x) => (x.id === wheelId ? { ...x, angle: from } : x))
      })
    })
  }, [playTick, playWin, recomputeLine])

  // ---------- 전체 굴리기(잠금/비활성 제외) ----------
  const spinAll = useCallback(async () => {
    const targets = wheels.filter((w) => w.enabled && !w.locked && w.segs.length > 0 && !rafRef.current.has(w.id))
    if (!targets.length) { showToast('굴릴 수 있는 휠이 없습니다(잠금/비활성 제외).'); return }
    // 살짝 시차를 두고 동시 출발(시각적으로 풍성)
    await Promise.all(targets.map((w, i) => new Promise<number>((res) => {
      window.setTimeout(() => { spinWheel(w.id, { silentLine: true }).then(res) }, i * 90)
    })))
    // 모든 휠 결과로 라인 재계산은 spinWheel 내 마지막 완료가 처리하지만, 잠긴 휠 결과까지 포함하려면 한 번 더.
    setWheels((cur) => { recomputeLine(cur); return cur })
  }, [wheels, spinWheel, recomputeLine, showToast])

  // payload 항목 주입 처리
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const items = Array.isArray(payload.addItems) ? (payload.addItems as unknown[]).map(String).filter(Boolean) : []
    const toWheelName = typeof payload.toWheel === 'string' ? payload.toWheel : ''
    if (items.length) {
      setWheels((prev) => {
        const idx = toWheelName ? prev.findIndex((w) => w.name === toWheelName) : 0
        const target = idx >= 0 ? idx : 0
        if (!prev[target]) return prev
        return prev.map((w, i) => {
          if (i !== target) return w
          const segs = recolor([...w.segs, ...items.map((t, k) => mkSeg(t, w.segs.length + k))])
          return { ...w, segs }
        })
      })
      showToast(`항목 ${items.length}개를 휠에 추가했습니다.`)
    }
  }, [payload, showToast])

  // ---------- 휠 편집 동작 ----------
  const updateWheel = (id: string, patch: Partial<Wheel>) =>
    setWheels((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))

  const addSeg = (id: string, text: string) => {
    const t = text.trim()
    if (!t) return
    setWheels((prev) => prev.map((w) => (w.id === id
      ? { ...w, segs: recolor([...w.segs, mkSeg(t, w.segs.length)]) }
      : w)))
  }
  const editSeg = (wid: string, sid: string, text: string) =>
    setWheels((prev) => prev.map((w) => (w.id === wid
      ? { ...w, segs: w.segs.map((s) => (s.id === sid ? { ...s, text } : s)) }
      : w)))
  const removeSeg = (wid: string, sid: string) =>
    setWheels((prev) => prev.map((w) => {
      if (w.id !== wid) return w
      const segs = recolor(w.segs.filter((s) => s.id !== sid))
      return { ...w, segs, winner: -1 }
    }))

  const addWheel = () => {
    const w = preset('새 휠', '🎯', '', ['항목 1', '항목 2', '항목 3', '항목 4'])
    setWheels((prev) => [...prev, w])
    setEditing(w.id)
    setTab('wheels')
  }
  const removeWheel = (id: string) => {
    setWheels((prev) => prev.length <= 1 ? prev : prev.filter((w) => w.id !== id))
    if (editing === id) setEditing(null)
  }
  const resetWheels = () => {
    setWheels(defaultWheels())
    setEditing(null)
    setLine('휠을 돌려 글감을 뽑아보세요.')
    showToast('기본 휠로 초기화했습니다.')
  }

  // ---------- 결과 처리 ----------
  const picks = useMemo(() => wheels
    .filter((w) => w.enabled && w.winner >= 0 && w.segs[w.winner])
    .map((w) => ({ name: w.name, icon: w.icon, text: w.segs[w.winner].text })),
    [wheels])
  const hasResult = picks.length > 0

  const saveToHistory = useCallback(() => {
    if (!hasResult) { showToast('먼저 휠을 굴려 결과를 만들어주세요.'); return }
    const h: HistItem = { id: uid('h'), line, picks, t: Date.now() }
    setHistory((prev) => [h, ...prev].slice(0, 60))
    showToast('히스토리에 글감을 저장했습니다.')
  }, [hasResult, line, picks, showToast])

  const copyLine = () => {
    if (!hasResult) return
    const text = picks.map((p) => `${p.icon} ${p.name}: ${p.text}`).join('\n') + `\n\n✍️ ${line}`
    navigator.clipboard?.writeText(text)
      .then(() => showToast('클립보드에 복사했습니다.'))
      .catch(() => showToast('이 환경에서는 복사가 지원되지 않습니다.'))
  }

  const speakLine = () => {
    if (!('speechSynthesis' in window)) { showToast('이 브라우저는 음성 합성을 지원하지 않습니다.'); return }
    try {
      const synth = window.speechSynthesis
      if (speaking) { synth.cancel(); setSpeaking(false); return }
      synth.cancel()
      const u = new SpeechSynthesisUtterance(line)
      u.lang = 'ko-KR'
      u.rate = 0.98
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      synth.speak(u)
    } catch { setSpeaking(false); showToast('낭독을 시작하지 못했습니다.') }
  }

  const saveSnippet = (text: string, pk: { name: string; icon: string; text: string }[]) => {
    addToLibrary('snippets', {
      text,
      source: '글감 룰렛 휠',
      tags: ['글감', '룰렛', '발상', ...pk.map((p) => p.name)],
    })
    showToast('스니펫 라이브러리에 글감을 저장했습니다.')
  }

  const stashLine = (text: string) => {
    if (!hasStash()) { showToast('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'memo', label: '글감 룰렛', text })
    showToast('수집함에 담았습니다.')
  }

  const toProject = (text: string, pk: { name: string; icon: string; text: string }[]) => {
    if (!hasProjectBridge()) { showToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = pk.map((p) => `<p><b>${escHtml(p.icon)} ${escHtml(p.name)}:</b> ${escHtml(p.text)}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '영감 메모',
      title: `🎡 ${text.slice(0, 40)}`,
      bodyHtml: `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escHtml(text)}</b></p><hr/>${rows}`,
      synopsis: pk.map((p) => `${p.name}: ${p.text}`).join(' / '),
      meta: { 출처: '글감 룰렛 휠', 요소수: String(pk.length) },
    })
    showToast(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  const removeHist = (id: string) => setHistory((prev) => prev.filter((h) => h.id !== id))
  const clearHist = () => { setHistory([]); showToast('히스토리를 비웠습니다.') }

  // ---------- 연계 관련 도구 ----------
  const related = (TOOL_RELATIONS['prompt-wheel'] || ['story-dice', 'plot-twist-deck', 'character-sheet', 'setting-bible'])
  const relNames: Record<string, string> = {
    'story-dice': '🎲 스토리 주사위', 'plot-twist-deck': '🃏 반전 카드덱',
    'character-sheet': '🧑‍🎤 인물 시트', 'setting-bible': '🏛️ 배경 설정집',
    'scene-list': '🎬 장면 목록', 'card-draw-story': '🃏 카드 뽑기 서사',
  }

  // ================= 렌더 =================
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 상단 탭 + 전역 동작 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setTab('wheels')} aria-pressed={tab === 'wheels'}
          style={{ borderColor: tab === 'wheels' ? 'var(--accent)' : 'var(--border)', color: tab === 'wheels' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎡" /> 휠 ({wheels.length})
        </button>
        <button className="minibtn" onClick={() => setTab('history')} aria-pressed={tab === 'history'}
          style={{ borderColor: tab === 'history' ? 'var(--accent)' : 'var(--border)', color: tab === 'history' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="📜" /> 히스토리 ({history.length})
        </button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setSoundOn((s) => !s)} title="스핀 효과음"
          style={{ borderColor: soundOn ? 'var(--accent)' : 'var(--border)' }}>
          {soundOn ? <><Emoji e="🔊" /> 소리</> : <><Emoji e="🔇" /> 소리</>}
        </button>
        <button className="minibtn" onClick={addWheel} title="새 휠 추가">＋ 휠</button>
        <button className="minibtn danger" onClick={resetWheels} title="기본 휠로 초기화">↺ 초기화</button>
      </div>

      {tab === 'wheels' && (
        <>
          {/* 휠 그리드 */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
              {wheels.map((w) => (
                <WheelCard
                  key={w.id}
                  w={w}
                  spinning={spinningIds.includes(w.id)}
                  editing={editing === w.id}
                  onSpin={() => spinWheel(w.id)}
                  onToggleEdit={() => setEditing((e) => (e === w.id ? null : w.id))}
                  onToggleEnabled={() => updateWheel(w.id, { enabled: !w.enabled })}
                  onToggleLock={() => updateWheel(w.id, { locked: !w.locked })}
                  onRemove={() => removeWheel(w.id)}
                  canRemove={wheels.length > 1}
                  onRename={(name) => updateWheel(w.id, { name })}
                  onIcon={(icon) => updateWheel(w.id, { icon })}
                  onRole={(role) => updateWheel(w.id, { role })}
                  onAddSeg={(t) => addSeg(w.id, t)}
                  onEditSeg={(sid, t) => editSeg(w.id, sid, t)}
                  onRemoveSeg={(sid) => removeSeg(w.id, sid)}
                />
              ))}
            </div>
          </div>

          {/* 전체 굴리기 + 글감 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-primary" onClick={spinAll} style={{ fontSize: 15, padding: '10px' }}>
              <Emoji e="🎡" /> 전체 굴리기 (잠금·비활성 제외)
            </button>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span><Emoji e="✍️" /> 글감</span>
                {hasResult && (
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
                    {picks.map((p, i) => <span key={i}>{i > 0 ? ' ' : ''}<Emoji e={p.icon} /></span>)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: hasResult ? 'var(--text)' : 'var(--muted)', minHeight: 24 }}>{emojify(line)}</div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="minibtn" onClick={copyLine} disabled={!hasResult}><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={speakLine} disabled={!hasResult}
                  style={{ borderColor: speaking ? 'var(--accent)' : 'var(--border)' }}>
                  {speaking ? <><Emoji e="⏹" /> 멈춤</> : <><Emoji e="🔈" /> 낭독</>}
                </button>
                <button className="minibtn" onClick={saveToHistory} disabled={!hasResult}><Emoji e="📜" /> 히스토리</button>
                <span style={{ flex: 1 }} />
                <button className="linkbtn" onClick={() => saveSnippet(line, picks)} disabled={!hasResult} title="스니펫 라이브러리에 저장"><Emoji e="📌" /> 스니펫</button>
                <button className="linkbtn" onClick={() => stashLine(line)} disabled={!hasResult || !hasStash()}
                  title={!hasStash() ? '수집함을 사용할 수 없습니다' : '수집함에 담기'}><Emoji e="🧺" /> 수집함</button>
                <button className="linkbtn" onClick={() => toProject(line, picks)} disabled={!hasResult || !hasProjectBridge()}
                  title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '프로젝트 자료(영감 메모)에 추가'}><Emoji e="📄" /> 프로젝트에 추가</button>
              </div>
            </div>

            {/* 연계 도구 */}
            <div className="linkbar">
              <span className="linkbar-label">연계:</span>
              {related.map((id) => (
                <button key={id} className="linkbtn" onClick={() => openToolLinked(id)} title={`${relNames[id] || id} 열기`}>
                  {emojify(relNames[id] || id)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={hint}>굴려서 저장한 글감들이 쌓입니다.</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn danger" onClick={clearHist} disabled={!history.length}>전체 삭제</button>
          </div>
          {history.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="📜" /></div>
              저장한 글감이 없습니다.<br />
              <span style={{ fontSize: 12 }}>휠을 굴린 뒤 〈<Emoji e="📜" /> 히스토리〉 버튼으로 모아보세요.</span>
            </div>
          )}
          {history.map((h) => (
            <div key={h.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>{emojify(h.line)}</div>
                <button className="minibtn" onClick={() => removeHist(h.id)} title="삭제"
                  style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {h.picks.map((p, i) => <span key={i}><Emoji e={p.icon} /> {p.text}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(h.line).then(() => showToast('복사했습니다.')).catch(() => showToast('복사 미지원')) }}><Emoji e="📋" /> 복사</button>
                <button className="linkbtn" onClick={() => saveSnippet(h.line, h.picks)}><Emoji e="📌" /> 스니펫</button>
                <button className="linkbtn" onClick={() => stashLine(h.line)} disabled={!hasStash()}><Emoji e="🧺" /> 수집함</button>
                <button className="linkbtn" onClick={() => toProject(h.line, h.picks)} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}

// ================= 개별 휠 카드(SVG 휠 + 편집 패널) =================
interface WheelCardProps {
  w: Wheel
  spinning: boolean
  editing: boolean
  onSpin: () => void
  onToggleEdit: () => void
  onToggleEnabled: () => void
  onToggleLock: () => void
  onRemove: () => void
  canRemove: boolean
  onRename: (s: string) => void
  onIcon: (s: string) => void
  onRole: (s: string) => void
  onAddSeg: (t: string) => void
  onEditSeg: (sid: string, t: string) => void
  onRemoveSeg: (sid: string) => void
}

const SIZE = 220
const R = SIZE / 2

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
// 세그먼트(파이 조각) path. start/end 는 deg(0 = 12시 기준 polar 보정).
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, endDeg)
  const e = polar(cx, cy, r, startDeg)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

function WheelCard(props: WheelCardProps) {
  const { w, spinning, editing } = props
  const [newItem, setNewItem] = useState('')
  const n = w.segs.length
  const segAng = n > 0 ? 360 / n : 360
  const winnerSeg = w.winner >= 0 ? w.segs[w.winner] : null

  const dim = !w.enabled

  return (
    <div style={{
      width: SIZE + 28, background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      opacity: dim ? 0.55 : 1, position: 'relative',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}><Emoji e={w.icon} /></span>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
        <button className="minibtn" onClick={props.onToggleLock} title={w.locked ? '잠금 해제(전체 굴리기 포함)' : '잠금(전체 굴리기 제외·결과 유지)'}
          style={{ borderColor: w.locked ? 'var(--accent)' : 'var(--border)', padding: '2px 6px' }}>
          {w.locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
        <button className="minibtn" onClick={props.onToggleEnabled} title={w.enabled ? '비활성(글감에서 제외)' : '활성'}
          style={{ padding: '2px 6px' }}>{w.enabled ? <Emoji e="👁" /> : <Emoji e="🚫" />}</button>
        <button className="minibtn" onClick={props.onToggleEdit} title="항목 편집"
          style={{ borderColor: editing ? 'var(--accent)' : 'var(--border)', padding: '2px 6px' }}>✎</button>
      </div>

      {/* 휠 SVG */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE + 14, margin: '0 auto' }}>
        {/* 포인터(12시) */}
        <div style={{
          position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
          borderTop: '18px solid var(--accent)', zIndex: 3, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))',
        }} />
        <svg
          width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{
            position: 'absolute', top: 14, left: 0,
            transform: `rotate(${w.angle}deg)`,
            // 회전은 rAF 로 angle 을 직접 갱신하므로 CSS transition 없음(이중 애니 방지)
            cursor: spinning ? 'default' : 'pointer',
          }}
          onClick={() => { if (!spinning) props.onSpin() }}
          role="img"
          aria-label={`${w.name} 룰렛 휠 (항목 ${n}개)`}
        >
          {n === 0 && <circle cx={R} cy={R} r={R - 2} fill="var(--paper)" stroke="var(--border)" />}
          {w.segs.map((s, i) => {
            const start = i * segAng
            const end = (i + 1) * segAng
            const mid = start + segAng / 2
            const isWin = i === w.winner && !spinning
            const ink = readableInk(s.color)
            const labelR = R * 0.62
            const lp = polar(R, R, labelR, mid)
            const short = s.text.length > 9 ? s.text.slice(0, 8) + '…' : s.text
            return (
              <g key={s.id}>
                <path
                  d={arcPath(R, R, R - 2, start, end)}
                  fill={s.color}
                  stroke={isWin ? '#fff' : 'rgba(0,0,0,.18)'}
                  strokeWidth={isWin ? 2.5 : 1}
                  opacity={w.winner >= 0 && !spinning && !isWin ? 0.55 : 1}
                />
                <text
                  x={lp.x} y={lp.y}
                  fill={ink} fontSize={n > 10 ? 9 : 11} fontWeight={isWin ? 700 : 500}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${mid} ${lp.x.toFixed(2)} ${lp.y.toFixed(2)})`}
                  style={{ pointerEvents: 'none' }}
                >
                  {short}
                </text>
              </g>
            )
          })}
          {/* 중심 허브 */}
          <circle cx={R} cy={R} r={16} fill="var(--paper)" stroke="var(--border)" strokeWidth={2} />
          <circle cx={R} cy={R} r={5} fill="var(--accent)" />
        </svg>
      </div>

      {/* 당첨 결과 + 굴리기 */}
      <div style={{ textAlign: 'center', minHeight: 20, fontSize: 13, fontWeight: 700, color: winnerSeg ? 'var(--accent)' : 'var(--muted)' }}>
        {spinning ? '…' : winnerSeg ? winnerSeg.text : '— 굴려주세요 —'}
      </div>
      <button className="minibtn" onClick={props.onSpin} disabled={spinning || n === 0} style={{ width: '100%' }}>
        {spinning ? '도는 중…' : <><Emoji e="🎯" /> 이 휠 굴리기</>}
      </button>

      {/* 편집 패널 */}
      {editing && (
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={w.icon} onChange={(e) => props.onIcon(e.target.value.slice(0, 2))}
              aria-label="휠 아이콘" placeholder="🎯"
              style={{ width: 40, textAlign: 'center', ...inputStyle }}
            />
            <input
              value={w.name} onChange={(e) => props.onRename(e.target.value)}
              aria-label="휠 이름" placeholder="휠 이름"
              style={{ flex: 1, ...inputStyle }}
            />
          </div>
          <input
            value={w.role} onChange={(e) => props.onRole(e.target.value)}
            aria-label="역할(글감 조합용)" placeholder="역할(예: 주인공·무대·사건·단서·정서)"
            style={inputStyle}
          />
          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {w.segs.map((s) => (
              <div key={s.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <input
                  value={s.text} onChange={(e) => props.onEditSeg(s.id, e.target.value)}
                  aria-label="항목" style={{ flex: 1, ...inputStyle }}
                />
                <button className="minibtn" onClick={() => props.onRemoveSeg(s.id)} title="삭제"
                  disabled={w.segs.length <= 2}
                  style={{ padding: '2px 6px', borderColor: 'var(--warn)', color: 'var(--warn)' }}>×</button>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); props.onAddSeg(newItem); setNewItem('') }}
            style={{ display: 'flex', gap: 4 }}
          >
            <input
              value={newItem} onChange={(e) => setNewItem(e.target.value)}
              placeholder="새 항목 추가…" aria-label="새 항목"
              style={{ flex: 1, ...inputStyle }}
            />
            <button type="submit" className="minibtn" disabled={!newItem.trim()}>＋</button>
          </form>
          {props.canRemove && (
            <button className="minibtn danger" onClick={props.onRemove} style={{ width: '100%' }}>이 휠 삭제</button>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px',
  fontSize: 12.5, fontFamily: 'inherit',
}
