// 스토리 타임라인 뷰 — 장면을 스윔레인(장/POV/플롯라인)으로 묶어 읽기 순서대로 가로 배치한다.
// 카드 클릭 시 해당 장면을 선택하고 에디터로 이동. 스토리시간 정렬 토글 지원.
import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { sceneList, type Scene } from '../creative/scenes'
import { POV_KEY, STORYTIME_KEY, PLOTLINE_KEY } from '../creative/structure'

type LaneBy = 'chapter' | 'pov' | 'plotline'

interface Lane {
  key: string
  label: string
  scenes: Scene[]
}

const UNSET = '(미지정)'

/** 장면의 스토리시간 메타(없으면 빈 문자열). */
function storyTimeOf(sc: Scene): string {
  return (sc.item.customMeta?.[STORYTIME_KEY] || '').trim()
}

/** 선택된 기준으로 장면을 스윔레인으로 분류한다. 플롯라인은 한 장면이 여러 레인에 중복 배치될 수 있다. */
function buildLanes(scenes: Scene[], by: LaneBy): Lane[] {
  const order: string[] = []
  const map = new Map<string, Lane>()
  const push = (key: string, label: string, sc: Scene) => {
    let lane = map.get(key)
    if (!lane) {
      lane = { key, label, scenes: [] }
      map.set(key, lane)
      order.push(key)
    }
    lane.scenes.push(sc)
  }

  for (const sc of scenes) {
    if (by === 'chapter') {
      push(sc.chapterId ?? '__nochapter__', sc.chapterTitle || '(장 없음)', sc)
    } else if (by === 'pov') {
      const pov = (sc.item.customMeta?.[POV_KEY] || '').trim()
      push(pov || UNSET, pov || UNSET, sc)
    } else {
      const lines = Array.from(new Set(
        (sc.item.customMeta?.[PLOTLINE_KEY] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ))
      if (lines.length === 0) push(UNSET, UNSET, sc)
      else lines.forEach((l) => push(l, l, sc))
    }
  }

  return order.map((k) => map.get(k)!)
}

/** 드롭 위치 표시용 상태: 어느 레인의 어느 카드 기준 앞/뒤에 떨어뜨릴지. */
interface DropTarget {
  laneKey: string
  sceneId: string
  position: 'before' | 'after'
}

export default function TimelineView() {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const moveItem = useStore((s) => s.moveItem)

  const [laneBy, setLaneBy] = useState<LaneBy>('chapter')
  const [sortByTime, setSortByTime] = useState(false)
  // 드래그 중인 장면 id 와 현재 드롭 후보 위치(시각 표시용).
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  // 드래그 1회당 '다른 장으로는 이동 불가' 안내를 한 번만 띄우기 위한 기록(마지막으로 안내한 dragId).
  const flashedDragRef = useRef<string | null>(null)

  // App 전역 토스트로 사유를 안내한다(Editor.tsx 의 scriv:flash 패턴 재사용).
  const flash = (msg: string) =>
    window.dispatchEvent(new CustomEvent('scriv:flash', { detail: msg }))

  // 인스펙터를 메타 탭으로 연다 — POV/플롯라인/스토리시간 입력 경로 안내(GuidedManual 의 setState 패턴 재사용).
  const openInspectorMeta = (sceneId?: string) => {
    if (sceneId) select(sceneId)
    useStore.setState({ inspectorVisible: true, inspectorTab: 'meta' })
  }

  const scenes = useMemo(() => sceneList(project), [project])

  const lanes = useMemo(() => {
    const built = buildLanes(scenes, laneBy)
    if (!sortByTime) return built
    // 스토리시간 문자열 기준 정렬(없는 장면은 뒤로, 안정 정렬로 동률은 읽기순 유지).
    return built.map((lane) => ({
      ...lane,
      scenes: [...lane.scenes].sort((a, b) => {
        const ta = storyTimeOf(a)
        const tb = storyTimeOf(b)
        if (ta && tb) {
          const cmp = ta.localeCompare(tb, undefined, { numeric: true })
          return cmp !== 0 ? cmp : a.index - b.index
        }
        if (ta) return -1
        if (tb) return 1
        return a.index - b.index
      }),
    }))
  }, [scenes, laneBy, sortByTime])

  const openScene = (id: string) => {
    select(id)
    setView('editor')
  }

  // 수동 순서변경은 스토리시간순 정렬이 꺼져 있을 때만 의미가 있다.
  const dndEnabled = !sortByTime

  const clearDrag = () => {
    setDragId(null)
    setDropTarget(null)
  }

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDragId(sceneId)
    flashedDragRef.current = null
    e.dataTransfer.effectAllowed = 'move'
    // 일부 브라우저는 데이터가 있어야 드래그를 시작한다.
    try {
      e.dataTransfer.setData('text/plain', sceneId)
    } catch {
      /* setData 미지원 환경 무시 */
    }
  }

  const handleDragOver = (e: React.DragEvent, laneKey: string, sc: Scene) => {
    if (!dragId || dragId === sc.id) return
    // 부모(장 폴더)가 다른 카드 사이로는 드롭 자체를 허용하지 않는다 —
    // preventDefault 를 생략해 브라우저가 금지 커서를 보여 주고, 삽입선도 그리지 않는다.
    // 이전에는 삽입선을 보여준 뒤 드롭이 조용히 무시되어 혼란을 줬으므로, 드래그당 1회 이유를 토스트로 안내한다.
    const items = useStore.getState().project.items
    const srcParent = items[dragId]?.parentId
    const dstParent = items[sc.id]?.parentId
    if (!srcParent || !dstParent || srcParent !== dstParent) {
      if (flashedDragRef.current !== dragId) {
        flashedDragRef.current = dragId
        flash('다른 장(폴더)의 장면 사이로는 옮길 수 없어요 — 타임라인은 같은 장 안 순서만 바꿉니다. 장 사이 이동은 좌측 바인더에서 끌어 옮기세요.')
      }
      setDropTarget(null)
      return
    }
    e.preventDefault() // drop 을 허용하려면 필수
    e.dataTransfer.dropEffect = 'move'
    // 카드의 가로 중앙을 기준으로 좌(before)/우(after) 결정.
    const rect = e.currentTarget.getBoundingClientRect()
    const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
    setDropTarget((prev) =>
      prev && prev.laneKey === laneKey && prev.sceneId === sc.id && prev.position === position
        ? prev
        : { laneKey, sceneId: sc.id, position },
    )
  }

  const handleDrop = (e: React.DragEvent, target: Scene, position: 'before' | 'after') => {
    e.preventDefault()
    const sourceId = dragId
    clearDrag()
    if (!sourceId || sourceId === target.id) return

    // 대상 카드가 속한 부모(보통 같은 장 폴더)와 그 안에서의 인덱스를 store 에서 직접 조회한다.
    const items = useStore.getState().project.items
    const source = items[sourceId]
    const dst = items[target.id]
    if (!source || !dst) return
    const newParentId = dst.parentId
    if (!newParentId) return // 원고 루트 직속(부모 없음)은 재배치 대상 외
    // 같은 부모(형제) 간 재배치만 허용 — POV/플롯라인 레인에서 다른 章 폴더로
    // 장면이 조용히 이동(원고 구조 변경)하는 것을 막는다. (Outliner.tsx:290 패턴)
    // handleDragOver 에서 이미 금지되지만, 상태 경합 등으로 드롭이 도달한 경우에도 조용히 무시하지 않고 이유를 알린다.
    if (source.parentId !== newParentId) {
      flash('다른 장(폴더)의 장면 사이로는 옮길 수 없어요 — 타임라인은 같은 장 안 순서만 바꿉니다. 장 사이 이동은 좌측 바인더에서 끌어 옮기세요.')
      return
    }
    const parent = items[newParentId]
    if (!parent) return
    const tIdx = parent.childIds.indexOf(target.id)
    if (tIdx < 0) return
    const index = position === 'after' ? tIdx + 1 : tIdx
    // moveItem 은 같은 부모 내 아래로 끌 때의 인덱스 보정(원본 childIds 기준)을 자체 처리한다.
    moveItem(sourceId, newParentId, index)
  }

  const LANE_OPTS: { key: LaneBy; label: string }[] = [
    { key: 'chapter', label: '장(Chapter)' },
    { key: 'pov', label: 'POV' },
    { key: 'plotline', label: '플롯라인' },
  ]

  const toolbar = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--chrome)',
        flexWrap: 'wrap',
      }}
    >
      <strong style={{ color: 'var(--text)' }}>스토리 타임라인</strong>
      <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>스윔레인</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {LANE_OPTS.map((o) => (
          <button
            key={o.key}
            className={'minibtn' + (laneBy === o.key ? ' active' : '')}
            onClick={() => setLaneBy(o.key)}
            style={
              laneBy === o.key
                ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                : undefined
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
        <input type="checkbox" checked={sortByTime} onChange={(e) => setSortByTime(e.target.checked)} />
        스토리시간순 정렬
      </label>
      <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        {dndEnabled
          ? '카드를 끌어 같은 장(폴더) 안에서 순서를 바꿀 수 있습니다. 장 사이 이동은 바인더에서 하세요.'
          : '스토리시간순 정렬 중에는 수동 순서변경이 비활성화됩니다.'}
      </span>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {toolbar}
      {scenes.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--muted)',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>표시할 장면이 없습니다</div>
          <div style={{ fontSize: 13, maxWidth: 420, lineHeight: 1.6 }}>
            원고(Draft)에 텍스트 문서를 추가하면 타임라인에 장면 카드로 나타납니다.
            장면을 선택한 뒤 <strong style={{ color: 'var(--text)' }}>인스펙터 → 메타 탭</strong>에서
            POV·플롯라인·스토리시간을 입력하면 스윔레인과 정렬을 활용할 수 있습니다.
          </div>
          <button className="minibtn" style={{ marginTop: 4 }} onClick={() => openInspectorMeta()}>
            인스펙터 메타 탭 열기
          </button>
        </div>
      ) : lanes.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--muted)',
            fontSize: 13,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div>
            장면 {scenes.length}개가 있지만 현재 기준({LANE_OPTS.find((o) => o.key === laneBy)?.label})에 해당하는 레인이 없습니다.
            인스펙터 → 메타 탭에서 값을 입력하거나 기준을 바꿔 보세요.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="minibtn" onClick={() => openInspectorMeta(scenes[0]?.id)}>
              인스펙터 메타 탭 열기
            </button>
            <button className="minibtn" onClick={() => setLaneBy('chapter')}>
              기준을 장(Chapter)으로
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'max-content' }}>
            {lanes.map((lane) => (
              <div
                key={lane.key}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  borderBottom: '1px solid var(--border)',
                  minHeight: 96,
                }}
              >
                {/* 좌측 고정 레인 라벨 */}
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    width: 160,
                    minWidth: 160,
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    background: 'var(--panel)',
                    borderRight: '1px solid var(--border-dark)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={lane.label}
                  >
                    {lane.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lane.scenes.length}개 장면</div>
                  {laneBy !== 'chapter' && lane.key === UNSET && (
                    // 미지정 레인이 막다른 길이 되지 않도록: 첫 장면을 선택하고 인스펙터 메타 탭(입력 경로)을 연다.
                    <button
                      className="minibtn"
                      style={{ alignSelf: 'flex-start', fontSize: 10.5 }}
                      title={
                        (laneBy === 'pov' ? 'POV' : '플롯라인') +
                        ' 미입력 — 첫 장면을 선택하고 인스펙터 메타 탭을 엽니다'
                      }
                      onClick={() => openInspectorMeta(lane.scenes[0]?.id)}
                    >
                      메타 탭에서 입력 →
                    </button>
                  )}
                </div>

                {/* 카드들: 읽기/스토리시간 순으로 가로 배열 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    flex: 1,
                  }}
                >
                  {lane.scenes.map((sc, i) => {
                    const time = storyTimeOf(sc)
                    const isDragging = dragId === sc.id
                    const isDropHere = dropTarget?.laneKey === lane.key && dropTarget?.sceneId === sc.id
                    return (
                      <button
                        key={sc.id + ':' + i}
                        onClick={() => openScene(sc.id)}
                        title={dndEnabled ? sc.title + '\n(드래그하여 순서 변경)' : sc.title}
                        draggable={dndEnabled}
                        onDragStart={dndEnabled ? (e) => handleDragStart(e, sc.id) : undefined}
                        onDragOver={dndEnabled ? (e) => handleDragOver(e, lane.key, sc) : undefined}
                        onDrop={
                          dndEnabled
                            ? (e) => handleDrop(e, sc, dropTarget?.sceneId === sc.id ? dropTarget.position : 'before')
                            : undefined
                        }
                        onDragEnd={dndEnabled ? clearDrag : undefined}
                        style={{
                          textAlign: 'left',
                          cursor: dndEnabled ? 'grab' : 'pointer',
                          width: 180,
                          minWidth: 180,
                          boxSizing: 'border-box',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          borderLeft: '3px solid var(--accent)',
                          background: 'var(--paper)',
                          color: 'var(--text)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          opacity: isDragging ? 0.4 : 1,
                          // 드롭 후보 카드의 좌/우 경계에 삽입 위치선을 그린다.
                          boxShadow: isDropHere
                            ? dropTarget?.position === 'before'
                              ? 'inset 3px 0 0 0 var(--accent)'
                              : 'inset -3px 0 0 0 var(--accent)'
                            : undefined,
                          transition: 'opacity 0.1s, box-shadow 0.1s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-2)' }}>#{sc.index + 1}</span>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sc.chapterTitle}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {sc.title || '(제목 없는 장면)'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {(sc.item.charCount || 0).toLocaleString()}자
                          </span>
                          {time && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 999,
                                background: 'var(--chrome-2)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                              }}
                              title={'스토리시간: ' + time}
                            >
                              ⏱ {time}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
