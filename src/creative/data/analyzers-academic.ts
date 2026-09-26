// 카테고리 "학술" 분석기 모듈.
// 학술/논문 글쓰기 특성(헤지·부스터 균형, 인용 근거, 가독성, 명사화, 약어 일관성,
// 각주 밀도, 학술 수동태, 키워드 후보)을 한국어 중심으로 진단한다.
// 모든 run 은 순수 함수이며 빈 입력(scenes 0개/빈 텍스트/active null)에서도 throw 하지 않는다.
import type { Analyzer, AnalyzerResult, AnalyzerContext, Tier } from '../analyzers.ts'
import type { BinderItem } from '../../model/types.ts'
import { splitSentences, wordTokens, splitParagraphs, hasKorean } from '../text.ts'

// ---- 공용 소도구 (모듈 내부 전용) ------------------------------------------

/** 0 나누기 가드 비율(분모 0이면 0). */
function ratio(n: number, d: number): number {
  return d > 0 ? n / d : 0
}

/** 문장 일부를 라벨용으로 자른다. */
function snip(s: string, max = 60): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

/** 분석 대상 본문: 활성 문서가 있으면 그것, 없으면 원고 전체. 항상 문자열 보장. */
function targetText(ctx: AnalyzerContext): string {
  return (ctx.activeText && ctx.activeText.trim() ? ctx.activeText : ctx.full) || ''
}

// 헤지(완화어) / 부스터(강조어) 사전 — 한국어 학술체 중심 + 일부 영어.
const HEDGE_PATTERNS: RegExp[] = [
  /(으)?로\s*보인다/g,
  /(으)?로\s*여겨진다/g,
  /(으)?로\s*판단된다/g,
  /것?으로\s*생각된다/g,
  /가능성(이|은|도)?/g,
  /일\s*수(도)?\s*있다/g,
  /수\s*있다/g,
  /추정된다/g,
  /시사한다/g,
  /경향(이|을|성)/g,
  /다소|어느\s*정도|비교적|대체로|상대적으로|어쩌면|아마(도)?/g,
  /제한적/g,
  /\b(may|might|could|seems?|suggests?|likely|possibly|relatively|somewhat)\b/gi,
]
const BOOSTER_PATTERNS: RegExp[] = [
  /명백(히|하다|한)/g,
  /분명(히|하다|한)/g,
  /반드시/g,
  /당연(히|하다|한)/g,
  /확실(히|하다|한)/g,
  /의심(의\s*)?여지(가)?\s*없(다|이)/g,
  /결코|절대(로)?/g,
  /항상|언제나/g,
  /입증(되었|한|된)/g,
  /증명(되었|한|된)/g,
  /틀림없(다|이)/g,
  /\b(clearly|obviously|definitely|certainly|undoubtedly|always|never|proves?|proven)\b/gi,
]

function countMatches(text: string, pats: RegExp[]): number {
  let n = 0
  for (const re of pats) {
    re.lastIndex = 0
    const m = text.match(re)
    if (m) n += m.length
  }
  return n
}

// ---- 1. ac-hedge-booster: 헤지·부스터 균형 -------------------------------

const hedgeBooster: Analyzer = {
  id: 'ac-hedge-booster',
  name: '헤지·부스터 균형',
  kind: '학술',
  intro: '완화어(~로 보인다/가능성)와 강조어(명백히/반드시)의 균형을 본다. 학술 글은 과도한 단정을 피하되 헤지 남발도 경계한다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const total = sents.length
    const hedge = countMatches(text, HEDGE_PATTERNS)
    const booster = countMatches(text, BOOSTER_PATTERNS)
    const sum = hedge + booster
    // 헤지 비율(헤지/(헤지+부스터)). 둘 다 0이면 0.5(중립)로 둔다.
    const hedgeShare = sum > 0 ? ratio(hedge, sum) : 0.5
    const per100 = total > 0 ? ((sum / total) * 100) : 0

    const balanceTier: Tier =
      sum === 0 ? 'warn' : hedgeShare >= 0.3 && hedgeShare <= 0.8 ? 'ok' : 'warn'
    const boosterTier: Tier = booster > Math.max(3, total * 0.05) ? 'bad' : booster > 0 ? 'warn' : 'ok'

    return {
      kind: 'bars',
      rows: [
        {
          label: '헤지(완화어)',
          value: hedge,
          max: Math.max(hedge, booster, 1),
          sub: `완화 표현 ${hedge}개`,
          tier: hedge === 0 && total > 4 ? 'warn' : 'ok',
        },
        {
          label: '부스터(강조어)',
          value: booster,
          max: Math.max(hedge, booster, 1),
          sub: `강조/단정 표현 ${booster}개`,
          tier: boosterTier,
        },
        {
          label: '헤지 비중',
          value: Math.round(hedgeShare * 100),
          max: 100,
          sub: `완화/(완화+강조) = ${Math.round(hedgeShare * 100)}%`,
          tier: balanceTier,
        },
      ],
      note:
        total === 0
          ? '분석할 문장이 없다. 본문을 입력하면 헤지·부스터 균형을 진단한다.'
          : `문장 ${total}개 · 100문장당 헤지+부스터 ${per100.toFixed(1)}회. 학술 글은 헤지 비중 30~80% 구간이 무난하다.`,
    }
  },
}

// ---- 2. ac-citation-needed: 인용 누락 탐지 --------------------------------

// 인용/근거가 곁들여졌다고 볼 단서(있으면 "근거 있음").
const CITATION_CUES = [
  /\[\s*\d+\s*\]/, // [12]
  /\(\s*[^()]{0,40}\d{4}[^()]{0,40}\)/, // (홍길동, 2020)
  /에\s*따르면/,
  /에\s*의하면/,
  /선행\s*연구/,
  /보고(하였|했|된|되었)/,
  /연구(에서|는|에\s*의하면)/,
  /\b(et\s*al\.|ibid\.|cf\.|p\.\s*\d+)\b/i,
  /출처/,
  /참고문헌/,
]
// 단정/주장으로 읽히는 종결.
const CLAIM_ENDINGS = /(이다|있다|없다|된다|한다|이며|하였다|했다|것이다|뿐이다|보여준다|입증한다|증명한다)[.。]?$/
// 통계/수치/연도 — 근거 없이 등장하면 인용이 필요할 가능성이 큼.
const HAS_NUMBER = /\d/
const HAS_PERCENT = /\d+\s*(%|퍼센트|％)/
const HAS_YEAR = /(19|20)\d{2}\s*년?/

const citationNeeded: Analyzer = {
  id: 'ac-citation-needed',
  name: '인용 누락 후보',
  kind: '학술',
  intro: '통계 수치·연도·강한 단정이 있으나 인용 표지("~에 따르면", (저자, 연도), [n])가 보이지 않는 문장을 모은다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []

    for (const s of sents) {
      const hasCite = CITATION_CUES.some((re) => re.test(s))
      if (hasCite) continue
      const reasons: string[] = []
      if (HAS_PERCENT.test(s)) reasons.push('통계/백분율')
      else if (HAS_YEAR.test(s)) reasons.push('연도')
      else if (HAS_NUMBER.test(s) && CLAIM_ENDINGS.test(s.trim())) reasons.push('수치+단정')
      const strongClaim = CLAIM_ENDINGS.test(s.trim()) && countMatches(s, BOOSTER_PATTERNS) > 0
      if (strongClaim) reasons.push('강한 단정')
      if (reasons.length === 0) continue
      const tier: Tier = reasons.includes('통계/백분율') || reasons.length >= 2 ? 'bad' : 'warn'
      items.push({ text: snip(s, 90), sub: `근거 표지 없음 · ${reasons.join(', ')}`, tier })
      if (items.length >= 40) break
    }

    return {
      kind: 'list',
      items,
      empty:
        sents.length === 0
          ? '분석할 문장이 없다.'
          : '수치·연도를 단정하면서 인용이 빠진 문장을 찾지 못했다. 양호하다.',
      note:
        items.length > 0
          ? `인용 보강 후보 ${items.length}문장. 수치·연도·강한 단정에는 출처((저자, 연도)·[n]·"~에 따르면")를 덧붙이자.`
          : undefined,
    }
  },
}

// ---- 3. ac-readability: 학술 가독성 지표 ----------------------------------

const readability: Analyzer = {
  id: 'ac-readability',
  name: '학술 가독성 지표',
  kind: '학술',
  intro: '평균 문장 길이, 긴 문장(40어 초과) 비율, 명사화 밀도를 종합한다. 학술 글은 명료성과 정밀성의 균형이 핵심.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const totalSents = sents.length
    const allTokens = wordTokens(text)
    const totalWords = allTokens.length

    const avgLen = ratio(totalWords, totalSents)
    let longCount = 0
    for (const s of sents) {
      if (wordTokens(s).length > 40) longCount++
    }
    const longShare = ratio(longCount, totalSents) * 100

    // 명사화 밀도: ~함/~음/~성/~화/~의 토큰 비율(근사).
    let nominal = 0
    for (const w of allTokens) {
      if (/(함|음|성|화|적|의)$/.test(w) && w.length >= 2) nominal++
    }
    const nominalDensity = ratio(nominal, totalWords) * 100

    const avgTier: Tier = totalSents === 0 ? 'warn' : avgLen <= 32 ? 'ok' : avgLen <= 45 ? 'warn' : 'bad'
    const longTier: Tier = totalSents === 0 ? 'warn' : longShare <= 15 ? 'ok' : longShare <= 30 ? 'warn' : 'bad'
    const nominalTier: Tier =
      totalWords === 0 ? 'warn' : nominalDensity <= 18 ? 'ok' : nominalDensity <= 28 ? 'warn' : 'bad'

    return {
      kind: 'stat',
      stats: [
        { label: '문장 수', value: String(totalSents) },
        { label: '평균 문장 길이', value: `${avgLen.toFixed(1)}어`, tier: avgTier },
        { label: '긴 문장(40어 초과) 비율', value: `${longShare.toFixed(1)}%`, tier: longTier },
        { label: '명사화 밀도', value: `${nominalDensity.toFixed(1)}%`, tier: nominalTier },
        { label: '총 단어', value: String(totalWords) },
      ],
      note:
        totalSents === 0
          ? '분석할 문장이 없다. 본문을 입력하면 가독성 지표를 계산한다.'
          : '평균 문장 길이 32어 이하, 긴 문장 비율 15% 이하, 명사화 밀도 18% 이하를 권장한다.',
    }
  },
}

// ---- 4. ac-nominalization: 명사화·약한 동사 진단 --------------------------

const WEAK_VERB = /(을|를|에\s*대한|에\s*관한)?\s*(함|음)을?\s*(하|했|한)/
const nominalization: Analyzer = {
  id: 'ac-nominalization',
  name: '명사화·약동사 진단',
  kind: '학술',
  intro: '"~함/~음/~의"의 과다, 그리고 "분석을 하다"식 약동사(빈 동사 하다)를 짚어 더 능동적이고 정밀한 서술을 돕는다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []

    for (const s of sents) {
      const flags: string[] = []
      const nomNum = (s.match(/\S*(함|음)을?(?=\s|[,.])/g) || []).length
      const uiNum = (s.match(/\S+의\s/g) || []).length
      // "~를/을 하다" 형태의 약동사(명사+빈동사).
      const weak = (s.match(/[가-힣]{2,}\s*(을|를)\s*(하였다|했다|한다|하는|함)/g) || []).length
      if (nomNum >= 2) flags.push(`명사화 ~함/~음 ${nomNum}회`)
      if (uiNum >= 3) flags.push(`'~의' ${uiNum}회`)
      if (weak >= 1) flags.push(`약동사 '하다' ${weak}회`)
      if (flags.length === 0) continue
      const score = nomNum + uiNum + weak * 2
      const tier: Tier = score >= 6 ? 'bad' : score >= 3 ? 'warn' : 'ok'
      items.push({ text: snip(s, 90), sub: flags.join(' · '), tier })
      if (items.length >= 40) break
    }

    // 점수 높은 순(대략) — tier 우선 정렬.
    const order: Record<Tier, number> = { bad: 0, warn: 1, ok: 2 }
    items.sort((a, b) => order[a.tier ?? 'ok'] - order[b.tier ?? 'ok'])

    return {
      kind: 'list',
      items,
      empty:
        sents.length === 0
          ? '분석할 문장이 없다.'
          : '과도한 명사화나 약동사가 두드러지는 문장이 없다. 서술이 명료하다.',
      note:
        items.length > 0
          ? `점검 대상 ${items.length}문장. "분석을 하였다"→"분석하였다", "~함을 보인다"→"~임을 보인다"처럼 동사로 풀어 쓰자.`
          : undefined,
    }
  },
}
void WEAK_VERB // 향후 확장 예약(현재 인라인 정규식 사용)

// ---- 5. ac-abbreviation: 약어 추출 & 일관성 -------------------------------

const abbreviation: Analyzer = {
  id: 'ac-abbreviation',
  name: '약어 정의·일관성',
  kind: '학술',
  intro: '대문자 약어(2자 이상)를 모아, 본문 첫 등장에서 정의(괄호 풀이) 없이 쓰인 약어와 표기 흔들림(대소문자 변형)을 점검한다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const items: { text: string; sub?: string; tier?: Tier }[] = []

    // 약어 후보: 대문자/숫자 2~8자 (예: DNA, HTTP, GPT4). 한글 약어는 제외.
    const ABBR_RE = /\b[A-Z][A-Z0-9]{1,7}\b/g
    ABBR_RE.lastIndex = 0
    const positions = new Map<string, number>() // 약어 → 첫 등장 인덱스
    const counts = new Map<string, number>()
    let m: RegExpExecArray | null
    while ((m = ABBR_RE.exec(text))) {
      const a = m[0]
      counts.set(a, (counts.get(a) ?? 0) + 1)
      if (!positions.has(a)) positions.set(a, m.index)
    }

    // 정의 패턴: "...(ABBR)" 형태 — 약어 바로 앞 괄호 열림.
    for (const [abbr, first] of positions) {
      const before = text.slice(Math.max(0, first - 80), first)
      const after = text.slice(first, first + abbr.length + 60)
      // 약어가 괄호 안에 정의되었거나(전체이름(ABBR)), 약어 뒤 괄호로 풀이((ABBR: 전체이름)/ABBR(전체이름))
      const definedByParenBefore = /\(\s*$/.test(before)
      const definedByParenAfter = new RegExp(
        '^' + abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[\\(:]'
      ).test(after)
      const cnt = counts.get(abbr) ?? 1
      if (!definedByParenBefore && !definedByParenAfter && cnt >= 2) {
        items.push({
          text: abbr,
          sub: `${cnt}회 등장 · 첫 사용 시 풀이(정의) 없음`,
          tier: 'warn',
        })
      }
    }

    // 표기 흔들림: 같은 철자의 대소문자 변형이 둘 이상.
    const lowerMap = new Map<string, Set<string>>()
    for (const a of counts.keys()) {
      const k = a.toLowerCase()
      if (!lowerMap.has(k)) lowerMap.set(k, new Set())
      lowerMap.get(k)!.add(a)
    }
    // (대문자 약어만 모았기에 변형 가능성은 낮지만, 향후 혼용 대비용으로 유지)
    for (const [, variants] of lowerMap) {
      if (variants.size >= 2) {
        items.push({
          text: [...variants].join(' / '),
          sub: '표기 흔들림(대소문자 혼용) — 하나로 통일',
          tier: 'bad',
        })
      }
    }

    return {
      kind: 'list',
      items,
      empty:
        counts.size === 0
          ? '대문자 약어가 발견되지 않았다.'
          : `약어 ${counts.size}종을 확인했으나 정의 누락·표기 흔들림은 없다. 일관성이 양호하다.`,
      note:
        items.length > 0
          ? `점검 대상 ${items.length}건. 약어는 첫 등장 시 "전체 이름(ABBR)"으로 정의하고 이후 일관되게 쓰자.`
          : undefined,
    }
  },
}

// ---- 6. ac-footnote-density: 각주/참조 표지 밀도 --------------------------

const footnoteDensity: Analyzer = {
  id: 'ac-footnote-density',
  name: '각주·참조 표지 밀도',
  kind: '학술',
  intro: '본문 내 각주/참조 표지([n], (저자, 연도), "~에 따르면", 윗첨자 숫자 등)의 밀도와 분포를 추정한다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const paras = splitParagraphs(text)
    const words = wordTokens(text).length

    const bracketRefs = (text.match(/\[\s*\d{1,4}\s*\]/g) || []).length
    const parenCites = (text.match(/\(\s*[^()]{0,40}(19|20)\d{2}[^()]{0,40}\)/g) || []).length
    const superRefs = (text.match(/[¹²³⁰-⁹]+/g) || []).length // 윗첨자 숫자
    const accordingTo = (text.match(/에\s*따르면|에\s*의하면/g) || []).length
    const totalRefs = bracketRefs + parenCites + superRefs + accordingTo

    const per1000 = words > 0 ? (totalRefs / words) * 1000 : 0
    // 참조가 들어간 문단 비율(분포 균일성 근사).
    let parasWithRef = 0
    for (const p of paras) {
      if (
        /\[\s*\d{1,4}\s*\]/.test(p) ||
        /\(\s*[^()]{0,40}(19|20)\d{2}[^()]{0,40}\)/.test(p) ||
        /에\s*따르면|에\s*의하면/.test(p) ||
        /[¹²³⁰-⁹]/.test(p)
      ) {
        parasWithRef++
      }
    }
    const paraCoverage = ratio(parasWithRef, paras.length) * 100

    const densTier: Tier = words === 0 ? 'warn' : per1000 >= 3 ? 'ok' : per1000 >= 1 ? 'warn' : 'bad'
    const covTier: Tier = paras.length === 0 ? 'warn' : paraCoverage >= 40 ? 'ok' : paraCoverage >= 20 ? 'warn' : 'bad'

    return {
      kind: 'stat',
      stats: [
        { label: '총 참조 표지', value: String(totalRefs), tier: densTier },
        { label: '[n] 대괄호 참조', value: String(bracketRefs) },
        { label: '(저자, 연도) 인용', value: String(parenCites) },
        { label: '"~에 따르면" 류', value: String(accordingTo) },
        { label: '1000단어당 밀도', value: per1000.toFixed(2), tier: densTier },
        { label: '참조 포함 문단 비율', value: `${paraCoverage.toFixed(0)}%`, tier: covTier },
      ],
      note:
        words === 0
          ? '분석할 본문이 없다.'
          : '참조가 특정 문단에만 몰려 있으면(문단 비율이 낮으면) 근거 분포를 고르게 보강하자.',
    }
  },
}

// ---- 7. ac-passive-academic: 학술 수동/피동 비율 --------------------------

const passiveAcademic: Analyzer = {
  id: 'ac-passive-academic',
  name: '학술 수동태 비율',
  kind: '학술',
  intro: '피동(~되다/~되었다/~지다/~받다 등)·영어 수동태 문장의 비율. 적당한 객관성은 좋지만 과도하면 책임 주체가 흐려진다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const total = sents.length

    // 한국어 피동 종결 + '되다' 활용 + 영어 수동태(be + p.p.) 근사.
    const KO_PASSIVE = /되었다|되었으며|된다|되며|되어|지었다|진다|받았다|받는다|받게|당하다|당했|당한/
    const EN_PASSIVE = /\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/i
    let passive = 0
    for (const s of sents) {
      if (KO_PASSIVE.test(s) || EN_PASSIVE.test(s)) passive++
    }
    const pct = total > 0 ? (passive / total) * 100 : 0
    const tier: Tier = total === 0 ? 'warn' : pct <= 35 ? 'ok' : pct <= 55 ? 'warn' : 'bad'

    return {
      kind: 'gauge',
      value: Math.round(pct),
      min: 0,
      max: 100,
      unit: '%',
      label: '피동/수동 문장 비율',
      tier,
      note:
        total === 0
          ? '분석할 문장이 없다. 본문을 입력하면 수동태 비율을 계산한다.'
          : `피동 ${passive}/${total}문장. 35% 이하 권장 — 과도하면 "분석되었다"를 "본 연구는 분석하였다"처럼 주체를 드러내자.`,
    }
  },
}

// ---- 8. ac-thesis-keyword: 키워드/색인어 후보 -----------------------------

// 키워드 후보에서 제외할 불용어(한국어 고빈도 기능어 + 짧은 영어 불용어).
const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '또한', '그래서', '따라서', '즉', '또', '및', '등',
  '이러한', '그러한', '이는', '그것', '이것', '저것', '우리', '경우', '대한', '관한',
  '통해', '위해', '대해', '있다', '없다', '한다', '된다', '이다', '에서', '으로',
  '하는', '하여', '하고', '같은', '많은', '때문', '가장', '매우', '모든',
  '따르면', '의하면', '나타났다', '있을', '하였다', '한다는', '대하여', '관하여',
  'the', 'and', 'for', 'are', 'was', 'were', 'this', 'that', 'with', 'from',
  'have', 'has', 'not', 'but', 'can', 'will', 'which', 'such', 'these', 'those',
])

const thesisKeyword: Analyzer = {
  id: 'ac-thesis-keyword',
  name: '키워드/색인어 후보',
  kind: '학술',
  intro: '본문에서 빈도가 높은 명사·용어를 키워드 후보로 제시한다. 초록·색인어 작성과 논지 일관성 점검에 쓴다.',
  run: (ctx): AnalyzerResult => {
    const text = targetText(ctx)
    const tokens = wordTokens(text)
    const freq = new Map<string, number>()
    for (const raw of tokens) {
      const w = raw.toLowerCase()
      if (w.length < 2) continue
      if (/^\d+$/.test(w)) continue // 숫자만은 제외
      if (STOPWORDS.has(w)) continue
      // 한국어는 2~ , 영어는 3자 이상 권장(조사 잔여 줄이기)
      if (!hasKorean(w) && w.length < 3) continue
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
    const totalTokens = tokens.length
    const items = sorted.slice(0, 25).map(([term, count]) => {
      const share = ratio(count, totalTokens) * 100
      const tier: Tier = count >= 5 ? 'ok' : count >= 3 ? 'warn' : 'ok'
      return {
        text: term,
        sub: `${count}회 · 본문의 ${share.toFixed(2)}%`,
        tier,
      }
    })

    return {
      kind: 'list',
      items,
      empty:
        totalTokens === 0
          ? '분석할 본문이 없다.'
          : '키워드 후보를 추릴 만큼 반복되는 용어가 없다. 본문이 너무 짧을 수 있다.',
      note:
        items.length > 0
          ? `상위 ${items.length}개 용어. 논지의 핵심 키워드가 상위에 보이지 않으면 색인어·강조를 재점검하자.`
          : undefined,
    }
  },
}

// ---- export -----------------------------------------------------------------

export const ANALYZERS_ACADEMIC: Analyzer[] = [
  hedgeBooster,
  citationNeeded,
  readability,
  nominalization,
  abbreviation,
  footnoteDensity,
  passiveAcademic,
  thesisKeyword,
]

// 미사용 타입 import 경고 방지(타입 전용 import 는 런타임 영향 없음).
export type _AcademicTypes = AnalyzerResult | BinderItem
