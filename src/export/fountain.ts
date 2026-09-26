// Fountain 각본 포맷 가져오기/내보내기 (외부 라이브러리 없이 직접 구현).
//
// Fountain 문법 요약 (https://fountain.io/syntax/ 기준):
//  - Title Page : 문서 맨 앞의 'Key: Value' 줄들. 값은 같은 줄 또는 들여쓴 다음 줄에 이어질 수 있다.
//  - Scene Heading : INT./EXT./EST./INT./EXT./I/E. 로 시작하거나, 강제로 '.' 을 앞에 붙인 줄.
//  - Character : 위에 빈 줄이 있고 전부 대문자인 줄(영문자 1개 이상). 강제는 '@' 접두.
//  - Dialogue : Character/Parenthetical 다음에 오는 줄.
//  - Parenthetical : 괄호로 둘러싼 줄 '(...)'.
//  - Transition : 대문자로 'TO:' 로 끝나거나, 강제로 '>' 접두를 붙인 줄.
//  - Centered : '>텍스트<' 형태(가운데 정렬 액션).
//  - Section : '#' 접두(개요용, 출력물에는 안 보임).
//  - Synopsis : '=' 접두(개요용).
//  - 강조 : *italic*, **bold**, ***bold italic***, _underline_.
//  - 빈 줄이 주요 요소들을 구분한다.
//
// 이 파일은 브라우저 전용 순수 함수만 제공한다(서버/Node 전용 API 미사용).

// ---------------------------------------------------------------------------
// 공용 문서 모델 (앱의 RTF Block/Run 과 구조적으로 동일하게 이 파일에서 자체 정의)
// 외부 import 금지 규칙에 따라 여기서 직접 export 한다.
// ---------------------------------------------------------------------------

export interface ERun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  fontSize?: number /* pt */
  fontFamily?: string
  color?: string /* #rrggbb */
  highlight?: string
  link?: string
  /** 인라인 이미지 data URL(+선택 크기). 컴파일 모델의 평탄 ERun 과 동일.
   *  Fountain 은 텍스트 포맷이라 이미지를 표현할 수 없으므로 '[이미지]' 텍스트로 대체한다. */
  image?: string
  imageW?: number
  imageH?: number
}

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

export interface EBlock {
  type: EBlockType
  align?: 'left' | 'center' | 'right' | 'justify'
  runs: ERun[]
  listLevel?: number
}

export interface ESection {
  title: string
  level: number
  blocks: EBlock[]
  /** 이 섹션 앞에서 페이지 나눔(문서의 pageBreakBefore + honorPageBreaks).
   *  Fountain 의 강제 페이지나눔 토큰은 한 줄에 '===' 다. */
  pageBreakBefore?: boolean
}

export interface EMeta {
  title: string
  author?: string
  language?: string
}

// ---------------------------------------------------------------------------
// 가져오기(parse): Fountain 텍스트 -> { title, author?, scenes }
// ---------------------------------------------------------------------------

export interface FountainScene {
  title: string // Scene Heading 텍스트(강제 '.' 은 제거된 형태)
  text: string // 일반 텍스트 본문(요소 줄바꿈 보존)
}

export interface FountainParseResult {
  title: string
  author?: string
  scenes: FountainScene[]
}

// Scene Heading 으로 인정되는 접두어들(대소문자 무시). 뒤에 '.' 또는 공백이 와야 한다.
// 예: 'INT.', 'EXT ', 'EST.', 'INT./EXT.', 'INT/EXT.', 'I/E.'
const SCENE_PREFIX_RE =
  /^(?:int|ext|est|int\.?\/ext|int\/ext|i\/e)(?:\.|\s)/i

/** 한 줄이 Scene Heading 인지 판정하고, Heading 텍스트를 돌려준다(아니면 null). */
function detectSceneHeading(rawLine: string): string | null {
  const line = rawLine.trim()
  if (line.length === 0) return null

  // 강제 Scene Heading: 선두 '.' (단, '..' 로 시작하는 것은 액션 이스케이프이므로 제외)
  if (line.startsWith('.') && !line.startsWith('..')) {
    return line.slice(1).trim()
  }

  // 일반 Scene Heading: 알려진 접두어로 시작
  if (SCENE_PREFIX_RE.test(line)) {
    return line
  }

  return null
}

/** Title Page 의 한 줄에서 'Key: Value' 를 분리한다(아니면 null). */
function parseTitleKeyValue(
  rawLine: string,
): { key: string; value: string } | null {
  // 콜론 앞부분이 키. 콜론은 키 뒤에 와야 하며, URL(http://) 등 본문 콜론과 구분하기 위해
  // Title Page 영역에서만 호출한다.
  const idx = rawLine.indexOf(':')
  if (idx <= 0) return null
  const key = rawLine.slice(0, idx).trim()
  if (key.length === 0) return null
  // 키에는 영문/공백 정도만 허용(임의 본문 줄이 키로 오인되는 것을 줄임).
  if (!/^[A-Za-z][A-Za-z ]*$/.test(key)) return null
  const value = rawLine.slice(idx + 1).trim()
  return { key, value }
}

/**
 * Fountain 소스를 파싱한다.
 *  - 맨 앞의 Title Page(Title:, Author: 등)를 읽어 title/author 를 채운다.
 *  - Scene Heading 으로 본문을 씬 단위로 분할한다.
 *  - 각 씬의 본문 텍스트는 원본 줄바꿈을 그대로 보존한다.
 */
export function parseFountain(src: string): FountainParseResult {
  // 개행 정규화(CRLF/CR -> LF). 내용 자체는 보존.
  const normalized = src.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')

  const titleMeta: Record<string, string> = {}
  let cursor = 0

  // --- Title Page 파싱 ---
  // 규칙(단순화): 첫 비어있지 않은 줄이 'Key: Value' 형태이면 Title Page 로 간주.
  // 키 줄 다음의 들여쓴(공백/탭) 줄들은 해당 값의 연속으로 본다.
  // 첫 빈 줄을 만나면 Title Page 종료.
  let firstNonEmpty = 0
  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') {
    firstNonEmpty++
  }

  const hasTitlePage =
    firstNonEmpty < lines.length &&
    parseTitleKeyValue(lines[firstNonEmpty]) !== null

  if (hasTitlePage) {
    let i = firstNonEmpty
    let lastKey: string | null = null
    for (; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') {
        // Title Page 끝.
        i++
        break
      }
      // 들여쓴 줄(공백 또는 탭 시작)은 직전 키 값의 연속.
      if (/^[ \t]/.test(line) && lastKey !== null) {
        const cont = line.trim()
        titleMeta[lastKey] =
          titleMeta[lastKey].length > 0
            ? titleMeta[lastKey] + '\n' + cont
            : cont
        continue
      }
      const kv = parseTitleKeyValue(line)
      if (kv === null) {
        // Title Page 형태가 깨지면 여기서부터 본문으로 취급.
        break
      }
      const lowerKey = kv.key.toLowerCase()
      titleMeta[lowerKey] = kv.value
      lastKey = lowerKey
    }
    cursor = i
  }

  // Title Page 다음의 선행 빈 줄은 건너뛴다.
  while (cursor < lines.length && lines[cursor].trim() === '') {
    cursor++
  }

  const title = (titleMeta['title'] ?? '').trim()
  const authorRaw = titleMeta['author'] ?? titleMeta['authors'] ?? titleMeta['credit']
  const author = authorRaw !== undefined ? authorRaw.trim() : undefined

  // --- 본문(씬) 파싱 ---
  const scenes: FountainScene[] = []
  let current: FountainScene | null = null
  const bodyLines = lines.slice(cursor)

  // Scene Heading 은 위/아래로 빈 줄이 있어야 하는 것이 원칙이지만,
  // 견고함을 위해 '직전 줄이 비어있거나 첫 줄' 인 경우를 헤딩 후보로 허용한다.
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i]
    const prevBlank = i === 0 || bodyLines[i - 1].trim() === ''

    let heading: string | null = null
    if (prevBlank) {
      heading = detectSceneHeading(line)
    } else if (line.trim().startsWith('.') && !line.trim().startsWith('..')) {
      // 강제 헤딩('.')은 빈 줄 조건 없이도 인정.
      heading = detectSceneHeading(line)
    }

    if (heading !== null) {
      // 이전 씬 마무리.
      if (current !== null) {
        current.text = trimSurroundingBlankLines(current.text)
        scenes.push(current)
      }
      current = { title: heading, text: '' }
      continue
    }

    if (current === null) {
      // 첫 Scene Heading 이전의 본문(액션 등)은 제목 없는 선두 씬으로 모은다.
      current = { title: '', text: '' }
    }
    current.text = current.text.length > 0 ? current.text + '\n' + line : line
  }

  if (current !== null) {
    current.text = trimSurroundingBlankLines(current.text)
    // 제목과 본문이 모두 비어있는 빈 씬은 버린다.
    if (current.title.length > 0 || current.text.length > 0) {
      scenes.push(current)
    }
  }

  return { title, author, scenes }
}

/** 문자열 앞뒤의 빈 줄을 제거(중간 줄바꿈/공백은 보존). */
function trimSurroundingBlankLines(text: string): string {
  return text.replace(/^\n+/, '').replace(/\n+$/, '')
}

// ---------------------------------------------------------------------------
// 내보내기(serialize): ESection[] + EMeta -> Fountain 문자열
// ---------------------------------------------------------------------------

// 인라인 이미지 data URL 형식(담당 규칙과 동일).
const IMAGE_DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i

/** 한 Run 의 텍스트에 Fountain 강조 마크업을 적용한다. */
function runToFountain(run: ERun): string {
  // Fountain 은 텍스트 시나리오 포맷이라 이미지를 표현할 수 없다.
  // 이미지가 소실되지 않도록 '[이미지]' 텍스트로 대체한다(런에 텍스트가 함께 있으면 캡션으로 보존).
  if (run.image && IMAGE_DATA_URL_RE.test(run.image)) {
    const caption = run.text.trim()
    return caption.length > 0 ? `[이미지: ${caption}]` : '[이미지]'
  }

  // 강조를 적용할 텍스트가 공백뿐이면 마크업을 붙이지 않는다(Fountain 에서 무의미).
  let text = run.text
  if (text.length === 0) return ''

  const trimmedEmpty = text.trim().length === 0
  if (trimmedEmpty) return text

  // *italic*, **bold**, ***bold italic***, _underline_ 순으로 안쪽부터 감싼다.
  if (run.bold && run.italic) {
    text = '***' + text + '***'
  } else if (run.bold) {
    text = '**' + text + '**'
  } else if (run.italic) {
    text = '*' + text + '*'
  }
  if (run.underline) {
    text = '_' + text + '_'
  }
  return text
}

/** 한 Block 의 모든 Run 을 합쳐 한 줄(인라인) Fountain 텍스트로 만든다. */
function blockInlineText(block: EBlock): string {
  return block.runs.map(runToFountain).join('')
}

/** 블록 텍스트가 Transition(대문자 + 'TO:' 로 끝) 휴리스틱에 맞는지. */
function looksLikeTransition(plain: string): boolean {
  const t = plain.trim()
  if (t.length === 0) return false
  if (!/TO:$/.test(t)) return false
  // 영문 대문자/공백/구두점만으로 이루어졌는지(소문자가 없으면 대문자 줄로 본다).
  return t === t.toUpperCase() && /[A-Z]/.test(t)
}

/** 블록 텍스트가 Character(대문자) 휴리스틱에 맞는지. */
function looksLikeCharacter(plain: string): boolean {
  const t = plain.trim()
  if (t.length === 0) return false
  if (t.length > 40) return false // 너무 긴 줄은 대사/액션으로 본다.
  // 괄호 확장 '(O.S.)' 등을 떼고 대문자/영문자 여부 판정.
  const base = t.replace(/\([^)]*\)\s*$/, '').trim()
  if (base.length === 0) return false
  if (!/[A-Z]/.test(base)) return false
  // 소문자가 있으면 Character 아님.
  return base === base.toUpperCase()
}

/** 블록 텍스트가 Parenthetical '(...)' 인지. */
function looksLikeParenthetical(plain: string): boolean {
  const t = plain.trim()
  return /^\(.*\)$/.test(t)
}

/** Scene Heading 휴리스틱(블록 텍스트가 알려진 접두어로 시작). */
function looksLikeSceneHeading(plain: string): boolean {
  return SCENE_PREFIX_RE.test(plain.trim())
}

/**
 * 한 블록을 Fountain 본문 줄(들)로 변환한다.
 * 휴리스틱:
 *  - 헤딩 블록(h1~h4)은 '# 섹션' 형태의 Section 으로.
 *  - hr 은 강제 액션 라인(=== 구분선 대용)으로.
 *  - 리스트 항목은 액션 텍스트로(앞에 마커 부여).
 *  - 일반 문단은 Transition/Scene Heading/Character/Parenthetical/Action 중 매핑.
 */
function blockToFountainLines(block: EBlock): string[] {
  if (block.type === 'hr') {
    // 구분선: Fountain 에 전용 문법이 없어 가운데 정렬 액션으로 표현.
    return ['> * * * <']
  }

  const inline = blockInlineText(block)
  const plain = block.runs.map((r) => r.text).join('')
  // 텍스트는 비었지만 이미지가 있는 블록은 빈 줄로 버리지 않고 '[이미지]' 액션으로 보존.
  const hasImage = block.runs.some((r) => !!r.image && IMAGE_DATA_URL_RE.test(r.image))

  if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'h4') {
    // 헤딩 깊이에 맞춰 '#' 개수를 매핑(h1=#, h2=##, ...).
    const depth =
      block.type === 'h1' ? 1 : block.type === 'h2' ? 2 : block.type === 'h3' ? 3 : 4
    const hashes = '#'.repeat(depth)
    return [`${hashes} ${inline}`.trimEnd()]
  }

  if (block.type === 'li-ul' || block.type === 'li-ol') {
    const level = block.listLevel ?? 0
    const indent = '  '.repeat(level)
    const marker = block.type === 'li-ul' ? '- ' : '1. '
    return [`${indent}${marker}${inline}`.trimEnd()]
  }

  // 가운데 정렬 문단 -> Centered '>텍스트<'.
  if (block.align === 'center' && plain.trim().length > 0) {
    return [`> ${inline.trim()} <`]
  }

  // 우정렬 문단 -> Transition. Fountain 의 강제 전환 토큰은 선두 '>' 다('<' 로 끝나지 않게).
  // (이미 대문자 + 'TO:' 형태면 추가 토큰 없이도 전환으로 인식되므로 그대로 둔다.)
  if (block.align === 'right' && plain.trim().length > 0) {
    return looksLikeTransition(plain) ? [inline.trim()] : [`> ${inline.trim()}`]
  }

  // blockquote 도 일반 액션처럼 처리하되, 비어있지 않으면 그대로 출력.
  // (이미지만 있는 블록은 '[이미지]' 가 소실되지 않도록 빈 줄로 처리하지 않는다.)
  if (plain.trim().length === 0 && !hasImage) {
    return ['']
  }
  // 텍스트 없이 이미지만 있는 블록: '[이미지]' 액션 줄로 출력.
  if (plain.trim().length === 0 && hasImage) {
    return [inline]
  }

  // 휴리스틱 매핑(우선순위: Scene Heading > Transition > Parenthetical > Character > Action).
  if (looksLikeSceneHeading(plain)) {
    // 이미 INT./EXT. 등으로 시작하면 그대로 헤딩.
    return [inline.trim()]
  }
  if (looksLikeTransition(plain)) {
    return [inline.trim()]
  }
  if (looksLikeParenthetical(plain)) {
    return [inline.trim()]
  }
  if (looksLikeCharacter(plain)) {
    return [inline.trim()]
  }

  // 기본: 액션.
  return [inline]
}

/** Title Page 의 값에서 콜론/개행이 깨지지 않도록 단순 정리. */
function sanitizeTitleValue(value: string): string {
  // 개행은 들여쓰기 연속 줄로 표현되므로 여기서는 공백으로 접는다.
  return value.replace(/\r\n?|\n/g, ' ').trim()
}

/**
 * 섹션 배열과 메타데이터를 Fountain 문자열로 직렬화한다.
 *  - 메타로 Title Page(Title:, Author:) 를 만든다.
 *  - 각 섹션 제목은 Scene Heading(INT./EXT. 등으로 시작하면) 또는 '# 섹션' 으로.
 *  - 섹션 블록들을 Fountain 본문으로 변환하고, 요소 사이에 빈 줄을 넣는다.
 */
export function sectionsToFountain(sections: ESection[], meta: EMeta): string {
  const out: string[] = []

  // --- Title Page ---
  const titleVal = sanitizeTitleValue(meta.title ?? '')
  if (titleVal.length > 0) {
    out.push(`Title: ${titleVal}`)
  }
  if (meta.author !== undefined && meta.author.trim().length > 0) {
    out.push(`Author: ${sanitizeTitleValue(meta.author)}`)
  }
  if (out.length > 0) {
    // Title Page 와 본문 사이 빈 줄.
    out.push('')
  }

  // --- 본문 ---
  for (const section of sections) {
    const sectionTitle = section.title.trim()

    // 강제 페이지나눔: Fountain 의 페이지나눔 토큰은 한 줄에 '===' 다.
    // 앞에 출력된 내용이 있을 때만(맨 앞 불필요한 '===' 방지) 빈 줄로 둘러싸 emit.
    if (section.pageBreakBefore && out.length > 0) {
      out.push('') // '===' 위 빈 줄(요소 분리).
      out.push('===')
      out.push('') // '===' 아래 빈 줄.
    }

    if (sectionTitle.length > 0) {
      if (looksLikeSceneHeading(sectionTitle)) {
        // INT./EXT. 등으로 시작 -> Scene Heading 그대로.
        out.push(sectionTitle)
      } else {
        // 그 외 -> '# 섹션'. 섹션 레벨(>=1)을 '#' 개수로 반영(최대 5단계).
        const depth = Math.min(Math.max(section.level, 1), 5)
        out.push(`${'#'.repeat(depth)} ${sectionTitle}`)
      }
      out.push('') // 헤딩 다음 빈 줄.
    }

    for (const block of section.blocks) {
      const blockLines = blockToFountainLines(block)
      for (const bl of blockLines) {
        out.push(bl)
      }
      // 블록(요소) 사이 구분용 빈 줄.
      out.push('')
    }
  }

  // 끝의 과도한 빈 줄 정리 후, 줄 사이를 LF 로 연결.
  let text = out.join('\n')
  text = text.replace(/\n{3,}/g, '\n\n') // 빈 줄 2개 초과는 축약.
  text = text.replace(/\n+$/, '') + '\n' // 파일 끝 개행 1개로 정리.
  return text
}
