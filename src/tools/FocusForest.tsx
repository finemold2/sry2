// 집중 정원(Forest식) — 집중 타이머를 시작하면 씨앗이 자라 나무가 되고, 끝까지 지키면
// 정원에 나무가 한 그루 추가된다. 중간에 포기하면 나무가 시들어 정원에 남지 않는다.
// 누적 나무 수·총 집중 시간·연속 성공 등 통계를 기록한다.
//   · 영속: localStorage 'sry:tool:focus-forest:*'
//   · Web API: Web Audio(완료 차임)·Screen Wake Lock(집중 중 화면 켜짐 유지)·Notification(선택)
//   · 미지원 환경에서도 graceful — 기능만 건너뛰고 타이머/정원은 그대로 동작.
//   · 언마운트 시 타이머/오디오/Wake Lock/리스너 모두 정리.
//   · 연계: addToProject(집중 일지)·addToStash(정원 요약 메모)·openToolLinked.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'focus-forest',
  name: '집중 정원',
  icon: '🌳',
  group: '집중·생산성',
  intro: '집중하면 나무가 자라고, 끝까지 지키면 정원에 심어집니다',
  w: 560,
  h: 680,
}

// ─────────────────────────────── 상수/타입 ───────────────────────────────
const NS = 'sry:tool:focus-forest:'
const K_TREES = NS + 'trees'      // 자란 나무들(정원)
const K_STATS = NS + 'stats'      // 누적 통계
const K_PREFS = NS + 'prefs'      // 설정(집중 분/종 선택/사운드)

const MIN_MIN = 5
const MAX_MIN = 180
const DEFAULT_MIN = 25

type Phase = 'idle' | 'growing' | 'done' | 'withered'

// 나무 종 — 집중 길이에 따라 심을 수 있는 종이 잠금 해제된다(긴 집중일수록 귀한 종).
interface Species {
  id: string
  name: string
  emoji: string
  minMinutes: number      // 이 분 이상 집중해야 잠금 해제
  trunk: string           // 줄기 색
  leaf: string            // 잎 색(메인)
  leaf2: string           // 잎 색(보조)
}
const SPECIES: Species[] = [
  { id: 'sprout',  name: '새싹나무', emoji: '🌱', minMinutes: 0,   trunk: '#7a5230', leaf: '#7bc47f', leaf2: '#a8dca9' },
  { id: 'pine',    name: '소나무',   emoji: '🌲', minMinutes: 15,  trunk: '#6b4423', leaf: '#3f7d4f', leaf2: '#5a9e68' },
  { id: 'oak',     name: '참나무',   emoji: '🌳', minMinutes: 25,  trunk: '#6e4a2a', leaf: '#5a8d3a', leaf2: '#82b35a' },
  { id: 'maple',   name: '단풍나무', emoji: '🍁', minMinutes: 40,  trunk: '#7a4b2b', leaf: '#d96a3a', leaf2: '#e8a14b' },
  { id: 'sakura',  name: '벚나무',   emoji: '🌸', minMinutes: 60,  trunk: '#7d5a3c', leaf: '#f3b6cf', leaf2: '#f9d6e4' },
  { id: 'baobab',  name: '바오밥',   emoji: '🪵', minMinutes: 90,  trunk: '#8a6037', leaf: '#9bbf6a', leaf2: '#c2d894' },
  { id: 'world',   name: '세계수',   emoji: '✨', minMinutes: 120, trunk: '#6a4b8a', leaf: '#9d7bd4', leaf2: '#c4aef0' },
]
function speciesById(id: string): Species { return SPECIES.find(s => s.id === id) || SPECIES[0] }
function unlockedSpecies(maxMin: number): Species[] { return SPECIES.filter(s => maxMin >= s.minMinutes) }

interface PlantedTree {
  id: string
  species: string
  minutes: number     // 이 나무를 키운 집중 분
  planted: number     // 심은 시각(ms)
  note?: string       // 무엇에 집중했는지(선택)
}
interface Stats {
  totalTrees: number
  totalFocusMs: number
  withered: number       // 시들어 사라진 횟수
  bestStreak: number     // 최장 연속 성공
  curStreak: number      // 현재 연속 성공
}
const emptyStats = (): Stats => ({ totalTrees: 0, totalFocusMs: 0, withered: 0, bestStreak: 0, curStreak: 0 })

interface Prefs { minutes: number; species: string; sound: boolean; label: string }
const defaultPrefs = (): Prefs => ({ minutes: DEFAULT_MIN, species: 'oak', sound: true, label: '' })

// ─────────────────────────────── 저장 유틸(graceful) ───────────────────────────────
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return (v ?? fallback) as T
  } catch { return fallback }
}
function saveJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* 차단/용량초과 무시 */ }
}

function clampMin(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MIN
  return Math.max(MIN_MIN, Math.min(MAX_MIN, Math.round(n)))
}
function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
function fmtDur(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function uid(): string {
  return 't_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// 느슨한 Wake Lock 타입(미지원 환경 대비)
type WakeSentinel = { released: boolean; release: () => Promise<void>; addEventListener?: (t: string, cb: () => void) => void } | null

// ─────────────────────────────── 나무 SVG ───────────────────────────────
// grow: 0(씨앗)~1(완전 성장). wither 면 갈색으로 시든다.
function TreeSVG({ sp, grow, wither, size = 200, sway = false }: {
  sp: Species; grow: number; wither?: boolean; size?: number; sway?: boolean
}) {
  const g = Math.max(0, Math.min(1, grow))
  const trunkColor = wither ? '#8a7a5a' : sp.trunk
  const leafA = wither ? '#b9a268' : sp.leaf
  const leafB = wither ? '#cdbf91' : sp.leaf2
  // 줄기: 성장에 따라 위로 자란다.
  const trunkH = 18 + g * 70
  const baseY = 190
  const topY = baseY - trunkH
  const trunkW = 6 + g * 8
  // 잎 덩어리: 성장에 따라 커진다(시들면 처짐 표현 위해 약간 아래로).
  const crownR = g * (46 + (sp.minMinutes >= 60 ? 8 : 0))
  const crownCy = topY + (wither ? 8 : 0)
  const opacity = wither ? 0.85 : 1
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: 'block' }} aria-hidden>
      {/* 땅 */}
      <ellipse cx="100" cy="192" rx="62" ry="10" fill="var(--chrome-2)" opacity={0.7} />
      {/* 줄기 */}
      <rect
        x={100 - trunkW / 2} y={topY} width={trunkW} height={trunkH}
        rx={trunkW / 2} fill={trunkColor} opacity={opacity}
        style={{ transition: 'all 0.6s cubic-bezier(.34,1.2,.4,1)' }}
      />
      {/* 가지(성장 후반에 등장) */}
      {g > 0.5 && !wither && (
        <>
          <line x1="100" y1={topY + trunkH * 0.35} x2={100 - crownR * 0.5} y2={topY + trunkH * 0.15} stroke={trunkColor} strokeWidth={trunkW * 0.4} strokeLinecap="round" />
          <line x1="100" y1={topY + trunkH * 0.45} x2={100 + crownR * 0.5} y2={topY + trunkH * 0.25} stroke={trunkColor} strokeWidth={trunkW * 0.4} strokeLinecap="round" />
        </>
      )}
      {/* 잎 덩어리(3겹) */}
      {crownR > 2 && (
        <g
          opacity={opacity}
          style={{
            transition: 'all 0.6s cubic-bezier(.34,1.2,.4,1)',
            transformOrigin: '100px ' + crownCy + 'px',
            transformBox: 'fill-box',
            animation: sway && !wither ? 'ff-sway 4s ease-in-out infinite' : 'none',
          }}
        >
          <circle cx={100 - crownR * 0.45} cy={crownCy + crownR * 0.25} r={crownR * 0.7} fill={leafB} />
          <circle cx={100 + crownR * 0.45} cy={crownCy + crownR * 0.2} r={crownR * 0.66} fill={leafB} />
          <circle cx={100} cy={crownCy - crownR * 0.15} r={crownR * 0.85} fill={leafA} />
          <circle cx={100 - crownR * 0.3} cy={crownCy - crownR * 0.1} r={crownR * 0.5} fill={leafA} />
          {/* 벚꽃/세계수 반짝임 */}
          {!wither && sp.id === 'sakura' && g > 0.7 && (
            <>
              <circle cx={100 - crownR * 0.4} cy={crownCy - crownR * 0.3} r={3} fill="#fff" opacity={0.8} />
              <circle cx={100 + crownR * 0.3} cy={crownCy + crownR * 0.1} r={3} fill="#fff" opacity={0.7} />
            </>
          )}
          {!wither && sp.id === 'world' && g > 0.7 && (
            <>
              <circle cx={100} cy={crownCy - crownR * 0.5} r={2.5} fill="#fff" />
              <circle cx={100 - crownR * 0.6} cy={crownCy} r={2} fill="#fff" opacity={0.9} />
              <circle cx={100 + crownR * 0.55} cy={crownCy - crownR * 0.2} r={2} fill="#fff" opacity={0.9} />
            </>
          )}
        </g>
      )}
      {/* 씨앗 단계 표시 */}
      {g <= 0.06 && !wither && (
        <ellipse cx="100" cy="183" rx="7" ry="9" fill={sp.trunk} />
      )}
      {/* 시든 잎 떨어짐 */}
      {wither && (
        <>
          <circle cx="74" cy="178" r="3.5" fill="#cdbf91" opacity={0.8} />
          <circle cx="126" cy="184" r="3" fill="#b9a268" opacity={0.8} />
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────── 메인 ───────────────────────────────
export default function FocusForest({ payload }: { payload?: Record<string, unknown> }) {
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...defaultPrefs(), ...loadJSON<Partial<Prefs>>(K_PREFS, {}) }))
  const [minInput, setMinInput] = useState<string>(() => String(clampMin(prefs.minutes)))
  const [trees, setTrees] = useState<PlantedTree[]>(() => loadJSON<PlantedTree[]>(K_TREES, []))
  const [stats, setStats] = useState<Stats>(() => ({ ...emptyStats(), ...loadJSON<Partial<Stats>>(K_STATS, {}) }))

  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState<number>(() => clampMin(prefs.minutes) * 60)
  const [note, setNote] = useState('')              // 상태 안내
  const [wakeActive, setWakeActive] = useState(false)
  const [tab, setTab] = useState<'grow' | 'garden'>('grow')

  const [wakeSupported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() => {
    try { return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' } catch { return 'unsupported' }
  })

  // refs
  const intervalRef = useRef<number | null>(null)
  const endTimeRef = useRef<number>(0)
  const sessionTotalRef = useRef<number>(0)   // 이번 세션 총 초(성장률 계산용)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wakeRef = useRef<WakeSentinel>(null)
  const phaseRef = useRef<Phase>(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // payload(연계로 열렸을 때): 라벨/분 채우기
  useEffect(() => {
    if (!payload) return
    const lb = typeof payload.label === 'string' ? payload.label
      : typeof payload.title === 'string' ? payload.title : ''
    if (lb) setPrefs(p => ({ ...p, label: lb }))
    if (typeof payload.minutes === 'number') {
      const c = clampMin(payload.minutes)
      setPrefs(p => ({ ...p, minutes: c })); setMinInput(String(c))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 설정 영속화
  useEffect(() => { saveJSON(K_PREFS, prefs) }, [prefs])
  useEffect(() => { saveJSON(K_TREES, trees) }, [trees])
  useEffect(() => { saveJSON(K_STATS, stats) }, [stats])
  useEffect(() => { if (phase === 'idle') setMinInput(String(prefs.minutes)) }, [prefs.minutes, phase])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === K_TREES) setTrees(loadJSON<PlantedTree[]>(K_TREES, []))
      else if (e.key === K_STATS) setStats({ ...emptyStats(), ...loadJSON<Partial<Stats>>(K_STATS, {}) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ── Web Audio: 완료 차임(부드러운 아르페지오) ──
  const chime = useCallback(() => {
    if (!prefs.sound) return
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') { ctx = new Ctor(); audioCtxRef.current = ctx }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx!.createOscillator()
        const gain = ctx!.createGain()
        osc.type = 'triangle'
        osc.frequency.value = freq
        const t0 = now + i * 0.16
        const t1 = t0 + 0.5
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, t1)
        osc.connect(gain); gain.connect(ctx!.destination)
        osc.start(t0); osc.stop(t1 + 0.05)
      })
    } catch { /* 오디오 미지원 무시 */ }
  }, [prefs.sound])

  // 시드는 소리(짧은 하강음)
  const sadTone = useCallback(() => {
    if (!prefs.sound) return
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') { ctx = new Ctor(); audioCtxRef.current = ctx }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.5)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.6)
    } catch { /* 무시 */ }
  }, [prefs.sound])

  // ── Notification ──
  const notify = useCallback((title: string, body: string) => {
    try {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'granted') new Notification(title, { body })
    } catch { /* 무시 */ }
  }, [])
  const requestNotif = useCallback(() => {
    try {
      if (typeof Notification === 'undefined') { setNotifPerm('unsupported'); return }
      Notification.requestPermission().then(p => setNotifPerm(p)).catch(() => {})
    } catch { setNotifPerm('unsupported') }
  }, [])

  // ── Wake Lock ──
  const requestWake = useCallback(async () => {
    if (!wakeSupported) return
    try {
      const wl = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<WakeSentinel> } }).wakeLock.request('screen')
      wakeRef.current = wl
      setWakeActive(true)
      wl?.addEventListener?.('release', () => setWakeActive(false))
    } catch { setWakeActive(false) }
  }, [wakeSupported])
  const releaseWake = useCallback(async () => {
    const wl = wakeRef.current
    wakeRef.current = null
    setWakeActive(false)
    try { if (wl && !wl.released) await wl.release() } catch { /* 무시 */ }
  }, [])

  // ── 완료(나무 심기) ──
  const finishGrowth = useCallback(() => {
    endTimeRef.current = 0
    if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
    const mins = Math.max(1, Math.round(sessionTotalRef.current / 60))
    const sp = speciesById(prefs.species)
    const tree: PlantedTree = { id: uid(), species: sp.id, minutes: mins, planted: Date.now(), note: prefs.label.trim() || undefined }
    setTrees(prev => [tree, ...prev])
    setStats(prev => {
      const cur = prev.curStreak + 1
      return {
        totalTrees: prev.totalTrees + 1,
        totalFocusMs: prev.totalFocusMs + sessionTotalRef.current * 1000,
        withered: prev.withered,
        curStreak: cur,
        bestStreak: Math.max(prev.bestStreak, cur),
      }
    })
    setPhase('done')
    setNote(`${sp.emoji} ${sp.name} 한 그루가 정원에 심어졌어요!`)
    chime()
    notify('🌳 집중 정원', `${sp.name} 한 그루가 자랐습니다. 잘하셨어요!`)
    releaseWake()
  }, [prefs.species, prefs.label, chime, notify, releaseWake])

  // ── 카운트다운(절대시각 기준 — 탭 스로틀 방지) ──
  useEffect(() => {
    if (phase !== 'growing') return
    endTimeRef.current = Date.now() + remaining * 1000
    const tick = () => {
      const sec = Math.ceil((endTimeRef.current - Date.now()) / 1000)
      if (sec <= 0) {
        if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
        setRemaining(0)
        finishGrowth()
        return
      }
      setRemaining(sec)
    }
    intervalRef.current = window.setInterval(tick, 250)
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
    // remaining 은 진입 스냅샷으로만 사용(매 틱 재실행 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finishGrowth])

  // ── 탭 복귀 시 Wake Lock 재요청 ──
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && phaseRef.current === 'growing' && wakeSupported && !wakeRef.current) {
        requestWake()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [requestWake, wakeSupported])

  // ── 언마운트 정리 ──
  useEffect(() => {
    return () => {
      if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
      const ctx = audioCtxRef.current
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
      audioCtxRef.current = null
      const wl = wakeRef.current
      wakeRef.current = null
      try { if (wl && !wl.released) wl.release() } catch { /* 무시 */ }
    }
  }, [])

  // ── 동작 ──
  const start = () => {
    if (phase === 'growing') return
    const total = clampMin(prefs.minutes) * 60
    sessionTotalRef.current = total
    setRemaining(total)
    setNote('')
    setPhase('growing')
    if (notifPerm === 'default') requestNotif()
    requestWake()
    // 오디오 워밍업(사용자 제스처)
    if (prefs.sound) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctor) {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new Ctor()
          if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
        }
      } catch { /* 무시 */ }
    }
  }

  const giveUp = useCallback(() => {
    if (phase !== 'growing') return
    if (!window.confirm('지금 그만두면 자라던 나무가 시들어 정원에 남지 않습니다. 정말 포기할까요?')) return
    if (intervalRef.current != null) { clearInterval(intervalRef.current); intervalRef.current = null }
    endTimeRef.current = 0
    setStats(prev => ({ ...prev, withered: prev.withered + 1, curStreak: 0 }))
    setPhase('withered')
    setNote('🥀 나무가 시들었어요. 다음 집중에서 다시 키워봐요.')
    sadTone()
    releaseWake()
  }, [phase, sadTone, releaseWake])

  const reset = () => {
    setPhase('idle')
    setNote('')
    setRemaining(clampMin(prefs.minutes) * 60)
  }

  const commitMin = () => {
    const parsed = parseInt(minInput, 10)
    const c = clampMin(Number.isFinite(parsed) ? parsed : DEFAULT_MIN)
    setPrefs(p => ({ ...p, minutes: c }))
    setMinInput(String(c))
    if (phase === 'idle') setRemaining(c * 60)
    // 잠금 해제 범위 밖 종이면 자동으로 가능한 가장 귀한 종으로 조정
    const unlocked = unlockedSpecies(c)
    if (!unlocked.some(s => s.id === prefs.species)) {
      setPrefs(p => ({ ...p, species: unlocked[unlocked.length - 1].id }))
    }
  }

  const removeTree = (id: string) => {
    setTrees(prev => prev.filter(t => t.id !== id))
  }
  const clearGarden = () => {
    if (!trees.length) return
    if (window.confirm('정원의 모든 나무를 제거할까요? (통계는 유지됩니다)')) setTrees([])
  }
  const resetStats = () => {
    if (window.confirm('누적 통계를 0으로 초기화할까요? (정원의 나무는 유지됩니다)')) setStats(emptyStats())
  }

  // ── 연계: 프로젝트 일지/수집함 ──
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const lines = trees.slice(0, 50).map(t => {
      const sp = speciesById(t.species)
      const d = new Date(t.planted)
      const ds = `${d.getMonth() + 1}/${d.getDate()}`
      return `<li>${sp.emoji} ${esc(sp.name)} · ${t.minutes}분 · ${ds}${t.note ? ' — ' + esc(t.note) : ''}</li>`
    }).join('')
    const body =
      `<p>총 ${stats.totalTrees}그루 · 누적 집중 ${esc(fmtDur(stats.totalFocusMs))} · 최장 연속 ${stats.bestStreak}회</p>` +
      `<ul>${lines}</ul>`
    addToProject({
      kind: 'text', root: 'research', folder: '집중',
      title: `집중 정원 일지 (${trees.length}그루)`,
      bodyHtml: body,
      meta: { 나무: String(stats.totalTrees), 누적집중: fmtDur(stats.totalFocusMs), 최장연속: String(stats.bestStreak) },
    })
    setNote('📄 집중 일지를 프로젝트 자료 "집중" 폴더에 추가했어요.')
  }
  const toStash = () => {
    if (!hasStash()) return
    addToStash({
      kind: 'memo',
      label: '집중 정원 요약',
      text: `🌳 정원의 나무 ${stats.totalTrees}그루 · 누적 집중 ${fmtDur(stats.totalFocusMs)} · 최장 연속 ${stats.bestStreak}회`,
    })
    setNote('🧺 정원 요약을 수집함에 담았어요.')
  }

  // ── 파생값 ──
  const totalSec = sessionTotalRef.current || clampMin(prefs.minutes) * 60
  const grown = phase === 'growing'
    ? (totalSec > 0 ? 1 - remaining / totalSec : 0)
    : phase === 'done' ? 1
    : phase === 'withered' ? 0.65
    : 0.04
  const sp = speciesById(prefs.species)
  const unlocked = unlockedSpecies(prefs.minutes)
  const accent = phase === 'withered' ? 'var(--warn)' : 'var(--ok)'

  // ─────────────────────────────── 스타일 ───────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const tabbar: React.CSSProperties = { display: 'flex', gap: 6, padding: '12px 14px 0', flex: '0 0 auto' }
  const tabBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 10px', borderRadius: '10px 10px 0 0', cursor: 'pointer',
    border: '1px solid var(--border)', borderBottom: on ? '1px solid var(--paper)' : '1px solid var(--border)',
    background: on ? 'var(--paper)' : 'var(--chrome-2)', color: on ? 'var(--text)' : 'var(--muted)',
    fontWeight: on ? 700 : 500, fontSize: 13,
  })
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }

  const stage: React.CSSProperties = {
    background: `radial-gradient(120% 90% at 50% 10%, var(--paper) 0%, var(--panel) 100%)`,
    border: '1px solid var(--border)', borderRadius: 14, padding: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  }
  const clock: React.CSSProperties = { fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: phase === 'growing' ? 'var(--accent)' : 'var(--text)' }
  const stageSub: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', textAlign: 'center', minHeight: 18 }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }

  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const rowLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontWeight: 600 }
  const input: React.CSSProperties = { width: 72, boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const textInput: React.CSSProperties = { flex: 1, boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, minWidth: 0 }

  const statsRow: React.CSSProperties = { display: 'flex', gap: 8 }
  const statCard: React.CSSProperties = { flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }
  const statNum: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--ok)', lineHeight: 1.1 }
  const statLbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3 }

  const speciesGrid: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const spChip = (on: boolean, locked: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '6px 8px', borderRadius: 10, minWidth: 58, cursor: locked ? 'not-allowed' : 'pointer',
    border: on ? '2px solid var(--ok)' : '1px solid var(--border)',
    background: on ? 'var(--paper)' : 'var(--chrome-2)', opacity: locked ? 0.42 : 1,
    color: 'var(--text)', fontSize: 11,
  })

  const gardenGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 6 }
  const gardenCell: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }
  const cellMin: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }
  const cellX: React.CSSProperties = { position: 'absolute', top: 2, right: 4, fontSize: 11, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, background: 'transparent', border: 'none' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const noteBar: React.CSSProperties = { fontSize: 12, color: accent, textAlign: 'center', minHeight: 16, fontWeight: 600 }

  return (
    <div style={wrap}>
      {/* sway 애니메이션 키프레임 1회 주입 */}
      <style>{`@keyframes ff-sway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}`}</style>

      <div style={tabbar}>
        <button style={tabBtn(tab === 'grow')} onClick={() => setTab('grow')}><Emoji e="🌱"/> 키우기</button>
        <button style={tabBtn(tab === 'garden')} onClick={() => setTab('garden')}><Emoji e="🌳"/> 정원 ({trees.length})</button>
      </div>

      {tab === 'grow' ? (
        <div style={body}>
          {/* 무대: 자라는 나무 */}
          <div style={stage}>
            <TreeSVG sp={sp} grow={grown} wither={phase === 'withered'} size={190} sway={phase === 'growing'} />
            <div style={clock}>
              {phase === 'growing' ? fmtClock(remaining)
                : phase === 'done' ? '완료!'
                : phase === 'withered' ? '시듦'
                : fmtClock(clampMin(prefs.minutes) * 60)}
            </div>
            <div style={stageSub}>
              {phase === 'idle' && <><Emoji e={sp.emoji}/> {`${sp.name}을(를) ${prefs.minutes}분 동안 키웁니다`}</>}
              {phase === 'growing' && <><Emoji e={sp.emoji}/> {`${sp.name}이(가) 자라는 중… 떠나지 마세요`}</>}
              {phase === 'done' && <><Emoji e={sp.emoji}/> 잘 키웠어요!</>}
              {phase === 'withered' && '집중을 지키지 못해 시들었어요'}
            </div>
          </div>

          <div style={noteBar}>{emojify(note)}</div>

          {/* 컨트롤 */}
          <div style={actions}>
            {phase === 'growing' ? (
              <button className="minibtn" onClick={giveUp} style={{ color: 'var(--warn)' }}><Emoji e="🥀"/> 포기</button>
            ) : phase === 'idle' ? (
              <button className="btn-primary" onClick={start} style={{ fontSize: 15, padding: '10px 22px' }}><Emoji e="🌱"/> 심고 집중 시작</button>
            ) : (
              <button className="btn-primary" onClick={reset}>↺ 다시 키우기</button>
            )}
            {phase === 'growing' && (
              <span style={{ ...rowLabel, alignSelf: 'center' }}>
                {wakeSupported ? (wakeActive ? <><Emoji e="🔆"/> 화면 켜짐 유지 중</> : <><Emoji e="🔆"/> 화면 유지 대기</>) : <><Emoji e="🔆"/> 화면유지 미지원</>}
              </span>
            )}
          </div>

          {/* 설정(집중 중에는 잠금) */}
          {phase !== 'growing' && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={rowLabel}>집중 시간(분)</span>
                <input
                  style={input} type="number" min={MIN_MIN} max={MAX_MIN} value={minInput}
                  onChange={e => setMinInput(e.target.value)}
                  onBlur={commitMin}
                  onKeyDown={e => { if (e.key === 'Enter') { commitMin(); (e.target as HTMLInputElement).blur() } }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>({MIN_MIN}~{MAX_MIN})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={rowLabel}>무엇에 집중?</span>
                <input
                  style={textInput} type="text" placeholder="예: 3장 초고 (선택)" value={prefs.label}
                  onChange={e => setPrefs(p => ({ ...p, label: e.target.value }))}
                  maxLength={60}
                />
              </div>

              <div>
                <div style={rowLabel}>나무 종 (집중 시간이 길수록 잠금 해제)</div>
                <div style={{ ...speciesGrid, marginTop: 6 }}>
                  {SPECIES.map(s => {
                    const locked = prefs.minutes < s.minMinutes
                    const on = prefs.species === s.id
                    return (
                      <button
                        key={s.id}
                        style={spChip(on, locked)}
                        disabled={locked}
                        title={locked ? `${s.minMinutes}분 이상 집중에서 잠금 해제` : s.name}
                        onClick={() => !locked && setPrefs(p => ({ ...p, species: s.id }))}
                      >
                        <span style={{ fontSize: 20 }}>{locked ? <Emoji e="🔒"/> : <Emoji e={s.emoji}/>}</span>
                        <span>{s.name}</span>
                      </button>
                    )
                  })}
                </div>
                {unlocked.length < SPECIES.length && (
                  <div style={{ ...hint, marginTop: 6 }}>
                    <Emoji e="🔒"/> 종은 집중 시간을 늘리면 잠금 해제됩니다 (다음: {SPECIES.find(s => s.minMinutes > prefs.minutes)?.name} {SPECIES.find(s => s.minMinutes > prefs.minutes)?.minMinutes}분).
                  </div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={prefs.sound} onChange={e => setPrefs(p => ({ ...p, sound: e.target.checked }))} />
                완료/포기 시 효과음
              </label>

              {notifPerm === 'default' && (
                <button className="minibtn" onClick={requestNotif} style={{ alignSelf: 'flex-start' }}><Emoji e="🔔"/> 완료 알림 켜기</button>
              )}
            </div>
          )}

          {/* 통계 */}
          <div style={statsRow}>
            <div style={statCard}><div style={statNum}>{stats.totalTrees}</div><div style={statLbl}>심은 나무</div></div>
            <div style={statCard}><div style={statNum}>{fmtDur(stats.totalFocusMs)}</div><div style={statLbl}>누적 집중</div></div>
            <div style={statCard}><div style={statNum}>{stats.curStreak}</div><div style={statLbl}>연속 성공</div></div>
            <div style={statCard}><div style={statNum}>{stats.bestStreak}</div><div style={statLbl}>최장 연속</div></div>
          </div>

          <div style={hint}>
            집중을 끝까지 지키면 나무가 정원에 심어지고, 중간에 포기하면 시들어 사라집니다.
            기록은 이 브라우저에만 저장됩니다.
            {!wakeSupported && ' (이 브라우저는 화면 켜짐 유지를 지원하지 않아 타이머만 진행합니다.)'}
          </div>
        </div>
      ) : (
        /* ── 정원 탭 ── */
        <div style={body}>
          <div style={statsRow}>
            <div style={statCard}><div style={statNum}>{trees.length}</div><div style={statLbl}>정원의 나무</div></div>
            <div style={statCard}><div style={statNum}>{fmtDur(stats.totalFocusMs)}</div><div style={statLbl}>누적 집중</div></div>
            <div style={statCard}><div style={statNum}>{stats.withered}</div><div style={statLbl}>시든 나무</div></div>
            <div style={statCard}><div style={statNum}>{stats.bestStreak}</div><div style={statLbl}>최장 연속</div></div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={toProject} disabled={!trees.length || !hasProjectBridge()}
              title={hasProjectBridge() ? '집중 일지를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            {hasStash() && <button className="minibtn" onClick={toStash} disabled={!trees.length}><Emoji e="🧺"/> 수집함에 담기</button>}
            <button className="linkbtn" onClick={() => openToolLinked('streak-tracker')}><Emoji e="🔥"/> 집필 스트릭 열기</button>
            <button className="linkbtn" onClick={() => openToolLinked('pomodoro-timer')}><Emoji e="🍅"/> 포모도로 열기</button>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={resetStats}>통계 초기화</button>
            <button className="minibtn" onClick={clearGarden} disabled={!trees.length}>정원 비우기</button>
          </div>

          <div style={noteBar}>{emojify(note)}</div>

          {trees.length === 0 ? (
            <div style={{ ...card, alignItems: 'center', textAlign: 'center', gap: 6, padding: '28px 16px' }}>
              <div style={{ fontSize: 40 }}><Emoji e="🪴"/></div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>아직 정원이 비어 있어요</div>
              <div style={hint}>「키우기」 탭에서 집중을 끝까지 지키면 첫 나무가 여기 심어집니다.</div>
              <button className="btn-primary" onClick={() => setTab('grow')} style={{ marginTop: 6 }}><Emoji e="🌱"/> 첫 나무 키우러 가기</button>
            </div>
          ) : (
            <div style={gardenGrid}>
              {trees.map(t => {
                const s = speciesById(t.species)
                const d = new Date(t.planted)
                const ds = `${d.getMonth() + 1}/${d.getDate()}`
                return (
                  <div key={t.id} style={gardenCell} title={`${s.name} · ${t.minutes}분 · ${ds}${t.note ? '\n' + t.note : ''}`}>
                    <button style={cellX} onClick={() => removeTree(t.id)} title="제거" aria-label="나무 제거">✕</button>
                    <TreeSVG sp={s} grow={1} size={62} />
                    <span style={cellMin}>{t.minutes}분 · {ds}</span>
                    {t.note && <span style={{ ...cellMin, color: 'var(--text)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
