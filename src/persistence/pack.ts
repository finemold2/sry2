// 프로젝트를 "인덱스(JSON) + 본문(.rtf 파일들)" 로 분리/결합.
// Scrivener 의 .scrivx(구조) + Docs/<id>.rtf(본문) 구조를 그대로 본뜬다.
import type { Project } from '../model'

export interface PackedProject {
  index: string // project.json 내용 (각 아이템의 bodyRtf 는 비움)
  bodies: Record<string, string> // id -> rtf
}

export function packProject(project: Project): PackedProject {
  const bodies: Record<string, string> = {}
  const items: Project['items'] = {}
  for (const [id, it] of Object.entries(project.items)) {
    if (it.type === 'text' && it.bodyRtf) bodies[id] = it.bodyRtf
    items[id] = { ...it, bodyRtf: '' }
  }
  const indexObj = { ...project, items }
  return { index: JSON.stringify(indexObj, null, 2), bodies }
}

export function unpackProject(index: string, bodies: Record<string, string>): Project {
  let project: Project
  try {
    project = JSON.parse(index) as Project
  } catch {
    throw new Error('프로젝트 데이터가 손상되었습니다(JSON 파싱 실패).')
  }
  for (const [id, it] of Object.entries(project.items)) {
    if (it.type === 'text') it.bodyRtf = bodies[id] || it.bodyRtf || ''
  }
  return normalizeProject(project)
}

/** 옛 스키마/누락 필드를 가진 프로젝트에 하위호환 기본값을 채운다(IDB 로드·임포트 공용). 렌더 중 undefined.length 류 크래시 방지. */
export function normalizeProject(project: Project): Project {
  if (!project.snapshots) project.snapshots = {}
  if (!project.collections) project.collections = []
  if (!project.customFields) project.customFields = []
  if (!project.styles) project.styles = []
  if (!project.sectionTypes) project.sectionTypes = []
  if (!project.comments) project.comments = {}
  if (!project.footnotes) project.footnotes = {}
  if (project.projectNotes == null) project.projectNotes = ''
  if (!project.projectBookmarks) project.projectBookmarks = []
  if (!project.writingHistory) project.writingHistory = {}
  if (!project.labels) project.labels = []
  if (!project.statuses) project.statuses = []
  if (!project.keywords) project.keywords = []
  if (!project.rootOrder) project.rootOrder = []
  if (!project.items) project.items = {}
  repairStructure(project)
  const s = project.settings || ({} as Project['settings'])
  project.settings = {
    ...s,
    projectTarget: s.projectTarget ?? 50000,
    sessionTarget: s.sessionTarget ?? 1000,
    deadline: s.deadline,
    compileSeparator: s.compileSeparator ?? '\n\n',
    theme: s.theme ?? 'light',
    targetUnit: s.targetUnit ?? 'words',
    wordsPerPage: s.wordsPerPage ?? 300,
    wordsPerMinute: s.wordsPerMinute ?? 250,
    labelFieldName: s.labelFieldName ?? '라벨',
    defaultLabelId: s.defaultLabelId ?? 'label-none',
    defaultStatusId: s.defaultStatusId ?? 'status-none',
    typewriterScrolling: s.typewriterScrolling ?? false,
    autoCompleteList: s.autoCompleteList ?? [],
    autoComplete: s.autoComplete ?? true,
    autosaveInterval: s.autosaveInterval,
    projectType: s.projectType,
    serialCadence: s.serialCadence,
  }
  return project
}

/**
 * 바인더 트리 구조를 안전하게 복구한다(데이터 소실 방지). 손상/부분 저장으로
 * 참조가 어긋나도 앱이 크래시하거나 문서가 조용히 사라지지 않게 보장:
 *  - rootOrder/childIds 에서 존재하지 않는 id·중복 제거
 *  - 부모가 사라진 아이템은 루트로 승격
 *  - 어디에서도 도달할 수 없는 '고아' 아이템은 루트로 끌어올려 항상 보이게(절대 잃지 않음)
 */
export function repairStructure(project: Project): { changed: boolean; notes: string[] } {
  const notes: string[] = []
  const items = project.items || (project.items = {})
  const ids = new Set(Object.keys(items))
  let changed = false

  // rootOrder: 유효 + 중복 제거
  const ro: string[] = []
  const roSeen = new Set<string>()
  for (const id of project.rootOrder || []) {
    if (ids.has(id) && !roSeen.has(id)) { ro.push(id); roSeen.add(id) }
    else changed = true
  }
  project.rootOrder = ro

  // 각 아이템: childIds 정리 + 부모 유효성
  for (const id of ids) {
    const it = items[id] as { childIds?: string[]; parentId?: string | null; type?: string }
    if (Array.isArray(it.childIds)) {
      const seen = new Set<string>()
      const cleaned = it.childIds.filter((cid) => {
        if (ids.has(cid) && !seen.has(cid)) { seen.add(cid); return true }
        changed = true
        return false
      })
      if (cleaned.length !== it.childIds.length) it.childIds = cleaned
    } else {
      it.childIds = []
    }
    if (it.parentId && !ids.has(it.parentId)) { it.parentId = null; changed = true }
  }

  // 도달성 계산(rootOrder → childIds 순회)
  const reachable = new Set<string>()
  const stack = [...project.rootOrder]
  while (stack.length) {
    const id = stack.pop() as string
    if (reachable.has(id) || !ids.has(id)) continue
    reachable.add(id)
    const cs = (items[id] as { childIds?: string[] }).childIds || []
    for (const c of cs) stack.push(c)
  }

  // 고아 처리: 유효한 부모가 있으면 그 부모의 자식으로 복귀, 아니면 루트로 끌어올림
  let pass = 0
  let orphans = [...ids].filter((id) => !reachable.has(id))
  while (orphans.length && pass < 4) {
    for (const id of orphans) {
      const it = items[id] as { childIds?: string[]; parentId?: string | null }
      const pid = it.parentId
      if (pid && ids.has(pid)) {
        const p = items[pid] as { childIds?: string[] }
        if (!p.childIds) p.childIds = []
        if (!p.childIds.includes(id)) { p.childIds.push(id); changed = true }
      } else {
        it.parentId = null
        if (!roSeen.has(id)) { project.rootOrder.push(id); roSeen.add(id); changed = true }
      }
    }
    // 도달성 재계산
    reachable.clear()
    const st2 = [...project.rootOrder]
    while (st2.length) {
      const id = st2.pop() as string
      if (reachable.has(id) || !ids.has(id)) continue
      reachable.add(id)
      for (const c of (items[id] as { childIds?: string[] }).childIds || []) st2.push(c)
    }
    orphans = [...ids].filter((id) => !reachable.has(id))
    pass++
  }
  // 그래도 남은 고아(순환 등)는 강제로 루트로
  for (const id of orphans) {
    ;(items[id] as { parentId?: string | null }).parentId = null
    if (!roSeen.has(id)) { project.rootOrder.push(id); roSeen.add(id) }
    changed = true
  }
  if (changed) notes.push('바인더 구조를 자동 복구했습니다(끊어진 참조 정리·고아 항목 보존).')
  return { changed, notes }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w가-힣 .-]/g, '_').slice(0, 80) || 'sry-project'
}
