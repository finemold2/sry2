// 프로젝트 데이터 모델. Scrivener 처럼 구조(인덱스) <-> 본문(.rtf) 을 분리한다.
import type { BlockType } from '../rtf'

export type ItemType = 'folder' | 'text' | 'image' | 'pdf' | 'file' | 'character'
export type RootKind = 'draft' | 'research' | 'trash' | null

export interface BinderItem {
  id: string
  type: ItemType
  title: string
  parentId: string | null
  childIds: string[]
  /** 3대 고정 루트 표시 (그 외엔 null) */
  root: RootKind
  /** 본문(캐논 형식 = RTF). 텍스트 아이템에만 존재. */
  bodyRtf: string
  synopsis: string
  notes: string
  labelId: string | null
  statusId: string | null
  keywordIds: string[]
  includeInCompile: boolean
  customMeta: Record<string, string>
  /** 문서 단어 목표(0 = 없음) */
  target: number
  wordCount: number
  charCount: number
  created: number
  modified: number
  expanded: boolean
  // --- 확장 ---
  sectionTypeId?: string | null
  pageBreakBefore?: boolean
  compileAsIs?: boolean
  /** 휴지통 복원용 원래 부모 */
  originalParentId?: string | null
  /** 문서 북마크/참조 */
  bookmarks?: Bookmark[]
  /** 각본 모드 */
  scriptMode?: boolean
  /** 미디어 아이템: IndexedDB blob 키 + MIME */
  blobId?: string
  mime?: string
  /** 내보내기 전송용 base64 data URL(런타임에는 비어 있음; export 시 채우고 import 시 blob 으로 복원 후 제거). */
  dataUrl?: string
  /** 전체 텍스트 검색용 평문 캐시 */
  plainText?: string
  /** 구조화 캐릭터 카드 필드(타입이 'character' 일 때). bodyRtf 는 이 값에서 자동 생성됨. */
  character?: Record<string, string>
  /** 사용자 지정 아이콘 키(없으면 타입 기본 아이콘). */
  icon?: string
  /** 글쓰기 유형(미지정 시 프로젝트 유형 상속). */
  docType?: WritingType
  /** 연재 회차 메타(연재 대시보드). */
  episode?: EpisodeMeta
  /** 블로그/SEO 메타. */
  seo?: SeoMeta
}

export interface Label {
  id: string
  name: string
  color: string
}
export interface Status {
  id: string
  name: string
  /**
   * 상태 색(라벨처럼 바인더·상태 select 에서 시각 구분에 사용).
   * 기존 프로젝트(이 필드가 없던 데이터) 호환을 위해 선택적 — 미지정 시 UI 가 중립색으로 표시.
   * 마이그레이션/표시는 store·컴포넌트 계층에서 기본색을 부여한다.
   */
  color?: string
}
export interface Keyword {
  id: string
  name: string
  color: string
}
export interface CustomMetaField {
  id: string
  name: string
  type: 'text' | 'checkbox' | 'list' | 'date'
  options?: string[]
}

/** 이름 있는 단락/문자 스타일 */
export interface Style {
  id: string
  name: string
  kind: 'paragraph' | 'character'
  /** 적용할 서식(HTML inline style 조각 또는 블록 타입) */
  blockType?: BlockType
  css: Record<string, string>
  nextStyleId?: string
  shortcut?: string
}

/** 컴파일 섹션 타입(문서가 "무엇인지") */
export interface SectionType {
  id: string
  name: string
}

export interface Comment {
  id: string
  text: string
  author?: string
  date: number
  color?: string
}

export interface Footnote {
  id: string
  text: string
  kind: 'footnote' | 'endnote'
}

export interface Bookmark {
  id: string
  /** 내부 문서 링크 또는 외부 URL */
  targetItemId?: string
  url?: string
  title: string
}

/** 하루 집필량 기록 */
export interface DayStat {
  date: string // YYYY-MM-DD
  words: number // 그 날 순증가 단어 수
  draftTotal: number
}

export type SearchScope =
  | 'all'
  | 'title'
  | 'text'
  | 'synopsis'
  | 'notes'
  | 'keywords'
  | 'label'
  | 'status'
export type SearchOperator = 'all' | 'any' | 'exact'
export interface SearchOptions {
  operator: SearchOperator
  scope: SearchScope
  caseSensitive: boolean
  wholeWord: boolean
  invert: boolean
  includeTrash: boolean
}

export interface Collection {
  id: string
  name: string
  type: 'standard' | 'search'
  color: string
  itemIds: string[]
  query?: string
  options?: SearchOptions
}

export interface Snapshot {
  id: string
  title: string
  date: number
  bodyRtf: string
  wordCount: number
}

/** 스토리 캔버스(무한 캔버스 — 옵시디언 Canvas 동일: text/file/group 노드 + 4면 앵커 엣지). */
export type CanvasNodeType = 'text' | 'file' | 'group'
export type CanvasSide = 'top' | 'right' | 'bottom' | 'left'
export interface CanvasNode {
  id: string
  /** 노드 종류(미지정 시 itemId 있으면 file, 없으면 text — 구버전 호환). */
  type?: CanvasNodeType
  x: number
  y: number
  w: number
  h: number
  /** text 노드 본문 / group 노드 라벨. */
  text?: string
  color?: string
  /** file 노드: 연결된 바인더 문서(내용을 카드에 표시, 더블클릭 시 열기). */
  itemId?: string
}
export interface CanvasEdge {
  id: string
  from: string
  to: string
  /** 출발/도착 노드의 연결 면(미지정 시 자동 계산). */
  fromSide?: CanvasSide
  toSide?: CanvasSide
  label?: string
  color?: string
}
export interface CanvasState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type ThemeName = 'light' | 'dark' | 'sepia'

/** 글쓰기 유형 — 프로젝트/문서에 부여하면 도구·뷰·템플릿·컴파일 프리셋이 그에 맞게 노출된다. */
export type WritingType =
  | 'novel'
  | 'webnovel'
  | 'nonfiction'
  | 'essay'
  | 'screenplay'
  | 'blog'
  | 'academic'
  | 'poetry'
  | 'journal'
  | 'general'

/** 연재(회차) 메타데이터 — 연재 관리 대시보드에서 사용. customMeta 와 별개로 구조화. */
export interface EpisodeMeta {
  /** 회차 번호(연재 순서). */
  number?: number
  /** 발행 상태. */
  state?: 'draft' | 'ready' | 'scheduled' | 'published'
  /** 발행 예정일(ISO yyyy-mm-dd). */
  scheduledFor?: string
  /** 실제 발행일(ISO). */
  publishedAt?: string
  /** 게재 플랫폼(예: 문피아·네이버·노벨피아·Royal Road). */
  platform?: string
  /** 접근 등급(무료/유료/선공개 티어). */
  accessTier?: string
  // --- 발행 후 성과(수기 입력; 플랫폼 통계를 옮겨 적어 추이·연독률을 본다) ---
  /** 조회수. */
  views?: number
  /** 추천/좋아요 수. */
  likes?: number
  /** 댓글 수. */
  comments?: number
  /** 선호작/북마크 수. */
  bookmarks?: number
  /** 정산/수익(원 등 통화 단위는 사용자 자유). */
  earnings?: number
}

/** 블로그/SEO 온페이지 메타데이터. */
export interface SeoMeta {
  focusKeyword?: string
  metaTitle?: string
  metaDescription?: string
  slug?: string
  ogImage?: string
}

/** 참고문헌 항목(CSL 간소화). */
export type RefType = 'article' | 'book' | 'chapter' | 'web' | 'thesis' | 'report' | 'conference' | 'news' | 'interview' | 'other'
export interface CslItem {
  id: string
  type: RefType
  title: string
  /** 저자(각 "성 이름" 또는 "성, 이름"). */
  authors: string[]
  /** 편집자(저자와 구분; 편집서·논문집의 'Ed.'/'편' 표기에 사용). */
  editors?: string[]
  year?: string
  /** 발행월(1-12 또는 'Jan' 등 원문; web/news 발행월·접근일 보조). */
  month?: string
  /** 저널/학술지·책·사이트 등 수록처. */
  container?: string
  publisher?: string
  volume?: string
  issue?: string
  pages?: string
  url?: string
  doi?: string
  accessed?: string
  note?: string
}
export type CiteStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'kci'

/** 논증 작업대(Toulmin) 노드. */
export type ArgNodeType = 'claim' | 'evidence' | 'warrant' | 'rebuttal'
export interface ArgNode {
  id: string
  type: ArgNodeType
  text: string
  /** claim 은 최상위(null), 나머지는 소속 claim 의 id. */
  parentId: string | null
  /** 연결된 원고 문서 id(선택). */
  itemId?: string
  /** 연결된 참고문헌 id(근거의 출처). */
  refId?: string
}
export interface ArgumentModel {
  thesis: string
  nodes: ArgNode[]
}

export interface ProjectSettings {
  projectTarget: number
  sessionTarget: number
  deadline?: string
  compileSeparator: string
  theme: ThemeName
  targetUnit: 'words' | 'chars'
  wordsPerPage: number
  wordsPerMinute: number
  labelFieldName: string
  defaultLabelId?: string | null
  defaultStatusId?: string | null
  typewriterScrolling?: boolean
  /** 본문 편집기 맞춤법 검사(브라우저 spellcheck) 사용 여부. 미지정 = 꺼짐(기존 동작 유지). */
  spellCheck?: boolean
  autoCompleteList?: string[]
  /** 자동완성 사용 여부(미지정=켜짐). */
  autoComplete?: boolean
  /** 자동 저장 디바운스 간격(ms). 0 = 자동저장 끔. 미지정 = 1500. */
  autosaveInterval?: number
  /** 프로젝트 글쓰기 유형 — 도구/뷰/템플릿/컴파일 프리셋 노출에 사용(미지정=novel). */
  projectType?: WritingType
  /** 연재 케이던스(주당 발행 회차 수, 비축분 소진 계산용). */
  serialCadence?: number
  /** 연재 발행 요일(0=일 ~ 6=토). '다음 발행일 자동 채움'이 이 요일들에만 예약 날짜를 배정한다. */
  serialDays?: number[]
  // --- 에디터 타이포그래피(읽기 편의; 미지정 시 기본값 760px / 0.7em / 1.6) ---
  /** 본문 편집 영역 폭(px). */
  editorWidth?: number
  /** 문단 사이 간격(em). */
  editorParaGap?: number
  /** 본문 줄간격(배수). */
  editorLineHeight?: number
}

export interface Project {
  id: string
  title: string
  items: Record<string, BinderItem>
  rootOrder: string[]
  labels: Label[]
  statuses: Status[]
  keywords: Keyword[]
  customFields: CustomMetaField[]
  collections: Collection[]
  snapshots: Record<string, Snapshot[]>
  styles: Style[]
  sectionTypes: SectionType[]
  comments: Record<string, Comment>
  footnotes: Record<string, Footnote>
  projectNotes: string
  projectBookmarks: Bookmark[]
  writingHistory: Record<string, DayStat>
  /** 스토리 캔버스(선택). */
  canvas?: CanvasState
  /** 참고문헌 라이브러리(선택). */
  references?: CslItem[]
  /** 논증 작업대 모델(선택). */
  argument?: ArgumentModel
  settings: ProjectSettings
  created: number
  modified: number
  version: 1
}

export const DRAFT_ROOT = 'root-draft'
export const RESEARCH_ROOT = 'root-research'
export const TRASH_ROOT = 'root-trash'
