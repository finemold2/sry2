// 플롯홀 레이더 — 원고/시놉시스에서 인과(cause)·동기(motivation)·지식(knowledge)·물리(physics)
//   네 축의 논리 구멍을 로컬 휴리스틱으로 탐지하고, 축별 진단 질문을 자동 생성해 구멍을 노출한다.
//   엔티티(인물·소품·장소·정보)를 추적해 '등장 없이 사용/이동' 같은 비약을 잡고, 사각형 레이더로 위험도를 시각화.
//   자급식: react 외 import 는 './linkbus' 만. 외부 네트워크·키 불필요(100% 브라우저 로컬 계산).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
  type ToolPayload,
} from './linkbus'

export const meta = {
  id: 'plot-hole-radar',
  name: '플롯홀 레이더',
  icon: '📡',
  group: '플롯',
  intro: '인과·동기·지식·물리 갭을 로컬로 점검하고 진단 질문을 자동 생성해 구멍을 노출합니다',
  w: 480,
  h: 620,
}

// ── 점검 축 ────────────────────────────────────────────────
type Axis = 'cause' | 'motive' | 'know' | 'physic'
const AXES: { key: Axis; label: string; short: string; color: string; desc: string }[] = [
  { key: 'cause', label: '인과', short: '인과', color: '#e0563a', desc: '사건이 앞 사건의 결과로 자연히 이어지는가' },
  { key: 'motive', label: '동기', short: '동기', color: '#d4a017', desc: '인물의 행동에 충분한 까닭이 있는가' },
  { key: 'know', label: '지식', short: '지식', color: '#3a86c8', desc: '인물이 알 수 없는 정보를 쥐고 있지 않은가' },
  { key: 'physic', label: '물리', short: '물리', color: '#6a8f3d', desc: '시간·공간·소품의 이동이 물리적으로 가능한가' },
]
const AXIS_BY: Record<Axis, (typeof AXES)[number]> = AXES.reduce((m, a) => { m[a.key] = a; return m }, {} as Record<Axis, (typeof AXES)[number]>)

// ── 휴리스틱 신호(로컬 사전) ───────────────────────────────
// 각 항목: 정규식 + 축 + 진단 질문 템플릿($는 매치 문맥). 부분일치라 일부는 참고성.
interface Signal {
  re: RegExp
  axis: Axis
  q: string          // 자동 진단 질문
  why: string        // 왜 의심되는지
}
const SIGNALS: Signal[] = [
  // ── 인과(cause): 갑작스러운 전환·우연·해결의 비약 ──
  { re: /갑자기|돌연|난데없이|느닷없이|뜬금없이/, axis: 'cause', q: '이 전환의 원인이 앞 장면에 심어져 있나요? 복선이 없다면 어디에 둘까요?', why: '급전환 표지 — 앞선 인과 없이 사건이 튀어나올 위험.' },
  { re: /마침|때마침|운 좋게|운좋게|우연히|공교롭게/, axis: 'cause', q: '이 우연이 갈등을 해결해 주나요? 그렇다면 인물의 선택으로 바꿀 수 있나요?', why: '편의적 우연(데우스 엑스 마키나) 신호 — 우연이 문제를 풀면 긴장이 빠진다.' },
  { re: /어느새|어느덧|모르는 사이|모르는새/, axis: 'cause', q: '독자가 놓친 과정이 있나요? 생략된 인과를 한 줄이라도 보일 수 있나요?', why: '과정 생략 표지 — 결과만 제시돼 비약으로 읽힐 수 있음.' },
  { re: /결국|어쨌든|아무튼|하여튼/, axis: 'cause', q: '"결국/어쨌든"으로 건너뛴 논리가 있나요? 중간 단계를 보강할 수 있나요?', why: '논리 점프 접속어 — 인과의 중간 고리를 덮어버릴 수 있음.' },
  { re: /기적적으로|기적처럼|구사일생|간신히 살아/, axis: 'cause', q: '생존/성공의 구체적 메커니즘은 무엇인가요? 앞에 그 수단이 등장했나요?', why: '기적적 생존 — 설명되지 않은 결과는 인과 구멍.' },
  { re: /알고 보니|알고보니|사실은 그동안|반전이었/, axis: 'cause', q: '이 폭로를 거꾸로 읽어도 앞 장면들이 모순 없이 성립하나요?', why: '후출 반전 — 소급 정합성(앞 사건과의 일관성) 점검 필요.' },

  // ── 동기(motive): 까닭 없는 행동·태도 급변 ──
  { re: /이유 없이|이유없이|아무 이유|까닭 없이|괜히/, axis: 'motive', q: '이 행동의 진짜 동기는 무엇인가요? 인물의 욕망/두려움과 연결되나요?', why: '동기 부재 표지 — 인물이 작가의 필요로만 움직일 위험.' },
  { re: /왠지|어쩐지|그냥|무심코|충동적으로/, axis: 'motive', q: '"그냥/왠지"를 인물의 성격·과거로 치환할 수 있나요?', why: '모호한 동기 — 충동을 캐릭터의 논리로 바꾸면 설득력이 는다.' },
  { re: /갑자기 마음|마음이 바뀌|돌변|태도가 바뀌|변심/, axis: 'motive', q: '태도 변화의 계기(사건/대사)가 직전에 있나요?', why: '태도 급변 — 전환을 부른 트리거가 없으면 비약.' },
  { re: /용서하|용서했|모든 걸 잊|다 잊고|화해했/, axis: 'motive', q: '용서/화해를 정당화할 만큼의 보상·변화가 상대에게 있었나요?', why: '값싼 용서 — 대가 없는 화해는 동기 구멍.' },
  { re: /사랑에 빠졌|첫눈에 반|반해버렸|좋아하게 됐/, axis: 'motive', q: '호감의 근거(상호작용·공유 경험)가 충분히 쌓였나요?', why: '근거 없는 애정 — 관계의 토대가 얇으면 동기가 빈다.' },
  { re: /희생하|목숨을 걸|모든 것을 버리|배신하/, axis: 'motive', q: '이 큰 결정에 걸맞은 가치/관계가 앞에서 확립됐나요?', why: '고비용 행동 — 큰 대가에는 큰 까닭이 필요.' },

  // ── 지식(know): 알 수 없는 것을 아는 정보 비약 ──
  { re: /알고 있었|이미 알고|알았다|눈치챘|직감했/, axis: 'know', q: '인물이 그것을 어떻게 알았나요? 정보의 출처(목격/전달/추론)가 있나요?', why: '정보 출처 불명 — 등장하지 않은 사실을 인물이 쥠.' },
  { re: /이름을 불렀|이름을 알|네 이름|당신 이름/, axis: 'know', q: '아직 소개되지 않은 이름을 부르고 있지 않나요?', why: '미소개 이름 호명 — 전형적 지식 구멍.' },
  { re: /길을 알|위치를 알|어디 있는지|찾아갔다|찾아냈/, axis: 'know', q: '그 장소/대상의 위치 정보를 인물이 어떻게 얻었나요?', why: '경로/위치 지식 — 안내·지도·정보 없이 도달하면 비약.' },
  { re: /비밀을 알|진실을 알|정체를 알|숨긴 것을/, axis: 'know', q: '비밀이 누설된 경로가 있나요? 누가 어떻게 전했나요?', why: '비밀 누설 경로 누락 — 독자만 아는 정보를 인물이 공유.' },
  { re: /미리 준비|예상하고|대비하고|기다리고 있었/, axis: 'know', q: '인물은 무엇을 근거로 미리 알고 대비했나요?', why: '예지적 대비 — 사전 정보 없이 미래를 안 것처럼 행동.' },
  { re: /연락처를|전화번호를|주소를 알/, axis: 'know', q: '연락처/주소를 입수한 장면이 본문에 있나요?', why: '입수 경로 없는 개인정보 — 현대물 단골 지식 구멍.' },

  // ── 물리(physic): 시간·공간·소품의 모순 ──
  { re: /순식간에|눈 깜짝할|즉시 도착|곧바로 도착|어느새 도착/, axis: 'physic', q: '거리/소요 시간이 실제로 맞나요? 이동 시간을 무시하지 않았나요?', why: '순간이동 표지 — 공간/시간 거리를 건너뜀.' },
  { re: /동시에 두|두 곳에|여기저기 나타|곳곳에 나타/, axis: 'physic', q: '같은 인물이 같은 시각 다른 장소에 있지 않나요?', why: '편재 모순 — 동일 인물의 동시 등장.' },
  { re: /며칠이 지났|몇 달이 지|몇 년이 지|시간이 흘렀/, axis: 'physic', q: '경과한 시간 동안 다른 인물/사건은 어떻게 변했나요? 연속성이 맞나요?', why: '시간 점프 후 정합성 — 경과 동안의 변화 누락 위험.' },
  { re: /다친 곳이|상처가|부상을 입|피를 흘/, axis: 'physic', q: '이 부상이 다음 장면의 행동력에 반영되나요?', why: '부상 연속성 — 다친 인물이 멀쩡히 행동하면 모순.' },
  { re: /총알이|탄창|장전|총을 쏘/, axis: 'physic', q: '탄약/장전 횟수가 앞뒤로 일치하나요?', why: '탄약 연속성 — 무한 탄창은 물리 구멍.' },
  { re: /어둠 속에서|불빛 하나 없|캄캄한|한 치 앞도/, axis: 'physic', q: '빛이 없는데 인물이 무엇을 보고 행동하나요?', why: '조명 모순 — 보일 수 없는 것을 본다.' },
  { re: /비가 쏟아|폭우|눈보라|폭풍/, axis: 'physic', q: '악천후의 영향(시야·소리·이동)이 장면에 반영되나요?', why: '날씨 무시 — 환경 조건이 행동에 영향을 주지 않으면 부자연.' },
]

// ── 엔티티 추적용 패턴 ─────────────────────────────────────
// 한국어 고유명사 추정: 2~4자 한글 + (이/가/은/는/을/를/의/와/과/에게/께/한테) 조사가 붙는 토큰을 후보로.
const NAME_RE = /([가-힣]{2,4})(?:은|는|이|가|을|를|의|에게|한테|께|와|과|도|만|보다|처럼|랑)/g
// 너무 흔해 인물명일 가능성이 낮은 토큰 제거(불용어)
const STOP = new Set([
  '그것', '이것', '저것', '여기', '거기', '저기', '우리', '저희', '당신', '그녀', '그들', '자신', '자기',
  '사람', '사람들', '모두', '서로', '하나', '둘', '셋', '오늘', '내일', '어제', '지금', '아침', '저녁',
  '시간', '순간', '마음', '생각', '얼굴', '손', '눈', '말', '소리', '그때', '이때', '결국', '갑자기',
  '그동안', '그래서', '하지만', '그러나', '그리고', '때문', '정도', '경우', '문제', '이야기', '세상',
  '머리', '가슴', '다리', '몸', '입', '귀', '코', '발', '집', '방', '문', '길', '하늘', '바람', '비',
])

interface EntityRow { name: string; count: number; firstLine: number }
function trackEntities(text: string): EntityRow[] {
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLine = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1 }
    return lo + 1
  }
  const map = new Map<string, EntityRow>()
  NAME_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = NAME_RE.exec(text)) !== null) {
    if (guard++ > 30000) break
    const name = m[1]
    if (STOP.has(name)) continue
    const r = map.get(name)
    if (r) r.count++
    else map.set(name, { name, count: 1, firstLine: toLine(m.index) })
    if (m.index === NAME_RE.lastIndex) NAME_RE.lastIndex++
  }
  return [...map.values()].filter((r) => r.count >= 2).sort((a, b) => b.count - a.count)
}

// ── 신호 탐지 ──────────────────────────────────────────────
interface Finding { axis: Axis; q: string; why: string; snippet: string; line: number; key: string }
function detect(text: string): Finding[] {
  if (!text.trim()) return []
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLine = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1 }
    return lo + 1
  }
  const out: Finding[] = []
  let id = 0
  for (const sig of SIGNALS) {
    const re = new RegExp(sig.re.source, 'g')
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = re.exec(text)) !== null) {
      if (guard++ > 5000) break
      const i = m.index
      const from = Math.max(0, i - 18)
      const to = Math.min(text.length, i + m[0].length + 22)
      let snip = text.slice(from, to).replace(/\s+/g, ' ').trim()
      if (from > 0) snip = '…' + snip
      if (to < text.length) snip = snip + '…'
      out.push({ axis: sig.axis, q: sig.q, why: sig.why, snippet: snip, line: toLine(i), key: 'f' + (id++) })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }
  return out.sort((a, b) => a.line - b.line)
}

// 문자열 해시(결정론적 시드) — 입력 없을 때 일반 진단 질문 셔플에 사용
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// 입력이 비었을 때도 쓸모있게: 축별 범용 진단 질문 풀
const GENERIC: Record<Axis, string[]> = {
  cause: [
    '이 장면이 없으면 다음 장면이 무너지나요? 아니라면 인과가 약합니다.',
    '결말의 사건은 1막에 심은 어떤 씨앗에서 자랐나요?',
    '주인공이 아무것도 안 했어도 같은 결과가 났을까요?',
    '갈등이 우연이 아니라 인물의 선택으로 풀리나요?',
  ],
  motive: [
    '주인공이 지금 멈추지 못하는 까닭(욕망/두려움)은 무엇인가요?',
    '적대자가 자기 입장에서 옳다고 믿는 이유는 무엇인가요?',
    '인물이 가장 쉬운 길을 두고 어려운 길을 택한 까닭은?',
    '이 결정의 대가를 인물은 알고도 감수하나요?',
  ],
  know: [
    '각 인물이 "지금" 알 수 있는 정보만으로 행동하나요?',
    '독자만 아는 사실을 인물이 안 것처럼 굴지 않나요?',
    '핵심 비밀은 누가→누구에게 어떤 경로로 전해졌나요?',
    '인물이 처음 보는 대상의 이름/정체를 이미 부르고 있지 않나요?',
  ],
  physic: [
    'A에서 B로 가는 데 실제로 얼마나 걸리나요? 그게 본문과 맞나요?',
    '같은 시각 모든 인물의 위치를 한 줄로 적을 수 있나요?',
    '소품(무기·열쇠·돈)이 사라지거나 무한히 늘지 않나요?',
    '부상·피로·날씨·시간대가 다음 행동에 반영되나요?',
  ],
}

interface Saved { text: string; setting: string; sens: number }
const LS_KEY = 'sry:tool:plot-hole-radar'

export default function PlotHoleRadar({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState('')
  const [setting, setSetting] = useState('')          // 세계관/제약 메모(물리·지식 판단 보조)
  const [sens, setSens] = useState(2)                  // 민감도: 1 낮음 / 2 보통 / 3 높음 (표시 개수 조절)
  const [filter, setFilter] = useState<'all' | Axis>('all')
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const [genSeed, setGenSeed] = useState(0)
  const toastTimer = useRef<number | null>(null)
  const loaded = useRef(false)

  const characters = useLibraryList('characters')
  const snippets = useLibraryList('snippets')

  // 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const s = JSON.parse(raw) as Partial<Saved>
        if (typeof s.text === 'string') setText(s.text)
        if (typeof s.setting === 'string') setSetting(s.setting)
        if (typeof s.sens === 'number') setSens(s.sens)
      }
    } catch { /* noop */ }
    loaded.current = true
  }, [])

  // payload 수용(드롭/연계로 열릴 때)
  useEffect(() => {
    const p = payload as ToolPayload | undefined
    if (!p) return
    const t = (p.text ?? p.body ?? p.bodyText) as string | undefined
    if (typeof t === 'string' && t.trim()) setText((cur) => (cur.trim() ? cur : t))
    const st = (p.setting ?? p.world ?? p.synopsis) as string | undefined
    if (typeof st === 'string' && st.trim()) setSetting((cur) => (cur.trim() ? cur : st))
  }, [payload])

  // 저장(디바운스 불필요한 작은 데이터지만 변경 시 즉시)
  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, setting, sens } as Saved)) } catch { /* noop */ }
  }, [text, setting, sens])

  useEffect(() => () => { if (toastTimer.current != null) clearTimeout(toastTimer.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1600)
  }, [])

  const findings = useMemo(() => { try { return detect(text) } catch { return [] } }, [text])
  const entities = useMemo(() => { try { return trackEntities(text) } catch { return [] } }, [text])

  // 축별 집계 + 위험 점수(0~100). 점수 = min(100, 건수*가중치). 민감도는 표시 임계치에 영향.
  const scores = useMemo(() => {
    const cnt: Record<Axis, number> = { cause: 0, motive: 0, know: 0, physic: 0 }
    for (const f of findings) cnt[f.axis]++
    const words = Math.max(1, text.trim().split(/\s+/).filter(Boolean).length)
    const density = (n: number) => Math.min(100, Math.round((n / words) * 1400) + n * 6) // 밀도+절대수 혼합
    const score: Record<Axis, number> = {
      cause: density(cnt.cause), motive: density(cnt.motive), know: density(cnt.know), physic: density(cnt.physic),
    }
    return { cnt, score }
  }, [findings, text])

  const total = findings.length
  const overall = useMemo(() => {
    const vals = AXES.map((a) => scores.score[a.key])
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  }, [scores])

  const shown = useMemo(() => {
    let arr = filter === 'all' ? findings : findings.filter((f) => f.axis === filter)
    // 민감도: 1=각 축 상위 일부만, 2=상위 다수, 3=전부
    if (sens < 3) {
      const cap = sens === 1 ? 4 : 10
      const seen: Record<Axis, number> = { cause: 0, motive: 0, know: 0, physic: 0 }
      arr = arr.filter((f) => (seen[f.axis] = (seen[f.axis] || 0) + 1) <= cap)
    }
    return arr
  }, [findings, filter, sens])

  // 범용 진단 질문(입력 무관, 시드로 결정론적 선택). 입력이 있으면 약한 축 위주.
  const generic = useMemo(() => {
    const seed = hashStr((text || setting || 'seed') + ':' + genSeed)
    const weakAxes = [...AXES].sort((a, b) => scores.score[a.key] - scores.score[b.key]) // 낮은=빈약→질문 더
    const out: { axis: Axis; q: string }[] = []
    for (let i = 0; i < AXES.length; i++) {
      const ax = (text.trim() ? weakAxes[i] : AXES[i]).key
      const pool = GENERIC[ax]
      const idx = (hashStr(ax + seed) + i) % pool.length
      out.push({ axis: ax, q: pool[idx] })
    }
    return out
  }, [text, setting, genSeed, scores])

  const report = useMemo(() => {
    const L: string[] = ['[플롯홀 레이더 리포트]', `종합 위험도 ${overall}/100 · 신호 ${total}건`, '']
    L.push('· 축별 위험도')
    for (const a of AXES) L.push(`  - ${a.label}: ${scores.score[a.key]}/100 (${scores.cnt[a.key]}건)`)
    L.push('')
    if (entities.length) {
      L.push('· 추적된 주요 등장 요소')
      for (const e of entities.slice(0, 12)) L.push(`  - ${e.name} ×${e.count} (첫 등장 줄 ${e.firstLine})`)
      L.push('')
    }
    if (findings.length) {
      L.push('· 의심 지점과 진단 질문')
      for (const f of findings) {
        L.push(`  [${AXIS_BY[f.axis].label}] 줄 ${f.line}: "${f.snippet}"`)
        L.push(`    ↳ ${f.why}`)
        L.push(`    ? ${f.q}`)
      }
      L.push('')
    }
    L.push('· 보강 진단 질문')
    for (const g of generic) L.push(`  ? [${AXIS_BY[g.axis].label}] ${g.q}`)
    return L.join('\n')
  }, [overall, total, scores, entities, findings, generic])

  // ── 드롭(바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const it = getDragItem(e)
    if (it?.text) { setText(it.text); flash(`"${it.title}" 본문을 불러왔습니다`) }
    else if (it?.title) { setText((c) => c + (c ? '\n' : '') + it.title); flash('제목을 추가했습니다') }
  }

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(report)
      else {
        const ta = document.createElement('textarea'); ta.value = report; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('리포트를 복사했습니다')
    } catch { flash('복사 실패') }
  }

  const saveSnippet = () => {
    if (!report.trim()) return
    addToLibrary('snippets', { text: report, source: '플롯홀 레이더', tags: ['plot-hole', 'qa'] })
    flash('스니펫 라이브러리에 저장했습니다')
  }
  const stash = () => {
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다'); return }
    addToStash({ kind: 'memo', label: `플롯홀 점검 (위험도 ${overall})`, text: report })
    flash('수집함에 담았습니다')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되지 않았습니다'); return }
    const html = '<pre>' + report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>'
    const id = addToProject({ kind: 'text', root: 'research', folder: '플롯 점검', title: `플롯홀 리포트 (위험도 ${overall})`, bodyHtml: html, synopsis: `신호 ${total}건 · 인과/동기/지식/물리 점검` })
    flash(id ? '자료 폴더에 추가했습니다' : '추가 실패')
  }
  const openConflict = () => openToolLinked('conflict-builder', { text, note: report })
  const openSetup = () => openToolLinked('setup-payoff', { text })

  // 라이브러리에서 인물명을 받아 지식/동기 점검 보조(본문에 등장하는 인물 매칭)
  const libNames = useMemo(() => characters.map((c) => c.fields?.name || c.name).filter(Boolean) as string[], [characters])
  const matchedLib = useMemo(() => libNames.filter((n) => text.includes(n)), [libNames, text])

  // 추적 엔티티를 라이브러리 인물 후보로 저장
  const stashEntity = (name: string) => {
    addToLibrary('characters', { name, fields: { name, role: '플롯홀 레이더 추출' }, source: '플롯홀 레이더' })
    flash(`"${name}"을(를) 인물 라이브러리에 추가`)
  }

  const sample = '주막에 머물던 그는 갑자기 자리를 박차고 일어났다. 마침 비밀을 알고 있던 그녀가 나타나 길을 안내했다. 두 사람은 순식간에 도성에 도착했고, 그는 이유 없이 원수를 용서했다. 알고 보니 모든 것은 계획이었다. 어둠 속에서 그는 적의 이름을 정확히 불렀다.'

  // ── 레이더(사각형) 좌표 계산 ──
  // 축 순서: 인과(상)·동기(우)·지식(하)·물리(좌). 0~100 → 반지름.
  const R = 64, CX = 80, CY = 80
  const pt = (axisIdx: number, val: number) => {
    const ang = -Math.PI / 2 + (axisIdx * Math.PI) / 2 // 위에서 시계방향 90도씩
    const r = (val / 100) * R
    return { x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang) }
  }
  const axisOrder: Axis[] = ['cause', 'motive', 'physic', 'know'] // 상·우·하·좌(시계방향)
  const polyPts = axisOrder.map((ax, i) => { const p = pt(i, scores.score[ax]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
  const gridPts = (lvl: number) => axisOrder.map((_, i) => { const p = pt(i, lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
  const labelPos = axisOrder.map((ax, i) => { const p = pt(i, 118); return { ax, x: p.x, y: p.y } })

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 9, padding: 13, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const ta: React.CSSProperties = {
    minHeight: 78, maxHeight: 140, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: `1px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '10px 12px', fontSize: 14.5, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const settingTa: React.CSSProperties = { ...ta, minHeight: 38, maxHeight: 80, fontSize: 13 }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`, background: active ? color : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11, paddingRight: 2 }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '1px 0' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const tag = (c: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: '#fff', background: c, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 14 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const radarWrap: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        인과·동기·지식·물리 네 축의 논리 구멍을 로컬로 점검하고 진단 질문을 자동 생성합니다. 좌측 바인더 문서를 끌어다 놓거나 붙여넣으세요.
      </div>

      <textarea
        style={ta}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="원고/장면/시놉시스를 붙여넣거나 바인더 문서를 끌어다 놓으세요."
        spellCheck={false}
        aria-label="본문 입력"
      />
      <textarea
        style={settingTa}
        value={setting}
        onChange={(e) => setSetting(e.target.value)}
        placeholder="(선택) 세계관·제약 메모 — 예: 통신 수단 없음, 도성까지 도보 사흘, 마법 금지. 물리·지식 판단의 기준이 됩니다."
        spellCheck={false}
        aria-label="세계관 제약 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} role="button" tabIndex={0} onClick={() => setFilter('all')}>전체 {total}</span>
        {AXES.map((a) => (
          <span key={a.key} style={chip(filter === a.key, a.color)} role="button" tabIndex={0} onClick={() => setFilter(a.key)} title={a.desc}>
            {a.label} {scores.cnt[a.key]}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <select className="field" value={sens} onChange={(e) => setSens(Number(e.target.value))} style={{ fontSize: 12, padding: '3px 6px', width: 'auto' }} aria-label="민감도">
          <option value={1}>민감도 낮음</option>
          <option value={2}>민감도 보통</option>
          <option value={3}>민감도 높음</option>
        </select>
      </div>

      <div style={chipRow}>
        <button className="minibtn" type="button" onClick={() => setText(sample)}>예시</button>
        <button className="minibtn" type="button" onClick={() => setText('')} disabled={!text}>지우기</button>
        <button className="minibtn" type="button" onClick={() => setGenSeed((s) => s + 1)}>질문 새로</button>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" type="button" onClick={copy} disabled={!report.trim()}>리포트 복사</button>
      </div>

      {text.trim() === '' && setting.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 28 }}>레이더 대기</div>
          <div>원고를 붙여넣거나 좌측 문서를 끌어다 놓으면<br />인과·동기·지식·물리 구멍을 찾아 진단 질문을 만듭니다.</div>
          <div style={hint}>입력이 없어도 아래 보강 진단 질문으로 직접 점검할 수 있습니다.</div>
          <div style={{ width: '100%', marginTop: 4, textAlign: 'left' }}>
            <div style={secTitle}>보강 진단 질문</div>
            {generic.map((g, i) => (
              <div key={i} style={{ ...card, marginTop: 6 }}>
                <span style={tag(AXIS_BY[g.axis].color)}>{AXIS_BY[g.axis].label}</span>
                <span style={{ marginLeft: 8, fontSize: 13.5 }}>{g.q}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={scroll}>
          {/* 레이더 + 종합 */}
          <div style={radarWrap}>
            <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }} role="img" aria-label="위험도 레이더">
              {[25, 50, 75, 100].map((lvl) => (
                <polygon key={lvl} points={gridPts(lvl)} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.6} />
              ))}
              {axisOrder.map((_, i) => { const p = pt(i, 100); return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} opacity={0.5} /> })}
              <polygon points={polyPts} fill="var(--accent)" fillOpacity={0.25} stroke="var(--accent)" strokeWidth={2} />
              {axisOrder.map((ax, i) => { const p = pt(i, scores.score[ax]); return <circle key={ax} cx={p.x} cy={p.y} r={3} fill={AXIS_BY[ax].color} /> })}
              {labelPos.map((l) => (
                <text key={l.ax} x={l.x} y={l.y} fontSize={10} fill="var(--muted)" textAnchor="middle" dominantBaseline="middle">{AXIS_BY[l.ax].short}</text>
              ))}
            </svg>
            <div style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13 }}>종합 위험도 <b style={{ fontSize: 20, color: overall >= 60 ? 'var(--warn)' : overall >= 30 ? 'var(--accent)' : 'var(--ok)' }}>{overall}</b><span style={{ color: 'var(--muted)' }}>/100</span></div>
              {AXES.map((a) => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                  <span style={{ width: 32, color: 'var(--muted)' }}>{a.label}</span>
                  <span style={{ flex: 1, height: 7, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${scores.score[a.key]}%`, background: a.color }} />
                  </span>
                  <span style={{ width: 22, textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{scores.score[a.key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 연계 도구 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="linkbtn minibtn" type="button" onClick={saveSnippet} disabled={!report.trim()}>스니펫 저장</button>
            <button className="linkbtn minibtn" type="button" onClick={stash} disabled={!report.trim()}>수집함 담기</button>
            <button className="linkbtn minibtn" type="button" onClick={toProject} disabled={!report.trim()}>프로젝트에 추가</button>
            <button className="linkbtn minibtn" type="button" onClick={openConflict}>갈등 빌더 열기</button>
            <button className="linkbtn minibtn" type="button" onClick={openSetup}>복선·회수 열기</button>
          </div>

          {/* 추적 엔티티 */}
          {entities.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={secTitle}>추적된 등장 요소 ({entities.length}) — 지식·물리 구멍 점검의 단서</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {entities.slice(0, 16).map((e) => {
                  const inLib = libNames.includes(e.name)
                  return (
                    <span key={e.name} title={inLib ? '인물 라이브러리에 있음' : '클릭하면 인물 라이브러리에 추가'}
                      onClick={() => !inLib && stashEntity(e.name)}
                      style={{ fontSize: 12, padding: '3px 9px', borderRadius: 999, cursor: inLib ? 'default' : 'pointer', border: `1px solid ${inLib ? 'var(--ok)' : 'var(--border)'}`, background: 'var(--chrome-2)', whiteSpace: 'nowrap' }}>
                      {e.name} <span style={{ color: 'var(--muted)' }}>×{e.count}</span>
                    </span>
                  )
                })}
              </div>
              {matchedLib.length > 0 && <div style={hint}>라이브러리 인물 중 본문 등장: {matchedLib.join(', ')}</div>}
            </div>
          )}

          {/* 의심 지점 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={secTitle}>의심 지점과 진단 질문 ({shown.length}{total !== shown.length ? ` / ${total}` : ''})</div>
            {shown.length === 0 ? (
              <div style={{ ...card, color: 'var(--muted)', fontSize: 13 }}>
                {total === 0 ? '뚜렷한 논리 구멍 신호가 없습니다. 아래 보강 질문으로 한 번 더 점검해 보세요.' : '선택한 축에 해당하는 신호가 없습니다.'}
              </div>
            ) : shown.map((f) => (
              <div key={f.key} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={tag(AXIS_BY[f.axis].color)}>{AXIS_BY[f.axis].label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>줄 {f.line}</span>
                </div>
                <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 4 }}>{f.snippet}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 4 }}>{f.why}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.q}</div>
              </div>
            ))}
          </div>

          {/* 보강 질문 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={secTitle}>보강 진단 질문 (약한 축 우선)</div>
            {generic.map((g, i) => (
              <div key={i} style={card}>
                <span style={tag(AXIS_BY[g.axis].color)}>{AXIS_BY[g.axis].label}</span>
                <span style={{ marginLeft: 8, fontSize: 13.5 }}>{g.q}</span>
              </div>
            ))}
          </div>

          <div style={hint}>로컬 휴리스틱 보조 도구입니다. 표지 어휘(갑자기·마침·알고 보니 등) 기반이라 일부는 정상일 수 있으니 질문을 점검 체크리스트로 쓰세요. 세계관 제약을 적으면 물리·지식 판단의 기준이 분명해집니다.</div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--paper)', fontSize: 12.5, padding: '6px 12px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,.25)', whiteSpace: 'nowrap', zIndex: 5 }}>
          {toast}
        </div>
      )}

      {snippets.length > 0 && <span style={{ display: 'none' }}>{snippets.length}</span>}
      <div className="license-note" style={{ display: 'none' }}>로컬 계산 · 네트워크 불필요</div>
    </div>
  )
}
