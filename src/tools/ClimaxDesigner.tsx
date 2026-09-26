// 절정 설계(Climax Designer) — 이야기의 클라이맥스를 작법 원리에 따라 점검·설계하는 도구.
//  핵심 5축(점검 항목): ① 최대 위기(가장 큰 갈등·돌이킬 수 없는 압박) ② 주인공의 결정적 선택(능동적 결단)
//   ③ 치르는 대가(선택의 희생·상실) ④ 주제 수렴(작품 메시지가 사건으로 증명됨) ⑤ 떡밥 회수(복선·미해결의 정산).
//  + 빌드업 체크리스트(긴장이 단계적으로 누적되어 정점에 도달했는가) + 관여 인물 집결(클라이맥스에 모일 인물 명단).
//  + 떡밥(복선) 레지스터: 심은 복선을 등록하고 절정에서 회수했는지 체크 → 미회수 경고.
//  각 축은 작성·점검·자기평가(0~3)로 구성, 종합 준비도(%)와 위험 진단을 실시간 표시.
//  localStorage 자동 저장/복원. 텍스트 복사·.txt 내보내기. 프로젝트 자료('구조' 폴더)에 문서로 추가.
//  좌측 바인더 파일을 드롭하면 제목/본문을 관여 인물·메모로 흡수.
// react/linkbus 외 import 없음. 외부 네트워크/미디어/키 불필요(전부 로컬). 자작 텍스트만 사용(저작권 안전).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'climax-designer', name: '절정 설계', icon: '🔥', group: '구상·정리', intro: '최대 위기·결정적 선택·대가·주제 수렴·떡밥 회수로 클라이맥스를 설계·점검하세요', w: 720, h: 680 }

const LS_KEY = 'sry:tool:climax-designer'

// ── 5축(절정 점검 항목) 정의 ──────────────────────────────────────────────────
interface AxisDef {
  key: string
  no: number
  title: string
  emoji: string
  desc: string         // 작법 원리 설명
  hint: string         // textarea placeholder
  checks: { key: string; label: string }[]   // 세부 점검 체크
}

const AXES: AxisDef[] = [
  {
    key: 'crisis', no: 1, title: '최대 위기', emoji: '⚡',
    desc: '이야기 전체에서 갈등이 가장 첨예해지는 순간. 주인공이 가장 원하는 것과 가장 두려워하는 것이 정면충돌하며, 더는 미룰 수도 회피할 수도 없는 "돌이킬 수 없는 지점"이어야 합니다. 위기의 무게가 작아 보이면 절정 전체가 김이 샙니다.',
    hint: '어떤 갈등이 정점에 이르나요? 주인공이 더는 피할 수 없는 이유는?',
    checks: [
      { key: 'irrevers', label: '되돌릴 수 없는(돌이킬 수 없는) 상황이다' },
      { key: 'stakes', label: '걸린 것(stakes)이 작품 최대치다' },
      { key: 'wantfear', label: '주인공의 욕망과 두려움이 정면충돌한다' },
    ],
  },
  {
    key: 'choice', no: 2, title: '결정적 선택', emoji: '🎯',
    desc: '클라이맥스의 심장. 주인공이 외부 사건에 떠밀리는 것이 아니라 스스로 능동적으로 결단합니다. 이 선택은 쉬운 길이 아니라 딜레마여야 하며, 그 사람이 진짜 누구인지를 드러냅니다. 우연·조력자가 대신 해결하면 절정이 죽습니다.',
    hint: '주인공은 무엇을, 어떤 딜레마 속에서 스스로 결단하나요?',
    checks: [
      { key: 'active', label: '주인공이 능동적으로 결단한다(우연·조력 아님)' },
      { key: 'dilemma', label: '쉬운 답이 없는 진짜 딜레마다' },
      { key: 'reveal', label: '선택이 인물의 본질을 드러낸다' },
    ],
  },
  {
    key: 'cost', no: 3, title: '치르는 대가', emoji: '💔',
    desc: '의미 있는 선택에는 반드시 값이 따릅니다. 주인공은 무언가를 잃거나 포기하거나 희생합니다(목숨·관계·신념·꿈). 대가가 없으면 승리가 공짜로 느껴지고 카타르시스가 약해집니다. 대가는 앞서 쌓아온 가치와 연결될수록 아픕니다.',
    hint: '주인공은 무엇을 잃거나 희생하나요? 그 대가가 왜 아픈가요?',
    checks: [
      { key: 'sacrifice', label: '구체적인 희생·상실이 있다' },
      { key: 'meaningful', label: '대가가 앞서 쌓은 가치와 연결된다' },
      { key: 'earned', label: '승리(혹은 패배)가 공짜가 아니다' },
    ],
  },
  {
    key: 'theme', no: 4, title: '주제 수렴', emoji: '🧭',
    desc: '절정은 작품이 던진 질문(주제)에 사건으로 답하는 자리입니다. 추상적 메시지를 말로 설교하지 않고, 주인공의 선택과 결과가 주제를 "증명"하도록 합니다. 모든 서브플롯·상징·갈등이 이 한 점으로 수렴할 때 이야기는 하나로 묶입니다.',
    hint: '이 작품의 주제(질문)는 무엇이며, 절정이 그것을 어떻게 증명하나요?',
    checks: [
      { key: 'question', label: '작품의 핵심 주제/질문이 명확하다' },
      { key: 'prove', label: '말이 아니라 선택·결과로 주제를 증명한다' },
      { key: 'converge', label: '서브플롯·상징이 이 지점으로 수렴한다' },
    ],
  },
  {
    key: 'payoff', no: 5, title: '떡밥 회수', emoji: '🪤',
    desc: '심어둔 복선·설정·미해결 질문이 절정에서 의미 있게 정산되어야 합니다(체호프의 총: 1막에 걸린 총은 3막에 발사된다). 회수되지 않은 떡밥은 독자에게 빚으로 남고, 갑툭튀(복선 없는 해결)는 반칙으로 느껴집니다. 아래 레지스터에서 복선을 등록·점검하세요.',
    hint: '절정에서 회수되는 복선·설정·약속은? (개별 떡밥은 아래 레지스터에 등록)',
    checks: [
      { key: 'noassp', label: '복선 없이 튀어나오는 해결(데우스 엑스 마키나)이 없다' },
      { key: 'major', label: '핵심 복선이 모두 회수된다' },
      { key: 'surprise', label: '회수가 "놀랍지만 필연적"으로 느껴진다' },
    ],
  },
]

const AXIS_BY_KEY: Record<string, AxisDef> = Object.fromEntries(AXES.map((a) => [a.key, a]))

// ── 빌드업(긴장 누적) 체크리스트 ──────────────────────────────────────────────
interface BuildItem { key: string; label: string; hint: string }
const BUILDUP: BuildItem[] = [
  { key: 'rising', label: '긴장이 단계적으로 상승했다', hint: '절정 직전까지 갈등·압박이 한 칸씩 높아졌나요? (밋밋한 평지 없이)' },
  { key: 'noescape', label: '도망갈 출구가 차례로 막혔다', hint: '주인공이 쓸 수 있던 대안·도피로가 하나씩 봉쇄되었나요?' },
  { key: 'pinch', label: '최악의 순간(바닥)을 거쳤다', hint: '절정 직전 "다 잃은 듯한" 최저점이 있었나요?' },
  { key: 'pace', label: '절정 직전 호흡이 짧고 빨라졌다', hint: '문장·장면 길이가 짧아지며 가속되었나요?' },
  { key: 'promise', label: '독자에게 한 약속을 향해 달려왔다', hint: '도입부가 약속한 대결·해답을 지금 치르고 있나요?' },
]

// ── 데이터 타입 ──────────────────────────────────────────────────────────────
interface AxisState { text: string; score: number; checks: Record<string, boolean> } // score 0~3
interface CastMember { id: string; name: string; role: string; present: boolean } // present: 절정에 집결?
interface Seed { id: string; text: string; chapter: string; paid: boolean } // 떡밥(복선): paid=회수됨
interface Store {
  title: string
  axes: Record<string, AxisState>
  buildup: Record<string, boolean>
  cast: CastMember[]
  seeds: Seed[]
}

function emptyAxis(): AxisState { return { text: '', score: 0, checks: {} } }
function defaultStore(): Store {
  const axes: Record<string, AxisState> = {}
  for (const a of AXES) axes[a.key] = emptyAxis()
  const buildup: Record<string, boolean> = {}
  for (const b of BUILDUP) buildup[b.key] = false
  return { title: '', axes, buildup, cast: [], seeds: [] }
}

function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }

// localStorage 로드 — 미지원/차단/손상/구버전 시 기본값으로 graceful 처리.
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      axes: base.axes,
      buildup: base.buildup,
      cast: Array.isArray(p.cast) ? p.cast.filter((c: unknown) => c && typeof c === 'object').map((c: Record<string, unknown>) => ({
        id: typeof c.id === 'string' ? c.id : uid('cast'),
        name: typeof c.name === 'string' ? c.name : '',
        role: typeof c.role === 'string' ? c.role : '',
        present: !!c.present,
      })) : [],
      seeds: Array.isArray(p.seeds) ? p.seeds.filter((s2: unknown) => s2 && typeof s2 === 'object').map((s2: Record<string, unknown>) => ({
        id: typeof s2.id === 'string' ? s2.id : uid('seed'),
        text: typeof s2.text === 'string' ? s2.text : '',
        chapter: typeof s2.chapter === 'string' ? s2.chapter : '',
        paid: !!s2.paid,
      })) : [],
    }
    const pa = p.axes && typeof p.axes === 'object' ? p.axes : {}
    for (const a of AXES) {
      const v = pa[a.key]
      if (v && typeof v === 'object') {
        const sc = typeof v.score === 'number' ? Math.max(0, Math.min(3, Math.round(v.score))) : 0
        const ck: Record<string, boolean> = {}
        if (v.checks && typeof v.checks === 'object') for (const c of a.checks) ck[c.key] = !!v.checks[c.key]
        s.axes[a.key] = { text: typeof v.text === 'string' ? v.text : '', score: sc, checks: ck }
      }
    }
    const pb = p.buildup && typeof p.buildup === 'object' ? p.buildup : {}
    for (const b of BUILDUP) s.buildup[b.key] = !!pb[b.key]
    return s
  } catch {
    return base
  }
}

const SCORE_LABEL = ['미정', '약함', '보통', '강함']

export default function ClimaxDesigner({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [showGuide, setShowGuide] = useState(true)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [newSeed, setNewSeed] = useState('')
  const [newSeedCh, setNewSeedCh] = useState('')
  const [newCast, setNewCast] = useState('')
  const mounted = useRef(true)
  const applied = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 들어온 제목 1회 반영(다른 도구에서 연계되어 열릴 때).
  useEffect(() => {
    if (applied.current || !payload) return
    applied.current = true
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (t) setStore((s) => (s.title ? s : { ...s, title: t.slice(0, 120) }))
  }, [payload])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────
  const flashMsg = (msg: string) => { setFlash(msg); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }
  const patchAxis = (key: string, patch: Partial<AxisState>) =>
    setStore((s) => ({ ...s, axes: { ...s.axes, [key]: { ...s.axes[key], ...patch } } }))
  const setAxisText = (key: string, text: string) => patchAxis(key, { text })
  const setAxisScore = (key: string, score: number) => patchAxis(key, { score })
  const toggleAxisCheck = (key: string, ck: string) =>
    setStore((s) => ({ ...s, axes: { ...s.axes, [key]: { ...s.axes[key], checks: { ...s.axes[key].checks, [ck]: !s.axes[key].checks[ck] } } } }))
  const toggleBuild = (key: string) => setStore((s) => ({ ...s, buildup: { ...s.buildup, [key]: !s.buildup[key] } }))
  const setTitle = (title: string) => setStore((s) => ({ ...s, title }))

  // 관여 인물
  const addCast = (name: string, role = '') => {
    const nm = name.trim()
    if (!nm) return
    setStore((s) => ({ ...s, cast: [...s.cast, { id: uid('cast'), name: nm.slice(0, 60), role: role.slice(0, 60), present: false }] }))
  }
  const patchCast = (id: string, patch: Partial<CastMember>) =>
    setStore((s) => ({ ...s, cast: s.cast.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const removeCast = (id: string) => setStore((s) => ({ ...s, cast: s.cast.filter((c) => c.id !== id) }))

  // 떡밥(복선) 레지스터
  const addSeed = () => {
    const t = newSeed.trim()
    if (!t) return
    setStore((s) => ({ ...s, seeds: [...s.seeds, { id: uid('seed'), text: t.slice(0, 200), chapter: newSeedCh.trim().slice(0, 40), paid: false }] }))
    setNewSeed(''); setNewSeedCh('')
  }
  const patchSeed = (id: string, patch: Partial<Seed>) =>
    setStore((s) => ({ ...s, seeds: s.seeds.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  const removeSeed = (id: string) => setStore((s) => ({ ...s, seeds: s.seeds.filter((x) => x.id !== id) }))

  // ── 드롭: 좌측 바인더 파일 흡수 ───────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    // 인물 유형이면 관여 인물로, 그 외엔 떡밥/메모 후보로 흡수
    const title = (item.title || '').trim()
    if (!title) return
    if (item.type === 'character' || (item.character && item.character.name)) {
      const nm = (item.character?.name || title).trim()
      addCast(nm, (item.character?.role || '').trim())
      flashMsg(`관여 인물에 "${nm}" 추가`)
    } else {
      const snip = (item.text || '').trim().slice(0, 160)
      setStore((s) => ({ ...s, seeds: [...s.seeds, { id: uid('seed'), text: (snip || title).slice(0, 200), chapter: title.slice(0, 40), paid: false }] }))
      flashMsg(`떡밥 후보에 "${title}" 추가`)
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }
  const onDragLeave = () => setDragOver(false)

  // ── 준비도 산출 ──────────────────────────────────────────────────────────────
  // 5축 점수 평균(0~3 → %) 40% + 세부 체크 비율 30% + 빌드업 비율 20% + 떡밥 회수율 10%
  const axisScoreSum = AXES.reduce((n, a) => n + store.axes[a.key].score, 0)
  const axisScorePct = (axisScoreSum / (AXES.length * 3)) * 100
  const totalChecks = AXES.reduce((n, a) => n + a.checks.length, 0)
  const doneChecks = AXES.reduce((n, a) => n + a.checks.filter((c) => store.axes[a.key].checks[c.key]).length, 0)
  const checkPct = totalChecks ? (doneChecks / totalChecks) * 100 : 0
  const buildDone = BUILDUP.filter((b) => store.buildup[b.key]).length
  const buildPct = (buildDone / BUILDUP.length) * 100
  const seedTotal = store.seeds.length
  const seedPaid = store.seeds.filter((s2) => s2.paid).length
  const seedPct = seedTotal ? (seedPaid / seedTotal) * 100 : 100 // 떡밥 없으면 감점 안 함
  const readiness = Math.round(axisScorePct * 0.4 + checkPct * 0.3 + buildPct * 0.2 + seedPct * 0.1)

  const presentCast = store.cast.filter((c) => c.present).length
  const unpaidSeeds = store.seeds.filter((s2) => !s2.paid)
  const writtenAxes = AXES.filter((a) => store.axes[a.key].text.trim()).length

  // ── 위험 진단(작법 원리 기반 경고) ───────────────────────────────────────────
  const risks: string[] = []
  if (store.axes.crisis.score <= 1) risks.push('최대 위기의 강도가 약합니다 — 걸린 것을 더 키우거나 회피 불가성을 높이세요.')
  if (!store.axes.choice.checks.active) risks.push('주인공이 능동적으로 결단하지 않으면 절정이 무너집니다(우연·조력자 의존 주의).')
  if (store.axes.cost.score === 0 || (!store.axes.cost.checks.sacrifice && store.axes.cost.text.trim() === '')) risks.push('치르는 대가가 비어 있습니다 — 공짜 승리는 카타르시스를 약화시킵니다.')
  if (store.axes.theme.score <= 1) risks.push('주제 수렴이 약합니다 — 선택과 결과가 주제를 "증명"하도록 다듬으세요.')
  if (unpaidSeeds.length > 0) risks.push(`회수되지 않은 떡밥이 ${unpaidSeeds.length}개 있습니다 — 절정에서 정산하거나 의도적 떡밥인지 표시하세요.`)
  if (store.cast.length > 0 && presentCast === 0) risks.push('관여 인물 중 절정에 "집결" 표시된 인물이 없습니다 — 누가 그 자리에 있어야 하는지 확정하세요.')
  if (buildDone < 3) risks.push('빌드업(긴장 누적)이 부족합니다 — 절정 전 긴장이 단계적으로 쌓였는지 점검하세요.')

  // ── 복사/내보내기 텍스트 ─────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 절정 설계${store.title ? ` — ${store.title}` : ''}`)
    lines.push(`종합 준비도: ${readiness}%  (5축 평균 ${Math.round(axisScorePct)}% / 세부점검 ${doneChecks}/${totalChecks} / 빌드업 ${buildDone}/${BUILDUP.length} / 떡밥회수 ${seedPaid}/${seedTotal})`)
    lines.push('')
    lines.push('## 5축 점검')
    for (const a of AXES) {
      const st = store.axes[a.key]
      lines.push(`### ${a.no}. ${a.title}  [${SCORE_LABEL[st.score]}]`)
      const txt = st.text.trim()
      if (txt) lines.push(txt.split('\n').map((l) => '  ' + l).join('\n'))
      for (const c of a.checks) lines.push(`  ${st.checks[c.key] ? '[v]' : '[ ]'} ${c.label}`)
      lines.push('')
    }
    lines.push('## 빌드업(긴장 누적)')
    for (const b of BUILDUP) lines.push(`${store.buildup[b.key] ? '[v]' : '[ ]'} ${b.label}`)
    lines.push('')
    lines.push(`## 관여 인물 집결 (${presentCast}/${store.cast.length} 집결)`)
    if (store.cast.length === 0) lines.push('  (등록된 인물 없음)')
    for (const c of store.cast) lines.push(`  ${c.present ? '[집결]' : '[   ]'} ${c.name}${c.role ? ` — ${c.role}` : ''}`)
    lines.push('')
    lines.push(`## 떡밥 회수 (${seedPaid}/${seedTotal} 회수)`)
    if (store.seeds.length === 0) lines.push('  (등록된 떡밥 없음)')
    for (const s2 of store.seeds) lines.push(`  ${s2.paid ? '[회수]' : '[미회수]'} ${s2.text}${s2.chapter ? ` (심은 곳: ${s2.chapter})` : ''}`)
    if (risks.length) {
      lines.push('')
      lines.push('## 위험 진단')
      for (const r of risks) lines.push(`  - ${r}`)
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flashMsg('전체를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flashMsg('전체를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'climax') + '-design.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flashMsg('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 절정 설계 문서로 추가('구조' 폴더) ─────────────────────────
  const escHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push('<p><em>절정 설계 — 최대 위기·결정적 선택·대가·주제 수렴·떡밥 회수를 점검합니다.</em></p>')
    parts.push(`<p><strong>종합 준비도: ${readiness}%</strong> (5축 평균 ${Math.round(axisScorePct)}% · 세부점검 ${doneChecks}/${totalChecks} · 빌드업 ${buildDone}/${BUILDUP.length} · 떡밥회수 ${seedPaid}/${seedTotal})</p>`)
    parts.push('<h3>5축 점검</h3>')
    for (const a of AXES) {
      const st = store.axes[a.key]
      parts.push(`<h4>${escHtml(`${a.no}. ${a.title}`)} <em>[${SCORE_LABEL[st.score]}]</em></h4>`)
      const txt = st.text.trim()
      if (txt) { for (const ln of txt.split('\n')) parts.push(`<p>${escHtml(ln) || '&nbsp;'}</p>`) }
      const cks = a.checks.map((c) => `<li>${st.checks[c.key] ? '☑' : '☐'} ${escHtml(c.label)}</li>`).join('')
      parts.push(`<ul>${cks}</ul>`)
    }
    parts.push('<h3>빌드업(긴장 누적)</h3><ul>')
    for (const b of BUILDUP) parts.push(`<li>${store.buildup[b.key] ? '☑' : '☐'} ${escHtml(b.label)}</li>`)
    parts.push('</ul>')
    parts.push(`<h3>관여 인물 집결 (${presentCast}/${store.cast.length})</h3><ul>`)
    if (store.cast.length === 0) parts.push('<li>(등록된 인물 없음)</li>')
    for (const c of store.cast) parts.push(`<li>${c.present ? '🟢' : '⚪'} ${escHtml(c.name)}${c.role ? ` — ${escHtml(c.role)}` : ''}</li>`)
    parts.push('</ul>')
    parts.push(`<h3>떡밥 회수 (${seedPaid}/${seedTotal})</h3><ul>`)
    if (store.seeds.length === 0) parts.push('<li>(등록된 떡밥 없음)</li>')
    for (const s2 of store.seeds) parts.push(`<li>${s2.paid ? '✅' : '⛔'} ${escHtml(s2.text)}${s2.chapter ? ` <em>(${escHtml(s2.chapter)})</em>` : ''}</li>`)
    parts.push('</ul>')
    if (risks.length) {
      parts.push('<h3>위험 진단</h3><ul>')
      for (const r of risks) parts.push(`<li>⚠ ${escHtml(r)}</li>`)
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '절정 설계' + (store.title ? ` — ${store.title}` : ''),
      bodyHtml: toBodyHtml(),
      meta: {
        작품: store.title || '(제목 없음)',
        준비도: `${readiness}%`,
        빌드업: `${buildDone}/${BUILDUP.length}`,
        떡밥회수: `${seedPaid}/${seedTotal}`,
      },
    })
    flashMsg(id ? '프로젝트 자료에 절정 설계 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  const resetAll = () => {
    if (!window.confirm('모든 항목·인물·떡밥·점검 상태를 지웁니다. 정말 초기화할까요?')) return
    setStore(defaultStore())
    flashMsg('모두 초기화했어요')
  }

  // ── 스타일 ──────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const barWrap: React.CSSProperties = { height: 12, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const readyColor = readiness >= 80 ? 'var(--ok)' : readiness >= 50 ? 'var(--accent)' : 'var(--warn)'
  const barFill: React.CSSProperties = { height: '100%', width: `${readiness}%`, background: readyColor, transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const guideBox: React.CSSProperties = { border: '1px dashed var(--accent)', borderRadius: 12, background: 'var(--panel)', padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 6 }
  const guideTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }
  const guideText: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: '4px solid var(--accent)', overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px 4px' }
  const cTitle: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, flex: 1 }
  const desc: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, padding: '0 12px 8px', whiteSpace: 'pre-wrap' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 58, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px' }
  const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text)', padding: '2px 0', cursor: 'pointer' }
  const chk: React.CSSProperties = { flexShrink: 0, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--ok)' }
  const sectionTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7, margin: '2px 0 2px' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const scoreBtn = (active: boolean): React.CSSProperties => ({ padding: '3px 9px', fontSize: 11.5, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: active ? 'var(--accent)' : 'var(--paper)', color: active ? '#fff' : 'var(--muted)', fontWeight: active ? 700 : 500 })
  const pill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)' }

  return (
    <div style={wrap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      <div style={head}>
        <input
          style={{ ...input, width: '100%' }}
          value={store.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="작품 제목 (선택)"
          maxLength={120}
          aria-label="작품 제목"
        />
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>종합 준비도 <strong style={{ color: readyColor, fontSize: 14 }}>{readiness}%</strong></span>
          <span>작성 {writtenAxes}/{AXES.length}축 · 점검 {doneChecks}/{totalChecks} · 빌드업 {buildDone}/{BUILDUP.length} · 떡밥 {seedPaid}/{seedTotal} · 집결 {presentCast}/{store.cast.length}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 안내/원리 */}
        <div style={guideBox}>
          <div style={guideTitle}>
            <span><Emoji e="🔥"/> 절정이란 — "주인공이 가장 능동적인 한순간"</span>
            <span style={{ flex: 1 }} />
            <button className="linkbtn" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>{showGuide ? '접기 ▲' : '펼치기 ▼'}</button>
          </div>
          {showGuide && (
            <>
              <p style={guideText}>좋은 클라이맥스는 <strong style={{ color: 'var(--text)' }}>최대 위기</strong> 앞에서 주인공이 <strong style={{ color: 'var(--text)' }}>스스로 결단</strong>하고, 그 선택에 <strong style={{ color: 'var(--text)' }}>대가</strong>를 치르며, 그 결과로 작품의 <strong style={{ color: 'var(--text)' }}>주제가 증명</strong>되고, 그동안 심은 <strong style={{ color: 'var(--text)' }}>복선이 회수</strong>되는 자리입니다.</p>
              <p style={guideText}>아래 5축을 작성하고, 각 축의 강도를 <em>약함/보통/강함</em>으로 자기평가하세요. 절정 직전의 <strong style={{ color: 'var(--text)' }}>빌드업</strong>과 그 자리에 <strong style={{ color: 'var(--text)' }}>모여야 할 인물</strong>, 정산할 <strong style={{ color: 'var(--text)' }}>떡밥</strong>도 함께 점검합니다. 좌측 파일을 끌어다 놓으면 인물·떡밥으로 흡수됩니다.</p>
            </>
          )}
        </div>

        {/* 위험 진단 */}
        {risks.length > 0 && (
          <div style={{ border: '1px solid var(--warn)', borderRadius: 12, background: 'var(--panel)', padding: '10px 13px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', marginBottom: 6 }}><Emoji e="⚠"/> 위험 진단 ({risks.length})</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {risks.map((r, i) => <li key={i} style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* 5축 카드 */}
        {AXES.map((a) => {
          const st = store.axes[a.key]
          return (
            <div key={a.key} style={card}>
              <div style={cHead}>
                <span style={{ fontSize: 18, lineHeight: 1.2 }}><Emoji e={a.emoji}/></span>
                <div style={cTitle}>{a.no}. {a.title}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3].map((sc) => (
                    <button key={sc} style={scoreBtn(st.score === sc)} onClick={() => setAxisScore(a.key, st.score === sc ? 0 : sc)} title={`강도: ${SCORE_LABEL[sc]}`}>{SCORE_LABEL[sc]}</button>
                  ))}
                </div>
              </div>
              <div style={desc}>{a.desc}</div>
              <div style={section}>
                <textarea style={ta} value={st.text} onChange={(e) => setAxisText(a.key, e.target.value)} placeholder={a.hint} aria-label={`${a.title} 내용`} />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {a.checks.map((c) => (
                    <label key={c.key} style={checkRow}>
                      <input type="checkbox" style={chk} checked={!!st.checks[c.key]} onChange={() => toggleAxisCheck(a.key, c.key)} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {/* 빌드업 */}
        <div style={card}>
          <div style={{ ...cHead, paddingBottom: 8 }}>
            <span style={{ fontSize: 18 }}><Emoji e="📈"/></span>
            <div style={cTitle}>빌드업 — 긴장이 정점까지 쌓였는가</div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{buildDone}/{BUILDUP.length}</span>
          </div>
          <div style={section}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {BUILDUP.map((b) => (
                <label key={b.key} style={{ ...checkRow, alignItems: 'flex-start', gap: 8 }}>
                  <input type="checkbox" style={{ ...chk, marginTop: 2 }} checked={store.buildup[b.key]} onChange={() => toggleBuild(b.key)} />
                  <span><strong style={{ color: 'var(--text)' }}>{b.label}</strong><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{b.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 관여 인물 집결 */}
        <div style={card}>
          <div style={{ ...cHead, paddingBottom: 8 }}>
            <span style={{ fontSize: 18 }}><Emoji e="👥"/></span>
            <div style={cTitle}>관여 인물 집결</div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{presentCast}/{store.cast.length} 집결</span>
          </div>
          <div style={section}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.55 }}>절정에 반드시 있어야 할(혹은 영향 줄) 인물을 등록하고, 실제로 그 자리에 "집결"하는지 체크하세요. 좌측 인물 파일을 끌어다 놓아도 추가됩니다.</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                style={{ ...input, flex: 1 }}
                value={newCast}
                onChange={(e) => setNewCast(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { addCast(newCast); setNewCast('') } }}
                placeholder="인물 이름 입력 후 Enter"
                maxLength={60}
                aria-label="인물 이름"
              />
              <button className="minibtn" onClick={() => { addCast(newCast); setNewCast('') }}>＋ 추가</button>
            </div>
            {store.cast.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>아직 등록된 인물이 없어요. 클라이맥스에 모일 인물을 추가하세요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {store.cast.map((c) => (
                  <div key={c.id} style={pill}>
                    <input type="checkbox" style={chk} checked={c.present} onChange={() => patchCast(c.id, { present: !c.present })} title="절정에 집결" />
                    <input style={{ ...input, flex: '1 1 100px', padding: '4px 7px', fontSize: 13 }} value={c.name} onChange={(e) => patchCast(c.id, { name: e.target.value })} placeholder="이름" maxLength={60} />
                    <input style={{ ...input, flex: '1 1 90px', padding: '4px 7px', fontSize: 12.5 }} value={c.role} onChange={(e) => patchCast(c.id, { role: e.target.value })} placeholder="역할(선택)" maxLength={60} />
                    <button className="minibtn" onClick={() => removeCast(c.id)} title="삭제" style={{ padding: '3px 8px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 떡밥(복선) 레지스터 */}
        <div style={card}>
          <div style={{ ...cHead, paddingBottom: 8 }}>
            <span style={{ fontSize: 18 }}><Emoji e="🪤"/></span>
            <div style={cTitle}>떡밥(복선) 회수 레지스터</div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{seedPaid}/{seedTotal} 회수</span>
          </div>
          <div style={section}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.55 }}>심어둔 복선·설정·약속을 등록하고, 절정에서 회수되면 체크하세요. 미회수 떡밥은 위험 진단에 경고로 뜹니다.</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                style={{ ...input, flex: '3 1 160px' }}
                value={newSeed}
                onChange={(e) => setNewSeed(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSeed() }}
                placeholder="떡밥/복선 내용"
                maxLength={200}
                aria-label="떡밥 내용"
              />
              <input
                style={{ ...input, flex: '1 1 80px', width: 90 }}
                value={newSeedCh}
                onChange={(e) => setNewSeedCh(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSeed() }}
                placeholder="심은 곳(선택)"
                maxLength={40}
                aria-label="심은 곳"
              />
              <button className="minibtn" onClick={addSeed}>＋ 등록</button>
            </div>
            {store.seeds.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>등록된 떡밥이 없어요. 1막에 건 총은 3막에 발사되어야 합니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {store.seeds.map((s2) => (
                  <div key={s2.id} style={{ ...pill, alignItems: 'flex-start', opacity: s2.paid ? 1 : 0.95, borderLeft: `3px solid ${s2.paid ? 'var(--ok)' : 'var(--warn)'}` }}>
                    <input type="checkbox" style={{ ...chk, marginTop: 2 }} checked={s2.paid} onChange={() => patchSeed(s2.id, { paid: !s2.paid })} title="회수됨" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input style={{ ...input, width: '100%', padding: '4px 7px', fontSize: 13, textDecoration: s2.paid ? 'line-through' : 'none' }} value={s2.text} onChange={(e) => patchSeed(s2.id, { text: e.target.value })} maxLength={200} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <input style={{ ...input, flex: 1, padding: '3px 7px', fontSize: 12 }} value={s2.chapter} onChange={(e) => patchSeed(s2.id, { chapter: e.target.value })} placeholder="심은 곳(선택)" maxLength={40} />
                        <span style={{ fontSize: 11, color: s2.paid ? 'var(--ok)' : 'var(--warn)', fontWeight: 600, whiteSpace: 'nowrap' }}>{s2.paid ? '회수' : '미회수'}</span>
                      </div>
                    </div>
                    <button className="minibtn" onClick={() => removeSeed(s2.id)} title="삭제" style={{ padding: '3px 8px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, padding: '2px 2px 4px' }}>
          작법 개념(절정·결정적 선택·치르는 대가·주제 증명·복선 회수/체호프의 총)은 널리 공유된 서사 이론을 자체 설명으로 재구성한 것입니다. 모든 텍스트는 자작이며 외부 자료/네트워크를 사용하지 않습니다.
        </div>
        <div style={sectionTitle} />
      </div>

      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '절정 설계 전체를 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={exportFile}><Emoji e="⬇️"/> .txt 내보내기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>전체 초기화</button>
      </div>
    </div>
  )
}
