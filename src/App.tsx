import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Command as CmdIcon,
  Columns3,
  Network,
  CalendarClock,
  GitBranch,
  BookMarked,
  Scale,
  Table2,
  FileText,
  FolderOpen,
  Layout,
  LayoutGrid,
  BookOpen,
  Maximize2,
  Moon,
  Sun,
  PanelLeft,
  PanelRight,
  Rows3,
  Save,
  SplitSquareHorizontal,
} from 'lucide-react'
import { pathOf, totalDraftWords, isInTrash, flattenVisible, useStore } from './store/store'
import { computeStreak, dayWords, todayYmd } from './analysis/streak'
import Binder from './components/Binder'
import Editor from './components/Editor'
import Corkboard from './components/Corkboard'
import Outliner from './components/Outliner'
import Board from './components/Board'
import DocTemplateModal from './components/DocTemplateModal'
import LinguisticFocusModal from './components/LinguisticFocusModal'
import Scratchpad from './components/Scratchpad'
import QuickRef from './components/QuickRef'
import ReadAloud from './components/ReadAloud'
import AutoComplete from './components/AutoComplete'
import SprintBar from './components/SprintBar'
import StructureTemplateModal from './components/StructureTemplateModal'
import TensionCurveModal from './components/TensionCurveModal'
import PromptDeck from './components/PromptDeck'
import Inspector from './components/Inspector'
import Footer from './components/Footer'
import Composition from './components/Composition'
import PortalWindow from './components/PortalWindow'
import ShortcutSheet from './components/ShortcutSheet'
import SkinCoach from './components/SkinCoach'
import AuroraShell from './components/AuroraShell'
import CompileDialog from './components/CompileDialog'
import CommandPalette, { type Command } from './components/CommandPalette'
import StatisticsModal from './components/StatisticsModal'
import ProjectReplaceModal from './components/ProjectReplaceModal'
import StyleModal from './components/StyleModal'
import ProjectSettingsModal from './components/ProjectSettingsModal'
import NewProjectModal from './components/NewProjectModal'
import ProjectListModal from './components/ProjectListModal'
import NameGenModal from './components/NameGenModal'
import BackupModal from './components/BackupModal'
import DocLinkModal from './components/DocLinkModal'
import AiModal from './components/AiModal'
const CreativeStudio = lazy(() => import('./components/CreativeStudio'))
import StoryCanvas from './components/StoryCanvas'
import SerialDashboard from './components/SerialDashboard'
import PlatformPublishModal from './components/PlatformPublishModal'
import PlatformReaderPreview from './components/PlatformReaderPreview'
import ToolHub from './tools/ToolHub'
import GenreToolbox from './components/GenreToolbox'
import StashBox from './components/StashBox'
import ToolWindow from './tools/ToolWindow'
import { UTILITY_TOOLS } from './tools/registry'
import { Icon, iconForTool } from './ui/icons'
import StudioShell from './components/StudioShell'
import GuidedTour from './components/GuidedTour'
import GuidedManual from './components/GuidedManual'
import { registerOpener, registerProjectBridge, registerReferenceBridge, registerItemResolver, registerActiveDoc, registerWritingStats, cancelImagePick, setLibraryProject, TOOL_RELATIONS, type ToolPayload, type ProjectEntrySpec, type ReferenceSpec, type DocReplacement } from './tools/linkbus'
import { htmlToRtf, rtfToPlainText, parseRtf, serializeRtf, docToPlainText } from './rtf'
import ReferencesView from './components/ReferencesView'
import TimelineView from './components/TimelineView'
import ArgumentView from './components/ArgumentView'
import DatabaseView from './components/DatabaseView'
import FindReplaceBar from './components/FindReplaceBar'
import {
  buildScrivPackageAsync,
  readScrivPackageAsync,
  buildSryFileMap,
  readSryFileMap,
  applySryAux,
  sryBaseName,
  fileMapToZip,
  getLastProjectId,
  idbList,
  idbLoad,
  idbSave,
  saveBackup,
  listBackups,
  loadBackup,
  loadBackupFiles,
  storageEstimate,
  saveBlob,
  openSingleRtf,
  pickDirectory,
  projectTitleForScriv,
  readFileMap,
  readScrivPackage,
  requestPersistence,
  setLastProjectId,
  supportsFS,
  writeFileMap,
  zipToFileMap,
} from './persistence'
import { downloadBlob } from './persistence/zip'

// 저장/열기는 sry 네이티브 포맷만 사용한다. Scrivener(.scriv/.scrivx) 가져오기/내보내기 코드는
// 보존하되(scrivx.ts, App 의 saveScrivFolder 등) 저작권 안전을 위해 UI 에서 숨긴다. true 로 바꾸면 다시 노출.
const SCRIVENER_INTEROP = false
import { createSyncChannel, type SyncChannel } from './persistence/sync'
import { parseFountain } from './export/fountain'
import { parseFdx } from './export/fdx'
import { fountainBodyToParagraphs, paragraphsToScriptHtml } from './script/elements'
import type { Project, ThemeName } from './model'

// 바인더/인스펙터 폭 조절 바.
// - 포인터(마우스/터치/펜) 통일: onPointerDown + setPointerCapture (#19 터치 지원).
// - 키보드 접근성(#16): role="separator", tabIndex=0, ArrowLeft/Right 로 ±10px(keyStep 부호로 좌/우 패널 방향 보정).
function Resizer({ onDrag, label, keyStep = 10 }: { onDrag: (dx: number) => void; label?: string; keyStep?: number }) {
  const startX = useRef(0)
  const onPointerDown = (e: React.PointerEvent) => {
    // 포인터(마우스/터치/펜) 드래그. setPointerCapture 로 캡처하되, 리스너는 window 에 달아
    // 빠른 드래그에도 좌표 추적을 놓치지 않게 한다(포인터 캡처 + window 추적 병행).
    startX.current = e.clientX
    const el = e.currentTarget
    try { el.setPointerCapture(e.pointerId) } catch { /* noop */ }
    const move = (ev: PointerEvent) => {
      onDrag(ev.clientX - startX.current)
      startX.current = ev.clientX
    }
    const up = (ev: PointerEvent) => {
      try { el.releasePointerCapture(ev.pointerId) } catch { /* noop */ }
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onDrag(-keyStep) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); onDrag(keyStep) }
  }
  return (
    <div
      className="dragbar"
      role="separator"
      aria-orientation="vertical"
      aria-label={label || '패널 크기 조절'}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={{ touchAction: 'none' }}
    />
  )
}

function CenterHeader() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const item = activeId ? project.items[activeId] : null
  const crumbs = item ? pathOf(project, item.id) : []
  return (
    <div className="editor-header">
      <span className="crumb">
        {crumbs.length === 0 && <span style={{ color: 'var(--muted)' }}>선택된 문서 없음</span>}
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="sep">›</span>}
            {c.title}
          </span>
        ))}
      </span>
    </div>
  )
}

function Menu({
  id,
  label,
  openMenu,
  setOpenMenu,
  children,
}: {
  id: string
  label: string
  openMenu: string | null
  setOpenMenu: (v: string | null) => void
  children: (close: () => void) => React.ReactNode
}) {
  // 열림 상태는 상위에서 단일 값으로 관리 — 한 번에 하나의 메뉴만 열린다(겹침 방지).
  const open = openMenu === id
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = () => setOpenMenu(null)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [open, setOpenMenu])
  // #10: 메뉴가 열리면 첫(활성) 항목으로 포커스 이동 — 키보드 진입.
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const items = dropRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      items?.[0]?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])
  // #10: 드롭다운 내부 키보드 내비 — ArrowUp/Down 순환, Home/End, 문자 typeahead, Esc 로 트리거 복귀.
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(dropRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpenMenu(null)
      triggerRef.current?.focus()
      return
    }
    if (items.length === 0) return
    const cur = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(cur + 1 + items.length) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(cur - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault(); items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault(); items[items.length - 1].focus()
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // typeahead: 첫 글자 일치 항목으로 이동(현재 다음부터, 없으면 처음부터)
      const ch = e.key.toLowerCase()
      const start = cur + 1
      const found = items.find((it, i) => i >= start && (it.textContent || '').trim().toLowerCase().startsWith(ch))
        || items.find((it) => (it.textContent || '').trim().toLowerCase().startsWith(ch))
      if (found) { e.preventDefault(); found.focus() }
    }
  }
  return (
    <div className="menu-wrap">
      <button
        ref={triggerRef}
        className={'tbtn' + (open ? ' active' : '')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpenMenu(open ? null : id)
        }}
        onKeyDown={(e) => {
          // 닫힌 상태에서 ArrowDown/Enter/Space 로 열고 첫 항목 포커스
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setOpenMenu(id)
          } else if (open && e.key === 'Escape') {
            e.preventDefault()
            setOpenMenu(null)
          }
        }}
        // 메뉴바가 이미 열려 있으면 호버로 전환(데스크톱 메뉴 UX)
        onMouseEnter={() => {
          if (openMenu !== null && openMenu !== id) setOpenMenu(id)
        }}
      >
        {label}
      </button>
      {open && (
        <div
          ref={dropRef}
          className="dropdown"
          role="menu"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={onMenuKeyDown}
        >
          {children(() => setOpenMenu(null))}
        </div>
      )}
    </div>
  )
}

const THEMES: ThemeName[] = ['light', 'dark', 'sepia']

// 자동 연관 도구 — 명시적 관계(TOOL_RELATIONS) + 동일 그룹 + 동일 장르 + 이름/소개 키워드 겹침으로
// 점수화해 상위 8개를 추린다. 451개 전 도구가 별도 설정 없이 폭넓은 관련 도구를 노출(연결성 강화).
const _relTok = (s?: string): string[] => (s || '').toLowerCase().split(/[^a-z0-9가-힣]+/).filter((w) => w.length >= 2)
const _relCache = new Map<string, { id: string; name: string; icon: JSX.Element }[]>()
function relatedToolsFor(tid: string): { id: string; name: string; icon: JSX.Element }[] {
  const cached = _relCache.get(tid)
  if (cached) return cached
  const self = UTILITY_TOOLS.find((t) => t.id === tid)
  if (!self) return []
  const score = new Map<string, number>()
  ;(TOOL_RELATIONS[tid] || []).forEach((r, i) => score.set(r, (score.get(r) || 0) + 100 - i))
  const selfToks = new Set([..._relTok(self.name), ..._relTok(self.intro)])
  const selfGenre = (self as { genre?: string }).genre
  for (const t of UTILITY_TOOLS) {
    if (t.id === tid) continue
    let s = score.get(t.id) || 0
    if (t.group === self.group) s += 8
    const g = (t as { genre?: string }).genre
    if (g && selfGenre && g === selfGenre) s += 20
    const tt = new Set([..._relTok(t.name), ..._relTok(t.intro)])
    let overlap = 0
    selfToks.forEach((w) => { if (tt.has(w)) overlap++ })
    s += overlap * 6
    if (s > 0) score.set(t.id, s)
  }
  const out = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id]) => { const t = UTILITY_TOOLS.find((x) => x.id === id); return t ? { id, name: t.name, icon: <Icon name={iconForTool(t)} size={13} /> } : null })
    .filter((x): x is { id: string; name: string; icon: JSX.Element } => !!x)
  _relCache.set(tid, out)
  return out
}

type ModalName =
  | 'compile'
  | 'platformPublish'
  | 'platformPreview'
  | 'toolhub'
  | 'genrebox'
  | 'snapshotHelp'
  | 'stats'
  | 'style'
  | 'settings'
  | 'newProject'
  | 'projects'
  | 'nameGen'
  | 'backup'
  | 'docLink'
  | 'ai'
  | 'replace'
  | 'palette'
  | 'docTemplate'
  | 'linguistic'
  | 'structure'
  | 'tension'
  | 'creative'
  | null

// 저장 시 10분에 한 번 자동 zip 백업(프로젝트별 최근 15개 롤링).
const AUTO_BACKUP_MS = 10 * 60 * 1000
async function maybeAutoBackup(project: Project) {
  const key = 'sry:lastBackup:' + project.id
  let last = 0
  try {
    last = parseInt(localStorage.getItem(key) || '0', 10) || 0
  } catch {
    /* noop */
  }
  if (Date.now() - last < AUTO_BACKUP_MS) return
  try {
    await saveBackup(project)
    localStorage.setItem(key, String(Date.now()))
  } catch (e) {
    console.warn('자동 백업 실패', e)
  }
}

export default function App() {
  const project = useStore((s) => s.project)
  const dirty = useStore((s) => s.dirty)
  // 폴더 펼침/접기 같은 UI 전용 변경 — 영속(autosave)은 하되 '미저장' 배지/이탈 경고와는 분리.
  const uiDirty = useStore((s) => s.uiDirty)
  const lastSaved = useStore((s) => s.lastSaved)
  const viewMode = useStore((s) => s.viewMode)
  const setView = useStore((s) => s.setView)
  const composition = useStore((s) => s.composition)
  const toggleComposition = useStore((s) => s.toggleComposition)
  // 집중 모드 진입 방식 선택: 현재 창 / 새 창(→ 전체화면·일반). compWindow 가 있으면 별도 창(PortalWindow)에서 집중 모드.
  const [focusStep, setFocusStep] = useState<'none' | 'choose' | 'window'>('none')
  const [showShortcuts, setShowShortcuts] = useState(false) // 단축키 치트시트(#21)
  const [compWindow, setCompWindow] = useState<{ fullscreen: boolean } | null>(null)
  const compWindowRef = useRef<{ fullscreen: boolean } | null>(null)
  compWindowRef.current = compWindow
  // 집중 모드 요청: 이미 켜져 있으면(현재 창/새 창) 끄고, 아니면 방식 선택 모달을 연다.
  //  키보드 핸들러([] deps)에서 호출돼도 안전하도록 현재 상태는 getState()/ref 로 읽는다.
  const requestFocusMode = () => {
    if (useStore.getState().composition) { toggleComposition(); return }
    if (compWindowRef.current) { setCompWindow(null); return }
    setFocusStep('choose')
  }
  const enterFocusHere = () => { setFocusStep('none'); if (!useStore.getState().composition) toggleComposition() }
  const enterFocusWindow = (fullscreen: boolean) => { setFocusStep('none'); if (useStore.getState().composition) toggleComposition(); setCompWindow({ fullscreen }) }
  const toggleSplit = useStore((s) => s.toggleSplit)
  const splitId = useStore((s) => s.splitId)
  const splitDir = useStore((s) => s.splitDir)
  const setSplitDir = useStore((s) => s.setSplitDir)
  const binderVisible = useStore((s) => s.binderVisible)
  const inspectorVisible = useStore((s) => s.inspectorVisible)
  const toggleBinder = useStore((s) => s.toggleBinder)
  const toggleInspector = useStore((s) => s.toggleInspector)
  const newProject = useStore((s) => s.newProject)
  const addProjectEntry = useStore((s) => s.addProjectEntry)
  const loadProject = useStore((s) => s.loadProject)
  const applyRemoteProject = useStore((s) => s.applyRemoteProject)
  const setProjectTitle = useStore((s) => s.setProjectTitle)
  const markSaved = useStore((s) => s.markSaved)
  const addItem = useStore((s) => s.addItem)
  const setBodyRtf = useStore((s) => s.setBodyRtf)
  const activeId = useStore((s) => s.activeId)
  const selectedIds = useStore((s) => s.selectedIds)
  const select = useStore((s) => s.select)
  const setTheme = useStore((s) => s.setTheme)
  const mergeDocuments = useStore((s) => s.mergeDocuments)
  const groupSelection = useStore((s) => s.groupSelection)
  const ungroup = useStore((s) => s.ungroup)
  const moveRelative = useStore((s) => s.moveRelative)
  const duplicateItem = useStore((s) => s.duplicateItem)
  const moveToTrash = useStore((s) => s.moveToTrash)
  const restoreFromTrash = useStore((s) => s.restoreFromTrash)
  const takeSnapshot = useStore((s) => s.takeSnapshot)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const uiSkin = useStore((s) => s.uiSkin)
  // 스킨 전환 코치마크(#4): 각 방향 첫 전환 때만 3걸음 안내(마운트 시엔 미표시).
  const [skinCoach, setSkinCoach] = useState<'classic' | 'studio' | 'aurora' | null>(null)
  const prevSkin = useRef<string | null>(null)
  useEffect(() => {
    if (prevSkin.current !== null && prevSkin.current !== uiSkin) {
      try {
        const key = 'sry:skincoach:' + uiSkin
        if (!localStorage.getItem(key)) { localStorage.setItem(key, '1'); setSkinCoach(uiSkin) }
      } catch { /* noop */ }
    }
    prevSkin.current = uiSkin
  }, [uiSkin])
  const setUiSkin = useStore((s) => s.setUiSkin)

  // 스냅샷 안내창 '다시 안 보기' 설정 + 공용 실행 헬퍼(문서 없으면 첫 문서 자동 선택 후 찍고 인스펙터 스냅샷 탭 열기)
  const [snapSkipHelp, setSnapSkipHelp] = useState<boolean>(() => { try { return localStorage.getItem('sry:snapHelpSkip') === '1' } catch { return false } })
  // 인터랙티브 온보딩 가이드 투어 — localStorage 'sry:tour:done' 없으면 앱 시작 시 자동으로 안내 시작.
  // '그만 보기'/×/Esc/마침 시 닫고 기록(이후 자동으로 안 뜸). 상단 '?' 버튼·보기 메뉴·⌘K 로 다시 열 수 있다.
  const [showTour, setShowTour] = useState<boolean>(() => { try { return localStorage.getItem('sry:tour:done') !== '1' } catch { return false } })
  // 본격 실습형 매뉴얼('더 알아보기') — 자동 시작 아님, 보기 메뉴/⌘K/? 버튼으로만 연다.
  const [showManual, setShowManual] = useState(false)
  // 투어·매뉴얼은 항상 한 번에 하나만(서로 상호배타로 닫는다)
  const startTour = () => { setShowManual(false); setShowTour(true) }
  const endTour = () => { setShowTour(false); try { localStorage.setItem('sry:tour:done', '1') } catch { /* noop */ } }
  const startManual = () => { setShowTour(false); setShowManual(true) }
  const firstTextDocId = (): string | null => {
    const st = useStore.getState()
    if (st.activeId && st.project.items[st.activeId]?.type === 'text') return st.activeId
    return Object.values(st.project.items).find((i) => i.type === 'text' && !i.root)?.id || st.activeId || null
  }
  // 인스펙터를 열되 좁은 화면에서는 '한쪽 열면 다른쪽 닫힘' 규칙을 지킨다(userToggleInspector 와 동일).
  // setState 직접 호출로 규칙을 우회하지 않도록, 인스펙터 강제 노출은 모두 이 헬퍼를 거친다.
  const forceOpenInspector = () => {
    const narrow = window.innerWidth < NARROW_PX
    const st = useStore.getState()
    useStore.setState(narrow && st.binderVisible ? { inspectorVisible: true, binderVisible: false } : { inspectorVisible: true })
  }
  const openSnapshotList = () => {
    const id = firstTextDocId()
    if (id && useStore.getState().activeId !== id) select(id)
    forceOpenInspector()
    useStore.getState().setInspectorTab('snapshots')
  }
  const doTakeSnapshot = () => {
    const id = firstTextDocId()
    if (!id) { flash('스냅샷을 찍을 문서가 없어요. 먼저 글 문서를 만들어 주세요.'); return }
    if (useStore.getState().activeId !== id) select(id)
    // 대기 중인 에디터 입력(200ms 디바운스)을 동기 커밋한 뒤 찍어 '최신 본문'을 보장(마지막 입력 누락 방지)
    window.dispatchEvent(new Event('scriv:flush-editor'))
    const title = useStore.getState().project.items[id]?.title || '문서'
    takeSnapshot(id)
    forceOpenInspector()
    useStore.getState().setInspectorTab('snapshots')
    flash(`📸 ‘${title}’ 스냅샷을 저장했어요 — 우측 인스펙터 ‘스냅샷’ 탭에서 비교·되돌리기 할 수 있어요.`)
  }
  const setSnapSkip = (v: boolean) => { setSnapSkipHelp(v); try { localStorage.setItem('sry:snapHelpSkip', v ? '1' : '0') } catch { /* noop */ } }
  // 명령/메뉴에서 호출: 안내 끄고 '현재 활성 문서가 글 문서'일 때만 바로 찍기.
  // 폴더/비텍스트가 활성이면 임의 문서로 점프하지 않고 대상 문서를 명시하는 안내창을 띄운다.
  const snapshotEntry = () => {
    const st = useStore.getState()
    const active = st.activeId ? st.project.items[st.activeId] : null
    if (snapSkipHelp && active && active.type === 'text') doTakeSnapshot()
    else setModal('snapshotHelp')
  }

  const [binderW, setBinderW] = useState(260)
  const [inspW, setInspW] = useState(300)
  // 좁은 화면 여부(#2): NARROW 이하에서는 바인더/인스펙터를 오버레이로 띄우고 동시 펼침을 막는다.
  const NARROW_PX = 820
  const [isNarrow, setIsNarrow] = useState<boolean>(() => { try { return window.innerWidth < NARROW_PX } catch { return false } })
  // 한 번에 하나의 모달만 — 중첩/겹침 원천 차단
  const [modal, setModal] = useState<ModalName>(null)
  const closeModal = () => setModal(null)
  // 전역 단축키 가드(#6): 모달/도구창/전환확인이 떠 있는지 안정 핸들러에서 읽기 위한 ref(렌더마다 갱신).
  const uiGuardRef = useRef({ modal: null as ModalName, openTools: 0, switching: false, sheet: false })
  const [showFind, setShowFind] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showScratch, setShowScratch] = useState(false)
  // #11: 직전 도구 세션 복원 — 어떤 도구창이 열려 있었는지(+최소화 여부)를 localStorage 에 보관하고 부팅 시 복원.
  //  payload(드롭 데이터·이미지 등)는 직렬화 위험이 있어 저장하지 않는다(어떤 도구가 열렸는지만 복원).
  const TOOL_SESSION_KEY = 'sry:toolSession'
  const loadToolSession = (): { open: string[]; min: string[] } => {
    try {
      const raw = localStorage.getItem(TOOL_SESSION_KEY)
      if (!raw) return { open: [], min: [] }
      const j = JSON.parse(raw)
      const valid = (arr: unknown): string[] => Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string' && UTILITY_TOOLS.some((t) => t.id === x)) : []
      const open = valid(j.open)
      const min = valid(j.min).filter((x) => open.includes(x))
      return { open, min }
    } catch { return { open: [], min: [] } }
  }
  const [openToolIds, setOpenToolIds] = useState<string[]>(() => loadToolSession().open)
  const [minimizedToolIds, setMinimizedToolIds] = useState<string[]>(() => loadToolSession().min)
  const [toolPayloads, setToolPayloads] = useState<Record<string, ToolPayload | undefined>>({})
  const [toolZ, setToolZ] = useState<Record<string, number>>({}) // 창별 z-index(앞으로 가져오기)
  const topZ = useRef(200)
  // 도구 창 z 를 일정 상한(289)으로 클램프 — z 무한 증가가 수집함 아이콘(z 300)을 가리지 않도록.
  // 상한 도달 시 기존 창들의 상대 순서를 보존한 채 200대로 재정렬(맨 앞 창만 최상위).
  const Z_CAP = 289
  const bringToFront = (id: string) => setToolZ((m) => {
    let next = topZ.current + 1
    if (next > Z_CAP) {
      const ordered = Object.entries(m).filter(([k]) => k !== id).sort((a, b) => a[1] - b[1])
      const renorm: Record<string, number> = {}
      let base = 200
      for (const [k] of ordered) renorm[k] = ++base
      next = ++base
      topZ.current = next
      return { ...renorm, [id]: next }
    }
    topZ.current = next
    return { ...m, [id]: next }
  })
  // #1(boot): 세션 복원된 도구창들은 toolZ 가 비어 있어 모두 z=160(ToolWindow 기본값)으로 겹쳐 뜨고
  // tool-dock(하단 독)에 가릴 수 있다. 부팅 직후 1회, 복원된 각 창에 서로 다른 초기 z(200+index, Z_CAP 클램프)를
  // 시드해 겹침을 풀고 마지막 창을 맨 앞에 둔다. (z 정책: 수집함 300 / 도구 Z_CAP 289 유지)
  useEffect(() => {
    const restored = openToolIds // 마운트 시점의 복원 목록(스냅샷)
    if (restored.length === 0) return
    const seed: Record<string, number> = {}
    let zz = 200
    for (const id of restored) seed[id] = (zz = Math.min(zz + 1, Z_CAP))
    topZ.current = zz
    setToolZ((m) => ({ ...seed, ...m })) // 그 사이 사용자가 연 창(m)은 덮어쓰지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const openTool = (id: string, payload?: ToolPayload) => {
    if (payload !== undefined) setToolPayloads((m) => ({ ...m, [id]: payload }))
    setMinimizedToolIds((ids) => ids.filter((x) => x !== id)) // 최소화돼 있었으면 복원
    setOpenToolIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
    bringToFront(id)
    // 최근 사용 도구 기록(#10 콜드스타트 해소) — 도구 허브 상단 '최근 사용' 섹션의 데이터.
    try {
      const a = JSON.parse(localStorage.getItem('sry:tool-recents') || '[]')
      const next = [id, ...(Array.isArray(a) ? a.filter((x: unknown) => typeof x === 'string' && x !== id) : [])].slice(0, 12)
      localStorage.setItem('sry:tool-recents', JSON.stringify(next))
    } catch { /* noop */ }
  }
  const closeTool = (id: string) => {
    setOpenToolIds((ids) => ids.filter((x) => x !== id))
    setMinimizedToolIds((ids) => ids.filter((x) => x !== id))
    setToolPayloads((m) => { const n = { ...m }; delete n[id]; return n })
    cancelImagePick() // 이미지 픽 모드 도구를 닫으면 대기 중 픽 요청 취소(잔류 방지)
  }
  const minimizeTool = (id: string) => setMinimizedToolIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
  const restoreTool = (id: string) => { setMinimizedToolIds((ids) => ids.filter((x) => x !== id)); bringToFront(id) }
  // #1: 열린 도구창 일괄 관리 — 모두 닫기 / 모두 최소화 / 타일 정렬.
  const closeAllTools = () => {
    setOpenToolIds([])
    setMinimizedToolIds([])
    setToolPayloads({})
    cancelImagePick()
  }
  const minimizeAllTools = () => setMinimizedToolIds((prev) => {
    const all = openToolIdsRef.current
    const next = [...new Set([...prev, ...all])]
    return next.length === prev.length && next.every((x) => prev.includes(x)) ? prev : next
  })
  // 타일 정렬: 최소화 해제 후, 열린 도구창들에 정렬 신호를 보낸다(ToolWindow 가 scriv:tile-tools 를 수신해 격자 배치).
  const tileTools = () => {
    setMinimizedToolIds([])
    // 다음 프레임에 신호(최소화 해제 반영 후 배치)
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('scriv:tile-tools', { detail: openToolIdsRef.current })))
  }
  // #11: 도구 세션(열림/최소화 목록) localStorage 영속화 — 디바운스 없이 가벼운 JSON 쓰기.
  const openToolIdsRef = useRef<string[]>(openToolIds)
  openToolIdsRef.current = openToolIds
  useEffect(() => {
    try { localStorage.setItem(TOOL_SESSION_KEY, JSON.stringify({ open: openToolIds, min: minimizedToolIds })) } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openToolIds, minimizedToolIds])
  // 도구 연계 허브에 opener 등록 — 어떤 도구든 openToolLinked(id, payload) 로 관련 도구를 열 수 있다.
  // 공유 라이브러리(인물/장소/이미지/스니펫)를 현재 프로젝트별로 격리(수집함과 일관). 프로젝트 전환 시 재스코프하며,
  // 해당 프로젝트 키가 비어 있으면 레거시 전역 라이브러리를 1회 복제해 옮긴다(기존 데이터 보존).
  useEffect(() => { setLibraryProject(project.id) }, [project.id])

  // 프로젝트 브리지 등록 — 도구가 만든 산출물을 실제 바인더(좌측 파일구조)·DB·캔버스에 실시간 추가.
  useEffect(() => {
    registerOpener((id, payload) => openTool(id, payload))
    // 집필 통계 SSOT 브리지 — 대시보드/스트릭 도구가 코어(Footer/통계)와 같은 숫자를 쓰도록 project.writingHistory 에서 파생.
    registerWritingStats(() => {
      const p = useStore.getState().project
      const s = computeStreak(p.writingHistory)
      const dw = dayWords(p.writingHistory)
      return { todayWords: p.writingHistory[todayYmd()]?.words ?? 0, currentStreak: s.current, longestStreak: s.longest, totalDays: s.totalDays, draftTotal: totalDraftWords(p), dayWords: dw }
    })
    registerProjectBridge((spec: ProjectEntrySpec) => {
      try {
        const rtf = spec.bodyRtf || (spec.bodyHtml ? htmlToRtf(spec.bodyHtml) : undefined)
        const id = addProjectEntry({
          kind: spec.kind, root: spec.root, folder: spec.folder, title: spec.title,
          bodyRtf: rtf, character: spec.character, synopsis: spec.synopsis, icon: spec.icon, meta: spec.meta,
        })
        const where = (spec.root === 'draft' ? '원고' : '자료') + (spec.folder ? ' › ' + spec.folder : '')
        flash('“' + spec.title + '”을(를) 프로젝트에 추가했습니다 (' + where + '). 좌측 바인더·DB 뷰에서 확인하세요.')
        return id
      } catch (e) {
        console.error('프로젝트 추가 실패', e)
        flash('프로젝트에 추가하지 못했습니다.')
        return null
      }
    })
    // 참고문헌 브리지 — 학술/도서 검색 결과를 곧바로 프로젝트 참고문헌(서지)에 추가.
    registerReferenceBridge((spec: ReferenceSpec) => {
      try {
        const id = useStore.getState().addReference({
          type: spec.type || 'other',
          title: spec.title || '',
          authors: spec.authors || [],
          editors: spec.editors,
          year: spec.year,
          month: spec.month,
          container: spec.container,
          publisher: spec.publisher,
          volume: spec.volume,
          issue: spec.issue,
          pages: spec.pages,
          url: spec.url,
          doi: spec.doi,
          accessed: spec.accessed,
          note: spec.note,
        })
        flash('“' + (spec.title || '서지') + '”을(를) 참고문헌에 추가했습니다. 참고문헌 뷰에서 확인하세요.')
        return id
      } catch (e) {
        console.error('참고문헌 추가 실패', e)
        flash('참고문헌에 추가하지 못했습니다.')
        return null
      }
    })
    // 바인더 파일 → 도구창 드롭 해석기: id → {제목/유형/캐릭터필드/본문텍스트}
    registerItemResolver((id) => {
      const it = useStore.getState().project.items[id]
      if (!it) return null
      const ch = (it as unknown as { character?: Record<string, string> }).character
      const character = ch && typeof ch === 'object' ? { ...ch } : undefined
      let text: string | undefined
      try { text = it.bodyRtf ? rtfToPlainText(it.bodyRtf).slice(0, 4000) : undefined } catch { /* noop */ }
      return { id: it.id, title: it.title, type: it.type, character, text }
    })
    // 활성 문서 브리지 — 교정/맞춤법 도구가 현재 편집 중인 본문을 직접 불러오고,
    // 순수 텍스트 오프셋 기준 치환을 서식 보존한 채 본문 RTF 에 제자리 적용한다.
    registerActiveDoc({
      get: () => {
        const s = useStore.getState()
        const id = s.activeId
        if (!id) return null
        const it = s.project.items[id]
        if (!it || it.type !== 'text') return null
        let text = ''
        try { text = it.bodyRtf ? rtfToPlainText(it.bodyRtf) : '' } catch { return null }
        return { id: it.id, title: it.title, text }
      },
      replace: (docId: string, baseText: string, reps: DocReplacement[]) => {
        const s = useStore.getState()
        const it = s.project.items[docId]
        if (!it || it.type !== 'text') return { ok: false, applied: 0, reason: '문서를 찾을 수 없습니다.' }
        let doc
        try { doc = parseRtf(it.bodyRtf || '') } catch { return { ok: false, applied: 0, reason: '본문을 읽지 못했습니다.' } }
        // 가드: 도구가 치환을 계산할 때 본 텍스트와 현재 본문이 다르면(그 사이 편집됨) 적용 거부 — 엉뚱한 위치 치환 방지.
        if (docToPlainText(doc) !== baseText) return { ok: false, applied: 0, reason: '그 사이 본문이 바뀌었습니다. 다시 불러오세요.' }
        // 순수 텍스트 오프셋 → (블록, 런) 평탄화 매핑. 블록 사이 '\n' 은 어떤 런에도 속하지 않는 분리자.
        interface Seg { start: number; bi: number; ri: number }
        const segs: Seg[] = []
        let pos = 0
        doc.blocks.forEach((b, bi) => {
          b.runs.forEach((_r, ri) => { segs.push({ start: pos, bi, ri }); pos += doc.blocks[bi].runs[ri].text.length })
          if (bi < doc.blocks.length - 1) pos += 1 // 블록 분리 '\n'
        })
        const total = pos
        // 정렬·검증(오름차순·비중첩·범위 내).
        const sorted = [...reps].filter((r) => r.index >= 0 && r.end > r.index && r.end <= total).sort((a, b) => a.index - b.index)
        let lastEnd = -1
        interface Edit { bi: number; ri: number; from: number; to: number; text: string }
        const edits: Edit[] = []
        for (const rep of sorted) {
          if (rep.index < lastEnd) return { ok: false, applied: 0, reason: '겹치는 수정이 있습니다.' }
          // 치환 시작이 속한 런(길이>0) 찾기
          let owner: Seg | null = null
          for (const sg of segs) {
            const runLen = doc.blocks[sg.bi].runs[sg.ri].text.length
            if (runLen > 0 && rep.index >= sg.start && rep.index < sg.start + runLen) { owner = sg; break }
          }
          if (!owner) return { ok: false, applied: 0, reason: '수정 위치를 본문에서 찾지 못했습니다.' }
          const runLen = doc.blocks[owner.bi].runs[owner.ri].text.length
          // 치환 끝이 같은 런 안에 있어야 함(런/블록 경계를 넘으면 서식 충돌 → 적용 안 함)
          if (rep.end > owner.start + runLen) return { ok: false, applied: 0, reason: '수정 범위가 서식 경계를 넘습니다.' }
          edits.push({ bi: owner.bi, ri: owner.ri, from: rep.index - owner.start, to: rep.end - owner.start, text: rep.replacement })
          lastEnd = rep.end
        }
        if (edits.length === 0) return { ok: false, applied: 0, reason: '적용할 수정이 없습니다.' }
        // 신선한 복제본에 적용(원본 doc 은 가드 비교용). 같은 런 안에서는 뒤에서부터 적용해 오프셋이 밀리지 않게.
        const next = parseRtf(it.bodyRtf || '')
        const byRun = new Map<string, Edit[]>()
        for (const e of edits) { const k = e.bi + ':' + e.ri; const arr = byRun.get(k) || []; arr.push(e); byRun.set(k, arr) }
        byRun.forEach((arr) => {
          arr.sort((a, b) => b.from - a.from)
          const run = next.blocks[arr[0].bi].runs[arr[0].ri]
          let t = run.text
          for (const e of arr) t = t.slice(0, e.from) + e.text + t.slice(e.to)
          run.text = t
        })
        let rtf: string
        try { rtf = serializeRtf(next) } catch { return { ok: false, applied: 0, reason: '본문을 저장하지 못했습니다.' } }
        useStore.getState().setBodyRtf(docId, rtf)
        return { ok: true, applied: edits.length }
      },
    })
    /* eslint-disable-next-line */
  }, [])
  // 자동화/테스트용 무해한 훅: 콘솔이나 E2E에서 도구를 직접 열고 상태를 점검할 수 있게 한다.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__openTool = openTool
    w.__closeTool = closeTool
    w.__scriv = {
      state: () => {
        const s = useStore.getState()
        return { id: s.project.id, dirty: s.dirty, activeId: s.activeId, items: Object.keys(s.project.items).length, root: s.project.rootOrder.length, modified: s.project.modified }
      },
      setBody: (rtf: string) => {
        const s = useStore.getState()
        let id = s.activeId
        if (!id) id = Object.keys(s.project.items).find((k) => s.project.items[k].type === 'text') || null
        if (id) s.setBodyRtf(id, rtf)
        return id
      },
      bodyOf: (id: string) => useStore.getState().project.items[id]?.bodyRtf || '',
      entries: () => Object.values(useStore.getState().project.items).map((i) => ({ id: i.id, title: i.title, type: i.type, parentId: i.parentId })),
    }
    // .sry 왕복(라이브러리·수집함 동봉) 검증용 무해한 훅.
    w.__sryfmt = {
      build: () => buildSryFileMap(useStore.getState().project),
      read: (fm: Record<string, string>) => readSryFileMap(fm),
      apply: (fm: Record<string, string>, pid: string) => applySryAux(fm, pid),
    }
    w.__startTour = () => { setShowManual(false); setShowTour(true) } // 가이드 투어 검증용 훅
    w.__startManual = () => { setShowTour(false); setShowManual(true) } // 실습 매뉴얼 검증용 훅
    w.__setModal = (m: ModalName | null) => setModal(m) // UI 전수 검증용(모달 열기/닫기)
    w.__setView = (v: typeof viewMode) => setView(v) // UI 전수 검증용(뷰 전환)
  }, [])
  const [showSprint, setShowSprint] = useState(false)
  const [showPrompts, setShowPrompts] = useState(false)
  const [showRead, setShowRead] = useState(false)
  const [quickRefs, setQuickRefs] = useState<string[]>([])
  const openQuickRef = (id: string) => setQuickRefs((r) => (r.includes(id) ? r : [...r, id]))
  const [status, setStatus] = useState('')
  // 폴더 핸들에 그 핸들로 연/저장한 '프로젝트 id'를 함께 묶는다 — 다른 프로젝트로 교체된 뒤 그 폴더에
  // 덮어써 원고가 소실되는 것을 막기 위해, id 가 현재 프로젝트와 일치할 때만 그 핸들에 기록한다(데이터 안전).
  const scrivHandle = useRef<{ handle: FileSystemDirectoryHandle; id: string } | null>(null)
  const scrivHandleFor = (id: string): FileSystemDirectoryHandle | null =>
    scrivHandle.current && scrivHandle.current.id === id ? scrivHandle.current.handle : null

  const theme = project.settings.theme

  // 테마 적용
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // 모바일/좁은 화면: 바인더·인스펙터 자동 접기.
  // 사용자가 좁은 화면에서 직접 패널을 다시 열면(override), 이후 리사이즈에서 다시 강제로 접지 않는다.
  const panelOverride = useRef(false)
  useEffect(() => {
    const NARROW = NARROW_PX
    let wasNarrow = window.innerWidth < NARROW
    if (wasNarrow) useStore.setState({ binderVisible: false, inspectorVisible: false })
    const onResize = () => {
      const narrow = window.innerWidth < NARROW
      setIsNarrow(narrow)
      if (narrow && !wasNarrow && !panelOverride.current) {
        useStore.setState({ binderVisible: false, inspectorVisible: false })
      }
      if (!narrow) panelOverride.current = false // 넓어지면 override 해제
      wasNarrow = narrow
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 문서 이동 히스토리(뒤로/앞으로) ----
  const [nav, setNav] = useState<{ stack: string[]; pos: number }>({ stack: [], pos: -1 })
  const navRef = useRef(nav)
  navRef.current = nav
  const navigating = useRef(false)
  useEffect(() => {
    if (!activeId) return
    if (navigating.current) {
      navigating.current = false
      return
    }
    setNav((n) => {
      if (n.stack[n.pos] === activeId) return n
      const stack = [...n.stack.slice(0, n.pos + 1), activeId].slice(-100)
      return { stack, pos: stack.length - 1 }
    })
  }, [activeId])
  const navTo = (pos: number) => {
    const n = navRef.current
    const id = n.stack[pos]
    if (!id || !useStore.getState().project.items[id]) return
    navigating.current = true
    select(id)
    setView('editor')
    setNav((x) => ({ ...x, pos }))
  }
  const goBack = () => {
    const n = navRef.current
    if (n.pos > 0) navTo(n.pos - 1)
  }
  const goForward = () => {
    const n = navRef.current
    if (n.pos < n.stack.length - 1) navTo(n.pos + 1)
  }
  // 다음/이전 '텍스트' 문서로 순차 이동(#5) — flattenVisible 순서 기준. 긴 원고 키보드 집필/검토용.
  const goDocStep = (dir: 1 | -1) => {
    const st = useStore.getState()
    const order = flattenVisible(st.project).filter((id) => st.project.items[id]?.type === 'text')
    if (order.length === 0) return
    const cur = st.activeId && order.includes(st.activeId) ? order.indexOf(st.activeId) : -1
    let next: number
    if (cur === -1) next = dir === 1 ? 0 : order.length - 1
    else next = cur + dir
    if (next < 0 || next >= order.length) return // 양끝에서는 순환하지 않음(끝 인지)
    select(order[next])
    setView('editor')
  }

  // 우리가 마지막으로 로드/저장한 시점의 modified — 다른 탭의 외부 저장 감지 기준선
  const baseModified = useRef(0)
  // 프로젝트 전환(새로 만들기/열기)시 기준선 재설정(편집 시에는 id 가 안 바뀌므로 발화하지 않음)
  useEffect(() => {
    baseModified.current = useStore.getState().project.modified
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  // 마지막 프로젝트 복원 — 로드 실패/손상 시 최신 백업으로 자동 복구(데이터 소실 방지)
  useEffect(() => {
    requestPersistence()
    const last = getLastProjectId()
    if (!last) {
      // 첫 실행(복원할 프로젝트 없음): 빈 화면 대신 기본 프로젝트의 첫 문서를 자동 선택(온보딩).
      const st = useStore.getState()
      if (!st.activeId) {
        const firstText = Object.values(st.project.items).find((i) => i.type === 'text' && !i.root)
        if (firstText) st.select(firstText.id)
      }
      // 데이터 안전: 첫 실행의 기본 프로젝트를 즉시 IDB 에 기록하고 마지막 프로젝트로 기억한다.
      // 그렇지 않으면 원고를 한 글자도 안 고친 채 수집함·공유 라이브러리(프로젝트별 키)에 담은 내용이
      // 새로고침 시 '새 프로젝트 id' 로 바뀌어 고아가 되던 문제(수집함 E2E 에서 확인).
      // (레거시 마이그레이션이 비동기로 lastProjectId 를 채울 수 있으므로, 그 사이 값이 생겼으면 덮어쓰지 않는다.)
      const fresh = st.project
      idbSave(fresh).then(() => { if (!getLastProjectId()) setLastProjectId(fresh.id) }).catch(() => {})
      return
    }
    ;(async () => {
      try {
        const p = await idbLoad(last)
        if (p) {
          loadProject(p) // loadProject 내부에서 normalizeProject(구조 자동복구) 적용
          baseModified.current = useStore.getState().project.modified
          return
        }
      } catch (e) {
        console.error('프로젝트 로드 실패 — 백업 복구를 시도합니다.', e)
      }
      // 여기 도달 = IDB 레코드 없음/손상. 최신 백업으로 복구 시도.
      try {
        const bks = await listBackups(last)
        if (bks.length) {
          const rec = await loadBackup(bks[0].id)
          if (rec) {
            loadProject(rec)
            try { const files = await loadBackupFiles(bks[0].id); if (files) await applySryAux(files, rec.id) } catch { /* noop */ }
            baseModified.current = useStore.getState().project.modified
            flash('이전 데이터를 직접 불러오지 못해 최신 백업으로 복구했습니다.')
            return
          }
        }
      } catch (e) {
        console.error('백업 복구 실패', e)
      }
      // #18: IDB 레코드도 백업도 없음 — 조용히 기본 프로젝트로 떨어지지 않고 사용자에게 명시 안내 + 백업/복원 유도.
      // (현재 화면의 기본 새 프로젝트는 그대로 유지 — 어떤 원고도 덮어쓰지 않는다.)
      flash('이전 프로젝트를 찾지 못했어요. 백업/복원에서 복구하거나 .sry 파일을 열어 보세요.')
      setModal('backup')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 떠나기 전 경고 + 베스트에포트 저장(실수로 닫기/새로고침 시 미저장 손실 방지)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // 에디터 DOM 에만 있고 아직 스토어에 커밋되지 않은 마지막 입력을 강제 반영(디바운스 유실 방지).
      try { window.dispatchEvent(new Event('scriv:flush-editor')) } catch { /* noop */ }
      const st = useStore.getState()
      // uiDirty(펼침 상태 등)도 베스트에포트로 저장은 하되, 이탈 경고 프롬프트는 원고 미저장(dirty)일 때만 띄운다.
      if (!st.dirty && !st.uiDirty) return
      try { idbSave(st.project) } catch { /* 베스트에포트 */ }
      if (!st.dirty) return // UI 전용 변경만 있으면 경고 프롬프트 없이 조용히 저장만 시도
      e.preventDefault()
      e.returnValue = '' // 표준 미저장 경고 프롬프트
    }
    // 탭이 백그라운드로 가거나 닫히기 직전(특히 모바일)에 IDB 로 강제 플러시
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        try { window.dispatchEvent(new Event('scriv:flush-editor')) } catch { /* noop */ }
        const st = useStore.getState()
        if (st.dirty || st.uiDirty) {
          const p = st.project
          idbSave(p).then(() => setLastProjectId(p.id)).catch(() => {})
        }
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onHide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 다중 탭 동기화
  const syncRef = useRef<SyncChannel | null>(null)
  useEffect(() => {
    syncRef.current = createSyncChannel((id, modified) => {
      const st = useStore.getState()
      if (st.project.id === id && !st.dirty && modified > st.project.modified) {
        idbLoad(id).then((p) => {
          // 비동기 로드 사이에 로컬에서 편집이 시작됐으면(더티) 덮어쓰지 않음
          const latest = useStore.getState()
          if (p && !latest.dirty && latest.project.id === id && p.modified > latest.project.modified) {
            // [C] loadProject 대신 보존형 적용 — 현재 뷰/네비/선택 상태를 리셋하지 않는다.
            applyRemoteProject(p)
            baseModified.current = p.modified
            flash('다른 탭의 변경을 반영했습니다.')
          }
        })
      }
    })
    return () => syncRef.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2600)
  }

  // 컴포넌트가 dispatch 하는 안내 메시지 표시(예: 깨진 내부 링크)
  useEffect(() => {
    const onFlash = (e: Event) => flash(String((e as CustomEvent).detail || ''))
    window.addEventListener('scriv:flash', onFlash as EventListener)
    return () => window.removeEventListener('scriv:flash', onFlash as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 연재 대시보드 등에서 특정 회차의 독자뷰 미리보기 열기
  useEffect(() => {
    const onReader = (e: Event) => {
      const id = String((e as CustomEvent).detail || '')
      if (id) useStore.getState().select(id)
      setModal('platformPreview')
    }
    window.addEventListener('scriv:reader-preview', onReader as EventListener)
    return () => window.removeEventListener('scriv:reader-preview', onReader as EventListener)
  }, [])

  // 목표 달성 축하 — 세션/원고 목표를 넘기는 순간 1회 안내(종류별·날짜별 1회)
  const celebrated = useRef<Set<string>>(new Set())
  useEffect(() => {
    const s = project.settings
    const draft = totalDraftWords(project)
    const session = Math.max(0, draft - useStore.getState().sessionStartWords)
    const day = new Date().toDateString()
    const once = (key: string, msg: string) => {
      const k = day + ':' + key
      if (celebrated.current.has(k)) return
      celebrated.current.add(k)
      flash(msg)
    }
    if (s.sessionTarget > 0 && session >= s.sessionTarget) once('session', `세션 목표 ${s.sessionTarget.toLocaleString()}단어 달성! 🎉`)
    if (s.projectTarget > 0 && draft >= s.projectTarget) once('project', `원고 목표 ${s.projectTarget.toLocaleString()}단어 달성! 🏆 축하합니다!`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project])

  // 자동 저장: IndexedDB + (.scriv 폴더 핸들 있으면 패키지 기록)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const retryTimer = useRef<ReturnType<typeof setTimeout>>()
  const quotaWarned = useRef(false)
  const [saveError, setSaveError] = useState(false)
  // 전역 UI 스케일(글자 크기) — 큰/작은 모니터·태블릿 대응. zoom 으로 앱 전체·창·팝업·내용이 함께 반응형 확대/축소.
  const [uiScale, setUiScale] = useState<number>(() => {
    try { return Math.max(0.8, Math.min(1.6, parseFloat(localStorage.getItem('sry:uiScale') || '1') || 1)) } catch { return 1 }
  })
  useEffect(() => {
    const v = Math.max(0.8, Math.min(1.6, uiScale))
    ;(document.documentElement.style as unknown as { zoom: string }).zoom = String(v)
    try { localStorage.setItem('sry:uiScale', String(v)) } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent('scriv:uiscale')) // 열린 도구 창들이 재정렬되도록
  }, [uiScale])
  const changeScale = (d: number) => setUiScale((s) => Math.round(Math.max(0.8, Math.min(1.6, s + d)) * 100) / 100)
  const resetScale = () => setUiScale(1)
  // 백업 모달의 '파일에서 복원(.sry 열기…)' → 기존 파일 피커 재사용(#27 재난 복구 경로).
  useEffect(() => {
    const openPicker = () => fileInput.current?.click()
    window.addEventListener('scriv:open-sry-picker', openPicker)
    return () => window.removeEventListener('scriv:open-sry-picker', openPicker)
  }, [])

  // OS 파일을 드롭존 밖(본문 등)에 떨어뜨리면 브라우저가 그 파일로 '이동'해 앱이 통째로 언로드된다
  //  → 미저장 변경 유실 위험. 전역에서 기본 동작만 막는다(지정 드롭존의 React 핸들러는 그대로 동작).
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault() }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', prevent) }
  }, [])

  // 연속 집필 중 자동저장이 '무기한 연기'되지 않도록 최초 dirty 시각을 기억한다.
  //  (에디터가 ~200ms 마다 커밋 → 이 효과가 매번 타이머를 리셋 → 쉬지 않고 쓰면 저장이 영영 안 됨)
  //  최대 유예(interval×4, 최소 8초)를 넘기면 타이핑 중이어도 즉시 저장한다(데이터 안전).
  const firstDirtyAt = useRef<number | null>(null)
  useEffect(() => {
    // dirty(원고 변경) 또는 uiDirty(펼침 상태 등 UI 변경) 어느 쪽이든 영속이 필요하면 자동저장한다.
    if (!dirty && !uiDirty) { firstDirtyAt.current = null; return }
    const interval = project.settings.autosaveInterval
    if (interval === 0) return // 자동저장 끔
    if (firstDirtyAt.current == null) firstDirtyAt.current = Date.now()
    const maxDefer = Math.max((interval || 1500) * 4, 8000)
    const overdue = Date.now() - firstDirtyAt.current >= maxDefer
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      // 디바운스 사이에 다른 프로젝트가 로드됐으면 이 저장은 건너뛴다(엉뚱한 덮어쓰기 방지)
      if (useStore.getState().project.id !== project.id) return
      try {
        // 다른 탭이 우리가 모르는 변경을 저장했는지 감지 → 그 버전을 '먼저' 백업에 안전히 보존한 뒤에만 덮어쓴다.
        // 백업이 실패하면 덮어쓰지 않고(throw) 다음 주기에 재시도 → 다른 탭 작업 손실 방지.
        const stored = await idbLoad(project.id)
        if (stored && stored.id === project.id && stored.modified > baseModified.current) {
          await saveBackup(stored)
          flash('다른 탭의 최신 변경을 백업에 보관했습니다(복원 가능).')
        }
        await idbSave(project) // 내부에서 되읽기 검증 — 실패 시 throw
        baseModified.current = project.modified
        setLastProjectId(project.id)
        // [B] 자동저장도 인라인 미디어 버전(Async)으로 기록 — 동기 buildScrivPackage 는 미디어 dataUrl 이 없어
        // 디스크 scrivweb.json 의 인라인 미디어를 소실시킨다.
        { const h = scrivHandleFor(project.id); if (h) await writeFileMap(await buildSryFileMap(project, { inlineStashMedia: false }), h) } // 자동저장: 라이브러리/수집함 사이드카는 갱신(폴더 최신 유지)하되 무거운 수집함 미디어 재인코딩만 생략(명시 저장 시 미디어까지 동봉)
        markSaved()
        setSaveError(false)
        syncRef.current?.post(project.id, project.modified)
        await maybeAutoBackup(project)
        // 저장공간 임박 경고(1회성): 잔여 공간 부족 시 내보내기 권장
        try {
          const est = await storageEstimate()
          if (est && est.quota > 0 && est.ratio > 0.92 && !quotaWarned.current) {
            quotaWarned.current = true
            flash('⚠ 브라우저 저장공간이 거의 찼습니다. .sry 파일 또는 백업으로 내보내 두세요.')
          }
        } catch { /* noop */ }
      } catch (e) {
        // dirty 는 그대로 유지(markSaved 호출 안 됨) → 다음 변경/주기에 자동 재시도.
        console.error('자동 저장 실패 — 재시도합니다.', e)
        setSaveError(true)
        flash('⚠ 자동 저장에 실패했습니다. 변경분은 보존되며 곧 다시 시도합니다. 중요하면 백업 내보내기를 해두세요.')
        // 짧은 지연 후 1회 즉시 재시도(여전히 같은 프로젝트일 때만)
        retryTimer.current = setTimeout(() => {
          if (useStore.getState().dirty && useStore.getState().project.id === project.id) {
            idbSave(useStore.getState().project)
              .then(() => { baseModified.current = useStore.getState().project.modified; setLastProjectId(project.id); markSaved(); setSaveError(false) })
              .catch((err) => console.error('재시도 저장도 실패', err))
          }
        }, 4000)
      }
    }, overdue ? 0 : (interval ?? 1500)) // 유예 초과 시 즉시 저장(연속 타이핑 중 무기한 연기 방지)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [project, dirty, uiDirty, markSaved])

  // #3: 자동저장 설정(autosaveInterval)과 무관하게 자동 zip 백업을 보장한다.
  // maybeAutoBackup 은 내부적으로 AUTO_BACKUP_MS(10분) 간격으로 자체 디바운스하므로
  // 주기 타이머 + 탭 재가시화 시점에 호출해도 과도한 백업이 생기지 않는다(시점 기록 기반 1회).
  useEffect(() => {
    const tick = () => {
      const st = useStore.getState()
      // 빈/초기 프로젝트가 아니고 무언가 보관할 게 있을 때만(불필요한 백업 방지)
      if (st.project && Object.keys(st.project.items).length > 0) {
        maybeAutoBackup(st.project).catch(() => {})
      }
    }
    const id = setInterval(tick, AUTO_BACKUP_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 저장(수동) — 저장 버튼 / ⌘S 공용. .scriv 핸들이 있으면 패키지로, 없으면 IndexedDB 로. ----
  const saveNow = () => {
    const proj = useStore.getState().project
    if (scrivHandleFor(proj.id)) { saveSryFolder(); return }
    idbSave(proj).then(
      () => {
        baseModified.current = proj.modified
        setLastProjectId(proj.id)
        markSaved()
        setSaveError(false)
        flash('저장됨 (브라우저에 보관)')
        // #17: 수동 저장도 자동저장과 동일하게 다중탭 동기화 통지 + 자동 zip 백업 보장.
        syncRef.current?.post(proj.id, proj.modified)
        maybeAutoBackup(proj).catch(() => {})
      },
      (e) => { console.error('수동 저장 실패', e); setSaveError(true); flash('⚠ 저장 실패 — 변경분은 보존됩니다. 백업/내보내기를 권장합니다.') },
    )
  }
  // ---- .scriv 저장/열기 ----
  const saveScrivFolder = async () => {
    if (!supportsFS()) return flash('이 브라우저는 폴더 저장을 미지원합니다. .scriv.zip 을 쓰세요.')
    try {
      // [A] 핸들이 이미 있으면 picker 없이 그 핸들에 직접 기록 — 매번 picker 가 뜨거나 .scriv 안에 .scriv 가
      // 중첩 생성되는 것을 방지. picker 는 최초 저장(핸들 없을 때)만 띄운다.
      const existing = scrivHandleFor(project.id)
      if (existing) {
        // 폴더 쓰기가 실패해도 명시 저장분이 사라지지 않도록 IndexedDB 를 먼저 영속화.
        await idbSave(project).catch(() => {})
        baseModified.current = project.modified
        setLastProjectId(project.id)
        await writeFileMap(await buildScrivPackageAsync(project), existing)
        markSaved()
        flash('.scriv 패키지에 저장했습니다.')
        return
      }
      const parent = await pickDirectory('readwrite')
      const dir = await parent.getDirectoryHandle(projectTitleForScriv(project) + '.scriv', { create: true })
      await writeFileMap(await buildScrivPackageAsync(project), dir)
      scrivHandle.current = { handle: dir, id: project.id }
      await idbSave(project).catch(() => {})
      baseModified.current = project.modified
      setLastProjectId(project.id)
      markSaved()
      flash('.scriv 패키지로 저장했습니다 (이후 자동 동기화).')
    } catch {
      flash('저장 취소/실패')
    }
  }
  const openScrivFolder = async () => {
    if (!supportsFS()) return flash('이 브라우저는 폴더 열기를 미지원합니다. .scriv.zip 을 쓰세요.')
    try {
      const dir = await pickDirectory('readwrite')
      const files = await readFileMap(dir)
      loadProject(await readScrivPackageAsync(files))
      scrivHandle.current = { handle: dir, id: useStore.getState().project.id }
      flash('.scriv 프로젝트를 열었습니다.')
    } catch (e) {
      flash('열기 실패: 올바른 .scriv 폴더인지 확인하세요.')
    }
  }
  const saveScrivZip = async () => {
    const blob = await fileMapToZip(await buildScrivPackageAsync(project))
    downloadBlob(blob, projectTitleForScriv(project) + '.scriv.zip')
    flash('.scriv.zip 으로 내보냈습니다.')
  }
  const fileInput = useRef<HTMLInputElement>(null)
  const onImportScrivZip = async (file: File) => {
    try {
      const files = await zipToFileMap(file)
      loadProject(await readScrivPackageAsync(files))
      flash('.scriv.zip 프로젝트를 열었습니다.')
    } catch {
      flash('올바른 .scriv.zip 이 아닙니다.')
    }
  }
  // ---- sry 네이티브 저장/열기 (우리 앱 고유 포맷) ----
  // 폴더 패키지(<제목>.sry: sry.json + Files/<id>.rtf) + 휴대 파일(.sry.zip). 미디어 인라인으로 자체완결.
  const saveSryFolder = async () => {
    if (!supportsFS()) return flash('이 브라우저는 폴더 저장을 미지원합니다. .sry 파일로 내보내세요.')
    try {
      const existing = scrivHandleFor(project.id)
      if (existing) {
        await idbSave(project).catch(() => {})
        baseModified.current = project.modified
        setLastProjectId(project.id)
        await writeFileMap(await buildSryFileMap(project), existing)
        markSaved()
        flash('sry 프로젝트 폴더에 저장했습니다.')
        // #17: 수동 폴더 저장도 동기화 통지 + 자동 zip 백업 보장.
        syncRef.current?.post(project.id, project.modified)
        maybeAutoBackup(project).catch(() => {})
        return
      }
      const parent = await pickDirectory('readwrite')
      const dir = await parent.getDirectoryHandle(sryBaseName(project) + '.sry', { create: true })
      await writeFileMap(await buildSryFileMap(project), dir)
      scrivHandle.current = { handle: dir, id: project.id }
      await idbSave(project).catch(() => {})
      baseModified.current = project.modified
      setLastProjectId(project.id)
      markSaved()
      flash('sry 프로젝트 폴더로 저장했습니다 (이후 자동 동기화).')
      // #17: 수동 폴더 저장도 동기화 통지 + 자동 zip 백업 보장.
      syncRef.current?.post(project.id, project.modified)
      maybeAutoBackup(project).catch(() => {})
    } catch {
      flash('저장 취소/실패')
    }
  }
  const openSryFolder = async () => {
    if (!supportsFS()) return flash('이 브라우저는 폴더 열기를 미지원합니다. .sry 파일을 여세요.')
    // #20: 전환 확인을 picker 보다 '먼저' 묻는다 — 사용자가 취소하면 폴더 선택/권한 다이얼로그를 띄우지 않는다.
    requestSwitch(async () => {
      try {
        const dir = await pickDirectory('readwrite')
        flash('프로젝트 폴더를 읽는 중…')
        const files = await readFileMap(dir)
        const proj = await readSryFileMap(files)
        loadProject(proj)
        scrivHandle.current = { handle: dir, id: useStore.getState().project.id }
        await applySryAux(files, proj.id) // 라이브러리·수집함은 확정(loadProject) 직후에만 복원
        await idbSave(useStore.getState().project).catch(() => {}) // 가져온 프로젝트를 즉시 브라우저에 영속(새로고침 시 소실 방지)
        setLastProjectId(proj.id); baseModified.current = proj.modified
        flash('sry 프로젝트를 열었습니다.')
      } catch {
        flash('열기 취소/실패: 올바른 sry 프로젝트 폴더인지 확인하세요.')
      }
    })
  }
  const saveSryZip = async () => {
    const blob = await fileMapToZip(await buildSryFileMap(project))
    downloadBlob(blob, sryBaseName(project) + '.sry.zip')
    flash('.sry 파일로 내보냈습니다.')
  }
  // ---- 프로젝트 전환(새로 만들기/열기) 전 현재 작업 저장 확인 ----
  // 전환하면 현재 프로젝트가 화면에서 사라지므로, .sry 파일로 내보낼지 먼저 묻는다(브라우저엔 자동저장됨).
  const pendingSwitch = useRef<null | (() => void | Promise<void>)>(null)
  const [switchAsk, setSwitchAsk] = useState<{ title: string; note?: string } | null>(null)
  const requestSwitch = (proceed: () => void | Promise<void>, note?: string) => {
    try { window.dispatchEvent(new Event('scriv:flush-editor')) } catch { /* noop */ }
    // 미저장 변경이 없으면(자동저장 완료 상태) 확인 모달 없이 바로 전환 — 다작 작가의 전환 마찰 제거(#11).
    //  단, note 가 있는 전환(예: 같은 프로젝트를 옛 .sry 백업으로 '되돌리기')은 파괴적 경고이므로 절대 스킵하지 않는다(리뷰 F1).
    //  dirty 판정은 flush '이후'에 읽는다(에디터 디바운스 대기분까지 반영).
    const st = useStore.getState()
    if (!note && !st.dirty && !st.uiDirty) { void proceed(); return }
    pendingSwitch.current = proceed
    setSwitchAsk({ title: st.project.title || '제목 없는 프로젝트', note })
  }
  const doProceedSwitch = async (exportFirst: boolean) => {
    const proceed = pendingSwitch.current
    pendingSwitch.current = null
    setSwitchAsk(null)
    if (!proceed) return
    try {
      if (exportFirst) await saveSryZip()                            // .sry 파일로 백업(다운로드)
      await idbSave(useStore.getState().project).catch(() => {})     // 전환 전 현재 프로젝트 IDB 영속
    } catch { /* noop */ }
    await proceed()
  }
  const onImportSryFile = async (file: File) => {
    try {
      const files = await zipToFileMap(file)
      // 취소 안전: 본문 미디어 blob 까지 쓰는 readSryFileMap 은 전환 '확정' 콜백 안에서만 실행한다(취소 시 무손상).
      let sameId = false
      try { const idx = files['sry.json'] || files['project.json']; if (idx) sameId = (JSON.parse(idx).id === useStore.getState().project.id) } catch { /* noop */ }
      requestSwitch(
        async () => {
          try {
            const proj = await readSryFileMap(files)
            // 같은 프로젝트를 옛 .sry 로 되돌리는 경우, 덮어쓰기 '직전' 현재본을 백업에 보관(리뷰 F1 이중 안전망).
            if (sameId) { try { const stored = await idbLoad(proj.id); if (stored) await saveBackup(stored) } catch { /* 백업 실패해도 복원은 진행(사용자가 확인함) */ } }
            loadProject(proj)
            await applySryAux(files, proj.id)
            await idbSave(useStore.getState().project).catch(() => {}) // 즉시 브라우저 영속(새로고침 시 소실 방지)
            setLastProjectId(proj.id); baseModified.current = proj.modified
            flash('프로젝트를 열었습니다.')
          } catch { flash('올바른 .sry 파일이 아닙니다.') }
        },
        sameId ? '이 프로젝트의 .sry 백업을 불러옵니다 — 현재 원고·라이브러리·수집함이 이 백업 시점으로 되돌아갑니다.' : undefined,
      )
    } catch {
      flash('올바른 .sry 파일이 아닙니다.')
    }
  }
  // 프로젝트 목록에서 IndexedDB 의 다른 프로젝트를 연다(전환 저장확인 경유).
  // 최근 프로젝트(#11): ⌘K 팔레트에서 바로 전환 — 목록은 메타(idbList)만 읽어 가볍게.
  const [recentProjects, setRecentProjects] = useState<{ id: string; title: string }[]>([])
  useEffect(() => {
    let alive = true
    idbList().then((list) => { if (alive) setRecentProjects(list.filter((p) => p.id !== project.id).slice(0, 3).map((p) => ({ id: p.id, title: p.title || '제목 없는 프로젝트' }))) }).catch(() => {})
    return () => { alive = false }
  }, [project.id])

  const openProjectById = (id: string) => requestSwitch(async () => {
    const p = await idbLoad(id)
    if (p) { loadProject(p); setLastProjectId(id); flash('프로젝트를 열었습니다.') }
    else flash('프로젝트를 불러오지 못했습니다.')
  })
  const importRtf = async () => {
    try {
      if (supportsFS()) {
        const res = await openSingleRtf()
        if (res) {
          if (res.size > MAX_IMPORT_BYTES) {
            flash(`파일이 너무 큽니다(최대 ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)}MB).`)
            return
          }
          const id = addItem('text', 'root-draft', res.name)
          setBodyRtf(id, res.rtf)
          setView('editor')
          flash(`"${res.name}" 을(를) 원고 폴더에 가져왔습니다.`)
        }
      } else {
        const inp = document.createElement('input')
        inp.type = 'file'
        inp.accept = '.rtf'
        inp.onchange = async () => {
          const f = inp.files?.[0]
          if (f && !tooBig(f)) {
            const id = addItem('text', 'root-draft', f.name.replace(/\.rtf$/i, ''))
            setBodyRtf(id, await f.text())
            setView('editor')
            flash(`"${f.name}" 을(를) 원고 폴더에 가져왔습니다.`)
          }
        }
        inp.click()
      }
    } catch (err) {
      // 취소(AbortError)와 실제 실패를 구분해 안내(#26) — 취소는 조용히, 실패는 원인 안내.
      if ((err as DOMException)?.name === 'AbortError') return
      flash('가져오기에 실패했습니다 — 파일을 열 수 없거나 형식이 올바르지 않아요.')
    }
  }

  // ---- 각본 가져오기 (Fountain / FDX) ----
  const MAX_IMPORT_BYTES = 40 * 1024 * 1024 // 40MB 상한(UI 멈춤 방지)
  const pickFile = (accept: string): Promise<File | null> =>
    new Promise((resolve) => {
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.accept = accept
      inp.onchange = () => resolve(inp.files?.[0] ?? null)
      inp.click()
    })
  const tooBig = (f: File) => {
    if (f.size > MAX_IMPORT_BYTES) {
      flash(`파일이 너무 큽니다(최대 ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)}MB).`)
      return true
    }
    return false
  }

  // ---- 산문 가져오기 (.txt / .md) — 가장 흔한 포맷의 직송 경로(#13). 빈 줄=문단, 단일 줄바꿈=<br> 로 보존.
  const importText = async () => {
    const f = await pickFile('.txt,.md,.markdown,text/plain')
    if (!f || tooBig(f)) return
    try {
      const raw = (await f.text()).replace(/\r\n?/g, '\n')
      const isMd = /\.(md|markdown)$/i.test(f.name)
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // 마크다운은 최소 변환만: #/##/### 제목, **굵게**, *기울임* (그 외 문법은 평문 유지 — 원문 보존 우선).
      const inline = (s: string) => {
        let h = esc(s)
        if (isMd) h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>')
        return h.replace(/\n/g, '<br>')
      }
      const paras = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      const html = (paras.length ? paras : ['']).map((p) => {
        if (isMd) {
          const m = p.match(/^(#{1,3})\s+(.+)$/)
          if (m) { const lv = m[1].length; return `<h${lv}>` + inline(m[2]) + `</h${lv}>` }
        }
        return '<p>' + inline(p) + '</p>'
      }).join('')
      const id = addItem('text', 'root-draft', f.name.replace(/\.(txt|md|markdown)$/i, ''))
      setBodyRtf(id, htmlToRtf(html))
      setView('editor')
      flash(`"${f.name}" 을(를) 원고 폴더에 가져왔습니다.`)
    } catch { flash('가져오기 실패 — 파일을 읽을 수 없습니다.') }
  }

  const buildScriptFolder = (name: string, scenes: { title: string; paragraphs: { type: string; text: string }[] }[]) => {
    const st = useStore.getState()
    const folderId = st.addItem('folder', 'root-draft', name || '가져온 각본')
    scenes.forEach((sc) => {
      const docId = st.addItem('text', folderId, sc.title || '(장면)')
      const heading = sc.title ? `<p data-se="scene" style="">${sc.title.toUpperCase()}</p>` : ''
      const body = paragraphsToScriptHtml(sc.paragraphs)
      st.setBodyHtml(docId, (heading + body) || '<p><br></p>')
      st.toggleScriptMode(docId, true)
    })
    // 결과 폴더를 즉시 연다(원고에 생성됨을 바로 확인)
    st.select(folderId)
    st.setView('editor')
  }

  const importFountain = async () => {
    const f = await pickFile('.fountain,.txt,.spmd')
    if (!f || tooBig(f)) return
    try {
      const parsed = parseFountain(await f.text())
      const name = parsed.title || f.name.replace(/\.(fountain|txt|spmd)$/i, '')
      const scenes = parsed.scenes.map((s) => ({ title: s.title, paragraphs: fountainBodyToParagraphs(s.text) }))
      const meaningful = scenes.some((s) => s.title.trim() || s.paragraphs.some((p) => p.text.trim()))
      if (!meaningful) return flash('가져올 내용이 없거나 형식이 올바르지 않습니다.')
      // #9: 감지 요약 + 형식 힌트. .txt 는 일반 산문일 수 있어, 씬 헤딩/타이틀이 없으면 Fountain 인지 확인을 안내.
      const headed = scenes.filter((s) => s.title.trim()).length
      const totalParas = scenes.reduce((n, s) => n + s.paragraphs.filter((p) => p.text.trim()).length, 0)
      const hasTitlePage = !!parsed.title
      buildScriptFolder(name, scenes)
      if (headed === 0 && !hasTitlePage) {
        flash(`가져왔지만 장면 헤딩(INT./EXT.)·Title Page 가 감지되지 않았어요 (단락 ${totalParas}개). 일반 .txt 였다면 RTF/DOCX 가져오기가 더 적합하고, 각본이라면 Fountain 형식인지 확인하세요.`)
      } else {
        flash(`Fountain 각본을 가져왔습니다 — 장면 ${scenes.length}개(헤딩 ${headed}개), 단락 ${totalParas}개.`)
      }
    } catch {
      flash('Fountain 가져오기 실패 — Fountain 형식의 파일인지 확인하세요.')
    }
  }

  const importFDX = async () => {
    const f = await pickFile('.fdx,.xml')
    if (!f || tooBig(f)) return
    try {
      const { paragraphs } = parseFdx(await f.text())
      if (paragraphs.length === 0) return flash('FDX 내용이 없거나 형식이 올바르지 않습니다.')
      // Scene Heading 기준으로 장면 분할
      const scenes: { title: string; paragraphs: { type: string; text: string }[] }[] = []
      let cur: { title: string; paragraphs: { type: string; text: string }[] } | null = null
      for (const p of paragraphs) {
        if (p.type === 'Scene Heading') {
          if (cur) scenes.push(cur)
          cur = { title: p.text, paragraphs: [] }
        } else {
          if (!cur) cur = { title: '', paragraphs: [] }
          cur.paragraphs.push(p)
        }
      }
      if (cur) scenes.push(cur)
      buildScriptFolder(f.name.replace(/\.(fdx|xml)$/i, ''), scenes)
      flash(`FDX 각본을 가져왔습니다 (${scenes.length}개 장면).`)
    } catch {
      flash('FDX 가져오기 실패')
    }
  }

  // ---- 미디어(이미지/PDF/파일) 가져오기 ----
  const importMedia = async () => {
    const f = await pickFile('image/*,application/pdf')
    if (!f || tooBig(f)) return
    try {
      const blobId =
        (crypto as { randomUUID?: () => string }).randomUUID?.() || 'b' + Date.now() + Math.floor(Math.random() * 1e6)
      await saveBlob(blobId, f)
      const mime = f.type || ''
      const type = mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'file'
      // 자료 루트를 하드코딩하지 않고 실제 id 로 조회(외부 import 프로젝트 호환)
      const st = useStore.getState()
      const research = Object.values(st.project.items).find((i) => i.root === 'research')?.id || 'root-research'
      st.addMediaItem(research, type, f.name, blobId, mime)
      flash(`"${f.name}" 미디어를 가져왔습니다.`)
    } catch {
      flash('미디어 가져오기 실패')
    }
  }

  // ---- DOCX 가져오기 (mammoth) ----
  const importDocx = async () => {
    const f = await pickFile('.docx')
    if (!f || tooBig(f)) return
    try {
      const mod = (await import('mammoth')) as unknown as {
        convertToHtml?: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
        default?: { convertToHtml?: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }
      }
      const convert = mod.convertToHtml || mod.default?.convertToHtml
      if (!convert) throw new Error('mammoth 로드 실패')
      const result = await convert({ arrayBuffer: await f.arrayBuffer() })
      const st = useStore.getState()
      const id = st.addItem('text', 'root-draft', f.name.replace(/\.docx$/i, ''))
      st.setBodyHtml(id, result.value || '<p><br></p>')
      st.setView('editor')
      flash(`"${f.name}" DOCX 를 원고 폴더에 가져왔습니다.`)
    } catch (e) {
      console.warn(e)
      flash('DOCX 가져오기 실패')
    }
  }

  // 좁은 화면에서 사용자가 패널을 직접 토글하면 자동 접기보다 우선.
  // 좁은 화면(#2)에서는 바인더/인스펙터가 오버레이로 본문을 덮으므로 동시에 하나만 펼친다(여는 패널이 다른 패널을 닫음).
  const userToggleBinder = () => {
    panelOverride.current = true
    const st = useStore.getState()
    // 단축키 핸들러(stale 클로저) 대비 라이브 폭으로 좁은 화면 판정.
    const narrow = window.innerWidth < NARROW_PX
    if (narrow && !st.binderVisible && st.inspectorVisible) useStore.setState({ inspectorVisible: false })
    toggleBinder()
  }
  const userToggleInspector = () => {
    panelOverride.current = true
    const st = useStore.getState()
    const narrow = window.innerWidth < NARROW_PX
    if (narrow && !st.inspectorVisible && st.binderVisible) useStore.setState({ binderVisible: false })
    toggleInspector()
  }

  const cycleTheme = () => {
    // 단축키(⌘⇧L)는 deps:[] 핸들러에서 호출되므로 클로저 stale 방지를 위해 라이브 테마를 store 에서 읽는다.
    const live = useStore.getState().project.settings.theme
    const i = THEMES.indexOf(live)
    setTheme(THEMES[(i + 1) % THEMES.length])
  }

  const split = () => window.dispatchEvent(new CustomEvent('scriv:split'))

  // ---- 키보드 단축키 ----
  const isTyping = () => {
    const el = document.activeElement as HTMLElement | null
    return (
      !!el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    )
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const g = uiGuardRef.current
      // #6: 모달(팔레트 제외)·도구창·전환확인이 떠 있으면 충돌 단축키 무시.
      const otherModalOpen = g.modal !== null && g.modal !== 'palette'
      const busy = otherModalOpen || g.switching || g.openTools > 0 || g.sheet
      // F1: 단축키 치트시트(#21) — 어디서나.
      if (e.key === 'F1') { e.preventDefault(); if (!uiGuardRef.current.switching) setShowShortcuts((v) => !v); return }
      // ⌘K: 다른 모달이 열려 있지 않을 때만 팔레트 토글(전환확인 중이면 막음).
      if (mod && e.key.toLowerCase() === 'k' && !e.shiftKey) {
        if (otherModalOpen || g.switching) return
        e.preventDefault()
        setModal((m) => (m === 'palette' ? null : 'palette'))
        return
      }
      // ⌘S(저장)은 작업 중에도 안전하므로 항상 허용.
      if (mod && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault()
        saveNow()
        return
      }
      // 이 아래 충돌 가능 단축키들은 모달/도구창/전환확인 중이면 차단(#6).
      if (busy) return
      if (mod && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        split()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'b') {
        if (isTyping()) return // #7: 바인더 토글
        e.preventDefault()
        userToggleBinder()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'i') {
        if (isTyping()) return // #7: 인스펙터 토글
        e.preventDefault()
        userToggleInspector()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
        if (isTyping()) return // #7: 테마 전환
        e.preventDefault()
        cycleTheme()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'a') {
        if (isTyping()) return // #15: 논증 작업대 뷰
        e.preventDefault()
        setView('argument')
      } else if (mod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault() // #7: 집중 모드 토글(현재 창/새 창 선택)
        requestFocusMode()
      } else if (mod && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault()
        setShowFind(true)
      } else if (mod && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        if (isTyping()) return
        e.preventDefault()
        const map: Record<string, typeof viewMode> = { '1': 'editor', '2': 'corkboard', '3': 'outliner', '4': 'board', '5': 'canvas', '6': 'serial', '7': 'timeline', '8': 'references', '9': 'database' }
        setView(map[e.key])
      } else if (mod && !e.shiftKey && (e.key === 'PageUp' || e.key === 'PageDown')) {
        // #5: 이전/다음 텍스트 문서로 점프(⌘/Ctrl 조합이라 본문 스크롤과 분리)
        e.preventDefault()
        goDocStep(e.key === 'PageDown' ? 1 : -1)
      } else if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        changeScale(0.1)
      } else if (mod && (e.key === '-' || e.key === '_')) {
        e.preventDefault()
        changeScale(-0.1)
      } else if (mod && e.key === '0') {
        e.preventDefault()
        resetScale()
      } else if (e.altKey && e.key === 'ArrowLeft') {
        if (isTyping()) return // #4: 본문/입력 중 캐럿 단어이동 가로채지 않음
        e.preventDefault()
        goBack()
      } else if (e.altKey && e.key === 'ArrowRight') {
        if (isTyping()) return
        e.preventDefault()
        goForward()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 명령 팔레트 명령 목록 ----
  const commands: Command[] = [
    { id: 'new-text', section: '문서', title: '새 텍스트', run: () => addItem('text', activeIdParent()) },
    { id: 'new-folder', section: '문서', title: '새 폴더', run: () => addItem('folder', activeIdParent()) },
    { id: 'new-tpl', section: '문서', title: '새 문서 (캐릭터 카드/시트·장소…)', run: () => setModal('docTemplate') },
    { id: 'split', section: '문서', title: '현재 위치에서 분할', hint: '⌘⇧K', run: split },
    { id: 'merge', section: '문서', title: `선택 병합 (${selectedIds.length})`, run: () => mergeDocuments(selectedIds) },
    { id: 'group', section: '문서', title: '선택을 폴더로 묶기', run: () => groupSelection(selectedIds) },
    { id: 'ungroup', section: '문서', title: '그룹 해제', run: () => activeId && ungroup(activeId) },
    { id: 'dup', section: '문서', title: '복제', run: () => activeId && duplicateItem(activeId) },
    { id: 'mv-up', section: '문서', title: '위로 이동', run: () => activeId && moveRelative(activeId, -1) },
    { id: 'mv-down', section: '문서', title: '아래로 이동', run: () => activeId && moveRelative(activeId, 1) },
    { id: 'trash', section: '문서', title: '휴지통으로 이동', run: () => activeId && moveToTrash(activeId) },
    { id: 'restore', section: '문서', title: '휴지통에서 복원', run: () => activeId && restoreFromTrash(activeId), disabled: !activeId || !isInTrash(project, activeId) },
    { id: 'snap', section: '문서', title: '스냅샷 찍기 (버전 저장)', run: snapshotEntry },
    { id: 'v-editor', section: '보기', title: '에디터', hint: '⌘1', run: () => setView('editor') },
    { id: 'v-cork', section: '보기', title: '코르크보드', hint: '⌘2', run: () => setView('corkboard') },
    { id: 'v-outline', section: '보기', title: '아웃라이너', hint: '⌘3', run: () => setView('outliner') },
    { id: 'v-board', section: '보기', title: '칸반 보드 (상태/라벨)', hint: '⌘4', run: () => setView('board') },
    { id: 'v-canvas', section: '보기', title: '스토리 캔버스 (자유 배치·화살표 연결)', hint: '⌘5', run: () => setView('canvas') },
    { id: 'v-serial', section: '보기', title: '연재 관리 대시보드 (회차·비축분·발행 캘린더)', hint: '⌘6', run: () => setView('serial') },
    { id: 'v-timeline', section: '보기', title: '스토리 타임라인 (사건 연대표·스윔레인)', hint: '⌘7', run: () => setView('timeline') },
    { id: 'v-references', section: '보기', title: '참고문헌 관리자 (인용·서지 APA/MLA/Chicago/IEEE/KCI)', hint: '⌘8', run: () => setView('references') },
    { id: 'v-argument', section: '보기', title: '논증 작업대 (주제문·주장·근거·반박)', hint: '⌘⇧A', run: () => setView('argument') },
    { id: 'v-database', section: '보기', title: '데이터베이스 뷰 (모든 요소 엑셀식 표·인라인 편집)', hint: '⌘9', run: () => setView('database') },
    { id: 'scale-up', section: '보기', title: '화면 글자 크게 (UI 확대)', hint: 'Ctrl +', run: () => changeScale(0.1) },
    { id: 'scale-down', section: '보기', title: '화면 글자 작게 (UI 축소)', hint: 'Ctrl -', run: () => changeScale(-0.1) },
    { id: 'scale-reset', section: '보기', title: '화면 글자 크기 100%로', run: () => resetScale() },
    { id: 'compose', section: '보기', title: '집중 모드', hint: '⌘⇧↵', run: () => requestFocusMode() },
    { id: 'toggle-split', section: '보기', title: '편집기 분할 토글', hint: '⌘⇧K', run: () => toggleSplit() },
    { id: 'doc-prev', section: '보기', title: '이전 문서로 이동', hint: '⌘PgUp', run: () => goDocStep(-1) },
    { id: 'doc-next', section: '보기', title: '다음 문서로 이동', hint: '⌘PgDn', run: () => goDocStep(1) },
    { id: 'typewriter', section: '보기', title: '타자기 스크롤 토글', run: () => useStore.getState().toggleTypewriter() },
    { id: 'autocomplete', section: '도구', title: '자동완성 켜기/끄기', run: () => useStore.getState().toggleAutoComplete() },
    { id: 'scratch', section: '도구', title: '스크래치패드(빠른 메모)', run: () => setShowScratch((v) => !v) },
    { id: 'sprint', section: '도구', title: '집필 스프린트 타이머', run: () => setShowSprint(true) },
    { id: 'prompts', section: '도구', title: '라이팅 프롬프트 (글감 덱)', run: () => setShowPrompts((v) => !v) },
    { id: 'structure', section: '문서', title: '플롯 구조 템플릿 (3막·영웅서사·세이브더캣)', run: () => setModal('structure') },
    { id: 'theme', section: '보기', title: '테마 전환 (라이트/다크/세피아)', hint: '⌘⇧L', run: cycleTheme },
    { id: 'binder', section: '보기', title: '바인더 토글', hint: '⌘⇧B', run: () => userToggleBinder() },
    { id: 'insp', section: '보기', title: '인스펙터 토글', hint: '⌘⇧I', run: () => userToggleInspector() },
    { id: 'shortcuts', section: '보기', title: '⌨️ 단축키 도움말 (치트시트)', hint: 'F1', run: () => setShowShortcuts(true) },
    { id: 'tour', section: '보기', title: '도움말 둘러보기 (가이드 투어)', run: startTour },
    { id: 'manual', section: '보기', title: '더 알아보기 (사용법 실습 — 따라 하며 한 편 완성)', run: startManual },
    { id: 'compile', section: '파일', title: '원고 내보내기 (컴파일: PDF·DOCX·RTF·ePub…)', run: () => setModal('compile') },
    { id: 'platform-publish', section: '파일', title: '플랫폼별 발행 내보내기 (문피아·네이버·Royal Road·블로그 등)', run: () => setModal('platformPublish') },
    { id: 'platform-preview', section: '도구', title: '📱 웹소설 플랫폼 독자뷰 미리보기 (문피아·네이버·카카오·노벨피아·리디)', run: () => setModal('platformPreview') },
    { id: 'skin-studio', section: '보기', title: '🎨 Studio UI 로 전환 (새 모던 디자인 — 데이터 보존)', run: () => setUiSkin('studio') },
    { id: 'skin-classic', section: '보기', title: '🎨 클래식 UI 로 전환', run: () => setUiSkin('classic') },
    { id: 'skin-aurora', section: '보기', title: '🎨 Aurora UI 로 전환 (디자인 2 — 큼직한 버튼·카드형 작업 공간, 데이터 보존)', run: () => setUiSkin('aurora') },
    { id: 'toolhub', section: '도구', title: '🧰 도구 허브 (상상력 자극·웹검색·캐릭터 모델·집중 등)', run: () => setModal('toolhub') },
    { id: 'genrebox', section: '도구', title: '🎭 장르별 도구함 (미스터리·SF·무협·판타지·로맨스 등 장르 특화)', run: () => setModal('genrebox') },
    { id: 'stats', section: '도구', title: '프로젝트 통계', run: () => setModal('stats') },
    { id: 'style', section: '도구', title: '글쓰기 분석 (스타일/가독성)', run: () => setModal('style') },
    { id: 'linguistic', section: '도구', title: '언어 초점 (대사·부사·수동태 하이라이트)', run: () => setModal('linguistic') },
    { id: 'tension', section: '도구', title: '긴장도 곡선 (텐션 아크)', run: () => setModal('tension') },
    { id: 'creative', section: '도구', title: '✨ 창작 스튜디오 (클리셰·오감·POV·관계도·페이싱 등 20+ 도구)', run: () => setModal('creative') },
    { id: 'quickref', section: '보기', title: '현재 문서를 퀵 레퍼런스로 열기 (떠 있는 참고 패널)', run: () => { const a = useStore.getState().activeId; if (a) openQuickRef(a) } },
    { id: 'readaloud', section: '도구', title: '소리내어 읽기 (TTS) — 본문을 들으며 교정', run: () => setShowRead(true) },
    { id: 'replace', section: '도구', title: '프로젝트 전체 찾아 바꾸기', run: () => setModal('replace') },
    { id: 'find', section: '도구', title: '문서 내 찾기·바꾸기', hint: '⌘F', run: () => setShowFind(true) },
    { id: 'settings', section: '도구', title: '프로젝트 설정 (라벨·상태·섹션타입·필드)', run: () => setModal('settings') },
    { id: 'namegen', section: '도구', title: '이름 생성기', run: () => setModal('nameGen') },
    { id: 'ai', section: '도구', title: 'AI 어시스턴트 (준비 중 — 곧 제공)', run: () => {}, disabled: true },
    { id: 'save-sry', section: '파일', title: 'sry 프로젝트 폴더로 저장', run: saveSryFolder },
    { id: 'open-sry', section: '파일', title: 'sry 프로젝트 폴더 열기', run: openSryFolder },
    { id: 'save-sryzip', section: '파일', title: '.sry 파일로 내보내기', run: saveSryZip },
    { id: 'open-sryfile', section: '파일', title: '.sry 파일 열기…', run: () => fileInput.current?.click() },
    ...(SCRIVENER_INTEROP ? [
      { id: 'save-scriv', section: '파일', title: '.scriv 폴더로 저장', run: saveScrivFolder },
      { id: 'open-scriv', section: '파일', title: '.scriv 폴더 열기', run: openScrivFolder },
      { id: 'save-zip', section: '파일', title: '.scriv.zip 내보내기', run: saveScrivZip },
    ] : []),
    { id: 'import-rtf', section: '파일', title: 'RTF 가져오기', run: importRtf },
    { id: 'import-text', section: '파일', title: 'TXT·Markdown 가져오기', run: importText },
    { id: 'import-docx', section: '파일', title: 'DOCX 가져오기', run: importDocx },
    { id: 'import-media', section: '파일', title: '이미지/PDF 가져오기', run: importMedia },
    { id: 'import-fountain', section: '파일', title: 'Fountain 각본 가져오기', run: importFountain },
    { id: 'import-fdx', section: '파일', title: 'FDX 각본 가져오기', run: importFDX },
    { id: 'new-proj', section: '파일', title: '새 프로젝트 (템플릿 · 현재 작업 닫고)…', run: () => setModal('newProject') },
    { id: 'new-proj-blank', section: '파일', title: '빈 프로젝트로 시작 (현재 작업 닫고)', run: () => requestSwitch(() => newProject()) },
    ...recentProjects.map((p, n) => ({ id: 'recent-proj-' + p.id, section: '파일', title: `↺ 최근 프로젝트: ${p.title}`, hint: n === 0 ? '최근' : undefined, run: () => openProjectById(p.id) })),
    { id: 'projects', section: '파일', title: '프로젝트 목록 / 열기 (브라우저 저장본)', run: () => setModal('projects') },
    { id: 'backup', section: '파일', title: '백업 / 복원…', run: () => setModal('backup') },
    { id: 'doclink', section: '문서', title: '문서 링크 삽입…', run: () => setModal('docLink') },
    // 507+ 유틸리티 도구를 명령 팔레트에서 이름으로 바로 검색·실행(발견성). 도구창으로 열림.
    ...UTILITY_TOOLS.map((t) => ({ id: 'tool:' + t.id, section: '🧰 도구', title: t.icon + ' ' + t.name + (t.intro ? ' — ' + t.intro : ''), run: () => openTool(t.id) })),
  ]
  // 즐겨찾기 실행: 즐겨찾기 패널/명령에서 'scriv:run-fav'(id) → 해당 명령을 찾아 실행.
  const commandsRef = useRef(commands)
  commandsRef.current = commands
  useEffect(() => {
    const onRunFav = (e: Event) => {
      const id = String((e as CustomEvent).detail || '')
      const cmd = commandsRef.current.find((c) => c.id === id)
      if (cmd) { if (!cmd.disabled) cmd.run(); return }
      if (id.startsWith('tool:')) {
        const tid = id.slice(5)
        if (UTILITY_TOOLS.some((t) => t.id === tid)) openTool(tid)
        else flash('이 즐겨찾기 항목을 찾을 수 없어요(도구가 변경되었을 수 있어요).')
      } else {
        flash('이 즐겨찾기 항목을 찾을 수 없어요(기능이 변경되었을 수 있어요).')
      }
    }
    window.addEventListener('scriv:run-fav', onRunFav as EventListener)
    return () => window.removeEventListener('scriv:run-fav', onRunFav as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 가로 스크롤 영역(인스펙터 탭·도구창 내부 탭 등)에서 세로 휠 → 가로 스크롤.
  // 커서 아래에서 '가로로만' 스크롤되는(세로로는 못 움직이는) 가장 가까운 요소를 찾아 deltaY 를 scrollLeft 로 변환.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || e.ctrlKey || e.deltaY === 0) return // Shift+휠(브라우저 가로)·확대축소는 그대로
      let el = e.target as HTMLElement | null
      while (el && el !== document.body) {
        const canX = el.scrollWidth - el.clientWidth > 1
        if (canX) {
          const ox = getComputedStyle(el).overflowX
          const canY = el.scrollHeight - el.clientHeight > 1
          if ((ox === 'auto' || ox === 'scroll') && !canY) {
            const before = el.scrollLeft
            el.scrollLeft += e.deltaY
            if (el.scrollLeft !== before) e.preventDefault() // 실제로 움직였을 때만 페이지 스크롤 차단
            return
          }
        }
        el = el.parentElement
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel as EventListener)
  }, [])

  // (제거됨) 런타임 DOM 치환 파서는 React 소유 노드와 충돌(removeChild 크래시)·미보유 이모지 무한루프 위험이 있어
  //  폐기하고, 안전한 <Emoji> React 컴포넌트(매니페스트 게이트)로 전환했다. startEmojiParser 는 더 이상 사용하지 않음.


  function activeIdParent(): string {
    const a = activeId ? project.items[activeId] : null
    if (!a || a.root === 'trash') return 'root-draft'
    if (a.type === 'folder') return a.id
    return a.parentId || 'root-draft'
  }

  const viewBtn = (v: typeof viewMode, icon: React.ReactNode, label: string) => (
    <button
      className={'tbtn' + (viewMode === v ? ' active' : '')}
      onClick={() => setView(v)}
      title={label}
      aria-label={label}
      aria-pressed={viewMode === v}
    >
      {icon}
    </button>
  )
  const mi = (label: string, fn: () => void, close: () => void, kbd?: string, disabled?: boolean) => (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        fn()
        close()
      }}
    >
      <span>{label}</span>
      {kbd && <span className="kbd">{kbd}</span>}
    </button>
  )

  // Studio 스킨용 메뉴 데이터 — 클래식의 파일/문서/도구 메뉴를 동일 핸들러로 재구성(누락 없이 전 기능 제공).
  const studioMenus = [
    {
      id: 'file', label: '파일', items: [
        { label: '새 프로젝트 (현재 작업 닫고)…', fn: () => setModal('newProject') },
        { label: '빈 프로젝트로 시작 (현재 작업 닫고)', fn: () => requestSwitch(() => newProject()) },
        { label: '프로젝트 목록 / 열기…', fn: () => setModal('projects') },
        { divider: true },
        { label: 'sry 프로젝트 폴더 열기', fn: openSryFolder },
        { label: '.sry 파일 열기…', fn: () => fileInput.current?.click() },
        { label: 'RTF 가져오기', fn: importRtf },
        { label: 'TXT·Markdown 가져오기', fn: importText },
        { label: 'DOCX 가져오기', fn: importDocx },
        { label: '이미지/PDF 가져오기', fn: importMedia },
        { label: 'Fountain 각본 가져오기', fn: importFountain },
        { label: 'FDX 각본 가져오기', fn: importFDX },
        { divider: true },
        { label: 'sry 프로젝트 폴더로 저장', fn: saveSryFolder, kbd: '⌘S' },
        { label: '.sry 파일로 내보내기', fn: saveSryZip },
        { label: '원고 내보내기 (PDF·DOCX·RTF·ePub·ODT…)', fn: () => setModal('compile') },
        ...(SCRIVENER_INTEROP ? [
          { label: '.scriv 폴더 열기', fn: openScrivFolder },
          { label: '.scriv.zip 열기…', fn: () => fileInput.current?.click() },
          { label: '.scriv 폴더로 저장', fn: saveScrivFolder },
          { label: '.scriv.zip 내보내기', fn: saveScrivZip },
        ] : []),
        { label: '플랫폼별 발행 내보내기…', fn: () => setModal('platformPublish') },
        { label: '웹소설 플랫폼 독자뷰 미리보기…', fn: () => setModal('platformPreview') },
        { divider: true },
        { label: '백업 / 복원…', fn: () => setModal('backup') },
      ],
    },
    {
      id: 'doc', label: '문서', items: [
        { label: '새 텍스트', fn: () => addItem('text', activeIdParent()) },
        { label: '새 폴더', fn: () => addItem('folder', activeIdParent()) },
        { label: '새 문서 (템플릿)…', fn: () => setModal('docTemplate') },
        { label: '플롯 구조 템플릿…', fn: () => setModal('structure') },
        { divider: true },
        { label: '현재 위치에서 분할', fn: split, kbd: '⌘⇧K' },
        { label: `선택 병합 (${selectedIds.length})`, fn: () => mergeDocuments(selectedIds), disabled: selectedIds.length < 2 },
        { label: '폴더로 묶기', fn: () => groupSelection(selectedIds), disabled: !selectedIds.length },
        { label: '그룹 해제', fn: () => { if (activeId) ungroup(activeId) } },
        { label: '복제', fn: () => { if (activeId) duplicateItem(activeId) } },
        { divider: true },
        { label: '위로 이동', fn: () => { if (activeId) moveRelative(activeId, -1) } },
        { label: '아래로 이동', fn: () => { if (activeId) moveRelative(activeId, 1) } },
        { label: '문서 링크 삽입…', fn: () => setModal('docLink') },
        { label: '스냅샷 찍기 (버전 저장)…', fn: snapshotEntry },
        { label: '휴지통으로 이동', fn: () => { if (activeId) moveToTrash(activeId) } },
        { label: '휴지통에서 복원', fn: () => { if (activeId) restoreFromTrash(activeId) }, disabled: !activeId || !isInTrash(project, activeId) },
      ],
    },
    {
      id: 'tools', label: '도구', items: [
        { label: '창작 스튜디오 (2,400+ 도구)', fn: () => setModal('creative') },
        { label: '도구 허브 (상상력 자극·웹검색·집중 등)', fn: () => setModal('toolhub') },
        { label: '장르별 도구함 (장르소설 특화)', fn: () => setModal('genrebox') },
        { divider: true },
        { label: '프로젝트 통계', fn: () => setModal('stats') },
        { label: '글쓰기 분석', fn: () => setModal('style') },
        { label: '언어 초점 (하이라이트)', fn: () => setModal('linguistic') },
        { label: '긴장도 곡선 (텐션 아크)', fn: () => setModal('tension') },
        { label: '이름 생성기', fn: () => setModal('nameGen') },
        { label: 'AI 어시스턴트', fn: () => {}, kbd: '준비 중', disabled: true },
        { label: '스크래치패드', fn: () => setShowScratch((v) => !v) },
        { label: '현재 문서를 퀵 레퍼런스로 열기', fn: () => { const a = useStore.getState().activeId; if (a) openQuickRef(a) } },
        { label: '소리내어 읽기 (TTS)', fn: () => setShowRead(true) },
        { label: '집필 스프린트 타이머', fn: () => setShowSprint(true) },
        { label: '라이팅 프롬프트(글감)', fn: () => setShowPrompts((v) => !v) },
        { label: '타자기 스크롤 토글', fn: () => useStore.getState().toggleTypewriter() },
        { label: '문서 내 찾기·바꾸기', fn: () => setShowFind(true), kbd: '⌘F' },
        { label: '전체 찾아 바꾸기', fn: () => setModal('replace') },
        { divider: true },
        { label: '프로젝트 설정…', fn: () => setModal('settings') },
      ],
    },
    {
      id: 'view', label: '보기', items: [
        { label: '뒤로', fn: goBack, kbd: 'Alt+←', disabled: nav.pos <= 0 },
        { label: '앞으로', fn: goForward, kbd: 'Alt+→', disabled: nav.pos >= nav.stack.length - 1 },
        { label: '이전 문서', fn: () => goDocStep(-1), kbd: '⌘PgUp' },
        { label: '다음 문서', fn: () => goDocStep(1), kbd: '⌘PgDn' },
        { divider: true },
        { label: '명령 팔레트', fn: () => setModal('palette'), kbd: '⌘K' },
        { label: '집중 모드', fn: requestFocusMode },
        { label: '편집기 분할 토글', fn: toggleSplit },
        { label: '테마 전환 (라이트/다크/세피아)', fn: cycleTheme, kbd: '⌘⇧L' },
        { divider: true },
        { label: '단축키 도움말 (치트시트)', fn: () => setShowShortcuts(true), kbd: 'F1' },
        { label: '도움말 둘러보기 (가이드 투어)', fn: startTour },
        { label: '더 알아보기 (사용법 실습 — 따라 하며 한 편 완성)', fn: startManual },
        { divider: true },
        { label: '클래식 UI 로 전환', fn: () => setUiSkin('classic') },
        { label: 'Aurora UI 로 전환 (디자인 2)', fn: () => setUiSkin('aurora') },
      ],
    },
  ]

  // 안정 키보드 핸들러가 최신 UI 상태를 읽도록 매 렌더 갱신(#6).
  uiGuardRef.current = { modal, openTools: openToolIds.length, switching: !!switchAsk, sheet: showShortcuts }

  return (
    <div className={'app' + (uiSkin === 'studio' ? ' app-studio' : uiSkin === 'aurora' ? ' app-aurora' : '')}>
      {uiSkin === 'aurora' ? (
        <AuroraShell
          theme={theme} uiScale={uiScale} dirty={dirty} saveError={!!saveError} lastSaved={lastSaved} status={status || undefined}
          splitId={splitId} splitDir={splitDir} showFind={showFind} setShowFind={setShowFind} menus={studioMenus}
          activeModal={modal}
          binderW={binderW} inspW={inspW} setBinderW={setBinderW} setInspW={setInspW}
          onOpenModal={(n) => setModal(n as ModalName)} onSave={saveNow} onCycleTheme={cycleTheme}
          onChangeScale={changeScale} onResetScale={resetScale} onSnapshot={snapshotEntry}
          onToggleSplit={toggleSplit}
          onCycleSplitDir={() => setSplitDir(splitDir === 'vertical' ? 'horizontal' : 'vertical')}
          onCloseSplit={toggleSplit}
          onToggleComposition={requestFocusMode}
          onToggleBinder={userToggleBinder} onToggleInspector={userToggleInspector}
          onSetSkin={(s) => setUiSkin(s)}
          onSetTheme={(t) => setTheme(t)}
        />
      ) : uiSkin === 'studio' ? (
        <StudioShell
          theme={theme} uiScale={uiScale} dirty={dirty} saveError={!!saveError} lastSaved={lastSaved} status={status || undefined}
          splitId={splitId} splitDir={splitDir} showFind={showFind} setShowFind={setShowFind} menus={studioMenus}
          activeModal={modal}
          binderW={binderW} inspW={inspW} setBinderW={setBinderW} setInspW={setInspW}
          onOpenModal={(n) => setModal(n as ModalName)} onSave={saveNow} onCycleTheme={cycleTheme}
          onChangeScale={changeScale} onResetScale={resetScale} onSnapshot={snapshotEntry}
          onToggleSplit={toggleSplit}
          onCycleSplitDir={() => setSplitDir(splitDir === 'vertical' ? 'horizontal' : 'vertical')}
          onCloseSplit={toggleSplit}
          onToggleComposition={requestFocusMode}
          onToggleBinder={userToggleBinder} onToggleInspector={userToggleInspector}
          onSetClassic={() => setUiSkin('classic')}
          onSetAurora={() => setUiSkin('aurora')}
        />
      ) : (
      <>
      <div className="toolbar">
        <Menu id="file" label="파일" openMenu={openMenu} setOpenMenu={setOpenMenu}>
          {(close) => (
            <>
              {mi('새 프로젝트 (현재 작업 닫고)…', () => setModal('newProject'), close)}
              {mi('빈 프로젝트로 시작 (현재 작업 닫고)', () => requestSwitch(() => newProject()), close)}
              {mi('프로젝트 목록 / 열기…', () => setModal('projects'), close)}
              <div className="divider" />
              {mi('sry 프로젝트 폴더 열기', openSryFolder, close)}
              {mi('.sry 파일 열기…', () => fileInput.current?.click(), close)}
              {mi('RTF 가져오기', importRtf, close)}
              {mi('TXT·Markdown 가져오기', importText, close)}
              {mi('DOCX 가져오기', importDocx, close)}
              {mi('이미지/PDF 가져오기', importMedia, close)}
              {mi('Fountain 각본 가져오기', importFountain, close)}
              {mi('FDX 각본 가져오기', importFDX, close)}
              <div className="divider" />
              {mi('sry 프로젝트 폴더로 저장', saveSryFolder, close, '⌘S')}
              {mi('.sry 파일로 내보내기', saveSryZip, close)}
              {mi('원고 내보내기 (PDF·DOCX·RTF·ePub·ODT…)', () => setModal('compile'), close)}
              {SCRIVENER_INTEROP && mi('.scriv 폴더 열기', openScrivFolder, close)}
              {SCRIVENER_INTEROP && mi('.scriv.zip 열기…', () => fileInput.current?.click(), close)}
              {SCRIVENER_INTEROP && mi('.scriv 폴더로 저장', saveScrivFolder, close)}
              {SCRIVENER_INTEROP && mi('.scriv.zip 내보내기', saveScrivZip, close)}
              {mi('플랫폼별 발행 내보내기…', () => setModal('platformPublish'), close)}
              {mi('웹소설 플랫폼 독자뷰 미리보기…', () => setModal('platformPreview'), close)}
              <div className="divider" />
              {mi('백업 / 복원…', () => setModal('backup'), close)}
            </>
          )}
        </Menu>

        <Menu id="doc" label="문서" openMenu={openMenu} setOpenMenu={setOpenMenu}>
          {(close) => (
            <>
              {mi('새 텍스트', () => addItem('text', activeIdParent()), close)}
              {mi('새 폴더', () => addItem('folder', activeIdParent()), close)}
              {mi('새 문서 (템플릿)…', () => setModal('docTemplate'), close)}
              {mi('플롯 구조 템플릿…', () => setModal('structure'), close)}
              <div className="divider" />
              {mi('현재 위치에서 분할', split, close, '⌘⇧K')}
              {mi(`선택 병합 (${selectedIds.length})`, () => mergeDocuments(selectedIds), close, undefined, selectedIds.length < 2)}
              {mi('폴더로 묶기', () => groupSelection(selectedIds), close, undefined, !selectedIds.length)}
              {mi('그룹 해제', () => activeId && ungroup(activeId), close)}
              {mi('복제', () => activeId && duplicateItem(activeId), close)}
              <div className="divider" />
              {mi('위로 이동', () => activeId && moveRelative(activeId, -1), close)}
              {mi('아래로 이동', () => activeId && moveRelative(activeId, 1), close)}
              {mi('문서 링크 삽입…', () => setModal('docLink'), close)}
              {mi('스냅샷 찍기 (버전 저장)…', snapshotEntry, close)}
              {mi('휴지통으로 이동', () => activeId && moveToTrash(activeId), close)}
              {mi('휴지통에서 복원', () => activeId && restoreFromTrash(activeId), close, undefined, !activeId || !isInTrash(project, activeId))}
            </>
          )}
        </Menu>

        <Menu id="tools" label="도구" openMenu={openMenu} setOpenMenu={setOpenMenu}>
          {(close) => (
            <>
              {mi('창작 스튜디오 (2,400+ 도구)', () => setModal('creative'), close)}
              {mi('도구 허브 (상상력 자극·웹검색·집중 등)', () => setModal('toolhub'), close)}
              {mi('장르별 도구함 (장르소설 특화)', () => setModal('genrebox'), close)}
              <div className="divider" />
              {mi('프로젝트 통계', () => setModal('stats'), close)}
              {mi('글쓰기 분석', () => setModal('style'), close)}
              {mi('언어 초점 (하이라이트)', () => setModal('linguistic'), close)}
              {mi('긴장도 곡선 (텐션 아크)', () => setModal('tension'), close)}
              {mi('이름 생성기', () => setModal('nameGen'), close)}
              {mi('AI 어시스턴트', () => {}, close, '준비 중', true)}
              {mi('스크래치패드', () => setShowScratch((v) => !v), close)}
              {mi('현재 문서를 퀵 레퍼런스로 열기', () => { const a = useStore.getState().activeId; if (a) openQuickRef(a) }, close)}
              {mi('소리내어 읽기 (TTS)', () => setShowRead(true), close)}
              {mi('집필 스프린트 타이머', () => setShowSprint(true), close)}
              {mi('라이팅 프롬프트(글감)', () => setShowPrompts((v) => !v), close)}
              {mi('타자기 스크롤 토글', () => useStore.getState().toggleTypewriter(), close)}
              {mi('문서 내 찾기·바꾸기', () => setShowFind(true), close, '⌘F')}
              {mi('전체 찾아 바꾸기', () => setModal('replace'), close)}
              <div className="divider" />
              {mi('프로젝트 설정…', () => setModal('settings'), close)}
            </>
          )}
        </Menu>

        {/* #14: 좁은 화면에서 뷰 전환 세그먼트가 숨겨질 때도 메뉴로 모든 뷰 전환 가능 */}
        <Menu id="view" label="보기" openMenu={openMenu} setOpenMenu={setOpenMenu}>
          {(close) => (
            <>
              {mi('에디터', () => setView('editor'), close, '⌘1')}
              {mi('코르크보드', () => setView('corkboard'), close, '⌘2')}
              {mi('아웃라이너', () => setView('outliner'), close, '⌘3')}
              {mi('칸반 보드', () => setView('board'), close, '⌘4')}
              {mi('스토리 캔버스', () => setView('canvas'), close, '⌘5')}
              {mi('연재 관리', () => setView('serial'), close, '⌘6')}
              {mi('스토리 타임라인', () => setView('timeline'), close, '⌘7')}
              {mi('참고문헌', () => setView('references'), close, '⌘8')}
              {mi('논증 작업대', () => setView('argument'), close, '⌘⇧A')}
              {mi('데이터베이스', () => setView('database'), close, '⌘9')}
              <div className="divider" />
              {mi('이전 문서', () => goDocStep(-1), close, '⌘PgUp')}
              {mi('다음 문서', () => goDocStep(1), close, '⌘PgDn')}
              <div className="divider" />
              {mi('명령 팔레트', () => setModal('palette'), close, '⌘K')}
              {mi('집중 모드', requestFocusMode, close, '⌘⇧↵')}
              {mi('편집기 분할 토글', () => toggleSplit(), close, '⌘⇧K')}
              {mi('바인더 토글', userToggleBinder, close, '⌘⇧B')}
              {mi('인스펙터 토글', userToggleInspector, close, '⌘⇧I')}
              {mi('테마 전환', cycleTheme, close, '⌘⇧L')}
              <div className="divider" />
              {mi('단축키 도움말 (치트시트)', () => setShowShortcuts(true), close, 'F1')}
              {mi('도움말 둘러보기 (가이드 투어)', startTour, close)}
              {mi('더 알아보기 (사용법 실습 — 따라 하며 한 편 완성)', startManual, close)}
            </>
          )}
        </Menu>

        <span style={{ width: 8 }} />
        <button className="tbtn" onClick={goBack} disabled={nav.pos <= 0} title="뒤로 (Alt+←)" aria-label="뒤로">
          <ArrowLeft size={15} />
        </button>
        <button
          className="tbtn"
          onClick={goForward}
          disabled={nav.pos >= nav.stack.length - 1}
          title="앞으로 (Alt+→)"
          aria-label="앞으로"
        >
          <ArrowRight size={15} />
        </button>
        <span style={{ width: 8 }} />
        <div className="seg">
          {viewBtn('editor', <Layout size={15} />, '에디터 (⌘1)')}
          {viewBtn('corkboard', <LayoutGrid size={15} />, '코르크보드 (⌘2)')}
          {viewBtn('outliner', <Rows3 size={15} />, '아웃라이너 (⌘3)')}
          {viewBtn('board', <Columns3 size={15} />, '칸반 보드 (⌘4)')}
          {viewBtn('canvas', <Network size={15} />, '스토리 캔버스 (⌘5)')}
          {viewBtn('serial', <CalendarClock size={15} />, '연재 관리 (⌘6)')}
          {viewBtn('timeline', <GitBranch size={15} />, '스토리 타임라인 (⌘7)')}
          {viewBtn('references', <BookMarked size={15} />, '참고문헌 (⌘8)')}
          {viewBtn('argument', <Scale size={15} />, '논증 작업대 (⌘⇧A)')}
          {viewBtn('database', <Table2 size={15} />, '데이터베이스 (엑셀식 ⌘9)')}
        </div>
        <button
          className={'tbtn' + (splitId ? ' active' : '')}
          onClick={() => {
            if (splitId) setSplitDir(splitDir === 'vertical' ? 'horizontal' : 'vertical')
            else toggleSplit()
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            toggleSplit()
          }}
          title={splitId ? '분할 방향 전환 (우클릭: 닫기)' : '편집기 분할'}
          aria-label="편집기 분할"
          aria-pressed={!!splitId}
        >
          <SplitSquareHorizontal size={15} />
        </button>
        <button className="tbtn" onClick={requestFocusMode} title="집중 모드 (⌘⇧↵)">
          <Maximize2 size={15} />
        </button>
        <button
          className={'tbtn save-btn' + (saveError ? ' save-error' : dirty ? ' dirty' : ' saved')}
          onClick={saveNow}
          title={
            (saveError
              ? '⚠ 자동 저장 실패 — 변경분은 메모리에 보존되어 있습니다. 눌러서 다시 저장하거나 백업/내보내기를 권장합니다.'
              : dirty ? '변경사항을 저장합니다 (⌘S).' : lastSaved ? '저장됨 · ' + new Date(lastSaved).toLocaleTimeString() : '저장 (⌘S)') +
            '\n자동 저장이 켜져 있으면 잠시 후 자동으로도 저장됩니다. sry 폴더/.sry 파일로 내보내려면 파일 메뉴를 사용하세요.'
          }
          aria-label="저장"
        >
          <Save size={15} /> {saveError ? '저장 실패!' : dirty ? '저장' : '저장됨'}
        </button>
        <button className="tbtn" onClick={() => setModal('compile')} title="컴파일">
          컴파일
        </button>
        <button className="tbtn help-btn" onClick={startTour} title="도움말 둘러보기 (가이드 투어)" aria-label="도움말">
          ?
        </button>

        <span className="spacer" />
        <input
          className="title"
          value={project.title}
          onChange={(e) => setProjectTitle(e.target.value)}
          title="프로젝트 제목"
        />
        <span className="spacer" />

        {status && <span style={{ fontSize: 11, color: 'var(--accent-2)' }} role="status">{status}</span>}
        <span className="uiscale" title="화면 글자 크기 (앱 전체·창·팝업이 함께 커집니다)">
          <button className="tbtn" onClick={() => changeScale(-0.1)} disabled={uiScale <= 0.8} aria-label="글자 작게">A−</button>
          <button className="tbtn uiscale-val" onClick={resetScale} title="100%로 초기화" aria-label="글자 크기 초기화">{Math.round(uiScale * 100)}%</button>
          <button className="tbtn" onClick={() => changeScale(0.1)} disabled={uiScale >= 1.6} aria-label="글자 크게">A+</button>
        </span>
        <button className="tbtn" onClick={() => setModal('palette')} title="명령 팔레트 (⌘K)" aria-label="명령 팔레트">
          <CmdIcon size={15} />
        </button>
        <button
          className="tbtn"
          onClick={cycleTheme}
          title={`테마: ${theme === 'light' ? '라이트' : theme === 'dark' ? '다크' : '세피아'} (클릭하여 전환 · ⌘⇧L)`}
          aria-label="테마 전환"
        >
          {theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <BookOpen size={15} />}
        </button>
        <button
          className={'tbtn' + (binderVisible ? ' active' : '')}
          onClick={userToggleBinder}
          title="바인더 (⌘⇧B)"
          aria-label="바인더 토글"
          aria-pressed={binderVisible}
        >
          <PanelLeft size={15} />
        </button>
        <button
          className={'tbtn' + (inspectorVisible ? ' active' : '')}
          onClick={userToggleInspector}
          title="인스펙터 (⌘⇧I)"
          aria-label="인스펙터 토글"
          aria-pressed={inspectorVisible}
        >
          <PanelRight size={15} />
        </button>
        <button
          className="tbtn"
          onClick={() => setUiSkin('studio')}
          title="Studio UI 로 전환 — 완전히 새로운 모던 디자인 (데이터·원고는 그대로 보존)"
          aria-label="Studio UI 로 전환"
          style={{ fontWeight: 600 }}
        >
          <Icon name="sparkle" size={15} /> Studio
        </button>
        <button
          className="tbtn"
          onClick={() => setUiSkin('aurora')}
          title="Aurora UI 로 전환 — 디자인 2: 큼직한 버튼·아이콘, 카드형 작업 공간 (데이터·원고는 그대로 보존)"
          aria-label="Aurora UI 로 전환"
          style={{ fontWeight: 600 }}
        >
          <Icon name="palette" size={15} /> Aurora
        </button>
      </div>

      <div className="body">
        {/* 좁은 화면에서 패널이 오버레이로 떠 있을 때, 빈 영역(backdrop) 클릭으로 닫기 */}
        {isNarrow && (binderVisible || inspectorVisible) && (
          <div
            className="panel-backdrop"
            onClick={() => useStore.setState({ binderVisible: false, inspectorVisible: false })}
            aria-hidden="true"
          />
        )}
        {binderVisible && (
          <>
            <div
              className={'binder-pane' + (isNarrow ? ' pane-overlay pane-overlay-left' : '')}
              style={isNarrow
                ? { width: 'min(86vw, 360px)' }
                : { width: binderW, flex: `0 0 ${binderW}px`, display: 'flex' }}
            >
              <Binder />
            </div>
            {!isNarrow && <Resizer label="바인더 폭 조절 (←/→ 키로 조정)" onDrag={(dx) => setBinderW((w) => Math.max(180, Math.min(460, w + dx)))} />}
          </>
        )}

        <div className="center">
          <CenterHeader />
          {showFind && <FindReplaceBar onClose={() => setShowFind(false)} />}
          {viewMode === 'editor' && <Editor />}
          {viewMode === 'corkboard' && <Corkboard />}
          {viewMode === 'outliner' && <Outliner />}
          {viewMode === 'board' && <Board />}
          {viewMode === 'canvas' && <StoryCanvas />}
          {viewMode === 'serial' && <SerialDashboard />}
          {viewMode === 'timeline' && <TimelineView />}
          {viewMode === 'references' && <ReferencesView />}
          {viewMode === 'argument' && <ArgumentView />}
          {viewMode === 'database' && <DatabaseView />}
        </div>

        {inspectorVisible && (
          <>
            {!isNarrow && <Resizer label="인스펙터 폭 조절 (←/→ 키로 조정)" keyStep={-10} onDrag={(dx) => setInspW((w) => Math.max(220, Math.min(520, w - dx)))} />}
            <div
              className={'insp-pane' + (isNarrow ? ' pane-overlay pane-overlay-right' : '')}
              style={isNarrow
                ? { width: 'min(86vw, 380px)' }
                : { width: inspW, flex: `0 0 ${inspW}px`, display: 'flex' }}
            >
              <Inspector />
            </div>
          </>
        )}
      </div>
      </>
      )}

      <Footer saveError={!!saveError} />

      {composition && <Composition />}
      {/* 새 창(별도 창) 집중 모드 — 같은 앱 인스턴스(스토어/자동저장 공유)라 저장·모든 기능 동일하게 동작. */}
      {compWindow && (
        <PortalWindow
          title="집중 모드 — sry"
          fullscreen={compWindow.fullscreen}
          width={compWindow.fullscreen ? (window.screen?.availWidth || 1280) : 980}
          height={compWindow.fullscreen ? (window.screen?.availHeight || 800) : 720}
          onClose={() => setCompWindow(null)}
        >
          <Composition onExit={() => setCompWindow(null)} />
        </PortalWindow>
      )}
      {showShortcuts && <ShortcutSheet onClose={() => setShowShortcuts(false)} />}
      {skinCoach && !showTour && !showManual && <SkinCoach skin={skinCoach} onClose={() => setSkinCoach(null)} />}
      {/* 집중 모드 진입 방식 선택 */}
      {focusStep !== 'none' && (
        <div className="modal-backdrop" onClick={() => setFocusStep('none')}>
          <div className="modal focus-chooser" role="dialog" aria-modal="true" aria-label="집중 모드 방식 선택" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h2>집중 모드</h2>
            {focusStep === 'choose' ? (
              <>
                <p className="focus-chooser-desc">어디서 집중해서 글을 쓸까요?</p>
                <div className="focus-chooser-opts">
                  <button className="focus-opt" onClick={enterFocusHere}>
                    <b>현재 창에서</b><span>지금 이 화면을 집중 모드로 전환합니다(기존 방식).</span>
                  </button>
                  <button className="focus-opt" onClick={() => setFocusStep('window')}>
                    <b>새 창에서</b><span>별도 창을 열어 집중 모드로 씁니다(다중 모니터에 좋아요).</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="focus-chooser-desc">새 창을 어떻게 열까요?</p>
                <div className="focus-chooser-opts">
                  <button className="focus-opt" onClick={() => enterFocusWindow(true)}>
                    <b>전체 화면</b><span>새 창을 화면 가득(가능하면 브라우저 전체화면)으로.</span>
                  </button>
                  <button className="focus-opt" onClick={() => enterFocusWindow(false)}>
                    <b>일반 창</b><span>적당한 크기의 일반 창으로 엽니다.</span>
                  </button>
                </div>
                <button className="minibtn" onClick={() => setFocusStep('choose')} style={{ marginTop: 10 }}>← 뒤로</button>
              </>
            )}
            <div className="modal-foot"><button className="minibtn" onClick={() => setFocusStep('none')}>취소</button></div>
          </div>
        </div>
      )}
      {showScratch && <Scratchpad onClose={() => setShowScratch(false)} />}
      {showSprint && <SprintBar onClose={() => setShowSprint(false)} />}
      {showPrompts && <PromptDeck onClose={() => setShowPrompts(false)} />}
      {quickRefs.map((id, i) => (
        <QuickRef key={id} id={id} index={i} onClose={() => setQuickRefs((r) => r.filter((x) => x !== id))} />
      ))}
      {showRead && <ReadAloud onClose={() => setShowRead(false)} />}
      <AutoComplete />
      {modal === 'compile' && <CompileDialog onClose={closeModal} />}
      {modal === 'platformPublish' && <PlatformPublishModal onClose={closeModal} />}
      {modal === 'platformPreview' && <PlatformReaderPreview onClose={closeModal} />}
      {modal === 'toolhub' && <ToolHub onOpen={openTool} onClose={closeModal} />}
      {modal === 'genrebox' && <GenreToolbox onOpen={openTool} onClose={closeModal} />}
      <StashBox />
      {/* 인터랙티브 온보딩 가이드 투어(말풍선으로 실제 UI 안내). 백업 복구 안내와 겹치지 않게. */}
      {showTour && !showManual && modal !== 'backup' && <GuidedTour onClose={endTour} />}
      {/* 본격 실습형 매뉴얼(따라 하며 작은 작품 완성). 보기 메뉴 '더 알아보기'로 시작. */}
      {showManual && <GuidedManual onClose={() => setShowManual(false)} />}
      {modal === 'snapshotHelp' && (() => {
        const aId = firstTextDocId()
        const aItem = aId ? project.items[aId] : null
        const snapCount = aId ? (project.snapshots?.[aId]?.length || 0) : 0
        return (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" style={{ width: 500 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="snapshot" size={20} />스냅샷이란?</h2>
            <div className="modal-body" style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)' }}>
              <p style={{ margin: '0 0 10px' }}>
                스냅샷은 <b>지금 이 문서의 상태를 사진처럼 저장</b>해 두는 되돌리기 지점이에요. 크게 고치기 전에 한 번 찍어두면,
                나중에 그 시점과 <b>비교</b>하거나 <b>그때로 되돌릴</b> 수 있어 마음 놓고 수정할 수 있습니다.
                <span style={{ color: 'var(--muted)' }}> (자동저장과 별개로, 내가 원할 때 만드는 안전 지점입니다.)</span>
              </p>
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', margin: '0 0 10px' }}>
                <b style={{ fontSize: 12.5 }}>쓰는 법</b>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text)' }}>
                  <li>아래 <b>지금 스냅샷 찍기</b> → 현재 문서가 한 버전으로 저장돼요.</li>
                  <li>우측 <b>인스펙터 → ‘스냅샷’ 탭</b>에서 목록을 보고 <b>비교</b>·<b>되돌리기</b>.</li>
                  <li>제목을 붙여 여러 시점(초고·퇴고본 등)을 관리할 수 있어요.</li>
                </ol>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)' }}>
                ℹ️ 이 안내창은 <b>오류가 아니라</b> 스냅샷을 처음 쓰는 분을 위한 설명이에요. 아래 ‘다음부터 바로 찍기’를 켜면 다음엔 안내 없이 즉시 찍힙니다.
              </p>
              <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                현재 문서: <b>{aItem ? (aItem.title || '제목 없는 문서') : '없음'}</b>
                {aId && <> · 저장된 스냅샷 <b>{snapCount}</b>개</>}
              </div>
              {!aId && <p style={{ margin: '8px 0 0', color: 'var(--warn)' }}>편집할 글 문서가 없어요. 먼저 좌측 바인더에서 글 문서를 만들거나 선택해 주세요.</p>}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={snapSkipHelp} onChange={(e) => setSnapSkip(e.target.checked)} /> 다음부터 안내 없이 바로 찍기
              </label>
            </div>
            <div className="modal-foot" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="tbtn" onClick={closeModal}>닫기</button>
              <button className="btn-ghost" disabled={!aId} onClick={() => { openSnapshotList(); closeModal() }}>📋 스냅샷 목록 보기</button>
              <button className="btn-primary" disabled={!aId} onClick={() => { doTakeSnapshot(); closeModal() }}>📸 지금 스냅샷 찍기</button>
            </div>
          </div>
        </div>
        )
      })()}
      {/* 최소화해도 언마운트하지 않고(작업 내용 보존) display:none 으로 숨긴다 — 복원 시 입력/스크롤 유지 */}
      {openToolIds.map((tid, i) => {
        const t = UTILITY_TOOLS.find((x) => x.id === tid)
        if (!t) return null
        const C = t.Component
        const isMin = minimizedToolIds.includes(tid)
        return (
          <ToolWindow key={tid} id={tid} title={t.name} icon={<Icon name={iconForTool(t)} size={14} />} minimized={isMin} onClose={() => closeTool(tid)} onMinimize={() => minimizeTool(tid)} onActivate={() => bringToFront(tid)} z={toolZ[tid]} defaultW={t.w} defaultH={t.h} offsetIndex={i}
            related={relatedToolsFor(tid)} onOpenRelated={(rid) => openTool(rid)}
            favorited={favorites.some((f) => f.id === 'tool:' + tid)} onToggleFav={() => toggleFavorite({ id: 'tool:' + tid, label: t.icon + ' ' + t.name })}>
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>도구 불러오는 중…</div>}>
              <C payload={toolPayloads[tid]} />
            </Suspense>
          </ToolWindow>
        )
      })}
      {/* #1: 열린 도구 전체(최소화 포함) 창 스위처/독 + 일괄 관리(모두 최소화/닫기/타일 정렬) */}
      {openToolIds.length > 0 && (
        <div className="tool-dock" role="toolbar" aria-label="열린 도구 창">
          {openToolIds.map((tid) => {
            const t = UTILITY_TOOLS.find((x) => x.id === tid)
            if (!t) return null
            const isMin = minimizedToolIds.includes(tid)
            return (
              <div key={tid} className={'tool-dock-chip' + (isMin ? ' is-min' : '')}>
                <button
                  className="tool-dock-restore"
                  onClick={() => (isMin ? restoreTool(tid) : bringToFront(tid))}
                  title={(isMin ? '복원: ' : '앞으로: ') + t.name}
                  aria-label={(isMin ? '복원 ' : '앞으로 ') + t.name}
                >
                  <Icon name={iconForTool(t)} size={14} />
                  <span className="tool-dock-name">{t.name}</span>
                </button>
                {!isMin && (
                  <button className="tool-dock-x" aria-label={t.name + ' 최소화'} title="최소화" onClick={() => minimizeTool(tid)}>—</button>
                )}
                <button className="tool-dock-x" aria-label={t.name + ' 닫기'} title="닫기" onClick={() => closeTool(tid)}>×</button>
              </div>
            )
          })}
          {openToolIds.length > 1 && (
            <div className="tool-dock-actions">
              <button className="tool-dock-act" title="모든 도구 창 타일 정렬" onClick={tileTools}>타일</button>
              <button className="tool-dock-act" title="모든 도구 창 최소화" onClick={minimizeAllTools}>모두 최소화</button>
              <button className="tool-dock-act" title="모든 도구 창 닫기" onClick={closeAllTools}>모두 닫기</button>
            </div>
          )}
        </div>
      )}
      {modal === 'stats' && <StatisticsModal onClose={closeModal} />}
      {modal === 'style' && <StyleModal onClose={closeModal} />}
      {modal === 'settings' && <ProjectSettingsModal onClose={closeModal} />}
      {modal === 'newProject' && <NewProjectModal onClose={closeModal} onCreate={(p) => requestSwitch(() => { loadProject(p); useStore.setState({ dirty: true }) })} />}
      {modal === 'projects' && <ProjectListModal onClose={closeModal} onOpenProject={openProjectById} />}
      {modal === 'nameGen' && <NameGenModal onClose={closeModal} />}
      {modal === 'backup' && <BackupModal onClose={closeModal} />}
      {modal === 'docLink' && <DocLinkModal onClose={closeModal} />}
      {/* AI 어시스턴트: 현재 비활성화(메뉴/명령은 보이되 클릭 불가). 나중에 재활성화 시 false 제거. */}
      {false && modal === 'ai' && <AiModal onClose={closeModal} />}
      {modal === 'replace' && <ProjectReplaceModal onClose={closeModal} />}
      {modal === 'docTemplate' && <DocTemplateModal onClose={closeModal} />}
      {modal === 'linguistic' && <LinguisticFocusModal onClose={closeModal} />}
      {modal === 'structure' && <StructureTemplateModal onClose={closeModal} />}
      {modal === 'tension' && <TensionCurveModal onClose={closeModal} />}
      {modal === 'creative' && (
        <Suspense fallback={<div className="modal-overlay"><div style={{ margin: 'auto', color: 'var(--muted)' }}>창작 스튜디오 불러오는 중…</div></div>}>
          <CreativeStudio onClose={closeModal} />
        </Suspense>
      )}
      {modal === 'palette' && <CommandPalette commands={commands} onClose={closeModal} />}

      {switchAsk && (
        <div className="modal-backdrop" onClick={() => { pendingSwitch.current = null; setSwitchAsk(null) }}>
          <div className="modal" style={{ width: 460 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>프로젝트 전환</h2>
            <div className="modal-body">
              {switchAsk.note
                ? <p style={{ color: 'var(--warn)', lineHeight: 1.6 }}>{switchAsk.note}</p>
                : <p>현재 작업 중인 <b>{switchAsk.title}</b> 에서 다른 프로젝트로 전환합니다.</p>}
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
                브라우저에는 자동 저장되지만, 나중에 다른 기기·브라우저에서도 열거나 안전하게 보관하려면 <b>.sry 파일</b>로 내보내 두는 것이 좋습니다.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => { pendingSwitch.current = null; setSwitchAsk(null) }}>취소</button>
              <button className="btn-ghost" onClick={() => doProceedSwitch(false)}>그냥 전환</button>
              <button className="btn-primary" onClick={() => doProceedSwitch(true)}>.sry로 내보내고 전환</button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".sry,.zip"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) { if (SCRIVENER_INTEROP) onImportScrivZip(f); else onImportSryFile(f) }
          e.target.value = ''
        }}
      />
    </div>
  )
}
