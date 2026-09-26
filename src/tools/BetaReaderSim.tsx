// 가상 독자 반응 시뮬레이터 — 장면(글)을 붙여넣으면, 다섯 페르소나(평론가·장르팬·일반 독자·편집자·초보 독자)가
//   "읽고 난 반응·궁금증·평점"을 들려준다. 외부 AI 없이, 글 자체에서 뽑은 로컬 지표(대화 비율·감각어·페이싱·
//   훅·명료성·감정·말하기/보여주기·물음표·과한 부사 등)를 페르소나별 가중 규칙으로 점수화해 반응 문장을 조립한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 없음. 영속은 localStorage('sry:tool:beta-reader-sim').
//   Web API: clipboard(복사, 미지원 시 textarea fallback)·speechSynthesis(반응 낭독, 미지원 graceful) 사용 — 언마운트 시 정리.
// 연계(linkbus): 좌측 바인더 파일 드롭 수용(getDragItem) · 인상적 반응을 스니펫 라이브러리/수집함에 저장 · 종합 리포트를 프로젝트 자료에 추가.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  getDragItem, isItemDrag,
  addToLibrary, addToStash, hasStash,
  addToProject, hasProjectBridge,
  Emoji, emojify,
} from './linkbus'

export const meta = {
  id: 'beta-reader-sim',
  name: '가상 독자 반응 시뮬',
  icon: '👓',
  group: '영감·발상',
  intro: '장면을 붙여넣으면 평론가·장르팬·일반·편집자·초보 독자 다섯 페르소나가 반응·궁금증·평점을 들려줍니다',
  w: 860,
  h: 720,
}

const LS = 'sry:tool:beta-reader-sim'

// ───────────────────────── HTML escape (프로젝트 본문 안전화) ─────────────────────────
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ───────────────────────── 텍스트 지표 추출 ─────────────────────────
// 모든 점수는 글 자체에서 결정적(deterministic)으로 계산 → 같은 글은 항상 같은 반응.
interface Metrics {
  chars: number          // 공백 제외 글자수
  words: number          // 어절 수
  sentences: number      // 문장 수
  paragraphs: number     // 문단 수
  avgSentLen: number     // 평균 문장 길이(어절)
  longSentRatio: number  // 너무 긴 문장 비율(0~1)
  dialogueRatio: number  // 대사 글자수 비율(0~1)
  dialogueLines: number  // 대사 줄 수
  questionRatio: number  // 물음표 문장 비율(0~1)
  exclaimRatio: number   // 느낌표 문장 비율(0~1)
  sensoryHits: number    // 감각어 출현 수
  sensoryDensity: number // 감각어 밀도(천 글자당)
  adverbHits: number     // '~게/히/이' 부사 추정 수
  adverbDensity: number  // 부사 밀도(천 글자당)
  fillerHits: number     // 군더더기(그리고/그냥/사실…) 수
  tellHits: number       // 감정 직접서술(슬펐다/화가 났다…) 수
  emotionHits: number    // 감정 어휘 총 수
  properNouns: number    // 고유명사 추정(따옴표·대문자 외 한국어 이름 패턴은 어려워 근사) — 미사용 보조
  repeatedTop: { word: string; n: number } | null // 가장 많이 반복된 의미어
  hookScore: number      // 첫 문장 훅 강도(0~100)
  clarity: number        // 명료성(0~100) — 긴문장·부사·군더더기 역가중
  immersion: number      // 몰입/감각(0~100)
  tension: number        // 긴장·갈등 신호(0~100)
  voice: number          // 목소리/개성(0~100) — 대사·리듬 변화
  pacing: number         // 페이싱(0~100)
  showing: number        // 보여주기(0~100) — tell 역가중 + 감각
  empty: boolean
}

const SENSORY = [
  // 시각
  '빛','어둠','그림자','색','붉','푸르','희','검','노랗','반짝','번쩍','흐릿','선명','눈부','일렁','어른거',
  // 청각
  '소리','울','메아리','속삭','외침','비명','삐걱','쿵','탁','쏴','웅성','정적','적막','고요','쩌렁',
  // 후각·미각
  '냄새','향','비린','달큰','쓴','시큼','짭짤','매캐','구수','코를',
  // 촉각·온도
  '차갑','뜨겁','따뜻','서늘','축축','메마','거칠','매끄','부드럽','끈적','소름','떨림','간지','쓰라',
  // 신체 반응(보여주기)
  '심장','숨','호흡','손끝','어깨','목덜미','등줄기','입술','주먹','피',
]
const EMOTION = [
  '두려','무서','겁','불안','초조','떨','분노','화','격분','슬프','슬픔','눈물','울','외로','그리',
  '기쁘','환희','벅차','설레','두근','안도','후회','수치','부끄','절망','희망','증오','미움','연민','죄책','경악','당황','막막',
]
// 감정 '직접 서술'(=말하기) 패턴 — 보여주기로 바꿀 후보
const TELL = [
  '슬펐다','슬펐','화가 났다','화가 치밀','무서웠다','무서웠','두려웠다','기뻤다','행복했다','외로웠다',
  '불안했다','초조했다','설렜다','당황했다','후회했다','절망했다','분노했다','긴장했다','놀랐다','신났다',
]
const ADVERB_RE = /[가-힣]{1,4}(게|히|이)\b/g   // 한국어 부사 근사(완벽치 않음)
const FILLER = ['그리고','그래서','그러나','하지만','그냥','사실','정말','진짜','아주','매우','너무','좀','막','뭔가','약간','조금']

// 한 문장 안에 '~지만/~는데/그러나/하지만/충돌/맞섰/싸/막아/거부/위협/위험/긴박/쫓' 등 긴장 신호
const TENSION = ['지만','는데','그러나','하지만','맞','싸','막','거부','위협','위험','긴박','쫓','피','칼','총','죽','죽음','비명','쾅','폭발','위기','다급','버티','대결','갈등','배신','분노','노려','맞섰']

function clamp(n: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, n)) }

function countOccurrences(text: string, needles: string[]): number {
  let n = 0
  for (const w of needles) {
    if (!w) continue
    let idx = text.indexOf(w)
    while (idx >= 0) { n++; idx = text.indexOf(w, idx + w.length) }
  }
  return n
}

// 대사 추출 — "…"/“…”/「…」/'…' 안의 글자수 합. 줄 시작 대시(— / -)도 대사로 본다.
function dialogueChars(text: string): { chars: number; lines: number } {
  let chars = 0
  let lines = 0
  const re = /[“"「『]([^”"」』\n]{0,800})[”"」』]|‘([^’'\n]{1,800})’/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const inner = (m[1] ?? m[2] ?? '')
    chars += inner.replace(/\s/g, '').length
    lines++
  }
  // 줄머리 대시 대사
  for (const ln of text.split(/\n/)) {
    const t = ln.trim()
    if (/^[—–-]\s?\S/.test(t)) { chars += t.replace(/^[—–-]\s?/, '').replace(/\s/g, '').length; lines++ }
  }
  return { chars, lines }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?。！？…])\s+/g, '$1')
    .replace(/\n+/g, '')
    .split('')
    .map((s) => s.trim())
    .filter(Boolean)
}

function topRepeatedWord(text: string): { word: string; n: number } | null {
  const stop = new Set(['그리고','그러나','하지만','그것','그녀','그는','나는','내가','우리','당신','그래서','이것','저것','때문','그런','이런','저런','정말','너무','다시','조금'])
  const freq = new Map<string, number>()
  const tokens = text.match(/[가-힣]{2,}/g) || []
  for (const raw of tokens) {
    // 흔한 조사 꼬리 제거(근사)
    const w = raw.replace(/(은|는|이|가|을|를|에|의|로|와|과|도|만|에서|에게|보다|처럼|까지|부터|마다)$/u, '')
    if (w.length < 2 || stop.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  let best: { word: string; n: number } | null = null
  for (const [w, n] of freq) if (n >= 3 && (!best || n > best.n)) best = { word: w, n }
  return best
}

function analyze(text: string): Metrics {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      chars: 0, words: 0, sentences: 0, paragraphs: 0, avgSentLen: 0, longSentRatio: 0,
      dialogueRatio: 0, dialogueLines: 0, questionRatio: 0, exclaimRatio: 0,
      sensoryHits: 0, sensoryDensity: 0, adverbHits: 0, adverbDensity: 0, fillerHits: 0,
      tellHits: 0, emotionHits: 0, properNouns: 0, repeatedTop: null,
      hookScore: 0, clarity: 0, immersion: 0, tension: 0, voice: 0, pacing: 0, showing: 0, empty: true,
    }
  }
  const chars = trimmed.replace(/\s/g, '').length
  const words = (trimmed.match(/\S+/g) || []).length
  const sents = splitSentences(trimmed)
  const sentences = Math.max(1, sents.length)
  const paragraphs = Math.max(1, trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length)
  const sentLens = sents.map((s) => (s.match(/\S+/g) || []).length)
  const avgSentLen = words / sentences
  const longSentRatio = sentLens.filter((l) => l > 28).length / sentences

  const dlg = dialogueChars(trimmed)
  const dialogueRatio = chars ? clamp(dlg.chars / chars, 0, 1) : 0

  const questionRatio = sents.filter((s) => /[?？]/.test(s)).length / sentences
  const exclaimRatio = sents.filter((s) => /[!！]/.test(s)).length / sentences

  const sensoryHits = countOccurrences(trimmed, SENSORY)
  const emotionHits = countOccurrences(trimmed, EMOTION)
  const tellHits = countOccurrences(trimmed, TELL)
  const fillerHits = countOccurrences(' ' + trimmed, FILLER.map((f) => ' ' + f))
  const adverbHits = (trimmed.match(ADVERB_RE) || []).length
  const per1k = (n: number) => (chars ? (n / chars) * 1000 : 0)
  const sensoryDensity = per1k(sensoryHits)
  const adverbDensity = per1k(adverbHits)

  const repeatedTop = topRepeatedWord(trimmed)

  // 첫 문장 훅 — 길이 적절 + 행동/대사/감각/물음 신호로 가산
  const first = sents[0] || ''
  let hook = 30
  const fl = (first.match(/\S+/g) || []).length
  if (fl >= 4 && fl <= 18) hook += 18
  if (/[“"「『—–-]/.test(first)) hook += 14         // 대사·대시로 시작
  if (/[?？]/.test(first)) hook += 12               // 질문으로 시작
  if (countOccurrences(first, TENSION) > 0) hook += 16
  if (countOccurrences(first, SENSORY) > 0) hook += 10
  if (countOccurrences(first, ['이다','였다','것이다']) === 0) hook += 6 // 설명형 종결 회피
  if (fl > 30) hook -= 14
  const hookScore = clamp(hook)

  // 명료성 — 긴 문장·부사·군더더기·반복이 깎는다
  let clarity = 86
  clarity -= longSentRatio * 40
  clarity -= Math.min(28, adverbDensity * 2.2)
  clarity -= Math.min(20, (fillerHits / Math.max(1, sentences)) * 24)
  if (avgSentLen > 24) clarity -= 10
  if (repeatedTop && repeatedTop.n >= 5) clarity -= 8
  const clarityScore = clamp(clarity)

  // 몰입/감각 — 감각어 밀도가 핵심
  let immersion = 28 + Math.min(52, sensoryDensity * 6)
  if (sensoryHits === 0) immersion -= 14
  immersion += Math.min(12, emotionHits * 2)
  const immersionScore = clamp(immersion)

  // 긴장·갈등 — 긴장 신호 + 대사 + 짧은 문장 리듬
  const tensionHits = countOccurrences(trimmed, TENSION)
  let tension = 24 + Math.min(46, per1k(tensionHits) * 5)
  tension += Math.min(14, dialogueRatio * 22)
  if (avgSentLen < 12) tension += 8        // 짧은 문장 = 빠른 호흡
  if (questionRatio > 0.1) tension += 6
  const tensionScore = clamp(tension)

  // 목소리/개성 — 대사 비율 + 문장 길이 변주 + 느낌표/물음표 변화
  const variance = sentLens.length > 1
    ? (() => { const m = avgSentLen; const v = sentLens.reduce((a, l) => a + (l - m) ** 2, 0) / sentLens.length; return Math.sqrt(v) })()
    : 0
  let voice = 34 + Math.min(26, dialogueRatio * 40) + Math.min(22, variance * 1.6)
  voice += Math.min(8, (questionRatio + exclaimRatio) * 16)
  const voiceScore = clamp(voice)

  // 페이싱 — 평균 문장 길이의 '적정 구간'(8~18어절)에서 최고, 양 극단에서 하락 + 문단 분할 가산
  let pacing = 50
  if (avgSentLen <= 18 && avgSentLen >= 8) pacing += 22
  else if (avgSentLen < 8) pacing += 6
  else pacing -= Math.min(30, (avgSentLen - 18) * 2.2)
  pacing += Math.min(14, (paragraphs - 1) * 4)
  pacing += Math.min(10, dialogueRatio * 18)
  const pacingScore = clamp(pacing)

  // 보여주기 — tell(직접서술) 역가중 + 감각/신체반응 가산
  let showing = 50 + Math.min(34, sensoryDensity * 5)
  showing -= Math.min(40, tellHits * 9)
  const showingScore = clamp(showing)

  return {
    chars, words, sentences, paragraphs, avgSentLen, longSentRatio,
    dialogueRatio, dialogueLines: dlg.lines, questionRatio, exclaimRatio,
    sensoryHits, sensoryDensity, adverbHits, adverbDensity, fillerHits,
    tellHits, emotionHits, properNouns: 0, repeatedTop,
    hookScore, clarity: clarityScore, immersion: immersionScore, tension: tensionScore,
    voice: voiceScore, pacing: pacingScore, showing: showingScore, empty: false,
  }
}

// ───────────────────────── 페르소나 정의 ─────────────────────────
type Mood = 'love' | 'like' | 'mixed' | 'meh'
interface Reaction {
  rating: number          // 0~5 (0.5 단위)
  mood: Mood
  headline: string        // 한 줄 총평
  reactions: string[]     // 읽으며 든 생각/감정(2~4)
  questions: string[]     // 작가에게 던지는 질문(2~3)
  praise: string[]        // 좋았던 점
  gripes: string[]        // 걸린 점
}
interface PersonaDef {
  key: string
  name: string
  icon: string
  blurb: string           // 이 독자는 누구인가
  weights: Partial<Record<keyof Metrics, number>> & { hookScore?: number }
  // 각 페르소나 고유의 반응 생성기
  react: (m: Metrics, score: number) => Pick<Reaction, 'headline' | 'reactions' | 'questions' | 'praise' | 'gripes'>
}

function pct(n: number): string { return Math.round(n) + '점' }

// 가중 평균(각 페르소나가 중시하는 지표만으로 0~100 종합 점수)
function weightedScore(m: Metrics, w: PersonaDef['weights']): number {
  let sum = 0, tot = 0
  for (const k in w) {
    const weight = (w as Record<string, number>)[k]
    const val = (m as unknown as Record<string, number>)[k]
    if (typeof val === 'number' && typeof weight === 'number') { sum += val * weight; tot += weight }
  }
  return tot ? clamp(sum / tot) : 50
}

function moodOf(score: number): Mood {
  if (score >= 78) return 'love'
  if (score >= 62) return 'like'
  if (score >= 46) return 'mixed'
  return 'meh'
}
function ratingOf(score: number): number {
  // 0~100 → 0.5~5.0, 0.5 단위 반올림
  const r = 0.5 + (score / 100) * 4.5
  return Math.round(r * 2) / 2
}

const PERSONAS: PersonaDef[] = [
  {
    key: 'critic',
    name: '깐깐한 평론가',
    icon: '🧐',
    blurb: '문장·구조·기교를 본다. 클리셰·과잉 수식·말하기를 가차없이 지적한다.',
    weights: { clarity: 1.4, showing: 1.3, voice: 1.2, hookScore: 0.9, pacing: 0.8, immersion: 0.7 },
    react: (m) => {
      const reactions: string[] = []
      const questions: string[] = []
      const praise: string[] = []
      const gripes: string[] = []
      if (m.tellHits > 0) gripes.push(`감정을 ${m.tellHits}곳에서 직접 서술했습니다("슬펐다" 식). 행동·신체 반응으로 보여주면 더 신뢰가 갑니다.`)
      else praise.push('감정을 직접 진술하지 않고 정황으로 드러낸 점, 절제가 보입니다.')
      if (m.adverbDensity > 12) gripes.push(`부사 밀도가 높습니다(천 자당 ${m.adverbDensity.toFixed(1)}). "~게/히"로 의미를 떠받치고 있진 않은지.`)
      if (m.longSentRatio > 0.25) gripes.push('긴 문장이 많아 호흡이 늘어집니다. 한두 문장은 끊어 칠 곳이 있습니다.')
      else if (m.avgSentLen < 8) reactions.push('문장이 짧고 단단합니다. 미니멀한 문체로 읽힙니다.')
      if (m.repeatedTop && m.repeatedTop.n >= 5) gripes.push(`"${m.repeatedTop.word}"이(가) ${m.repeatedTop.n}회 반복됩니다. 변주가 필요합니다.`)
      if (m.hookScore >= 60) praise.push('첫 문장이 독자를 붙잡습니다.')
      else reactions.push('도입이 다소 평이합니다. 첫 문장에서 한 번 더 손을 쓸 여지가 있습니다.')
      if (m.dialogueRatio > 0.55) reactions.push('대사 의존도가 높습니다. 지문이 받쳐주는지 점검이 필요합니다.')
      questions.push('이 장면이 작품 전체에서 어떤 기능(전환·폭로·고조)을 합니까?')
      questions.push('가장 쳐내도 되는 한 문장을 꼽는다면 어디입니까?')
      reactions.push(m.showing >= 65 ? '감각으로 그려낸 대목들이 살아 있습니다.' : '관념적 진술이 장면을 멀게 만듭니다. 구체로 내려가세요.')
      return {
        headline: m.showing >= 65 && m.clarity >= 65 ? '문장이 제 몫을 한다. 다만 한 번 더 깎을 곳이 보인다.' : '재료는 있다. 문장의 군더더기를 덜어내야 한다.',
        reactions, questions, praise, gripes,
      }
    },
  },
  {
    key: 'fan',
    name: '장르 팬',
    icon: '🤩',
    blurb: '몰입과 텐션을 원한다. "다음이 궁금한가"가 전부. 떡밥·사이다·긴장에 반응.',
    weights: { tension: 1.5, hookScore: 1.3, immersion: 1.2, voice: 1.0, pacing: 1.0 },
    react: (m) => {
      const reactions: string[] = []
      const questions: string[] = []
      const praise: string[] = []
      const gripes: string[] = []
      if (m.tension >= 62) { praise.push('긴장감이 끝까지 안 풀려요! 손에 땀 났어요.'); reactions.push('심장 쫄깃해지는 장면이었어요 🔥') }
      else { gripes.push('조금 잔잔했어요. 갈등이나 위기가 한 번 터져줬으면.'); reactions.push('나쁘진 않은데… 다음 장면이 막 궁금하진 않았어요.') }
      if (m.hookScore >= 60) reactions.push('첫 줄부터 확 끌려 들어갔어요.')
      if (m.dialogueLines >= 3) praise.push('대사 티키타카가 재밌어요. 캐릭터 케미가 보여요.')
      if (m.exclaimRatio > 0.2 || m.questionRatio > 0.15) reactions.push('감정 텐션이 들쭉날쭉해서 지루할 틈이 없네요.')
      if (m.immersion >= 65) praise.push('장면이 눈앞에 그려졌어요. 영상처럼 봤어요.')
      else reactions.push('상황은 알겠는데 "그 자리에 있는" 느낌까진 안 났어요.')
      questions.push('이 다음에 무슨 일이 벌어지나요? 빨리 다음 화 주세요!')
      questions.push('얘(주인공) 결국 어떻게 되나요? 떡밥 회수되죠?')
      return {
        headline: m.tension >= 62 ? '다음 화 내놔요!! 정주행각 🔥' : '괜찮은데… 한 방이 아쉬워요.',
        reactions, questions, praise, gripes,
      }
    },
  },
  {
    key: 'general',
    name: '일반 독자',
    icon: '🙂',
    blurb: '재미와 이해가 기준. 헷갈리면 덮는다. 공감·몰입·읽힘을 본다.',
    weights: { clarity: 1.3, pacing: 1.2, immersion: 1.1, hookScore: 1.0, tension: 0.9 },
    react: (m) => {
      const reactions: string[] = []
      const questions: string[] = []
      const praise: string[] = []
      const gripes: string[] = []
      if (m.clarity >= 68) { praise.push('술술 읽혔어요. 안 막히고 끝까지 갔어요.') }
      else { gripes.push('중간에 살짝 헷갈렸어요. 한 번 더 읽어야 했어요.'); reactions.push('문장이 길어서 따라가다 놓친 데가 있어요.') }
      if (m.pacing >= 65) reactions.push('지루하지 않고 적당히 빠르게 넘어가서 좋았어요.')
      else if (m.avgSentLen > 22) gripes.push('문장이 길어서 조금 늘어지는 느낌이었어요.')
      if (m.immersion >= 62) praise.push('장면이 그려져서 몰입됐어요.')
      if (m.emotionHits >= 3) reactions.push('인물 마음에 공감이 갔어요.')
      else reactions.push('인물이 무슨 마음인지 조금 더 알고 싶었어요.')
      if (m.repeatedTop && m.repeatedTop.n >= 6) reactions.push(`"${m.repeatedTop.word}"이라는 말이 자주 나와서 살짝 눈에 띄었어요.`)
      questions.push('이 사람(주인공)이 지금 어떤 기분인지 한 줄이면 더 와닿을 것 같아요.')
      questions.push('여기가 어디인지, 언제인지 살짝만 더 알려주면 좋겠어요.')
      return {
        headline: m.clarity >= 68 && m.pacing >= 60 ? '편하게 잘 읽혔어요. 다음도 읽을래요.' : '재밌는데 조금 친절했으면 좋겠어요.',
        reactions, questions, praise, gripes,
      }
    },
  },
  {
    key: 'editor',
    name: '편집자',
    icon: '✒️',
    blurb: '상품성과 완성도를 본다. 가독성·일관성·시장성·고칠 우선순위를 짚는다.',
    weights: { clarity: 1.3, pacing: 1.1, hookScore: 1.2, showing: 1.0, voice: 1.0, tension: 1.0 },
    react: (m) => {
      const reactions: string[] = []
      const questions: string[] = []
      const praise: string[] = []
      const gripes: string[] = []
      reactions.push(`분량 ${m.chars.toLocaleString()}자 · 문장 ${m.sentences}개 · 평균 ${m.avgSentLen.toFixed(1)}어절. 대사 비중 ${Math.round(m.dialogueRatio * 100)}%.`)
      if (m.hookScore < 55) gripes.push('도입 1~2문장의 흡인력이 약합니다. 첫 페이지 이탈을 막을 훅을 보강하세요. (우선순위 ↑)')
      else praise.push('도입의 흡인력이 괜찮습니다. 첫 페이지 합격선.')
      if (m.longSentRatio > 0.3) gripes.push('만연체 비율이 높습니다. 교열 단계에서 문장 분할이 필요합니다.')
      if (m.adverbDensity > 14 || m.fillerHits > m.sentences) gripes.push('수식어·군더더기 다이어트로 분량 대비 밀도를 끌어올릴 수 있습니다.')
      if (m.tellHits > 2) gripes.push(`감정 직접서술 ${m.tellHits}곳 — "보여주기"로 전환하면 단가가 올라갑니다.`)
      if (m.dialogueRatio > 0.6) reactions.push('대사 비중이 큽니다. 웹소설형 호흡엔 유리하나 지문 균형을 점검하세요.')
      else if (m.dialogueRatio < 0.12) reactions.push('대사가 적어 정적입니다. 한두 마디로 장면에 인물 체온을 넣어보세요.')
      questions.push('이 장면의 목표 독자층(연령·플랫폼)은 어디입니까? 톤이 거기에 맞습니까?')
      questions.push('장 끝에 다음 화를 부르는 후크(클리프행어)가 있습니까?')
      const fixes = gripes.length
      return {
        headline: fixes <= 1 ? '상품성 양호. 디테일 교열 후 출고 가능.' : `손볼 곳 ${fixes}건. 우선순위대로 고치면 경쟁력이 붙습니다.`,
        reactions, questions, praise, gripes,
      }
    },
  },
  {
    key: 'novice',
    name: '초보 독자',
    icon: '🐣',
    blurb: '어려운 문장·낯선 단어·복잡한 구성에 약하다. 쉽고 친절한 글을 좋아한다.',
    weights: { clarity: 1.6, pacing: 1.1, hookScore: 0.9, immersion: 0.8 },
    react: (m) => {
      const reactions: string[] = []
      const questions: string[] = []
      const praise: string[] = []
      const gripes: string[] = []
      if (m.avgSentLen > 20 || m.longSentRatio > 0.2) { gripes.push('문장이 길어서 읽다가 앞을 까먹었어요.'); reactions.push('한 문장이 너무 길면 무슨 말인지 놓쳐요 ㅠ') }
      else { praise.push('문장이 짧아서 읽기 편했어요.') }
      if (m.clarity >= 70) praise.push('어렵지 않고 쉽게 이해됐어요.')
      else reactions.push('조금 어려운 말이 있어서 천천히 읽었어요.')
      if (m.dialogueRatio >= 0.25) reactions.push('대화가 있어서 안 지루했어요.')
      if (m.immersion >= 60) reactions.push('장면이 머릿속에 그려져서 좋았어요.')
      if (m.paragraphs <= 1 && m.sentences > 6) gripes.push('문단이 안 나뉘어 있어서 글이 빽빽하게 느껴졌어요.')
      questions.push('지금 누가 말하는 건지 가끔 헷갈렸어요. 알려주면 좋겠어요.')
      questions.push('이게 무슨 상황인지 처음에 한 줄로 정리해주면 안심돼요.')
      return {
        headline: m.clarity >= 70 ? '쉽고 재밌었어요!' : '조금 어려웠지만 끝까지 읽었어요.',
        reactions, questions, praise, gripes,
      }
    },
  },
]

function buildReaction(p: PersonaDef, m: Metrics): Reaction {
  const score = weightedScore(m, p.weights)
  const parts = p.react(m, score)
  // 빈 영역 채우기(항상 최소 한 줄은 보이도록)
  const reactions = parts.reactions.length ? parts.reactions : ['특별히 걸리는 점도, 사로잡는 점도 없는 무난한 장면이었어요.']
  const questions = parts.questions.length ? parts.questions : ['이 장면에서 가장 보여주고 싶은 한 가지는 무엇인가요?']
  return {
    rating: ratingOf(score),
    mood: moodOf(score),
    headline: parts.headline,
    reactions,
    questions,
    praise: parts.praise,
    gripes: parts.gripes,
  }
}

const MOOD_META: Record<Mood, { label: string; color: string; emoji: string }> = {
  love: { label: '강력 추천', color: '#0f9d58', emoji: '💚' },
  like: { label: '호감', color: '#4a76d4', emoji: '👍' },
  mixed: { label: '반반', color: '#d4a14a', emoji: '🤔' },
  meh: { label: '아쉬움', color: '#db4437', emoji: '😕' },
}

function stars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))
}

// ───────────────────────── 저장 모델 ─────────────────────────
interface Saved {
  id: string
  title: string
  text: string
  active: string[]   // 보이게 한 페르소나 키
  created: number
}
interface State { sessions: Saved[]; current: string }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const ALL_KEYS = PERSONAS.map((p) => p.key)

function loadState(): State {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p?.sessions)) {
        const sessions: Saved[] = p.sessions.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
          id: String(x.id || newId()),
          title: String(x.title || '제목 없는 장면'),
          text: String(x.text || ''),
          active: Array.isArray(x.active) ? (x.active as unknown[]).map(String).filter((k) => ALL_KEYS.includes(k)) : ALL_KEYS.slice(),
          created: Number(x.created) || Date.now(),
        }))
        const current = typeof p.current === 'string' && sessions.some((s) => s.id === p.current) ? p.current : (sessions[0]?.id || '')
        return { sessions, current }
      }
    }
  } catch { /* noop */ }
  return { sessions: [], current: '' }
}

const SAMPLE = `밤이 깊도록 등불은 꺼지지 않았다.
"정말 갈 거야?" 그녀가 물었다. 목소리 끝이 떨렸다.
나는 대답 대신 가방을 멨다. 어깨가 무거웠다. 문고리에 손을 얹는 순간, 등 뒤에서 무언가 깨지는 소리가 났다.
돌아보니 찻잔이 바닥에 흩어져 있었다. 식은 차가 마룻바닥을 검게 적셨다. 그녀는 손끝을 떨며 나를 노려보았다.
"가지 마." 이번엔 부탁이 아니었다. 명령도, 협박도 아닌, 그저 무너지는 사람의 마지막 소리였다.`

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function BetaReaderSim({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [sessions, setSessions] = useState<Saved[]>(init.current.sessions)
  const [current, setCurrent] = useState<string>(init.current.current)
  const [draftText, setDraftText] = useState<string>('')   // 아직 세션이 없을 때의 입력 버퍼
  const [draftTitle, setDraftTitle] = useState<string>('')
  const [active, setActive] = useState<string[]>(ALL_KEYS.slice())
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // payload 로 외부에서 텍스트가 들어오면 입력에 채운다(예: 다른 도구 → 이 도구 열기).
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.text === 'string' ? payload.text : typeof payload.body === 'string' ? payload.body : ''
    const title = typeof payload.title === 'string' ? payload.title : ''
    if (t) { setDraftText(t); if (title) setDraftTitle(title) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
      try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* noop */ }
    }
  }, [])

  // 영속
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ sessions, current })) }
    catch { flash('저장 공간이 가득 찼어요. 오래된 장면을 지워주세요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, current])

  const flash = useCallback((msg: string) => {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 2400)
  }, [])

  const cur = useMemo(() => sessions.find((s) => s.id === current) || null, [sessions, current])

  // 현재 분석 대상 텍스트 — 저장된 세션이 있으면 그 텍스트, 없으면 드래프트
  const text = cur ? cur.text : draftText
  const title = cur ? cur.title : draftTitle
  const activeKeys = cur ? cur.active : active

  const metrics = useMemo(() => analyze(text), [text])

  // 페르소나 반응 계산(결정적·메모이즈)
  const reactions = useMemo(() => {
    if (metrics.empty) return []
    return PERSONAS.filter((p) => activeKeys.includes(p.key)).map((p) => ({ persona: p, r: buildReaction(p, metrics) }))
  }, [metrics, activeKeys])

  const overall = useMemo(() => {
    if (!reactions.length) return 0
    return reactions.reduce((a, x) => a + x.r.rating, 0) / reactions.length
  }, [reactions])

  // ── 입력 갱신 ──
  const setText = (v: string) => {
    if (cur) setSessions((prev) => prev.map((s) => (s.id === cur.id ? { ...s, text: v } : s)))
    else setDraftText(v)
  }
  const setTitle = (v: string) => {
    if (cur) setSessions((prev) => prev.map((s) => (s.id === cur.id ? { ...s, title: v } : s)))
    else setDraftTitle(v)
  }
  const togglePersona = (key: string) => {
    const next = activeKeys.includes(key) ? activeKeys.filter((k) => k !== key) : [...activeKeys, key]
    const safe = next.length ? next : [key]
    if (cur) setSessions((prev) => prev.map((s) => (s.id === cur.id ? { ...s, active: safe } : s)))
    else setActive(safe)
  }

  // ── 세션 CRUD ──
  const saveCurrentAsSession = () => {
    if (!draftText.trim()) { flash('먼저 장면 글을 입력하세요.'); return }
    const s: Saved = {
      id: newId(),
      title: draftTitle.trim() || autoTitle(draftText),
      text: draftText,
      active: active.slice(),
      created: Date.now(),
    }
    setSessions((prev) => [s, ...prev])
    setCurrent(s.id)
    setDraftText(''); setDraftTitle('')
    flash('장면을 저장했어요.')
  }
  const newSession = () => {
    stopSpeak()
    setCurrent('')
    setDraftText(''); setDraftTitle('')
    setActive(ALL_KEYS.slice())
    setTimeout(() => taRef.current?.focus(), 0)
  }
  const openSession = (id: string) => { stopSpeak(); setCurrent(id); setConfirmDel(null) }
  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (current === id) setCurrent('')
    setConfirmDel(null)
    flash('장면을 삭제했어요.')
  }
  const loadSample = () => { newSession(); setDraftText(SAMPLE); setDraftTitle('예시 장면 — 떠나는 밤') }

  // ── 클립보드 ──
  const copy = (txt: string, label = '복사했어요') => {
    const done = () => flash(label)
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done))
      else fallbackCopy(txt, done)
    } catch { fallbackCopy(txt, done) }
  }
  const fallbackCopy = (txt: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사에 실패했어요.') }
  }

  // ── 낭독(speechSynthesis) ──
  const stopSpeak = () => {
    try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* noop */ }
    if (mounted.current) setSpeakingKey(null)
  }
  const speak = (key: string, lines: string[]) => {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') { flash('이 브라우저는 낭독을 지원하지 않아요.'); return }
    if (speakingKey === key) { stopSpeak(); return }
    stopSpeak()
    try {
      const u = new SpeechSynthesisUtterance(lines.join('. '))
      u.lang = 'ko-KR'; u.rate = 1
      u.onend = () => { if (mounted.current) setSpeakingKey(null) }
      u.onerror = () => { if (mounted.current) setSpeakingKey(null) }
      speechSynthesis.speak(u)
      setSpeakingKey(key)
    } catch { flash('낭독을 시작하지 못했어요.') }
  }

  // ── 드래그앤드롭(바인더 파일) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    const body = (item.text || '').trim()
    if (!body) { flash('이 파일에는 분석할 본문이 없어요.'); return }
    if (cur) {
      // 새 세션으로 받기(현재 세션 덮어쓰지 않음)
      const s: Saved = { id: newId(), title: item.title || autoTitle(body), text: body, active: ALL_KEYS.slice(), created: Date.now() }
      setSessions((prev) => [s, ...prev]); setCurrent(s.id)
    } else {
      setDraftText(body); setDraftTitle(item.title || '')
    }
    flash(`〈${item.title || '바인더 파일'}〉을(를) 불러왔어요.`)
  }

  // ── 연계: 스니펫/수집함/프로젝트 ──
  const reactionToText = (persona: PersonaDef, r: Reaction): string => {
    const L: string[] = []
    L.push(`[${persona.name}] ${stars(r.rating)} (${r.rating.toFixed(1)}/5)`)
    L.push(`총평: ${r.headline}`)
    if (r.reactions.length) { L.push('읽으며 든 생각:'); r.reactions.forEach((x) => L.push(`  · ${x}`)) }
    if (r.praise.length) { L.push('좋았던 점:'); r.praise.forEach((x) => L.push(`  + ${x}`)) }
    if (r.gripes.length) { L.push('걸린 점:'); r.gripes.forEach((x) => L.push(`  - ${x}`)) }
    if (r.questions.length) { L.push('작가에게 묻고 싶은 것:'); r.questions.forEach((x) => L.push(`  ? ${x}`)) }
    return L.join('\n')
  }
  const fullReport = (): string => {
    const L: string[] = []
    L.push(`# 가상 독자 반응 — ${title || '제목 없는 장면'}`)
    L.push(`평균 평점: ${overall.toFixed(1)}/5 (${reactions.length}명)`)
    L.push('')
    L.push('— 글 지표 —')
    L.push(metricsLine(metrics))
    L.push('')
    reactions.forEach(({ persona, r }) => { L.push(reactionToText(persona, r)); L.push('') })
    return L.join('\n')
  }
  const saveReactionSnippet = (persona: PersonaDef, r: Reaction) => {
    addToLibrary('snippets', {
      text: reactionToText(persona, r),
      source: `가상 독자 반응 · ${persona.name}`,
      tags: ['베타리딩', persona.name, MOOD_META[r.mood].label],
    })
    flash('스니펫 라이브러리에 저장했어요.')
  }
  const stashReaction = (persona: PersonaDef, r: Reaction) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'note', label: `${persona.icon} ${persona.name} 반응`, text: reactionToText(persona, r) })
    flash('수집함에 담았어요.')
  }
  const reportToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const body: string[] = []
    body.push(`<p><b>평균 평점:</b> ${overall.toFixed(1)} / 5 · ${reactions.length}명의 가상 독자</p>`)
    body.push(`<p style="color:#888;font-size:12px">${esc(metricsLine(metrics))}</p>`)
    body.push('<hr/>')
    reactions.forEach(({ persona, r }) => {
      body.push(`<p><b>${esc(persona.icon + ' ' + persona.name)}</b> — ${esc(stars(r.rating))} (${r.rating.toFixed(1)}/5)<br/><i>${esc(r.headline)}</i></p>`)
      const sec = (label: string, arr: string[], sym: string) => {
        if (!arr.length) return ''
        return `<p style="margin:2px 0"><b>${esc(label)}</b></p><ul>${arr.map((x) => `<li>${esc(sym + ' ' + x)}</li>`).join('')}</ul>`
      }
      body.push(sec('읽으며 든 생각', r.reactions, '·'))
      body.push(sec('좋았던 점', r.praise, '+'))
      body.push(sec('걸린 점', r.gripes, '-'))
      body.push(sec('작가에게 묻고 싶은 것', r.questions, '?'))
      body.push('<hr/>')
    })
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '베타리딩',
      title: `가상 독자 반응 — ${(title || '장면').slice(0, 40)}`,
      bodyHtml: body.join(''),
      synopsis: `평균 ${overall.toFixed(1)}/5 · ${reactions.length}명 가상 반응`,
      meta: { 평균평점: overall.toFixed(1), 독자수: String(reactions.length) },
    })
    flash(id ? '프로젝트 자료 〈베타리딩〉에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const bodyRow: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const side: React.CSSProperties = { width: 178, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const sideList: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 7, display: 'flex', flexDirection: 'column', gap: 5 }
  const mainCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const editPane: React.CSSProperties = { padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }
  const resultPane: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, background: 'var(--bg)' }
  const ta: React.CSSProperties = {
    width: '100%', minHeight: 116, maxHeight: 220, resize: 'vertical', padding: '9px 11px', fontSize: 13.5, lineHeight: 1.6,
    borderRadius: 9, border: '1px solid ' + (dragOver ? 'var(--accent)' : 'var(--border)'),
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 120, padding: '6px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="👓"/></span>
        <strong style={{ fontSize: 15 }}>가상 독자 반응 시뮬</strong>
        {!metrics.empty && reactions.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            평균 <b style={{ color: 'var(--accent)' }}>{overall.toFixed(1)}</b>/5 · {reactions.length}명
          </span>
        )}
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
        <button className="minibtn" onClick={loadSample} title="예시 장면을 채워 바로 체험">예시</button>
        <button className="btn-primary" onClick={newSession}>＋ 새 장면</button>
      </div>

      <div style={bodyRow}>
        {/* 사이드바: 저장한 장면 목록 */}
        <div style={side}>
          <div style={{ padding: '8px 9px 4px', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>저장한 장면 ({sessions.length})</div>
          <div style={sideList}>
            {sessions.length === 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, padding: '6px 4px' }}>
                아직 저장한 장면이 없어요.<br />글을 입력하고 <b>저장</b>을 누르면 여기에 쌓여요.
              </div>
            )}
            {sessions.map((s) => {
              const sel = s.id === current
              return (
                <div key={s.id}
                  onClick={() => openSession(s.id)}
                  style={{
                    border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'),
                    background: sel ? 'var(--paper)' : 'var(--panel)',
                    borderRadius: 8, padding: '7px 8px', cursor: 'pointer', userSelect: 'none',
                  }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{s.text.replace(/\s/g, '').length.toLocaleString()}자</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" style={{ padding: '1px 6px', fontSize: 10.5, color: 'var(--warn)' }}
                      onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id) }} title="삭제"><Emoji e="🗑️"/></button>
                  </div>
                  {confirmDel === s.id && (
                    <div style={{ marginTop: 5, padding: 5, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--warn)' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--warn)', marginBottom: 4 }}>삭제할까요?</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-primary" style={{ padding: '2px 7px', fontSize: 10.5, background: 'var(--warn)', borderColor: 'var(--warn)' }}
                          onClick={(e) => { e.stopPropagation(); removeSession(s.id) }}>삭제</button>
                        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 10.5 }}
                          onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 메인 */}
        <div style={mainCol}>
          {/* 입력부 */}
          <div style={editPane}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="장면 제목(선택)" maxLength={60} />
              {!cur
                ? <button className="minibtn" onClick={saveCurrentAsSession} disabled={!draftText.trim()} title="이 장면을 목록에 저장"><Emoji e="💾"/> 저장</button>
                : <span style={{ fontSize: 11, color: 'var(--ok)' }}>● 자동 저장 중</span>}
            </div>
            <textarea
              ref={taRef}
              style={ta}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 장면(글)을 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.&#10;다섯 가상 독자가 읽고 반응·궁금증·평점을 들려줍니다."
              onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            />
            {/* 지표 요약 + 페르소나 토글 */}
            {!metrics.empty && (
              <>
                <MetricBar m={metrics} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>독자 패널:</span>
                  {PERSONAS.map((p) => {
                    const on = activeKeys.includes(p.key)
                    return (
                      <button key={p.key} onClick={() => togglePersona(p.key)}
                        title={p.blurb}
                        style={{
                          padding: '4px 9px', fontSize: 11.5, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                          border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                          background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--muted)',
                        }}><Emoji e={p.icon}/> {p.name}</button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 결과부 */}
          <div style={resultPane}>
            {metrics.empty ? (
              <EmptyHint onSample={loadSample} />
            ) : reactions.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>
                위에서 독자 패널을 한 명 이상 선택하세요.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13 }}><Emoji e="📣"/> 독자 반응 ({reactions.length}명)</strong>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => copy(fullReport(), '전체 리포트 복사')}><Emoji e="📋"/> 전체 복사</button>
                  <button className="linkbtn" onClick={reportToProject} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '종합 리포트를 프로젝트 자료 〈베타리딩〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {reactions.map(({ persona, r }) => (
                    <ReactionCard
                      key={persona.key}
                      persona={persona}
                      r={r}
                      speaking={speakingKey === persona.key}
                      onSpeak={() => speak(persona.key, [r.headline, ...r.reactions])}
                      onCopy={() => copy(reactionToText(persona, r), `${persona.name} 반응 복사`)}
                      onSnippet={() => saveReactionSnippet(persona, r)}
                      onStash={() => stashReaction(persona, r)}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
                  ※ 외부 AI 없이, 글 자체의 지표(대화 비율·감각어·문장 길이·훅·반복어 등)를 각 독자가 다르게 가중해 만든 모의 반응입니다.
                  실제 독자를 대신하진 못하지만, 다섯 관점으로 내 장면을 점검하는 거울로 쓰세요.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 보조 컴포넌트 ─────────────────────────
function autoTitle(text: string): string {
  const first = text.trim().split(/\n/)[0].replace(/[“"「『]/g, '').trim()
  return (first.slice(0, 24) || '제목 없는 장면') + (first.length > 24 ? '…' : '')
}
function metricsLine(m: Metrics): string {
  return `${m.chars.toLocaleString()}자 · 문장 ${m.sentences}개(평균 ${m.avgSentLen.toFixed(1)}어절) · 대사 ${Math.round(m.dialogueRatio * 100)}% · 감각어 ${m.sensoryHits}개 · 부사 ${m.adverbHits}개 · 직접서술 ${m.tellHits}곳`
}

function MetricBar({ m }: { m: Metrics }) {
  const items: { label: string; v: number }[] = [
    { label: '훅', v: m.hookScore },
    { label: '명료', v: m.clarity },
    { label: '몰입', v: m.immersion },
    { label: '긴장', v: m.tension },
    { label: '목소리', v: m.voice },
    { label: '페이싱', v: m.pacing },
    { label: '보여주기', v: m.showing },
  ]
  const col = (v: number) => (v >= 70 ? 'var(--ok)' : v >= 50 ? 'var(--accent)' : 'var(--warn)')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '7px 9px', borderRadius: 8, background: 'var(--panel)', border: '1px solid var(--border)' }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 64, flex: 1 }} title={`${it.label}: ${Math.round(it.v)}/100`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
            <span>{it.label}</span><span style={{ fontWeight: 700, color: col(it.v) }}>{Math.round(it.v)}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: it.v + '%', height: '100%', background: col(it.v) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReactionCard(props: {
  persona: PersonaDef
  r: Reaction
  speaking: boolean
  onSpeak: () => void
  onCopy: () => void
  onSnippet: () => void
  onStash: () => void
}) {
  const { persona, r, speaking, onSpeak, onCopy, onSnippet, onStash } = props
  const mm = MOOD_META[r.mood]
  const [open, setOpen] = useState<'all' | 'short'>('all')
  const card: React.CSSProperties = {
    border: '1px solid var(--border)', borderLeft: `4px solid ${mm.color}`, borderRadius: 10,
    background: 'var(--paper)', padding: 11, display: 'flex', flexDirection: 'column', gap: 7,
  }
  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginTop: 2 }
  const li: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, wordBreak: 'keep-all' }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 20 }}><Emoji e={persona.icon}/></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{persona.name}</div>
          <div style={{ fontSize: 13, color: mm.color, letterSpacing: 1 }} title={`${r.rating.toFixed(1)}/5`}>{stars(r.rating)}</div>
        </div>
        <span style={{ fontSize: 10.5, color: '#fff', background: mm.color, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}><Emoji e={mm.emoji}/> {mm.label}</span>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.5, color: 'var(--text)', wordBreak: 'keep-all' }}>“{emojify(r.headline)}”</div>

      {open === 'all' && (
        <>
          {r.reactions.length > 0 && <>
            <div style={sectionTitle}><Emoji e="💭"/> 읽으며 든 생각</div>
            <ul style={{ margin: 0, paddingLeft: 17 }}>{r.reactions.map((x, i) => <li key={i} style={li}>{emojify(x)}</li>)}</ul>
          </>}
          {r.praise.length > 0 && <>
            <div style={{ ...sectionTitle, color: 'var(--ok)' }}><Emoji e="👍"/> 좋았던 점</div>
            <ul style={{ margin: 0, paddingLeft: 17 }}>{r.praise.map((x, i) => <li key={i} style={li}>{emojify(x)}</li>)}</ul>
          </>}
          {r.gripes.length > 0 && <>
            <div style={{ ...sectionTitle, color: 'var(--warn)' }}><Emoji e="👎"/> 걸린 점</div>
            <ul style={{ margin: 0, paddingLeft: 17 }}>{r.gripes.map((x, i) => <li key={i} style={li}>{emojify(x)}</li>)}</ul>
          </>}
          {r.questions.length > 0 && <>
            <div style={{ ...sectionTitle, color: 'var(--accent)' }}><Emoji e="❓"/> 작가에게 묻고 싶은 것</div>
            <ul style={{ margin: 0, paddingLeft: 17 }}>{r.questions.map((x, i) => <li key={i} style={li}>{emojify(x)}</li>)}</ul>
          </>}
        </>
      )}

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 10.5 }} onClick={() => setOpen(open === 'all' ? 'short' : 'all')}>
          {open === 'all' ? '접기' : '펼치기'}
        </button>
        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 10.5 }} onClick={onSpeak} title="이 반응을 음성으로 듣기">
          {speaking ? <><Emoji e="⏹"/> 멈춤</> : <><Emoji e="🔊"/> 듣기</>}
        </button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 10.5 }} onClick={onCopy}><Emoji e="📋"/></button>
        <button className="linkbtn" style={{ padding: '2px 7px', fontSize: 10.5 }} onClick={onSnippet} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
        <button className="linkbtn" style={{ padding: '2px 7px', fontSize: 10.5 }} onClick={onStash} title="수집함에 담기"><Emoji e="📥"/></button>
      </div>
    </div>
  )
}

function EmptyHint({ onSample }: { onSample: () => void }) {
  const box: React.CSSProperties = { maxWidth: 520, margin: '8px auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper)', padding: 12 }
  return (
    <div style={box}>
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '14px 8px' }}>
        위 칸에 <b>장면(글)</b>을 붙여넣으면<br />다섯 가상 독자가 읽고 <b>반응·궁금증·평점</b>을 들려줍니다.<br />
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={onSample}>예시 장면으로 체험하기</button>
      </div>
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}><Emoji e="👥"/> 가상 독자 패널</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {PERSONAS.map((p) => (
            <div key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}><Emoji e={p.icon}/></span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'keep-all' }}>{p.blurb}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
