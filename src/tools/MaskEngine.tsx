// 가면 엔진 — 한 인물이 상황(공적/사적/위기/적 앞 등)마다 어떤 '가면(페르소나)'을 쓰는지
//   표로 설계해, 겉행동·말투·숨기는 욕구·균열 신호를 상황축으로 정렬한다.
//   ① 진짜 자아(core) 1개를 기준으로 ② 상황별 가면을 채우면 ③ '일관성/반전 분석'이
//   가면들이 공유하는 충동과 서로 충돌하는 지점(=반전·정체 폭로의 설계점)을 자동 진단한다.
// 자급식: react 와 './linkbus' 외 import 없음. 로컬 계산·localStorage 만 사용(네트워크 없음).
// 연계(linkbus): characters 라이브러리 수용/저장, 바인더 문서 드롭, 프로젝트 추가, 수집함, 관련 도구 열기.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'mask-engine', name: '가면 엔진', icon: '🎭', group: '캐릭터', intro: '상황별(공적/사적/위기/적 앞) 인물 페르소나 전환표로 일관성과 반전을 설계', w: 520, h: 640 }

const LS = 'sry:tool:mask-engine'

// ── 상황(축) 정의 — 한 인물이 가면을 바꾸는 대표 무대 ──
interface Situation { key: string; label: string; hint: string }
const SITUATIONS: Situation[] = [
  { key: 'public', label: '공적 / 무대 위', hint: '직장·공식석상·낯선 다수 앞. 사회적 평판을 의식하는 얼굴' },
  { key: 'private', label: '사적 / 가까운 이', hint: '연인·가족·절친 등 경계를 푸는 단 몇 사람 앞' },
  { key: 'crisis', label: '위기 / 압박', hint: '시간·생존·돌이킬 수 없는 선택이 걸린 한계 상황' },
  { key: 'enemy', label: '적 / 라이벌 앞', hint: '나를 위협하거나 간파하려는 상대와 마주한 대치' },
  { key: 'alone', label: '혼자 / 가면 없음', hint: '아무도 보지 않는 순간. 진짜 자아에 가장 근접한 얼굴' },
  { key: 'authority', label: '권위 / 윗사람 앞', hint: '상사·부모·심사자 등 평가하는 권력자 앞' },
  { key: 'weak', label: '약자 / 아랫사람 앞', hint: '부하·아이·의지하는 이 등 자기보다 약한 존재 앞' },
]

// 가면 한 칸의 항목들 — 같은 상황이라도 이 4가지로 입체화한다.
interface Mask {
  behavior: string  // 겉으로 드러나는 행동/태도
  speech: string    // 말투·어조
  hide: string      // 이 상황에서 숨기려는 진짜 욕구/감정
  crack: string     // 가면이 무너질 때의 균열 신호(틱·실언·표정)
}
const emptyMask = (): Mask => ({ behavior: '', speech: '', hide: '', crack: '' })

const MASK_FIELDS: { k: keyof Mask; label: string; ph: string }[] = [
  { k: 'behavior', label: '겉행동·태도', ph: '이 상황에서 보이는 행동/표정' },
  { k: 'speech', label: '말투·어조', ph: '말의 빠르기·예의·호칭·욕설 여부' },
  { k: 'hide', label: '숨기는 진짜 욕구', ph: '겉과 달리 속으로 원하는/두려워하는 것' },
  { k: 'crack', label: '가면 균열 신호', ph: '본심이 새어 나올 때의 틱/실언/표정' },
]

// ── 진짜 자아(core) ──
interface Core { name: string; coreDesire: string; coreFear: string; coreSelf: string }
const emptyCore = (): Core => ({ name: '', coreDesire: '', coreFear: '', coreSelf: '' })

interface State {
  core: Core
  masks: Record<string, Mask>      // situationKey -> Mask
  enabled: Record<string, boolean> // 어떤 상황을 표에 포함할지
}

function defaultEnabled(): Record<string, boolean> {
  const e: Record<string, boolean> = {}
  SITUATIONS.forEach((s) => { e[s.key] = ['public', 'private', 'crisis', 'enemy', 'alone'].includes(s.key) })
  return e
}
function defaultState(): State {
  const masks: Record<string, Mask> = {}
  SITUATIONS.forEach((s) => { masks[s.key] = emptyMask() })
  return { core: emptyCore(), masks, enabled: defaultEnabled() }
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return defaultState()
    const p = JSON.parse(raw) as Partial<State>
    const base = defaultState()
    const core = { ...base.core, ...(p.core || {}) }
    const masks: Record<string, Mask> = { ...base.masks }
    if (p.masks && typeof p.masks === 'object') {
      for (const s of SITUATIONS) {
        const m = (p.masks as Record<string, Partial<Mask>>)[s.key]
        if (m) masks[s.key] = { ...emptyMask(), ...m }
      }
    }
    const enabled = { ...base.enabled, ...(p.enabled || {}) }
    return { core, masks, enabled }
  } catch { return defaultState() }
}

// ── 일관성/반전 분석 ──
// 가면들은 '같은 핵심 욕구를 다른 방식으로 추구'할 때 일관적이고,
// 서로 정반대로 충돌할 때 반전·정체 폭로의 설계점이 된다.
interface Analysis {
  filled: number          // 채워진 상황 수
  totalEnabled: number
  motifs: { word: string; count: number }[]   // 여러 가면이 공유하는 어휘(=일관 충동)
  tensions: { a: string; b: string; note: string }[] // 충돌 가능 지점
  consistency: number     // 0~100
  twistScore: number      // 0~100 (반전 잠재력)
  notes: string[]
}

// 한국어 텍스트에서 의미 있는 2글자+ 토큰 추출(조사/공통어 제거)
const STOP = new Set(['그리고', '하지만', '그러나', '때문', '그것', '이것', '저것', '에게', '에서', '으로', '하다', '한다', '없다', '있다', '같다', '같은', '대해', '위해', '대한', '으로서', '처럼', '보다', '많이', '조금', '매우', '아주', '정말', '그냥', '계속', '항상', '늘', '자주'])
function tokens(s: string): string[] {
  if (!s) return []
  // 한글 음절 덩어리만 추출, 끝의 흔한 조사 한 글자 제거(거칠지만 결정론적)
  const raw = (s.match(/[가-힣]{2,}/g) || [])
  const out: string[] = []
  for (let w of raw) {
    if (w.length > 2 && /[은는이가을를의에과와도만]$/.test(w)) w = w.slice(0, -1)
    if (w.length >= 2 && !STOP.has(w)) out.push(w)
  }
  return out
}

// 대립 어휘 사전 — 한 인물의 두 가면이 이 양극을 동시에 보이면 반전 잠재력↑
const ANTONYMS: [string[], string[], string][] = [
  [['냉정', '무심', '차갑', '침착', '차분'], ['다정', '따뜻', '울', '흔들', '눈물'], '냉정 vs 다정'],
  [['용감', '대담', '당당', '강', '거침'], ['겁', '두려', '떨', '소심', '불안'], '강함 vs 두려움'],
  [['웃', '명랑', '농담', '밝'], ['슬픔', '공허', '외로', '상처', '울'], '웃음 vs 슬픔'],
  [['정직', '솔직', '진실', '도덕'], ['거짓', '속이', '비밀', '위선', '숨'], '정직 vs 거짓'],
  [['겸손', '낮추', '양보'], ['오만', '내려다', '경멸', '비웃'], '겸손 vs 오만'],
  [['복종', '순종', '고분'], ['반항', '저항', '파괴', '거역'], '복종 vs 반항'],
  [['친절', '베풀', '희생', '돕'], ['이용', '계산', '지배', '통제'], '선의 vs 지배'],
  [['평온', '온화', '여유'], ['분노', '폭발', '증오', '화'], '평온 vs 분노'],
]

function analyze(st: State): Analysis {
  const active = SITUATIONS.filter((s) => st.enabled[s.key])
  const filledSit = active.filter((s) => {
    const m = st.masks[s.key]
    return m && (m.behavior || m.speech || m.hide || m.crack)
  })
  // 공유 모티프: hide(숨기는 욕구) 위주로, 여러 가면에 반복되는 어휘
  const freq: Record<string, number> = {}
  const allText: string[] = []
  filledSit.forEach((s) => {
    const m = st.masks[s.key]
    const blob = `${m.hide} ${m.behavior} ${m.crack}`
    allText.push(blob)
    const seen = new Set<string>()
    tokens(blob).forEach((w) => { if (!seen.has(w)) { seen.add(w); freq[w] = (freq[w] || 0) + 1 } })
  })
  // core 욕구도 가중치로 반영
  tokens(`${st.core.coreDesire} ${st.core.coreFear} ${st.core.coreSelf}`).forEach((w) => { freq[w] = (freq[w] || 0) + 1 })
  const motifs = Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }))

  // 충돌 지점: 서로 다른 두 활성 가면의 겉행동/말투가 대립 어휘 양극에 걸리는가
  const tensions: { a: string; b: string; note: string }[] = []
  for (let i = 0; i < filledSit.length; i++) {
    for (let j = i + 1; j < filledSit.length; j++) {
      const A = st.masks[filledSit[i].key]
      const B = st.masks[filledSit[j].key]
      const ta = `${A.behavior} ${A.speech}`
      const tb = `${B.behavior} ${B.speech}`
      for (const [pos, neg, label] of ANTONYMS) {
        const aPos = pos.some((w) => ta.includes(w)); const aNeg = neg.some((w) => ta.includes(w))
        const bPos = pos.some((w) => tb.includes(w)); const bNeg = neg.some((w) => tb.includes(w))
        if ((aPos && bNeg) || (aNeg && bPos)) {
          tensions.push({ a: filledSit[i].label, b: filledSit[j].label, note: label })
        }
      }
    }
  }
  // 중복 제거
  const seenT = new Set<string>()
  const uniqTensions = tensions.filter((t) => {
    const k = [t.a, t.b, t.note].sort().join('|')
    if (seenT.has(k)) return false
    seenT.add(k); return true
  })

  // 일관성: 공유 모티프가 많을수록↑ + core 채움 보너스
  const coreFilled = [st.core.coreDesire, st.core.coreFear, st.core.coreSelf].filter(Boolean).length
  const consistency = Math.min(100, motifs.reduce((a, m) => a + m.count * 8, 0) + coreFilled * 10)
  // 반전 잠재력: 충돌 지점 + 가면이 숨기는 욕구가 채워진 비율
  const hideRatio = filledSit.length ? filledSit.filter((s) => st.masks[s.key].hide).length / filledSit.length : 0
  const twistScore = Math.min(100, uniqTensions.length * 22 + Math.round(hideRatio * 40))

  const notes: string[] = []
  if (filledSit.length < 2) notes.push('상황을 둘 이상 채우면 일관성·반전 분석이 의미 있어집니다.')
  if (motifs.length === 0 && filledSit.length >= 2) notes.push('가면들이 공유하는 충동이 보이지 않습니다 — 인물이 분열돼 보일 수 있어요. 숨기는 욕구를 한 갈래로 모아보세요.')
  if (motifs.length >= 2) notes.push(`모든 가면이 "${motifs.slice(0, 2).map((m) => m.word).join(', ')}"을(를) 공유합니다 — 이게 변하지 않는 진짜 동력입니다.`)
  if (uniqTensions.length === 0 && filledSit.length >= 3) notes.push('가면들끼리 충돌이 없어 평면적일 수 있습니다 — 한 상황의 겉행동을 정반대로 틀어 반전 씨앗을 심어보세요.')
  if (uniqTensions.length >= 1) notes.push(`"${uniqTensions[0].a}"와 "${uniqTensions[0].b}"가 ${uniqTensions[0].note}로 충돌합니다 — 두 무대가 한 장면에서 겹치는 순간이 정체 폭로의 설계점입니다.`)
  const empties = active.filter((s) => { const m = st.masks[s.key]; return !(m.behavior || m.speech || m.hide || m.crack) })
  if (empties.length && filledSit.length) notes.push(`아직 비어 있는 무대: ${empties.map((s) => s.label).join(' · ')}.`)

  return { filled: filledSit.length, totalEnabled: active.length, motifs, tensions: uniqTensions, consistency, twistScore, notes }
}

function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 산출물 직렬화 ──
function toText(st: State, an: Analysis): string {
  const lines: string[] = []
  const who = st.core.name.trim() || '인물'
  lines.push(`[가면 전환표] ${who}`)
  if (st.core.coreSelf) lines.push(`진짜 자아: ${st.core.coreSelf}`)
  if (st.core.coreDesire) lines.push(`핵심 욕구: ${st.core.coreDesire}`)
  if (st.core.coreFear) lines.push(`핵심 두려움: ${st.core.coreFear}`)
  lines.push('')
  SITUATIONS.filter((s) => st.enabled[s.key]).forEach((s) => {
    const m = st.masks[s.key]
    if (!(m.behavior || m.speech || m.hide || m.crack)) return
    lines.push(`< ${s.label} >`)
    if (m.behavior) lines.push(`  겉행동: ${m.behavior}`)
    if (m.speech) lines.push(`  말투: ${m.speech}`)
    if (m.hide) lines.push(`  숨기는 욕구: ${m.hide}`)
    if (m.crack) lines.push(`  균열 신호: ${m.crack}`)
    lines.push('')
  })
  lines.push(`일관성 ${an.consistency} / 반전 잠재력 ${an.twistScore}`)
  if (an.motifs.length) lines.push(`공유 충동: ${an.motifs.map((x) => x.word).join(', ')}`)
  an.tensions.forEach((t) => lines.push(`충돌: ${t.a} vs ${t.b} (${t.note})`))
  return lines.join('\n')
}

function toBodyHtml(st: State, an: Analysis): string {
  const who = escHtml(st.core.name.trim() || '인물')
  let h = `<p><strong>가면 전환표 — ${who}</strong></p>`
  if (st.core.coreSelf) h += `<p><strong>진짜 자아:</strong> ${escHtml(st.core.coreSelf)}</p>`
  if (st.core.coreDesire) h += `<p><strong>핵심 욕구:</strong> ${escHtml(st.core.coreDesire)}</p>`
  if (st.core.coreFear) h += `<p><strong>핵심 두려움:</strong> ${escHtml(st.core.coreFear)}</p>`
  h += '<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>상황</th><th>겉행동</th><th>말투</th><th>숨기는 욕구</th><th>균열 신호</th></tr>'
  SITUATIONS.filter((s) => st.enabled[s.key]).forEach((s) => {
    const m = st.masks[s.key]
    if (!(m.behavior || m.speech || m.hide || m.crack)) return
    h += `<tr><td><strong>${escHtml(s.label)}</strong></td><td>${escHtml(m.behavior)}</td><td>${escHtml(m.speech)}</td><td>${escHtml(m.hide)}</td><td>${escHtml(m.crack)}</td></tr>`
  })
  h += '</table>'
  h += `<p><strong>일관성</strong> ${an.consistency} / <strong>반전 잠재력</strong> ${an.twistScore}</p>`
  if (an.motifs.length) h += `<p><strong>공유 충동:</strong> ${escHtml(an.motifs.map((x) => x.word).join(', '))}</p>`
  an.tensions.forEach((t) => { h += `<p><strong>충돌 설계점:</strong> ${escHtml(t.a)} vs ${escHtml(t.b)} (${escHtml(t.note)})</p>` })
  an.notes.forEach((n) => { h += `<p>· ${escHtml(n)}</p>` })
  return h
}

// 라이브러리 캐릭터 → 진짜 자아 시드
function coreFromCharacter(c: SharedCharacter): Partial<Core> {
  const f = c.fields || {}
  return {
    name: c.name || f.name || '',
    coreDesire: f.goal || f.motivation || c.goal || '',
    coreFear: f.fear || '',
    coreSelf: f.personality || c.personality || '',
  }
}

export default function MaskEngine({ payload }: { payload?: Record<string, unknown> }) {
  const [st, setSt] = useState<State>(() => loadState())
  const [focus, setFocus] = useState<string>('public')   // 펼친 상황
  const [tab, setTab] = useState<'table' | 'analysis'>('table')
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const characters = useLibraryList('characters')
  const initRef = useRef(false)

  // payload / 드롭 텍스트 초기 수용(1회)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (payload) {
      if (typeof payload.name === 'string' && payload.name && !st.core.name) {
        setSt((s) => ({ ...s, core: { ...s.core, name: payload.name as string } }))
      }
      if (typeof payload.text === 'string' && (payload.text as string).trim()) {
        // 드롭/전달된 원고 텍스트를 '공적' 가면 겉행동 힌트로 넣어 출발점 제공
        const t = (payload.text as string).trim().slice(0, 200)
        setSt((s) => ({ ...s, masks: { ...s.masks, public: { ...s.masks.public, behavior: s.masks.public.behavior || t } } }))
      }
      if (payload.core && typeof payload.core === 'object') {
        setSt((s) => ({ ...s, core: { ...s.core, ...(payload.core as Partial<Core>) } }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(st)) } catch { /* graceful */ }
  }, [st])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2000)
    return () => window.clearTimeout(t)
  }, [toast])
  const flash = (m: string) => setToast(m)

  const an = useMemo(() => analyze(st), [st])

  // ── 편집 ──
  const setCore = (k: keyof Core, v: string) => setSt((s) => ({ ...s, core: { ...s.core, [k]: v } }))
  const setMask = (sit: string, k: keyof Mask, v: string) =>
    setSt((s) => ({ ...s, masks: { ...s.masks, [sit]: { ...s.masks[sit], [k]: v } } }))
  const toggleSit = (sit: string) => setSt((s) => ({ ...s, enabled: { ...s.enabled, [sit]: !s.enabled[sit] } }))
  const resetAll = () => { if (window.confirm('전환표를 모두 비울까요? (자동 저장값도 덮어씁니다)')) { setSt(defaultState()); flash('초기화했습니다') } }

  // 라이브러리 캐릭터 불러오기
  const loadChar = (c: SharedCharacter) => {
    const seed = coreFromCharacter(c)
    setSt((s) => ({ ...s, core: { ...s.core, ...seed } }))
    flash(`"${c.name}"의 핵심을 불러왔습니다`)
  }

  // 드롭(바인더 문서)
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    if (it.character && it.character.name) {
      setSt((s) => ({
        ...s,
        core: {
          ...s.core,
          name: s.core.name || it.character!.name || it.title,
          coreDesire: s.core.coreDesire || it.character!.goal || it.character!.motivation || '',
          coreFear: s.core.coreFear || it.character!.fear || '',
          coreSelf: s.core.coreSelf || it.character!.personality || '',
        },
      }))
      flash(`"${it.title}" 캐릭터를 핵심으로 받았습니다`)
    } else if (it.text) {
      const t = it.text.trim().slice(0, 200)
      setSt((s) => ({ ...s, core: { ...s.core, name: s.core.name || it.title }, masks: { ...s.masks, public: { ...s.masks.public, behavior: s.masks.public.behavior || t } } }))
      flash(`"${it.title}" 본문을 공적 가면 힌트로 받았습니다`)
    } else {
      setSt((s) => ({ ...s, core: { ...s.core, name: s.core.name || it.title } }))
      flash(`"${it.title}" 제목을 이름으로 받았습니다`)
    }
  }

  // ── 산출물 연계 ──
  const copyAll = () => {
    const text = toText(st, an)
    if (!navigator.clipboard) { flash('이 환경에선 복사가 안 됩니다'); return }
    navigator.clipboard.writeText(text).then(() => flash('전환표를 복사했습니다')).catch(() => flash('복사 실패'))
  }
  const saveToLibrary = () => {
    const name = st.core.name.trim()
    if (!name) { flash('진짜 자아의 이름을 먼저 적어주세요'); return }
    // 정규 캐릭터 필드로 매핑 — 가면 요약을 성격/비밀/말투/메모에 담는다.
    const activeMasks = SITUATIONS.filter((s) => st.enabled[s.key] && (st.masks[s.key].behavior || st.masks[s.key].hide))
    const personality = activeMasks.map((s) => `[${s.label}] ${st.masks[s.key].behavior}`).filter(Boolean).join(' / ')
    const speech = activeMasks.map((s) => st.masks[s.key].speech).filter(Boolean).join(' / ')
    const secret = activeMasks.map((s) => st.masks[s.key].hide).filter(Boolean).join(' / ')
    const fields: Record<string, string> = {
      name,
      goal: st.core.coreDesire,
      fear: st.core.coreFear,
      personality: st.core.coreSelf || personality,
      speech,
      secret,
      notes: toText(st, an),
    }
    addToLibrary('characters', { name, fields })
    flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다'); return }
    if (an.filled === 0) { flash('가면을 하나 이상 채워주세요'); return }
    const who = st.core.name.trim() || '인물'
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물 메모',
      title: `가면 전환표 — ${who}`,
      bodyHtml: toBodyHtml(st, an),
      synopsis: `${an.filled}개 무대 · 일관성 ${an.consistency} · 반전 ${an.twistScore}`,
      meta: { 인물: who, 일관성: String(an.consistency), 반전잠재력: String(an.twistScore), 충돌수: String(an.tensions.length) },
    })
    flash(id ? '프로젝트 자료(인물 메모)에 추가했습니다' : '추가 실패')
  }
  const toStash = () => {
    if (!hasStash()) { flash('수집함을 쓸 수 없는 화면입니다'); return }
    addToStash({ kind: 'memo', label: `가면표: ${st.core.name.trim() || '인물'}`, text: toText(st, an) })
    flash('수집함에 담았습니다')
  }
  // 충돌 설계점을 인물 모순 생성기로 보내 한 장면으로 발전
  const toContradiction = () => {
    const m = st.masks
    openToolLinked('character-contradiction', {
      name: st.core.name.trim(),
      character: {
        name: st.core.name.trim(),
        personality: m.public.behavior,
        secret: m.alone.hide || m.private.hide || st.core.coreDesire,
      },
    })
    flash('인물 모순 생성기로 보냈습니다')
  }
  const toVoice = () => {
    // 상황별 말투를 목소리 도구로
    const speechBlob = SITUATIONS.filter((s) => st.enabled[s.key] && st.masks[s.key].speech)
      .map((s) => `[${s.label}] ${st.masks[s.key].speech}`).join('\n')
    openToolLinked('character-voice', { name: st.core.name.trim(), text: speechBlob })
    flash('말투를 목소리 도구로 보냈습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -6 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const inp: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  const activeSits = SITUATIONS.filter((s) => st.enabled[s.key])

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={hint}>
        한 인물이 <b>무대마다 바꿔 쓰는 가면</b>을 표로 설계합니다. 진짜 자아를 기준으로 상황별 <b>겉행동·말투·숨기는 욕구·균열 신호</b>를 채우면, 가면들이 공유하는 <b>일관된 충동</b>과 서로 부딪치는 <b>반전 설계점</b>을 분석합니다. 좌측 바인더의 캐릭터/문서를 끌어다 놓을 수 있습니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="minibtn" onClick={() => setTab('table')} aria-pressed={tab === 'table'} style={tabBtn(tab === 'table')}>전환표</button>
        <button className="minibtn" onClick={() => setTab('analysis')} aria-pressed={tab === 'analysis'} style={tabBtn(tab === 'analysis')}>일관성·반전 분석</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{an.filled}/{an.totalEnabled} 무대</span>
      </div>

      {tab === 'table' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {/* 진짜 자아(core) */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>진짜 자아 (가면 아래의 기준점)</div>
            <input style={inp} value={st.core.name} onChange={(e) => setCore('name', e.target.value)} placeholder="인물 이름" />
            <input style={inp} value={st.core.coreSelf} onChange={(e) => setCore('coreSelf', e.target.value)} placeholder="가면을 다 벗으면 어떤 사람인가" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input style={{ ...inp, flex: 1, minWidth: 130 }} value={st.core.coreDesire} onChange={(e) => setCore('coreDesire', e.target.value)} placeholder="변치 않는 핵심 욕구" />
              <input style={{ ...inp, flex: 1, minWidth: 130 }} value={st.core.coreFear} onChange={(e) => setCore('coreFear', e.target.value)} placeholder="가장 깊은 두려움" />
            </div>
            {characters.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>라이브러리에서:</span>
                {characters.slice(0, 6).map((c) => (
                  <button key={c.id} className="minibtn" style={{ padding: '1px 8px', fontSize: 12 }} onClick={() => loadChar(c)} title="이 캐릭터의 핵심을 불러오기">{c.name || '무명'}</button>
                ))}
              </div>
            )}
          </div>

          {/* 상황 토글 */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {SITUATIONS.map((s) => (
              <button key={s.key} className="minibtn" onClick={() => toggleSit(s.key)}
                style={{ padding: '2px 9px', fontSize: 12, borderColor: st.enabled[s.key] ? 'var(--accent)' : 'var(--border)', color: st.enabled[s.key] ? 'var(--text)' : 'var(--muted)', opacity: st.enabled[s.key] ? 1 : 0.6 }}
                title={s.hint}>{st.enabled[s.key] ? '+ ' : ''}{s.label}</button>
            ))}
          </div>

          {/* 무대별 가면 카드 */}
          {activeSits.map((s) => {
            const m = st.masks[s.key]
            const open = focus === s.key
            const count = [m.behavior, m.speech, m.hide, m.crack].filter(Boolean).length
            return (
              <div key={s.key} style={card}>
                <button
                  onClick={() => setFocus(open ? '' : s.key)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0, textAlign: 'left' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{open ? '▾' : '▸'} {s.label}</span>
                  <span style={{ fontSize: 11, color: count ? 'var(--ok)' : 'var(--muted)' }}>{count}/4</span>
                  <span style={{ flex: 1 }} />
                  {!open && m.behavior && <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={m.behavior}>{m.behavior}</span>}
                </button>
                {open && (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.hint}</div>
                    {MASK_FIELDS.map((f) => (
                      <div key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: f.k === 'hide' ? 'var(--warn)' : 'var(--muted)' }}>{f.label}{f.k === 'hide' ? ' (겉과 다른 속내)' : ''}</span>
                        <textarea
                          value={m[f.k]}
                          onChange={(e) => setMask(s.key, f.k, e.target.value)}
                          placeholder={f.ph}
                          rows={f.k === 'hide' || f.k === 'behavior' ? 2 : 1}
                          style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
          {activeSits.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 12px', lineHeight: 1.6 }}>
              표시할 무대가 없습니다. 위에서 상황을 하나 이상 켜주세요.
            </div>
          )}
        </div>
      )}

      {tab === 'analysis' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {/* 점수 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ label: '일관성', v: an.consistency, desc: '같은 충동을 다른 가면으로' }, { label: '반전 잠재력', v: an.twistScore, desc: '가면끼리의 충돌 폭' }].map((g) => (
              <div key={g.label} style={{ ...card, flex: 1, alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{g.v}</div>
                <div style={{ width: '100%', height: 6, background: 'var(--paper)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${g.v}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'center' }}>{g.desc}</div>
              </div>
            ))}
          </div>

          {/* 공유 충동 */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>모든 가면이 공유하는 충동</div>
            {an.motifs.length === 0
              ? <div style={hint}>아직 반복되는 충동이 잡히지 않았습니다. 무대별 "숨기는 욕구"를 채우면 가면 아래로 흐르는 한 줄기 동력이 드러납니다.</div>
              : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {an.motifs.map((m) => (
                    <span key={m.word} style={{ fontSize: 12.5, border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 999, padding: '2px 10px' }}>{m.word} x{m.count}</span>
                  ))}
                </div>}
          </div>

          {/* 충돌 설계점 */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>반전·정체 폭로 설계점 (가면 충돌)</div>
            {an.tensions.length === 0
              ? <div style={hint}>가면들 사이에 또렷한 충돌이 없습니다 — 한 무대의 겉행동/말투를 다른 무대와 정반대로 틀면, 두 무대가 한 장면에서 겹칠 때 폭로의 긴장이 생깁니다.</div>
              : an.tensions.map((t, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, background: 'var(--paper)', border: '1px solid var(--warn)', borderRadius: 8, padding: '7px 9px' }}>
                    <b>{t.a}</b> 와 <b>{t.b}</b> 가 <span style={{ color: 'var(--warn)' }}>{t.note}</span> 로 충돌합니다.
                  </div>
                ))}
          </div>

          {/* 진단 노트 */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>설계 진단</div>
            {an.notes.length === 0
              ? <div style={hint}>표를 채우면 진단이 표시됩니다.</div>
              : an.notes.map((n, i) => <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55 }}>· {n}</div>)}
          </div>
        </div>
      )}

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={saveToLibrary}>인물로 저장</button>
        <button className="minibtn" onClick={copyAll}>복사</button>
        <button className="minibtn" onClick={resetAll} title="전환표 초기화">비우기</button>
      </div>

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '전환표를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()}>수집함</button>
        <button className="linkbtn" onClick={toContradiction} title="충돌 지점을 인물 모순 생성기로">인물 모순으로</button>
        <button className="linkbtn" onClick={toVoice} title="상황별 말투를 목소리 도구로">말투 분석으로</button>
      </div>

      <div style={{ ...hint, color: toast ? 'var(--ok)' : 'var(--muted)' }}>
        {toast || '가면은 같은 욕구를 다른 방식으로 가립니다. 변하지 않는 핵심 하나를 정하고, 무대마다 그것을 어떻게 다르게 숨기는지 설계하세요.'}
      </div>
    </div>
  )
}
