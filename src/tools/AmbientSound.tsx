// 집중용 앰비언트 사운드 플레이어 — Web Audio 로 노이즈를 직접 생성한다(외부 파일·네트워크 불필요).
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'ambient-sound', name: '앰비언트 사운드', icon: '🎧', group: '집중·생산성', intro: '집중용 화이트/핑크/브라운 노이즈·빗소리를 재생합니다', w: 380, h: 460 }

type Kind = 'white' | 'pink' | 'brown' | 'rain'

const KINDS: { id: Kind; name: string; icon: string; desc: string }[] = [
  { id: 'white', name: '화이트 노이즈', icon: '⚪', desc: '균일한 백색 소음 — 또렷한 집중' },
  { id: 'pink', name: '핑크 노이즈', icon: '🌸', desc: '부드러운 분홍 소음 — 편안한 배경' },
  { id: 'brown', name: '브라운 노이즈', icon: '🟤', desc: '묵직한 갈색 소음 — 깊은 차분함' },
  { id: 'rain', name: '빗소리', icon: '🌧️', desc: '필터드 노이즈로 만든 빗소리' },
]

const VOL_KEY = 'sry:tool:ambient-sound:vol'
const KIND_KEY = 'sry:tool:ambient-sound:kind'

// 2초 길이의 노이즈 버퍼를 종류별로 생성한다.
function makeNoiseBuffer(ctx: AudioContext, kind: Kind): AudioBuffer {
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  if (kind === 'white' || kind === 'rain') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  } else if (kind === 'pink') {
    // Paul Kellet 핑크 노이즈 근사
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    // brown(red) 노이즈 — 적분 후 정규화
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}

export default function AmbientSound() {
  const [kind, setKind] = useState<Kind>(() => {
    try { const v = localStorage.getItem(KIND_KEY); if (v === 'white' || v === 'pink' || v === 'brown' || v === 'rain') return v } catch {}
    return 'white'
  })
  const [vol, setVol] = useState<number>(() => {
    try { const v = parseFloat(localStorage.getItem(VOL_KEY) || ''); if (!isNaN(v) && v >= 0 && v <= 1) return v } catch {}
    return 0.5
  })
  const [playing, setPlaying] = useState(false)
  const [err, setErr] = useState('')

  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const lfoRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null)
  const playingRef = useRef(false)

  const supported = typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

  // 현재 재생 그래프를 정지·해제한다(컨텍스트는 유지).
  const stopGraph = () => {
    try { lfoRef.current?.osc.stop() } catch {}
    try { lfoRef.current?.osc.disconnect() } catch {}
    try { lfoRef.current?.gain.disconnect() } catch {}
    lfoRef.current = null
    try { srcRef.current?.stop() } catch {}
    try { srcRef.current?.disconnect() } catch {}
    srcRef.current = null
    try { filterRef.current?.disconnect() } catch {}
    filterRef.current = null
    try { gainRef.current?.disconnect() } catch {}
    gainRef.current = null
  }

  const start = async (k: Kind) => {
    if (!supported) { setErr('이 브라우저는 Web Audio를 지원하지 않습니다.'); return }
    setErr('')
    try {
      let ctx = ctxRef.current
      if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AC()
        ctxRef.current = ctx
      }
      if (ctx.state === 'suspended') { try { await ctx.resume() } catch {} }

      stopGraph()

      const buf = makeNoiseBuffer(ctx, k)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true

      const gain = ctx.createGain()
      gain.gain.value = vol

      if (k === 'rain') {
        // 빗소리: 노이즈를 밴드패스로 다듬고 LFO로 미세하게 흔들어 '쏴아' 질감을 낸다.
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 1200
        filter.Q.value = 0.6
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = 0.15
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 400
        osc.connect(lfoGain)
        lfoGain.connect(filter.frequency)
        osc.start()
        src.connect(filter)
        filter.connect(gain)
        filterRef.current = filter
        lfoRef.current = { osc, gain: lfoGain }
      } else {
        src.connect(gain)
      }

      gain.connect(ctx.destination)
      src.start()

      srcRef.current = src
      gainRef.current = gain
      playingRef.current = true
      setPlaying(true)
    } catch {
      setErr('오디오를 시작할 수 없습니다.')
      stopGraph()
      playingRef.current = false
      setPlaying(false)
    }
  }

  const stop = () => {
    stopGraph()
    playingRef.current = false
    setPlaying(false)
    try { ctxRef.current?.suspend() } catch {}
  }

  const toggle = () => { if (playing) stop(); else start(kind) }

  const chooseKind = (k: Kind) => {
    setKind(k)
    try { localStorage.setItem(KIND_KEY, k) } catch {}
    if (playingRef.current) start(k)
  }

  // 볼륨 변경 시 즉시 반영
  useEffect(() => {
    try { localStorage.setItem(VOL_KEY, String(vol)) } catch {}
    const g = gainRef.current, ctx = ctxRef.current
    if (g && ctx) {
      try { g.gain.setTargetAtTime(vol, ctx.currentTime, 0.02) } catch { g.gain.value = vol }
    }
  }, [vol])

  // 언마운트 시 모든 사운드·컨텍스트 정리
  useEffect(() => {
    return () => {
      stopGraph()
      playingRef.current = false
      const ctx = ctxRef.current
      ctxRef.current = null
      if (ctx) { try { ctx.close() } catch {} }
    }
  }, [])

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const list: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
  const item = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left',
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    borderRadius: 10, cursor: 'pointer', font: 'inherit', width: '100%',
  })
  const itemDesc = (active: boolean): React.CSSProperties => ({ fontSize: 12, color: active ? 'rgba(255,255,255,.85)' : 'var(--muted)' })
  const controls: React.CSSProperties = { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const label: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', minWidth: 44 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {!supported && (
        <div style={{ ...hint, color: 'var(--warn)' }}>이 브라우저에서는 Web Audio를 사용할 수 없어 사운드를 재생할 수 없습니다.</div>
      )}

      <div style={list}>
        {KINDS.map(k => {
          const active = kind === k.id
          return (
            <button key={k.id} style={item(active)} onClick={() => chooseKind(k.id)} disabled={!supported} aria-pressed={active}>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{k.name}{active && playing ? ' · 재생 중' : ''}</span>
                <span style={itemDesc(active)}>{k.desc}</span>
              </span>
            </button>
          )
        })}
      </div>

      {err && <div style={{ ...hint, color: 'var(--warn)' }}>{err}</div>}

      <div style={controls}>
        <div style={row}>
          <span style={label}>🔊 볼륨</span>
          <input
            type="range" min={0} max={1} step={0.01} value={vol}
            onChange={e => setVol(parseFloat(e.target.value))}
            disabled={!supported}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
            aria-label="볼륨"
          />
          <span style={{ ...label, minWidth: 36, textAlign: 'right' }}>{Math.round(vol * 100)}%</span>
        </div>
        <button
          className={playing ? 'minibtn' : 'btn-primary'}
          onClick={toggle}
          disabled={!supported}
          style={{ width: '100%' }}
        >
          {playing ? '⏹ 정지' : '▶ 재생'}
        </button>
      </div>

      <div style={hint}>모든 소리는 브라우저에서 직접 생성됩니다(네트워크·파일 불필요). 창을 닫으면 자동으로 정지합니다.</div>
    </div>
  )
}
