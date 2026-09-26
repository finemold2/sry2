// 오프라인 글쓰기 스타일 분석(영/한). 부사, 수동태, 군더더기, 긴 문장, 반복, 가독성.
export interface StyleIssue {
  kind: string
  label: string
  count: number
  samples: string[]
  severity: 'info' | 'warn'
}
export interface StyleReport {
  sentences: number
  words: number
  avgSentenceLen: number
  readability: number // Flesch Reading Ease (영문 근사)
  issues: StyleIssue[]
}

const WEASEL_EN = ['very', 'really', 'quite', 'just', 'rather', 'somewhat', 'actually', 'basically', 'literally']
const WEASEL_KO = ['매우', '정말', '너무', '그냥', '사실', '약간', '조금', '굉장히', '되게']

function syllablesEn(w: string): number {
  w = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  const m = w.match(/[aeiouy]+/g)
  let n = m ? m.length : 1
  if (w.endsWith('e')) n = Math.max(1, n - 1)
  return Math.max(1, n)
}

export function analyzeStyle(text: string): StyleReport {
  const clean = text.replace(/\s+/g, ' ').trim()
  const sentenceArr = clean.split(/(?<=[.!?。！？…])\s+/).filter((s) => s.trim())
  const sentences = sentenceArr.length || (clean ? 1 : 0)
  const words = clean.match(/[\p{L}\p{N}]+/gu) || []
  const wc = words.length
  const avg = sentences ? wc / sentences : 0

  const issues: StyleIssue[] = []
  const add = (kind: string, label: string, samples: string[], severity: StyleIssue['severity'] = 'warn') => {
    if (samples.length) issues.push({ kind, label, count: samples.length, samples: samples.slice(0, 6), severity })
  }

  // 긴 문장
  const longS = sentenceArr.filter((s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length > 40)
  add('long', '긴 문장 (40단어 초과)', longS.map((s) => s.slice(0, 50) + '…'))

  // 영문 부사(-ly)
  const adverbs = (clean.match(/\b\w+ly\b/g) || []).filter((w) => !['family', 'only', 'reply', 'apply'].includes(w.toLowerCase()))
  add('adverb', '부사(-ly)', adverbs)

  // 수동태(영문)
  const passive = clean.match(/\b(?:was|were|is|are|been|being|be)\s+\w+(?:ed|en)\b/gi) || []
  add('passive', '수동태(추정)', passive)

  // 군더더기
  const lc = clean.toLowerCase()
  const weasel: string[] = []
  ;[...WEASEL_EN, ...WEASEL_KO].forEach((w) => {
    const re = new RegExp((/[a-z]/.test(w) ? '\\b' + w + '\\b' : w), 'gi')
    const m = lc.match(re)
    if (m) for (let i = 0; i < m.length; i++) weasel.push(w)
  })
  add('weasel', '군더더기/강조어', weasel)

  // 반복 단어
  const freq = new Map<string, number>()
  for (const w of words) {
    if (w.length < 3) continue
    const k = w.toLowerCase()
    freq.set(k, (freq.get(k) || 0) + 1)
  }
  const repeats = [...freq.entries()]
    .filter(([, c]) => c >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([w, c]) => `${w} ×${c}`)
  add('repeat', '자주 반복된 단어 (5회+)', repeats, 'info')

  // 가독성(영문 Flesch 근사)
  const syl = words.reduce((n, w) => n + syllablesEn(w), 0)
  const readability = wc && sentences ? 206.835 - 1.015 * (wc / sentences) - 84.6 * (syl / wc) : 0

  return {
    sentences,
    words: wc,
    avgSentenceLen: Math.round(avg * 10) / 10,
    readability: Math.round(readability),
    issues,
  }
}
