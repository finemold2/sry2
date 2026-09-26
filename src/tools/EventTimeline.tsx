// 사건 연대표 — 사건(시점 라벨/제목/설명/플롯라인)을 추가·편집·삭제·순서 변경하고,
// 시점 순으로 정렬하며, 가로/세로 타임라인으로 시각화합니다. 플롯라인별 색으로 여러 줄거리를 구분.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'event-timeline', name: '사건 연대표', icon: '🕰️', group: '구상·정리', intro: '사건을 시점 라벨·플롯라인과 함께 정리하고 시점 순으로 가로·세로 타임라인으로 시각화하세요', w: 760, h: 620 }

const LS_KEY = 'sry:tool:event-timeline'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface TLEvent {
  id: string
  when: string        // 시점 라벨(자유 텍스트). 예: '1894년 봄', '3장', 'Day 1'
  title: string
  desc: string
  plotline: string    // 플롯라인(줄거리) 이름. 예: '주인공', '악역', 'A 플롯'
  createdAt: number
  updatedAt: number
}

type Orient = 'vertical' | 'horizontal'
type SortMode = 'manual' | 'when'

// 플롯라인 → 색 매핑(안정적). CSS 변수 기반 팔레트.
const PLOT_COLORS = ['var(--accent)', '#e07a5f', '#3d8c63', '#8a6fc0', '#d4a017', '#5b8ca8', '#c0567a', '#7a8c3d']
function plotColor(plot: string, order: string[]): string {
  if (!plot) return 'var(--muted)'
  const idx = order.indexOf(plot)
  return PLOT_COLORS[(idx < 0 ? 0 : idx) % PLOT_COLORS.length]
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function emptyEvent(): Omit<TLEvent, 'id' | 'createdAt' | 'updatedAt'> {
  return { when: '', title: '', desc: '', plotline: '' }
}

// 시점 라벨 정렬용 키 — 숫자가 섞인 라벨을 자연 정렬(예: '2장' < '10장').
// 숫자 토큰은 0 패딩, 그 외 문자는 소문자로. 완전 자유 텍스트라 근사 정렬임을 안내.
function whenSortKey(when: string): string {
  return when
    .toLowerCase()
    .replace(/\d+/g, (n) => n.padStart(8, '0'))
    .trim()
}

// 첫 사용자에게 보여줄 예시(저장 데이터가 전혀 없을 때만 시드).
function seedEvents(): TLEvent[] {
  const now = Date.now()
  const make = (s: Partial<TLEvent>, i: number): TLEvent => ({
    id: newId(), when: '', title: '', desc: '', plotline: '',
    ...s, createdAt: now + i, updatedAt: now + i,
  })
  return [
    make({ when: '발단', title: '편지의 도착', desc: '주인공에게 정체불명의 편지가 배달된다.', plotline: '주 플롯' }, 0),
    make({ when: '1막', title: '여정의 시작', desc: '주인공이 편지의 발신지를 찾아 길을 떠난다.', plotline: '주 플롯' }, 1),
    make({ when: '1막', title: '추적자의 등장', desc: '같은 편지를 쫓는 또 다른 인물이 나타난다.', plotline: '악역' }, 2),
    make({ when: '2막', title: '진실의 조각', desc: '두 줄거리가 한 도시에서 처음 교차한다.', plotline: '주 플롯' }, 3),
  ]
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증으로 끌어올림.
function loadState(): { events: TLEvent[]; orient: Orient; sort: SortMode; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { events: seedEvents(), orient: 'vertical', sort: 'manual', seeded: true }
    const parsed = JSON.parse(raw)
    // 구버전(배열) 호환 + 신버전(객체) 모두 수용
    const arr: unknown = Array.isArray(parsed) ? parsed : parsed?.events
    const orient: Orient = parsed?.orient === 'horizontal' ? 'horizontal' : 'vertical'
    const sort: SortMode = parsed?.sort === 'when' ? 'when' : 'manual'
    if (!Array.isArray(arr)) return { events: seedEvents(), orient, sort, seeded: true }
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const events: TLEvent[] = []
    for (const o of arr as Record<string, unknown>[]) {
      if (!o || typeof o !== 'object') continue
      if (typeof o.title !== 'string' && typeof o.when !== 'string') continue
      events.push({
        id: String(o.id || newId()),
        when: str(o.when),
        title: str(o.title),
        desc: str(o.desc),
        plotline: str(o.plotline),
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    // 빈 배열은 사용자가 모두 지운 결과일 수 있으므로 그대로 존중(시드하지 않음).
    return { events, orient, sort, seeded: false }
  } catch {
    return { events: seedEvents(), orient: 'vertical', sort: 'manual', seeded: true }
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function EventTimeline({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<ReturnType<typeof loadState>>()
  if (!initial.current) initial.current = loadState()

  const [events, setEvents] = useState<TLEvent[]>(initial.current.events)
  const [orient, setOrient] = useState<Orient>(initial.current.orient)
  const [sort, setSort] = useState<SortMode>(initial.current.sort)
  const [plotFilter, setPlotFilter] = useState<string>('all')
  const [note, setNote] = useState(initial.current.seeded ? '예시 사건을 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')

  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 사건을 받아 추가(다른 도구 연계 대비).
  //  · payload.event   : 사건 1건({when,title,desc,plotline})
  //  · payload.events  : 사건 배열([{when,title,desc,plotline}, ...]) — 달력 대장간 등에서 일괄 전달
  //  · payload.text    : 줄 단위 텍스트("[시점] 제목 — 설명" 또는 "시점 — 제목")를 사건으로 흡수
  useEffect(() => {
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const now = Date.now()
    const added: TLEvent[] = []
    const mk = (when: string, title: string, desc = '', plotline = ''): TLEvent => ({
      id: newId(), when, title: title || '새 사건', desc, plotline,
      createdAt: now + added.length, updatedAt: now + added.length,
    })

    // 1) 사건 1건
    const ev = payload?.event as Record<string, unknown> | undefined
    if (ev && (typeof ev.title === 'string' || typeof ev.when === 'string')) {
      added.push(mk(str(ev.when), str(ev.title), str(ev.desc), str(ev.plotline)))
    }

    // 2) 사건 배열
    const evs = payload?.events
    if (Array.isArray(evs)) {
      for (const item of evs) {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          if (typeof o.title === 'string' || typeof o.when === 'string') {
            added.push(mk(str(o.when), str(o.title), str(o.desc), str(o.plotline)))
          }
        }
      }
    }

    // 3) 줄 단위 텍스트 흡수("[시점] 제목 — 설명" / "시점 — 제목" / "제목")
    const text = payload?.text
    if (typeof text === 'string' && text.trim()) {
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line) continue
        let when = ''
        let rest = line
        const bracket = rest.match(/^\[([^\]]*)\]\s*(.*)$/)
        if (bracket) { when = bracket[1].trim(); rest = bracket[2].trim() }
        // 구분자(— · – · -)로 시점/제목/설명을 분리
        const parts = rest.split(/\s+[—–-]\s+/)
        let title = rest
        let desc = ''
        if (!when && parts.length >= 2) { when = parts[0].trim(); title = parts[1].trim(); desc = parts.slice(2).join(' — ').trim() }
        else if (when && parts.length >= 1) { title = parts[0].trim(); desc = parts.slice(1).join(' — ').trim() }
        if (!title && !when) continue
        added.push(mk(when, title, desc))
      }
    }

    if (added.length) {
      setEvents((prev) => [...prev, ...added])
      setNote(added.length === 1 ? '연계 도구에서 사건 1건을 받아 추가했어요.' : `연계 도구에서 사건 ${added.length}건을 받아 추가했어요.`)
    }
    // payload 는 마운트 시 1회만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ events, orient, sort }))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [events, orient, sort])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((id: string | 'new', data: Omit<TLEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const title = data.title.trim()
    const when = data.when.trim()
    if (!title && !when) return // 제목·시점 둘 다 비면 저장하지 않음
    const clean = {
      when,
      title: title || '(제목 없음)',
      desc: data.desc.trim(),
      plotline: data.plotline.trim(),
    }
    setEvents((prev) => {
      if (id === 'new') {
        const now = Date.now()
        return [...prev, { id: newId(), ...clean, createdAt: now, updatedAt: now }]
      }
      return prev.map((e) => (e.id === id ? { ...e, ...clean, updatedAt: Date.now() } : e))
    })
    setEditing(null)
  }, [])

  const remove = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setConfirmDel(null)
  }, [])

  // 수동 순서 이동(저장 배열 기준). 정렬이 '시점 순'이면 비활성(아래 UI에서 막음).
  const move = useCallback((id: string, dir: -1 | 1) => {
    setEvents((prev) => {
      const i = prev.findIndex((e) => e.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  // 현재 정렬 결과를 실제 배열에 한 번에 반영(수동 모드로 고정).
  const applySortToOrder = useCallback(() => {
    setEvents((prev) => [...prev].sort((a, b) => whenSortKey(a.when).localeCompare(whenSortKey(b.when))))
    setSort('manual')
    setNote('시점 순으로 정렬해 순서를 고정했어요.')
  }, [])

  // ── 파생: 플롯라인 목록·정렬·필터 ─────────────────────────────────────────────
  const plotlines = useMemo(() => {
    const seen: string[] = []
    for (const e of events) if (e.plotline && !seen.includes(e.plotline)) seen.push(e.plotline)
    return seen
  }, [events])

  const sorted = useMemo(() => {
    if (sort === 'when') {
      return [...events].sort((a, b) => whenSortKey(a.when).localeCompare(whenSortKey(b.when)))
    }
    return events
  }, [events, sort])

  const visible = useMemo(
    () => (plotFilter === 'all' ? sorted : sorted.filter((e) => e.plotline === plotFilter)),
    [sorted, plotFilter]
  )

  // ── 내보내기 본문 ─────────────────────────────────────────────────────────────
  const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nl2br = (v: string) => escapeHtml(v).replace(/\n/g, '<br />')

  const buildText = useCallback((): string => {
    const lines: string[] = ['# 사건 연대표', `총 ${events.length}개 사건` + (plotlines.length ? ` · 플롯라인 ${plotlines.length}개` : ''), '']
    sorted.forEach((e, i) => {
      const head = [`${i + 1}.`, e.when ? `[${e.when}]` : '', e.title].filter(Boolean).join(' ')
      lines.push(head)
      if (e.plotline) lines.push(`   · 플롯라인: ${e.plotline}`)
      if (e.desc) lines.push(`   ${e.desc.replace(/\n/g, '\n   ')}`)
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [events.length, plotlines.length, sorted])

  const exportToProject = useCallback(() => {
    if (!events.length) { setNote('내보낼 사건이 없어요. 먼저 사건을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }

    // 사건 목록 전체를 하나의 자료 문서로(시점 순). 「연표」 폴더 아래, 자료(research) 루트.
    const rows = sorted.map((e, i) => {
      const head = `<strong>${i + 1}. ${e.when ? `[${escapeHtml(e.when)}] ` : ''}${escapeHtml(e.title)}</strong>`
      const plot = e.plotline ? ` <em>(${escapeHtml(e.plotline)})</em>` : ''
      const body = e.desc ? `<br />${nl2br(e.desc)}` : ''
      return `<p>${head}${plot}${body}</p>`
    }).join('')
    const summary = `총 ${events.length}개 사건` + (plotlines.length ? ` · 플롯라인 ${plotlines.length}개` : '')
    const bodyHtml = `<p><strong>${escapeHtml(summary)}</strong></p><hr />${rows}`

    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '연표',
      title: '사건 연대표',
      bodyHtml,
      synopsis: summary,
      meta: { 사건수: String(events.length), 플롯라인수: String(plotlines.length) },
    })
    if (!mounted.current) return
    if (id) setNote('✓ 프로젝트 자료 「연표」 폴더에 사건 목록을 문서로 추가했어요.')
    else setNote('프로젝트에 사건 목록을 추가하지 못했어요.')
  }, [events.length, plotlines.length, sorted])

  const copyAll = useCallback(() => {
    if (!events.length) { setNote('내보낼 사건이 없어요. 먼저 사건을 추가하세요.'); return }
    navigator.clipboard?.writeText(buildText())
      .then(() => { if (mounted.current) setNote('✓ 연대표를 텍스트로 복사했어요.') })
      .catch(() => { if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.') })
  }, [events.length, buildText])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? `color-mix(in srgb, ${color} 18%, var(--paper))` : 'var(--paper)',
    color: 'var(--text)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  })
  const seg = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, cursor: 'pointer',
    border: '1px solid var(--border)', background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  })

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => setEditing('new')} title="새 사건 추가">+ 사건 추가</button>

        {/* 보기 방향 */}
        <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }} role="group" aria-label="타임라인 방향">
          <button style={{ ...seg(orient === 'vertical'), borderWidth: 0 }} onClick={() => setOrient('vertical')} title="세로 타임라인">↕ 세로</button>
          <button style={{ ...seg(orient === 'horizontal'), borderWidth: 0, borderLeft: '1px solid var(--border)' }} onClick={() => setOrient('horizontal')} title="가로 타임라인">↔ 가로</button>
        </div>

        {/* 정렬 */}
        <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }} role="group" aria-label="정렬">
          <button style={{ ...seg(sort === 'manual'), borderWidth: 0 }} onClick={() => setSort('manual')} title="직접 정한 순서"><Emoji e="✋" /> 수동</button>
          <button style={{ ...seg(sort === 'when'), borderWidth: 0, borderLeft: '1px solid var(--border)' }} onClick={() => setSort('when')} title="시점 라벨 기준 자동 정렬"><Emoji e="🕐" /> 시점 순</button>
        </div>
        {sort === 'when' && (
          <button className="minibtn" onClick={applySortToOrder} title="현재 시점 순서를 실제 순서로 고정">↧ 순서 고정</button>
        )}

        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyAll} title="연대표를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
      </div>

      {/* 플롯라인 필터/범례 */}
      {(plotlines.length > 0) && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>플롯라인</span>
          <button style={chip(plotFilter === 'all', 'var(--accent)')} onClick={() => setPlotFilter('all')}>전체 {events.length}</button>
          {plotlines.map((p) => (
            <button
              key={p}
              style={{ ...chip(plotFilter === p, plotColor(p, plotlines)), display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onClick={() => setPlotFilter(plotFilter === p ? 'all' : p)}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: plotColor(p, plotlines), display: 'inline-block', flexShrink: 0 }} aria-hidden />
              {p} {events.filter((e) => e.plotline === p).length}
            </button>
          ))}
        </div>
      )}

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 본문: 타임라인 시각화 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }}>
        {visible.length === 0 ? (
          <EmptyState
            hasAny={events.length > 0}
            onAdd={() => setEditing('new')}
            onClearFilter={() => setPlotFilter('all')}
          />
        ) : orient === 'vertical' ? (
          <VerticalTimeline
            events={visible} all={events} plotlines={plotlines} sort={sort}
            onEdit={(id) => setEditing(id)} onDel={(id) => setConfirmDel(id)} onMove={move}
          />
        ) : (
          <HorizontalTimeline
            events={visible} all={events} plotlines={plotlines} sort={sort}
            onEdit={(id) => setEditing(id)} onDel={(id) => setConfirmDel(id)} onMove={move}
          />
        )}
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={exportToProject}
          disabled={!hasProjectBridge() || events.length === 0}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '시점 순 사건 목록을 프로젝트 자료 「연표」 폴더에 문서로 추가'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {/* 하단 안내 */}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        시점 라벨은 자유 텍스트라 「시점 순」 정렬은 숫자·문자 기준의 근사 정렬입니다.
      </div>

      {/* 편집/추가 모달 */}
      {editing && (
        <EventEditor
          event={editing === 'new' ? null : events.find((e) => e.id === editing) || null}
          isNew={editing === 'new'}
          plotlines={plotlines}
          onCancel={() => setEditing(null)}
          onSave={(data) => upsert(editing, data)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && events.find((e) => e.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>사건 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{events.find((e) => e.id === confirmDel)!.title}」 사건을 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => remove(confirmDel)}>삭제</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────
function EmptyState({ hasAny, onAdd, onClearFilter }: { hasAny: boolean; onAdd: () => void; onClearFilter: () => void }) {
  return (
    <div style={{ height: '100%', minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: 24 }}>
      <div style={{ fontSize: 38 }} aria-hidden><Emoji e="🕰️" /></div>
      {hasAny ? (
        <>
          <div style={{ fontSize: 13.5, color: 'var(--text)' }}>이 플롯라인의 사건이 없어요</div>
          <button className="minibtn" onClick={onClearFilter}>전체 보기</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>아직 사건이 없어요</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            「+ 사건 추가」로 첫 사건을 기록해 보세요.<br />시점 라벨·제목·설명·플롯라인을 적으면<br />이야기의 시간 흐름이 한눈에 들어옵니다.
          </div>
          <button className="btn-primary" style={{ marginTop: 4 }} onClick={onAdd}>+ 첫 사건 추가</button>
        </>
      )}
    </div>
  )
}

// ── 세로 타임라인 ─────────────────────────────────────────────────────────────
interface VizProps {
  events: TLEvent[]
  all: TLEvent[]
  plotlines: string[]
  sort: SortMode
  onEdit: (id: string) => void
  onDel: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}

function VerticalTimeline({ events, all, plotlines, sort, onEdit, onDel, onMove }: VizProps) {
  const manual = sort === 'manual'
  return (
    <div style={{ position: 'relative', paddingLeft: 22 }}>
      {/* 세로 축선 */}
      <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} aria-hidden />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((e) => {
          const color = plotColor(e.plotline, plotlines)
          const realIdx = all.findIndex((x) => x.id === e.id)
          return (
            <div key={e.id} style={{ position: 'relative' }}>
              {/* 노드 점 */}
              <div style={{ position: 'absolute', left: -22, top: 6, width: 14, height: 14, borderRadius: 999, background: color, border: '2px solid var(--panel)', boxShadow: '0 0 0 1.5px var(--border)' }} aria-hidden />
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 12, padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {e.when && <span style={{ fontSize: 11.5, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 14%, var(--paper))`, border: `1px solid ${color}`, borderRadius: 999, padding: '1px 8px' }}>{e.when}</span>}
                  <span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-word' }}>{e.title}</span>
                  {e.plotline && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {e.plotline}</span>}
                </div>
                {e.desc && <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.desc}</div>}
                <CardActions
                  manual={manual} realIdx={realIdx} total={all.length}
                  onEdit={() => onEdit(e.id)} onDel={() => onDel(e.id)} onMove={(d) => onMove(e.id, d)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 가로 타임라인 ─────────────────────────────────────────────────────────────
function HorizontalTimeline({ events, all, plotlines, sort, onEdit, onDel, onMove }: VizProps) {
  const manual = sort === 'manual'
  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8 }}>
      <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'stretch', paddingTop: 24, minWidth: 'min-content' }}>
        {/* 가로 축선 */}
        <div style={{ position: 'absolute', left: 8, right: 8, top: 7, height: 2, background: 'var(--border)' }} aria-hidden />
        {events.map((e) => {
          const color = plotColor(e.plotline, plotlines)
          const realIdx = all.findIndex((x) => x.id === e.id)
          return (
            <div key={e.id} style={{ position: 'relative', width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              {/* 노드 점(축 위) */}
              <div style={{ position: 'absolute', left: 18, top: -21, width: 14, height: 14, borderRadius: 999, background: color, border: '2px solid var(--panel)', boxShadow: '0 0 0 1.5px var(--border)' }} aria-hidden />
              {/* 연결 막대 */}
              <div style={{ position: 'absolute', left: 24, top: -7, width: 2, height: 7, background: color }} aria-hidden />
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: 12, padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {e.when && <div style={{ fontSize: 11.5, fontWeight: 700, color, marginBottom: 4 }}>{e.when}</div>}
                <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-word' }}>{e.title}</div>
                {e.plotline && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.plotline}</div>}
                {e.desc && <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>{e.desc}</div>}
                <CardActions
                  manual={manual} realIdx={realIdx} total={all.length} horizontal
                  onEdit={() => onEdit(e.id)} onDel={() => onDel(e.id)} onMove={(d) => onMove(e.id, d)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 카드 액션 바 ──────────────────────────────────────────────────────────────
function CardActions({
  manual, realIdx, total, horizontal, onEdit, onDel, onMove,
}: {
  manual: boolean; realIdx: number; total: number; horizontal?: boolean
  onEdit: () => void; onDel: () => void; onMove: (d: -1 | 1) => void
}) {
  const mini: React.CSSProperties = { padding: '3px 9px', fontSize: 11.5, lineHeight: 1.2 }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      {manual && (
        <>
          <button className="minibtn" style={mini} title={horizontal ? '앞으로 이동' : '위로 이동'} disabled={realIdx <= 0} onClick={() => onMove(-1)}>{horizontal ? '◀' : '▲'}</button>
          <button className="minibtn" style={mini} title={horizontal ? '뒤로 이동' : '아래로 이동'} disabled={realIdx >= total - 1} onClick={() => onMove(1)}>{horizontal ? '▶' : '▼'}</button>
        </>
      )}
      <div style={{ flex: 1 }} />
      <button className="minibtn" style={mini} title="편집" onClick={onEdit}><Emoji e="✏️" /></button>
      <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={onDel}><Emoji e="🗑️" /></button>
    </div>
  )
}

// ── 모달 오버레이 ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
    >
      {children}
    </div>
  )
}

const modalCard: React.CSSProperties = {
  width: '100%', maxWidth: 360, background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', boxSizing: 'border-box',
}

// ── 사건 편집기 ───────────────────────────────────────────────────────────────
function EventEditor({
  event, isNew, plotlines, onCancel, onSave,
}: {
  event: TLEvent | null
  isNew: boolean
  plotlines: string[]
  onCancel: () => void
  onSave: (data: Omit<TLEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const base = event || emptyEvent()
  const [when, setWhen] = useState(base.when)
  const [title, setTitle] = useState(base.title)
  const [desc, setDesc] = useState(base.desc)
  const [plotline, setPlotline] = useState(base.plotline)
  const whenRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { whenRef.current?.focus() }, [])

  const submit = () => onSave({ when, title, desc, plotline })
  const canSave = !!(title.trim() || when.trim())

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 460, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {isNew ? <><Emoji e="🕰️" /> 새 사건</> : <><Emoji e="🕰️" /> 사건 편집</>}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>시점 라벨</label>
            <input
              ref={whenRef}
              style={inputBase}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              placeholder="예: 1894년 봄 · 3장 · Day 1"
              maxLength={80}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>제목</label>
            <input
              style={inputBase}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canSave) submit() } }}
              placeholder="예: 편지의 도착"
              maxLength={120}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>설명</label>
            <textarea
              style={{ ...inputBase, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="이 사건에서 무슨 일이 일어나는지"
              maxLength={2000}
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={label}>플롯라인</label>
            <input
              style={inputBase}
              value={plotline}
              onChange={(e) => setPlotline(e.target.value)}
              placeholder="예: 주 플롯 · 악역 · 로맨스"
              list="event-timeline-plotlines"
              maxLength={60}
            />
            {plotlines.length > 0 && (
              <datalist id="event-timeline-plotlines">
                {plotlines.map((p) => <option key={p} value={p} />)}
              </datalist>
            )}
            {plotlines.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {plotlines.map((p) => (
                  <button
                    key={p}
                    className="minibtn"
                    style={{ padding: '2px 8px', fontSize: 11, borderColor: plotColor(p, plotlines), color: plotColor(p, plotlines) }}
                    onClick={() => setPlotline(p)}
                  >{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!canSave}>
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
