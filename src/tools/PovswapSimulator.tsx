// 시점 교체 시뮬 — 한 장면을 다른 인물 POV 로 재구성하기 위한 가이드 워크벤치.
//  입력: 장면 텍스트(직접 입력 / 좌측 바인더 드롭 / payload.text) + 등장 인물(라이브러리 'characters' 연동).
//  계산: 선택한 POV 인물 기준으로
//    (1) 인지 경계 — 그 인물이 "알 수 있는 / 알 수 없는" 정보 자동 분리(다른 인물 내면·미목격 사실 차단)
//    (2) 감각 채널 — 그 인물이 직접 접근 가능한 오감/내면 감각 점검표
//    (3) 편향 렌즈 — 인물 성격/목표/두려움/관계에서 도출한 해석 편향 프롬프트
//    (4) 어조·거리·인칭 프리셋 추천 + 재구성 체크리스트(상태 저장)
//  연동: useLibraryList('characters'), addToLibrary('snippets'), getDragItem/isItemDrag, payload.text,
//        addToProject(프로젝트 「시점」 폴더 문서), addToStash(메모), openToolLinked('pov-tracker'/'character-sheet').
// react 외 import 는 './linkbus' 뿐. 외부 네트워크 없음. localStorage 자동 저장/복원.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  CHARACTER_FIELD_LABEL,
  type SharedCharacter, type ToolPayload,
} from './linkbus'

export const meta = {
  id: 'povswap-simulator',
  name: '시점 교체 시뮬',
  icon: '🔀',
  group: '캐릭터',
  intro: '한 장면을 다른 인물 POV로 재구성하는 가이드 — 알/모르는 정보·감각·편향 체크리스트',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:povswap-simulator'

// ── 문자열 시드 해시(결정론적 의사난수의 시드) ──
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length] }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── 인칭/거리 프리셋 ──
const PERSONS = [
  { key: '1', label: '1인칭', desc: '나=이 인물. 가장 밀착, 내면 직접 노출' },
  { key: '3-limited', label: '3인칭 제한', desc: '이 인물의 어깨 너머. 내면 접근하나 다른 인물은 추측만' },
  { key: '3-deep', label: '3인칭 밀착', desc: '이름은 3인칭이나 필터·어휘는 인물의 것(자유간접화법)' },
] as const

// ── 감각 채널(체크표 항목) ──
const SENSES = [
  { key: 'sight', label: '시각', q: '이 인물의 시야에 실제로 들어오는 것만? 등 뒤·시야 밖은 못 봄' },
  { key: 'hearing', label: '청각', q: '들리는 소리·말. 거리·소음으로 못 듣는 말은?' },
  { key: 'smell', label: '후각', q: '이 인물이 민감하거나 둔감한 냄새는?' },
  { key: 'touch', label: '촉각', q: '직접 닿는 감촉·온도·통증. 추위/땀/심박' },
  { key: 'taste', label: '미각', q: '입 안의 맛(있다면). 긴장 시 마른 입' },
  { key: 'interocep', label: '내부 감각', q: '심장·호흡·위장·근육 긴장 — 감정의 신체화' },
  { key: 'thought', label: '내면 사고', q: '이 인물만의 연상·기억·판단(다른 인물 내면은 금지)' },
] as const

// ── 어조 후보(인물 성격에서 시드로 선택) ──
const TONES = [
  '냉정·관찰자적', '불안·경계하는', '냉소·빈정대는', '따뜻·연민 어린',
  '조급·계산하는', '담담·체념한', '들뜬·확신에 찬', '거리를 둔·분석적',
]

interface CheckState { [key: string]: boolean }
interface Persisted {
  scene: string
  povId: string          // 라이브러리 캐릭터 id 또는 '' 또는 manual 키
  manualName: string     // 라이브러리 밖 임의 POV 이름
  person: string
  checks: CheckState     // 재구성 체크리스트 항목 on/off
  notes: string          // 사용자 자유 메모
}

function loadState(): Persisted {
  const base: Persisted = { scene: '', povId: '', manualName: '', person: '3-deep', checks: {}, notes: '' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    return {
      scene: String(p.scene ?? '').slice(0, 8000),
      povId: String(p.povId ?? ''),
      manualName: String(p.manualName ?? '').slice(0, 40),
      person: PERSONS.some((x) => x.key === p.person) ? String(p.person) : '3-deep',
      checks: (p.checks && typeof p.checks === 'object') ? p.checks : {},
      notes: String(p.notes ?? '').slice(0, 2000),
    }
  } catch { return base }
}

// 장면 텍스트를 문장 단위로 거칠게 분할(한국어 종결 + 줄바꿈 기준).
function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?…”"])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

// 인지 추론 신호 — "다른 인물 내면" / "미목격" 단서 단어.
const MIND_WORDS = ['생각했다', '생각한다', '느꼈다', '느낀다', '깨달았다', '바랐다', '두려웠다', '기억했다', '결심했다', '속으로', '마음속', '내심', '직감', '확신했다']
const HIDDEN_WORDS = ['몰래', '아무도', '비밀', '숨겼다', '숨기', '들키지', '뒤에서', '훗날', '나중에', '한편', '그때는 몰랐다']

// 문장에 인물 이름이 실제로 등장하는지 판정.
//  - 길이>=3 이름: 이름 전체가 포함되는지(부분일치 오탐 방지).
//  - 길이<=2 이름: 한글 이름은 흔한 글자라 오탐이 잦으므로, 한글 음절 경계
//    (앞뒤가 다른 한글 음절이 아닌 위치)에서 전체가 나타날 때만 인정.
function nameInSentence(name: string, s: string): boolean {
  const nm = name.trim()
  if (!nm) return false
  if (nm.length >= 3) return s.includes(nm)
  // 길이<=2: 한글 음절 경계 확인으로 부분일치(예: '정수'↔'정수기') 오탐 차단
  let from = 0
  for (;;) {
    const idx = s.indexOf(nm, from)
    if (idx < 0) return false
    const before = s[idx - 1]
    const after = s[idx + nm.length]
    const isHangul = (ch?: string) => !!ch && /[가-힣]/.test(ch)
    if (!isHangul(before) && !isHangul(after)) return true
    from = idx + 1
  }
}

interface CharLike { id: string; name: string; fields: Record<string, string> }

// SharedCharacter → 평탄한 필드맵. fields 우선, 없으면 표준 속성에서 끌어온다.
function flatten(c: SharedCharacter): CharLike {
  const f: Record<string, string> = { ...(c.fields || {}) }
  const put = (k: string, v?: string) => { if (v && !f[k]) f[k] = v }
  put('name', c.name); put('role', c.role); put('appearance', c.appearance)
  put('personality', c.personality); put('goal', c.goal); put('secret', c.secret); put('notes', c.notes)
  ;(c.traits || []).forEach((t) => { if (t.k && t.v && !f[t.k]) f[t.k] = t.v })
  return { id: c.id, name: (f.name || c.name || '인물').trim(), fields: f }
}

export default function PovSwapSimulator({ payload }: { payload?: ToolPayload }) {
  const characters = useLibraryList('characters')
  const chars = useMemo<CharLike[]>(() => characters.map(flatten), [characters])

  const initial = useRef<Persisted>(loadState())
  const [scene, setScene] = useState(initial.current.scene)
  const [povId, setPovId] = useState(initial.current.povId)
  const [manualName, setManualName] = useState(initial.current.manualName)
  const [person, setPerson] = useState(initial.current.person)
  const [checks, setChecks] = useState<CheckState>(initial.current.checks)
  const [notes, setNotes] = useState(initial.current.notes)

  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)
  const dragDepth = useRef(0)

  // payload.text 1회 수용
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    const t = typeof payload?.text === 'string' ? (payload.text as string) : ''
    if (t.trim() && !initial.current.scene.trim()) {
      setScene(t.slice(0, 8000))
      flash('장면 텍스트를 받았어요.')
    }
    // payload 로 특정 인물 지정 시 선택
    const pid = typeof payload?.characterId === 'string' ? (payload.characterId as string) : ''
    if (pid) setPovId(pid)
    payloadDone.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current != null) clearTimeout(toastTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    const data: Persisted = { scene, povId, manualName, person, checks, notes }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* 차단 시 무시 */ }
  }, [scene, povId, manualName, person, checks, notes])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
  }

  // 선택된 POV 인물(라이브러리 또는 수동)
  const selChar = chars.find((c) => c.id === povId) || null
  const povName = (selChar?.name || manualName).trim()

  // ── 분석 결과(시드 = 인물명+성격+장면) ──
  const analysis = useMemo(() => {
    // 다른 인물 이름 목록 — chars/povId 에서 useMemo 내부 재도출(매 렌더 새 배열로 인한 무효화 방지)
    const others = chars.filter((c) => c.id !== povId).map((c) => c.name).filter(Boolean)
    const sentences = splitSentences(scene)
    const seedBase = povName + '|' + (selChar?.fields.personality || '') + '|' + (selChar?.fields.goal || '')
    const seed = hashStr(seedBase || 'pov')

    // 인지 경계: 각 문장이 "다른 인물 내면" 또는 "미목격" 신호를 담는지
    const flagged = sentences.map((s) => {
      const mind = MIND_WORDS.some((w) => s.includes(w))
      // 내면 신호가 있고, 문장이 POV 인물 이름을 담지 않으며,
      // 다른 인물 이름이 등장할 때만 → 다른 인물 내면일 가능성(과광범위 판정 방지)
      const aboutPov = povName ? nameInSentence(povName, s) : false
      const otherMind = mind && !aboutPov && others.some((o) => o && nameInSentence(o, s))
      const hidden = HIDDEN_WORDS.some((w) => s.includes(w))
      return { s, mind, otherMind, hidden }
    })
    const cantKnow = flagged.filter((f) => f.otherMind || f.hidden)

    // 편향 렌즈: 인물 속성에서 해석 프롬프트 도출
    const lens: { tag: string; q: string }[] = []
    const f = selChar?.fields || {}
    if (f.goal) lens.push({ tag: '목표', q: `이 장면의 사건을 「${trim(f.goal)}」(목표)에 도움/방해로 먼저 평가한다. 무엇을 기회·위협으로 읽는가?` })
    if (f.fear) lens.push({ tag: '두려움', q: `「${trim(f.fear)}」를 두려워한다. 장면 속 무엇이 이 공포를 건드려 과민·회피하게 만드는가?` })
    if (f.flaw) lens.push({ tag: '결점', q: `「${trim(f.flaw)}」 탓에 무엇을 오해·무시·과신하는가? 독자만 아는 맹점은?` })
    if (f.secret) lens.push({ tag: '비밀', q: `「${trim(f.secret)}」를 숨긴다. 어떤 화제·시선을 피하고, 어떤 말을 삼키는가?` })
    if (f.value) lens.push({ tag: '가치관', q: `「${trim(f.value)}」 기준으로 타인의 행동을 옳다/그르다 판단한다.` })
    if (f.relations) lens.push({ tag: '관계', q: `관계(「${trim(f.relations)}」)에 따라 같은 말도 호의/적의로 다르게 해석한다.` })
    if (f.personality) lens.push({ tag: '성격', q: `성격(「${trim(f.personality)}」)이 첫인상과 어휘 선택을 물들인다.` })
    if (!lens.length) {
      lens.push({ tag: '욕망', q: '이 인물이 지금 가장 원하는 것은? 장면을 그 욕망의 렌즈로 본다.' })
      lens.push({ tag: '두려움', q: '이 인물이 가장 피하고 싶은 결과는? 무엇을 위협으로 읽는가?' })
      lens.push({ tag: '선입견', q: '상대·장소에 대해 미리 품은 판단은? 그것이 묘사를 어떻게 비트는가?' })
    }

    // 어조·거리 추천
    const tone = pick(TONES, seed)
    const distance = (f.personality || '').match(/내성|소심|불안|예민/) ? '심리적으로 가까움(밀착)'
      : (f.personality || '').match(/냉정|이성|침착|계산/) ? '한 발 물러선 관찰'
      : pick(['밀착해 호흡까지', '한 발 물러선 관찰', '사건과 함께 흔들리는'], seed >> 3)

    // 감각 우선순위(인물별 시드로 가중)
    const senseOrder = SENSES.map((s, i) => ({ ...s, rank: (hashStr(povName + s.key) % 100) + (i === 6 ? 30 : 0) }))
      .sort((a, b) => b.rank - a.rank)

    return { sentences, cantKnow, flaggedMind: flagged.filter((x) => x.mind).length, lens, tone, distance, senseOrder, knownCount: sentences.length - cantKnow.length }
  }, [scene, povName, selChar, chars, povId])

  const hasScene = scene.trim().length > 0
  const ready = hasScene && povName.length > 0

  // ── 체크리스트 정의(동적) ──
  const checklist = useMemo(() => {
    const base = [
      { key: 'reopen', label: `첫 문장을 ${povName || '이 인물'}의 즉각적 감각·관심에서 다시 연다` },
      { key: 'filter', label: '서술 어휘를 인물의 직업·교육·세대 어휘로 교체한다' },
      { key: 'cut-omni', label: '인물이 못 보거나 못 들은 사실은 삭제하거나 추측으로 바꾼다' },
      { key: 'recolor', label: '같은 사건의 감정 색을 인물의 목표/두려움에 맞게 다시 칠한다' },
      { key: 'body', label: '감정을 내부 감각(심박·호흡·근육)으로 신체화한다' },
      { key: 'gap', label: '이 인물만 모르는/잘못 아는 정보로 긴장(극적 아이러니)을 만든다' },
      { key: 'voice', label: `${PERSONS.find((p) => p.key === person)?.label} 인칭·거리를 끝까지 일관되게 유지한다` },
    ]
    return base
  }, [povName, person])
  const checkedN = checklist.filter((c) => checks[c.key]).length

  // ── 드롭 수용 ──
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }
  const onDragEnter = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault(); dragDepth.current += 1; if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0; setDragOver(false)
    const it = getDragItem(e); if (!it) return
    e.preventDefault()
    // 인물 카드면 POV 로, 본문 텍스트면 장면으로.
    if (it.character?.name) {
      setManualName(it.character.name.slice(0, 40)); setPovId('')
      flash(`POV 인물로 「${it.character.name}」 지정`)
    } else if (it.text && it.text.trim()) {
      setScene(it.text.slice(0, 8000))
      flash(`「${it.title}」 본문을 장면으로 불러왔어요.`)
    } else if (it.title) {
      setScene((prev) => (prev ? prev + '\n\n' : '') + it.title)
      flash('제목을 장면에 넣었어요.')
    }
  }

  // ── 산출 텍스트(가이드 시트) ──
  const buildText = (): string => {
    const L: string[] = []
    L.push(`# 시점 교체 가이드 — ${povName || '미지정 인물'} POV`)
    L.push(`인칭/거리: ${PERSONS.find((p) => p.key === person)?.label} · ${analysis.distance}`)
    L.push(`추천 어조: ${analysis.tone}`)
    L.push('')
    L.push('## 알 수 없는 정보(차단·추측 전환 대상)')
    if (analysis.cantKnow.length) analysis.cantKnow.forEach((c, i) => L.push(`${i + 1}. ${c.s}${c.hidden ? '  [미목격]' : ''}${c.otherMind ? '  [타인 내면]' : ''}`))
    else L.push('(자동 감지된 항목 없음 — 직접 점검 필요)')
    L.push('')
    L.push('## 감각 채널 우선순위')
    analysis.senseOrder.forEach((s, i) => L.push(`${i + 1}. ${s.label} — ${s.q}`))
    L.push('')
    L.push('## 편향 렌즈')
    analysis.lens.forEach((l) => L.push(`- [${l.tag}] ${l.q}`))
    L.push('')
    L.push('## 재구성 체크리스트')
    checklist.forEach((c) => L.push(`- [${checks[c.key] ? 'x' : ' '}] ${c.label}`))
    if (notes.trim()) { L.push(''); L.push('## 메모'); L.push(notes.trim()) }
    return L.join('\n')
  }
  const buildHtml = (): string => {
    const li = (a: string[]) => a.map((x) => `<li>${escapeHtml(x)}</li>`).join('')
    const parts: string[] = []
    parts.push(`<p><strong>POV:</strong> ${escapeHtml(povName || '미지정')} · ${escapeHtml(PERSONS.find((p) => p.key === person)?.label || '')} · ${escapeHtml(analysis.distance)}</p>`)
    parts.push(`<p><strong>추천 어조:</strong> ${escapeHtml(analysis.tone)}</p>`)
    parts.push('<p><strong>알 수 없는 정보(차단·추측 전환 대상)</strong></p>')
    parts.push(analysis.cantKnow.length ? `<ul>${li(analysis.cantKnow.map((c) => c.s + (c.hidden ? ' [미목격]' : '') + (c.otherMind ? ' [타인 내면]' : '')))}</ul>` : '<p>(자동 감지된 항목 없음)</p>')
    parts.push('<p><strong>감각 채널 우선순위</strong></p>')
    parts.push(`<ol>${li(analysis.senseOrder.map((s) => `${s.label} — ${s.q}`))}</ol>`)
    parts.push('<p><strong>편향 렌즈</strong></p>')
    parts.push(`<ul>${li(analysis.lens.map((l) => `[${l.tag}] ${l.q}`))}</ul>`)
    parts.push('<p><strong>재구성 체크리스트</strong></p>')
    parts.push(`<ul>${checklist.map((c) => `<li>${checks[c.key] ? '[x]' : '[ ]'} ${escapeHtml(c.label)}</li>`).join('')}</ul>`)
    if (notes.trim()) parts.push(`<hr /><p><strong>메모</strong></p><p>${escapeHtml(notes.trim()).replace(/\n/g, '<br />')}</p>`)
    return parts.join('')
  }

  const copyGuide = async () => {
    const txt = buildText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); flash('가이드를 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        flash('가이드를 복사했어요.')
      } catch { flash('복사에 실패했어요.') }
    }
  }
  const saveSnippet = () => {
    if (!ready) { flash('장면과 POV 인물을 먼저 정하세요.'); return }
    addToLibrary('snippets', { id: newId(), text: buildText(), source: `시점교체:${povName}`, tags: ['시점', 'POV', povName] })
    flash('공유 라이브러리(스니펫)에 가이드를 저장했어요.')
  }
  const toStash = () => {
    if (!hasStash()) { flash('수집함이 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'memo', label: `시점교체 가이드 — ${povName}`, text: buildText() })
    flash('수집함에 담았어요.')
  }
  const toProject = () => {
    if (!ready) { flash('장면과 POV 인물을 먼저 정하세요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '시점',
      title: `시점 가이드 — ${povName}`,
      bodyHtml: buildHtml(),
      meta: { POV: povName, 인칭: PERSONS.find((p) => p.key === person)?.label || '', 차단정보: String(analysis.cantKnow.length), 어조: analysis.tone },
    })
    flash(id ? '프로젝트 「시점」 폴더에 가이드를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }
  // 새 캐릭터로 "이 장면의 POV 후보" 저장(수동 이름일 때)
  const saveAsCharacter = () => {
    const nm = manualName.trim()
    if (!nm) { flash('수동 입력 이름이 없어요.'); return }
    addToLibrary('characters', { id: newId(), name: nm, fields: { name: nm, notes: `시점 교체 시뮬에서 추가된 POV 후보. 추천 어조: ${analysis.tone}` } })
    flash(`「${nm}」을 인물 라이브러리에 추가했어요.`)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const topbar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '9px 11px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const bodyS: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const inputS: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.65 }
  const chip: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--chrome-2)' }

  return (
    <div
      style={dragOver ? { ...wrap, outline: '2px dashed var(--accent, #3d7fd6)', outlineOffset: -4, borderRadius: 8 } : wrap}
      onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'color-mix(in srgb, var(--accent, #3d7fd6) 10%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
            인물 카드는 POV로, 원고는 장면으로 받습니다
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', zIndex: 40, fontSize: 12.5, fontWeight: 700, color: 'var(--ok, #3fa35a)', background: 'var(--paper)', border: '1px solid var(--ok, #3fa35a)', borderRadius: 999, padding: '6px 14px', boxShadow: '0 4px 14px rgba(0,0,0,.16)', pointerEvents: 'none', maxWidth: '90%', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      <div style={topbar}>
        <div style={{ fontSize: 13, fontWeight: 700, marginRight: 'auto' }}>시점 교체 시뮬</div>
        <button className="minibtn" onClick={copyGuide} disabled={!ready} title="가이드를 텍스트로 복사">복사</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="공유 라이브러리에 저장">스니펫</button>
        <button className="minibtn" onClick={toStash} disabled={!ready || !hasStash()} title="수집함에 담기">수집함</button>
        <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()} title="프로젝트 「시점」 폴더에 문서로 추가">프로젝트에 추가</button>
      </div>

      <div style={bodyS}>
        {/* 1) 장면 입력 */}
        <div>
          <label style={labelS}>장면 텍스트</label>
          <textarea
            style={{ ...inputS, minHeight: 92, resize: 'vertical', lineHeight: 1.6 }}
            value={scene}
            onChange={(e) => setScene(e.target.value.slice(0, 8000))}
            placeholder="재구성할 장면을 붙여넣거나, 좌측 바인더의 원고 문서를 끌어다 놓으세요. (다른 도구에서 보낸 본문도 자동 수용)"
          />
          {hasScene && (
            <div style={{ ...hint, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={chip}>{analysis.sentences.length}문장</span>
              <span style={chip}>{scene.trim().length}자</span>
              {analysis.flaggedMind > 0 && <span style={{ ...chip, color: 'var(--warn)', borderColor: 'var(--warn)' }}>내면 서술 {analysis.flaggedMind}곳</span>}
            </div>
          )}
        </div>

        {/* 2) POV 선택 */}
        <div>
          <label style={labelS}>교체할 POV 인물</label>
          {chars.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {chars.map((c) => (
                <button
                  key={c.id}
                  className={povId === c.id ? 'btn-primary' : 'minibtn'}
                  onClick={() => { setPovId(c.id); setManualName('') }}
                  style={{ padding: '4px 10px', fontSize: 12.5 }}
                  title={c.fields.role || c.fields.personality || ''}
                >{c.name}</button>
              ))}
            </div>
          ) : (
            <div style={{ ...hint, marginBottom: 6 }}>인물 라이브러리가 비어 있어요. 아래에 이름을 직접 입력하거나, 인물 도구에서 캐릭터를 만들면 여기 자동으로 나타납니다.</div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={inputS}
              value={selChar ? selChar.name : manualName}
              onChange={(e) => { setManualName(e.target.value.slice(0, 40)); setPovId('') }}
              placeholder="직접 입력(라이브러리 밖 인물)"
              maxLength={40}
            />
            {!selChar && manualName.trim() && (
              <button className="minibtn" style={{ whiteSpace: 'nowrap' }} onClick={saveAsCharacter} title="이 이름을 인물 라이브러리에 추가">＋인물</button>
            )}
          </div>
          {selChar && (
            <div style={{ ...hint, marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['role', 'goal', 'fear', 'flaw', 'secret'] as const).map((k) =>
                selChar.fields[k] ? <span key={k} style={chip}>{CHARACTER_FIELD_LABEL[k] || k}: {trim(selChar.fields[k], 18)}</span> : null
              )}
            </div>
          )}
        </div>

        {/* 3) 인칭/거리 */}
        <div>
          <label style={labelS}>인칭·서술 거리</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {PERSONS.map((p) => (
              <label key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 12.5, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border)', background: person === p.key ? 'color-mix(in srgb, var(--accent, #3d7fd6) 12%, transparent)' : 'transparent' }}>
                <input type="radio" name="povswap-person" checked={person === p.key} onChange={() => setPerson(p.key)} style={{ marginTop: 2 }} />
                <span><b>{p.label}</b> <span style={{ color: 'var(--muted)' }}>— {p.desc}</span></span>
              </label>
            ))}
          </div>
        </div>

        {!ready ? (
          <div style={{ ...card, ...hint, textAlign: 'center' }}>
            장면 텍스트와 교체할 POV 인물을 정하면<br />아래에 인지 경계·감각·편향 분석과 재구성 체크리스트가 생성됩니다.
          </div>
        ) : (
          <>
            {/* 추천 어조/거리 */}
            <div style={card}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...chip, color: 'var(--accent, #3d7fd6)', borderColor: 'var(--accent, #3d7fd6)' }}>추천 어조: {analysis.tone}</span>
                <span style={chip}>거리: {analysis.distance}</span>
                <button className="minibtn" style={{ marginLeft: 'auto', padding: '3px 9px' }} onClick={() => openToolLinked('pov-tracker', { pov: povName, person })} title="시점 추적기 열기">시점 추적기</button>
                {selChar && <button className="minibtn" style={{ padding: '3px 9px' }} onClick={() => openToolLinked('character-sheet', { characterId: selChar.id })} title="인물 시트 열기">인물 시트</button>}
              </div>
            </div>

            {/* 인지 경계 */}
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                인지 경계 — <span style={{ color: 'var(--ok)' }}>{povName}이(가) 알 수 있는 {analysis.knownCount}</span> / <span style={{ color: 'var(--warn)' }}>알 수 없는 {analysis.cantKnow.length}</span>
              </div>
              {analysis.cantKnow.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysis.cantKnow.map((c, i) => (
                    <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, padding: '6px 8px', borderRadius: 8, background: 'color-mix(in srgb, var(--warn) 8%, transparent)', border: '1px solid var(--warn)' }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                        {c.otherMind && <span style={{ ...chip, color: 'var(--warn)', borderColor: 'var(--warn)', padding: '1px 6px' }}>타인 내면</span>}
                        {c.hidden && <span style={{ ...chip, color: 'var(--warn)', borderColor: 'var(--warn)', padding: '1px 6px' }}>미목격</span>}
                      </div>
                      {c.s}
                    </div>
                  ))}
                  <div style={hint}>이 문장들은 POV 인물이 직접 보거나 알 수 없는 정보일 가능성이 높습니다. 삭제하거나 추측·관찰로 바꾸세요.</div>
                </div>
              ) : (
                <div style={hint}>자동으로 걸린 "타인 내면/미목격" 문장이 없습니다. 그래도 다른 인물의 속마음을 직접 단정하지 않았는지 직접 확인하세요.</div>
              )}
            </div>

            {/* 감각 채널 */}
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>감각 채널 점검 — 이 인물에게 강한 순</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {analysis.senseOrder.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5, alignItems: 'baseline' }}>
                    <span style={{ ...chip, minWidth: 54, textAlign: 'center', flexShrink: 0, opacity: i < 3 ? 1 : 0.6 }}>{s.label}</span>
                    <span style={{ color: 'var(--muted)' }}>{s.q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 편향 렌즈 */}
            <div style={card}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>편향 렌즈 — 같은 사건을 다르게 해석</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {analysis.lens.map((l, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <span style={{ ...chip, flexShrink: 0, padding: '1px 7px' }}>{l.tag}</span>
                    <span>{l.q}</span>
                  </div>
                ))}
              </div>
              {!selChar && <div style={{ ...hint, marginTop: 7 }}>인물 라이브러리에서 목표·두려움·결점 등을 채우면 편향 렌즈가 그 인물에 맞게 구체화됩니다.</div>}
            </div>

            {/* 재구성 체크리스트 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>재구성 체크리스트</span>
                <span style={{ marginLeft: 'auto', ...chip }}>{checkedN}/{checklist.length}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--chrome-2)', overflow: 'hidden', marginBottom: 9 }}>
                <div style={{ height: '100%', width: `${(checkedN / checklist.length) * 100}%`, background: checkedN === checklist.length ? 'var(--ok, #3fa35a)' : 'var(--accent, #3d7fd6)', transition: 'width .2s' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {checklist.map((c) => (
                  <label key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.5 }}>
                    <input type="checkbox" checked={!!checks[c.key]} onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ textDecoration: checks[c.key] ? 'line-through' : 'none', color: checks[c.key] ? 'var(--muted)' : 'var(--text)' }}>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div>
              <label style={labelS}>재구성 메모(자동 저장)</label>
              <textarea
                style={{ ...inputS, minHeight: 64, resize: 'vertical', lineHeight: 1.6 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                placeholder="이 인물 시점으로 다시 쓴 문장·아이디어를 적어두세요. 복사/프로젝트 추가 시 함께 포함됩니다."
              />
            </div>

            <div className="license-note" style={hint}>
              모든 입력과 진행 상황은 이 브라우저에 자동 저장됩니다. 자동 감지는 보조 신호일 뿐이니 최종 판단은 직접 하세요.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 긴 필드값을 표시용으로 자른다.
function trim(s: string | undefined, n = 40): string {
  const v = (s || '').trim().replace(/\s+/g, ' ')
  return v.length > n ? v.slice(0, n - 1) + '…' : v
}
