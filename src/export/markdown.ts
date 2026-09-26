// Markdown 내보내기/가져오기 — 외부 라이브러리 없이 직접 구현.
// 브라우저 전용(순수 함수, DOM/Node 전용 API 미사용). UTF-8 문자열만 다루므로
// 한글/유니코드 손상 없음.
//
// 공용 문서 모델은 이 파일 안에서 자체적으로 export 한다(외부 import 금지).
// 앱의 RTF Block/Run 과 구조적으로 동일하되, EBlockType 에는 'hr' 이 추가되어 있다.

// ---------- 공용 문서 모델 (자체 정의) ----------

/** 인라인 텍스트 조각과 그 서식. */
export interface ERun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  fontSize?: number // 포인트(pt)
  fontFamily?: string
  color?: string // '#rrggbb'
  highlight?: string
  link?: string
  /** 인라인 이미지 data URL(+선택 크기). 컴파일 모델의 평탄 ERun 과 동일. */
  image?: string
  imageW?: number
  imageH?: number
}

/** 블록 종류. 'hr' 은 수평선(가로줄). */
export type EBlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'blockquote'
  | 'li-ul'
  | 'li-ol'
  | 'hr'

/** 한 줄/문단 단위 블록. */
export interface EBlock {
  type: EBlockType
  align?: 'left' | 'center' | 'right' | 'justify'
  runs: ERun[]
  /** 리스트 중첩 깊이(0부터). li-ul / li-ol 에만 의미. */
  listLevel?: number
}

/** 컴파일된 한 섹션(문서/폴더). */
export interface ESection {
  title: string
  level: number
  blocks: EBlock[]
  /** 이 섹션 앞에서 페이지 나눔(문서의 pageBreakBefore + honorPageBreaks). */
  pageBreakBefore?: boolean
}

/** 문서 메타데이터. */
export interface EMeta {
  title: string
  author?: string
  language?: string
}

// ---------- 모델 -> Markdown ----------

/**
 * 텍스트 안에서 Markdown 으로 해석될 수 있는 특수 문자를 이스케이프한다.
 * 인라인 서식(별표/물결/대괄호 등)이 의도치 않게 적용되는 것을 막는다.
 * 단, 줄바꿈은 보존한다(이스케이프 대상 아님).
 */
function escapeInline(text: string): string {
  // 백슬래시를 먼저 처리해야 이후에 추가되는 백슬래시가 다시 이스케이프되지 않는다.
  return text.replace(/([\\`*_{}\[\]()#+\-.!~<>|])/g, '\\$1')
}

/**
 * 하나의 ERun 을 Markdown 인라인 문자열로 변환한다.
 * bold -> **, italic -> *, strike -> ~~, link -> [text](url).
 * (인라인 코드는 사용하지 않는다.)
 */
function runToMd(run: ERun): string {
  // 인라인 이미지: data URL 이 있으면 마크다운 이미지로 출력. 같은 런의 텍스트가 있으면 alt 로 사용.
  // (data:image/...;base64,... 형식만 허용.)
  if (run.image && /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.test(run.image)) {
    const alt = run.text ? escapeInline(run.text) : ''
    // URL 의 ')' 를 이스케이프해 이미지 구문을 깨지 않게 함(data URL 엔 보통 없으나 방어적).
    const safeUrl = run.image.replace(/\)/g, '%29')
    return `![${alt}](${safeUrl})`
  }

  // 빈 텍스트는 서식을 적용해도 의미가 없으므로 빈 문자열 반환.
  if (run.text === '') return ''

  // 줄바꿈을 보존하면서 각 줄을 개별적으로 이스케이프한다.
  let inner = run.text
    .split('\n')
    .map((line) => escapeInline(line))
    .join('\n')

  // 안쪽부터 바깥쪽 순서로 감싼다. (strike -> italic -> bold)
  if (run.strike) inner = `~~${inner}~~`
  if (run.italic) inner = `*${inner}*`
  if (run.bold) inner = `**${inner}**`

  // 링크는 가장 바깥에서 감싼다. 링크 텍스트가 비어 있으면 URL 을 표시.
  if (run.link) {
    // URL 의 백슬래시와 ')' 를 이스케이프해 유효한 CommonMark 를 생성(`)` 를 포함한 URL 이 링크를 깨뜨리지 않도록).
    const safeUrl = run.link.replace(/\\/g, '\\\\').replace(/\)/g, '\\)')
    const label = inner === '' ? escapeInline(run.link) : inner
    inner = `[${label}](${safeUrl})`
  }
  return inner
}

/** 여러 run 을 이어 붙여 한 블록의 인라인 텍스트를 만든다. */
function runsToMd(runs: ERun[]): string {
  return runs.map(runToMd).join('')
}

/** 리스트 들여쓰기(listLevel 1단계당 공백 2칸). */
function listIndent(level: number | undefined): string {
  const lv = level && level > 0 ? level : 0
  return '  '.repeat(lv)
}

/** 헤더 종류를 '#' 개수로 변환. */
function headingHashes(type: EBlockType): string {
  switch (type) {
    case 'h1':
      return '#'
    case 'h2':
      return '##'
    case 'h3':
      return '###'
    case 'h4':
      return '####'
    default:
      return ''
  }
}

/** 하나의 블록을 Markdown 한 덩어리로 변환. */
function blockToMd(block: EBlock): string {
  const type = block.type

  if (type === 'hr') return '---'

  if (type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4') {
    return `${headingHashes(type)} ${runsToMd(block.runs)}`
  }

  if (type === 'blockquote') {
    // 인용 안의 여러 줄도 각 줄마다 '> ' 를 붙인다.
    const text = runsToMd(block.runs)
    return text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
  }

  if (type === 'li-ul') {
    return `${listIndent(block.listLevel)}- ${runsToMd(block.runs)}`
  }

  if (type === 'li-ol') {
    return `${listIndent(block.listLevel)}1. ${runsToMd(block.runs)}`
  }

  // 'p' 및 그 외: 단순 텍스트.
  return runsToMd(block.runs)
}

/**
 * 섹션 배열과 메타데이터를 하나의 Markdown 문서로 직렬화한다.
 *
 * - 문서 앞에 YAML front matter 로 메타데이터(title/author/language)를 기록한다.
 * - 각 섹션은 자신의 level(1~6)에 맞춘 제목을 먼저 출력한 뒤 블록을 출력한다.
 * - h1~h4 -> #~####, blockquote -> '> ', li-ul -> '- ', li-ol -> '1. ',
 *   hr -> '---', p -> 텍스트. 인라인 서식과 줄바꿈을 보존한다.
 */
export function sectionsToMarkdown(sections: ESection[], meta: EMeta): string {
  const parts: string[] = []

  // --- YAML front matter (메타데이터) ---
  const fm: string[] = ['---']
  fm.push(`title: ${yamlScalar(meta.title)}`)
  if (meta.author !== undefined) fm.push(`author: ${yamlScalar(meta.author)}`)
  if (meta.language !== undefined) fm.push(`language: ${yamlScalar(meta.language)}`)
  fm.push('---')
  parts.push(fm.join('\n'))

  // --- 각 섹션 ---
  for (const section of sections) {
    const lines: string[] = []

    // 페이지 나눔: 마크다운엔 표준 페이지나눔이 없으므로 HTML(마크다운 내 허용) 마커를 섹션 앞에 emit.
    // 제목 가드와 무관하게 항상 표시한다.
    if (section.pageBreakBefore) {
      lines.push('<div style="page-break-before:always"></div>')
    }

    // 섹션 제목: level 을 1~6 으로 클램프하여 ATX 제목으로 출력. 제목 숨김(빈 문자열)이면 헤딩 생략(ODT/LaTeX 와 일관).
    if (section.title.trim()) {
      const lv = Math.max(1, Math.min(6, Math.floor(section.level) || 1))
      lines.push(`${'#'.repeat(lv)} ${section.title}`)
    }

    // 섹션 본문 블록.
    let prevWasListItem = false
    for (const block of section.blocks) {
      const isListItem = block.type === 'li-ul' || block.type === 'li-ol'
      // 연속된 리스트 항목은 빈 줄 없이 붙이고, 그 외 블록은 빈 줄로 분리한다.
      if (lines.length > 0 && !(isListItem && prevWasListItem)) lines.push('')
      lines.push(blockToMd(block))
      prevWasListItem = isListItem
    }

    parts.push(lines.join('\n'))
  }

  // 섹션 사이는 빈 줄 하나로 구분하고, 파일 끝에 개행 하나를 둔다.
  return parts.join('\n\n') + '\n'
}

/** YAML 스칼라 값을 안전하게 인용한다(콜론/특수문자 포함 시). */
function yamlScalar(value: string): string {
  if (value === '') return '""'
  // 따옴표가 필요한 문자가 있으면 큰따옴표로 감싸고 내부 따옴표/백슬래시를 이스케이프.
  if (/[:#\-?\[\]{}&*!|>'"%@`\n]/.test(value) || /^\s|\s$/.test(value)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
  }
  return value
}

// ---------- Markdown -> 모델 ----------

/** 파싱 결과 블록(섹션 구분 없이 평면적인 블록 목록). */
export interface MdBlock {
  type: EBlockType
  runs: ERun[]
  align?: 'left' | 'center' | 'right' | 'justify'
  listLevel?: number
}

/** YAML front matter 한 줄을 제거하기 위한 정규식 헬퍼는 본문 파서에서 처리. */

/**
 * 동일 서식의 인접 run 을 병합하고 빈 run 을 제거한다.
 */
function mergeRuns(runs: ERun[]): ERun[] {
  const out: ERun[] = []
  for (const r of runs) {
    if (r.text === '') continue
    const last = out[out.length - 1]
    if (last && sameStyle(last, r)) {
      last.text += r.text
    } else {
      out.push({ ...r })
    }
  }
  return out
}

/** 두 run 의 (텍스트를 제외한) 서식이 동일한지 비교. */
function sameStyle(a: ERun, b: ERun): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline &&
    !!a.strike === !!b.strike &&
    !!a.superscript === !!b.superscript &&
    !!a.subscript === !!b.subscript &&
    (a.link || '') === (b.link || '')
  )
}

/**
 * 인라인 Markdown 문자열을 ERun 배열로 파싱한다.
 * 지원: **bold**, *italic*(또는 _italic_), ~~strike~~, [txt](url),
 *       백슬래시 이스케이프.
 *
 * @param text   인라인 원문
 * @param base   상위(중첩) 서식 상태
 */
function parseInline(text: string, base: ERun): ERun[] {
  const runs: ERun[] = []
  let buf = '' // 현재 누적 중인 일반 텍스트
  let i = 0
  const n = text.length

  // 누적된 일반 텍스트를 현재 서식으로 run 화하여 flush.
  const flush = () => {
    if (buf !== '') {
      runs.push({ ...base, text: buf })
      buf = ''
    }
  }

  while (i < n) {
    const ch = text[i]

    // 백슬래시 이스케이프: 다음 한 글자를 그대로 텍스트로 취급.
    if (ch === '\\' && i + 1 < n) {
      buf += text[i + 1]
      i += 2
      continue
    }

    // 링크: [label](url)
    if (ch === '[') {
      const link = matchLink(text, i)
      if (link) {
        flush()
        // 링크 라벨도 인라인 서식을 가질 수 있으므로 재귀 파싱. link 속성을 덧씌운다.
        const labelRuns = parseInline(link.label, { ...base, link: link.url })
        if (labelRuns.length === 0) {
          // 라벨이 비어 있으면 URL 자체를 텍스트로.
          runs.push({ ...base, text: link.url, link: link.url })
        } else {
          for (const r of labelRuns) runs.push(r)
        }
        i = link.end
        continue
      }
    }

    // 굵게: ** ... ** (또는 __ ... __)
    if ((ch === '*' || ch === '_') && text[i + 1] === ch) {
      const marker = ch + ch
      const close = findClosing(text, i + 2, marker)
      if (close !== -1) {
        flush()
        const innerRuns = parseInline(text.slice(i + 2, close), { ...base, bold: true })
        for (const r of innerRuns) runs.push(r)
        i = close + 2
        continue
      }
    }

    // 취소선: ~~ ... ~~
    if (ch === '~' && text[i + 1] === '~') {
      const close = findClosing(text, i + 2, '~~')
      if (close !== -1) {
        flush()
        const innerRuns = parseInline(text.slice(i + 2, close), { ...base, strike: true })
        for (const r of innerRuns) runs.push(r)
        i = close + 2
        continue
      }
    }

    // 기울임: * ... * (또는 _ ... _) — 단일 마커.
    if (ch === '*' || ch === '_') {
      const close = findClosing(text, i + 1, ch)
      if (close !== -1) {
        flush()
        const innerRuns = parseInline(text.slice(i + 1, close), { ...base, italic: true })
        for (const r of innerRuns) runs.push(r)
        i = close + 1
        continue
      }
    }

    // 일반 문자.
    buf += ch
    i++
  }

  flush()
  return runs
}

/**
 * start 위치부터 같은 종류의 마커가 아닌 닫는 마커 위치를 찾는다.
 * 백슬래시로 이스케이프된 마커는 건너뛴다.
 * 반환: 닫는 마커의 시작 인덱스, 없으면 -1.
 */
function findClosing(text: string, start: number, marker: string): number {
  const len = marker.length
  let i = start
  const n = text.length
  while (i < n) {
    if (text[i] === '\\') {
      i += 2
      continue
    }
    if (text.startsWith(marker, i)) {
      // 빈 강조(마커가 바로 붙은 경우)는 무시하지 않고 위치를 그대로 반환한다.
      return i
    }
    i++
  }
  return -1
}

/**
 * '[' 위치에서 시작하는 링크 [label](url) 를 시도 매칭한다.
 * 반환: { label, url, end } (end 는 닫는 ')' 다음 인덱스) 또는 null.
 */
function matchLink(text: string, start: number): { label: string; url: string; end: number } | null {
  // 라벨 닫는 ']' 찾기(중첩 대괄호와 이스케이프 고려).
  let i = start + 1
  let depth = 1
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) break
    }
    i++
  }
  if (i >= n || text[i] !== ']') return null
  const labelEnd = i
  // 라벨 다음은 즉시 '(' 이어야 함.
  if (text[i + 1] !== '(') return null
  // URL 닫는 ')' 찾기.
  let j = i + 2
  while (j < n) {
    const c = text[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === ')') break
    j++
  }
  if (j >= n || text[j] !== ')') return null
  const label = text.slice(start + 1, labelEnd)
  // 내보내기 시 이스케이프한 백슬래시/괄호를 복원(왕복 무손실).
  const url = text.slice(i + 2, j).trim().replace(/\\([\\)])/g, '$1')
  return { label, url, end: j + 1 }
}

/** 한 줄이 hr(수평선)인지 판정. ---, ***, ___ (3개 이상). */
function isHr(line: string): boolean {
  const t = line.trim()
  return /^(-{3,}|\*{3,}|_{3,})$/.test(t)
}

/**
 * Markdown 문자열을 평면 블록 배열로 파싱한다.
 *
 * - YAML front matter('---' ... '---')는 무시한다.
 * - 제목(#~######), 인용(>), 목록(-, *, +, 1.), hr(--- 등),
 *   문단 분리(빈 줄), 인라인 서식(굵게/기울임/취소선/링크)을 처리.
 * - CommonMark 기본 규칙을 따르되 과도하게 복잡하지 않게 구현.
 */
export function parseMarkdown(md: string): MdBlock[] {
  // 개행 정규화(\r\n, \r -> \n).
  const normalized = md.replace(/\r\n?/g, '\n')
  let lines = normalized.split('\n')

  // --- front matter 제거 ---
  if (lines.length > 0 && lines[0].trim() === '---') {
    const end = findFrontMatterEnd(lines)
    if (end !== -1) {
      lines = lines.slice(end + 1)
    }
  }

  const blocks: MdBlock[] = []
  let i = 0
  const n = lines.length

  // 누적 중인 문단 줄들(빈 줄을 만나면 하나의 'p' 블록으로 flush).
  let paraLines: string[] = []
  const flushPara = () => {
    if (paraLines.length === 0) return
    // 문단 내 줄바꿈은 보존한다.
    const text = paraLines.join('\n')
    blocks.push({ type: 'p', runs: mergeRuns(parseInline(text, baseRun())) })
    paraLines = []
  }

  while (i < n) {
    const raw = lines[i]
    const line = raw

    // 빈 줄: 문단 경계.
    if (line.trim() === '') {
      flushPara()
      i++
      continue
    }

    // hr: 단, 진행 중인 문단이 있으면 setext 헤딩 등으로 오인하지 않도록
    // 문단을 먼저 flush 한 뒤 hr 로 처리.
    if (isHr(line)) {
      flushPara()
      blocks.push({ type: 'hr', runs: [] })
      i++
      continue
    }

    // ATX 제목: 1~6개의 '#' + 공백.
    const heading = matchHeading(line)
    if (heading) {
      flushPara()
      const type: EBlockType =
        heading.level <= 4 ? (`h${heading.level}` as EBlockType) : 'h4'
      blocks.push({ type, runs: mergeRuns(parseInline(heading.text, baseRun())) })
      i++
      continue
    }

    // 인용: '>' 로 시작. 연속된 인용 줄을 모은다.
    if (/^\s*>/.test(line)) {
      flushPara()
      const quoteLines: string[] = []
      while (i < n && /^\s*>/.test(lines[i])) {
        // 선행 '> ' 또는 '>' 를 제거.
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      const text = quoteLines.join('\n')
      blocks.push({ type: 'blockquote', runs: mergeRuns(parseInline(text, baseRun())) })
      continue
    }

    // 목록 항목: -, *, + (불릿) 또는 숫자. (들여쓰기로 listLevel 산출)
    const list = matchListItem(line)
    if (list) {
      flushPara()
      blocks.push({
        type: list.ordered ? 'li-ol' : 'li-ul',
        listLevel: list.level,
        runs: mergeRuns(parseInline(list.text, baseRun())),
      })
      i++
      continue
    }

    // 그 외: 문단 줄로 누적.
    paraLines.push(line)
    i++
  }

  flushPara()
  return blocks
}

/** 기본(서식 없는) run 베이스. */
function baseRun(): ERun {
  return { text: '' }
}

/** front matter 종료('---') 줄의 인덱스를 찾는다. 없으면 -1. */
function findFrontMatterEnd(lines: string[]): number {
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i
  }
  return -1
}

/** ATX 제목 매칭. '#'~'######' 다음에 공백. */
function matchHeading(line: string): { level: number; text: string } | null {
  const m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/)
  if (!m) return null
  return { level: m[1].length, text: m[2] }
}

/**
 * 목록 항목 매칭.
 * 들여쓰기(공백/탭) 2칸당 listLevel 1단계로 환산.
 * 반환: { ordered, level, text } 또는 null.
 */
function matchListItem(line: string): { ordered: boolean; level: number; text: string } | null {
  // 불릿: -, *, +
  const ul = line.match(/^(\s*)([-*+])\s+(.*)$/)
  if (ul) {
    // hr 로 이미 걸러졌으므로 여기 도달한 '-'/'*' 는 목록으로 간주.
    return { ordered: false, level: indentToLevel(ul[1]), text: ul[3] }
  }
  // 순서 목록: 1. / 1)
  const ol = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/)
  if (ol) {
    return { ordered: true, level: indentToLevel(ol[1]), text: ol[3] }
  }
  return null
}

/** 선행 공백 문자열을 listLevel(0부터)로 환산. 탭=공백 4칸, 공백 2칸당 1단계. */
function indentToLevel(indent: string): number {
  let width = 0
  for (const c of indent) width += c === '\t' ? 4 : 1
  return Math.floor(width / 2)
}
