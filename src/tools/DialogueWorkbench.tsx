// 대사 워크벤치 — 대사 한 줄/덩어리를 붙여넣고, 다섯 가지 다듬기 기법(서브텍스트·끊기·행동 비트·
// 군더더기 제거·말투 차별화)을 체크리스트로 켜면 줄마다 진단(원문의 약점 탐지) → 다듬기 가이드 →
// 자동 변형 예시(여러 갈래)를 만들어 준다. 결과 복사·프로젝트 추가, 좌측 파일 드롭 수용.
// 자급식: react 와 './linkbus' 외 import 없음. 100% 로컬(정규식·휴리스틱 — 외부 네트워크/키 불필요).
// 언마운트 시 복사 타이머·document 리스너 정리.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  Emoji,
  type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'dialogue-workbench',
  name: '대사 워크벤치',
  icon: '💬',
  group: '교정·언어',
  intro: '대사를 붙여넣고 서브텍스트·끊기·행동 비트·군더더기 제거·말투 차별화 기법으로 줄마다 다듬기 가이드와 변형 예시를 만듭니다',
  w: 920,
  h: 680,
}

// ──────────────────────────────────────────────────────────────
// 기법 정의
// ──────────────────────────────────────────────────────────────
type TechId = 'subtext' | 'cut' | 'beat' | 'trim' | 'voice'
interface Tech {
  id: TechId
  name: string
  icon: string
  color: string
  desc: string         // 한 줄 설명
  how: string[]        // 적용 방법(가이드)
}
const TECHS: Tech[] = [
  {
    id: 'subtext',
    name: '서브텍스트',
    icon: '🫥',
    color: 'var(--accent)',
    desc: '속마음을 직접 말하지 않게 — 감정·정보를 행간에 숨기기',
    how: [
      '감정 단어("화났어/슬퍼/좋아해")를 직접 말하지 말고 상황·디테일로 드러내라.',
      '질문에 동문서답하거나 화제를 돌려 말 못 할 속내를 암시하라.',
      '겉으로는 사소한 말(날씨·물건)을 하되 진짜 주제는 따로 깔아 두어라.',
    ],
  },
  {
    id: 'cut',
    name: '끊기',
    icon: '✂️',
    color: 'var(--warn)',
    desc: '말 끊김·말줄임·중단 — 실제 대화의 리듬과 긴장 살리기',
    how: [
      '긴 설명조 대사는 도중에 끊어(—) 상대가 끼어들게 하거나 말줄임(…)으로 흐리게 하라.',
      '완결된 문장만 늘어놓지 말고, 미완성·짧은 토막을 섞어 호흡을 만들라.',
      '감정이 격할수록 문장을 더 짧게, 망설일수록 말줄임을 써라.',
    ],
  },
  {
    id: 'beat',
    name: '행동 비트',
    icon: '🎬',
    color: 'var(--ok)',
    desc: '대사 사이 행동·동작 삽입 — "말했다" 대신 보여주기',
    how: [
      '"라고 화내며 말했다" 같은 부사+발화동사 대신, 대사 앞뒤에 행동 한 줄을 끼워라.',
      '행동 비트는 감정을 드러내고(주먹을 쥐었다), 화자를 표시하며, 호흡을 준다.',
      '대사마다 비트를 달지 말고 전환·강조가 필요한 순간에만 넣어라.',
    ],
  },
  {
    id: 'trim',
    name: '군더더기 제거',
    icon: '🧹',
    color: 'var(--muted)',
    desc: '간투사·완충어·중복 호칭 덜기 — 또렷하고 빠른 대사',
    how: [
      '"음·어·그·뭔가·그냥·사실·정말" 같은 입버릇은 강조가 아니면 지워라.',
      '"~인 것 같아·~라고 생각해" 같은 완충 표현은 단정형으로 바꿔 힘을 실어라.',
      '한 대사 안 반복되는 이름·호칭(야, ○○야 …)과 군말을 덜어라.',
    ],
  },
  {
    id: 'voice',
    name: '말투 차별화',
    icon: '🗣️',
    color: 'var(--accent)',
    desc: '인물별 어미·어휘·길이 차이 — 누가 말하는지 구분되게',
    how: [
      '인물마다 종결어미를 정하라(딱딱한 ~다 / 부드러운 ~요 / 거친 반말 ~냐).',
      '어휘 수준·외래어·사투리·말 길이로 출신·성격·세대를 구분하라.',
      '버릇말(자주 쓰는 한두 마디)을 인물별로 하나씩 정해 일관되게 써라.',
    ],
  },
]
const TECH_MAP: Record<TechId, Tech> = Object.fromEntries(TECHS.map((t) => [t.id, t])) as Record<TechId, Tech>

// ──────────────────────────────────────────────────────────────
// 사전(로컬 휴리스틱)
// ──────────────────────────────────────────────────────────────
// 직접 감정 진술(서브텍스트로 바꿀 후보)
const EMOTION_WORDS = ['화났', '화가 나', '슬퍼', '슬프', '기뻐', '기쁘', '행복해', '행복하', '무서워', '무섭', '두려워', '두렵', '외로워', '외롭', '좋아해', '사랑해', '싫어', '미워', '미안해', '고마워', '걱정돼', '걱정이', '불안해', '짜증나', '짜증이', '서운해', '서럽', '괴로워', '괴롭', 'answer']
// 군더더기(간투사/완충/강조)
const FILLERS = ['음', '어', '그', '뭐', '뭔가', '저기', '이제', '막', '좀', '그냥', '딱', '되게', '정말', '진짜', '너무', '매우', '아주', '굉장히', '엄청', '완전', '사실', '솔직히', '약간', '조금', '다소', '아마', '아마도', '왠지', '어쩌면', '일단']
// 완충 종결(단정으로 바꿀 후보)
const HEDGES = ['것 같아', '것 같다', '인 것 같', '라고 생각해', '라고 생각한다', '라고 봐', '인 듯', '듯해', '듯싶', '지 않을까']
// 발화동사 + 흔한 부사 태그(행동 비트로 대체 후보)
const SPEECH_TAGS = ['라고 말했다', '라고 했다', '하고 말했다', '라고 외쳤다', '라고 소리쳤다', '라고 중얼거렸다', '라고 속삭였다', '라며 말했다', '하며 말했다', '라고 답했다', '라고 물었다']
const ADV_TAGS = ['화내며', '웃으며', '울며', '한숨 쉬며', '슬프게', '기쁘게', '차갑게', '다정하게', '짜증내며', '망설이며']

// 행동 비트 보기(감정→동작) — 자작 텍스트만
const BEAT_BANK: { mood: string; beats: string[] }[] = [
  { mood: '분노', beats: ['주먹을 꽉 쥐었다.', '탁자를 내리쳤다.', '눈을 부릅떴다.', '말끝을 씹어 삼켰다.'] },
  { mood: '슬픔', beats: ['시선을 바닥으로 떨궜다.', '입술을 깨물었다.', '손끝이 떨렸다.', '한참을 가만히 있었다.'] },
  { mood: '기쁨', beats: ['눈이 휘어졌다.', '두 손을 맞잡았다.', '발끝을 들썩였다.', '입꼬리를 감추지 못했다.'] },
  { mood: '불안', beats: ['손톱을 만지작거렸다.', '문 쪽을 흘끔거렸다.', '말을 고르듯 침을 삼켰다.', '의자 끝에 걸터앉았다.'] },
  { mood: '냉담', beats: ['서류에서 눈을 떼지 않았다.', '어깨를 으쓱했다.', '천천히 등을 돌렸다.', '커피를 한 모금 마셨다.'] },
]
// 서브텍스트 우회 보기(직접→간접)
const SUBTEXT_HINTS = [
  '감정 단어를 빼고, 그 감정이 새어 나오는 사소한 행동·사물로 바꿔 보세요.',
  '하고 싶은 말을 끝까지 하지 말고, 화제를 슬쩍 돌려 못다 한 속내를 남기세요.',
  '"괜찮아" 같은 반대말로 진심을 가려, 독자가 행간을 읽게 하세요.',
]

// ──────────────────────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────────────────────
function esc(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// 따옴표 안 대사만 살짝 벗기기(분석은 안의 텍스트로)
function stripQuotes(s: string): string {
  return s.replace(/^[\s"“”'‘’]+/, '').replace(/[\s"“”'‘’]+$/, '')
}

// 한 줄(대사) 진단 결과
interface Finding { tech: TechId; label: string; hits: string[] }
interface LineDiag {
  raw: string
  speaker: string | null   // "철수: ..." 형태에서 추출
  text: string             // 따옴표/화자 제거된 본문
  findings: Finding[]
  variants: { tech: TechId; title: string; out: string }[]
  endings: string[]        // 추출된 종결 어미(말투 차별화용)
}

// 화자 추출: "이름: 대사" 또는 "이름) 대사"
function splitSpeaker(line: string): { speaker: string | null; rest: string } {
  const m = line.match(/^\s*([^\s:：)）]{1,12})\s*[:：)）]\s*(.+)$/)
  if (m && m[1].length <= 12 && !/[.?!…]/.test(m[1])) return { speaker: m[1].trim(), rest: m[2] }
  return { speaker: null, rest: line }
}

function findHits(text: string, words: string[]): string[] {
  const hits: string[] = []
  for (const w of words) {
    const re = new RegExp(esc(w), 'g')
    if (re.test(text)) hits.push(w)
  }
  return [...new Set(hits)]
}

// 종결 어미 추출(말투 차별화)
function endingOf(text: string): string {
  const t = text.replace(/["“”'‘’.!?…\s]+$/, '')
  const m = t.match(/([가-힣]{1,3})$/)
  return m ? m[1] : ''
}

// ── 변형(자동 다듬기) 생성기 ──────────────────────────────────
// 군더더기 제거
function applyTrim(text: string): string {
  let out = text
  // 완충 종결 → 단정
  for (const h of HEDGES) {
    out = out.replace(new RegExp(esc(h) + '[다요.]*$', ''), '')
  }
  // 앞머리 간투사 제거(쉼표/공백 동반)
  out = out.replace(/^\s*(?:음|어|그|뭐|저기|이제|막|좀|그냥|딱|사실|솔직히|일단|왠지)[,，]?\s+/i, '')
  // 강조부사 1차 제거(중복 강조만)
  out = out.replace(/(정말|진짜|너무|되게|굉장히|엄청|완전|아주|매우)\s+(?=정말|진짜|너무|되게|굉장히|엄청|완전|아주|매우)/g, '')
  // 산재 간투사 제거
  out = out.replace(/(?:^|[\s,，])(?:뭔가|그냥|약간|조금|아마도?|어쩌면)(?=[\s,，]|$)/g, ' ')
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.?!…,，])/g, '$1').trim()
  if (!out) out = text.trim()
  // 끝 마침 보정
  if (!/[.?!…」"”』]$/.test(out)) out += '.'
  return out
}
// 끊기: 긴 문장 중간에 — 또는 … 삽입
function applyCut(text: string): string {
  const t = stripQuotes(text)
  // 접속/완충 지점 끊기
  const cutWords = ['그래서', '그런데', '하지만', '그리고', '근데', '왜냐하면', '그러니까']
  for (const c of cutWords) {
    const idx = t.indexOf(c)
    if (idx > 4) {
      return `"${t.slice(0, idx).trim()}— ${t.slice(idx).trim()}"`
    }
  }
  // 어절이 충분히 길면 중간을 말줄임으로
  const words = t.split(/\s+/)
  if (words.length >= 6) {
    const mid = Math.floor(words.length / 2)
    return `"${words.slice(0, mid).join(' ')}… ${words.slice(mid).join(' ')}"`
  }
  // 짧으면 말끝을 흐림
  return `"${t.replace(/[.!?]$/, '')}…"`
}
// 행동 비트: 감정 추정 후 비트 한 줄 + 대사
function guessMood(text: string): string {
  if (/화|짜증|성|분노|미워|싫/.test(text)) return '분노'
  if (/슬프|슬퍼|눈물|울|외로|서운|미안|괴로/.test(text)) return '슬픔'
  if (/기뻐|기쁘|행복|좋아|고마|신나|반가/.test(text)) return '기쁨'
  if (/무서|두려|걱정|불안|떨|초조/.test(text)) return '불안'
  return '냉담'
}
function applyBeat(text: string, salt: number): string {
  const t = stripQuotes(text)
  const mood = guessMood(t)
  const bank = BEAT_BANK.find((b) => b.mood === mood) || BEAT_BANK[BEAT_BANK.length - 1]
  const beat = bank.beats[salt % bank.beats.length]
  return `${beat}\n"${t}"`
}
// 서브텍스트: 직접 감정어를 우회 제안으로 치환(예시형)
function applySubtext(text: string, salt: number): string {
  const t = stripQuotes(text)
  const hit = EMOTION_WORDS.find((w) => t.includes(w) && w !== 'answer')
  if (hit) {
    const mood = guessMood(t)
    const bank = BEAT_BANK.find((b) => b.mood === mood) || BEAT_BANK[0]
    const beat = bank.beats[(salt + 1) % bank.beats.length]
    // 감정 직접 진술을 빼고, 우회로 대치
    const indirect = `"…아니야, 별거 아니야." ${beat}`
    return indirect
  }
  // 감정어가 없으면 화제 돌리기 보기
  return `"그건 그렇고, ${t.split(/\s+/).slice(-2).join(' ').replace(/["“”]/g, '')}… 됐어, 다음에 얘기하자."`
}

function diagnoseLine(raw: string, salt: number, active: Record<TechId, boolean>): LineDiag {
  const { speaker, rest } = splitSpeaker(raw)
  const text = stripQuotes(rest)
  const findings: Finding[] = []

  // 서브텍스트: 직접 감정 진술 탐지
  const emo = findHits(text, EMOTION_WORDS).filter((w) => w !== 'answer')
  if (emo.length) findings.push({ tech: 'subtext', label: '직접 감정 진술', hits: emo })

  // 끊기: 너무 매끈하게 완결됐는지(긴 문장·접속어 다수)
  const wc = text.split(/\s+/).filter(Boolean).length
  const conj = findHits(text, ['그래서', '그런데', '하지만', '그리고', '근데', '왜냐하면', '그러니까'])
  if (wc >= 8 || conj.length >= 2) findings.push({ tech: 'cut', label: '끊김 없는 긴 대사', hits: [`${wc}어절`, ...conj] })

  // 행동 비트: 발화동사 태그/부사+말했다
  const tags = findHits(raw, [...SPEECH_TAGS, ...ADV_TAGS])
  if (tags.length) findings.push({ tech: 'beat', label: '말했다式 태그', hits: tags })

  // 군더더기
  const fil = findHits(text, FILLERS)
  const hed = findHits(text, HEDGES)
  if (fil.length + hed.length) findings.push({ tech: 'trim', label: '간투사·완충어', hits: [...fil, ...hed] })

  // 변형 생성(켜진 기법만)
  const variants: LineDiag['variants'] = []
  if (active.trim) variants.push({ tech: 'trim', title: '군더더기 제거', out: `"${applyTrim(text)}"` })
  if (active.cut) variants.push({ tech: 'cut', title: '끊기', out: applyCut(rest) })
  if (active.beat) variants.push({ tech: 'beat', title: '행동 비트', out: applyBeat(rest, salt) })
  if (active.subtext) variants.push({ tech: 'subtext', title: '서브텍스트', out: applySubtext(rest, salt) })

  return { raw, speaker, text, findings, variants, endings: [endingOf(text)].filter(Boolean) }
}

const SAMPLE = `철수: 음, 그러니까 사실 나는 정말 너무 화났어. 그런데 너는 항상 그냥 네 생각만 하잖아, 라고 화내며 말했다.
영희: 아니야, 나도 사실 진짜 슬퍼. 그냥 우리가 이렇게 된 게 좀 외로워서 그런 것 같아.
철수: 그래서 어쩌라고? 다 끝났잖아. 이제 와서 뭔가 말해 봤자 소용없을 것 같은데.`

// ──────────────────────────────────────────────────────────────
// 컴포넌트
// ──────────────────────────────────────────────────────────────
const LS_KEY = 'sry:tool:dialogue-workbench'
interface Persist { text: string; active: Record<TechId, boolean> }
const DEFAULT_ACTIVE: Record<TechId, boolean> = { subtext: true, cut: true, beat: true, trim: true, voice: true }

function loadPersist(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>
      return { text: typeof p.text === 'string' ? p.text : '', active: { ...DEFAULT_ACTIVE, ...(p.active || {}) } }
    }
  } catch { /* noop */ }
  return { text: '', active: { ...DEFAULT_ACTIVE } }
}

export default function DialogueWorkbench({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Persist>(loadPersist())
  const [text, setText] = useState<string>(() => {
    const pl = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    return pl || init.current.text
  })
  const [active, setActive] = useState<Record<TechId, boolean>>(init.current.active)
  const [copied, setCopied] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const copyTimer = useRef<number | null>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  // 영속 저장(디바운스 없이 가벼움)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, active } as Persist)) } catch { /* 용량 초과 무시 */ }
  }, [text, active])

  // 복사/안내 토스트
  const flash = useCallback((msg: string) => {
    if (!mounted.current) return
    setCopied(msg)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
  }, [])

  const toggle = (id: TechId) => setActive((a) => ({ ...a, [id]: !a[id] }))

  // 줄 분리 → 진단
  const lines = useMemo<LineDiag[]>(() => {
    const arr = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    return arr.map((l, i) => diagnoseLine(l, i, active))
  }, [text, active])

  // 말투 차별화: 화자별 종결어미 모음
  const voiceMap = useMemo(() => {
    const m: Record<string, { endings: Record<string, number>; count: number; sampleLens: number[] }> = {}
    for (const ln of lines) {
      const sp = ln.speaker || '(미상)'
      if (!m[sp]) m[sp] = { endings: {}, count: 0, sampleLens: [] }
      m[sp].count++
      m[sp].sampleLens.push(ln.text.split(/\s+/).filter(Boolean).length)
      for (const e of ln.endings) m[sp].endings[e] = (m[sp].endings[e] || 0) + 1
    }
    return m
  }, [lines])

  // 말투 차별화 진단: 화자가 둘 이상인데 종결어미가 겹치면 경고
  const voiceWarn = useMemo(() => {
    if (!active.voice) return null
    const speakers = Object.keys(voiceMap).filter((s) => s !== '(미상)')
    if (speakers.length < 2) return null
    const topEnding = (s: string) => {
      const en = voiceMap[s].endings
      const k = Object.keys(en).sort((a, b) => en[b] - en[a])[0]
      return k || ''
    }
    const tops = speakers.map((s) => ({ s, e: topEnding(s), avg: voiceMap[s].sampleLens.reduce((a, b) => a + b, 0) / (voiceMap[s].sampleLens.length || 1) }))
    const sameEnding = tops.length >= 2 && new Set(tops.map((t) => t.e)).size < tops.length && tops.every((t) => t.e)
    return { tops, sameEnding }
  }, [active.voice, voiceMap])

  // 통계
  const stat = useMemo(() => {
    const total = lines.length
    const issueCount = lines.reduce((a, l) => a + l.findings.length, 0)
    const techCount: Record<TechId, number> = { subtext: 0, cut: 0, beat: 0, trim: 0, voice: 0 }
    for (const l of lines) for (const f of l.findings) techCount[f.tech]++
    return { total, issueCount, techCount }
  }, [lines])

  // 변형 가짓수 표시(켜진 기법 × 줄 수)
  const combos = useMemo(() => {
    const on = (Object.keys(active) as TechId[]).filter((k) => active[k] && k !== 'voice').length
    return on * lines.length
  }, [active, lines.length])

  // ── 결과 텍스트(복사/내보내기) ──
  const buildResult = useCallback((): string => {
    const out: string[] = []
    out.push('[대사 워크벤치 — 다듬기 가이드]')
    out.push(`대사 ${stat.total}줄 · 진단 ${stat.issueCount}건 · 적용 기법 ${(Object.keys(active) as TechId[]).filter((k) => active[k]).map((k) => TECH_MAP[k].name).join('·') || '없음'}`)
    out.push('')
    lines.forEach((ln, i) => {
      out.push(`${i + 1}. ${ln.speaker ? ln.speaker + ': ' : ''}${ln.text}`)
      if (ln.findings.length) {
        for (const f of ln.findings) out.push(`   · 진단[${TECH_MAP[f.tech].name}] ${f.label}: ${f.hits.join(', ')}`)
      }
      for (const v of ln.variants) out.push(`   ▸ ${v.title}: ${v.out.replace(/\n/g, ' / ')}`)
      out.push('')
    })
    if (voiceWarn && voiceWarn.sameEnding) {
      out.push('[말투 차별화] 화자들의 종결어미가 겹칩니다. 인물별 어미·어휘·길이를 달리하세요.')
    }
    return out.join('\n').trim()
  }, [lines, stat, active, voiceWarn])

  const resultHtml = useCallback((): string => {
    const parts: string[] = []
    parts.push('<h3>대사 워크벤치 — 다듬기 가이드</h3>')
    parts.push(`<p><i>대사 ${stat.total}줄 · 진단 ${stat.issueCount}건 · 적용: ${escHtml((Object.keys(active) as TechId[]).filter((k) => active[k]).map((k) => TECH_MAP[k].name).join('·') || '없음')}</i></p>`)
    lines.forEach((ln, i) => {
      parts.push(`<p><b>${i + 1}. ${ln.speaker ? escHtml(ln.speaker) + ': ' : ''}</b>${escHtml(ln.text)}</p>`)
      if (ln.findings.length) {
        parts.push('<ul>')
        for (const f of ln.findings) parts.push(`<li>진단[${escHtml(TECH_MAP[f.tech].name)}] ${escHtml(f.label)}: ${escHtml(f.hits.join(', '))}</li>`)
        parts.push('</ul>')
      }
      for (const v of ln.variants) parts.push(`<blockquote><b>${escHtml(v.title)}</b><br>${escHtml(v.out).replace(/\n/g, '<br>')}</blockquote>`)
    })
    return parts.join('\n')
  }, [lines, stat, active])

  const doCopy = async () => {
    const r = buildResult()
    if (!r) { flash('복사할 내용이 없어요'); return }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(r)
      else {
        const ta = document.createElement('textarea')
        ta.value = r; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('가이드 복사됨 ✓')
    } catch { flash('복사 실패') }
  }

  const copyOne = async (str: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(str)
      else {
        const ta = document.createElement('textarea')
        ta.value = str; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('복사됨 ✓')
    } catch { flash('복사 실패') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되지 않았습니다'); return }
    if (!lines.length) { flash('먼저 대사를 입력하세요'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '대사',
      title: `대사 다듬기 — ${lines[0].text.slice(0, 14) || '무제'}`,
      bodyHtml: resultHtml(),
      synopsis: `대사 ${stat.total}줄 · 진단 ${stat.issueCount}건`,
      meta: { 대사줄: String(stat.total), 진단: String(stat.issueCount) },
    })
    flash(id ? '프로젝트 자료에 추가됨' : '프로젝트 추가 실패')
  }

  const toStash = () => {
    if (!hasStash()) { flash('수집함에 연결되지 않았습니다'); return }
    const r = buildResult()
    if (!r) { flash('담을 내용이 없어요'); return }
    addToStash({ kind: 'note', label: '대사 다듬기 가이드', text: r })
    flash('수집함에 담음 ✓')
  }

  const saveSnapshot = () => {
    if (!text.trim()) { flash('저장할 대사가 없어요'); return }
    try {
      const key = LS_KEY + ':snapshots'
      const raw = localStorage.getItem(key)
      const list: { t: number; text: string }[] = raw ? JSON.parse(raw) : []
      list.unshift({ t: Date.now(), text })
      localStorage.setItem(key, JSON.stringify(list.slice(0, 20)))
      setSavedNote('스냅샷 저장됨')
      flash('스냅샷 저장됨 ✓')
    } catch { flash('저장 실패') }
  }

  // ── 좌측 파일 드롭 수용 ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (item && (item.text || '').trim()) {
      // 끌어온 문서에서 따옴표 대사만 추출, 없으면 전체 줄
      const body = item.text || ''
      const quoted = body.match(/["“][^"”\n]{1,200}["”]/g)
      const ins = quoted && quoted.length ? quoted.join('\n') : body.split(/\n+/).slice(0, 40).join('\n')
      setText((prev) => (prev.trim() ? prev + '\n' + ins : ins))
      flash(`"${item.title}"에서 대사 가져옴`)
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ──────────────────────────────────────────────────────────────
  // 스타일
  // ──────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const titleTxt: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const left: React.CSSProperties = { width: 360, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12, gap: 10, boxSizing: 'border-box' }
  const right: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const ta: React.CSSProperties = {
    flex: 1, minHeight: 120, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10,
    padding: '11px 13px', fontSize: 14.5, lineHeight: 1.65, outline: 'none', fontFamily: 'inherit',
  }
  const techRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const btnRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.7, padding: 24 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })

  const techCheck = (t: Tech) => {
    const on = active[t.id]
    return (
      <label
        key={t.id}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
          background: on ? 'var(--panel)' : 'var(--chrome-2)',
          border: `1px solid ${on ? t.color : 'var(--border)'}`,
          borderLeft: `3px solid ${on ? t.color : 'var(--border)'}`,
          borderRadius: 9, padding: '8px 10px', userSelect: 'none',
        }}
      >
        <input type="checkbox" checked={on} onChange={() => toggle(t.id)} style={{ marginTop: 2, accentColor: t.color, cursor: 'pointer' }} aria-label={t.name} />
        <span style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? 'var(--text)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span><Emoji e={t.icon} /></span>{t.name}
            {stat.techCount[t.id] > 0 && <span style={{ ...tag(t.color), fontSize: 10 }}>{stat.techCount[t.id]}</span>}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45, display: 'block', marginTop: 2 }}>{t.desc}</span>
        </span>
      </label>
    )
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <div style={titleTxt}><Emoji e="💬" /> 대사를 붙여넣고 기법을 켜면 줄마다 진단·다듬기·변형을 만듭니다 (100% 로컬)</div>
        <span style={{ flex: 1 }} />
        {combos > 0 && <span style={{ ...tag('var(--accent)') }}>변형 {combos}가지</span>}
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>{copied}</span>}
      </div>

      <div style={body}>
        {/* 좌: 입력 + 기법 체크리스트 */}
        <div style={left} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
          <div style={sectionTitle}>대사 입력 <span style={{ fontWeight: 400, fontSize: 10 }}>(줄마다 한 대사 · "이름: 대사" 형식 권장)</span></div>
          <textarea
            style={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'대사를 줄 단위로 붙여넣으세요.\n예) 철수: 음, 사실 나 정말 화났어.\n\n좌측 파일을 여기로 끌어다 놓으면 대사를 가져옵니다.'}
            spellCheck={false}
            aria-label="대사 입력"
          />
          {dragOver && <div style={{ ...hint, color: 'var(--accent)' }}>↓ 파일을 놓으면 대사를 추출해 가져옵니다</div>}

          <div style={btnRow}>
            <button className="minibtn" type="button" onClick={() => setText(SAMPLE)}>예시</button>
            <button className="minibtn" type="button" onClick={() => setText('')} disabled={!text}>지우기</button>
            <button className="minibtn" type="button" onClick={saveSnapshot} disabled={!text.trim()}>스냅샷 저장</button>
          </div>

          <div style={{ ...sectionTitle, marginTop: 4 }}>다듬기 기법 (체크리스트)</div>
          <div style={techRow}>
            {TECHS.map(techCheck)}
          </div>

          <div style={hint}>체크한 기법만 진단·변형에 반영됩니다. "말투 차별화"는 화자별 어미를 비교해 줍니다.</div>
        </div>

        {/* 우: 진단·가이드·변형 */}
        <div style={right}>
          {lines.length === 0 ? (
            <div style={empty}>
              <div style={{ fontSize: 34 }}><Emoji e="💬" /></div>
              <div>대사를 입력하면 줄마다 약점을 진단하고<br />서브텍스트·끊기·행동 비트·군더더기 제거·말투 차별화<br />다섯 기법으로 다듬기 가이드와 변형 예시를 만듭니다.</div>
              <div style={hint}>왼쪽 [예시] 버튼으로 바로 체험해 보세요.</div>
            </div>
          ) : (
            <>
              {/* 요약 + 액션 */}
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13 }}>대사 <b style={{ color: 'var(--accent)' }}>{stat.total}</b>줄</span>
                  <span style={{ fontSize: 13 }}>진단 <b style={{ color: 'var(--warn)' }}>{stat.issueCount}</b>건</span>
                  <span style={{ fontSize: 13 }}>화자 <b>{Object.keys(voiceMap).filter((s) => s !== '(미상)').length || '—'}</b></span>
                </div>
                <span style={{ flex: 1 }} />
                <div style={btnRow}>
                  <button className="minibtn" type="button" onClick={doCopy}>가이드 복사</button>
                  {hasStash() && <button className="minibtn" type="button" onClick={toStash}>수집함</button>}
                  <button className="btn-primary" type="button" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
                </div>
              </div>

              {/* 말투 차별화 경고/요약 */}
              {active.voice && Object.keys(voiceMap).filter((s) => s !== '(미상)').length >= 2 && (
                <div style={{ ...card, borderLeft: `3px solid ${voiceWarn?.sameEnding ? 'var(--warn)' : 'var(--ok)'}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: voiceWarn?.sameEnding ? 'var(--warn)' : 'var(--ok)', marginBottom: 6 }}>
                    <Emoji e="🗣️" /> 말투 차별화 {voiceWarn?.sameEnding ? '— 어미가 겹쳐요' : '— 화자별 어미 비교'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {voiceWarn?.tops.map((t) => (
                      <div key={t.s} style={{ fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <b style={{ color: 'var(--accent)', minWidth: 60 }}>{t.s}</b>
                        <span style={{ color: 'var(--muted)' }}>주 종결 “…{t.e || '?'}” · 평균 {t.avg.toFixed(1)}어절</span>
                      </div>
                    ))}
                  </div>
                  {voiceWarn?.sameEnding && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                      {TECH_MAP.voice.how[0]}
                    </div>
                  )}
                </div>
              )}

              {/* 줄별 카드 */}
              {lines.map((ln, i) => (
                <div key={i} style={card}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</span>
                    {ln.speaker && <span style={tag('var(--accent)')}>{ln.speaker}</span>}
                    <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>{ln.text}</span>
                  </div>

                  {/* 진단 */}
                  {ln.findings.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {ln.findings.map((f, fi) => (
                        <span key={fi} style={{ fontSize: 11.5, background: 'var(--chrome-2)', border: `1px solid ${TECH_MAP[f.tech].color}`, borderRadius: 7, padding: '3px 8px' }}>
                          <b style={{ color: TECH_MAP[f.tech].color }}><Emoji e={TECH_MAP[f.tech].icon} /> {f.label}</b>
                          <span style={{ color: 'var(--muted)', marginLeft: 5 }}>{f.hits.slice(0, 6).join(', ')}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--ok)', marginBottom: 8 }}>✓ 켜진 기법 기준 두드러진 약점이 없습니다</div>
                  )}

                  {/* 변형 */}
                  {ln.variants.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ln.variants.map((v, vi) => (
                        <div key={vi} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
                          <span style={{ ...tag(TECH_MAP[v.tech].color), fontSize: 10, flexShrink: 0, marginTop: 1 }}><Emoji e={TECH_MAP[v.tech].icon} /> {v.title}</span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', whiteSpace: 'pre-wrap', flex: 1, minWidth: 0 }}>{v.out}</span>
                          <button className="minibtn" type="button" style={{ flexShrink: 0, padding: '2px 8px', fontSize: 11 }} onClick={() => copyOne(v.out)}>복사</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 기법별 적용 가이드(켜진 것) */}
              <div style={{ ...card }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}><Emoji e="📘" /> 적용 가이드 (켜진 기법)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TECHS.filter((t) => active[t.id]).map((t) => (
                    <div key={t.id}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.color, marginBottom: 3 }}><Emoji e={t.icon} /> {t.name}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {t.how.map((h, hi) => <li key={hi} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{h}</li>)}
                      </ul>
                    </div>
                  ))}
                  {TECHS.filter((t) => active[t.id]).length === 0 && (
                    <div style={hint}>왼쪽에서 기법을 하나 이상 켜면 적용 가이드가 표시됩니다.</div>
                  )}
                  {active.subtext && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5 }}>
                      {SUBTEXT_HINTS[lines.length % SUBTEXT_HINTS.length]}
                    </div>
                  )}
                </div>
              </div>

              <div style={hint}>변형 예시는 형태소 분석 없이 만든 자동 초안입니다. 인물의 맥락에 맞게 골라 다듬어 쓰세요.{savedNote ? ` · ${savedNote}` : ''}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
