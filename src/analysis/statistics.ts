// 프로젝트/텍스트 통계 및 단어 빈도(CJK 대응).
import { rtfToPlainText } from '../rtf'
import { DRAFT_ROOT, type Project } from '../model'

export interface Stats {
  documents: number
  words: number
  chars: number
  charsNoSpaces: number
  paragraphs: number
  sentences: number
  pages: number
  readingMinutes: number
}

function draftTexts(project: Project, onlyIncluded: boolean): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    const it = project.items[id]
    if (!it) return
    if (it.type === 'text' && (!onlyIncluded || it.includeInCompile)) {
      out.push(it.plainText ?? (it.bodyRtf ? rtfToPlainText(it.bodyRtf) : ''))
    }
    it.childIds.forEach(walk)
  }
  project.items[DRAFT_ROOT]?.childIds.forEach(walk)
  return out
}

export function projectStatistics(project: Project, onlyIncluded = true): Stats {
  const texts = draftTexts(project, onlyIncluded)
  const full = texts.join('\n\n')
  const words = (full.match(/[\p{L}\p{N}]+/gu) || []).length
  const chars = full.length
  const charsNoSpaces = full.replace(/\s/g, '').length
  const paragraphs = texts.reduce((n, t) => n + t.split(/\n+/).filter((l) => l.trim()).length, 0)
  const sentences = (full.match(/[.!?。！？…]+/g) || []).length || (full.trim() ? 1 : 0)
  const wpp = project.settings.wordsPerPage || 300
  const wpm = project.settings.wordsPerMinute || 250
  return {
    documents: texts.length,
    words,
    chars,
    charsNoSpaces,
    paragraphs,
    sentences,
    pages: Math.max(1, Math.ceil(words / wpp)),
    readingMinutes: Math.max(1, Math.round(words / wpm)),
  }
}

export interface FreqEntry {
  word: string
  count: number
}

const STOPWORDS = new Set([
  '그',
  '이',
  '저',
  '것',
  '수',
  '등',
  '및',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'is',
  'it',
  'that',
])

export function wordFrequency(project: Project, limit = 40): FreqEntry[] {
  const full = draftTexts(project, true).join(' ').toLowerCase()
  const tokens = full.match(/[\p{L}\p{N}]+/gu) || []
  const map = new Map<string, number>()
  for (const t of tokens) {
    if (t.length < 2 || STOPWORDS.has(t)) continue
    map.set(t, (map.get(t) || 0) + 1)
  }
  return [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
