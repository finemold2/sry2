import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquare,
  Strikethrough,
  StickyNote,
  Subscript,
  Superscript,
  Underline,
} from 'lucide-react'
import { SCRIV_LINK_PREFIX, useStore } from '../store/store'

/** .paper 안의 각주 마커를 문서 순서대로 다시 번호 매김. */
export function renumberFootnotes(paper: HTMLElement) {
  const marks = paper.querySelectorAll('.fn-marker')
  marks.forEach((m, i) => {
    m.textContent = `[${i + 1}]`
  })
}

const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48]
const FONTS = ['Malgun Gothic', 'Batang', 'Gulim', 'Georgia', 'Times New Roman', 'Arial', 'Courier New']

// 리비전 색(Scrivener 리비전 모드 유사) — 선택 영역을 고친 표시 색으로 칠하고, 나중에 일괄 제거(승인).
const REVISION_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400']
function colorToHex(c: string): string {
  c = (c || '').trim().toLowerCase()
  if (c.startsWith('#')) return c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('') : c
}

function exec(cmd: string, value?: string) {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(cmd, false, value)
}

function editableOf(node: Node | null): HTMLElement | null {
  let el = node && (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement)
  return el ? (el.closest('.paper') as HTMLElement | null) : null
}

export default function FormatBar() {
  const [, force] = useState(0)
  const refresh = () => force((n) => n + 1)
  const saved = useRef<Range | null>(null)

  useEffect(() => {
    // selectionchange 는 키 입력마다 발화 → rAF 로 프레임당 1회로 스로틀(#22 타이핑 중 서식바 과도 리렌더 완화).
    let raf = 0
    const h = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount) {
          const el = editableOf(sel.anchorNode)
          if (el) {
            saved.current = sel.getRangeAt(0).cloneRange()
            refresh()
          }
        }
      })
    }
    document.addEventListener('selectionchange', h)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('selectionchange', h) }
  }, [])

  const restore = () => {
    const el = editableOf(saved.current?.commonAncestorContainer ?? null)
    el?.focus()
    const r = saved.current
    if (r) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    }
  }

  const afterExec = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount && editableOf(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange()
    refresh()
  }

  const run = (cmd: string, value?: string) => {
    restore()
    exec(cmd, value)
    afterExec()
  }

  const wrapInlineStyle = (prop: 'fontSize' | 'fontFamily', value: string) => {
    restore()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    // 다중 '문단'에 걸친 선택은 명시적으로 차단(리뷰 F2) — extractContents 는 예외를 던지지 않고
    // 부분 <p>들을 span 에 싸서 p>span>p 중첩을 만들며, RTF 재파싱 시 스타일이 조용히 소실된다.
    const blockOf = (n: Node | null): Element | null => {
      const el = n ? (n.nodeType === 1 ? (n as Element) : n.parentElement) : null
      return el ? el.closest('p,h1,h2,h3,h4,h5,h6,blockquote,li,pre,div') : null
    }
    if (blockOf(range.startContainer) !== blockOf(range.endContainer)) {
      try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '글꼴/크기는 한 문단 안의 선택에만 적용돼요 — 문단별로 나눠 적용해 주세요.' })) } catch { /* noop */ }
      return
    }
    const span = document.createElement('span')
    ;(span.style as unknown as Record<string, string>)[prop] = value
    try {
      span.appendChild(range.extractContents())
      range.insertNode(span)
      sel.removeAllRanges()
      const r = document.createRange()
      r.selectNodeContents(span)
      sel.addRange(r)
      // DOM 직접 조작이라 네이티브 input 이 안 뜬다 — 에디터가 저장하도록 input 을 명시 발화(글꼴/크기 영속).
      editableOf(span)?.dispatchEvent(new Event('input', { bubbles: true }))
    } catch {
      /* 복수 블록 선택은 무시 */
    }
    afterExec()
  }

  const state = (cmd: string) => {
    try {
      return document.queryCommandState(cmd)
    } catch {
      return false
    }
  }

  const curBlock = (() => {
    try {
      const v = document.queryCommandValue('formatBlock')
      return (v || 'p').toString().toLowerCase().replace(/[<>]/g, '')
    } catch {
      return 'p'
    }
  })()

  const setHighlight = (hex: string) => {
    restore()
    if (!document.execCommand('hiliteColor', false, hex)) exec('backColor', hex)
    afterExec()
  }

  // 리비전 색 일괄 제거 — 라이브 에디터 DOM 에서 리비전 팔레트 색을 지우고 input 으로 저장.
  const clearRevisions = () => {
    document.querySelectorAll<HTMLElement>('.paper').forEach((p) => {
      let changed = false
      p.querySelectorAll<HTMLElement>('[style*="color"]').forEach((el) => {
        if (el.style.color && REVISION_COLORS.includes(colorToHex(el.style.color))) {
          el.style.removeProperty('color')
          changed = true
        }
      })
      if (changed) p.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const makeLink = () => {
    const url = window.prompt('링크 URL 을 입력하세요:', 'https://')
    if (url) run('createLink', url)
  }

  const paperOf = (): HTMLElement | null =>
    editableOf(saved.current?.commonAncestorContainer ?? null)

  // 캐럿 위치에 마커 노드를 삽입하고 그 뒤로 캐럿 이동.
  const insertMarkerNode = (el: HTMLElement) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    range.collapse(false) // 선택 끝으로
    range.insertNode(el)
    // 마커 뒤에 보이지 않는 공백을 두어 캐럿이 마커 밖으로 나오게 함
    const after = document.createTextNode('​')
    el.after(after)
    const r = document.createRange()
    r.setStartAfter(after)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
    return true
  }

  const insertFootnote = (endnote: boolean) => {
    restore()
    const paper = paperOf()
    if (!paper) return
    const text = window.prompt(endnote ? '미주 내용:' : '각주 내용:', '')
    if (text == null) return
    const sup = document.createElement('sup')
    sup.className = 'fn-marker'
    sup.setAttribute('contenteditable', 'false')
    sup.setAttribute('data-kind', endnote ? 'endnote' : 'footnote')
    sup.setAttribute('data-note', text)
    sup.setAttribute('title', text)
    sup.textContent = '[?]'
    if (insertMarkerNode(sup)) {
      renumberFootnotes(paper)
      paper.dispatchEvent(new Event('input', { bubbles: true }))
    }
    refresh()
  }

  // 문서 링크 삽입(다른 문서를 가리키는 내부 링크). App 의 피커가 이벤트로 호출.
  useEffect(() => {
    const onInsert = (e: Event) => {
      const { id, title } = (e as CustomEvent).detail || {}
      if (!id) return
      restore()
      const paper = paperOf()
      if (!paper) return
      const a = document.createElement('a')
      a.setAttribute('href', SCRIV_LINK_PREFIX + id)
      a.textContent = title || '문서'
      if (insertMarkerNode(a)) paper.dispatchEvent(new Event('input', { bubbles: true }))
      refresh()
    }
    window.addEventListener('scriv:insertDocLink', onInsert as EventListener)
    return () => window.removeEventListener('scriv:insertDocLink', onInsert as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 본문 커서 위치에 인라인 인용을 삽입(참고문헌 뷰의 '본문 인용' 버튼이 이벤트로 호출).
  // detail.html 은 *별표* 강조를 이미 <em> 으로 변환한 신뢰된 서지 문자열.
  useEffect(() => {
    const onInsert = (e: Event) => {
      const { html, text } = (e as CustomEvent).detail || {}
      if (!html && !text) return
      restore()
      const paper = paperOf()
      if (!paper) return
      const span = document.createElement('span')
      span.className = 'cite-inline'
      if (html) span.innerHTML = String(html)
      else span.textContent = String(text)
      if (insertMarkerNode(span)) paper.dispatchEvent(new Event('input', { bubbles: true }))
      refresh()
    }
    window.addEventListener('scriv:insertCitation', onInsert as EventListener)
    return () => window.removeEventListener('scriv:insertCitation', onInsert as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 수집함의 메모/노트를 본문 커서 위치에 삽입(수집함의 '원고에 삽입' 버튼이 이벤트로 호출).
  //  · 여러 줄은 <br>(= run 의 \n) 으로 보존. 평문만 추가하고 기존 본문/서식은 건드리지 않는다(데이터 안전).
  //  · 커서가 에디터 밖이면 본문 끝에 안전하게 추가한다.
  useEffect(() => {
    const onInsert = (e: Event) => {
      const text = String(((e as CustomEvent).detail || {}).text || '')
      if (!text.trim()) return
      restore()
      // 에디터에 한 번도 커서를 둔 적 없어도(=saved 선택 없음) 동작하도록 보이는 본문 에디터로 폴백.
      const paper = paperOf() || (document.querySelector('.paper') as HTMLElement | null)
      if (!paper) return
      const sel = window.getSelection()
      if (!sel) return
      // 마지막 문단(블록) 안쪽 끝 범위를 만든다 — .paper 직속(문단 밖)에 넣으면 RTF 직렬화가 누락한다.
      const blockEndRange = (): Range => {
        let block = paper.lastElementChild as HTMLElement | null
        if (!block || !/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(block.tagName)) {
          block = document.createElement('p'); paper.appendChild(block)
        }
        if (block.childNodes.length === 1 && block.firstChild && block.firstChild.nodeName === 'BR') {
          block.removeChild(block.firstChild) // 빈 문단(<br> 만)이면 비우고 그 자리에 채움
        }
        const r = document.createRange(); r.selectNodeContents(block); r.collapse(false); return r
      }
      let range: Range
      if (sel.rangeCount && paper.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0).cloneRange(); range.collapse(false)
        // 커서가 문단 사이(.paper 직속)면 문단 안쪽으로 정규화
        if (range.startContainer === paper) range = blockEndRange()
      } else {
        range = blockEndRange()
      }
      const frag = document.createDocumentFragment()
      const lines = text.replace(/\r\n?/g, '\n').split('\n')
      lines.forEach((ln, i) => {
        if (i > 0) frag.appendChild(document.createElement('br'))
        if (ln) frag.appendChild(document.createTextNode(ln))
      })
      const tail = document.createTextNode('​') // 캐럿이 삽입 텍스트 밖으로 나오게
      frag.appendChild(tail)
      range.insertNode(frag)
      const r = document.createRange(); r.setStartAfter(tail); r.collapse(true)
      sel.removeAllRanges(); sel.addRange(r)
      paper.dispatchEvent(new Event('input', { bubbles: true }))
      refresh()
    }
    window.addEventListener('scriv:insertText', onInsert as EventListener)
    return () => window.removeEventListener('scriv:insertText', onInsert as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 인라인 이미지 삽입(data URL → 본문 \pict 로 왕복). 큰 이미지는 폭 480px 로 제한.
  // ⚠ 본문 인라인 이미지는 base64 로 원고 RTF 안에 통째로 박힌다(저장·로딩 부담). 그래서:
  //  - 하드 상한(INLINE_IMAGE_HARD_BYTES) 초과는 차단하고 '수집함(자료) 가져오기'(blob 참조)로 유도.
  //  - 권고 상한(INLINE_IMAGE_WARN_BYTES) 초과는 삽입 전 경고/확인. (base64 는 실제 크기의 약 1.33배로 더 커짐)
  const INLINE_IMAGE_WARN_BYTES = 1.5 * 1024 * 1024 // 1.5MB 초과 시 경고 후 확인
  const INLINE_IMAGE_HARD_BYTES = 8 * 1024 * 1024 // 8MB 초과는 본문 삽입 차단(원고 비대화 방지)
  const insertImage = () => {
    restore()
    const paper = paperOf()
    if (!paper) return
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = () => {
      const file = inp.files?.[0]
      if (!file) return
      if (!/^image\//.test(file.type)) {
        window.alert('이미지 파일만 본문에 삽입할 수 있습니다.')
        return
      }
      // 하드 상한: 큰 이미지는 본문에 base64 로 박지 않고 자료(blob 참조)로 가져오도록 차단.
      if (file.size > INLINE_IMAGE_HARD_BYTES) {
        window.alert(
          `이미지가 너무 큽니다(약 ${Math.round(file.size / 1024 / 1024)}MB, 본문 인라인 상한 ${Math.round(
            INLINE_IMAGE_HARD_BYTES / 1024 / 1024,
          )}MB).\n` +
            '큰 이미지는 본문에 직접 넣지 말고 메뉴 ‘이미지/PDF 가져오기’로 자료에 추가하세요(원고를 가볍게 유지).',
        )
        return
      }
      // 권고 상한: 적당히 큰 이미지는 원고 비대화 경고 후 확인.
      if (file.size > INLINE_IMAGE_WARN_BYTES) {
        const ok = window.confirm(
          `이미지 용량이 약 ${(file.size / 1024 / 1024).toFixed(1)}MB 입니다.\n` +
            '본문에 직접 넣으면 원고(RTF) 안에 통째로 저장되어 파일이 커지고 느려질 수 있습니다.\n' +
            '그래도 본문에 삽입할까요? (취소하면 ‘이미지/PDF 가져오기’로 자료에 넣는 것을 권장)',
        )
        if (!ok) return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result || '')
        if (!dataUrl.startsWith('data:image/')) return
        const img = document.createElement('img')
        img.src = dataUrl
        img.style.maxWidth = '100%'
        restore()
        if (insertMarkerNode(img)) paper.dispatchEvent(new Event('input', { bubbles: true }))
        refresh()
      }
      reader.readAsDataURL(file)
    }
    inp.click()
  }

  const insertComment = () => {
    restore()
    const paper = paperOf()
    if (!paper) return
    const text = window.prompt('코멘트(주석) 내용:', '')
    if (text == null || text === '') return
    // 선택 영역이 있으면 형광펜으로 표시(코멘트 범위 시각화)
    const sel = window.getSelection()
    if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
      if (!document.execCommand('hiliteColor', false, '#fff1a8')) exec('backColor', '#fff1a8')
    }
    const span = document.createElement('span')
    span.className = 'cmt-marker'
    span.setAttribute('contenteditable', 'false')
    const cid =
      (crypto as { randomUUID?: () => string }).randomUUID?.().slice(0, 8) || 'c' + Math.floor(Date.now() % 1e8)
    span.setAttribute('data-cid', cid)
    span.setAttribute('data-note', text)
    span.setAttribute('title', text)
    span.textContent = '❝'
    if (insertMarkerNode(span)) {
      paper.dispatchEvent(new Event('input', { bubbles: true }))
    }
    refresh()
  }

  const anchorBlock = (): HTMLElement | null => {
    const r = saved.current
    const sel = window.getSelection()
    const n: Node | null =
      r?.commonAncestorContainer ?? (sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null)
    let el = n && (n.nodeType === 1 ? (n as HTMLElement) : n.parentElement)
    while (el && !el.classList?.contains('paper')) {
      if (/^(P|H1|H2|H3|H4|BLOCKQUOTE|LI|DIV)$/.test(el.tagName)) return el
      el = el.parentElement
    }
    return null
  }
  // 현재 선택 범위와 겹치는 모든 블록 엘리먼트(p/h/blockquote/li). 선택이 비었으면 캐럿이 놓인 블록 1개.
  const blocksInSelection = (): HTMLElement[] => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) { const a = anchorBlock(); return a ? [a] : [] }
    const range = sel.getRangeAt(0)
    const paper = editableOf(range.commonAncestorContainer)
    if (!paper) { const a = anchorBlock(); return a ? [a] : [] }
    const cand = Array.from(paper.querySelectorAll('p,h1,h2,h3,h4,blockquote,li')) as HTMLElement[]
    const hit = cand.filter((b) => range.intersectsNode(b))
    if (hit.length) return hit
    const a = anchorBlock(); return a ? [a] : []
  }
  // 줄간격:
  //  · 선택 없음(빈 파일/캐럿만) → 문서 전체 기본(editorLineHeight)을 바꾼다(이후 새 문단도 그대로 따름).
  //  · 블록 선택(범위) → 선택된 블록들에만 줄간격을 적용(문서 기본 위에 덮어씀).
  //  · '문서 기본' 선택 → 선택 블록의 개별 줄간격을 해제해 문서 기본을 따르게 한다.
  const setLineSpacing = (v: string) => {
    restore()
    const sel = window.getSelection()
    const collapsed = !sel || sel.isCollapsed
    const flush = (paper: HTMLElement | null) => { if (paper) paper.dispatchEvent(new Event('input', { bubbles: true })) }
    if (v === 'default') { // 블록 개별 줄간격 해제 → 문서 기본 따름
      let paper: HTMLElement | null = null
      for (const b of blocksInSelection()) { b.style.removeProperty('line-height'); paper = editableOf(b) }
      flush(paper); refresh(); return
    }
    const n = Math.max(0.5, Math.min(2, parseFloat(v) || 1))
    if (collapsed) { // 무선택 → 문서 전체 기본 줄간격
      useStore.getState().patchSettings({ editorLineHeight: n })
      refresh(); return
    }
    let paper: HTMLElement | null = null // 선택 범위 → 그 블록들에만 적용
    for (const b of blocksInSelection()) { b.style.lineHeight = String(n); paper = editableOf(b) }
    flush(paper); refresh()
  }

  const ib = (cmd: string, icon: React.ReactNode, title: string) => (
    <button
      className={'fbtn' + (state(cmd) ? ' active' : '')}
      title={title}
      aria-pressed={state(cmd)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(cmd)}
    >
      {icon}
    </button>
  )

  // 캐럿 위치의 현재 글꼴/크기 — 셀렉트가 항상 빈 플레이스홀더('글꼴…')이던 문제 해소(#20 서식바 상태 반영).
  const curInline = (() => {
    try {
      const n = saved.current?.startContainer
      const el = n ? (n.nodeType === 1 ? (n as HTMLElement) : n.parentElement) : null
      if (!el || !el.closest('.paper')) return { font: '', size: '' }
      const cs = getComputedStyle(el)
      const font = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim()
      const px = parseFloat(cs.fontSize || '0')
      return { font, size: px ? String(Math.round((px * 72) / 96)) : '' }
    } catch { return { font: '', size: '' } }
  })()

  return (
    <div className="formatbar">
      <select
        value={['h1', 'h2', 'h3', 'blockquote'].includes(curBlock) ? curBlock : 'p'}
        onMouseDown={() => restore()}
        onChange={(e) => run('formatBlock', e.target.value === 'p' ? 'P' : e.target.value.toUpperCase())}
        title="문단 스타일"
      >
        <option value="p">본문</option>
        <option value="h1">제목 1</option>
        <option value="h2">제목 2</option>
        <option value="h3">제목 3</option>
        <option value="blockquote">인용</option>
      </select>

      <select
        value={FONTS.includes(curInline.font) ? curInline.font : ''}
        onMouseDown={() => restore()}
        onChange={(e) => {
          if (e.target.value) wrapInlineStyle('fontFamily', e.target.value)
        }}
        title="글꼴 — 현재 캐럿 위치의 글꼴이 표시됩니다"
      >
        <option value="">{curInline.font && !FONTS.includes(curInline.font) ? curInline.font : '글꼴…'}</option>
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        value={FONT_SIZES.map(String).includes(curInline.size) ? curInline.size : ''}
        onMouseDown={() => restore()}
        onChange={(e) => {
          if (e.target.value) wrapInlineStyle('fontSize', e.target.value + 'pt')
        }}
        title="글자 크기 — 현재 캐럿 위치의 크기(pt)가 표시됩니다"
      >
        <option value="">{curInline.size && !FONT_SIZES.map(String).includes(curInline.size) ? curInline.size + 'pt' : '크기…'}</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={String(s)}>
            {s}
          </option>
        ))}
      </select>

      <span className="divider" />
      {ib('bold', <Bold size={15} />, '굵게 (Ctrl+B)')}
      {ib('italic', <Italic size={15} />, '기울임 (Ctrl+I)')}
      {ib('underline', <Underline size={15} />, '밑줄 (Ctrl+U)')}
      {ib('strikeThrough', <Strikethrough size={15} />, '취소선')}

      <label className="swatch" title="글자 색" onMouseDown={() => restore()}>
        <span className="bar" style={{ background: '#d11' }} />
        <input type="color" onChange={(e) => run('foreColor', e.target.value)} />
      </label>
      <label className="swatch" title="형광펜" onMouseDown={() => restore()}>
        <Highlighter size={14} style={{ position: 'absolute', top: 4 }} />
        <span className="bar" style={{ background: '#ffe14d' }} />
        <input type="color" defaultValue="#ffe14d" onChange={(e) => setHighlight(e.target.value)} />
      </label>

      <span className="divider" />
      <span className="rev-label" title="리비전 표시 — 선택한 글자를 리비전 색으로 칠해 고친 부분을 추적합니다(원고 교정 추적용). 승인 시 일괄 제거.">
        리비전
      </span>
      {REVISION_COLORS.map((c, i) => (
        <button
          key={c}
          className="rev-swatch"
          style={{ background: c }}
          title={`리비전 ${i + 1} 색으로 표시`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run('foreColor', c)}
        />
      ))}
      <button className="tbtn" title="리비전 색 일괄 제거(승인)" onMouseDown={(e) => e.preventDefault()} onClick={clearRevisions}>
        <Eraser size={14} />
      </button>

      <span className="divider" />
      {ib('justifyLeft', <AlignLeft size={15} />, '왼쪽 정렬')}
      {ib('justifyCenter', <AlignCenter size={15} />, '가운데 정렬')}
      {ib('justifyRight', <AlignRight size={15} />, '오른쪽 정렬')}
      {ib('justifyFull', <AlignJustify size={15} />, '양쪽 정렬')}

      {ib('superscript', <Superscript size={15} />, '위첨자')}
      {ib('subscript', <Subscript size={15} />, '아래첨자')}

      <span className="divider" />
      {ib('insertUnorderedList', <List size={15} />, '글머리 기호')}
      {ib('insertOrderedList', <ListOrdered size={15} />, '번호 매기기')}
      <button className="fbtn" title="들여쓰기 늘리기" onMouseDown={(e) => e.preventDefault()} onClick={() => run('indent')}>
        <IndentIncrease size={15} />
      </button>
      <button className="fbtn" title="들여쓰기 줄이기" onMouseDown={(e) => e.preventDefault()} onClick={() => run('outdent')}>
        <IndentDecrease size={15} />
      </button>

      <select defaultValue="" onMouseDown={() => restore()} onChange={(e) => { if (e.target.value) setLineSpacing(e.target.value); e.currentTarget.value = '' }} title="줄 간격 — 선택 없으면 문서 전체, 글을 선택하면 그 부분에만 적용">
        <option value="">줄간격</option>
        <option value="0.5">0.5</option>
        <option value="0.8">0.8</option>
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="1.75">1.75</option>
        <option value="2">2.0</option>
        <option value="default">문서 기본으로(선택 해제)</option>
      </select>

      <span className="divider" />
      <button
        className="fbtn"
        title="각주 삽입"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertFootnote(false)}
      >
        <StickyNote size={15} />
      </button>
      <button
        className="fbtn"
        title="미주 삽입 (Alt+클릭은 각주)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => insertFootnote(!e.altKey ? true : false)}
        style={{ fontSize: 9 }}
      >
        미주
      </button>
      <button className="fbtn" title="코멘트(주석) 삽입" onMouseDown={(e) => e.preventDefault()} onClick={insertComment}>
        <MessageSquare size={15} />
      </button>
      <button className="fbtn" title="이미지 삽입" onMouseDown={(e) => e.preventDefault()} onClick={insertImage}>
        <ImagePlus size={15} />
      </button>

      <span className="divider" />
      <button className="fbtn" title="링크" onMouseDown={(e) => e.preventDefault()} onClick={makeLink}>
        <Link2 size={15} />
      </button>
      <button className="fbtn" title="서식 지우기" onMouseDown={(e) => e.preventDefault()} onClick={() => run('removeFormat')}>
        <Eraser size={15} />
      </button>
    </div>
  )
}
