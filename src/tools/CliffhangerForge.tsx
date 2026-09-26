// 클리프행어 단조기 — 회차/장 끝에 쓸 마무리를 슬롯 조합으로 대량 생성한다.
//  유형 슬롯(반전·위기·폭로·등장·결정)을 골라 굴리면, 각 슬롯의 로컬 표에서 한 조각씩 뽑아
//  "다음 화가 궁금해지는" 마무리 문장/스니펫을 엮어 준다. 마음에 드는 슬롯은 🔒로 고정 후 나머지만 재생성.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 마무리(스니펫)를 자료('research')/'플롯' 폴더에 메모로 추가한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'cliffhanger-forge', name: '클리프행어 단조기', icon: '🪝', group: '영감·발상', intro: '회차·장 끝에 쓸 반전·위기·폭로·등장·결정 마무리를 슬롯 조합으로 대량 생성하세요', w: 560, h: 620 }

const LS = 'sry:tool:cliffhanger-forge'

// ---- 슬롯 정의(유형) ----
// 각 슬롯은 회차 끝 마무리의 한 축을 담당한다. faces = 그 유형의 후크 문구(로컬 표).
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'twist', label: '반전', icon: '🌀', desc: '믿어온 사실이 뒤집힌다',
    faces: [
      '믿었던 사람이 적이었다는 사실이 드러난다',
      '구하려던 대상이 이미 죽어 있었다',
      '아군의 승리가 사실 적의 계획대로였다',
      '주인공이 쫓던 범인은 자기 자신이었다',
      '죽은 줄 알았던 인물이 멀쩡히 곁에 서 있다',
      '예언이 가리킨 사람이 주인공이 아니었다',
      '평범하던 단역이 모든 일의 설계자였다',
      '지금까지의 서술이 거짓이었음이 밝혀진다',
      '구원자라 믿은 존재가 재앙의 근원이었다',
      '쌍둥이가 몰래 자리를 바꿔 살고 있었다',
      '주인공이 지킨 규칙이 거짓 위에 세워져 있었다',
      '되찾은 보물은 처음부터 가짜였다',
    ],
  },
  {
    key: 'crisis', label: '위기', icon: '⚠️', desc: '돌이킬 수 없는 위협이 닥친다',
    faces: [
      '발밑이 무너지며 추락이 시작된다',
      '탈출구가 등 뒤에서 봉쇄된다',
      '시한장치의 마지막 숫자가 깜빡인다',
      '독이 이미 핏줄을 타고 돌기 시작했다',
      '추격자의 손이 어깨를 붙잡는다',
      '안전하다 믿은 곳에 적이 먼저 와 있었다',
      '구조 신호는 끝내 닿지 않았다',
      '마지막 총알을 방금 써버렸다는 걸 깨닫는다',
      '믿었던 동료가 등 뒤에서 칼을 겨눈다',
      '폭발음과 함께 시야가 하얗게 지워진다',
      '물이 목까지 차오르고 문은 잠겨 있다',
      '경보가 울리고 모든 출구의 셔터가 내려온다',
    ],
  },
  {
    key: 'reveal', label: '폭로', icon: '🔍', desc: '숨겨온 진실이 터져 나온다',
    faces: [
      '봉투 속 사진 한 장이 모든 것을 뒤바꾼다',
      '오래 감춰온 출생의 비밀이 입 밖으로 나온다',
      '녹음된 목소리가 진짜 범인을 가리킨다',
      '편지의 마지막 줄에서 발신인의 이름을 본다',
      '거울 속에서 낯선 얼굴이 마주 본다',
      '잠긴 방의 문이 열리고 안의 것이 드러난다',
      '유언장의 진짜 수혜자 이름이 호명된다',
      '잊고 있던 기억 한 조각이 선명히 되살아난다',
      '상대가 천천히 가면을 벗는다',
      '지도 위 마지막 표식이 집을 가리키고 있었다',
      '한 사람만 모르던 비밀을 모두가 알고 있었다',
      '핏자국이 예상과 정반대 방향으로 이어진다',
    ],
  },
  {
    key: 'arrival', label: '등장', icon: '🚪', desc: '예상 밖의 존재가 나타난다',
    faces: [
      '닫혀 있던 문이 천천히 열린다',
      '낯선 그림자가 복도 끝에 서 있다',
      '죽었어야 할 이름이 호명되며 인물이 들어선다',
      '창밖에서 누군가 이쪽을 들여다보고 있다',
      '전화벨이 울리고, 받자 익숙한 목소리가 들린다',
      '뒤돌아본 자리에 아무도 없어야 할 사람이 있다',
      '군중 속에서 잊은 얼굴 하나가 시선을 맞춘다',
      '한 통의 초대장이 문틈으로 미끄러져 들어온다',
      '연기 속에서 한 사람의 실루엣이 걸어 나온다',
      '문을 두드리는 소리, 그리고 익숙한 노크 리듬',
      '사라졌던 인물이 아무 일 없었다는 듯 돌아온다',
      '마지막 장면에 정체불명의 인물이 등을 보인 채 서 있다',
    ],
  },
  {
    key: 'decision', label: '결정', icon: '⚖️', desc: '돌이킬 수 없는 선택의 기로에 선다',
    faces: [
      '둘 중 하나만 구할 수 있다는 걸 깨닫는다',
      '방아쇠에 손가락을 건 채 망설인다',
      '떠날지 남을지, 한 발만 떼면 끝이다',
      '진실을 말할지 침묵할지 입을 연다',
      '버튼 위에 손을 올린 채 눈을 감는다',
      '내민 손을 잡을지 뿌리칠지 결정해야 한다',
      '비밀을 폭로하면 모든 것을 잃는다',
      '복수와 용서 사이에서 검을 들어 올린다',
      '신뢰를 걸지 말지, 단 한 번의 기회뿐이다',
      '계약서에 서명할 펜을 든 손이 떨린다',
      '되돌아갈 마지막 다리가 불타기 시작한다',
      '"예"라고 답하는 순간 모든 게 바뀐다',
    ],
  },
]

// 마무리에 따라붙는 다음-화 후크 꼬리말(궁금증 증폭). 조합수에 포함.
const TAILS: string[] = [
  '— 그리고 화면은 암전된다.',
  '다음 화에서 모든 것이 무너진다.',
  '하지만 아직 아무도 그 의미를 알지 못했다.',
  '그 순간, 모든 계획이 뒤틀리기 시작했다.',
  '돌이킬 방법은, 이제 없었다.',
  '이것이 끝이 아니라 시작이라는 걸, 그때는 몰랐다.',
  '심장이 멎을 것 같은 정적이 흘렀다.',
  '— 계속.',
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수(× 꼬리말). 수만+ 표시용.
function comboCount(activeKeys: string[]): number {
  const base = activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
  return base * TAILS.length
}

// 굴린 결과들을 자연스러운 마무리 문장으로 엮는다(슬롯 순서 유지).
function compose(rolled: { slot: Slot; face: string }[], tail: string): string {
  if (!rolled.length) return ''
  // 첫 조각은 그대로, 이어지는 조각은 연결어로 잇는다.
  const linkers: Record<string, string> = {
    twist: '그런데 ',
    crisis: '바로 그때 ',
    reveal: '그 순간 ',
    arrival: '그리고 ',
    decision: '이제 ',
  }
  const parts = rolled.map((r, i) => {
    const body = r.face
    if (i === 0) return body.charAt(0).toUpperCase() + body.slice(1)
    return (linkers[r.slot.key] || '') + body
  })
  let text = parts.join('. ')
  if (!/[.!?…]$/.test(text)) text += '.'
  return text + ' ' + tail
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string }

export default function CliffhangerForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [tail, setTail] = useState<string>('')
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [tailLocked, setTailLocked] = useState(false)
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => setCopiedKey(''), 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
    setTail((prev) => {
      if (tailLocked && prev) return prev
      let t = pick(TAILS)
      if (t === prev && TAILS.length > 1) t = pick(TAILS)
      return t
    })
  }, [active, locked, tailLocked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0 && !!tail
  const ending = hasResults ? compose(rolledList, tail) : ''
  const combos = comboCount(active)

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === ending)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: ending,
        note: '',
        slots: active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·'),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
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

  const copy = (key: string, text: string) => {
    if (!navigator.clipboard) { setToast('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => setCopiedKey(key)).catch(() => setToast('복사에 실패했습니다.'))
  }

  // 프로젝트 연동 — 현재 마무리를 자료(research)/'플롯' 폴더에 스니펫 메모로 추가.
  const addEndingToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const slotLine = rolledList.map((r) => `${r.slot.icon} ${r.slot.label}`).join(' + ')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>${escHtml(ending)}</b></p>`,
      `<hr/>`,
      `<p><b>유형 조합:</b> ${escHtml(slotLine)}</p>`,
      ...rolledList.map((r) => `<p><b>${escHtml(r.slot.icon)} ${escHtml(r.slot.label)}:</b> ${escHtml(r.face)}</p>`),
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: `🪝 클리프행어 — ${ending.slice(0, 28)}${ending.length > 28 ? '…' : ''}`,
      bodyHtml,
      synopsis: ending,
      meta: { 유형: rolledList.map((r) => r.slot.label).join(', '), 형식: '회차 끝 마무리' },
    })
    setToast(id ? '프로젝트 자료 〈플롯〉 폴더에 마무리를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>${escHtml(s.text)}</b></p>`,
      s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : '',
      s.slots ? `<p><b>유형 조합:</b> ${escHtml(s.slots)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '플롯',
      title: `🪝 클리프행어 — ${s.text.slice(0, 28)}${s.text.length > 28 ? '…' : ''}`,
      bodyHtml, synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈플롯〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        회차·장 끝에 쓸 <b>마무리</b>를 유형 슬롯(반전·위기·폭로·등장·결정) 조합으로 만들어 다음 화가 궁금해지게 합니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 단조하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🪝"/> 단조
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯(유형) 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 {combos >= 10000 ? '(수만+ 이상)' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 단조해주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}

            {/* 꼬리말(후크) 슬롯 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0 }}><Emoji e="✨"/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>후크 꼬리말</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: tail ? 'var(--text)' : 'var(--muted)' }}>
                  {tail ? (rolling && !tailLocked ? '…' : tail) : '— 단조해주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => setTailLocked((v) => !v)} title={tailLocked ? '고정 해제' : '꼬리말 고정'}
                style={{ flexShrink: 0, borderColor: tailLocked ? 'var(--accent)' : 'var(--border)' }}>
                {tailLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          </div>

          {/* 완성 마무리(스니펫) */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🪝"/> 회차 끝 마무리</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {ending || '슬롯을 골라 단조하면, 다음 화가 궁금해지는 마무리가 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🪝"/> 단조 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('ending', ending)} disabled={!hasResults}>
              {copiedKey === 'ending' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addEndingToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 마무리를 단조해주세요' : '현재 마무리를 프로젝트 자료 〈플롯〉 폴더에 메모로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 마무리가 없습니다.<br />
              <span style={{ fontSize: 12 }}>단조 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 클리프행어를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>{s.text}</div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 마무리를 어느 회차·장면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 마무리를 프로젝트 자료 〈플롯〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>마무리는 출발점일 뿐입니다. 같은 후크라도 내 인물·상황에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
