// ZIP 가져오기/내보내기 — 보편적 교환 포맷. project.json + Files/<id>.rtf.
import JSZip from 'jszip'
import type { Project } from '../model'
import { packProject, sanitizeFileName, unpackProject } from './pack'
import { restoreInlineMedia, withInlineMedia } from './blobs'

// zip bomb / 메모리 고갈 방지: 항목 수·압축 해제 누적 바이트 상한.
const MAX_ZIP_ENTRIES = 20000
const MAX_ZIP_BYTES = 300 * 1024 * 1024 // 300MB

export async function exportZip(project: Project): Promise<Blob> {
  const zip = new JSZip()
  // 미디어 blob 을 base64 로 인라인하여 zip 이 자체완결되게 함(백업/기기이전 시 미디어 보존)
  const packed = packProject(await withInlineMedia(project))
  zip.file('project.json', packed.index)
  const files = zip.folder('Files')!
  for (const [id, rtf] of Object.entries(packed.bodies)) {
    files.file(id + '.rtf', rtf)
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

export async function importZip(file: File | Blob): Promise<Project> {
  const zip = await JSZip.loadAsync(file)
  const idxFile = zip.file('project.json')
  if (!idxFile) throw new Error('project.json 을 찾을 수 없습니다 (올바른 프로젝트 ZIP 이 아님)')
  const index = await idxFile.async('string')
  const bodies: Record<string, string> = {}
  const filesFolder = zip.folder('Files')
  if (filesFolder) {
    const entries: Promise<void>[] = []
    let count = 0
    let total = 0
    filesFolder.forEach((relativePath, f) => {
      if (f.dir || !relativePath.endsWith('.rtf')) return
      if (++count > MAX_ZIP_ENTRIES) throw new Error('ZIP 항목 수 제한 초과')
      const id = relativePath.replace(/\.rtf$/, '')
      entries.push(
        f.async('uint8array').then((buf) => {
          total += buf.byteLength
          if (total > MAX_ZIP_BYTES) throw new Error('ZIP 압축 해제 크기 제한 초과')
          bodies[id] = new TextDecoder().decode(buf)
        }),
      )
    })
    await Promise.all(entries)
  }
  // 인라인된 미디어를 blob 저장소로 복원
  return restoreInlineMedia(unpackProject(index, bodies))
}

/** FileMap(path -> 문자열)을 ZIP Blob 으로 (.scriv 패키지를 .zip 으로 배포). */
export async function fileMapToZip(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

/** ZIP 을 FileMap 으로 (.scriv.zip 가져오기). */
export async function zipToFileMap(file: File | Blob): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(file)
  const out: Record<string, string> = {}
  const jobs: Promise<void>[] = []
  let count = 0
  let total = 0
  zip.forEach((path, f) => {
    if (f.dir) return
    if (++count > MAX_ZIP_ENTRIES) throw new Error('ZIP 항목 수 제한 초과')
    jobs.push(
      f.async('uint8array').then((buf) => {
        total += buf.byteLength
        if (total > MAX_ZIP_BYTES) throw new Error('ZIP 압축 해제 크기 제한 초과')
        out[path] = new TextDecoder().decode(buf)
      }),
    )
  })
  await Promise.all(jobs)
  return out
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: mime + ';charset=utf-8' }), filename)
}

export function projectZipName(project: Project): string {
  return sanitizeFileName(project.title) + '.scrivweb.zip'
}
