import { useStore } from '../store/store'
import { useModal } from './useModal'
import { containerOf } from './Corkboard'
import { DOC_TEMPLATES } from '../templates/docTemplates'
import { RESEARCH_ROOT, DRAFT_ROOT } from '../model'

// "새 문서(템플릿)" 피커 — 캐릭터 카드/시트, 장소, 빈 문서.
export default function DocTemplateModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const addFromTemplate = useStore((s) => s.addFromTemplate)
  const dialogRef = useModal<HTMLDivElement>(onClose)

  const resolveParent = (prefer?: 'research' | 'draft') => {
    // 선호 루트가 있으면 그 루트(없으면 컨테이너). 캐릭터/장소는 자료 폴더로.
    if (prefer === 'research') {
      const r = Object.values(project.items).find((i) => i.root === 'research')
      return r?.id || RESEARCH_ROOT
    }
    if (prefer === 'draft') {
      const a = activeId ? project.items[activeId] : null
      if (a && !a.root && a.type === 'folder') return a.id
      const d = Object.values(project.items).find((i) => i.root === 'draft')
      return d?.id || DRAFT_ROOT
    }
    return containerOf(project, activeId)
  }

  const create = (templateId: string, prefer?: 'research' | 'draft') => {
    addFromTemplate(templateId, resolveParent(prefer))
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>새 문서 (템플릿)</h2>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DOC_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="tpl-card"
                onClick={() => create(t.id, t.prefer)}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            캐릭터/장소는 자료 폴더에 생성됩니다. 카드는 폼으로 입력하고, 시트는 본문 양식을 직접 채웁니다.
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
