// RTF 라운드트립의 중심이 되는 구조화 문서 모델.
// 에디터(HTML) <-> 이 모델 <-> RTF 문자열 로 양방향 변환한다.

export type Align = 'left' | 'center' | 'right' | 'justify'

export type BlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'blockquote'
  | 'li-ul'
  | 'li-ol'
  | 'hr'

export interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  fontSize?: number // 포인트(pt)
  fontFamily?: string
  color?: string // '#rrggbb'
  highlight?: string // '#rrggbb'
  link?: string // href
  /** 각주/미주 마커. 이 값이 있으면 run.text 는 '' (앵커 전용 런). */
  footnote?: string
  /** true 면 미주(endnote), 아니면 각주(footnote). */
  endnote?: boolean
  /** 코멘트(주석) 마커. 이 값이 있으면 run.text 는 '' (앵커 전용 런). */
  comment?: string
  /** 코멘트 식별자(인스펙터 연동·RTF \*\atnid 왕복용). */
  commentId?: string
  /** 인라인 이미지 data URL. 이 값이 있으면 run.text 는 '' (이미지 전용 런). RTF \pict 로 왕복. */
  image?: string
  /** 이미지 표시 너비/높이(px, 선택). */
  imageW?: number
  imageH?: number
}

export interface Run {
  text: string
  style: RunStyle
}

export interface Block {
  type: BlockType
  align?: Align
  runs: Run[]
  /** 리스트 중첩 깊이(0부터). li-ul / li-ol 에만 의미. */
  listLevel?: number
  /** 줄 간격 배수(1, 1.15, 1.5, 2 …). */
  lineSpacing?: number
  /** 문단 앞/뒤 여백(pt). */
  spaceBefore?: number
  spaceAfter?: number
  /** 들여쓰기(pt). firstIndent 는 첫 줄(음수 가능). */
  firstIndent?: number
  leftIndent?: number
  rightIndent?: number
  /** 이름 있는 스타일 id(앱 레벨). */
  styleId?: string
  /** 이 문단 앞에서 페이지 나눔(\page) — 주로 컴파일 출력에 사용. */
  pageBreak?: boolean
}

export interface RtfDoc {
  blocks: Block[]
}

export const DEFAULT_FONT = 'Malgun Gothic'

export function emptyDoc(): RtfDoc {
  return { blocks: [{ type: 'p', runs: [] }] }
}

/** 모델에서 순수 텍스트를 추출(단어 수/시놉시스 자동 생성 등에 사용). */
export function docToPlainText(doc: RtfDoc): string {
  return doc.blocks
    .map((b) => b.runs.map((r) => r.text).join(''))
    .join('\n')
}
