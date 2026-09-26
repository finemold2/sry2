import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useStore } from '../store/store'

function getEditor(): HTMLElement | null {
  const a = document.activeElement as HTMLElement | null
  if (a && a.classList && a.classList.contains('paper')) return a
  return document.querySelector('.paper')
}

// 텍스트 노드가 각주/코멘트 마커(.fn-marker / .cmt-marker, contenteditable=false) 내부인지 검사.
// 마커 안의 텍스트([1], ❝ 등)는 찾기·바꾸기 대상에서 제외해 서식/마커가 깨지지 않도록 한다.
function isInsideMarker(node: Node, root: HTMLElement): boolean {
  let el: Node | null = node
  while (el && el !== root) {
    if (el.nodeType === 1) {
      const cl = (el as HTMLElement).classList
      if (cl && (cl.contains('fn-marker') || cl.contains('cmt-marker'))) return true
    }
    el = el.parentNode
  }
  return false
}

function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const out: Text[] = []
  let n = walker.nextNode()
  while (n) {
    // 마커 내부 텍스트 노드는 건너뛴다(매치/치환 대상에서 제외).
    if (!isInsideMarker(n, root)) out.push(n as Text)
    n = walker.nextNode()
  }
  return out
}

// 영문·숫자(ASCII 단어 문자) 경계인지 검사. 한글 등 비-ASCII 경계는 모호하므로 항상 경계로 간주(매치 허용).
function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch)
}

function findRanges(
  root: HTMLElement,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): Range[] {
  if (!query) return []
  const nodes = textNodes(root)
  const map: { node: Text; start: number; len: number }[] = []
  let full = ''
  for (const node of nodes) {
    const v = node.nodeValue || ''
    map.push({ node, start: full.length, len: v.length })
    full += v
  }
  const hay = caseSensitive ? full : full.toLowerCase()
  const needle = caseSensitive ? query : query.toLowerCase()
  const locate = (pos: number) => {
    for (const m of map) if (pos <= m.start + m.len) return { node: m.node, offset: pos - m.start }
    const last = map[map.length - 1]
    return last ? { node: last.node, offset: last.len } : null
  }
  // 단어 단위: 매치 양끝의 문자가 모두 ASCII 단어 문자인 경우만 경계 위반으로 제외.
  const boundaryOk = (idx: number) => {
    if (!wholeWord) return true
    const before = idx > 0 ? hay[idx - 1] : ''
    const after = idx + needle.length < hay.length ? hay[idx + needle.length] : ''
    const firstIsWord = isWordChar(needle[0])
    const lastIsWord = isWordChar(needle[needle.length - 1])
    if (firstIsWord && before && isWordChar(before)) return false
    if (lastIsWord && after && isWordChar(after)) return false
    return true
  }
  const ranges: Range[] = []
  let idx = hay.indexOf(needle)
  let guard = 0
  while (idx >= 0 && guard++ < 100000) {
    if (boundaryOk(idx)) {
      const s = locate(idx)
      const e = locate(idx + needle.length)
      if (s && e) {
        const r = document.createRange()
        try {
          r.setStart(s.node, s.offset)
          r.setEnd(e.node, e.offset)
          ranges.push(r)
        } catch {
          /* skip */
        }
      }
    }
    idx = hay.indexOf(needle, idx + needle.length)
  }
  return ranges
}

export default function FindReplaceBar({ onClose }: { onClose: () => void }) {
  const viewMode = useStore((s) => s.viewMode)
  const editorActive = viewMode === 'editor'
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [count, setCount] = useState(0)
  const [cur, setCur] = useState(0)
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // 바가 열리기 직전 포커스(보통 에디터 캐럿). 닫을 때 이 요소로 포커스를 복원해 키보드 흐름을 잇는다.
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
  }, [])

  // 닫을 때 직전 포커스(에디터 캐럿)를 복원. 비-에디터 뷰 등 복원 대상이 사라졌으면 조용히 패스.
  const close = () => {
    const prev = prevFocus.current
    onClose()
    if (prev && document.contains(prev)) {
      try {
        prev.focus()
      } catch {
        /* ignore */
      }
    }
  }

  const recount = () => {
    const ed = getEditor()
    if (!editorActive || !ed || !find) {
      setCount(0)
      return []
    }
    const r = findRanges(ed, find, caseSensitive, wholeWord)
    setCount(r.length)
    return r
  }

  useEffect(() => {
    setCur(0)
    setStatus('')
    recount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [find, caseSensitive, wholeWord, editorActive])

  const selectMatch = (ranges: Range[], i: number) => {
    if (!ranges.length) return
    const idx = ((i % ranges.length) + ranges.length) % ranges.length
    const r = ranges[idx]
    const ed = getEditor()
    // 에디터에 포커스를 둔 상태로 selection 을 설정해 ⌘G/Enter 반복 시 선택이 유지되도록 한다.
    ed?.focus()
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
    const el = r.startContainer.parentElement
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setCur(idx)
  }

  const go = (dir: 1 | -1) => {
    if (!editorActive) return
    const ranges = recount()
    if (!ranges.length) {
      setStatus(find ? '결과 없음' : '')
      return
    }
    setStatus('')
    selectMatch(ranges, cur + dir)
  }

  const doReplace = () => {
    if (!editorActive) return
    const sel = window.getSelection()
    const text = sel?.toString() || ''
    const matchSel = caseSensitive ? text === find : text.toLowerCase() === find.toLowerCase()
    if (sel && sel.rangeCount && matchSel) {
      document.execCommand('insertText', false, replace)
      setStatus('1곳을 바꿨습니다.')
    }
    setTimeout(() => go(1), 0)
  }

  const doReplaceAll = () => {
    if (!editorActive) return
    const ed = getEditor()
    if (!ed || !find) return
    const ranges = findRanges(ed, find, caseSensitive, wholeWord)
    if (!ranges.length) {
      setStatus('결과 없음')
      return
    }
    // 문서 내 '모두 바꾸기'는 되돌리기가 번거로울 수 있으므로 실행 전 확인.
    if (!window.confirm(`${ranges.length}곳을 모두 바꿉니다. 계속할까요?`)) return
    let n = 0
    // 뒤에서부터 치환해 오프셋 안정성 확보. 마커 내부 매치는 findRanges 에서 이미 제외됨.
    for (let i = ranges.length - 1; i >= 0; i--) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(ranges[i])
      document.execCommand('insertText', false, replace)
      n++
    }
    setCount(0)
    setTimeout(recount, 0)
    setStatus(`${n}곳을 바꿨습니다.`)
  }

  return (
    <div className="findbar" role="search" aria-label="문서 내 찾기·바꾸기">
      <input
        ref={inputRef}
        placeholder="찾기"
        aria-label="찾을 내용"
        value={find}
        disabled={!editorActive}
        onChange={(e) => setFind(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go(e.shiftKey ? -1 : 1)
          if (e.key === 'Escape') close()
        }}
      />
      <span className="find-count" aria-live="polite">
        {editorActive ? (count ? `${cur + 1}/${count}` : '0') : '—'}
      </span>
      <button className="minibtn" onClick={() => go(-1)} disabled={!editorActive} title="이전" aria-label="이전 결과">
        <ChevronUp size={13} />
      </button>
      <button className="minibtn" onClick={() => go(1)} disabled={!editorActive} title="다음" aria-label="다음 결과">
        <ChevronDown size={13} />
      </button>
      <input
        placeholder="바꾸기"
        aria-label="바꿀 내용"
        value={replace}
        disabled={!editorActive}
        onChange={(e) => setReplace(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') doReplace()
          if (e.key === 'Escape') close()
        }}
      />
      <button className="minibtn" onClick={doReplace} disabled={!editorActive}>
        바꾸기
      </button>
      <button className="minibtn" onClick={doReplaceAll} disabled={!editorActive}>
        모두
      </button>
      <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }} title="대소문자 구분">
        <input
          type="checkbox"
          checked={caseSensitive}
          disabled={!editorActive}
          onChange={(e) => setCaseSensitive(e.target.checked)}
        />{' '}
        Aa
      </label>
      <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }} title="온전한 단어(영문·숫자 경계)">
        <input
          type="checkbox"
          checked={wholeWord}
          disabled={!editorActive}
          onChange={(e) => setWholeWord(e.target.checked)}
        />{' '}
        단어
      </label>
      {!editorActive ? (
        <span className="find-count" style={{ minWidth: 0, color: 'var(--muted)' }}>
          에디터에서만 사용 가능
        </span>
      ) : (
        status && (
          <span className="find-count" style={{ minWidth: 0 }} role="status" aria-live="polite">
            {status}
          </span>
        )
      )}
      <button className="minibtn" onClick={close} title="닫기" aria-label="찾기 닫기" style={{ marginLeft: 'auto' }}>
        <X size={13} />
      </button>
    </div>
  )
}
