// 미디어 blob(이미지/PDF/파일) 저장소 — IndexedDB. 바인더 아이템은 blobId 로 참조.
import { openDB, type IDBPDatabase } from 'idb'
import type { Project } from '../model'

const DB_NAME = 'sry-blobs'
const OLD_DB_NAME = 'scrivener-web-blobs' // 레거시 — 1회 마이그레이션 후 보존
const STORE = 'blobs'

let dbp: Promise<IDBPDatabase> | null = null
function db() {
  if (!dbp) dbp = init()
  return dbp
}
async function init(): Promise<IDBPDatabase> {
  const d = await openDB(DB_NAME, 1, { upgrade(dd) { if (!dd.objectStoreNames.contains(STORE)) dd.createObjectStore(STORE) } })
  // 옛 미디어 DB → 새 미디어 DB 1회 복사(키 보존, 손실 0). 새 DB 가 비어 있을 때만, 옛 DB 는 보존.
  try {
    if (localStorage.getItem('sry:blobs-migrated') !== '1') {
      if ((await d.count(STORE)) === 0) {
        const old = await openDB(OLD_DB_NAME, 1, { upgrade(o) { if (!o.objectStoreNames.contains(STORE)) o.createObjectStore(STORE) } })
        const keys = await old.getAllKeys(STORE)
        const vals = await old.getAll(STORE)
        for (let i = 0; i < keys.length; i++) await d.put(STORE, vals[i], keys[i])
        old.close()
      }
      localStorage.setItem('sry:blobs-migrated', '1')
    }
  } catch { /* 옛 DB 보존 */ }
  return d
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const d = await db()
  await d.put(STORE, blob, id)
}

export async function loadBlob(id: string): Promise<Blob | undefined> {
  const d = await db()
  return (await d.get(STORE, id)) as Blob | undefined
}

export async function deleteBlob(id: string): Promise<void> {
  const d = await db()
  await d.delete(STORE, id)
}

// ---- 내보내기/가져오기용 미디어 인라인 ----

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/)
  if (!m) return new Blob([])
  const mime = m[1] || 'application/octet-stream'
  const isB64 = !!m[2]
  const data = m[3]
  if (isB64) {
    const bin = atob(data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(data)], { type: mime })
}

/** 내보내기용: 미디어 아이템에 blob 의 base64 data URL 을 채운 프로젝트 복사본 반환(런타임 객체는 불변). */
export async function withInlineMedia(project: Project): Promise<Project> {
  const items = { ...project.items }
  let changed = false
  for (const it of Object.values(project.items)) {
    if (it.blobId) {
      const blob = await loadBlob(it.blobId)
      if (blob) {
        items[it.id] = { ...it, dataUrl: await blobToDataUrl(blob) }
        changed = true
      }
    }
  }
  return changed ? { ...project, items } : project
}

/** 가져오기용: 인라인된 dataUrl 을 blob 저장소로 복원하고 프로젝트에서 제거. */
export async function restoreInlineMedia(project: Project): Promise<Project> {
  for (const it of Object.values(project.items)) {
    if (it.dataUrl && it.blobId) {
      try {
        await saveBlob(it.blobId, dataUrlToBlob(it.dataUrl))
        // 저장 성공이 확인된 뒤에만 인라인 데이터 제거.
        delete it.dataUrl
      } catch (e) {
        // 저장 실패(예: IndexedDB 용량 초과/불가) — 유일한 사본인 dataUrl 을 유지해 미디어 유실 방지.
        console.error('restoreInlineMedia: saveBlob 실패, 인라인 데이터 유지', it.blobId, e)
      }
    } else if (it.dataUrl) {
      delete it.dataUrl
    }
  }
  return project
}
