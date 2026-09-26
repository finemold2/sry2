// 서술 거리 다이얼 — 심리적 서술 거리(psychic distance)를 5단계로 진단하고,
// 한 단계 "당기기(근경화)" 또는 "밀기(원경화)" 변환 가이드를 문장별로 제시한다.
//
// 서술 거리 5단계(원경 1 ↔ 근경 5):
//   1 원경: 시대/장소를 멀리서 부감. 인물은 호칭/직함, 객관 사실 위주.
//   2 중경: 인물 이름·행동 관찰. 외부 묘사 중심, 내면 표지는 거의 없음.
//   3 근경: 인물의 시선·감각이 끼어든다(보였다/느껴졌다, ~인 듯). 자유간접화법 진입.
//   4 밀착: 직접적 생각·판단·정서(생각했다·싫었다)와 의문/감탄이 본문에 스민다.
//   5 융합: 인물 의식과 서술이 합쳐짐. 내적 독백·현재성·파편·감각의 직접 분출.
//
// 진단은 한국어 어미·어휘·문형 단서로 각 문장의 거리 점수를 추정한다(결정론적, 100% 로컬).
// 변환 가이드는 단서별로 "당기려면 / 밀려면" 구체 조작을 제시한다(자동 치환이 아닌 코칭).
//
// 자급식: react 와 ./linkbus 만 import. 외부 네트워크/API 없음.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  type SharedSnippet,
} from './linkbus'

export const meta = {
  id: 'narrative-distance-dial',
  name: '서술 거리 다이얼',
  icon: '🔭',
  group: '교정·언어',
  intro: '심리적 서술 거리(원경↔근경 5단계)를 진단하고 한 단계 당기거나 미는 변환 가이드를 제시합니다',
  w: 480,
  h: 640,
}

const LS_KEY = 'sry:tool:narrative-distance-dial'

// ── 거리 단계 메타 ────────────────────────────────────────────
type Level = 1 | 2 | 3 | 4 | 5
interface LevelMeta { level: Level; tag: string; color: string; lens: string; desc: string }
const LEVELS: LevelMeta[] = [
  { level: 1, tag: '원경', color: '#5b7fb5', lens: '부감', desc: '세계를 멀리서 조망. 호칭·사실 위주, 내면 없음.' },
  { level: 2, tag: '중경', color: '#4a9aa0', lens: '관찰', desc: '인물의 외부 행동을 객관 관찰. 카메라가 따라간다.' },
  { level: 3, tag: '근경', color: '#6aa85a', lens: '시선', desc: '인물의 감각·지각이 서술에 스민다. 자유간접 진입.' },
  { level: 4, tag: '밀착', color: '#c79a3a', lens: '의식', desc: '직접 생각·정서·판단이 본문에 드러난다.' },
  { level: 5, tag: '융합', color: '#c2603a', lens: '몰입', desc: '의식과 서술이 합쳐짐. 내적 독백·현재성·파편.' },
]
const levelMeta = (l: Level) => LEVELS[l - 1]

// ── 단서 사전 ─────────────────────────────────────────────────
// 각 단서는 거리 점수에 가중치를 더한다(양수=근경 쪽, 음수=원경 쪽).
// kind 로 변환 가이드를 분기한다.
type CueKind =
  | 'thoughtVerb'   // 직접 사고/지각 동사(생각했다, 느꼈다)
  | 'perception'    // 감각 표지(보였다, 들렸다, ~인 듯)
  | 'emotion'       // 정서 직접 진술(싫었다, 두려웠다)
  | 'interjection'  // 감탄/의문 본문 침투
  | 'present'       // 현재 시제/현장성
  | 'fragment'      // 단문·파편(몰입 신호)
  | 'title'         // 호칭/직함(거리 벌림)
  | 'objective'     // 객관·요약·시간경과(거리 벌림)
  | 'epithet'       // 그 남자/그 여자 등 익명 호칭

interface Cue { kind: CueKind; re: RegExp; w: number; label: string; pull: string; push: string }

const C = (src: string) => new RegExp(src, 'g')

const CUES: Cue[] = [
  // ── 근경/밀착 쪽(점수 +) ────────────────────────────────
  {
    kind: 'thoughtVerb', re: C('(생각|판단|결심|깨달|짐작|상상|기억|예감)(했|한|하|났|이 들)'),
    w: 22, label: '직접 사고 동사',
    pull: "사고 동사를 지우고 생각 내용을 본문에 직접 풀어 보세요. '~라고 생각했다' → 생각 자체를 자유간접/내적 독백으로.",
    push: "직접 사고를 외부 행동·사실로 환원하세요. '~라고 생각했다'를 빼고 인물이 보이는 행동만 남기면 거리가 벌어집니다.",
  },
  {
    kind: 'perception', re: C('(보였|들렸|느껴졌|보이|들리|느껴지|만져졌|냄새가)'),
    w: 16, label: '감각 지각 표지',
    pull: "지각 동사('보였다')를 줄이고 본 대상을 바로 서술하세요. '문이 보였다'→'문이 거기 있었다'처럼 인물 의식에 직접 닿게.",
    push: "지각 표지를 객관 진술로 바꾸세요. 누구의 감각인지 지우면 카메라 시점(중경)으로 물러납니다.",
  },
  {
    kind: 'perception', re: C('(인\\s*듯|것\\s*같|듯했|듯이|처럼\\s*보)'),
    w: 12, label: '추측·인상 표지',
    pull: "'~인 듯' 같은 완충을 줄이고 인물이 확신하는 지각으로 단언하면 더 가까워집니다.",
    push: "추측 표지는 관찰자 거리를 만들어 줍니다. 유지하거나, 외부 사실 진술로 바꾸세요.",
  },
  {
    kind: 'emotion', re: C('(싫었|좋았|두려웠|무서웠|슬펐|기뻤|화가\\s*났|외로웠|불안했|설렜|아팠|행복했|역겨)'),
    w: 20, label: '정서 직접 진술',
    pull: "정서를 이름붙이는 대신('두려웠다') 몸의 반응·생각의 흐름으로 보여 주면 더 밀착됩니다.",
    push: "직접 정서를 외부 징후나 요약으로 바꾸세요. '두려웠다'→'그는 한 걸음 물러섰다'로 하면 관찰 거리가 생깁니다.",
  },
  {
    kind: 'interjection', re: C('(아아|아니|설마|제발|어째서|대체|도대체|그래,|맞아|이런,|그럴\\s*리|왜\\s*하필)'),
    w: 18, label: '감탄·의문의 본문 침투',
    pull: "인물의 외침·의문을 더 끌어들이세요. 본문에 직접 '왜 하필 지금?'처럼 두면 의식과 융합됩니다.",
    push: "본문에 스민 감탄/의문을 간접 보고로 돌리세요. '설마' 같은 말을 빼면 서술자가 한 발 물러섭니다.",
  },
  {
    kind: 'interjection', re: C('[가-힣A-Za-z]+[?？！]'),
    w: 8, label: '물음표·느낌표 종결',
    pull: "수사의문·감탄 종결을 본문 안에 더 두면 인물 의식이 직접 들립니다.",
    push: "의문·감탄 종결을 평서로 바꾸면 정동이 가라앉고 거리가 멀어집니다.",
  },
  {
    kind: 'present', re: C('(한다\\.|이다\\.|있다\\.(?=\\s|$)|온다|간다|본다|선다|운다|뛴다|멈춘다)'),
    w: 10, label: '현재 시제·현장성',
    pull: "장면 핵심을 현재형으로 두면 즉시성이 생겨 더 가까워집니다(부분적으로만).",
    push: "현재형을 과거 요약형으로 바꾸면 사건이 이미 끝난 일처럼 멀어집니다.",
  },
  {
    kind: 'fragment', re: C('(^|\\n)\\s*[가-힣A-Za-z“"\'][^.!?\\n]{0,14}[.!?…]'),
    w: 9, label: '단문·파편(몰입 리듬)',
    pull: "짧은 파편 문장을 더 섞으면 호흡이 빨라지고 의식의 박동에 가까워집니다.",
    push: "파편을 이어 붙여 긴 종합문으로 만들면 서술자의 정리된 거리가 회복됩니다.",
  },
  // ── 원경/중경 쪽(점수 -) ────────────────────────────────
  {
    kind: 'title', re: C('(대통령|장군|박사|선생|교수|회장|사장|국왕|여왕|공작|백작|남작|기사|소령|대령|중위|형사|반장|부장|과장)'),
    w: -16, label: '직함·호칭(거리 벌림)',
    pull: "직함 대신 이름·대명사로 부르면 인물이 가까워집니다. '대령'→'그' 또는 이름.",
    push: "직함·호칭은 사회적 거리를 만듭니다. 유지하거나 더 격식 있는 명명으로 멀리 두세요.",
  },
  {
    kind: 'epithet', re: C('(그\\s*남자|그\\s*여자|그\\s*사내|한\\s*남자|한\\s*여자|낯선\\s*이|그\\s*노인|그\\s*아이)'),
    w: -14, label: '익명 호칭(타자화)',
    pull: "'그 남자' 같은 익명 호칭을 이름으로 바꾸면 독자가 인물에 묶입니다.",
    push: "익명 호칭은 관찰자 시점을 강화합니다. 미스터리·도입부 거리감에 활용하세요.",
  },
  {
    kind: 'objective', re: C('(그\\s*무렵|그\\s*해|몇\\s*년|수년|오래전|훗날|이윽고|마침내|한편|당시|그\\s*시절|세월|역사|시대)'),
    w: -15, label: '요약·시간 경과(부감)',
    pull: "요약·시간 도약을 줄이고 한 장면 안에 머물면 거리가 좁혀집니다. 'scene' 모드로 들어가세요.",
    push: "요약·시간 경과 표지는 부감(원경)을 만듭니다. 도입·전환·에필로그에서 의도적으로 쓰세요.",
  },
  {
    kind: 'objective', re: C('(라고\\s*불렸|로\\s*알려|전해진다|전해졌|기록되어|사람들은|모두가|누구나|세상은)'),
    w: -18, label: '집단·전언 서술(서사적 거리)',
    pull: "'사람들은'·'전해진다' 같은 집단 시점을 한 인물의 구체 경험으로 좁히세요.",
    push: "집단·전언 서술은 전지적·전설적 거리를 줍니다. 신화·연대기 톤에 적합합니다.",
  },
]

// ── 문장 분리 ────────────────────────────────────────────────
// 따옴표 안의 종결부호로 끊기지 않게 처리. 줄바꿈은 약한 경계로 본다.
function splitSentences(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = []
  let buf = ''
  let start = 0
  let inQuote: string | null = null
  const opens: Record<string, string> = { '“': '”', '‘': '’', '「': '」', '『': '』', '"': '"', "'": "'" }
  const chars = [...text]
  let pos = 0
  const flush = (endPos: number) => {
    const t = buf.trim()
    if (t) out.push({ text: t, start, end: endPos })
    buf = ''
    start = endPos
  }
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    buf += ch
    const cur = pos
    pos += ch.length
    if (inQuote) {
      if (ch === inQuote) inQuote = null
      continue
    }
    if (opens[ch]) { inQuote = opens[ch]; continue }
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…' || ch === '。' || ch === '！' || ch === '？') {
      // 다음 글자가 종결부호/공백/끝이면 경계로 인정
      const next = chars[i + 1]
      if (!next || /[\s”’」』"')\]]/.test(next) || /[.!?…]/.test(next) === false) {
        flush(cur + ch.length)
      }
    } else if (ch === '\n') {
      const t = buf.trim()
      if (t) flush(cur + ch.length)
      else { buf = ''; start = pos }
    }
  }
  flush(pos)
  return out
}

// ── 한 문장 진단 ─────────────────────────────────────────────
interface Finding { cue: Cue; count: number }
interface SentDiag {
  idx: number
  text: string
  start: number
  end: number
  level: Level
  raw: number            // 누적 점수
  findings: Finding[]
}

function diagnoseSentence(s: string): { level: Level; raw: number; findings: Finding[] } {
  let raw = 0
  const findings: Finding[] = []
  for (const cue of CUES) {
    cue.re.lastIndex = 0
    let cnt = 0
    let guard = 0
    while (cue.re.exec(s) !== null) {
      cnt++
      if (cue.re.lastIndex === 0) break
      if (++guard > 200) break
    }
    if (cnt > 0) {
      // 같은 단서가 여러 번이면 체감 가중(로그 완화)
      const eff = cue.w * (1 + Math.log2(1 + cnt) * 0.6)
      raw += eff
      findings.push({ cue, count: cnt })
    }
  }
  // 짧은 문장 자체는 약한 근경 신호
  const visible = s.replace(/\s/g, '').length
  if (visible > 0 && visible <= 10) raw += 6
  if (visible >= 70) raw -= 8

  // 점수 → 5단계 매핑(기준선: 0 부근이 중경)
  let level: Level
  if (raw <= -16) level = 1
  else if (raw < 8) level = 2
  else if (raw < 26) level = 3
  else if (raw < 46) level = 4
  else level = 5
  findings.sort((a, b) => Math.abs(b.cue.w) - Math.abs(a.cue.w))
  return { level, raw, findings }
}

function diagnose(text: string): SentDiag[] {
  const sents = splitSentences(text)
  return sents.map((s, i) => {
    const d = diagnoseSentence(s.text)
    return { idx: i, text: s.text, start: s.start, end: s.end, ...d }
  })
}

// 문자열 해시(결정론적 의사난수 시드 — 샘플 선택 등)
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// ── 샘플 ─────────────────────────────────────────────────────
const SAMPLE = [
  '오래전 그 도시는 강을 끼고 번성했고, 사람들은 그곳을 잊혀진 항구라 불렀다.',
  '한 남자가 부두에 서 있었다. 그는 외투 깃을 세우고 바다를 바라보았다.',
  '회색 물결 너머로 등대가 보였다. 불빛이 깜빡일 때마다 가슴 한쪽이 서늘해지는 듯했다.',
  '왜 하필 지금일까. 그는 돌아가고 싶지 않다고 생각했다. 두려웠다.',
  '바람. 소금. 멀어지는 뱃고동. 돌아선다. 더는 기다리지 않는다.',
].join(' ')

// ── 분포 막대(작은 시각화) ───────────────────────────────────
function Histogram({ diags }: { diags: SentDiag[] }) {
  const counts = [0, 0, 0, 0, 0]
  for (const d of diags) counts[d.level - 1]++
  const max = Math.max(1, ...counts)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
      {LEVELS.map((lm, i) => {
        const h = (counts[i] / max) * 52 + 2
        return (
          <div key={lm.level} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', height: 12 }}>{counts[i] || ''}</div>
            <div style={{ width: '100%', height: h, background: lm.color, borderRadius: '4px 4px 0 0', opacity: counts[i] ? 1 : 0.25 }} />
            <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{lm.tag}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function NarrativeDistanceDial({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<Level>(3)      // 다이얼: 목표 거리
  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const restored = useRef(false)
  const seeded = useRef(false)

  const snippets = useLibraryList('snippets')

  // 복원
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { text?: string; target?: number }
        if (typeof p.text === 'string') setText(p.text)
        if (p.target && p.target >= 1 && p.target <= 5) setTarget(p.target as Level)
      }
    } catch { /* noop */ }
  }, [])

  // payload.text 수용(드롭/관련도구 열기)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const pt = payload?.text
    if (typeof pt === 'string' && pt.trim()) setText(pt)
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, target })) } catch { /* noop */ }
  }, [text, target])

  useEffect(() => () => { if (toastTimer.current != null) clearTimeout(toastTimer.current) }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1600)
  }, [])

  const diags = useMemo(() => {
    try { return diagnose(text) } catch { return [] }
  }, [text])

  const avg = useMemo(() => {
    if (!diags.length) return 0
    return diags.reduce((a, d) => a + d.level, 0) / diags.length
  }, [diags])

  // 목표 거리에서 벗어난(차이 >=2) 문장 = 우선 손볼 곳
  const offTarget = useMemo(
    () => diags.filter((d) => Math.abs(d.level - target) >= 2),
    [diags, target],
  )

  const sel = selIdx != null ? diags[selIdx] : null

  // 본문에서 해당 문장 선택
  const jumpTo = (d: SentDiag) => {
    setSelIdx(d.idx)
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(d.start, d.end) } catch { /* noop */ }
  }

  // 드롭(바인더 문서)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item?.text) { setText(item.text); flash('바인더 문서를 불러왔습니다'); return }
    const plain = (() => { try { return e.dataTransfer.getData('text/plain') } catch { return '' } })()
    if (plain.trim()) { setText(plain); flash('텍스트를 불러왔습니다') }
  }

  // 진단 리포트 텍스트(복사/내보내기/수집함 공용)
  const report = useMemo(() => {
    if (!diags.length) return ''
    const head = `[서술 거리 진단] 평균 ${avg.toFixed(1)}/5 · 목표 ${target}(${levelMeta(target).tag}) · 문장 ${diags.length}개\n`
    const body = diags.map((d) => {
      const lm = levelMeta(d.level)
      const cues = d.findings.slice(0, 3).map((f) => f.cue.label).join(', ') || '뚜렷한 단서 없음'
      const gap = d.level === target ? '' : ` (목표와 ${d.level > target ? '+' : ''}${d.level - target})`
      return `${d.idx + 1}. [${d.level} ${lm.tag}]${gap} ${d.text}\n   단서: ${cues}`
    }).join('\n')
    return head + '\n' + body
  }, [diags, avg, target])

  const copyReport = async () => {
    if (!report) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(report)
      else {
        const ta = document.createElement('textarea')
        ta.value = report; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('진단 리포트를 복사했습니다')
    } catch { flash('복사 실패') }
  }

  const saveSnippet = () => {
    if (!report) return
    addToLibrary('snippets', { text: report, source: '서술 거리 다이얼', tags: ['서술거리', `목표${target}`] })
    flash('스니펫 라이브러리에 저장했습니다')
  }

  const stashIt = () => {
    if (!hasStash() || !report) return
    addToStash({ kind: 'memo', label: `서술 거리 진단(평균 ${avg.toFixed(1)})`, text: report })
    flash('수집함에 담았습니다')
  }

  const toProject = () => {
    if (!hasProjectBridge() || !report) return
    const html = '<p>' + report.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>') + '</p>'
    addToProject({
      kind: 'text', root: 'research', folder: '교정 메모',
      title: `서술 거리 진단 (평균 ${avg.toFixed(1)}/5)`,
      bodyHtml: html,
      synopsis: `목표 ${target} · 문장 ${diags.length} · 벗어난 문장 ${offTarget.length}`,
      meta: { 도구: '서술 거리 다이얼', 평균거리: avg.toFixed(2), 목표거리: String(target) },
    })
    flash('프로젝트 자료에 추가했습니다')
  }

  // 선택 문장만 스니펫으로(변환 작업 단위)
  const stashSelected = (d: SentDiag) => {
    if (!hasStash()) return
    const lm = levelMeta(d.level)
    const guide = d.findings.length
      ? d.findings.slice(0, 3).map((f) => `· ${f.cue.label}: ` + (d.level < target ? f.cue.pull : f.cue.push)).join('\n')
      : '뚜렷한 단서가 없습니다. 명명·시제·내면 표지를 추가/제거해 거리를 조절하세요.'
    addToStash({ kind: 'memo', label: `[${d.level}${lm.tag}→${target}] 문장 변환`, text: `${d.text}\n\n${guide}` })
    flash('선택 문장 변환 메모를 수집함에 담았습니다')
  }

  // 스니펫 라이브러리에서 불러오기
  const loadSnippet = (sn: SharedSnippet) => { setText(sn.text); flash('스니펫을 불러왔습니다') }

  const sample = () => setText(SAMPLE)

  // 방향 결정(목표보다 멀면 당기기, 가까우면 밀기)
  const dirFor = (d: SentDiag): 'pull' | 'push' | 'ok' =>
    d.level < target ? 'pull' : d.level > target ? 'push' : 'ok'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 13, boxSizing: 'border-box', color: 'var(--text)' }
  const title: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }
  const taStyle: React.CSSProperties = {
    minHeight: 80, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: `1px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '10px 12px', fontSize: 14.5, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const row: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const dialWrap: React.CSSProperties = { display: 'flex', gap: 4, background: 'var(--chrome-2)', padding: 4, borderRadius: 10 }
  const dialBtn = (l: LevelMeta, active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 11, padding: '6px 2px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
    border: `1px solid ${active ? l.color : 'transparent'}`,
    background: active ? l.color : 'transparent',
    color: active ? '#fff' : 'var(--text)', fontWeight: active ? 700 : 500, userSelect: 'none', lineHeight: 1.25,
  })
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }
  const card = (active: boolean, border: string): React.CSSProperties => ({
    background: active ? 'var(--chrome-2)' : 'var(--panel)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderLeft: `4px solid ${border}`, borderRadius: 8, padding: '7px 9px', cursor: 'pointer',
  })
  const badge = (color: string): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })
  const sentTxt: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, color: 'var(--text)', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'], overflow: 'hidden' }
  const small: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 12 }
  const guideBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 200, overflowY: 'auto' }

  const tm = levelMeta(target)

  return (
    <div style={wrap}>
      <div style={title}>
        서술 거리(원경 1 ↔ 근경 5)를 문장마다 진단하고, 다이얼로 정한 목표까지 당기거나 미는 변환 방법을 안내합니다. 좌측 바인더 문서를 끌어다 놓아도 됩니다.
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => { setText(e.target.value); setSelIdx(null) }}
        onDragOver={(e) => { if (isItemDrag(e) || e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        placeholder="장면을 붙여넣거나 바인더 문서를 끌어다 놓으세요. 입력하는 동안 문장별 서술 거리를 분석합니다."
        spellCheck={false}
        aria-label="진단할 텍스트"
      />

      {/* 목표 거리 다이얼 */}
      <div>
        <div style={{ ...small, marginBottom: 4 }}>목표 거리(다이얼): <b style={{ color: tm.color }}>{target} {tm.tag} · {tm.lens}</b> — {tm.desc}</div>
        <div style={dialWrap} role="radiogroup" aria-label="목표 서술 거리">
          {LEVELS.map((l) => (
            <div key={l.level} style={dialBtn(l, target === l.level)} onClick={() => setTarget(l.level)} role="radio" aria-checked={target === l.level} tabIndex={0}>
              <div style={{ fontWeight: 700 }}>{l.level}</div>
              <div>{l.tag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div style={row}>
        <button className="minibtn" type="button" onClick={sample}>예시</button>
        <button className="minibtn" type="button" onClick={() => { setText(''); setSelIdx(null) }} disabled={!text}>지우기</button>
        <span style={{ flex: 1 }} />
        <button className="minibtn" type="button" onClick={copyReport} disabled={!diags.length}>리포트 복사</button>
        <button className="minibtn" type="button" onClick={saveSnippet} disabled={!diags.length}>스니펫 저장</button>
        {hasStash() && <button className="minibtn" type="button" onClick={stashIt} disabled={!diags.length}>수집함</button>}
        {hasProjectBridge() && <button className="btn-primary" type="button" onClick={toProject} disabled={!diags.length}>프로젝트에 추가</button>}
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 13 }}>장면을 입력하면 문장마다 서술 거리를 1(원경)~5(근경)로 진단합니다.</div>
          <div style={small}>호칭·시간 경과는 거리를 벌리고, 직접 생각·감각·정서·감탄은 거리를 좁힙니다. 위 다이얼로 목표를 정하면 문장별로 당기기/밀기 방법을 알려 줍니다.</div>
          {snippets.length > 0 && (
            <div style={{ ...row, justifyContent: 'center' }}>
              <span style={small}>저장된 스니펫:</span>
              {snippets.slice(0, 4).map((sn) => (
                <button key={sn.id} className="minibtn" type="button" onClick={() => loadSnippet(sn)} title={sn.text.slice(0, 60)}>
                  {(sn.text.split('\n')[0] || sn.text).slice(0, 14)}…
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 요약 + 분포 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ minWidth: 96 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: levelMeta(Math.max(1, Math.min(5, Math.round(avg))) as Level).color, lineHeight: 1 }}>
                {avg.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--muted)' }}> /5</span>
              </div>
              <div style={small}>평균 거리</div>
              <div style={{ ...small, marginTop: 3, color: offTarget.length ? 'var(--warn)' : 'var(--ok)' }}>
                목표 이탈 {offTarget.length}문장
              </div>
            </div>
            <div style={{ flex: 1 }}><Histogram diags={diags} /></div>
          </div>

          {/* 문장 목록 */}
          <div style={listWrap}>
            {diags.map((d) => {
              const lm = levelMeta(d.level)
              const dir = dirFor(d)
              const flagged = Math.abs(d.level - target) >= 2
              return (
                <div key={d.idx} style={card(selIdx === d.idx, lm.color)} onClick={() => jumpTo(d)} title="클릭하면 본문에서 선택됩니다">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={badge(lm.color)}>{d.level} {lm.tag}</span>
                    {dir !== 'ok' && (
                      <span style={{ ...small, color: dir === 'pull' ? levelMeta(target).color : 'var(--muted)', fontWeight: 700 }}>
                        {dir === 'pull' ? `목표까지 당기기 (+${target - d.level})` : `목표까지 밀기 (${target - d.level})`}
                      </span>
                    )}
                    {dir === 'ok' && <span style={{ ...small, color: 'var(--ok)' }}>목표 일치</span>}
                    {flagged && <span style={{ ...small, color: 'var(--warn)' }}>우선</span>}
                    <span style={{ flex: 1 }} />
                    <span style={small}>#{d.idx + 1}</span>
                  </div>
                  <div style={sentTxt}>{d.text}</div>
                  {d.findings.length > 0 && (
                    <div style={{ ...small, marginTop: 3 }}>단서: {d.findings.slice(0, 3).map((f) => f.cue.label).join(' · ')}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 선택 문장 변환 가이드 */}
          {sel && (
            <div style={guideBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={badge(levelMeta(sel.level).color)}>{sel.level} {levelMeta(sel.level).tag}</span>
                <span style={{ fontSize: 11 }}>→</span>
                <span style={badge(tm.color)}>{target} {tm.tag}</span>
                <span style={{ flex: 1 }} />
                {hasStash() && <button className="minibtn" type="button" onClick={() => stashSelected(sel)}>변환 메모 담기</button>}
                <button className="minibtn" type="button" onClick={() => openToolLinked('passive-voice-ko', { text: sel.text })} title="피동·번역투 점검 도구로 이 문장 보내기">문장 다듬기</button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', fontStyle: 'italic' }}>{sel.text}</div>
              {dirFor(sel) === 'ok' ? (
                <div style={{ fontSize: 12.5, color: 'var(--ok)', lineHeight: 1.5 }}>이 문장은 목표 거리와 일치합니다. 톤을 유지하세요.</div>
              ) : sel.findings.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sel.findings.slice(0, 4).map((f, i) => (
                    <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      <b style={{ color: 'var(--accent)' }}>{f.cue.label}</b>{f.count > 1 ? ` (${f.count})` : ''}<br />
                      <span style={{ color: 'var(--muted)' }}>{dirFor(sel) === 'pull' ? f.cue.pull : f.cue.push}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {dirFor(sel) === 'pull'
                    ? '당기려면: 직함을 이름으로, 요약을 장면으로 바꾸고 인물의 감각·생각·정서를 본문에 직접 들이세요.'
                    : '밀려면: 내면 표지를 빼고 외부 행동·사실로 환원하며, 호칭·시간 경과로 부감을 만드세요.'}
                </div>
              )}
              <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)' }}>규칙 기반 추정입니다. 거리는 의도된 선택일 수 있으니 문맥으로 판단하세요.</div>
            </div>
          )}
        </>
      )}

      {toast && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 12, padding: '6px 12px', borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,.25)', pointerEvents: 'none', zIndex: 5 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
