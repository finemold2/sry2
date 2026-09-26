import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * 모달 접근성 훅: ESC 로 닫기, 포커스 트랩(Tab 순환), 초기 포커스, 닫힐 때 이전 포커스 복원.
 * 반환된 ref 를 모달 컨테이너(.modal/.cmd-palette)에 붙이고 role="dialog" aria-modal 을 함께 지정한다.
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  // onClose 는 매 렌더 새로 생성될 수 있으므로 ref 로 최신값 유지(effect 재바인딩 방지)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const el = ref.current

    // 초기 포커스: Tab 순환과 동일한 가시성 필터(offsetParent)를 적용해
    // display:none 등 숨김 요소에 포커스가 무시되는 문제를 막는다. 없으면 컨테이너로 폴백.
    if (el) {
      const first = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      )[0]
      if (first) first.focus()
      else {
        el.setAttribute('tabindex', '-1')
        el.focus()
      }
    }

    const onKey = (e: KeyboardEvent) => {
      // IME 한글/일어 등 조합 중에는 ESC 가 조합취소용이므로 모달을 닫지 않는다
      if (e.isComposing || e.keyCode === 229) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key === 'Tab' && el) {
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null || n === document.activeElement,
        )
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        const active = document.activeElement as HTMLElement
        if (e.shiftKey && (active === firstEl || !el.contains(active))) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    // capture 대신 버블 단계로 등록: IME 조합 이벤트가 먼저 처리되도록 함
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // 닫힐 때 트리거로 포커스 복원: 포커스가 (a) 사라졌거나(body/null/DOM 분리) (b) 닫히는 모달 안에 있었던
      // 경우에만 복원한다. 사용자가 다른 위젯(스크래치패드 등 연결된 외부 요소)으로 포커스를 옮겼으면 복원을
      // 건너뛰어 포커스를 빼앗지 않는다. (passive cleanup 시점엔 모달이 이미 분리됐을 수 있어 'body 로 떨어짐'을 기본 복원 케이스로 본다)
      const cur = ref.current
      const active = document.activeElement as HTMLElement | null
      const focusLostOrInModal =
        !active || active === document.body || !document.contains(active) || (cur != null && cur.contains(active))
      if (focusLostOrInModal && prevFocus && document.contains(prevFocus) && typeof prevFocus.focus === 'function') {
        prevFocus.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
