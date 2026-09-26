// 동일 출처 다중 탭 실시간 동기화 — BroadcastChannel.
// 한 탭에서 저장하면 다른 탭이 IndexedDB 에서 최신본을 다시 읽어 반영한다.
const CHANNEL = 'sry-sync'

export interface SyncChannel {
  post: (projectId: string, modified: number) => void
  close: () => void
}

export function createSyncChannel(onRemoteSave: (id: string, modified: number) => void): SyncChannel {
  if (typeof BroadcastChannel === 'undefined') return { post: () => {}, close: () => {} }
  const ch = new BroadcastChannel(CHANNEL)
  ch.onmessage = (e: MessageEvent) => {
    const d = e.data
    if (d && d.type === 'saved' && typeof d.id === 'string') onRemoteSave(d.id, d.modified)
  }
  return {
    post: (id, modified) => ch.postMessage({ type: 'saved', id, modified }),
    close: () => ch.close(),
  }
}
