// 복선 장부(Foreshadow Ledger) — 설정(심기)↔회수 쌍을 복식부기처럼 추적한다.
//  · 각 복선: 설명 / 무게(체호프의 총 강도) / 심은 지점(장·순번) / 회수 지점 / 연관 인물·장소 / 메모
//  · 회수율 대시보드: 전체/회수/미회수/포기, 무게가중 회수율, 무게별 미회수 경고(강한 총일수록 위험)
//  · "거리" 점검: 심은 뒤 너무 멀리 회수되거나(독자 망각) 너무 가까이(긴장 부족) 회수된 항목 표시
//  · 타임라인 막대: 각 복선이 심긴→회수된 구간을 한 줄로 시각화(미회수는 열린 막대)
//  · 라이브러리(인물·장소) 수용/드롭/페이로드 수용, 스니펫·프로젝트 메모로 내보내기, 관련 도구 열기
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:foreshadow-ledger' 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary, useLibraryList,
  getDragItem, isItemDrag,
  openToolLinked,
  type SharedCharacter, type SharedPlace,
} from './linkbus'

export const meta = {
  id: 'foreshadow-ledger',
  name: '복선 장부',
  icon: '🪝',
  group: '플롯',
  intro: '심은 복선과 회수를 복식부기처럼 추적 — 미회수(체호프의 총) 경고, 회수율 대시보드, 거리·타임라인 점검',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:foreshadow-ledger'

type Status = 'open' | 'paid' | 'dropped' // 미회수 / 회수됨 / 의도적 포기(열린 결말)
type Weight = 1 | 2 | 3 // 1 가벼운 단서 / 2 일반 복선 / 3 체호프의 총(반드시 회수)

interface Entry {
  id: string
  desc: string        // 무엇을 심었나
  weight: Weight      // 회수 의무 강도
  setupAt: number     // 심은 지점(타임라인 위치, 정수). 0=미입력
  payoffAt: number    // 회수 지점. 0=미입력
  setupLabel: string  // 표시용(예: "1장 3장면", "p.12")
  payoffLabel: string
  status: Status
  tags: string[]      // 연관 인물/장소 이름
  note: string
}
interface SaveShape { entries: Entry[]; title: string; span: number }

const WEIGHT_LABEL: Record<Weight, string> = { 1: '단서', 2: '복선', 3: '체호프의 총' }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function str(v: unknown): string { return typeof v === 'string' ? v : '' }
function num(v: unknown): number { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : 0 }
function isStatus(s: unknown): s is Status { return s === 'open' || s === 'paid' || s === 'dropped' }
function asWeight(v: unknown): Weight { const n = num(v); return n === 1 || n === 3 ? n : 2 }
function clampInt(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, Math.round(n))) }

function load(): SaveShape {
  const empty: SaveShape = { entries: [], title: '', span: 100 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const entries: Entry[] = Array.isArray(p.entries)
      ? p.entries
          .filter((r: unknown) => r && typeof r === 'object' && typeof (r as Entry).desc === 'string')
          .map((r: Record<string, unknown>) => ({
            id: String(r.id || newId()),
            desc: str(r.desc),
            weight: asWeight(r.weight),
            setupAt: clampInt(num(r.setupAt), 0, 100000),
            payoffAt: clampInt(num(r.payoffAt), 0, 100000),
            setupLabel: str(r.setupLabel),
            payoffLabel: str(r.payoffLabel),
            status: isStatus(r.status) ? r.status : 'open',
            tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map((t) => str(t)).filter(Boolean) : [],
            note: str(r.note),
          }))
      : []
    return { entries, title: str(p.title), span: clampInt(num(p.span) || 100, 10, 100000) }
  } catch { return empty }
}

export default function ForeshadowLedger({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<SaveShape>(load())
  const [entries, setEntries] = useState<Entry[]>(init.current.entries)
  const [title, setTitle] = useState<string>(init.current.title)
  const [span, setSpan] = useState<number>(init.current.span)

  // 새 복선 입력 폼
  const [dDesc, setDDesc] = useState('')
  const [dWeight, setDWeight] = useState<Weight>(2)
  const [dSetupAt, setDSetupAt] = useState('')
  const [dSetupLabel, setDSetupLabel] = useState('')

  // 편집 상태
  const [editId, setEditId] = useState<string | null>(null)
  const [eDesc, setEDesc] = useState('')
  const [eWeight, setEWeight] = useState<Weight>(2)
  const [eSetupAt, setESetupAt] = useState('')
  const [eSetupLabel, setESetupLabel] = useState('')
  const [ePayoffAt, setEPayoffAt] = useState('')
  const [ePayoffLabel, setEPayoffLabel] = useState('')
  const [eNote, setENote] = useState('')
  const [eTags, setETags] = useState<string[]>([])

  const [filter, setFilter] = useState<'all' | Status>('all')
  const [sortBy, setSortBy] = useState<'order' | 'setup' | 'weight'>('order')
  const [dragOver, setDragOver] = useState(false)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const characters = useLibraryList('characters') as SharedCharacter[]
  const places = useLibraryList('places') as SharedPlace[]
  const tagOptions = useMemo(() => {
    const names = new Set<string>()
    characters.forEach((c) => { if (c.name?.trim()) names.add(c.name.trim()) })
    places.forEach((p) => { if (p.name?.trim()) names.add(p.name.trim()) })
    return Array.from(names)
  }, [characters, places])

  // payload 로 초기 복선 받기(연계로 열렸을 때) — 마운트 1회
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const d = str(p.desc) || str(p.text)
    if (!d.trim()) return
    setEntries((prev) => [{
      id: newId(), desc: d.trim().slice(0, 300), weight: asWeight(p.weight),
      setupAt: clampInt(num(p.setupAt), 0, 100000), payoffAt: 0,
      setupLabel: str(p.setupLabel), payoffLabel: '', status: 'open',
      tags: Array.isArray(p.tags) ? (p.tags as unknown[]).map((t) => str(t)).filter(Boolean) : [],
      note: '',
    }, ...prev])
    setFlash('연계로 복선 1건을 받았어요.')
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ entries, title, span } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침 시 내용이 사라질 수 있어요.') }
  }, [entries, title, span])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
    return () => clearTimeout(t)
  }, [flash])

  // ── 파생: 통계/대시보드 ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = entries.length
    let paid = 0, open = 0, dropped = 0
    let wTotal = 0, wPaid = 0
    let gunsOpen = 0 // 무게3 미회수(가장 위험)
    entries.forEach((e) => {
      wTotal += e.weight
      if (e.status === 'paid') { paid++; wPaid += e.weight }
      else if (e.status === 'dropped') dropped++
      else { open++; if (e.weight === 3) gunsOpen++ }
    })
    const rate = total ? Math.round((paid / total) * 100) : 0
    const wRate = wTotal ? Math.round((wPaid / wTotal) * 100) : 0
    // 의무 회수율: 포기는 분모에서 제외(의도적 결정으로 간주)
    const obligated = total - dropped
    const oRate = obligated ? Math.round((paid / obligated) * 100) : 0
    return { total, paid, open, dropped, rate, wRate, oRate, gunsOpen }
  }, [entries])

  // 거리 점검: 심은 위치·회수 위치가 모두 입력된 회수 항목에 대해 간격을 평가
  const distanceFlags = useMemo(() => {
    const out: Record<string, 'tooClose' | 'tooFar' | 'reversed'> = {}
    const maxSpan = Math.max(span, 1)
    entries.forEach((e) => {
      if (e.status !== 'paid' || !e.setupAt || !e.payoffAt) return
      if (e.payoffAt < e.setupAt) { out[e.id] = 'reversed'; return }
      const gap = (e.payoffAt - e.setupAt) / maxSpan // 0~1
      // 무게가 클수록 멀리 회수돼도 됨(중요 복선은 오래 묻어둠). 가벼운 단서는 너무 멀면 잊힘.
      const farLimit = e.weight === 3 ? 0.95 : e.weight === 2 ? 0.7 : 0.45
      const closeLimit = e.weight === 3 ? 0.08 : 0.03
      if (gap > farLimit) out[e.id] = 'tooFar'
      else if (gap < closeLimit) out[e.id] = 'tooClose'
    })
    return out
  }, [entries, span])

  // 정렬/필터된 표시 목록
  const shown = useMemo(() => {
    let arr = entries.slice()
    if (filter !== 'all') arr = arr.filter((e) => e.status === filter)
    if (sortBy === 'setup') arr.sort((a, b) => (a.setupAt || 1e9) - (b.setupAt || 1e9))
    else if (sortBy === 'weight') arr.sort((a, b) => b.weight - a.weight)
    return arr
  }, [entries, filter, sortBy])

  // ── CRUD ─────────────────────────────────────────────────────
  const add = () => {
    const d = dDesc.trim()
    if (!d) return
    const at = dSetupAt.trim() ? clampInt(num(dSetupAt), 0, 100000) : 0
    if (at > span) setSpan(at)
    setEntries((prev) => [...prev, {
      id: newId(), desc: d, weight: dWeight,
      setupAt: at, payoffAt: 0,
      setupLabel: dSetupLabel.trim(), payoffLabel: '',
      status: 'open', tags: [], note: '',
    }])
    setDDesc(''); setDSetupAt(''); setDSetupLabel('')
  }
  const onAddKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add() } }

  const remove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (editId === id) setEditId(null)
  }

  const cycleStatus = (e: Entry) => {
    const next: Status = e.status === 'open' ? 'paid' : e.status === 'paid' ? 'dropped' : 'open'
    if (next === 'paid' && !e.payoffAt && !e.payoffLabel.trim()) { startEdit(e); setNote('회수 지점을 입력하면 거리·타임라인 분석이 정확해져요.'); return }
    setEntries((prev) => prev.map((x) => x.id === e.id ? { ...x, status: next } : x))
  }

  const startEdit = (e: Entry) => {
    setEditId(e.id)
    setEDesc(e.desc); setEWeight(e.weight)
    setESetupAt(e.setupAt ? String(e.setupAt) : ''); setESetupLabel(e.setupLabel)
    setEPayoffAt(e.payoffAt ? String(e.payoffAt) : ''); setEPayoffLabel(e.payoffLabel)
    setENote(e.note); setETags(e.tags.slice())
    setNote('')
  }
  const cancelEdit = () => setEditId(null)
  const commitEdit = () => {
    if (!editId) return
    const d = eDesc.trim()
    if (!d) { remove(editId); setEditId(null); return }
    const sAt = eSetupAt.trim() ? clampInt(num(eSetupAt), 0, 100000) : 0
    const pAt = ePayoffAt.trim() ? clampInt(num(ePayoffAt), 0, 100000) : 0
    if (Math.max(sAt, pAt) > span) setSpan(Math.max(sAt, pAt))
    setEntries((prev) => prev.map((e) => e.id === editId ? {
      ...e, desc: d, weight: eWeight,
      setupAt: sAt, payoffAt: pAt,
      setupLabel: eSetupLabel.trim(), payoffLabel: ePayoffLabel.trim(),
      note: eNote.trim(), tags: eTags,
      // 회수 지점이 채워지면 자동 회수됨(이미 포기 상태가 아니면)
      status: e.status === 'dropped' ? 'dropped' : (pAt || ePayoffLabel.trim()) ? 'paid' : 'open',
    } : e))
    setEditId(null)
  }
  const toggleEditTag = (name: string) => {
    setETags((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name])
  }

  const move = (id: string, dir: -1 | 1) => {
    setEntries((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const clearAll = () => { if (entries.length && confirmClear()) setEntries([]) }
  const confirmClear = () => { try { return window.confirm('모든 복선을 삭제할까요?') } catch { return true } }

  // ── 드롭(좌측 바인더 문서) ────────────────────────────────────
  const onDrop = (ev: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(ev)
    if (!item) return
    ev.preventDefault()
    const t = (item.text || '').trim()
    const desc = (item.title || '문서').trim()
    setEntries((prev) => [...prev, {
      id: newId(), desc: desc.slice(0, 300), weight: 2,
      setupAt: 0, payoffAt: 0, setupLabel: '', payoffLabel: '',
      status: 'open', tags: [], note: t ? t.slice(0, 200) : '',
    }])
    setFlash('바인더 문서를 복선 후보로 추가했어요. 무게·지점을 채워주세요.')
  }
  const onDragOver = (ev: React.DragEvent) => { if (isItemDrag(ev)) { ev.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ── 내보내기 ──────────────────────────────────────────────────
  const statusKo = (s: Status) => s === 'paid' ? '회수됨' : s === 'dropped' ? '포기(열린결말)' : '미회수'
  const buildText = (): string => {
    const L: string[] = []
    L.push(title.trim() ? `[복선 장부] ${title.trim()}` : '[복선 장부]')
    L.push(`전체 ${stats.total} · 회수 ${stats.paid} · 미회수 ${stats.open} · 포기 ${stats.dropped}`)
    L.push(`회수율 ${stats.rate}% · 무게가중 ${stats.wRate}% · 의무 ${stats.oRate}%`)
    L.push('')
    entries.forEach((e, i) => {
      L.push(`${i + 1}. [${statusKo(e.status)}] (${WEIGHT_LABEL[e.weight]}) ${e.desc}`)
      L.push(`   심기: ${e.setupLabel || (e.setupAt ? '#' + e.setupAt : '(미기재)')}  ->  회수: ${e.payoffLabel || (e.payoffAt ? '#' + e.payoffAt : '(미회수)')}`)
      if (e.tags.length) L.push(`   연관: ${e.tags.join(', ')}`)
      if (e.note.trim()) L.push(`   메모: ${e.note.trim()}`)
      const f = distanceFlags[e.id]
      if (f) L.push(`   ! ${f === 'tooFar' ? '회수가 너무 멀어 독자가 잊을 수 있음' : f === 'tooClose' ? '회수가 너무 가까워 긴장이 약함' : '회수가 심기보다 앞섬(순서 확인)'}`)
    })
    if (stats.gunsOpen > 0) { L.push(''); L.push(`! 미회수 체호프의 총 ${stats.gunsOpen}건 — 반드시 회수하거나 의도적 포기로 표시하세요.`) }
    return L.join('\n')
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildBodyHtml = (): string => {
    const P: string[] = []
    if (title.trim()) P.push(`<p><em>${esc(title.trim())}</em></p>`)
    P.push(`<p>전체 ${stats.total} · 회수 ${stats.paid} · 미회수 ${stats.open} · 포기 ${stats.dropped} · 회수율 ${stats.rate}% (의무 ${stats.oRate}%)</p>`)
    if (entries.length === 0) { P.push('<p>(등록된 복선 없음)</p>'); return P.join('') }
    P.push('<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>상태</th><th>무게</th><th>복선</th><th>심기</th><th>회수</th><th>연관</th><th>메모</th></tr></thead><tbody>')
    entries.forEach((e) => {
      P.push(`<tr><td>${esc(statusKo(e.status))}</td><td>${esc(WEIGHT_LABEL[e.weight])}</td><td>${esc(e.desc)}</td><td>${esc(e.setupLabel || (e.setupAt ? '#' + e.setupAt : '-'))}</td><td>${esc(e.payoffLabel || (e.payoffAt ? '#' + e.payoffAt : '-'))}</td><td>${esc(e.tags.join(', ') || '-')}</td><td>${esc(e.note.trim() || '-')}</td></tr>`)
    })
    P.push('</tbody></table>')
    if (stats.gunsOpen > 0) P.push(`<p>! 미회수 체호프의 총 ${stats.gunsOpen}건 — 회수 또는 의도적 포기로 표시 권장.</p>`)
    return P.join('')
  }

  const copy = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setFlash('전체 장부를 클립보드에 복사했어요.')
    } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: title.trim() ? `복선 장부 — ${title.trim()}` : '복선 장부',
      bodyHtml: buildBodyHtml(),
      synopsis: `회수율 ${stats.rate}% · 미회수 ${stats.open}건 (체호프의 총 ${stats.gunsOpen})`,
      meta: { 복선수: String(stats.total), 회수: String(stats.paid), 미회수: String(stats.open), 포기: String(stats.dropped), 회수율: `${stats.rate}%`, 의무회수율: `${stats.oRate}%` },
    })
    setFlash(id ? '프로젝트 자료(플롯)에 복선 장부를 추가했어요.' : '프로젝트에 연결되지 않았습니다.')
  }

  const toStash = () => {
    if (!hasStash()) { setNote('수집함이 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'memo', label: title.trim() ? `복선 장부 — ${title.trim()}` : '복선 장부', text: buildText() })
    setFlash('수집함에 장부 요약을 담았어요.')
  }

  // 단건 복선 -> 스니펫 라이브러리(다른 도구가 활용)
  const entryToSnippet = (e: Entry) => {
    const line = `[복선/${WEIGHT_LABEL[e.weight]}/${statusKo(e.status)}] ${e.desc} (심기 ${e.setupLabel || e.setupAt || '?'} -> 회수 ${e.payoffLabel || e.payoffAt || '미회수'})`
    addToLibrary('snippets', { text: line, source: '복선 장부', tags: ['복선', WEIGHT_LABEL[e.weight], ...e.tags] })
    setFlash('스니펫 라이브러리에 복선을 저장했어요.')
  }

  // 관련 도구 열기 — 단건 복선을 설정·회수 추적기/장면 목록으로
  const openInSetupPayoff = (e: Entry) => {
    openToolLinked('setup-payoff', { desc: e.desc, setupAt: e.setupLabel || (e.setupAt ? '#' + e.setupAt : '') })
    setFlash('설정·회수 추적기를 이 복선과 함께 열었어요.')
  }
  const openSceneList = () => openToolLinked('scene-list', {})

  // 미회수 강한 복선 한 건으로 점프(가이드)
  const focusFirstGun = () => {
    const g = entries.find((e) => e.status === 'open' && e.weight === 3)
    if (g) { startEdit(g); setFilter('open'); setFlash('가장 위험한 미회수 복선을 편집기에 열었어요.') }
  }

  // ── 스타일 ────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const smallInput: React.CSSProperties = { ...input, fontSize: 13, padding: '7px 9px' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '22px 8px' }

  const chip = (border: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
    padding: '4px 10px', borderRadius: 999, background: 'var(--chrome-2)', border: `1px solid ${border}`, color: 'var(--text)',
  })
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: '4px 11px', fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--text)',
  })
  const weightBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer', flex: 1,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--text)',
  })
  const statusColor = (s: Status) => s === 'paid' ? 'var(--ok)' : s === 'dropped' ? 'var(--muted)' : 'var(--warn)'
  const statusBadge = (s: Status): React.CSSProperties => ({
    flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 7, padding: '3px 8px',
    background: statusColor(s), cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
  })
  const weightDot = (w: Weight): React.CSSProperties => ({
    flexShrink: 0, fontSize: 10.5, fontWeight: 700, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap',
    background: 'var(--chrome-2)',
    border: `1px solid ${w === 3 ? 'var(--warn)' : w === 2 ? 'var(--accent)' : 'var(--border)'}`,
    color: w === 3 ? 'var(--warn)' : 'var(--text)',
  })

  // 회수율 게이지 막대
  const Gauge = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
    <div style={{ flex: 1, minWidth: 110 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
      </div>
    </div>
  )

  // 타임라인 한 줄(심기→회수 구간)
  const Track = ({ e }: { e: Entry }) => {
    const maxSpan = Math.max(span, 1)
    const s = e.setupAt ? clampInt((e.setupAt / maxSpan) * 100, 0, 100) : null
    const p = e.payoffAt ? clampInt((e.payoffAt / maxSpan) * 100, 0, 100) : null
    return (
      <div style={{ position: 'relative', height: 10, borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginTop: 6 }}>
        {s !== null && p !== null && (
          <div style={{ position: 'absolute', left: `${Math.min(s, p)}%`, width: `${Math.max(Math.abs(p - s), 1.5)}%`, top: 1, bottom: 1, borderRadius: 999, background: statusColor(e.status), opacity: 0.45 }} />
        )}
        {s !== null && p === null && (
          <div style={{ position: 'absolute', left: `${s}%`, right: 0, top: 1, bottom: 1, borderRadius: 999, background: 'var(--warn)', opacity: 0.18 }} />
        )}
        {s !== null && (
          <div title="심기" style={{ position: 'absolute', left: `calc(${s}% - 4px)`, top: -1, width: 8, height: 12, borderRadius: 3, background: 'var(--accent)' }} />
        )}
        {p !== null && (
          <div title="회수" style={{ position: 'absolute', left: `calc(${p}% - 4px)`, top: -1, width: 8, height: 12, borderRadius: 3, background: statusColor(e.status) }} />
        )}
      </div>
    )
  }

  const flagText = (f?: 'tooClose' | 'tooFar' | 'reversed') =>
    f === 'tooFar' ? '회수가 너무 멀어요(독자 망각 위험)' : f === 'tooClose' ? '회수가 너무 가까워요(긴장 약함)' : f === 'reversed' ? '회수가 심기보다 앞섭니다' : ''

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }} aria-hidden>{meta.icon}</span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목 (선택)" maxLength={80} aria-label="작품 제목" />
        <button className="minibtn" onClick={copy} title="전체 장부 복사">복사</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {flash && <div style={{ fontSize: 11.5, color: 'var(--ok)', padding: '6px 14px 0' }}>{flash}</div>}

      <div
        style={{ ...body, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -6 }}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      >
        {/* 안내 */}
        <div style={hint}>
          <strong style={{ color: 'var(--text)' }}>복선 장부</strong> — 심은 복선과 회수를 복식부기처럼 짝지어 관리합니다.
          무게가 높은 <strong style={{ color: 'var(--warn)' }}>체호프의 총</strong>은 반드시 회수되어야 합니다.
          왼쪽 바인더의 문서를 이 창에 끌어다 놓으면 복선 후보로 담깁니다.
        </div>

        {/* 대시보드 */}
        <div style={panel}>
          <div style={sectionTitle}>회수율 대시보드</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <span style={chip('var(--border)')}>전체 {stats.total}</span>
            <span style={chip('var(--ok)')}>회수 {stats.paid}</span>
            <span style={chip('var(--warn)')}>미회수 {stats.open}</span>
            <span style={chip('var(--border)')}>포기 {stats.dropped}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Gauge label="단순 회수율" pct={stats.rate} color="var(--ok)" />
            <Gauge label="무게가중 회수율" pct={stats.wRate} color="var(--accent)" />
            <Gauge label="의무 회수율" pct={stats.oRate} color="var(--ok)" />
          </div>
          {stats.gunsOpen > 0 && (
            <div style={{ marginTop: 10, background: 'var(--chrome-2)', border: '1px solid var(--warn)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>미회수 <strong style={{ color: 'var(--warn)' }}>체호프의 총 {stats.gunsOpen}건</strong> — 반드시 회수하거나 의도적 포기로 표시하세요.</span>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={focusFirstGun}>가장 위험한 항목 보기</button>
            </div>
          )}
        </div>

        {/* 추가 폼 */}
        <div style={panel}>
          <div style={sectionTitle}>복선 심기</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={input} value={dDesc} onChange={(e) => setDDesc(e.target.value)} onKeyDown={onAddKey} placeholder="무엇을 심었나요? (예: 서랍 속 낡은 권총)" maxLength={300} aria-label="복선 설명" />
            <div style={{ display: 'flex', gap: 6 }}>
              {([1, 2, 3] as Weight[]).map((w) => (
                <button key={w} style={weightBtn(dWeight === w)} onClick={() => setDWeight(w)} title={`무게: ${WEIGHT_LABEL[w]}`}>{WEIGHT_LABEL[w]}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ ...smallInput, minWidth: 90, flex: '0 0 90px' }} value={dSetupAt} onChange={(e) => setDSetupAt(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={onAddKey} placeholder="지점#" inputMode="numeric" aria-label="심은 지점 번호" />
              <input style={{ ...smallInput, minWidth: 120 }} value={dSetupLabel} onChange={(e) => setDSetupLabel(e.target.value)} onKeyDown={onAddKey} placeholder="심은 위치 표시 (예: 1장 3장면)" maxLength={120} aria-label="심은 위치 표시" />
              <button className="btn-primary" onClick={add} disabled={!dDesc.trim()} style={{ flexShrink: 0 }}>추가</button>
            </div>
            <div style={hint}>지점#은 타임라인 위치(정수). 작품 전체 길이는 현재 <strong style={{ color: 'var(--text)' }}>{span}</strong>으로 설정됨.</div>
          </div>
        </div>

        {/* 필터/정렬 + 전체 길이 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>보기</span>
          <button style={segBtn(filter === 'all')} onClick={() => setFilter('all')}>전체</button>
          <button style={segBtn(filter === 'open')} onClick={() => setFilter('open')}>미회수</button>
          <button style={segBtn(filter === 'paid')} onClick={() => setFilter('paid')}>회수</button>
          <button style={segBtn(filter === 'dropped')} onClick={() => setFilter('dropped')}>포기</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>정렬</span>
          <button style={segBtn(sortBy === 'order')} onClick={() => setSortBy('order')}>입력순</button>
          <button style={segBtn(sortBy === 'setup')} onClick={() => setSortBy('setup')}>지점순</button>
          <button style={segBtn(sortBy === 'weight')} onClick={() => setSortBy('weight')}>무게순</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>작품 길이(지점 범위)</span>
          <input style={{ ...smallInput, maxWidth: 110 }} value={String(span)} onChange={(e) => setSpan(clampInt(num(e.target.value.replace(/[^0-9]/g, '')) || 10, 10, 100000))} inputMode="numeric" aria-label="작품 전체 길이" />
        </div>

        {/* 목록 */}
        <div style={panel}>
          {entries.length === 0 ? (
            <div style={emptyBox}>
              아직 등록된 복선이 없어요.<br />
              위에서 첫 복선을 심거나, 좌측 바인더 문서를 이 창으로 끌어다 놓으세요.<br />
              인물·장소 라이브러리가 있으면 편집 시 연관으로 태그할 수 있어요.
            </div>
          ) : shown.length === 0 ? (
            <div style={emptyBox}>이 조건에 해당하는 복선이 없어요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shown.map((e) => {
                const isEd = editId === e.id
                const realIdx = entries.findIndex((x) => x.id === e.id)
                if (isEd) {
                  return (
                    <div key={e.id} style={{ background: 'var(--chrome-2)', border: '1px solid var(--accent)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input style={input} value={eDesc} onChange={(ev) => setEDesc(ev.target.value)} placeholder="복선 설명" maxLength={300} autoFocus aria-label="복선 설명 수정" />
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([1, 2, 3] as Weight[]).map((w) => (
                          <button key={w} style={weightBtn(eWeight === w)} onClick={() => setEWeight(w)}>{WEIGHT_LABEL[w]}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input style={{ ...smallInput, flex: '0 0 84px' }} value={eSetupAt} onChange={(ev) => setESetupAt(ev.target.value.replace(/[^0-9]/g, ''))} placeholder="심기#" inputMode="numeric" aria-label="심은 지점" />
                        <input style={{ ...smallInput, minWidth: 130 }} value={eSetupLabel} onChange={(ev) => setESetupLabel(ev.target.value)} placeholder="심은 위치 표시" maxLength={120} aria-label="심은 위치 표시" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input style={{ ...smallInput, flex: '0 0 84px' }} value={ePayoffAt} onChange={(ev) => setEPayoffAt(ev.target.value.replace(/[^0-9]/g, ''))} placeholder="회수#" inputMode="numeric" aria-label="회수 지점" />
                        <input style={{ ...smallInput, minWidth: 130 }} value={ePayoffLabel} onChange={(ev) => setEPayoffLabel(ev.target.value)} placeholder="회수 위치 표시 (입력 시 자동 회수됨)" maxLength={120} aria-label="회수 위치 표시" />
                      </div>
                      {tagOptions.length > 0 && (
                        <div>
                          <div style={{ ...hint, marginBottom: 4 }}>연관 인물·장소(라이브러리)</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {tagOptions.map((name) => (
                              <button key={name} style={segBtn(eTags.includes(name))} onClick={() => toggleEditTag(name)}>{name}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <input style={smallInput} value={eNote} onChange={(ev) => setENote(ev.target.value)} placeholder="메모 (선택)" maxLength={300} aria-label="메모 수정" />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={commitEdit}>저장</button>
                        <button className="minibtn" onClick={cancelEdit}>취소</button>
                      </div>
                    </div>
                  )
                }
                const f = distanceFlags[e.id]
                return (
                  <div key={e.id} style={{ background: 'var(--chrome-2)', border: `1px solid ${e.status === 'open' && e.weight === 3 ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <button style={statusBadge(e.status)} onClick={() => cycleStatus(e)} title="클릭하면 상태 순환(미회수 → 회수 → 포기)" aria-label="상태 전환">{statusKo(e.status)}</button>
                      <span style={weightDot(e.weight)}>{WEIGHT_LABEL[e.weight]}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{e.desc}</span>
                    </div>
                    <Track e={e} />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                      <span>심기: <span style={{ color: 'var(--text)' }}>{e.setupLabel || (e.setupAt ? '#' + e.setupAt : '-')}</span></span>
                      <span>회수: <span style={{ color: e.payoffLabel || e.payoffAt ? 'var(--text)' : 'var(--warn)' }}>{e.payoffLabel || (e.payoffAt ? '#' + e.payoffAt : '미회수')}</span></span>
                    </div>
                    {e.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                        {e.tags.map((t) => <span key={t} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{t}</span>)}
                      </div>
                    )}
                    {e.note.trim() && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>메모 {e.note}</div>}
                    {f && <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 5 }}>점검: {flagText(f)}</div>}
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => entryToSnippet(e)} title="스니펫 라이브러리에 저장">스니펫</button>
                      <button className="minibtn" style={{ padding: '0 7px' }} onClick={() => openInSetupPayoff(e)} title="설정·회수 추적기로 열기">추적기</button>
                      <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => move(e.id, -1)} disabled={sortBy !== 'order' || realIdx === 0} title="위로" aria-label="위로">▲</button>
                      <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => move(e.id, 1)} disabled={sortBy !== 'order' || realIdx === entries.length - 1} title="아래로" aria-label="아래로">▼</button>
                      <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => startEdit(e)} title="수정" aria-label="수정">편집</button>
                      <button className="minibtn" style={{ padding: '0 6px' }} onClick={() => remove(e.id)} title="삭제" aria-label="삭제">삭제</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 동작 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 <strong style={{ color: 'var(--text)' }}>{stats.total}</strong>건 · 회수율 <strong style={{ color: 'var(--text)' }}>{stats.rate}%</strong></span>
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy}>전체 복사</button>
          <button className="minibtn" onClick={clearAll} disabled={entries.length === 0}>전체 비우기</button>
        </div>

        {/* 연동 */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '복선 장부를 프로젝트 자료(플롯)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
          <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '장부 요약을 수집함에 담기' : '수집함이 연결되어 있지 않습니다'}>수집함 담기</button>
          <button className="linkbtn" onClick={() => openInSetupPayoffAll()} title="설정·회수 추적기 열기">설정·회수 추적기</button>
          <button className="linkbtn" onClick={openSceneList} title="장면 목록 열기">장면 목록</button>
        </div>

        <div className="license-note" style={{ ...hint, marginTop: 2 }}>
          외부 이미지·텍스트를 불러오지 않으며, 입력한 내용만 이 브라우저(localStorage)에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )

  // 전체를 추적기로 — 미회수 1순위 복선을 시드로
  function openInSetupPayoffAll() {
    const first = entries.find((e) => e.status === 'open') || entries[0]
    openToolLinked('setup-payoff', first ? { desc: first.desc, setupAt: first.setupLabel || (first.setupAt ? '#' + first.setupAt : '') } : {})
  }
}
