// LaTeX 내보내기(XeLaTeX/LuaLaTeX + kotex 로 한글). 라이브러리 없이 직접 생성.
import type { CompiledSection, EBlock, ERun } from '../compile/compile'

interface Meta {
  title: string
  author?: string
}

const BSL = String.fromCharCode(0xe000) // 백슬래시 자리표시자(사설영역 문자)
function esc(s: string): string {
  // 백슬래시는 자리표시자로 치환 후 마지막에 복원 — \textbackslash{} 의 중괄호가 재이스케이프되지 않게.
  return s
    .split('\\')
    .join(BSL)
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .split(BSL)
    .join('\\textbackslash{}')
}

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i

function imageTex(run: ERun): string {
  // LaTeX 는 data URL 을 직접 못 쓰고 \includegraphics 는 외부 파일이 필요하다.
  // 브라우저 단독 출력에서는 파일 첨부가 어려우므로, 본문에 자리표시 텍스트를 남겨
  // 이미지가 소리 없이 사라지지 않게 한다. data URL 은 주석으로 보존(복원 가능).
  const m = DATA_URL_RE.exec(run.image || '')
  const mime = m ? m[1] : 'image/unknown'
  const placeholder = '\\textit{[이미지 생략: 인라인 이미지는 LaTeX 에 포함되지 않음]}'
  // 주석은 \n 으로 분리(% 는 줄 끝까지 주석). data URL 전체를 보존하되 백슬래시/줄바꿈은 없으므로 안전.
  const comment = `% 이미지(${mime}) data URL: ${run.image || ''}\n`
  return `${comment}${placeholder}`
}

function runTex(run: ERun): string {
  if (run.image) return imageTex(run)
  let t = esc(run.text)
  if (run.strike) t = `\\sout{${t}}`
  if (run.underline) t = `\\underline{${t}}`
  if (run.superscript) t = `\\textsuperscript{${t}}`
  if (run.subscript) t = `\\textsubscript{${t}}`
  if (run.italic) t = `\\textit{${t}}`
  if (run.bold) t = `\\textbf{${t}}`
  if (run.link) t = `\\href{${run.link.replace(/([%#&])/g, '\\$1')}}{${t}}`
  return t
}

function blocksTex(blocks: EBlock[]): string {
  let out = ''
  let i = 0
  const headLevel = (t: string) => (t === 'h1' ? 'section' : t === 'h2' ? 'subsection' : 'subsubsection')
  while (i < blocks.length) {
    const b = blocks[i]
    const inner = b.runs.map(runTex).join('')
    if (b.type === 'hr') {
      out += '\\begin{center}\\rule{0.4\\linewidth}{0.4pt}\\end{center}\n'
      i++
    } else if (b.type === 'li-ul' || b.type === 'li-ol') {
      // 연속한 리스트 항목을 listLevel(중첩 깊이) 에 따라 itemize/enumerate 환경을
      // 가감하며 출력. 각 열린 환경의 타입을 스택으로 추적해 \begin/\end 짝을 맞춘다.
      const envOf = (t: string) => (t === 'li-ul' ? 'itemize' : 'enumerate')
      const stack: string[] = [] // 현재 열려 있는 환경(중첩) 스택. 닫을 때 정확한 env 이름 보존.
      const indent = (n: number) => '  '.repeat(n)
      const closeOne = () => { const e = stack.pop()!; out += `${indent(stack.length)}\\end{${e}}\n` }
      while (i < blocks.length && (blocks[i].type === 'li-ul' || blocks[i].type === 'li-ol')) {
        const cur = blocks[i]
        const env = envOf(cur.type)
        const level = Math.max(0, cur.listLevel ?? 0)
        // 목표 깊이(level+1)보다 깊으면 환경을 닫는다.
        while (stack.length > level + 1) closeOne()
        // 같은 깊이인데 환경 종류가 바뀌면(예: itemize↔enumerate) 그 단계를 닫고 다시 연다.
        if (stack.length === level + 1 && stack[level] !== env) closeOne()
        // 목표 깊이까지 환경을 연다.
        while (stack.length < level + 1) {
          out += `${indent(stack.length)}\\begin{${env}}\n`
          stack.push(env)
        }
        out += `${indent(stack.length)}\\item ${cur.runs.map(runTex).join('')}\n`
        i++
      }
      // 남은 환경 모두 닫기.
      while (stack.length) closeOne()
    } else if (/^h[1-4]$/.test(b.type)) {
      out += `\\${headLevel(b.type)}*{${inner}}\n`
      i++
    } else if (b.type === 'blockquote') {
      out += `\\begin{quote}\n${inner}\n\\end{quote}\n`
      i++
    } else {
      out += inner + '\n\n'
      i++
    }
  }
  return out
}

export function sectionsToLatex(sections: CompiledSection[], meta: Meta): string {
  let body = ''
  for (const sec of sections) {
    // 페이지 나눔: 해당 섹션 출력 직전에 새 페이지로(\clearpage 가 떠다니는 객체도 비움).
    if (sec.pageBreakBefore) body += '\\clearpage\n'
    if (sec.title.trim()) {
      const cmd = sec.level <= 1 ? 'section' : sec.level === 2 ? 'subsection' : 'subsubsection'
      body += `\\${cmd}{${esc(sec.title)}}\n`
    }
    body += blocksTex(sec.blocks)
  }
  const preamble = [
    '% XeLaTeX 또는 LuaLaTeX 로 컴파일하세요 (한글 지원).',
    '\\documentclass[12pt]{article}',
    '\\usepackage{kotex}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage[normalem]{ulem}',
    '\\usepackage{hyperref}',
    '\\usepackage{setspace}',
    '\\onehalfspacing',
    `\\title{${esc(meta.title)}}`,
    meta.author ? `\\author{${esc(meta.author)}}` : '\\author{}',
    '\\date{}',
  ].join('\n')
  return `${preamble}\n\\begin{document}\n\\maketitle\n\n${body}\n\\end{document}\n`
}
