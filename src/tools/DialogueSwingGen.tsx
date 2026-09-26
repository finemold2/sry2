// 대화 공방(티키타카) 생성기 — 두 인물이 주고받는 '말의 랠리'를 즉석에서 깔아주는 도구.
//  · 한 판(set)은 슬롯 조합으로 세팅된다: 상황 × 입장 대립(A의 패/B의 패) × 감정 온도.
//  · 그 무대 위로 '주고받기(swing)'를 여러 합 자동 생성 — 각 합은 〈말 전술(도발/회피/유도/반격…)〉을 골라
//    그 전술에 맞는 자작 대사 후보를 채운다. A↔B가 번갈아 받아치며 티키타카가 쌓인다.
//  · 각 슬롯/합은 🔒 잠가두고 나머지만 🎲 재생성 → 마음에 드는 결을 고정한 채 변주를 굴린다.
//  · 가능한 조합 수를 항상 표시(상황·입장·전술·대사 풀의 곱)로 '무작위의 넓이'를 체감.
//  · 산출: 한 판 전체를 대본 텍스트로 복사 / 좋은 한 합을 스니펫 라이브러리에 / 한 판을 프로젝트(원고·자료) 장면으로.
//  · 연계: 🎭 대사 서브텍스트 빌더(openToolLinked('dialogue-subtext')) — 마음에 드는 합을 표면/속마음으로 더 파고들기.
//
// 자급식: react 와 './linkbus' 외 import 없음. 완전 로컬(Math.random·localStorage). 외부 미디어/네트워크/키 없음.
// 저작권: 모든 대사·문구는 자작 텍스트. 영속: localStorage 'sry:tool:dialogue-swing-gen'. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToLibrary,
  addToStash,
  hasStash,
  openToolLinked,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'dialogue-swing-gen',
  name: '대화 공방 생성기',
  icon: '🥊',
  group: '영감·발상',
  intro: '상황×입장 대립×말 전술×감정으로 두 인물이 주고받는 티키타카 대사 흐름을 자동 생성',
  w: 780,
  h: 740,
}

const LS_KEY = 'sry:tool:dialogue-swing-gen'

// ───────────────────────── 유틸 ─────────────────────────
function uid(p: string): string { return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }
function esc(s: string): string { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }
function pickFresh<T>(a: T[], prev?: T): T {
  if (a.length <= 1) return a[0]
  let v = pick(a)
  if (v === prev) v = pick(a)
  return v
}

// ───────────────────────── 무대 슬롯 풀(자작) ─────────────────────────
// 상황: 두 사람이 부딪치는 장면의 한 줄 무대.
const SITUATION = [
  '계약을 깨려는 쪽과 붙들려는 쪽이 마주 앉았다',
  '거짓말이 막 들통난 식탁',
  '떠나려는 가방을 사이에 둔 현관',
  '같은 자리를 두고 다투는 두 후보의 대기실',
  '돈을 빌려준 쪽과 갚지 못한 쪽의 좁은 사무실',
  '사고의 진짜 책임을 묻는 늦은 밤 거실',
  '비밀을 아는 자와 들킨 자가 둘만 남은 옥상',
  '이별을 통보하러 온 자와 매달리는 자의 카페',
  '아이의 양육을 두고 갈라선 부부의 변호사 사무실',
  '배신한 동료를 불러 세운 텅 빈 회의실',
  '사과를 받으러 온 자와 끝내 인정 않는 자의 병실',
  '유산을 두고 얼굴 붉히는 형제의 본가',
  '내부고발을 막으려는 상사와 폭로하려는 직원',
  '오래 미룬 진실을 캐묻는 재회의 자리',
  '서로를 의심하는 공범의 마지막 회동',
  '용서를 비는 가해자와 끝내 등 돌린 피해자',
]
// 입장(패): A/B가 각자 쥐고 있는 '명분'. 두 패가 정면으로 부딪칠수록 불꽃이 튄다.
const STANCE = [
  '내가 옳았다는 걸 끝내 증명하려 한다',
  '나는 잘못한 게 없다고 믿는다',
  '너를 지키려고 그랬다고 우긴다',
  '다 너 때문에 이렇게 됐다고 떠넘긴다',
  '이미 늦었으니 그만하자고 한다',
  '이번만큼은 물러설 수 없다',
  '진실은 따로 있다고 암시한다',
  '네가 먼저 사과해야 한다고 못 박는다',
  '없던 일로 덮자고 회유한다',
  '관계를 여기서 끝내려 한다',
  '어떻게든 시간을 더 벌려 한다',
  '책임을 절반씩 나누자고 제안한다',
  '약점을 쥐고 거래를 걸려 한다',
  '끝까지 모른 척하기로 작정했다',
  '상대의 본심을 떠보려 한다',
  '이번 일로 빚을 청산하려 한다',
]
// 감정 온도: 장면 전체의 결.
const MOOD = [
  '겉은 차분, 속은 폭발 직전',
  '조롱과 비웃음이 깔린',
  '울음을 꾹 참는',
  '서늘하게 가라앉은',
  '분노가 점점 끓어오르는',
  '지치고 체념한',
  '날 선 빈정거림이 오가는',
  '애원과 자존심이 뒤섞인',
  '소름 끼치게 정중한',
  '터지기 직전의 긴장된 침묵',
]

// ───────────────────────── 말 전술 × 대사 풀(자작) ─────────────────────────
// 각 전술은 '한 합'에서 인물이 취하는 화법. 풀의 문구는 무대에 끼워 넣어도 어색하지 않은 범용 라인.
interface Tactic { id: string; label: string; icon: string; hint: string; lines: string[] }
const TACTICS: Tactic[] = [
  {
    id: 'provoke', label: '도발', icon: '🔥', hint: '상대의 약점·자존심을 찔러 흔든다',
    lines: [
      '그 표정, 찔리니까 그러는 거잖아.',
      '겁먹은 얼굴 좀 봐. 이럴 줄 알았어.',
      '당당한 척은. 손 떨리는 거 보이는데.',
      '네가 그렇게 깨끗했으면 지금 여기 안 왔겠지.',
      '그래서, 또 도망갈 거야? 늘 그랬던 것처럼.',
      '대단하네. 자기 변명 하나는 끝내주게 하잖아.',
      '울면 다 끝날 줄 알아? 그 수법, 이제 안 통해.',
      '말해 봐. 차마 입이 안 떨어지지?',
    ],
  },
  {
    id: 'evade', label: '회피', icon: '🌫️', hint: '핵심을 비껴가며 답을 미룬다',
    lines: [
      '지금 그 얘기를 꼭 해야 돼?',
      '나중에. 지금은 그럴 때가 아니야.',
      '그건… 그렇게 단순한 문제가 아니야.',
      '내가 뭘 어쨌다고. 그만하자, 응?',
      '왜 자꾸 옛날 얘기를 꺼내.',
      '글쎄, 기억이 잘 안 나는데.',
      '그건 네가 오해한 거야. 넘어가자.',
      '꼭 흑백으로 나눠야 속이 시원해?',
    ],
  },
  {
    id: 'lead', label: '유도', icon: '🎣', hint: '질문·미끼로 상대가 스스로 말하게 만든다',
    lines: [
      '그날 밤, 정말 혼자였어?',
      '네 입으로 한번 말해 봐. 들어줄게.',
      '내가 뭘 알고 있다고 생각해?',
      '그래서 그다음엔 어떻게 했는데?',
      '솔직히, 후회 안 해? 단 한 번도?',
      '내가 먼저 말 꺼내길 기다리는 거야?',
      '그 사람 이름, 네가 먼저 말해 볼래?',
      '왜 그렇게 그 얘기만 피해 가는 걸까.',
    ],
  },
  {
    id: 'counter', label: '반격', icon: '⚔️', hint: '받은 말을 되받아 칼끝을 돌린다',
    lines: [
      '내가? 그 말, 너한테 그대로 돌려줄게.',
      '잘못? 먼저 거짓말한 게 누군데.',
      '그래, 다 내 탓이라 치자. 그럼 너는?',
      '나만 몰랐을 뿐, 너도 알고 있었잖아.',
      '도망간 건 내가 아니라 너였어.',
      '사과? 그 입으로 사과를 논해?',
      '겁쟁이는 내가 아니라 거울 속에 있어.',
      '판단은 네가 할 게 아니야. 적어도 너는.',
    ],
  },
  {
    id: 'confess', label: '고백·자백', icon: '💔', hint: '감춰둔 진심·진실을 터뜨려 판을 뒤집는다',
    lines: [
      '…그래. 다 내가 한 짓이야.',
      '사실은, 그날 너를 봤어. 전부.',
      '미안해. 정말, 진심으로 미안해.',
      '아무한테도 말 못 했어. 너무 무서워서.',
      '너 없으면 안 될 것 같았어. 그래서 그랬어.',
      '이제야 말하지만… 다 알고 있었어.',
      '용서받고 싶은 게 아니야. 그냥 말하고 싶었어.',
      '내가 다 망쳤어. 처음부터 끝까지.',
    ],
  },
  {
    id: 'placate', label: '회유', icon: '🤝', hint: '달래고 무마하며 상대를 진정시키려 한다',
    lines: [
      '진정해. 우리 그렇게 싸울 사이 아니잖아.',
      '내 말 끝까지 들어줘. 딱 한 번만.',
      '우리 둘 다 지쳤어. 오늘은 여기까지 하자.',
      '내가 다 맞춰줄게. 원하는 대로.',
      '없던 일로 하자. 응? 서로 좋게.',
      '너도 힘들었던 거 알아. 다 이해해.',
      '우리, 처음으로 돌아갈 순 없을까.',
      '화내는 거 다 받아줄게. 그러니 가지 마.',
    ],
  },
  {
    id: 'threaten', label: '위협', icon: '🗡️', hint: '경고·압박으로 상대를 몰아붙인다',
    lines: [
      '한 번만 더 그러면, 나도 가만 안 있어.',
      '네가 입 다물지 않으면 다 잃게 될 거야.',
      '이게 마지막 경고야. 잘 들어.',
      '내가 무슨 짓까지 할 수 있는지 몰라서 그래?',
      '여기서 멈추는 게 너한테도 좋을 텐데.',
      '내가 아는 걸 다 풀어놓길 바라?',
      '선택해. 지금. 다음은 없어.',
      '그 입, 함부로 놀리지 마.',
    ],
  },
  {
    id: 'silence', label: '침묵·지문', icon: '🤐', hint: '말 대신 행동/침묵이 대사가 된다(지문)',
    lines: [
      '(아무 말 없이 자리에서 일어선다)',
      '(천천히 고개를 젓는다)',
      '(시선을 떨군 채 입술을 깨문다)',
      '(쥐고 있던 손을 스르르 푼다)',
      '(문 쪽으로 한 걸음 물러선다)',
      '(긴 침묵. 시계 초침 소리만 들린다)',
      '(빈 잔을 내려놓는다. 소리가 유난히 크다)',
      '(돌아서다 멈춘다. 그러나 끝내 돌아보지 않는다)',
    ],
  },
]
function tacticById(id: string): Tactic | undefined { return TACTICS.find((t) => t.id === id) }

// ───────────────────────── 영속 타입 ─────────────────────────
type Side = 'A' | 'B'
interface Stage {            // 무대(상황·입장·감정)
  situation: string
  stanceA: string
  stanceB: string
  mood: string
}
interface Swing {            // 한 합(주고받기 한 줄)
  id: string
  side: Side
  tacticId: string
  line: string
  locked: boolean           // 🔒 이 합 고정(재생성 시 보존)
}
interface Persisted {
  nameA: string
  nameB: string
  stage: Stage
  stageLock: { situation: boolean; stanceA: boolean; stanceB: boolean; mood: boolean }
  swings: Swing[]
  swingCount: number        // 한 번에 생성할 합 수
}

function rollStage(prev: Stage | null, lock: Persisted['stageLock']): Stage {
  const p = prev || { situation: '', stanceA: '', stanceB: '', mood: '' }
  return {
    situation: lock.situation && p.situation ? p.situation : pickFresh(SITUATION, p.situation),
    stanceA: lock.stanceA && p.stanceA ? p.stanceA : pickFresh(STANCE, p.stanceA),
    stanceB: lock.stanceB && p.stanceB ? p.stanceB : pickFresh(STANCE, p.stanceB),
    mood: lock.mood && p.mood ? p.mood : pickFresh(MOOD, p.mood),
  }
}

// 한 합 생성: 직전 합과 다른 전술·다른 대사를 고르도록 시도(같은 화자 반복 회피는 호출부에서)
function rollSwing(side: Side, prevTacticId?: string, prevLine?: string): Swing {
  const t = pickFresh(TACTICS, tacticById(prevTacticId || ''))
  const line = pickFresh(t.lines, prevLine)
  return { id: uid('sw'), side, tacticId: t.id, line, locked: false }
}

function defaultPersisted(): Persisted {
  const stageLock = { situation: false, stanceA: false, stanceB: false, mood: false }
  return {
    nameA: '인물 A',
    nameB: '인물 B',
    stage: rollStage(null, stageLock),
    stageLock,
    swings: [],
    swingCount: 6,
  }
}

function loadPersisted(): Persisted {
  const base = defaultPersisted()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') return base
    const st = o.stage && typeof o.stage === 'object' ? o.stage : {}
    const stage: Stage = {
      situation: typeof st.situation === 'string' && st.situation ? st.situation : base.stage.situation,
      stanceA: typeof st.stanceA === 'string' && st.stanceA ? st.stanceA : base.stage.stanceA,
      stanceB: typeof st.stanceB === 'string' && st.stanceB ? st.stanceB : base.stage.stanceB,
      mood: typeof st.mood === 'string' && st.mood ? st.mood : base.stage.mood,
    }
    const lk = o.stageLock && typeof o.stageLock === 'object' ? o.stageLock : {}
    const stageLock = {
      situation: !!lk.situation, stanceA: !!lk.stanceA, stanceB: !!lk.stanceB, mood: !!lk.mood,
    }
    const swings: Swing[] = Array.isArray(o.swings)
      ? o.swings.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
          id: typeof s.id === 'string' ? s.id : uid('sw'),
          side: s.side === 'B' ? 'B' : 'A',
          tacticId: tacticById(s.tacticId) ? s.tacticId : TACTICS[0].id,
          line: typeof s.line === 'string' ? s.line : '',
          locked: !!s.locked,
        }))
      : []
    const cnt = Number(o.swingCount)
    return {
      nameA: typeof o.nameA === 'string' && o.nameA.trim() ? o.nameA : base.nameA,
      nameB: typeof o.nameB === 'string' && o.nameB.trim() ? o.nameB : base.nameB,
      stage,
      stageLock,
      swings,
      swingCount: Number.isFinite(cnt) ? Math.min(16, Math.max(2, Math.round(cnt))) : base.swingCount,
    }
  } catch {
    return base
  }
}

// ───────────────────────── 조합 수 계산 ─────────────────────────
// 무대 조합 × (한 합이 가질 수 있는 〈전술×대사〉 경우의 수)^합수 의 상한을 사람이 읽기 쉽게 표기.
const STAGE_COMBOS = SITUATION.length * STANCE.length * STANCE.length * MOOD.length
const PER_SWING = TACTICS.reduce((n, t) => n + t.lines.length, 0) // 전술×대사 합산(한 합의 후보 수)
function fmtBig(n: number): string {
  if (!Number.isFinite(n)) return '천문학적'
  if (n >= 1e16) return n.toExponential(2).replace('e+', '×10^')
  return Math.round(n).toLocaleString('ko-KR')
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function DialogueSwingGen({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Persisted>(loadPersisted())

  const [nameA, setNameA] = useState(init.current.nameA)
  const [nameB, setNameB] = useState(init.current.nameB)
  const [stage, setStage] = useState<Stage>(init.current.stage)
  const [stageLock, setStageLock] = useState(init.current.stageLock)
  const [swings, setSwings] = useState<Swing[]>(init.current.swings)
  const [swingCount, setSwingCount] = useState(init.current.swingCount)
  const [startSide, setStartSide] = useState<Side>('A')

  const [toast, setToast] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const mounted = useRef(true)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const appliedPayload = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드(다른 도구에서 인물/상황을 받아 시작) — 1회 적용
  useEffect(() => {
    if (appliedPayload.current || !payload) return
    appliedPayload.current = true
    try {
      const nm = (v: any): string => typeof v === 'string' ? v : (v && typeof v === 'object' ? String((v as any).name || '') : '')
      const a = nm(payload.characterA ?? payload.charA ?? payload.nameA)
      const b = nm(payload.characterB ?? payload.charB ?? payload.nameB)
      if (a.trim()) setNameA(a.trim())
      if (b.trim()) setNameB(b.trim())
      if (typeof payload.situation === 'string' && payload.situation.trim()) {
        setStage((s) => ({ ...s, situation: payload.situation as string }))
      }
    } catch { /* noop */ }
  }, [payload])

  // 자동 저장
  useEffect(() => {
    const data: Persisted = { nameA, nameB, stage, stageLock, swings, swingCount }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.') }
  }, [nameA, nameB, stage, stageLock, swings, swingCount])

  // 토스트 자동 소거
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  // 합 생성 후 보드 맨 아래로
  useEffect(() => {
    const el = boardRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [swings.length])

  // ── 무대 ──
  const rollStageAll = () => { setStage((prev) => rollStage(prev, stageLock)); setToast('무대를 다시 깔았어요(잠근 칸은 그대로).') }
  const rollStageOne = (key: keyof Stage) => {
    setStage((prev) => {
      const map: Record<keyof Stage, string[]> = { situation: SITUATION, stanceA: STANCE, stanceB: STANCE, mood: MOOD }
      return { ...prev, [key]: pickFresh(map[key], prev[key]) }
    })
  }
  const toggleStageLock = (key: keyof Persisted['stageLock']) =>
    setStageLock((prev) => ({ ...prev, [key]: !prev[key] }))

  // ── 합(swing) 생성: 잠긴 합은 보존하고 나머지를 새 흐름으로 ──
  const generate = useCallback(() => {
    setSwings((prev) => {
      const next: Swing[] = []
      let side: Side = startSide
      let prevTactic: string | undefined
      let prevLine: string | undefined
      for (let i = 0; i < swingCount; i++) {
        const existing = prev[i]
        if (existing && existing.locked) {
          next.push(existing)
          side = existing.side === 'A' ? 'B' : 'A'
          prevTactic = existing.tacticId
          prevLine = existing.line
          continue
        }
        const sw = rollSwing(side, prevTactic, prevLine)
        next.push(sw)
        side = side === 'A' ? 'B' : 'A'
        prevTactic = sw.tacticId
        prevLine = sw.line
      }
      return next
    })
    setToast('티키타카 한 판을 생성했어요.')
  }, [swingCount, startSide])

  // 한 합만 재생성(잠금 무시하지 않음 — 잠긴 합은 버튼이 비활성)
  const rerollSwing = (id: string) => {
    setSwings((prev) => prev.map((s, i) => {
      if (s.id !== id || s.locked) return s
      const before = prev[i - 1]
      return rollSwing(s.side, before?.tacticId, before?.line)
    }))
  }
  // 한 합의 전술을 지정해 그 전술 안에서 대사만 새로
  const setSwingTactic = (id: string, tacticId: string) => {
    setSwings((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const t = tacticById(tacticId)
      if (!t) return s
      return { ...s, tacticId, line: pickFresh(t.lines, s.line) }
    }))
  }
  const reSwingLine = (id: string) => {
    setSwings((prev) => prev.map((s) => {
      if (s.id !== id || s.locked) return s
      const t = tacticById(s.tacticId)
      if (!t) return s
      return { ...s, line: pickFresh(t.lines, s.line) }
    }))
  }
  const toggleSwingLock = (id: string) =>
    setSwings((prev) => prev.map((s) => s.id === id ? { ...s, locked: !s.locked } : s))
  const flipSwingSide = (id: string) =>
    setSwings((prev) => prev.map((s) => s.id === id ? { ...s, side: s.side === 'A' ? 'B' : 'A' } : s))
  const removeSwing = (id: string) =>
    setSwings((prev) => prev.filter((s) => s.id !== id))

  const clearBoard = () => { setSwings([]); setConfirmClear(false); setToast('생성된 대사를 모두 비웠어요.') }

  const nameOf = (side: Side) => (side === 'A' ? nameA : nameB) || (side === 'A' ? '인물 A' : '인물 B')

  // ── 산출: 대본 텍스트 ──
  const scriptText = useCallback((): string => {
    const out: string[] = []
    out.push(`${nameOf('A')} × ${nameOf('B')} — 대화 공방`)
    out.push('')
    out.push(`[상황] ${stage.situation}`)
    out.push(`[${nameOf('A')}의 패] ${stage.stanceA}`)
    out.push(`[${nameOf('B')}의 패] ${stage.stanceB}`)
    out.push(`[감정 온도] ${stage.mood}`)
    out.push('')
    swings.forEach((s) => {
      const t = tacticById(s.tacticId)
      if (s.tacticId === 'silence') out.push(`${nameOf(s.side)}: ${s.line}`)
      else out.push(`${nameOf(s.side)}〔${t?.label || ''}〕: ${s.line}`)
    })
    return out.join('\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameA, nameB, stage, swings])

  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했어요.') }
  }
  const copyText = (text: string, msg: string) => {
    const done = () => { if (mounted.current) setToast(msg) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const copyScript = () => { if (swings.length) copyText(scriptText(), '한 판을 대본으로 복사했어요.') }

  // ── 산출: 프로젝트 문서 ──
  const bodyHtml = (): string => {
    const parts: string[] = []
    parts.push('<p style="color:#888;font-size:12px;margin:0 0 6px">무대</p>')
    const row = (k: string, v: string) => `<p style="margin:2px 0"><b>${esc(k)}</b> ${esc(v)}</p>`
    parts.push(row('상황 ·', stage.situation))
    parts.push(row(`${nameOf('A')}의 패 ·`, stage.stanceA))
    parts.push(row(`${nameOf('B')}의 패 ·`, stage.stanceB))
    parts.push(row('감정 온도 ·', stage.mood))
    parts.push('<hr/>')
    if (!swings.length) parts.push('<p style="color:#888">아직 생성된 대사가 없습니다.</p>')
    swings.forEach((s) => {
      const t = tacticById(s.tacticId)
      if (s.tacticId === 'silence') {
        parts.push(`<p style="color:#888;font-style:italic;margin:6px 0">${esc(s.line)}</p>`)
      } else {
        parts.push(`<p style="margin:6px 0"><b>${esc(nameOf(s.side))}</b> <span style="color:#888;font-size:12px">〔${esc(t?.label || '')}〕</span> &nbsp;${esc(s.line)}</p>`)
      }
    })
    return parts.join('')
  }
  const saveToProject = (root: 'draft' | 'research') => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root,
      folder: root === 'draft' ? '대화 공방' : '대사 연습',
      title: `${nameOf('A')} × ${nameOf('B')} — 대화 공방`,
      bodyHtml: bodyHtml(),
      synopsis: stage.situation,
      meta: { 인물A: nameOf('A'), 인물B: nameOf('B'), 합수: String(swings.length), 감정: stage.mood },
    })
    setToast(id ? (root === 'draft' ? '원고에 장면 문서를 추가했어요.' : '자료에 장면 문서를 추가했어요.') : '프로젝트에 추가하지 못했어요.')
  }

  const stashScript = () => {
    if (!hasStash()) { setToast('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'note', label: `대화 공방 — ${nameOf('A')} × ${nameOf('B')}`, text: scriptText() })
    setToast('수집함에 한 판을 담았어요.')
  }

  const snippetSwing = (s: Swing) => {
    const t = tacticById(s.tacticId)
    const line = s.tacticId === 'silence' ? `${nameOf(s.side)}: ${s.line}` : `${nameOf(s.side)}〔${t?.label || ''}〕: ${s.line}`
    addToLibrary('snippets', { text: line, source: '대화 공방', tags: ['대사', t?.label || ''] })
    setToast('스니펫 라이브러리에 한 합을 보관했어요.')
  }

  // 서브텍스트 빌더로 연계(마음에 드는 합을 표면/속마음으로 더 파고들기)
  const openSubtext = (s?: Swing) => {
    const surface = s ? s.line : (swings[0]?.line || '')
    openToolLinked('dialogue-subtext', {
      surface,
      characterA: nameOf('A'),
      characterB: nameOf('B'),
      situation: stage.situation,
    })
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', background: 'var(--paper)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2, var(--panel))', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }

  const lockedCount = swings.filter((s) => s.locked).length

  return (
    <div style={wrap}>
      {/* 헤더 */}
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🥊"/></span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>대화 공방</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyScript} disabled={!swings.length} title="한 판을 대본 텍스트로 복사"><Emoji e="📋"/> 복사</button>
        {hasStash() && <button className="minibtn" onClick={stashScript} disabled={!swings.length} title="수집함에 한 판 담기"><Emoji e="📎"/> 수집함</button>}
        <button className="linkbtn" onClick={() => saveToProject('draft')} disabled={!swings.length || !hasProjectBridge()} title="원고에 장면 문서로 저장"><Emoji e="📄"/> 원고에</button>
        <button className="linkbtn" onClick={() => saveToProject('research')} disabled={!swings.length || !hasProjectBridge()} title="자료에 장면 문서로 저장"><Emoji e="📄"/> 자료에</button>
        <button className="linkbtn" onClick={() => openSubtext()} disabled={!swings.length} title="대사 서브텍스트 빌더로 표면/속마음 파고들기"><Emoji e="🎭"/> 서브텍스트</button>
      </div>

      {toast && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--accent-2, var(--accent))', background: 'var(--chrome-2, var(--panel))', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>{toast}</div>}

      <div style={body}>
        {/* 인물 + 시작 화자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 4px', flexWrap: 'wrap' }}>
          <input value={nameA} onChange={(e) => setNameA(e.target.value)} maxLength={40} placeholder="인물 A"
            style={{ flex: '1 1 120px', minWidth: 90, padding: '6px 9px', fontSize: 13, fontWeight: 700, color: COLOR_A, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)' }} />
          <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>×</span>
          <input value={nameB} onChange={(e) => setNameB(e.target.value)} maxLength={40} placeholder="인물 B"
            style={{ flex: '1 1 120px', minWidth: 90, padding: '6px 9px', fontSize: 13, fontWeight: 700, color: COLOR_B, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>먼저 시작:</span>
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button className={'minibtn' + (startSide === 'A' ? ' active' : '')} style={{ padding: '3px 9px', fontSize: 11, borderColor: startSide === 'A' ? COLOR_A : 'var(--border)' }} onClick={() => setStartSide('A')} aria-pressed={startSide === 'A'}>{nameOf('A')}</button>
            <button className={'minibtn' + (startSide === 'B' ? ' active' : '')} style={{ padding: '3px 9px', fontSize: 11, borderColor: startSide === 'B' ? COLOR_B : 'var(--border)' }} onClick={() => setStartSide('B')} aria-pressed={startSide === 'B'}>{nameOf('B')}</button>
          </div>
        </div>

        {/* 무대 카드(상황·입장·감정) */}
        <div style={{ margin: '4px 12px 8px', ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🎴"/> 무대</span>
            <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={rollStageAll} title="잠그지 않은 칸을 새로 뽑기"><Emoji e="🎲"/> 무대 새로</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>무대 조합 {fmtBig(STAGE_COMBOS)}가지</span>
          </div>
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SlotRow tag="상황" value={stage.situation} locked={stageLock.situation} onRoll={() => rollStageOne('situation')} onLock={() => toggleStageLock('situation')} />
            <SlotRow tag={`${nameOf('A')}의 패`} color={COLOR_A} value={stage.stanceA} locked={stageLock.stanceA} onRoll={() => rollStageOne('stanceA')} onLock={() => toggleStageLock('stanceA')} />
            <SlotRow tag={`${nameOf('B')}의 패`} color={COLOR_B} value={stage.stanceB} locked={stageLock.stanceB} onRoll={() => rollStageOne('stanceB')} onLock={() => toggleStageLock('stanceB')} />
            <SlotRow tag="감정 온도" value={stage.mood} locked={stageLock.mood} onRoll={() => rollStageOne('mood')} onLock={() => toggleStageLock('mood')} />
          </div>
        </div>

        {/* 생성 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 8px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={generate} title="잠근 합은 그대로 두고 나머지를 새 흐름으로 채웁니다"><Emoji e="⚡"/> 티키타카 {swings.length ? '다시 ' : ''}생성</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>합 수</span>
          <input type="range" min={2} max={16} value={swingCount} onChange={(e) => setSwingCount(Number(e.target.value))} style={{ width: 110 }} />
          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{swingCount}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>한 합 후보 {PER_SWING}가지 · 전술 {TACTICS.length}종</span>
        </div>

        {/* 보드 */}
        <div ref={boardRef} style={{ flex: 1, minHeight: 80, overflowY: 'auto', padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {swings.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.9, padding: 20 }}>
              무대를 정한 뒤 <b style={{ color: 'var(--accent)' }}><Emoji e="⚡"/> 티키타카 생성</b>을 누르세요.<br />
              <span style={{ fontSize: 12 }}>두 인물이 〈도발·회피·유도·반격…〉 전술을 번갈아 쓰며<br />주고받는 대사 흐름이 만들어집니다. 마음에 드는 합은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.</span>
            </div>
          ) : (
            swings.map((s, i) => (
              <SwingBubble
                key={s.id}
                swing={s} index={i + 1} name={nameOf(s.side)}
                onReroll={() => rerollSwing(s.id)}
                onReLine={() => reSwingLine(s.id)}
                onSetTactic={(tid) => setSwingTactic(s.id, tid)}
                onLock={() => toggleSwingLock(s.id)}
                onFlip={() => flipSwingSide(s.id)}
                onRemove={() => removeSwing(s.id)}
                onSnippet={() => snippetSwing(s)}
                onSubtext={() => openSubtext(s)}
              />
            ))
          )}
        </div>

        {/* 하단 상태/액션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 12px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {swings.length}합{lockedCount ? <> · <Emoji e="🔒"/> {lockedCount} 고정</> : ''}
          </span>
          <span style={{ flex: 1 }} />
          {swings.length > 0 && !confirmClear && <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmClear(true)}><Emoji e="🗑️"/> 비우기</button>}
          {confirmClear && (
            <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--warn)' }}>모두 지울까요?</span>
              <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={clearBoard}>비우기</button>
              <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setConfirmClear(false)}>취소</button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const COLOR_A = '#4a76d4'
const COLOR_B = '#e07a5f'

// ───────────────────────── 무대 슬롯 한 줄 ─────────────────────────
function SlotRow(props: { tag: string; value: string; color?: string; locked: boolean; onRoll: () => void; onLock: () => void }) {
  const { tag, value, color, locked, onRoll, onLock } = props
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: color || 'var(--muted)', minWidth: 72, paddingTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tag}>{tag}</span>
      <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5, color: locked ? 'var(--muted)' : 'var(--text)' }}>{value}</span>
      <button className="minibtn" style={{ flexShrink: 0, padding: '1px 6px', fontSize: 10, opacity: locked ? 0.4 : 1 }} onClick={onRoll} disabled={locked} title={locked ? '잠겨 있어요' : '이 칸만 다시 뽑기'}><Emoji e="🎲"/></button>
      <button className="minibtn" style={{ flexShrink: 0, padding: '1px 6px', fontSize: 10, borderColor: locked ? 'var(--accent)' : 'var(--border)' }} onClick={onLock} title={locked ? '잠금 해제' : '이 칸 잠가두기'} aria-pressed={locked}>{locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
    </div>
  )
}

// ───────────────────────── 한 합 말풍선 ─────────────────────────
function SwingBubble(props: {
  swing: Swing; index: number; name: string
  onReroll: () => void; onReLine: () => void; onSetTactic: (tid: string) => void
  onLock: () => void; onFlip: () => void; onRemove: () => void; onSnippet: () => void; onSubtext: () => void
}) {
  const { swing, index, name, onReroll, onReLine, onSetTactic, onLock, onFlip, onRemove, onSnippet, onSubtext } = props
  const [tacticOpen, setTacticOpen] = useState(false)
  const t = tacticById(swing.tacticId)
  const right = swing.side === 'B'
  const color = right ? COLOR_B : COLOR_A
  const isBeat = swing.tacticId === 'silence'

  return (
    <div style={{ display: 'flex', flexDirection: right ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: swing.locked ? 'var(--accent)' : color, color: '#fff', fontSize: 11, fontWeight: 700, marginTop: 16,
      }} title={`${index}번째 합`}>{index}</span>

      <div style={{ maxWidth: '78%', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: right ? '0 4px 2px 0' : '0 0 2px 4px', flexDirection: right ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{name}</span>
          <button
            className="minibtn"
            style={{ padding: '0 6px', fontSize: 10, lineHeight: 1.7, borderColor: 'var(--border)' }}
            onClick={() => setTacticOpen((v) => !v)}
            title="이 합의 말 전술 바꾸기"
          ><Emoji e={t?.icon || ''}/> {t?.label} ▾</button>
        </div>

        {tacticOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '0 0 4px', justifyContent: right ? 'flex-end' : 'flex-start', maxWidth: 360 }}>
            {TACTICS.map((tc) => (
              <button key={tc.id} className={'minibtn' + (tc.id === swing.tacticId ? ' active' : '')}
                style={{ padding: '1px 6px', fontSize: 10, borderColor: tc.id === swing.tacticId ? 'var(--accent)' : 'var(--border)' }}
                onClick={() => { onSetTactic(tc.id); setTacticOpen(false) }} title={tc.hint}>
                <Emoji e={tc.icon}/> {tc.label}
              </button>
            ))}
          </div>
        )}

        <div style={{
          background: right ? 'color-mix(in srgb, ' + color + ' 16%, var(--paper))' : 'var(--panel)',
          border: '1px solid ' + (swing.locked ? 'var(--accent)' : color),
          borderRadius: 12, borderTopRightRadius: right ? 3 : 12, borderTopLeftRadius: right ? 12 : 3,
          padding: '8px 11px', fontSize: 14, lineHeight: 1.55, color: 'var(--text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontStyle: isBeat ? 'italic' : 'normal',
        }}>
          {swing.line}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 3, justifyContent: right ? 'flex-end' : 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
          {!swing.locked && <MiniIcon label="이 합 다시 굴리기(전술까지)" onClick={onReroll}><Emoji e="🎲"/></MiniIcon>}
          {!swing.locked && <MiniIcon label="같은 전술로 대사만 새로" onClick={onReLine}><Emoji e="🔁"/></MiniIcon>}
          <MiniIcon label={swing.locked ? '잠금 해제' : '이 합 고정'} onClick={onLock} active={swing.locked}>{swing.locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</MiniIcon>
          <MiniIcon label="화자 바꾸기" onClick={onFlip}>⇄</MiniIcon>
          <MiniIcon label="이 합을 스니펫으로 저장" onClick={onSnippet}><Emoji e="📌"/></MiniIcon>
          <MiniIcon label="서브텍스트로 파고들기" onClick={onSubtext}><Emoji e="🎭"/></MiniIcon>
          <MiniIcon label="삭제" onClick={onRemove} warn><Emoji e="🗑️"/></MiniIcon>
        </div>
      </div>
    </div>
  )
}

function MiniIcon(props: { children: React.ReactNode; label: string; onClick: () => void; warn?: boolean; active?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: props.active ? 1 : 0.6, padding: 0, lineHeight: 1, color: props.warn ? 'var(--warn)' : (props.active ? 'var(--accent)' : 'inherit') }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = props.active ? '1' : '0.6' }}
    >{props.children}</button>
  )
}
