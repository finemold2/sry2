// 가상언어 대장간(Conlang Forge) — 음운 목록·음절 구조·소리 변화 규칙으로 일관된 조어를 만들고,
//   의미장(semantic field) 매핑으로 작품 세계의 렉시콘(어휘 사전)을 구축한다.
// 핵심:
//   1) 음운 인벤토리: 자음/모음 묶음을 토글해 선택(프리셋도 제공). 선택된 소리만 단어 재료가 된다.
//   2) 음절 구조: C(자음)/V(모음)/N(비음코다)/S(치찰코다) 토큰으로 음절 틀을 설계(예: CV, CVC, CVN).
//   3) 소리 변화 규칙: "찾기>바꾸기" 치환을 순서대로 적용(예: kk>k, ai>e). 결과가 자연스러워진다.
//   4) 의미장: 단어가 필요한 한국어 개념 목록 → 개념별 결정론적 단어 생성(시드=언어명+개념).
//      같은 설정이면 항상 같은 단어 → "일관된 언어". 음절 수도 개념 길이에 따라 결정.
//   5) 로마자 표기 + (옵션) 한글 근사 표기를 함께 출력.
// 모든 산출물은 연동: 스니펫(렉시콘 행), 프로젝트 자료 〈언어〉 폴더의 사전 문서, 수집함, 관련 도구 열기, 장소(문화요소).
// 입력은 좌측 바인더 문서 드롭(원고 텍스트에서 명사 후보 추출) 또는 payload.text 로도 받는다.
// import 는 react 와 './linkbus' 만 사용한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToLibrary,
  useLibraryList,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'conlang-forge',
  name: '가상언어 대장간',
  icon: '🔤',
  group: '세계관',
  intro: '음운·음절·소리변화로 일관된 조어를 만들고 의미장 렉시콘을 구축하세요',
  w: 480,
  h: 640,
}

const LS_KEY = 'sry:tool:conlang-forge'

// ── 소리 재료(IPA 대신 로마자 표기). 묶음 단위로 켜고 끈다. ──
interface SoundGroup { id: string; label: string; sounds: string[] }
const CONSONANT_GROUPS: SoundGroup[] = [
  { id: 'stopVoiceless', label: '무성 파열음', sounds: ['p', 't', 'k'] },
  { id: 'stopVoiced', label: '유성 파열음', sounds: ['b', 'd', 'g'] },
  { id: 'fricative', label: '마찰음', sounds: ['f', 's', 'sh', 'h', 'v', 'z'] },
  { id: 'nasal', label: '비음', sounds: ['m', 'n', 'ng'] },
  { id: 'liquid', label: '유음', sounds: ['l', 'r'] },
  { id: 'glide', label: '반모음', sounds: ['w', 'y'] },
  { id: 'affricate', label: '파찰음', sounds: ['ch', 'j', 'ts'] },
  { id: 'exotic', label: '이질적', sounds: ['q', 'x', 'th', 'gh', 'kh'] },
  { id: 'sibilantExtra', label: '치찰·파찰(확장)', sounds: ['zh', 'dz'] },
  { id: 'aspirate', label: '유기음', sounds: ['ph', 'kw', 'gw'] },
  { id: 'breathy', label: '유성유기음', sounds: ['bh', 'dh'] },
  { id: 'lateral', label: '설측·접근음', sounds: ['tl', 'hl', 'hr'] },
]
const VOWEL_GROUPS: SoundGroup[] = [
  { id: 'basic', label: '기본 모음', sounds: ['a', 'i', 'u'] },
  { id: 'mid', label: '중모음', sounds: ['e', 'o'] },
  { id: 'long', label: '장모음', sounds: ['aa', 'ii', 'uu', 'ee', 'oo'] },
  { id: 'extra', label: '추가 모음', sounds: ['ae', 'oe', 'au', 'ei'] },
  { id: 'diph', label: '이중 모음', sounds: ['ai', 'eo', 'ia', 'ua'] },
  { id: 'central', label: '중설·원순 모음', sounds: ['eu', 'oa'] },
]

// 로마자 -> 한글 근사 표기(완벽한 음운 변환이 아니라 "느낌" 표기). 긴 키부터 매칭.
const HANGUL_MAP: Array<[string, string]> = [
  ['sh', '쉬'], ['ch', '치'], ['ng', '응'], ['ts', '츠'], ['th', '쓰'], ['gh', '그'], ['kh', '크'],
  ['zh', '지'], ['dz', '즈'], ['ph', '프'], ['kw', '쿠'], ['gw', '구'], ['bh', '브'], ['dh', '드'], ['tl', '틀'], ['hl', '흘'], ['hr', '흐르'],
  ['aa', '아'], ['ii', '이'], ['uu', '우'], ['ee', '에'], ['oo', '오'], ['ae', '애'], ['oe', '외'], ['au', '아우'], ['ei', '에이'],
  ['ai', '아이'], ['eo', '어'], ['ia', '이아'], ['ua', '우아'], ['eu', '으'], ['oa', '오아'],
  ['p', '프'], ['b', '브'], ['t', '트'], ['d', '드'], ['k', '크'], ['g', '그'],
  ['f', '프'], ['s', '스'], ['h', '흐'], ['v', '브'], ['z', '즈'],
  ['m', '므'], ['n', '느'], ['l', '르'], ['r', '르'], ['w', '우'], ['y', '이'],
  ['j', '즈'], ['q', '크'], ['x', '크'],
  ['a', '아'], ['i', '이'], ['u', '우'], ['e', '에'], ['o', '오'],
]

// 프리셋: 톤이 다른 언어 세 종류.
interface Preset {
  id: string; label: string; desc: string
  cons: string[]; vow: string[]; pattern: string; rules: string
}
const PRESETS: Preset[] = [
  {
    id: 'elvish', label: '유려한(엘프풍)', desc: '유음·장모음 풍부, 부드러움',
    cons: ['stopVoiceless', 'nasal', 'liquid', 'glide'], vow: ['basic', 'mid', 'long'],
    pattern: 'CV CVV CVN', rules: 'kk>k\ntt>t',
  },
  {
    id: 'harsh', label: '거친(드워프풍)', desc: '폐쇄음·이질음, 묵직함',
    cons: ['stopVoiceless', 'stopVoiced', 'fricative', 'nasal', 'exotic'], vow: ['basic', 'mid'],
    pattern: 'CVC CVCC CV', rules: 'ii>i\nuu>u',
  },
  {
    id: 'sibilant', label: '음험한(파충류풍)', desc: '마찰음·치찰음 중심',
    cons: ['fricative', 'affricate', 'liquid', 'nasal'], vow: ['basic', 'extra'],
    pattern: 'CV CVS SCV', rules: 'ss>s\nshsh>sh',
  },
]

// 의미장(semantic field) 프리셋 — 작품 세계에 자주 필요한 개념 묶음.
interface Field { id: string; label: string; concepts: string[] }
const FIELDS: Field[] = [
  { id: 'nature', label: '자연·원소', concepts: ['물', '불', '바람', '땅', '하늘', '바다', '산', '숲', '강', '돌', '나무', '별', '달', '해', '비', '눈'] },
  { id: 'kin', label: '사람·관계', concepts: ['사람', '왕', '어머니', '아버지', '아이', '친구', '적', '전사', '사제', '이방인', '연인', '스승'] },
  { id: 'body', label: '몸·감각', concepts: ['눈', '손', '심장', '피', '뼈', '목소리', '꿈', '영혼', '숨', '죽음', '삶'] },
  { id: 'abstract', label: '추상·가치', concepts: ['사랑', '죽음', '명예', '진실', '거짓', '두려움', '희망', '시간', '운명', '힘', '자유', '기억'] },
  { id: 'greeting', label: '인사·기초', concepts: ['안녕', '고맙다', '미안하다', '그렇다', '아니다', '하나', '둘', '셋', '크다', '작다', '오다', '가다'] },
]

// ── 결정론적 의사난수: 문자열 해시 시드 → mulberry32 ──
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rnd: () => number, arr: T[]): T { return arr[Math.floor(rnd() * arr.length) % arr.length] }

interface State {
  name: string
  consGroups: Record<string, boolean>
  vowGroups: Record<string, boolean>
  pattern: string
  rules: string
  useHangul: boolean
  fieldId: string
  customConcepts: string
  lexicon: LexEntry[]
}
interface LexEntry { concept: string; word: string; hangul: string }

function defaultState(): State {
  const p = PRESETS[0]
  return {
    name: '엘다린',
    consGroups: Object.fromEntries(CONSONANT_GROUPS.map((g) => [g.id, p.cons.includes(g.id)])),
    vowGroups: Object.fromEntries(VOWEL_GROUPS.map((g) => [g.id, p.vow.includes(g.id)])),
    pattern: p.pattern,
    rules: p.rules,
    useHangul: true,
    fieldId: 'nature',
    customConcepts: '',
    lexicon: [],
  }
}

function loadState(): State {
  const d = defaultState()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return d
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return d
    return {
      name: typeof p.name === 'string' ? p.name : d.name,
      consGroups: { ...d.consGroups, ...(p.consGroups && typeof p.consGroups === 'object' ? p.consGroups : {}) },
      vowGroups: { ...d.vowGroups, ...(p.vowGroups && typeof p.vowGroups === 'object' ? p.vowGroups : {}) },
      pattern: typeof p.pattern === 'string' ? p.pattern : d.pattern,
      rules: typeof p.rules === 'string' ? p.rules : d.rules,
      useHangul: typeof p.useHangul === 'boolean' ? p.useHangul : d.useHangul,
      fieldId: typeof p.fieldId === 'string' ? p.fieldId : d.fieldId,
      customConcepts: typeof p.customConcepts === 'string' ? p.customConcepts : d.customConcepts,
      lexicon: Array.isArray(p.lexicon)
        ? (p.lexicon as unknown[])
            .filter((x): x is LexEntry => !!x && typeof (x as LexEntry).word === 'string' && typeof (x as LexEntry).concept === 'string')
            .map((x) => ({ concept: x.concept, word: x.word, hangul: typeof x.hangul === 'string' ? x.hangul : '' }))
            .slice(0, 500)
        : [],
    }
  } catch {
    return d
  }
}

// 패턴 토큰 해석: C=자음, V=모음, N=비음 코다, S=치찰 코다, 그 외 글자=리터럴
function parsePatterns(pattern: string): string[] {
  return pattern.split(/[\s,/|]+/).map((s) => s.trim()).filter(Boolean)
}

// 소리 변화 규칙 파싱: 한 줄당 "찾기>바꾸기"(또는 →). 빈 바꾸기 = 삭제.
function parseRules(rules: string): Array<[string, string]> {
  return rules.split(/\n/).map((ln) => {
    const m = ln.split(/>|→/)
    if (m.length < 2) return null
    const from = m[0].trim()
    const to = m.slice(1).join('>').trim()
    if (!from) return null
    return [from, to] as [string, string]
  }).filter((x): x is [string, string] => x !== null)
}
function applyRules(word: string, rules: Array<[string, string]>): string {
  let w = word
  for (const [from, to] of rules) {
    if (!from) continue
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    try { w = w.replace(new RegExp(esc, 'g'), to) } catch { /* noop */ }
  }
  return w
}

function romanToHangul(word: string): string {
  let w = word.toLowerCase()
  let out = ''
  let guard = 0
  while (w.length && guard++ < 200) {
    let matched = false
    for (const [k, v] of HANGUL_MAP) {
      if (w.startsWith(k)) { out += v; w = w.slice(k.length); matched = true; break }
    }
    if (!matched) { out += w[0]; w = w.slice(1) }
  }
  return out
}

// 핵심: 개념(시드) + 음운/패턴/규칙으로 한 단어를 결정론적으로 생성.
function makeWord(
  concept: string,
  langName: string,
  cons: string[],
  vow: string[],
  sibilants: string[],
  nasals: string[],
  patterns: string[],
  rules: Array<[string, string]>,
): string {
  if (!cons.length || !vow.length || !patterns.length) return ''
  const rnd = mulberry32(hashStr(langName + '::' + concept))
  const base = Math.max(1, Math.min(3, Math.ceil(concept.length / 2)))
  const sylCount = base + (rnd() < 0.3 ? 1 : 0)
  let word = ''
  for (let i = 0; i < sylCount; i++) {
    const tmpl = pick(rnd, patterns)
    for (const ch of tmpl) {
      if (ch === 'C') word += pick(rnd, cons)
      else if (ch === 'V') word += pick(rnd, vow)
      else if (ch === 'N') word += nasals.length ? pick(rnd, nasals) : pick(rnd, cons)
      else if (ch === 'S') word += sibilants.length ? pick(rnd, sibilants) : pick(rnd, cons)
      else word += ch.toLowerCase()
    }
  }
  word = applyRules(word, rules)
  if (!word) word = pick(rnd, cons) + pick(rnd, vow)
  return word
}

// 한국어/영문 텍스트에서 명사 후보(개념)를 거칠게 추출 — 조사 제거 + 길이/빈도 필터.
function extractConcepts(text: string): string[] {
  const PARTICLES = ['으로', '에서', '에게', '한테', '부터', '까지', '처럼', '보다', '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '만']
  const STOP = new Set(['그리고', '하지만', '그러나', '그래서', '그런데', '있다', '없다', '하다', '되다', '이다', '나는', '너는', '우리', '그것', '저것', '이것'])
  const raw = text
    .replace(/[^가-힣a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
  const freq = new Map<string, number>()
  for (let w of raw) {
    if (/[가-힣]/.test(w)) {
      for (const p of PARTICLES) {
        if (w.length > p.length + 1 && w.endsWith(p)) { w = w.slice(0, -p.length); break }
      }
    } else {
      w = w.toLowerCase()
    }
    if (w.length < 2 || STOP.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, 16)
    .map(([w]) => w)
}

export default function ConlangForge({ payload }: { payload?: Record<string, unknown> }) {
  const [st, setSt] = useState<State>(() => loadState())
  const [note, setNote] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const snippets = useLibraryList('snippets')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)) }
    catch { if (mounted.current) flash('저장이 막혀 새로고침 시 내용이 사라질 수 있어요.') }
  }, [st])

  // payload.text 로 들어온 텍스트에서 명사 후보를 뽑아 커스텀 개념란에 넣는다.
  useEffect(() => {
    if (payloadDone.current) return
    const t = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (!t) return
    payloadDone.current = true
    const words = extractConcepts(t)
    if (words.length) {
      setSt((p) => ({ ...p, customConcepts: words.join(', ') }))
      flash(`받은 글에서 개념 ${words.length}개를 추출했어요.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  // ── 활성 음운 집합 계산 ──
  const consAll = useMemo(() => {
    const out: string[] = []
    for (const g of CONSONANT_GROUPS) if (st.consGroups[g.id]) out.push(...g.sounds)
    return Array.from(new Set(out))
  }, [st.consGroups])
  const vowAll = useMemo(() => {
    const out: string[] = []
    for (const g of VOWEL_GROUPS) if (st.vowGroups[g.id]) out.push(...g.sounds)
    return Array.from(new Set(out))
  }, [st.vowGroups])
  const nasals = useMemo(() => consAll.filter((c) => ['m', 'n', 'ng'].includes(c)), [consAll])
  const sibilants = useMemo(() => consAll.filter((c) => ['s', 'sh', 'z', 'ts', 'ch', 'zh', 'dz'].includes(c)), [consAll])
  const patterns = useMemo(() => parsePatterns(st.pattern), [st.pattern])
  const rules = useMemo(() => parseRules(st.rules), [st.rules])

  const concepts = useMemo(() => {
    const field = FIELDS.find((f) => f.id === st.fieldId)
    const fromField = field ? field.concepts : []
    const custom = st.customConcepts.split(/[\s,，、]+/).map((s) => s.trim()).filter(Boolean)
    return Array.from(new Set([...custom, ...fromField]))
  }, [st.fieldId, st.customConcepts])

  const ready = consAll.length > 0 && vowAll.length > 0 && patterns.length > 0

  // 미리보기: 현재 의미장 개념들의 단어를 실시간 계산(결정론적).
  const preview = useMemo<LexEntry[]>(() => {
    if (!ready) return []
    return concepts.map((c) => {
      const w = makeWord(c, st.name, consAll, vowAll, sibilants, nasals, patterns, rules)
      return { concept: c, word: w, hangul: romanToHangul(w) }
    })
  }, [ready, concepts, st.name, consAll, vowAll, sibilants, nasals, patterns, rules])

  // 음운/패턴으로 만들 수 있는 음절 다양성 추정(거칠게).
  const inventory = useMemo(() => {
    let syl = 0
    for (const p of patterns) {
      let n = 1
      for (const ch of p) {
        if (ch === 'C') n *= Math.max(1, consAll.length)
        else if (ch === 'V') n *= Math.max(1, vowAll.length)
        else if (ch === 'N') n *= Math.max(1, nasals.length || consAll.length)
        else if (ch === 'S') n *= Math.max(1, sibilants.length || consAll.length)
      }
      syl += n
    }
    return syl
  }, [patterns, consAll, vowAll, nasals, sibilants])

  // 조합 가짓수(곱집합): 대표 단어 CVC·CVC·CVC(흔한 3음절형)을 만들 때 곱해지는
  //   슬롯 풀의 곱 = (자음^2·모음)^3 = 자음^6 · 모음^3. 풀이 커지면 곱이 폭증한다.
  const combos = useMemo(() => {
    const c = Math.max(1, consAll.length)
    const v = Math.max(1, vowAll.length)
    return Math.pow(c, 6) * Math.pow(v, 3)
  }, [consAll, vowAll])

  // ── 액션 ──
  const applyPreset = (pid: string) => {
    const p = PRESETS.find((x) => x.id === pid)
    if (!p) return
    setSt((s) => ({
      ...s,
      consGroups: Object.fromEntries(CONSONANT_GROUPS.map((g) => [g.id, p.cons.includes(g.id)])),
      vowGroups: Object.fromEntries(VOWEL_GROUPS.map((g) => [g.id, p.vow.includes(g.id)])),
      pattern: p.pattern,
      rules: p.rules,
    }))
    flash(`프리셋 "${p.label}"을 적용했어요.`)
  }

  const toggleCons = (id: string) => setSt((s) => ({ ...s, consGroups: { ...s.consGroups, [id]: !s.consGroups[id] } }))
  const toggleVow = (id: string) => setSt((s) => ({ ...s, vowGroups: { ...s.vowGroups, [id]: !s.vowGroups[id] } }))

  // 미리보기를 렉시콘으로 확정(중복 개념은 갱신).
  const commitLexicon = () => {
    if (!preview.length) { flash('생성된 단어가 없어요.'); return }
    setSt((s) => {
      const map = new Map<string, LexEntry>()
      for (const e of s.lexicon) map.set(e.concept, e)
      for (const e of preview) map.set(e.concept, e)
      return { ...s, lexicon: Array.from(map.values()) }
    })
    flash(`${preview.length}개 단어를 렉시콘에 확정했어요.`)
  }

  const regen = (concept: string) => {
    setSt((s) => {
      const salt = '~' + Math.floor(Math.random() * 9999)
      const w = makeWord(concept, s.name + salt, consAll, vowAll, sibilants, nasals, patterns, rules)
      const e: LexEntry = { concept, word: w, hangul: romanToHangul(w) }
      const exists = s.lexicon.some((x) => x.concept === concept)
      const lex = exists ? s.lexicon.map((x) => (x.concept === concept ? e : x)) : [e, ...s.lexicon]
      return { ...s, lexicon: lex }
    })
  }

  const removeEntry = (concept: string) =>
    setSt((s) => ({ ...s, lexicon: s.lexicon.filter((x) => x.concept !== concept) }))

  const clearLexicon = () => { setSt((s) => ({ ...s, lexicon: [] })); flash('렉시콘을 비웠어요.') }

  const lexLine = (e: LexEntry) => `${e.word}${st.useHangul ? `(${e.hangul})` : ''} = ${e.concept}`

  const saveAllSnippets = () => {
    if (!st.lexicon.length) { flash('확정된 단어가 없어요. 먼저 렉시콘에 확정하세요.'); return }
    const text = `[${st.name}] 사전\n` + st.lexicon.map(lexLine).join('\n')
    addToLibrary('snippets', { text, tags: ['conlang', st.name], source: meta.name })
    flash(`렉시콘 ${st.lexicon.length}개 단어를 스니펫으로 저장했어요.`)
  }

  const saveOneSnippet = (e: LexEntry) => {
    addToLibrary('snippets', { text: `${lexLine(e)} — [${st.name}]`, tags: ['conlang', st.name], source: meta.name })
    flash(`"${e.word}"를 스니펫으로 저장했어요.`)
  }

  const stashLexicon = () => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않아요.'); return }
    if (!st.lexicon.length) { flash('확정된 단어가 없어요.'); return }
    addToStash({ kind: 'memo', label: `${st.name} 사전(${st.lexicon.length})`, text: st.lexicon.map(lexLine).join('\n') })
    flash('수집함에 사전을 담았어요.')
  }

  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addDictToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    if (!st.lexicon.length) { flash('확정된 단어가 있어야 사전 문서를 만들 수 있어요.'); return }
    const sorted = [...st.lexicon].sort((a, b) => a.concept.localeCompare(b.concept, 'ko'))
    const rows = sorted.map((e) =>
      `<tr><td style="padding:2px 8px;font-weight:700;">${escapeHtml(e.word)}</td>` +
      `<td style="padding:2px 8px;color:#888;">${escapeHtml(st.useHangul ? e.hangul : '')}</td>` +
      `<td style="padding:2px 8px;">${escapeHtml(e.concept)}</td></tr>`).join('')
    const consDesc = consAll.join(', ')
    const vowDesc = vowAll.join(', ')
    const bodyHtml =
      `<p style="color:#888;">가상언어 "${escapeHtml(st.name)}" 사전 — 표제어 ${st.lexicon.length}개</p>` +
      `<h3>음운</h3>` +
      `<p><b>자음</b>: ${escapeHtml(consDesc)}</p>` +
      `<p><b>모음</b>: ${escapeHtml(vowDesc)}</p>` +
      `<p><b>음절 구조</b>: ${escapeHtml(st.pattern)}</p>` +
      (rules.length ? `<p><b>소리 변화</b>: ${escapeHtml(rules.map((r) => `${r[0]}>${r[1]}`).join(', '))}</p>` : '') +
      `<h3>표제어</h3>` +
      `<table><tbody>${rows}</tbody></table>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '언어',
      title: `${st.name} 사전`,
      synopsis: `자음 ${consAll.length} · 모음 ${vowAll.length} · 표제어 ${st.lexicon.length}`,
      bodyHtml,
    })
    flash(id ? '프로젝트 자료 〈언어〉 폴더에 사전 문서를 추가했어요.' : '추가하지 못했어요.')
  }

  // 언어를 장소(세계관 요소)로도 저장 — 설정 도구와 연계.
  const saveAsPlace = () => {
    if (!st.lexicon.length) { flash('확정된 단어가 없어요.'); return }
    const fields: Record<string, string> = {
      name: `${st.name}어`,
      kind: '언어/문화',
      culture: `자음(${consAll.join(' ')}) · 모음(${vowAll.join(' ')}) · 음절 ${st.pattern}`,
      notes: st.lexicon.slice(0, 12).map(lexLine).join(' / '),
    }
    addToLibrary('places', { name: `${st.name}어`, kind: '언어/문화', fields })
    flash('언어를 장소/배경 라이브러리에 〈문화 요소〉로 저장했어요.')
  }

  const openSetting = () => {
    if (!st.lexicon.length) { flash('확정된 단어가 없어요.'); return }
    openToolLinked('setting-bible', { text: `가상언어 ${st.name}: ` + st.lexicon.slice(0, 8).map(lexLine).join(', ') })
  }

  // ── 드롭 수용 ──
  const onDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const src = item.text || item.title || ''
    const words = extractConcepts(src)
    if (words.length) {
      setSt((p) => ({ ...p, customConcepts: Array.from(new Set([...p.customConcepts.split(/[\s,，、]+/).filter(Boolean), ...words])).join(', ') }))
      flash(`"${item.title}"에서 개념 ${words.length}개를 추출했어요.`)
    } else {
      flash('추출할 개념을 찾지 못했어요.')
    }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 13.5, position: 'relative' }
  const head: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const title: React.CSSProperties = { fontSize: 15, fontWeight: 700 }
  const sect: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }
  const sectTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '4px 9px', borderRadius: 999, fontSize: 12, cursor: 'pointer', userSelect: 'none',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
    background: on ? 'var(--accent)' : 'transparent',
    color: on ? '#fff' : 'var(--muted)',
  })
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 44, lineHeight: 1.5 }
  const tableWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 230, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--paper)' }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px', borderBottom: '1px solid var(--border)' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.6 }
  const stat: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }}
      onDragLeave={() => setDropHot(false)}
      onDrop={onDrop}
    >
      {dropHot && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(80,140,255,0.12)', border: '2px dashed var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--accent)', fontWeight: 700 }}>
          문서를 놓으면 개념을 추출합니다
        </div>
      )}

      <div style={head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={title}>가상언어 대장간</span>
          <span style={{ flex: 1 }} />
          <span style={stat}>음절 다양성 약 {inventory.toLocaleString()} · 조합 약 {combos.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            style={{ ...input, flex: 1 }}
            value={st.name}
            onChange={(e) => setSt((s) => ({ ...s, name: e.target.value }))}
            placeholder="언어 이름 (시드의 일부 — 이름이 같으면 단어도 같아져요)"
            aria-label="언어 이름"
          />
        </div>
        <div style={chipRow}>
          {PRESETS.map((p) => (
            <span key={p.id} style={chip(false)} onClick={() => applyPreset(p.id)} title={p.desc}>{p.label}</span>
          ))}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--accent)' }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 음운 인벤토리 */}
        <div style={sect}>
          <div style={sectTitle}>1. 음운 목록 — 쓸 소리를 켜세요</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>자음 ({consAll.length})</div>
          <div style={chipRow}>
            {CONSONANT_GROUPS.map((g) => (
              <span key={g.id} style={chip(!!st.consGroups[g.id])} onClick={() => toggleCons(g.id)} title={g.sounds.join(' ')}>
                {g.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{consAll.join(' · ') || '— 선택된 자음 없음 —'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>모음 ({vowAll.length})</div>
          <div style={chipRow}>
            {VOWEL_GROUPS.map((g) => (
              <span key={g.id} style={chip(!!st.vowGroups[g.id])} onClick={() => toggleVow(g.id)} title={g.sounds.join(' ')}>
                {g.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{vowAll.join(' · ') || '— 선택된 모음 없음 —'}</div>
        </div>

        {/* 음절 구조 */}
        <div style={sect}>
          <div style={sectTitle}>2. 음절 구조 — C(자음) V(모음) N(비음코다) S(치찰코다)</div>
          <input
            style={input}
            value={st.pattern}
            onChange={(e) => setSt((s) => ({ ...s, pattern: e.target.value }))}
            placeholder="예: CV CVC CVN — 공백/쉼표로 여러 틀"
            aria-label="음절 구조"
          />
          <div style={hint}>여러 틀을 적으면 단어마다 결정론적으로 골라 씁니다. 소문자는 그 글자 그대로 들어갑니다.</div>
        </div>

        {/* 소리 변화 */}
        <div style={sect}>
          <div style={sectTitle}>3. 소리 변화 규칙 — 찾기 &gt; 바꾸기 (한 줄씩, 위에서 아래로 적용)</div>
          <textarea
            style={ta}
            value={st.rules}
            onChange={(e) => setSt((s) => ({ ...s, rules: e.target.value }))}
            placeholder={'예:\nkk>k\nai>e\nh>   (오른쪽 비우면 삭제)'}
            aria-label="소리 변화 규칙"
          />
        </div>

        {/* 의미장 */}
        <div style={sect}>
          <div style={sectTitle}>4. 의미장 — 단어가 필요한 개념</div>
          <div style={chipRow}>
            {FIELDS.map((f) => (
              <span key={f.id} style={chip(st.fieldId === f.id)} onClick={() => setSt((s) => ({ ...s, fieldId: f.id }))} title={f.concepts.slice(0, 6).join(', ') + ' 등'}>
                {f.label}
              </span>
            ))}
          </div>
          <textarea
            style={ta}
            value={st.customConcepts}
            onChange={(e) => setSt((s) => ({ ...s, customConcepts: e.target.value }))}
            placeholder="직접 개념 추가(쉼표/공백 구분). 좌측 바인더 문서를 끌어다 놓거나 다른 도구에서 텍스트를 보낼 수 있어요."
            aria-label="커스텀 개념"
          />
        </div>

        {/* 미리보기 / 렉시콘 */}
        <div style={sect}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={sectTitle}>5. 생성 결과 ({preview.length})</span>
            <span style={{ flex: 1 }} />
            <label style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={st.useHangul} onChange={(e) => setSt((s) => ({ ...s, useHangul: e.target.checked }))} />
              한글 근사표기
            </label>
          </div>

          {!ready && (
            <div style={hint}>자음·모음·음절 구조를 각각 하나 이상 갖추면 여기에 단어가 나타납니다. 위 프리셋 버튼으로 빠르게 시작해 보세요.</div>
          )}

          {ready && preview.length === 0 && (
            <div style={hint}>의미장을 고르거나 개념을 직접 적으면 단어가 생성됩니다.</div>
          )}

          {ready && preview.length > 0 && (
            <div style={tableWrap}>
              {preview.map((e) => (
                <div key={e.concept} style={row}>
                  <span style={{ fontWeight: 700, minWidth: 92, color: 'var(--text)' }}>{e.word}</span>
                  {st.useHangul && <span style={{ color: 'var(--muted)', fontSize: 12, minWidth: 64 }}>{e.hangul}</span>}
                  <span style={{ flex: 1, color: 'var(--muted)' }}>{e.concept}</span>
                  <button className="minibtn" onClick={() => regen(e.concept)} title="이 단어만 다시 굴려 렉시콘에 확정">다시</button>
                  <button className="minibtn" onClick={() => saveOneSnippet(e)} title="이 단어를 스니펫으로 저장">담기</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={commitLexicon} disabled={!preview.length}>렉시콘에 확정</button>
            <button className="minibtn" onClick={clearLexicon} disabled={!st.lexicon.length} style={{ color: st.lexicon.length ? 'var(--warn)' : undefined }}>비우기</button>
          </div>
        </div>

        {/* 확정 렉시콘 */}
        <div style={sect}>
          <div style={sectTitle}>렉시콘(확정 사전) — {st.lexicon.length}개</div>
          {st.lexicon.length === 0 ? (
            <div style={hint}>위 생성 결과를 "렉시콘에 확정"하면 영구 사전으로 쌓입니다. 새 의미장으로 바꿔 가며 어휘를 늘려 보세요.</div>
          ) : (
            <div style={tableWrap}>
              {st.lexicon.map((e) => (
                <div key={e.concept} style={row}>
                  <span style={{ fontWeight: 700, minWidth: 92 }}>{e.word}</span>
                  {st.useHangul && <span style={{ color: 'var(--muted)', fontSize: 12, minWidth: 64 }}>{e.hangul}</span>}
                  <span style={{ flex: 1, color: 'var(--muted)' }}>{e.concept}</span>
                  <button className="minibtn" onClick={() => removeEntry(e.concept)} title="삭제">삭제</button>
                </div>
              ))}
            </div>
          )}
          <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="linkbtn" onClick={addDictToProject} disabled={!hasProjectBridge()} title="자료 〈언어〉 폴더에 사전 문서로 추가">프로젝트에 사전 추가</button>
            <button className="linkbtn" onClick={saveAllSnippets} disabled={!st.lexicon.length}>전체 스니펫 저장</button>
            <button className="linkbtn" onClick={saveAsPlace} disabled={!st.lexicon.length}>문화 요소로 저장</button>
            <button className="linkbtn" onClick={stashLexicon} disabled={!hasStash() || !st.lexicon.length}>수집함에 담기</button>
            <button className="linkbtn" onClick={openSetting} disabled={!st.lexicon.length} title="설정집 도구를 사전과 함께 열기">설정집으로 보내기</button>
          </div>
        </div>

        <div style={hint}>
          작동 원리: 단어는 "언어 이름 + 개념"을 시드로 하는 결정론적 의사난수로 만들어집니다. 따라서 같은 설정이면
          언제 열어도 같은 단어가 나와 일관된 언어가 됩니다. 음운·음절·소리변화를 바꾸면 언어의 인상이 통째로 달라집니다.
          저장된 스니펫({snippets.length})은 본문 어디서든 불러 쓸 수 있습니다.
        </div>
      </div>
    </div>
  )
}
