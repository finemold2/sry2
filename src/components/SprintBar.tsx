import { useEffect, useRef, useState } from 'react'
import { Timer, Pause, Play, X } from 'lucide-react'
import { totalDraftWords, useStore } from '../store/store'

// 집필 스프린트 타이머(워드 스프린트/뽀모도로). 모든 상태는 로컬, 단어수는 store 에서 파생.
export default function SprintBar({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const [minutes, setMinutes] = useState(15)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(15 * 60) // 초
  const endAtRef = useRef(0)
  const startWordsRef = useRef(0)
  const flash = (m: string) => window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m }))

  const words = totalDraftWords(project)
  const delta = running ? Math.max(0, words - startWordsRef.current) : 0

  const start = () => {
    startWordsRef.current = totalDraftWords(useStore.getState().project)
    endAtRef.current = Date.now() + minutes * 60 * 1000
    setRemaining(minutes * 60)
    setRunning(true)
    setPaused(false)
  }
  const stop = (finished: boolean) => {
    if (finished) {
      const mins = minutes
      const w = Math.max(0, totalDraftWords(useStore.getState().project) - startWordsRef.current)
      const wpm = mins > 0 ? Math.round(w / mins) : 0
      flash(`스프린트 종료! ${mins}분에 ${w.toLocaleString()}단어 (분당 ${wpm}단어) 🎉`)
    }
    setRunning(false)
    setPaused(false)
    setRemaining(minutes * 60)
  }

  useEffect(() => {
    if (!running || paused) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearInterval(id)
        stop(true)
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused])

  const togglePause = () => {
    if (!running) return
    if (paused) {
      // 재개: 남은 시간 기준으로 종료 시각 재계산
      endAtRef.current = Date.now() + remaining * 1000
      setPaused(false)
    } else {
      setPaused(true)
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="sprintbar" role="dialog" aria-label="집필 스프린트">
      <span className="sprint-title">
        <Timer size={14} /> 스프린트
      </span>
      {!running ? (
        <>
          <select className="field" value={minutes} onChange={(e) => { const m = +e.target.value; setMinutes(m); setRemaining(m * 60) }}>
            <option value={5}>5분</option>
            <option value={10}>10분</option>
            <option value={15}>15분</option>
            <option value={25}>25분</option>
            <option value={45}>45분</option>
          </select>
          <button className="btn-primary" onClick={start}>
            <Play size={13} /> 시작
          </button>
        </>
      ) : (
        <>
          <span className="sprint-time">
            {mm}:{ss}
          </span>
          <span className="sprint-delta">+{delta.toLocaleString()}단어</span>
          <button className="minibtn" onClick={togglePause} title={paused ? '재개' : '일시정지'}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button className="minibtn" onClick={() => stop(false)} title="중지">
            중지
          </button>
        </>
      )}
      <button className="minibtn" onClick={onClose} title="닫기" aria-label="스프린트 닫기">
        <X size={12} />
      </button>
    </div>
  )
}
