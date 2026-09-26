import { useState } from 'react'
import { Shuffle, X, CornerDownRight, ClipboardCopy } from 'lucide-react'
import { useStore } from '../store/store'
import { PROMPT_CATEGORIES, randomPrompt } from '../data/prompts'

// 라이팅 프롬프트 덱 — 막힘 해소용 무작위 글감(오프라인). 본문/시놉시스에 넣거나 복사.
export default function PromptDeck({ onClose }: { onClose: () => void }) {
  const activeId = useStore((s) => s.activeId)
  const appendToDocument = useStore((s) => s.appendToDocument)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const [cat, setCat] = useState('')
  const [draw, setDraw] = useState(() => randomPrompt())
  const flash = (m: string) => window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m }))

  const next = () => setDraw(randomPrompt(cat || undefined))
  const toBody = () => {
    if (activeId) {
      appendToDocument(activeId, `<p>${draw.text.replace(/</g, '&lt;')}</p>`)
      flash('본문 끝에 추가했습니다.')
    }
  }
  const toSyn = () => {
    if (activeId) {
      setSynopsis(activeId, draw.text)
      flash('시놉시스에 넣었습니다.')
    }
  }
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(draw.text).catch(() => {})
    flash('복사됨')
  }

  return (
    <div className="promptdeck" role="dialog" aria-label="라이팅 프롬프트">
      <div className="promptdeck-head">
        <span style={{ fontWeight: 700 }}>라이팅 프롬프트</span>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="닫기">
          <X size={12} />
        </button>
      </div>
      <select className="field" value={cat} onChange={(e) => setCat(e.target.value)} style={{ margin: '8px 0' }}>
        <option value="">전체 카테고리</option>
        {PROMPT_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="prompt-card">
        <div className="prompt-cat">{draw.cat}</div>
        <div className="prompt-text">{draw.text}</div>
      </div>
      <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={next}>
        <Shuffle size={13} /> 다른 글감
      </button>
      <div className="row" style={{ marginTop: 8, gap: 6 }}>
        <button className="minibtn" disabled={!activeId} onClick={toBody} title="본문 끝에 추가">
          <CornerDownRight size={12} /> 본문
        </button>
        <button className="minibtn" disabled={!activeId} onClick={toSyn} title="시놉시스로">
          시놉시스
        </button>
        <button className="minibtn" onClick={copy} title="복사">
          <ClipboardCopy size={12} /> 복사
        </button>
      </div>
    </div>
  )
}
