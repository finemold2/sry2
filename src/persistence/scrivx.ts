// 실제 Scrivener 3 .scriv 패키지 (de)serializer.
//  - <프로젝트>.scrivx : Binder/Label/Status XML
//  - Files/Data/<UUID>/content.rtf | synopsis.txt | notes.rtf
//  - Files/version.txt
//  - scrivweb.json : 우리 앱 전용 무손실 사이드카(데스크톱 Scrivener 는 무시)
// 파일 맵(path -> 문자열)을 만들고, ZIP/폴더 어댑터가 이를 기록/판독한다.
import { serializeRtf } from '../rtf'
import type { Block, RtfDoc } from '../rtf'
import {
  BinderItem,
  DRAFT_ROOT,
  Label,
  Project,
  RESEARCH_ROOT,
  Status,
  TRASH_ROOT,
  createItem,
  createProject,
  newId,
} from '../model'
import { unpackProject } from './pack'
import { restoreInlineMedia, withInlineMedia } from './blobs'

export type FileMap = Record<string, string>

const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function uuidOf(id: string): string {
  return id.toUpperCase()
}

function typeAttr(it: BinderItem): string {
  if (it.root === 'draft') return 'DraftFolder'
  if (it.root === 'research') return 'ResearchFolder'
  if (it.root === 'trash') return 'TrashFolder'
  return it.type === 'folder' ? 'Folder' : it.type === 'text' ? 'Text' : 'File'
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())} +0000`
}

function hexToFloatTriple(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const f = (n: number) => (isNaN(n) ? 0 : n).toFixed(6)
  return `${f(r)} ${f(g)} ${f(b)}`
}
function floatTripleToHex(s: string): string {
  const [r, g, b] = s.trim().split(/\s+/).map(parseFloat)
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round((isNaN(n) ? 0 : n) * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function plainToRtf(text: string): string {
  const blocks: Block[] = (text || '').split(/\n/).map((line) => ({
    type: 'p',
    runs: line ? [{ text: line, style: {} }] : [],
  }))
  if (!blocks.length) blocks.push({ type: 'p', runs: [] })
  const doc: RtfDoc = { blocks }
  return serializeRtf(doc)
}

// ---------------- 내보내기 ----------------
function binderItemXml(project: Project, id: string, indent: string): string {
  const it = project.items[id]
  if (!it) return ''
  const uuid = uuidOf(it.id)
  let xml = `${indent}<BinderItem UUID="${uuid}" Type="${typeAttr(it)}" Created="${fmtDate(
    it.created,
  )}" Modified="${fmtDate(it.modified)}">\n`
  xml += `${indent}  <Title>${xmlEsc(it.title)}</Title>\n`
  // MetaData
  const labelIdx = project.labels.findIndex((l) => l.id === it.labelId)
  const statusIdx = project.statuses.findIndex((s) => s.id === it.statusId)
  xml += `${indent}  <MetaData>\n`
  xml += `${indent}    <IncludeInCompile>${it.includeInCompile ? 'Yes' : 'No'}</IncludeInCompile>\n`
  if (labelIdx > 0) xml += `${indent}    <LabelID>${labelIdx}</LabelID>\n`
  if (statusIdx > 0) xml += `${indent}    <StatusID>${statusIdx}</StatusID>\n`
  xml += `${indent}  </MetaData>\n`
  if (it.childIds.length) {
    xml += `${indent}  <Children>\n`
    for (const c of it.childIds) xml += binderItemXml(project, c, indent + '    ')
    xml += `${indent}  </Children>\n`
  }
  xml += `${indent}</BinderItem>\n`
  return xml
}

function scrivxXml(project: Project): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml += `<ScrivenerProject Template="No" Version="2.0" Identifier="${uuidOf(
    project.id,
  )}" Creator="ScrivenerWeb" Modified="${fmtDate(project.modified)}">\n`
  xml += '  <Binder>\n'
  for (const rootId of project.rootOrder) xml += binderItemXml(project, rootId, '    ')
  xml += '  </Binder>\n'
  // Labels (인덱스 0 = 'none' 은 내보내지 않음; 항목의 LabelID 와 동일한 인덱스 사용)
  xml += '  <LabelSettings>\n    <Title>' + xmlEsc(project.settings.labelFieldName || 'Label') + '</Title>\n    <Labels>\n'
  project.labels.forEach((l, i) => {
    if (l.id === 'label-none') return
    xml += `      <Label ID="${i}" Color="${hexToFloatTriple(l.color)}">${xmlEsc(l.name)}</Label>\n`
  })
  xml += '    </Labels>\n  </LabelSettings>\n'
  // Status
  xml += '  <StatusSettings>\n    <Title>Status</Title>\n    <StatusItems>\n'
  project.statuses.forEach((s, i) => {
    if (s.id === 'status-none') return
    xml += `      <Status ID="${i}">${xmlEsc(s.name)}</Status>\n`
  })
  xml += '    </StatusItems>\n  </StatusSettings>\n'
  xml += '</ScrivenerProject>\n'
  return xml
}

export function projectTitleForScriv(project: Project): string {
  return (project.title || 'project').replace(/[^\w가-힣 .-]/g, '_').slice(0, 80) || 'project'
}

/** 프로젝트 -> .scriv 패키지 파일 맵 */
export function buildScrivPackage(project: Project): FileMap {
  const files: FileMap = {}
  const name = projectTitleForScriv(project)
  files[`${name}.scrivx`] = scrivxXml(project)
  files['Files/version.txt'] = '3\n'
  for (const it of Object.values(project.items)) {
    const dir = `Files/Data/${uuidOf(it.id)}`
    if (it.type === 'text') files[`${dir}/content.rtf`] = it.bodyRtf || ''
    if (it.synopsis) files[`${dir}/synopsis.txt`] = it.synopsis
    if (it.notes) files[`${dir}/notes.rtf`] = plainToRtf(it.notes)
    // 스냅샷
    const snaps = project.snapshots[it.id]
    if (snaps && snaps.length) {
      snaps.forEach((sn, i) => {
        files[`Snapshots/${uuidOf(it.id)}/${i}_${sn.date}.rtf`] = sn.bodyRtf
      })
    }
  }
  // 우리 앱 무손실 사이드카(데스크톱 Scrivener 는 무시)
  files['scrivweb.json'] = JSON.stringify(project)
  return files
}

/** 미디어 blob 을 base64 로 인라인해 자체완결 .scriv 패키지를 만든다(명시적 저장/내보내기용). */
export async function buildScrivPackageAsync(project: Project): Promise<FileMap> {
  return buildScrivPackage(await withInlineMedia(project))
}

/** .scriv 패키지 -> 프로젝트 (인라인 미디어를 blob 저장소로 복원). */
export async function readScrivPackageAsync(files: FileMap): Promise<Project> {
  return restoreInlineMedia(readScrivPackage(files))
}

// ---------------- 가져오기 ----------------
function parseBinder(
  el: Element,
  project: Project,
  parentId: string | null,
  bodies: FileMap,
  labelMap: Map<number, string>,
  statusMap: Map<number, string>,
): string[] {
  const ids: string[] = []
  for (const node of Array.from(el.children)) {
    if (node.tagName !== 'BinderItem') continue
    const uuid = node.getAttribute('UUID') || ''
    const type = node.getAttribute('Type') || 'Text'
    // UUID 누락 -> 새 id 생성, 중복 UUID -> 새 id 로 충돌 회피(앞선 항목을 덮어써 데이터가 사라지는 것 방지).
    // 본문 경로(dir)는 디스크 폴더명과 맞아야 하므로 원본 uuid 를 그대로 사용한다.
    let id = uuid.toLowerCase()
    if (!id || project.items[id]) {
      console.warn('BinderItem UUID 누락/중복 — 새 id 부여', uuid)
      id = newId()
    }
    const title = node.querySelector(':scope > Title')?.textContent || '제목 없음'
    const meta = node.querySelector(':scope > MetaData')
    const includeInCompile = (meta?.querySelector('IncludeInCompile')?.textContent || 'Yes') === 'Yes'
    const labelIdx = parseInt(meta?.querySelector('LabelID')?.textContent || '-1', 10)
    const statusIdx = parseInt(meta?.querySelector('StatusID')?.textContent || '-1', 10)

    let root: BinderItem['root'] = null
    let itemType: BinderItem['type'] = 'text'
    if (type === 'DraftFolder') (root = 'draft'), (itemType = 'folder')
    else if (type === 'ResearchFolder') (root = 'research'), (itemType = 'folder')
    else if (type === 'TrashFolder') (root = 'trash'), (itemType = 'folder')
    else if (type === 'Folder') itemType = 'folder'
    else if (type === 'Text') itemType = 'text'
    else if (/pdf/i.test(type)) itemType = 'pdf'
    else if (/image|picture/i.test(type)) itemType = 'image'
    else if (/folder/i.test(type)) itemType = 'folder'
    else itemType = 'text'

    const dir = `Files/Data/${uuid}`
    const bodyRtf = bodies[`${dir}/content.rtf`]
    const synopsis = bodies[`${dir}/synopsis.txt`] || ''

    const it = createItem(itemType, title, parentId, {
      id,
      root,
      bodyRtf: bodyRtf || undefined,
      synopsis,
      includeInCompile,
      labelId: labelMap.get(labelIdx) ?? null,
      statusId: statusMap.get(statusIdx) ?? null,
    })
    project.items[id] = it
    ids.push(id)
    const childrenEl = node.querySelector(':scope > Children')
    if (childrenEl) it.childIds = parseBinder(childrenEl, project, id, bodies, labelMap, statusMap)
  }
  return ids
}

/** .scriv 패키지 파일 맵 -> 프로젝트. scrivweb.json 이 있으면 무손실 복원. */
export function readScrivPackage(files: FileMap): Project {
  // 1) 우리 앱 사이드카 우선
  if (files['scrivweb.json']) {
    const bodies: Record<string, string> = {}
    const proj = JSON.parse(files['scrivweb.json']) as Project
    for (const it of Object.values(proj.items)) {
      const rtf = files[`Files/Data/${uuidOf(it.id)}/content.rtf`]
      if (rtf) bodies[it.id] = rtf
    }
    return unpackProject(JSON.stringify(proj), bodies)
  }

  // 2) 실제 Scrivener .scrivx 파싱
  const scrivxKey = Object.keys(files).find((k) => k.endsWith('.scrivx'))
  if (!scrivxKey) throw new Error('.scrivx 를 찾을 수 없습니다 (올바른 .scriv 패키지가 아님)')
  const dom = new DOMParser().parseFromString(files[scrivxKey], 'application/xml')
  const rootEl = dom.querySelector('ScrivenerProject')
  if (!rootEl) throw new Error('ScrivenerProject 루트가 없습니다')

  const project = createProject()
  project.items = {}
  project.rootOrder = []
  project.id = (rootEl.getAttribute('Identifier') || project.id).toLowerCase()

  // 라벨/상태 (XML ID -> 우리 id 매핑)
  const labels: Label[] = []
  const labelMap = new Map<number, string>()
  dom.querySelectorAll('LabelSettings Labels Label').forEach((l, idx) => {
    const xmlId = parseInt(l.getAttribute('ID') || String(idx), 10)
    const id = 'label-' + xmlId
    labels.push({ id, name: l.textContent || '라벨', color: floatTripleToHex(l.getAttribute('Color') || '0.6 0.6 0.6') })
    labelMap.set(xmlId, id)
  })
  if (labels.length) project.labels = [{ id: 'label-none', name: '없음', color: '#9aa0a6' }, ...labels]

  const statuses: Status[] = []
  const statusMap = new Map<number, string>()
  dom.querySelectorAll('StatusSettings StatusItems Status').forEach((s, idx) => {
    const xmlId = parseInt(s.getAttribute('ID') || String(idx), 10)
    const id = 'status-' + xmlId
    statuses.push({ id, name: s.textContent || '상태' })
    statusMap.set(xmlId, id)
  })
  if (statuses.length) project.statuses = [{ id: 'status-none', name: '없음' }, ...statuses]

  const binder = rootEl.querySelector('Binder')
  if (binder) project.rootOrder = parseBinder(binder, project, null, files, labelMap, statusMap)

  // 루트 누락 보정
  const ensureRoot = (rid: string, kind: BinderItem['root'], title: string) => {
    if (!Object.values(project.items).some((i) => i.root === kind) && !project.items[rid]) {
      project.items[rid] = createItem('folder', title, null, { id: rid, root: kind })
      project.rootOrder.push(rid)
    }
  }
  ensureRoot(DRAFT_ROOT, 'draft', '원고')
  ensureRoot(RESEARCH_ROOT, 'research', '자료')
  ensureRoot(TRASH_ROOT, 'trash', '휴지통')

  return project
}
