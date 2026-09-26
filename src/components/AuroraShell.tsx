// Aurora 스킨(디자인 2) — 클래식/스튜디오와 뼈대부터 다른 "캔버스형" 셸.
//  · 상단 바 없음: 캔버스 위에 브랜드·프로젝트 제목(세리프)·경로만 타이포그래피로 얹는다
//  · 좌측 레일 없음: 뷰 10종은 화면 하단의 **대형 컬러 독**
//  · 액션(찾기·스냅샷·분할·집중·테마·명령·저장)은 오른쪽 가장자리의 **세로 플로팅 레일**
//  · 바인더/인스펙터는 캔버스 위로 미끄러져 나오는 **유리 서랍**(처음엔 닫혀 있음 — 원고에 집중)
//  · 테마(라이트/다크/세피아)는 다른 스킨과 같은 토글로 동작 — 첫 진입만 다크로 시작
//  · 파일/문서/도구/보기 메뉴는 전 항목을 한 화면에 펼치는 **타일 런처**
// 같은 zustand store 와 같은 뷰/바인더/인스펙터/도구 컴포넌트를 렌더하므로 기능은 100% 동일하다.
import { useEffect, useRef, useState } from 'react'
import { pathOf, useStore } from '../store/store'
import { Icon } from '../ui/icons'
import Binder from './Binder'
import Inspector from './Inspector'
import FindReplaceBar from './FindReplaceBar'
import { ActiveView, type StudioMenuDef, type StudioProps, type ViewKey } from './StudioShell'

export type SkinName = 'classic' | 'studio' | 'aurora'

export interface AuroraProps extends Omit<StudioProps, 'onSetClassic'> {
  onSetSkin: (skin: SkinName) => void
}

// 뷰 10종 — 각각 고유 색(독 아이콘·스테이지 제목·레일 강조·코르크보드 격자에 사용)
const VIEWS: { key: ViewKey; icon: string; label: string; hint: string; color: string }[] = [
  { key: 'editor', icon: 'editor', label: '에디터', hint: '원고를 씁니다', color: '#5b7cfa' },
  { key: 'corkboard', icon: 'corkboard', label: '코르크보드', hint: '카드로 구상합니다', color: '#f0a23b' },
  { key: 'outliner', icon: 'outliner', label: '아웃라이너', hint: '표로 훑습니다', color: '#2fb3a6' },
  { key: 'board', icon: 'board', label: '칸반', hint: '상태별로 진행합니다', color: '#e0518b' },
  { key: 'canvas', icon: 'canvas', label: '캔버스', hint: '자유롭게 배치합니다', color: '#8b6dd4' },
  { key: 'serial', icon: 'serial', label: '연재', hint: '회차와 발행을 관리합니다', color: '#d2473b' },
  { key: 'timeline', icon: 'timeline', label: '타임라인', hint: '스토리 시간을 봅니다', color: '#3fa35a' },
  { key: 'references', icon: 'references', label: '참고문헌', hint: '출처와 인용', color: '#7a8493' },
  { key: 'argument', icon: 'argument', label: '논증', hint: '주장·근거·반박', color: '#c9772b' },
  { key: 'database', icon: 'database', label: '데이터베이스', hint: '모든 요소를 표로', color: '#2bb6c0' },
]

const INTRO_KEY = 'sry:aurora:intro'

function useIsNarrow(px: number) {
  const [narrow, setNarrow] = useState<boolean>(() => { try { return window.innerWidth < px } catch { return false } })
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < px)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [px])
  return narrow
}

// 타일형 런처 — 파일/문서/도구/보기 메뉴의 모든 항목을 4열 그리드로 한 화면에.
// (다른 스킨의 드롭다운과 같은 항목 배열을 그대로 렌더 → 기능 누락 없음)
function Launcher({ menus, onClose }: { menus: StudioMenuDef[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const needle = q.trim().toLowerCase()
  return (
    <div className="au-launcher-backdrop" onClick={onClose} role="presentation">
      <div className="au-launcher" role="dialog" aria-modal="true" aria-label="메뉴" onClick={(e) => e.stopPropagation()}>
        <div className="au-launcher-head">
          <div className="au-launcher-title"><span className="au-brand-mark">sry</span> 메뉴</div>
          <input className="au-launcher-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="명령 검색… (예: 백업, 가져오기, 분할)" aria-label="메뉴 검색" />
          <button className="au-launcher-x" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} mono /></button>
        </div>
        <div className="au-launcher-grid">
          {menus.map((m) => {
            const items = m.items.filter((it) => !it.divider && it.label && (!needle || it.label.toLowerCase().includes(needle)))
            if (!items.length) return null
            return (
              <section key={m.id} className="au-launcher-col" aria-label={m.label}>
                <h3>{m.label}</h3>
                {m.items.map((it, i) => {
                  if (it.divider) return needle ? null : <div key={i} className="au-launcher-sep" />
                  if (!it.label || (needle && !it.label.toLowerCase().includes(needle))) return null
                  return (
                    <button key={i} className="au-tile" disabled={it.disabled} onClick={() => { it.fn && it.fn(); onClose() }}>
                      <span className="au-tile-label">{it.label}</span>
                      {it.kbd && <span className="au-tile-kbd">{it.kbd}</span>}
                    </button>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Crumbs() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const item = activeId ? project.items[activeId] : null
  const crumbs = item ? pathOf(project, item.id) : []
  return (
    <div className="au-crumbs" aria-label="현재 문서 경로">
      {crumbs.length === 0 ? <span className="au-crumb au-crumb-empty">문서를 선택하세요</span> : crumbs.map((c, i) => (
        <span key={c.id} className={'au-crumb' + (i === crumbs.length - 1 ? ' au-crumb-last' : '')}>{i > 0 && <span className="au-crumb-sep">/</span>}{c.title}</span>
      ))}
    </div>
  )
}

export default function AuroraShell(p: AuroraProps) {
  const viewMode = useStore((s) => s.viewMode)
  const setView = useStore((s) => s.setView)
  const binderVisible = useStore((s) => s.binderVisible)
  const inspectorVisible = useStore((s) => s.inspectorVisible)
  const title = useStore((s) => s.project.title)
  const setProjectTitle = useStore((s) => s.setProjectTitle)
  const [launcher, setLauncher] = useState(false)
  const isNarrow = useIsNarrow(980)
  const cur = VIEWS.find((v) => v.key === viewMode) || VIEWS[0]
  const rootRef = useRef<HTMLDivElement>(null)
  // 현재 뷰 색을 CSS 변수로 — 독 활성 아이콘·스테이지 제목·레일·코르크보드 격자 강조에 쓰인다
  useEffect(() => { rootRef.current?.style.setProperty('--au-view', cur.color) }, [cur.color])
  // 오로라 첫 진입: 서랍을 닫아 캔버스(원고)만 보이게 하고, 테마가 라이트면 다크로 시작(오로라의 기본 인상).
  // 이후에는 사용자가 고른 테마(라이트/다크/세피아)와 서랍 상태를 그대로 둔다 — 테마 토글은 세 스킨 모두 동일하게 동작.
  useEffect(() => {
    try {
      if (localStorage.getItem(INTRO_KEY)) return
      localStorage.setItem(INTRO_KEY, '1')
      useStore.setState({ binderVisible: false, inspectorVisible: false })
      if (useStore.getState().project.settings.theme === 'light') useStore.getState().setTheme('dark')
    } catch { /* noop */ }
  }, [])

  const closeDrawers = () => useStore.setState({ binderVisible: false, inspectorVisible: false })

  const rail = (icon: string, label: string, onClick: () => void, o: { active?: boolean; title?: string; pressed?: boolean; onContextMenu?: (e: React.MouseEvent) => void } = {}) => (
    <button className={'au-ib' + (o.active ? ' active' : '')} onClick={onClick} onContextMenu={o.onContextMenu} title={o.title || label} aria-label={label} {...(o.pressed !== undefined ? { 'aria-pressed': o.pressed } : {})}>
      <Icon name={icon} size={24} mono strokeWidth={1.6} />
      <span className="au-ib-tx">{label}</span>
    </button>
  )

  return (
    <div className="aurora-root" ref={rootRef}>
      {/* ── 상단: 캔버스 위 타이포그래피(브랜드 · 프로젝트 제목 · 경로) + 우측 배율/디자인 전환 ── */}
      <header className="au-top">
        <button className="au-menu-launch" onClick={() => setLauncher(true)} title="메뉴 — 파일·문서·도구·보기의 모든 명령" aria-label="메뉴" aria-haspopup="dialog" aria-expanded={launcher}>
          <Icon name="menu" size={26} mono />
        </button>
        <div className="au-brand">
          <div className="au-title-row">
            <span className="au-brand-mark" aria-hidden="true">sry</span>
            <input className="au-title" value={title} onChange={(e) => setProjectTitle(e.target.value)} title="프로젝트 제목" aria-label="프로젝트 제목" />
          </div>
          <Crumbs />
        </div>
        <div className="au-top-right">
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
      </header>

      {/* ── 캔버스: 뷰(스테이지) + 유리 서랍 + 오른쪽 세로 레일 ── */}
      <div className={'au-stage-wrap' + (binderVisible ? ' binder-open' : '') + (inspectorVisible ? ' insp-open' : '') + (isNarrow ? ' narrow' : '')}>
        {(binderVisible || inspectorVisible) && isNarrow && <div className="au-drawer-backdrop" onClick={closeDrawers} aria-hidden="true" />}
        {binderVisible && (
          <aside className="au-drawer au-drawer-left" aria-label="바인더">
            <div className="au-drawer-head"><span><Icon name="binder" size={18} mono /> 바인더</span><button className="au-drawer-x" onClick={() => useStore.setState({ binderVisible: false })} aria-label="바인더 닫기"><Icon name="close" size={18} mono /></button></div>
            <div className="au-drawer-body"><Binder /></div>
          </aside>
        )}
        <main className={'au-stage' + (binderVisible && !isNarrow ? ' with-left' : '') + (inspectorVisible && !isNarrow ? ' with-right' : '')}>
          <div className="au-stage-head">
            <span className="au-stage-badge" style={{ background: cur.color }}><Icon name={cur.icon} size={20} mono /></span>
            <div className="au-stage-title"><b>{cur.label}</b><span>{cur.hint}</span></div>
            <span className="au-stage-spacer" />
            <button className={'au-chip' + (binderVisible ? ' active' : '')} onClick={p.onToggleBinder} aria-label="바인더" aria-pressed={binderVisible} title="바인더 서랍 (⌘⇧B)"><Icon name="binder" size={18} mono /><span className="au-chip-tx">바인더</span></button>
            <button className={'au-chip' + (inspectorVisible ? ' active' : '')} onClick={p.onToggleInspector} aria-label="인스펙터" aria-pressed={inspectorVisible} title="인스펙터 서랍 (⌘⇧I)"><Icon name="inspector" size={18} mono /><span className="au-chip-tx">인스펙터</span></button>
          </div>
          <div className="au-stage-body">
            {p.showFind && <FindReplaceBar onClose={() => p.setShowFind(false)} />}
            <ActiveView />
          </div>
        </main>
        {inspectorVisible && (
          <aside className="au-drawer au-drawer-right" aria-label="인스펙터">
            <div className="au-drawer-head"><span><Icon name="inspector" size={18} mono /> 인스펙터</span><button className="au-drawer-x" onClick={() => useStore.setState({ inspectorVisible: false })} aria-label="인스펙터 닫기"><Icon name="close" size={18} mono /></button></div>
            <div className="au-drawer-body"><Inspector /></div>
          </aside>
        )}

        {/* 오른쪽 세로 레일 — 인스펙터 서랍이 열리면 안쪽으로 밀려 들어온다 */}
        <aside className="au-rail" aria-label="빠른 동작">
          {rail('search', '찾기', () => p.setShowFind(!p.showFind), { active: p.showFind, pressed: p.showFind, title: '찾기/바꾸기 (⌘F)' })}
          {rail('snapshot', '스냅샷', p.onSnapshot, { title: '스냅샷 찍기(버전 저장)' })}
          {rail('split', '분할', () => { if (p.splitId) p.onCycleSplitDir(); else p.onToggleSplit() }, { active: !!p.splitId, pressed: !!p.splitId, title: p.splitId ? '분할 방향 전환 (현재: ' + (p.splitDir === 'horizontal' ? '가로' : '세로') + ' · 우클릭: 닫기)' : '편집기 분할 (⌘⇧K)', onContextMenu: (e) => { if (p.splitId) { e.preventDefault(); p.onCloseSplit() } } })}
          {rail('focus', '집중', p.onToggleComposition, { title: '집중 모드 (⌘⇧↵)' })}
          {rail(p.theme === 'dark' ? 'moon' : p.theme === 'sepia' ? 'book' : 'sun', '테마', p.onCycleTheme, { title: '테마 전환: 라이트 / 다크 / 세피아 (⌘⇧L)' })}
          {rail('palette', '명령', () => p.onOpenModal('palette'), { title: '명령 팔레트 (⌘K) — 모든 기능' })}
          <div className="au-rail-sep" />
          <button
            className={'au-save' + (p.saveError ? ' err' : p.dirty ? ' dirty' : ' ok')}
            onClick={p.onSave}
            aria-label={p.saveError ? '저장 실패 — 다시 저장' : p.dirty ? '저장' : '저장됨'}
            title={(p.saveError ? '⚠ 자동 저장 실패 — 변경분은 메모리에 보존되어 있습니다. 눌러서 다시 저장하거나 백업/내보내기를 권장합니다.' : p.dirty ? '변경사항을 저장합니다 (⌘S).' : p.lastSaved ? '저장됨 · ' + new Date(p.lastSaved).toLocaleTimeString() : '저장 (⌘S)') + '\n자동 저장이 켜져 있으면 잠시 후 자동으로도 저장됩니다.'}
          >
            <Icon name="save" size={24} mono strokeWidth={1.6} /><span className="au-ib-tx au-save-tx">{p.saveError ? '저장 실패' : p.dirty ? '저장' : '저장됨'}</span>
          </button>
        </aside>
      </div>

      {/* ── 하단 대형 컬러 독 ── */}
      <nav className="au-dock" aria-label="주요 내비게이션">
        <div className="au-dock-views" role="group" aria-label="보기">
          {VIEWS.map((v) => (
            <button key={v.key} className={'au-dock-btn' + (viewMode === v.key ? ' active' : '')} style={{ ['--c' as string]: v.color }} onClick={() => setView(v.key)} title={v.label + ' — ' + v.hint} aria-label={v.label} aria-pressed={viewMode === v.key}>
              <span className="au-dock-ico"><Icon name={v.icon} size={28} mono strokeWidth={1.6} /></span>
              <span className="au-dock-label">{v.label}</span>
            </button>
          ))}
        </div>
        <div className="au-dock-sep" />
        <div className="au-dock-tools" role="group" aria-label="도구">
          {[
            { id: 'creative', icon: 'sparkle', label: '창작 스튜디오', color: '#e0a93b' },
            { id: 'toolhub', icon: 'tools', label: '도구 허브', color: '#5b7cfa' },
            { id: 'genrebox', icon: 'generator', label: '장르 도구함', color: '#8b6dd4' },
            { id: 'compile', icon: 'compile', label: '내보내기', color: '#2fb3a6' },
            { id: 'settings', icon: 'settings', label: '설정', color: '#7a8493' },
          ].map((t) => (
            <button key={t.id} className={'au-dock-btn au-dock-tool' + (p.activeModal === t.id ? ' active' : '')} style={{ ['--c' as string]: t.color }} onClick={() => p.onOpenModal(t.id)} title={t.label} aria-label={t.label}>
              <span className="au-dock-ico"><Icon name={t.icon} size={26} mono strokeWidth={1.6} /></span>
              <span className="au-dock-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {launcher && p.menus && <Launcher menus={p.menus} onClose={() => setLauncher(false)} />}
    </div>
  )
}
