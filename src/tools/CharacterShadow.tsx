// 인물 그림자 — 융 심리(분석심리학) 기반으로 인물의 억압된 "그림자 자아"와 내적 갈등 시드를 생성.
//  · 페르소나(겉으로 내세우는 자아) ↔ 그림자(억압된 반대편)의 긴장을 가시화.
//  · 캐릭터의 성격·가치관·두려움·약점을 입력으로 받아 결정론적 의사난수(시드=문자열 해시)로 그림자를 도출.
//  · characters 라이브러리에서 인물 수용, 좌측 바인더 드롭/payload 수용, 산출물을 라이브러리·프로젝트·수집함에 저장, 관련 도구 연계.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary, updateInLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'character-shadow',
  name: '인물 그림자',
  icon: '🌑',
  group: '캐릭터',
  intro: '융 심리 기반으로 인물의 억압된 그림자 자아와 내적 갈등 시드를 생성',
  w: 460,
  h: 620,
}

// ── 결정론적 의사난수(시드=문자열 해시) ────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makePick(rnd: () => number) {
  return <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
}

// ── 그림자 원형(archetype) — 융의 그림자 개념을 서사 도구로 번안 ──────────
interface Archetype {
  key: string
  name: string
  persona: string          // 이 그림자를 가진 인물이 겉으로 내세우는 자아
  shadow: string           // 억압되어 무의식에 가라앉은 반대편
  desire: string           // 그림자가 몰래 갈망하는 것
  trigger: string          // 그림자가 표면으로 새어 나오는 방아쇠
  projection: string       // 그림자를 타인에게 투사하는 방식(미워하는 대상)
  defense: string          // 그림자를 막으려는 방어기제
  shadowLine: string       // 그림자가 새어 나올 때 인물이 내뱉을 법한 한 마디
}
const ARCH: Archetype[] = [
  { key: 'tyrant', name: '폭군 그림자', persona: '온화하고 헌신적인 보호자', shadow: '모든 것을 지배하려는 통제욕', desire: '누구에게도 명령받지 않는 절대적 자유', trigger: '자신의 결정이 무시당할 때', projection: '제멋대로인 사람을 견디지 못한다', defense: '과도한 친절로 죄책감을 덮는다', shadowLine: '내가 다 옳았어. 너희가 따랐어야지.' },
  { key: 'coward', name: '비겁자 그림자', persona: '용맹하고 의리 있는 행동가', shadow: '도망치고 싶은 두려움과 무력감', desire: '아무 책임도 지지 않아도 되는 안전', trigger: '돌이킬 수 없는 선택을 강요받을 때', projection: '겁쟁이를 경멸하며 몰아세운다', defense: '먼저 위험에 뛰어들어 두려움을 증명하지 않는다', shadowLine: '나는… 사실 한 번도 안 무서운 적이 없었어.' },
  { key: 'trickster', name: '사기꾼 그림자', persona: '정직하고 투명한 사람', shadow: '진실을 비틀어 이득을 취하려는 충동', desire: '들키지 않고 모두를 속이는 쾌감', trigger: '정직만으로는 손해를 볼 때', projection: '거짓말쟁이를 집요하게 색출한다', defense: '강박적으로 모든 것을 기록하고 증명한다', shadowLine: '진실? 그건 가장 잘 팔리는 거짓말일 뿐이야.' },
  { key: 'martyr', name: '순교자 그림자', persona: '욕심 없는 헌신가', shadow: '희생을 무기로 타인을 조종하려는 원망', desire: '자신의 고통을 모두가 알아주는 것', trigger: '자신의 희생이 당연시될 때', projection: '이기적인 사람을 죄인 취급한다', defense: '필요 이상으로 자신을 희생해 빚을 지운다', shadowLine: '내가 너희를 위해 뭘 포기했는지 알기나 해?' },
  { key: 'devourer', name: '집어삼키는 그림자', persona: '다정하고 헌신적인 연인·부모', shadow: '상대를 소유하고 가두려는 집착', desire: '사랑하는 이를 영원히 곁에 묶어두는 것', trigger: '상대가 자기 없이 행복해 보일 때', projection: '의존적인 사람을 한심하게 여긴다', defense: '사랑이라는 이름으로 통제를 합리화한다', shadowLine: '다 너를 위해서야. 내 곁을 떠나면 너는 망가져.' },
  { key: 'iceheart', name: '얼음심장 그림자', persona: '냉철하고 객관적인 판단자', shadow: '감정을 갈망하지만 느낄 줄 모르는 공허', desire: '단 한 번이라도 미친 듯이 무언가를 느끼는 것', trigger: '타인의 뜨거운 감정에 노출될 때', projection: '감정적인 사람을 미숙하다 깎아내린다', defense: '모든 것을 논리로 환원해 거리를 둔다', shadowLine: '나는 아무것도 안 느껴. ……그게 가끔 견딜 수 없어.' },
  { key: 'avenger', name: '복수자 그림자', persona: '용서와 화해를 말하는 평화주의자', shadow: '결코 잊지 못한 원한과 응징욕', desire: '자신에게 상처 준 모두가 무릎 꿇는 것', trigger: '과거의 가해자가 멀쩡히 잘 사는 것을 볼 때', projection: '복수에 사로잡힌 사람을 비난한다', defense: '용서를 설교하며 분노를 봉인한다', shadowLine: '용서했다고? 단지 때를 기다렸을 뿐이야.' },
  { key: 'hedonist', name: '쾌락 그림자', persona: '절제와 금욕을 실천하는 사람', shadow: '모든 욕망에 탐닉하고 싶은 갈증', desire: '규율을 다 내던지고 무너지는 해방', trigger: '오랜 절제가 한순간 보상받지 못할 때', projection: '방탕한 사람을 혐오하며 단죄한다', defense: '더 엄격한 규율로 욕망을 옥죈다', shadowLine: '평생 참았는데… 단 하루만 무너지면 안 돼?' },
  { key: 'impostor', name: '가면 그림자', persona: '자신감 넘치는 유능한 사람', shadow: '언제 들킬지 모른다는 자기 부정과 공허', desire: '아무것도 증명하지 않아도 사랑받는 것', trigger: '성취를 인정받아야 하는 무대에 설 때', projection: '진짜처럼 구는 사람을 의심한다', defense: '끊임없이 일을 벌여 빈틈을 메운다', shadowLine: '저들이 보는 건 내가 아니야. 진짜 나를 알면…' },
  { key: 'savior', name: '구원자 그림자', persona: '누구든 돕는 다정한 조력자', shadow: '타인을 망가뜨려야 필요해지는 의존', desire: '없으면 안 되는 존재가 되는 것', trigger: '도움받던 사람이 스스로 일어설 때', projection: '독립적인 사람을 차갑다 여긴다', defense: '문제를 대신 해결해 상대를 약하게 만든다', shadowLine: '네가 무너질 때만 나는 비로소 살아있어.' },
  { key: 'beast', name: '야수 그림자', persona: '교양 있고 예의 바른 사람', shadow: '문명을 찢고 나오려는 폭력적 본능', desire: '아무 규범 없이 본능대로 사는 것', trigger: '존엄이 짓밟히는 모욕을 당할 때', projection: '거친 사람을 야만이라 멸시한다', defense: '과도한 예절과 격식으로 본능을 가둔다', shadowLine: '한 겹만 벗기면, 나도 너희와 똑같은 짐승이야.' },
  { key: 'void', name: '허무 그림자', persona: '의미와 목적을 좇는 이상주의자', shadow: '모든 것이 무의미하다는 깊은 냉소', desire: '아무것도 믿지 않아도 되는 안식', trigger: '믿었던 대의가 배신당할 때', projection: '맹목적으로 믿는 사람을 어리석다 본다', defense: '더 큰 명분에 자신을 던져 공허를 메운다', shadowLine: '결국 다 부질없잖아. 그런데도 왜 멈출 수가 없지?' },
]

// 가치관/성격 키워드 → 어울리는 그림자 가중치(입력 텍스트에서 신호를 잡아낸다)
const SIGNALS: { re: RegExp; keys: string[] }[] = [
  { re: /보호|지킨|헌신|책임|리더|통제|완벽/i, keys: ['tyrant', 'savior', 'martyr'] },
  { re: /용감|용맹|정의|의리|영웅/i, keys: ['coward', 'avenger'] },
  { re: /정직|진실|투명|성실/i, keys: ['trickster', 'impostor'] },
  { re: /희생|배려|착한|순하|약자/i, keys: ['martyr', 'savior', 'devourer'] },
  { re: /사랑|연인|가족|애정/i, keys: ['devourer', 'martyr'] },
  { re: /냉철|이성|논리|침착|차가/i, keys: ['iceheart', 'void'] },
  { re: /용서|평화|화해|온화/i, keys: ['avenger', 'beast'] },
  { re: /절제|금욕|규율|엄격|성실/i, keys: ['hedonist', 'beast'] },
  { re: /자신감|유능|완벽|성공|능력/i, keys: ['impostor', 'tyrant'] },
  { re: /이상|신념|대의|희망|목적/i, keys: ['void', 'martyr'] },
  { re: /예의|교양|품위|점잖/i, keys: ['beast', 'iceheart'] },
]

interface Result {
  arch: Archetype
  intensity: number        // 그림자가 표면으로 새어나오는 강도(0~100)
  conflicts: string[]      // 내적 갈등 시드
  catalyst: string         // 서사적 촉발 사건(그림자가 폭발하는 장면 씨앗)
  integration: string      // 그림자 통합(성장 곡선)의 방향
}

const CATALYSTS = [
  '가장 신뢰하던 사람이 그를 시험에 들게 한다',
  '오래 감춰온 비밀이 최악의 순간에 폭로된다',
  '지켜야 할 것과 원하던 것 중 하나만 택해야 한다',
  '과거의 자신과 똑 닮은 인물을 만난다',
  '도덕적 선을 한 번만 넘으면 모든 것이 해결되는 상황',
  '자신이 경멸하던 행동을 스스로 하게 되는 순간',
  '돌이킬 수 없는 상실 앞에서 가면이 벗겨진다',
  '믿었던 대의가 거짓이었음을 알게 된다',
]
const INTEGRATIONS = [
  '그림자를 부정하지 않고 인정함으로써 더 온전해진다',
  '그림자의 에너지를 파괴가 아닌 창조로 돌려낸다',
  '투사를 멈추고 미워하던 대상에게서 자신을 본다',
  '방어기제를 내려놓고 약함을 드러낼 용기를 얻는다',
  '그림자에 끝내 삼켜져 비극적 몰락에 이른다(다크 엔딩 시드)',
  '그림자와 페르소나가 한 인물 안에서 위태롭게 공존한다',
]

function genResult(seedStr: string, signalText: string, forceKey?: string): Result {
  const seed = hashStr(seedStr || 'shadow')
  const rnd = mulberry(seed)
  const pick = makePick(rnd)
  // 신호 텍스트로 후보 가중치 구성
  const weights: Record<string, number> = {}
  for (const a of ARCH) weights[a.key] = 1
  if (signalText) for (const s of SIGNALS) if (s.re.test(signalText)) for (const k of s.keys) weights[k] += 4
  let arch: Archetype
  if (forceKey) {
    arch = ARCH.find((a) => a.key === forceKey) || ARCH[0]
  } else {
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    let roll = rnd() * total
    let chosen = ARCH[0].key
    for (const a of ARCH) { roll -= weights[a.key]; if (roll <= 0) { chosen = a.key; break } }
    arch = ARCH.find((a) => a.key === chosen) || ARCH[0]
  }
  const intensity = 35 + Math.floor(rnd() * 61) // 35~95
  const conflicts = [
    `겉으로는 ‘${arch.persona}’이지만, 속에서는 ‘${arch.shadow}’이 자라고 있다.`,
    `진짜 원하는 것은 ‘${arch.desire}’지만, 그것을 인정하면 자기 정체성이 무너진다.`,
    `‘${arch.trigger}’ 순간마다 억눌렀던 그림자가 새어 나온다.`,
    `${arch.projection} — 사실은 자기 안의 그림자를 타인에게 투사하는 것이다.`,
    `${arch.defense} — 이 방어기제가 두꺼워질수록 그림자도 함께 커진다.`,
  ]
  return {
    arch,
    intensity,
    conflicts,
    catalyst: pick(CATALYSTS),
    integration: pick(INTEGRATIONS),
  }
}

const LS = (id: string) => 'sry:tool:' + id

interface SavedState { name: string; signal: string; forceKey: string }

export default function CharacterShadow({ payload }: { payload?: Record<string, unknown> }) {
  const characters = useLibraryList('characters')

  const [name, setName] = useState('')
  const [signal, setSignal] = useState('')   // 성격·가치관·두려움·약점 등 자유 입력
  const [forceKey, setForceKey] = useState('') // '' = 자동(신호 기반)
  const [sourceCharId, setSourceCharId] = useState<string>('') // 라이브러리에서 불러온 원본
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const [generated, setGenerated] = useState(false)
  const handledPayload = useRef<Record<string, unknown> | null>(null)

  // 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS(meta.id))
      if (raw) {
        const s = JSON.parse(raw) as Partial<SavedState>
        if (s.name) setName(s.name)
        if (s.signal) setSignal(s.signal)
        if (s.forceKey) setForceKey(s.forceKey)
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // payload(드롭/연계) 수용 — 재오픈 시 새 payload 도 반영(handledPayload 가드)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const c = payload.character as Record<string, string> | undefined
    if (c) {
      if (c.name) setName(c.name)
      setSignal((prev) => prev || buildSignal(c))
      setGenerated(true)
    } else if (typeof payload.text === 'string' && payload.text.trim()) {
      setSignal((prev) => prev || (payload.text as string).slice(0, 600))
      setGenerated(true)
    } else if (typeof payload.name === 'string') {
      setName(payload.name as string)
    }
  }, [payload])

  // 저장
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS(meta.id), JSON.stringify({ name, signal, forceKey } as SavedState)) } catch { /* noop */ }
    }, 250)
    return () => clearTimeout(t)
  }, [name, signal, forceKey])

  const flash = (m: string) => setToast(m)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const result = useMemo<Result | null>(() => {
    if (!generated && !name.trim() && !signal.trim()) return null
    const seedStr = (name || 'unnamed') + '|' + signal + '|' + forceKey
    return genResult(seedStr, signal, forceKey || undefined)
  }, [name, signal, forceKey, generated])

  const loadFromLibrary = (c: SharedCharacter) => {
    setSourceCharId(c.id)
    setName(c.name || '')
    setSignal(buildSignalFromShared(c))
    setForceKey('')
    setGenerated(true)
    flash(`‘${c.name || '인물'}’의 정보를 불러왔습니다`)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    if (item.title) setName(item.title)
    const sig = [item.character ? buildSignal(item.character) : '', item.text ? item.text.slice(0, 500) : ''].filter(Boolean).join('\n')
    if (sig) setSignal(sig)
    setGenerated(true)
    flash(`‘${item.title}’ 문서를 받았습니다`)
  }

  // ── 산출물 텍스트 ────────────────────────────────────────────
  const reportText = (): string => {
    if (!result) return ''
    const lines = [
      `[인물 그림자] ${name || '이름 없는 인물'}`,
      `그림자 원형: ${result.arch.name}`,
      `그림자 강도: ${result.intensity}/100`,
      '',
      `페르소나(겉자아): ${result.arch.persona}`,
      `그림자(억압된 반대편): ${result.arch.shadow}`,
      `숨은 갈망: ${result.arch.desire}`,
      `방아쇠: ${result.arch.trigger}`,
      `투사: ${result.arch.projection}`,
      `방어기제: ${result.arch.defense}`,
      `그림자가 새어나올 때의 한마디: "${result.arch.shadowLine}"`,
      '',
      '— 내적 갈등 시드 —',
      ...result.conflicts.map((c, i) => `${i + 1}. ${c}`),
      '',
      `촉발 사건(장면 씨앗): ${result.catalyst}`,
      `통합·성장 방향: ${result.integration}`,
    ]
    return lines.join('\n')
  }
  const reportHtml = (): string => {
    if (!result) return ''
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return [
      `<h2>${esc(name || '이름 없는 인물')} — 그림자 자아</h2>`,
      `<p><b>그림자 원형:</b> ${esc(result.arch.name)} · <b>강도:</b> ${result.intensity}/100</p>`,
      `<p><b>페르소나:</b> ${esc(result.arch.persona)}<br/><b>그림자:</b> ${esc(result.arch.shadow)}<br/><b>숨은 갈망:</b> ${esc(result.arch.desire)}<br/><b>방아쇠:</b> ${esc(result.arch.trigger)}<br/><b>투사:</b> ${esc(result.arch.projection)}<br/><b>방어기제:</b> ${esc(result.arch.defense)}</p>`,
      `<p><i>"${esc(result.arch.shadowLine)}"</i></p>`,
      '<h3>내적 갈등 시드</h3><ol>' + result.conflicts.map((c) => `<li>${esc(c)}</li>`).join('') + '</ol>',
      `<p><b>촉발 사건:</b> ${esc(result.catalyst)}</p>`,
      `<p><b>통합·성장 방향:</b> ${esc(result.integration)}</p>`,
    ].join('')
  }

  // ── 연동 액션 ────────────────────────────────────────────────
  const shadowFields = (): Record<string, string> => {
    if (!result) return {}
    return {
      name: name ? `${name}의 그림자` : '그림자 자아',
      role: '그림자 자아',
      personality: result.arch.shadow,
      value: result.arch.persona,
      goal: result.arch.desire,
      fear: result.arch.trigger,
      flaw: result.arch.projection,
      secret: result.arch.shadow,
      motivation: result.arch.desire,
      arc: result.integration,
      notes: result.conflicts.join('\n'),
      etc: `그림자 원형: ${result.arch.name} · 강도 ${result.intensity}/100 · 한마디: "${result.arch.shadowLine}"`,
    }
  }

  const saveToLibrary = () => {
    if (!result) return
    addToLibrary('characters', {
      name: name ? `${name}의 그림자` : '그림자 자아',
      role: '그림자 자아',
      personality: result.arch.shadow,
      goal: result.arch.desire,
      secret: result.arch.shadow,
      notes: reportText(),
      fields: shadowFields(),
      source: '인물 그림자',
    })
    flash('그림자 자아를 인물 라이브러리에 저장했습니다')
  }

  const attachToSource = () => {
    if (!result || !sourceCharId) return
    const src = characters.find((c) => c.id === sourceCharId)
    if (!src) { flash('원본 인물을 찾을 수 없습니다'); return }
    const merged = { ...(src.fields || {}) }
    merged.secret = [merged.secret, result.arch.shadow].filter(Boolean).join(' / ')
    merged.fear = merged.fear || result.arch.trigger
    merged.flaw = [merged.flaw, result.arch.projection].filter(Boolean).join(' / ')
    merged.arc = merged.arc || result.integration
    merged.shadow = `${result.arch.name}(${result.intensity}/100): ${result.arch.shadow}`
    updateInLibrary('characters', sourceCharId, {
      fields: merged,
      secret: merged.secret,
      notes: [src.notes, reportText()].filter(Boolean).join('\n\n'),
    })
    flash(`원본 인물 ‘${src.name}’에 그림자 정보를 합쳤습니다`)
  }

  const toProject = () => {
    if (!result) return
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: (name ? name : '인물') + ' — 그림자',
      bodyHtml: reportHtml(),
      character: shadowFields(),
      synopsis: `${result.arch.name} · 강도 ${result.intensity}/100`,
      meta: { 그림자원형: result.arch.name, 강도: `${result.intensity}/100` },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 그림자 카드를 추가했습니다' : '프로젝트에 추가할 수 없습니다')
  }

  const toStash = () => {
    if (!result) return
    addToStash({ kind: 'memo', label: (name || '인물') + ' 그림자', text: reportText() })
    flash('수집함에 담았습니다')
  }

  const toRelationship = () => {
    if (!result) return
    openToolLinked('relationship-map', {
      character: { name: name ? `${name}의 그림자` : '그림자 자아', role: '그림자 자아', fields: shadowFields() },
    })
    flash('관계도 도구로 보냈습니다')
  }
  const toSheet = () => {
    if (!result) return
    openToolLinked('character-sheet', {
      character: { name: name ? `${name}의 그림자` : '그림자 자아', role: '그림자 자아', fields: shadowFields() },
    })
    flash('인물 시트로 보냈습니다')
  }

  const copy = () => { navigator.clipboard?.writeText(reportText()).then(() => flash('복사했습니다')).catch(() => {}) }

  // ── 스타일 헬퍼 ──────────────────────────────────────────────
  const inputStyle: React.CSSProperties = { width: '100%', fontSize: 12.5, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4, borderRadius: 8 }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>
        융 분석심리학의 그림자 개념으로, 인물이 억누른 반대편 자아와 내적 갈등 씨앗을 도출합니다. 좌측 바인더 문서를 끌어다 놓거나 아래 라이브러리 인물을 불러오세요.
      </div>

      {/* 라이브러리 인물 불러오기 */}
      {characters.length > 0 && (
        <div style={card}>
          <div style={labelStyle}>인물 라이브러리에서 불러오기 ({characters.length})</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxHeight: 70, overflow: 'auto' }}>
            {characters.slice(0, 30).map((c) => (
              <button key={c.id} className={'minibtn' + (sourceCharId === c.id ? ' active' : '')} onClick={() => loadFromLibrary(c)} title={c.role || ''} style={{ fontSize: 11 }}>
                {c.name || '이름없음'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 */}
      <div>
        <div style={labelStyle}>인물 이름</div>
        <input value={name} onChange={(e) => { setName(e.target.value); setSourceCharId('') }} placeholder="예: 이서린" style={inputStyle} />
      </div>
      <div style={{ flexShrink: 0 }}>
        <div style={labelStyle}>성격·가치관·두려움·약점 (그림자의 재료)</div>
        <textarea
          value={signal}
          onChange={(e) => { setSignal(e.target.value); setSourceCharId('') }}
          placeholder="겉으로 드러나는 성격과 신념을 적으면, 그 반대편에 억압된 그림자를 찾아냅니다. 예: 정의롭고 헌신적이며 절대 화내지 않는다. 약자를 보면 못 지나친다."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>

      {/* 원형 강제 선택 */}
      <div>
        <div style={labelStyle}>그림자 원형 (자동 = 입력 신호 기반)</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className={'minibtn' + (forceKey === '' ? ' active' : '')} onClick={() => setForceKey('')} style={{ fontSize: 11 }}>자동</button>
          {ARCH.map((a) => (
            <button key={a.key} className={'minibtn' + (forceKey === a.key ? ' active' : '')} onClick={() => setForceKey(a.key)} style={{ fontSize: 11 }}>{a.name}</button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={() => setGenerated(true)}>그림자 자아 분석</button>

      {/* 결과 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!result && (
          <div style={{ ...card, fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 10px' }}>
            인물 정보를 입력하거나 라이브러리/바인더에서 불러온 뒤 분석을 실행하세요.
          </div>
        )}
        {result && (
          <>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{result.arch.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>그림자 강도 {result.intensity}/100</span>
              </div>
              {/* 강도 게이지 */}
              <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${result.intensity}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #7c3aed)' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55 }}>
                <div><b style={{ color: 'var(--muted)' }}>페르소나</b> {result.arch.persona}</div>
                <div><b style={{ color: 'var(--muted)' }}>그림자</b> {result.arch.shadow}</div>
                <div><b style={{ color: 'var(--muted)' }}>숨은 갈망</b> {result.arch.desire}</div>
                <div><b style={{ color: 'var(--muted)' }}>방아쇠</b> {result.arch.trigger}</div>
                <div><b style={{ color: 'var(--muted)' }}>투사</b> {result.arch.projection}</div>
                <div><b style={{ color: 'var(--muted)' }}>방어기제</b> {result.arch.defense}</div>
              </div>
              <div style={{ marginTop: 8, fontStyle: 'italic', fontSize: 12.5, color: 'var(--accent)', borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
                "{result.arch.shadowLine}"
              </div>
            </div>

            <div style={card}>
              <div style={labelStyle}>내적 갈등 시드</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                {result.conflicts.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>{c}</li>)}
              </ol>
            </div>

            <div style={card}>
              <div style={labelStyle}>서사 씨앗</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                <div><b style={{ color: 'var(--muted)' }}>촉발 사건</b> {result.catalyst}</div>
                <div style={{ marginTop: 4 }}><b style={{ color: 'var(--muted)' }}>통합·성장</b> {result.integration}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={copy} disabled={!result}>복사</button>
        {sourceCharId && <button className="minibtn" onClick={attachToSource} disabled={!result}>원본 인물에 합치기</button>}
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!result || !hasProjectBridge()}>프로젝트에 카드</button>
        <button className="linkbtn" onClick={saveToLibrary} disabled={!result}>인물 라이브러리</button>
        <button className="linkbtn" onClick={toStash} disabled={!result || !hasStash()}>수집함</button>
        <button className="linkbtn" onClick={toSheet} disabled={!result}>인물 시트로</button>
        <button className="linkbtn" onClick={toRelationship} disabled={!result}>관계도로</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)', minHeight: 14 }}>
        {toast || '겉으로 내세우는 성격을 입력할수록 그 반대편 그림자가 또렷해집니다.'}
      </div>
    </div>
  )
}

// 공유 캐릭터 → 신호 텍스트
function buildSignal(c: Record<string, string>): string {
  const keys = ['personality', 'value', 'goal', 'fear', 'flaw', 'role', 'motivation', 'secret', 'appearance']
  return keys.map((k) => c[k]).filter(Boolean).join('. ')
}
function buildSignalFromShared(c: SharedCharacter): string {
  const fromFields = c.fields ? buildSignal(c.fields) : ''
  const fromTop = [c.personality, c.goal, c.secret, c.role].filter(Boolean).join('. ')
  const fromTraits = (c.traits || []).map((t) => `${t.k}: ${t.v}`).join('. ')
  return [fromFields, fromTop, fromTraits].filter(Boolean).join('. ').slice(0, 600)
}
