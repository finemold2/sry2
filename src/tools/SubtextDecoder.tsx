// 서브텍스트 해독기 — 한 줄의 대사를 세 층으로 분해해 설계·대조하는 워크벤치.
//   1층 표면 의미: 글자 그대로의 뜻(상대가 즉시 듣는 말)
//   2층 이면 의도: 화자가 실제로 노리는 것(설득·회피·공격·호소…)
//   3층 감춘 감정: 입 밖에 내지 못하는 진짜 감정(두려움·수치·갈망…)
// 각 대사마다 화자/관계/전술/위장도(0~100, 말과 진심의 거리)를 붙이고, 전체를 '간극 지도'로 시각화한다.
// 자급식: react·linkbus 외 import 없음. 전부 브라우저 로컬 계산. localStorage 'sry:tool:subtext-decoder' 자동 저장/복원.
// 연계(linkbus): characters 라이브러리에서 화자 채우기, 좌측 바인더 문서/페이로드 텍스트를 대사 후보로 분해 수용,
//               프로젝트 자료('대사' 폴더)에 3층 대조표 문서 추가, 공유 스니펫 저장, 관련 도구 열기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, addToProject, hasProjectBridge,
  addToStash, hasStash, getDragItem, isItemDrag, openToolLinked,
} from './linkbus'

export const meta = {
  id: 'subtext-decoder',
  name: '서브텍스트 해독기',
  icon: '💬',
  group: '교정·언어',
  intro: '대사의 표면 의미·이면 의도·감춘 감정 세 층을 작성·대조하는 워크벤치',
  w: 480,
  h: 620,
}

// ── 전술(이면 의도의 작동 방식) ─────────────────────────────────────────────
interface Tactic { key: string; label: string; hint: string; hue: number }
const TACTICS: Tactic[] = [
  { key: 'evade', label: '회피', hint: '핵심을 비켜 다른 말로 덮는다', hue: 210 },
  { key: 'mask', label: '위장', hint: '반대 감정을 연기한다 (괜찮은 척)', hue: 265 },
  { key: 'probe', label: '떠보기', hint: '상대 속을 떠보려 던지는 말', hue: 175 },
  { key: 'barb', label: '에둘러 공격', hint: '칭찬·농담에 가시를 숨긴다', hue: 8 },
  { key: 'plead', label: '에둘러 호소', hint: '직접 못 하고 빙 돌려 구한다', hue: 330 },
  { key: 'steer', label: '통제', hint: '부드럽게, 실은 상대를 움직인다', hue: 35 },
  { key: 'leak', label: '새어나옴', hint: '숨기려다 진심이 새어나온다', hue: 290 },
  { key: 'direct', label: '직설', hint: '말과 진심이 거의 일치', hue: 130 },
]
function tacticDef(k: string): Tactic { return TACTICS.find((t) => t.key === k) || TACTICS[0] }

// ── 감춘 감정 팔레트(3층 빠른 채움 + 색) ───────────────────────────────────
interface Emo { key: string; label: string; hue: number }
const EMOTIONS: Emo[] = [
  { key: 'fear', label: '두려움', hue: 215 },
  { key: 'shame', label: '수치', hue: 18 },
  { key: 'longing', label: '갈망', hue: 330 },
  { key: 'anger', label: '분노', hue: 4 },
  { key: 'guilt', label: '죄책감', hue: 275 },
  { key: 'jealousy', label: '질투', hue: 95 },
  { key: 'hurt', label: '상처', hue: 250 },
  { key: 'pride', label: '자존심', hue: 40 },
  { key: 'loneliness', label: '외로움', hue: 200 },
  { key: 'hope', label: '기대', hue: 150 },
]

interface Line {
  id: string
  speaker: string    // 화자
  listener: string   // 청자/대상
  relation: string   // 관계(연인/상사/가족…)
  surface: string    // 1층 표면 의미
  intent: string     // 2층 이면 의도
  emotion: string    // 3층 감춘 감정
  tactic: string     // 전술
  veil: number       // 위장도 0~100 (말과 진심의 거리)
  manual?: boolean   // 사용자가 위장도/전술을 직접 손댐 → 표면 자동제안 중단
}

// 내장 예시 — 클릭하면 새 줄로 채워 감을 잡게 한다.
const EXAMPLES: Omit<Line, 'id'>[] = [
  { speaker: '연인', listener: '상대', relation: '연인', surface: '늦었네. 밥은 먹었어?', intent: '연락 없이 늦은 걸 따지고 싶다', emotion: '상처', tactic: 'mask', veil: 75 },
  { speaker: '부장', listener: '부하', relation: '상사', surface: '자네라면 더 할 수 있을 텐데.', intent: '결과가 부족하니 다시 하게 만들기', emotion: '분노', tactic: 'barb', veil: 70 },
  { speaker: '아들', listener: '부모', relation: '가족', surface: '됐어, 나 혼자 해도 돼.', intent: '먼저 손 내밀어 달라', emotion: '외로움', tactic: 'plead', veil: 85 },
  { speaker: '용의자', listener: '형사', relation: '대치', surface: '그 시간엔 집에 있었습니다.', intent: '알리바이를 굳혀 의심을 끊기', emotion: '두려움', tactic: 'mask', veil: 90 },
]

const LS_KEY = 'sry:tool:subtext-decoder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyLine(): Line {
  return { id: newId(), speaker: '', listener: '', relation: '', surface: '', intent: '', emotion: '', tactic: 'mask', veil: 60 }
}

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)) }

// 문자열 해시(결정론적 의사난수 시드용).
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

// 표면 대사에서 위장 단서를 휴리스틱 추정 → 초기 위장도/전술 제안(결정론적).
function suggestFromSurface(s: string): { veil: number; tactic: string } {
  const t = s.trim()
  if (!t) return { veil: 60, tactic: 'mask' }
  let veil = 50
  let tactic = 'mask'
  const has = (re: RegExp) => re.test(t)
  if (has(/괜찮|됐어|상관\s*없|아무것도\s*아니|신경\s*쓰지/)) { veil += 25; tactic = 'mask' }
  if (has(/\?$|\?|어때|어떻게\s*생각|혹시/)) { veil += 8; tactic = 'probe' }
  if (has(/대단|역시|잘했|훌륭/) && has(/\.{2,}|…|하긴|뭐/)) { veil += 18; tactic = 'barb' }
  if (has(/그냥|뭐|별로|어쩌라고/)) { veil += 12; tactic = 'evade' }
  if (has(/해\s*줘|도와|있어\s*줘|가지\s*마/)) { veil += 6; tactic = 'plead' }
  if (has(/^나는|^난|솔직히|사실/)) { veil -= 18; tactic = 'direct' }
  // 길이가 짧고 마침표로 끊으면 절제(위장) 가능성.
  if (t.length <= 8) veil += 6
  const seed = hashStr(t) % 9
  veil = clamp(veil + (seed - 4), 5, 98)
  return { veil: Math.round(veil), tactic }
}

// HTML 이스케이프.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 위장도 → 라벨.
function veilLabel(v: number): string {
  if (v >= 80) return '깊은 가면'
  if (v >= 55) return '돌려 말함'
  if (v >= 30) return '슬쩍 비침'
  return '거의 직설'
}

// localStorage 복원.
function loadState(): { scene: string; list: Line[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { scene: '', list: [] }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Line[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || newId()),
      speaker: String(x.speaker || ''),
      listener: String(x.listener || ''),
      relation: String(x.relation || ''),
      surface: String(x.surface || ''),
      intent: String(x.intent || ''),
      emotion: String(x.emotion || ''),
      tactic: TACTICS.some((t) => t.key === x.tactic) ? String(x.tactic) : 'mask',
      veil: clamp(Number.isFinite(Number(x.veil)) ? Number(x.veil) : 60, 0, 100),
      manual: x.manual === true ? true : undefined,
    }))
    return { scene: typeof p?.scene === 'string' ? p.scene : '', list }
  } catch { return { scene: '', list: [] } }
}

// 페이로드/드롭 텍스트 → 대사 후보로 분해(따옴표·줄 단위).
function splitDialogue(text: string): string[] {
  if (!text) return []
  const out: string[] = []
  // 1) 따옴표 안 문장 우선 추출.
  const q = text.match(/[“"「『]([^”"」』]{1,200})[”"」』]/g)
  if (q && q.length) {
    for (const m of q) out.push(m.replace(/^[“"「『]|[”"」』]$/g, '').trim())
  }
  if (out.length) return out.slice(0, 24)
  // 2) 줄 단위.
  for (const ln of text.split(/\r?\n/)) {
    const t = ln.replace(/^[-–—•·\s]+/, '').trim()
    if (t) out.push(t)
    if (out.length >= 24) break
  }
  return out
}

// 한 줄 텍스트 직렬화(복사/스니펫).
function lineToText(p: Line, i: number): string {
  const t = tacticDef(p.tactic)
  const who = p.speaker.trim() || '인물'
  const to = p.listener.trim() ? ` → ${p.listener.trim()}` : ''
  const rows = [
    `${i + 1}. [${who}${to}] ${t.label} · 위장 ${p.veil}(${veilLabel(p.veil)})`,
    `   1 표면: ${p.surface.trim() || '—'}`,
    `   2 의도: ${p.intent.trim() || '—'}`,
    `   3 감정: ${p.emotion.trim() || '—'}`,
  ]
  return rows.join('\n')
}

export default function SubtextDecoder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [scene, setScene] = useState(init.current.scene)
  const [list, setList] = useState<Line[]>(init.current.list)
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [dropHot, setDropHot] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null) // 간극 지도에서 선택 강조
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)

  const characters = useLibraryList('characters')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드 텍스트(다른 도구/대사 전달) → 대사 후보로 분해 적재(1회).
  useEffect(() => {
    if (!payload) return
    const seed = typeof payload.text === 'string' ? payload.text
      : typeof payload.surface === 'string' ? payload.surface : ''
    const sc = typeof payload.scene === 'string' ? payload.scene : ''
    if (sc && !scene) setScene(sc)
    if (seed.trim() && list.length === 0) {
      const parts = splitDialogue(seed)
      if (parts.length) {
        setList(parts.map((s) => {
          const sug = suggestFromSurface(s)
          return { ...emptyLine(), surface: s, veil: sug.veil, tactic: sug.tactic }
        }))
        setFlash(`텍스트에서 대사 ${parts.length}줄을 받았어요`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scene, list })) }
    catch { if (mounted.current) setFlash('저장이 막혀 있어 새로고침 시 내용이 사라질 수 있어요') }
  }, [scene, list])

  // 안내 자동 소거.
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2000)
    return () => window.clearTimeout(t)
  }, [flash])

  const addLine = () => setList((prev) => [...prev, emptyLine()])
  const addExample = (ex: Omit<Line, 'id'>) => setList((prev) => [...prev, { ...ex, id: newId() }])

  const setField = (id: string, k: keyof Line, v: string | number) =>
    setList((prev) => prev.map((p) => {
      if (p.id !== id) return p
      // 사용자가 위장도/전술을 직접 바꾸면 이후 표면 자동제안이 덮어쓰지 않도록 표시.
      const mark = (k === 'veil' || k === 'tactic') ? { manual: true } : null
      return { ...p, [k]: v, ...(mark || {}) }
    }))

  // 표면을 채울 때 위장도/전술 자동 제안(아직 손대지 않은 줄에만).
  const onSurface = (id: string, v: string) => {
    setList((prev) => prev.map((p) => {
      if (p.id !== id) return p
      const touched = p.manual || p.intent || p.emotion
      if (touched || !v.trim()) return { ...p, surface: v }
      const sug = suggestFromSurface(v)
      return { ...p, surface: v, veil: sug.veil, tactic: sug.tactic }
    }))
  }

  const remove = (id: string) => { setList((prev) => prev.filter((p) => p.id !== id)); setConfirmDel(null) }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경.
  const onReorderDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((p) => p.id === from)
      const ti = prev.findIndex((p) => p.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // 좌측 바인더 문서 드롭 → 본문에서 대사 후보 분해 적재.
  const onBinderDrop = (e: React.DragEvent) => {
    setDropHot(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const txt = (item.text || '').trim()
    const parts = splitDialogue(txt)
    if (!parts.length) { setFlash('이 문서에서 대사를 찾지 못했어요'); return }
    if (item.title && !scene) setScene(item.title)
    setList((prev) => [...prev, ...parts.map((s) => {
      const sug = suggestFromSurface(s)
      return { ...emptyLine(), surface: s, veil: sug.veil, tactic: sug.tactic }
    })])
    setFlash(`"${item.title}"에서 대사 ${parts.length}줄을 받았어요`)
  }

  const filled = useMemo(() => list.filter((p) => p.surface.trim() || p.intent.trim() || p.emotion.trim()), [list])

  // 분석 지표.
  const stats = useMemo(() => {
    if (!filled.length) return null
    const avg = Math.round(filled.reduce((a, p) => a + p.veil, 0) / filled.length)
    const max = filled.reduce((m, p) => (p.veil > m.veil ? p : m), filled[0])
    const min = filled.reduce((m, p) => (p.veil < m.veil ? p : m), filled[0])
    const tacticCount: Record<string, number> = {}
    for (const p of filled) tacticCount[p.tactic] = (tacticCount[p.tactic] || 0) + 1
    const topTactic = Object.entries(tacticCount).sort((a, b) => b[1] - a[1])[0]
    // 3층이 모두 채워진 비율(완성도).
    const complete = filled.filter((p) => p.surface.trim() && p.intent.trim() && p.emotion.trim()).length
    return { avg, max, min, topTactic, complete, total: filled.length }
  }, [filled])

  const exportText = (): string => {
    const head = scene.trim() ? `# ${scene.trim()}\n\n` : ''
    const body = filled.map(lineToText).join('\n\n')
    const tail = stats ? `\n\n— 평균 위장도 ${stats.avg} · 최다 전술 ${tacticDef(stats.topTactic[0]).label}` : ''
    return head + body + tail
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setFlash(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setFlash('복사 실패') }
  }

  // 프로젝트 3층 대조표 본문(HTML).
  const bodyHtml = (): string => {
    const dash = '<span style="color:#888">—</span>'
    const cell = (s: string) => (s.trim() ? escHtml(s.trim()) : dash)
    const th = 'padding:6px 8px;border:1px solid #ccc;text-align:left;background:#f2f2f2;font-size:13px'
    const td = 'padding:6px 8px;border:1px solid #ccc;vertical-align:top;font-size:13px'
    const rows = filled.map((p, i) => {
      const t = tacticDef(p.tactic)
      const who = cell(p.speaker) + (p.listener.trim() ? ` <span style="color:#888">→ ${escHtml(p.listener.trim())}</span>` : '')
      const bar = `<div style="height:6px;background:#e3e3e3;border-radius:3px;overflow:hidden"><div style="height:6px;width:${p.veil}%;background:hsl(${t.hue} 70% 50%)"></div></div>`
      return `<tr>
<td style="${td}">${i + 1}</td>
<td style="${td}">${who}</td>
<td style="${td}">${cell(p.surface)}</td>
<td style="${td}">${cell(p.intent)}</td>
<td style="${td}">${cell(p.emotion)}</td>
<td style="${td}">${escHtml(t.label)}</td>
<td style="${td}">${bar}<div style="font-size:11px;color:#666;margin-top:2px">${p.veil} · ${veilLabel(p.veil)}</div></td>
</tr>`
    }).join('')
    const summary = stats
      ? `<p style="font-size:13px;color:#555">평균 위장도 <b>${stats.avg}</b> · 최다 전술 <b>${escHtml(tacticDef(stats.topTactic[0]).label)}</b> · 3층 완성 ${stats.complete}/${stats.total}</p>`
      : ''
    return `${summary}<table style="border-collapse:collapse;width:100%">
<thead><tr>
<th style="${th}">#</th><th style="${th}">화자</th><th style="${th}">1 표면 의미</th><th style="${th}">2 이면 의도</th><th style="${th}">3 감춘 감정</th><th style="${th}">전술</th><th style="${th}">위장도</th>
</tr></thead>
<tbody>${rows}</tbody></table>`
  }

  const linked = hasProjectBridge()

  const toProject = () => {
    if (!linked) { setFlash('프로젝트에 연결되지 않았습니다'); return }
    if (filled.length === 0) { setFlash('내보낼 대사가 없어요'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '대사',
      title: scene.trim() ? `서브텍스트 해독 — ${scene.trim()}` : '서브텍스트 해독',
      bodyHtml: bodyHtml(),
      synopsis: `대사 ${filled.length}줄 · 평균 위장도 ${stats?.avg ?? '—'} — 표면/의도/감정 3층 대조`,
      meta: { 대사수: String(filled.length), 평균위장도: String(stats?.avg ?? ''), 장면: scene.trim() || '—' },
    })
    setFlash(id ? '프로젝트 자료에 대조표 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const toSnippet = () => {
    if (filled.length === 0) { setFlash('저장할 대사가 없어요'); return }
    addToLibrary('snippets', { text: exportText(), source: '서브텍스트 해독기', tags: ['대사', '서브텍스트', ...(scene.trim() ? [scene.trim()] : [])] })
    setFlash('스니펫으로 저장됨')
  }

  const toStash = () => {
    if (!hasStash()) { setFlash('수집함이 없습니다'); return }
    if (filled.length === 0) { setFlash('담을 대사가 없어요'); return }
    addToStash({ kind: 'memo', label: scene.trim() ? `서브텍스트 — ${scene.trim()}` : '서브텍스트 해독', text: exportText() })
    setFlash('수집함에 담겼어요')
  }

  // 캐릭터 한 명을 새 줄 화자로(말투가 있으면 표면에 힌트로 채워봄).
  const addFromCharacter = (name: string, speechHint: string) => {
    const ln = emptyLine()
    ln.speaker = name
    if (speechHint.trim()) ln.surface = speechHint.trim()
    setList((prev) => [...prev, ln])
    setFlash(`화자 "${name}" 줄을 추가했어요`)
  }

  // 관계도/캐릭터 시트로 화자 데이터를 넘겨 열기.
  const openRelated = (toolId: string) => {
    openToolLinked(toolId, {
      scene: scene.trim(),
      text: exportText(),
      speakers: Array.from(new Set(filled.map((p) => p.speaker.trim()).filter(Boolean))),
    })
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 40, lineHeight: 1.5, fontFamily: 'inherit' }
  const layerBox = (hue: number, accent: boolean): React.CSSProperties => ({
    border: `1px solid ${accent ? `hsl(${hue} 60% 55%)` : 'var(--border)'}`,
    borderLeft: `3px solid hsl(${hue} 65% 52%)`,
    borderRadius: 8, padding: 8, background: 'var(--paper)',
  })

  // 간극 지도(미니 막대) — 각 줄의 위장도를 한 화면에 대조.
  const gapMap = filled.length >= 2 && (
    <div style={{ padding: 10, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>간극 지도 — 말과 진심의 거리(위장도)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64, marginBottom: 6 }}>
        {filled.map((p) => {
          const t = tacticDef(p.tactic)
          const on = focusId === p.id
          return (
            <div
              key={p.id}
              onClick={() => setFocusId(on ? null : p.id)}
              title={`${p.speaker.trim() || '인물'} · ${t.label} · 위장 ${p.veil}\n${p.surface.trim() || ''}`}
              style={{ flex: 1, minWidth: 6, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', height: '100%' }}
            >
              <div style={{ height: `${clamp(p.veil, 4, 100)}%`, background: `hsl(${t.hue} ${on ? 80 : 62}% ${on ? 48 : 55}%)`, borderRadius: '3px 3px 0 0', outline: on ? '2px solid var(--text)' : 'none', transition: 'height .15s' }} />
            </div>
          )
        })}
      </div>
      {stats && (
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
          평균 <b style={{ color: 'var(--text)' }}>{stats.avg}</b> ({veilLabel(stats.avg)}) · 최고 {stats.max.veil}({stats.max.speaker.trim() || '인물'}) · 최저 {stats.min.veil}({stats.min.speaker.trim() || '인물'}) · 최다 전술 {tacticDef(stats.topTactic[0]).label} · 3층 완성 {stats.complete}/{stats.total}
        </div>
      )}
    </div>
  )

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropHot(false) }}
      onDrop={onBinderDrop}
    >
      <div style={header}>
        <strong style={{ fontSize: 14 }}>서브텍스트 해독기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{filled.length}/{list.length}줄</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportText(), '전체 복사됨')} disabled={filled.length === 0} title="3층 대조 전체 텍스트 복사">복사</button>
        <button className="btn-primary" onClick={addLine}>＋ 대사</button>
      </div>

      <div style={scroll}>
        {/* 드롭 안내 */}
        {dropHot && (
          <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, border: '2px dashed var(--accent)', textAlign: 'center', fontSize: 12, color: 'var(--accent)' }}>
            여기에 놓으면 문서 본문에서 대사를 자동으로 분해해 불러옵니다
          </div>
        )}

        {/* 장면 */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>장면 (선택)</div>
          <input style={input} value={scene} onChange={(e) => setScene(e.target.value)} placeholder="이 대사들이 오가는 장면. 예: 비 오는 날 현관에서의 재회" maxLength={100} />
        </div>

        {/* 안내 + 예시 */}
        <div style={{ padding: 11, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, lineHeight: 1.65, marginBottom: 8 }}>
            한 줄의 대사를 세 층으로 갈라 보세요. <b>1 표면 의미</b>(글자 그대로) ·
            <b> 2 이면 의도</b>(실제로 노리는 것) · <b>3 감춘 감정</b>(입 밖에 못 내는 진짜 감정).
            세 층의 거리가 멀수록 <b>위장도</b>가 높고, 대사에 긴장이 생깁니다.
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}>예시로 시작하기</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="minibtn" onClick={() => addExample(ex)} title={`표면: ${ex.surface}\n의도: ${ex.intent}\n감정: ${ex.emotion}`} style={{ fontSize: 11 }}>
                {ex.speaker}: “{ex.surface.length > 12 ? ex.surface.slice(0, 12) + '…' : ex.surface}”
              </button>
            ))}
          </div>
        </div>

        {/* 캐릭터 라이브러리 연동 */}
        {characters.length > 0 && (
          <div style={{ padding: 11, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>인물 라이브러리에서 화자 넣기</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {characters.slice(0, 12).map((c) => {
                const speech = c.fields?.speech || ''
                return (
                  <button
                    key={c.id}
                    className="minibtn"
                    onClick={() => addFromCharacter(c.name || '인물', speech)}
                    title={speech ? `말투: ${speech}` : '이 인물을 화자로 새 줄 추가'}
                    style={{ fontSize: 11 }}
                  >{c.name || '이름없음'}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* 간극 지도 */}
        {gapMap}

        {/* 대사 목록 */}
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '30px 16px' }}>
            아직 대사가 없어요.<br />
            위 <b>예시</b>를 누르거나, 오른쪽 위 <b>＋ 대사</b>로 시작하세요.<br />
            좌측 바인더의 원고 문서를 이 창에 끌어다 놓으면 대사를 자동 분해합니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((p, i) => {
              const t = tacticDef(p.tactic)
              const on = focusId === p.id
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => { dragId.current = p.id }}
                  onDragOver={(e) => { if (!isItemDrag(e)) { e.preventDefault(); if (dragOver !== p.id) setDragOver(p.id) } }}
                  onDragLeave={() => { if (dragOver === p.id) setDragOver(null) }}
                  onDrop={(e) => { if (!isItemDrag(e)) onReorderDrop(p.id) }}
                  onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                  style={{
                    border: '1px solid var(--border)',
                    outline: dragOver === p.id ? '2px dashed var(--accent)' : on ? '2px solid var(--text)' : 'none',
                    background: 'var(--panel)', borderRadius: 11, padding: 11,
                  }}
                >
                  {/* 머리: 핸들·번호·화자·청자·관계·이동·삭제 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 13 }} title="드래그로 순서 변경">⠿</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                    <input style={{ ...input, padding: '4px 7px', fontSize: 12, width: 96 }} value={p.speaker} onChange={(e) => setField(p.id, 'speaker', e.target.value)} placeholder="화자" maxLength={40} />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>to</span>
                    <input style={{ ...input, padding: '4px 7px', fontSize: 12, width: 84 }} value={p.listener} onChange={(e) => setField(p.id, 'listener', e.target.value)} placeholder="청자" maxLength={40} />
                    <input style={{ ...input, padding: '4px 7px', fontSize: 12, width: 78 }} value={p.relation} onChange={(e) => setField(p.id, 'relation', e.target.value)} placeholder="관계" maxLength={30} />
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, -1)} disabled={i === 0} title="위로">▲</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => move(p.id, 1)} disabled={i === list.length - 1} title="아래로">▼</button>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmDel(p.id)} title="삭제">x</button>
                  </div>

                  {confirmDel === p.id && (
                    <div style={{ marginBottom: 9, padding: 8, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 12 }}>
                      <span style={{ color: 'var(--warn)', marginRight: 8 }}>이 대사를 삭제할까요?</span>
                      <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={() => remove(p.id)}>삭제</button>
                      <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11, marginLeft: 5 }} onClick={() => setConfirmDel(null)}>취소</button>
                    </div>
                  )}

                  {/* 3층 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={layerBox(200, false)}>
                      <div style={label}>1층 · 표면 의미 — 글자 그대로의 말</div>
                      <textarea style={area} value={p.surface} onChange={(e) => onSurface(p.id, e.target.value)} placeholder='실제로 입 밖에 내는 말. 예: "괜찮아, 신경 쓰지 마."' maxLength={400} />
                    </div>
                    <div style={layerBox(35, false)}>
                      <div style={label}>2층 · 이면 의도 — 실제로 노리는 것</div>
                      <textarea style={area} value={p.intent} onChange={(e) => setField(p.id, 'intent', e.target.value)} placeholder='이 말로 상대에게서 얻으려는 것. 예: "내 서운함을 네가 먼저 알아채길."' maxLength={400} />
                    </div>
                    <div style={layerBox(330, false)}>
                      <div style={label}>3층 · 감춘 감정 — 입 밖에 못 내는 진짜 감정</div>
                      <textarea style={{ ...area, minHeight: 36 }} value={p.emotion} onChange={(e) => setField(p.id, 'emotion', e.target.value)} placeholder='가장 깊은 층. 예: "버려질까 봐 두렵다."' maxLength={300} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {EMOTIONS.map((em) => (
                          <button
                            key={em.key}
                            className="minibtn"
                            onClick={() => setField(p.id, 'emotion', p.emotion.trim() ? p.emotion : em.label)}
                            style={{ fontSize: 10.5, padding: '2px 7px', borderColor: `hsl(${em.hue} 50% 60%)` }}
                            title={`감정 빠른 채움: ${em.label}`}
                          >{em.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 전술 + 위장도 */}
                  <div style={{ marginTop: 9 }}>
                    <div style={label}>전술 — 진심을 어떻게 돌려 말하는가</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {TACTICS.map((tc) => (
                        <button
                          key={tc.key}
                          className={'minibtn' + (p.tactic === tc.key ? ' active' : '')}
                          onClick={() => setField(p.id, 'tactic', tc.key)}
                          style={{ fontSize: 11, padding: '3px 8px', borderColor: p.tactic === tc.key ? `hsl(${tc.hue} 60% 50%)` : 'var(--border)', background: p.tactic === tc.key ? 'var(--chrome-2)' : undefined }}
                          title={tc.hint}
                        >{tc.label}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t.label}: {t.hint}</div>
                  </div>

                  <div style={{ marginTop: 9 }}>
                    <div style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
                      <span>위장도 — 말과 진심의 거리</span>
                      <span style={{ color: `hsl(${t.hue} 55% 50%)`, fontWeight: 700 }}>{p.veil} · {veilLabel(p.veil)}</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={p.veil}
                      onChange={(e) => setField(p.id, 'veil', clamp(Number(e.target.value), 0, 100))}
                      style={{ width: '100%', accentColor: `hsl(${t.hue} 60% 50%)` }}
                      title="0 = 거의 직설, 100 = 깊은 가면"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 연계 */}
        <div className="linkbar" style={{ marginTop: 16, flexWrap: 'wrap', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!linked || filled.length === 0} title={!linked ? '프로젝트에 연결되어 있지 않습니다' : filled.length === 0 ? '내보낼 대사가 없습니다' : '3층 대조표를 프로젝트 자료(대사 폴더)에 추가'}>프로젝트에 추가</button>
          <button className="linkbtn" onClick={toSnippet} disabled={filled.length === 0} title={filled.length === 0 ? '저장할 대사가 없습니다' : '전체 3층 대조를 공유 스니펫으로 저장'}>스니펫 저장</button>
          <button className="linkbtn" onClick={toStash} disabled={!hasStash() || filled.length === 0} title={!hasStash() ? '수집함이 없습니다' : '수집함에 메모로 담기'}>수집함</button>
          <button className="linkbtn" onClick={() => openRelated('character-voice')} disabled={filled.length === 0} title="화자 데이터와 함께 인물 보이스 도구 열기">인물 보이스</button>
          <button className="linkbtn" onClick={() => openRelated('relationship-map')} disabled={filled.length === 0} title="화자 목록과 함께 관계도 열기">관계도</button>
        </div>

        <div className="license-note" style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          전술·감정 분류와 위장도 추정은 일반 작법 개념으로 본 도구가 직접 작성·계산합니다(자작/오픈). 모든 입력과 산출물은 이 브라우저에만 저장됩니다.
        </div>
      </div>
    </div>
  )
}
