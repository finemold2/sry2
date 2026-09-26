import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = {
  id: 'time-skip-planner',
  name: '시간 경과 설계',
  icon: '⏭️',
  group: '구상·정리',
  intro: '장면 사이 시간 점프를 항목으로 관리해 매끄러운 시간 흐름을 설계',
  w: 940,
  h: 720,
}

// ---------- 모델 ----------
type SkipKind = 'forward' | 'flashback' | 'parallel' | 'montage' | 'ellipsis'
interface Skip {
  id: string
  fromScene: string      // 이전 장면(점프 직전)
  toScene: string        // 다음 장면(점프 직후)
  kind: SkipKind         // 점프 유형
  span: string           // 경과 기간(예: "3년 후", "다음 날 아침")
  spanDays: number       // 정렬/타임라인용 근사 일수(음수=과거)
  reason: string         // 이 점프가 필요한 이유(서사적 목적)
  signal: string         // 전환 신호(챕터 구분/공백 줄/장면 헤더/시간 명시 등)
  orient: string         // 독자 오리엔테이션(언제·어디·누구를 어떻게 알려줄지)
  events: string[]       // 점프 동안 벌어졌으나 놓치면 안 될 사건
  risks: string          // 주의/혼란 위험
  done: boolean          // 본문 반영 완료
  order: number          // 수동 정렬 순서
}

const KINDS: { v: SkipKind; label: string; emoji: string; hint: string }[] = [
  { v: 'forward', label: '순방향 점프', emoji: '⏩', hint: '미래로 건너뜀. 가장 흔한 시간 경과.' },
  { v: 'flashback', label: '회상/과거 점프', emoji: '⏮️', hint: '과거로 돌아감. 동기·내력 공개.' },
  { v: 'parallel', label: '병렬 전환', emoji: '🔀', hint: '같은 시각 다른 장소/인물로 이동.' },
  { v: 'montage', label: '몽타주/압축', emoji: '🎞️', hint: '긴 기간을 짧게 요약 압축.' },
  { v: 'ellipsis', label: '생략(엘립시스)', emoji: '⤵️', hint: '지루한 구간을 통째로 건너뜀.' },
]
const kindOf = (v: SkipKind) => KINDS.find(k => k.v === v) || KINDS[0]

// 자주 쓰는 경과 기간 프리셋(자작 텍스트)
const SPAN_PRESETS: { label: string; days: number }[] = [
  { label: '몇 분 후', days: 0 },
  { label: '한 시간 후', days: 0 },
  { label: '그날 밤', days: 0 },
  { label: '다음 날 아침', days: 1 },
  { label: '사흘 뒤', days: 3 },
  { label: '일주일 후', days: 7 },
  { label: '한 달 뒤', days: 30 },
  { label: '계절이 바뀌어', days: 90 },
  { label: '반년이 지나', days: 180 },
  { label: '일 년 후', days: 365 },
  { label: '삼 년 뒤', days: 1095 },
  { label: '십 년이 흘러', days: 3650 },
]

// 전환 신호 체크리스트(독자가 시간 이동을 인지하게 돕는 장치)
const SIGNAL_CHIPS = [
  '새 챕터/장면 헤더', '공백 줄 + 장면 구분 기호', '시간 부사로 명시("3년 후")',
  '날씨/계절 변화 묘사', '인물 외형 변화(머리·흉터·나이)', '환경 변화(폐허·신축)',
  '새로운 호칭/직함', '회상 도입 신호("그때를 떠올렸다")', '현재로 복귀 신호',
]

const LS_KEY = 'sry:tool:time-skip-planner'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function load(): Skip[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((s: Partial<Skip>, i: number): Skip => ({
      id: typeof s.id === 'string' ? s.id : uid(),
      fromScene: typeof s.fromScene === 'string' ? s.fromScene : '',
      toScene: typeof s.toScene === 'string' ? s.toScene : '',
      kind: KINDS.some(k => k.v === s.kind) ? (s.kind as SkipKind) : 'forward',
      span: typeof s.span === 'string' ? s.span : '',
      spanDays: typeof s.spanDays === 'number' && isFinite(s.spanDays) ? s.spanDays : 0,
      reason: typeof s.reason === 'string' ? s.reason : '',
      signal: typeof s.signal === 'string' ? s.signal : '',
      orient: typeof s.orient === 'string' ? s.orient : '',
      events: Array.isArray(s.events) ? s.events.filter((e): e is string => typeof e === 'string') : [],
      risks: typeof s.risks === 'string' ? s.risks : '',
      done: !!s.done,
      order: typeof s.order === 'number' ? s.order : i,
    }))
  } catch { return [] }
}

const blank = (order: number): Skip => ({
  id: uid(), fromScene: '', toScene: '', kind: 'forward', span: '', spanDays: 0,
  reason: '', signal: '', orient: '', events: [], risks: '', done: false, order,
})

// 누적 일수 → 사람이 읽는 누적 표기
function humanCumulative(days: number): string {
  const a = Math.abs(Math.round(days))
  if (a === 0) return '같은 날'
  if (a < 7) return `${a}일`
  if (a < 30) return `${Math.round(a / 7)}주`
  if (a < 365) return `${Math.round(a / 30)}개월`
  return `${(a / 365).toFixed(a % 365 === 0 ? 0 : 1)}년`
}

export default function TimeSkipPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const [skips, setSkips] = useState<Skip[]>(() => load())
  const [selId, setSelId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | SkipKind>('all')
  const [eventDraft, setEventDraft] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const firstRun = useRef(true)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 외부에서 장면명을 넘겨받으면 새 항목의 toScene 으로 시드
  useEffect(() => {
    const seed = payload && typeof payload['scene'] === 'string' ? (payload['scene'] as string) : ''
    if (seed && skips.length === 0) {
      const s = blank(0); s.toScene = seed
      setSkips([s]); setSelId(s.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(첫 렌더 제외)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(skips))
      setSavedFlash(true)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setSavedFlash(false), 900)
    } catch { /* 용량 초과 등 무시 */ }
  }, [skips])

  // 언마운트 정리
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  const ordered = useMemo(
    () => [...skips].sort((a, b) => a.order - b.order),
    [skips],
  )
  const view = useMemo(() => ordered.filter(s => {
    if (filter === 'all') return true
    if (filter === 'pending') return !s.done
    return s.kind === filter
  }), [ordered, filter])

  const sel = skips.find(s => s.id === selId) || null

  // 누적 타임라인(순서대로 spanDays 누적)
  const cumulative = useMemo(() => {
    let acc = 0
    const map: Record<string, number> = {}
    for (const s of ordered) { acc += s.spanDays; map[s.id] = acc }
    return map
  }, [ordered])

  const total = skips.length
  const doneCount = skips.filter(s => s.done).length

  // ---------- 변경 헬퍼 ----------
  function patch(id: string, p: Partial<Skip>) {
    setSkips(prev => prev.map(s => (s.id === id ? { ...s, ...p } : s)))
  }
  function add(seed?: Partial<Skip>) {
    const maxOrder = skips.reduce((m, s) => Math.max(m, s.order), -1)
    const s = { ...blank(maxOrder + 1), ...seed }
    setSkips(prev => [...prev, s]); setSelId(s.id)
  }
  function remove(id: string) {
    setSkips(prev => prev.filter(s => s.id !== id))
    if (selId === id) setSelId(null)
  }
  function move(id: string, dir: -1 | 1) {
    const arr = ordered
    const i = arr.findIndex(s => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    const a = arr[i], b = arr[j]
    setSkips(prev => prev.map(s => {
      if (s.id === a.id) return { ...s, order: b.order }
      if (s.id === b.id) return { ...s, order: a.order }
      return s
    }))
  }
  function addEvent() {
    const t = eventDraft.trim()
    if (!t || !sel) return
    patch(sel.id, { events: [...sel.events, t] })
    setEventDraft('')
  }
  function removeEvent(idx: number) {
    if (!sel) return
    patch(sel.id, { events: sel.events.filter((_, i) => i !== idx) })
  }

  // 좌측 바인더 파일을 끌어다 놓으면 toScene 으로 새 점프 생성
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDropHot(false)
    const item = getDragItem(e)
    if (item) add({ toScene: item.title, fromScene: sel?.toScene || '' })
  }
  function onDragOver(e: React.DragEvent) {
    if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) }
  }

  // ---------- 프로젝트로 내보내기 ----------
  function buildBody(s: Skip): string {
    const k = kindOf(s.kind)
    const rows: string[] = []
    rows.push(`<h2>${esc(k.emoji)} ${esc(s.fromScene || '(이전 장면)')} → ${esc(s.toScene || '(다음 장면)')}</h2>`)
    rows.push(`<p><b>점프 유형</b>: ${esc(k.label)}</p>`)
    rows.push(`<p><b>경과 기간</b>: ${esc(s.span || '미정')}${s.spanDays ? `  (약 ${esc(humanCumulative(s.spanDays))}${s.spanDays < 0 ? ' 과거' : ''})` : ''}</p>`)
    if (s.reason) rows.push(`<p><b>점프 이유(목적)</b>: ${esc(s.reason)}</p>`)
    if (s.signal) rows.push(`<p><b>전환 신호</b>: ${esc(s.signal)}</p>`)
    if (s.orient) rows.push(`<p><b>독자 오리엔테이션</b>: ${esc(s.orient)}</p>`)
    if (s.events.length) {
      rows.push(`<p><b>놓치면 안 될 사건</b></p><ul>${s.events.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`)
    }
    if (s.risks) rows.push(`<p><b>주의/혼란 위험</b>: ${esc(s.risks)}</p>`)
    return rows.join('\n')
  }
  function exportOne(s: Skip) {
    addToProject({
      root: 'research', folder: '시간 경과 설계',
      title: `⏭️ ${s.fromScene || '?'} → ${s.toScene || '?'} (${s.span || '미정'})`,
      bodyHtml: buildBody(s),
      meta: { 유형: kindOf(s.kind).label, 경과: s.span || '미정', 반영: s.done ? '완료' : '대기' },
    })
  }
  function exportAll() {
    if (!ordered.length) return
    const body = ordered.map((s, i) =>
      `<h2>${i + 1}. ${esc(s.fromScene || '?')} → ${esc(s.toScene || '?')}</h2>` + buildBody(s).replace(/^<h2>.*?<\/h2>\n/, ''),
    ).join('\n<hr/>\n')
    const head = `<p>총 ${ordered.length}개 시간 점프 · 누적 경과 약 ${esc(humanCumulative(ordered.reduce((a, s) => a + s.spanDays, 0)))}</p>`
    addToProject({
      root: 'research', folder: '시간 경과 설계', title: '⏭️ 시간 흐름 설계 — 전체',
      bodyHtml: head + '\n' + body,
    })
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }
  const bar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }
  const cols: React.CSSProperties = { flex: 1, display: 'flex', minHeight: 0 }
  const listCol: React.CSSProperties = { width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: dropHot ? 'color-mix(in srgb, var(--accent) 12%, var(--paper))' : 'var(--paper)', outline: dropHot ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const listScroll: React.CSSProperties = { overflow: 'auto', flex: 1 }
  const detail: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 14, minWidth: 0 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--muted)', margin: '10px 0 3px' }
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }
  const ta: React.CSSProperties = { ...inp, minHeight: 54, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 상단 바 */}
      <div style={bar}>
        <button className="btn-primary" onClick={() => add()}>＋ 새 점프</button>
        <span style={{ color: 'var(--muted)' }}>
          {total}개 · 반영 {doneCount}/{total}
          {savedFlash && <span style={{ color: 'var(--ok)', marginLeft: 8 }}>✓ 저장됨</span>}
        </span>
        <span style={{ flex: 1 }} />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} style={{ ...inp, width: 'auto' }}>
          <option value="all">전체 보기</option>
          <option value="pending">미반영만</option>
          {KINDS.map(k => <option key={k.v} value={k.v}>{k.emoji} {k.label}</option>)}
        </select>
        {hasProjectBridge() && <button className="linkbtn" onClick={exportAll} disabled={!ordered.length}><Emoji e="📄"/> 전체 프로젝트에 추가</button>}
      </div>

      <div style={cols}>
        {/* 좌측: 시간 흐름 목록(타임라인) */}
        <div
          style={listCol}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDropHot(false)}
        >
          <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            시간 흐름(위 → 아래) · 좌측 파일을 끌어다 놓으면 점프 추가
          </div>
          <div style={listScroll}>
            {view.length === 0 && (
              <div style={{ padding: 20, color: 'var(--muted)', lineHeight: 1.7, fontSize: 12 }}>
                {total === 0 ? (
                  <>
                    아직 시간 점프가 없습니다.<br />
                    <b>＋ 새 점프</b>로 장면과 장면 사이의 시간 경과를 설계해 보세요.<br /><br />
                    각 점프마다 <b>경과 기간 · 점프 이유 · 전환 신호 · 독자 오리엔테이션 · 놓치면 안 될 사건</b>을 정리하면 시간 흐름이 매끄러워집니다.
                  </>
                ) : '이 필터에 해당하는 점프가 없습니다.'}
              </div>
            )}
            {view.map((s) => {
              const k = kindOf(s.kind)
              const active = s.id === selId
              const cum = cumulative[s.id] ?? 0
              return (
                <div key={s.id} style={{ position: 'relative', padding: '2px 8px 2px 0' }}>
                  {/* 타임라인 세로선 */}
                  <div style={{ position: 'absolute', left: 18, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                  <div
                    onClick={() => setSelId(s.id)}
                    style={{
                      position: 'relative', marginLeft: 30, marginRight: 4, padding: '8px 10px',
                      border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)',
                      borderRadius: 8, background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--panel))' : 'var(--panel)',
                      cursor: 'pointer', opacity: s.done ? 0.62 : 1,
                    }}
                  >
                    {/* 타임라인 노드 */}
                    <div style={{ position: 'absolute', left: -20, top: 12, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--paper)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                      <span><Emoji e={k.emoji}/> {k.label}</span>
                      {s.done && <span style={{ color: 'var(--ok)' }}>· 반영됨</span>}
                      <span style={{ flex: 1 }} />
                      <span title="시작점 기준 누적 경과">Σ {humanCumulative(cum)}{cum < 0 ? ' 전' : ''}</span>
                    </div>
                    <div style={{ fontWeight: 600, margin: '3px 0', lineHeight: 1.35 }}>
                      {s.fromScene || '(이전)'} <span style={{ color: 'var(--accent)' }}>→</span> {s.toScene || '(다음)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      <Emoji e="⏱️"/> {s.span || <span style={{ color: 'var(--muted)' }}>경과 기간 미정</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" onClick={ev => { ev.stopPropagation(); move(s.id, -1) }} title="위로">▲</button>
                      <button className="minibtn" onClick={ev => { ev.stopPropagation(); move(s.id, 1) }} title="아래로">▼</button>
                      <button className="minibtn" onClick={ev => { ev.stopPropagation(); patch(s.id, { done: !s.done }) }}>{s.done ? '↩︎ 대기' : '✓ 반영'}</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" onClick={ev => { ev.stopPropagation(); if (confirm('이 점프를 삭제할까요?')) remove(s.id) }} title="삭제"><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측: 상세 편집 */}
        <div style={detail}>
          {!sel ? (
            <div style={{ color: 'var(--muted)', lineHeight: 1.8, marginTop: 20 }}>
              왼쪽에서 점프를 선택하거나 <b>＋ 새 점프</b>를 눌러 편집하세요.<br />
              <div style={{ marginTop: 16, padding: 12, border: '1px dashed var(--border)', borderRadius: 8, fontSize: 12 }}>
                <b>매끄러운 시간 경과 체크리스트</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li><b>이유</b>: 왜 건너뛰는가(지루함 제거·긴장 유지·성장 압축).</li>
                  <li><b>신호</b>: 독자가 시간 이동을 즉시 알아채는 장치.</li>
                  <li><b>오리엔테이션</b>: 점프 직후 첫 몇 줄에서 언제·어디·누구를 재정립.</li>
                  <li><b>놓친 사건</b>: 공백 동안 일어났으나 나중에 효력을 발휘할 일.</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>이전 장면(점프 직전)</label>
                  <input style={inp} value={sel.fromScene} placeholder="예: 작별 인사" onChange={e => patch(sel.id, { fromScene: e.target.value })} />
                </div>
                <div style={{ alignSelf: 'flex-end', paddingBottom: 7, color: 'var(--accent)', fontSize: 18 }}>→</div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>다음 장면(점프 직후)</label>
                  <input style={inp} value={sel.toScene} placeholder="예: 귀향" onChange={e => patch(sel.id, { toScene: e.target.value })} />
                </div>
              </div>

              <label style={lbl}>점프 유형</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {KINDS.map(k => (
                  <button
                    key={k.v}
                    className={sel.kind === k.v ? 'btn-primary' : 'minibtn'}
                    title={k.hint}
                    onClick={() => patch(sel.id, { kind: k.v })}
                  ><Emoji e={k.emoji}/> {k.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{kindOf(sel.kind).hint}</div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>경과 기간(서술 표현)</label>
                  <input style={inp} value={sel.span} placeholder='예: "3년 후", "다음 날 아침"' onChange={e => patch(sel.id, { span: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>근사 일수(타임라인용)</label>
                  <input
                    style={inp} type="number" value={sel.spanDays}
                    onChange={e => { const n = parseFloat(e.target.value); patch(sel.id, { spanDays: isFinite(n) ? n : 0 }) }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {SPAN_PRESETS.map(p => (
                  <button key={p.label} className="minibtn" onClick={() => patch(sel.id, { span: p.label, spanDays: p.days })}>{p.label}</button>
                ))}
              </div>

              <label style={lbl}>점프 이유 — 왜 이 시간을 건너뛰는가(서사적 목적)</label>
              <textarea style={ta} value={sel.reason} placeholder="예: 훈련 과정은 지루하므로 압축하고, 달라진 실력만 보여 준다." onChange={e => patch(sel.id, { reason: e.target.value })} />

              <label style={lbl}>전환 신호 — 독자가 시간 이동을 알아채는 장치</label>
              <textarea style={ta} value={sel.signal} placeholder="예: 새 챕터 + 첫 문장에 계절 변화 명시" onChange={e => patch(sel.id, { signal: e.target.value })} />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {SIGNAL_CHIPS.map(c => (
                  <button
                    key={c} className="minibtn"
                    onClick={() => patch(sel.id, { signal: sel.signal ? `${sel.signal} · ${c}` : c })}
                  >＋ {c}</button>
                ))}
              </div>

              <label style={lbl}>독자 오리엔테이션 — 점프 직후 언제·어디·누구를 어떻게 재정립할까</label>
              <textarea style={ta} value={sel.orient} placeholder="예: 첫 단락에서 화자의 나이·계절·새 거주지를 자연스럽게 노출." onChange={e => patch(sel.id, { orient: e.target.value })} />

              <label style={lbl}>놓치면 안 될 사건 — 공백 동안 벌어졌고 나중에 효력을 발휘할 일</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  style={inp} value={eventDraft} placeholder="사건을 입력하고 Enter 또는 추가"
                  onChange={e => setEventDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEvent() } }}
                />
                <button className="minibtn" onClick={addEvent}>추가</button>
              </div>
              {sel.events.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                  {sel.events.map((ev, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 5, background: 'var(--panel)' }}>
                      <span style={{ color: 'var(--accent)' }}>•</span>
                      <span style={{ flex: 1 }}>{ev}</span>
                      <button className="minibtn" onClick={() => removeEvent(i)} title="삭제">✕</button>
                    </li>
                  ))}
                </ul>
              )}

              <label style={lbl}>주의 / 혼란 위험</label>
              <textarea style={ta} value={sel.risks} placeholder="예: 독자가 회상을 현재로 오해할 수 있음 → 시제·들여쓰기로 구분." onChange={e => patch(sel.id, { risks: e.target.value })} />

              <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => patch(sel.id, { done: !sel.done })}>{sel.done ? '↩︎ 미반영으로' : '✓ 본문 반영 완료'}</button>
                {hasProjectBridge() && <button className="linkbtn" onClick={() => exportOne(sel)}><Emoji e="📄"/> 프로젝트에 추가</button>}
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => { if (confirm('이 점프를 삭제할까요?')) remove(sel.id) }} style={{ color: 'var(--muted)' }}><Emoji e="🗑️"/> 삭제</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
