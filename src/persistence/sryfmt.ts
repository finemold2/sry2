// sry 네이티브 프로젝트 포맷 — 우리 앱 고유. (Scrivener 와 무관)
//  - sry.json            : 프로젝트 인덱스(JSON). 각 항목 bodyRtf 는 비우고 미디어는 dataURL 로 인라인(자체완결).
//  - Files/<id>.rtf      : 각 텍스트 항목 본문(RTF = 공개 포맷).
//  - library.json        : 이 프로젝트의 공유 라이브러리(인물/장소/이미지/스니펫). 이미지는 URL 이라 텍스트로 충분.
//  - stash.json          : 이 프로젝트의 수집함(스태시). 로컬 미디어(blobId)는 dataURL 로 인라인해 기기 이전에도 보존.
// 폴더(.sry 패키지)와 휴대 파일(.sry.zip) 모두 같은 FileMap 구조를 쓴다. .sry 하나로 원고·미디어·라이브러리·수집함이 자체완결된다.
//
// 안전 설계: readSryFileMap 은 '파싱만' 한다(부수효과 없음). 라이브러리·수집함을 localStorage/IndexedDB 에 쓰는
// 사이드카 복원(applySryAux)은 호출부가 전환을 '확정'한 직후에만 부른다 — 그래야 가져오기 취소 시 현재 데이터가 보존된다.
//
// 열기는 하위호환을 위해 레거시도 조용히 흡수한다:
//  - 옛 pack zip(project.json + Files/<id>.rtf) / 옛 .scriv 패키지(scrivweb.json / *.scrivx)
import type { Project } from '../model'
import { packProject, unpackProject, sanitizeFileName } from './pack'
import { withInlineMedia, restoreInlineMedia, loadBlob, saveBlob, blobToDataUrl, dataUrlToBlob } from './blobs'
import { readScrivPackageAsync, type FileMap } from './scrivx'
import { readLibraryRaw, writeLibraryRaw, type Library } from '../tools/linkbus'

export const SRY_INDEX = 'sry.json'
// 수집함 localStorage 키 접두 — StashBox 의 ITEMS_PREFIX 와 동일해야 한다(프로젝트별 수집함).
const STASH_PREFIX = 'sry:stash:items:'

interface StashExport { id: string; kind: string; x: number; y: number; label: string; text?: string; url?: string; itemId?: string; credit?: string; blobId?: string; mime?: string; media?: string }

export interface BuildSryOpts {
  /** false 면 라이브러리/수집함 사이드카를 포함하지 않는다(자동저장 폴더 미러링 — 매번 미디어 재인코딩/덮어쓰기 방지). */
  sidecars?: boolean
  /** false 면 수집함 로컬 미디어(blob)를 dataURL 로 인라인하지 않는다. */
  inlineStashMedia?: boolean
}

/** sry 네이티브 파일맵 생성(미디어·라이브러리·수집함 동봉 — 백업/기기이전 자체완결). */
export async function buildSryFileMap(project: Project, opts?: BuildSryOpts): Promise<FileMap> {
  const sidecars = opts?.sidecars !== false
  const inlineStashMedia = opts?.inlineStashMedia !== false
  const packed = packProject(await withInlineMedia(project))
  const files: FileMap = { [SRY_INDEX]: packed.index }
  for (const [id, rtf] of Object.entries(packed.bodies)) files[`Files/${id}.rtf`] = rtf
  if (!sidecars) return files

  // 이 프로젝트의 공유 라이브러리 동봉(없으면 생략).
  try {
    const lib = readLibraryRaw(project.id)
    if (lib && (lib.characters.length || lib.places.length || lib.images.length || lib.snippets.length)) {
      files['library.json'] = JSON.stringify(lib)
    }
  } catch { /* noop */ }

  // 이 프로젝트의 수집함 동봉 + 로컬 미디어(blobId)를 dataURL 로 인라인.
  try {
    const raw = localStorage.getItem(STASH_PREFIX + project.id)
    if (raw) {
      const items = JSON.parse(raw) as StashExport[]
      if (Array.isArray(items)) {
        if (inlineStashMedia) {
          for (const it of items) {
            if (it && it.blobId) {
              try { const b = await loadBlob(it.blobId); if (b) it.media = await blobToDataUrl(b) } catch { /* noop */ }
            }
          }
        }
        files['stash.json'] = JSON.stringify(items)
      }
    }
  } catch { /* noop */ }

  return files
}

/** FileMap -> 프로젝트 (순수 파싱 + 프로젝트 미디어 복원). 사이드카(라이브러리/수집함)는 건드리지 않는다. */
export async function readSryFileMap(files: FileMap): Promise<Project> {
  const index = files[SRY_INDEX] ?? files['project.json']
  if (index != null) {
    const bodies: Record<string, string> = {}
    for (const [path, content] of Object.entries(files)) {
      const m = /^Files\/(.+)\.rtf$/.exec(path)
      if (m) bodies[m[1]] = content
    }
    return restoreInlineMedia(unpackProject(index, bodies))
  }
  // 레거시 .scriv(scrivweb.json/*.scrivx) — 기존 사용자 데이터 보호
  return readScrivPackageAsync(files)
}

/**
 * .sry 에 동봉된 라이브러리·수집함을 'projectId' 프로젝트로 복원한다.
 * 반드시 전환이 확정된(loadProject 된) 직후에만 호출할 것 — 그래야 가져오기 취소 시 현재 데이터가 보존된다.
 * 베스트에포트(실패해도 throw 하지 않음). 미디어는 저장 성공이 확인된 뒤에만 인라인 사본을 제거한다(restoreInlineMedia 와 동일 정책).
 */
export async function applySryAux(files: FileMap, projectId: string): Promise<void> {
  // 라이브러리(프로젝트별 키)
  try {
    if (files['library.json']) {
      const lib = JSON.parse(files['library.json']) as Library
      if (lib) writeLibraryRaw(projectId, lib)
    }
  } catch { /* noop */ }

  // 수집함 + 로컬 미디어 blob 복원
  try {
    if (files['stash.json']) {
      const items = JSON.parse(files['stash.json']) as StashExport[]
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it && it.media) {
            let saved = false
            if (it.blobId) {
              const blob = dataUrlToBlob(it.media)
              if (blob.size > 0) { try { await saveBlob(it.blobId, blob); saved = true } catch { /* 쿼터 등 — 사본 유지 */ } }
            }
            if (saved) delete it.media // 저장 확인 후에만 인라인 제거(손상/실패 시 dataURL 보존)
          }
        }
        try { localStorage.setItem(STASH_PREFIX + projectId, JSON.stringify(items)) } catch { /* noop */ }
        try { window.dispatchEvent(new Event('sry:stash-reload')) } catch { /* noop */ }
      }
    }
  } catch { /* noop */ }
}

/** 안전한 sry 파일/폴더 기본 이름. */
export function sryBaseName(project: Project): string {
  return sanitizeFileName(project.title)
}
