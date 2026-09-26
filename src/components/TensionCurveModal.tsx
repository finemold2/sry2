import { useModal } from './useModal'
import { useStore } from '../store/store'
import { DRAFT_ROOT, type BinderItem, type Project } from '../model'

// 장면 긴장도 곡선(텐션 아크) — 원고 순서대로 각 장면의 긴장도(0~10)를 꺾은선으로.
function draftTexts(project: Project): BinderItem[] {
  const out: BinderItem[] = []
  const walk = (id: string) => {
    const it = project.items[id]
    if (!it) return
    if (it.type === 'text') out.push(it)
    it.childIds.forEach(walk)
  }
  project.items[DRAFT_ROOT]?.childIds.forEach(walk)
  return out
}

export default function TensionCurveModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const dialogRef = useModal<HTMLDivElement>(onClose)

  const texts = draftTexts(project)
  const pts = texts.map((t) => ({ id: t.id, title: t.title, v: parseInt(t.customMeta.tension || '0', 10) }))
  const rated = pts.filter((p) => p.v > 0)

  const W = 680
  const H = 280
  const padL = 28
  const padB = 28
  const padT = 16
  const innerW = W - padL - 12
  const innerH = H - padB - padT
  const x = (i: number) => padL + (pts.length <= 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / 10) * innerH
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')

  const go = (id: string) => {
    select(id)
    setView('editor')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 740, maxWidth: '94vw' }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>긴장도 곡선 (텐션 아크)</h2>
        <div className="modal-body">
          {rated.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              아직 긴장도가 매겨진 장면이 없습니다. 인스펙터 <b>메타 탭</b>의 "긴장도" 슬라이더로 각 장면에 0–10을 매겨 보세요.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                원고 순서(독자 체험 순서)대로 {pts.length}개 장면 · 점을 클릭하면 그 장면으로 이동합니다.
              </div>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="tension-svg">
                {/* 가이드 라인 */}
                {[0, 2.5, 5, 7.5, 10].map((g) => (
                  <g key={g}>
                    <line x1={padL} y1={y(g)} x2={W - 12} y2={y(g)} stroke="var(--border)" strokeWidth={1} />
                    <text x={4} y={y(g) + 3} fontSize={9} fill="var(--muted)">
                      {g}
                    </text>
                  </g>
                ))}
                <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} />
                {pts.map((p, i) => (
                  <g key={p.id} onClick={() => go(p.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={x(i)} cy={y(p.v)} r={5} fill={p.v >= 8 ? 'var(--warn)' : 'var(--accent)'} />
                    <title>
                      {p.title}: 긴장도 {p.v}
                    </title>
                  </g>
                ))}
              </svg>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                팁: 중반이 평탄하면 늘어지는 느낌, 클라이맥스 직전이 낮으면 김이 빠집니다. 상승–하강의 리듬을 보세요.
              </div>
            </>
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
