// 웹소설 연재 분석기 모듈 — 한국 웹소설 연재 특성(회차 분량/클리프행어/사이다·고구마/심의/POV 등) 반영.
// 모든 run 은 순수 함수이며 빈 입력(scenes 0개·빈 텍스트·active null)에서도 throw 하지 않는다.
import type { Analyzer, AnalyzerResult, AnalyzerContext, Tier } from '../analyzers.ts'
import type { BinderItem } from '../../model/types.ts'
import {
  splitSentences,
  wordTokens,
  splitParagraphs,
  hasKorean,
  extractDialogue,
  charsNoSpace,
} from '../text.ts'

// ── 공용 소도구 ───────────────────────────────────────────────
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
const pct = (a: number, b: number): number => (b > 0 ? (a / b) * 100 : 0)
const round1 = (n: number): number => Math.round(n * 10) / 10
const safe = (s: string | null | undefined): string => (typeof s === 'string' ? s : '')
const trunc = (s: string, n = 40): string => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// 신호어 사전(근사 휴리스틱) ─ 부분일치 검사용.
const TENSION_WORDS = [
  '갑자기', '순간', '하지만', '그러나', '설마', '위기', '죽', '피', '비명', '폭발', '공격', '쫓',
  '두려', '공포', '경악', '충격', '배신', '함정', '적', '칼', '총', '불길', '심장', '떨', '긴장',
  '위험', '절체절명', '벼랑', '추격', '음모', '폭주', '분노', '소름', '전율', '경고',
]
const RELIEF_WORDS = [
  '드디어', '마침내', '결국', '성공', '승리', '해결', '이겼', '구했', '안심', '미소', '웃', '통쾌',
  '시원', '후련', '깨달', '극복', '보상', '레벨업', '각성', '역전', '복수', '응징', '처단', '박살',
  '압도', '완벽', '평온', '안정', '편안', '기쁨', '환호',
]
const CLIFF_QUESTION = ['?', '？']
const CLIFF_TWIST = ['그런데', '그러나', '하지만', '그때', '바로 그때', '순간', '그 순간', '설마', '갑자기', '그리고']
const CLIFF_SUSPENSE = ['끝이 아니었다', '시작에 불과했다', '몰랐다', '알지 못했다', '예상하지 못', '운명', '미처', '아직', '곧', '다가오', '나타났다', '등장했다', '쓰러졌다', '죽었다', '사라졌다']

const countHits = (text: string, words: string[]): number => {
  let n = 0
  for (const w of words) {
    if (!w) continue
    let from = 0
    while (true) {
      const i = text.indexOf(w, from)
      if (i < 0) break
      n++
      from = i + w.length
    }
  }
  return n
}
const containsAny = (text: string, words: string[]): boolean => words.some((w) => w && text.includes(w))

// 한국어 고유명사/조어 후보(2자 이상 한글 연속, 일반 종결/조사 어미는 약하게 배제).
const PROPER_RE = /[가-힣]{2,}/g

// ── 1. 회차 분량 컴플라이언스 게이지 ─────────────────────────────
const wnEpisodeLength: Analyzer = {
  id: 'wn-episode-length',
  name: '회차 분량 컴플라이언스',
  kind: '웹소설 연재',
  scope: 'document',
  intro: '웹소설 1회 권장 분량(공백 포함 약 3,000~5,500자) 대비 현재 회차의 길이를 점검합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const text = safe(ctx.activeText)
    // 공백 포함 글자 수(웹소설 플랫폼 통상 기준).
    const chars = text.length
    const LO = 3000
    const HI = 5500
    const MAX = 8000
    let tier: Tier = 'ok'
    let note: string
    if (chars === 0) {
      tier = 'warn'
      note = '본문이 비어 있습니다. 회차 본문을 작성해 주세요.'
    } else if (chars < LO) {
      tier = chars < LO * 0.6 ? 'bad' : 'warn'
      note = `권장 하한(${LO.toLocaleString()}자)보다 ${(LO - chars).toLocaleString()}자 짧습니다. 한 회차로는 다소 가볍습니다.`
    } else if (chars > HI) {
      tier = chars > HI * 1.4 ? 'bad' : 'warn'
      note = `권장 상한(${HI.toLocaleString()}자)보다 ${(chars - HI).toLocaleString()}자 깁니다. 분할 연재를 고려하세요.`
    } else {
      tier = 'ok'
      note = `권장 구간(${LO.toLocaleString()}~${HI.toLocaleString()}자) 안입니다.`
    }
    return {
      kind: 'gauge',
      value: chars,
      min: 0,
      max: MAX,
      unit: '자',
      label: '공백 포함 글자 수',
      tier,
      note,
    }
  },
}

// ── 2. 클리프행어/엔딩훅 분석 ───────────────────────────────────
const wnCliffhanger: Analyzer = {
  id: 'wn-cliffhanger',
  name: '클리프행어·엔딩훅',
  kind: '웹소설 연재',
  scope: 'manuscript',
  intro: '각 회차(장면) 마지막 1~2문장이 다음 회를 끌어당기는지 — 의문/반전/긴장 신호어를 점검합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const scenes = ctx.scenes || []
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
    for (const sc of scenes) {
      const sents = splitSentences(safe(sc.text))
      if (sents.length === 0) {
        items.push({ text: trunc(sc.title || '(제목 없음)', 30), sub: '본문 없음 — 엔딩 훅 판단 불가', tier: 'warn', sceneId: sc.id })
        continue
      }
      const tail = sents.slice(-2).join(' ')
      const hasQ = containsAny(tail, CLIFF_QUESTION)
      const hasTwist = containsAny(tail, CLIFF_TWIST)
      const hasSus = containsAny(tail, CLIFF_SUSPENSE)
      const signals: string[] = []
      if (hasQ) signals.push('의문')
      if (hasTwist) signals.push('반전·전환')
      if (hasSus) signals.push('긴장·예고')
      const score = (hasQ ? 1 : 0) + (hasTwist ? 1 : 0) + (hasSus ? 1 : 0)
      let tier: Tier
      if (score >= 2) tier = 'ok'
      else if (score === 1) tier = 'warn'
      else tier = 'bad'
      const lastShown = trunc(sents[sents.length - 1], 46)
      const sub =
        score === 0
          ? `훅 신호 없음 — 평탄한 마무리. 끝문장: "${lastShown}"`
          : `훅: ${signals.join('·')} · 끝문장: "${lastShown}"`
      items.push({ text: trunc(sc.title || `${sc.index + 1}화`, 30), sub, tier, sceneId: sc.id })
    }
    return {
      kind: 'list',
      items,
      note: items.length ? '끝맺음이 평탄(bad)한 회차는 다음 회 이탈로 이어지기 쉽습니다.' : undefined,
      empty: '분석할 회차가 없습니다. 원고에 장면을 추가하세요.',
    }
  },
}

// ── 3. 도입부 후킹 진단 ─────────────────────────────────────────
const wnOpeningHook: Analyzer = {
  id: 'wn-opening-hook',
  name: '도입부 후킹 진단',
  kind: '웹소설 연재',
  scope: 'manuscript',
  intro: '초반 3개 장면의 첫 문장이 충분히 짧고 즉시 몰입(대사·사건 제시)을 유도하는지 점검합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const scenes = (ctx.scenes || []).slice(0, 3)
    const checks: { label: string; pass: boolean; detail?: string; tier?: Tier }[] = []
    if (scenes.length === 0) {
      return {
        kind: 'score',
        score: 0,
        max: 100,
        checks: [{ label: '장면 없음', pass: false, detail: '원고에 장면을 추가하면 도입부를 진단합니다.', tier: 'warn' }],
        note: '분석할 도입부 장면이 없습니다.',
      }
    }
    let passCount = 0
    const total = scenes.length * 3
    const EVENT_WORDS = ['죽', '도착', '시작', '나타났', '터졌', '울렸', '쓰러', '떨어졌', '소리', '폭발', '비명', '들이닥', '깨어났', '눈을 떴']
    for (const sc of scenes) {
      const sents = splitSentences(safe(sc.text))
      const label = trunc(sc.title || `${sc.index + 1}화`, 24)
      if (sents.length === 0) {
        checks.push({ label: `${label} · 본문 없음`, pass: false, detail: '첫 문장이 없습니다.', tier: 'bad' })
        continue
      }
      const first = sents[0]
      const len = first.length
      // (1) 첫 문장 길이 — 모바일에서 60자 이하면 빠르게 읽힘.
      const shortOk = len <= 60
      if (shortOk) passCount++
      checks.push({
        label: `${label} · 첫 문장 길이`,
        pass: shortOk,
        detail: `${len}자 (권장 ≤60자) — "${trunc(first, 40)}"`,
        tier: shortOk ? 'ok' : len > 100 ? 'bad' : 'warn',
      })
      // (2) 대사로 시작 — 즉시 인물·갈등 노출.
      const dialogueStart = /^\s*["“'「『]/.test(safe(sc.text))
      if (dialogueStart) passCount++
      checks.push({
        label: `${label} · 대사 시작`,
        pass: dialogueStart,
        detail: dialogueStart ? '대사로 즉시 진입' : '서술로 시작(대사 시작도 강력한 후킹)',
        tier: dialogueStart ? 'ok' : 'warn',
      })
      // (3) 사건 제시 — 첫 2문장 내 사건 신호어.
      const opener = sents.slice(0, 2).join(' ')
      const event = containsAny(opener, EVENT_WORDS)
      if (event) passCount++
      checks.push({
        label: `${label} · 사건 제시`,
        pass: event,
        detail: event ? '초반에 사건/행동 노출' : '초반이 정적 — 사건을 앞당기면 후킹 강화',
        tier: event ? 'ok' : 'warn',
      })
    }
    const score = Math.round(pct(passCount, total))
    let tier: Tier = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'bad'
    return {
      kind: 'score',
      score,
      max: 100,
      checks,
      note: `${tier === 'ok' ? '도입부 후킹이 양호합니다.' : '초반 이탈을 막으려면 첫 문장·사건 제시를 강화하세요.'}`,
    }
  },
}

// ── 4. 사이다/고구마 페이싱 ─────────────────────────────────────
const wnCiderSweetPotato: Analyzer = {
  id: 'wn-cider-sweet-potato',
  name: '사이다·고구마 페이싱',
  kind: '웹소설 연재',
  scope: 'manuscript',
  intro: '장면별 긴장(고구마)↔해소(사이다) 어휘 비율로 답답함과 통쾌함의 흐름을 추정합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const scenes = ctx.scenes || []
    const rows: { label: string; value: number; max?: number; sub?: string; tier?: Tier; sceneId?: string }[] = []
    for (const sc of scenes) {
      const text = safe(sc.text)
      const relief = countHits(text, RELIEF_WORDS)
      const tension = countHits(text, TENSION_WORDS)
      const totalHits = relief + tension
      // 0(완전 고구마) ~ 100(완전 사이다). 신호 없으면 중립 50.
      const ciderIdx = totalHits === 0 ? 50 : Math.round(pct(relief, totalHits))
      let tier: Tier
      let mood: string
      if (totalHits === 0) {
        tier = 'warn'
        mood = '중립(신호 부족)'
      } else if (ciderIdx >= 60) {
        tier = 'ok'
        mood = '사이다(해소)'
      } else if (ciderIdx <= 35) {
        tier = 'bad'
        mood = '고구마(답답)'
      } else {
        tier = 'warn'
        mood = '긴장 누적'
      }
      rows.push({
        label: trunc(sc.title || `${sc.index + 1}화`, 24),
        value: ciderIdx,
        max: 100,
        sub: `${mood} · 사이다어 ${relief} / 고구마어 ${tension}`,
        tier,
        sceneId: sc.id,
      })
    }
    return {
      kind: 'bars',
      rows,
      note: rows.length
        ? '고구마(낮은 막대)가 여러 회 연속되면 해소(사이다) 회차를 배치하세요. 값=사이다 지수(0~100).'
        : undefined,
    }
  },
}

// ── 5. 비속어·금칙어/심의 위험어 검사 ───────────────────────────
const wnForbiddenWords: Analyzer = {
  id: 'wn-forbidden-words',
  name: '심의·금칙어 검사',
  kind: '웹소설 연재',
  scope: 'document',
  intro: '한국 플랫폼 심의 관점에서 욕설·차별·노골 표현 등 위험 패턴을 점검합니다(근사 휴리스틱).',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const text = safe(ctx.activeText)
    // 카테고리별 패턴(부분일치). 자모 노출형(ㅅㅂ 등) 포함.
    const groups: { cat: string; tier: Tier; words: string[] }[] = [
      { cat: '욕설·비속어', tier: 'bad', words: ['시발', '씨발', '씨바', '개새끼', '새끼', '존나', '존내', '병신', '지랄', '좆', '엿먹', 'ㅅㅂ', 'ㅄ', 'ㅂㅅ', 'ㅈㄴ', '닥쳐'] },
      { cat: '차별·혐오 표현', tier: 'bad', words: ['병신', '정신병자', '저능아', '장애인같', '흑형', '짱깨', '쪽바리', '틀딱', '맘충', '한남', '김치녀'] },
      { cat: '노골적 표현', tier: 'warn', words: ['섹스', '성기', '자위', '강간', '성폭행', '나체', '음란'] },
      { cat: '약물·범죄 조장', tier: 'warn', words: ['마약', '필로폰', '대마초', '히로뽕', '자살 방법', '자해'] },
    ]
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
    if (text.length === 0) {
      return { kind: 'list', items: [], empty: '본문이 비어 있어 검사할 내용이 없습니다.' }
    }
    let totalHits = 0
    for (const g of groups) {
      const found: { w: string; n: number }[] = []
      for (const w of g.words) {
        let from = 0
        let n = 0
        while (true) {
          const i = text.indexOf(w, from)
          if (i < 0) break
          n++
          from = i + w.length
        }
        if (n > 0) found.push({ w, n })
      }
      if (found.length) {
        const sum = found.reduce((a, b) => a + b.n, 0)
        totalHits += sum
        const detail = found
          .sort((a, b) => b.n - a.n)
          .slice(0, 8)
          .map((f) => `${f.w}×${f.n}`)
          .join(', ')
        items.push({
          text: `${g.cat} — 총 ${sum}건`,
          sub: detail,
          tier: g.tier,
        })
      }
    }
    if (items.length === 0) {
      return {
        kind: 'list',
        items: [],
        empty: '검출된 금칙어/심의 위험어가 없습니다. (자동 검사이며 최종 판단은 사람이 하세요.)',
      }
    }
    return {
      kind: 'list',
      items,
      note: `총 ${totalHits}건 검출 — 플랫폼별 심의 기준이 다르므로 맥락을 확인하세요(오탐 가능).`,
    }
  },
}

// ── 6. 대사 비율·문단 길이 ──────────────────────────────────────
const wnDialogueRatio: Analyzer = {
  id: 'wn-dialogue-ratio',
  name: '대사 비율·문단 길이',
  kind: '웹소설 연재',
  scope: 'document',
  intro: '웹소설 가독성 — 대사 비율과 지나치게 긴 문단(모바일 가독성 저하)을 점검합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const text = safe(ctx.activeText)
    const totalChars = charsNoSpace(text)
    if (totalChars === 0) {
      return {
        kind: 'gauge',
        value: 0,
        min: 0,
        max: 100,
        unit: '%',
        label: '대사 비율',
        tier: 'warn',
        note: '본문이 비어 있습니다.',
      }
    }
    const dialogues = extractDialogue(text)
    const dialogueChars = dialogues.reduce((a, d) => a + charsNoSpace(d), 0)
    const ratio = round1(clamp(pct(dialogueChars, totalChars), 0, 100))
    // 긴 문단 경고(공백 제외 200자 초과).
    const paras = splitParagraphs(text)
    const longParas = paras.filter((p) => charsNoSpace(p) > 200)
    let tier: Tier
    let note: string
    if (ratio < 15) {
      tier = 'warn'
      note = `대사 비율이 낮습니다(${ratio}%). 웹소설은 대사 위주 전개가 빠르게 읽힙니다.`
    } else if (ratio > 75) {
      tier = 'warn'
      note = `대사 비율이 매우 높습니다(${ratio}%). 상황 묘사가 부족할 수 있습니다.`
    } else {
      tier = 'ok'
      note = `대사 비율 양호(${ratio}%).`
    }
    if (longParas.length > 0) {
      const maxLen = longParas.reduce((m, p) => Math.max(m, charsNoSpace(p)), 0)
      tier = tier === 'ok' ? 'warn' : tier
      note += ` 200자 초과 긴 문단 ${longParas.length}개(최대 ${maxLen}자) — 모바일에서 잘게 나누세요.`
    }
    return {
      kind: 'gauge',
      value: ratio,
      min: 0,
      max: 100,
      unit: '%',
      label: '대사 비율(공백 제외 글자 기준)',
      tier,
      note,
    }
  },
}

// ── 7. 회차별 POV/화자 추적 ─────────────────────────────────────
const wnPovTrack: Analyzer = {
  id: 'wn-pov-track',
  name: 'POV·화자 추적',
  kind: '웹소설 연재',
  scope: 'manuscript',
  intro: '장면별 1인칭/3인칭 시점을 추정하고, 한 회차 안에서 시점이 흔들리는 구간을 경고합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const scenes = ctx.scenes || []
    const FIRST = ['나는', '내가', '나의', '나도', '날 ', '내 ', '우리는', '우리가', '나에게', '내게']
    const THIRD_PRON = ['그는', '그녀는', '그가', '그녀가', '그의', '그녀의', '그들은', '그들이']
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
    let prevPov: '1인칭' | '3인칭' | null = null
    for (const sc of scenes) {
      // 대사 안의 '나'는 시점 판단에서 제외 — 대사 구간을 제거한 서술부만 검사.
      let narration = safe(sc.text)
      for (const d of extractDialogue(narration)) {
        narration = narration.replace(d, ' ')
      }
      const first = countHits(narration, FIRST)
      const third = countHits(narration, THIRD_PRON)
      let pov: '1인칭' | '3인칭' | '불명'
      if (first === 0 && third === 0) pov = '불명'
      else if (first >= third * 1.3) pov = '1인칭'
      else if (third >= first * 1.3) pov = '3인칭'
      else pov = '불명'
      // 한 장면 안 시점 혼재(둘 다 충분히 많음).
      const mixedInside = first >= 3 && third >= 3 && Math.abs(first - third) < Math.max(first, third) * 0.4
      const switched = prevPov && pov !== '불명' && prevPov !== pov
      let tier: Tier = 'ok'
      const flags: string[] = []
      if (pov === '불명') {
        tier = 'warn'
        flags.push('시점 단서 부족')
      }
      if (mixedInside) {
        tier = 'bad'
        flags.push('한 회 내 1·3인칭 혼재')
      } else if (switched) {
        tier = 'warn'
        flags.push(`이전 회(${prevPov}) → 시점 전환`)
      }
      const sub = `추정 ${pov} (1인칭 신호 ${first} / 3인칭 신호 ${third})${flags.length ? ' · ' + flags.join(', ') : ''}`
      items.push({ text: trunc(sc.title || `${sc.index + 1}화`, 26), sub, tier, sceneId: sc.id })
      if (pov !== '불명') prevPov = pov
    }
    return {
      kind: 'list',
      items,
      note: items.length ? '의도적 시점 전환이 아니라면 회차 내 1·3인칭 혼재는 가독성을 해칩니다.' : undefined,
      empty: '분석할 회차가 없습니다.',
    }
  },
}

// ── 8. 용어집 자동 추출 ─────────────────────────────────────────
const wnGlossary: Analyzer = {
  id: 'wn-glossary',
  name: '용어집·표기 흔들림',
  kind: '웹소설 연재',
  scope: 'manuscript',
  intro: '반복되는 고유명사/조어 후보를 빈도순으로 추출하고, 표기가 흔들리는 후보를 함께 표시합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const text = safe(ctx.full)
    if (!hasKorean(text)) {
      // 한글이 없으면 빈도 추출만(영문 토큰 기준).
      const freqEn = new Map<string, number>()
      for (const w of wordTokens(text)) {
        if (w.length < 3) continue
        freqEn.set(w, (freqEn.get(w) || 0) + 1)
      }
      const itemsEn = [...freqEn.entries()]
        .filter(([, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([w, n]) => ({ text: w, sub: `${n}회` }))
      return {
        kind: 'list',
        items: itemsEn,
        empty: '반복되는 용어 후보가 없습니다(본문이 짧거나 비어 있음).',
      }
    }
    // 한글 2자 이상 연속 토큰 빈도. 흔한 일반어는 약하게 배제.
    const STOP = new Set([
      '그리고', '하지만', '그러나', '그래서', '그런데', '그리하여', '그러면', '그러자', '이렇게', '저렇게',
      '그것', '이것', '저것', '여기', '거기', '저기', '자신', '사람', '생각', '모습', '순간', '정도', '때문',
      '얼굴', '소리', '눈빛', '마음', '시간', '오늘', '내일', '어제', '지금', '다시', '모두', '우리', '당신',
    ])
    const freq = new Map<string, number>()
    let m: RegExpExecArray | null
    PROPER_RE.lastIndex = 0
    while ((m = PROPER_RE.exec(text))) {
      const w = m[0]
      if (w.length < 2 || w.length > 8) continue
      if (STOP.has(w)) continue
      freq.set(w, (freq.get(w) || 0) + 1)
    }
    const ranked = [...freq.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
    // 표기 흔들림 후보: 한 글자만 다르거나, 한쪽이 다른쪽의 접두인 유사쌍(상위 후보 한정).
    const top = ranked.slice(0, 60).map(([w]) => w)
    const wobble: string[] = []
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const a = top[i]
        const b = top[j]
        if (Math.abs(a.length - b.length) > 1) continue
        if (a.length >= 2 && b.length >= 2 && (b.startsWith(a) || a.startsWith(b)) && a !== b) {
          wobble.push(`${a} / ${b}`)
        }
      }
    }
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = ranked
      .slice(0, 30)
      .map(([w, n]) => ({ text: w, sub: `${n}회` }))
    if (wobble.length) {
      items.push({
        text: '표기 흔들림 후보',
        sub: wobble.slice(0, 12).join(', '),
        tier: 'warn',
      })
    }
    return {
      kind: 'list',
      items,
      note: items.length ? '빈도 3회 이상 한글 후보. 고유명사가 아닌 일반어는 무시하세요(자동 추출).' : undefined,
      empty: '반복되는 용어 후보가 없습니다(본문이 짧거나 비어 있음).',
    }
  },
}

// ── 9. 문단·문장 호흡 ───────────────────────────────────────────
const wnParagraphRhythm: Analyzer = {
  id: 'wn-paragraph-rhythm',
  name: '문단·문장 호흡',
  kind: '웹소설 연재',
  scope: 'document',
  intro: '모바일 가독성 — 평균 문장 길이와 문단당 문장 수를 집계하고 과밀 문단을 경고합니다.',
  run(ctx: AnalyzerContext): AnalyzerResult {
    const text = safe(ctx.activeText)
    const paras = splitParagraphs(text)
    const sents = splitSentences(text)
    if (paras.length === 0 || sents.length === 0) {
      return {
        kind: 'stat',
        stats: [
          { label: '문단 수', value: String(paras.length) },
          { label: '문장 수', value: String(sents.length) },
        ],
        note: '본문이 비어 있어 호흡을 분석할 수 없습니다.',
      }
    }
    const totalChars = sents.reduce((a, s) => a + s.length, 0)
    const avgSentLen = round1(totalChars / sents.length)
    const avgSentPerPara = round1(sents.length / paras.length)
    // 문단당 문장 수 추정(문단별 종결부호 개수 근사).
    const denseParas = paras.filter((p) => splitSentences(p).length >= 5)
    const longestPara = paras.reduce((m, p) => Math.max(m, p.length), 0)

    const sentTier: Tier = avgSentLen > 70 ? 'bad' : avgSentLen > 50 ? 'warn' : 'ok'
    const paraTier: Tier = avgSentPerPara > 4 ? 'bad' : avgSentPerPara > 3 ? 'warn' : 'ok'
    const denseTier: Tier = denseParas.length > 0 ? 'warn' : 'ok'

    const notes: string[] = []
    if (sentTier !== 'ok') notes.push('평균 문장이 깁니다 — 모바일에서는 짧게 끊으세요.')
    if (paraTier !== 'ok') notes.push('문단당 문장 수가 많습니다 — 1~3문장 단위 분할 권장.')
    if (denseParas.length) notes.push(`5문장 이상 과밀 문단 ${denseParas.length}개.`)

    return {
      kind: 'stat',
      stats: [
        { label: '문단 수', value: `${paras.length}` },
        { label: '문장 수', value: `${sents.length}` },
        { label: '평균 문장 길이', value: `${avgSentLen}자`, tier: sentTier },
        { label: '문단당 평균 문장', value: `${avgSentPerPara}개`, tier: paraTier },
        { label: '가장 긴 문단', value: `${longestPara}자` },
        { label: '과밀 문단(≥5문장)', value: `${denseParas.length}개`, tier: denseTier },
      ],
      note: notes.length ? notes.join(' ') : '문단·문장 호흡이 모바일 가독성에 적합합니다.',
    }
  },
}

export const ANALYZERS_WEBNOVEL: Analyzer[] = [
  wnEpisodeLength,
  wnCliffhanger,
  wnOpeningHook,
  wnCiderSweetPotato,
  wnForbiddenWords,
  wnDialogueRatio,
  wnPovTrack,
  wnGlossary,
  wnParagraphRhythm,
]

// node --experimental-strip-types 단독 실행 시 가벼운 스모크 테스트(빈 입력/샘플).
// import 되어 사용될 때는 실행되지 않음.
const isMain = (() => {
  try {
    const ref = (globalThis as { process?: { argv?: string[] } }).process?.argv?.[1] || ''
    return /analyzers-webnovel\.ts$/.test(ref.replace(/\\/g, '/'))
  } catch {
    return false
  }
})()
if (isMain) {
  const mkItem = (id: string, title: string): BinderItem =>
    ({ id, title, type: 'text', plainText: '', bodyRtf: '', wordCount: 0, childIds: [], includeInCompile: true } as unknown as BinderItem)
  const emptyCtx: AnalyzerContext = {
    project: {} as AnalyzerContext['project'],
    scenes: [],
    full: '',
    active: null,
    activeText: '',
  }
  const sample =
    '"누구야?"\n그가 천천히 고개를 돌렸다. 나는 숨을 죽였다. 갑자기 비명이 들렸다.\n드디어 그를 이겼다. 마침내 복수에 성공했다. 그런데 그때, 죽었다던 적이 다시 나타났다.'
  const sampleScene = {
    id: 's1',
    title: '1화',
    text: sample,
    words: 20,
    index: 0,
    chapterId: null,
    chapterTitle: '(장 없음)',
    item: mkItem('s1', '1화'),
  } as unknown as AnalyzerContext['scenes'][number]
  const sampleCtx: AnalyzerContext = {
    project: {} as AnalyzerContext['project'],
    scenes: [sampleScene],
    full: sample,
    active: mkItem('s1', '1화'),
    activeText: sample,
  }
  let okCount = 0
  for (const a of ANALYZERS_WEBNOVEL) {
    try {
      const r1 = a.run(emptyCtx)
      const r2 = a.run(sampleCtx)
      if (!r1 || !r2 || !r1.kind || !r2.kind) throw new Error('결과 형식 누락')
      okCount++
      console.log(`OK  ${a.id} (${a.name}) :: empty=${r1.kind}, sample=${r2.kind}`)
    } catch (e) {
      console.error(`FAIL ${a.id}:`, e)
    }
  }
  console.log(`\n${okCount}/${ANALYZERS_WEBNOVEL.length} 분석기 통과`)
}
