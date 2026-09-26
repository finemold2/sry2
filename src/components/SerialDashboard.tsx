// 연재 관리 대시보드 — 원고 문서를 '회차'로 보고 발행 파이프라인/비축분/예약 캘린더를 관리한다.
// 웹소설/연재 글쓰기의 '발행' 레이어. 집필 트리(바인더)와 분리된 발행 단위 운영 화면.
import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { sceneList } from '../creative/scenes'
import { rtfToPlainText } from '../rtf'
import type { EpisodeMeta } from '../model'
import { DRAFT_ROOT, episodeStatePatch, todayIso } from '../model'
import { Icon } from '../ui/icons'

const flash = (m: string) => { try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m })) } catch { /* noop */ } }

// 웹소설 작가의 멘탈모델 = "공백 포함" 글자수. item.charCount 는 공백 제외이므로 평문 기준으로 다시 센다.
function charsWithSpaces(item: { plainText?: string; bodyRtf?: string }): number {
  let t = item.plainText
  if (!t && item.bodyRtf) { try { t = rtfToPlainText(item.bodyRtf) } catch { t = '' } }
  return (t || '').replace(/[\r\n]+/g, ' ').trim().length
}

// 플랫폼 편집기 붙여넣기용 평문 — 서식·각주 없는 본문, 문단 사이 빈 줄(웹소설 플랫폼 관례).
function platformPlainText(item: { plainText?: string; bodyRtf?: string }): string {
  let t = item.plainText
  if (!t && item.bodyRtf) { try { t = rtfToPlainText(item.bodyRtf) } catch { t = '' } }
  return (t || '').split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean).join('\n\n')
}

/** Date → ISO yyyy-mm-dd(로컬). todayIso 와 동일 포맷. */
function fmtIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 발행 요일 토글 라벨(0=일 ~ 6=토, Date#getDay 와 동일 인덱스). */
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

type PubState = NonNullable<EpisodeMeta['state']>
const STATES: { key: PubState; label: string; color: string }[] = [
  { key: 'draft', label: '초안', color: '#9aa0a6' },
  { key: 'ready', label: '완성 · 비축', color: '#4285f4' },
  { key: 'scheduled', label: '예약', color: '#f4b400' },
  { key: 'published', label: '발행됨', color: '#0f9d58' },
]

const PLATFORMS = ['문피아', '네이버 시리즈', '카카오페이지', '노벨피아', '조아라', '리디', 'Royal Road', 'Wattpad', 'ScribbleHub', 'Tapas']

// 웹소설 회차 권장 분량(공백 포함)
const EP_MIN = 3000
const EP_MAX = 5500

export default function SerialDashboard() {
  const project = useStore((s) => s.project)
  const setEpisodeMeta = useStore((s) => s.setEpisodeMeta)
  const setSerialCadence = useStore((s) => s.setSerialCadence)
  const patchSettings = useStore((s) => s.patchSettings)
  const addItem = useStore((s) => s.addItem)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const [tab, setTab] = useState<'board' | 'calendar' | 'perf'>('board')

  const scenes = useMemo(() => sceneList(project), [project])
  const cadence = project.settings.serialCadence ?? 5
  // 케이던스 입력은 로컬 문자열로 — 비우는 순간 0 으로 스냅되지 않게(onBlur 에서 확정·클램프).
  const [cadenceStr, setCadenceStr] = useState(String(cadence))

  // 회차 = 원고 텍스트 문서. 회차번호는 episode.number 우선, 없으면 읽기 순서.
  const episodes = useMemo(
    () =>
      scenes.map((s, i) => ({
        id: s.id,
        title: s.title,
        chars: charsWithSpaces(s.item),
        num: s.item.episode?.number ?? i + 1,
        state: (s.item.episode?.state ?? 'draft') as PubState,
        scheduledFor: s.item.episode?.scheduledFor,
        platform: s.item.episode?.platform,
        tier: s.item.episode?.accessTier,
        views: s.item.episode?.views,
        likes: s.item.episode?.likes,
        comments: s.item.episode?.comments,
        bookmarks: s.item.episode?.bookmarks,
        earnings: s.item.episode?.earnings,
      })),
    [scenes],
  )

  const readyCount = episodes.filter((e) => e.state === 'ready' || e.state === 'scheduled').length
  const publishedCount = episodes.filter((e) => e.state === 'published').length
  const bufferWeeks = cadence > 0 ? (readyCount / cadence).toFixed(1) : '∞'
  const bufferTier = readyCount >= cadence * 2 ? 'ok' : readyCount >= cadence ? 'warn' : 'bad'

  // 예약/발행 전환 패치에 회차번호 명시 고정을 얹는다.
  // 번호 미지정 회차의 표시 번호는 바인더 순서 기반(i+1)이라, 발행 뒤 앞쪽에 문서를 추가/이동하면
  // 이미 발행된 회차의 번호까지 밀리는 문제가 있었다 → 예약/발행 시점의 번호를 episode.number 로 저장해 고정.
  const pinNumber = (id: string, state: PubState, patch: Partial<EpisodeMeta>): Partial<EpisodeMeta> => {
    if (state !== 'scheduled' && state !== 'published') return patch
    if (project.items[id]?.episode?.number != null) return patch // 이미 명시 번호가 있으면 존중
    const ep = episodes.find((e) => e.id === id)
    return ep ? { ...patch, number: ep.num } : patch
  }

  const setState = (id: string, state: PubState) => {
    setEpisodeMeta(id, pinNumber(id, state, episodeStatePatch(project.items[id], state)))
  }

  const onDropTo = (e: React.DragEvent, state: PubState) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/scriv-id')
    if (!id || !project.items[id]) return
    // '예약'은 반드시 발행 예정일과 함께만 진입(예정일 없는 유령 예약 방지).
    if (state === 'scheduled') {
      const existing = project.items[id]?.episode?.scheduledFor
      if (!existing) {
        const input = window.prompt('예약하려면 발행 예정일이 필요합니다. 날짜를 입력하세요 (YYYY-MM-DD)', todayIso())
        if (input == null) return // 취소 → 상태 변경 없음
        const d = input.trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { window.alert('YYYY-MM-DD 형식의 날짜를 입력하세요. 예약하지 않았습니다.'); return }
        setEpisodeMeta(id, pinNumber(id, 'scheduled', { state: 'scheduled', scheduledFor: d }))
        return
      }
    }
    setState(id, state)
  }

  const serialDays = project.settings.serialDays ?? []
  // 자동 예약 대상 = 완성(비축) 상태인데 발행 예정일이 없는 회차(회차번호 순).
  const readyNoDate = episodes.filter((e) => e.state === 'ready' && !e.scheduledFor).sort((a, b) => a.num - b.num)

  // '다음 발행일 자동 채움' — 오늘 이후의 발행 요일 날짜를 순서대로 배정(이미 잡힌 예약일은 건너뜀).
  const autoFill = () => {
    if (serialDays.length === 0) { flash('먼저 발행 요일을 선택하세요 (예: 월·수·금).'); return }
    if (readyNoDate.length === 0) { flash('배정할 회차가 없습니다 — 발행일 없는 완성(비축) 회차가 대상입니다.'); return }
    // 미발행 예약이 이미 잡힌 날짜는 건너뛰어 하루 2회차 중복 배정을 막는다(같은 날 발행은 카드에서 직접 지정).
    const occupied = new Set(episodes.filter((e) => e.scheduledFor && e.state !== 'published').map((e) => e.scheduledFor!))
    const d = new Date()
    const assigned: string[] = []
    let ti = 0
    for (let guard = 0; guard < 3660 && ti < readyNoDate.length; guard++) {
      d.setDate(d.getDate() + 1) // '오늘 이후' — 내일부터 탐색
      if (!serialDays.includes(d.getDay())) continue
      const iso = fmtIso(d)
      if (occupied.has(iso)) continue
      const t = readyNoDate[ti++]
      setEpisodeMeta(t.id, pinNumber(t.id, 'scheduled', { ...episodeStatePatch(project.items[t.id], 'scheduled'), scheduledFor: iso }))
      occupied.add(iso)
      assigned.push(iso)
    }
    if (assigned.length > 0) flash(`${assigned.length}개 회차 예약됨: ${assigned[0]}${assigned.length > 1 ? ` ~ ${assigned[assigned.length - 1]}` : ''}`)
  }

  const scheduled = episodes
    .filter((e) => e.scheduledFor)
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!) || a.num - b.num)
  // 예정일 없이 'scheduled' 상태인 유령 회차(기존 데이터 보호용 안전망) — 캘린더에 '날짜 미지정'으로 노출.
  const undatedScheduled = episodes
    .filter((e) => e.state === 'scheduled' && !e.scheduledFor)
    .sort((a, b) => a.num - b.num)
  const today = todayIso()
  // 오늘 발행해야 할(예정일이 오늘이거나 지난) 미발행 예약 회차.
  const dueToday = scheduled.filter((e) => e.state === 'scheduled' && e.scheduledFor! <= today)

  return (
    <div className="serial-wrap">
      <div className="serial-toolbar">
        <strong>연재 관리</strong>
        <span className="serial-sep" />
        <button className={'minibtn' + (tab === 'board' ? ' active' : '')} onClick={() => setTab('board')}>파이프라인</button>
        <button className={'minibtn' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')}>발행 캘린더</button>
        <button className={'minibtn' + (tab === 'perf' ? ' active' : '')} onClick={() => setTab('perf')}>성과</button>
        <span className="serial-sep" />
        <button className="minibtn" title="플랫폼 독자뷰로 미리보기" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.dispatchEvent(new CustomEvent('scriv:reader-preview', { detail: '' }))}><Icon name="device" size={14} mono /> 독자뷰</button>
        <span className="serial-sep" />
        <label className="serial-cadence">
          주당 발행
          <input
            type="number"
            min={0}
            max={14}
            value={cadenceStr}
            onChange={(e) => setCadenceStr(e.target.value)}
            onBlur={() => { const n = Math.max(0, Math.min(14, Number(cadenceStr) || 0)); setCadenceStr(String(n)); setSerialCadence(n) }}
          />
          회
        </label>
        <span
          className="serial-days"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
          title="발행 요일 — '다음 발행일 자동 채움'이 이 요일에만 예약 날짜를 배정합니다"
        >
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>발행 요일</span>
          {DAY_LABELS.map((label, i) => {
            const on = serialDays.includes(i)
            return (
              <button
                key={label}
                className={'minibtn' + (on ? ' active' : '')}
                aria-pressed={on}
                style={{ padding: '2px 6px', minWidth: 25 }}
                onClick={() => {
                  const next = on ? serialDays.filter((x) => x !== i) : [...serialDays, i].sort((a, b) => a - b)
                  patchSettings({ serialDays: next })
                }}
              >{label}</button>
            )
          })}
        </span>
        <button
          className="minibtn"
          onClick={autoFill}
          title="완성(비축) 상태인데 발행일이 없는 회차들에, 오늘 이후 발행 요일 날짜를 회차번호 순서로 배정합니다"
        >
          다음 발행일 자동 채움{readyNoDate.length > 0 ? ` (${readyNoDate.length})` : ''}
        </button>
        <div className={'serial-buffer ' + bufferTier}>
          비축분 <b>{readyCount}</b>화 · 약 <b>{bufferWeeks}</b>주 분량
          <span className="serial-buffer-bar">
            <span style={{ width: `${Math.min(100, cadence > 0 ? (readyCount / (cadence * 2)) * 100 : 100)}%` }} />
          </span>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
          총 {episodes.length}화 · 발행 {publishedCount}화
        </span>
      </div>

      {episodes.length === 0 && (
        <div className="serial-empty">
          원고에 문서를 추가하면 회차로 나타납니다. 각 문서가 한 회차입니다.
          <div style={{ marginTop: 10 }}>
            <button
              className="minibtn"
              onClick={() => { const id = addItem('text', DRAFT_ROOT, '1화'); select(id); setView('editor') }}
            >＋ 첫 회차 만들기</button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
            첫 회차를 쓰면 파이프라인·발행 캘린더·성과 추적을 바로 쓸 수 있어요.
          </div>
        </div>
      )}

      {tab === 'board' ? (
        <div className="serial-board">
          {STATES.map((col) => {
            const list = episodes.filter((e) => e.state === col.key).sort((a, b) => a.num - b.num)
            return (
              <div
                key={col.key}
                className="serial-col"
                onDragOver={(e) => { if (e.dataTransfer.types.includes('text/scriv-id')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                onDrop={(e) => onDropTo(e, col.key)}
              >
                <div className="serial-col-head" style={{ borderTopColor: col.color }}>
                  <span className="serial-dot" style={{ background: col.color }} /> {col.label}
                  <span className="serial-count">{list.length}</span>
                </div>
                <div className="serial-col-body">
                  {list.map((ep) => (
                    <EpisodeCard key={ep.id} ep={ep} onOpen={() => { select(ep.id); setView('editor') }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : tab === 'calendar' ? (
        <div className="serial-calendar">
          <div className="serial-cal-head">예약·발행 일정</div>
          {dueToday.length > 0 && (
            <div
              className="serial-cal-due-summary"
              role="status"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', margin: '0 0 10px', borderRadius: 8, background: 'var(--danger-bg, rgba(217,48,37,0.12))', color: 'var(--danger, #d93025)', fontWeight: 600 }}
            >
              <Icon name="timeline" size={14} mono /> 오늘 발행할 회차 {dueToday.length}개 — 서버 없는 앱이라 자동 발행되지 않습니다. 플랫폼에 직접 올린 뒤 '발행됨'으로 옮기세요.
            </div>
          )}
          {scheduled.length === 0 && undatedScheduled.length === 0 ? (
            <div className="serial-empty">
              발행 예정일이 지정된 회차가 없습니다. 카드에서 날짜를 지정하거나 자동 예약을 쓰세요.
              <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {readyNoDate.length > 0 ? (
                  <button className="minibtn" onClick={autoFill} title="발행 요일 기준으로 오늘 이후 날짜를 순서대로 배정합니다">
                    완성 회차 {readyNoDate.length}개 자동 예약
                  </button>
                ) : (
                  <button className="minibtn" onClick={() => setTab('board')}>
                    파이프라인에서 회차를 '완성 · 비축'으로 옮기기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {scheduled.length > 0 && (
                <ul className="serial-cal-list">
                  {scheduled.map((ep) => {
                    const overdue = ep.state === 'scheduled' && ep.scheduledFor! < today
                    const isToday = ep.state === 'scheduled' && ep.scheduledFor! === today
                    return (
                      <li key={ep.id} className={'serial-cal-row' + (overdue ? ' overdue' : '')} onClick={() => { select(ep.id); setView('editor') }}>
                        <span className="serial-cal-date">{ep.scheduledFor}</span>
                        <span className="serial-cal-num">{ep.num}화</span>
                        <span className="serial-cal-title">{ep.title}</span>
                        {ep.platform && <span className="serial-cal-platform">{ep.platform}</span>}
                        {overdue && <span className="serial-cal-overdue" style={{ background: 'var(--danger, #d93025)', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>발행 예정일 지남 · 미발행</span>}
                        {isToday && <span className="serial-cal-duetoday" style={{ background: 'var(--accent, #f4b400)', color: '#1a1a1a', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>오늘 발행</span>}
                        <span className={'serial-cal-state ' + ep.state}>{STATES.find((s) => s.key === ep.state)?.label}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {undatedScheduled.length > 0 && (
                <>
                  <div className="serial-cal-head" style={{ marginTop: 14, fontSize: 13 }}>날짜 미지정 예약 <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(예정일을 지정해야 일정에 잡힙니다)</span></div>
                  <ul className="serial-cal-list">
                    {undatedScheduled.map((ep) => (
                      <li key={ep.id} className="serial-cal-row" onClick={() => { select(ep.id); setView('editor') }}>
                        <span className="serial-cal-date" style={{ color: 'var(--muted)' }}>미지정</span>
                        <span className="serial-cal-num">{ep.num}화</span>
                        <span className="serial-cal-title">{ep.title}</span>
                        {ep.platform && <span className="serial-cal-platform">{ep.platform}</span>}
                        <span className={'serial-cal-state ' + ep.state}>{STATES.find((s) => s.key === ep.state)?.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <PerfPanel episodes={episodes} onOpen={(id) => { select(id); setView('editor') }} />
      )}
    </div>
  )
}

interface PerfRow { id: string; title: string; num: number; views?: number; likes?: number; comments?: number; bookmarks?: number; earnings?: number }

function PerfPanel({ episodes, onOpen }: { episodes: PerfRow[]; onOpen: (id: string) => void }) {
  const setEpisodeMeta = useStore((s) => s.setEpisodeMeta)
  const rows = [...episodes].sort((a, b) => a.num - b.num)
  const sum = (k: 'views' | 'likes' | 'comments' | 'bookmarks' | 'earnings') => rows.reduce((t, r) => t + (r[k] || 0), 0)
  const maxViews = Math.max(1, ...rows.map((r) => r.views || 0))
  // 잔존율(real retention) = 다음 회차 조회수 ÷ 현재 회차 조회수. 회차 순서(num 정렬) 기준이라 1화 누락에 흔들리지 않는다.
  // 각 행에 '다음 회차로 얼마나 따라왔는지'를 표시(마지막 회차는 다음이 없으므로 '—').

  const numField = (id: string, key: 'views' | 'likes' | 'comments' | 'bookmarks' | 'earnings', val?: number) => (
    <input
      type="number" min={0} className="perf-input" defaultValue={val ?? ''}
      onBlur={(e) => { const v = e.target.value.trim(); const n = v === '' ? undefined : Math.max(0, Number(v)); if ((val ?? undefined) === n) return; setEpisodeMeta(id, { [key]: n !== undefined && Number.isFinite(n) ? n : undefined } as Partial<EpisodeMeta>) }}
    />
  )

  return (
    <div className="serial-perf">
      <div className="serial-cal-head">회차 성과 추적 — 플랫폼 통계를 옮겨 적어 추이·잔존율을 봅니다 <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(수기 입력 · 로컬 저장)</span></div>
      {rows.length === 0 ? (
        <div className="serial-empty">발행할 회차가 없습니다.</div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table className="perf-table">
            <thead>
              <tr><th>화</th><th>제목</th><th>조회수</th><th title="다음 회차로 이어 읽은 비율(다음화 조회수 ÷ 이 회차 조회수)">잔존율</th><th>추천</th><th>댓글</th><th>선호작</th><th>정산</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                // 다음 회차(순서상) 대비 잔존율. 현재 회차 조회수가 있어야 비율 산정 가능.
                const next = rows[i + 1]
                const retention = r.views && r.views > 0 && next && next.views != null ? Math.round((next.views / r.views) * 100) : null
                return (
                  <tr key={r.id}>
                    <td>{r.num}</td>
                    <td className="perf-title" onClick={() => onOpen(r.id)} title="편집기로 열기">{r.title}</td>
                    <td>
                      <div className="perf-cell">
                        {numField(r.id, 'views', r.views)}
                        <span className="perf-bar"><span style={{ width: `${Math.round(((r.views || 0) / maxViews) * 100)}%` }} /></span>
                      </div>
                    </td>
                    <td className={'perf-ret ' + (retention != null && retention < 70 ? 'low' : '')} title={retention != null ? `${r.num}화 → 다음 회차로 ${retention}% 잔존` : '다음 회차 조회수가 없어 산정 불가'}>{retention != null ? retention + '%' : '—'}</td>
                    <td>{numField(r.id, 'likes', r.likes)}</td>
                    <td>{numField(r.id, 'comments', r.comments)}</td>
                    <td>{numField(r.id, 'bookmarks', r.bookmarks)}</td>
                    <td>{numField(r.id, 'earnings', r.earnings)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>합계</td><td>{sum('views').toLocaleString()}</td><td>—</td><td>{sum('likes').toLocaleString()}</td><td>{sum('comments').toLocaleString()}</td><td>{sum('bookmarks').toLocaleString()}</td><td>{sum('earnings').toLocaleString()}</td></tr>
            </tfoot>
          </table>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            잔존율 = 다음 회차 조회수 ÷ 이 회차 조회수(회차 순서 기준). 70% 미만이면 해당 회차에서 이탈이 큰 구간일 수 있습니다. 정산 통화 단위는 자유롭게 사용하세요.
          </div>
        </div>
      )}
    </div>
  )
}

interface EpRow {
  id: string
  title: string
  chars: number
  num: number
  state: PubState
  scheduledFor?: string
  platform?: string
  tier?: string
}

function EpisodeCard({ ep, onOpen }: { ep: EpRow; onOpen: () => void }) {
  const setEpisodeMeta = useStore((s) => s.setEpisodeMeta)
  const [open, setOpen] = useState(false)
  const compliance = ep.chars < EP_MIN ? 'short' : ep.chars > EP_MAX ? 'long' : 'ok'

  // 플랫폼용 평문 복사 — 서식·각주 없는 본문을 문단 사이 빈 줄로 클립보드에 담는다(원고는 불변).
  const copyPlain = () => {
    const item = useStore.getState().project.items[ep.id]
    if (!item) return
    const text = platformPlainText(item)
    if (!text) { flash('본문이 비어 있어 복사할 내용이 없습니다.'); return }
    if (!navigator.clipboard?.writeText) { flash('복사를 지원하지 않는 환경입니다.'); return }
    navigator.clipboard.writeText(text).then(
      () => flash(`${ep.num}화 본문 복사됨 — 플랫폼 편집기에 붙여넣으세요.`),
      () => flash('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.'),
    )
  }
  return (
    <div
      className="serial-card"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/scriv-id', ep.id); e.dataTransfer.effectAllowed = 'move' }}
      onDoubleClick={onOpen}
    >
      <div className="serial-card-top">
        <span className="serial-card-num">{ep.num}화</span>
        <span className={'serial-card-len ' + compliance} title="공백 포함 글자수 (웹소설 권장 3,000~5,500자)">
          {ep.chars.toLocaleString()}자
        </span>
      </div>
      <div className="serial-card-title">{ep.title}</div>
      <div className="serial-card-meta">
        {ep.platform && <span className="serial-tag">{ep.platform}</span>}
        {ep.scheduledFor && <span className="serial-tag sched" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="timeline" size={12} mono /> {ep.scheduledFor}</span>}
        {ep.tier && <span className="serial-tag tier">{ep.tier}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="serial-card-edit" style={{ flex: 1 }} onClick={() => setOpen((v) => !v)}>{open ? '▴ 닫기' : '▾ 회차 설정'}</button>
        <button className="serial-card-edit" title="이 회차를 플랫폼 독자뷰로 미리보기" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.dispatchEvent(new CustomEvent('scriv:reader-preview', { detail: ep.id }))}><Icon name="device" size={14} mono /></button>
        <button className="serial-card-edit" title="플랫폼용 평문 복사 — 서식·각주 없는 본문(문단 사이 빈 줄)" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={copyPlain}><Icon name="copy" size={14} mono /></button>
      </div>
      {open && (
        <div className="serial-card-form" onClick={(e) => e.stopPropagation()}>
          <label>회차 번호
            {/* 비교 기준은 표시값(ep.num, 순서 파생 폴백)이 아니라 '저장된 명시 번호'(리뷰 F10) —
                화면에 보이는 번호를 그대로 입력해 '고정'하는 것도 저장돼야 바인더 순서 변경에 안 밀린다. */}
            <input type="number" min={0} defaultValue={ep.num} onBlur={(e) => { const v = e.target.value.trim(); const n = v === '' ? undefined : Number(v); const cur = useStore.getState().project.items[ep.id]?.episode?.number; if (n === cur) return; setEpisodeMeta(ep.id, { number: n !== undefined && Number.isFinite(n) ? n : undefined }) }} />
          </label>
          <label>발행 예정일
            <input
              type="date"
              defaultValue={ep.scheduledFor || ''}
              onChange={(e) => {
                // 값이 '있을 때만' 즉시 커밋(리뷰 F4) — 키보드로 날짜를 고치는 중간의 빈/불완전 값('')이
                // 저장된 예약일을 지우고 scheduled→ready 로 강등시키던 문제 방지. 비우기는 onBlur 에서 확정.
                const d = e.target.value
                if (!d) return
                const state = ep.state === 'draft' || ep.state === 'ready' ? 'scheduled' : ep.state
                const patch: Partial<EpisodeMeta> = { scheduledFor: d, state }
                // 예약 승격 시 현재 회차번호를 명시 고정 — 이후 바인더 순서 변경(문서 추가/이동)에 번호가 밀리지 않게.
                if (state === 'scheduled' && ep.state !== 'scheduled') patch.number = ep.num
                setEpisodeMeta(ep.id, patch)
              }}
              onBlur={(e) => {
                // 편집을 끝냈는데 비어 있으면 그때 예약 해제(예약→완성 강등) — 의도된 '비우기'만 반영.
                if (e.target.value === '' && ep.scheduledFor) {
                  setEpisodeMeta(ep.id, { scheduledFor: undefined, state: ep.state === 'scheduled' ? 'ready' : ep.state })
                }
              }}
            />
          </label>
          <label>플랫폼
            <input list="serial-platforms" defaultValue={ep.platform || ''} onBlur={(e) => setEpisodeMeta(ep.id, { platform: e.target.value || undefined })} />
            <datalist id="serial-platforms">{PLATFORMS.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
          <label>접근 등급
            <input placeholder="무료 / 유료 / 선공개" defaultValue={ep.tier || ''} onBlur={(e) => setEpisodeMeta(ep.id, { accessTier: e.target.value || undefined })} />
          </label>
        </div>
      )}
    </div>
  )
}

