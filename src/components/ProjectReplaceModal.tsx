import { useState } from 'react'
import { useModal } from './useModal'
import { useStore, type ReplaceOptions } from '../store/store'

export default function ProjectReplaceModal({ onClose }: { onClose: () => void }) {
  const projectReplace = useStore((s) => s.projectReplace)
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [opts, setOpts] = useState<ReplaceOptions>({
    inText: true,
    inTitles: true,
    inSynopses: true,
    inNotes: true,
    caseSensitive: false,
    wholeWord: false,
  })
  const [done, setDone] = useState<number | null>(null)
  const set = (p: Partial<ReplaceOptions>) => setOpts((o) => ({ ...o, ...p }))

  const run = () => {
    if (!find) return
    // 본문이 바뀌는 문서는 치환 '이전' 상태가 자동 스냅샷으로 남는다(store.projectReplace) — 문서별 복원 가능.
    if (!window.confirm(`원고 전체에서 "${find}"을(를) "${replace}"(으)로 모두 바꿉니다.\n\n✓ 본문이 바뀌는 문서는 바꾸기 전 상태가 자동으로 스냅샷에 보관됩니다.\n  (되돌리기: 해당 문서 선택 → 인스펙터 › 스냅샷 → 되돌리기)\n\n계속할까요?`)) return
    const n = projectReplace(find, replace, opts)
    setDone(n)
  }

  const chk = (key: keyof ReplaceOptions, label: string) => (
    <label className="fld" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <input type="checkbox" checked={opts[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      {label}
    </label>
  )

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>프로젝트 전체 찾아 바꾸기</h2>
        <div className="modal-body">
          <label className="fld">
            <span>찾을 내용</span>
            <input className="field" value={find} onChange={(e) => setFind(e.target.value)} autoFocus />
          </label>
          <label className="fld">
            <span>바꿀 내용</span>
            <input className="field" value={replace} onChange={(e) => setReplace(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div>
              {chk('inText', '본문')}
              {chk('inTitles', '제목')}
              {chk('inSynopses', '시놉시스')}
              {chk('inNotes', '노트')}
            </div>
            <div>
              {chk('caseSensitive', '대소문자 구분')}
              {chk('wholeWord', '단어 단위')}
            </div>
          </div>
          {done != null && (
            <div style={{ marginTop: 8, color: 'var(--ok)', fontSize: 13 }}>
              {done.toLocaleString()}곳을 바꿨습니다.
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
            팁: 실행 전 스냅샷을 찍거나 저장해 두세요. (이 작업은 자동저장에 반영됩니다)
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            닫기
          </button>
          <button className="btn-primary" onClick={run} disabled={!find}>
            모두 바꾸기
          </button>
        </div>
      </div>
    </div>
  )
}
