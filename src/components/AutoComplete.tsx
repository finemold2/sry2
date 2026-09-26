import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'

// 프로젝트 자동완성 — 에디터(.paper)에서 단어 입력 시 제안 드롭다운.
// 제안 풀: 설정의 자동완성 목록 + 캐릭터 이름 + 키워드.
// 한국어 IME 조합 중에는 동작하지 않아 입력을 방해하지 않는다.
export default function AutoComplete() {
  const project = useStore((s) => s.project)
  const enabled = project.settings.autoComplete !== false

  const pool = useMemo(() => {
    const set = new Set<string>()
    ;(project.settings.autoCompleteList || []).forEach((w) => w.trim() && set.add(w.trim()))
    for (const it of Object.values(project.items)) {
      if (it.type === 'character' && it.character?.name?.trim()) set.add(it.character.name.trim())
    }
    project.keywords.forEach((k) => k.name.trim() && set.add(k.name.trim()))
    return [...set].filter((w) => w.length >= 2)
  }, [project.settings.autoCompleteList, project.items, project.keywords])

  const [state, setState] = useState<{
    matches: string[]
    sel: number
    x: number
    y: number
    partial: string
  } | null>(null)
  const composing = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const poolRef = useRef(pool)
  poolRef.current = pool

  useEffect(() => {
    if (!enabled) {
      setState(null)
      return
    }

    const focusedPaper = (): HTMLElement | null => {
      const el = document.activeElement as HTMLElement | null
      return el && el.classList?.contains('paper') ? el : null
    }

    const hide = () => {
      if (stateRef.current) setState(null)
    }

    const update = () => {
      if (composing.current) return
      const paper = focusedPaper()
      if (!paper) return hide()
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return hide()
      const range = sel.getRangeAt(0)
      const node = range.startContainer
      if (node.nodeType !== 3) return hide()
      const before = (node.textContent || '').slice(0, range.startOffset)
      const m = before.match(/[\p{L}\p{N}]+$/u)
      if (!m) return hide()
      const partial = m[0]
      if (partial.length < 2) return hide()
      const lp = partial.toLowerCase()
      const matches = poolRef.current
        .filter((w) => w.toLowerCase().startsWith(lp) && w.toLowerCase() !== lp)
        .slice(0, 8)
      if (!matches.length) return hide()
      // 캐럿 위치
      let rect = range.getBoundingClientRect()
      if (!rect.height) {
        const pe = node.parentElement
        if (pe) rect = pe.getBoundingClientRect()
      }
      setState({ matches, sel: 0, x: rect.left, y: rect.bottom, partial })
    }

    const accept = (word: string) => {
      const st = stateRef.current
      if (!st) return
      const paper = focusedPaper()
      const sel = window.getSelection()
      if (!paper || !sel || !sel.rangeCount) return setState(null)
      const range = sel.getRangeAt(0)
      const node = range.startContainer
      const offset = range.startOffset
      if (node.nodeType === 3 && offset >= st.partial.length) {
        const r = document.createRange()
        r.setStart(node, offset - st.partial.length)
        r.setEnd(node, offset)
        r.deleteContents()
        const tn = document.createTextNode(word)
        r.insertNode(tn)
        const after = document.createRange()
        after.setStartAfter(tn)
        after.collapse(true)
        sel.removeAllRanges()
        sel.addRange(after)
        paper.dispatchEvent(new Event('input', { bubbles: true }))
      }
      setState(null)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current
      if (!st) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setState({ ...st, sel: (st.sel + 1) % st.matches.length })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setState({ ...st, sel: (st.sel - 1 + st.matches.length) % st.matches.length })
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        accept(st.matches[st.sel])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setState(null)
      }
    }

    const onInput = () => update() // 타이핑 시에만 제안(클릭만으로는 뜨지 않음)
    const onCompStart = () => {
      composing.current = true
    }
    const onCompEnd = () => {
      composing.current = false
      update()
    }
    // 바깥 클릭/포커스 이탈 시 닫기(드롭다운 자체 클릭은 제외)
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest && t.closest('.autocomplete')) return
      hide()
    }
    const onFocusOut = () => setTimeout(() => !focusedPaper() && hide(), 0)

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('input', onInput, true)
    document.addEventListener('compositionstart', onCompStart, true)
    document.addEventListener('compositionend', onCompEnd, true)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('compositionstart', onCompStart, true)
      document.removeEventListener('compositionend', onCompEnd, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('focusout', onFocusOut, true)
    }
  }, [enabled])

  if (!state) return null
  return (
    <div
      className="autocomplete"
      style={{ left: Math.round(state.x), top: Math.round(state.y) + 2 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {state.matches.map((w, i) => (
        <button
          key={w}
          className={'ac-item' + (i === state.sel ? ' sel' : '')}
          onClick={() => {
            // accept 는 effect 내부 클로저 — 간단히 키보드 경로 재사용 대신 직접 처리
            const sel = window.getSelection()
            const paper = document.activeElement as HTMLElement | null
            if (sel && sel.rangeCount && paper?.classList?.contains('paper')) {
              const range = sel.getRangeAt(0)
              const node = range.startContainer
              const offset = range.startOffset
              if (node.nodeType === 3 && offset >= state.partial.length) {
                const r = document.createRange()
                r.setStart(node, offset - state.partial.length)
                r.setEnd(node, offset)
                r.deleteContents()
                const tn = document.createTextNode(w)
                r.insertNode(tn)
                const a = document.createRange()
                a.setStartAfter(tn)
                a.collapse(true)
                sel.removeAllRanges()
                sel.addRange(a)
                paper.dispatchEvent(new Event('input', { bubbles: true }))
              }
            }
            setState(null)
          }}
        >
          {w}
        </button>
      ))}
    </div>
  )
}
