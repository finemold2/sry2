// 산문 화가 — 텍스트를 색·질감의 "회화"로 시각화한다.
//  문장 하나하나를 붓질로 변환: 긴 문장은 넓은 붓, 대사는 점묘, 물음/감탄은 색·기울기로.
//  문체 지문(6축 레이더)으로 두 글의 문체를 정량 비교하고, 좌우로 두 회화를 나란히 본다.
//  전부 브라우저 로컬 계산. react 외 import 는 ./linkbus 만.
//  localStorage 'sry:tool:prose-painter' 에 입력 자동 저장/복원.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'prose-painter',
  name: '산문 화가',
  icon: '🎨',
  group: '분위기·시각',
  intro: '문장을 색과 질감의 붓질로 바꿔 문체를 한 폭의 회화로 시각화하고 두 글의 문체 지문을 비교합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:prose-painter'

// ── 문자열 해시(결정론적 의사난수 시드) ───────────────────────────
function hash32(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
// 시드 기반 의사난수 발생기(mulberry32) — 같은 입력 → 같은 그림
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 문장 분리 ──────────────────────────────────────────────────
function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?。！？…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 한글/영문/숫자 등 "의미 글자" 수(공백·기호 제외) — 체감 분량
function glyphLen(s: string): number {
  return (s.match(/[\p{L}\p{N}]/gu) || []).length
}

// 한 문장이 대사(따옴표)인지 — 다양한 따옴표 지원
function isDialogue(s: string): boolean {
  return /["“”'‘’『』「」]/.test(s) && /["“”'‘’『』「」][^"“”'‘’『』「」]+["“”'‘’『』「」]/.test(s)
}

interface StrokeInfo {
  text: string
  len: number          // 의미 글자 수
  dialogue: boolean
  exclaim: number      // 느낌표 수
  question: number     // 물음표 수
  comma: number        // 쉼표/연결부호 수(호흡의 잘게 나뉨)
  ellipsis: boolean    // 말줄임
  hue: number          // 0~360
  energy: number       // 0~1 (감정 에너지)
  idx: number
}

// 문장 → 붓질 속성
function toStroke(s: string, idx: number): StrokeInfo {
  const len = glyphLen(s)
  const dialogue = isDialogue(s)
  const exclaim = (s.match(/[!！]/g) || []).length
  const question = (s.match(/[?？]/g) || []).length
  const comma = (s.match(/[,，、；;:·]/g) || []).length
  const ellipsis = /[…]|\.{3,}/.test(s)

  // 색상(Hue): 문장의 어조를 따뜻함↔차가움으로.
  //  감탄↑ → 따뜻한(붉은/주황) / 의문↑ → 차가운(청록/파랑) / 말줄임 → 보라(여운)
  //  기본 톤은 문장 텍스트 해시로 살짝 흔들어 단조로움 방지.
  let hue: number
  const energyRaw = exclaim * 0.5 + question * 0.2 + (dialogue ? 0.2 : 0) + comma * 0.05
  if (ellipsis) hue = 270 + (hash32(s) % 40) - 20            // 보라 계열
  else if (exclaim > question && exclaim > 0) hue = 12 + (hash32(s) % 36)   // 붉은~주황
  else if (question > exclaim && question > 0) hue = 190 + (hash32(s) % 50) // 청록~파랑
  else {
    // 평서문: 길이에 따라 따뜻(짧고 단호)↔차분한 초록·청록(길고 유려)
    const base = len <= 12 ? 30 : len >= 40 ? 150 : 90
    hue = (base + (hash32(s) % 60) - 30 + 360) % 360
  }
  const energy = Math.max(0, Math.min(1, energyRaw))
  return { text: s, len, dialogue, exclaim, question, comma, ellipsis, hue, energy, idx }
}

// 채도/명도 — 에너지 높을수록 진하고 선명. 길이 길수록 차분(약간 옅게).
function strokeFill(st: StrokeInfo): string {
  const sat = Math.round(45 + st.energy * 45)              // 45~90%
  const light = Math.round(58 - st.energy * 14 + Math.min(12, st.len / 6)) // 길수록 옅게
  return `hsl(${Math.round(st.hue)} ${sat}% ${Math.min(72, Math.max(36, light))}%)`
}

// ── 문체 지문(6축) 계산 ────────────────────────────────────────
interface Fingerprint {
  avgLen: number       // 평균 문장 길이
  variance: number     // 길이 다양성(리듬)
  dialogueRatio: number
  energy: number       // 감탄·의문 비중
  pace: number         // 호흡(쉼표 밀도) — 높을수록 만연체
  lyric: number        // 서정성(말줄임·긴 문장·보라 톤)
  n: number
  total: number
}
function fingerprint(strokes: StrokeInfo[]): Fingerprint | null {
  const n = strokes.length
  if (n === 0) return null
  const lens = strokes.map((s) => s.len)
  const total = lens.reduce((a, b) => a + b, 0)
  const avg = total / n
  const varc = Math.sqrt(lens.reduce((a, b) => a + (b - avg) * (b - avg), 0) / n)
  const dlg = strokes.filter((s) => s.dialogue).length / n
  const energy = strokes.reduce((a, s) => a + s.exclaim + s.question, 0) / n
  const pace = strokes.reduce((a, s) => a + s.comma, 0) / Math.max(1, total / 10)
  const lyric = (strokes.filter((s) => s.ellipsis).length / n) * 2 + Math.min(1, avg / 50)
  return { avgLen: avg, variance: varc, dialogueRatio: dlg, energy, pace, lyric, n, total }
}

// 6축을 0~1로 정규화(레이더용)
function radarAxes(fp: Fingerprint): { key: string; label: string; v: number }[] {
  return [
    { key: 'len', label: '문장 길이', v: clamp01(fp.avgLen / 50) },
    { key: 'var', label: '리듬', v: clamp01(fp.variance / 30) },
    { key: 'dlg', label: '대사', v: clamp01(fp.dialogueRatio) },
    { key: 'eng', label: '에너지', v: clamp01(fp.energy / 1.2) },
    { key: 'pace', label: '만연도', v: clamp01(fp.pace / 4) },
    { key: 'lyr', label: '서정', v: clamp01(fp.lyric / 2) },
  ]
}
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)) }

// ── 회화 SVG(붓질) ─────────────────────────────────────────────
interface CanvasProps { strokes: StrokeInfo[]; seedKey: string; w: number; h: number }
function paintingPaths(p: CanvasProps): React.ReactNode {
  const { strokes, seedKey, w, h } = p
  if (strokes.length === 0) return null
  const r = rng(hash32(seedKey) || 1)
  const maxLen = Math.max(...strokes.map((s) => s.len), 1)
  const nodes: React.ReactNode[] = []
  // 붓질을 캔버스 위에 흐르듯 배치: 왼→오, 위→아래로 진행하며 약간의 흔들림.
  const cols = Math.max(1, Math.round(Math.sqrt(strokes.length) * 1.3))
  strokes.forEach((st, i) => {
    const fill = strokeFill(st)
    const col = i % cols
    const row = Math.floor(i / cols)
    const cellW = w / cols
    const cellH = (h - 8) / Math.max(1, Math.ceil(strokes.length / cols))
    const jx = (r() - 0.5) * cellW * 0.4
    const jy = (r() - 0.5) * cellH * 0.4
    const cx = col * cellW + cellW / 2 + jx
    const cy = row * cellH + cellH / 2 + jy + 4
    // 붓 크기: 길이에 비례. 넓은 붓 = 긴 문장.
    const size = 8 + (st.len / maxLen) * Math.min(cellW, cellH) * 1.1
    const tip = (
      <title key={`t${i}`}>
        {`${i + 1}. ${st.dialogue ? '[대사] ' : ''}${st.len}자${st.exclaim ? ' · 감탄' + st.exclaim : ''}${st.question ? ' · 의문' + st.question : ''}\n${st.text.length > 80 ? st.text.slice(0, 80) + '…' : st.text}`}
      </title>
    )
    if (st.dialogue) {
      // 대사 = 점묘(여러 작은 점이 흩뿌려진 군집)
      const dots = Math.max(5, Math.min(28, Math.round(st.len / 2)))
      const pts: React.ReactNode[] = []
      for (let d = 0; d < dots; d++) {
        const ang = r() * Math.PI * 2
        const rad = Math.sqrt(r()) * size * 0.6
        pts.push(<circle key={d} cx={cx + Math.cos(ang) * rad} cy={cy + Math.sin(ang) * rad} r={1.4 + r() * 1.8} fill={fill} opacity={0.55 + r() * 0.4} />)
      }
      nodes.push(<g key={i}>{tip}{pts}</g>)
    } else if (st.exclaim > st.question && st.exclaim > 0) {
      // 감탄 = 비스듬한 굵은 붓(획)
      const ang = (-25 - r() * 30)
      const len2 = size * 1.5
      nodes.push(
        <g key={i} transform={`translate(${cx} ${cy}) rotate(${ang})`}>
          {tip}
          <rect x={-len2 / 2} y={-size * 0.18} width={len2} height={size * 0.36} rx={size * 0.18} fill={fill} opacity={0.92} />
        </g>,
      )
    } else if (st.ellipsis) {
      // 말줄임 = 옅게 번지는 안개(겹쳐진 반투명 원)
      nodes.push(
        <g key={i}>
          {tip}
          <circle cx={cx} cy={cy} r={size * 0.7} fill={fill} opacity={0.25} />
          <circle cx={cx + 3} cy={cy + 2} r={size * 0.5} fill={fill} opacity={0.3} />
          <circle cx={cx - 2} cy={cy - 3} r={size * 0.35} fill={fill} opacity={0.35} />
        </g>,
      )
    } else {
      // 평서문 = 둥근 붓 자국(길수록 넓은 타원, 쉼표 많으면 결이 갈라짐)
      const ry = size * 0.5
      const rx = size * (0.55 + Math.min(0.5, st.len / maxLen) * 0.6)
      nodes.push(
        <g key={i} transform={`translate(${cx} ${cy}) rotate(${(r() - 0.5) * 24})`}>
          {tip}
          <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={fill} opacity={0.85} />
          {st.comma > 1 && (
            <ellipse cx={0} cy={0} rx={rx * 0.6} ry={ry * 0.45} fill="var(--paper)" opacity={0.18} />
          )}
        </g>,
      )
    }
  })
  return nodes
}

// ── 레이더 차트 SVG ────────────────────────────────────────────
function Radar(props: { a: Fingerprint; b: Fingerprint | null; size: number }): React.ReactElement {
  const { a, b, size } = props
  const cx = size / 2, cy = size / 2
  const R = size / 2 - 26
  const axes = radarAxes(a)
  const bAxes = b ? radarAxes(b) : null
  const ang = (i: number) => (-Math.PI / 2) + (i / axes.length) * Math.PI * 2
  const pt = (i: number, v: number) => `${(cx + Math.cos(ang(i)) * R * v).toFixed(1)},${(cy + Math.sin(ang(i)) * R * v).toFixed(1)}`
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v)).join(' ')
  const rings = [0.25, 0.5, 0.75, 1]
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block', maxHeight: size }} role="img" aria-label="문체 지문 레이더">
      {rings.map((rr, k) => (
        <polygon key={k} points={poly(axes.map(() => rr))} fill="none" stroke="var(--border)" strokeWidth={1} opacity={k === rings.length - 1 ? 0.9 : 0.4} />
      ))}
      {axes.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang(i)) * R} y2={cy + Math.sin(ang(i)) * R} stroke="var(--border)" strokeWidth={1} opacity={0.45} />
      ))}
      {/* A */}
      <polygon points={poly(axes.map((x) => x.v))} fill="var(--accent)" fillOpacity={0.22} stroke="var(--accent)" strokeWidth={2} />
      {axes.map((x, i) => {
        const px = cx + Math.cos(ang(i)) * R * x.v
        const py = cy + Math.sin(ang(i)) * R * x.v
        return <circle key={i} cx={px} cy={py} r={2.6} fill="var(--accent)" />
      })}
      {/* B(비교) */}
      {bAxes && (
        <>
          <polygon points={poly(bAxes.map((x) => x.v))} fill="var(--warn)" fillOpacity={0.16} stroke="var(--warn)" strokeWidth={2} strokeDasharray="4 3" />
          {bAxes.map((x, i) => {
            const px = cx + Math.cos(ang(i)) * R * x.v
            const py = cy + Math.sin(ang(i)) * R * x.v
            return <circle key={i} cx={px} cy={py} r={2.4} fill="var(--warn)" />
          })}
        </>
      )}
      {/* 축 라벨 */}
      {axes.map((x, i) => {
        const lx = cx + Math.cos(ang(i)) * (R + 14)
        const ly = cy + Math.sin(ang(i)) * (R + 14)
        return <text key={i} x={lx} y={ly + 3} textAnchor="middle" fontSize={10} fill="var(--muted)">{x.label}</text>
      })}
    </svg>
  )
}

// 문체 한 줄 설명(지문 → 자연어)
function describeStyle(fp: Fingerprint): string {
  const parts: string[] = []
  if (fp.avgLen >= 38) parts.push('호흡이 긴 만연체')
  else if (fp.avgLen <= 14) parts.push('짧고 단호한 단문체')
  else parts.push('중간 호흡의 문장')
  if (fp.variance >= 18) parts.push('장단의 리듬이 살아 있음')
  else if (fp.variance <= 7) parts.push('길이가 고른 편')
  if (fp.dialogueRatio >= 0.4) parts.push('대사 중심')
  else if (fp.dialogueRatio <= 0.05) parts.push('서술 중심')
  if (fp.energy >= 0.6) parts.push('감정 표출이 강함')
  if (fp.lyric >= 0.9) parts.push('서정적 여운')
  return parts.join(' · ')
}

interface SaveShape { textA: string; textB: string; compare: boolean }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object') {
        return {
          textA: typeof p.textA === 'string' ? p.textA : '',
          textB: typeof p.textB === 'string' ? p.textB : '',
          compare: !!p.compare,
        }
      }
    }
  } catch { /* noop */ }
  return { textA: '', textB: '', compare: false }
}

export default function ProsePainter({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [textA, setTextA] = useState(init.current.textA)
  const [textB, setTextB] = useState(init.current.textB)
  const [compare, setCompare] = useState(init.current.compare)
  const [active, setActive] = useState<'A' | 'B'>('A')   // 어느 입력칸에 드롭/payload 를 넣을지
  const [dropOn, setDropOn] = useState(false)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const mounted = useRef(true)
  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.text 수용(다른 도구에서 데이터와 함께 열렸을 때)
  useEffect(() => {
    const t = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (t.trim()) {
      setTextA((prev) => (prev.trim() ? prev : t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ textA, textB, compare } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [textA, textB, compare])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const strokesA = useMemo(() => splitSentences(textA).map(toStroke), [textA])
  const strokesB = useMemo(() => splitSentences(textB).map(toStroke), [textB])
  const fpA = useMemo(() => fingerprint(strokesA), [strokesA])
  const fpB = useMemo(() => fingerprint(strokesB), [strokesB])

  // ── 드롭(바인더 문서) 수용 ──────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    setDropOn(false)
    const item = getDragItem(e)
    if (item && item.text) {
      e.preventDefault()
      if (active === 'A') setTextA(item.text)
      else setTextB(item.text)
      setToast(`'${item.title}' 본문을 ${active}칸에 넣었어요`)
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropOn(true) } }

  const setActiveText = (v: string) => { if (active === 'A') setTextA(v); else setTextB(v) }
  const curText = active === 'A' ? textA : textB
  const curStrokes = active === 'A' ? strokesA : strokesB

  // 스니펫 라이브러리에서 불러오기
  const loadSnippet = (text: string) => { setActiveText(text); setToast('수집한 스니펫을 불러왔어요') }

  // 산출물 텍스트(요약 리포트)
  const buildReport = (fp: Fingerprint, label: string): string => {
    const ax = radarAxes(fp)
    const lines: string[] = []
    lines.push(`[산문 화가 · 문체 지문] ${label}`)
    lines.push(`문장 ${fp.n}개 · 총 ${fp.total}자`)
    lines.push(`평균 길이 ${fp.avgLen.toFixed(1)}자 · 리듬(편차) ${fp.variance.toFixed(1)}`)
    lines.push(`대사 비율 ${(fp.dialogueRatio * 100).toFixed(0)}% · 감정 에너지 ${fp.energy.toFixed(2)} · 만연도 ${fp.pace.toFixed(2)}`)
    lines.push('지문 6축: ' + ax.map((a) => `${a.label} ${(a.v * 100).toFixed(0)}`).join(' / '))
    lines.push('한 줄 평: ' + describeStyle(fp))
    return lines.join('\n')
  }

  // 수집함에 담기
  const stashReport = () => {
    const fp = active === 'A' ? fpA : fpB
    if (!fp || !hasStash()) return
    addToStash({ kind: 'memo', label: `문체 지문 ${active}`, text: buildReport(fp, active === 'A' ? '글 A' : '글 B') })
    setToast('수집함에 문체 지문을 담았어요')
  }

  // 프로젝트에 추가(자료 › 문체 폴더)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const fp = active === 'A' ? fpA : fpB
    if (!fp || !hasProjectBridge()) return
    const ax = radarAxes(fp)
    const body = [
      `<p><strong>문체 지문</strong> · 문장 ${fp.n}개 · 총 ${fp.total}자</p>`,
      `<p>평균 길이 ${fp.avgLen.toFixed(1)}자 · 리듬 ${fp.variance.toFixed(1)} · 대사 ${(fp.dialogueRatio * 100).toFixed(0)}%</p>`,
      '<ul>' + ax.map((a) => `<li>${esc(a.label)}: ${(a.v * 100).toFixed(0)}/100</li>`).join('') + '</ul>',
      `<p>${esc(describeStyle(fp))}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '문체',
      title: `문체 지문 — 글 ${active}`,
      bodyHtml: body,
      meta: { 문장수: String(fp.n), 평균길이: fp.avgLen.toFixed(1), 대사비율: `${(fp.dialogueRatio * 100).toFixed(0)}%` },
    })
    if (id) setToast('프로젝트 자료(문체)에 지문을 추가했어요')
    else setNote('프로젝트에 연결되지 않았습니다.')
  }

  // 스니펫 라이브러리에 현재 글 저장
  const saveSnippet = () => {
    const t = curText.trim()
    if (!t) return
    addToLibrary('snippets', { text: t, source: '산문 화가', tags: ['문체'] })
    setToast('스니펫 라이브러리에 저장했어요')
  }

  // 관련 도구 열기(현재 글과 함께)
  const openRelated = (id: string) => { openToolLinked(id, { text: curText }) }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const ta: React.CSSProperties = {
    minHeight: 84, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dropOn ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dropOn ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.55 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '22px 10px' }
  const legend: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)', marginTop: 6 }
  const swatch = (c: string): React.CSSProperties => ({ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: c, marginRight: 4, verticalAlign: '-1px' })

  const CW = 460, CH = 230

  // 캔버스 한 칸 렌더
  const renderCanvas = (strokes: StrokeInfo[], key: string, label: string) => (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ ...sectionTitle, marginBottom: 0 }}>{label} 회화</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{strokes.length}붓질</span>
      </div>
      {strokes.length === 0 ? (
        <div style={empty}>글을 입력하면 문장이 붓질로 그려집니다.</div>
      ) : (
        <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: CH, background: 'var(--chrome-2)', borderRadius: 8 }} role="img" aria-label={`${label} 산문 회화`}>
          {paintingPaths({ strokes, seedKey: key + hash32(strokes.map((s) => s.text).join('|')), w: CW, h: CH })}
        </svg>
      )}
    </div>
  )

  const showB = compare
  const fpForRadar = active === 'A' ? fpA : fpB

  return (
    <div style={wrap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={() => setDropOn(false)}>
      <div style={head}>
        <span style={{ fontSize: 17 }}>🎨</span>
        <strong style={{ fontSize: 13 }}>산문 화가</strong>
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> 두 글 비교
        </label>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 12px 0' }}>{note}</div>}
      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 12px 0' }}>{toast}</div>}

      <div style={body}>
        {/* 입력 칸 선택 + 텍스트 */}
        {compare && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={active === 'A' ? 'btn-primary' : 'minibtn'} style={{ flex: 1 }} onClick={() => setActive('A')}>글 A 편집</button>
            <button className={active === 'B' ? 'btn-primary' : 'minibtn'} style={{ flex: 1 }} onClick={() => setActive('B')}>글 B 편집</button>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={sectionTitle}>{compare ? `글 ${active}` : '문장을 붙여넣으세요'}</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setActiveText('')} disabled={!curText}>지우기</button>
          </div>
          <textarea
            style={ta}
            value={curText}
            onChange={(e) => setActiveText(e.target.value)}
            placeholder={'여기에 글을 붙여넣으세요. 왼쪽 바인더 문서를 끌어다 놓아도 됩니다.\n긴 문장은 넓은 붓, 대사는 점묘, 감탄은 비스듬한 획, 말줄임은 옅은 안개로 그려집니다.'}
            spellCheck={false}
            aria-label="산문 화가 입력"
          />
          <div style={legend}>
            <span><i style={swatch('hsl(20 80% 55%)')} />감탄/단호(따뜻)</span>
            <span><i style={swatch('hsl(205 70% 55%)')} />의문(차가움)</span>
            <span><i style={swatch('hsl(130 55% 52%)')} />유려한 평서</span>
            <span><i style={swatch('hsl(270 55% 60%)')} />말줄임(여운)</span>
            <span>대사=점묘</span>
          </div>
        </div>

        {/* 스니펫 라이브러리 빠른 불러오기 */}
        {snippets.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>수집 스니펫:</span>
            {snippets.slice(0, 6).map((s) => (
              <button key={s.id} className="minibtn" style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.text} onClick={() => loadSnippet(s.text)}>
                {s.text.slice(0, 14) || '(빈 스니펫)'}
              </button>
            ))}
          </div>
        )}

        {/* 회화(들) */}
        {(strokesA.length > 0 || strokesB.length > 0) ? (
          <>
            {renderCanvas(strokesA, 'A', '글 A')}
            {showB && renderCanvas(strokesB, 'B', '글 B')}

            {/* 문체 지문 레이더 */}
            {fpForRadar && (
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...sectionTitle, marginBottom: 0 }}>문체 지문</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: 'var(--accent)' }}>● 글 {active}</span>
                  {showB && fpB && fpA && <span style={{ fontSize: 11, color: 'var(--warn)' }}>┄ 비교</span>}
                </div>
                <Radar a={fpForRadar} b={showB ? (active === 'A' ? fpB : fpA) : null} size={240} />
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)', marginTop: 4, textAlign: 'center' }}>
                  {describeStyle(fpForRadar)}
                </div>
              </div>
            )}

            {/* 비교 요약(두 글의 차이) */}
            {showB && fpA && fpB && (
              <div style={{ ...panel, borderLeft: '3px solid var(--accent)' }}>
                <div style={sectionTitle}>두 글의 문체 차이</div>
                {(() => {
                  const ax = radarAxes(fpA), bx = radarAxes(fpB)
                  const diffs = ax.map((a, i) => ({ label: a.label, d: a.v - bx[i].v }))
                    .sort((p, q) => Math.abs(q.d) - Math.abs(p.d))
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {diffs.map((d) => (
                        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ width: 56, color: 'var(--muted)' }}>{d.label}</span>
                          <div style={{ flex: 1, height: 8, background: 'var(--chrome-2)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                              position: 'absolute', left: '50%', top: 0, height: '100%',
                              width: `${Math.min(50, Math.abs(d.d) * 50)}%`,
                              background: d.d >= 0 ? 'var(--accent)' : 'var(--warn)',
                              transform: d.d >= 0 ? 'none' : 'translateX(-100%)',
                              borderRadius: 4,
                            }} />
                            <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 1, background: 'var(--border)' }} />
                          </div>
                          <span style={{ width: 64, textAlign: 'right', fontSize: 11, color: d.d >= 0 ? 'var(--accent)' : 'var(--warn)' }}>
                            {d.d >= 0 ? 'A 높음' : 'B 높음'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <div style={{ ...hint, marginTop: 6 }}>막대가 길수록 그 축에서 두 글의 문체 차이가 큽니다.</div>
              </div>
            )}

            {/* 산출물 동작 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || !fpForRadar} title={hasProjectBridge() ? '자료 › 문체 폴더에 지문 문서 추가' : '프로젝트에 연결되지 않았습니다'}>프로젝트에 추가</button>
              <button className="linkbtn" onClick={stashReport} disabled={!hasStash() || !fpForRadar} title={hasStash() ? '수집함에 문체 지문 담기' : '수집함이 없습니다'}>수집함에 담기</button>
              <button className="minibtn" onClick={saveSnippet} disabled={!curText.trim()}>스니펫 저장</button>
              <button className="minibtn" onClick={() => openRelated('sentence-length-viz')}>문장 길이로</button>
              <button className="minibtn" onClick={() => openRelated('dialogue-ratio')}>대사 비율로</button>
            </div>
            <div style={hint}>
              붓질에 마우스를 올리면 해당 문장이 보입니다. 같은 글은 항상 같은 그림으로 그려집니다(결정론적).
              긴 문장은 넓은 붓, 대사는 점묘, 감탄은 비스듬한 획, 의문은 차가운 색으로 매핑됩니다.
            </div>
          </>
        ) : (
          <div style={empty}>
            글을 입력하면 문장마다 색·질감의 붓질이 캔버스에 흩뿌려지고,<br />
            6축 문체 지문 레이더가 그려집니다.<br />
            좌측 바인더 문서를 끌어다 놓거나 수집한 스니펫을 불러올 수 있어요.<br />
            상단의 <b>두 글 비교</b>를 켜면 두 문체를 나란히 견줄 수 있습니다.
          </div>
        )}
      </div>
    </div>
  )
}
