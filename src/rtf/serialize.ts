// 구조화 문서 모델 -> RTF 문자열.
// 한글/유니코드는 \uN? (UTF-16 코드유닛, 16비트 부호) 로 인코딩한다.
import { DEFAULT_FONT } from './model.ts'
import type { Block, BlockType, RtfDoc, Run, RunStyle } from './model.ts'

// 헤딩/인용 스타일 정의(stylesheet 및 직접 서식 양쪽에 사용)
interface StyleDef {
  s: number
  name: string
  // 직접 char/par 서식(스타일을 무시하는 리더에서도 보이도록 함께 출력)
  bold?: boolean
  italic?: boolean
  fsHalf?: number // half-points
  li?: number // twips
}

const STYLES: Record<BlockType, StyleDef> = {
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

const PT = 20 // 1pt = 20 twips

function escapeText(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c === 92) out += '\\\\' // backslash
    else if (c === 123) out += '\\{'
    else if (c === 125) out += '\\}'
    else if (c === 9) out += '\\tab '
    else if (c === 10 || c === 13) out += '\\line '
    else if (c >= 0x20 && c <= 0x7e) out += text[i]
    else if (c < 0x20) {
      /* 기타 제어문자는 버린다 */
    } else {
      // 0x7f 이상: 유니코드 이스케이프. 16비트 부호값으로 변환.
      const signed = c >= 0x8000 ? c - 0x10000 : c
      out += '\\u' + signed + '?'
    }
  }
  return out
}

class TableBuilder {
  fonts: string[] = [DEFAULT_FONT]
  colors: (string | null)[] = [null] // index 0 = auto

  fontIndex(family?: string): number {
    if (!family) return 0
    const norm = family.trim()
    if (!norm || norm.toLowerCase() === DEFAULT_FONT.toLowerCase()) return 0
    let idx = this.fonts.findIndex((f) => f.toLowerCase() === norm.toLowerCase())
    if (idx < 0) {
      this.fonts.push(norm)
      idx = this.fonts.length - 1
    }
    return idx
  }

  colorIndex(hex?: string): number {
    if (!hex) return 0
    const norm = hex.toLowerCase()
    let idx = this.colors.findIndex((c) => c && c.toLowerCase() === norm)
    if (idx < 0) {
      this.colors.push(norm)
      idx = this.colors.length - 1
    }
    return idx
  }
}

function isKoreanFont(name: string): boolean {
  return /malgun|gulim|batang|dotum|gungsuh|nanum|noto sans kr|noto serif kr|gothic|myeongjo/i.test(
    name,
  )
}

function fontTable(b: TableBuilder): string {
  const entries = b.fonts
    .map((name, i) => {
      const charset = isKoreanFont(name) ? 129 : 0
      const family = isKoreanFont(name) ? 'fnil' : 'fswiss'
      return `{\\f${i}\\${family}\\fcharset${charset} ${name};}`
    })
    .join('')
  return `{\\fonttbl${entries}}`
}

function colorTable(b: TableBuilder): string {
  const entries = b.colors
    .map((hex) => {
      if (!hex) return ';'
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const bl = parseInt(hex.slice(5, 7), 16)
      return `\\red${r}\\green${g}\\blue${bl};`
    })
    .join('')
  return `{\\colortbl${entries}}`
}

function styleSheet(): string {
  const defs = (Object.keys(STYLES) as BlockType[])
    .map((k) => STYLES[k])
    // 중복 s 번호 제거(li-* 는 s0 공유)
    .filter((d, i, arr) => arr.findIndex((x) => x.s === d.s) === i)
    .map((d) => {
      let cw = `\\s${d.s}`
      if (d.bold) cw += '\\b'
      if (d.italic) cw += '\\i'
      if (d.fsHalf) cw += '\\fs' + d.fsHalf
      return `{${cw}\\sbasedon0\\snext0 ${d.name};}`
    })
    .join('')
  return `{\\stylesheet{\\s0\\snext0 Normal;}${defs}}`
}

function base64ToHex(b64: string): string {
  // atob: 브라우저 및 Node 16+ 전역
  const bin = atob(b64)
  let out = ''
  for (let i = 0; i < bin.length; i++) {
    out += bin.charCodeAt(i).toString(16).padStart(2, '0')
  }
  return out
}

/** data URL 이미지를 RTF \pict 그룹으로 직렬화. */
function pictRtf(dataUrl: string, w?: number, h?: number): string {
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]*)$/i)
  if (!m) return ''
  const mime = m[1].toLowerCase()
  let hex: string
  try {
    hex = base64ToHex(m[2].replace(/\s+/g, ''))
  } catch {
    return ''
  }
  const blip = mime.includes('jpeg') || mime.includes('jpg') ? '\\jpegblip' : '\\pngblip'
  // 표시 크기(twips: 1px≈15twips@96dpi). 없으면 생략.
  let dims = ''
  if (w && h) {
    dims = `\\picwgoal${Math.round(w * 15)}\\pichgoal${Math.round(h * 15)}`
  }
  // 가독성을 위해 hex 를 적당히 줄바꿈
  const wrapped = hex.replace(/(.{120})/g, '$1\n')
  return `{\\pict${blip}${dims}\n${wrapped}}`
}

function serializeRun(run: Run, tb: TableBuilder): string {
  const st: RunStyle = run.style || {}

  // 인라인 이미지: {\pict ...}
  if (st.image != null) {
    return pictRtf(st.image, st.imageW, st.imageH)
  }

  // 각주/미주 마커: {\super\chftn}{\footnote ...}
  if (st.footnote != null) {
    const body = escapeText(st.footnote)
    const alt = st.endnote ? '\\ftnalt' : ''
    return `{\\super\\chftn}{\\footnote${alt} ${body}}`
  }
  // 코멘트(주석) 마커: Word 호환 주석
  if (st.comment != null) {
    const id = (st.commentId || 'c').replace(/[^A-Za-z0-9]/g, '').slice(0, 16) || 'c'
    return `{\\*\\atnid ${id}}\\chatn{\\*\\annotation ${escapeText(st.comment)}}`
  }

  const cw: string[] = []
  if (st.bold) cw.push('\\b')
  if (st.italic) cw.push('\\i')
  if (st.underline) cw.push('\\ul')
  if (st.strike) cw.push('\\strike')
  if (st.superscript) cw.push('\\super')
  if (st.subscript) cw.push('\\sub')
  const fi = tb.fontIndex(st.fontFamily)
  if (fi > 0) cw.push('\\f' + fi)
  if (st.fontSize) cw.push('\\fs' + Math.round(st.fontSize * 2))
  const ci = tb.colorIndex(st.color)
  if (ci > 0) cw.push('\\cf' + ci)
  const hi = tb.colorIndex(st.highlight)
  if (hi > 0) cw.push('\\highlight' + hi)

  const text = escapeText(run.text)

  if (st.link) {
    const inner = cw.length ? `{${cw.join('')} ${text}}` : text
    // 밑줄은 원본 run 의 실제 underline 스타일에 따라서만 적용(평범한 링크가 왕복 시 밑줄을 얻지 않도록).
    const ul = st.underline ? '\\ul ' : '\\ulnone '
    return `{\\field{\\*\\fldinst{HYPERLINK "${escapeText(st.link)}"}}{\\fldrslt{${ul}${inner}}}}`
  }

  if (cw.length === 0) return text
  return `{${cw.join('')} ${text}}`
}

function listMarker(type: BlockType, counter: number): string {
  if (type === 'li-ul') return '\\u8226 ?\\tab '
  if (type === 'li-ol') return `${counter}.\\tab `
  return ''
}

function serializeBlock(block: Block, tb: TableBuilder, olCounter: number): string {
  // 구분선(scene break): 아래쪽 테두리만 있는 빈 문단
  if (block.type === 'hr') {
    return '\\pard\\plain\\qc\\brdrb\\brdrs\\brdrw15\\brsp40 \\par\n'
  }
  const def = STYLES[block.type]
  let s = '\\pard\\plain'
  if (block.pageBreak) s += '\\page'
  if (def.s > 0) s += '\\s' + def.s
  // 정렬
  const align = block.align || 'left'
  s +=
    align === 'center'
      ? '\\qc'
      : align === 'right'
        ? '\\qr'
        : align === 'justify'
          ? '\\qj'
          : '\\ql'
  // 들여쓰기: 명시 값 우선, 없으면 리스트/인용 기본
  if (block.type === 'li-ul' || block.type === 'li-ol') {
    const level = (block.listLevel || 0) + 1
    s += `\\li${720 * level}\\fi-360`
  } else {
    const li = block.leftIndent != null ? Math.round(block.leftIndent * PT) : def.li
    if (li) s += `\\li${li}`
    if (block.rightIndent) s += `\\ri${Math.round(block.rightIndent * PT)}`
    if (block.firstIndent) s += `\\fi${Math.round(block.firstIndent * PT)}`
  }
  // 문단 간격 / 줄 간격
  if (block.spaceBefore) s += `\\sb${Math.round(block.spaceBefore * PT)}`
  if (block.spaceAfter) s += `\\sa${Math.round(block.spaceAfter * PT)}`
  if (block.lineSpacing && block.lineSpacing !== 1) {
    s += `\\sl${Math.round(block.lineSpacing * 240)}\\slmult1`
  }
  // 헤딩/인용 직접 서식(리더 호환)
  let styleCw = ''
  if (def.bold) styleCw += '\\b'
  if (def.italic) styleCw += '\\i'
  if (def.fsHalf) styleCw += '\\fs' + def.fsHalf
  s += styleCw
  s += ' '

  // 리스트 마커
  s += listMarker(block.type, olCounter)

  // 런
  for (const run of block.runs) s += serializeRun(run, tb)
  s += '\\par\n'
  return s
}

export function serializeRtf(doc: RtfDoc): string {
  const tb = new TableBuilder()
  let body = ''
  let olCounter = 0
  let prevType: BlockType | null = null
  for (const block of doc.blocks) {
    if (block.type === 'li-ol') {
      olCounter = prevType === 'li-ol' ? olCounter + 1 : 1
    } else {
      olCounter = 0
    }
    body += serializeBlock(block, tb, olCounter || 1)
    prevType = block.type
  }

  const header =
    '{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0' +
    fontTable(tb) +
    colorTable(tb) +
    styleSheet() +
    '\n\\f0\\fs24\n'
  return header + body + '}'
}
