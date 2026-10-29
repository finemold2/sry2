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

// 블록 유형별 기본 서식(RTF 스타일시트 \sN 과 리더 호환용 직접 서식). 직렬화기·파서·HTML 변환이 공유한다.
export interface StyleDef {
  s: number
  name: string
  bold?: boolean
  italic?: boolean
  fsHalf?: number // 반 포인트
  li?: number // 기본 왼쪽 들여쓰기(twips)
}
export const STYLES: Record<BlockType, StyleDef> = {
  p: { s: 0, name: 'Normal' },
  h1: { s: 1, name: 'heading 1', bold: true, fsHalf: 36 },
  h2: { s: 2, name: 'heading 2', bold: true, fsHalf: 30 },
  h3: { s: 3, name: 'heading 3', bold: true, fsHalf: 26 },
  h4: { s: 4, name: 'heading 4', bold: true, fsHalf: 24 },
  blockquote: { s: 5, name: 'Quote', italic: true, li: 480 },
  'li-ul': { s: 0, name: 'Normal' },
  'li-ol': { s: 0, name: 'Normal' },
  hr: { s: 0, name: 'Normal' },
}

// 블록 기본 서식과 같은 런 서식은 '상속'으로 보고 지운다 — 제목의 \b\fs36, 인용의 \i 는 문단 수준에서 내보내므로
// 되읽을 때 런에 박히면(굵게+18pt span) 제목을 본문으로 되돌려도 서식이 남는다. 반대로 기본이 굵게가 아닌 블록에서
// '굵게 아님'(bold:false) 같은 명시 해제는 의미가 없어 지운다(제목 안의 명시 해제만 \b0 으로 보존).
export function normalizeRunStyles(block: Block): void {
  const def = STYLES[block.type]
  if (!def) return
  for (const r of block.runs) {
    const s = r.style
    if (!s) continue
    if (s.bold === true && def.bold) delete s.bold
    if (s.bold === false && !def.bold) delete s.bold
    if (s.italic === true && def.italic) delete s.italic
    if (s.italic === false && !def.italic) delete s.italic
    if (s.fontSize != null && def.fsHalf && Math.round(s.fontSize * 2) === def.fsHalf) delete s.fontSize
  }
}
