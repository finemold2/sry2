// 전역 에러 바운더리 — 렌더 중 예외가 나도 흰 화면(복구 불가) 대신 복구 화면을 보여준다.
// 작성 중인 데이터는 IndexedDB/localStorage 에 이미 저장되어 있으므로, "다시 시도" 또는 "앱 새로고침"으로 복구 가능.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icon } from '../ui/icons'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // 진단용 로그(데이터는 이미 영속화되어 있음)
    console.error('렌더 오류(ErrorBoundary):', error, info?.componentStack)
  }
  reset = () => this.setState({ error: null })
  reload = () => { try { location.reload() } catch { /* noop */ } }

  render() {
    if (!this.state.error) return this.props.children
    const msg = (this.state.error?.message || String(this.state.error)).slice(0, 300)
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--chrome, #2b2f38)', color: '#fff', zIndex: 99999, padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, padding: '24px 26px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.4)' }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Icon name="flag" size={34} /></div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>화면 표시 중 문제가 발생했습니다</h2>
          <p style={{ margin: '0 0 4px', fontSize: 13.5, lineHeight: 1.6, opacity: 0.92 }}>
            작성하던 원고는 <b>자동 저장</b>되어 있어 안전합니다. 아래 버튼으로 돌아가세요.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 11.5, opacity: 0.6, wordBreak: 'break-word' }}>{msg}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.reset} style={{ ...btn(true), display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="restore" size={16} mono /> 이전 화면으로 돌아가기</button>
            <button onClick={this.reload} style={{ ...btn(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="revise" size={16} mono /> 앱 새로고침</button>
          </div>
        </div>
      </div>
    )
  }
}
function btn(primary: boolean): React.CSSProperties {
  return {
    padding: '9px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
    border: '1px solid ' + (primary ? '#5b8def' : 'rgba(255,255,255,.3)'),
    background: primary ? '#5b8def' : 'transparent', color: '#fff',
  }
}
