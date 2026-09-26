import type React from 'react'
import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Columns3, Lock, FileText } from 'lucide-react'
import { useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import { ContainerBar, pinContainer, useViewContainer } from './Corkboard'
import EditableText from './EditableText'

interface FlatRow {
  item: BinderItem
  depth: number
}

type ColKey =
  | 'label'
  | 'status'
  | 'section'
  | 'words'
  | 'chars'
  | 'target'
  | 'progress'
  | 'created'
  | 'modified'
  | 'include'

interface ColDef {
  key: ColKey
  name: string
  width: number
  sortable: boolean
}

const COLUMNS: ColDef[] = [
  { key: 'label', name: '라벨', width: 110, sortable: true },
  { key: 'status', name: '상태', width: 110, sortable: true },
  { key: 'section', name: '섹션', width: 100, sortable: false },
  { key: 'words', name: '단어', width: 70, sortable: true },
  { key: 'chars', name: '글자', width: 70, sortable: true },
  { key: 'target', name: '목표', width: 70, sortable: true },
  { key: 'progress', name: '진행', width: 90, sortable: true },
  { key: 'created', name: '작성일', width: 96, sortable: true },
  { key: 'modified', name: '수정일', width: 96, sortable: true },
  { key: 'include', name: '포함', width: 44, sortable: false },
]

type SortKey = ColKey | 'title' | null

const DEFAULT_COLS: Record<ColKey, boolean> = {
  label: true,
  status: true,
  section: true,
  words: true,
  chars: false,
  target: true,
  progress: true,
  created: false,
  modified: false,
  include: true,
}

function loadCols(): Record<ColKey, boolean> {
  try {
    const raw = localStorage.getItem('outliner.cols')
    if (raw) return { ...DEFAULT_COLS, ...JSON.parse(raw) }
  } catch {
    /* noop */
  }
  return { ...DEFAULT_COLS }
}

function aggWords(project: Project, id: string): number {
  const it = project.items[id]
  if (!it) return 0
  if (it.type === 'text') return it.wordCount
  return it.childIds.reduce((sum, c) => sum + aggWords(project, c), 0)
}

function aggChars(project: Project, id: string): number {
  const it = project.items[id]
  if (!it) return 0
  if (it.type === 'text') return it.charCount
  return it.childIds.reduce((sum, c) => sum + aggChars(project, c), 0)
}

function fmtDate(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getFullYear()).slice(2)}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/**
 * 빈 상태 공통 컴포넌트 — 아이콘 + 한 줄 설명 + 1차 행동(CTA) 패턴을 통일한다.
 * 여러 뷰의 제각각인 빈 상태 문구/행동유도를 일관된 톤으로 맞추기 위한 기준 컴포넌트.
 */
export function EmptyState({
  icon,
  message,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-msg">{message}</div>
      {actionLabel && onAction && (
        <button className="btn-ghost btn-emph empty-state-cta" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default function Outliner() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const selectedIds = useStore((s) => s.selectedIds)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const toggleExpanded = useStore((s) => s.toggleExpanded)
  const renameItem = useStore((s) => s.renameItem)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const setLabel = useStore((s) => s.setLabel)
  const setStatus = useStore((s) => s.setStatus)
  const setSectionType = useStore((s) => s.setSectionType)
  const setTarget = useStore((s) => s.setTarget)
  const setInclude = useStore((s) => s.setInclude)
  const moveItem = useStore((s) => s.moveItem)
  const moveRelative = useStore((s) => s.moveRelative)
  const addItem = useStore((s) => s.addItem)

  const [cols, setCols] = useState<Record<ColKey, boolean>>(loadCols)
  const [colMenu, setColMenu] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const toggleCol = (k: ColKey) => {
    const next = { ...cols, [k]: !cols[k] }
    setCols(next)
    try {
      localStorage.setItem('outliner.cols', JSON.stringify(next))
    } catch {
      /* noop */
    }
  }

  const clickSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(k)
      setSortDir(1)
    }
  }

  const labelIdx = (id: string | null) => project.labels.findIndex((l) => l.id === (id || 'label-none'))
  const statusIdx = (id: string | null) => project.statuses.findIndex((s) => s.id === (id || 'status-none'))

  const cmp = (a: BinderItem, b: BinderItem): number => {
    let r = 0
    switch (sortKey) {
      case 'title':
        r = a.title.localeCompare(b.title, 'ko')
        break
      case 'words':
        r = aggWords(project, a.id) - aggWords(project, b.id)
        break
      case 'chars':
        r = aggChars(project, a.id) - aggChars(project, b.id)
        break
      case 'target':
        r = a.target - b.target
        break
      case 'progress': {
        const pa = a.target > 0 ? aggWords(project, a.id) / a.target : 0
        const pb = b.target > 0 ? aggWords(project, b.id) / b.target : 0
        r = pa - pb
        break
      }
      case 'label':
        r = labelIdx(a.labelId) - labelIdx(b.labelId)
        break
      case 'status':
        r = statusIdx(a.statusId) - statusIdx(b.statusId)
        break
      case 'created':
        r = a.created - b.created
        break
      case 'modified':
        r = a.modified - b.modified
        break
      default:
        r = 0
    }
    return r * sortDir
  }

  const flatten = (containerId: string): FlatRow[] => {
    const rows: FlatRow[] = []
    const walk = (id: string, depth: number) => {
      const it = project.items[id]
      if (!it) return
      rows.push({ item: it, depth })
      if (it.expanded) {
        let kids = it.childIds.map((c) => project.items[c]).filter(Boolean)
        if (sortKey) kids = [...kids].sort(cmp)
        kids.forEach((k) => walk(k.id, depth + 1))
      }
    }
    let top = (project.items[containerId]?.childIds || []).map((c) => project.items[c]).filter(Boolean)
    if (sortKey) top = [...top].sort(cmp)
    top.forEach((k) => walk(k.id, 0))
    return rows
  }

  const containerId = useViewContainer(project, activeId)
  const rows = flatten(containerId)
  const rowOrder = rows.map((r) => r.item.id)
  const visibleCols = COLUMNS.filter((c) => cols[c.key])
  const colCount = 1 + visibleCols.length

  const sortArrow = (k: SortKey) => (sortKey === k ? (sortDir === 1 ? ' ▲' : ' ▼') : '')

  // ↑/↓ 키보드 순회 시 선택 이동과 함께 DOM 포커스도 해당 행으로 옮긴다(스크롤 동기화 포함).
  const tableRef = useRef<HTMLTableElement | null>(null)
  const focusRow = (idx: number) => {
    const el = tableRef.current?.querySelector<HTMLElement>(`tr[data-row-index="${idx}"]`)
    if (el) {
      el.focus()
      el.scrollIntoView({ block: 'nearest' })
    }
  }
  // 행 선택은 '선택만' — 하위 폴더/문서를 선택해도 아웃라이너가 그 항목 기준으로 재루팅되지 않게 pin.
  const selectRow = (id: string, opts?: { additive?: boolean; range?: boolean }) => {
    pinContainer(containerId, id)
    select(id, { ...opts, order: rowOrder })
  }

  return (
    <div className="outliner">
      <ContainerBar />
      <div className="outliner-bar">
        <button
          className={'btn-ghost' + (sortKey ? ' btn-emph' : '')}
          onClick={() => clickSort(null)}
          disabled={!sortKey}
          title="정렬 해제(수동 순서로 되돌려 드래그·Alt+화살표 이동을 다시 사용)"
        >
          정렬 해제
        </button>
        {sortKey && (
          <span
            style={{ color: 'var(--warn)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="정렬을 적용하면 화면 순서와 수동(바인더) 순서가 달라, 드래그·Alt+화살표 순서 이동이 잠깁니다. ‘정렬 해제’를 누르면 다시 이동할 수 있어요."
          >
            <Lock size={12} /> 정렬 중 — 수동 순서 이동 잠금
          </span>
        )}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button className="btn-ghost" onClick={() => setColMenu((v) => !v)} title="컬럼 표시 선택">
            <Columns3 size={14} /> 컬럼
          </button>
          {colMenu && (
            <>
              <div className="menu-overlay" onClick={() => setColMenu(false)} />
              <div className="col-menu">
                {COLUMNS.map((c) => (
                  <label key={c.key} className="col-menu-item">
                    <input type="checkbox" checked={cols[c.key]} onChange={() => toggleCol(c.key)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <table ref={tableRef}>
        <thead>
          <tr>
            <th style={{ minWidth: 240, cursor: 'pointer' }} onClick={() => clickSort('title')}>
              제목 &amp; 시놉시스{sortArrow('title')}
            </th>
            {visibleCols.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, cursor: c.sortable ? 'pointer' : 'default' }}
                onClick={() => c.sortable && clickSort(c.key)}
              >
                {c.name}
                {sortArrow(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colCount} style={{ padding: 0 }}>
                <EmptyState
                  icon={<FileText size={28} />}
                  message="이 폴더에 항목이 없습니다."
                  actionLabel="+ 문서 만들기"
                  onAction={() => addItem('text', containerId)}
                />
              </td>
            </tr>
          )}
          {rows.map(({ item, depth }, ri) => {
            const label = project.labels.find((l) => l.id === item.labelId)
            const words = aggWords(project, item.id)
            const chars = aggChars(project, item.id)
            const pct = item.target > 0 ? Math.min(100, Math.round((words / item.target) * 100)) : 0
            const hasChildren = item.childIds.length > 0
            return (
              <tr
                key={item.id}
                className={selectedIds.includes(item.id) ? 'selected' : ''}
                draggable={!sortKey}
                tabIndex={0}
                data-row-index={ri}
                onClick={(e) => selectRow(item.id, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey })}
                onKeyDown={(e) => {
                  const t = e.target as HTMLElement
                  // 인라인 편집(제목/시놉시스)·셀 입력(select/number) 중에는 행 키 내비를 가로채지 않는다.
                  if (
                    t !== e.currentTarget &&
                    (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
                  )
                    return
                  // Alt+↑/↓ 로 형제 간 순서 이동(정렬 해제 상태에서만 의미)
                  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    // 정렬(sortKey) 걸린 상태에서는 화면 순서와 수동순서가 달라
                    // 보이지 않게 순서가 바뀌므로 차단(드래그 경로와 동일한 가드)
                    if (sortKey) {
                      e.preventDefault()
                      return
                    }
                    e.preventDefault()
                    moveRelative(item.id, e.key === 'ArrowUp' ? -1 : 1)
                    return
                  }
                  // ↑/↓ 행 순회: 선택 이동(Shift=범위 확장) + 포커스/스크롤 동기화
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = e.key === 'ArrowUp' ? ri - 1 : ri + 1
                    if (next < 0 || next >= rows.length) return
                    selectRow(rowOrder[next], { range: e.shiftKey })
                    focusRow(next)
                    return
                  }
                  // Enter = 에디터로 열기(컨테이너 pin 유지 — 돌아왔을 때 같은 폴더 목록 보존)
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    pinContainer(containerId, item.id)
                    select(item.id)
                    setView('editor')
                  }
                }}
                onDragStart={(e) => {
                  if (sortKey) return
                  e.dataTransfer.setData('text/scriv-id', item.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (sortKey || !e.dataTransfer.types.includes('text/scriv-id')) return
                  e.preventDefault()
                  // 자기 자손 위로는 드롭 불가(순환 방지) — 드롭존을 시각적으로 막아 무반응 오인 방지
                  e.dataTransfer.dropEffect = item.parentId ? 'move' : 'none'
                }}
                onDrop={(e) => {
                  if (sortKey) return
                  e.preventDefault()
                  const dragId = e.dataTransfer.getData('text/scriv-id')
                  if (!dragId || dragId === item.id || !item.parentId) return
                  // 다른 폴더로 끌어다 놓으면 부모 변경을 허용(바인더 드래그와 동일).
                  // moveItem 이 자기 자손으로의 이동 등 불가 케이스를 자체 가드한다.
                  const siblings = project.items[item.parentId].childIds
                  moveItem(dragId, item.parentId, siblings.indexOf(item.id))
                }}
              >
                <td>
                  <div className="ol-title" style={{ paddingLeft: depth * 16 }}>
                    <span
                      style={{ width: 14, cursor: hasChildren ? 'pointer' : 'default' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (hasChildren) toggleExpanded(item.id)
                      }}
                    >
                      {hasChildren ? (
                        item.expanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )
                      ) : null}
                    </span>
                    <EditableText
                      value={item.title}
                      stopClick
                      style={{ fontWeight: item.type === 'folder' ? 600 : 400, outline: 'none', flex: 1 }}
                      onCommit={(v) => renameItem(item.id, v || item.title)}
                    />
                  </div>
                  <EditableText
                    className="ol-syn"
                    value={item.synopsis}
                    stopClick
                    style={{ paddingLeft: depth * 16 + 18, outline: 'none' }}
                    onCommit={(v) => setSynopsis(item.id, v)}
                  />
                </td>
                {cols.label && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="field"
                      aria-label="라벨"
                      value={item.labelId || 'label-none'}
                      onChange={(e) => setLabel(item.id, e.target.value === 'label-none' ? null : e.target.value)}
                      style={label && item.labelId !== 'label-none' ? { borderLeft: `4px solid ${label.color}` } : undefined}
                    >
                      {project.labels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {cols.status && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="field"
                      aria-label="상태"
                      value={item.statusId || 'status-none'}
                      onChange={(e) => setStatus(item.id, e.target.value === 'status-none' ? null : e.target.value)}
                    >
                      {project.statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {cols.section && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="field"
                      aria-label="섹션 타입"
                      value={item.sectionTypeId || ''}
                      onChange={(e) => setSectionType(item.id, e.target.value || null)}
                    >
                      <option value="">—</option>
                      {project.sectionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {cols.words && <td className="num">{words.toLocaleString()}</td>}
                {cols.chars && <td className="num">{chars.toLocaleString()}</td>}
                {cols.target && (
                  <td className="num" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      aria-label="단어 목표"
                      value={item.target}
                      onChange={(e) => setTarget(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ width: 56, border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px' }}
                    />
                  </td>
                )}
                {cols.progress && (
                  <td>
                    {item.target > 0 && (
                      <span
                        className={'progress' + (pct >= 100 ? ' ok' : '')}
                        style={{ width: 80 }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`진행률 ${pct}%`}
                      >
                        <span style={{ width: pct + '%' }} />
                      </span>
                    )}
                  </td>
                )}
                {cols.created && <td className="num">{fmtDate(item.created)}</td>}
                {cols.modified && <td className="num">{fmtDate(item.modified)}</td>}
                {cols.include && (
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="컴파일에 포함"
                      checked={item.includeInCompile}
                      onChange={(e) => setInclude(item.id, e.target.checked)}
                    />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
