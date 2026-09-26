// 서술 거리 가이드 & 진단(Narrative / Psychic Distance) — John Gardner 의 "심리적 거리" 5단계를
//   정의·예시하고, 붙여넣은 단락이 어느 거리인지 휴리스틱으로 추정한다.
//   휴리스틱 신호:
//     · 호칭/지시: 일반명사("그 남자"·"한 사내") → 이름("철수") → 1인칭("나") 로 갈수록 가까워짐
//     · 필터 동사("느꼈다·보았다·들렸다·생각했다·~인 듯했다"): 인물과 독자 사이에 카메라를 끼우는 신호(거리 멀어짐 ↔ 직접 묘사로 바꾸면 가까워짐)
//     · 감각·내면 어휘(심장·숨·뱃속·머릿속·문득·차마…) 와 자유간접화법(현재형 의문·반말 독백) → 거리 가까워짐
//     · 요약 신호(몇 년 동안·매일·늘·언제나·이윽고): 시간 압축 → 원거리(파노라마)
//   단락마다 1~5 거리를 추정하고, 한 장면 안에서 거리가 들쭉날쭉하면(일관성) 경고한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·라이브러리 불필요(100% 로컬).
//   localStorage('sry:tool:narrative-distance')에 입력 본문·모드 자동 저장/복원.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'narrative-distance',
  name: '서술 거리 가이드',
  icon: '🔭',
  group: '교정·언어',
  intro: '원거리 요약~밀착 내적독백 5단계를 예시하고, 붙여넣은 단락의 서술 거리와 장면 내 일관성을 진단합니다',
  w: 600,
  h: 720,
}

const LS = 'sry:tool:narrative-distance'

type Mode = 'guide' | 'diagnose'

// ── 다섯 단계 정의 (전부 직접 쓴 창작 예시 — 저작권 안전) ──
interface Level {
  n: 1 | 2 | 3 | 4 | 5
  name: string
  short: string
  icon: string
  color: string // var(--*) 또는 직접 색. CSS 변수 활용
  desc: string
  signals: string[]   // 이 거리의 표지
  example: string     // 같은 장면을 이 거리로 쓴 예
  craft: string       // 언제 쓰면 좋은가
}

const LEVELS: Level[] = [
  {
    n: 1,
    name: '원거리 요약',
    short: '파노라마',
    icon: '🛰️',
    color: 'var(--muted)',
    desc: '카메라가 가장 멀리 떨어져 있다. 인물을 일반명사·역사적 시선으로 내려다보고, 긴 시간을 한 문장으로 압축한다. 내면은 거의 보이지 않는다.',
    signals: ['일반명사 호칭(그 남자/한 여자/사람들)', '시간 압축(몇 년 동안/늘/언제나/매일)', '서술자의 논평·요약', '구체적 감각·내면 거의 없음'],
    example: '그해 겨울, 도시의 사람들은 오래 기다려 온 소식을 들었다. 여러 해 동안 누구도 입에 올리지 못했던 일이 마침내 일어나려 하고 있었다.',
    craft: '장의 도입, 시간 건너뛰기, 큰 배경을 빠르게 깔 때. 너무 오래 머물면 독자가 인물과 정 붙이기 어렵다.',
  },
  {
    n: 2,
    name: '중거리 서술',
    short: '관찰',
    icon: '🎥',
    color: 'var(--text)',
    desc: '인물의 이름이 등장하고 한 사람의 행동을 따라간다. 그러나 아직 바깥에서 지켜보는 시선이다. 내면은 요약되어 전달된다.',
    signals: ['이름으로 호칭(철수는/민아가)', '행동 위주 서술', '내면은 요약("화가 났다·기뻤다")', '서술자 거리 유지'],
    example: '철수는 편지를 받아 들고 한참을 서 있었다. 그는 곧장 집으로 향했지만, 발걸음이 평소보다 느렸다. 마음이 복잡했다.',
    craft: '장면을 차분히 진행시키는 기본값. 사건을 빠르게 전개하거나 여러 인물을 오갈 때 안정적이다.',
  },
  {
    n: 3,
    name: '근거리 시점',
    short: '필터',
    icon: '🔎',
    color: 'var(--accent)',
    desc: '시점 인물의 지각을 통해 세계를 본다. "보았다·들렸다·느꼈다" 같은 필터 동사로 감각이 인물을 거쳐 전달된다. 거리가 한 발 좁혀졌다.',
    signals: ['필터 동사(보았다/들렸다/느꼈다/깨달았다)', '인물의 지각 경유("~인 듯했다")', '구체적 감각 등장', '내면을 인물의 눈으로 중계'],
    example: '철수는 봉투를 뜯었다. 종이 위의 글씨가 흐릿하게 번지는 것이 보였다. 손끝이 차가워지는 것을 느꼈다. 무언가 잘못되었다는 생각이 들었다.',
    craft: '시점을 또렷이 하고 싶을 때. 다만 필터 동사가 많으면 한 겹 멀어 보이므로, 더 밀착하려면 직접 묘사로 바꾼다.',
  },
  {
    n: 4,
    name: '밀착 묘사',
    short: '몰입',
    icon: '🫀',
    color: 'var(--ok)',
    desc: '필터를 걷어내고 감각을 직접 보여준다. "~보았다"가 아니라 그냥 본 것이 펼쳐진다. 신체 감각·구체적 디테일이 인물의 몸을 통해 곧장 들어온다.',
    signals: ['필터 제거(직접 감각 묘사)', '신체 감각(심장/숨/뱃속/손끝)', '구체적 디테일', '현재의 순간에 머묾'],
    example: '봉투가 손안에서 바스락거렸다. 글씨가 흐릿하게 번졌다. 손끝이 차갑게 식었다. 가슴 한가운데가 천천히 내려앉았다.',
    craft: '중요한 장면·긴장의 정점에서. 독자를 인물의 몸 안에 앉힌다. 장시간 유지하면 호흡이 가빠지니 완급 조절.',
  },
  {
    n: 5,
    name: '내적 독백',
    short: '의식',
    icon: '🧠',
    color: 'var(--warn)',
    desc: '거리가 사라지고 독자가 인물의 의식 안으로 들어간다. 자유간접화법으로 인물의 생각이 서술에 녹아든다. 의문·반말·파편적 사고가 그대로 흘러나온다.',
    signals: ['자유간접화법(인물 생각이 서술에 섞임)', '독백투 의문("이게 무슨…")', '반말·구어·파편적 사고', '문득/차마/설마/도대체 같은 내면 부사'],
    example: '아니야. 이럴 리가 없어. 손이 떨렸다. 다시 읽어도 같은 글자였다. 도대체 어디서부터 잘못된 거지. 차마 끝까지 읽을 수가 없었다.',
    craft: '감정의 절정, 결정의 순간, 인물의 진심을 드러낼 때. 가장 강렬하지만 남용하면 산만해진다.',
  },
]

// ── 휴리스틱 신호 사전 ──
// 모두 부분일치(한국어 어미 변형 고려). 정규식 대신 indexOf 다중 매칭으로 단순·안전하게.
const FILTER_VERBS = ['보았다', '봤다', '보였다', '바라보았다', '쳐다보았다', '들었다', '들렸다', '느꼈다', '느껴졌다', '생각했다', '생각이 들었다', '깨달았다', '알아차렸다', '여겨졌다', '듯했다', '듯이', '것 같았다', '처럼 보였다', '냄새가 났다', '맛이 났다']
const SUMMARY_CUES = ['몇 년', '여러 해', '수년', '오랫동안', '오래도록', '늘', '언제나', '항상', '매일', '날마다', '해마다', '그해', '그 무렵', '이윽고', '시간이 흘러', '세월이', '얼마 후', '며칠 동안', '몇 달', '평생', '한동안', '그 시절', '당시']
const SENSORY_INNER = ['심장', '숨', '뱃속', '명치', '머릿속', '가슴', '손끝', '등줄기', '목구멍', '온몸', '식은땀', '소름', '귓속', '핏대', '관자놀이', '맥박', '호흡']
const INNER_ADVERBS = ['문득', '차마', '설마', '도대체', '대체', '하필', '괜히', '왠지', '어쩌면', '필시', '분명', '아무래도', '어쩐지']
const GENERIC_NOUNS = ['그 남자', '그 여자', '한 남자', '한 여자', '한 사내', '한 사람', '사람들', '그 사내', '어떤 이', '한 소녀', '한 소년', '그 노인', '낯선 이', '행인', '군중']
// 요약된(telling) 내면 — 중거리 신호
const TELLING_INNER = ['화가 났다', '화났다', '기뻤다', '슬펐다', '무서웠다', '불안했다', '행복했다', '외로웠다', '두려웠다', '마음이 복잡했다', '서글펐다', '설??다', '긴장했다', '안심했다']
// 자유간접화법/독백 신호: 짧은 반말 단정/의문, 구어
const MONOLOGUE_CUES = ['아니야', '아니다', '그럴 리', '이럴 리', '설마', '말도 안', '어떡하지', '어쩌지', '그래야', '그럴까', '왜 이러', '왜 자꾸', '뭐지', '뭐야', '대체 뭐', '맞아', '그래 맞']

function countHits(hay: string, needles: string[]): { total: number; matched: string[] } {
  const matched: string[] = []
  let total = 0
  for (const n of needles) {
    if (!n) continue
    let idx = hay.indexOf(n)
    let c = 0
    while (idx >= 0 && c < 50) {
      total++; c++
      idx = hay.indexOf(n, idx + n.length)
    }
    if (c > 0) matched.push(n)
  }
  return { total, matched }
}

// 인용부호 안(대사) 비중 — 대사가 많으면 거리 판단을 보수적으로
function dialogueRatio(s: string): number {
  if (!s) return 0
  let inq = 0
  const re = /[“"”][^“"”]*[“"”]|『[^』]*』|「[^」]*」|‘[^’]*’/g
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(s)) !== null) { inq += m[0].length; if (guard++ > 5000) break; if (m.index === re.lastIndex) re.lastIndex++ }
  return s.length ? inq / s.length : 0
}

// 1인칭 신호
function firstPersonHits(s: string): number {
  const fp = ['나는', '내가', '나의', '내 ', '우리는', '우리가', '나를', '내게', '나에게', '날 ']
  return countHits(s, fp).total
}

interface ParaResult {
  text: string
  level: number          // 1~5 추정
  scores: number[]       // [1..5] 각 단계 점수(인덱스 0=레벨1)
  signals: {
    filter: string[]
    summary: string[]
    sensory: string[]
    innerAdv: string[]
    generic: string[]
    telling: string[]
    monologue: string[]
    firstPerson: number
    dialogue: number
  }
  chars: number
}

// 한 단락의 거리를 추정 — 단계별 점수를 매겨 최댓값을 채택
function scorePara(raw: string): ParaResult {
  const text = raw
  const chars = [...text.replace(/\s/g, '')].length
  const filter = countHits(text, FILTER_VERBS)
  const summary = countHits(text, SUMMARY_CUES)
  const sensory = countHits(text, SENSORY_INNER)
  const innerAdv = countHits(text, INNER_ADVERBS)
  const generic = countHits(text, GENERIC_NOUNS)
  const telling = countHits(text, TELLING_INNER)
  const monologue = countHits(text, MONOLOGUE_CUES)
  const fp = firstPersonHits(text)
  const dlg = dialogueRatio(text)

  // 길이 정규화(짧은 단락에서 한두 신호가 과대평가되지 않게)
  const norm = Math.max(1, chars / 60)

  const s = [0, 0, 0, 0, 0] // 레벨1..5
  // 레벨1: 요약 + 일반명사 + (감각/내면 적음)
  s[0] += summary.total * 2.2
  s[0] += generic.total * 1.6
  s[0] += (sensory.total === 0 && filter.total === 0) ? 1.0 : 0
  // 레벨2: 기본 서술 — telling 내면 + 일반적 진행(약한 기본점)
  s[1] += telling.total * 1.8
  s[1] += 0.8 // 중립 기본값(대부분 서술의 바탕)
  s[1] += generic.total * 0.3
  // 레벨3: 필터 동사 중심
  s[2] += filter.total * 2.4
  s[2] += sensory.total * 0.4
  // 레벨4: 감각·신체 직접 묘사 + 필터는 적음
  s[3] += sensory.total * 1.9
  s[3] += filter.total === 0 && sensory.total > 0 ? 1.4 : 0
  s[3] += innerAdv.total * 0.4
  // 레벨5: 내적 독백 + 자유간접화법 부사
  s[4] += monologue.total * 2.6
  s[4] += innerAdv.total * 1.3
  s[4] += sensory.total > 0 && monologue.total > 0 ? 1.0 : 0

  // 1인칭은 전반적으로 거리를 좁힘(레벨4·5 가산)
  s[3] += Math.min(fp, 4) * 0.3
  s[4] += Math.min(fp, 4) * 0.4

  // 대사 비중이 높으면 서술 거리 신호를 약화(대사는 거리 판단 대상이 아님)
  const dlgDamp = 1 - Math.min(0.6, dlg)
  for (let i = 0; i < 5; i++) s[i] *= dlgDamp

  // 길이 보정: 신호가 거의 없고 짧으면 레벨2로 수렴
  const totalSignal = filter.total + summary.total + sensory.total + innerAdv.total + generic.total + telling.total + monologue.total
  if (totalSignal === 0) s[1] += 1.2
  // 매우 긴 단락에서 요약 가중치 약간 완화
  s[0] /= Math.min(2, norm)

  let best = 0
  for (let i = 1; i < 5; i++) if (s[i] > s[best]) best = i

  return {
    text,
    level: best + 1,
    scores: s,
    signals: {
      filter: filter.matched,
      summary: summary.matched,
      sensory: sensory.matched,
      innerAdv: innerAdv.matched,
      generic: generic.matched,
      telling: telling.matched,
      monologue: monologue.matched,
      firstPerson: fp,
      dialogue: dlg,
    },
    chars,
  }
}

function splitParas(text: string): string[] {
  // 빈 줄(또는 단일 개행)로 단락 분리. 빈 단락 제거.
  const byBlank = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (byBlank.length > 1) return byBlank
  // 빈 줄이 없으면 줄 단위로
  return text.split(/\n/).map((p) => p.trim()).filter(Boolean)
}

interface Saved { text?: string; mode?: Mode }

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function NarrativeDistanceGuide({ payload }: { payload?: Record<string, unknown> }) {
  const [mode, setMode] = useState<Mode>('guide')
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState<number | null>(3) // 가이드에서 펼친 단계
  const [flash, setFlash] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const flashTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)

  // 복원(최초 1회) + payload 반영
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Saved
        if (typeof s.text === 'string') setText(s.text)
        if (s.mode === 'guide' || s.mode === 'diagnose') setMode(s.mode)
      }
    } catch { /* 손상된 저장 무시 */ }
    const pt = payload?.text
    if (typeof pt === 'string' && pt.trim()) { setText(pt); setMode('diagnose') }
    setLoaded(true)
    // payload 는 마운트 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(LS, JSON.stringify({ text, mode } as Saved)) } catch { /* 용량 초과 무시 */ }
  }, [text, mode, loaded])

  // 언마운트 정리
  useEffect(() => () => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
  }, [])

  const flashMsg = (m: string) => {
    setFlash(m)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { setFlash(null); flashTimer.current = null }, 1800)
  }

  const safeCopy = (txt: string, done: string) => {
    if (!txt) return
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(txt).then(() => flashMsg(done)).catch(() => { /* 권한 거부 graceful */ })
      } else {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        flashMsg(done)
      }
    } catch { /* 클립보드 미지원 무시 */ }
  }

  // ── 진단 ──
  const paras = useMemo(() => {
    if (mode !== 'diagnose' || !text.trim()) return []
    try {
      return splitParas(text).map(scorePara)
    } catch { return [] }
  }, [text, mode])

  const stats = useMemo(() => {
    if (paras.length === 0) return null
    const counts = [0, 0, 0, 0, 0]
    for (const p of paras) counts[p.level - 1]++
    const levels = paras.map((p) => p.level)
    const mean = levels.reduce((a, b) => a + b, 0) / levels.length
    const variance = levels.reduce((a, b) => a + (b - mean) * (b - mean), 0) / levels.length
    const std = Math.sqrt(variance)
    // 인접 단락 간 급격한 점프(2단계 이상) 위치 — 일관성 경고
    const jumps: { i: number; from: number; to: number }[] = []
    for (let i = 1; i < levels.length; i++) {
      const d = levels[i] - levels[i - 1]
      if (Math.abs(d) >= 2) jumps.push({ i, from: levels[i - 1], to: levels[i] })
    }
    const dominant = counts.indexOf(Math.max(...counts)) + 1
    return { counts, mean, std, jumps, dominant }
  }, [paras])

  const report = useMemo(() => {
    if (paras.length === 0 || !stats) return ''
    const lines: string[] = ['[서술 거리 진단]', `단락 ${paras.length}개 · 평균 거리 ${stats.mean.toFixed(1)} (지배적: ${stats.dominant}단계 ${LEVELS[stats.dominant - 1].name}) · 변동 ${stats.std.toFixed(2)}`, '']
    paras.forEach((p, i) => {
      const L = LEVELS[p.level - 1]
      lines.push(`단락 ${i + 1} — ${L.n}단계 ${L.name}(${L.short})`)
      const sig: string[] = []
      if (p.signals.summary.length) sig.push(`요약(${p.signals.summary.slice(0, 3).join('/')})`)
      if (p.signals.generic.length) sig.push(`일반호칭(${p.signals.generic.slice(0, 2).join('/')})`)
      if (p.signals.filter.length) sig.push(`필터(${p.signals.filter.slice(0, 3).join('/')})`)
      if (p.signals.sensory.length) sig.push(`감각(${p.signals.sensory.slice(0, 3).join('/')})`)
      if (p.signals.monologue.length || p.signals.innerAdv.length) sig.push(`독백(${[...p.signals.monologue, ...p.signals.innerAdv].slice(0, 3).join('/')})`)
      if (p.signals.firstPerson) sig.push(`1인칭×${p.signals.firstPerson}`)
      if (sig.length) lines.push(`  신호: ${sig.join(', ')}`)
    })
    if (stats.std >= 1.1) {
      lines.push('', `※ 거리 변동이 큽니다(±${stats.std.toFixed(2)}). 한 장면 안이라면 시점이 오르내려 독자 몰입이 흔들릴 수 있습니다.`)
    }
    if (stats.jumps.length) {
      lines.push(stats.jumps.map((j) => `  · 단락 ${j.i}→${j.i + 1}: ${j.from}단계→${j.to}단계 급변`).join('\n'))
    }
    return lines.join('\n')
  }, [paras, stats])

  // 본문에서 신호 토큰 강조용 세그먼트(필터=주황, 감각=ok, 요약/일반=muted, 독백=warn)
  const SIGNAL_GROUPS: { words: string[]; color: string; label: string }[] = useMemo(() => ([
    { words: SUMMARY_CUES, color: 'var(--muted)', label: '요약' },
    { words: GENERIC_NOUNS, color: 'var(--muted)', label: '일반호칭' },
    { words: FILTER_VERBS, color: 'var(--accent)', label: '필터' },
    { words: SENSORY_INNER, color: 'var(--ok)', label: '감각' },
    { words: [...MONOLOGUE_CUES, ...INNER_ADVERBS], color: 'var(--warn)', label: '독백' },
  ]), [])

  // ── 연계: 저장/추가 ──
  const saveSnippet = () => {
    if (!report) return
    addToLibrary('snippets', { text: report, source: '서술 거리 가이드', tags: ['서술거리', '진단'] })
    flashMsg('스니펫으로 저장했습니다')
  }
  const addReportToProject = () => {
    if (!report || !stats) return
    const bodyHtml = paras.map((p, i) => {
      const L = LEVELS[p.level - 1]
      return `<p><b>단락 ${i + 1} — ${L.n}단계 ${escHtml(L.name)}</b></p><blockquote>${escHtml(p.text)}</blockquote>`
    }).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '서술 거리 진단',
      title: `서술 거리 진단 (평균 ${stats.mean.toFixed(1)}단계)`,
      bodyHtml: `<p>${escHtml(`단락 ${paras.length}개 · 지배적 ${stats.dominant}단계 ${LEVELS[stats.dominant - 1].name} · 변동 ${stats.std.toFixed(2)}`)}</p>${bodyHtml}`,
      meta: { 평균거리: stats.mean.toFixed(1), 지배단계: String(stats.dominant), 단락수: String(paras.length) },
    })
    flashMsg(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }
  const stashReport = () => {
    if (!report) return
    addToStash({ kind: 'note', label: '서술 거리 진단', text: report })
    flashMsg('수집함에 담았습니다')
  }
  const addLevelGuideToProject = (L: Level) => {
    const bodyHtml =
      `<p>${escHtml(L.desc)}</p>` +
      `<p><b>표지</b></p><ul>${L.signals.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` +
      `<p><b>예시</b></p><blockquote>${escHtml(L.example)}</blockquote>` +
      `<p><b>쓰임</b> ${escHtml(L.craft)}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '서술 거리',
      title: `${L.n}단계 · ${L.name}`,
      bodyHtml,
      meta: { 단계: String(L.n), 이름: L.name },
    })
    flashMsg(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // ── 바인더 파일 드롭 → 본문으로 ──
  const handleDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    if (it.text && it.text.trim()) { setText(it.text); setMode('diagnose'); flashMsg(`「${it.title}」 본문을 불러왔습니다`) }
    else flashMsg('이 파일에는 분석할 본문이 없습니다')
  }

  const sample = [
    '그해 겨울, 마을 사람들은 오래 기다려 온 소식을 들었다. 여러 해 동안 누구도 입에 올리지 못했던 일이 매일같이 입에서 입으로 옮겨 다녔다.',
    '철수는 우체통에서 편지를 꺼냈다. 그는 봉투를 들고 한참을 서 있었다. 마음이 복잡했다.',
    '봉투를 뜯자 종이 위의 글씨가 흐릿하게 번지는 것이 보였다. 손끝이 차가워지는 것을 느꼈다. 무언가 잘못되었다는 생각이 들었다.',
    '글씨가 흐릿하게 번졌다. 손끝이 차갑게 식었다. 가슴 한가운데가 천천히 내려앉았다.',
    '아니야. 이럴 리가 없어. 다시 읽어도 같은 글자였다. 도대체 어디서부터 잘못된 거지. 차마 끝까지 읽을 수가 없었다.',
  ].join('\n\n')

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', position: 'relative' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, flexShrink: 0 }
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 13, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', userSelect: 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', fontWeight: active ? 700 : 400,
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const taStyle: React.CSSProperties = {
    minHeight: 110, maxHeight: 200, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const preview: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const pill = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })

  // 거리 눈금 막대(1=멀다 → 5=가깝다)
  const meter = (level: number) => (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} aria-label={`거리 ${level}단계`}>
      {LEVELS.map((L) => (
        <span key={L.n} title={`${L.n} ${L.name}`} style={{ width: 14, height: 8, borderRadius: 3, background: L.n <= level ? L.color : 'var(--border)', opacity: L.n <= level ? 1 : 0.5 }} />
      ))}
    </div>
  )

  // 진단 단락 본문 신호 강조 — 그룹별 색
  const renderHighlighted = (t: string) => {
    // 모든 신호어를 길이순으로 모아 매칭
    const all: { w: string; color: string }[] = []
    for (const g of SIGNAL_GROUPS) for (const w of g.words) all.push({ w, color: g.color })
    all.sort((a, b) => b.w.length - a.w.length)
    type Mark = { start: number; end: number; color: string }
    const marks: Mark[] = []
    for (const { w, color } of all) {
      if (!w) continue
      let idx = t.indexOf(w)
      let guard = 0
      while (idx >= 0 && guard < 200) {
        // 이미 덮인 구간과 겹치면 건너뜀
        const overlap = marks.some((m) => idx < m.end && idx + w.length > m.start)
        if (!overlap) marks.push({ start: idx, end: idx + w.length, color })
        idx = t.indexOf(w, idx + w.length)
        guard++
      }
    }
    marks.sort((a, b) => a.start - b.start)
    const out: React.ReactNode[] = []
    let cur = 0
    marks.forEach((m, i) => {
      if (m.start < cur) return
      if (m.start > cur) out.push(<span key={`t${i}`}>{t.slice(cur, m.start)}</span>)
      out.push(<mark key={`m${i}`} style={{ background: 'transparent', color: m.color, fontWeight: 700, borderBottom: `2px solid ${m.color}`, padding: '0 1px' }}>{t.slice(m.start, m.end)}</mark>)
      cur = m.end
    })
    if (cur < t.length) out.push(<span key="tail">{t.slice(cur)}</span>)
    return out
  }

  return (
    <div
      style={{ ...wrap, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: dragOver ? -6 : 0 }}
      onDragEnter={(e) => { if (!isItemDrag(e)) return; e.preventDefault(); dragDepth.current += 1; setDragOver(true) }}
      onDragOver={(e) => { if (isItemDrag(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--paper) 70%, transparent)', color: 'var(--accent)', fontWeight: 700, fontSize: 14, pointerEvents: 'none', borderRadius: 10 }}>
          여기에 놓으면 본문을 분석합니다
        </div>
      )}

      <div style={hint}>
        <Emoji e="🔭"/> <b>서술 거리(심리적 거리)</b>는 서술자/독자가 인물에게서 얼마나 떨어져 있는지입니다. 멀리서 요약(1)할수록 시야가 넓고, 의식 속으로(5) 들어갈수록 몰입이 강해집니다. 거리는 의도적으로 다뤄야 하고, 한 장면 안에서 이유 없이 오르내리면 몰입이 흔들립니다.
      </div>

      <div style={tabRow}>
        <span style={tab(mode === 'guide')} onClick={() => setMode('guide')} role="button" tabIndex={0}><Emoji e="📚"/> 5단계 가이드</span>
        <span style={tab(mode === 'diagnose')} onClick={() => setMode('diagnose')} role="button" tabIndex={0}><Emoji e="🔬"/> 본문 거리 진단</span>
      </div>

      {mode === 'guide' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>
            <span>← 멀다(파노라마)</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>가깝다(의식) →</span>
          </div>
          <div style={scroll}>
            {LEVELS.map((L) => {
              const open = expanded === L.n
              return (
                <div key={L.n} style={{ ...card, borderColor: open ? L.color : 'var(--border)' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => setExpanded(open ? null : L.n)}
                    role="button" tabIndex={0}
                  >
                    <span style={{ fontSize: 18 }}><Emoji e={L.icon}/></span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: L.color }}>{L.n}단계</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{L.name}</span>
                    <span style={pill(L.color)}>{L.short}</span>
                    <span style={{ marginLeft: 'auto' }}>{meter(L.n)}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                  </div>
                  {open && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{L.desc}</div>
                      <div>
                        <div style={sectionTitle}>표지(이 거리의 신호)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {L.signals.map((s, i) => <span key={i} style={{ ...pill('var(--muted)'), fontWeight: 400 }}>{s}</span>)}
                        </div>
                      </div>
                      <div>
                        <div style={sectionTitle}>예시 (같은 장면을 이 거리로)</div>
                        <div style={{ ...preview, fontSize: 13.5, lineHeight: 1.7 }}>{L.example}</div>
                      </div>
                      <div style={{ ...hint, fontSize: 12 }}><b style={{ color: 'var(--text)' }}>쓰임</b> · {L.craft}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => safeCopy(`[${L.n}단계 ${L.name}]\n${L.desc}\n예: ${L.example}`, '예시를 복사했습니다')}><Emoji e="📋"/> 예시 복사</button>
                        <button className="linkbtn" onClick={() => addLevelGuideToProject(L)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 단계 설명을 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={hint}>같은 사건이라도 어느 거리에서 보여줄지가 효과를 좌우합니다. 보통 한 장면은 한두 단계 안에서 머물고, 감정의 정점에서만 더 깊이(4~5) 들어갔다가 빠져나옵니다.</div>
        </>
      ) : (
        <>
          <textarea
            style={taStyle}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="원고를 단락(빈 줄로 구분)째로 붙여넣으세요. 각 단락이 어느 서술 거리인지 추정하고, 장면 안에서 거리가 들쭉날쭉한지 점검합니다. (좌측 파일을 끌어다 놓아도 됩니다)"
            spellCheck={false}
            aria-label="서술 거리 진단 입력"
          />
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...hint, flex: 1 }}>{text.trim() ? `단락 ${paras.length}개 분석` : '본문을 붙여넣으면 즉시 추정합니다.'}</span>
            <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
            <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
            <button className="btn-primary" onClick={() => safeCopy(report, '결과를 복사했습니다')} disabled={paras.length === 0} type="button">결과 복사</button>
          </div>

          {text.trim() === '' ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}><Emoji e="🔬"/></div>
              <div>원고를 붙여넣으면 단락마다 <b>1~5단계 서술 거리</b>를 추정하고,<br />필터 동사·감각·일반호칭·독백 같은 <b>신호</b>를 강조합니다.</div>
              <div style={{ ...hint, fontSize: 11 }}>휴리스틱이라 참고용입니다. 대사 위주 단락은 거리 판단에서 비중을 낮춥니다.</div>
            </div>
          ) : paras.length === 0 ? (
            <div style={empty}><div style={{ fontSize: 30 }}><Emoji e="🔬"/></div><div>분석할 단락을 찾지 못했습니다.</div></div>
          ) : (
            <div style={scroll}>
              {/* 요약 통계 */}
              {stats && (
                <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>평균 거리 {stats.mean.toFixed(1)}단계</span>
                    <span style={pill(LEVELS[stats.dominant - 1].color)}>지배 {stats.dominant} {LEVELS[stats.dominant - 1].name}</span>
                    <span style={{ marginLeft: 'auto' }}>{meter(Math.round(stats.mean))}</span>
                  </div>
                  {/* 단계 분포 막대 */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {LEVELS.map((L, i) => {
                      const c = stats.counts[i]
                      const ratio = paras.length ? c / paras.length : 0
                      return (
                        <div key={L.n} style={{ flex: 1, textAlign: 'center' }} title={`${L.name}: ${c}개`}>
                          <div style={{ height: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div style={{ width: '70%', height: `${Math.max(ratio * 36, c ? 4 : 0)}px`, background: L.color, borderRadius: 3, opacity: c ? 1 : 0.25 }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{L.n}·{c}</div>
                        </div>
                      )
                    })}
                  </div>
                  {stats.std >= 1.1 ? (
                    <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>
                      <Emoji e="⚠️"/> 거리 변동이 큽니다(±{stats.std.toFixed(2)}). 한 장면이라면 시점이 오르내려 몰입이 흔들릴 수 있습니다.
                      {stats.jumps.length > 0 && <> 급변: {stats.jumps.map((j) => `${j.i}→${j.i + 1}단락(${j.from}→${j.to})`).join(', ')}</>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--ok)', lineHeight: 1.5 }}>✓ 거리가 비교적 일관됩니다(±{stats.std.toFixed(2)}). 의도한 흐름인지 확인해 보세요.</div>
                  )}
                </div>
              )}

              <div style={sectionTitle}>단락별 추정 — 색 밑줄: 요약·일반호칭(회색) / 필터(파랑) / 감각(초록) / 독백(주황)</div>
              {paras.map((p, i) => {
                const L = LEVELS[p.level - 1]
                const sigChips: { label: string; color: string; items: string[] }[] = [
                  { label: '요약', color: 'var(--muted)', items: p.signals.summary },
                  { label: '일반호칭', color: 'var(--muted)', items: p.signals.generic },
                  { label: '필터', color: 'var(--accent)', items: p.signals.filter },
                  { label: '감각', color: 'var(--ok)', items: p.signals.sensory },
                  { label: '독백', color: 'var(--warn)', items: [...p.signals.monologue, ...p.signals.innerAdv] },
                ].filter((g) => g.items.length > 0)
                return (
                  <div key={i} style={{ ...card, borderLeft: `4px solid ${L.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>단락 {i + 1}</span>
                      <span style={{ fontSize: 15 }}><Emoji e={L.icon}/></span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: L.color }}>{L.n}단계</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{L.name}</span>
                      {p.signals.dialogue > 0.25 && <span style={pill('var(--muted)')}>대사 {Math.round(p.signals.dialogue * 100)}%</span>}
                      {p.signals.firstPerson > 0 && <span style={pill('var(--ok)')}>1인칭</span>}
                      <span style={{ marginLeft: 'auto' }}>{meter(p.level)}</span>
                    </div>
                    <div style={{ ...preview, fontSize: 13.5, lineHeight: 1.75 }}>{renderHighlighted(p.text)}</div>
                    {sigChips.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        {sigChips.map((g) => (
                          <span key={g.label} style={{ ...pill(g.color), fontWeight: 400 }}>{g.label}: {g.items.slice(0, 3).join(', ')}{g.items.length > 3 ? '…' : ''}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ ...hint, fontSize: 11, marginTop: 6 }}>
                      더 가까이: {p.level < 5 ? `${LEVELS[p.level].n}단계 ${LEVELS[p.level].name}로 → ${p.level <= 2 ? '필터·요약을 줄이고 감각을 직접 보여주기' : p.level === 3 ? '"~보았다/느꼈다" 필터를 걷어내고 직접 묘사' : '인물 생각을 서술에 녹여 자유간접화법으로'}` : '이미 가장 가까운 의식 단계입니다'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
            <button className="linkbtn" onClick={addReportToProject} disabled={!hasProjectBridge() || paras.length === 0} title={hasProjectBridge() ? '진단 결과를 프로젝트 자료에 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={saveSnippet} disabled={paras.length === 0} title="진단 결과를 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫 저장</button>
            {hasStash() && <button className="linkbtn" onClick={stashReport} disabled={paras.length === 0} title="진단 결과를 수집함에 담기"><Emoji e="📥"/> 수집함</button>}
            {flash && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {flash}</span>}
          </div>

          <div style={hint}>거리는 "틀림"이 아니라 "선택"입니다. 이 진단은 호칭·필터 동사·감각/독백 어휘를 세는 휴리스틱이라 참고용이며, 의도된 거리 이동(예: 도입의 파노라마 → 장면 진입)은 자연스러운 흐름일 수 있습니다.</div>
        </>
      )}

      <div className="license-note" style={{ ...hint, fontSize: 11 }}>모든 설명·예시는 직접 작성한 창작 텍스트입니다. 외부 API·이미지·폰트를 사용하지 않으며 전부 로컬에서 동작합니다.</div>
    </div>
  )
}
