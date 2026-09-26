import { useMemo } from 'react'
import { Icon } from '../ui/icons'
import { useModal } from './useModal'
import { rtfToPlainText } from '../rtf'
import { analyzeStyle } from '../analysis/style'
import { useStore } from '../store/store'

export default function StyleModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const item = activeId ? project.items[activeId] : null
  const text = useMemo(
    () => (item && item.type === 'text' ? item.plainText ?? rtfToPlainText(item.bodyRtf) : ''),
    [item],
  )
  const report = useMemo(() => analyzeStyle(text), [text])

  const grade =
    report.readability >= 70 ? '쉬움' : report.readability >= 50 ? '보통' : report.readability > 0 ? '어려움' : '—'

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>글쓰기 분석 {item ? `· ${item.title}` : ''}</h2>
        <div className="modal-body">
          {!item || item.type !== 'text' ? (
            <div style={{ color: 'var(--muted)' }}>텍스트 문서를 선택하세요.</div>
          ) : (
            <>
              <div className="stats-grid" style={{ marginBottom: 14 }}>
                <div className="k">문장 수</div>
                <div className="v">{report.sentences.toLocaleString()}</div>
                <div className="k">단어 수</div>
                <div className="v">{report.words.toLocaleString()}</div>
                <div className="k">평균 문장 길이</div>
                <div className="v">{report.avgSentenceLen} 단어</div>
                <div className="k">가독성(Flesch, 영문)</div>
                <div className="v">
                  {report.readability} · {grade}
                </div>
              </div>
              {report.issues.length === 0 ? (
                <div style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  특별히 지적할 점이 없습니다. <Icon name="star" size={16} mono />
                </div>
              ) : (
                report.issues.map((iss) => (
                  <div key={iss.kind} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, color: iss.severity === 'warn' ? 'var(--warn)' : 'var(--accent-2)' }}>
                      {iss.label} — {iss.count}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{iss.samples.join(' · ')}</div>
                  </div>
                ))
              )}
            </>
          )}
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
