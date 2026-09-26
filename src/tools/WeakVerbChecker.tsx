// 약한 동사·막연한 표현 점검 — textarea 에 글을 붙여넣으면(또는 좌측 바인더 파일을 끌어다 놓으면)
//  ① 상태동사 남용(이다/있다/하다/되다 류 — 장면을 멈추는 '있음' 서술)
//  ② 막연한 정도부사(매우/정말/너무 등 — 강조를 말로만 하는 군더더기)
//  ③ 필터 동사(느꼈다/생각했다/보았다/들렸다 등 — 시점인물을 거쳐 독자를 한 겹 떼어놓는 거리두기)
// 를 100% 로컬 규칙으로 탐지해 위치·강조·빈도와 함께 '강한 동사·구체 묘사' 방향의 퇴고 제안을 보여준다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·미디어 불필요. 모든 검사는 브라우저에서 수행.
// 연계(linkbus): 좌측 바인더 파일 드롭 수용(getDragItem) · 점검 리포트를 프로젝트 자료에 추가 · 수집함에 담기.
import { useState, useEffect, useRef, useMemo } from 'react'
import { getDragItem, isItemDrag, addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'weak-verb-checker', name: '약한 동사·표현 점검', icon: '💪', group: '교정·언어', intro: '상태동사 남용·막연한 부사·필터 동사를 찾아 강한 동사·구체 묘사로 다듬도록 표시·제안합니다', w: 560, h: 640 }

// ── 분류 ────────────────────────────────────────────────────
// state : 상태동사(있음·이다·하다·되다 류) — 빨강. 장면을 멈추는 '서술'.
// vague : 막연한 정도·강조 부사 — 노랑(accent). 강조를 말로만 하는 군더더기.
// filter: 필터 동사(지각·사고 동사) — 보라/무덤덤. 시점인물을 거쳐 독자를 떼어놓는 거리두기.
type Kind = 'state' | 'vague' | 'filter'

interface Rule {
  id: string
  re: RegExp            // 전역(g) 정규식
  kind: Kind
  cat: string           // 세부 분류 라벨
  // 매치별 조언. m=전체매치, g=캡처그룹. label 은 표시용 텍스트.
  tip: string
}

// 안전한 RegExp 생성 헬퍼(항상 전역 플래그)
const R = (src: string, flags = 'g') => new RegExp(src, flags.includes('g') ? flags : flags + 'g')

// ── ① 상태동사(있음·서술 동사) ──────────────────────────────
// 한국어는 어절 경계가 약해 과탐이 나기 쉬우므로, 활용 종결형 위주로 보수적으로 잡는다.
const STATE_RULES: Rule[] = [
  // -이다 / -였다 / -이었다 (계사). '~것이다/~수 있다' 같은 보조구문 일부 포함.
  {
    id: 'st-ida', kind: 'state', cat: '계사(-이다)',
    // 계사(서술격 조사 '이다')만 — 바른 동사(떠났다/웃었다/달렸다 등)를 상태동사로 오탐하지 않도록
    // 맨 '다/었다' 대안을 제거하고 실제 계사 종결형으로 한정.
    re: R('(이다|이었다|입니다|이에요|예요|에요)(?=[\\s.,!?…"\'”’)\\]}]|$)'),
    tip: "'-이다'로 단정만 하기보다, 그 대상이 무엇을 '하는지' 동작으로 보여주면 장면이 살아납니다.",
  },
  // 있다/없다 류 종결(있었다/있는/없었다/있다) — 존재·상태 서술
  {
    id: 'st-itda', kind: 'state', cat: '존재(있다/없다)',
    re: R('(있|없)(다|었다|는|은|을|던|으며|고|어서|어|지만|는데)(?=[\\s.,!?…"\'”’)\\]}]|$)'),
    tip: "'~이 있었다/없었다'는 정적인 존재 서술입니다. 그 대상이 공간에서 어떻게 행동·작용하는지 능동 동사로 바꿔보세요.",
  },
  // -하다 류 종결(했다/한다/하는/하였다) — 가장 흔한 '맹물 동사'
  {
    id: 'st-hada', kind: 'state', cat: '하다(범용 동사)',
    re: R('([가-힣])하(다|였다|는|ㄴ다|였|고|면|여서|여|지만|는데|니까|기도)(?=[\\s.,!?…"\'”’)\\]}]|$)'),
    tip: "'-하다'는 의미가 옅은 범용 동사입니다. '운동을 하다→달리다', '말을 하다→속삭이다'처럼 구체적 동사로 압축해보세요.",
  },
  // -되다 류 종결(되었다/된다/되는) — 자동·피동 성격의 흐릿한 서술
  {
    id: 'st-doeda', kind: 'state', cat: '되다(자동·피동)',
    re: R('되(다|었다|ㄴ다|는|었|면|어서|어|지만|는데|니까)(?=[\\s.,!?…"\'”’)\\]}]|$)'),
    tip: "'-되다'는 행위 주체가 흐려진 자동·피동 서술입니다. 누가 무엇을 했는지 주어를 세워 능동 동사로 바꾸면 또렷합니다.",
  },
  // 가지다(가지고 있다/가진) — have 직역식 약한 동사
  {
    id: 'st-gajida', kind: 'state', cat: '가지다',
    re: R('가지(고\\s*있|ㄴ|는|었|던)'),
    tip: "'~을 가지고 있다'는 약한 서술입니다. '~이 있다' 또는 대상에 맞는 동사(품다·쥐다·지니다)로 바꿔보세요.",
  },
  // 만들다(추상 명사화) — '~을 하게 만들다' 식 사역 늘어짐
  {
    id: 'st-mandeulda', kind: 'state', cat: '만들다(사역)',
    re: R('게\\s*만들(다|었다|ㄴ다|어|었)'),
    tip: "'~게 만들다'는 늘어지는 사역 구문입니다. 직접 작용하는 능동 동사로 줄이면 힘이 생깁니다.",
  },
]

// ── ② 막연한 정도·강조 부사 ─────────────────────────────────
// 어절 경계로만 잡아 과탐을 줄인다(룩비하인드/룩어헤드 경계).
const VAGUE_WORDS = [
  '매우', '정말', '진짜', '참', '너무', '굉장히', '엄청', '엄청나게', '완전', '완전히',
  '아주', '되게', '몹시', '무척', '꽤', '제법', '상당히', '대단히',
  '그냥', '막', '좀', '조금', '약간', '다소', '거의',
  '되도록', '나름', '어느 정도', '약간씩', '조금씩',
]

// 정도부사별 맞춤 조언(없으면 기본)
const VAGUE_TIP: Record<string, string> = {
  '매우': "정도를 말로 하지 말고 장면·동작으로 보여주세요('매우 화났다'→'주먹을 부르르 떨었다').",
  '정말': "강조는 동사·명사 선택으로. '정말 슬펐다'보다 '목이 메었다'.",
  '진짜': "구어 강조어. 문어라면 빼거나 더 구체적인 묘사로.",
  '너무': "본래 '과함'을 뜻합니다. 긍정 강조엔 '무척/아주'가 자연스럽고, 대개는 빼는 편이 낫습니다.",
  '굉장히': "막연한 강조. 무엇이 어떻게 굉장한지 수치·비유·행동으로 구체화하세요.",
  '엄청': "구어 강조어. 크기를 수치·비유·동작으로 보여주세요.",
  '완전': "'완전 좋다'식 구어. 문어에서는 빼거나 '완전히/전적으로'.",
  '아주': "정도부사 남용 주의. 장면으로 정도를 드러내세요.",
  '그냥': "의미가 옅은 군더더기. 대개 빼면 문장이 또렷해집니다.",
  '좀': "완곡·습관 표현. 정말 필요한지 확인하고 자주 빼세요.",
  '조금': "정도가 모호합니다. 얼마나인지 구체적으로 쓰면 더 또렷합니다.",
  '거의': "단정 회피어. 가능하면 사실대로 단정하세요.",
}
const DEFAULT_VAGUE_TIP = "막연한 정도·강조 부사입니다. 빼거나, 감정·상태를 행동·감각으로 '보여주는' 묘사로 바꿔보세요."

// ── ③ 필터 동사(지각·사고 동사) ─────────────────────────────
// '그녀는 추위를 느꼈다' → '추위가 살을 파고들었다'처럼 시점인물의 지각 동사를 걷어내면
// 독자가 직접 체험하게 된다(거리두기 제거). 활용 종결형 위주로 잡는다.
const FILTER_STEMS: { stem: string; label: string }[] = [
  { stem: '느끼', label: '느끼다' },
  { stem: '느꼈', label: '느끼다' },
  { stem: '생각하', label: '생각하다' },
  { stem: '생각했', label: '생각하다' },
  { stem: '보', label: '보다' },        // 보았다/보였다 류는 별도 처리
  { stem: '바라보', label: '바라보다' },
  { stem: '바라봤', label: '바라보다' },
  { stem: '쳐다보', label: '쳐다보다' },
  { stem: '들', label: '듣다' },        // 들었다/들렸다 류
  { stem: '듣', label: '듣다' },
  { stem: '깨닫', label: '깨닫다' },
  { stem: '깨달았', label: '깨닫다' },
  { stem: '알', label: '알다' },        // 알았다/알게 되었다
  { stem: '눈치채', label: '눈치채다' },
  { stem: '눈치챘', label: '눈치채다' },
  { stem: '여겨지', label: '여겨지다' },
]

// 필터 동사는 형태가 다양해 STEMS+종결로 직접 패턴화하기보다, 대표 종결형 목록으로 잡는다.
const FILTER_FORMS: { re: RegExp; label: string; tip: string }[] = [
  { re: R('느(꼈다|낀다|끼는|끼고|껴|꼈|끼며|끼지|꼈는데)'), label: '느끼다',
    tip: "'~을 느꼈다'는 시점인물을 거치는 필터 동사입니다. 감각 자체를 직접 보여주세요('추위를 느꼈다'→'찬 기운이 살을 파고들었다')." },
  { re: R('생각(했다|한다|하는|하고|하며|했|했는데|하지)'), label: '생각하다',
    tip: "'~라고 생각했다'는 거리를 둡니다. 생각 내용을 그대로 서술하거나, 행동·표정으로 드러내면 더 가깝습니다." },
  { re: R('(바라|쳐다|올려|내려|둘러)?(?<![아어여해])(?<!(아|어|여|해)\\s)보(았다|았던|는다|던|니|면서|고는|았고|았는데)'), label: '보다',
    tip: "'~을 보았다'는 지각 필터입니다. 본 대상을 곧바로 묘사하면 독자가 직접 보게 됩니다('그녀를 보았다'→'그녀의 손이 떨렸다'). (※ '알아보았다·해보았다' 같은 시도 보조용언은 제외)" },
  { re: R('보였(다|던|고|는데)'), label: '보이다',
    tip: "'~처럼 보였다'는 추측·필터 서술입니다. 근거가 된 디테일을 직접 보여주면 더 또렷합니다." },
  { re: R('들렸(다|던|고|는데)'), label: '들리다',
    tip: "'~이 들렸다'는 청각 필터입니다. 소리 자체를 의성·묘사로 직접 들려주세요('소리가 들렸다'→'문이 삐걱였다')." },
  { re: R('(?<![이가] )들었(다|던|고|는데)'), label: '듣다',
    tip: "'~을 들었다'는 청각 필터입니다. 소리·정보를 직접 제시하는 편이 가깝습니다. (※ '생각이/느낌이 들었다'는 제외)" },
  { re: R('깨달았(다|던|고|는데|음)'), label: '깨닫다',
    tip: "'~을 깨달았다'는 인지 필터입니다. 깨달음의 계기가 된 장면·디테일을 보여주면 독자가 함께 깨닫습니다." },
  { re: R('알았(다|던|고|는데)'), label: '알다',
    tip: "'~을 알았다'는 인지 필터입니다. 어떻게 알게 됐는지 단서를 보여주는 편이 생생합니다." },
  { re: R('눈치(챘다|챈|채고|채는)'), label: '눈치채다',
    tip: "'~을 눈치챘다'는 지각 필터입니다. 눈치챈 단서(시선·미세한 변화)를 직접 묘사해보세요." },
  { re: R('여겨졌?(다|던|고|는데)'), label: '여겨지다',
    tip: "'~로 여겨졌다'는 흐릿한 평가·피동 서술입니다. 그렇게 여기는 주체·근거를 능동으로 드러내세요." },
]

// ── 검사 실행 ───────────────────────────────────────────────
interface Hit {
  id: string
  kind: Kind
  cat: string
  label: string       // 표시용(빈도 묶음 키)
  tip: string
  index: number
  end: number
  match: string
  line: number
  col: number
}

// 한국어 어절(공백 분리) 수 — 비율 계산용. 한글이 하나라도 포함된 토큰만 센다.
function countEojeol(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter((w) => /[가-힣]/.test(w)).length
}

// 정도부사를 '독립 부사 어절'로만 잡기 위한 정규식(앞뒤 경계).
function buildVagueRegex(words: string[]): RegExp {
  const sorted = [...new Set(words)].sort((a, b) => b.length - a.length)
  const alt = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const before = '(?<=^|[\\s.,!?…"\'“”‘’()\\[\\]{}\\-—~])'
  const after = '(?=$|[\\s.,!?…"\'“”‘’()\\[\\]{}\\-—~])'
  return new RegExp(`${before}(${alt})${after}`, 'g')
}
const VAGUE_RE = buildVagueRegex(VAGUE_WORDS)

function runScan(text: string): Hit[] {
  if (!text) return []
  // 위치→줄/열 변환 테이블
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLineCol = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 }
  }

  const raw: Hit[] = []
  const push = (kind: Kind, cat: string, label: string, tip: string, index: number, end: number, match: string, id: string) => {
    const { line, col } = toLineCol(index)
    raw.push({ id, kind, cat, label, tip, index, end, match, line, col })
  }

  // ① 상태동사
  for (const rule of STATE_RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    let g = 0
    while ((m = rule.re.exec(text)) !== null) {
      if (g++ > 20000) break
      push('state', rule.cat, m[0].trim(), rule.tip, m.index, m.index + m[0].length, m[0], `state:${rule.id}`)
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++
    }
  }

  // ② 막연한 부사(어절 경계)
  VAGUE_RE.lastIndex = 0
  let mv: RegExpExecArray | null
  let gv = 0
  while ((mv = VAGUE_RE.exec(text)) !== null) {
    if (gv++ > 20000) break
    const word = mv[1]
    const start = mv.index + (mv[0].length - word.length)
    push('vague', '정도·강조 부사', word, VAGUE_TIP[word] ?? DEFAULT_VAGUE_TIP, start, mv.index + mv[0].length, word, `vague:${word}`)
    if (mv.index === VAGUE_RE.lastIndex) VAGUE_RE.lastIndex++
  }

  // ③ 필터 동사(지각·사고)
  for (const f of FILTER_FORMS) {
    f.re.lastIndex = 0
    let m: RegExpExecArray | null
    let g = 0
    while ((m = f.re.exec(text)) !== null) {
      if (g++ > 20000) break
      push('filter', '필터 동사', f.label, f.tip, m.index, m.index + m[0].length, m[0], `filter:${f.label}`)
      if (m.index === f.re.lastIndex) f.re.lastIndex++
    }
  }

  // 위치순 정렬 + 겹침 제거(긴 매치 우선). 같은 위치에서 여러 분류가 잡히면 하나만 남긴다.
  raw.sort((a, b) => a.index - b.index || b.end - a.end)
  const out: Hit[] = []
  let lastEnd = -1
  for (const h of raw) {
    if (h.index >= lastEnd) {
      out.push(h)
      lastEnd = h.end
    } else if (h.end > lastEnd) {
      lastEnd = Math.max(lastEnd, h.end)
    }
  }
  return out
}

// 강조 표시용 세그먼트(텍스트를 hit 경계로 잘라 일반/강조 조각으로)
interface Seg { text: string; hit: Hit | null }
function buildSegments(text: string, hits: Hit[]): Seg[] {
  if (hits.length === 0) return [{ text, hit: null }]
  const segs: Seg[] = []
  let cur = 0
  for (const h of hits) {
    if (h.index > cur) segs.push({ text: text.slice(cur, h.index), hit: null })
    segs.push({ text: text.slice(h.index, h.end), hit: h })
    cur = h.end
  }
  if (cur < text.length) segs.push({ text: text.slice(cur), hit: null })
  return segs
}

const KIND_COLOR: Record<Kind, string> = { state: 'var(--warn)', vague: 'var(--accent)', filter: 'var(--muted)' }
const KIND_LABEL: Record<Kind, string> = { state: '상태동사', vague: '막연한 부사', filter: '필터 동사' }

export default function WeakVerbChecker({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 페이로드(다른 도구에서 본문을 넘겨 열기)로 초기 텍스트 수용
  useEffect(() => {
    if (payload && typeof payload.text === 'string' && payload.text) setText(payload.text)
  }, [payload])

  // 언마운트 시 타이머 정리(경쟁상태/누수 방지)
  useEffect(() => () => {
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1600)
  }

  const hits = useMemo(() => {
    try { return runScan(text) } catch { return [] }
  }, [text])

  const stats = useMemo(() => {
    const eojeol = countEojeol(text)
    const state = hits.filter((h) => h.kind === 'state').length
    const vague = hits.filter((h) => h.kind === 'vague').length
    const filterC = hits.filter((h) => h.kind === 'filter').length
    const total = state + vague + filterC
    const ratio = eojeol > 0 ? (total / eojeol) * 100 : 0
    return { eojeol, state, vague, filter: filterC, total, ratio }
  }, [hits, text])

  // 빈도순 집계(같은 표현끼리 묶어 횟수 카운트)
  const freq = useMemo(() => {
    const map = new Map<string, { label: string; kind: Kind; cat: string; tip: string; count: number }>()
    for (const h of hits) {
      const key = `${h.kind}:${h.label}`
      const cur = map.get(key)
      if (cur) cur.count++
      else map.set(key, { label: h.label, kind: h.kind, cat: h.cat, tip: h.tip, count: 1 })
    }
    let arr = [...map.values()]
    if (filter !== 'all') arr = arr.filter((x) => x.kind === filter)
    arr.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    return arr
  }, [hits, filter])

  const segments = useMemo(() => buildSegments(text, hits), [text, hits])

  // 결과 텍스트(복사/리포트용)
  const resultText = useMemo(() => {
    if (hits.length === 0) return ''
    const lines: string[] = []
    lines.push('[약한 동사·표현 점검 결과]')
    lines.push(`어절 ${stats.eojeol}개 중 약한 표현 ${stats.total}개 (${stats.ratio.toFixed(1)}%)`)
    lines.push(`· 상태동사 ${stats.state} / 막연한 부사 ${stats.vague} / 필터 동사 ${stats.filter}`)
    lines.push('')
    lines.push('— 빈도순 —')
    const all = new Map<string, { label: string; kind: Kind; cat: string; count: number }>()
    for (const h of hits) {
      const key = `${h.kind}:${h.label}`
      const cur = all.get(key)
      if (cur) cur.count++
      else all.set(key, { label: h.label, kind: h.kind, cat: h.cat, count: 1 })
    }
    const sorted = [...all.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    for (const f of sorted) lines.push(`${f.count}회  ${f.label}  [${KIND_LABEL[f.kind]} · ${f.cat}]`)
    lines.push('')
    lines.push('조언: 약한 상태동사·범용 동사를 강한 능동 동사로 바꾸고, 막연한 부사는 덜어내며, 지각·사고 동사(필터)를 걷어내 독자가 장면을 직접 체험하게 하세요.')
    return lines.join('\n')
  }, [hits, stats])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  // HTML 이스케이프(프로젝트 추가 bodyHtml 안전)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addReportToProject = () => {
    if (!resultText || !hasProjectBridge()) return
    const bodyHtml = '<pre>' + esc(resultText) + '</pre>'
    const id = addToProject({ root: 'research', folder: '퇴고 점검', title: `약한 동사 점검 (${stats.total}건)`, bodyHtml })
    flash(id ? '프로젝트 자료에 추가했습니다' : '추가에 실패했습니다')
  }

  const stashReport = () => {
    if (!resultText || !hasStash()) return
    addToStash({ kind: 'note', label: `약한 동사 점검 (${stats.total}건)`, text: resultText })
    flash('수집함에 담았습니다')
  }

  // 매치 위치로 textarea 커서 이동 + 선택(강조)
  const jumpTo = (h: Hit) => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(h.index, h.end) } catch { /* noop */ }
  }

  // ── 드래그앤드롭(좌측 바인더 파일) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    const body = (item.text || '').trim()
    if (body) { setText(body); flash(`'${item.title}'을(를) 불러왔습니다`) }
    else flash('이 파일에는 본문 텍스트가 없습니다')
  }

  const sample = '그는 매우 슬픈 사람이었다. 방 안은 어두웠고, 창가에는 낡은 의자가 있었다. 그녀는 그를 바라보았다. 그리고 무언가 잘못되었다는 것을 느꼈다. 그는 너무 지쳐 보였다. 그녀는 정말 그가 괜찮을 거라고 생각했다. 멀리서 종소리가 들렸다. 그는 그저 가만히 있었고, 아무 말도 하지 않았다.'

  const showResults = text.trim() !== ''
  const ratioColor = stats.ratio >= 18 ? 'var(--warn)' : stats.ratio >= 10 ? 'var(--accent)' : 'var(--ok)'
  const ratioVerdict = stats.ratio >= 18 ? '약한 표현이 많습니다 — 능동 동사로 다듬으세요' : stats.ratio >= 10 ? '보통 — 군더더기를 점검하세요' : '힘 있는 편입니다'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 100, maxHeight: 170, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: '1px solid ' + (dragOver ? 'var(--accent)' : 'var(--border)'),
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const btnRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const ratioBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const preview: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const mark = (color: string): React.CSSProperties => ({ background: color, color: 'var(--paper)', borderRadius: 4, padding: '0 3px', fontWeight: 600 })
  const markWeak = (color: string): React.CSSProperties => ({ borderBottom: `2px dashed ${color}`, color: 'var(--text)', fontWeight: 600 })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const wordTxt: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)' }
  const countTxt: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const tipTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}><Emoji e="💪"/> 글을 붙여넣으면 약한 동사·막연한 부사·필터 동사를 찾아 강조합니다 (네트워크 불필요)</div>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="점검할 글을 여기에 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 됩니다.&#10;입력하는 동안 실시간으로 분석합니다."
        spellCheck={false}
        aria-label="점검할 텍스트 입력"
        onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {stats.total}</span>
        <span style={chip(filter === 'state', KIND_COLOR.state)} onClick={() => setFilter('state')} role="button" tabIndex={0}>상태동사 {stats.state}</span>
        <span style={chip(filter === 'vague', KIND_COLOR.vague)} onClick={() => setFilter('vague')} role="button" tabIndex={0}>막연한 부사 {stats.vague}</span>
        <span style={chip(filter === 'filter', KIND_COLOR.filter)} onClick={() => setFilter('filter')} role="button" tabIndex={0}>필터 동사 {stats.filter}</span>
      </div>

      <div style={btnRow}>
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <span style={{ flex: 1 }} />
        {hasStash() && <button className="minibtn" onClick={stashReport} disabled={hits.length === 0} type="button"><Emoji e="📥"/> 수집함</button>}
        {hasProjectBridge() && <button className="linkbtn" onClick={addReportToProject} disabled={hits.length === 0} type="button"><Emoji e="📄"/> 프로젝트에 추가</button>}
        <button className="btn-primary" onClick={doCopy} disabled={hits.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>{toast}</div>}

      {!showResults ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}><Emoji e="💪"/></div>
          <div>
            글을 붙여넣으면 <b style={{ color: 'var(--warn)' }}>상태동사</b>(이다/있다/하다/되다),
            <b style={{ color: 'var(--accent)' }}> 막연한 부사</b>(매우·정말·너무),
            <b style={{ color: 'var(--muted)' }}> 필터 동사</b>(느꼈다·생각했다·보았다)를 찾아 강조합니다.
          </div>
          <div style={hint}>약한 동사는 강한 능동 동사로, 막연한 부사는 구체 묘사로 바꾸고, 필터 동사를 걷어내면 독자가 장면을 직접 체험합니다.</div>
        </div>
      ) : (
        <div style={scroll}>
          {/* 비율 요약 */}
          <div style={ratioBox}>
            <div style={{ fontSize: 30, fontWeight: 800, color: ratioColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], minWidth: 78, textAlign: 'center' }}>
              {stats.ratio.toFixed(1)}<span style={{ fontSize: 15 }}>%</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: ratioColor }}>{ratioVerdict}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>어절 {stats.eojeol}개 중 약한 표현 {stats.total}개</div>
              <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, stats.ratio * 3)}%`, height: '100%', background: ratioColor, transition: 'width .3s' }} />
              </div>
            </div>
          </div>

          <div style={grid3}>
            <div style={stat}><div style={{ ...statVal, color: KIND_COLOR.state }}>{stats.state}</div><div style={statLabel}>상태동사</div></div>
            <div style={stat}><div style={{ ...statVal, color: KIND_COLOR.vague }}>{stats.vague}</div><div style={statLabel}>막연한 부사</div></div>
            <div style={stat}><div style={{ ...statVal, color: 'var(--text)' }}>{stats.filter}</div><div style={statLabel}>필터 동사</div></div>
          </div>

          {/* 강조 미리보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}><Emoji e="🖍"/> 강조 미리보기 ({filter === 'all' ? '전체' : KIND_LABEL[filter as Kind]})</div>
            <div style={preview}>
              {segments.map((s, i) => {
                if (!s.hit) return <span key={i}>{s.text}</span>
                if (filter !== 'all' && s.hit.kind !== filter) return <span key={i}>{s.text}</span>
                const ms = s.hit.kind === 'filter' ? markWeak(KIND_COLOR[s.hit.kind]) : mark(KIND_COLOR[s.hit.kind])
                return <span key={i} style={{ ...ms, cursor: 'pointer' }} title={s.hit.tip} onClick={() => jumpTo(s.hit as Hit)}>{s.text}</span>
              })}
            </div>
          </div>

          {/* 빈도순 목록 */}
          {freq.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}><Emoji e="📊"/> 빈도순 ({freq.length}종)</div>
              {freq.map((f, i) => (
                <div key={`${f.kind}-${f.label}-${i}`} style={card}>
                  <div style={cardHead}>
                    <span style={tag(KIND_COLOR[f.kind])}>{KIND_LABEL[f.kind]} · {f.cat}</span>
                    <span style={wordTxt}>{f.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={countTxt}>{f.count}회</span>
                  </div>
                  <div style={tipTxt}>{f.tip}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={empty}>
              <div style={{ fontSize: 28 }}><Emoji e="✅"/></div>
              <div>{stats.total === 0 ? '두드러진 약한 표현이 없습니다. 힘이 있습니다!' : '선택한 분류에 해당하는 항목이 없습니다.'}</div>
            </div>
          )}

          <div style={hint}>
            규칙 기반 근사 탐지라 일부 과탐/누락이 있을 수 있습니다. 강조는 '다듬을 후보'일 뿐, 문맥에 꼭 필요한 표현은 남기세요.
          </div>
        </div>
      )}
    </div>
  )
}
