// 블로그·SEO 분석기 모듈 — 한국어 블로그/SEO 글쓰기 특성 반영.
// node --experimental-strip-types 로 단독 실행 가능하도록 .ts 확장자 import 만 사용(배럴 금지).
import type { Analyzer, AnalyzerResult, AnalyzerContext, Tier } from '../analyzers.ts'
import type { BinderItem } from '../../model/types.ts'
import {
  splitSentences,
  wordTokens,
  splitParagraphs,
  hasKorean,
  charsNoSpace,
} from '../text.ts'

// ─────────────────────────────────────────────────────────────────────────
// 공용 소도구(모두 빈 입력 가드).
// ─────────────────────────────────────────────────────────────────────────

/** 활성 문서의 평문(없으면 원고 전체). */
function docText(ctx: AnalyzerContext): string {
  const t = (ctx.activeText ?? '').trim()
  return t || (ctx.full ?? '').trim()
}

/** 활성 문서의 표시 제목(seo.metaTitle > title > 첫 H1 > 빈문자). */
function docTitle(ctx: AnalyzerContext, text: string): string {
  const a = ctx.active as (BinderItem & { seo?: { metaTitle?: string } }) | null
  const meta = a?.seo?.metaTitle?.trim()
  if (meta) return meta
  const title = a?.title?.trim()
  if (title && title !== '(제목 없음)') return title
  const h1 = firstHeading(text)
  return h1 || (title ?? '')
}

interface Heading {
  level: number
  text: string
}

/** 마크다운식(#) 헤딩 라인을 추출. RTF→평문에 # 가 남는 경우를 대상으로 함. */
function parseHeadings(text: string): Heading[] {
  const out: Heading[] = []
  if (!text) return out
  for (const raw of text.split(/\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    if (m) out.push({ level: m[1].length, text: m[2].trim() })
  }
  return out
}

function firstHeading(text: string): string {
  const h = parseHeadings(text)
  return h.length ? h[0].text : ''
}

function pct(n: number, d: number): number {
  if (!d || !isFinite(d)) return 0
  const v = (n / d) * 100
  return isFinite(v) ? v : 0
}

function round(n: number, digits = 1): number {
  if (!isFinite(n)) return 0
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

/** 한 문장의 길이(한국어=공백제외 글자수, 그 외=단어수)로 가독성 척도 통일. */
function sentenceLen(s: string): number {
  return hasKorean(s) ? charsNoSpace(s) : wordTokens(s).length
}

// ─────────────────────────────────────────────────────────────────────────
// 1) 헤딩 구조 트리(H1–H3 아웃라인, 단일 H1·레벨 점프 점검)
// ─────────────────────────────────────────────────────────────────────────
const headingTree: Analyzer = {
  id: 'bl-heading-tree',
  name: '헤딩 구조 트리',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '문서의 #/##/### 헤딩으로 아웃라인을 만들고 H1 단일성과 레벨 점프를 점검합니다.',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const heads = parseHeadings(text)
    if (heads.length === 0) {
      return {
        kind: 'sections',
        sections: [],
        note: '헤딩(#, ##, ### …)을 찾지 못했습니다. 본문에 제목 구조를 추가하면 가독성과 SEO에 도움이 됩니다.',
      }
    }
    const h1s = heads.filter((h) => h.level === 1)
    // 아웃라인: 레벨별 들여쓰기 + 점프 표시.
    const outline: string[] = []
    let prev = 0
    for (const h of heads) {
      const indent = '   '.repeat(Math.max(0, Math.min(h.level, 4) - 1))
      const mark = '#'.repeat(h.level)
      let line = `${indent}${mark} ${h.text}`
      if (prev && h.level > prev + 1) line += `  ⚠ 레벨 점프(H${prev}→H${h.level})`
      outline.push(line)
      prev = h.level
    }
    const issues: string[] = []
    if (h1s.length === 0) issues.push('H1(최상위 제목)이 없습니다. 문서당 H1 1개를 권장합니다.')
    else if (h1s.length > 1) issues.push(`H1이 ${h1s.length}개입니다. 문서당 H1은 1개가 이상적입니다.`)
    // 레벨 점프 재집계.
    let jumps = 0
    prev = 0
    for (const h of heads) {
      if (prev && h.level > prev + 1) jumps++
      prev = h.level
    }
    if (jumps > 0) issues.push(`레벨 점프 ${jumps}건(상위 레벨을 건너뜀). 순차적으로 내려가도록 정리하세요.`)
    if (heads[0] && heads[0].level !== 1) issues.push(`첫 헤딩이 H${heads[0].level}입니다. 보통 H1로 시작합니다.`)

    const sections: { heading: string; items: string[] }[] = [
      { heading: `아웃라인 (헤딩 ${heads.length}개)`, items: outline },
    ]
    sections.push({
      heading: issues.length ? `점검 결과 (${issues.length}건)` : '점검 결과',
      items: issues.length ? issues : ['구조 양호: H1 단일, 레벨 점프 없음.'],
    })
    return {
      kind: 'sections',
      sections,
      note: `H1 ${h1s.length} · H2 ${heads.filter((h) => h.level === 2).length} · H3 ${heads.filter((h) => h.level === 3).length}`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 2) 가독성 점수(문장/문단 길이 + 어려운 한자어 비율 추정)
// ─────────────────────────────────────────────────────────────────────────
// 한국어 가독성 저해 요인을 근사: 긴 문장, 긴 문단, 3음절↑ 한자계 추정 어휘.
const READ_SUFFIX = /(적|성|화|성을|화를|적인|성의|화의|관|법|론|식|제|체|상|하|간|위|차|시|기)$/

/** 어절이 '한자어로 추정되는 어려운 어휘'인지 근사(전부 한글 + 길이 3↑ + 한자계 접미사). */
function looksSino(token: string): boolean {
  if (!/^[가-힣]+$/.test(token)) return false
  if (token.length < 3) return false
  return READ_SUFFIX.test(token)
}

const readability: Analyzer = {
  id: 'bl-readability',
  name: '가독성 점수',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '문장·문단 길이와 어려운 한자어 비율을 근사해 0–100 가독성 점수를 냅니다(높을수록 읽기 쉬움).',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const sents = splitSentences(text)
    const paras = splitParagraphs(text)
    const tokens = wordTokens(text)
    if (sents.length === 0 || tokens.length === 0) {
      return {
        kind: 'score',
        score: 0,
        max: 100,
        checks: [{ label: '본문 없음', pass: false, detail: '분석할 텍스트가 없습니다.', tier: 'warn' }],
        note: '본문을 입력하면 가독성을 평가합니다.',
      }
    }
    const avgSentLen = sents.reduce((a, s) => a + sentenceLen(s), 0) / sents.length
    const avgParaSents = paras.length
      ? sents.length / paras.length
      : sents.length
    const sino = tokens.filter(looksSino).length
    const sinoPct = pct(sino, tokens.length)

    // 점수: 100에서 감점. 한국어 기준 문장 40자 이하 권장.
    let score = 100
    if (avgSentLen > 40) score -= Math.min(30, (avgSentLen - 40) * 1.2)
    else if (avgSentLen > 30) score -= (avgSentLen - 30) * 0.6
    if (avgParaSents > 5) score -= Math.min(20, (avgParaSents - 5) * 4)
    if (sinoPct > 12) score -= Math.min(25, (sinoPct - 12) * 1.5)
    score = Math.max(0, Math.min(100, Math.round(score)))

    const sentTier: Tier = avgSentLen > 50 ? 'bad' : avgSentLen > 40 ? 'warn' : 'ok'
    const paraTier: Tier = avgParaSents > 7 ? 'bad' : avgParaSents > 5 ? 'warn' : 'ok'
    const sinoTier: Tier = sinoPct > 20 ? 'bad' : sinoPct > 12 ? 'warn' : 'ok'

    return {
      kind: 'score',
      score,
      max: 100,
      checks: [
        {
          label: '평균 문장 길이',
          pass: sentTier === 'ok',
          detail: `${round(avgSentLen)}${hasKorean(text) ? '자' : '단어'} (권장 ≤ 40자)`,
          tier: sentTier,
        },
        {
          label: '문단당 문장 수',
          pass: paraTier === 'ok',
          detail: `${round(avgParaSents)}문장/문단 (권장 ≤ 5)`,
          tier: paraTier,
        },
        {
          label: '어려운 한자어 비율(추정)',
          pass: sinoTier === 'ok',
          detail: `${round(sinoPct)}% (권장 ≤ 12%)`,
          tier: sinoTier,
        },
      ],
      note: `문장 ${sents.length} · 문단 ${paras.length} · 어절 ${tokens.length}`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 3) 전환어·접속어 분석(문단 시작의 응집성 표현 비율)
// ─────────────────────────────────────────────────────────────────────────
const TRANSITIONS = [
  '그리고', '그러나', '하지만', '그런데', '그래서', '따라서', '그러므로', '그러면',
  '또한', '또', '게다가', '더욱이', '한편', '반면', '반대로', '결국', '즉', '예를 들어',
  '예컨대', '특히', '무엇보다', '먼저', '우선', '다음으로', '마지막으로', '끝으로',
  '요컨대', '정리하면', '결론적으로', '물론', '그렇다면', '이처럼', '이렇게', '이와 같이',
  '왜냐하면', '다만', '오히려', '아울러', '한마디로',
]

const transition: Analyzer = {
  id: 'bl-transition',
  name: '전환어·접속어 비율',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '문단 첫머리에 접속/전환 표현이 얼마나 쓰였는지로 글의 응집성을 가늠합니다.',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    // 헤딩 라인은 문단에서 제외.
    const paras = splitParagraphs(text).filter((p) => !/^#{1,6}\s/.test(p))
    if (paras.length === 0) {
      return {
        kind: 'gauge',
        value: 0,
        max: 100,
        unit: '%',
        label: '전환어로 시작하는 문단',
        tier: 'warn',
        note: '분석할 문단이 없습니다.',
      }
    }
    let hits = 0
    for (const p of paras) {
      const head = p.slice(0, 14)
      if (TRANSITIONS.some((t) => head.startsWith(t))) hits++
    }
    const ratio = pct(hits, paras.length)
    // 10~40% 권장: 너무 적으면 단절감, 너무 많으면 군더더기.
    const tier: Tier = ratio < 8 ? 'warn' : ratio > 45 ? 'warn' : 'ok'
    const note =
      ratio < 8
        ? '전환 표현이 적어 문단 간 흐름이 끊길 수 있습니다.'
        : ratio > 45
          ? '전환어가 과다합니다. 일부는 군더더기일 수 있어요.'
          : '문단 연결이 자연스러운 범위입니다(권장 10–40%).'
    return {
      kind: 'gauge',
      value: round(ratio),
      max: 100,
      unit: '%',
      label: `전환어로 시작하는 문단 (${hits}/${paras.length})`,
      tier,
      note,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 4) 수동태(피동) 비율 검사
// ─────────────────────────────────────────────────────────────────────────
// 한국어 피동/이중피동 추정: 피동 접미사(이/히/리/기) + '-되다/-어지다/-게 되다' 표현.
const PASSIVE_RE =
  /([가-힣]{1,4}(?:이|히|리|기)(?:었|었었)?다)|([가-힣]+되(?:었|어|고|며|면|는|지)?)|([가-힣]+(?:아|어)지(?:었|어|고|며|면|는|다))|(게\s*되(?:었|어|고|는|다))/g

const passive: Analyzer = {
  id: 'bl-passive',
  name: '수동태(피동) 비율',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '피동·이중피동 표현 비율을 추정합니다. 능동태가 많을수록 또렷한 글이 됩니다.',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const sents = splitSentences(text)
    if (sents.length === 0) {
      return {
        kind: 'gauge',
        value: 0,
        max: 100,
        unit: '%',
        label: '피동 표현 포함 문장',
        tier: 'ok',
        note: '분석할 문장이 없습니다.',
      }
    }
    let hits = 0
    for (const s of sents) {
      PASSIVE_RE.lastIndex = 0
      if (PASSIVE_RE.test(s)) hits++
    }
    const ratio = pct(hits, sents.length)
    const tier: Tier = ratio > 35 ? 'bad' : ratio > 20 ? 'warn' : 'ok'
    const note =
      tier === 'ok'
        ? '능동태 비중이 높습니다(권장 피동 ≤ 20%).'
        : '피동 표현이 많습니다. 주어를 분명히 한 능동문으로 바꿔보세요.'
    return {
      kind: 'gauge',
      value: round(ratio),
      max: 100,
      unit: '%',
      label: `피동 표현 포함 문장 (${hits}/${sents.length})`,
      tier,
      note,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 5) 헤드라인(제목) 분석 점수
// ─────────────────────────────────────────────────────────────────────────
const POWER_WORDS = [
  '완벽', '총정리', '핵심', '비결', '비법', '꿀팁', '무료', '최신', '가이드', '방법',
  '이유', '실전', '추천', '베스트', '필수', '쉽게', '한눈에', '검증', '후기', '리뷰',
  '비교', '정리', '주의', '실수', '효과', '결과', '경험', '솔직', '전격',
]
const CURIOSITY = ['왜', '어떻게', '무엇', '진짜', '과연', '?']

const headline: Analyzer = {
  id: 'bl-headline',
  name: '헤드라인(제목) 점수',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '제목의 길이, 숫자 포함, 파워워드, 호기심 유발 요소를 점검합니다(활성 문서 제목 또는 첫 H1).',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const title = docTitle(ctx, text).trim()
    if (!title) {
      return {
        kind: 'score',
        score: 0,
        max: 5,
        checks: [{ label: '제목 없음', pass: false, detail: '문서 제목 또는 H1을 찾지 못했습니다.', tier: 'warn' }],
        note: '문서 제목이나 H1 헤딩을 작성하면 분석합니다.',
      }
    }
    const len = title.length // 한글 기준 글자수(검색결과 노출 한계 근사).
    const hasNumber = /\d/.test(title)
    const power = POWER_WORDS.find((w) => title.includes(w))
    const curiosity = CURIOSITY.find((w) => title.includes(w))
    // 한국어 제목 권장: 15~35자(검색 노출/가독성).
    const lenOk = len >= 15 && len <= 40
    const lenTier: Tier = len < 8 ? 'bad' : lenOk ? 'ok' : 'warn'

    const checks = [
      {
        label: '길이 (15–40자 권장)',
        pass: lenOk,
        detail: `${len}자`,
        tier: lenTier,
      },
      {
        label: '숫자 포함(리스트형/구체성)',
        pass: hasNumber,
        detail: hasNumber ? '숫자 있음' : '숫자 없음 — "5가지", "2026" 등 추가 고려',
        tier: (hasNumber ? 'ok' : 'warn') as Tier,
      },
      {
        label: '파워워드',
        pass: !!power,
        detail: power ? `'${power}' 포함` : '없음 — 핵심·총정리·꿀팁 등 고려',
        tier: (power ? 'ok' : 'warn') as Tier,
      },
      {
        label: '호기심 유발(의문/강조)',
        pass: !!curiosity,
        detail: curiosity ? `'${curiosity}' 포함` : '없음 — 왜/어떻게/? 등 고려',
        tier: (curiosity ? 'ok' : 'warn') as Tier,
      },
    ]
    const score = checks.filter((c) => c.pass).length
    return {
      kind: 'score',
      score,
      max: 4,
      checks,
      note: `제목: "${title.length > 50 ? title.slice(0, 50) + '…' : title}"`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 6) 키워드 밀도 & 동시출현
// ─────────────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '그런데', '그래서', '있다', '없다', '하다', '되다', '이다',
  '있는', '없는', '하는', '되는', '것', '것이', '것을', '것은', '수', '등', '및', '또',
  '더', '를', '을', '이', '가', '은', '는', '에', '의', '와', '과', '도', '로', '으로',
  '에서', '에게', '한', '하고', '하면', '때', '저', '그', '이런', '저런', '그런', '대한',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'are', 'for', 'on', 'with', 'it',
])

const keywordDensity: Analyzer = {
  id: 'bl-keyword-density',
  name: '키워드 밀도 & 빈출어',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '포커스 키워드 밀도(권장 0.5–3%)를 확인합니다. 키워드가 없으면 상위 빈출어를 제시합니다.',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const tokens = wordTokens(text).map((t) => t.toLowerCase())
    if (tokens.length === 0) {
      return {
        kind: 'list',
        items: [],
        empty: '본문이 비어 있어 키워드를 계산할 수 없습니다.',
      }
    }
    const a = ctx.active as (BinderItem & { seo?: { focusKeyword?: string } }) | null
    const focus = a?.seo?.focusKeyword?.trim()

    if (focus) {
      // 포커스 키워드 밀도(어절 기반 count, 다어절 키워드는 부분일치 근사).
      const fLower = focus.toLowerCase()
      const fTokens = wordTokens(fLower)
      let count = 0
      if (fTokens.length <= 1) {
        count = tokens.filter((t) => t === fLower).length
      } else {
        // 다어절: 원문에서 등장 횟수.
        const re = new RegExp(fLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        count = (text.toLowerCase().match(re) || []).length
      }
      const density = pct(count * Math.max(1, fTokens.length), tokens.length)
      const tier: Tier = count === 0 ? 'bad' : density < 0.5 ? 'warn' : density > 3 ? 'bad' : 'ok'
      return {
        kind: 'gauge',
        value: round(density, 2),
        max: 5,
        unit: '%',
        label: `'${focus}' 밀도 (${count}회)`,
        tier,
        note:
          count === 0
            ? '포커스 키워드가 본문에 한 번도 등장하지 않습니다.'
            : tier === 'ok'
              ? '권장 밀도(0.5–3%) 범위입니다.'
              : density > 3
                ? '키워드 과다(스터핑) 위험. 자연스럽게 줄이세요.'
                : '키워드 노출이 적습니다. 제목·소제목·첫 문단에 보강하세요.',
      }
    }

    // 포커스 키워드 없음 → 상위 빈출어 목록.
    const freq = new Map<string, number>()
    for (const t of tokens) {
      if (t.length < 2) continue
      if (STOPWORDS.has(t)) continue
      if (/^\d+$/.test(t)) continue
      freq.set(t, (freq.get(t) || 0) + 1)
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    if (top.length === 0) {
      return {
        kind: 'list',
        items: [],
        empty: '의미 있는 빈출어를 찾지 못했습니다.',
      }
    }
    return {
      kind: 'list',
      items: top.map(([w, c]) => {
        const d = round(pct(c, tokens.length), 2)
        const tier: Tier = d > 3 ? 'warn' : 'ok'
        return { text: `${w} — ${c}회`, sub: `밀도 ${d}%`, tier }
      }),
      note: '포커스 키워드(seo.focusKeyword) 미설정 — 상위 빈출어 표시. 핵심어를 정하면 밀도 게이지로 전환됩니다.',
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 7) 슬러그(URL) 생성/검증
// ─────────────────────────────────────────────────────────────────────────
// 한글 → 로마자(국어의 로마자 표기 근사) 매핑. 완벽 변환 아님 — 슬러그 제안용.
const ROMAN_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const ROMAN_MEDIAL = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo',
  'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
]
const ROMAN_FINAL = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l', 'p', 'l', 'm',
  'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't',
]

function romanizeKo(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0) || 0
    if (code >= 0xac00 && code <= 0xd7a3) {
      const si = code - 0xac00
      const fin = si % 28
      const med = ((si - fin) / 28) % 21
      const ini = Math.floor((si - fin) / 28 / 21)
      out += (ROMAN_INITIAL[ini] || '') + (ROMAN_MEDIAL[med] || '') + (ROMAN_FINAL[fin] || '')
    } else {
      out += ch
    }
  }
  return out
}

function slugify(title: string): string {
  let s = title.normalize('NFC')
  if (hasKorean(s)) s = romanizeKo(s)
  return s
    .toLowerCase()
    .replace(/['"’“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

const slug: Analyzer = {
  id: 'bl-slug',
  name: '슬러그(URL) 생성·검증',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '제목으로부터 영문/로마자 하이픈 슬러그를 제안하고 길이·특수문자 등을 검증합니다.',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const title = docTitle(ctx, text).trim()
    const a = ctx.active as (BinderItem & { seo?: { slug?: string } }) | null
    const existing = a?.seo?.slug?.trim()

    const items: { text: string; sub?: string; tier?: Tier }[] = []

    if (!title && !existing) {
      return {
        kind: 'list',
        items: [],
        empty: '제목 또는 기존 슬러그가 없어 검증할 수 없습니다.',
      }
    }

    const suggested = title ? slugify(title) : ''
    if (suggested) {
      const len = suggested.length
      const lenTier: Tier = len === 0 ? 'bad' : len > 60 ? 'warn' : 'ok'
      items.push({
        text: `제안 슬러그: ${suggested || '(생성 실패)'}`,
        sub: `${len}자${len > 60 ? ' — 60자 이하 권장' : ''}`,
        tier: lenTier,
      })
      const words = suggested ? suggested.split('-').filter(Boolean).length : 0
      if (words > 6) {
        items.push({
          text: '단어 수가 많습니다',
          sub: `${words}개 — 핵심어 3–5개로 줄이면 좋습니다.`,
          tier: 'warn',
        })
      }
    } else if (title) {
      items.push({ text: '제안 슬러그 생성 실패', sub: '제목에서 영숫자를 추출하지 못했습니다.', tier: 'warn' })
    }

    // 기존 슬러그 검증.
    if (existing) {
      const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(existing)
      const hasUpper = /[A-Z]/.test(existing)
      const hasSpace = /\s/.test(existing)
      const hasSpecial = /[^a-z0-9-]/i.test(existing)
      const problems: string[] = []
      if (hasUpper) problems.push('대문자 포함')
      if (hasSpace) problems.push('공백 포함')
      if (hasSpecial) problems.push('특수문자/비ASCII 포함')
      if (existing.length > 60) problems.push('60자 초과')
      items.push({
        text: `기존 슬러그: ${existing}`,
        sub: valid && problems.length === 0 ? '형식 양호' : `문제: ${problems.join(', ') || '하이픈 형식 위반'}`,
        tier: (valid && problems.length === 0 ? 'ok' : 'bad') as Tier,
      })
    } else {
      items.push({ text: '기존 슬러그(seo.slug) 미설정', sub: '제안 슬러그를 적용하세요.', tier: 'warn' })
    }

    return { kind: 'list', items }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 8) 문장 길이 가독성 가드(너무 긴 문장 나열)
// ─────────────────────────────────────────────────────────────────────────
const LONG_KO = 60 // 공백 제외 글자수.
const LONG_EN = 35 // 단어수.

const sentenceLength: Analyzer = {
  id: 'bl-sentence-length',
  name: '긴 문장 가드',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '기준을 넘는 긴 문장을 모아 보여줍니다(한국어 60자/영어 35단어 초과).',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const sents = splitSentences(text)
    if (sents.length === 0) {
      return { kind: 'list', items: [], empty: '분석할 문장이 없습니다.' }
    }
    const long: { text: string; sub?: string; tier?: Tier }[] = []
    for (const s of sents) {
      const ko = hasKorean(s)
      const len = sentenceLen(s)
      const limit = ko ? LONG_KO : LONG_EN
      if (len > limit) {
        const tier: Tier = len > limit * 1.6 ? 'bad' : 'warn'
        const preview = s.length > 70 ? s.slice(0, 70) + '…' : s
        long.push({
          text: preview,
          sub: `${len}${ko ? '자' : '단어'} (기준 ${limit}${ko ? '자' : '단어'})`,
          tier,
        })
      }
    }
    long.sort((a, b) => {
      const na = parseInt(a.sub || '0', 10)
      const nb = parseInt(b.sub || '0', 10)
      return nb - na
    })
    if (long.length === 0) {
      return {
        kind: 'list',
        items: [],
        empty: `긴 문장이 없습니다. 전체 ${sents.length}문장 모두 기준 이내입니다.`,
        note: '읽기 좋은 길이입니다.',
      }
    }
    return {
      kind: 'list',
      items: long.slice(0, 30),
      note: `긴 문장 ${long.length}개 / 전체 ${sents.length}문장${long.length > 30 ? ' (상위 30개 표시)' : ''}. 두세 문장으로 나누면 가독성이 좋아집니다.`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 9) 문단 길이 균형(과도하게 긴 문단 경고)
// ─────────────────────────────────────────────────────────────────────────
const paragraphLength: Analyzer = {
  id: 'bl-paragraph-length',
  name: '문단 길이 균형',
  kind: '블로그·SEO',
  scope: 'document',
  intro: '문단별 글자 수를 비교해 과도하게 긴 문단을 찾습니다(모바일 가독성 점검).',
  run(ctx): AnalyzerResult {
    const text = docText(ctx)
    const paras = splitParagraphs(text).filter((p) => !/^#{1,6}\s/.test(p))
    if (paras.length === 0) {
      return {
        kind: 'bars',
        rows: [],
        note: '분석할 문단이 없습니다.',
      }
    }
    const lens = paras.map((p) => charsNoSpace(p))
    const maxLen = Math.max(1, ...lens)
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length
    // 권장: 문단 250자 이하(모바일). 평균 대비 2배 이상도 경고.
    const LIMIT = 250
    const rows = paras.map((p, i) => {
      const len = lens[i]
      const head = p.slice(0, 26).replace(/\s+/g, ' ').trim()
      const tier: Tier = len > LIMIT * 1.6 ? 'bad' : len > LIMIT ? 'warn' : 'ok'
      return {
        label: `${i + 1}. ${head}${p.length > 26 ? '…' : ''}`,
        value: len,
        max: maxLen,
        sub: `${len}자`,
        tier,
      }
    })
    const longCount = lens.filter((l) => l > LIMIT).length
    return {
      kind: 'bars',
      rows,
      note: `문단 ${paras.length}개 · 평균 ${Math.round(avg)}자 · 긴 문단(>${LIMIT}자) ${longCount}개. 긴 문단은 나눠 모바일 가독성을 높이세요.`,
    }
  },
}

export const ANALYZERS_BLOG: Analyzer[] = [
  headingTree,
  readability,
  transition,
  passive,
  headline,
  keywordDensity,
  slug,
  sentenceLength,
  paragraphLength,
]
