// 첫 페이지 점검(Opening Page Audit) — 소설/이야기의 도입부(첫 1~5쪽) 텍스트를 붙여넣으면
//   에이전트·편집자가 첫 페이지에서 실제로 보는 항목을 자동 신호 + 수동 체크로 진단한다.
//   자동 휴리스틱: 첫 문장 길이, 대화 등장 시점(몇 문장째/몇 글자째), 설명(지문) 대 장면 비율,
//   "정보 투하(info-dump)" 밀도, 날씨·꿈·거울·기상 등 진부한 도입 클리셰, 시점/인칭 추정, 백스토리 신호,
//   질문/긴장 유발 어휘(갈등 암시), 추상·관념어 과다, 부사·필러 남발, 고유명사 폭주 등.
//   각 항목을 점수화(0~100)하고 약점 순으로 개선 팁을 제시. 수동 체크리스트는 자동으로 추정 채워둠.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(네트워크·라이브러리·키 불필요).
//   영속: 본문/수동체크/오버라이드는 localStorage 'sry:tool:opening-page-audit' 에 자동 저장/복원.
//   언마운트 시 타이머 정리. 연계: 좌측 바인더 파일 드래그앤드롭(본문 불러오기), 리포트를 프로젝트/수집함으로.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
} from './linkbus'

export const meta = { id: 'opening-page-audit', name: '첫 페이지 점검', icon: '🔍', group: '교정·언어', intro: '도입부를 붙여넣으면 훅·시점·정보투하·갈등 암시·클리셰를 에이전트 관점 신호+체크리스트로 진단하고 점수·개선 팁을 줍니다', w: 760, h: 760 }

const LS = 'sry:tool:opening-page-audit'

// ── 따옴표(대사) 쌍 ──────────────────────────────────────────
interface QuotePair { open: string; close: string }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”' }, { open: '‘', close: '’' },
  { open: '「', close: '」' }, { open: '『', close: '』' },
  { open: '"', close: '"' }, { open: "'", close: "'" },
]

const visibleLen = (s: string): number => s.replace(/\s/g, '').length

// 문장 분리(종결부호 + 개행). 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)["'”’」』]?\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 대화/지문 분해: 따옴표로 묶인 구간을 대사로, 나머지를 지문으로. 첫 대사 위치(문자 인덱스)도 반환.
function splitDialogue(text: string): { dialogueChars: number; narrationChars: number; dialogueCount: number; firstDialogueAt: number } {
  const chars = [...text]
  let i = 0
  let narration = ''
  let dialogueChars = 0
  let dialogueCount = 0
  let firstDialogueAt = -1
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)

  while (i < chars.length) {
    const ch = chars[i]
    const pair = PAIRS.find((p) => p.open === ch)
    if (pair) {
      if (ch === "'" && isAlnum(chars[i - 1])) { narration += ch; i++; continue }
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
        if (cj === pair.close) { closed = true; break }
        if (cj === '\n' && chars[j + 1] === '\n') break
        inner += cj; j++
      }
      if (closed) {
        const t = inner.trim()
        if (t.length > 0) {
          dialogueChars += visibleLen(t); dialogueCount++
          if (firstDialogueAt < 0) firstDialogueAt = i
        }
        i = j + 1
      } else { narration += ch; i++ }
    } else { narration += ch; i++ }
  }
  return { dialogueChars, narrationChars: visibleLen(narration), dialogueCount, firstDialogueAt }
}

// ── 어휘 사전(전부 직접 작성 — 저작권 안전) ─────────────────
// 도입부 진부한 클리셰(에이전트가 가장 자주 지적). 부분일치(소문자) 검사.
const CLICHE_PATTERNS: { id: string; label: string; tip: string; res: RegExp[] }[] = [
  { id: 'wake', label: '기상으로 시작', tip: '알람·잠에서 깨는 장면은 가장 흔한 도입입니다. 이미 움직이는 순간으로 시작해 보세요.',
    res: [/잠에서\s*깨/, /눈을\s*떴다/, /눈을\s*떴/, /알람(이|\s|소리)/, /아침에\s*일어/, /woke\s+up/i, /opened\s+(his|her|my|their)\s+eyes/i] },
  { id: 'dream', label: '꿈/꿈에서 깨기', tip: '꿈으로 연 뒤 "사실 꿈이었다"는 독자를 배신합니다. 진짜 사건으로 시작하세요.',
    res: [/꿈(이었|에서\s*깼|을\s*꾸)/, /it\s+was\s+(all\s+)?a\s+dream/i] },
  { id: 'weather', label: '날씨/풍경 묘사로 시작', tip: '날씨·하늘 묘사 도입은 인물·갈등 진입을 늦춥니다. 인물을 먼저 무대에 올리세요.',
    res: [/^.{0,40}(하늘|날씨|구름|바람이\s*불|비가\s*내|햇살|폭풍|먹구름)/, /it\s+was\s+a\s+dark\s+and\s+stormy/i] },
  { id: 'mirror', label: '거울로 외모 설명', tip: '거울에 비친 자기 묘사는 외모 정보투하의 전형입니다. 행동 속에 흘리세요.',
    res: [/거울(에|\s*속|을\s*보)/, /reflection\s+in\s+the\s+mirror/i, /looked\s+in\s+the\s+mirror/i] },
  { id: 'born', label: '출생/연혁부터 시작', tip: '태어남·가계부터 시작하면 현재 사건에 닿기까지 멉니다. 사건 한가운데로 들어가세요.',
    res: [/태어났(다|을)/, /태어난\s*날/, /was\s+born\s+(in|on)/i] },
  { id: 'normalday', label: '"여느 때처럼/평범한 하루"', tip: '평범함 선언은 긴장을 죽입니다. 균열을 먼저 보여주세요.',
    res: [/여느\s*때(와\s*같|처럼)/, /평범한\s*(하루|아침|날)/, /늘\s*그렇듯/, /just\s+another\s+(day|ordinary)/i] },
]

// 백스토리/회상·설명 신호(과도하면 정보투하). 부분일치.
const BACKSTORY_WORDS = ['예전에', '오래전', '그때만 해도', '어린 시절', '몇 년 전', '몇 해 전', '돌이켜보면', '회상', '~던 시절', '과거에', '한때', '~기 전까지', '태어나서', '자라온', '~해 왔다', '~곤 했다', '~던 것이다']
// 추상·관념어(장면이 아니라 요약·논평일 때 늘어남)
const ABSTRACT_WORDS = ['운명', '인생', '진실', '존재', '의미', '본질', '영혼', '세상', '인간', '사회', '현실', '시간', '기억', '감정', '관계', '사랑이란', '삶이란', '죽음이란', '진리', '자유', '정의', '가치', '신념']
// 갈등/긴장·욕망 암시어(있으면 좋음 — 첫 페이지에 "뭔가 걸린 게 있다")
const TENSION_WORDS = ['하지만', '그러나', '문제는', '안 된다', '안 됐다', '늦었다', '사라졌', '죽었', '죽음', '위험', '비밀', '거짓', '두려', '무서', '도망', '쫓', '경고', '마지막', '더는', '이대로는', '망설', '결심', '반드시', '절대', '필요했다', '원했다', '바랐다', '걸려 있었다', '걸린', '잃']
// 필러/머뭇거림(도입을 흐릿하게)
const FILLER_WORDS = ['아마도', '어쩌면', '왠지', '약간', '조금', '뭔가', '그냥', '사실', '정말', '매우', '너무', '되게', '꽤', '거의', '대충', '대체로', '말하자면', '이를테면']

const lc = (s: string) => s.toLowerCase()
function countMatches(text: string, words: string[]): { total: number; hits: string[] } {
  const low = lc(text)
  let total = 0
  const hits: string[] = []
  for (const w of words) {
    const needle = lc(w.replace(/~/g, ''))
    if (!needle) continue
    let from = 0; let c = 0
    while (true) {
      const idx = low.indexOf(needle, from)
      if (idx < 0) break
      c++; from = idx + needle.length
    }
    if (c > 0) { total += c; hits.push(w + (c > 1 ? `×${c}` : '')) }
  }
  return { total, hits }
}
function countRegex(text: string, res: RegExp[]): boolean {
  const low = lc(text)
  return res.some((re) => re.test(low) || re.test(text))
}

// 인칭/시점 추정: 1인칭 대명사 vs 3인칭 대명사 빈도.
function detectPOV(text: string): { label: string; first: number; third: number; second: number } {
  const first = (text.match(/(^|[^가-힣A-Za-z])(나는|내가|나의|나를|내|우리|우린|내게|나에게)([^가-힣A-Za-z]|$)/g) || []).length
    + (text.match(/\bI\b|\bme\b|\bmy\b|\bwe\b/g) || []).length
  const third = (text.match(/(그는|그녀는|그가|그녀가|그들은|그의|그녀의|그를|그녀를)/g) || []).length
    + (text.match(/\bhe\b|\bshe\b|\bthey\b|\bhim\b|\bher\b/gi) || []).length
  const second = (text.match(/(당신은|당신이|너는|네가)/g) || []).length + (text.match(/\byou\b/gi) || []).length
  let label = '판단 보류(대명사 적음)'
  const max = Math.max(first, third, second)
  if (max >= 2) {
    if (max === first) label = '1인칭 시점 추정'
    else if (max === third) label = '3인칭 시점 추정'
    else label = '2인칭 시점 추정'
  }
  return { label, first, third, second }
}

// 고유명사 추정: 한글 2~4자 + 조사 패턴 또는 영문 대문자 시작 단어의 종류 수(첫 페이지 과다 시 혼란).
function estimateProperNouns(text: string): number {
  const set = new Set<string>()
  const ko = text.match(/[가-힣]{2,4}(?=(은|는|이|가|을|를|에게|와|과|의|도|만|께|랑|이라|라고|이가))/g) || []
  ko.forEach((w) => set.add(w))
  const en = text.match(/\b[A-Z][a-z]{2,}\b/g) || []
  en.forEach((w) => set.add(w))
  return set.size
}

// ── 점검 항목 정의 ───────────────────────────────────────────
type Verdict = 'good' | 'ok' | 'warn'
interface CheckResult {
  id: string
  label: string
  icon: string
  verdict: Verdict
  score: number          // 0~100 (항목 점수)
  weight: number         // 종합 가중치
  signal: string         // 자동 신호(수치 근거)
  tip: string            // 개선 팁
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

interface Metrics {
  chars: number
  sentences: string[]
  firstSentLen: number
  dialogue: ReturnType<typeof splitDialogue>
  firstDialogueSentence: number   // 첫 대사가 몇 번째 문장에서 등장하나(없으면 -1)
  dialoguePct: number
  cliches: { id: string; label: string; tip: string }[]
  backstory: ReturnType<typeof countMatches>
  abstract: ReturnType<typeof countMatches>
  tension: ReturnType<typeof countMatches>
  filler: ReturnType<typeof countMatches>
  pov: ReturnType<typeof detectPOV>
  properNouns: number
  paraCount: number
  longParaRatio: number           // 긴 지문 문단(120자+) 비율
}

function analyze(text: string): Metrics | null {
  const trimmed = text.trim()
  if (visibleLen(trimmed) < 20) return null
  const sentences = splitSentences(trimmed)
  if (sentences.length === 0) return null
  const chars = visibleLen(trimmed)
  const firstSentLen = visibleLen(sentences[0])
  const dialogue = splitDialogue(trimmed)

  // 첫 대사가 등장한 문장 번호
  let firstDialogueSentence = -1
  if (dialogue.firstDialogueAt >= 0) {
    const head = [...trimmed].slice(0, dialogue.firstDialogueAt).join('')
    firstDialogueSentence = splitSentences(head).length + 1
    if (dialogue.firstDialogueAt === 0) firstDialogueSentence = 1
  }
  const total = dialogue.dialogueChars + dialogue.narrationChars
  const dialoguePct = total > 0 ? (dialogue.dialogueChars / total) * 100 : 0

  const cliches = CLICHE_PATTERNS.filter((c) => countRegex(trimmed, c.res)).map((c) => ({ id: c.id, label: c.label, tip: c.tip }))
  const backstory = countMatches(trimmed, BACKSTORY_WORDS)
  const abstract = countMatches(trimmed, ABSTRACT_WORDS)
  const tension = countMatches(trimmed, TENSION_WORDS)
  const filler = countMatches(trimmed, FILLER_WORDS)
  const pov = detectPOV(trimmed)
  const properNouns = estimateProperNouns(trimmed)

  const paras = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
  const paraCount = Math.max(1, paras.length)
  const longParas = paras.filter((p) => {
    const d = splitDialogue(p)
    const dp = (d.dialogueChars + d.narrationChars) > 0 ? d.dialogueChars / (d.dialogueChars + d.narrationChars) : 0
    return visibleLen(p) >= 120 && dp < 0.1
  }).length
  const longParaRatio = longParas / paraCount

  return {
    chars, sentences, firstSentLen, dialogue, firstDialogueSentence, dialoguePct,
    cliches, backstory, abstract, tension, filler, pov, properNouns, paraCount, longParaRatio,
  }
}

// 자동 신호 → 항목별 점수/판정/팁
function buildChecks(m: Metrics): CheckResult[] {
  const per1k = (n: number) => (m.chars > 0 ? (n / m.chars) * 1000 : 0)
  const out: CheckResult[] = []

  // 1) 훅(첫 문장) — 너무 길면 흡인력↓, 적당히 짧고 구체적이면↑
  {
    const len = m.firstSentLen
    let score: number, signal: string, tip: string
    if (len <= 6) { score = 55; signal = `첫 문장 ${len}자(매우 짧음)`; tip = '첫 문장이 너무 짧아 정보가 부족할 수 있습니다. 구체적 이미지·행동을 한 스푼 더하세요.' }
    else if (len <= 30) { score = 90; signal = `첫 문장 ${len}자(간결)`; tip = '간결한 첫 문장은 좋은 훅입니다. 다음 문장으로 긴장을 이어가세요.' }
    else if (len <= 55) { score = 65; signal = `첫 문장 ${len}자(다소 김)`; tip = '첫 문장이 다소 깁니다. 핵심 이미지 하나로 압축하면 더 강하게 잡힙니다.' }
    else { score = 35; signal = `첫 문장 ${len}자(매우 김)`; tip = '첫 문장이 길어 독자가 한 박자 늦게 들어옵니다. 짧고 구체적인 문장으로 열어 보세요.' }
    out.push({ id: 'hook', label: '훅(첫 문장)', icon: '🪝', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.4, signal, tip })
  }

  // 2) 장면 진입 속도(대화/움직임이 일찍 들어오는가)
  {
    const fd = m.firstDialogueSentence
    let score: number, signal: string, tip: string
    if (fd >= 1 && fd <= 3) { score = 92; signal = `첫 대사 ${fd}번째 문장`; tip = '대화가 일찍 들어와 장면이 빨리 살아납니다.' }
    else if (fd >= 4 && fd <= 8) { score = 70; signal = `첫 대사 ${fd}번째 문장`; tip = '대화 등장이 무난합니다. 조금 더 당기면 더 빨리 몰입됩니다.' }
    else if (fd > 8) { score = 45; signal = `첫 대사 ${fd}번째 문장(늦음)`; tip = '대화가 늦게 나옵니다. 설명을 줄이고 인물의 목소리를 일찍 들려주세요.' }
    else {
      // 대사 없음 — 장면 행동성으로 보정(문장 수 대비)
      score = m.sentences.length <= 6 ? 60 : 40
      signal = '도입부에 대사 없음'
      tip = '대사가 전혀 없습니다. 첫 페이지에 인물의 말 한마디라도 들어가면 즉시 생동감이 생깁니다.'
    }
    out.push({ id: 'entry', label: '장면 진입(대화 시점)', icon: '🎬', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.2, signal, tip })
  }

  // 3) 정보 투하(info-dump) — 긴 지문 문단 비율 + 백스토리 밀도
  {
    const longR = m.longParaRatio
    const bs = per1k(m.backstory.total)
    let penalty = 0
    if (longR >= 0.6) penalty += 45
    else if (longR >= 0.35) penalty += 25
    else if (longR >= 0.2) penalty += 12
    if (bs >= 6) penalty += 35
    else if (bs >= 3) penalty += 20
    else if (bs >= 1.2) penalty += 10
    const score = clamp(100 - penalty)
    const signal = `긴 지문 문단 ${Math.round(longR * 100)}% · 백스토리 신호 ${m.backstory.total}개${m.backstory.hits.length ? ` (${m.backstory.hits.slice(0, 4).join(', ')})` : ''}`
    const tip = score >= 75
      ? '설명이 과하지 않습니다. 지금의 균형을 유지하세요.'
      : '도입부에 배경·과거 설명이 몰려 있습니다. 정보는 사건이 필요로 할 때 흘리고, 지금은 "지금 무슨 일이 벌어지는가"에 집중하세요.'
    out.push({ id: 'infodump', label: '과도한 배경설명·정보투하', icon: '📦', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.3, signal, tip })
  }

  // 4) 갈등/긴장 암시 — 있으면 가점
  {
    const t = per1k(m.tension.total)
    let score: number
    if (m.tension.total === 0) score = 30
    else if (t >= 5) score = 90
    else if (t >= 2.5) score = 78
    else if (t >= 1) score = 62
    else score = 48
    const signal = `긴장·갈등 어휘 ${m.tension.total}개${m.tension.hits.length ? ` (${m.tension.hits.slice(0, 5).join(', ')})` : ''}`
    const tip = score >= 75
      ? '"무언가 걸려 있다"는 신호가 일찍 보입니다. 좋은 출발입니다.'
      : '첫 페이지에서 무엇이 위태로운지(욕망·위협·균열)가 약합니다. 인물이 원하는 것과 그것을 가로막는 무언가를 암시하세요.'
    out.push({ id: 'conflict', label: '갈등·긴장 암시', icon: '⚡', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.4, signal, tip })
  }

  // 5) 시점 명확성
  {
    const { label, first, third, second } = m.pov
    const dominant = Math.max(first, third, second)
    const sum = first + third + second
    let score: number, tip: string
    if (sum < 2) { score = 50; tip = '대명사가 적어 시점이 흐릿합니다. 누구의 눈으로 보는 장면인지 일찍 못박으세요.' }
    else {
      const ratio = dominant / sum
      score = clamp(50 + ratio * 50)
      tip = ratio >= 0.7
        ? '시점이 일관됩니다. 한 인물의 인식 안에 머무르세요.'
        : '1인칭·3인칭 대명사가 뒤섞여 시점이 흔들릴 수 있습니다. 첫 페이지에서 시점을 분명히 고정하세요.'
    }
    const signal = `${label} · 1인칭 ${first} / 3인칭 ${third} / 2인칭 ${second}`
    out.push({ id: 'pov', label: '시점·인칭 명확성', icon: '👁️', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.0, signal, tip })
  }

  // 6) 인물 매력/구체성 — 대화 비율 + 고유명사(존재감) - 추상어
  {
    const dlg = m.dialoguePct
    const abs = per1k(m.abstract.total)
    let score = 50
    if (dlg >= 12) score += 18
    else if (dlg >= 4) score += 8
    if (m.properNouns >= 1) score += 14
    if (abs >= 5) score -= 28
    else if (abs >= 2.5) score -= 15
    score = clamp(score)
    const signal = `대화 ${Math.round(dlg)}% · 고유명사 ${m.properNouns}종 · 추상어 ${m.abstract.total}개`
    const tip = score >= 75
      ? '인물이 말하고 움직여 손에 잡힙니다.'
      : '인물이 관념·요약 뒤에 가려져 있습니다. 이름·구체적 행동·목소리로 인물을 일찍 보여주세요.'
    out.push({ id: 'character', label: '인물 매력·구체성', icon: '🧍', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.2, signal, tip })
  }

  // 7) 도입 클리셰
  {
    const n = m.cliches.length
    const score = clamp(100 - n * 28)
    const signal = n === 0 ? '전형적 도입 클리셰 미검출' : `클리셰 ${n}개: ${m.cliches.map((c) => c.label).join(', ')}`
    const tip = n === 0
      ? '흔한 도입 함정을 피했습니다.'
      : m.cliches.map((c) => c.tip).join(' / ')
    out.push({ id: 'cliche', label: '도입 클리셰 회피', icon: '🚩', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 1.1, signal, tip })
  }

  // 8) 추상·관념 vs 구체 — 추상어 과다는 "철학적 도입" 함정
  {
    const a = per1k(m.abstract.total)
    let score: number
    if (a === 0) score = 88
    else if (a < 2) score = 80
    else if (a < 4) score = 62
    else if (a < 7) score = 42
    else score = 25
    const signal = `추상·관념어 ${m.abstract.total}개${m.abstract.hits.length ? ` (${m.abstract.hits.slice(0, 5).join(', ')})` : ''}`
    const tip = score >= 75
      ? '구체적 장면 위주로 시작합니다.'
      : '운명·인생·진실 같은 추상어로 여는 "철학적 도입"은 독자를 밀어냅니다. 관념은 장면이 증명하게 두세요.'
    out.push({ id: 'concrete', label: '구체성(추상어 절제)', icon: '🪨', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 0.9, signal, tip })
  }

  // 9) 필러·머뭇거림(문체 선명도)
  {
    const f = per1k(m.filler.total)
    let score: number
    if (f < 3) score = 88
    else if (f < 6) score = 70
    else if (f < 10) score = 50
    else score = 32
    const signal = `필러·머뭇 표현 ${m.filler.total}개${m.filler.hits.length ? ` (${m.filler.hits.slice(0, 5).join(', ')})` : ''}`
    const tip = score >= 75
      ? '문장이 선명하고 단정적입니다.'
      : '"아마도·왠지·그냥" 같은 머뭇거림이 첫 페이지의 확신을 흐립니다. 단정적으로 써서 신뢰를 주세요.'
    out.push({ id: 'filler', label: '문체 선명도(필러 절제)', icon: '✂️', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 0.8, signal, tip })
  }

  // 10) 고유명사 폭주(첫 페이지 과부하)
  {
    const n = m.properNouns
    let score: number, tip: string
    if (n <= 4) { score = 90; tip = '소개되는 이름이 적당해 따라가기 쉽습니다.' }
    else if (n <= 7) { score = 68; tip = '이름이 다소 많습니다. 핵심 인물만 먼저 세우면 더 또렷합니다.' }
    else { score = 40; tip = `첫 페이지에 이름·고유명사가 ${n}종이나 됩니다. 독자가 인물·세계 정보에 압도됩니다. 한 번에 한 명씩 들이세요.` }
    out.push({ id: 'names', label: '고유명사 과부하 방지', icon: '🏷️', verdict: score >= 75 ? 'good' : score >= 50 ? 'ok' : 'warn', score, weight: 0.8, signal: `고유명사·이름 ${n}종 추정`, tip })
  }

  return out
}

// 종합 점수(가중 평균)
function overallScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0
  const wsum = checks.reduce((a, c) => a + c.weight, 0)
  const s = checks.reduce((a, c) => a + c.score * c.weight, 0)
  return Math.round(wsum > 0 ? s / wsum : 0)
}
function gradeOf(score: number): { grade: string; color: string; desc: string } {
  if (score >= 85) return { grade: 'A', color: 'var(--ok)', desc: '에이전트의 다음 장을 부르는 강한 첫 페이지' }
  if (score >= 70) return { grade: 'B', color: 'var(--ok)', desc: '탄탄한 도입. 약점만 다듬으면 더 좋아집니다' }
  if (score >= 55) return { grade: 'C', color: 'var(--accent)', desc: '평이한 도입. 훅·갈등·구체성을 끌어올리세요' }
  if (score >= 40) return { grade: 'D', color: 'var(--warn)', desc: '진입 장벽이 있습니다. 아래 약점을 우선 손보세요' }
  return { grade: 'E', color: 'var(--warn)', desc: '첫 페이지에서 독자를 잃을 위험이 큽니다' }
}

// ── 수동 체크리스트(에이전트/편집자 질문) ───────────────────
interface ManualItem { id: string; q: string }
const MANUAL: ManualItem[] = [
  { id: 'm-promise', q: '첫 페이지가 이 책의 "장르 약속"(분위기·톤)을 정확히 전달하는가?' },
  { id: 'm-voice', q: '문장에서 이 작가만의 목소리(보이스)가 느껴지는가?' },
  { id: 'm-question', q: '독자 머릿속에 "다음에 무슨 일이?"라는 질문이 생기는가?' },
  { id: 'm-stakes', q: '인물이 무엇을 원하는지 / 무엇이 걸려 있는지 암시되는가?' },
  { id: 'm-ground', q: '독자가 "지금·여기"(시간·공간)에 발 디딜 수 있는가?' },
  { id: 'm-pageturn', q: '마지막 줄이 다음 페이지를 넘기게 만드는가?' },
  { id: 'm-confusion', q: '낯선 용어·이름이 설명 없이 쏟아져 혼란스럽지 않은가?' },
  { id: 'm-clean', q: '오탈자·비문 없이 깔끔하게 다듬어져 있는가?' },
]

// ── 저장/복원 ───────────────────────────────────────────────
interface SaveShape { text: string; manual: Record<string, boolean> }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return { text: '', manual: {} }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { text: '', manual: {} }
    return {
      text: typeof p.text === 'string' ? p.text : '',
      manual: p.manual && typeof p.manual === 'object' ? p.manual : {},
    }
  } catch { return { text: '', manual: {} } }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const verdictColor = (v: Verdict) => v === 'good' ? 'var(--ok)' : v === 'ok' ? 'var(--accent)' : 'var(--warn)'
const verdictIcon = (v: Verdict) => v === 'good' ? '✓' : v === 'ok' ? '◐' : '!'
const verdictText = (v: Verdict) => v === 'good' ? '양호' : v === 'ok' ? '보통' : '주의'

export default function OpeningPageAudit({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [text, setText] = useState(() => {
    const fromPayload = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    return fromPayload || init.current.text
  })
  const [manual, setManual] = useState<Record<string, boolean>>(init.current.manual)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showSignals, setShowSignals] = useState(true)
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장(차단/용량초과 graceful)
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ text, manual } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [text, manual])

  // 토스트 자동 소거
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2200)
    return () => window.clearTimeout(t)
  }, [saved])

  const metrics = useMemo(() => { try { return analyze(text) } catch { return null } }, [text])
  const checks = useMemo(() => (metrics ? buildChecks(metrics) : []), [metrics])
  const auto = useMemo(() => overallScore(checks), [checks])
  const weak = useMemo(() => [...checks].sort((a, b) => a.score - b.score).slice(0, 3), [checks])

  // 수동 체크 반영 종합: 자동 80% + 수동 20%
  const manualScore = useMemo(() => {
    const done = MANUAL.filter((m) => manual[m.id]).length
    return MANUAL.length > 0 ? Math.round((done / MANUAL.length) * 100) : 0
  }, [manual])
  const manualAnswered = useMemo(() => MANUAL.filter((m) => manual[m.id] !== undefined).length, [manual])
  const finalScore = useMemo(() => {
    if (!metrics) return 0
    return Math.round(auto * 0.8 + manualScore * 0.2)
  }, [auto, manualScore, metrics])
  const grade = useMemo(() => gradeOf(finalScore), [finalScore])

  const toggleManual = (id: string) => setManual((m) => ({ ...m, [id]: !m[id] }))

  // ── 리포트(텍스트/HTML) ───────────────────────────────────
  const buildText = (): string => {
    if (!metrics) return ''
    const L: string[] = []
    L.push('[첫 페이지 점검 리포트]')
    L.push(`종합 ${finalScore}/100 (${grade.grade}) — ${grade.desc}`)
    L.push(`자동 신호 ${auto}/100 · 수동 체크 ${manualScore}/100 (${MANUAL.filter((m) => manual[m.id]).length}/${MANUAL.length})`)
    L.push(`분량 ${metrics.chars}자(공백 제외) · 문장 ${metrics.sentences.length}개 · 대화 ${Math.round(metrics.dialoguePct)}%`)
    L.push('')
    L.push('— 항목별 자동 진단 —')
    checks.forEach((c) => {
      L.push(`${verdictText(c.verdict)} [${c.score}] ${c.label}`)
      L.push(`   신호: ${c.signal}`)
      L.push(`   팁: ${c.tip}`)
    })
    L.push('')
    L.push('— 우선 보완 3가지 —')
    weak.forEach((c, i) => L.push(`${i + 1}. ${c.label}(${c.score}) — ${c.tip}`))
    L.push('')
    L.push('— 수동 체크리스트 —')
    MANUAL.forEach((m) => L.push(`[${manual[m.id] ? 'O' : ' '}] ${m.q}`))
    return L.join('\n')
  }
  const buildHtml = (): string => {
    if (!metrics) return ''
    const P: string[] = []
    P.push(`<p><strong>첫 페이지 점검 리포트</strong> — 종합 ${finalScore}/100 (${grade.grade}): ${esc(grade.desc)}</p>`)
    P.push(`<p>자동 신호 ${auto}/100 · 수동 체크 ${manualScore}/100 · 분량 ${metrics.chars}자 · 문장 ${metrics.sentences.length}개 · 대화 ${Math.round(metrics.dialoguePct)}%</p>`)
    P.push('<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>판정</th><th>점수</th><th>항목</th><th>신호</th><th>팁</th></tr></thead><tbody>')
    checks.forEach((c) => {
      P.push(`<tr><td>${verdictText(c.verdict)}</td><td>${c.score}</td><td>${esc(c.label)}</td><td>${esc(c.signal)}</td><td>${esc(c.tip)}</td></tr>`)
    })
    P.push('</tbody></table>')
    P.push('<p><strong>우선 보완 3가지</strong></p><ol>')
    weak.forEach((c) => P.push(`<li>${esc(c.label)}(${c.score}) — ${esc(c.tip)}</li>`))
    P.push('</ol>')
    P.push('<p><strong>수동 체크리스트</strong></p><ul>')
    MANUAL.forEach((m) => P.push(`<li>[${manual[m.id] ? 'O' : ' '}] ${esc(m.q)}</li>`))
    P.push('</ul>')
    return P.join('')
  }

  const markCopied = () => {
    setCopied(true)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
  }
  const fallbackCopy = (s: string): boolean => {
    try {
      const ta = document.createElement('textarea')
      ta.value = s; ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
  const copy = async () => {
    const s = buildText()
    if (!s) return
    try { await navigator.clipboard.writeText(s); markCopied() }
    catch { if (fallbackCopy(s)) markCopied(); else setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge() || !metrics) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '첫 페이지 점검 리포트',
      bodyHtml: buildHtml(),
      meta: {
        종합점수: `${finalScore}/100 (${grade.grade})`,
        자동신호: `${auto}/100`,
        수동체크: `${MANUAL.filter((m) => manual[m.id]).length}/${MANUAL.length}`,
        분량: `${metrics.chars}자`,
        대화비율: `${Math.round(metrics.dialoguePct)}%`,
        우선보완: weak.map((c) => c.label).join(', '),
      },
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 연결되지 않았습니다.')
  }
  const toStash = () => {
    const s = buildText()
    if (!s || !hasStash()) return
    addToStash({ kind: 'note', label: '첫 페이지 점검 리포트', text: s })
    if (mounted.current) setSaved(true)
  }

  // ── 바인더 파일 드롭 ──────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      // 도입부만 보는 도구이므로 앞부분(약 5쪽 ≒ 6000자) 위주로 제안
      const t = item.text
      setText(t.length > 6000 ? t.slice(0, 6000) : t)
      setNote(`"${item.title || '문서'}" 본문을 불러왔습니다.${t.length > 6000 ? ' (도입부 약 5쪽만 가져왔어요)' : ''}`)
    } else if (item) {
      setNote('이 파일에는 분석할 본문 텍스트가 없습니다.')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const taStyle: React.CSSProperties = {
    minHeight: 120, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '24px 12px' }

  const m = metrics

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🔍" /></span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>첫 페이지 점검</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => { setText(''); setNote('') }} disabled={!text}>↺ 지우기</button>
        <button className="minibtn" onClick={copy} disabled={!m} title="리포트를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        {hasStash() && <button className="minibtn" onClick={toStash} disabled={!m} title="수집함에 리포트 담기"><Emoji e="📥" /> 수집함</button>}
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || !m}
          title={hasProjectBridge() ? (m ? '자료 › 구조 폴더에 점검 리포트로 추가' : '먼저 도입부를 입력하세요') : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {saved && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 14px 0' }}>✓ 리포트를 추가했어요.</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* 입력 */}
        <textarea
          style={taStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          placeholder={'도입부(첫 1~5쪽)를 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.\n\n에이전트·편집자가 첫 페이지에서 보는 항목(훅·시점·정보투하·갈등 암시·인물·클리셰)을 자동 신호 + 체크리스트로 진단합니다.'}
          spellCheck={false}
          aria-label="첫 페이지 점검 도입부 입력"
        />

        {!m ? (
          <div style={empty}>
            도입부를 붙여넣으면 즉시<br />
            <strong>훅(첫 문장) · 장면 진입 · 정보투하 · 갈등 암시 · 시점 · 인물 매력 · 클리셰</strong> 등을<br />
            자동 신호(첫 문장 길이·대화 등장 시점·설명 비율·클리셰 패턴)로 진단하고,<br />
            점수와 우선 보완 3가지, 에이전트식 수동 체크리스트를 제공합니다.<br />
            <span style={{ fontSize: 11 }}>(형태소 분석 없이 정규식·휴리스틱으로 계산한 근사값입니다.)</span>
          </div>
        ) : (
          <>
            {/* 종합 점수 카드 */}
            <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 14, borderLeft: `4px solid ${grade.color}` }}>
              <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" width={76} height={76} role="img" aria-label={`종합 점수 ${finalScore}점`}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3.4" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke={grade.color} strokeWidth="3.4" strokeLinecap="round"
                    strokeDasharray={`${(finalScore / 100) * 99.9} 99.9`} transform="rotate(-90 18 18)"
                  />
                  <text x="18" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">{finalScore}</text>
                  <text x="18" y="24.5" textAnchor="middle" fontSize="5" fill="var(--muted)">/100</text>
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: grade.color, lineHeight: 1 }}>{grade.grade}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>첫 페이지 종합</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, lineHeight: 1.5 }}>{grade.desc}</div>
                <div style={{ ...hint, marginTop: 5 }}>
                  자동 신호 {auto} · 수동 체크 {manualScore} ({MANUAL.filter((x) => manual[x.id]).length}/{MANUAL.length}) · {m.chars}자 · 문장 {m.sentences.length}개 · 대화 {Math.round(m.dialoguePct)}%
                </div>
              </div>
            </div>

            {/* 우선 보완 3가지 */}
            {weak.length > 0 && (
              <div style={{ ...panel, borderLeft: '3px solid var(--warn)' }}>
                <div style={sectionTitle}>⚑ 우선 보완 3가지(점수 낮은 순)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {weak.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, lineHeight: 1.55 }}>
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', background: verdictColor(c.verdict), borderRadius: 6, padding: '1px 6px' }}>{i + 1}</span>
                      <span style={{ minWidth: 0 }}><strong><Emoji e={c.icon} /> {c.label}</strong> <span style={{ color: 'var(--muted)' }}>({c.score})</span> — {c.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 항목별 자동 진단 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}><Emoji e="📊" /> 항목별 자동 진단 ({checks.length})</span>
                <button className="minibtn" onClick={() => setShowSignals((v) => !v)}>{showSignals ? '신호 접기 ▲' : '신호 펼치기 ▼'}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checks.map((c) => (
                  <div key={c.id} style={{ background: 'var(--chrome-2)', border: `1px solid var(--border)`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, background: verdictColor(c.verdict), color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={verdictText(c.verdict)}>{verdictIcon(c.verdict)}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e={c.icon} /> {c.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: verdictColor(c.verdict), flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{c.score}</span>
                    </div>
                    {/* 점수 막대 */}
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: showSignals ? 6 : 0 }}>
                      <div style={{ width: `${c.score}%`, height: '100%', background: verdictColor(c.verdict), borderRadius: 4 }} />
                    </div>
                    {showSignals && (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>신호: {c.signal}</div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 2 }}><Emoji e="💡" /> {c.tip}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 수동 체크리스트 */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}><Emoji e="✅" /> 에이전트식 수동 체크리스트</span>
                <span style={hint}>{MANUAL.filter((x) => manual[x.id]).length}/{MANUAL.length} 체크{manualAnswered < MANUAL.length ? '' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MANUAL.map((mi) => {
                  const on = !!manual[mi.id]
                  return (
                    <div
                      key={mi.id}
                      role="checkbox"
                      aria-checked={on}
                      tabIndex={0}
                      onClick={() => toggleManual(mi.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleManual(mi.id) } }}
                      style={{
                        display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 9px', borderRadius: 9, cursor: 'pointer',
                        background: on ? 'var(--chrome-2)' : 'var(--paper)', border: `1px solid ${on ? 'var(--ok)' : 'var(--border)'}`,
                      }}
                    >
                      <span style={{
                        flexShrink: 0, width: 18, height: 18, borderRadius: 5, marginTop: 1,
                        border: `1.5px solid ${on ? 'var(--ok)' : 'var(--border)'}`, background: on ? 'var(--ok)' : 'transparent',
                        color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{on ? '✓' : ''}</span>
                      <span style={{ minWidth: 0, fontSize: 13, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--text)' }}>{mi.q}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ ...hint, marginTop: 8 }}>체크할수록 종합 점수에 반영됩니다(자동 80% + 수동 20%).</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={hint}>에이전트는 보통 첫 페이지에서 다음 장을 읽을지 결정합니다. 자동 신호는 형태소 분석 없는 근사값이니 맥락으로 판단하세요.</div>
              <button className="btn-primary" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 리포트 복사</>}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
