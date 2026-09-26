// 창작 산문 분석: 클리셰·오감·대사비율·필러·화자표지·반복시작·리듬·페이싱·가독성·부사·필터·텔링.
// 모두 순수 함수(원고 장면 배열 입력). UI(CreativeStudio)에서 패널로 표시.
import type { Scene } from './scenes'
import { splitSentences, wordTokens, splitParagraphs, hasKorean, syllablesEn, extractDialogue, charsNoSpace } from './text.ts'

// ---------- 사전(창작 지식) ----------
export const CLICHES: { phrase: string; re: RegExp }[] = [
  // 한국어
  ['심장이 쿵', /심장이\s*쿵/g], ['심장이 두근', /심장이\s*두근/g], ['가슴이 철렁', /가슴이\s*철렁/g],
  ['등골이 오싹', /등골이\s*오싹/g], ['온몸에 소름', /온몸에\s*소름/g], ['소름이 돋', /소름이\s*돋/g],
  ['정적이 흘렀다', /정적이\s*흘렀/g], ['침묵이 흘렀다', /침묵이\s*흘렀/g], ['시간이 멈춘 듯', /시간이\s*멈[춘췄]/g],
  ['눈앞이 캄캄', /눈앞이\s*캄캄/g], ['피가 거꾸로', /피가\s*거꾸로/g], ['숨이 막혔다', /숨이\s*막[혔히]/g],
  ['가슴이 먹먹', /가슴이\s*먹먹/g], ['식은땀', /식은[ ]?땀/g], ['안도의 한숨', /안도의\s*한숨/g],
  ['눈물이 핑', /눈물이\s*핑/g], ['머릿속이 하얘', /머[릿리]속이\s*하[얘얗]/g],
  // 영어
  ['heart pounded', /heart\s+pounded/gi], ['heart raced', /heart\s+raced/gi], ['heart skipped a beat', /heart\s+skipped\s+a\s+beat/gi],
  ['let out a breath', /let\s+out\s+a\s+breath/gi], ["breath (s)he didn't know", /breath\s+(?:he|she|they)\s+didn['’]t\s+know/gi],
  ['time stood still', /time\s+stood\s+still/gi], ['butterflies in (the) stomach', /butterflies\s+in\s+(?:her|his|their|the)\s+stomach/gi],
  ['shivers down (the) spine', /shiver?s?\s+down\s+(?:her|his|their|the)?\s*spine/gi], ['a single tear', /a\s+single\s+tear/gi],
  ['deafening silence', /deafening\s+silence/gi], ['calm before the storm', /calm\s+before\s+the\s+storm/gi],
  ['blood ran cold', /blood\s+ran\s+cold/gi], ['cold sweat', /cold\s+sweat/gi], ['weak in the knees', /weak\s+(?:in|at)\s+the\s+knees/gi],
  ['lump in (the) throat', /lump\s+in\s+(?:her|his|their|the)\s+throat/gi], ['nick of time', /nick\s+of\s+time/gi],
].map(([phrase, re]) => ({ phrase: phrase as string, re: re as RegExp }))

const SENSES: { key: string; label: string; icon: string; words: string[] }[] = [
  { key: 'sight', label: '시각', icon: '👁', words: ['보았다', '바라보', '쳐다보', '시선', '눈빛', '빛', '색깔', '반짝', '어둠', '환하', 'look', 'saw', 'see', 'glanc', 'stare', 'bright', 'dark', 'color', 'gleam', 'shadow'] },
  { key: 'sound', label: '청각', icon: '👂', words: ['소리', '들렸', '들리', '울렸', '속삭', '외쳤', '쿵', '메아리', '고요', 'hear', 'heard', 'sound', 'loud', 'whisper', 'echo', 'silence', 'noise', 'rang', 'creak'] },
  { key: 'smell', label: '후각', icon: '👃', words: ['냄새', '향기', '향', '맡', '악취', '내음', 'smell', 'scent', 'odor', 'aroma', 'fragran', 'stench', 'reek'] },
  { key: 'taste', label: '미각', icon: '👅', words: ['맛', '달콤', '씁쓸', '짭짤', '시큼', '쓴', '단맛', 'taste', 'sweet', 'bitter', 'sour', 'salty', 'savory', 'flavor'] },
  { key: 'touch', label: '촉각', icon: '✋', words: ['촉감', '만졌', '만지', '부드럽', '거칠', '차갑', '뜨겁', '따뜻', '축축', 'touch', 'soft', 'rough', 'cold', 'warm', 'smooth', 'texture', 'damp', 'wet'] },
]

const FILTER_WORDS = [
  '느꼈다', '느꼈', '보였다', '들렸다', '보았다', '생각했다', '알아챘', '깨달았', '듯했다', '것 같았다', '처럼 보였',
  'felt', 'saw', 'heard', 'watched', 'noticed', 'realized', 'thought', 'seemed', 'looked', 'wondered', 'decided', 'knew', 'observed',
]

const TELLING = [
  '화가 났다', '화났다', '슬펐다', '기뻤다', '무서웠다', '행복했다', '긴장했다', '불안했다', '짜증났다', '두려웠다', '외로웠다', '당황했다', '분노했다',
  'was angry', 'was sad', 'was happy', 'was scared', 'was afraid', 'was nervous', 'was excited', 'felt angry', 'felt sad', 'felt happy', 'felt afraid',
]

const SAID = ['말했다', '물었다', '대답했다', 'said', 'asked', 'replied']
const SAID_BOOKISM = [
  '외쳤다', '부르짖었다', '단언했다', '으르렁거렸다', '쏘아붙였다', '내뱉었다', '읊조렸다', '비명을 질렀다',
  'exclaimed', 'declared', 'retorted', 'interjected', 'opined', 'queried', 'articulated', 'pronounced', 'asserted', 'bellowed', 'growled', 'hissed', 'snarled', 'chuckled', 'ejaculated',
]

const CRUTCH = [
  '그냥', '정말', '너무', '갑자기', '약간', '조금', '사실', '막', '좀', '결국', '마침내', '문득', '왠지',
  'just', 'really', 'very', 'then', 'suddenly', 'somehow', 'actually', 'simply', 'quite', 'rather', 'even', 'only', 'almost', 'basically', 'literally',
]

const KO_ADVERBS_COMMON = ['천천히', '빠르게', '조용히', '갑자기', '가만히', '서서히', '문득', '겨우', '간신히', '슬며시', '재빨리', '조심스럽게', '부드럽게', '날카롭게']

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0
  // 영어 단어는 단어 경계, 그 외(한글 등)는 부분 문자열.
  if (/^[a-z][a-z' ]*$/i.test(needle)) {
    const re = new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi')
    return (text.match(re) || []).length
  }
  let i = 0, n = 0
  while ((i = text.indexOf(needle, i)) !== -1) { n++; i += needle.length }
  return n
}

// ---------- 1) 클리셰 ----------
export interface ClicheResult {
  total: number
  hits: { phrase: string; count: number; scenes: string[] }[]
  perScene: { id: string; title: string; count: number }[]
}
export function scanCliches(scenes: Scene[]): ClicheResult {
  const hitMap = new Map<string, { count: number; scenes: Set<string> }>()
  const perScene: ClicheResult['perScene'] = []
  for (const sc of scenes) {
    let sceneCount = 0
    for (const { phrase, re } of CLICHES) {
      re.lastIndex = 0
      const m = sc.text.match(re)
      if (m && m.length) {
        sceneCount += m.length
        const e = hitMap.get(phrase) || { count: 0, scenes: new Set<string>() }
        e.count += m.length
        e.scenes.add(sc.title)
        hitMap.set(phrase, e)
      }
    }
    perScene.push({ id: sc.id, title: sc.title, count: sceneCount })
  }
  const hits = [...hitMap.entries()]
    .map(([phrase, e]) => ({ phrase, count: e.count, scenes: [...e.scenes] }))
    .sort((a, b) => b.count - a.count)
  return { total: hits.reduce((n, h) => n + h.count, 0), hits, perScene }
}

// ---------- 2) 오감 균형 ----------
export interface SensoryResult {
  totals: { key: string; label: string; icon: string; count: number; pct: number }[]
  perScene: { id: string; title: string; counts: Record<string, number>; dominant: string; missing: string[] }[]
  weakest: string
}
export function sensoryBalance(scenes: Scene[]): SensoryResult {
  const totals: Record<string, number> = {}
  SENSES.forEach((s) => (totals[s.key] = 0))
  const perScene: SensoryResult['perScene'] = []
  for (const sc of scenes) {
    const lc = sc.text.toLowerCase()
    const counts: Record<string, number> = {}
    for (const sense of SENSES) {
      let c = 0
      for (const w of sense.words) c += countOccurrences(/[a-z]/.test(w) ? lc : sc.text, w)
      counts[sense.key] = c
      totals[sense.key] += c
    }
    const entries = SENSES.map((s) => [s.key, counts[s.key]] as const)
    const dominant = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    const missing = entries.filter(([, c]) => c === 0).map(([k]) => k)
    perScene.push({ id: sc.id, title: sc.title, counts, dominant, missing })
  }
  const grand = SENSES.reduce((n, s) => n + totals[s.key], 0) || 1
  const totalsArr = SENSES.map((s) => ({ key: s.key, label: s.label, icon: s.icon, count: totals[s.key], pct: Math.round((totals[s.key] / grand) * 100) }))
  const weakest = totalsArr.reduce((a, b) => (b.count < a.count ? b : a)).label
  return { totals: totalsArr, perScene, weakest }
}

// ---------- 3) 대사 비율 ----------
export interface DialogueResult {
  overallPct: number
  perScene: { id: string; title: string; dialoguePct: number; lines: number }[]
}
export function dialogueRatio(scenes: Scene[]): DialogueResult {
  let dchars = 0, total = 0
  const perScene: DialogueResult['perScene'] = []
  for (const sc of scenes) {
    const lines = extractDialogue(sc.text)
    const dc = lines.reduce((n, l) => n + charsNoSpace(l), 0)
    const tc = charsNoSpace(sc.text)
    dchars += dc
    total += tc
    perScene.push({ id: sc.id, title: sc.title, dialoguePct: tc ? Math.round((dc / tc) * 100) : 0, lines: lines.length })
  }
  return { overallPct: total ? Math.round((dchars / total) * 100) : 0, perScene }
}

// ---------- 4) 필러/버릇 단어 ----------
export interface WordCountResult {
  items: { word: string; count: number; per1k: number }[]
  totalWords: number
}
function wordListReport(scenes: Scene[], list: string[]): WordCountResult {
  const full = scenes.map((s) => s.text).join('\n')
  const totalWords = wordTokens(full).length || 1
  const items = list
    .map((w) => ({ word: w, count: countOccurrences(/[a-z]/i.test(w) ? full.toLowerCase() : full, w.toLowerCase()) }))
    .filter((x) => x.count > 0)
    .map((x) => ({ ...x, per1k: Math.round((x.count / totalWords) * 10000) / 10 }))
    .sort((a, b) => b.count - a.count)
  return { items, totalWords }
}
export const crutchWords = (scenes: Scene[]) => wordListReport(scenes, CRUTCH)
export const filterWords = (scenes: Scene[]) => wordListReport(scenes, FILTER_WORDS)
export const tellingMarkers = (scenes: Scene[]) => wordListReport(scenes, TELLING)

// ---------- 5) 화자표지(said-bookism) ----------
export interface SaidResult {
  said: number
  fancy: { word: string; count: number }[]
  fancyTotal: number
  ratio: number // fancy / (said+fancy)
}
export function saidBookism(scenes: Scene[]): SaidResult {
  const full = scenes.map((s) => s.text).join('\n')
  const lc = full.toLowerCase()
  const said = SAID.reduce((n, w) => n + countOccurrences(/[a-z]/i.test(w) ? lc : full, w.toLowerCase()), 0)
  const fancy = SAID_BOOKISM
    .map((w) => ({ word: w, count: countOccurrences(/[a-z]/i.test(w) ? lc : full, w.toLowerCase()) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
  const fancyTotal = fancy.reduce((n, f) => n + f.count, 0)
  return { said, fancy, fancyTotal, ratio: said + fancyTotal ? Math.round((fancyTotal / (said + fancyTotal)) * 100) : 0 }
}

// ---------- 6) 반복 문장 시작 ----------
export interface OpenerResult {
  repeats: { opener: string; count: number }[]
  consecutive: { opener: string; run: number; scene: string }[]
}
export function repeatedOpeners(scenes: Scene[]): OpenerResult {
  const map = new Map<string, number>()
  const consecutive: OpenerResult['consecutive'] = []
  for (const sc of scenes) {
    const paras = splitParagraphs(sc.text)
    let prev = '', run = 0
    for (const p of paras) {
      const first = (wordTokens(p)[0] || '').toLowerCase()
      if (!first) continue
      map.set(first, (map.get(first) || 0) + 1)
      if (first === prev) {
        run++
        if (run === 2) consecutive.push({ opener: first, run: run + 1, scene: sc.title })
        else if (run > 2 && consecutive.length) consecutive[consecutive.length - 1].run = run + 1
      } else run = 0
      prev = first
    }
  }
  const repeats = [...map.entries()]
    .filter(([w, c]) => c >= 4 && w.length >= 2)
    .map(([opener, count]) => ({ opener, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
  return { repeats, consecutive }
}

// ---------- 7) 문장 리듬 / 단조로움 ----------
export interface RhythmResult {
  perScene: { id: string; title: string; avg: number; variance: number; lengths: number[]; monotony: boolean }[]
  overallAvg: number
  overallVariance: number
}
export function sentenceRhythm(scenes: Scene[]): RhythmResult {
  const allLens: number[] = []
  const perScene: RhythmResult['perScene'] = []
  for (const sc of scenes) {
    const lengths = splitSentences(sc.text).map((s) => wordTokens(s).length).filter((n) => n > 0)
    allLens.push(...lengths)
    const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
    const variance = lengths.length ? lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length : 0
    const monotony = lengths.length >= 6 && Math.sqrt(variance) < 3 // 표준편차<3 → 길이 단조
    perScene.push({ id: sc.id, title: sc.title, avg: Math.round(avg * 10) / 10, variance: Math.round(variance * 10) / 10, lengths, monotony })
  }
  const oa = allLens.length ? allLens.reduce((a, b) => a + b, 0) / allLens.length : 0
  const ov = allLens.length ? allLens.reduce((a, b) => a + (b - oa) ** 2, 0) / allLens.length : 0
  return { perScene, overallAvg: Math.round(oa * 10) / 10, overallVariance: Math.round(ov * 10) / 10 }
}

// ---------- 8) 페이싱(장면 길이) ----------
export interface PacingResult {
  scenes: { id: string; title: string; words: number; tier: 'short' | 'normal' | 'long' }[]
  median: number
  avg: number
}
export function pacing(scenes: Scene[]): PacingResult {
  const counts = scenes.map((s) => s.words || wordTokens(s.text).length)
  const sorted = [...counts].sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const avg = counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0
  const out = scenes.map((s, i) => {
    const w = counts[i]
    const tier: 'short' | 'normal' | 'long' = median ? (w < median * 0.5 ? 'short' : w > median * 1.8 ? 'long' : 'normal') : 'normal'
    return { id: s.id, title: s.title, words: w, tier }
  })
  return { scenes: out, median, avg }
}

// ---------- 9) 장면별 가독성 ----------
export interface ReadabilityResult {
  perScene: { id: string; title: string; score: number; avgSentence: number; grade: string; lang: 'ko' | 'en' }[]
}
export function perSceneReadability(scenes: Scene[]): ReadabilityResult {
  const perScene = scenes.map((sc) => {
    const sents = splitSentences(sc.text)
    const words = wordTokens(sc.text)
    const ko = hasKorean(sc.text)
    const avgSentence = sents.length ? words.length / sents.length : 0
    let score: number
    if (ko) {
      // 한국어 근사: 평균 문장 길이 기반(짧을수록 읽기 쉬움). 0~100 점수화.
      score = Math.max(0, Math.min(100, Math.round(100 - (avgSentence - 8) * 4)))
    } else {
      const syl = words.reduce((n, w) => n + syllablesEn(w), 0)
      score = words.length && sents.length ? Math.round(206.835 - 1.015 * (words.length / sents.length) - 84.6 * (syl / words.length)) : 0
    }
    const grade = score >= 70 ? '쉬움' : score >= 50 ? '보통' : score >= 30 ? '어려움' : '매우 어려움'
    return { id: sc.id, title: sc.title, score, avgSentence: Math.round(avgSentence * 10) / 10, grade, lang: (ko ? 'ko' : 'en') as 'ko' | 'en' }
  })
  return { perScene }
}

// ---------- 10) 부사 밀도 ----------
export interface AdverbResult {
  perScene: { id: string; title: string; count: number; per1k: number }[]
  total: number
}
export function adverbDensity(scenes: Scene[]): AdverbResult {
  const perScene = scenes.map((sc) => {
    const en = (sc.text.match(/\b[a-z]+ly\b/gi) || []).filter((w) => !['family', 'only', 'reply', 'apply', 'supply', 'imply', 'fly', 'ally', 'rally', 'jelly', 'belly'].includes(w.toLowerCase())).length
    let ko = 0
    for (const a of KO_ADVERBS_COMMON) { let i = 0; while ((i = sc.text.indexOf(a, i)) !== -1) { ko++; i += a.length } }
    const count = en + ko
    const words = sc.words || wordTokens(sc.text).length || 1
    return { id: sc.id, title: sc.title, count, per1k: Math.round((count / words) * 1000 * 10) / 10 }
  })
  return { perScene, total: perScene.reduce((n, s) => n + s.count, 0) }
}
