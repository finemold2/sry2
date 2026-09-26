// 도덕적 딜레마 생성기 — 인물이 처한 두 가치의 충돌(충성 vs 진실, 사랑 vs 의무 등)에
// 구체적 상황과 양쪽의 대가를 무작위로 엮어 "쉽게 결정할 수 없는" 갈등을 설계한다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(Math.random). 외부 API 불필요.
// 생성기 규약: 슬롯별 🔒 잠금 → 잠긴 슬롯은 유지하고 나머지만 재생성, 가능한 조합수 표시.
// 영속: 보관함을 localStorage 'sry:tool:dilemma-generator' 에 자동 저장/복원.
// 연계(linkbus): 설계한 딜레마를 프로젝트 자료('research')/'갈등' 폴더에 문서로 추가 · 스니펫 저장.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = {
  id: 'dilemma-generator',
  name: '도덕적 딜레마 생성기',
  icon: '⚖️',
  group: '영감·발상',
  intro: '두 가치의 충돌+구체 상황+양쪽의 대가로 쉽게 답할 수 없는 갈등을 설계하세요',
  w: 560,
  h: 640,
}

const LS = 'sry:tool:dilemma-generator'

// ---------- 데이터 표(로컬 대량 조합) ----------
// 가치 충돌 쌍: a/b 두 가치, 각 가치를 지킬 때의 대가(costA = a를 택해 b를 저버릴 때 치르는 값).
interface ValuePair {
  a: string          // 한쪽 가치
  b: string          // 맞서는 가치
  costA: string      // a를 택했을 때 b쪽에서 치르는 대가
  costB: string      // b를 택했을 때 a쪽에서 치르는 대가
}
const PAIRS: ValuePair[] = [
  { a: '충성', b: '진실', costA: '거짓을 함께 짊어지고 양심을 좀먹는다', costB: '평생 지켜온 신의와 동료를 잃는다' },
  { a: '사랑', b: '의무', costA: '맡은 책임을 저버려 많은 이를 위험에 빠뜨린다', costB: '가장 소중한 사람을 끝내 떠나보낸다' },
  { a: '정의', b: '자비', costA: '용서받을 수 있었던 자를 끝내 벌한다', costB: '죄를 눈감아 또 다른 피해를 부른다' },
  { a: '자유', b: '안전', costA: '사랑하는 이들을 위험 속에 내던진다', costB: '스스로를 보이지 않는 새장에 가둔다' },
  { a: '명예', b: '생존', costA: '죽음을 무릅쓰고 자신과 가족을 위험에 빠뜨린다', costB: '비겁자라는 낙인을 평생 안고 산다' },
  { a: '가족', b: '대의', costA: '수많은 타인의 운명을 외면한다', costB: '제 핏줄을 제물로 바친다' },
  { a: '약속', b: '현실', costA: '눈앞의 파국을 알면서도 막지 못한다', costB: '평생 지킨 말의 무게를 스스로 부순다' },
  { a: '복수', b: '용서', costA: '증오에 영혼을 내주고 똑같은 괴물이 된다', costB: '죽은 이들에게 진 빚을 영원히 갚지 못한다' },
  { a: '진실', b: '평화', costA: '간신히 봉합한 세상을 다시 찢어놓는다', costB: '거짓 위에 세운 침묵을 묵인한다' },
  { a: '개인의 양심', b: '집단의 명령', costA: '동료들에게 배신자로 낙인찍혀 버림받는다', costB: '돌이킬 수 없는 죄에 자기 손을 보탠다' },
  { a: '꿈', b: '책임', costA: '자신에게 기댄 사람들을 무너뜨린다', costB: '단 한 번뿐인 자기 삶을 영영 접는다' },
  { a: '신념', b: '소중한 사람', costA: '가장 가까운 이를 적으로 돌린다', costB: '평생을 바쳐 믿어온 것을 부정한다' },
  { a: '비밀 엄수', b: '한 생명', costA: '구할 수 있던 목숨을 눈앞에서 잃는다', costB: '맡겨진 신뢰와 더 큰 약속을 무너뜨린다' },
  { a: '연민', b: '냉정한 판단', costA: '한 사람을 살리려다 더 많은 이를 위태롭게 한다', costB: '살릴 수 있던 한 사람을 외면한다' },
  { a: '진심', b: '예의', costA: '관계를 지키던 거리와 평온을 깨뜨린다', costB: '끝내 하지 못한 말을 가슴에 묻는다' },
  { a: '소속', b: '신앙', costA: '평생을 함께한 공동체에서 추방당한다', costB: '영혼의 뿌리인 믿음을 등진다' },
  { a: '아이의 미래', b: '진실의 무게', costA: '아이에게 평생 거짓을 짊어지게 한다', costB: '아이의 세계를 송두리째 무너뜨린다' },
  { a: '은혜 갚기', b: '옳은 일', costA: '명백한 악을 알면서도 돕는다', costB: '목숨을 빚진 은인을 배신한다' },
  { a: '예술혼', b: '인간의 도리', costA: '사람을 도구로 써 상처를 남긴다', costB: '평생의 걸작을 미완으로 버린다' },
  { a: '나라', b: '인류애', costA: '국경 밖의 무고한 이들을 외면한다', costB: '제 나라를 배신자의 손에 넘긴다' },
]

// 딜레마의 구체적 무대(상황). 두 가치가 동시에 걸리는 결정의 순간.
const SITUATIONS: string[] = [
  '한밤중, 단 한 통의 전화로 모든 것이 뒤집힐 순간',
  '법정의 증언대에 서서 입을 떼기 직전',
  '문이 닫히기 전, 한 사람만 데리고 나갈 수 있는 화재 현장',
  '서명만 하면 끝나는 계약서를 앞에 둔 책상',
  '폭풍 속, 구명보트에 자리가 단 하나 남은 갑판',
  '수술실 문 앞, 가족에게 진실을 말해야 하는 순간',
  '적의 명단이 적힌 편지를 불태울지 망설이는 새벽',
  '오랜 친구의 비밀을 폭로할 마이크 앞에서',
  '병상의 손을 놓아야 할지 결정하는 한밤의 병실',
  '국경 검문소, 위조 서류를 든 손이 떨리는 순간',
  '결혼식 직전, 진실을 알아버린 대기실',
  '버튼 하나로 다수를 살리고 한 명을 잃게 되는 통제실',
  '유언장을 고쳐 쓸 수 있는 마지막 밤',
  '배심원실, 마지막 한 표가 자신에게 달린 순간',
  '도주 차량의 시동을 걸지 망설이는 골목 어귀',
  '기자회견장, 카메라가 켜지기 직전의 무대 뒤',
  '눈사태가 길을 끊은 산장, 식량이 한 사람 몫뿐인 밤',
  '잠긴 금고를 열어줄지 결정하는 인질극의 한가운데',
  '아이가 지켜보는 앞에서 누군가를 고발해야 하는 거실',
  '되돌릴 수 없는 명령을 내려야 하는 작전실',
]

// 딜레마를 더 압박하는 가중 조건(시간·관계·되돌릴 수 없음 등). 선택을 더 잔인하게 만든다.
const PRESSURES: string[] = [
  '결정할 시간은 단 60초뿐이다',
  '어느 쪽을 택해도 되돌릴 수 없다',
  '결과가 평생 인물을 따라다닌다',
  '단 한 사람만이 이 선택을 알게 된다',
  '잘못 택하면 무고한 제3자가 대신 대가를 치른다',
  '인물 자신은 이 선택으로 아무것도 얻지 못한다',
  '믿었던 정보가 절반은 거짓일지 모른다',
  '망설이는 사이 상황이 스스로 더 나빠진다',
  '선택의 증거가 훗날 인물을 옭아맨다',
  '두 길 모두, 사랑하는 누군가는 반드시 다친다',
  '이 결정이 다른 이들의 같은 선택을 부른다',
  '한쪽을 택한 순간, 다른 쪽 문은 영영 닫힌다',
]

// ---------- 슬롯 정의 ----------
type SlotKey = 'pair' | 'situation' | 'pressure'
const SLOT_DEFS: { key: SlotKey; label: string; icon: string }[] = [
  { key: 'pair', label: '가치 충돌', icon: '⚖️' },
  { key: 'situation', label: '구체 상황', icon: '🎬' },
  { key: 'pressure', label: '압박 조건', icon: '🔥' },
]

// 조합 수 = 가치쌍(좌우 방향 2배) × 상황 × 압박
const TOTAL_COMBOS = PAIRS.length * 2 * SITUATIONS.length * PRESSURES.length

interface Roll {
  pairIdx: number
  flip: boolean        // a/b 순서 뒤집기(같은 쌍이라도 어느 쪽을 먼저 두느냐로 결이 달라짐)
  situation: string
  pressure: string
}

const ri = (n: number) => Math.floor(Math.random() * n)
const rpick = <T,>(a: T[]): T => a[ri(a.length)]

function rollSlot(key: SlotKey): Partial<Roll> {
  switch (key) {
    case 'pair': return { pairIdx: ri(PAIRS.length), flip: Math.random() < 0.5 }
    case 'situation': return { situation: rpick(SITUATIONS) }
    case 'pressure': return { pressure: rpick(PRESSURES) }
  }
}

// 현재 Roll → 표시용 가치/대가(뒤집기 반영)
function resolved(r: Roll) {
  const p = PAIRS[r.pairIdx]
  return r.flip
    ? { valA: p.b, valB: p.a, costA: p.costB, costB: p.costA }
    : { valA: p.a, valB: p.b, costA: p.costA, costB: p.costB }
}

// 한 줄 딜레마 요약
function summarize(r: Roll): string {
  const v = resolved(r)
  return `${v.valA} vs ${v.valB} — ${r.situation}`
}

// HTML 이스케이프(프로젝트 본문 주입 안전화)
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 평문(복사·스니펫용)
function plainText(r: Roll): string {
  const v = resolved(r)
  return [
    `⚖️ 도덕적 딜레마: ${v.valA} vs ${v.valB}`,
    `🎬 상황: ${r.situation}`,
    `🔥 압박: ${r.pressure}`,
    ``,
    `· ${v.valA}을(를) 택하면 → ${v.costA}`,
    `· ${v.valB}을(를) 택하면 → ${v.costB}`,
  ].join('\n')
}

// 프로젝트 문서 본문(HTML)
function bodyHtml(r: Roll): string {
  const v = resolved(r)
  return [
    `<p style="font-size:15px;line-height:1.7;"><b>⚖️ ${esc(v.valA)} <span style="opacity:.6;">vs</span> ${esc(v.valB)}</b></p>`,
    `<p>🎬 <b>상황</b>: ${esc(r.situation)}</p>`,
    `<p>🔥 <b>압박 조건</b>: ${esc(r.pressure)}</p>`,
    `<hr/>`,
    `<p>👉 <b>${esc(v.valA)}</b>을(를) 택하면 — ${esc(v.costA)}</p>`,
    `<p>👉 <b>${esc(v.valB)}</b>을(를) 택하면 — ${esc(v.costB)}</p>`,
    `<hr/>`,
    `<p style="color:#888;">❓ 내 인물이라면 어느 쪽을 택할까? 그 선택이 인물의 무엇을 드러내는가?</p>`,
  ].join('')
}

interface Saved extends Roll { id: string; note: string }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((s) => s && typeof s.pairIdx === 'number' && PAIRS[s.pairIdx]
        && typeof s.situation === 'string' && typeof s.pressure === 'string')
      .map((s) => ({
        id: typeof s.id === 'string' ? s.id : Math.random().toString(36).slice(2),
        pairIdx: s.pairIdx,
        flip: !!s.flip,
        situation: String(s.situation),
        pressure: String(s.pressure),
        note: typeof s.note === 'string' ? s.note : '',
      }))
  } catch { return [] }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default function DilemmaGenerator({ payload }: { payload?: Record<string, unknown> }) {
  const [roll, setRoll] = useState<Roll | null>(null)
  const [locked, setLocked] = useState<Record<SlotKey, boolean>>({ pair: false, situation: false, pressure: false })
  const [spinning, setSpinning] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [toast, setToast] = useState('')
  const linked = hasProjectBridge()
  const spinTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 보관함 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 용량 초과 등 무시 */ }
  }, [saved])

  // 타이머 정리(언마운트)
  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  // 페이로드로 들어온 가치 키워드가 있으면 첫 생성에 반영 시도(선택)
  useEffect(() => {
    if (roll) return
    const kw = typeof payload?.value === 'string' ? payload.value as string : ''
    if (kw) {
      const idx = PAIRS.findIndex((p) => p.a.includes(kw) || p.b.includes(kw))
      if (idx >= 0) {
        setRoll({ pairIdx: idx, flip: PAIRS[idx].b.includes(kw) && !PAIRS[idx].a.includes(kw), situation: rpick(SITUATIONS), pressure: rpick(PRESSURES) })
        setLocked({ pair: true, situation: false, pressure: false })
        return
      }
    }
    setRoll({ pairIdx: ri(PAIRS.length), flip: Math.random() < 0.5, situation: rpick(SITUATIONS), pressure: rpick(PRESSURES) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1900)
  }

  // 생성/재생성 — 잠긴 슬롯은 유지하고 나머지만 새로 굴린다.
  const generate = () => {
    setSpinning(true)
    setRoll((prev) => {
      const base: Roll = prev ?? { pairIdx: ri(PAIRS.length), flip: false, situation: rpick(SITUATIONS), pressure: rpick(PRESSURES) }
      const next: Roll = { ...base }
      if (!locked.pair) {
        const p = rollSlot('pair')
        next.pairIdx = p.pairIdx!
        next.flip = p.flip!
      }
      if (!locked.situation) {
        let s = rpick(SITUATIONS)
        if (s === base.situation && SITUATIONS.length > 1) s = rpick(SITUATIONS)
        next.situation = s
      }
      if (!locked.pressure) {
        let pr = rpick(PRESSURES)
        if (pr === base.pressure && PRESSURES.length > 1) pr = rpick(PRESSURES)
        next.pressure = pr
      }
      return next
    })
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    spinTimer.current = window.setTimeout(() => setSpinning(false), 340)
  }

  const toggleLock = (k: SlotKey) => setLocked((p) => ({ ...p, [k]: !p[k] }))

  const allLocked = SLOT_DEFS.every((s) => locked[s.key])

  // 현재 딜레마를 보관함에 저장
  const saveCurrent = () => {
    if (!roll) return
    setSaved((prev) => {
      const dup = prev.some((s) => s.pairIdx === roll.pairIdx && s.flip === roll.flip && s.situation === roll.situation && s.pressure === roll.pressure)
      if (dup) { flash('이미 보관된 딜레마입니다.'); return prev }
      flash('보관함에 저장했습니다.')
      return [{ ...roll, id: newId(), note: '' }, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => setSaved((prev) => {
    const idx = prev.findIndex((s) => s.id === id)
    if (idx < 0) return prev
    const ni = idx + dir
    if (ni < 0 || ni >= prev.length) return prev
    const a = prev.slice()
    ;[a[idx], a[ni]] = [a[ni], a[idx]]
    return a
  })

  const copy = (r: Roll, extra = '') => {
    const text = plainText(r) + extra
    if (!navigator.clipboard) { flash('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했습니다.')).catch(() => flash('복사에 실패했습니다.'))
  }

  // 스니펫 라이브러리에 저장
  const toSnippet = (r: Roll) => {
    const v = resolved(r)
    addToLibrary('snippets', {
      text: plainText(r),
      source: '도덕적 딜레마 생성기',
      tags: ['딜레마', '갈등', v.valA, v.valB],
    })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료('갈등' 폴더)에 문서로 추가
  const toProject = (r: Roll) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const v = resolved(r)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '갈등',
      title: `⚖️ 딜레마 — ${v.valA} vs ${v.valB}`,
      bodyHtml: bodyHtml(r),
      synopsis: summarize(r),
      meta: { 가치충돌: `${v.valA} vs ${v.valB}`, 상황: r.situation, 압박: r.pressure },
    })
    flash(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const box: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }

  const v = roll ? resolved(roll) : null

  // 슬롯별 표시 텍스트
  const slotText = (key: SlotKey): string => {
    if (!roll || !v) return '—'
    if (key === 'pair') return `${v.valA} vs ${v.valB}`
    if (key === 'situation') return roll.situation
    return roll.pressure
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        인물이 처한 <b>두 가치의 충돌</b>에 구체적 상황과 <b>양쪽의 대가</b>를 엮어, 쉽게 답할 수 없는 딜레마를 만듭니다.
        마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 생성하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⚖️" /> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'gen' && (
        <>
          {/* 슬롯들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SLOT_DEFS.map((s) => {
              const isLocked = locked[s.key]
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, ...box, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: spinning && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}><Emoji e={s.icon} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {spinning && !isLocked ? '…' : slotText(s.key)}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 양쪽의 대가 */}
          {v && (
            <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="⚔️" /> 양쪽의 대가</div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                <b>{v.valA}</b>을(를) 택하면 → <span style={{ color: 'var(--muted)' }}>{v.costA}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                <b>{v.valB}</b>을(를) 택하면 → <span style={{ color: 'var(--muted)' }}>{v.costB}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                <Emoji e="❓" /> 내 인물이라면 어느 쪽을? 그 선택이 인물의 무엇을 드러내는가.
              </div>
            </div>
          )}

          {/* 조합 수 */}
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
            가능한 조합 {TOTAL_COMBOS.toLocaleString()}가지
          </div>

          {/* 액션 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate} disabled={allLocked}
              title={allLocked ? '모든 슬롯이 고정되어 있습니다 — 하나 이상 해제하세요' : '잠긴 슬롯은 유지하고 나머지를 다시 생성'}>
              <Emoji e="🎲" /> {roll ? '다시 생성' : '딜레마 생성'}
            </button>
            <button className="minibtn" onClick={() => roll && saveCurrent()} disabled={!roll}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={() => roll && copy(roll)} disabled={!roll}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={() => roll && toSnippet(roll)} disabled={!roll} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => roll && toProject(roll)} disabled={!roll || !linked}
              title={!linked ? '프로젝트에 연결되어 있지 않습니다' : '현재 딜레마를 프로젝트 자료 〈갈등〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 딜레마가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 갈등을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const sv = resolved(s)
            return (
              <div key={s.id} style={{ ...box, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="⚖️" /> {sv.valA} vs {sv.valB}</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(s, s.note ? `\n📝 ${s.note}` : '')} title="복사"><Emoji e="📋" /></button>
                  <button className="minibtn" onClick={() => toProject(s)} disabled={!linked} title={!linked ? '프로젝트 미연결' : '프로젝트 〈갈등〉 폴더에 추가'}><Emoji e="📄" /></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}><Emoji e="🎬" /> {s.situation}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}><Emoji e="🔥" /> {s.pressure}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>· <b>{sv.valA}</b> → <span style={{ color: 'var(--muted)' }}>{sv.costA}</span></div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>· <b>{sv.valB}</b> → <span style={{ color: 'var(--muted)' }}>{sv.costB}</span></div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 딜레마를 내 인물·이야기에 어떻게 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>좋은 딜레마는 양쪽 다 잃는 것이 분명합니다. 대가가 약하면 슬롯을 다시 굴려 더 잔인하게 만들어 보세요.</div>
    </div>
  )
}
