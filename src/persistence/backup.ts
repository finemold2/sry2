// 자동 백업 — 프로젝트 zip 스냅샷을 IndexedDB 에 롤링 보관(최근 N개)하고 복원.
import { openDB, type IDBPDatabase } from 'idb'
import type { Project } from '../model'
import { fileMapToZip, zipToFileMap } from './zip'
import { buildSryFileMap, readSryFileMap } from './sryfmt'
import type { FileMap } from './scrivx'

const DB_NAME = 'sry-backups'
const OLD_DB_NAME = 'scrivener-web-backups' // 레거시 — 1회 마이그레이션 후 보존
const STORE = 'backups'
const KEEP = 15 // 프로젝트별 보관 개수

function makeStore(d: IDBPDatabase) {
  const os = d.createObjectStore(STORE, { keyPath: 'id' })
  os.createIndex('projectId', 'projectId')
  os.createIndex('date', 'date')
}
let dbp: Promise<IDBPDatabase> | null = null
function db() {
  if (!dbp) dbp = init()
  return dbp
}
async function init(): Promise<IDBPDatabase> {
  const d = await openDB(DB_NAME, 1, { upgrade(dd) { if (!dd.objectStoreNames.contains(STORE)) makeStore(dd) } })
  // 옛 백업 DB → 새 백업 DB 1회 복사(손실 0). 새 DB 가 비어 있을 때만, 옛 DB 는 보존.
  try {
    if (localStorage.getItem('sry:backups-migrated') !== '1') {
      if ((await d.count(STORE)) === 0) {
        const old = await openDB(OLD_DB_NAME, 1, { upgrade(o) { if (!o.objectStoreNames.contains(STORE)) makeStore(o) } })
        for (const r of await old.getAll(STORE)) await d.put(STORE, r)
        old.close()
      }
      localStorage.setItem('sry:backups-migrated', '1')
    }
  } catch { /* 옛 DB 보존 */ }
  return d
}

export interface BackupMeta {
  id: string
  projectId: string
  title: string
  date: number
  size: number
}

interface BackupRecord extends BackupMeta {
  blob: Blob
}

function newKey(projectId: string, date: number): string {
  return `${projectId}:${date}`
}

/** 현재 프로젝트의 zip 스냅샷을 보관하고, 오래된 백업을 정리. */
export async function saveBackup(project: Project): Promise<BackupMeta> {
  // 백업은 .sry 와 동일한 자체완결 패키지(원고+미디어+라이브러리+수집함)로 저장한다 — 복원 시 전부 되살아나게.
  const blob = await fileMapToZip(await buildSryFileMap(project))
  // 백업 무결성 검증: zip 을 되읽어 인덱스가 유효한지 확인(부수효과 없는 경량 검사).
  // 손상된(복원 불가) 백업을 보관처럼 두면 정작 복구가 필요할 때 무용지물이 되므로,
  // 검증 실패 시 예외를 던져 보관하지 않는다(기존 정상 백업은 그대로 유지됨).
  try {
    const fm = await zipToFileMap(blob)
    const idx = fm['sry.json'] || fm['project.json']
    if (!idx) throw new Error('인덱스 파일 없음')
    const p = JSON.parse(idx) as { id?: string; items?: unknown }
    if (!p || !p.id || !p.items) throw new Error('round-trip 결과가 비어 있음')
  } catch (e) {
    throw new Error('백업 검증 실패: ' + ((e as Error)?.message || e))
  }
  const date = Date.now()
  const rec: BackupRecord = {
    id: newKey(project.id, date),
    projectId: project.id,
    title: project.title,
    date,
    size: blob.size,
    blob,
  }
  const d = await db()
  // 새 백업을 먼저 확실히 저장. 실패하면 예외가 전파되어 아래 정리(삭제)는 실행되지 않는다.
  await d.put(STORE, rec)
  // 새 백업이 저장된 뒤에만 오래된 것 정리(정리 실패는 데이터 손실이 아니므로 무시).
  try {
    const all = (await d.getAllFromIndex(STORE, 'projectId', project.id)) as BackupRecord[]
    all.sort((a, b) => b.date - a.date)
    for (const old of all.slice(KEEP)) await d.delete(STORE, old.id)
  } catch (e) {
    console.warn('오래된 백업 정리 실패(데이터 손실 아님)', e)
  }
  return { id: rec.id, projectId: rec.projectId, title: rec.title, date: rec.date, size: rec.size }
}

export async function listBackups(projectId?: string): Promise<BackupMeta[]> {
  const d = await db()
  const all = (await d.getAll(STORE)) as BackupRecord[]
  return all
    .filter((r) => !projectId || r.projectId === projectId)
    .map((r) => ({ id: r.id, projectId: r.projectId, title: r.title, date: r.date, size: r.size }))
    .sort((a, b) => b.date - a.date)
}

export async function loadBackup(id: string): Promise<Project | undefined> {
  const d = await db()
  const rec = (await d.get(STORE, id)) as BackupRecord | undefined
  if (!rec) return undefined
  return readSryFileMap(await zipToFileMap(rec.blob)) // .sry/pack/.scriv 모두 흡수(하위호환)
}

/** 백업의 원본 FileMap(라이브러리/수집함 사이드카 포함) — 복원 직후 applySryAux 로 사이드카를 적용하기 위함. */
export async function loadBackupFiles(id: string): Promise<FileMap | undefined> {
  const d = await db()
  const rec = (await d.get(STORE, id)) as BackupRecord | undefined
  if (!rec) return undefined
  return zipToFileMap(rec.blob)
}

export async function deleteBackup(id: string): Promise<void> {
  const d = await db()
  await d.delete(STORE, id)
}

/** 백업 zip Blob 을 직접 다운로드용으로 반환. */
export async function getBackupBlob(id: string): Promise<Blob | undefined> {
  const d = await db()
  const rec = (await d.get(STORE, id)) as BackupRecord | undefined
  return rec?.blob
}
