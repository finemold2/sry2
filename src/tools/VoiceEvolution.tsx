// 목소리 진화 — 트라우마/성장 사건을 겪은 뒤 인물의 '말투'가 어떻게 변하는지를
//   규칙 기반으로 시뮬레이션한다. 베이스라인 말투 프로필(축 6개)을 정하고, 사건을 고르면
//   각 축이 결정론적으로 이동하며, 같은 문장을 '사건 전'과 '사건 후' 말투로 변환해 대사 샘플을 보여준다.
//   캐릭터(characters) 연동: 라이브러리/바인더 드롭/payload 로 인물을 받아 말투(speech)를 갱신해 저장.
// 자급식: react 와 './linkbus' 외 import 없음. 결정론(시드=문자열 해시) + localStorage 만 사용.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, updateInLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'voice-evolution',
  name: '목소리 진화',
  icon: '📢',
  group: '캐릭터',
  intro: '트라우마·성장 사건 뒤 인물 말투가 어떻게 변하는지 규칙으로 시뮬하고 전후 대사 샘플을 만듭니다',
  w: 480,
  h: 640,
}

const LS = 'sry:tool:voice-evolution'

// ───────────────────────── 말투 축(6개) ─────────────────────────
// 각 축은 0~100. 양 끝에 라벨을 두어 인물 말투를 좌표로 표현한다.
interface Axis { key: string; name: string; lo: string; hi: string }
const AXES: Axis[] = [
  { key: 'warmth', name: '온도', lo: '차갑고 거리감', hi: '따뜻하고 다정' },
  { key: 'formality', name: '격식', lo: '편하고 반말', hi: '깍듯하고 격식' },
  { key: 'directness', name: '직설', lo: '에두르고 완곡', hi: '단도직입 직설' },
  { key: 'energy', name: '기세', lo: '느리고 가라앉음', hi: '빠르고 활기참' },
  { key: 'guard', name: '경계', lo: '솔직히 다 드러냄', hi: '속을 닫고 방어' },
  { key: 'hope', name: '희망', lo: '냉소·비관', hi: '낙관·희망' },
]
type Vec = Record<string, number>

// ───────────────────────── 사건(트라우마/성장) ─────────────────────────
// 각 사건은 축에 가하는 변화량(delta)을 가진다. 양수=상승, 음수=하강.
// kind: 'trauma' | 'growth' 로 색·아이콘 구분.
interface EventDef { id: string; label: string; kind: 'trauma' | 'growth'; delta: Vec; note: string }
const EVENTS: EventDef[] = [
  { id: 'betrayal', label: '믿었던 이에게 배신당함', kind: 'trauma', note: '마음을 닫고 거리를 둔다', delta: { warmth: -22, guard: +28, hope: -18, directness: +8 } },
  { id: 'loss', label: '소중한 사람을 잃음', kind: 'trauma', note: '말수가 줄고 가라앉는다', delta: { energy: -26, warmth: -10, hope: -22, guard: +14 } },
  { id: 'humiliation', label: '많은 사람 앞에서 망신당함', kind: 'trauma', note: '말이 조심스럽고 방어적', delta: { guard: +24, directness: -16, formality: +12, energy: -10 } },
  { id: 'violence', label: '폭력·위협을 겪음', kind: 'trauma', note: '날이 서고 경계가 높아짐', delta: { guard: +26, warmth: -16, directness: +14, hope: -14 } },
  { id: 'failure', label: '인생을 건 일에 실패함', kind: 'trauma', note: '냉소가 짙어진다', delta: { hope: -28, energy: -16, directness: +6, warmth: -8 } },
  { id: 'abandon', label: '버림받음·고립을 겪음', kind: 'trauma', note: '정을 내주기를 두려워함', delta: { warmth: -20, guard: +22, hope: -16, energy: -8 } },
  { id: 'power', label: '갑자기 큰 힘·지위를 얻음', kind: 'trauma', note: '오만하고 단정적으로 변함', delta: { directness: +20, formality: -10, guard: +12, warmth: -14 } },
  { id: 'love', label: '진심으로 사랑받음', kind: 'growth', note: '마음이 풀리고 다정해짐', delta: { warmth: +26, guard: -22, hope: +20, formality: -8 } },
  { id: 'rescued', label: '낯선 이에게 구원받음', kind: 'growth', note: '사람을 다시 믿기 시작', delta: { guard: -24, hope: +22, warmth: +16, directness: -6 } },
  { id: 'mastery', label: '오랜 노력 끝에 자기 길을 찾음', kind: 'growth', note: '말에 확신과 여유가 생김', delta: { directness: +18, hope: +18, energy: +12, guard: -10 } },
  { id: 'forgive', label: '용서하거나 용서받음', kind: 'growth', note: '응어리가 풀려 부드러워짐', delta: { warmth: +20, hope: +18, guard: -16, directness: -6 } },
  { id: 'mentor', label: '좋은 스승·멘토를 만남', kind: 'growth', note: '차분하고 사려 깊어짐', delta: { formality: +12, energy: -6, hope: +14, guard: -8, directness: +6 } },
  { id: 'community', label: '나를 받아주는 무리를 얻음', kind: 'growth', note: '활기차고 솔직해짐', delta: { energy: +18, warmth: +16, guard: -18, hope: +14 } },
  { id: 'survive', label: '죽을 고비를 넘기고 살아남음', kind: 'growth', note: '허세를 버리고 담백해짐', delta: { directness: +16, formality: -10, hope: +12, guard: -8 } },
]

// ───────────────────────── 말투 프리셋(빠른 시작) ─────────────────────────
interface Preset { name: string; vec: Vec }
const PRESETS: Preset[] = [
  { name: '밝고 다정한 소년', vec: { warmth: 78, formality: 30, directness: 60, energy: 80, guard: 22, hope: 80 } },
  { name: '냉정한 실력자', vec: { warmth: 25, formality: 65, directness: 78, energy: 55, guard: 70, hope: 45 } },
  { name: '예의 바른 귀족 영애', vec: { warmth: 60, formality: 88, directness: 35, energy: 45, guard: 55, hope: 60 } },
  { name: '거친 떠돌이 검사', vec: { warmth: 40, formality: 18, directness: 82, energy: 65, guard: 60, hope: 38 } },
  { name: '음흉한 책략가', vec: { warmth: 35, formality: 70, directness: 28, energy: 40, guard: 80, hope: 40 } },
  { name: '순박한 시골 처녀', vec: { warmth: 75, formality: 45, directness: 55, energy: 55, guard: 25, hope: 70 } },
]
const DEFAULT_VEC: Vec = { warmth: 50, formality: 50, directness: 50, energy: 50, guard: 50, hope: 50 }

// ───────────────────────── 변환할 원본 대사(의미 단위) ─────────────────────────
// 같은 '상황'의 말을 말투 좌표에 따라 다르게 표현한다. 각 상황마다 축 조건별 변형 사전을 둔다.
interface Line { situation: string; render: (v: Vec) => string }

function lvl(n: number): 0 | 1 | 2 { return n < 38 ? 0 : n > 62 ? 2 : 1 }
// 격식: 종결어미 톤 선택
function endTone(v: Vec): 'casual' | 'plain' | 'polite' { const f = lvl(v.formality); return f === 0 ? 'casual' : f === 2 ? 'polite' : 'plain' }

const LINES: Line[] = [
  {
    situation: '도움을 청할 때',
    render: (v) => {
      const warm = lvl(v.warmth), guard = lvl(v.guard), dir = lvl(v.directness)
      const t = endTone(v)
      if (guard === 2 && warm <= 1) return t === 'polite' ? '...혼자 해결할 수 있습니다. 신경 쓰지 마십시오.' : t === 'casual' ? '됐어. 나 혼자 한다.' : '됐다. 혼자 한다.'
      if (dir === 2) return t === 'polite' ? '솔직히 말씀드리겠습니다. 당신의 도움이 필요합니다.' : t === 'casual' ? '솔직히 말할게. 네 도움이 필요해.' : '솔직히 말한다. 네 도움이 필요하다.'
      if (warm === 2) return t === 'polite' ? '죄송하지만... 조금만 손을 빌려주실 수 있을까요?' : t === 'casual' ? '미안한데... 좀 도와줄 수 있어?' : '미안하지만... 좀 도와줄 수 있나.'
      return t === 'polite' ? '폐가 되지 않는다면... 도움을 부탁드려도 될지요.' : t === 'casual' ? '저기... 혹시 좀 도와줄래?' : '혹시... 좀 도와줄 수 있겠나.'
    },
  },
  {
    situation: '고마움을 전할 때',
    render: (v) => {
      const warm = lvl(v.warmth), guard = lvl(v.guard)
      const t = endTone(v)
      if (guard === 2 && warm === 0) return t === 'polite' ? '...수고하셨습니다.' : '...수고했다.'
      if (warm === 2) return t === 'polite' ? '정말 감사합니다. 이 은혜는 잊지 않을게요.' : t === 'casual' ? '정말 고마워. 이 은혜 안 잊을게.' : '정말 고맙다. 이 은혜는 잊지 않겠다.'
      if (warm === 0) return t === 'polite' ? '...도움은 잘 받았습니다.' : t === 'casual' ? '...뭐, 도움은 됐어.' : '...도움은 됐다.'
      return t === 'polite' ? '고맙습니다.' : t === 'casual' ? '고마워.' : '고맙다.'
    },
  },
  {
    situation: '분노를 표현할 때',
    render: (v) => {
      const ene = lvl(v.energy), dir = lvl(v.directness), guard = lvl(v.guard)
      const t = endTone(v)
      if (guard === 2 && ene <= 1) return t === 'polite' ? '...실망스럽군요. 그뿐입니다.' : '...실망스럽군. 그뿐이다.'
      if (ene === 2 && dir === 2) return t === 'polite' ? '지금 제정신이십니까! 어떻게 그럴 수가 있죠!' : t === 'casual' ? '너 지금 제정신이야?! 어떻게 그래!' : '지금 제정신인가?! 어떻게 그럴 수가 있나!'
      if (dir === 0) return t === 'polite' ? '...조금 생각이 다른 것 같습니다.' : t === 'casual' ? '...난 좀 생각이 다른데.' : '...나는 좀 생각이 다르다.'
      return t === 'polite' ? '이건 받아들이기 어렵습니다.' : t === 'casual' ? '이건 좀 아니지.' : '이건 받아들이기 어렵다.'
    },
  },
  {
    situation: '위로를 건넬 때',
    render: (v) => {
      const warm = lvl(v.warmth), guard = lvl(v.guard), hope = lvl(v.hope)
      const t = endTone(v)
      if (guard === 2 && warm === 0) return t === 'polite' ? '...지나갈 일입니다.' : '...지나갈 일이다.'
      if (warm === 2 && hope >= 1) return t === 'polite' ? '괜찮아요, 곁에 있을게요. 다 지나갈 거예요.' : t === 'casual' ? '괜찮아, 내가 옆에 있을게. 다 지나갈 거야.' : '괜찮다, 내가 곁에 있겠다. 다 지나갈 것이다.'
      if (hope === 0) return t === 'polite' ? '...어쩔 수 없는 일도 있는 법이죠.' : t === 'casual' ? '...어쩔 수 없는 것도 있어.' : '...어쩔 수 없는 일도 있다.'
      return t === 'polite' ? '힘드시겠지만, 견뎌봅시다.' : t === 'casual' ? '힘들겠지만, 버텨보자.' : '힘들겠지만, 견뎌보자.'
    },
  },
  {
    situation: '결심을 밝힐 때',
    render: (v) => {
      const dir = lvl(v.directness), hope = lvl(v.hope), ene = lvl(v.energy)
      const t = endTone(v)
      if (hope === 0) return t === 'polite' ? '...어차피 달라질 건 없겠지만, 해보겠습니다.' : t === 'casual' ? '...어차피 달라질 건 없어도, 해볼게.' : '...달라질 건 없겠지만, 해보겠다.'
      if (dir === 2 && ene >= 1) return t === 'polite' ? '결정했습니다. 끝까지 갑니다.' : t === 'casual' ? '결정했어. 끝까지 간다.' : '결정했다. 끝까지 간다.'
      if (hope === 2) return t === 'polite' ? '반드시 해낼 수 있을 거예요. 함께 가요.' : t === 'casual' ? '반드시 해낼 수 있어. 같이 가자.' : '반드시 해낼 수 있다. 같이 가자.'
      return t === 'polite' ? '한번 해보려 합니다.' : t === 'casual' ? '한번 해볼게.' : '한번 해보겠다.'
    },
  },
  {
    situation: '인사·첫만남',
    render: (v) => {
      const warm = lvl(v.warmth), ene = lvl(v.energy), guard = lvl(v.guard)
      const t = endTone(v)
      if (guard === 2) return t === 'polite' ? '...누구십니까.' : t === 'casual' ? '...누구야.' : '...누구냐.'
      if (warm === 2 && ene === 2) return t === 'polite' ? '안녕하세요! 만나서 정말 반가워요!' : t === 'casual' ? '안녕! 진짜 반가워!' : '반갑다! 만나서 정말 반갑군!'
      if (warm === 0) return t === 'polite' ? '...안녕하십니까.' : t === 'casual' ? '...왔어?' : '...왔나.'
      return t === 'polite' ? '안녕하세요.' : t === 'casual' ? '안녕.' : '반갑다.'
    },
  },
]

// ───────────────────────── 결정론 유틸 ─────────────────────────
function hashStr(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function clamp(n: number): number { return n < 0 ? 0 : n > 100 ? 100 : Math.round(n) }
function applyEvent(base: Vec, ev: EventDef, intensity: number): Vec {
  const out: Vec = { ...base }
  for (const a of AXES) { const d = ev.delta[a.key] || 0; out[a.key] = clamp(base[a.key] + (d * intensity) / 100) }
  return out
}
// 두 벡터 사이 가장 크게 변한 축 상위 N
function topChanges(a: Vec, b: Vec, n: number): { axis: Axis; from: number; to: number; diff: number }[] {
  return AXES.map((ax) => ({ axis: ax, from: a[ax.key], to: b[ax.key], diff: b[ax.key] - a[ax.key] }))
    .filter((x) => Math.abs(x.diff) >= 4)
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
    .slice(0, n)
}
// 말투를 한 줄 요약으로
function vecSummary(v: Vec): string {
  return AXES.map((a) => { const l = lvl(v[a.key]); return l === 0 ? a.lo : l === 2 ? a.hi : null }).filter(Boolean).join(' · ') || '평범하고 중립적인 말투'
}

// ───────────────────────── 영속 ─────────────────────────
interface Persisted { name: string; base: Vec; eventId: string; intensity: number; preset: string }
function loadState(): Persisted {
  const def: Persisted = { name: '', base: { ...DEFAULT_VEC }, eventId: EVENTS[0].id, intensity: 100, preset: '' }
  try {
    const raw = localStorage.getItem(LS); if (!raw) return def
    const p = JSON.parse(raw) as Partial<Persisted>
    const base: Vec = { ...DEFAULT_VEC }
    if (p.base && typeof p.base === 'object') for (const a of AXES) if (typeof (p.base as Vec)[a.key] === 'number') base[a.key] = clamp((p.base as Vec)[a.key])
    return {
      name: typeof p.name === 'string' ? p.name : '',
      base,
      eventId: EVENTS.some((e) => e.id === p.eventId) ? (p.eventId as string) : EVENTS[0].id,
      intensity: typeof p.intensity === 'number' ? Math.max(0, Math.min(100, p.intensity)) : 100,
      preset: typeof p.preset === 'string' ? p.preset : '',
    }
  } catch { return def }
}

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 인물 라이브러리 항목에서 추정 말투 벡터(있으면 speech 텍스트로 살짝 보정 — 결정론 해시)
function vecFromCharacter(c: SharedCharacter): { vec: Vec; name: string } {
  const name = c.name || (c.fields && c.fields.name) || '인물'
  const speech = (c.fields && (c.fields.speech || c.fields.personality)) || c.personality || ''
  const vec: Vec = { ...DEFAULT_VEC }
  if (speech) {
    const h = hashStr(speech)
    for (let i = 0; i < AXES.length; i++) vec[AXES[i].key] = 30 + ((h >> (i * 3)) & 0x3f)
  }
  // 키워드 힌트(결정론, 한국어 흔한 표현)
  const text = speech
  if (/다정|따뜻|상냥|친절/.test(text)) vec.warmth = 80
  if (/차갑|냉정|무뚝뚝|쌀쌀/.test(text)) vec.warmth = 22
  if (/존댓말|격식|깍듯|정중/.test(text)) vec.formality = 82
  if (/반말|편하게|거침없|투박/.test(text)) vec.formality = 22
  if (/직설|단도직입|솔직/.test(text)) vec.directness = 80
  if (/완곡|에두|돌려/.test(text)) vec.directness = 25
  if (/활기|밝|쾌활|시끄/.test(text)) vec.energy = 80
  if (/조용|과묵|말수.*적|침착/.test(text)) vec.energy = 28
  if (/방어|경계|속.*감|숨기/.test(text)) vec.guard = 80
  if (/냉소|비관|시니컬/.test(text)) vec.hope = 25
  if (/낙관|희망|긍정/.test(text)) vec.hope = 78
  for (const a of AXES) vec[a.key] = clamp(vec[a.key])
  return { vec, name }
}

export default function VoiceEvolution({ payload }: { payload?: Record<string, unknown> }) {
  const initRef = useRef<Persisted | null>(null)
  if (initRef.current === null) initRef.current = loadState()
  const init = initRef.current
  const [name, setName] = useState(init.name)
  const [base, setBase] = useState<Vec>(init.base)
  const [eventId, setEventId] = useState(init.eventId)
  const [intensity, setIntensity] = useState(init.intensity)
  const [preset, setPreset] = useState(init.preset)
  const [dropHot, setDropHot] = useState(false)
  const [linkedCharId, setLinkedCharId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const characters = useLibraryList('characters')
  const lastPayloadRef = useRef<Record<string, unknown> | null>(null)

  const ev = useMemo(() => EVENTS.find((e) => e.id === eventId) || EVENTS[0], [eventId])
  const after = useMemo(() => applyEvent(base, ev, intensity), [base, ev, intensity])
  const changes = useMemo(() => topChanges(base, after, 4), [base, after])

  // payload 수용(재수신 대응): character 객체 / text(말투 추정용) / name
  // 같은 객체 재마운트가 아니라 새 payload 가 올 때마다 반영하도록 참조 비교 가드.
  useEffect(() => {
    if (!payload) return
    if (lastPayloadRef.current === payload) return
    lastPayloadRef.current = payload
    if (typeof payload.name === 'string') setName(payload.name)
    const ch = payload.character as Record<string, string> | undefined
    if (ch) {
      const fake = { id: 'p', name: ch.name || '', fields: ch, personality: ch.personality, updated: 0 } as SharedCharacter
      const { vec, name: nm } = vecFromCharacter(fake)
      setBase(vec); if (nm) setName(nm)
    }
    if (typeof payload.text === 'string' && payload.text.trim()) {
      const fake = { id: 'p', name: '', fields: { speech: payload.text } as Record<string, string>, updated: 0 } as SharedCharacter
      setBase(vecFromCharacter(fake).vec)
    }
  }, [payload])

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ name, base, eventId, intensity, preset } as Persisted)) } catch { /* graceful */ }
  }, [name, base, eventId, intensity, preset])

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2000); return () => window.clearTimeout(t) }, [toast])
  const flash = (m: string) => { setToast(m) }

  const setAxis = (k: string, val: number) => { setBase((b) => ({ ...b, [k]: clamp(val) })); setPreset('') }
  const applyPreset = (p: Preset) => { setBase({ ...p.vec }); setPreset(p.name); flash(`프리셋 적용: ${p.name}`) }

  // 라이브러리 인물 → 베이스라인 추정
  const loadChar = (c: SharedCharacter) => {
    const { vec, name: nm } = vecFromCharacter(c)
    setBase(vec); if (nm) setName(nm); setPreset(''); setLinkedCharId(c.id)
    flash(`'${nm}'의 현재 말투를 추정해 불러왔어요`)
  }

  // 좌측 바인더 문서 드롭 — 본문 텍스트를 말투 추정에 사용
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropHot(false)
    const it = getDragItem(e); if (!it) return
    const src = (it.character && (it.character.speech || it.character.personality)) || it.text || ''
    if (!src.trim()) { flash('그 문서에서 말투 단서를 찾지 못했어요'); return }
    const fake = { id: it.id, name: it.title, fields: { speech: src } as Record<string, string>, updated: 0 } as SharedCharacter
    setBase(vecFromCharacter(fake).vec)
    if (it.title) setName(it.title)
    if (it.character) setLinkedCharId(null)
    flash(`'${it.title}'에서 말투를 추정했어요`)
  }

  // 산출 텍스트 묶음
  const samplesText = (): string => {
    const head = `[목소리 진화] ${name.trim() || '인물'} — 사건: ${ev.label} (강도 ${intensity}%)`
    const chg = changes.length ? changes.map((c) => `· ${c.axis.name}: ${c.from} -> ${c.to} (${c.diff > 0 ? '+' : ''}${c.diff})`).join('\n') : '· (뚜렷한 변화 없음)'
    const lines = LINES.map((l) => `- ${l.situation}\n  전) ${l.render(base)}\n  후) ${l.render(after)}`).join('\n')
    return `${head}\n\n[말투 변화]\n${chg}\n\n[전후 대사 샘플]\n${lines}\n\n전(말투): ${vecSummary(base)}\n후(말투): ${vecSummary(after)}`
  }
  const bodyHtml = (): string => {
    const chg = changes.length
      ? '<ul>' + changes.map((c) => `<li>${escHtml(c.axis.name)}: ${c.from} → ${c.to} (${c.diff > 0 ? '+' : ''}${c.diff}) — ${escHtml(c.diff > 0 ? c.axis.hi : c.axis.lo)} 쪽으로</li>`).join('') + '</ul>'
      : '<p>뚜렷한 변화 없음</p>'
    const lines = LINES.map((l) =>
      `<p><strong>${escHtml(l.situation)}</strong><br/>` +
      `<span>전) ${escHtml(l.render(base))}</span><br/>` +
      `<span>후) ${escHtml(l.render(after))}</span></p>`).join('')
    return `<p><strong>목소리 진화 — ${escHtml(name.trim() || '인물')}</strong></p>` +
      `<p>사건: ${escHtml(ev.label)} (강도 ${intensity}%) — ${escHtml(ev.note)}</p>` +
      `<p><strong>말투 변화</strong></p>${chg}` +
      `<p><strong>전후 대사 샘플</strong></p>${lines}` +
      `<p><strong>전(말투):</strong> ${escHtml(vecSummary(base))}<br/><strong>후(말투):</strong> ${escHtml(vecSummary(after))}</p>`
  }

  const copyAll = () => {
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 돼요'); return }
    navigator.clipboard.writeText(samplesText()).then(() => flash('전후 샘플을 복사했어요')).catch(() => flash('복사 실패'))
  }

  // 라이브러리에 '진화 후' 말투를 가진 인물로 저장(또는 기존 인물 갱신)
  const saveToLibrary = () => {
    const nm = name.trim() || '이름 미정 인물'
    const afterSpeech = `${vecSummary(after)} (사건 '${ev.label}' 이후)`
    const arcNote = `목소리 진화: 사건 '${ev.label}'(강도 ${intensity}%) 이후 ${changes.map((c) => `${c.axis.name} ${c.diff > 0 ? '↑' : '↓'}`).join(', ') || '미세 변화'}. 전: ${vecSummary(base)} / 후: ${vecSummary(after)}`
    if (linkedCharId && characters.some((c) => c.id === linkedCharId)) {
      const exist = characters.find((c) => c.id === linkedCharId)!
      const fields = { ...(exist.fields || {}) }
      fields.speech = afterSpeech
      fields.arc = ((fields.arc ? fields.arc + ' / ' : '') + arcNote).slice(0, 600)
      updateInLibrary('characters', linkedCharId, { fields, name: nm })
      flash(`'${nm}'의 말투(진화 후)를 갱신했어요`)
    } else {
      const rec = addToLibrary('characters', { name: nm, fields: { name: nm, speech: afterSpeech, arc: arcNote }, source: meta.name })
      setLinkedCharId(rec.id)
      flash(`'${nm}'을(를) 인물 라이브러리에 저장했어요`)
    }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물 메모',
      title: `목소리 진화 — ${name.trim() ? name.trim() + ': ' : ''}${ev.label}`,
      bodyHtml: bodyHtml(),
      synopsis: `${vecSummary(base)} → ${vecSummary(after)}`,
      meta: { 인물: name.trim() || '미정', 사건: ev.label, 강도: intensity + '%', 유형: ev.kind === 'trauma' ? '트라우마' : '성장' },
    })
    flash(id ? '프로젝트 자료(인물 메모)에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  const toStash = () => {
    if (!hasStash()) { flash('수집함을 쓸 수 없어요'); return }
    addToStash({ kind: 'memo', label: `목소리 진화 — ${name.trim() || '인물'} / ${ev.label}`, text: samplesText() })
    flash('수집함에 담았어요')
  }

  const toSheet = () => {
    openToolLinked('character-sheet', {
      character: {
        name: name.trim() || '(이름 미정)',
        speech: `${vecSummary(after)} (사건 '${ev.label}' 이후)`,
        arc: `목소리 진화: '${ev.label}' 이후 전(${vecSummary(base)}) → 후(${vecSummary(after)})`,
        fields: {
          name: name.trim() || '(이름 미정)',
          speech: `${vecSummary(after)} (사건 '${ev.label}' 이후)`,
          arc: `목소리 진화: 전 ${vecSummary(base)} / 후 ${vecSummary(after)}`,
        },
      },
    })
    flash('인물 시트로 보냈어요')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 13, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const inputStyle: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 8 }
  const evColor = ev.kind === 'trauma' ? 'var(--warn)' : 'var(--ok)'

  const Bar = ({ a }: { a: Axis }) => {
    const bv = base[a.key], av = after[a.key], diff = av - bv
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 38, flexShrink: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'right' }} title={`${a.lo} ↔ ${a.hi}`}>{a.name}</span>
        <input type="range" min={0} max={100} value={bv} onChange={(e) => setAxis(a.key, Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} aria-label={a.name} />
        <span style={{ width: 86, flexShrink: 0, fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: 'var(--muted)' }}>{bv}</span>
          <span style={{ color: 'var(--muted)', margin: '0 3px' }}>→</span>
          <span style={{ color: diff === 0 ? 'var(--muted)' : evColor, fontWeight: 700 }}>{av}</span>
        </span>
      </div>
    )
  }

  return (
    <div style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }}
      onDragLeave={() => setDropHot(false)}
      onDrop={onDrop}
    >
      <div style={hint}>
        인물의 <b>현재 말투</b>를 6개 축으로 정하고 <b>사건</b>을 고르면, 트라우마/성장이 말투를 어떻게 바꾸는지 <b>전후 대사 샘플</b>로 보여줍니다. 좌측 바인더 문서를 끌어다 놓으면 말투를 추정합니다.
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, paddingRight: 2 }}>

        {/* 인물 + 라이브러리 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="인물 이름(선택)" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
          <select value="" onChange={(e) => { const c = characters.find((x) => x.id === e.target.value); if (c) loadChar(c) }} style={{ ...inputStyle, minWidth: 120 }} disabled={characters.length === 0} title={characters.length ? '라이브러리 인물의 말투 불러오기' : '저장된 인물이 없습니다'}>
            <option value="">{characters.length ? '인물 불러오기...' : '인물 없음'}</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name || (c.fields && c.fields.name) || '이름없음'}</option>)}
          </select>
        </div>

        {/* 프리셋 */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button key={p.name} className="minibtn" onClick={() => applyPreset(p)}
              style={{ padding: '3px 9px', fontSize: 11.5, borderColor: preset === p.name ? 'var(--accent)' : 'var(--border)', color: preset === p.name ? 'var(--text)' : 'var(--muted)' }}>
              {p.name}
            </button>
          ))}
        </div>

        {/* 말투 축 슬라이더 */}
        <div style={card}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>말투 좌표 (왼쪽=사건 전 / 색=사건 후)</span>
            <span style={{ color: 'var(--muted)' }}>전: {vecSummary(base)}</span>
          </div>
          {AXES.map((a) => <Bar key={a.key} a={a} />)}
        </div>

        {/* 사건 선택 + 강도 */}
        <div style={card}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: evColor, fontWeight: 700, border: `1px solid ${evColor}`, borderRadius: 999, padding: '1px 9px' }}>
              {ev.kind === 'trauma' ? '트라우마' : '성장'}
            </span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }}>
              <optgroup label="트라우마(상처)">
                {EVENTS.filter((e) => e.kind === 'trauma').map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </optgroup>
              <optgroup label="성장(치유)">
                {EVENTS.filter((e) => e.kind === 'growth').map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </optgroup>
            </select>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>변화 방향: {ev.note}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 38, textAlign: 'right' }}>강도</span>
            <input type="range" min={0} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ flex: 1, accentColor: evColor }} aria-label="사건 강도" />
            <span style={{ width: 42, textAlign: 'right', fontSize: 12, fontWeight: 700, color: evColor }}>{intensity}%</span>
          </div>
        </div>

        {/* 변화 요약 */}
        <div style={card}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>말투 변화 (큰 순서)</div>
          {changes.length === 0
            ? <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>아직 뚜렷한 변화가 없습니다. 사건 강도를 올리거나 다른 사건을 골라보세요.</div>
            : changes.map((c) => (
              <div key={c.axis.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 38, flexShrink: 0, textAlign: 'right', color: 'var(--muted)' }}>{c.axis.name}</span>
                <span style={{ flex: 1 }}>
                  {c.from} <span style={{ color: 'var(--muted)' }}>→</span> <b style={{ color: evColor }}>{c.to}</b>
                  <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 11.5 }}>{c.diff > 0 ? c.axis.hi : c.axis.lo} 쪽으로</span>
                </span>
                <span style={{ color: evColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.diff > 0 ? '+' : ''}{c.diff}</span>
              </div>
            ))}
          <div style={{ fontSize: 12, color: evColor, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
            후: {vecSummary(after)}
          </div>
        </div>

        {/* 전후 대사 샘플 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>전후 대사 샘플 ({LINES.length}개 상황)</div>
          {LINES.map((l, i) => (
            <div key={i} style={{ ...card, gap: 5, padding: '9px 12px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700 }}>{l.situation}</div>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', marginRight: 6 }}>전</span>
                {l.render(base)}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                <span style={{ fontSize: 10.5, color: evColor, border: `1px solid ${evColor}`, borderRadius: 5, padding: '0 4px', marginRight: 6 }}>후</span>
                {l.render(after)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={saveToLibrary}>
          {linkedCharId && characters.some((c) => c.id === linkedCharId) ? '인물 말투 갱신' : '인물로 저장'}
        </button>
        <button className="minibtn" onClick={copyAll}>전후 복사</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '전후 대사·변화를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSheet} title="진화 후 말투를 인물 시트로 보내기">인물 시트로</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title="수집함에 담기">수집함</button>
      </div>

      <div style={{ ...hint, color: dropHot ? 'var(--accent)' : toast ? 'var(--ok)' : 'var(--muted)' }}>
        {dropHot ? '여기에 놓으면 그 인물의 말투를 추정합니다' : toast || (characters.length ? '인물을 불러오거나 프리셋을 고르고, 사건을 적용해 전후 대사가 어떻게 달라지는지 비교해 보세요.' : '먼저 말투 축을 조정하거나 프리셋을 골라 베이스라인을 만든 뒤 사건을 적용하세요.')}
      </div>
    </div>
  )
}
