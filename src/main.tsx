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
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    if (useStore.getState().dirty) return // 입력 중 강제 새로고침 금지 — 다음 새로고침 때 반영
    reloaded = true
    location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
