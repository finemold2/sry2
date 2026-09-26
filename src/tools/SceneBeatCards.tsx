// 장면 비트 카드(SceneBeatCards) — 코르크보드식 장면 설계 도구.
//  · 각 장면을 카드로 만든다: POV / 목표 / 갈등 / 전환점 / 결과 / 감정 변화 필드.
//  · 막(Act)별 컬럼으로 묶고, 카드를 포인터 드래그로 같은 막 안/막 사이로 재정렬·이동한다.
//  · 상태색(초안=노랑 / 수정=파랑 / 완성=초록)으로 진행을 한눈에.
//  · localStorage 영속('sry:tool:scene-beat-cards'). 빈 상태 안내.
//  · 연계(linkbus): 좌측 바인더 파일 드롭으로 카드 생성, 프로젝트 「장면」 폴더로 카드별/전체 개요 내보내기.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 없음. 라이브러리 없이 직접 드래그 구현.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = {
  id: 'scene-beat-cards',
  name: '장면 비트 카드',
  icon: '🃏',
  group: '구상·정리',
  intro: '장면을 POV·목표·갈등·전환점·결과·감정변화 카드로 만들어 막별 코르크보드에서 드래그로 배치하세요',
  w: 940,
  h: 660,
}

const LS_KEY = 'sry:tool:scene-beat-cards'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
type Status = 'draft' | 'revise' | 'done'

interface Beat {
  id: string
  act: number           // 막 번호 (1부터)
  title: string
  pov: string           // 시점 인물
  goal: string          // 목표
  conflict: string      // 갈등
  turn: string          // 전환점
  outcome: string       // 결과
  emotion: string       // 감정 변화 (예: 희망 → 절망)
  status: Status
  createdAt: number
  updatedAt: number
}

const STATUSES: { key: Status; label: string; color: string; dot: string }[] = [
  { key: 'draft', label: '초안', color: '#e3b341', dot: '🟡' },   // 노랑
  { key: 'revise', label: '수정', color: '#5aa7f0', dot: '🔵' },  // 파랑
  { key: 'done', label: '완성', color: '#3fb950', dot: '🟢' },    // 초록
]
const statusMeta = (s: Status) => STATUSES.find((x) => x.key === s) || STATUSES[0]
const isStatus = (v: unknown): v is Status => typeof v === 'string' && STATUSES.some((s) => s.key === v)

// 카드 본문 필드 정의(편집기/표시/내보내기 공용)
const FIELDS: { key: keyof Pick<Beat, 'pov' | 'goal' | 'conflict' | 'turn' | 'outcome' | 'emotion'>; label: string; icon: string; ph: string }[] = [
  { key: 'pov', label: 'POV', icon: '👁', ph: '누구의 시선으로?' },
  { key: 'goal', label: '목표', icon: '🎯', ph: '이 장면에서 인물이 원하는 것' },
  { key: 'conflict', label: '갈등', icon: '⚔️', ph: '무엇이 가로막는가' },
  { key: 'turn', label: '전환점', icon: '🔀', ph: '흐름을 뒤집는 순간' },
  { key: 'outcome', label: '결과', icon: '🏁', ph: '장면이 끝난 뒤 달라진 점' },
  { key: 'emotion', label: '감정 변화', icon: '💓', ph: '예: 희망 → 절망' },
]

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function emptyBeat(act = 1): Omit<Beat, 'id' | 'createdAt' | 'updatedAt'> {
  return { act, title: '', pov: '', goal: '', conflict: '', turn: '', outcome: '', emotion: '', status: 'draft' }
}

const clampAct = (n: unknown): number => {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v) || v < 1) return 1
  if (v > 99) return 99
  return v
}

// 첫 사용자에게 보여줄 예시 비트(저장 데이터가 전혀 없을 때만 시드).
function seedBeats(): Beat[] {
  const now = Date.now()
  const make = (s: Partial<Beat>, i: number): Beat => ({
    id: newId(),
    act: 1, title: '', pov: '', goal: '', conflict: '', turn: '', outcome: '', emotion: '', status: 'draft',
    ...s,
    createdAt: now + i, updatedAt: now + i,
  })
  return [
    make({ act: 1, title: '평범한 일상의 균열', pov: '주인공', goal: '평온을 지키려 한다', conflict: '낯선 편지가 도착한다', turn: '편지에 옛 이름이 적혀 있다', outcome: '과거가 흔들리기 시작한다', emotion: '안정 → 불안', status: 'done' }, 0),
    make({ act: 1, title: '떠밀리는 결심', pov: '주인공', goal: '진실을 외면하려 한다', conflict: '믿었던 이가 거짓을 들킨다', turn: '돌아갈 수 없게 된다', outcome: '여정을 시작한다', emotion: '망설임 → 결단', status: 'revise' }, 1),
    make({ act: 2, title: '첫 시험과 대가', pov: '주인공', goal: '동맹을 얻으려 한다', conflict: '대가가 너무 크다', turn: '비밀 하나를 내준다', outcome: '취약점이 노출된다', emotion: '기대 → 후회', status: 'draft' }, 2),
    make({ act: 3, title: '마지막 선택', pov: '주인공', goal: '모든 것을 끝내려 한다', conflict: '적과 자신이 닮아 있다', turn: '용서인가 복수인가', outcome: '', emotion: '분노 → ?', status: 'draft' }, 3),
  ]
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증으로 끌어올림.
function loadBeats(): { beats: Beat[]; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { beats: seedBeats(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { beats: seedBeats(), seeded: true }
    const beats: Beat[] = []
    for (const o of parsed) {
      if (!o || typeof o !== 'object') continue
      if (typeof o.title !== 'string') continue
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      beats.push({
        id: String(o.id || newId()),
        act: clampAct(o.act),
        title: String(o.title),
        pov: str(o.pov),
        goal: str(o.goal),
        conflict: str(o.conflict),
        turn: str(o.turn),
        outcome: str(o.outcome),
        emotion: str(o.emotion),
        status: isStatus(o.status) ? o.status : 'draft',
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    // 빈 배열은 사용자가 모두 지운 결과일 수 있으므로 존중(시드하지 않음).
    return { beats, seeded: false }
  } catch {
    return { beats: seedBeats(), seeded: true }
  }
}

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const nl2br = (v: string) => escapeHtml(v).replace(/\n/g, '<br />')

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function SceneBeatCards({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ beats: Beat[]; seeded: boolean }>()
  if (!initial.current) initial.current = loadBeats()

  const [beats, setBeats] = useState<Beat[]>(initial.current.beats)
  const [note, setNote] = useState(initial.current.seeded ? '예시 비트를 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')

  // 편집 상태: {act} 면 그 막에 새 카드, 그 외엔 카드 id 편집
  const [editing, setEditing] = useState<Beat | { act: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [compact, setCompact] = useState(false)

  // 드래그 상태(직접 구현): 끄는 카드 id, 현재 드롭 후보(막, 인덱스)
  const [drag, setDrag] = useState<{ id: string; act: number } | null>(null)
  const [over, setOver] = useState<{ act: number; index: number } | null>(null)

  // 바인더 파일 드롭(외부) 수용
  const [fileDropAct, setFileDropAct] = useState<number | null>(null)
  const [dropToast, setDropToast] = useState('')

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(beats))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [beats])

  // payload 로 외부에서 장면 전달받으면(예: 다른 도구에서 openToolLinked) 새 카드로 추가.
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    const s = (v: unknown) => (typeof v === 'string' ? v : '')
    const toBeat = (o: Record<string, unknown>, t: number): Beat => ({
      id: newId(),
      act: clampAct(o.act ?? 1),
      title: s(o.title) || s(o.synopsis).slice(0, 60) || '새 장면',
      pov: s(o.pov),
      goal: s(o.goal) || s(o.synopsis),
      conflict: s(o.conflict),
      turn: s(o.turn),
      outcome: s(o.outcome),
      emotion: s(o.emotion) || s(o.mood),
      status: 'draft',
      createdAt: t, updatedAt: t,
    })
    // 배열(payload.scenes) 일괄 수용 — 각 항목(title/synopsis)을 카드로 추가.
    if (payload && Array.isArray(payload.scenes)) {
      const items = (payload.scenes as unknown[]).filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
      if (items.length) {
        payloadDone.current = true
        const now = Date.now()
        setBeats((prev) => [...prev, ...items.map((o, i) => toBeat(o, now + i))])
        flashToast(`✓ 전달받은 장면 ${items.length}개를 카드로 추가했어요.`)
      }
      return
    }
    const sc = payload && (payload.beat || payload.scene)
    if (sc && typeof sc === 'object') {
      payloadDone.current = true
      const now = Date.now()
      setBeats((prev) => [...prev, toBeat(sc as Record<string, unknown>, now)])
      flashToast('✓ 전달받은 장면을 새 카드로 추가했어요.')
    }
  }, [payload])

  const flashToast = (m: string) => {
    if (!mounted.current) return
    setDropToast(m)
    window.setTimeout(() => { if (mounted.current) setDropToast('') }, 2400)
  }

  // ── 파생: 막 목록과 막별 카드 ──────────────────────────────────────────────
  const acts = useMemo(() => {
    const set = new Set<number>()
    beats.forEach((b) => set.add(b.act))
    // 막이 하나도 없어도 최소 1막은 보이게
    if (set.size === 0) set.add(1)
    return Array.from(set).sort((a, b) => a - b)
  }, [beats])

  const byAct = useCallback((act: number) => beats.filter((b) => b.act === act), [beats])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((target: Beat | { act: number }, data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => {
    const title = data.title.trim()
    if (!title) return
    const clean = {
      act: clampAct(data.act),
      title,
      pov: data.pov.trim(),
      goal: data.goal.trim(),
      conflict: data.conflict.trim(),
      turn: data.turn.trim(),
      outcome: data.outcome.trim(),
      emotion: data.emotion.trim(),
      status: data.status,
    }
    setBeats((prev) => {
      if (!('id' in target)) {
        const now = Date.now()
        return [...prev, { id: newId(), ...clean, createdAt: now, updatedAt: now }]
      }
      return prev.map((b) => (b.id === target.id ? { ...b, ...clean, updatedAt: Date.now() } : b))
    })
    setEditing(null)
  }, [])

  const remove = useCallback((id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id))
    setConfirmDel(null)
  }, [])

  const cycleStatus = useCallback((id: string) => {
    setBeats((prev) => prev.map((b) => {
      if (b.id !== id) return b
      const idx = STATUSES.findIndex((x) => x.key === b.status)
      return { ...b, status: STATUSES[(idx + 1) % STATUSES.length].key, updatedAt: Date.now() }
    }))
  }, [])

  const addAct = useCallback(() => {
    const next = (acts.length ? Math.max(...acts) : 0) + 1
    setEditing({ act: next })
  }, [acts])

  // ── 드래그 재정렬(직접 구현, 포인터/HTML5 DnD 혼용 회피 위해 카드 자체 draggable 사용) ──
  // 같은 막 안 순서 변경 + 다른 막으로 이동을 모두 지원.
  // 전체 beats 배열에서 끄는 카드를 제거하고, 타깃 막의 index 위치(그 막의 카드들 사이)로 삽입.
  const performDrop = useCallback((dragId: string, toAct: number, toIndexInAct: number) => {
    setBeats((prev) => {
      const moving = prev.find((b) => b.id === dragId)
      if (!moving) return prev
      const without = prev.filter((b) => b.id !== dragId)
      const updatedMoving: Beat = { ...moving, act: toAct, updatedAt: Date.now() }
      // 타깃 막의 카드들이 전체 배열에서 차지하는 위치를 찾아 그 사이에 삽입.
      const actMembers = without.filter((b) => b.act === toAct)
      const clampedIdx = Math.max(0, Math.min(toIndexInAct, actMembers.length))
      if (actMembers.length === 0) {
        // 빈 막으로 이동: 막 순서를 유지하기 위해 같은 act 그룹이 모이도록 적절한 위치에 삽입.
        // 가장 가까운(작은) 막의 마지막 뒤에 넣되, 없으면 맨 앞/뒤.
        const out: Beat[] = []
        let inserted = false
        for (let i = 0; i < without.length; i++) {
          if (!inserted && without[i].act > toAct) { out.push(updatedMoving); inserted = true }
          out.push(without[i])
        }
        if (!inserted) out.push(updatedMoving)
        return out
      }
      const anchor = clampedIdx >= actMembers.length ? actMembers[actMembers.length - 1] : actMembers[clampedIdx]
      const out: Beat[] = []
      for (const b of without) {
        if (b.id === anchor.id) {
          if (clampedIdx >= actMembers.length) { out.push(b); out.push(updatedMoving) }
          else { out.push(updatedMoving); out.push(b) }
        } else {
          out.push(b)
        }
      }
      return out
    })
  }, [])

  const onCardDragStart = useCallback((e: React.DragEvent, b: Beat) => {
    setDrag({ id: b.id, act: b.act })
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/x-beat-id', b.id) // 외부 바인더 드래그와 구별
    } catch { /* noop */ }
  }, [])

  const onCardDragEnd = useCallback(() => {
    setDrag(null)
    setOver(null)
  }, [])

  // 카드 위에서: 위/아래 절반에 따라 그 카드 앞/뒤를 드롭 후보로.
  const onCardDragOver = useCallback((e: React.DragEvent, act: number, indexInAct: number) => {
    if (!drag) return
    e.preventDefault()
    try { e.dataTransfer.dropEffect = 'move' } catch { /* noop */ }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const after = e.clientY - rect.top > rect.height / 2
    setOver({ act, index: indexInAct + (after ? 1 : 0) })
  }, [drag])

  // 컬럼 빈 영역(카드 사이가 아니라 컬럼 바닥)에서: 맨 끝으로.
  const onColumnDragOver = useCallback((e: React.DragEvent, act: number) => {
    if (drag) {
      e.preventDefault()
      try { e.dataTransfer.dropEffect = 'move' } catch { /* noop */ }
      setOver((o) => (o && o.act === act ? o : { act, index: byAct(act).filter((b) => b.id !== drag.id).length }))
      return
    }
    if (isItemDrag(e)) { e.preventDefault(); setFileDropAct(act) }
  }, [drag, byAct])

  const onColumnDrop = useCallback((e: React.DragEvent, act: number) => {
    // 1) 내부 카드 재정렬/이동
    if (drag) {
      e.preventDefault()
      const target = over && over.act === act ? over : { act, index: byAct(act).filter((b) => b.id !== drag.id).length }
      performDrop(drag.id, act, target.index)
      setDrag(null)
      setOver(null)
      return
    }
    // 2) 외부 바인더 파일 → 새 카드
    const it = getDragItem(e)
    if (it) {
      e.preventDefault()
      addBeatFromItem(it, act)
    }
    setFileDropAct(null)
  }, [drag, over, byAct, performDrop])

  const onColumnDragLeave = useCallback((e: React.DragEvent, act: number) => {
    // 컬럼을 완전히 벗어났을 때만 해제(자식으로 옮겨갈 땐 유지)
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as HTMLElement).contains(related)) return
    setFileDropAct((a) => (a === act ? null : a))
    setOver((o) => (o && o.act === act ? null : o))
  }, [])

  // ── 바인더 파일 드롭 → 새 카드 ─────────────────────────────────────────────
  const addBeatFromItem = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }, act: number) => {
    const ch = it.character
    const isPlaceCard = !!ch && (typeof ch.atmosphere === 'string' || typeof ch.location === 'string' || ch.type === '장소' || typeof ch.description === 'string')
    let title = (it.title || '').trim()
    let pov = ''
    let goal = ''
    if (isPlaceCard && ch) {
      const placeName = (ch.name || ch.location || it.title || '').trim()
      title = title || placeName || '새 장면'
      goal = [ch.atmosphere, ch.description].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean).join(' / ').slice(0, 300)
    } else if (ch) {
      const personName = (ch.name || it.title || '').trim()
      title = title || personName || '새 장면'
      pov = personName
      goal = [ch.goal, ch.role].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean).join(' / ').slice(0, 300)
    } else {
      title = title || '새 장면'
      goal = (it.text || '').trim().slice(0, 300)
    }
    const now = Date.now()
    setBeats((prev) => [...prev, {
      id: newId(), act: clampAct(act), title, pov, goal,
      conflict: '', turn: '', outcome: '', emotion: '', status: 'draft',
      createdAt: now, updatedAt: now,
    }])
    flashToast(`✓ 「${title}」을(를) ${act}막 카드로 추가했어요.`)
  }, [])

  // ── 집계 ───────────────────────────────────────────────────────────────────
  const total = beats.length
  const counts = STATUSES.map((st) => ({ ...st, n: beats.filter((b) => b.status === st.key).length }))
  const doneN = beats.filter((b) => b.status === 'done').length
  const pct = total > 0 ? Math.round((doneN / total) * 100) : 0

  // ── 내보내기 텍스트(전체 개요) ─────────────────────────────────────────────
  const buildOutline = useCallback((): string => {
    const lines: string[] = ['# 장면 비트 개요', `총 ${total}개 장면 · 완성 ${doneN}/${total} (${pct}%)`, '']
    acts.forEach((act) => {
      const members = byAct(act)
      if (!members.length) return
      lines.push(`## ${act}막 (${members.length}장면)`)
      members.forEach((b, i) => {
        const sm = statusMeta(b.status)
        lines.push(`### ${i + 1}. ${b.title}  [${sm.label}]`)
        FIELDS.forEach((f) => { if (b[f.key]) lines.push(`   - ${f.label}: ${b[f.key]}`) })
        lines.push('')
      })
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [acts, byAct, total, doneN, pct])

  const copyAll = useCallback(() => {
    if (!total) { setNote('내보낼 장면이 없어요. 먼저 카드를 추가하세요.'); return }
    navigator.clipboard?.writeText(buildOutline()).then(() => {
      setCopied(true)
      window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.') })
  }, [total, buildOutline])

  const exportFile = useCallback(() => {
    if (!total) { setNote('내보낼 장면이 없어요. 먼저 카드를 추가하세요.'); return }
    try {
      const blob = new Blob([buildOutline()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'scene-beats.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.') }
  }, [total, buildOutline])

  // ── 프로젝트 연계 ───────────────────────────────────────────────────────────
  const beatBodyHtml = (b: Beat): string => {
    const sm = statusMeta(b.status)
    const rows = FIELDS.filter((f) => b[f.key]).map((f) => `<p><strong>${escapeHtml(f.label)}:</strong> ${nl2br(b[f.key])}</p>`).join('')
    return `<p><strong>${b.act}막 · 상태:</strong> ${escapeHtml(sm.label)}</p>${rows}`
  }

  // 카드별: 각 비트를 「장면」 폴더 아래 개별 문서로.
  const exportEachToProject = useCallback(() => {
    if (!total) { setNote('내보낼 장면이 없어요. 먼저 카드를 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    let added = 0
    acts.forEach((act) => byAct(act).forEach((b) => {
      const id = addToProject({
        kind: 'text', root: 'draft', folder: '장면',
        title: `${b.act}막 · ${b.title}`,
        bodyHtml: beatBodyHtml(b),
        synopsis: [b.goal, b.conflict].filter(Boolean).join(' / ') || undefined,
        meta: { 막: String(b.act), POV: b.pov, 상태: statusMeta(b.status).label, '감정 변화': b.emotion },
      })
      if (id) added += 1
    }))
    if (!mounted.current) return
    setNote(added ? `✓ 프로젝트 원고 「장면」 폴더에 ${added}개 카드를 개별 문서로 추가했어요.` : '프로젝트에 카드를 추가하지 못했어요.')
  }, [total, acts, byAct])

  // 전체 개요: 하나의 「장면 비트 개요」 문서로.
  const exportOutlineToProject = useCallback(() => {
    if (!total) { setNote('내보낼 장면이 없어요. 먼저 카드를 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    const sections = acts.map((act) => {
      const members = byAct(act)
      if (!members.length) return ''
      const cards = members.map((b, i) => `<h4>${i + 1}. ${escapeHtml(b.title)} [${escapeHtml(statusMeta(b.status).label)}]</h4>${beatBodyHtml(b)}`).join('<hr />')
      return `<h3>${act}막 (${members.length}장면)</h3>${cards}`
    }).filter(Boolean).join('<hr />')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: '장면 비트 개요',
      bodyHtml: `<p>총 ${total}개 장면 · 완성 ${doneN}/${total} (${pct}%)</p>${sections}`,
      synopsis: `${total}개 장면 비트 개요`,
    })
    if (!mounted.current) return
    setNote(id ? '✓ 프로젝트 원고 「장면」 폴더에 「장면 비트 개요」 문서를 추가했어요.' : '프로젝트에 개요를 추가하지 못했어요.')
  }, [total, acts, byAct, doneN, pct])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={toolbar}>
        <span style={{ fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Emoji e="🃏" /> 장면 비트 카드</span>
        <button className="minibtn" onClick={addAct} title="새 막(컬럼) 추가">+ 막 추가</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>전체 {total} · 완성 {doneN} ({pct}%)</span>
        {counts.map((c) => (
          <span key={c.key} style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }} title={`${c.label} ${c.n}개`}>
            <span aria-hidden style={{ color: c.color }}><Emoji e={c.dot} /></span>{c.n}
          </span>
        ))}
        <button className="minibtn" onClick={() => setCompact((v) => !v)} title="카드 표시 전환">{compact ? <><Emoji e="🔳" /> 상세</> : <><Emoji e="🔲" /> 간단</>}</button>
        <button className="minibtn" onClick={copyAll} title="전체 개요를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {/* 진행 게이지 */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ height: 7, background: 'var(--chrome-2, var(--panel))', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }} title={`완성률 ${pct}%`}>
          <div style={{ width: `${pct}%`, height: '100%', background: statusMeta('done').color, transition: 'width .25s ease' }} />
        </div>
      </div>

      {/* 토스트 / 안내 */}
      {dropToast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span>{dropToast}</span>
          <button className="minibtn" onClick={() => setDropToast('')} aria-label="알림 닫기">✕</button>
        </div>
      )}
      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 코르크보드 본문 — 막별 컬럼을 가로 스크롤 */}
      {total === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 12, padding: 24 }}>
          <div style={{ fontSize: 42 }} aria-hidden><Emoji e="🃏" /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>아직 장면 카드가 없어요</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
            카드 하나가 장면 하나입니다. POV·목표·갈등·전환점·결과·감정 변화를 적어<br />
            막별 코르크보드에 올려 두고, 드래그로 순서와 막을 바꿔 가며 구조를 잡으세요.<br />
            좌측 바인더의 파일을 컬럼에 끌어다 놓아도 카드가 만들어집니다.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => setEditing({ act: 1 })}>+ 첫 장면 카드</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', gap: 14, padding: 14, alignItems: 'flex-start' }}>
          {acts.map((act) => {
            const members = byAct(act)
            const isFileTarget = fileDropAct === act
            return (
              <div
                key={act}
                onDragOver={(e) => onColumnDragOver(e, act)}
                onDrop={(e) => onColumnDrop(e, act)}
                onDragLeave={(e) => onColumnDragLeave(e, act)}
                style={{
                  width: compact ? 220 : 268,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: '100%',
                  background: isFileTarget ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))' : 'var(--panel)',
                  border: `1px ${isFileTarget ? 'dashed var(--accent)' : 'solid var(--border)'}`,
                  borderRadius: 12,
                  padding: 10,
                  boxSizing: 'border-box',
                }}
              >
                {/* 컬럼 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{act}막</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{members.length}장면</span>
                  <div style={{ flex: 1 }} />
                  <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11.5 }} title={`${act}막에 카드 추가`} onClick={() => setEditing({ act })}>+ 카드</button>
                </div>

                {/* 카드 리스트(세로 스크롤) */}
                <div style={{ flex: 1, minHeight: 40, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
                  {members.length === 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', padding: '14px 6px', border: '1px dashed var(--border)', borderRadius: 8 }}>
                      비어 있어요.<br />여기로 카드를 끌어오거나<br />「+ 카드」로 추가하세요.
                    </div>
                  )}
                  {members.map((b, i) => {
                    const showLineBefore = !!drag && over && over.act === act && over.index === i
                    const isDragging = drag?.id === b.id
                    return (
                      <div key={b.id}>
                        {showLineBefore && <DropLine />}
                        <BeatCard
                          beat={b}
                          compact={compact}
                          dragging={isDragging}
                          onDragStart={(e) => onCardDragStart(e, b)}
                          onDragEnd={onCardDragEnd}
                          onDragOver={(e) => onCardDragOver(e, act, i)}
                          onCycle={() => cycleStatus(b.id)}
                          onEdit={() => setEditing(b)}
                          onDelete={() => setConfirmDel(b.id)}
                        />
                      </div>
                    )
                  })}
                  {/* 막 끝 드롭 표시 — 마지막 카드 뒤로 떨어뜨릴 때 */}
                  {!!drag && over && over.act === act && over.index >= members.length && <DropLine />}
                </div>
              </div>
            )
          })}
          {/* 막 추가 컬럼 */}
          <button
            onClick={addAct}
            className="minibtn"
            style={{ width: 120, flexShrink: 0, alignSelf: 'stretch', maxHeight: 120, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--muted)', borderRadius: 12, fontSize: 13 }}
            title="새 막 추가"
          >+ 막 추가</button>
        </div>
      )}

      {/* 프로젝트 연계 바 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={exportEachToProject}
          disabled={!hasProjectBridge() || total === 0}
          title={hasProjectBridge() ? '각 카드를 프로젝트 원고 「장면」 폴더에 개별 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 카드별로 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={exportOutlineToProject}
          disabled={!hasProjectBridge() || total === 0}
          title={hasProjectBridge() ? '전체를 하나의 「장면 비트 개요」 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="🗂" /> 전체 개요로 프로젝트에 추가</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 끌어 순서·막 이동 · 상태 배지로 초안→수정→완성</span>
      </div>

      {/* 편집/추가 모달 */}
      {editing && (
        <BeatEditor
          beat={'id' in editing ? editing : null}
          act={'id' in editing ? editing.act : editing.act}
          knownActs={acts}
          onCancel={() => setEditing(null)}
          onSave={(data) => upsert(editing, data)}
        />
      )}

      {/* 삭제 확인 */}
      {confirmDel && beats.find((b) => b.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>카드 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{beats.find((b) => b.id === confirmDel)!.title}」 카드를 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
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

// ── 드롭 위치 표시선 ──────────────────────────────────────────────────────────
function DropLine() {
  return <div style={{ height: 3, background: 'var(--accent)', borderRadius: 3, margin: '1px 2px', boxShadow: '0 0 6px var(--accent)' }} aria-hidden />
}

// ── 카드 ──────────────────────────────────────────────────────────────────────
function BeatCard({
  beat, compact, dragging, onDragStart, onDragEnd, onDragOver, onCycle, onEdit, onDelete,
}: {
  beat: Beat
  compact: boolean
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onCycle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const sm = statusMeta(beat.status)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${sm.color}`,
        borderRadius: 10,
        padding: compact ? '7px 9px' : '9px 10px',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.28)' : '0 1px 2px rgba(0,0,0,0.06)',
        opacity: dragging ? 0.45 : 1,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', cursor: 'grab', lineHeight: '18px', flexShrink: 0 }} title="끌어서 이동" aria-hidden>⠿</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, wordBreak: 'break-word', minWidth: 0 }}>{beat.title}</span>
        <button
          className="minibtn"
          onClick={onCycle}
          title="상태 전환 (초안→수정→완성)"
          style={{ padding: '1px 7px', fontSize: 10.5, borderColor: sm.color, color: sm.color, fontWeight: 700, flexShrink: 0 }}
        >{sm.label}</button>
      </div>

      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 7 }}>
          {FIELDS.map((f) => beat[f.key] ? (
            <div key={f.key} style={{ fontSize: 11.5, lineHeight: 1.45, display: 'flex', gap: 4 }}>
              <span style={{ flexShrink: 0 }} aria-hidden><Emoji e={f.icon} /></span>
              <span style={{ flexShrink: 0, color: 'var(--muted)', fontWeight: 600 }}>{f.label}</span>
              <span style={{ color: 'var(--text)', wordBreak: 'break-word', minWidth: 0 }}>{beat[f.key]}</span>
            </div>
          ) : null)}
          {FIELDS.every((f) => !beat[f.key]) && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>세부 필드가 비어 있어요 — 편집으로 채워 보세요.</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 7, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <button className="minibtn" style={cardMini} title="편집" onClick={onEdit}><Emoji e="✏️" /> 편집</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" style={{ ...cardMini, color: 'var(--warn)' }} title="삭제" onClick={onDelete}><Emoji e="🗑️" /></button>
      </div>
    </div>
  )
}

const cardMini: React.CSSProperties = { padding: '2px 8px', fontSize: 11, lineHeight: 1.2 }

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

// ── 비트 편집기 ───────────────────────────────────────────────────────────────
function BeatEditor({
  beat, act, knownActs, onCancel, onSave,
}: {
  beat: Beat | null
  act: number
  knownActs: number[]
  onCancel: () => void
  onSave: (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const base = beat || emptyBeat(act)
  const [title, setTitle] = useState(base.title)
  const [actNum, setActNum] = useState<number>(base.act)
  const [pov, setPov] = useState(base.pov)
  const [goal, setGoal] = useState(base.goal)
  const [conflict, setConflict] = useState(base.conflict)
  const [turn, setTurn] = useState(base.turn)
  const [outcome, setOutcome] = useState(base.outcome)
  const [emotion, setEmotion] = useState(base.emotion)
  const [status, setStatus] = useState<Status>(base.status)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const setters: Record<string, (v: string) => void> = { pov: setPov, goal: setGoal, conflict: setConflict, turn: setTurn, outcome: setOutcome, emotion: setEmotion }
  const values: Record<string, string> = { pov, goal, conflict, turn, outcome, emotion }

  const submit = () => onSave({ act: clampAct(actNum), title, pov, goal, conflict, turn, outcome, emotion, status })

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  const actOptions = Array.from(new Set([...knownActs, actNum, (knownActs.length ? Math.max(...knownActs) : 0) + 1])).sort((a, b) => a - b)

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 480, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {beat ? <><Emoji e="🃏" /> 카드 편집</> : <><Emoji e="🃏" /> 새 장면 카드</>}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={label}>제목 *</label>
              <input
                ref={titleRef}
                style={inputBase}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                placeholder="예: 평범한 일상의 균열"
                maxLength={120}
              />
            </div>
            <div style={{ width: 96 }}>
              <label style={label}>막</label>
              <select style={{ ...inputBase, padding: '9px 8px' }} value={actNum} onChange={(e) => setActNum(clampAct(e.target.value))}>
                {actOptions.map((a) => <option key={a} value={a}>{a}막</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label style={label}><Emoji e={f.icon} /> {f.label}</label>
                <input
                  style={inputBase}
                  value={values[f.key]}
                  onChange={(e) => setters[f.key](e.target.value)}
                  placeholder={f.ph}
                  maxLength={300}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={label}>상태</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {STATUSES.map((st) => (
                <button
                  key={st.key}
                  className="minibtn"
                  onClick={() => setStatus(st.key)}
                  aria-pressed={status === st.key}
                  style={{
                    flex: '1 1 80px', padding: '8px 6px', fontSize: 12,
                    borderColor: status === st.key ? st.color : 'var(--border)',
                    background: status === st.key ? `color-mix(in srgb, ${st.color} 18%, var(--paper))` : 'var(--paper)',
                    fontWeight: status === st.key ? 700 : 400,
                  }}
                ><Emoji e={st.dot} /> {st.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>{beat ? '저장' : '추가'}</button>
        </div>
      </div>
    </Overlay>
  )
}
