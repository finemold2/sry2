// 타임라인 역설 탐지 — 인물의 생년(또는 기준 나이)·사건 날짜·동시성/인과 제약을 입력하면
// 연대표 상의 모순을 자동 검출한다. 검출 규칙:
//   · 나이 음수 — 인물이 태어나기 전에 사건에 참여
//   · 동시 위치 충돌 — 같은 인물이 같은 날 서로 다른 장소에 동시 등장
//   · 인과 역전 — '결과' 사건이 '원인' 사건보다 먼저 발생(원인→결과 의존관계 위반)
//   · 사후 등장 — 인물이 사망 사건 이후의 사건에 등장
//   · 순환 인과 — 원인 의존이 고리(A→B→A)를 이룸(위상정렬 실패)
// 모든 계산은 브라우저 로컬. 외부 네트워크/패키지 없음. react 와 ./linkbus 만 import.
// localStorage 'sry:tool:timeline-paradox' 자동 저장/복원.
// 연동: 좌측 바인더 문서 드롭(텍스트에서 날짜·인물 자동 추출)·payload.text 수용,
//       라이브러리 characters/places 수용, 사건을 snippets 로 저장, 프로젝트/수집함 추가, 관련 도구 열기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'timeline-paradox',
  name: '타임라인 역설 탐지',
  icon: '⏳',
  group: '세계관',
  intro: '인물 생년·사건 날짜·인과/동시성 제약을 넣으면 나이 음수·중복 위치·인과 역전 같은 모순을 자동 검출합니다',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:timeline-paradox'

// ── 모델 ──────────────────────────────────────────────────────
interface Person {
  id: string
  name: string
  born: number | null   // 출생 연도(정수, null=미상)
  died: number | null   // 사망 연도(정수, null=생존/미상)
}
interface EventRow {
  id: string
  title: string
  date: number | null         // 발생 연도(정수, null=미상)
  place: string               // 장소명
  actors: string[]            // 등장 인물 id 목록
  causes: string[]            // 이 사건의 원인이 되는 사건 id 목록(원인→이 사건)
}
interface SaveShape { title: string; persons: Person[]; events: EventRow[] }

// ── 유틸 ──────────────────────────────────────────────────────
function newId(p: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return p + '_' + crypto.randomUUID().slice(0, 8) } catch {}
  return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : null
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function defaultData(): SaveShape {
  const p1 = newId('per'); const p2 = newId('per')
  const e1 = newId('evt'); const e2 = newId('evt')
  return {
    title: '',
    persons: [
      { id: p1, name: '주인공', born: 1990, died: null },
      { id: p2, name: '조력자', born: 1985, died: null },
    ],
    events: [
      { id: e1, title: '첫 만남', date: 2010, place: '도시', actors: [p1, p2], causes: [] },
      { id: e2, title: '결별', date: 2015, place: '항구', actors: [p1, p2], causes: [e1] },
    ],
  }
}

function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultData()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return defaultData()
    const persons: Person[] = Array.isArray(p.persons) ? p.persons
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({ id: String(x.id || newId('per')), name: String(x.name ?? ''), born: toIntOrNull(x.born), died: toIntOrNull(x.died) })) : []
    const events: EventRow[] = Array.isArray(p.events) ? p.events
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => ({
        id: String(x.id || newId('evt')),
        title: String(x.title ?? ''),
        date: toIntOrNull(x.date),
        place: String(x.place ?? ''),
        actors: Array.isArray(x.actors) ? x.actors.map((a: any) => String(a)) : [],
        causes: Array.isArray(x.causes) ? x.causes.map((a: any) => String(a)) : [],
      })) : []
    return { title: typeof p.title === 'string' ? p.title : '', persons, events }
  } catch { return defaultData() }
}

// ── 텍스트에서 연도/이름 추출(드롭/payload 수용) ───────────────
// 본문에서 4자리 연도(또는 'BC 300' 형태)와 인물명 후보를 뽑아 사건 골격을 제안.
function extractYears(text: string): number[] {
  const out = new Set<number>()
  const re = /(?:기원전\s*|BC\s*)?(\d{1,4})\s*년/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let y = parseInt(m[1], 10)
    if (m[0].includes('기원전') || /BC/i.test(m[0])) y = -y
    if (Number.isFinite(y)) out.add(y)
  }
  // 단독 4자리 연도(서기 1000~2999)도 수용
  const re2 = /\b(1\d{3}|2\d{3})\b/g
  while ((m = re2.exec(text))) out.add(parseInt(m[1], 10))
  return Array.from(out).sort((a, b) => a - b)
}

// ── 역설 검출 엔진 ────────────────────────────────────────────
type Severity = 'error' | 'warn'
interface Issue { id: string; severity: Severity; kind: string; msg: string; eventIds: string[]; personIds: string[] }

function detect(persons: Person[], events: EventRow[]): Issue[] {
  const issues: Issue[] = []
  const pById = new Map(persons.map((p) => [p.id, p]))
  const eById = new Map(events.map((e) => [e.id, e]))
  const push = (severity: Severity, kind: string, msg: string, eventIds: string[] = [], personIds: string[] = []) =>
    issues.push({ id: newId('iss'), severity, kind, msg, eventIds, personIds })

  // 1) 나이 음수 / 사후 등장
  for (const e of events) {
    if (e.date === null) continue
    for (const aid of e.actors) {
      const p = pById.get(aid)
      if (!p) continue
      if (p.born !== null && e.date < p.born) {
        push('error', '나이 음수', `${p.name || '인물'}은(는) ${p.born}년생인데 ${e.date}년 사건 "${e.title || '제목없음'}"에 등장합니다(출생 전 ${p.born - e.date}년).`, [e.id], [p.id])
      }
      if (p.died !== null && e.date > p.died) {
        push('error', '사후 등장', `${p.name || '인물'}은(는) ${p.died}년에 사망했는데 ${e.date}년 사건 "${e.title || '제목없음'}"에 등장합니다(사후 ${e.date - p.died}년).`, [e.id], [p.id])
      }
    }
  }

  // 2) 인물 생몰 자체의 모순
  for (const p of persons) {
    if (p.born !== null && p.died !== null && p.died < p.born) {
      push('error', '생몰 역전', `${p.name || '인물'}의 사망연도(${p.died})가 출생연도(${p.born})보다 빠릅니다.`, [], [p.id])
    }
  }

  // 3) 동시 위치 충돌 — 같은 인물·같은 연도·다른 장소
  // (연도 단위 동시성: 같은 해에 둘 이상 장소에 등장하면 경고)
  const byActorDate = new Map<string, EventRow[]>()
  for (const e of events) {
    if (e.date === null) continue
    for (const aid of e.actors) {
      const k = aid + '@' + e.date
      const arr = byActorDate.get(k) || []
      arr.push(e); byActorDate.set(k, arr)
    }
  }
  for (const [k, arr] of byActorDate) {
    if (arr.length < 2) continue
    const places = new Set(arr.map((e) => e.place.trim()).filter(Boolean))
    if (places.size >= 2) {
      const aid = k.split('@')[0]
      const p = pById.get(aid)
      const year = k.split('@')[1]
      push('warn', '동시 위치 충돌', `${p?.name || '인물'}이(가) ${year}년에 ${Array.from(places).join(' / ')} 등 ${places.size}곳에 동시에 등장합니다(사건: ${arr.map((e) => e.title || '제목없음').join(', ')}).`, arr.map((e) => e.id), p ? [p.id] : [])
    }
  }

  // 4) 인과 역전 — 원인 사건이 결과 사건보다 늦거나 같은 날
  for (const e of events) {
    for (const cid of e.causes) {
      const c = eById.get(cid)
      if (!c) continue
      if (c.date !== null && e.date !== null) {
        if (c.date > e.date) {
          push('error', '인과 역전', `"${c.title || '제목없음'}"(${c.date})이(가) 그 결과인 "${e.title || '제목없음'}"(${e.date})보다 늦게 일어납니다.`, [c.id, e.id], [])
        } else if (c.date === e.date) {
          push('warn', '인과 동시', `원인 "${c.title || '제목없음'}"과(와) 결과 "${e.title || '제목없음'}"이(가) 같은 ${e.date}년에 일어납니다(선후가 모호).`, [c.id, e.id], [])
        }
      }
    }
  }

  // 5) 순환 인과(위상정렬) — 원인 그래프에 사이클이 있으면 검출
  const adj = new Map<string, string[]>() // cause -> [event]
  for (const e of events) for (const cid of e.causes) {
    if (!eById.has(cid)) continue
    const arr = adj.get(cid) || []; arr.push(e.id); adj.set(cid, arr)
  }
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  const stack: string[] = []
  let cyclePath: string[] | null = null
  const dfs = (u: string) => {
    color.set(u, GRAY); stack.push(u)
    for (const v of (adj.get(u) || [])) {
      const cv = color.get(v) || WHITE
      if (cv === GRAY) {
        const i = stack.indexOf(v)
        cyclePath = stack.slice(i).concat(v)
        return
      }
      if (cv === WHITE) { dfs(v); if (cyclePath) return }
    }
    stack.pop(); color.set(u, BLACK)
  }
  for (const e of events) {
    if ((color.get(e.id) || WHITE) === WHITE) { dfs(e.id); if (cyclePath) break }
  }
  if (cyclePath) {
    const names = (cyclePath as string[]).map((id) => eById.get(id)?.title || '제목없음')
    push('error', '순환 인과', `사건들이 인과 고리를 이룹니다: ${names.join(' → ')}. 원인 의존을 끊어야 합니다.`, cyclePath as string[], [])
  }

  // 6) 정렬 어긋남(부드러운 경고) — date 미상 사건이 인과 관계를 가질 때
  for (const e of events) {
    for (const cid of e.causes) {
      const c = eById.get(cid)
      if (!c) continue
      if (c.date === null || e.date === null) {
        push('warn', '날짜 미상 인과', `"${c.title || '제목없음'}" → "${e.title || '제목없음'}" 인과 관계인데 한쪽 날짜가 비어 있어 선후를 검증할 수 없습니다.`, [c.id, e.id], [])
        break
      }
    }
  }

  return issues
}

const SEV_COLOR: Record<Severity, string> = { error: 'var(--warn)', warn: 'var(--muted)' }
const SEV_LABEL: Record<Severity, string> = { error: '모순', warn: '주의' }

export default function TimelineParadox({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [persons, setPersons] = useState<Person[]>(init.current.persons)
  const [events, setEvents] = useState<EventRow[]>(init.current.events)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const [tab, setTab] = useState<'edit' | 'timeline'>('edit')
  const mounted = useRef(true)

  const libChars = useLibraryList('characters')
  const libPlaces = useLibraryList('places')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, persons, events } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, persons, events])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  // payload.text / payload.years 수용(관련 도구에서 열렸을 때)
  const consumedPayload = useRef(false)
  useEffect(() => {
    if (consumedPayload.current || !payload) return
    consumedPayload.current = true
    const text = typeof payload.text === 'string' ? payload.text : ''
    if (text) ingestText(text, '가져온 텍스트')
    if (typeof payload.title === 'string' && payload.title && !title) setTitle(payload.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // ── 텍스트에서 사건 골격 만들기 ───────────────────────────────
  const ingestText = (text: string, src: string) => {
    const years = extractYears(text)
    if (years.length === 0) { setNote(`"${src}"에서 연도를 찾지 못했어요. 본문에 "2015년" 같은 표기가 있으면 사건으로 추출합니다.`); return }
    setEvents((prev) => {
      const added: EventRow[] = years.slice(0, 12).map((y, i) => ({
        id: newId('evt'),
        title: `${src} 사건 ${i + 1}`,
        date: y, place: '', actors: [], causes: [],
      }))
      return [...prev, ...added]
    })
    setToast(`연도 ${Math.min(years.length, 12)}개를 사건으로 추가했어요.`)
    setTab('edit')
  }

  // ── 인물 CRUD ─────────────────────────────────────────────────
  const addPerson = () => setPersons((p) => [...p, { id: newId('per'), name: '', born: null, died: null }])
  const removePerson = (id: string) => {
    setPersons((p) => p.filter((x) => x.id !== id))
    setEvents((ev) => ev.map((e) => ({ ...e, actors: e.actors.filter((a) => a !== id) })))
  }
  const patchPerson = (id: string, patch: Partial<Person>) => setPersons((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  // 라이브러리 캐릭터 가져오기
  const importChar = (cid: string) => {
    const c = libChars.find((x) => x.id === cid)
    if (!c) return
    const f = c.fields || {}
    // 라이브러리 인물 스키마(CHARACTER_FIELDS)에는 출생연도(born) 필드가 없다.
    // 대신 표준 키 'age'(나이)가 있으면 현재 연도에서 역산해 출생연도를 추정한다.
    // 나이가 없으면 null 로 두어 사용자가 직접 출생연도를 입력하도록 유도한다.
    // age 가 '30세' 처럼 비순수 숫자여도 숫자만 뽑아 출생연도를 추정한다.
    const ageMatch = f.age != null ? String(f.age).match(/-?\d+/) : null
    const age = ageMatch ? toIntOrNull(ageMatch[0]) : null
    const born = age !== null ? new Date().getFullYear() - age : null
    const dup = persons.some((x) => x.name === c.name)
    if (dup) { setNote(`이미 "${c.name}"이(가) 있어요.`); return }
    setPersons((p) => [...p, { id: newId('per'), name: c.name || '인물', born, died: null }])
    setToast(born !== null
      ? `라이브러리 인물 "${c.name}"을(를) 추가했어요.`
      : `라이브러리 인물 "${c.name}"을(를) 추가했어요. 나이 정보가 없어 출생연도는 직접 입력하세요.`)
  }

  // ── 사건 CRUD ─────────────────────────────────────────────────
  const addEvent = () => setEvents((e) => [...e, { id: newId('evt'), title: '', date: null, place: '', actors: [], causes: [] }])
  const removeEvent = (id: string) => {
    setEvents((e) => e.filter((x) => x.id !== id).map((x) => ({ ...x, causes: x.causes.filter((c) => c !== id) })))
  }
  const patchEvent = (id: string, patch: Partial<EventRow>) => setEvents((e) => e.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const toggleActor = (eid: string, pid: string) => setEvents((e) => e.map((x) => (x.id === eid ? { ...x, actors: x.actors.includes(pid) ? x.actors.filter((a) => a !== pid) : [...x.actors, pid] } : x)))
  const toggleCause = (eid: string, cid: string) => setEvents((e) => e.map((x) => (x.id === eid ? { ...x, causes: x.causes.includes(cid) ? x.causes.filter((c) => c !== cid) : [...x.causes, cid] } : x)))

  const resetAll = () => { const d = defaultData(); setPersons(d.persons); setEvents(d.events); setNote('') }

  // ── 검출 ──────────────────────────────────────────────────────
  const issues = useMemo(() => detect(persons, events), [persons, events])
  const errCount = issues.filter((i) => i.severity === 'error').length
  const warnCount = issues.filter((i) => i.severity === 'warn').length

  // 정렬된 사건(연도 순; 미상은 끝으로)
  const sortedEvents = useMemo(() => {
    return events.slice().sort((a, b) => {
      if (a.date === null && b.date === null) return 0
      if (a.date === null) return 1
      if (b.date === null) return -1
      return a.date - b.date
    })
  }, [events])

  const pName = (id: string) => persons.find((p) => p.id === id)?.name || '인물'
  const issueEventSet = useMemo(() => {
    const s = new Set<string>()
    issues.forEach((i) => i.eventIds.forEach((e) => s.add(e)))
    return s
  }, [issues])

  // ── 드롭(좌측 바인더 문서) ───────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropHot(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (item && item.text) { ingestText(item.text, item.title || '문서') }
    else setNote('이 문서에서 본문 텍스트를 읽지 못했어요.')
  }

  // ── 내보내기/연동 ─────────────────────────────────────────────
  const buildText = (): string => {
    const L: string[] = []
    L.push(title.trim() ? `[타임라인 역설 점검] ${title.trim()}` : '[타임라인 역설 점검]')
    L.push('')
    L.push(`인물 ${persons.length}명 · 사건 ${events.length}개 · 모순 ${errCount} · 주의 ${warnCount}`)
    L.push('')
    L.push('— 연대표 —')
    sortedEvents.forEach((e) => {
      const d = e.date === null ? '연도미상' : (e.date < 0 ? `기원전 ${-e.date}년` : `${e.date}년`)
      const who = e.actors.map(pName).join(', ')
      L.push(`${d} · ${e.title || '제목없음'}${e.place ? ' @' + e.place : ''}${who ? ' (' + who + ')' : ''}`)
    })
    L.push('')
    if (issues.length === 0) { L.push('검출된 모순이 없습니다.') }
    else {
      L.push('— 검출 결과 —')
      issues.forEach((i, n) => L.push(`${n + 1}. [${SEV_LABEL[i.severity]}/${i.kind}] ${i.msg}`))
    }
    return L.join('\n')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (mounted.current) setToast('보고서를 복사했어요.')
    } catch { if (mounted.current) setNote('복사에 실패했어요.') }
  }

  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>타임라인 역설 점검</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 인물 ${persons.length} · 사건 ${events.length} · 모순 ${errCount} · 주의 ${warnCount}</p>`)
    parts.push('<p><strong>연대표</strong></p><ol>')
    sortedEvents.forEach((e) => {
      const d = e.date === null ? '연도미상' : (e.date < 0 ? `기원전 ${-e.date}년` : `${e.date}년`)
      const who = e.actors.map(pName).join(', ')
      parts.push(`<li>${esc(d)} · ${esc(e.title || '제목없음')}${e.place ? ' @' + esc(e.place) : ''}${who ? ' (' + esc(who) + ')' : ''}</li>`)
    })
    parts.push('</ol>')
    if (issues.length === 0) parts.push('<p>검출된 모순이 없습니다.</p>')
    else {
      parts.push('<p><strong>검출 결과</strong></p><ol>')
      issues.forEach((i) => parts.push(`<li>[${SEV_LABEL[i.severity]}/${esc(i.kind)}] ${esc(i.msg)}</li>`))
      parts.push('</ol>')
    }
    return parts.join('')
  }

  const toProject = () => {
    if (!hasProjectBridge() || events.length === 0) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관',
      title: title.trim() ? `타임라인 점검 — ${title.trim()}` : '타임라인 점검',
      bodyHtml: buildHtml(),
      meta: { 인물수: String(persons.length), 사건수: String(events.length), 모순: String(errCount), 주의: String(warnCount) },
    })
    if (!mounted.current) return
    setToast(id ? '프로젝트 자료(세계관)에 보고서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.')
  }

  const toStash = () => {
    if (!hasStash()) return
    addToStash({ kind: 'memo', label: title.trim() ? `타임라인 점검 — ${title.trim()}` : '타임라인 점검', text: buildText() })
    setToast('수집함에 점검 보고서를 담았어요.')
  }

  // 검증된(모순 0) 연대표를 스니펫 라이브러리로 저장
  const saveTimeline = () => {
    const text = sortedEvents.map((e) => {
      const d = e.date === null ? '연도미상' : (e.date < 0 ? `기원전 ${-e.date}년` : `${e.date}년`)
      return `${d} · ${e.title || '제목없음'}${e.place ? ' @' + e.place : ''}`
    }).join('\n')
    if (!text.trim()) { setNote('저장할 사건이 없어요.'); return }
    addToLibrary('snippets', { text: (title.trim() ? title.trim() + '\n' : '') + text, tags: ['타임라인', errCount === 0 ? '검증됨' : '미해결'], source: 'timeline-paradox' })
    setToast('연대표를 스니펫 라이브러리에 저장했어요.')
  }

  // 관련 도구 열기(연대표 텍스트 전달)
  const openRelated = (toolId: string) => openToolLinked(toolId, { text: buildText(), title: title.trim() || undefined })

  // ── 스타일 ─────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 120, padding: '7px 10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 11, padding: 11 }
  const sTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em', display: 'flex', alignItems: 'center', gap: 6 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.55 }
  const tinyInput: React.CSSProperties = { padding: '5px 7px', fontSize: 12, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const chip = (on: boolean): React.CSSProperties => ({ fontSize: 11, padding: '3px 7px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--border)', background: on ? 'var(--accent)' : 'var(--chrome-2)', color: on ? '#fff' : 'var(--muted)', userSelect: 'none' })
  const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '7px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 8, background: on ? 'var(--accent)' : 'var(--chrome-2)', color: on ? '#fff' : 'var(--muted)' })

  const isEmpty = persons.length === 0 && events.length === 0

  return (
    <div style={wrap} onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) } }} onDragLeave={() => dropHot && setDropHot(false)} onDrop={onDrop}>
      {/* 헤더 */}
      <div style={head}>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/연대표 제목 (선택)" maxLength={80} aria-label="제목" />
        <button className="minibtn" onClick={copyAll} title="보고서 텍스트 복사">복사</button>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || events.length === 0} title={hasProjectBridge() ? '자료 › 세계관 폴더에 점검 보고서 추가' : '프로젝트에 연결되지 않음'}>프로젝트</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title="수집함에 담기">수집함</button>
      </div>

      {/* 요약 배너 */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: errCount ? 'var(--warn)' : 'var(--ok)' }}>
          {errCount ? `모순 ${errCount}건 발견` : '모순 없음'}
        </span>
        {warnCount > 0 && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>주의 {warnCount}건</span>}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>인물 {persons.length} · 사건 {events.length}</span>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '4px 12px 0' }}>{toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '4px 12px 0' }}>{note}</div>}
      {dropHot && <div style={{ ...hint, color: 'var(--accent)', padding: '4px 12px 0', fontWeight: 700 }}>여기에 놓으면 본문에서 연도를 추출해 사건으로 추가합니다.</div>}

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px 0' }}>
        <button style={tabBtn(tab === 'edit')} onClick={() => setTab('edit')}>입력 / 검출</button>
        <button style={tabBtn(tab === 'timeline')} onClick={() => setTab('timeline')}>타임라인 뷰</button>
      </div>

      <div style={body}>
        {isEmpty && (
          <div style={{ ...panel, textAlign: 'center', lineHeight: 1.7 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>인물과 사건을 입력해 모순을 점검하세요</div>
            <div style={hint}>
              인물의 출생/사망 연도와 사건의 날짜·장소·등장인물·원인을 넣으면<br />
              나이 음수, 같은 해 다른 장소 동시 등장, 원인보다 빠른 결과 같은 모순을 자동으로 찾아냅니다.<br />
              좌측 바인더 문서를 끌어다 놓거나 라이브러리 인물을 가져올 수도 있어요.
            </div>
            <div style={{ marginTop: 10 }}><button className="btn-primary" onClick={resetAll}>예시로 시작</button></div>
          </div>
        )}

        {tab === 'edit' && !isEmpty && (
          <>
            {/* 인물 */}
            <div style={panel}>
              <div style={sTitle}>
                <span>인물 · 출생/사망 연도</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addPerson}>＋ 인물</button>
              </div>
              {persons.length === 0 ? <div style={hint}>인물이 없습니다. 추가하세요.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {persons.map((p) => (
                    <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input style={{ ...tinyInput, flex: 1, minWidth: 90 }} value={p.name} placeholder="이름" maxLength={40} onChange={(e) => patchPerson(p.id, { name: e.target.value })} aria-label="인물 이름" />
                      <input style={{ ...tinyInput, width: 72 }} type="number" value={p.born ?? ''} placeholder="출생" onChange={(e) => patchPerson(p.id, { born: toIntOrNull(e.target.value) })} aria-label="출생연도" />
                      <input style={{ ...tinyInput, width: 72 }} type="number" value={p.died ?? ''} placeholder="사망" onChange={(e) => patchPerson(p.id, { died: toIntOrNull(e.target.value) })} aria-label="사망연도" />
                      <button className="minibtn" style={{ color: 'var(--warn)', padding: '3px 7px' }} onClick={() => removePerson(p.id)} aria-label="인물 삭제">삭제</button>
                    </div>
                  ))}
                </div>
              )}
              {libChars.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>라이브러리 인물 가져오기</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {libChars.slice(0, 16).map((c) => (
                      <span key={c.id} style={chip(false)} onClick={() => importChar(c.id)} title="이 인물을 추가">{c.name || '이름없음'}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ ...hint, marginTop: 6 }}>음수 연도는 기원전을 뜻합니다(예: -300 = 기원전 300년).</div>
            </div>

            {/* 사건 */}
            <div style={panel}>
              <div style={sTitle}>
                <span>사건 · 날짜 / 장소 / 등장 / 원인</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={addEvent}>＋ 사건</button>
              </div>
              {events.length === 0 ? <div style={hint}>사건이 없습니다. 추가하세요.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {events.map((ev) => {
                    const flagged = issueEventSet.has(ev.id)
                    return (
                      <div key={ev.id} style={{ border: `1px solid ${flagged ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 9, padding: 9, background: 'var(--chrome-2)' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input style={{ ...tinyInput, flex: 1, minWidth: 100 }} value={ev.title} placeholder="사건 제목" maxLength={60} onChange={(e) => patchEvent(ev.id, { title: e.target.value })} aria-label="사건 제목" />
                          <input style={{ ...tinyInput, width: 76 }} type="number" value={ev.date ?? ''} placeholder="연도" onChange={(e) => patchEvent(ev.id, { date: toIntOrNull(e.target.value) })} aria-label="사건 연도" />
                          <input style={{ ...tinyInput, width: 86 }} value={ev.place} placeholder="장소" maxLength={40} onChange={(e) => patchEvent(ev.id, { place: e.target.value })} list="tlp-places" aria-label="사건 장소" />
                          <button className="minibtn" style={{ color: 'var(--warn)', padding: '3px 7px' }} onClick={() => removeEvent(ev.id)} aria-label="사건 삭제">삭제</button>
                        </div>
                        {/* 등장 인물 */}
                        {persons.length > 0 && (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 3 }}>등장 인물</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {persons.map((p) => (
                                <span key={p.id} style={chip(ev.actors.includes(p.id))} onClick={() => toggleActor(ev.id, p.id)}>{p.name || '이름없음'}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* 원인 사건 */}
                        {events.length > 1 && (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 3 }}>이 사건의 원인(선행 사건)</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {events.filter((x) => x.id !== ev.id).map((x) => (
                                <span key={x.id} style={chip(ev.causes.includes(x.id))} onClick={() => toggleCause(ev.id, x.id)} title="원인으로 지정">{x.title || '제목없음'}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 검출 결과 */}
            <div style={{ ...panel, borderLeft: `3px solid ${errCount ? 'var(--warn)' : 'var(--ok)'}` }}>
              <div style={sTitle}><span>검출 결과</span><span style={{ flex: 1 }} /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{issues.length}건</span></div>
              {issues.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ok)' }}>검출된 모순이 없습니다. 일관된 연대표예요.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {issues.map((i) => (
                    <div key={i.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: i.severity === 'error' ? 'var(--warn)' : 'var(--chrome-2)', color: i.severity === 'error' ? '#fff' : 'var(--muted)' }}>{SEV_LABEL[i.severity]}</span>
                      <span style={{ flex: 1, color: i.severity === 'error' ? 'var(--text)' : 'var(--muted)' }}>
                        <b style={{ color: SEV_COLOR[i.severity] }}>{i.kind}</b> · {i.msg}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'timeline' && !isEmpty && (
          <div style={panel}>
            <div style={sTitle}><span>타임라인 뷰 · 연도 오름차순</span></div>
            {sortedEvents.length === 0 ? <div style={hint}>사건이 없습니다.</div> : (
              <div style={{ position: 'relative', paddingLeft: 14 }}>
                <div style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedEvents.map((e) => {
                    const flagged = issueEventSet.has(e.id)
                    const d = e.date === null ? '연도 미상' : (e.date < 0 ? `기원전 ${-e.date}년` : `${e.date}년`)
                    const who = e.actors.map(pName).filter(Boolean)
                    return (
                      <div key={e.id} style={{ position: 'relative', paddingLeft: 14 }}>
                        <span style={{ position: 'absolute', left: -13.5, top: 3, width: 11, height: 11, borderRadius: 999, background: flagged ? 'var(--warn)' : 'var(--accent)', border: '2px solid var(--paper)' }} />
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{d}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: flagged ? 'var(--warn)' : 'var(--text)' }}>{e.title || '제목없음'}{e.place ? ` · ${e.place}` : ''}</div>
                        {who.length > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>등장: {who.join(', ')}</div>}
                        {e.causes.length > 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>원인: {e.causes.map((c) => events.find((x) => x.id === c)?.title || '제목없음').join(', ')}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="minibtn" onClick={saveTimeline} title="스니펫 라이브러리에 연대표 저장">연대표 저장</button>
              <button className="linkbtn" onClick={() => openRelated('scene-list')} title="장면 목록 도구 열기">장면 목록 열기</button>
              <button className="linkbtn" onClick={() => openRelated('world-wiki')} title="세계관 위키 도구 열기">세계관 위키 열기</button>
            </div>
          </div>
        )}

        {/* 하단 도구 */}
        {!isEmpty && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="minibtn" onClick={resetAll} title="예시 데이터로 초기화">초기화</button>
            <span style={{ flex: 1 }} />
            <span style={hint}>입력은 이 브라우저에 자동 저장됩니다.</span>
          </div>
        )}
      </div>

      {/* 장소 자동완성(라이브러리 장소 활용) */}
      <datalist id="tlp-places">
        {libPlaces.map((pl) => <option key={pl.id} value={pl.name} />)}
      </datalist>
    </div>
  )
}
