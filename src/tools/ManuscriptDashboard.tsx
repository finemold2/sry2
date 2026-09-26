// 원고 종합 분석 대시보드 — 텍스트를 붙여넣으면(또는 좌측 바인더 파일을 끌어다 놓으면)
// 한 화면 카드들로 종합 진단한다: 글자/단어/문장/문단 수·평균 문장 길이·가독성 추정·
// 대화:지문 비율·부사/군더더기 비율·자주 쓴 단어 Top·문장 길이 분포·긴 문장 경고.
// ProWritingAid 요약식 리포트를 한눈에. addToProject 로 리포트 문서를 프로젝트에 저장,
// 수집함/글감 라이브러리에도 담을 수 있다.
//
// 외부 API 없음(전부 로컬 정규식·계산). react 와 './linkbus' 외 import 없음.
// Web API: navigator.clipboard(미지원 시 execCommand 폴백). 타이머/리스너는 언마운트 시 정리.
// 영속: localStorage 'sry:tool:manuscript-dashboard' (마지막 입력 텍스트).
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary,
  getDragItem, isItemDrag,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'manuscript-dashboard',
  name: '원고 분석 대시보드',
  icon: '📊',
  group: '교정·언어',
  intro: '원고를 붙여넣으면 분량·가독성·대화비율·부사/군더더기·자주 쓴 단어·긴 문장을 한 화면 카드로 종합 진단합니다',
  w: 660,
  h: 720,
}

const LS_KEY = 'sry:tool:manuscript-dashboard'

// ════════════════════════════════════════════════════════════════════════════
//  텍스트 분해 유틸 (전부 로컬, 형태소 분석 없이 정규식·휴리스틱)
// ════════════════════════════════════════════════════════════════════════════

// 문장 분리: 종결 부호(. ! ? 。！？… 및 연속) + 공백, 또는 개행을 경계로. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+["”’」』）)\]]?)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 문단 분리: 빈 줄(개행 2회 이상)을 경계로. 빈 줄이 없으면 단일 개행으로.
function splitParagraphs(text: string): string[] {
  const byBlank = text.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean)
  if (byBlank.length > 1) return byBlank
  return text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
}

const reHangul = /[가-힣]/
const reHangulSyllable = /[가-힣]/g
const reEnglishWord = /[A-Za-z][A-Za-z'’-]*/g

function countHangulSyllables(s: string): number {
  const m = s.match(reHangulSyllable)
  return m ? m.length : 0
}

// 단어 수: 한글 어절(한글 포함 토큰) + 영어 단어. 혼용 문서도 합산.
function countWords(s: string): number {
  const t = s.trim()
  if (!t) return 0
  const eojeol = t.split(/\s+/).filter((w) => reHangul.test(w)).length
  const enWords = (s.match(reEnglishWord) || []).length
  // 한글 어절에 영어가 섞인 토큰을 이중 집계하지 않도록: 순수 영어 단어만 따로 더한다.
  // (한글 토큰 안의 영어는 드물고, 합산은 근사이므로 단순 합으로 둔다.)
  return eojeol + enWords
}

// 공백 제외 글자수
function visibleLen(s: string): number {
  return [...s.replace(/\s/g, '')].length
}

// ── 가독성(언어 자동 판정) ───────────────────────────────────────────────
function langPrimary(text: string): 'ko' | 'en' | 'mix' {
  const ko = countHangulSyllables(text)
  const en = (text.match(reEnglishWord) || []).length
  const total = ko + en
  if (total === 0) return 'mix'
  const koR = ko / total
  return koR >= 0.6 ? 'ko' : koR <= 0.2 ? 'en' : 'mix'
}

function syllablesInWord(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  s = s.replace(/^y/, '')
  const groups = s.match(/[aeiouy]{1,2}/g)
  const n = groups ? groups.length : 0
  return n > 0 ? n : 1
}
function countEnglishSyllables(s: string): number {
  const m = s.match(reEnglishWord)
  if (!m) return 0
  return m.reduce((acc, w) => acc + syllablesInWord(w), 0)
}
function fleschReadingEase(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0
  const v = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  return Math.max(0, Math.min(100, v))
}
// 한국어 자체 근사 점수: 문장당 단어가 적을수록·긴 문장 비율이 낮을수록 높은 점수.
function koreanScore(avgWords: number, longRatio: number): number {
  const wordsPenalty = Math.max(0, avgWords - 9) * 4.2
  const longPenalty = longRatio * 38
  return Math.max(0, Math.min(100, 100 - wordsPenalty - longPenalty))
}
function gradeOf(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '아주 잘 읽힘', color: 'var(--ok)' }
  if (score >= 65) return { label: '잘 읽힘', color: 'var(--ok)' }
  if (score >= 50) return { label: '보통', color: 'var(--accent)' }
  if (score >= 35) return { label: '다소 빽빽함', color: 'var(--warn)' }
  return { label: '매우 빽빽함', color: 'var(--warn)' }
}

// ── 대화/지문 분리 ───────────────────────────────────────────────
interface QuotePair { open: string; close: string; sameChar: boolean }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”', sameChar: false },
  { open: '‘', close: '’', sameChar: false },
  { open: '「', close: '」', sameChar: false },
  { open: '『', close: '』', sameChar: false },
  { open: '"', close: '"', sameChar: true },
  { open: "'", close: "'", sameChar: true },
]
function parseDialogue(text: string): { dialogueChars: number; narrationChars: number; count: number } {
  const chars = [...text]
  let narration = ''
  let dialogueChars = 0
  let count = 0
  let i = 0
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)
  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (pair) {
      if (ch === "'" && isAlnum(chars[i - 1])) { narration += ch; i++; continue }
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
        if (cj === pair.close) { closed = true; break }
        if (cj === '\n' && chars[j + 1] === '\n') break
        inner += cj
        j++
      }
      if (closed) {
        const t = inner.trim()
        if (t.length > 0) { dialogueChars += visibleLen(t); count++ }
        i = j + 1
      } else { narration += ch; i++ }
    } else { narration += ch; i++ }
  }
  return { dialogueChars, narrationChars: visibleLen(narration), count }
}

// ── 부사 추정(한국어 '-게/-히/-이' 부사 + 잦은 부사) + 영어 -ly ──────────
const KO_COMMON_ADVERBS = [
  '매우', '아주', '너무', '정말', '진짜', '굉장히', '엄청', '몹시', '되게', '꽤', '제법',
  '상당히', '무척', '훨씬', '거의', '아마', '어쩌면', '그냥', '약간', '조금', '다소',
  '결국', '드디어', '마침내', '갑자기', '문득', '천천히', '빨리', '곧', '이미', '벌써',
  '항상', '늘', '자주', '가끔', '때때로', '언제나', '여전히', '아직', '점점', '점차',
  '완전히', '전혀', '결코', '도무지', '분명히', '확실히', '틀림없이', '물론', '역시',
]
// 한국어 부사 토큰 추정: 잦은 부사 사전 + '-게/-히/-이/-적으로/-스레' 어미 휴리스틱
function countKoreanAdverbs(tokens: string[]): number {
  let n = 0
  for (const raw of tokens) {
    const w = raw.replace(/[^가-힣]/g, '')
    if (!w) continue
    if (KO_COMMON_ADVERBS.includes(w)) { n++; continue }
    // '조용히', '천천히', '빠르게', '깨끗이', '정직하게' 등. 너무 짧은 건 제외.
    if (w.length >= 3 && /(히|게|이|스레)$/.test(w)) { n++; continue }
    if (w.length >= 4 && /적으로$/.test(w)) { n++; continue }
  }
  return n
}
function countEnglishAdverbs(text: string): number {
  const m = text.match(/[A-Za-z]+ly\b/g)
  return m ? m.length : 0
}

// ── 군더더기(필러/췌언) 어구 ──────────────────────────────────────────────
// 다어절 표현 포함 → 토큰이 아니라 텍스트에서 직접 매칭.
const FILLER_PHRASES = [
  '사실은', '사실', '솔직히', '그러니까', '말하자면', '어쨌든', '아무튼', '뭐랄까',
  '일종의', '어떤 의미에서', '기본적으로', '개인적으로', '결과적으로',
  '~인 것 같다', '것 같다', '같다는 생각', '라고 생각한다', '듯하다', '듯싶다',
  '정말로', '진짜로', '매우 많은', '굉장히 많은', '너무나도',
  '바로 그', '다름 아닌', '그야말로', '이른바', '소위',
  '하지만 그러나', '그리고 또한', '그래서 결국',
  '~수 있다는 점', '에 대해서', '에 관해서', '~와 같은',
]
function countFillers(text: string): { total: number; perPhrase: { phrase: string; n: number }[] } {
  let total = 0
  const per: { phrase: string; n: number }[] = []
  for (const phrase of FILLER_PHRASES) {
    const needle = phrase.replace(/^~/, '')
    if (!needle) continue
    let from = 0
    let n = 0
    while (true) {
      const idx = text.indexOf(needle, from)
      if (idx < 0) break
      n++
      from = idx + needle.length
    }
    if (n > 0) { total += n; per.push({ phrase, n }) }
  }
  per.sort((a, b) => b.n - a.n)
  return { total, perPhrase: per }
}

// ── 단어 빈도(불용어 제외) ──────────────────────────────────────────────
const STOPWORDS = new Set([
  // 한국어 조사/대명사/접속/초고빈도
  '그', '저', '이', '것', '수', '등', '들', '및', '또', '또는', '그리고', '하지만', '그러나',
  '그래서', '그런데', '때', '말', '날', '곳', '데', '한', '두', '세', '내', '네', '제',
  '나', '너', '우리', '저희', '그들', '그녀', '그는', '나는', '너는', '에서', '에게',
  '으로', '로서', '로써', '하고', '에는', '에도', '까지', '부터', '처럼', '만큼', '대로',
  '있다', '없다', '하다', '되다', '같다', '이다', '아니다', '보다', '주다', '말다',
  // 영어 stopwords
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'that', 'this', 'these', 'those',
  'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'his', 'her', 'their', 'our', 'my',
  'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'can', 'will', 'would', 'do', 'did',
  'have', 'has', 'had', 'from', 'up', 'out', 'about', 'into', 'over', 'after', 'all', 'one',
])
// 어절에서 흔한 조사/어미를 가볍게 벗겨 표제어 근사(완벽한 형태소 분석 아님).
const KO_PARTICLES = ['으로서', '으로써', '에서는', '에게서', '으로', '에서', '에게', '한테', '께서', '이라고', '라고', '라는', '이라는', '은', '는', '이', '가', '을', '를', '의', '도', '만', '과', '와', '에', '로', '며', '고', '서', '님']
function lemmaKo(token: string): string {
  let w = token.replace(/[^가-힣]/g, '')
  if (w.length <= 1) return w
  for (const p of KO_PARTICLES) {
    if (w.length - p.length >= 1 && w.endsWith(p)) { w = w.slice(0, w.length - p.length); break }
  }
  return w
}
function topWords(text: string, limit = 12): { word: string; n: number }[] {
  const counts = new Map<string, number>()
  // 영어 단어
  const en = text.toLowerCase().match(reEnglishWord) || []
  for (const w0 of en) {
    const w = w0.replace(/[^a-z]/g, '')
    if (w.length < 2 || STOPWORDS.has(w)) continue
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  // 한국어 어절 → 표제어 근사
  const koTokens = text.split(/[^가-힣]+/).filter(Boolean)
  for (const t of koTokens) {
    const w = lemmaKo(t)
    if (w.length < 2 || STOPWORDS.has(w)) continue
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([word, n]) => ({ word, n }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n || b.word.length - a.word.length)
    .slice(0, limit)
}

// ── 종합 분석 ───────────────────────────────────────────────────────────
const LONG_SENT_WORDS_KO = 25
const LONG_SENT_WORDS_EN = 30
const READ_WPM = 320 // 한국어 묵독 분당 단어(어절) 근사

interface SentInfo { text: string; words: number; isLong: boolean }
interface Analysis {
  primary: 'ko' | 'en' | 'mix'
  charCount: number
  charNoSpace: number
  wordCount: number
  sentCount: number
  paraCount: number
  avgWordsPerSent: number
  avgCharsPerSent: number
  avgWordsPerPara: number
  longSents: SentInfo[]
  longRatio: number
  readingSec: number
  score: number
  scoreLabel: string
  scoreColor: string
  scoreKind: 'flesch' | 'korean'
  dialoguePct: number
  narrationPct: number
  dialogueCount: number
  adverbs: number
  adverbRatio: number
  fillers: number
  fillerRatio: number
  fillerTop: { phrase: string; n: number }[]
  top: { word: string; n: number }[]
  sentLenBuckets: number[]
  sents: SentInfo[]
}

function analyze(text: string): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const sentences = splitSentences(trimmed)
  if (sentences.length === 0) return null
  const primary = langPrimary(trimmed)
  const longThreshold = primary === 'en' ? LONG_SENT_WORDS_EN : LONG_SENT_WORDS_KO

  const sents: SentInfo[] = sentences.map((s) => {
    const words = countWords(s)
    return { text: s, words, isLong: words >= longThreshold }
  })
  const sentCount = sents.length
  const wordCount = sents.reduce((a, s) => a + s.words, 0)
  const charCount = [...trimmed].length
  const charNoSpace = visibleLen(trimmed)
  const paras = splitParagraphs(trimmed)
  const paraCount = paras.length

  const longSents = sents.filter((s) => s.isLong)
  const longRatio = sentCount > 0 ? longSents.length / sentCount : 0
  const avgWordsPerSent = sentCount > 0 ? wordCount / sentCount : 0
  const avgCharsPerSent = sentCount > 0 ? charNoSpace / sentCount : 0
  const avgWordsPerPara = paraCount > 0 ? wordCount / paraCount : 0

  // 가독성
  let score: number, scoreKind: 'flesch' | 'korean'
  if (primary === 'en') {
    const syl = countEnglishSyllables(trimmed)
    score = fleschReadingEase(wordCount, sentCount, syl)
    scoreKind = 'flesch'
  } else {
    score = koreanScore(avgWordsPerSent, longRatio)
    scoreKind = 'korean'
  }
  const g = gradeOf(score)

  // 대화/지문
  const dlg = parseDialogue(text)
  const totalChars = dlg.dialogueChars + dlg.narrationChars
  const dialoguePct = totalChars > 0 ? (dlg.dialogueChars / totalChars) * 100 : 0
  const narrationPct = totalChars > 0 ? 100 - dialoguePct : 0

  // 부사
  const allTokens = trimmed.split(/\s+/)
  const adverbs = countKoreanAdverbs(allTokens) + countEnglishAdverbs(trimmed)
  const adverbRatio = wordCount > 0 ? adverbs / wordCount : 0

  // 군더더기
  const f = countFillers(trimmed)
  const fillerRatio = wordCount > 0 ? f.total / wordCount : 0

  // 단어 Top
  const top = topWords(trimmed, 12)

  // 문장 길이 분포 버킷: [1-5,6-10,11-15,16-20,21-25,26-30,31+]
  const buckets = [0, 0, 0, 0, 0, 0, 0]
  for (const s of sents) {
    const w = s.words
    const idx = w <= 5 ? 0 : w <= 10 ? 1 : w <= 15 ? 2 : w <= 20 ? 3 : w <= 25 ? 4 : w <= 30 ? 5 : 6
    buckets[idx]++
  }

  const readingSec = Math.round((wordCount / READ_WPM) * 60)

  return {
    primary, charCount, charNoSpace, wordCount, sentCount, paraCount,
    avgWordsPerSent, avgCharsPerSent, avgWordsPerPara,
    longSents, longRatio, readingSec,
    score, scoreLabel: g.label, scoreColor: g.color, scoreKind,
    dialoguePct, narrationPct, dialogueCount: dlg.count,
    adverbs, adverbRatio,
    fillers: f.total, fillerRatio, fillerTop: f.perPhrase.slice(0, 8),
    top, sentLenBuckets: buckets, sents,
  }
}

// HTML escape (리포트 bodyHtml 용)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fmtDuration(sec: number): string {
  if (sec < 60) return `약 ${sec}초`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `약 ${m}분 ${s}초` : `약 ${m}분`
}

// ════════════════════════════════════════════════════════════════════════════
//  컴포넌트
// ════════════════════════════════════════════════════════════════════════════
export default function ManuscriptDashboard({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState<string>(() => {
    try {
      const fromPayload = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
      if (fromPayload) return fromPayload
      return localStorage.getItem(LS_KEY) || ''
    } catch { return '' }
  })
  const [toast, setToast] = useState('')
  const [showAllLong, setShowAllLong] = useState(false)
  const [dropActive, setDropActive] = useState(false)

  const aliveRef = useRef(true)
  const toastTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const dropDepth = useRef(0)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (toastTimer.current != null) clearTimeout(toastTimer.current)
      if (saveTimer.current != null) clearTimeout(saveTimer.current)
    }
  }, [])

  // 페이로드로 텍스트가 늦게 오는 경우 반영
  useEffect(() => {
    const p = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (p && p !== text) setText(p)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 디바운스 저장(영속)
  useEffect(() => {
    if (saveTimer.current != null) clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(LS_KEY, text)
        else localStorage.removeItem(LS_KEY)
      } catch { /* 용량 초과 등 무시 */ }
    }, 600)
    return () => { if (saveTimer.current != null) clearTimeout(saveTimer.current) }
  }, [text])

  const a = useMemo(() => {
    try { return analyze(text) } catch { return null }
  }, [text])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (aliveRef.current) setToast('') }, 2200)
  }

  // ── 리포트(텍스트/HTML) ──────────────────────────────────────────────
  const reportText = useMemo(() => {
    if (!a) return ''
    const L: string[] = []
    L.push('[원고 분석 대시보드 리포트]')
    L.push('')
    L.push('▶ 분량')
    L.push(`  글자수 ${a.charCount}자 (공백 제외 ${a.charNoSpace}자) · 단어 ${a.wordCount} · 문장 ${a.sentCount} · 문단 ${a.paraCount}`)
    L.push(`  예상 낭독/묵독 시간: ${fmtDuration(a.readingSec)}`)
    L.push('')
    L.push('▶ 문장 길이')
    L.push(`  평균 문장 길이 ${a.avgWordsPerSent.toFixed(1)}단어 (${a.avgCharsPerSent.toFixed(0)}자) · 문단당 ${a.avgWordsPerPara.toFixed(1)}단어`)
    L.push(`  긴 문장 ${a.longSents.length}개 (${Math.round(a.longRatio * 100)}%)`)
    L.push('')
    L.push('▶ 가독성')
    L.push(`  ${a.scoreKind === 'flesch' ? 'Flesch Reading Ease(근사)' : '한국어 가독성(근사)'}: ${Math.round(a.score)}/100 — ${a.scoreLabel}`)
    L.push('')
    L.push('▶ 대화 : 지문')
    L.push(`  대사 ${Math.round(a.dialoguePct)}% : 지문 ${Math.round(a.narrationPct)}% · 대사 ${a.dialogueCount}개`)
    L.push('')
    L.push('▶ 문장 다듬기')
    L.push(`  부사 ${a.adverbs}개 (${(a.adverbRatio * 100).toFixed(1)}%) · 군더더기 ${a.fillers}개 (${(a.fillerRatio * 100).toFixed(1)}%)`)
    if (a.fillerTop.length) L.push(`  잦은 군더더기: ${a.fillerTop.map((f) => `${f.phrase}(${f.n})`).join(', ')}`)
    L.push('')
    if (a.top.length) {
      L.push('▶ 자주 쓴 단어')
      L.push('  ' + a.top.map((t) => `${t.word}(${t.n})`).join(', '))
      L.push('')
    }
    if (a.longSents.length) {
      L.push('▶ 긴 문장 경고')
      a.longSents.slice(0, 10).forEach((s, i) => {
        L.push(`  ${i + 1}. (${s.words}단어) ${s.text.length > 80 ? s.text.slice(0, 80) + '…' : s.text}`)
      })
    }
    return L.join('\n')
  }, [a])

  const reportHtml = useMemo(() => {
    if (!a) return ''
    const p: string[] = []
    const row = (label: string, val: string) =>
      `<tr><td style="padding:4px 10px;color:#888;white-space:nowrap;">${esc(label)}</td><td style="padding:4px 10px;font-weight:600;">${esc(val)}</td></tr>`
    p.push(`<h2>원고 분석 대시보드 리포트</h2>`)
    p.push(`<h3>분량</h3><table>`)
    p.push(row('글자수', `${a.charCount}자 (공백 제외 ${a.charNoSpace}자)`))
    p.push(row('단어 / 문장 / 문단', `${a.wordCount} / ${a.sentCount} / ${a.paraCount}`))
    p.push(row('예상 낭독·묵독 시간', fmtDuration(a.readingSec)))
    p.push(`</table>`)
    p.push(`<h3>문장 길이</h3><table>`)
    p.push(row('평균 문장 길이', `${a.avgWordsPerSent.toFixed(1)}단어 (${a.avgCharsPerSent.toFixed(0)}자)`))
    p.push(row('문단당 단어', `${a.avgWordsPerPara.toFixed(1)}`))
    p.push(row('긴 문장', `${a.longSents.length}개 (${Math.round(a.longRatio * 100)}%)`))
    p.push(`</table>`)
    p.push(`<h3>가독성</h3><table>`)
    p.push(row(a.scoreKind === 'flesch' ? 'Flesch Reading Ease(근사)' : '한국어 가독성(근사)', `${Math.round(a.score)}/100 — ${a.scoreLabel}`))
    p.push(`</table>`)
    p.push(`<h3>대화 : 지문</h3><table>`)
    p.push(row('비율', `대사 ${Math.round(a.dialoguePct)}% : 지문 ${Math.round(a.narrationPct)}%`))
    p.push(row('대사 개수', `${a.dialogueCount}개`))
    p.push(`</table>`)
    p.push(`<h3>문장 다듬기</h3><table>`)
    p.push(row('부사', `${a.adverbs}개 (${(a.adverbRatio * 100).toFixed(1)}%)`))
    p.push(row('군더더기', `${a.fillers}개 (${(a.fillerRatio * 100).toFixed(1)}%)`))
    if (a.fillerTop.length) p.push(row('잦은 군더더기', a.fillerTop.map((f) => `${f.phrase}(${f.n})`).join(', ')))
    p.push(`</table>`)
    if (a.top.length) {
      p.push(`<h3>자주 쓴 단어</h3><p>${esc(a.top.map((t) => `${t.word}(${t.n})`).join(', '))}</p>`)
    }
    if (a.longSents.length) {
      p.push(`<h3>긴 문장 경고 (${a.longSents.length}개)</h3><ol>`)
      a.longSents.slice(0, 20).forEach((s) => {
        p.push(`<li><strong>${s.words}단어</strong> — ${esc(s.text)}</li>`)
      })
      p.push(`</ol>`)
    }
    p.push(`<p style="color:#888;font-size:12px;">※ 형태소 분석 없이 정규식·휴리스틱으로 계산한 근사값입니다.</p>`)
    return p.join('')
  }, [a])

  // ── 액션 ──────────────────────────────────────────────────────────────
  const fallbackCopy = (s: string): boolean => {
    try {
      const ta = document.createElement('textarea')
      ta.value = s
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus(); ta.select(); ta.setSelectionRange(0, s.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
  const copyReport = async () => {
    if (!reportText) return
    try {
      await navigator.clipboard.writeText(reportText)
      flash('리포트를 클립보드에 복사했습니다.')
    } catch {
      flash(fallbackCopy(reportText) ? '리포트를 클립보드에 복사했습니다.' : '복사에 실패했습니다.')
    }
  }
  const saveToProject = () => {
    if (!a) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '원고 분석',
      title: `원고 분석 — ${a.charCount}자 · 가독성 ${Math.round(a.score)}`,
      bodyHtml: reportHtml,
      synopsis: `단어 ${a.wordCount} · 문장 ${a.sentCount} · 대사 ${Math.round(a.dialoguePct)}%`,
      meta: {
        글자수: `${a.charCount}`,
        단어: `${a.wordCount}`,
        문장: `${a.sentCount}`,
        문단: `${a.paraCount}`,
        가독성: `${Math.round(a.score)}/100`,
        '대사비율': `${Math.round(a.dialoguePct)}%`,
        '부사비율': `${(a.adverbRatio * 100).toFixed(1)}%`,
        '긴문장': `${a.longSents.length}`,
      },
    })
    flash(id ? '프로젝트 자료 〈원고 분석〉 폴더에 리포트를 저장했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }
  const stashReport = () => {
    if (!reportText || !hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `원고 분석 리포트 (${a?.charCount ?? 0}자)`, text: reportText })
    flash('수집함에 리포트를 담았습니다.')
  }
  const saveLongAsSnippets = () => {
    if (!a || a.longSents.length === 0) { flash('저장할 긴 문장이 없습니다.'); return }
    a.longSents.slice(0, 30).forEach((s) => {
      addToLibrary('snippets', { text: s.text, source: '원고 분석 — 긴 문장', tags: ['긴문장', '교정'] })
    })
    flash(`긴 문장 ${Math.min(a.longSents.length, 30)}개를 글감 라이브러리에 저장했습니다.`)
  }

  // ── 바인더 파일 드롭 ────────────────────────────────────────────────────
  const onDropItem = (e: React.DragEvent) => {
    dropDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (it && typeof it.text === 'string' && it.text.trim()) {
      e.preventDefault()
      setText(it.text)
      flash(`바인더 파일 "${it.title}"을(를) 불러왔습니다.`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  스타일
  // ════════════════════════════════════════════════════════════════════════
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', position: 'relative' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 92, maxHeight: 200, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const cardTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }
  const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'baseline', gap: 4, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 12 }

  const bucketLabels = ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30', '31+']
  const maxBucket = a ? Math.max(1, ...a.sentLenBuckets) : 1
  const maxTop = a && a.top.length ? a.top[0].n : 1

  // 가독성 점수 게이지
  const ScoreGauge = ({ score, color, label, caption }: { score: number; color: string; label: string; caption: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, minWidth: 70, textAlign: 'center', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{Math.round(score)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{caption}</div>
        <div style={{ height: 7, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: '100%', background: color, transition: 'width .3s' }} />
        </div>
      </div>
    </div>
  )

  // 비율 평가 도우미(부사/군더더기)
  const ratioBadge = (ratio: number, warnAt: number, dangerAt: number): { label: string; color: string } => {
    if (ratio >= dangerAt) return { label: '많음', color: 'var(--warn)' }
    if (ratio >= warnAt) return { label: '다소 많음', color: 'var(--accent)' }
    return { label: '적당', color: 'var(--ok)' }
  }
  const advBadge = a ? ratioBadge(a.adverbRatio, 0.06, 0.12) : null
  const fillerBadge = a ? ratioBadge(a.fillerRatio, 0.02, 0.05) : null

  return (
    <div
      style={{ ...wrap, outline: dropActive ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dropDepth.current += 1; setDropActive(true) } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dropDepth.current = Math.max(0, dropDepth.current - 1); if (dropDepth.current === 0) setDropActive(false) } }}
      onDrop={onDropItem}
    >
      <div style={bar}>
        <div style={titleStyle}><Emoji e="📊"/> 분석할 원고를 붙여넣으세요 <span style={{ fontSize: 11 }}>(좌측 바인더 파일을 끌어다 놓아도 됩니다)</span></div>
        <button className="minibtn" onClick={() => { setText(''); setShowAllLong(false) }} disabled={!text}>↺ 지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'여기에 원고(장면/챕터 본문)를 붙여넣으세요.\n분량·가독성·대화비율·부사/군더더기·자주 쓴 단어·긴 문장을 한눈에 진단합니다.'}
        spellCheck={false}
        aria-label="원고 분석 입력"
      />

      {!a ? (
        <div style={empty}>
          원고를 입력하면 종합 진단 카드가 표시됩니다.<br />
          분량 · 평균 문장 길이 · 가독성 추정 · 대화:지문 비율<br />
          부사·군더더기 비율 · 자주 쓴 단어 Top · 긴 문장 경고
        </div>
      ) : (
        <div style={scroll}>
          {/* ── 분량 ── */}
          <div style={card}>
            <div style={cardTitle}><Emoji e="🧮"/> 분량</div>
            <div style={grid4}>
              <div style={stat}><div style={statVal}>{a.charCount.toLocaleString()}</div><div style={statLabel}>글자</div></div>
              <div style={stat}><div style={statVal}>{a.wordCount.toLocaleString()}</div><div style={statLabel}>단어</div></div>
              <div style={stat}><div style={statVal}>{a.sentCount.toLocaleString()}</div><div style={statLabel}>문장</div></div>
              <div style={stat}><div style={statVal}>{a.paraCount.toLocaleString()}</div><div style={statLabel}>문단</div></div>
            </div>
            <div style={hint}>공백 제외 {a.charNoSpace.toLocaleString()}자 · 예상 낭독/묵독 {fmtDuration(a.readingSec)}</div>
          </div>

          {/* ── 가독성 ── */}
          <div style={card}>
            <div style={cardTitle}>
              <Emoji e="📏"/> 가독성 추정 ({a.scoreKind === 'flesch' ? 'Flesch Reading Ease 근사' : '한국어 근사 점수'})
            </div>
            <ScoreGauge
              score={a.score}
              color={a.scoreColor}
              label={a.scoreLabel}
              caption={`평균 문장 ${a.avgWordsPerSent.toFixed(1)}단어 · 긴 문장 ${Math.round(a.longRatio * 100)}%`}
            />
          </div>

          {/* ── 문장 길이 ── */}
          <div style={card}>
            <div style={cardTitle}><Emoji e="📐"/> 문장 길이</div>
            <div style={grid3}>
              <div style={stat}><div style={statVal}>{a.avgWordsPerSent.toFixed(1)}</div><div style={statLabel}>문장당 단어</div></div>
              <div style={stat}><div style={statVal}>{a.avgCharsPerSent.toFixed(0)}</div><div style={statLabel}>문장당 글자</div></div>
              <div style={stat}><div style={statVal}>{a.avgWordsPerPara.toFixed(1)}</div><div style={statLabel}>문단당 단어</div></div>
            </div>
            {/* 분포 막대 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64, marginTop: 2 }}>
              {a.sentLenBuckets.map((n, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{n || ''}</div>
                  <div
                    title={`${bucketLabels[i]}단어: ${n}문장`}
                    style={{
                      width: '100%',
                      height: `${Math.max(n > 0 ? 6 : 2, (n / maxBucket) * 44)}px`,
                      background: i >= 5 ? 'var(--warn)' : 'var(--accent)',
                      opacity: n > 0 ? 0.9 : 0.18,
                      borderRadius: 4, transition: 'height .3s',
                    }}
                  />
                  <div style={{ fontSize: 9.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{bucketLabels[i]}</div>
                </div>
              ))}
            </div>
            <div style={hint}>막대: 단어 수 구간별 문장 수 · 26단어 이상(주황)이 많으면 끊어 쓰면 좋습니다.</div>
          </div>

          {/* ── 대화 : 지문 ── */}
          <div style={card}>
            <div style={cardTitle}><Emoji e="💬"/> 대화 : 지문 비율 (공백 제외 글자수)</div>
            <div style={{ display: 'flex', height: 30, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ width: `${a.dialoguePct}%`, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
                {a.dialoguePct >= 16 ? `대사 ${Math.round(a.dialoguePct)}%` : ''}
              </div>
              <div style={{ width: `${a.narrationPct}%`, background: 'var(--chrome-2)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {a.narrationPct >= 16 ? `지문 ${Math.round(a.narrationPct)}%` : ''}
              </div>
            </div>
            <div style={bar}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>● 대사 {Math.round(a.dialoguePct)}%</span>
                {'  '}<span style={{ fontWeight: 700 }}>● 지문 {Math.round(a.narrationPct)}%</span>
                {'  '}대사 {a.dialogueCount}개
              </div>
              {hasProjectBridge() && (
                <button className="linkbtn" onClick={() => openToolLinked('dialogue-ratio', { text })}>대화/지문 자세히 →</button>
              )}
            </div>
          </div>

          {/* ── 문장 다듬기(부사/군더더기) ── */}
          <div style={card}>
            <div style={cardTitle}><Emoji e="✂️"/> 문장 다듬기</div>
            <div style={grid3}>
              <div style={stat}>
                <div style={statVal}>{a.adverbs}</div>
                <div style={statLabel}>부사</div>
                {advBadge && <div style={{ fontSize: 10.5, fontWeight: 700, color: advBadge.color, marginTop: 2 }}>{(a.adverbRatio * 100).toFixed(1)}% · {advBadge.label}</div>}
              </div>
              <div style={stat}>
                <div style={statVal}>{a.fillers}</div>
                <div style={statLabel}>군더더기</div>
                {fillerBadge && <div style={{ fontSize: 10.5, fontWeight: 700, color: fillerBadge.color, marginTop: 2 }}>{(a.fillerRatio * 100).toFixed(1)}% · {fillerBadge.label}</div>}
              </div>
              <div style={stat}>
                <div style={statVal}>{a.longSents.length}</div>
                <div style={statLabel}>긴 문장</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: a.longRatio >= 0.2 ? 'var(--warn)' : 'var(--ok)', marginTop: 2 }}>{Math.round(a.longRatio * 100)}%</div>
              </div>
            </div>
            {a.fillerTop.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {a.fillerTop.map((f, i) => (
                  <span key={i} style={chip}><span>{f.phrase}</span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{f.n}</span></span>
                ))}
              </div>
            )}
            <div style={bar}>
              <div style={hint}>부사·상투적 군더더기를 줄이면 문장이 단단해집니다.</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="linkbtn" onClick={() => openToolLinked('adverb-highlighter', { text })}>부사 하이라이트 →</button>
                <button className="linkbtn" onClick={() => openToolLinked('filler-word-ko', { text })}>군더더기 →</button>
              </div>
            </div>
          </div>

          {/* ── 자주 쓴 단어 ── */}
          {a.top.length > 0 && (
            <div style={card}>
              <div style={bar}>
                <div style={cardTitle}><Emoji e="🔁"/> 자주 쓴 단어 Top {a.top.length}</div>
                <button className="linkbtn" onClick={() => openToolLinked('word-frequency', { text })}>단어 빈도 →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {a.top.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 92, minWidth: 92, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.word}</div>
                    <div style={{ flex: 1, height: 14, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(t.n / maxTop) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 30, textAlign: 'right', fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{t.n}</div>
                  </div>
                ))}
              </div>
              <div style={hint}>조사·어미를 가볍게 벗긴 표제어 근사입니다(2회 이상만).</div>
            </div>
          )}

          {/* ── 긴 문장 경고 ── */}
          {a.longSents.length > 0 && (
            <div style={card}>
              <div style={bar}>
                <div style={cardTitle}><Emoji e="⚠️"/> 긴 문장 경고 ({a.longSents.length}개)</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {a.longSents.length > 6 && (
                    <button className="minibtn" onClick={() => setShowAllLong((v) => !v)}>{showAllLong ? '접기 ▲' : '모두 보기 ▼'}</button>
                  )}
                  <button className="minibtn" onClick={saveLongAsSnippets}><Emoji e="🧩"/> 글감 저장</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(showAllLong ? a.longSents : a.longSents.slice(0, 6)).map((s, i) => (
                  <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '7px 10px', fontSize: 13, lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--warn)', fontWeight: 700, fontSize: 11, marginRight: 6 }}>{s.words}단어</span>
                    <span>{s.text.length > 160 ? s.text.slice(0, 160) + '…' : s.text}</span>
                  </div>
                ))}
              </div>
              <div style={hint}>{a.primary === 'en' ? `${LONG_SENT_WORDS_EN}` : `${LONG_SENT_WORDS_KO}`}단어 이상을 긴 문장으로 봅니다.</div>
            </div>
          )}

          {/* ── 액션 ── */}
          <div style={{ ...bar, gap: 8, paddingTop: 2 }}>
            <div style={hint}>형태소 분석 없이 정규식·휴리스틱으로 계산한 근사값입니다.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={copyReport}><Emoji e="📋"/> 리포트 복사</button>
              {hasStash() && <button className="minibtn" onClick={stashReport}><Emoji e="🧺"/> 수집함에 담기</button>}
              {hasProjectBridge() && <button className="btn-primary" onClick={saveToProject}><Emoji e="📄"/> 프로젝트에 추가</button>}
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--paper)', padding: '8px 14px', borderRadius: 8,
          fontSize: 12.5, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,.25)', maxWidth: '90%',
          textAlign: 'center', zIndex: 5, pointerEvents: 'none',
        }}>{toast}</div>
      )}
    </div>
  )
}
