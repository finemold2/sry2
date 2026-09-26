// 페이싱 분석기 — 원고를 장(章) 단위로 쪼개어 챕터별 분량·평균 문장 길이·대화 비율을 측정하고,
//   막대 그래프 + 페이싱(속도) 곡선으로 이야기의 리듬을 한눈에 보여준다. "늘어짐(중간 처짐)" 구간을
//   자동 진단·경고하고, 전체를 프로젝트 리포트(자료 › 구조)로 내보낸다.
// 장 구분 규칙: '===' 류 가로줄 / '#'·'##' 머리글 / 'Chapter N'·'N장'·'프롤로그' 등 표제 /
//   2줄 이상 빈 줄(문단 경계) — 사용자가 토글로 켜고 끌 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(네트워크·라이브러리 불필요).
//   영속: 본문/옵션은 localStorage 'sry:tool:pacing-analyzer' 에 자동 저장/복원. 언마운트 시 타이머 정리.
//   연계: 좌측 바인더 파일 드래그앤드롭 수용(본문 불러오기), 결과를 프로젝트 리포트/수집함으로 보냄.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = { id: 'pacing-analyzer', name: '페이싱 분석기', icon: '🌊', group: '교정·언어', intro: '원고를 장 단위로 나눠 분량·문장 길이·대화 비율을 막대와 페이싱 곡선으로 보여주고 늘어짐 구간을 경고합니다', w: 720, h: 720 }

const LS_KEY = 'sry:tool:pacing-analyzer'

// ── 옵션 ───────────────────────────────────────────────────
interface Options {
  byMarker: boolean   // '===' 가로줄 / '#' 머리글 / 'N장' 표제로 분할
  byBlank: boolean    // 2줄 이상 빈 줄(문단 경계)로 분할
  minChars: number    // 이 글자수 미만 조각은 앞 챕터에 병합(잡음 방지)
}
const DEFAULT_OPTS: Options = { byMarker: true, byBlank: false, minChars: 80 }

// ── 따옴표(대사) 정의 ──────────────────────────────────────
// 곧은따옴표는 여닫이가 같아 토글, 둥근/낫표는 가장 가까운 짝으로 닫는다.
interface QuotePair { open: string; close: string }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”' }, { open: '‘', close: '’' },
  { open: '「', close: '」' }, { open: '『', close: '』' },
  { open: '"', close: '"' }, { open: "'", close: "'" },
]

// 공백·개행 제외 글자수(체감 분량)
function visibleLen(s: string): number {
  return s.replace(/\s/g, '').length
}

// 챕터 표제 패턴(머리글/장 번호/프롤로그 등) — 한 줄 전체가 표제인지 검사
const HEADING_RE = /^\s*(#{1,6}\s+.+|chapter\s+\w+.*|제?\s*\d+\s*장.*|\d+\s*장\s*.*|프롤로그.*|에필로그.*|서장.*|종장.*|interlude.*|간장.*)\s*$/i
// 가로줄 구분선: ===, ---(3+), ***, ___, ●●● 등(3자 이상 같은 기호 반복)
const RULE_RE = /^\s*([=\-*_#~●○◆◇■□▪▶•·.]{3,})\s*$/

// ── 대사/지문 분해 ──────────────────────────────────────────
// 한 챕터 텍스트에서 따옴표로 묶인 구간을 대사로, 나머지를 지문으로 본다(공백 제외 글자수 기준).
function splitDialogue(text: string): { dialogueChars: number; narrationChars: number; dialogueCount: number } {
  const chars = [...text]
  let i = 0
  let narration = ''
  let dialogueChars = 0
  let dialogueCount = 0
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)

  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (pair) {
      // 곧은 작은따옴표는 영어 축약형/소유격 오탐 방지
      if (ch === "'" && isAlnum(chars[i - 1])) { narration += ch; i++; continue }
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
        if (cj === pair.close) { closed = true; break }
        if (cj === '\n' && chars[j + 1] === '\n') break  // 문단 경계 → 미닫힘 처리
        inner += cj; j++
      }
      if (closed) {
        const t = inner.trim()
        if (t.length > 0) { dialogueChars += visibleLen(t); dialogueCount++ }
        i = j + 1
      } else { narration += ch; i++ }
    } else { narration += ch; i++ }
  }
  return { dialogueChars, narrationChars: visibleLen(narration), dialogueCount }
}

// 문장 분리: 종결부호(. ? ! 。！？…)·개행 경계. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ── 챕터 분할 ───────────────────────────────────────────────
interface RawChapter { title: string; body: string }

// 옵션에 따라 원고를 장 단위로 자른다. 표제/가로줄은 새 챕터의 제목으로 삼는다.
function splitChapters(text: string, opt: Options): RawChapter[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const chapters: RawChapter[] = []
  let curTitle = ''
  let curLines: string[] = []
  let blankRun = 0

  const flush = () => {
    const body = curLines.join('\n').trim()
    if (body.length > 0 || curTitle) chapters.push({ title: curTitle, body })
    curTitle = ''
    curLines = []
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    const trimmed = line.trim()

    if (trimmed === '') {
      blankRun++
      // 빈 줄 기준 분할: 2줄 이상 연속 빈 줄을 만나면 경계
      if (opt.byBlank && blankRun >= 2 && curLines.some((l) => l.trim() !== '')) {
        flush()
      }
      curLines.push(line)
      continue
    }
    blankRun = 0

    if (opt.byMarker) {
      // 가로 구분선 → 본문 없이 경계만(다음 줄들이 새 챕터)
      if (RULE_RE.test(trimmed)) {
        flush()
        continue
      }
      // 표제 줄 → 현재 챕터를 닫고, 이 줄을 새 챕터 제목으로
      if (HEADING_RE.test(trimmed)) {
        flush()
        curTitle = trimmed.replace(/^#{1,6}\s+/, '').trim()
        continue
      }
    }
    curLines.push(line)
  }
  flush()

  // 너무 짧은 조각은 앞 챕터에 병합(머리글만 있고 본문이 없는 경우 등 잡음 제거)
  const merged: RawChapter[] = []
  for (const ch of chapters) {
    const len = visibleLen(ch.body)
    if (merged.length > 0 && len < opt.minChars && !ch.title) {
      const prev = merged[merged.length - 1]
      prev.body = (prev.body + '\n' + ch.body).trim()
    } else if (merged.length > 0 && len < opt.minChars && ch.title && !ch.body) {
      // 본문 없는 표제만 → 다음 본문에 제목 부여하기 위해 임시 보관
      merged.push({ title: ch.title, body: '' })
    } else {
      merged.push({ ...ch })
    }
  }
  // 빈 본문(제목만) 챕터를 다음 챕터에 제목으로 흡수
  const final: RawChapter[] = []
  for (let i = 0; i < merged.length; i++) {
    const ch = merged[i]
    if (ch.title && !ch.body && merged[i + 1] && !merged[i + 1].title) {
      final.push({ title: ch.title, body: merged[i + 1].body })
      i++
    } else if (ch.body || ch.title) {
      final.push(ch)
    }
  }
  return final.filter((c) => c.body.length > 0 || c.title)
}

// ── 챕터별 지표 ─────────────────────────────────────────────
interface ChapterStat {
  index: number
  title: string
  chars: number          // 공백 제외 글자수
  sentences: number
  avgSentLen: number     // 평균 문장 길이(공백 제외 글자수)
  dialoguePct: number    // 대화 비율(%)
  dialogueCount: number
  pace: number           // 페이싱 점수(0~100, 높을수록 빠름)
  preview: string
}

// 페이싱(속도) 점수: 짧은 문장 + 높은 대화 비율 = 빠름. 긴 문장 + 지문 위주 = 느림.
// 평균 문장 길이를 0(빠름)~1(느림)로 정규화하고, 대화 비율을 더해 0~100으로 환산.
function paceScore(avgSentLen: number, dialoguePct: number): number {
  // 문장 길이 8자=빠름, 45자+=느림 기준으로 0~1 매핑(짧을수록 1에 가깝게 → 빠름)
  const lenFast = Math.max(0, Math.min(1, (45 - avgSentLen) / (45 - 8)))
  const dialFast = Math.max(0, Math.min(1, dialoguePct / 100))
  // 가중 합(문장 길이 60% + 대화 비율 40%)
  const v = (lenFast * 0.6 + dialFast * 0.4) * 100
  return Math.round(Math.max(0, Math.min(100, v)))
}

function analyzeChapters(raw: RawChapter[]): ChapterStat[] {
  return raw.map((ch, i) => {
    const chars = visibleLen(ch.body)
    const sents = splitSentences(ch.body)
    const sentCount = sents.length
    const sentChars = sents.reduce((a, s) => a + visibleLen(s), 0)
    const avgSentLen = sentCount > 0 ? sentChars / sentCount : 0
    const dlg = splitDialogue(ch.body)
    const total = dlg.dialogueChars + dlg.narrationChars
    const dialoguePct = total > 0 ? (dlg.dialogueChars / total) * 100 : 0
    const pace = paceScore(avgSentLen, dialoguePct)
    const preview = ch.body.replace(/\s+/g, ' ').trim().slice(0, 70)
    return {
      index: i,
      title: ch.title || `${i + 1}장`,
      chars, sentences: sentCount, avgSentLen, dialoguePct,
      dialogueCount: dlg.dialogueCount, pace, preview,
    }
  })
}

// ── 늘어짐(처짐) 경고 ───────────────────────────────────────
interface SagWarning { kind: 'pace' | 'long-sent' | 'no-dialogue' | 'oversized' | 'midpoint'; chapter: ChapterStat; msg: string }

function detectSags(stats: ChapterStat[]): SagWarning[] {
  const warns: SagWarning[] = []
  if (stats.length === 0) return warns
  const avgPace = stats.reduce((a, c) => a + c.pace, 0) / stats.length
  const avgChars = stats.reduce((a, c) => a + c.chars, 0) / stats.length

  for (const c of stats) {
    // 느린 페이싱(평균 대비 한참 아래 + 절대적으로도 느림)
    if (c.pace <= 30 && c.pace < avgPace - 18 && c.chars >= 120) {
      warns.push({ kind: 'pace', chapter: c, msg: `페이싱이 느립니다(속도 ${c.pace}). 긴 지문이 이어져 늘어질 수 있어요.` })
    }
    // 문장이 지나치게 김
    if (c.avgSentLen >= 50 && c.chars >= 120) {
      warns.push({ kind: 'long-sent', chapter: c, msg: `평균 문장 길이 ${c.avgSentLen.toFixed(0)}자로 깁니다. 끊어 쓰면 리듬이 살아납니다.` })
    }
    // 대사가 거의 없는 긴 챕터(설명 과다)
    if (c.dialoguePct < 5 && c.chars >= avgChars * 1.3 && c.chars >= 400) {
      warns.push({ kind: 'no-dialogue', chapter: c, msg: `대사가 거의 없는 긴 챕터입니다(${c.chars}자). 장면·대화를 섞으면 덜 처집니다.` })
    }
    // 분량이 평균의 2.2배 이상으로 비대
    if (stats.length >= 3 && c.chars >= avgChars * 2.2 && c.chars >= 500) {
      warns.push({ kind: 'oversized', chapter: c, msg: `분량이 평균의 ${(c.chars / avgChars).toFixed(1)}배입니다. 둘로 나누면 호흡이 좋아질 수 있어요.` })
    }
  }

  // 중간 처짐(midpoint sag): 중반부 평균 페이싱이 처음/끝보다 뚜렷이 낮은가
  if (stats.length >= 5) {
    const third = Math.max(1, Math.floor(stats.length / 3))
    const head = stats.slice(0, third)
    const mid = stats.slice(third, stats.length - third)
    const tail = stats.slice(stats.length - third)
    const m = (arr: ChapterStat[]) => arr.length ? arr.reduce((a, c) => a + c.pace, 0) / arr.length : 0
    const midP = m(mid), edgeP = (m(head) + m(tail)) / 2
    if (mid.length > 0 && edgeP - midP >= 15) {
      const slowest = mid.reduce((a, b) => (b.pace < a.pace ? b : a), mid[0])
      warns.push({ kind: 'midpoint', chapter: slowest, msg: `중반부 페이싱이 처음·끝보다 ${(edgeP - midP).toFixed(0)}점 낮습니다(전형적 "중간 늘어짐"). 중반에 반전·위기·판돈 상승을 넣어 보세요.` })
    }
  }
  return warns
}

// 페이싱 점수 → 라벨/색
function paceLabel(p: number): { label: string; color: string } {
  if (p >= 70) return { label: '빠름', color: 'var(--ok)' }
  if (p >= 45) return { label: '보통', color: 'var(--accent)' }
  if (p >= 28) return { label: '느림', color: 'var(--warn)' }
  return { label: '매우 느림', color: 'var(--warn)' }
}

// ── 저장/복원 ───────────────────────────────────────────────
interface SaveShape { text: string; opt: Options }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { text: '', opt: { ...DEFAULT_OPTS } }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { text: '', opt: { ...DEFAULT_OPTS } }
    const opt: Options = {
      byMarker: typeof p?.opt?.byMarker === 'boolean' ? p.opt.byMarker : DEFAULT_OPTS.byMarker,
      byBlank: typeof p?.opt?.byBlank === 'boolean' ? p.opt.byBlank : DEFAULT_OPTS.byBlank,
      minChars: Number.isFinite(p?.opt?.minChars) ? Math.max(0, Math.min(2000, p.opt.minChars)) : DEFAULT_OPTS.minChars,
    }
    return { text: typeof p.text === 'string' ? p.text : '', opt }
  } catch { return { text: '', opt: { ...DEFAULT_OPTS } } }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function PacingAnalyzer({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [text, setText] = useState(() => {
    const fromPayload = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    return fromPayload || init.current.text
  })
  const [opt, setOpt] = useState<Options>(init.current.opt)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showList, setShowList] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장(차단/용량초과 graceful)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, opt } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [text, opt])

  // 토스트 자동 소거
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2200)
    return () => window.clearTimeout(t)
  }, [saved])

  // ── 분석(메모) ────────────────────────────────────────────
  const analysis = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return null
    let raw: RawChapter[]
    try { raw = splitChapters(text, opt) } catch { return null }
    if (raw.length === 0) return null
    const stats = analyzeChapters(raw)
    if (stats.length === 0) return null

    const totalChars = stats.reduce((a, c) => a + c.chars, 0)
    const totalSents = stats.reduce((a, c) => a + c.sentences, 0)
    const totalDialogueCount = stats.reduce((a, c) => a + c.dialogueCount, 0)
    const avgPace = stats.reduce((a, c) => a + c.pace, 0) / stats.length
    const avgSentLen = totalSents > 0
      ? stats.reduce((a, c) => a + c.avgSentLen * c.sentences, 0) / totalSents : 0
    // 전체 대화 비율(글자수 가중 평균)
    const wDialogue = stats.reduce((a, c) => a + (c.dialoguePct / 100) * c.chars, 0)
    const overallDialoguePct = totalChars > 0 ? (wDialogue / totalChars) * 100 : 0
    const warns = detectSags(stats)
    const maxChars = Math.max(...stats.map((c) => c.chars), 1)

    return { stats, totalChars, totalSents, totalDialogueCount, avgPace, avgSentLen, overallDialoguePct, warns, maxChars }
  }, [text, opt])

  // ── 텍스트 리포트 ─────────────────────────────────────────
  const buildText = (): string => {
    const a = analysis
    if (!a) return ''
    const L: string[] = []
    L.push('[페이싱 분석 리포트]')
    L.push(`챕터 ${a.stats.length}개 · 전체 ${a.totalChars}자(공백 제외) · 문장 ${a.totalSents}개`)
    L.push(`평균 문장 길이 ${a.avgSentLen.toFixed(1)}자 · 대화 비율 ${Math.round(a.overallDialoguePct)}% · 평균 페이싱 ${Math.round(a.avgPace)}/100`)
    L.push('')
    L.push('— 챕터별 —')
    a.stats.forEach((c) => {
      L.push(`${c.index + 1}. ${c.title}  |  ${c.chars}자 · 문장 ${c.sentences}개(평균 ${c.avgSentLen.toFixed(0)}자) · 대화 ${Math.round(c.dialoguePct)}% · 페이싱 ${c.pace} (${paceLabel(c.pace).label})`)
    })
    if (a.warns.length > 0) {
      L.push('')
      L.push('— 늘어짐 경고 —')
      a.warns.forEach((w) => L.push(`· [${w.chapter.index + 1}. ${w.chapter.title}] ${w.msg}`))
    } else {
      L.push('')
      L.push('늘어짐 경고: 없음 (전반적으로 리듬이 안정적입니다)')
    }
    return L.join('\n')
  }

  const buildHtml = (): string => {
    const a = analysis
    if (!a) return ''
    const P: string[] = []
    P.push(`<p><strong>페이싱 분석 리포트</strong> · 챕터 ${a.stats.length}개 · 전체 ${a.totalChars}자(공백 제외) · 문장 ${a.totalSents}개</p>`)
    P.push(`<p>평균 문장 길이 ${a.avgSentLen.toFixed(1)}자 · 대화 비율 ${Math.round(a.overallDialoguePct)}% · 평균 페이싱 ${Math.round(a.avgPace)}/100</p>`)
    P.push('<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>#</th><th>챕터</th><th>글자수</th><th>문장</th><th>평균문장</th><th>대화%</th><th>페이싱</th></tr></thead><tbody>')
    a.stats.forEach((c) => {
      P.push(`<tr><td>${c.index + 1}</td><td>${esc(c.title)}</td><td>${c.chars}</td><td>${c.sentences}</td><td>${c.avgSentLen.toFixed(0)}</td><td>${Math.round(c.dialoguePct)}%</td><td>${c.pace} (${paceLabel(c.pace).label})</td></tr>`)
    })
    P.push('</tbody></table>')
    if (a.warns.length > 0) {
      P.push('<p><strong>늘어짐 경고</strong></p><ul>')
      a.warns.forEach((w) => P.push(`<li>[${w.chapter.index + 1}. ${esc(w.chapter.title)}] ${esc(w.msg)}</li>`))
      P.push('</ul>')
    } else {
      P.push('<p>늘어짐 경고: 없음 (전반적으로 리듬이 안정적입니다)</p>')
    }
    return P.join('')
  }

  const markCopied = () => {
    setCopied(true)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
  }
  const fallbackCopy = (s: string): boolean => {
    try {
      const ta = document.createElement('textarea')
      ta.value = s; ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
  const copy = async () => {
    const s = buildText()
    if (!s) return
    try { await navigator.clipboard.writeText(s); markCopied() }
    catch { if (fallbackCopy(s)) markCopied(); else setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge() || !analysis) return
    const a = analysis
    const meta: Record<string, string> = {
      챕터수: String(a.stats.length),
      전체글자수: String(a.totalChars),
      평균문장길이: a.avgSentLen.toFixed(1),
      대화비율: Math.round(a.overallDialoguePct) + '%',
      평균페이싱: Math.round(a.avgPace) + '/100',
      늘어짐경고: String(a.warns.length),
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '페이싱 분석 리포트',
      bodyHtml: buildHtml(),
      meta,
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 연결되지 않았습니다.')
  }

  const toStash = () => {
    const s = buildText()
    if (!s || !hasStash()) return
    addToStash({ kind: 'note', label: '페이싱 분석 리포트', text: s })
    if (mounted.current) { setSaved(true) }
  }

  // ── 바인더 파일 드롭(본문 불러오기) ───────────────────────
  const onDrop = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      setText(item.text)
      setNote(`"${item.title || '문서'}" 본문을 불러왔습니다.`)
    } else if (item) {
      setNote('이 파일에는 분석할 본문 텍스트가 없습니다.')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  const a = analysis

  // ── 페이싱 곡선 SVG 좌표 ──────────────────────────────────
  const VBW = 660, VBH = 180
  const PADL = 30, PADR = 14, PADT = 14, PADB = 26
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const n = a ? a.stats.length : 0
  const xAt = (i: number) => n <= 1 ? PADL + plotW / 2 : PADL + (i / (n - 1)) * plotW
  const yAt = (p: number) => PADT + (1 - p / 100) * plotH
  const pts = a ? a.stats.map((c, i) => ({ x: xAt(i), y: yAt(c.pace), c })) : []
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = pts.length
    ? `M${pts[0].x.toFixed(1)},${(PADT + plotH).toFixed(1)} ` +
      pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${pts[pts.length - 1].x.toFixed(1)},${(PADT + plotH).toFixed(1)} Z`
    : ''

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const taStyle: React.CSSProperties = {
    minHeight: 110, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 19, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '24px 12px' }
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🌊"/></span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>페이싱 분석기</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => { setText(''); setNote('') }} disabled={!text}>↺ 지우기</button>
        <button className="minibtn" onClick={copy} disabled={!a} title="리포트를 텍스트로 복사">{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
        {hasStash() && <button className="minibtn" onClick={toStash} disabled={!a} title="수집함에 리포트 담기"><Emoji e="📥"/> 수집함</button>}
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || !a}
          title={hasProjectBridge() ? (a ? '자료 › 구조 폴더에 페이싱 리포트로 추가' : '먼저 본문을 입력하세요') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 리포트를 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* 입력 */}
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          placeholder={'원고 전체를 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.\n\n장 구분: === 가로줄 / # 머리글 / "1장"·"프롤로그" 표제 / (옵션) 빈 줄'}
          spellCheck={false}
          aria-label="페이싱 분석 원고 입력"
        />

        {/* 분할 옵션 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...hint, fontWeight: 700 }}>장 나누기:</span>
          <span style={chip(opt.byMarker)} onClick={() => setOpt((o) => ({ ...o, byMarker: !o.byMarker }))} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpt((o) => ({ ...o, byMarker: !o.byMarker })) } }}>
            {opt.byMarker ? '☑' : '☐'} 구분선·머리글·표제
          </span>
          <span style={chip(opt.byBlank)} onClick={() => setOpt((o) => ({ ...o, byBlank: !o.byBlank }))} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpt((o) => ({ ...o, byBlank: !o.byBlank })) } }}>
            {opt.byBlank ? '☑' : '☐'} 빈 줄(문단)
          </span>
          {!opt.byMarker && !opt.byBlank && (
            <span style={{ ...hint, color: 'var(--warn)' }}>※ 둘 다 끄면 전체를 한 챕터로 봅니다.</span>
          )}
        </div>

        {!a ? (
          <div style={empty}>
            원고를 입력하면 장(章) 단위로 나눠<br />
            분량·평균 문장 길이·대화 비율을 막대와 페이싱 곡선으로 보여주고,<br />
            늘어지는 구간을 짚어 드립니다.
          </div>
        ) : (
          <>
            {/* 전체 요약 */}
            <div style={grid4}>
              <div style={stat}><div style={statVal}>{a.stats.length}</div><div style={statLabel}>챕터</div></div>
              <div style={stat}><div style={statVal}>{a.totalChars.toLocaleString()}</div><div style={statLabel}>전체 글자수</div></div>
              <div style={stat}><div style={statVal}>{a.avgSentLen.toFixed(1)}</div><div style={statLabel}>평균 문장 길이</div></div>
              <div style={stat}><div style={statVal}>{Math.round(a.overallDialoguePct)}%</div><div style={statLabel}>대화 비율</div></div>
            </div>

            {/* 페이싱 곡선 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}><Emoji e="📈"/> 페이싱(속도) 곡선 · 위=빠름, 아래=느림</span>
                <span style={hint}>평균 {Math.round(a.avgPace)}/100</span>
              </div>
              <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 190 }} role="img" aria-label="페이싱 곡선">
                {/* 격자 + Y라벨 */}
                {[100, 70, 45, 28, 0].map((v) => {
                  const y = yAt(v)
                  return (
                    <g key={v}>
                      <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray={v === 0 ? undefined : '2 4'} opacity={0.5} />
                      <text x={PADL - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="var(--muted)">{v}</text>
                    </g>
                  )
                })}
                {/* 평균선 */}
                <line x1={PADL} y1={yAt(a.avgPace)} x2={VBW - PADR} y2={yAt(a.avgPace)} stroke="var(--accent)" strokeWidth={1} strokeDasharray="5 4" opacity={0.5} />
                {/* 면적 + 곡선 */}
                {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.1} />}
                <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {/* 점 */}
                {pts.map((p, i) => {
                  const pl = paceLabel(p.c.pace)
                  return (
                    <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))} style={{ cursor: 'pointer' }}>
                      <circle cx={p.x} cy={p.y} r={hover === i ? 6 : 4.5} fill={pl.color} stroke="var(--paper)" strokeWidth={1.5}>
                        <title>{`${p.c.index + 1}. ${p.c.title}\n페이싱 ${p.c.pace} (${pl.label})\n${p.c.chars}자 · 평균문장 ${p.c.avgSentLen.toFixed(0)}자 · 대화 ${Math.round(p.c.dialoguePct)}%`}</title>
                      </circle>
                    </g>
                  )
                })}
                {/* X축 챕터 번호(촘촘하면 일부만) */}
                {pts.map((p, i) => {
                  const step = Math.max(1, Math.ceil(n / 12))
                  if (i % step !== 0 && i !== n - 1) return null
                  return <text key={'x' + i} x={p.x} y={VBH - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">{i + 1}</text>
                })}
              </svg>
              {hover != null && a.stats[hover] && (
                <div style={{ ...hint, marginTop: 4, color: 'var(--text)' }}>
                  <strong>{hover + 1}. {a.stats[hover].title}</strong> — 페이싱 {a.stats[hover].pace} ({paceLabel(a.stats[hover].pace).label}) · {a.stats[hover].chars}자 · 평균문장 {a.stats[hover].avgSentLen.toFixed(0)}자 · 대화 {Math.round(a.stats[hover].dialoguePct)}%
                </div>
              )}
            </div>

            {/* 늘어짐 경고 */}
            {a.warns.length > 0 ? (
              <div style={{ ...panel, borderLeft: '3px solid var(--warn)' }}>
                <div style={sectionTitle}><Emoji e="⚠️"/> 늘어짐 경고 ({a.warns.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {a.warns.map((w, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--warn)', background: 'var(--chrome-2)', borderRadius: 6, padding: '1px 6px' }}>
                        {w.chapter.index + 1}장
                      </span>
                      <span style={{ minWidth: 0 }}>{w.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...panel, borderLeft: '3px solid var(--ok)', color: 'var(--ok)', fontSize: 13, fontWeight: 600 }}>
                ✓ 두드러진 늘어짐 구간이 없습니다. 전반적으로 리듬이 안정적이에요.
              </div>
            )}

            {/* 챕터별 막대 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}><Emoji e="📊"/> 챕터별 분량 · 대화 비율</span>
                <button className="minibtn" onClick={() => setShowList((v) => !v)}>{showList ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>
              {showList && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.stats.map((c) => {
                    const widthPct = Math.max(3, Math.round((c.chars / a.maxChars) * 100))
                    const pl = paceLabel(c.pace)
                    const warned = a.warns.some((w) => w.chapter.index === c.index)
                    return (
                      <div key={c.index}
                        onMouseEnter={() => setHover(c.index)}
                        onMouseLeave={() => setHover((h) => (h === c.index ? null : h))}
                        style={{ background: 'var(--chrome-2)', border: `1px solid ${warned ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 22, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{c.index + 1}.</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</span>
                          {warned && <span style={{ fontSize: 11, color: 'var(--warn)', flexShrink: 0 }}><Emoji e="⚠️"/></span>}
                          <span style={{ fontSize: 11, fontWeight: 700, color: pl.color, flexShrink: 0 }}>{pl.label} {c.pace}</span>
                        </div>
                        {/* 분량 막대(대화 비율을 막대 안에 색으로) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0, height: 18, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }} title={`분량 ${c.chars}자 · 대화 ${Math.round(c.dialoguePct)}%`}>
                            <div style={{ width: `${widthPct}%`, height: '100%', display: 'flex', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{ width: `${c.dialoguePct}%`, background: 'var(--accent)', flexShrink: 0 }} />
                              <div style={{ flex: 1, background: 'var(--chrome)', minWidth: 0 }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', width: 60, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{c.chars.toLocaleString()}자</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
                          <span>문장 {c.sentences}개</span>
                          <span>평균 {c.avgSentLen.toFixed(0)}자</span>
                          <span><span style={{ color: 'var(--accent)' }}>■</span> 대화 {Math.round(c.dialoguePct)}%</span>
                        </div>
                        {c.preview && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}…</div>}
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ ...hint, marginTop: 8 }}>
                막대 길이 = 챕터 분량(최장 챕터=100%) · <span style={{ color: 'var(--accent)' }}>■</span> 파란 영역 = 대화 비율.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={hint}>페이싱 = 짧은 문장·높은 대화 비율일수록 빠름(0~100). 형태소 분석 없이 정규식·휴리스틱으로 계산한 근사값입니다.</div>
              <button className="btn-primary" onClick={copy}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 리포트 복사</>}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
