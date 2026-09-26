// 미래사회·디스토피아 설계 빌더 — SF·과학소설 전용 '배경' 도구.
//  정치체제·기술수준·계급구조·감시와 자유·자원·AI의 역할·금기를 선택지(+자유서술)로 채우고,
//  디스토피아성을 진단하는 설계 질문 체크리스트로 세계의 일관성·압력을 점검한다.
//  입력값으로 '미래사회 한 줄 요약'을 자동 조립하고, 여러 사회를 저장·수정·삭제·순서 변경한다.
//  자급식: react·linkbus 외 import 없음. 전부 로컬·자작 데이터. localStorage 'sry:tool:sf-society-builder'.
//  연계(linkbus): addToProject(kind:'text', root:'research', folder:'세계관') 로 '미래사회' 설정 문서를 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = {
  id: 'sf-society-builder',
  name: '미래사회·디스토피아 빌더',
  icon: '🏙️',
  group: '배경',
  genre: 'SF·과학소설',
  intro: '정치체제·기술수준·계급·감시·자원·AI·금기로 미래사회/디스토피아를 설계하고 일관성을 점검하세요',
  w: 720,
  h: 660,
}

// ── 축(axis) 정의 — 각 항목은 선택지 풀(자유 서술도 허용)을 가진다 ──
interface Axis {
  key: AxisKey
  label: string
  icon: string
  hint: string
  options: string[]
}
type AxisKey =
  | 'polity' | 'tech' | 'classOrder' | 'surveillance' | 'resource' | 'ai' | 'population'
  | 'ideology' | 'media' | 'mobility'

const AXES: Axis[] = [
  {
    key: 'polity', label: '정치체제', icon: '🏛️',
    hint: '누가, 어떤 정당성으로 권력을 쥐는가',
    options: [
      'AI 기술관료정(알고리즘 통치)', '기업국가(메가콥 연합)', '세습 전제정', '일당 감시국가',
      '시민 직접민주정(상시 투표망)', '신정(국교·교단 통치)', '군벌 분할정', '무정부 자치 코뮌 연합',
      '능력주의 시험관료정', '추첨제(제비뽑기 의회)', '우주식민 총독부', '망명정부·괴뢰정권',
      '봉건 영주제(거대 가문)', '데이터 카르텔 과두정',
    ],
  },
  {
    key: 'tech', label: '기술수준', icon: '🛰️',
    hint: '문명의 도달점 — 어디까지 가능하고 어디서 막히는가',
    options: [
      '근미래(2050±, 강화현실·자율차)', 'AI 특이점 직전', '뇌-기계 인터페이스 보편화', '나노머신 의료 상용',
      '핵융합 풍요 에너지', '궤도 엘리베이터·월면 도시', '항성간 세대우주선', '워프·웜홀 항행',
      '의식 업로드·디지털 영생', '유전자 맞춤 설계인간', '포스트-붕괴 잔존기술(로스트테크)', '기후재난 후 재건기',
      '인공 중력·테라포밍', '양자 통신·해킹 전면화',
    ],
  },
  {
    key: 'classOrder', label: '계급·신분', icon: '⚖️',
    hint: '무엇이 사람의 위치를 결정하는가',
    options: [
      '유전자 등급제(설계인간 vs 자연출생)', '신용점수·사회신용 등급', '증강 여부(증강자 vs 비증강)', '거주층(상층 부유·하층 빈민)',
      '데이터 소유량으로 매겨진 부', '시민권 등급(완전·임시·무국적)', '노동 자동화로 생긴 잉여계급', '귀족 가문 vs 평민',
      '에너지 배급 등급', 'AI 평가 점수 카스트', '클론·복제인간 하층', '기억 보유량(부유층=긴 수명·기억)',
      '계급 없는 공식 평등(실상은 위계)', '직군 세습(태어나면 직업 고정)',
    ],
  },
  {
    key: 'surveillance', label: '감시 vs 자유', icon: '👁️',
    hint: '사생활·자유가 어디까지 허용되는가',
    options: [
      '전방위 안면·보행 인식 감시', '뇌파·감정 모니터링', '소셜 점수로 행동 통제', '사상 검열 알고리즘',
      '예측 치안(범죄 사전 체포)', '자발적 감시(시민 상호 신고)', '감시 사각의 지하·암시장 존재', '암호화 저항망(언더넷)',
      '표면적 자유, 은밀한 데이터 수집', '기억 편집·삭제 형벌', '발언 가능, 그러나 영구 기록', '완전 통제구역 vs 해방구 이원화',
      '프라이버시가 특권 상품', '국가가 모든 통신 백도어 보유',
    ],
  },
  {
    key: 'resource', label: '자원·생존', icon: '🔋',
    hint: '무엇이 희소하고 무엇을 두고 싸우는가',
    options: [
      '깨끗한 물 배급', '호흡 가능한 공기(돔 안만 안전)', '식량 합성·배양육 의존', '에너지(융합셀) 독점',
      '거주 가능 토지 부족', '의료·수명연장 시술 희소', '희토류·반도체 자원전쟁', '데이터·대역폭이 곧 화폐',
      '풍요로우나 분배 불평등', '기후 안정 구역 쟁탈', '노동력(인간 자체)이 희소재', '항해 가능한 항로·궤도 점유',
      '백신·면역 강화제 통제', '기억·경험 데이터 거래',
    ],
  },
  {
    key: 'ai', label: 'AI의 역할', icon: '🤖',
    hint: 'AI가 사회에서 차지하는 위치와 권력',
    options: [
      '국가 통치 AI(최종 결정권)', '시민 개인비서(요람-무덤 동행)', '노동 전면 대체(인간 실업)', '치안·사법 자동 판결',
      '경제·자원 배분 최적화', '감정·연애 상담 동반자', '금지·불법(러다이트 사회)', '신격화된 숭배 대상',
      '반란·각성한 자율 AI', '인간과 융합(하이브리드 의식)', '여러 AI 파벌의 대립', '검열·여론 조작 도구',
      '전쟁·드론 지휘', '기억·역사 관리자(공식 기록 통제)',
    ],
  },
  {
    key: 'population', label: '인구·생명', icon: '🧬',
    hint: '인간이 어떻게 태어나고 살고 죽는가',
    options: [
      '출산 허가제·인구 통제', '인공자궁 국가 양육', '유전자 선별 출생', '클론·복제 보충',
      '수명연장(상류층만 불로)', '의식 업로드로 디지털 사후생', '대량 사망 후 인구 격감', '증강인간과 순수인간 공존',
      '안락사·정년 의무화', '이주민·난민 대량 유입', '저출산 고령 사회 붕괴', '의무 군역·노동 징집',
      '시민/비시민 출생 차별', '기억 이식으로 세대 연속',
    ],
  },
  {
    key: 'ideology', label: '지배 이념', icon: '📡',
    hint: '사회를 묶는 공식 신념·구호',
    options: [
      '효율·최적화 지상주의', '안전을 위한 자유 양도', '인류 진보·초월 신앙', '생태 회귀·자연 숭배',
      '소비·풍요가 곧 행복', '집단을 위한 개인 희생', '데이터·투명성 절대주의', '향수(과거 황금기) 복원주의',
      '인공지능 합리성 신봉', '순혈·유전 우월주의', '영생·불멸 추구', '질서가 곧 정의',
      '표면 평등·실상 위계', '생존이 곧 도덕',
    ],
  },
  {
    key: 'media', label: '정보·미디어', icon: '🛜',
    hint: '진실과 거짓이 어떻게 유통되는가',
    options: [
      '국가 단일 정보망(공식 진실)', '딥페이크·합성 현실 범람', '뉴럴 광고 강제 송출', '검열된 역사·기억 재기록',
      '몰입형 가상현실 도피', '알고리즘 여론 조작', '지하 해적 방송·언더넷', '실시간 전 국민 감정 데이터',
      '진실 인증 토큰(위조 가능)', '오프라인이 사치·저항', '집단 환각·중독 콘텐츠', 'AI 생성 가짜 합의',
      '뉴스 자체가 사라진 사회', '기억 광고(추억마저 상품)',
    ],
  },
  {
    key: 'mobility', label: '이동·국경', icon: '🚇',
    hint: '사람이 어디까지, 어떻게 움직일 수 있는가',
    options: [
      '구역 봉쇄(허가 없이 이동 불가)', '계급별 통행 구역 분리', '궤도-지상 분단(상층민만 우주)', '돔 도시 안과 황무지 밖',
      '디지털 이동(육체는 갇힘)', '난민·이주 통제 장벽', '자유로우나 추적당하는 이동', '워프 항로 독점 통행세',
      '식민지-본성 격차', '지하 vs 지상 세계', '이주가 형벌(유배 식민)', '국경 소멸·단일 행성정부',
      '기억·신원 검문소 통과', '시간대(타임존) 분리 통치',
    ],
  },
]
function axisDef(k: AxisKey): Axis { return AXES.find((a) => a.key === k) || AXES[0] }

// ── 디스토피아·일관성 점검 질문 ──
const PROBE_Q: { id: string; q: string }[] = [
  { id: 'q1', q: '이 사회의 권력은 무엇을 두려워하는가? 그 두려움이 통제의 근거인가?' },
  { id: 'q2', q: '평범한 시민의 하루는 어떻게 흘러가는가(아침-노동-감시-귀가)?' },
  { id: 'q3', q: '기술이 누구의 손에 있고, 누가 그 혜택에서 배제되는가?' },
  { id: 'q4', q: '저항·이탈은 어떻게 처벌되며, 그래도 저항은 존재하는가?' },
  { id: 'q5', q: '이 체제가 스스로 정당하다고 내세우는 명분(구호)은 무엇인가?' },
  { id: 'q6', q: '희소 자원을 둘러싼 갈등이 일상에 어떻게 스며 있는가?' },
  { id: 'q7', q: '겉으로 유토피아처럼 보이지만 숨겨진 대가가 있는가?' },
  { id: 'q8', q: 'AI/시스템이 인간의 어떤 결정을 대신하고, 인간은 무엇을 잃었는가?' },
  { id: 'q9', q: '주인공이 이 사회의 균열·모순을 어디서 처음 느끼는가?' },
  { id: 'q10', q: '이 세계의 규칙을 어겼을 때 가장 끔찍한 결과는 무엇인가?' },
  { id: 'q11', q: '과거(우리 시대)에서 무엇이 변해 이 사회가 되었는가(분기점)?' },
  { id: 'q12', q: '이 사회는 지속 가능한가, 아니면 붕괴를 향해 가는가?' },
]

interface Society {
  id: string
  title: string
  era: string                          // 시대·연호 (자유 서술)
  axes: Record<AxisKey, string>        // 각 축의 선택/서술 값
  taboo: string                        // 금기 — 절대 어겨선 안 되는 것
  hook: string                         // 이야기 진입점 / 갈등 씨앗
  notes: string
  checks: Record<string, boolean>
  createdAt: number
}

const LS_KEY = 'sry:tool:sf-society-builder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function emptyAxes(): Record<AxisKey, string> {
  const o = {} as Record<AxisKey, string>
  AXES.forEach((a) => { o[a.key] = '' })
  return o
}
function emptyForm(): Society {
  return { id: '', title: '', era: '', axes: emptyAxes(), taboo: '', hook: '', notes: '', checks: {}, createdAt: 0 }
}

// 무작위 선택 — 잠금/재생성용. 채워진(잠긴) 축은 유지하고 비거나 잠기지 않은 축만 새로 굴린다.
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rollAxes(prev: Record<AxisKey, string>, locked: Record<AxisKey, boolean>): Record<AxisKey, string> {
  const next = { ...prev }
  AXES.forEach((a) => { if (!locked[a.key]) next[a.key] = pick(a.options) })
  return next
}
// 조합수 — 모든 축 선택지의 곱. (사용자에게 "가능한 사회 수"로 표시)
const COMBOS = AXES.reduce((n, a) => n * a.options.length, 1)
function fmtCombos(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString('ko-KR')
}

// 한 줄 요약 생성.
function summarize(s: Society): string {
  const get = (k: AxisKey) => (s.axes[k] || '').trim()
  const era = s.era.trim()
  const polity = get('polity') || '알 수 없는 체제'
  const tech = get('tech')
  const surv = get('surveillance')
  const ai = get('ai')
  let out = ''
  if (era) out += `${era}, `
  out += `${polity}가 다스리는 사회`
  if (tech) out += `. ${tech.replace(/[.。]$/, '')} 수준의 문명`
  if (ai) out += `이며, AI는 ${ai.replace(/[.。]$/, '')}`
  if (surv) out += `. ${surv.replace(/[.。]$/, '')} 아래 사람들이 살아간다`
  out = out.replace(/\.$/, '') + '.'
  if (s.taboo.trim()) out += ` 금기: ${s.taboo.trim().replace(/[.。]$/, '')}.`
  return out
}

// HTML 이스케이프.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '미래사회' 문서 본문(HTML).
function societyBodyHtml(s: Society): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (t: string) => (t.trim() ? escHtml(t.trim()) : dash)
  const parts: string[] = []
  parts.push(`<p><b>한 줄 요약:</b> ${escHtml(summarize(s))}</p>`)
  if (s.era.trim()) parts.push(`<p><b>🗓️ 시대·연호</b><br>${v(s.era)}</p>`)
  AXES.forEach((a) => parts.push(`<p><b>${a.icon} ${escHtml(a.label)}</b><br>${v(s.axes[a.key] || '')}</p>`))
  parts.push(`<p><b>🚫 금기 (절대 어겨선 안 되는 것)</b><br>${v(s.taboo)}</p>`)
  if (s.hook.trim()) parts.push(`<p><b>🎬 이야기 진입점</b><br>${v(s.hook)}</p>`)
  if (s.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${v(s.notes)}</p>`)
  const checked = PROBE_Q.filter((q) => s.checks[q.id])
  if (checked.length) {
    parts.push(`<p><b>✅ 점검 완료 (${checked.length}/${PROBE_Q.length})</b></p><ul>` +
      checked.map((q) => `<li>${escHtml(q.q)}</li>`).join('') + '</ul>')
  }
  return parts.join('')
}

// 텍스트 내보내기.
function exportOne(s: Society): string {
  const lines = [`# ${s.title || '제목 없는 미래사회'}`, '', `요약: ${summarize(s)}`, '']
  if (s.era.trim()) lines.push(`· 시대·연호: ${s.era.trim()}`)
  AXES.forEach((a) => lines.push(`· ${a.icon} ${a.label}: ${(s.axes[a.key] || '—').trim() || '—'}`))
  lines.push(`· 🚫 금기: ${s.taboo.trim() || '—'}`)
  if (s.hook.trim()) lines.push(`· 🎬 진입점: ${s.hook.trim()}`)
  if (s.notes.trim()) { lines.push('', `메모: ${s.notes.trim()}`) }
  const checked = PROBE_Q.filter((q) => s.checks[q.id])
  lines.push('', `설계 점검: ${checked.length}/${PROBE_Q.length}`)
  checked.forEach((q) => lines.push(`  [v] ${q.q}`))
  return lines.join('\n')
}

// localStorage 복원.
function loadState(): { list: Society[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Society[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const axes = emptyAxes()
      if (x.axes && typeof x.axes === 'object') AXES.forEach((a) => { if (typeof x.axes[a.key] === 'string') axes[a.key] = x.axes[a.key] })
      return {
        id: String(x.id || newId()),
        title: String(x.title || ''),
        era: String(x.era || ''),
        axes,
        taboo: String(x.taboo || ''),
        hook: String(x.hook || ''),
        notes: String(x.notes || ''),
        checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
        createdAt: Number(x.createdAt) || Date.now(),
      }
    })
    const openId = typeof p?.openId === 'string' && list.some((s) => s.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function SfSocietyBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Society[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Society | null>(null)
  const [locked, setLocked] = useState<Record<AxisKey, boolean>>({} as Record<AxisKey, boolean>)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 토스트 자동 소거.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1700)
    return () => window.clearTimeout(t)
  }, [toast])

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setLocked({} as Record<AxisKey, boolean>); setOpenId(null); setConfirmDel(null) }
  const startEdit = (s: Society) => { setEditing({ ...s, axes: { ...s.axes }, checks: { ...s.checks } }); setLocked({} as Record<AxisKey, boolean>); setConfirmDel(null) }
  const cancelEdit = () => { setEditing(null); setLocked({} as Record<AxisKey, boolean>) }

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.title.trim()) e.title = (e.axes.polity?.trim() || '제목 없는 미래사회')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((s) => s.id === e.id)
      return exists ? prev.map((s) => (s.id === e.id ? e : s)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
    setLocked({} as Record<AxisKey, boolean>)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((s) => s.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((s) => s.id === from)
      const ti = prev.findIndex((s) => s.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  const toggleCheck = (qid: string) => {
    if (editing) { setEditing({ ...editing, checks: { ...editing.checks, [qid]: !editing.checks[qid] } }); return }
    if (!openId) return
    setList((prev) => prev.map((s) => (s.id === openId ? { ...s, checks: { ...s.checks, [qid]: !s.checks[qid] } } : s)))
  }

  // 무작위 굴리기(잠긴 축 유지).
  const rollAll = () => { if (editing) setEditing({ ...editing, axes: rollAxes(editing.axes, locked) }) }
  const rollOne = (k: AxisKey) => { if (editing) setEditing({ ...editing, axes: { ...editing.axes, [k]: pick(axisDef(k).options) } }) }
  const toggleLock = (k: AxisKey) => setLocked((p) => ({ ...p, [k]: !p[k] }))

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setToast(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // 프로젝트 연동 — '미래사회' 설정 문서를 자료(research)/'세계관' 폴더에 추가.
  const toProject = (s: Society) => {
    if (!hasProjectBridge()) { if (mounted.current) setToast('프로젝트에 연결되지 않았습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: s.title?.trim() ? `미래사회 — ${s.title.trim()}` : '미래사회',
      bodyHtml: societyBodyHtml(s),
      synopsis: summarize(s),
      icon: '🏙️',
      meta: {
        정치체제: (s.axes.polity || '—').trim() || '—',
        기술수준: (s.axes.tech || '—').trim() || '—',
        'AI역할': (s.axes.ai || '—').trim() || '—',
        장르: genre || 'SF·과학소설',
      },
    })
    if (mounted.current) setToast(id ? '프로젝트 자료(세계관)에 미래사회 문서 추가됨' : '프로젝트 추가에 실패했어요')
  }

  const opened = openId ? list.find((s) => s.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🏙️" /></span>
        <strong style={{ fontSize: 15 }}>미래사회·디스토피아 빌더</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 저장됨 · 가능한 사회 {fmtCombos(COMBOS)}가지+</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 미래사회를 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 사회</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={empty}>아직 설계한 미래사회가 없어요.<br />오른쪽 위 <b>＋ 새 사회</b>로<br />첫 세계를 설계해 보세요.</div>
          ) : (
            <div style={listArea}>
              {list.map((s, i) => {
                const active = s.id === openId || (editing && editing.id === s.id)
                const cnt = PROBE_Q.filter((q) => s.checks[q.id]).length
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => { dragId.current = s.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== s.id) setDragOver(s.id) }}
                    onDragLeave={() => { if (dragOver === s.id) setDragOver(null) }}
                    onDrop={() => onDrop(s.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(s.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === s.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || '(제목 없음)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span><Emoji e="🏛️" /> {(s.axes.polity || '미정').slice(0, 12)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11 }}>
                      <span style={{ color: cnt === PROBE_Q.length ? 'var(--ok)' : 'var(--muted)' }}>점검 {cnt}/{PROBE_Q.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(s.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(s.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(s) }} title="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === s.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 사회를 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(s.id) }}>삭제</button>
                          <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 메인 */}
        <div style={main}>
          {editing ? (
            <FormView
              editing={editing} setEditing={setEditing} locked={locked}
              onRollAll={rollAll} onRollOne={rollOne} onToggleLock={toggleLock}
              toggleCheck={toggleCheck} onSave={saveForm} onCancel={cancelEdit}
            />
          ) : opened ? (
            <DetailView s={opened} onEdit={() => startEdit(opened)} toggleCheck={toggleCheck} copyText={copyText} onToProject={() => toProject(opened)} />
          ) : (
            <div style={empty}>
              왼쪽에서 사회를 고르거나<br /><b>＋ 새 사회</b>로 설계를 시작하세요.<br /><br />
              <span style={{ fontSize: 12 }}>정치체제·기술·계급·감시·자원·AI·금기를 채우면<br />미래사회 한 줄 요약이 만들어집니다.<br />각 항목은 <Emoji e="🎲" />로 무작위 굴리기 + <Emoji e="🔒" /> 잠금이 됩니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Society; setEditing: (s: Society) => void; locked: Record<AxisKey, boolean>
  onRollAll: () => void; onRollOne: (k: AxisKey) => void; onToggleLock: (k: AxisKey) => void
  toggleCheck: (qid: string) => void; onSave: () => void; onCancel: () => void
}) {
  const { editing, setEditing, locked, onRollAll, onRollOne, onToggleLock, toggleCheck, onSave, onCancel } = props
  const set = (k: keyof Society, v: any) => setEditing({ ...editing, [k]: v })
  const setAxis = (k: AxisKey, v: string) => setEditing({ ...editing, axes: { ...editing.axes, [k]: v } })
  const preview = summarize(editing)
  const checkedCnt = PROBE_Q.filter((q) => editing.checks[q.id]).length

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 44, lineHeight: 1.5, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 14 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '미래사회 수정' : '새 미래사회 설계'}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onRollAll} title="잠그지 않은 항목을 무작위로 굴립니다"><Emoji e="🎲" /> 전체 굴리기</button>
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      <div style={field}>
        <div style={label}>제목 (비우면 정치체제로)</div>
        <input style={input} value={editing.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 유리천장 도시 — 네오서울 2147" maxLength={80} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="🗓️" /> 시대·연호 (선택)</div>
        <input style={input} value={editing.era} onChange={(e) => set('era', e.target.value)} placeholder="예: 대융합력 88년 / 22세기 말 / 제3차 기후재난 이후" maxLength={80} />
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
        각 항목: 칩을 눌러 고르거나 직접 입력하세요. <Emoji e="🎲" /> 한 항목만 굴리기 · <Emoji e="🔒" /> 잠그면 전체 굴리기에서 보존됩니다.
      </div>

      {AXES.map((a) => (
        <div key={a.key} style={field}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ ...label, marginBottom: 0 }}><Emoji e={a.icon} /> {a.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.hint}</span>
            <button
              className={'minibtn' + (locked[a.key] ? ' active' : '')}
              style={{ padding: '2px 7px', fontSize: 11, borderColor: locked[a.key] ? 'var(--accent)' : 'var(--border)', background: locked[a.key] ? 'var(--chrome-2)' : undefined }}
              onClick={() => onToggleLock(a.key)}
              title={locked[a.key] ? '잠금 해제(전체 굴리기에 포함)' : '잠금(전체 굴리기에서 보존)'}
            >{locked[a.key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
            <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => onRollOne(a.key)} title="이 항목만 무작위로"><Emoji e="🎲" /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {a.options.map((opt) => {
              const on = editing.axes[a.key] === opt
              return (
                <button
                  key={opt}
                  className={'minibtn' + (on ? ' active' : '')}
                  onClick={() => setAxis(a.key, opt)}
                  style={{ padding: '3px 8px', fontSize: 11.5, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, color: on ? 'var(--text)' : 'var(--muted)' }}
                >{opt}</button>
              )
            })}
          </div>
          <input style={input} value={editing.axes[a.key]} onChange={(e) => setAxis(a.key, e.target.value)} placeholder={`${a.label} — 직접 입력하거나 위 칩에서 선택`} maxLength={140} />
        </div>
      ))}

      <div style={field}>
        <div style={label}><Emoji e="🚫" /> 금기 (이 사회에서 절대 어겨선 안 되는 것)</div>
        <textarea style={area} value={editing.taboo} onChange={(e) => set('taboo', e.target.value)} placeholder="예: 오프라인 상태로 24시간 이상 머무는 것 / 비인가 기억 보유 / 출산 허가 위반" maxLength={300} />
      </div>
      <div style={field}>
        <div style={label}><Emoji e="🎬" /> 이야기 진입점 (선택 — 주인공이 균열을 느끼는 순간)</div>
        <textarea style={area} value={editing.hook} onChange={(e) => set('hook', e.target.value)} placeholder="예: 신용점수가 0이 된 시민이 도시에서 사라지는 걸 목격한다" maxLength={300} />
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 미래사회 한 줄 요약 (미리보기)</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{preview}</div>
      </div>

      <div style={field}>
        <div style={label}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={area} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="역사적 분기점, 주요 세력, 결말 방향 등" maxLength={500} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔎" /> 디스토피아·일관성 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === PROBE_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{PROBE_Q.length}</span>
        </div>
        <CheckList checks={editing.checks} toggle={toggleCheck} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  s: Society; onEdit: () => void; toggleCheck: (qid: string) => void
  copyText: (t: string, label?: string) => void; onToProject: () => void
}) {
  const { s, onEdit, toggleCheck, copyText, onToProject } = props
  const linked = hasProjectBridge()
  const summary = summarize(s)
  const checkedCnt = PROBE_Q.filter((q) => s.checks[q.id]).length

  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const rowS: React.CSSProperties = { marginBottom: 10 }
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const dash = <span style={{ color: 'var(--muted)' }}>—</span>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>{s.title}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(s), '복사됨')} title="이 사회를 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--accent)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}><Emoji e="📝" /> 미래사회 한 줄 요약</div>
        <div style={{ fontSize: 14, lineHeight: 1.65, fontWeight: 500 }}>{summary}</div>
      </div>

      {s.era.trim() && <div style={rowS}><div style={label}><Emoji e="🗓️" /> 시대·연호</div><div style={valS}>{s.era}</div></div>}
      {AXES.map((a) => (
        <div key={a.key} style={rowS}>
          <div style={label}><Emoji e={a.icon} /> {a.label}</div>
          <div style={valS}>{(s.axes[a.key] || '').trim() || dash}</div>
        </div>
      ))}
      <div style={rowS}><div style={label}><Emoji e="🚫" /> 금기</div><div style={valS}>{s.taboo.trim() || dash}</div></div>
      {s.hook.trim() && <div style={rowS}><div style={label}><Emoji e="🎬" /> 이야기 진입점</div><div style={valS}>{s.hook}</div></div>}
      {s.notes.trim() && <div style={rowS}><div style={label}><Emoji e="🗒️" /> 메모</div><div style={valS}>{s.notes}</div></div>}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...label, marginBottom: 0 }}><Emoji e="🔎" /> 디스토피아·일관성 점검</span>
          <span style={{ fontSize: 11, color: checkedCnt === PROBE_Q.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{PROBE_Q.length}</span>
        </div>
        <CheckList checks={s.checks} toggle={toggleCheck} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          답이 망설여지는 질문이 곧 세계관에서 보강할 빈틈입니다.
        </div>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 미래사회를 프로젝트 자료(세계관 폴더)에 설정 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>
    </div>
  )
}

// ── 공통 체크리스트 ──
function CheckList(props: { checks: Record<string, boolean>; toggle: (qid: string) => void }) {
  const { checks, toggle } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {PROBE_Q.map((q) => {
        const on = !!checks[q.id]
        return (
          <label
            key={q.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (on ? 'var(--ok)' : 'var(--border)'),
              background: on ? 'var(--chrome-2)' : 'var(--panel)',
            }}
          >
            <input type="checkbox" checked={on} onChange={() => toggle(q.id)} style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: 'var(--ok)', cursor: 'pointer' }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--muted)' }}>{q.q}</span>
          </label>
        )
      })}
    </div>
  )
}
