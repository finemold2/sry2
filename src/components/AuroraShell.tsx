// Aurora 스킨(디자인 2) — 최근 트렌드의 큼직한 내비게이션·아이콘·카드형 작업 공간을 가진 완전히 새로운 셸.
// 클래식/스튜디오와 같은 zustand store 와 같은 뷰/바인더/인스펙터 컴포넌트를 재사용하므로 기능은 100% 동일하고
// 껍데기(레이아웃·크기·질감)만 다르다. 설정/메뉴/명령 팔레트에서 세 스킨을 언제든 오갈 수 있다.
// 스타일은 src/aurora.css (`.app-aurora` 범위). 메뉴 드롭다운 트리거는 다른 스킨과 같은 `.menu-wrap > button` 구조를 유지해
// 가이드 투어/매뉴얼의 셀렉터가 그대로 동작한다.
import { useEffect, useRef, useState } from 'react'
import { pathOf, useStore } from '../store/store'
import { Icon } from '../ui/icons'
import Binder from './Binder'
import Inspector from './Inspector'
import FindReplaceBar from './FindReplaceBar'
import { ActiveView, type StudioMenuDef, type StudioProps, type ViewKey } from './StudioShell'

const VIEWS: { key: ViewKey; icon: string; label: string; hint: string }[] = [
  { key: 'editor', icon: 'editor', label: '에디터', hint: '원고 쓰기' },
  { key: 'corkboard', icon: 'corkboard', label: '코르크보드', hint: '카드로 구상' },
  { key: 'outliner', icon: 'outliner', label: '아웃라이너', hint: '표로 훑기' },
  { key: 'board', icon: 'board', label: '칸반', hint: '상태별 진행' },
  { key: 'canvas', icon: 'canvas', label: '캔버스', hint: '자유 배치' },
  { key: 'serial', icon: 'serial', label: '연재', hint: '회차·발행' },
  { key: 'timeline', icon: 'timeline', label: '타임라인', hint: '스토리 시간' },
  { key: 'references', icon: 'references', label: '참고문헌', hint: '출처·인용' },
  { key: 'argument', icon: 'argument', label: '논증', hint: '주장·근거' },
  { key: 'database', icon: 'database', label: '데이터베이스', hint: '전체 표' },
]

export type SkinName = 'classic' | 'studio' | 'aurora'

export interface AuroraProps extends Omit<StudioProps, 'onSetClassic'> {
  /** 세 스킨 전환(헤더의 디자인 스위처). */
  onSetSkin: (skin: SkinName) => void
}

function Crumbs() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const item = activeId ? project.items[activeId] : null
  const crumbs = item ? pathOf(project, item.id) : []
  return (
    <div className="au-crumbs" aria-label="현재 문서 경로">
      {crumbs.length === 0 && <span className="au-crumb au-crumb-empty">선택된 문서 없음</span>}
      {crumbs.map((c, i) => (
        <span key={c.id} className={'au-crumb' + (i === crumbs.length - 1 ? ' au-crumb-last' : '')}>
          {i > 0 && <Icon name="dot" size={8} mono className="au-crumb-sep" />}{c.title}
        </span>
      ))}
    </div>
  )
}

function Resizer({ onDrag }: { onDrag: (dx: number) => void }) {
  const drag = useRef<number | null>(null)
  return (
    <div
      className="au-resizer"
      onPointerDown={(e) => { drag.current = e.clientX; (e.target as HTMLElement).setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (drag.current != null) { onDrag(e.clientX - drag.current); drag.current = e.clientX } }}
      onPointerUp={(e) => { drag.current = null; try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } }}
    />
  )
}

// 큼직한 알약형 메뉴 트리거 + 공용 .dropdown(다른 스킨과 동일 동작·셀렉터).
function AuroraMenu({ menu, open, setOpen }: { menu: StudioMenuDef; open: boolean; setOpen: (v: string | null) => void }) {
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
        className={'au-menu-btn' + (open ? ' active' : '')}
        aria-haspopup="menu" aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(open ? null : menu.id) }}
        onMouseEnter={() => { if (!open) { const anyOpen = document.querySelector('.au-menubar .menu-wrap .dropdown'); if (anyOpen) setOpen(menu.id) } }}
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

const NARROW_PX = 900

export default function AuroraShell(p: AuroraProps) {
  const viewMode = useStore((s) => s.viewMode)
  const setView = useStore((s) => s.setView)
  const binderVisible = useStore((s) => s.binderVisible)
  const inspectorVisible = useStore((s) => s.inspectorVisible)
  const title = useStore((s) => s.project.title)
  const setProjectTitle = useStore((s) => s.setProjectTitle)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isNarrow, setIsNarrow] = useState<boolean>(() => { try { return window.innerWidth < NARROW_PX } catch { return false } })
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_PX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const closePanels = () => useStore.setState({ binderVisible: false, inspectorVisible: false })

  const navBtn = (icon: string, label: string, hint: string, active: boolean, onClick: () => void, isToggle = true) => (
    <button
      className={'au-nav-btn' + (active ? ' active' : '')}
      onClick={onClick}
      title={label + ' — ' + hint}
      aria-label={label}
      {...(isToggle ? { 'aria-pressed': active } : {})}
    >
      <span className="au-nav-ico"><Icon name={icon} size={26} mono strokeWidth={1.6} /></span>
      <span className="au-nav-label">{label}</span>
    </button>
  )

  // 헤더 액션: 아이콘 + 짧은 라벨의 큼직한 알약 버튼(좁은 폭에서는 라벨 숨김).
  const action = (icon: string, label: string, onClick: () => void, opts: { active?: boolean; title?: string; pressed?: boolean; onContextMenu?: (e: React.MouseEvent) => void } = {}) => (
    <button
      className={'au-action' + (opts.active ? ' active' : '')}
      onClick={onClick}
      onContextMenu={opts.onContextMenu}
      title={opts.title || label}
      aria-label={label}
      {...(opts.pressed !== undefined ? { 'aria-pressed': opts.pressed } : {})}
    >
      <Icon name={icon} size={20} mono strokeWidth={1.7} />
      <span className="au-action-tx">{label}</span>
    </button>
  )

  return (
    <div className="aurora-root">
      {/* 좌측 대형 내비게이션 */}
      <nav className="au-nav" aria-label="주요 내비게이션">
        <div className="au-brand" title="sry — 글쓰기 스튜디오">
          <span className="au-brand-mark"><Icon name="book" size={26} mono /></span>
          <span className="au-brand-name">sry</span>
        </div>
        <div className="au-nav-group" role="group" aria-label="보기">
          {VIEWS.map((v) => navBtn(v.icon, v.label, v.hint, viewMode === v.key, () => setView(v.key)))}
        </div>
        <div className="au-nav-spacer" />
        <div className="au-nav-group au-nav-tools" role="group" aria-label="도구">
          {navBtn('sparkle', '창작 스튜디오', '2,445개 창작 도구', p.activeModal === 'creative', () => p.onOpenModal('creative'), false)}
          {navBtn('tools', '도구 허브', '막혔을 때 돕는 대형 도구', p.activeModal === 'toolhub', () => p.onOpenModal('toolhub'), false)}
          {navBtn('generator', '장르 도구함', '장르별 생성기', p.activeModal === 'genrebox', () => p.onOpenModal('genrebox'), false)}
          {navBtn('compile', '내보내기', '컴파일·발행', p.activeModal === 'compile', () => p.onOpenModal('compile'), false)}
          {navBtn('settings', '설정', '앱·프로젝트 설정', p.activeModal === 'settings', () => p.onOpenModal('settings'), false)}
        </div>
      </nav>

      <div className="au-main">
        {/* 상단 커맨드 바 */}
        <header className="au-top">
          <div className="au-top-row">
            {p.menus && p.menus.length > 0 && (
              <div className="au-menubar">
                {p.menus.map((m) => <AuroraMenu key={m.id} menu={m} open={openMenu === m.id} setOpen={setOpenMenu} />)}
              </div>
            )}
            <span className="au-top-spacer" />
            {p.status && <span className="au-status" role="status">{p.status}</span>}
            <div className="au-scale" title="화면 글자 크기">
              <button className="au-scale-btn" onClick={() => p.onChangeScale(-0.1)} disabled={p.uiScale <= 0.8} aria-label="작게">A−</button>
              <button className="au-scale-btn au-scale-val" onClick={p.onResetScale} title="100%로" aria-label="크기 초기화">{Math.round(p.uiScale * 100)}%</button>
              <button className="au-scale-btn" onClick={() => p.onChangeScale(0.1)} disabled={p.uiScale >= 1.6} aria-label="크게">A+</button>
            </div>
            <div className="au-skins" role="group" aria-label="디자인 전환" title="디자인 전환 — 원고·설정은 그대로 보존됩니다">
              <button className="au-skin" onClick={() => p.onSetSkin('classic')} aria-label="클래식 UI 로 전환">클래식</button>
              <button className="au-skin" onClick={() => p.onSetSkin('studio')} aria-label="Studio UI 로 전환">스튜디오</button>
              <button className="au-skin active" aria-pressed="true" aria-label="Aurora UI(현재)">오로라</button>
            </div>
          </div>
          <div className="au-top-row au-top-row-2">
            <button className={'au-action au-action-ico' + (binderVisible ? ' active' : '')} onClick={p.onToggleBinder} title="바인더 토글 (⌘⇧B)" aria-label="바인더" aria-pressed={binderVisible}><Icon name="binder" size={22} mono /></button>
            <div className="au-title-wrap">
              <input className="au-title" value={title} onChange={(e) => setProjectTitle(e.target.value)} title="프로젝트 제목" aria-label="프로젝트 제목" />
              <Crumbs />
            </div>
            <span className="au-top-spacer" />
            {action('search', '찾기', () => p.setShowFind(!p.showFind), { active: p.showFind, pressed: p.showFind, title: '찾기/바꾸기 (⌘F)' })}
            {action('snapshot', '스냅샷', p.onSnapshot, { title: '스냅샷 찍기(버전 저장)' })}
            {action('split', '분할', () => { if (p.splitId) p.onCycleSplitDir(); else p.onToggleSplit() }, {
              active: !!p.splitId, pressed: !!p.splitId,
              title: p.splitId ? '분할 방향 전환 (현재: ' + (p.splitDir === 'horizontal' ? '가로' : '세로') + ' · 우클릭: 닫기)' : '편집기 분할 (⌘⇧K)',
              onContextMenu: (e) => { if (p.splitId) { e.preventDefault(); p.onCloseSplit() } },
            })}
            {action('focus', '집중', p.onToggleComposition, { title: '집중 모드 (⌘⇧↵)' })}
            {action(p.theme === 'dark' ? 'moon' : p.theme === 'sepia' ? 'book' : 'sun', '테마', p.onCycleTheme, { title: '테마 전환 (⌘⇧L)' })}
            {action('palette', '명령', () => p.onOpenModal('palette'), { title: '명령 팔레트 (⌘K) — 모든 기능' })}
            <button className={'au-action au-action-ico' + (inspectorVisible ? ' active' : '')} onClick={p.onToggleInspector} title="인스펙터 토글 (⌘⇧I)" aria-label="인스펙터" aria-pressed={inspectorVisible}><Icon name="inspector" size={22} mono /></button>
            <button
              className={'au-save' + (p.saveError ? ' err' : p.dirty ? ' dirty' : ' ok')}
              onClick={p.onSave}
              title={
                (p.saveError
                  ? '⚠ 자동 저장 실패 — 변경분은 메모리에 보존되어 있습니다. 눌러서 다시 저장하거나 백업/내보내기를 권장합니다.'
                  : p.dirty ? '변경사항을 저장합니다 (⌘S).' : p.lastSaved ? '저장됨 · ' + new Date(p.lastSaved).toLocaleTimeString() : '저장 (⌘S)') +
                '\n자동 저장이 켜져 있으면 잠시 후 자동으로도 저장됩니다.'
              }
            >
              <Icon name="save" size={20} mono /> <span className="au-save-tx">{p.saveError ? '저장 실패' : p.dirty ? '저장' : '저장됨'}</span>
            </button>
          </div>
        </header>

        {/* 카드형 작업 공간 */}
        <div className="au-body">
          {isNarrow && (binderVisible || inspectorVisible) && (
            <div className="panel-backdrop" onClick={closePanels} aria-hidden="true" />
          )}
          {binderVisible && (
            <>
              <aside
                className={'au-panel au-binder' + (isNarrow ? ' pane-overlay pane-overlay-left' : '')}
                style={isNarrow ? { width: 'min(88vw, 380px)' } : { width: p.binderW, flex: `0 0 ${p.binderW}px` }}
              ><Binder /></aside>
              {!isNarrow && <Resizer onDrag={(dx) => p.setBinderW((w) => Math.max(210, Math.min(480, w + dx)))} />}
            </>
          )}
          <main className="au-panel au-center">
            {p.showFind && <FindReplaceBar onClose={() => p.setShowFind(false)} />}
            <ActiveView />
          </main>
          {inspectorVisible && (
            <>
              {!isNarrow && <Resizer onDrag={(dx) => p.setInspW((w) => Math.max(240, Math.min(540, w - dx)))} />}
              <aside
                className={'au-panel au-inspector' + (isNarrow ? ' pane-overlay pane-overlay-right' : '')}
                style={isNarrow ? { width: 'min(88vw, 400px)' } : { width: p.inspW, flex: `0 0 ${p.inspW}px` }}
              ><Inspector /></aside>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
