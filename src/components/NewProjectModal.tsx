import { useState } from 'react'
import { useModal } from './useModal'
import { TEMPLATES } from '../templates/templates'
import { useStore } from '../store/store'
import type { Project } from '../model'

export default function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate?: (p: Project) => void }) {
  const loadProject = useStore((s) => s.loadProject)
  const [sel, setSel] = useState(TEMPLATES[1].id)
  const [title, setTitle] = useState('')

  const create = () => {
    const t = TEMPLATES.find((x) => x.id === sel) || TEMPLATES[0]
    const p = t.build()
    if (title.trim()) p.title = title.trim()
    // 템플릿 새 프로젝트가 다크/세피아 테마를 라이트로 리셋하지 않도록 현재 UI 선호를 계승(전역 영속값 우선)
    const prev = useStore.getState().project?.settings
    let savedTheme: string | null = null
    try { savedTheme = localStorage.getItem('sry:theme') } catch { /* noop */ }
    const inheritTheme = (savedTheme as typeof p.settings.theme) || prev?.theme
    if (inheritTheme) p.settings.theme = inheritTheme
    if (prev) {
      if (prev.editorWidth != null) p.settings.editorWidth = prev.editorWidth
      if (prev.editorParaGap != null) p.settings.editorParaGap = prev.editorParaGap
      if (prev.editorLineHeight != null) p.settings.editorLineHeight = prev.editorLineHeight
    }
    // 전환 확인(현재 프로젝트 저장 여부)을 App 이 처리하도록 위임
    if (onCreate) { onClose(); onCreate(p); return }
    loadProject(p)
    // 새 프로젝트는 변경됨 상태로 두어 자동저장되게
    useStore.setState({ dirty: true })
    onClose()
  }

  const cats = [...new Set(TEMPLATES.map((t) => t.category))]

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>새 프로젝트</h2>
        <div className="modal-body">
          <label className="fld">
            <span>프로젝트 제목</span>
            <input className="field" placeholder="(선택) 제목" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          {cats.map((cat) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{cat}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSel(t.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: sel === t.id ? '2px solid var(--accent)' : '1px solid var(--border-dark)',
                      background: sel === t.id ? 'rgba(74,118,212,0.08)' : 'var(--paper)',
                      color: 'var(--text)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={create}>
            만들기
          </button>
        </div>
      </div>
    </div>
  )
}
