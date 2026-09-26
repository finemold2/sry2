import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  File as FileIcon,
  FileImage,
  FileText,
  FileType,
  Flag,
  Folder,
  FolderOpen,
  Heart,
  Inbox,
  Lightbulb,
  MapPin,
  Search,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { childrenOf, flattenAll, flattenVisible, isInTrash, pathOf, useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import { searchProject } from '../search/search'
import { Icon } from '../ui/icons'

type DropPos = 'before' | 'after' | 'into'

interface MenuState {
  x: number
  y: number
  id: string
}

function iconFor(item: BinderItem, expanded: boolean) {
  if (item.root === 'trash') return <Trash2 size={15} />
  if (item.root === 'research') return <Inbox size={15} />
  if (item.type === 'folder') return expanded ? <FolderOpen size={15} /> : <Folder size={15} />
  if (item.type === 'image') return <FileImage size={15} />
  if (item.type === 'pdf') return <FileType size={15} />
  if (item.type === 'file') return <FileIcon size={15} />
  if (item.type === 'character') return item.character?._kind === 'setting' ? <MapPin size={15} /> : <User size={15} />
  // 사용자 지정 아이콘
  switch (item.icon) {
    case 'character':
      return <User size={15} />
    case 'place':
      return <MapPin size={15} />
    case 'star':
      return <Star size={15} />
    case 'heart':
      return <Heart size={15} />
    case 'book':
      return <BookOpen size={15} />
    case 'flag':
      return <Flag size={15} />
    case 'idea':
      return <Lightbulb size={15} />
  }
  return <FileText size={15} />
}

function descendantCount(p: Project, id: string): number {
  let n = 0
  const walk = (cid: string) => {
    const it = p.items[cid]
    if (!it) return
    n++
    it.childIds.forEach(walk)
  }
  p.items[id]?.childIds.forEach(walk)
  return n
}

// 앱 공용 토스트(App 의 'scriv:flash' 리스너 재사용) — 일괄 작업 완료 안내용.
const flash = (m: string) => {
  try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m })) } catch { /* noop */ }
}

// id 가 ancestorId 의 자손인지(부모 체인 상향 탐색) — 자기 자손 안으로의 이동을 사전에 걸러낸다.
function isDescendantOf(p: Project, ancestorId: string, id: string): boolean {
  let cur = p.items[id]?.parentId ?? null
  while (cur) {
    if (cur === ancestorId) return true
    cur = p.items[cur]?.parentId ?? null
  }
  return false
}

// 선택 목록에서 '조상이 함께 선택된 항목'을 제외한 최상위만 남긴다.
// (조상을 옮기면 자손은 자동으로 따라가므로 — 일괄 이동/휴지통행 시 중복 적용 방지)
function topLevelSelection(p: Project, ids: string[]): string[] {
  const set = new Set(ids)
  return ids.filter((id) => {
    let cur = p.items[id]?.parentId ?? null
    while (cur) {
      if (set.has(cur)) return false
      cur = p.items[cur]?.parentId ?? null
    }
    return true
  })
}

function Row({
  item,
  depth,
  onMenu,
}: {
  item: BinderItem
  depth: number
  onMenu: (m: MenuState) => void
}) {
  const project = useStore((s) => s.project)
  const selectedIds = useStore((s) => s.selectedIds)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const toggleExpanded = useStore((s) => s.toggleExpanded)
  const renameItem = useStore((s) => s.renameItem)
  const moveItem = useStore((s) => s.moveItem)
  const moveToTrash = useStore((s) => s.moveToTrash)
  const moveRelative = useStore((s) => s.moveRelative)
  const renameId = useStore((s) => s.renameId)
  const setRenameId = useStore((s) => s.setRenameId)

  const [editing, setEditing] = useState(false)
  const [dropPos, setDropPos] = useState<DropPos | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const children = childrenOf(project, item.id)
  const hasChildren = children.length > 0
  const selected = selectedIds.includes(item.id)
  const isActive = activeId === item.id
  const labels = project.labels
  const label = labels.find((l) => l.id === item.labelId)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // 새로 추가됐거나 '이름 바꾸기'가 요청된 항목이면 즉시 인라인 편집 시작(파일명 입력 유도) 후 신호 비움.
  useEffect(() => {
    if (renameId === item.id) {
      setEditing(true)
      setRenameId(null)
    }
  }, [renameId, item.id, setRenameId])

  // 키보드 내비게이션으로 활성 항목이 바뀌면 해당 행으로 포커스를 옮긴다.
  // (편집 중·검색 입력 중이 아닐 때만 — 마우스/타이핑 흐름을 가로채지 않도록 document.activeElement 가
  //  이미 다른 바인더 행일 때로 한정한다.)
  useEffect(() => {
    if (!isActive || editing) return
    const ae = document.activeElement as HTMLElement | null
    if (ae && ae !== rowRef.current && ae.classList?.contains('binder-row')) {
      rowRef.current?.focus()
    }
  }, [isActive, editing])

  const commitRename = (v: string) => {
    const t = v.trim()
    if (t) renameItem(item.id, t)
    setEditing(false)
  }

  // ----- 키보드 내비게이션 -----
  // flattenVisible 기준 이전/다음 항목으로 선택을 옮긴다(접힌 폴더의 자식은 건너뜀).
  const moveSelection = (dir: -1 | 1) => {
    const order = flattenVisible(project)
    const i = order.indexOf(item.id)
    if (i < 0) return
    const j = i + dir
    if (j < 0 || j >= order.length) return
    select(order[j])
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (e.altKey && !item.root) moveRelative(item.id, 1)
        else moveSelection(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (e.altKey && !item.root) moveRelative(item.id, -1)
        else moveSelection(-1)
        break
      case 'ArrowRight':
        // Alt 조합은 App 전역(앞으로 내비)에만 맡긴다 — 여기서 처리·차단하지 않고 버블링시켜 이중 동작을 막는다.
        if (e.altKey) break
        e.preventDefault()
        e.stopPropagation() // 비-Alt 펼치기/자식이동은 바인더 전용 — window 핸들러로 새지 않게 차단
        if (hasChildren && !item.expanded) toggleExpanded(item.id)
        else if (hasChildren && item.expanded) moveSelection(1) // 펼쳐져 있으면 첫 자식으로
        break
      case 'ArrowLeft':
        // Alt 조합은 App 전역(뒤로 내비)에만 맡긴다 — 여기서 처리·차단하지 않고 버블링시킨다.
        if (e.altKey) break
        e.preventDefault()
        e.stopPropagation() // 비-Alt 접기/부모이동은 바인더 전용 — window 핸들러로 새지 않게 차단
        if (hasChildren && item.expanded) toggleExpanded(item.id)
        else if (item.parentId && project.items[item.parentId]) select(item.parentId) // 부모로 이동
        break
      case 'Enter':
        e.preventDefault()
        // 폴더는 펼치기/접기, 그 외(글 등)는 에디터로 열기
        if (item.type === 'folder' || item.root) {
          if (hasChildren) toggleExpanded(item.id)
        } else {
          select(item.id)
          setView('editor')
        }
        break
      case ' ':
        e.preventDefault()
        select(item.id, { additive: e.ctrlKey || e.metaKey })
        break
      case 'F2':
        e.preventDefault()
        if (!item.root && !isInTrash(project, item.id)) setEditing(true)
        break
      case 'Delete':
        // 오삭제 위험을 줄이려 휴지통 이동은 Delete 키로만 한정(Backspace 미바인딩).
        if (!item.root && !isInTrash(project, item.id)) {
          e.preventDefault()
          e.stopPropagation()
          // 이 행이 다중 선택의 일원이면 선택 전체(휴지통 밖·비루트)를 일괄 대상으로, 아니면 단일 대상.
          // 조상이 함께 선택된 자손은 제외(조상과 함께 이동)하고 표시 순서로 정렬해 휴지통 순서를 보존한다.
          const base = selectedIds.includes(item.id) ? selectedIds : [item.id]
          const eligible = base.filter((id) => {
            const it = project.items[id]
            return !!it && !it.root && !isInTrash(project, id)
          })
          const all = flattenAll(project)
          const targets = topLevelSelection(project, eligible).sort((a, b) => all.indexOf(a) - all.indexOf(b))
          if (!targets.length) break
          // 키보드 삭제도 컨텍스트메뉴와 동일하게: 하위 항목이 딸려 가면 확인을 받는다.
          const extra = targets.reduce((n, id) => n + descendantCount(project, id), 0)
          if (extra > 0) {
            const msg = targets.length > 1
              ? `선택한 ${targets.length}개 항목과 하위 항목 ${extra}개를 함께 휴지통으로 옮깁니다. 계속할까요?`
              : `'${project.items[targets[0]]?.title || '폴더'}'와(과) 하위 항목 ${extra}개를 함께 휴지통으로 옮깁니다. 계속할까요?`
            if (!window.confirm(msg)) break
          }
          // 삭제 후 포커스가 사라지지 않도록, 삭제 전에 flattenVisible 기준 이어받을 항목(다음→없으면 이전)을 계산해 둔다.
          // 함께 휴지통으로 가는 서브트리 전체(대상+자손)는 후보에서 제외한다.
          const trashing = new Set<string>()
          const gather = (cid: string) => {
            trashing.add(cid)
            project.items[cid]?.childIds.forEach(gather)
          }
          targets.forEach(gather)
          const order = flattenVisible(project)
          const idx = order.indexOf(item.id)
          let nextFocus: string | undefined
          if (idx >= 0) {
            for (let k = idx + 1; k < order.length; k++) {
              if (!trashing.has(order[k])) { nextFocus = order[k]; break }
            }
            if (!nextFocus) {
              for (let k = idx - 1; k >= 0; k--) {
                if (!trashing.has(order[k])) { nextFocus = order[k]; break }
              }
            }
          }
          targets.forEach((id) => moveToTrash(id))
          if (targets.length > 1) flash(`${targets.length}개를 휴지통으로 옮겼습니다.`)
          if (nextFocus) select(nextFocus)
        }
        break
    }
  }

  // ----- 드래그 -----
  const onDragStart = (e: React.DragEvent) => {
    if (item.root) {
      e.preventDefault()
      return
    }
    // 다중 선택의 일원을 끌면 선택 전체가 함께 이동한다(조상이 선택된 자손은 제외, 표시 순서 유지).
    let dragIds = [item.id]
    if (selectedIds.length > 1 && selectedIds.includes(item.id)) {
      const eligible = selectedIds.filter((id) => {
        const it = project.items[id]
        return !!it && !it.root
      })
      const all = flattenAll(project)
      const tops = topLevelSelection(project, eligible).sort((a, b) => all.indexOf(a) - all.indexOf(b))
      if (tops.length > 1) dragIds = tops
    }
    e.dataTransfer.setData('text/scriv-id', item.id)
    if (dragIds.length > 1) {
      // 다중 페이로드는 별도 타입으로 실어 캔버스 등 기존 'text/scriv-id'(단일) 소비처와 호환을 유지한다.
      e.dataTransfer.setData('text/scriv-ids', JSON.stringify(dragIds))
      // 드래그 고스트에 'N개 항목' 배지(스타일 인라인, 페인트 직후 제거).
      try {
        const g = document.createElement('div')
        g.textContent = `${dragIds.length}개 항목`
        g.style.cssText =
          'position:fixed;top:-1000px;left:-1000px;padding:4px 10px;border-radius:6px;' +
          'background:var(--accent, #4a76d4);color:#fff;font-size:12px;font-weight:600;pointer-events:none;'
        document.body.appendChild(g)
        e.dataTransfer.setDragImage(g, 14, 14)
        setTimeout(() => g.remove(), 0)
      } catch { /* 고스트 실패는 드래그 기능에 영향 없음 */ }
    }
    // copyMove: 바인더 내 재배치(move) + 캔버스로 카드 추가(copy) 모두 허용
    e.dataTransfer.effectAllowed = 'copyMove'
  }
  const computePos = (e: React.DragEvent): DropPos => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    if (item.type === 'folder' || item.root) {
      if (y < h * 0.28) return 'before'
      if (y > h * 0.72) return 'after'
      return 'into'
    }
    return y < h * 0.5 ? 'before' : 'after'
  }
  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/scriv-id')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropPos(computePos(e))
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/scriv-id')
    setDropPos(null)
    if (!dragId || dragId === item.id) return
    // 다중 선택 드래그면 'text/scriv-ids'(표시 순 정렬)에 전체 id 가 실려 온다 — 파싱 실패 시 단일 폴백.
    let dragIds = [dragId]
    const multi = e.dataTransfer.getData('text/scriv-ids')
    if (multi) {
      try {
        const arr = JSON.parse(multi) as unknown
        if (Array.isArray(arr) && arr.length > 0 && arr.every((x) => typeof x === 'string')) dragIds = arr as string[]
      } catch { /* 단일 폴백 */ }
    }
    if (dragIds.includes(item.id)) return // 드롭 대상이 끌던 묶음 자신이면 제자리 취급(무시)
    // 휴지통(루트 또는 하위)으로 끌어다 놓으면 originalParentId 가 보존되도록 moveToTrash 로 위임(복원이 원위치로 가게).
    if (item.root === 'trash' || isInTrash(project, item.id)) {
      const outside = dragIds.filter((id) => project.items[id] && !isInTrash(project, id))
      if (outside.length) {
        outside.forEach((id) => moveToTrash(id))
        if (outside.length > 1) flash(`${outside.length}개를 휴지통으로 옮겼습니다.`)
        return
      }
      // 전부 이미 휴지통 안이면 휴지통 내부 재배치로 계속 진행(기존 단일 드래그 동작과 동일).
    }
    const pos = computePos(e)
    // 순차 이동: 매번 최신 스토어 상태에서 '직전에 놓은 항목 바로 뒤' 인덱스를 재계산해 상대 순서를 보존한다.
    // (moveItem 은 드래그 항목이 아직 포함된 원본 childIds 기준 인덱스를 받아 내부에서 detach 보정 — 기존 계약 재사용)
    let anchorId: string | null = null
    let moved = 0
    for (const id of dragIds) {
      const p = useStore.getState().project
      if (!p.items[id] || id === item.id) continue
      if (pos === 'into' || !item.parentId) {
        // 폴더 안으로(into), 또는 루트 행 옆은 이동 불가 → 루트 안(맨 앞) 삽입.
        if (isDescendantOf(p, id, item.id)) continue // 자기 자손 안으로는 불가 — moveItem 가드와 동일 기준으로 선별
        const kids = p.items[item.id]?.childIds ?? []
        const ai = anchorId ? kids.indexOf(anchorId) : -1
        const idx = ai >= 0 ? ai + 1 : pos === 'into' ? kids.length : 0
        moveItem(id, item.id, idx)
      } else {
        const parentId = item.parentId
        if (id === parentId || isDescendantOf(p, id, parentId)) continue
        const siblings = p.items[parentId]?.childIds ?? []
        const ai = anchorId ? siblings.indexOf(anchorId) : -1
        let idx: number
        if (ai >= 0) idx = ai + 1
        else {
          idx = siblings.indexOf(item.id)
          if (pos === 'after') idx += 1
        }
        moveItem(id, parentId, idx)
      }
      anchorId = id
      moved += 1
    }
    if (dragIds.length > 1 && moved > 0) flash(`${moved}개 항목을 이동했습니다.`)
  }

  // 폴더(또는 루트)는 어디를 더블클릭해도 펼치기/접기(탐색기·Scrivener 관습).
  // 글(텍스트 등)은 더블클릭으로 에디터에서 연다. 이름 편집은 F2/우클릭 메뉴로만.
  const onDoubleClick = () => {
    if (item.type === 'folder' || item.root) {
      if (hasChildren) toggleExpanded(item.id)
    } else if (!item.root) {
      select(item.id)
      setView('editor')
    }
  }

  return (
    <>
      <div
        ref={rowRef}
        className={
          'binder-row' +
          (selected ? ' selected' : '') +
          (dropPos === 'into' ? ' drop-into' : '') +
          (dropPos === 'before' ? ' drop-before' : '') +
          (dropPos === 'after' ? ' drop-after' : '')
        }
        style={{ paddingLeft: 8 + depth * 14 }}
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={selected}
        aria-expanded={hasChildren ? item.expanded : undefined}
        aria-label={item.title || (item.type === 'folder' ? '폴더' : '글')}
        tabIndex={isActive ? 0 : -1}
        draggable={!item.root}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={() => setDropPos(null)}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        onClick={(e) =>
          select(item.id, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey })
        }
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          // 다중 선택이 유지된 채 우클릭하면 일괄 작업이 가능하도록, 우클릭 항목이 이미 선택돼 있으면 선택을 보존한다.
          if (!selectedIds.includes(item.id)) select(item.id)
          onMenu({ x: e.clientX, y: e.clientY, id: item.id })
        }}
      >
        <span
          className="disclosure"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpanded(item.id)
          }}
        >
          {hasChildren ? item.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : ''}
        </span>
        <span className="binder-icon" style={label ? { color: label.color } : undefined}>
          {iconFor(item, item.expanded)}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className="binder-rename"
            defaultValue={item.title}
            aria-label="이름 변경"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commitRename((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <>
            <span className="binder-title">{item.title}</span>
            {label && item.labelId !== 'label-none' && (
              <span className="label-dot" style={{ background: label.color }} />
            )}
            {item.type === 'folder' && hasChildren && (
              <span className="binder-count" title={`하위 항목 ${descendantCount(project, item.id)}개(자손 전체)`}>
                {descendantCount(project, item.id)}
              </span>
            )}
          </>
        )}
      </div>
      {item.expanded &&
        children.map((c) => <Row key={c.id} item={c} depth={depth + 1} onMenu={onMenu} />)}
    </>
  )
}

function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const project = useStore((s) => s.project)
  const addItem = useStore((s) => s.addItem)
  const moveToTrash = useStore((s) => s.moveToTrash)
  const emptyTrash = useStore((s) => s.emptyTrash)
  const deleteForever = useStore((s) => s.deleteForever)
  const duplicateItem = useStore((s) => s.duplicateItem)
  const convertType = useStore((s) => s.convertType)
  const setRenameId = useStore((s) => s.setRenameId)
  const setLabel = useStore((s) => s.setLabel)
  const setStatus = useStore((s) => s.setStatus)
  const toggleKeyword = useStore((s) => s.toggleKeyword)

  const selectedIds = useStore((s) => s.selectedIds)
  const groupSelection = useStore((s) => s.groupSelection)
  const mergeDocuments = useStore((s) => s.mergeDocuments)
  const ungroup = useStore((s) => s.ungroup)
  const restoreFromTrash = useStore((s) => s.restoreFromTrash)

  // 일괄 작업 대상: 현재 선택 중 실제 존재하고 휴지통 밖인 문서들(없으면 우클릭 항목 단독).
  const targetIds = (() => {
    const base = selectedIds.includes(menu.id) ? selectedIds : [menu.id]
    return base.filter((id) => project.items[id] && !isInTrash(project, id) && !project.items[id]?.root)
  })()
  // 휴지통행 일괄 대상: 조상이 함께 선택된 자손은 제외(조상 이동 시 자동 동행 — 중복 처리 방지).
  const trashTargets = topLevelSelection(project, targetIds)

  const item = project.items[menu.id]
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: menu.x, y: menu.y })

  // 메뉴가 화면 아래/오른쪽 밖으로 잘리지 않도록 실측 후 뷰포트 안으로 클램프.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    // 우측 끝에서 fixed 요소가 shrink-to-fit 으로 좁게 측정되는 것을 막기 위해 원점에서 자연 크기를 잰다.
    el.style.left = '0px'
    el.style.top = '0px'
    const r = el.getBoundingClientRect()
    const M = 8
    const x = Math.max(M, Math.min(menu.x, window.innerWidth - r.width - M))
    const y = Math.max(M, Math.min(menu.y, window.innerHeight - r.height - M))
    // setPos 값이 이전과 같아 리렌더가 생략돼도 원점에 남지 않도록 DOM 에도 직접 반영한다.
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    setPos({ x, y })
  }, [menu.x, menu.y, menu.id])

  useEffect(() => {
    const h = () => onClose()
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('click', h)
    window.addEventListener('blur', h)
    window.addEventListener('keydown', k)
    return () => {
      window.removeEventListener('click', h)
      window.removeEventListener('blur', h)
      window.removeEventListener('keydown', k)
    }
  }, [onClose])
  if (!item) return null

  const inTrash = (() => {
    let cur: string | null = item.id
    while (cur) {
      if (project.items[cur]?.root === 'trash') return true
      cur = project.items[cur]?.parentId ?? null
    }
    return false
  })()

  const A = (label: string, fn: () => void, cls = '') => (
    <button
      className={cls}
      onClick={(e) => {
        e.stopPropagation()
        fn()
        onClose()
      }}
    >
      {label}
    </button>
  )

  const parentForNew = item.type === 'folder' || item.root ? item.id : item.parentId || item.id

  // ----- 선택 항목 일괄 라벨/상태/키워드 지정 -----
  const bulkLabel = (labelId: string | null) => targetIds.forEach((id) => setLabel(id, labelId))
  const bulkStatus = (statusId: string | null) => targetIds.forEach((id) => setStatus(id, statusId))
  // 키워드는 선택 전체에 '부여'(이미 가진 항목은 그대로) — 일괄 토글의 모호함(일부 on/off) 회피.
  const bulkAddKeyword = (kwId: string) =>
    targetIds.forEach((id) => {
      const it = project.items[id]
      if (it && !it.keywordIds.includes(kwId)) toggleKeyword(id, kwId)
    })
  const showBulkMeta = !item.root && !inTrash && targetIds.length > 0

  return (
    <div
      ref={menuRef}
      className="context-menu"
      // maxHeight/overflow 인라인: 항목이 많아도 화면 안에서 스크롤되도록(잘림 방지 클램프와 세트).
      style={{ left: pos.x, top: pos.y, maxHeight: 'calc(100vh - 16px)', overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      {item.root !== 'trash' && A('새 글', () => addItem('text', parentForNew))}
      {item.root !== 'trash' && A('새 폴더', () => addItem('folder', parentForNew))}
      {!item.root && !inTrash && (<><div className="divider" />{A('이름 바꾸기', () => setRenameId(item.id))}</>)}
      <div className="divider" />
      {!item.root && A(item.type === 'folder' ? '글로 변환' : '폴더로 변환', () =>
        convertType(item.id, item.type === 'folder' ? 'text' : 'folder'),
      )}
      {!item.root && A('복제', () => duplicateItem(item.id))}
      {!item.root && selectedIds.length > 1 && A(`선택 ${selectedIds.length}개 묶기`, () => groupSelection(selectedIds))}
      {!item.root && selectedIds.length > 1 && selectedIds.every((sid) => project.items[sid]?.type !== 'folder') && A(`선택 ${selectedIds.length}개 병합`, () => mergeDocuments(selectedIds))}
      {!item.root && item.type === 'folder' && A('그룹 해제', () => ungroup(item.id))}
      {inTrash && !item.root && A('휴지통에서 복원', () => restoreFromTrash(item.id))}

      {showBulkMeta && (
        <>
          <div className="divider" />
          <div className="ctx-sub-title" title="선택한 글 전체에 적용됩니다">
            {targetIds.length > 1 ? `선택 ${targetIds.length}개 일괄 지정` : '메타 지정'}
          </div>
          <div className="ctx-sub-group" role="group" aria-label="라벨 지정">
            <span className="ctx-sub-label">라벨</span>
            <div className="ctx-sub-row">
              {project.labels.map((l) => (
                <button
                  key={l.id}
                  className="ctx-chip"
                  title={l.name}
                  style={{ borderColor: l.color }}
                  onClick={(e) => { e.stopPropagation(); bulkLabel(l.id === 'label-none' ? null : l.id); onClose() }}
                >
                  <span className="ctx-chip-dot" style={{ background: l.color }} />
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div className="ctx-sub-group" role="group" aria-label="상태 지정">
            <span className="ctx-sub-label">상태</span>
            <div className="ctx-sub-row">
              {project.statuses.map((st) => (
                <button
                  key={st.id}
                  className="ctx-chip"
                  title={st.name}
                  onClick={(e) => { e.stopPropagation(); bulkStatus(st.id === 'status-none' ? null : st.id); onClose() }}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>
          {project.keywords.length > 0 && (
            <div className="ctx-sub-group" role="group" aria-label="키워드 부여">
              <span className="ctx-sub-label">키워드</span>
              <div className="ctx-sub-row">
                {project.keywords.map((kw) => (
                  <button
                    key={kw.id}
                    className="ctx-chip"
                    title={`'${kw.name}' 키워드 부여`}
                    style={{ borderColor: kw.color }}
                    onClick={(e) => { e.stopPropagation(); bulkAddKeyword(kw.id); onClose() }}
                  >
                    <span className="ctx-chip-dot" style={{ background: kw.color }} />
                    {kw.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="divider" />
      {item.root === 'trash'
        ? A('휴지통 비우기', () => { if (window.confirm('휴지통의 모든 항목을 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) emptyTrash() }, 'danger')
        : inTrash
          ? A('완전히 삭제', () => { const n = descendantCount(project, item.id); if (window.confirm(n > 0 ? `'${item.title || '폴더'}'와(과) 하위 항목 ${n}개를 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?` : `'${item.title || '항목'}'을(를) 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`)) deleteForever(item.id) }, 'danger')
          : !item.root && A(
              trashTargets.length > 1 ? `선택 ${trashTargets.length}개 휴지통으로 이동` : '휴지통으로 이동',
              () => {
                // 다중 선택이면 선택 전체를 일괄 휴지통행(각각 moveToTrash — originalParentId 보존, 복원 가능).
                const targets = trashTargets.length > 0 ? trashTargets : [item.id]
                const extra = targets.reduce((n, id) => n + descendantCount(project, id), 0)
                if (extra > 0) {
                  const msg = targets.length > 1
                    ? `선택한 ${targets.length}개 항목과 하위 항목 ${extra}개를 함께 휴지통으로 옮깁니다. 계속할까요?`
                    : `'${project.items[targets[0]]?.title || '폴더'}'와(과) 하위 항목 ${extra}개를 함께 휴지통으로 옮깁니다. 계속할까요?`
                  if (!window.confirm(msg)) return
                }
                targets.forEach((id) => moveToTrash(id))
                if (targets.length > 1) flash(`${targets.length}개를 휴지통으로 옮겼습니다.`)
              },
              'danger',
            )}
    </div>
  )
}

function ResultRow({ id, onMenu, order }: { id: string; onMenu: (m: MenuState) => void; order?: string[] }) {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const selectedIds = useStore((s) => s.selectedIds)
  const it = project.items[id]
  if (!it) return null
  const crumbs = pathOf(project, id).slice(0, -1).map((c) => c.title).join(' › ')
  return (
    <div
      className={'search-result' + (selectedIds.includes(id) ? ' selected' : '')}
      onClick={(e) => select(id, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey, order })}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!selectedIds.includes(id)) select(id)
        onMenu({ x: e.clientX, y: e.clientY, id })
      }}
    >
      <div>{it.title}</div>
      {crumbs && <div className="crumb">{crumbs}</div>}
    </div>
  )
}

export default function Binder() {
  const project = useStore((s) => s.project)
  const binderVisible = useStore((s) => s.binderVisible)
  const addItem = useStore((s) => s.addItem)
  const activeId = useStore((s) => s.activeId)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const searchOptions = useStore((s) => s.searchOptions)
  const setSearchOptions = useStore((s) => s.setSearchOptions)
  const activeCollectionId = useStore((s) => s.activeCollectionId)
  const setActiveCollection = useStore((s) => s.setActiveCollection)
  const addSearchCollection = useStore((s) => s.addSearchCollection)
  const deleteCollection = useStore((s) => s.deleteCollection)
  const renameCollection = useStore((s) => s.renameCollection)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [showOpts, setShowOpts] = useState(false)

  // ----- 드래그 중 트리 상/하단 가장자리 자동 스크롤 -----
  // 리스트가 길면 드래그로 화면 밖 항목에 놓을 수 없던 문제 해소. 행 dragover 가 버블링돼 여기서 잡힌다.
  const treeRef = useRef<HTMLDivElement>(null)
  const scrollSpeed = useRef(0)
  const scrollRaf = useRef<number | null>(null)
  const lastDragOver = useRef(0)
  const stopAutoScroll = () => {
    if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current)
    scrollRaf.current = null
    scrollSpeed.current = 0
  }
  const autoScrollTick = () => {
    const el = treeRef.current
    // dragover 신호가 300ms 이상 끊기면(트리 밖 이탈·드롭 종료) 정지 — 무한 스크롤 안전장치.
    if (!el || !scrollSpeed.current || Date.now() - lastDragOver.current > 300) {
      stopAutoScroll()
      return
    }
    el.scrollTop += scrollSpeed.current
    scrollRaf.current = requestAnimationFrame(autoScrollTick)
  }
  const onTreeDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('text/scriv-id')) return
    const el = treeRef.current
    if (!el) return
    lastDragOver.current = Date.now()
    const r = el.getBoundingClientRect()
    const EDGE = 32 // 상/하단 근접 판정 폭(px)
    let v = 0
    if (e.clientY < r.top + EDGE) v = -Math.ceil((EDGE - (e.clientY - r.top)) / 4) // 가까울수록 빠르게(최대 8px/frame)
    else if (e.clientY > r.bottom - EDGE) v = Math.ceil((EDGE - (r.bottom - e.clientY)) / 4)
    scrollSpeed.current = v
    if (v && scrollRaf.current == null) scrollRaf.current = requestAnimationFrame(autoScrollTick)
  }
  useEffect(() => {
    // 드롭/드래그 취소가 어디에서 끝나든 스크롤을 멈춘다 + 언마운트 정리.
    const stop = () => stopAutoScroll()
    window.addEventListener('drop', stop)
    window.addEventListener('dragend', stop)
    return () => {
      window.removeEventListener('drop', stop)
      window.removeEventListener('dragend', stop)
      stopAutoScroll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!binderVisible) return null

  const roots = project.rootOrder.map((id) => project.items[id]).filter(Boolean)
  const draftId = 'root-draft'
  const newTextParent = (() => {
    const a = activeId ? project.items[activeId] : null
    if (!a || a.root === 'trash') return draftId
    if (a.type === 'folder') return a.id
    return a.parentId || draftId
  })()

  const searching = search.trim().length > 0
  let resultIds: string[] | null = null
  if (searching) resultIds = searchProject(project, search, searchOptions)
  else if (activeCollectionId) {
    const col = project.collections.find((c) => c.id === activeCollectionId)
    if (col)
      resultIds =
        col.type === 'search' && col.query
          ? searchProject(project, col.query, col.options || searchOptions)
          : col.itemIds.filter((id) => project.items[id] && !isInTrash(project, id))
  }

  // 원고 폴더가 비어 있는지(첫 사용·전부 삭제) — 빈 상태 안내로 시작 장벽을 낮춘다.
  const draftEmpty = (project.items[draftId]?.childIds.length ?? 0) === 0
  const openStructureTemplate = () => {
    // 기존 명령 브리지 재사용(App 의 'structure' 명령 → 구조 템플릿 모달). App 수정 없이 안전하게 호출.
    try { window.dispatchEvent(new CustomEvent('scriv:run-fav', { detail: 'structure' })) } catch { /* noop */ }
  }

  return (
    <div className="binder">
      <div className="search-bar">
        <Search size={13} />
        <input
          placeholder="프로젝트 검색…"
          aria-label="프로젝트 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searching ? (
          <button className="minibtn" onClick={() => setSearch('')} title="지우기">
            <X size={12} />
          </button>
        ) : (
          <button className="minibtn" onClick={() => setShowOpts((v) => !v)} title="검색 옵션">
            ⋯
          </button>
        )}
      </div>

      {(showOpts || searching) && (
        <div className="search-opts">
          <select value={searchOptions.scope} onChange={(e) => setSearchOptions({ scope: e.target.value as never })}>
            <option value="all">전체</option>
            <option value="title">제목</option>
            <option value="text">본문</option>
            <option value="synopsis">시놉시스</option>
            <option value="notes">노트</option>
            <option value="keywords">키워드</option>
            <option value="label">라벨</option>
            <option value="status">상태</option>
          </select>
          <select value={searchOptions.operator} onChange={(e) => setSearchOptions({ operator: e.target.value as never })}>
            <option value="all">모든 단어</option>
            <option value="any">아무 단어</option>
            <option value="exact">정확히</option>
          </select>
          <label>
            <input type="checkbox" checked={searchOptions.caseSensitive} onChange={(e) => setSearchOptions({ caseSensitive: e.target.checked })} /> 대소문자
          </label>
          <label>
            <input type="checkbox" checked={searchOptions.wholeWord} onChange={(e) => setSearchOptions({ wholeWord: e.target.checked })} /> 온전한 단어
          </label>
          <label title="조건에 맞지 않는 문서를 찾습니다">
            <input type="checkbox" checked={searchOptions.invert} onChange={(e) => setSearchOptions({ invert: e.target.checked })} /> 반전
          </label>
          {searching && (
            <button
              className="minibtn"
              onClick={() => {
                const name = prompt('컬렉션 이름:', search)
                if (name) addSearchCollection(name, search, searchOptions)
              }}
            >
              컬렉션으로 저장
            </button>
          )}
        </div>
      )}

      {project.collections.length > 0 && !searching && (
        <div className="collections-strip">
          <button
            className={'collection-tab' + (!activeCollectionId ? ' active' : '')}
            style={{ background: '#666' }}
            onClick={() => setActiveCollection(null)}
          >
            바인더
          </button>
          {project.collections.map((c) => (
            <button
              key={c.id}
              className={'collection-tab' + (activeCollectionId === c.id ? ' active' : '')}
              style={{ background: c.color }}
              onClick={() => setActiveCollection(activeCollectionId === c.id ? null : c.id)}
              onDoubleClick={(e) => { e.stopPropagation(); const n = prompt('컬렉션 이름:', c.name); if (n && n.trim()) renameCollection(c.id, n.trim()) }}
              title={(c.type === 'search' ? '검색 컬렉션' : '컬렉션') + ' · 더블클릭=이름변경'}
            >
              {c.type === 'search' && <Icon name="search" size={11} mono style={{ marginRight: 4, verticalAlign: '-1px' }} />}{c.name}
              <span
                className="collection-del"
                role="button"
                title="컬렉션 삭제(문서는 삭제되지 않음)"
                onClick={(e) => { e.stopPropagation(); if (confirm(`'${c.name}' 컬렉션을 삭제할까요? (문서 원본은 삭제되지 않습니다)`)) deleteCollection(c.id) }}
              >×</span>
            </button>
          ))}
        </div>
      )}

      <div className="binder-head">
        <span style={{ flex: 1 }}>
          {searching ? `검색 결과 ${resultIds?.length ?? 0}` : '바인더'}
        </span>
        <button className="minibtn" title="새 글" onClick={() => addItem('text', newTextParent)}>
          + 글
        </button>
        <button className="minibtn" title="새 폴더" onClick={() => addItem('folder', newTextParent)}>
          + 폴더
        </button>
      </div>

      <div className="binder-tree" role="tree" aria-label="바인더 트리" ref={treeRef} onDragOver={onTreeDragOver}>
        {resultIds ? (
          resultIds.length ? (
            resultIds.map((id) => <ResultRow key={id} id={id} onMenu={setMenu} order={resultIds!} />)
          ) : (
            <div style={{ padding: 12, color: 'var(--binder-fg)', opacity: 0.65, fontSize: 12 }}>결과 없음</div>
          )
        ) : (
          <>
            {roots.map((r) => <Row key={r.id} item={r} depth={0} onMenu={setMenu} />)}
            {draftEmpty && (
              <div className="binder-empty">
                <p className="binder-empty-title">아직 글이 없어요</p>
                <p className="binder-empty-desc">여기에 첫 씬을 추가해 시작하세요.</p>
                <div className="binder-empty-actions">
                  <button className="minibtn" onClick={() => addItem('text', draftId)}>+ 새 글</button>
                  <button className="minibtn" onClick={openStructureTemplate} title="3막·영웅서사·세이브더캣 등 플롯 구조로 시작">
                    구조 템플릿…
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* 우클릭 메뉴는 body 로 포털: 오로라 유리 서랍처럼 backdrop-filter + overflow:hidden 인 조상 안에서는 position:fixed 도 잘리므로 */}
      {menu && createPortal(<ContextMenu menu={menu} onClose={() => setMenu(null)} />, document.body)}
    </div>
  )
}
