// 인물 사운드트랙 — 인물의 분위기·성격·감정 키워드를 결정론적 알고리즘으로
//   음악 속성(템포 BPM·조성 key·박자·악기 편성·다이내믹·질감)으로 변환해 '분위기 카드'를 만든다.
//   여러 장면(아크) 큐를 쌓아 BPM/에너지/긴장도 곡선을 막대 그래프로 시각화하고,
//   결정론적 의사난수(시드=문자열 해시)로 같은 입력은 항상 같은 결과를 낸다.
// 연계(linkbus): characters 라이브러리에서 인물 수용 / 좌측 바인더 문서 드롭 / payload 수용,
//   addToLibrary('snippets') 저장, addToProject 로 자료 추가, addToStash 수집함,
//   openToolLinked 로 사운드스케이프·플레이리스트 등 음악 도구를 검색어와 함께 연다.
// 외부 네트워크 없음. 전부 브라우저 로컬 계산. import 는 react 와 ./linkbus 만.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked, TOOL_RELATIONS,
  getDragItem, isItemDrag,
  CHARACTER_FIELD_KEYS,
  type SharedCharacter, type SharedSnippet, type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'character-soundtrack',
  name: '인물 사운드트랙',
  icon: '🎵',
  group: '분위기·시각',
  intro: '인물의 분위기와 감정을 템포·조성·악기 편성으로 변환해 분위기 카드를 만들고 음악 도구로 이어서 작업하세요',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:character-soundtrack'

// ── HTML 이스케이프(프로젝트 본문은 HTML 로 전달됨) ──
function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 결정론적 문자열 해시(시드) ──
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
// 시드 기반 의사난수 생성기(mulberry32)
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 감정/분위기 어휘 사전 → 음악 축(valence 긍정도, arousal 각성도, tension 긴장도) ──
// 한국어 키워드를 가벼운 매칭으로 점수화. 입력에 없으면 중립.
interface Axis { v: number; a: number; t: number } // -1..1 범위 가중치
const LEXICON: { words: string[]; ax: Axis }[] = [
  { words: ['따뜻', '포근', '다정', '온화', '사랑', '평온', '안정', '편안', '잔잔', '고요'], ax: { v: 0.8, a: -0.5, t: -0.6 } },
  { words: ['기쁨', '행복', '명랑', '활발', '쾌활', '경쾌', '발랄', '낙천', '희망', '밝'], ax: { v: 0.9, a: 0.6, t: -0.3 } },
  { words: ['열정', '용맹', '용감', '대담', '강인', '의지', '결연', '투지', '도전'], ax: { v: 0.5, a: 0.85, t: 0.3 } },
  { words: ['분노', '격노', '증오', '복수', '광기', '폭력', '잔혹', '난폭'], ax: { v: -0.7, a: 0.9, t: 0.85 } },
  { words: ['불안', '초조', '두려움', '공포', '겁', '긴장', '의심', '경계', '위협'], ax: { v: -0.6, a: 0.7, t: 0.9 } },
  { words: ['슬픔', '비애', '우울', '절망', '상실', '비탄', '쓸쓸', '외로', '고독', '눈물', '애상'], ax: { v: -0.85, a: -0.4, t: 0.2 } },
  { words: ['냉정', '냉혹', '무심', '무표정', '차가', '담담', '침착', '이성', '계산'], ax: { v: -0.2, a: -0.3, t: 0.45 } },
  { words: ['신비', '몽환', '환상', '비밀', '음울', '어둠', '그림자', '미스터리', '괴이'], ax: { v: -0.3, a: 0.1, t: 0.65 } },
  { words: ['고귀', '우아', '품위', '장엄', '웅장', '위엄', '숭고', '고전'], ax: { v: 0.4, a: 0.4, t: 0.1 } },
  { words: ['순수', '천진', '소박', '어린', '맑', '깨끗', '청순'], ax: { v: 0.7, a: 0.1, t: -0.4 } },
  { words: ['교활', '음흉', '간교', '능청', '위선', '교묘'], ax: { v: -0.4, a: 0.3, t: 0.55 } },
  { words: ['혼란', '광란', '소란', '급박', '다급', '절박', '필사'], ax: { v: -0.3, a: 0.9, t: 0.8 } },
]

// 텍스트 → 축 평균(없으면 0). 시드는 일관된 변주를 위해 함께 사용.
function analyzeAxes(text: string): { v: number; a: number; t: number; matched: string[] } {
  const lc = (text || '').toLowerCase()
  let v = 0, a = 0, t = 0, n = 0
  const matched: string[] = []
  for (const e of LEXICON) {
    for (const w of e.words) {
      if (lc.includes(w)) {
        v += e.ax.v; a += e.ax.a; t += e.ax.t; n++
        if (matched.length < 8) matched.push(w)
        break // 그룹당 1회만
      }
    }
  }
  if (n === 0) return { v: 0, a: 0, t: 0, matched: [] }
  return { v: clamp(v / n, -1, 1), a: clamp(a / n, -1, 1), t: clamp(t / n, -1, 1), matched }
}
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)) }

// ── 조성(key) 선택: valence 와 텐션으로 장/단조와 모드를 고름 ──
const MAJOR_KEYS = ['C장조', 'G장조', 'D장조', 'A장조', 'F장조', 'B플랫장조', 'E플랫장조']
const MINOR_KEYS = ['A단조', 'E단조', 'D단조', 'B단조', 'C샤프단조', 'F샤프단조', 'G단조']
const MODES = ['도리안 선법', '프리지안 선법', '리디안 선법', '믹솔리디안 선법', '에올리안 선법', '로크리안 선법']

// ── 악기 팔레트(분위기 축에 따라 가중) ──
interface Inst { name: string; tag: 'warm' | 'bright' | 'dark' | 'tense' | 'epic' | 'intimate' }
const INSTRUMENTS: Inst[] = [
  { name: '피아노', tag: 'intimate' }, { name: '첼로', tag: 'warm' }, { name: '바이올린 독주', tag: 'intimate' },
  { name: '현악 4중주', tag: 'warm' }, { name: '풀 오케스트라', tag: 'epic' }, { name: '하프', tag: 'warm' },
  { name: '목관(플루트·클라리넷)', tag: 'bright' }, { name: '어쿠스틱 기타', tag: 'intimate' }, { name: '뮤직박스', tag: 'intimate' },
  { name: '신스 패드', tag: 'dark' }, { name: '낮은 드론', tag: 'dark' }, { name: '타악(팀파니)', tag: 'epic' },
  { name: '디스토션 기타', tag: 'tense' }, { name: '불협 현악 트레몰로', tag: 'tense' }, { name: '금관(호른·트럼펫)', tag: 'epic' },
  { name: '합창', tag: 'epic' }, { name: '전자 비트', tag: 'tense' }, { name: '오르간', tag: 'dark' },
  { name: '첼레스타', tag: 'bright' }, { name: '리코더', tag: 'bright' },
]

// ── 사운드트랙 사양 ──
interface SoundtrackSpec {
  bpm: number
  energy: number       // 0..100
  tension: number      // 0..100
  warmth: number       // 0..100 (긍정/따뜻함)
  key: string
  mode: string
  meter: string        // 박자
  dynamics: string     // 다이내믹
  texture: string      // 질감
  instruments: string[]
  descriptors: string[] // 한국어 분위기 형용
  searchQuery: string   // 음악 도구로 넘길 영어 검색어
}

const TEMPO_WORDS = [
  { max: 60, label: '라르고(아주 느림)' }, { max: 76, label: '아다지오(느림)' },
  { max: 96, label: '안단테(걷는 속도)' }, { max: 112, label: '모데라토(보통)' },
  { max: 132, label: '알레그레토(다소 빠름)' }, { max: 160, label: '알레그로(빠름)' },
  { max: 999, label: '프레스토(매우 빠름)' },
]
function tempoWord(bpm: number): string {
  for (const t of TEMPO_WORDS) if (bpm <= t.max) return t.label
  return TEMPO_WORDS[TEMPO_WORDS.length - 1].label
}

const SEARCH_TERMS = {
  warm: ['warm', 'tender', 'cozy', 'gentle'],
  bright: ['uplifting', 'cheerful', 'playful', 'bright'],
  dark: ['dark', 'mysterious', 'shadowy', 'haunting'],
  tense: ['tense', 'suspense', 'anxious', 'dissonant'],
  epic: ['epic', 'heroic', 'cinematic', 'grand'],
  sad: ['melancholy', 'sorrowful', 'wistful', 'lonely'],
  calm: ['calm', 'ambient', 'peaceful', 'soft'],
}

// 축 → 사양 (결정론적)
function buildSpec(seedStr: string, ax: { v: number; a: number; t: number }): SoundtrackSpec {
  const seed = hashStr(seedStr || 'neutral')
  const r = rng(seed)
  const jitter = (range: number) => (r() - 0.5) * 2 * range

  // BPM: 각성도가 높을수록 빠름(48~168), 텐션이 약간 가속
  const baseBpm = 96 + ax.a * 58 + ax.t * 12 + jitter(8)
  const bpm = Math.round(clamp(baseBpm, 48, 172))

  const energy = Math.round(clamp(50 + ax.a * 45 + ax.t * 8 + jitter(6), 2, 100))
  const tension = Math.round(clamp(50 + ax.t * 48 + jitter(6), 2, 100))
  const warmth = Math.round(clamp(50 + ax.v * 48 + jitter(6), 2, 100))

  // 조성: valence 가 양이면 장조 경향, 음이면 단조. 텐션 강하면 선법/단조.
  let key: string, mode: string
  if (ax.t > 0.55 && r() > 0.4) {
    mode = MODES[Math.floor(r() * MODES.length)]
    key = (ax.v >= 0 ? MAJOR_KEYS : MINOR_KEYS)[Math.floor(r() * 7)]
  } else if (ax.v >= 0.1) {
    key = MAJOR_KEYS[Math.floor(r() * MAJOR_KEYS.length)]
    mode = '장조'
  } else if (ax.v <= -0.1) {
    key = MINOR_KEYS[Math.floor(r() * MINOR_KEYS.length)]
    mode = '단조'
  } else {
    key = (r() > 0.5 ? MAJOR_KEYS : MINOR_KEYS)[Math.floor(r() * 7)]
    mode = key.includes('단조') ? '단조' : '장조'
  }

  // 박자
  const meterPool = ax.t > 0.6 ? ['5/4 변박', '7/8 변박', '4/4 당김음'] :
    ax.a > 0.4 ? ['4/4', '2/4 행진', '6/8 활기'] :
      ['3/4 왈츠', '4/4 느린', '6/8 자장가']
  const meter = meterPool[Math.floor(r() * meterPool.length)]

  // 다이내믹 / 질감
  const dynPool = energy > 70 ? ['포르티시모(매우 큼)', '크레셴도(점점 크게)'] :
    energy < 35 ? ['피아니시모(매우 여리게)', '서서히 사라짐'] : ['메조포르테(보통)', '물결치는 셈여림']
  const dynamics = dynPool[Math.floor(r() * dynPool.length)]
  const texPool = tension > 65 ? ['빽빽하고 불안정', '겹겹의 긴장'] :
    warmth > 65 ? ['따뜻하고 둥근', '품에 안기는 듯'] :
      energy < 35 ? ['투명하고 성긴', '여백이 많은'] : ['균형 잡힌', '서사적인']
  const texture = texPool[Math.floor(r() * texPool.length)]

  // 악기: 축에 맞는 태그를 가중 선택, 3~5개
  const weight = (tag: Inst['tag']): number => {
    switch (tag) {
      case 'warm': return 1 + ax.v * 1.2 - ax.t * 0.4
      case 'bright': return 1 + ax.v * 1.0 + ax.a * 0.4 - ax.t * 0.6
      case 'dark': return 1 - ax.v * 1.0 + ax.t * 0.9
      case 'tense': return 1 + ax.t * 1.6 + ax.a * 0.5
      case 'epic': return 1 + ax.a * 1.3 + Math.abs(ax.t) * 0.4
      case 'intimate': return 1 + ax.v * 0.5 - ax.a * 0.9 - ax.t * 0.3
    }
  }
  const pool = INSTRUMENTS.map((ins) => ({ ins, w: Math.max(0.05, weight(ins.tag)) + r() * 0.6 }))
    .sort((x, y) => y.w - x.w)
  const count = 3 + (energy > 60 ? 1 : 0) + (r() > 0.6 ? 1 : 0)
  const instruments = pool.slice(0, count).map((p) => p.ins.name)

  // 분위기 형용
  const descPool: string[] = []
  if (warmth > 65) descPool.push('따뜻한', '포근한')
  if (warmth < 35) descPool.push('서늘한', '쓸쓸한')
  if (tension > 65) descPool.push('불안한', '날 선')
  if (energy > 70) descPool.push('격정적인', '몰아치는')
  if (energy < 35) descPool.push('고요한', '명상적인')
  if (!descPool.length) descPool.push('잔잔한', '여운이 남는')
  const descriptors = Array.from(new Set(descPool)).slice(0, 4)

  // 음악 도구 검색어(영어): 지배적 태그 → 단어 풀에서 시드로 고름
  const dominant: keyof typeof SEARCH_TERMS =
    tension > 70 ? 'tense' :
      ax.v < -0.4 && energy < 50 ? 'sad' :
        energy > 70 ? 'epic' :
          warmth > 65 && energy < 50 ? 'warm' :
            energy < 35 ? 'calm' :
              ax.v > 0.4 ? 'bright' : 'dark'
  const terms = SEARCH_TERMS[dominant]
  const term = terms[Math.floor(r() * terms.length)]
  const family = instruments[0].includes('피아노') ? 'piano' :
    instruments.some((i) => i.includes('오케스트라') || i.includes('현악')) ? 'orchestral strings' :
      instruments.some((i) => i.includes('신스') || i.includes('전자') || i.includes('드론')) ? 'ambient synth' :
        instruments[0].includes('기타') ? 'acoustic guitar' : 'instrumental'
  const searchQuery = `${term} ${family} instrumental`

  return { bpm, energy, tension, warmth, key, mode, meter, dynamics, texture, instruments, descriptors, searchQuery }
}

// ── 큐 항목(여러 장면/아크) ──
interface CueItem {
  id: string
  label: string     // 인물/장면 이름
  mood: string      // 입력 분위기 텍스트
  spec: SoundtrackSpec
}
interface Persisted {
  name: string      // 현재 입력 인물명
  mood: string      // 현재 분위기 텍스트
  cues: CueItem[]
}

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return {
        name: typeof p.name === 'string' ? p.name : '',
        mood: typeof p.mood === 'string' ? p.mood : '',
        cues: Array.isArray(p.cues) ? p.cues.filter((c) => c && c.spec && typeof c.spec.bpm === 'number') : [],
      }
    }
  } catch { /* noop */ }
  return { name: '', mood: '', cues: [] }
}

function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// 캐릭터 라이브러리 항목 → 분위기 텍스트로 합성
function characterMoodText(c: SharedCharacter): string {
  const f = c.fields || {}
  const parts: string[] = []
  for (const k of ['personality', 'value', 'goal', 'motivation', 'fear', 'flaw', 'mbti', 'role', 'notes']) {
    const val = (f as Record<string, string>)[k]
    if (val) parts.push(val)
  }
  if (!parts.length && c.personality) parts.push(c.personality)
  if (!parts.length && c.notes) parts.push(c.notes)
  return parts.join('. ')
}

function specBodyHtml(name: string, mood: string, s: SoundtrackSpec): string {
  const p: string[] = []
  p.push('<p><b>' + escHtml(name || '무명 인물') + '</b> 사운드트랙</p>')
  if (mood) p.push('<p>분위기 입력: ' + escHtml(mood) + '</p>')
  p.push('<ul>')
  p.push('<li>템포: ' + s.bpm + ' BPM (' + escHtml(tempoWord(s.bpm)) + ')</li>')
  p.push('<li>조성: ' + escHtml(s.key) + ' / ' + escHtml(s.mode) + '</li>')
  p.push('<li>박자: ' + escHtml(s.meter) + '</li>')
  p.push('<li>다이내믹: ' + escHtml(s.dynamics) + '</li>')
  p.push('<li>질감: ' + escHtml(s.texture) + '</li>')
  p.push('<li>악기 편성: ' + escHtml(s.instruments.join(', ')) + '</li>')
  p.push('<li>형용: ' + escHtml(s.descriptors.join(', ')) + '</li>')
  p.push('<li>에너지 ' + s.energy + ' / 긴장 ' + s.tension + ' / 따뜻함 ' + s.warmth + ' (0~100)</li>')
  p.push('</ul>')
  return p.join('\n')
}

const REL_LABEL: Record<string, string> = {
  'soundscape-mixer': '사운드스케이프 믹서',
  'playlist-builder': '집필 플레이리스트',
  'music-gallery': '음악 갤러리',
  'ambient-sound': '앰비언트 사운드',
  'sensory-palette': '감각 팔레트',
  'character-sheet': '인물 시트',
  'setting-bible': '배경 설정집',
  'scene-forge': '장면 생성기',
}

export default function CharacterSoundtrack({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const { name, mood, cues } = state
  const characters = useLibraryList('characters')

  const [toast, setToast] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const mountedRef = useRef(true)
  const toastTimerRef = useRef<number | null>(null)
  const flash = useCallback((m: string) => {
    if (toastTimerRef.current !== null) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null }
    setToast(m)
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null
      if (mountedRef.current) setToast('')
    }, 1700)
  }, [])

  // 언마운트 시 toast 타이머 정리 + 마운트 플래그 해제(언마운트 후 setState 경고 방지)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (toastTimerRef.current !== null) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null }
    }
  }, [])

  // 영속
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* noop */ }
  }, [state])

  // payload / 드롭으로 들어온 데이터 수용
  useEffect(() => {
    if (!payload) return
    const pName = typeof payload.name === 'string' ? payload.name : (typeof payload.title === 'string' ? payload.title : '')
    let pMood = ''
    if (typeof payload.mood === 'string') pMood = payload.mood
    else if (typeof payload.text === 'string') pMood = payload.text
    else if (payload.character && typeof payload.character === 'object') {
      const ch = payload.character as Record<string, string>
      pMood = CHARACTER_FIELD_KEYS.map((k) => ch[k]).filter(Boolean).join('. ')
    }
    if (pName || pMood) setState((s) => ({ ...s, name: pName || s.name, mood: pMood || s.mood }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 현재 입력 → 사양(결정론적, 메모이즈)
  const analysis = useMemo(() => analyzeAxes(mood), [mood])
  const spec = useMemo(() => buildSpec((name + '|' + mood) || 'neutral', analysis), [name, mood, analysis])
  const hasInput = (mood.trim().length > 0) || (name.trim().length > 0)

  const bridge = hasProjectBridge()
  const stashOK = hasStash()

  // ── 액션 ──
  const useCharacter = (c: SharedCharacter) => {
    const text = characterMoodText(c)
    setState((s) => ({ ...s, name: c.name || s.name, mood: text || s.mood }))
    flash('“' + (c.name || '인물') + '” 분위기를 불러왔습니다')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropHot(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    let text = item.text || ''
    if (item.character) {
      const extra = CHARACTER_FIELD_KEYS.map((k) => item.character![k]).filter(Boolean).join('. ')
      if (extra) text = extra
    }
    setState((s) => ({ ...s, name: item.title || s.name, mood: (text || s.mood).slice(0, 4000) }))
    flash('바인더 문서 “' + (item.title || '문서') + '”를 불러왔습니다')
  }

  const addCue = () => {
    if (!hasInput) { flash('먼저 인물명이나 분위기를 입력하세요'); return }
    const cue: CueItem = { id: uid('cue'), label: name.trim() || '무명', mood: mood.trim(), spec }
    setState((s) => ({ ...s, cues: [...s.cues, cue] }))
    flash('큐에 추가됨 — BPM/에너지 곡선에 반영됩니다')
  }
  const removeCue = (id: string) => setState((s) => ({ ...s, cues: s.cues.filter((c) => c.id !== id) }))
  const moveCue = (i: number, dir: -1 | 1) => setState((s) => {
    const arr = [...s.cues]; const j = i + dir
    if (j < 0 || j >= arr.length) return s
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    return { ...s, cues: arr }
  })
  const clearCues = () => {
    if (!cues.length) return
    if (!window.confirm('큐의 모든 장면을 비울까요?')) return
    setState((s) => ({ ...s, cues: [] }))
  }
  const loadCue = (c: CueItem) => setState((s) => ({ ...s, name: c.label, mood: c.mood }))

  // ── 연계 산출 ──
  const saveSnippet = () => {
    if (!hasInput) return
    const item: Partial<SharedSnippet> = {
      text: `[사운드트랙] ${name || '무명'} — ${spec.bpm}BPM, ${spec.key} ${spec.mode}, ${spec.meter} · ${spec.instruments.join('/')} · ${spec.descriptors.join(' ')}`,
      source: '인물 사운드트랙', tags: ['음악', '분위기', '사운드트랙'],
    }
    addToLibrary('snippets', item)
    flash('스니펫 라이브러리에 저장됨')
  }
  const saveToCharacter = () => {
    if (!name.trim()) { flash('인물명을 입력하면 캐릭터로 저장할 수 있습니다'); return }
    const summary = `${spec.bpm}BPM · ${spec.key} ${spec.mode} · ${spec.instruments.join('/')} · ${spec.descriptors.join(' ')}`
    addToLibrary('characters', {
      name: name.trim(),
      fields: { name: name.trim(), notes: '테마곡: ' + summary, ...(mood.trim() ? { personality: mood.trim() } : {}) },
      notes: '테마곡: ' + summary,
      source: '인물 사운드트랙',
    })
    flash('인물 라이브러리에 테마곡과 함께 저장됨')
  }
  const toProject = () => {
    if (!hasInput || !bridge) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물 사운드트랙',
      title: (name.trim() || '무명') + ' 사운드트랙',
      bodyHtml: specBodyHtml(name, mood, spec),
      synopsis: spec.descriptors.join(' ') + ' / ' + spec.bpm + 'BPM ' + spec.key,
      meta: { BPM: String(spec.bpm), 조성: spec.key + ' ' + spec.mode, 박자: spec.meter, 악기: spec.instruments.join(', '), 에너지: String(spec.energy), 긴장: String(spec.tension) },
    })
    if (id) flash('프로젝트 자료에 사운드트랙 카드 추가됨')
  }
  const stashIt = () => {
    if (!hasInput) return
    addToStash({ kind: 'memo', label: (name || '인물') + ' 사운드트랙', text: `${spec.bpm}BPM ${spec.key} ${spec.mode} / ${spec.instruments.join(', ')} / ${spec.descriptors.join(' ')}` })
    flash('수집함에 담음')
  }
  const openMusic = (toolId: string) => openToolLinked(toolId, { query: spec.searchQuery, mood: spec.descriptors.join(' '), name, bpm: spec.bpm })

  // 관련 음악 도구 목록(존재할 법한 것 우선 + 관계표 합집합)
  const relatedIds = useMemo(() => {
    const base = ['soundscape-mixer', 'playlist-builder', 'music-gallery', 'ambient-sound', 'sensory-palette']
    const fromRel = TOOL_RELATIONS['playlist-builder'] || []
    const all = Array.from(new Set([...base, ...fromRel])).filter((id) => id !== meta.id)
    return all.slice(0, 7)
  }, [])

  // ── 스타일 ──
  const C = { panel: 'var(--panel)', border: 'var(--border)', muted: 'var(--muted)', accent: 'var(--accent)', text: 'var(--text)' }
  const card: React.CSSProperties = { background: C.panel, border: '1px solid ' + C.border, borderRadius: 10, padding: 10 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 9px', borderRadius: 8, border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: 13, boxSizing: 'border-box' }

  // 막대 그래프(BPM 정규화) 최대값
  const maxBpm = Math.max(120, ...cues.map((c) => c.spec.bpm))

  // 게이지 한 줄
  const Gauge = ({ label, val, color }: { label: string; val: number; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.muted }}>
      <span style={{ width: 48 }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: clamp(val, 0, 100) + '%', background: color, transition: 'width .25s' }} />
      </div>
      <span style={{ width: 26, textAlign: 'right', color: C.text }}>{val}</span>
    </div>
  )

  return (
    <div
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }}
      onDragLeave={() => setDropHot(false)}
      onDrop={onDrop}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: C.text, minHeight: 0, outline: dropHot ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
    >
      {/* 입력 */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <input className="field" value={name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} placeholder="인물 이름 (예: 서리)" style={inputStyle} />
        <textarea
          value={mood}
          onChange={(e) => setState((s) => ({ ...s, mood: e.target.value }))}
          placeholder="이 인물의 분위기·성격·지금 감정을 적어보세요. 예) 다정하지만 깊은 슬픔과 죄책감을 감추고 있다. 결정적 순간엔 차갑고 단호해진다."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
        />
        <div style={{ fontSize: 11, color: C.muted }}>
          {analysis.matched.length
            ? '감지된 분위기 단서: ' + analysis.matched.join(', ')
            : '좌측 바인더 문서를 끌어다 놓거나 아래 인물 라이브러리에서 불러올 수 있습니다.'}
        </div>
      </div>

      {/* 인물 라이브러리에서 불러오기 */}
      {!!characters.length && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: C.muted }}>인물 불러오기:</span>
          {characters.slice(0, 8).map((c) => (
            <button key={c.id} className="minibtn" onClick={() => useCharacter(c)} title="이 인물의 성격으로 분위기 채우기">{c.name || '무명'}</button>
          ))}
        </div>
      )}

      {/* 결과 카드 / 빈 상태 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!hasInput ? (
          <div style={{ ...card, padding: 22, textAlign: 'center', color: C.muted, lineHeight: 1.7 }}>
            인물의 분위기를 입력하면<br />템포·조성·악기 편성으로 된 분위기 카드를 만들어 드립니다.<br />
            인물 라이브러리·바인더 문서 드롭·다른 도구의 데이터도 받습니다.
          </div>
        ) : (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 9, borderColor: C.accent }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{name.trim() || '무명 인물'}</div>
              <div style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{spec.descriptors.join(' · ')}</div>
            </div>

            {/* 큰 BPM 표시 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{spec.bpm}</span>
                <span style={{ fontSize: 12, color: C.muted }}>BPM</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, paddingBottom: 2 }}>{tempoWord(spec.bpm)}</div>
            </div>

            {/* 게이지 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Gauge label="에너지" val={spec.energy} color="#e0973f" />
              <Gauge label="긴장도" val={spec.tension} color="#d05a5a" />
              <Gauge label="따뜻함" val={spec.warmth} color="#4a9d7f" />
            </div>

            {/* 속성 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 7 }}>
              {[
                ['조성', spec.key + ' / ' + spec.mode],
                ['박자', spec.meter],
                ['다이내믹', spec.dynamics],
                ['질감', spec.texture],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg, ' + C.panel + ')', border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 9px' }}>
                  <div style={{ fontSize: 10.5, color: C.muted }}>{k}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* 악기 편성 */}
            <div>
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>악기 편성</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {spec.instruments.map((ins) => (
                  <span key={ins} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, background: C.panel, border: '1px solid ' + C.accent, color: C.text }}>{ins}</span>
                ))}
              </div>
            </div>

            {/* 도구 액션 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={addCue}>큐에 추가</button>
              <button className="minibtn" onClick={saveSnippet}>스니펫 저장</button>
              <button className="minibtn" onClick={saveToCharacter}>인물로 저장</button>
              <button className="minibtn" onClick={stashIt} disabled={!stashOK} title={stashOK ? '수집함에 담기' : '수집함이 없습니다'}>수집함</button>
              <button className="linkbtn" onClick={toProject} disabled={!bridge} title={bridge ? '프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트로</button>
            </div>
          </div>
        )}

        {/* 큐: BPM 곡선 + 목록 */}
        {!!cues.length && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>장면 큐 — BPM/에너지 곡선 ({cues.length})</div>
              <button className="minibtn danger" onClick={clearCues}>전체 비우기</button>
            </div>

            {/* 막대 그래프(BPM 높이 + 에너지 색농도) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90, padding: '4px 2px', borderBottom: '1px solid ' + C.border }}>
              {cues.map((c) => {
                const hPct = clamp((c.spec.bpm / maxBpm) * 100, 8, 100)
                const tint = clamp(c.spec.energy, 0, 100)
                return (
                  <div key={c.id} title={c.label + ' · ' + c.spec.bpm + 'BPM · 에너지 ' + c.spec.energy} style={{ flex: 1, minWidth: 6, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
                    <span style={{ fontSize: 9, color: C.muted }}>{c.spec.bpm}</span>
                    <div style={{ width: '78%', height: hPct + '%', borderRadius: '4px 4px 0 0', background: `linear-gradient(to top, #d05a5a ${100 - tint}%, #e0973f)`, minHeight: 4 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: -4 }}>
              <span>장면 진행 →</span><span>막대 높이=BPM, 색=에너지</span>
            </div>

            {/* 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cues.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 18, color: C.muted, textAlign: 'right' }}>{i + 1}</span>
                  <button className="linkbtn" onClick={() => loadCue(c)} title="이 장면을 편집기로 불러오기" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.label} — {c.spec.bpm}BPM {c.spec.key} {c.spec.mode}
                  </button>
                  <button className="minibtn" onClick={() => moveCue(i, -1)} disabled={i === 0} title="위로" style={{ padding: '0 6px' }}>▲</button>
                  <button className="minibtn" onClick={() => moveCue(i, 1)} disabled={i === cues.length - 1} title="아래로" style={{ padding: '0 6px' }}>▼</button>
                  <button className="minibtn danger" onClick={() => removeCue(c.id)} title="제거">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 음악 도구 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">음악 도구로 열기:</span>
        {relatedIds.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openMusic(id)} disabled={!hasInput} title={hasInput ? '“' + spec.searchQuery + '” 으로 검색하며 열기' : '먼저 분위기를 입력하세요'}>
            {REL_LABEL[id] || id}
          </button>
        ))}
      </div>

      {toast && <div style={{ color: 'var(--ok)', fontSize: 12 }}>{toast}</div>}
      <div className="license-note">분위기 분석과 음악 사양은 입력 텍스트 기반의 결정론적 로컬 계산입니다. 같은 입력은 항상 같은 결과를 냅니다. 외부 전송 없음.</div>
    </div>
  )
}
