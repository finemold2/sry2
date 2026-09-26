// 원고 버전 비교 — 이전/이후 두 텍스트를 붙여넣으면 LCS 기반 자작 diff 로
// 줄/문장 단위 변경(추가=초록, 삭제=빨강, 동일=회색)을 나란히/통합 뷰로 보여준다.
// 변경 통계(추가/삭제 줄 수)와 결과 복사 제공. 좌측 바인더 파일을 드롭해 채울 수 있다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·미디어 불필요(100% 로컬).
// 영속: 입력·옵션을 localStorage 'sry:tool:draft-compare' 에 자동 저장/복원. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'
import { getDragItem, isItemDrag, addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'draft-compare', name: '원고 버전 비교', icon: '🔀', group: '교정·언어', intro: '이전/이후 원고를 줄·문장 단위로 비교해 추가(초록)·삭제(빨강)·동일(회색)을 보여줍니다', w: 900, h: 680 }

const LS_KEY = 'sry:tool:draft-compare'

// ── diff 모델 ───────────────────────────────────────────────
type Op = 'equal' | 'add' | 'del'
interface DiffRow {
  op: Op
  left?: string   // 이전(삭제/동일) 텍스트
  right?: string  // 이후(추가/동일) 텍스트
  ln?: number     // 이전 측 줄/문장 번호(1부터)
  rn?: number     // 이후 측 줄/문장 번호(1부터)
}

// 입력 분할: 줄 단위 또는 문장 단위
function splitUnits(text: string, mode: 'line' | 'sentence'): string[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  if (mode === 'line') {
    const parts = normalized.split('\n')
    // 끝의 잉여 빈 줄만 제거(중간 빈 줄은 유지)
    while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop()
    return parts
  }
  // 문장: 종결부호 뒤 또는 줄바꿈을 경계로
  const out: string[] = []
  const re = /[^.!?。！？…\n]*[.!?。！？…]+|[^.!?。！？…\n]+(?=\n|$)/gu
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(normalized)) !== null) {
    if (guard++ > 200000) break
    if (m[0] === '') { re.lastIndex++; continue }
    const s = m[0].trim()
    if (s) out.push(s)
  }
  return out
}

// 비교용 정규화(공백 무시/대소문자 무시 옵션 반영)
function keyOf(s: string, ignoreWs: boolean, ignoreCase: boolean): string {
  let k = s
  if (ignoreWs) k = k.replace(/\s+/g, ' ').trim()
  if (ignoreCase) k = k.toLowerCase()
  return k
}

// ── LCS(최장 공통 부분수열) — 자작 동적계획 + 역추적 ──────────
// 입력이 매우 클 때를 대비해 셀 수 상한을 둔다(초과 시 빠른 근사로 폴백).
const MAX_CELLS = 4_000_000   // 약 2000x2000

function lcsDiff(a: string[], b: string[], ignoreWs: boolean, ignoreCase: boolean): { rows: DiffRow[]; approx: boolean } {
  const n = a.length, m = b.length
  const ak = a.map((s) => keyOf(s, ignoreWs, ignoreCase))
  const bk = b.map((s) => keyOf(s, ignoreWs, ignoreCase))

  // 양끝의 공통 접두/접미를 먼저 떼어내 표 크기를 줄인다(흔한 변경 패턴 가속).
  let start = 0
  while (start < n && start < m && ak[start] === bk[start]) start++
  let endA = n - 1, endB = m - 1
  while (endA >= start && endB >= start && ak[endA] === bk[endB]) { endA--; endB-- }

  const midN = endA - start + 1
  const midM = endB - start + 1

  const head: DiffRow[] = []
  for (let i = 0; i < start; i++) head.push({ op: 'equal', left: a[i], right: b[i], ln: i + 1, rn: i + 1 })

  let mid: DiffRow[]
  let approx = false
  if (midN <= 0 || midM <= 0) {
    // 한쪽만 남음 → 전부 삭제 또는 전부 추가
    mid = []
    for (let i = start; i <= endA; i++) mid.push({ op: 'del', left: a[i], ln: i + 1 })
    for (let j = start; j <= endB; j++) mid.push({ op: 'add', right: b[j], rn: j + 1 })
  } else if ((midN + 1) * (midM + 1) > MAX_CELLS) {
    mid = naiveDiff(a, b, ak, bk, start, endA, endB)
    approx = true
  } else {
    mid = dpBacktrack(a, b, ak, bk, start, endA, endB, midN, midM)
  }

  // 접미(공통 꼬리): a[endA+1..] 와 b[endB+1..] 는 길이가 같다.
  const tail: DiffRow[] = []
  for (let off = 1; endA + off < n; off++) {
    tail.push({ op: 'equal', left: a[endA + off], right: b[endB + off], ln: endA + off + 1, rn: endB + off + 1 })
  }

  return { rows: [...head, ...mid, ...tail], approx }
}

// 표 채우기 + 역추적(중간 구간 [start..endA] x [start..endB])
function dpBacktrack(
  a: string[], b: string[], ak: string[], bk: string[],
  start: number, endA: number, endB: number, midN: number, midM: number,
): DiffRow[] {
  // dp[i][j] = a[start..start+i-1] 와 b[start..start+j-1] 의 LCS 길이
  const W = midM + 1
  const dp = new Uint32Array((midN + 1) * W)
  for (let i = 1; i <= midN; i++) {
    const ai = ak[start + i - 1]
    const rowOff = i * W
    const prevOff = (i - 1) * W
    for (let j = 1; j <= midM; j++) {
      if (ai === bk[start + j - 1]) {
        dp[rowOff + j] = dp[prevOff + (j - 1)] + 1
      } else {
        const up = dp[prevOff + j]
        const left = dp[rowOff + (j - 1)]
        dp[rowOff + j] = up >= left ? up : left
      }
    }
  }
  // 역추적
  const rows: DiffRow[] = []
  let i = midN, j = midM
  while (i > 0 && j > 0) {
    if (ak[start + i - 1] === bk[start + j - 1]) {
      rows.push({ op: 'equal', left: a[start + i - 1], right: b[start + j - 1], ln: start + i, rn: start + j })
      i--; j--
    } else if (dp[(i - 1) * W + j] >= dp[i * W + (j - 1)]) {
      rows.push({ op: 'del', left: a[start + i - 1], ln: start + i })
      i--
    } else {
      rows.push({ op: 'add', right: b[start + j - 1], rn: start + j })
      j--
    }
  }
  while (i > 0) { rows.push({ op: 'del', left: a[start + i - 1], ln: start + i }); i-- }
  while (j > 0) { rows.push({ op: 'add', right: b[start + j - 1], rn: start + j }); j-- }
  rows.reverse()
  return rows
}

// 폴백 diff: 공통 키만 그리디로 맞추는 단순 비교(표가 너무 클 때만 사용)
function naiveDiff(
  a: string[], b: string[], ak: string[], bk: string[],
  start: number, endA: number, endB: number,
): DiffRow[] {
  const rows: DiffRow[] = []
  const bPos = new Map<string, number>()
  for (let j = start; j <= endB; j++) if (!bPos.has(bk[j])) bPos.set(bk[j], j)
  let bj = start
  for (let i = start; i <= endA; i++) {
    const anchor = bPos.get(ak[i])
    if (anchor != null && anchor >= bj) {
      for (let j = bj; j < anchor; j++) rows.push({ op: 'add', right: b[j], rn: j + 1 })
      rows.push({ op: 'equal', left: a[i], right: b[anchor], ln: i + 1, rn: anchor + 1 })
      bj = anchor + 1
    } else {
      rows.push({ op: 'del', left: a[i], ln: i + 1 })
    }
  }
  for (let j = bj; j <= endB; j++) rows.push({ op: 'add', right: b[j], rn: j + 1 })
  return rows
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// HTML escape (프로젝트 추가 본문용)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 현재본(추가 반영·삭제 제외) 평문 복원 — 수집함/연계용
function toCleanCurrent(rows: DiffRow[]): string {
  const out: string[] = []
  for (const r of rows) {
    if (r.op === 'del') continue
    out.push(r.op === 'add' ? (r.right ?? '') : (r.left ?? ''))
  }
  return out.join('\n')
}

const SAMPLE_OLD = `늦은 밤이었다.
그는 책상 앞에 앉아 있었다.
창밖으로 비가 내렸다.
그는 펜을 들었다.
하지만 아무것도 쓰지 못했다.
시계가 자정을 알렸다.`

const SAMPLE_NEW = `늦은 밤이었다.
그는 낡은 책상 앞에 앉아 있었다.
창밖으로 차가운 비가 내렸다.
그는 펜을 들었다.
그러나 한 글자도 쓰지 못했다.
멀리서 시계가 자정을 알렸다.
그는 조용히 눈을 감았다.`

interface SavedState { left: string; right: string; mode: 'line' | 'sentence'; view: 'side' | 'unified'; ignoreWs: boolean; ignoreCase: boolean }

export default function DraftCompare({ payload }: { payload?: Record<string, unknown> }) {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [mode, setMode] = useState<'line' | 'sentence'>('line')
  const [view, setView] = useState<'side' | 'unified'>('side')
  const [ignoreWs, setIgnoreWs] = useState(false)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [copied, setCopied] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')
  const [dropZone, setDropZone] = useState<'left' | 'right' | null>(null)
  const copyTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const loaded = useRef(false)

  // 영속 로드(최초 1회). payload 가 있으면 우선.
  useEffect(() => {
    let pl = '', pr = ''
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const s = JSON.parse(raw) as Partial<SavedState>
        if (typeof s.left === 'string') pl = s.left
        if (typeof s.right === 'string') pr = s.right
        if (s.mode === 'line' || s.mode === 'sentence') setMode(s.mode)
        if (s.view === 'side' || s.view === 'unified') setView(s.view)
        if (typeof s.ignoreWs === 'boolean') setIgnoreWs(s.ignoreWs)
        if (typeof s.ignoreCase === 'boolean') setIgnoreCase(s.ignoreCase)
      }
    } catch { /* noop */ }
    if (payload) {
      const a = payload.left ?? payload.before ?? payload.old ?? payload.a
      const b = payload.right ?? payload.after ?? payload.new ?? payload.b ?? payload.text
      if (typeof a === 'string') pl = a
      if (typeof b === 'string') pr = b
    }
    setLeft(pl); setRight(pr)
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속 저장(디바운스)
  useEffect(() => {
    if (!loaded.current) return
    const id = window.setTimeout(() => {
      try {
        const s: SavedState = { left, right, mode, view, ignoreWs, ignoreCase }
        localStorage.setItem(LS_KEY, JSON.stringify(s))
      } catch { /* 용량 초과 무시 */ }
    }, 350)
    return () => clearTimeout(id)
  }, [left, right, mode, view, ignoreWs, ignoreCase])

  // 언마운트 정리
  useEffect(() => () => {
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
  }, [])

  const flash = (msg: string) => {
    setFlashMsg(msg)
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashMsg(''), 1800)
  }

  const { rows, approx } = useMemo(() => {
    if (!left && !right) return { rows: [] as DiffRow[], approx: false }
    try {
      const a = splitUnits(left, mode)
      const b = splitUnits(right, mode)
      return lcsDiff(a, b, ignoreWs, ignoreCase)
    } catch { return { rows: [] as DiffRow[], approx: false } }
  }, [left, right, mode, ignoreWs, ignoreCase])

  const stats = useMemo(() => {
    let add = 0, del = 0, eq = 0
    for (const r of rows) {
      if (r.op === 'add') add++
      else if (r.op === 'del') del++
      else eq++
    }
    const total = rows.length || 1
    const similarity = Math.round((eq / total) * 100)
    return { add, del, eq, changed: add + del, similarity }
  }, [rows])

  const hasInput = left.trim() !== '' || right.trim() !== ''

  // 결과 텍스트(통합 diff 형식)
  const resultText = useMemo(() => {
    const lines: string[] = []
    lines.push(`# 원고 버전 비교 (${mode === 'line' ? '줄' : '문장'} 단위)`)
    lines.push(`# +추가 ${stats.add} / -삭제 ${stats.del} / =동일 ${stats.eq} / 유사도 ${stats.similarity}%`)
    lines.push('')
    for (const r of rows) {
      if (r.op === 'equal') lines.push('  ' + (r.left ?? ''))
      else if (r.op === 'add') lines.push('+ ' + (r.right ?? ''))
      else lines.push('- ' + (r.left ?? ''))
    }
    return lines.join('\n')
  }, [rows, mode, stats])

  const doCopy = async () => {
    if (!rows.length) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch { setCopied(false) }
  }

  // 프로젝트에 비교 결과 추가
  const sendToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!rows.length) { flash('비교할 내용이 없습니다.'); return }
    const body: string[] = []
    body.push(`<p><strong>원고 버전 비교</strong> — +추가 ${stats.add} · −삭제 ${stats.del} · =동일 ${stats.eq} · 유사도 ${stats.similarity}%</p>`)
    for (const r of rows) {
      if (r.op === 'equal') body.push(`<p style="color:#888">${esc(r.left ?? '') || '&nbsp;'}</p>`)
      else if (r.op === 'add') body.push(`<p style="background:#d6f5dd;color:#0a7d2c">+ ${esc(r.right ?? '') || '&nbsp;'}</p>`)
      else body.push(`<p style="background:#fbd9d9;color:#b3261e">− ${esc(r.left ?? '') || '&nbsp;'}</p>`)
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '교정',
      title: '원고 버전 비교 ' + new Date().toLocaleDateString('ko-KR'),
      bodyHtml: body.join('\n'),
      meta: { 추가줄: String(stats.add), 삭제줄: String(stats.del), 유사도: stats.similarity + '%' },
    })
    flash(id ? '프로젝트 "교정" 폴더에 추가했습니다.' : '추가에 실패했습니다.')
  }

  // 현재본(깔끔)을 수집함에 메모로
  const stashCurrent = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    const text = toCleanCurrent(rows).trim()
    if (!text) { flash('담을 내용이 없습니다.'); return }
    addToStash({ kind: 'memo', label: '비교 현재본', text })
    flash('수집함에 담았습니다.')
  }

  const swap = () => { const l = left; setLeft(right); setRight(l) }
  const clearAll = () => { setLeft(''); setRight('') }
  const loadSample = () => { setLeft(SAMPLE_OLD); setRight(SAMPLE_NEW) }

  // 좌측 바인더 파일 드롭 → 해당 칸에 본문 텍스트 채우기
  const onDrop = (which: 'left' | 'right') => (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDropZone(null)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string') {
      if (which === 'left') setLeft(item.text); else setRight(item.text)
      flash('"' + (item.title || '문서') + '" 본문을 ' + (which === 'left' ? '이전' : '이후') + '에 불러왔습니다.')
    }
  }
  const onDragOver = (which: 'left' | 'right') => (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); setDropZone(which) }
  }
  const onDragLeave = (which: 'left' | 'right') => () => {
    setDropZone((z) => (z === which ? null : z))
  }

  // ── 색상 ──
  const COL = {
    add: { bg: 'var(--ins-bg, rgba(19,115,51,0.12))', fg: 'var(--ins-fg, #0a7d2c)', mark: 'var(--ins-fg, #0a7d2c)' },
    del: { bg: 'var(--del-bg, rgba(197,34,31,0.12))', fg: 'var(--del-fg, #b3261e)', mark: 'var(--del-fg, #b3261e)' },
    eq: { bg: 'transparent', fg: 'var(--muted)', mark: 'var(--muted)' },
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const bodyBox: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', overflow: 'hidden' }
  const title: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }
  const inputsRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', flex: '0 0 auto' }
  const inputCol: React.CSSProperties = { flex: '1 1 280px', minWidth: 230, display: 'flex', flexDirection: 'column', gap: 4 }
  const colLabel = (color: string): React.CSSProperties => ({ fontSize: 11.5, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6 })
  const taStyle = (zone: boolean): React.CSSProperties => ({
    minHeight: 84, maxHeight: 160, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)',
    border: '1px solid ' + (zone ? 'var(--accent)' : 'var(--border)'),
    boxShadow: zone ? '0 0 0 2px var(--accent) inset' : 'none',
    borderRadius: 10, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.55, outline: 'none', fontFamily: 'inherit',
  })
  const controls: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', flex: '0 0 auto' }
  const ctrlBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const segWrap: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
  const seg = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 11px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    background: active ? 'var(--accent)' : 'var(--chrome-2, var(--panel))',
    color: active ? 'var(--paper)' : 'var(--text)', fontWeight: active ? 700 : 500,
  })
  const chk: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }
  const statBar: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, flex: '0 0 auto' }
  const statTag = (color: string): React.CSSProperties => ({ fontWeight: 700, color, border: '1px solid ' + color, borderRadius: 8, padding: '2px 9px', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] })
  const diffWrap: React.CSSProperties = { flex: 1, minHeight: 80, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)' }
  const gutterStyle: React.CSSProperties = { width: 40, minWidth: 40, textAlign: 'right', padding: '2px 7px', color: 'var(--muted)', fontSize: 11, userSelect: 'none', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', verticalAlign: 'top' }
  const cellBase: React.CSSProperties = { padding: '3px 9px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', verticalAlign: 'top' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, minHeight: 120 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const markStyle = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 14, textAlign: 'center', color, fontWeight: 800, userSelect: 'none' })
  const linkbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', flex: '0 0 auto' }

  // 나란히 뷰(좌=이전, 우=이후) — 행마다 한쪽이 빈 셀
  function renderSide() {
    return (
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col style={{ width: 'calc(50% - 40px)' }} />
          <col style={{ width: 40 }} />
          <col style={{ width: 'calc(50% - 40px)' }} />
        </colgroup>
        <tbody>
          {rows.map((r, i) => {
            const leftShow = r.op !== 'add'
            const rightShow = r.op !== 'del'
            return (
              <tr key={i}>
                <td style={gutterStyle}>{leftShow ? r.ln : ''}</td>
                <td style={{ ...cellBase, background: r.op === 'del' ? COL.del.bg : 'transparent', color: r.op === 'del' ? COL.del.fg : 'var(--text)', borderRight: '1px solid var(--border)' }}>
                  {leftShow && (r.op === 'del'
                    ? <><span style={markStyle(COL.del.mark)}>−</span>{r.left}</>
                    : <><span style={markStyle('transparent')}> </span>{r.left}</>)}
                </td>
                <td style={gutterStyle}>{rightShow ? r.rn : ''}</td>
                <td style={{ ...cellBase, background: r.op === 'add' ? COL.add.bg : 'transparent', color: r.op === 'add' ? COL.add.fg : 'var(--text)' }}>
                  {rightShow && (r.op === 'add'
                    ? <><span style={markStyle(COL.add.mark)}>+</span>{r.right}</>
                    : <><span style={markStyle('transparent')}> </span>{r.right}</>)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  // 통합 뷰(한 칼럼에 +추가 / −삭제 / 동일)
  function renderUnified() {
    return (
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col style={{ width: 40 }} />
          <col />
        </colgroup>
        <tbody>
          {rows.map((r, i) => {
            const c = r.op === 'add' ? COL.add : r.op === 'del' ? COL.del : COL.eq
            const mark = r.op === 'add' ? '+' : r.op === 'del' ? '−' : ' '
            const txt = r.op === 'add' ? r.right : r.left
            return (
              <tr key={i}>
                <td style={gutterStyle}>{r.op !== 'add' ? r.ln : ''}</td>
                <td style={{ ...gutterStyle, borderRight: '1px solid var(--border)' }}>{r.op !== 'del' ? r.rn : ''}</td>
                <td style={{ ...cellBase, background: c.bg, color: r.op === 'equal' ? 'var(--text)' : c.fg }}>
                  <span style={markStyle(r.op === 'equal' ? 'transparent' : c.mark)}>{mark}</span>{txt}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const unit = mode === 'line' ? '줄' : '문장'

  return (
    <div style={wrap}>
      <div style={bodyBox}>
        <div style={title}><Emoji e="🔀"/> 이전/이후 원고를 붙여넣으면 LCS 기반 diff 로 <span style={{ color: COL.add.fg, fontWeight: 700 }}>추가</span>·<span style={{ color: COL.del.fg, fontWeight: 700 }}>삭제</span>·<span style={{ color: 'var(--muted)', fontWeight: 700 }}>동일</span>을 보여줍니다 (100% 로컬)</div>

        <div style={inputsRow}>
          <div style={inputCol}>
            <div style={colLabel(COL.del.fg)}>이전 버전 {dropZone === 'left' && <span style={{ color: 'var(--accent)' }}>· 여기에 놓기</span>}</div>
            <textarea
              style={taStyle(dropZone === 'left')}
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              onDrop={onDrop('left')} onDragOver={onDragOver('left')} onDragLeave={onDragLeave('left')}
              placeholder="이전(원래) 원고를 붙여넣으세요. 좌측 파일을 끌어다 놓아도 됩니다."
              spellCheck={false} aria-label="이전 버전 텍스트"
            />
          </div>
          <div style={inputCol}>
            <div style={colLabel(COL.add.fg)}>이후 버전 {dropZone === 'right' && <span style={{ color: 'var(--accent)' }}>· 여기에 놓기</span>}</div>
            <textarea
              style={taStyle(dropZone === 'right')}
              value={right}
              onChange={(e) => setRight(e.target.value)}
              onDrop={onDrop('right')} onDragOver={onDragOver('right')} onDragLeave={onDragLeave('right')}
              placeholder="이후(수정된) 원고를 붙여넣으세요. 입력하는 동안 실시간으로 비교합니다."
              spellCheck={false} aria-label="이후 버전 텍스트"
            />
          </div>
        </div>

        <div style={controls}>
          <div style={ctrlBox}>
            <span>단위</span>
            <div style={segWrap}>
              <span style={seg(mode === 'line')} onClick={() => setMode('line')} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode('line') } }}>줄</span>
              <span style={seg(mode === 'sentence')} onClick={() => setMode('sentence')} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode('sentence') } }}>문장</span>
            </div>
          </div>
          <div style={ctrlBox}>
            <span>보기</span>
            <div style={segWrap}>
              <span style={seg(view === 'side')} onClick={() => setView('side')} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('side') } }}>나란히</span>
              <span style={seg(view === 'unified')} onClick={() => setView('unified')} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('unified') } }}>통합</span>
            </div>
          </div>
          <label style={chk}><input type="checkbox" checked={ignoreWs} onChange={(e) => setIgnoreWs(e.target.checked)} />공백 무시</label>
          <label style={chk}><input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />대소문자 무시</label>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={loadSample} type="button">예시</button>
          <button className="minibtn" onClick={swap} disabled={!hasInput} type="button" title="이전↔이후 교체">⇄ 교체</button>
          <button className="minibtn" onClick={clearAll} disabled={!hasInput} type="button">지우기</button>
        </div>

        {hasInput && rows.length > 0 && (
          <div style={statBar}>
            <span style={statTag(COL.add.fg)}>+추가 {stats.add}{unit}</span>
            <span style={statTag(COL.del.fg)}>−삭제 {stats.del}{unit}</span>
            <span style={statTag('var(--muted)')}>=동일 {stats.eq}</span>
            <span style={statTag('var(--accent)')}>유사도 {stats.similarity}%</span>
            {approx && <span style={{ ...hint, color: 'var(--warn)' }}>※ 입력이 길어 근사 비교로 처리했습니다.</span>}
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={doCopy} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
          </div>
        )}

        {!hasInput ? (
          <div style={empty}>
            <div style={{ fontSize: 32 }}><Emoji e="🔀"/></div>
            <div>두 버전의 원고를 붙여넣으면 무엇이 바뀌었는지<br />줄 또는 문장 단위로 비교해 보여줍니다.</div>
            <div style={hint}>LCS(최장 공통 부분수열) 알고리즘으로 추가·삭제를 정확히 정렬합니다. 좌측 파일을 끌어다 놓을 수도 있어요. 입력은 자동 저장됩니다.</div>
          </div>
        ) : rows.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 30 }}><Emoji e="✅"/></div>
            <div>비교할 내용이 없습니다. 양쪽에 텍스트를 입력하세요.</div>
          </div>
        ) : stats.changed === 0 ? (
          <div style={diffWrap}>
            <div style={{ ...empty, padding: 24 }}>
              <div style={{ fontSize: 30 }}><Emoji e="🟰"/></div>
              <div>두 버전이 완전히 동일합니다.</div>
              <div style={hint}>{unit} 단위로 차이가 없습니다.</div>
            </div>
          </div>
        ) : (
          <div style={diffWrap}>
            {view === 'side' ? renderSide() : renderUnified()}
          </div>
        )}
      </div>

      <div className="linkbar" style={linkbar}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={sendToProject} disabled={!hasProjectBridge() || !rows.length}
          title={hasProjectBridge() ? '비교 결과를 프로젝트 자료 "교정" 폴더 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={stashCurrent} disabled={!hasStash() || !rows.length}
          title={hasStash() ? '추가 반영·삭제 제외한 현재본을 수집함에 메모로 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="🧺"/> 수집함에 담기</button>
        <button className="linkbtn" onClick={() => openToolLinked('repeated-word-finder', { text: toCleanCurrent(rows) })} disabled={!rows.length} title="현재본을 반복어 탐지로 보내 점검"><Emoji e="🔁"/> 반복어 점검</button>
        <button className="linkbtn" onClick={() => openToolLinked('word-frequency', { text: toCleanCurrent(rows) })} disabled={!rows.length} title="현재본을 단어 빈도 분석으로 보내기"><Emoji e="📊"/> 단어 빈도</button>
        {flashMsg && <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>{clip(flashMsg, 60)}</span>}
      </div>
    </div>
  )
}
