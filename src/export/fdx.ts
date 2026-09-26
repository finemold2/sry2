// Final Draft .fdx (FinalDraft XML) 가져오기/내보내기 모듈.
// 외부 라이브러리 없이 브라우저 표준 API(DOMParser/문자열 조립)만 사용한다.
// 모든 함수는 순수 함수이며 Node 전용 API를 쓰지 않는다.
//
// FDX 스키마(Final Draft 8, DocumentType="Script") 요약:
//   <?xml version="1.0" encoding="UTF-8" standalone="no" ?>
//   <FinalDraft DocumentType="Script" Template="No" Version="1">
//     <Content>
//       <Paragraph Type="Scene Heading"><Text>EXT. LIBRARY - DAY</Text></Paragraph>
//       <Paragraph Type="Action"><Text>...</Text></Paragraph>
//       <Paragraph Type="Character"><Text>JOHN</Text></Paragraph>
//       <Paragraph Type="Parenthetical"><Text>(excited)</Text></Paragraph>
//       <Paragraph Type="Dialogue"><Text>...</Text></Paragraph>
//       <Paragraph Type="Transition"><Text>FADE TO BLACK.</Text></Paragraph>
//       <Paragraph Type="General"><Text>...</Text></Paragraph>
//     </Content>
//   </FinalDraft>
// 한 Paragraph 안에 여러 <Text> 노드가 올 수 있으므로(서식 구간 분할) 파싱 시 모두 이어 붙인다.

// ===== 공용 문서 모델(앱의 RTF Block/Run 과 구조적으로 동일). 외부 import 없이 자체 정의. =====

/** 인라인 텍스트 조각(서식 포함). */
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
  /** 인라인 이미지 data URL(+선택 크기). FDX 는 본문 이미지를 표현하지 않으므로 '[이미지]' 텍스트로 대체. */
  image?: string;
  imageW?: number;
  imageH?: number;
}

/** 블록(문단) 종류. */
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

/** 블록(문단) 단위. */
export interface EBlock {
  type: EBlockType;
  align?: 'left' | 'center' | 'right' | 'justify';
  runs: ERun[];
  listLevel?: number;
}

/** 컴파일된 한 섹션(문서/폴더). */
export interface ESection {
  title: string;
  level: number;
  blocks: EBlock[];
  /** 이 섹션 앞에서 강제 페이지 나눔. FDX 에서는 섹션 첫 Paragraph 의 StartsNewPage="Yes" 로 표현. */
  pageBreakBefore?: boolean;
}

/** 문서 메타데이터. */
export interface EMeta {
  title: string;
  author?: string;
  language?: string;
}

// ===== FDX 전용 타입 =====

/**
 * FDX 한 문단(Paragraph)의 단순 표현.
 * type 은 Final Draft 의 Paragraph Type 속성값.
 */
export interface FdxParagraph {
  /** 'Scene Heading' | 'Action' | 'Character' | 'Dialogue' | 'Parenthetical' | 'Transition' | 'General' */
  type: string;
  /** 해당 문단의 평문 텍스트(여러 Text 노드를 이어 붙인 결과). */
  text: string;
  /** 강제 페이지 나눔: Final Draft 의 Paragraph StartsNewPage="Yes" 로 직렬화. */
  startsNewPage?: boolean;
}

/** FDX 에서 허용하는 표준 Paragraph Type 집합. */
const FDX_KNOWN_TYPES: readonly string[] = [
  'Scene Heading',
  'Action',
  'Character',
  'Dialogue',
  'Parenthetical',
  'Transition',
  'General',
  'Shot',
  'Cast List',
  'New Act',
  'End Of Act',
];

/**
 * 알 수 없는 type 은 'General' 로 정규화한다.
 * (Final Draft 가 인식하지 못하는 Type 은 무시될 수 있으므로 안전한 기본값으로 매핑.)
 */
function normalizeType(type: string): string {
  const trimmed = type.trim();
  return FDX_KNOWN_TYPES.includes(trimmed) ? trimmed : 'General';
}

// ===== XML 유틸리티 =====

/**
 * XML 텍스트/속성값 이스케이프.
 * &, <, >, ", ' 를 엔티티로 치환한다. (UTF-8 본문은 그대로 두어 한글이 깨지지 않게 함.)
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ===== 가져오기(파싱) =====

/**
 * FDX XML 문자열을 파싱하여 문단 목록을 돌려준다.
 * <FinalDraft><Content><Paragraph Type="..."><Text>...</Text></Paragraph> 구조를 읽는다.
 * 한 Paragraph 안의 여러 <Text> 노드는 순서대로 이어 붙인다.
 *
 * @param xml FDX(FinalDraft XML) 문자열
 * @returns paragraphs 배열을 담은 객체
 */
export function parseFdx(xml: string): { paragraphs: FdxParagraph[] } {
  const paragraphs: FdxParagraph[] = [];

  // 브라우저 표준 DOMParser 사용(라이브러리 없음).
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // 파싱 오류 감지: 브라우저는 오류 시 <parsererror> 노드를 삽입한다.
  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    // 깨진 XML 이면 빈 결과 반환(예외 대신 안전한 빈 값).
    return { paragraphs };
  }

  // <Content> 하위(또는 문서 전체)의 모든 <Paragraph> 를 순회한다.
  const paragraphNodes = doc.getElementsByTagName('Paragraph');
  for (let i = 0; i < paragraphNodes.length; i++) {
    const para = paragraphNodes.item(i);
    if (!para) {
      continue;
    }

    // Type 속성(없으면 'General').
    const rawType = para.getAttribute('Type') ?? 'General';
    const type = normalizeType(rawType);

    // 강제 페이지 나눔: StartsNewPage="Yes" 면 플래그 보존.
    const startsNewPage = (para.getAttribute('StartsNewPage') ?? '').toLowerCase() === 'yes';

    // 직속/하위의 모든 <Text> 노드를 순서대로 이어 붙인다.
    const textNodes = para.getElementsByTagName('Text');
    let text = '';
    for (let j = 0; j < textNodes.length; j++) {
      const t = textNodes.item(j);
      if (t) {
        // textContent 는 자식 텍스트(엔티티 디코드 포함)를 모두 반환한다.
        text += t.textContent ?? '';
      }
    }

    const p: FdxParagraph = { type, text };
    if (startsNewPage) {
      p.startsNewPage = true;
    }
    paragraphs.push(p);
  }

  return { paragraphs };
}

// ===== 내보내기(직렬화) =====

/**
 * 문단 목록을 유효한 Final Draft 8 FDX XML 문자열로 직렬화한다.
 * XML 선언/루트/Content 래퍼를 포함하며, 텍스트는 XML 이스케이프한다.
 *
 * @param paragraphs 직렬화할 문단 목록
 * @returns FDX XML 문자열
 */
export function paragraphsToFdx(paragraphs: FdxParagraph[]): string {
  const lines: string[] = [];

  // XML 선언(UTF-8 명시 — 한글 보존).
  lines.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
  // Final Draft 8 루트 요소.
  lines.push('<FinalDraft DocumentType="Script" Template="No" Version="1">');
  lines.push('  <Content>');

  for (const para of paragraphs) {
    const type = normalizeType(para.type);
    const safeType = escapeXml(type);
    const safeText = escapeXml(para.text ?? '');
    // 강제 페이지 나눔은 Paragraph 의 StartsNewPage="Yes" 속성으로 표현(Final Draft 가 인식).
    const pageAttr = para.startsNewPage ? ' StartsNewPage="Yes"' : '';
    lines.push(`    <Paragraph Type="${safeType}"${pageAttr}>`);
    lines.push(`      <Text>${safeText}</Text>`);
    lines.push('    </Paragraph>');
  }

  lines.push('  </Content>');
  lines.push('</FinalDraft>');

  // 개행 결합(\n) — UTF-8 텍스트 그대로 반환.
  return lines.join('\n');
}

// ===== ESection -> FdxParagraph 휴리스틱 변환 =====

/**
 * 블록의 모든 run 텍스트를 이어 붙여 평문으로 만든다.
 * FDX 는 본문 이미지를 표현하지 못하므로, 이미지 run 은 '[이미지]' 텍스트로 대체해 소실을 방지한다.
 * (이미지 run 은 text 가 비어 있을 수 있으므로 run.image 가 있으면 항상 대체 텍스트를 추가한다.)
 */
function blockPlainText(block: EBlock): string {
  let text = '';
  for (const run of block.runs) {
    if (run.image) {
      text += '[이미지]';
      continue;
    }
    text += run.text;
  }
  return text;
}

/**
 * 텍스트가 "전부 대문자(영문 기준)"인지 판단한다.
 * 캐릭터 이름/장면 헤딩 휴리스틱에 사용한다.
 * - 영문 알파벳이 하나 이상 있고, 소문자가 전혀 없으면 대문자로 본다.
 */
function isAllCaps(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  return hasUpper && !hasLower;
}

/** 장면 헤딩 접두어(국제 약어 포함) 판별용 정규식. */
const SCENE_HEADING_PREFIX = /^(INT\.?|EXT\.?|EST\.?|INT\.?\/EXT\.?|I\/E\.?)\b/i;

/**
 * 한글 장면 헤딩 판별용 정규식.
 * 한국어 각본은 "S#1. 실내. 거실 - 낮" / "실내/거실/밤" / "낮, 실외 공원" 같이 표기한다.
 * - 앞쪽에 "S#12.", "씬 3", "장면 5." 같은 씬 번호가 올 수 있다.
 * - 어딘가에 실내/실외/내부/외부/낮/밤/아침/저녁/새벽 등의 장면 키워드가 포함되면 장면 헤딩으로 본다.
 */
const SCENE_HEADING_KO_NUM = /^\s*(?:S\s*#?\s*\d+|씬\s*\d+|장면\s*\d+|#\d+)[.\s)]/i;
const SCENE_HEADING_KO_KEYWORD = /(실내|실외|내부|외부|낮|밤|아침|저녁|새벽|오전|오후|해질녘|황혼)/;

/** 트랜지션 판별용 정규식(예: "CUT TO:", "FADE OUT.", "DISSOLVE TO:"). */
const TRANSITION_PATTERN = /(TO:|FADE (IN|OUT)\.?|FADE TO BLACK\.?|CUT TO BLACK\.?)\s*$/;

/**
 * 한글 전환어 판별용 정규식.
 * 한국어 각본에서 흔히 쓰는 전환 표기(컷, 디졸브, 페이드인/아웃, 페이드투블랙, 와이프, 인서트 컷 등).
 * 줄 전체가 전환어 위주일 때만 매칭하도록 짧은 줄에 한해 사용한다.
 */
const TRANSITION_KO_PATTERN =
  /(컷\s*투|컷\s*아웃|^컷$|^컷\b|디졸브|페이드\s*인|페이드\s*아웃|페이드\s*투\s*블랙|암전|와이프|점프\s*컷|매치\s*컷|크로스\s*디졸브|오버랩)/;

/**
 * 한 줄 텍스트가 한글 장면 헤딩인지 판단한다.
 * 씬 번호 접두가 있거나, 짧은 줄에 장면 키워드(실내/실외/낮/밤 등)가 포함되면 장면 헤딩으로 본다.
 * (긴 본문 문장에 우연히 '밤'/'낮' 같은 단어가 들어가도 장면 헤딩으로 오인하지 않도록 길이를 제한.)
 */
function looksLikeKoSceneHeading(trimmed: string): boolean {
  if (SCENE_HEADING_KO_NUM.test(trimmed)) {
    return true;
  }
  // 짧은 줄(헤딩 길이)에서 장면 키워드가 보이면 헤딩으로 본다.
  // 단, 종결형 문장(다./요./마침표·물음표·느낌표로 끝남)은 본문 산문으로 보고 제외해 오탐을 줄인다.
  // (장면 헤딩은 보통 "실내. 거실 - 낮"처럼 명사구이며 종결어미로 끝나지 않는다.)
  const looksLikeProse = /(다|요|죠|네|까)[.!?]?$/.test(trimmed) || /[.!?。]$/.test(trimmed);
  if (trimmed.length <= 40 && SCENE_HEADING_KO_KEYWORD.test(trimmed) && !looksLikeProse) {
    return true;
  }
  return false;
}

/**
 * 한 줄 텍스트가 한글 전환어인지 판단한다.
 * 전환 표기는 보통 짧으므로(예: "컷", "페이드아웃", "디졸브 투") 길이를 제한해 오탐을 줄인다.
 */
function looksLikeKoTransition(trimmed: string): boolean {
  return trimmed.length <= 20 && TRANSITION_KO_PATTERN.test(trimmed);
}

/**
 * 한 줄 텍스트로부터 FDX 문단 type 을 휴리스틱으로 추정한다.
 * - 비어 있으면 'Action'
 * - 괄호로 둘러싸이면 'Parenthetical'
 * - INT./EXT. 등으로 시작하면 'Scene Heading'
 * - 'CUT TO:' 등 트랜지션 패턴이면 'Transition'
 * - 그 외 전부 대문자이고 짧으면(이름 추정) 'Character'
 * - 기본값 'Action'
 */
function guessParagraphType(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 'Action';
  }
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return 'Parenthetical';
  }
  // 한글 괄호 지문(예: "（화내며）")도 Parenthetical 로 본다.
  if (trimmed.startsWith('（') && trimmed.endsWith('）')) {
    return 'Parenthetical';
  }
  if (SCENE_HEADING_PREFIX.test(trimmed)) {
    return 'Scene Heading';
  }
  // 한글 장면 헤딩(실내/실외/낮/밤 등, 또는 'S#1.' 류 씬 번호).
  if (looksLikeKoSceneHeading(trimmed)) {
    return 'Scene Heading';
  }
  if (isAllCaps(trimmed) && TRANSITION_PATTERN.test(trimmed)) {
    return 'Transition';
  }
  // 한글 전환어(컷, 디졸브, 페이드아웃 등).
  if (looksLikeKoTransition(trimmed)) {
    return 'Transition';
  }
  // 대문자이고 단어 수가 적으면 캐릭터 이름으로 본다(예: "JOHN", "MARY SMITH (V.O.)").
  if (isAllCaps(trimmed) && trimmed.split(/\s+/).length <= 5) {
    return 'Character';
  }
  // 한글 인물 표기 휴리스틱: 짧은 줄이며 끝에 콜론이 붙는 화자 표기("영희:" / "철수 (V.O.):")는 인물로 본다.
  // (콜론을 제거한 본체가 비어있지 않고 충분히 짧을 때만.)
  const koCharMatch = /^(.+?)\s*:\s*$/.exec(trimmed);
  if (koCharMatch) {
    const namePart = koCharMatch[1].replace(/\([^)]*\)\s*$/, '').trim();
    if (namePart.length > 0 && namePart.length <= 12 && /[가-힣]/.test(namePart)) {
      return 'Character';
    }
  }
  return 'Action';
}

/**
 * 컴파일된 섹션 목록을 FDX 문단 목록으로 변환한다(휴리스틱).
 *
 * 규칙:
 * - 섹션 제목 -> 'Scene Heading' (제목이 비어 있지 않을 때).
 * - 블록 종류별 기본 매핑:
 *     hr            -> 'Transition' ('CUT TO:' 같은 구분선 대용)
 *     h1..h4        -> 'Scene Heading'
 *     blockquote    -> 'Dialogue'
 *     li-ul, li-ol  -> 'Action'
 *     p             -> 텍스트 휴리스틱(guessParagraphType)으로 추정
 * - 'Character' 로 추정된 문단 바로 다음의 'Action' 문단은 'Dialogue' 로 승격(대사로 본다).
 *
 * @param sections 컴파일된 섹션 목록
 * @returns FDX 문단 목록
 */
export function sectionsToFdxParagraphs(sections: ESection[]): FdxParagraph[] {
  const result: FdxParagraph[] = [];

  // 직전 문단이 Character 였는지 추적(다음 문단을 Dialogue 로 승격하기 위함).
  let prevWasCharacter = false;

  for (const section of sections) {
    // 이 섹션이 실제로 만들어내는 첫 문단을 기억해, pageBreakBefore 를 그 문단에 적용한다.
    const sectionStart = result.length;

    // 섹션 제목 -> Scene Heading.
    const title = section.title.trim();
    if (title.length > 0) {
      result.push({ type: 'Scene Heading', text: title });
      prevWasCharacter = false;
    }

    for (const block of section.blocks) {
      // 가로줄(hr)은 텍스트가 없으므로 트랜지션으로 처리.
      if (block.type === 'hr') {
        result.push({ type: 'Transition', text: 'CUT TO:' });
        prevWasCharacter = false;
        continue;
      }

      const text = blockPlainText(block);

      // 빈 문단은 건너뛴다(FDX 에서 의미 없는 빈 줄 방지).
      if (text.trim().length === 0) {
        prevWasCharacter = false;
        continue;
      }

      let type: string;
      // 정렬 기반 매핑(우선): 우정렬은 Transition 으로 본다(각본 전환은 관습적으로 우정렬).
      // 헤딩 블록(h1~h4)은 장면 헤딩 의미가 우선이므로 정렬보다 종류를 따른다.
      const isHeadingBlock =
        block.type === 'h1' ||
        block.type === 'h2' ||
        block.type === 'h3' ||
        block.type === 'h4';
      if (block.align === 'right' && !isHeadingBlock) {
        type = 'Transition';
      } else {
        switch (block.type) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
            type = 'Scene Heading';
            break;
          case 'blockquote':
            type = 'Dialogue';
            break;
          case 'li-ul':
          case 'li-ol':
            type = 'Action';
            break;
          case 'p':
          default:
            // 일반 문단은 텍스트 휴리스틱으로 추정.
            type = guessParagraphType(text);
            break;
        }
      }

      // 직전이 Character 였고 이번이 Action 으로 추정되면 Dialogue 로 승격.
      if (prevWasCharacter && type === 'Action') {
        type = 'Dialogue';
      }

      result.push({ type, text });

      // 다음 루프를 위한 상태 갱신.
      prevWasCharacter = type === 'Character';
    }

    // 강제 페이지 나눔: 이 섹션이 만들어낸 첫 문단에 StartsNewPage 를 적용한다.
    // (제목/블록이 모두 비어 문단이 하나도 없으면 적용 대상이 없으므로 자연히 생략.)
    if (section.pageBreakBefore && result.length > sectionStart) {
      result[sectionStart] = { ...result[sectionStart], startsNewPage: true };
    }
  }

  return result;
}
