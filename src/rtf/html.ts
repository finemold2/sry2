// 구조화 문서 모델 <-> HTML (contenteditable 편집용). 브라우저 전용(DOM 사용).
import type { Align, Block, BlockType, RtfDoc, Run, RunStyle } from './model.ts'

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

function runToHtml(run: Run, ctx: RenderCtx): string {
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
  const html = b.runs.map((r) => runToHtml(r, ctx)).join('')
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
  const tag = blocks[start].type === 'li-ul' ? 'ul' : 'ol'
  let html = `<${tag}>`
  let i = start
  while (i < end) {
    const lvl = blocks[i].listLevel ?? 0
    if (lvl < level) break // 더 얕은 항목 -> 상위 목록으로 복귀
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
    html += `<li>${blockInner(blocks[i], ctx)}</li>`
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
  if (b.lineSpacing && b.lineSpacing !== 1) s.push(`line-height:${b.lineSpacing}`)
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
      html += renderListAt(blocks, i, end, minLevel, ctx).html
      i = end
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
  if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') s.italic = true
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
    s.fontFamily = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim()
  }
  const va = style.verticalAlign
  if (va === 'super') s.superscript = true
  if (va === 'sub') s.subscript = true
}

function styleKey(s: RunStyle): string {
  return JSON.stringify([
    !!s.bold,
    !!s.italic,
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
    blocks.push({ type, listLevel: level, runs: mergeRuns(runs) })
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
    } else if (['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'DIV'].includes(tag)) {
      flushInline()
      const runs: Run[] = []
      for (const child of Array.from(el.childNodes)) collectRuns(child, {}, runs)
      const type: BlockType =
        tag === 'DIV' ? 'p' : tag === 'BLOCKQUOTE' ? 'blockquote' : (tag.toLowerCase() as BlockType)
      const block: Block = { type, runs: mergeRuns(runs) }
      readBlockStyle(el, block)
      blocks.push(block)
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
  return { blocks }
}
