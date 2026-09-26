// 소리내어 읽기(TTS) — Web Speech API 로 현재 문서를 읽어준다. 귀로 들으면 어색한 문장·반복이 잘 들린다.
import { useEffect, useRef, useState } from 'react'
import { X, Play, Pause, Square } from 'lucide-react'
import { Icon } from '../ui/icons'
import { useStore } from '../store/store'
import { rtfToPlainText } from '../rtf'

export default function ReadAloud({ onClose }: { onClose: () => void }) {
  const activeId = useStore((s) => s.activeId)
  const item = useStore((s) => (activeId ? s.project.items[activeId] : null))
  const [rate, setRate] = useState(1)
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle')
  const idxRef = useRef(0)
  const chunksRef = useRef<string[]>([])

  const text = item && item.type === 'text' ? (item.plainText ?? rtfToPlainText(item.bodyRtf)) : ''
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel() }, [supported])

  const speakFrom = (start: number) => {
    const synth = window.speechSynthesis
    const voices = synth.getVoices()
    const ko = voices.find((v) => /ko/i.test(v.lang))
    const chunks = chunksRef.current
    const speakNext = (i: number) => {
      if (i >= chunks.length) { setState('idle'); idxRef.current = 0; return }
      idxRef.current = i
      const u = new SpeechSynthesisUtterance(chunks[i])
      u.rate = rate
      if (ko) u.voice = ko
      u.lang = ko?.lang || 'ko-KR'
      u.onend = () => { if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return; speakNext(i + 1) }
      synth.speak(u)
    }
    speakNext(start)
  }
  const play = () => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()
    chunksRef.current = text.match(/[^.!?。！？…\n]+[.!?。！？…\n]?/g)?.map((s) => s.trim()).filter(Boolean) || [text]
    setState('playing')
    speakFrom(0)
  }
  const pause = () => { window.speechSynthesis.pause(); setState('paused') }
  const resume = () => { window.speechSynthesis.resume(); setState('playing') }
  const stop = () => { window.speechSynthesis.cancel(); setState('idle'); idxRef.current = 0 }

  return (
    <div className="readaloud" role="dialog" aria-label="소리내어 읽기">
      <div className="readaloud-head">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="music" size={16} /> 소리내어 읽기</span>
        <button className="minibtn" onClick={() => { stop(); onClose() }} aria-label="닫기"><X size={12} /></button>
      </div>
      <div className="readaloud-body">
        {!supported ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>이 브라우저는 음성 합성을 지원하지 않습니다.</div>
        ) : !text.trim() ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>읽을 문서를 먼저 선택하세요.</div>
        ) : (
          <>
            <div className="readaloud-ctrls">
              {state !== 'playing' ? (
                <button className="btn-primary" onClick={state === 'paused' ? resume : play}><Play size={13} /> {state === 'paused' ? '계속' : '재생'}</button>
              ) : (
                <button className="btn-ghost" onClick={pause}><Pause size={13} /> 일시정지</button>
              )}
              <button className="btn-ghost" onClick={stop} disabled={state === 'idle'}><Square size={12} /> 정지</button>
            </div>
            <label className="readaloud-rate">
              속도 {rate.toFixed(1)}×
              <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} />
            </label>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>“{item?.title}” · 약 {text.length.toLocaleString()}자 · 속도 변경은 재생을 다시 눌러야 적용됩니다.</div>
          </>
        )}
      </div>
    </div>
  )
}
