// 톤 변화 지도 — 장면/챕터별 톤(밝음·긴장·암울·코믹·서정·액션 등)을 색 태그로 지정하고
// 작품 전체 톤 흐름을 색 띠(타임라인)로 시각화합니다. 급격한 톤 전환·단조로운 구간을 자동 점검.
// 장면 CRUD·드래그 재정렬. localStorage 자동 저장/복원. 미지원 환경 graceful.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어/키 불필요. 언마운트 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToProject, hasProjectBridge,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'tone-shift-mapper',
  name: '톤 변화 지도',
  icon: '🎨',
  group: '구상·정리',
  intro: '장면별 톤을 색으로 지정해 작품 전체 분위기 흐름을 색 띠로 보고, 급격한 전환·단조로운 구간을 점검하세요',
  w: 760,
  h: 640,
}

const LS_KEY = 'sry:tool:tone-shift-mapper'

// ── 톤 팔레트 ───────────────────────────────────────────────────────────────
// 각 톤은 색(hex)과 "정서 강도(intensity)" 좌표를 가진다.
//  - intensity: 0(차분·고요) ~ 100(격렬·고조). 인접 장면 간 차이로 '급격한 전환'을 판정.
//  - valence: -100(암울·부정) ~ +100(밝음·긍정). 보조 점검(분위기 부호 급반전)에 사용.
interface ToneDef { key: string; label: string; color: string; icon: string; intensity: number; valence: number }

const TONES: ToneDef[] = [
  { key: 'bright',    label: '밝음',   color: '#f4c430', icon: '☀️', intensity: 35, valence: 80 },
  { key: 'warm',      label: '따뜻함', color: '#f08a4b', icon: '🤝', intensity: 30, valence: 60 },
  { key: 'lyric',     label: '서정',   color: '#7aa6e0', icon: '🍃', intensity: 25, valence: 25 },
  { key: 'comic',     label: '코믹',   color: '#e85d9c', icon: '😄', intensity: 55, valence: 70 },
  { key: 'romance',   label: '로맨스', color: '#e26d9e', icon: '💗', intensity: 45, valence: 55 },
  { key: 'mystery',   label: '미스터리', color: '#6f5bd6', icon: '🔍', intensity: 55, valence: -10 },
  { key: 'tension',   label: '긴장',   color: '#e0a800', icon: '⚡', intensity: 78, valence: -25 },
  { key: 'action',    label: '액션',   color: '#e04545', icon: '💥', intensity: 92, valence: 0 },
  { key: 'dark',      label: '암울',   color: '#5a6b80', icon: '🌑', intensity: 50, valence: -75 },
  { key: 'tragic',    label: '비극',   color: '#404a5c', icon: '🥀', intensity: 65, valence: -90 },
  { key: 'calm',      label: '고요',   color: '#5fb39a', icon: '🌫️', intensity: 12, valence: 10 },
  { key: 'hopeful',   label: '희망',   color: '#5cc06a', icon: '🌱', intensity: 40, valence: 75 },
]
const toneMeta = (k: string): ToneDef => TONES.find((t) => t.key === k) || TONES[0]
const isTone = (v: unknown): v is string => typeof v === 'string' && TONES.some((t) => t.key === v)

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface Scene {
  id: string
  title: string
  tone: string
  note: string
  createdAt: number
  updatedAt: number
}

// ── 점검 임계값 ────────────────────────────────────────────────────────────────
const JUMP_INTENSITY = 45   // 인접 장면 강도 차이가 이 이상이면 '급격한 전환'
const FLIP_VALENCE = 120    // 인접 장면 분위기 부호가 크게 뒤집히면 '정서 급반전'
const MONOTONE_RUN = 4      // 같은 톤이 이만큼 연속이면 '단조로운 구간'

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function seedScenes(): Scene[] {
  const now = Date.now()
  const make = (title: string, tone: string, note: string, i: number): Scene => ({
    id: newId(), title, tone, note, createdAt: now + i, updatedAt: now + i,
  })
  return [
    make('1장 · 평온한 일상', 'calm', '주인공의 무탈한 하루로 시작.', 0),
    make('2장 · 낯선 손님', 'mystery', '수상한 방문자가 단서를 흘린다.', 1),
    make('3장 · 추격', 'action', '쫓고 쫓기는 긴박한 도주극.', 2),
    make('4장 · 잿빛 밤', 'dark', '돌이킬 수 없는 사건이 벌어진다.', 3),
    make('5장 · 작은 위로', 'warm', '상처를 나누는 조용한 장면.', 4),
    make('6장 · 다시 일어서다', 'hopeful', '결심을 굳히며 반격을 준비한다.', 5),
  ]
}

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
        tone: isTone(o.tone) ? o.tone : 'calm',
        note: str(o.note),
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    return { scenes, seeded: false }
  } catch {
    return { scenes: seedScenes(), seeded: true }
  }
}

// ── 점검 계산 ──────────────────────────────────────────────────────────────────
type IssueKind = 'jump' | 'flip' | 'monotone'
interface Issue { kind: IssueKind; at: number; spanTo?: number; text: string }

function analyze(scenes: Scene[]): { issues: Issue[]; jumps: Set<number>; monoSpans: { from: number; to: number; tone: string }[] } {
  const issues: Issue[] = []
  const jumps = new Set<number>() // i: 장면 i 와 i-1 사이에서 급전환
  // 인접 전환 점검
  for (let i = 1; i < scenes.length; i++) {
    const a = toneMeta(scenes[i - 1].tone)
    const b = toneMeta(scenes[i].tone)
    const dInt = Math.abs(b.intensity - a.intensity)
    const dVal = Math.abs(b.valence - a.valence)
    if (dInt >= JUMP_INTENSITY) {
      jumps.add(i)
      issues.push({ kind: 'jump', at: i, text: `${i + 1}번 「${scenes[i].title || '(제목 없음)'}」: 강도 급변 (${a.label}→${b.label}, ${dInt}점 차)` })
    } else if (dVal >= FLIP_VALENCE) {
      jumps.add(i)
      issues.push({ kind: 'flip', at: i, text: `${i + 1}번 「${scenes[i].title || '(제목 없음)'}」: 분위기 급반전 (${a.label}↔${b.label})` })
    }
  }
  // 단조 구간(같은 톤 연속) 점검
  const monoSpans: { from: number; to: number; tone: string }[] = []
  let runStart = 0
  for (let i = 1; i <= scenes.length; i++) {
    const same = i < scenes.length && scenes[i].tone === scenes[runStart].tone
    if (!same) {
      const len = i - runStart
      if (len >= MONOTONE_RUN) {
        monoSpans.push({ from: runStart, to: i - 1, tone: scenes[runStart].tone })
        issues.push({
          kind: 'monotone', at: runStart, spanTo: i - 1,
          text: `${runStart + 1}~${i}번: 「${toneMeta(scenes[runStart].tone).label}」 톤이 ${len}장면 연속 — 변화를 고려해 보세요`,
        })
      }
      runStart = i
    }
  }
  return { issues, jumps, monoSpans }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function ToneShiftMapper({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ scenes: Scene[]; seeded: boolean }>()
  if (!initial.current) initial.current = loadScenes()

  const [scenes, setScenes] = useState<Scene[]>(initial.current.scenes)
  const [note, setNote] = useState(initial.current.seeded ? '예시 톤 흐름을 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<string | null>(null) // 띠에서 클릭 선택된 장면
  const [showIssues, setShowIssues] = useState(true)

  // 드래그 재정렬 상태
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // 바인더 파일 드롭 수용
  const [dropHover, setDropHover] = useState(false)
  const [dropToast, setDropToast] = useState('')
  const fileDragDepth = useRef(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 외부에서 장면 묶음을 받으면 한 번 추가(연계 진입점)
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const incoming = payload && Array.isArray((payload as { scenes?: unknown }).scenes)
      ? (payload as { scenes: unknown[] }).scenes
      : null
    if (!incoming || !incoming.length) return
    const now = Date.now()
    const added: Scene[] = []
    incoming.forEach((raw, i) => {
      if (!raw || typeof raw !== 'object') return
      const o = raw as Record<string, unknown>
      const title = typeof o.title === 'string' ? o.title.trim() : ''
      if (!title) return
      added.push({
        id: newId(),
        title: title.slice(0, 120),
        tone: isTone(o.tone) ? (o.tone as string) : 'calm',
        note: typeof o.note === 'string' ? o.note.slice(0, 1000) : '',
        createdAt: now + i, updatedAt: now + i,
      })
    })
    if (added.length) {
      setScenes((prev) => [...prev, ...added])
      setNote(`연계로 ${added.length}개 장면을 톤 지도에 추가했어요.`)
    }
  }, [payload])

  // 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(scenes))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.')
    }
  }, [scenes])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((id: string | 'new', data: { title: string; tone: string; note: string }) => {
    const title = data.title.trim()
    if (!title) return
    const clean = { title, tone: isTone(data.tone) ? data.tone : 'calm', note: data.note.trim() }
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
    setSelected((cur) => (cur === id ? null : cur))
  }, [])

  // 버튼 기반 순서 이동(접근성·드래그 불가 환경 대비)
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

  // 톤만 빠르게 순환(띠/카드에서 즉시 변경)
  const cycleTone = useCallback((id: string) => {
    setScenes((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const idx = TONES.findIndex((t) => t.key === s.tone)
      return { ...s, tone: TONES[(idx + 1) % TONES.length].key, updatedAt: Date.now() }
    }))
  }, [])

  const setTone = useCallback((id: string, tone: string) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, tone, updatedAt: Date.now() } : s)))
  }, [])

  // ── 장면 카드 간 드래그 재정렬(포인터/HTML5 드래그) ──────────────────────────
  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    setScenes((prev) => {
      const from = prev.findIndex((s) => s.id === fromId)
      const to = prev.findIndex((s) => s.id === toId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  // ── 바인더 파일 드롭 → 새 장면 ─────────────────────────────────────────────
  const addSceneFromItem = useCallback((it: { id: string; title: string; type: string; character?: Record<string, string>; text?: string }) => {
    const title = (it.title || '새 장면').trim().slice(0, 120) || '새 장면'
    const note = (it.text || '').trim().slice(0, 1000)
    const now = Date.now()
    setScenes((prev) => [...prev, { id: newId(), title, tone: 'calm', note, createdAt: now, updatedAt: now }])
    if (mounted.current) {
      setDropToast(`✓ 「${title}」을(를) 장면으로 추가했어요. 톤을 지정해 보세요.`)
      window.setTimeout(() => { if (mounted.current) setDropToast('') }, 2400)
    }
  }, [])

  const onFileDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    if (it) {
      e.preventDefault()
      addSceneFromItem(it)
    }
    fileDragDepth.current = 0
    setDropHover(false)
  }, [addSceneFromItem])

  const onFileDragOver = useCallback((e: React.DragEvent) => {
    if (isItemDrag(e)) e.preventDefault()
  }, [])
  const onFileDragEnter = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    fileDragDepth.current += 1
    setDropHover(true)
  }, [])
  const onFileDragLeave = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1)
    if (fileDragDepth.current === 0) setDropHover(false)
  }, [])

  // ── 분석 ─────────────────────────────────────────────────────────────────────
  const { issues, jumps, monoSpans } = analyze(scenes)
  const monoIdx = new Set<number>()
  monoSpans.forEach((sp) => { for (let i = sp.from; i <= sp.to; i++) monoIdx.add(i) })

  // 톤 사용 분포
  const dist = TONES.map((t) => ({ ...t, n: scenes.filter((s) => s.tone === t.key).length })).filter((d) => d.n > 0)
  const distinctTones = dist.length

  // ── 내보내기/복사 ─────────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = ['# 톤 변화 지도', `총 ${scenes.length}개 장면 · 사용 톤 ${distinctTones}종`, '']
    scenes.forEach((s, i) => {
      const t = toneMeta(s.tone)
      lines.push(`${i + 1}. [${t.label}] ${s.title}`)
      if (s.note) lines.push(`   ${s.note}`)
    })
    if (issues.length) {
      lines.push('', '## 점검')
      issues.forEach((iss) => lines.push(`- ${iss.text}`))
    }
    return lines.join('\n').trimEnd() + '\n'
  }, [scenes, distinctTones, issues])

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
    let url = ''
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tone-shift-map.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      if (mounted.current) setNote('파일 내보내기에 실패했어요. 대신 복사 버튼을 이용해 보세요.')
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }, [scenes.length, buildText])

  // ── 프로젝트 연계: 톤 지도 요약 문서 ──────────────────────────────────────────
  const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const exportToProject = useCallback(() => {
    if (!scenes.length) { setNote('내보낼 장면이 없어요. 먼저 장면을 추가하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    // 색 띠를 인라인 색 사각형 + 표로 표현(외부 이미지 없이 HTML 색상만 사용 → 저작권 안전)
    const swatches = scenes.map((s) => {
      const t = toneMeta(s.tone)
      return `<span style="display:inline-block;width:22px;height:14px;background:${t.color};border:1px solid #00000022;vertical-align:middle;" title="${escapeHtml(t.label)}"></span>`
    }).join('')
    const rows = scenes.map((s, i) => {
      const t = toneMeta(s.tone)
      return `<tr><td>${i + 1}</td><td><span style="display:inline-block;width:12px;height:12px;background:${t.color};border:1px solid #00000022;vertical-align:middle;margin-right:6px;"></span>${escapeHtml(t.label)}</td><td>${escapeHtml(s.title)}</td><td>${escapeHtml(s.note)}</td></tr>`
    }).join('')
    const issueHtml = issues.length
      ? `<h3>점검</h3><ul>${issues.map((iss) => `<li>${escapeHtml(iss.text)}</li>`).join('')}</ul>`
      : '<p>급격한 전환·단조 구간 경고 없음.</p>'
    const bodyHtml =
      `<p><strong>톤 흐름:</strong> ${swatches}</p>` +
      `<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>#</th><th>톤</th><th>장면</th><th>메모</th></tr></thead><tbody>${rows}</tbody></table>` +
      issueHtml

    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구상',
      title: '톤 변화 지도',
      bodyHtml,
      synopsis: `${scenes.length}개 장면 · 톤 ${distinctTones}종 · 점검 ${issues.length}건`,
      icon: '🎨',
    })
    if (!mounted.current) return
    setNote(id ? '✓ 프로젝트 자료 「구상」 폴더에 톤 변화 지도를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [scenes, distinctTones, issues])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }

  const selectedScene = selected ? scenes.find((s) => s.id === selected) || null : null
  const selectedIdx = selected ? scenes.findIndex((s) => s.id === selected) : -1

  return (
    <div
      style={dropHover ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4, background: 'color-mix(in srgb, var(--accent) 6%, transparent)' } : wrap}
      onDragOver={onFileDragOver}
      onDragEnter={onFileDragEnter}
      onDragLeave={onFileDragLeave}
      onDrop={onFileDrop}
    >
      {dropToast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span>{dropToast}</span>
          <button className="minibtn" onClick={() => setDropToast('')} aria-label="알림 닫기">✕</button>
        </div>
      )}
      {dropHover && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent) 4%, transparent)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--panel)', border: '1px dashed var(--accent)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
            <Emoji e="🎨" /> 여기에 놓아 새 장면으로 추가
          </div>
        </div>
      )}

      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={() => setEditing('new')} title="새 장면 추가">+ 장면 추가</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{scenes.length}개 장면 · 톤 {distinctTones}종</span>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowIssues((v) => !v)} title="점검 패널 토글" aria-pressed={showIssues}>
          {issues.length > 0 ? `⚠ 점검 ${issues.length}` : '✓ 점검'} {showIssues ? '▾' : '▸'}
        </button>
        <button className="minibtn" onClick={copyAll} title="전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={exportFile} title="텍스트 파일로 내보내기">⬇ 내보내기</button>
      </div>

      {/* 색 띠 타임라인 — 직접 그리기(라이브러리 없이) */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <ToneRibbon
          scenes={scenes}
          jumps={jumps}
          monoIdx={monoIdx}
          selected={selected}
          onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          onCycle={cycleTone}
        />
        {/* 강도 곡선(스파크라인) */}
        {scenes.length >= 2 && (
          <IntensitySpark scenes={scenes} jumps={jumps} />
        )}
        {/* 범례 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
          {dist.map((d) => (
            <span key={d.key} style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, border: '1px solid #00000022', display: 'inline-block' }} aria-hidden />
              <Emoji e={d.icon} /> {d.label} <strong style={{ color: 'var(--text)' }}>{d.n}</strong>
            </span>
          ))}
          {!dist.length && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>아직 톤이 지정된 장면이 없어요.</span>}
        </div>
      </div>

      {/* 선택된 장면의 빠른 톤 변경 */}
      {selectedScene && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong>{selectedIdx + 1}. {selectedScene.title}</strong>
            <span style={{ color: 'var(--muted)' }}>의 톤을 고르세요</span>
            <div style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setSelected(null)} aria-label="선택 해제">✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {TONES.map((t) => (
              <button
                key={t.key}
                className="minibtn"
                onClick={() => setTone(selectedScene.id, t.key)}
                aria-pressed={selectedScene.tone === t.key}
                title={t.label}
                style={{
                  padding: '4px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4,
                  borderColor: selectedScene.tone === t.key ? t.color : 'var(--border)',
                  background: selectedScene.tone === t.key ? `color-mix(in srgb, ${t.color} 22%, var(--paper))` : 'var(--paper)',
                  fontWeight: selectedScene.tone === t.key ? 700 : 400,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: t.color, display: 'inline-block', border: '1px solid #00000022' }} aria-hidden />
                <Emoji e={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 점검 패널 */}
      {showIssues && scenes.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, maxHeight: 132, overflowY: 'auto' }}>
          {issues.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ok)' }}>✓ 급격한 톤 전환·단조로운 구간 경고가 없습니다. 흐름이 안정적이에요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {issues.map((iss, k) => {
                const c = iss.kind === 'monotone' ? 'var(--muted)' : 'var(--warn)'
                const icon = iss.kind === 'jump' ? '⚡' : iss.kind === 'flip' ? '🔁' : '🟰'
                const targetId = scenes[iss.at]?.id
                return (
                  <button
                    key={k}
                    className="linkbtn"
                    onClick={() => targetId && setSelected(targetId)}
                    style={{ textAlign: 'left', fontSize: 12, color: c, display: 'flex', gap: 6, alignItems: 'baseline', padding: '2px 0', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="해당 장면 선택"
                  >
                    <span aria-hidden><Emoji e={icon} /></span><span>{iss.text}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 장면 목록(드래그 재정렬) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scenes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: 24 }}>
            <div style={{ fontSize: 38 }} aria-hidden><Emoji e="🎨" /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>아직 장면이 없어요</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
              「+ 장면 추가」로 장면을 만들고 톤을 지정하면<br />위쪽에 작품 전체 톤 흐름이 색 띠로 그려집니다.<br />왼쪽 파일을 끌어다 놓아 장면으로 만들 수도 있어요.
            </div>
            <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setEditing('new')}>+ 첫 장면 추가</button>
          </div>
        ) : (
          scenes.map((s, idx) => {
            const t = toneMeta(s.tone)
            const isOver = overId === s.id && dragId !== s.id
            const isDragging = dragId === s.id
            return (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  setDragId(s.id)
                  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/tone-scene', s.id) } catch { /* noop */ }
                }}
                onDragEnd={() => { setDragId(null); setOverId(null) }}
                onDragOver={(e) => {
                  // 내부 카드 재정렬 드래그만 허용(바인더 파일 드래그는 컨테이너가 처리)
                  if (dragId && !isItemDrag(e)) { e.preventDefault(); e.stopPropagation(); if (overId !== s.id) setOverId(s.id) }
                }}
                onDrop={(e) => {
                  if (dragId && !isItemDrag(e)) {
                    e.preventDefault(); e.stopPropagation()
                    reorder(dragId, s.id)
                    setDragId(null); setOverId(null)
                  }
                }}
                style={{
                  background: isDragging ? 'color-mix(in srgb, var(--accent) 8%, var(--paper))' : 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderTop: isOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderLeft: `4px solid ${t.color}`,
                  borderRadius: 10, padding: '9px 11px',
                  opacity: isDragging ? 0.55 : 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: 'grab',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                  <span aria-hidden style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 14 }} title="끌어서 순서 변경">⋮⋮</span>
                  <button
                    className="minibtn"
                    onClick={() => cycleTone(s.id)}
                    title="톤 전환(클릭하여 다음 톤)"
                    style={{ padding: '2px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: t.color, color: 'var(--text)', flexShrink: 0 }}
                  >
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: t.color, display: 'inline-block', border: '1px solid #00000022' }} aria-hidden />
                    <Emoji e={t.icon} /> {t.label}
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{s.title}</span>
                  {jumps.has(idx) && <span title="앞 장면과 톤 급변" style={{ fontSize: 11, color: 'var(--warn)', flexShrink: 0 }}><Emoji e="⚡" />급변</span>}
                  {monoIdx.has(idx) && <span title="단조로운 연속 구간" style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e="🟰" />단조</span>}
                </div>
                {s.note && (
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 5, marginLeft: 28, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.note}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, marginLeft: 28 }}>
                  <button className="minibtn" style={mini} title="위로 이동" disabled={idx === 0} onClick={() => move(s.id, -1)}>▲</button>
                  <button className="minibtn" style={mini} title="아래로 이동" disabled={idx === scenes.length - 1} onClick={() => move(s.id, 1)}>▼</button>
                  <button className="minibtn" style={mini} title="톤 빠르게 고르기" onClick={() => setSelected(s.id)}><Emoji e="🎨" /> 톤</button>
                  <div style={{ flex: 1 }} />
                  <button className="minibtn" style={mini} title="편집" onClick={() => setEditing(s.id)}><Emoji e="✏️" /> 편집</button>
                  <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(s.id)}><Emoji e="🗑️" /></button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={exportToProject}
          disabled={!hasProjectBridge() || scenes.length === 0}
          title={hasProjectBridge() ? '톤 변화 지도를 프로젝트 자료 「구상」 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {/* 하단 안내 */}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        색 띠의 칸을 클릭하면 톤을 바꿀 수 있어요. 카드를 끌어 순서를 바꾸세요. <Emoji e="⚡" />는 급격한 전환, <Emoji e="🟰" />는 단조 구간입니다.
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

      {/* 삭제 확인 */}
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

// ── 색 띠 타임라인 ─────────────────────────────────────────────────────────────
function ToneRibbon({
  scenes, jumps, monoIdx, selected, onSelect, onCycle,
}: {
  scenes: Scene[]
  jumps: Set<number>
  monoIdx: Set<number>
  selected: string | null
  onSelect: (id: string) => void
  onCycle: (id: string) => void
}) {
  if (!scenes.length) {
    return (
      <div style={{ height: 46, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
        장면을 추가하면 톤 흐름 색 띠가 여기에 그려집니다.
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 5 }}>톤 흐름 (클릭: 선택 · 더블클릭: 다음 톤)</div>
      <div style={{ display: 'flex', height: 46, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {scenes.map((s, i) => {
          const t = toneMeta(s.tone)
          const isSel = selected === s.id
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => onCycle(s.id)}
              title={`${i + 1}. ${s.title} — ${t.label}${jumps.has(i) ? ' · ⚡급변' : ''}${monoIdx.has(i) ? ' · 🟰단조' : ''}`}
              style={{
                flex: 1, minWidth: 6, background: t.color, position: 'relative', cursor: 'pointer',
                borderLeft: jumps.has(i) ? '2px solid var(--text)' : i > 0 ? '1px solid rgba(255,255,255,0.25)' : 'none',
                boxShadow: isSel ? 'inset 0 0 0 2px var(--text)' : 'none',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2,
                transition: 'box-shadow .12s ease',
              }}
            >
              {/* 급변 마커 */}
              {jumps.has(i) && (
                <span style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', fontSize: 9, lineHeight: 1 }} aria-hidden><Emoji e="⚡" /></span>
              )}
              {/* 칸이 충분히 넓을 때만 아이콘 표시 */}
              {scenes.length <= 18 && (
                <span style={{ fontSize: 11, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }} aria-hidden><Emoji e={t.icon} /></span>
              )}
            </div>
          )
        })}
      </div>
      {/* 번호 눈금 */}
      <div style={{ display: 'flex', marginTop: 3 }}>
        {scenes.map((s, i) => (
          <div key={s.id} style={{ flex: 1, minWidth: 6, textAlign: 'center', fontSize: 9, color: 'var(--muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {scenes.length <= 24 ? i + 1 : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 강도 스파크라인(직접 그리는 SVG 폴리라인 대신 div 막대로 구현) ──────────────
function IntensitySpark({ scenes, jumps }: { scenes: Scene[]; jumps: Set<number> }) {
  const H = 40
  const pts = scenes.map((s) => toneMeta(s.tone).intensity)
  const max = 100
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 3 }}>정서 강도 (낮음↘ 격렬↗)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 4px', boxSizing: 'border-box' }}>
        {pts.map((v, i) => {
          const t = toneMeta(scenes[i].tone)
          const h = Math.max(3, Math.round((v / max) * (H - 8)))
          return (
            <div
              key={scenes[i].id}
              title={`${i + 1}. ${scenes[i].title} — 강도 ${v}`}
              style={{ flex: 1, minWidth: 2, height: h, background: t.color, borderRadius: 2, outline: jumps.has(i) ? '1.5px solid var(--text)' : 'none', outlineOffset: -1 }}
            />
          )
        })}
      </div>
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

// ── 장면 편집기 ───────────────────────────────────────────────────────────────
function SceneEditor({
  scene, isNew, onCancel, onSave,
}: {
  scene: Scene | null
  isNew: boolean
  onCancel: () => void
  onSave: (data: { title: string; tone: string; note: string }) => void
}) {
  const [title, setTitle] = useState(scene?.title || '')
  const [tone, setTone] = useState(scene?.tone || 'calm')
  const [noteText, setNoteText] = useState(scene?.note || '')
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const submit = () => onSave({ title, tone, note: noteText })

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 460, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {isNew ? <><Emoji e="🎨" /> 새 장면</> : <><Emoji e="🎨" /> 장면 편집</>}
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
              placeholder="예: 3장 · 추격"
              maxLength={120}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>톤</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TONES.map((t) => (
                <button
                  key={t.key}
                  className="minibtn"
                  onClick={() => setTone(t.key)}
                  aria-pressed={tone === t.key}
                  title={`강도 ${t.intensity} · 분위기 ${t.valence > 0 ? '+' : ''}${t.valence}`}
                  style={{
                    flex: '1 1 88px', padding: '8px 6px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    borderColor: tone === t.key ? t.color : 'var(--border)',
                    background: tone === t.key ? `color-mix(in srgb, ${t.color} 20%, var(--paper))` : 'var(--paper)',
                    fontWeight: tone === t.key ? 700 : 400,
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, display: 'inline-block', border: '1px solid #00000022' }} aria-hidden />
                  <Emoji e={t.icon} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={label}>메모(선택)</label>
            <textarea
              style={{ ...inputBase, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="이 장면의 분위기·전환 의도를 메모해 두세요"
              maxLength={1000}
            />
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
