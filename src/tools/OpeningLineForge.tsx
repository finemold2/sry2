// 첫 문장 대장간 — 소설의 첫 문장(오프닝) 후보를 조합형으로 대량 생성한다.
//   시점(인칭) × 어조 × 시작 유형(대사로/풍경으로/선언으로/의문으로/행동으로) × 요소 슬롯
//   을 조합해 수만~수십만 가지 첫 문장을 만든다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·라이브러리 불필요.
//   Math.random + localStorage(슬롯 잠금/현재 조합 보존)만 사용. 저장은 공유 라이브러리(스니펫).
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, useLibraryList, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'opening-line-forge', name: '첫 문장 대장간', icon: '✒️', group: '영감·발상', intro: '시점·어조·시작 유형과 요소를 조합해 소설 첫 문장 후보를 벼려내세요(수만 조합)', w: 500, h: 660 }

const LS = 'sry:tool:opening-line-forge'

// ---------- 공통 요소 풀(여러 유형이 함께 쓰는 슬롯) ----------
// 한국어 결합을 단순하게 유지하려고 받침에 따른 조사 변화는 helper 로 처리.
const SUBJECTS = [
  '그 남자', '그 여자', '낯선 손님', '마지막 증인', '죽은 자의 딸', '늙은 등대지기', '도망친 신부',
  '이름 없는 병사', '한물간 배우', '거짓말에 능한 아이', '잠들지 못하는 시인', '국경의 밀수꾼',
  '폐교의 마지막 교사', '비를 부르는 여자', '기억을 파는 상인', '쌍둥이 중 동생', '왕이 되기 싫은 왕자',
  '망명한 과학자', '비밀을 묻는 사서', '도시의 마지막 시계 수리공', '버려진 인형을 모으는 노인',
  '한 통의 편지', '낡은 회중시계', '문 앞에 놓인 상자', '눈먼 점성술사',
]
const PLACES = [
  '항구', '폐역', '눈 덮인 산장', '안개 낀 골목', '버려진 병원', '국경의 검문소', '낡은 극장',
  '바닷가 묘지', '도시의 옥상', '끝없이 이어진 복도', '불 꺼진 등대', '잿빛 강변', '무너진 성벽 아래',
  '한낮의 빈 교실', '비 내리는 정류장', '닫힌 서점', '오래된 온실', '지하 술집', '얼어붙은 호수',
  '폐허가 된 놀이공원', '먼지 쌓인 다락방', '새벽의 시장',
]
const TIMES = [
  '비 내리는 화요일', '폭설이 멈춘 새벽', '여름의 마지막 날', '전쟁이 끝난 봄', '아무도 깨지 않은 새벽',
  '장례식이 있던 오후', '눈이 오기 직전의 저녁', '해가 떨어지기 직전', '모두가 잠든 한밤중', '첫눈이 내린 아침',
  '축제의 마지막 밤', '서리가 내린 11월', '정전이 된 밤', '천둥이 치던 그날', '안개가 짙게 깔린 새벽',
]
const OBJECTS = [
  '한 통의 편지', '깨진 손목시계', '낡은 사진 한 장', '피 묻은 장갑', '주인 없는 우산', '빈 새장',
  '풀리지 않는 매듭', '꺼진 등불', '녹슨 열쇠', '반쪽 난 부적', '오래된 일기장', '식어버린 찻잔',
  '버려진 결혼반지', '봉인된 상자', '마른 꽃 한 송이', '금이 간 거울',
]
const EMOTIONS = [
  '두려움', '그리움', '분노', '체념', '죄책감', '안도', '권태', '갈망', '수치심', '외로움', '의심', '후회',
]

// 첫 문장 유형별 템플릿 슬롯. 각 함수는 (요소 인덱스) → 문장.
// 각 요소는 자체 face 배열을 가지며, 조합 수는 유형별로 다르다.
// 한국어 조사 보정: 받침 유무에 따른 은/는, 이/가, 을/를, 와/과.
function lastCharHasFinal(s: string): boolean {
  if (!s) return false
  const ch = s[s.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true // 비한글은 보수적으로 '받침 있음' 취급
  return (code - 0xac00) % 28 !== 0
}
const josaEunNeun = (s: string) => s + (lastCharHasFinal(s) ? '은' : '는')
const josaIGa = (s: string) => s + (lastCharHasFinal(s) ? '이' : '가')
const josaEulReul = (s: string) => s + (lastCharHasFinal(s) ? '을' : '를')

// ---------- 시점(인칭) · 어조 ----------
interface Persona { key: string; label: string }
const POVS: Persona[] = [
  { key: '1', label: '1인칭(나)' },
  { key: '3', label: '3인칭(그/그녀)' },
  { key: 'you', label: '2인칭(너)' },
]
const TONES: Persona[] = [
  { key: 'plain', label: '담담하게' },
  { key: 'lyric', label: '서정적으로' },
  { key: 'tense', label: '긴장되게' },
  { key: 'dry', label: '건조하게' },
  { key: 'fairy', label: '동화처럼' },
]

// '나' 대명사를 시점에 맞춰 치환하는 보조(템플릿이 1인칭 기준으로 작성됨).
function applyPov(sentence: string, pov: string): string {
  if (pov === '3') {
    return sentence
      .replace(/내가/g, '그가').replace(/나는/g, '그는').replace(/나를/g, '그를')
      .replace(/나의/g, '그의').replace(/내 /g, '그의 ').replace(/나에게/g, '그에게')
      .replace(/(?<![가-힣])나(?![가-힣])/g, '그')
  }
  if (pov === 'you') {
    return sentence
      .replace(/내가/g, '네가').replace(/나는/g, '너는').replace(/나를/g, '너를')
      .replace(/나의/g, '너의').replace(/내 /g, '너의 ').replace(/나에게/g, '너에게')
      .replace(/(?<![가-힣])나(?![가-힣])/g, '너')
  }
  return sentence
}

// 어조에 따른 미세 마감(접두/접미 어조 입히기). 과하지 않게.
function applyTone(sentence: string, tone: string): string {
  switch (tone) {
    case 'lyric': return sentence.replace(/\.$/, '었다.').replace(/었었다\.$/, '었다.')
    case 'tense': return sentence
    case 'dry': return sentence
    case 'fairy': return sentence
    default: return sentence
  }
}

// ---------- 시작 유형 ----------
interface OpenKind {
  key: string
  label: string
  icon: string
  // 이 유형이 사용하는 요소 슬롯 키 목록(조합 수 계산·잠금에 사용).
  slots: string[]
  // 선택된 요소 face 값으로 1인칭 기준 문장을 만든다.
  build: (e: Record<string, string>) => string
}

// 요소 풀 사전 — 유형별 build 에서 face 를 골라 쓴다.
const POOLS: Record<string, string[]> = {
  subject: SUBJECTS,
  place: PLACES,
  time: TIMES,
  object: OBJECTS,
  emotion: EMOTIONS,
  // 대사/선언/의문 전용 문구 풀
  line: [
    '죽은 사람은 거짓말을 하지 않아', '아무도 그 방에 들어가선 안 됩니다', '나는 그를 죽이지 않았어요',
    '오늘은 아무도 집에 돌아오지 못할 거야', '당신, 나를 기억하지 못하는군요', '거짓말이라는 거, 나도 알아',
    '이건 시작에 불과해', '다시는 그 이름을 입에 올리지 마', '약속은 약속이야', '여기서 멈추면 다 끝이야',
    '나를 찾지 말았어야 했어', '이미 늦었어요', '그날 밤 일은 비밀로 하기로 했잖아',
  ],
  claim: [
    '세상에 우연 같은 건 없다', '누구나 한 번쯤은 사람을 묻는다', '진실은 늘 가장 마지막에 도착한다',
    '사랑은 언제나 한 박자 늦게 온다', '모든 이별은 예고 없이 온다', '거짓말에도 품격이 있다',
    '죽음은 언제나 예의가 없다', '기억은 가장 잔인한 거짓말쟁이다', '도시는 비밀을 삼키고도 멀쩡했다',
    '용서받지 못할 일은 늘 사소하게 시작된다', '운명은 약속을 지키는 법이 없다',
  ],
  question: [
    '사람이 사람을 완전히 잊는 데 며칠이나 걸릴까',
    '죽은 자에게도 후회라는 게 남을까', '왜 하필 그날이었을까', '누가 먼저 거짓말을 시작했을까',
    '이 모든 게 정말 내 잘못이었을까', '돌아갈 수 있다면, 정말 돌아가고 싶을까',
    '그가 살아 있다면 나를 용서했을까', '진실을 안다는 건 축복일까 저주일까',
  ],
  action: [
    '문을 열자', '눈을 떴을 때', '방아쇠를 당기기 직전', '편지를 불태우면서', '마지막 계단을 내려서며',
    '전화를 끊고 나서', '그 이름을 부르자', '관 뚜껑이 닫히는 순간', '불을 끄려는데', '짐을 다 싸고 나서',
  ],
}

function f(e: Record<string, string>, k: string): string { return e[k] || '' }

const OPEN_KINDS: OpenKind[] = [
  {
    key: 'dialogue', label: '대사로', icon: '💬',
    slots: ['line', 'subject'],
    build: (e) => `“${f(e, 'line')}.” ${josaEunNeun(f(e, 'subject'))} 그렇게 말하며 나를 바라보았다.`,
  },
  {
    key: 'scene', label: '풍경으로', icon: '🌫️',
    slots: ['time', 'place', 'emotion'],
    build: (e) => `${f(e, 'time')}, ${f(e, 'place')}에는 ${josaIGa(f(e, 'emotion'))} 안개처럼 낮게 깔려 있었다.`,
  },
  {
    key: 'claim', label: '선언으로', icon: '⚡',
    slots: ['claim', 'subject'],
    build: (e) => `${f(e, 'claim')}. 적어도 ${josaEunNeun(f(e, 'subject'))} 그렇게 믿었다.`,
  },
  {
    key: 'question', label: '의문으로', icon: '❓',
    slots: ['question', 'place'],
    build: (e) => `${f(e, 'question')}? ${f(e, 'place')}에 서서 나는 그 질문을 곱씹었다.`,
  },
  {
    key: 'action', label: '행동으로', icon: '🏃',
    slots: ['action', 'object'],
    build: (e) => `${f(e, 'action')}, 가장 먼저 눈에 들어온 것은 ${josaEunNeun(f(e, 'object'))}이었다.`,
  },
]

// ---------- 유틸 ----------
const pickIdx = (len: number) => Math.floor(Math.random() * len)
function pickIdxExcl(len: number, exclude: number): number {
  if (len <= 1) return 0
  let i = exclude
  while (i === exclude) i = pickIdx(len)
  return i
}
const fmtNum = (n: number) => n.toLocaleString('ko-KR')
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 모든 슬롯(시점·어조·요소) 키 목록 — 잠금/선택의 단일 소스.
// 시작 유형은 별도(유형 자체를 잠그면 유형 고정).
type Sel = {
  pov: number
  tone: number
  kind: number              // OPEN_KINDS 인덱스
  elem: Record<string, number> // 요소 풀별 face 인덱스
}
type Locks = {
  pov?: boolean
  tone?: boolean
  kind?: boolean
  elem?: Record<string, boolean>
}

function randomElems(): Record<string, number> {
  const out: Record<string, number> = {}
  Object.keys(POOLS).forEach((k) => { out[k] = pickIdx(POOLS[k].length) })
  return out
}

function buildSentence(sel: Sel): string {
  const kind = OPEN_KINDS[sel.kind]
  if (!kind) return ''
  const e: Record<string, string> = {}
  kind.slots.forEach((slotKey) => {
    const pool = POOLS[slotKey]
    const idx = sel.elem[slotKey]
    e[slotKey] = pool && typeof idx === 'number' && pool[idx] != null ? pool[idx] : (pool ? pool[0] : '')
  })
  let s = kind.build(e)
  s = applyPov(s, POVS[sel.pov]?.key || '1')
  s = applyTone(s, TONES[sel.tone]?.key || 'plain')
  return s
}

export default function OpeningLineForge({ payload }: { payload?: Record<string, unknown> }) {
  const [sel, setSel] = useState<Sel>(() => {
    try {
      const raw = localStorage.getItem(LS + ':sel')
      if (raw) {
        const p = JSON.parse(raw) as Partial<Sel>
        const elem = randomElems()
        if (p.elem) Object.keys(elem).forEach((k) => {
          const v = p.elem![k]
          if (typeof v === 'number' && POOLS[k] && v >= 0 && v < POOLS[k].length) elem[k] = v
        })
        return {
          pov: typeof p.pov === 'number' && p.pov >= 0 && p.pov < POVS.length ? p.pov : pickIdx(POVS.length),
          tone: typeof p.tone === 'number' && p.tone >= 0 && p.tone < TONES.length ? p.tone : pickIdx(TONES.length),
          kind: typeof p.kind === 'number' && p.kind >= 0 && p.kind < OPEN_KINDS.length ? p.kind : pickIdx(OPEN_KINDS.length),
          elem,
        }
      }
    } catch { /* ignore */ }
    return { pov: pickIdx(POVS.length), tone: pickIdx(TONES.length), kind: pickIdx(OPEN_KINDS.length), elem: randomElems() }
  })
  const [locks, setLocks] = useState<Locks>(() => {
    try {
      const raw = localStorage.getItem(LS + ':locks')
      if (raw) return JSON.parse(raw) as Locks
    } catch { /* ignore */ }
    return { elem: {} }
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const rollTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  const saved = useLibraryList('snippets')
  const myLines = saved.filter((s) => Array.isArray(s.tags) && s.tags.includes('첫문장'))

  // 외부에서 payload 로 전달된 첫 문장(연계)이 있으면 안내.
  useEffect(() => {
    const p = payload?.line
    if (typeof p === 'string' && p.trim()) flash('전달된 첫 문장을 참고하세요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속화.
  useEffect(() => { try { localStorage.setItem(LS + ':sel', JSON.stringify(sel)) } catch { /* ignore */ } }, [sel])
  useEffect(() => { try { localStorage.setItem(LS + ':locks', JSON.stringify(locks)) } catch { /* ignore */ } }, [locks])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리.
  useEffect(() => {
    if (!rolling) return
    rollTimer.current = window.setTimeout(() => setRolling(false), 320)
    return () => { if (rollTimer.current !== null) { window.clearTimeout(rollTimer.current); rollTimer.current = null } }
  }, [rolling])
  useEffect(() => () => {
    if (rollTimer.current !== null) window.clearTimeout(rollTimer.current)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
  }, [])

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  // 잠기지 않은 항목만 다시 굴린다.
  const roll = () => {
    setCopied(false)
    setRolling(true)
    setSel((prev) => {
      const next: Sel = { ...prev, elem: { ...prev.elem } }
      if (!locks.pov) next.pov = pickIdxExcl(POVS.length, prev.pov)
      if (!locks.tone) next.tone = pickIdxExcl(TONES.length, prev.tone)
      if (!locks.kind) next.kind = pickIdxExcl(OPEN_KINDS.length, prev.kind)
      // 현재(또는 새) 유형이 쓰는 요소 슬롯만 굴려 변화를 체감하게.
      const kind = OPEN_KINDS[next.kind]
      Object.keys(prev.elem).forEach((k) => {
        if (locks.elem?.[k]) return
        // 현재 유형이 쓰는 슬롯은 반드시 새 값, 그 외 슬롯도 자연스럽게 굴려둠.
        if (kind && kind.slots.includes(k)) next.elem[k] = pickIdxExcl(POOLS[k].length, prev.elem[k])
        else next.elem[k] = pickIdx(POOLS[k].length)
      })
      return next
    })
  }

  const rollPersona = (which: 'pov' | 'tone' | 'kind') => {
    setCopied(false)
    setSel((prev) => {
      if (which === 'pov') return { ...prev, pov: pickIdxExcl(POVS.length, prev.pov) }
      if (which === 'tone') return { ...prev, tone: pickIdxExcl(TONES.length, prev.tone) }
      return { ...prev, kind: pickIdxExcl(OPEN_KINDS.length, prev.kind) }
    })
  }
  const rollElem = (k: string) => {
    setCopied(false)
    setSel((prev) => ({ ...prev, elem: { ...prev.elem, [k]: pickIdxExcl(POOLS[k].length, prev.elem[k]) } }))
  }

  const togglePersonaLock = (which: 'pov' | 'tone' | 'kind') =>
    setLocks((prev) => ({ ...prev, [which]: !prev[which] }))
  const toggleElemLock = (k: string) =>
    setLocks((prev) => ({ ...prev, elem: { ...(prev.elem || {}), [k]: !prev.elem?.[k] } }))

  // ---------- 조합 수 ----------
  // 전체 조합 수: 시점 × 어조 × Σ(유형별 요소 조합) — 유형마다 요소 슬롯이 달라 합산.
  const perKindCombos = OPEN_KINDS.map((kd) => kd.slots.reduce((a, k) => a * POOLS[k].length, 1))
  const totalCombos = POVS.length * TONES.length * perKindCombos.reduce((a, b) => a + b, 0)

  // 현재(잠금 반영) 다음 굴림에서 가능한 조합 수.
  const openCombos = (() => {
    const povN = locks.pov ? 1 : POVS.length
    const toneN = locks.tone ? 1 : TONES.length
    if (locks.kind) {
      const kd = OPEN_KINDS[sel.kind]
      const elemN = kd.slots.reduce((a, k) => a * (locks.elem?.[k] ? 1 : POOLS[k].length), 1)
      return povN * toneN * elemN
    }
    // 유형이 열려 있으면 가능한 유형들의 요소 조합 합산(요소 잠금은 해당 풀에만 적용).
    const sumKinds = OPEN_KINDS.reduce((acc, kd) => {
      const elemN = kd.slots.reduce((a, k) => a * (locks.elem?.[k] ? 1 : POOLS[k].length), 1)
      return acc + elemN
    }, 0)
    return povN * toneN * sumKinds
  })()

  const sentence = buildSentence(sel)
  const activeKind = OPEN_KINDS[sel.kind]

  const copy = () => {
    if (!sentence) return
    navigator.clipboard?.writeText(sentence).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* graceful */ })
  }

  const saveSnippet = () => {
    if (!sentence) return
    if (myLines.some((s) => s.text === sentence)) { flash('이미 저장된 첫 문장입니다.'); return }
    addToLibrary('snippets', { text: sentence, source: '첫 문장 대장간', tags: ['첫문장'] })
    flash('첫 문장을 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료 〈첫 문장 후보〉 폴더에 추가.
  const toProject = () => {
    if (!sentence) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const metaRows = [
      `<p><b>🎭 시점:</b> ${esc(POVS[sel.pov]?.label || '')}</p>`,
      `<p><b>🎚️ 어조:</b> ${esc(TONES[sel.tone]?.label || '')}</p>`,
      `<p><b>${esc(activeKind.icon)} 시작 유형:</b> ${esc(activeKind.label)}</p>`,
    ].join('')
    const bodyHtml = [
      `<p style="font-size:16px;line-height:1.8;"><b>✒️ ${esc(sentence)}</b></p>`,
      `<hr/>`,
      metaRows,
    ].join('')
    const raw = sentence.replace(/[“”"?]/g, '').trim()
    const title = '✒️ ' + (raw.length > 26 ? raw.slice(0, 26) + '…' : raw)
    const id = addToProject({ kind: 'text', root: 'research', folder: '첫 문장 후보', title, bodyHtml, synopsis: sentence })
    flash(id ? '프로젝트 자료 〈첫 문장 후보〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chip: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', color: 'var(--muted)' }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }

  // 페르소나(시점/어조/유형) 행 렌더러.
  const personaRow = (which: 'pov' | 'tone' | 'kind', icon: string, label: string, valueLabel: string, count: number) => {
    const isLocked = !!locks[which]
    return (
      <div style={row}>
        <div style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-8deg) scale(1.1)' : 'none' }}><Emoji e={icon} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label} · {count}종</div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, wordBreak: 'keep-all' }}>
            {rolling && !isLocked ? '…' : valueLabel}
          </div>
        </div>
        <button className="minibtn" onClick={() => rollPersona(which)} title="이 항목만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲" /></button>
        <button className="minibtn" onClick={() => togglePersonaLock(which)} title={isLocked ? '고정 해제' : '고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
          {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>시점·어조·시작 유형</b>과 <b>요소</b>를 조합해 소설 <b>첫 문장</b> 후보를 벼려냅니다. 마음에 드는 칸은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴려보세요.
      </div>

      {/* 조합 수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={chip}>전체 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(totalCombos)}</b>가지</span>
        <span style={chip}>현재 가능 <b style={{ color: 'var(--accent)' }}>{fmtNum(openCombos)}</b>가지</span>
      </div>

      {/* 페르소나(시점/어조/시작 유형) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {personaRow('pov', '🎭', '시점(인칭)', POVS[sel.pov]?.label || '', POVS.length)}
        {personaRow('tone', '🎚️', '어조', TONES[sel.tone]?.label || '', TONES.length)}
        {personaRow('kind', activeKind?.icon || '✒️', '시작 유형', activeKind?.label || '', OPEN_KINDS.length)}
        {/* personaRow icon 인자는 함수 내부에서 <Emoji>로 렌더됨 */}
      </div>

      {/* 현재 유형이 쓰는 요소 슬롯 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="🧩" /> 요소 (이 시작 유형이 쓰는 칸)</div>
        {activeKind?.slots.map((k) => {
          const isLocked = !!locks.elem?.[k]
          const labelMap: Record<string, string> = {
            line: '대사', subject: '인물', place: '장소', time: '시간', object: '사물',
            emotion: '감정', claim: '선언 문구', question: '질문', action: '행동',
          }
          const face = POOLS[k]?.[sel.elem[k]] || ''
          return (
            <div key={k} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{labelMap[k] || k} · {POOLS[k].length}면</div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, wordBreak: 'keep-all', color: face ? 'var(--text)' : 'var(--muted)' }}>
                  {rolling && !isLocked ? '…' : face}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollElem(k)} title="이 요소만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲" /></button>
              <button className="minibtn" onClick={() => toggleElemLock(k)} title={isLocked ? '고정 해제' : '고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* 결과 첫 문장 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="✒️" /> 첫 문장</div>
        <div style={{ fontSize: 17, lineHeight: 1.7, wordBreak: 'keep-all', color: sentence ? 'var(--text)' : 'var(--muted)' }}>
          {sentence || '굴려서 첫 문장을 만들어 보세요.'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲" /> 첫 문장 벼리기</button>
        <button className="minibtn" onClick={copy} disabled={!sentence}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!sentence}><Emoji e="⭐" /> 저장</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!sentence || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 첫 문장을 프로젝트 자료 〈첫 문장 후보〉에 추가'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저장한 첫 문장 목록(라이브러리 공유) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⭐" /> 저장한 첫 문장 ({myLines.length})</div>
        {myLines.length === 0 ? (
          <div style={hint}>마음에 드는 첫 문장은 ‘저장’으로 모아두면 다른 도구에서도 함께 쓸 수 있어요.</div>
        ) : (
          myLines.slice(0, 30).map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, wordBreak: 'keep-all', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flex: 1, minWidth: 0 }}>{s.text}</span>
              <button
                className="minibtn"
                style={{ flexShrink: 0 }}
                title="이 첫 문장 복사"
                onClick={() => { navigator.clipboard?.writeText(s.text).catch(() => { /* graceful */ }); flash('복사했습니다.') }}
              ><Emoji e="📋" /></button>
            </div>
          ))
        )}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 'auto', lineHeight: 1.5 }}>
        첫 문장 풀·템플릿은 본 도구의 자체 창작물(오픈소스, 외부 저작물 미사용). 외부 네트워크 없이 동작합니다.
      </div>
    </div>
  )
}
