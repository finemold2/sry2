// 소스에서 실제 사용된 이모지(그래핌, ZWJ 시퀀스 포함)만 Twemoji SVG 로 public/emoji 에 복사.
// twemoji 파일명 규칙(grabTheRightIcon): ZWJ 없으면 U+FE0F 제거 후 코드포인트 hex 를 '-' 로 연결.
const fs = require('fs'), path = require('path')
const SRC_SVG = 'node_modules/@twemoji/svg'
const OUT = 'public/emoji'
const U200D = 0x200d, UFE0F = 0xfe0f, UFE0E = 0xfe0e
function toCodePoint(str) {
  const cps = []
  for (const ch of str) cps.push(ch.codePointAt(0))
  return cps
}
function fileName(grapheme) {
  const cps = toCodePoint(grapheme)
  const hasZWJ = cps.includes(U200D)
  // ZWJ 시퀀스가 아니면 변형 선택자(VS16 FE0F·VS15 FE0E) 제거 — Twemoji 파일명 규칙과 동일(런타임 Emoji.tsx 와 일치 필수)
  const filtered = hasZWJ ? cps : cps.filter((c) => c !== UFE0F && c !== UFE0E)
  return filtered.map((c) => c.toString(16)).join('-')
}
function walk(d) { let o = []; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); if (s.isDirectory()) o = o.concat(walk(p)); else if (/\.(tsx|ts)$/.test(f)) o.push(p) } return o }
const pict = /\p{Extended_Pictographic}/u
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' })
const needed = new Set()
for (const f of walk('src')) {
  const t = fs.readFileSync(f, 'utf8')
  for (const { segment } of seg.segment(t)) {
    if (pict.test(segment)) needed.add(segment)
  }
}
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
let copied = 0, miss = [], bytes = 0
const missVariants = (g) => {
  // 폴백 후보: 그대로, fe0f 추가, 단일 코드포인트
  const cands = new Set([fileName(g)])
  const cps = toCodePoint(g)
  cands.add(cps.map((c) => c.toString(16)).join('-'))
  if (cps.length === 1) cands.add(cps[0].toString(16))
  return [...cands]
}
for (const g of needed) {
  let done = false
  for (const name of missVariants(g)) {
    const src = path.join(SRC_SVG, name + '.svg')
    if (fs.existsSync(src)) { const dst = path.join(OUT, name + '.svg'); fs.copyFileSync(src, dst); bytes += fs.statSync(dst).size; copied++; done = true; break }
  }
  if (!done) miss.push(g)
}
// 런타임 게이트용 매니페스트(보유 파일명 Set) 생성 — Emoji.tsx 가 보유분만 <img> 로, 나머지는 원문 텍스트로(404·루프 방지).
const names = fs.readdirSync(OUT).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, ''))
const manifest = 'src/ui/emoji-manifest.ts'
fs.writeFileSync(manifest, '// 자동 생성: node scripts/_copy_emoji.cjs. public/emoji 에 실제 존재하는 Twemoji 코드포인트 파일명 집합.\nexport const EMOJI_FILES: ReadonlySet<string> = new Set([\n' + names.map((n) => "  '" + n + "',").join('\n') + '\n])\n')
console.log('사용 그래핌: ' + needed.size + ', 복사: ' + copied + ' (' + (bytes / 1024).toFixed(0) + ' KB), 미스: ' + miss.length + ', 매니페스트 ' + names.length + '개 → ' + manifest)
if (miss.length) console.log('미스(Twemoji 미보유, 원문 이모지로 폴백): ' + miss.join(' '))
