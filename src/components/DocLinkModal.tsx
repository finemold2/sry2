import { useMemo, useState } from 'react'
import { useModal } from './useModal'
import { pathOf, useStore } from '../store/store'
import type { BinderItem } from '../model'
import { Icon } from '../ui/icons'

// 다른 문서를 가리키는 내부 링크(Scrivener Link) 삽입 피커.
export default function DocLinkModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const [q, setQ] = useState('')

  const inTrash = (it: BinderItem): boolean => {
    let cur: string | null = it.id
    while (cur) {
      if (project.items[cur]?.root === 'trash') return true
      cur = project.items[cur]?.parentId ?? null
    }
    return false
  }

  const items = useMemo(() => {
    const list = Object.values(project.items).filter((it) => !it.root && it.id !== activeId && !inTrash(it))
    const withPath = list.map((it) => ({
      it,
      path: pathOf(project, it.id)
        .slice(0, -1)
        .map((p) => p.title)
        .join(' › '),
    }))
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? withPath.filter((x) => (x.it.title + ' ' + x.path).toLowerCase().includes(needle))
      : withPath
    return filtered.sort((a, b) => a.it.title.localeCompare(b.it.title, 'ko')).slice(0, 200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, activeId, q])

  const pick = (it: BinderItem) => {
    window.dispatchEvent(new CustomEvent('scriv:insertDocLink', { detail: { id: it.id, title: it.title } }))
    onClose()
  }

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>문서 링크 삽입</h2>
        <div className="modal-body">
          <input
            className="field"
            placeholder="문서 검색…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div style={{ marginTop: 10, maxHeight: 360, overflow: 'auto' }}>
            {items.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>일치하는 문서가 없습니다.</div>}
            {items.map(({ it, path }) => (
              <button
                key={it.id}
                className="btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px' }}
                onClick={() => pick(it)}
              >
                <div style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={it.type === 'folder' ? 'binder' : 'editor'} size={14} />
                  {it.title}
                </div>
                {path && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{path}</div>}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
