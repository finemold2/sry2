// 장 개요 플래너 — 장(章) 카드(번호/제목/한 줄 요약/목표 분량/POV/상태)를 추가·편집·삭제하고
// 위아래로 순서를 바꾸며, 총 목표 분량 합계와 상태별 진행을 한눈에 정리합니다.
// 각 장을 프로젝트 원고 「원고」 폴더 아래 장 문서로 일괄 생성할 수 있습니다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원. 미지원 환경 graceful.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'chapter-planner', name: '장 개요 플래너', icon: '📖', group: '구상·정리', intro: '장(章) 카드를 만들고 순서를 바꾸며 목표 분량과 진행을 정리하세요', w: 720, h: 620 }

const LS_KEY = 'sry:tool:chapter-planner'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
type Status = 'idea' | 'drafting' | 'done' | 'cut'

interface Chapter {
  id: string
  title: string
  summary: string      // 한 줄 요약
  target: number       // 목표 분량(자/단어 등 단위 무관, 숫자만)
  pov: string
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

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
const fmt = (n: number) => n.toLocaleString('ko-KR')

function emptyChapter(): Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'> {
  return { title: '', summary: '', target: 0, pov: '', status: 'idea' }
}

// 첫 사용자에게 보여줄 예시 장(저장 데이터가 전혀 없을 때만 시드).
function seedChapters(): Chapter[] {
  const now = Date.now()
  const make = (s: Partial<Chapter>, i: number): Chapter => ({
    id: newId(),
    title: '', summary: '', target: 0, pov: '', status: 'idea',
    ...s,
    createdAt: now + i, updatedAt: now + i,
  })
  return [
    make({ title: '발단 — 균열의 시작', summary: '평온한 일상에 첫 균열이 생긴다.', target: 8000, pov: '주인공', status: 'done' }, 0),
    make({ title: '여정의 부름', summary: '주인공이 떠날 수밖에 없는 사건이 벌어진다.', target: 10000, pov: '주인공', status: 'drafting' }, 1),
    make({ title: '첫 시련', summary: '낯선 세계에서 첫 번째 장벽과 마주한다.', target: 9000, pov: '조력자', status: 'idea' }, 2),
  ]
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증으로 끌어올림.
function loadChapters(): { chapters: Chapter[]; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { chapters: seedChapters(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { chapters: seedChapters(), seeded: true }
    const chapters: Chapter[] = []
    for (const o of parsed) {
      if (!o || typeof o !== 'object') continue
      if (typeof o.title !== 'string') continue
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      chapters.push({
        id: String(o.id || newId()),
        title: String(o.title),
        summary: str(o.summary),
        target: toNum(o.target),
        pov: str(o.pov),
        status: isStatus(o.status) ? o.status : 'idea',
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    // 빈 배열은 사용자가 모두 지운 결과일 수 있으므로 그대로 존중(시드하지 않음).
    return { chapters, seeded: false }
  } catch {
    return { chapters: seedChapters(), seeded: true }
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function ChapterPlanner({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ chapters: Chapter[]; seeded: boolean }>()
  if (!initial.current) initial.current = loadChapters()

  const [chapters, setChapters] = useState<Chapter[]>(initial.current.chapters)
  const [note, setNote] = useState(initial.current.seeded ? '예시 장을 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')
  const [filter, setFilter] = useState<Status | 'all'>('all')

  // 편집 상태: 'new' 면 새 장, 그 외엔 장 id 편집
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 장 제목/요약을 미리 채운 새 장 열기(연계 진입). 1회만.
  const consumedPayload = useRef(false)
  const [prefill, setPrefill] = useState<Partial<Chapter> | null>(null)
  useEffect(() => {
    if (consumedPayload.current || !payload) return
    consumedPayload.current = true
    const title = typeof payload.title === 'string' ? payload.title : ''
    const summary = typeof payload.summary === 'string' ? payload.summary
      : typeof payload.synopsis === 'string' ? payload.synopsis : ''
    const pov = typeof payload.pov === 'string' ? payload.pov : ''
    const target = toNum(payload.target)
    if (title || summary || pov || target) {
      setPrefill({ title, summary, pov, target })
      setEditing('new')
    }
  }, [payload])

  // 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(chapters))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [chapters])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((id: string | 'new', data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => {
    const title = data.title.trim()
    if (!title) return
    const clean = {
      title,
      summary: data.summary.trim(),
      target: toNum(data.target),
      pov: data.pov.trim(),
      status: data.status,
    }
    setChapters((prev) => {
      if (id === 'new') {
        const now = Date.now()
        return [...prev, { id: newId(), ...clean, createdAt: now, updatedAt: now }]
      }
      return prev.map((c) => (c.id === id ? { ...c, ...clean, updatedAt: Date.now() } : c))
    })
    setEditing(null)
    setPrefill(null)
  }, [])

  const remove = useCallback((id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
  }, [])

  // 위아래 순서 이동(전체 배열 기준 — 필터가 켜져 있어도 실제 인접 장과 교환).
  const move = useCallback((id: string, dir: -1 | 1) => {
    setChapters((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  const cycleStatus = useCallback((id: string) => {
    setChapters((prev) => prev.map((c) => {
      if (c.id !== id) return c
      const idx = STATUSES.findIndex((x) => x.key === c.status)
      const nextStatus = STATUSES[(idx + 1) % STATUSES.length].key
      return { ...c, status: nextStatus, updatedAt: Date.now() }
    }))
  }, [])

  // ── 집계 ─────────────────────────────────────────────────────────────────────
  const counts = STATUSES.map((st) => ({ ...st, n: chapters.filter((c) => c.status === st.key).length }))
  const total = chapters.length
  const doneN = chapters.filter((c) => c.status === 'done').length
  const activeN = chapters.filter((c) => c.status !== 'cut').length // 진행률 분모(보류·삭제 제외)
  const pct = activeN > 0 ? Math.round((doneN / activeN) * 100) : 0
  // 총 목표 분량(보류·삭제 제외) + 완료분 합계
  const targetSum = chapters.filter((c) => c.status !== 'cut').reduce((a, c) => a + c.target, 0)
  const doneTargetSum = chapters.filter((c) => c.status === 'done').reduce((a, c) => a + c.target, 0)

  const visible = filter === 'all' ? chapters : chapters.filter((c) => c.status === filter)

  // ── 내보내기/복사 ─────────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = [
      '# 장 개요 플래너',
      `총 ${chapters.length}개 장 · 완료 ${doneN}/${activeN} (${pct}%) · 목표 분량 합계 ${fmt(targetSum)}`,
      '',
    ]
    chapters.forEach((c, i) => {
      const sm = statusMeta(c.status)
      lines.push(`## ${i + 1}장. ${c.title}  [${sm.label}]`)
      if (c.summary) lines.push(`   ${c.summary}`)
      const sub: string[] = []
      if (c.target > 0) sub.push(`목표 분량 ${fmt(c.target)}`)
      if (c.pov) sub.push(`POV ${c.pov}`)
      if (sub.length) lines.push(`   - ${sub.join(' · ')}`)
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [chapters, doneN, activeN, pct, targetSum])

  const copyAll = useCallback(() => {
    if (!chapters.length) { setNote('내보낼 장이 없어요. 먼저 장을 추가하세요.'); return }
    const text = buildText()
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {
      if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.')
    })
  }, [chapters.length, buildText])

  const exportFile = useCallback(() => {
    if (!chapters.length) { setNote('내보낼 장이 없어요. 먼저 장을 추가하세요.'); return }
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'chapter-plan.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    }
  }, [chapters.length, buildText])

  // ── 프로젝트 연동: 각 장 카드를 원고 「원고」 폴더 아래 문서로 일괄 생성 ───────────
  // 필터가 켜져 있으면 화면에 보이는(선택된) 장만, '전체'면 모든 장을 순차 추가.
  const escapeHtml = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nl2br = (v: string) => escapeHtml(v).replace(/\n/g, '<br />')

  const exportToProject = useCallback(() => {
    const targets = visible // 필터 적용 결과(전체 또는 선택된 상태 묶음)
    if (!targets.length) { setNote('내보낼 장이 없어요. 먼저 장을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }

    let added = 0
    for (const c of targets) {
      const sm = statusMeta(c.status)
      const num = chapters.findIndex((x) => x.id === c.id) + 1 // 전체 기준 장 번호
      const metaRows: string[] = [`<p><strong>상태:</strong> ${escapeHtml(sm.label)}</p>`]
      if (c.target > 0) metaRows.push(`<p><strong>목표 분량:</strong> ${escapeHtml(fmt(c.target))}</p>`)
      if (c.pov) metaRows.push(`<p><strong>POV:</strong> ${nl2br(c.pov)}</p>`)
      const bodyHtml =
        metaRows.join('') +
        (c.summary ? `<hr /><p>${nl2br(c.summary)}</p>` : '')

      const id = addToProject({
        kind: 'text',
        root: 'draft',
        folder: '원고',
        title: `${num}장. ${c.title}`,
        bodyHtml,
        synopsis: c.summary || undefined,
        meta: { 목표분량: c.target > 0 ? fmt(c.target) : '', POV: c.pov, 상태: sm.label },
      })
      if (id) added += 1
    }

    if (!mounted.current) return
    if (added === 0) setNote('프로젝트에 장을 추가하지 못했어요.')
    else setNote(`✓ 프로젝트 원고 「원고」 폴더에 ${added}개 장을 문서로 추가했어요.`)
  }, [visible, chapters])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? `color-mix(in srgb, ${color} 18%, var(--paper))` : 'var(--paper)',
    color: 'var(--text)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  })

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => { setPrefill(null); setEditing('new') }} title="새 장 추가">+ 장 추가</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyAll} title="전체 장을 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {/* 집계 막대 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>전체 {total}개 장</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>완료 {doneN}/{activeN} · {pct}%</span>
          <div style={{ flex: 1 }} />
          {counts.map((c) => (
            <span key={c.key} style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span aria-hidden><Emoji e={c.dot} /></span>{c.label} <strong style={{ color: 'var(--text)' }}>{c.n}</strong>
            </span>
          ))}
        </div>
        {/* 진행 게이지 */}
        <div style={{ height: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }} title={`완료율 ${pct}%`}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ok)', transition: 'width .25s ease' }} />
        </div>
        {/* 목표 분량 합계 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
            <span aria-hidden><Emoji e="🎯" /></span>
            <span style={{ color: 'var(--muted)' }}>총 목표 분량</span>
            <strong style={{ color: 'var(--text)' }}>{fmt(targetSum)}</strong>
          </span>
          {doneTargetSum > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              완료 분량 <strong style={{ color: 'var(--ok)' }}>{fmt(doneTargetSum)}</strong>
              {targetSum > 0 ? ` (${Math.round((doneTargetSum / targetSum) * 100)}%)` : ''}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>(보류·삭제 제외)</span>
        </div>
        {/* 상태 필터 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>필터</span>
          <button style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')}>전체 {total}</button>
          {STATUSES.map((st) => (
            <button key={st.key} style={chip(filter === st.key, st.color)} onClick={() => setFilter(st.key)}>
              <Emoji e={st.dot} /> {st.label} {chapters.filter((c) => c.status === st.key).length}
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

      {/* 장 목록 (스크롤 본문) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: 24 }}>
            <div style={{ fontSize: 38 }} aria-hidden><Emoji e="📖" /></div>
            {chapters.length === 0 ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>아직 장이 없어요</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                  「+ 장 추가」로 첫 장을 만들어 보세요.<br />제목·한 줄 요약과 목표 분량·POV를 정리하면<br />전체 분량 계획과 흐름이 한눈에 들어옵니다.
                </div>
                <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => { setPrefill(null); setEditing('new') }}>+ 첫 장 추가</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>이 상태의 장이 없어요</div>
                <button className="minibtn" onClick={() => setFilter('all')}>전체 보기</button>
              </>
            )}
          </div>
        ) : (
          visible.map((c) => {
            const sm = statusMeta(c.status)
            const realIdx = chapters.findIndex((x) => x.id === c.id)
            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${sm.color}`, borderRadius: 12, padding: '11px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, minWidth: 30, textAlign: 'right', lineHeight: '20px' }}>{realIdx + 1}장</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-word' }}>{c.title}</span>
                      <button
                        className="minibtn"
                        onClick={() => cycleStatus(c.id)}
                        title="상태 전환 (클릭하여 변경)"
                        style={{ padding: '1px 8px', fontSize: 11, borderColor: sm.color, color: sm.color, fontWeight: 600 }}
                      ><Emoji e={sm.dot} /> {sm.label}</button>
                    </div>
                    {c.summary && (
                      <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, marginTop: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.summary}</div>
                    )}
                    {/* 세부 필드 */}
                    {(c.target > 0 || c.pov) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
                        {c.target > 0 && (
                          <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', gap: 4 }}>
                            <span style={{ flexShrink: 0 }} aria-hidden><Emoji e="🎯" /></span>
                            <span style={{ flexShrink: 0, fontWeight: 600 }}>목표 분량:</span>
                            <span style={{ color: 'var(--text)' }}>{fmt(c.target)}</span>
                          </span>
                        )}
                        {c.pov && (
                          <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', gap: 4, maxWidth: '100%' }}>
                            <span style={{ flexShrink: 0 }} aria-hidden><Emoji e="👁" /></span>
                            <span style={{ flexShrink: 0, fontWeight: 600 }}>POV:</span>
                            <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{c.pov}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* 카드 액션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)' }}>
                  <button className="minibtn" style={mini} title="위로 이동" disabled={realIdx === 0} onClick={() => move(c.id, -1)}>▲ 위로</button>
                  <button className="minibtn" style={mini} title="아래로 이동" disabled={realIdx === chapters.length - 1} onClick={() => move(c.id, 1)}>▼ 아래로</button>
                  <div style={{ flex: 1 }} />
                  <button className="minibtn" style={mini} title="편집" onClick={() => { setPrefill(null); setEditing(c.id) }}><Emoji e="✏️" /> 편집</button>
                  <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(c.id)}><Emoji e="🗑️" /> 삭제</button>
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
                ? '전체 장을 프로젝트 원고 「원고」 폴더에 장 문서로 일괄 생성'
                : `현재 필터된 ${visible.length}개 장을 프로젝트 원고 「원고」 폴더에 장 문서로 생성`
          }
        >
          <Emoji e="📄" /> 프로젝트에 추가{filter !== 'all' ? ` (${visible.length})` : ''}
        </button>
      </div>

      {/* 하단 안내 */}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span>상태 배지를 누르면 구상→집필→완료→보류 순으로 바뀝니다.</span>
        {filter !== 'all' && <span>현재 「{statusMeta(filter as Status).label}」 {visible.length}개 표시 중</span>}
      </div>

      {/* 편집/추가 모달 */}
      {editing && (
        <ChapterEditor
          chapter={editing === 'new' ? null : chapters.find((c) => c.id === editing) || null}
          prefill={editing === 'new' ? prefill : null}
          isNew={editing === 'new'}
          onCancel={() => { setEditing(null); setPrefill(null) }}
          onSave={(data) => upsert(editing, data)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && chapters.find((c) => c.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>장 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{chapters.find((c) => c.id === confirmDel)!.title}」 장을 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
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

// ── 장 편집기 ─────────────────────────────────────────────────────────────────
function ChapterEditor({
  chapter, prefill, isNew, onCancel, onSave,
}: {
  chapter: Chapter | null
  prefill: Partial<Chapter> | null
  isNew: boolean
  onCancel: () => void
  onSave: (data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const base = chapter || { ...emptyChapter(), ...(prefill || {}) }
  const [title, setTitle] = useState(base.title || '')
  const [summary, setSummary] = useState(base.summary || '')
  const [target, setTarget] = useState(base.target ? String(base.target) : '')
  const [pov, setPov] = useState(base.pov || '')
  const [status, setStatus] = useState<Status>(isStatus(base.status) ? base.status : 'idea')
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const submit = () => {
    onSave({ title, summary, target: toNum(target), pov, status })
  }

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 460, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {isNew ? <><Emoji e="📖" /> 새 장</> : <><Emoji e="📖" /> 장 편집</>}
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
              placeholder="예: 발단 — 균열의 시작"
              maxLength={120}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>한 줄 요약</label>
            <textarea
              style={{ ...inputBase, minHeight: 56, resize: 'vertical', lineHeight: 1.5 }}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="이 장에서 무슨 일이 일어나는지 한 줄로"
              maxLength={1000}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label}><Emoji e="🎯" /> 목표 분량</label>
              <input
                style={inputBase}
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d,]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                inputMode="numeric"
                placeholder="예: 8000"
                maxLength={12}
              />
            </div>
            <div>
              <label style={label}><Emoji e="👁" /> 시점(POV)</label>
              <input
                style={inputBase}
                value={pov}
                onChange={(e) => setPov(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                placeholder="누구의 시선으로?"
                maxLength={120}
              />
            </div>
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
                ><Emoji e={st.dot} /> {st.label}</button>
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
