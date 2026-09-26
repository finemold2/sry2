// 언어 초점(Linguistic Focus) — 읽기 전용 하이라이트용 분석(한/영 휴리스틱).
// 형태소 분석기 없이 동작하는 근사: 대사/부사/수동태/접속어/반복/긴 문장.

export type FocusCat = 'dialogue' | 'adverb' | 'passive' | 'conjunction' | 'repeat' | 'long'

export const FOCUS_CATS: { key: FocusCat; label: string; color: string }[] = [
  { key: 'dialogue', label: '대사(직접화법)', color: '#cfe3ff' },
  { key: 'adverb', label: '부사', color: '#ffe0b3' },
  { key: 'passive', label: '수동태(추정)', color: '#f6c6d4' },
  { key: 'conjunction', label: '접속/전환어', color: '#d6f0c8' },
  { key: 'repeat', label: '반복 단어', color: '#e6d6f5' },
  { key: 'long', label: '긴 문장(40단어+)', color: '#f2efc4' },
]

// 채우기 우선순위(낮은 것부터 채우고 높은 것이 덮어씀)
const PRIORITY: FocusCat[] = ['long', 'repeat', 'conjunction', 'adverb', 'passive', 'dialogue']

const KO_ADVERBS = new Set([
  '아주', '매우', '너무', '정말', '빨리', '천천히', '조용히', '갑자기', '다시', '항상',
  '자주', '가끔', '거의', '모두', '함께', '점점', '결국', '마침내', '곧', '이미', '아직',
  '벌써', '또', '또한', '그냥', '바로', '잠깐', '문득', '슬며시', '가만히', '몹시', '꽤',
])
const KO_CONJ = new Set([
  '그리고', '그러나', '하지만', '그런데', '그래서', '따라서', '그러므로', '또한', '게다가',
  '그러면', '그렇지만', '한편', '즉', '다만', '반면', '오히려', '결국', '결과적으로', '그래도', '왜냐하면',
])
const EN_CONJ = new Set([
  'and', 'but', 'or', 'so', 'however', 'therefore', 'meanwhile', 'although', 'because', 'while',
  'yet', 'thus', 'hence', 'moreover', 'furthermore', 'nevertheless', 'whereas',
])
const EN_ADVERB_EXC = new Set(['family', 'only', 'reply', 'apply', 'supply', 'rely', 'italy', 'ally', 'belly', 'jelly', 'bully'])

export interface FocusResult {
  segments: { text: string; cat: FocusCat | null }[]
  counts: Record<FocusCat, number>
  truncated: boolean
}

const MAX = 60000

export function linguisticFocus(textIn: string, active: Set<FocusCat>): FocusResult {
  const truncated = textIn.length > MAX
  const text = truncated ? textIn.slice(0, MAX) : textIn
  const n = text.length
  const cover: (FocusCat | null)[] = new Array(n).fill(null)
  const counts: Record<FocusCat, number> = {
    dialogue: 0,
    adverb: 0,
    passive: 0,
    conjunction: 0,
    repeat: 0,
    long: 0,
  }

  const fill = (start: number, end: number, cat: FocusCat) => {
    for (let i = start; i < end && i < n; i++) cover[i] = cat
  }

  // 반복 단어 집합(먼저 계산)
  const freq = new Map<string, number>()
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0]
    const isEn = /[a-zA-Z]/.test(w)
    if ((isEn && w.length < 4) || (!isEn && w.length < 2)) continue
    const k = w.toLowerCase()
    freq.set(k, (freq.get(k) || 0) + 1)
  }
  const repeatSet = new Set([...freq.entries()].filter(([, c]) => c >= 4).map(([w]) => w))

  // 우선순위 낮은 것부터 채운다.
  // 1) long(문장 단위)
  if (active.has('long')) {
    for (const m of text.matchAll(/[^。.!?！？…\n]+[。.!?！？…]*/gu)) {
      const s = m[0]
      const wc = (s.match(/[\p{L}\p{N}]+/gu) || []).length
      if (wc > 40 && m.index != null) {
        fill(m.index, m.index + s.length, 'long')
        counts.long++
      }
    }
  }

  // 2) 단어 토큰 기반: repeat / conjunction / adverb / passive(한국어)
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0]
    const idx = m.index
    if (idx == null) continue
    const lc = w.toLowerCase()
    const isEn = /[a-zA-Z]/.test(w)

    if (active.has('repeat') && repeatSet.has(lc)) {
      fill(idx, idx + w.length, 'repeat')
      counts.repeat++
    }
    if (active.has('conjunction') && (KO_CONJ.has(w) || EN_CONJ.has(lc))) {
      fill(idx, idx + w.length, 'conjunction')
      counts.conjunction++
    }
    if (active.has('adverb')) {
      const koAdv = KO_ADVERBS.has(w) || (/[가-힣]$/.test(w) && /(게|히)$/.test(w) && w.length >= 2)
      const enAdv = isEn && /ly$/.test(lc) && lc.length > 3 && !EN_ADVERB_EXC.has(lc)
      if (koAdv || enAdv) {
        fill(idx, idx + w.length, 'adverb')
        counts.adverb++
      }
    }
    if (active.has('passive')) {
      const koPassive = !isEn && /(되었|되는|된|되고|되며|졌|지는|받았|받는|받은|당했|당하|당한)/.test(w)
      if (koPassive) {
        fill(idx, idx + w.length, 'passive')
        counts.passive++
      }
    }
  }

  // 3) 수동태(영문, be + 과거분사)
  if (active.has('passive')) {
    for (const m of text.matchAll(/\b(?:was|were|is|are|been|being|be)\s+[A-Za-z]+(?:ed|en)\b/gi)) {
      if (m.index != null) {
        fill(m.index, m.index + m[0].length, 'passive')
        counts.passive++
      }
    }
  }

  // 4) 대사(최우선) — 따옴표 짝
  if (active.has('dialogue')) {
    for (const m of text.matchAll(/“[^”]*”|"[^"]*"|‘[^’]*’|'[^']*'|「[^」]*」|『[^』]*』/gu)) {
      if (m.index != null) {
        fill(m.index, m.index + m[0].length, 'dialogue')
        counts.dialogue++
      }
    }
  }

  // cover → 세그먼트
  const segments: { text: string; cat: FocusCat | null }[] = []
  let i = 0
  while (i < n) {
    const cat = cover[i]
    let j = i + 1
    while (j < n && cover[j] === cat) j++
    segments.push({ text: text.slice(i, j), cat })
    i = j
  }
  // PRIORITY 는 채우기 순서 보장용(참조만)
  void PRIORITY
  return { segments, counts, truncated }
}
