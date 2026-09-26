// 단어 단위 LCS diff (스냅샷 비교, 프로젝트 치환 미리보기 등).
export interface DiffPart {
  type: 'eq' | 'add' | 'del'
  text: string
}

function tokenize(s: string): string[] {
  // 단어와 공백/구두점을 토큰으로 분리(공백 보존)
  return s.match(/\s+|[^\s]+/g) || []
}

export function diffWords(aStr: string, bStr: string): DiffPart[] {
  if (aStr === bStr) return aStr ? [{ type: 'eq', text: aStr }] : []
  const a = tokenize(aStr)
  const b = tokenize(bStr)
  const n = a.length
  const m = b.length
  // 매우 큰 입력은 O(n*m) 메모리 폭주 방지 — 거친 diff 로 대체
  if (n * m > 3_000_000) {
    const parts: DiffPart[] = []
    if (aStr) parts.push({ type: 'del', text: aStr })
    if (bStr) parts.push({ type: 'add', text: bStr })
    return parts
  }
  // LCS 길이 테이블
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const parts: DiffPart[] = []
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.type === type) last.text += text
    else parts.push({ type, text })
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('eq', a[i])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('del', a[i])
      i++
    } else {
      push('add', b[j])
      j++
    }
  }
  while (i < n) push('del', a[i++])
  while (j < m) push('add', b[j++])
  return parts
}

export function diffStats(parts: DiffPart[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const p of parts) {
    const w = (p.text.match(/[^\s]+/g) || []).length
    if (p.type === 'add') added += w
    else if (p.type === 'del') removed += w
  }
  return { added, removed }
}
