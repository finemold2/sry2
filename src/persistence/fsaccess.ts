// File System Access API 어댑터: 실제 디스크 폴더에 project.json + Files/<id>.rtf 저장/로드.
// Chromium 계열만 지원. 미지원 시 supportsFS() === false.
import type { Project } from '../model'
import { packProject, unpackProject } from './pack'

export function supportsFS(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// 핸들은 직렬화 불가 -> 모듈 싱글톤으로 보관
let dirHandle: FileSystemDirectoryHandle | null = null

export function getDirHandle(): FileSystemDirectoryHandle | null {
  return dirHandle
}
export function clearDirHandle() {
  dirHandle = null
}

export async function pickDirectory(mode: 'read' | 'readwrite' = 'readwrite'): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error: 표준 타입에 옵션 미정의 브라우저 존재
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode })
  dirHandle = handle
  return handle
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, content: string | Blob) {
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  await w.write(content)
  await w.close()
}

export async function saveToDir(project: Project, handle?: FileSystemDirectoryHandle): Promise<void> {
  const dir = handle || dirHandle
  if (!dir) throw new Error('폴더 핸들이 없습니다')
  dirHandle = dir
  const packed = packProject(project)
  await writeFile(dir, 'project.json', packed.index)
  // 본문 폴더
  const filesDir = await dir.getDirectoryHandle('Files', { create: true })
  // 기존 .rtf 정리(삭제된 아이템 잔여 제거)
  const keep = new Set(Object.keys(packed.bodies).map((id) => id + '.rtf'))
  // @ts-expect-error: entries() 표준화 진행 중
  for await (const [entryName, entry] of filesDir.entries()) {
    if (entry.kind === 'file' && entryName.endsWith('.rtf') && !keep.has(entryName)) {
      await filesDir.removeEntry(entryName).catch(() => {})
    }
  }
  for (const [id, rtf] of Object.entries(packed.bodies)) {
    await writeFile(filesDir, id + '.rtf', rtf)
  }
}

export async function loadFromDir(handle?: FileSystemDirectoryHandle): Promise<Project> {
  const dir = handle || dirHandle
  if (!dir) throw new Error('폴더 핸들이 없습니다')
  dirHandle = dir
  const idxHandle = await dir.getFileHandle('project.json')
  const indexText = await (await idxHandle.getFile()).text()
  const bodies: Record<string, string> = {}
  try {
    const filesDir = await dir.getDirectoryHandle('Files')
    // @ts-expect-error: entries() 표준화 진행 중
    for await (const [entryName, entry] of filesDir.entries()) {
      if (entry.kind === 'file' && entryName.endsWith('.rtf')) {
        const id = entryName.replace(/\.rtf$/, '')
        bodies[id] = await (await entry.getFile()).text()
      }
    }
  } catch {
    /* Files 폴더 없음 */
  }
  return unpackProject(indexText, bodies)
}

// ---------------- 범용 FileMap (path -> 문자열) 읽기/쓰기 (.scriv 패키지용) ----------------
async function subDir(
  dir: FileSystemDirectoryHandle,
  parts: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let cur = dir
  for (const p of parts) cur = await cur.getDirectoryHandle(p, { create })
  return cur
}

export async function writeFileMap(files: Record<string, string>, handle?: FileSystemDirectoryHandle) {
  const dir = handle || dirHandle
  if (!dir) throw new Error('폴더 핸들이 없습니다')
  dirHandle = dir
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    const fileName = parts.pop()!
    const target = parts.length ? await subDir(dir, parts, true) : dir
    await writeFile(target, fileName, content)
  }
  // 삭제된 문서의 고아 파일(구 content.rtf / 구 *.scrivx 등) 정리.
  // 우리가 관리하는 경로(Files/Data, Snapshots, 루트 *.scrivx)만 대상으로 하고,
  // 사용자가 폴더에 둔 외부 파일은 절대 건드리지 않는다(범위 한정).
  await pruneOrphans(dir, new Set(Object.keys(files)))
}

/** 우리 관리 경로만 재귀 순회하며 keep 에 없는 파일/빈 디렉터리를 제거(사용자 외부 파일 보존). */
async function pruneOrphans(dir: FileSystemDirectoryHandle, keep: Set<string>) {
  // 관리 대상으로 진입할 최상위 디렉터리만 화이트리스트로 한정
  const MANAGED_DIRS = new Set(['Files', 'Snapshots'])
  // @ts-expect-error: entries() 표준화 진행 중
  for await (const [name, entry] of dir.entries()) {
    if (entry.kind === 'file') {
      // 루트의 우리 관리 파일(구 .scrivx)만 정리. 그 외 사용자 파일은 보존.
      if (name.endsWith('.scrivx') && !keep.has(name)) {
        await dir.removeEntry(name).catch(() => {})
      }
    } else if (MANAGED_DIRS.has(name)) {
      await pruneDir(entry as FileSystemDirectoryHandle, name, keep)
    }
  }
}

/** 관리 디렉터리 내부를 재귀 순회: keep 에 없는 파일 제거, 빈 하위 디렉터리도 제거. */
async function pruneDir(d: FileSystemDirectoryHandle, prefix: string, keep: Set<string>) {
  // @ts-expect-error: entries() 표준화 진행 중
  for await (const [name, entry] of d.entries()) {
    const path = `${prefix}/${name}`
    if (entry.kind === 'file') {
      if (!keep.has(path)) await d.removeEntry(name).catch(() => {})
    } else {
      await pruneDir(entry as FileSystemDirectoryHandle, path, keep)
      // 비워진 하위 디렉터리(예: 삭제된 문서의 Files/Data/<UUID>) 정리
      if (await isDirEmpty(entry as FileSystemDirectoryHandle)) {
        await d.removeEntry(name, { recursive: true }).catch(() => {})
      }
    }
  }
}

async function isDirEmpty(d: FileSystemDirectoryHandle): Promise<boolean> {
  // @ts-expect-error: entries() 표준화 진행 중
  for await (const _ of d.entries()) return false
  return true
}

export async function readFileMap(handle?: FileSystemDirectoryHandle): Promise<Record<string, string>> {
  const dir = handle || dirHandle
  if (!dir) throw new Error('폴더 핸들이 없습니다')
  dirHandle = dir
  const out: Record<string, string> = {}
  const walk = async (d: FileSystemDirectoryHandle, prefix: string) => {
    // @ts-expect-error: entries() 표준화 진행 중
    for await (const [name, entry] of d.entries()) {
      const path = prefix ? `${prefix}/${name}` : name
      if (entry.kind === 'file') {
        out[path] = await (await (entry as FileSystemFileHandle).getFile()).text()
      } else {
        await walk(entry as FileSystemDirectoryHandle, path)
      }
    }
  }
  await walk(dir, '')
  return out
}

/** 단일 .rtf 파일을 디스크에서 직접 선택해 텍스트로 읽기(가져오기용). */
export async function openSingleRtf(): Promise<{ name: string; size: number; rtf: string } | null> {
  // @ts-expect-error: 옵션 타입
  const [fh] = await window.showOpenFilePicker({
    types: [{ description: 'Rich Text', accept: { 'application/rtf': ['.rtf'] } }],
  })
  if (!fh) return null
  const file = await fh.getFile()
  // size 도 함께 반환해 호출부가 입력 파일 경로(f.size)와 동일하게 바이트 기준으로 크기를 검사하게 한다.
  return { name: file.name.replace(/\.rtf$/i, ''), size: file.size, rtf: await file.text() }
}
