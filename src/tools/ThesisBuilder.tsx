// 학술 주제문·연구질문 빌더 — 연구 주제에서 연구 질문(RQ)·가설·주제문(thesis statement)까지
// 단계별로 좁혀 적고, 예시와 자동 점검(범위 적절성)으로 다듬은 뒤 여러 버전을 저장·비교한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬).
//  - 작업 내용·저장 버전은 localStorage 'sry:tool:thesis-builder' 에 JSON 으로 자동 저장/복원.
//  - 산출물(연구 주제·RQ·가설·주제문)을 프로젝트 자료 〈학술〉 폴더에 문서로 추가(미연결 시 disabled).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'thesis-builder', name: '학술 주제문·연구질문 빌더', icon: '🎓', group: '구상·정리', intro: '연구 주제→연구 질문→가설→주제문을 단계별로 좁히고 범위를 점검하세요', w: 680, h: 640 }

const LS_KEY = 'sry:tool:thesis-builder'

// ---------- 작업 상태 ----------
interface Draft {
  topic: string         // 1) 연구 주제 (넓은 관심 분야)
  question: string      // 2) 연구 질문 (RQ)
  hypothesis: string    // 3) 가설 (예상 답)
  thesis: string        // 4) 주제문 (thesis statement)
}
const blankDraft = (): Draft => ({ topic: '', question: '', hypothesis: '', thesis: '' })

interface Version extends Draft {
  id: string
  label: string
  createdAt: number
}

// ---------- 단계 정의 ----------
type Field = keyof Draft
interface Step {
  field: Field
  no: number
  name: string
  icon: string
  desc: string
  placeholder: string
  guide: string[]      // 작성 가이드(질문/체크)
}

const STEPS: Step[] = [
  {
    field: 'topic', no: 1, name: '연구 주제', icon: '📚',
    desc: '관심 있는 넓은 분야·소재. 아직 질문이 아니어도 됩니다.',
    placeholder: '예: SNS 사용이 청소년에게 미치는 영향',
    guide: [
      '내가 정말 궁금한 분야인가?',
      '관련 선행 연구·자료를 찾을 수 있는가?',
      '너무 넓다면 대상·시기·맥락을 한정해 보세요.',
    ],
  },
  {
    field: 'question', no: 2, name: '연구 질문(RQ)', icon: '❓',
    desc: '주제를 “답할 수 있는 하나의 물음”으로 좁힙니다.',
    placeholder: '예: SNS 일일 사용 시간은 한국 고등학생의 학업 성취도와 어떤 관계가 있는가?',
    guide: [
      '“예/아니오”로 끝나지 않고 분석이 필요한가?',
      '핵심 변수(무엇이↔무엇에)가 분명한가?',
      '대상·범위(누구·언제·어디)가 한정되었는가?',
      '경험적·논리적으로 답할 수 있는가?',
    ],
  },
  {
    field: 'hypothesis', no: 3, name: '가설', icon: '🔬',
    desc: '연구 질문에 대한 검증 가능한 예상 답(방향)입니다.',
    placeholder: '예: SNS 사용 시간이 길수록 학업 성취도는 낮을 것이다.',
    guide: [
      '연구 질문에 직접 답하고 있는가?',
      '관계의 방향(증가/감소·정적/부적)이 명시되었는가?',
      '반증 가능한가(틀릴 수 있는 형태인가)?',
      '논증형 글이라면 “핵심 주장”으로 바꿔 써도 됩니다.',
    ],
  },
  {
    field: 'thesis', no: 4, name: '주제문(Thesis)', icon: '🎯',
    desc: '글 전체가 입증할 한 문장. 입장 + 근거 방향이 담깁니다.',
    placeholder: '예: 본 연구는 한국 고등학생을 대상으로 SNS 사용 시간이 학업 성취도를 유의하게 낮춤을, 수면 시간 매개를 통해 밝힌다.',
    guide: [
      '하나의 또렷한 입장(주장)을 담았는가?',
      '“무엇을, 어떻게(근거·방법)” 보일지 암시하는가?',
      '단순 사실 진술이 아니라 논쟁 가능한가?',
      '한 문장으로 압축되었는가?',
    ],
  },
]

// ---------- 예시(여러 분야) ----------
interface Example {
  field: string
  topic: string
  question: string
  hypothesis: string
  thesis: string
}
const EXAMPLES: Example[] = [
  {
    field: '교육학',
    topic: 'SNS 사용이 청소년에게 미치는 영향',
    question: 'SNS 일일 사용 시간은 한국 고등학생의 학업 성취도와 어떤 관계가 있는가?',
    hypothesis: 'SNS 사용 시간이 길수록 학업 성취도는 낮을 것이다(수면 시간 감소를 매개로).',
    thesis: '본 연구는 한국 고등학생을 대상으로 SNS 사용 시간이 수면 부족을 매개하여 학업 성취도를 유의하게 낮춤을 보인다.',
  },
  {
    field: '문학(논증)',
    topic: '《1984》의 언어와 권력',
    question: '오웰은 《1984》에서 “신어(Newspeak)”를 통해 사고 통제를 어떻게 형상화하는가?',
    hypothesis: '신어는 어휘 축소로 반체제적 사고 자체를 불가능하게 만드는 장치로 기능한다.',
    thesis: '《1984》의 신어는 단순한 검열을 넘어, 사고의 도구인 언어를 축소함으로써 저항의 가능성 자체를 제거하는 권력 기술로 작동한다.',
  },
  {
    field: '사회학',
    topic: '도시 1인 가구의 증가',
    question: '20–30대 1인 가구의 증가는 지역 공동체 참여를 어떻게 변화시키는가?',
    hypothesis: '1인 가구 비율이 높은 지역일수록 전통적 공동체 참여는 낮지만, 온라인 기반 느슨한 연결은 강해진다.',
    thesis: '청년 1인 가구의 확산은 대면 공동체를 약화시키는 동시에 온라인 매개의 선택적 연대를 새로운 사회적 자본의 형태로 부상시킨다.',
  },
  {
    field: '역사학',
    topic: '조선 후기 상업의 발달',
    question: '18세기 장시(場市)의 확산은 신분 질서에 어떤 균열을 가져왔는가?',
    hypothesis: '장시를 통한 부의 축적은 일부 평민·천민의 신분 상승 경로를 열어 신분제를 안에서부터 약화시켰다.',
    thesis: '18세기 장시의 확산은 화폐 경제를 매개로 평민 부농층을 형성함으로써, 법제는 유지되었으나 실질적 신분 질서를 잠식했다.',
  },
  {
    field: '환경과학',
    topic: '도시 녹지와 열섬',
    question: '도시 가로수 면적은 여름철 평균 지표 온도와 어떤 관계가 있는가?',
    hypothesis: '단위 면적당 가로수 피복률이 높을수록 여름철 지표 온도는 유의하게 낮아진다.',
    thesis: '본 연구는 도시 가로수 피복률의 증가가 증발산과 차광을 통해 여름철 열섬 강도를 완화함을 위성 영상 분석으로 입증한다.',
  },
]

// ---------- 범위·품질 자동 점검 ----------
type Sev = 'good' | 'warn' | 'tip'
interface Check { sev: Sev; msg: string }

const QUESTION_WORDS = ['왜', '어떻게', '어떤', '무엇', '얼마나', '어느', '관계', '영향', '차이', '효과', '요인', '원인']
const YESNO_PAT = /(인가|있는가|없는가|되는가|할까|일까)\??\s*$/
const VAGUE = ['좋다', '나쁘다', '중요하다', '많다', '흥미롭다', '관심', '에 대해', '에 관해', '에 대한']

function countChars(s: string) { return s.replace(/\s/g, '').length }

function checkTopic(s: string): Check[] {
  const out: Check[] = []
  const t = s.trim()
  if (!t) return out
  const n = countChars(t)
  if (n < 4) out.push({ sev: 'warn', msg: '주제가 너무 짧습니다. 대상·맥락을 한두 단어 더해 보세요.' })
  if (n > 40) out.push({ sev: 'tip', msg: '주제가 넓습니다. 다음 단계(연구 질문)에서 한 가지 측면으로 좁히세요.' })
  if (!/\s/.test(t) && n <= 6) out.push({ sev: 'tip', msg: '한 단어 주제는 범위가 넓습니다. “언제·누구·어디”로 한정해 보세요.' })
  if (out.length === 0) out.push({ sev: 'good', msg: '관심 분야가 잡혔습니다. 이제 답할 수 있는 질문으로 좁혀 보세요.' })
  return out
}

function checkQuestion(s: string): Check[] {
  const out: Check[] = []
  const t = s.trim()
  if (!t) return out
  const n = countChars(t)
  const hasQ = t.includes('?') || t.includes('가') || /\?$/.test(t)
  const hasInterrogative = QUESTION_WORDS.some((w) => t.includes(w))
  if (!t.endsWith('?') && !/(가|까|는가|을까)\s*\??$/.test(t)) {
    out.push({ sev: 'tip', msg: '의문문 형태(…인가? / …는 어떤 관계가 있는가?)로 끝맺으면 더 명확합니다.' })
  }
  if (YESNO_PAT.test(t) && !hasInterrogative) {
    out.push({ sev: 'warn', msg: '“예/아니오”로 답할 수 있는 질문입니다. “왜·어떻게·어떤 관계” 형태로 분석을 요구하도록 바꿔 보세요.' })
  }
  if (!hasInterrogative) {
    out.push({ sev: 'tip', msg: '핵심 의문사(왜·어떻게·어떤·얼마나)나 관계어(영향·관계·차이)를 넣으면 분석 방향이 분명해집니다.' })
  }
  if (n < 10) out.push({ sev: 'warn', msg: '질문이 너무 짧습니다. 변수와 대상(누가·무엇이↔무엇에)을 드러내세요.' })
  if (n > 70) out.push({ sev: 'tip', msg: '질문이 깁니다. 한 번에 묻는 것을 하나로 줄이면 답하기 쉬워집니다.' })
  if (/그리고|및|와\s|과\s/.test(t) && (t.match(/[?]/g)?.length ?? 0) === 0 && /(어떤|어떻게).*(어떤|어떻게)/.test(t)) {
    out.push({ sev: 'warn', msg: '두 가지를 한꺼번에 묻고 있을 수 있습니다. 핵심 하나로 좁혀 보세요.' })
  }
  void hasQ
  if (out.every((c) => c.sev !== 'warn') && hasInterrogative) {
    out.unshift({ sev: 'good', msg: '분석을 요구하는 한정된 질문입니다. 좋은 출발점이에요.' })
  }
  return out
}

function checkHypothesis(s: string, q: string): Check[] {
  const out: Check[] = []
  const t = s.trim()
  if (!t) return out
  const n = countChars(t)
  const hasDirection = /(높|낮|증가|감소|클|작|많|적|강|약|정적|부적|긍정|부정|유의|커질|작아질|이다\.?$|것이다)/.test(t)
  if (t.endsWith('?')) out.push({ sev: 'warn', msg: '가설은 질문이 아니라 “예상 답(평서문)”이어야 합니다.' })
  if (!hasDirection) out.push({ sev: 'tip', msg: '관계의 방향(증가/감소·정적/부적 등)을 명시하면 검증이 쉬워집니다.' })
  if (n < 6) out.push({ sev: 'warn', msg: '가설이 너무 막연합니다. 무엇이 무엇에 어떤 영향을 주는지 적어 보세요.' })
  if (q.trim() && !/(높|낮|증가|감소|영향|관계|차이|효과|많|적)/.test(t)) {
    out.push({ sev: 'tip', msg: '연구 질문에 직접 답하는 형태인지 확인하세요(질문의 변수를 그대로 받기).' })
  }
  if (out.every((c) => c.sev !== 'warn') && hasDirection) {
    out.unshift({ sev: 'good', msg: '방향이 분명한 검증 가능한 가설입니다.' })
  }
  return out
}

function checkThesis(s: string): Check[] {
  const out: Check[] = []
  const t = s.trim()
  if (!t) return out
  const n = countChars(t)
  const sentences = t.split(/[.!?。]\s*/).filter(Boolean)
  if (sentences.length > 2) out.push({ sev: 'tip', msg: '주제문은 가급적 한 문장으로 압축하세요. 지금은 여러 문장입니다.' })
  if (t.endsWith('?')) out.push({ sev: 'warn', msg: '주제문은 질문이 아니라 “입장(주장)”이어야 합니다.' })
  const vague = VAGUE.filter((v) => t.includes(v))
  if (vague.length) out.push({ sev: 'warn', msg: `모호한 표현(${vague.join(', ')})이 있습니다. 구체적 주장·근거로 바꾸세요.` })
  if (!/(밝힌|보인|입증|주장|논증|드러낸|분석|규명|제시|시사|작동|기능)/.test(t)) {
    out.push({ sev: 'tip', msg: '“…을 밝힌다/보인다/논증한다”처럼 입증할 바를 동사로 못 박으면 강해집니다.' })
  }
  if (n < 12) out.push({ sev: 'warn', msg: '주제문이 짧습니다. “무엇을 + 어떻게(근거·방법)”가 드러나게 보강하세요.' })
  if (n > 110) out.push({ sev: 'tip', msg: '주제문이 깁니다. 핵심 주장 한 가지로 압축하세요.' })
  if (out.every((c) => c.sev !== 'warn') && n >= 12) {
    out.unshift({ sev: 'good', msg: '입장이 또렷한 한 문장 주제문입니다.' })
  }
  return out
}

function runChecks(field: Field, d: Draft): Check[] {
  switch (field) {
    case 'topic': return checkTopic(d.topic)
    case 'question': return checkQuestion(d.question)
    case 'hypothesis': return checkHypothesis(d.hypothesis, d.question)
    case 'thesis': return checkThesis(d.thesis)
  }
}

// ---------- 영속 ----------
function loadState(): { cur: Draft; versions: Version[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: blankDraft(), versions: [] }
    const p = JSON.parse(raw)
    const cur: Draft = {
      topic: typeof p?.cur?.topic === 'string' ? p.cur.topic : '',
      question: typeof p?.cur?.question === 'string' ? p.cur.question : '',
      hypothesis: typeof p?.cur?.hypothesis === 'string' ? p.cur.hypothesis : '',
      thesis: typeof p?.cur?.thesis === 'string' ? p.cur.thesis : '',
    }
    const versions: Version[] = Array.isArray(p?.versions)
      ? p.versions
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Partial<Version>) => ({
            id: String(x.id || newId()),
            label: String(x.label || ''),
            topic: String(x.topic || ''),
            question: String(x.question || ''),
            hypothesis: String(x.hypothesis || ''),
            thesis: String(x.thesis || ''),
            createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
          }))
      : []
    return { cur, versions }
  } catch {
    return { cur: blankDraft(), versions: [] }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const SEV_ICON: Record<Sev, string> = { good: '✅', warn: '⚠️', tip: '💡' }
const SEV_COLOR: Record<Sev, string> = { good: 'var(--accent)', warn: 'var(--warn)', tip: 'var(--muted)' }

export default function ThesisBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [versions, setVersions] = useState<Version[]>(init.current.versions)
  const [label, setLabel] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 시작 주제를 받으면(선택) 빈 주제 칸에만 채운다.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const seed = payload && typeof payload.topic === 'string' ? payload.topic
      : payload && typeof payload.text === 'string' ? payload.text : ''
    if (seed && !init.current.cur.topic) setCur((p) => ({ ...p, topic: String(seed).slice(0, 120) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, versions }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, versions])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const setField = (k: Field, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const applyExample = (ex: Example) => {
    setCur({ topic: ex.topic, question: ex.question, hypothesis: ex.hypothesis, thesis: ex.thesis })
    setShowEx(false)
    flashNote(`${ex.field} 예시를 입력에 채웠습니다. 자신의 주제로 바꿔 보세요.`)
  }

  const hasInput = !!(cur.topic || cur.question || cur.hypothesis || cur.thesis)
  const filledCount = (['topic', 'question', 'hypothesis', 'thesis'] as Field[]).filter((f) => cur[f].trim()).length

  const saveVersion = () => {
    if (!hasInput) { flashNote('저장할 내용이 없습니다.'); return }
    const rec: Version = {
      id: editId || newId(),
      label: label.trim() || `버전 ${versions.length + 1}`,
      ...cur,
      createdAt: Date.now(),
    }
    if (editId) {
      setVersions((p) => p.map((v) => (v.id === editId ? { ...rec, createdAt: v.createdAt } : v)))
      flashNote('버전을 수정했습니다.')
    } else {
      setVersions((p) => [rec, ...p])
      flashNote('버전을 저장했습니다. 여러 버전을 만들어 비교해 보세요.')
    }
    setEditId(null)
    setLabel('')
  }

  const loadVersion = (v: Version) => {
    setCur({ topic: v.topic, question: v.question, hypothesis: v.hypothesis, thesis: v.thesis })
    setLabel(v.label)
    setEditId(v.id)
    setCompareMode(false)
    flashNote('불러왔습니다. 수정 후 저장하면 이 버전이 갱신됩니다.')
  }

  const removeVersion = (id: string) => {
    setVersions((p) => p.filter((v) => v.id !== id))
    if (editId === id) { setEditId(null); setLabel('') }
  }

  const move = (id: string, dir: -1 | 1) => {
    setVersions((p) => {
      const i = p.findIndex((v) => v.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const clearForm = () => {
    setCur(blankDraft())
    setEditId(null)
    setLabel('')
  }

  // ---------- 프로젝트 연계 ----------
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const buildBodyHtml = (d: Draft) => {
    const row = (icon: string, name: string, v: string) =>
      `<p><b>${escapeHtml(icon)} ${escapeHtml(name)}</b><br/>${v.trim() ? escapeHtml(v.trim()) : '<span style="color:#888;">(미작성)</span>'}</p>`
    const head = d.thesis.trim()
      ? `<p style="font-size:15px;line-height:1.7;"><b>🎯 ${escapeHtml(d.thesis.trim())}</b></p><hr/>`
      : ''
    return [
      head,
      row('📚', '연구 주제', d.topic),
      row('❓', '연구 질문(RQ)', d.question),
      row('🔬', '가설', d.hypothesis),
      row('🎯', '주제문(Thesis)', d.thesis),
    ].join('')
  }

  const addCurrentToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!hasInput) { flashNote('추가할 내용이 없습니다.'); return }
    const title = cur.thesis.trim()
      ? `🎓 ${cur.thesis.trim().slice(0, 50)}`
      : cur.question.trim()
        ? `🎓 ${cur.question.trim().slice(0, 50)}`
        : `🎓 ${cur.topic.trim().slice(0, 50) || '연구 주제문'}`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '학술',
      title,
      bodyHtml: buildBodyHtml(cur),
    })
    flashNote(id ? '프로젝트 자료 〈학술〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 저장된 모든 버전을 한 문서로 묶어 비교용으로 추가
  const addAllVersionsToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!versions.length) { flashNote('저장된 버전이 없습니다.'); return }
    const blocks = versions.map((v, i) =>
      `<h3>${i + 1}. ${escapeHtml(v.label)}</h3>${buildBodyHtml(v)}`
    ).join('<hr/>')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '학술',
      title: `🎓 주제문 버전 비교 (${versions.length}개)`,
      bodyHtml: blocks,
    })
    flashNote(id ? '버전 비교 문서를 〈학술〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const copyCurrentAsText = () => {
    const lines = STEPS.map((s) => `[${s.no}] ${s.name}: ${cur[s.field].trim() || '-'}`)
    copy(`# 학술 주제문 정리\n\n${lines.join('\n')}`, 'export-cur')
    flashNote('현재 단계 내용을 텍스트로 복사했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 400 }
  const ta: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, lineHeight: 1.6, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 46, fontFamily: 'inherit' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const verRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎓" /> 학술 주제문·연구질문 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>주제 → 연구 질문 → 가설 → 주제문</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 분야별 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {/* 진행 단계 표시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
          {STEPS.map((s, i) => {
            const done = !!cur[s.field].trim()
            return (
              <span key={s.field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                  border: '1px solid ' + (done ? 'var(--accent)' : 'var(--border)'),
                  background: done ? 'var(--accent)' : 'var(--chrome-2)',
                  color: done ? '#fff' : 'var(--muted)',
                }}><Emoji e={s.icon} /> {s.no}. {s.name}</span>
                {i < STEPS.length - 1 && <span style={{ color: 'var(--muted)' }}>→</span>}
              </span>
            )
          })}
          <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{filledCount}/4 단계</span>
        </div>

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>분야별 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.field} style={{ ...verRow, gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.field}</b>
                    <span style={{ ...sub }}>{ex.topic}</span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="❓" /> {ex.question}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, wordBreak: 'keep-all' }}><Emoji e="🎯" /> {ex.thesis}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 단계별 입력 + 점검 */}
        {STEPS.map((s) => {
          const checks = runChecks(s.field, cur)
          const val = cur[s.field]
          return (
            <div key={s.field} style={card}>
              <label style={fieldLabel}>
                <span><Emoji e={s.icon} /> {s.no}. {s.name}</span>
                <span style={sub}>{s.desc}</span>
              </label>
              <textarea
                style={ta}
                value={val}
                onChange={(e) => setField(s.field, e.target.value)}
                placeholder={s.placeholder}
                rows={s.field === 'thesis' ? 3 : 2}
              />
              <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                {/* 작성 가이드 */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ ...sub, marginBottom: 4 }}>작성 점검</div>
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {s.guide.map((g, i) => (
                      <li key={i} style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{g}</li>
                    ))}
                  </ul>
                </div>
                {/* 자동 점검 결과 */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ ...sub, marginBottom: 4 }}>범위·품질 자동 점검</div>
                  {checks.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>내용을 입력하면 자동으로 점검합니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {checks.map((c, i) => (
                        <div key={i} style={{ fontSize: 11.5, lineHeight: 1.45, color: SEV_COLOR[c.sev], display: 'flex', gap: 5 }}>
                          <span><Emoji e={SEV_ICON[c.sev]} /></span><span>{c.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* 저장/연계 */}
        <div style={card}>
          <h4 style={sectionTitle}>이 버전 저장 · 연계</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...input, flex: 1, minWidth: 160 }}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={editId ? '버전 이름' : '버전 이름 (예: 1차안 / 지도교수 피드백 후)'}
              maxLength={60}
            />
            <button className="btn-primary" onClick={saveVersion} disabled={!hasInput}>{editId ? '수정 저장' : <><Emoji e="💾" /> 버전 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setLabel('') }}>새 버전으로</button>}
          </div>
          <div className="linkbar" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="linkbar-label" style={sub}>연계:</span>
            <button className="minibtn" onClick={copyCurrentAsText} disabled={!hasInput}>{copied === 'export-cur' ? '✓ 복사됨' : <><Emoji e="📋" /> 텍스트 복사</>}</button>
            <button
              className="linkbtn"
              onClick={addCurrentToProject}
              disabled={!hasInput || !hasProjectBridge()}
              title={hasProjectBridge() ? '현재 4단계 내용을 프로젝트 자료 〈학술〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
        </div>

        {/* 저장한 버전 — 비교 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 버전 · {versions.length}개</h4>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="minibtn" onClick={() => setCompareMode((v) => !v)} disabled={versions.length < 2}>
                {compareMode ? '목록 보기' : <><Emoji e="🔍" /> 버전 비교</>}
              </button>
              <button
                className="linkbtn"
                onClick={addAllVersionsToProject}
                disabled={!versions.length || !hasProjectBridge()}
                title={hasProjectBridge() ? '모든 버전을 한 문서로 묶어 〈학술〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
              >
                <Emoji e="📄" /> 비교 문서 추가
              </button>
            </div>
          </div>

          {versions.length === 0 ? (
            <div style={empty}>
              아직 저장한 버전이 없습니다.<br />
              위에서 단계를 채우고 <b>버전 저장</b>을 누르면 여기에 쌓입니다.<br />
              <span style={{ fontSize: 12 }}>여러 버전을 만들어 <b><Emoji e="🔍" /> 버전 비교</b>로 나란히 견주어 보세요.</span>
            </div>
          ) : compareMode ? (
            // 비교 테이블
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', position: 'sticky', left: 0, background: 'var(--panel)', minWidth: 80 }}>단계</th>
                    {versions.map((v) => (
                      <th key={v.id} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', minWidth: 160, fontWeight: 700 }}>{v.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STEPS.map((s) => (
                    <tr key={s.field}>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', verticalAlign: 'top', position: 'sticky', left: 0, background: 'var(--panel)', whiteSpace: 'nowrap' }}><Emoji e={s.icon} /> {s.name}</td>
                      {versions.map((v) => (
                        <td key={v.id} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top', lineHeight: 1.5, wordBreak: 'keep-all', color: v[s.field].trim() ? 'var(--text)' : 'var(--muted)' }}>
                          {v[s.field].trim() || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {versions.map((v, i) => (
                <div key={v.id} style={{ ...verRow, border: '1px solid ' + (editId === v.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{v.label}</b>
                    <span style={{ ...sub }}>{new Date(v.createdAt).toLocaleDateString('ko-KR')}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => move(v.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => move(v.id, 1)} disabled={i === versions.length - 1}>▼</button>
                      <button style={iconBtn} title="주제문 복사" onClick={() => copy(v.thesis || v.question || v.topic, 'v' + v.id)}>{copied === 'v' + v.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadVersion(v)}><Emoji e="✏️" /></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeVersion(v.id)}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  {v.thesis.trim() && <div style={{ fontSize: 13.5, lineHeight: 1.6, wordBreak: 'keep-all' }}><Emoji e="🎯" /> {v.thesis}</div>}
                  {v.question.trim() && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e="❓" /> {v.question}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          넓은 <b>주제</b>를 답할 수 있는 <b>연구 질문</b>으로 좁히고, 질문에 대한 예상 답을 <b>가설</b>로, 글 전체가 입증할 한 문장을 <b>주제문</b>으로 못 박습니다.
          자동 점검은 범위·형식의 출발점일 뿐이니 분야 관행에 맞게 다듬으세요. 입력·버전은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
