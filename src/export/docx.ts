// 컴파일된 공용 문서 모델(ESection[]) 을 Word .docx Blob 으로 변환한다.
// 브라우저 전용. npm 'docx' v9 API 만 사용하며 Node 전용 API 는 쓰지 않는다.
// 외부 타입 import 는 금지이므로 공용 모델 인터페이스를 이 파일에서 자체 정의/export 한다.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  PageBreak,
  ExternalHyperlink,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  HighlightColor,
  BorderStyle,
  LevelFormat,
} from 'docx';
// 타입 전용 import 는 'import type' 으로 분리한다.
import type {
  IRunOptions,
  IParagraphOptions,
  ISectionOptions,
  IIndentAttributesProperties,
  INumberingOptions,
  ParagraphChild,
} from 'docx';

/* ───────────────────────── 공용 문서 모델 (자체 정의/ export) ───────────────────────── */

// 한 줄 텍스트 조각과 그 서식.
export interface ERun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontSize?: number /* pt */;
  fontFamily?: string;
  color?: string /* #rrggbb */;
  highlight?: string;
  link?: string;
  image?: string /* data URL */;
  imageW?: number;
  imageH?: number;
}

// 블록(문단) 종류.
export type EBlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'blockquote'
  | 'li-ul'
  | 'li-ol'
  | 'hr';

// 한 블록(문단/제목/목록 항목/구분선 등).
export interface EBlock {
  type: EBlockType;
  align?: 'left' | 'center' | 'right' | 'justify';
  runs: ERun[];
  listLevel?: number;
}

// 컴파일된 한 섹션(문서/폴더).
export interface ESection {
  title: string;
  level: number;
  blocks: EBlock[];
  pageBreakBefore?: boolean;
}

// 문서 메타데이터.
export interface EMeta {
  title: string;
  author?: string;
  language?: string;
}

/* ───────────────────────── 내부 상수 / 헬퍼 ───────────────────────── */

// docx 의 거리 단위는 twip(twentieths of a point, 1pt = 20twip). 0.5인치 = 720twip.
const INDENT_PER_LEVEL_TWIP = 720; // 목록/인용 한 단계당 들여쓰기
const QUOTE_INDENT_TWIP = 720; // blockquote 기본 들여쓰기
const SECTION_GAP_AFTER_TWIP = 240; // 블록 사이 기본 아래 간격(12pt)

// 정렬 매핑: 모델의 align -> docx AlignmentType.
function mapAlign(
  align: EBlock['align'],
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (align) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

// 제목 레벨 매핑: h1~h4 -> docx HeadingLevel. 그 외는 undefined(일반 문단).
function mapHeading(
  type: EBlockType,
): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  switch (type) {
    case 'h1':
      return HeadingLevel.HEADING_1;
    case 'h2':
      return HeadingLevel.HEADING_2;
    case 'h3':
      return HeadingLevel.HEADING_3;
    case 'h4':
      return HeadingLevel.HEADING_4;
    default:
      return undefined;
  }
}

// '#rrggbb' 또는 'rrggbb' 를 docx 가 요구하는 '#' 없는 6자리 hex 로 정규화한다.
// 유효하지 않으면 undefined 반환.
function normalizeHex(color?: string): string | undefined {
  if (!color) return undefined;
  const hex = color.replace(/^#/, '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    // 3자리 단축 표기를 6자리로 확장.
    return hex
      .toLowerCase()
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return undefined;
}

// docx 의 highlight 는 임의 hex 가 아니라 명명된 색만 받는다.
// 모델의 highlight(#rrggbb 또는 색 이름)를 가장 가까운 명명 색으로 매핑한다.
function mapHighlight(
  highlight?: string,
): (typeof HighlightColor)[keyof typeof HighlightColor] | undefined {
  if (!highlight) return undefined;
  const raw = highlight.trim().toLowerCase();

  // 이미 명명된 docx 색 이름이면 그대로 사용.
  const named = Object.values(HighlightColor) as string[];
  if (named.includes(raw)) {
    return raw as (typeof HighlightColor)[keyof typeof HighlightColor];
  }

  // hex 이면 RGB 거리로 가장 가까운 명명 색을 고른다.
  const hex = normalizeHex(raw);
  if (!hex) return undefined;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // 명명 색의 대표 RGB 값 표(docx HighlightColor 기준).
  const palette: ReadonlyArray<{
    name: (typeof HighlightColor)[keyof typeof HighlightColor];
    rgb: readonly [number, number, number];
  }> = [
    { name: HighlightColor.BLACK, rgb: [0, 0, 0] },
    { name: HighlightColor.BLUE, rgb: [0, 0, 255] },
    { name: HighlightColor.CYAN, rgb: [0, 255, 255] },
    { name: HighlightColor.GREEN, rgb: [0, 255, 0] },
    { name: HighlightColor.MAGENTA, rgb: [255, 0, 255] },
    { name: HighlightColor.RED, rgb: [255, 0, 0] },
    { name: HighlightColor.YELLOW, rgb: [255, 255, 0] },
    { name: HighlightColor.WHITE, rgb: [255, 255, 255] },
    { name: HighlightColor.DARK_BLUE, rgb: [0, 0, 139] },
    { name: HighlightColor.DARK_CYAN, rgb: [0, 139, 139] },
    { name: HighlightColor.DARK_GREEN, rgb: [0, 100, 0] },
    { name: HighlightColor.DARK_MAGENTA, rgb: [139, 0, 139] },
    { name: HighlightColor.DARK_RED, rgb: [139, 0, 0] },
    { name: HighlightColor.DARK_YELLOW, rgb: [128, 128, 0] },
    { name: HighlightColor.DARK_GRAY, rgb: [64, 64, 64] },
    { name: HighlightColor.LIGHT_GRAY, rgb: [192, 192, 192] },
  ];

  let best = palette[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const entry of palette) {
    const [pr, pg, pb] = entry.rgb;
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best.name;
}

/* ───────────────────────── Run 변환 ───────────────────────── */

// runStyleOptions 의 반환 타입(텍스트/자식 제외한 서식 옵션).
type RunStyle = Omit<IRunOptions, 'text' | 'children'>;
// IRunOptions 의 속성은 readonly 이므로, 누적용으로 쓰기 가능한 형태를 따로 둔다.
type MutableRunStyle = { -readonly [K in keyof RunStyle]: RunStyle[K] };

// ERun 의 서식만 docx IRunOptions(텍스트 제외)로 변환한다.
// ExternalHyperlink 의 자식과 일반 TextRun 둘 다에서 재사용한다.
function runStyleOptions(run: ERun): RunStyle {
  const options: MutableRunStyle = {};

  if (run.bold) options.bold = true;
  if (run.italic) options.italics = true;
  if (run.underline) options.underline = { type: UnderlineType.SINGLE };
  if (run.strike) options.strike = true;
  // 위/아래 첨자는 동시에 켜질 수 없으므로 superscript 를 우선한다.
  if (run.superscript) options.superScript = true;
  else if (run.subscript) options.subScript = true;
  // size 는 half-point 단위 → pt * 2.
  if (typeof run.fontSize === 'number' && run.fontSize > 0) {
    options.size = Math.round(run.fontSize * 2);
  }
  if (run.fontFamily) options.font = run.fontFamily;
  // color 는 '#' 없는 hex.
  const color = normalizeHex(run.color);
  if (color) options.color = color;
  const highlight = mapHighlight(run.highlight);
  if (highlight) options.highlight = highlight;

  return options;
}

// data URL 인라인 이미지를 docx ImageRun 으로 변환(소실 방지). 디코드 실패/미지원 포맷은 '[이미지]' 텍스트로 대체.
function imageRunFor(run: ERun): ParagraphChild {
  const m = (run.image || '').match(/^data:(image\/([a-z0-9.+-]+));base64,([\s\S]*)$/i);
  const subtype = m ? m[2].toLowerCase() : '';
  const type = subtype === 'jpeg' || subtype === 'jpg' ? 'jpg' : subtype === 'png' ? 'png' : subtype === 'gif' ? 'gif' : subtype === 'bmp' ? 'bmp' : null;
  if (!m || !type) return new TextRun({ text: '[이미지]' });
  try {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const w = run.imageW && run.imageW > 0 ? Math.round(run.imageW) : 360;
    const h = run.imageH && run.imageH > 0 ? Math.round(run.imageH) : 240;
    return new ImageRun({ data: bytes, type, transformation: { width: w, height: h } } as ConstructorParameters<typeof ImageRun>[0]);
  } catch {
    return new TextRun({ text: '[이미지]' });
  }
}

// ERun 하나를 docx 의 문단 자식(ParagraphChild)으로 변환한다.
// link 가 있으면 ExternalHyperlink 로 감싼다.
function runToChild(run: ERun): ParagraphChild {
  if (run.image) return imageRunFor(run);
  const style = runStyleOptions(run);

  if (run.link) {
    // 하이퍼링크는 보통 밑줄+파란색으로 표시한다(명시 색이 없을 때만 기본값 적용).
    const linkRun = new TextRun({
      text: run.text,
      ...style,
      underline: style.underline ?? { type: UnderlineType.SINGLE },
      color: style.color ?? '0563c1',
    });
    return new ExternalHyperlink({
      link: run.link,
      children: [linkRun],
    });
  }

  return new TextRun({ text: run.text, ...style });
}

/* ───────────────────────── Block 변환 ───────────────────────── */

// 목록/인용 들여쓰기를 listLevel 로부터 계산한다.
function indentForLevel(level: number | undefined): IIndentAttributesProperties | undefined {
  const lv = typeof level === 'number' && level > 0 ? level : 0;
  if (lv <= 0) return undefined;
  return { left: lv * INDENT_PER_LEVEL_TWIP };
}

// 하나의 EBlock 을 docx Paragraph 로 변환한다.
// orderedRef 는 li-ol 에 사용할 numbering 참조 이름(섹션별로 생성됨).
function blockToParagraph(block: EBlock, orderedRef: string): Paragraph {
  const align = mapAlign(block.align);
  const children = block.runs.map(runToChild);

  // hr: 가로줄. 빈 문단에 아래쪽 테두리(thematicBreak 대용)를 그린다.
  if (block.type === 'hr') {
    return new Paragraph({
      spacing: { before: SECTION_GAP_AFTER_TWIP, after: SECTION_GAP_AFTER_TWIP },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: '999999' },
      },
      children: [],
    });
  }

  const base: IParagraphOptions = {
    children,
    ...(align ? { alignment: align } : {}),
  };

  // 제목 h1~h4.
  const heading = mapHeading(block.type);
  if (heading) {
    return new Paragraph({
      ...base,
      heading,
      spacing: { before: SECTION_GAP_AFTER_TWIP, after: SECTION_GAP_AFTER_TWIP / 2 },
    });
  }

  // 글머리 기호 목록.
  if (block.type === 'li-ul') {
    const lv = Math.max(0, Math.min(block.listLevel ?? 0, 9));
    return new Paragraph({ ...base, bullet: { level: lv } });
  }

  // 번호 매기기 목록.
  if (block.type === 'li-ol') {
    const lv = Math.max(0, Math.min(block.listLevel ?? 0, 9));
    return new Paragraph({
      ...base,
      numbering: { reference: orderedRef, level: lv },
    });
  }

  // 인용문: 들여쓰기 + 이탤릭(문단 기본 run 서식으로 이탤릭 지정).
  if (block.type === 'blockquote') {
    const extra = (block.listLevel ?? 0) * INDENT_PER_LEVEL_TWIP;
    return new Paragraph({
      ...base,
      indent: { left: QUOTE_INDENT_TWIP + extra },
      run: { italics: true },
      border: {
        left: { style: BorderStyle.SINGLE, size: 12, space: 12, color: 'cccccc' },
      },
      spacing: { after: SECTION_GAP_AFTER_TWIP },
    });
  }

  // 일반 문단(p) 및 나머지: listLevel 이 있으면 들여쓴다.
  const indent = indentForLevel(block.listLevel);
  return new Paragraph({
    ...base,
    ...(indent ? { indent } : {}),
    spacing: { after: SECTION_GAP_AFTER_TWIP },
  });
}

/* ───────────────────────── Numbering 설정 ───────────────────────── */

// 섹션마다 별도의 ordered-list numbering 참조를 만들어,
// 섹션 간 번호가 이어지지 않고 1부터 다시 시작하도록 한다.
function orderedRefName(sectionIndex: number): string {
  return `ordered-${sectionIndex}`;
}

// docx 가 요구하는 numbering config 를 섹션 수만큼 생성한다.
// 각 참조에 대해 0~5단계의 들여쓰기/형식을 정의한다.
function buildNumbering(sectionCount: number): INumberingOptions {
  const config: INumberingOptions['config'][number][] = [];
  for (let s = 0; s < sectionCount; s++) {
    config.push({
      reference: orderedRefName(s),
      levels: Array.from({ length: 6 }, (_unused, level) => ({
        level,
        format: LevelFormat.DECIMAL,
        text: `%${level + 1}.`,
        alignment: AlignmentType.START,
        style: {
          paragraph: {
            indent: {
              left: (level + 1) * INDENT_PER_LEVEL_TWIP,
              hanging: 360,
            },
          },
        },
      })),
    });
  }
  return { config };
}

/* ───────────────────────── 섹션 변환 ───────────────────────── */

// 한 ESection 을 docx 문단 배열로 변환한다.
// 섹션 제목(있으면)을 섹션 level 에 맞는 제목 문단으로 앞에 붙인다.
function sectionToParagraphs(section: ESection, sectionIndex: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const orderedRef = orderedRefName(sectionIndex);

  // 섹션 제목: level(1~) 을 HeadingLevel 로 매핑. 제목이 없으면 생략.
  if (section.title && section.title.trim().length > 0) {
    const level = Math.max(1, Math.min(section.level || 1, 4));
    const headingType = ('h' + level) as EBlockType;
    paragraphs.push(
      blockToParagraph(
        { type: headingType, runs: [{ text: section.title, bold: true }] },
        orderedRef,
      ),
    );
  }

  // 섹션 본문 블록들.
  for (const block of section.blocks) {
    paragraphs.push(blockToParagraph(block, orderedRef));
  }

  return paragraphs;
}

/* ───────────────────────── 진입점 ───────────────────────── */

/**
 * 컴파일된 섹션들을 Word .docx Blob 으로 생성한다(브라우저 전용, 순수 함수).
 * @param sections 컴파일된 섹션 배열
 * @param meta 문서 메타데이터(제목/작성자/언어)
 * @returns .docx 바이너리를 담은 Blob
 */
export async function sectionsToDocx(sections: ESection[], meta: EMeta): Promise<Blob> {
  // 문서 맨 앞에 제목/작성자 표지 문단을 둔다.
  const front: Paragraph[] = [];
  if (meta.title && meta.title.trim().length > 0) {
    front.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: meta.title, bold: true })],
        spacing: { after: SECTION_GAP_AFTER_TWIP },
      }),
    );
  }
  if (meta.author && meta.author.trim().length > 0) {
    front.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: meta.author, italics: true, color: '666666' })],
        spacing: { after: SECTION_GAP_AFTER_TWIP * 2 },
      }),
    );
  }

  // 모든 섹션의 문단을 평탄화하고, 섹션 사이에 빈 문단으로 간격을 둔다.
  const body: Paragraph[] = [...front];
  sections.forEach((section, index) => {
    if (section.pageBreakBefore && body.length > 0) {
      // 문서의 '앞에서 페이지 나눔' → 페이지 분리.
      body.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (index > 0) {
      // 섹션 사이 간격.
      body.push(new Paragraph({ children: [], spacing: { after: SECTION_GAP_AFTER_TWIP } }));
    }
    body.push(...sectionToParagraphs(section, index));
  });

  // docx 의 한 페이지 섹션(ISectionOptions)에 모든 문단을 담는다.
  const docSection: ISectionOptions = { children: body };

  const doc = new Document({
    creator: meta.author,
    title: meta.title,
    numbering: buildNumbering(sections.length),
    sections: [docSection],
  });

  // Packer.toBlob() 으로 브라우저에서 바로 쓸 수 있는 Blob 을 반환한다.
  // (UTF-8 인코딩은 docx 내부에서 처리되어 한글/유니코드가 보존된다.)
  return Packer.toBlob(doc);
}
