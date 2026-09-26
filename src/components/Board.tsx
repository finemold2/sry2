import { useState } from 'react'
import { useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import { ContainerBar, pinContainer, useViewContainer } from './Corkboard'
import EditableText from './EditableText'

type GroupBy = 'status' | 'label'

// 컨테이너(현재 폴더) 하위의 텍스트 문서를 바인더 순서대로 모은다(재귀).
function gatherDocs(project: Project, containerId: string): BinderItem[] {
  const out: BinderItem[] = []
  const walk = (id: string) => {
    const it = project.items[id]
    if (!it) return
    if (it.type === 'text') out.push(it)
    it.childIds.forEach(walk)
  }
  ;(project.items[containerId]?.childIds || []).forEach(walk)
  return out
}

function lsGet(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function BoardCard({
  item,
  groupBy,
  order,
  colId,
  containerId,
  onDropped,
}: {
  item: BinderItem
  groupBy: GroupBy
  order: string[]
  colId: string
  containerId: string
  /** 카드 위 드롭이 컬럼 onDrop 을 stopPropagation 으로 막으므로, 컬럼 하이라이트 해제를 콜백으로 통지(리뷰 F13). */
  onDropped?: () => void
}) {
  const project = useStore((s) => s.project)
  const selectedIds = useStore((s) => s.selectedIds)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const renameItem = useStore((s) => s.renameItem)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const setStatus = useStore((s) => s.setStatus)
  const setLabel = useStore((s) => s.setLabel)
  const moveItem = useStore((s) => s.moveItem)
  const [over, setOver] = useState(false)

  const label = project.labels.find((l) => l.id === item.labelId)
  const status = project.statuses.find((s) => s.id === item.statusId)
  const selected = selectedIds.includes(item.id)

  return (
    <div
      className={'board-card' + (selected ? ' selected' : '') + (over ? ' drag-over' : '')}
      draggable
      onClick={(e) => {
        // 하위 폴더 문서를 클릭해도 보드가 그 폴더로 재루팅되지 않게 컨테이너를 고정(선택만).
        pinContainer(containerId, item.id)
        select(item.id, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey, order })
      }}
      onDoubleClick={() => {
        pinContainer(containerId, item.id)
        select(item.id)
        setView('editor')
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/scriv-id', item.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('text/scriv-id')) return
        // stopPropagation 하지 않음 — 컬럼 onDragOver 도 함께 발동해 드롭 대상 컬럼이 하이라이트된다.
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes('text/scriv-id')) return
        e.preventDefault()
        e.stopPropagation() // 컬럼 onDrop 과의 이중 처리 방지
        onDropped?.() // 컬럼 drag-over 하이라이트 즉시 해제(리뷰 F13)
        setOver(false)
        const dragId = e.dataTransfer.getData('text/scriv-id')
        if (!dragId || dragId === item.id) return
        const dragged = project.items[dragId]
        if (!dragged) return
        // 카드 '위' 드롭도 그 컬럼으로 이동으로 처리(빈 영역 전용이던 컬럼 이동을 카드 위까지 확장).
        const noneId = groupBy === 'status' ? 'status-none' : 'label-none'
        const dragKey = groupBy === 'status' ? dragged.statusId || 'status-none' : dragged.labelId || 'label-none'
        if (dragKey !== colId) {
          const value = colId === noneId ? null : colId
          if (groupBy === 'status') setStatus(dragId, value)
          else setLabel(dragId, value)
        }
        // 같은 부모(형제)면 대상 카드 앞으로 바인더 순서도 이동.
        if (!item.parentId || dragged.parentId !== item.parentId) return
        const siblings = project.items[item.parentId]?.childIds || []
        const targetIdx = siblings.indexOf(item.id)
        if (targetIdx < 0) return
        moveItem(dragId, item.parentId, targetIdx)
      }}
    >
      {label && item.labelId !== 'label-none' && <span className="board-card-dot" style={{ background: label.color }} />}
      <EditableText className="board-card-title" value={item.title} stopClick onCommit={(v) => renameItem(item.id, v || item.title)} />
      <EditableText
        className="board-card-syn"
        value={item.synopsis}
        placeholder="줄거리…"
        stopClick
        onCommit={(v) => setSynopsis(item.id, v)}
      />
      {/* 그룹 기준이 아닌 다른 메타를 작게 표시 */}
      {groupBy === 'status'
        ? label && item.labelId !== 'label-none' && <span className="board-card-meta">{label.name}</span>
        : status && item.statusId !== 'status-none' && <span className="board-card-meta">{status.name}</span>}
    </div>
  )
}

export default function Board() {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const setStatus = useStore((s) => s.setStatus)
  const setLabel = useStore((s) => s.setLabel)
  const addItem = useStore((s) => s.addItem)
  const [groupBy, setGroupBy] = useState<GroupBy>(() => (lsGet('board.groupBy', 'status') as GroupBy))
  const [dragOver, setDragOver] = useState<string | null>(null)

  const setGroupByP = (v: GroupBy) => {
    setGroupBy(v)
    try {
      localStorage.setItem('board.groupBy', v)
    } catch {
      /* noop */
    }
  }

  const containerId = useViewContainer(project, activeId)
  const docs = gatherDocs(project, containerId)

  const columns =
    groupBy === 'status'
      ? project.statuses.map((s) => ({ id: s.id, name: s.name, color: 'var(--muted)' }))
      : project.labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))
  const noneId = groupBy === 'status' ? 'status-none' : 'label-none'
  const keyOf = (it: BinderItem) => (groupBy === 'status' ? it.statusId || 'status-none' : it.labelId || 'label-none')

  const drop = (colId: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/scriv-id')
    if (!id || !project.items[id]) return
    const value = colId === noneId ? null : colId
    if (groupBy === 'status') setStatus(id, value)
    else setLabel(id, value)
  }

  const addTo = (colId: string) => {
    const id = addItem('text', containerId)
    if (colId !== noneId) {
      if (groupBy === 'status') setStatus(id, colId)
      else setLabel(id, colId)
    }
  }

  return (
    <div className="board-wrap">
      <ContainerBar />
      <div className="board-toolbar">
        <label>
          그룹{' '}
          <select className="field" value={groupBy} onChange={(e) => setGroupByP(e.target.value as GroupBy)}>
            <option value="status">상태별</option>
            <option value="label">라벨별</option>
          </select>
        </label>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
          {docs.length}개 문서 · 카드를 끌어 {groupBy === 'status' ? '상태' : '라벨'} 변경
        </span>
      </div>
      <div className="board">
        {columns.map((col) => {
          const cards = docs.filter((d) => keyOf(d) === col.id)
          const colOrder = cards.map((c) => c.id)
          return (
            <div
              key={col.id}
              className={'board-col' + (dragOver === col.id ? ' drag-over' : '')}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('text/scriv-id')) {
                  e.preventDefault()
                  setDragOver(col.id)
                }
              }}
              onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
              onDrop={(e) => drop(col.id, e)}
            >
              <div className="board-col-head">
                <span className="board-col-dot" style={{ background: col.color }} />
                <span className="board-col-name">{col.name}</span>
                <span className="board-col-count">{cards.length}</span>
                <button className="board-col-add" title="이 칸에 새 문서" onClick={() => addTo(col.id)}>
                  +
                </button>
              </div>
              <div className="board-col-body">
                {cards.map((c) => (
                  <BoardCard key={c.id} item={c} groupBy={groupBy} order={colOrder} colId={col.id} containerId={containerId} onDropped={() => setDragOver(null)} />
                ))}
                {cards.length === 0 && <div className="board-col-empty">비어 있음</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
