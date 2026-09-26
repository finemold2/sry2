// 장면 플래너 — 장면 카드(제목/요약/POV/장소/목적/갈등/결과/상태)를 추가·편집·삭제하고
// 위아래로 순서를 바꾸며, 장면 개수와 상태별 진행 집계를 보여 줍니다. 전체를 텍스트로 복사/내보내기.
// 자급식: react 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원. 미지원 환경 graceful.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'scene-list', name: '장면 플래너', icon: '🎬', group: '구상·정리', intro: '장면 카드를 만들고 순서를 바꾸며 이야기 흐름과 진행을 한눈에 정리하세요', w: 700, h: 600 }

const LS_KEY = 'sry:tool:scene-list'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
type Status = 'idea' | 'drafting' | 'done' | 'cut'

interface Scene {
  id: string
  title: string
  summary: string
  pov: string
  place: string
  goal: string
  conflict: string
  outcome: string
  status: Status
  createdAt: number
  updatedAt: number
}

const STATUSES: { key: Status; label: string; color: string; dot: string }[] = [
  { key: 'idea', label: '구상', color: 'var(--muted)', dot: '💡' },
  { key: 'drafting', label: '집필 중', color: 'var(--accent)', dot: '✍️' },
  { key: 'done', label: '완료', color: 'var(--ok)', dot: '✅' },
  { key: 'cut', label: '보류·삭제', color: 'var(--warn)', dot: '🗑️' },
]
const statusMeta = (s: Status) => STATUSES.find((x) => x.key === s) || STATUSES[0]
const isStatus = (v: unknown): v is Status => typeof v === 'string' && STATUSES.some((s) => s.key === v)

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function emptyScene(): Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> {
  return { title: '', summary: '', pov: '', place: '', goal: '', conflict: '', outcome: '', status: 'idea' }
}

// 첫 사용자에게 보여줄 예시 장면(저장 데이터가 전혀 없을 때만 시드).
function seedScenes(): Scene[] {
  const now = Date.now()
  const make = (s: Partial<Scene>, i: number): Scene => ({
    id: newId(),
    title: '', summary: '', pov: '', place: '', goal: '', conflict: '', outcome: '', status: 'idea',
    ...s,
    createdAt: now + i, updatedAt: now + i,
  })
  return [
    make({ title: '안개 낀 항구 도착', summary: '주인공이 외딴 등대 마을에 도착한다.', pov: '주인공', place: '항구', goal: '등대지기를 찾는다', conflict: '아무도 입을 열지 않는다', outcome: '낡은 편지 한 통을 얻는다', status: 'done' }, 0),
    make({ title: '등대에서의 첫 밤', summary: '비밀스러운 등대지기와의 첫 대면.', pov: '주인공', place: '등대', goal: '편지의 의미를 묻는다', conflict: '등대지기는 말이 없다', outcome: '의심이 깊어진다', status: 'drafting' }, 1),
    make({ title: '폭풍 전야', summary: '마을의 과거가 조금씩 드러나기 시작한다.', pov: '주인공', place: '마을', goal: '진실에 다가간다', conflict: '시간이 얼마 없다', outcome: '', status: 'idea' }, 2),
  ]
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증으로 끌어올림.
function loadScenes(): { scenes: Scene[]; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { scenes: seedScenes(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { scenes: seedScenes(), seeded: true }
    const scenes: Scene[] = []
    for (const o of parsed) {
      if (!o || typeof o !== 'object') continue
      if (typeof o.title !== 'string') continue
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      scenes.push({
        id: String(o.id || newId()),
        title: String(o.title),
        summary: str(o.summary),
        pov: str(o.pov),
        place: str(o.place),
        goal: str(o.goal),
        conflict: str(o.conflict),
        outcome: str(o.outcome),
        status: isStatus(o.status) ? o.status : 'idea',
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    // 빈 배열은 사용자가 모두 지운 결과일 수 있으므로 그대로 존중(시드하지 않음).
    return { scenes, seeded: false }
  } catch {
    return { scenes: seedScenes(), seeded: true }
  }
}

// ── 입력 필드 정의(편집기/내보내기 공용) ─────────────────────────────────────
const FIELDS: { key: keyof Pick<Scene, 'pov' | 'place' | 'goal' | 'conflict' | 'outcome'>; label: string; icon: string; ph: string }[] = [
  { key: 'pov', label: '시점(POV)', icon: '👁', ph: '누구의 시선으로?' },
  { key: 'place', label: '장소', icon: '📍', ph: '어디에서?' },
  { key: 'goal', label: '목적', icon: '🎯', ph: '이 장면에서 인물이 원하는 것' },
  { key: 'conflict', label: '갈등', icon: '⚔️', ph: '무엇이 가로막는가' },
  { key: 'outcome', label: '결과', icon: '🏁', ph: '장면이 끝난 뒤 달라진 점' },
]

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function SceneList() {
  const initial = useRef<{ scenes: Scene[]; seeded: boolean }>()
  if (!initial.current) initial.current = loadScenes()

  const [scenes, setScenes] = useState<Scene[]>(initial.current.scenes)
  const [note, setNote] = useState(initial.current.seeded ? '예시 장면을 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')
  const [filter, setFilter] = useState<Status | 'all'>('all')

  // 편집 상태: 'new' 면 새 장면, 그 외엔 장면 id 편집
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 바인더 파일 드롭 수용: 드래그 진입 시 점선 테두리, 드롭 성공 토스트
  const [dropHover, setDropHover] = useState(false)
  const [dropToast, setDropToast] = useState('')
  const dragDepth = useRef(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(scenes))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [scenes])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((id: string | 'new', data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
    const title = data.title.trim()
    if (!title) return
    const clean = {
      title,
      summary: data.summary.trim(),
      pov: data.pov.trim(),
      place: data.place.trim(),
      goal: data.goal.trim(),
      conflict: data.conflict.trim(),
      outcome: data.outcome.trim(),
      status: data.status,
    }
    setScenes((prev) => {
      if (id === 'new') {
        const now = Date.now()
        return [...prev, { id: newId(), ...clean, createdAt: now, updatedAt: now }]
      }
      return prev.map((s) => (s.id === id ? { ...s, ...clean, updatedAt: Date.now() } : s))
    })
    setEditing(null)
  }, [])

  const remove = useCallback((id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    setConfirmDel(null)
  }, [])

  // 위아래 순서 이동(전체 배열 기준 — 필터가 켜져 있어도 실제 인접 장면과 교환).
  const move = useCallback((id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  const cycleStatus = useCallback((id: string) => {
    setScenes((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const idx = STATUSES.findIndex((x) => x.key === s.status)
      const nextStatus = STATUSES[(idx + 1) % STATUSES.length].key
      return { ...s, status: nextStatus, updatedAt: Date.now() }
    }))
  }, [])

  // ── 바인더 파일 드롭 → 새 장면 카드 ─────────────────────────────────────────
  // 문서 파일: title=제목, summary=text 앞부분.
  // 장소 카드(character 에 장소 키 존재): place=name 또는 location, summary=description 등.
  const addSceneFromItem = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }) => {
    const ch = it.character
    // 인물/장소 카드 여부 판정: character 에 장소 전용 키가 있으면 장소로 취급.
    const isPlaceCard = !!ch && (typeof ch.atmosphere === 'string' || typeof ch.location === 'string' || ch.type === '장소' || typeof ch.description === 'string')

    let title = (it.title || '').trim()
    let summary = ''
    let place = ''

    if (isPlaceCard && ch) {
      // 장소 카드: 분위기/묘사를 요약으로, 장소명을 place 필드로.
      const placeName = (ch.name || ch.location || it.title || '').trim()
      title = title || placeName || '새 장면'
      place = placeName
      const parts = [ch.atmosphere, ch.description, ch.history, ch.role, ch.notes]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
      summary = parts.join(' / ').slice(0, 1000)
    } else if (ch) {
      // 인물 카드: 인물명을 POV/요약 단서로. 장소는 비워 둠.
      const personName = (ch.name || it.title || '').trim()
      title = title || personName || '새 장면'
      const parts = [ch.role, ch.goal, ch.conflict, ch.background, ch.notes]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
      summary = parts.join(' / ').slice(0, 1000)
    } else {
      // 일반 문서: title=제목, summary=text 앞부분.
      title = title || '새 장면'
      summary = (it.text || '').trim().slice(0, 1000)
    }

    const now = Date.now()
    const scene: Scene = {
      id: newId(),
      title,
      summary,
      pov: ch && !isPlaceCard ? (ch.name || '').trim() : '',
      place,
      goal: '',
      conflict: '',
      outcome: '',
      status: 'idea',
      createdAt: now,
      updatedAt: now,
    }
    setScenes((prev) => [...prev, scene])
    if (mounted.current) {
      setDropToast(`✓ 「${title}」을(를) 새 장면으로 추가했어요.`)
      window.setTimeout(() => { if (mounted.current) setDropToast('') }, 2200)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    if (it) {
      e.preventDefault()
      addSceneFromItem(it)
    }
    dragDepth.current = 0
    setDropHover(false)
  }, [addSceneFromItem])

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (isItemDrag(e)) e.preventDefault()
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current += 1
    setDropHover(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDropHover(false)
  }, [])

  // ── 집계 ─────────────────────────────────────────────────────────────────────
  const counts = STATUSES.map((st) => ({ ...st, n: scenes.filter((s) => s.status === st.key).length }))
  const total = scenes.length
  const doneN = scenes.filter((s) => s.status === 'done').length
  const activeN = scenes.filter((s) => s.status !== 'cut').length // 진행률 분모(보류·삭제 제외)
  const pct = activeN > 0 ? Math.round((doneN / activeN) * 100) : 0

  const visible = filter === 'all' ? scenes : scenes.filter((s) => s.status === filter)

  // ── 내보내기/복사 ─────────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = ['# 장면 플래너', `총 ${scenes.length}개 장면 · 완료 ${doneN}/${activeN} (${pct}%)`, '']
    scenes.forEach((s, i) => {
      const sm = statusMeta(s.status)
      lines.push(`## ${i + 1}. ${s.title}  [${sm.label}]`)
      if (s.summary) lines.push(`   ${s.summary}`)
      FIELDS.forEach((f) => {
        const v = s[f.key]
        if (v) lines.push(`   - ${f.label}: ${v}`)
      })
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [scenes, doneN, activeN, pct])

  const copyAll = useCallback(() => {
    if (!scenes.length) { setNote('내보낼 장면이 없어요. 먼저 장면을 추가하세요.'); return }
    const text = buildText()
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {
      if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.')
    })
  }, [scenes.length, buildText])

  const exportFile = useCallback(() => {
    if (!scenes.length) { setNote('내보낼 장면이 없어요. 먼저 장면을 추가하세요.'); return }
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'scene-list.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    }
  }, [scenes.length, buildText])

  // ── 프로젝트 연동: 각 장면 카드를 원고 「장면」 폴더 아래 문서로 내보내기 ───────────
  // 필터가 켜져 있으면 화면에 보이는(선택된) 장면만, '전체'면 모든 장면을 순차 추가.
  const escapeHtml = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nl2br = (v: string) => escapeHtml(v).replace(/\n/g, '<br />')

  const exportToProject = useCallback(() => {
    const targets = visible // 필터 적용 결과(전체 또는 선택된 상태 묶음)
    if (!targets.length) { setNote('내보낼 장면이 없어요. 먼저 장면을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }

    let added = 0
    for (const s of targets) {
      const sm = statusMeta(s.status)
      // 본문 = 장면 메타 + 요약(HTML)
      const metaRows = FIELDS
        .filter((f) => s[f.key])
        .map((f) => `<p><strong>${escapeHtml(f.label)}:</strong> ${nl2br(s[f.key])}</p>`)
        .join('')
      const bodyHtml =
        `<p><strong>상태:</strong> ${escapeHtml(sm.label)}</p>` +
        metaRows +
        (s.summary ? `<hr /><p>${nl2br(s.summary)}</p>` : '')

      const id = addToProject({
        kind: 'text',
        root: 'draft',
        folder: '장면',
        title: s.title,
        bodyHtml,
        synopsis: s.summary || undefined,
        meta: { POV: s.pov, 장소: s.place, 상태: sm.label },
      })
      if (id) added += 1
    }

    if (!mounted.current) return
    if (added === 0) setNote('프로젝트에 장면을 추가하지 못했어요.')
    else setNote(`✓ 프로젝트 원고 「장면」 폴더에 ${added}개 장면을 문서로 추가했어요.`)
  }, [visible])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? `color-mix(in srgb, ${color} 18%, var(--paper))` : 'var(--paper)',
    color: 'var(--text)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  })

  return (
    <div
      style={dropHover ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4, background: 'color-mix(in srgb, var(--accent) 6%, transparent)' } : wrap}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 드롭 성공 토스트 */}
      {dropToast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span>{dropToast}</span>
          <button className="minibtn" onClick={() => setDropToast('')} aria-label="알림 닫기">✕</button>
        </div>
      )}
      {/* 드롭 안내 오버레이 */}
      {dropHover && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent) 4%, transparent)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--panel)', border: '1px dashed var(--accent)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
            <Emoji e="🎬"/> 여기에 놓아 새 장면으로 추가
          </div>
        </div>
      )}
      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => setEditing('new')} title="새 장면 추가">+ 장면 추가</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyAll} title="전체 장면을 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {/* 집계 막대 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>전체 {total}개 장면</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>완료 {doneN}/{activeN} · {pct}%</span>
          <div style={{ flex: 1 }} />
          {counts.map((c) => (
            <span key={c.key} style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span aria-hidden><Emoji e={c.dot}/></span>{c.label} <strong style={{ color: 'var(--text)' }}>{c.n}</strong>
            </span>
          ))}
        </div>
        {/* 진행 게이지 */}
        <div style={{ height: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }} title={`완료율 ${pct}%`}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ok)', transition: 'width .25s ease' }} />
        </div>
        {/* 상태 필터 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>필터</span>
          <button style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')}>전체 {total}</button>
          {STATUSES.map((st) => (
            <button key={st.key} style={chip(filter === st.key, st.color)} onClick={() => setFilter(st.key)}>
              <Emoji e={st.dot}/> {st.label} {scenes.filter((s) => s.status === st.key).length}
            </button>
          ))}
        </div>
      </div>

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 장면 목록 (스크롤 본문) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: 24 }}>
            <div style={{ fontSize: 38 }} aria-hidden><Emoji e="🎬"/></div>
            {scenes.length === 0 ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>아직 장면이 없어요</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                  「+ 장면 추가」로 첫 장면을 만들어 보세요.<br />제목·요약과 시점·장소·목적·갈등·결과를 정리하면<br />이야기 흐름이 한눈에 들어옵니다.
                </div>
                <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setEditing('new')}>+ 첫 장면 추가</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>이 상태의 장면이 없어요</div>
                <button className="minibtn" onClick={() => setFilter('all')}>전체 보기</button>
              </>
            )}
          </div>
        ) : (
          visible.map((s) => {
            const sm = statusMeta(s.status)
            const realIdx = scenes.findIndex((x) => x.id === s.id)
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${sm.color}`, borderRadius: 12, padding: '11px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, minWidth: 22, textAlign: 'right', lineHeight: '20px' }}>{realIdx + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-word' }}>{s.title}</span>
                      <button
                        className="minibtn"
                        onClick={() => cycleStatus(s.id)}
                        title="상태 전환 (클릭하여 변경)"
                        style={{ padding: '1px 8px', fontSize: 11, borderColor: sm.color, color: sm.color, fontWeight: 600 }}
                      ><Emoji e={sm.dot}/> {sm.label}</button>
                    </div>
                    {s.summary && (
                      <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, marginTop: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.summary}</div>
                    )}
                    {/* 세부 필드 */}
                    {FIELDS.some((f) => s[f.key]) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
                        {FIELDS.map((f) => s[f.key] ? (
                          <span key={f.key} style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', gap: 4, maxWidth: '100%' }}>
                            <span style={{ flexShrink: 0 }} aria-hidden><Emoji e={f.icon}/></span>
                            <span style={{ flexShrink: 0, fontWeight: 600 }}>{f.label}:</span>
                            <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{s[f.key]}</span>
                          </span>
                        ) : null)}
                      </div>
                    )}
                  </div>
                </div>
                {/* 카드 액션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)' }}>
                  <button className="minibtn" style={mini} title="위로 이동" disabled={realIdx === 0} onClick={() => move(s.id, -1)}>▲ 위로</button>
                  <button className="minibtn" style={mini} title="아래로 이동" disabled={realIdx === scenes.length - 1} onClick={() => move(s.id, 1)}>▼ 아래로</button>
                  <div style={{ flex: 1 }} />
                  <button className="minibtn" style={mini} title="편집" onClick={() => setEditing(s.id)}><Emoji e="✏️"/> 편집</button>
                  <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(s.id)}><Emoji e="🗑️"/> 삭제</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={exportToProject}
          disabled={!hasProjectBridge() || visible.length === 0}
          title={
            !hasProjectBridge()
              ? '프로젝트에 연결되어 있지 않습니다'
              : filter === 'all'
                ? '전체 장면을 프로젝트 원고 「장면」 폴더에 문서로 추가'
                : `현재 필터된 ${visible.length}개 장면을 프로젝트 원고 「장면」 폴더에 문서로 추가`
          }
        >
          <Emoji e="📄"/> 프로젝트에 장면 문서로 내보내기{filter !== 'all' ? ` (${visible.length})` : ''}
        </button>
      </div>

      {/* 하단 안내 */}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span>상태 배지를 누르면 구상→집필→완료→보류 순으로 바뀝니다.</span>
        {filter !== 'all' && <span>현재 「{statusMeta(filter as Status).label}」 {visible.length}개 표시 중</span>}
      </div>

      {/* 편집/추가 모달 */}
      {editing && (
        <SceneEditor
          scene={editing === 'new' ? null : scenes.find((s) => s.id === editing) || null}
          isNew={editing === 'new'}
          onCancel={() => setEditing(null)}
          onSave={(data) => upsert(editing, data)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && scenes.find((s) => s.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>장면 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{scenes.find((s) => s.id === confirmDel)!.title}」 장면을 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
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

const mini: React.CSSProperties = { padding: '3px 9px', fontSize: 11.5, lineHeight: 1.2 }

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

// ── 장면 편집기 ───────────────────────────────────────────────────────────────
function SceneEditor({
  scene, isNew, onCancel, onSave,
}: {
  scene: Scene | null
  isNew: boolean
  onCancel: () => void
  onSave: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const base = scene || emptyScene()
  const [title, setTitle] = useState(base.title)
  const [summary, setSummary] = useState(base.summary)
  const [pov, setPov] = useState(base.pov)
  const [place, setPlace] = useState(base.place)
  const [goal, setGoal] = useState(base.goal)
  const [conflict, setConflict] = useState(base.conflict)
  const [outcome, setOutcome] = useState(base.outcome)
  const [status, setStatus] = useState<Status>(base.status)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const setters: Record<string, (v: string) => void> = { pov: setPov, place: setPlace, goal: setGoal, conflict: setConflict, outcome: setOutcome }
  const values: Record<string, string> = { pov, place, goal, conflict, outcome }

  const submit = () => {
    onSave({ title, summary, pov, place, goal, conflict, outcome, status })
  }

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 460, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {isNew ? <><Emoji e="🎬"/> 새 장면</> : <><Emoji e="🎬"/> 장면 편집</>}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>제목 *</label>
            <input
              ref={titleRef}
              style={inputBase}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder="예: 안개 낀 항구 도착"
              maxLength={120}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>요약</label>
            <textarea
              style={{ ...inputBase, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="이 장면에서 무슨 일이 일어나는지 한두 문장으로"
              maxLength={1000}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label style={label}><Emoji e={f.icon}/> {f.label}</label>
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
                    background: status === st.key ? `color-mix(in srgb, ${st.color} 16%, var(--paper))` : 'var(--paper)',
                    fontWeight: status === st.key ? 700 : 400,
                  }}
                ><Emoji e={st.dot}/> {st.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
