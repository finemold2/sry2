// 독자 페르소나 연구소 — 취향이 다른 가상 독자 5인이 원고를 "읽고" 단락별로 반응한다.
//  - 입력 텍스트를 단락으로 쪼개고, 각 단락의 측정값(문장 길이/대사 비율/감각어/긴장어/추상도/
//    고유명사·신조어 밀도/반복 등)을 결정론적으로 계산한다.
//  - 5인의 페르소나는 각자 가중치(선호/혐오)가 달라서, 같은 단락에서도 몰입/지루/혼란이 다르게 나온다.
//  - 단락×독자 히트맵, 독자별 종합 점수, 가장 약한 구간(지루/혼란 핫스팟)과 피드백 카드를 제공한다.
//  - 전부 브라우저 로컬 결정론 계산(외부 API 없음). 입력 기반 의사난수(문자열 해시 시드)만 사용.
// import 는 react 와 ./linkbus 만.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag, useLibraryList, addToLibrary, openToolLinked,
} from './linkbus'

export const meta = {
  id: 'reader-persona-lab',
  name: '독자 페르소나 연구소',
  icon: '🧑‍🤝‍🧑',
  group: '구상·정리',
  intro: '취향이 다른 가상 독자 5인이 원고를 단락별로 읽고 몰입·지루·혼란 반응을 시뮬레이션해 피드백 카드로 돌려줍니다',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:reader-persona-lab'

// ── 의사난수(문자열 해시 시드) ───────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h >>> 0
}
function seeded(seed: number): () => number {
  let a = (seed >>> 0) || 1
  return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296 }
}

// ── 측정 지표(0~1 정규화) ───────────────────────────────────
// 각 단락에서 뽑는 신호. 페르소나 가중치와 곱해 점수를 만든다.
interface Metrics {
  chars: number          // 글자 수
  avgSentLen: number     // 평균 문장 길이(어절)
  dialogue: number       // 대사 비율 0~1
  sensory: number        // 감각어 밀도 0~1
  tension: number        // 긴장/사건어 밀도 0~1
  emotion: number        // 감정어 밀도 0~1
  abstract: number       // 추상·관념어 밀도 0~1
  novelty: number        // 고유명사·낯선 용어 밀도 0~1(혼란 유발)
  repetition: number     // 직전 단락과의 어휘 반복도 0~1(지루 유발)
  longRun: number        // 긴 만연체 비율 0~1(피로)
  whitespace: number     // 묘사 vs 사건 — 정적 묘사 비율 0~1
}

// 가벼운 사전(로컬). 한국어 표지 위주 + 부분일치.
const W_SENSORY = ['빛', '어둠', '소리', '향', '냄새', '맛', '차가', '뜨거', '부드러', '거칠', '눈부', '울리', '메아리', '촉촉', '축축', '햇', '바람', '서늘', '따뜻', '비린', '달콤', '쓴', '시린', '아른', '번쩍', '반짝', '윤기', '먼지', '안개']
const W_TENSION = ['갑자기', '순간', '비명', '달려', '쏟아', '터졌', '무너', '폭발', '칼', '총', '피', '죽', '쫓', '도망', '추격', '경고', '위험', '비상', '충돌', '깨졌', '부서', '쾅', '탕', '급', '몰아', '터지', '치솟', '발작']
const W_EMOTION = ['사랑', '미움', '분노', '두려', '슬픔', '기쁨', '외로', '그리', '절망', '희망', '불안', '설레', '두근', '서글', '벅차', '먹먹', '서러', '울컥', '아련', '서운', '후회', '안도', '환희', '비통']
const W_ABSTRACT = ['존재', '본질', '의미', '운명', '진리', '시간', '영원', '정의', '자유', '관념', '개념', '구조', '체계', '본성', '필연', '우연', '인식', '의식', '형이상', '추상', '논리', '명제', '범주', '초월']
const W_FILLER = ['그리고', '그래서', '그러나', '하지만', '또한', '결국', '말하자면', '어쨌든', '이를테면', '즉', '다시', '아무튼']

function clamp01(n: number): number { return n < 0 ? 0 : n > 1 ? 1 : n }
function countHits(text: string, dict: string[]): number {
  let c = 0
  for (const w of dict) { let idx = text.indexOf(w); while (idx >= 0) { c++; idx = text.indexOf(w, idx + w.length) } }
  return c
}
function splitParas(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
function tokens(text: string): string[] {
  return text.split(/\s+/).map((t) => t.replace(/[.,!?…"'“”‘’()[\]{}—\-:;~]/g, '')).filter((t) => t.length >= 2)
}

// 고유명사·낯선 용어 추정: 한글 외 문자(영문/숫자/한자) 비율 + 따옴표로 묶인 신조어 + 드물게 등장하는 긴 어절
function noveltyScore(text: string, vocab: Set<string>, freq: Map<string, number>): number {
  const nonHangul = (text.match(/[A-Za-z0-9一-鿿]/g) || []).length
  const quoted = (text.match(/[「『《〈][^」』》〉]{1,12}[」』》〉]/g) || []).length
  const toks = tokens(text)
  let rare = 0
  for (const t of toks) { if (t.length >= 4 && (freq.get(t) || 0) <= 1 && !vocab.has(t)) rare++ }
  const base = (nonHangul / Math.max(1, text.length)) * 3 + quoted * 0.08 + (rare / Math.max(1, toks.length)) * 1.2
  return clamp01(base)
}

function measureParas(paras: string[]): Metrics[] {
  // 전역 어휘 빈도(반복도/희귀어 판단)
  const freq = new Map<string, number>()
  for (const p of paras) for (const t of tokens(p)) freq.set(t, (freq.get(t) || 0) + 1)
  const commonVocab = new Set<string>([...freq.entries()].filter(([, c]) => c >= 3).map(([w]) => w))

  let prevTok: Set<string> = new Set()
  return paras.map((p) => {
    const len = p.length || 1
    const sentences = p.split(/(?<=[.!?…。])\s*|(?<=다)\s+/).map((s) => s.trim()).filter(Boolean)
    const sentLens = sentences.map((s) => s.split(/\s+/).filter(Boolean).length)
    const avgSentLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : tokens(p).length
    const longRun = sentLens.length ? sentLens.filter((n) => n >= 18).length / sentLens.length : 0
    // 대사: 따옴표로 묶인 문자 비율
    const dlgChars = (p.match(/[“"][^”"]{0,400}[”"]/g) || []).join('').length
    const dialogue = clamp01(dlgChars / len)
    const norm = (hits: number) => clamp01((hits / Math.max(8, len / 6)))
    const sensory = norm(countHits(p, W_SENSORY))
    const tension = norm(countHits(p, W_TENSION))
    const emotion = norm(countHits(p, W_EMOTION))
    const abstract = norm(countHits(p, W_ABSTRACT))
    const novelty = noveltyScore(p, commonVocab, freq)
    // 반복도: 직전 단락 토큰과의 교집합 비율
    const cur = new Set(tokens(p))
    let inter = 0
    cur.forEach((t) => { if (prevTok.has(t)) inter++ })
    const repetition = cur.size ? clamp01(inter / cur.size) : 0
    prevTok = cur
    // 정적 묘사: 감각어 높고 대사/긴장 낮음
    const whitespace = clamp01(sensory * 0.7 + (1 - dialogue) * 0.2 + (1 - tension) * 0.1 - tension * 0.3)
    return { chars: p.length, avgSentLen, dialogue, sensory, tension, emotion, abstract, novelty, repetition, longRun, whitespace }
  })
}

// ── 페르소나 5인 ────────────────────────────────────────────
// 각 항목은 측정값에 대한 선호(+)·혐오(-) 가중치. 절대치가 클수록 그 신호에 민감.
interface Persona {
  key: string
  name: string
  tag: string
  blurb: string
  // 몰입 가중치
  w: Partial<Record<keyof Metrics, number>>
  // 지루/혼란 임계 성향(0~1, 높을수록 쉽게 지루해지거나 혼란해함)
  boreSens: number      // 반복·만연체·정적묘사에 대한 지루 민감도
  confSens: number      // 낯선 용어·추상·급변에 대한 혼란 민감도
  patience: number      // 인내심(0~1) — 긴 텍스트 후반 가산점
}
const PERSONAS: Persona[] = [
  {
    key: 'binge', name: '몰아보는 회독가', tag: '속도·사건 선호',
    blurb: '빠른 전개와 사건, 대사를 좋아하고 긴 묘사·관념을 못 견딘다.',
    w: { tension: 1.0, dialogue: 0.7, emotion: 0.4, whitespace: -0.7, abstract: -0.8, longRun: -0.6, avgSentLen: -0.4 },
    boreSens: 0.9, confSens: 0.5, patience: 0.35,
  },
  {
    key: 'lyric', name: '문장 미식가', tag: '감각·문체 선호',
    blurb: '감각적 묘사와 정제된 문장에 몰입하고, 거친 사건 나열엔 시큰둥하다.',
    w: { sensory: 1.0, whitespace: 0.6, emotion: 0.5, dialogue: -0.2, tension: -0.3, repetition: -0.5 },
    boreSens: 0.55, confSens: 0.35, patience: 0.8,
  },
  {
    key: 'feeler', name: '감정 이입형', tag: '관계·감정 선호',
    blurb: '인물의 감정과 관계 변화에 가장 크게 반응한다. 차가운 정보 나열엔 식는다.',
    w: { emotion: 1.0, dialogue: 0.6, sensory: 0.3, tension: 0.2, abstract: -0.4, novelty: -0.4 },
    boreSens: 0.6, confSens: 0.6, patience: 0.6,
  },
  {
    key: 'thinker', name: '사색하는 독자', tag: '주제·관념 선호',
    blurb: '아이디어와 관념, 복잡한 구조를 즐긴다. 단조로운 액션엔 쉽게 지루해한다.',
    w: { abstract: 0.9, novelty: 0.5, emotion: 0.3, sensory: 0.2, tension: -0.2, dialogue: -0.1 },
    boreSens: 0.5, confSens: 0.2, patience: 0.85,
  },
  {
    key: 'casual', name: '가벼운 입문 독자', tag: '쉬움·명료 선호',
    blurb: '쉽고 또렷한 글을 좋아한다. 낯선 용어·긴 문장·추상에 금세 혼란해진다.',
    w: { dialogue: 0.6, tension: 0.4, emotion: 0.3, novelty: -1.0, abstract: -0.9, longRun: -0.7, avgSentLen: -0.5 },
    boreSens: 0.5, confSens: 1.0, patience: 0.3,
  },
]

// ── 반응 시뮬레이션 ──────────────────────────────────────────
type Reaction = 'immersed' | 'neutral' | 'bored' | 'confused'
interface Cell { engage: number; bore: number; confuse: number; reaction: Reaction; score: number }

function simulate(m: Metrics, p: Persona, idx: number, total: number, rnd: () => number): Cell {
  // 몰입 기여(가중치×측정값) 합
  let engage = 0
  for (const k in p.w) {
    const wv = p.w[k as keyof Metrics] || 0
    engage += wv * (m[k as keyof Metrics] as number)
  }
  // 지루: 반복·만연체·정적묘사 × 지루민감도
  const bore = clamp01((m.repetition * 0.5 + m.longRun * 0.35 + m.whitespace * 0.3 - m.tension * 0.3) * (0.6 + p.boreSens))
  // 혼란: 낯선용어·추상·문장길이 × 혼란민감도
  const confuse = clamp01((m.novelty * 0.55 + m.abstract * 0.35 + (m.avgSentLen / 30) * 0.3 - m.dialogue * 0.2) * (0.5 + p.confSens))
  // 인내심: 후반부 가산(끈기 있는 독자는 빌드업을 견딤)
  const pos = total > 1 ? idx / (total - 1) : 0
  const patienceBonus = (p.patience - 0.5) * pos * 0.4
  // 약간의 개인차(결정론적 의사난수)
  const jitter = (rnd() - 0.5) * 0.12
  let score = clamp01(0.5 + engage * 0.32 + patienceBonus + jitter - bore * 0.5 - confuse * 0.45)

  let reaction: Reaction
  if (confuse > 0.55 && confuse >= bore) reaction = 'confused'
  else if (bore > 0.5 && bore > engage * 0.32 + 0.1) reaction = 'bored'
  else if (score >= 0.62) reaction = 'immersed'
  else reaction = 'neutral'
  return { engage, bore, confuse, reaction, score }
}

const REACT_META: Record<Reaction, { label: string; color: string; mark: string }> = {
  immersed: { label: '몰입', color: '#16a34a', mark: '●' },
  neutral: { label: '보통', color: '#9ca3af', mark: '○' },
  bored: { label: '지루', color: '#d97706', mark: '◐' },
  confused: { label: '혼란', color: '#dc2626', mark: '◍' },
}

interface SaveShape { text: string }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object' && typeof p.text === 'string') return { text: p.text } }
  } catch { /* noop */ }
  return { text: '' }
}

// 페르소나별 자유 피드백 문장(결정론 — 가장 두드러진 신호 기반)
function personaFeedback(p: Persona, cells: Cell[], metrics: Metrics[]): string {
  if (!cells.length) return ''
  const avg = (f: (c: Cell) => number) => cells.reduce((s, c) => s + f(c), 0) / cells.length
  const aScore = avg((c) => c.score)
  const aBore = avg((c) => c.bore)
  const aConf = avg((c) => c.confuse)
  const worst = cells.reduce((b, c, i) => (c.score < cells[b].score ? i : b), 0)
  const best = cells.reduce((b, c, i) => (c.score > cells[b].score ? i : b), 0)
  const parts: string[] = []
  if (aScore >= 0.6) parts.push(`전반적으로 잘 읽혔어요(${best + 1}단락이 특히 좋음).`)
  else if (aScore <= 0.42) parts.push(`솔직히 끝까지 붙들리진 않았어요(${worst + 1}단락이 가장 약함).`)
  else parts.push(`나쁘지 않지만 더 끌어당길 여지가 있어요.`)
  if (aConf > 0.45) parts.push('낯선 용어나 추상적 서술이 많아 따라가기 버거웠습니다.')
  if (aBore > 0.45) parts.push('비슷한 흐름·긴 문장이 이어져 중간에 늘어졌어요.')
  // 선호 신호 한 줄
  const liked = Object.entries(p.w).filter(([, v]) => (v || 0) > 0.5).map(([k]) => k)[0]
  const hint: Record<string, string> = {
    tension: '사건이 더 빨리 터지면 좋겠어요.', dialogue: '대사가 살아날수록 빠져듭니다.',
    sensory: '감각 묘사가 들어오면 장면이 살아요.', emotion: '인물 감정이 더 드러나면 좋겠어요.',
    abstract: '생각할 거리가 있는 대목이 반가웠어요.', whitespace: '차분한 묘사가 마음에 듭니다.',
    novelty: '새로운 설정·용어가 흥미로웠어요.',
  }
  if (liked && hint[liked]) parts.push(hint[liked])
  return parts.join(' ')
}

export default function ReaderPersonaLab({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [text, setText] = useState(init.current.text)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState('')
  const [dragOk, setDragOk] = useState(false)
  const [focusReader, setFocusReader] = useState<string | null>(null)
  const mounted = useRef(true)
  const consumedPayload = useRef(false)
  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.text 수용 — 같은 payload 재수신 차단(빈 입력 가드 유지)
  useEffect(() => {
    if (consumedPayload.current) return
    const t = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (t && t.trim()) {
      consumedPayload.current = true
      setText((prev) => (prev.trim() ? prev : t))
    }
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 입력이 사라질 수 있어요.') }
  }, [text])

  useEffect(() => { if (!saved) return; const t = window.setTimeout(() => { if (mounted.current) setSaved('') }, 2200); return () => window.clearTimeout(t) }, [saved])
  useEffect(() => { if (!note) return; const t = window.setTimeout(() => { if (mounted.current) setNote('') }, 4000); return () => window.clearTimeout(t) }, [note])

  // ── 분석(메모이즈) ─────────────────────────────────────────
  const analysis = useMemo(() => {
    const paras = splitParas(text)
    if (paras.length === 0) return null
    const metrics = measureParas(paras)
    const grid: Cell[][] = PERSONAS.map((p) => {
      const rnd = seeded(hashStr(p.key + '|' + text.length + '|' + (paras[0] || '')))
      return metrics.map((m, i) => simulate(m, p, i, paras.length, rnd))
    })
    // 독자별 종합
    const byReader = PERSONAS.map((p, r) => {
      const cells = grid[r]
      const score = cells.reduce((s, c) => s + c.score, 0) / cells.length
      const counts: Record<Reaction, number> = { immersed: 0, neutral: 0, bored: 0, confused: 0 }
      cells.forEach((c) => { counts[c.reaction]++ })
      return { p, score, counts, feedback: personaFeedback(p, cells, metrics) }
    })
    // 단락별 평균 점수(전체 독자) — 핫스팟 찾기
    const paraAvg = paras.map((_, i) => grid.reduce((s, row) => s + row[i].score, 0) / PERSONAS.length)
    const paraConfuse = paras.map((_, i) => grid.reduce((s, row) => s + row[i].confuse, 0) / PERSONAS.length)
    const paraBore = paras.map((_, i) => grid.reduce((s, row) => s + row[i].bore, 0) / PERSONAS.length)
    const overall = byReader.reduce((s, b) => s + b.score, 0) / byReader.length
    // 핫스팟: 가장 점수 낮은 단락 2개
    const hotspots = paras
      .map((_, i) => ({ i, score: paraAvg[i], bore: paraBore[i], confuse: paraConfuse[i] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.min(3, paras.length))
      .filter((h) => h.score < 0.55)
    return { paras, metrics, grid, byReader, paraAvg, paraConfuse, paraBore, overall, hotspots }
  }, [text])

  // ── 드롭(바인더 문서) 수용 ─────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    setDragOk(false)
    const item = getDragItem(e)
    if (item && item.text) { e.preventDefault(); setText(item.text); setNote(`바인더 문서 "${item.title}"의 본문을 불러왔어요.`) }
  }

  const insertSnippet = (t: string) => { setText((prev) => (prev.trim() ? prev + '\n\n' + t : t)) }

  // ── 산출/연동 ──────────────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    if (!analysis) return ''
    const parts: string[] = []
    parts.push(`<p><strong>독자 페르소나 반응 리포트</strong> · 단락 ${analysis.paras.length}개 · 종합 몰입도 ${(analysis.overall * 100).toFixed(0)}점</p>`)
    parts.push('<p><strong>독자별 반응</strong></p><ul>')
    analysis.byReader.forEach((b) => {
      parts.push(`<li>${esc(b.p.name)}(${esc(b.p.tag)}) — 몰입도 ${(b.score * 100).toFixed(0)}점 · 몰입 ${b.counts.immersed}/지루 ${b.counts.bored}/혼란 ${b.counts.confused}<br>${esc(b.feedback)}</li>`)
    })
    parts.push('</ul>')
    if (analysis.hotspots.length) {
      parts.push('<p><strong>주의 구간(약한 단락)</strong></p><ul>')
      analysis.hotspots.forEach((h) => {
        const why = h.confuse > h.bore ? '혼란' : '지루'
        parts.push(`<li>${h.i + 1}단락 — 몰입 ${(h.score * 100).toFixed(0)}점, 주원인 ${why}</li>`)
      })
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const buildText = (): string => {
    if (!analysis) return ''
    const L: string[] = []
    L.push(`[독자 페르소나 반응] 단락 ${analysis.paras.length} · 종합 몰입도 ${(analysis.overall * 100).toFixed(0)}점`)
    analysis.byReader.forEach((b) => {
      L.push(`- ${b.p.name}(${b.p.tag}) ${(b.score * 100).toFixed(0)}점 | 몰입 ${b.counts.immersed} 지루 ${b.counts.bored} 혼란 ${b.counts.confused}`)
      L.push(`  ${b.feedback}`)
    })
    if (analysis.hotspots.length) {
      L.push('주의 구간:')
      analysis.hotspots.forEach((h) => L.push(`  ${h.i + 1}단락 (${(h.score * 100).toFixed(0)}점, ${h.confuse > h.bore ? '혼란' : '지루'})`))
    }
    return L.join('\n')
  }

  const copyReport = async () => {
    const t = buildText()
    if (!t) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(t)
      else { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
      if (mounted.current) setSaved('리포트를 클립보드에 복사했어요.')
    } catch { if (mounted.current) setNote('복사에 실패했어요.') }
  }
  const toProject = () => {
    if (!hasProjectBridge() || !analysis) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '피드백',
      title: `독자 반응 리포트 (종합 ${(analysis.overall * 100).toFixed(0)}점)`,
      bodyHtml: buildHtml(),
      meta: { 단락수: String(analysis.paras.length), 종합몰입도: `${(analysis.overall * 100).toFixed(0)}점` },
    })
    if (mounted.current) setSaved(id ? '프로젝트 자료(피드백)에 리포트를 추가했어요.' : '프로젝트에 연결되지 않았습니다.')
  }
  const stashHotspot = (i: number) => {
    if (!hasStash() || !analysis) return
    addToStash({ kind: 'memo', label: `${i + 1}단락 약한 구간`, text: `${i + 1}단락(몰입 ${(analysis.paraAvg[i] * 100).toFixed(0)}점)\n원문: ${analysis.paras[i].slice(0, 120)}` })
    if (mounted.current) setSaved(`${i + 1}단락을 수집함에 담았어요.`)
  }
  const saveReaderToLibrary = (rIdx: number) => {
    if (!analysis) return
    const b = analysis.byReader[rIdx]
    addToLibrary('characters', {
      name: `독자: ${b.p.name}`,
      role: '베타 독자 페르소나',
      fields: { name: `독자: ${b.p.name}`, role: '베타 독자 페르소나', personality: b.p.blurb, notes: b.feedback },
      source: 'reader-persona-lab',
    } as any)
    if (mounted.current) setSaved(`"${b.p.name}" 페르소나를 인물 라이브러리에 저장했어요.`)
  }
  const openEmotionArc = () => {
    if (!analysis) return
    openToolLinked('emotion-arc', { text })
  }

  const sampleText = `골목 끝의 가로등이 깜빡였다. 그녀는 젖은 코트 깃을 세우며 차가운 공기를 들이마셨다. 멀리서 개 짖는 소리가 메아리쳤다.

"여기 맞아?" 그가 물었다. 목소리가 떨렸다.
"맞아. 들어가자." 그녀는 문고리를 잡았다.

존재의 본질이란 결국 인식의 구조에 다름 아니며, 시간이라는 관념은 의식이 만들어낸 필연적 허구에 불과하다는 명제를 그는 오래 곱씹었다.

갑자기 안에서 비명이 터졌다. 유리가 깨졌다. 두 사람은 동시에 달려 들어갔다.`

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const ta: React.CSSProperties = { width: '100%', minHeight: 120, maxHeight: 220, resize: 'vertical', padding: 10, fontSize: 13, lineHeight: 1.6, borderRadius: 10, border: dragOk ? '2px dashed var(--accent)' : '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }

  const a = analysis

  return (
    <div style={wrap}>
      <div style={head}>
        <strong style={{ fontSize: 13 }}>독자 페르소나 연구소</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(sampleText)} title="예시 원고로 채우기">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} title="입력 비우기">비우기</button>
        <button className="minibtn" onClick={copyReport} disabled={!a} title="리포트 복사">복사</button>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || !a} title="자료 피드백 폴더에 리포트 추가">프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 12px 0' }}>{saved}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 12px 0' }}>{note}</div>}

      <div style={body}>
        {/* 입력 */}
        <div style={panel}>
          <div style={sectionTitle}>원고 입력 · 단락(빈 줄)으로 구분</div>
          <textarea
            style={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="여기에 원고를 붙여 넣거나, 왼쪽 바인더 문서를 끌어다 놓으세요. 단락(빈 줄)마다 5인의 가상 독자가 반응합니다."
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); if (!dragOk) setDragOk(true) } }}
            onDragLeave={() => { if (dragOk) setDragOk(false) }}
            onDrop={onDrop}
            aria-label="원고 입력"
          />
          {snippets.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ ...hint, marginBottom: 4 }}>스니펫 라이브러리에서 넣기</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {snippets.slice(0, 6).map((s) => (
                  <button key={s.id} className="minibtn" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.text} onClick={() => insertSnippet(s.text)}>
                    {s.text.slice(0, 18) || '스니펫'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!a ? (
          <div style={{ ...panel, textAlign: 'center' }}>
            <div style={{ ...hint, lineHeight: 1.8 }}>
              원고를 입력하면 취향이 다른 가상 독자 5인이<br />단락마다 몰입·지루·혼란으로 반응합니다.<br />
              <b>예시</b> 버튼으로 바로 체험하거나, 좌측 바인더 문서를 끌어다 놓으세요.
            </div>
          </div>
        ) : (
          <>
            {/* 종합 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={sectionTitle}>종합 몰입도</span>
                <span style={{ flex: 1 }} />
                <strong style={{ fontSize: 22, color: a.overall >= 0.6 ? 'var(--ok)' : a.overall >= 0.45 ? 'var(--text)' : 'var(--warn)' }}>{(a.overall * 100).toFixed(0)}</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 11 }}>
                {(['immersed', 'neutral', 'bored', 'confused'] as Reaction[]).map((r) => (
                  <span key={r} style={{ color: REACT_META[r].color }}>{REACT_META[r].mark} {REACT_META[r].label}</span>
                ))}
                <span style={{ color: 'var(--muted)' }}>· {a.paras.length}단락 × 5독자</span>
              </div>
            </div>

            {/* 히트맵: 행=독자, 열=단락 */}
            <div style={panel}>
              <div style={sectionTitle}>반응 히트맵 · 행은 독자, 열은 단락</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--panel)', textAlign: 'left', padding: '2px 6px', color: 'var(--muted)', fontWeight: 600, minWidth: 76 }}>독자＼단락</th>
                      {a.paras.map((_, i) => (
                        <th key={i} style={{ padding: '2px 0', color: 'var(--muted)', fontWeight: 600, minWidth: 18 }}>{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERSONAS.map((p, r) => (
                      <tr key={p.key} style={{ opacity: focusReader && focusReader !== p.key ? 0.35 : 1 }}>
                        <td
                          style={{ position: 'sticky', left: 0, background: 'var(--panel)', padding: '2px 6px', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: focusReader === p.key ? 700 : 500 }}
                          title={p.blurb}
                          onClick={() => setFocusReader(focusReader === p.key ? null : p.key)}
                        >{p.name.length > 6 ? p.name.slice(0, 6) : p.name}</td>
                        {a.grid[r].map((c, i) => {
                          const meta2 = REACT_META[c.reaction]
                          return (
                            <td key={i} title={`${p.name} · ${i + 1}단락\n반응: ${meta2.label} (몰입 ${(c.score * 100).toFixed(0)}점)`}
                              style={{ width: 18, height: 18, background: meta2.color, opacity: 0.35 + c.score * 0.5, borderRadius: 4, textAlign: 'center', cursor: 'default' }}>
                              <span style={{ color: '#fff', fontSize: 8 }}>{meta2.mark}</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...hint, marginTop: 6 }}>색이 진할수록 몰입. 독자 이름을 누르면 강조됩니다.</div>
            </div>

            {/* 독자별 피드백 카드 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={sectionTitle}>독자별 피드백 카드</div>
              {a.byReader.map((b, r) => {
                if (focusReader && focusReader !== b.p.key) return null
                const pct = (b.score * 100).toFixed(0)
                const col = b.score >= 0.6 ? 'var(--ok)' : b.score >= 0.45 ? 'var(--muted)' : 'var(--warn)'
                return (
                  <div key={b.p.key} style={{ ...panel, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 13 }}>{b.p.name}</strong>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{b.p.tag}</span>
                      <span style={{ flex: 1 }} />
                      <strong style={{ fontSize: 16, color: col }}>{pct}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                      <span style={{ color: REACT_META.immersed.color }}>몰입 {b.counts.immersed}</span>
                      <span style={{ color: REACT_META.bored.color }}>지루 {b.counts.bored}</span>
                      <span style={{ color: REACT_META.confused.color }}>혼란 {b.counts.confused}</span>
                      <span style={{ color: REACT_META.neutral.color }}>보통 {b.counts.neutral}</span>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 6 }}>{b.feedback}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" style={{ fontSize: 11 }} onClick={() => saveReaderToLibrary(r)} title="이 페르소나를 인물 라이브러리에 저장">페르소나 저장</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 핫스팟 */}
            {a.hotspots.length > 0 && (
              <div style={panel}>
                <div style={sectionTitle}>손봐야 할 구간 · 가장 약한 단락</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.hotspots.map((h) => {
                    const why = h.confuse > h.bore ? '혼란' : '지루'
                    const wc = why === '혼란' ? REACT_META.confused.color : REACT_META.bored.color
                    return (
                      <div key={h.i} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 12 }}>{h.i + 1}단락</strong>
                          <span style={{ fontSize: 11, color: wc, fontWeight: 700 }}>주원인 {why}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, color: 'var(--warn)' }}>몰입 {(h.score * 100).toFixed(0)}점</span>
                          <button className="minibtn" style={{ fontSize: 11 }} onClick={() => stashHotspot(h.i)} disabled={!hasStash()} title="수집함에 담기">담기</button>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5, maxHeight: 48, overflow: 'hidden' }}>
                          {a.paras[h.i].slice(0, 120)}{a.paras[h.i].length > 120 ? '…' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                          {why === '혼란'
                            ? '낯선 용어·추상 서술·긴 문장을 줄이고 한 번에 하나씩 풀어보세요.'
                            : '비슷한 흐름이 이어집니다. 사건·대사·짧은 문장으로 리듬에 변화를 주세요.'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="linkbtn" onClick={openEmotionArc} title="이 원고로 감정 곡선 도구 열기">감정 곡선으로 보기</button>
            </div>

            <div className="license-note" style={hint}>
              반응은 단락별 신호(문장 길이·대사·감각어·긴장어·추상어·낯선 용어·반복도)를 페르소나별 가중치로 계산한 결정론적 시뮬레이션입니다. 실제 독자 반응을 보장하지 않으며 점검용 참고 지표입니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
