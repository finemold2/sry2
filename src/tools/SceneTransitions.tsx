// 장면 전환 문구 생성기 — 시간 경과 / 장소 이동 / 시점 전환 / 회상 진입·복귀 유형별로
// 로컬 어구 표를 조합해 "자연스러운 전환 문장"을 대량 생성한다.
//  · 유형 선택 → 한 줄 또는 묶음 생성, 각 조각(연결어/시간폭/장소/시점/단서 등)은 🔒 잠금 후 부분 재생성
//  · 톤(담담/서정/긴박/문어) · 문장 길이(짧게/보통/길게) 조절로 어조 변주
//  · 생성한 전환문은 스니펫(공유 라이브러리) / 프로젝트 자료('장면 전환' 폴더) / 수집함으로 내보내기
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage 만 사용. react 와 './linkbus' 만 import.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'scene-transitions', name: '장면 전환 문구', icon: '🎬', group: '영감·발상', intro: '시간 경과·장소 이동·시점/회상 전환 문장을 유형별로 조합 생성하세요', w: 600, h: 640 }

const LS = 'sry:tool:scene-transitions'

// ───────────────────────── 전환 유형 ─────────────────────────
type TypeKey = 'time' | 'place' | 'pov' | 'flashIn' | 'flashOut'
type Tone = 'plain' | 'lyric' | 'tense' | 'literary'
type Length = 'short' | 'mid' | 'long'

interface TypeDef { key: TypeKey; label: string; icon: string; desc: string; color: string }
const TYPES: TypeDef[] = [
  { key: 'time', label: '시간 경과', icon: '⏳', desc: '하루·계절·세월이 흘러 다음 장면으로', color: '#e0a96a' },
  { key: 'place', label: '장소 이동', icon: '🚪', desc: '한 공간에서 다른 공간으로 이동', color: '#6ab0e0' },
  { key: 'pov', label: '시점 전환', icon: '🔄', desc: '서술 초점을 다른 인물로 옮김', color: '#9b7ede' },
  { key: 'flashIn', label: '회상 진입', icon: '🌫️', desc: '현재에서 과거의 기억 속으로', color: '#e06c9f' },
  { key: 'flashOut', label: '회상 복귀', icon: '☀️', desc: '회상에서 다시 현재로 빠져나옴', color: '#5fc9a3' },
]

const TONES: { key: Tone; label: string }[] = [
  { key: 'plain', label: '담담' },
  { key: 'lyric', label: '서정' },
  { key: 'tense', label: '긴박' },
  { key: 'literary', label: '문어' },
]
const LENGTHS: { key: Length; label: string }[] = [
  { key: 'short', label: '짧게' },
  { key: 'mid', label: '보통' },
  { key: 'long', label: '길게' },
]

// ───────────────────────── 어구 표 (조각 = part) ─────────────────────────
// 각 유형은 여러 part 슬롯으로 구성되고, 슬롯마다 토큰 표를 가진다.
// 토큰 일부는 톤 태그를 가져 톤 필터에 영향(없으면 모든 톤 공용).
interface Token { t: string; tone?: Tone[] }
interface PartDef { key: string; label: string; tokens: Token[] }

const T = (t: string, ...tone: Tone[]): Token => (tone.length ? { t, tone } : { t })

// 시간 폭 — 모두 '기간 명사구'로 통일(부사가 아님). 마무리(tail)와 조사를 자동 결합해 항상 문법에 맞게.
const SPANS: Token[] = [
  T('한나절'), T('하룻밤'), T('며칠'), T('사흘'), T('일주일'), T('열흘'),
  T('보름'), T('한 달'), T('두어 달'), T('반년'), T('한 해'), T('계절 하나'),
  T('여러 해'), T('두 번의 겨울', 'lyric'), T('긴 봄'), T('오랜 세월', 'literary'), T('몇 해', 'literary'),
]

// tail 템플릿: '◯'를 시간폭으로 치환. 조사는 conjTail() 가 받침에 맞춰 이/가, 은/는 등을 붙인다.
const TIME_PARTS: PartDef[] = [
  {
    key: 'conj', label: '연결어',
    tokens: [
      T('그로부터'), T('그 후'), T('이윽고'), T('어느덧'), T('머지않아'),
      T('그러는 사이'), T('얼마 지나지 않아'), T('하루가 다르게', 'lyric'),
      T('세월은 무심히도', 'literary'), T('어느 결엔가', 'literary'),
      T('정신을 차렸을 땐', 'tense'), T('숨 돌릴 새도 없이', 'tense'),
    ],
  },
  { key: 'span', label: '시간 폭', tokens: SPANS },
  {
    key: 'tail', label: '마무리',
    // '◯' = 시간폭 자리, '@' = 주격조사(이/가), '#' = 보조사(은/는)
    tokens: [
      T('◯@ 흘렀다.'), T('◯@ 지났다.'), T('◯@ 가 버렸다.'),
      T('◯ 만에 그는 돌아왔다.'), T('◯ 동안 아무 일도 없었다.'),
      T('◯@ 그렇게 저물었다.', 'lyric'), T('◯@ 손가락 사이로 빠져나갔다.', 'lyric'),
      T('◯@ 흐른 뒤였다.', 'literary'), T('◯# 무색하게 지나갔다.', 'literary'),
      T('◯ 뒤, 모든 것이 달라져 있었다.', 'tense'), T('◯ 사이 판도가 뒤집혔다.', 'tense'),
    ],
  },
]

// 받침(종성) 유무 — 한글 마지막 글자 기준. 받침 있으면 true.
function hasFinalConsonant(s: string): boolean {
  const ch = s.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
// 시간폭 명사 + 조사 마무리(tail 템플릿)를 받침에 맞춰 결합.
function conjTail(span: string, tailTemplate: string): string {
  const f = hasFinalConsonant(span)
  return tailTemplate
    .replace('◯', span)
    .replace('@', f ? '이' : '가')
    .replace('#', f ? '은' : '는')
}

const PLACE_PARTS: PartDef[] = [
  {
    key: 'leave', label: '떠남',
    tokens: [
      T('문을 닫고 나서자'), T('그곳을 빠져나오자'), T('등 뒤로 문이 닫히고'),
      T('자리를 털고 일어서'), T('발길을 돌리자'), T('계단을 내려서니'),
      T('차에 올라타자'), T('짐을 꾸려 나서니'),
      T('미련 없이 등을 돌리자', 'lyric'), T('정든 자리를 뒤로하고', 'lyric'),
      T('서둘러 자리를 뜨자', 'tense'), T('뒤도 돌아보지 않고 내달리자', 'tense'),
      T('그 문턱을 넘는 순간', 'literary'),
    ],
  },
  {
    key: 'transit', label: '이동',
    tokens: [
      T('이내'), T('어느새'), T('얼마 안 가'), T('길을 따라'),
      T('한참을 걸어'), T('낯선 거리를 지나'), T('빗속을 가로질러', 'lyric'),
      T('가로등이 하나둘 켜질 무렵', 'lyric'), T('단숨에', 'tense'),
      T('쫓기듯 발걸음을 재촉해', 'tense'), T('정처 없이 흘러', 'literary'),
    ],
  },
  {
    key: 'arrive', label: '도착',
    tokens: [
      T('새로운 곳에 닿았다.'), T('다른 방 앞에 서 있었다.'),
      T('낯선 풍경이 펼쳐졌다.'), T('전혀 다른 공기가 그를 맞았다.'),
      T('목적지가 눈앞에 있었다.'), T('그 집 앞에 도착했다.'),
      T('또 다른 세계의 문턱에 서 있었다.', 'lyric'),
      T('낯선 향기가 코끝을 스쳤다.', 'lyric'),
      T('숨 막히는 정적이 기다리고 있었다.', 'tense'),
      T('이미 다른 곳에 와 있었다.', 'literary'),
    ],
  },
]

const POV_PARTS: PartDef[] = [
  {
    key: 'pivot', label: '전환 신호',
    tokens: [
      T('한편'), T('그 시각'), T('같은 시각'), T('한편 그때'),
      T('멀리 떨어진 곳에서는'), T('이야기는 잠시 돌아가'),
      T('장면을 바꾸어'), T('시선을 돌리면'),
      T('그러나 다른 곳에서는', 'tense'), T('바로 그 무렵', 'tense'),
      T('한편, 같은 하늘 아래', 'lyric'), T('자리를 옮겨', 'literary'),
    ],
  },
  {
    key: 'who', label: '대상',
    tokens: [
      T('그녀는'), T('그는'), T('또 다른 이는'), T('상대편의 그 사람은'),
      T('멀리 있는 한 사람은'), T('전혀 다른 누군가는'),
      T('이 모든 걸 지켜보던 자는'), T('그림자 속의 그 인물은', 'tense'),
      T('아무도 모르게 한 사람은', 'lyric'),
    ],
  },
  {
    key: 'beat', label: '도입 행동',
    tokens: [
      T('전혀 다른 생각에 잠겨 있었다.'), T('같은 순간을 다르게 바라보고 있었다.'),
      T('아무것도 모른 채 움직이고 있었다.'), T('홀로 결심을 굳히고 있었다.'),
      T('창밖을 응시하고 있었다.'), T('숨을 죽인 채 기다리고 있었다.', 'tense'),
      T('조용히 칼을 갈고 있었다.', 'tense'),
      T('먼 곳을 그리워하고 있었다.', 'lyric'),
      T('자신의 몫을 묵묵히 감당하고 있었다.', 'literary'),
    ],
  },
]

const FLASHIN_PARTS: PartDef[] = [
  {
    key: 'trigger', label: '촉발 단서',
    tokens: [
      T('낯익은 냄새가'), T('그 노래가'), T('빛바랜 사진 한 장이'),
      T('스치는 한마디가'), T('익숙한 거리의 풍경이'), T('손끝에 닿은 감촉이'),
      T('문득 떠오른 이름이'), T('빗소리가', 'lyric'), T('바람결에 실린 향기가', 'lyric'),
      T('날카로운 비명이', 'tense'), T('오래된 상처가', 'literary'),
    ],
  },
  {
    key: 'bridge', label: '진입 다리',
    tokens: [
      T('그를 단숨에'), T('순식간에 그녀를'), T('마음을 거슬러'),
      T('기억의 문을 열고'), T('의식을 빨아들이듯'), T('시간을 거꾸로 감아'),
      T('현재를 지우며', 'lyric'), T('아득히', 'lyric'),
      T('가차 없이', 'tense'), T('걷잡을 수 없이', 'tense'),
    ],
  },
  {
    key: 'dest', label: '도착(과거)',
    tokens: [
      T('오래전 그날로 데려갔다.'), T('어린 시절로 끌고 갔다.'),
      T('잊고 있던 그 여름으로 되돌렸다.'), T('처음 만난 순간으로 데려다 놓았다.'),
      T('지우고 싶던 기억 속으로 밀어 넣었다.'),
      T('그때 그 자리에 다시 세웠다.'),
      T('빛바랜 어느 오후로 흘려보냈다.', 'lyric'),
      T('돌이킬 수 없는 그 밤으로 떨어뜨렸다.', 'tense'),
      T('아득한 과거로 거슬러 올랐다.', 'literary'),
    ],
  },
]

const FLASHOUT_PARTS: PartDef[] = [
  {
    key: 'jolt', label: '복귀 충격',
    tokens: [
      T('누군가 그를 흔들었다.'), T('전화벨이 울렸다.'), T('이름을 부르는 소리가 들렸다.'),
      T('차가운 손이 어깨에 닿았다.'), T('문 닫히는 소리가 났다.'),
      T('현실이 그를 불러 세웠다.'), T('정적이 깨졌다.'),
      T('빗방울 하나가 뺨을 적셨다.', 'lyric'),
      T('날카로운 경적이 정신을 깨웠다.', 'tense'),
      T('그 모든 환영이 일순 흩어졌다.', 'literary'),
    ],
  },
  {
    key: 'snap', label: '깨어남',
    tokens: [
      T('퍼뜩 정신을 차렸다.'), T('눈을 떴다.'), T('현재로 돌아왔다.'),
      T('숨을 몰아쉬며 고개를 들었다.'), T('과거의 안개가 걷혔다.'),
      T('비로소 지금 이 자리를 깨달았다.'),
      T('천천히 현실로 떠올랐다.', 'lyric'),
      T('퍼뜩 몸을 일으켰다.', 'tense'),
      T('한참 만에야 제정신이 들었다.', 'literary'),
    ],
  },
  {
    key: 'after', label: '여운',
    tokens: [
      T('얼마나 시간이 흘렀는지 알 수 없었다.'), T('손끝이 차갑게 식어 있었다.'),
      T('뺨이 젖어 있었다.'), T('아무 일도 없었던 듯 주위는 그대로였다.'),
      T('그 기억의 무게가 가슴에 남아 있었다.'),
      T('현재의 소음이 다시 밀려들었다.'),
      T('오래 묵은 슬픔만이 남았다.', 'lyric'),
      T('심장이 여전히 거칠게 뛰고 있었다.', 'tense'),
      T('지나간 시간이 그를 바꾸어 놓은 뒤였다.', 'literary'),
    ],
  },
]

const PARTS: Record<TypeKey, PartDef[]> = {
  time: TIME_PARTS,
  place: PLACE_PARTS,
  pov: POV_PARTS,
  flashIn: FLASHIN_PARTS,
  flashOut: FLASHOUT_PARTS,
}

// 길이별로 사용할 슬롯을 고른다. 문법상 '서술을 맺는' 마지막 슬롯은 항상 포함하고,
// 길이가 짧으면 가운데(꾸밈) 슬롯을 생략한다. → 어떤 조합이라도 완결된 문장이 되도록 보장.
function slotsForLength(type: TypeKey, len: Length): string[] {
  const all = PARTS[type].map((p) => p.key)
  // time 은 연결어+시간폭+마무리가 모두 있어야 자연스럽다(시간폭은 핵심이라 항상 유지).
  if (type === 'time') {
    if (len === 'short') return ['span', 'tail']   // "사흘이 흘렀다."
    return ['conj', 'span', 'tail']                 // "그로부터 사흘이 흘렀다."
  }
  if (len === 'long') return all
  const first = all[0]
  const last = all[all.length - 1]
  if (len === 'mid') {
    // 가운데 슬롯이 있으면 하나만 끼워 3개, 없으면 양끝 2개.
    if (all.length >= 3) return [first, all[1], last]
    return [first, last]
  }
  // short: 양끝(도입+서술 마무리)만.
  return first === last ? [first] : [first, last]
}

// ───────────────────────── 조합 로직 ─────────────────────────
const rnd = <X,>(a: X[]): X => a[Math.floor(Math.random() * a.length)]

function tokensFor(type: TypeKey, partKey: string, tone: Tone): Token[] {
  const part = PARTS[type].find((p) => p.key === partKey)
  if (!part) return []
  // 톤 일치(태그 없으면 공용) 우선. 일치 토큰이 너무 적으면 공용까지 합쳐 다양성 확보.
  const matched = part.tokens.filter((tk) => !tk.tone || tk.tone.includes(tone))
  const universal = part.tokens.filter((tk) => !tk.tone)
  if (matched.length >= 3) return matched
  // 부족하면 매치 + 공용 합집합
  const set = new Map<string, Token>()
  ;[...matched, ...universal].forEach((tk) => set.set(tk.t, tk))
  return Array.from(set.values())
}

function pickPart(type: TypeKey, partKey: string, tone: Tone, avoid?: string): string {
  const pool = tokensFor(type, partKey, tone)
  if (pool.length === 0) return ''
  let p = rnd(pool).t
  if (p === avoid && pool.length > 1) p = rnd(pool).t
  return p
}

// 슬롯 토큰들을 한 문장으로 매끄럽게 잇는다(유형별 띄어쓰기 규칙).
function joinSlots(type: TypeKey, slots: string[], picks: Record<string, string>): string {
  const vals = slots.map((s) => picks[s] || '').filter(Boolean)
  if (vals.length === 0) return ''
  if (type === 'time') {
    // tail 템플릿(◯/@/#)에 시간폭과 조사를 받침에 맞춰 결합 → "그로부터 사흘이 흘렀다."
    const conj = picks.conj || ''
    const span = picks.span || ''
    const tail = picks.tail || ''
    const core = span && tail ? conjTail(span, tail) : (tail ? tail.replace('◯', '').replace('@', '').replace('#', '').trim() : span)
    return (conj ? conj + ' ' + core : core).replace(/\s+/g, ' ').trim()
  }
  if (type === 'place') {
    // leave transit arrive → "문을 닫고 나서자 이내 새로운 곳에 닿았다."
    return vals.join(' ').replace(/\s+/g, ' ').trim()
  }
  if (type === 'pov') {
    // pivot, who, beat → "한편 그녀는 ..." (pivot 뒤 쉼표 옵션)
    const pivot = picks.pivot || ''
    const rest = slots.filter((s) => s !== 'pivot').map((s) => picks[s]).filter(Boolean).join(' ')
    if (pivot && rest) return `${pivot}, ${rest}`.replace(/\s+/g, ' ').trim()
    return (pivot || rest).trim()
  }
  // flashIn / flashOut → 조각을 공백으로 잇기
  return vals.join(' ').replace(/\s+/g, ' ').trim()
}

interface Line { id: number; type: TypeKey; tone: Tone; len: Length; picks: Record<string, string>; text: string }

let LID = 1
function makeLine(type: TypeKey, tone: Tone, len: Length, lockedPicks?: Record<string, string>, prev?: Record<string, string>): Line {
  const slots = slotsForLength(type, len)
  const picks: Record<string, string> = {}
  slots.forEach((s) => {
    if (lockedPicks && lockedPicks[s] != null) { picks[s] = lockedPicks[s]; return }
    picks[s] = pickPart(type, s, tone, prev?.[s])
  })
  return { id: LID++, type, tone, len, picks, text: joinSlots(type, slots, picks) }
}

// ───────────────────────── 텍스트/HTML 직렬화 ─────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const typeLabel = (k: TypeKey) => TYPES.find((t) => t.key === k)?.label || k
const typeIcon = (k: TypeKey) => TYPES.find((t) => t.key === k)?.icon || '🎬'
const typeColor = (k: TypeKey) => TYPES.find((t) => t.key === k)?.color || 'var(--accent)'
const toneLabel = (k: Tone) => TONES.find((t) => t.key === k)?.label || k

// ───────────────────────── 컴포넌트 ─────────────────────────
interface Persist { type: TypeKey; tone: Tone; len: Length; batch: number; saved: SavedLine[] }
interface SavedLine { id: number; type: TypeKey; tone: Tone; text: string }

function loadPersist(): Persist {
  const def: Persist = { type: 'time', tone: 'plain', len: 'mid', batch: 6, saved: [] }
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>
      return {
        type: TYPES.some((t) => t.key === p.type) ? (p.type as TypeKey) : def.type,
        tone: TONES.some((t) => t.key === p.tone) ? (p.tone as Tone) : def.tone,
        len: LENGTHS.some((l) => l.key === p.len) ? (p.len as Length) : def.len,
        batch: typeof p.batch === 'number' && p.batch >= 1 && p.batch <= 12 ? p.batch : def.batch,
        saved: Array.isArray(p.saved)
          ? p.saved.filter((s): s is SavedLine => !!s && typeof s.text === 'string' && TYPES.some((t) => t.key === s.type))
              .map((s) => ({ id: s.id, type: s.type, tone: TONES.some((t) => t.key === s.tone) ? s.tone : 'plain', text: s.text }))
          : def.saved,
      }
    }
  } catch { /* ignore */ }
  return def
}

export default function SceneTransitions({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadPersist()).current
  const [type, setType] = useState<TypeKey>(init.type)
  const [tone, setTone] = useState<Tone>(init.tone)
  const [len, setLen] = useState<Length>(init.len)
  const [batch, setBatch] = useState<number>(init.batch)

  // 단일 작업대(슬롯 잠금/부분 재생성)
  const [work, setWork] = useState<Line | null>(null)
  const [locks, setLocks] = useState<Record<string, boolean>>({})

  // 대량 생성 결과
  const [lines, setLines] = useState<Line[]>([])

  const [saved, setSaved] = useState<SavedLine[]>(init.saved)
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  // payload 로 유형 지정 가능(다른 도구에서 열 때)
  useEffect(() => {
    const pType = payload?.type
    if (typeof pType === 'string' && TYPES.some((t) => t.key === pType)) {
      setType(pType as TypeKey)
      setTab('gen')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ type, tone, len, batch, saved } as Persist)) } catch { /* 용량 초과 무시 */ }
  }, [type, tone, len, batch, saved])

  // 토스트 자동 해제(언마운트/재설정 시 타이머 정리)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1900)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => setCopiedKey(''), 1400)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  // 유형/길이가 바뀌면 작업대의 잠금 중 더는 존재하지 않는 슬롯은 정리
  const activeSlots = slotsForLength(type, len)
  useEffect(() => {
    setLocks((prev) => {
      const next: Record<string, boolean> = {}
      activeSlots.forEach((s) => { if (prev[s]) next[s] = true })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, len])

  // 작업대 새로 굴리기(잠긴 슬롯 유지)
  const rollWork = useCallback(() => {
    setWork((prev) => {
      const lockedPicks: Record<string, string> = {}
      if (prev) activeSlots.forEach((s) => { if (locks[s] && prev.picks[s] != null) lockedPicks[s] = prev.picks[s] })
      return makeLine(type, tone, len, lockedPicks, prev?.picks)
    })
  }, [type, tone, len, locks, activeSlots])

  // 특정 슬롯만 다시 뽑기
  const rerollSlot = (slotKey: string) => {
    setWork((prev) => {
      if (!prev) return prev
      const picks = { ...prev.picks }
      picks[slotKey] = pickPart(type, slotKey, tone, prev.picks[slotKey])
      return { ...prev, picks, text: joinSlots(type, activeSlots, picks) }
    })
  }

  const toggleLock = (slotKey: string) => setLocks((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }))

  // 대량 생성(현재 유형/톤/길이로 batch 개, 중복 텍스트 회피)
  const genBatch = useCallback(() => {
    const out: Line[] = []
    const seen = new Set<string>()
    let guard = 0
    let prev: Record<string, string> | undefined
    while (out.length < batch && guard < batch * 12) {
      guard++
      const ln = makeLine(type, tone, len, undefined, prev)
      prev = ln.picks
      if (!ln.text || seen.has(ln.text)) continue
      seen.add(ln.text)
      out.push(ln)
    }
    setLines(out)
  }, [type, tone, len, batch])

  // 첫 마운트 시 작업대 한 줄 채워두기(빈 화면 방지)
  useEffect(() => {
    setWork(makeLine(init.type, init.tone, init.len))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장(스니펫 보관함 = 도구 내부 목록)
  const saveLine = (l: { type: TypeKey; tone: Tone; text: string }) => {
    if (!l.text) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === l.text)) { setToast('이미 보관된 문장입니다.'); return prev }
      setToast('보관함에 담았습니다.')
      return [{ id: LID++, type: l.type, tone: l.tone, text: l.text }, ...prev].slice(0, 200)
    })
  }
  const removeSaved = (id: number) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const clearSaved = () => { if (saved.length) { setSaved([]); setToast('보관함을 비웠습니다.') } }

  const copy = (key: string, text: string) => {
    if (!navigator.clipboard) { setToast('이 환경에서는 클립보드 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => setCopiedKey(key)).catch(() => setToast('복사에 실패했습니다.'))
  }

  // ── 연계: 스니펫(공유 라이브러리) ──
  const toSnippet = (l: { type: TypeKey; tone: Tone; text: string }) => {
    if (!l.text) return
    addToLibrary('snippets', {
      text: l.text,
      source: '장면 전환 문구',
      tags: ['장면 전환', typeLabel(l.type), toneLabel(l.tone)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }
  const savedToSnippets = () => {
    if (!saved.length) return
    saved.forEach((s) => addToLibrary('snippets', { text: s.text, source: '장면 전환 문구', tags: ['장면 전환', typeLabel(s.type), toneLabel(s.tone)] }))
    setToast(`보관 ${saved.length}개를 스니펫으로 저장했습니다.`)
  }

  // ── 연계: 수집함(Stash) ──
  const toStash = (l: { type: TypeKey; text: string }) => {
    addToStash({ kind: 'note', label: `🎬 ${typeLabel(l.type)} 전환`, text: l.text })
    setToast('수집함에 담았습니다.')
  }

  // ── 연계: 프로젝트 자료 ──
  const linesToProject = (items: { type: TypeKey; tone: Tone; text: string }[], titleHint: string) => {
    if (!items.length) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const byType = new Map<TypeKey, { tone: Tone; text: string }[]>()
    items.forEach((it) => { const a = byType.get(it.type) || []; a.push({ tone: it.tone, text: it.text }); byType.set(it.type, a) })
    const sections: string[] = []
    byType.forEach((arr, tk) => {
      sections.push(`<p><strong>${escHtml(typeIcon(tk))} ${escHtml(typeLabel(tk))}</strong></p>`)
      sections.push('<ul>' + arr.map((a) => `<li>${escHtml(a.text)} <span style="color:#888;font-size:11px;">(${escHtml(toneLabel(a.tone))})</span></li>`).join('') + '</ul>')
    })
    const cats = Array.from(byType.keys()).map(typeLabel)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '장면 전환',
      title: titleHint,
      bodyHtml: sections.join(''),
      synopsis: items.slice(0, 3).map((i) => i.text).join(' / '),
      meta: { 유형: cats.join(', '), 문장수: String(items.length) },
    })
    setToast(id ? '프로젝트 자료 〈장면 전환〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const col = typeColor(type)

  const TypeBadge = ({ tk }: { tk: TypeKey }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: typeColor(tk), border: `1px solid ${typeColor(tk)}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      <Emoji e={typeIcon(tk)} /> {typeLabel(tk)}
    </span>
  )

  const seg = (on: boolean): React.CSSProperties => ({
    borderColor: on ? 'var(--accent)' : 'var(--border)',
    color: on ? 'var(--text)' : 'var(--muted)',
    opacity: on ? 1 : 0.7,
  })

  const curDef = TYPES.find((t) => t.key === type)!

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>장면 전환</b> 유형을 고르고 톤·길이를 맞추면, 어구 표를 조합해 자연스러운 전환 문장을 만들어 줍니다.
        조각을 <Emoji e="🔒" />로 고정한 뒤 다시 굴려 미세 조정하거나, 한꺼번에 여러 후보를 뽑아 마음에 드는 문장을 골라 보세요.
      </div>

      {/* 탭 */}
      <div style={row}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'} style={seg(tab === 'gen')}><Emoji e="🎬" /> 생성</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={seg(tab === 'saved')}><Emoji e="⭐" /> 보관함 ({saved.length})</button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 유형 선택 */}
          <div style={row}>
            {TYPES.map((t) => {
              const on = type === t.key
              return (
                <button key={t.key} className="minibtn" onClick={() => setType(t.key)} aria-pressed={on} title={t.desc}
                  style={{ borderColor: on ? t.color : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', opacity: on ? 1 : 0.65, fontWeight: on ? 700 : 400 }}>
                  <Emoji e={t.icon} /> {t.label}
                </button>
              )
            })}
          </div>
          <div style={{ ...hint, color: col, fontSize: 11.5 }}><Emoji e={curDef.icon} /> {curDef.desc}</div>

          {/* 톤 / 길이 */}
          <div style={row}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>톤</span>
            {TONES.map((t) => (
              <button key={t.key} className="minibtn" onClick={() => setTone(t.key)} aria-pressed={tone === t.key} style={{ ...seg(tone === t.key), minWidth: 44 }}>{t.label}</button>
            ))}
            <span style={{ width: 8 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>길이</span>
            {LENGTHS.map((l) => (
              <button key={l.key} className="minibtn" onClick={() => setLen(l.key)} aria-pressed={len === l.key} style={{ ...seg(len === l.key), minWidth: 44 }}>{l.label}</button>
            ))}
          </div>

          {/* 작업대: 슬롯별 잠금 + 부분 재생성 */}
          <div style={{ ...card, borderColor: col, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TypeBadge tk={type} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>작업대 — 조각을 고정하고 다듬어 보세요</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={rollWork} title="잠금 안 한 조각만 다시 굴리기"><Emoji e="🎲" /> 굴리기</button>
            </div>

            {/* 슬롯 칩 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activeSlots.map((sk) => {
                const part = PARTS[type].find((p) => p.key === sk)!
                const locked = !!locks[sk]
                const raw = work?.picks[sk] || ''
                // time 의 tail 토큰은 '◯@/#' 마커를 포함 → 칩에는 시간폭을 끼워 미리보기로 표시.
                const val = type === 'time' && sk === 'tail' && raw
                  ? conjTail(work?.picks.span || '◯', raw)
                  : raw
                return (
                  <div key={sk} style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${locked ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: 'var(--paper)' }}>
                    <button onClick={() => toggleLock(sk)} title={locked ? '고정 해제' : '이 조각 고정'}
                      style={{ border: 'none', background: locked ? 'var(--accent)' : 'transparent', color: locked ? '#fff' : 'var(--muted)', cursor: 'pointer', padding: '4px 6px', fontSize: 12 }}>
                      {locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                    <button onClick={() => rerollSlot(sk)} title={`${part.label} 다시 뽑기`} disabled={locked}
                      style={{ border: 'none', background: 'transparent', color: 'var(--text)', cursor: locked ? 'default' : 'pointer', padding: '4px 8px', fontSize: 12.5, textAlign: 'left', opacity: locked ? 0.7 : 1, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 10, marginRight: 4 }}>{part.label}</span>{val || '—'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 완성 문장 */}
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', minHeight: 24 }}>
              {work?.text || <><Emoji e="🎲" /> 굴리기를 눌러 전환 문장을 만들어 보세요.</>}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="minibtn" onClick={() => work && copy('work', work.text)} disabled={!work?.text}>{copiedKey === 'work' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
              <button className="minibtn" onClick={() => work && saveLine(work)} disabled={!work?.text}><Emoji e="⭐" /> 보관</button>
              <button className="linkbtn" onClick={() => work && toSnippet(work)} disabled={!work?.text}><Emoji e="🧩" /> 스니펫</button>
              {hasStash() && <button className="linkbtn" onClick={() => work && toStash(work)} disabled={!work?.text}><Emoji e="📌" /> 수집함</button>}
              <button className="linkbtn" onClick={() => work && linesToProject([work], `🎬 ${typeLabel(work.type)} 전환 — ${work.text.slice(0, 16)}…`)} disabled={!work?.text || !hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 문장을 프로젝트 자료에 추가'}><Emoji e="📄" /> 프로젝트</button>
            </div>
          </div>

          {/* 대량 생성 */}
          <div style={row}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>한 번에</span>
            <input type="range" min={2} max={12} step={1} value={batch} onChange={(e) => setBatch(Number(e.target.value))} style={{ flex: 1, minWidth: 80, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{batch}개</span>
            <button className="btn-primary" onClick={genBatch}><Emoji e="⚡" /> 묶음 생성</button>
          </div>

          {/* 결과 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {lines.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 34, marginBottom: 6 }}><Emoji e={curDef.icon} /></div>
                <b>{curDef.label}</b> 전환 문장을 묶음으로 생성해 비교해 보세요.
              </div>
            )}
            {lines.map((l) => {
              const k = 'g' + l.id
              const isSaved = saved.some((s) => s.text === l.text)
              return (
                <div key={l.id} style={card}>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>{l.text}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{toneLabel(l.tone)} · {LENGTHS.find((x) => x.key === l.len)?.label}</span>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => copy(k, l.text)} title="복사">{copiedKey === k ? '✓' : <Emoji e="📋" />}</button>
                    <button className="minibtn" onClick={() => saveLine(l)} title={isSaved ? '이미 보관됨' : '보관'} style={{ borderColor: isSaved ? 'var(--accent)' : 'var(--border)' }}>{isSaved ? <Emoji e="⭐" /> : '☆'}</button>
                    <button className="linkbtn" onClick={() => toSnippet(l)} title="스니펫 라이브러리에 저장"><Emoji e="🧩" /></button>
                    {hasStash() && <button className="linkbtn" onClick={() => toStash(l)} title="수집함에 담기"><Emoji e="📌" /></button>}
                  </div>
                </div>
              )
            })}
          </div>

          {lines.length > 0 && (
            <div className="linkbar">
              <span className="linkbar-label">묶음 전체:</span>
              <button className="minibtn" onClick={() => copy('all', lines.map((l) => l.text).join('\n'))}>{copiedKey === 'all' ? <>✓ 복사됨</> : <><Emoji e="📋" /> {lines.length}개 복사</>}</button>
              <button className="linkbtn" onClick={() => { lines.forEach((l) => toSnippet(l)); setToast(`${lines.length}개를 스니펫으로 저장했습니다.`) }}><Emoji e="🧩" /> 전체 스니펫</button>
              <button className="linkbtn" onClick={() => linesToProject(lines, `🎬 ${curDef.label} 전환 문구 ${lines.length}종`)} disabled={!hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '묶음 전체를 프로젝트 자료에 추가'}><Emoji e="📄" /> 프로젝트에 추가</button>
            </div>
          )}
        </>
      )}

      {tab === 'saved' && (
        <>
          <div style={row}>
            <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>보관한 전환 문장 {saved.length}개</span>
            <button className="linkbtn" onClick={savedToSnippets} disabled={!saved.length}><Emoji e="🧩" /> 전체 스니펫</button>
            <button className="linkbtn" onClick={() => linesToProject(saved, `🎬 보관한 장면 전환 ${saved.length}종`)} disabled={!saved.length || !hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '보관함 전체를 프로젝트 자료에 추가'}><Emoji e="📄" /> 프로젝트</button>
            <button className="minibtn" onClick={clearSaved} disabled={!saved.length} style={{ borderColor: saved.length ? 'var(--warn)' : 'var(--border)', color: saved.length ? 'var(--warn)' : 'var(--muted)' }}><Emoji e="🗑" /> 비우기</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {saved.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
                보관한 전환 문장이 없습니다.<br />
                <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 문장을 모아보세요.</span>
              </div>
            )}
            {saved.map((s) => {
              const k = 's' + s.id
              return (
                <div key={s.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TypeBadge tk={s.type} />
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{toneLabel(s.tone)}</span>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => copy(k, s.text)} title="복사">{copiedKey === k ? '✓' : <Emoji e="📋" />}</button>
                    <button className="linkbtn" onClick={() => toSnippet(s)} title="스니펫 라이브러리에 저장"><Emoji e="🧩" /></button>
                    {hasStash() && <button className="linkbtn" onClick={() => toStash(s)} title="수집함에 담기"><Emoji e="📌" /></button>}
                    <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>{s.text}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>전환 문장은 출발점입니다. 인물 이름·구체적 장소·시간 단위를 채워 넣어 장면에 꼭 맞게 다듬어 보세요.</div>
    </div>
  )
}
