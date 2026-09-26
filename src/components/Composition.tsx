import { useEffect, useRef, useState } from 'react'
import { htmlToRtf, rtfToHtml } from '../rtf'
import { useStore } from '../store/store'
import { Icon } from '../ui/icons'

// 집중 모드의 글자 크기/폭 슬라이더 값을 세션 간 보존(localStorage). 원고/프로젝트 데이터는 건드리지 않아 안전.
const LS_SCALE = 'comp:fontSize'
const LS_WIDTH = 'comp:width'
const DEFAULT_SCALE = 18
const DEFAULT_WIDTH = 740
function readNum(key: string, fallback: number, min: number, max: number): number {
  try {
    const v = Number(localStorage.getItem(key))
    if (Number.isFinite(v) && v >= min && v <= max) return v
  } catch {
    /* localStorage 접근 불가(사생활 모드 등) — 기본값 사용 */
  }
  return fallback
}

// 집중(전체화면) 글쓰기 모드. 단일 텍스트 문서를 어두운 배경 위 종이에서 편집.
// 메인 에디터(DocEditable)와 집필 경험을 일치시킨다: 자동완성(전역 AutoComplete 가 .paper 를 인식),
// [[ 위키 링크, 타자기 스크롤, 타이포그래피(--ed-line/--ed-para-gap) 반영, 미저장 본문 flush.
export default function Composition({ onExit }: { onExit?: () => void } = {}) {
  const activeId = useStore((s) => s.activeId)
  const project = useStore((s) => s.project)
  const setBodyHtml = useStore((s) => s.setBodyHtml)
  const toggleComposition = useStore((s) => s.toggleComposition)
  const typewriter = useStore((s) => s.project.settings.typewriterScrolling)
  const spellCheckOn = useStore((s) => s.project.settings.spellCheck)
  const edParaGap = useStore((s) => s.project.settings.editorParaGap)
  const edLine = useStore((s) => s.project.settings.editorLineHeight)

  const item = activeId ? project.items[activeId] : null
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  // 자기 echo 가드 — 우리가 방금 저장한 RTF 면 외부 동기화로 되덮지 않는다(캐럿/입력 보존, Editor.tsx 와 동일 패턴).
  const lastSavedRtf = useRef<string | null>(null)
  const dirty = useStore((s) => s.dirty)
  const [scale, setScale] = useState(() => readNum(LS_SCALE, DEFAULT_SCALE, 14, 30))
  const [width, setWidth] = useState(() => readNum(LS_WIDTH, DEFAULT_WIDTH, 520, 1000))
  // 현재 창이든 분리된 새 창(팝업)이든 동작하도록 — 전역 window/document 대신 에디터가 '실제로 속한' 문서/창을 쓴다.
  const winOf = (): Window => (ref.current && ref.current.ownerDocument && ref.current.ownerDocument.defaultView) || window
  const docOf = (): Document => (ref.current && ref.current.ownerDocument) || document
  // 나가기 동작: 새 창 모드면 App 이 넘긴 onExit(팝업 닫기), 아니면 in-page 토글.
  const exit = onExit || toggleComposition

  // ── [[ 위키 링크 자동완성 (DocEditable 와 동일 동작) ───────────────────
  // 타이핑은 가로채지 않고(읽기만) '[[질의' 패턴 감지 → 추천 메뉴. 명시 선택 시에만 Range 로 내부 링크 삽입.
  const [linkMenu, setLinkMenu] = useState<{ x: number; y: number; items: { id: string; title: string }[]; sel: number } | null>(null)
  const linkMenuRef = useRef(linkMenu)
  linkMenuRef.current = linkMenu

  // 글자 크기/폭 슬라이더 값 영속(localStorage). 데이터 안전: 원고/프로젝트 상태 미변경.
  useEffect(() => {
    try { localStorage.setItem(LS_SCALE, String(scale)) } catch { /* noop */ }
  }, [scale])
  useEffect(() => {
    try { localStorage.setItem(LS_WIDTH, String(width)) } catch { /* noop */ }
  }, [width])

  useEffect(() => {
    if (ref.current && item) ref.current.innerHTML = rtfToHtml(item.bodyRtf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  // 외부(메인 창 에디터·분할 패널·도구 등)에서 같은 문서가 바뀌면 즉시 반영 — 특히 '새 창' 집중 모드에서
  // 메인 창과 서로의 변경을 못 보고 오래된 내용으로 덮어쓰는 원고 유실을 막는다(데이터 안전).
  // 지금 타이핑 중(포커스)인 에디터는 건드리지 않고, 자기 echo(방금 우리가 저장한 값)도 건너뛴다.
  useEffect(() => {
    const el = ref.current
    if (!el || !item) return
    if (docOf().activeElement === el) return
    if (item.bodyRtf === lastSavedRtf.current) return
    const html = rtfToHtml(item.bodyRtf)
    if (el.innerHTML !== html) el.innerHTML = html
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.bodyRtf])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // 위키 링크 메뉴가 열려 있으면 Esc 는 메뉴만 닫고 집중 모드는 유지(키 충돌 방지).
      if (e.key === 'Escape' && linkMenuRef.current) return
      if (e.key === 'Escape') exit()
    }
    const win = winOf()
    win.addEventListener('keydown', h)
    return () => win.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit])

  const onInput = () => {
    if (!ref.current || !item) return
    if (timer.current) clearTimeout(timer.current)
    const html = ref.current.innerHTML
    // 디바운스를 메인 에디터(Editor.tsx)와 동일한 200ms 로 맞춰 집필 경험·미저장 노출 시간을 일치시킨다.
    timer.current = setTimeout(() => { lastSavedRtf.current = htmlToRtf(html); setBodyHtml(item.id, html) }, 200)
  }
  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    if (ref.current && item) { lastSavedRtf.current = htmlToRtf(ref.current.innerHTML); setBodyHtml(item.id, ref.current.innerHTML) }
  }

  // 데이터 안전: 새로고침/탭전환 직전 App 이 'scriv:flush-editor' 를 쏘면 디바운스 대기 중인
  // 현재 DOM 내용을 즉시 커밋(미저장 입력 유실 방지). Editor.tsx 와 동일 경로.
  useEffect(() => {
    const onFlush = () => {
      if (!ref.current) return
      if (timer.current) clearTimeout(timer.current)
      const st = useStore.getState()
      const cur = st.activeId ? st.project.items[st.activeId] : null
      if (!cur || cur.type !== 'text') return
      lastSavedRtf.current = htmlToRtf(ref.current.innerHTML)
      setBodyHtml(cur.id, ref.current.innerHTML)
    }
    window.addEventListener('scriv:flush-editor', onFlush)
    return () => window.removeEventListener('scriv:flush-editor', onFlush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 언마운트(특히 새 창 닫힘) 직전 미저장 입력을 즉시 커밋 — 데이터 안전 백스톱.
  useEffect(() => {
    return () => {
      try {
        if (!ref.current) return
        const st = useStore.getState()
        const cur = st.activeId ? st.project.items[st.activeId] : null
        if (cur && cur.type === 'text') { lastSavedRtf.current = htmlToRtf(ref.current.innerHTML); setBodyHtml(cur.id, ref.current.innerHTML) }
      } catch { /* 창이 이미 닫히는 중일 수 있음 */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 위키 링크: '[[질의' 패턴 감지 → 추천 메뉴.
  const updateTrigger = () => {
    try {
      const el = ref.current
      const sel = winOf().getSelection()
      if (!el || !item || !sel || !sel.isCollapsed || !sel.rangeCount) { setLinkMenu(null); return }
      const range = sel.getRangeAt(0)
      const node = range.startContainer
      if (!el.contains(node) || node.nodeType !== 3) { setLinkMenu(null); return }
      const before = (node.textContent || '').slice(0, range.startOffset)
      const m = before.match(/\[\[([^[\]\n]{0,40})$/)
      if (!m) { setLinkMenu(null); return }
      const lc = m[1].toLowerCase()
      const proj = useStore.getState().project
      const items = Object.values(proj.items)
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
      const selObj = winOf().getSelection()
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
      const space = document.createTextNode(' ')
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
    const onInputEv = () => updateTrigger()
    el.addEventListener('keyup', onKeyup)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('input', onInputEv)
    return () => { el.removeEventListener('keyup', onKeyup); el.removeEventListener('mouseup', onUp); el.removeEventListener('input', onInputEv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

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
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setLinkMenu(null) }
    }
    el.addEventListener('keydown', onKeydown)
    return () => el.removeEventListener('keydown', onKeydown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  // 타자기 스크롤: 입력/캐럿 이동 시 캐럿 줄을 .composition 스크롤 영역 중앙으로 유지(DocEditable 와 동일 로직).
  useEffect(() => {
    const el = ref.current
    if (!el || !typewriter) return
    const center = (smoothHint: boolean) => {
      const sel = winOf().getSelection()
      if (!sel || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      if (!el.contains(range.startContainer)) return
      const scroller = el.closest('.composition') as HTMLElement | null
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
      if (Math.abs(delta) < sRect.height * 0.15) return
      const big = Math.abs(delta) > sRect.height * 0.35
      if (smoothHint || big) scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' })
      else scroller.scrollTop += delta
    }
    const onInputEv = () => center(false)
    const doc = docOf()
    const onSelChange = () => {
      if (doc.activeElement !== el) return
      center(true)
    }
    el.addEventListener('input', onInputEv)
    doc.addEventListener('selectionchange', onSelChange)
    return () => {
      el.removeEventListener('input', onInputEv)
      doc.removeEventListener('selectionchange', onSelChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, typewriter])

  // 내부 문서 링크(scriv://<id>): Ctrl/Cmd+클릭으로 이동(집중 모드 종료 후 해당 문서 열기). 일반 클릭은 캐럿 배치.
  const onClickPaper = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="scriv://"]') as HTMLAnchorElement | null
    if (!a) return
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    const id = a.getAttribute('href')!.slice('scriv://'.length)
    const st = useStore.getState()
    if (st.project.items[id]) {
      flush()
      st.select(id)
    } else {
      window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '링크 대상 문서를 찾을 수 없습니다(삭제됨).' }))
    }
  }

  // 타이포그래피 변수 반영: .paper p 가 --ed-line/--ed-para-gap 를 사용하므로 paper 클래스 + 인라인 변수로 일치.
  const paperStyle: React.CSSProperties = { fontSize: scale, maxWidth: width }
  // box-shadow:none 으로 .paper:focus 포커스 링(집중 모드엔 불필요)을 무력화 — 기존 외관 유지.
  ;(paperStyle as Record<string, unknown>).boxShadow = 'none'
  if (edParaGap != null) (paperStyle as Record<string, string>)['--ed-para-gap'] = edParaGap + 'em'
  if (edLine != null) (paperStyle as Record<string, string>)['--ed-line'] = String(edLine)
  // 타자기 스크롤 시 마지막 줄도 중앙까지 올라오도록 하단 여백 확보(DocEditable .paper.tw 와 동등).
  if (typewriter) paperStyle.paddingBottom = '45vh'

  return (
    <div className="composition">
      {item && item.type === 'text' ? (
        <div
          className={'comp-paper paper' + (typewriter ? ' tw' : '')}
          contentEditable
          suppressContentEditableWarning
          ref={ref}
          data-doc-id={item.id}
          role="textbox"
          aria-multiline="true"
          aria-label={item.title ? `${item.title} 집중 모드 편집기` : '집중 모드 편집기'}
          onInput={onInput}
          onBlur={() => { setLinkMenu(null); flush() }}
          onClick={onClickPaper}
          spellCheck={!!spellCheckOn}
          style={paperStyle}
        />
      ) : (
        <div className="comp-paper" style={{ opacity: 0.6 }}>
          집중 모드는 단일 텍스트 문서에서 사용할 수 있습니다. 바인더에서 문서를 선택하세요.
        </div>
      )}
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
      <div className="comp-bar">
        <span>집중 모드</span>
        {/* 저장 상태 — 집중 모드에서도 자동저장이 돌고 있음을 보여줘 불안감을 없앤다(#29). */}
        <span className="comp-save" title={dirty ? '변경사항이 있어요 — 잠시 후 자동 저장됩니다.' : '모든 변경이 저장되었습니다.'}
          style={{ fontSize: 11.5, color: dirty ? 'var(--warn, #d97706)' : 'var(--ok, #16a34a)' }}>
          {dirty ? '● 변경됨' : '✓ 저장됨'}
        </span>
        <label>
          글자 크기
          <input type="range" min={14} max={30} value={scale} onChange={(e) => setScale(+e.target.value)} />
        </label>
        <label>
          폭
          <input type="range" min={520} max={1000} value={width} onChange={(e) => setWidth(+e.target.value)} />
        </label>
        <span style={{ flex: 1 }} />
        {item?.type === 'text' && <span>{item.wordCount.toLocaleString()} 단어</span>}
        <button
          className="comp-exit"
          onClick={() => {
            flush()
            exit()
          }}
        >
          나가기 (Esc)
        </button>
      </div>
    </div>
  )
}
