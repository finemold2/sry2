import { useMemo } from 'react'
import { Icon } from '../ui/icons'
import { useModal } from './useModal'
import { projectStatistics, wordFrequency } from '../analysis/statistics'
import { totalDraftWords, useStore } from '../store/store'
import { computeBadges, computeStreak } from '../analysis/streak'

export default function StatisticsModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const stats = useMemo(() => projectStatistics(project), [project])
  const freq = useMemo(() => wordFrequency(project, 30), [project])
  const streak = useMemo(() => computeStreak(project.writingHistory), [project])
  const draftWords = totalDraftWords(project)
  const badges = useMemo(() => computeBadges(streak, draftWords), [streak, draftWords])
  // 각 배지의 진행도 메타: id → { current, target, unit, metricLabel }.
  // computeBadges 와 동일한 기준값을 통계 화면 안에서 파생(원본 streak 모듈은 변형하지 않음).
  // streak3/7/30 은 longest(최장 연속), '현재 연속' 과 구분되도록 metricLabel 로 명시한다.
  const badgeProgress = useMemo(() => {
    const m: Record<string, { current: number; target: number; unit: string; metricLabel: string }> = {
      first: { current: streak.totalDays, target: 1, unit: '일', metricLabel: '총 집필일' },
      streak3: { current: streak.longest, target: 3, unit: '일', metricLabel: '최장 연속' },
      streak7: { current: streak.longest, target: 7, unit: '일', metricLabel: '최장 연속' },
      streak30: { current: streak.longest, target: 30, unit: '일', metricLabel: '최장 연속' },
      days30: { current: streak.totalDays, target: 30, unit: '일', metricLabel: '총 집필일' },
      best1k: { current: streak.personalBest, target: 1000, unit: '단어', metricLabel: '하루 최고' },
      best3k: { current: streak.personalBest, target: 3000, unit: '단어', metricLabel: '하루 최고' },
      words10k: { current: draftWords, target: 10000, unit: '단어', metricLabel: '원고' },
      words50k: { current: draftWords, target: 50000, unit: '단어', metricLabel: '원고' },
      words100k: { current: draftWords, target: 100000, unit: '단어', metricLabel: '원고' },
    }
    return m
  }, [streak, draftWords])
  const history = useMemo(
    () => Object.values(project.writingHistory).sort((a, b) => a.date.localeCompare(b.date)),
    [project],
  )
  const maxDay = Math.max(1, ...history.map((h) => h.words))

  const row = (k: string, v: string | number) => (
    <>
      <div className="k">{k}</div>
      <div className="v">{typeof v === 'number' ? v.toLocaleString() : v}</div>
    </>
  )

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>프로젝트 통계</h2>
        <div className="modal-body">
          <div className="stats-grid">
            {row('문서 수', stats.documents)}
            {row('단어', stats.words)}
            {row('글자(공백 포함)', stats.chars)}
            {row('글자(공백 제외)', stats.charsNoSpaces)}
            {row('문단', stats.paragraphs)}
            {row('문장', stats.sentences)}
            {row('예상 페이지', stats.pages)}
            {row('읽는 시간(분)', stats.readingMinutes)}
          </div>

          <div className="streak-row">
            <span title="현재 연속 집필일" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="flag" size={14} />현재 연속 <b>{streak.current}</b>일
            </span>
            <span title="최장 연속">최장 <b>{streak.longest}</b>일</span>
            <span title="총 집필일">총 <b>{streak.totalDays}</b>일</span>
            <span title="하루 최고 기록(순수 추가 단어 기준)">최고 <b>{streak.personalBest.toLocaleString()}</b>단어/일</span>
          </div>

          <h3 style={{ marginTop: 14, marginBottom: 6 }}>도전 과제</h3>
          <div className="badges">
            {badges.map((b) => {
              const p = badgeProgress[b.id]
              const pct = p ? Math.max(0, Math.min(100, Math.round((p.current / p.target) * 100))) : b.earned ? 100 : 0
              const remaining = p ? Math.max(0, p.target - p.current) : 0
              const tip = p
                ? `${b.desc} · 기준: ${p.metricLabel} ${p.current.toLocaleString()}/${p.target.toLocaleString()}${p.unit}` +
                  (b.earned ? ' · 달성!' : ` · 앞으로 ${remaining.toLocaleString()}${p.unit}`)
                : b.desc
              return (
                <span
                  key={b.id}
                  className={'badge' + (b.earned ? ' earned' : '')}
                  title={tip}
                  style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, minWidth: 96 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {b.earned ? <Icon name="star" size={14} /> : '🔒'} {b.label}
                  </span>
                  {p && (
                    <>
                      <span
                        aria-hidden="true"
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--border)',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--ok)',
                            transition: 'width .2s',
                          }}
                        />
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>
                        {b.earned
                          ? `달성 (${p.current.toLocaleString()}${p.unit})`
                          : `앞으로 ${remaining.toLocaleString()}${p.unit}`}
                      </span>
                    </>
                  )}
                </span>
              )
            })}
          </div>

          <h3 style={{ marginTop: 16, marginBottom: 6 }}>
            집필 기록{' '}
            <span
              title="집필량은 그날의 '순수 추가 단어 수'(원고 단어의 순증가분)만 셉니다. 고쳐쓰기·삭제·이동은 단어가 늘지 않아 0으로 보일 수 있습니다 — 그날도 작업은 저장됩니다."
              style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 400, cursor: 'help' }}
            >
              ⓘ
            </span>
          </h3>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>
            ※ 집필량 = 순수 추가 단어(원고 순증가분) 기준. 퇴고·삭제가 많은 날은 0으로 보일 수 있습니다.
          </div>
          {history.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>아직 기록이 없습니다.</div>
          ) : (
            <div className="heatmap">
              {history.map((h) => (
                <div
                  key={h.date}
                  className="heat-cell"
                  title={`${h.date}: 순수 추가 ${h.words.toLocaleString()} 단어`}
                  style={{ background: h.words ? `rgba(15,157,88,${0.2 + 0.8 * (h.words / maxDay)})` : undefined }}
                />
              ))}
            </div>
          )}

          <h3 style={{ marginTop: 16, marginBottom: 6 }}>자주 쓰인 단어</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {freq.map((f) => (
              <span
                key={f.word}
                style={{
                  fontSize: 11 + Math.min(10, f.count),
                  color: 'var(--accent-2)',
                  lineHeight: 1.2,
                }}
                title={`${f.count}회`}
              >
                {f.word}
              </span>
            ))}
            {freq.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>데이터 없음</span>}
          </div>
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
