// 목록 구조 정리/해제 유틸 — 브라우저 execCommand 의 목록 결과를 편집기 모델에 맞춘다.
//  모델: 문단은 .paper 직속 블록(p/h/blockquote), 목록은 ul/ol > li, 중첩은 li > ul(또는 브라우저식 ul > ul).
//  브라우저는 <p><ul>…</ul></p>(문단 안 목록), li 안 li(중첩 목록 outdent), 한 항목씩 쪼개진 <ol><li>…</ol><ol><li>…</ol>
//  (부분 변환), 목록을 풀 때 'x<br>' 맨 인라인 조각·항목 경계 없는 span 들을 남긴다.

export const BLOCK_RE = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|UL|OL|HR)$/
const CONTAINER_RE = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE)$/

function hasContent(el: Element): boolean {
  return (el.textContent || '').trim() !== '' || !!el.querySelector('img,.fn-marker,.cmt-marker')
}

export interface SelSnap { sc: Node; so: number; ec: Node; eo: number }

/** 캐럿/선택을 노드 기준으로 기억했다가 DOM 정리 뒤 복원하기 위한 스냅샷(노드가 사라졌으면 복원 시 폴백). */
export function snapshotSelection(paper: HTMLElement): SelSnap | null {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const r = sel.getRangeAt(0)
  if (!paper.contains(r.startContainer)) return null
  return { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset }
}

export function restoreSelection(paper: HTMLElement, snap: SelSnap | null, fallback?: Element | null) {
  const sel = window.getSelection()
  if (!sel) return
  const clamp = (n: Node, o: number) => Math.min(o, n.nodeType === 3 ? (n.textContent || '').length : n.childNodes.length)
  try {
    sel.removeAllRanges()
    if (snap && paper.contains(snap.sc) && paper.contains(snap.ec)) {
      const r = document.createRange()
      r.setStart(snap.sc, clamp(snap.sc, snap.so))
      r.setEnd(snap.ec, clamp(snap.ec, snap.eo))
      sel.addRange(r)
      return
    }
    const target = fallback || paper.querySelector('li:last-of-type') || paper
    const r = document.createRange()
    r.selectNodeContents(target)
    r.collapse(!!fallback)
    sel.addRange(r)
  } catch {
    /* 캐럿 복원 실패는 무시 */
  }
}

/**
 * 목록 구조 정리. 변경이 있었으면 true.
 *  1) 문단(p/h/div/blockquote/pre) 안에 들어간 목록을 밖으로 꺼낸다(문단은 목록 앞/뒤로 쪼갬).
 *  2) li 바로 안의 li 는 부모 li 뒤로 올린다(브라우저 outdent 결과).
 *  3) 인접한 같은 종류의 형제 목록(ul+ul, ol+ol)은 하나로 합친다(부분 변환이 항목마다 목록을 만드는 문제 — 모델도 연속 항목을 한 목록으로 본다).
 *  4) .paper 직속의 맨 텍스트/인라인 조각은 <p> 로 감싼다(<br> 에서 문단을 나눔).
 */
export function normalizeLists(paper: HTMLElement): boolean {
  let changed = false
  for (let guard = 0; guard < 8; guard++) {
    let moved = false
    Array.from(paper.querySelectorAll('ul,ol')).forEach((list) => {
      const parent = list.parentElement
      if (!parent || parent === paper || !CONTAINER_RE.test(parent.tagName)) return
      const gp = parent.parentNode
      if (!gp) return
      const before = parent.cloneNode(false) as HTMLElement
      while (parent.firstChild && parent.firstChild !== list) before.appendChild(parent.firstChild)
      const after = parent.cloneNode(false) as HTMLElement
      let n: Node | null = list.nextSibling
      while (n) { const nx: Node | null = n.nextSibling; after.appendChild(n); n = nx }
      if (hasContent(before)) gp.insertBefore(before, parent)
      gp.insertBefore(list, parent)
      if (hasContent(after)) gp.insertBefore(after, parent)
      gp.removeChild(parent)
      moved = true
    })
    if (!moved) break
    changed = true
  }
  for (let guard = 0; guard < 8; guard++) {
    let moved = false
    Array.from(paper.querySelectorAll('li > li')).forEach((li) => {
      const parent = li.parentElement
      if (!parent || !parent.parentNode) return
      parent.parentNode.insertBefore(li, parent.nextSibling)
      moved = true
    })
    if (!moved) break
    changed = true
  }
  for (let guard = 0; guard < 8; guard++) {
    let merged = false
    Array.from(paper.querySelectorAll('ul,ol')).forEach((list) => {
      if (!list.parentNode) return
      const next = list.nextElementSibling
      if (next && next.tagName === list.tagName) {
        while (next.firstChild) list.appendChild(next.firstChild)
        next.remove()
        merged = true
      }
    })
    if (!merged) break
    changed = true
  }
  let buf: Node[] = []
  const wrapBuf = () => {
    if (!buf.length) return
    const p = document.createElement('p')
    paper.insertBefore(p, buf[0])
    buf.forEach((n) => p.appendChild(n))
    buf = []
    changed = true
  }
  Array.from(paper.childNodes).forEach((n) => {
    if (n.nodeType === 1 && BLOCK_RE.test((n as HTMLElement).tagName)) { wrapBuf(); return }
    if (n.nodeType === 1 && (n as HTMLElement).tagName === 'BR') {
      if (buf.length) { wrapBuf(); paper.removeChild(n) } else { const p = document.createElement('p'); paper.insertBefore(p, n); p.appendChild(n) }
      changed = true
      return
    }
    if (n.nodeType === 3 && !(n.textContent || '').trim() && !buf.length) return
    if (n.nodeType === 8) return
    buf.push(n)
  })
  wrapBuf()
  return changed
}

function depthOf(li: Element, top: Element): number {
  let d = 0
  let e: Element | null = li.parentElement
  while (e && e !== top) {
    if (e.tagName === 'UL' || e.tagName === 'OL') d++
    e = e.parentElement
  }
  return d
}

function paragraphFrom(li: Element): HTMLElement {
  const p = document.createElement('p')
  for (const n of Array.from(li.childNodes)) {
    if (n.nodeType === 1 && /^(UL|OL)$/.test((n as Element).tagName)) continue
    p.appendChild(n)
  }
  if (!p.childNodes.length) p.appendChild(document.createElement('br'))
  return p
}

/**
 * 선택된 목록 항목들을 문단으로 되돌린다(목록 해제). 브라우저 기본 해제는 항목 경계를 잃어 'onetwo' 처럼 붙여 버린다.
 *  · 최상위 목록의 항목이 모두 선택됐으면: 중첩 포함 문서 순서대로 각 항목이 문단이 되고, 깊이는 들여쓰기(40px/단계)로 남긴다.
 *  · 평평한 목록의 일부만 선택: 그 항목만 문단으로 빼고 앞뒤 항목은 목록으로 남긴다.
 *  · 중첩 목록의 일부만 선택: 처리하지 않고 [] 를 돌려준다(호출자가 브라우저 기본으로 폴백).
 * 반환: 만들어진 문단들(문서 순서).
 */
export function unlistItems(paper: HTMLElement, lis: HTMLElement[]): HTMLElement[] {
  if (!lis.length) return []
  const set = new Set(lis)
  const topListOf = (li: Element): Element | null => {
    let top: Element | null = null
    let e: Element | null = li.parentElement
    while (e && e !== paper) {
      if (e.tagName === 'UL' || e.tagName === 'OL') top = e
      e = e.parentElement
    }
    return top
  }
  const tops: Element[] = []
  for (const li of lis) { const t = topListOf(li); if (t && !tops.includes(t)) tops.push(t) }
  if (!tops.length) return []
  for (const top of tops) {
    const all = Array.from(top.querySelectorAll('li'))
    const allSelected = all.every((li) => set.has(li as HTMLElement))
    const flat = !top.querySelector('ul,ol')
    if (!allSelected && !flat) return []
  }
  const out: HTMLElement[] = []
  for (const top of tops) {
    const all = Array.from(top.querySelectorAll('li'))
    const allSelected = all.every((li) => set.has(li as HTMLElement))
    const frag = document.createDocumentFragment()
    if (allSelected) {
      for (const li of all) {
        const depth = depthOf(li, top)
        const p = paragraphFrom(li)
        if (depth > 0) p.style.marginLeft = depth * 40 + 'px'
        frag.appendChild(p)
        out.push(p)
      }
    } else {
      let cur: HTMLElement | null = null
      for (const li of Array.from(top.children)) {
        if (li.tagName !== 'LI') continue
        if (set.has(li as HTMLElement)) {
          cur = null
          const p = paragraphFrom(li)
          frag.appendChild(p)
          out.push(p)
        } else {
          if (!cur) { cur = top.cloneNode(false) as HTMLElement; frag.appendChild(cur) }
          cur.appendChild(li)
        }
      }
    }
    top.replaceWith(frag)
  }
  return out
}

/** 캐럿이 목록 항목의 맨 앞(자기 텍스트 앞)에 있으면 그 li 를 돌려준다. */
export function liAtCaretStart(paper: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed || !sel.rangeCount) return null
  const r = sel.getRangeAt(0)
  const el = r.startContainer.nodeType === 1 ? (r.startContainer as HTMLElement) : r.startContainer.parentElement
  const li = el?.closest('li') as HTMLElement | null
  if (!li || !paper.contains(li)) return null
  const pre = document.createRange()
  pre.setStart(li, 0)
  pre.setEnd(r.startContainer, r.startOffset)
  if (pre.toString() !== '') return null
  if (pre.cloneContents().querySelector('img,.fn-marker,.cmt-marker,ul,ol')) return null
  return li
}

/**
 * 목록 항목 맨 앞에서 Backspace: 항목을 앞 문단에 붙이지 않고(브라우저 기본) 글머리만 없앤다 — 평평한 목록이면 그 항목을 문단으로,
 * 중첩 항목이면 한 단계 내어쓴다. 처리했으면 true(호출자가 preventDefault + input 발화).
 */
export function backspaceAtListStart(paper: HTMLElement): boolean {
  const li = liAtCaretStart(paper)
  if (!li) return false
  const snap = snapshotSelection(paper)
  const ps = unlistItems(paper, [li])
  if (ps.length) {
    normalizeLists(paper)
    restoreSelection(paper, snap, ps[0])
    return true
  }
  try { document.execCommand('outdent') } catch { /* noop */ }
  if (normalizeLists(paper)) restoreSelection(paper, snap, null)
  return true
}
