// 전제·What-if 생성기 — 슬롯형 무작위 풀을 조합해 "만약 [주체]가 [비일상 사건]을 겪고
//   [제약] 속에서 [목표]해야 한다면?" 형태의 전제(프리미스)를 만든다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·라이브러리 불필요.
//   Math.random + localStorage(슬롯 잠금/현재 조합/저장 스니펫 보존)만 사용.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, useLibraryList, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'premise-generator', name: '전제·What-if 생성기', icon: '💡', group: '영감·발상', intro: '슬롯을 조합해 “만약 …라면?” 이야기 전제를 만드세요', w: 480, h: 620 }

const LS = 'sry:tool:premise-generator'

// ---------- 슬롯 풀 ----------
interface Slot { key: string; label: string; icon: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'subject', label: '주체', icon: '🧑',
    faces: [
      '평범한 회사원', '은퇴한 형사', '말 못 하는 소녀', '거짓말탐지기를 만드는 발명가', '국경의 밀수꾼',
      '죽은 자의 편지를 대신 쓰는 대필가', '한물간 마술사', '시한부 선고를 받은 의사', '기억을 파는 상인', '쌍둥이 중 동생',
      '폐교의 마지막 교사', '잠들지 못하는 시인', '도시의 마지막 시계 수리공', '비를 부르는 여자', '버려진 인형을 모으는 수집가',
      '왕이 되기 싫은 왕자', '거짓 신탁을 파는 점쟁이', '망명한 과학자', '비밀을 묻는 사서', '평생 한 번도 거짓말을 못 하는 사람',
      '죽음을 목격하는 능력을 가진 간호사', '타인의 꿈에 들어가는 상담사', '시간을 거꾸로 사는 노인',
    ],
  },
  {
    key: 'event', label: '비일상 사건', icon: '⚡',
    faces: [
      '하루가 무한히 반복되기 시작', '죽었다던 사람에게서 편지를 받게 됨', '온 세상의 시계가 동시에 멈춤', '자신과 똑같은 사람을 마주침', '갑자기 타인의 생각이 들리기 시작',
      '도시 전체에서 단 한 사람만 사라짐', '거울 속의 자신이 다른 행동을 하기 시작', '하룻밤 사이 모두가 자신을 잊어버림', '쓴 글이 그대로 현실이 됨', '꿈에서 본 일이 그대로 일어남',
      '24시간 뒤의 미래를 보게 됨', '죽은 자들이 평범하게 돌아옴', '모든 사람의 수명이 머리 위에 보이기 시작', '단 한 사람에게만 보이는 문을 발견', '거짓말을 하면 몸이 사라지기 시작',
      '잃어버린 줄 알았던 물건이 미래에서 도착', '세상이 흑백으로 변하기 시작', '자신의 죽음을 예고하는 부고를 받음', '잠들면 다른 사람의 인생으로 깨어남', '도시에 끝없는 폭설이 멈추지 않음',
      '말하는 능력을 잃는 대신 모든 소리를 보게 됨', '오래된 사진 속으로 빨려 들어감', '하나의 거짓이 도시 전체로 번지기 시작',
    ],
  },
  {
    key: 'constraint', label: '제약', icon: '⛓️',
    faces: [
      '아무도 그 말을 믿어주지 않는', '사실을 발설하면 모든 기억을 잃는', '단 72시간밖에 남지 않은', '한 사람에게만 진실을 말할 수 있는', '거짓말을 단 한 번도 할 수 없는',
      '같은 실수를 반복할수록 대가가 커지는', '도움을 청할 사람이 아무도 없는', '진실을 알수록 점점 잊혀지는', '되돌릴 기회가 단 한 번뿐인', '자신의 정체를 끝까지 숨겨야 하는',
      '모든 선택이 누군가의 희생을 부르는', '말을 할 수 없는', '하루에 한 가지 질문만 허락되는', '가장 사랑하는 사람을 의심해야 하는', '시간이 거꾸로만 흐르는',
      '같은 장소를 벗어날 수 없는', '기억이 매일 초기화되는', '단 한 사람만 진실을 함께 아는', '도시 밖으로 나갈 수 없는', '도움을 줄수록 자신이 위험해지는',
      '진실을 증명할 증거가 모두 사라진', '믿었던 모두가 적이 된',
    ],
  },
  {
    key: 'goal', label: '목표', icon: '🎯',
    faces: [
      '사라진 사람을 되찾아야', '반복되는 하루에서 빠져나와야', '진짜 범인을 밝혀내야', '잃어버린 기억을 되찾아야', '예고된 죽음을 막아야',
      '오래된 약속을 지켜야', '자신의 결백을 증명해야', '도시를 원래대로 되돌려야', '사랑하는 사람을 구해야', '진실을 세상에 알려야',
      '복수를 끝내야', '용서를 구해야', '한 번도 못한 말을 전해야', '운명을 거슬러야', '자신이 누구인지 끝내 밝혀야',
      '무너지는 세계에서 단 한 사람을 지켜야', '거짓을 멈춰야', '본래의 시간으로 돌아가야', '대가를 치르지 않고 모두를 구해야', '진짜 자신을 되찾아야',
      '두고 온 과거와 화해해야', '되풀이되는 비극의 고리를 끊어야',
    ],
  },
]

// ---------- 유틸 ----------
const pickIdx = (len: number) => Math.floor(Math.random() * len)
function pickFaceIdx(slot: Slot, exclude: number): number {
  if (slot.faces.length <= 1) return 0
  let i = exclude
  while (i === exclude) i = pickIdx(slot.faces.length)
  return i
}

const fmtNum = (n: number) => n.toLocaleString('ko-KR')

// 슬롯 인덱스 맵 → 자연스러운 한 줄 전제 문장.
function compose(sel: Record<string, number>): string {
  const f = (k: string) => {
    const s = SLOTS.find((x) => x.key === k)
    if (!s) return ''
    const i = sel[k]
    return typeof i === 'number' && s.faces[i] != null ? s.faces[i] : ''
  }
  const subj = f('subject'), ev = f('event'), con = f('constraint'), goal = f('goal')
  if (!subj && !ev && !con && !goal) return '슬롯을 굴려 전제를 만들어 보세요.'
  const parts: string[] = ['만약']
  if (subj) parts.push(`${subj}가`)
  if (ev) parts.push(`${ev} 사건을 겪고,`)
  if (con) parts.push(`${con} 상황 속에서`)
  if (goal) parts.push(`${goal} 한다면?`)
  else parts.push('어떻게 될까?')
  return parts.join(' ').replace(/,\s*$/, '?')
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function PremiseGenerator({ payload }: { payload?: Record<string, unknown> }) {
  // 현재 선택(슬롯별 face 인덱스) — 최초엔 전부 무작위.
  const [sel, setSel] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':sel')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, number>
        const next: Record<string, number> = {}
        SLOTS.forEach((s) => {
          const v = p[s.key]
          next[s.key] = typeof v === 'number' && v >= 0 && v < s.faces.length ? v : pickIdx(s.faces.length)
        })
        return next
      }
    } catch { /* ignore */ }
    const init: Record<string, number> = {}
    SLOTS.forEach((s) => { init[s.key] = pickIdx(s.faces.length) })
    return init
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':locked')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, boolean>
        const next: Record<string, boolean> = {}
        SLOTS.forEach((s) => { if (p[s.key]) next[s.key] = true })
        return next
      }
    } catch { /* ignore */ }
    return {}
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const rollTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  const saved = useLibraryList('snippets')
  // 이 도구가 저장한 전제 스니펫만 추려서 보여준다(태그로 식별).
  const myPremises = saved.filter((s) => Array.isArray(s.tags) && s.tags.includes('전제'))

  // payload 로 들어온 전제 텍스트가 있으면(외부 연계) 토스트로 안내(읽기용).
  useEffect(() => {
    const p = payload?.premise
    if (typeof p === 'string' && p.trim()) flash('전달된 전제를 참고하세요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속화.
  useEffect(() => {
    try { localStorage.setItem(LS + ':sel', JSON.stringify(sel)) } catch { /* ignore */ }
  }, [sel])
  useEffect(() => {
    try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* ignore */ }
  }, [locked])

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

  // 잠기지 않은 슬롯만 다시 굴린다.
  const roll = () => {
    setCopied(false)
    setRolling(true)
    setSel((prev) => {
      const next = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key]) return
        next[s.key] = pickFaceIdx(s, prev[s.key])
      })
      return next
    })
  }

  const rollOne = (key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setSel((prev) => ({ ...prev, [key]: pickFaceIdx(s, prev[key]) }))
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  // ---------- 조합 수 ----------
  // 전체 조합 수(모든 슬롯의 면 곱) — 수만 단위 확인용.
  const totalCombos = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)
  // 잠긴 슬롯을 제외했을 때 "다음 굴림에서 가능한" 조합 수.
  const openCombos = SLOTS.reduce((acc, s) => acc * (locked[s.key] ? 1 : s.faces.length), 1)

  const premise = compose(sel)
  const hasPremise = SLOTS.some((s) => typeof sel[s.key] === 'number')

  const copy = () => {
    if (!hasPremise) return
    navigator.clipboard?.writeText(premise).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  // 라이브러리(스니펫)에 전제 저장 — 다른 도구와 공유.
  const saveSnippet = () => {
    if (!hasPremise) return
    if (myPremises.some((s) => s.text === premise)) { flash('이미 저장된 전제입니다.'); return }
    addToLibrary('snippets', { text: premise, source: '전제·What-if 생성기', tags: ['전제'] })
    flash('전제를 라이브러리에 저장했습니다.')
  }

  const removeSnippet = (id: string) => {
    // useLibraryList 는 읽기 전용 — 제거는 라이브러리 헬퍼가 없으므로 미노출.
    // (안전을 위해 제거 기능은 라이브러리 도구에 위임)
    void id
  }
  void removeSnippet

  // 프로젝트 자료 〈영감 메모〉 폴더에 전제 추가.
  const toProject = () => {
    if (!hasPremise) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => {
        const i = sel[s.key]
        const face = typeof i === 'number' ? s.faces[i] : ''
        return face ? `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(face)}</p>` : ''
      })
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>💡 ${esc(premise)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const titleRaw = premise.replace(/[“”"?]/g, '').trim()
    const title = '💡 ' + (titleRaw.length > 28 ? titleRaw.slice(0, 28) + '…' : titleRaw)
    const id = addToProject({ kind: 'text', root: 'research', folder: '영감 메모', title, bodyHtml, synopsis: premise })
    flash(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        슬롯을 굴려 <b>“만약 …라면?”</b> 전제를 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴려보세요.
      </div>

      {/* 조합 수 표시 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', color: 'var(--muted)' }}>
          전체 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(totalCombos)}</b>가지
        </span>
        <span style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', color: 'var(--muted)' }}>
          현재 가능 <b style={{ color: 'var(--accent)' }}>{fmtNum(openCombos)}</b>가지
        </span>
      </div>

      {/* 슬롯들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.map((s) => {
          const i = sel[s.key]
          const face = typeof i === 'number' ? s.faces[i] : ''
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={row}>
              <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} · {s.faces.length}면</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, wordBreak: 'keep-all', color: face ? 'var(--text)' : 'var(--muted)' }}>
                  {rolling && !isLocked ? '…' : (face || '— 굴려주세요 —')}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 조합된 전제 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px' }}>
        <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💡"/> 전제</div>
        <div style={{ fontSize: 16, lineHeight: 1.6, wordBreak: 'keep-all', color: hasPremise ? 'var(--text)' : 'var(--muted)' }}>{premise}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲"/> 전제 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!hasPremise}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!hasPremise}><Emoji e="⭐"/> 전제 저장</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasPremise || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 전제를 프로젝트 자료 〈영감 메모〉에 추가'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저장한 전제 목록(라이브러리 공유) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⭐"/> 저장한 전제 ({myPremises.length})</div>
        {myPremises.length === 0 ? (
          <div style={hint}>마음에 드는 전제는 ‘전제 저장’으로 모아두면 다른 도구에서도 함께 쓸 수 있어요.</div>
        ) : (
          myPremises.slice(0, 30).map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, wordBreak: 'keep-all', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flex: 1, minWidth: 0 }}>{s.text}</span>
              <button
                className="minibtn"
                style={{ flexShrink: 0 }}
                title="이 전제 복사"
                onClick={() => { navigator.clipboard?.writeText(s.text).catch(() => { /* graceful */ }); flash('복사했습니다.') }}
              ><Emoji e="📋"/></button>
            </div>
          ))
        )}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 'auto', lineHeight: 1.5 }}>
        전제 풀·문장은 본 도구의 자체 창작물(오픈소스, 외부 저작물 미사용). 외부 네트워크 없이 동작합니다.
      </div>
    </div>
  )
}
