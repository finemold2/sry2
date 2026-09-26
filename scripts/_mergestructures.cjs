// 장르 플롯 구조 워크플로 결과(JSON)를 src/templates/structures-genre.ts 로 병합.
// 사용: node scripts/_mergestructures.cjs <out.json>
const fs = require('fs')
const file = process.argv[2]
const j = JSON.parse(fs.readFileSync(file, 'utf8'))
const cats = (j.result && j.result.cats) || j.cats || []
const out = []
const seen = new Set()
for (const c of cats) {
  if (!c || !c.category || !Array.isArray(c.structures)) continue
  for (const st of c.structures) {
    if (!st || !st.id || !st.name || !Array.isArray(st.beats)) continue
    let id = String(st.id)
    while (seen.has(id)) id = id + '_'
    seen.add(id)
    // beats 정리: title/synopsis 필수, children 정리
    const beats = st.beats.map((bt) => {
      const o = { title: String(bt.title || '단계'), synopsis: String(bt.synopsis || '') }
      if (bt.folder) o.folder = true
      if (Array.isArray(bt.children) && bt.children.length) {
        o.children = bt.children.map((ch) => ({ title: String(ch.title || '장면'), synopsis: String(ch.synopsis || '') }))
        o.folder = true
      }
      return o
    })
    out.push({ id, category: c.category, name: String(st.name), desc: String(st.desc || ''), beats })
  }
}
const body =
  '// 장르별 플롯 구조(하부구조) — 대표작·작법 리서치 기반. (scripts/_mergestructures.cjs 로 생성)\n' +
  '// 총 ' + out.length + '개 하부구조 / 카테고리(장르)별 분류.\n' +
  "import type { Structure } from './structures'\n\n" +
  'export const GENRE_STRUCTURES: Structure[] = ' + JSON.stringify(out, null, 0) + '\n'
fs.writeFileSync('src/templates/structures-genre.ts', body, 'utf8')
const byCat = {}
for (const s of out) byCat[s.category] = (byCat[s.category] || 0) + 1
console.log('structures-genre.ts: ' + out.length + ' structures · ' + Object.keys(byCat).length + ' genres')
console.log(Object.entries(byCat).map(([k, v]) => k + '(' + v + ')').join(', '))
