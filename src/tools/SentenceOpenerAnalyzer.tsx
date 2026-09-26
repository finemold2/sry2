// 문장 첫머리 다양성 분석 — 본문을 문장 단위로 나눠 각 문장의 첫 단어/첫 어절을 모아
//  · 같은 말로 시작하는 문장 비율(중복률)과 '연속 반복'(바로 다음 문장도 같은 첫머리)을 경고하고
//  · 다양성 점수(0~100)와 첫머리 분포 막대를 그리고
//  · 반복 첫머리 문장을 묶어 하이라이트하며
//  · 개선 팁을 준다.
// 전부 로컬 계산(외부 네트워크/키/미디어 불필요). react 와 './linkbus' 외 import 없음.
// 타이머·리스너는 언마운트 시 정리. 저작권/초상권 안전(색/도형/이모지/자작 텍스트만).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'sentence-opener-analyzer',
  name: '문장 첫머리 분석',
  icon: '🅰️',
  group: '교정·언어',
  intro: '문장이 같은 말로 시작하는 반복을 찾아 첫머리 다양성을 점수·막대·하이라이트로 점검합니다',
  w: 580,
  h: 680,
}

const LS_KEY = 'sry:tool:sentence-opener-analyzer'

// ── 분석 모드: 첫 단어(짧게) vs 첫 어절(공백 단위, 조사 포함) ──
type Mode = 'word' | 'eojeol'

// 연속 반복으로 경고할 최소 연속 길이(같은 첫머리 문장이 N개 이상 잇따를 때)
const RUN_WARN = 2

// ── 한국어 조사(첫 어절 비교 시 가볍게 떼어 같은 말로 묶기 위함) ──
// 과한 정규화로 오탐을 늘리지 않도록 긴 것부터 한 번만 제거한다.
const JOSA = [
  '으로써', '으로서', '에서는', '에게서', '이라는', '라는',
  '으로', '에서', '에게', '한테', '까지', '부터', '마저', '조차',
  '처럼', '만큼', '보다', '라고', '이라고', '으로는',
  '은', '는', '이', '가', '을', '를', '의', '에', '도', '와', '과',
  '나', '랑', '이랑', '며', '면서', '고', '서', '만',
]

// 첫머리로 의미가 약한 흔한 말(분포 표시는 하되, 다양성 점수의 가중치는 낮춘다).
// 접속부사로 문장을 시작하는 습관도 점검 대상이므로 분포에는 그대로 포함한다.
const CONNECTIVES = new Set([
  '그리고', '그러나', '그래서', '그런데', '하지만', '그러면', '또는', '또한',
  '그러므로', '따라서', '게다가', '오히려', '한편', '결국', '물론', '즉', '곧',
  '그리하여', '그러자', '그렇게', '그때', '이때', '이윽고', '마침내', '드디어',
])

// 문장부호(첫머리 정리용) — 따옴표·괄호 등 앞쪽 군더더기 제거
const LEAD_PUNCT = /^[\s"'“”‘’(){}\[\]<>«»『』「」【】·–—\-….,!?:;]+/u

interface Sentence {
  raw: string        // 원본(트림 전 위치 보존용은 index 로)
  text: string       // 트림한 문장
  index: number      // 본문 내 시작 인덱스(트림 시작 위치)
  end: number        // 본문 내 끝 인덱스
  firstWord: string  // 첫 단어(표면형)
  firstEojeol: string// 첫 어절(공백 단위, 표면형)
  key: string        // 현재 모드의 정규화 키(반복 묶음 비교용)
  display: string    // 화면에 보일 첫머리 표기
}

// 문장 분리: 마침표/물음표/느낌표(연속 포함, 줄임표)·동양 부호·개행을 경계로.
// 위치(시작 인덱스)를 보존해 본문에서 선택/하이라이트할 수 있게 한다.
function splitSentences(text: string): { s: string; index: number; end: number }[] {
  const out: { s: string; index: number; end: number }[] = []
  // 문장부호가 아닌 글자 + 뒤따르는 종결부호들
  const re = /[^.!?。！？…\n\r]+[.!?。！？…]*/gu
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > 200000) break
    const raw = m[0]
    const trimmed = raw.trim()
    if (!trimmed) continue
    const lead = raw.length - raw.trimStart().length
    const start = m.index + lead
    out.push({ s: trimmed, index: start, end: start + trimmed.length })
  }
  return out
}

// 첫머리에서 따옴표/괄호 등을 떼어 실제 첫 글자부터 보게 한다.
function stripLead(s: string): string {
  return s.replace(LEAD_PUNCT, '')
}

// 첫 단어(한글/영문/숫자 연속) 추출
function firstWordOf(s: string): string {
  const cleaned = stripLead(s)
  const m = cleaned.match(/^[\p{L}\p{N}][\p{L}\p{N}'’\-]*/u)
  return m ? m[0] : (cleaned.split(/\s+/)[0] || '')
}

// 첫 어절(공백 단위) 추출 — 뒤쪽 문장부호 정리
function firstEojeolOf(s: string): string {
  const cleaned = stripLead(s)
  const tok = cleaned.split(/\s+/)[0] || ''
  return tok.replace(/[.,!?;:"'“”‘’()\[\]{}…·~]+$/u, '')
}

// 조사 한 번 제거(어절 모드의 정규화)
function stripJosa(w: string): string {
  let s = w
  if (s.length <= 1) return s
  for (const j of JOSA) {
    if (s.length > j.length + 1 && s.endsWith(j)) {
      return s.slice(0, s.length - j.length)
    }
  }
  return s
}

// 정규화 키(반복 묶음 비교): 모드별. 영문은 소문자화.
function normKey(firstWord: string, firstEojeol: string, mode: Mode): string {
  if (mode === 'word') {
    return firstWord.toLowerCase()
  }
  // 어절 모드: 어절에서 조사를 가볍게 떼고 소문자화
  return stripJosa(firstEojeol).toLowerCase()
}

interface OpenerGroup {
  key: string
  display: string         // 대표 표기
  sentenceIdxs: number[]  // 이 첫머리로 시작하는 문장 인덱스(문장 배열 기준)
  count: number
  isConnective: boolean
}

interface RunInfo {
  key: string
  display: string
  startIdx: number  // 문장 배열 기준 시작
  length: number
}

interface Analysis {
  sentences: Sentence[]
  groups: OpenerGroup[]        // 2회 이상 반복되는 첫머리(많은 순)
  uniqueKeys: number           // 서로 다른 첫머리 종류 수
  total: number                // 문장 수
  repeatedSentenceCount: number// 반복 첫머리에 속한 문장 수(2회 이상 그룹 합)
  repeatRatio: number          // 반복 문장 비율(0~1)
  topKey: { display: string; count: number; ratio: number } | null
  runs: RunInfo[]              // 연속 반복 구간(같은 첫머리 잇따름)
  worstRun: number            // 가장 긴 연속 반복 길이
  diversity: number           // 다양성 점수 0~100
  connectiveCount: number     // 접속부사로 시작한 문장 수
  distribution: { display: string; count: number; isConnective: boolean }[] // 막대용(상위 N)
}

// Shannon 엔트로피 기반 + 페널티로 다양성 점수 산출
function computeDiversity(sentences: Sentence[], groups: OpenerGroup[], worstRun: number): number {
  const n = sentences.length
  if (n === 0) return 0
  if (n === 1) return 100
  // 키별 카운트
  const counts = new Map<string, number>()
  for (const s of sentences) counts.set(s.key, (counts.get(s.key) || 0) + 1)
  const k = counts.size
  // 정규화 엔트로피(0~1): H / log(n)  — 모두 다르면 1
  let H = 0
  for (const c of counts.values()) {
    const p = c / n
    H += -p * Math.log(p)
  }
  const Hmax = Math.log(n)
  const entropyScore = Hmax > 0 ? H / Hmax : 1 // 0~1
  // 종류 다양성: 서로 다른 첫머리 비율
  const varietyScore = k / n // 0~1
  // 기본 점수: 엔트로피·종류 평균
  let score = (entropyScore * 0.6 + varietyScore * 0.4) * 100
  // 연속 반복 페널티(연달아 같은 첫머리는 특히 눈에 거슬린다)
  if (worstRun >= 2) score -= Math.min(30, (worstRun - 1) * 8)
  // 최다 첫머리가 과도하게 큰 비중이면 추가 페널티
  const maxGroup = groups.length ? groups[0].count : 0
  const topRatio = maxGroup / n
  if (topRatio > 0.3) score -= Math.min(20, (topRatio - 0.3) * 100)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function analyze(text: string, mode: Mode): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const parts = splitSentences(text)
  if (parts.length === 0) return null

  const sentences: Sentence[] = parts.map((p) => {
    const fw = firstWordOf(p.s)
    const fe = firstEojeolOf(p.s)
    const key = normKey(fw, fe, mode) || '(빈 첫머리)'
    const display = (mode === 'word' ? fw : fe) || '(부호로 시작)'
    return {
      raw: p.s, text: p.s, index: p.index, end: p.end,
      firstWord: fw, firstEojeol: fe, key, display,
    }
  })

  const total = sentences.length

  // 키 → 문장 인덱스 모으기 + 대표 표기(가장 많이 쓰인 표면형)
  const byKey = new Map<string, number[]>()
  const displayVotes = new Map<string, Map<string, number>>()
  sentences.forEach((s, i) => {
    const arr = byKey.get(s.key)
    if (arr) arr.push(i); else byKey.set(s.key, [i])
    let dv = displayVotes.get(s.key)
    if (!dv) { dv = new Map(); displayVotes.set(s.key, dv) }
    dv.set(s.display, (dv.get(s.display) || 0) + 1)
  })
  const repDisplay = (key: string): string => {
    const dv = displayVotes.get(key)
    if (!dv) return key
    let best = ''; let bestC = -1
    for (const [d, c] of dv) if (c > bestC) { best = d; bestC = c }
    return best || key
  }

  const groups: OpenerGroup[] = []
  for (const [key, idxs] of byKey) {
    if (idxs.length >= 2) {
      const display = repDisplay(key)
      groups.push({
        key, display, sentenceIdxs: idxs, count: idxs.length,
        isConnective: CONNECTIVES.has(display) || CONNECTIVES.has(key),
      })
    }
  }
  groups.sort((a, b) => b.count - a.count || a.sentenceIdxs[0] - b.sentenceIdxs[0])

  const uniqueKeys = byKey.size
  const repeatedSentenceCount = groups.reduce((a, g) => a + g.count, 0)
  const repeatRatio = total > 0 ? repeatedSentenceCount / total : 0

  // 연속 반복 구간(같은 키가 바로 다음 문장에서도 이어질 때)
  const runs: RunInfo[] = []
  let i = 0
  let worstRun = 1
  while (i < sentences.length) {
    let j = i + 1
    while (j < sentences.length && sentences[j].key === sentences[i].key) j++
    const len = j - i
    if (len > worstRun) worstRun = len
    if (len >= RUN_WARN) {
      runs.push({ key: sentences[i].key, display: repDisplay(sentences[i].key), startIdx: i, length: len })
    }
    i = j
  }
  runs.sort((a, b) => b.length - a.length || a.startIdx - b.startIdx)

  const connectiveCount = sentences.filter((s) => CONNECTIVES.has(s.display) || CONNECTIVES.has(s.key)).length

  const topKey = groups.length
    ? { display: groups[0].display, count: groups[0].count, ratio: groups[0].count / total }
    : null

  const diversity = computeDiversity(sentences, groups, worstRun)

  // 분포(막대): 카운트 내림차순 상위 14개
  const distArr: { display: string; count: number; isConnective: boolean }[] = []
  for (const [key, idxs] of byKey) {
    const display = repDisplay(key)
    distArr.push({ display, count: idxs.length, isConnective: CONNECTIVES.has(display) || CONNECTIVES.has(key) })
  }
  distArr.sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, 'ko'))
  const distribution = distArr.slice(0, 14)

  return {
    sentences, groups, uniqueKeys, total,
    repeatedSentenceCount, repeatRatio, topKey,
    runs, worstRun, diversity, connectiveCount, distribution,
  }
}

// 점수 → 색/등급
function gradeOf(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '아주 다양함', color: 'var(--ok)' }
  if (score >= 60) return { label: '양호', color: 'var(--accent)' }
  if (score >= 40) return { label: '다소 단조', color: 'var(--warn)' }
  return { label: '매우 단조', color: 'var(--warn)' }
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// HTML escape(프로젝트 추가용 bodyHtml)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SAMPLE = '그는 천천히 문을 열었다. 그는 방 안을 둘러보았다. 그는 불을 켰다. 그리고 책상으로 다가갔다. 그리고 서랍을 열었다. 편지가 한 통 놓여 있었다. 그는 편지를 집어 들었다. 그는 봉투를 뜯었다. 안에는 짧은 글이 적혀 있었다. 비가 내리기 시작했다. 창밖이 어두워졌다. 그녀는 우산을 챙겼다.'

export default function SentenceOpenerAnalyzer({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<Mode>('word')
  const [tab, setTab] = useState<'overview' | 'repeats' | 'all'>('overview')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null) // 분포 막대 클릭 시 해당 첫머리 강조

  const copyTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // payload 로 본문/모드를 받으면 초기화
  useEffect(() => {
    if (!payload) return
    const t = payload.text ?? payload.body ?? payload.content
    if (typeof t === 'string' && t.trim()) setText(t)
    if (payload.mode === 'eojeol' || payload.mode === 'word') setMode(payload.mode)
  }, [payload])

  // localStorage 복원(최근 입력·모드)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { text?: string; mode?: Mode }
        if (typeof p.text === 'string') setText(p.text)
        if (p.mode === 'eojeol' || p.mode === 'word') setMode(p.mode)
      }
    } catch { /* noop */ }
    // 최초 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 입력/모드 변경 시 디바운스 저장
  useEffect(() => {
    if (saveTimer.current != null) clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ text, mode })) } catch { /* 용량 초과 무시 */ }
    }, 400)
    return () => { if (saveTimer.current != null) clearTimeout(saveTimer.current) }
  }, [text, mode])

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    if (saveTimer.current != null) clearTimeout(saveTimer.current)
  }, [])

  const analysis = useMemo(() => {
    try { return analyze(text, mode) } catch { return null }
  }, [text, mode])

  // 모드/본문 바뀌면 강조 키 초기화(잘못된 키 강조 방지)
  useEffect(() => { setActiveKey(null) }, [mode, text])

  // 결과 텍스트(복사/프로젝트용)
  const resultText = useMemo(() => {
    const a = analysis
    if (!a) return ''
    const grade = gradeOf(a.diversity)
    const lines: string[] = []
    lines.push('[문장 첫머리 다양성 점검]')
    lines.push(`분석 단위: ${mode === 'word' ? '첫 단어' : '첫 어절(조사 정리)'}`)
    lines.push(`문장 ${a.total}개 · 서로 다른 첫머리 ${a.uniqueKeys}종`)
    lines.push(`다양성 점수: ${a.diversity}/100 (${grade.label})`)
    lines.push(`반복 첫머리 문장 비율: ${(a.repeatRatio * 100).toFixed(0)}% (${a.repeatedSentenceCount}/${a.total})`)
    if (a.topKey) lines.push(`가장 많이 쓴 첫머리: "${a.topKey.display}" — ${a.topKey.count}회 (${(a.topKey.ratio * 100).toFixed(0)}%)`)
    lines.push(`연속 반복 최장: ${a.worstRun}문장`)
    lines.push(`접속부사로 시작: ${a.connectiveCount}문장`)
    if (a.groups.length > 0) {
      lines.push('')
      lines.push('[반복되는 첫머리]')
      a.groups.slice(0, 20).forEach((g, i) => {
        lines.push(`${i + 1}. "${g.display}" — ${g.count}회${g.isConnective ? ' (접속부사)' : ''}`)
      })
    }
    if (a.runs.length > 0) {
      lines.push('')
      lines.push('[연속 반복 구간]')
      a.runs.slice(0, 10).forEach((r) => {
        lines.push(`· "${r.display}"로 시작하는 문장 ${r.length}개 연속`)
      })
    }
    return lines.join('\n')
  }, [analysis, mode])

  // ── 동작 ───────────────────────────────────────────────
  const doCopy = useCallback(async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch { setCopied(false) }
  }, [resultText])

  const addToProj = useCallback(() => {
    const a = analysis
    if (!a || !hasProjectBridge()) return
    const grade = gradeOf(a.diversity)
    const rows: string[] = []
    rows.push(`<p><b>다양성 점수:</b> ${a.diversity}/100 (${esc(grade.label)})</p>`)
    rows.push(`<p>문장 ${a.total}개 · 서로 다른 첫머리 ${a.uniqueKeys}종 · 반복 비율 ${(a.repeatRatio * 100).toFixed(0)}%</p>`)
    if (a.topKey) rows.push(`<p>가장 많이 쓴 첫머리: <b>${esc(a.topKey.display)}</b> ${a.topKey.count}회</p>`)
    if (a.groups.length) {
      rows.push('<p><b>반복되는 첫머리</b></p><ul>')
      a.groups.slice(0, 20).forEach((g) => rows.push(`<li>${esc(g.display)} — ${g.count}회${g.isConnective ? ' (접속부사)' : ''}</li>`))
      rows.push('</ul>')
    }
    if (a.runs.length) {
      rows.push('<p><b>연속 반복 구간</b></p><ul>')
      a.runs.slice(0, 10).forEach((r) => rows.push(`<li>"${esc(r.display)}" ${r.length}문장 연속</li>`))
      rows.push('</ul>')
    }
    const id = addToProject({
      root: 'research',
      folder: '교정 점검',
      title: `문장 첫머리 점검 (${a.diversity}점)`,
      bodyHtml: rows.join('\n'),
      icon: '🅰️',
      meta: { 다양성점수: String(a.diversity), 문장수: String(a.total), 반복비율: `${(a.repeatRatio * 100).toFixed(0)}%` },
    })
    if (id) {
      setSaved(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setSaved(false), 1400)
    }
  }, [analysis])

  const stash = useCallback(() => {
    if (!resultText || !hasStash()) return
    addToStash({ kind: 'note', label: '문장 첫머리 점검', text: resultText })
    setSaved(true)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setSaved(false), 1400)
  }, [resultText])

  // 본문에서 위치 선택(점프)
  const jumpTo = useCallback((index: number, end: number) => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(index, end) } catch { /* noop */ }
    // 대략적인 스크롤 정렬
    try {
      const ratio = ta.value.length ? index / ta.value.length : 0
      ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 2)
    } catch { /* noop */ }
  }, [])

  // 바인더 파일 드롭(본문 불러오기)
  const onDrop = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      setText(item.text)
    }
  }, [])
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) }
  }, [])

  const a = analysis
  const grade = a ? gradeOf(a.diversity) : null
  const distMax = a && a.distribution.length ? Math.max(...a.distribution.map((d) => d.count), 1) : 1
  const hasInput = text.trim() !== ''

  // 강조 키에 속한 문장 인덱스 집합(전체 문장 뷰 하이라이트용)
  const activeIdxSet = useMemo(() => {
    if (!a || !activeKey) return null
    const set = new Set<number>()
    a.sentences.forEach((s, i) => { if (s.key === activeKey) set.add(i) })
    return set
  }, [a, activeKey])

  // 반복 첫머리(2회+)에 속한 문장 인덱스(전체 뷰에서 옅게 표시)
  const repeatedIdxSet = useMemo(() => {
    if (!a) return new Set<number>()
    const set = new Set<number>()
    a.groups.forEach((g) => g.sentenceIdxs.forEach((i) => set.add(i)))
    return set
  }, [a])

  // 개선 팁(상태 기반 동적 생성)
  const tips = useMemo(() => {
    if (!a) return [] as string[]
    const t: string[] = []
    if (a.worstRun >= 2) t.push(`같은 첫머리가 ${a.worstRun}문장 연속됩니다. 어순을 바꾸거나 부사구·시간어로 변주해 보세요.`)
    if (a.topKey && a.topKey.ratio > 0.25) t.push(`"${a.topKey.display}"(으)로 시작하는 문장이 전체의 ${(a.topKey.ratio * 100).toFixed(0)}%입니다. 주어 생략·도치·종속절 선행으로 줄여보세요.`)
    if (a.connectiveCount > Math.max(2, a.total * 0.2)) t.push(`접속부사(그리고·그래서 등)로 문장을 시작한 경우가 ${a.connectiveCount}회입니다. 문장을 잇거나 접속부사를 덜어내면 더 매끄럽습니다.`)
    if (mode === 'word') t.push('주어("그는·나는") 반복이 잦다면 한 단계 위 "첫 어절" 모드로 보면 조사 차이를 묶어 더 정확히 보입니다.')
    if (a.diversity >= 80) t.push('첫머리가 충분히 다양합니다. 지금의 리듬을 유지하세요.')
    if (t.length === 0) t.push('큰 문제는 보이지 않습니다. 문단 단위로도 첫 문장 첫머리를 한 번 더 점검해 보세요.')
    return t
  }, [a, mode])

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }
  const taStyle: React.CSSProperties = {
    minHeight: 92, maxHeight: 160, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const controls: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
  const modeRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center' }
  const pill = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: active ? 700 : 500,
  })
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal = (color: string): React.CSSProperties => ({ fontSize: 19, fontWeight: 700, color, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] })
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.7, padding: 16 }
  const tipItem: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, paddingLeft: 8, borderLeft: '3px solid var(--accent)' }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}><Emoji e="🅰️" /> 문장이 같은 말로 시작하는 반복을 찾아 첫머리 다양성을 점검합니다 (네트워크 불필요)</div>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        placeholder={'점검할 글을 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.\n문장 부호(. ? !)와 줄바꿈으로 문장을 나눠 각 문장의 첫머리를 분석합니다.'}
        spellCheck={false}
        aria-label="문장 첫머리 분석 입력"
      />

      <div style={controls}>
        <div style={modeRow}>
          <span style={hint}>분석 단위</span>
          <span style={pill(mode === 'word')} role="button" tabIndex={0} onClick={() => setMode('word')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('word') }}>첫 단어</span>
          <span style={pill(mode === 'eojeol')} role="button" tabIndex={0} onClick={() => setMode('eojeol')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('eojeol') }}>첫 어절(조사 정리)</span>
        </div>
        <span style={{ flex: 1 }} />
        <button className="minibtn" type="button" onClick={() => setText(SAMPLE)}>예시</button>
        <button className="minibtn" type="button" onClick={() => setText('')} disabled={!text}>지우기</button>
      </div>

      {!hasInput || !a ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}><Emoji e="🅰️" /></div>
          <div>글을 붙여넣으면 문장마다 첫머리를 모아<br />같은 말로 시작하는 반복·연속 반복을 찾고<br />다양성 점수와 첫머리 분포 막대를 그립니다.</div>
          <div style={hint}>예: "그는 ~. 그는 ~. 그리고 ~." 처럼 첫머리가 겹치면 짚어 줍니다.</div>
        </div>
      ) : (
        <>
          <div style={tabRow}>
            <span style={pill(tab === 'overview')} role="button" tabIndex={0} onClick={() => setTab('overview')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTab('overview') }}>개요·분포</span>
            <span style={pill(tab === 'repeats')} role="button" tabIndex={0} onClick={() => setTab('repeats')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTab('repeats') }}>반복 {a.groups.length}</span>
            <span style={pill(tab === 'all')} role="button" tabIndex={0} onClick={() => setTab('all')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTab('all') }}>전체 문장 {a.total}</span>
            <span style={{ flex: 1 }} />
            {hasProjectBridge() && <button className="minibtn" type="button" onClick={addToProj}>{saved ? <>✓ 추가됨</> : <><Emoji e="📄" /> 프로젝트에 추가</>}</button>}
            {hasStash() && <button className="minibtn" type="button" onClick={stash}><Emoji e="📥" /> 수집함</button>}
            <button className="btn-primary" type="button" onClick={doCopy}>{copied ? '복사됨 ✓' : '결과 복사'}</button>
          </div>

          {tab === 'overview' && (
            <div style={scroll}>
              {/* 점수 카드 */}
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
                  {/* 도넛형 점수 게이지(라이브러리 없이 conic-gradient) */}
                  <div style={{
                    width: 78, height: 78, borderRadius: '50%',
                    background: `conic-gradient(${grade!.color} ${a.diversity * 3.6}deg, var(--chrome-2) 0deg)`,
                  }} />
                  <div style={{
                    position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--panel)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: grade!.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{a.diversity}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>/100</div>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: grade!.color }}>{grade!.label}</div>
                  <div style={{ ...hint, marginTop: 4 }}>
                    첫머리 다양성 점수입니다. 서로 다른 첫머리가 많고, 같은 첫머리가 연달아 나오지 않을수록 높습니다.
                  </div>
                </div>
              </div>

              {/* 통계 */}
              <div style={grid}>
                <div style={stat}><div style={statVal('var(--accent)')}>{a.total}</div><div style={statLabel}>문장 수</div></div>
                <div style={stat}><div style={statVal('var(--accent)')}>{a.uniqueKeys}</div><div style={statLabel}>첫머리 종류</div></div>
                <div style={stat}><div style={statVal(a.repeatRatio > 0.4 ? 'var(--warn)' : 'var(--accent)')}>{(a.repeatRatio * 100).toFixed(0)}%</div><div style={statLabel}>반복 비율</div></div>
                <div style={stat}><div style={statVal(a.worstRun >= 2 ? 'var(--warn)' : 'var(--ok)')}>{a.worstRun}</div><div style={statLabel}>연속 최장</div></div>
              </div>

              {/* 연속 반복 경고 */}
              {a.runs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={sectionTitle}><Emoji e="⚠️" /> 연속 반복 — 같은 첫머리 문장이 잇따릅니다</div>
                  {a.runs.slice(0, 8).map((r, i) => (
                    <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, lineHeight: 1.55 }}>
                      <span style={{ color: 'var(--warn)', fontWeight: 700 }}>"{r.display}"</span> 로 시작하는 문장 <b>{r.length}개</b> 연속
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {a.sentences.slice(r.startIdx, r.startIdx + r.length).map((s, k) => (
                          <span key={k} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}
                            onClick={() => jumpTo(s.index, s.end)} title="클릭하면 본문에서 선택">
                            · {clip(s.text, 56)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
                  ✓ 같은 첫머리가 연달아 나오는 구간이 없습니다.
                </div>
              )}

              {/* 분포 막대 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={topBar}>
                  <div style={sectionTitle}><Emoji e="📊" /> 첫머리 분포 (상위 {a.distribution.length}개)</div>
                  <div style={hint}>막대 클릭 → 전체 문장에서 강조</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {a.distribution.map((d, i) => {
                    const pct = Math.max(3, Math.round((d.count / distMax) * 100))
                    const repeated = d.count >= 2
                    const color = d.isConnective ? 'var(--warn)' : repeated ? 'var(--accent)' : 'var(--muted)'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        title="클릭하면 전체 문장 탭에서 이 첫머리를 강조합니다"
                        onClick={() => { setActiveKey(a.sentences.find((s) => s.display === d.display)?.key || null); setTab('all') }}>
                        <div style={{ width: 88, textAlign: 'right', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: repeated ? 700 : 400 }} title={d.display}>{d.display}{d.isConnective ? ' ⚑' : ''}</div>
                        <div style={{ flex: 1, minWidth: 0, height: 16, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .25s' }} />
                        </div>
                        <div style={{ width: 26, textAlign: 'right', fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{d.count}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={hint}>⚑ 표시는 접속부사(그리고·그래서 등)로 시작한 첫머리입니다.</div>
              </div>

              {/* 개선 팁 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={sectionTitle}><Emoji e="💡" /> 개선 팁</div>
                {tips.map((t, i) => <div key={i} style={tipItem}>{t}</div>)}
              </div>
            </div>
          )}

          {tab === 'repeats' && (
            <div style={scroll}>
              {a.groups.length === 0 ? (
                <div style={empty}>
                  <div style={{ fontSize: 30 }}><Emoji e="✅" /></div>
                  <div>같은 말로 시작하는 문장(2회 이상)이 없습니다.</div>
                  <div style={hint}>첫머리가 모두 달라 단조롭지 않습니다.</div>
                </div>
              ) : (
                a.groups.map((g, i) => (
                  <div key={g.key + i} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', background: 'var(--chrome-2)', borderRadius: 6, padding: '1px 8px' }}>{g.display}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: g.count >= 4 ? 'var(--warn)' : 'var(--accent)', border: `1px solid ${g.count >= 4 ? 'var(--warn)' : 'var(--accent)'}`, borderRadius: 6, padding: '1px 6px' }}>{g.count}회</span>
                      {g.isConnective && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', border: '1px solid var(--warn)', borderRadius: 6, padding: '1px 6px' }}>접속부사</span>}
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>전체의 {((g.count / a.total) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {g.sentenceIdxs.map((si) => {
                        const s = a.sentences[si]
                        const headLen = s.display.length
                        return (
                          <div key={si} style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', cursor: 'pointer', paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}
                            onClick={() => jumpTo(s.index, s.end)} title="클릭하면 본문에서 선택">
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.text.slice(0, headLen)}</span>
                            <span>{clip(s.text.slice(headLen), 64)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'all' && (
            <div style={scroll}>
              {activeKey && (
                <div style={{ ...hint, display: 'flex', alignItems: 'center', gap: 8 }}>
                  강조 중: <b style={{ color: 'var(--accent)' }}>{a.sentences.find((s) => s.key === activeKey)?.display}</b>
                  <button className="minibtn" type="button" onClick={() => setActiveKey(null)}>해제</button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {a.sentences.map((s, i) => {
                  const isActive = activeIdxSet ? activeIdxSet.has(i) : false
                  const isRepeated = repeatedIdxSet.has(i)
                  const headLen = s.display.length
                  const bg = isActive ? 'var(--paper)' : 'transparent'
                  const bl = isActive ? '3px solid var(--accent)' : isRepeated ? '3px solid var(--warn)' : '3px solid transparent'
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 8px',
                      background: bg, borderLeft: bl, borderRadius: 6, cursor: 'pointer',
                    }} onClick={() => jumpTo(s.index, s.end)} title="클릭하면 본문에서 선택">
                      <span style={{ width: 24, textAlign: 'right', fontSize: 11, color: 'var(--muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{i + 1}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.55 }}>
                        <span style={{ fontWeight: 700, color: isRepeated ? 'var(--warn)' : 'var(--accent)' }}>{s.text.slice(0, headLen)}</span>
                        <span style={{ color: 'var(--text)' }}>{clip(s.text.slice(headLen), 80)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={hint}>왼쪽 색 막대: <span style={{ color: 'var(--warn)' }}>주황</span> = 반복 첫머리 문장 · <span style={{ color: 'var(--accent)' }}>파랑</span> = 현재 강조. 첫머리(굵게)만 강조 표시됩니다.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
