// 인물 등장 분량 보드 — 인물 × 장면 격자에서 각 장면에 등장하는 인물을 체크하면
//   인물별 등장 씬 수/비율을 막대로 시각화해 앙상블 분량 균형(주연 편중·조연 실종)을 점검한다.
//   추가로: 장면별 등장 인원 수 막대, 동시 등장(페어) 빈도, 첫/마지막 등장·최장 부재 구간 진단,
//   집중도(상위 인물 점유율)·균형 지수를 직접 계산한다. 외부 라이브러리 없음.
// react 외 import 는 './linkbus' 만. 완전 로컬. localStorage 자동 저장/복원.
// 좌측 바인더 인물/장면 파일 드롭 수용. 프로젝트에 표/리포트 문서로 추가.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, useLibraryList, Emoji } from './linkbus'

export const meta = { id: 'character-screen-time', name: '인물 등장 분량 보드', icon: '🎭', group: '구상·정리', intro: '인물×장면 격자에 등장을 체크해 인물별 분량·앙상블 균형을 막대로 점검합니다', w: 880, h: 640 }

const LS_KEY = 'sry:tool:character-screen-time'

// 프로젝트 본문(HTML) 삽입 전 필수 이스케이프(&, <, >).
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 인물 색 — 인덱스 기반 안정 팔레트(저작권 안전: 자작 색상만).
const COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8a5cd6', '#d2473b', '#2bb6c0', '#c9772b', '#5a7fd6', '#d65aa8', '#6aaf3f', '#cf9c2b', '#9b6bd6', '#46b0a0', '#d65a5a', '#3f99c9']
function colorAt(i: number): string { return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length] }

interface Char { id: string; name: string; weight: number } // weight: 비중(1=주연..) 사용자 메모용
interface Scene { id: string; title: string; cast: string[] }  // cast: 등장 인물 id 목록
interface Data { chars: Char[]; scenes: Scene[]; sort: SortKey }
type SortKey = 'count' | 'order' | 'name'

function newId(prefix: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID().slice(0, 8) } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function blankData(): Data {
  // 빈 상태에서도 바로 만질 수 있도록 작은 기본 골격을 제공.
  const a = { id: newId('c'), name: '', weight: 1 }
  const b = { id: newId('c'), name: '', weight: 2 }
  return {
    chars: [a, b],
    scenes: [{ id: newId('s'), title: '', cast: [] }, { id: newId('s'), title: '', cast: [] }, { id: newId('s'), title: '', cast: [] }],
    sort: 'count',
  }
}

function clampStr(v: unknown, n: number): string { return String(v ?? '').slice(0, n) }
function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const x = Math.round(Number(v)); if (!Number.isFinite(x)) return dflt
  return Math.max(lo, Math.min(hi, x))
}

function loadData(): Data {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return blankData()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return blankData()
    const chars: Char[] = Array.isArray(p.chars) ? p.chars.filter((c: any) => c && typeof c === 'object').map((c: any) => ({
      id: String(c.id || newId('c')), name: clampStr(c.name, 40), weight: clampInt(c.weight, 1, 9, 1),
    })) : []
    const charIds = new Set(chars.map((c) => c.id))
    const scenes: Scene[] = Array.isArray(p.scenes) ? p.scenes.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
      id: String(s.id || newId('s')), title: clampStr(s.title, 80),
      cast: Array.isArray(s.cast) ? Array.from(new Set(s.cast.map(String).filter((id: string) => charIds.has(id)))) : [],
    })) : []
    const sort: SortKey = (p.sort === 'order' || p.sort === 'name' || p.sort === 'count') ? p.sort : 'count'
    if (!chars.length && !scenes.length) return blankData()
    return { chars, scenes, sort }
  } catch {
    return blankData()
  }
}

// ===== 분석(라이브러리 없이 직접 계산) =====
interface CharStat {
  id: string; name: string; weight: number; index: number
  count: number; ratio: number           // 등장 씬 수 / 비율(전체 장면 대비)
  first: number; last: number; gapMax: number  // 첫/마지막 등장 인덱스(1-based, 0=미등장), 최장 부재 구간
}
interface Analysis {
  totalScenes: number; totalChars: number
  cellsChecked: number
  stats: CharStat[]                       // 정렬 적용된 인물 통계
  maxCount: number
  sceneCast: number[]                     // 장면별 등장 인원 수
  maxSceneCast: number
  avgCast: number
  emptyScenes: number                     // 등장 인물 0인 장면 수
  soloScenes: number                      // 1인 장면 수
  ghostChars: number                      // 한 번도 등장 안 한 인물 수
  pairs: { a: string; b: string; n: number }[] // 동시 등장 상위 페어
  topShare: number                        // 상위 인물(주연) 점유율(가장 많은 1인 / 전체 체크 수)
  top3Share: number                       // 상위 3인 점유율
  balance: number                         // 균형 지수 0~100 (1=완벽 균등). HHI 기반.
  warnings: string[]
}

function analyze(data: Data): Analysis {
  const { chars, scenes } = data
  const totalScenes = scenes.length
  const totalChars = chars.length
  const idIndex = new Map<string, number>()
  chars.forEach((c, i) => idIndex.set(c.id, i))

  // 인물별 등장 인덱스 모음
  const apperances = new Map<string, number[]>() // id -> 1-based scene indexes
  chars.forEach((c) => apperances.set(c.id, []))
  let cellsChecked = 0
  const sceneCast: number[] = []
  scenes.forEach((s, si) => {
    let n = 0
    s.cast.forEach((id) => {
      if (!apperances.has(id)) return
      apperances.get(id)!.push(si + 1)
      n++; cellsChecked++
    })
    sceneCast.push(n)
  })

  const baseStats: CharStat[] = chars.map((c, i) => {
    const ap = apperances.get(c.id) || []
    const count = ap.length
    const ratio = totalScenes ? count / totalScenes : 0
    const first = ap.length ? ap[0] : 0
    const last = ap.length ? ap[ap.length - 1] : 0
    // 최장 부재 구간: 연속 미등장 장면 길이의 최댓값(첫 등장~마지막 등장 사이만 따짐)
    let gapMax = 0
    if (ap.length >= 2) {
      for (let k = 1; k < ap.length; k++) {
        const gap = ap[k] - ap[k - 1] - 1
        if (gap > gapMax) gapMax = gap
      }
    }
    return { id: c.id, name: c.name.trim() || `(이름 없음 ${i + 1})`, weight: c.weight, index: i, count, ratio, first, last, gapMax }
  })

  const maxCount = baseStats.reduce((m, s) => Math.max(m, s.count), 0)
  const maxSceneCast = sceneCast.reduce((m, n) => Math.max(m, n), 0)
  const avgCast = totalScenes ? sceneCast.reduce((a, b) => a + b, 0) / totalScenes : 0
  const emptyScenes = sceneCast.filter((n) => n === 0).length
  const soloScenes = sceneCast.filter((n) => n === 1).length
  const ghostChars = baseStats.filter((s) => s.count === 0).length

  // 동시 등장(페어) 빈도
  const pairCount = new Map<string, number>()
  scenes.forEach((s) => {
    const ids = s.cast.filter((id) => idIndex.has(id))
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = ids[i] < ids[j] ? ids[i] + '|' + ids[j] : ids[j] + '|' + ids[i]
        pairCount.set(key, (pairCount.get(key) || 0) + 1)
      }
    }
  })
  const nameOf = (id: string) => baseStats.find((s) => s.id === id)?.name || '?'
  const pairs = Array.from(pairCount.entries())
    .map(([k, n]) => { const [a, b] = k.split('|'); return { a: nameOf(a), b: nameOf(b), n } })
    .sort((x, y) => y.n - x.n)
    .slice(0, 8)

  // 점유율 / 집중도
  const counts = baseStats.map((s) => s.count).sort((a, b) => b - a)
  const topShare = cellsChecked ? (counts[0] || 0) / cellsChecked : 0
  const top3Share = cellsChecked ? counts.slice(0, 3).reduce((a, b) => a + b, 0) / cellsChecked : 0

  // 균형 지수: HHI(허핀달) 기반. 등장 있는 인물들의 점유율 제곱합 → 0~1 정규화 후 균형도로 환산.
  // balance 100 = 완전 균등, 0 = 한 명에게 집중.
  let balance = 0
  const active = baseStats.filter((s) => s.count > 0)
  if (active.length >= 2 && cellsChecked > 0) {
    const shares = active.map((s) => s.count / cellsChecked)
    const hhi = shares.reduce((a, p) => a + p * p, 0)         // 1/k(균등) ~ 1(독점)
    const k = active.length
    const minHHI = 1 / k
    // (hhi - minHHI) / (1 - minHHI) = 집중도 0~1. 균형 = 1 - 집중도.
    const concentration = (hhi - minHHI) / (1 - minHHI)
    balance = Math.round((1 - concentration) * 100)
  } else if (active.length === 1) {
    balance = 0
  } else {
    balance = 0
  }

  // 경고 생성
  const warnings: string[] = []
  if (ghostChars > 0) warnings.push(`등장하지 않는 인물 ${ghostChars}명 — 조연 실종 또는 미배치`)
  if (totalScenes >= 4 && topShare >= 0.6 && active.length >= 2) warnings.push(`한 인물이 전체 등장의 ${Math.round(topShare * 100)}%를 차지 — 주연 편중`)
  if (emptyScenes > 0) warnings.push(`등장 인물이 없는 장면 ${emptyScenes}개 — 캐스트 미입력`)
  baseStats.forEach((s) => {
    if (s.count >= 2 && s.gapMax >= Math.max(3, Math.ceil(totalScenes * 0.4))) {
      warnings.push(`「${s.name}」 ${s.gapMax}개 장면 연속 부재 — 너무 오래 사라짐`)
    }
  })

  // 정렬
  const sorted = baseStats.slice()
  if (data.sort === 'count') sorted.sort((a, b) => b.count - a.count || a.index - b.index)
  else if (data.sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  // 'order' = 입력 순서(index) 유지

  return {
    totalScenes, totalChars, cellsChecked, stats: sorted, maxCount,
    sceneCast, maxSceneCast, avgCast, emptyScenes, soloScenes, ghostChars,
    pairs, topShare, top3Share, balance, warnings,
  }
}

export default function CharacterScreenTime() {
  const initial = useRef<Data>(loadData())
  const [data, setData] = useState<Data>(initial.current)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'grid' | 'chart'>('grid')
  const [dragOver, setDragOver] = useState(false)
  const [dropToast, setDropToast] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const dropTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)

  // 공유 라이브러리 인물(다른 도구에서 만든 인물) — "라이브러리에서 가져오기"용
  const libChars = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (dropTimer.current != null) clearTimeout(dropTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.')
    }
  }, [data])

  const a = useMemo(() => analyze(data), [data])

  // ===== CRUD: 인물 =====
  const addChar = (name = '') => {
    setData((d) => ({ ...d, chars: [...d.chars, { id: newId('c'), name, weight: 1 }] }))
  }
  const updateChar = (id: string, patch: Partial<Char>) => {
    setData((d) => ({ ...d, chars: d.chars.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }
  const removeChar = (id: string) => {
    setData((d) => ({
      ...d,
      chars: d.chars.filter((c) => c.id !== id),
      scenes: d.scenes.map((s) => ({ ...s, cast: s.cast.filter((cid) => cid !== id) })),
    }))
  }
  const moveChar = (id: string, dir: -1 | 1) => {
    setData((d) => {
      const i = d.chars.findIndex((c) => c.id === id); if (i < 0) return d
      const j = i + dir; if (j < 0 || j >= d.chars.length) return d
      const next = d.chars.slice(); [next[i], next[j]] = [next[j], next[i]]
      return { ...d, chars: next }
    })
  }

  // ===== CRUD: 장면 =====
  const addScene = (title = '') => {
    setData((d) => ({ ...d, scenes: [...d.scenes, { id: newId('s'), title, cast: [] }] }))
  }
  const updateScene = (id: string, patch: Partial<Scene>) => {
    setData((d) => ({ ...d, scenes: d.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }
  const removeScene = (id: string) => {
    setData((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== id) }))
  }
  const moveScene = (id: string, dir: -1 | 1) => {
    setData((d) => {
      const i = d.scenes.findIndex((s) => s.id === id); if (i < 0) return d
      const j = i + dir; if (j < 0 || j >= d.scenes.length) return d
      const next = d.scenes.slice(); [next[i], next[j]] = [next[j], next[i]]
      return { ...d, scenes: next }
    })
  }
  const toggleCast = (sceneId: string, charId: string) => {
    setData((d) => ({
      ...d,
      scenes: d.scenes.map((s) => {
        if (s.id !== sceneId) return s
        const has = s.cast.includes(charId)
        return { ...s, cast: has ? s.cast.filter((x) => x !== charId) : [...s.cast, charId] }
      }),
    }))
  }
  const fillRow = (charId: string, on: boolean) => {
    // 인물 한 명을 모든 장면에 등장/미등장 일괄 적용
    setData((d) => ({
      ...d,
      scenes: d.scenes.map((s) => {
        const has = s.cast.includes(charId)
        if (on && !has) return { ...s, cast: [...s.cast, charId] }
        if (!on && has) return { ...s, cast: s.cast.filter((x) => x !== charId) }
        return s
      }),
    }))
  }

  const setSort = (sort: SortKey) => setData((d) => ({ ...d, sort }))

  const clearAll = () => {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('인물·장면·체크를 모두 지울까요? 되돌릴 수 없습니다.')) return
    setData(blankData())
    setNote('')
  }

  const importLibChars = () => {
    if (!libChars.length) { setNote('공유 라이브러리에 저장된 인물이 없어요.'); return }
    const existing = new Set(data.chars.map((c) => c.name.trim()).filter(Boolean))
    const toAdd = libChars
      .map((c) => clampStr(c.name, 40).trim())
      .filter((nm) => nm && !existing.has(nm))
    if (!toAdd.length) { setNote('가져올 새 인물이 없어요(이미 모두 있음).'); return }
    setData((d) => ({ ...d, chars: [...d.chars, ...toAdd.map((nm) => ({ id: newId('c'), name: nm, weight: 1 }))] }))
    setNote(`✓ 라이브러리에서 인물 ${toAdd.length}명을 가져왔어요.`)
  }

  // ===== 바인더 파일 드롭 =====
  const showDropToast = (msg: string) => {
    if (!mounted.current) return
    setDropToast(msg)
    if (dropTimer.current != null) clearTimeout(dropTimer.current)
    dropTimer.current = window.setTimeout(() => { if (mounted.current) setDropToast('') }, 1800)
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }
  const onDragEnter = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault(); dragDepth.current += 1; if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    // 인물 파일 → 인물 추가, 그 외(장면/문서) → 장면 추가
    const isCharacter = it.type === 'character' || !!it.character?.name
    const name = (it.character?.name || it.title || '').trim().slice(0, isCharacter ? 40 : 80)
    if (!name) { setNote('이름을 찾을 수 없어 추가하지 못했어요.'); return }
    if (isCharacter) {
      if (data.chars.some((c) => c.name.trim() === name)) { setNote(`「${name}」은(는) 이미 인물 목록에 있어요.`); return }
      addChar(name); setNote(''); showDropToast(`✓ 인물 「${name}」 추가`)
    } else {
      addScene(name); setNote(''); showDropToast(`✓ 장면 「${name}」 추가`)
    }
  }

  // ===== 내보내기 =====
  const exportText = (): string => {
    const L: string[] = ['# 인물 등장 분량 보드', '']
    L.push(`장면 ${a.totalScenes}개 · 인물 ${a.totalChars}명 · 균형 지수 ${a.balance}/100`, '')
    L.push('## 인물별 등장')
    if (!a.stats.length) L.push('(인물 없음)')
    a.stats.forEach((s, i) => {
      const bar = '█'.repeat(Math.round(s.ratio * 20))
      L.push(`${i + 1}. ${s.name}  ${s.count}/${a.totalScenes}씬 (${Math.round(s.ratio * 100)}%) ${bar}`)
    })
    if (a.pairs.length) {
      L.push('', '## 자주 함께 나오는 인물(페어)')
      a.pairs.forEach((p) => L.push(`- ${p.a} ＋ ${p.b}: ${p.n}회`))
    }
    if (a.warnings.length) {
      L.push('', '## 점검')
      a.warnings.forEach((w) => L.push(`⚠ ${w}`))
    }
    return L.join('\n')
  }
  const copyText = async () => {
    const txt = exportText()
    const done = () => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); done(); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        done()
      } catch {
        if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.')
      }
    }
  }

  // ===== 프로젝트 연동 =====
  const buildProjectHtml = (): string => {
    // 1) 등장 격자(table): 행=인물, 열=장면, 셀=●/·
    const sceneHead = data.scenes.map((s, i) => `<th>${escapeHtml(s.title.trim() || `S${i + 1}`)}</th>`).join('')
    const gridRows = a.stats.map((s) => {
      const cells = data.scenes.map((sc) => `<td style="text-align:center">${sc.cast.includes(s.id) ? '●' : '·'}</td>`).join('')
      return `<tr><th style="text-align:left">${escapeHtml(s.name)}</th>${cells}<td style="text-align:center">${s.count} (${Math.round(s.ratio * 100)}%)</td></tr>`
    }).join('')
    const grid = `<table><thead><tr><th>인물 \\ 장면</th>${sceneHead}<th>합계</th></tr></thead><tbody>${gridRows}</tbody></table>`

    // 2) 페어 / 점검
    const pairHtml = a.pairs.length
      ? `<p><strong>자주 함께 나오는 인물</strong></p><ul>${a.pairs.map((p) => `<li>${escapeHtml(p.a)} ＋ ${escapeHtml(p.b)}: ${p.n}회</li>`).join('')}</ul>`
      : ''
    const warnHtml = a.warnings.length
      ? `<p><strong>점검</strong></p><ul>${a.warnings.map((w) => `<li>⚠ ${escapeHtml(w)}</li>`).join('')}</ul>`
      : '<p>✓ 큰 균형 문제가 발견되지 않았습니다.</p>'

    const summary = `<p>장면 ${a.totalScenes}개 · 인물 ${a.totalChars}명 · 균형 지수 <strong>${a.balance}/100</strong> · 상위 인물 점유율 ${Math.round(a.topShare * 100)}%</p>`
    return summary + grid + '<hr />' + pairHtml + warnHtml
  }

  const exportToProject = () => {
    if (!data.chars.length || !data.scenes.length) { setNote('인물과 장면을 먼저 입력하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '인물 등장 분량 보드',
      bodyHtml: buildProjectHtml(),
      meta: {
        장면수: String(a.totalScenes),
        인물수: String(a.totalChars),
        균형지수: String(a.balance),
        주연점유율: Math.round(a.topShare * 100) + '%',
        미등장인물: String(a.ghostChars),
      },
    })
    if (!mounted.current) return
    if (id) setNote('✓ 프로젝트 「구조」 폴더에 등장 분량 보드를 문서로 추가했어요.')
    else setNote('프로젝트에 추가하지 못했어요.')
  }

  // ===== 스타일 =====
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }
  const cellInput: React.CSSProperties = { width: '100%', padding: '5px 7px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const th: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, padding: '4px 6px', whiteSpace: 'nowrap' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px' }
  const warnPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 12%, transparent)', border: '1px solid var(--warn)', borderRadius: 8, padding: '3px 9px' }
  const tabBtnBase: React.CSSProperties = { padding: '4px 12px', fontSize: 12.5, fontWeight: 700, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--paper)', color: 'var(--muted)' }
  const tabBtnOn: React.CSSProperties = { ...tabBtnBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }

  const isEmpty = data.chars.length === 0 && data.scenes.length === 0
  const noContent = !data.chars.length || !data.scenes.length

  // 인물 인덱스→색 (정렬과 무관하게 입력 인덱스 기준 안정 색)
  const colorFor = (charId: string) => {
    const idx = data.chars.findIndex((c) => c.id === charId)
    return colorAt(idx < 0 ? 0 : idx)
  }

  const balanceColor = a.balance >= 66 ? 'var(--ok, #3fa35a)' : a.balance >= 40 ? 'var(--warn, #e0992b)' : 'var(--danger, #d2473b)'
  const balanceLabel = a.balance >= 66 ? '고른 앙상블' : a.balance >= 40 ? '다소 편중' : '강한 편중'

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent, #3d7fd6)', outlineOffset: -4, borderRadius: 8 } : wrap}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent, #3d7fd6) 10%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
            <Emoji e="🎭" /> 인물 파일은 인물로, 그 외 파일은 장면으로 추가
          </div>
        </div>
      )}
      {dropToast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 40, fontSize: 12.5, fontWeight: 700, color: 'var(--ok, #3fa35a)', background: 'var(--paper)', border: '1px solid var(--ok, #3fa35a)', borderRadius: 999, padding: '6px 14px', boxShadow: '0 4px 14px rgba(0,0,0,.16)', pointerEvents: 'none' }}>
          {dropToast}
        </div>
      )}

      {/* 상단 도구막대 */}
      <div style={topbar}>
        <div style={{ fontSize: 13, fontWeight: 700, marginRight: 'auto' }}><Emoji e="🎭" /> 인물 등장 분량 보드</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={tab === 'grid' ? tabBtnOn : tabBtnBase} onClick={() => setTab('grid')}>격자 입력</button>
          <button style={tab === 'chart' ? tabBtnOn : tabBtnBase} onClick={() => setTab('chart')}>분량 분석</button>
        </div>
        <button className="minibtn" onClick={importLibChars} disabled={!libChars.length} title="공유 라이브러리에 저장된 인물 가져오기"><Emoji e="👥" /> 라이브러리</button>
        <button className="minibtn" onClick={copyText} disabled={noContent} title="텍스트로 복사">{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={exportToProject}
          disabled={noContent || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '등장 분량 보드를 프로젝트 「구조」 폴더에 문서로 추가'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={clearAll} title="전체 삭제"><Emoji e="🗑️" /></button>
      </div>

      {/* 요약 줄 */}
      {!noContent && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '7px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <span style={pill}>장면 <b style={{ color: 'var(--text)' }}>{a.totalScenes}</b></span>
          <span style={pill}>인물 <b style={{ color: 'var(--text)' }}>{a.totalChars}</b></span>
          <span style={{ ...pill, borderColor: balanceColor, color: balanceColor, fontWeight: 700 }}>균형 {a.balance}/100 · {balanceLabel}</span>
          {a.cellsChecked > 0 && <span style={pill}>주연 점유율 <b style={{ color: 'var(--text)' }}>{Math.round(a.topShare * 100)}%</b></span>}
          {a.warnings.length > 0 && <span style={warnPill}>⚠ 점검 {a.warnings.length}건</span>}
        </div>
      )}

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {isEmpty ? (
          <EmptyState onAddChar={() => addChar()} onAddScene={() => addScene()} />
        ) : tab === 'grid' ? (
          <GridView
            data={data} a={a} colorFor={colorFor}
            addChar={addChar} updateChar={updateChar} removeChar={removeChar} moveChar={moveChar}
            addScene={addScene} updateScene={updateScene} removeScene={removeScene} moveScene={moveScene}
            toggleCast={toggleCast} fillRow={fillRow}
            cellInput={cellInput} th={th} hint={hint}
          />
        ) : (
          <ChartView a={a} data={data} colorFor={colorFor} sort={data.sort} setSort={setSort} pill={pill} warnPill={warnPill} hint={hint} balanceColor={balanceColor} balanceLabel={balanceLabel} />
        )}
      </div>
    </div>
  )
}

// ===== 빈 상태 안내 =====
function EmptyState({ onAddChar, onAddScene }: { onAddChar: () => void; onAddScene: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: '40px 24px', gap: 16 }}>
      <div style={{ fontSize: 40 }}><Emoji e="🎭" /></div>
      <div>
        인물과 장면을 만들고, 격자에서 각 장면에<br />
        등장하는 인물을 체크하세요.<br />
        <span style={{ fontSize: 12.5 }}>인물별 등장 분량과 앙상블 균형이 막대로 보입니다.<br />좌측 인물/장면 파일을 끌어다 놓아도 됩니다.</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={onAddChar}>＋ 인물 추가</button>
        <button className="minibtn" onClick={onAddScene}>＋ 장면 추가</button>
      </div>
    </div>
  )
}

// ===== 격자 입력 뷰 =====
interface GridProps {
  data: Data; a: Analysis; colorFor: (id: string) => string
  addChar: (n?: string) => void; updateChar: (id: string, p: Partial<Char>) => void; removeChar: (id: string) => void; moveChar: (id: string, d: -1 | 1) => void
  addScene: (t?: string) => void; updateScene: (id: string, p: Partial<Scene>) => void; removeScene: (id: string) => void; moveScene: (id: string, d: -1 | 1) => void
  toggleCast: (s: string, c: string) => void; fillRow: (c: string, on: boolean) => void
  cellInput: React.CSSProperties; th: React.CSSProperties; hint: React.CSSProperties
}
function GridView(p: GridProps) {
  const { data, a, colorFor, addChar, updateChar, removeChar, moveChar, addScene, updateScene, removeScene, moveScene, toggleCast, fillRow, cellInput, th, hint } = p
  const charColW = 168
  const sceneColW = 78

  const headCell: React.CSSProperties = { ...th, width: sceneColW, minWidth: sceneColW, maxWidth: sceneColW, verticalAlign: 'bottom', textAlign: 'center', borderBottom: '1px solid var(--border)' }
  const stickyLeft: React.CSSProperties = { position: 'sticky', left: 0, background: 'var(--paper)', zIndex: 2 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'min-content' }}>
          <thead>
            <tr>
              <th style={{ ...th, ...stickyLeft, width: charColW, minWidth: charColW, textAlign: 'left', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                인물 \ 장면
              </th>
              {data.scenes.map((s, si) => (
                <th key={s.id} style={headCell} title={s.title || `장면 ${si + 1}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <input
                      style={{ ...cellInput, width: sceneColW - 14, fontSize: 11, padding: '3px 4px', textAlign: 'center' }}
                      value={s.title}
                      onChange={(e) => updateScene(s.id, { title: e.target.value.slice(0, 80) })}
                      placeholder={`S${si + 1}`}
                      maxLength={80}
                      aria-label={`${si + 1}번째 장면 제목`}
                    />
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="minibtn" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => moveScene(s.id, -1)} disabled={si === 0} title="왼쪽으로">◀</button>
                      <button className="minibtn" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => moveScene(s.id, 1)} disabled={si === data.scenes.length - 1} title="오른쪽으로">▶</button>
                      <button className="minibtn" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => removeScene(s.id)} title="이 장면 삭제">✕</button>
                    </div>
                  </div>
                </th>
              ))}
              <th style={{ ...th, width: 56, minWidth: 56, textAlign: 'center', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>합계</th>
            </tr>
          </thead>
          <tbody>
            {data.chars.map((c, ci) => {
              const count = data.scenes.reduce((n, s) => n + (s.cast.includes(c.id) ? 1 : 0), 0)
              const col = colorAt(ci)
              const allOn = data.scenes.length > 0 && count === data.scenes.length
              return (
                <tr key={c.id} style={{ background: ci % 2 ? 'transparent' : 'color-mix(in srgb, var(--muted) 4%, transparent)' }}>
                  <td style={{ ...stickyLeft, padding: '4px 6px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0, border: '1px solid var(--border)' }} aria-hidden />
                      <input
                        style={{ ...cellInput, fontSize: 12.5 }}
                        value={c.name}
                        onChange={(e) => updateChar(c.id, { name: e.target.value.slice(0, 40) })}
                        placeholder={`인물 ${ci + 1}`}
                        maxLength={40}
                        aria-label={`${ci + 1}번째 인물 이름`}
                      />
                      <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={() => moveChar(c.id, -1)} disabled={ci === 0} title="위로">▲</button>
                        <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={() => moveChar(c.id, 1)} disabled={ci === data.chars.length - 1} title="아래로">▼</button>
                        <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={() => fillRow(c.id, !allOn)} title={allOn ? '모든 장면에서 빼기' : '모든 장면에 넣기'}>{allOn ? '⊘' : '⊕'}</button>
                        <button className="minibtn" style={{ padding: '1px 4px', fontSize: 10 }} onClick={() => removeChar(c.id)} title="이 인물 삭제">✕</button>
                      </div>
                    </div>
                  </td>
                  {data.scenes.map((s) => {
                    const on = s.cast.includes(c.id)
                    return (
                      <td key={s.id} style={{ borderBottom: '1px solid var(--border)', textAlign: 'center', padding: 0 }}>
                        <button
                          onClick={() => toggleCast(s.id, c.id)}
                          title={on ? `${c.name || '인물'} 등장 — 클릭해 빼기` : `${c.name || '인물'} 미등장 — 클릭해 넣기`}
                          aria-pressed={on}
                          aria-label={`${c.name || '인물'} × ${s.title || '장면'}`}
                          style={{
                            width: '100%', height: 30, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: on ? col : 'transparent', color: '#fff', fontSize: 13, transition: 'background .1s',
                          }}
                        >{on ? '●' : <span style={{ color: 'var(--border)', fontSize: 16, lineHeight: 1 }}>·</span>}</button>
                      </td>
                    )
                  })}
                  <td style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, fontSize: 12.5, color: count ? 'var(--text)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{count}</td>
                </tr>
              )
            })}
            {/* 장면별 등장 인원 합계 행 */}
            <tr>
              <td style={{ ...stickyLeft, padding: '5px 6px', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>등장 인원</td>
              {data.scenes.map((s, si) => {
                const n = s.cast.length
                return <td key={s.id} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: n === 0 ? 'var(--danger, #d2473b)' : 'var(--muted)' }} title={`${si + 1}번째 장면: ${n}명`}>{n}</td>
              })}
              <td style={{ borderLeft: '1px solid var(--border)' }} />
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => addChar()}>＋ 인물 추가</button>
        <button className="minibtn" onClick={() => addScene()}>＋ 장면 추가</button>
      </div>

      <div style={hint}>
        셀을 클릭해 등장/미등장을 토글하세요. 인물 행의 <b>⊕/⊘</b>는 모든 장면에 일괄 넣기/빼기,
        장면 머리글의 <b>◀▶</b>는 순서 이동입니다. 빨간 「등장 인원 0」 장면은 캐스트 미입력입니다.
      </div>
    </div>
  )
}

// ===== 분량 분석(막대 시각화) 뷰 =====
interface ChartProps {
  a: Analysis; data: Data; colorFor: (id: string) => string; sort: SortKey; setSort: (s: SortKey) => void
  pill: React.CSSProperties; warnPill: React.CSSProperties; hint: React.CSSProperties; balanceColor: string; balanceLabel: string
}
function ChartView({ a, colorFor, sort, setSort, warnPill, hint, balanceColor, balanceLabel }: ChartProps) {
  const sortBtn = (key: SortKey, label: string): React.CSSProperties => ({
    padding: '3px 10px', fontSize: 12, borderRadius: 7, cursor: 'pointer',
    border: '1px solid ' + (sort === key ? 'var(--accent)' : 'var(--border)'),
    background: sort === key ? 'var(--accent)' : 'var(--paper)',
    color: sort === key ? '#fff' : 'var(--muted)', fontWeight: sort === key ? 700 : 400,
  })

  const sectionTitle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--panel)' }

  if (a.cellsChecked === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, padding: '32px 20px' }}>
        아직 등장 체크가 없어요.<br />
        <b style={{ color: 'var(--text)' }}>격자 입력</b> 탭에서 장면별로 등장 인물을 체크하면<br />
        여기에 인물별 분량 막대와 균형 분석이 나타납니다.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 균형 게이지 + 핵심 지표 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={sectionTitle}>앙상블 균형</div>
          <div style={{ fontSize: 12, color: balanceColor, fontWeight: 700 }}>{balanceLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: balanceColor, lineHeight: 1, minWidth: 88 }}>
            {a.balance}<span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>/100</span>
          </div>
          <div style={{ flex: 1, height: 14, borderRadius: 999, background: 'color-mix(in srgb, var(--muted) 18%, transparent)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${a.balance}%`, height: '100%', background: balanceColor, borderRadius: 999, transition: 'width .2s' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12, fontSize: 12.5 }}>
          <Metric label="주연 점유율" value={`${Math.round(a.topShare * 100)}%`} />
          <Metric label="상위 3인 점유율" value={`${Math.round(a.top3Share * 100)}%`} />
          <Metric label="장면당 평균 인원" value={a.avgCast.toFixed(1)} />
          <Metric label="미등장 인물" value={`${a.ghostChars}명`} danger={a.ghostChars > 0} />
          <Metric label="빈 장면" value={`${a.emptyScenes}개`} danger={a.emptyScenes > 0} />
        </div>
      </div>

      {/* 인물별 등장 분량 막대(주 시각화) */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={sectionTitle}>인물별 등장 분량 ({a.totalScenes}개 장면 중)</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button style={sortBtn('count', '많은순')} onClick={() => setSort('count')}>많은순</button>
            <button style={sortBtn('order', '입력순')} onClick={() => setSort('order')}>입력순</button>
            <button style={sortBtn('name', '이름순')} onClick={() => setSort('name')}>이름순</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {a.stats.map((s) => {
            const col = colorFor(s.id)
            const pct = a.totalScenes ? s.ratio * 100 : 0
            const widthOfMax = a.maxCount ? (s.count / a.maxCount) * 100 : 0
            return (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 116px', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0 }} aria-hidden />
                  <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</span>
                </div>
                <div style={{ height: 20, borderRadius: 6, background: 'color-mix(in srgb, var(--muted) 12%, transparent)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${widthOfMax}%`, height: '100%', background: col, borderRadius: 6, transition: 'width .25s', minWidth: s.count ? 3 : 0 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>
                  <b style={{ color: s.count ? 'var(--text)' : 'var(--danger, #d2473b)' }}>{s.count}</b>씬 · {Math.round(pct)}%
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ ...hint, marginTop: 10 }}>막대 길이 = 가장 많이 나온 인물 대비 상대 비율. 0씬(빨강) 인물은 한 번도 등장하지 않았습니다.</div>
      </div>

      {/* 장면별 등장 인원 막대 */}
      <div style={card}>
        <div style={sectionTitle}>장면별 등장 인원 (밀집/희소 장면)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110, overflowX: 'auto', paddingBottom: 4 }}>
          {a.sceneCast.map((n, i) => {
            const h = a.maxSceneCast ? (n / a.maxSceneCast) * 92 : 0
            const danger = n === 0
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 22, flex: '1 0 22px' }} title={`${i + 1}번째 장면: ${n}명 등장`}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{n}</div>
                <div style={{ width: '100%', height: Math.max(h, danger ? 3 : (n ? 4 : 0)), background: danger ? 'var(--danger, #d2473b)' : 'var(--accent)', borderRadius: '4px 4px 0 0', minHeight: danger ? 3 : 0 }} />
                <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{i + 1}</div>
              </div>
            )
          })}
        </div>
        <div style={{ ...hint, marginTop: 6 }}>장면당 평균 {a.avgCast.toFixed(1)}명 · 1인 장면 {a.soloScenes}개{a.emptyScenes > 0 ? ` · 빈 장면 ${a.emptyScenes}개(빨강)` : ''}.</div>
      </div>

      {/* 동시 등장 페어 + 등장 구간 진단 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {a.pairs.length > 0 && (
          <div style={card}>
            <div style={sectionTitle}>자주 함께 나오는 인물</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {a.pairs.map((p, i) => {
                const w = a.pairs[0].n ? (p.n / a.pairs[0].n) * 100 : 0
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${p.a} + ${p.b}`}>{p.a} <span style={{ color: 'var(--muted)' }}>＋</span> {p.b}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'color-mix(in srgb, var(--muted) 12%, transparent)', overflow: 'hidden' }}>
                        <div style={{ width: `${w}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16, textAlign: 'right' }}>{p.n}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ ...hint, marginTop: 8 }}>두 인물이 같은 장면에 함께 등장한 횟수입니다.</div>
          </div>
        )}

        <div style={card}>
          <div style={sectionTitle}>등장 구간 진단</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                  <th style={{ padding: '2px 6px', fontWeight: 700 }}>인물</th>
                  <th style={{ padding: '2px 6px', fontWeight: 700, textAlign: 'center' }}>첫</th>
                  <th style={{ padding: '2px 6px', fontWeight: 700, textAlign: 'center' }}>끝</th>
                  <th style={{ padding: '2px 6px', fontWeight: 700, textAlign: 'center' }}>최장부재</th>
                </tr>
              </thead>
              <tbody>
                {a.stats.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 5, maxWidth: 130, overflow: 'hidden' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(s.id), flexShrink: 0 }} aria-hidden />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>{s.name}</span>
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'center', color: s.first ? 'var(--text)' : 'var(--muted)' }}>{s.first || '—'}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'center', color: s.last ? 'var(--text)' : 'var(--muted)' }}>{s.last || '—'}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'center', color: s.gapMax >= 3 ? 'var(--warn, #e0992b)' : 'var(--muted)', fontWeight: s.gapMax >= 3 ? 700 : 400 }}>{s.count >= 2 ? s.gapMax : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...hint, marginTop: 8 }}>첫/끝 = 처음·마지막 등장 장면 번호. 최장부재 = 등장 사이 가장 긴 공백(장면 수).</div>
        </div>
      </div>

      {/* 점검 경고 */}
      {a.warnings.length > 0 ? (
        <div style={{ ...card, borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 7%, transparent)' }}>
          <div style={{ ...sectionTitle, color: 'var(--warn)' }}>⚠ 균형 점검 ({a.warnings.length}건)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.warnings.map((w, i) => <div key={i} style={warnPill}>⚠ {w}</div>)}
          </div>
        </div>
      ) : (
        <div style={{ ...card, borderColor: 'var(--ok, #3fa35a)', color: 'var(--ok, #3fa35a)', fontWeight: 700, fontSize: 13 }}>
          ✓ 큰 균형 문제가 발견되지 않았습니다.
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.2 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: danger ? 'var(--danger, #d2473b)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{value}</span>
    </div>
  )
}
