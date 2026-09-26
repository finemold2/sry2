// 내보내기(export) 회귀 테스트. 실행: node --experimental-strip-types src/export/export.test.ts
// 1~3차 감사에서 고친 export 레이어 버그(epub nav 구조, latex/markdown URL 이스케이프, odt 정렬) 고정.
import JSZip from 'jszip'
import { sectionsToEpub } from './epub.ts'
import { sectionsToLatex } from './latex.ts'
import { sectionsToMarkdown, parseMarkdown } from './markdown.ts'
import { sectionsToOdt } from './odt.ts'

let pass = 0
let fail = 0
function ok(cond: boolean, msg: string) {
  if (cond) pass++
  else { fail++; console.error('  ✗ FAIL: ' + msg) }
}

// 스택 기반 XML well-formedness(검사 대상 영역엔 void 요소 없음)
function xmlWellFormed(s: string): boolean {
  const stack: string[] = []
  const re = /<(\/?)([a-zA-Z][\w:-]*)(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m[1] === '/') { if (stack.pop() !== m[2]) return false }
    else if (m[3] !== '/') stack.push(m[2])
  }
  return stack.length === 0
}

type Sec = { title: string; level: number; blocks: { type: string; align?: string; runs: { text: string; link?: string }[] }[] }
const meta = { title: '책', author: '저자' }

// 1) EPUB nav.xhtml: 비연속 level(갭)에서도 well-formed XML
for (const levels of [[2, 4], [0, 2, 1, 0], [3, 1], [0, 2, 4, 1], [5, 1, 5], [0, 1, 2, 1, 0]]) {
  const secs: Sec[] = levels.map((lvl, i) => ({ title: `S${i} <&> "${lvl}"`, level: lvl, blocks: [{ type: 'p', runs: [{ text: `b${i}` }] }] }))
  const blob = await sectionsToEpub(secs as never, meta)
  const zip = await JSZip.loadAsync(await (blob as unknown as Blob).arrayBuffer())
  const nav = (await zip.file('OEBPS/nav.xhtml')!.async('string'))
  const region = nav.slice(nav.indexOf('<nav'), nav.indexOf('</nav>') + 6)
  ok(xmlWellFormed(region), `EPUB nav well-formed for levels [${levels.join(',')}]`)
}

// 2) LaTeX: URL 의 & 가 \& 로 이스케이프(\href 컴파일 가능)
{
  const secs: Sec[] = [{ title: '제목', level: 1, blocks: [{ type: 'p', runs: [{ text: '링크', link: 'https://e.com/?a=1&b=2' }] }] }]
  const tex = sectionsToLatex(secs as never, meta)
  ok(/\\href\{https:\/\/e\.com\/\?a=1\\&b=2\}/.test(tex), 'LaTeX href escapes & to \\&')
}

// 3) Markdown: ')' 포함 URL 이 \) 로 이스케이프되어 유효하고, 왕복 시 원본 URL 복원
{
  const url = 'https://en.wikipedia.org/wiki/Apple_(disambiguation)'
  const secs: Sec[] = [{ title: '제목', level: 1, blocks: [{ type: 'p', runs: [{ text: '위키', link: url }] }] }]
  const md = sectionsToMarkdown(secs as never, meta)
  ok(md.includes('\\)'), 'Markdown escapes ) in URL')
  const blocks = parseMarkdown(md)
  const found = JSON.stringify(blocks).includes(url)
  ok(found, 'Markdown link URL round-trips losslessly')
}

// 4) ODT: blockquote/heading/list 항목의 명시적 정렬이 보존됨
{
  const secs: Sec[] = [{
    title: '제목', level: 1, blocks: [
      { type: 'blockquote', align: 'center', runs: [{ text: '인용' }] },
      { type: 'h2', align: 'right', runs: [{ text: '헤딩' }] },
      { type: 'li-ul', align: 'center', runs: [{ text: '항목' }] },
    ],
  }]
  const blob = await sectionsToOdt(secs as never, meta)
  const zip = await JSZip.loadAsync(await (blob as unknown as Blob).arrayBuffer())
  const content = await zip.file('content.xml')!.async('string')
  ok(content.includes('QuoteCenter'), 'ODT centered blockquote uses QuoteCenter style')
  ok(/<text:h[^>]*text:style-name="Right"/.test(content), 'ODT right-aligned heading carries Right style')
  ok(/<text:list-item><text:p text:style-name="Center">/.test(content), 'ODT centered list item carries Center style')
}

declare const process: { exit(code: number): never }
console.log(`\n내보내기 테스트: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) process.exit(1)
