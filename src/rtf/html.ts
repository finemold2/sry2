// 구조화 문서 모델 <-> HTML (contenteditable 편집용). 브라우저 전용(DOM 사용).
import type { Align, Block, BlockType, RtfDoc, Run, RunStyle, StyleDef } from './model.ts'
import { STYLES, normalizeRunStyles } from './model.ts'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

// ---------- 모델 -> HTML ----------
interface RenderCtx {
  fn: number
}

function runToHtml(run: Run, ctx: RenderCtx, def?: StyleDef): string {
  const s = run.style || {}
  // 인라인 이미지
  if (s.image != null) {
    const dim: string[] = []
    if (s.imageW) dim.push(`width:${s.imageW}px`)
    if (s.imageH) dim.push(`height:${s.imageH}px`)
    const style = dim.length ? ` style="${escapeAttr(dim.join(';') + ';max-width:100%')}"` : ' style="max-width:100%"'
    return `<img src="${escapeAttr(safeUrl(s.image))}"${style}>`
  }
  // 각주/미주 마커
  if (s.footnote != null) {
    ctx.fn++
    const kind = s.endnote ? 'endnote' : 'footnote'
    const note = escapeAttr(s.footnote)
    return `<sup class="fn-marker" contenteditable="false" data-kind="${kind}" data-note="${note}" title="${note}">[${ctx.fn}]</sup>`
  }
  // 코멘트(주석) 마커
  if (s.comment != null) {
    const note = escapeAttr(s.comment)
    const cid = escapeAttr(s.commentId || '')
    return `<span class="cmt-marker" contenteditable="false" data-cid="${cid}" data-note="${note}" title="${note}">❝</span>`
  }
  let inner = escapeHtml(run.text).replace(/\n/g, '<br>')
  if (inner === '') inner = ''
  const styles: string[] = []
  if (s.color) styles.push(`color:${s.color}`)
  if (s.highlight) styles.push(`background-color:${s.highlight}`)
  if (s.fontSize) styles.push(`font-size:${s.fontSize}pt`)
  if (s.fontFamily) styles.push(`font-family:${cssFont(s.fontFamily)}`)
  // 제목(기본 굵게)/인용(기본 기울임) 안에서 명시적으로 해제한 런은 CSS 기본을 덮어쓴다.
  if (s.bold === false && def?.bold) styles.push('font-weight:normal')
  if (s.italic === false && def?.italic) styles.push('font-style:normal')
  if (s.bold) inner = `<strong>${inner}</strong>`
  if (s.italic) inner = `<em>${inner}</em>`
  if (s.underline) inner = `<u>${inner}</u>`
  if (s.strike) inner = `<s>${inner}</s>`
  if (s.superscript) inner = `<sup>${inner}</sup>`
  if (s.subscript) inner = `<sub>${inner}</sub>`
  if (styles.length) inner = `<span style="${escapeAttr(styles.join(';'))}">${inner}</span>`
  if (s.link) inner = `<a href="${escapeAttr(safeUrl(s.link))}">${inner}</a>`
  return inner
}

function cssFont(name: string): string {
  // CSS 값 컨텍스트 인젝션 방지: 따옴표·괄호·세미콜론·꺾쇠·역슬래시·제어문자 제거(유니코드 글꼴명은 보존).
  const clean = name.replace(/[\p{Cc}"'();{}<>\\]/gu, '')
  return /\s/.test(clean) ? `'${clean}'` : clean
}

// href/src 의 위험 스킴(javascript:/vbscript:/data:) 차단. 그 외(http/https/mailto/scriv:// 등)는 보존.
function safeUrl(url: string): string {
  const probe = url.replace(/[\p{Cc}\s]+/gu, '').toLowerCase()
  if (probe.startsWith('data:image/')) return url // 인라인 이미지 data URL 은 허용
  if (/^(javascript|vbscript|data):/.test(probe)) return '#'
  return url
}

function blockInner(b: Block, ctx: RenderCtx): string {
  if (!b.runs.length) return '<br>'
  const def = STYLES[b.type]
  const html = b.runs.map((r) => runToHtml(r, ctx, def)).join('')
  return html === '' ? '<br>' : html
}

// 목록 항목들(listLevel 보유)을 중첩 ul/ol 구조로 렌더링(epub 내보내기와 동일 알고리즘).
// blocks[start..end) 구간에서 level 깊이의 목록 하나를 만든다. 반환: HTML 과 다음 인덱스.
function renderListAt(
  blocks: Block[],
  start: number,
  end: number,
  level: number,
  ctx: RenderCtx,
): { html: string; next: number } {
  const listType = blocks[start].type
  const tag = listType === 'li-ul' ? 'ul' : 'ol'
  let html = `<${tag}>`
  let i = start
  while (i < end) {
    const lvl = blocks[i].listLevel ?? 0
    if (lvl < level) break // 더 얕은 항목 -> 상위 목록으로 복귀
    if (lvl === level && blocks[i].type !== listType) break // 같은 깊이에서 종류가 바뀌면(글머리→번호) 새 목록으로
    if (lvl > level) {
      // 더 깊은 항목 -> 직전 <li> 안에 중첩 목록을 끼워 넣는다.
      const sub = renderListAt(blocks, i, end, lvl, ctx)
      if (html.endsWith('</li>')) {
        html = html.slice(0, -'</li>'.length) + sub.html + '</li>'
      } else {
        html += `<li>${sub.html}</li>`
      }
      i = sub.next
      continue
    }
    html += `<li${blockStyle(blocks[i])}>${blockInner(blocks[i], ctx)}</li>`
    i++
  }
  html += `</${tag}>`
  return { html, next: i }
}

function blockStyle(b: Block): string {
  const s: string[] = []
  // 페이지 나눔(문서의 pageBreakBefore + honorPageBreaks 로 compile 이 설정한 block.pageBreak)을
  // HTML 출력에 반영 — PDF/인쇄가 강제 H1 개행 대신 실제 옵션을 따르게 한다.
  if (b.pageBreak) s.push('page-break-before:always')
  if (b.align && b.align !== 'left') s.push(`text-align:${b.align}`)
  if (b.lineSpacing) s.push(`line-height:${b.lineSpacing}`) // 명시 1.0 도 유지(문서 기본과 다를 수 있음)
  if (b.spaceBefore) s.push(`margin-top:${b.spaceBefore}pt`)
  if (b.spaceAfter != null) s.push(`margin-bottom:${b.spaceAfter}pt`)
  if (b.leftIndent) s.push(`margin-left:${b.leftIndent}pt`)
  if (b.rightIndent) s.push(`margin-right:${b.rightIndent}pt`)
  if (b.firstIndent) s.push(`text-indent:${b.firstIndent}pt`)
  return s.length ? ` style="${s.join(';')}"` : ''
}

export function modelToHtml(doc: RtfDoc): string {
  let html = ''
  const ctx: RenderCtx = { fn: 0 }
  const blocks = doc.blocks
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.type === 'hr') {
      html += '<hr>'
      i++
      continue
    }
    if (b.type === 'li-ul' || b.type === 'li-ol') {
      // 연속된 목록 항목(li-ul/li-ol)을 listLevel 반영해 중첩 ul/ol 로 렌더링.
      let end = i
      while (end < blocks.length && (blocks[end].type === 'li-ul' || blocks[end].type === 'li-ol')) end++
      let minLevel = Infinity
      for (let k = i; k < end; k++) minLevel = Math.min(minLevel, blocks[k].listLevel ?? 0)
      if (!isFinite(minLevel)) minLevel = 0
      // 인접한 목록이 종류(ul/ol)를 바꾸면 renderListAt 이 거기서 멈추므로, 남은 항목으로 다음 목록을 이어 만든다.
      while (i < end) {
        const r = renderListAt(blocks, i, end, minLevel, ctx)
        html += r.html
        i = r.next > i ? r.next : i + 1
      }
      continue
    }
    const a = blockStyle(b)
    if (b.type === 'blockquote') html += `<blockquote${a}>${blockInner(b, ctx)}</blockquote>`
    else if (/^h[1-4]$/.test(b.type)) html += `<${b.type}${a}>${blockInner(b, ctx)}</${b.type}>`
    else html += `<p${a}>${blockInner(b, ctx)}</p>`
    i++
  }
  return html || '<p><br></p>'
}

// ---------- HTML -> 모델 ----------
function normColor(v: string): string | undefined {
  if (!v) return undefined
  v = v.trim()
  const rgb = v.match(/rgba?\(([^)]+)\)/i)
  if (rgb) {
    const parts = rgb[1].split(',').map((x) => parseFloat(x))
    const [r, g, b] = parts
    return (
      '#' +
      [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')
    )
  }
  if (v.startsWith('#')) {
    if (v.length === 4) return '#' + v.slice(1).split('').map((c) => c + c).join('')
    if (v.length === 7) return v.toLowerCase()
  }
  return undefined
}

function parseFontSize(v: string): number | undefined {
  if (!v) return undefined
  const m = v.match(/([\d.]+)\s*(pt|px|em|rem)?/)
  if (!m) return undefined
  const n = parseFloat(m[1])
  const unit = m[2] || 'px'
  if (unit === 'pt') return Math.round(n * 10) / 10
  if (unit === 'px') return Math.round(n * 0.75 * 10) / 10
  if (unit === 'em' || unit === 'rem') return Math.round(n * 12 * 10) / 10
  return n
}

function applyInlineStyle(style: CSSStyleDeclaration, s: RunStyle) {
  const fw = style.fontWeight
  if (fw === 'bold' || fw === 'bolder' || (parseInt(fw) >= 600)) s.bold = true
  else if (fw === 'normal' || fw === 'lighter' || (parseInt(fw) > 0 && parseInt(fw) < 600)) s.bold = false // 명시 해제(제목 안 등)
  if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') s.italic = true
  else if (style.fontStyle === 'normal') s.italic = false
  const td = style.textDecorationLine || style.textDecoration
  if (td) {
    if (td.includes('underline')) s.underline = true
    if (td.includes('line-through')) s.strike = true
  }
  if (style.color) {
    const c = normColor(style.color)
    if (c) s.color = c
  }
  if (style.backgroundColor) {
    const c = normColor(style.backgroundColor)
    if (c) s.highlight = c
  }
  if (style.fontSize) {
    const fz = parseFontSize(style.fontSize)
    if (fz) s.fontSize = fz
  }
  if (style.fontFamily) {
    const fam = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim()
    // 브라우저가 문단 병합 시 끼워 넣는 'inherit' 같은 CSS 키워드는 글꼴이 아니다(폰트 테이블 오염 방지).
    if (fam && !/^(inherit|initial|unset|revert|revert-layer)$/i.test(fam)) s.fontFamily = fam
  }
  const va = style.verticalAlign
  if (va === 'super') s.superscript = true
  if (va === 'sub') s.subscript = true
}

function styleKey(s: RunStyle): string {
  return JSON.stringify([
    s.bold === false ? 'nb' : !!s.bold,
    s.italic === false ? 'ni' : !!s.italic,
    !!s.underline,
    !!s.strike,
    !!s.superscript,
    !!s.subscript,
    s.fontSize || 0,
    s.fontFamily || '',
    s.color || '',
    s.highlight || '',
    s.link || '',
  ])
}

function isMarker(s: RunStyle): boolean {
  return s.footnote != null || s.comment != null || s.image != null
}

function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = []
  for (const r of runs) {
    if (isMarker(r.style)) {
      // 각주/코멘트 마커는 빈 텍스트라도 보존하고 병합하지 않는다.
      out.push({ text: '', style: { ...r.style } })
      continue
    }
    if (r.text === '') continue
    const last = out[out.length - 1]
    if (last && !isMarker(last.style) && styleKey(last.style) === styleKey(r.style)) last.text += r.text
    else out.push({ text: r.text, style: { ...r.style } })
  }
  return out
}

function collectRuns(node: Node, style: RunStyle, runs: Run[]) {
  if (node.nodeType === 3) {
    // 마커 삽입 시 들어가는 제로폭 문자(U+200B 등)를 제거 — 글자수/검색/RTF 오염 방지.
    const t = (node.textContent || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    if (t !== '') runs.push({ text: t, style: { ...style } })
    return
  }
  if (node.nodeType !== 1) return
  const el = node as HTMLElement
  const tag = el.tagName
  if (tag === 'BR') {
    runs.push({ text: '\n', style: { ...style } })
    return
  }
  // 인라인 이미지
  if (tag === 'IMG') {
    const src = el.getAttribute('src') || ''
    if (src.startsWith('data:image/')) {
      const ms: RunStyle = { image: src }
      const w = parseInt(el.style.width || el.getAttribute('width') || '', 10)
      const h = parseInt(el.style.height || el.getAttribute('height') || '', 10)
      if (w) ms.imageW = w
      if (h) ms.imageH = h
      runs.push({ text: '', style: ms })
    }
    return
  }
  // 각주/미주 마커
  if (el.classList && el.classList.contains('fn-marker')) {
    const note = el.getAttribute('data-note') || ''
    const ms: RunStyle = { footnote: note }
    if (el.getAttribute('data-kind') === 'endnote') ms.endnote = true
    runs.push({ text: '', style: ms })
    return
  }
  // 코멘트(주석) 마커
  if (el.classList && el.classList.contains('cmt-marker')) {
    const note = el.getAttribute('data-note') || ''
    const ms: RunStyle = { comment: note }
    const cid = el.getAttribute('data-cid')
    if (cid) ms.commentId = cid
    runs.push({ text: '', style: ms })
    return
  }
  const s: RunStyle = { ...style }
  switch (tag) {
    case 'STRONG':
    case 'B':
      s.bold = true
      break
    case 'EM':
    case 'I':
      s.italic = true
      break
    case 'U':
      s.underline = true
      break
    case 'S':
    case 'STRIKE':
    case 'DEL':
      s.strike = true
      break
    case 'SUP':
      s.superscript = true
      break
    case 'SUB':
      s.subscript = true
      break
    case 'A': {
      const href = el.getAttribute('href')
      if (href) s.link = href
      break
    }
    case 'FONT': {
      const c = el.getAttribute('color')
      if (c) {
        const nc = normColor(c)
        if (nc) s.color = nc
      }
      const f = el.getAttribute('face')
      if (f) s.fontFamily = f
      break
    }
  }
  applyInlineStyle(el.style, s)
  for (const child of Array.from(el.childNodes)) collectRuns(child, s, runs)
}

function processList(listEl: HTMLElement, blocks: Block[], level: number) {
  const type: BlockType = listEl.tagName === 'UL' ? 'li-ul' : 'li-ol'
  for (const li of Array.from(listEl.children)) {
    // 브라우저 execCommand('indent') 는 <li> 안이 아니라 <ul> 바로 아래에 <ul>/<ol> 을 만든다
    // (<ul><li>L1</li><ul><li>L2</li></ul></ul>). 이를 건너뛰면 들여쓴 항목이 RTF 저장에서 통째로 사라지므로
    // 한 단계 깊은 목록으로 처리한다.
    if (li.tagName === 'UL' || li.tagName === 'OL') { processList(li as HTMLElement, blocks, level + 1); continue }
    if (li.tagName !== 'LI') continue
    const runs: Run[] = []
    const nested: HTMLElement[] = []
    for (const child of Array.from(li.childNodes)) {
      if (child.nodeType === 1 && ((child as HTMLElement).tagName === 'UL' || (child as HTMLElement).tagName === 'OL')) {
        nested.push(child as HTMLElement)
      } else {
        collectRuns(child, {}, runs)
      }
    }
    const block: Block = { type, listLevel: level, runs: mergeRuns(runs) }
    readBlockStyle(li as HTMLElement, block) // 항목의 정렬/줄간격도 보존(예전엔 버려져 새로고침 후 사라짐)
    blocks.push(block)
    for (const n of nested) processList(n, blocks, level + 1)
  }
}

function parsePt(v: string): number | undefined {
  if (!v) return undefined
  const m = v.match(/(-?[\d.]+)\s*(pt|px)?/)
  if (!m) return undefined
  const n = parseFloat(m[1])
  return (m[2] || 'px') === 'px' ? Math.round(n * 0.75 * 10) / 10 : Math.round(n * 10) / 10
}

function readBlockStyle(el: HTMLElement, block: Block) {
  const st = el.style
  const ta = st.textAlign as Align
  if (ta && ta !== 'left' && ['center', 'right', 'justify'].includes(ta)) block.align = ta
  if (st.lineHeight) {
    const lh = parseFloat(st.lineHeight)
    if (!isNaN(lh) && !/px|pt|%/.test(st.lineHeight)) block.lineSpacing = lh
  }
  const mt = parsePt(st.marginTop)
  if (mt) block.spaceBefore = mt
  const mb = parsePt(st.marginBottom)
  if (mb != null) block.spaceAfter = mb
  const ml = parsePt(st.marginLeft)
  if (ml) block.leftIndent = ml
  const mr = parsePt(st.marginRight)
  if (mr) block.rightIndent = mr
  const ti = parsePt(st.textIndent)
  if (ti) block.firstIndent = ti
}

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'DIV', 'PRE', 'UL', 'OL', 'HR'])

function blockTypeOf(tag: string): BlockType {
  if (tag === 'BLOCKQUOTE') return 'blockquote'
  if (/^H[1-4]$/.test(tag)) return tag.toLowerCase() as BlockType
  if (tag === 'H5' || tag === 'H6') return 'h4'
  return 'p'
}

// 블록 요소(p/h/blockquote/div/pre) 하나를 모델 블록으로. 브라우저 편집 결과는 블록 안에 블록이 들어갈 수 있다:
//  · execCommand('indent') 는 문단들을 <blockquote style="margin:0 0 0 40px; border:none; padding:0"> 로 감싼다(들여쓰기 래퍼)
//  · 목록 명령은 <p><ul>…</ul></p> 처럼 문단 안에 목록을 만든다
//  · 제목 안에 목록, 인용 안에 문단 등
// 예전엔 바깥 블록 하나로 뭉개(collectRuns 로 평탄화) 문단 경계·목록이 새로고침 후 사라졌다. 이제 안쪽 블록은
// 재귀로 각각의 블록이 되고, 블록 사이의 인라인 조각은 바깥 블록 유형의 블록이 된다. 들여쓰기 래퍼는 인용이 아니라
// 자식 문단의 leftIndent 로 흡수한다.
function processBlockEl(el: HTMLElement, blocks: Block[], inherit: { indent?: number; quote?: boolean }) {
  const tag = el.tagName
  const st = el.style
  const isIndentWrap =
    tag === 'BLOCKQUOTE' && !!st.marginLeft && (st.border === 'none' || st.borderStyle === 'none' || st.borderLeftStyle === 'none')
  let type: BlockType = isIndentWrap ? 'p' : blockTypeOf(tag)
  if (inherit.quote && type === 'p') type = 'blockquote'
  const ownIndent = parsePt(st.marginLeft) || 0
  const applyInherit = (block: Block) => {
    if (inherit.indent) block.leftIndent = (block.leftIndent || 0) + inherit.indent
    if (block.leftIndent != null && block.leftIndent <= 0) delete block.leftIndent
  }
  const hasBlockChild = Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName))
  if (!hasBlockChild) {
    const runs: Run[] = []
    for (const child of Array.from(el.childNodes)) collectRuns(child, {}, runs)
    const block: Block = { type, runs: mergeRuns(runs) }
    readBlockStyle(el, block)
    applyInherit(block)
    blocks.push(block)
    return
  }
  const childInherit = { indent: (inherit.indent || 0) + ownIndent, quote: inherit.quote || (type === 'blockquote') }
  let buf: Node[] = []
  const flush = () => {
    if (!buf.length) return
    const runs: Run[] = []
    for (const n of buf) collectRuns(n, {}, runs)
    buf = []
    const merged = mergeRuns(runs)
    // 블록 사이의 공백/빈 조각만이면 블록을 만들지 않는다(목록 앞뒤에 빈 문단이 생기던 문제).
    if (!merged.length || merged.every((r) => r.text.trim() === '' && !isMarker(r.style))) return
    const block: Block = { type, runs: merged }
    readBlockStyle(el, block)
    applyInherit(block)
    blocks.push(block)
  }
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) {
      if (/\S/.test(node.textContent || '')) buf.push(node)
      continue
    }
    if (node.nodeType !== 1) continue
    const c = node as HTMLElement
    if (c.tagName === 'UL' || c.tagName === 'OL') {
      flush()
      processList(c, blocks, 0)
    } else if (c.tagName === 'HR') {
      flush()
      blocks.push({ type: 'hr', runs: [] })
    } else if (BLOCK_TAGS.has(c.tagName)) {
      flush()
      processBlockEl(c, blocks, childInherit)
    } else {
      buf.push(c)
    }
  }
  flush()
}

function processChildren(parent: HTMLElement, blocks: Block[]) {
  let inlineBuffer: Node[] = []
  const flushInline = () => {
    if (!inlineBuffer.length) return
    const runs: Run[] = []
    for (const n of inlineBuffer) collectRuns(n, {}, runs)
    const merged = mergeRuns(runs)
    if (merged.length) blocks.push({ type: 'p', runs: merged })
    inlineBuffer = []
  }
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3) {
      if (/\S/.test(node.textContent || '')) inlineBuffer.push(node)
      continue
    }
    if (node.nodeType !== 1) continue
    const el = node as HTMLElement
    const tag = el.tagName
    if (tag === 'HR') {
      flushInline()
      blocks.push({ type: 'hr', runs: [] })
    } else if (BLOCK_TAGS.has(tag) && tag !== 'UL' && tag !== 'OL' && tag !== 'HR') {
      flushInline()
      processBlockEl(el, blocks, {})
    } else if (tag === 'UL' || tag === 'OL') {
      flushInline()
      processList(el, blocks, 0)
    } else if (tag === 'BR') {
      flushInline()
      blocks.push({ type: 'p', runs: [] })
    } else {
      inlineBuffer.push(node)
    }
  }
  flushInline()
}

export function htmlToModel(html: string): RtfDoc {
  const dom = new DOMParser().parseFromString(html || '', 'text/html')
  const blocks: Block[] = []
  processChildren(dom.body, blocks)
  if (!blocks.length) blocks.push({ type: 'p', runs: [] })
  for (const b of blocks) normalizeRunStyles(b)
  return { blocks }
}
