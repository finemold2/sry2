import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useModal } from './useModal'
import { STRUCTURES } from '../templates/structures'
import { DRAFT_ROOT } from '../model'

// 플롯 구조 템플릿 적용기 — 3막/영웅서사/Save the Cat 골격을 원고에 한 번에 생성.
export default function StructureTemplateModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const applyStructure = useStore((s) => s.applyStructure)
  const setView = useStore((s) => s.setView)
  const dialogRef = useModal<HTMLDivElement>(onClose)

  const draftParent = () => {
    const a = activeId ? project.items[activeId] : null
    if (a && !a.root && a.type === 'folder') return a.id
    const inDraft = (id: string | null | undefined): boolean => {
      let cur = id ?? null
      while (cur) {
        if (project.items[cur]?.root === 'draft') return true
        cur = project.items[cur]?.parentId ?? null
      }
      return false
    }
    if (a && inDraft(a.id)) return a.parentId || DRAFT_ROOT
    const d = Object.values(project.items).find((i) => i.root === 'draft')
    return d?.id || DRAFT_ROOT
  }

  const apply = (id: string) => {
    applyStructure(id, draftParent())
    setView('corkboard')
    onClose()
  }

  // 카테고리(기본/작법서/장르)별 그룹화 + 펼침 트리
  const BASIC = '기본·작법 구조'
  const groups = useMemo(() => {
    const m = new Map<string, typeof STRUCTURES>()
    for (const st of STRUCTURES) {
      const cat = st.category || BASIC
      if (!m.has(cat)) m.set(cat, [])
      m.get(cat)!.push(st)
    }
    // 기본·작법을 맨 위로
    return [...m.entries()].sort((a, b) => (a[0] === BASIC ? -1 : b[0] === BASIC ? 1 : a[0].localeCompare(b[0], 'ko')))
  }, [])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set([BASIC]))
  const ql = q.trim().toLowerCase()
  const toggle = (c: string) => setOpen((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 640 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>플롯 구조 템플릿</h2>
        <div className="modal-body">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            검증된 서사 골격을 원고에 폴더·장면으로 한 번에 깝니다. <b>장르별</b>로 다양한 하부 구조를 펼쳐 골라 적용하세요.
          </div>
          <input className="field" placeholder="구조 검색… (예: 후던잇, 영웅, 회귀)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
          {groups.map(([cat, list]) => {
            const items = ql ? list.filter((st) => (st.name + ' ' + st.desc).toLowerCase().includes(ql)) : list
            if (!items.length) return null
            const isOpen = !!ql || open.has(cat)
            return (
              <div key={cat} style={{ marginBottom: 6, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => toggle(cat)} aria-expanded={isOpen}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--panel)', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }}>
                  <span style={{ width: 12, color: 'var(--muted)', fontSize: 10 }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{cat}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', borderRadius: 999, padding: '0 8px' }}>{items.length}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '6px 10px 10px' }}>
                    {items.map((st) => (
                      <div key={st.id} className="struct-card">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{st.desc}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            {st.beats.flatMap((bt) => (bt.children?.length ? bt.children : [bt])).map((bt) => bt.title.replace(/^\d+\.\s*/, '')).slice(0, 6).join(' · ')}…
                          </div>
                        </div>
                        <button className="btn-primary" style={{ flex: '0 0 auto' }} onClick={() => apply(st.id)}>적용</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
