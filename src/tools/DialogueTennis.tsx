// 대사 테니스 — 두 인물(A/B)의 대사 교환을 '랠리'로 보고 리듬을 분석한다.
//  · 원고에서 따옴표로 묶인 대사를 순서대로 뽑아, 화자 추정(앞/뒤 지문의 인물 단서·말끝·번갈아 규칙)으로 A/B에 배정.
//  · 주고받기 길이(샷 길이), 화자 교대(랠리)·연속 발화(같은 사람 연타)·주도권(누가 더 길고 자주 치는가)·
//    스매시(주변 평균보다 압도적으로 긴 결정타) 등을 통계+막대 시각화로 보여 준다.
//  · 결과를 수집함/프로젝트(자료 › 분석)로 내보내고, 관련 분석 도구로 데이터를 들고 넘어갈 수 있다.
// 규칙: import 는 react 와 './linkbus' 만. 외부 네트워크 없음(전부 로컬 파싱·계산). 언마운트 안전(타이머 정리).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getDragItem,
  isItemDrag,
  useLibraryList,
  addToStash,
  hasStash,
  addToProject,
  hasProjectBridge,
  openToolLinked,
  type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'dialogue-tennis',
  name: '대사 테니스',
  icon: '🏓',
  group: '교정·언어',
  intro: '두 인물의 대사 교환을 랠리 리듬으로 분석합니다 — 주고받기 길이·주도권·결정타(스매시)',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:dialogue-tennis'

// ── 따옴표 정의(여닫이) ─────────────────────────────────────────
interface QuotePair { open: string; close: string; same: boolean }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”', same: false }, // 둥근 큰따옴표
  { open: '‘', close: '’', same: false }, // 둥근 작은따옴표
  { open: '「', close: '」', same: false }, // 낫표
  { open: '『', close: '』', same: false }, // 겹낫표
  { open: '"', close: '"', same: true },
  { open: "'", close: "'", same: true },
]

const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)
const visibleLen = (s: string) => [...s.replace(/\s/g, '')].length

// 한 발화(샷)
interface Shot {
  idx: number          // 전체 순서(1부터)
  text: string         // 대사 본문
  len: number          // 공백 제외 글자수
  before: string       // 직전 지문(화자 추정용, 최대 60자)
  after: string        // 직후 지문(화자 추정용, 최대 60자)
  speaker: 'A' | 'B'   // 배정된 화자
  speakerName?: string // 지문에서 직접 잡힌 이름(있으면)
  smash: boolean       // 결정타 여부(주변 대비 압도적으로 긴 발화)
  rallyId: number      // 소속 랠리 번호
}

// ── 1) 대사 추출(따옴표 구간 + 앞/뒤 지문) ───────────────────────
interface RawDlg { text: string; before: string; after: string }
function extract(text: string): RawDlg[] {
  const out: RawDlg[] = []
  const chars = [...text]
  let i = 0
  let lastEnd = 0 // 직전 대사가 끝난 위치(지문 구간 시작)
  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (!pair) { i++; continue }
    // 곧은 작은따옴표 축약형 보호
    if (ch === "'" && isAlnum(chars[i - 1])) { i++; continue }
    let j = i + 1
    let inner = ''
    let closed = false
    while (j < chars.length) {
      const cj = chars[j]
      if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
      if (cj === pair.close) { closed = true; break }
      if (cj === '\n' && chars[j + 1] === '\n') break
      inner += cj
      j++
    }
    if (closed) {
      const trimmed = inner.trim()
      if (trimmed) {
        const before = chars.slice(lastEnd, i).join('').replace(/\s+/g, ' ').trim()
        out.push({ text: trimmed, before, after: '' })
      }
      i = j + 1
      lastEnd = i
    } else {
      i++
    }
  }
  // 직후 지문은 다음 대사의 before 와 같은 구간이므로, 마지막 조각만 채운다.
  for (let k = 0; k < out.length; k++) {
    out[k].after = k + 1 < out.length ? out[k + 1].before : ''
  }
  // 길이 컷(추정 단서용)
  for (const d of out) {
    d.before = d.before.slice(-60)
    d.after = d.after.slice(0, 60)
  }
  return out
}

// ── 2) 화자 추정 ─────────────────────────────────────────────
// 우선순위: (a) 지문에서 인물 이름이 잡히면 그 이름으로 클러스터링, (b) 이름 없으면 번갈아(테니스 기본 규칙),
//   단 같은 인물 단서가 연속이면 연타로 본다. 두 주요 화자만 A/B 로 정규화한다.
const SAY_VERB = /(말했|물었|대답|답했|중얼|소리쳤|외쳤|속삭|덧붙였|되물었|읊조|뇌까|내뱉|이었|했다|한다|하였|묻는다|말한다|대꾸|반문|이라고|라고)/
function nameNear(snip: string): string | null {
  if (!snip) return null
  // "이름이/은/는/가 …말했다" 형태. 발화 동사(SAY_VERB) 매치 위치 바로 앞의 한국어 고유명사를
  // 후보로 잡는다. (지문 끝의 말끝 동사 어간을 이름으로 오인하지 않도록 동사 앞에서만 탐색.)
  const sv = SAY_VERB.exec(snip)
  if (sv) {
    const head = snip.slice(0, sv.index)
    const m = head.match(/([가-힣]{2,4})(?:이|가|은|는|께서|도|만)?\s*(?:[가-힣]{0,6}\s*)?$/)
    // 후보가 비어 있지 않고, SAY_VERB 어간과 겹치지 않을 때만 채택.
    if (m && m[1] && !SAY_VERB.test(m[1])) return m[1]
  }
  // 영문 이름
  const me = snip.match(/([A-Z][a-z]{1,12})\s+(?:said|asked|replied|whispered|shouted)/)
  if (me) return me[1]
  return null
}

interface Assigned {
  shots: Shot[]
  nameA?: string
  nameB?: string
  detectedNames: string[]
}
function assign(raws: RawDlg[]): Assigned {
  // 단계 1: 각 대사에 이름 단서 시도(직전 지문 우선, 없으면 직후).
  const nameHits: (string | null)[] = raws.map((d) => nameNear(d.before) || nameNear(d.after))
  const freq = new Map<string, number>()
  for (const n of nameHits) if (n) freq.set(n, (freq.get(n) || 0) + 1)
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])
  const nameA = ranked[0]
  const nameB = ranked[1]

  const shots: Shot[] = []
  let prev: 'A' | 'B' | null = null
  for (let k = 0; k < raws.length; k++) {
    const d = raws[k]
    const hit = nameHits[k]
    let sp: 'A' | 'B'
    let sname: string | undefined
    if (hit && nameA && hit === nameA) { sp = 'A'; sname = hit }
    else if (hit && nameB && hit === nameB) { sp = 'B'; sname = hit }
    else if (hit) {
      // 잡혔지만 두 주요 화자가 아님 → 직전과 다른 쪽으로(제3 인물은 근사적으로 교대)
      sp = prev === 'A' ? 'B' : 'A'
      sname = hit
    } else {
      // 단서 없음: 테니스 기본(번갈아). 첫 발화는 A.
      sp = prev === null ? 'A' : prev === 'A' ? 'B' : 'A'
    }
    shots.push({
      idx: k + 1, text: d.text, len: visibleLen(d.text),
      before: d.before, after: d.after, speaker: sp, speakerName: sname,
      smash: false, rallyId: 0,
    })
    prev = sp
  }
  return { shots, nameA, nameB, detectedNames: ranked.slice(0, 6) }
}

// ── 3) 랠리/스매시/통계 ───────────────────────────────────────
interface Rally { id: number; from: number; to: number; length: number } // length = 샷 개수
interface Analysis {
  shots: Shot[]
  total: number
  countA: number
  countB: number
  charsA: number
  charsB: number
  avgA: number
  avgB: number
  longest: Shot | null
  rallies: Rally[]
  longestRally: Rally | null
  exchanges: number      // 화자 교대 횟수
  streaks: { speaker: 'A' | 'B'; from: number; len: number }[] // 연속 발화(연타) 구간
  maxStreak: number
  smashes: Shot[]
  dominance: number      // -1(B 완전 주도) ~ +1(A 완전 주도), 빈도+분량 종합
  rhythm: number         // 0~100, 짧고 빠른 교환일수록 높음
  nameA: string
  nameB: string
}

function analyze(raws: RawDlg[]): Analysis | null {
  if (raws.length === 0) return null
  const { shots, nameA, nameB } = assign(raws)
  const total = shots.length

  // 랠리: 화자가 한 번이라도 바뀌기 시작해 이어지는 구간. 같은 사람 연타도 랠리에 포함.
  // 랠리 분절 기준: 두 연속 발화 사이 직후 지문이 "장면 전환/긴 서술"이면 끊는다(근사: 지문 40자↑).
  const rallies: Rally[] = []
  let rStart = 0
  let rid = 1
  for (let k = 0; k < total; k++) {
    shots[k].rallyId = rid
    const gapLong = shots[k].after.length >= 40 && k + 1 < total
    const isLast = k === total - 1
    if (gapLong || isLast) {
      rallies.push({ id: rid, from: rStart + 1, to: k + 1, length: k - rStart + 1 })
      rid++
      rStart = k + 1
    }
  }

  // 화자 교대 / 연타
  let exchanges = 0
  const streaks: { speaker: 'A' | 'B'; from: number; len: number }[] = []
  let sFrom = 0
  for (let k = 1; k < total; k++) {
    if (shots[k].speaker !== shots[k - 1].speaker) {
      exchanges++
      streaks.push({ speaker: shots[k - 1].speaker, from: sFrom + 1, len: k - sFrom })
      sFrom = k
    }
  }
  streaks.push({ speaker: shots[total - 1].speaker, from: sFrom + 1, len: total - sFrom })
  const maxStreak = streaks.reduce((m, s) => Math.max(m, s.len), 0)

  // 스매시: 직전 3샷 평균의 2.2배 이상이고 절대 길이도 충분(>=24자)인 결정타.
  const smashes: Shot[] = []
  for (let k = 0; k < total; k++) {
    const win = shots.slice(Math.max(0, k - 3), k)
    const base = win.length ? win.reduce((a, s) => a + s.len, 0) / win.length : 0
    const ref = base || (shots.reduce((a, s) => a + s.len, 0) / total)
    if (shots[k].len >= 24 && shots[k].len >= ref * 2.2 && ref > 0) {
      shots[k].smash = true
      smashes.push(shots[k])
    }
  }

  const A = shots.filter((s) => s.speaker === 'A')
  const B = shots.filter((s) => s.speaker === 'B')
  const charsA = A.reduce((a, s) => a + s.len, 0)
  const charsB = B.reduce((a, s) => a + s.len, 0)
  const longest = shots.reduce<Shot | null>((m, s) => (!m || s.len > m.len ? s : m), null)
  const longestRally = rallies.reduce<Rally | null>((m, r) => (!m || r.length > m.length ? r : m), null)

  // 주도권: 빈도 비중·분량 비중 평균 → A 기준 부호.
  const freqDom = total ? (A.length - B.length) / total : 0
  const volDom = charsA + charsB ? (charsA - charsB) / (charsA + charsB) : 0
  const dominance = (freqDom + volDom) / 2

  // 리듬 점수: 평균 샷 길이가 짧고(<=20자에서 만점), 교대율이 높을수록 빠른 랠리.
  const avgLen = total ? (charsA + charsB) / total : 0
  const exchangeRate = total > 1 ? exchanges / (total - 1) : 0
  const shortScore = Math.max(0, Math.min(1, (40 - avgLen) / 32)) // 8자→1, 40자→0
  const rhythm = Math.round((shortScore * 0.5 + exchangeRate * 0.5) * 100)

  return {
    shots, total,
    countA: A.length, countB: B.length, charsA, charsB,
    avgA: A.length ? charsA / A.length : 0,
    avgB: B.length ? charsB / B.length : 0,
    longest, rallies, longestRally, exchanges,
    streaks, maxStreak, smashes, dominance, rhythm,
    nameA: nameA || 'A', nameB: nameB || 'B',
  }
}

// ── 저장/복원 ────────────────────────────────────────────────
function loadText(): string {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return ''
    const p = JSON.parse(raw)
    return typeof p?.text === 'string' ? p.text : ''
  } catch { return '' }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function DialogueTennis({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<string>(loadText())
  const [text, setText] = useState<string>(initial.current)
  const [labelA, setLabelA] = useState('A')
  const [labelB, setLabelB] = useState('B')
  const [dragOver, setDragOver] = useState(false)
  const [showShots, setShowShots] = useState(false)
  const [flash, setFlash] = useState('')
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const consumed = useRef<unknown>(undefined)

  // [연계] 인물 라이브러리 — A/B 화자 라벨을 실제 인물 이름으로 빠르게 지정.
  const characters = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
  }, [text])

  // [연계] payload.text / payload.body 로 본문을 받으면 채운다(1회).
  useEffect(() => {
    const raw = (payload?.text ?? payload?.body) as unknown
    if (typeof raw !== 'string' || consumed.current === raw) return
    consumed.current = raw
    if (raw.trim()) {
      setText(raw)
      if (mounted.current) showFlash('전달받은 본문을 불러왔어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2200)
  }

  const analysis = useMemo<Analysis | null>(() => {
    const t = text.trim()
    if (!t) return null
    try { return analyze(extract(text)) } catch { return null }
  }, [text])

  // 화면용 라벨(사용자 지정 우선, 없으면 추정 이름).
  const nmA = (labelA.trim() || analysis?.nameA || 'A').slice(0, 16)
  const nmB = (labelB.trim() || analysis?.nameB || 'B').slice(0, 16)

  // 추정 이름을 라벨에 자동 채우기(사용자가 비워 둔 경우만).
  useEffect(() => {
    if (!analysis) return
    if (!labelA.trim() && analysis.nameA && analysis.nameA !== 'A') setLabelA(analysis.nameA)
    if (!labelB.trim() && analysis.nameB && analysis.nameB !== 'B') setLabelB(analysis.nameB)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

  // ── 드롭 수용(좌측 바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    let item: ResolvedItem | null = null
    try { item = getDragItem(e) } catch { item = null }
    if (item && typeof item.text === 'string' && item.text.trim()) {
      e.preventDefault()
      setText(item.text)
      showFlash(`‘${item.title || '문서'}’의 본문을 불러왔어요.`)
    }
  }

  // ── 내보내기 ──
  const summaryText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const L: string[] = []
    L.push('[대사 테니스 — 랠리 분석]')
    L.push(`총 발화 ${a.total}개 · 화자 교대 ${a.exchanges}회 · 랠리 ${a.rallies.length}개`)
    L.push(`${nmA}: ${a.countA}발화 / ${a.charsA}자 (평균 ${a.avgA.toFixed(1)}자)`)
    L.push(`${nmB}: ${a.countB}발화 / ${a.charsB}자 (평균 ${a.avgB.toFixed(1)}자)`)
    const who = a.dominance > 0.08 ? nmA : a.dominance < -0.08 ? nmB : '없음(균형)'
    L.push(`주도권: ${who} (지수 ${a.dominance >= 0 ? '+' : ''}${a.dominance.toFixed(2)})`)
    L.push(`최장 연타 ${a.maxStreak}연속 · 최장 랠리 ${a.longestRally?.length ?? 0}샷`)
    L.push(`랠리 리듬 점수 ${a.rhythm}/100 (짧고 잦은 교환일수록 높음)`)
    if (a.smashes.length) {
      L.push(`결정타(스매시) ${a.smashes.length}회:`)
      a.smashes.slice(0, 6).forEach((s) => {
        const who2 = s.speaker === 'A' ? nmA : nmB
        L.push(`  · #${s.idx} ${who2} (${s.len}자) ${s.text.slice(0, 40)}${s.text.length > 40 ? '…' : ''}`)
      })
    }
    if (a.longest) L.push(`가장 긴 발화 #${a.longest.idx} (${a.longest.len}자)`)
    return L.join('\n')
  }, [analysis, nmA, nmB])

  const copy = async () => {
    if (!summaryText) return
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(summaryText); showFlash('분석 결과를 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = summaryText; ta.style.position = 'fixed'; ta.style.top = '-1000px'
        document.body.appendChild(ta); ta.select()
        const ok = document.execCommand('copy'); document.body.removeChild(ta)
        showFlash(ok ? '분석 결과를 복사했어요.' : '복사 실패 — 직접 선택해 복사하세요.')
      } catch { showFlash('복사 실패 — 직접 선택해 복사하세요.') }
    }
  }

  const buildHtml = (): string => {
    const a = analysis
    if (!a) return ''
    const rows = a.shots.map((s) => {
      const who = s.speaker === 'A' ? nmA : nmB
      return `<tr><td>${s.idx}</td><td><b>${esc(who)}</b></td><td>${s.len}${s.smash ? ' ★' : ''}</td><td>${esc(s.text)}</td></tr>`
    }).join('')
    return [
      `<p>총 발화 ${a.total} · 화자 교대 ${a.exchanges} · 랠리 ${a.rallies.length} · 리듬 ${a.rhythm}/100</p>`,
      `<p>${esc(nmA)}: ${a.countA}발화/${a.charsA}자(평균 ${a.avgA.toFixed(1)}) · ${esc(nmB)}: ${a.countB}발화/${a.charsB}자(평균 ${a.avgB.toFixed(1)})</p>`,
      `<p>주도권 지수 ${a.dominance.toFixed(2)} · 최장 연타 ${a.maxStreak} · 결정타 ${a.smashes.length}회</p>`,
      `<table border="1" cellspacing="0" cellpadding="4"><tr><th>#</th><th>화자</th><th>길이</th><th>대사(★=스매시)</th></tr>${rows}</table>`,
    ].join('\n')
  }

  const bridgeOn = hasProjectBridge()
  const stashOn = hasStash()

  const toProject = () => {
    if (!analysis) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분석',
      title: `대사 랠리 분석: ${nmA} vs ${nmB}`.slice(0, 80),
      bodyHtml: buildHtml(),
      synopsis: `발화 ${analysis.total} · 리듬 ${analysis.rhythm}/100`,
    })
    showFlash(id ? '프로젝트 자료 › 분석 폴더에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }
  const toStash = () => {
    if (!summaryText) return
    addToStash({ kind: 'memo', label: `대사 테니스: ${nmA} vs ${nmB}`, text: summaryText })
    showFlash('수집함에 분석 결과를 담았어요.')
  }

  const a = analysis

  // 막대 비교용 최댓값
  const maxCount = a ? Math.max(1, a.countA, a.countB) : 1
  const maxAvg = a ? Math.max(1, a.avgA, a.avgB) : 1

  // 미니 랠리 타임라인(샷 길이 막대, 화자별 색).
  const tl = a ? a.shots : []
  const tlMax = tl.length ? Math.max(...tl.map((s) => s.len), 1) : 1

  // ── 스타일 ──
  const C_A = '#3d7fd6'
  const C_B = '#e0518b'
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const ta: React.CSSProperties = {
    minHeight: 96, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }
  const labelInput: React.CSSProperties = { width: 92, padding: '5px 8px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }

  // 주도권 게이지 위치(0~100, 50=균형)
  const domPos = a ? Math.round((a.dominance + 1) / 2 * 100) : 50

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}>두 인물이 대사를 주고받는 장면 본문을 넣으세요</div>
        <button className="minibtn" onClick={() => { setText(''); setShowShots(false) }} disabled={!text}>지우기</button>
      </div>

      <textarea
        style={ta}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
        onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        placeholder={'따옴표로 묶인 대사를 순서대로 분석합니다. 좌측 바인더 문서를 끌어다 놓아도 됩니다.\n예) 민수가 물었다. "어디 가?" / "그냥." 지영이 짧게 답했다.'}
        spellCheck={false}
        aria-label="대사 테니스 본문 입력"
      />

      {/* 화자 라벨 + 라이브러리 인물 빠른 지정 */}
      <div style={bar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: C_A }} />
          <input style={labelInput} value={labelA} onChange={(e) => setLabelA(e.target.value)} placeholder="화자 A" maxLength={16} aria-label="화자 A 이름" />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: C_B }} />
          <input style={labelInput} value={labelB} onChange={(e) => setLabelB(e.target.value)} placeholder="화자 B" maxLength={16} aria-label="화자 B 이름" />
        </div>
        {characters.length > 0 && (
          <select
            className="field"
            style={{ maxWidth: 150 }}
            value=""
            onChange={(e) => {
              const c = characters.find((x) => x.id === e.target.value)
              if (!c) return
              const nm = (c.name || '').slice(0, 16)
              // 빈 라벨 우선 채우기: A 슬롯이 비어 있으면(공백/기본 'A'/자동추정 이름) A, 아니면 B 슬롯이
              // 비어 있으면 B, 둘 다 채워져 있으면 B 를 덮어쓴다. A·B 판정을 동일 기준으로 맞춰 어긋남 방지.
              const isEmpty = (label: string, dflt: 'A' | 'B', auto?: string) =>
                !label.trim() || label === dflt || (!!auto && label === auto)
              if (isEmpty(labelA, 'A', a?.nameA)) setLabelA(nm)
              else if (isEmpty(labelB, 'B', a?.nameB)) setLabelB(nm)
              else setLabelB(nm)
            }}
            aria-label="라이브러리 인물로 화자 채우기"
          >
            <option value="">라이브러리 인물…</option>
            {characters.slice(0, 40).map((c) => <option key={c.id} value={c.id}>{(c.name || '이름 없음').slice(0, 20)}</option>)}
          </select>
        )}
      </div>

      {(note || flash) && (
        <div style={{ fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)' }}>{note || flash}</div>
      )}

      {!a ? (
        <div style={empty}>
          대사가 오가는 본문을 넣으면<br />주고받기 길이·주도권·랠리 리듬·결정타를 분석합니다.<br />
          <span style={{ fontSize: 11 }}>지문에 인물 이름이 있으면 화자를 자동 추정하고, 없으면 번갈아 친 것으로 봅니다.</span>
        </div>
      ) : (
        <div style={scroll}>
          {/* 주도권 게이지 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>주도권 (빈도 + 분량 종합)</div>
            <div style={{ position: 'relative', height: 26, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: `linear-gradient(90deg, ${C_B}, var(--chrome-2) 50%, ${C_A})` }}>
              <div style={{ position: 'absolute', top: -2, bottom: -2, left: `calc(${domPos}% - 3px)`, width: 6, background: 'var(--text)', borderRadius: 3, boxShadow: '0 0 0 2px var(--paper)' }} />
            </div>
            <div style={{ ...bar }}>
              <span style={{ fontSize: 12, color: C_B, fontWeight: 700 }}>{nmB} 주도</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                {Math.abs(a.dominance) < 0.08 ? '균형' : (a.dominance > 0 ? nmA : nmB) + ' 우세'}
              </span>
              <span style={{ fontSize: 12, color: C_A, fontWeight: 700 }}>{nmA} 주도</span>
            </div>
          </div>

          {/* 핵심 통계 */}
          <div style={grid3}>
            <div style={stat}><div style={statVal}>{a.total}</div><div style={statLabel}>총 발화(샷)</div></div>
            <div style={stat}><div style={statVal}>{a.exchanges}</div><div style={statLabel}>화자 교대</div></div>
            <div style={stat}><div style={statVal}>{a.rallies.length}</div><div style={statLabel}>랠리 수</div></div>
          </div>
          <div style={grid3}>
            <div style={stat}><div style={{ ...statVal, color: a.rhythm >= 60 ? 'var(--ok)' : a.rhythm >= 35 ? 'var(--accent)' : 'var(--warn)' }}>{a.rhythm}</div><div style={statLabel}>랠리 리듬/100</div></div>
            <div style={stat}><div style={statVal}>{a.maxStreak}</div><div style={statLabel}>최장 연타</div></div>
            <div style={stat}><div style={statVal}>{a.longestRally?.length ?? 0}</div><div style={statLabel}>최장 랠리(샷)</div></div>
          </div>

          {/* 화자별 비교 막대 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionTitle}>화자별 비교</div>
            {([['A', nmA, C_A, a.countA, a.avgA, a.charsA] as const, ['B', nmB, C_B, a.countB, a.avgB, a.charsB] as const]).map(([k, nm, col, cnt, avg, chars]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: col }}>{nm}</span>
                  <span style={{ color: 'var(--muted)' }}>{cnt}발화 · {chars}자 · 평균 {avg.toFixed(1)}자</span>
                </div>
                <div title="발화 횟수" style={{ height: 12, background: 'var(--chrome-2)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${(cnt / maxCount) * 100}%`, height: '100%', background: col }} />
                </div>
                <div title="평균 발화 길이" style={{ height: 8, background: 'var(--chrome-2)', borderRadius: 6, overflow: 'hidden', opacity: 0.7 }}>
                  <div style={{ width: `${(avg / maxAvg) * 100}%`, height: '100%', background: col }} />
                </div>
              </div>
            ))}
          </div>

          {/* 랠리 타임라인(샷 막대) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>랠리 타임라인 (막대=발화 길이, 별표=결정타)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, padding: '4px 2px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, overflowX: 'auto' }}>
              {tl.map((s) => (
                <div
                  key={s.idx}
                  title={`#${s.idx} ${s.speaker === 'A' ? nmA : nmB} · ${s.len}자${s.smash ? ' · 결정타' : ''}\n${s.text.slice(0, 50)}`}
                  style={{ flex: '0 0 6px', minWidth: 6, height: `${Math.max(6, (s.len / tlMax) * 100)}%`, background: s.speaker === 'A' ? C_A : C_B, borderRadius: 2, position: 'relative', boxShadow: s.smash ? '0 0 0 1px var(--text)' : 'none' }}
                >
                  {s.smash && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text)' }}>*</span>}
                </div>
              ))}
            </div>
            <div style={hint}>왼쪽이 장면 시작. 막대가 번갈아 들쭉날쭉하면 빠른 공방, 한쪽이 길게 솟으면 그 인물의 긴 발화입니다.</div>
          </div>

          {/* 결정타(스매시) 목록 */}
          {a.smashes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>결정타 — 주변보다 압도적으로 긴 발화 ({a.smashes.length}개)</div>
              {a.smashes.slice(0, 8).map((s) => (
                <div key={s.idx} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${s.speaker === 'A' ? C_A : C_B}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>#{s.idx} · {s.speaker === 'A' ? nmA : nmB} · {s.len}자</div>
                  {s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text}
                </div>
              ))}
            </div>
          )}

          {/* 발화 순서 목록(접이) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={bar}>
              <div style={sectionTitle}>발화 순서 ({a.total}개)</div>
              <button className="minibtn" onClick={() => setShowShots((v) => !v)}>{showShots ? '접기' : '펼치기'}</button>
            </div>
            {showShots && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {a.shots.slice(0, 250).map((s) => (
                  <div key={s.idx} style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px', fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.idx}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.speaker === 'A' ? C_A : C_B, minWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.speaker === 'A' ? nmA : nmB}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{s.smash ? '★ ' : ''}{s.text.length > 110 ? s.text.slice(0, 110) + '…' : s.text}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{s.len}자</span>
                  </div>
                ))}
                {a.shots.length > 250 && <div style={hint}>발화가 많아 250개까지만 표시합니다.</div>}
              </div>
            )}
          </div>

          {/* 연계 + 내보내기 */}
          <div className="linkbar">
            <span className="linkbar-label">함께 열기:</span>
            <button className="linkbtn" onClick={() => openToolLinked('dialogue-ratio', { text })} title="대화/지문 비율 도구로 같은 본문 분석">대화/지문 비율</button>
            <button className="linkbtn" onClick={() => openToolLinked('sentence-length-viz', { text })} title="문장 길이 시각화로 리듬 보기">문장 길이</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-voice')} title="인물 말투 차별화기 열기">인물 말투</button>
          </div>

          <div style={bar}>
            <div style={hint}>화자 추정은 근사값입니다(지문 이름·번갈아 규칙). 라벨을 직접 지정하면 표시에 반영됩니다.</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {stashOn && <button className="minibtn" onClick={toStash} title="분석 결과를 수집함에 담기">수집함</button>}
              {bridgeOn && <button className="linkbtn" onClick={toProject} title="분석 문서를 프로젝트 바인더(자료 › 분석)에 추가">프로젝트에 추가</button>}
              <button className="btn-primary" onClick={copy}>결과 복사</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
