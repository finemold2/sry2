// 서사 심전도 — 본문을 단락(또는 챕터) 단위로 나눠 각 구간의 "맥박값"을 계산해
// ECG(심전도) 파형처럼 시각화한다. 맥박값은 (긴장 신호 + 대사 밀도 - 문장 길이 둔중함)
// 세 축을 합성한 결정론적 지표. 평탄(저활동) 구간과 과열(연속 고활동) 구간을 자동 진단한다.
// 자급식: 'react' 와 './linkbus' 외 import 없음. 외부 네트워크/계산 전부 로컬.
// 입력 경로: 직접 붙여넣기 + payload.text(연계 열기) + 좌측 바인더 문서 드롭(getDragItem).
// 저장: localStorage 'sry:tool:narrative-heartbeat' 자동 저장/복원.
// 연동: addToProject(리포트 추가) · addToStash(과열/평탄 메모 담기) · openToolLinked(관련 도구).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'narrative-heartbeat',
  name: '서사 심전도',
  icon: '💓',
  group: '구조',
  intro: '단락별 문장길이·대사밀도·긴장어를 심전도 파형으로 시각화하고 평탄/과열 구간을 진단합니다',
  w: 500,
  h: 600,
}

const LS_KEY = 'sry:tool:narrative-heartbeat'

// ── 긴장 신호 어휘(로컬 사전) ───────────────────────────────────
// 동작·위기·감정 격앙을 나타내는 한국어 어간/표현. 부분일치(포함)로 가산점.
const TENSION_WORDS = [
  '죽', '피', '칼', '총', '불', '폭발', '비명', '소리쳤', '외쳤', '달렸', '뛰', '쫓',
  '도망', '싸웠', '싸움', '때렸', '부쉈', '무너', '터졌', '쏟아', '찢', '베', '찔',
  '쓰러', '넘어', '떨렸', '떨었', '분노', '두려', '공포', '절망', '비틀', '휘청',
  '급히', '갑자기', '순식간', '단숨', '와락', '벌떡', '확', '쾅', '쿵', '번쩍',
  '위험', '위기', '경고', '비상', '폭주', '발작', '몸부림', '울부', '악',
]
// 차분·정적 신호(평탄도 보정용, 음의 가중)
const CALM_WORDS = [
  '고요', '잔잔', '평온', '느릿', '천천', '나른', '조용', '한가', '여유',
  '잠잠', '한참', '오래', '가만', '멍하', '담담', '무덤덤',
]

// 문장 종결 부호로 문장 분리(개행도 경계)
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 대사 라인 판정: 큰따옴표/꺾쇠/대시 시작 등 흔한 한국 소설 대사 표기
function isDialogue(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  // 따옴표 시작/포함, 꺾쇠 인용, 대시 시작 등 흔한 한국 소설 대사 표기
  if (/^["'“”『「\-—–]/.test(t)) return true
  if (/[“][^”]{0,200}[”]/.test(t)) return true
  if (/[「『][^」』]{0,200}[」』]/.test(t)) return true
  if (/["][^"]{0,200}["]/.test(t)) return true
  return false
}

// 어휘 포함 횟수(부분일치 합산)
function countHits(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    let from = 0
    while (true) {
      const idx = text.indexOf(w, from)
      if (idx < 0) break
      n++
      from = idx + w.length
    }
  }
  return n
}

interface Seg {
  idx: number
  raw: string
  chars: number          // 공백 제외 글자 수
  sentences: string[]
  sentCount: number
  avgSentLen: number     // 평균 문장 길이(공백 제외)
  dialogueCount: number
  dialogueRatio: number  // 0~1 대사 문장 비율
  tension: number        // 긴장어 밀도(1000자당)
  calm: number           // 차분어 밀도(1000자당)
  pulse: number          // 합성 맥박값(대략 0~100)
  band: 'flat' | 'mid' | 'hot'
}

// 단락 분리: 빈 줄 기준. 빈 줄이 거의 없으면 N문장씩 묶어 의사 단락 생성.
function splitParagraphs(text: string): string[] {
  const byBlank = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
  if (byBlank.length >= 4) return byBlank
  // 단일 덩어리 → 문장 4개씩 묶기
  const sents = splitSentences(text)
  if (sents.length <= 6) return byBlank.length ? byBlank : (text.trim() ? [text.trim()] : [])
  const chunks: string[] = []
  const per = Math.max(3, Math.ceil(sents.length / 12))
  for (let i = 0; i < sents.length; i += per) chunks.push(sents.slice(i, i + per).join(' '))
  return chunks
}

function analyze(text: string): { segs: Seg[]; meta: AnalysisMeta } | null {
  const t = text.trim()
  if (!t) return null
  const paras = splitParagraphs(t)
  if (paras.length === 0) return null

  const segs: Seg[] = paras.map((raw, idx) => {
    const sentences = splitSentences(raw)
    const sentCount = Math.max(1, sentences.length)
    const chars = raw.replace(/\s+/g, '').length
    const avgSentLen = chars / sentCount
    const dialogueCount = sentences.filter(isDialogue).length
    const dialogueRatio = dialogueCount / sentCount
    const per1000 = chars > 0 ? 1000 / chars : 0
    const tension = countHits(raw, TENSION_WORDS) * per1000
    const calm = countHits(raw, CALM_WORDS) * per1000

    // 맥박 합성 — 결정론적.
    // 1) 긴장 신호: 밀도가 높을수록 가산(상한).
    const tensionScore = Math.min(45, tension * 3.2)
    // 2) 대사 밀도: 대사가 많을수록 호흡이 빨라진다(가산).
    const dialogueScore = dialogueRatio * 30
    // 3) 문장 길이 둔중함: 긴 평균 문장은 맥박을 낮춘다(감산). 짧은 문장은 가산.
    //    18자 부근을 중립으로, 짧으면 +, 길면 -.
    const lenScore = clamp((18 - avgSentLen) * 0.9, -22, 18)
    // 4) 차분 신호: 감산.
    const calmScore = Math.min(18, calm * 2.6)
    const base = 38 + tensionScore + dialogueScore + lenScore - calmScore
    const pulse = Math.round(clamp(base, 4, 100))
    const band: Seg['band'] = pulse >= 68 ? 'hot' : pulse <= 30 ? 'flat' : 'mid'

    return { idx, raw, chars, sentences, sentCount, avgSentLen, dialogueCount, dialogueRatio, tension, calm, pulse, band }
  })

  return { segs, meta: deriveMeta(segs) }
}

interface AnalysisMeta {
  count: number
  avgPulse: number
  maxPulse: number
  minPulse: number
  amplitude: number          // 최고-최저
  volatility: number         // 인접 구간 변동량 평균(파형 활기)
  flatRuns: { start: number; end: number }[]   // 연속 평탄 구간
  hotRuns: { start: number; end: number }[]     // 연속 과열 구간
  verdict: string
  verdictColor: string
}

function deriveMeta(segs: Seg[]): AnalysisMeta {
  const ps = segs.map((s) => s.pulse)
  const count = segs.length
  const avgPulse = ps.reduce((a, b) => a + b, 0) / count
  const maxPulse = Math.max(...ps)
  const minPulse = Math.min(...ps)
  const amplitude = maxPulse - minPulse
  let vol = 0
  for (let i = 1; i < ps.length; i++) vol += Math.abs(ps[i] - ps[i - 1])
  const volatility = ps.length > 1 ? vol / (ps.length - 1) : 0

  const flatRuns = findRuns(segs, (s) => s.band === 'flat')
  const hotRuns = findRuns(segs, (s) => s.band === 'hot')

  // 종합 진단
  let verdict = ''
  let verdictColor = 'var(--muted)'
  const longFlat = flatRuns.find((r) => r.end - r.start + 1 >= 3)
  const longHot = hotRuns.find((r) => r.end - r.start + 1 >= 3)
  if (count < 4) {
    verdict = '구간이 적어 파형이 단순합니다. 더 많은 단락을 넣으면 흐름이 또렷해져요.'
  } else if (longHot) {
    verdict = '과열 구간이 길게 이어집니다. 절정만 계속되면 독자가 무뎌질 수 있어요 — 사이에 숨 고르는 정적을 넣어 보세요.'
    verdictColor = 'var(--warn)'
  } else if (longFlat) {
    verdict = '평탄 구간이 길게 이어집니다. 긴장·대사·짧은 문장으로 맥을 살려 보세요.'
    verdictColor = 'var(--warn)'
  } else if (volatility < 6 && amplitude < 25) {
    verdict = '파형이 전반적으로 잔잔합니다. 굴곡(위기·반전·속도 변화)을 더하면 리듬이 살아나요.'
    verdictColor = 'var(--warn)'
  } else if (volatility >= 16) {
    verdict = '맥박이 매 구간 출렁입니다. 활기는 좋지만 완급 없이 계속 튀면 피로할 수 있어요.'
    verdictColor = 'var(--muted)'
  } else {
    verdict = '긴장과 이완이 번갈아 뛰는 건강한 파형입니다. 좋은 흐름이에요.'
    verdictColor = 'var(--ok)'
  }
  return { count, avgPulse, maxPulse, minPulse, amplitude, volatility, flatRuns, hotRuns, verdict, verdictColor }
}

function findRuns(segs: Seg[], pred: (s: Seg) => boolean): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = []
  let start = -1
  for (let i = 0; i < segs.length; i++) {
    if (pred(segs[i])) { if (start < 0) start = i }
    else { if (start >= 0) { runs.push({ start, end: i - 1 }); start = -1 } }
  }
  if (start >= 0) runs.push({ start, end: segs.length - 1 })
  return runs.filter((r) => r.end - r.start + 1 >= 2)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function bandColor(b: Seg['band']): string {
  return b === 'hot' ? 'var(--warn)' : b === 'flat' ? 'var(--muted)' : 'var(--accent)'
}
function bandLabel(b: Seg['band']): string {
  return b === 'hot' ? '과열' : b === 'flat' ? '평탄' : '안정'
}

// payload.text 혹은 ResolvedItem.text 에서 텍스트 추출
function asText(v: unknown): string {
  if (typeof v === 'string') return v
  return ''
}

export default function NarrativeHeartbeat({ payload }: { payload?: Record<string, unknown> }) {
  const mounted = useRef(true)
  const handledPayload = useRef<Record<string, unknown> | undefined>(undefined)
  const [text, setText] = useState('')
  const [source, setSource] = useState('')        // 드롭한 문서 제목 등
  const [dragHot, setDragHot] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 초기 복원: localStorage (payload 처리는 아래 별도 effect 에서)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const o = JSON.parse(raw)
        if (o && typeof o.text === 'string') setText(o.text)
        if (o && typeof o.source === 'string') setSource(o.source)
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 연계 수신: payload 가 바뀔 때마다 적용. 동일 payload 는 ref 가드로 1회만 처리.
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const p = asText(payload.text)
    if (p && p.trim()) {
      setText(p)
      setSource(asText(payload.title) || '연계로 받은 글')
    }
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, source })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 새로고침 시 입력이 사라질 수 있어요.') }
  }, [text, source])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const result = useMemo(() => analyze(text), [text])

  // ── 드롭(좌측 바인더 문서) ─────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    setDragHot(false)
    const item = getDragItem(e)
    if (item && item.text && item.text.trim()) {
      e.preventDefault()
      setText(item.text)
      setSource(item.title || '바인더 문서')
      setToast(`'${item.title || '문서'}'의 본문을 불러왔어요.`)
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dragHot) setDragHot(true) }
  }
  const onDragLeave = () => { if (dragHot) setDragHot(false) }

  // ── 산출 텍스트/HTML ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const buildReportText = (): string => {
    if (!result) return ''
    const { segs, meta: m } = result
    const lines: string[] = []
    lines.push(source.trim() ? `[서사 심전도] ${source.trim()}` : '[서사 심전도]')
    lines.push(`구간 ${m.count}개 · 평균 맥박 ${m.avgPulse.toFixed(0)} · 진폭 ${m.amplitude} · 변동성 ${m.volatility.toFixed(1)}`)
    lines.push(`최고 ${m.maxPulse} / 최저 ${m.minPulse}`)
    lines.push('')
    lines.push(`진단: ${m.verdict}`)
    if (m.hotRuns.length) lines.push(`과열 연속구간: ${m.hotRuns.map((r) => runText(r)).join(', ')}`)
    if (m.flatRuns.length) lines.push(`평탄 연속구간: ${m.flatRuns.map((r) => runText(r)).join(', ')}`)
    lines.push('')
    lines.push('[구간별 맥박]')
    segs.forEach((s) => {
      lines.push(`${s.idx + 1}. 맥박 ${s.pulse} (${bandLabel(s.band)}) · 평균문장 ${s.avgSentLen.toFixed(0)}자 · 대사 ${(s.dialogueRatio * 100).toFixed(0)}% · 긴장 ${s.tension.toFixed(1)}`)
    })
    return lines.join('\n')
  }
  const runText = (r: { start: number; end: number }) => r.start === r.end ? `${r.start + 1}` : `${r.start + 1}~${r.end + 1}`

  const buildReportHtml = (): string => {
    if (!result) return ''
    const { segs, meta: m } = result
    const parts: string[] = []
    parts.push(`<p><strong>서사 심전도</strong>${source.trim() ? ' · ' + esc(source.trim()) : ''} · 구간 ${m.count}개</p>`)
    parts.push(`<p>평균 맥박 ${m.avgPulse.toFixed(0)} · 진폭 ${m.amplitude} · 변동성 ${m.volatility.toFixed(1)} · 최고 ${m.maxPulse} / 최저 ${m.minPulse}</p>`)
    parts.push(`<p><strong>진단</strong> ${esc(m.verdict)}</p>`)
    if (m.hotRuns.length) parts.push(`<p>과열 연속구간: ${m.hotRuns.map((r) => runText(r)).join(', ')}</p>`)
    if (m.flatRuns.length) parts.push(`<p>평탄 연속구간: ${m.flatRuns.map((r) => runText(r)).join(', ')}</p>`)
    parts.push('<table border="1" cellspacing="0" cellpadding="4"><tr><th>구간</th><th>맥박</th><th>상태</th><th>평균문장(자)</th><th>대사(%)</th><th>긴장밀도</th></tr>')
    segs.forEach((s) => {
      parts.push(`<tr><td>${s.idx + 1}</td><td>${s.pulse}</td><td>${bandLabel(s.band)}</td><td>${s.avgSentLen.toFixed(0)}</td><td>${(s.dialogueRatio * 100).toFixed(0)}</td><td>${s.tension.toFixed(1)}</td></tr>`)
    })
    parts.push('</table>')
    return parts.join('')
  }

  const toProject = () => {
    if (!hasProjectBridge() || !result) return
    const m = result.meta
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: source.trim() ? `서사 심전도 — ${source.trim()}` : '서사 심전도 리포트',
      bodyHtml: buildReportHtml(),
      synopsis: m.verdict,
      meta: {
        구간수: String(m.count),
        평균맥박: m.avgPulse.toFixed(0),
        진폭: String(m.amplitude),
        변동성: m.volatility.toFixed(1),
        과열구간: String(m.hotRuns.length),
        평탄구간: String(m.flatRuns.length),
      },
    })
    if (!mounted.current) return
    setToast(id ? '프로젝트 자료(구조)에 리포트를 추가했어요.' : '프로젝트에 연결되지 않았습니다.')
  }

  const stashVerdict = () => {
    if (!hasStash() || !result) return
    addToStash({
      kind: 'memo',
      label: source.trim() ? `심전도 진단 — ${source.trim()}` : '서사 심전도 진단',
      text: buildReportText(),
    })
    setToast('수집함에 진단 메모를 담았어요.')
  }

  const copyReport = async () => {
    const t = buildReportText()
    if (!t) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(t)
      else {
        const ta = document.createElement('textarea')
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (mounted.current) setToast('리포트를 복사했어요.')
    } catch { if (mounted.current) setNote('복사에 실패했어요. 권한을 확인하세요.') }
  }

  // 관련 도구로 본문 넘기기
  const openLinked = (toolId: string) => {
    openToolLinked(toolId, { text, title: source })
  }

  // ── SVG 파형 좌표 ──────────────────────────────────────────
  const VBW = 720, VBH = 240
  const PADL = 30, PADR = 14, PADT = 16, PADB = 26
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const segs = result?.segs ?? []
  const n = segs.length
  const xAt = (i: number) => n <= 1 ? PADL + plotW / 2 : PADL + (i / (n - 1)) * plotW
  const yAt = (p: number) => PADT + (1 - p / 100) * plotH

  // ECG 느낌: 각 구간 중심에 한 점을 두되, 점과 점 사이에 작은 스파이크를 넣어 심전도처럼.
  const ecgPath = useMemo(() => {
    if (n === 0) return ''
    const cmds: string[] = []
    for (let i = 0; i < n; i++) {
      const x = xAt(i), y = yAt(segs[i].pulse)
      if (i === 0) { cmds.push(`M${x.toFixed(1)},${y.toFixed(1)}`); continue }
      const px = xAt(i - 1), py = yAt(segs[i - 1].pulse)
      const midX = (px + x) / 2
      const baseY = yAt(segs[i].band === 'flat' ? Math.max(2, segs[i].pulse - 4) : (py + y) / 2)
      // 과열 구간이면 날카로운 R파 스파이크
      if (segs[i].band === 'hot') {
        const sx = px + (x - px) * 0.45
        const spikeY = yAt(Math.min(100, segs[i].pulse + 8))
        const dipY = yAt(Math.max(2, segs[i].pulse - 14))
        cmds.push(`L${(sx - 6).toFixed(1)},${baseY.toFixed(1)}`)
        cmds.push(`L${sx.toFixed(1)},${spikeY.toFixed(1)}`)
        cmds.push(`L${(sx + 6).toFixed(1)},${dipY.toFixed(1)}`)
        cmds.push(`L${x.toFixed(1)},${y.toFixed(1)}`)
      } else {
        cmds.push(`L${midX.toFixed(1)},${baseY.toFixed(1)}`)
        cmds.push(`L${x.toFixed(1)},${y.toFixed(1)}`)
      }
    }
    return cmds.join(' ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const taStyle: React.CSSProperties = {
    minHeight: 92, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragHot ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragHot ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 13.5, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.55 }
  const stat: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 18 }

  const m = result?.meta

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={title}>단락별 맥박을 심전도 파형으로</span>
        {source && <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>출처: {source}</span>}
        <button className="minibtn" onClick={() => { setText(''); setSource('') }} disabled={!text}>지우기</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}
      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>{toast}</div>}

      <div style={body}>
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => { setText(e.target.value); if (source) setSource('') }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          placeholder="여기에 원고를 붙여넣거나, 왼쪽 바인더의 문서를 끌어다 놓으세요. 빈 줄로 나뉜 단락(또는 챕터)마다 맥박을 계산합니다."
          spellCheck={false}
          aria-label="서사 심전도 입력"
        />

        {!result || !m ? (
          <div style={empty}>
            원고를 넣으면 단락마다 문장 길이·대사 밀도·긴장 어휘를 합성해<br />
            심전도(ECG) 파형으로 그리고, 평탄한 구간과 과열된 구간을 진단합니다.<br />
            <span style={{ fontSize: 11.5 }}>관련 도구(연계)로 받은 글이나 바인더 드롭도 지원합니다.</span>
          </div>
        ) : (
          <>
            {/* 요약 통계 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={stat}><div style={statVal}>{m.count}</div><div style={statLabel}>구간</div></div>
              <div style={stat}><div style={statVal}>{m.avgPulse.toFixed(0)}</div><div style={statLabel}>평균 맥박</div></div>
              <div style={stat}><div style={statVal}>{m.amplitude}</div><div style={statLabel}>진폭</div></div>
              <div style={stat}><div style={statVal}>{m.volatility.toFixed(1)}</div><div style={statLabel}>변동성</div></div>
            </div>

            {/* ECG 파형 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={sectionTitle}>심전도 파형 · 위로 솟을수록 맥박이 빠릅니다</div>
                <div style={hint}>날카로운 스파이크 = 과열 구간</div>
              </div>
              <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 240 }} role="img" aria-label="서사 심전도 파형">
                {/* 가로 기준선 */}
                {[0, 30, 50, 68, 100].map((p) => {
                  const y = yAt(p)
                  const major = p === 50
                  const isThr = p === 30 || p === 68
                  return (
                    <g key={p}>
                      <line x1={PADL} y1={y} x2={VBW - PADR} y2={y}
                        stroke={isThr ? 'var(--warn)' : 'var(--border)'} strokeWidth={major ? 1.4 : 1}
                        strokeDasharray={isThr ? '4 4' : major ? undefined : '2 5'} opacity={isThr ? 0.5 : major ? 0.8 : 0.4} />
                      <text x={PADL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{p}</text>
                    </g>
                  )
                })}
                {/* 평탄/과열 연속구간 음영 */}
                {m.hotRuns.map((r, i) => (
                  <rect key={'h' + i} x={xAt(r.start) - 4} y={PADT} width={Math.max(8, xAt(r.end) - xAt(r.start) + 8)} height={plotH} fill="var(--warn)" opacity={0.08} />
                ))}
                {m.flatRuns.map((r, i) => (
                  <rect key={'f' + i} x={xAt(r.start) - 4} y={PADT} width={Math.max(8, xAt(r.end) - xAt(r.start) + 8)} height={plotH} fill="var(--muted)" opacity={0.1} />
                ))}
                {/* 파형 */}
                <path d={ecgPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* 구간 점 */}
                {segs.map((s, i) => (
                  <g key={s.idx} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'pointer' }}>
                    <circle cx={xAt(i)} cy={yAt(s.pulse)} r={hoverIdx === i ? 5.5 : 3.5} fill={bandColor(s.band)} stroke="var(--paper)" strokeWidth={1.4}>
                      <title>{`${i + 1}구간 · 맥박 ${s.pulse} (${bandLabel(s.band)}) · 평균문장 ${s.avgSentLen.toFixed(0)}자 · 대사 ${(s.dialogueRatio * 100).toFixed(0)}% · 긴장 ${s.tension.toFixed(1)}`}</title>
                    </circle>
                  </g>
                ))}
              </svg>
              {/* 호버 상세 */}
              {hoverIdx != null && segs[hoverIdx] && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: bandColor(segs[hoverIdx].band) }}>{hoverIdx + 1}구간 · 맥박 {segs[hoverIdx].pulse} ({bandLabel(segs[hoverIdx].band)})</span>
                  <span style={hint}>평균문장 {segs[hoverIdx].avgSentLen.toFixed(0)}자</span>
                  <span style={hint}>대사 {(segs[hoverIdx].dialogueRatio * 100).toFixed(0)}%</span>
                  <span style={hint}>긴장밀도 {segs[hoverIdx].tension.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* 진단 */}
            <div style={{ ...panel, borderLeft: `3px solid ${m.verdictColor}` }}>
              <div style={sectionTitle}>종합 진단</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: m.verdictColor === 'var(--muted)' ? 'var(--text)' : m.verdictColor }}>{m.verdict}</div>
              {(m.hotRuns.length > 0 || m.flatRuns.length > 0) && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {m.hotRuns.length > 0 && <span>과열 연속구간 <strong style={{ color: 'var(--warn)' }}>{m.hotRuns.map(runText).join(', ')}</strong></span>}
                  {m.flatRuns.length > 0 && <span>평탄 연속구간 <strong style={{ color: 'var(--text)' }}>{m.flatRuns.map(runText).join(', ')}</strong></span>}
                </div>
              )}
            </div>

            {/* 구간 막대(상태 색) */}
            <div style={panel}>
              <div style={sectionTitle}>구간별 맥박 막대</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {segs.map((s, i) => (
                  <div key={s.idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
                    title={s.raw.length > 120 ? s.raw.slice(0, 120) + '…' : s.raw}>
                    <div style={{ width: 22, textAlign: 'right', fontSize: 10.5, color: 'var(--muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0, height: 16, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', outline: hoverIdx === i ? '1px solid var(--accent)' : 'none' }}>
                      <div style={{ width: `${Math.max(2, s.pulse)}%`, height: '100%', background: bandColor(s.band), borderRadius: 4, transition: 'width .25s' }} />
                    </div>
                    <div style={{ width: 26, textAlign: 'right', fontSize: 11, fontWeight: 700, color: bandColor(s.band), flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{s.pulse}</div>
                    <div style={{ width: 30, fontSize: 10, color: bandColor(s.band), flexShrink: 0, textAlign: 'right' }}>{bandLabel(s.band)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 연계 + 산출 */}
            <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="linkbtn" onClick={() => openLinked('emotion-arc')} title="이 글로 감정 곡선 도구 열기">감정 곡선으로</button>
              <button className="linkbtn" onClick={() => openLinked('sentence-length-viz')} title="이 글로 문장 길이 시각화 열기">문장 길이로</button>
              <button className="linkbtn" onClick={() => openLinked('dialogue-ratio')} title="이 글로 대사 비율 도구 열기">대사 비율로</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="minibtn" onClick={copyReport}>리포트 복사</button>
              <button className="minibtn" onClick={stashVerdict} disabled={!hasStash()} title={hasStash() ? '진단 메모를 수집함에 담기' : '수집함이 없습니다'}>수집함에 담기</button>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 구조 폴더에 리포트 문서 추가' : '프로젝트에 연결되지 않았습니다'}>프로젝트에 추가</button>
            </div>

            <div style={hint}>
              맥박값은 긴장 어휘 밀도, 대사 비율, 문장 길이(짧을수록 빠름)를 합성한 결정론적 지표입니다.
              빈 줄로 단락을 나누면 구간이 또렷해집니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
