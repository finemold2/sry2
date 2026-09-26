// 프로젝트 목록 — 브라우저(IndexedDB)에 저장된 여러 프로젝트를 보고 열거나 삭제한다.
// 다중 프로젝트 워크플로의 핵심: '빈/새 프로젝트'·'sry 열기' 외에도 이전 프로젝트로 다시 전환 가능.
// 열기는 App 의 requestSwitch(전환 저장확인)를 거치도록 onOpenProject 로 위임(데이터 안전).
import { useEffect, useState } from 'react'
import { useModal } from './useModal'
import { useStore } from '../store/store'
import { idbList, idbDeleteWithCleanup, type ProjectMeta } from '../persistence/idb'
import { Icon } from '../ui/icons'

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function ProjectListModal({ onClose, onOpenProject }: { onClose: () => void; onOpenProject: (id: string) => void }) {
  const currentId = useStore((s) => s.project.id)
  const currentTitle = useStore((s) => s.project.title)
  const [list, setList] = useState<ProjectMeta[] | null>(null)
  const [err, setErr] = useState('')

  const refresh = () => idbList().then(setList).catch((e) => { setErr('목록을 불러오지 못했습니다: ' + ((e as Error)?.message || e)); setList([]) })
  useEffect(() => { refresh() }, [])

  const del = async (m: ProjectMeta) => {
    if (m.id === currentId) { window.alert('현재 열려 있는 프로젝트는 삭제할 수 없습니다. 다른 프로젝트를 먼저 여세요.'); return }
    if (!window.confirm(`"${m.title || '제목 없는 프로젝트'}"을(를) 브라우저에서 영구 삭제합니다.\n되돌릴 수 없습니다(.sry 로 내보낸 파일은 영향 없음). 계속할까요?`)) return
    await idbDeleteWithCleanup(m.id).catch(() => {})
    refresh()
  }

  const dialogRef = useModal<HTMLDivElement>(onClose)
  // 현재 프로젝트가 아직 목록(IDB)에 없을 수 있으니(신규·미저장) 항상 맨 위에 보여준다.
  const others = (list || []).filter((m) => m.id !== currentId).sort((a, b) => b.modified - a.modified)
  const currentMeta = (list || []).find((m) => m.id === currentId)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} ref={dialogRef} role="dialog" aria-modal="true" aria-label="프로젝트 목록" onClick={(e) => e.stopPropagation()}>
        <h2>프로젝트 목록</h2>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
            이 브라우저에 저장된 프로젝트입니다. 열면 현재 작업은 전환 전 확인을 거칩니다. 다른 기기로 옮기려면 <b>.sry 파일</b>로 내보내세요.
          </p>
          {err && <div style={{ color: 'var(--warn)', fontSize: 12, marginBottom: 8 }}>{err}</div>}

          <div className="snap-item" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="snap-meta">현재 열림{currentMeta ? ' · ' + fmtDate(currentMeta.modified) : ' · (아직 저장 안 됨)'}</div>
            <div><b>{currentTitle || '제목 없는 프로젝트'}</b></div>
          </div>

          {list === null ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>불러오는 중…</div>
          ) : others.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>다른 프로젝트가 없습니다. ‘파일 → 새 프로젝트’로 만들거나 .sry 파일을 열어보세요.</div>
          ) : (
            others.map((m) => (
              <div className="snap-item" key={m.id}>
                <div className="snap-meta">{fmtDate(m.modified)}</div>
                <div>{m.title || '제목 없는 프로젝트'}</div>
                <div className="snap-actions">
                  <button className="minibtn" onClick={() => { onOpenProject(m.id); onClose() }}>열기</button>
                  <button className="minibtn danger" onClick={() => del(m)}>삭제</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
