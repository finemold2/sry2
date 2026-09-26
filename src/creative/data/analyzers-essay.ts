// 에세이·논픽션 분석기 모듈 — 단락 논리(PEEL/PREP), 주제 일관성, 논리 오류 표지,
// 전환어 연결성, 용어 표기 흔들림, 단락 균형, 인용 길이, 약한 동사·헤지 진단.
// 순수 함수로만 구성하며 빈 입력(scenes 0/빈 텍스트/active null)에서도 throw 하지 않는다.
import type { Analyzer, AnalyzerResult, AnalyzerContext, Tier } from '../analyzers.ts'
import type { BinderItem } from '../../model/types.ts'
import { splitSentences, wordTokens, splitParagraphs, hasKorean, extractDialogue, charsNoSpace } from '../text.ts'

const KIND = '에세이·논픽션'

// ── 공용 유틸(이 모듈 한정) ──────────────────────────────────────────────

/** 분석 대상 텍스트(활성 문서 우선, 없으면 원고 전체). */
function targetText(ctx: AnalyzerContext): string {
  const t = (ctx.activeText ?? '').trim()
  return t || (ctx.full ?? '').trim()
}

/** 0 나누기 가드 비율. */
function ratio(n: number, d: number): number {
  return d > 0 ? n / d : 0
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** 한국어 어절(공백 단위) — 한글 문장의 어절 수 근사. */
function eojeolCount(text: string): number {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}

/** 문단의 표시용 발췌(앞부분 80자). */
function snippet(text: string, n = 80): string {
  const s = text.replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** 핵심어 빈도 맵(2자 이상 토큰, 불용어 제거). */
const STOP = new Set([
  '그리고', '그러나', '하지만', '그래서', '또한', '그런데', '때문', '이것', '그것', '저것',
  '우리', '저는', '나는', '이런', '그런', '저런', '있다', '없다', '되다', '하다', '대한', '대해',
  '경우', '정도', '통해', '위해', '같은', '많은', '모든', '이런저런', '그러면', '그리하여',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'but',
  'not', 'you', 'can', 'will', 'has', 'his', 'her', 'its', 'our', 'their', 'about',
])
function keywordFreq(text: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const tok of wordTokens(text)) {
    const w = tok.toLowerCase()
    if (w.length < 2) continue
    if (STOP.has(w)) continue
    if (/^\d+$/.test(w)) continue
    map.set(w, (map.get(w) ?? 0) + 1)
  }
  return map
}

function topKeywords(map: Map<string, number>, n: number): string[] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0])
}

// ── es-peel: 단락 구조 코치(PEEL/PREP/두괄식) ───────────────────────────
// 각 문단이 "주장"으로 시작하는지(첫 문장), 근거 연결어가 본문에 있는지 점검.

const CLAIM_LEAD = /^(나는|필자는|이 글은|핵심은|주장하건대|결론부터|먼저|무엇보다|분명히|중요한 것은|요컨대|단언컨대)/
const EVIDENCE_CUE = /(왜냐하면|때문이다|근거는|예를 들어|예컨대|가령|실제로|통계|연구에 따르면|데이터|사례|보고서|조사 결과|증거)/
const LINK_CUE = /(따라서|그러므로|즉|결국|이처럼|이렇듯|요컨대|결론적으로|정리하면)/

const esPeel: Analyzer = {
  id: 'es-peel',
  name: '단락 구조 코치(PEEL/두괄식)',
  kind: KIND,
  scope: 'document',
  intro: '각 문단이 주장(Point)으로 시작하고 근거(Evidence)와 연결(Link)을 갖췄는지 점검합니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const paras = splitParagraphs(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []
    paras.forEach((p, i) => {
      const sents = splitSentences(p)
      if (sents.length === 0) return
      const first = sents[0]
      const startsClaim = CLAIM_LEAD.test(first.trim())
      const hasEvidence = EVIDENCE_CUE.test(p)
      const hasLink = LINK_CUE.test(p)
      const missing: string[] = []
      if (!startsClaim) missing.push('두괄식 주장 약함')
      if (!hasEvidence) missing.push('근거 신호 없음')
      if (!hasLink) missing.push('마무리 연결어 없음')
      let tier: Tier = 'ok'
      if (missing.length >= 2) tier = 'bad'
      else if (missing.length === 1) tier = 'warn'
      items.push({
        text: `문단 ${i + 1}: ${snippet(first, 60)}`,
        sub: missing.length ? missing.join(' · ') : 'P·E·L 구조 양호',
        tier,
      })
    })
    return {
      kind: 'list',
      items,
      note: paras.length
        ? '두괄식: 문단 첫 문장에 주장을 명시하고, 근거(예를 들어/왜냐하면)와 연결어(따라서/즉)로 매듭지으면 설득력이 올라갑니다.'
        : undefined,
      empty: '분석할 문단이 없습니다. 본문을 입력하세요.',
    }
  },
}

// ── es-thesis-drift: 주제 일관성·이탈 감지 ──────────────────────────────
// 첫 문단 핵심어 집합 대비, 후반 문단들이 그 핵심어를 얼마나 공유하는지로 이탈도 산출.

const esThesisDrift: Analyzer = {
  id: 'es-thesis-drift',
  name: '주제 일관성·이탈 감지',
  kind: KIND,
  scope: 'document',
  intro: '도입부 핵심어 대비 후반 문단의 주제 이탈 정도를 측정합니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const paras = splitParagraphs(text)
    if (paras.length < 2) {
      return {
        kind: 'gauge',
        value: 0,
        max: 100,
        unit: '%',
        label: '주제 이탈도',
        tier: 'ok',
        note: '문단이 2개 이상 있어야 이탈도를 측정할 수 있습니다.',
      }
    }
    const thesisKeys = new Set(topKeywords(keywordFreq(paras[0]), 8))
    if (thesisKeys.size === 0) {
      return {
        kind: 'gauge',
        value: 0,
        max: 100,
        unit: '%',
        label: '주제 이탈도',
        tier: 'warn',
        note: '도입부에서 핵심어를 추출하지 못했습니다. 첫 문단에 주제를 분명히 제시하세요.',
      }
    }
    // 후반(절반 이후) 문단의 핵심어와 thesis 의 겹침 비율 → 이탈도 = 1 - 겹침
    const half = Math.floor(paras.length / 2)
    const drifters: { text: string; sub?: string; tier?: Tier }[] = []
    let driftSum = 0
    let counted = 0
    paras.forEach((p, i) => {
      if (i === 0) return
      const keys = topKeywords(keywordFreq(p), 8)
      if (keys.length === 0) return
      const overlap = keys.filter((k) => thesisKeys.has(k)).length
      const cover = ratio(overlap, keys.length)
      const drift = 1 - cover
      // 후반 문단을 가중 집계(이탈은 뒤로 갈수록 위험)
      if (i >= half) {
        driftSum += drift
        counted++
      }
      if (drift >= 0.85) {
        drifters.push({
          text: `문단 ${i + 1}: ${snippet(p, 60)}`,
          sub: `도입부 핵심어 공유 ${(cover * 100).toFixed(0)}%`,
          tier: i >= half ? 'bad' : 'warn',
        })
      }
    })
    const driftScore = counted > 0 ? clamp01(driftSum / counted) : 0
    const pct = Math.round(driftScore * 100)
    const tier: Tier = pct >= 70 ? 'bad' : pct >= 45 ? 'warn' : 'ok'
    return {
      kind: 'gauge',
      value: pct,
      max: 100,
      unit: '%',
      label: '주제 이탈도(후반 문단)',
      tier,
      note: drifters.length
        ? `도입부와 동떨어진 후보 문단: ${drifters.map((d) => d.text.split(':')[0]).join(', ')}. 핵심어 예: ${[...thesisKeys].slice(0, 5).join(', ')}.`
        : `도입부 핵심어(${[...thesisKeys].slice(0, 5).join(', ')})를 후반까지 일관되게 유지하고 있습니다.`,
    }
  },
}

// ── es-logical-fallacy: 논리 오류·약한 논거 표지어 탐지 ──────────────────

const FALLACY_RULES: { label: string; re: RegExp }[] = [
  { label: '성급한 일반화', re: /(항상|언제나|모두\s*다|전부\s*다|예외\s*없이|누구나\s*다|무조건|당연히\s*모두)/g },
  { label: '흑백논리', re: /(둘\s*중\s*하나|아니면\s*안\s*된다|밖에\s*없다|유일한\s*방법|오직\s*하나|할\s*수밖에)/g },
  { label: '권위 호소', re: /(전문가가\s*말하|유명한|권위자|누구나\s*아는|상식적으로|당연한\s*사실)/g },
  { label: '인신공격', re: /(틀려먹은|무식한|어리석은|멍청한|수준\s*낮은)/g },
  { label: '감정 호소', re: /(불쌍한|끔찍한|충격적인|소름\s*끼치는|참혹한)/g },
  { label: '근거 없는 단정', re: /(분명히|틀림없이|당연히|두말할\s*나위|의심의\s*여지\s*없이)/g },
  { label: '미끄러운 비탈', re: /(결국엔|끝내|머지않아\s*반드시|걷잡을\s*수\s*없이)/g },
]

const esLogicalFallacy: Analyzer = {
  id: 'es-logical-fallacy',
  name: '논리 오류·약한 논거 점검',
  kind: KIND,
  scope: 'document',
  intro: '성급한 일반화·흑백논리·권위 호소 등 약한 논거의 표지어를 탐지합니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []
    if (sents.length) {
      for (const s of sents) {
        const hits: string[] = []
        for (const rule of FALLACY_RULES) {
          rule.re.lastIndex = 0
          if (rule.re.test(s)) hits.push(rule.label)
        }
        if (hits.length) {
          items.push({
            text: snippet(s, 90),
            sub: hits.join(' · '),
            tier: hits.length >= 2 ? 'bad' : 'warn',
          })
        }
        if (items.length >= 60) break
      }
    }
    return {
      kind: 'list',
      items,
      note: items.length
        ? '표지어가 곧 오류는 아니지만, 단정·일반화 표현 옆에는 구체적 근거나 한정(일부/대체로/조건)을 덧붙이세요.'
        : '약한 논거 표지어가 발견되지 않았습니다. 단정 표현을 절제한 좋은 신호입니다.',
      empty: '분석할 문장이 없습니다. 본문을 입력하세요.',
    }
  },
}

// ── es-cohesion: 전환어·연결성 분석(연결어 밀도 게이지) ──────────────────

const TRANSITION_CUES = [
  '따라서', '그러므로', '그래서', '하지만', '그러나', '반면', '한편', '또한', '게다가', '더욱이',
  '예를 들어', '예컨대', '즉', '다시 말해', '결국', '결론적으로', '요컨대', '첫째', '둘째', '셋째',
  '먼저', '다음으로', '마지막으로', '이처럼', '이렇듯', '그런데', '나아가', '특히', '무엇보다',
]

const esCohesion: Analyzer = {
  id: 'es-cohesion',
  name: '전환어·연결성 분석',
  kind: KIND,
  scope: 'document',
  intro: '문단 첫머리·문장 사이 전환어 밀도로 글의 연결성을 평가합니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const paras = splitParagraphs(text)
    if (paras.length === 0) {
      return {
        kind: 'gauge',
        value: 0,
        max: 100,
        unit: '%',
        label: '전환어 밀도',
        tier: 'warn',
        note: '본문이 비어 있어 연결성을 측정할 수 없습니다.',
      }
    }
    // 문단 시작 전환어를 갖춘 문단 비율(첫 문단 제외)
    let linked = 0
    const considered = Math.max(1, paras.length - 1)
    for (let i = 1; i < paras.length; i++) {
      const head = paras[i].replace(/\s+/g, ' ').slice(0, 20)
      if (TRANSITION_CUES.some((c) => head.includes(c))) linked++
    }
    const paraCoverage = ratio(linked, considered)
    // 전체 전환어 출현 횟수 / 문장 수 (보조 밀도)
    const sents = splitSentences(text)
    let cueTotal = 0
    for (const c of TRANSITION_CUES) {
      let from = 0
      let idx: number
      while ((idx = text.indexOf(c, from)) !== -1) {
        cueTotal++
        from = idx + c.length
      }
    }
    const sentDensity = clamp01(ratio(cueTotal, sents.length))
    // 종합 점수: 문단 연결 비중 60% + 문장 밀도 40%
    const combined = clamp01(paraCoverage * 0.6 + sentDensity * 0.4)
    const pct = Math.round(combined * 100)
    const tier: Tier = pct >= 45 ? 'ok' : pct >= 25 ? 'warn' : 'bad'
    return {
      kind: 'gauge',
      value: pct,
      max: 100,
      unit: '%',
      label: '전환어 연결성',
      tier,
      note: `문단 연결 ${linked}/${considered}, 전환어 ${cueTotal}회 / 문장 ${sents.length}개. ` +
        (tier === 'ok'
          ? '문단 사이 흐름이 자연스럽게 이어집니다.'
          : '문단 첫머리에 따라서/한편/예를 들어 같은 전환어를 보강해 흐름을 명확히 하세요.'),
    }
  },
}

// ── es-term-consistency: 정의·용어 일관성(표기 흔들림 후보) ──────────────
// 같은 개념의 다른 표기 후보를 휴리스틱으로 탐지: 띄어쓰기/하이픈/외래어 변형.

function normalizeTerm(w: string): string {
  return w.toLowerCase().replace(/[\s\-_·]/g, '')
}

const esTermConsistency: Analyzer = {
  id: 'es-term-consistency',
  name: '정의·용어 일관성',
  kind: KIND,
  scope: 'document',
  intro: '같은 개념인데 표기(띄어쓰기·하이픈·외래어)가 흔들리는 후보를 찾습니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    // 후보 용어: 2자 이상 토큰 + 띄어쓰기 포함 2어절 복합어 후보
    const counts = new Map<string, number>()
    const surfaces = new Map<string, Map<string, number>>() // norm -> surface -> count
    const add = (surface: string) => {
      const s = surface.trim()
      if (s.length < 2) return
      const norm = normalizeTerm(s)
      if (norm.length < 2) return
      counts.set(norm, (counts.get(norm) ?? 0) + 1)
      let inner = surfaces.get(norm)
      if (!inner) {
        inner = new Map<string, number>()
        surfaces.set(norm, inner)
      }
      inner.set(s, (inner.get(s) ?? 0) + 1)
    }
    for (const tok of wordTokens(text)) add(tok)
    // 띄어쓰기/하이픈을 포함한 2~3토큰 복합어(영문·외래어 위주)
    const compoundRe = /[A-Za-z][A-Za-z\- ]{2,30}[A-Za-z]/g
    let m: RegExpExecArray | null
    while ((m = compoundRe.exec(text))) {
      if (/[ \-]/.test(m[0])) add(m[0])
    }
    const items: { text: string; sub?: string; tier?: Tier }[] = []
    for (const [norm, inner] of surfaces) {
      if (inner.size < 2) continue
      const total = counts.get(norm) ?? 0
      if (total < 3) continue // 너무 드문 건 노이즈
      const variants = [...inner.entries()].sort((a, b) => b[1] - a[1])
      const dominant = variants[0]
      items.push({
        text: variants.map(([s, c]) => `"${s}"(${c})`).join(' / '),
        sub: `표기 ${inner.size}종 — 권장: "${dominant[0]}"로 통일`,
        tier: inner.size >= 3 ? 'bad' : 'warn',
      })
      if (items.length >= 40) break
    }
    items.sort((a, b) => (b.tier === 'bad' ? 1 : 0) - (a.tier === 'bad' ? 1 : 0))
    return {
      kind: 'list',
      items,
      note: items.length
        ? '동일 개념의 표기를 하나로 고정하면 신뢰도가 올라갑니다(예: "데이터 베이스/데이터베이스").'
        : '표기 흔들림 후보가 발견되지 않았습니다.',
      empty: '분석할 본문이 없습니다.',
    }
  },
}

// ── es-paragraph-balance: 단락 길이·균형 시각화(bars) ────────────────────

const esParagraphBalance: Analyzer = {
  id: 'es-paragraph-balance',
  name: '단락 길이·균형 시각화',
  kind: KIND,
  scope: 'document',
  intro: '문단별 길이를 막대로 비교해 과도하게 길거나 짧은 단락을 드러냅니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const paras = splitParagraphs(text)
    if (paras.length === 0) {
      return {
        kind: 'bars',
        rows: [],
        note: '분석할 문단이 없습니다. 본문을 입력하세요.',
      }
    }
    const lengths = paras.map((p) => (hasKorean(p) ? charsNoSpace(p) : wordTokens(p).length))
    const max = Math.max(1, ...lengths)
    const avg = ratio(lengths.reduce((a, b) => a + b, 0), lengths.length)
    const unit = hasKorean(text) ? '자' : '단어'
    const rows = paras.map((p, i) => {
      const len = lengths[i]
      let tier: Tier = 'ok'
      if (avg > 0) {
        if (len > avg * 2.2) tier = 'bad'
        else if (len > avg * 1.6 || len < avg * 0.35) tier = 'warn'
      }
      return {
        label: `문단 ${i + 1}`,
        value: len,
        max,
        sub: `${len}${unit} · ${snippet(p, 40)}`,
        tier,
      }
    })
    return {
      kind: 'bars',
      rows,
      note: `평균 ${avg.toFixed(0)}${unit}/문단, 최장 ${max}${unit}. ` +
        '한 문단은 하나의 주장(약 3~6문장)이 이상적입니다. 지나치게 긴 문단은 쪼개세요.',
    }
  },
}

// ── es-quote-length: 인용문 길이 경고(과도한 직접인용 블록) ──────────────

const esQuoteLength: Analyzer = {
  id: 'es-quote-length',
  name: '인용문 길이 경고',
  kind: KIND,
  scope: 'document',
  intro: '직접 인용이 지나치게 길어 본인 논지를 가리는 블록을 찾습니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const quotes = extractDialogue(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []
    const ko = hasKorean(text)
    for (const q of quotes) {
      const len = ko ? charsNoSpace(q) : wordTokens(q).length
      const threshold = ko ? 80 : 40
      if (len >= threshold) {
        let tier: Tier = 'warn'
        if (len >= threshold * 2) tier = 'bad'
        items.push({
          text: snippet(q, 100),
          sub: `${len}${ko ? '자' : '단어'} — ${tier === 'bad' ? '과도하게 김(요약·풀어쓰기 권장)' : '다소 김(축약 검토)'}`,
          tier,
        })
      }
      if (items.length >= 40) break
    }
    items.sort((a, b) => (b.tier === 'bad' ? 1 : 0) - (a.tier === 'bad' ? 1 : 0))
    // 인용 총량 비중도 함께 안내
    const quoteChars = quotes.reduce((a, q) => a + (ko ? charsNoSpace(q) : wordTokens(q).length), 0)
    const bodyChars = ko ? charsNoSpace(text) : wordTokens(text).length
    const quoteShare = Math.round(ratio(quoteChars, bodyChars) * 100)
    return {
      kind: 'list',
      items,
      note: quotes.length
        ? `직접 인용 ${quotes.length}건, 본문 대비 인용 비중 약 ${quoteShare}%. 긴 인용은 핵심만 따고 나머지는 자신의 문장으로 풀어쓰세요.`
        : '직접 인용 블록이 없습니다.',
      empty: '직접 인용("…")이 없거나 본문이 비어 있습니다.',
    }
  },
}

// ── es-weak-verb: 명사화·약한 동사·헤지 진단(에세이 문체) ─────────────────

const HEDGES = [
  '아마도', '아마', '어쩌면', '듯하다', '듯한', '인 것 같다', '같다', '듯이', '느낌이',
  '아닐까', '생각된다', '여겨진다', '보인다', '~인 듯', '대체로', '어느 정도', '다소', '약간',
  '경향이 있다', '편이다', '수도 있다', '지 않을까',
]
const NOMINALIZE = /(\S{2,})(화|성|적|함|음|기)(을|를|이|가|은|는|에|으로|로|와|과|의)?\s*(하다|되다|시키다|이루어지다|진행되다|존재한다|발생한다)/g
const WEAK_VERB = /(있다|없다|되다|하다|이다)\.?\s*$/

const esWeakVerb: Analyzer = {
  id: 'es-weak-verb',
  name: '명사화·약한 동사·헤지 진단',
  kind: KIND,
  scope: 'document',
  intro: '명사화(~을 진행하다), 약한 술어, 헤지(아마도/듯하다)로 흐려진 문장을 찾습니다.',
  run(ctx): AnalyzerResult {
    const text = targetText(ctx)
    const sents = splitSentences(text)
    const items: { text: string; sub?: string; tier?: Tier }[] = []
    for (const s of sents) {
      const flags: string[] = []
      const foundHedges = HEDGES.filter((h) => s.includes(h))
      if (foundHedges.length) flags.push(`헤지(${foundHedges.slice(0, 3).join('/')})`)
      NOMINALIZE.lastIndex = 0
      if (NOMINALIZE.test(s)) flags.push('명사화(동사로 풀어쓰기)')
      const trimmed = s.trim()
      if (WEAK_VERB.test(trimmed) && eojeolCount(trimmed) >= 8) flags.push('약한 술어로 마무리')
      if (flags.length) {
        items.push({
          text: snippet(s, 90),
          sub: flags.join(' · '),
          tier: flags.length >= 2 ? 'bad' : 'warn',
        })
      }
      if (items.length >= 60) break
    }
    items.sort((a, b) => (b.tier === 'bad' ? 1 : 0) - (a.tier === 'bad' ? 1 : 0))
    return {
      kind: 'list',
      items,
      note: items.length
        ? '헤지는 한두 번이면 신중함이지만 잦으면 모호해집니다. 명사화는 동사로(예: "검토를 진행하다"→"검토하다") 바꿔 힘을 주세요.'
        : '명사화·헤지·약한 술어가 두드러지지 않습니다. 단정적이고 명료한 문체입니다.',
      empty: '분석할 문장이 없습니다. 본문을 입력하세요.',
    }
  },
}

// ── export ───────────────────────────────────────────────────────────────

export const ANALYZERS_ESSAY: Analyzer[] = [
  esPeel,
  esThesisDrift,
  esLogicalFallacy,
  esCohesion,
  esTermConsistency,
  esParagraphBalance,
  esQuoteLength,
  esWeakVerb,
]
