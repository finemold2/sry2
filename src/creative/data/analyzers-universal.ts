// 범용 점검 분석기 — 장르 불문 모든 글쓰기에 적용되는 퇴고/문장 위생 도구 모음.
// 반복어·퇴고 체크리스트·감정 곡선·대화 태그·분량 균형·문장 다양성·부사 밀도.
// 모든 run 은 순수 함수이며 빈 입력(scenes 0개/빈 텍스트/active null)에서도 throw 하지 않는다.
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

const KIND = '범용 점검'

// ─────────────────────────────────────────────────────────────────────────────
// 공용 사전/유틸
// ─────────────────────────────────────────────────────────────────────────────

/** 분석에서 제외할 한국어/영어 기능어(조사·접속·대명사 등) — 반복으로 봐도 의미 없는 흔한 단어. */
const STOP = new Set<string>([
  '그', '이', '저', '것', '수', '등', '및', '내', '그것', '이것', '저것',
  '그리고', '그러나', '하지만', '그래서', '그런데', '또', '또한', '즉', '하여', '하며',
  '나', '너', '우리', '저희', '당신', '그녀', '그들', '자신',
  '있다', '없다', '하다', '되다', '이다', '아니다',
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'is', 'was',
  'it', 'he', 'she', 'they', 'we', 'i', 'you', 'that', 'this', 'as', 'for', 'with',
])

/** 부사 후보: 한국어 '-게/-이/-히/-리' 부사형 + 흔한 정도/빈도 부사. */
const ADVERB_ENDINGS = /(게|이|히|리|뿐|마저|조차)$/
const ADVERB_LEXICON = new Set<string>([
  '매우', '정말', '진짜', '너무', '아주', '굉장히', '몹시', '되게', '엄청', '완전',
  '그냥', '약간', '조금', '살짝', '거의', '대체로', '대단히', '무척', '한껏', '꽤',
  '문득', '갑자기', '천천히', '빠르게', '조용히', '가만히', '천천히', '서서히',
  '항상', '늘', '자주', '가끔', '종종', '때때로', '결국', '마침내', '드디어',
  '분명', '확실히', '아마', '어쩌면', '역시', '오히려', '결코', '절대',
])

/** 필터어(시점 거리감을 만드는 인지 동사) — 퇴고 시 줄이면 몰입이 강해진다. */
const FILTER_WORDS = [
  '느꼈다', '느꼈', '보였다', '들렸다', '생각했다', '생각이', '깨달았다', '알았다',
  '보았다', '바라보았다', '지켜보았다', '눈치챘다', '듣게', '보게', '느끼며', '생각하며',
]

/** 약한/모호한 동사(구체 동사로 교체 권장). */
const WEAK_VERBS = [
  '했다', '있었다', '되었다', '됐다', '갔다', '왔다', '봤다', '말했다', '나왔다', '들어갔다',
]

/** 화자 표지 동사 후보(대사 뒤 지문). '말했다' 위주 쏠림을 본다. */
const SPEECH_VERBS = [
  '말했다', '물었다', '대답했다', '답했다', '외쳤다', '소리쳤다', '속삭였다', '중얼거렸다',
  '되물었다', '내뱉었다', '읊조렸다', '덧붙였다', '말을', '입을', '웃었다', '울었다',
]

/** 긍정 정서 어휘(근사). */
const POSITIVE = [
  '기쁨', '기뻤', '기쁘', '행복', '웃음', '웃었', '웃으', '사랑', '설렘', '설렜', '희망',
  '따뜻', '평온', '안도', '환했', '밝았', '빛났', '아름다', '눈부', '포근', '다정', '감사',
  '벅찼', '벅차', '환희', '미소', '즐거', '신났', '편안', '온화', '반가', '뿌듯',
]
/** 부정 정서 어휘(근사). */
const NEGATIVE = [
  '슬픔', '슬펐', '슬프', '눈물', '울었', '울음', '분노', '화났', '분했', '두려', '무서',
  '공포', '불안', '절망', '고통', '아팠', '아프', '괴로', '외로', '쓸쓸', '비명', '죽음',
  '죽었', '피', '어둠', '차가', '싸늘', '증오', '미움', '후회', '죄책', '떨렸', '식은땀',
  '울부', '비참', '참담', '암담', '절규', '몸서리', '소름', '경악', '오싹',
]

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function pct(num: number, den: number): number {
  if (!den || den <= 0) return 0
  const v = (num / den) * 100
  return Number.isFinite(v) ? v : 0
}

function round1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10
}

/** 텍스트 첫 토큰(문장 시작 단어). 없으면 빈 문자열. */
function firstToken(s: string): string {
  const t = wordTokens(s)
  return t.length ? t[0] : ''
}

/** 부사 토큰 여부 판정(한국어 위주, 사전 + 어미 휴리스틱). */
function isAdverb(tok: string): boolean {
  if (!tok) return false
  if (ADVERB_LEXICON.has(tok)) return true
  // 2글자 이상 + 부사형 어미 + 한글일 때만(과탐지 방지: 1글자/영어 제외)
  if (tok.length >= 2 && hasKorean(tok) && ADVERB_ENDINGS.test(tok)) return true
  return false
}

function countOccurrences(text: string, needles: string[]): number {
  if (!text) return 0
  let n = 0
  for (const w of needles) {
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

function snippet(s: string, len = 60): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > len ? t.slice(0, len) + '…' : t
}

// ─────────────────────────────────────────────────────────────────────────────
// 분석기 구현
// ─────────────────────────────────────────────────────────────────────────────

/** un-echo: 근접 문장(슬라이딩 윈도) 내 동일 내용어 반복(에코) 탐지. */
const echo: Analyzer = {
  id: 'un-echo',
  name: '반복어·에코 탐지',
  kind: KIND,
  intro: '서로 가까운 문장들에서 같은 단어가 되풀이되는 "에코"를 찾습니다. 의도치 않은 반복은 문장을 둔하게 만듭니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const WINDOW = 3 // 현재 문장 포함 앞뒤로 보는 문장 수
    const MIN_LEN = 2 // 최소 글자 수(1글자 과탐지 방지)
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
    const scenes = ctx.scenes && ctx.scenes.length ? ctx.scenes : null

    type Unit = { sceneId?: string; text: string }
    const units: Unit[] = []
    if (scenes) {
      for (const sc of scenes) {
        for (const s of splitSentences(sc.text || '')) units.push({ sceneId: sc.id, text: s })
      }
    } else {
      for (const s of splitSentences(ctx.full || '')) units.push({ text: s })
    }

    const seen = new Set<string>()
    for (let i = 0; i < units.length; i++) {
      const toks = wordTokens(units[i].text).map((t) => t.toLowerCase())
      const local = new Set(toks.filter((t) => t.length >= MIN_LEN && !STOP.has(t)))
      for (let j = i + 1; j < Math.min(units.length, i + WINDOW); j++) {
        const otherToks = new Set(wordTokens(units[j].text).map((t) => t.toLowerCase()))
        for (const w of local) {
          if (!otherToks.has(w)) continue
          const key = i + '|' + w
          if (seen.has(key)) continue
          seen.add(key)
          items.push({
            text: `"${w}" 반복`,
            sub: `${snippet(units[i].text, 38)} → ${snippet(units[j].text, 38)}`,
            tier: 'warn',
            sceneId: units[i].sceneId,
          })
        }
      }
    }

    items.sort((a, b) => (a.sceneId || '').localeCompare(b.sceneId || ''))
    const top = items.slice(0, 60)
    return {
      kind: 'list',
      items: top,
      note: items.length
        ? `근접 ${WINDOW}문장 내 반복 ${items.length}건${items.length > top.length ? ` (상위 ${top.length}건 표시)` : ''}.`
        : '근접 문장 반복이 두드러지지 않습니다.',
      empty: '원고가 비어 있거나 에코가 발견되지 않았습니다.',
    }
  },
}

/** un-revision-checklist: 부사·필터어·약한동사·반복 문장시작 등 자동 점검 요약. */
const revisionChecklist: Analyzer = {
  id: 'un-revision-checklist',
  name: '퇴고 체크리스트',
  kind: KIND,
  intro: '부사 과다, 필터어, 약한 동사, 같은 단어로 시작하는 연속 문장 등 흔한 퇴고 포인트를 한눈에 점검합니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const text = ctx.full || ''
    const sentences = splitSentences(text)
    const tokens = wordTokens(text)
    const totalTokens = tokens.length
    const adverbCount = tokens.filter(isAdverb).length
    const adverbPct = pct(adverbCount, totalTokens)
    const filterCount = countOccurrences(text, FILTER_WORDS)
    const weakCount = countOccurrences(text, WEAK_VERBS)

    // 연속 문장이 같은 단어로 시작하는 횟수
    let sameStart = 0
    for (let i = 1; i < sentences.length; i++) {
      const a = firstToken(sentences[i - 1]).toLowerCase()
      const b = firstToken(sentences[i]).toLowerCase()
      if (a && a === b) sameStart++
    }

    // 매우 긴 문장(런온) 비율
    const longSentences = sentences.filter((s) => wordTokens(s).length > 45).length

    const checks: { label: string; pass: boolean; detail?: string; tier?: Tier }[] = []
    if (totalTokens === 0) {
      return {
        kind: 'score',
        score: 0,
        max: 5,
        checks: [{ label: '본문 없음', pass: false, detail: '점검할 텍스트가 없습니다.', tier: 'warn' }],
        note: '원고를 작성하면 퇴고 체크리스트가 채워집니다.',
      }
    }

    const advPass = adverbPct < 6
    checks.push({
      label: '부사 밀도',
      pass: advPass,
      detail: `${round1(adverbPct)}% (${adverbCount}/${totalTokens}) — 권장 6% 미만`,
      tier: advPass ? 'ok' : adverbPct < 9 ? 'warn' : 'bad',
    })

    const filterRate = pct(filterCount, sentences.length || 1)
    const filterPass = filterRate < 8
    checks.push({
      label: '필터어(느꼈다·보였다 등)',
      pass: filterPass,
      detail: `${filterCount}회 — 직접 묘사로 바꾸면 몰입↑`,
      tier: filterPass ? 'ok' : filterRate < 15 ? 'warn' : 'bad',
    })

    const weakRate = pct(weakCount, sentences.length || 1)
    const weakPass = weakRate < 25
    checks.push({
      label: '약한·모호한 동사',
      pass: weakPass,
      detail: `${weakCount}회 — 구체 동사로 교체 검토`,
      tier: weakPass ? 'ok' : weakRate < 40 ? 'warn' : 'bad',
    })

    const startRate = pct(sameStart, sentences.length || 1)
    const startPass = startRate < 12
    checks.push({
      label: '문장 시작 반복',
      pass: startPass,
      detail: `연속 동일 시작 ${sameStart}쌍 — 시작 단어를 다양화`,
      tier: startPass ? 'ok' : startRate < 20 ? 'warn' : 'bad',
    })

    const longRate = pct(longSentences, sentences.length || 1)
    const longPass = longRate < 10
    checks.push({
      label: '과도하게 긴 문장',
      pass: longPass,
      detail: `45단어 초과 ${longSentences}문장 — 호흡을 나눠보기`,
      tier: longPass ? 'ok' : longRate < 20 ? 'warn' : 'bad',
    })

    const score = checks.filter((c) => c.pass).length
    return {
      kind: 'score',
      score,
      max: checks.length,
      checks,
      note: `${score}/${checks.length} 항목 통과. 경고 항목부터 손보면 가독성이 빠르게 개선됩니다.`,
    }
  },
}

/** un-mood-curve: 장면별 긍/부정 어휘 차이로 감정 곡선(막대). */
const moodCurve: Analyzer = {
  id: 'un-mood-curve',
  name: '감정·분위기 곡선',
  kind: KIND,
  intro: '장면마다 긍정·부정 어휘를 세어 분위기의 흐름을 봅니다. 막대 길이는 정서 강도(0~100), 색은 긍/부정 방향을 나타냅니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const scenes = ctx.scenes || []
    if (!scenes.length) {
      return { kind: 'bars', rows: [], note: '장면이 없어 감정 곡선을 그릴 수 없습니다.' }
    }
    const rows: { label: string; value: number; max?: number; sub?: string; tier?: Tier; sceneId?: string }[] = []
    for (const sc of scenes) {
      const text = sc.text || ''
      const pos = countOccurrences(text, POSITIVE)
      const neg = countOccurrences(text, NEGATIVE)
      const total = pos + neg
      // 정서 강도: 어휘 밀도 기반(공백 제외 100자당 정서어). 0~100로 클램프.
      const density = pct(total, Math.max(1, charsNoSpace(text) / 100))
      const value = clamp(round1(density), 0, 100)
      // 방향: 부정 우세 bad, 긍정 우세 ok, 중립 warn
      let tier: Tier = 'warn'
      if (total > 0) {
        if (pos > neg * 1.2) tier = 'ok'
        else if (neg > pos * 1.2) tier = 'bad'
        else tier = 'warn'
      }
      rows.push({
        label: sc.title || `장면 ${sc.index + 1}`,
        value,
        max: 100,
        sub: `긍정 ${pos} · 부정 ${neg}`,
        tier,
        sceneId: sc.id,
      })
    }
    const anySignal = rows.some((r) => r.value > 0)
    return {
      kind: 'bars',
      rows,
      note: anySignal
        ? '초록=긍정 우세, 빨강=부정 우세, 노랑=중립/혼재. 곡선이 평탄하면 기복을 더해보세요.'
        : '정서 어휘가 거의 감지되지 않았습니다(건조한 서술 위주).',
    }
  },
}

/** un-dialogue-tag: 대화 태그(화자 표지) 다양성 + 과다 부사 지문 점검. */
const dialogueTag: Analyzer = {
  id: 'un-dialogue-tag',
  name: '대화 태그·지문 분석',
  kind: KIND,
  intro: "대사 뒤 화자 표지가 '말했다'에 쏠려 있는지, 지문에 부사가 과한지 살핍니다.",
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const scenes = ctx.scenes && ctx.scenes.length ? ctx.scenes : null
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []

    let dialogueLines = 0
    const verbCounts = new Map<string, number>()
    let saidCount = 0 // '말했다' 사용
    let adverbTagLines = 0 // 부사 들어간 지문 라인

    const scan = (text: string, sceneId?: string) => {
      const lines = splitParagraphs(text)
      for (const line of lines) {
        const d = extractDialogue(line)
        if (!d.length) continue
        dialogueLines++
        // 지문 = 라인에서 대사 따옴표 바깥 텍스트(근사: 대사 제거 후 남은 부분)
        let tagPart = line
        for (const seg of d) tagPart = tagPart.replace(seg, ' ')
        const tagToks = wordTokens(tagPart)
        // 화자 표지 동사 집계
        for (const v of SPEECH_VERBS) {
          if (tagPart.includes(v)) {
            verbCounts.set(v, (verbCounts.get(v) || 0) + 1)
            if (v === '말했다') saidCount++
          }
        }
        // 지문 부사 과다(부사 2개 이상)
        const advN = tagToks.filter(isAdverb).length
        if (advN >= 2) {
          adverbTagLines++
          if (items.length < 40) {
            items.push({
              text: `부사 ${advN}개 지문`,
              sub: snippet(tagPart, 70) || snippet(line, 70),
              tier: 'warn',
              sceneId,
            })
          }
        }
      }
    }

    if (scenes) for (const sc of scenes) scan(sc.text || '', sc.id)
    else scan(ctx.full || '')

    if (dialogueLines === 0) {
      return {
        kind: 'list',
        items: [],
        note: '대사 라인이 감지되지 않았습니다(서술 위주의 글).',
        empty: '따옴표로 묶인 대사가 없어 대화 태그를 분석하지 않았습니다.',
      }
    }

    const distinctVerbs = verbCounts.size
    const saidRate = pct(saidCount, dialogueLines)
    // 요약 헤더 항목 2개를 앞쪽에 삽입
    const head: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
    head.push({
      text: `화자 표지 다양성: ${distinctVerbs}종`,
      sub: distinctVerbs >= 4 ? '표지 어휘가 다양합니다.' : '표지 동사를 더 다양화해보세요.',
      tier: distinctVerbs >= 4 ? 'ok' : distinctVerbs >= 2 ? 'warn' : 'bad',
    })
    head.push({
      text: `'말했다' 비율: ${round1(saidRate)}%`,
      sub: `대사 ${dialogueLines}개 중 '말했다' 지문 ${saidCount}회`,
      tier: saidRate < 35 ? 'ok' : saidRate < 60 ? 'warn' : 'bad',
    })

    return {
      kind: 'list',
      items: [...head, ...items],
      note: adverbTagLines
        ? `부사 과다 지문 ${adverbTagLines}건 발견. 지문은 동작·구체 묘사로 보여주는 편이 강합니다.`
        : '지문의 부사 사용은 절제되어 있습니다.',
      empty: '대화 태그 점검 결과가 없습니다.',
    }
  },
}

/** un-chapter-balance: 장(chapter)별 누적 글자수 균형(막대). */
const chapterBalance: Analyzer = {
  id: 'un-chapter-balance',
  name: '챕터·씬 분량 균형',
  kind: KIND,
  intro: '장(章)별 누적 글자수를 비교해 분량 쏠림을 점검합니다. 너무 짧거나 비대한 장을 빠르게 찾습니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const scenes = ctx.scenes || []
    if (!scenes.length) {
      return { kind: 'bars', rows: [], note: '장면이 없어 분량 균형을 계산할 수 없습니다.' }
    }
    // 장별 누적
    const order: string[] = []
    const agg = new Map<string, { title: string; chars: number; scenes: number }>()
    for (const sc of scenes) {
      const key = sc.chapterId || '__none__'
      if (!agg.has(key)) {
        agg.set(key, { title: sc.chapterTitle || '(장 없음)', chars: 0, scenes: 0 })
        order.push(key)
      }
      const a = agg.get(key)!
      a.chars += charsNoSpace(sc.text || '')
      a.scenes++
    }
    const chapters = order.map((k) => ({ key: k, ...agg.get(k)! }))
    const max = chapters.reduce((m, c) => Math.max(m, c.chars), 0)
    const totalChars = chapters.reduce((s, c) => s + c.chars, 0)
    const avg = chapters.length ? totalChars / chapters.length : 0

    const rows = chapters.map((c) => {
      let tier: Tier = 'ok'
      if (avg > 0) {
        if (c.chars > avg * 1.8 || c.chars < avg * 0.4) tier = 'bad'
        else if (c.chars > avg * 1.4 || c.chars < avg * 0.6) tier = 'warn'
      }
      // 첫 씬의 id 를 대표 sceneId 로(클릭 이동용)
      const firstScene = scenes.find((s) => (s.chapterId || '__none__') === c.key)
      return {
        label: c.title,
        value: c.chars,
        max: max || 1,
        sub: `${c.scenes}씬 · ${c.chars.toLocaleString()}자`,
        tier,
        sceneId: firstScene ? firstScene.id : undefined,
      }
    })
    return {
      kind: 'bars',
      rows,
      note: chapters.length > 1
        ? `장 ${chapters.length}개 · 평균 ${Math.round(avg).toLocaleString()}자. 노랑/빨강 장은 평균 대비 편차가 큽니다.`
        : '장이 하나뿐이라 비교 대상이 없습니다(폴더로 장을 나누면 균형이 보입니다).',
    }
  },
}

/** un-sentence-variety: 연속 문장이 같은 단어로 시작하는 구간(목록). */
const sentenceVariety: Analyzer = {
  id: 'un-sentence-variety',
  name: '문장 시작 다양성',
  kind: KIND,
  intro: '연이은 문장이 같은 단어로 시작하면 리듬이 단조로워집니다. 그런 구간을 찾아 보여줍니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const scenes = ctx.scenes && ctx.scenes.length ? ctx.scenes : null
    const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []

    const scan = (text: string, sceneId?: string) => {
      const sentences = splitSentences(text)
      let runStart = 0
      let runWord = firstToken(sentences[0] || '').toLowerCase()
      for (let i = 1; i <= sentences.length; i++) {
        const w = i < sentences.length ? firstToken(sentences[i]).toLowerCase() : ''
        if (w && w === runWord) continue
        // run 종료: [runStart, i) 가 같은 시작 단어
        const len = i - runStart
        if (runWord && len >= 3) {
          items.push({
            text: `"${runWord}" (으)로 시작하는 문장 ${len}연속`,
            sub: snippet(sentences[runStart], 70),
            tier: len >= 4 ? 'bad' : 'warn',
            sceneId,
          })
        }
        runStart = i
        runWord = w
      }
    }

    if (scenes) for (const sc of scenes) scan(sc.text || '', sc.id)
    else scan(ctx.full || '')

    const top = items.slice(0, 60)
    return {
      kind: 'list',
      items: top,
      note: items.length
        ? `같은 단어로 3문장 이상 연속 시작하는 구간 ${items.length}건${items.length > top.length ? ` (상위 ${top.length}건)` : ''}.`
        : '문장 시작이 충분히 다양합니다.',
      empty: '본문이 비어 있거나 단조로운 시작 구간이 없습니다.',
    }
  },
}

/** un-adverb-density: 전체 부사 비율(게이지). 장면별 최고치 함께 안내. */
const adverbDensity: Analyzer = {
  id: 'un-adverb-density',
  name: '부사 밀도',
  kind: KIND,
  intro: '전체 단어 중 부사가 차지하는 비율입니다. 한국어 산문에서 6% 미만이면 담백, 그 이상이면 손볼 여지가 있습니다.',
  scope: 'manuscript',
  run: (ctx: AnalyzerContext): AnalyzerResult => {
    const text = ctx.full || ''
    const tokens = wordTokens(text)
    const total = tokens.length
    const adv = tokens.filter(isAdverb).length
    const ratio = pct(adv, total)

    // 장면별 최고 밀도 장면 찾기(안내용)
    let worst: { title: string; pct: number } | null = null
    for (const sc of ctx.scenes || []) {
      const t = wordTokens(sc.text || '')
      if (t.length < 30) continue // 표본 너무 작으면 제외
      const r = pct(t.filter(isAdverb).length, t.length)
      if (!worst || r > worst.pct) worst = { title: sc.title || `장면 ${sc.index + 1}`, pct: r }
    }

    let tier: Tier = 'ok'
    if (ratio >= 9) tier = 'bad'
    else if (ratio >= 6) tier = 'warn'

    const note =
      total === 0
        ? '본문이 없어 부사 밀도를 계산할 수 없습니다.'
        : worst
          ? `부사 ${adv}개 / 전체 ${total}단어. 최고 밀도 장면: "${worst.title}" ${round1(worst.pct)}%.`
          : `부사 ${adv}개 / 전체 ${total}단어.`

    return {
      kind: 'gauge',
      value: round1(ratio),
      min: 0,
      max: 15,
      unit: '%',
      label: '전체 부사 비율',
      tier,
      note,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export const ANALYZERS_UNIVERSAL: Analyzer[] = [
  echo,
  revisionChecklist,
  moodCurve,
  dialogueTag,
  chapterBalance,
  sentenceVariety,
  adverbDensity,
]

// BinderItem 타입은 향후 확장(active 문서 기반 분석)을 위해 import 유지.
export type { BinderItem }
