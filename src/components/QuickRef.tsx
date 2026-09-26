import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Icon } from '../ui/icons'
import { useStore } from '../store/store'
import { rtfToHtml } from '../rtf'

// 퀵 레퍼런스 — 다른 문서를 떠 있는 읽기 전용 패널로 열어 집필 중 참고(Scrivener Quick Reference/Copyholder).
export default function QuickRef({ id, index, onClose }: { id: string; index: number; onClose: () => void }) {
  const item = useStore((s) => s.project.items[id])
  const [pos, setPos] = useState({ x: 80 + index * 28, y: 90 + index * 28 })
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // 본문 HTML 메모이즈 — bodyRtf 가 바뀔 때만 재계산(200ms 마다 도는 리렌더에서 불필요한 변환 방지).
  const html = useMemo(() => rtfToHtml(item?.bodyRtf || ''), [item?.bodyRtf])

  // ref 기반으로 innerHTML 이 실제로 다를 때만 갱신하고, 갱신 전후 scrollTop 을 보존/복원한다.
  // (인라인 dangerouslySetInnerHTML 은 매 리렌더마다 자식을 교체해 스크롤이 0 으로 리셋됨 — Editor.tsx 동기화 가드와 동일 패턴)
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (el.innerHTML === html) return
    const prevScroll = el.scrollTop
    el.innerHTML = html
    el.scrollTop = prevScroll
    // item 존재 변화(삭제→복구 등)로 body div 가 재마운트되면 빈 노드를 다시 채워야 하므로 의존성에 포함.
  }, [html, item])

  const onHeadDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    const move = (ev: MouseEvent) => {
      const d = drag.current
      if (!d) return
      setPos({ x: Math.max(0, d.ox + ev.clientX - d.sx), y: Math.max(0, d.oy + ev.clientY - d.sy) })
    }
    const up = () => {
      drag.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div className="quickref" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label="퀵 레퍼런스">
      <div className="quickref-head" onMouseDown={onHeadDown}>
        <span className="quickref-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="reference" size={14} />{item ? item.title : '삭제된 문서'}</span>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="퀵 레퍼런스 닫기">
          <X size={12} />
        </button>
      </div>
      {item ? (
        <div className="quickref-body paper" ref={bodyRef} />
      ) : (
        <div className="quickref-body" style={{ color: 'var(--muted)', fontSize: 12 }}>문서를 찾을 수 없습니다.</div>
      )}
    </div>
  )
}
