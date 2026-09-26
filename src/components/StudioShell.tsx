// Studio 스킨 — 완전히 새로운 모던 UI 셸(유료 상품 웹앱 톤). 기존 클래식 UI 와 전환 가능.
// 핵심 안전성: 같은 zustand store 를 읽으므로 스킨을 바꿔도 원고·프로젝트·도구 상태가 100% 보존된다(컴포넌트만 교체).
// 검증된 뷰/바인더/인스펙터를 그대로 재사용하므로 모든 기능이 동일하게 동작한다. 아이콘은 전부 커스텀 SVG.
import { useEffect, useRef, useState } from 'react'
import { pathOf, useStore } from '../store/store'
import { Icon } from '../ui/icons'
import Binder from './Binder'
import Inspector from './Inspector'
import Editor from './Editor'
import Corkboard from './Corkboard'
import Outliner from './Outliner'
import Board from './Board'
import StoryCanvas from './StoryCanvas'
import SerialDashboard from './SerialDashboard'
import TimelineView from './TimelineView'
import ReferencesView from './ReferencesView'
import ArgumentView from './ArgumentView'
import DatabaseView from './DatabaseView'
import FindReplaceBar from './FindReplaceBar'

export type ViewKey =
  | 'editor' | 'corkboard' | 'outliner' | 'board' | 'canvas' | 'serial'
  | 'timeline' | 'references' | 'argument' | 'database'

const VIEWS: { key: ViewKey; icon: string; label: string }[] = [
  { key: 'editor', icon: 'editor', label: '에디터' },
  { key: 'corkboard', icon: 'corkboard', label: '코르크보드' },
  { key: 'outliner', icon: 'outliner', label: '아웃라이너' },
  { key: 'board', icon: 'board', label: '칸반 보드' },
  { key: 'canvas', icon: 'canvas', label: '스토리 캔버스' },
  { key: 'serial', icon: 'serial', label: '연재 관리' },
  { key: 'timeline', icon: 'timeline', label: '타임라인' },
  { key: 'references', icon: 'references', label: '참고문헌' },
  { key: 'argument', icon: 'argument', label: '논증 작업대' },
  { key: 'database', icon: 'database', label: '데이터베이스' },
]

// 현재 뷰 렌더(클래식/스튜디오 공용 개념). store 의 viewMode 구독.
export function ActiveView() {
  const viewMode = useStore((s) => s.viewMode)
  switch (viewMode) {
    case 'editor': return <Editor />
    case 'corkboard': return <Corkboard />
    case 'outliner': return <Outliner />
    case 'board': return <Board />
    case 'canvas': return <StoryCanvas />
    case 'serial': return <SerialDashboard />
    case 'timeline': return <TimelineView />
    case 'references': return <ReferencesView />
    case 'argument': return <ArgumentView />
    case 'database': return <DatabaseView />
    default: return <Editor />
  }
}

function Crumbs() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const item = activeId ? project.items[activeId] : null
  const crumbs = item ? pathOf(project, item.id) : []
  return (
    <div className="st-crumbs">
      {crumbs.length === 0 && <span style={{ color: 'var(--st-muted)' }}>선택된 문서 없음</span>}
      {crumbs.map((c, i) => (
        <span key={c.id} className="st-crumb">{i > 0 && <span className="st-sep">/</span>}{c.title}</span>
      ))}
    </div>
  )
}

function StudioResizer({ onDrag }: { onDrag: (dx: number) => void }) {
  const drag = useRef<number | null>(null)
  return (
    <div
      className="st-resizer"
      onPointerDown={(e) => { drag.current = e.clientX; (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (drag.current != null) { onDrag(e.clientX - drag.current); drag.current = e.clientX } }}
      onPointerUp={(e) => { drag.current = null; try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } }}
    />
  )
}

export interface StudioMenuItem { label?: string; fn?: () => void; kbd?: string; disabled?: boolean; divider?: boolean }
export interface StudioMenuDef { id: string; label: string; items: StudioMenuItem[] }

// Studio 상단 메뉴바 드롭다운 — 클래식 메뉴(.dropdown CSS 재사용)를 그대로 제공.
function StudioMenu({ menu, open, setOpen }: { menu: StudioMenuDef; open: boolean; setOpen: (v: string | null) => void }) {
  useEffect(() => {
    if (!open) return
    const onClick = () => setOpen(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey) }
  }, [open, setOpen])
  return (
    <div className="menu-wrap">
      <button
        className={'st-menu-btn' + (open ? ' active' : '')}
        aria-haspopup="menu" aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(open ? null : menu.id) }}
        onMouseEnter={() => { if (!open) { /* 이미 다른 메뉴가 열려 있으면 전환 */ const anyOpen = document.querySelector('.st-menubar .menu-wrap .dropdown'); if (anyOpen) setOpen(menu.id) } }}
      >{menu.label}</button>
      {open && (
        <div className="dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
          {menu.items.map((it, i) => it.divider ? <div key={i} className="divider" /> : (
            <button key={i} disabled={it.disabled} onClick={() => { it.fn && it.fn(); setOpen(null) }}>
              <span>{it.label}</span>{it.kbd && <span className="kbd">{it.kbd}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export interface StudioProps {
  theme: string
  menus?: StudioMenuDef[]
  uiScale: number
  dirty: boolean
  saveError: boolean
  lastSaved: number | null
  status?: string
  splitId: string | null
  splitDir: 'vertical' | 'horizontal'
  showFind: boolean
  setShowFind: (v: boolean) => void
  /** 현재 열린 모달 이름(레일 액션 버튼 활성표시용). */
  activeModal?: string | null
  /** 바인더/인스펙터 폭 — 클래식과 공유하는 단일 source. */
  binderW: number
  inspW: number
  setBinderW: (fn: (w: number) => number) => void
  setInspW: (fn: (w: number) => number) => void
  onOpenModal: (name: string) => void
  onSave: () => void
  onCycleTheme: () => void
  onChangeScale: (d: number) => void
  onResetScale: () => void
  onSnapshot: () => void
  onToggleSplit: () => void
  /** 분할 활성 시 방향 전환(세로↔가로). */
  onCycleSplitDir: () => void
  /** 분할 닫기(우클릭). */
  onCloseSplit: () => void
  onToggleComposition: () => void
  /** 좁은 화면 자동 접기를 우회하는 사용자 토글(클래식 userToggle*). */
  onToggleBinder: () => void
  onToggleInspector: () => void
  onSetClassic: () => void
}

// 좁은 화면 기준(클래식 App.tsx 와 동일한 820px). 이하에서는 바인더/인스펙터를 본문 위 오버레이로 띄운다.
const NARROW_PX = 820

export default function StudioShell(p: StudioProps) {
  const viewMode = useStore((s) => s.viewMode)
  const setView = useStore((s) => s.setView)
  const binderVisible = useStore((s) => s.binderVisible)
  const inspectorVisible = useStore((s) => s.inspectorVisible)
  const title = useStore((s) => s.project.title)
  const setProjectTitle = useStore((s) => s.setProjectTitle)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  // 좁은 화면 여부(#1): NARROW 이하에서는 패널을 절대배치 오버레이로 띄우고 리사이저를 숨긴다.
  const [isNarrow, setIsNarrow] = useState<boolean>(() => { try { return window.innerWidth < NARROW_PX } catch { return false } })
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_PX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // 백드롭/오버레이 모두 같은 닫기 동작 — 패널을 접는다(원고/도구 상태는 보존, 표시만 토글).
  const closePanels = () => useStore.setState({ binderVisible: false, inspectorVisible: false })

  // isToggle=true: 뷰 전환처럼 켜짐/꺼짐 상태가 있는 버튼 → aria-pressed 제공.
  // isToggle=false: 모달을 여는 액션 버튼 → aria-pressed 생략, 현재 열린 모달과 일치할 때만 active 표시.
  const railBtn = (icon: string, label: string, active: boolean, onClick: () => void, isToggle = true) => (
    <button
      className={'st-rail-btn' + (active ? ' active' : '')}
      onClick={onClick}
      title={label}
      aria-label={label}
      {...(isToggle ? { 'aria-pressed': active } : {})}
    >
      <Icon name={icon} size={20} mono />
      <span className="st-rail-label">{label}</span>
    </button>
  )

  return (
    <div className="studio-root">
      {/* 좌측 내비 레일 */}
      <nav className="st-rail" aria-label="주요 내비게이션">
        <div className="st-rail-brand" title="sry — 글쓰기 스튜디오"><Icon name="book" size={22} mono /></div>
        <div className="st-rail-group">
          {VIEWS.map((v) => railBtn(v.icon, v.label, viewMode === v.key, () => setView(v.key)))}
        </div>
        <div className="st-rail-spacer" />
        <div className="st-rail-group">
          {railBtn('sparkle', '창작 스튜디오', p.activeModal === 'creative', () => p.onOpenModal('creative'), false)}
          {railBtn('tools', '도구 허브', p.activeModal === 'toolhub', () => p.onOpenModal('toolhub'), false)}
          {railBtn('generator', '장르 도구함', p.activeModal === 'genrebox', () => p.onOpenModal('genrebox'), false)}
          {railBtn('compile', '컴파일/내보내기', p.activeModal === 'compile', () => p.onOpenModal('compile'), false)}
          {railBtn('settings', '설정', p.activeModal === 'settings', () => p.onOpenModal('settings'), false)}
        </div>
      </nav>

      {/* 본문 영역 */}
      <div className="st-main">
        {/* 상단 헤더 */}
        <header className="st-top">
          {p.menus && p.menus.length > 0 && (
            <div className="st-menubar">
              {p.menus.map((m) => <StudioMenu key={m.id} menu={m} open={openMenu === m.id} setOpen={setOpenMenu} />)}
            </div>
          )}
          <button className={'st-icon-btn' + (binderVisible ? ' active' : '')} onClick={p.onToggleBinder} title="바인더 토글" aria-label="바인더" aria-pressed={binderVisible}><Icon name="binder" size={17} /></button>
          <input className="st-title" value={title} onChange={(e) => setProjectTitle(e.target.value)} title="프로젝트 제목" aria-label="프로젝트 제목" />
          <Crumbs />
          <span className="st-top-spacer" />
          {p.status && <span className="st-status" role="status">{p.status}</span>}
          <div className="st-scale" title="화면 글자 크기">
            <button className="st-icon-btn" onClick={() => p.onChangeScale(-0.1)} disabled={p.uiScale <= 0.8} aria-label="작게">A−</button>
            <button className="st-icon-btn st-scale-val" onClick={p.onResetScale} title="100%로" aria-label="크기 초기화">{Math.round(p.uiScale * 100)}%</button>
            <button className="st-icon-btn" onClick={() => p.onChangeScale(0.1)} disabled={p.uiScale >= 1.6} aria-label="크게">A+</button>
          </div>
          <button className={'st-icon-btn' + (p.showFind ? ' active' : '')} onClick={() => setShowFindToggle(p)} title="찾기/바꾸기" aria-label="찾기" aria-pressed={p.showFind}><Icon name="search" size={17} /></button>
          <button className="st-icon-btn" onClick={p.onSnapshot} title="스냅샷 찍기" aria-label="스냅샷"><Icon name="snapshot" size={17} /></button>
          <button
            className={'st-icon-btn' + (p.splitId ? ' active' : '')}
            onClick={() => { if (p.splitId) p.onCycleSplitDir(); else p.onToggleSplit() }}
            onContextMenu={(e) => { if (p.splitId) { e.preventDefault(); p.onCloseSplit() } }}
            title={p.splitId ? '분할 방향 전환 (현재: ' + (p.splitDir === 'horizontal' ? '가로' : '세로') + ' · 우클릭: 닫기)' : '편집기 분할'}
            aria-label="편집기 분할"
            aria-pressed={!!p.splitId}
          ><Icon name="split" size={17} /></button>
          <button className="st-icon-btn" onClick={p.onToggleComposition} title="집중 모드" aria-label="집중 모드"><Icon name="focus" size={17} /></button>
          <button className="st-icon-btn" onClick={p.onCycleTheme} title="테마 전환" aria-label="테마 전환"><Icon name={p.theme === 'dark' ? 'moon' : p.theme === 'sepia' ? 'book' : 'sun'} size={17} /></button>
          <button className="st-icon-btn" onClick={() => p.onOpenModal('palette')} title="명령 팔레트 (⌘K) — 모든 기능" aria-label="명령 팔레트"><Icon name="palette" size={17} /></button>
          <button className={'st-icon-btn' + (inspectorVisible ? ' active' : '')} onClick={p.onToggleInspector} title="인스펙터 토글" aria-label="인스펙터" aria-pressed={inspectorVisible}><Icon name="inspector" size={17} /></button>
          <button
            className={'st-save' + (p.saveError ? ' err' : p.dirty ? ' dirty' : ' ok')}
            onClick={p.onSave}
            title={
              (p.saveError
                ? '⚠ 자동 저장 실패 — 변경분은 메모리에 보존되어 있습니다. 눌러서 다시 저장하거나 백업/내보내기를 권장합니다.'
                : p.dirty ? '변경사항을 저장합니다 (⌘S).' : p.lastSaved ? '저장됨 · ' + new Date(p.lastSaved).toLocaleTimeString() : '저장 (⌘S)') +
              '\n자동 저장이 켜져 있으면 잠시 후 자동으로도 저장됩니다. sry 폴더/.sry 파일로 내보내려면 파일 메뉴를 사용하세요.'
            }
          >
            <Icon name="save" size={16} mono /> <span className="st-save-tx">{p.saveError ? '저장 실패' : p.dirty ? '저장' : '저장됨'}</span>
          </button>
          <button className="st-skin-toggle" onClick={p.onSetClassic} title="클래식 UI 로 전환">클래식 UI</button>
        </header>

        {/* 3분할 본문 */}
        <div className="st-body">
          {/* 좁은 화면에서 패널이 오버레이로 떠 있을 때, 빈 영역(backdrop) 클릭으로 닫기 */}
          {isNarrow && (binderVisible || inspectorVisible) && (
            <div className="panel-backdrop" onClick={closePanels} aria-hidden="true" />
          )}
          {binderVisible && (
            <>
              <aside
                className={'st-binder' + (isNarrow ? ' pane-overlay pane-overlay-left' : '')}
                style={isNarrow ? { width: 'min(86vw, 360px)' } : { width: p.binderW, flex: `0 0 ${p.binderW}px` }}
              ><Binder /></aside>
              {!isNarrow && <StudioResizer onDrag={(dx) => p.setBinderW((w) => Math.max(190, Math.min(460, w + dx)))} />}
            </>
          )}
          <main className="st-center">
            {p.showFind && <FindReplaceBar onClose={() => p.setShowFind(false)} />}
            <ActiveView />
          </main>
          {inspectorVisible && (
            <>
              {!isNarrow && <StudioResizer onDrag={(dx) => p.setInspW((w) => Math.max(220, Math.min(520, w - dx)))} />}
              <aside
                className={'st-inspector' + (isNarrow ? ' pane-overlay pane-overlay-right' : '')}
                style={isNarrow ? { width: 'min(86vw, 380px)' } : { width: p.inspW, flex: `0 0 ${p.inspW}px` }}
              ><Inspector /></aside>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function setShowFindToggle(p: StudioProps) { p.setShowFind(!p.showFind) }
