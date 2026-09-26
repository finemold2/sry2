// 워드딕트 워크플로 결과(JSON) 파일들을 읽어 src/tools/data/worddict.ts 로 병합 생성.
// 사용: node scripts/_mergedict.cjs <out1.json> <out2.json> ...
const fs = require('fs')
const files = process.argv.slice(2)
if (!files.length) { console.error('no input files'); process.exit(1) }

const byKey = new Map()
let totalWords = 0
for (const f of files) {
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { console.error('parse fail ' + f + ': ' + e.message); continue }
  const cats = (j.result && j.result.cats) || j.cats || []
  for (const c of cats) {
    if (!c || !c.key || !Array.isArray(c.groups)) continue
    // 그룹/단어 정리: 빈값 제거, 단어 중복 제거(그룹 내)
    const groups = c.groups.map((g) => ({
      sub: String(g.sub || '').trim(),
      words: [...new Set((g.words || []).map((w) => String(w).trim()).filter(Boolean))],
    })).filter((g) => g.sub && g.words.length)
    if (!groups.length) continue
    if (byKey.has(c.key)) {
      // 같은 key 면 그룹 병합
      const ex = byKey.get(c.key)
      ex.groups.push(...groups)
    } else {
      byKey.set(c.key, { key: c.key, label: String(c.label || c.key), icon: String(c.icon || '📝'), groups })
    }
  }
}
const cats = [...byKey.values()]
for (const c of cats) for (const g of c.groups) totalWords += g.words.length

const out =
  '// 글쓰기·소설쓰기 만능 단어·표현 사전 데이터. (scripts/_mergedict.cjs 로 워크플로 결과 병합 생성)\n' +
  '// 카테고리 ' + cats.length + '개 · 표현 ' + totalWords + '개. WritingDictionary 도구가 펼침 탐색/검색/무작위로 렌더.\n' +
  'export interface DictGroup { sub: string; words: string[] }\n' +
  'export interface DictCategory { key: string; label: string; icon: string; groups: DictGroup[] }\n\n' +
  'export const WORD_DICT: DictCategory[] = ' + JSON.stringify(cats, null, 0) + '\n'

fs.writeFileSync('src/tools/data/worddict.ts', out, 'utf8')
console.log('worddict.ts: ' + cats.length + ' categories, ' + totalWords + ' expressions')
