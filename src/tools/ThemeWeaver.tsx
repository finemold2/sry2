// 주제 직조(Theme Weaver) — 작품의 주제·상징·모티프를 등록하고, 장면마다 어떤 주제가
// 드러나는지 격자(matrix)로 체크한 뒤, 주제별 분포(등장 빈도·간격·공백 구간)를 점검한다.
//   · 주제 항목: 종류(주제/상징/모티프), 이름, 한 줄 설명, 색.
//   · 장면 행: 이름(막/장 등). 좌측 바인더 파일을 드래그해서 장면으로 추가 가능.
//   · 교차 체크: 장면 × 주제 셀을 강도(약/중/강)로 토글 → 주제가 어디에 깔리는지 한눈에.
//   · 분포 점검: 주제별 노출 횟수/비율/최장 공백·미사용 경고, 전체 직조 밀도 진단.
// 자급식: react 외 import 없음(linkbus 만 추가). 외부 네트워크/미디어 미사용. 전부 로컬.
// localStorage 'sry:tool:theme-weaver' 에 자동 저장/복원. 언마운트 정리.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
  type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'theme-weaver',
  name: '주제 직조',
  icon: '🧵',
  group: '구상·정리',
  intro: '주제·상징·모티프를 등록하고 장면마다 어떤 주제가 드러나는지 체크해 분포를 점검하세요',
  w: 940,
  h: 660,
}

const LS_KEY = 'sry:tool:theme-weaver'

// ── 타입 ─────────────────────────────────────────────────────
type ThemeKind = 'theme' | 'symbol' | 'motif'
type Strength = 0 | 1 | 2 | 3 // 0=없음 1=약 2=중 3=강

interface ThemeItem {
  id: string
  kind: ThemeKind
  name: string
  note: string
  color: string
}
interface SceneRow {
  id: string
  name: string
  note: string
}
interface SaveShape {
  title: string
  themes: ThemeItem[]
  scenes: SceneRow[]
  // 교차 강도: cells[sceneId][themeId] = Strength
  cells: Record<string, Record<string, Strength>>
}

// ── 상수 ─────────────────────────────────────────────────────
const KIND_LABEL: Record<ThemeKind, string> = { theme: '주제', symbol: '상징', motif: '모티프' }
const KIND_ICON: Record<ThemeKind, string> = { theme: '🎯', symbol: '🔣', motif: '🔁' }
const KIND_DESC: Record<ThemeKind, string> = {
  theme: '이야기가 결국 말하려는 큰 뜻 (예: 용서, 자유의 대가)',
  symbol: '추상을 대신하는 구체 사물 (예: 붉은 코트=죄책감)',
  motif: '되풀이되어 주제를 강화하는 이미지/요소 (예: 비, 거울, 시계)',
}
const STRENGTH_LABEL: Record<Strength, string> = { 0: '없음', 1: '약', 2: '중', 3: '강' }
const PALETTE = ['#e0524f', '#e08a3c', '#d9b13b', '#5aa469', '#3c93c2', '#5566cc', '#9a5fc0', '#c25b9b', '#7a8a99', '#b07a4f']

const KIND_ORDER: ThemeKind[] = ['theme', 'symbol', 'motif']

// 예시 묶음 — 막막할 때 한 번에 채워 학습/시작용.
interface Preset { label: string; title: string; themes: Omit<ThemeItem, 'id'>[]; scenes: { name: string; note?: string }[] }
const PRESETS: Preset[] = [
  {
    label: '성장 소설',
    title: '여름의 끝',
    themes: [
      { kind: 'theme', name: '어른이 된다는 것', note: '책임과 상실을 받아들임', color: PALETTE[0] },
      { kind: 'theme', name: '소속과 외로움', note: '무리에 속하려는 갈망', color: PALETTE[3] },
      { kind: 'symbol', name: '낡은 자전거', note: '잃어버린 어린 시절', color: PALETTE[4] },
      { kind: 'motif', name: '매미 소리', note: '끝나가는 여름·시간의 흐름', color: PALETTE[2] },
    ],
    scenes: [
      { name: '1장 도입' }, { name: '2장 사건의 발단' }, { name: '3장 갈등 심화' },
      { name: '4장 위기' }, { name: '5장 절정' }, { name: '6장 결말' },
    ],
  },
  {
    label: '느와르 스릴러',
    title: '비 내리는 항구',
    themes: [
      { kind: 'theme', name: '정의는 가능한가', note: '부패한 세계에서의 도덕', color: PALETTE[0] },
      { kind: 'theme', name: '구원과 죄', note: '과거를 씻을 수 있는가', color: PALETTE[5] },
      { kind: 'symbol', name: '꺼진 등대', note: '길을 잃은 양심', color: PALETTE[6] },
      { kind: 'motif', name: '비', note: '죄책감·정화·은폐', color: PALETTE[4] },
      { kind: 'motif', name: '거울/유리창', note: '이중성·자기기만', color: PALETTE[7] },
    ],
    scenes: [
      { name: '발단: 의뢰' }, { name: '첫 단서' }, { name: '배신' }, { name: '추락' },
      { name: '대면' }, { name: '대가' }, { name: '결말' },
    ],
  },
]

// ── 유틸 ─────────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clampStrength(n: unknown): Strength {
  const v = Math.round(Number(n))
  if (v === 1 || v === 2 || v === 3) return v
  return 0
}
function isKind(x: unknown): x is ThemeKind { return x === 'theme' || x === 'symbol' || x === 'motif' }
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function defaultThemes(): ThemeItem[] {
  return [
    { id: newId(), kind: 'theme', name: '', note: '', color: PALETTE[0] },
  ]
}
function load(): SaveShape {
  const blank: SaveShape = { title: '', themes: [], scenes: [], cells: {} }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return blank
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return blank
    const themes: ThemeItem[] = Array.isArray(p.themes)
      ? p.themes.filter((t: any) => t && typeof t === 'object').map((t: any, i: number) => ({
          id: String(t.id || newId()),
          kind: isKind(t.kind) ? t.kind : 'theme',
          name: String(t.name ?? ''),
          note: String(t.note ?? ''),
          color: typeof t.color === 'string' && t.color ? t.color : PALETTE[i % PALETTE.length],
        }))
      : []
    const scenes: SceneRow[] = Array.isArray(p.scenes)
      ? p.scenes.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
          id: String(s.id || newId()),
          name: String(s.name ?? ''),
          note: String(s.note ?? ''),
        }))
      : []
    const cells: Record<string, Record<string, Strength>> = {}
    if (p.cells && typeof p.cells === 'object') {
      for (const sid of Object.keys(p.cells)) {
        const row = p.cells[sid]
        if (!row || typeof row !== 'object') continue
        const out: Record<string, Strength> = {}
        for (const tid of Object.keys(row)) {
          const v = clampStrength(row[tid])
          if (v) out[tid] = v
        }
        if (Object.keys(out).length) cells[sid] = out
      }
    }
    return { title: typeof p.title === 'string' ? p.title : '', themes, scenes, cells }
  } catch { return blank }
}

// ── 컴포넌트 ─────────────────────────────────────────────────
export default function ThemeWeaver({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [themes, setThemes] = useState<ThemeItem[]>(init.current.themes)
  const [scenes, setScenes] = useState<SceneRow[]>(init.current.scenes)
  const [cells, setCells] = useState<Record<string, Record<string, Strength>>>(init.current.cells)
  const [tab, setTab] = useState<'matrix' | 'dist'>('matrix')
  const [note, setNote] = useState('')
  const [noteWarn, setNoteWarn] = useState(false)
  const [dragOverGrid, setDragOverGrid] = useState(false)
  const [newSceneName, setNewSceneName] = useState('')
  const [editScene, setEditScene] = useState<string | null>(null)
  const [editSceneName, setEditSceneName] = useState('')
  const [focusTheme, setFocusTheme] = useState<string | null>(null) // 분포 점검에서 강조
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload 로 프리셋/씨앗 주입(연계 열기 시).
  useEffect(() => {
    if (!payload) return
    if (typeof payload.title === 'string' && !title) setTitle(payload.title)
    const seed = payload.themeName ?? payload.theme
    if (typeof seed === 'string' && seed.trim()) {
      setThemes((prev) => {
        if (prev.some((t) => t.name.trim() === seed.trim())) return prev
        return [...prev, { id: newId(), kind: 'theme', name: seed.trim(), note: '', color: PALETTE[prev.length % PALETTE.length] }]
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ title, themes, scenes, cells } as SaveShape))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, themes, scenes, cells])

  function flash(msg: string, warn = false) {
    setNote(msg); setNoteWarn(warn)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  // ── 주제 CRUD ──────────────────────────────────────────────
  const addTheme = (kind: ThemeKind) => {
    setThemes((prev) => [...prev, { id: newId(), kind, name: '', note: '', color: PALETTE[prev.length % PALETTE.length] }])
  }
  const updateTheme = (id: string, patch: Partial<ThemeItem>) => {
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  const removeTheme = (id: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== id))
    setCells((prev) => {
      const next: typeof prev = {}
      for (const sid of Object.keys(prev)) {
        const row = { ...prev[sid] }
        delete row[id]
        if (Object.keys(row).length) next[sid] = row
      }
      return next
    })
  }
  const moveTheme = (id: string, dir: -1 | 1) => {
    setThemes((prev) => {
      const i = prev.findIndex((t) => t.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const n = prev.slice(); [n[i], n[j]] = [n[j], n[i]]; return n
    })
  }

  // ── 장면 CRUD ──────────────────────────────────────────────
  const addScene = (name?: string, sceneNote = '') => {
    const nm = (name ?? newSceneName).trim()
    setScenes((prev) => [...prev, { id: newId(), name: nm || `${prev.length + 1}장`, note: sceneNote }])
    if (name === undefined) setNewSceneName('')
  }
  const removeScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    setCells((prev) => { const next = { ...prev }; delete next[id]; return next })
    if (editScene === id) setEditScene(null)
  }
  const moveScene = (id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const n = prev.slice(); [n[i], n[j]] = [n[j], n[i]]; return n
    })
  }
  const startEditScene = (s: SceneRow) => { setEditScene(s.id); setEditSceneName(s.name) }
  const commitEditScene = () => {
    if (!editScene) return
    const nm = editSceneName.trim()
    setScenes((prev) => prev.map((s) => (s.id === editScene ? { ...s, name: nm || s.name } : s)))
    setEditScene(null); setEditSceneName('')
  }

  // ── 교차 강도 토글: 클릭 시 0→1→2→3→0 순환 ──────────────────
  const cycleCell = (sid: string, tid: string) => {
    setCells((prev) => {
      const row = { ...(prev[sid] || {}) }
      const cur = clampStrength(row[tid])
      const nextV = ((cur + 1) % 4) as Strength
      if (nextV === 0) delete row[tid]
      else row[tid] = nextV
      const next = { ...prev }
      if (Object.keys(row).length) next[sid] = row
      else delete next[sid]
      return next
    })
  }
  const cellOf = (sid: string, tid: string): Strength => clampStrength(cells[sid]?.[tid])

  // ── 드롭(바인더 장면 파일 수용) ─────────────────────────────
  const onGridDrop = (e: React.DragEvent) => {
    setDragOverGrid(false)
    if (!isItemDrag(e)) return
    e.preventDefault()
    const item: ResolvedItem | null = getDragItem(e)
    if (!item) return
    if (scenes.some((s) => s.name === item.title)) { flash('이미 같은 이름의 장면이 있어요.', true); return }
    addScene(item.title, item.type || '')
    flash(`장면 「${item.title}」을(를) 추가했어요.`)
  }

  // ── 프리셋 ─────────────────────────────────────────────────
  const applyPreset = (p: Preset) => {
    const newThemes: ThemeItem[] = p.themes.map((t) => ({ ...t, id: newId() }))
    const newScenes: SceneRow[] = p.scenes.map((s) => ({ id: newId(), name: s.name, note: s.note || '' }))
    setTitle(p.title)
    setThemes(newThemes)
    setScenes(newScenes)
    // 예시 직조: 주요 주제를 일부 장면에 흩뿌려 둠(데모).
    const seeded: Record<string, Record<string, Strength>> = {}
    newScenes.forEach((sc, si) => {
      newThemes.forEach((th, ti) => {
        // 결정적 의사난수(데모용): 일부 셀만 채움
        const h = (si * 7 + ti * 13 + 5) % 10
        if (h < 4) {
          const st = ((h % 3) + 1) as Strength
          if (!seeded[sc.id]) seeded[sc.id] = {}
          seeded[sc.id][th.id] = st
        }
      })
    })
    setCells(seeded)
    flash(`「${p.label}」 예시를 불러왔어요. 자유롭게 고쳐 쓰세요.`)
  }

  const resetAll = () => {
    setTitle(''); setThemes(defaultThemes()); setScenes([]); setCells({}); setFocusTheme(null)
    flash('새로 시작합니다.')
  }

  // ── 분포 통계 ──────────────────────────────────────────────
  // 주제별: 등장 장면 인덱스, 노출 횟수, 가중 강도합, 비율, 최장 공백(연속 미등장), 첫/끝 등장
  interface ThemeStat {
    theme: ThemeItem
    hits: number             // 등장 장면 수(강도>0)
    weight: number           // 강도 합
    ratio: number            // hits / sceneCount
    firstIdx: number         // 첫 등장(없으면 -1)
    lastIdx: number          // 끝 등장(없으면 -1)
    maxGap: number           // 등장 사이 최장 공백(장면 수)
    presence: Strength[]     // 장면 순서별 강도
  }
  const stats: ThemeStat[] = useMemo(() => {
    const n = scenes.length
    return themes.map((th) => {
      const presence: Strength[] = scenes.map((s) => clampStrength(cells[s.id]?.[th.id]))
      const idxs: number[] = []
      let weight = 0
      presence.forEach((v, i) => { if (v > 0) { idxs.push(i); weight += v } })
      const hits = idxs.length
      let maxGap = 0
      if (idxs.length) {
        // 처음 등장 전, 등장 사이, 마지막 등장 후의 공백 중 최댓값(전 구간 기준)
        let prev = -1
        for (const i of idxs) { maxGap = Math.max(maxGap, i - prev - 1); prev = i }
        maxGap = Math.max(maxGap, n - prev - 1)
      } else {
        maxGap = n
      }
      return {
        theme: th, hits, weight, ratio: n ? hits / n : 0,
        firstIdx: idxs.length ? idxs[0] : -1,
        lastIdx: idxs.length ? idxs[idxs.length - 1] : -1,
        maxGap, presence,
      }
    })
  }, [themes, scenes, cells])

  // 장면별 주제 밀도(그 장면에서 드러난 주제 수)
  const sceneLoad: number[] = useMemo(
    () => scenes.map((s) => themes.reduce((acc, t) => acc + (clampStrength(cells[s.id]?.[t.id]) > 0 ? 1 : 0), 0)),
    [scenes, themes, cells],
  )

  // 전체 진단
  const diag = useMemo(() => {
    const nThemes = themes.filter((t) => t.name.trim()).length
    const nScenes = scenes.length
    const out: { text: string; tone: 'ok' | 'warn' | 'muted' }[] = []
    if (nThemes === 0 || nScenes === 0) {
      out.push({ text: '주제와 장면을 각각 하나 이상 등록하고 격자를 체크하면 분포를 진단합니다.', tone: 'muted' })
      return out
    }
    const used = stats.filter((s) => s.theme.name.trim())
    const unused = used.filter((s) => s.hits === 0)
    if (unused.length) {
      out.push({ text: `${unused.length}개 주제가 어느 장면에도 드러나지 않습니다: ${unused.map((u) => u.theme.name.trim()).join(', ')}. 등장시키거나 정리하세요.`, tone: 'warn' })
    }
    const thin = used.filter((s) => s.hits === 1)
    if (thin.length) {
      out.push({ text: `${thin.length}개 주제가 단 한 장면에서만 스칩니다(${thin.map((u) => u.theme.name.trim()).join(', ')}). 되풀이로 짜 넣으면 주제가 단단해집니다.`, tone: 'muted' })
    }
    const longGap = used.filter((s) => s.hits >= 1 && s.maxGap >= Math.max(3, Math.ceil(nScenes / 2)))
    if (longGap.length) {
      out.push({ text: `${longGap.map((u) => `「${u.theme.name.trim()}」(공백 ${u.maxGap}장)`).join(', ')} — 오래 사라졌다 돌아옵니다. 독자가 잊지 않도록 중간에 모티프를 흘려보세요.`, tone: 'warn' })
    }
    const empties = sceneLoad.filter((c) => c === 0).length
    if (empties) {
      out.push({ text: `${empties}개 장면에는 어떤 주제도 깔려 있지 않습니다. 의도적 휴지인지, 주제가 빠진 것인지 확인하세요.`, tone: 'muted' })
    }
    const allGood = !unused.length && !longGap.length && used.length >= 2
    if (allGood) {
      out.push({ text: '모든 주제가 곳곳에 직조되어 있고 큰 공백도 없습니다. 균형 잡힌 짜임새예요.', tone: 'ok' })
    }
    return out
  }, [themes, scenes, stats, sceneLoad])

  // ── 텍스트/HTML 내보내기 ───────────────────────────────────
  const buildText = (): string => {
    const L: string[] = []
    L.push(title.trim() ? `[주제 직조] ${title.trim()}` : '[주제 직조]')
    L.push(`주제/상징/모티프 ${themes.filter((t) => t.name.trim()).length}개 · 장면 ${scenes.length}개`)
    L.push('')
    L.push('— 분포 —')
    stats.filter((s) => s.theme.name.trim()).forEach((s) => {
      const pct = Math.round(s.ratio * 100)
      const map = s.presence.map((v) => (v ? STRENGTH_LABEL[v][0] : '·')).join('')
      L.push(`${KIND_LABEL[s.theme.kind]} ${s.theme.name.trim()} : ${s.hits}/${scenes.length}장 (${pct}%) 강도합 ${s.weight} 최장공백 ${s.maxGap}`)
      if (scenes.length) L.push(`   [${map}]`)
    })
    L.push('')
    L.push('— 진단 —')
    diag.forEach((d) => L.push(`· ${d.text}`))
    return L.join('\n')
  }

  const buildHtml = (): string => {
    const named = themes.filter((t) => t.name.trim())
    const P: string[] = []
    P.push(`<p><strong>주제 직조${title.trim() ? ' · ' + esc(title.trim()) : ''}</strong> — 주제/상징/모티프 ${named.length}개 · 장면 ${scenes.length}개</p>`)
    // 격자 표
    if (named.length && scenes.length) {
      P.push('<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>장면 \\ 주제</th>')
      named.forEach((t) => P.push(`<th>${esc(t.name.trim())}</th>`))
      P.push('</tr></thead><tbody>')
      scenes.forEach((sc) => {
        P.push(`<tr><td>${esc(sc.name || '(이름 없음)')}</td>`)
        named.forEach((t) => {
          const v = clampStrength(cells[sc.id]?.[t.id])
          P.push(`<td align="center">${v ? STRENGTH_LABEL[v] : ''}</td>`)
        })
        P.push('</tr>')
      })
      P.push('</tbody></table>')
    }
    // 분포 요약
    P.push('<p><strong>주제별 분포</strong></p><ul>')
    stats.filter((s) => s.theme.name.trim()).forEach((s) => {
      const pct = Math.round(s.ratio * 100)
      P.push(`<li>${esc(KIND_LABEL[s.theme.kind])} ${esc(s.theme.name.trim())}${s.theme.note.trim() ? ' — ' + esc(s.theme.note.trim()) : ''} : ${s.hits}/${scenes.length}장 (${pct}%), 강도합 ${s.weight}, 최장 공백 ${s.maxGap}장</li>`)
    })
    P.push('</ul>')
    // 진단
    P.push('<p><strong>점검</strong></p><ul>')
    diag.forEach((d) => P.push(`<li>${esc(d.text)}</li>`))
    P.push('</ul>')
    return P.join('')
  }

  const copyText = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('직조표를 텍스트로 복사했어요.')
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.', true) }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.', true); return }
    const named = themes.filter((t) => t.name.trim())
    if (!named.length) { flash('등록된 주제가 없습니다.', true); return }
    const meta: Record<string, string> = {
      주제수: String(named.length),
      장면수: String(scenes.length),
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '주제',
      title: title.trim() ? `주제 직조 — ${title.trim()}` : '주제 직조표',
      bodyHtml: buildHtml(),
      meta,
    })
    flash(id ? '프로젝트 자료 〈주제〉 폴더에 직조표 문서를 추가했어요.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const toStash = () => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.', true); return }
    addToStash({ kind: 'note', label: title.trim() ? `주제 직조 — ${title.trim()}` : '주제 직조', text: buildText() })
    flash('수집함에 담았어요.')
  }

  // ── 파생 표시값 ────────────────────────────────────────────
  const namedThemeCount = themes.filter((t) => t.name.trim()).length
  const totalCells = useMemo(
    () => Object.values(cells).reduce((acc, row) => acc + Object.keys(row).length, 0),
    [cells],
  )
  const density = scenes.length && namedThemeCount ? totalCells / (scenes.length * namedThemeCount) : 0

  // ── 스타일 ─────────────────────────────────────────────────
  const c = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' } as React.CSSProperties,
    head: { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' } as React.CSSProperties,
    titleInput: { flex: 1, minWidth: 140, padding: '7px 10px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    tabbar: { display: 'flex', gap: 6, padding: '8px 14px 0', flexShrink: 0 } as React.CSSProperties,
    body: { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 } as React.CSSProperties,
    panel: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 } as React.CSSProperties,
    sectionTitle: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' } as React.CSSProperties,
    hint: { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 } as React.CSSProperties,
    empty: { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '22px 10px', border: '1px dashed var(--border)', borderRadius: 10 } as React.CSSProperties,
    input: { width: '100%', padding: '6px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' } as React.CSSProperties,
    iconBtn: { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 7 } as React.CSSProperties,
  }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: '9px 9px 0 0',
    border: '1px solid var(--border)', borderBottom: active ? '1px solid var(--paper)' : '1px solid var(--border)',
    background: active ? 'var(--paper)' : 'var(--chrome-2)',
    color: active ? 'var(--text)' : 'var(--muted)', marginBottom: -1, position: 'relative',
  })

  // 강도별 셀 배경(주제 색을 투명도로)
  const strengthBg = (color: string, v: Strength): string => {
    if (v === 0) return 'transparent'
    const a = v === 1 ? '33' : v === 2 ? '88' : 'ff'
    return hexA(color, a)
  }

  return (
    <div style={c.wrap}>
      {/* 헤더 */}
      <div style={c.head}>
        <span style={{ fontSize: 18 }}><Emoji e="🧵"/></span>
        <input style={c.titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목 (선택)" maxLength={80} aria-label="작품 제목" />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>주제 {namedThemeCount} · 장면 {scenes.length}</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button className="minibtn" onClick={copyText} title="직조표를 텍스트로 복사"><Emoji e="📋"/> 복사</button>
          <button className="minibtn" onClick={resetAll} title="모두 비우고 새로 시작">초기화</button>
        </div>
      </div>

      {note && (
        <div style={{ ...c.hint, color: noteWarn ? 'var(--warn)' : 'var(--ok)', padding: '6px 14px 0' }}>{noteWarn ? <><Emoji e="⚠"/>{' '}</> : '✓ '}{note}</div>
      )}

      {/* 탭 */}
      <div style={c.tabbar}>
        <button style={tabBtn(tab === 'matrix')} onClick={() => setTab('matrix')}><Emoji e="🧶"/> 직조 격자</button>
        <button style={tabBtn(tab === 'dist')} onClick={() => setTab('dist')}><Emoji e="📊"/> 분포 점검</button>
      </div>

      <div style={{ ...c.body, borderTop: '1px solid var(--border)' }}>
        {/* ───────────────── 주제 등록 패널(양 탭 공통) ───────────────── */}
        <div style={c.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ ...c.sectionTitle, marginBottom: 0 }}>주제 · 상징 · 모티프 등록</span>
            <span style={{ flex: 1 }} />
            {KIND_ORDER.map((k) => (
              <button key={k} className="minibtn" onClick={() => addTheme(k)} title={KIND_DESC[k]}>＋ <Emoji e={KIND_ICON[k]}/> {KIND_LABEL[k]}</button>
            ))}
          </div>

          {themes.length === 0 ? (
            <div style={c.empty}>
              아직 등록된 항목이 없어요.<br />
              위 버튼으로 <b>주제·상징·모티프</b>를 추가하거나, 아래 예시로 시작하세요.
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <button key={p.label} className="btn-primary" onClick={() => applyPreset(p)}><Emoji e="📚"/> {p.label} 예시</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {themes.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                  {/* 색 견본 + 색 선택 */}
                  <label style={{ position: 'relative', flexShrink: 0, marginTop: 2 }} title="색 바꾸기">
                    <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 5, background: t.color, border: '1px solid var(--border)', cursor: 'pointer' }} />
                    <input type="color" value={normHex(t.color)} onChange={(e) => updateTheme(t.id, { color: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, width: 18, height: 18, cursor: 'pointer' }} aria-label="색" />
                  </label>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* 종류 토글 */}
                      <select
                        value={t.kind}
                        onChange={(e) => updateTheme(t.id, { kind: e.target.value as ThemeKind })}
                        style={{ ...c.input, width: 'auto', padding: '4px 6px', fontSize: 12 }}
                        aria-label="종류"
                        title={KIND_DESC[t.kind]}
                      >
                        {KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_ICON[k]} {KIND_LABEL[k]}</option>)}
                      </select>
                      <input
                        style={{ ...c.input, flex: 1, minWidth: 120, fontWeight: 600 }}
                        value={t.name}
                        onChange={(e) => updateTheme(t.id, { name: e.target.value })}
                        placeholder={t.kind === 'theme' ? '주제 (예: 용서)' : t.kind === 'symbol' ? '상징 (예: 붉은 코트)' : '모티프 (예: 비)'}
                        maxLength={50}
                        aria-label="이름"
                      />
                    </div>
                    <input
                      style={c.input}
                      value={t.note}
                      onChange={(e) => updateTheme(t.id, { note: e.target.value })}
                      placeholder={KIND_DESC[t.kind]}
                      maxLength={120}
                      aria-label="설명"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    <button style={c.iconBtn} onClick={() => moveTheme(t.id, -1)} disabled={i === 0} title="위로">▲</button>
                    <button style={c.iconBtn} onClick={() => moveTheme(t.id, 1)} disabled={i === themes.length - 1} title="아래로">▼</button>
                    <button style={{ ...c.iconBtn, color: 'var(--warn)' }} onClick={() => removeTheme(t.id)} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ───────────────── 탭: 직조 격자 ───────────────── */}
        {tab === 'matrix' && (
          <div style={c.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ ...c.sectionTitle, marginBottom: 0 }}>장면별 주제 체크 — 셀을 눌러 강도 0→약→중→강 순환</span>
              <span style={{ flex: 1 }} />
              <input
                style={{ ...c.input, width: 'auto', flex: '0 1 180px' }}
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addScene() } }}
                placeholder="새 장면 이름"
                maxLength={50}
                aria-label="새 장면 이름"
              />
              <button className="btn-primary" onClick={() => addScene()}>＋ 장면</button>
            </div>

            {namedThemeCount === 0 ? (
              <div style={c.empty}>위에서 <b>주제</b>를 먼저 등록하세요. 그러면 장면과 교차할 격자가 생깁니다.</div>
            ) : (
              <div
                onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dragOverGrid) setDragOverGrid(true) } }}
                onDragLeave={() => setDragOverGrid(false)}
                onDrop={onGridDrop}
                style={{ overflowX: 'auto', borderRadius: 10, outline: dragOverGrid ? '2px dashed var(--accent)' : 'none', outlineOffset: 2 }}
              >
                {scenes.length === 0 ? (
                  <div style={c.empty}>
                    장면이 없어요. 위에서 추가하거나,<br />
                    좌측 바인더의 장면 파일을 이 영역으로 <b>드래그</b>해 넣으세요.
                  </div>
                ) : (
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: themes.length * 64 + 180 }}>
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--panel)', textAlign: 'left', padding: '6px 8px', fontSize: 11.5, color: 'var(--muted)', borderBottom: '2px solid var(--border)', minWidth: 150 }}>장면 \ 주제</th>
                        {themes.map((t) => (
                          <th key={t.id} title={t.note || t.name} style={{ padding: '6px 4px', borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', verticalAlign: 'bottom' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, border: '1px solid var(--border)' }} />
                              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', writingMode: 'vertical-rl', maxHeight: 92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.name.trim() || '(이름)'}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scenes.map((s, si) => (
                        <tr key={s.id}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--panel)', padding: '4px 8px', borderBottom: '1px solid var(--border)', minWidth: 150 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {editScene === s.id ? (
                                <input
                                  value={editSceneName}
                                  onChange={(e) => setEditSceneName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEditScene() } if (e.key === 'Escape') { setEditScene(null) } }}
                                  onBlur={commitEditScene}
                                  autoFocus
                                  maxLength={50}
                                  style={{ ...c.input, padding: '3px 6px', fontSize: 12.5 }}
                                  aria-label="장면 이름 수정"
                                />
                              ) : (
                                <span
                                  onClick={() => startEditScene(s)}
                                  title="클릭해 이름 수정"
                                  style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{si + 1}. </span>{s.name || '(이름 없음)'}
                                </span>
                              )}
                              <button style={{ ...c.iconBtn, padding: '2px 5px' }} onClick={() => moveScene(s.id, -1)} disabled={si === 0} title="위로">▲</button>
                              <button style={{ ...c.iconBtn, padding: '2px 5px' }} onClick={() => moveScene(s.id, 1)} disabled={si === scenes.length - 1} title="아래로">▼</button>
                              <button style={{ ...c.iconBtn, padding: '2px 5px', color: 'var(--warn)' }} onClick={() => removeScene(s.id)} title="삭제">×</button>
                            </div>
                          </td>
                          {themes.map((t) => {
                            const v = cellOf(s.id, t.id)
                            return (
                              <td key={t.id} style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', padding: 0, textAlign: 'center' }}>
                                <button
                                  onClick={() => cycleCell(s.id, t.id)}
                                  title={`${s.name || '장면'} × ${t.name || '주제'}: ${STRENGTH_LABEL[v]} (눌러 변경)`}
                                  style={{
                                    width: '100%', minWidth: 48, height: 34, cursor: 'pointer',
                                    border: 'none', background: strengthBg(t.color, v),
                                    color: v === 3 ? '#fff' : 'var(--text)', fontSize: 11, fontWeight: 700,
                                  }}
                                  aria-label={`${s.name} × ${t.name} 강도`}
                                >
                                  {v ? STRENGTH_LABEL[v] : ''}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {/* 장면별 밀도 푸터 */}
                      <tr>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--chrome-2)', padding: '4px 8px', fontSize: 11, color: 'var(--muted)', borderTop: '2px solid var(--border)' }}>장면 주제 수 →</td>
                        {themes.map((t) => {
                          const cnt = scenes.reduce((acc, s) => acc + (cellOf(s.id, t.id) > 0 ? 1 : 0), 0)
                          return (
                            <td key={t.id} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: cnt === 0 ? 'var(--warn)' : 'var(--muted)', background: 'var(--chrome-2)', borderTop: '2px solid var(--border)', borderLeft: '1px solid var(--border)' }} title="이 주제가 등장한 장면 수">
                              {cnt}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div style={{ ...c.hint, marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>강도:</span>
              {([1, 2, 3] as Strength[]).map((v) => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: strengthBg('#5566cc', v), border: '1px solid var(--border)' }} />
                  {STRENGTH_LABEL[v]}
                </span>
              ))}
              <span style={{ flex: 1 }} />
              <span>밀도 {Math.round(density * 100)}% (채워진 칸 비율)</span>
            </div>
          </div>
        )}

        {/* ───────────────── 탭: 분포 점검 ───────────────── */}
        {tab === 'dist' && (
          <>
            {/* 진단 */}
            <div style={c.panel}>
              <div style={c.sectionTitle}>전체 점검</div>
              {diag.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.6, padding: '4px 0', color: d.tone === 'warn' ? 'var(--warn)' : d.tone === 'ok' ? 'var(--ok)' : 'var(--text)' }}>
                  <span style={{ flexShrink: 0 }}>{d.tone === 'warn' ? <Emoji e="⚠"/> : d.tone === 'ok' ? '✓' : '•'}</span>
                  <span>{d.text}</span>
                </div>
              ))}
            </div>

            {/* 주제별 분포 막대 */}
            <div style={c.panel}>
              <div style={c.sectionTitle}>주제별 분포 — 장면 순서대로 노출 강도 (막대 클릭=강조)</div>
              {namedThemeCount === 0 || scenes.length === 0 ? (
                <div style={c.empty}>주제와 장면을 등록하고 격자를 체크하면 분포가 표시됩니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stats.filter((s) => s.theme.name.trim()).map((s) => {
                    const pct = Math.round(s.ratio * 100)
                    const focused = focusTheme === s.theme.id
                    return (
                      <div
                        key={s.theme.id}
                        onClick={() => setFocusTheme(focused ? null : s.theme.id)}
                        style={{ cursor: 'pointer', padding: 8, borderRadius: 10, border: '1px solid ' + (focused ? s.theme.color : 'transparent'), background: focused ? hexA(s.theme.color, '14') : 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: s.theme.color, border: '1px solid var(--border)', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e={KIND_ICON[s.theme.kind]}/>{KIND_LABEL[s.theme.kind]}</span>
                          <b style={{ fontSize: 13 }}>{s.theme.name.trim()}</b>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11.5, color: s.hits === 0 ? 'var(--warn)' : 'var(--muted)' }}>
                            {s.hits}/{scenes.length}장 · {pct}% · 강도합 {s.weight}{s.hits ? ` · 최장공백 ${s.maxGap}` : ''}
                          </span>
                        </div>
                        {/* 장면 칸 막대 */}
                        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 44 }}>
                          {s.presence.map((v, i) => (
                            <div
                              key={i}
                              title={`${scenes[i]?.name || i + 1}: ${STRENGTH_LABEL[v]}`}
                              style={{
                                flex: 1, minWidth: 0,
                                height: v === 0 ? 4 : v === 1 ? 16 : v === 2 ? 30 : 44,
                                background: v === 0 ? 'var(--border)' : s.theme.color,
                                opacity: v === 0 ? 0.5 : 1,
                                borderRadius: 3,
                                alignSelf: 'flex-end',
                              }}
                            />
                          ))}
                        </div>
                        {s.hits === 0 && <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 4 }}>아직 어느 장면에도 드러나지 않았습니다.</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 장면별 주제 밀도 */}
            <div style={c.panel}>
              <div style={c.sectionTitle}>장면별 주제 밀도 — 한 장면에 몇 개의 주제가 깔렸는가</div>
              {scenes.length === 0 ? (
                <div style={c.empty}>장면이 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {scenes.map((s, i) => {
                    const cnt = sceneLoad[i]
                    const max = Math.max(1, namedThemeCount)
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 150, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={s.name}>
                          <span style={{ color: 'var(--muted)' }}>{i + 1}. </span>{s.name || '(이름 없음)'}
                        </span>
                        <div style={{ flex: 1, height: 16, background: 'var(--chrome-2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ width: `${(cnt / max) * 100}%`, height: '100%', background: cnt === 0 ? 'var(--warn)' : 'var(--accent)', opacity: cnt === 0 ? 0.4 : 0.85, transition: 'width .2s' }} />
                        </div>
                        <span style={{ width: 28, textAlign: 'right', fontSize: 12, fontWeight: 700, color: cnt === 0 ? 'var(--warn)' : 'var(--text)', flexShrink: 0 }}>{cnt}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* 연계 */}
        <div className="linkbar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || namedThemeCount === 0} title={hasProjectBridge() ? '자료 〈주제〉 폴더에 직조표 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          {hasStash() && <button className="linkbtn" onClick={toStash} title="수집함에 텍스트 메모로 담기"><Emoji e="🗃"/> 수집함에 담기</button>}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>좌측 바인더의 장면 파일을 격자로 드래그해 장면을 추가할 수 있어요.</span>
        </div>

        <div style={c.hint}>
          주제 직조는 “이 주제가 어디서 어떻게 드러나는가”를 장면 격자로 가시화하는 작업입니다.
          한 번 외친 주제는 잊히기 쉬우니, 상징·모티프를 곳곳에 되풀이해 짜 넣으세요. 모든 내용은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}

// ── 색 헬퍼 ──────────────────────────────────────────────────
// #rgb/#rrggbb 를 #rrggbb 로 정규화(input[type=color] 호환).
function normHex(c: string): string {
  const s = (c || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase()
  return '#5566cc'
}
// 색 + 알파(2자리 hex) → #rrggbbaa
function hexA(c: string, alpha: string): string {
  return normHex(c) + alpha
}
