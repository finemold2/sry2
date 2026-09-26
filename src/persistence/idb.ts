// IndexedDB 폴백 어댑터(모든 브라우저). 프로젝트 전체(본문 인라인)를 저장.
import { openDB, type IDBPDatabase } from 'idb'
import type { Project } from '../model'

const DB_NAME = 'sry'
const OLD_DB_NAME = 'scrivener-web' // 레거시 — 1회 마이그레이션 후 보존(삭제하지 않음)
const STORE = 'projects'

let dbp: Promise<IDBPDatabase> | null = null
function db() {
  if (!dbp) dbp = init()
  return dbp
}
async function init(): Promise<IDBPDatabase> {
  // blocked/blocking/terminated 핸들러로 버전충돌·다른탭 연결 시 open 이 무한 대기하지 않게 한다.
  const d = await openDB(DB_NAME, 1, {
    upgrade(dd) {
      if (!dd.objectStoreNames.contains(STORE)) dd.createObjectStore(STORE, { keyPath: 'id' })
    },
    blocked() { /* 다른 탭이 옛 버전을 잡고 있어도 진행 */ },
    blocking() { /* 다른 탭의 업그레이드 요청 — 단일 탭에선 무시 */ },
    terminated() { dbp = null },
  })
  // 옛 DB(scrivener-web) 프로젝트를 새 DB(sry)로 1회 복사 — 식별자 변경에도 원고 보존(손실 0).
  // 새 DB 가 비어 있을 때만 복사하고, 옛 DB 는 안전을 위해 절대 삭제하지 않는다.
  // 안전 설계:
  //  · 옛 DB '열기'만 시간제한(일부 환경에서 열기가 무한 대기 → init 이 영영 안 풀려 영속 hang 하는 것 방지).
  //  · 일단 열리면 복사는 '끝까지'(중단 없이) — 큰 옛 프로젝트가 잘려 옮겨지는 손실 방지.
  //  · 'idb-migrated' 플래그는 '복사 성공' 시에만 기록 — 열기 실패/타임아웃 시 다음 기동에 재시도(손실 없음).
  try {
    if (localStorage.getItem('sry:idb-migrated') !== '1') {
      if ((await d.count(STORE)) === 0) {
        let old: IDBPDatabase | null = null
        try {
          old = await Promise.race([
            openDB(OLD_DB_NAME, 1, {
              upgrade(o) { if (!o.objectStoreNames.contains(STORE)) o.createObjectStore(STORE, { keyPath: 'id' }) },
              blocked() { /* noop */ }, blocking() { /* noop */ },
            }),
            new Promise<IDBPDatabase>((_, rej) => setTimeout(() => rej(new Error('old-open-timeout')), 2500)),
          ])
        } catch { old = null }
        if (old) {
          for (const p of (await old.getAll(STORE)) as Project[]) await d.put(STORE, p) // 전체 복사(중단 없음)
          old.close()
          localStorage.setItem('sry:idb-migrated', '1') // 복사 성공 시에만 완료 표시
        }
      } else {
        localStorage.setItem('sry:idb-migrated', '1') // 이미 새 DB 에 데이터 있음 → 이관 불필요
      }
    }
  } catch { /* 실패 시 옛 DB 보존(삭제 안 함) — 다음 기동에 재시도. */ }
  return d
}

export interface ProjectMeta {
  id: string
  title: string
  modified: number
}

export async function idbSave(project: Project): Promise<void> {
  const d = await db()
  await d.put(STORE, { ...project })
  // 쓰기 검증: 되읽어 같은 수정시각이 보이는지 확인. 할당량 초과/트랜잭션 실패를
  // 조용히 삼켜 "저장됨"으로 오인하는 것을 막는다(데이터 소실 방지의 핵심).
  const back = (await d.get(STORE, project.id)) as Project | undefined
  if (!back || back.modified !== project.modified) {
    throw new Error('저장 검증 실패: 되읽기 결과가 일치하지 않습니다.')
  }
}

/** 저장 가능 여부/여유 공간을 추정한다(할당량 임박 경고용). */
export async function storageEstimate(): Promise<{ usage: number; quota: number; ratio: number } | null> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate()
      const usage = e.usage || 0
      const quota = e.quota || 0
      return { usage, quota, ratio: quota ? usage / quota : 0 }
    }
  } catch {
    /* noop */
  }
  return null
}

export async function idbLoad(id: string): Promise<Project | undefined> {
  const d = await db()
  return (await d.get(STORE, id)) as Project | undefined
}

export async function idbList(): Promise<ProjectMeta[]> {
  const d = await db()
  const all = (await d.getAll(STORE)) as Project[]
  return all
    .map((p) => ({ id: p.id, title: p.title, modified: p.modified }))
    .sort((a, b) => b.modified - a.modified)
}

export async function idbDelete(id: string): Promise<void> {
  const d = await db()
  await d.delete(STORE, id)
}

/**
 * 프로젝트를 브라우저 보관소에서 완전히 제거한다(목록 UI의 항목별 삭제용).
 * IndexedDB 레코드뿐 아니라 그 프로젝트에 매인 localStorage 키
 * ('sry:stash:items:'+id 수집함, 'sry:lastBackup:'+id 백업 타임스탬프)까지
 * 함께 정리해, 옛 프로젝트를 지워도 잔존 키로 할당량이 차는 것을 막는다.
 * IndexedDB 삭제를 먼저 끝낸 뒤 localStorage 를 정리하므로(원고 본체 우선)
 * localStorage 정리가 실패해도 프로젝트 자체는 이미 제거된 상태가 보장된다.
 */
export async function idbDeleteWithCleanup(id: string): Promise<void> {
  if (!id) return
  await idbDelete(id)
  // 부수 데이터 정리는 베스트에포트 — 본체 삭제 성공 후에는 어떤 경우에도 throw 하지 않는다.
  try { localStorage.removeItem('sry:stash:items:' + id) } catch { /* noop */ }
  try { localStorage.removeItem('sry:lastBackup:' + id) } catch { /* noop */ }
  try { localStorage.removeItem('sry:shared-library:' + id) } catch { /* noop */ } // 프로젝트별 공유 라이브러리 키도 함께 정리(누수 방지)
}

export async function requestPersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }
  return false
}
