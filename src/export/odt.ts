// ODT(OpenDocument Text) 내보내기 — jszip 으로 직접 생성(한글 UTF-8).
import JSZip from 'jszip'
import type { CompiledSection, EBlock, ERun } from '../compile/compile'

interface Meta {
  title: string
  author?: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 자동 스타일 수집(런 서식별로 T1, T2 …)
class Styles {
  private map = new Map<string, string>()
  private defs: string[] = []
  key(run: ERun): string {
    const props: string[] = []
    if (run.bold) props.push('fo:font-weight="bold"')
    if (run.italic) props.push('fo:font-style="italic"')
    if (run.underline) props.push('style:text-underline-style="solid" style:text-underline-width="auto"')
    if (run.strike) props.push('style:text-line-through-style="solid"')
    if (run.color) props.push(`fo:color="${run.color}"`)
    if (run.highlight) props.push(`fo:background-color="${run.highlight}"`)
    if (run.superscript) props.push('style:text-position="super 58%"')
    if (run.subscript) props.push('style:text-position="sub 58%"')
    if (run.fontSize) props.push(`fo:font-size="${run.fontSize}pt"`)
    if (!props.length) return ''
    const sig = props.join(' ')
    let name = this.map.get(sig)
    if (!name) {
      name = 'T' + (this.map.size + 1)
      this.map.set(sig, name)
      this.defs.push(
        `<style:style style:name="${name}" style:family="text"><style:text-properties ${sig}/></style:style>`,
      )
    }
    return name
  }
  // 페이지나눔(fo:break-before="page")을 더한 단락 스타일을 생성/반환한다.
  // base 는 기존 단락 스타일명('' = 기본, Center/Right/Justify/Quote* 중 하나).
  // 반환: 새 자동 스타일명(예: PB_Center). 같은 base 는 한 번만 정의한다.
  private breaks = new Map<string, string>()
  paraWithBreak(base: string): string {
    const key = base || '_'
    let name = this.breaks.get(key)
    if (name) return name
    name = 'PageBreak' + (base ? '_' + base : '')
    this.breaks.set(key, name)
    const props = BASE_PARA_PROPS[base] || ''
    const textProps = BASE_TEXT_PROPS[base] || ''
    this.defs.push(
      `<style:style style:name="${name}" style:family="paragraph">` +
        `<style:paragraph-properties fo:break-before="page"${props}/>` +
        textProps +
        `</style:style>`,
    )
    return name
  }
  xml(): string {
    return this.defs.join('')
  }
}

// 기존 정렬/인용 단락 스타일의 속성(paraWithBreak 가 break-before 와 병합할 때 사용).
const BASE_PARA_PROPS: Record<string, string> = {
  '': '',
  Center: ' fo:text-align="center"',
  Right: ' fo:text-align="end"',
  Justify: ' fo:text-align="justify"',
  Quote: ' fo:margin-left="1cm"',
  QuoteCenter: ' fo:margin-left="1cm" fo:text-align="center"',
  QuoteRight: ' fo:margin-left="1cm" fo:text-align="end"',
  QuoteJustify: ' fo:margin-left="1cm" fo:text-align="justify"',
}
const BASE_TEXT_PROPS: Record<string, string> = {
  Quote: '<style:text-properties fo:font-style="italic"/>',
  QuoteCenter: '<style:text-properties fo:font-style="italic"/>',
  QuoteRight: '<style:text-properties fo:font-style="italic"/>',
  QuoteJustify: '<style:text-properties fo:font-style="italic"/>',
}

// align → 정렬 단락 스타일명(없으면 '').
function alignStyleName(align?: EBlock['align']): string {
  return align === 'center' ? 'Center' : align === 'right' ? 'Right' : align === 'justify' ? 'Justify' : ''
}

// 다단계(1..LIST_LEVELS) 목록 스타일. 레벨이 깊어질수록 들여쓰기를 누적한다.
const LIST_LEVELS = 9
const BULLET_CHARS = ['•', '◦', '▪'] // 레벨별 순환
function bulletListStyle(name: string): string {
  let s = `<text:list-style style:name="${name}">`
  for (let lvl = 1; lvl <= LIST_LEVELS; lvl++) {
    const char = BULLET_CHARS[(lvl - 1) % BULLET_CHARS.length]
    const indent = (0.6 * lvl).toFixed(2)
    s +=
      `<text:list-level-style-bullet text:level="${lvl}" text:bullet-char="${char}">` +
      `<style:list-level-properties text:space-before="${indent}cm" text:min-label-width="0.6cm"/>` +
      `</text:list-level-style-bullet>`
  }
  return s + '</text:list-style>'
}
function numberListStyle(name: string): string {
  let s = `<text:list-style style:name="${name}">`
  for (let lvl = 1; lvl <= LIST_LEVELS; lvl++) {
    const indent = (0.6 * lvl).toFixed(2)
    s +=
      `<text:list-level-style-number text:level="${lvl}" style:num-format="1" text:num-suffix=".">` +
      `<style:list-level-properties text:space-before="${indent}cm" text:min-label-width="0.6cm"/>` +
      `</text:list-level-style-number>`
  }
  return s + '</text:list-style>'
}

// 이미지(data URL) 수집기 — base64 를 디코드해 Pictures/ 에 첨부하고 manifest 에 등록한다.
// 본문에는 <draw:frame><draw:image xlink:href="Pictures/imgN.ext"/></draw:frame> 로 참조한다.
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i
const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
}
interface Picture {
  path: string // 예: Pictures/img1.png
  media: string // 예: image/png
  data: Uint8Array
}
class Pictures {
  list: Picture[] = []
  // 성공 시 본문 참조 XML, 실패 시 null(호출부가 텍스트로 대체).
  add(run: ERun): string | null {
    const m = run.image ? DATA_URL_RE.exec(run.image) : null
    if (!m) return null
    const media = m[1].toLowerCase()
    let data: Uint8Array
    try {
      data = base64ToBytes(m[2])
    } catch {
      return null
    }
    const ext = MIME_EXT[media] || media.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin'
    const path = `Pictures/img${this.list.length + 1}.${ext}`
    this.list.push({ path, media, data })
    // 크기(있으면 cm 로). 없으면 draw:frame 의 svg:width/height 를 생략(뷰어가 본래 크기 사용).
    const dim: string[] = []
    if (run.imageW && run.imageW > 0) dim.push(`svg:width="${pxToCm(run.imageW)}"`)
    if (run.imageH && run.imageH > 0) dim.push(`svg:height="${pxToCm(run.imageH)}"`)
    const dimAttr = dim.length ? ' ' + dim.join(' ') : ''
    return (
      `<draw:frame text:anchor-type="as-char"${dimAttr}>` +
      `<draw:image xlink:href="${esc(path)}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
      `</draw:frame>`
    )
  }
}

// CSS px(96dpi) 를 ODT 길이(cm) 로. 소수 4자리.
function pxToCm(px: number): string {
  return (px / 96 * 2.54).toFixed(4) + 'cm'
}

// 브라우저 atob 기반 base64 -> 바이트. (export 레이어는 브라우저 전용)
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '')
  const bin = atob(clean)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function runXml(run: ERun, styles: Styles, pics: Pictures): string {
  // 이미지 런: Pictures/ 첨부 + draw:frame 참조. 디코드 실패 시 '[이미지]' 텍스트로 대체(소실 방지).
  if (run.image) {
    const frame = pics.add(run)
    if (frame) return frame
    return '<text:span>[이미지]</text:span>'
  }
  let t = esc(run.text).replace(/\t/g, '<text:tab/>').replace(/\n/g, '<text:line-break/>')
  if (run.link) t = `<text:a xlink:type="simple" xlink:href="${esc(run.link)}">${t}</text:a>`
  const name = styles.key(run)
  return name ? `<text:span text:style-name="${name}">${t}</text:span>` : t
}

const hLevel = (t: string) => (t === 'h1' ? 1 : t === 'h2' ? 2 : t === 'h3' ? 3 : 4)
const alignStyle = (align?: EBlock['align']) =>
  align && align !== 'left'
    ? ` text:style-name="${align === 'center' ? 'Center' : align === 'right' ? 'Right' : 'Justify'}"`
    : ''

// 연속 list 항목(li-ul/li-ol)을 listLevel 에 따라 중첩 <text:list> 로 렌더링한다.
// epub.ts 의 renderListAt 패턴과 동일: 더 깊은 항목은 직전 <text:list-item> 안에 중첩 목록으로 넣는다.
function renderListAt(
  items: EBlock[],
  start: number,
  end: number,
  level: number,
  styles: Styles,
  pics: Pictures,
): { xml: string; next: number } {
  const styleName = items[start].type === 'li-ul' ? 'LBullet' : 'LNumber'
  let xml = `<text:list text:style-name="${styleName}">`
  let i = start
  while (i < end) {
    const lvl = items[i].listLevel ?? 0
    if (lvl < level) break // 더 얕은 항목 → 상위 목록으로 복귀
    if (lvl > level) {
      // 더 깊은 항목 → 직전 <text:list-item> 안에 중첩 목록을 끼워 넣는다.
      const sub = renderListAt(items, i, end, lvl, styles, pics)
      if (xml.endsWith('</text:list-item>')) {
        xml = xml.slice(0, -'</text:list-item>'.length) + sub.xml + '</text:list-item>'
      } else {
        xml += `<text:list-item>${sub.xml}</text:list-item>`
      }
      i = sub.next
      continue
    }
    const li = items[i]
    const liAlign = alignStyle(li.align)
    xml += `<text:list-item><text:p${liAlign}>${li.runs.map((r) => runXml(r, styles, pics)).join('')}</text:p></text:list-item>`
    i++
  }
  xml += `</text:list>`
  return { xml, next: i }
}

function blocksXml(blocks: EBlock[], styles: Styles, pics: Pictures, breakFirst?: boolean): string {
  let out = ''
  let i = 0
  // pageBreakBefore 섹션(제목 없음): 본문 첫 블록에 fo:break-before 를 더한 파생 스타일을 적용한다.
  let pendingBreak = !!breakFirst
  // 첫 블록이 break 를 소비했는지 한 번만 true 를 돌려준다.
  const consumeFirst = (): boolean => {
    const b = pendingBreak
    pendingBreak = false
    return b
  }
  while (i < blocks.length) {
    const b = blocks[i]
    const inner = b.runs.map((r) => runXml(r, styles, pics)).join('')
    if (b.type === 'hr') {
      const fs = consumeFirst()
      const styleName = fs ? styles.paraWithBreak('Center') : 'Center'
      out += `<text:p text:style-name="${styleName}">* * *</text:p>`
      i++
    } else if (b.type === 'li-ul' || b.type === 'li-ol') {
      // 같은 목록 성격(li-ul/li-ol)의 연속 구간을 한 번에 중첩 렌더링.
      let end = i
      while (end < blocks.length && (blocks[end].type === 'li-ul' || blocks[end].type === 'li-ol')) end++
      // 구간 내 최소 listLevel 부터 시작.
      let minLevel = Infinity
      for (let k = i; k < end; k++) minLevel = Math.min(minLevel, blocks[k].listLevel ?? 0)
      if (!isFinite(minLevel)) minLevel = 0
      out += renderListAt(blocks, i, end, minLevel, styles, pics).xml
      consumeFirst() // 목록은 단락 스타일을 받지 않음(첫 블록이 목록이면 페이지나눔은 생략)
      i = end
    } else if (/^h[1-4]$/.test(b.type)) {
      const fs = consumeFirst()
      // 페이지나눔이 필요한 첫 헤딩: 정렬 스타일 대신(또는 함께) break-before 파생 스타일 적용.
      const styleName = fs ? styles.paraWithBreak(alignStyleName(b.align)) : alignStyleName(b.align)
      const attr = styleName ? ` text:style-name="${styleName}"` : ''
      out += `<text:h text:outline-level="${hLevel(b.type)}"${attr}>${inner}</text:h>`
      i++
    } else if (b.type === 'blockquote') {
      const qBase =
        b.align === 'center'
          ? 'QuoteCenter'
          : b.align === 'right'
            ? 'QuoteRight'
            : b.align === 'justify'
              ? 'QuoteJustify'
              : 'Quote'
      const fs = consumeFirst()
      const qName = fs ? styles.paraWithBreak(qBase) : qBase
      out += `<text:p text:style-name="${qName}">${inner}</text:p>`
      i++
    } else {
      const fs = consumeFirst()
      const styleName = fs ? styles.paraWithBreak(alignStyleName(b.align)) : alignStyleName(b.align)
      const attr = styleName ? ` text:style-name="${styleName}"` : ''
      out += `<text:p${attr}>${inner}</text:p>`
      i++
    }
  }
  return out
}

export async function sectionsToOdt(sections: CompiledSection[], meta: Meta): Promise<Blob> {
  const styles = new Styles()
  const pics = new Pictures()
  let body = ''
  for (const sec of sections) {
    // 페이지나눔: 섹션의 첫 출력 요소(제목 헤딩이 있으면 헤딩, 없으면 본문 첫 블록)에 적용.
    const wantBreak = !!sec.pageBreakBefore
    if (sec.title.trim()) {
      const lvl = Math.min(4, sec.level)
      // 제목 헤딩에 break-before 파생 스타일을 적용.
      const attr = wantBreak ? ` text:style-name="${styles.paraWithBreak('')}"` : ''
      body += `<text:h text:outline-level="${lvl}"${attr}>${esc(sec.title)}</text:h>`
      body += blocksXml(sec.blocks, styles, pics)
    } else {
      // 제목이 없으면 본문 첫 블록이 자신의 정렬과 결합한 break 스타일을 만들도록 위임.
      body += blocksXml(sec.blocks, styles, pics, wantBreak)
    }
  }

  const contentXml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2">' +
    '<office:automatic-styles>' +
    '<style:style style:name="Center" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/></style:style>' +
    '<style:style style:name="Right" style:family="paragraph"><style:paragraph-properties fo:text-align="end"/></style:style>' +
    '<style:style style:name="Justify" style:family="paragraph"><style:paragraph-properties fo:text-align="justify"/></style:style>' +
    '<style:style style:name="Quote" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm"/><style:text-properties fo:font-style="italic"/></style:style>' +
    '<style:style style:name="QuoteCenter" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm" fo:text-align="center"/><style:text-properties fo:font-style="italic"/></style:style>' +
    '<style:style style:name="QuoteRight" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm" fo:text-align="end"/><style:text-properties fo:font-style="italic"/></style:style>' +
    '<style:style style:name="QuoteJustify" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm" fo:text-align="justify"/><style:text-properties fo:font-style="italic"/></style:style>' +
    bulletListStyle('LBullet') +
    numberListStyle('LNumber') +
    styles.xml() +
    '</office:automatic-styles>' +
    `<office:body><office:text>${body}</office:text></office:body></office:document-content>`

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8"?><office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2"></office:document-styles>'

  const metaXml =
    '<?xml version="1.0" encoding="UTF-8"?><office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2"><office:meta>' +
    `<dc:title>${esc(meta.title)}</dc:title>` +
    (meta.author ? `<dc:creator>${esc(meta.author)}</dc:creator>` : '') +
    '</office:meta></office:document-meta>'

  const manifestXml =
    '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
    // 첨부 이미지(Pictures/) 매니페스트 등록.
    pics.list.map((p) => `<manifest:file-entry manifest:full-path="${esc(p.path)}" manifest:media-type="${esc(p.media)}"/>`).join('') +
    '</manifest:manifest>'

  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file('content.xml', contentXml)
  zip.file('styles.xml', stylesXml)
  zip.file('meta.xml', metaXml)
  zip.folder('META-INF')!.file('manifest.xml', manifestXml)
  // 디코드된 이미지 바이너리를 Pictures/ 에 첨부(이미 압축돼 있을 수 있어 기본 압축에 맡김).
  for (const p of pics.list) zip.file(p.path, p.data)
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.text' })
}
