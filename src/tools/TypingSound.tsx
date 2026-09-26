// 타이핑 사운드 — 켜면 키 입력마다 Web Audio로 짧은 타자기 클릭음을 낸다.
// 외부 네트워크/라이브러리 불필요. AudioContext + document keydown 리스너만 사용한다.
import { useEffect, useRef, useState } from 'react'

export const meta = { id: 'typing-sound', name: '타이핑 사운드', icon: '⌨️', group: '집중·생산성', intro: '키 입력마다 타자기 클릭음으로 몰입감을 더해요', w: 380, h: 460 }

type Timbre = 'typewriter' | 'mechanical' | 'soft'

const TIMBRES: { id: Timbre; label: string; desc: string }[] = [
  { id: 'typewriter', label: '타자기', desc: '딱딱한 옛 타자기 클릭' },
  { id: 'mechanical', label: '기계식', desc: '경쾌한 기계식 키보드' },
  { id: 'soft', label: '부드러움', desc: '나직하고 둥근 타건음' },
]

const NS = 'sry:tool:typing-sound:'
// 입력으로 보지 않을 키(조합키 단독·기능키 등) — 소리를 내지 않는다.
const IGNORE = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
])

function loadNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(NS + key)
    if (v == null) return def
    const n = Number(v)
    return Number.isFinite(n) ? n : def
  } catch { return def }
}
function loadStr<T extends string>(key: string, def: T): T {
  try { return (localStorage.getItem(NS + key) as T) || def } catch { return def }
}
function save(key: string, v: string | number) {
  try { localStorage.setItem(NS + key, String(v)) } catch { /* 저장 거부 무시 */ }
}

export default function TypingSound() {
  const supported = typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)

  const [on, setOn] = useState(false)
  const [volume, setVolume] = useState(() => loadNum('volume', 50))
  const [timbre, setTimbre] = useState<Timbre>(() => loadStr<Timbre>('timbre', 'typewriter'))
  const [count, setCount] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  // 최신 상태를 리스너에서 읽기 위한 ref(리스너는 한 번만 등록).
  const onRef = useRef(on)
  const volRef = useRef(volume)
  const timbreRef = useRef<Timbre>(timbre)
  useEffect(() => { onRef.current = on }, [on])
  useEffect(() => { volRef.current = volume }, [volume])
  useEffect(() => { timbreRef.current = timbre }, [timbre])

  // 설정 영속화
  useEffect(() => { save('volume', volume) }, [volume])
  useEffect(() => { save('timbre', timbre) }, [timbre])

  // AudioContext 확보(사용자 제스처 이후 생성·재개).
  function ensureCtx(): AudioContext | null {
    if (!supported) return null
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new Ctor()
        const master = ctx.createGain()
        master.gain.value = 1
        master.connect(ctx.destination)
        ctxRef.current = ctx
        masterRef.current = master
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {})
      return ctxRef.current
    } catch {
      return null
    }
  }

  // 짧은 클릭음 합성 — 음색별로 톤·노이즈·감쇠를 달리한다.
  function playClick() {
    const ctx = ensureCtx()
    const master = masterRef.current
    if (!ctx || !master) return
    const vol = Math.max(0, Math.min(1, volRef.current / 100))
    if (vol <= 0) return
    const t = ctx.currentTime
    const tb = timbreRef.current

    try {
      const g = ctx.createGain()
      g.connect(master)

      if (tb === 'typewriter') {
        // 타자기: 짧은 노이즈 버스트 + 약간의 고음 — 딱딱한 타격감.
        const dur = 0.05
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) {
          const env = 1 - i / d.length
          d[i] = (Math.random() * 2 - 1) * env * env
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'; hp.frequency.value = 1400
        src.connect(hp); hp.connect(g)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.9 * vol, t + 0.002)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        src.start(t)
        src.stop(t + dur + 0.01)
        src.onended = () => { try { src.disconnect(); hp.disconnect(); g.disconnect() } catch { /* noop */ } }
      } else if (tb === 'mechanical') {
        // 기계식: 짧은 사각파 틱 + 약한 노이즈 — 경쾌한 클릭.
        const dur = 0.045
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(2200, t)
        osc.frequency.exponentialRampToValueAtTime(900, t + dur)
        osc.connect(g)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.6 * vol, t + 0.001)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.01)
        osc.onended = () => { try { osc.disconnect(); g.disconnect() } catch { /* noop */ } }
      } else {
        // 부드러움: 둥근 사인파 톡 — 낮고 부드러운 타건음.
        const dur = 0.08
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(520, t)
        osc.frequency.exponentialRampToValueAtTime(260, t + dur)
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'; lp.frequency.value = 1600
        osc.connect(lp); lp.connect(g)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.004)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.01)
        osc.onended = () => { try { osc.disconnect(); lp.disconnect(); g.disconnect() } catch { /* noop */ } }
      }
    } catch { /* 합성 실패는 조용히 무시 */ }
  }

  // 키 입력 리스너 — 컴포넌트 수명 동안 한 번만 등록하고 언마운트 시 제거.
  useEffect(() => {
    if (!supported) return
    const handler = (e: KeyboardEvent) => {
      if (!onRef.current) return
      if (e.repeat) return // 길게 눌러 자동 반복되는 경우는 제외
      if (e.key && IGNORE.has(e.key)) return
      playClick()
      setCount((c) => c + 1)
    }
    document.addEventListener('keydown', handler)
    return () => { document.removeEventListener('keydown', handler) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported])

  // 언마운트 시 오디오 정리.
  useEffect(() => {
    return () => {
      try { masterRef.current?.disconnect() } catch { /* noop */ }
      const ctx = ctxRef.current
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
      ctxRef.current = null
      masterRef.current = null
    }
  }, [])

  function toggle() {
    if (!supported) return
    const next = !on
    setOn(next)
    if (next) {
      // 켤 때 사용자 제스처 안에서 컨텍스트를 깨우고 짧은 피드백음을 낸다.
      ensureCtx()
      playClick()
    }
  }

  function preview() {
    if (!supported) return
    ensureCtx()
    playClick()
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 14, padding: 16, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }
  const statusBig: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: on ? 'var(--ok)' : 'var(--muted)' }
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const timbreRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 'auto' }

  if (!supported) {
    return (
      <div style={wrap}>
        <div style={{ ...card, alignItems: 'center', textAlign: 'center', color: 'var(--muted)' }}>
          이 브라우저는 Web Audio를 지원하지 않아 타이핑 사운드를 사용할 수 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ ...card, alignItems: 'center', textAlign: 'center' }}>
        <div style={statusBig}>{on ? '🔊 켜짐 — 입력 중 소리가 납니다' : '🔇 꺼짐'}</div>
        <button
          className={on ? 'minibtn' : 'btn-primary'}
          onClick={toggle}
          style={{ minWidth: 140, fontSize: 15 }}
        >
          {on ? '끄기' : '켜기'}
        </button>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>입력한 키: {count}개</div>
      </div>

      <div style={card}>
        <div style={row}>
          <span style={{ ...label, minWidth: 44 }}>볼륨</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
            aria-label="볼륨"
          />
          <span style={{ fontSize: 13, width: 38, textAlign: 'right', color: 'var(--text)' }}>{volume}%</span>
        </div>

        <div style={{ ...label, marginTop: 4 }}>음색</div>
        <div style={timbreRow}>
          {TIMBRES.map((tb) => (
            <button
              key={tb.id}
              className={timbre === tb.id ? 'btn-primary' : 'minibtn'}
              onClick={() => { setTimbre(tb.id); if (on || volume > 0) preview() }}
              title={tb.desc}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {TIMBRES.find((t) => t.id === timbre)?.desc}
        </div>
        <div style={{ marginTop: 4 }}>
          <button className="minibtn" onClick={preview}>🔈 소리 미리 듣기</button>
        </div>
      </div>

      <div style={hint}>
        ‘켜기’를 누른 뒤 아무 곳에나 타자를 치면 키 입력마다 클릭음이 납니다.
        볼륨을 0으로 두면 소리가 나지 않습니다. 창을 닫으면 소리와 리스너가 자동으로 정리됩니다.
      </div>
    </div>
  )
}
