import { useEffect, useRef, useState } from 'react'
import { X, GripVertical } from 'lucide-react'

// 전역 스크래치패드 — 프로젝트와 무관한 빠른 메모. localStorage 에 보관.
const KEY = 'sry:scratchpad'
const POS_KEY = 'sry:scratchpad:pos'

interface Box {
  x: number
  y: number
  w: number // 사용자가 원하는 크기(데스크톱). 표시 시에만 뷰포트로 클램프하고, 저장/복원은 이 값을 유지한다.
  h: number
}

// 위치만 뷰포트 안으로 클램프(헤더가 항상 보이도록). 크기는 건드리지 않는다(작은 창에서 영구 축소되는 버그 방지).
function clampPos(b: Box): Box {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = Math.max(8 - b.w + 60, Math.min(b.x, vw - 60))
  const y = Math.max(8, Math.min(b.y, vh - 40))
  return { ...b, x, y }
}

function loadBox(): Box {
  const def: Box = { x: window.innerWidth - 316, y: window.innerHeight - 372, w: 300, h: 320 }
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return clampPos(def)
    const p = JSON.parse(raw)
    if (typeof p.x === 'number' && typeof p.y === 'number')
      return clampPos({ x: p.x, y: p.y, w: p.w || def.w, h: p.h || def.h })
  } catch {
    /* noop */
  }
  return clampPos(def)
}

export default function Scratchpad({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(KEY) || ''
    } catch {
      return ''
    }
  })
  const [box, setBox] = useState<Box>(loadBox)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const didMount = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const dispRef = useRef<{ w: number; h: number }>({ w: box.w, h: box.h })

  // 본문 자동 저장(디바운스) — 마운트 첫 실행은 건너뛴다(방금 읽은 값을 되쓰면서 다른 탭 편집을 덮어쓰는 레이스 방지).
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, text)
      } catch {
        /* noop */
      }
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [text])

  // 다른 탭에서 스크래치패드가 바뀌면 반영(last-writer-wins 손실 방지)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue != null) setText(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const persistBox = (b: Box) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(b))
    } catch {
      /* noop */
    }
  }

  // 창 크기 변경 시 위치만 다시 클램프(원하는 크기 w/h 는 보존 → 창을 키우면 원래 크기로 복원됨)
  useEffect(() => {
    const onResize = () => setBox((b) => clampPos(b))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onHeadPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHeadPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setBox(clampPos({ ...box, x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }))
  }
  const onHeadPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    persistBox(box)
  }

  // CSS resize 결과를 영속화 — 실제로 표시 크기에서 변했을 때만(단순 클릭은 무시) 원하는 크기로 갱신
  const onResizeEnd = () => {
    const el = rootRef.current
    if (!el) return
    const ow = el.offsetWidth, oh = el.offsetHeight
    const d = dispRef.current
    if (Math.abs(ow - d.w) > 2 || Math.abs(oh - d.h) > 2) {
      const nb = { ...box, w: ow, h: oh }
      setBox(nb)
      persistBox(nb)
    }
  }

  // 표시 크기: 원하는 크기를 뷰포트로 클램프(상태/저장값은 원본 유지)
  const dispW = Math.min(box.w, window.innerWidth - 16)
  const dispH = Math.min(box.h, window.innerHeight - 16)
  dispRef.current = { w: dispW, h: dispH }

  return (
    <div
      ref={rootRef}
      className="scratchpad"
      role="dialog"
      aria-label="스크래치패드"
      style={{ left: box.x, top: box.y, width: dispW, height: dispH, right: 'auto', bottom: 'auto' }}
      onMouseUp={onResizeEnd}
    >
      <div
        className="scratchpad-head"
        onPointerDown={onHeadPointerDown}
        onPointerMove={onHeadPointerMove}
        onPointerUp={onHeadPointerUp}
        title="드래그하여 이동"
      >
        <span className="scratchpad-grip">
          <GripVertical size={12} /> 스크래치패드
        </span>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="스크래치패드 닫기">
          <X size={12} />
        </button>
      </div>
      <textarea
        className="scratchpad-body"
        placeholder="프로젝트와 무관한 빠른 메모… (모든 프로젝트에서 공유, 자동 저장)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
    </div>
  )
}
