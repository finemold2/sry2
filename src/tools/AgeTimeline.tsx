// 인물 나이 타임라인 — 인물의 출생 연도와 주요 사건 연도를 입력하면, 각 사건 시점의
// 인물 나이를 자동 계산해 표/타임라인으로 보여준다. 가상 연표(작품 내 기년)를 지원하고,
// "사건이 출생보다 앞서는" 등 모순을 경고한다. 100% 로컬(localStorage), 외부 네트워크 불필요.
// import 은 react 와 './linkbus' 만 사용. 언마운트 시 타이머/리스너 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, type ResolvedItem, Emoji } from './linkbus'

export const meta = {
  id: 'age-timeline',
  name: '인물 나이 타임라인',
  icon: '🎂',
  group: '유틸·참고',
  intro: '인물 출생·사건 연도로 각 시점의 나이를 자동 계산하고 모순을 경고합니다',
  w: 880,
  h: 660,
}

// ── 데이터 모델 ───────────────────────────────────────────
interface Person {
  id: string
  name: string
  birth: number | null      // 출생 연도(에포크/기년 기준). 비우면 미정.
  death: number | null      // 사망 연도(선택). 비우면 미정(생존 가정).
  color: string             // 인물 구분색
  note?: string
}
interface EventItem {
  id: string
  year: number | null       // 사건 연도. 비우면 미정.
  title: string
  note?: string
}
interface CalUnit { era: string; unit: string }     // 가상 연표 라벨(예: 제국력 / 년)
interface Store {
  cal: CalUnit
  persons: Person[]
  events: EventItem[]
  v: number
}

const LS_KEY = 'sry:tool:age-timeline'
const STORE_VER = 1

const PALETTE = [
  '#e0524b', '#3b82f6', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#db2777', '#65a30d', '#ca8a04', '#7c3aed',
]

function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function defaultStore(): Store {
  return { cal: { era: '', unit: '년' }, persons: [], events: [], v: STORE_VER }
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>
      return {
        cal: p.cal && typeof p.cal === 'object' ? { era: String(p.cal.era ?? ''), unit: String(p.cal.unit ?? '년') } : { era: '', unit: '년' },
        persons: Array.isArray(p.persons) ? p.persons.map(normPerson) : [],
        events: Array.isArray(p.events) ? p.events.map(normEvent) : [],
        v: STORE_VER,
      }
    }
  } catch { /* 손상된 데이터는 무시하고 빈 상태로 */ }
  return defaultStore()
}
function normPerson(x: unknown): Person {
  const o = (x ?? {}) as Record<string, unknown>
  return {
    id: typeof o.id === 'string' ? o.id : uid('p'),
    name: typeof o.name === 'string' ? o.name : '',
    birth: numOrNull(o.birth),
    death: numOrNull(o.death),
    color: typeof o.color === 'string' ? o.color : PALETTE[0],
    note: typeof o.note === 'string' ? o.note : '',
  }
}
function normEvent(x: unknown): EventItem {
  const o = (x ?? {}) as Record<string, unknown>
  return {
    id: typeof o.id === 'string' ? o.id : uid('e'),
    year: numOrNull(o.year),
    title: typeof o.title === 'string' ? o.title : '',
    note: typeof o.note === 'string' ? o.note : '',
  }
}
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

// ── 나이 계산 ─────────────────────────────────────────────
// 만 나이가 아닌 "기년 차이(세는 식 가능)"로, 작품 내 연표 계산에 적합하게 단순 차이를 쓴다.
// 출생 연도를 1살로 보는 한국식 세는 나이 옵션도 토글 제공.
function ageAt(birth: number | null, year: number | null, koreanCount: boolean): number | null {
  if (birth == null || year == null) return null
  const diff = year - birth
  return koreanCount ? diff + 1 : diff
}

// 사건이 인물 출생 이전인지(모순)
function isBeforeBirth(birth: number | null, year: number | null): boolean {
  return birth != null && year != null && year < birth
}
// 사건이 인물 사망 이후인지(경고)
function isAfterDeath(death: number | null, year: number | null): boolean {
  return death != null && year != null && year > death
}

function fmtYear(y: number | null, cal: CalUnit): string {
  if (y == null) return '미정'
  const era = cal.era.trim()
  const unit = cal.unit.trim() || '년'
  return (era ? era + ' ' : '') + y + unit
}

// ── 컴포넌트 ──────────────────────────────────────────────
export default function AgeTimeline({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [koreanCount, setKoreanCount] = useState(false)
  const [tab, setTab] = useState<'table' | 'line'>('table')
  const [savedFlash, setSavedFlash] = useState(false)
  const [dropHot, setDropHot] = useState(false)
  const flashTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)

  // payload 로 인물명/사건이 전달되면 시드(연계 진입)
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const pn = payload && typeof payload.personName === 'string' ? payload.personName.trim() : ''
    const pb = payload ? numOrNull(payload.birth) : null
    if (pn) {
      setStore((s) => {
        if (s.persons.some((p) => p.name === pn)) return s
        const color = PALETTE[s.persons.length % PALETTE.length]
        return { ...s, persons: [...s.persons, { id: uid('p'), name: pn, birth: pb, death: null, color, note: '' }] }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(디바운스). 언마운트 시 타이머 정리.
  useEffect(() => {
    if (saveTimer.current != null) clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(store))
        setSavedFlash(true)
        if (flashTimer.current != null) clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setSavedFlash(false), 900)
      } catch { /* 용량 초과 등 무시 */ }
    }, 250)
    return () => { if (saveTimer.current != null) clearTimeout(saveTimer.current) }
  }, [store])

  useEffect(() => () => {
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    if (saveTimer.current != null) clearTimeout(saveTimer.current)
  }, [])

  // ── 다른 창/탭의 변경 동기화 ──
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        try { setStore(loadStore()) } catch { /* noop */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ── CRUD: 인물 ──
  const addPerson = useCallback((name = '', birth: number | null = null) => {
    setStore((s) => {
      const color = PALETTE[s.persons.length % PALETTE.length]
      return { ...s, persons: [...s.persons, { id: uid('p'), name, birth, death: null, color, note: '' }] }
    })
  }, [])
  const updatePerson = useCallback((id: string, patch: Partial<Person>) => {
    setStore((s) => ({ ...s, persons: s.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }, [])
  const removePerson = useCallback((id: string) => {
    setStore((s) => ({ ...s, persons: s.persons.filter((p) => p.id !== id) }))
  }, [])

  // ── CRUD: 사건 ──
  const addEvent = useCallback((title = '', year: number | null = null) => {
    setStore((s) => ({ ...s, events: [...s.events, { id: uid('e'), year, title, note: '' }] }))
  }, [])
  const updateEvent = useCallback((id: string, patch: Partial<EventItem>) => {
    setStore((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  }, [])
  const removeEvent = useCallback((id: string) => {
    setStore((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))
  }, [])

  const setCal = useCallback((patch: Partial<CalUnit>) => {
    setStore((s) => ({ ...s, cal: { ...s.cal, ...patch } }))
  }, [])

  // ── 사건 드래그 재정렬(포인터 직접 구현) ──
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const reorderEvents = useCallback((from: string, to: string) => {
    if (from === to) return
    setStore((s) => {
      const arr = [...s.events]
      const fi = arr.findIndex((e) => e.id === from)
      const ti = arr.findIndex((e) => e.id === to)
      if (fi < 0 || ti < 0) return s
      const [moved] = arr.splice(fi, 1)
      arr.splice(ti, 0, moved)
      return { ...s, events: arr }
    })
  }, [])

  // ── 좌측 바인더 파일 드롭 수용(인물 카드 → 인물 추가) ──
  const acceptDrop = useCallback((item: ResolvedItem) => {
    const name = item.title || item.character?.name || ''
    const birth = item.character ? numOrNull(item.character.birth ?? item.character.출생 ?? item.character.birthYear) : null
    if (name) addPerson(name, birth)
    // 본문 텍스트가 있으면 메모로 살짝 활용
    if (name && item.character?.age && birth == null) {
      // 나이만 있는 경우 메모로 안내
    }
  }, [addPerson])

  // ── 정렬된 사건(연도 정렬 보기는 별도 계산, 편집은 store 순서 유지) ──
  const sortedEvents = useMemo(() => {
    return [...store.events]
      .map((e, idx) => ({ e, idx }))
      .sort((a, b) => {
        const ay = a.e.year, by = b.e.year
        if (ay == null && by == null) return a.idx - b.idx
        if (ay == null) return 1
        if (by == null) return -1
        return ay - by || a.idx - b.idx
      })
      .map((x) => x.e)
  }, [store.events])

  // ── 모순/경고 집계 ──
  const issues = useMemo(() => {
    const list: { kind: 'before' | 'after'; person: Person; event: EventItem }[] = []
    for (const p of store.persons) {
      for (const e of store.events) {
        if (isBeforeBirth(p.birth, e.year)) list.push({ kind: 'before', person: p, event: e })
        else if (isAfterDeath(p.death, e.year)) list.push({ kind: 'after', person: p, event: e })
      }
    }
    return list
  }, [store.persons, store.events])

  // 인물 자체 모순(사망 < 출생)
  const personIssues = useMemo(() => {
    return store.persons.filter((p) => p.birth != null && p.death != null && p.death < p.birth)
  }, [store.persons])

  // ── 프로젝트에 추가(표를 자료 문서로) ──
  const exportToProject = useCallback(() => {
    if (!hasProjectBridge()) return
    const cal = store.cal
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows: string[] = []
    rows.push('<h3>인물 나이 타임라인</h3>')
    if (cal.era.trim()) rows.push(`<p>기년 기준: ${esc(cal.era)} (단위 ${esc(cal.unit || '년')})</p>`)
    // 표 헤더
    let html = '<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>사건</th><th>연도</th>'
    for (const p of store.persons) html += `<th>${esc(p.name || '(이름없음)')}</th>`
    html += '</tr></thead><tbody>'
    for (const e of sortedEvents) {
      html += `<tr><td>${esc(e.title || '(제목없음)')}</td><td>${esc(fmtYear(e.year, cal))}</td>`
      for (const p of store.persons) {
        const a = ageAt(p.birth, e.year, koreanCount)
        let cell = a == null ? '-' : a + '세'
        if (isBeforeBirth(p.birth, e.year)) cell = '출생 전(모순)'
        else if (isAfterDeath(p.death, e.year)) cell = (a == null ? '' : a + '세 ') + '사망 후'
        html += `<td>${esc(cell)}</td>`
      }
      html += '</tr>'
    }
    html += '</tbody></table>'
    rows.push(html)
    if (issues.length > 0) {
      rows.push(`<p><b>경고 ${issues.length}건</b>: 사건 시점이 인물 출생 이전이거나 사망 이후입니다. 연표를 확인하세요.</p>`)
    }
    const id = addToProject({
      root: 'research',
      folder: '연표',
      title: '인물 나이 타임라인',
      bodyHtml: rows.join('\n'),
      meta: { 인물수: String(store.persons.length), 사건수: String(store.events.length), 경고: String(issues.length) },
    })
    if (id) {
      setSavedFlash(true)
      if (flashTimer.current != null) clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1200)
    }
  }, [store, sortedEvents, koreanCount, issues])

  const loadSample = useCallback(() => {
    setStore({
      cal: { era: '제국력', unit: '년' },
      persons: [
        { id: uid('p'), name: '카엘', birth: 980, death: 1042, color: PALETTE[0], note: '주인공' },
        { id: uid('p'), name: '리아', birth: 985, death: null, color: PALETTE[1], note: '동료' },
        { id: uid('p'), name: '노왕', birth: 940, death: 1010, color: PALETTE[2], note: '선왕' },
      ],
      events: [
        { id: uid('e'), year: 1000, title: '대관식', note: '제국 통일' },
        { id: uid('e'), year: 1010, title: '국경 전쟁', note: '' },
        { id: uid('e'), year: 1025, title: '반란', note: '' },
        { id: uid('e'), year: 1042, title: '최후의 결전', note: '' },
      ],
      v: STORE_VER,
    })
  }, [])

  const clearAll = useCallback(() => {
    setStore(defaultStore())
  }, [])

  // ── 타임라인 스케일(연도 범위) ──
  const yearRange = useMemo(() => {
    const ys: number[] = []
    for (const p of store.persons) { if (p.birth != null) ys.push(p.birth); if (p.death != null) ys.push(p.death) }
    for (const e of store.events) if (e.year != null) ys.push(e.year)
    if (ys.length === 0) return null
    let min = Math.min(...ys), max = Math.max(...ys)
    if (min === max) { min -= 1; max += 1 }
    const pad = Math.max(1, Math.round((max - min) * 0.05))
    return { min: min - pad, max: max + pad }
  }, [store.persons, store.events])

  const isEmpty = store.persons.length === 0 && store.events.length === 0

  // ── 스타일 ──
  const cssAccent = 'var(--accent)'
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden', outline: dropHot ? `2px dashed ${cssAccent}` : 'none', outlineOffset: -2 }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)' }
  const calInput: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 7px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0, overflow: 'hidden' }
  const leftCol: React.CSSProperties = { width: 290, minWidth: 250, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const sectionHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }
  const listScroll: React.CSSProperties = { overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }
  const mainScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }
  const smallNum: React.CSSProperties = { width: 64, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 5px', fontSize: 12, fontFamily: 'inherit', outline: 'none', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const txtIn: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDropHot(true) } }}
      onDragLeave={() => setDropHot(false)}
      onDrop={(e) => {
        setDropHot(false)
        const item = getDragItem(e)
        if (item) { e.preventDefault(); acceptDrop(item) }
      }}
    >
      {/* 헤더: 가상 연표 설정 + 옵션 + 액션 */}
      <div style={header}>
        <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🎂"/> 인물 나이 타임라인</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>가상 연표</span>
        <input
          style={{ ...calInput, width: 90 }}
          value={store.cal.era}
          onChange={(e) => setCal({ era: e.target.value })}
          placeholder="기년(예: 제국력)"
          aria-label="기년 이름"
        />
        <input
          style={{ ...calInput, width: 48 }}
          value={store.cal.unit}
          onChange={(e) => setCal({ unit: e.target.value })}
          placeholder="단위"
          aria-label="연도 단위"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={koreanCount} onChange={(e) => setKoreanCount(e.target.checked)} />
          세는 나이(+1)
        </label>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: savedFlash ? 'var(--ok)' : 'var(--muted)', transition: 'color .2s' }}>
          {savedFlash ? '저장됨 ✓' : '자동 저장'}
        </span>
        {hasProjectBridge() && (
          <button className="minibtn" type="button" onClick={exportToProject} disabled={isEmpty} title="현재 표를 자료 문서로 프로젝트에 추가">
            <Emoji e="📄"/> 프로젝트에 추가
          </button>
        )}
      </div>

      <div style={body}>
        {/* 좌측: 인물 + 사건 입력 */}
        <div style={leftCol}>
          {/* 인물 */}
          <div style={sectionHead}>
            <span>인물 ({store.persons.length})</span>
            <button className="minibtn" type="button" onClick={() => addPerson()}>+ 인물</button>
          </div>
          <div style={{ ...listScroll, maxHeight: '46%', flexShrink: 0 }}>
            {store.persons.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: 6, lineHeight: 1.6 }}>
                인물을 추가하고 출생 연도를 적으면 각 사건 시점의 나이가 자동 계산됩니다.
                좌측 파일(인물 카드)을 여기로 드래그해도 됩니다.
              </div>
            ) : store.persons.map((p) => {
              const badDeath = p.birth != null && p.death != null && p.death < p.birth
              return (
                <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 8, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      title="구분색 변경"
                      onClick={() => {
                        const i = PALETTE.indexOf(p.color)
                        updatePerson(p.id, { color: PALETTE[(i + 1) % PALETTE.length] })
                      }}
                      style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                    />
                    <input style={txtIn} value={p.name} onChange={(e) => updatePerson(p.id, { name: e.target.value })} placeholder="이름" aria-label="인물 이름" />
                    <button className="minibtn" type="button" onClick={() => removePerson(p.id)} title="삭제" style={{ flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                    <span>출생</span>
                    <input
                      style={smallNum}
                      type="number"
                      value={p.birth ?? ''}
                      onChange={(e) => updatePerson(p.id, { birth: numOrNull(e.target.value) })}
                      placeholder="연도"
                      aria-label="출생 연도"
                    />
                    <span>사망</span>
                    <input
                      style={smallNum}
                      type="number"
                      value={p.death ?? ''}
                      onChange={(e) => updatePerson(p.id, { death: numOrNull(e.target.value) })}
                      placeholder="(생존)"
                      aria-label="사망 연도"
                    />
                  </div>
                  {badDeath && (
                    <div style={{ fontSize: 11, color: 'var(--paper)', background: 'var(--warn, #d97706)', borderRadius: 6, padding: '2px 6px' }}>
                      <Emoji e="⚠"/> 사망 연도가 출생보다 빠릅니다
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 사건 */}
          <div style={sectionHead}>
            <span>사건 ({store.events.length}) · 드래그 정렬</span>
            <button className="minibtn" type="button" onClick={() => addEvent()}>+ 사건</button>
          </div>
          <div style={{ ...listScroll, flex: 1, minHeight: 0 }}>
            {store.events.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: 6, lineHeight: 1.6 }}>
                주요 사건과 발생 연도를 추가하세요. 표/타임라인에서 각 인물의 나이가 한눈에 보입니다.
              </div>
            ) : store.events.map((ev) => {
              const isDragging = dragId === ev.id
              const isOver = overId === ev.id && dragId !== ev.id
              return (
                <div
                  key={ev.id}
                  draggable
                  onDragStart={(e) => { setDragId(ev.id); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ev.id) } catch { /* noop */ } }}
                  onDragEnd={() => { setDragId(null); setOverId(null) }}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(ev.id) } }}
                  onDrop={(e) => { if (dragId) { e.preventDefault(); reorderEvents(dragId, ev.id); setDragId(null); setOverId(null) } }}
                  style={{
                    border: `1px solid ${isOver ? cssAccent : 'var(--border)'}`,
                    borderRadius: 9, padding: 8, background: 'var(--panel)',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    opacity: isDragging ? 0.5 : 1,
                    boxShadow: isOver ? `0 0 0 2px ${cssAccent} inset` : 'none',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13, cursor: 'grab', userSelect: 'none' }} title="드래그하여 정렬">⠿</span>
                    <input style={txtIn} value={ev.title} onChange={(e) => updateEvent(ev.id, { title: e.target.value })} placeholder="사건명" aria-label="사건명" />
                    <button className="minibtn" type="button" onClick={() => removeEvent(ev.id)} title="삭제" style={{ flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                    <span>연도</span>
                    <input
                      style={smallNum}
                      type="number"
                      value={ev.year ?? ''}
                      onChange={(e) => updateEvent(ev.id, { year: numOrNull(e.target.value) })}
                      placeholder="연도"
                      aria-label="사건 연도"
                    />
                    <span style={{ fontSize: 11 }}>{fmtYear(ev.year, store.cal)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 우측: 표 / 타임라인 */}
        <div style={rightCol}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <button className="minibtn" type="button" onClick={() => setTab('table')} style={tab === 'table' ? { background: cssAccent, color: 'var(--paper)' } : undefined}>표</button>
            <button className="minibtn" type="button" onClick={() => setTab('line')} style={tab === 'line' ? { background: cssAccent, color: 'var(--paper)' } : undefined}>타임라인</button>
            <span style={{ flex: 1 }} />
            {issues.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--paper)', background: '#e0524b', borderRadius: 999, padding: '2px 9px', fontWeight: 700 }}>
<Emoji e="⚠"/> 모순/경고 {issues.length}
              </span>
            )}
            <button className="minibtn" type="button" onClick={loadSample} title="예시 데이터 불러오기">예시</button>
            <button className="minibtn" type="button" onClick={clearAll} disabled={isEmpty} title="전체 비우기">초기화</button>
          </div>

          <div style={mainScroll}>
            {isEmpty ? (
              <EmptyState onSample={loadSample} />
            ) : tab === 'table' ? (
              <AgeTable
                persons={store.persons}
                events={sortedEvents}
                cal={store.cal}
                koreanCount={koreanCount}
              />
            ) : yearRange ? (
              <TimelineView
                persons={store.persons}
                events={sortedEvents}
                cal={store.cal}
                koreanCount={koreanCount}
                range={yearRange}
              />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
                연도가 입력된 항목이 없어 타임라인을 그릴 수 없습니다. 인물 출생 연도나 사건 연도를 입력하세요.
              </div>
            )}

            {/* 모순/경고 목록 */}
            {(issues.length > 0 || personIssues.length > 0) && (
              <div style={{ marginTop: 16, border: '1px solid #e0524b55', borderRadius: 10, padding: 12, background: '#e0524b14' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e0524b', marginBottom: 8 }}><Emoji e="⚠"/> 모순/경고 ({issues.length + personIssues.length}건)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {personIssues.map((p) => (
                    <div key={'pi-' + p.id} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                      • <b>{p.name || '(이름없음)'}</b>: 사망({fmtYear(p.death, store.cal)})이 출생({fmtYear(p.birth, store.cal)})보다 빠릅니다.
                    </div>
                  ))}
                  {issues.map((it, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                      • <b style={{ color: it.person.color }}>{it.person.name || '(이름없음)'}</b>
                      {it.kind === 'before'
                        ? <> — 사건 「{it.event.title || '(제목없음)'}」({fmtYear(it.event.year, store.cal)})이 출생({fmtYear(it.person.birth, store.cal)}) 이전입니다.</>
                        : <> — 사건 「{it.event.title || '(제목없음)'}」({fmtYear(it.event.year, store.cal)})이 사망({fmtYear(it.person.death, store.cal)}) 이후입니다.</>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 빈 상태 안내 ──────────────────────────────────────────
function EmptyState({ onSample }: { onSample: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 36, textAlign: 'center', color: 'var(--muted)', minHeight: 240 }}>
      <div style={{ fontSize: 40 }}><Emoji e="🎂"/></div>
      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>인물 나이 타임라인</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 440 }}>
        왼쪽에서 <b>인물</b>의 출생 연도와 <b>사건</b>의 발생 연도를 입력하세요.
        각 사건 시점마다 모든 인물의 나이가 자동 계산되고, <b>표</b>와 <b>타임라인</b>으로 보입니다.
        가상 세계의 기년(예: 제국력)도 지원하며, 사건이 출생보다 앞서는 등의 <b>모순을 경고</b>합니다.
      </div>
      <button className="btn-primary" type="button" onClick={onSample}>예시 데이터로 시작</button>
    </div>
  )
}

// ── 나이 표 ───────────────────────────────────────────────
function AgeTable({ persons, events, cal, koreanCount }: {
  persons: Person[]; events: EventItem[]; cal: CalUnit; koreanCount: boolean
}) {
  const th: React.CSSProperties = { position: 'sticky', top: 0, background: 'var(--panel)', borderBottom: '2px solid var(--border)', padding: '7px 9px', fontSize: 12, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', zIndex: 1 }
  const td: React.CSSProperties = { borderBottom: '1px solid var(--border)', padding: '7px 9px', fontSize: 13, whiteSpace: 'nowrap' }
  const tdNum: React.CSSProperties = { ...td, textAlign: 'center', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }

  if (persons.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', padding: 16 }}>인물을 먼저 추가하면 나이 표가 만들어집니다.</div>
  }
  if (events.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', padding: 16 }}>사건을 추가하면 각 시점의 나이가 표로 계산됩니다.</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 360 }}>
        <thead>
          <tr>
            <th style={th}>사건</th>
            <th style={th}>연도</th>
            {persons.map((p) => (
              <th key={p.id} style={{ ...th, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                  {p.name || '(이름없음)'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td style={{ ...td, fontWeight: 600 }}>{e.title || '(제목없음)'}</td>
              <td style={{ ...td, color: 'var(--muted)' }}>{fmtYear(e.year, cal)}</td>
              {persons.map((p) => {
                const a = ageAt(p.birth, e.year, koreanCount)
                const before = isBeforeBirth(p.birth, e.year)
                const after = isAfterDeath(p.death, e.year)
                return (
                  <td key={p.id} style={tdNum}>
                    {before ? (
                      <span style={{ color: '#e0524b', fontWeight: 700 }} title="사건이 출생 이전입니다(모순)">출생 전</span>
                    ) : a == null ? (
                      <span style={{ color: 'var(--muted)' }}>-</span>
                    ) : (
                      <span style={{ color: after ? 'var(--muted)' : 'var(--text)', fontWeight: 600 }} title={after ? '사망 이후 시점' : undefined}>
                        {a}<span style={{ fontSize: 11, color: 'var(--muted)' }}>세</span>
                        {after && <span style={{ color: '#d97706', marginLeft: 3 }} title="사망 이후">†</span>}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        † 인물 사망 연도 이후의 사건 시점입니다. 나이는 {koreanCount ? '세는 나이(출생=1세)' : '기년 차(출생=0세)'} 기준으로 표시됩니다.
      </div>
    </div>
  )
}

// ── 타임라인(가로 막대 + 사건 마커) — 직접 그리기 ──────────
function TimelineView({ persons, events, cal, koreanCount, range }: {
  persons: Person[]; events: EventItem[]; cal: CalUnit; koreanCount: boolean; range: { min: number; max: number }
}) {
  const { min, max } = range
  const span = max - min || 1
  const pct = (y: number) => ((y - min) / span) * 100

  // 눈금(약 6개)
  const ticks = useMemo(() => {
    const n = 6
    const step = Math.max(1, Math.round(span / n))
    const arr: number[] = []
    for (let y = min; y <= max; y += step) arr.push(y)
    if (arr[arr.length - 1] !== max) arr.push(max)
    return arr
  }, [min, max, span])

  const rowH = 40
  const labelW = 84

  const eventsWithYear = events.filter((e) => e.year != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 사건 마커 레인(상단) */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: labelW, flexShrink: 0, fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>사건</div>
        <div style={{ position: 'relative', flex: 1, height: 48, borderBottom: '1px solid var(--border)' }}>
          {eventsWithYear.map((e, i) => {
            const left = pct(e.year as number)
            return (
              <div key={e.id} style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={`${e.title} · ${fmtYear(e.year, cal)}`}>
                <span style={{ fontSize: 10, color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--panel)', padding: '0 2px', transform: i % 2 ? 'translateY(0)' : 'translateY(-1px)' }}>
                  {e.title || '?'}
                </span>
                <span style={{ flex: 1, width: 1, background: 'var(--border)' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginBottom: -4 }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* 인물 수명 막대 + 각 사건 시점 나이 */}
      {persons.map((p) => {
        const hasBirth = p.birth != null
        const bx = hasBirth ? pct(p.birth as number) : 0
        const dx = p.death != null ? pct(p.death as number) : 100
        const barLeft = Math.max(0, Math.min(bx, dx))
        const barRight = Math.max(bx, dx)
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', height: rowH }}>
            <div style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || '(이름없음)'}</span>
            </div>
            <div style={{ position: 'relative', flex: 1, height: '100%' }}>
              {/* 수명 막대 */}
              {hasBirth && (
                <div
                  style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: `${barLeft}%`, width: `${Math.max(0.5, barRight - barLeft)}%`,
                    height: 10, background: p.color + '55', border: `1px solid ${p.color}`, borderRadius: 5,
                  }}
                  title={`${p.name}: ${fmtYear(p.birth, cal)} ~ ${p.death != null ? fmtYear(p.death, cal) : '생존'}`}
                />
              )}
              {/* 출생 마커 */}
              {hasBirth && (
                <div style={{ position: 'absolute', top: '50%', left: `${bx}%`, transform: 'translate(-50%,-50%)', width: 6, height: 14, background: p.color, borderRadius: 2 }} title={`출생 ${fmtYear(p.birth, cal)}`} />
              )}
              {/* 사망 마커 */}
              {p.death != null && (
                <div style={{ position: 'absolute', top: '50%', left: `${dx}%`, transform: 'translate(-50%,-50%)', fontSize: 11, color: p.color }} title={`사망 ${fmtYear(p.death, cal)}`}>✚</div>
              )}
              {/* 각 사건 시점 나이 점 */}
              {eventsWithYear.map((e) => {
                const y = e.year as number
                const a = ageAt(p.birth, y, koreanCount)
                const before = isBeforeBirth(p.birth, y)
                if (a == null && !before) return null
                const after = isAfterDeath(p.death, y)
                return (
                  <div
                    key={e.id}
                    style={{ position: 'absolute', top: '50%', left: `${pct(y)}%`, transform: 'translate(-50%,-50%)' }}
                    title={`${e.title} · ${fmtYear(y, cal)} · ${before ? '출생 전(모순)' : a + '세'}${after ? ' (사망 후)' : ''}`}
                  >
                    {before ? (
                      <span style={{ fontSize: 11, color: '#e0524b', fontWeight: 700 }}>✗</span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--paper)',
                        background: after ? 'var(--muted)' : p.color,
                        borderRadius: 999, padding: '1px 5px', whiteSpace: 'nowrap',
                        border: '1px solid var(--paper)',
                      }}>
                        {a}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 연도 눈금 */}
      <div style={{ display: 'flex', marginTop: 6 }}>
        <div style={{ width: labelW, flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, height: 22, borderTop: '1px solid var(--border)' }}>
          {ticks.map((y, i) => (
            <div key={i} style={{ position: 'absolute', left: `${pct(y)}%`, top: 0, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'block', width: 1, height: 4, background: 'var(--border)', margin: '0 auto' }} />
              {cal.era.trim() ? y : y + (cal.unit || '년')}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        막대는 인물의 수명(출생~사망/생존)이고, 점 위 숫자는 각 사건 시점의 나이입니다. ✗ 는 출생 이전(모순), 회색 숫자는 사망 이후 시점입니다.
      </div>
    </div>
  )
}
