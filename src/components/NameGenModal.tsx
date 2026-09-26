import { useState } from 'react'
import { useModal } from './useModal'
import { generateNames, type Culture, type Gender } from '../data/namegen'

export default function NameGenModal({ onClose }: { onClose: () => void }) {
  const [culture, setCulture] = useState<Culture>('ko')
  const [gender, setGender] = useState<Gender>('any')
  const [names, setNames] = useState<string[]>([])

  const gen = () => setNames(generateNames(culture, gender, 30))

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>이름 생성기</h2>
        <div className="modal-body">
          <div className="row" style={{ marginBottom: 12 }}>
            <select className="field" value={culture} onChange={(e) => setCulture(e.target.value as Culture)}>
              <option value="ko">한국어</option>
              <option value="en">영어</option>
            </select>
            <select className="field" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="any">전체</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
            <button className="btn-primary" style={{ flex: '0 0 auto' }} onClick={gen}>
              생성
            </button>
          </div>
          {names.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>"생성"을 눌러 이름을 만들어 보세요. 클릭하면 복사됩니다.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {names.map((n) => (
                <button
                  key={n}
                  className="btn-ghost"
                  style={{ padding: '6px 8px', fontSize: 13 }}
                  onClick={() => {
                    const ok = !!navigator.clipboard
                    if (ok) navigator.clipboard.writeText(n).catch(() => {})
                    window.dispatchEvent(new CustomEvent('scriv:flash', { detail: ok ? `"${n}" 복사됨` : '복사를 지원하지 않는 환경입니다' }))
                  }}
                  title="클릭하여 복사"
                >
                  {n}
                </button>
              ))}
            </div>
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
