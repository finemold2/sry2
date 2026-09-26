// 각본(스크린플레이) 요소 정의 — 브라우저 전용.
// RTF 캐논(.rtf)에 보존되도록 요소 타입을 "정렬 + 좌측 들여쓰기 + 대문자" 로 인코딩한다.
// (클래스/데이터는 라운드트립되지 않으므로 실제 문단 서식으로 표현)

export type ScriptElement = 'scene' | 'action' | 'character' | 'dialogue' | 'paren' | 'transition'

export interface ElementDef {
  key: ScriptElement
  label: string
  /** 좌측 들여쓰기(pt). RTF \li 로 저장됨. */
  leftIndent: number
  rightIndent: number
  align: 'left' | 'right'
  upper: boolean
}

// 미국 표준 각본 서식을 pt 로 근사(1 inch = 72pt). 좌측 여백 기준 상대값.
export const ELEMENTS: Record<ScriptElement, ElementDef> = {
  scene: { key: 'scene', label: '장면 표제', leftIndent: 0, rightIndent: 0, align: 'left', upper: true },
  action: { key: 'action', label: '지문(액션)', leftIndent: 0, rightIndent: 0, align: 'left', upper: false },
  character: { key: 'character', label: '인물', leftIndent: 144, rightIndent: 0, align: 'left', upper: true },
  paren: { key: 'paren', label: '괄호(지시)', leftIndent: 108, rightIndent: 144, align: 'left', upper: false },
  dialogue: { key: 'dialogue', label: '대사', leftIndent: 72, rightIndent: 108, align: 'left', upper: false },
  transition: { key: 'transition', label: '전환', leftIndent: 0, rightIndent: 0, align: 'right', upper: true },
}

/** Tab 순환 순서. */
export const CYCLE: ScriptElement[] = ['scene', 'action', 'character', 'dialogue', 'paren', 'transition']

/** Enter 시 다음 요소(논리적 흐름). */
export const ADVANCE: Record<ScriptElement, ScriptElement> = {
  scene: 'action',
  action: 'action',
  character: 'dialogue',
  dialogue: 'action',
  paren: 'dialogue',
  transition: 'scene',
}

export function nextInCycle(cur: ScriptElement, dir: 1 | -1 = 1): ScriptElement {
  const i = CYCLE.indexOf(cur)
  const n = (i + dir + CYCLE.length) % CYCLE.length
  return CYCLE[n]
}

/** FDX/Fountain 의 요소 이름을 우리 타입으로 매핑. */
export function fromFdxType(type: string): ScriptElement {
  switch (type) {
    case 'Scene Heading':
      return 'scene'
    case 'Character':
      return 'character'
    case 'Dialogue':
      return 'dialogue'
    case 'Parenthetical':
      return 'paren'
    case 'Transition':
      return 'transition'
    default:
      return 'action'
  }
}

/** 한 문단 요소의 인라인 CSS(에디터 표시 + RTF 라운드트립). */
export function elementStyleCss(el: ScriptElement): string {
  const d = ELEMENTS[el]
  const parts: string[] = []
  if (d.leftIndent) parts.push(`margin-left:${d.leftIndent}pt`)
  if (d.rightIndent) parts.push(`margin-right:${d.rightIndent}pt`)
  if (d.align !== 'left') parts.push(`text-align:${d.align}`)
  return parts.join(';')
}

/** 블록 엘리먼트에 요소 서식을 적용(데이터 속성 + 인라인 스타일 + 대문자화). */
export function applyElement(block: HTMLElement, el: ScriptElement) {
  const d = ELEMENTS[el]
  block.setAttribute('data-se', el)
  block.style.marginLeft = d.leftIndent ? d.leftIndent + 'pt' : ''
  block.style.marginRight = d.rightIndent ? d.rightIndent + 'pt' : ''
  block.style.textAlign = d.align !== 'left' ? d.align : ''
  if (d.upper) {
    // 텍스트 노드만 대문자화(영문). 각주/코멘트/이미지 마커·링크 등 자식 엘리먼트는 보존.
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      // contenteditable=false 마커 내부 텍스트는 건드리지 않음
      const parentEl = n.parentElement
      if (parentEl && parentEl.closest('[contenteditable="false"]')) continue
      const v = n.nodeValue || ''
      const up = v.toUpperCase()
      if (v !== up) n.nodeValue = up
    }
  }
}

/** 블록의 현재 요소 타입을 추론(데이터 속성 우선, 없으면 서식 휴리스틱). */
export function detectElement(block: HTMLElement): ScriptElement {
  const attr = block.getAttribute('data-se') as ScriptElement | null
  if (attr && ELEMENTS[attr]) return attr
  const align = block.style.textAlign
  const li = parseFloat(block.style.marginLeft) || 0
  const text = (block.textContent || '').trim()
  if (align === 'right') return 'transition'
  if (li >= 140) return 'character'
  if (li >= 96) return 'paren'
  if (li >= 40) return 'dialogue'
  // 들여쓰기 없음: '실제 라틴 대문자' 표기일 때만 장면 표제로 추정한다.
  // (한국어 등 대소문자 구분이 없는 문자는 text===toUpperCase() 가 항상 참이 되어
  //  지문/액션이 장면 표제로 오분류되던 문제를 방지 — 라틴 대문자 존재 + 소문자 없음 기준)
  if (text && /[A-Z]/.test(text) && !/[a-z]/.test(text) && text.length < 60) return 'scene'
  return 'action'
}

/**
 * Fountain 본문에서 비-본문 마크업(보네야드/노트)을 제거한다.
 * - Boneyard `/* ... *​/` (여러 줄 가능): 통째로 삭제.
 * - Note `[[ ... ]]` (여러 줄 가능): 통째로 삭제(코멘트 마커는 RTF 라운드트립을 보장하기
 *   어렵고 본문 오염을 막는 것이 우선이므로 안전하게 제거).
 * 줄바꿈 구조(빈 줄 = 문단 구분)는 보존한다.
 */
function stripFountainBlockMarkup(src: string): string {
  let s = src
  // Boneyard: /* ... */ (개행 포함). 비탐욕 매칭으로 가장 가까운 종료를 찾는다.
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  // Note: [[ ... ]] (개행 포함).
  s = s.replace(/\[\[[\s\S]*?\]\]/g, '')
  return s
}

/** Fountain 씬 본문(여러 줄)을 각본 요소 문단 배열로 분류(가져오기용). */
export function fountainBodyToParagraphs(text: string): { type: string; text: string }[] {
  const cleaned = stripFountainBlockMarkup(text.replace(/\r\n?/g, '\n'))
  const lines = cleaned.split('\n')
  const out: { type: string; text: string }[] = []
  let prevType: ScriptElement = 'action'
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    const prevBlank = i === 0 || lines[i - 1].trim() === ''
    if (line === '') {
      prevType = 'action'
      continue
    }
    // 페이지 나눔(=== 이상): 본문 요소가 아니므로 건너뛴다(문단 경계는 유지).
    if (/^={3,}$/.test(line)) {
      prevType = 'action'
      continue
    }
    // 섹션(#, ##, ...): 구조용 헤더 — 본문에서 제거.
    if (/^#{1,6}\s/.test(line) || /^#{1,6}$/.test(line)) {
      prevType = 'action'
      continue
    }
    // 시놉시스(= ...): 메모용 — 본문에서 제거(단, === 페이지나눔과 구분됨).
    if (/^=(?!=)/.test(line)) {
      prevType = 'action'
      continue
    }
    let el: ScriptElement
    if (/^\(.*\)$/.test(line)) {
      el = 'paren'
    } else if (
      /(TO:|FADE\s+(IN|OUT)|FADE\s+TO\s+BLACK|CUT\s+TO\s+BLACK)\s*\.?\s*$/.test(line) &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line)
    ) {
      el = 'transition'
    } else if (line.startsWith('@')) {
      el = 'character'
    } else if (
      prevBlank &&
      line.length < 50 &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line.replace(/\([^)]*\)\s*$/, ''))
    ) {
      el = 'character'
    } else if (prevType === 'character' || prevType === 'paren') {
      el = 'dialogue'
    } else {
      el = 'action'
    }
    out.push({ type: scriptToFdxType(el), text: line.replace(/^@/, '') })
    prevType = el
  }
  return out
}

function scriptToFdxType(el: ScriptElement): string {
  switch (el) {
    case 'scene':
      return 'Scene Heading'
    case 'character':
      return 'Character'
    case 'dialogue':
      return 'Dialogue'
    case 'paren':
      return 'Parenthetical'
    case 'transition':
      return 'Transition'
    default:
      return 'Action'
  }
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Fountain 인라인 강조(*,**,***,_)를 RTF 라운드트립되는 인라인 서식 태그로 변환한다.
 *  - `***text***` → 굵게+기울임, `**text**` → 굵게, `*text*` → 기울임, `_text_` → 밑줄.
 *  - `\*`,`\_` 는 리터럴로 보존(이스케이프).
 * (strong/em/u 태그는 HTML→RTF 변환기에서 bold/italic/underline run 으로 매핑됨.)
 */
function fountainInlineToHtml(text: string): string {
  // 1) 이스케이프된 별표/밑줄을 임시 토큰으로 치환(강조 매칭에서 제외).
  const STAR = "\uE000"
  const US = "\uE001"
  let s = text.replace(/\\([*_])/g, (_m, ch) => (ch === '*' ? STAR : US))
  // 2) HTML 특수문자 이스케이프(태그 주입 방지). 강조 기호는 그대로 둔다.
  s = escHtml(s)
  // 3) 강조 변환(긴 마커부터). 마커 사이에 줄바꿈이 없는 동일 줄 텍스트만 대상.
  s = s.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
  s = s.replace(/_([^_\n]+?)_/g, '<u>$1</u>')
  // 4) 임시 토큰을 리터럴 문자로 복원.
  s = s.split(STAR).join("*").split(US).join("_")
  return s
}

/** FDX 문단 배열을 스크립트 모드 HTML 로 변환(가져오기용). */
export function paragraphsToScriptHtml(paras: { type: string; text: string }[]): string {
  return paras
    .map((p) => {
      const el = fromFdxType(p.type)
      const d = ELEMENTS[el]
      let html: string
      if (d.upper) {
        // 대문자 요소(장면/인물/전환)는 강조 서식보다 표기 규칙이 우선 — 단순 이스케이프.
        html = escHtml(p.text.toUpperCase())
      } else {
        // 액션/대사/괄호: 인라인 강조를 서식으로 변환.
        html = fountainInlineToHtml(p.text)
      }
      const css = elementStyleCss(el)
      const style = css ? ` style="${css}"` : ''
      return `<p data-se="${el}"${style}>${html || '<br>'}</p>`
    })
    .join('')
}
