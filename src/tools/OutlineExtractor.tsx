// 자동 개요 추출기 — 긴 원고를 붙여넣거나 좌측 바인더 문서를 끌어다 놓으면,
//   휴리스틱으로 제목/장·절/문단을 인식하고 각 문단의 "주제문(핵심 한 문장)"을 골라
//   편집 가능한 계층 개요 트리로 만들어 줍니다.
//   - 제목 감지: 마크다운(#), 번호(1. / 제1장 / 1) / 1.2), 짧고 종결부호 없는 줄, 전부 대문자/장표지 등
//   - 주제문 추출: 위치(첫·끝 문장 가중) + 단서어("결국/따라서/즉" 등) + 길이 적정성 점수
//   - 트리 편집: 인라인 수정, 접기/펼치기, 위·아래 이동, 들여·내어쓰기, 삭제, 포함/제외 토글
//   - 내보내기: 들여쓴 텍스트 / 마크다운 / <ul><li> HTML
// 모든 상태(원문·옵션·트리)는 localStorage 'sry:tool:outline-extractor' 에 자동 저장/복원.
// 연계(linkbus): 바인더 문서 드롭으로 본문 수용 / addToProject(원고 '개요' 폴더에 <ul><li> 문서),
//   추출한 주제문을 수집함에 메모로 담기.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 없음. 미지원 환경 graceful.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge, getDragItem, isItemDrag,
  addToStash, hasStash, Emoji,
} from './linkbus'

export const meta = {
  id: 'outline-extractor',
  name: '개요 추출기',
  icon: '🪄',
  group: '구상·정리',
  intro: '긴 원고를 붙여넣으면 제목·문단·주제문을 자동 인식해 편집 가능한 계층 개요로 만들어 드려요',
  w: 760,
  h: 660,
}

const LS_KEY = 'sry:tool:outline-extractor'

// ── 데이터 모델 ─────────────────────────────────────────────
type NodeKind = 'heading' | 'para' | 'manual'
interface Node {
  id: string
  text: string        // 표시 텍스트(제목/주제문/직접 입력)
  kind: NodeKind
  level: number        // 감지 단계(0=최상위). 트리 구조 보정에 사용된 추정값
  collapsed: boolean
  included: boolean    // 내보내기/프로젝트 추가 시 포함 여부
  detail?: string      // para 의 경우 원문 문단 일부(미리보기/근거)
  children: Node[]
}

interface Options {
  topicMode: 'first' | 'best' | 'firstlast'  // 주제문 선택 방식
  maxTopicLen: number                          // 주제문 최대 길이(자)
  minParaLen: number                           // 이보다 짧은 문단은 제목 후보로
  groupBy: 'heading' | 'flat'                  // 제목 기준 그룹핑 / 평면
  dropShort: boolean                           // 너무 짧은 잡음 문단 제외
}

interface Saved {
  source: string
  options: Options
  tree: Node[]
  selectedId: string | null
}

const DEFAULT_OPTS: Options = {
  topicMode: 'best',
  maxTopicLen: 90,
  minParaLen: 12,
  groupBy: 'heading',
  dropShort: true,
}

const SAMPLE = `프롤로그

비가 사흘째 내렸다. 도시는 잿빛 물막 아래 잠겨 있었고, 거리에는 사람의 그림자조차 드물었다. 그러나 그 침묵 속에서 무언가가 천천히 깨어나고 있었다. 아무도 그것을 알아채지 못했다.

1장. 오래된 약속

리아는 낡은 편지를 손에 쥐고 한참을 서 있었다. 잉크는 바래 거의 읽을 수 없었지만, 마지막 문장만은 또렷했다. "돌아오겠다"는 그 한마디가 십 년 동안 그녀를 붙들어 두었다. 결국 그녀는 문을 열고 빗속으로 걸어 나갔다.

기차역은 텅 비어 있었다. 매표원은 졸고 있었고, 전광판의 글자는 깜빡이다 꺼졌다. 리아는 마지막 기차표를 샀다. 따라서 그녀의 여정은 이제 되돌릴 수 없게 되었다.

2장. 낯선 동행

객실 문이 열리고 한 남자가 들어왔다. 그는 모자를 깊이 눌러쓰고 있었고, 말이 없었다. 침묵은 무거웠지만 불쾌하지는 않았다. 즉 두 사람 사이에는 설명할 수 없는 익숙함이 있었다.

남자가 처음으로 입을 열었다. "당신도 그를 찾고 있군요." 리아의 심장이 멎는 듯했다. 그가 어떻게 알았을까. 이 질문이 모든 것을 바꾸어 놓을 참이었다.`

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ── 텍스트 휴리스틱 ─────────────────────────────────────────────

// 문단 분리: 빈 줄 기준. 빈 줄이 거의 없으면 줄 단위로 분리(시/대본 대비).
function splitParagraphs(raw: string): string[] {
  const text = raw.replace(/\r\n?/g, '\n')
  const byBlank = text.split(/\n[ \t]*\n+/).map((s) => s.trim()).filter(Boolean)
  if (byBlank.length > 1) return byBlank
  // 빈 줄이 없으면 줄바꿈으로
  const byLine = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  return byLine.length ? byLine : (text.trim() ? [text.trim()] : [])
}

// 문장 분리(한/영 종결부호 + 줄바꿈). 따옴표 안 종결부호는 단순 처리.
const ELLIPSIS_TOKEN = String.fromCharCode(1)
function splitSentences(p: string): string[] {
  const norm = p.replace(/\s+/g, ' ').trim()
  if (!norm) return []
  // 종결부호 뒤에서 자른다. 말줄임표(…/...)는 한 단위로.
  const parts = norm
    .replace(/\.\.\.|…/g, ELLIPSIS_TOKEN)                // 임시 보호
    .split(/(?<=[.!?。！？])\s+|(?<=다[.!?。！？]?)\s+(?=[가-힣A-Z"'「『(])/)
    .map((s) => s.split(ELLIPSIS_TOKEN).join('…').trim())
    .filter(Boolean)
  return parts.length ? parts : [norm]
}

// 장/막/부/절 등의 표지. 영문 단서는 \b 로 단어 경계를 요구하고(예: 'partner' 오탐 방지),
// 한국어 단서는 \b 가 한글 비단어로 작동하지 않으므로 경계를 붙이지 않는다.
const HEADING_CUES = /^(제?\s*\d+\s*(장|막|부|화|편|절)|chapter\b|part\b|prologue\b|epilogue\b|프롤로그|에필로그|서장|종장|서막|장면)/i

// 한 문단(또는 한 줄)이 "제목"일 가능성 점수와 단계 추정.
function detectHeading(line: string, opts: Options): { isHeading: boolean; level: number; clean: string } {
  const t = line.trim()
  if (!t) return { isHeading: false, level: 0, clean: t }

  // 1) 마크다운 헤딩
  const md = t.match(/^(#{1,6})\s+(.*)$/)
  if (md) return { isHeading: true, level: Math.min(md[1].length - 1, 5), clean: md[2].trim() }

  // 2) 명시적 장/막/부 표지
  if (HEADING_CUES.test(t)) {
    // "1부 > 1장 > 1절" 대략적 단계
    let level = 1
    if (/(부|편|막)\b/.test(t.slice(0, 8)) || /^(part|프롤로그|에필로그|prologue|epilogue|서장|종장|서막)/i.test(t)) level = 0
    if (/절\b/.test(t.slice(0, 8))) level = 2
    return { isHeading: true, level, clean: t.replace(/^#+\s*/, '') }
  }

  // 3) 번호 매김: "1." "1)" "1.2" "가." "ⅰ." 등 + 짧은 본문
  const num = t.match(/^((\d+([.)]\d+)*[.)])|[가-힣][.)]\s|[ivxlcdm]+[.)]\s)/i)
  const noEnd = !/[.!?。！？…]$/.test(t)
  const short = t.length <= Math.max(opts.minParaLen + 8, 34)
  if (num && short) {
    const depth = (t.match(/\./g) || []).length
    return { isHeading: true, level: Math.min(Math.max(depth, 0), 4), clean: t }
  }

  // 4) 짧고 종결부호가 없으며 문장이 하나뿐 → 제목 후보
  if (short && noEnd && splitSentences(t).length <= 1 && !/[,;:、]/.test(t)) {
    return { isHeading: true, level: 1, clean: t }
  }

  return { isHeading: false, level: 0, clean: t }
}

const TOPIC_CUES = /(결국|따라서|그러므로|즉|요컨대|마침내|그리하여|결론적으로|중요한|핵심|무엇보다|therefore|thus|in short|finally|consequently)/i

// 한 문단에서 주제문 한 개를 고른다.
function pickTopic(para: string, opts: Options): string {
  const sents = splitSentences(para)
  if (sents.length === 0) return para.trim().slice(0, opts.maxTopicLen)
  if (sents.length === 1) return clampSentence(sents[0], opts.maxTopicLen)

  if (opts.topicMode === 'first') return clampSentence(sents[0], opts.maxTopicLen)
  if (opts.topicMode === 'firstlast') {
    const a = clampSentence(sents[0], Math.floor(opts.maxTopicLen / 2))
    const b = clampSentence(sents[sents.length - 1], Math.floor(opts.maxTopicLen / 2))
    return a === b ? a : `${a} … ${b}`
  }

  // best: 점수화
  let bestIdx = 0
  let bestScore = -Infinity
  const n = sents.length
  for (let i = 0; i < n; i++) {
    const s = sents[i]
    const len = s.length
    let score = 0
    // 위치 가중: 첫 문장 가장 높고, 끝 문장도 가산
    if (i === 0) score += 3
    else if (i === n - 1) score += 1.5
    else score += 0.4
    // 단서어
    if (TOPIC_CUES.test(s)) score += 2.2
    // 길이 적정(너무 짧/길면 감점). 25~70자 부근 선호
    const ideal = 46
    score += 1.6 - Math.min(1.6, Math.abs(len - ideal) / 40)
    // 대사("…")는 주제문보다 약하게
    if (/^["'「『(]/.test(s.trim())) score -= 1.0
    // 질문문은 약하게(요약성 낮음)
    if (/[?？]\s*$/.test(s)) score -= 0.5
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return clampSentence(sents[bestIdx], opts.maxTopicLen)
}

function clampSentence(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  // 단어 경계 비슷하게 자르기
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

// 핵심: 원문 → 평면 항목 목록(제목/문단) → groupBy 에 따라 트리화.
function extractTree(source: string, opts: Options): Node[] {
  const paras = splitParagraphs(source)
  if (!paras.length) return []

  interface Flat { kind: NodeKind; level: number; text: string; detail?: string }
  const flat: Flat[] = []

  for (const p of paras) {
    const h = detectHeading(p, opts)
    if (h.isHeading) {
      flat.push({ kind: 'heading', level: h.level, text: h.clean || p, detail: undefined })
      continue
    }
    // 잡음 문단 제외(옵션)
    if (opts.dropShort && p.trim().length < Math.max(4, Math.floor(opts.minParaLen / 2))) continue
    const topic = pickTopic(p, opts)
    flat.push({
      kind: 'para',
      level: 99, // 본문은 일단 미정(부모 제목 아래로 들어감)
      text: topic,
      detail: p.replace(/\s+/g, ' ').trim().slice(0, 280),
    })
  }

  if (!flat.length) return []

  const mk = (f: Flat): Node => ({
    id: newId(),
    text: f.text,
    kind: f.kind,
    level: f.kind === 'heading' ? f.level : 0,
    collapsed: false,
    included: true,
    detail: f.detail,
    children: [],
  })

  if (opts.groupBy === 'flat') {
    return flat.map(mk)
  }

  // 제목 기준 트리화: 제목 스택을 두고 level 비교로 부모를 찾는다.
  const roots: Node[] = []
  const stack: Node[] = [] // 현재 열린 제목들(level 오름차순)
  const hasAnyHeading = flat.some((f) => f.kind === 'heading')

  const attach = (node: Node) => {
    if (node.kind === 'heading') {
      // 자신보다 같거나 깊은(level >=) 제목들을 스택에서 제거
      while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop()
      const parent = stack[stack.length - 1]
      if (parent) parent.children.push(node)
      else roots.push(node)
      stack.push(node)
    } else {
      // 본문 문단: 가장 가까운 제목 아래로
      const parent = stack[stack.length - 1]
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }

  if (!hasAnyHeading) {
    // 제목이 전혀 없으면 본문 문단들을 평면 루트로(그래도 묶을 게 없음)
    return flat.map(mk)
  }

  for (const f of flat) attach(mk(f))
  return roots
}

// ── 불변 트리 헬퍼 ─────────────────────────────────────────────
function mapNode(tree: Node[], id: string, fn: (n: Node) => Node): Node[] {
  return tree.map((n) => {
    if (n.id === id) return fn(n)
    if (n.children.length) {
      const kids = mapNode(n.children, id, fn)
      if (kids !== n.children) return { ...n, children: kids }
    }
    return n
  })
}

function removeNode(tree: Node[], id: string): { tree: Node[]; removed: Node | null } {
  let removed: Node | null = null
  const walk = (nodes: Node[]): Node[] => {
    const out: Node[] = []
    for (const n of nodes) {
      if (n.id === id) { removed = n; continue }
      if (n.children.length) {
        const kids = walk(n.children)
        out.push(kids === n.children ? n : { ...n, children: kids })
      } else out.push(n)
    }
    return out
  }
  return { tree: walk(tree), removed }
}

function locate(tree: Node[], id: string): { parent: Node | null; siblings: Node[]; index: number } | null {
  const search = (nodes: Node[], parent: Node | null): { parent: Node | null; siblings: Node[]; index: number } | null => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent, siblings: nodes, index: i }
      const r = search(nodes[i].children, nodes[i])
      if (r) return r
    }
    return null
  }
  return search(tree, null)
}

function findNode(tree: Node[], id: string): Node | null {
  for (const n of tree) {
    if (n.id === id) return n
    const r = findNode(n.children, id)
    if (r) return r
  }
  return null
}

function countAll(tree: Node[]): number {
  return tree.reduce((acc, n) => acc + 1 + countAll(n.children), 0)
}
function countIncluded(tree: Node[]): number {
  return tree.reduce((acc, n) => acc + (n.included ? 1 : 0) + countIncluded(n.children), 0)
}
function maxDepth(tree: Node[], d = 1): number {
  let m = tree.length ? d : 0
  for (const n of tree) if (n.children.length) m = Math.max(m, maxDepth(n.children, d + 1))
  return m
}
function countHeadings(tree: Node[]): number {
  return tree.reduce((acc, n) => acc + (n.kind === 'heading' ? 1 : 0) + countHeadings(n.children), 0)
}

// 정규화(손상 데이터 graceful)
function normNode(x: any): Node | null {
  if (!x || typeof x !== 'object') return null
  const children = Array.isArray(x.children)
    ? x.children.map(normNode).filter((c: Node | null): c is Node => c !== null)
    : []
  const kind: NodeKind = x.kind === 'heading' || x.kind === 'para' || x.kind === 'manual' ? x.kind : 'manual'
  return {
    id: String(x.id || newId()),
    text: typeof x.text === 'string' ? x.text : '',
    kind,
    level: Number.isFinite(x.level) ? x.level : 0,
    collapsed: !!x.collapsed,
    included: x.included !== false,
    detail: typeof x.detail === 'string' ? x.detail : undefined,
    children,
  }
}

function normOptions(x: any): Options {
  const o = { ...DEFAULT_OPTS }
  if (x && typeof x === 'object') {
    if (x.topicMode === 'first' || x.topicMode === 'best' || x.topicMode === 'firstlast') o.topicMode = x.topicMode
    if (Number.isFinite(x.maxTopicLen)) o.maxTopicLen = Math.min(200, Math.max(30, x.maxTopicLen))
    if (Number.isFinite(x.minParaLen)) o.minParaLen = Math.min(60, Math.max(4, x.minParaLen))
    if (x.groupBy === 'heading' || x.groupBy === 'flat') o.groupBy = x.groupBy
    o.dropShort = x.dropShort !== false
  }
  return o
}

function load(): Saved {
  const fallback: Saved = { source: '', options: { ...DEFAULT_OPTS }, tree: [], selectedId: null }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    return {
      source: typeof parsed.source === 'string' ? parsed.source : '',
      options: normOptions(parsed.options),
      tree: Array.isArray(parsed.tree)
        ? parsed.tree.map(normNode).filter((n: Node | null): n is Node => n !== null)
        : [],
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : null,
    }
  } catch {
    return fallback
  }
}

// ── 직렬화 ─────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function toIndentedText(tree: Node[], depth = 0): string {
  let out = ''
  for (const n of tree) {
    if (!n.included) { if (n.children.length) out += toIndentedText(n.children, depth); continue }
    out += '    '.repeat(depth) + (n.text || '(빈 항목)') + '\n'
    if (n.children.length) out += toIndentedText(n.children, depth + 1)
  }
  return out
}
function toMarkdown(tree: Node[], depth = 0): string {
  let out = ''
  for (const n of tree) {
    if (!n.included) { if (n.children.length) out += toMarkdown(n.children, depth); continue }
    const prefix = n.kind === 'heading' && depth < 4 ? '#'.repeat(depth + 1) + ' ' : '  '.repeat(Math.max(0, depth)) + '- '
    out += prefix + (n.text || '(빈 항목)') + '\n'
    if (n.children.length) out += toMarkdown(n.children, depth + 1)
  }
  return out
}
function toHtmlList(tree: Node[]): string {
  const items = tree.filter((n) => n.included || n.children.length)
  if (!items.length) return ''
  let out = '<ul>'
  for (const n of items) {
    if (!n.included) { out += toHtmlList(n.children); continue }
    const txt = escHtml(n.text || '(빈 항목)').replace(/\n/g, '<br>')
    const body = n.kind === 'heading' ? `<strong>${txt}</strong>` : txt
    out += '<li>' + body + (n.children.length ? toHtmlList(n.children) : '') + '</li>'
  }
  out += '</ul>'
  return out
}
// 주제문(본문 항목)만 평면 수집 — 수집함 메모용
function collectTopics(tree: Node[], acc: string[] = []): string[] {
  for (const n of tree) {
    if (n.included && n.kind !== 'heading' && n.text.trim()) acc.push(n.text.trim())
    if (n.children.length) collectTopics(n.children, acc)
  }
  return acc
}

// ── 컴포넌트 ─────────────────────────────────────────────
export default function OutlineExtractor({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [source, setSource] = useState(init.current.source)
  const [options, setOptions] = useState<Options>(init.current.options)
  const [tree, setTree] = useState<Node[]>(init.current.tree)
  const [selectedId, setSelectedId] = useState<string | null>(init.current.selectedId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const [view, setView] = useState<'tree' | 'source'>(init.current.tree.length ? 'tree' : 'source')
  const [showOpts, setShowOpts] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportMode, setExportMode] = useState<'indent' | 'md' | 'html'>('indent')
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [dropHover, setDropHover] = useState(false)

  const mounted = useRef(true)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragDepth = useRef(0)
  const pendingNewId = useRef<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload 로 본문이 전달되면 채운다(다른 도구에서 openToolLinked 로 넘길 수 있음)
  useEffect(() => {
    if (!payload) return
    const body = (payload.text ?? payload.body ?? payload.source) as unknown
    if (typeof body === 'string' && body.trim()) {
      setSource(body)
      setView('source')
      flash('전달받은 본문을 채웠어요. "개요 추출"을 눌러 보세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ source, options, tree, selectedId }))
    } catch {
      flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [source, options, tree, selectedId])

  // 편집 포커스
  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current
      el.focus()
      const len = el.value.length
      try { el.setSelectionRange(len, len) } catch { /* noop */ }
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      try { el.scrollIntoView({ block: 'nearest' }) } catch { /* noop */ }
    }
  }, [editingId])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3400)
  }

  // ── 통계(원문) ──
  const sourceStats = useMemo(() => {
    const chars = source.replace(/\s/g, '').length
    const paras = splitParagraphs(source).length
    return { chars, paras, total: source.length }
  }, [source])

  // ── 개요 추출 ──
  const runExtract = useCallback((replace: boolean) => {
    const next = extractTree(source, options)
    if (!next.length) { flash('추출할 내용이 없어요. 본문을 더 넣어 보세요.'); return }
    if (!replace && tree.length) {
      setTree((prev) => [...prev, ...next])
    } else {
      setTree(next)
    }
    setSelectedId(null)
    cancelEdit()
    setView('tree')
    flash(`개요 ${countAll(next)}개 항목을 추출했어요. (제목 ${countHeadings(next)} · 주제문 ${countAll(next) - countHeadings(next)})`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, options, tree.length])

  // ── 편집 ──
  const beginEdit = (id: string) => {
    const n = findNode(tree, id)
    if (!n) return
    setSelectedId(id); setEditingId(id); setDraft(n.text)
  }
  const commitEdit = () => {
    if (!editingId) return
    const id = editingId
    const text = draft
    if (pendingNewId.current === id && text.trim() === '') {
      setTree((prev) => removeNode(prev, id).tree)
      if (selectedId === id) setSelectedId(null)
      pendingNewId.current = null; setEditingId(null); setDraft(''); return
    }
    pendingNewId.current = null
    setTree((prev) => mapNode(prev, id, (n) => ({ ...n, text })))
    setEditingId(null); setDraft('')
  }
  const cancelEdit = () => {
    const id = editingId
    if (id && pendingNewId.current === id && draft.trim() === '') {
      setTree((prev) => removeNode(prev, id).tree)
      if (selectedId === id) setSelectedId(null)
    }
    pendingNewId.current = null; setEditingId(null); setDraft('')
  }

  const mkManual = (text = '새 항목'): Node => ({
    id: newId(), text, kind: 'manual', level: 0, collapsed: false, included: true, children: [],
  })

  // ── 추가 ──
  const addRoot = () => {
    const node = mkManual()
    setTree((prev) => [...prev, node])
    setSelectedId(node.id); setEditingId(node.id); setDraft('새 항목'); pendingNewId.current = node.id
    setView('tree')
  }
  const addSibling = () => {
    if (!selectedId) { addRoot(); return }
    const loc = locate(tree, selectedId)
    if (!loc) { addRoot(); return }
    const node = mkManual()
    if (loc.parent === null) {
      setTree((prev) => { const next = [...prev]; next.splice(loc.index + 1, 0, node); return next })
    } else {
      const pid = loc.parent.id
      setTree((prev) => mapNode(prev, pid, (p) => {
        const kids = [...p.children]; const idx = kids.findIndex((c) => c.id === selectedId)
        kids.splice(idx + 1, 0, node); return { ...p, children: kids }
      }))
    }
    setSelectedId(node.id); setEditingId(node.id); setDraft('새 항목'); pendingNewId.current = node.id
  }
  const addChild = (target?: string) => {
    const pid = target ?? selectedId
    if (!pid) { addRoot(); return }
    const node = mkManual()
    setTree((prev) => mapNode(prev, pid, (p) => ({ ...p, collapsed: false, children: [...p.children, node] })))
    setSelectedId(node.id); setEditingId(node.id); setDraft('새 항목'); pendingNewId.current = node.id
  }

  // ── 삭제 ──
  const del = (id: string) => {
    const n = findNode(tree, id); if (!n) return
    const kid = countAll(n.children)
    const label = (n.text || '(빈 항목)').slice(0, 30)
    const msg = kid > 0 ? `'${label}' 항목과 하위 ${kid}개를 모두 삭제할까요?` : `'${label}' 항목을 삭제할까요?`
    if (!window.confirm(msg)) return
    setTree((prev) => removeNode(prev, id).tree)
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) cancelEdit()
  }

  // ── 포함/제외 ──
  const toggleInclude = (id: string) => setTree((prev) => mapNode(prev, id, (n) => ({ ...n, included: !n.included })))

  // ── 접기/펼치기 ──
  const toggleCollapse = (id: string) => setTree((prev) => mapNode(prev, id, (n) => ({ ...n, collapsed: !n.collapsed })))
  const setAllCollapsed = (v: boolean) => {
    const walk = (nodes: Node[]): Node[] => nodes.map((n) => ({
      ...n, collapsed: n.children.length ? v : n.collapsed, children: walk(n.children),
    }))
    setTree((prev) => walk(prev))
  }

  // ── 이동/들여·내어쓰기 ──
  const move = (id: string, dir: -1 | 1) => {
    const loc = locate(tree, id); if (!loc) return
    const { parent, index } = loc
    const target = index + dir
    const reorder = (arr: Node[]): Node[] => {
      if (target < 0 || target >= arr.length) return arr
      const next = [...arr]; const [it] = next.splice(index, 1); next.splice(target, 0, it); return next
    }
    if (parent === null) {
      setTree((prev) => { const r = reorder(prev); if (r === prev) flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return r })
    } else {
      setTree((prev) => mapNode(prev, parent.id, (p) => {
        const r = reorder(p.children)
        if (r === p.children) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return p }
        return { ...p, children: r }
      }))
    }
  }
  const indent = (id: string) => {
    const loc = locate(tree, id); if (!loc) return
    if (loc.index === 0) { flash('위에 형제 항목이 없어 들여쓸 수 없어요.'); return }
    const prevSiblingId = loc.siblings[loc.index - 1].id
    setTree((prev) => {
      const { tree: removedTree, removed } = removeNode(prev, id)
      if (!removed) return prev
      return mapNode(removedTree, prevSiblingId, (sib) => ({ ...sib, collapsed: false, children: [...sib.children, removed!] }))
    })
    setSelectedId(id)
  }
  const outdent = (id: string) => {
    const loc = locate(tree, id)
    if (!loc || loc.parent === null) { flash('더 내어쓸 수 없는 최상위 항목이에요.'); return }
    const parentId = loc.parent.id
    setTree((prev) => {
      const parentLoc = locate(prev, parentId); if (!parentLoc) return prev
      const { tree: removedTree, removed } = removeNode(prev, id); if (!removed) return prev
      if (parentLoc.parent === null) {
        const next = [...removedTree]; const pIdx = next.findIndex((c) => c.id === parentId)
        next.splice(pIdx + 1, 0, removed); return next
      }
      const gpId = parentLoc.parent.id
      return mapNode(removedTree, gpId, (gp) => {
        const kids = [...gp.children]; const pIdx = kids.findIndex((c) => c.id === parentId)
        kids.splice(pIdx + 1, 0, removed!); return { ...gp, children: kids }
      })
    })
    setSelectedId(id)
  }

  const clearAll = () => {
    if (!tree.length) return
    if (!window.confirm('개요 전체를 비울까요? 추출된 모든 항목이 삭제됩니다. (원문은 그대로 남습니다)')) return
    setTree([]); setSelectedId(null); cancelEdit()
  }

  // ── 바인더 문서 드롭 ──
  const onDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    dragDepth.current = 0; setDropHover(false)
    if (!it) return
    e.preventDefault()
    const body = (it.text || '').trim()
    if (!body && !it.title) { flash('끌어온 문서에서 본문을 찾지 못했어요.'); return }
    const titleLine = it.title ? it.title.trim() + '\n\n' : ''
    setSource((prev) => {
      const merged = (prev.trim() ? prev.trimEnd() + '\n\n' : '') + titleLine + body
      return merged
    })
    setView('source')
    flash(`「${it.title || '문서'}」 본문을 불러왔어요. "개요 추출"을 눌러 개요를 만드세요.`)
  }, [])
  const onDragOver = useCallback((e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }, [])
  const onDragEnter = useCallback((e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current += 1; setDropHover(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDropHover(false)
  }, [])

  // ── 내보내기 ──
  const exportText = useMemo(() => {
    if (exportMode === 'indent') return toIndentedText(tree)
    if (exportMode === 'md') return toMarkdown(tree)
    return toHtmlList(tree)
  }, [exportMode, tree])

  const copyExport = async () => {
    const text = exportText.trim()
    if (!text) { flash('내보낼 내용이 없어요.'); return }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
    } catch {
      flash('복사에 실패했어요. 아래 글상자에서 직접 선택해 복사하세요.')
    }
  }

  // ── 연계: 프로젝트 추가 ──
  const addOutlineToProject = () => {
    const inc = countIncluded(tree)
    if (!inc) { flash('포함된 개요 항목이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = toHtmlList(tree)
    if (!bodyHtml) { flash('내보낼 개요가 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요', title: '추출한 개요',
      bodyHtml,
      meta: { 항목수: String(inc), 제목수: String(countHeadings(tree)), 최대깊이: String(maxDepth(tree)) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── 연계: 주제문 수집함에 ──
  const stashTopics = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없는 환경이에요.'); return }
    const topics = collectTopics(tree)
    if (!topics.length) { flash('담을 주제문이 없어요.'); return }
    addToStash({ kind: 'note', label: `주제문 ${topics.length}개`, text: topics.map((t) => '• ' + t).join('\n') })
    flash(`주제문 ${topics.length}개를 수집함에 담았어요.`)
  }

  // ── 키보드 ──
  const onEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }
  const onRowKey = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (editingId) return
    if (e.key === 'Enter') { e.preventDefault(); beginEdit(id) }
    else if (e.key === 'Tab') { e.preventDefault(); if (e.shiftKey) outdent(id); else indent(id) }
    else if (e.key === 'Delete') { e.preventDefault(); del(id) }
    else if (e.key === ' ') { e.preventDefault(); toggleInclude(id) }
    else if ((e.altKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); move(id, -1) }
    else if ((e.altKey || e.metaKey) && e.key === 'ArrowDown') { e.preventDefault(); move(id, 1) }
  }

  const total = countAll(tree)
  const included = countIncluded(tree)
  const headings = countHeadings(tree)
  const depth = maxDepth(tree)
  const selNode = selectedId ? findNode(tree, selectedId) : null

  // ── 스타일 ─────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const toolbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const sep: React.CSSProperties = { width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '2px 4px' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 8px 14px' }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--accent-2)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', fontSize: 12, color: 'var(--muted)' }
  const tab = (active: boolean): React.CSSProperties => ({
    border: '1px solid var(--border)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 13,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })

  const wrapStyle: React.CSSProperties = dropHover
    ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4, background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }
    : wrap

  return (
    <div style={wrapStyle} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* 상단 탭/도구 */}
      <div style={toolbar}>
        <button style={tab(view === 'source')} onClick={() => setView('source')} title="원문 입력"><Emoji e="📝"/> 원문</button>
        <button style={tab(view === 'tree')} onClick={() => setView('tree')} title="개요 트리"><Emoji e="🌳"/> 개요{total ? ` (${total})` : ''}</button>
        <div style={sep} />
        {view === 'source' ? (
          <>
            <button className="btn-primary" onClick={() => runExtract(true)} disabled={!source.trim()} title="원문에서 개요를 추출(기존 개요 대체)"><Emoji e="🪄"/> 개요 추출</button>
            <button className="minibtn" onClick={() => runExtract(false)} disabled={!source.trim() || !total} title="추출 결과를 기존 개요 뒤에 이어 붙이기">＋ 이어붙이기</button>
            <button className="minibtn" onClick={() => setShowOpts((v) => !v)} title="추출 옵션">⚙ 옵션</button>
            <div style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => { setSource(SAMPLE); flash('예시 원고를 채웠어요.') }} title="예시 원고 채우기">예시</button>
            <button className="minibtn" onClick={() => { if (source && window.confirm('원문을 비울까요?')) setSource('') }} disabled={!source} title="원문 비우기">비우기</button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={addRoot} title="최상위 항목 추가">＋ 항목</button>
            <button className="minibtn" onClick={addSibling} disabled={!selectedId} title="형제 추가">＋ 형제</button>
            <button className="minibtn" onClick={() => addChild()} disabled={!selectedId} title="자식 추가">↳ 자식</button>
            <div style={sep} />
            <button className="minibtn" onClick={() => selectedId && move(selectedId, -1)} disabled={!selectedId} title="위로 (Alt+↑)">↑</button>
            <button className="minibtn" onClick={() => selectedId && move(selectedId, 1)} disabled={!selectedId} title="아래로 (Alt+↓)">↓</button>
            <button className="minibtn" onClick={() => selectedId && outdent(selectedId)} disabled={!selectedId} title="내어쓰기 (Shift+Tab)">⇤</button>
            <button className="minibtn" onClick={() => selectedId && indent(selectedId)} disabled={!selectedId} title="들여쓰기 (Tab)">⇥</button>
            <div style={sep} />
            <button className="minibtn" onClick={() => setAllCollapsed(true)} disabled={!total} title="모두 접기">⊟</button>
            <button className="minibtn" onClick={() => setAllCollapsed(false)} disabled={!total} title="모두 펼치기">⊞</button>
            <div style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setShowExport((v) => !v)} disabled={!total} title="내보내기">⬆ 내보내기</button>
          </>
        )}
      </div>

      {note && <div style={noteBar}>{note}</div>}

      {/* 옵션 패널 */}
      {showOpts && view === 'source' && (
        <OptionsPanel options={options} setOptions={setOptions} onClose={() => setShowOpts(false)} />
      )}

      {/* 본문 */}
      {view === 'source' ? (
        <SourcePanel
          source={source}
          setSource={setSource}
          stats={sourceStats}
          canDropHint={hasProjectBridge}
        />
      ) : (
        <div style={body}>
          {total === 0 ? (
            <EmptyState onExtract={() => setView('source')} onAdd={addRoot} />
          ) : (
            <div>
              {tree.map((n, i) => (
                <Row
                  key={n.id}
                  node={n}
                  depth={0}
                  index={i}
                  count={tree.length}
                  selectedId={selectedId}
                  editingId={editingId}
                  draft={draft}
                  editRef={editRef}
                  onSelect={(id) => { setSelectedId(id); if (editingId && editingId !== id) commitEdit() }}
                  onBeginEdit={beginEdit}
                  onDraft={setDraft}
                  onCommit={commitEdit}
                  onEditKey={onEditKey}
                  onRowKey={onRowKey}
                  onToggle={toggleCollapse}
                  onToggleInclude={toggleInclude}
                  onMove={move}
                  onIndent={indent}
                  onOutdent={outdent}
                  onAddChild={(id) => addChild(id)}
                  onDelete={del}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 내보내기 패널 */}
      {showExport && total > 0 && view === 'tree' && (
        <ExportPanel
          mode={exportMode} setMode={setExportMode} text={exportText}
          copied={copied} onCopy={copyExport} onClose={() => setShowExport(false)}
        />
      )}

      {/* 연계 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn" onClick={addOutlineToProject}
          disabled={!included || !hasProjectBridge()}
          title={hasProjectBridge() ? '계층 개요를 프로젝트 원고 "개요" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button
          className="linkbtn" onClick={stashTopics}
          disabled={!total || !hasStash()}
          title={hasStash() ? '추출한 주제문들을 수집함에 메모로 담기' : '수집함을 사용할 수 없는 환경입니다'}
        ><Emoji e="📌"/> 주제문 수집함에</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>좌측 바인더 문서를 끌어다 놓으면 본문을 불러옵니다</span>
      </div>

      {/* 푸터 */}
      <div style={footer}>
        <span>
          {view === 'source'
            ? <>원문 <strong style={{ color: 'var(--text)' }}>{sourceStats.total.toLocaleString()}</strong>자 · 문단 <strong style={{ color: 'var(--text)' }}>{sourceStats.paras}</strong></>
            : <>항목 <strong style={{ color: 'var(--text)' }}>{total}</strong> · 포함 <strong style={{ color: 'var(--text)' }}>{included}</strong> · 제목 <strong style={{ color: 'var(--text)' }}>{headings}</strong> · 깊이 <strong style={{ color: 'var(--text)' }}>{depth}</strong>{selNode && <> · 선택 <span style={{ color: 'var(--accent)' }}>{(selNode.text || '(빈 항목)').slice(0, 18)}</span></>}</>
          }
        </span>
        {view === 'tree' && <button className="minibtn" onClick={clearAll} disabled={!total} title="개요 전체 비우기">개요 비우기</button>}
      </div>
    </div>
  )
}

// ── 원문 패널 ─────────────────────────────────────────────
function SourcePanel(props: {
  source: string
  setSource: (s: string) => void
  stats: { chars: number; paras: number; total: number }
  canDropHint: () => boolean
}) {
  const { source, setSource } = props
  const area: React.CSSProperties = {
    flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', resize: 'none', padding: '12px 14px',
    fontSize: 14, lineHeight: 1.7, border: 'none', outline: 'none', background: 'var(--paper)', color: 'var(--text)',
    fontFamily: 'inherit',
  }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <textarea
        style={area}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder={'여기에 긴 원고를 붙여넣으세요. (빈 줄로 문단을 나누면 더 정확합니다)\n\n위의 "🪄 개요 추출"을 누르면\n· 마크다운(#)·번호(1. / 제1장 / 1.2)·짧은 제목 줄을 제목으로\n· 각 문단의 핵심 한 문장(주제문)을\n자동으로 골라 계층 개요로 만들어 드려요.\n\n좌측 바인더의 문서를 이 창으로 끌어다 놓아도 됩니다.'}
        aria-label="원고 입력"
        spellCheck={false}
      />
    </div>
  )
}

// ── 빈 상태 ─────────────────────────────────────────────
function EmptyState(props: { onExtract: () => void; onAdd: () => void }) {
  const box: React.CSSProperties = {
    height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, gap: 14, padding: 24,
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 44 }}><Emoji e="🪄"/></div>
      <div>아직 추출된 개요가 없어요.<br /><strong><Emoji e="📝"/> 원문</strong> 탭에 원고를 넣고 <strong><Emoji e="🪄"/> 개요 추출</strong>을 눌러 보세요.<br />좌측 바인더 문서를 끌어다 놓아도 됩니다.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={props.onExtract}><Emoji e="📝"/> 원문 입력하기</button>
        <button className="minibtn" onClick={props.onAdd}>＋ 직접 항목 만들기</button>
      </div>
    </div>
  )
}

// ── 옵션 패널 ─────────────────────────────────────────────
function OptionsPanel(props: { options: Options; setOptions: (o: Options) => void; onClose: () => void }) {
  const { options: o, setOptions } = props
  const set = (patch: Partial<Options>) => setOptions({ ...o, ...patch })
  const panel: React.CSSProperties = { borderBottom: '1px solid var(--border)', background: 'var(--paper)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }
  const lbl: React.CSSProperties = { minWidth: 96, color: 'var(--muted)', fontSize: 12.5 }
  const seg = (active: boolean): React.CSSProperties => ({
    border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12.5,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>추출 옵션</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={props.onClose}>닫기</button>
      </div>

      <div style={row}>
        <span style={lbl}>주제문 선택</span>
        <button style={seg(o.topicMode === 'best')} onClick={() => set({ topicMode: 'best' })} title="위치·단서어·길이를 종합한 핵심 문장">스마트</button>
        <button style={seg(o.topicMode === 'first')} onClick={() => set({ topicMode: 'first' })} title="문단의 첫 문장">첫 문장</button>
        <button style={seg(o.topicMode === 'firstlast')} onClick={() => set({ topicMode: 'firstlast' })} title="첫 문장 + 끝 문장">첫＋끝</button>
      </div>

      <div style={row}>
        <span style={lbl}>구조</span>
        <button style={seg(o.groupBy === 'heading')} onClick={() => set({ groupBy: 'heading' })} title="감지한 제목 아래로 문단을 묶음">제목 기준 트리</button>
        <button style={seg(o.groupBy === 'flat')} onClick={() => set({ groupBy: 'flat' })} title="문단 순서 그대로 평면 목록">평면 목록</button>
      </div>

      <div style={row}>
        <span style={lbl}>주제문 길이</span>
        <input type="range" min={40} max={160} step={5} value={o.maxTopicLen} onChange={(e) => set({ maxTopicLen: Number(e.target.value) })} style={{ flex: 1, minWidth: 120, accentColor: 'var(--accent)' }} />
        <span style={{ width: 56, textAlign: 'right', color: 'var(--text)' }}>{o.maxTopicLen}자</span>
      </div>

      <div style={row}>
        <span style={lbl}>제목 판정 길이</span>
        <input type="range" min={8} max={40} step={1} value={o.minParaLen} onChange={(e) => set({ minParaLen: Number(e.target.value) })} style={{ flex: 1, minWidth: 120, accentColor: 'var(--accent)' }} />
        <span style={{ width: 56, textAlign: 'right', color: 'var(--text)' }}>{o.minParaLen}자</span>
      </div>

      <label style={{ ...row, cursor: 'pointer' }}>
        <input type="checkbox" checked={o.dropShort} onChange={(e) => set({ dropShort: e.target.checked })} style={{ accentColor: 'var(--accent)' }} />
        <span>너무 짧은 잡음 문단은 건너뛰기</span>
      </label>
    </div>
  )
}

// ── 내보내기 패널 ─────────────────────────────────────────────
function ExportPanel(props: {
  mode: 'indent' | 'md' | 'html'
  setMode: (m: 'indent' | 'md' | 'html') => void
  text: string; copied: boolean; onCopy: () => void; onClose: () => void
}) {
  const { mode, setMode, text, copied } = props
  const panel: React.CSSProperties = { borderTop: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46%' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 13,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const area: React.CSSProperties = {
    flex: 1, minHeight: 90, resize: 'none', width: '100%', boxSizing: 'border-box', padding: 10, fontSize: 13,
    lineHeight: 1.55, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)',
    color: 'var(--text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre', overflow: 'auto',
  }
  return (
    <div style={panel}>
      <div style={head}>
        <strong style={{ fontSize: 13, color: 'var(--text)' }}>내보내기</strong>
        <button style={tabBtn(mode === 'indent')} onClick={() => setMode('indent')}>들여쓴 텍스트</button>
        <button style={tabBtn(mode === 'md')} onClick={() => setMode('md')}>마크다운</button>
        <button style={tabBtn(mode === 'html')} onClick={() => setMode('html')}>HTML 목록</button>
        <div style={{ flex: 1 }} />
        <button className="btn-primary" onClick={props.onCopy}>{copied ? '복사됨 ✓' : '복사'}</button>
        <button className="minibtn" onClick={props.onClose}>닫기</button>
      </div>
      <textarea style={area} value={text.trimEnd()} readOnly aria-label="내보내기 결과" onFocus={(e) => e.currentTarget.select()} />
    </div>
  )
}

// ── 트리 행(재귀) ─────────────────────────────────────────────
interface RowProps {
  node: Node
  depth: number
  index: number
  count: number
  selectedId: string | null
  editingId: string | null
  draft: string
  editRef: React.RefObject<HTMLTextAreaElement>
  onSelect: (id: string) => void
  onBeginEdit: (id: string) => void
  onDraft: (s: string) => void
  onCommit: () => void
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onRowKey: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void
  onToggle: (id: string) => void
  onToggleInclude: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onIndent: (id: string) => void
  onOutdent: (id: string) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

function Row(props: RowProps) {
  const { node, depth, index, count, selectedId, editingId } = props
  const selected = selectedId === node.id
  const editing = editingId === node.id
  const hasKids = node.children.length > 0
  const isHeading = node.kind === 'heading'
  const [hover, setHover] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const indentPx = 12 + depth * 20
  const dim = !node.included

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 4, padding: '5px 8px 5px 0', paddingLeft: indentPx,
    borderRadius: 8,
    background: selected ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : hover ? 'var(--chrome-2)' : 'transparent',
    border: selected ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : '1px solid transparent',
    cursor: 'default', outline: 'none', transition: 'background 0.12s', opacity: dim ? 0.45 : 1,
  }
  const caret: React.CSSProperties = {
    flexShrink: 0, width: 18, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: hasKids ? 'pointer' : 'default', color: 'var(--muted)', fontSize: 11, userSelect: 'none',
    transform: node.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.12s',
  }
  const badge: React.CSSProperties = {
    flexShrink: 0, alignSelf: 'center', fontSize: 9.5, padding: '1px 5px', borderRadius: 5, userSelect: 'none',
    background: isHeading ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'var(--chrome-2)',
    color: isHeading ? 'var(--accent-2)' : 'var(--muted)',
    border: '1px solid var(--border)', marginRight: 2, whiteSpace: 'nowrap',
  }
  const label: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: isHeading ? 14.5 : 13.5, lineHeight: 1.5, padding: '2px 2px',
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
    color: node.text ? 'var(--text)' : 'var(--muted)', fontStyle: node.text ? 'normal' : 'italic',
    fontWeight: isHeading ? 700 : 400, textDecoration: dim ? 'line-through' : 'none',
  }
  const editBox: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5, padding: '2px 6px', resize: 'none', overflow: 'hidden',
    border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--paper)', color: 'var(--text)',
    font: 'inherit', boxSizing: 'border-box',
  }
  const actions: React.CSSProperties = { flexShrink: 0, display: 'flex', gap: 2, alignItems: 'center', opacity: hover || selected ? 1 : 0, transition: 'opacity 0.12s' }
  const act: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '3px 4px', borderRadius: 5 }
  const detailBox: React.CSSProperties = {
    marginLeft: indentPx + 22, marginRight: 8, marginBottom: 4, padding: '7px 10px', fontSize: 12, lineHeight: 1.6,
    color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, whiteSpace: 'pre-wrap',
  }

  const onTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
    props.onDraft(el.value)
  }

  return (
    <div>
      <div
        style={rowStyle}
        tabIndex={0}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => props.onSelect(node.id)}
        onKeyDown={(e) => props.onRowKey(e, node.id)}
        role="treeitem"
        aria-expanded={hasKids ? !node.collapsed : undefined}
        aria-selected={selected}
      >
        <span style={caret} onClick={(e) => { e.stopPropagation(); if (hasKids) props.onToggle(node.id) }} title={hasKids ? (node.collapsed ? '펼치기' : '접기') : ''}>{hasKids ? '▶' : ''}</span>
        <input
          type="checkbox"
          checked={node.included}
          onChange={(e) => { e.stopPropagation(); props.onToggleInclude(node.id) }}
          onClick={(e) => e.stopPropagation()}
          title={node.included ? '내보내기에서 제외 (Space)' : '내보내기에 포함 (Space)'}
          style={{ flexShrink: 0, alignSelf: 'center', accentColor: 'var(--accent)', cursor: 'pointer' }}
          aria-label="개요에 포함"
        />
        <span style={badge}>{isHeading ? '제목' : node.kind === 'manual' ? '직접' : '주제'}</span>

        {editing ? (
          <textarea
            ref={props.editRef}
            style={editBox}
            value={props.draft}
            rows={1}
            onChange={onTextareaInput}
            onInput={onTextareaInput}
            onKeyDown={props.onEditKey}
            onBlur={props.onCommit}
            onClick={(e) => e.stopPropagation()}
            placeholder="항목 내용 (Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소)"
            aria-label="항목 편집"
          />
        ) : (
          <span style={label} onDoubleClick={(e) => { e.stopPropagation(); props.onBeginEdit(node.id) }} title="더블클릭하여 편집">
            {node.text || '(빈 항목 — 더블클릭하여 입력)'}
          </span>
        )}

        {!editing && (
          <span style={actions} onClick={(e) => e.stopPropagation()}>
            {node.detail && (
              <button style={act} className="minibtn" title={showDetail ? '원문 미리보기 숨기기' : '원문 미리보기'} onClick={() => setShowDetail((v) => !v)}>{showDetail ? <Emoji e="🔽"/> : <Emoji e="📄"/>}</button>
            )}
            <button style={act} className="minibtn" title="편집" onClick={() => props.onBeginEdit(node.id)}><Emoji e="✏️"/></button>
            <button style={act} className="minibtn" title="자식 추가" onClick={() => props.onAddChild(node.id)}>↳</button>
            <button style={act} className="minibtn" title="위로 이동" onClick={() => props.onMove(node.id, -1)} disabled={index === 0}>↑</button>
            <button style={act} className="minibtn" title="아래로 이동" onClick={() => props.onMove(node.id, 1)} disabled={index === count - 1}>↓</button>
            <button style={act} className="minibtn" title="내어쓰기" onClick={() => props.onOutdent(node.id)} disabled={depth === 0}>⇤</button>
            <button style={act} className="minibtn" title="들여쓰기" onClick={() => props.onIndent(node.id)} disabled={index === 0}>⇥</button>
            <button style={act} className="minibtn" title="삭제" onClick={() => props.onDelete(node.id)}><Emoji e="🗑️"/></button>
          </span>
        )}
      </div>

      {showDetail && node.detail && !editing && (
        <div style={detailBox}>{node.detail}</div>
      )}

      {hasKids && !node.collapsed && (
        <div>
          {node.children.map((c, i) => (
            <Row {...props} key={c.id} node={c} depth={depth + 1} index={i} count={node.children.length} />
          ))}
        </div>
      )}
    </div>
  )
}
