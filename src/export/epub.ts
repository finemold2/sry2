// 공용 문서 모델(ESection[]) -> 유효한 EPUB3 .epub Blob 생성기.
// 브라우저 전용(Node/서버 API 미사용). jszip 으로 패키징한다.
// - mimetype 은 무압축(STORE)으로 ZIP 의 첫 엔트리여야 한다.
// - 메타데이터/매니페스트/스파인/내비게이션 문서(EPUB3) 를 모두 포함한다.
import JSZip from 'jszip'

// ---------- 공용 문서 모델(자체 정의, 외부 import 금지) ----------
// 앱의 RTF Block/Run 과 구조적으로 동일한 "교환용" 모델.
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
  /** 인라인 이미지 data URL(+선택 크기). compile 의 평탄 ERun 과 동일. */
  image?: string
  imageW?: number
  imageH?: number
}

export type EBlockType = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'li-ul' | 'li-ol' | 'hr'

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
  /** 이 섹션 앞에서 페이지 나눔(EPUB 리더가 새 페이지에서 시작). */
  pageBreakBefore?: boolean
}

export interface EMeta {
  title: string
  author?: string
  language?: string
}

// ---------- XML/XHTML 이스케이프 ----------
// 텍스트 노드용: &, <, > 를 엔티티로 치환한다.
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// 속성값용: 위에 더해 큰따옴표/작은따옴표까지 치환한다.
function escapeAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// 글꼴 이름에 공백이 있으면 CSS 에서 따옴표로 감싼다.
function cssFont(name: string): string {
  return /\s/.test(name) ? `'${name.replace(/'/g, '')}'` : name
}

// data URL 인지 검사(이미지 MIME 만 허용). 캡처: [1]=MIME, [2]=base64.
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i

// MIME -> 파일 확장자. odt.ts 와 동일 규칙(png/jpeg→jpg/gif/svg→svg).
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

// 브라우저 atob 기반 base64 -> 바이트(export 레이어는 브라우저 전용). odt.ts 와 동일 구현.
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '')
  const bin = atob(clean)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// 인라인 이미지(data URL) 수집기 — base64 를 디코드해 OEBPS/images/ 에 첨부하고
// content.opf manifest 에 등록한다. 본문 XHTML 은 상대경로(images/imgN.ext)로 참조한다.
// EPUB3 표준(매니페스트 등록 + 패키징) 준수: Kindle/엄격한 리더/epubcheck 에서 깨지지 않음.
interface EpubImage {
  id: string // 매니페스트 id(예: img1)
  href: string // OEBPS 기준 상대경로(예: images/img1.png)
  zipPath: string // zip 내 절대경로(예: OEBPS/images/img1.png)
  media: string // 예: image/png
  data: Uint8Array
}
class Images {
  list: EpubImage[] = []
  // 성공 시 OEBPS 기준 상대 href, 실패 시 null(호출부가 '[이미지]' 텍스트로 대체).
  add(image: string): string | null {
    const m = DATA_URL_RE.exec(image)
    if (!m) return null
    const media = m[1].toLowerCase()
    let data: Uint8Array
    try {
      data = base64ToBytes(m[2])
    } catch {
      return null
    }
    const ext = MIME_EXT[media] || media.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin'
    const n = this.list.length + 1
    const id = `img${n}`
    const href = `images/${id}.${ext}`
    this.list.push({ id, href, zipPath: `OEBPS/${href}`, media, data })
    return href
  }
}

// ---------- ERun -> 인라인 XHTML ----------
function runToXhtml(run: ERun, images: Images): string {
  // 이미지 런: data URL 을 디코드해 OEBPS/images/ 에 첨부하고 상대경로로 참조한다.
  // 디코드/파싱 실패 시 '[이미지]' 텍스트로 대체(소실 방지).
  if (run.image) {
    const href = images.add(run.image)
    if (!href) return '[이미지]'
    const styles = ['max-width:100%']
    let dims = ''
    if (run.imageW) dims += ` width="${escapeAttr(String(run.imageW))}"`
    if (run.imageH) dims += ` height="${escapeAttr(String(run.imageH))}"`
    let img = `<img src="${escapeAttr(href)}" alt=""${dims} style="${escapeAttr(
      styles.join(';'),
    )}"/>`
    if (run.link) img = `<a href="${escapeAttr(run.link)}">${img}</a>`
    return img
  }

  // 빈 텍스트도 구조상 그대로 처리(이스케이프 후 줄바꿈은 <br/> 로).
  let inner = escapeXml(run.text).replace(/\n/g, '<br/>')

  // 인라인 style 수집(색/배경/글꼴 크기/글꼴).
  const styles: string[] = []
  if (run.color) styles.push(`color:${run.color}`)
  if (run.highlight) styles.push(`background-color:${run.highlight}`)
  if (run.fontSize) styles.push(`font-size:${run.fontSize}pt`)
  if (run.fontFamily) styles.push(`font-family:${cssFont(run.fontFamily)}`)

  // 의미 태그를 안쪽부터 바깥쪽 순으로 감싼다(html.ts 의 순서와 동일).
  if (run.bold) inner = `<strong>${inner}</strong>`
  if (run.italic) inner = `<em>${inner}</em>`
  if (run.underline) inner = `<u>${inner}</u>`
  if (run.strike) inner = `<s>${inner}</s>`
  if (run.superscript) inner = `<sup>${inner}</sup>`
  if (run.subscript) inner = `<sub>${inner}</sub>`
  if (styles.length) inner = `<span style="${escapeAttr(styles.join(';'))}">${inner}</span>`
  if (run.link) inner = `<a href="${escapeAttr(run.link)}">${inner}</a>`
  return inner
}

// 블록 내부(런 묶음) -> XHTML. 런이 없으면 빈 줄을 위해 줄바꿈을 넣는다.
function blockInner(b: EBlock, images: Images): string {
  if (!b.runs.length) return '<br/>'
  const html = b.runs.map((r) => runToXhtml(r, images)).join('')
  return html === '' ? '<br/>' : html
}

// align 을 인라인 style 속성으로 변환(left 는 기본값이라 생략).
function alignAttr(align?: EBlock['align']): string {
  return align && align !== 'left' ? ` style="text-align:${align}"` : ''
}

// ---------- EBlock[] -> 본문 XHTML ----------
// 연속된 li-ul / li-ol 은 listLevel 을 반영해 중첩 ul/ol 로 묶는다.
function blocksToXhtml(blocks: EBlock[], images: Images): string {
  let html = ''
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]

    // 목록: 같은 타입(li-ul / li-ol)의 연속 구간을 한 번에 처리.
    if (b.type === 'li-ul' || b.type === 'li-ol') {
      const end = (() => {
        let j = i
        while (j < blocks.length && (blocks[j].type === 'li-ul' || blocks[j].type === 'li-ol')) j++
        return j
      })()
      html += renderList(blocks.slice(i, end), images)
      i = end
      continue
    }

    if (b.type === 'hr') {
      html += '<hr/>'
      i++
      continue
    }

    const a = alignAttr(b.align)
    if (b.type === 'blockquote') {
      html += `<blockquote${a}>${blockInner(b, images)}</blockquote>`
    } else if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4') {
      html += `<${b.type}${a}>${blockInner(b, images)}</${b.type}>`
    } else {
      html += `<p${a}>${blockInner(b, images)}</p>`
    }
    i++
  }
  return html
}

// 목록 항목들(listLevel 보유)을 중첩 구조로 렌더링한다.
// 재귀로 startLevel 이상 깊이의 연속 구간을 ul/ol 로 감싼다.
function renderList(items: EBlock[], images: Images): string {
  // 최상위 레벨(가장 얕은 listLevel)부터 시작.
  let minLevel = Infinity
  for (const it of items) minLevel = Math.min(minLevel, it.listLevel ?? 0)
  if (!isFinite(minLevel)) minLevel = 0
  return renderListAt(items, 0, items.length, minLevel, images).html
}

// items[start..end) 구간에서 level 깊이의 목록 하나를 만든다.
// 반환: 생성된 HTML 과 다음에 처리할 인덱스.
function renderListAt(
  items: EBlock[],
  start: number,
  end: number,
  level: number,
  images: Images,
): { html: string; next: number } {
  const tag = items[start].type === 'li-ul' ? 'ul' : 'ol'
  let html = `<${tag}>`
  let i = start
  while (i < end) {
    const lvl = items[i].listLevel ?? 0
    if (lvl < level) break // 더 얕은 항목 -> 상위 목록으로 복귀
    if (lvl > level) {
      // 더 깊은 항목 -> 직전 <li> 안에 중첩 목록을 넣는다.
      const sub = renderListAt(items, i, end, lvl, images)
      // 직전에 닫은 </li> 를 열어 중첩 목록을 끼워 넣는다.
      if (html.endsWith('</li>')) {
        html = html.slice(0, -'</li>'.length) + sub.html + '</li>'
      } else {
        html += `<li>${sub.html}</li>`
      }
      i = sub.next
      continue
    }
    // 같은 레벨 항목.
    html += `<li>${blockInner(items[i], images)}</li>`
    i++
  }
  html += `</${tag}>`
  return { html, next: i }
}

// ---------- XHTML 문서 골격 ----------
function xhtmlDocument(title: string, lang: string, bodyInner: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeAttr(
      lang,
    )}" lang="${escapeAttr(lang)}">\n` +
    `<head>\n<meta charset="UTF-8"/>\n<title>${escapeXml(title)}</title>\n</head>\n` +
    `<body>\n${bodyInner}\n</body>\n</html>\n`
  )
}

// ---------- 챕터 분할 ----------
// level<=1 섹션마다 새 챕터를 시작하고, 더 깊은(level>1) 섹션은 같은 챕터에 누적한다.
// 모든 섹션은 목차(nav) 에 자기 level 들여쓰기로 반영한다.
interface NavEntry {
  title: string
  level: number
  href: string // chapterN.xhtml 또는 chapterN.xhtml#anchor
}
interface Chapter {
  fileName: string // 예: chapter1.xhtml
  id: string // 매니페스트/스파인 id
  title: string // 챕터 대표 제목
  bodyInner: string // <body> 내부 XHTML
}

// 섹션 한 개를 XHTML 조각으로 변환(제목 + 본문). anchor 로 nav 에서 점프 가능.
function sectionFragment(section: ESection, anchor: string, images: Images): string {
  // 제목 깊이를 level 에 맞춰 h1~h4 로(범위를 벗어나면 클램프).
  const h = Math.min(4, Math.max(1, section.level + 1))
  // 페이지 나눔: 섹션의 제목(첫 요소)에 page-break-before 를 부여해 새 페이지에서 시작.
  const pb = section.pageBreakBefore ? ' style="page-break-before:always"' : ''
  const heading = `<h${h} id="${escapeAttr(anchor)}"${pb}>${escapeXml(section.title)}</h${h}>`
  return heading + '\n' + blocksToXhtml(section.blocks, images)
}

function buildChapters(
  sections: ESection[],
  lang: string,
  images: Images,
): { chapters: Chapter[]; nav: NavEntry[] } {
  const chapters: Chapter[] = []
  const nav: NavEntry[] = []
  let current: { parts: string[]; chapter: Chapter } | null = null
  let chapterCount = 0
  let anchorCount = 0

  // 현재 챕터를 확정(parts -> bodyInner)한다.
  const finalize = () => {
    if (current) current.chapter.bodyInner = current.parts.join('\n')
  }

  for (const section of sections) {
    const isNewChapter = section.level <= 1 || current === null
    if (isNewChapter) {
      finalize()
      chapterCount++
      const fileName = `chapter${chapterCount}.xhtml`
      const chapter: Chapter = {
        fileName,
        id: `chapter${chapterCount}`,
        title: section.title,
        bodyInner: '',
      }
      chapters.push(chapter)
      current = { parts: [], chapter }
      const anchor = `sec${++anchorCount}`
      current.parts.push(sectionFragment(section, anchor, images))
      // 챕터 시작 섹션은 파일 자체로 링크(앵커 불필요).
      nav.push({ title: section.title, level: section.level, href: fileName })
    } else {
      // 하위 섹션: 현재 챕터에 누적 + 목차에는 anchor 링크로 들여쓰기 반영.
      // isNewChapter 가 false 이면 current 는 반드시 존재하지만, 타입 좁히기를 위해 단언한다.
      const cur = current!
      const anchor = `sec${++anchorCount}`
      cur.parts.push(sectionFragment(section, anchor, images))
      nav.push({
        title: section.title,
        level: section.level,
        href: `${cur.chapter.fileName}#${anchor}`,
      })
    }
  }
  finalize()

  // 섹션이 하나도 없을 때를 대비한 빈 챕터.
  if (chapters.length === 0) {
    chapters.push({
      fileName: 'chapter1.xhtml',
      id: 'chapter1',
      title: '',
      bodyInner: '<p><br/></p>',
    })
  }

  // bodyInner -> 완전한 XHTML 문서로 치환.
  for (const ch of chapters) {
    ch.bodyInner = xhtmlDocument(ch.title, lang, ch.bodyInner)
  }
  return { chapters, nav }
}

// ---------- nav.xhtml(EPUB3 목차) ----------
function buildNav(nav: NavEntry[], title: string, lang: string): string {
  // level 차이를 중첩 <ol> 로 표현해 들여쓰기를 반영한다.
  let html = '<nav epub:type="toc" id="toc">\n'
  html += `<h1>${escapeXml(title)}</h1>\n`

  if (nav.length === 0) {
    html += '<ol><li><a href="chapter1.xhtml">' + escapeXml(title) + '</a></li></ol>\n'
  } else {
    // level 차이를 들여쓰기로 변환. 한 항목당 최대 한 단계만 깊어지게 해서
    // (1) 하위 <ol> 은 항상 직전 <li> 안에만 열리고, (2) level 이 2 이상 점프해도
    // <ol><ol>(잘못된 콘텐츠 모델) 대신 한 단계 중첩으로 흡수, (3) 닫는 태그 수가 항상 일치 → 항상 well-formed.
    let prevLevel: number | null = null
    let indent = 0 // 루트 <ol> 기준 현재 중첩 깊이
    html += '<ol>\n'
    for (let i = 0; i < nav.length; i++) {
      const e = nav[i]
      const lvl = e.level
      const target =
        prevLevel === null
          ? 0
          : lvl > prevLevel
            ? indent + 1
            : lvl < prevLevel
              ? Math.max(0, indent - (prevLevel - lvl))
              : indent
      if (target > indent) {
        html = html.replace(/<\/li>\n$/, '\n') // 직전 <li> 를 다시 열어 하위 <ol> 을 그 안에 둔다
        html += '<ol>\n'
      } else if (target < indent) {
        html += '</ol></li>\n'.repeat(indent - target)
      }
      indent = target
      html += `<li><a href="${escapeAttr(e.href)}">${escapeXml(e.title || '제목 없음')}</a></li>\n`
      prevLevel = lvl
    }
    html += '</ol></li>\n'.repeat(indent)
    html += '</ol>\n'
  }

  html += '</nav>\n'
  return xhtmlDocument(title, lang, html)
}

// ---------- content.opf(패키지 문서) ----------
function buildOpf(
  chapters: Chapter[],
  meta: EMeta,
  bookId: string,
  lang: string,
  modified: string,
  images: Images,
): string {
  // 매니페스트: nav + 각 챕터 + 첨부 이미지.
  const manifestItems: string[] = []
  manifestItems.push(
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  )
  for (const ch of chapters) {
    manifestItems.push(
      `<item id="${escapeAttr(ch.id)}" href="${escapeAttr(
        ch.fileName,
      )}" media-type="application/xhtml+xml"/>`,
    )
  }
  // 인라인 이미지: <item id="imgN" href="images/imgN.ext" media-type="image/..."/>.
  for (const img of images.list) {
    manifestItems.push(
      `<item id="${escapeAttr(img.id)}" href="${escapeAttr(
        img.href,
      )}" media-type="${escapeAttr(img.media)}"/>`,
    )
  }

  // 스파인: 읽기 순서(챕터들). nav 는 스파인에 넣지 않아도 무방하나, 포함해도 유효하다.
  const spineItems = chapters.map((ch) => `<itemref idref="${escapeAttr(ch.id)}"/>`).join('\n')

  const creator = meta.author
    ? `<dc:creator id="creator">${escapeXml(meta.author)}</dc:creator>\n`
    : ''

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="' +
    escapeAttr(lang) +
    '">\n' +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    `<dc:identifier id="book-id">${escapeXml(bookId)}</dc:identifier>\n` +
    `<dc:title>${escapeXml(meta.title)}</dc:title>\n` +
    `<dc:language>${escapeXml(lang)}</dc:language>\n` +
    creator +
    `<meta property="dcterms:modified">${escapeXml(modified)}</meta>\n` +
    '</metadata>\n' +
    '<manifest>\n' +
    manifestItems.join('\n') +
    '\n</manifest>\n' +
    '<spine>\n' +
    spineItems +
    '\n</spine>\n' +
    '</package>\n'
  )
}

// ---------- META-INF/container.xml ----------
const CONTAINER_XML =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
  '<rootfiles>\n' +
  '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
  '</rootfiles>\n' +
  '</container>\n'

// ---------- UUID(브라우저 전용) ----------
// crypto.randomUUID 가 있으면 사용하고, 없으면 getRandomValues 로 v4 UUID 를 만든다.
function makeUuid(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // 버전 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant
  const hex: string[] = []
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}

// ---------- 진입점 ----------
// 섹션 배열과 메타데이터로 EPUB3 .epub Blob 을 생성한다.
export async function sectionsToEpub(sections: ESection[], meta: EMeta): Promise<Blob> {
  const lang = meta.language && meta.language.trim() ? meta.language.trim() : 'ko'
  const bookId = `urn:uuid:${makeUuid()}`
  // dcterms:modified 는 초 단위 UTC(밀리초 제거)여야 한다.
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  // 인라인 이미지 수집기: 본문 렌더링 중 채워지고, OPF manifest 와 zip 패키징에 함께 쓰인다.
  const images = new Images()
  const { chapters, nav } = buildChapters(sections, lang, images)
  const navXhtml = buildNav(nav, meta.title, lang)
  const opf = buildOpf(chapters, meta, bookId, lang, modified, images)

  const zip = new JSZip()

  // (1) mimetype: 반드시 첫 엔트리 + 무압축(STORE). createFolders 비활성.
  zip.file('mimetype', 'application/epub+zip', {
    compression: 'STORE',
    createFolders: false,
  })

  // (2) META-INF/container.xml
  zip.file('META-INF/container.xml', CONTAINER_XML, { compression: 'DEFLATE' })

  // (3) OEBPS 패키지 구성요소
  zip.file('OEBPS/content.opf', opf, { compression: 'DEFLATE' })
  zip.file('OEBPS/nav.xhtml', navXhtml, { compression: 'DEFLATE' })
  for (const ch of chapters) {
    zip.file(`OEBPS/${ch.fileName}`, ch.bodyInner, { compression: 'DEFLATE' })
  }
  // 디코드된 인라인 이미지 바이너리를 OEBPS/images/ 에 첨부(이미 압축돼 있을 수 있어 기본 압축에 맡김).
  for (const img of images.list) {
    zip.file(img.zipPath, img.data)
  }

  // 전체 기본 압축은 DEFLATE 로(개별 STORE 지정은 그대로 유지됨).
  // JSZip 은 문자열을 UTF-8 로 인코딩하므로 한글/유니코드가 보존된다.
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  })
}
