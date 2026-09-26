import { create } from 'zustand'
import { htmlToRtf, parseRtf, rtfToHtml, rtfToPlainText, serializeRtf } from '../rtf'
import {
  BinderItem,
  CanvasState,
  Collection,
  CustomMetaField,
  ItemType,
  Keyword,
  Label,
  Project,
  SearchOptions,
  Snapshot,
  Status,
  ThemeName,
  WritingType,
  EpisodeMeta,
  SeoMeta,
  ProjectSettings,
  CslItem,
  ArgNode,
  TRASH_ROOT,
  DRAFT_ROOT,
  RESEARCH_ROOT,
  createItem,
  createProject,
  countText,
  newId,
} from '../model'
import { defaultSearchOptions } from '../search/search'
import { deleteBlob } from '../persistence/blobs'
import { normalizeProject } from '../persistence/pack'
import { CHARACTER_FIELDS, DOC_TEMPLATES, SETTING_FIELDS, characterToRtf } from '../templates/docTemplates'
import { STRUCTURES, type Beat } from '../templates/structures'

/** 도구가 프로젝트에 항목을 추가할 때 쓰는 사양(브리지 공용). */
export interface ProjectEntrySpec {
  kind?: 'text' | 'character' | 'setting'
  root?: 'draft' | 'research'
  folder?: string
  title: string
  bodyRtf?: string
  character?: Record<string, string>
  synopsis?: string
  icon?: string
  meta?: Record<string, string>
}

/** 캐릭터/장소 카드의 필드 정의 선택(_kind 로 구분). */
function charDefs(character?: Record<string, string>) {
  return character && character._kind === 'setting' ? SETTING_FIELDS : CHARACTER_FIELDS
}

/** 제거 예정 아이템들의 blobId 중, 남는 아이템이 더는 참조하지 않는 것만 비동기 삭제(고아 정리). */
function reapBlobs(project: Project, removedBlobIds: string[]) {
  if (!removedBlobIds.length) return
  const stillUsed = new Set<string>()
  for (const it of Object.values(project.items)) if (it.blobId) stillUsed.add(it.blobId)
  const orphans = [...new Set(removedBlobIds)].filter((b) => b && !stillUsed.has(b))
  if (orphans.length) void Promise.all(orphans.map((b) => deleteBlob(b).catch(() => {})))
}

export interface ReplaceOptions {
  inText: boolean
  inTitles: boolean
  inSynopses: boolean
  inNotes: boolean
  caseSensitive: boolean
  wholeWord: boolean
}

export type ViewMode = 'editor' | 'corkboard' | 'outliner' | 'board' | 'canvas' | 'serial' | 'timeline' | 'references' | 'argument' | 'database'
export type InspectorTab = 'notes' | 'meta' | 'snapshots' | 'keywords' | 'comments' | 'bookmarks' | 'seo' | 'tools' | 'favorites'
export type AnnotationKind = 'footnote' | 'comment'

/** 코멘트 범위 시각화에 쓰는 형광펜 색(FormatBar.insertComment 와 동일). 코멘트 삭제 시 같은 색 고아 하이라이트 정리에 사용. */
export const COMMENT_HIGHLIGHT = '#fff1a8'

/** 즐겨찾기 항목 — id 는 명령 id(예: 'tool:scene-forge', 'v-serial', 'compile'). label 은 표시용(아이콘 포함 가능). */
export interface Favorite { id: string; label: string }
const FAV_KEY = 'sry:favorites'
function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p.filter((x) => x && typeof x.id === 'string').map((x) => ({ id: String(x.id), label: String(x.label || x.id) })) : []
  } catch { return [] }
}
function saveFavorites(f: Favorite[]) { try { localStorage.setItem(FAV_KEY, JSON.stringify(f)) } catch { /* noop */ } }

export interface AnnotationEntry {
  kind: AnnotationKind
  index: number // 종류별 순번(0부터)
  number: number // 각주 표시 번호(1부터); 코멘트는 순번+1
  text: string
  endnote?: boolean
}

/** 문서 본문 RTF 에서 각주/코멘트 마커를 문서 순서대로 열거. */
export function listAnnotations(rtf: string): AnnotationEntry[] {
  if (!rtf) return []
  const doc = parseRtf(rtf)
  const out: AnnotationEntry[] = []
  let fnIdx = 0
  let cmtIdx = 0
  for (const b of doc.blocks) {
    for (const r of b.runs) {
      if (r.style.footnote != null) {
        out.push({ kind: 'footnote', index: fnIdx, number: fnIdx + 1, text: r.style.footnote, endnote: r.style.endnote })
        fnIdx++
      } else if (r.style.comment != null) {
        out.push({ kind: 'comment', index: cmtIdx, number: cmtIdx + 1, text: r.style.comment })
        cmtIdx++
      }
    }
  }
  return out
}

interface AppState {
  project: Project
  // UI
  activeId: string | null
  /** Shift+클릭/화살표 범위 선택의 시작점(앵커) — range 선택에서 갱신하지 않아 연속 확장이 가능(리뷰 F11). */
  anchorId: string | null
  selectedIds: string[]
  /** 방금 추가/이름변경 요청된 항목 id — 바인더 Row 가 인라인 편집을 시작하고 비운다. */
  renameId: string | null
  viewMode: ViewMode
  inspectorTab: InspectorTab
  inspectorVisible: boolean
  binderVisible: boolean
  composition: boolean
  /** 분할 에디터: 보조 패널에 표시할 문서 id(없으면 분할 해제) + 방향 */
  splitId: string | null
  splitDir: 'vertical' | 'horizontal'
  search: string
  searchOptions: SearchOptions
  activeCollectionId: string | null
  sessionStartWords: number
  /** 세션 시작 시점의 원고 글자 수 기준선(targetUnit==='chars' 세션 진행률용; sessionStartWords 의 글자 버전). 영속 0(런타임 전용). */
  sessionStartChars: number
  dirty: boolean
  /** UI 전용 변경(폴더 펼침/접기 등) 보류 플래그. 영속은 필요하지만 '미저장' 배지·이탈 경고·세션 집필량과는 분리한다.
   *  autosave 는 dirty 또는 uiDirty 일 때 동작하고, markSaved 가 둘 다 정리한다. */
  uiDirty: boolean
  lastSaved: number | null
  /** 즐겨찾기(앱 전역, 프로젝트 무관 — localStorage 영속). 어떤 도구/뷰/메뉴 명령이든 id 로 즐겨찾기. */
  favorites: Favorite[]
  /** UI 스킨: 'classic'(기존) | 'studio'(새 모던 셸). 전환해도 같은 store 를 읽어 데이터·원고 100% 보존. */
  uiSkin: 'classic' | 'studio'

  // ---- 프로젝트 ----
  newProject: () => void
  loadProject: (p: Project) => void
  /** 다른 탭에서 저장된 프로젝트를 반영하되, 현재 뷰/네비 UI 상태는 보존한다(다중탭 동기화용). */
  applyRemoteProject: (p: Project) => void
  setProjectTitle: (t: string) => void
  markSaved: () => void

  // ---- 바인더 ----
  addItem: (type: ItemType, parentId: string, title?: string) => string
  /** 도구/기능이 만든 산출물을 실제 프로젝트(바인더)에 문서/카드로 추가 — 좌측 파일구조·DB·캔버스에 실시간 반영. */
  addProjectEntry: (spec: ProjectEntrySpec) => string
  addMediaItem: (parentId: string, type: ItemType, title: string, blobId: string, mime: string) => string
  addFromTemplate: (templateId: string, parentId: string) => string
  applyStructure: (structureId: string, parentId: string) => string | null
  setCharacterField: (id: string, key: string, value: string) => void
  setItemIcon: (id: string, icon: string | null) => void
  renameItem: (id: string, title: string) => void
  setRenameId: (id: string | null) => void
  moveToTrash: (id: string) => void
  emptyTrash: () => void
  deleteForever: (id: string) => void
  moveItem: (id: string, newParentId: string, index: number) => void
  toggleExpanded: (id: string) => void
  convertType: (id: string, type: ItemType) => void
  duplicateItem: (id: string) => void
  // ---- 문서 재구성(Wave 1) ----
  splitDocument: (id: string, beforeHtml: string, afterHtml: string, title?: string) => void
  mergeDocuments: (ids: string[]) => void
  groupSelection: (ids: string[]) => void
  ungroup: (folderId: string) => void
  restoreFromTrash: (id: string) => void
  moveRelative: (id: string, dir: -1 | 1) => void
  appendToDocument: (targetId: string, html: string) => void

  // ---- 본문/메타 ----
  setBodyHtml: (id: string, html: string) => void
  setBodyRtf: (id: string, rtf: string) => void
  setSynopsis: (id: string, s: string) => void
  setNotes: (id: string, s: string) => void
  setLabel: (id: string, labelId: string | null) => void
  setStatus: (id: string, statusId: string | null) => void
  toggleKeyword: (id: string, keywordId: string) => void
  setInclude: (id: string, v: boolean) => void
  setTarget: (id: string, t: number) => void
  setCustomMeta: (id: string, field: string, value: string) => void

  // ---- 프로젝트 사전(라벨/상태/키워드/컬렉션) ----
  addLabel: (name: string, color: string) => void
  updateLabel: (l: Label) => void
  addStatus: (name: string) => void
  addKeyword: (name: string, color: string) => void
  /** 키워드 제거 + 모든 item.keywordIds 정리(deleteStatus 패턴). */
  deleteKeyword: (id: string) => void
  renameKeyword: (id: string, name: string) => void
  recolorKeyword: (id: string, color: string) => void
  setProjectTarget: (n: number) => void
  setSessionTarget: (n: number) => void
  setDeadline: (iso: string) => void
  addCollection: (name: string, itemIds: string[]) => void
  addSearchCollection: (name: string, query: string, options: SearchOptions) => void
  deleteCollection: (id: string) => void
  renameCollection: (id: string, name: string) => void
  setActiveCollection: (id: string | null) => void
  addToCollection: (colId: string, ids: string[]) => void
  removeFromCollection: (colId: string, id: string) => void
  resetSession: () => void

  // ---- 메타데이터 사전/섹션타입/커스텀필드 ----
  deleteLabel: (id: string) => void
  deleteStatus: (id: string) => void
  addSectionType: (name: string) => void
  renameSectionType: (id: string, name: string) => void
  deleteSectionType: (id: string) => void
  setSectionType: (id: string, sectionTypeId: string | null) => void
  togglePageBreak: (id: string, v: boolean) => void
  toggleScriptMode: (id: string, v: boolean) => void
  addCustomField: (name: string, type: CustomMetaField['type']) => void
  deleteCustomField: (id: string) => void
  setProjectNotes: (s: string) => void
  addBookmark: (scope: 'project' | string, bm: { title: string; targetItemId?: string; url?: string }) => void
  removeBookmark: (scope: 'project' | string, bmId: string) => void
  setTheme: (t: ThemeName) => void
  setAutosaveInterval: (ms: number) => void
  toggleTypewriter: () => void
  toggleAutoComplete: () => void
  addAutoComplete: (word: string) => void
  removeAutoComplete: (word: string) => void
  setSearchOptions: (patch: Partial<SearchOptions>) => void
  projectReplace: (find: string, replace: string, opts: ReplaceOptions) => number

  // ---- 코멘트/각주 ----
  setAnnotation: (id: string, kind: AnnotationKind, index: number, text: string) => void
  deleteAnnotation: (id: string, kind: AnnotationKind, index: number) => void

  // ---- 스냅샷 ----
  takeSnapshot: (id: string, title?: string) => void
  rollbackSnapshot: (id: string, snapshotId: string) => void
  deleteSnapshot: (id: string, snapshotId: string) => void

  // ---- 선택/뷰 ----
  select: (id: string, opts?: { additive?: boolean; range?: boolean; order?: string[] }) => void
  setView: (v: ViewMode) => void
  setInspectorTab: (t: InspectorTab) => void
  toggleFavorite: (fav: Favorite) => void
  removeFavorite: (id: string) => void
  reorderFavorites: (ids: string[]) => void
  setUiSkin: (skin: 'classic' | 'studio') => void
  toggleInspector: () => void
  toggleBinder: () => void
  toggleComposition: () => void
  toggleSplit: () => void
  setSplit: (id: string | null) => void
  setSplitDir: (d: 'vertical' | 'horizontal') => void
  setSearch: (s: string) => void
  setCanvas: (canvas: CanvasState) => void
  // ---- 글쓰기 유형 / 연재 / SEO ----
  setProjectType: (t: WritingType) => void
  setSerialCadence: (n: number) => void
  patchSettings: (patch: Partial<ProjectSettings>) => void
  setDocType: (id: string, t: WritingType | null) => void
  setEpisodeMeta: (id: string, patch: Partial<EpisodeMeta>) => void
  setSeoMeta: (id: string, patch: Partial<SeoMeta>) => void
  // ---- 참고문헌 ----
  addReference: (item: Omit<CslItem, 'id'>) => string
  updateReference: (item: CslItem) => void
  deleteReference: (id: string) => void
  // ---- 논증 작업대 ----
  setThesis: (text: string) => void
  addArgNode: (node: Omit<ArgNode, 'id'>) => string
  updateArgNode: (id: string, patch: Partial<ArgNode>) => void
  deleteArgNode: (id: string) => void
}

function touch(p: Project) {
  p.modified = Date.now()
}

/** 본문 RTF 로부터 단어/글자 수 + 검색용 평문 캐시 갱신 */
function recount(it: BinderItem) {
  const text = rtfToPlainText(it.bodyRtf)
  const c = countText(text)
  it.wordCount = c.words
  it.charCount = c.chars
  it.plainText = text
}

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 오늘 집필량(원고 단어 순증가)을 누적 기록 */
function recordWriting(p: Project) {
  const today = todayStr()
  const total = totalDraftWords(p)
  const prev = p.writingHistory[today]
  if (!prev) p.writingHistory[today] = { date: today, words: 0, draftTotal: total }
  else
    p.writingHistory[today] = {
      date: today,
      words: prev.words + Math.max(0, total - prev.draftTotal),
      draftTotal: total,
    }
}

/** 사용자가 직접 타이핑하지 않은 본문 변경(분할/병합/추가/치환/되돌리기 등) 후
 *  오늘 집필량 기준선만 최신화한다. words 는 증가시키지 않아 이중/허위 집계를 막는다. */
function syncDraftBaseline(p: Project) {
  const today = todayStr()
  const total = totalDraftWords(p)
  const prev = p.writingHistory[today]
  p.writingHistory[today] = { date: today, words: prev?.words ?? 0, draftTotal: total }
}

function removeSubtree(p: Project, id: string): string[] {
  const removed: string[] = []
  const gather = (cid: string) => {
    removed.push(cid)
    p.items[cid]?.childIds.forEach(gather)
  }
  gather(id)
  removed.forEach((rid) => {
    delete p.items[rid]
    delete p.snapshots[rid]
  })
  return removed
}

/** 부모 childIds 에서 제거(부모를 복제해 불변성 유지) */
function detach(p: Project, id: string) {
  const it = p.items[id]
  if (!it || !it.parentId) return
  const parent = p.items[it.parentId]
  if (parent) p.items[it.parentId] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) }
}

function isDescendant(items: Record<string, BinderItem>, ancestorId: string, maybeChildId: string): boolean {
  let cur: string | null = maybeChildId
  while (cur) {
    if (cur === ancestorId) return true
    cur = items[cur]?.parentId ?? null
  }
  return false
}

function clone(p: Project): Project {
  // 얕은 복제 + items 맵 복제 (변경 대상 아이템은 액션에서 개별 복제)
  return { ...p, items: { ...p.items } }
}

function cloneItem(p: Project, id: string): BinderItem | null {
  const cur = p.items[id]
  if (!cur) return null // 이미 삭제된 아이템에 대해 빈 "유령" 객체를 만들지 않는다.
  const next = { ...cur }
  p.items[id] = next
  return next
}

export const useStore = create<AppState>((set, get) => ({
  project: createProject(),
  activeId: null,
  anchorId: null,
  selectedIds: [],
  viewMode: 'editor',
  inspectorTab: 'notes',
  inspectorVisible: true,
  favorites: loadFavorites(),
  uiSkin: ((): 'classic' | 'studio' => { try { return localStorage.getItem('sry:uiSkin') === 'studio' ? 'studio' : 'classic' } catch { return 'classic' } })(),
  binderVisible: true,
  composition: false,
  renameId: null,
  splitId: null,
  splitDir: 'vertical',
  search: '',
  searchOptions: defaultSearchOptions,
  activeCollectionId: null,
  sessionStartWords: 0,
  sessionStartChars: 0,
  dirty: false,
  uiDirty: false,
  lastSaved: null,

  newProject: () => {
    const project = createProject()
    // 새 프로젝트가 테마를 라이트로 리셋하지 않도록 현재 테마/타이포 등 UI 선호를 계승(전역 영속값 우선)
    const prev = get().project?.settings
    let savedTheme: string | null = null
    try { savedTheme = localStorage.getItem('sry:theme') } catch { /* noop */ }
    const inheritTheme = (savedTheme as ThemeName) || prev?.theme
    if (inheritTheme) project.settings.theme = inheritTheme
    if (prev) {
      project.settings.targetUnit = prev.targetUnit
      project.settings.wordsPerPage = prev.wordsPerPage
      project.settings.wordsPerMinute = prev.wordsPerMinute
      project.settings.typewriterScrolling = prev.typewriterScrolling
      project.settings.autoComplete = prev.autoComplete
      // 편집 환경 선호 계승
      project.settings.editorWidth = prev.editorWidth
      project.settings.editorParaGap = prev.editorParaGap
      project.settings.editorLineHeight = prev.editorLineHeight
      project.settings.autosaveInterval = prev.autosaveInterval
      project.settings.autoCompleteList = prev.autoCompleteList
    }
    const firstScene = Object.values(project.items).find((i) => i.type === 'text')
    set({
      project,
      activeId: firstScene?.id ?? null,
      selectedIds: firstScene ? [firstScene.id] : [],
      viewMode: 'editor',
      // 이전 프로젝트의 죽은 뷰/네비 상태 제거(loadProject 와 동일)
      inspectorTab: 'notes',
      activeCollectionId: null,
      search: '',
      splitId: null,
      dirty: true,
      sessionStartWords: 0,
      sessionStartChars: 0,
    })
  },

  loadProject: (raw) => {
    const p = normalizeProject(raw) // 옛 스키마/누락 필드(collections 등) 보정 — 렌더 크래시 방지
    const firstScene = Object.values(p.items).find((i) => i.type === 'text' && i.root === null)
    set({
      project: p,
      activeId: firstScene?.id ?? null,
      selectedIds: firstScene ? [firstScene.id] : [],
      viewMode: 'editor',
      inspectorTab: 'notes',
      activeCollectionId: null,
      search: '',
      splitId: null,
      dirty: false,
      uiDirty: false,
      lastSaved: Date.now(),
      sessionStartWords: totalDraftWords(p),
      sessionStartChars: totalDraftChars(p),
    })
  },

  // 다중탭 동기화: project/lastSaved/dirty 만 교체하고 activeId/viewMode/selectedIds/search/splitId 등
  // 현재 뷰·네비 UI 상태는 보존한다. activeId/splitId 는 새 items 에 없을 때만 보정.
  applyRemoteProject: (raw) =>
    set((s) => {
      const p = normalizeProject(raw)
      const valid = (id: string | null) => (id && p.items[id] ? id : null)
      const activeId = valid(s.activeId)
      // 활성 컬렉션이 새 collections 에 없으면 null 로 보정(activeId 보정과 동일 패턴)
      const activeCollectionId = s.activeCollectionId && p.collections.some((c) => c.id === s.activeCollectionId) ? s.activeCollectionId : null
      return {
        project: p,
        activeId,
        activeCollectionId,
        // 사라진 문서는 선택에서 제거(남은 선택은 유지)
        selectedIds: s.selectedIds.filter((id) => !!p.items[id]),
        splitId: valid(s.splitId),
        dirty: false,
        uiDirty: false,
        lastSaved: Date.now(),
      }
    }),

  setProjectTitle: (t) =>
    set((s) => {
      const project = clone(s.project)
      project.title = t
      touch(project)
      return { project, dirty: true }
    }),

  markSaved: () => set({ dirty: false, uiDirty: false, lastSaved: Date.now() }),

  addItem: (type, parentId, title) => {
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      const parent = cloneItem(project, parentId)
      if (!parent) return {}
      const item = createItem(type, title ?? (type === 'folder' ? '새 폴더' : '제목 없음'), parentId, {
        id,
      })
      project.items[id] = item
      parent.childIds = [...parent.childIds, id]
      parent.expanded = true
      touch(project)
      // 제목을 지정하지 않은 추가(=UI '새 텍스트/새 폴더' 버튼)는 곧바로 인라인 이름 편집 상태로(파일명 입력 유도).
      return { project, activeId: id, selectedIds: [id], dirty: true, ...(title ? {} : { renameId: id }) }
    })
    return id
  },

  addProjectEntry: (spec) => {
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      const rootId = spec.root === 'draft' ? DRAFT_ROOT : RESEARCH_ROOT
      const rootItem = project.items[rootId]
      if (!rootItem) return {}
      let parentId = rootId
      if (spec.folder) {
        let fid = rootItem.childIds.find((cid) => {
          const it = project.items[cid]
          return !!it && it.type === 'folder' && it.title === spec.folder
        })
        if (!fid) {
          fid = newId()
          project.items[fid] = createItem('folder', spec.folder, rootId, { id: fid })
          rootItem.childIds = [...rootItem.childIds, fid]
          rootItem.expanded = true
        }
        parentId = fid
      }
      const parent = project.items[parentId]
      if (!parent) return {}
      let item
      if (spec.kind === 'character' || spec.kind === 'setting') {
        const character: Record<string, string> = { ...(spec.character || {}), _kind: spec.kind === 'setting' ? 'setting' : 'character' }
        const defs = spec.kind === 'setting' ? SETTING_FIELDS : CHARACTER_FIELDS
        item = createItem('character', spec.title || character.name || (spec.kind === 'setting' ? '새 장소' : '새 인물'), parentId, {
          id, character, bodyRtf: spec.bodyRtf || characterToRtf(character, defs), icon: spec.icon,
        })
      } else {
        item = createItem('text', spec.title || '제목 없음', parentId, { id, bodyRtf: spec.bodyRtf || '', icon: spec.icon })
      }
      if (spec.synopsis) item.synopsis = spec.synopsis
      if (spec.meta) {
        item.customMeta = { ...(item.customMeta || {}) }
        for (const [k, v] of Object.entries(spec.meta)) {
          if (!v) continue
          let f = project.customFields.find((cf) => cf.name === k)
          if (!f) { f = { id: newId(), name: k, type: 'text' as const }; project.customFields = [...project.customFields, f] }
          item.customMeta[f.id] = String(v)
        }
      }
      recount(item)
      project.items[id] = item
      parent.childIds = [...parent.childIds, id]
      parent.expanded = true
      touch(project)
      return { project, dirty: true }
    })
    return id
  },

  addMediaItem: (parentId, type, title, blobId, mime) => {
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      const parent = cloneItem(project, parentId)
      if (!parent) return {}
      const item = createItem(type, title, parentId, { id, blobId, mime })
      project.items[id] = item
      parent.childIds = [...parent.childIds, id]
      parent.expanded = true
      touch(project)
      return { project, activeId: id, selectedIds: [id], dirty: true }
    })
    return id
  },

  addFromTemplate: (templateId, parentId) => {
    const tpl = DOC_TEMPLATES.find((t) => t.id === templateId)
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      const parent = cloneItem(project, parentId)
      if (!parent || !tpl) return {}
      let item
      if (tpl.kind === 'character-card' || tpl.kind === 'setting-card') {
        const character: Record<string, string> = { _kind: tpl.kind === 'setting-card' ? 'setting' : 'character' }
        const defs = tpl.kind === 'setting-card' ? SETTING_FIELDS : CHARACTER_FIELDS
        item = createItem('character', tpl.kind === 'setting-card' ? '새 장소' : '새 인물', parentId, {
          id,
          character,
          bodyRtf: characterToRtf(character, defs),
          icon: tpl.icon,
        })
      } else if (tpl.kind === 'text-sheet') {
        item = createItem('text', tpl.id === 'setting-sheet' ? '새 장소' : '새 인물', parentId, {
          id,
          bodyRtf: tpl.rtf,
          icon: tpl.icon,
        })
      } else {
        item = createItem('text', '제목 없음', parentId, { id })
      }
      recount(item)
      project.items[id] = item
      parent.childIds = [...parent.childIds, id]
      parent.expanded = true
      touch(project)
      return { project, activeId: id, selectedIds: [id], dirty: true }
    })
    return id
  },

  applyStructure: (structureId, parentId) => {
    const structure = STRUCTURES.find((x) => x.id === structureId)
    if (!structure) return null
    let rootFolderId: string | null = null
    set((s) => {
      const project = clone(s.project)
      if (!project.items[parentId]) return {}
      const build = (beat: Beat, pid: string): string => {
        const id = newId()
        const isFolder = !!beat.folder || !!beat.children?.length
        const item = createItem(isFolder ? 'folder' : 'text', beat.title, pid, { id, synopsis: beat.synopsis })
        project.items[id] = item
        const parent = cloneItem(project, pid)
        if (parent) parent.childIds = [...parent.childIds, id]
        beat.children?.forEach((child) => build(child, id))
        return id
      }
      // 구조 전체를 담는 폴더를 만들고 그 안에 비트를 생성
      const folderId = newId()
      const folder = createItem('folder', structure.name, parentId, { id: folderId })
      project.items[folderId] = folder
      const top = cloneItem(project, parentId)
      if (top) {
        top.childIds = [...top.childIds, folderId]
        top.expanded = true
      }
      structure.beats.forEach((beat) => build(beat, folderId))
      rootFolderId = folderId
      touch(project)
      return { project, activeId: folderId, selectedIds: [folderId], dirty: true }
    })
    return rootFolderId
  },

  setCharacterField: (id, key, value) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      const character = { ...(it.character || {}), [key]: value }
      it.character = character
      // 이름 필드는 문서 제목으로 동기화
      if (key === 'name' && value.trim()) it.title = value.trim()
      // 구조화 필드 → 본문 RTF 자동 생성(컴파일/검색/내보내기 호환)
      it.bodyRtf = characterToRtf(character, charDefs(character))
      recount(it)
      it.modified = Date.now()
      touch(project)
      return { project, dirty: true }
    }),

  setItemIcon: (id, icon) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      if (icon) it.icon = icon
      else delete it.icon
      touch(project)
      return { project, dirty: true }
    }),

  renameItem: (id, title) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.title = title
      it.modified = Date.now()
      touch(project)
      return { project, dirty: true }
    }),

  setRenameId: (id) => set({ renameId: id }),

  moveToTrash: (id) =>
    set((s) => {
      const project = clone(s.project)
      const it = project.items[id]
      if (!it || it.root) return {}
      const prevParent = it.parentId
      detach(project, id)
      const trash = cloneItem(project, TRASH_ROOT)
      const moved = cloneItem(project, id)
      if (!trash || !moved) return {}
      moved.originalParentId = prevParent
      moved.parentId = TRASH_ROOT
      trash.childIds = [...trash.childIds, id]
      touch(project)
      // 휴지통으로 보낸 서브트리 전체(자손 포함)를 active/선택에서 정리 — 자식 문서가 열려 있어도 편집 차단
      const toClear: string[] = []
      const gather = (cid: string) => {
        toClear.push(cid)
        project.items[cid]?.childIds.forEach(gather)
      }
      gather(id)
      const clearSet = new Set(toClear)
      const activeId = s.activeId && clearSet.has(s.activeId) ? null : s.activeId
      return { project, dirty: true, activeId, selectedIds: s.selectedIds.filter((x) => !clearSet.has(x)) }
    }),

  emptyTrash: () =>
    set((s) => {
      const project = clone(s.project)
      const trash = cloneItem(project, TRASH_ROOT)
      if (!trash) return {}
      const toRemove: string[] = []
      const gather = (cid: string) => {
        toRemove.push(cid)
        project.items[cid]?.childIds.forEach(gather)
      }
      trash.childIds.forEach(gather)
      const removeSet = new Set(toRemove)
      const removedBlobIds = toRemove.map((rid) => project.items[rid]?.blobId).filter(Boolean) as string[]
      toRemove.forEach((rid) => {
        delete project.items[rid]
        delete project.snapshots[rid]
      })
      trash.childIds = []
      project.collections = project.collections.map((c) => ({
        ...c,
        itemIds: c.itemIds.filter((x) => !removeSet.has(x)),
      }))
      reapBlobs(project, removedBlobIds)
      touch(project)
      const activeId = s.activeId && toRemove.includes(s.activeId) ? null : s.activeId
      // 영구 삭제된 항목을 선택 목록에서도 제거(존재하지 않는 id 잔존 방지).
      return { project, dirty: true, activeId, selectedIds: s.selectedIds.filter((x) => !removeSet.has(x)) }
    }),

  deleteForever: (id) =>
    set((s) => {
      const project = clone(s.project)
      const it = project.items[id]
      if (!it || it.root) return {}
      detach(project, id)
      const toRemove: string[] = []
      const gather = (cid: string) => {
        toRemove.push(cid)
        project.items[cid]?.childIds.forEach(gather)
      }
      gather(id)
      const removeSet = new Set(toRemove)
      const removedBlobIds = toRemove.map((rid) => project.items[rid]?.blobId).filter(Boolean) as string[]
      toRemove.forEach((rid) => {
        delete project.items[rid]
        delete project.snapshots[rid]
      })
      project.collections = project.collections.map((c) => ({
        ...c,
        itemIds: c.itemIds.filter((x) => !removeSet.has(x)),
      }))
      reapBlobs(project, removedBlobIds)
      touch(project)
      const activeId = s.activeId && toRemove.includes(s.activeId) ? null : s.activeId
      // 영구 삭제된 항목을 선택 목록에서도 제거(존재하지 않는 id 잔존 방지).
      return { project, dirty: true, activeId, selectedIds: s.selectedIds.filter((x) => !removeSet.has(x)) }
    }),

  moveItem: (id, newParentId, index) =>
    set((s) => {
      const items = s.project.items
      if (id === newParentId) return {}
      if (isDescendant(items, id, newParentId)) return {} // 자기 자손으로 이동 금지
      const target = items[newParentId]
      if (!target) return {}
      // 원고(draft) 하위는 텍스트/폴더만 (현재 모든 아이템이 텍스트/폴더라 통과)
      const project = clone(s.project)
      detach(project, id)
      const moved = cloneItem(project, id)
      const parent = cloneItem(project, newParentId)
      if (!moved || !parent) return {}
      moved.parentId = newParentId
      const arr = parent.childIds.filter((c) => c !== id)
      // 같은 부모 안에서 아래로 끌 때: detach 로 드래그 항목이 빠지면 타깃 인덱스가 1 줄어들므로 보정한다.
      // (호출부는 드래그 항목이 아직 포함된 원본 childIds 기준 인덱스를 넘김)
      const origIdx = s.project.items[newParentId]?.childIds.indexOf(id) ?? -1
      let idx = index
      if (origIdx >= 0 && origIdx < idx) idx -= 1
      const clamped = Math.max(0, Math.min(idx, arr.length))
      arr.splice(clamped, 0, id)
      parent.childIds = arr
      parent.expanded = true
      touch(project)
      return { project, dirty: true }
    }),

  toggleExpanded: (id) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.expanded = !it.expanded
      // 펼침/접힘은 원고 변경이 아니다. modified 만 bump 해 영속(autosave)은 시키되,
      // '미저장' 배지·이탈 경고·세션 집필량과 분리하기 위해 dirty 가 아닌 uiDirty 로만 표시한다.
      touch(project)
      return { project, uiDirty: true }
    }),

  convertType: (id, type) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      // 폴더 → 비폴더 변환 시 자식이 있으면 먼저 그룹 해제(자식을 상위로 끌어올림).
      // 자식 달린 'text' 문서가 생겨 펼침/그룹해제가 불가해지고 단어수가 중복 집계되던 문제 방지.
      if (it.type === 'folder' && type !== 'folder' && it.childIds.length && it.parentId) {
        const parent = cloneItem(project, it.parentId)
        if (parent) {
          const kids = [...it.childIds]
          kids.forEach((cid) => { const c = cloneItem(project, cid); if (c) c.parentId = it.parentId })
          const at = parent.childIds.indexOf(id)
          parent.childIds = [...parent.childIds.slice(0, at + 1), ...kids, ...parent.childIds.slice(at + 1)]
          it.childIds = []
        }
      }
      it.type = type
      touch(project)
      return { project, dirty: true }
    }),

  duplicateItem: (id) =>
    set((s) => {
      const project = clone(s.project)
      const src = project.items[id]
      if (!src || src.root) return {}
      // 하위 트리까지 재귀 복제(새 id 부여)
      const copyOne = (srcId: string, parentId: string | null, suffix: string): string => {
        const o = project.items[srcId]
        const nid = newId()
        const copy = createItem(o.type, o.title + suffix, parentId, {
          id: nid,
          bodyRtf: o.bodyRtf,
          synopsis: o.synopsis,
          notes: o.notes,
          labelId: o.labelId,
          statusId: o.statusId,
          keywordIds: [...o.keywordIds],
          includeInCompile: o.includeInCompile,
          customMeta: { ...o.customMeta },
          target: o.target,
          wordCount: o.wordCount,
          charCount: o.charCount,
          plainText: o.plainText,
          expanded: o.expanded,
          childIds: [],
          // 새 필드들도 함께 복제(누락 방지)
          sectionTypeId: o.sectionTypeId,
          pageBreakBefore: o.pageBreakBefore,
          compileAsIs: o.compileAsIs,
          scriptMode: o.scriptMode,
          blobId: o.blobId, // 미디어 blob 은 불변 — 공유 참조로 안전
          mime: o.mime,
          character: o.character ? { ...o.character } : undefined,
          icon: o.icon,
          bookmarks: o.bookmarks ? [...o.bookmarks] : undefined,
        })
        project.items[nid] = copy
        // 스냅샷 이력도 사본으로 깊은 복사(각 스냅샷 id 는 새로 발급) — 사본에서도 과거 버전 복원 가능.
        const srcSnaps = project.snapshots[srcId]
        if (srcSnaps && srcSnaps.length) {
          project.snapshots = {
            ...project.snapshots,
            [nid]: srcSnaps.map((sn) => ({ ...sn, id: newId() })),
          }
        }
        copy.childIds = o.childIds.map((c) => copyOne(c, nid, ''))
        return nid
      }
      const copyId = copyOne(id, src.parentId, ' 사본')
      if (src.parentId) {
        const parent = cloneItem(project, src.parentId)
        if (parent) {
          const i = parent.childIds.indexOf(id)
          parent.childIds = [...parent.childIds.slice(0, i + 1), copyId, ...parent.childIds.slice(i + 1)]
        }
      }
      touch(project)
      return { project, dirty: true, activeId: copyId, selectedIds: [copyId] }
    }),

  splitDocument: (id, beforeHtml, afterHtml, title) =>
    set((s) => {
      const src = s.project.items[id]
      if (!src || !src.parentId) return {}
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.bodyRtf = htmlToRtf(beforeHtml)
      recount(it)
      it.modified = Date.now()
      const nid = newId()
      const ni = createItem('text', title || src.title + ' (이어서)', src.parentId, {
        id: nid,
        bodyRtf: htmlToRtf(afterHtml),
        labelId: src.labelId,
        statusId: src.statusId,
        keywordIds: [...src.keywordIds],
        includeInCompile: src.includeInCompile,
        sectionTypeId: src.sectionTypeId,
        scriptMode: src.scriptMode,
      })
      recount(ni)
      project.items[nid] = ni
      const parent = cloneItem(project, src.parentId)
      if (!parent) return {}
      const i = parent.childIds.indexOf(id)
      parent.childIds = [...parent.childIds.slice(0, i + 1), nid, ...parent.childIds.slice(i + 1)]
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true, activeId: nid, selectedIds: [nid] }
    }),

  mergeDocuments: (ids) =>
    set((s) => {
      // 폴더는 병합 대상에서 제외(폴더가 섞이면 하위 문서가 본문 병합 없이 삭제되던 데이터 손실 차단)
      const order = flattenAll(s.project).filter((x) => ids.includes(x) && !s.project.items[x]?.root && s.project.items[x]?.type !== 'folder')
      if (order.length < 2) return {}
      // 서로 다른 부모(장/폴더)의 문서를 한 문서로 합치는 비가역 작업은 데이터 손실 위험이 크다.
      // 동일 부모가 아니면 명시적으로 경고하고 사용자가 취소할 수 있게 한다.
      const parents = new Set(order.map((oid) => s.project.items[oid]?.parentId ?? null))
      if (parents.size > 1) {
        const proceed =
          typeof window === 'undefined' ||
          window.confirm(
            `서로 다른 폴더(장)의 ${order.length}개 문서를 하나로 합칩니다.\n` +
              `이 작업은 되돌릴 수 없습니다(병합 전 스냅샷/백업을 권장).\n계속할까요?`,
          )
        if (!proceed) return {}
      }
      const project = clone(s.project)
      const survivor = cloneItem(project, order[0])
      if (!survivor) return {}
      let html = rtfToHtml(survivor.bodyRtf)
      const syn = survivor.synopsis ? [survivor.synopsis] : []
      const kw = new Set(survivor.keywordIds)
      const removedAll: string[] = []
      for (const oid of order.slice(1)) {
        const o = project.items[oid]
        if (!o) continue
        html += rtfToHtml(o.bodyRtf)
        if (o.synopsis) syn.push(o.synopsis)
        o.keywordIds.forEach((k) => kw.add(k))
        if (project.snapshots[oid])
          project.snapshots[survivor.id] = [
            ...(project.snapshots[survivor.id] || []),
            ...project.snapshots[oid],
          ]
        detach(project, oid)
        removedAll.push(...removeSubtree(project, oid))
      }
      const removedSet = new Set(removedAll)
      project.collections = project.collections.map((c) => ({
        ...c,
        itemIds: c.itemIds.filter((x) => !removedSet.has(x)),
      }))
      survivor.bodyRtf = htmlToRtf(html)
      recount(survivor)
      survivor.synopsis = syn.join('\n\n')
      survivor.keywordIds = [...kw]
      survivor.modified = Date.now()
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true, activeId: survivor.id, selectedIds: [survivor.id] }
    }),

  groupSelection: (ids) =>
    set((s) => {
      const sel = flattenAll(s.project).filter((x) => ids.includes(x) && !s.project.items[x]?.root)
      if (!sel.length) return {}
      const project = clone(s.project)
      const parentId = project.items[sel[0]].parentId || 'root-draft'
      const insertIndex = project.items[parentId].childIds.indexOf(sel[0])
      sel.forEach((sid) => detach(project, sid))
      const folderId = newId()
      const folder = createItem('folder', '새 폴더', parentId, { id: folderId, childIds: [...sel] })
      project.items[folderId] = folder
      sel.forEach((sid) => {
        project.items[sid] = { ...project.items[sid], parentId: folderId }
      })
      const parent = cloneItem(project, parentId)
      if (!parent) return {}
      const arr = parent.childIds.filter((c) => c !== folderId)
      arr.splice(Math.max(0, Math.min(insertIndex, arr.length)), 0, folderId)
      parent.childIds = arr
      parent.expanded = true
      touch(project)
      return { project, dirty: true, activeId: folderId, selectedIds: [folderId] }
    }),

  ungroup: (folderId) =>
    set((s) => {
      const folder = s.project.items[folderId]
      if (!folder || folder.root || folder.type !== 'folder' || !folder.parentId) return {}
      const project = clone(s.project)
      const parentId = folder.parentId
      const children = [...folder.childIds]
      const parent = cloneItem(project, parentId)
      if (!parent) return {}
      const idx = parent.childIds.indexOf(folderId)
      children.forEach((c) => {
        project.items[c] = { ...project.items[c], parentId }
      })
      const arr = parent.childIds.filter((c) => c !== folderId)
      arr.splice(idx, 0, ...children)
      parent.childIds = arr
      delete project.items[folderId]
      delete project.snapshots[folderId]
      touch(project)
      return { project, dirty: true, selectedIds: children, activeId: children[0] || parentId }
    }),

  restoreFromTrash: (id) =>
    set((s) => {
      const it = s.project.items[id]
      if (!it) return {}
      // 휴지통(하위)에 있는 항목만 복원한다. 정상 문서를 폴더 밖(root-draft)으로 끌어내는 회귀 방지.
      if (!isInTrash(s.project, id)) return {}
      const project = clone(s.project)
      detach(project, id)
      // 원래 부모가 아직 휴지통 안이면 원고 루트로 복원
      const parentInTrash = (pid: string | null | undefined): boolean => {
        let cur = pid ?? null
        while (cur) {
          if (project.items[cur]?.root === 'trash') return true
          cur = project.items[cur]?.parentId ?? null
        }
        return false
      }
      const op = it.originalParentId
      const target = op && project.items[op] && !parentInTrash(op) ? op : 'root-draft'
      const moved = cloneItem(project, id)
      const parent = cloneItem(project, target)
      if (!moved || !parent) return {}
      moved.parentId = target
      moved.originalParentId = null
      parent.childIds = [...parent.childIds, id]
      parent.expanded = true
      touch(project)
      return { project, dirty: true, activeId: id, selectedIds: [id] }
    }),

  moveRelative: (id, dir) =>
    set((s) => {
      const it = s.project.items[id]
      if (!it || !it.parentId) return {}
      const siblings = s.project.items[it.parentId].childIds
      const i = siblings.indexOf(id)
      const j = i + dir
      if (j < 0 || j >= siblings.length) return {}
      const project = clone(s.project)
      const parent = cloneItem(project, it.parentId)
      if (!parent) return {}
      const arr = [...parent.childIds]
      arr.splice(i, 1)
      arr.splice(j, 0, id)
      parent.childIds = arr
      touch(project)
      return { project, dirty: true }
    }),

  appendToDocument: (targetId, html) =>
    set((s) => {
      const t = s.project.items[targetId]
      if (!t) return {}
      const project = clone(s.project)
      const it = cloneItem(project, targetId)
      if (!it) return {}
      it.bodyRtf = htmlToRtf(rtfToHtml(it.bodyRtf) + html)
      recount(it)
      it.modified = Date.now()
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true }
    }),

  setBodyHtml: (id, html) => {
    const rtf = htmlToRtf(html)
    get().setBodyRtf(id, rtf)
  },

  setBodyRtf: (id, rtf) =>
    set((s) => {
      const cur = s.project.items[id]
      if (!cur) return {}
      if (cur.bodyRtf === rtf) return {} // 내용 무변경 재저장 차단(읽기용 클릭→blur 의 허위 dirty/modified/집필량 과대집계 방지)
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.bodyRtf = rtf
      recount(it)
      it.modified = Date.now()
      recordWriting(project)
      touch(project)
      return { project, dirty: true }
    }),

  setSynopsis: (id, v) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.synopsis = v
      it.modified = Date.now()
      touch(project)
      return { project, dirty: true }
    }),

  setNotes: (id, v) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.notes = v
      touch(project)
      return { project, dirty: true }
    }),

  setLabel: (id, labelId) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.labelId = labelId
      touch(project)
      return { project, dirty: true }
    }),

  setStatus: (id, statusId) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.statusId = statusId
      touch(project)
      return { project, dirty: true }
    }),

  toggleKeyword: (id, keywordId) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.keywordIds = it.keywordIds.includes(keywordId)
        ? it.keywordIds.filter((k) => k !== keywordId)
        : [...it.keywordIds, keywordId]
      touch(project)
      return { project, dirty: true }
    }),

  setInclude: (id, v) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.includeInCompile = v
      touch(project)
      return { project, dirty: true }
    }),

  setTarget: (id, t) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.target = t
      touch(project)
      return { project, dirty: true }
    }),

  setCustomMeta: (id, field, value) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.customMeta = { ...it.customMeta, [field]: value }
      touch(project)
      return { project, dirty: true }
    }),

  addLabel: (name, color) =>
    set((s) => {
      const project = clone(s.project)
      project.labels = [...project.labels, { id: newId(), name, color }]
      touch(project)
      return { project, dirty: true }
    }),

  updateLabel: (l) =>
    set((s) => {
      const project = clone(s.project)
      project.labels = project.labels.map((x) => (x.id === l.id ? l : x))
      touch(project)
      return { project, dirty: true }
    }),

  addStatus: (name) =>
    set((s) => {
      const project = clone(s.project)
      project.statuses = [...project.statuses, { id: newId(), name }]
      touch(project)
      return { project, dirty: true }
    }),

  addKeyword: (name, color) =>
    set((s) => {
      const project = clone(s.project)
      project.keywords = [...project.keywords, { id: newId(), name, color }]
      touch(project)
      return { project, dirty: true }
    }),

  deleteKeyword: (id) =>
    set((s) => {
      const project = clone(s.project)
      project.keywords = project.keywords.filter((k) => k.id !== id)
      // 모든 아이템의 keywordIds 에서 제거(deleteStatus 패턴) — 고아 참조 방지.
      Object.keys(project.items).forEach((iid) => {
        const it = project.items[iid]
        if (it.keywordIds.includes(id)) project.items[iid] = { ...it, keywordIds: it.keywordIds.filter((k) => k !== id) }
      })
      touch(project)
      return { project, dirty: true }
    }),

  renameKeyword: (id, name) =>
    set((s) => {
      const project = clone(s.project)
      project.keywords = project.keywords.map((k) => (k.id === id ? { ...k, name } : k))
      touch(project)
      return { project, dirty: true }
    }),

  recolorKeyword: (id, color) =>
    set((s) => {
      const project = clone(s.project)
      project.keywords = project.keywords.map((k) => (k.id === id ? { ...k, color } : k))
      touch(project)
      return { project, dirty: true }
    }),

  setProjectTarget: (n) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, projectTarget: n }
      touch(project)
      return { project, dirty: true }
    }),

  setSessionTarget: (n) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, sessionTarget: n }
      touch(project)
      return { project, dirty: true }
    }),

  setDeadline: (iso) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, deadline: iso || undefined }
      touch(project)
      return { project, dirty: true }
    }),

  addCollection: (name, itemIds) =>
    set((s) => {
      const project = clone(s.project)
      const col: Collection = {
        id: newId(),
        name,
        type: 'standard',
        color: '#4285f4',
        itemIds,
      }
      project.collections = [...project.collections, col]
      touch(project)
      return { project, dirty: true }
    }),

  addSearchCollection: (name, query, options) =>
    set((s) => {
      const project = clone(s.project)
      project.collections = [
        ...project.collections,
        { id: newId(), name, type: 'search', color: '#0f9d58', itemIds: [], query, options },
      ]
      touch(project)
      return { project, dirty: true }
    }),

  deleteCollection: (id) =>
    set((s) => {
      const project = clone(s.project)
      project.collections = project.collections.filter((c) => c.id !== id)
      touch(project)
      return { project, dirty: true, activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId }
    }),
  renameCollection: (id, name) =>
    set((s) => {
      const project = clone(s.project)
      project.collections = project.collections.map((c) => (c.id === id ? { ...c, name } : c))
      touch(project)
      return { project, dirty: true }
    }),

  setActiveCollection: (id) => set({ activeCollectionId: id }),

  addToCollection: (colId, ids) =>
    set((s) => {
      const project = clone(s.project)
      project.collections = project.collections.map((c) =>
        c.id === colId ? { ...c, itemIds: [...new Set([...c.itemIds, ...ids])] } : c,
      )
      touch(project)
      return { project, dirty: true }
    }),

  removeFromCollection: (colId, id) =>
    set((s) => {
      const project = clone(s.project)
      project.collections = project.collections.map((c) =>
        c.id === colId ? { ...c, itemIds: c.itemIds.filter((x) => x !== id) } : c,
      )
      touch(project)
      return { project, dirty: true }
    }),

  resetSession: () => set((s) => ({ sessionStartWords: totalDraftWords(s.project), sessionStartChars: totalDraftChars(s.project) })),

  deleteLabel: (id) =>
    set((s) => {
      if (id === 'label-none') return {}
      const project = clone(s.project)
      project.labels = project.labels.filter((l) => l.id !== id)
      Object.keys(project.items).forEach((iid) => {
        if (project.items[iid].labelId === id) project.items[iid] = { ...project.items[iid], labelId: null }
      })
      touch(project)
      return { project, dirty: true }
    }),

  deleteStatus: (id) =>
    set((s) => {
      if (id === 'status-none') return {}
      const project = clone(s.project)
      project.statuses = project.statuses.filter((st) => st.id !== id)
      Object.keys(project.items).forEach((iid) => {
        if (project.items[iid].statusId === id) project.items[iid] = { ...project.items[iid], statusId: null }
      })
      touch(project)
      return { project, dirty: true }
    }),

  addSectionType: (name) =>
    set((s) => {
      const project = clone(s.project)
      project.sectionTypes = [...project.sectionTypes, { id: newId(), name }]
      touch(project)
      return { project, dirty: true }
    }),

  renameSectionType: (id, name) =>
    set((s) => {
      const project = clone(s.project)
      project.sectionTypes = project.sectionTypes.map((t) => (t.id === id ? { ...t, name } : t))
      touch(project)
      return { project, dirty: true }
    }),

  deleteSectionType: (id) =>
    set((s) => {
      const project = clone(s.project)
      project.sectionTypes = project.sectionTypes.filter((t) => t.id !== id)
      touch(project)
      return { project, dirty: true }
    }),

  setSectionType: (id, sectionTypeId) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.sectionTypeId = sectionTypeId
      touch(project)
      return { project, dirty: true }
    }),

  togglePageBreak: (id, v) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.pageBreakBefore = v
      touch(project)
      return { project, dirty: true }
    }),

  toggleScriptMode: (id, v) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.scriptMode = v
      touch(project)
      return { project, dirty: true }
    }),

  addCustomField: (name, type) =>
    set((s) => {
      const project = clone(s.project)
      project.customFields = [...project.customFields, { id: newId(), name, type }]
      touch(project)
      return { project, dirty: true }
    }),

  deleteCustomField: (id) =>
    set((s) => {
      const project = clone(s.project)
      project.customFields = project.customFields.filter((f) => f.id !== id)
      touch(project)
      return { project, dirty: true }
    }),

  setProjectNotes: (v) =>
    set((s) => {
      const project = clone(s.project)
      project.projectNotes = v
      touch(project)
      return { project, dirty: true }
    }),

  addBookmark: (scope, bm) =>
    set((s) => {
      const project = clone(s.project)
      const entry = { id: newId(), ...bm }
      if (scope === 'project') {
        project.projectBookmarks = [...(project.projectBookmarks || []), entry]
      } else {
        const it = cloneItem(project, scope)
        if (!it) return {}
        it.bookmarks = [...(it.bookmarks || []), entry]
      }
      touch(project)
      return { project, dirty: true }
    }),

  removeBookmark: (scope, bmId) =>
    set((s) => {
      const project = clone(s.project)
      if (scope === 'project') {
        project.projectBookmarks = (project.projectBookmarks || []).filter((b) => b.id !== bmId)
      } else {
        const it = cloneItem(project, scope)
        if (!it) return {}
        it.bookmarks = (it.bookmarks || []).filter((b) => b.id !== bmId)
      }
      touch(project)
      return { project, dirty: true }
    }),

  setTheme: (t) =>
    set((s) => {
      try { localStorage.setItem('sry:theme', t) } catch { /* noop */ } // 전역 테마 선호 영속(새 프로젝트가 계승)
      const project = clone(s.project)
      project.settings = { ...project.settings, theme: t }
      touch(project)
      return { project, dirty: true }
    }),

  setAutosaveInterval: (ms) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, autosaveInterval: ms }
      touch(project)
      return { project, dirty: true }
    }),

  toggleTypewriter: () =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, typewriterScrolling: !project.settings.typewriterScrolling }
      touch(project)
      return { project, dirty: true }
    }),

  toggleAutoComplete: () =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, autoComplete: project.settings.autoComplete === false }
      touch(project)
      return { project, dirty: true }
    }),

  addAutoComplete: (word) =>
    set((s) => {
      const w = word.trim()
      if (!w) return {}
      const project = clone(s.project)
      const list = project.settings.autoCompleteList || []
      if (list.some((x) => x.toLowerCase() === w.toLowerCase())) return {}
      project.settings = { ...project.settings, autoCompleteList: [...list, w] }
      touch(project)
      return { project, dirty: true }
    }),

  removeAutoComplete: (word) =>
    set((s) => {
      const project = clone(s.project)
      const list = project.settings.autoCompleteList || []
      project.settings = { ...project.settings, autoCompleteList: list.filter((x) => x !== word) }
      touch(project)
      return { project, dirty: true }
    }),

  setSearchOptions: (patch) => set((s) => ({ searchOptions: { ...s.searchOptions, ...patch } })),

  projectReplace: (find, replace, opts) => {
    if (!find) return 0
    let count = 0
    const flags = opts.caseSensitive ? 'g' : 'gi'
    const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = opts.wholeWord ? `(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])` : esc
    const re = () => new RegExp(pattern, flags + 'u')
    const repl = (text: string): string => {
      const r = re()
      return text.replace(r, () => {
        count++
        return replace
      })
    }
    set((s) => {
      const project = clone(s.project)
      for (const id of Object.keys(project.items)) {
        const src = project.items[id]
        let changed = false
        const next = { ...src }
        if (opts.inTitles && re().test(next.title)) {
          next.title = repl(next.title)
          changed = true
        }
        if (opts.inSynopses && next.synopsis && re().test(next.synopsis)) {
          next.synopsis = repl(next.synopsis)
          changed = true
        }
        if (opts.inNotes && next.notes && re().test(next.notes)) {
          next.notes = repl(next.notes)
          changed = true
        }
        if (opts.inText && next.type === 'text' && next.bodyRtf) {
          const doc = parseRtf(next.bodyRtf)
          let bodyChanged = false
          for (const b of doc.blocks)
            for (const run of b.runs) {
              if (re().test(run.text)) {
                run.text = repl(run.text)
                bodyChanged = true
              }
            }
          if (bodyChanged) {
            // 데이터 안전: 본문이 실제로 바뀌는 문서는 치환 '이전' 본문을 자동 스냅샷으로 남긴다
            //  → 전체 바꾸기가 잘못돼도 인스펙터 › 스냅샷에서 문서별로 되돌릴 수 있다(비가역 → 가역).
            const preSnap: Snapshot = { id: newId(), title: `찾아 바꾸기 전 (${find} → ${replace || '삭제'})`, date: Date.now(), bodyRtf: src.bodyRtf, wordCount: src.wordCount }
            project.snapshots = { ...project.snapshots, [id]: [preSnap, ...(project.snapshots[id] || [])] }
            next.bodyRtf = serializeRtf(doc)
            recount(next)
            changed = true
          }
        }
        if (changed) {
          next.modified = Date.now()
          project.items[id] = next
        }
      }
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true }
    })
    return count
  },

  setAnnotation: (id, kind, index, text) =>
    set((s) => {
      const src = s.project.items[id]
      if (!src) return {}
      const doc = parseRtf(src.bodyRtf)
      let n = 0
      let done = false
      for (const b of doc.blocks) {
        for (const r of b.runs) {
          const match = kind === 'footnote' ? r.style.footnote != null : r.style.comment != null
          if (match) {
            if (n === index) {
              if (kind === 'footnote') r.style.footnote = text
              else r.style.comment = text
              done = true
              break
            }
            n++
          }
        }
        if (done) break
      }
      if (!done) return {}
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.bodyRtf = serializeRtf(doc)
      it.modified = Date.now()
      touch(project)
      return { project, dirty: true }
    }),

  deleteAnnotation: (id, kind, index) =>
    set((s) => {
      const src = s.project.items[id]
      if (!src) return {}
      const doc = parseRtf(src.bodyRtf)
      let n = 0
      let done = false
      for (const b of doc.blocks) {
        const idx = b.runs.findIndex((r) => {
          const match = kind === 'footnote' ? r.style.footnote != null : r.style.comment != null
          if (!match) return false
          if (n === index) return true
          n++
          return false
        })
        if (idx >= 0) {
          // 코멘트 삭제 시: 마커 앞/뒤로 붙어 있던 같은 색 형광펜(코멘트 범위 표시)을 함께 제거해
          // 고아 하이라이트가 본문에 남지 않게 한다. (다른 색·일반 형광펜은 보존)
          if (kind === 'comment') {
            const isCommentHi = (r: { style: { highlight?: string } }) =>
              !!r.style.highlight && r.style.highlight.toLowerCase() === COMMENT_HIGHLIGHT
            for (let j = idx - 1; j >= 0 && isCommentHi(b.runs[j]); j--) delete b.runs[j].style.highlight
            for (let j = idx + 1; j < b.runs.length && isCommentHi(b.runs[j]); j++) delete b.runs[j].style.highlight
          }
          b.runs.splice(idx, 1)
          done = true
          break
        }
      }
      if (!done) return {}
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.bodyRtf = serializeRtf(doc)
      recount(it)
      it.modified = Date.now()
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true }
    }),

  takeSnapshot: (id, title) =>
    set((s) => {
      const project = clone(s.project)
      const it = project.items[id]
      if (!it) return {}
      const snap: Snapshot = {
        id: newId(),
        title: title || '',
        date: Date.now(),
        bodyRtf: it.bodyRtf,
        wordCount: it.wordCount,
      }
      project.snapshots = { ...project.snapshots, [id]: [snap, ...(project.snapshots[id] || [])] }
      touch(project)
      return { project, dirty: true }
    }),

  rollbackSnapshot: (id, snapshotId) =>
    set((s) => {
      const snap = s.project.snapshots[id]?.find((x) => x.id === snapshotId)
      if (!snap) return {}
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      // 데이터 안전: 덮어쓰기 전에 현재 본문을 자동 스냅샷으로 먼저 보존(안내문구와 동작 일치).
      // 직전 원고가 영구 소실되지 않도록 '되돌리기 전 자동저장' 스냅샷을 남긴다.
      if (it.bodyRtf !== snap.bodyRtf) {
        const autoSnap: Snapshot = {
          id: newId(),
          title: '되돌리기 전 자동저장',
          date: Date.now(),
          bodyRtf: it.bodyRtf,
          wordCount: it.wordCount,
        }
        project.snapshots = { ...project.snapshots, [id]: [autoSnap, ...(project.snapshots[id] || [])] }
      }
      it.bodyRtf = snap.bodyRtf
      // recount 로 wordCount/charCount 와 plainText 캐시를 본문에서 일관되게 재계산(stale plainText 방지).
      recount(it)
      it.modified = Date.now()
      syncDraftBaseline(project)
      touch(project)
      return { project, dirty: true }
    }),

  deleteSnapshot: (id, snapshotId) =>
    set((s) => {
      const project = clone(s.project)
      project.snapshots = {
        ...project.snapshots,
        [id]: (project.snapshots[id] || []).filter((x) => x.id !== snapshotId),
      }
      touch(project)
      return { project, dirty: true }
    }),

  select: (id, opts) =>
    set((s) => {
      if (opts?.additive) {
        const selectedIds = s.selectedIds.includes(id)
          ? s.selectedIds.filter((x) => x !== id)
          : [...s.selectedIds, id]
        return { selectedIds, activeId: id, anchorId: id }
      }
      if (opts?.range && (s.anchorId || s.activeId)) {
        // 화면 표시 순서(opts.order)가 있으면 그것으로 범위 계산(정렬된 아웃라이너 등).
        // 앵커는 range 선택에서 갱신하지 않는다 — Shift+↓ 연타가 2행 슬라이딩 창으로 붕괴하지 않게(리뷰 F11).
        const order = opts.order && opts.order.length ? opts.order : flattenVisible(s.project)
        const anchor = s.anchorId && order.indexOf(s.anchorId) >= 0 ? s.anchorId : s.activeId
        const a = anchor ? order.indexOf(anchor) : -1
        const b = order.indexOf(id)
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a]
          return { selectedIds: order.slice(lo, hi + 1), activeId: id }
        }
      }
      return { selectedIds: [id], activeId: id, anchorId: id }
    }),

  setView: (v) => set({ viewMode: v }),
  setInspectorTab: (t) => set({ inspectorTab: t }),
  setUiSkin: (skin) => { try { localStorage.setItem('sry:uiSkin', skin) } catch { /* noop */ } ; set({ uiSkin: skin }) },
  toggleFavorite: (fav) => set((s) => {
    const exists = s.favorites.some((f) => f.id === fav.id)
    const favorites = exists ? s.favorites.filter((f) => f.id !== fav.id) : [...s.favorites, { id: fav.id, label: fav.label }]
    saveFavorites(favorites); return { favorites }
  }),
  removeFavorite: (id) => set((s) => { const favorites = s.favorites.filter((f) => f.id !== id); saveFavorites(favorites); return { favorites } }),
  reorderFavorites: (ids) => set((s) => {
    const map = new Map(s.favorites.map((f) => [f.id, f]))
    const favorites = ids.map((id) => map.get(id)).filter((f): f is Favorite => !!f)
    // 누락분 보존
    for (const f of s.favorites) if (!ids.includes(f.id)) favorites.push(f)
    saveFavorites(favorites); return { favorites }
  }),
  toggleInspector: () => set((s) => ({ inspectorVisible: !s.inspectorVisible })),
  toggleBinder: () => set((s) => ({ binderVisible: !s.binderVisible })),
  toggleComposition: () => set((s) => ({ composition: !s.composition })),
  toggleSplit: () =>
    set((s) => ({ splitId: s.splitId ? null : s.activeId, viewMode: 'editor' })),
  setSplit: (id) => set({ splitId: id }),
  setSplitDir: (d) => set({ splitDir: d }),
  setSearch: (search) => set({ search }),
  setCanvas: (canvas) =>
    set((s) => {
      const project = clone(s.project)
      project.canvas = canvas
      touch(project)
      return { project, dirty: true }
    }),
  setProjectType: (t) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, projectType: t }
      touch(project)
      return { project, dirty: true }
    }),
  setSerialCadence: (n) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, serialCadence: Math.max(0, n) }
      touch(project)
      return { project, dirty: true }
    }),
  patchSettings: (patch) =>
    set((s) => {
      const project = clone(s.project)
      project.settings = { ...project.settings, ...patch }
      touch(project)
      return { project, dirty: true }
    }),
  setDocType: (id, t) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      if (t) it.docType = t
      else delete it.docType
      touch(project)
      return { project, dirty: true }
    }),
  setEpisodeMeta: (id, patch) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.episode = { ...(it.episode || {}), ...patch }
      touch(project)
      return { project, dirty: true }
    }),
  setSeoMeta: (id, patch) =>
    set((s) => {
      const project = clone(s.project)
      const it = cloneItem(project, id)
      if (!it) return {}
      it.seo = { ...(it.seo || {}), ...patch }
      touch(project)
      return { project, dirty: true }
    }),
  addReference: (item) => {
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      project.references = [...(project.references || []), { ...item, id }]
      touch(project)
      return { project, dirty: true }
    })
    return id
  },
  updateReference: (item) =>
    set((s) => {
      const project = clone(s.project)
      project.references = (project.references || []).map((r) => (r.id === item.id ? item : r))
      touch(project)
      return { project, dirty: true }
    }),
  deleteReference: (id) =>
    set((s) => {
      const project = clone(s.project)
      project.references = (project.references || []).filter((r) => r.id !== id)
      touch(project)
      return { project, dirty: true }
    }),
  setThesis: (text) =>
    set((s) => {
      const project = clone(s.project)
      project.argument = { thesis: text, nodes: project.argument?.nodes || [] }
      touch(project)
      return { project, dirty: true }
    }),
  addArgNode: (node) => {
    const id = newId()
    set((s) => {
      const project = clone(s.project)
      const cur = project.argument || { thesis: '', nodes: [] }
      project.argument = { thesis: cur.thesis, nodes: [...cur.nodes, { ...node, id }] }
      touch(project)
      return { project, dirty: true }
    })
    return id
  },
  updateArgNode: (id, patch) =>
    set((s) => {
      const project = clone(s.project)
      const cur = project.argument || { thesis: '', nodes: [] }
      project.argument = { thesis: cur.thesis, nodes: cur.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }
      touch(project)
      return { project, dirty: true }
    }),
  deleteArgNode: (id) =>
    set((s) => {
      const project = clone(s.project)
      const cur = project.argument || { thesis: '', nodes: [] }
      // 노드와 그 자식(근거/반박) 함께 제거
      project.argument = { thesis: cur.thesis, nodes: cur.nodes.filter((n) => n.id !== id && n.parentId !== id) }
      touch(project)
      return { project, dirty: true }
    }),
}))

// ---- 파생 헬퍼 ----
export function totalDraftWords(p: Project): number {
  let sum = 0
  const walk = (id: string) => {
    const it = p.items[id]
    if (!it) return
    if (it.type === 'text' && it.includeInCompile) sum += it.wordCount
    it.childIds.forEach(walk)
  }
  const draft = p.items['root-draft']
  draft?.childIds.forEach(walk)
  return sum
}

/** 원고(컴파일 포함) 전체 글자 수 — totalDraftWords 의 글자(charCount) 버전. targetUnit==='chars' 진행률용. */
export function totalDraftChars(p: Project): number {
  let sum = 0
  const walk = (id: string) => {
    const it = p.items[id]
    if (!it) return
    if (it.type === 'text' && it.includeInCompile) sum += it.charCount
    it.childIds.forEach(walk)
  }
  const draft = p.items['root-draft']
  draft?.childIds.forEach(walk)
  return sum
}

export function flattenVisible(p: Project): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    const it = p.items[id]
    if (!it) return
    out.push(id)
    if (it.expanded) it.childIds.forEach(walk)
  }
  p.rootOrder.forEach(walk)
  return out
}

/** 펼침 상태와 무관하게 전체 트리를 DFS 순서로 평탄화(병합/그룹화 대상 산정용 — 접힌 폴더 항목 누락 방지). */
export function flattenAll(p: Project): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    const it = p.items[id]
    if (!it) return
    out.push(id)
    it.childIds.forEach(walk)
  }
  p.rootOrder.forEach(walk)
  return out
}

export function childrenOf(p: Project, id: string): BinderItem[] {
  const it = p.items[id]
  if (!it) return []
  return it.childIds.map((c) => p.items[c]).filter(Boolean)
}

export function pathOf(p: Project, id: string): BinderItem[] {
  const path: BinderItem[] = []
  let cur: string | null = id
  while (cur) {
    const it: BinderItem | undefined = p.items[cur]
    if (!it) break
    path.unshift(it)
    cur = it.parentId
  }
  return path
}

// ---- 내부 문서 링크(Scrivener Link) ----
/** 내부 링크 URL 스킴. 본문에는 일반 하이퍼링크(scriv://<id>) 로 저장된다. */
export const SCRIV_LINK_PREFIX = 'scriv://'

export interface DocLink {
  targetId: string
  title: string
  exists: boolean
}

/** 이 문서가 가리키는 내부 링크(정방향) 목록. */
export function internalLinksOf(p: Project, id: string): DocLink[] {
  const it = p.items[id]
  if (!it || !it.bodyRtf) return []
  const doc = parseRtf(it.bodyRtf)
  const out: DocLink[] = []
  const seen = new Set<string>()
  for (const b of doc.blocks) {
    for (const r of b.runs) {
      const link = r.style.link
      if (link && link.startsWith(SCRIV_LINK_PREFIX)) {
        const targetId = link.slice(SCRIV_LINK_PREFIX.length)
        if (seen.has(targetId)) continue
        seen.add(targetId)
        out.push({ targetId, title: p.items[targetId]?.title || r.text || '(없는 문서)', exists: !!p.items[targetId] })
      }
    }
  }
  return out
}

/** 이 문서를 가리키는 다른 문서(역방향/백링크) 목록. 정확 일치 파싱(부분일치 오탐 방지). */
export function backlinksOf(p: Project, id: string): BinderItem[] {
  const needle = SCRIV_LINK_PREFIX + id
  const out: BinderItem[] = []
  for (const item of Object.values(p.items)) {
    if (item.id === id || !item.bodyRtf) continue
    // 빠른 사전 필터(원문에 후보 문자열이 없으면 파싱 생략)
    if (!item.bodyRtf.includes(needle)) continue
    const doc = parseRtf(item.bodyRtf)
    const linked = doc.blocks.some((b) =>
      b.runs.some((r) => r.style.link && r.style.link.slice(SCRIV_LINK_PREFIX.length) === id && r.style.link.startsWith(SCRIV_LINK_PREFIX)),
    )
    if (linked) out.push(item)
  }
  return out
}

/** 아이템이 휴지통(하위)에 있는지. */
export function isInTrash(p: Project, id: string): boolean {
  let cur: string | null = id
  while (cur) {
    if (p.items[cur]?.root === 'trash') return true
    cur = p.items[cur]?.parentId ?? null
  }
  return false
}
