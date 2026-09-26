// 단어 구름(워드클라우드) 시각화 — 본문을 붙여넣으면 단어 빈도를 계산해
// 빈도가 높을수록 큰 글씨/짙은 색으로 캔버스에 배치한다(겹침 회피 나선 배치).
// 불용어(조사·접속어 등) 제외 토글, 상위 N 조절, 단어 클릭 시 빈도·순위 표시,
// PNG 이미지로 저장(canvas → toDataURL → 다운로드). 좌측 바인더 파일 드롭 수용.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·미디어 불필요(100% 로컬).
// 색은 모두 코드로 생성(HSL), 외부 이미지/폰트 미사용 → 저작권 안전. 언마운트 정리(rAF/리스너).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getDragItem, isItemDrag, addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = {
  id: 'word-cloud-viz',
  name: '단어 구름',
  icon: '☁️',
  group: '분위기·시각',
  intro: '본문을 붙여넣으면 자주 쓴 단어를 크기·색으로 워드클라우드로 그려 줍니다 (PNG 저장)',
  w: 640,
  h: 720,
}

const LS_KEY = 'sry:tool:word-cloud-viz'

// ── 불용어(stopword): 단독 토큰으로 흔히 떨어지는 조사·접속·지시·대명사 등 의미 약한 기능어 ──
const STOPWORDS = new Set<string>([
  // 조사/보조사
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '에게', '께', '한테', '으로', '로',
  '와', '과', '도', '만', '까지', '부터', '보다', '처럼', '같이', '마다', '조차', '마저', '밖에',
  '이나', '나', '이라도', '라도', '든지', '든', '이며', '며', '하고', '랑', '이랑', '에는', '에도',
  // 접속/부사
  '그리고', '그러나', '그런데', '그래서', '하지만', '또', '또한', '즉', '및', '혹은', '또는',
  '따라서', '그러므로', '그러면', '그럼', '한편', '게다가', '더욱이', '아울러', '왜냐하면',
  // 지시/대명사/의존명사
  '이것', '그것', '저것', '이런', '그런', '저런', '이렇게', '그렇게', '저렇게',
  '여기', '거기', '저기', '이때', '그때', '나', '너', '우리', '저희', '그', '그녀', '것', '수', '때', '등',
  // 빈출 기능어/감탄
  '좀', '잘', '더', '못', '안', '아주', '매우', '너무', '정말', '진짜', '그냥', '약간',
  '뭐', '왜', '어디', '누가', '무슨', '어떤', '어느', '아', '음', '응', '네', '예', '아니',
  // 영어 흔한 불용어
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'them', 'his', 'her', 'their', 'my', 'your',
  'so', 'not', 'no', 'do', 'did', 'does', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'from', 'up', 'out', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'into', 'over',
])

// 한국어 어절 끝에 자주 붙는 조사·어미 후보(긴 것부터). 어간이 1글자 이상 남을 때만 제거.
const KO_SUFFIXES = [
  '으로부터', '에게서', '으로서', '으로써', '이라고', '라고', '에서는', '에서도', '에게는',
  '까지', '부터', '에게', '에서', '으로', '이라', '이며', '이고', '한테', '처럼', '같이',
  '마다', '조차', '마저', '밖에', '이나', '이란', '이든', '에는', '에도', '에만',
  '은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도', '만', '로', '나', '며',
]

// 색 팔레트(테마 6종) — 전부 HSL 코드 생성. 0=1위(가장 진함) … 1=꼬리(연함)
type Palette = (t: number) => string
const PALETTES: Record<string, { name: string; fn: Palette }> = {
  ocean: { name: '바다', fn: (t) => `hsl(${205 - t * 35}, ${72 - t * 28}%, ${42 + t * 26}%)` },
  ember: { name: '노을', fn: (t) => `hsl(${18 + t * 28}, ${82 - t * 22}%, ${48 + t * 22}%)` },
  forest: { name: '숲', fn: (t) => `hsl(${145 - t * 50}, ${55 - t * 20}%, ${38 + t * 26}%)` },
  grape: { name: '포도', fn: (t) => `hsl(${275 - t * 40}, ${58 - t * 22}%, ${48 + t * 22}%)` },
  rainbow: { name: '무지개', fn: (t) => `hsl(${t * 320}, 68%, ${50 + t * 8}%)` },
  mono: { name: '먹', fn: (t) => `hsl(220, 8%, ${22 + t * 46}%)` },
}
type PaletteKey = keyof typeof PALETTES

interface WordCount { word: string; count: number }

interface Placed extends WordCount {
  rank: number          // 0-based 순위
  x: number; y: number  // 중심 좌표(레이아웃 좌표계, 0~W / 0~H)
  fontSize: number
  rot: boolean          // 세로(90°) 배치 여부
  color: string
  w: number; h: number  // 바운딩 박스(px)
}

interface Settings {
  excludeStop: boolean
  stripJosa: boolean
  topN: number
  palette: PaletteKey
  allowRotate: boolean
}

const DEFAULT_SETTINGS: Settings = {
  excludeStop: true,
  stripJosa: true,
  topN: 80,
  palette: 'ocean',
  allowRotate: true,
}

const SAMPLE = '바다는 매일 다른 얼굴을 보여 준다. 어떤 날의 바다는 잔잔하고, 어떤 날의 바다는 거칠다. 나는 바다를 보며 마음을 가다듬는다. 파도가 밀려오고 또 밀려간다. 그 반복 속에서 나는 작은 위안을 얻는다. 바다 위로 갈매기가 날고, 멀리 배 한 척이 수평선을 향해 나아간다. 바람이 분다. 바람은 소금 냄새를 싣고 온다. 나는 바다 앞에서 오래 머물렀다. 바다는 말이 없지만 모든 것을 듣는 것 같았다. 다시 파도가 밀려온다. 다시 또 바다가 출렁인다.'

// ── 토큰화 / 정규화 ──────────────────────────────────────────
function tokenize(text: string): string[] {
  if (!text) return []
  const m = text.match(/[가-힣]+|[A-Za-z][A-Za-z'’-]*|[0-9]+/g)
  return m ? m : []
}
function normalizeKo(tok: string): string {
  if (!/[가-힣]/.test(tok)) return tok
  if (tok.length <= 1) return tok
  for (const suf of KO_SUFFIXES) {
    if (tok.length > suf.length && tok.endsWith(suf)) return tok.slice(0, tok.length - suf.length)
  }
  return tok
}

function countWords(text: string, opts: Settings): { list: WordCount[]; totalTokens: number; uniqueCount: number } {
  const tokens = tokenize(text)
  const map = new Map<string, number>()
  let total = 0
  for (const raw of tokens) {
    const w0 = opts.stripJosa ? normalizeKo(raw) : raw
    const cmp = /[A-Za-z]/.test(w0) && !/[가-힣]/.test(w0) ? w0.toLowerCase() : w0
    if (!cmp) continue
    if (cmp.length < 1) continue
    // 한 글자 한글/영문은 의미가 약해 제외(숫자도). 단, 빈도 집계 자체는 의미 있는 낱말 위주로.
    if (cmp.length < 2 && !/^[가-힣]{2,}$/.test(cmp)) {
      if (cmp.length < 2) continue
    }
    if (opts.excludeStop && STOPWORDS.has(cmp)) continue
    map.set(cmp, (map.get(cmp) || 0) + 1)
    total++
  }
  const list = [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
  return { list, totalTokens: total, uniqueCount: map.size }
}

// 레이아웃 캔버스 논리 크기(고정) — 표시 시 컨테이너에 맞춰 스케일
const LAY_W = 760
const LAY_H = 460

// 두 사각형(중심+크기) 겹침 여부 + 여백
function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  pad: number,
): boolean {
  return Math.abs(ax - bx) * 2 < aw + bw + pad * 2 && Math.abs(ay - by) * 2 < ah + bh + pad * 2
}

// 나선 배치: 빈도 큰 단어부터 중앙에서 시작해 점점 바깥으로 후보 위치를 탐색,
// 기존 배치/경계와 안 겹치는 자리를 찾는다(아르키메데스 나선).
function layout(
  list: WordCount[],
  measure: (text: string, fontSize: number) => { w: number; h: number },
  paletteFn: Palette,
  allowRotate: boolean,
): Placed[] {
  if (list.length === 0) return []
  const maxCount = list[0].count
  const minCount = list[list.length - 1].count || 1
  const span = Math.max(1, maxCount - minCount)

  // 폰트 크기 매핑: 빈도(제곱근 스케일)로 12~92px
  const MIN_FS = 13
  const MAX_FS = 84
  const fontFor = (count: number) => {
    const t = (count - minCount) / span // 0..1
    const s = Math.sqrt(t)              // 큰 차이 완화
    return Math.round(MIN_FS + s * (MAX_FS - MIN_FS))
  }

  const placed: Placed[] = []
  const cx = LAY_W / 2
  const cy = LAY_H / 2

  list.forEach((wc, i) => {
    const fontSize = fontFor(wc.count)
    // 1위 절반쯤마다 가끔 세로 회전(다양성). 큰 글씨는 가로 우선.
    const rot = allowRotate && i > 2 && i % 5 === 0
    const m = measure(wc.word, fontSize)
    let bw = m.w
    let bh = m.h
    if (rot) { const t = bw; bw = bh; bh = t }

    const color = paletteFn(list.length > 1 ? i / (list.length - 1) : 0)

    // 나선 탐색
    let placedOk = false
    let px = cx, py = cy
    const step = 4.2
    const maxAngle = 60 * Math.PI * 2 // 충분한 회전 수
    for (let a = 0; a < maxAngle; a += 0.28) {
      const r = step * a / (Math.PI * 2) * 6 // 반경 점증
      px = cx + r * Math.cos(a) * 1.5        // 가로로 살짝 늘려 자연스러운 분포
      py = cy + r * Math.sin(a)
      // 경계 안에 들어오는지
      if (px - bw / 2 < 4 || px + bw / 2 > LAY_W - 4 || py - bh / 2 < 4 || py + bh / 2 > LAY_H - 4) continue
      let hit = false
      for (const p of placed) {
        if (overlaps(px, py, bw, bh, p.x, p.y, p.w, p.h, 3)) { hit = true; break }
      }
      if (!hit) { placedOk = true; break }
    }
    if (!placedOk) return // 자리 못 찾으면 생략(겹침 회피 우선)
    placed.push({ ...wc, rank: i, x: px, y: py, fontSize, rot, color, w: bw, h: bh })
  })

  return placed
}

export default function WordCloudViz({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [selected, setSelected] = useState<Placed | null>(null)
  const [dragHover, setDragHover] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [seed, setSeed] = useState(0) // 재배치 트리거(레이아웃은 결정적이나 리렌더 강제용)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const placedRef = useRef<Placed[]>([])
  const rafRef = useRef<number | null>(null)
  const msgTimer = useRef<number | null>(null)

  // payload.text 로 초기 본문 주입(연계 열기)
  useEffect(() => {
    if (payload && typeof payload.text === 'string' && payload.text.trim()) {
      setText(payload.text as string)
    }
  }, [payload])

  // 설정 영속 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Partial<Settings>
        setSettings((s) => ({ ...s, ...p }))
      }
    } catch { /* noop */ }
  }, [])

  // 설정 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(settings)) } catch { /* noop */ }
  }, [settings])

  // 언마운트 정리
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    if (msgTimer.current != null) clearTimeout(msgTimer.current)
  }, [])

  const counted = useMemo(() => {
    const t = text.trim()
    if (!t) return { list: [], totalTokens: 0, uniqueCount: 0 }
    try { return countWords(t, settings) } catch { return { list: [], totalTokens: 0, uniqueCount: 0 } }
  }, [text, settings])

  const topList = useMemo(() => counted.list.slice(0, Math.max(5, settings.topN)), [counted.list, settings.topN])

  // 텍스트 측정용 오프스크린 컨텍스트(폰트 메트릭)
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const getMeasureCtx = useCallback(() => {
    if (!measureCtxRef.current) {
      const c = document.createElement('canvas')
      measureCtxRef.current = c.getContext('2d')
    }
    return measureCtxRef.current
  }, [])

  // 레이아웃 계산(단어/설정 변경 시)
  const placed = useMemo(() => {
    const ctx = getMeasureCtx()
    if (!ctx || topList.length === 0) return []
    const measure = (txt: string, fs: number) => {
      ctx.font = `700 ${fs}px "Pretendard", "Noto Sans KR", system-ui, sans-serif`
      const m = ctx.measureText(txt)
      const w = Math.ceil(m.width) + 6
      const h = Math.ceil(fs * 1.18)
      return { w, h }
    }
    return layout(topList, measure, PALETTES[settings.palette].fn, settings.allowRotate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topList, settings.palette, settings.allowRotate, seed, getMeasureCtx])

  // 선택 단어가 새 레이아웃에서 사라지면 해제
  useEffect(() => {
    placedRef.current = placed
    if (selected && !placed.some((p) => p.word === selected.word)) setSelected(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  // 캔버스 렌더(고해상도 대응 + 배경 + 단어 그리기)
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2.5, window.devicePixelRatio || 1)
    // 표시 폭에 맞춰 논리 크기 유지
    const cssW = canvas.clientWidth || LAY_W
    const cssH = Math.round(cssW * (LAY_H / LAY_W))
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.height = cssH + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const sx = cssW / LAY_W
    const sy = cssH / LAY_H

    // 배경(테마 종이색) — getComputedStyle 로 CSS 변수 읽어 PNG에도 반영
    let paper = '#ffffff'
    try {
      const v = getComputedStyle(canvas).getPropertyValue('--paper').trim()
      if (v) paper = v
    } catch { /* noop */ }
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, cssW, cssH)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const p of placed) {
      ctx.save()
      ctx.translate(p.x * sx, p.y * sy)
      if (p.rot) ctx.rotate(-Math.PI / 2)
      const fs = p.fontSize * Math.min(sx, sy)
      ctx.font = `700 ${fs}px "Pretendard", "Noto Sans KR", system-ui, sans-serif`
      // 선택 강조: 외곽선
      if (selected && selected.word === p.word) {
        ctx.lineWidth = Math.max(2, fs * 0.06)
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.strokeText(p.word, 0, 0)
      }
      ctx.fillStyle = p.color
      ctx.fillText(p.word, 0, 0)
      ctx.restore()
    }
  }, [placed, selected])

  // 렌더 스케줄(rAF) — placed/selected/seed/사이즈 변동 시
  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => { draw() })
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [draw])

  // 컨테이너 리사이즈 시 재그리기
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => draw())
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [draw])

  // 캔버스 클릭 → 좌표를 레이아웃 좌표로 환산해 가장 가까운(포함하는) 단어 선택
  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height || cssW * (LAY_H / LAY_W)
    const lx = ((e.clientX - rect.left) / cssW) * LAY_W
    const ly = ((e.clientY - rect.top) / cssH) * LAY_H
    let hit: Placed | null = null
    // 위에서 그린 순(빈도 높은 게 먼저) — 역순으로 보면 위쪽(작은 글씨)부터, 하지만 큰 글씨 우선이 자연스러움
    for (const p of placed) {
      if (Math.abs(p.x - lx) <= p.w / 2 && Math.abs(p.y - ly) <= p.h / 2) { hit = p; break }
    }
    setSelected(hit)
  }

  const flashMsg = (m: string) => {
    setSavedMsg(m)
    if (msgTimer.current != null) clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => setSavedMsg(''), 1800)
  }

  // PNG 저장: 표시 캔버스를 그대로 toDataURL → 다운로드(고해상도 dpr 반영됨)
  const savePng = () => {
    const canvas = canvasRef.current
    if (!canvas || placed.length === 0) return
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.download = `wordcloud-${stamp}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      flashMsg('PNG 저장됨 ✓')
    } catch {
      flashMsg('저장 실패(브라우저 제한)')
    }
  }

  // 결과 텍스트(상위 단어 목록) — 프로젝트/수집함 연계용
  const resultText = useMemo(() => {
    if (placed.length === 0) return ''
    const lines: string[] = []
    lines.push('[단어 구름 — 상위 ' + placed.length + '개 단어]')
    lines.push('집계 단어 ' + counted.totalTokens + '개 · 고유 ' + counted.uniqueCount + '종' + (settings.excludeStop ? ' · 불용어 제외' : ''))
    placed.slice().sort((a, b) => a.rank - b.rank).forEach((p) => {
      lines.push((p.rank + 1) + '. ' + p.word + ' — ' + p.count + '회')
    })
    return lines.join('\n')
  }, [placed, counted, settings.excludeStop])

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProj = () => {
    if (!hasProjectBridge() || placed.length === 0) return
    const sorted = placed.slice().sort((a, b) => a.rank - b.rank)
    const rows = sorted.map((p) => `<li>${escapeHtml(p.word)} — ${p.count}회</li>`).join('')
    const html = `<h3>단어 구름 — 상위 ${placed.length}개</h3><p>집계 단어 ${counted.totalTokens}개 · 고유 ${counted.uniqueCount}종${settings.excludeStop ? ' · 불용어 제외' : ''}</p><ol>${rows}</ol>`
    addToProject({ root: 'research', folder: '분석', title: '단어 구름 (상위 ' + placed.length + ')', bodyHtml: html })
    flashMsg('프로젝트에 추가됨 ✓')
  }

  const addToStashMemo = () => {
    if (!hasStash() || !resultText) return
    addToStash({ kind: 'memo', label: '단어 구름 상위 단어', text: resultText })
    flashMsg('수집함에 담음 ✓')
  }

  // ── 드롭(좌측 바인더 파일) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragHover(false)
    const item = getDragItem(e)
    if (item && item.text) {
      setText(item.text)
      return
    }
    // 일반 텍스트/파일 드롭도 허용
    try {
      const t = e.dataTransfer.getData('text/plain')
      if (t && t.trim()) { setText(t); return }
    } catch { /* noop */ }
    const file = e.dataTransfer.files && e.dataTransfer.files[0]
    if (file && /text|json|md|rtf/.test(file.type) || (file && /\.(txt|md|rtf|json)$/i.test(file.name))) {
      const reader = new FileReader()
      reader.onload = () => { if (typeof reader.result === 'string') setText(reader.result) }
      reader.readAsText(file)
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) {
      e.preventDefault()
      setDragHover(true)
    }
  }
  const onDragLeave = () => setDragHover(false)

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }))

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 80, maxHeight: 140, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: `1px solid ${dragHover ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
    transition: 'border-color .15s',
  }
  const ctrlRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const toggle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const pill = (active: boolean): React.CSSProperties => ({
    fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--muted)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const statRow: React.CSSProperties = { display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }
  const statNum: React.CSSProperties = { color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const canvasBox: React.CSSProperties = {
    position: 'relative', width: '100%', border: '1px solid var(--border)', borderRadius: 12,
    overflow: 'hidden', background: 'var(--paper)', minHeight: 180,
    boxShadow: dragHover ? '0 0 0 2px var(--accent) inset' : 'none',
  }
  const empty: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, minHeight: 240, padding: 20 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const selBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px',
  }

  const hasResult = placed.length > 0
  const topRankColor = (rank: number) => PALETTES[settings.palette].fn(topList.length > 1 ? rank / (topList.length - 1) : 0)

  return (
    <div
      style={wrap}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div style={topBar}>
        <div style={title}><Emoji e="☁️"/> 본문을 붙여넣거나 좌측 파일을 끌어다 놓으면 단어 구름을 그립니다</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="분석할 글을 여기에 붙여넣으세요. (좌측 바인더 파일을 이 영역에 드롭해도 됩니다)"
        spellCheck={false}
        aria-label="단어 구름 분석 텍스트 입력"
      />

      {/* 옵션 행 */}
      <div style={ctrlRow}>
        <span
          style={toggle(settings.excludeStop)}
          onClick={() => set('excludeStop', !settings.excludeStop)}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('excludeStop', !settings.excludeStop) } }}
          title="은/는/이/가 등 조사·접속어 같은 의미 약한 단어를 제외합니다"
        >{settings.excludeStop ? '✓ ' : ''}불용어 제외</span>
        <span
          style={toggle(settings.stripJosa)}
          onClick={() => set('stripJosa', !settings.stripJosa)}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('stripJosa', !settings.stripJosa) } }}
          title="어절 끝의 조사·어미를 떼어 같은 낱말로 묶습니다 (예: 바다를·바다는 → 바다)"
        >{settings.stripJosa ? '✓ ' : ''}조사 묶기</span>
        <span
          style={toggle(settings.allowRotate)}
          onClick={() => set('allowRotate', !settings.allowRotate)}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('allowRotate', !settings.allowRotate) } }}
          title="일부 단어를 세로로 배치해 더 빽빽하게 채웁니다"
        >{settings.allowRotate ? '✓ ' : ''}세로 배치</span>
      </div>

      {/* 상위 N + 팔레트 */}
      <div style={ctrlRow}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>상위</span>
        <input
          type="range" min={10} max={150} step={5}
          value={settings.topN}
          onChange={(e) => set('topN', Number(e.target.value))}
          style={{ flex: '1 1 120px', minWidth: 110, accentColor: 'var(--accent)' }}
          aria-label="표시할 단어 수"
        />
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{settings.topN}</span>
        <span style={{ flexBasis: '100%', height: 0 }} />
        {(Object.keys(PALETTES) as PaletteKey[]).map((k) => (
          <span
            key={k}
            style={pill(settings.palette === k)}
            onClick={() => set('palette', k)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('palette', k) } }}
          >{PALETTES[k].name}</span>
        ))}
      </div>

      {/* 액션 행 */}
      <div style={ctrlRow}>
        <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="minibtn" onClick={() => setSeed((s) => s + 1)} disabled={!hasResult} type="button" title="배치를 다시 계산합니다">↻ 재배치</button>
        <span style={{ flex: 1 }} />
        {savedMsg && <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>{savedMsg}</span>}
        <button className="btn-primary" onClick={savePng} disabled={!hasResult} type="button"><Emoji e="🖼️"/> PNG 저장</button>
      </div>

      {/* 캔버스 */}
      <div ref={wrapRef} style={canvasBox}>
        {hasResult ? (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', display: 'block', cursor: 'pointer' }}
            onPointerDown={onCanvasPointer}
            aria-label="단어 구름 캔버스 (단어를 클릭하면 빈도·순위를 봅니다)"
          />
        ) : (
          <div style={empty}>
            <div style={{ fontSize: 32 }}><Emoji e="☁️"/></div>
            <div>{text.trim() ? '집계할 단어가 부족합니다. 글을 더 넣거나 불용어 제외를 꺼 보세요.' : '글을 붙여넣으면 자주 쓴 단어를\n크기와 색으로 구름처럼 배치합니다.'}</div>
            {!text.trim() && <div style={hint}>가장 큰 단어가 가장 자주 쓴 단어입니다. PNG로 저장할 수 있어요.</div>}
          </div>
        )}
      </div>

      {/* 선택 단어 정보 */}
      {selected ? (
        <div style={selBox}>
          <span style={{ fontSize: 22, fontWeight: 800, color: selected.color }}>{selected.word}</span>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>빈도 <span style={statNum}>{selected.count}</span>회</span>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>순위 <span style={statNum}>{selected.rank + 1}</span>위 / {placed.length}</span>
          {counted.totalTokens > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>전체의 {((selected.count / counted.totalTokens) * 100).toFixed(1)}%</span>
          )}
          <span style={{ flex: 1 }} />
          <button className="linkbtn" onClick={() => setSelected(null)} type="button">닫기</button>
        </div>
      ) : hasResult ? (
        <div style={statRow}>
          <span>집계 단어 <span style={statNum}>{counted.totalTokens}</span></span>
          <span>고유 <span style={statNum}>{counted.uniqueCount}</span>종</span>
          <span>표시 <span style={statNum}>{placed.length}</span>개</span>
          {placed.length < topList.length && (
            <span style={{ color: 'var(--muted)' }}>(겹침으로 {topList.length - placed.length}개 생략)</span>
          )}
          <span style={{ flex: 1 }} />
          <span style={hint}>단어를 클릭하면 빈도·순위가 보입니다</span>
        </div>
      ) : null}

      {/* 연계 버튼 */}
      {hasResult && (hasProjectBridge() || hasStash()) && (
        <div style={ctrlRow}>
          {hasProjectBridge() && <button className="minibtn" onClick={addToProj} type="button"><Emoji e="📄"/> 프로젝트에 추가</button>}
          {hasStash() && <button className="minibtn" onClick={addToStashMemo} type="button"><Emoji e="📥"/> 수집함에 담기</button>}
          <span style={{ flex: 1 }} />
          <span style={hint}>상위 단어 목록으로 저장합니다</span>
        </div>
      )}

      {/* 상위 단어 미니 리스트(클릭 시 캔버스 선택과 동기화) */}
      {hasResult && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {topList.slice(0, 24).map((wc, i) => {
            const p = placed.find((x) => x.word === wc.word) || null
            const isSel = selected?.word === wc.word
            return (
              <span
                key={wc.word + '-' + i}
                onClick={() => setSelected(p)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p) } }}
                title={`${wc.count}회 · ${i + 1}위`}
                style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 7, cursor: 'pointer', userSelect: 'none',
                  border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSel ? 'var(--accent)' : 'var(--panel)',
                  color: isSel ? 'var(--paper)' : 'var(--text)',
                  opacity: p ? 1 : 0.5,
                }}
              >
                <span style={{ color: isSel ? 'var(--paper)' : topRankColor(i), fontWeight: 700 }}>{wc.word}</span>
                <span style={{ marginLeft: 5, color: isSel ? 'var(--paper)' : 'var(--muted)', fontSize: 11 }}>{wc.count}</span>
              </span>
            )
          })}
        </div>
      )}

      <div style={hint}>
        형태소 분석 없이 어절 단위로 센 근사값입니다. 가장 큰 단어가 가장 자주 쓴 단어이며, 색은 순위에 따라 정해집니다. 모든 계산·그리기는 기기 안에서만 이뤄집니다.
      </div>
    </div>
  )
}
