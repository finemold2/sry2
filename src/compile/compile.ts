// 컴파일 엔진: 원고(Draft)의 포함 대상 문서를 바인더 순서대로 DFS 조회해 하나로 합친다.
import { docToPlainText, modelToHtml, parseRtf, serializeRtf } from '../rtf'
import type { Block, BlockType } from '../rtf'
import { DRAFT_ROOT, type BinderItem, type Project } from '../model'

export type Separator = 'blank' | 'rule' | 'none'

export interface CompileOptions {
  includeTitles: boolean
  titleLevel: 1 | 2 | 3
  separator: Separator
  onlyIncluded: boolean
  folderTitlesAsHeadings: boolean
  numberChapters: boolean
  chapterPrefix: string // {n} 자리에 번호. 예: "제 {n} 장"
  honorPageBreaks: boolean
  /** 활자 치환: 직선 따옴표→둥근 따옴표, ...→…, ' -- '→' — '(공백 둘러싼 것만), 숫자/단어 사이 --→–(en대시), ---→—, ***→⁂. */
  substitutions?: boolean
  /** 섹션 타입별 컴파일 서식 규칙(섹션 레이아웃). 키 = sectionTypeId. */
  sectionLayouts?: Record<string, SectionLayout>
  /** 지정 시 이 아이템들(과 하위)만 컴파일. 없으면 원고 전체. */
  groupItemIds?: string[] | null
}

/** 섹션(문서) 타입별 컴파일 서식 규칙. */
export interface SectionLayout {
  /** 제목 레벨 override(없으면 전역 titleLevel). */
  titleLevel?: number
  /** 본문 정렬 override. */
  align?: 'left' | 'center' | 'right' | 'justify'
  /** 제목 출력 안 함. */
  suppressTitle?: boolean
}

/** 아이템에 적용되는 섹션 레이아웃(있으면). */
function layoutFor(opts: CompileOptions, item: BinderItem): SectionLayout | undefined {
  return item.sectionTypeId ? opts.sectionLayouts?.[item.sectionTypeId] : undefined
}

/** 따옴표 여닫음 상태 — 한 블록(문단)의 여러 run 사이에서 공유해 run 경계로 짝이 깨지지 않게 한다. */
export interface QuoteState { dq: boolean; sq: boolean }

/**
 * 출판용 활자 치환(스마트 따옴표·말줄임표·대시·장면 구분). state 를 넘기면 여닫음 상태를 블록 내 run 들 간 공유.
 * 대시 규칙은 보수적: 공백으로 둘러싸인 ' -- ' 만 em대시(—)로, 숫자/단어 사이 '--'(예: 2010--2020)는 en대시(–)로 보존해
 * 범위·하이픈 의도가 em대시로 과변환되지 않게 한다.
 */
export function applyTypography(text: string, state?: QuoteState): string {
  if (!text) return text
  const st = state || { dq: true, sq: true }
  let t = text
    .replace(/\*(?:\s*\*){2,}/g, '⁂') // *** / * * * → 장면 구분 글리프
    .replace(/---/g, '—') // em대시(타이포그래피 관례상 3연속은 em으로 통일)
    // '--' → en대시(–): 무조건 em대시로 바꾸면 숫자 범위(2010--2020)·하이픈 의도까지 깨지므로 보수적으로 처리.
    //  · 공백으로 둘러싸인 ' -- ' 만 em대시(' — ')로(영문 문장의 절 구분 관례).
    //  · 숫자--숫자(범위) 등 단어/숫자 사이의 '--' 는 en대시(–) 로(범위 표기를 보존, em으로 과변환하지 않음).
    .replace(/ -- /g, ' — ')
    .replace(/(?<=[\p{L}\p{N}])--(?=[\p{L}\p{N}])/gu, '–')
    .replace(/\.\.\./g, '…')
  // 큰따옴표: 여는/닫는 교대 — 한글처럼 글자에 바로 붙어도(그는"가자") 정확히 짝지음(이웃문자 화이트리스트로는 한글 처리 불가)
  t = t.replace(/"/g, () => {
    const c = st.dq ? '“' : '”'
    st.dq = !st.dq
    return c
  })
  // 작은따옴표: 축약형(글자'글자, don't)은 아포스트로피(’), 그 외는 여는/닫는 교대
  const isWord = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch)
  t = t.replace(/'/g, (_m: string, off: number, s: string) => {
    if (isWord(s[off - 1]) && isWord(s[off + 1])) return '’'
    const c = st.sq ? '‘' : '’'
    st.sq = !st.sq
    return c
  })
  return t
}

export const defaultCompileOptions: CompileOptions = {
  includeTitles: true,
  titleLevel: 2,
  separator: 'blank',
  onlyIncluded: true,
  folderTitlesAsHeadings: true,
  numberChapters: false,
  chapterPrefix: '제 {n} 장',
  honorPageBreaks: true,
}

export interface CompileResult {
  rtf: string
  html: string
  text: string
  wordCount: number
  documentCount: number
}

interface Piece {
  item: BinderItem
  depth: number
}

function gather(project: Project, opts: CompileOptions): Piece[] {
  const out: Piece[] = []
  // "컴파일 포함"은 문서별 속성이다. 부모 폴더가 제외돼도 포함된 자식은 살린다.
  // 제외된 항목은 자신을 출력하지 않을 뿐, 자식 탐색은 계속한다(깊이는 출력될 때만 증가).
  const walk = (id: string, depth: number) => {
    const it = project.items[id]
    if (!it || it.root) return
    const included = !opts.onlyIncluded || it.includeInCompile
    if (included) out.push({ item: it, depth })
    it.childIds.forEach((c) => walk(c, included ? depth + 1 : depth))
  }
  if (opts.groupItemIds && opts.groupItemIds.length) {
    opts.groupItemIds.forEach((id) => walk(id, 0))
  } else {
    const draft = project.items[DRAFT_ROOT]
    draft?.childIds.forEach((c) => walk(c, 0))
  }
  return out
}

/** blank 구분자 블록의 내부 표식(styleId). RTF/TXT 직렬화는 styleId 를 무시하므로 출력에 영향 없음. */
const BLANK_SEP_MARK = '__compile_doc_separator__'

function separatorBlocks(sep: Separator): Block[] {
  if (sep === 'none') return []
  if (sep === 'rule') return [{ type: 'p', align: 'center', runs: [{ text: '⁂', style: {} }] }]
  // blank: 빈 문단 1개. styleId 표식을 달아 미리보기 HTML 에서만 문서 경계를 옅게 시각화한다.
  // (제목 없는 문서가 연속될 때 본문이 붙어 구분이 안 보이는 문제 — RTF/TXT 는 그대로 빈 줄 유지)
  return [{ type: 'p', runs: [], styleId: BLANK_SEP_MARK }]
}

function headingType(level: number): BlockType {
  const l = Math.min(4, Math.max(1, level))
  return ('h' + l) as BlockType
}

/** 컴파일 시 코멘트(주석) 마커 런을 제거(스크리브너 기본 동작). 각주는 유지. */
function stripComments(blocks: Block[]): Block[] {
  return blocks.map((b) => ({ ...b, runs: b.runs.filter((r) => r.style.comment == null) }))
}

/**
 * 각주 마커를 본문 인라인 참조 [n] 로 바꾸고, 끝에 각주/미주 목록 섹션을 덧붙인다.
 * 각주(footnote)와 미주(endnote)는 별도 번호 계열·별도 라벨 섹션("각주"/"미주")으로 분리해
 * 학술 문서의 각주/미주 구분이 평문/HTML 출력에서 소실되지 않게 한다(RTF 는 native \footnote/\ftnalt 로 이미 구분 유지).
 * 코멘트 마커는 제거. (RTF 이외 포맷·평문/HTML 출력용)
 */
function footnotesToInline(blocks: Block[]): Block[] {
  let fn = 0
  let en = 0
  const footnotes: { num: number; text: string }[] = []
  const endnotes: { num: number; text: string }[] = []
  const out: Block[] = blocks.map((b) => ({
    ...b,
    runs: b.runs.flatMap((r) => {
      if (r.style.comment != null) return []
      if (r.style.footnote != null) {
        if (r.style.endnote) {
          en++
          endnotes.push({ num: en, text: r.style.footnote })
          // 미주 참조는 본문과 구분되도록 '※' 접두를 단다(각주[n]과 시각 구분).
          return [{ text: `[※${en}]`, style: { superscript: true } }]
        }
        fn++
        footnotes.push({ num: fn, text: r.style.footnote })
        return [{ text: `[${fn}]`, style: { superscript: true } }]
      }
      return [r]
    }),
  }))
  const appendSection = (label: string, prefix: string, notes: { num: number; text: string }[]) => {
    if (!notes.length) return
    out.push({ type: 'hr', runs: [] })
    out.push({ type: 'h3', runs: [{ text: label, style: {} }] })
    for (const note of notes) {
      out.push({ type: 'p', runs: [{ text: `[${prefix}${note.num}] ${note.text}`, style: {} }] })
    }
  }
  appendSection('각주', '', footnotes)
  appendSection('미주', '※', endnotes)
  return out
}

/**
 * 컴파일 결과를 미리보기/HTML 출력용 HTML 로 렌더링한다.
 * separator=blank 로 표식(BLANK_SEP_MARK)이 달린 빈 구분 문단은, 제목 없는 문서가 연속될 때
 * 본문이 붙어 경계가 안 보이는 문제를 막기 위해 '옅은 문서 경계 구분선'으로 시각화한다.
 * (테마 변수를 쓰는 인라인 스타일. RTF/TXT 출력은 영향받지 않음 — 그쪽은 빈 줄 그대로 유지.)
 */
function renderCompiledHtml(blocks: Block[]): string {
  // 표식이 없으면(rule/none 구분자 또는 단일 문서) 기존 동작 그대로 한 번에 렌더링.
  if (!blocks.some((b) => b.styleId === BLANK_SEP_MARK)) {
    return modelToHtml({ blocks })
  }
  // 표식 문단을 경계로 세그먼트를 나누고, 세그먼트 사이에 옅은 구분선을 끼운다.
  const boundary =
    '<hr class="compile-doc-boundary" aria-hidden="true" ' +
    'style="border:none;border-top:1px dashed var(--border,#ccc);opacity:.5;margin:1.25em 0">'
  const parts: string[] = []
  let segment: Block[] = []
  const flush = () => {
    // 빈 세그먼트도 빈 줄 의미를 잃지 않도록, 내용이 있을 때만 렌더링하고 경계만 남긴다.
    if (segment.length) parts.push(modelToHtml({ blocks: segment }))
    segment = []
  }
  for (const b of blocks) {
    if (b.styleId === BLANK_SEP_MARK) {
      flush()
      parts.push(boundary)
    } else {
      segment.push(b)
    }
  }
  flush()
  const html = parts.join('')
  return html || '<p><br></p>'
}

export function compile(project: Project, opts: CompileOptions): CompileResult {
  const pieces = gather(project, opts)
  const blocks: Block[] = []
  let docCount = 0
  let first = true
  let chapterNum = 0

  for (const { item, depth } of pieces) {
    const isFolder = item.type === 'folder'
    const lay = layoutFor(opts, item)
    if (!first) blocks.push(...separatorBlocks(opts.separator))
    first = false
    const startLen = blocks.length

    if (opts.includeTitles && !lay?.suppressTitle && (isFolder ? opts.folderTitlesAsHeadings : true)) {
      let titleText = item.title
      if (opts.numberChapters && isFolder) {
        chapterNum++
        titleText = opts.chapterPrefix.replace(/\{n\}/g, String(chapterNum)) + (item.title ? ' ' + item.title : '')
      }
      // 빈/공백 제목은 빈 헤딩을 만들지 않도록 건너뜀(compileSections 의 title.trim() 가드와 일치).
      if (titleText.trim())
        blocks.push({ type: headingType((lay?.titleLevel ?? opts.titleLevel) + depth), runs: [{ text: titleText, style: {} }] })
    }

    if (!isFolder && item.bodyRtf) {
      const doc = parseRtf(item.bodyRtf)
      const bs0 = doc.blocks.filter((b, i) => !(i === doc.blocks.length - 1 && b.runs.length === 0))
      let bs = bs0.length ? bs0 : doc.blocks
      // 본문 RTF 가 비었지만 plainText 캐시가 있으면 그것으로 대체(compileSections 와 동작 일치 — 미리보기/TXT/RTF/PDF 누락 방지).
      const hasText = bs.some((b) => b.runs.some((r) => r.text.trim()))
      if (!hasText && item.plainText && item.plainText.trim()) bs = [{ type: 'p', runs: [{ text: item.plainText, style: {} }] }]
      if (lay?.align) bs.forEach((b) => (b.align = lay.align))
      blocks.push(...bs)
      docCount++
    } else if (!isFolder && !item.bodyRtf && item.plainText && item.plainText.trim()) {
      blocks.push({ type: 'p', align: lay?.align, runs: [{ text: item.plainText, style: {} }] })
      docCount++
    }

    // 페이지 나눔: 이 문서의 첫 블록 앞에서
    if (opts.honorPageBreaks && item.pageBreakBefore && blocks.length > startLen) {
      blocks[startLen] = { ...blocks[startLen], pageBreak: true }
    }
  }

  if (blocks.length === 0) blocks.push({ type: 'p', runs: [] })
  if (opts.substitutions)
    for (const b of blocks) {
      const qs: QuoteState = { dq: true, sq: true } // 블록 내 run 들이 따옴표 여닫음 상태 공유
      b.runs.forEach((r) => {
        r.text = applyTypography(r.text, qs)
        // 각주 본문(메타데이터)도 동일 치환 — 본문/HTML/RTF 모든 출력에서 일관(compileSections 와 동작 일치).
        if (r.style.footnote != null) r.style.footnote = applyTypography(r.style.footnote)
      })
    }
  // RTF: 네이티브 각주 유지(코멘트만 제거). 평문/HTML: 각주를 [n]+미주 목록으로 변환.
  const rtfBlocks = stripComments(blocks)
  const inlineBlocks = footnotesToInline(blocks)
  const textDoc = { blocks: inlineBlocks }
  const text = docToPlainText(textDoc)
  const wordCount = text.split(/\s+/).filter(Boolean).length

  return {
    rtf: serializeRtf({ blocks: rtfBlocks }),
    html: renderCompiledHtml(inlineBlocks),
    text,
    wordCount,
    documentCount: docCount,
  }
}

// 내보내기 엔진(docx/epub/fountain/fdx/markdown)이 기대하는 평탄(flat) 모양.
export interface ERun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  superscript?: boolean
  subscript?: boolean
  fontSize?: number
  fontFamily?: string
  color?: string
  highlight?: string
  link?: string
  /** 인라인 이미지 data URL(+선택 크기). 모든 익스포터가 이미지를 보존하도록 평탄 모양에 포함. */
  image?: string
  imageW?: number
  imageH?: number
}
/** 각본(스크린플레이) 요소 타입. src/script/elements.ts 의 ScriptElement 와 일치. */
export type ScriptElement = 'scene' | 'action' | 'character' | 'dialogue' | 'paren' | 'transition'

/**
 * 블록의 leftIndent(pt)/align 으로부터 각본 요소 타입을 역추정한다.
 * src/script/elements.ts 의 detectElement() 휴리스틱(서식 인코딩 역매핑)과 동일한 임계값을 사용:
 *   align:right → transition, li>=140 → character, >=96 → paren, >=40 → dialogue,
 *   들여쓰기 없음: 대문자면 scene, 아니면 action.
 * 이 값을 export 모양에 실어 두면 fdx/fountain 직렬화기가 휴리스틱 대신 우선 사용해
 * 인물/대사/지문 등 각본 요소 구분을 왕복(import↔export)에서 보존할 수 있다.
 */
function detectElementFromBlock(b: Block): ScriptElement | undefined {
  // 각본 요소가 아닌 일반 블록(헤딩·리스트·인용·구분선)은 요소 태깅 대상이 아니다.
  if (b.type !== 'p') return undefined
  const align = b.align
  const li = b.leftIndent || 0
  if (align === 'right') return 'transition'
  if (li >= 140) return 'character'
  if (li >= 96) return 'paren'
  if (li >= 40) return 'dialogue'
  const text = b.runs.map((r) => r.text).join('').trim()
  if (text && text === text.toUpperCase() && /[A-Z가-힣]/.test(text) && text.length < 60) return 'scene'
  return 'action'
}

export interface EBlock {
  type: BlockType
  align?: 'left' | 'center' | 'right' | 'justify'
  runs: ERun[]
  listLevel?: number
  /** 각본 요소 타입(leftIndent/align 역매핑으로 보존). fdx/fountain 직렬화기가 휴리스틱보다 우선 사용. */
  element?: ScriptElement
}
export interface CompiledSection {
  title: string
  level: number
  blocks: EBlock[]
  /** 이 섹션 앞에서 페이지 나눔(문서의 pageBreakBefore + honorPageBreaks). */
  pageBreakBefore?: boolean
}

function runToExport(run: Block['runs'][number]): ERun {
  const s = run.style || {}
  const r: ERun = { text: run.text }
  if (s.bold) r.bold = true
  if (s.italic) r.italic = true
  if (s.underline) r.underline = true
  if (s.strike) r.strike = true
  if (s.superscript) r.superscript = true
  if (s.subscript) r.subscript = true
  if (s.fontSize) r.fontSize = s.fontSize
  if (s.fontFamily) r.fontFamily = s.fontFamily
  if (s.color) r.color = s.color
  if (s.highlight) r.highlight = s.highlight
  if (s.link) r.link = s.link
  if (s.image) { r.image = s.image; if (s.imageW) r.imageW = s.imageW; if (s.imageH) r.imageH = s.imageH }
  return r
}

function blockToExport(b: Block): EBlock {
  const eb: EBlock = { type: b.type, align: b.align, runs: b.runs.map(runToExport), listLevel: b.listLevel }
  // 각본 요소 타입을 leftIndent/align 역매핑으로 보존(왕복 시 휴리스틱 재추정 방지).
  const el = detectElementFromBlock(b)
  if (el) eb.element = el
  return eb
}

/** DOCX/ePub/Fountain/FDX/Markdown 내보내기 엔진용: 문서별 평탄 섹션 배열. */
export function compileSections(project: Project, opts: CompileOptions): CompiledSection[] {
  const pieces = gather(project, opts)
  const sections: CompiledSection[] = []
  // 각주(footnote)/미주(endnote)를 각각 전역 번호로 인라인 [n]/[※n] 처리하고, 마지막에 "각주"/"미주" 섹션을 분리해 덧붙인다.
  // (모든 비RTF 내보내기 포맷에서 학술 문서의 각주/미주 구분을 보존.) 코멘트는 제거.
  let fnNum = 0
  let enNum = 0
  const footnotes: { num: number; text: string }[] = []
  const endnotes: { num: number; text: string }[] = []
  const transform = (blocks: Block[]): Block[] =>
    blocks.map((b) => ({
      ...b,
      runs: b.runs.flatMap((r) => {
        if (r.style.comment != null) return []
        if (r.style.footnote != null) {
          if (r.style.endnote) {
            enNum++
            endnotes.push({ num: enNum, text: r.style.footnote })
            return [{ text: `[※${enNum}]`, style: { superscript: true } }]
          }
          fnNum++
          footnotes.push({ num: fnNum, text: r.style.footnote })
          return [{ text: `[${fnNum}]`, style: { superscript: true } }]
        }
        return [r]
      }),
    }))

  let chapterNum = 0
  for (const { item, depth } of pieces) {
    // 제목 표시 옵션 + 섹션 레이아웃을 모든 내보내기 포맷에 일관 적용
    const lay = layoutFor(opts, item)
    const level = Math.min(6, (lay?.titleLevel ?? opts.titleLevel) + depth)
    const showTitle = opts.includeTitles && !lay?.suppressTitle && (item.type === 'folder' ? opts.folderTitlesAsHeadings : true)
    if (item.type === 'folder') {
      if (!showTitle) continue // 제목 숨김이면 폴더 섹션 생성 안 함
      let title = item.title
      if (opts.numberChapters) {
        chapterNum++
        title = opts.chapterPrefix.replace(/\{n\}/g, String(chapterNum)) + (item.title ? ' ' + item.title : '')
      }
      if (title.trim()) sections.push({ title, level, blocks: [], pageBreakBefore: !!(opts.honorPageBreaks && item.pageBreakBefore) })
    } else {
      const rtf = item.bodyRtf || ''
      const doc = parseRtf(rtf)
      let bs = doc.blocks.filter((b, i) => !(i === doc.blocks.length - 1 && b.runs.length === 0))
      const hasText = bs.some((b) => b.runs.some((r) => r.text.trim()))
      if (!hasText && item.plainText && item.plainText.trim()) {
        bs = [{ type: 'p', runs: [{ text: item.plainText, style: {} }] }]
      }
      // 제목 숨김이면 title='' 로 두어 익스포터의 title.trim() 가드가 제목을 생략하게 함
      const eblocks = transform(bs).map(blockToExport)
      if (lay?.align) eblocks.forEach((b) => (b.align = lay.align))
      sections.push({ title: showTitle ? item.title : '', level, blocks: eblocks, pageBreakBefore: !!(opts.honorPageBreaks && item.pageBreakBefore) })
    }
  }

  // 각주/미주를 라벨이 다른 두 섹션으로 분리해(각주는 [n], 미주는 [※n]) 내보내기 포맷에서 구분 유지.
  const pushNotesSection = (label: string, prefix: string, notes: { num: number; text: string }[]) => {
    if (!notes.length) return
    const noteBlocks: Block[] = notes.map((n) => ({
      type: 'p' as BlockType,
      runs: [{ text: `[${prefix}${n.num}] ${n.text}`, style: {} }],
    }))
    sections.push({ title: label, level: 1, blocks: noteBlocks.map(blockToExport) })
  }
  pushNotesSection('각주', '', footnotes)
  pushNotesSection('미주', '※', endnotes)
  if (opts.substitutions)
    for (const sec of sections) {
      sec.title = applyTypography(sec.title)
      for (const b of sec.blocks) {
        const qs: QuoteState = { dq: true, sq: true }
        b.runs.forEach((r) => { r.text = applyTypography(r.text, qs) })
      }
    }
  return sections
}
