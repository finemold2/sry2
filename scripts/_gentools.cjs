// src/tools/*.tsx 중 `export const meta = {...}` 를 가진 도구 파일을 스캔해 registry.tsx 를 생성한다.
// 각 도구는 default export FC + named export meta(id,name,icon,group,intro?,w?,h?) 규약.
// 코드 스플리팅: meta 객체는 registry 에 인라인(데이터, 가벼움), Component 는 React.lazy 로 분리해
// 도구별 별도 청크로 떨어뜨린다(첫 로딩·PWA 프리캐시 최적화).
const fs = require('fs')
const dir = 'src/tools'
const skip = new Set(['ToolWindow.tsx', 'ToolHub.tsx', 'registry.tsx'])
const files = fs.readdirSync(dir).filter((f) => /\.tsx$/.test(f) && !skip.has(f)).sort()

// 소스에서 `export const meta = { ... }` 의 객체 리터럴을 중괄호 균형으로 추출한다.
function extractMeta(txt) {
  const m = txt.match(/export\s+const\s+meta\s*=\s*\{/)
  if (!m) return null
  let i = m.index + m[0].length - 1 // '{' 위치
  let depth = 0, inStr = null, prev = ''
  for (; i < txt.length; i++) {
    const c = txt[i]
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null
    } else if (c === '"' || c === "'" || c === '`') {
      inStr = c
    } else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        const start = txt.indexOf('{', m.index)
        return txt.slice(start, i + 1)
      }
    }
    prev = c
  }
  return null
}

// NUL 바이트 가드: 에이전트가 '\x00' 구분자를 실제 NUL 바이트로 기록하면 파일이 binary 로 판정되고
// 번들/검색이 깨진다. 스캔 중 NUL 을 발견하면 정식 이스케이프(\x00, 4글자)로 교정·재기록한다(런타임 동작 동일).
let nulFixed = 0
for (const f of files) {
  const raw = fs.readFileSync(dir + '/' + f)
  if (raw.includes(0)) {
    const repaired = Buffer.from(raw).toString('latin1').split(String.fromCharCode(0)).join('\\x00')
    fs.writeFileSync(dir + '/' + f, Buffer.from(repaired, 'latin1'))
    nulFixed++
    console.warn('  ⚠ NUL 바이트 교정: ' + f + ' (실제 NUL → \\x00 이스케이프)')
  }
}
if (nulFixed) console.warn('NUL 가드: ' + nulFixed + '개 파일 교정됨')

const entries = []
for (const f of files) {
  const txt = fs.readFileSync(dir + '/' + f, 'utf8')
  const lit = extractMeta(txt)
  if (!lit) continue
  const base = f.replace(/\.tsx$/, '')
  entries.push({ base, lit })
}

const list = entries
  .map((e) => `  { ...(${e.lit} as ToolMeta), Component: lazy(() => import('./${e.base}')) },`)
  .join('\n')

const out =
  `// 유틸리티 도구 레지스트리 — scripts/_gentools.cjs 로 자동 생성. 총 ${entries.length}개 도구.\n` +
  `// 각 도구 파일: export const meta = {id,name,icon,group,intro?,w?,h?} + export default FC.\n` +
  `// meta 는 인라인(가벼운 데이터), Component 는 lazy 청크로 분리.\n` +
  `import { lazy } from 'react'\n` +
  `import type { ComponentType } from 'react'\n\n` +
  `interface ToolMeta { id: string; name: string; icon: string; group: string; intro?: string; w?: number; h?: number; genre?: string }\n` +
  `export interface UtilityTool extends ToolMeta { Component: ComponentType<{ payload?: Record<string, unknown> }> }\n\n` +
  `export const UTILITY_TOOLS: UtilityTool[] = [\n${list}\n]\n\n` +
  `export const TOOL_GROUPS = (): string[] => [...new Set(UTILITY_TOOLS.map((t) => t.group))]\n`

fs.writeFileSync(dir + '/registry.tsx', out, 'utf8')
console.log('tools registry: ' + entries.length + ' tools wired (lazy) —', entries.map((e) => e.base).join(', '))
