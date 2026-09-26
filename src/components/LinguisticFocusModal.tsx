import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useModal } from './useModal'
import { rtfToPlainText } from '../rtf'
import { FOCUS_CATS, linguisticFocus, type FocusCat } from '../analysis/linguistic'

// 언어 초점(읽기 전용) — 현재 문서 텍스트를 품사/요소별로 하이라이트해 보여준다(편집 불가).
export default function LinguisticFocusModal({ onClose }: { onClose: () => void }) {
  const item = useStore((s) => (s.activeId ? s.project.items[s.activeId] : null))
  const dialogRef = useModal<HTMLDivElement>(onClose)
  const [active, setActive] = useState<Set<FocusCat>>(() => new Set<FocusCat>(['dialogue', 'adverb']))

  const text = item ? item.plainText || rtfToPlainText(item.bodyRtf) : ''
  const result = useMemo(() => linguisticFocus(text, active), [text, active])

  const colorOf = (cat: FocusCat) => FOCUS_CATS.find((c) => c.key === cat)?.color || 'transparent'
  const toggle = (k: FocusCat) =>
    setActive((s) => {
      const next = new Set(s)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 760, maxWidth: '94vw' }}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>언어 초점 (읽기 전용)</h2>
        <div className="modal-body">
          <div className="lf-legend">
            {FOCUS_CATS.map((c) => (
              <label key={c.key} className="lf-chip">
                <input type="checkbox" checked={active.has(c.key)} onChange={() => toggle(c.key)} />
                <span className="lf-swatch" style={{ background: c.color }} />
                {c.label}
                <span className="lf-count">{result.counts[c.key]}</span>
              </label>
            ))}
          </div>
          {!item ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>문서를 선택하세요.</div>
          ) : !text.trim() ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>본문이 비어 있습니다.</div>
          ) : (
            <div className="lf-text">
              {result.segments.map((seg, i) =>
                seg.cat ? (
                  <mark key={i} style={{ background: colorOf(seg.cat), color: 'inherit' }}>
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </div>
          )}
          {result.truncated && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              문서가 매우 길어 앞부분만 표시했습니다.
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            형태소 분석기 없이 동작하는 근사 하이라이트입니다(편집은 본문 에디터에서). 이 패널은 읽기 전용입니다.
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
