import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import './aurora.css'
import { useStore } from './store/store'

// 새 배포가 서비스 워커에 설치되면(autoUpdate: skipWaiting + clientsClaim) 이미 열린 탭은 다음 새로고침까지
// 옛 번들로 남는다 — 이전 버전의 스타일과 새 데이터/테마 상태가 섞여 보이는 원인. 워커가 교체되는 즉시,
// 저장되지 않은 변경이 없을 때만 한 번 새로고침해 최신 번들로 맞춘다(최초 설치 시에는 새로고침하지 않음).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  // 열린 탭은 스스로 새 배포를 알아채지 못한다(브라우저는 탐색/24시간 주기로만 워커를 재검사). 탭이 다시 보일 때·포커스될 때·
  // 60초마다 업데이트 검사를 요청해, 새 워커가 설치되면 아래 controllerchange 로 이어져 자동 새로고침된다.
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => { try { void reg.update() } catch { /* noop */ } }
    window.setInterval(check, 60 * 1000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  }).catch(() => { /* noop */ })
  // 입력 중(저장 안 된 변경)이면 예전엔 새로고침을 건너뛰어, 사용자가 옛 번들로 계속 쓰면서 "고쳤다는데 그대로"를 겪었다.
  // 이제는 에디터 내용을 스토어에 커밋하고 자동 저장이 끝난 뒤(dirty=false) 3초 이상 입력이 없을 때 새로고침하며,
  // 그동안 하단에 안내 배너(클릭하면 즉시 적용)를 띄운다.
  let lastInput = Date.now()
  const noteInput = () => { lastInput = Date.now() }
  window.addEventListener('keydown', noteInput, true)
  window.addEventListener('input', noteInput, true)
  const showUpdateBanner = (apply: () => void) => {
    if (document.getElementById('sw-update-banner')) return
    const bar = document.createElement('div')
    bar.id = 'sw-update-banner'
    bar.setAttribute('role', 'status')
    bar.style.cssText = 'position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:20000;background:#1f2430;color:#fff;border:1px solid #4a5261;border-radius:12px;padding:10px 14px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.4);display:flex;gap:10px;align-items:center'
    bar.innerHTML = '<span>새 버전이 준비됐어요. 저장이 끝나면 자동으로 적용됩니다.</span>'
    const btn = document.createElement('button')
    btn.textContent = '지금 적용'
    btn.style.cssText = 'background:#6b7af6;color:#fff;border:0;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px'
    btn.onclick = apply
    bar.appendChild(btn)
    document.body.appendChild(bar)
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    let done = false
    const go = () => { if (done) return; done = true; location.reload() }
    // 에디터의 디바운스(200ms) 안에 있는 입력까지 먼저 스토어에 커밋한 뒤 판단한다(막 친 글이 새로고침에 날아가지 않게).
    try { window.dispatchEvent(new Event('scriv:flush-editor')) } catch { /* noop */ }
    window.setTimeout(() => {
      if (!useStore.getState().dirty && Date.now() - lastInput > 1500) { go(); return }
      showUpdateBanner(() => { try { window.dispatchEvent(new Event('scriv:flush-editor')) } catch { /* noop */ } window.setTimeout(go, 400) })
      const tick = window.setInterval(() => {
        if (done) { window.clearInterval(tick); return }
        if (!useStore.getState().dirty && Date.now() - lastInput > 3000) { window.clearInterval(tick); go() }
      }, 1000)
    }, 300)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
