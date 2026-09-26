// 플랫폼별 발행 직렬화 모듈 — 컴파일된 섹션(AST)을 각 연재/블로그 플랫폼이
// 요구하는 텍스트 포맷(BBCode / HTML / Markdown / 평문)으로 변환한다.
//
// 외부 라이브러리 없이 순수 함수로만 구현한다. 빈/누락 필드에서 throw 하지 않으며,
// 입력이 비어 있어도 안전한 빈 결과를 반환한다.
//
// 타입은 컴파일 엔진의 평탄(flat) 모델을 그대로 재사용한다(배럴 import 금지):
//   CompiledSection = { title, level, blocks: EBlock[], pageBreakBefore? }
//   EBlock          = { type, align?, runs: ERun[], listLevel? }
//   ERun            = { text, bold?, italic?, underline?, strike?, link?, image?, ... }
import type { CompiledSection, EBlock, ERun } from '../compile/compile.ts'

// ---------- 플랫폼 프리셋 ----------

/** 발행 대상 플랫폼 한 개의 메타데이터. */
export interface PlatformPreset {
  id: string
  name: string
  /** 이 플랫폼 붙여넣기/업로드에 가장 적합한 직렬화 포맷. */
  format: 'bbcode' | 'html' | 'markdown' | 'text'
  /** 사용 안내(에디터 UI 의 도움말로 노출). */
  note: string
}

/**
 * 지원 플랫폼 프리셋 목록.
 *
 * - 국내 연재(문피아/네이버시리즈/노벨피아/카카오페이지): 평문 또는 서식보존 HTML.
 *   회차당 1파일로 올리고 작가후기는 본문과 분리하는 운용 개념.
 * - 해외 연재(Royal Road=BBCode, ScribbleHub=HTML, Wattpad=평문).
 * - 블로그(티스토리/Medium=Markdown, 네이버블로그=HTML).
 */
export const PLATFORM_PRESETS: PlatformPreset[] = [
  // --- 국내 연재 ---
  {
    id: 'munpia',
    name: '문피아',
    format: 'text',
    note: '회차당 1파일 평문 붙여넣기. 작가후기는 본문과 분리해 따로 올리세요.',
  },
  {
    id: 'naver-series',
    name: '네이버 시리즈',
    format: 'text',
    note: '회차 단위 평문. 문단은 빈 줄로 구분되며 따옴표 정규화는 출력 옵션에서 처리합니다.',
  },
  {
    id: 'novelpia',
    name: '노벨피아',
    format: 'html',
    note: '서식 보존 HTML. 굵게/기울임/정렬 등 인라인 서식이 유지됩니다. 회차당 1파일.',
  },
  {
    id: 'kakaopage',
    name: '카카오페이지',
    format: 'html',
    note: '서식 보존 HTML. 회차당 1파일로 업로드하고 작가후기는 분리하세요.',
  },
  {
    id: 'joara',
    name: '조아라',
    format: 'text',
    note: '회차당 1파일 평문 붙여넣기. 문단은 빈 줄로 구분됩니다.',
  },
  {
    id: 'ridi',
    name: '리디',
    format: 'html',
    note: '서식 보존 HTML(리디북스/리디 셀프퍼블). 회차당 1파일.',
  },
  // --- 해외 연재 ---
  {
    id: 'royalroad',
    name: 'Royal Road',
    format: 'bbcode',
    note: 'BBCode 본문. [b]/[i]/[u]/[s]/[url]/[center]/[quote] 지원.',
  },
  {
    id: 'scribblehub',
    name: 'ScribbleHub',
    format: 'html',
    note: '챕터 에디터에 붙여넣을 시맨틱 HTML.',
  },
  {
    id: 'wattpad',
    name: 'Wattpad',
    format: 'text',
    note: '평문 본문. 서식이 제거되므로 문단 구분 위주로 정리됩니다.',
  },
  // --- 블로그 ---
  {
    id: 'tistory',
    name: '티스토리',
    format: 'markdown',
    note: '마크다운 모드 글쓰기에 적합. 헤딩/인용/목록/링크 보존.',
  },
  {
    id: 'medium',
    name: 'Medium',
    format: 'markdown',
    note: '마크다운 가져오기용. 인라인 서식과 링크가 유지됩니다.',
  },
  {
    id: 'naver-blog',
    name: '네이버 블로그',
    format: 'html',
    note: '스마트에디터에 붙여넣을 HTML. 인라인 스타일은 최소화되어 호환성이 높습니다.',
  },
]

// ---------- 공통 헬퍼 ----------

/** 헤딩 블록 여부. */
function isHeading(type: EBlock['type']): boolean {
  return type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4'
}

/**
 * data URL 이미지인지 검사한다(`data:image/...;base64,...`).
 * 그 외 값(http URL 등)은 이미지로 취급하지 않는다.
 */
function isImageRun(run: ERun): boolean {
  return !!run.image && /^data:image\/[a-z0-9.+-]+;base64,/i.test(run.image)
}

// ---------- BBCode (Royal Road 등) ----------

/**
 * BBCode 텍스트 이스케이프.
 *
 * BBCode 에는 표준 이스케이프가 없으므로 대괄호를 보존하기 위해 '[' 를
 * 유니코드 전각 대괄호로 치환하지 않고, 태그로 오인되지 않도록 '[' 만
 * 제로폭 분리한다. 다만 본문 손상을 피하기 위해 가장 보수적으로,
 * 닫는 토큰처럼 보이는 시퀀스는 그대로 두되 '[' 뒤에 즉시 알파벳/슬래시가
 * 오는 패턴만 분리한다.
 */
function escapeBBCode(text: string): string {
  if (!text) return ''
  // 실제 BBCode 태그([b]/[url=...]/[/i] 등)로 닫히는 토큰일 때만 사이에 제로폭 공백을 넣어
  // 의도치 않은 태그 해석을 막는다. '[저자]' 같은 일반 대괄호는 그대로 보존.
  return text.replace(/\[(?=\/?(?:b|i|u|s|url|center|quote|img|hr|color|size)\b[^\]]*\])/gi, '[​')
}

/** 한 run 을 BBCode 인라인 문자열로 변환. */
function runToBBCode(run: ERun): string {
  if (isImageRun(run)) {
    // 이미지 런: data URL 을 [img] 로 감싼다. 대괄호가 없는 data URL 이므로 이스케이프 불필요.
    return `[img]${run.image}[/img]`
  }
  if (!run.text) return ''
  let inner = escapeBBCode(run.text)
  // 안쪽 -> 바깥쪽: strike -> underline -> italic -> bold.
  if (run.strike) inner = `[s]${inner}[/s]`
  if (run.underline) inner = `[u]${inner}[/u]`
  if (run.italic) inner = `[i]${inner}[/i]`
  if (run.bold) inner = `[b]${inner}[/b]`
  if (run.link) inner = `[url=${run.link}]${inner}[/url]`
  return inner
}

/** 여러 run 을 이어 붙여 한 블록의 BBCode 인라인 본문을 만든다. */
function runsToBBCode(runs: ERun[]): string {
  return runs.map(runToBBCode).join('')
}

/** 한 블록을 BBCode 한 덩어리로 변환. */
function blockToBBCode(block: EBlock): string {
  if (block.type === 'hr') return '[hr]'

  const inner = runsToBBCode(block.runs)

  if (isHeading(block.type)) {
    // 제목은 굵게 + 대문자화로 강조. 빈 제목이면 빈 문자열.
    if (!inner) return ''
    return `[b]${inner.toUpperCase()}[/b]`
  }

  if (block.type === 'blockquote') {
    return `[quote]${inner}[/quote]`
  }

  if (block.type === 'li-ul' || block.type === 'li-ol') {
    // BBCode 목록은 [list] 래퍼가 필요하지만 블록 단위 변환이라 항목만 emit.
    // 들여쓰기 깊이는 선행 공백으로 표현(붙여넣기 호환).
    const indent = '  '.repeat(block.listLevel && block.listLevel > 0 ? block.listLevel : 0)
    return `${indent}[*]${inner}`
  }

  // 'p' 및 그 외: 정렬이 가운데면 [center] 로 감싼다.
  if (block.align === 'center') return inner ? `[center]${inner}[/center]` : ''
  return inner
}

/**
 * 컴파일된 섹션 배열을 Royal Road 스타일 BBCode 문서로 직렬화한다.
 *
 * - 섹션 제목은 [b]대문자[/b] 헤더로 출력(빈 제목은 생략).
 * - 페이지 나눔(pageBreakBefore)은 섹션 사이 [hr] 로 표현.
 * - 블록은 빈 줄로 구분한다.
 */
export function sectionsToBBCode(sections: CompiledSection[]): string {
  if (!sections || sections.length === 0) return ''
  const out: string[] = []

  for (const section of sections) {
    const lines: string[] = []

    if (section.pageBreakBefore && out.length > 0) lines.push('[hr]')

    if (section.title && section.title.trim()) {
      lines.push(`[b]${escapeBBCode(section.title).toUpperCase()}[/b]`)
    }

    for (const block of section.blocks || []) {
      const piece = blockToBBCode(block)
      // 빈 헤딩/빈 가운데정렬 등은 빈 문자열이 나올 수 있으니 그대로 push(빈 줄로 보존).
      lines.push(piece)
    }

    if (lines.length) out.push(lines.join('\n\n'))
  }

  return out.join('\n\n')
}

// ---------- HTML (시맨틱, 붙여넣기 호환) ----------

/** HTML 텍스트 노드 이스케이프(<, >, &). */
function escapeHtmlText(text: string): string {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** HTML 속성값 이스케이프(따옴표 포함). */
function escapeHtmlAttr(value: string): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 한 run 을 시맨틱 HTML 인라인 조각으로 변환. */
function runToHtml(run: ERun): string {
  if (isImageRun(run)) {
    const alt = run.text ? ` alt="${escapeHtmlAttr(run.text)}"` : ''
    const w = run.imageW ? ` width="${run.imageW}"` : ''
    const h = run.imageH ? ` height="${run.imageH}"` : ''
    return `<img src="${escapeHtmlAttr(run.image as string)}"${alt}${w}${h}>`
  }
  if (run.text === '' || run.text == null) return ''

  // 줄바꿈을 <br> 로 보존하면서 각 줄 텍스트를 이스케이프.
  let inner = escapeHtmlText(run.text).split('\n').join('<br>')

  // 안쪽 -> 바깥쪽: strike -> underline -> italic -> bold.
  if (run.strike) inner = `<s>${inner}</s>`
  if (run.underline) inner = `<u>${inner}</u>`
  if (run.italic) inner = `<em>${inner}</em>`
  if (run.bold) inner = `<strong>${inner}</strong>`
  if (run.link) inner = `<a href="${escapeHtmlAttr(run.link)}">${inner}</a>`
  return inner
}

/** 여러 run 을 이어 붙여 한 블록의 HTML 인라인 본문을 만든다. */
function runsToHtml(runs: ERun[]): string {
  return runs.map(runToHtml).join('')
}

/** 정렬이 기본(left)이 아니면 최소 인라인 스타일 속성을 만든다. */
function alignAttr(align: EBlock['align']): string {
  if (align && align !== 'left') return ` style="text-align:${align}"`
  return ''
}

/** 한 블록을 시맨틱 HTML 한 요소로 변환. */
function blockToHtml(block: EBlock): string {
  if (block.type === 'hr') return '<hr>'

  const inner = runsToHtml(block.runs)
  const a = alignAttr(block.align)

  if (isHeading(block.type)) {
    // h1~h4 는 h2~h5 로 매핑하지 않고 그대로 쓰되, 본문 헤딩은 h2 이하가 일반적.
    // 붙여넣기 호환을 위해 시맨틱 h 태그를 그대로 사용한다.
    return `<${block.type}${a}>${inner}</${block.type}>`
  }

  if (block.type === 'blockquote') {
    return `<blockquote${a}><p>${inner}</p></blockquote>`
  }

  if (block.type === 'li-ul' || block.type === 'li-ol') {
    // 블록 단위 변환이므로 항목만 emit. 래핑(ul/ol)은 섹션 직렬화 단계에서 처리.
    return `<li${a}>${inner}</li>`
  }

  // 'p' 및 그 외.
  return `<p${a}>${inner}</p>`
}

/**
 * 연속된 리스트 항목(li)을 ul/ol 로 묶으면서 블록 배열을 HTML 로 직렬화한다.
 * 다른 포맷과 달리 HTML 은 목록 래퍼가 필수이므로 별도 처리한다.
 */
function blocksToHtml(blocks: EBlock[]): string[] {
  const out: string[] = []
  let i = 0
  const n = blocks.length
  while (i < n) {
    const b = blocks[i]
    if (b.type === 'li-ul' || b.type === 'li-ol') {
      const tag = b.type === 'li-ol' ? 'ol' : 'ul'
      const items: string[] = []
      // 같은 종류의 연속된 항목을 하나의 리스트로 묶는다.
      while (i < n && blocks[i].type === b.type) {
        items.push(blockToHtml(blocks[i]))
        i++
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }
    out.push(blockToHtml(b))
    i++
  }
  return out
}

/**
 * 컴파일된 섹션 배열을 시맨틱 HTML 문서 조각으로 직렬화한다(붙여넣기 호환).
 *
 * - p/strong/em/u/s/a/blockquote/h2.../img 사용, 인라인 스타일은 정렬에만 최소 적용.
 * - 섹션 제목은 섹션 level(1~6)에 맞춘 h 태그로 출력(빈 제목은 생략).
 * - 페이지 나눔은 page-break 스타일을 가진 빈 div 로 표현.
 */
export function sectionsToPlatformHtml(sections: CompiledSection[]): string {
  if (!sections || sections.length === 0) return ''
  const out: string[] = []

  for (const section of sections) {
    if (section.pageBreakBefore && out.length > 0) {
      out.push('<div style="page-break-before:always"></div>')
    }

    if (section.title && section.title.trim()) {
      const lv = Math.max(1, Math.min(6, Math.floor(section.level) || 1))
      out.push(`<h${lv}>${escapeHtmlText(section.title)}</h${lv}>`)
    }

    for (const piece of blocksToHtml(section.blocks || [])) out.push(piece)
  }

  return out.join('\n')
}

// ---------- 평문 (문피아/네이버 등) ----------

/**
 * 한 run 의 표시 텍스트만 추출한다(서식 제거). 이미지 런은 빈 문자열.
 * 평문은 따옴표 정규화 등 활자 치환을 하지 않는다(호출측 옵션 영역).
 */
function runToPlain(run: ERun): string {
  if (isImageRun(run)) return ''
  return run.text || ''
}

/** 한 블록의 평문 한 줄(헤딩/인용/목록도 표식 없이 텍스트만). */
function blockToPlain(block: EBlock): string {
  if (block.type === 'hr') return '⁂' // 장면 구분 글리프(평문에서 가로줄 대용).
  const text = block.runs.map(runToPlain).join('')
  if (block.type === 'li-ul' || block.type === 'li-ol') {
    const indent = '  '.repeat(block.listLevel && block.listLevel > 0 ? block.listLevel : 0)
    return text ? `${indent}- ${text}` : ''
  }
  return text
}

/**
 * 컴파일된 섹션 배열을 연재용 평문으로 직렬화한다(문피아/네이버 등).
 *
 * - 서식/태그 없이 텍스트만, 문단은 빈 줄로 구분.
 * - 섹션 제목은 한 줄로 출력(빈 제목은 생략).
 * - 따옴표/말줄임표 정규화는 호출측 옵션이므로 여기서는 하지 않는다.
 * - 비어 있는 블록(빈 문단)은 추가 빈 줄을 만들지 않도록 건너뛴다.
 */
export function sectionsToPlainPretty(sections: CompiledSection[]): string {
  if (!sections || sections.length === 0) return ''
  const out: string[] = []

  for (const section of sections) {
    const paras: string[] = []

    if (section.title && section.title.trim()) paras.push(section.title.trim())

    for (const block of section.blocks || []) {
      const line = blockToPlain(block)
      // 빈 줄(빈 문단/이미지 전용 블록)은 문단 구분 처리에 맡기고 따로 추가하지 않는다.
      if (line.trim()) paras.push(line)
    }

    if (paras.length) out.push(paras.join('\n\n'))
  }

  return out.join('\n\n')
}

/** 한 섹션(회차)의 본문 문단을 평문 배열로 추출한다(독자뷰 미리보기용, 제목 제외). */
export function sectionToParagraphs(section: CompiledSection): string[] {
  if (!section || !section.blocks) return []
  const paras: string[] = []
  for (const block of section.blocks) {
    const line = blockToPlain(block)
    if (line.trim()) paras.push(line)
  }
  return paras
}

// ---------- 웹소설 플랫폼 모바일 독자뷰 프리셋 ----------
//
// 작가가 쓴 회차가 실제 연재 플랫폼의 "독자 화면(모바일)"에서 어떻게 보이는지 미리보는 용도.
// 각 플랫폼의 기본 리더 관행(배경/글꼴/줄간격/문단 간격/폭)과 회차 권장 분량을 근사치로 정의한다.
// ※ 권장 분량/스타일은 플랫폼 관행 기준의 가이드 근사치이며, 플랫폼 정책 변경에 따라 달라질 수 있다.

export interface ReaderPreset {
  id: string
  name: string
  /** 이 플랫폼 리더의 기본 테마(다크/라이트). */
  theme: 'light' | 'dark'
  bg: string
  fg: string
  /** 본문 글꼴(고딕/명조 계열). */
  fontFamily: string
  fontPx: number
  lineHeight: number
  /** 자간(em). */
  letterSpacing: number
  /** 문단 사이 간격(px) — 웹소설은 문단 간 여백이 큰 편. */
  paraGap: number
  /** 첫 줄 들여쓰기 여부(웹소설은 대개 들여쓰기 없음). */
  indent: boolean
  /** 모바일 본문 폭(px). */
  widthPx: number
  /** 회차 권장 분량(공백 포함 글자수) 근사치. */
  recMin: number
  recMax: number
  note: string
}

const GOTHIC = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif"
const SERIF = "'Noto Serif KR','Batang',serif"

export const PLATFORM_READER_PRESETS: ReaderPreset[] = [
  {
    id: 'munpia', name: '문피아', theme: 'light',
    bg: '#ffffff', fg: '#222222', fontFamily: GOTHIC,
    fontPx: 17, lineHeight: 1.8, letterSpacing: -0.01, paraGap: 16, indent: false,
    widthPx: 380, recMin: 4500, recMax: 6500,
    note: '남성향 중심. 회차 5,000~6,000자 내외가 일반적이며 문단 간 여백이 큰 편.',
  },
  {
    id: 'naver-series', name: '네이버 시리즈', theme: 'light',
    bg: '#fbfbfb', fg: '#1a1a1a', fontFamily: GOTHIC,
    fontPx: 17, lineHeight: 1.9, letterSpacing: -0.01, paraGap: 18, indent: false,
    widthPx: 380, recMin: 4500, recMax: 6000,
    note: '넓은 줄간격의 가독성 중시 리더. 회차 4,500~6,000자.',
  },
  {
    id: 'kakaopage', name: '카카오페이지', theme: 'light',
    bg: '#ffffff', fg: '#222222', fontFamily: GOTHIC,
    fontPx: 16, lineHeight: 1.85, letterSpacing: -0.01, paraGap: 16, indent: false,
    widthPx: 380, recMin: 4500, recMax: 6000,
    note: '기다리면 무료 등 회차 과금. 회차 분량 균일성이 중요.',
  },
  {
    id: 'novelpia', name: '노벨피아', theme: 'dark',
    bg: '#1c1f24', fg: '#e6e6e6', fontFamily: GOTHIC,
    fontPx: 17, lineHeight: 1.8, letterSpacing: -0.005, paraGap: 16, indent: false,
    widthPx: 380, recMin: 3000, recMax: 5500,
    note: '다크 리더가 기본값으로 흔함. 회차 3,000~5,500자 폭넓게 운용.',
  },
  {
    id: 'ridi', name: '리디', theme: 'light',
    bg: '#fdfdfb', fg: '#1f1f1f', fontFamily: SERIF,
    fontPx: 17, lineHeight: 1.9, letterSpacing: 0, paraGap: 14, indent: true,
    widthPx: 380, recMin: 4000, recMax: 6000,
    note: '전자책 계열로 명조·들여쓰기 가독성. 단행본/연재 혼용.',
  },
  {
    id: 'joara', name: '조아라', theme: 'light',
    bg: '#ffffff', fg: '#2a2a2a', fontFamily: GOTHIC,
    fontPx: 16, lineHeight: 1.8, letterSpacing: -0.01, paraGap: 16, indent: false,
    widthPx: 360, recMin: 3500, recMax: 5500,
    note: '자유연재 중심. 회차 3,500~5,500자.',
  },
]
