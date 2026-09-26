// 실전 소설 점검 도구(한국어 특화 + 보편) — 번역투·이중피동·맞춤법·겹말·문장 끝맺음·반복 구절·
// 문단 길이·장면 훅·아웃라인·문장 유형·숫자 표기·감정 밀도. 모두 순수 함수(Scene[] 입력).
import type { Scene } from './scenes'
import { splitSentences, wordTokens, splitParagraphs } from './text.ts'

export interface PatternHit { label: string; count: number; samples: string[] }
export interface PatternResult { total: number; hits: PatternHit[]; perScene: { id: string; title: string; count: number }[] }

function ctx(text: string, i: number, len: number): string {
  return ('…' + text.slice(Math.max(0, i - 8), i + len + 10) + '…').replace(/\s+/g, ' ').trim()
}

export function scanPatterns(scenes: Scene[], patterns: { label: string; re: RegExp }[]): PatternResult {
  const hitMap = new Map<string, PatternHit>()
  const perScene: PatternResult['perScene'] = []
  for (const sc of scenes) {
    let n = 0
    for (const { label, re } of patterns) {
      const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
      let m: RegExpExecArray | null
      while ((m = rx.exec(sc.text))) {
        n++
        const h = hitMap.get(label) || { label, count: 0, samples: [] }
        h.count++
        if (h.samples.length < 6) h.samples.push(ctx(sc.text, m.index, m[0].length))
        hitMap.set(label, h)
        if (m.index === rx.lastIndex) rx.lastIndex++
      }
    }
    perScene.push({ id: sc.id, title: sc.title, count: n })
  }
  const hits = [...hitMap.values()].sort((a, b) => b.count - a.count)
  return { total: hits.reduce((s, h) => s + h.count, 0), hits, perScene }
}

// ---------- 1) 번역투 ----------
const TRANSLATIONESE = [
  { label: '~에 의해 (피동 번역투)', re: /에\s?의해(서)?/g },
  { label: '~을/를 가지다', re: /[을를]\s?가지(고|는|며|다)/g },
  { label: '~에 대하여/대한', re: /에\s?대(하여|한|해)/g },
  { label: '~로부터', re: /(으)?로부터/g },
  { label: '~을/를 필요로 하다', re: /[을를]\s?필요로/g },
  { label: '~중의 하나', re: /중의\s?하나/g },
  { label: '~지 않으면 안 되다', re: /지\s?않으면\s?안/g },
  { label: '~에 위치하다', re: /에\s?위치(하|한|해)/g },
  { label: '~을/를 행하다', re: /[을를]\s?행(하|한|해)/g },
  { label: '~임에 틀림없다', re: /임에\s?틀림없/g },
]
export const translationese = (s: Scene[]) => scanPatterns(s, TRANSLATIONESE)

// ---------- 2) 이중피동 ----------
const DOUBLE_PASSIVE = [
  { label: '되어지다/되어진', re: /되어[지진]/g },
  { label: '불려지다', re: /불려[지진]/g },
  { label: '쓰여지다', re: /[쓰씌]여[지진]/g },
  { label: '보여지다', re: /보여[지진]/g },
  { label: '잊혀지다', re: /잊혀[지진]/g },
  { label: '모여지다', re: /모여[지진]/g },
  { label: '담겨지다', re: /담겨[지진]/g },
  { label: '내려지다', re: /내려[지진]/g },
  { label: '읽혀지다', re: /읽혀[지진]/g },
]
export const doublePassive = (s: Scene[]) => scanPatterns(s, DOUBLE_PASSIVE)

// ---------- 3) 겹말(군더더기 동의 중복) ----------
const REDUNDANCY = [
  { label: '역전 앞', re: /역전\s?앞/g }, { label: '미리 예약', re: /미리\s?예약/g },
  { label: '다시 재(再)', re: /다시\s?재[시개확]/g }, { label: '가장 최고/최선', re: /가장\s?최[고선]/g },
  { label: '계속 이어지다', re: /계속\s?이어/g }, { label: '매 순간마다', re: /매\s?순간마다/g },
  { label: '함께 동행', re: /함께\s?동[행반]/g }, { label: '스스로 자각', re: /스스로\s?자[각청]/g },
  { label: '서로 상의/상호', re: /서로\s?상[의호]/g }, { label: '같은 동일', re: /같은\s?동[일종]/g },
  { label: '먼저 선행', re: /먼저\s?선[행제]/g }, { label: '남은 여생', re: /남은\s?여[생분]/g },
]
export const redundancy = (s: Scene[]) => scanPatterns(s, REDUNDANCY)

// ---------- 4) 흔한 맞춤법 실수 ----------
const SPELLING: { wrong: RegExp; show: string; suggest: string }[] = [
  { wrong: /됬/g, show: '됬', suggest: '됐' }, { wrong: /역활/g, show: '역활', suggest: '역할' },
  { wrong: /어떻해/g, show: '어떻해', suggest: '어떡해' }, { wrong: /일일히/g, show: '일일히', suggest: '일일이' },
  { wrong: /몇일/g, show: '몇일', suggest: '며칠' }, { wrong: /오랫만/g, show: '오랫만', suggest: '오랜만' },
  { wrong: /희안/g, show: '희안', suggest: '희한' }, { wrong: /설레임/g, show: '설레임', suggest: '설렘' },
  { wrong: /금새/g, show: '금새', suggest: '금세' }, { wrong: /왠만/g, show: '왠만', suggest: '웬만' },
  { wrong: /구지/g, show: '구지', suggest: '굳이' }, { wrong: /빛이\s?나(?!다)/g, show: '빛이 나-', suggest: '빛이 나다(확인)' },
  { wrong: /며칠전/g, show: '며칠전', suggest: '며칠 전(띄어쓰기)' }, { wrong: /안되(?![가-힣])/g, show: '안되', suggest: '안 돼/안 되다(확인)' },
  { wrong: /굼뜨/g, show: '굼뜨', suggest: '굼뜨다(확인)' }, { wrong: /바램(?!이)/g, show: '바램', suggest: '바람(소망)' },
]
export interface SpellResult { total: number; items: { show: string; suggest: string; count: number }[] }
export function koreanSpelling(scenes: Scene[]): SpellResult {
  const full = scenes.map((s) => s.text).join('\n')
  const items = SPELLING.map(({ wrong, show, suggest }) => ({ show, suggest, count: (full.match(wrong) || []).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
  return { total: items.reduce((n, i) => n + i.count, 0), items }
}

// ---------- 5) 문장 끝맺음 다양성(한국어) ----------
export interface EndingResult {
  dist: { ending: string; count: number; pct: number }[]
  monotony: { ending: string; run: number; scene: string }[]
}
function endingOf(sentence: string): string {
  const s = sentence.replace(/["'”’」』).\s…!?]+$/u, '')
  const m = s.match(/([가-힣]{1,3})$/u)
  return m ? m[1] : '기타'
}
export function sentenceEndings(scenes: Scene[]): EndingResult {
  const dist = new Map<string, number>()
  const monotony: EndingResult['monotony'] = []
  let total = 0
  for (const sc of scenes) {
    let prev = '', run = 1
    for (const sent of splitSentences(sc.text)) {
      const e = endingOf(sent)
      dist.set(e, (dist.get(e) || 0) + 1)
      total++
      if (e === prev) {
        run++
        if (run === 4) monotony.push({ ending: e, run, scene: sc.title })
        else if (run > 4 && monotony.length && monotony[monotony.length - 1].scene === sc.title && monotony[monotony.length - 1].ending === e) monotony[monotony.length - 1].run = run
      } else run = 1
      prev = e
    }
  }
  const t = total || 1
  return {
    dist: [...dist.entries()].map(([ending, count]) => ({ ending, count, pct: Math.round((count / t) * 100) })).sort((a, b) => b.count - a.count).slice(0, 12),
    monotony,
  }
}

// ---------- 6) 반복 구절(n-gram) ----------
export interface NgramResult { items: { phrase: string; count: number }[] }
export function repeatedPhrases(scenes: Scene[], n = 4): NgramResult {
  const map = new Map<string, number>()
  for (const sc of scenes) {
    for (const sent of splitSentences(sc.text)) {
      const w = wordTokens(sent)
      for (let i = 0; i + n <= w.length; i++) {
        const g = w.slice(i, i + n).join(' ')
        if (g.length < 6) continue
        map.set(g, (map.get(g) || 0) + 1)
      }
    }
  }
  const items = [...map.entries()].filter(([, c]) => c >= 2).map(([phrase, count]) => ({ phrase, count })).sort((a, b) => b.count - a.count).slice(0, 30)
  return { items }
}

// ---------- 7) 문단 길이 ----------
export interface ParaResult { perScene: { id: string; title: string; avg: number; max: number; count: number }[]; longParas: { scene: string; words: number; preview: string }[] }
export function paragraphStats(scenes: Scene[]): ParaResult {
  const perScene = scenes.map((sc) => {
    const paras = splitParagraphs(sc.text)
    const lens = paras.map((p) => wordTokens(p).length)
    return { id: sc.id, title: sc.title, avg: lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0, max: lens.length ? Math.max(...lens) : 0, count: paras.length }
  })
  const longParas: ParaResult['longParas'] = []
  for (const sc of scenes) for (const p of splitParagraphs(sc.text)) { const w = wordTokens(p).length; if (w > 150) longParas.push({ scene: sc.title, words: w, preview: p.slice(0, 60) + '…' }) }
  longParas.sort((a, b) => b.words - a.words)
  return { perScene, longParas: longParas.slice(0, 15) }
}

// ---------- 8) 장면 훅(첫/끝 문장) ----------
export interface HookResult { scenes: { id: string; title: string; first: string; last: string }[] }
export function sceneHooks(scenes: Scene[]): HookResult {
  return {
    scenes: scenes.map((sc) => {
      const sents = splitSentences(sc.text)
      return { id: sc.id, title: sc.title, first: sents[0] || '(빈 장면)', last: sents[sents.length - 1] || '' }
    }),
  }
}

// ---------- 9) 한 줄 아웃라인 ----------
export interface OutlineResult { scenes: { id: string; title: string; line: string }[] }
export function sceneOutline(scenes: Scene[]): OutlineResult {
  return {
    scenes: scenes.map((sc) => {
      const syn = (sc.item.synopsis || '').trim()
      const first = splitSentences(sc.text)[0] || ''
      return { id: sc.id, title: sc.title, line: syn || first || '(요약 없음)' }
    }),
  }
}

// ---------- 10) 문장 유형(서술/의문/감탄) ----------
export interface SentTypeResult { statement: number; question: number; exclaim: number; perScene: { id: string; title: string; q: number; e: number }[] }
export function sentenceTypes(scenes: Scene[]): SentTypeResult {
  let statement = 0, question = 0, exclaim = 0
  const perScene = scenes.map((sc) => {
    let q = 0, e = 0
    for (const s of splitSentences(sc.text)) {
      if (/[?？]\s*$/.test(s) || /[?？]["'”’」』)]*\s*$/.test(s)) { question++; q++ }
      else if (/[!！]\s*$/.test(s) || /[!！]["'”’」』)]*\s*$/.test(s)) { exclaim++; e++ }
      else statement++
    }
    return { id: sc.id, title: sc.title, q, e }
  })
  return { statement, question, exclaim, perScene }
}

// ---------- 11) 숫자 표기 일관성 ----------
export interface NumberResult { arabic: number; koreanNum: number; mixed: boolean }
export function numberConsistency(scenes: Scene[]): NumberResult {
  const full = scenes.map((s) => s.text).join(' ')
  const arabic = (full.match(/\d+/g) || []).length
  const koreanNum = (full.match(/[일이삼사오육칠팔구십백천만]{1,}(?=\s|[가-힣]|$)/g) || []).filter((t) => /[일이삼사오육칠팔구]/.test(t) && t.length >= 1).length
  return { arabic, koreanNum, mixed: arabic > 3 && koreanNum > 3 }
}

// ---------- 12) 감정 어휘 밀도 ----------
const EMOTION_WORDS = ['사랑', '미움', '분노', '슬픔', '기쁨', '두려움', '공포', '불안', '행복', '절망', '희망', '질투', '그리움', '외로', '설렘', '후회', '수치', '경악', '환희', '비통']
export interface EmotionDensityResult { perScene: { id: string; title: string; count: number; per1k: number }[]; total: number }
export function emotionDensity(scenes: Scene[]): EmotionDensityResult {
  const perScene = scenes.map((sc) => {
    let c = 0
    for (const w of EMOTION_WORDS) { let i = 0; while ((i = sc.text.indexOf(w, i)) !== -1) { c++; i += w.length } }
    const words = sc.words || wordTokens(sc.text).length || 1
    return { id: sc.id, title: sc.title, count: c, per1k: Math.round((c / words) * 1000 * 10) / 10 }
  })
  return { perScene, total: perScene.reduce((n, s) => n + s.count, 0) }
}
