// 스킨 전환 코치마크(#4) — 클래식↔스튜디오 첫 전환 때 화면이 확 바뀌어 생기는 혼란을 3걸음으로 안내.
//  각 방향(→studio / →classic) 1회만 표시(localStorage), 투어 CSS(.tour-*)를 재사용.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface CoachStep { emoji: string; title: string; body: string; target?: string }

const STEPS_TO_STUDIO: CoachStep[] = [
  { emoji: '🎛️', title: '뷰 전환은 왼쪽 레일로', body: '상단에 있던 화면 전환 버튼들이 왼쪽 세로 레일로 왔어요. 에디터·코르크보드·연재 등 10개 뷰가 그대로 있어요.', target: '.st-rail' },
  { emoji: '🧭', title: '메뉴는 그대로 위에', body: '파일·문서·도구·보기 메뉴는 상단에 그대로 있어요. ⌘K 명령 팔레트로 무엇이든 검색해 실행할 수도 있고요.', target: '.st-menubar' },
  { emoji: '↩️', title: '언제든 돌아갈 수 있어요', body: '오른쪽 위 ‘클래식 UI’ 버튼으로 언제든 복귀! 어느 쪽을 쓰든 원고·데이터는 완전히 동일하게 보존됩니다.', target: '.st-skin-toggle' },
]
const STEPS_TO_CLASSIC: CoachStep[] = [
  { emoji: '🎛️', title: '뷰 전환은 상단 버튼으로', body: '왼쪽 레일에 있던 화면 전환이 상단 가운데 버튼 묶음으로 왔어요. 10개 뷰 모두 그대로예요.', target: '.seg' },
  { emoji: '🧰', title: '도구·컴파일도 위에', body: '창작 스튜디오·도구 허브는 ‘도구’ 메뉴에, 컴파일 버튼은 툴바에 있어요. ⌘K 로 검색 실행도 그대로.', target: '.toolbar' },
  { emoji: '↩️', title: '언제든 돌아갈 수 있어요', body: '오른쪽 위 ‘Studio’ 버튼으로 언제든 모던 UI 로 복귀! 원고·데이터는 완전히 동일하게 보존됩니다.', target: '.toolbar' },
]

export default function SkinCoach({ skin, onClose }: { skin: 'classic' | 'studio'; onClose: () => void }) {
  const steps = skin === 'studio' ? STEPS_TO_STUDIO : STEPS_TO_CLASSIC
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const step = steps[i]
  const last = i === steps.length - 1

  useEffect(() => {
    const measure = () => {
      try { const el = step.target ? document.querySelector(step.target) : null; setRect(el ? el.getBoundingClientRect() : null) } catch { setRect(null) }
    }
    measure()
    const t = window.setTimeout(measure, 150)
    return () => window.clearTimeout(t)
  }, [i, step.target])

  useLayoutEffect(() => {
    const b = bubbleRef.current
    if (!b) return
    const bw = b.offsetWidth, bh = b.offsetHeight, vw = window.innerWidth, vh = window.innerHeight
    if (!rect) { setPos({ left: (vw - bw) / 2, top: (vh - bh) / 2 }); return }
    // 대상 근처(아래 우선, 공간 없으면 오른쪽/중앙) + 화면 클램프
    let left = rect.left + rect.width / 2 - bw / 2
    let top = rect.bottom + 14
    if (top + bh > vh - 8) { top = Math.max(8, rect.top + rect.height / 2 - bh / 2); left = rect.right + 14 }
    left = Math.max(8, Math.min(left, vw - bw - 8))
    top = Math.max(8, Math.min(top, vh - bh - 8))
    setPos({ left, top })
  }, [rect, i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="tour-root" role="dialog" aria-modal="false" aria-label="새 화면 안내">
      {rect ? (
        <div className="tour-spotlight" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      ) : (
        <div className="tour-dim" onClick={onClose} />
      )}
      <div ref={bubbleRef} className="tour-bubble" style={{ left: pos.left, top: pos.top }}>
        <button className="tour-x" aria-label="안내 닫기" title="닫기 (Esc)" onClick={onClose}>×</button>
        <div className="tour-head"><span className="tour-emoji" aria-hidden>{step.emoji}</span><span className="tour-title">{step.title}</span></div>
        <div className="tour-body">{step.body}</div>
        <div className="tour-foot">
          <button className="tour-skip" onClick={onClose}>그만 보기</button>
          <span style={{ flex: 1 }} />
          <span className="tour-count">{i + 1} / {steps.length}</span>
          {i > 0 && <button className="tour-btn ghost" onClick={() => setI(i - 1)}>이전</button>}
          <button className="tour-btn primary" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? '확인' : '다음'}</button>
        </div>
      </div>
    </div>
  )
}
