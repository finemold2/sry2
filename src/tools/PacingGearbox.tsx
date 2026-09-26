// 페이싱 기어박스 — 장면마다 '기어'를 배분해 이야기의 리듬을 설계·진단한다.
//   기어(4단): 요약(Summary) / 장면(Scene) / 성찰(Reflection) / 대사(Dialogue).
//     · 요약 = 시간을 건너뛰며 압축(빠르게 진행, 거리감).
//     · 장면 = 실시간 묘사·행동(몰입, 느린 체감 속도).
//     · 성찰 = 인물 내면·해석(정서 정리, 가장 느림).
//     · 대사 = 인물 간 대화 중심(중간 속도, 긴장·정보 동시 전달).
//   각 기어에는 '속도(tempo)'와 '긴장(tension)' 기본값이 있고, 장면별로 강도(1~5)로 조절한다.
//   진단: 같은 기어가 연속되면(단조) 경고. 속도/긴장 곡선이 평탄하면(변화 없음) 경고.
//        절정 부근에서 속도가 떨어지면 경고. 대사/장면 없이 요약만 길게 이어지면 경고.
// 자급식: react·linkbus 외 import 없음. 전부 로컬 계산. localStorage 'sry:tool:pacing-gearbox' 자동 저장/복원.
// 연계(linkbus): 좌측 바인더 문서 드롭/ payload.text 로 본문을 받아 기어 자동 추정 ·
//   라이브러리 snippets 수용 · 진단 리포트를 프로젝트(자료/'구조')에 문서로 추가 · 수집함 담기 · 관련 도구 열기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  useLibraryList, addToLibrary,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'pacing-gearbox',
  name: '페이싱 기어박스',
  icon: '⚙️',
  group: '구조',
  intro: '장면마다 기어(요약·장면·성찰·대사)를 배분하고 단조로운 연속을 경고해 리듬을 최적화하세요',
  w: 480,
  h: 620,
}

// ── 기어 정의 ──
type GearKey = 'summary' | 'scene' | 'reflection' | 'dialogue'
interface GearDef {
  key: GearKey
  label: string
  tag: string        // 화면용 짧은 표식(이모지 글리프 대신 텍스트/도형)
  tempo: number      // 기본 속도 0~100 (높을수록 빠름)
  tension: number    // 기본 긴장 0~100
  color: string
  desc: string
}
const GEARS: GearDef[] = [
  { key: 'summary',    label: '요약', tag: '[요]', tempo: 88, tension: 30, color: '#3b82f6', desc: '시간을 압축해 빠르게 건너뜀. 거리감·정보 전달.' },
  { key: 'scene',      label: '장면', tag: '[장]', tempo: 46, tension: 70, color: '#ef4444', desc: '실시간 행동·묘사. 몰입과 체감 지연.' },
  { key: 'reflection', label: '성찰', tag: '[성]', tempo: 22, tension: 38, color: '#a855f7', desc: '내면·해석. 가장 느림. 정서 정리.' },
  { key: 'dialogue',   label: '대사', tag: '[대]', tempo: 60, tension: 58, color: '#10b981', desc: '대화 중심. 중간 속도. 긴장·정보 동시.' },
]
const GEAR_BY: Record<GearKey, GearDef> = Object.fromEntries(GEARS.map((g) => [g.key, g])) as Record<GearKey, GearDef>

// ── 장면 데이터 모델 ──
interface ScNode {
  id: string
  title: string
  gear: GearKey
  intensity: number   // 1~5 (기본값 보정 계수)
  words: number       // 분량(단어/글자 수, 비중 표시)
  note: string
}

const LS_KEY = 'sry:tool:pacing-gearbox'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function str(v: unknown): string { return typeof v === 'string' ? v : v == null ? '' : String(v) }
function num(v: unknown, d: number): number { const n = Number(v); return Number.isFinite(n) ? n : d }
function clamp(n: number, lo: number, hi: number): number { return n < lo ? lo : n > hi ? hi : n }

// 장면의 실효 속도/긴장 — 기어 기본값을 강도(1~5)로 보정. 강도 3=기본.
function effTempo(s: ScNode): number {
  const base = GEAR_BY[s.gear].tempo
  // 강도가 높을수록 장면은 더 강렬해짐 → 긴장↑, 빠른 기어는 더 빠르게/느린 기어는 더 느리게(대비 강화)
  const f = (s.intensity - 3) * 6
  return clamp(Math.round(base + (base >= 55 ? f : -f * 0.5)), 0, 100)
}
function effTension(s: ScNode): number {
  const base = GEAR_BY[s.gear].tension
  return clamp(Math.round(base + (s.intensity - 3) * 11), 0, 100)
}

// ── 본문 → 기어 자동 추정(결정론적 휴리스틱) ──
// 따옴표 비율↑ → 대사 / "그날·이후·며칠·세월·요약형" 시간경과어↑ → 요약 / 1인칭 내면·감정어↑ → 성찰 / 그 외 → 장면.
const TIME_SKIP = ['며칠', '몇 주', '몇 달', '몇 년', '이후', '그날부터', '세월', '시간이 흘', '얼마 뒤', '한참 뒤', '다음 날', '그 무렵', '결국', '마침내', '한동안']
const INNER = ['생각했다', '느꼈다', '깨달았다', '기억', '마음', '두려', '후회', '돌이켜', '문득', '왜', '어쩌면', '스스로', '자신이']
function guessGear(text: string): GearKey {
  const t = text || ''
  if (!t.trim()) return 'scene'
  const len = Math.max(1, t.length)
  // 대사 비율
  const quoted = (t.match(/[“"][^”"]{1,400}[”"]/g) || []).join('').length
  const qRatio = quoted / len
  if (qRatio > 0.28) return 'dialogue'
  // 시간 경과(요약)
  let skip = 0; TIME_SKIP.forEach((w) => { if (t.includes(w)) skip++ })
  // 내면(성찰)
  let inner = 0; INNER.forEach((w) => { const m = t.split(w).length - 1; inner += m })
  const innerDensity = inner / (len / 400)
  const sentences = Math.max(1, (t.match(/[.!?。…]|\n/g) || []).length)
  const avgSent = len / sentences
  if (skip >= 2 && avgSent > 55) return 'summary'
  if (innerDensity > 1.6 && qRatio < 0.08) return 'reflection'
  if (skip >= 3) return 'summary'
  if (qRatio > 0.12) return 'dialogue'
  return 'scene'
}
function wordCount(text: string): number {
  const t = (text || '').trim()
  if (!t) return 0
  // 한국어는 공백 기준이 부정확 → 글자수(공백 제외)로 비중만 표시
  return t.replace(/\s/g, '').length
}
// 본문을 빈 줄/장면 구분선 기준으로 분할 → 장면 노드 후보.
function splitScenes(text: string): { title: string; body: string }[] {
  const t = (text || '').replace(/\r/g, '')
  if (!t.trim()) return []
  // 구분: 2줄 이상 공백 또는 ─/*** 같은 구분선
  const blocks = t.split(/\n\s*\n|\n\s*[-─*=]{3,}\s*\n/).map((b) => b.trim()).filter(Boolean)
  const src = blocks.length > 1 ? blocks : [t.trim()]
  return src.slice(0, 60).map((b) => {
    const firstLine = b.split('\n')[0].trim()
    const title = firstLine.length <= 36 ? firstLine : firstLine.slice(0, 34) + '…'
    return { title: title || '장면', body: b }
  })
}

// ── 진단 ──
interface Issue { kind: 'mono' | 'flat' | 'climax' | 'overSummary' | 'noDialogue'; sev: 1 | 2; at: number[]; msg: string; fix: string }
function diagnose(list: ScNode[]): Issue[] {
  const out: Issue[] = []
  if (list.length < 2) return out
  // 1) 단조: 같은 기어가 3개 이상 연속
  let runStart = 0
  for (let i = 1; i <= list.length; i++) {
    if (i < list.length && list[i].gear === list[runStart].gear) continue
    const runLen = i - runStart
    if (runLen >= 3) {
      const idxs = []; for (let k = runStart; k < i; k++) idxs.push(k)
      out.push({
        kind: 'mono', sev: runLen >= 4 ? 2 : 1, at: idxs,
        msg: `${GEAR_BY[list[runStart].gear].label} 기어가 ${runLen}연속 — 리듬이 단조로워요`,
        fix: '중간에 다른 기어(예: 대사↔장면, 요약↔성찰)를 끼워 변화를 주세요.',
      })
    }
    runStart = i
  }
  // 2) 평탄: 속도 표준편차가 매우 낮음(변화 없음)
  const temps = list.map(effTempo)
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length
  const sd = Math.sqrt(temps.reduce((a, b) => a + (b - mean) ** 2, 0) / temps.length)
  if (sd < 12 && list.length >= 4) {
    out.push({ kind: 'flat', sev: 1, at: [], msg: `속도 변화 폭이 작아요(편차 ${sd.toFixed(0)}) — 전체가 비슷한 속도`, fix: '느린 장면·빠른 요약을 의도적으로 교차해 완급(緩急)을 만드세요.' })
  }
  // 3) 절정 부근(후반 25~85% 구간 최대 긴장 지점) 직전이 느린 기어로 떨어짐
  const tens = list.map(effTension)
  let peak = 0; for (let i = 0; i < tens.length; i++) if (tens[i] > tens[peak]) peak = i
  if (peak > 0 && peak >= list.length * 0.4) {
    const before = list[peak - 1]
    if (before.gear === 'reflection' || effTempo(before) < 30) {
      out.push({ kind: 'climax', sev: 1, at: [peak - 1, peak], msg: '절정 직전에 속도가 크게 떨어져요', fix: '절정 직전 한 박자만 성찰을 두고, 진입은 장면/대사로 가속하세요.' })
    }
  }
  // 4) 요약 과다: 요약 기어 비중이 분량의 45% 이상
  const totW = Math.max(1, list.reduce((a, s) => a + Math.max(1, s.words), 0))
  const sumW = list.filter((s) => s.gear === 'summary').reduce((a, s) => a + Math.max(1, s.words), 0)
  if (sumW / totW > 0.45 && list.length >= 3) {
    out.push({ kind: 'overSummary', sev: 2, at: list.map((s, i) => (s.gear === 'summary' ? i : -1)).filter((i) => i >= 0), msg: `요약 분량이 전체의 ${Math.round((sumW / totW) * 100)}% — 요약 과다(말하기>보여주기)`, fix: '핵심 전환점은 요약 대신 장면으로 직접 보여주세요.' })
  }
  // 5) 대사 전무
  if (list.length >= 4 && !list.some((s) => s.gear === 'dialogue')) {
    out.push({ kind: 'noDialogue', sev: 1, at: [], msg: '대사 기어가 한 번도 없어요', fix: '대화는 긴장과 정보를 빠르게 전달합니다. 핵심 장면 하나를 대사로 전환해 보세요.' })
  }
  return out
}

// 리듬 점수(0~100): 단조 페널티 + 변화 보너스. 높을수록 리듬이 살아 있음.
function rhythmScore(list: ScNode[], issues: Issue[]): number {
  if (list.length < 2) return list.length === 1 ? 60 : 0
  let score = 70
  // 기어 전환 횟수 보너스
  let switches = 0; for (let i = 1; i < list.length; i++) if (list[i].gear !== list[i - 1].gear) switches++
  score += Math.min(20, Math.round((switches / (list.length - 1)) * 24))
  // 속도 편차 보너스
  const temps = list.map(effTempo)
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length
  const sd = Math.sqrt(temps.reduce((a, b) => a + (b - mean) ** 2, 0) / temps.length)
  score += Math.min(12, Math.round(sd / 3))
  // 이슈 페널티
  issues.forEach((is) => { score -= is.sev === 2 ? 14 : 7 })
  return clamp(score, 0, 100)
}

function escHtml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// ── localStorage 복원 ──
interface SaveState { list: ScNode[]; openId: string | null }
function loadState(): SaveState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: ScNode[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const gk = ['summary', 'scene', 'reflection', 'dialogue'].includes(x.gear) ? x.gear : 'scene'
      return {
        id: str(x.id) || newId(),
        title: str(x.title),
        gear: gk as GearKey,
        intensity: clamp(Math.round(num(x.intensity, 3)), 1, 5),
        words: Math.max(0, Math.round(num(x.words, 0))),
        note: str(x.note),
      }
    })
    const openId = typeof p?.openId === 'string' && list.some((b) => b.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function PacingGearbox({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<ScNode[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [flash, setFlash] = useState('')
  const [note, setNote] = useState('')
  const [view, setView] = useState<'rhythm' | 'graph'>('rhythm')
  const [dropHot, setDropHot] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const flashNonce = useRef(0)

  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.text / payload.title 1회 수용 → 자동 분할·기어 추정.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const text = str(payload.text)
    if (text.trim()) { ingestText(text) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  const showFlash = (msg: string) => {
    setFlash(msg)
    const n = ++flashNonce.current
    window.setTimeout(() => { if (mounted.current && flashNonce.current === n) setFlash('') }, 1900)
  }

  // 본문 텍스트를 장면들로 변환해 목록에 추가.
  function ingestText(text: string, baseTitle?: string) {
    const parts = splitScenes(text)
    if (parts.length === 0) { showFlash('본문이 비어 있어요'); return }
    const nodes: ScNode[] = parts.map((p, i) => ({
      id: newId(),
      title: parts.length > 1 ? (p.title || `장면 ${i + 1}`) : (baseTitle || p.title || '장면 1'),
      gear: guessGear(p.body),
      intensity: 3,
      words: wordCount(p.body),
      note: '',
    }))
    setList((prev) => [...prev, ...nodes])
    if (nodes.length) setOpenId(nodes[0].id)
    showFlash(`본문에서 ${nodes.length}개 장면을 기어로 추정해 추가했어요`)
  }

  // 드롭 수용(좌측 바인더 문서).
  const onDropZone = (e: React.DragEvent) => {
    setDropHot(false)
    const it = getDragItem(e)
    if (it && (it.text || it.title)) {
      e.preventDefault()
      ingestText(it.text || '', it.title)
    }
  }

  const addBlank = () => {
    const n: ScNode = { id: newId(), title: `장면 ${list.length + 1}`, gear: 'scene', intensity: 3, words: 0, note: '' }
    setList((prev) => [...prev, n]); setOpenId(n.id)
  }
  const patch = (id: string, p: Partial<ScNode>) => setList((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const remove = (id: string) => { setList((prev) => prev.filter((s) => s.id !== id)); if (openId === id) setOpenId(null) }
  const move = (id: string, dir: -1 | 1) => setList((prev) => {
    const i = prev.findIndex((s) => s.id === id); if (i < 0) return prev
    const j = i + dir; if (j < 0 || j >= prev.length) return prev
    const next = prev.slice(); [next[i], next[j]] = [next[j], next[i]]; return next
  })
  const onReorder = (targetId: string) => {
    const from = dragId.current; dragId.current = null; setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((s) => s.id === from); const ti = prev.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice(); const [m] = next.splice(fi, 1); next.splice(ti, 0, m); return next
    })
  }

  const issues = useMemo(() => diagnose(list), [list])
  const score = useMemo(() => rhythmScore(list, issues), [list, issues])
  const issueIdx = useMemo(() => { const m = new Set<number>(); issues.forEach((is) => is.at.forEach((i) => m.add(i))); return m }, [issues])

  // 기어 분포(분량 가중).
  const dist = useMemo(() => {
    const totW = Math.max(1, list.reduce((a, s) => a + Math.max(1, s.words), 0))
    return GEARS.map((g) => {
      const w = list.filter((s) => s.gear === g.key).reduce((a, s) => a + Math.max(1, s.words), 0)
      const cnt = list.filter((s) => s.gear === g.key).length
      return { g, cnt, pct: Math.round((w / totW) * 100) }
    })
  }, [list])

  // ── 산출/연계 ──
  function reportText(): string {
    const lines: string[] = ['# 페이싱 기어박스 리듬 리포트', `리듬 점수: ${score}/100  ·  장면 ${list.length}개`, '']
    lines.push('[기어 배열]')
    list.forEach((s, i) => lines.push(`${i + 1}. ${GEAR_BY[s.gear].tag} ${GEAR_BY[s.gear].label}  강도${s.intensity}  속도${effTempo(s)} 긴장${effTension(s)}  — ${s.title || '제목 없음'}${s.note.trim() ? `  (${s.note.trim()})` : ''}`))
    lines.push('', '[기어 분포]')
    dist.forEach((d) => lines.push(`· ${d.g.label}: ${d.cnt}장면 / 분량 ${d.pct}%`))
    lines.push('', '[진단]')
    if (issues.length === 0) lines.push('· 큰 리듬 문제가 발견되지 않았어요. 변화가 잘 살아 있습니다.')
    else issues.forEach((is) => lines.push(`· (${is.sev === 2 ? '주의' : '참고'}) ${is.msg}\n   → ${is.fix}`))
    return lines.join('\n')
  }
  function reportHtml(): string {
    const rows = list.map((s, i) => `<tr><td>${i + 1}</td><td>${escHtml(GEAR_BY[s.gear].label)}</td><td>강도${s.intensity}</td><td>속도${effTempo(s)}/긴장${effTension(s)}</td><td>${escHtml(s.title || '—')}</td></tr>`).join('')
    const iss = issues.length === 0 ? '<li>큰 리듬 문제 없음.</li>' : issues.map((is) => `<li><b>${escHtml(is.msg)}</b><br>${escHtml(is.fix)}</li>`).join('')
    const distH = dist.map((d) => `<li>${escHtml(d.g.label)}: ${d.cnt}장면 / ${d.pct}%</li>`).join('')
    return `<p><b>리듬 점수: ${score}/100</b> · 장면 ${list.length}개</p>` +
      `<p><b>기어 배열</b></p><table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>#</th><th>기어</th><th>강도</th><th>속도/긴장</th><th>제목</th></tr>${rows}</table>` +
      `<p><b>기어 분포</b></p><ul>${distH}</ul>` +
      `<p><b>진단</b></p><ul>${iss}</ul>`
  }

  const copyReport = () => {
    const text = reportText()
    const done = () => showFlash('리포트 복사됨')
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { showFlash('복사 실패') }
  }
  const toProject = () => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `페이싱 리듬 리포트 (${score}점)`,
      bodyHtml: reportHtml(),
      synopsis: `장면 ${list.length}개 · 리듬 ${score}/100 · 이슈 ${issues.length}건`,
      meta: { 리듬점수: String(score), 장면수: String(list.length), 이슈수: String(issues.length) },
    })
    showFlash(id ? '프로젝트(자료/구조)에 리포트 추가됨' : '프로젝트 추가 실패')
  }
  const toStash = () => {
    if (!hasStash()) { showFlash('수집함에 연결되지 않았습니다'); return }
    addToStash({ kind: 'memo', label: `페이싱 리포트 ${score}점`, text: reportText() })
    showFlash('수집함에 담았어요')
  }
  const saveSnippet = () => {
    addToLibrary('snippets', { text: reportText(), source: '페이싱 기어박스', tags: ['구조', '페이싱', `리듬${score}`] })
    showFlash('스니펫 라이브러리에 저장됨')
  }
  const fromSnippet = (text: string) => { if (text.trim()) ingestText(text) }
  const openEmotionArc = () => { openToolLinked('emotion-arc', { text: list.map((s) => `${s.title}\n${s.note}`).join('\n\n') }); showFlash('감정 곡선 도구를 여는 중') }
  const openSceneList = () => { openToolLinked('scene-list', { text: reportText() }); showFlash('장면 목록 도구를 여는 중') }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ── styles ──
  const C = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' } as React.CSSProperties,
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 } as React.CSSProperties,
  }

  const sevColor = (s: 1 | 2) => (s === 2 ? 'var(--warn)' : 'var(--accent)')

  return (
    <div style={C.wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dropHot) setDropHot(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropHot(false) }}
      onDrop={onDropZone}
    >
      <div style={C.header}>
        <span style={{ fontSize: 16 }}>설정</span>
        <strong style={{ fontSize: 14 }}>페이싱 기어박스</strong>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>장면 {list.length}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => setView(view === 'rhythm' ? 'graph' : 'rhythm')} title="리듬 막대 / 곡선 그래프 전환">{view === 'rhythm' ? '곡선 보기' : '리듬 보기'}</button>
        <button className="btn-primary" onClick={addBlank}>＋ 장면</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={C.body}>
        {list.length === 0 ? (
          <EmptyState
            dropHot={dropHot}
            snippets={snippets}
            onBlank={addBlank}
            onSnippet={fromSnippet}
            onSample={() => setList(SAMPLE())}
          />
        ) : (
          <>
            {/* 점수 + 분포 요약 */}
            <ScoreBar score={score} issues={issues.length} dist={dist} />

            {/* 리듬 시각화 */}
            {view === 'rhythm'
              ? <RhythmStrip list={list} openId={openId} issueIdx={issueIdx} onPick={setOpenId} />
              : <CurveGraph list={list} />}

            {/* 진단 */}
            <Section title={`진단 (${issues.length})`}>
              {issues.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--ok)', padding: '4px 0' }}>큰 리듬 문제가 발견되지 않았어요. 변화가 잘 살아 있습니다.</div>
                : issues.map((is, i) => (
                  <div key={i} style={{ borderLeft: '3px solid ' + sevColor(is.sev), background: 'var(--panel)', borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: sevColor(is.sev) }}>{is.sev === 2 ? '주의 · ' : '참고 · '}{is.msg}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{is.fix}</div>
                    {is.at.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {is.at.map((idx) => (
                          <button key={idx} className="minibtn" style={{ padding: '1px 6px', fontSize: 10.5 }}
                            onClick={() => { const t = list[idx]; if (t) setOpenId(t.id) }}>#{idx + 1}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </Section>

            {/* 장면 목록(편집) */}
            <Section title="장면 기어 배정">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map((s, i) => (
                  <SceneRow
                    key={s.id} s={s} idx={i} total={list.length}
                    active={s.id === openId} flagged={issueIdx.has(i)}
                    onPick={() => setOpenId(s.id)}
                    onPatch={(p) => patch(s.id, p)}
                    onMove={(d) => move(s.id, d)}
                    onRemove={() => remove(s.id)}
                    dragOver={dragOver === s.id}
                    onDragStart={() => { dragId.current = s.id }}
                    onDragEnter={() => setDragOver(s.id)}
                    onDragEndAll={() => { dragId.current = null; setDragOver(null) }}
                    onDropRow={() => onReorder(s.id)}
                  />
                ))}
              </div>
            </Section>

            {/* 상세 편집 */}
            {opened && <DetailEditor s={opened} onPatch={(p) => patch(opened.id, p)} />}

            {/* 연계 */}
            <div className="linkbar" style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={copyReport}>리포트 복사</button>
              <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '리포트를 프로젝트 자료(구조)에 추가' : '프로젝트 미연결'}>프로젝트에 추가</button>
              <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '리포트를 수집함에 담기' : '수집함 미연결'}>수집함 담기</button>
              <button className="linkbtn" onClick={saveSnippet}>스니펫 저장</button>
              <button className="linkbtn" onClick={openSceneList}>장면 목록 열기</button>
              <button className="linkbtn" onClick={openEmotionArc}>감정 곡선 열기</button>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <span style={{ flex: 1 }} />
              {confirmClear ? (
                <>
                  <span style={{ fontSize: 11, color: 'var(--warn)', alignSelf: 'center' }}>모두 지울까요?</span>
                  <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => { setList([]); setOpenId(null); setConfirmClear(false) }}>전체 삭제</button>
                  <button className="minibtn" onClick={() => setConfirmClear(false)}>취소</button>
                </>
              ) : (
                <button className="minibtn" onClick={() => setConfirmClear(true)}>전체 비우기</button>
              )}
            </div>

            <div className="license-note" style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              기어 개념은 서사학의 서술 속도(요약·장면) 및 작법서의 장면/성찰·대사 구분을 단순화한 진단 모델입니다.
              속도·긴장 수치는 기어 기본값을 강도(1~5)로 보정한 추정치이며 절대 기준이 아닌 상대적 리듬 진단용입니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 빈 상태 ──
function EmptyState(props: { dropHot: boolean; snippets: { id: string; text: string }[]; onBlank: () => void; onSnippet: (t: string) => void; onSample: () => void }) {
  const { dropHot, snippets, onBlank, onSnippet, onSample } = props
  return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '10px 6px' }}>
      <div style={{
        border: '2px dashed ' + (dropHot ? 'var(--accent)' : 'var(--border)'),
        borderRadius: 12, padding: '22px 14px', background: dropHot ? 'var(--chrome-2)' : 'var(--panel)', marginBottom: 14,
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>여기로 원고 문서를 끌어다 놓으세요</div>
        본문을 장면으로 나눠 <b>기어(요약·장면·성찰·대사)</b>를 자동 추정합니다.
      </div>
      <div style={{ textAlign: 'left', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, lineHeight: 1.9, color: 'var(--text)' }}>
        <b>네 가지 기어</b><br />
        {GEARS.map((g) => (
          <div key={g.key} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color, display: 'inline-block', flexShrink: 0 }} />
            <span><b>{g.label}</b> <span style={{ color: 'var(--muted)' }}>{g.desc}</span></span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={onBlank}>＋ 빈 장면으로 시작</button>
        <button className="minibtn" onClick={onSample}>예시 불러오기</button>
      </div>
      {snippets.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>스니펫에서 불러오기</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {snippets.slice(0, 5).map((sn) => (
              <button key={sn.id} className="minibtn" style={{ textAlign: 'left', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                onClick={() => onSnippet(sn.text)} title="이 스니펫 본문을 장면으로 분석">{(sn.text || '').slice(0, 60) || '(빈 스니펫)'}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 섹션 컨테이너 ──
function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, textTransform: 'none' }}>{props.title}</div>
      {props.children}
    </div>
  )
}

// ── 점수 막대 + 분포 ──
function ScoreBar(props: { score: number; issues: number; dist: { g: GearDef; cnt: number; pct: number }[] }) {
  const { score, issues, dist } = props
  const col = score >= 75 ? 'var(--ok)' : score >= 50 ? 'var(--accent)' : 'var(--warn)'
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>리듬 점수</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: col }}>{score}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: issues > 0 ? 'var(--warn)' : 'var(--ok)' }}>{issues > 0 ? `진단 ${issues}건` : '문제 없음'}</span>
      </div>
      <div style={{ height: 8, borderRadius: 5, background: 'var(--chrome-2)', marginTop: 7, overflow: 'hidden' }}>
        <div style={{ width: score + '%', height: '100%', background: col, transition: 'width .2s' }} />
      </div>
      {/* 분포 누적 막대 */}
      <div style={{ display: 'flex', height: 14, borderRadius: 5, overflow: 'hidden', marginTop: 9, border: '1px solid var(--border)' }}>
        {dist.filter((d) => d.pct > 0).map((d) => (
          <div key={d.g.key} title={`${d.g.label} ${d.pct}% (${d.cnt}장면)`} style={{ width: d.pct + '%', background: d.g.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 7 }}>
        {dist.map((d) => (
          <span key={d.g.key} style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: d.g.color, display: 'inline-block' }} />
            {d.g.label} {d.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 리듬 막대 스트립 ──
function RhythmStrip(props: { list: ScNode[]; openId: string | null; issueIdx: Set<number>; onPick: (id: string) => void }) {
  const { list, openId, issueIdx, onPick } = props
  return (
    <div style={{ marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, minHeight: 86 }}>
        {list.map((s, i) => {
          const g = GEAR_BY[s.gear]
          const h = 28 + Math.round(effTension(s) * 0.5)  // 막대 높이 = 긴장
          const active = s.id === openId
          const flagged = issueIdx.has(i)
          return (
            <div key={s.id} onClick={() => onPick(s.id)} title={`#${i + 1} ${g.label} · 속도${effTempo(s)} 긴장${effTension(s)} · ${s.title}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 18 }}>
              <div style={{
                width: 16, height: h, borderRadius: '4px 4px 2px 2px', background: g.color,
                opacity: active ? 1 : 0.82, outline: active ? '2px solid var(--text)' : flagged ? '2px dashed var(--warn)' : 'none', outlineOffset: 1,
              }} />
              <div style={{ fontSize: 9, color: flagged ? 'var(--warn)' : 'var(--muted)', marginTop: 3 }}>{i + 1}</div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>막대 높이 = 긴장 · 색 = 기어 · 점선 테두리 = 진단 표시 장면</div>
    </div>
  )
}

// ── 속도/긴장 곡선(인라인 SVG, 외부 import 없음 — JSX SVG 요소만) ──
function CurveGraph(props: { list: ScNode[] }) {
  const { list } = props
  const W = 320, H = 110, padL = 26, padB = 16, padT = 8, padR = 8
  const n = list.length
  const x = (i: number) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1))
  const y = (v: number) => padT + (1 - v / 100) * (H - padT - padB)
  const path = (sel: (s: ScNode) => number) => list.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(sel(s)).toFixed(1)}`).join(' ')
  return (
    <div style={{ marginTop: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxWidth: '100%' }}>
        {[0, 50, 100].map((gv) => (
          <g key={gv}>
            <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke="var(--border)" strokeWidth={0.6} />
            <text x={2} y={y(gv) + 3} fontSize={8} fill="var(--muted)">{gv}</text>
          </g>
        ))}
        <path d={path(effTempo)} fill="none" stroke="#3b82f6" strokeWidth={1.8} />
        <path d={path(effTension)} fill="none" stroke="#ef4444" strokeWidth={1.8} />
        {list.map((s, i) => (
          <g key={s.id}>
            <circle cx={x(i)} cy={y(effTempo(s))} r={2.2} fill="#3b82f6" />
            <circle cx={x(i)} cy={y(effTension(s))} r={2.2} fill="#ef4444" />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, background: '#3b82f6', display: 'inline-block' }} />속도</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, background: '#ef4444', display: 'inline-block' }} />긴장</span>
      </div>
    </div>
  )
}

// ── 장면 행(목록) ──
function SceneRow(props: {
  s: ScNode; idx: number; total: number; active: boolean; flagged: boolean
  onPick: () => void; onPatch: (p: Partial<ScNode>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void
  dragOver: boolean; onDragStart: () => void; onDragEnter: () => void; onDragEndAll: () => void; onDropRow: () => void
}) {
  const { s, idx, total, active, flagged, onPick, onPatch, onMove, onRemove, dragOver, onDragStart, onDragEnter, onDragEndAll, onDropRow } = props
  const g = GEAR_BY[s.gear]
  return (
    <div draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragEnter() }}
      onDrop={(e) => { e.preventDefault(); onDropRow() }}
      onDragEnd={onDragEndAll}
      onClick={onPick}
      style={{
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
        outline: dragOver ? '2px dashed var(--accent)' : 'none',
        background: active ? 'var(--chrome-2)' : 'var(--panel)',
        borderLeft: '4px solid ' + g.color, borderRadius: 9, padding: '7px 9px', cursor: 'pointer', userSelect: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--muted)', fontSize: 11, cursor: 'grab' }} title="드래그로 순서 변경">⠿</span>
        <span style={{ color: flagged ? 'var(--warn)' : 'var(--muted)', fontSize: 11, width: 16, textAlign: 'right' }}>{idx + 1}</span>
        <input value={s.title} onClick={(e) => e.stopPropagation()} onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="장면 제목" maxLength={80}
          style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', color: 'var(--text)', padding: '2px 0', outline: 'none' }} />
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{s.words > 0 ? s.words + '자' : ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        {GEARS.map((gd) => (
          <button key={gd.key} className="minibtn"
            onClick={() => onPatch({ gear: gd.key })}
            title={gd.desc}
            style={{
              padding: '2px 7px', fontSize: 11,
              background: s.gear === gd.key ? gd.color : 'transparent',
              color: s.gear === gd.key ? '#fff' : 'var(--muted)',
              border: '1px solid ' + (s.gear === gd.key ? gd.color : 'var(--border)'),
            }}>{gd.label}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ padding: '2px 5px', fontSize: 10 }} onClick={() => onMove(-1)} disabled={idx === 0} title="위로">▲</button>
        <button className="minibtn" style={{ padding: '2px 5px', fontSize: 10 }} onClick={() => onMove(1)} disabled={idx === total - 1} title="아래로">▼</button>
        <button className="minibtn" style={{ padding: '2px 5px', fontSize: 10, color: 'var(--warn)' }} onClick={onRemove} title="삭제">✕</button>
      </div>
    </div>
  )
}

// ── 상세 편집(강도·분량·메모) ──
function DetailEditor(props: { s: ScNode; onPatch: (p: Partial<ScNode>) => void }) {
  const { s, onPatch } = props
  const g = GEAR_BY[s.gear]
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const area: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 50, lineHeight: 1.5, fontFamily: 'inherit' }
  return (
    <div style={{ marginTop: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderTop: '3px solid ' + g.color, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title || '(제목 없음)'} <span style={{ color: g.color, fontSize: 11 }}>· {g.label} 기어</span></div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>{g.desc}</div>

      <div style={{ marginBottom: 10 }}>
        <div style={label}>강도 (1 약함 ~ 5 강함) — 속도·긴장 보정</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} className="minibtn" onClick={() => onPatch({ intensity: v as number })}
              style={{ flex: 1, padding: '5px 0', fontSize: 12, background: s.intensity === v ? g.color : 'transparent', color: s.intensity === v ? '#fff' : 'var(--muted)', border: '1px solid ' + (s.intensity === v ? g.color : 'var(--border)') }}>{v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 7, fontSize: 11, color: 'var(--muted)' }}>
          <span>속도 <b style={{ color: '#3b82f6' }}>{effTempo(s)}</b></span>
          <span>긴장 <b style={{ color: '#ef4444' }}>{effTension(s)}</b></span>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={label}>분량 (글자 수, 비중 표시용)</div>
        <input type="number" min={0} value={s.words || ''} onChange={(e) => onPatch({ words: Math.max(0, Math.round(num(e.target.value, 0))) })}
          placeholder="예: 1200"
          style={{ width: 140, padding: '6px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }} />
      </div>

      <div>
        <div style={label}>메모</div>
        <textarea style={area} value={s.note} onChange={(e) => onPatch({ note: e.target.value })} placeholder="이 장면의 목적·전환·연결 등" maxLength={600} />
      </div>
    </div>
  )
}

// ── 예시 데이터 ──
function SAMPLE(): ScNode[] {
  const mk = (title: string, gear: GearKey, intensity: number, words: number, note = ''): ScNode =>
    ({ id: newId(), title, gear, intensity, words, note })
  return [
    mk('평범했던 마지막 아침', 'summary', 2, 600, '일상 압축, 거리감'),
    mk('낯선 편지의 도착', 'scene', 3, 1100, '사건 발단'),
    mk('편지를 두고 다투다', 'dialogue', 4, 900, '갈등 표면화'),
    mk('떠나기로 결심', 'scene', 4, 1300),
    mk('지난 선택을 곱씹다', 'reflection', 3, 700, '내면 정리'),
    mk('도착한 도시', 'summary', 2, 500, '이동 압축'),
    mk('정체를 들키다', 'scene', 5, 1500, '절정'),
    mk('남겨진 질문', 'reflection', 3, 600),
  ]
}
