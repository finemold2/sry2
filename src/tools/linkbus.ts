// 도구 연계 허브(linkbus) — 도구들이 제각각이 아니라 서로 연결되도록 하는 공용 레이어.
//  1) 공유 라이브러리: 인물/장소/이미지/스니펫을 여러 도구가 함께 읽고 쓴다(localStorage 영속).
//     → 같은 종류를 다루는 도구는 자동으로 연계됨(예: 캐릭터 모델 저장 → 인물 시트/관계도에서 사용).
//  2) 도구 열기(페이로드 전달): 한 도구에서 관련 도구를 데이터와 함께 띄운다.
//  3) 이미지 픽 요청: 배경 설정집 등에서 "갤러리에서 사진 고르기" → 갤러리가 고른 이미지를 돌려준다.
// 도구 컴포넌트는 react 외에 오직 이 모듈('./linkbus')만 import 할 수 있다.
import { useSyncExternalStore } from 'react'

export interface ToolPayload { [k: string]: unknown }

// ---------- 공유 엔티티 ----------
export interface SharedTrait { k: string; v: string }
export interface SharedCharacter {
  id: string
  name: string
  photo?: string        // 저작권 안전한 이미지(생성형 아바타/PD/CC0)만
  photoCredit?: string
  role?: string
  traits?: SharedTrait[]
  appearance?: string
  personality?: string
  goal?: string
  secret?: string
  notes?: string
  source?: string
  /** 정규 캐릭터 필드(키→값). 모든 캐릭터 도구가 공유하는 표준 항목 — 손실 없는 연동의 핵심. */
  fields?: Record<string, string>
  /** 항목이 만들어진 프로젝트 id(프로젝트별 격리/필터링용). 전역 항목은 비어 있을 수 있음. */
  projectId?: string
  updated: number
}

// ── 정규 캐릭터 필드 스키마 ──────────────────────────────────────────────
// 모든 캐릭터 도구(생성기·시트·모델·관계도 등)가 같은 항목 키를 쓰도록 하는 단일 출처.
// 한 도구에서 만든 항목이 다른 도구로 빠짐없이 전달되게 한다.
export interface CharacterField { key: string; label: string; multi?: boolean }
export const CHARACTER_FIELDS: CharacterField[] = [
  { key: 'name', label: '이름' },
  { key: 'aka', label: '별칭' },
  { key: 'role', label: '역할' },
  { key: 'gender', label: '성별' },
  { key: 'age', label: '나이' },
  { key: 'bloodType', label: '혈액형' },
  { key: 'mbti', label: 'MBTI' },
  { key: 'height', label: '키' },
  { key: 'weight', label: '몸무게' },
  { key: 'body', label: '체형' },
  { key: 'hair', label: '머리' },
  { key: 'eyes', label: '눈' },
  { key: 'appearance', label: '외모', multi: true },
  { key: 'mark', label: '특징/표식' },
  { key: 'occupation', label: '직업' },
  { key: 'affiliation', label: '소속' },
  { key: 'origin', label: '출신' },
  { key: 'personality', label: '성격', multi: true },
  { key: 'value', label: '가치관' },
  { key: 'goal', label: '목표/욕망', multi: true },
  { key: 'motivation', label: '동기', multi: true },
  { key: 'fear', label: '두려움' },
  { key: 'flaw', label: '약점/결점', multi: true },
  { key: 'secret', label: '비밀', multi: true },
  { key: 'speech', label: '말투', multi: true },
  { key: 'habit', label: '습관' },
  { key: 'quirk', label: '독특한 점' },
  { key: 'hobby', label: '취미' },
  { key: 'background', label: '배경', multi: true },
  { key: 'relations', label: '관계', multi: true },
  { key: 'arc', label: '성장 곡선', multi: true },
  { key: 'notes', label: '메모', multi: true },
  { key: 'etc', label: '기타', multi: true },
]
export const CHARACTER_FIELD_LABEL: Record<string, string> = Object.fromEntries(CHARACTER_FIELDS.map((f) => [f.key, f.label]))
export const CHARACTER_FIELD_KEYS: string[] = CHARACTER_FIELDS.map((f) => f.key)
export interface SharedPlace {
  id: string
  name: string
  kind?: string
  mood?: string
  image?: string
  imageCredit?: string
  history?: string
  rules?: string
  sensory?: string
  notes?: string
  /** 정규 장소 필드(키→값). 모든 장소/배경 도구가 공유하는 표준 항목. */
  fields?: Record<string, string>
  source?: string
  /** 항목이 만들어진 프로젝트 id(프로젝트별 격리/필터링용). */
  projectId?: string
  updated: number
}

// ── 정규 장소/배경 필드 스키마 ────────────────────────────────────────────
export const PLACE_FIELDS: CharacterField[] = [
  { key: 'name', label: '이름' },
  { key: 'kind', label: '종류' },
  { key: 'atmosphere', label: '분위기' },
  { key: 'appearance', label: '외관/묘사', multi: true },
  { key: 'sensory', label: '감각(소리·냄새)', multi: true },
  { key: 'geography', label: '지형/위치' },
  { key: 'climate', label: '기후/날씨' },
  { key: 'history', label: '역사/유래', multi: true },
  { key: 'culture', label: '문화/풍습', multi: true },
  { key: 'inhabitants', label: '거주민' },
  { key: 'rules', label: '규칙/제약', multi: true },
  { key: 'dangers', label: '위험 요소' },
  { key: 'landmarks', label: '랜드마크' },
  { key: 'secrets', label: '비밀', multi: true },
  { key: 'notes', label: '메모', multi: true },
  { key: 'etc', label: '기타', multi: true },
]
export const PLACE_FIELD_LABEL: Record<string, string> = Object.fromEntries(PLACE_FIELDS.map((f) => [f.key, f.label]))
export interface SharedImage {
  id: string
  url: string
  title?: string
  credit?: string
  license?: string     // 예: 'CC0', 'Public Domain', 'Unsplash License'
  source?: string
  /** 항목이 만들어진 프로젝트 id(프로젝트별 격리/필터링용). */
  projectId?: string
  updated: number
}
export interface SharedSnippet {
  id: string
  text: string
  source?: string
  tags?: string[]
  /** 항목이 만들어진 프로젝트 id(프로젝트별 격리/필터링용). */
  projectId?: string
  updated: number
}

export type LibraryKind = 'characters' | 'places' | 'images' | 'snippets'
export interface Library {
  characters: SharedCharacter[]
  places: SharedPlace[]
  images: SharedImage[]
  snippets: SharedSnippet[]
}
type ItemOf<K extends LibraryKind> =
  K extends 'characters' ? SharedCharacter :
  K extends 'places' ? SharedPlace :
  K extends 'images' ? SharedImage : SharedSnippet

const LKEY_BASE = 'sry:shared-library'
// 공유 라이브러리 저장 키. 기본값은 레거시 전역 키(기존 데이터 보존).
// setLibraryProject(pid) 가 호출되면 프로젝트별 키('sry:shared-library:<pid>')로 전환하고
// 그 키가 비어 있으면 레거시 전역 데이터를 1회 복제(이관)한다 — 옛 데이터는 지우지 않는다.
let LKEY = LKEY_BASE
const empty = (): Library => ({ characters: [], places: [], images: [], snippets: [] })

let cache: Library | null = null
// 마지막 write 성공 여부(localStorage 용량 초과 등으로 실패하면 false). 호출부가 사용자에게 안내할 때 참조.
let lastWriteOk = true
/** 직전 라이브러리 저장이 성공했는지. 실패(예: 저장 공간 부족)면 false. */
export function isLastWriteOk(): boolean { return lastWriteOk }

/** 현재 라이브러리 저장 키가 프로젝트별로 격리되어 있으면 그 프로젝트 id, 전역이면 null. */
let currentLibraryProject: string | null = null
export function getLibraryProject(): string | null { return currentLibraryProject }
/** 공유 라이브러리가 프로젝트별로 격리되어 있으면 true(전역이 아님). */
export function isLibraryScoped(): boolean { return currentLibraryProject !== null }

/**
 * 공유 라이브러리를 프로젝트별 네임스페이스로 전환한다(수집함과 동일하게 프로젝트별 격리).
 * - pid 가 비어 있으면 전역(레거시) 키로 되돌린다.
 * - 새 프로젝트 키에 데이터가 없고 레거시 전역 데이터가 있으면 1회 복제해 이관(옛 데이터 보존).
 * - 항목에 projectId 태그를 달아 출처를 표시(향후 필터링/병합 안전).
 */
export function setLibraryProject(pid: string | null | undefined) {
  const next = pid ? LKEY_BASE + ':' + pid : LKEY_BASE
  if (next === LKEY) return
  LKEY = next
  currentLibraryProject = pid || null
  cache = null
  // 프로젝트별 키가 비어 있으면 레거시 전역 라이브러리를 복제(멱등 이관). 원본 전역 키는 보존.
  // ⚠️ 전역 '1회 플래그'를 쓰지 않는다: 부팅 시 버려지는 임시 기본 프로젝트가 플래그를 소진해
  //   실제(복원된) 프로젝트가 빈 라이브러리로 시작하는 데이터-손실을 막기 위함(데이터 안전 우선).
  //   새로 추가하는 항목은 projectId 태그로 프로젝트별 격리되며, 레거시 시드만 각 프로젝트에 1회 복제된다.
  if (pid) {
    try {
      const own = localStorage.getItem(next)
      if (own == null) {
        const legacy = localStorage.getItem(LKEY_BASE)
        if (legacy != null) {
          try {
            const p = JSON.parse(legacy) as Partial<Library>
            const lib = { ...empty(), ...p }
            tagProject(lib, pid)
            localStorage.setItem(next, JSON.stringify(lib))
          } catch { /* 레거시 파싱 실패 시 그냥 빈 라이브러리로 시작(원본은 그대로) */ }
        }
      }
    } catch { /* noop */ }
  }
  emit()
}

// 라이브러리의 모든 항목에 projectId 태그를 보강(이미 있으면 유지).
function tagProject(lib: Library, pid: string) {
  ;(['characters', 'places', 'images', 'snippets'] as LibraryKind[]).forEach((k) => {
    const arr = lib[k] as unknown as { projectId?: string }[]
    arr.forEach((it) => { if (it && it.projectId == null) it.projectId = pid })
  })
}

function read(): Library {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(LKEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Library>
      cache = { ...empty(), ...p }
      return cache
    }
  } catch { /* noop */ }
  cache = empty()
  return cache
}
/** 라이브러리를 저장한다. 성공하면 true, localStorage 용량 초과 등으로 실패하면 false. */
function write(lib: Library): boolean {
  cache = lib
  let ok = true
  try {
    localStorage.setItem(LKEY, JSON.stringify(lib))
  } catch {
    ok = false // 용량 초과 등 — 메모리 캐시에는 남지만 영속 저장은 실패(호출부가 안내)
  }
  lastWriteOk = ok
  emit()
  return ok
}

// ---------- 구독(여러 도구 창이 동시에 반응) ----------
const listeners = new Set<() => void>()
function emit() { listeners.forEach((l) => { try { l() } catch { /* noop */ } }) }
function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => { if (e.key === LKEY) { cache = null; l() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage) }
}

// snapshot 캐시(useSyncExternalStore 는 안정적 참조를 요구) — 종류별로 마지막 배열을 메모이즈
const snapCache: Record<string, unknown> = {}
function listSnapshot<K extends LibraryKind>(kind: K): ItemOf<K>[] {
  const arr = read()[kind] as unknown as ItemOf<K>[]
  const key = kind
  const prev = snapCache[key] as { ref: unknown; val: ItemOf<K>[] } | undefined
  if (prev && prev.ref === arr) return prev.val
  snapCache[key] = { ref: arr, val: arr }
  return arr
}

function uid(prefix: string): string {
  // Math.random/Date.now 조합(테스트 환경 아님, 브라우저 런타임)
  return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// ---------- .sry 동봉용: 특정 프로젝트의 라이브러리 직접 읽기/쓰기(현재 스코프 무관) ----------
// 내보내기/가져오기에서 프로젝트별 라이브러리를 .sry 에 담고 복원하는 데 쓴다(전역 LKEY_BASE 는 건드리지 않음).
export function readLibraryRaw(pid: string): Library | null {
  try {
    const raw = localStorage.getItem(LKEY_BASE + ':' + pid)
    if (!raw) return null
    return { ...empty(), ...(JSON.parse(raw) as Partial<Library>) }
  } catch { return null }
}
export function writeLibraryRaw(pid: string, lib: Library): boolean {
  try {
    localStorage.setItem(LKEY_BASE + ':' + pid, JSON.stringify({ ...empty(), ...lib }))
    // 현재 활성 라이브러리가 이 프로젝트면 캐시를 비우고 구독자(열린 도구)에 갱신 통지.
    if (currentLibraryProject === pid) { cache = null; emit() }
    return true
  } catch { return false }
}

// ---------- 라이브러리 CRUD ----------
export function getLibrary(): Library { return read() }
export function getList<K extends LibraryKind>(kind: K): ItemOf<K>[] { return read()[kind] as unknown as ItemOf<K>[] }

// 반환값(레코드)은 기존 호출부 호환을 위해 유지한다. 저장 성공 여부는 isLastWriteOk() 로 확인.
// (예: addToLibrary 직후 if (!isLastWriteOk()) 경고 토스트)
export function addToLibrary<K extends LibraryKind>(kind: K, item: Partial<ItemOf<K>> & { id?: string }): ItemOf<K> {
  const lib = { ...read() }
  const arr = [...(lib[kind] as unknown as ItemOf<K>[])]
  // 프로젝트별 격리 모드면 항목에 현재 프로젝트 id 태그(이미 지정돼 있으면 유지).
  const tag = (currentLibraryProject && (item as { projectId?: string }).projectId == null) ? { projectId: currentLibraryProject } : null
  const rec = { ...(item as object), ...(tag || {}), id: item.id || uid(kind.slice(0, 3)), updated: Date.now() } as ItemOf<K>
  arr.unshift(rec)
  ;(lib[kind] as unknown as ItemOf<K>[]) = arr
  write(lib)
  return rec
}
/** 항목을 갱신한다. 저장 성공하면 true, 실패(저장 공간 부족 등)면 false. */
export function updateInLibrary<K extends LibraryKind>(kind: K, id: string, patch: Partial<ItemOf<K>>): boolean {
  const lib = { ...read() }
  const arr = (lib[kind] as unknown as ItemOf<K>[]).map((x) => (x.id === id ? { ...x, ...patch, updated: Date.now() } as ItemOf<K> : x))
  ;(lib[kind] as unknown as ItemOf<K>[]) = arr
  return write(lib)
}
/** 항목을 제거한다. 저장 성공하면 true, 실패하면 false. */
export function removeFromLibrary(kind: LibraryKind, id: string): boolean {
  const lib = { ...read() }
  ;(lib[kind] as unknown as { id: string }[]) = (lib[kind] as unknown as { id: string }[]).filter((x) => x.id !== id)
  return write(lib)
}

// React 훅: 종류별 목록을 구독 — 라이브러리 변경 시 자동 리렌더
export function useLibraryList<K extends LibraryKind>(kind: K): ItemOf<K>[] {
  return useSyncExternalStore(subscribe, () => listSnapshot(kind), () => listSnapshot(kind))
}

// ---------- 도구 열기(페이로드 전달) ----------
let opener: ((toolId: string, payload?: ToolPayload) => void) | null = null
export function registerOpener(fn: (toolId: string, payload?: ToolPayload) => void) { opener = fn }
/** 관련 도구를 (선택적으로 데이터와 함께) 띄운다. */
export function openToolLinked(toolId: string, payload?: ToolPayload) { opener?.(toolId, payload) }

// ---------- 이미지 픽 요청 채널 ----------
// 예: 배경 설정집에서 픽 요청 → 갤러리 도구를 열고, 갤러리에서 "이 장소에 사용"을 누르면 콜백으로 돌려준다.
// [발견성] 픽은 어느 갤러리에서나 충족할 수 있다. 그래서 픽 요청 시 다른 갤러리들도 안내(칩)하고,
//          픽 모드인 다른 갤러리도 hasPendingPick()으로 상단 배너를 띄울 수 있게 메타데이터를 노출한다.

// 이미지 픽을 충족할 수 있는 갤러리 도구 목록(상단 안내 칩/배너에서 출처 전환에 사용).
export interface PickGallery { id: string; name: string }
export const PICK_GALLERIES: PickGallery[] = [
  { id: 'imagination-gallery', name: '상상력 자극 갤러리' },
  { id: 'met-museum-art', name: '메트 명작 영감' },
  { id: 'cleveland-art', name: '클리블랜드 CC0 갤러리' },
  { id: 'space-gallery', name: '우주·자연 갤러리' },
  { id: 'wikimedia-art-daily', name: '오늘의 그림' },
  { id: 'character-model', name: '캐릭터 모델 가져오기' },
]

export interface PickImageRequest { requesterId: string; onPick: (img: SharedImage) => void; requesterLabel?: string }
let pendingPick: PickImageRequest | null = null
export function requestImagePick(req: PickImageRequest, galleryToolId = 'imagination-gallery') {
  pendingPick = req
  openToolLinked(galleryToolId, { pickMode: true })
  emit() // 이미 열려 있는 다른 갤러리들이 hasPendingPick()/pendingPickInfo() 로 배너를 띄우도록 알림
}
export function hasPendingPick(): boolean { return !!pendingPick }
/**
 * 대기 중인 픽 요청 정보(요청처 라벨 + 선택 가능한 갤러리 목록). 갤러리가 상단 배너/소스 전환 칩을 그릴 때 사용.
 * 대기 요청이 없으면 null.
 */
export function pendingPickInfo(): { requesterId: string; requesterLabel?: string; galleries: PickGallery[] } | null {
  if (!pendingPick) return null
  return { requesterId: pendingPick.requesterId, requesterLabel: pendingPick.requesterLabel, galleries: PICK_GALLERIES }
}
/** 대기 중인 픽을 유지한 채 다른 갤러리로 출처를 전환(픽 모드로 연다). 다른 갤러리에서도 고를 수 있음을 살림. */
export function switchPickGallery(galleryToolId: string) {
  if (!pendingPick) return
  openToolLinked(galleryToolId, { pickMode: true })
}
/** 이미지 제공 도구(갤러리 등)가 호출 — 대기 중인 픽 요청에 이미지를 전달하고 요청을 소비한다. */
export function fulfillImagePick(img: SharedImage): boolean {
  if (!pendingPick) return false
  try { pendingPick.onPick(img) } catch { /* noop */ }
  pendingPick = null
  emit() // 다른 갤러리의 픽 배너가 사라지도록 알림
  return true
}
export function cancelImagePick() {
  if (!pendingPick) return
  pendingPick = null
  emit()
}

// ---------- 프로젝트 브리지: 도구 산출물을 실제 바인더(좌측 파일구조)·DB·캔버스에 실시간 추가 ----------
export interface ProjectEntrySpec {
  kind?: 'text' | 'character' | 'setting'
  root?: 'draft' | 'research'      // 원고('draft') 또는 자료('research', 기본)
  folder?: string                  // 이 이름의 폴더 아래로(없으면 생성). 예: '인물', '장소', '장면'
  title: string
  bodyHtml?: string                // 본문(HTML) — App 이 RTF 로 변환
  bodyRtf?: string
  character?: Record<string, string> // character/setting 카드 필드(name,role,age,...)
  synopsis?: string
  icon?: string
  meta?: Record<string, string>    // 커스텀 메타 → DB 열
}
let projectBridge: ((spec: ProjectEntrySpec) => string | null) | null = null
export function registerProjectBridge(fn: (spec: ProjectEntrySpec) => string | null) { projectBridge = fn }
/** 도구 산출물을 실제 프로젝트에 문서/카드로 추가. 생성된 항목 id 반환(미연결 시 null). */
export function addToProject(spec: ProjectEntrySpec): string | null { return projectBridge ? projectBridge(spec) : null }
export function hasProjectBridge(): boolean { return !!projectBridge }

// ---------- 집필 통계 브리지(단일 진실원천) ----------
// 집필량/연속일의 SSOT 는 project.writingHistory(store.recordWriting 적립)다. 도구(react+linkbus 만 import)는
// store 를 직접 못 읽으므로, App 이 SSOT 에서 파생한 값을 여기 등록해 대시보드/스트릭 도구가 '코어와 같은 숫자'를 쓰게 한다.
export interface WritingStats {
  todayWords: number               // 오늘 원고 순증가 단어 수(project.writingHistory[today].words)
  currentStreak: number            // 현재 연속 집필일
  longestStreak: number            // 최장 연속 집필일
  totalDays: number                // 집필한 총 일수(words>0)
  draftTotal: number               // 원고 전체 단어 수
  dayWords: Record<string, number> // YYYY-MM-DD -> 그날 원고 증분(words>0 인 날만)
}
let writingStatsFn: (() => WritingStats) | null = null
export function registerWritingStats(fn: () => WritingStats) { writingStatsFn = fn }
/** 코어가 집계한 실제 집필 통계(SSOT). App 미연결이거나 호출 실패면 null. */
export function getWritingStats(): WritingStats | null { try { return writingStatsFn ? writingStatsFn() : null } catch { return null } }

// ---------- 활성 문서 브리지: 현재 편집 중인 본문을 불러오고, 제자리에서 교정 적용 ----------
// 교정·맞춤법 도구가 원고와 단절되지 않도록(붙여넣기 전용 탈피) 활성 문서를 직접 읽고,
// 도구가 계산한 '순수 텍스트 오프셋' 기준 치환을 안전하게 본문 RTF 에 반영한다(서식 보존은 App 이 담당).
export interface ActiveDocInfo {
  id: string
  title: string
  text: string   // 활성 문서의 순수 텍스트(rtfToPlainText)
}
/** 순수 텍스트 오프셋 기준 치환 1건. index<end(반열림 구간), replacement 로 교체. */
export interface DocReplacement { index: number; end: number; replacement: string }
export interface ActiveDocBridge {
  /** 현재 활성 텍스트 문서 정보. 없으면(텍스트 문서가 아니거나 미연결) null. */
  get: () => ActiveDocInfo | null
  /**
   * 순수 텍스트 오프셋 기준 치환을 본문에 적용.
   * baseText 는 도구가 치환을 계산할 때 본 순수 텍스트(스냅샷) — 그 사이 본문이 바뀌었으면 적용을 거부한다.
   * 반환: { ok, applied } — ok=false 면 적용하지 않음(본문 변경/불일치/오류). 데이터 안전상 부분 적용은 하지 않는다.
   */
  replace: (docId: string, baseText: string, reps: DocReplacement[]) => { ok: boolean; applied: number; reason?: string }
}
let activeDocBridge: ActiveDocBridge | null = null
export function registerActiveDoc(b: ActiveDocBridge | null) { activeDocBridge = b }
/** 현재 활성 텍스트 문서 정보(없으면 null). */
export function getActiveDoc(): ActiveDocInfo | null { return activeDocBridge ? activeDocBridge.get() : null }
/** 활성 문서 브리지가 연결되어 있으면 true(브라우저 앱 내). */
export function hasActiveDoc(): boolean { return !!activeDocBridge }
/** 순수 텍스트 오프셋 치환을 활성 문서 본문에 적용(서식 보존은 App). 미연결/불일치면 ok:false. */
export function applyActiveDocReplace(docId: string, baseText: string, reps: DocReplacement[]): { ok: boolean; applied: number; reason?: string } {
  if (!activeDocBridge) return { ok: false, applied: 0, reason: '본문 연결이 없습니다.' }
  try { return activeDocBridge.replace(docId, baseText, reps) }
  catch (e) { return { ok: false, applied: 0, reason: e instanceof Error ? e.message : '적용 중 오류' } }
}

// ---------- 참고문헌(References) 브리지: 학술/도서 검색 결과를 곧바로 서지로 추가 ----------
// CslItem(서지 항목)의 입력 형태. id 는 스토어에서 부여하므로 제외.
export interface ReferenceSpec {
  type?: 'article' | 'book' | 'chapter' | 'web' | 'thesis' | 'report' | 'conference' | 'news' | 'interview' | 'other'
  title: string
  authors?: string[]
  editors?: string[]
  year?: string
  month?: string
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
let referenceBridge: ((spec: ReferenceSpec) => string | null) | null = null
export function registerReferenceBridge(fn: (spec: ReferenceSpec) => string | null) { referenceBridge = fn }
/** 검색 결과(논문/도서)를 프로젝트 참고문헌에 추가. 생성된 항목 id 반환(미연결 시 null). */
export function addReference(spec: ReferenceSpec): string | null { return referenceBridge ? referenceBridge(spec) : null }
export function hasReferenceBridge(): boolean { return !!referenceBridge }

// ---------- 좌측 바인더 파일 → 도구창 드래그앤드롭 ----------
// 바인더 아이템은 dataTransfer 에 'text/scriv-id' 로 id 를 싣는다(Binder onDragStart).
// 도구는 getDragItem(e) 로 끌어온 파일의 내용(제목/유형/캐릭터 필드/본문 텍스트)을 받아 활용한다.
export interface ResolvedItem { id: string; title: string; type: string; character?: Record<string, string>; text?: string }
let itemResolver: ((id: string) => ResolvedItem | null) | null = null
export function registerItemResolver(fn: (id: string) => ResolvedItem | null) { itemResolver = fn }
export function resolveItem(id: string): ResolvedItem | null { return itemResolver ? itemResolver(id) : null }
/** 드롭 이벤트에서 끌어온 바인더 파일을 해석. 없으면 null. */
export function getDragItem(e: { dataTransfer?: DataTransfer | null }): ResolvedItem | null {
  const dt = e?.dataTransfer
  if (!dt) return null
  let id = ''
  try { id = dt.getData('text/scriv-id') || '' } catch { /* noop */ }
  if (!id) return null
  return resolveItem(id)
}
/** 드래그 중 바인더 파일이 실려 있으면 true(드롭 허용 표시용). */
export function isItemDrag(e: { dataTransfer?: DataTransfer | null }): boolean {
  const t = e?.dataTransfer?.types
  return !!t && Array.prototype.indexOf.call(t, 'text/scriv-id') >= 0
}

// ---------- 수집함(Stash) 채널 — 도구/기능에서 "수집함에 담기" ----------
export interface StashInput { kind: 'memo' | 'doc' | 'url' | 'image' | 'note' | 'audio' | 'video' | 'file'; label?: string; text?: string; url?: string; itemId?: string; credit?: string; blobId?: string; mime?: string }
let stashAdder: ((i: StashInput) => void) | null = null
export function registerStash(fn: (i: StashInput) => void) { stashAdder = fn }
/** 도구 산출물(이미지/메모/URL 등)을 플로팅 수집함에 담는다. */
export function addToStash(i: StashInput) { stashAdder?.(i) }
export function hasStash(): boolean { return !!stashAdder }

// ---------- 관련 도구 메타(연계 버튼용) ----------
// 도구 id → 관련 도구 id 목록. 도구가 "연계" 버튼 묶음을 그릴 때 참조.
export const TOOL_RELATIONS: Record<string, string[]> = {
  'character-forge': ['character-sheet', 'character-model', 'relationship-map', 'name-mixer', 'writing-dictionary'],
  'character-model': ['character-forge', 'character-sheet', 'relationship-map', 'name-analyzer', 'name-mixer'],
  'character-sheet': ['character-forge', 'character-model', 'relationship-map', 'pov-tracker', 'name-mixer', 'name-analyzer'],
  'relationship-map': ['character-sheet', 'character-model', 'pov-tracker'],
  'pov-tracker': ['character-sheet', 'relationship-map'],
  'name-mixer': ['character-sheet', 'character-model', 'name-analyzer'],
  'name-analyzer': ['character-sheet', 'character-model', 'name-mixer'],
  'setting-bible': ['world-map-canvas', 'imagination-gallery', 'met-museum-art', 'cleveland-art', 'moodboard-grid', 'sensory-palette', 'scene-list', 'world-wiki'],
  'imagination-gallery': ['setting-bible', 'moodboard-grid', 'character-model', 'cover-mockup'],
  'met-museum-art': ['setting-bible', 'moodboard-grid', 'cover-mockup'],
  'cleveland-art': ['setting-bible', 'moodboard-grid', 'cover-mockup'],
  'moodboard-grid': ['setting-bible', 'cover-mockup', 'imagination-gallery', 'reference-board'],
  'reference-board': ['imagination-gallery', 'moodboard-grid', 'setting-bible', 'cover-mockup', 'met-museum-art'],
  'sensory-palette': ['setting-bible', 'scene-list'],
  'scene-list': ['setting-bible', 'pov-tracker', 'character-sheet', 'plot-pyramid'],
  'world-wiki': ['setting-bible', 'character-sheet'],
  'cover-mockup': ['imagination-gallery', 'met-museum-art', 'cleveland-art', 'moodboard-grid', 'palette-lock'],
  'poke-creature': ['character-sheet', 'character-model', 'relationship-map', 'world-wiki'],
  'music-gallery': ['setting-bible', 'character-sheet', 'scene-forge', 'sensory-palette', 'playlist-builder'],
  'playlist-builder': ['music-gallery', 'setting-bible', 'scene-forge', 'sensory-palette', 'soundscape-mixer', 'ambient-sound'],
  'scene-forge': ['scene-list', 'setting-bible', 'character-sheet', 'sensory-palette', 'plot-pyramid'],
  'space-gallery': ['setting-bible', 'moodboard-grid', 'cover-mockup', 'imagination-gallery'],
}

// 도구가 OS 기본 이모지 대신 일관된 SVG 이모지를 쓰도록 재노출(컨벤션상 도구는 react·./linkbus 만 import 가능).
// <Emoji e="🔥"/> 또는 emojify(text) — 보유분만 SVG, 나머지는 원문(정보 손실 0). 렌더 표시용(편집기/입력칸 무관).
export { Emoji, emojify } from '../ui/Emoji'
