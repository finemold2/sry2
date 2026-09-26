// 소품·유물 생성기 — 종류×재질×기원×특이성×상태 5개 슬롯의 로컬 표를 조합해
// 이야기 속 사물/유물/마법 아이템을 무작위로 빚어낸다(수만 가지 조합).
// 자급식: 외부 네트워크·라이브러리 없음. react 와 './linkbus' 외 import 없음.
// Math.random + localStorage(잠금/현재 결과 저장)만 사용. 스니펫·프로젝트(자료) 저장 지원.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'prop-generator', name: '소품·유물 생성기', icon: '🏺', group: '영감·발상', intro: '종류·재질·기원·특이성·상태를 조합해 이야기 속 사물·유물·마법 아이템을 빚으세요', w: 480, h: 640 }

// 슬롯 정의 — 각 슬롯은 라벨·아이콘·후보 표(faces)를 가진다.
interface Slot { key: string; label: string; icon: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'kind', label: '종류', icon: '🗝️',
    faces: [
      '반지', '목걸이', '회중시계', '나침반', '열쇠', '거울', '단검', '지팡이', '책', '편지',
      '오르골', '램프', '가면', '인장 반지', '부적', '주사위', '브로치', '회중경', '향로', '나팔',
      '두루마리', '모래시계', '왕관', '장갑', '망토', '깃펜', '잉크병', '주머니칼', '회중나침반', '호루라기',
      '회중일기', '약병', '촛대', '종', '체스 말', '카드 한 벌', '인형', '뮤직박스', '돋보기', '담뱃대',
      '회중묵주', '팔찌', '귀걸이', '머리핀', '벨트 버클', '회중지도', '깃발', '북', '피리', '하프',
    ],
  },
  {
    key: 'material', label: '재질', icon: '🪨',
    faces: [
      '검게 변색된 은', '흠집 난 황동', '따뜻한 마호가니', '차가운 흑요석', '바랜 상아', '녹슨 무쇠', '투명한 수정',
      '핏빛 산호', '이슬 머금은 비취', '바스러지는 양피지', '두드린 금박', '얼룩진 백랍', '결이 굵은 떡갈나무', '윤기 흐르는 자개',
      '거친 화강암', '서늘한 대리석', '낡은 가죽', '검붉은 자단목', '서리 낀 청동', '잿빛 유골', '바닷물에 절은 떡갈나무',
      '운석에서 벼린 강철', '용의 비늘로 덧댄 가죽', '달빛에 굳은 유리', '천 년 묵은 호박(琥珀)', '깨진 도자기를 이어붙인 금', '소금에 절은 뼈', '불에 그을린 흑단',
    ],
  },
  {
    key: 'origin', label: '기원', icon: '📜',
    faces: [
      '몰락한 왕가의 보물고에서', '난파선의 잔해에서', '폐허가 된 수도원에서', '사막 한가운데 무덤에서', '떠돌이 상인의 손에서',
      '전장의 시신 곁에서', '고서점 책장 뒤에서', '할머니의 다락방에서', '경매장의 마지막 출품으로', '도굴된 고분에서',
      '마녀의 오두막에서', '용의 둥지에서', '잊힌 신전의 제단에서', '얼어붙은 빙하 속에서', '강바닥 진흙 속에서',
      '저주받은 가문의 유산으로', '연금술사의 작업실에서', '바닷가에 떠밀려 온 채로', '전당포의 미회수 담보로', '죽은 자의 유언과 함께',
      '이름 모를 장인의 마지막 작품으로', '국경을 넘던 밀수품 속에서', '폐광 깊은 갱도에서', '불탄 극장의 잿더미에서',
    ],
  },
  {
    key: 'quirk', label: '특이성', icon: '✨',
    faces: [
      '쥐면 옛 주인의 기억이 스친다', '거짓말을 들으면 차갑게 식는다', '달이 차오를 때만 빛난다', '피를 머금으면 잠시 깨어난다', '주인을 절대 잃어버리지 않는다',
      '한 번 약속을 강제로 지키게 한다', '말을 걸면 한 마디씩 답한다', '닿은 상처를 천천히 아물게 한다', '소유자의 수명을 조금씩 앗아간다', '진실한 자에게만 무게가 느껴진다',
      '밤마다 위치가 바뀐다', '두려움을 먹고 점점 따뜻해진다', '잃어버린 것의 방향을 가리킨다', '닿은 자의 가장 큰 후회를 보여준다', '한 사람의 목소리를 영원히 가둔다',
      '시간을 아주 잠깐 되감는다', '거울에 비추면 다른 모습이 나온다', '불 속에서도 타지 않는다', '주인이 죽으면 스스로 부서진다', '꿈속으로 메시지를 전한다',
      '결코 같은 길을 두 번 안내하지 않는다', '한 가지 비밀을 들으면 봉인된다', '닿은 물을 포도주로 바꾼다', '그림자가 없다', '들고 있으면 거짓말을 할 수 없다',
    ],
  },
  {
    key: 'condition', label: '상태', icon: '🩹',
    faces: [
      '한 귀퉁이가 깨져 있다', '낡았지만 흠 하나 없다', '누군가 이름을 긁어 지웠다', '봉인이 반쯤 풀려 있다', '핏자국이 마르지 않는다',
      '온기가 가시지 않는다', '시간이 멈춘 듯 새것이다', '절반만 남아 짝을 찾는다', '미세하게 떨리고 있다', '먼지 한 톨 묻지 않았다',
      '균열을 따라 빛이 샌다', '낯선 문자가 새겨져 있다', '손때로 반질반질하다', '되돌릴 수 없이 잠겨 있다', '한 번 쓰면 사라질 듯 위태롭다',
      '겉은 멀쩡하나 속이 비었다', '미약한 진동을 멈추지 않는다', '오래된 향이 배어 있다', '누군가의 머리카락이 엉켜 있다', '결코 더럽혀지지 않는다',
    ],
  },
]

const LS = 'sry:tool:prop-generator:'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 총 조합수(슬롯별 후보 개수의 곱).
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.faces.length, 1)
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

type Result = Record<string, string>

// 슬롯 결과들을 자연스러운 한 문단 묘사로 엮는다.
function compose(r: Result): string {
  const kind = r.kind, mat = r.material, orig = r.origin, quirk = r.quirk, cond = r.condition
  if (!kind) return ''
  const parts: string[] = []
  // 예: "검게 변색된 은으로 만든 반지. 몰락한 왕가의 보물고에서 나왔고, 한 귀퉁이가 깨져 있다."
  let head = ''
  if (mat) head += `${mat}으로 만든 `
  head += `${kind}`
  parts.push(head + '.')
  const tail: string[] = []
  if (orig) tail.push(`${orig} 나왔으며`)
  if (cond) tail.push(`${cond}`)
  if (tail.length) parts.push(tail.join(', ') + '.')
  if (quirk) parts.push(`이 물건은 ${quirk}.`)
  return parts.join(' ')
}

// 짧은 제목(종류·재질 중심).
function titleOf(r: Result): string {
  if (!r.kind) return '소품'
  return r.material ? `${r.material} ${r.kind}` : r.kind
}

export default function PropGenerator({ payload }: { payload?: Record<string, unknown> }) {
  // 현재 결과(슬롯별 면) — 저장된 값 복원, 없으면 비움(첫 진입 시 자동 생성).
  const [result, setResult] = useState<Result>(() => {
    try {
      const raw = localStorage.getItem(LS + 'result')
      if (raw) {
        const p = JSON.parse(raw) as Result
        if (p && typeof p === 'object') {
          const next: Result = {}
          SLOTS.forEach((s) => { if (typeof p[s.key] === 'string' && s.faces.includes(p[s.key])) next[s.key] = p[s.key] })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'locked')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, boolean>
        if (p && typeof p === 'object') {
          const next: Record<string, boolean> = {}
          SLOTS.forEach((s) => { if (p[s.key]) next[s.key] = true })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [count, setCount] = useState(0) // 지금까지 굴린 횟수(이 세션)

  const mounted = useRef(true)
  const rollTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 결과/잠금 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'result', JSON.stringify(result)) } catch { /* ignore */ }
  }, [result])
  useEffect(() => {
    try { localStorage.setItem(LS + 'locked', JSON.stringify(locked)) } catch { /* ignore */ }
  }, [locked])

  // 한 번 굴리기 — 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const roll = useCallback(() => {
    setCopied(false); setSaved(false)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        // 같은 값 연속 방지(후보가 2개 이상일 때)
        let f = pick(s.faces)
        if (f === prev[s.key] && s.faces.length > 1) f = pick(s.faces)
        next[s.key] = f
      })
      return next
    })
    setCount((c) => c + 1)
    setRolling(true)
  }, [locked])

  // 첫 진입: 저장된 결과가 없으면 자동 생성(payload.seed 가 있으면 무시하고 그대로 한 번 굴림)
  useEffect(() => {
    const hasAny = SLOTS.some((s) => result[s.key])
    if (!hasAny) roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    if (rollTimer.current) window.clearTimeout(rollTimer.current)
    rollTimer.current = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => { if (rollTimer.current) window.clearTimeout(rollTimer.current) }
  }, [rolling, result])

  // 언마운트 시 모든 타이머 정리
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      ;[rollTimer, copyTimer, saveTimer, toastTimer].forEach((t) => { if (t.current) window.clearTimeout(t.current) })
    }
  }, [])

  const toggleLock = (key: string) => {
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 슬롯 하나만 다시 굴리기(재생성)
  const rerollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setCopied(false); setSaved(false)
    setResult((prev) => {
      let f = pick(slot.faces)
      if (f === prev[key] && slot.faces.length > 1) f = pick(slot.faces)
      return { ...prev, [key]: f }
    })
    setRolling(true)
  }

  const hasResult = SLOTS.some((s) => result[s.key])
  const description = compose(result)
  const title = titleOf(result)
  const lockedCount = SLOTS.filter((s) => locked[s.key]).length

  const plainText = () => {
    const lines = SLOTS.filter((s) => result[s.key]).map((s) => `${s.icon} ${s.label}: ${result[s.key]}`)
    return `${title}\n\n${lines.join('\n')}\n\n📖 ${description}`
  }

  const copy = () => {
    if (!hasResult) return
    navigator.clipboard?.writeText(plainText()).then(() => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 3000)
  }

  // 스니펫 라이브러리에 저장(여러 도구가 함께 읽는 공유 영감 메모)
  const saveSnippet = () => {
    if (!hasResult) return
    addToLibrary('snippets', {
      text: plainText(),
      source: '소품·유물 생성기',
      tags: ['소품', '유물', result.kind].filter(Boolean) as string[],
    })
    setSaved(true)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 1500)
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // HTML 특수문자 escape(&,<,> 필수)
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 소품을 프로젝트 자료 〈소품·소재〉 폴더에 메모로 추가
  const toProject = () => {
    if (!hasResult) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const rows = SLOTS.filter((s) => result[s.key])
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}</b> · ${esc(result[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>📖 ${esc(description)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const metaRows: Record<string, string> = {}
    SLOTS.forEach((s) => { if (result[s.key]) metaRows[s.label] = result[s.key] })
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소품·소재',
      title: `🏺 ${title}`,
      bodyHtml,
      meta: metaRows,
    })
    flash(id ? `‘${title}’을(를) 프로젝트 ‘자료 › 소품·소재’에 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        다섯 슬롯(<b>종류·재질·기원·특이성·상태</b>)을 조합해 이야기 속 사물·유물·마법 아이템을 빚습니다.
        총 <b>{fmtNum(TOTAL_COMBOS)}</b>가지 조합. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 슬롯 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {!hasResult ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, lineHeight: 1.6 }}>
            아래 <b><Emoji e="🎲"/> 빚어내기</b> 버튼으로 첫 소품을 만들어 보세요.
          </div>
        ) : (
          SLOTS.map((s) => {
            const face = result[s.key]
            const isLocked = !!locked[s.key]
            return (
              <div
                key={s.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 11px',
                }}
              >
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}>
                  <Emoji e={s.icon}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: face ? 'var(--text)' : 'var(--muted)' }}>
                    {face ? (rolling && !isLocked ? '…' : face) : '—'}
                  </div>
                </div>
                <button
                  className="minibtn"
                  onClick={() => rerollOne(s.key)}
                  title="이 슬롯만 다시"
                  style={{ flexShrink: 0 }}
                  disabled={isLocked}
                >
                  <Emoji e="🎲"/>
                </button>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(s.key)}
                  title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                  aria-pressed={isLocked}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >
                  {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                </button>
              </div>
            )
          })
        )}

        {/* 묘사 카드 */}
        {hasResult && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', marginTop: 2 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>{description}</div>
          </div>
        )}
      </div>

      {/* 상태 표시 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>가능 조합 {fmtNum(TOTAL_COMBOS)}가지</span>
        <span>{lockedCount > 0 ? <><Emoji e="🔒"/>{` ${lockedCount}개 고정 · `}</> : ''}이번 세션 {count}회 굴림</span>
      </div>

      {/* 주 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲"/> 빚어내기</button>
        <button className="minibtn" onClick={copy} disabled={!hasResult}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!hasResult} title="스니펫 라이브러리에 저장">{saved ? '✓ 저장됨' : <><Emoji e="💾"/> 스니펫</>}</button>
      </div>

      {/* 프로젝트 연동 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasResult || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 소품을 프로젝트 자료(소품·소재)에 메모로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center', lineHeight: 1.5 }}>{toast}</div>
      )}

      <div style={hint}>조합은 출발점일 뿐입니다. 특이성과 상태를 비틀어 당신의 세계에 어울리는 사물로 다듬어 보세요.</div>
    </div>
  )
}
