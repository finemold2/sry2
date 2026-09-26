import { useEffect, useRef, useState } from 'react'
import { htmlToRtf, rtfToHtml } from '../rtf'
import { childrenOf, flattenAll, isInTrash, pathOf, useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import FormatBar from './FormatBar'
import MediaViewer from './MediaViewer'
import CharacterEditor from './CharacterEditor'
import { ADVANCE, applyElement, detectElement, ELEMENTS, nextInCycle } from '../script/elements'
import { Icon } from '../ui/icons'

// 캐럿이 위치한 .paper 의 직속 블록 엘리먼트를 찾는다. 없으면 새 <p> 를 만들어 반환(각본 첫 줄/빈 문서 대응).
function currentBlockEl(paper: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return firstOrNewBlock(paper)
  let n: Node | null = sel.getRangeAt(0).startContainer
  // 텍스트 노드면 엘리먼트로 보정
  if (n && n.nodeType === 3) n = n.parentNode
  while (n && n.parentNode && n.parentNode !== paper) n = n.parentNode
  if (n && n.nodeType === 1 && n.parentNode === paper) return n as HTMLElement
  return firstOrNewBlock(paper)
}

function firstOrNewBlock(paper: HTMLElement): HTMLElement | null {
  const first = paper.querySelector(':scope > p, :scope > div, :scope > h1, :scope > h2, :scope > h3, :scope > h4')
  if (first) return first as HTMLElement
  // 블록이 전혀 없으면 새 문단 생성
  const p = document.createElement('p')
  p.appendChild(document.createElement('br'))
  paper.appendChild(p)
  return p
}

// 인스펙터 코멘트/각주 탭에서 '이동' 클릭 시, 해당 문서 본문의 N번째 마커로 스크롤+강조.
function useAnnotationJump() {
  useEffect(() => {
    const onJump = (e: Event) => {
      const { kind, index, itemId } = (e as CustomEvent).detail || {}
      // Scrivenings 에서 여러 문서가 동시에 렌더되므로, 가능하면 해당 문서 .paper 로 범위를 한정한다.
      const scope =
        (itemId && document.querySelector(`.paper[data-doc-id="${itemId}"]`)) ||
        document.querySelector('.editor-scroll')
      if (!scope) return
      const cls = kind === 'comment' ? '.cmt-marker' : '.fn-marker'
      const marks = scope.querySelectorAll(cls)
      const el = marks[index] as HTMLElement | undefined
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ann-flash')
      setTimeout(() => el.classList.remove('ann-flash'), 1200)
    }
    window.addEventListener('scriv:jumpAnnotation', onJump as EventListener)
    return () => window.removeEventListener('scriv:jumpAnnotation', onJump as EventListener)
  }, [])
}

// 단일 문서용 contenteditable. RTF 본문을 로드하고, 편집 시 디바운스로 RTF 저장.
function DocEditable({ item }: { item: BinderItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const setBodyHtml = useStore((s) => s.setBodyHtml)
  const splitDocument = useStore((s) => s.splitDocument)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const typewriter = useStore((s) => s.project.settings.typewriterScrolling)
  const spellCheckOn = useStore((s) => s.project.settings.spellCheck)
  const docTitle = useStore((s) => s.project.items[item.id]?.title)
  const edWidth = useStore((s) => s.project.settings.editorWidth)
  const edParaGap = useStore((s) => s.project.settings.editorParaGap)
  const edLine = useStore((s) => s.project.settings.editorLineHeight)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const latestHtml = useRef<string>('')
  // 우리가 방금 저장한 RTF 를 기억해 외부 동기화 effect 가 자기 echo 를 거르게 한다(blur 후 캐럿/마크업 변형 방지).
  const lastSavedRtf = useRef<string>('')

  // ── [[ 위키 링크 자동완성 ───────────────────────────────────────────
  // 타이핑은 절대 가로채지 않는다(읽기만). '[[질의' 패턴을 감지해 추천 메뉴를 띄우고,
  // 사용자가 명시적으로 선택할 때만 Range 로 내부 링크를 삽입한다(전 구간 try/catch — 실패 시 조용히 닫음).
  const [linkMenu, setLinkMenu] = useState<{ x: number; y: number; items: { id: string; title: string }[]; sel: number } | null>(null)
  const linkMenuRef = useRef(linkMenu)
  linkMenuRef.current = linkMenu

  const updateTrigger = () => {
    try {
      const el = ref.current
      const sel = window.getSelection()
      if (!el || !sel || !sel.isCollapsed || !sel.rangeCount) { setLinkMenu(null); return }
      const range = sel.getRangeAt(0)
      const node = range.startContainer
      if (!el.contains(node) || node.nodeType !== 3) { setLinkMenu(null); return }
      const before = (node.textContent || '').slice(0, range.startOffset)
      const m = before.match(/\[\[([^[\]\n]{0,40})$/)
      if (!m) { setLinkMenu(null); return }
      const lc = m[1].toLowerCase()
      const project = useStore.getState().project
      const items = Object.values(project.items)
        .filter((it) => !it.root && it.type !== 'image' && it.type !== 'pdf' && it.type !== 'file' && it.id !== item.id)
        .filter((it) => !lc || (it.title || '').toLowerCase().includes(lc))
        .slice(0, 8)
        .map((it) => ({ id: it.id, title: it.title || '(제목 없음)' }))
      if (items.length === 0) { setLinkMenu(null); return }
      const rect = range.getBoundingClientRect()
      setLinkMenu({ x: rect.left || 0, y: rect.bottom || rect.top || 0, items, sel: 0 })
    } catch { setLinkMenu(null) }
  }

  const insertLink = (target: { id: string; title: string }) => {
    try {
      const el = ref.current
      const selObj = window.getSelection()
      if (!el || !selObj || !selObj.rangeCount) { setLinkMenu(null); return }
      const range = selObj.getRangeAt(0)
      const node = range.startContainer
      if (node.nodeType !== 3) { setLinkMenu(null); return }
      const offset = range.startOffset
      const before = (node.textContent || '').slice(0, offset)
      const m = before.match(/\[\[([^[\]\n]{0,40})$/)
      if (!m) { setLinkMenu(null); return }
      const del = document.createRange()
      del.setStart(node, offset - m[0].length)
      del.setEnd(node, offset)
      del.deleteContents()
      const a = document.createElement('a')
      a.setAttribute('href', 'scriv://' + target.id)
      a.textContent = target.title
      const space = document.createTextNode(' ')
      del.insertNode(space)
      del.insertNode(a)
      const after = document.createRange()
      after.setStartAfter(space)
      after.collapse(true)
      selObj.removeAllRanges()
      selObj.addRange(after)
      setLinkMenu(null)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    } catch { setLinkMenu(null) }
  }

  // 트리거 감지: 타이핑/클릭 후(네비게이션 키 제외 — 메뉴 조작과 충돌 방지).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKeyup = (e: KeyboardEvent) => { if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return; updateTrigger() }
    const onUp = () => updateTrigger()
    const onInput = () => updateTrigger()
    el.addEventListener('keyup', onKeyup)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('input', onInput)
    return () => { el.removeEventListener('keyup', onKeyup); el.removeEventListener('mouseup', onUp); el.removeEventListener('input', onInput) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 메뉴가 열렸을 때만 네비게이션 키를 가로챈다(닫혀 있으면 일반 타이핑 그대로).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKeydown = (e: KeyboardEvent) => {
      const menu = linkMenuRef.current
      if (!menu) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setLinkMenu((mm) => (mm ? { ...mm, sel: Math.min(mm.items.length - 1, mm.sel + 1) } : mm)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setLinkMenu((mm) => (mm ? { ...mm, sel: Math.max(0, mm.sel - 1) } : mm)) }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertLink(menu.items[menu.sel] || menu.items[0]) }
      else if (e.key === 'Escape') { e.preventDefault(); setLinkMenu(null) }
    }
    el.addEventListener('keydown', onKeydown)
    return () => el.removeEventListener('keydown', onKeydown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 타자기 스크롤: 입력/캐럿 이동 시 캐럿 줄을 스크롤 영역 중앙으로 유지.
  // 입력만 보정하면 클릭/방향키로 캐럿을 옮긴 뒤 첫 입력에서 화면이 크게 튀므로,
  // selectionchange(캐럿 이동)에도 부드럽게 따라가고, 큰 점프는 smooth 로 완화한다.
  useEffect(() => {
    const el = ref.current
    if (!el || !typewriter) return
    const center = (smoothHint: boolean) => {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      if (!el.contains(range.startContainer)) return
      const scroller = el.closest('.editor-scroll') as HTMLElement | null
      if (!scroller) return
      let rect = range.getBoundingClientRect()
      if (!rect.height) {
        const node =
          range.startContainer.nodeType === 1
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement
        if (node) rect = node.getBoundingClientRect()
      }
      if (!rect.height) return
      const sRect = scroller.getBoundingClientRect()
      const delta = rect.top + rect.height / 2 - (sRect.top + sRect.height / 2)
      // 데드존: 캐럿이 중앙 ±15% 밴드 안이면 보정 생략(미세 점프 제거)
      if (Math.abs(delta) < sRect.height * 0.15) return
      // 점프 폭이 크면(또는 캐럿 이동에 의한 보정이면) smooth 로 완화, 작은 입력 보정은 즉시.
      const big = Math.abs(delta) > sRect.height * 0.35
      if (smoothHint || big) scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' })
      else scroller.scrollTop += delta
    }
    const onInput = () => center(false)
    // 캐럿 이동(클릭/방향키/선택)은 부드럽게 보정 — 이 에디터에 포커스가 있을 때만 반응.
    const onSelChange = () => {
      if (document.activeElement !== el) return
      center(true)
    }
    el.addEventListener('input', onInput)
    document.addEventListener('selectionchange', onSelChange)
    return () => {
      el.removeEventListener('input', onInput)
      document.removeEventListener('selectionchange', onSelChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, typewriter])

  // 내부 문서 링크(scriv://<id>): Ctrl/Cmd+클릭으로 이동(일반 클릭은 캐럿 배치 — 편집 가능)
  const onClickPaper = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="scriv://"]') as HTMLAnchorElement | null
    if (!a) return
    if (!(e.ctrlKey || e.metaKey)) return // 일반 클릭은 편집을 위해 통과
    e.preventDefault()
    const id = a.getAttribute('href')!.slice('scriv://'.length)
    if (useStore.getState().project.items[id]) {
      select(id)
      setView('editor')
    } else {
      window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '링크 대상 문서를 찾을 수 없습니다(삭제됨).' }))
    }
  }

  // 캐럿 위치에서 문서 분할 (Documents > Split, 또는 명령 팔레트)
  useEffect(() => {
    const onSplit = () => {
      const el = ref.current
      if (!el || document.activeElement !== el) return
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      const caret = sel.getRangeAt(0)
      const beforeR = document.createRange()
      beforeR.setStart(el, 0)
      beforeR.setEnd(caret.startContainer, caret.startOffset)
      const afterR = document.createRange()
      afterR.setStart(caret.endContainer, caret.endOffset)
      afterR.setEnd(el, el.childNodes.length)
      const bDiv = document.createElement('div')
      bDiv.appendChild(beforeR.cloneContents())
      const aDiv = document.createElement('div')
      aDiv.appendChild(afterR.cloneContents())
      splitDocument(item.id, bDiv.innerHTML, aDiv.innerHTML)
    }
    window.addEventListener('scriv:split', onSplit)
    return () => window.removeEventListener('scriv:split', onSplit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 본문 로드 (문서 전환 시 1회)
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = rtfToHtml(item.bodyRtf)
      latestHtml.current = ref.current.innerHTML
      // 빈 문서를 열면 바로 쓸 수 있게 에디터에 포커스+캐럿(#23 첫 문장 마찰 제거).
      //  다른 입력(제목 편집 등)에 포커스가 있으면 빼앗지 않는다.
      const el = ref.current
      if ((el.textContent || '').trim() === '' && (document.activeElement === document.body || document.activeElement === null)) {
        try {
          el.focus({ preventScroll: true })
          const p = el.querySelector('p')
          if (p) { const r = document.createRange(); r.selectNodeContents(p); r.collapse(true); const s = window.getSelection(); if (s) { s.removeAllRanges(); s.addRange(r) } }
        } catch { /* noop */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 외부(분할 패널·도구·다른 탭 등)에서 같은 문서 본문이 바뀌면 즉시 반영.
  // 단, 지금 타이핑 중인(포커스된) 에디터는 건드리지 않아 커서/입력이 깨지지 않게 한다.
  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    // 우리가 방금 저장한 값이면(자기 echo) 비포커스 정규화 교체를 건너뛴다 — 캐럿/마크업 변형 방지.
    if (item.bodyRtf === lastSavedRtf.current) return
    const html = rtfToHtml(item.bodyRtf)
    if (el.innerHTML !== html) {
      el.innerHTML = html
      latestHtml.current = html
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.bodyRtf])

  // 언마운트 시 마지막 변경 저장(안전망). 저장 기준은 현재 저장값과 비교 + 아이템 존재 확인.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      const cur = ref.current?.innerHTML
      if (cur == null) return
      const st = useStore.getState()
      const existing = st.project.items[item.id]
      if (!existing) return // 삭제된 문서면 유령 저장 방지
      // 마운트 시점 클로저값이 아니라 "현재 저장값"과 비교(불필요한 재저장/집필량 과대집계 방지)
      if (cur !== rtfToHtml(existing.bodyRtf)) {
        lastSavedRtf.current = htmlToRtf(cur) // 자기 echo 가드용 — 저장하는 RTF 를 기억
        setBodyHtml(item.id, cur)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 네이티브 'input' 리스너 — 타이핑뿐 아니라 포맷바의 프로그램적 변경(줄간격 등 합성 이벤트)도 저장.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onInput = () => {
      latestHtml.current = el.innerHTML
      if (timer.current) clearTimeout(timer.current)
      const html = latestHtml.current
      timer.current = setTimeout(() => {
        lastSavedRtf.current = htmlToRtf(html) // 자기 echo 가드용 — 저장하는 RTF 를 기억
        setBodyHtml(item.id, html)
      }, 200)
    }
    el.addEventListener('input', onInput)
    return () => el.removeEventListener('input', onInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // 각본 모드: Tab 으로 요소 순환, Enter 로 다음 요소 자동 전환.
  useEffect(() => {
    const el = ref.current
    if (!el || !item.scriptMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const block = currentBlockEl(el)
        if (!block) return
        const cur = detectElement(block)
        applyElement(block, nextInCycle(cur, e.shiftKey ? -1 : 1))
        el.dispatchEvent(new Event('input', { bubbles: true }))
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const block = currentBlockEl(el)
        const prev = block ? detectElement(block) : 'action'
        // 기본 Enter 동작 후 새 블록에 다음 요소 적용
        setTimeout(() => {
          const nb = currentBlockEl(el)
          if (nb && nb !== block) {
            applyElement(nb, ADVANCE[prev])
            el.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }, 0)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.scriptMode])

  const onBlur = () => {
    setLinkMenu(null)
    if (timer.current) clearTimeout(timer.current)
    if (ref.current) {
      const html = ref.current.innerHTML
      lastSavedRtf.current = htmlToRtf(html) // 자기 echo 가드용 — 저장하는 RTF 를 기억
      setBodyHtml(item.id, html)
    }
  }

  // 본문에 이미지 파일을 끌어다 놓거나 붙여넣으면 인라인 이미지로 삽입(data URL → 본문 \pict 왕복).
  // FormatBar 의 '이미지 삽입'과 동일 경로(입력 일원화) — 큰 이미지는 폭 100% 로 제한해 레이아웃 보호.
  const insertImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 40 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '이미지가 너무 큽니다(최대 40MB).' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl.startsWith('data:image/')) return
      const el = ref.current
      if (!el) return
      const img = document.createElement('img')
      img.src = dataUrl
      img.style.maxWidth = '100%'
      // 캐럿(현재 선택)이 본문 안이면 그 위치에, 아니면 본문 끝에 삽입.
      const sel = window.getSelection()
      let inserted = false
      if (sel && sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer)) {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        range.setStartAfter(img)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        inserted = true
      }
      if (!inserted) el.appendChild(img)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    reader.readAsDataURL(file)
  }

  const onPaperPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files
    if (!files || files.length === 0) return
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return // 이미지가 아니면 기본(텍스트) 붙여넣기 그대로
    e.preventDefault()
    imgs.forEach(insertImageFile)
  }

  const onPaperDragOver = (e: React.DragEvent) => {
    // 이미지 파일 드래그일 때만 드롭을 허용(텍스트/바인더 항목 드래그는 기본 동작 유지).
    if (e.dataTransfer && Array.from(e.dataTransfer.items || []).some((it) => it.kind === 'file' && it.type.startsWith('image/'))) {
      e.preventDefault()
    }
  }

  const onPaperDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    e.preventDefault()
    // 드롭 지점에 캐럿을 두면 사용자가 의도한 위치에 삽입된다(지원 브라우저 한정, 미지원 시 본문 끝).
    try {
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
      const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY)
      if (r && ref.current?.contains(r.startContainer)) {
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
    } catch { /* noop — 캐럿 배치 실패해도 본문 끝 삽입으로 폴백 */ }
    imgs.forEach(insertImageFile)
  }

  // 데이터 안전: 새로고침/탭닫기 직전 App 이 'scriv:flush-editor' 를 쏘면, 디바운스 대기 중인
  // 현재 DOM 내용을 즉시 스토어에 커밋(미저장 입력 유실 방지).
  useEffect(() => {
    const flush = () => {
      const el = ref.current
      if (!el) return
      if (timer.current) clearTimeout(timer.current)
      const html = el.innerHTML
      lastSavedRtf.current = htmlToRtf(html)
      setBodyHtml(item.id, html)
    }
    window.addEventListener('scriv:flush-editor', flush)
    return () => window.removeEventListener('scriv:flush-editor', flush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const typoStyle: React.CSSProperties = {}
  if (edWidth && edWidth > 0) typoStyle.maxWidth = edWidth
  if (edParaGap != null) (typoStyle as Record<string, string>)['--ed-para-gap'] = edParaGap + 'em'
  if (edLine != null) (typoStyle as Record<string, string>)['--ed-line'] = String(edLine)

  return (
    <>
      <div
        className={'paper' + (item.scriptMode ? ' script-mode' : '') + (typewriter ? ' tw' : '')}
        contentEditable
        suppressContentEditableWarning
        ref={ref}
        data-doc-id={item.id}
        style={typoStyle}
        role="textbox"
        aria-multiline="true"
        aria-label={docTitle ? `${docTitle} 본문 편집기` : '본문 편집기'}
        onBlur={onBlur}
        onClick={onClickPaper}
        onPaste={onPaperPaste}
        onDragOver={onPaperDragOver}
        onDrop={onPaperDrop}
        spellCheck={!!spellCheckOn}
      />
      {linkMenu && (
        <div className="wikilink-pop" style={{ position: 'fixed', left: linkMenu.x, top: linkMenu.y + 4, zIndex: 9000 }} role="listbox">
          {linkMenu.items.map((it, i) => (
            <div
              key={it.id}
              className={'wikilink-item' + (i === linkMenu.sel ? ' sel' : '')}
              role="option"
              aria-selected={i === linkMenu.sel}
              onMouseDown={(e) => { e.preventDefault(); insertLink(it) }}
              onMouseEnter={() => setLinkMenu((mm) => (mm ? { ...mm, sel: i } : mm))}
            >
              <span className="wikilink-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Icon name="link" size={14} /></span>{it.title}
            </div>
          ))}
          <div className="wikilink-hint">Enter 삽입 · Esc 닫기 · [[ 문서명</div>
        </div>
      )}
    </>
  )
}

function ScriptLegend() {
  return (
    <div className="script-legend">
      <span style={{ fontWeight: 600 }}>각본 모드</span>
      {Object.values(ELEMENTS).map((d) => (
        <span key={d.key} className="se-chip">
          {d.label}
        </span>
      ))}
      <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>Tab: 요소 순환 · Enter: 다음 요소</span>
    </div>
  )
}

// 한 패널의 본문(서식 바 제외) — 타입별 적절한 에디터.
function PaneContent({ item }: { item: BinderItem }) {
  if (item.type === 'image' || item.type === 'pdf' || item.type === 'file') return <MediaViewer item={item} />
  if (item.type === 'character') return <CharacterEditor item={item} />
  if (item.type === 'folder') return <ScrivBody folder={item} />
  return (
    <>
      {item.scriptMode && <ScriptLegend />}
      <div className="editor-scroll">
        <DocEditable key={item.id} item={item} />
      </div>
    </>
  )
}

function SingleEditor({ item }: { item: BinderItem }) {
  return (
    <>
      <FormatBar />
      <PaneContent item={item} />
    </>
  )
}

// 분할 보조 패널: 문서 선택 드롭다운 + 닫기.
function SecondaryPane() {
  const project = useStore((s) => s.project)
  const splitId = useStore((s) => s.splitId)
  const activeId = useStore((s) => s.activeId)
  const setSplit = useStore((s) => s.setSplit)
  const toggleSplit = useStore((s) => s.toggleSplit)
  const item = splitId ? project.items[splitId] : null
  // 데이터 안전: activeId 와 동일한 문서를 보조 패널에 띄우면 같은 문서를 두 contenteditable 이
  // 동시에 저장해 본문이 손상될 수 있으므로 동일 id 선택은 무시한다.
  const onSelect = (v: string) => {
    const id = v || null
    if (id && id === activeId) return // 같은 문서면 무시(중복 편집 차단)
    setSplit(id)
  }
  const sameAsActive = !!splitId && splitId === activeId
  // 선택 목록: 텍스트/폴더 + 비휴지통만, 바인더 순서(DFS)대로 정렬.
  const docs = flattenAll(project)
    .map((id) => project.items[id])
    .filter((i): i is BinderItem => !!i && !i.root && (i.type === 'text' || i.type === 'folder') && !isInTrash(project, i.id))
  return (
    <div className="epane secondary">
      <div className="epane-bar">
        <select className="field" value={splitId || ''} onChange={(e) => onSelect(e.target.value)}>
          <option value="">(문서 선택)</option>
          {docs.map((d) => (
            <option key={d.id} value={d.id} disabled={d.id === activeId}>
              {d.title}
            </option>
          ))}
        </select>
        <button className="minibtn" style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center' }} onClick={toggleSplit} title="분할 닫기" aria-label="분할 닫기">
          <Icon name="close" size={13} />
        </button>
      </div>
      {sameAsActive ? (
        <div className="empty-hint">이미 왼쪽(주 패널)에서 편집 중인 문서입니다. 다른 문서를 선택하세요.</div>
      ) : item ? (
        <PaneContent item={item} />
      ) : (
        <div className="empty-hint">위에서 문서를 선택하세요.</div>
      )}
    </div>
  )
}

// Scrivenings: 폴더 선택 시 하위 텍스트 문서를 연속으로 편집.
function gatherText(folder: BinderItem, project: Project): BinderItem[] {
  const out: BinderItem[] = []
  const walk = (it: BinderItem) => {
    if (it.type === 'text') out.push(it)
    childrenOf(project, it.id).forEach(walk)
  }
  childrenOf(project, folder.id).forEach(walk)
  return out
}

function ScrivBody({ folder }: { folder: BinderItem }) {
  const project = useStore((s) => s.project)
  const docs = gatherText(folder, project)
  return (
    <div className="editor-scroll">
      {docs.length === 0 && <div className="empty-hint">이 폴더에 텍스트 문서가 없습니다.</div>}
      {docs.map((d, i) => (
        <div className="scriv-doc" key={d.id}>
          {i > 0 && <div className="scriv-divider" />}
          <div className="scriv-titlebar">{d.title}</div>
          <DocEditable item={d} />
        </div>
      ))}
    </div>
  )
}

// 문서 미선택 안내 — '+ 새 글' 실제 버튼 포함(코르크보드 빈 상태와 톤 통일).
function NoDocHint() {
  const addItem = useStore((s) => s.addItem)
  const project = useStore((s) => s.project)
  const onNew = () => {
    // 자료 루트를 하드코딩하지 않고 실제 원고(draft) 루트를 조회(외부 import 프로젝트 호환), 없으면 'root-draft' 폴백.
    const draftRoot = Object.values(project.items).find((i) => i.root === 'draft')?.id || 'root-draft'
    addItem('text', draftRoot)
  }
  return (
    <div className="empty-hint">
      왼쪽 바인더에서 문서를 선택하거나 새로 만드세요.
      <div style={{ marginTop: 10 }}>
        <button className="btn-ghost" onClick={onNew}>＋ 새 글</button>
      </div>
    </div>
  )
}

export default function Editor() {
  const activeId = useStore((s) => s.activeId)
  const project = useStore((s) => s.project)
  const splitId = useStore((s) => s.splitId)
  const splitDir = useStore((s) => s.splitDir)
  const item = activeId ? project.items[activeId] : null
  useAnnotationJump()

  if (!item && !splitId) return <NoDocHint />

  // 분할 모드: 서식 바(공유) + 좌/상 = 활성 문서, 우/하 = 보조 문서
  if (splitId) {
    // 활성(주) 패널이 미디어(image/pdf/file)면 서식 바가 가리킬 본문이 없어 죽은 버튼이 되므로 숨긴다(단일 모드와 동작 일치).
    const activeIsMedia = !!item && (item.type === 'image' || item.type === 'pdf' || item.type === 'file')
    return (
      <>
        {!activeIsMedia && <FormatBar />}
        <div className={'editor-split ' + (splitDir === 'horizontal' ? 'horizontal' : 'vertical')}>
          <div className="epane">{item ? <PaneContent item={item} /> : <div className="empty-hint">문서를 선택하세요.</div>}</div>
          <SecondaryPane />
        </div>
      </>
    )
  }

  if (!item) return <NoDocHint />
  if (item.type === 'image' || item.type === 'pdf' || item.type === 'file') return <MediaViewer item={item} />
  if (item.type === 'character') return <CharacterEditor item={item} />
  // 텍스트/폴더(Scrivenings): 서식 바 + 본문
  return <SingleEditor item={item} />
}
