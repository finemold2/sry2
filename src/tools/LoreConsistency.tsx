// 세계관 일관성 체커 — 작품 설정을 "사실(주체 · 속성 · 값)" 삼항으로 등록하고,
// 같은 주체·같은 속성에 서로 다른 값이 등록되면 모순으로 경고한다.
// 예) (간달프 · 머리색 · 회색) 과 (간달프 · 머리색 · 흰색) → 모순. (간달프 · 지팡이 · 있음) 은 무관.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 네트워크/미디어 없음).
// 영속: localStorage 'sry:tool:lore-consistency' 에 자동 저장/복원.
// 연계(linkbus): 모순 없는 설정집을 실제 프로젝트 자료('research')/'설정' 폴더에 문서로 추가.
//               좌측 바인더 파일을 끌어다 놓으면 본문에서 "주체 · 속성: 값" 형태 줄을 자동으로 사실 후보로 파싱.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, addToStash, hasStash, type ResolvedItem, Emoji } from './linkbus'

export const meta = {
  id: 'lore-consistency',
  name: '세계관 일관성 체커',
  icon: '🧩',
  group: '구상·정리',
  intro: '설정을 주체·속성·값 사실로 등록하면 같은 주체·속성의 모순을 자동으로 잡아줍니다',
  w: 820,
  h: 680,
}

const LS_KEY = 'sry:tool:lore-consistency'

interface Fact {
  id: string
  subject: string   // 주체 (인물·장소·물건·세력 등)
  attr: string      // 속성 (머리색·나이·출신·소유물 등)
  value: string     // 값
  note: string      // 근거/출처 메모(어느 장·장면에서 정해졌는가)
  ok: boolean       // 모순 검사 제외(의도된 변화 등 사용자가 "괜찮음"으로 표시)
  createdAt: number
  updatedAt: number
}

interface Persist {
  facts: Fact[]
  subjFilter: string | null
}

type SortKey = 'updated' | 'subject' | 'attr'

// ── 유틸 ──
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 비교용 정규화 — 공백 축약 + 소문자화. 모순 판정은 "값이 정규화 후 다른가"로 한다.
function norm(s: string): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase()
}
function nkey(s: string): string {
  return norm(s)
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 주체+속성을 묶는 키(모순 그룹 식별자).
function pairKey(subject: string, attr: string): string {
  return nkey(subject) + '\x00' + nkey(attr)
}

function emptyFact(): Fact {
  return { id: '', subject: '', attr: '', value: '', note: '', ok: false, createdAt: 0, updatedAt: 0 }
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { facts: [], subjFilter: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.facts) ? p.facts : Array.isArray(p) ? p : []
    const facts: Fact[] = arr
      .filter((x: unknown) => x && typeof x === 'object')
      .map((x: Record<string, unknown>) => ({
        id: String(x.id || newId()),
        subject: String(x.subject || ''),
        attr: String(x.attr || ''),
        value: String(x.value || ''),
        note: String(x.note || ''),
        ok: !!x.ok,
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Number(x.createdAt) || Date.now(),
      }))
      .filter((f: Fact) => f.subject || f.attr || f.value)
    const subjFilter = typeof p?.subjFilter === 'string' ? p.subjFilter : null
    return { facts, subjFilter }
  } catch {
    return { facts: [], subjFilter: null }
  }
}

// 모순 분석 — 같은 (주체·속성) 인데 정규화된 값이 2개 이상이면 모순 그룹.
// ok=true 로 표시된 사실은 검사에서 제외(의도된 변화/예외).
interface ConflictGroup {
  key: string
  subject: string  // 표시용(첫 사실의 원문)
  attr: string
  facts: Fact[]    // 이 그룹에서 충돌에 가담한 사실들
  values: string[] // 서로 다른 값(원문, 등장순)
}

function analyze(facts: Fact[]): { conflicts: ConflictGroup[]; conflictIds: Set<string> } {
  const byPair = new Map<string, Fact[]>()
  for (const f of facts) {
    if (f.ok) continue
    if (!nkey(f.subject) || !nkey(f.attr) || !nkey(f.value)) continue
    const k = pairKey(f.subject, f.attr)
    const a = byPair.get(k)
    if (a) a.push(f); else byPair.set(k, [f])
  }
  const conflicts: ConflictGroup[] = []
  const conflictIds = new Set<string>()
  for (const [k, group] of byPair) {
    const distinct = new Map<string, Fact[]>()
    for (const f of group) {
      const vk = nkey(f.value)
      const a = distinct.get(vk)
      if (a) a.push(f); else distinct.set(vk, [f])
    }
    if (distinct.size >= 2) {
      // 모순: 서로 다른 값이 둘 이상
      const involved: Fact[] = []
      const values: string[] = []
      for (const [, fs] of distinct) {
        values.push(fs[0].value.trim())
        for (const f of fs) { involved.push(f); conflictIds.add(f.id) }
      }
      // 표시용 정렬: 최근 갱신순
      involved.sort((a, b) => b.updatedAt - a.updatedAt)
      conflicts.push({ key: k, subject: group[0].subject.trim(), attr: group[0].attr.trim(), facts: involved, values })
    }
  }
  conflicts.sort((a, b) => a.subject.localeCompare(b.subject, 'ko') || a.attr.localeCompare(b.attr, 'ko'))
  return { conflicts, conflictIds }
}

// 바인더 파일 본문에서 "주체 · 속성: 값" / "주체 - 속성: 값" / "속성: 값" 패턴을 사실 후보로 파싱.
function parseFactsFromText(item: ResolvedItem): Partial<Fact>[] {
  const out: Partial<Fact>[] = []
  const title = (item.title || '').trim()
  const text = item.text || ''
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.length > 120) continue
    // "A · B : C" 또는 "A - B : C"
    let m = line.match(/^(.{1,40}?)\s*[·\-–—]\s*(.{1,40}?)\s*[:：]\s*(.+)$/)
    if (m) { out.push({ subject: m[1].trim(), attr: m[2].trim(), value: m[3].trim() }); continue }
    // "B: C" → 주체는 문서 제목으로
    m = line.match(/^([^:：]{1,40}?)\s*[:：]\s*(.+)$/)
    if (m && title) { out.push({ subject: title, attr: m[1].trim(), value: m[2].trim() }); continue }
  }
  // 캐릭터 카드 필드도 흡수(있다면)
  if (item.character) {
    const subj = title || item.character['name'] || '인물'
    for (const [k, v] of Object.entries(item.character)) {
      if (k === 'name') continue
      if (typeof v === 'string' && v.trim()) out.push({ subject: subj, attr: k, value: v.trim() })
    }
  }
  return out.filter((f) => f.subject && f.attr && f.value).slice(0, 60)
}

export default function LoreConsistency({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [facts, setFacts] = useState<Fact[]>(init.current.facts)
  const [subjFilter, setSubjFilter] = useState<string | null>(init.current.subjFilter)
  const [form, setForm] = useState<Fact>(emptyFact())
  const [editId, setEditId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [note, setNote] = useState('')
  const [noteWarn, setNoteWarn] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const [tab, setTab] = useState<'list' | 'subjects'>('list')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subjRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 초기 사실 주입(다른 도구에서 열 때).
  useEffect(() => {
    if (!payload) return
    const subj = typeof payload.subject === 'string' ? payload.subject : ''
    const attr = typeof payload.attr === 'string' ? payload.attr : ''
    const value = typeof payload.value === 'string' ? payload.value : ''
    if (subj || attr || value) {
      setForm((f) => ({ ...f, subject: subj || f.subject, attr: attr || f.attr, value: value || f.value }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ facts, subjFilter } as Persist))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, subjFilter])

  const flash = (msg: string, warn = false) => {
    setNote(msg); setNoteWarn(warn)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const { conflicts, conflictIds } = useMemo(() => analyze(facts), [facts])

  // 자동완성 후보(이미 등록된 주체·속성).
  const subjects = useMemo(() => {
    const seen = new Map<string, { name: string; count: number; conflict: boolean }>()
    for (const f of facts) {
      const key = nkey(f.subject)
      if (!key) continue
      const cur = seen.get(key) || { name: f.subject.trim(), count: 0, conflict: false }
      cur.count++
      if (conflictIds.has(f.id)) cur.conflict = true
      seen.set(key, cur)
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [facts, conflictIds])

  const attrOptions = useMemo(() => {
    const s = new Set<string>()
    for (const f of facts) { const a = f.attr.trim(); if (a) s.add(a) }
    return [...s].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [facts])

  // 목록(검색·필터·정렬 적용).
  const visible = useMemo(() => {
    const q = norm(query)
    let arr = facts.filter((f) => {
      if (subjFilter && nkey(f.subject) !== nkey(subjFilter)) return false
      if (showConflictsOnly && !conflictIds.has(f.id)) return false
      if (q) {
        const hay = norm(f.subject + ' ' + f.attr + ' ' + f.value + ' ' + f.note)
        if (!hay.includes(q)) return false
      }
      return true
    })
    arr = arr.slice()
    if (sortKey === 'updated') arr.sort((a, b) => b.updatedAt - a.updatedAt)
    else if (sortKey === 'subject') arr.sort((a, b) => a.subject.localeCompare(b.subject, 'ko') || a.attr.localeCompare(b.attr, 'ko'))
    else arr.sort((a, b) => a.attr.localeCompare(b.attr, 'ko') || a.subject.localeCompare(b.subject, 'ko'))
    return arr
  }, [facts, query, subjFilter, sortKey, showConflictsOnly, conflictIds])

  // ── CRUD ──
  const resetForm = () => { setForm(emptyFact()); setEditId(null) }

  const submit = () => {
    const subject = form.subject.trim()
    const attr = form.attr.trim()
    const value = form.value.trim()
    if (!subject || !attr || !value) { flash('주체·속성·값을 모두 입력하세요.', true); return }
    const now = Date.now()
    if (editId) {
      setFacts((p) => p.map((f) => (f.id === editId ? { ...f, subject, attr, value, note: form.note.trim(), ok: form.ok, updatedAt: now } : f)))
      flash('사실을 수정했습니다.')
    } else {
      // 완전 동일(주체·속성·값 정규화 일치) 중복은 막는다.
      const dup = facts.find((f) => pairKey(f.subject, f.attr) === pairKey(subject, attr) && nkey(f.value) === nkey(value))
      if (dup) { flash('이미 같은 사실이 등록되어 있습니다.', true); return }
      const rec: Fact = { id: newId(), subject, attr, value, note: form.note.trim(), ok: form.ok, createdAt: now, updatedAt: now }
      setFacts((p) => [rec, ...p])
      // 같은 주체·속성에 다른 값이 이미 있으면 모순 예고.
      const willConflict = facts.some((f) => !f.ok && pairKey(f.subject, f.attr) === pairKey(subject, attr) && nkey(f.value) !== nkey(value))
      flash(willConflict ? '등록됐지만 기존 값과 모순됩니다. 아래 경고를 확인하세요.' : '사실을 등록했습니다.', willConflict)
    }
    setForm((f) => ({ ...emptyFact(), subject: f.subject, attr: '' })) // 같은 주체로 연속 입력 편의
    setEditId(null)
    if (subjRef.current && !editId) { /* 포커스 유지용 placeholder */ }
  }

  const startEdit = (f: Fact) => {
    setForm({ ...f })
    setEditId(f.id)
    setConfirmDel(null)
    flash('수정 중입니다. 입력 칸을 고치고 저장하세요.')
  }

  const remove = (id: string) => {
    setFacts((p) => p.filter((f) => f.id !== id))
    if (editId === id) resetForm()
    setConfirmDel(null)
  }

  const toggleOk = (id: string) => {
    setFacts((p) => p.map((f) => (f.id === id ? { ...f, ok: !f.ok, updatedAt: Date.now() } : f)))
  }

  // 모순 그룹에서 "이 값으로 통일" — 나머지 가담 사실을 이 값으로 맞춘다.
  const unifyTo = (group: ConflictGroup, value: string) => {
    const now = Date.now()
    setFacts((p) => p.map((f) => {
      if (pairKey(f.subject, f.attr) !== group.key) return f
      if (f.ok) return f
      return nkey(f.value) === nkey(value) ? f : { ...f, value: value.trim(), updatedAt: now }
    }))
    flash(`〈${group.subject} · ${group.attr}〉를 "${value.trim()}" 값으로 통일했습니다.`)
  }

  // 드래그앤드롭(바인더 파일) 수용.
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropping) setDropping(true) }
  }
  const onDragLeave = () => { if (dropping) setDropping(false) }
  const onDrop = (e: React.DragEvent) => {
    setDropping(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const cands = parseFactsFromText(item)
    if (!cands.length) { flash(`〈${item.title || '문서'}〉에서 "주체 · 속성: 값" 형태의 사실을 찾지 못했습니다.`, true); return }
    const now = Date.now()
    const existing = new Set(facts.map((f) => pairKey(f.subject, f.attr) + '\x00' + nkey(f.value)))
    const fresh: Fact[] = []
    for (const c of cands) {
      const k = pairKey(c.subject!, c.attr!) + '\x00' + nkey(c.value!)
      if (existing.has(k)) continue
      existing.add(k)
      fresh.push({ id: newId(), subject: c.subject!.trim(), attr: c.attr!.trim(), value: c.value!.trim(), note: `〈${item.title || '문서'}〉에서 가져옴`, ok: false, createdAt: now, updatedAt: now })
    }
    if (!fresh.length) { flash('가져온 사실이 모두 이미 등록되어 있습니다.'); return }
    setFacts((p) => [...fresh, ...p])
    flash(`〈${item.title || '문서'}〉에서 ${fresh.length}개 사실을 가져왔습니다. 모순을 확인하세요.`)
  }

  // ── 내보내기 ──
  const exportText = (): string => {
    const lines: string[] = ['# 세계관 설정집', '']
    const bySubj = new Map<string, Fact[]>()
    for (const f of facts) {
      const k = f.subject.trim() || '(주체 없음)'
      const a = bySubj.get(k); if (a) a.push(f); else bySubj.set(k, [f])
    }
    const subjOrder = [...bySubj.keys()].sort((a, b) => a.localeCompare(b, 'ko'))
    for (const s of subjOrder) {
      lines.push(`## ${s}`)
      const fs = bySubj.get(s)!.slice().sort((a, b) => a.attr.localeCompare(b.attr, 'ko'))
      for (const f of fs) {
        const flagCon = conflictIds.has(f.id) ? '  ⚠️모순' : ''
        const flagOk = f.ok ? '  (예외)' : ''
        lines.push(`- ${f.attr}: ${f.value}${flagCon}${flagOk}${f.note ? `  · 근거: ${f.note}` : ''}`)
      }
      lines.push('')
    }
    if (conflicts.length) {
      lines.push('## ⚠️ 모순 점검 결과', '')
      for (const c of conflicts) {
        lines.push(`- ${c.subject} · ${c.attr}: ${c.values.join(' ↔ ')}`)
      }
    } else {
      lines.push('## ✅ 모순 없음')
    }
    return lines.join('\n')
  }

  const copyText = (text: string, msg = '클립보드에 복사했습니다.') => {
    const done = () => { if (mounted.current) flash(msg) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사에 실패했습니다. 직접 선택해 복사하세요.', true) }
  }

  // 프로젝트 설정집 문서 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (!facts.length) { flash('등록된 사실이 없습니다.', true); return }
    const bySubj = new Map<string, Fact[]>()
    for (const f of facts) {
      const k = f.subject.trim() || '(주체 없음)'
      const a = bySubj.get(k); if (a) a.push(f); else bySubj.set(k, [f])
    }
    const subjOrder = [...bySubj.keys()].sort((a, b) => a.localeCompare(b, 'ko'))
    const parts: string[] = []
    if (conflicts.length) {
      parts.push(`<p style="color:#b00020;"><b>⚠️ 미해결 모순 ${conflicts.length}건</b> — 같은 주체·속성에 다른 값이 있습니다.</p>`)
      parts.push('<ul>')
      for (const c of conflicts) parts.push(`<li>${escHtml(c.subject)} · ${escHtml(c.attr)}: ${escHtml(c.values.join(' ↔ '))}</li>`)
      parts.push('</ul><hr/>')
    } else {
      parts.push('<p style="color:#0a7d27;"><b>✅ 모순 없음</b> — 등록된 사실이 모두 일관됩니다.</p><hr/>')
    }
    for (const s of subjOrder) {
      parts.push(`<p><b>${escHtml(s)}</b></p><ul>`)
      const fs = bySubj.get(s)!.slice().sort((a, b) => a.attr.localeCompare(b.attr, 'ko'))
      for (const f of fs) {
        const con = conflictIds.has(f.id) ? ' <span style="color:#b00020;">⚠️</span>' : ''
        const ok = f.ok ? ' <span style="color:#888;">(예외)</span>' : ''
        const src = f.note ? ` <span style="color:#888;">· ${escHtml(f.note)}</span>` : ''
        parts.push(`<li>${escHtml(f.attr)}: ${escHtml(f.value)}${con}${ok}${src}</li>`)
      }
      parts.push('</ul>')
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정',
      title: '세계관 설정집',
      bodyHtml: parts.join(''),
      synopsis: conflicts.length ? `미해결 모순 ${conflicts.length}건` : '모순 없음',
      meta: { 사실수: String(facts.length), 주체수: String(subjOrder.length), 모순: String(conflicts.length) },
    })
    flash(id ? '프로젝트 자료 〈설정〉 폴더에 설정집 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const stashSummary = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.', true); return }
    addToStash({ kind: 'note', label: '세계관 설정집', text: exportText() })
    flash('수집함에 설정집을 담았습니다.')
  }

  const loadExample = () => {
    if (facts.length && !window.confirm('현재 등록된 사실에 예시 데이터를 더합니다. 계속할까요?')) return
    const now = Date.now()
    const ex: Array<[string, string, string, string]> = [
      ['주인공 리안', '머리색', '은발', '1장 등장 묘사'],
      ['주인공 리안', '머리색', '검은 머리', '7장 회상 — 모순!'],
      ['주인공 리안', '나이', '17세', '프롤로그'],
      ['주인공 리안', '오른손', '검을 쥔다', '결투 장면'],
      ['은빛 탑', '높이', '99층', '도시 소개'],
      ['은빛 탑', '높이', '백 층', '클라이맥스 — 모순!'],
      ['은빛 탑', '위치', '도시 중앙', '지도 설명'],
      ['마법 〈각인〉', '발동 조건', '피의 대가', '마법 체계'],
      ['마법 〈각인〉', '지속 시간', '하루', '규칙 설명'],
    ]
    const recs: Fact[] = ex.map(([s, a, v, n], i) => ({ id: newId(), subject: s, attr: a, value: v, note: n, ok: false, createdAt: now + i, updatedAt: now + i }))
    setFacts((p) => [...recs, ...p])
    flash('예시 설정을 불러왔습니다. 〈머리색〉·〈높이〉에서 모순 경고를 확인하세요.')
  }

  const clearAll = () => {
    if (!facts.length) return
    if (!window.confirm(`등록된 사실 ${facts.length}개를 모두 삭제할까요? 되돌릴 수 없습니다.`)) return
    setFacts([])
    resetForm()
    setSubjFilter(null)
    flash('모든 사실을 삭제했습니다.')
  }

  // ── 스타일 ──
  const c = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' } as React.CSSProperties,
    head: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' } as React.CSSProperties,
    body: { flex: 1, minHeight: 0, display: 'flex', minWidth: 0 } as React.CSSProperties,
    left: { width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', padding: 14, gap: 12 } as React.CSSProperties,
    right: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } as React.CSSProperties,
    rightHead: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' } as React.CSSProperties,
    rightBody: { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties,
    card: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 } as React.CSSProperties,
    label: { fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, display: 'block' } as React.CSSProperties,
    input: { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    sectionTitle: { fontSize: 12.5, fontWeight: 700, margin: '0 0 8px' } as React.CSSProperties,
    iconBtn: { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 7 } as React.CSSProperties,
    empty: { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '24px 14px', border: '1px dashed var(--border)', borderRadius: 12 } as React.CSSProperties,
    hint: { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.6 } as React.CSSProperties,
  }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })

  const total = facts.length
  const okCount = facts.filter((f) => f.ok).length

  return (
    <div
      style={{ ...c.wrap, outline: dropping ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 헤더 */}
      <div style={c.head}>
        <span style={{ fontSize: 18 }}><Emoji e="🧩"/></span>
        <strong style={{ fontSize: 15 }}>세계관 일관성 체커</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>사실 {total}개 · 주체 {subjects.length}</span>
        {conflicts.length > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--warn)', borderRadius: 999, padding: '2px 9px' }}><Emoji e="⚠️"/> 모순 {conflicts.length}건</span>
        ) : total > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)' }}><Emoji e="✅"/> 모순 없음</span>
        ) : null}
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={loadExample} title="예시 설정 데이터를 불러옵니다(모순 포함)"><Emoji e="📚"/> 예시</button>
        <button className="minibtn" onClick={() => copyText(exportText(), '설정집을 텍스트로 복사했습니다.')} disabled={!total}>⬇ 내보내기</button>
      </div>

      {note && (
        <div style={{ padding: '7px 14px', fontSize: 12.5, borderBottom: '1px solid var(--border)', color: noteWarn ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)' }}>{note}</div>
      )}

      <div style={c.body}>
        {/* 좌: 입력 폼 + 주체 필터 */}
        <div style={c.left}>
          {/* 사실 입력 */}
          <div style={c.card}>
            <h4 style={c.sectionTitle}>{editId ? <><Emoji e="✏️"/> 사실 수정</> : '＋ 사실 등록'}</h4>
            <div style={{ marginBottom: 8 }}>
              <label style={c.label}>주체 — 인물·장소·물건·세력</label>
              <input
                ref={subjRef}
                style={c.input}
                list="lore-subjects"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus?.() }}
                placeholder="예: 주인공 리안"
                maxLength={60}
              />
              <datalist id="lore-subjects">{subjects.map((s) => <option key={s.name} value={s.name} />)}</datalist>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={c.label}>속성 — 머리색·나이·출신·소유물 등</label>
              <input
                style={c.input}
                list="lore-attrs"
                value={form.attr}
                onChange={(e) => setForm((f) => ({ ...f, attr: e.target.value }))}
                placeholder="예: 머리색"
                maxLength={40}
              />
              <datalist id="lore-attrs">{attrOptions.map((a) => <option key={a} value={a} />)}</datalist>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={c.label}>값</label>
              <input
                style={c.input}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
                placeholder="예: 은발"
                maxLength={120}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={c.label}>근거/출처 (선택) — 어디서 정해졌는가</label>
              <input
                style={c.input}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="예: 1장 등장 묘사"
                maxLength={120}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ok} onChange={(e) => setForm((f) => ({ ...f, ok: e.target.checked }))} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
              모순 검사 제외 (의도된 변화·예외)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={submit}>{editId ? '수정 저장' : '＋ 등록'}</button>
              {editId && <button className="minibtn" onClick={resetForm}>취소</button>}
            </div>
            <div style={{ ...c.hint, marginTop: 8 }}>같은 <b>주체·속성</b>에 다른 <b>값</b>이 들어오면 자동으로 모순으로 잡힙니다.</div>
          </div>

          {/* 주체 필터 */}
          <div style={c.card}>
            <h4 style={c.sectionTitle}>주체별 보기</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button style={chip(!subjFilter)} onClick={() => setSubjFilter(null)}>전체 ({total})</button>
              {subjects.map((s) => (
                <button
                  key={s.name}
                  style={{ ...chip(nkey(subjFilter || '') === nkey(s.name)), borderColor: s.conflict ? 'var(--warn)' : (nkey(subjFilter || '') === nkey(s.name) ? 'var(--accent)' : 'var(--border)') }}
                  onClick={() => setSubjFilter(nkey(subjFilter || '') === nkey(s.name) ? null : s.name)}
                  title={s.conflict ? '이 주체에 모순이 있습니다' : ''}
                >
                  {s.conflict && <><Emoji e="⚠️"/> </>}{s.name} ({s.count})
                </button>
              ))}
              {subjects.length === 0 && <span style={c.hint}>아직 등록된 주체가 없습니다.</span>}
            </div>
          </div>

          <div style={c.hint}>
            좌측 바인더의 문서를 이 창으로 <b>끌어다 놓으면</b> 본문에서 “주체 · 속성: 값” 형태의 줄을 사실 후보로 가져옵니다.
            {hasStash() && <> · <button className="linkbtn" onClick={stashSummary} style={{ marginTop: 6 }}><Emoji e="📌"/> 수집함에 설정집 담기</button></>}
          </div>
        </div>

        {/* 우: 모순 경고 + 사실 목록 */}
        <div style={c.right}>
          <div style={c.rightHead}>
            <button style={chip(tab === 'list')} onClick={() => setTab('list')}><Emoji e="📋"/> 사실 목록</button>
            <button style={chip(tab === 'subjects')} onClick={() => setTab('subjects')}><Emoji e="🗂"/> 주체 카드</button>
            <span style={{ flex: 1 }} />
            <input
              style={{ ...c.input, width: 180, padding: '6px 9px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 검색(주체·속성·값·근거)"
            />
            {query && <button style={c.iconBtn} onClick={() => setQuery('')} title="검색 지우기">✕</button>}
          </div>

          <div style={c.rightBody}>
            {/* 모순 경고 패널 — 항상 상단 */}
            {conflicts.length > 0 && (
              <div style={{ ...c.card, border: '1px solid var(--warn)', background: 'color-mix(in srgb, var(--warn) 7%, var(--panel))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: 13.5, color: 'var(--warn)' }}><Emoji e="⚠️"/> 모순 {conflicts.length}건 발견</strong>
                  <span style={c.hint}>같은 주체·속성에 다른 값이 있습니다.</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {conflicts.map((g) => (
                    <div key={g.key} style={{ border: '1px solid var(--warn)', borderRadius: 9, padding: '9px 11px', background: 'var(--paper)' }}>
                      <div style={{ fontSize: 12.5, marginBottom: 7 }}>
                        <b>{g.subject}</b> <span style={{ color: 'var(--muted)' }}>·</span> <b>{g.attr}</b>
                        <span style={{ color: 'var(--muted)' }}> 에 서로 다른 값 {g.values.length}개:</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {g.facts.map((f) => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <b style={{ color: 'var(--warn)' }}>“{f.value}”</b>
                              {f.note && <span style={{ color: 'var(--muted)' }}> — {f.note}</span>}
                            </span>
                            <button style={c.iconBtn} title="이 값으로 통일" onClick={() => unifyTo(g, f.value)}>이 값으로 통일</button>
                            <button style={c.iconBtn} title="이 사실을 예외 처리(검사 제외)" onClick={() => toggleOk(f.id)}>예외</button>
                            <button style={c.iconBtn} title="수정" onClick={() => startEdit(f)}><Emoji e="✏️"/></button>
                            <button style={{ ...c.iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => remove(f.id)}><Emoji e="🗑️"/></button>
                          </div>
                        ))}
                      </div>
                      <div style={{ ...c.hint, marginTop: 7 }}>의도한 변화라면 한쪽을 <b>예외</b>로 두거나 근거를 명시하세요(예: “7장에서 염색”).</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'list' ? (
              <>
                {/* 목록 도구막대 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={c.label as React.CSSProperties}>정렬</span>
                  {([['updated', '최근순'], ['subject', '주체순'], ['attr', '속성순']] as [SortKey, string][]).map(([k, lbl]) => (
                    <button key={k} style={chip(sortKey === k)} onClick={() => setSortKey(k)}>{lbl}</button>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', marginLeft: 4 }}>
                    <input type="checkbox" checked={showConflictsOnly} onChange={(e) => setShowConflictsOnly(e.target.checked)} style={{ width: 14, height: 14, accentColor: 'var(--warn)' }} />
                    모순만 보기
                  </label>
                  <span style={{ flex: 1 }} />
                  <span style={c.hint}>{visible.length}/{total} 표시{okCount ? ` · 예외 ${okCount}` : ''}{subjFilter ? ` · 주체: ${subjFilter}` : ''}</span>
                  {facts.length > 0 && <button style={{ ...c.iconBtn, color: 'var(--warn)' }} onClick={clearAll} title="모두 삭제">전체 삭제</button>}
                </div>

                {/* 목록 */}
                {visible.length === 0 ? (
                  <div style={c.empty}>
                    {total === 0 ? (
                      <>
                        아직 등록된 사실이 없습니다.<br />
                        왼쪽에서 <b>주체 · 속성 · 값</b>을 입력해 설정을 쌓아보세요.<br />
                        <span style={{ fontSize: 12 }}>막막하면 위의 <b><Emoji e="📚"/> 예시</b>로 시작하세요.</span>
                      </>
                    ) : (
                      <>조건에 맞는 사실이 없습니다.<br /><span style={{ fontSize: 12 }}>검색어·필터를 바꿔보세요.</span></>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {visible.map((f) => {
                      const conf = conflictIds.has(f.id)
                      return (
                        <div
                          key={f.id}
                          style={{
                            border: '1px solid ' + (editId === f.id ? 'var(--accent)' : conf ? 'var(--warn)' : 'var(--border)'),
                            borderRadius: 10, padding: '9px 11px', background: f.ok ? 'var(--chrome-2)' : 'var(--panel)',
                            display: 'flex', flexDirection: 'column', gap: 5,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 13 }}>{f.subject}</b>
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>·</span>
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{f.attr}</span>
                            <span style={{ color: 'var(--muted)' }}>:</span>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: conf ? 'var(--warn)' : 'var(--text)' }}>{f.value}</span>
                            {conf && <span style={{ fontSize: 11, color: '#fff', background: 'var(--warn)', borderRadius: 6, padding: '1px 6px' }}>모순</span>}
                            {f.ok && <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>예외</span>}
                            <span style={{ flex: 1 }} />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button style={c.iconBtn} title={f.ok ? '검사에 다시 포함' : '모순 검사에서 제외'} onClick={() => toggleOk(f.id)}>{f.ok ? <Emoji e="🔓"/> : <Emoji e="🔒"/>}</button>
                              <button style={c.iconBtn} title="수정" onClick={() => startEdit(f)}><Emoji e="✏️"/></button>
                              {confirmDel === f.id ? (
                                <>
                                  <button style={{ ...c.iconBtn, color: '#fff', background: 'var(--warn)', borderColor: 'var(--warn)' }} title="삭제 확정" onClick={() => remove(f.id)}>삭제</button>
                                  <button style={c.iconBtn} onClick={() => setConfirmDel(null)}>취소</button>
                                </>
                              ) : (
                                <button style={{ ...c.iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(f.id)}><Emoji e="🗑️"/></button>
                              )}
                            </div>
                          </div>
                          {f.note && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>근거: {f.note}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* 주체 카드 뷰 */
              <SubjectCards
                facts={facts} subjects={subjects} conflictIds={conflictIds}
                onEdit={startEdit} onFilter={(name) => { setSubjFilter(name); setTab('list') }}
                styles={c}
              />
            )}

            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 4, flexWrap: 'wrap' }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={toProject}
                disabled={!hasProjectBridge() || !total}
                title={hasProjectBridge() ? '등록된 설정을 프로젝트 자료 〈설정〉 폴더에 설정집 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              ><Emoji e="📄"/> 프로젝트에 설정집 추가</button>
              <button className="linkbtn" onClick={() => copyText(exportText(), '설정집을 텍스트로 복사했습니다.')} disabled={!total}><Emoji e="📋"/> 텍스트 복사</button>
            </div>

            <div style={c.hint}>
              모순 판정은 값의 대소문자·공백을 무시하고 비교합니다. 같은 주체·속성에 값이 둘 이상이면 경고하며,
              의도한 변화는 <b>예외(<Emoji e="🔒"/>)</b>로 표시하면 경고에서 빠집니다. 모든 데이터는 이 브라우저에 자동 저장됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 주체 카드 뷰 ──
function SubjectCards(props: {
  facts: Fact[]
  subjects: { name: string; count: number; conflict: boolean }[]
  conflictIds: Set<string>
  onEdit: (f: Fact) => void
  onFilter: (name: string) => void
  styles: Record<string, React.CSSProperties>
}) {
  const { facts, subjects, conflictIds, onEdit, onFilter, styles } = props
  if (!subjects.length) {
    return <div style={styles.empty}>주체가 없습니다. 왼쪽에서 사실을 등록하세요.</div>
  }
  const bySubj = new Map<string, Fact[]>()
  for (const f of facts) {
    const k = nkey(f.subject)
    if (!k) continue
    const a = bySubj.get(k); if (a) a.push(f); else bySubj.set(k, [f])
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
      {subjects.map((s) => {
        const fs = (bySubj.get(nkey(s.name)) || []).slice().sort((a, b) => a.attr.localeCompare(b.attr, 'ko'))
        return (
          <div key={s.name} style={{ border: '1px solid ' + (s.conflict ? 'var(--warn)' : 'var(--border)'), borderRadius: 11, padding: 11, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <b style={{ fontSize: 13.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.conflict && <><Emoji e="⚠️"/> </>}{s.name}</b>
              <button style={styles.iconBtn} title="이 주체만 목록에서 보기" onClick={() => onFilter(s.name)}>›</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {fs.map((f) => {
                const conf = conflictIds.has(f.id)
                return (
                  <div key={f.id} onClick={() => onEdit(f)} title="클릭해 수정" style={{ display: 'flex', gap: 6, fontSize: 12, cursor: 'pointer', borderRadius: 6, padding: '2px 4px' }}>
                    <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{f.attr}</span>
                    <span style={{ color: 'var(--muted)' }}>:</span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, color: conf ? 'var(--warn)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}{conf && <> <Emoji e="⚠️"/></>}{f.ok && <> <Emoji e="🔒"/></>}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
