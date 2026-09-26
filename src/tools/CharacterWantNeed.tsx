// 욕망·필요 엔진 — 표면 욕망(Want) vs 내면 필요(Need)의 충돌을 '매트릭스'로 분석해 캐릭터 아크를 자동 설계.
//   단일 인물 입력을 넘어, 등장인물 전체(캐스트)를 한 화면에 올려:
//    1) 인물별 내적 긴장(욕망↔필요 간극)을 정량화하고,
//    2) 인물 ↔ 인물 사이의 외적 충돌(욕망이 서로 부딪히는 정도)을 매트릭스로 계산하며,
//    3) 가장 뜨거운 갈등 짝을 자동으로 골라 '장면 충돌 씨앗'과 5단계 아크 비트를 결정론적으로 종합한다.
//   결정론적: 모든 점수는 입력 텍스트 기반 의사난수(시드=문자열 해시)와 선택 옵션으로 계산 — 새로고침해도 동일.
// 자급식: react 와 './linkbus' 외 import 없음. 완전 로컬(외부 미디어/키/네트워크 없음). localStorage 자동 저장/복원.
// 연계: 인물 라이브러리 읽기/쓰기 · 좌측 바인더 파일 드롭 · payload.character 수용 ·
//        프로젝트 자료 〈인물〉 카드/문서 추가 · GMC 차트/욕구vs필요/관계도/장면 도구로 보내기 · 수집함.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, type SharedCharacter,
  addToProject, hasProjectBridge, openToolLinked,
  addToStash, hasStash,
  getDragItem, isItemDrag, type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'character-want-need',
  name: '욕망·필요 엔진',
  icon: '🎯',
  group: '캐릭터',
  intro: '표면 욕망 vs 내면 필요의 충돌 매트릭스로 캐릭터 아크를 자동 설계 — 캐스트 전체 갈등을 정량화',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:character-want-need'

// ───────── 모델 ─────────
type Arc = 'positive' | 'negative' | 'flat' | 'fall' | 'corruption'
interface Person {
  id: string
  name: string
  role: string
  want: string        // 표면 욕망(의식적·외적 목표)
  need: string        // 내면 필요(무의식적·내적 성장)
  lie: string         // 거짓 신념 — want 를 떠받치고 need 를 가로막음
  wound: string       // 상처/유령 — lie 의 기원
  arc: Arc
  intensity: number   // 0~100: 욕망에 대한 집착 강도(외적 충돌 가중)
}

const ARCS: { v: Arc; label: string; hint: string }[] = [
  { v: 'positive', label: '성장형', hint: '거짓을 버리고 필요를 끌어안음' },
  { v: 'flat', label: '평탄형', hint: '이미 진실을 쥔 인물 — 세계를 바꿈' },
  { v: 'fall', label: '몰락형', hint: '필요를 외면하다 무너짐(비극)' },
  { v: 'negative', label: '환멸형', hint: '거짓이 깨지나 회복하지 못함' },
  { v: 'corruption', label: '타락형', hint: '욕망을 좇아 더 깊은 거짓으로' },
]
const ARC_LABEL = (v: Arc) => ARCS.find((a) => a.v === v)?.label || '성장형'

function blank(): Person {
  return { id: '', name: '', role: '', want: '', need: '', lie: '', wound: '', arc: 'positive', intensity: 60 }
}
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'cwn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const person = (n: string) => (n || '').trim() || '인물'
const dash = (s: string) => (s || '').trim() || '—'

// ───────── 결정론 해시(문자열→0..1) ─────────
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}
function seeded(s: string): number { return (hash(s) % 1000) / 1000 }

// 한국어 키워드를 가벼운 '주제 벡터'로 — 충돌 계산에 의미를 더한다(완전 로컬 사전).
const THEME_WORDS: Record<string, string[]> = {
  권력: ['권력', '지배', '왕', '통제', '복종', '명령', '제국', '정복', '우위', '서열', '왕좌'],
  사랑: ['사랑', '연인', '결혼', '가족', '애정', '곁', '유대', '함께', '정', '그리움'],
  복수: ['복수', '원수', '응징', '되갚', '증오', '분노', '대가', '피'],
  생존: ['생존', '살아', '안전', '도망', '목숨', '피난', '버티', '먹', '돈'],
  진실: ['진실', '정의', '비밀', '폭로', '밝히', '거짓', '진상', '증거'],
  자유: ['자유', '벗어', '탈출', '독립', '해방', '구속', '굴레', '떠나'],
  인정: ['인정', '성공', '명예', '증명', '존중', '자랑', '이름', '최고', '완벽'],
  속죄: ['속죄', '용서', '죄', '구원', '회복', '치유', '돌이', '책임'],
}
function themeVec(s: string): Record<string, number> {
  const v: Record<string, number> = {}
  const t = (s || '')
  for (const k in THEME_WORDS) {
    let c = 0
    for (const w of THEME_WORDS[k]) if (t.indexOf(w) >= 0) c++
    if (c) v[k] = c
  }
  return v
}
function dominantTheme(s: string): string {
  const v = themeVec(s)
  let best = '', max = 0
  for (const k in v) if (v[k] > max) { max = v[k]; best = k }
  return best
}
// 두 욕망의 충돌 점수 0~100(결정론).
function clashScore(a: Person, b: Person): number {
  const wa = a.want.trim(), wb = b.want.trim()
  if (!wa || !wb) return 0
  const va = themeVec(wa), vb = themeVec(wb)
  // 같은 자원(권력/사랑/인정 등)을 노리면 충돌↑. 상보적이면 충돌↓.
  let shared = 0, total = 0
  const keys = new Set([...Object.keys(va), ...Object.keys(vb)])
  for (const k of keys) { total++; if (va[k] && vb[k]) shared++ }
  const thematic = total ? shared / total : 0
  // 의지의 충돌: 두 인물의 집착 강도 곱.
  const willClash = (a.intensity / 100) * (b.intensity / 100)
  // 시드 흔들림(인물 짝마다 고정).
  const jitter = seeded(wa + '|' + wb + '|' + a.id + b.id) * 0.18
  // 적대 역할은 충돌 가산.
  const roleBoost = (/적|악|라이벌|경쟁|반/.test(a.role + b.role)) ? 0.15 : 0
  const raw = thematic * 0.45 + willClash * 0.4 + roleBoost + jitter
  return Math.round(Math.max(0, Math.min(1, raw)) * 100)
}
// 인물 내적 긴장(욕망↔필요 간극) 0~100.
function innerTension(p: Person): number {
  const w = dominantTheme(p.want), n = dominantTheme(p.need)
  let base = 40
  if (w && n) base = w === n ? 25 : 70           // 욕망·필요가 다른 주제일수록 간극↑
  else if (p.want.trim() && p.need.trim()) base = 55
  else base = 20
  if (p.lie.trim()) base += 12                    // 거짓 신념이 명시되면 간극 단단
  if (p.wound.trim()) base += 8
  base += (p.intensity - 50) * 0.2                // 집착이 강할수록 필요를 더 외면
  const jitter = seeded(p.want + p.need + p.id) * 14 - 7
  return Math.round(Math.max(0, Math.min(100, base + jitter)))
}
function tensionLabel(g: number): string {
  if (g >= 80) return '극심한 간극'
  if (g >= 60) return '뚜렷한 간극'
  if (g >= 40) return '잔잔한 긴장'
  if (g >= 20) return '약한 어긋남'
  return '거의 일치'
}
function clashLabel(g: number): string {
  if (g >= 75) return '정면충돌'
  if (g >= 55) return '강한 마찰'
  if (g >= 35) return '경합'
  if (g >= 15) return '미묘한 긴장'
  return '평행선'
}

// 각성 지점 위치(아크 %) — 간극이 클수록 늦게.
function awakeningPos(p: Person): number {
  return Math.round(45 + (innerTension(p) / 100) * 25)
}
const BEATS = ['거짓 속 일상', '욕망 발동', '간극 심화', '각성', '결말'] as const

// 인물 아크 5비트 자동 종합.
function beatLines(p: Person): string[] {
  const who = person(p.name)
  const want = dash(p.want), need = dash(p.need), lie = dash(p.lie), wound = dash(p.wound)
  const awk = awakeningPos(p)
  const end = (() => {
    switch (p.arc) {
      case 'flat': return `${who}은(는) 흔들리지 않는 진실의 담지자로 남고, 변하는 것은 주변 세계다.`
      case 'fall': return `${who}은(는) 끝내 필요를 외면해 무너지고, 욕망마저 손에서 빠져나간다(몰락).`
      case 'negative': return `거짓은 깨졌으나 ${who}은(는) 진실을 끌어안지 못하고 환멸 속에 남는다.`
      case 'corruption': return `${who}은(는) 욕망을 좇아 거짓을 더 깊이 끌어안고 타락한다.`
      default: return `${who}은(는) 거짓을 내려놓고 필요인 ‘${need}’을(를) 끌어안는 사람으로 변화한다.`
    }
  })()
  return [
    `거짓 속 일상 — ${who}은(는) “${lie}”라는 거짓 신념 위에서 ‘${want}’을(를) 좇으며 산다.`,
    `욕망 발동 — 외적 사건이 ‘${want}’의 추구에 불을 붙여 표면 욕망이 전면에 나선다.`,
    `간극 심화 — 진짜 필요한 ‘${need}’와(과) 욕망이 충돌하며 ${who}을(를) 시험한다(${wound !== '—' ? `상처: ${wound}` : '간극이 벌어진다'}).`,
    `각성(≈${awk}%) — ${who}은(는) 거짓을 처음으로 의심하고 흔들린다.`,
    `결말 — ${end}`,
  ]
}

// 짝(pair) 충돌 → 장면 씨앗 문장.
function sceneSeed(a: Person, b: Person, score: number): string {
  const ta = dominantTheme(a.want), tb = dominantTheme(b.want)
  const same = ta && ta === tb
  const A = person(a.name), B = person(b.name)
  if (score >= 55 && same) {
    return `${A}와(과) ${B}은(는) 같은 ‘${ta}’을(를) 두고 정면으로 부딪힌다 — 한 명이 얻으면 다른 한 명이 잃는 제로섬 장면을 만들어라.`
  }
  if (score >= 55) {
    return `${A}의 ‘${dash(a.want)}’와(과) ${B}의 ‘${dash(b.want)}’가 양립할 수 없어 충돌한다 — 둘이 같은 목표물·같은 공간을 두고 마주서게 하라.`
  }
  if (score >= 30) {
    return `${A}와(과) ${B}은(는) 표면적으로 협력하지만 욕망의 결이 달라 긴장이 흐른다 — 작은 선택에서 균열이 드러나는 장면을 배치하라.`
  }
  return `${A}와(과) ${B}은(는) 직접 충돌이 약하다 — 한쪽의 필요(${dash(b.need)})를 건드리는 사건으로 갈등을 점화할 수 있다.`
}

// ───────── 영속 ─────────
function load(): { people: Person[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { people: [] }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.people) ? p.people : Array.isArray(p) ? p : []
    const people: Person[] = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
      id: str(x.id) || newId(),
      name: str(x.name), role: str(x.role), want: str(x.want), need: str(x.need),
      lie: str(x.lie), wound: str(x.wound),
      arc: (['positive', 'negative', 'flat', 'fall', 'corruption'].includes(str(x.arc)) ? str(x.arc) : 'positive') as Arc,
      intensity: Math.max(0, Math.min(100, num(x.intensity, 60))),
    }))
    return { people }
  } catch { return { people: [] } }
}

// ───────── 예시 캐스트(퍼블릭 도메인 고전 모델 요약) ─────────
const SAMPLE: Omit<Person, 'id'>[] = [
  { name: '맥베스', role: '주인공', want: '왕좌와 절대 권력을 쥐는 것', need: '야망을 다스리고 양심을 지키는 것', lie: '권력만이 나를 완성한다', wound: '예언이 일깨운 채워지지 않는 야망', arc: 'corruption', intensity: 90 },
  { name: '맥더프', role: '적대 세력', want: '폭군을 끌어내리고 정의를 세우는 것', need: '복수를 넘어선 회복', lie: '피로써만 바로잡을 수 있다', wound: '가족을 잃은 상처', arc: 'positive', intensity: 80 },
  { name: '레이디 맥베스', role: '공모자', want: '남편을 왕으로 만들어 권력을 함께 쥐는 것', need: '죄책감과 마주하고 인간성을 되찾는 것', lie: '결단력만 있으면 죄는 씻긴다', wound: '약함을 향한 깊은 두려움', arc: 'fall', intensity: 85 },
]

export default function CharacterWantNeed({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef(load())
  const [people, setPeople] = useState<Person[]>(initial.current.people)
  const [draft, setDraft] = useState<Person>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [tab, setTab] = useState<'cast' | 'matrix' | 'arc'>('cast')
  const [focusId, setFocusId] = useState<string | null>(null)  // 아크 탭에서 보는 인물
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

  // payload.character 1회 수용 — 새 인물 초안에 반영.
  useEffect(() => {
    const c = payload?.character as Record<string, unknown> | undefined
    if (c) {
      setDraft((p) => ({
        ...p,
        name: str(c.name) || p.name,
        role: str(c.role) || p.role,
        want: str(c.goal) || str(c.want) || p.want,
        need: str(c.value) || str(c.need) || p.need,
        lie: str(c.flaw) || str(c.lie) || str(c.misbelief) || p.lie,
        wound: str(c.background) || str(c.wound) || str(c.ghost) || p.wound,
        intensity: typeof c.intensity === 'number' && Number.isFinite(c.intensity)
          ? Math.max(0, Math.min(100, c.intensity)) : p.intensity,
        arc: (['positive', 'negative', 'flat', 'fall', 'corruption'].includes(str(c.arc)) ? str(c.arc) : p.arc) as Arc,
      }))
    }
    const t = payload?.text
    if (typeof t === 'string' && t.trim()) {
      setDraft((p) => ({ ...p, want: p.want || t.trim().slice(0, 120) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ people, v: 1 })) }
    catch { if (mounted.current) flash('저장이 막혀 새로고침 시 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }
  const set = <K extends keyof Person>(k: K, v: Person[K]) => setDraft((p) => ({ ...p, [k]: v }))

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

  const hasInput = !!(draft.name || draft.want || draft.need || draft.lie || draft.wound || draft.role)

  const clearDraft = () => { setDraft(blank()); setEditId(null) }
  const saveDraft = () => {
    if (!draft.name.trim() && !draft.want.trim() && !draft.need.trim()) { flash('이름, 또는 욕망·필요 중 하나는 입력해 주세요.'); return }
    if (editId) {
      setPeople((p) => p.map((x) => (x.id === editId ? { ...draft, id: editId } : x)))
      flash('인물을 수정했습니다.')
    } else {
      const rec = { ...draft, id: newId() }
      setPeople((p) => [...p, rec])
      setFocusId(rec.id)
      flash(`‘${person(rec.name)}’을(를) 캐스트에 추가했습니다.`)
    }
    setDraft(blank()); setEditId(null)
  }
  const editPerson = (p: Person) => { setDraft({ ...p }); setEditId(p.id); setTab('cast'); flash(`‘${person(p.name)}’ 편집 중`) }
  const removePerson = (id: string) => {
    setPeople((p) => p.filter((x) => x.id !== id))
    if (editId === id) clearDraft()
    if (focusId === id) setFocusId(null)
  }
  const loadSample = () => {
    setPeople(SAMPLE.map((s) => ({ ...s, id: newId() })))
    setTab('matrix')
    flash('예시 캐스트(맥베스 모델)를 불러왔습니다.')
  }

  // 라이브러리/드롭/캐릭터 → 인물.
  const personFromShared = (c: SharedCharacter): Person => {
    const f = c.fields || {}
    const t = (label: string) => c.traits?.find((x) => x.k === label)?.v || ''
    return {
      id: newId(),
      name: c.name || '',
      role: c.role || f.role || '',
      want: c.goal || f.goal || t('욕망') || t('욕구') || '',
      need: f.value || t('필요') || '',
      lie: f.flaw || t('거짓 신념') || t('거짓믿음') || '',
      wound: f.background || t('상처') || '',
      arc: 'positive', intensity: 60,
    }
  }
  const addFromChar = (c: SharedCharacter) => {
    const rec = personFromShared(c)
    setPeople((p) => (p.some((x) => x.name === rec.name && rec.name) ? p : [...p, rec]))
    flash(`라이브러리 인물 ‘${c.name}’을(를) 캐스트에 추가했습니다.`)
  }
  const importAll = () => {
    const add = characters.map(personFromShared).filter((r) => !people.some((p) => p.name === r.name && r.name))
    if (!add.length) { flash('새로 추가할 라이브러리 인물이 없습니다.'); return }
    setPeople((p) => [...p, ...add])
    setTab('matrix')
    flash(`라이브러리 인물 ${add.length}명을 캐스트에 추가했습니다.`)
  }
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch = item.character || {}
    const rec: Person = {
      id: newId(),
      name: item.title || ch.name || '',
      role: ch.role || '',
      want: ch.goal || ch.want || '',
      need: ch.value || ch.need || '',
      lie: ch.flaw || ch.lie || ch.misbelief || '',
      wound: ch.background || ch.wound || ch.ghost || '',
      arc: 'positive', intensity: 60,
    }
    setPeople((p) => [...p, rec])
    flash(`바인더 파일 ‘${item.title}’을(를) 캐스트에 추가했습니다.`)
  }

  // ───────── 파생 계산 ─────────
  const filled = useMemo(() => people.filter((p) => p.want.trim() || p.need.trim() || p.name.trim()), [people])
  const tensions = useMemo(() => Object.fromEntries(people.map((p) => [p.id, innerTension(p)])), [people])

  // 충돌 점수 맵(키 a.id|b.id, 양방향) — 매트릭스 셀/짝 목록이 공유해 이중 계산 제거.
  const scoreMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        const s = clashScore(people[i], people[j])
        m[people[i].id + '|' + people[j].id] = s
        m[people[j].id + '|' + people[i].id] = s
      }
    return m
  }, [people])
  const scoreOf = (a: Person, b: Person): number => scoreMap[a.id + '|' + b.id] ?? clashScore(a, b)

  // 충돌 매트릭스 + 가장 뜨거운 짝들.
  const pairs = useMemo(() => {
    const out: { a: Person; b: Person; score: number }[] = []
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++) {
        out.push({ a: people[i], b: people[j], score: scoreMap[people[i].id + '|' + people[j].id] ?? clashScore(people[i], people[j]) })
      }
    return out.sort((x, y) => y.score - x.score)
  }, [people, scoreMap])
  const hottest = pairs[0]

  // ───────── 연계 ─────────
  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fieldsOf = (p: Person): Record<string, string> => {
    const f: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = (v || '').trim(); if (t) f[k] = t }
    put('name', person(p.name)); put('role', p.role)
    put('goal', p.want); put('value', p.need); put('flaw', p.lie); put('background', p.wound)
    f.arc = beatLines(p).join('\n')
    return f
  }
  const toLibrary = (p: Person) => {
    addToLibrary('characters', {
      name: person(p.name), role: p.role.trim() || undefined, goal: p.want.trim() || undefined,
      traits: [
        { k: '욕망', v: p.want }, { k: '필요', v: p.need }, { k: '거짓 신념', v: p.lie }, { k: '상처', v: p.wound },
      ].filter((x) => x.v.trim()),
      fields: fieldsOf(p),
      notes: beatLines(p).join('\n'),
      source: '욕망·필요 엔진',
    })
    flash(`‘${person(p.name)}’을(를) 인물 라이브러리에 저장했습니다.`)
  }
  const toProjectDoc = (p: Person) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const row = (l: string, v: string) => `<p><b>${escapeHtml(l)}:</b> ${escapeHtml(dash(v))}</p>`
    const beats = beatLines(p).map((b) => `<li style="margin-bottom:6px;line-height:1.7">${escapeHtml(b)}</li>`).join('')
    const bodyHtml = [
      `<p><b>표면 욕망 vs 내면 필요</b> — 내적 간극 ${tensions[p.id]} (${tensionLabel(tensions[p.id])}) · 아크 ${ARC_LABEL(p.arc)}</p><hr/>`,
      row('표면 욕망 (Want)', p.want), row('내면 필요 (Need)', p.need),
      row('거짓 신념 (Lie)', p.lie), row('상처 (Wound)', p.wound),
      `<h4>5단계 아크 비트</h4><ol>${beats}</ol>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: `${person(p.name)} — 욕망·필요 아크`, bodyHtml })
    flash(id ? '프로젝트 ‘자료 › 인물’에 아크 문서를 추가했습니다.' : '추가하지 못했습니다.')
  }
  const toProjectCard = (p: Person) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: person(p.name),
      character: { ...fieldsOf(p), name: person(p.name), role: p.role.trim() || '-', goal: p.want.trim() || '-', conflict: `필요: ${dash(p.need)} · 거짓 신념: ${dash(p.lie)}` },
      synopsis: beatLines(p)[4],
      meta: { 욕망: dash(p.want), 필요: dash(p.need), '거짓 신념': dash(p.lie), 상처: dash(p.wound), 아크: ARC_LABEL(p.arc), '내적 간극': `${tensions[p.id]} (${tensionLabel(tensions[p.id])})` },
    })
    flash(id ? `프로젝트 ‘자료 › 인물’에 ‘${person(p.name)}’ 카드를 추가했습니다.` : '추가하지 못했습니다.')
  }
  const toGmc = (p: Person) => {
    openToolLinked('gmc-chart', { character: { name: p.name, role: p.role, goal: p.want, value: p.need, flaw: p.lie, background: p.wound, fields: fieldsOf(p) } })
    flash('GMC 차트로 보냈습니다.')
  }
  const toWantVsNeed = (p: Person) => {
    openToolLinked('want-vs-need', { character: { name: p.name, role: p.role, want: p.want, need: p.need, lie: p.lie, wound: p.wound, ghost: p.wound, goal: p.want } })
    flash('욕구 vs 필요(단일 아크)로 보냈습니다.')
  }
  const toRelationMap = () => {
    openToolLinked('relationship-map', { characters: people.map((p) => ({ name: person(p.name), role: p.role, goal: p.want })) })
    flash('관계도로 보냈습니다.')
  }
  const pairToScene = (a: Person, b: Person, score: number) => {
    const seed = sceneSeed(a, b, score)
    openToolLinked('scene-forge', { conflict: seed, characters: [person(a.name), person(b.name)] })
    flash('장면 도구로 충돌 씨앗을 보냈습니다.')
  }
  const stashPair = (a: Person, b: Person, score: number) => {
    addToStash({ kind: 'memo', label: `${person(a.name)} ↔ ${person(b.name)} 충돌`, text: `[${clashLabel(score)} ${score}] ${sceneSeed(a, b, score)}` })
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

  // 색: 점수→색.
  const heat = (s: number): string =>
    s >= 75 ? 'var(--warn)' : s >= 55 ? 'color-mix(in srgb, var(--warn) 70%, var(--accent))' : s >= 35 ? 'var(--accent)' : s >= 15 ? 'color-mix(in srgb, var(--accent) 40%, var(--chrome-2))' : 'var(--chrome-2)'

  const TensionBar = ({ g, compact }: { g: number; compact?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: compact ? 7 : 10, borderRadius: 6, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ width: `${g}%`, height: '100%', background: g >= 60 ? 'linear-gradient(90deg, var(--accent), var(--warn))' : 'var(--accent)' }} />
      </div>
      <span style={{ fontSize: compact ? 10 : 11, color: 'var(--muted)', minWidth: 30, textAlign: 'right' }}>{g}</span>
    </div>
  )

  const focus = focusId ? people.find((p) => p.id === focusId) || null : (filled[0] || null)

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>욕망 · 필요 엔진</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>표면 욕망 ↔ 내면 필요 · 충돌 매트릭스 · 아크 자동 설계</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {(['cast', 'matrix', 'arc'] as const).map((t) => (
            <button key={t} className={tab === t ? 'btn-primary' : 'minibtn'} style={{ fontSize: 11.5 }} onClick={() => setTab(t)}>
              {t === 'cast' ? '캐스트' : t === 'matrix' ? '충돌 매트릭스' : '아크 설계'}
            </button>
          ))}
        </div>
      </div>

      <div style={body}>
        {note && <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px' }}>{note}</div>}

        {/* ───────── 캐스트 탭 ───────── */}
        {tab === 'cast' && (
          <>
            {(characters.length > 0 || people.length === 0) && (
              <div style={card}>
                <h4 style={sTitle}>시작하기</h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: characters.length ? 8 : 0 }}>
                  <button className="minibtn" onClick={loadSample}>예시 캐스트(맥베스 모델)</button>
                  {characters.length > 0 && <button className="minibtn" onClick={importAll}>라이브러리 인물 전체 가져오기 ({characters.length})</button>}
                </div>
                {characters.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {characters.slice(0, 16).map((c) => (
                      <button key={c.id} className="minibtn" style={{ fontSize: 11.5 }} onClick={() => addFromChar(c)} title="이 인물을 캐스트에 추가">＋ {c.name || '이름 없음'}</button>
                    ))}
                  </div>
                )}
                <div style={{ ...hint, marginTop: 8 }}>좌측 바인더의 인물 파일을 이 창에 끌어다 놓아도 캐스트에 추가됩니다.</div>
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
                  <div><label style={fLabel}>역할</label><input style={input} value={draft.role} onChange={(e) => set('role', e.target.value)} placeholder="예: 주인공 / 적대자" maxLength={40} /></div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ ...fLabel, color: 'var(--accent)' }}>표면 욕망 (Want)</label>
                    <span style={fHint}>의식적으로 좇는 외적 목표 — 플롯이 따라가는 것</span>
                    <textarea style={ta} value={draft.want} onChange={(e) => set('want', e.target.value)} placeholder="예: 왕좌와 권력을 손에 넣는 것" maxLength={280} />
                  </div>
                  <div>
                    <label style={{ ...fLabel, color: 'var(--ok)' }}>내면 필요 (Need)</label>
                    <span style={fHint}>무의식적으로 결핍된 것 — 욕망과 충돌해야 함</span>
                    <textarea style={ta} value={draft.need} onChange={(e) => set('need', e.target.value)} placeholder="예: 야망을 다스리고 양심을 지키는 것" maxLength={280} />
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ ...fLabel, color: 'var(--warn)' }}>거짓 신념 (Lie)</label>
                    <span style={fHint}>욕망을 떠받치고 필요를 가로막는 잘못된 믿음</span>
                    <textarea style={ta} value={draft.lie} onChange={(e) => set('lie', e.target.value)} placeholder="예: 권력만이 나를 완성한다" maxLength={280} />
                  </div>
                  <div>
                    <label style={fLabel}>상처 / 유령 (Wound)</label>
                    <span style={fHint}>거짓 신념이 생긴 과거의 사건</span>
                    <textarea style={ta} value={draft.wound} onChange={(e) => set('wound', e.target.value)} placeholder="예: 채워지지 않는 어린 시절의 결핍" maxLength={280} />
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
                    <label style={fLabel}>욕망 집착 강도: <b style={{ color: 'var(--accent)' }}>{draft.intensity}</b></label>
                    <input type="range" min={0} max={100} value={draft.intensity} onChange={(e) => set('intensity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    <span style={fHint}>강할수록 외적 충돌과 내적 간극이 커집니다.</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={saveDraft}>{editId ? '수정 저장' : '캐스트에 추가'}</button>
                {editId && <button className="minibtn" onClick={clearDraft}>새 인물로</button>}
              </div>
            </div>

            {/* 캐스트 목록 */}
            <div style={card}>
              <h4 style={sTitle}>캐스트 · {people.length}명</h4>
              {people.length === 0 ? (
                <div style={emptyBox}>
                  아직 인물이 없습니다.<br />위에서 <b>표면 욕망</b>과 <b>내면 필요</b>를 입력해 추가하거나,<br />
                  <b>예시 캐스트</b> / <b>라이브러리 가져오기</b> / 바인더 파일 드롭으로 시작하세요.<br />
                  <span style={{ fontSize: 11.5 }}>2명 이상이면 <b>충돌 매트릭스</b>가 활성화됩니다.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {people.map((p) => (
                    <div key={p.id} style={{ background: 'var(--chrome-2)', border: '1px solid ' + (editId === p.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 13.5 }}>{person(p.name)}</b>
                        {p.role.trim() && <span style={tag}>{p.role}</span>}
                        <span style={tag}>{ARC_LABEL(p.arc)}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                          <button style={iconBtn} title="아크 설계 보기" onClick={() => { setFocusId(p.id); setTab('arc') }}>아크</button>
                          <button style={iconBtn} title="편집" onClick={() => editPerson(p)}>편집</button>
                          <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removePerson(p.id)}>삭제</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                        <span><b style={{ color: 'var(--accent)' }}>욕망</b> {dash(p.want)}</span>
                        <span style={{ color: 'var(--muted)' }}>vs</span>
                        <span><b style={{ color: 'var(--ok)' }}>필요</b> {dash(p.need)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 52 }}>내적 간극</span>
                        <div style={{ flex: 1 }}><TensionBar g={tensions[p.id] || 0} compact /></div>
                        <span style={{ ...tag, borderColor: heat(tensions[p.id] || 0) }}>{tensionLabel(tensions[p.id] || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ───────── 충돌 매트릭스 탭 ───────── */}
        {tab === 'matrix' && (
          filled.length < 2 ? (
            <div style={card}><div style={emptyBox}>충돌 매트릭스는 <b>욕망이 입력된 인물 2명 이상</b>일 때 활성화됩니다.<br />‘캐스트’ 탭에서 인물을 더 추가하세요.</div></div>
          ) : (
            <>
              <div style={card}>
                <h4 style={sTitle}>욕망 충돌 매트릭스 — 인물 × 인물</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: 4, border: '1px solid var(--border)', background: 'var(--chrome-2)', position: 'sticky', left: 0 }}></th>
                        {filled.map((c) => (
                          <th key={c.id} style={{ padding: '4px 6px', border: '1px solid var(--border)', background: 'var(--chrome-2)', writingMode: 'vertical-rl', whiteSpace: 'nowrap', maxHeight: 90 }}>{person(c.name)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filled.map((r) => (
                        <tr key={r.id}>
                          <th style={{ padding: '4px 8px', border: '1px solid var(--border)', background: 'var(--chrome-2)', textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', left: 0 }}>{person(r.name)}</th>
                          {filled.map((c) => {
                            if (r.id === c.id) return <td key={c.id} style={{ border: '1px solid var(--border)', background: 'var(--border)', textAlign: 'center', color: 'var(--muted)' }}>—</td>
                            const s = scoreOf(r, c)
                            return (
                              <td key={c.id} title={`${person(r.name)} ↔ ${person(c.name)}: ${clashLabel(s)} (${s})`}
                                style={{ border: '1px solid var(--border)', background: heat(s), color: s >= 35 ? '#fff' : 'var(--muted)', textAlign: 'center', fontWeight: 700, minWidth: 32, height: 26 }}>{s}</td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ ...hint, marginTop: 8 }}>숫자는 두 인물의 표면 욕망이 부딪히는 정도(0~100). 같은 주제(권력·사랑·인정 등)를 노리고 집착이 강할수록 높습니다.</div>
              </div>

              <div style={card}>
                <h4 style={sTitle}>가장 뜨거운 갈등 — 장면으로 만들기</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {pairs.slice(0, 6).map(({ a, b, score }) => (
                    <div key={a.id + b.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 12.5 }}>{person(a.name)} ↔ {person(b.name)}</b>
                        <span style={{ ...tag, color: '#fff', background: heat(score), borderColor: heat(score) }}>{clashLabel(score)} {score}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                          <button style={iconBtn} title="복사" onClick={() => copy(sceneSeed(a, b, score), 'p' + a.id + b.id)}>{copied === 'p' + a.id + b.id ? '복사됨' : '복사'}</button>
                          <button style={iconBtn} title="장면 도구로" onClick={() => pairToScene(a, b, score)}>장면</button>
                          {hasStash() && <button style={iconBtn} title="수집함" onClick={() => stashPair(a, b, score)}>수집함</button>}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'keep-all' }}>{sceneSeed(a, b, score)}</div>
                    </div>
                  ))}
                </div>
                <div className="linkbar" style={{ marginTop: 10 }}>
                  <span className="linkbar-label">연동:</span>
                  <button className="linkbtn" onClick={toRelationMap}>관계도로 보내기</button>
                </div>
              </div>
            </>
          )
        )}

        {/* ───────── 아크 설계 탭 ───────── */}
        {tab === 'arc' && (
          !focus ? (
            <div style={card}><div style={emptyBox}>아크를 설계할 인물이 없습니다.<br />‘캐스트’ 탭에서 인물을 추가한 뒤 다시 열어 주세요.</div></div>
          ) : (
            <>
              <div style={card}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {filled.map((p) => (
                    <button key={p.id} className={focus.id === p.id ? 'btn-primary' : 'minibtn'} style={{ fontSize: 11.5 }} onClick={() => setFocusId(p.id)}>{person(p.name)}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <b style={{ fontSize: 14 }}>{person(focus.name)}</b>
                  {focus.role.trim() && <span style={tag}>{focus.role}</span>}
                  <span style={tag}>{ARC_LABEL(focus.arc)}</span>
                  <span style={{ ...tag, marginLeft: 'auto', borderColor: heat(tensions[focus.id] || 0) }}>내적 간극 {tensions[focus.id]} · {tensionLabel(tensions[focus.id] || 0)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12.5, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span><b style={{ color: 'var(--accent)' }}>욕망</b> {dash(focus.want)}</span>
                  <span style={{ color: 'var(--muted)' }}>vs</span>
                  <span><b style={{ color: 'var(--ok)' }}>필요</b> {dash(focus.need)}</span>
                </div>

                {/* 5비트 아크 트랙 */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {BEATS.map((b, i) => {
                    const isAwk = b === '각성', isEnd = b === '결말'
                    return (
                      <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, background: isEnd ? heat(70) : isAwk ? 'var(--ok)' : `color-mix(in srgb, var(--accent) ${18 + i * 16}%, var(--chrome-2))` }} />
                        <span style={{ fontSize: 9.5, color: isAwk || isEnd ? 'var(--text)' : 'var(--muted)', fontWeight: isAwk || isEnd ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                          {b}{isAwk ? ` ${awakeningPos(focus)}%` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 비트 카드 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {beatLines(focus).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ flex: '0 0 auto', width: 20, height: 20, borderRadius: '50%', background: BEATS[i] === '각성' ? 'var(--ok)' : BEATS[i] === '결말' ? heat(70) : 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <div style={{ fontSize: 12.5, lineHeight: 1.65, wordBreak: 'keep-all' }}>{line}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={para}>{beatLines(focus).join('\n')}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(beatLines(focus).join('\n'), 'arc' + focus.id)}>{copied === 'arc' + focus.id ? '복사됨' : '아크 복사'}</button>
                  <button className="minibtn" onClick={() => editPerson(focus)}>이 인물 편집</button>
                </div>

                <div className="linkbar" style={{ marginTop: 12 }}>
                  <span className="linkbar-label">연동:</span>
                  <button className="linkbtn" onClick={() => toProjectCard(focus)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 카드' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트 인물 카드</button>
                  <button className="linkbtn" onClick={() => toProjectDoc(focus)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 아크 문서' : '프로젝트에 연결되어 있지 않습니다'}>아크 문서</button>
                  <button className="linkbtn" onClick={() => toLibrary(focus)}>인물 라이브러리</button>
                  <button className="linkbtn" onClick={() => toGmc(focus)}>GMC 차트로</button>
                  <button className="linkbtn" onClick={() => toWantVsNeed(focus)}>욕구 vs 필요로</button>
                  {hasStash() && <button className="linkbtn" onClick={() => { addToStash({ kind: 'memo', label: `${person(focus.name)} 아크`, text: beatLines(focus).join('\n') }); flash('수집함에 담았습니다.') }}>수집함</button>}
                </div>
              </div>
            </>
          )
        )}

        <div style={hint}>
          <b>표면 욕망(Want)</b>은 인물이 의식적으로 좇는 외적 목표로 플롯을 움직이고, <b>내면 필요(Need)</b>는 진짜로 결핍된 내적 성장입니다.
          둘의 <b>간극</b>을 떠받치는 <b>거짓 신념(Lie)</b>은 과거의 <b>상처</b>에서 옵니다. 인물 사이의 욕망이 부딪히면 외적 충돌이, 욕망과 필요가 어긋나면 내적 갈등이 생깁니다.
          모든 점수는 입력에 따라 결정론적으로 계산되며 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
