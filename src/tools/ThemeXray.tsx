// 주제 엑스레이 — 원고를 장(章) 단위로 쪼개 반복 모티프·주제어·이미지 어휘를 추출하고,
//   (1) 주제별 등장 분포(어느 장에 얼마나) 히트맵, (2) 장별 주제 강도 곡선(스파크라인),
//   (3) 주제 일관성 지도(전 구간 고른 분포 vs 한 장에 몰림)를 직접 계산해 시각화한다.
//   사용자가 추적할 주제어(동의어 묶음)를 정의하면 정밀 추적하고, 비워두면 본문에서
//   고빈도 명사형 어휘를 자동 후보로 뽑아 모티프 후보를 제시한다. 전부 브라우저 로컬 계산.
// import 는 react 와 ./linkbus 만. 자동 저장/복원. 바인더 드롭·payload.text·스니펫 라이브러리 수용.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge, getDragItem, isItemDrag,
  useLibraryList, addToLibrary, addToStash, hasStash, openToolLinked,
} from './linkbus'

export const meta = {
  id: 'theme-xray',
  name: '주제 엑스레이',
  icon: '🔬',
  group: '구상·정리',
  intro: '원고에서 반복 모티프·주제어를 추출해 주제 일관성 지도와 장별 강도 곡선으로 진단합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:theme-xray'

// ── 안전 유틸 ──────────────────────────────────────────────
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clampStr = (v: unknown, n: number) => String(v ?? '').slice(0, n)

// 입력 기반 의사난수(시드=문자열 해시) — 색 변형 등 결정론적 처리용
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

// 주제 색 팔레트(자작 색상만)
const COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8a5cd6', '#d2473b', '#2bb6c0', '#c9772b', '#5a7fd6', '#d65aa8', '#6aaf3f', '#cf9c2b']
function colorAt(i: number): string { return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length] }

// ── 데이터 모델 ────────────────────────────────────────────
interface Theme { id: string; label: string; terms: string }   // terms: 줄/콤마로 구분한 동의어 묶음
interface Data {
  text: string
  themes: Theme[]
  splitMode: SplitMode
  customMarker: string
}
type SplitMode = 'heading' | 'blankline' | 'count'

function newId(prefix: string): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID().slice(0, 8) } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function blankData(): Data {
  return {
    text: '',
    themes: [
      { id: newId('t'), label: '', terms: '' },
      { id: newId('t'), label: '', terms: '' },
    ],
    splitMode: 'heading',
    customMarker: '',
  }
}

function loadData(): Data {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return blankData()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return blankData()
    const themes: Theme[] = Array.isArray(p.themes)
      ? p.themes.filter((t: any) => t && typeof t === 'object').map((t: any) => ({
        id: String(t.id || newId('t')), label: clampStr(t.label, 40), terms: clampStr(t.terms, 600),
      }))
      : []
    const splitMode: SplitMode = (p.splitMode === 'blankline' || p.splitMode === 'count') ? p.splitMode : 'heading'
    return {
      text: clampStr(p.text, 400000),
      themes: themes.length ? themes : blankData().themes,
      splitMode,
      customMarker: clampStr(p.customMarker, 40),
    }
  } catch {
    return blankData()
  }
}

// ── 본문을 장(章) 단위로 분할 ───────────────────────────────
interface Chapter { title: string; text: string; chars: number }

// 한국어 흔한 장 머리말 패턴: "1장", "제1장", "Chapter 1", "## ...", "프롤로그/에필로그", "* * *"
const HEADING_RE = /^\s*(?:#{1,6}\s+.+|제?\s*\d+\s*[장화부막]\b.*|chapter\s+\d+.*|[0-9]+\s*[\.)]\s+.+|프롤로그.*|에필로그.*|서막.*|종막.*)$/i

function splitChapters(text: string, mode: SplitMode, marker: string): Chapter[] {
  const t = (text || '').replace(/\r\n?/g, '\n')
  if (!t.trim()) return []
  if (mode === 'count') {
    // 균등 글자 수 분할(약 1800자 단위, 단어 경계 존중)
    const target = 1800
    const out: Chapter[] = []
    let i = 0, n = 1
    while (i < t.length) {
      let end = Math.min(t.length, i + target)
      let cutOnSep = false
      if (end < t.length) {
        const nl = t.indexOf('\n', end)
        const sp = t.indexOf(' ', end)
        const cut = nl >= 0 && nl - end < 200 ? nl : (sp >= 0 && sp - end < 80 ? sp : end)
        cutOnSep = cut !== end
        end = cut
      }
      const seg = t.slice(i, end).trim()
      if (seg) out.push({ title: `구간 ${n}`, text: seg, chars: seg.length })
      // 구분자(공백/줄바꿈)에서 잘랐을 때만 그 한 글자를 건너뛴다. 아니면 글자 손실 방지를 위해 i=end.
      i = cutOnSep ? end + 1 : end
      n++
    }
    return out
  }
  const lines = t.split('\n')
  const isBreak = (line: string, prevBlank: boolean): boolean => {
    if (mode === 'heading') {
      if (marker.trim() && line.includes(marker.trim())) return true
      return HEADING_RE.test(line.trim()) || /^\s*[*＊·•\-—–=]{2,}\s*$/.test(line)
    }
    // blankline: 빈 줄 묶음 뒤 첫 비어있지 않은 줄에서 분할
    return prevBlank && line.trim().length > 0
  }
  const out: Chapter[] = []
  let cur: string[] = []
  let curTitle = ''
  let prevBlank = false
  let started = false
  const flush = () => {
    const body = cur.join('\n').trim()
    if (body) out.push({ title: curTitle || `구간 ${out.length + 1}`, text: body, chars: body.length })
    cur = []; curTitle = ''
  }
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]
    const blank = line.trim().length === 0
    if (mode === 'heading') {
      if (isBreak(line, prevBlank)) {
        if (started) flush()
        started = true
        const tt = line.trim().replace(/^#{1,6}\s+/, '')
        curTitle = /^[*＊·•\-—–=]{2,}$/.test(tt) ? '' : tt.slice(0, 50)
        continue
      }
      if (started || line.trim()) { started = true; cur.push(line) }
    } else {
      if (isBreak(line, prevBlank) && cur.join('').trim()) {
        flush()
      }
      if (line.trim() || cur.length) cur.push(line)
    }
    prevBlank = blank
  }
  flush()
  // 헤딩이 전혀 없으면 통째로 한 구간
  if (out.length === 0 && t.trim()) out.push({ title: '전체', text: t.trim(), chars: t.trim().length })
  return out
}

// ── 어휘 추출(자동 모티프 후보) ─────────────────────────────
// 한국어/영문 토큰화: 한글 음절·영문 단어 추출 후 조사/접미 간이 제거.
const STOP = new Set([
  '그리고', '그러나', '하지만', '그래서', '그런데', '그러면', '그러니까', '그것', '이것', '저것', '우리', '저는', '나는', '너는', '그는', '그녀', '당신',
  '있다', '없다', '하다', '되다', '같다', '이다', '아니다', '보다', '오다', '가다', '말다', '대한', '위해', '대해', '통해', '경우', '정도', '다시', '아주',
  '매우', '정말', '너무', '조금', '모든', '어떤', '무슨', '이런', '저런', '그런', '여기', '거기', '저기', '오늘', '내일', '어제', '지금', '바로', '그냥',
  'the', 'and', 'but', 'for', 'with', 'that', 'this', 'was', 'were', 'are', 'have', 'has', 'had', 'not', 'you', 'she', 'his', 'her', 'its', 'they', 'them',
  'from', 'what', 'when', 'who', 'will', 'would', 'could', 'about', 'into', 'than', 'then', 'there', 'here', 'been', 'being', 'said',
])
// 흔한 조사 꼬리 제거(매우 단순한 정규화 — 통계 후보용으로 충분)
const JOSA = /(은|는|이|가|을|를|에|의|와|과|도|만|로|으로|에서|에게|한테|부터|까지|처럼|보다|마다|조차|밖에|이라|라고|이라고|라는|이라는)$/

function normToken(w: string): string {
  let s = w
  // 한글이 2자 이상일 때만 조사 제거
  if (/[가-힣]/.test(s) && s.length >= 3) s = s.replace(JOSA, '')
  return s
}

function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[가-힣]{2,}|[a-z]{3,}/g) || []
  const out: string[] = []
  for (const raw of m) {
    const t = normToken(raw)
    if (t.length < 2) continue
    if (STOP.has(t)) continue
    out.push(t)
  }
  return out
}

// 한 구간 안에서 주어진 용어들이 몇 번 등장하는지(부분 문자열 매칭, 대소문자 무시)
function countTerms(haystackLower: string, terms: string[]): number {
  let n = 0
  for (const t of terms) {
    if (!t) continue
    let idx = 0
    const needle = t.toLowerCase()
    while (true) {
      const f = haystackLower.indexOf(needle, idx)
      if (f < 0) break
      n++; idx = f + needle.length
    }
  }
  return n
}

function parseTerms(label: string, raw: string): string[] {
  const set = new Set<string>()
  const add = (s: string) => { const t = s.trim(); if (t) set.add(t) }
  add(label)
  raw.split(/[\n,，、;]/).forEach(add)
  return Array.from(set).filter(Boolean)
}

// ── 분석 결과 ──────────────────────────────────────────────
interface ThemeStat {
  id: string; label: string; index: number
  perChapter: number[]          // 장별 천 자당 빈도(정규화 강도)
  perChapterRaw: number[]       // 장별 원시 등장 수
  total: number                 // 전체 등장 수
  chaptersHit: number           // 등장한 장 수
  coverage: number              // chaptersHit / 총 장수
  peakChapter: number           // 최강 장 인덱스(0-based)
  consistency: number           // 0~100, 고른 분포일수록 높음(지니 역수 기반). 구간 1개면 -1(평가 불가)
  drift: 'rising' | 'falling' | 'steady' | 'spiky' | 'absent'
}
interface AutoMotif { word: string; count: number; spread: number } // spread = 등장 장 수
interface Analysis {
  chapters: Chapter[]
  totalChars: number
  stats: ThemeStat[]
  maxIntensity: number          // 히트맵 정규화용
  autoMotifs: AutoMotif[]
  warnings: string[]
}

function gini(values: number[]): number {
  const v = values.filter((x) => x >= 0)
  const n = v.length
  if (n === 0) return 0
  const sum = v.reduce((a, b) => a + b, 0)
  if (sum === 0) return 0
  const sorted = v.slice().sort((a, b) => a - b)
  let cum = 0
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i]
  // 지니계수 0(완전균등)~1(완전집중)
  return (2 * cum) / (n * sum) - (n + 1) / n
}

function analyze(data: Data): Analysis {
  const chapters = splitChapters(data.text, data.splitMode, data.customMarker)
  const totalChars = chapters.reduce((a, c) => a + c.chars, 0)
  const lowers = chapters.map((c) => c.text.toLowerCase())

  const definedThemes = data.themes
    .map((t, i) => ({ raw: t, terms: parseTerms(t.label, t.terms), index: i }))
    .filter((t) => t.terms.length > 0)

  const stats: ThemeStat[] = definedThemes.map(({ raw, terms, index }) => {
    const perChapterRaw = lowers.map((lc) => countTerms(lc, terms))
    const perChapter = perChapterRaw.map((n, ci) => {
      const ch = chapters[ci].chars || 1
      return (n / ch) * 1000   // 천 자당 빈도
    })
    const total = perChapterRaw.reduce((a, b) => a + b, 0)
    const chaptersHit = perChapterRaw.filter((n) => n > 0).length
    const coverage = chapters.length ? chaptersHit / chapters.length : 0
    let peakChapter = 0, peakVal = -1
    perChapter.forEach((v, i) => { if (v > peakVal) { peakVal = v; peakChapter = i } })
    const g = gini(perChapter)
    // 구간이 1개뿐이면 분포 일관성을 평가할 수 없음(-1 = 평가 불가)
    const consistency = chapters.length < 2 ? -1 : total === 0 ? 0 : Math.round((1 - g) * 100)

    // 추세 진단: 전·후반 절반 비교 + 첨도(특정 장 몰림)
    let drift: ThemeStat['drift'] = 'steady'
    if (total === 0) drift = 'absent'
    else {
      const half = Math.floor(chapters.length / 2) || 1
      const front = perChapter.slice(0, half).reduce((a, b) => a + b, 0)
      const back = perChapter.slice(half).reduce((a, b) => a + b, 0)
      const maxV = Math.max(...perChapter, 0)
      const meanV = perChapter.reduce((a, b) => a + b, 0) / (perChapter.length || 1)
      if (chaptersHit <= 1 || (maxV > 0 && meanV > 0 && maxV / meanV >= chapters.length * 0.6 && chaptersHit <= 2)) drift = 'spiky'
      else if (back > front * 1.6) drift = 'rising'
      else if (front > back * 1.6) drift = 'falling'
      else drift = 'steady'
    }
    return { id: raw.id, label: (raw.label.trim() || terms[0] || '주제'), index, perChapter, perChapterRaw, total, chaptersHit, coverage, peakChapter, consistency, drift }
  })

  const maxIntensity = stats.reduce((m, s) => Math.max(m, ...s.perChapter), 0)

  // 자동 모티프 후보: 정의 주제 용어와 겹치지 않는 고빈도 어휘 + 분산도(여러 장 등장)
  const definedSet = new Set<string>()
  definedThemes.forEach((t) => t.terms.forEach((x) => definedSet.add(x.toLowerCase())))
  const freq = new Map<string, number>()
  const spreadMap = new Map<string, Set<number>>()
  chapters.forEach((c, ci) => {
    const toks = tokenize(c.text)
    const seen = new Set<string>()
    for (const tk of toks) {
      freq.set(tk, (freq.get(tk) || 0) + 1)
      if (!seen.has(tk)) {
        seen.add(tk)
        if (!spreadMap.has(tk)) spreadMap.set(tk, new Set())
        spreadMap.get(tk)!.add(ci)
      }
    }
  })
  const autoMotifs: AutoMotif[] = Array.from(freq.entries())
    .filter(([w, n]) => n >= 3 && !definedSet.has(w))
    .map(([w, n]) => ({ word: w, count: n, spread: spreadMap.get(w)?.size || 1 }))
    // 점수 = 빈도 × (1 + 분산가중) — 여러 장에 고루 퍼진 어휘를 모티프 후보로 우대
    .sort((a, b) => (b.count * (1 + b.spread)) - (a.count * (1 + a.spread)) || b.count - a.count)
    .slice(0, 24)

  const warnings: string[] = []
  if (chapters.length >= 2) {
    stats.forEach((s) => {
      if (s.total === 0) warnings.push(`「${s.label}」 본문에서 한 번도 발견되지 않음 — 용어 묶음 확인 또는 미구현 주제`)
      else if (s.drift === 'spiky') warnings.push(`「${s.label}」 특정 구간에만 몰려 등장 — 복선·재등장 부족`)
      else if (s.drift === 'falling') warnings.push(`「${s.label}」 후반으로 갈수록 약해짐 — 결말부 회수 점검`)
    })
  }

  return { chapters, totalChars, stats, maxIntensity, autoMotifs, warnings }
}

// ── 본체 ───────────────────────────────────────────────────
export default function ThemeXray({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Data>(loadData())
  const [data, setData] = useState<Data>(initial.current)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'input' | 'map' | 'motif'>('input')
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hover, setHover] = useState<{ t: number; c: number } | null>(null)
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)
  const payloadDone = useRef(false)

  const libSnippets = useLibraryList('snippets')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload.text 수용(좌측 문서 → 도구 열기, 또는 다른 도구가 텍스트 전달)
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    const pText = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (pText.trim()) {
      setData((d) => ({ ...d, text: pText.slice(0, 400000) }))
      setTab('input')
      setNote('전달된 원고를 불러왔어요. 추적할 주제어를 입력하거나 자동 후보 탭을 확인하세요.')
    }
    const pThemes = payload && Array.isArray((payload as any).themes) ? (payload as any).themes : null
    if (pThemes) {
      const ts: Theme[] = pThemes.slice(0, 12).map((x: any) => ({ id: newId('t'), label: clampStr(typeof x === 'string' ? x : x?.label, 40), terms: clampStr(typeof x === 'object' ? x?.terms : '', 600) }))
      if (ts.length) setData((d) => ({ ...d, themes: ts }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 사라질 수 있어요.') }
  }, [data])

  const a = useMemo(() => analyze(data), [data])

  // ── 주제 CRUD ──
  const addTheme = (label = '', terms = '') => setData((d) => ({ ...d, themes: [...d.themes, { id: newId('t'), label, terms }] }))
  const updateTheme = (id: string, patch: Partial<Theme>) => setData((d) => ({ ...d, themes: d.themes.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  const removeTheme = (id: string) => setData((d) => ({ ...d, themes: d.themes.filter((t) => t.id !== id) }))
  const setText = (text: string) => setData((d) => ({ ...d, text: text.slice(0, 400000) }))
  const setSplit = (splitMode: SplitMode) => setData((d) => ({ ...d, splitMode }))

  const clearAll = () => {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('원고와 주제 설정을 모두 지울까요? 되돌릴 수 없습니다.')) return
    setData(blankData()); setNote('')
  }

  const importSnippets = () => {
    if (!libSnippets.length) { setNote('수집한 스니펫이 없어요.'); return }
    const joined = libSnippets.map((s) => s.text).filter(Boolean).join('\n\n')
    if (!joined.trim()) { setNote('가져올 스니펫 본문이 없어요.'); return }
    setText((data.text ? data.text + '\n\n' : '') + joined)
    setNote(`스니펫 ${libSnippets.length}개를 원고 끝에 이어 붙였어요.`)
  }

  // ── 자동 후보 → 주제로 승격 ──
  const promoteMotif = (word: string) => {
    if (data.themes.some((t) => parseTerms(t.label, t.terms).map((x) => x.toLowerCase()).includes(word.toLowerCase()))) {
      setNote(`「${word}」은(는) 이미 추적 중이에요.`); return
    }
    const slot = data.themes.find((t) => !t.label.trim() && !t.terms.trim())
    if (slot) updateTheme(slot.id, { label: word })
    else addTheme(word)
    setTab('map')
    setNote(`「${word}」을(를) 추적 주제로 추가했어요. 동의어를 더 넣으면 정밀해집니다.`)
  }

  // ── 바인더 드롭 ──
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }
  const onDragEnter = (e: React.DragEvent) => { if (!isItemDrag(e)) return; e.preventDefault(); dragDepth.current += 1; if (!dragOver) setDragOver(true) }
  const onDragLeave = (e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false) }
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const body = (it.text || '').trim()
    if (!body) { setNote(`「${it.title || '문서'}」에서 본문 텍스트를 찾지 못했어요.`); return }
    const header = it.title ? `## ${it.title}\n` : ''
    setText((data.text ? data.text + '\n\n' : '') + header + body)
    setTab('input')
    setNote(`「${it.title || '문서'}」 본문을 원고에 추가했어요(${body.length.toLocaleString()}자).`)
  }

  // ── 내보내기 텍스트 ──
  const exportText = (): string => {
    const L: string[] = ['# 주제 엑스레이 리포트', '']
    L.push(`구간 ${a.chapters.length}개 · 본문 ${a.totalChars.toLocaleString()}자 · 추적 주제 ${a.stats.length}개`, '')
    if (a.stats.length) {
      L.push('## 주제별 일관성')
      a.stats.forEach((s) => {
        const bar = '█'.repeat(Math.round(s.coverage * 16))
        const consistTxt = s.consistency < 0 ? '일관성 평가 불가(구간 1개)' : `일관성 ${s.consistency}/100`
        L.push(`- ${s.label}: 등장 ${s.total}회 · ${s.chaptersHit}/${a.chapters.length}구간(${Math.round(s.coverage * 100)}%) · ${consistTxt} · ${driftLabel(s.drift)} ${bar}`)
      })
      L.push('', '## 장별 주제 강도(천 자당)')
      const head = ['구간', ...a.stats.map((s) => s.label)].join('\t')
      L.push(head)
      a.chapters.forEach((c, ci) => {
        const row = [c.title || `구간 ${ci + 1}`, ...a.stats.map((s) => s.perChapter[ci].toFixed(2))]
        L.push(row.join('\t'))
      })
    }
    if (a.autoMotifs.length) {
      L.push('', '## 자동 모티프 후보(고빈도·다구간 어휘)')
      a.autoMotifs.slice(0, 16).forEach((m) => L.push(`- ${m.word}: ${m.count}회 / ${m.spread}구간`))
    }
    if (a.warnings.length) { L.push('', '## 점검'); a.warnings.forEach((w) => L.push(`! ${w}`)) }
    return L.join('\n')
  }

  const copyReport = async () => {
    const txt = exportText()
    const done = () => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); done(); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        done()
      } catch { if (mounted.current) setNote('복사에 실패했어요.') }
    }
  }

  const stashReport = () => {
    if (!hasStash()) { setNote('수집함에 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'memo', label: '주제 엑스레이 리포트', text: exportText() })
    setNote('수집함에 리포트를 담았어요.')
  }

  // 추적 주제 묶음을 스니펫 라이브러리에 저장(다른 도구가 재사용)
  const saveThemeSet = () => {
    const defined = data.themes.filter((t) => t.label.trim() || t.terms.trim())
    if (!defined.length) { setNote('저장할 주제가 없어요.'); return }
    const text = defined.map((t) => `${t.label.trim()}: ${parseTerms('', t.terms).join(', ')}`).join('\n')
    addToLibrary('snippets', { text, source: '주제 엑스레이', tags: ['주제', '모티프'] })
    setNote('추적 주제 묶음을 스니펫 라이브러리에 저장했어요(다른 도구에서 재사용 가능).')
  }

  const exportToProject = () => {
    if (!a.chapters.length) { setNote('먼저 원고를 입력하세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구상',
      title: '주제 엑스레이 리포트',
      bodyHtml: buildProjectHtml(a),
      synopsis: `추적 주제 ${a.stats.length}개 · 구간 ${a.chapters.length}개`,
      meta: {
        구간수: String(a.chapters.length),
        추적주제: String(a.stats.length),
        본문자수: String(a.totalChars),
        점검: String(a.warnings.length),
      },
    })
    if (!mounted.current) return
    setNote(id ? '프로젝트 「구상」 폴더에 리포트를 문서로 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '9px 11px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }
  const tabBase: React.CSSProperties = { padding: '4px 11px', fontSize: 12.5, fontWeight: 700, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--paper)', color: 'var(--muted)' }
  const tabOn: React.CSSProperties = { ...tabBase, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }

  const noText = !a.chapters.length
  const noThemes = a.stats.length === 0

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent, #3d7fd6)', outlineOffset: -4, borderRadius: 8 } : wrap}
      onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent, #3d7fd6) 10%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
            여기에 놓으면 그 문서의 본문이 원고에 더해집니다
          </div>
        </div>
      )}

      <div style={topbar}>
        <div style={{ fontSize: 13, fontWeight: 700, marginRight: 'auto' }}>주제 엑스레이</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={tab === 'input' ? tabOn : tabBase} onClick={() => setTab('input')}>원고·주제</button>
          <button style={tab === 'map' ? tabOn : tabBase} onClick={() => setTab('map')}>일관성 지도</button>
          <button style={tab === 'motif' ? tabOn : tabBase} onClick={() => setTab('motif')}>모티프 후보</button>
        </div>
      </div>

      {/* 요약 줄 */}
      {!noText && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', padding: '7px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <span style={pill}>구간 <b style={{ color: 'var(--text)' }}>{a.chapters.length}</b></span>
          <span style={pill}>본문 <b style={{ color: 'var(--text)' }}>{a.totalChars.toLocaleString()}</b>자</span>
          <span style={pill}>추적 주제 <b style={{ color: 'var(--text)' }}>{a.stats.length}</b></span>
          {a.warnings.length > 0 && <span style={{ ...pill, borderColor: 'var(--warn)', color: 'var(--warn)', fontWeight: 700 }}>점검 {a.warnings.length}건</span>}
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={copyReport} disabled={noText} title="리포트 텍스트 복사">{copied ? '복사됨' : '복사'}</button>
          <button className="minibtn" onClick={stashReport} disabled={noText || !hasStash()} title="수집함에 담기">수집함</button>
          <button className="linkbtn" onClick={exportToProject} disabled={noText || !hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트 미연결' : '프로젝트에 리포트 추가'}>프로젝트에 추가</button>
        </div>
      )}

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {tab === 'input' && (
          <InputView
            data={data} a={a} setText={setText} setSplit={setSplit}
            updateTheme={updateTheme} addTheme={addTheme} removeTheme={removeTheme}
            updateMarker={(m) => setData((d) => ({ ...d, customMarker: m.slice(0, 40) }))}
            importSnippets={importSnippets} libCount={libSnippets.length}
            saveThemeSet={saveThemeSet} clearAll={clearAll}
            hint={hint}
          />
        )}
        {tab === 'map' && (
          noText ? <Empty msg="먼저 「원고·주제」 탭에서 원고를 붙여넣으세요." />
            : noThemes ? <Empty msg="추적할 주제어를 입력하거나 「모티프 후보」 탭에서 추가하세요." />
              : <MapView a={a} hover={hover} setHover={setHover} hint={hint} />
        )}
        {tab === 'motif' && (
          noText ? <Empty msg="먼저 원고를 입력하면 본문에서 고빈도 어휘를 모티프 후보로 추출합니다." />
            : <MotifView a={a} promote={promoteMotif} hint={hint} openLinked={(w) => openToolLinked('word-frequency', { text: data.text, term: w })} />
        )}
      </div>
    </div>
  )
}

// ── 빈 상태 ──
function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.8, padding: '44px 24px', gap: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>Xr</div>
      <div>{msg}</div>
    </div>
  )
}

// ── 원고·주제 입력 뷰 ──
interface InputProps {
  data: Data; a: Analysis
  setText: (v: string) => void; setSplit: (m: SplitMode) => void
  updateTheme: (id: string, p: Partial<Theme>) => void; addTheme: (l?: string, t?: string) => void; removeTheme: (id: string) => void
  updateMarker: (m: string) => void
  importSnippets: () => void; libCount: number
  saveThemeSet: () => void; clearAll: () => void
  hint: React.CSSProperties
}
function InputView(p: InputProps) {
  const { data, a, setText, setSplit, updateTheme, addTheme, removeTheme, updateMarker, importSnippets, libCount, saveThemeSet, clearAll, hint } = p
  const ta: React.CSSProperties = { width: '100%', minHeight: 150, resize: 'vertical', padding: 9, fontSize: 13, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const inp: React.CSSProperties = { padding: '5px 8px', fontSize: 12.5, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const seg = (on: boolean): React.CSSProperties => ({ padding: '3px 9px', fontSize: 11.5, borderRadius: 6, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--muted)', fontWeight: on ? 700 : 400 })
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <div style={label}>원고 본문</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="minibtn" onClick={importSnippets} disabled={!libCount} title="수집한 스니펫을 원고에 이어붙이기">스니펫 가져오기{libCount ? ` (${libCount})` : ''}</button>
            <button className="minibtn" onClick={clearAll} title="전체 비우기">비우기</button>
          </div>
        </div>
        <textarea
          style={ta}
          value={data.text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'원고 전체를 붙여넣으세요. 좌측 바인더 문서를 끌어다 놓아도 됩니다.\n장 구분: "1장", "제3장", "## 제목", "* * *" 같은 머리말을 자동 인식합니다.'}
          spellCheck={false}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ ...hint, fontWeight: 700 }}>구간 나누기:</span>
          <button style={seg(data.splitMode === 'heading')} onClick={() => setSplit('heading')}>머리말 기준</button>
          <button style={seg(data.splitMode === 'blankline')} onClick={() => setSplit('blankline')}>빈 줄 기준</button>
          <button style={seg(data.splitMode === 'count')} onClick={() => setSplit('count')}>균등 분할</button>
          {data.splitMode === 'heading' && (
            <input style={{ ...inp, width: 150 }} value={data.customMarker} onChange={(e) => updateMarker(e.target.value)} placeholder="추가 구분자(예: ◆)" maxLength={40} />
          )}
          <span style={hint}>{a.chapters.length}개 구간 인식됨</span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <div style={label}>추적 주제 · 모티프 (이름 + 동의어 묶음)</div>
          <button className="minibtn" onClick={saveThemeSet} title="추적 주제 묶음을 스니펫 라이브러리에 저장">주제 묶음 저장</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.themes.map((t, i) => {
            const terms = parseTerms(t.label, t.terms)
            const hit = a.stats.find((s) => s.id === t.id)
            return (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: 9, background: 'var(--panel)' }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: colorAt(i), flexShrink: 0, border: '1px solid var(--border)' }} aria-hidden />
                  <input style={{ ...inp, flex: '0 0 130px' }} value={t.label} onChange={(e) => updateTheme(t.id, { label: e.target.value.slice(0, 40) })} placeholder={`주제 ${i + 1} 이름`} maxLength={40} />
                  <input style={{ ...inp, flex: 1, minWidth: 100 }} value={t.terms} onChange={(e) => updateTheme(t.id, { terms: e.target.value.slice(0, 600) })} placeholder="동의어·관련어(콤마/줄로 구분): 자유, 해방, 새장, 날개..." maxLength={600} />
                  <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => removeTheme(t.id)} title="이 주제 삭제">삭제</button>
                </div>
                {hit && hit.total > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)' }}>
                    <span>등장 <b style={{ color: 'var(--text)' }}>{hit.total}</b>회</span>
                    <span>{hit.chaptersHit}/{a.chapters.length}구간</span>
                    <span>일관성 <b style={{ color: consistColor(hit.consistency) }}>{consistText(hit.consistency)}</b>{hit.consistency < 0 ? '' : '/100'}</span>
                    <span style={{ color: driftColor(hit.drift), fontWeight: 700 }}>{driftLabel(hit.drift)}</span>
                    <Spark values={hit.perChapter} color={colorAt(i)} w={90} h={18} />
                  </div>
                )}
                {hit && hit.total === 0 && terms.length > 0 && (
                  <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--danger, #d2473b)' }}>본문에서 발견되지 않음 — 동의어를 더하거나 표기를 확인하세요.</div>
                )}
                {terms.length === 0 && (
                  <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--muted)' }}>이름 또는 동의어를 입력하면 추적이 시작됩니다.</div>
                )}
              </div>
            )
          })}
        </div>
        <button className="btn-primary" style={{ marginTop: 9 }} onClick={() => addTheme()}>＋ 주제 추가</button>
        <div style={{ ...hint, marginTop: 8 }}>
          한 주제에 여러 표현을 묶으면(예: 자유 / 해방 / 새장 / 날개) 같은 모티프의 변주를 함께 추적합니다.
          매칭은 부분 문자열·대소문자 무시 방식이라 활용형도 대체로 잡힙니다.
        </div>
      </div>
    </div>
  )
}

// ── 일관성 지도 + 강도 곡선 뷰 ──
interface MapProps {
  a: Analysis
  hover: { t: number; c: number } | null
  setHover: (h: { t: number; c: number } | null) => void
  hint: React.CSSProperties
}
function MapView({ a, hover, setHover, hint }: MapProps) {
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: 13, background: 'var(--panel)' }
  const sectionTitle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }
  const cols = a.chapters.length
  const cellMin = 20

  // 히트맵 셀 색: 주제색 + 강도(천 자당 빈도 / 전체 최댓값) 알파
  const cellBg = (v: number, color: string) => {
    if (v <= 0 || a.maxIntensity <= 0) return 'transparent'
    const ratio = Math.min(1, v / a.maxIntensity)
    const pct = Math.round(12 + ratio * 76) // 12~88%
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 주제 × 구간 히트맵 */}
      <div style={card}>
        <div style={sectionTitle}>주제 일관성 지도 (주제 × 구간, 진할수록 강함)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'min-content' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--panel)', zIndex: 2, fontSize: 10.5, color: 'var(--muted)', textAlign: 'left', padding: '0 6px 6px 2px', minWidth: 120 }}>주제 \ 구간</th>
                {a.chapters.map((c, ci) => (
                  <th key={ci} style={{ fontSize: 9.5, color: 'var(--muted)', padding: '0 0 6px', minWidth: cellMin, textAlign: 'center' }} title={c.title || `구간 ${ci + 1}`}>{ci + 1}</th>
                ))}
                <th style={{ fontSize: 9.5, color: 'var(--muted)', padding: '0 4px 6px', textAlign: 'center', minWidth: 40 }}>일관성</th>
              </tr>
            </thead>
            <tbody>
              {a.stats.map((s, ti) => (
                <tr key={s.id}>
                  <td style={{ position: 'sticky', left: 0, background: 'var(--panel)', zIndex: 1, padding: '2px 6px 2px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, maxWidth: 120 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: colorAt(ti), flexShrink: 0 }} aria-hidden />
                      <span style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.label}>{s.label}</span>
                    </div>
                  </td>
                  {s.perChapter.map((v, ci) => {
                    const isHover = hover && hover.t === ti && hover.c === ci
                    return (
                      <td key={ci} style={{ padding: 1 }}>
                        <div
                          onMouseEnter={() => setHover({ t: ti, c: ci })}
                          onMouseLeave={() => setHover(null)}
                          title={`${s.label} · ${a.chapters[ci].title || '구간 ' + (ci + 1)}: ${s.perChapterRaw[ci]}회 (천 자당 ${v.toFixed(2)})`}
                          style={{
                            height: 22, minWidth: cellMin, borderRadius: 4,
                            background: cellBg(v, colorAt(ti)),
                            border: isHover ? '1px solid var(--accent)' : '1px solid color-mix(in srgb, var(--muted) 14%, transparent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9.5, color: 'var(--text)', cursor: 'default',
                          }}
                        >{s.perChapterRaw[ci] > 0 ? s.perChapterRaw[ci] : ''}</div>
                      </td>
                    )
                  })}
                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: consistColor(s.consistency) }} title={s.consistency < 0 ? '구간 1개 — 평가 불가' : undefined}>{consistText(s.consistency)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...hint, marginTop: 8 }}>
          셀 숫자는 해당 구간 등장 횟수, 색 농도는 천 자당 밀도입니다. 일관성 점수는 분포가 고를수록 100에 가깝습니다(한 구간에 몰리면 낮음).
        </div>
      </div>

      {/* 장별 강도 곡선(각 주제) */}
      <div style={card}>
        <div style={sectionTitle}>장별 주제 강도 곡선 (천 자당 밀도)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {a.stats.map((s, ti) => (
            <div key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: colorAt(ti), flexShrink: 0 }} aria-hidden />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: driftColor(s.drift), fontWeight: 700 }}>{driftLabel(s.drift)}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>최강: {(a.chapters[s.peakChapter]?.title) || `구간 ${s.peakChapter + 1}`}</span>
              </div>
              <Curve values={s.perChapter} color={colorAt(ti)} max={a.maxIntensity} />
            </div>
          ))}
        </div>
        <div style={{ ...hint, marginTop: 8 }}>가로축 = 구간 진행(왼쪽 도입, 오른쪽 결말). 모든 곡선은 동일 척도라 주제 간 우열·교차를 비교할 수 있습니다.</div>
      </div>

      {/* 점검 */}
      {a.warnings.length > 0 && (
        <div style={{ ...card, borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 7%, transparent)' }}>
          <div style={{ ...sectionTitle, color: 'var(--warn)' }}>주제 점검 ({a.warnings.length}건)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--warn)', display: 'flex', gap: 6 }}><b>!</b><span>{w}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 모티프 후보 뷰 ──
function MotifView({ a, promote, hint, openLinked }: { a: Analysis; promote: (w: string) => void; hint: React.CSSProperties; openLinked: (w: string) => void }) {
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: 13, background: 'var(--panel)' }
  const maxScore = a.autoMotifs.length ? a.autoMotifs[0].count * (1 + a.autoMotifs[0].spread) : 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }}>
          자동 모티프 후보 (여러 구간에 반복되는 어휘)
        </div>
        {a.autoMotifs.length === 0 ? (
          <div style={{ ...hint, padding: '8px 0' }}>반복 어휘 후보가 충분치 않습니다. 원고를 더 입력해 보세요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {a.autoMotifs.map((m, i) => {
              const score = m.count * (1 + m.spread)
              const w = Math.max(4, Math.round((score / maxScore) * 100))
              const col = colorAt(hashStr(m.word) % COLORS.length)
              return (
                <div key={m.word + i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.word}>{m.word}</div>
                  <div style={{ height: 14, borderRadius: 7, background: 'color-mix(in srgb, var(--muted) 12%, transparent)', overflow: 'hidden', position: 'relative' }} title={`${m.count}회 / ${m.spread}구간`}>
                    <div style={{ width: `${w}%`, height: '100%', background: col, borderRadius: 7 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{m.count}회·{m.spread}구간</span>
                    <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => promote(m.word)} title="이 어휘를 추적 주제로 추가">추적</button>
                    <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => openLinked(m.word)} title="단어 빈도 도구에서 자세히 보기">연계</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ ...hint, marginTop: 10 }}>
          빈도와 분산도(등장 구간 수)를 함께 본 점수 순입니다. 한 구간에만 많은 단어보다 여러 구간에 퍼진 단어를 모티프 후보로 우대합니다.
          「추적」을 누르면 일관성 지도에서 정밀 분석됩니다.
        </div>
      </div>
    </div>
  )
}

// ── 작은 스파크라인(인라인) ──
function Spark({ values, color, w = 80, h = 16 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (!values.length) return null
  const max = Math.max(...values, 0.0001)
  const n = values.length
  const step = n > 1 ? w / (n - 1) : 0
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── 강도 곡선(영역+점) ──
function Curve({ values, color, max }: { values: number[]; color: string; max: number }) {
  const W = 100, H = 38, pad = 2
  const n = values.length
  const top = max > 0 ? max : 1
  const x = (i: number) => n > 1 ? pad + (i * (W - pad * 2)) / (n - 1) : W / 2
  const y = (v: number) => H - pad - (v / top) * (H - pad * 2)
  const line = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const area = n > 0 ? `${pad},${H - pad} ${line} ${(W - pad).toFixed(2)},${H - pad}` : ''
  const gid = 'tx_' + Math.abs(hashStr(color + n)).toString(36)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--paper)', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 56 }} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.42" />
            <stop offset="100%" stopColor={color} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {n > 1 && <polygon points={area} fill={`url(#${gid})`} />}
        <polyline points={line} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={1.4} fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}

// ── 프로젝트 HTML ──
function buildProjectHtml(a: Analysis): string {
  const summary = `<p>구간 ${a.chapters.length}개 · 본문 ${a.totalChars.toLocaleString()}자 · 추적 주제 ${a.stats.length}개</p>`
  let table = ''
  if (a.stats.length) {
    const head = `<tr><th style="text-align:left">주제</th><th>등장</th><th>구간</th><th>일관성</th><th>추세</th></tr>`
    const rows = a.stats.map((s) => `<tr><th style="text-align:left">${escapeHtml(s.label)}</th><td style="text-align:center">${s.total}</td><td style="text-align:center">${s.chaptersHit}/${a.chapters.length}</td><td style="text-align:center">${s.consistency < 0 ? '평가 불가' : s.consistency + '/100'}</td><td style="text-align:center">${driftLabel(s.drift)}</td></tr>`).join('')
    table = `<table><thead>${head}</thead><tbody>${rows}</tbody></table>`

    // 장별 강도 표
    const ch = a.chapters.map((c, i) => `<th>${escapeHtml(c.title || 'C' + (i + 1))}</th>`).join('')
    const intensityRows = a.stats.map((s) => `<tr><th style="text-align:left">${escapeHtml(s.label)}</th>${s.perChapterRaw.map((v) => `<td style="text-align:center">${v || '·'}</td>`).join('')}</tr>`).join('')
    table += `<p><strong>장별 등장 횟수</strong></p><table><thead><tr><th>주제 \\ 구간</th>${ch}</tr></thead><tbody>${intensityRows}</tbody></table>`
  }
  const motif = a.autoMotifs.length
    ? `<p><strong>자동 모티프 후보</strong></p><ul>${a.autoMotifs.slice(0, 12).map((m) => `<li>${escapeHtml(m.word)} — ${m.count}회 / ${m.spread}구간</li>`).join('')}</ul>`
    : ''
  const warn = a.warnings.length
    ? `<p><strong>점검</strong></p><ul>${a.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
    : '<p>주제 분포에서 큰 문제가 발견되지 않았습니다.</p>'
  return summary + table + '<hr />' + motif + warn
}

// ── 라벨/색 헬퍼 ──
function driftLabel(d: ThemeStat['drift']): string {
  switch (d) {
    case 'rising': return '후반 강화'
    case 'falling': return '후반 약화'
    case 'spiky': return '특정 구간 집중'
    case 'absent': return '미등장'
    default: return '고른 분포'
  }
}
function driftColor(d: ThemeStat['drift']): string {
  switch (d) {
    case 'rising': return 'var(--ok, #3fa35a)'
    case 'falling': return 'var(--warn, #e0992b)'
    case 'spiky': return 'var(--warn, #e0992b)'
    case 'absent': return 'var(--danger, #d2473b)'
    default: return 'var(--muted)'
  }
}
function consistColor(c: number): string {
  if (c < 0) return 'var(--muted)'   // 평가 불가
  return c >= 66 ? 'var(--ok, #3fa35a)' : c >= 40 ? 'var(--warn, #e0992b)' : 'var(--danger, #d2473b)'
}
// 일관성 점수 표시(구간 1개면 N/A)
function consistText(c: number): string { return c < 0 ? 'N/A' : String(c) }
