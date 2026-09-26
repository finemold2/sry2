// 독자 페르소나 — 목표 독자상(연령/성별/취향/기대/싫어하는 것/비슷한 애독작)을 카드로 정의하고,
//   작품이 그 기대를 충족하는지 점검 질문 체크리스트로 자가진단한다. 페르소나 여러 개 CRUD.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요. 전부 로컬.
//   모든 데이터는 localStorage('sry:tool:reader-persona') 에 JSON 으로 자동 저장/복원.
//   좌측 바인더 파일을 카드에 드롭하면 제목을 "비슷한 애독작"으로 채운다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji, emojify } from './linkbus'

export const meta = { id: 'reader-persona', name: '독자 페르소나', icon: '🧑‍🤝‍🧑', group: '구상·정리', intro: '목표 독자상을 카드로 정의하고 기대 충족 여부를 점검하세요', w: 760, h: 620 }

const LS_KEY = 'sry:tool:reader-persona'

// ---------- 모델 ----------
interface Check {
  id: string
  text: string
  done: boolean
}
interface Persona {
  id: string
  name: string          // 페르소나 별칭 (예: "퇴근길 직장인 지영")
  emoji: string         // 카드 아이콘(자작 이모지)
  age: string           // 연령대
  gender: string        // 성별/지향(자유)
  job: string           // 직업/배경
  reading: string       // 독서 패턴(언제·얼마나·어디서)
  taste: string         // 취향(좋아하는 장르·소재·분위기)
  expect: string        // 이 작품에 거는 기대(무엇을 얻고 싶나)
  dislike: string       // 싫어하는 것(읽다 덮게 되는 요소)
  similar: string[]     // 비슷한 애독작(이 독자가 좋아하는 기존 작품들)
  quote: string         // 이 독자가 할 법한 한마디
  checks: Check[]       // 기대 충족 점검 질문
  createdAt: number
  updatedAt: number
}

// ---------- 기본 점검 질문(체크리스트 시드) ----------
const SEED_CHECKS: string[] = [
  '도입 3장 안에 이 독자가 기대하는 약속(장르·톤)이 드러나는가?',
  '이 독자가 좋아하는 취향 요소가 실제 본문에 충분히 등장하는가?',
  '이 독자가 싫어하는 요소를 무심코 넣지는 않았는가?',
  '주인공/시점이 이 독자가 감정이입할 만한가?',
  '이 독자의 독서 호흡(분량·속도)에 챕터 길이가 맞는가?',
  '결말이 이 독자가 거는 기대를 (또는 의도적 배신을) 충족하는가?',
  '비슷한 애독작과 차별화되는 우리만의 매력이 있는가?',
  '이 독자가 친구에게 추천할 한 문장이 떠오르는가?',
]

// ---------- 예시 페르소나(빈 상태에서 채우기) ----------
type Seed = Omit<Persona, 'id' | 'checks' | 'createdAt' | 'updatedAt'>
const EXAMPLES: { label: string; data: Seed }[] = [
  {
    label: '퇴근길 직장인',
    data: {
      name: '퇴근길 직장인 지영',
      emoji: '🚇',
      age: '30대 초반',
      gender: '여성',
      job: '사무직 직장인',
      reading: '지하철·잠들기 전 휴대폰으로 하루 20~30분, 짧게 끊어 읽음',
      taste: '몰입되는 로맨스/힐링물, 군더더기 없는 빠른 전개, 따뜻한 결말',
      expect: '고단한 하루를 잊고 잠깐 다른 삶을 살아보는 위안',
      dislike: '느린 도입, 우울하기만 한 결말, 너무 어려운 세계관 설명',
      similar: ['가벼운 웹소설 로맨스', '힐링 에세이'],
      quote: '“오늘 같은 날엔 이런 게 딱이야.”',
    },
  },
  {
    label: '장르 마니아',
    data: {
      name: '장르 덕후 현우',
      emoji: '🗡️',
      age: '20대 후반',
      gender: '남성',
      job: '대학원생',
      reading: '주말에 몰아서 몇 시간씩, 종이책+전자책 병행',
      taste: '치밀한 세계관, 복선과 반전, 강한 빌런, 설정의 일관성',
      expect: '예측을 비트는 전개와 다 읽고 나서 곱씹을 여운',
      dislike: '설정 구멍, 데우스 엑스 마키나, 흐지부지한 떡밥 회수',
      similar: ['하드 SF', '다크 판타지', '본격 미스터리'],
      quote: '“이거 복선 회수 깔끔하네?”',
    },
  },
  {
    label: '문학 애독자',
    data: {
      name: '문학 애독자 선생님',
      emoji: '📖',
      age: '50대',
      gender: '무관',
      job: '교사',
      reading: '저녁 한두 시간, 밑줄 그으며 천천히',
      taste: '문장의 결, 인물의 내면, 여운 있는 주제, 절제된 묘사',
      expect: '삶을 다시 보게 하는 통찰과 아름다운 문장',
      dislike: '클리셰 남발, 작위적 신파, 설명 과잉',
      similar: ['한국 단편문학', '성장소설'],
      quote: '“이 문장은 한참을 머물게 하네요.”',
    },
  },
]

// ---------- 유틸 ----------
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function mkChecks(): Check[] {
  return SEED_CHECKS.map((t) => ({ id: newId(), text: t, done: false }))
}
function blankPersona(): Persona {
  const now = Date.now()
  return {
    id: newId(), name: '', emoji: '🙂', age: '', gender: '', job: '',
    reading: '', taste: '', expect: '', dislike: '', similar: [], quote: '',
    checks: mkChecks(), createdAt: now, updatedAt: now,
  }
}

function coerce(x: unknown): Persona | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const checks: Check[] = Array.isArray(o.checks)
    ? (o.checks as unknown[])
        .filter((c) => c && typeof c === 'object' && typeof (c as Check).text === 'string')
        .map((c) => {
          const cc = c as Partial<Check>
          return { id: String(cc.id || newId()), text: String(cc.text || ''), done: !!cc.done }
        })
    : mkChecks()
  return {
    id: String(o.id || newId()),
    name: s(o.name), emoji: s(o.emoji) || '🙂', age: s(o.age), gender: s(o.gender), job: s(o.job),
    reading: s(o.reading), taste: s(o.taste), expect: s(o.expect), dislike: s(o.dislike),
    similar: Array.isArray(o.similar) ? (o.similar as unknown[]).map((v) => String(v)).filter(Boolean) : [],
    quote: s(o.quote),
    checks: checks.length ? checks : mkChecks(),
    createdAt: Number.isFinite(o.createdAt) ? Number(o.createdAt) : Date.now(),
    updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
  }
}

function loadState(): { personas: Persona[]; selId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { personas: [], selId: null }
    const p = JSON.parse(raw)
    const personas: Persona[] = Array.isArray(p?.personas)
      ? p.personas.map(coerce).filter((x: Persona | null): x is Persona => !!x)
      : []
    const selId = typeof p?.selId === 'string' && personas.some((x) => x.id === p.selId) ? p.selId : (personas[0]?.id ?? null)
    return { personas, selId }
  } catch {
    return { personas: [], selId: null }
  }
}

const EMOJIS = ['🙂', '🚇', '🗡️', '📖', '🧒', '👩', '🧑', '👨', '🧓', '🧙', '🦸', '🕵️', '🎓', '💼', '🌙', '☕', '🎮', '💜', '🔥', '🌱']

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function ReaderPersona() {
  const init = useRef(loadState())
  const [personas, setPersonas] = useState<Persona[]>(init.current.personas)
  const [selId, setSelId] = useState<string | null>(init.current.selId)
  const [note, setNote] = useState('')
  const [similarInput, setSimilarInput] = useState('')
  const [dropHot, setDropHot] = useState(false)
  const [collapsed, setCollapsed] = useState(false) // 좁은 폭에서 목록 접기

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragId = useRef<string | null>(null) // 목록 드래그 재정렬
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ personas, selId }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [personas, selId])

  const flash = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const selected = useMemo(() => personas.find((p) => p.id === selId) || null, [personas, selId])

  // ---- CRUD ----
  const addPersona = (seed?: Seed) => {
    const base = blankPersona()
    const rec: Persona = seed ? { ...base, ...seed, similar: [...seed.similar] } : base
    setPersonas((prev) => [rec, ...prev])
    setSelId(rec.id)
    setSimilarInput('')
    flash(seed ? `예시 〈${seed.name}〉를 추가했습니다.` : '새 페르소나를 추가했습니다.')
  }

  const patchSel = (patch: Partial<Persona>) => {
    if (!selId) return
    setPersonas((prev) => prev.map((p) => (p.id === selId ? { ...p, ...patch, updatedAt: Date.now() } : p)))
  }

  const removePersona = (id: string) => {
    setPersonas((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (selId === id) setSelId(next[0]?.id ?? null)
      return next
    })
    flash('페르소나를 삭제했습니다.')
  }

  const duplicate = (id: string) => {
    const src = personas.find((p) => p.id === id)
    if (!src) return
    const copy: Persona = {
      ...src, id: newId(), name: (src.name || '페르소나') + ' (복제)',
      similar: [...src.similar],
      checks: src.checks.map((c) => ({ ...c, id: newId() })),
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setPersonas((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      const n = prev.slice()
      n.splice(i + 1, 0, copy)
      return n
    })
    setSelId(copy.id)
    flash('복제했습니다.')
  }

  // ---- 비슷한 애독작 태그 ----
  const addSimilar = (raw?: string) => {
    if (!selected) return
    const v = (raw ?? similarInput).trim()
    if (!v) return
    if (selected.similar.includes(v)) { setSimilarInput(''); flash('이미 추가된 작품입니다.'); return }
    patchSel({ similar: [...selected.similar, v] })
    setSimilarInput('')
  }
  const removeSimilar = (v: string) => {
    if (!selected) return
    patchSel({ similar: selected.similar.filter((s) => s !== v) })
  }

  // ---- 점검 질문 CRUD ----
  const toggleCheck = (cid: string) => {
    if (!selected) return
    patchSel({ checks: selected.checks.map((c) => (c.id === cid ? { ...c, done: !c.done } : c)) })
  }
  const editCheck = (cid: string, text: string) => {
    if (!selected) return
    patchSel({ checks: selected.checks.map((c) => (c.id === cid ? { ...c, text } : c)) })
  }
  const removeCheck = (cid: string) => {
    if (!selected) return
    patchSel({ checks: selected.checks.filter((c) => c.id !== cid) })
  }
  const addCheck = () => {
    if (!selected) return
    patchSel({ checks: [...selected.checks, { id: newId(), text: '', done: false }] })
  }
  const resetChecks = () => {
    if (!selected) return
    patchSel({ checks: selected.checks.map((c) => ({ ...c, done: false })) })
    flash('점검 항목을 모두 해제했습니다.')
  }
  const restoreSeedChecks = () => {
    if (!selected) return
    patchSel({ checks: mkChecks() })
    flash('기본 점검 질문으로 되돌렸습니다.')
  }

  // ---- 목록 드래그 재정렬 ----
  const onRowDragStart = (id: string) => { dragId.current = id }
  const onRowDragOver = (e: React.DragEvent, id: string) => {
    if (!dragId.current || dragId.current === id) return
    e.preventDefault()
    setOverId(id)
  }
  const onRowDrop = (id: string) => {
    const from = dragId.current
    dragId.current = null
    setOverId(null)
    if (!from || from === id) return
    setPersonas((prev) => {
      const a = prev.slice()
      const fi = a.findIndex((p) => p.id === from)
      const ti = a.findIndex((p) => p.id === id)
      if (fi < 0 || ti < 0) return prev
      const [m] = a.splice(fi, 1)
      a.splice(ti, 0, m)
      return a
    })
  }
  const onRowDragEnd = () => { dragId.current = null; setOverId(null) }

  // ---- 좌측 바인더 파일 드롭 → 비슷한 애독작 채우기 ----
  const onCardDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) }
  }
  const onCardDragLeave = () => { if (dropHot) setDropHot(false) }
  const onCardDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item = getDragItem(e)
    if (!item || !selected) return
    e.preventDefault()
    if (item.title && !selected.similar.includes(item.title)) {
      patchSel({ similar: [...selected.similar, item.title] })
      flash(`〈${item.title}〉을(를) 비슷한 애독작에 담았습니다.`)
    }
  }

  // ---- 진척 계산 ----
  const progress = (p: Persona) => {
    const total = p.checks.length
    const done = p.checks.filter((c) => c.done).length
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }
  const selProg = selected ? progress(selected) : { total: 0, done: 0, pct: 0 }

  // ---- 완성도(필드 채움) ----
  const completeness = (p: Persona) => {
    const fields = [p.name, p.age, p.taste, p.expect, p.dislike]
    const filled = fields.filter((f) => f.trim()).length + (p.similar.length ? 1 : 0)
    return Math.round((filled / (fields.length + 1)) * 100)
  }

  // ---- 프로젝트 연계 ----
  const addPersonaToProject = (p: Persona) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const prog = progress(p)
    const row = (label: string, v: string) =>
      `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v && v.trim() ? v.trim() : '-')}</p>`
    const checksHtml = p.checks.length
      ? `<p><b>기대 충족 점검 (${prog.done}/${prog.total}):</b></p><ul>` +
        p.checks.map((c) => `<li>[${c.done ? 'O' : ' '}] ${escapeHtml(c.text || '(빈 항목)')}</li>`).join('') +
        `</ul>`
      : ''
    const similarHtml = p.similar.length
      ? `<p><b>비슷한 애독작:</b> ${p.similar.map((s) => escapeHtml(s)).join(', ')}</p>`
      : ''
    const bodyHtml = [
      `<p style="font-size:15px;"><b>${escapeHtml(p.emoji)} ${escapeHtml(p.name || '(이름 없는 독자)')}</b></p>`,
      `<hr/>`,
      row('연령', p.age),
      row('성별/지향', p.gender),
      row('직업/배경', p.job),
      row('독서 패턴', p.reading),
      row('취향', p.taste),
      row('이 작품에 거는 기대', p.expect),
      row('싫어하는 것', p.dislike),
      similarHtml,
      p.quote.trim() ? `<p style="color:#666;"><i>${escapeHtml(p.quote.trim())}</i></p>` : '',
      `<hr/>`,
      checksHtml,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기획',
      title: `독자 페르소나 — ${p.name || '무명 독자'}`,
      bodyHtml,
      meta: { 유형: '독자 페르소나', 점검: `${prog.done}/${prog.total}`, 비슷한작: p.similar.join(', ') },
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 페르소나 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const addAllToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!personas.length) { flash('추가할 페르소나가 없습니다.'); return }
    personas.forEach((p) => addPersonaToProject(p))
    flash(`${personas.length}개 페르소나를 프로젝트 〈기획〉에 추가했습니다.`)
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const main: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const listCol: React.CSSProperties = { width: collapsed ? 0 : 218, flexShrink: 0, borderRight: collapsed ? 'none' : '1px solid var(--border)', overflow: 'auto', display: collapsed ? 'none' : 'flex', flexDirection: 'column', gap: 8, padding: collapsed ? 0 : 10, background: 'var(--panel)' }
  const detailCol: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 52, lineHeight: 1.6, fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 150 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '22px 16px', border: '1px dashed var(--border)', borderRadius: 12 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const tag: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', fontSize: 12, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)' }

  const listItem = (p: Persona): React.CSSProperties => {
    const active = p.id === selId
    const isOver = overId === p.id
    return {
      textAlign: 'left', padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
      border: '1px solid ' + (active ? 'var(--accent)' : isOver ? 'var(--accent)' : 'var(--border)'),
      background: active ? 'rgba(0,0,0,0.05)' : 'var(--chrome-2)',
      color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: isOver ? '0 0 0 2px var(--accent) inset' : 'none',
    }
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🧑‍🤝‍🧑"/> 독자 페르소나</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>목표 독자상 정의 · 기대 충족 점검</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => setCollapsed((v) => !v)} title="목록 접기/펼치기">{collapsed ? '▶ 목록' : '◀ 목록'}</button>
          <button className="btn-primary" onClick={() => addPersona()}>＋ 새 페르소나</button>
        </div>
      </div>

      {note && (
        <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', padding: '7px 16px' }}>{note}</div>
      )}

      <div style={main}>
        {/* 목록 */}
        <div style={listCol}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>페르소나 {personas.length}</span>
            {personas.length > 0 && hasProjectBridge() && (
              <button className="minibtn" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={addAllToProject} title="전체를 프로젝트 〈기획〉에 추가">전체 추가</button>
            )}
          </div>
          {personas.length === 0 ? (
            <div style={{ ...hint, padding: '8px 2px' }}>아직 없습니다.<br />위 <b>＋ 새 페르소나</b> 또는 우측 예시로 시작하세요.</div>
          ) : (
            personas.map((p) => {
              const prog = progress(p)
              return (
                <div
                  key={p.id}
                  style={listItem(p)}
                  onClick={() => setSelId(p.id)}
                  draggable
                  onDragStart={() => onRowDragStart(p.id)}
                  onDragOver={(e) => onRowDragOver(e, p.id)}
                  onDrop={() => onRowDrop(p.id)}
                  onDragEnd={onRowDragEnd}
                  title="드래그하여 순서 변경"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}><Emoji e={p.emoji}/></span>
                    <b style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emojify(p.name) || '(이름 없음)'}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ width: prog.pct + '%', height: '100%', background: prog.pct === 100 ? 'var(--ok)' : 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{prog.done}/{prog.total}</span>
                  </div>
                  {p.age && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{p.age}</span>}
                </div>
              )
            })
          )}
        </div>

        {/* 상세 */}
        <div style={detailCol}>
          {!selected ? (
            <div style={empty}>
              <div style={{ fontSize: 30, marginBottom: 8 }}><Emoji e="🧑‍🤝‍🧑"/></div>
              누구를 위해 쓰고 있나요?<br />
              <span style={{ fontSize: 12.5 }}>목표 독자 한 명을 또렷이 그리면 무엇을 넣고 뺄지 분명해집니다.</span>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} className="minibtn" onClick={() => addPersona(ex.data)}><Emoji e={ex.data.emoji}/> {ex.label} 예시</button>
                ))}
                <button className="btn-primary" onClick={() => addPersona()}>＋ 빈 카드로 시작</button>
              </div>
            </div>
          ) : (
            <>
              {/* 정체성 카드 (드롭 수용) */}
              <div
                style={{ ...card, outline: dropHot ? '2px dashed var(--accent)' : 'none', outlineOffset: -3 }}
                onDragOver={onCardDragOver}
                onDragLeave={onCardDragLeave}
                onDrop={onCardDrop}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="👤"/> 정체성</h4>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>완성도 {completeness(selected)}%</span>
                  <button style={iconBtn} title="복제" onClick={() => duplicate(selected.id)}>⧉</button>
                  <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removePersona(selected.id)}><Emoji e="🗑️"/></button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                  {/* 이모지 선택 */}
                  <div style={{ flexShrink: 0 }}>
                    <label style={fieldLabel}>아이콘</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: 132 }}>
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => patchSel({ emoji: e })}
                          style={{
                            fontSize: 15, width: 24, height: 24, lineHeight: 1, cursor: 'pointer', borderRadius: 6,
                            border: '1px solid ' + (selected.emoji === e ? 'var(--accent)' : 'transparent'),
                            background: selected.emoji === e ? 'rgba(0,0,0,0.06)' : 'transparent',
                          }}
                        ><Emoji e={e}/></button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={fieldLabel}>페르소나 별칭</label>
                    <input style={input} value={selected.name} onChange={(e) => patchSel({ name: e.target.value })} placeholder="예: 퇴근길 직장인 지영" maxLength={60} />
                    <div style={{ ...twoRow, marginTop: 8 }}>
                      <div style={col}>
                        <label style={fieldLabel}>연령</label>
                        <input style={input} value={selected.age} onChange={(e) => patchSel({ age: e.target.value })} placeholder="예: 30대 초반" maxLength={40} />
                      </div>
                      <div style={col}>
                        <label style={fieldLabel}>성별/지향</label>
                        <input style={input} value={selected.gender} onChange={(e) => patchSel({ gender: e.target.value })} placeholder="예: 여성 / 무관" maxLength={40} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label style={fieldLabel}>직업/배경</label>
                      <input style={input} value={selected.job} onChange={(e) => patchSel({ job: e.target.value })} placeholder="예: 사무직 직장인" maxLength={60} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={fieldLabel}>독서 패턴 — 언제·얼마나·어디서 읽나</label>
                  <textarea style={area} value={selected.reading} onChange={(e) => patchSel({ reading: e.target.value })} placeholder="예: 지하철·잠들기 전 휴대폰으로 하루 20~30분, 짧게 끊어 읽음" />
                </div>
              </div>

              {/* 취향/기대/싫어함 */}
              <div style={card}>
                <h4 style={sectionTitle}><Emoji e="🎯"/> 취향 · 기대 · 거부감</h4>
                <div style={{ marginBottom: 10 }}>
                  <label style={fieldLabel}>취향 — 좋아하는 장르·소재·분위기</label>
                  <textarea style={area} value={selected.taste} onChange={(e) => patchSel({ taste: e.target.value })} placeholder="예: 몰입되는 로맨스/힐링물, 빠른 전개, 따뜻한 결말" />
                </div>
                <div style={twoRow}>
                  <div style={col}>
                    <label style={fieldLabel}>이 작품에 거는 기대 — 무엇을 얻고 싶나</label>
                    <textarea style={area} value={selected.expect} onChange={(e) => patchSel({ expect: e.target.value })} placeholder="예: 고단한 하루를 잊는 위안" />
                  </div>
                  <div style={col}>
                    <label style={{ ...fieldLabel, color: 'var(--warn)' }}>싫어하는 것 — 읽다 덮게 되는 요소</label>
                    <textarea style={{ ...area, borderColor: selected.dislike ? 'var(--warn)' : 'var(--border)' }} value={selected.dislike} onChange={(e) => patchSel({ dislike: e.target.value })} placeholder="예: 느린 도입, 우울한 결말, 설명 과잉" />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={fieldLabel}>이 독자가 할 법한 한마디</label>
                  <input style={input} value={selected.quote} onChange={(e) => patchSel({ quote: e.target.value })} placeholder="예: “오늘 같은 날엔 이런 게 딱이야.”" maxLength={120} />
                </div>
              </div>

              {/* 비슷한 애독작 */}
              <div style={card}>
                <h4 style={sectionTitle}><Emoji e="📚"/> 비슷한 애독작 — 이 독자가 즐겨 읽는 작품</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...input, flex: 1 }}
                    value={similarInput}
                    onChange={(e) => setSimilarInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSimilar() } }}
                    placeholder="작품 제목 입력 후 Enter (또는 좌측 파일을 카드로 드래그)"
                    maxLength={80}
                  />
                  <button className="minibtn" onClick={() => addSimilar()} disabled={!similarInput.trim()}>추가</button>
                </div>
                {selected.similar.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {selected.similar.map((s) => (
                      <span key={s} style={tag}>
                        {emojify(s)}
                        <button onClick={() => removeSimilar(s)} title="제거" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...hint, marginTop: 8 }}>비교 대상이 또렷할수록 차별점을 잡기 쉬워집니다.</div>
                )}
              </div>

              {/* 기대 충족 점검 */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="✅"/> 기대 충족 점검</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <div style={{ width: 90, height: 7, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ width: selProg.pct + '%', height: '100%', background: selProg.pct === 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .2s' }} />
                    </div>
                    <span style={{ fontSize: 12, color: selProg.pct === 100 ? 'var(--ok)' : 'var(--muted)', fontWeight: 700 }}>{selProg.done}/{selProg.total} · {selProg.pct}%</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.checks.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <button
                        onClick={() => toggleCheck(c.id)}
                        title={c.done ? '해제' : '충족 표시'}
                        style={{
                          flexShrink: 0, width: 22, height: 22, marginTop: 4, borderRadius: 6, cursor: 'pointer',
                          border: '1px solid ' + (c.done ? 'var(--ok)' : 'var(--border)'),
                          background: c.done ? 'var(--ok)' : 'var(--paper)',
                          color: '#fff', fontSize: 13, lineHeight: 1,
                        }}
                      >{c.done ? '✓' : ''}</button>
                      <textarea
                        value={c.text}
                        onChange={(e) => editCheck(c.id, e.target.value)}
                        placeholder="점검 질문을 입력하세요"
                        style={{
                          flex: 1, resize: 'vertical', minHeight: 30, padding: '6px 9px', fontSize: 13, lineHeight: 1.55,
                          borderRadius: 8, border: '1px solid var(--border)', background: c.done ? 'var(--chrome-2)' : 'var(--paper)',
                          color: c.done ? 'var(--muted)' : 'var(--text)', textDecoration: c.done ? 'line-through' : 'none',
                          fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                      />
                      <button style={{ ...iconBtn, marginTop: 3, color: 'var(--warn)' }} title="질문 삭제" onClick={() => removeCheck(c.id)}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={addCheck}>＋ 질문 추가</button>
                  <button className="minibtn" onClick={resetChecks} disabled={selProg.done === 0}>모두 해제</button>
                  <button className="minibtn" onClick={restoreSeedChecks}>기본 질문 복원</button>
                </div>
              </div>

              {/* 연계 */}
              <div className="linkbar" style={{ marginTop: 2 }}>
                <span className="linkbar-label">연계:</span>
                <button
                  className="linkbtn"
                  onClick={() => addPersonaToProject(selected)}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '이 페르소나를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>

              <div style={hint}>
                독자 페르소나는 “이름 모를 다수”가 아니라 <b>구체적인 한 사람</b>을 떠올리게 합니다.
                그 사람의 기대와 거부감을 기준으로 점검하면 무엇을 더하고 뺄지 또렷해집니다.
                입력·점검은 이 브라우저에 자동 저장됩니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
