// 프로젝트 전체 텍스트 검색 엔진.
import { rtfToPlainText } from '../rtf'
import type { BinderItem, Project, SearchOptions } from '../model'

export const defaultSearchOptions: SearchOptions = {
  operator: 'all',
  scope: 'all',
  caseSensitive: false,
  wholeWord: false,
  invert: false,
  includeTrash: false,
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function inTrash(project: Project, id: string): boolean {
  let cur: string | null = id
  while (cur) {
    if (project.items[cur]?.root === 'trash') return true
    cur = project.items[cur]?.parentId ?? null
  }
  return false
}

function fieldText(project: Project, it: BinderItem, scope: SearchOptions['scope']): string {
  const body = () => it.plainText ?? (it.bodyRtf ? rtfToPlainText(it.bodyRtf) : '')
  const kw = () => it.keywordIds.map((id) => project.keywords.find((k) => k.id === id)?.name || '').join(' ')
  switch (scope) {
    case 'title':
      return it.title
    case 'text':
      return body()
    case 'synopsis':
      return it.synopsis
    case 'notes':
      return it.notes
    case 'keywords':
      return kw()
    case 'label':
      return project.labels.find((l) => l.id === it.labelId)?.name || ''
    case 'status':
      return project.statuses.find((st) => st.id === it.statusId)?.name || ''
    default:
      return [it.title, body(), it.synopsis, it.notes, kw()].join('\n')
  }
}

export function searchProject(project: Project, query: string, opts: SearchOptions): string[] {
  const q = query.trim()
  if (!q) return []
  const norm = (s: string) => (opts.caseSensitive ? s : s.toLowerCase())
  const terms = opts.operator === 'exact' ? [q] : q.split(/\s+/).filter(Boolean)

  const testTerm = (text: string, term: string): boolean => {
    const t = norm(text)
    const nt = norm(term)
    if (opts.wholeWord) return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeReg(nt)}([^\\p{L}\\p{N}]|$)`, 'u').test(t)
    return t.includes(nt)
  }

  const matches = (text: string): boolean => {
    if (opts.operator === 'all') return terms.every((t) => testTerm(text, t))
    if (opts.operator === 'any') return terms.some((t) => testTerm(text, t))
    return testTerm(text, q) // exact phrase
  }

  const out: string[] = []
  for (const it of Object.values(project.items)) {
    if (it.root) continue
    if (!opts.includeTrash && inTrash(project, it.id)) continue
    let hit = matches(fieldText(project, it, opts.scope))
    if (opts.invert) hit = !hit
    if (hit) out.push(it.id)
  }
  return out
}
