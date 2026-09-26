// 집중 사운드스케이프 믹서 — Noisli 식. 여러 자연·환경 음향 레이어를 Web Audio 로
// 직접 합성(외부 파일·네트워크 불필요)해 동시에 재생한다. 레이어별 on/off + 볼륨,
// 마스터 볼륨, 프리셋 저장/불러오기(localStorage), 슬립 타이머, 화면 켜둠(Wake Lock).
// react 와 './linkbus' 외 import 없음. 미지원 시 graceful. 언마운트 시 전부 정지·해제.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'soundscape-mixer',
  name: '사운드스케이프 믹서',
  icon: '🎚️',
  group: '집중·생산성',
  intro: '빗소리·파도·모닥불·바람·카페·노이즈 등 여러 음향 레이어를 동시에 합성·조합해 나만의 집중 환경을 만드세요',
  w: 760,
  h: 660,
}

// ---------- 영속 ----------
const NS = 'sry:tool:soundscape-mixer'

// ---------- 레이어 정의 ----------
type LayerId =
  | 'rain' | 'waves' | 'fire' | 'wind' | 'cafe' | 'stream' | 'birds' | 'thunder'
  | 'night' | 'white' | 'pink' | 'brown'

interface LayerDef {
  id: LayerId
  name: string
  icon: string
  desc: string
  // 그래프 빌더: ctx + 출력으로 연결할 GainNode(레이어 게인) 을 받아, 정지용 cleanup 을 돌려준다.
  build: (ctx: AudioContext, out: GainNode) => () => void
}

const TWO_PI = Math.PI * 2

// 2초 길이 화이트노이즈 버퍼(공용 — 여러 레이어가 소스로 사용)
function whiteBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function pinkBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
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
  return buf
}

function brownBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.02 * w) / 1.02
    d[i] = last * 3.5
  }
  return buf
}

// 루핑 노이즈 소스를 만들고 시작한다.
function noiseSource(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

// 정지/해제 유틸 — 어떤 노드 배열이든 안전하게 끊는다.
function disconnectAll(nodes: (AudioNode | null | undefined)[]) {
  for (const n of nodes) { try { n?.disconnect() } catch { /* noop */ } }
}
function stopSources(srcs: (AudioScheduledSourceNode | null | undefined)[]) {
  for (const s of srcs) { try { s?.stop() } catch { /* noop */ } }
}

// ---- 각 레이어 합성 ----
const LAYERS: LayerDef[] = [
  {
    id: 'rain', name: '빗소리', icon: '🌧️', desc: '필터드 노이즈 + 미세 변조',
    build: (ctx, out) => {
      const src = noiseSource(ctx, whiteBuffer(ctx))
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.5
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.18
      const lfoG = ctx.createGain(); lfoG.gain.value = 500
      lfo.connect(lfoG); lfoG.connect(bp.frequency)
      src.connect(hp); hp.connect(bp); bp.connect(out)
      src.start(); lfo.start()
      return () => { stopSources([src, lfo]); disconnectAll([src, hp, bp, lfo, lfoG]) }
    },
  },
  {
    id: 'waves', name: '파도', icon: '🌊', desc: '저역 노이즈가 밀려왔다 밀려가는 호흡',
    build: (ctx, out) => {
      const src = noiseSource(ctx, brownBuffer(ctx))
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.3
      const swell = ctx.createGain(); swell.gain.value = 0.0
      // 느린 사인 LFO 로 게인을 부풀렸다 줄이며 파도가 들이치는 리듬
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.09
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.5
      const lfoOff = ctx.createConstantSource(); lfoOff.offset.value = 0.5
      lfo.connect(lfoG); lfoG.connect(swell.gain); lfoOff.connect(swell.gain)
      // 거품 질감: 고역 노이즈를 같은 호흡에 살짝 얹는다
      const foam = noiseSource(ctx, whiteBuffer(ctx))
      const fhp = ctx.createBiquadFilter(); fhp.type = 'highpass'; fhp.frequency.value = 2500
      const fg = ctx.createGain(); fg.gain.value = 0.0
      const fLfoG = ctx.createGain(); fLfoG.gain.value = 0.12
      const fOff = ctx.createConstantSource(); fOff.offset.value = 0.04
      lfo.connect(fLfoG); fLfoG.connect(fg.gain); fOff.connect(fg.gain)
      src.connect(lp); lp.connect(swell); swell.connect(out)
      foam.connect(fhp); fhp.connect(fg); fg.connect(out)
      src.start(); foam.start(); lfo.start(); lfoOff.start(); fOff.start()
      return () => {
        stopSources([src, foam, lfo, lfoOff, fOff])
        disconnectAll([src, lp, swell, lfo, lfoG, lfoOff, foam, fhp, fg, fLfoG, fOff])
      }
    },
  },
  {
    id: 'fire', name: '모닥불', icon: '🔥', desc: '낮은 럼블 + 불규칙한 탁탁 튀는 소리',
    build: (ctx, out) => {
      // 베이스 럼블: 저역 브라운 노이즈
      const src = noiseSource(ctx, brownBuffer(ctx))
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
      const baseG = ctx.createGain(); baseG.gain.value = 0.7
      src.connect(lp); lp.connect(baseG); baseG.connect(out)
      // 탁탁(crackle): 짧은 노이즈 버스트를 무작위 간격으로 스케줄
      const crackleBuf = whiteBuffer(ctx, 0.4)
      let stopped = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const burst = () => {
        if (stopped) return
        try {
          const cs = ctx.createBufferSource(); cs.buffer = crackleBuf
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 2500
          const g = ctx.createGain()
          const t = ctx.currentTime
          const peak = 0.15 + Math.random() * 0.5
          const dur = 0.02 + Math.random() * 0.06
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(peak, t + 0.004)
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
          cs.connect(hp); hp.connect(g); g.connect(out)
          const off = (Math.random() * 0.5) * crackleBuf.duration
          cs.start(t, off, dur + 0.02)
          cs.onended = () => disconnectAll([cs, hp, g])
        } catch { /* noop */ }
        timer = setTimeout(burst, 40 + Math.random() * 260)
      }
      src.start()
      timer = setTimeout(burst, 100)
      return () => {
        stopped = true
        if (timer) clearTimeout(timer)
        stopSources([src]); disconnectAll([src, lp, baseG])
      }
    },
  },
  {
    id: 'wind', name: '바람', icon: '🌬️', desc: '필터를 흔드는 휘몰아치는 바람',
    build: (ctx, out) => {
      const src = noiseSource(ctx, pinkBuffer(ctx))
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 4
      const g = ctx.createGain(); g.gain.value = 0.5
      // 두 개의 느린 LFO 가 중심 주파수와 게인을 흔들어 '윙—' 휘몰아치는 느낌
      const lfoF = ctx.createOscillator(); lfoF.type = 'sine'; lfoF.frequency.value = 0.07
      const lfoFG = ctx.createGain(); lfoFG.gain.value = 350
      lfoF.connect(lfoFG); lfoFG.connect(bp.frequency)
      const lfoG = ctx.createOscillator(); lfoG.type = 'sine'; lfoG.frequency.value = 0.05
      const lfoGG = ctx.createGain(); lfoGG.gain.value = 0.35
      const off = ctx.createConstantSource(); off.offset.value = 0.45
      lfoG.connect(lfoGG); lfoGG.connect(g.gain); off.connect(g.gain)
      src.connect(bp); bp.connect(g); g.connect(out)
      src.start(); lfoF.start(); lfoG.start(); off.start()
      return () => {
        stopSources([src, lfoF, lfoG, off])
        disconnectAll([src, bp, g, lfoF, lfoFG, lfoG, lfoGG, off])
      }
    },
  },
  {
    id: 'cafe', name: '카페', icon: '☕', desc: '웅성거림 + 식기 부딪힘 질감',
    build: (ctx, out) => {
      // 웅성거림(murmur): 저역 위주 핑크 노이즈에 느린 변조
      const src = noiseSource(ctx, pinkBuffer(ctx))
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 150
      const g = ctx.createGain(); g.gain.value = 0.55
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.13
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.12
      const off = ctx.createConstantSource(); off.offset.value = 0.5
      lfo.connect(lfoG); lfoG.connect(g.gain); off.connect(g.gain)
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out)
      // 식기·잔 부딪힘: 가끔 짧은 고역 핑(ping)
      const clinkBuf = whiteBuffer(ctx, 0.3)
      let stopped = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const clink = () => {
        if (stopped) return
        try {
          const cs = ctx.createBufferSource(); cs.buffer = clinkBuf
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'
          bp.frequency.value = 2500 + Math.random() * 3500; bp.Q.value = 12
          const cg = ctx.createGain()
          const t = ctx.currentTime
          cg.gain.setValueAtTime(0.0001, t)
          cg.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.05, t + 0.005)
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
          cs.connect(bp); bp.connect(cg); cg.connect(out)
          cs.start(t, 0, 0.3)
          cs.onended = () => disconnectAll([cs, bp, cg])
        } catch { /* noop */ }
        timer = setTimeout(clink, 1500 + Math.random() * 4500)
      }
      src.start(); lfo.start(); off.start()
      timer = setTimeout(clink, 1200)
      return () => {
        stopped = true
        if (timer) clearTimeout(timer)
        stopSources([src, lfo, off]); disconnectAll([src, lp, hp, g, lfo, lfoG, off])
      }
    },
  },
  {
    id: 'stream', name: '시냇물', icon: '🏞️', desc: '졸졸 흐르는 고역 물소리',
    build: (ctx, out) => {
      const src = noiseSource(ctx, whiteBuffer(ctx))
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.2
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200
      const g = ctx.createGain(); g.gain.value = 0.5
      // 빠른 듯 부드러운 변조로 물이 굴러가는 질감
      const lfo = ctx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 0.5
      const lfoG = ctx.createGain(); lfoG.gain.value = 700
      lfo.connect(lfoG); lfoG.connect(bp.frequency)
      const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 3.1
      const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.06
      const off = ctx.createConstantSource(); off.offset.value = 0.5
      lfo2.connect(lfo2G); lfo2G.connect(g.gain); off.connect(g.gain)
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out)
      src.start(); lfo.start(); lfo2.start(); off.start()
      return () => {
        stopSources([src, lfo, lfo2, off])
        disconnectAll([src, bp, hp, g, lfo, lfoG, lfo2, lfo2G, off])
      }
    },
  },
  {
    id: 'birds', name: '새소리', icon: '🐦', desc: '간헐적 지저귐(처프)',
    build: (ctx, out) => {
      let stopped = false
      let timer: ReturnType<typeof setTimeout> | null = null
      // 하나의 지저귐: 빠르게 미끄러지는 사인 톤 2~4회
      const chirp = () => {
        if (stopped) return
        try {
          const notes = 2 + Math.floor(Math.random() * 3)
          const base = 2400 + Math.random() * 2200
          let t = ctx.currentTime + 0.02
          for (let n = 0; n < notes; n++) {
            const osc = ctx.createOscillator(); osc.type = 'sine'
            const g = ctx.createGain()
            const f0 = base * (0.85 + Math.random() * 0.4)
            const f1 = f0 * (1.1 + Math.random() * 0.5)
            const dur = 0.06 + Math.random() * 0.08
            osc.frequency.setValueAtTime(f0, t)
            osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
            g.gain.setValueAtTime(0.0001, t)
            g.gain.exponentialRampToValueAtTime(0.07 + Math.random() * 0.05, t + 0.012)
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
            osc.connect(g); g.connect(out)
            osc.start(t); osc.stop(t + dur + 0.02)
            osc.onended = () => disconnectAll([osc, g])
            t += dur + 0.02 + Math.random() * 0.05
          }
        } catch { /* noop */ }
        timer = setTimeout(chirp, 1200 + Math.random() * 5000)
      }
      timer = setTimeout(chirp, 600)
      return () => { stopped = true; if (timer) clearTimeout(timer) }
    },
  },
  {
    id: 'thunder', name: '천둥', icon: '⛈️', desc: '먼 곳에서 우르릉 굴러오는 뇌성',
    build: (ctx, out) => {
      let stopped = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const rumble = () => {
        if (stopped) return
        try {
          const cs = noiseSource(ctx, brownBuffer(ctx))
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220
          const g = ctx.createGain()
          const t = ctx.currentTime
          const dur = 2.5 + Math.random() * 3
          const peak = 0.4 + Math.random() * 0.5
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(peak, t + 0.4 + Math.random() * 0.6)
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
          // 굴러가는 느낌: 컷오프를 천천히 내린다
          lp.frequency.setValueAtTime(280, t)
          lp.frequency.linearRampToValueAtTime(90, t + dur)
          cs.connect(lp); lp.connect(g); g.connect(out)
          cs.start(t); cs.stop(t + dur + 0.1)
          cs.onended = () => disconnectAll([cs, lp, g])
        } catch { /* noop */ }
        timer = setTimeout(rumble, 9000 + Math.random() * 20000)
      }
      timer = setTimeout(rumble, 2500)
      return () => { stopped = true; if (timer) clearTimeout(timer) }
    },
  },
  {
    id: 'night', name: '밤 풀벌레', icon: '🦗', desc: '여름밤 귀뚜라미·풀벌레 합창',
    build: (ctx, out) => {
      // 여러 귀뚜라미: 약간씩 다른 주파수에서 맥놀이로 울리는 고역 톤 + AM
      const stops: (() => void)[] = []
      const count = 4
      for (let i = 0; i < count; i++) {
        const carrier = ctx.createOscillator(); carrier.type = 'sine'
        carrier.frequency.value = 4200 + i * 180 + Math.random() * 120
        const am = ctx.createOscillator(); am.type = 'sine'
        am.frequency.value = 22 + Math.random() * 8 // 트릴 속도
        const amG = ctx.createGain(); amG.gain.value = 0.5
        const depth = ctx.createConstantSource(); depth.offset.value = 0.5
        const vca = ctx.createGain(); vca.gain.value = 0
        am.connect(amG); amG.connect(vca.gain); depth.connect(vca.gain)
        const lvl = ctx.createGain(); lvl.gain.value = 0.05
        carrier.connect(vca); vca.connect(lvl); lvl.connect(out)
        carrier.start(); am.start(); depth.start()
        stops.push(() => {
          stopSources([carrier, am, depth])
          disconnectAll([carrier, am, amG, depth, vca, lvl])
        })
      }
      return () => { for (const s of stops) s() }
    },
  },
  {
    id: 'white', name: '화이트 노이즈', icon: '⚪', desc: '균일한 백색 소음',
    build: (ctx, out) => {
      const src = noiseSource(ctx, whiteBuffer(ctx))
      const g = ctx.createGain(); g.gain.value = 0.5
      src.connect(g); g.connect(out); src.start()
      return () => { stopSources([src]); disconnectAll([src, g]) }
    },
  },
  {
    id: 'pink', name: '핑크 노이즈', icon: '🌸', desc: '부드러운 분홍 소음',
    build: (ctx, out) => {
      const src = noiseSource(ctx, pinkBuffer(ctx))
      const g = ctx.createGain(); g.gain.value = 0.9
      src.connect(g); g.connect(out); src.start()
      return () => { stopSources([src]); disconnectAll([src, g]) }
    },
  },
  {
    id: 'brown', name: '브라운 노이즈', icon: '🟤', desc: '묵직한 갈색 소음',
    build: (ctx, out) => {
      const src = noiseSource(ctx, brownBuffer(ctx))
      const g = ctx.createGain(); g.gain.value = 0.7
      src.connect(g); g.connect(out); src.start()
      return () => { stopSources([src]); disconnectAll([src, g]) }
    },
  },
]

const LAYER_MAP: Record<LayerId, LayerDef> = LAYERS.reduce((m, l) => { m[l.id] = l; return m }, {} as Record<LayerId, LayerDef>)

// ---------- 프리셋 ----------
interface PresetState { vols: Partial<Record<LayerId, number>> } // layerId -> 볼륨(0~1). 키 존재 = 켜짐
interface Preset { id: string; name: string; vols: Partial<Record<LayerId, number>>; created: number }

// 내장 프리셋(불러오면 즉시 적용)
const BUILTIN: { name: string; icon: string; vols: Partial<Record<LayerId, number>> }[] = [
  { name: '비 오는 서재', icon: '📚', vols: { rain: 0.6, thunder: 0.45, fire: 0.3 } },
  { name: '해변 카페', icon: '🏖️', vols: { waves: 0.6, cafe: 0.35, birds: 0.3 } },
  { name: '숲속 시냇가', icon: '🌲', vols: { stream: 0.55, birds: 0.4, wind: 0.3 } },
  { name: '깊은 밤 집필', icon: '🌙', vols: { night: 0.5, fire: 0.35, brown: 0.25 } },
  { name: '순수 집중', icon: '🎯', vols: { brown: 0.5, rain: 0.3 } },
  { name: '폭풍우', icon: '⛈️', vols: { rain: 0.7, thunder: 0.6, wind: 0.5 } },
]

function loadState(): PresetState {
  try {
    const raw = localStorage.getItem(NS + ':state')
    if (raw) {
      const p = JSON.parse(raw) as PresetState
      if (p && p.vols && typeof p.vols === 'object') return { vols: p.vols }
    }
  } catch { /* noop */ }
  return { vols: {} }
}
function saveState(s: PresetState) {
  try { localStorage.setItem(NS + ':state', JSON.stringify(s)) } catch { /* noop */ }
}
function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(NS + ':presets')
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Preset[] }
  } catch { /* noop */ }
  return []
}
function savePresets(p: Preset[]) {
  try { localStorage.setItem(NS + ':presets', JSON.stringify(p)) } catch { /* noop */ }
}
function loadMaster(): number {
  try { const v = parseFloat(localStorage.getItem(NS + ':master') || ''); if (!isNaN(v) && v >= 0 && v <= 1) return v } catch { /* noop */ }
  return 0.8
}

function uid(): string { return 'p_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }

export default function SoundscapeMixer({ payload }: { payload?: Record<string, unknown> }) {
  const supported = typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

  // vols: layerId 가 키로 존재하면 그 레이어는 활성(볼륨 0~1). 없으면 꺼짐.
  const [vols, setVols] = useState<Partial<Record<LayerId, number>>>(() => loadState().vols)
  const [master, setMaster] = useState<number>(() => loadMaster())
  const [playing, setPlaying] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets())
  const [presetName, setPresetName] = useState('')
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')

  // 슬립 타이머(분). 0 = 사용 안 함
  const [sleepMin, setSleepMin] = useState(0)
  const [sleepLeft, setSleepLeft] = useState(0) // 남은 초
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  // 활성 레이어 노드: layerId -> { gain, stop }
  const activeRef = useRef<Partial<Record<LayerId, { gain: GainNode; stop: () => void }>>>({})
  const playingRef = useRef(false)
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null)

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(''), 1800)
  }, [])

  // ---- 페이로드: 다른 도구가 프리셋(vols)을 던지면 적용 ----
  useEffect(() => {
    if (!payload) return
    const pv = (payload as { vols?: Partial<Record<LayerId, number>> }).vols
    if (pv && typeof pv === 'object') {
      const clean: Partial<Record<LayerId, number>> = {}
      for (const k of Object.keys(pv) as LayerId[]) {
        if (LAYER_MAP[k]) { const v = pv[k]; if (typeof v === 'number') clean[k] = Math.max(0, Math.min(1, v)) }
      }
      if (Object.keys(clean).length) setVols(clean)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- ctx 보장 ----
  const ensureCtx = useCallback((): AudioContext | null => {
    if (!supported) return null
    let ctx = ctxRef.current
    if (!ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AC()
        ctxRef.current = ctx
        const mg = ctx.createGain()
        mg.gain.value = master
        mg.connect(ctx.destination)
        masterGainRef.current = mg
      } catch { setErr('오디오를 초기화할 수 없습니다.'); return null }
    }
    return ctx
  }, [supported, master])

  // 한 레이어 시작
  const startLayer = useCallback((id: LayerId) => {
    const ctx = ensureCtx()
    if (!ctx || !masterGainRef.current) return
    if (activeRef.current[id]) return
    try {
      const g = ctx.createGain()
      g.gain.value = vols[id] ?? 0.5
      g.connect(masterGainRef.current)
      const stop = LAYER_MAP[id].build(ctx, g)
      activeRef.current[id] = { gain: g, stop }
    } catch { /* 개별 레이어 실패는 무시 */ }
  }, [ensureCtx, vols])

  // 한 레이어 정지
  const stopLayer = useCallback((id: LayerId) => {
    const node = activeRef.current[id]
    if (!node) return
    try { node.stop() } catch { /* noop */ }
    try { node.gain.disconnect() } catch { /* noop */ }
    delete activeRef.current[id]
  }, [])

  // 모든 활성 레이어 정지
  const stopAllLayers = useCallback(() => {
    for (const id of Object.keys(activeRef.current) as LayerId[]) stopLayer(id)
  }, [stopLayer])

  // 전체 재생/정지 토글
  const play = useCallback(async () => {
    if (!supported) { setErr('이 브라우저는 Web Audio를 지원하지 않습니다.'); return }
    const active = (Object.keys(vols) as LayerId[]).filter(k => LAYER_MAP[k])
    if (!active.length) { showToast('레이어를 먼저 켜주세요'); return }
    setErr('')
    const ctx = ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* noop */ } }
    for (const id of active) startLayer(id)
    playingRef.current = true
    setPlaying(true)
  }, [supported, vols, ensureCtx, startLayer, showToast])

  const stop = useCallback(() => {
    stopAllLayers()
    playingRef.current = false
    setPlaying(false)
    try { ctxRef.current?.suspend() } catch { /* noop */ }
    // 슬립 타이머도 해제
    if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null }
    setSleepLeft(0)
    releaseWake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAllLayers])

  const togglePlay = useCallback(() => { if (playingRef.current) stop(); else play() }, [play, stop])

  // 레이어 on/off
  const toggleLayer = useCallback((id: LayerId) => {
    setVols(prev => {
      const next = { ...prev }
      if (id in next) {
        delete next[id]
        if (playingRef.current) stopLayer(id)
      } else {
        next[id] = prev[id] ?? 0.5
        if (playingRef.current) {
          // setVols 직후 startLayer 가 최신 vols 를 못 볼 수 있어 직접 값 전달
          const ctx = ensureCtx()
          if (ctx && masterGainRef.current && !activeRef.current[id]) {
            try {
              const g = ctx.createGain()
              g.gain.value = next[id] ?? 0.5
              g.connect(masterGainRef.current)
              const st = LAYER_MAP[id].build(ctx, g)
              activeRef.current[id] = { gain: g, stop: st }
            } catch { /* noop */ }
          }
        }
      }
      return next
    })
  }, [stopLayer, ensureCtx])

  // 레이어 볼륨 변경
  const setLayerVol = useCallback((id: LayerId, v: number) => {
    setVols(prev => ({ ...prev, [id]: v }))
    const node = activeRef.current[id]
    const ctx = ctxRef.current
    if (node && ctx) {
      try { node.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.03) } catch { node.gain.gain.value = v }
    }
  }, [])

  // 프리셋 적용
  const applyPreset = useCallback((pv: Partial<Record<LayerId, number>>) => {
    const wasPlaying = playingRef.current
    // 기존 활성 정지
    stopAllLayers()
    const clean: Partial<Record<LayerId, number>> = {}
    for (const k of Object.keys(pv) as LayerId[]) {
      if (LAYER_MAP[k]) clean[k] = Math.max(0, Math.min(1, pv[k] as number))
    }
    setVols(clean)
    if (wasPlaying) {
      const ctx = ensureCtx()
      if (ctx && masterGainRef.current) {
        for (const id of Object.keys(clean) as LayerId[]) {
          try {
            const g = ctx.createGain()
            g.gain.value = clean[id] ?? 0.5
            g.connect(masterGainRef.current)
            const st = LAYER_MAP[id].build(ctx, g)
            activeRef.current[id] = { gain: g, stop: st }
          } catch { /* noop */ }
        }
      }
    }
  }, [stopAllLayers, ensureCtx])

  const saveCurrentPreset = useCallback(() => {
    const active = (Object.keys(vols) as LayerId[]).filter(k => LAYER_MAP[k])
    if (!active.length) { showToast('저장할 레이어가 없습니다'); return }
    const name = presetName.trim() || ('프리셋 ' + (presets.length + 1))
    const vmap: Partial<Record<LayerId, number>> = {}
    for (const k of active) vmap[k] = vols[k] as number
    const p: Preset = { id: uid(), name, vols: vmap, created: Date.now() }
    const next = [p, ...presets]
    setPresets(next); savePresets(next)
    setPresetName('')
    showToast('프리셋을 저장했습니다')
  }, [vols, presetName, presets, showToast])

  const deletePreset = useCallback((id: string) => {
    const next = presets.filter(p => p.id !== id)
    setPresets(next); savePresets(next)
  }, [presets])

  // ---- Wake Lock ----
  const requestWake = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }
      if (nav.wakeLock) { wakeRef.current = await nav.wakeLock.request('screen') }
    } catch { /* 미지원·거부 무시 */ }
  }, [])
  const releaseWake = useCallback(() => {
    try { wakeRef.current?.release() } catch { /* noop */ }
    wakeRef.current = null
  }, [])

  // 재생 시작 시 화면 켜둠 시도
  useEffect(() => {
    if (playing) requestWake()
    else releaseWake()
  }, [playing, requestWake, releaseWake])

  // ---- 슬립 타이머 적용 ----
  const startSleep = useCallback(() => {
    if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null }
    if (sleepMin <= 0) { setSleepLeft(0); return }
    if (!playingRef.current) { play() }
    let left = sleepMin * 60
    setSleepLeft(left)
    sleepTimerRef.current = setInterval(() => {
      left -= 1
      setSleepLeft(left)
      if (left <= 0) {
        if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null }
        stop()
        showToast('슬립 타이머: 자동 정지했습니다')
      }
    }, 1000)
  }, [sleepMin, play, stop, showToast])

  // ---- 마스터 볼륨 반영 & 영속 ----
  useEffect(() => {
    try { localStorage.setItem(NS + ':master', String(master)) } catch { /* noop */ }
    const mg = masterGainRef.current, ctx = ctxRef.current
    if (mg && ctx) { try { mg.gain.setTargetAtTime(master, ctx.currentTime, 0.03) } catch { mg.gain.value = master } }
  }, [master])

  // 현재 믹스(vols) 영속
  useEffect(() => { saveState({ vols }) }, [vols])

  // ---- 언마운트: 전부 정지·해제 ----
  useEffect(() => {
    return () => {
      // 레이어 정지
      for (const id of Object.keys(activeRef.current) as LayerId[]) {
        const node = activeRef.current[id]
        try { node?.stop() } catch { /* noop */ }
        try { node?.gain.disconnect() } catch { /* noop */ }
      }
      activeRef.current = {}
      if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null }
      try { wakeRef.current?.release() } catch { /* noop */ }
      wakeRef.current = null
      try { masterGainRef.current?.disconnect() } catch { /* noop */ }
      masterGainRef.current = null
      const ctx = ctxRef.current
      ctxRef.current = null
      if (ctx) { try { ctx.close() } catch { /* noop */ } }
    }
  }, [])

  // ---- 연계: 현재 믹스를 글로 정리 ----
  const mixSummary = useCallback((): string => {
    const active = (Object.keys(vols) as LayerId[]).filter(k => LAYER_MAP[k])
    if (!active.length) return ''
    return active.map(k => `${LAYER_MAP[k].icon} ${LAYER_MAP[k].name} ${Math.round((vols[k] as number) * 100)}%`).join(' · ')
  }, [vols])

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addMixToStash = useCallback(() => {
    const sum = mixSummary()
    if (!sum) { showToast('담을 믹스가 없습니다'); return }
    addToStash({ kind: 'note', label: '사운드스케이프 믹스', text: '집중 사운드스케이프: ' + sum })
    showToast('수집함에 담았습니다')
  }, [mixSummary, showToast])

  const addMixToProject = useCallback(() => {
    const active = (Object.keys(vols) as LayerId[]).filter(k => LAYER_MAP[k])
    if (!active.length) { showToast('담을 믹스가 없습니다'); return }
    const rows = active.map(k => `<li>${esc(LAYER_MAP[k].icon + ' ' + LAYER_MAP[k].name)} — ${Math.round((vols[k] as number) * 100)}%</li>`).join('')
    const id = addToProject({
      root: 'research',
      folder: '집필 환경',
      title: '사운드스케이프 믹스',
      bodyHtml: `<p>집중을 위한 사운드스케이프 레이어 구성:</p><ul>${rows}</ul><p>마스터 볼륨 ${Math.round(master * 100)}%</p>`,
    })
    showToast(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되어 있지 않습니다')
  }, [vols, master, showToast])

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }
  const card = (on: boolean): React.CSSProperties => ({
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'color-mix(in srgb, var(--accent) 10%, var(--paper))' : 'var(--paper)',
    borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
  })
  const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chip: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', borderRadius: 999, padding: '4px 10px', cursor: 'pointer', font: 'inherit', fontSize: 13, color: 'var(--text)' }

  const activeCount = (Object.keys(vols) as LayerId[]).filter(k => LAYER_MAP[k]).length
  const fmtLeft = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={wrap}>
      <div style={head}>
        <button className={playing ? 'minibtn' : 'btn-primary'} onClick={togglePlay} disabled={!supported} style={{ minWidth: 96 }}>
          {playing ? '⏹ 정지' : '▶ 재생'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', minWidth: 180 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}><Emoji e="🔊"/> 마스터</span>
          <input type="range" min={0} max={1} step={0.01} value={master} disabled={!supported}
            onChange={e => setMaster(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label="마스터 볼륨" />
          <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 38, textAlign: 'right' }}>{Math.round(master * 100)}%</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {activeCount ? `${activeCount}개 레이어${playing ? ' · 재생 중' : ''}` : '레이어를 골라보세요'}
          {sleepLeft > 0 && ` · 슬립 ${fmtLeft(sleepLeft)}`}
        </span>
      </div>

      <div style={body}>
        {!supported && (
          <div style={{ ...hint, color: 'var(--warn)' }}>이 브라우저에서는 Web Audio를 사용할 수 없어 사운드를 재생할 수 없습니다. (다른 기능은 둘러볼 수 있습니다)</div>
        )}
        {err && <div style={{ ...hint, color: 'var(--warn)' }}>{err}</div>}

        {/* 내장 프리셋 */}
        <div>
          <div style={sectionTitle}>빠른 프리셋</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BUILTIN.map(b => (
              <button key={b.name} style={chip} onClick={() => applyPreset(b.vols)} title={Object.keys(b.vols).map(k => LAYER_MAP[k as LayerId]?.name).join(', ')}>
                <Emoji e={b.icon}/> {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* 레이어 그리드 */}
        <div>
          <div style={sectionTitle}>음향 레이어</div>
          <div style={grid}>
            {LAYERS.map(l => {
              const on = l.id in vols
              const v = vols[l.id] ?? 0.5
              return (
                <div key={l.id} style={card(on)}>
                  <div style={cardTop} onClick={() => toggleLayer(l.id)} role="button" aria-pressed={on}>
                    <span style={{ fontSize: 22 }}><Emoji e={l.icon}/></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{l.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.desc}</span>
                    </span>
                    <span style={{
                      width: 38, height: 22, borderRadius: 999, position: 'relative', flexShrink: 0,
                      background: on ? 'var(--accent)' : 'var(--border)', transition: 'background .15s',
                    }} aria-hidden>
                      <span style={{
                        position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%',
                        background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.3)',
                      }} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: on ? 1 : 0.4 }}>
                    <input type="range" min={0} max={1} step={0.01} value={v} disabled={!on || !supported}
                      onChange={e => setLayerVol(l.id, parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label={`${l.name} 볼륨`} />
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 34, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 슬립 타이머 */}
        <div>
          <div style={sectionTitle}>슬립 타이머</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {[0, 15, 30, 45, 60, 90].map(m => (
              <button key={m} className="minibtn" onClick={() => setSleepMin(m)}
                style={{ outline: sleepMin === m ? '2px solid var(--accent)' : 'none' }}>
                {m === 0 ? '끄기' : `${m}분`}
              </button>
            ))}
            <button className="btn-primary" onClick={startSleep} disabled={!supported || sleepMin <= 0}>설정</button>
            {sleepLeft > 0 && <span style={{ fontSize: 13, color: 'var(--accent)' }}>남은 시간 {fmtLeft(sleepLeft)}</span>}
          </div>
          <div style={{ ...hint, marginTop: 4 }}>설정한 시간이 지나면 자동으로 정지합니다. 재생 중이면 화면이 꺼지지 않도록 시도합니다(지원 시).</div>
        </div>

        {/* 내 프리셋 */}
        <div>
          <div style={sectionTitle}>내 프리셋</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="프리셋 이름(선택)"
              style={{ flex: '1 1 180px', minWidth: 140, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', font: 'inherit' }} />
            <button className="btn-primary" onClick={saveCurrentPreset} disabled={!activeCount}><Emoji e="💾"/> 현재 믹스 저장</button>
          </div>
          {presets.length === 0
            ? <div style={hint}>아직 저장한 프리셋이 없습니다. 레이어를 조합한 뒤 저장해보세요.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {presets.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', background: 'var(--paper)' }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(Object.keys(p.vols) as LayerId[]).filter(k => LAYER_MAP[k]).map((k, i) => (
                        <span key={k}>{i > 0 ? ' · ' : ''}<Emoji e={LAYER_MAP[k].icon}/>{LAYER_MAP[k].name}</span>
                      ))}
                    </span>
                    <button className="minibtn" onClick={() => applyPreset(p.vols)}>불러오기</button>
                    <button className="linkbtn" onClick={() => deletePreset(p.id)} style={{ color: 'var(--warn)' }}>삭제</button>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 연계 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          {hasStash() && (
            <button className="minibtn" onClick={addMixToStash} disabled={!activeCount} title="현재 레이어 구성을 메모로 수집함에 담습니다"><Emoji e="🧺"/> 수집함에 담기</button>
          )}
          {hasProjectBridge() && (
            <button className="minibtn" onClick={addMixToProject} disabled={!activeCount} title="현재 믹스 구성을 프로젝트 자료에 메모로 추가합니다"><Emoji e="📄"/> 프로젝트에 추가</button>
          )}
          <button className="linkbtn" onClick={() => openToolLinked('pomodoro-timer')}><Emoji e="🍅"/> 뽀모도로 타이머</button>
          <button className="linkbtn" onClick={() => openToolLinked('breathing-timer')}><Emoji e="🫁"/> 집중 호흡</button>
        </div>

        <div style={hint}>모든 소리는 브라우저에서 실시간 합성됩니다(네트워크·파일 불필요). 창을 닫으면 자동으로 모두 정지합니다.</div>
      </div>

      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: 999, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,.25)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
