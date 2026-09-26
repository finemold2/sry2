// 거짓말·진실 엔진 — 인물이 '믿는 거짓'에서 '깨닫는 진실'로 가는 아크를, 거짓의 사다리(표층→심층→상처)와
//   다섯 단계 시험(거짓이 통하던 시절 → 균열 → 거짓의 대가 → 진실의 순간 → 진실 이후)으로 구조화한다.
//  · 거짓 사다리: 인물이 의식적으로 내세우는 표층 거짓 아래, 더 깊은 거짓과 그 뿌리인 상처를 층으로 쌓는다.
//  · 거짓 장악도: 거짓의 단단함·상처 깊이·증거 무시 정도를 입력 기반으로 정량화(결정론). 장악도가 높을수록
//    각성 지점이 늦어지고 '대가'가 커진다.
//  · 진실의 순간 설계기: 거짓을 깨뜨리는 촉매(누가/무엇이) + 인물의 저항 + 깨달음 문장을 자동 종합.
//  · 다섯 단계 아크를 결정론적으로 생성하고, 거짓의 대가 비트를 따로 강조한다.
//  결정론: 모든 점수·문장은 입력 텍스트 기반 의사난수(시드=문자열 해시)로 계산 — 새로고침해도 동일.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/키/미디어 없음. localStorage 자동 저장/복원.
//  연계: 인물 라이브러리 읽기/쓰기 · 좌측 바인더 파일 드롭 · payload.character/text 수용 ·
//        프로젝트 자료 〈인물〉 카드/문서 추가 · 욕망필요 엔진/GMC/장면 도구로 보내기 · 수집함 담기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, type SharedCharacter,
  addToProject, hasProjectBridge, openToolLinked,
  addToStash, hasStash,
  getDragItem, isItemDrag, type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'lie-truth-engine',
  name: '거짓말·진실 엔진',
  icon: '🃏',
  group: '캐릭터',
  intro: '인물이 믿는 거짓 → 깨닫는 진실의 아크(거짓의 대가·진실의 순간)를 사다리와 5단계로 구조화',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:lie-truth-engine'

// ───────── 모델 ─────────
type ArcKind = 'redemptive' | 'flat' | 'tragic' | 'disillusion' | 'corruption'
interface Soul {
  id: string
  name: string
  role: string
  surfaceLie: string   // 표층 거짓 — 인물이 입 밖에 내고 행동으로 드러내는 믿음
  deepLie: string      // 심층 거짓 — 표층을 떠받치는 더 근본적인 자기기만
  wound: string        // 상처/유령 — 거짓이 태어난 과거의 사건
  truth: string        // 진실 — 거짓을 깨고 인물이 끌어안아야 할 것
  catalyst: string     // 촉매 — 거짓을 흔드는 사건/인물/대사
  cost: string         // 거짓의 대가 — 거짓을 붙들었기에 잃거나 망친 것
  rigidity: number     // 0~100: 거짓을 붙드는 완고함(증거 무시·합리화 강도)
  arc: ArcKind
}

const ARCS: { v: ArcKind; label: string; hint: string }[] = [
  { v: 'redemptive', label: '구원형', hint: '거짓을 버리고 진실을 끌어안아 변화' },
  { v: 'flat', label: '평탄형', hint: '이미 진실을 쥔 인물 — 거짓에 갇힌 세계를 바꿈' },
  { v: 'tragic', label: '비극형', hint: '진실이 보이지만 끝내 거짓을 택해 무너짐' },
  { v: 'disillusion', label: '환멸형', hint: '거짓이 깨지나 진실을 끌어안지 못함' },
  { v: 'corruption', label: '타락형', hint: '거짓을 더 깊이 끌어안고 진실에서 멀어짐' },
]
const ARC_LABEL = (v: ArcKind) => ARCS.find((a) => a.v === v)?.label || '구원형'

function blank(): Soul {
  return { id: '', name: '', role: '', surfaceLie: '', deepLie: '', wound: '', truth: '', catalyst: '', cost: '', rigidity: 60, arc: 'redemptive' }
}
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'lte_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const person = (n: string) => (n || '').trim() || '인물'
const dash = (s: string) => (s || '').trim() || '—'
const has = (s: string) => !!(s || '').trim()

// ───────── 결정론 해시 ─────────
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}
function seeded(s: string): number { return (hash(s) % 1000) / 1000 }

// ───────── 거짓 장악도(0~100) ─────────
// 거짓이 인물을 얼마나 단단히 붙잡고 있는지. 완고함 · 층의 깊이 · 상처의 무게 · 진실과의 거리로 계산.
function gripScore(s: Soul): number {
  let base = 30
  base += (s.rigidity - 50) * 0.5
  if (has(s.surfaceLie)) base += 10
  if (has(s.deepLie)) base += 16          // 심층 거짓까지 있으면 훨씬 단단
  if (has(s.wound)) base += 12            // 상처가 뿌리를 박았다
  if (has(s.truth)) base -= 6             // 진실을 명료히 알수록 약점이 드러남
  // 거짓과 진실이 정반대 주제일수록(=정면 부정) 더 단단히 방어한다.
  if (has(s.surfaceLie) && has(s.truth)) {
    const opposed = themeOf(s.surfaceLie) && themeOf(s.surfaceLie) !== themeOf(s.truth)
    base += opposed ? 8 : 0
  }
  const jitter = seeded(s.surfaceLie + s.deepLie + s.id) * 12 - 6
  return Math.round(Math.max(0, Math.min(100, base + jitter)))
}
function gripLabel(g: number): string {
  if (g >= 80) return '철벽'
  if (g >= 60) return '완강'
  if (g >= 40) return '흔들리는 중'
  if (g >= 20) return '균열'
  return '무너지기 직전'
}

// 한국어 키워드 → 가벼운 주제 분류(완전 로컬 사전) — 거짓의 빛깔을 읽어 문장을 다듬는다.
const THEME_WORDS: Record<string, string[]> = {
  가치없음: ['쓸모', '가치없', '사랑받을', '부족', '모자', '하찮', '버림', '버려', '필요없'],
  통제: ['통제', '완벽', '실수', '내가 다', '책임져야', '혼자서', '약하면', '빈틈'],
  신뢰: ['믿으면', '배신', '의지하면', '아무도', '혼자가', '기대면', '상처받'],
  힘: ['강해야', '약함', '권력', '이겨야', '지배', '우위', '굴복', '무릎'],
  자격: ['자격없', '받을 자격', '행복할', '용서받을', '죄', '벌받', '갚아야'],
  진실회피: ['모른 척', '괜찮은 척', '아닌 척', '숨기면', '들키면', '가면', '연기'],
}
function themeOf(s: string): string {
  const t = s || ''
  let best = '', max = 0
  for (const k in THEME_WORDS) {
    let c = 0
    for (const w of THEME_WORDS[k]) if (t.indexOf(w) >= 0) c++
    if (c > max) { max = c; best = k }
  }
  return best
}

// 각성(진실의 순간) 위치 — 장악도가 클수록 늦게 온다(아크의 약 60~85%).
function truthMomentPos(s: Soul): number {
  return Math.round(58 + (gripScore(s) / 100) * 27)
}

// 거짓 사다리(표층→심층→상처) — 비어 있으면 추론 힌트.
function ladder(s: Soul): { tier: string; text: string; tone: string }[] {
  return [
    { tier: '표층 거짓', text: dash(s.surfaceLie), tone: 'var(--warn)' },
    { tier: '심층 거짓', text: has(s.deepLie) ? s.deepLie : (has(s.surfaceLie) ? `왜 그렇게 믿는가? — “${s.surfaceLie}” 아래 더 깊은 자기기만을 적어보세요.` : '—'), tone: 'color-mix(in srgb, var(--warn) 60%, var(--accent))' },
    { tier: '상처(유령)', text: dash(s.wound), tone: 'var(--muted)' },
  ]
}

// 진실의 순간 설계 — 촉매 + 저항 + 깨달음.
function truthMoment(s: Soul): { catalyst: string; resistance: string; realization: string } {
  const who = person(s.name)
  const g = gripScore(s)
  const cat = has(s.catalyst)
    ? s.catalyst
    : `“${dash(s.surfaceLie)}”라는 믿음으로는 도저히 설명되지 않는 사건이 ${who} 앞에 놓인다`
  const resistance = g >= 70
    ? `${who}은(는) 끝까지 부정하고 합리화한다 — 진실을 들이밀어도 한 번 더 거짓으로 도망친 뒤에야 무너진다.`
    : g >= 45
      ? `${who}은(는) 흔들리지만 곧장 인정하지 않는다 — 분노하거나 회피한 뒤 천천히 받아들인다.`
      : `${who}의 거짓은 이미 금이 가 있어, 작은 충격에도 진실이 새어 들어온다.`
  const realization = has(s.truth)
    ? `${who}은(는) 마침내 깨닫는다 — “${s.truth}”.`
    : `${who}은(는) 거짓이 자신을 지켜준 게 아니라 가두고 있었음을 깨닫는다(진실 문구를 적어 완성하세요).`
  return { catalyst: cat, resistance, realization }
}

// 5단계 아크 비트(결정론).
const STAGES = ['거짓이 통하던 시절', '첫 균열', '거짓의 대가', '진실의 순간', '진실 이후'] as const
function beatLines(s: Soul): string[] {
  const who = person(s.name)
  const sl = dash(s.surfaceLie), tr = dash(s.truth), wd = dash(s.wound), ct = dash(s.cost)
  const pos = truthMomentPos(s)
  const tm = truthMoment(s)
  const after = (() => {
    switch (s.arc) {
      case 'flat': return `${who}은(는) 흔들리지 않는 진실의 담지자로 남고, 거짓에 갇혀 있던 주변이 바뀐다.`
      case 'tragic': return `진실이 분명히 보였음에도 ${who}은(는) 거짓을 택하고, 거짓의 대가가 그를 집어삼킨다(비극).`
      case 'disillusion': return `거짓은 깨졌으나 ${who}은(는) 진실을 끌어안지 못하고 차갑게 식는다.`
      case 'corruption': return `${who}은(는) 진실에서 등을 돌려 거짓을 더 깊이 끌어안고 망가져 간다.`
      default: return `${who}은(는) 거짓을 내려놓고 진실 “${tr}”을(를) 살아가는 사람으로 다시 선다.`
    }
  })()
  return [
    `거짓이 통하던 시절 — ${who}은(는) “${sl}”라는 거짓 위에서 안전하게 산다. 이 믿음은 한때 ${wd !== '—' ? `상처(${wd})` : '과거의 상처'}로부터 그를 지켜주었다.`,
    `첫 균열 — ${tm.catalyst}. 거짓의 표면에 처음으로 금이 간다.`,
    `거짓의 대가 — 거짓을 붙든 탓에 ${who}은(는) ${ct !== '—' ? ct + '을(를) 잃는다' : '소중한 것을 잃거나 망친다'}. 대가가 클수록 진실의 무게가 드러난다.`,
    `진실의 순간(≈${pos}%) — ${tm.resistance} 그리고 ${tm.realization}`,
    `진실 이후 — ${after}`,
  ]
}

// 거짓을 깨는 대조 질문(소크라테스식) — 작가가 인물을 추궁하도록.
function probes(s: Soul): string[] {
  const who = person(s.name)
  const sl = dash(s.surfaceLie)
  return [
    `${who}이(가) “${sl}”를 처음 믿게 된 그 장면은 무엇인가?`,
    `이 거짓이 ${who}을(를) 보호해 준 적이 있다면 언제인가? (거짓에도 한때의 효용이 있어야 설득력이 생긴다)`,
    `이 거짓 때문에 ${who}이(가) 외면하는 사람·기회·진실은 무엇인가?`,
    `“${dash(s.truth)}”를 인정하면 ${who}은(는) 무엇을 포기해야 하는가? (그 두려움이 저항의 동력이다)`,
    `독자가 ${who}의 거짓을 먼저 알아차리는 순간(극적 아이러니)을 어디에 둘 것인가?`,
  ]
}

// ───────── 영속 ─────────
function load(): { souls: Soul[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { souls: [] }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.souls) ? p.souls : Array.isArray(p) ? p : []
    const souls: Soul[] = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
      id: str(x.id) || newId(),
      name: str(x.name), role: str(x.role),
      surfaceLie: str(x.surfaceLie), deepLie: str(x.deepLie), wound: str(x.wound),
      truth: str(x.truth), catalyst: str(x.catalyst), cost: str(x.cost),
      rigidity: Math.max(0, Math.min(100, num(x.rigidity, 60))),
      arc: (['redemptive', 'flat', 'tragic', 'disillusion', 'corruption'].includes(str(x.arc)) ? str(x.arc) : 'redemptive') as ArcKind,
    }))
    return { souls }
  } catch { return { souls: [] } }
}

// ───────── 예시(퍼블릭 도메인 고전 모델 요약) ─────────
const SAMPLE: Omit<Soul, 'id'>[] = [
  {
    name: '에비니저 스크루지', role: '주인공',
    surfaceLie: '돈만이 사람을 안전하게 지켜준다',
    deepLie: '나는 사랑받을 가치가 없으니 정을 끊는 편이 낫다',
    wound: '버림받고 외로웠던 어린 시절',
    truth: '연결과 너그러움이야말로 삶을 살 만하게 한다',
    catalyst: '세 유령이 그의 과거·현재·미래를 적나라하게 비춘다',
    cost: '조카·연인·사람들과의 모든 따뜻한 관계',
    rigidity: 88, arc: 'redemptive',
  },
  {
    name: '맥베스', role: '주인공',
    surfaceLie: '왕좌만 차지하면 두려움이 사라진다',
    deepLie: '피로 얻은 것을 더 큰 피로만 지킬 수 있다',
    wound: '예언이 일깨운, 채워지지 않는 야망',
    truth: '권력은 양심을 잠재우지 못한다',
    catalyst: '죽인 자들의 환영과 무너지는 통제',
    cost: '잠과 우정, 그리고 인간성',
    rigidity: 92, arc: 'tragic',
  },
]

export default function LieTruthEngine({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef(load())
  const [souls, setSouls] = useState<Soul[]>(initial.current.souls)
  const [draft, setDraft] = useState<Soul>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [tab, setTab] = useState<'cast' | 'arc' | 'probe'>('cast')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const characters = useLibraryList('characters')

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload.character / text 1회 수용.
  useEffect(() => {
    const c = payload?.character as Record<string, unknown> | undefined
    if (c) {
      setDraft((p) => ({
        ...p,
        name: str(c.name) || p.name,
        role: str(c.role) || p.role,
        surfaceLie: str(c.lie) || str(c.flaw) || str(c.misbelief) || p.surfaceLie,
        truth: str(c.need) || str(c.value) || str(c.truth) || p.truth,
        wound: str(c.wound) || str(c.ghost) || str(c.background) || p.wound,
      }))
      setTab('cast')
    }
    const t = payload?.text
    if (typeof t === 'string' && t.trim()) {
      setDraft((p) => ({ ...p, surfaceLie: p.surfaceLie || t.trim().slice(0, 160) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ souls, v: 1 })) }
    catch { if (mounted.current) flash('저장이 막혀 새로고침 시 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [souls])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }
  const set = <K extends keyof Soul>(k: K, v: Soul[K]) => setDraft((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      if (!mounted.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch { if (mounted.current) flash('복사에 실패했습니다. 직접 선택해 복사하세요.') }
  }

  const hasInput = !!(draft.name || draft.surfaceLie || draft.deepLie || draft.wound || draft.truth || draft.catalyst || draft.cost || draft.role)
  const clearDraft = () => { setDraft(blank()); setEditId(null) }

  const saveDraft = () => {
    if (!has(draft.name) && !has(draft.surfaceLie) && !has(draft.truth)) { flash('이름, 또는 거짓·진실 중 하나는 입력해 주세요.'); return }
    if (editId) {
      setSouls((p) => p.map((x) => (x.id === editId ? { ...draft, id: editId } : x)))
      flash('인물을 수정했습니다.')
    } else {
      const rec = { ...draft, id: newId() }
      setSouls((p) => [...p, rec])
      setFocusId(rec.id)
      flash(`‘${person(rec.name)}’을(를) 추가했습니다.`)
    }
    setDraft(blank()); setEditId(null)
  }
  const editSoul = (s: Soul) => { setDraft({ ...s }); setEditId(s.id); setTab('cast'); flash(`‘${person(s.name)}’ 편집 중`) }
  const removeSoul = (id: string) => {
    setSouls((p) => p.filter((x) => x.id !== id))
    if (editId === id) clearDraft()
    if (focusId === id) setFocusId(null)
  }
  const loadSample = () => { setSouls(SAMPLE.map((s) => ({ ...s, id: newId() }))); setTab('arc'); setFocusId(null); flash('예시(스크루지·맥베스 모델)를 불러왔습니다.') }

  // 라이브러리/드롭/캐릭터 → Soul.
  const soulFromShared = (c: SharedCharacter): Soul => {
    const f = c.fields || {}
    const t = (label: string) => c.traits?.find((x) => x.k === label)?.v || ''
    return {
      id: newId(),
      name: c.name || '',
      role: c.role || f.role || '',
      surfaceLie: f.flaw || t('거짓 신념') || t('거짓믿음') || t('거짓') || '',
      deepLie: t('심층 거짓') || '',
      wound: f.background || t('상처') || c.secret || '',
      truth: f.value || c.goal || t('진실') || t('필요') || '',
      catalyst: t('촉매') || '',
      cost: t('거짓의 대가') || '',
      rigidity: 60, arc: 'redemptive',
    }
  }
  const addFromChar = (c: SharedCharacter) => {
    const rec = soulFromShared(c)
    setSouls((p) => (p.some((x) => x.name === rec.name && rec.name) ? p : [...p, rec]))
    flash(`라이브러리 인물 ‘${c.name}’을(를) 추가했습니다.`)
  }
  const importAll = () => {
    const add = characters.map(soulFromShared).filter((r) => !souls.some((p) => p.name === r.name && r.name))
    if (!add.length) { flash('새로 추가할 라이브러리 인물이 없습니다.'); return }
    setSouls((p) => [...p, ...add])
    flash(`라이브러리 인물 ${add.length}명을 추가했습니다.`)
  }
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch = item.character || {}
    const rec: Soul = {
      id: newId(),
      name: item.title || ch.name || '',
      role: ch.role || '',
      surfaceLie: ch.flaw || ch.lie || ch.misbelief || '',
      deepLie: '',
      wound: ch.background || ch.wound || ch.ghost || '',
      truth: ch.value || ch.need || ch.truth || '',
      catalyst: '', cost: '',
      rigidity: 60, arc: 'redemptive',
    }
    setSouls((p) => [...p, rec])
    flash(`바인더 파일 ‘${item.title}’을(를) 추가했습니다.`)
  }

  const filled = useMemo(() => souls.filter((s) => has(s.surfaceLie) || has(s.truth) || has(s.name)), [souls])
  const grips = useMemo(() => Object.fromEntries(souls.map((s) => [s.id, gripScore(s)])), [souls])
  const focus = focusId ? souls.find((s) => s.id === focusId) || null : (filled[0] || null)

  // ───────── 연계 산출 ─────────
  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fieldsOf = (s: Soul): Record<string, string> => {
    const f: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
    put('name', person(s.name)); put('role', s.role)
    put('flaw', s.surfaceLie); put('value', s.truth); put('background', s.wound); put('secret', s.deepLie)
    f.arc = beatLines(s).join('\n')
    return f
  }
  const toLibrary = (s: Soul) => {
    addToLibrary('characters', {
      name: person(s.name), role: s.role.trim() || undefined, goal: s.truth.trim() || undefined,
      secret: s.deepLie.trim() || undefined,
      traits: [
        { k: '거짓 신념', v: s.surfaceLie }, { k: '심층 거짓', v: s.deepLie }, { k: '상처', v: s.wound },
        { k: '진실', v: s.truth }, { k: '촉매', v: s.catalyst }, { k: '거짓의 대가', v: s.cost },
      ].filter((x) => x.v.trim()),
      fields: fieldsOf(s),
      notes: beatLines(s).join('\n'),
      source: '거짓말·진실 엔진',
    })
    flash(`‘${person(s.name)}’을(를) 인물 라이브러리에 저장했습니다.`)
  }
  const toProjectDoc = (s: Soul) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const g = grips[s.id]
    const lad = ladder(s).map((l) => `<li style="margin-bottom:5px"><b>${escapeHtml(l.tier)}:</b> ${escapeHtml(l.text)}</li>`).join('')
    const beats = beatLines(s).map((b, i) => `<li style="margin-bottom:6px;line-height:1.7">${escapeHtml(STAGES[i])} — ${escapeHtml(b.replace(/^[^—]+— /, ''))}</li>`).join('')
    const ps = probes(s).map((q) => `<li style="margin-bottom:4px;line-height:1.6">${escapeHtml(q)}</li>`).join('')
    const bodyHtml = [
      `<p><b>거짓 → 진실 아크</b> — 거짓 장악도 ${g} (${gripLabel(g)}) · 진실의 순간 ≈${truthMomentPos(s)}% · 아크 ${ARC_LABEL(s.arc)}</p><hr/>`,
      `<h4>거짓의 사다리</h4><ul>${lad}</ul>`,
      `<p><b>진실:</b> ${escapeHtml(dash(s.truth))}</p>`,
      `<p><b>거짓의 대가:</b> ${escapeHtml(dash(s.cost))}</p>`,
      `<h4>5단계 아크</h4><ol>${beats}</ol>`,
      `<h4>거짓을 깨는 질문</h4><ol>${ps}</ol>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: `${person(s.name)} — 거짓·진실 아크`, bodyHtml })
    flash(id ? '프로젝트 ‘자료 › 인물’에 아크 문서를 추가했습니다.' : '추가하지 못했습니다.')
  }
  const toProjectCard = (s: Soul) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: person(s.name),
      character: { ...fieldsOf(s), name: person(s.name), role: s.role.trim() || '-' },
      synopsis: beatLines(s)[3],
      meta: {
        '표층 거짓': dash(s.surfaceLie), '심층 거짓': dash(s.deepLie), 상처: dash(s.wound),
        진실: dash(s.truth), 촉매: dash(s.catalyst), '거짓의 대가': dash(s.cost),
        아크: ARC_LABEL(s.arc), '거짓 장악도': `${grips[s.id]} (${gripLabel(grips[s.id])})`,
      },
    })
    flash(id ? `프로젝트 ‘자료 › 인물’에 ‘${person(s.name)}’ 카드를 추가했습니다.` : '추가하지 못했습니다.')
  }
  const toWantNeed = (s: Soul) => {
    openToolLinked('character-want-need', { character: { name: s.name, role: s.role, lie: s.surfaceLie, need: s.truth, value: s.truth, wound: s.wound, ghost: s.wound } })
    flash('욕망·필요 엔진으로 보냈습니다.')
  }
  const toGmc = (s: Soul) => {
    openToolLinked('gmc-chart', { character: { name: s.name, role: s.role, value: s.truth, flaw: s.surfaceLie, background: s.wound, fields: fieldsOf(s) } })
    flash('GMC 차트로 보냈습니다.')
  }
  const toScene = (s: Soul) => {
    const tm = truthMoment(s)
    openToolLinked('scene-forge', { conflict: `${person(s.name)}의 진실의 순간 — ${tm.catalyst}. ${tm.realization}`, characters: [person(s.name)] })
    flash('장면 도구로 진실의 순간을 보냈습니다.')
  }
  const stashBeats = (s: Soul) => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: `${person(s.name)} 거짓→진실 아크`, text: beatLines(s).map((b, i) => `${i + 1}. ${b}`).join('\n') })
    flash('수집함에 담았습니다.')
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '11px 14px 9px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 13 }
  const sTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: '0 0 9px' }
  const fLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, marginBottom: 2, display: 'block' }
  const fHint: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const ta: React.CSSProperties = { ...input, minHeight: 40, resize: 'vertical', lineHeight: 1.5 }
  const tag: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 6px', borderRadius: 7 }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.6 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: '20px 12px', border: '1px dashed var(--border)', borderRadius: 10 }
  const para: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '11px 13px', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }

  const heat = (g: number): string =>
    g >= 80 ? 'var(--warn)' : g >= 60 ? 'color-mix(in srgb, var(--warn) 70%, var(--accent))' : g >= 40 ? 'var(--accent)' : g >= 20 ? 'color-mix(in srgb, var(--accent) 45%, var(--chrome-2))' : 'var(--ok)'

  const GripBar = ({ g, compact }: { g: number; compact?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: compact ? 7 : 10, borderRadius: 6, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ width: `${g}%`, height: '100%', background: g >= 60 ? 'linear-gradient(90deg, var(--accent), var(--warn))' : 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: compact ? 10 : 11, color: 'var(--muted)', minWidth: 30, textAlign: 'right' }}>{g}</span>
    </div>
  )

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>거짓말 · 진실 엔진</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>믿는 거짓 → 깨닫는 진실 · 거짓의 사다리 · 대가와 진실의 순간</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {(['cast', 'arc', 'probe'] as const).map((t) => (
            <button key={t} className={tab === t ? 'btn-primary' : 'minibtn'} style={{ fontSize: 11.5 }} onClick={() => setTab(t)}>
              {t === 'cast' ? '인물' : t === 'arc' ? '아크 설계' : '거짓 추궁'}
            </button>
          ))}
        </div>
      </div>

      <div style={body}>
        {note && <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>{note}</div>}

        {/* ───────── 인물 탭 ───────── */}
        {tab === 'cast' && (
          <>
            {(characters.length > 0 || souls.length === 0) && (
              <div style={card}>
                <h4 style={sTitle}>시작하기</h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: characters.length ? 8 : 0 }}>
                  <button className="minibtn" onClick={loadSample}>예시(스크루지·맥베스 모델)</button>
                  {characters.length > 0 && <button className="minibtn" onClick={importAll}>라이브러리 인물 전체 가져오기 ({characters.length})</button>}
                </div>
                {characters.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {characters.slice(0, 16).map((c) => (
                      <button key={c.id} className="minibtn" style={{ fontSize: 11.5 }} onClick={() => addFromChar(c)} title="이 인물을 추가">＋ {c.name || '이름 없음'}</button>
                    ))}
                  </div>
                )}
                <div style={{ ...hint, marginTop: 8 }}>좌측 바인더의 인물 파일을 이 창에 끌어다 놓아도 추가됩니다. 거짓(약점)·진실(필요)·상처를 자동으로 채웁니다.</div>
              </div>
            )}

            {/* 편집기 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <h4 style={{ ...sTitle, margin: 0 }}>{editId ? '인물 수정 중' : '인물 추가'}</h4>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={clearDraft} disabled={!hasInput && !editId}>비우기</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={grid2}>
                  <div><label style={fLabel}>이름</label><input style={input} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 김도윤" maxLength={60} /></div>
                  <div><label style={fLabel}>역할</label><input style={input} value={draft.role} onChange={(e) => set('role', e.target.value)} placeholder="예: 주인공" maxLength={40} /></div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ ...fLabel, color: 'var(--warn)' }}>표층 거짓 (Surface Lie)</label>
                    <span style={fHint}>인물이 입 밖에 내고 행동으로 드러내는 잘못된 믿음</span>
                    <textarea style={ta} value={draft.surfaceLie} onChange={(e) => set('surfaceLie', e.target.value)} placeholder="예: 돈만이 사람을 지켜준다" maxLength={280} />
                  </div>
                  <div>
                    <label style={fLabel}>심층 거짓 (Deep Lie)</label>
                    <span style={fHint}>표층을 떠받치는 더 근본적인 자기기만(선택)</span>
                    <textarea style={ta} value={draft.deepLie} onChange={(e) => set('deepLie', e.target.value)} placeholder="예: 나는 사랑받을 가치가 없다" maxLength={280} />
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={fLabel}>상처 / 유령 (Wound)</label>
                    <span style={fHint}>거짓이 태어난 과거의 사건</span>
                    <textarea style={ta} value={draft.wound} onChange={(e) => set('wound', e.target.value)} placeholder="예: 버림받고 외로웠던 어린 시절" maxLength={280} />
                  </div>
                  <div>
                    <label style={{ ...fLabel, color: 'var(--ok)' }}>진실 (Truth)</label>
                    <span style={fHint}>거짓을 깨고 끌어안아야 할 것 — 아크의 도착지</span>
                    <textarea style={ta} value={draft.truth} onChange={(e) => set('truth', e.target.value)} placeholder="예: 연결과 너그러움이 삶을 살 만하게 한다" maxLength={280} />
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={fLabel}>촉매 (Catalyst)</label>
                    <span style={fHint}>거짓을 흔드는 사건·인물·대사(선택)</span>
                    <textarea style={ta} value={draft.catalyst} onChange={(e) => set('catalyst', e.target.value)} placeholder="예: 세 유령이 그의 삶을 비춘다" maxLength={280} />
                  </div>
                  <div>
                    <label style={fLabel}>거짓의 대가 (Cost)</label>
                    <span style={fHint}>거짓을 붙든 탓에 잃거나 망친 것(선택)</span>
                    <textarea style={ta} value={draft.cost} onChange={(e) => set('cost', e.target.value)} placeholder="예: 연인·가족과의 따뜻한 관계" maxLength={280} />
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={fLabel}>아크 유형</label>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {ARCS.map((a) => (
                        <button key={a.v} className={draft.arc === a.v ? 'btn-primary' : 'minibtn'} title={a.hint} onClick={() => set('arc', a.v)} style={{ fontSize: 11.5 }}>{a.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={fLabel}>거짓 완고함: <b style={{ color: 'var(--accent)' }}>{draft.rigidity}</b></label>
                    <input type="range" min={0} max={100} value={draft.rigidity} onChange={(e) => set('rigidity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    <span style={fHint}>완고할수록 진실의 순간이 늦어지고 대가가 커집니다.</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={saveDraft}>{editId ? '수정 저장' : '추가'}</button>
                {editId && <button className="minibtn" onClick={clearDraft}>새 인물로</button>}
              </div>
            </div>

            {/* 목록 */}
            <div style={card}>
              <h4 style={sTitle}>인물 · {souls.length}명</h4>
              {souls.length === 0 ? (
                <div style={emptyBox}>
                  아직 인물이 없습니다.<br />위에서 <b>표층 거짓</b>과 <b>진실</b>을 입력해 추가하거나,<br />
                  <b>예시</b> / <b>라이브러리 가져오기</b> / 바인더 파일 드롭으로 시작하세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {souls.map((s) => (
                    <div key={s.id} style={{ background: 'var(--chrome-2)', border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 13.5 }}>{person(s.name)}</b>
                        {has(s.role) && <span style={tag}>{s.role}</span>}
                        <span style={tag}>{ARC_LABEL(s.arc)}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                          <button style={iconBtn} title="아크 설계 보기" onClick={() => { setFocusId(s.id); setTab('arc') }}>아크</button>
                          <button style={iconBtn} title="편집" onClick={() => editSoul(s)}>편집</button>
                          <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSoul(s.id)}>삭제</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                        <span><b style={{ color: 'var(--warn)' }}>거짓</b> {dash(s.surfaceLie)}</span>
                        <span style={{ color: 'var(--muted)' }}>→</span>
                        <span><b style={{ color: 'var(--ok)' }}>진실</b> {dash(s.truth)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56 }}>거짓 장악도</span>
                        <div style={{ flex: 1 }}><GripBar g={grips[s.id] || 0} compact /></div>
                        <span style={{ ...tag, borderColor: heat(grips[s.id] || 0) }}>{gripLabel(grips[s.id] || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ───────── 아크 설계 탭 ───────── */}
        {tab === 'arc' && (
          !focus ? (
            <div style={card}><div style={emptyBox}>아크를 설계할 인물이 없습니다.<br />‘인물’ 탭에서 추가한 뒤 다시 열어 주세요.</div></div>
          ) : (
            <>
              <div style={card}>
                {filled.length > 1 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    {filled.map((s) => (
                      <button key={s.id} className={focus.id === s.id ? 'btn-primary' : 'minibtn'} style={{ fontSize: 11.5 }} onClick={() => setFocusId(s.id)}>{person(s.name)}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <b style={{ fontSize: 14 }}>{person(focus.name)}</b>
                  {has(focus.role) && <span style={tag}>{focus.role}</span>}
                  <span style={tag}>{ARC_LABEL(focus.arc)}</span>
                  <span style={{ ...tag, marginLeft: 'auto', borderColor: heat(grips[focus.id] || 0) }}>거짓 장악도 {grips[focus.id]} · {gripLabel(grips[focus.id] || 0)}</span>
                </div>

                {/* 거짓 사다리 */}
                <div style={{ ...sTitle }}>거짓의 사다리 — 표층에서 상처까지</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {ladder(focus).map((l, i) => (
                    <div key={l.tier} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginLeft: i * 14 }}>
                      <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 700, color: '#fff', background: l.tone, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{l.tier}</span>
                      <div style={{ fontSize: 12.5, lineHeight: 1.6, wordBreak: 'keep-all', color: i === 2 ? 'var(--muted)' : 'var(--text)' }}>{l.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 12, padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--ok)', borderRadius: 9 }}>
                  <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--ok)', borderRadius: 6, padding: '2px 7px' }}>진실</span>
                  <span style={{ lineHeight: 1.6, wordBreak: 'keep-all' }}>{dash(focus.truth)}</span>
                </div>

                {/* 5단계 아크 트랙 — 진실의 순간 위치 표시 */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {STAGES.map((b, i) => {
                      const isTruth = i === 3, isCost = i === 2, isAfter = i === 4
                      return (
                        <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: '100%', height: 9, borderRadius: 4, background: isTruth ? 'var(--ok)' : isCost ? 'var(--warn)' : isAfter ? heat(70) : `color-mix(in srgb, var(--accent) ${20 + i * 16}%, var(--chrome-2))` }} />
                          <span style={{ fontSize: 9.5, color: isTruth || isCost ? 'var(--text)' : 'var(--muted)', fontWeight: isTruth || isCost ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                            {b}{isTruth ? ` ${truthMomentPos(focus)}%` : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 비트 카드 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {beatLines(focus).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ flex: '0 0 auto', width: 20, height: 20, borderRadius: '50%', background: i === 3 ? 'var(--ok)' : i === 2 ? 'var(--warn)' : 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <div style={{ fontSize: 12.5, lineHeight: 1.65, wordBreak: 'keep-all' }}>{line}</div>
                    </div>
                  ))}
                </div>

                {/* 진실의 순간 설계 */}
                <div style={{ marginTop: 14 }}>
                  <div style={sTitle}>진실의 순간 — 설계</div>
                  {(() => {
                    const tm = truthMoment(focus)
                    const Row = ({ k, v, c }: { k: string; v: string; c: string }) => (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 700, color: '#fff', background: c, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{k}</span>
                        <span style={{ fontSize: 12.5, lineHeight: 1.65, wordBreak: 'keep-all' }}>{v}</span>
                      </div>
                    )
                    return (
                      <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px' }}>
                        <Row k="촉매" v={tm.catalyst} c="var(--accent)" />
                        <Row k="저항" v={tm.resistance} c="var(--warn)" />
                        <Row k="깨달음" v={tm.realization} c="var(--ok)" />
                      </div>
                    )
                  })()}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={para}>{beatLines(focus).map((b, i) => `${i + 1}. ${b}`).join('\n')}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(beatLines(focus).map((b, i) => `${i + 1}. ${b}`).join('\n'), 'arc' + focus.id)}>{copied === 'arc' + focus.id ? '복사됨' : '아크 복사'}</button>
                  <button className="minibtn" onClick={() => editSoul(focus)}>이 인물 편집</button>
                  <button className="minibtn" onClick={() => setTab('probe')}>거짓 추궁 보기</button>
                </div>

                <div className="linkbar" style={{ marginTop: 12 }}>
                  <span className="linkbar-label">연동:</span>
                  <button className="linkbtn" onClick={() => toProjectCard(focus)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 카드' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트 인물 카드</button>
                  <button className="linkbtn" onClick={() => toProjectDoc(focus)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 아크 문서' : '프로젝트에 연결되어 있지 않습니다'}>아크 문서</button>
                  <button className="linkbtn" onClick={() => toLibrary(focus)}>인물 라이브러리</button>
                  <button className="linkbtn" onClick={() => toWantNeed(focus)}>욕망·필요로</button>
                  <button className="linkbtn" onClick={() => toGmc(focus)}>GMC 차트로</button>
                  <button className="linkbtn" onClick={() => toScene(focus)}>진실의 순간 → 장면</button>
                  {hasStash() && <button className="linkbtn" onClick={() => stashBeats(focus)}>수집함</button>}
                </div>
              </div>
            </>
          )
        )}

        {/* ───────── 거짓 추궁 탭 ───────── */}
        {tab === 'probe' && (
          !focus ? (
            <div style={card}><div style={emptyBox}>추궁할 인물이 없습니다.<br />‘인물’ 탭에서 추가한 뒤 다시 열어 주세요.</div></div>
          ) : (
            <div style={card}>
              {filled.length > 1 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {filled.map((s) => (
                    <button key={s.id} className={focus.id === s.id ? 'btn-primary' : 'minibtn'} style={{ fontSize: 11.5 }} onClick={() => setFocusId(s.id)}>{person(s.name)}</button>
                  ))}
                </div>
              )}
              <h4 style={sTitle}>거짓을 깨는 질문 — {person(focus.name)}</h4>
              <div style={{ ...hint, marginBottom: 10 }}>거짓이 설득력을 가지려면 한때의 효용·뿌리·대가가 분명해야 합니다. 아래 질문에 답하며 빈틈을 메우세요.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {probes(focus).map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px' }}>
                    <span style={{ flex: '0 0 auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, wordBreak: 'keep-all', flex: 1 }}>{q}</div>
                    <button style={iconBtn} title="복사" onClick={() => copy(q, 'q' + focus.id + i)}>{copied === 'q' + focus.id + i ? '됨' : '복사'}</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(probes(focus).map((q, i) => `${i + 1}. ${q}`).join('\n'), 'allq' + focus.id)}>{copied === 'allq' + focus.id ? '복사됨' : '질문 전체 복사'}</button>
                {hasStash() && <button className="minibtn" onClick={() => { addToStash({ kind: 'memo', label: `${person(focus.name)} 거짓 추궁`, text: probes(focus).map((q, i) => `${i + 1}. ${q}`).join('\n') }); flash('수집함에 담았습니다.') }}>수집함에 담기</button>}
                <button className="minibtn" onClick={() => setTab('arc')}>아크 설계로</button>
              </div>
            </div>
          )
        )}

        <div style={hint}>
          <b>표층 거짓</b>은 인물이 드러내는 잘못된 믿음, <b>심층 거짓</b>은 그것을 떠받치는 더 깊은 자기기만이며, 둘 다 과거의 <b>상처</b>에서 자랍니다.
          인물이 거짓을 붙들수록 <b>거짓의 대가</b>가 쌓이고, <b>촉매</b>가 균열을 내며, 저항 끝에 <b>진실의 순간</b>이 옵니다.
          모든 점수와 문장은 입력에 따라 결정론적으로 계산되어 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
