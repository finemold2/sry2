import type { CSSProperties } from 'react'
import { totalDraftChars, totalDraftWords, useStore } from '../store/store'
import { computeStreak, dailyPace } from '../analysis/streak'
import { Icon } from '../ui/icons'

// 시각적으로 숨기되 스크린리더에는 읽히는 라이브 영역 스타일(별도 sr-only CSS 클래스 의존 없이 자족적으로).
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

function Bar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(120, (value / target) * 100) : 0
  const cls = 'progress' + (value >= target && target > 0 ? ' ok' : '') + (pct >= 120 ? ' over' : '')
  return (
    <span className={cls}>
      <span style={{ width: Math.min(100, pct) + '%' }} />
    </span>
  )
}

export default function Footer({ saveError = false }: { saveError?: boolean } = {}) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const dirty = useStore((s) => s.dirty)
  const lastSaved = useStore((s) => s.lastSaved)
  const sessionStartWords = useStore((s) => s.sessionStartWords)
  const sessionStartChars = useStore((s) => s.sessionStartChars)
  const resetSession = useStore((s) => s.resetSession)

  const item = activeId ? project.items[activeId] : null
  // 목표 단위: 'chars'(글자) 이면 진행률·세션·원고 표기를 charCount/글자 목표 기준으로 계산. 기본 'words'(단어).
  const byChars = project.settings.targetUnit === 'chars'
  const unitLabel = byChars ? '자' : '단어'
  const draftWords = totalDraftWords(project)
  const draftMetric = byChars ? totalDraftChars(project) : draftWords
  const sessionMetric = Math.max(0, draftMetric - (byChars ? sessionStartChars : sessionStartWords))
  const sTarget = project.settings.sessionTarget
  const pTarget = project.settings.projectTarget
  const streak = computeStreak(project.writingHistory)
  const pace = dailyPace(project, draftWords)
  // 문서 진행률(목표 단위 기준): 'chars' 이면 글자 수를, 아니면 단어 수를 목표와 비교.
  const docMetric = item ? (byChars ? item.charCount : item.wordCount) : 0

  return (
    <div className="footer">
      {item && item.type === 'text' && (
        <span>
          문서: <b>{item.wordCount.toLocaleString()}</b> 단어 · {item.charCount.toLocaleString()} 자
          {item.target > 0 && (
            <>
              {'  '}
              <Bar value={docMetric} target={item.target} /> {Math.round((docMetric / item.target) * 100)}%
            </>
          )}
        </span>
      )}

      <span className="spacer" />

      <span
        className={'streak' + (streak.wroteToday ? ' on' : '')}
        title={`현재 연속 ${streak.current}일 · 최장 ${streak.longest}일 · 총 ${streak.totalDays}일${streak.wroteToday ? '' : ' (오늘 아직 미작성)'}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Icon name="flag" size={14} /> {streak.current}일
      </span>

      {pace && (
        <span
          className={pace.met ? 'pace met' : 'pace'}
          title={`마감 ${pace.deadline}까지 ${pace.daysLeft}일 · 하루 권장 ${pace.perDay.toLocaleString()}단어`}
        >
          오늘 권장:{' '}
          {pace.met ? (
            <b style={{ color: 'var(--ok)' }}>달성 ✓</b>
          ) : (
            <b>{pace.todayRemaining.toLocaleString()}단어 남음</b>
          )}
        </span>
      )}

      <span title={`이번 세션에 작성한 ${unitLabel} 수 — 이 세션은 앱을 연(또는 프로젝트를 연) 시점부터 측정하며, 날짜가 바뀌어도 자동으로 초기화되지 않습니다. '리셋'을 누르면 지금 시점을 새 기준선으로 다시 셉니다.`}>
        세션: <b>{sessionMetric.toLocaleString()}</b> / {sTarget.toLocaleString()} {unitLabel} <Bar value={sessionMetric} target={sTarget} />
        <button className="minibtn" style={{ marginLeft: 6 }} onClick={resetSession}>
          리셋
        </button>
      </span>

      <span title={`원고(컴파일 포함) 전체 ${unitLabel} 수`}>
        원고: <b>{draftMetric.toLocaleString()}</b> / {pTarget.toLocaleString()} {unitLabel} <Bar value={draftMetric} target={pTarget} />
      </span>

      {/* 저장 상태: 스크린리더가 저장됨/변경됨 전환을 정중히(polite) 통지. 색(save-dot) 외에 텍스트로도 상태를 중복 표현. */}
      <span
        role="status"
        aria-live="polite"
        title={
          (lastSaved ? '마지막 저장: ' + new Date(lastSaved).toLocaleTimeString() : '아직 저장 안 됨') +
          ' · ' +
          (project.settings.autosaveInterval === 0
            ? '자동저장 꺼짐 — ⌘S 또는 툴바 저장 버튼으로 저장하세요'
            : `자동저장 켜짐(${((project.settings.autosaveInterval ?? 1500) / 1000).toString()}초마다, 변경 시) · ⌘S 로 즉시 저장`) +
          ' · 브라우저(IndexedDB)에 보관, 파일 메뉴에서 sry 폴더/.sry 파일로 내보내기'
        }
      >
        <span className={'save-dot' + (saveError ? ' error' : dirty ? ' dirty' : '')} aria-hidden="true" />{' '}
        {/* 색에만 의존하지 않도록 상태를 텍스트로도 표기(저장됨/변경됨/저장 실패). */}
        {saveError ? '저장 실패' : dirty ? '변경됨' : '저장됨'}
        <span style={{ color: 'var(--muted)' }}> · {project.settings.autosaveInterval === 0 ? '수동' : '자동저장'}</span>
      </span>

      {/* 저장 실패는 단호히(assertive) 통지 — 시각적으로는 숨긴 별도 라이브 영역(눈에 보이는 표시는 위 상태 텍스트가 담당). */}
      <span role="alert" aria-live="assertive" style={SR_ONLY}>
        {saveError ? '자동 저장에 실패했습니다. 변경분은 메모리에 보존되어 있습니다. 백업/내보내기를 권장합니다.' : ''}
      </span>
    </div>
  )
}
