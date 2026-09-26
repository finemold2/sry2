export * from './pack'
export * from './idb'
export * from './zip'
export * from './fsaccess'
export * from './scrivx'
export * from './sryfmt'
export * from './backup'
export * from './blobs'

// 한 번만: 옛 localStorage 키(scrivweb:* / scrivener-web:lastProjectId)를 sry:* 로 복사(손실 0, 옛 키 보존).
// 식별자를 sry 네이티브로 바꾸되 기존 사용자의 즐겨찾기·도구상태·테마·마지막 프로젝트가 사라지지 않게 한다.
;(function migrateLegacyLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem('sry:ls-migrated') === '1') return
    const map: [string, string][] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith('scrivweb:')) map.push([k, 'sry:' + k.slice('scrivweb:'.length)])
      else if (k === 'scrivener-web:lastProjectId') map.push([k, 'sry:lastProjectId'])
    }
    for (const [oldK, newK] of map) {
      if (localStorage.getItem(newK) == null) {
        const v = localStorage.getItem(oldK)
        if (v != null) localStorage.setItem(newK, v)
      }
    }
    localStorage.setItem('sry:ls-migrated', '1')
  } catch { /* noop */ }
})()

const LAST_KEY = 'sry:lastProjectId'
export function setLastProjectId(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    /* ignore */
  }
}
export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
