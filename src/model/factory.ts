// 프로젝트/아이템 생성 헬퍼 및 단어 수 계산.
import { emptyRtf } from '../rtf'
import {
  BinderItem,
  DRAFT_ROOT,
  ItemType,
  Project,
  RESEARCH_ROOT,
  RootKind,
  TRASH_ROOT,
} from './types'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** 단어 수 / 글자 수 계산. CJK 문자는 글자 단위로도 셈해 한국어/중국어에 대응. */
export function countText(text: string): { words: number; chars: number } {
  text = text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
  const trimmed = text.replace(/ /g, ' ')
  const chars = trimmed.replace(/\s/g, '').length
  // 공백 기준 단어 + 연속 CJK 음절은 각각 1단어로 보정
  const latinWords = (trimmed.match(/[^\sᄀ-ᇿ㄰-㆏가-힣぀-ヿ一-鿿]+/g) || [])
    .filter((w) => /\S/.test(w)).length
  const cjk = (trimmed.match(/[가-힣぀-ヿ一-鿿]/g) || []).length
  // 한국어는 어절(공백) 기준이 자연스러우므로 공백 단어 수와 CJK 보정 중 큰 값을 쓰지 않고
  // 표준적으로 공백 분리 단어 수를 기본으로 한다.
  const spaceWords = trimmed.split(/\s+/).filter(Boolean).length
  const words = Math.max(spaceWords, latinWords + (cjk > 0 && spaceWords === 0 ? cjk : 0))
  return { words, chars }
}

export function createItem(
  type: ItemType,
  title: string,
  parentId: string | null,
  opts: Partial<BinderItem> = {},
): BinderItem {
  const now = Date.now()
  const item: BinderItem = {
    id: opts.id || newId(),
    type,
    title,
    parentId,
    childIds: opts.childIds ?? [],
    root: opts.root ?? null,
    bodyRtf: opts.bodyRtf ?? emptyRtf(),
    synopsis: opts.synopsis ?? '',
    notes: opts.notes ?? '',
    labelId: opts.labelId ?? null,
    statusId: opts.statusId ?? null,
    keywordIds: opts.keywordIds ?? [],
    includeInCompile: opts.includeInCompile ?? true,
    customMeta: opts.customMeta ?? {},
    target: opts.target ?? 0,
    wordCount: opts.wordCount ?? 0,
    charCount: opts.charCount ?? 0,
    created: opts.created ?? now,
    modified: opts.modified ?? now,
    expanded: opts.expanded ?? true,
  }
  // 확장 선택 필드 전달(있을 때만) — 미디어 blobId/mime, 각본 scriptMode, 섹션타입, 페이지나눔 등 누락 방지
  if (opts.sectionTypeId !== undefined) item.sectionTypeId = opts.sectionTypeId
  if (opts.pageBreakBefore !== undefined) item.pageBreakBefore = opts.pageBreakBefore
  if (opts.compileAsIs !== undefined) item.compileAsIs = opts.compileAsIs
  if (opts.originalParentId !== undefined) item.originalParentId = opts.originalParentId
  if (opts.bookmarks !== undefined) item.bookmarks = opts.bookmarks
  if (opts.scriptMode !== undefined) item.scriptMode = opts.scriptMode
  if (opts.blobId !== undefined) item.blobId = opts.blobId
  if (opts.mime !== undefined) item.mime = opts.mime
  if (opts.plainText !== undefined) item.plainText = opts.plainText
  if (opts.character !== undefined) item.character = opts.character
  if (opts.icon !== undefined) item.icon = opts.icon
  return item
}

function root(id: string, title: string, kind: RootKind, type: ItemType): BinderItem {
  return createItem(type, title, null, { id, root: kind, includeInCompile: kind === 'draft' })
}

export function createProject(title = '제목 없는 프로젝트'): Project {
  const now = Date.now()
  const draft = root(DRAFT_ROOT, '원고', 'draft', 'folder')
  const research = root(RESEARCH_ROOT, '자료', 'research', 'folder')
  const trash = root(TRASH_ROOT, '휴지통', 'trash', 'folder')

  // 시작용 샘플 장면 하나
  const scene = createItem('text', '제1장', draft.id, {})
  draft.childIds = [scene.id]
  scene.parentId = draft.id

  const items: Record<string, BinderItem> = {
    [draft.id]: draft,
    [research.id]: research,
    [trash.id]: trash,
    [scene.id]: scene,
  }

  return {
    id: newId(),
    title,
    items,
    rootOrder: [draft.id, research.id, trash.id],
    labels: [
      { id: 'label-none', name: '없음', color: '#9aa0a6' },
      { id: newId(), name: '아이디어', color: '#f4b400' },
      { id: newId(), name: '초고', color: '#4285f4' },
      { id: newId(), name: '수정 필요', color: '#db4437' },
      { id: newId(), name: '완료', color: '#0f9d58' },
    ],
    statuses: [
      { id: 'status-none', name: '없음' },
      { id: newId(), name: '시작 전' },
      { id: newId(), name: '집필 중' },
      { id: newId(), name: '1차 완료' },
      { id: newId(), name: '교정 완료' },
    ],
    keywords: [
      { id: newId(), name: '주인공', color: '#d81b60' },
      { id: newId(), name: '복선', color: '#8e24aa' },
      { id: newId(), name: '배경', color: '#00897b' },
    ],
    customFields: [],
    collections: [],
    snapshots: {},
    styles: [
      { id: 'style-emphasis', name: '강조', kind: 'character', css: { 'font-style': 'italic' } },
      { id: 'style-strong', name: '굵게', kind: 'character', css: { 'font-weight': 'bold' } },
    ],
    sectionTypes: [
      { id: 'st-chapter', name: '장 (Chapter)' },
      { id: 'st-scene', name: '장면 (Scene)' },
      { id: 'st-heading', name: '제목 (Heading)' },
    ],
    comments: {},
    footnotes: {},
    projectNotes: '',
    projectBookmarks: [],
    writingHistory: {},
    settings: {
      projectTarget: 50000,
      sessionTarget: 1000,
      compileSeparator: '\n\n',
      theme: 'light',
      targetUnit: 'words',
      wordsPerPage: 300,
      wordsPerMinute: 250,
      labelFieldName: '라벨',
      defaultLabelId: 'label-none',
      defaultStatusId: 'status-none',
      typewriterScrolling: false,
      autoCompleteList: [],
    },
    created: now,
    modified: now,
    version: 1,
  }
}
