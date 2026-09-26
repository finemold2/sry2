// 도구 창을 브라우저 밖(별도 OS 창)으로 분리 — 다중 모니터에서 메인 창으로 글 쓰며 도구를 다른 모니터에 띄우기.
// window.open 으로 같은 출처(same-origin) 팝업을 열고, 그 문서에 별도 React 루트(createRoot)로 children 을 렌더한다.
//   · 같은 JS 실행 컨텍스트라 zustand 스토어·linkbus·localStorage 가 그대로 공유된다(상태 동기화 자동).
//   · createPortal 은 다른 창에서 합성 이벤트가 전달되지 않는 문제가 있어 별도 루트를 쓴다.
//   · 앱 스타일시트/폰트를 팝업 문서로 복제하고, 테마(data-theme)는 변경까지 동기화한다.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

export default function PortalWindow({
  title,
  width = 460,
  height = 620,
  onClose,
  children,
  fullscreen = false,
}: {
  title: string
  width?: number
  height?: number
  onClose: () => void
  children: ReactNode
  /** 새 창을 화면 가득(가능하면 브라우저 전체화면)으로 연다. */
  fullscreen?: boolean
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const winRef = useRef<Window | null>(null)
  const rootRef = useRef<Root | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // 팝업 창 열기 + 문서 골격/스타일/테마 세팅 (마운트 1회)
  useEffect(() => {
    let w: Window | null = null
    try {
      const feat = fullscreen
        ? `popup=yes,left=0,top=0,width=${Math.round(width)},height=${Math.round(height)}`
        : `popup=yes,width=${Math.round(width)},height=${Math.round(height)}`
      w = window.open('', '', feat)
    } catch { w = null }
    if (!w) {
      try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: '팝업이 차단되어 분리할 수 없어요. 브라우저에서 이 사이트의 팝업을 허용해 주세요.' })) } catch { /* noop */ }
      onCloseRef.current()
      return
    }
    winRef.current = w
    const d = w.document
    try {
      d.title = title
      d.documentElement.lang = 'ko'
      d.body.style.margin = '0'
      d.body.style.height = '100vh'
      d.body.style.overflow = 'hidden'
      // 앱 스타일/폰트 복제
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
        try { d.head.appendChild(n.cloneNode(true)) } catch { /* noop */ }
      })
    } catch { /* noop */ }
    // 테마 동기화(초기 + data-theme 변경 감시)
    const syncTheme = () => { try { d.documentElement.dataset.theme = document.documentElement.dataset.theme || 'light' } catch { /* noop */ } }
    syncTheme()
    const mo = new MutationObserver(syncTheme)
    try { mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }) } catch { /* noop */ }
    // 전체화면: 가능하면 브라우저 전체화면 API 시도(베스트에포트 — 차단되면 화면 가득 크기로 폴백).
    if (fullscreen) {
      try { window.setTimeout(() => { try { d.documentElement.requestFullscreen && d.documentElement.requestFullscreen() } catch { /* 사용자 제스처 필요 시 차단될 수 있음 */ } }, 120) } catch { /* noop */ }
    }
    // 렌더 컨테이너
    const el = d.createElement('div')
    el.className = 'popout-root'
    el.style.height = '100vh'
    d.body.appendChild(el)
    setContainer(el)
    // 사용자가 팝업을 닫으면 앱으로 되돌리기. 단 초기 about:blank 로드 시 일부 환경(헤드리스 등)이
    // 즉시 pagehide/closed 를 내므로 그레이스 기간(1.5초) 동안의 닫힘 신호는 무시한다(오작동 방지).
    const openedAt = Date.now()
    const grace = () => Date.now() - openedAt > 1500
    const onHide = () => { if (grace()) onCloseRef.current() }
    try { w.addEventListener('pagehide', onHide) } catch { /* noop */ }
    const iv = window.setInterval(() => { if (grace() && (!winRef.current || winRef.current.closed)) { window.clearInterval(iv); onCloseRef.current() } }, 600)
    return () => {
      window.clearInterval(iv)
      try { mo.disconnect() } catch { /* noop */ }
      try { rootRef.current?.unmount() } catch { /* noop */ }
      rootRef.current = null
      try { w?.removeEventListener('pagehide', onHide) } catch { /* noop */ }
      try { w?.close() } catch { /* noop */ }
      winRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // children 을 팝업 문서의 별도 루트에 렌더(변경 시 갱신)
  useEffect(() => {
    if (!container) return
    if (!rootRef.current) rootRef.current = createRoot(container)
    rootRef.current.render(children as ReactNode)
  }, [container, children])

  return null
}
