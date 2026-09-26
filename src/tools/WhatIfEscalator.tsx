// What-if 증폭기 — 전제 한 줄을 입력하면 "그런데 만약 ~라면?" 가지를 1~5단계로 점증 생성한다.
// 단계가 오를수록 위기가 고조되도록, 자작 변형 슬롯(주체/사건/제약/대가 등)을 단계별 강도에 맞춰 조합한다.
// 자급식: 외부 네트워크/라이브러리/미디어 없음. Math.random + localStorage(보관)만 사용.
// 연계(linkbus): 마음에 든 가지 사슬을 글감 스니펫 라이브러리에 저장하거나, 자료(research)/'영감 메모' 폴더에 메모로 추가.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, hasStash, addToStash, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'what-if-escalator', name: 'What-if 증폭기', icon: '🌪️', group: '영감·발상', intro: '전제 한 줄을 "그런데 만약 ~라면?" 5단계 점증 위기로 증폭하세요', w: 640, h: 620 }

const LS = 'sry:tool:what-if-escalator'

// ───────────────────────────────────────────────────────────────────────────
// 변형 슬롯 — 모두 자작 텍스트. 단계(강도 1~5)마다 다른 풀에서 뽑아 위기가 점점 고조되게 한다.
//   tpl: '{x}' 자리에 슬롯 단어를 끼워 "그런데 만약 ~라면?" 가지를 만든다.
//   {p} 는 직전 가지의 핵심(또는 최초 전제)을 받아 사슬처럼 이어붙인다.
// ───────────────────────────────────────────────────────────────────────────

// 단계별 강도 라벨/색 (1=잔물결 … 5=파국)
const TIERS = [
  { n: 1, label: '잔물결', icon: '💧', color: '#5fc9a3', desc: '작은 균열 — 전제에 첫 의심을 던진다' },
  { n: 2, label: '동요', icon: '🌊', color: '#6ab0e0', desc: '판이 흔들린다 — 통제가 어긋나기 시작' },
  { n: 3, label: '위기', icon: '🔥', color: '#e0a96a', desc: '돌이키기 어려운 선택의 문턱' },
  { n: 4, label: '붕괴', icon: '⚡', color: 'var(--warn)', desc: '안전망이 끊긴다 — 모두가 휩쓸린다' },
  { n: 5, label: '파국', icon: '☄️', color: '#e05c7e', desc: '최악 — 더는 되돌릴 수 없는 끝' },
]

// ── 한국어 조사 자동 선택 헬퍼 ────────────────────────────────────────────
// 앞 단어의 마지막 글자 받침 유무를 보고 올바른 조사 하나만 출력한다.
//   "을(를)" 같은 괄호 이중표기를 절대 노출하지 않기 위함.
function hasJong(word: string): boolean {
  const w = word.trim()
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 취급
  return (code - 0xac00) % 28 !== 0
}
// '이/가'
function josaIGa(word: string): string { return word + (hasJong(word) ? '이' : '가') }
// '을/를'
function josaEulReul(word: string): string { return word + (hasJong(word) ? '을' : '를') }
// '은/는'
function josaEunNeun(word: string): string { return word + (hasJong(word) ? '은' : '는') }
// '으로/로' — 'ㄹ' 받침은 '로'를 쓴다.
function josaRo(word: string): string {
  const w = word.trim()
  if (!w) return word + '로'
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return w + '로'
  const jong = (code - 0xac00) % 28
  return w + (jong === 0 || jong === 8 ? '로' : '으로') // 받침 없음 또는 'ㄹ'(=8) → 로
}
// 템플릿의 조사 토큰을 실제 조사로 치환.
//   {x:가}=이/가, {x:를}=을/를, {x:는}=은/는, {x:로}=으로/로, {x}=조사 없음(서술·부사구)
function fillSlot(tpl: string, slot: string): string {
  return tpl
    .replace('{x:가}', josaIGa(slot))
    .replace('{x:를}', josaEulReul(slot))
    .replace('{x:는}', josaEunNeun(slot))
    .replace('{x:로}', josaRo(slot))
    .replace('{x}', slot)
}

// 각 단계의 변형 템플릿 풀. {p}=직전 핵심, {x..}=이 단계의 변형 슬롯(조사 토큰)
// 모든 템플릿은 슬롯을 '명사구'로 받도록 설계 — 슬롯 풀과 곱집합으로 섞여도 문법·의미가 어긋나지 않는다.
type Tier = 1 | 2 | 3 | 4 | 5
const TEMPLATES: Record<Tier, string[]> = {
  1: [
    '{p} — 그런데 만약 그것이 처음부터 {x}였다면?',
    '{p} — 그런데 만약 {x:가} 조용히 끼어 있었다면?',
    '{p} — 그런데 만약 아무도 모르게 {x}였다면?',
    '{p} — 그런데 만약 그 이면에 {x:가} 숨어 있었다면?',
    '{p} — 그런데 만약 사실은 {x}였을 뿐이라면?',
    '{p} — 그런데 만약 {x:가} 이미 오래전에 시작돼 있었다면?',
    '{p} — 그런데 만약 누구도 {x:를} 눈치채지 못했다면?',
    '{p} — 그런데 만약 그 모든 것이 {x}에서 비롯됐다면?',
    '{p} — 그런데 만약 {x:가} 우연이 아니라 의도였다면?',
    '{p} — 그런데 만약 {x:가} 첫 단추부터 어긋나 있었다면?',
  ],
  2: [
    '거기서 만약 {x:가} 드러나 통제가 어긋나기 시작한다면?',
    '거기서 만약 {x} 때문에 한 사람이 발을 헛디딘다면?',
    '거기서 만약 {x:가} 작은 거짓말을 부르고, 그 거짓말이 굴러간다면?',
    '거기서 만약 {x:가} 믿음을 흔들어 편이 갈리기 시작한다면?',
    '거기서 만약 {x:가} 시한을 당겨 시간이 모자라기 시작한다면?',
    '거기서 만약 {x:로} 인해 작은 균열이 점점 벌어진다면?',
    '거기서 만약 {x:가} 엉뚱한 사람에게 불똥을 튀긴다면?',
    '거기서 만약 {x:를} 덮으려다 일이 더 커진다면?',
    '거기서 만약 {x:가} 예상보다 빨리 들통난다면?',
    '거기서 만약 {x:가} 조용히 다음 사람에게 옮겨간다면?',
  ],
  3: [
    '그러다 만약 {x} 앞에서 돌이킬 수 없는 선택을 강요당한다면?',
    '그러다 만약 {x:가} 누군가를 배신으로 내몬다면?',
    '그러다 만약 {x:로} 인해 지켜온 규칙을 스스로 어겨야 한다면?',
    '그러다 만약 {x:가} 비밀을 폭로해 모두를 위험에 빠뜨린다면?',
    '그러다 만약 {x:가} 가장 가까운 이를 적으로 돌려세운다면?',
    '그러다 만약 {x:가} 마지막 신뢰마저 무너뜨린다면?',
    '그러다 만약 {x:를} 두고 동료끼리 칼끝을 겨눈다면?',
    '그러다 만약 {x:가} 막다른 골목으로 모두를 몰아넣는다면?',
    '그러다 만약 {x:로} 인해 더는 물러설 곳이 없어진다면?',
    '그러다 만약 {x:가} 지켜야 할 사람을 위태롭게 한다면?',
  ],
  4: [
    '결국 만약 {x:로} 안전망이 끊겨 무고한 이들까지 휩쓸린다면?',
    '결국 만약 {x:가} 연쇄 반응을 일으켜 손쓸 수 없이 번진다면?',
    '결국 만약 {x} 때문에 믿었던 모든 토대가 무너진다면?',
    '결국 만약 {x:가} 한 사람의 희생을 대가로 요구한다면?',
    '결국 만약 {x:가} 되돌릴 마지막 기회마저 태워버린다면?',
    '결국 만약 {x:로} 통제 불능의 사태가 걷잡을 수 없이 커진다면?',
    '결국 만약 {x:가} 모두가 의지하던 마지막 보루를 삼킨다면?',
    '결국 만약 {x:가} 살릴 수 있었던 이들마저 끌고 내려간다면?',
    '결국 만약 {x:로} 누구도 책임질 수 없는 지경에 이른다면?',
    '결국 만약 {x:가} 세운 계획을 송두리째 뒤엎는다면?',
  ],
  5: [
    '그리하여 만약 {x:로} 모든 것을 잃고도 진실은 더 잔혹했다면?',
    '그리하여 만약 {x:가} 구원처럼 보였으나 더 깊은 파멸이었다면?',
    '그리하여 만약 {x} 끝에 살아남은 자가 가장 큰 형벌을 받는다면?',
    '그리하여 만약 {x:로} 끝났다 믿은 순간 사실 시작에 불과했다면?',
    '그리하여 만약 {x:가} 처음의 그 선택으로 모두 예정돼 있었다면?',
    '그리하여 만약 {x:가} 마지막 희망마저 재로 만들었다면?',
    '그리하여 만약 {x:로} 돌아갈 곳도 용서받을 길도 사라졌다면?',
    '그리하여 만약 {x:가} 모든 의미를 한꺼번에 지워버렸다면?',
    '그리하여 만약 {x} 너머에 더 깊은 어둠이 기다리고 있었다면?',
    '그리하여 만약 {x:가} 누구의 잘못도 아닌 채 모두를 끝냈다면?',
  ],
}

// 단계별 변형 슬롯({x}). 강도가 오를수록 더 치명적·돌이킬 수 없는 어휘로.
// 모두 '명사구'(주어/목적어/부사어로 쓸 수 있는) — 종결문을 넣지 않는다. 고유 항목만.
const SLOTS: Record<Tier, string[]> = {
  1: [
    '오해', '우연', '사소한 비밀', '잘못된 소문', '잊힌 약속', '작은 거짓말', '엇갈린 기억',
    '눈에 띄지 않던 단서', '무심한 한마디', '미뤄둔 결정', '낡은 습관', '닮은 얼굴', '바뀐 순서',
    '흘려들은 경고', '대수롭지 않게 넘긴 징후', '빛바랜 사진 한 장', '우연히 마주친 이름', '아주 작은 어긋남',
  ],
  2: [
    '숨겨온 빚', '들통난 정체', '깨진 신뢰', '예상 밖의 증인', '사라진 증거', '뒤바뀐 편지',
    '잘못 전달된 명령', '예고 없는 방문자', '균열 난 동맹', '새어 나간 계획', '오작동한 장치', '앞당겨진 마감',
    '엇갈린 알리바이', '뒤늦게 도착한 경고', '바꿔치기된 서류', '꼬리를 밟힌 거짓말', '되살아난 옛 원한', '슬그머니 바뀐 규칙',
  ],
  3: [
    '돌이킬 수 없는 고백', '강요된 거래', '내부의 배신자', '치명적 협박', '금지된 선을 넘는 선택',
    '인질이 된 사람', '발각된 음모', '되돌릴 수 없는 사고', '갈라선 동지', '시간을 다투는 추격',
    '피할 수 없는 대면', '들이닥친 최후통첩', '값비싼 침묵', '한쪽을 버려야 하는 갈림길', '되살아난 과거의 죄',
    '무너진 마지막 약속', '돌아선 마지막 아군', '목에 겨눠진 칼',
  ],
  4: [
    '걷잡을 수 없는 화재', '연쇄 붕괴', '전면적 배신', '무너지는 권력', '대규모 탈출',
    '봉인이 풀린 위협', '집단의 광기', '끊긴 통신', '독이 든 신뢰', '마지막 보루의 함락',
    '번져 가는 폭동', '무너진 방벽', '돌이킬 수 없는 폭발', '바닥난 시간', '버려진 구조 신호',
    '뒤집힌 전세', '삼켜 버린 거짓의 불길', '끊어진 생명줄',
  ],
  5: [
    '모두를 삼킨 파국', '뒤집힌 진실', '대가 없는 승리의 환상', '돌아온 망령', '예정된 비극',
    '구원을 가장한 멸망', '살아남은 자의 형벌', '다시 시작되는 악몽', '스스로 부른 종말', '되돌릴 수 없는 침묵',
    '잿더미가 된 약속', '텅 빈 승리', '끝내 닿지 못한 용서', '영원히 닫힌 문', '아무도 남지 않은 세계',
    '거꾸로 흐른 시간', '되풀이되는 마지막 밤', '모든 빛이 꺼진 자리',
  ],
}

// 사슬 마디 하나
interface Node {
  tier: Tier
  ti: number   // 템플릿 인덱스
  si: number   // 슬롯 인덱스
  text: string // 렌더된 문장
  locked: boolean
}

// 보관(스토리지) 항목
interface Saved {
  id: string
  premise: string
  lines: string[]
  note: string
  ts: number
}

function uid(): string {
  return 'w_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function randInt(n: number): number { return Math.floor(Math.random() * n) }

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 마디 렌더: 템플릿의 {p}=직전 핵심, {x..}=슬롯(조사 자동 선택)
function renderNode(tier: Tier, ti: number, si: number, prevCore: string): string {
  const tpl = TEMPLATES[tier][ti] || TEMPLATES[tier][0]
  const slot = SLOTS[tier][si] || SLOTS[tier][0]
  return fillSlot(tpl.replace('{p}', prevCore), slot)
}

// "직전 핵심" 추출 — 다음 마디의 {p} 자리에 들어갈 짧은 문구(끝의 물음표/대시 정리)
function coreOf(text: string): string {
  let t = text.replace(/—.*$/, '').trim()       // 1단계의 "{p} — …" 형태면 앞부분만
  if (!t) t = text
  return t.replace(/\s+/g, ' ').trim()
}

export default function WhatIfEscalator({ payload }: { payload?: Record<string, unknown> }) {
  // payload 로 전제 선전달 가능(다른 도구에서 openToolLinked 로 넘어올 때)
  const initialPremise = (() => {
    const p = payload && (payload.premise ?? payload.text ?? payload.title)
    return typeof p === 'string' ? p : ''
  })()

  const [premise, setPremise] = useState(initialPremise)
  const [depth, setDepth] = useState(5)             // 생성 단계 수 1~5
  const [chain, setChain] = useState<Node[]>([])    // 현재 사슬
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const nonce = useRef(0)

  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && Array.isArray(s.lines)).map((s) => ({
            id: typeof s.id === 'string' ? s.id : uid(),
            premise: typeof s.premise === 'string' ? s.premise : '',
            lines: (s.lines as unknown[]).map((x) => String(x)),
            note: typeof s.note === 'string' ? s.note : '',
            ts: typeof s.ts === 'number' ? s.ts : Date.now(),
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  // 보관 영속
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* graceful */ }
  }, [saved])

  // 플래시 메시지 타이머 정리(언마운트/재설정)
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(''), 2200)
    return () => window.clearTimeout(t)
  }, [flash])

  // 조합수 계산: 단계마다 (템플릿 수 × 슬롯 수). depth 단계까지 곱.
  const totalCombos = (() => {
    let prod = 1
    for (let t = 1 as Tier; t <= depth; t = (t + 1) as Tier) {
      prod *= TEMPLATES[t].length * SLOTS[t].length
    }
    return prod
  })()

  const fmt = (n: number) => n.toLocaleString('ko-KR')

  // 전체 생성(잠긴 마디는 유지, 나머지만 새로)
  const generate = (regenAll: boolean) => {
    const base = premise.trim()
    if (!base) { setFlash('먼저 전제 한 줄을 입력하세요.'); return }
    const my = ++nonce.current
    const next: Node[] = []
    let prevCore = base
    for (let i = 0; i < depth; i++) {
      const tier = (i + 1) as Tier
      const old = chain[i]
      if (!regenAll && old && old.locked && old.tier === tier) {
        // 잠긴 마디 유지 — 단, 직전 핵심이 바뀌었으면 {p} 자리만 갱신해 사슬 연결 유지
        const text = renderNode(tier, old.ti, old.si, prevCore)
        next.push({ ...old, text })
        prevCore = coreOf(text)
        continue
      }
      const ti = randInt(TEMPLATES[tier].length)
      const si = randInt(SLOTS[tier].length)
      const text = renderNode(tier, ti, si, prevCore)
      next.push({ tier, ti, si, text, locked: old?.locked ?? false })
      prevCore = coreOf(text)
    }
    if (my === nonce.current) {
      setChain(next)
      setTab('gen')
    }
  }

  // 특정 마디만 재생성(이후 마디의 {p} 갱신을 위해 사슬 뒤쪽도 텍스트 재계산)
  const regenNode = (idx: number) => {
    setChain((prev) => {
      const next = prev.map((n) => ({ ...n }))
      const base = premise.trim() || '전제'
      // idx 마디 새 변형
      const tier = next[idx].tier
      next[idx].ti = randInt(TEMPLATES[tier].length)
      next[idx].si = randInt(SLOTS[tier].length)
      // idx 부터 끝까지 텍스트 재계산(앞선 핵심 반영)
      let prevCore = idx === 0 ? base : coreOf(next[idx - 1].text)
      for (let i = idx; i < next.length; i++) {
        next[i].text = renderNode(next[i].tier, next[i].ti, next[i].si, prevCore)
        prevCore = coreOf(next[i].text)
      }
      return next
    })
  }

  const toggleLock = (idx: number) => {
    setChain((prev) => prev.map((n, i) => (i === idx ? { ...n, locked: !n.locked } : n)))
  }

  const lines = (): string[] => {
    const head = '전제: ' + (premise.trim() || '(없음)')
    return [head, ...chain.map((n, i) => `${i + 1}. ${n.text}`)]
  }

  const chainText = () => lines().join('\n')

  const copyAll = () => {
    if (!chain.length) { setFlash('먼저 생성하세요.'); return }
    if (!navigator.clipboard) { setFlash('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(chainText())
      .then(() => setFlash('사슬 전체를 복사했어요.'))
      .catch(() => setFlash('복사에 실패했습니다.'))
  }

  // 현재 사슬을 보관함에 저장
  const saveChain = () => {
    if (!chain.length) { setFlash('먼저 생성하세요.'); return }
    setSaved((prev) => [{
      id: uid(),
      premise: premise.trim(),
      lines: chain.map((n) => n.text),
      note: '',
      ts: Date.now(),
    }, ...prev])
    setFlash('보관함에 저장했어요.')
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }
  // 보관된 사슬을 다시 편집기로 불러오기
  const loadSaved = (s: Saved) => {
    setPremise(s.premise)
    const n = Math.min(5, Math.max(1, s.lines.length))
    setDepth(n)
    // 텍스트만 복원(잠금 처리해 재생성 시 보존). 슬롯 인덱스는 알 수 없으므로 0 으로 두되 잠금.
    const restored: Node[] = s.lines.slice(0, n).map((text, i) => ({
      tier: (i + 1) as Tier, ti: 0, si: 0, text, locked: true,
    }))
    setChain(restored)
    setTab('gen')
    setFlash('보관된 사슬을 불러왔어요. (잠금 상태)')
  }

  // 글감 스니펫 라이브러리에 저장(여러 도구가 공유)
  const toLibrary = () => {
    if (!chain.length) { setFlash('먼저 생성하세요.'); return }
    addToLibrary('snippets', {
      text: chainText(),
      source: 'What-if 증폭기',
      tags: ['영감', 'what-if', '점증 위기'],
    })
    setFlash('글감 스니펫 라이브러리에 저장했어요.')
  }

  // 수집함에 담기
  const toStash = () => {
    if (!chain.length) { setFlash('먼저 생성하세요.'); return }
    if (!hasStash()) { setFlash('수집함이 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'memo', label: 'What-if: ' + (premise.trim().slice(0, 24) || '전제'), text: chainText() })
    setFlash('수집함에 담았어요.')
  }

  // 프로젝트 자료(영감 메모)에 추가
  const toProject = () => {
    if (!chain.length) { setFlash('먼저 생성하세요.'); return }
    if (!hasProjectBridge()) { setFlash('프로젝트에 연결되어 있지 않습니다.'); return }
    const body =
      `<p><strong>🌪️ 전제: ${escHtml(premise.trim() || '(없음)')}</strong></p>` +
      chain.map((n, i) => {
        const tier = TIERS[n.tier - 1]
        return `<p>${i + 1}. <strong>[${escHtml(tier.label)}]</strong> ${escHtml(n.text)}</p>`
      }).join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: 'What-if 증폭 — ' + (premise.trim().slice(0, 30) || '전제'),
      bodyHtml: body,
      synopsis: chain.map((n) => n.text).join(' → ').slice(0, 200),
      meta: { 전제: premise.trim().slice(0, 80), 단계수: String(chain.length) },
    })
    setFlash(id ? '프로젝트 자료(영감 메모)에 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // 좌측 바인더 파일 드롭 → 전제로 사용
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const t = item.title || item.text || ''
    if (t) { setPremise(t.slice(0, 120)); setFlash(`'${item.title}' 을(를) 전제로 가져왔어요.`) }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" style={tabBtn(tab === 'gen')} onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}><Emoji e="🌪️"/> 증폭기</button>
        <button className="minibtn" style={tabBtn(tab === 'saved')} onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}><Emoji e="⭐"/> 보관함 ({saved.length})</button>
      </div>

      {tab === 'gen' && (
        <>
          <div style={hint}>
            전제 한 줄을 입력하면 <b>"그런데 만약 ~라면?"</b> 가지를 단계별로 점점 위기가 고조되도록 증폭합니다.
            마음에 드는 마디는 <b><Emoji e="🔒"/> 잠가</b> 두고 나머지만 다시 굴리세요.
          </div>

          {/* 전제 입력 (좌측 파일 드롭 수용) */}
          <div
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{ position: 'relative' }}
          >
            <textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="전제 한 줄… 예) 평범한 회사원이 우연히 진실을 알게 된다.  (좌측 파일을 끌어다 놓아도 됩니다)"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: dragOver ? 'var(--paper)' : 'var(--panel)', color: 'var(--text)',
                border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10,
                padding: '10px 12px', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 단계 조절 + 조합수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>단계</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="minibtn" onClick={() => setDepth(n)} aria-pressed={depth === n}
                style={{ minWidth: 34, borderColor: depth === n ? 'var(--accent)' : 'var(--border)', color: depth === n ? 'var(--text)' : 'var(--muted)' }}>
                {n}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }} title="현재 단계 수에서 만들 수 있는 서로 다른 사슬의 수">
              가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(totalCombos)}</b>가지
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => generate(false)}><Emoji e="🌪️"/> 증폭 / 잠금 외 다시</button>
            <button className="minibtn" onClick={() => generate(true)} title="잠금 무시하고 전부 새로"><Emoji e="🎲"/> 전부 새로</button>
          </div>

          {/* 사슬 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {chain.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px 16px', lineHeight: 1.7 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🌪️"/></div>
                전제를 적고 <b>증폭</b>을 눌러보세요.<br />
                <span style={{ fontSize: 12 }}>1단계 잔물결 → 5단계 파국까지 위기가 점점 고조됩니다.</span>
              </div>
            )}

            {chain.length > 0 && (
              <div style={{ fontSize: 13, fontWeight: 700, padding: '6px 10px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, lineHeight: 1.5 }}>
                <Emoji e="🎯"/> 전제: <span style={{ fontWeight: 500 }}>{premise.trim() || '(없음)'}</span>
              </div>
            )}

            {chain.map((n, i) => {
              const tier = TIERS[n.tier - 1]
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  {/* 강도 막대 + 연결선 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0 }}>
                    <div title={`${tier.label} (강도 ${tier.n})`}
                      style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: tier.color, color: '#fff', fontWeight: 700, boxShadow: `0 0 ${4 + n.tier * 3}px ${tier.color}` }}>
                      <Emoji e={tier.icon}/>
                    </div>
                    {i < chain.length - 1 && <div style={{ flex: 1, width: 2, background: 'linear-gradient(var(--border), var(--border))', marginTop: 2 }} />}
                  </div>

                  {/* 마디 카드 */}
                  <div style={{
                    flex: 1, background: 'var(--panel)', border: `1px solid ${n.locked ? tier.color : 'var(--border)'}`,
                    borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, border: `1px solid ${tier.color}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                        {i + 1}단계 · {tier.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{tier.desc}</span>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" onClick={() => regenNode(i)} title="이 마디만 다시" style={{ padding: '2px 7px' }} disabled={n.locked}><Emoji e="🔄"/></button>
                      <button className="minibtn" onClick={() => toggleLock(i)} title={n.locked ? '잠금 해제' : '이 마디 잠그기'}
                        style={{ padding: '2px 7px', borderColor: n.locked ? tier.color : 'var(--border)', color: n.locked ? tier.color : 'var(--muted)' }}>
                        {n.locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                      </button>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55 }}>{n.text}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 동작 + 연계 */}
          {chain.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={saveChain}><Emoji e="⭐"/> 보관</button>
              <button className="minibtn" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
              <button className="minibtn" onClick={toLibrary} title="여러 도구가 공유하는 글감 스니펫으로 저장"><Emoji e="📝"/> 글감으로</button>
              {hasStash() && <button className="minibtn" onClick={toStash}><Emoji e="🧺"/> 수집함</button>}
            </div>
          )}

          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!chain.length || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !chain.length ? '먼저 생성하세요' : '증폭한 사슬을 자료(영감 메모)에 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>

          {flash && <div style={{ ...hint, color: 'var(--ok)' }}>{flash}</div>}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사슬이 없습니다.<br />
              <span style={{ fontSize: 12 }}>증폭기에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 점증 위기를 모아두세요.</span>
            </div>
          )}
          {saved.map((s, i) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Emoji e="🌪️"/> {s.premise || '(전제 없음)'}
                </span>
                <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => loadSaved(s)} title="편집기로 불러오기">↩ 불러오기</button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.lines.map((l, li) => {
                  const tier = TIERS[Math.min(li, TIERS.length - 1)]
                  return (
                    <li key={li} style={{ fontSize: 13, lineHeight: 1.5 }}>
                      <span style={{ color: tier.color, fontWeight: 700 }}><Emoji e={tier.icon}/> </span>{l}
                    </li>
                  )
                })}
              </ol>
              <textarea
                value={s.note}
                onChange={(e) => setNote(s.id, e.target.value)}
                placeholder="이 점증 위기를 내 이야기에 어떻게 쓸지 메모…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
