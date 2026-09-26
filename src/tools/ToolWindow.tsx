// 재사용 플로팅 도구 창 — 헤더 드래그 이동 + 크기 조절 + 최소화 + 닫기. 위치/크기 localStorage 영속.
// 개선: 헤더가 항상 화면 안(회수 가능), 클릭 시 맨 앞으로(다중 창), 터치/창밖 release 에도 크기 영속,
//       좁은 화면에서 저장 크기가 깎이지 않음.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, GripVertical, Minus, ExternalLink, CornerDownLeft, Maximize2, Minimize2, Star } from 'lucide-react'
import PortalWindow from '../components/PortalWindow'

const flash = (m: string) => { try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m })) } catch { /* noop */ } }

// 관련 도구 스트립(앱 창/분리 창 공용)
function RelatedStrip({ related, onOpenRelated }: { related?: { id: string; name: string; icon?: ReactNode }[]; onOpenRelated?: (id: string) => void }) {
  if (!related || related.length === 0 || !onOpenRelated) return null
  return (
    <div className="toolwin-related" title="관련 도구 — 클릭해서 함께 열기">
      <span className="toolwin-related-label">🔗 관련</span>
      <div className="toolwin-related-chips">
        {related.map((r) => (
          <button key={r.id} className="toolwin-related-chip" onClick={() => onOpenRelated(r.id)} title={r.name}>
            <span>{r.icon}</span>{r.name}
          </button>
        ))}
      </div>
    </div>
  )
}

interface Box { x: number; y: number; w: number; h: number }

const HDR = 36   // 헤더 높이(세로로 항상 보이게)
const KEEP = 120 // 가로로 최소 이만큼은 화면 안에 남겨 헤더를 다시 잡을 수 있게

// 전역 UI 스케일(<html> zoom). CSS zoom 하에서 innerWidth/Height 는 미확대(시각) 값이므로
// 레이아웃 px(left/top/width 단위) 가용 영역 = innerWidth/Z, innerHeight/Z 로 환산해야 한다.
function appZoom(): number {
  const z = parseFloat((document.documentElement.style as unknown as { zoom: string }).zoom)
  return z > 0.2 && z < 5 ? z : 1
}
function viewW(): number { return window.innerWidth / appZoom() }
function viewH(): number { return window.innerHeight / appZoom() }

function clampPos(b: Box): Box {
  const vw = viewW(), vh = viewH()
  return {
    ...b,
    x: Math.max(KEEP - b.w, Math.min(b.x, vw - KEEP)),
    y: Math.max(8, Math.min(b.y, vh - HDR - 8)),
  }
}

export default function ToolWindow({
  id,
  title,
  icon,
  onClose,
  onMinimize,
  onActivate,
  z,
  children,
  defaultW = 360,
  defaultH = 460,
  offsetIndex = 0,
  related,
  onOpenRelated,
  favorited,
  onToggleFav,
  minimized,
}: {
  id: string
  title: string
  icon?: ReactNode
  minimized?: boolean
  onClose: () => void
  onMinimize?: () => void
  onActivate?: () => void
  z?: number
  children: ReactNode
  defaultW?: number
  defaultH?: number
  offsetIndex?: number
  related?: { id: string; name: string; icon?: ReactNode }[]
  onOpenRelated?: (id: string) => void
  favorited?: boolean
  onToggleFav?: () => void
}) {
  const KEY = 'sry:toolwin:' + id
  const load = (): Box => {
    const def: Box = { x: Math.max(8, viewW() - defaultW - 24 - offsetIndex * 28), y: 80 + offsetIndex * 28, w: defaultW, h: defaultH }
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) { const p = JSON.parse(raw); if (typeof p.x === 'number') return clampPos({ x: p.x, y: p.y, w: p.w || def.w, h: p.h || def.h }) }
    } catch { /* noop */ }
    return clampPos(def)
  }
  const [box, setBox] = useState<Box>(load)
  const [detached, setDetached] = useState(false)
  const [maxed, setMaxed] = useState(false)
  // 창 드래그 중에만 화면 가장자리에 뜨는 임시 즐겨찾기 드롭 핫존(인스펙터 탭과 무관하게 항상 사용 가능).
  const [dragging, setDragging] = useState(false)
  const [hotOver, setHotOver] = useState(false)
  const prevBox = useRef<Box | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // 전역 UI 스케일(zoom) 하에서 포인터 좌표(시각 px)와 레이아웃 px(left/top)의 배율차를 보정.
  const drag = useRef<{ cx: number; cy: number; bx: number; by: number; z: number } | null>(null)
  const dispRef = useRef({ w: box.w, h: box.h })
  const boxRef = useRef(box)
  boxRef.current = box
  const persist = (b: Box) => { try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* noop */ } }

  useEffect(() => {
    const onResize = () => setBox((b) => clampPos(b))
    // 타일 정렬(앱에서 'scriv:tile-tools' 디스패치): detail 배열에서 이 창의 인덱스를 찾아 격자 배치.
    const onTile = (e: Event) => {
      const ids = (e as CustomEvent).detail as string[] | undefined
      if (!Array.isArray(ids)) return
      const idx = ids.indexOf(id)
      if (idx < 0) return
      const W = viewW(), H = viewH()
      const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(ids.length))))
      const rows = Math.max(1, Math.ceil(ids.length / cols))
      const gap = 10, top = 64
      const cw = Math.max(260, Math.floor((W - gap * (cols + 1)) / cols))
      const ch = Math.max(220, Math.floor((H - top - gap * (rows + 1)) / rows))
      const c = idx % cols, r = Math.floor(idx / cols)
      const nb = clampPos({ x: gap + c * (cw + gap), y: top + r * (ch + gap), w: cw, h: ch })
      setMaxed(false)
      setBox(nb); persist(nb)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scriv:uiscale', onResize) // 전역 글자 크기 변경 시 위치 재정렬
    window.addEventListener('scriv:tile-tools', onTile as EventListener)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scriv:uiscale', onResize); window.removeEventListener('scriv:tile-tools', onTile as EventListener) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 크기 변경 영속화: ResizeObserver(터치/펜 포함) + 디바운스. 좁은 화면 클램프 상태에선 저장 크기를 깎지 않음.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let t: ReturnType<typeof setTimeout> | undefined
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t)
      t = setTimeout(() => {
        // 최소화(display:none) 등으로 숨겨져 offset 이 0 인 동안엔 크기를 저장/반영하지 않는다.
        //  (안 그러면 즐겨찾기로 최소화→다시 열기 시 box 가 0×0 으로 줄어 '아주 작은 창'으로 뜨는 버그)
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return
        const maxW = viewW() - 8, maxH = viewH() - 8
        const b = boxRef.current
        let nw = b.w, nh = b.h
        if (el.offsetWidth < maxW - 1 && Math.abs(el.offsetWidth - dispRef.current.w) > 2) nw = el.offsetWidth
        if (el.offsetHeight < maxH - 1 && Math.abs(el.offsetHeight - dispRef.current.h) > 2) nh = el.offsetHeight
        if (nw !== b.w || nh !== b.h) { const nb = { ...b, w: nw, h: nh }; setBox(nb); persist(nb) }
      }, 220)
    })
    ro.observe(el)
    return () => { if (t) clearTimeout(t); ro.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 열릴 때(또는 최소화 해제 시) 본문 첫 포커스 가능 요소로 초기 포커스 이동 — 키보드 진입 동선.
  // 기존 입력 포커스가 이미 창 안이면 건드리지 않는다(사용자 입력 흐름 보존).
  useEffect(() => {
    if (minimized) return
    const el = rootRef.current
    if (!el) return
    const id = window.setTimeout(() => {
      const active = document.activeElement
      if (active && el.contains(active)) return
      const focusable = el.querySelector<HTMLElement>(
        '.toolwin-body input, .toolwin-body textarea, .toolwin-body select, .toolwin-body button, .toolwin-body [href], .toolwin-body [tabindex]:not([tabindex="-1"]), .toolwin-body [contenteditable="true"]'
      )
      try { (focusable || el).focus({ preventScroll: true }) } catch { /* noop */ }
    }, 0)
    return () => window.clearTimeout(id)
  }, [minimized])

  // 이 창이 화면 맨 앞(z-index 최상위 .toolwin)인지 판별 — 다중 창에서 Esc 는 맨 앞 창만 닫는다.
  const isFrontmost = (): boolean => {
    const el = rootRef.current
    if (!el) return false
    const myZ = z || 160
    const wins = Array.from(document.querySelectorAll<HTMLElement>('.toolwin'))
    for (const w of wins) {
      if (w === el) continue
      if (w.style.display === 'none') continue // 최소화된 창 무시
      const wz = parseInt(w.style.zIndex || '160', 10) || 160
      if (wz > myZ) return false
    }
    return true
  }

  // Esc 닫기 — IME 조합 중(isComposing)에는 무시, 맨 앞 창에서만 닫는다.
  const onContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return
    if (!isFrontmost()) return
    e.stopPropagation()
    e.preventDefault()
    onClose()
  }

  // 창을 끌어 '즐겨찾기 패널(data-fav-drop)' 위에서 놓으면 즐겨찾기에 추가 + 최소화.
  // 창이 커서를 따라다녀 가리므로 elementsFromPoint(복수)로 창 아래의 드롭존을 찾는다.
  const favZoneRef = useRef<Element | null>(null)
  const favZoneAt = (x: number, y: number): Element | null => {
    if (!onToggleFav) return null
    const stack = document.elementsFromPoint(x, y)
    for (const el of stack) { const z = (el as HTMLElement).closest?.('[data-fav-drop]'); if (z) return z }
    return null
  }
  const setFavHover = (zone: Element | null) => {
    if (favZoneRef.current && favZoneRef.current !== zone) favZoneRef.current.classList.remove('fav-drop-active')
    if (zone) zone.classList.add('fav-drop-active')
    favZoneRef.current = zone
  }
  // 화면 좌측 가장자리에 뜨는 임시 핫존 위인가(인스펙터 탭 없이도 항상 동작).
  const overHotzone = (x: number): boolean => !!onToggleFav && x <= 132
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    drag.current = { cx: e.clientX, cy: e.clientY, bx: box.x, by: box.y, z: appZoom() }
    if (onToggleFav) setDragging(true) // 즐겨찾기 가능 창일 때만 핫존 표시
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    // 시각 px 이동량을 레이아웃 px(left/top 단위)로 환산(zoom 보정)
    setBox(clampPos({ ...box, x: d.bx + (e.clientX - d.cx) / d.z, y: d.by + (e.clientY - d.cy) / d.z }))
    // 인스펙터 즐겨찾기 패널이 열려 있으면 그 위, 아니면 가장자리 임시 핫존을 강조.
    const zone = favZoneAt(e.clientX, e.clientY)
    setFavHover(zone)
    setHotOver(!zone && overHotzone(e.clientX))
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    const startX = drag.current.cx
    drag.current = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
    const zone = favZoneRef.current
    const onHot = !zone && overHotzone(e.clientX)
    const moved = Math.abs(e.clientX - startX) > 3 // 단순 클릭(이동 없음)은 즐겨찾기로 처리하지 않음
    setFavHover(null)
    setHotOver(false)
    setDragging(false)
    persist(boxRef.current)
    // 즐겨찾기 패널/임시 핫존 위에서 놓음 → 추가(이미 있으면 그대로) 후 최소화
    if ((zone || (onHot && moved)) && onToggleFav) {
      if (!favorited) { onToggleFav(); flash(`‘${title}’을(를) 즐겨찾기에 추가했어요.`) }
      else flash('이미 즐겨찾기에 있어요.')
      if (onMinimize) onMinimize()
    } else if (onToggleFav && moved && e.clientX < 200 && !favorited) {
      // 즐겨찾기에 닿을 듯 말 듯 가장자리 근처에서 놓쳤을 때만 안내(과도한 토스트 방지).
      flash('즐겨찾기에 추가하려면 왼쪽 가장자리 영역까지 끌어다 놓으세요.')
    }
  }
  const toggleMax = () => {
    if (maxed) {
      const b = prevBox.current
      setMaxed(false)
      if (b) { setBox(clampPos(b)); persist(b) }
    } else {
      prevBox.current = boxRef.current
      // 상단 툴바(약 50px)·하단 여백을 피해 '작업 영역'을 채운다(툴바·메뉴가 안 가리도록).
      const TOP = 52
      const nb = clampPos({ x: 6, y: TOP, w: viewW() - 12, h: viewH() - TOP - 10 })
      setMaxed(true)
      setBox(nb); persist(nb)
    }
  }

  const dispW = Math.min(box.w, viewW() - 8)
  const dispH = Math.min(box.h, viewH() - 8)
  dispRef.current = { w: dispW, h: dispH }

  // 분리 모드: 별도 OS 창(다른 모니터 가능). 앱 창은 사라지고 도구는 팝업에 산다.
  if (detached) {
    return (
      <PortalWindow title={title} width={box.w} height={box.h} onClose={() => setDetached(false)}>
        <div className="popout-shell" ref={rootRef}>
          <div className="popout-head">
            <span className="popout-title">{icon || <GripVertical size={13} />} {title}</span>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <button className="minibtn" onClick={() => setDetached(false)} title="앱 창으로 되돌리기"><CornerDownLeft size={13} /> 되돌리기</button>
              <button className="minibtn" onClick={onClose} title="닫기"><X size={13} /></button>
            </span>
          </div>
          <div className="popout-body">{children}</div>
          <RelatedStrip related={related} onOpenRelated={onOpenRelated} />
        </div>
      </PortalWindow>
    )
  }

  // 즐겨찾기 패널이 (인스펙터에) 이미 열려 있는지 — 'X패널로 드래그 가능' 문구를 조건부로만 노출.
  const favPanelOpen = typeof document !== 'undefined' && !!document.querySelector('[data-fav-drop]')
  const favTitle = favorited
    ? '즐겨찾기 해제'
    : (favPanelOpen ? '즐겨찾기에 추가 (또는 즐겨찾기 패널로 드래그)' : '즐겨찾기에 추가 (헤더를 화면 왼쪽 가장자리로 끌어다 놓아도 추가)')

  return (
    <div ref={rootRef} className="toolwin" data-tool-id={id} role="dialog" aria-label={title} aria-hidden={minimized || undefined} tabIndex={-1}
      style={{ left: box.x, top: box.y, width: dispW, height: dispH, zIndex: z || 160, resize: maxed ? 'none' : undefined, display: minimized ? 'none' : undefined }}
      onKeyDown={onContainerKeyDown}
      onPointerDownCapture={() => onActivate?.()}>
      {/* 창 드래그 중에만 뜨는 임시 즐겨찾기 드롭 핫존(인스펙터 탭 없이도 항상 사용 가능) */}
      {dragging && onToggleFav && !favPanelOpen && (
        <div className={'toolwin-fav-hotzone' + (hotOver ? ' over' : '')} aria-hidden style={{ zIndex: (z || 160) + 1 }}>
          <Star size={18} fill={hotOver ? 'currentColor' : 'none'} />
          <span>여기에 놓으면<br />즐겨찾기</span>
        </div>
      )}
      <div className="toolwin-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} title="드래그하여 이동">
        <span className="toolwin-title">{icon || <GripVertical size={12} />} {title}</span>
        <span style={{ display: 'inline-flex', gap: 2 }}>
          {onToggleFav && (
            <button
              className="minibtn"
              onClick={onToggleFav}
              draggable
              onDragStart={(e) => { try { e.dataTransfer.setData('text/fav', JSON.stringify({ id: 'tool:' + id, label: title })); e.dataTransfer.effectAllowed = 'copy' } catch { /* noop */ } }}
              title={favTitle}
              aria-label="즐겨찾기"
              style={favorited ? { color: 'var(--accent)' } : undefined}
            ><Star size={13} fill={favorited ? 'currentColor' : 'none'} /></button>
          )}
          <button className="minibtn" onClick={() => setDetached(true)} title="다른 창으로 분리 (다중 모니터)" aria-label="창 분리"><ExternalLink size={13} /></button>
          <button className="minibtn" onClick={toggleMax} title={maxed ? '창 복원' : '창 최대화'} aria-label={maxed ? '창 복원' : '창 최대화'}>{maxed ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
          {onMinimize && <button className="minibtn" onClick={onMinimize} title="최소화 (하단 독으로)" aria-label="최소화"><Minus size={13} /></button>}
          <button className="minibtn" onClick={onClose} title="닫기 (Esc)" aria-label="닫기"><X size={13} /></button>
        </span>
      </div>
      <div className="toolwin-body">{children}</div>
      <RelatedStrip related={related} onOpenRelated={onOpenRelated} />
    </div>
  )
}
