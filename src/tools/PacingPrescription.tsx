// 페이싱 처방 — 본문/장면 메모를 장면 단위로 쪼개, 각 구간이 "늘어짐(느림)" 또는
// "휙 지나감(빠름)"인지 신호(대화비율·문장길이·사건밀도)로 진단하고, 교정 처방
// (요약↔확장·장면 추가/삭제)을 제시한다. 전부 로컬 파싱·계산. react 와 './linkbus' 만 import.
// 언마운트 시 복사 피드백 타이머를 정리한다. 외부 API/네트워크/미디어 없음.
import { useState, useMemo, useRef, useEffect } from 'react'
import { addToStash, addToProject, hasProjectBridge, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'pacing-prescription',
  name: '페이싱 처방',
  icon: '🩺',
  group: '교정·언어',
  intro: '본문을 장면 단위로 진단해 늘어짐·휙 지나감 구간을 찾고 요약↔확장 처방을 제시합니다',
  w: 560,
  h: 680,
}

const LSKEY = 'sry:tool:pacing-prescription'

// ── 사건(액션) 신호어 — 본문에서 "무슨 일이 일어났는가"를 가늠하는 동사·표지 ──────────
// 자작 한국어 신호어 사전(저작권 안전). 사건이 잦을수록 밀도가 높다(=빠른 전개).
const EVENT_WORDS: string[] = [
  // 이동·등퇴장
  '들어왔', '들어섰', '나갔', '나섰', '뛰', '달렸', '달려', '걸어', '돌아섰', '돌아왔', '도착했',
  '떠났', '향했', '다가왔', '다가섰', '물러섰', '쓰러졌', '일어섰', '일어났', '주저앉', '올라갔',
  '내려갔', '들이닥', '튀어나', '빠져나', '숨었', '도망', '쫓았', '쫓겼',
  // 충돌·물리 사건
  '부딪', '깨졌', '터졌', '무너졌', '쏟아졌', '떨어졌', '던졌', '휘둘렀', '내리쳤', '때렸',
  '밀쳤', '붙잡', '움켜', '낚아', '찔렀', '베었', '쐈', '쏘았', '폭발', '불탔', '타올랐',
  '쓰러뜨', '걷어찼', '잡아챘', '뜯어', '부쉈', '박살',
  // 발화·소통의 결정적 순간
  '소리쳤', '외쳤', '비명', '고함', '속삭였', '내뱉', '쏘아붙', '캐물었', '다그쳤', '털어놨',
  '고백했', '선언했', '명령했', '내질렀',
  // 정서·신체 반응(급변)
  '놀랐', '경악', '얼어붙', '소름', '심장이', '숨이', '눈물이', '울음', '웃음을 터', '벌떡',
  '움찔', '몸서리', '손이 떨', '주먹을', '이를 악',
  // 변화·전환의 표지
  '갑자기', '순간', '그때', '마침내', '느닷없', '돌연', '별안간', '어느새', '그 순간', '곧이어',
]

// ── 묘사·정적(static) 신호어 — 늘어짐을 가늠하는 표지(상태·배경·회상) ──────────
const STATIC_WORDS: string[] = [
  // 상태 동사·이다체
  '있었', '없었', '였다', '이었', '같았', '보였', '느껴졌', '들렸', '풍겼', '서 있',
  '앉아 있', '누워 있', '놓여 있', '걸려 있', '펼쳐져', '드리워',
  // 시간·배경 도입
  '예전', '오래전', '한때', '그날', '그 무렵', '언젠가', '늘', '항상', '여전히', '언제나',
  // 사색·회상 표지
  '생각했', '떠올렸', '돌이켜', '회상', '기억했', '곱씹', '되뇌', '상상했', '궁금했',
  // 묘사 부사
  '천천히', '느릿', '가만히', '조용히', '고요', '나른', '잔잔', '아련',
]

// ── 헬퍼 ─────────────────────────────────────────────────────────
const QUOTE_OPEN = ['“', '‘', '「', '『', '"', "'"]
const QUOTE_CLOSE: Record<string, string> = { '“': '”', '‘': '’', '「': '」', '『': '』', '"': '"', "'": "'" }

// 공백 제외 글자수
function vlen(s: string): number {
  return s.replace(/\s+/g, '').length
}

// 문장 분리(마침표/물음표/느낌표/줄임표 + 개행)
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 대사 글자수(따옴표로 감싼 구간) — 곧은 작은따옴표는 축약형 보호
function dialogueChars(text: string): number {
  const chars = [...text]
  let i = 0
  let total = 0
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)
  while (i < chars.length) {
    const ch = chars[i]
    if (QUOTE_OPEN.indexOf(ch) >= 0) {
      if (ch === "'" && isAlnum(chars[i - 1])) { i++; continue }
      const close = QUOTE_CLOSE[ch]
      let j = i + 1
      let inner = ''
      let closed = false
      while (j < chars.length) {
        const cj = chars[j]
        if (close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
        if (cj === close) { closed = true; break }
        if (cj === '\n' && chars[j + 1] === '\n') break
        inner += cj
        j++
      }
      if (closed) { total += vlen(inner); i = j + 1 } else { i++ }
    } else { i++ }
  }
  return total
}

// 신호어 등장 횟수(중복 포함 근사)
function countWords(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    let from = 0
    while (true) {
      const idx = text.indexOf(w, from)
      if (idx < 0) break
      n++
      from = idx + w.length
    }
  }
  return n
}

// ── 장면 분리 ─────────────────────────────────────────────────────
// 빈 줄(문단 사이 한 줄 이상 공백) 또는 장면 구분 표지(*, ―, ===, ##, 「장면」 등)를 경계로 자른다.
// 단, 너무 잘게 쪼개지 않도록 "두 줄 이상 연속 개행" 또는 명시적 구분선만 경계로 본다.
const SCENE_MARK = /^[\s]*(?:[*＊]{2,}|[#＃]{1,}\s|[―—\-=]{3,}|[·•▪◆◇○●][\s]*$|장면\s*\d|씬\s*\d|scene\s*\d)/i
function splitScenes(text: string, mode: 'auto' | 'whole'): string[] {
  if (mode === 'whole') {
    const t = text.trim()
    return t ? [t] : []
  }
  const lines = text.split(/\r?\n/)
  const scenes: string[] = []
  let buf: string[] = []
  let blankRun = 0
  const flush = () => {
    const joined = buf.join('\n').trim()
    if (joined) scenes.push(joined)
    buf = []
  }
  for (const line of lines) {
    const isBlank = line.trim() === ''
    const isMark = SCENE_MARK.test(line)
    if (isMark) {
      // 구분 표지 줄을 만나면 직전까지를 한 장면으로 끊고, 표지 줄은 버린다.
      flush()
      blankRun = 0
      continue
    }
    if (isBlank) {
      blankRun++
      // 연속 빈 줄 2개 이상 → 장면 경계
      if (blankRun >= 2 && buf.length > 0) flush()
      continue
    }
    blankRun = 0
    buf.push(line)
  }
  flush()
  // 분리 결과가 1개뿐이면(빈 줄 없는 글) 그대로 둔다.
  return scenes.length > 0 ? scenes : (text.trim() ? [text.trim()] : [])
}

// ── 한 장면 진단 ───────────────────────────────────────────────────
type Verdict = 'slow' | 'fast' | 'balanced' | 'tiny'
interface Diag {
  idx: number
  text: string
  preview: string
  chars: number          // 공백 제외 글자수
  sentences: number
  avgSent: number        // 평균 문장 길이
  longSent: number       // 40자+ 문장 수
  dialoguePct: number    // 대사 비율(%)
  eventHits: number
  staticHits: number
  eventDensity: number   // 사건/100자
  staticDensity: number  // 묘사/100자
  verdict: Verdict
  score: number          // -100(느림) ~ +100(빠름)
  signals: string[]      // 진단 근거 문장들
  rx: string[]           // 처방
}

// 진단 핵심 로직 — 여러 신호를 가중 합산해 -100(늘어짐) ~ +100(휙 지나감) 점수를 낸다.
function diagnose(text: string, idx: number): Diag {
  const chars = vlen(text)
  const sents = splitSentences(text)
  const n = sents.length || 1
  const lengths = sents.map(vlen)
  const totalLen = lengths.reduce((a, b) => a + b, 0)
  const avgSent = totalLen / n
  const longSent = lengths.filter((l) => l >= 40).length
  const dChars = dialogueChars(text)
  const dialoguePct = chars > 0 ? (dChars / chars) * 100 : 0
  const eventHits = countWords(text, EVENT_WORDS)
  const staticHits = countWords(text, STATIC_WORDS)
  const eventDensity = chars > 0 ? (eventHits / chars) * 100 : 0
  const staticDensity = chars > 0 ? (staticHits / chars) * 100 : 0

  // 짧은 토막(분석 의미 없음)
  if (chars < 25) {
    return {
      idx, text, preview: preview(text), chars, sentences: sents.length, avgSent, longSent,
      dialoguePct, eventHits, staticHits, eventDensity, staticDensity,
      verdict: 'tiny', score: 0,
      signals: ['글자수가 너무 적어 페이싱 진단을 건너뜁니다.'],
      rx: ['장면이 너무 짧습니다. 앞뒤 장면과 합치거나, 의도된 짧은 비트(쇼트)인지 확인하세요.'],
    }
  }

  const signals: string[] = []
  let score = 0

  // 1) 문장 길이 — 긴 문장이 이어지면 느려지고, 짧은 문장 위주면 빨라진다.
  if (avgSent >= 38) { score -= 26; signals.push(`평균 문장 길이 ${avgSent.toFixed(0)}자 — 긴 호흡이 이어져 늘어지는 느낌.`) }
  else if (avgSent >= 28) { score -= 12; signals.push(`평균 문장 길이 ${avgSent.toFixed(0)}자 — 다소 무거운 호흡.`) }
  else if (avgSent <= 12) { score += 22; signals.push(`평균 문장 길이 ${avgSent.toFixed(0)}자 — 짧은 문장이 몰아쳐 빠르게 읽힘.`) }
  else if (avgSent <= 18) { score += 8; signals.push(`평균 문장 길이 ${avgSent.toFixed(0)}자 — 경쾌한 호흡.`) }
  else { signals.push(`평균 문장 길이 ${avgSent.toFixed(0)}자 — 무난한 호흡.`) }

  if (longSent >= 3 && longSent / n >= 0.4) { score -= 14; signals.push(`40자 이상 긴 문장 ${longSent}개 — 끊기지 않아 답답할 수 있음.`) }

  // 2) 대화 비율 — 대사가 많으면 장면이 빨라지고, 거의 없으면 묘사·서술로 느려진다.
  if (dialoguePct >= 55) { score += 22; signals.push(`대사 비율 ${dialoguePct.toFixed(0)}% — 핑퐁식 대화로 빠르게 진행.`) }
  else if (dialoguePct >= 35) { score += 10; signals.push(`대사 비율 ${dialoguePct.toFixed(0)}% — 대화가 추진력을 줌.`) }
  else if (dialoguePct <= 5) { score -= 16; signals.push(`대사 비율 ${dialoguePct.toFixed(0)}% — 대사가 거의 없어 서술이 무거움.`) }
  else if (dialoguePct <= 15) { score -= 6; signals.push(`대사 비율 ${dialoguePct.toFixed(0)}% — 지문 중심.`) }
  else { signals.push(`대사 비율 ${dialoguePct.toFixed(0)}% — 대사·지문 균형.`) }

  // 3) 사건 밀도 vs 묘사 밀도 — 사건이 많으면 빠르고, 묘사·회상이 많으면 느리다.
  const net = eventDensity - staticDensity
  if (eventDensity >= 1.6) { score += 24; signals.push(`사건 밀도 ${eventDensity.toFixed(1)}/100자 — 사건이 촘촘해 속도감 큼.`) }
  else if (eventDensity >= 0.8) { score += 10; signals.push(`사건 밀도 ${eventDensity.toFixed(1)}/100자 — 사건이 꾸준히 일어남.`) }
  else if (eventDensity <= 0.25) { score -= 18; signals.push(`사건 밀도 ${eventDensity.toFixed(1)}/100자 — 사건이 드물어 정적임.`) }
  else { signals.push(`사건 밀도 ${eventDensity.toFixed(1)}/100자 — 보통.`) }

  if (staticDensity >= 1.4 && net < 0) { score -= 16; signals.push(`묘사·회상 밀도 ${staticDensity.toFixed(1)}/100자 — 상태 묘사가 우세해 정체될 수 있음.`) }
  else if (staticDensity >= 0.8) { signals.push(`묘사·회상 밀도 ${staticDensity.toFixed(1)}/100자.`) }

  // 4) 분량 보정 — 사건이 적은데 분량만 길면 늘어짐 강화, 사건이 많은데 너무 짧으면 휙 지나감 강화.
  if (chars >= 900 && eventDensity < 0.5) { score -= 12; signals.push(`장면 분량 ${chars}자인데 사건이 적음 — 늘어질 위험.`) }
  if (chars <= 300 && eventDensity >= 1.4) { score += 14; signals.push(`장면 분량 ${chars}자로 짧은데 사건이 많음 — 중요한 순간이 휙 지나갈 위험.`) }

  score = Math.max(-100, Math.min(100, Math.round(score)))

  let verdict: Verdict = 'balanced'
  if (score <= -28) verdict = 'slow'
  else if (score >= 28) verdict = 'fast'

  const rx = prescribe(verdict, { avgSent, longSent, dialoguePct, eventDensity, staticDensity, chars })

  return {
    idx, text, preview: preview(text), chars, sentences: sents.length, avgSent, longSent,
    dialoguePct, eventHits, staticHits, eventDensity, staticDensity, verdict, score, signals, rx,
  }
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 64 ? flat.slice(0, 64) + '…' : flat
}

// ── 처방 생성 ─────────────────────────────────────────────────────
interface RxCtx { avgSent: number; longSent: number; dialoguePct: number; eventDensity: number; staticDensity: number; chars: number }
function prescribe(verdict: Verdict, c: RxCtx): string[] {
  const rx: string[] = []
  if (verdict === 'slow') {
    rx.push('▸ 요약(압축): 사건이 없는 서술·배경·회상은 한두 문장으로 줄이거나 다음 장면으로 미루세요.')
    if (c.avgSent >= 30 || c.longSent >= 2) rx.push('▸ 긴 문장을 끊어 단문·중문을 섞으면 호흡이 살아납니다.')
    if (c.dialoguePct <= 15) rx.push('▸ 대사로 정보를 흘리면 같은 내용이 더 빠르게 전달됩니다(서술 → 대화로 전환).')
    if (c.staticDensity >= 1.0) rx.push('▸ 묘사는 인물의 "행동" 속에 녹이세요(가만히 보는 대신, 무언가를 하면서 관찰).')
    if (c.eventDensity < 0.5) rx.push('▸ 작은 사건·갈등(방해·반전·결정)을 하나 심어 장면에 추진력을 주세요.')
    rx.push('▸ 삭제 검토: 이 장면이 줄거리·인물을 전진시키지 못한다면, 통째로 들어내거나 한 줄 요약으로 대체할 수 있는지 보세요.')
  } else if (verdict === 'fast') {
    rx.push('▸ 확장(전개): 중요한 전환·감정의 정점이라면 한 박자 늦춰 반응·여운을 더 보여주세요.')
    if (c.dialoguePct >= 55) rx.push('▸ 핑퐁 대사 사이에 행동·표정·내면(비트)을 끼워 넣어 장면이 공중에 뜨지 않게 하세요.')
    if (c.avgSent <= 14) rx.push('▸ 모든 문장이 짧으면 단조롭게 읽힙니다. 결정적 순간 한 곳은 호흡이 긴 문장으로 늦춰 보세요.')
    if (c.eventDensity >= 1.6) rx.push('▸ 사건이 연달아 터지면 독자가 따라오기 벅찹니다. 사건 사이에 잠깐의 정적·감각 묘사로 숨 쉴 틈을 주세요.')
    if (c.chars <= 300) rx.push('▸ 분량이 짧습니다. 이 순간이 중요하다면 장면을 더 펼쳐(감각·공간·시간) 무게를 실으세요.')
    rx.push('▸ 장면 추가 검토: 큰 사건 앞뒤로 준비·여파 장면이 없다면, 한 장면을 추가해 감정의 인과를 채우세요.')
  } else {
    rx.push('▸ 균형이 잡힌 구간입니다. 의도한 속도와 맞는지(긴장 장면은 빠르게, 휴지 장면은 느리게) 한 번 더 확인하세요.')
    if (c.avgSent >= 26) rx.push('▸ 다만 문장이 다소 길어 후반에 늘어질 수 있으니, 군더더기 한두 문장은 압축해 두면 좋습니다.')
    if (c.dialoguePct >= 45) rx.push('▸ 대사 비중이 높으니, 장면의 공간감을 잃지 않도록 지문 비트를 잊지 마세요.')
  }
  return rx
}

// ── 전체 곡선 코멘트 ───────────────────────────────────────────────
function curveComment(scored: Diag[]): string {
  const real = scored.filter((d) => d.verdict !== 'tiny')
  if (real.length < 2) return ''
  // 인접 장면 점수 변화의 단조성(같은 속도만 이어지는지)
  let slowRun = 0, maxSlowRun = 0, fastRun = 0, maxFastRun = 0
  for (const d of real) {
    if (d.verdict === 'slow') { slowRun++; maxSlowRun = Math.max(maxSlowRun, slowRun); fastRun = 0 }
    else if (d.verdict === 'fast') { fastRun++; maxFastRun = Math.max(maxFastRun, fastRun); slowRun = 0 }
    else { slowRun = 0; fastRun = 0 }
  }
  if (maxSlowRun >= 3) return '⚠️ 느린 장면이 3개 이상 연달아 이어집니다. 독자가 지치기 전에 사건·대사로 끊어 주세요.'
  if (maxFastRun >= 3) return '⚠️ 빠른 장면이 3개 이상 연달아 이어집니다. 숨 고르는 휴지 장면을 사이에 넣어 완급을 만드세요.'
  const fast = real.filter((d) => d.verdict === 'fast').length
  const slow = real.filter((d) => d.verdict === 'slow').length
  if (slow > fast * 2 && slow >= 2) return '전반적으로 느린 편입니다. 완급의 "빠른 마디"를 늘려 리듬을 만들어 보세요.'
  if (fast > slow * 2 && fast >= 2) return '전반적으로 빠른 편입니다. 정적인 마디를 넣어 감정이 쌓일 시간을 주세요.'
  return '느림·빠름이 적절히 섞여 완급이 살아 있습니다. 좋은 리듬이에요.'
}

const VERDICT_META: Record<Verdict, { label: string; color: string; emoji: string }> = {
  slow: { label: '늘어짐 (느림)', color: 'var(--accent)', emoji: '🐢' },
  fast: { label: '휙 지나감 (빠름)', color: 'var(--warn)', emoji: '⚡' },
  balanced: { label: '적정 (균형)', color: 'var(--ok)', emoji: '✅' },
  tiny: { label: '너무 짧음', color: 'var(--muted)', emoji: '·' },
}

// ── 샘플 본문(자작) ────────────────────────────────────────────────
const SAMPLE = `현관문이 무겁게 열렸다. 그는 들어섰다. "왜 이렇게 늦었어?" 그녀가 외쳤다. "미안." 그가 짧게 답했다. "변명은 됐어." 그녀가 쏘아붙였다. 그는 가방을 내던졌다. 컵이 깨졌다.

오래전, 이 집에는 늘 음악이 흘렀다. 그날의 햇살은 거실 마룻바닥에 잔잔하게 드리워 있었고, 창가에 놓여 있던 화분의 그림자는 천천히 길어졌으며, 그녀는 그 무렵을 떠올리며 가만히 앉아 있었다. 여전히 그 선율이 귓가에 아련하게 남아 있는 것만 같았다. 모든 것이 고요했다.`

export default function PacingPrescription({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'auto' | 'whole'>('auto')
  const [copied, setCopied] = useState('')
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [note, setNote] = useState('')
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)
  const aliveRef = useRef(true)

  // payload 로 본문이 전달되면(예: 다른 도구에서 열기) 채운다.
  useEffect(() => {
    const p = payload && (payload.text || payload.body)
    if (typeof p === 'string' && p.trim()) setText(p)
  }, [payload])

  // 설정(모드) 복원·저장
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LSKEY)
      if (raw) {
        const o = JSON.parse(raw) as { mode?: 'auto' | 'whole' }
        if (o.mode === 'whole' || o.mode === 'auto') setMode(o.mode)
      }
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LSKEY, JSON.stringify({ mode })) } catch { /* noop */ }
  }, [mode])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      if (noteTimer.current != null) clearTimeout(noteTimer.current)
    }
  }, [])

  const result = useMemo(() => {
    const t = text.trim()
    if (!t) return null
    let scenes: string[]
    try { scenes = splitScenes(text, mode) } catch { return null }
    if (scenes.length === 0) return null
    const scored = scenes.map((s, i) => diagnose(s, i))
    const real = scored.filter((d) => d.verdict !== 'tiny')
    const slow = real.filter((d) => d.verdict === 'slow').length
    const fast = real.filter((d) => d.verdict === 'fast').length
    const ok = real.filter((d) => d.verdict === 'balanced').length
    const curve = curveComment(scored)
    return { scored, slow, fast, ok, total: scored.length, real: real.length, curve }
  }, [text, mode])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current != null) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (aliveRef.current) setNote('') }, 2200)
  }

  // ── 결과 텍스트(복사·프로젝트·수집함 공용) ──
  const buildReport = (): string => {
    if (!result) return ''
    const lines: string[] = []
    lines.push('[페이싱 처방]')
    lines.push(`장면 ${result.total}개 (진단 ${result.real}개) · 늘어짐 ${result.slow} · 적정 ${result.ok} · 휙 지나감 ${result.fast}`)
    if (result.curve) lines.push(`완급 진단: ${result.curve}`)
    lines.push('')
    result.scored.forEach((d) => {
      const vm = VERDICT_META[d.verdict]
      lines.push(`― 장면 ${d.idx + 1} · ${vm.label} (속도점수 ${d.score >= 0 ? '+' : ''}${d.score})`)
      lines.push(`  "${d.preview}"`)
      if (d.verdict !== 'tiny') {
        lines.push(`  신호: 문장 ${d.sentences}개/평균 ${d.avgSent.toFixed(0)}자 · 대사 ${d.dialoguePct.toFixed(0)}% · 사건밀도 ${d.eventDensity.toFixed(1)} · 묘사밀도 ${d.staticDensity.toFixed(1)} (/100자)`)
      }
      d.rx.forEach((r) => lines.push(`  ${r}`))
      lines.push('')
    })
    return lines.join('\n').trim()
  }

  const copy = async () => {
    const report = buildReport()
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
      if (!aliveRef.current) return
      setCopied('✓ 복사됨')
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (aliveRef.current) setCopied('') }, 1500)
    } catch {
      if (aliveRef.current) setCopied('')
    }
  }

  // HTML 이스케이프
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    if (!result) return
    const parts: string[] = []
    parts.push(`<p><strong>페이싱 처방</strong> — 장면 ${result.total}개 (늘어짐 ${result.slow} · 적정 ${result.ok} · 휙 지나감 ${result.fast})</p>`)
    if (result.curve) parts.push(`<p>${esc(result.curve)}</p>`)
    result.scored.forEach((d) => {
      const vm = VERDICT_META[d.verdict]
      parts.push(`<p><strong>장면 ${d.idx + 1} · ${esc(vm.label)} (${d.score >= 0 ? '+' : ''}${d.score})</strong><br>${esc(d.preview)}</p>`)
      if (d.verdict !== 'tiny') {
        parts.push(`<p>신호: 평균 문장 ${d.avgSent.toFixed(0)}자 · 대사 ${d.dialoguePct.toFixed(0)}% · 사건밀도 ${d.eventDensity.toFixed(1)} · 묘사밀도 ${d.staticDensity.toFixed(1)}</p>`)
      }
      parts.push(`<ul>${d.rx.map((r) => `<li>${esc(r.replace(/^▸\s*/, ''))}</li>`).join('')}</ul>`)
    })
    const id = addToProject({
      kind: 'text', root: 'research', folder: '퇴고',
      title: `페이싱 처방 (늘어짐 ${result.slow}·빠름 ${result.fast})`,
      bodyHtml: parts.join('\n'),
      meta: { 장면수: String(result.total), 늘어짐: String(result.slow), 적정: String(result.ok), 휙지나감: String(result.fast) },
    })
    flash(id ? "프로젝트 '퇴고' 폴더에 처방을 추가했어요" : '프로젝트에 연결되지 않았습니다')
  }

  const toStash = () => {
    const report = buildReport()
    if (!report) return
    addToStash({ kind: 'note', label: `페이싱 처방 (장면 ${result?.total ?? 0}개)`, text: report })
    flash('수집함에 처방을 담았어요')
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 100, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }
  const statVal = (c: string): React.CSSProperties => ({ fontSize: 20, fontWeight: 700, color: c, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] })
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }
  const seg = (active: boolean): React.CSSProperties => ({
    border: '1px solid var(--border)', borderRadius: 8, padding: '5px 11px', cursor: 'pointer', fontSize: 12,
    background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--muted)', fontWeight: active ? 700 : 500,
  })

  const r = result

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}><Emoji e="🩺" /> 본문 또는 장면 메모를 붙여넣으세요</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="minibtn" onClick={() => setText(SAMPLE)} title="자작 예시 본문 채우기">예시</button>
          <button className="minibtn" onClick={() => { setText(''); setOpenIdx(0) }} disabled={!text}>↺ 지우기</button>
        </div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'장면 사이를 빈 줄로 구분하면 장면별로 진단합니다.\n별표(***)·구분선(―――)·"장면 1" 같은 표지도 경계로 인식합니다.'}
        spellCheck={false}
        aria-label="페이싱 처방 입력"
      />

      <div style={bar}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>분석 단위</span>
          <div style={seg(mode === 'auto')} onClick={() => setMode('auto')}>장면별(자동)</div>
          <div style={seg(mode === 'whole')} onClick={() => setMode('whole')}>전체 한 덩어리</div>
        </div>
        <button className="linkbtn" onClick={() => openToolLinked('scene-transitions')} title="장면 전환 점검 도구 열기">↔ 장면 전환 점검</button>
      </div>

      {!r ? (
        <div style={empty}>
          본문을 입력하면 장면마다<br />
          <b>늘어짐(느림)</b> · <b>휙 지나감(빠름)</b>을 신호로 진단하고<br />
          요약↔확장 · 장면 추가/삭제 처방을 제시합니다.
        </div>
      ) : (
        <div style={scroll}>
          {/* 요약 통계 */}
          <div style={grid4}>
            <div style={stat}><div style={statVal('var(--text)')}>{r.total}</div><div style={statLabel}>장면 수</div></div>
            <div style={stat}><div style={statVal('var(--accent)')}>{r.slow}</div><div style={statLabel}>늘어짐 <Emoji e="🐢" /></div></div>
            <div style={stat}><div style={statVal('var(--ok)')}>{r.ok}</div><div style={statLabel}>적정 <Emoji e="✅" /></div></div>
            <div style={stat}><div style={statVal('var(--warn)')}>{r.fast}</div><div style={statLabel}>휙 지나감 <Emoji e="⚡" /></div></div>
          </div>

          {/* 페이싱 곡선(장면별 속도 점수 막대) */}
          {r.real >= 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}><Emoji e="📈" /> 페이싱 곡선 (← 느림 · 빠름 →)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {r.scored.map((d) => {
                  const vm = VERDICT_META[d.verdict]
                  // -100~100 → 0~100% 위치. 가운데(50%)가 균형.
                  const center = 50
                  const half = Math.abs(d.score) / 2 // 0~50
                  const isFast = d.score >= 0
                  return (
                    <div key={d.idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={d.preview}>
                      <div style={{ width: 24, textAlign: 'right', fontSize: 11, color: 'var(--muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{d.idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0, height: 16, background: 'var(--chrome-2)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
                        {d.verdict !== 'tiny' && (
                          <div style={{
                            position: 'absolute', top: 2, bottom: 2,
                            left: isFast ? `${center}%` : `${center - half}%`,
                            width: `${half}%`,
                            background: vm.color, borderRadius: 3, opacity: 0.9,
                          }} />
                        )}
                      </div>
                      <div style={{ width: 70, fontSize: 11, fontWeight: 700, color: vm.color, flexShrink: 0, textAlign: 'right' }}><Emoji e={vm.emoji} /> {d.score >= 0 ? '+' : ''}{d.score}</div>
                    </div>
                  )
                })}
              </div>
              {r.curve && (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)' }}>
                  {r.curve}
                </div>
              )}
            </div>
          )}

          {/* 장면별 카드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionTitle}><Emoji e="🔍" /> 장면별 진단·처방 (눌러서 펼치기)</div>
            {r.scored.map((d) => {
              const vm = VERDICT_META[d.verdict]
              const isOpen = openIdx === d.idx
              return (
                <div key={d.idx} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderLeft: `3px solid ${vm.color}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div
                    onClick={() => setOpenIdx(isOpen ? null : d.idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', minWidth: 18 }}>{d.idx + 1}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: vm.color, whiteSpace: 'nowrap' }}><Emoji e={vm.emoji} /> {vm.label}</span>
                    {d.verdict !== 'tiny' && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{d.score >= 0 ? '+' : ''}{d.score}</span>}
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.preview}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 11px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {d.verdict !== 'tiny' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            ['문장', `${d.sentences}개`],
                            ['평균길이', `${d.avgSent.toFixed(0)}자`],
                            ['대사', `${d.dialoguePct.toFixed(0)}%`],
                            ['사건밀도', d.eventDensity.toFixed(1)],
                            ['묘사밀도', d.staticDensity.toFixed(1)],
                            ['분량', `${d.chars}자`],
                          ].map(([k, v]) => (
                            <span key={k} style={{ fontSize: 11, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px', color: 'var(--text)' }}>
                              <span style={{ color: 'var(--muted)' }}>{k} </span><b>{v}</b>
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>진단 신호</div>
                        {d.signals.map((s, i) => (
                          <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)' }}>· {s}</div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: vm.color }}>교정 처방</div>
                        {d.rx.map((s, i) => (
                          <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 9px' }}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={hint}>
            대화비율·문장길이·사건밀도(자작 신호어 사전 기반)로 속도를 근사 추정합니다. 의도된 완급(긴장은 빠르게, 휴지는 느리게)인지 직접 판단하세요.
          </div>

          {/* 액션 바 */}
          <div style={bar}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {hasStash() && <button className="linkbtn" onClick={toStash} title="처방을 플로팅 수집함에 담기"><Emoji e="📎" /> 수집함</button>}
              <button
                className="linkbtn"
                onClick={toProject}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? "처방을 프로젝트 '퇴고' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}
              ><Emoji e="📄" /> 프로젝트에 추가</button>
              {note && <span style={{ fontSize: 11.5, color: 'var(--ok)' }}>{note}</span>}
            </div>
            <button className="btn-primary" onClick={copy}>{copied || <><Emoji e="📋" /> 결과 복사</>}</button>
          </div>
        </div>
      )}
    </div>
  )
}
