// 추가 산문 점검 도구(자기편집 정석) — 제스처 버릇·신체부위 주어·접속사·직유·만연체·부사 지문·
// 시간 표지·의성어·자주 쓴 서술어·지시어·명사형 종결·감탄사·메아리 단어·문단 첫단어 다양성·대사 길이.
import type { Scene } from './scenes'
import { splitSentences, wordTokens, splitParagraphs, extractDialogue } from './text.ts'
import { scanPatterns, type PatternResult } from './checks.ts'

export interface FreqResult { items: { label: string; count: number; per1k: number }[]; total: number }
export interface DensityResult { perScene: { id: string; title: string; count: number; per1k: number }[]; total: number }

function fullOf(scenes: Scene[]) { return scenes.map((s) => s.text).join('\n') }
function wordsOf(scenes: Scene[]) { return wordTokens(fullOf(scenes)).length || 1 }

function freqList(scenes: Scene[], entries: { label: string; re: RegExp }[]): FreqResult {
  const full = fullOf(scenes), words = wordsOf(scenes)
  const items = entries
    .map(({ label, re }) => ({ label, count: (full.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length }))
    .filter((x) => x.count > 0)
    .map((x) => ({ ...x, per1k: Math.round((x.count / words) * 1000 * 10) / 10 }))
    .sort((a, b) => b.count - a.count)
  return { items, total: items.reduce((n, i) => n + i.count, 0) }
}
function densityScan(scenes: Scene[], re: RegExp): DensityResult {
  const perScene = scenes.map((sc) => {
    const c = (sc.text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length
    const w = sc.words || wordTokens(sc.text).length || 1
    return { id: sc.id, title: sc.title, count: c, per1k: Math.round((c / w) * 1000 * 10) / 10 }
  })
  return { perScene, total: perScene.reduce((n, s) => n + s.count, 0) }
}

// 1) 제스처 버릇
const GESTURES = [
  { label: '고개를 끄덕', re: /고개를?\s?끄덕/ }, { label: '고개를 저', re: /고개를?\s?[저젓]/ }, { label: '미소(짓)', re: /미소를?\s?(지|머금|띠)/ },
  { label: '웃었다/웃음', re: /웃[었음]/ }, { label: '한숨', re: /한숨/ }, { label: '어깨를 으쓱', re: /어깨를?\s?으쓱/ },
  { label: '눈을 깜빡', re: /눈을?\s?깜[빡박]/ }, { label: '입술을 깨물', re: /입술을?\s?깨[물문]/ }, { label: '눈썹을 치켜', re: /눈썹을?\s?(치켜|찡)/ },
  { label: '시선을 돌리', re: /시선을?\s?(돌리|떨)/ }, { label: '고개를 돌리', re: /고개를?\s?돌[리려]/ }, { label: '어깨를 들', re: /어깨를?\s?들/ },
  { label: 'nodded', re: /\bnodded\b/i }, { label: 'smiled/smile', re: /\bsmile[ds]?\b/i }, { label: 'shrugged', re: /\bshrugged\b/i }, { label: 'sighed', re: /\bsighed\b/i },
]
export const gestureCrutch = (s: Scene[]) => freqList(s, GESTURES)

// 2) 신체 부위 주어(자율 신체) — 텔링/부자연 신호
const BODY_AUTONOMY = [
  { label: '눈이 ~(동작)', re: /눈(이|길이|동자가)\s?[가-힣]{0,3}(다|었다|렸다|졌다)/ },
  { label: '시선이 ~', re: /시선이\s?[가-힣]{1,4}(다|었다|렸다)/ },
  { label: '손이 ~', re: /손(이|가락이)\s?[가-힣]{1,4}(다|었다)/ },
  { label: '입이/입가가 ~', re: /입(이|가가|꼬리가)\s?[가-힣]{1,4}(다|었다|렸다)/ },
  { label: '가슴이 ~', re: /가슴이\s?[가-힣]{1,4}(다|었다|렸다)/ },
  { label: 'eyes + 동작', re: /\b(?:her|his|their|my)?\s?eyes\s+(?:dropped|fell|flew|darted|landed|wandered)\b/i },
]
export const bodyPartAutonomy = (s: Scene[]): PatternResult => scanPatterns(s, BODY_AUTONOMY)

// 3) 문장 첫머리 접속사 남용
const CONNECTIVES = ['그리고', '그러나', '그래서', '하지만', '그런데', '그러므로', '따라서', '또한', '그러자', '그리하여']
export function connectiveStart(scenes: Scene[]): FreqResult {
  const map = new Map<string, number>(); let sents = 0
  for (const sc of scenes) for (const s of splitSentences(sc.text)) { sents++; for (const c of CONNECTIVES) if (s.startsWith(c)) { map.set(c, (map.get(c) || 0) + 1); break } }
  const t = sents || 1
  const items = [...map.entries()].map(([label, count]) => ({ label, count, per1k: Math.round((count / t) * 1000 * 10) / 10 })).sort((a, b) => b.count - a.count)
  return { items, total: items.reduce((n, i) => n + i.count, 0) }
}

// 4) 직유 밀도
export const simileDensity = (s: Scene[]) => densityScan(s, /(처럼|같이|듯이|듯한|마치)|(\b(?:like|as if|as though)\b)/gi)
// 5) 만연체(쉼표 5개+ 문장)
export function commaRunon(scenes: Scene[]): DensityResult {
  const perScene = scenes.map((sc) => {
    const c = splitSentences(sc.text).filter((s) => (s.match(/,/g) || []).length >= 5).length
    return { id: sc.id, title: sc.title, count: c, per1k: c }
  })
  return { perScene, total: perScene.reduce((n, s) => n + s.count, 0) }
}
// 6) 부사 붙은 대사 지문
const ADV_TAGS = [
  { label: '~게 말했다', re: /[가-힣]+게\s?(말했|물었|대답했|외쳤|속삭였)/ },
  { label: '~히 말했다', re: /[가-힣]+히\s?(말했|물었|대답했|외쳤|속삭였)/ },
  { label: 'said + -ly', re: /\b(?:said|asked|replied|whispered|shouted)\s+\w+ly\b/i },
]
export const adverbDialogueTags = (s: Scene[]) => freqList(s, ADV_TAGS)

// 7) 시간 전환 표지
const TIME_MARKERS = ['갑자기', '그때', '잠시 후', '이윽고', '한참', '마침내', '곧', '어느새', '문득', '순간', '얼마 후', '그 순간']
export const timeMarkers = (s: Scene[]) => freqList(s, TIME_MARKERS.map((t) => ({ label: t, re: new RegExp(t.replace(/ /g, '\\s?')) })))

// 8) 의성어·의태어 밀도
export const onomatopoeiaDensity = (s: Scene[]) => densityScan(s, /(쿵|쾅|탁|툭|펑|쨍|와르르|두근|덜덜|부들|살금|성큼|번쩍|반짝|꿈틀|울컥|움찔|철렁|화들짝|후다닥|허겁지겁)/g)

// 9) 자주 쓴 서술어(다-종결 단어)
export function commonPredicates(scenes: Scene[]): FreqResult {
  const map = new Map<string, number>()
  for (const sc of scenes) for (const s of splitSentences(sc.text)) {
    const m = s.replace(/["'”’」』).\s…!?]+$/u, '').match(/([가-힣]{2,6}다)$/u)
    if (m) map.set(m[1], (map.get(m[1]) || 0) + 1)
  }
  const items = [...map.entries()].filter(([, c]) => c >= 3).map(([label, count]) => ({ label, count, per1k: count })).sort((a, b) => b.count - a.count).slice(0, 25)
  return { items, total: items.reduce((n, i) => n + i.count, 0) }
}

// 10) 지시어 남용
export const demonstratives = (s: Scene[]) => freqList(s, [
  { label: '그(관형)', re: /그\s[가-힣]/ }, { label: '이(관형)', re: /이\s[가-힣]/ }, { label: '그것', re: /그것/ }, { label: '이것', re: /이것/ }, { label: '저것', re: /저것/ }, { label: '그런', re: /그런\s/ }, { label: '이런', re: /이런\s/ },
])

// 11) 명사형 종결('~함/~음/~기' 남용 — 건조한 문체)
export function nominalEnding(scenes: Scene[]): FreqResult {
  const map = new Map<string, number>()
  for (const sc of scenes) for (const s of splitSentences(sc.text)) {
    const c = s.replace(/["'”’」』).\s…!?]+$/u, '')
    if (/[가-힣](함|됨|음|기|뿐)$/u.test(c)) { const k = c.slice(-2); map.set(k, (map.get(k) || 0) + 1) }
  }
  const items = [...map.entries()].map(([label, count]) => ({ label, count, per1k: count })).sort((a, b) => b.count - a.count).slice(0, 20)
  return { items, total: items.reduce((n, i) => n + i.count, 0) }
}

// 12) 감탄사·추임새 밀도
export const interjectionDensity = (s: Scene[]) => densityScan(s, /(["'“「『]\s*)(아|어|음|헉|흠|에이|이런|어머|세상에|맙소사|아하|오)([,.\s!?…])/g)

// 13) 메아리 단어(가까운 거리 반복)
const STOP = new Set(['그', '이', '저', '것', '수', '등', '및', '나', '너', '그녀', '그는', '나는', '있었다', '있다', '했다', '하는', '같은', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'that', 'was', 'he', 'she'])
export interface EchoResult { items: { word: string; echoes: number }[] }
export function echoWords(scenes: Scene[], window = 50): EchoResult {
  const map = new Map<string, number>()
  for (const sc of scenes) {
    const w = wordTokens(sc.text).map((x) => x.toLowerCase())
    const last = new Map<string, number>()
    for (let i = 0; i < w.length; i++) {
      const t = w[i]
      if (t.length < 2 || STOP.has(t)) continue
      const prev = last.get(t)
      if (prev !== undefined && i - prev <= window) map.set(t, (map.get(t) || 0) + 1)
      last.set(t, i)
    }
  }
  const items = [...map.entries()].map(([word, echoes]) => ({ word, echoes })).sort((a, b) => b.echoes - a.echoes).slice(0, 30)
  return { items }
}

// 14) 문단 첫 단어 다양성
export interface OpenerVarietyResult { perScene: { id: string; title: string; unique: number; total: number; ratio: number }[] }
export function paragraphOpenerVariety(scenes: Scene[]): OpenerVarietyResult {
  const perScene = scenes.map((sc) => {
    const firsts = splitParagraphs(sc.text).map((p) => (wordTokens(p)[0] || '').toLowerCase()).filter(Boolean)
    const unique = new Set(firsts).size
    return { id: sc.id, title: sc.title, unique, total: firsts.length, ratio: firsts.length ? Math.round((unique / firsts.length) * 100) : 100 }
  })
  return { perScene }
}

// 15) 대사 길이 분포
export interface DialogueLenResult { short: number; medium: number; long: number; avg: number }
export function dialogueLength(scenes: Scene[]): DialogueLenResult {
  const lens: number[] = []
  for (const sc of scenes) for (const d of extractDialogue(sc.text)) lens.push(wordTokens(d).length)
  const short = lens.filter((l) => l <= 4).length, long = lens.filter((l) => l >= 25).length, medium = lens.length - short - long
  return { short, medium, long, avg: lens.length ? Math.round((lens.reduce((a, b) => a + b, 0) / lens.length) * 10) / 10 : 0 }
}
