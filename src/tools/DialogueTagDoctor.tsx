// 대화 태그 닥터 — 소설 본문에서 대사("…"/「…」/“…”/‘…’/『…』)와 그에 붙은 "대화 지문(speech tag)"을
// 찾아, said-bookism(중얼거렸다·외쳤다 같은 화려한 발화동사) 남용, 태그에 붙은 부사(~하게 말했다) 과다,
// 태그 빈도/단조로움을 규칙 기반으로 분석·경고하고, 행동 비트(action beat) 대안을 제시한다.
// 통계 표·태그 분포 막대·문제 문장 하이라이트 목록을 직접 구현(외부 라이브러리/네트워크/이미지 일절 없음).
// 한국어(공백/.!?… 문장부호) 처리. localStorage 자동 저장·복원, 빈 상태 안내. 언마운트 정리(타이머).
// [연계] 좌측 바인더 파일을 드롭하면 본문으로 가져오고, hasProjectBridge() 시 분석 리포트를 프로젝트에
//        문서로 추가, 인상 깊은 행동 비트 예시를 수집함에 담고, 관련 도구(부사 하이라이터 등)로 이동.
// import 는 react 와 './linkbus' 만 사용.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  openToolLinked,
  getDragItem,
  isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'dialogue-tag-doctor',
  name: '대화 태그 닥터',
  icon: '🩺',
  group: '교정·언어',
  intro: '대사에 붙은 발화동사·부사·태그 빈도를 진단하고 행동 비트 대안을 제시합니다',
  w: 900,
  h: 680,
}

const LS_KEY = 'sry:tool:dialogue-tag-doctor'

/* ───────── 따옴표 정의 ───────── */
interface QuotePair { open: string; close: string; sameChar: boolean }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”', sameChar: false },
  { open: '‘', close: '’', sameChar: false },
  { open: '「', close: '」', sameChar: false },
  { open: '『', close: '』', sameChar: false },
  { open: '"', close: '"', sameChar: true },
  { open: "'", close: "'", sameChar: true },
]

/* ───────── 발화동사 사전 ─────────
   - plain: 눈에 띄지 않는 "투명한" 태그(말하다/묻다/답하다). 권장.
   - bookism: said-bookism — 발화 자체를 묘사하려는 화려한 동사. 가끔은 좋지만 남용 금지.
   각 항목은 어간(활용 전 핵심)으로, 본문에서 어미를 붙여 매칭한다. */
interface VerbDef { stems: string[]; label: string }
const PLAIN_VERBS: VerbDef[] = [
  { stems: ['말하', '말했', '말한', '말하며', '말하면서'], label: '말하다' },
  { stems: ['묻', '물었', '물어', '묻는', '물으며'], label: '묻다' },
  { stems: ['답하', '답했', '대답하', '대답했', '대꾸하', '대꾸했'], label: '답하다' },
]

// said-bookism 후보(어간 → 부드러운 대안 제안). 정도가 강할수록 경고 가중.
interface BookismDef { stems: string[]; label: string; weight: number; alt: string }
const BOOKISM_VERBS: BookismDef[] = [
  { stems: ['외쳤', '외치', '외쳐'], label: '외쳤다', weight: 2, alt: '느낌표·짧은 문장으로 고조를 보이고, "말했다"로 충분합니다' },
  { stems: ['소리쳤', '소리치', '소리질렀', '소리 질렀'], label: '소리쳤다', weight: 2, alt: '대사 자체와 행동(주먹을 쥐었다 등)으로 음량을 암시하세요' },
  { stems: ['중얼거렸', '중얼거리', '중얼댔', '웅얼거렸', '웅얼거리'], label: '중얼거렸다', weight: 1, alt: '시선을 떨구는 행동 비트로 작은 목소리를 보여 주세요' },
  { stems: ['속삭였', '속삭이'], label: '속삭였다', weight: 1, alt: '거리감·몸짓(귀에 대고)으로 속삭임을 그리세요' },
  { stems: ['내뱉었', '내뱉', '뱉었'], label: '내뱉었다', weight: 1, alt: '짧고 모진 대사 + 행동 비트로 거친 톤을 전달하세요' },
  { stems: ['읊조렸', '읊조리', '되뇌었', '되뇌'], label: '읊조렸다', weight: 1, alt: '담담한 행동 묘사로 충분합니다' },
  { stems: ['으르렁거렸', '으르렁댔', '으르렁'], label: '으르렁거렸다', weight: 2, alt: '비유는 강렬하지만 잦으면 우스워집니다 — 표정·자세로 대체' },
  { stems: ['비명을 질렀', '비명 질렀', '비명질렀'], label: '비명을 질렀다', weight: 2, alt: '대사를 끊고 행동/감각 묘사로 공포를 보여 주세요' },
  { stems: ['신음했', '신음하', '끙끙댔'], label: '신음했다', weight: 1, alt: '신체 반응(이를 악물었다)으로 대체' },
  { stems: ['낄낄거렸', '낄낄댔', '키득거렸', '키득댔', '깔깔거렸', '깔깔댔'], label: '낄낄거렸다', weight: 1, alt: '웃음은 말하기 어렵습니다 — "웃으며 말했다" 또는 행동으로' },
  { stems: ['코웃음을 쳤', '콧방귀를 뀌'], label: '코웃음을 쳤다', weight: 1, alt: '표정 비트(입꼬리를 올렸다)로 비웃음을 보이세요' },
  { stems: ['울먹였', '울먹이', '흐느꼈', '흐느끼'], label: '울먹였다', weight: 1, alt: '떨리는 손·젖은 눈 등 신체 묘사로 대체' },
  { stems: ['툴툴거렸', '툴툴댔', '투덜거렸', '투덜댔'], label: '투덜거렸다', weight: 1, alt: '말 내용 자체로 불만을 드러내세요' },
  { stems: ['헐떡였', '헐떡이', '숨을 몰아쉬'], label: '헐떡였다', weight: 1, alt: '문장 호흡을 짧게 끊어 숨참을 보여 주세요' },
  { stems: ['쏘아붙였', '쏘아붙이'], label: '쏘아붙였다', weight: 1, alt: '날선 대사 + 행동 비트로 충분합니다' },
  { stems: ['주절거렸', '주절댔'], label: '주절거렸다', weight: 1, alt: '말 자체를 길게 풀어 장황함을 보여 주세요' },
]

// 부사 탐지: 발화동사 바로 앞에 붙는 "~게/~이/~히" 부사 + 흔한 부사 어휘.
const COMMON_ADVERBS = [
  '천천히', '빠르게', '조용히', '큰소리로', '나직이', '나지막이', '단호하게', '부드럽게',
  '차갑게', '냉정하게', '다정하게', '슬프게', '기쁘게', '화나게', '신경질적으로', '퉁명스럽게',
  '날카롭게', '상냥하게', '무뚝뚝하게', '재빨리', '간신히', '겨우', '조심스럽게', '주저하며',
  '망설이며', '떨리는 목소리로', '낮은 목소리로', '작은 목소리로', '진지하게', '장난스럽게',
]

// 행동 비트(action beat) 예시 — said-bookism/부사 대신 끼워 넣을 수 있는 자작 묘사 라이브러리.
const ACTION_BEATS: { emotion: string; beats: string[] }[] = [
  { emotion: '분노·격앙', beats: ['주먹을 꽉 쥐었다.', '의자를 밀치며 일어섰다.', '책상을 내리쳤다.', '턱에 힘이 들어갔다.'] },
  { emotion: '두려움·불안', beats: ['손끝이 가늘게 떨렸다.', '한 걸음 뒤로 물러섰다.', '침을 삼켰다.', '문고리를 꼭 붙잡았다.'] },
  { emotion: '슬픔·체념', beats: ['고개를 떨구었다.', '눈가가 붉어졌다.', '깊게 숨을 내쉬었다.', '창밖으로 시선을 돌렸다.'] },
  { emotion: '비웃음·냉소', beats: ['입꼬리를 비스듬히 올렸다.', '팔짱을 끼고 등을 기댔다.', '눈을 가늘게 떴다.', '시선을 천장으로 굴렸다.'] },
  { emotion: '망설임·소심', beats: ['손가락을 만지작거렸다.', '바닥을 내려다보았다.', '입을 열었다가 다시 닫았다.', '귓불을 매만졌다.'] },
  { emotion: '다정·온화', beats: ['상대의 어깨에 손을 얹었다.', '눈을 맞추며 미소 지었다.', '한 발짝 다가섰다.', '찻잔을 가만히 밀어 주었다.'] },
]

/* ───────── 한 발화/태그 발견 결과 ───────── */
type Severity = 'high' | 'mid' | 'low'
interface Finding {
  index: number          // 본문 내 등장 순서
  dialogue: string       // 대사 내용(요약)
  tag: string            // 발견한 태그 구간(부사+동사 주변)
  verbLabel: string      // 정규화된 동사명
  kind: 'plain' | 'bookism'
  adverb: string | null  // 붙은 부사
  severity: Severity
  note: string           // 한 줄 진단
  alt: string            // 대안 제안
}

/* ───────── 본문 파서 ─────────
   따옴표 구간(대사)을 찾고, 그 직후의 짧은 "꼬리" 텍스트(다음 따옴표/문장 끝/줄바꿈 전까지)에서
   발화동사·부사를 탐지한다. 한국어는 어순상 대사 뒤에 태그가 오는 경우가 많아 직후 구간을 본다.
   대사 직후가 비어 있으면(태그 없음) 직전 구간도 보조로 살핀다. */
function visibleLen(s: string): number { return [...s.replace(/\s/g, '')].length }
function clip(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return [...t].length > n ? [...t].slice(0, n).join('') + '…' : t
}

function findDialogues(text: string): { dialogue: string; after: string; before: string }[] {
  const chars = [...text]
  const out: { dialogue: string; after: string; before: string }[] = []
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)
  let i = 0
  let lastClose = 0
  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (pair) {
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
      if (closed && inner.trim().length > 0) {
        // 대사 직후 꼬리: 다음 여는따옴표/줄바꿈/문장 끝(. ! ? …)까지
        let k = j + 1
        let after = ''
        while (k < chars.length) {
          const ck = chars[k]
          if (PAIRS.some((p) => p.open === ck)) break
          if (ck === '\n') break
          after += ck
          if (/[.!?…]/.test(ck)) { // 문장 끝 한 번이면 충분(태그는 보통 한 문장)
            // 다만 "...라고" 같은 인용 조사 뒤 동사를 잡기 위해 살짝 더 본다
            break
          }
          k++
          if (after.length > 60) break
        }
        // 대사 직전 꼬리(보조): 직전 닫힘 이후 ~ 이 대사 여는 위치까지
        const before = chars.slice(lastClose, i).join('')
        out.push({ dialogue: inner.trim(), after, before })
        lastClose = j + 1
        i = j + 1
        continue
      }
    }
    i++
  }
  return out
}

// 꼬리/머리 텍스트에서 부사 + 발화동사 탐지
function detectTag(seg: string): { verb: BookismDef | VerbDef | null; kind: 'plain' | 'bookism' | null; verbLabel: string; adverb: string | null; raw: string } {
  if (!seg || !seg.trim()) return { verb: null, kind: null, verbLabel: '', adverb: null, raw: '' }
  const s = seg

  // 1) said-bookism 먼저(더 구체적)
  for (const def of BOOKISM_VERBS) {
    for (const stem of def.stems) {
      const at = s.indexOf(stem)
      if (at >= 0) {
        const adv = findAdverbBefore(s, at)
        return { verb: def, kind: 'bookism', verbLabel: def.label, adverb: adv, raw: clip(s, 40) }
      }
    }
  }
  // 2) plain 발화동사
  for (const def of PLAIN_VERBS) {
    for (const stem of def.stems) {
      const at = s.indexOf(stem)
      if (at >= 0) {
        // '말'은 너무 흔하니 '말하/말했/말한'처럼 어간이 2글자 이상인 항목만 신뢰. (stems 가 이미 2글자+)
        const adv = findAdverbBefore(s, at)
        return { verb: def, kind: 'plain', verbLabel: def.label, adverb: adv, raw: clip(s, 40) }
      }
    }
  }
  return { verb: null, kind: null, verbLabel: '', adverb: null, raw: clip(s, 40) }
}

// 동사 앞쪽에서 부사를 찾는다(명시 어휘 우선, 없으면 ~게/~히/~이 패턴 추정)
function findAdverbBefore(s: string, verbAt: number): string | null {
  const head = s.slice(0, verbAt)
  // 명시 부사
  for (const adv of COMMON_ADVERBS) {
    if (head.includes(adv)) return adv
  }
  // 패턴: 동사 바로 앞 토큰이 ~게/~히/~이/~로 로 끝나면 부사로 추정
  const m = head.trim().match(/([가-힣]{2,6}(?:게|히|이|스럽게|롭게|으로|로))\s*$/)
  if (m) return m[1]
  return null
}

interface Analysis {
  total: number                 // 대사 수
  tagged: number                // 태그가 붙은 대사 수
  findings: Finding[]
  verbCounts: { label: string; count: number; kind: 'plain' | 'bookism' }[]
  bookismCount: number
  adverbCount: number
  plainCount: number
  noTagCount: number
  topTag: { label: string; count: number } | null
  varietyScore: number          // 0~100, 태그 다양성(높을수록 다양)
  warnings: { level: Severity; text: string }[]
}

function analyze(text: string): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  let items: ReturnType<typeof findDialogues>
  try { items = findDialogues(text) } catch { return null }
  if (items.length === 0) return null

  const findings: Finding[] = []
  const verbMap = new Map<string, { count: number; kind: 'plain' | 'bookism' }>()
  let bookismCount = 0, adverbCount = 0, plainCount = 0, noTagCount = 0

  items.forEach((it, idx) => {
    // 직후 우선, 없으면 직전 보조
    let det = detectTag(it.after)
    if (!det.kind) {
      const detBefore = detectTag(it.before)
      if (detBefore.kind) det = detBefore
    }
    if (!det.kind) { noTagCount++; return }

    const label = det.verbLabel
    const prev = verbMap.get(label) || { count: 0, kind: det.kind }
    verbMap.set(label, { count: prev.count + 1, kind: det.kind })

    let severity: Severity = 'low'
    let note = ''
    let alt = ''
    if (det.kind === 'bookism') {
      bookismCount++
      const bd = det.verb as BookismDef
      severity = bd.weight >= 2 ? 'high' : 'mid'
      note = `said-bookism: ‘${label}’ — 발화 자체를 동사로 묘사하고 있어요`
      alt = bd.alt
    } else {
      plainCount++
      severity = 'low'
      note = `투명한 태그 ‘${label}’ — 좋아요(눈에 띄지 않습니다)`
      alt = '그대로 두거나, 변화가 필요하면 짧은 행동 비트로 바꿔 보세요'
    }
    if (det.adverb) {
      adverbCount++
      severity = severity === 'low' ? 'mid' : 'high'
      note += ` · 부사 ‘${det.adverb}’ 가 붙어 있어요(~게 말했다 패턴)`
      alt = `부사 ‘${det.adverb}’ 를 빼고, 감정을 행동으로 보여 주세요. ${alt}`
    }

    findings.push({
      index: idx + 1,
      dialogue: clip(it.dialogue, 48),
      tag: det.raw,
      verbLabel: label,
      kind: det.kind,
      adverb: det.adverb,
      severity,
      note,
      alt,
    })
  })

  const tagged = findings.length
  const verbCounts = [...verbMap.entries()]
    .map(([label, v]) => ({ label, count: v.count, kind: v.kind }))
    .sort((a, b) => b.count - a.count)

  const topTag = verbCounts.length ? { label: verbCounts[0].label, count: verbCounts[0].count } : null

  // 다양성: 서로 다른 동사 종류 / 태그 수. 한 동사가 독점하면 낮다.
  const distinct = verbCounts.length
  const variety = tagged > 0 ? Math.round((distinct / tagged) * 100) : 0
  // 상한 보정: 태그가 적으면 다양성 점수가 과장되지 않게
  const varietyScore = tagged < 3 ? Math.min(variety, 100) : variety

  const warnings: { level: Severity; text: string }[] = []
  if (tagged > 0) {
    const bookPct = (bookismCount / tagged) * 100
    const advPct = (adverbCount / tagged) * 100
    if (bookPct >= 40) warnings.push({ level: 'high', text: `발화동사의 ${Math.round(bookPct)}%가 said-bookism입니다. ‘말했다/물었다’의 비중을 늘리세요.` })
    else if (bookPct >= 20) warnings.push({ level: 'mid', text: `said-bookism 비율이 ${Math.round(bookPct)}%로 다소 높습니다. 강조가 필요한 대사에만 남기세요.` })
    if (advPct >= 30) warnings.push({ level: 'high', text: `태그의 ${Math.round(advPct)}%에 부사가 붙어 있습니다(~게 말했다). 부사 대신 행동·대사로 감정을 보이세요.` })
    else if (advPct >= 15) warnings.push({ level: 'mid', text: `태그 부사 비율이 ${Math.round(advPct)}%입니다. 반복되는 부사부터 정리해 보세요.` })
    if (topTag && topTag.count >= 4 && topTag.count / tagged >= 0.5) {
      warnings.push({ level: 'mid', text: `‘${topTag.label}’ 태그가 ${topTag.count}번(전체의 ${Math.round((topTag.count / tagged) * 100)}%) 반복됩니다. 일부는 행동 비트로 바꿔 단조로움을 줄이세요.` })
    }
    const noTagPct = total0Pct(noTagCount, items.length)
    if (noTagPct >= 70 && items.length >= 6) {
      warnings.push({ level: 'low', text: `대사의 ${noTagPct}%에 태그가 없습니다. 화자 혼동이 없다면 좋은 신호지만, 누가 말하는지 명확한지 점검하세요.` })
    }
  }
  if (warnings.length === 0 && tagged > 0) {
    warnings.push({ level: 'low', text: '눈에 띄는 태그 문제가 없습니다. 투명한 태그와 행동 비트가 균형 잡혀 있어요.' })
  }

  return {
    total: items.length,
    tagged,
    findings,
    verbCounts,
    bookismCount,
    adverbCount,
    plainCount,
    noTagCount,
    topTag,
    varietyScore,
    warnings,
  }
}
function total0Pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

const SEV_COLOR: Record<Severity, string> = { high: 'var(--warn)', mid: 'var(--accent)', low: 'var(--ok)' }
const SEV_LABEL: Record<Severity, string> = { high: '주의', mid: '점검', low: '양호' }

/* ───────── 컴포넌트 ───────── */
export default function DialogueTagDoctor({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'report' | 'beats'>('report')
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const flashTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)
  const aliveRef = useRef(true)

  // payload 로 전달된 본문(연계 도구에서 열 때)
  useEffect(() => {
    const pb = payload && (payload.text || payload.body)
    if (typeof pb === 'string' && pb.trim()) setText(pb)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // localStorage 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { text?: string }
        if (typeof p.text === 'string') setText((cur) => cur || p.text || '')
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // localStorage 저장(디바운스)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ text })) } catch { /* 용량 초과 무시 */ }
    }, 400)
    return () => clearTimeout(t)
  }, [text])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (flashTimer.current != null) clearTimeout(flashTimer.current)
    }
  }, [])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (aliveRef.current) setFlash('') }, 2400)
  }

  const a = useMemo(() => analyze(text), [text])

  const visibleFindings = useMemo(() => {
    if (!a) return []
    return onlyProblems ? a.findings.filter((f) => f.severity !== 'low') : a.findings
  }, [a, onlyProblems])

  const reportText = useMemo(() => {
    if (!a) return ''
    const L: string[] = []
    L.push('[대화 태그 닥터 진단]')
    L.push(`대사 ${a.total}개 · 태그 달린 대사 ${a.tagged}개 · 태그 없음 ${a.noTagCount}개`)
    L.push(`said-bookism ${a.bookismCount}개 · 투명 태그 ${a.plainCount}개 · 부사 붙은 태그 ${a.adverbCount}개`)
    L.push(`태그 다양성 ${a.varietyScore}점(서로 다른 동사 ${a.verbCounts.length}종)`)
    if (a.topTag) L.push(`가장 많이 쓴 태그: ‘${a.topTag.label}’ ${a.topTag.count}회`)
    L.push('')
    L.push('● 경고/조언')
    a.warnings.forEach((w) => L.push(`- [${SEV_LABEL[w.level]}] ${w.text}`))
    L.push('')
    L.push('● 동사 빈도')
    a.verbCounts.forEach((v) => L.push(`- ${v.label} (${v.kind === 'bookism' ? 'said-bookism' : '투명'}) : ${v.count}회`))
    const probs = a.findings.filter((f) => f.severity !== 'low')
    if (probs.length) {
      L.push('')
      L.push('● 점검이 필요한 대사')
      probs.slice(0, 40).forEach((f) => {
        L.push(`#${f.index} "${f.dialogue}"`)
        L.push(`   진단: ${f.note}`)
        L.push(`   대안: ${f.alt}`)
      })
    }
    return L.join('\n')
  }, [a])

  const copyReport = async () => {
    if (!reportText) return
    try {
      await navigator.clipboard.writeText(reportText)
      showFlash('진단 리포트를 클립보드에 복사했어요.')
    } catch { showFlash('복사에 실패했어요. 권한을 확인해 주세요.') }
  }

  const sendToProject = () => {
    if (!a || !hasProjectBridge()) return
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const parts: string[] = []
    parts.push('<h2>대화 태그 닥터 진단</h2>')
    parts.push(`<p>대사 ${a.total}개 · 태그 ${a.tagged}개 · said-bookism ${a.bookismCount}개 · 부사 태그 ${a.adverbCount}개 · 다양성 ${a.varietyScore}점</p>`)
    parts.push('<h3>경고·조언</h3><ul>')
    a.warnings.forEach((w) => parts.push(`<li>[${esc(SEV_LABEL[w.level])}] ${esc(w.text)}</li>`))
    parts.push('</ul>')
    parts.push('<h3>동사 빈도</h3><ul>')
    a.verbCounts.forEach((v) => parts.push(`<li>${esc(v.label)} (${v.kind === 'bookism' ? 'said-bookism' : '투명'}) — ${v.count}회</li>`))
    parts.push('</ul>')
    const probs = a.findings.filter((f) => f.severity !== 'low').slice(0, 50)
    if (probs.length) {
      parts.push('<h3>점검이 필요한 대사</h3>')
      probs.forEach((f) => {
        parts.push(`<p><b>#${f.index}</b> &quot;${esc(f.dialogue)}&quot;<br/>진단: ${esc(f.note)}<br/>대안: ${esc(f.alt)}</p>`)
      })
    }
    const id = addToProject({
      root: 'research',
      folder: '교정',
      title: `대화 태그 진단 (${new Date().toLocaleDateString('ko-KR')})`,
      bodyHtml: parts.join('\n'),
      meta: { 'said-bookism': String(a.bookismCount), '부사태그': String(a.adverbCount), '다양성': String(a.varietyScore) },
    })
    showFlash(id ? '진단 리포트를 프로젝트에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  const stashBeat = (beat: string, emotion: string) => {
    if (!hasStash()) { showFlash('수집함을 사용할 수 없는 환경이에요.'); return }
    addToStash({ kind: 'memo', label: `행동 비트 · ${emotion}`, text: beat })
    showFlash('행동 비트를 수집함에 담았어요.')
  }

  /* ── 바인더 드롭 ── */
  const handleDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const body = (it.text || '').trim()
    if (!body) { showFlash(`‘${it.title}’ 에 본문 텍스트가 없어요.`); return }
    setText((cur) => (cur.trim() ? cur + '\n\n' + body : body))
    showFlash(`‘${it.title}’ 본문을 가져왔어요.`)
  }

  /* ── 예시 채우기 ── */
  const fillExample = () => {
    setText(
      '"여기서 뭐 하는 거야?" 그가 날카롭게 외쳤다.\n' +
      '"아무것도 아니야." 그녀가 작은 목소리로 중얼거렸다.\n' +
      '"거짓말하지 마." 그는 차갑게 말했다.\n' +
      '"……" 그녀는 고개를 떨구었다.\n' +
      '"제발." 그녀가 울먹였다. "한 번만 믿어 줘."\n' +
      '"믿으라고?" 그가 코웃음을 쳤다. "네가 한 짓을 봐."\n' +
      '"그건 오해야!" 그녀가 소리쳤다.\n' +
      '"오해라니." 그는 단호하게 말했다. 그러고는 등을 돌렸다.'
    )
    setTab('report')
  }

  /* ───────── 스타일 ───────── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, overflow: 'hidden' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 220, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 20, gap: 12 }
  const tabBtn = (on: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: '1px solid var(--border)', background: on ? 'var(--accent)' : 'var(--panel)', color: on ? '#fff' : 'var(--text)',
  })

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: dragOver ? -6 : 0 }}
      onDragEnter={(e) => { if (!isItemDrag(e)) return; e.preventDefault(); dragDepth.current += 1; setDragOver(true) }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 6, zIndex: 50, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', fontSize: 15, fontWeight: 700 }}>
          <Emoji e="📥"/> 바인더 파일을 놓으면 본문으로 가져옵니다
        </div>
      )}

      <div style={topbar}>
        <div style={titleStyle}><span><Emoji e={meta.icon}/></span><span>대화 태그 닥터</span></div>
        <button style={tabBtn(tab === 'report')} onClick={() => setTab('report')}><Emoji e="🩺"/> 진단</button>
        <button style={tabBtn(tab === 'beats')} onClick={() => setTab('beats')}><Emoji e="🎬"/> 행동 비트 사전</button>
      </div>

      <div style={body}>
        {/* 입력 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>대사가 포함된 소설 본문을 붙여넣으세요</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="minibtn" onClick={fillExample}>예시</button>
            <button className="minibtn" onClick={() => setText('')} disabled={!text}>↺ 지우기</button>
          </div>
        </div>
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'예) "정말이야?" 그가 놀란 듯 외쳤다. "믿을 수 없어."\n큰따옴표(" “”), 작은따옴표(‘’), 낫표(「」『』) 지원\n좌측 바인더 파일을 끌어다 놓아도 됩니다.'}
          spellCheck={false}
          aria-label="대화 태그 닥터 본문 입력"
        />

        {tab === 'report' ? (
          !a ? (
            <div style={empty}>
              <div style={{ fontSize: 34 }}><Emoji e="🩺"/></div>
              <div>본문을 입력하면 대사에 붙은 발화동사·부사·태그 빈도를<br />진단하고 행동 비트 대안을 제시합니다.</div>
              <button className="btn-primary" onClick={fillExample}>예시로 체험하기</button>
            </div>
          ) : (
            <div style={scroll}>
              {/* 통계 카드 */}
              <div style={grid4}>
                <div style={stat}><div style={statVal}>{a.total}</div><div style={statLabel}>대사 수</div></div>
                <div style={stat}><div style={{ ...statVal, color: a.bookismCount > 0 ? 'var(--warn)' : 'var(--ok)' }}>{a.bookismCount}</div><div style={statLabel}>said-bookism</div></div>
                <div style={stat}><div style={{ ...statVal, color: a.adverbCount > 0 ? 'var(--warn)' : 'var(--ok)' }}>{a.adverbCount}</div><div style={statLabel}>부사 붙은 태그</div></div>
                <div style={stat}><div style={statVal}>{a.varietyScore}</div><div style={statLabel}>태그 다양성</div></div>
              </div>

              {/* 경고 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={sectionTitle}><Emoji e="⚠️"/> 진단 결과</div>
                {a.warnings.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${SEV_COLOR[w.level]}`, borderRadius: 8, padding: '8px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[w.level], whiteSpace: 'nowrap', marginTop: 1 }}>{SEV_LABEL[w.level]}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55 }}>{w.text}</span>
                  </div>
                ))}
              </div>

              {/* 동사 빈도 표 + 막대 */}
              {a.verbCounts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={sectionTitle}><Emoji e="📊"/> 발화동사 빈도</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {a.verbCounts.map((v) => {
                      const max = a.verbCounts[0].count || 1
                      const pct = (v.count / max) * 100
                      const isBook = v.kind === 'bookism'
                      return (
                        <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 110, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isBook ? 'var(--warn)' : 'var(--ok)', flexShrink: 0 }} />
                            {v.label}
                          </div>
                          <div style={{ flex: 1, height: 18, background: 'var(--panel)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: isBook ? 'var(--warn)' : 'var(--accent)', borderRadius: 5, transition: 'width .25s' }} />
                          </div>
                          <div style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{v.count}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={hint}>● <span style={{ color: 'var(--ok)' }}>초록</span> 투명한 태그(권장) · <span style={{ color: 'var(--warn)' }}>주황</span> said-bookism(남용 주의)</div>
                </div>
              )}

              {/* 문제 대사 목록 */}
              {a.findings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={sectionTitle}><Emoji e="🗣️"/> 대사별 진단 ({visibleFindings.length}건)</div>
                    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                      문제만 보기
                    </label>
                  </div>
                  {visibleFindings.length === 0 ? (
                    <div style={hint}>문제로 표시된 태그가 없습니다. <Emoji e="👍"/></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {visibleFindings.slice(0, 120).map((f) => (
                        <div key={f.index} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: `3px solid ${SEV_COLOR[f.severity]}`, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 26 }}>#{f.index}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5 }}>“{f.dialogue}”</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: SEV_COLOR[f.severity], borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>{SEV_LABEL[f.severity]}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, paddingLeft: 34 }}>{f.note}</div>
                          {f.severity !== 'low' && (
                            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, paddingLeft: 34, display: 'flex', gap: 5 }}>
                              <span style={{ color: 'var(--ok)', fontWeight: 700 }}>대안</span>
                              <span style={{ flex: 1 }}>{f.alt}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {visibleFindings.length > 120 && <div style={hint}>건수가 많아 120건까지만 표시합니다.</div>}
                    </div>
                  )}
                </div>
              )}

              {/* 액션 바 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 2 }}>
                <button className="btn-primary" onClick={copyReport}><Emoji e="📋"/> 리포트 복사</button>
                {hasProjectBridge() && <button className="minibtn" onClick={sendToProject}><Emoji e="📄"/> 프로젝트에 추가</button>}
                <button className="linkbtn" onClick={() => openToolLinked('adverb-highlighter', { text })}>부사 하이라이터 ↗</button>
                <button className="linkbtn" onClick={() => openToolLinked('dialogue-ratio', { text })}>대화/지문 비율 ↗</button>
              </div>
            </div>
          )
        ) : (
          /* 행동 비트 사전 탭 */
          <div style={scroll}>
            <div style={hint}>
              said-bookism이나 부사 대신 끼워 넣을 수 있는 자작 행동 비트(action beat)입니다.
              대사 앞뒤에 한 문장 넣으면 누가·어떤 감정으로 말하는지 자연스럽게 드러납니다.
            </div>
            {ACTION_BEATS.map((g) => (
              <div key={g.emotion} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={sectionTitle}><Emoji e="🎭"/> {g.emotion}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {g.beats.map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{b}</span>
                      <button className="minibtn" onClick={async () => { try { await navigator.clipboard.writeText(b); showFlash('복사했어요.') } catch { showFlash('복사 실패') } }}>복사</button>
                      {hasStash() && <button className="minibtn" onClick={() => stashBeat(b, g.emotion)}>＋수집</button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {flash && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--text)', color: 'var(--paper)', fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', maxWidth: '88%', textAlign: 'center' }}>
          {flash}
        </div>
      )}
    </div>
  )
}
