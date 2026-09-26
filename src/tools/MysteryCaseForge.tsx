// 사건 생성기(미스터리·추리) — 피해자×장소×수법×동기×결정적 단서×반전×범인유형 7개 슬롯을
//   로컬 슬롯 풀에서 무작위로 굴려 추리 사건의 뼈대를 만든다. 슬롯별 잠금/재생성, 총 조합수 표시.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(보관 사건)만 사용.
// 연계(linkbus): 생성한 사건을 자료(research)/'사건' 폴더 문서로 추가(addToProject) + 글감 스니펫으로 저장(addToLibrary).
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-case-forge',
  name: '사건 생성기',
  icon: '🕵️',
  group: '생성기',
  genre: '미스터리·추리',
  intro: '피해자·장소·수법·동기·단서·반전·범인을 굴려 추리 사건의 뼈대를 만드세요',
  w: 560,
  h: 640,
}

const LS = 'sry:tool:mystery-case-forge'

// ── 7개 슬롯 정의(슬롯 풀 무작위) ──
interface Slot {
  key: string
  label: string
  icon: string
  pool: string[]
}

const SLOTS: Slot[] = [
  {
    key: 'occasion', label: '발생 정황', icon: '🕰️',
    pool: [
      '폭설로 길이 끊긴 밤', '정전이 마을을 덮친 새벽', '추모식이 한창이던 저녁', '태풍 경보가 내린 한낮',
      '송년 만찬이 무르익던 밤', '안개가 짙게 깔린 이른 아침', '단수로 도시가 멈춘 주말', '개기월식이 든 한밤중',
      '결혼식 전야의 소란 속', '장례를 막 끝낸 자정', '오랜만의 가족 모임 도중', '낙뢰로 통신이 끊긴 시각',
      '카운트다운 직전의 새해 전야', '폭우로 다리가 잠긴 밤', '동창회가 열리던 늦은 밤', '유언장 공개를 앞둔 아침',
      '첫눈이 내리던 늦은 오후', '보름달이 환하던 한여름 밤', '상속 회의가 파한 직후', '한파 경보가 내린 깊은 밤',
      '축제의 마지막 불꽃이 터지던 순간', '오래된 시계가 자정을 알리던 때', '폐장 시간이 지난 늦은 밤', '집들이가 끝나갈 무렵',
    ],
  },
  {
    key: 'victim', label: '피해자', icon: '🩸',
    pool: [
      '은퇴한 추리소설가', '재산을 숨긴 노부인', '종적을 감췄던 상속인', '평판 좋던 종합병원장',
      '협박장을 받아온 배우', '비밀 장부를 쥔 회계사', '마을의 유일한 의사', '폐쇄 직전의 박물관장',
      '이혼을 앞둔 재벌 2세', '내부고발을 준비하던 기자', '사라진 가정교사', '저택의 늙은 집사',
      '한밤에 돌아온 실종자', '도박 빚에 쫓기던 화가', '교단의 카리스마 목회자', '연구를 가로챈 교수',
      '이중장부를 든 선장', '유언을 고치려던 가장', '약혼식을 앞둔 신부', '복역을 마친 옛 공범',
      '가짜 신분으로 살던 망명자', '비밀 연인을 둔 시장', '입을 다물던 목격자', '빚을 받으러 온 사채업자',
      '유산을 노린 먼 친척', '얼굴 없는 익명 후원자', '폐교의 마지막 교사', '한 마을을 떠받친 양조장 주인',
    ],
  },
  {
    key: 'place', label: '장소', icon: '🏚️',
    pool: [
      '눈에 갇힌 산장', '폭풍우 속 외딴섬 별장', '운행이 끊긴 야간열차', '안개 낀 등대',
      '문 잠긴 서재', '지하 와인 저장고', '폐장한 놀이공원', '강 위에 뜬 호화 유람선',
      '온천 료칸의 별채', '오래된 시계탑 꼭대기', '정전된 고층 빌딩', '봉쇄된 수도원',
      '눈보라 속 국경 검문소', '무대 뒤 분장실', '폐선된 지하철 승강장', '한밤의 종합병원 병동',
      '밀폐된 연구소', '바닷가 절벽 위 저택', '교외의 빈 별장', '단수된 외딴 모텔',
      '눈 덮인 천문대', '관객 떠난 오페라하우스', '봉인된 가족 납골당', '통신 두절된 등반 베이스캠프',
      '전세 낸 미술관 전관', '낡은 골동품 경매장', '폐광 입구의 관리사무소', '섬으로 들어가는 마지막 여객선',
    ],
  },
  {
    key: 'method', label: '수법', icon: '🔪',
    pool: [
      '흔적 없는 독살', '얼음으로 위장한 흉기', '밀실에서의 교살', '계단에서의 추락으로 위장',
      '약물 바꿔치기', '감전사로 꾸민 사고', '익사로 위장한 살해', '가스 누출로 가린 질식',
      '시간차 장치를 쓴 원격 살인', '거울과 조명을 이용한 착시 알리바이', '식중독으로 둔갑한 중독',
      '한 알의 약 캡슐 조작', '낚싯줄을 쓴 비접촉 트릭', '의료기기 설정 변경', '눈 위 발자국 지우기',
      '시신 위치 바꿔치기', '쌍둥이를 이용한 신원 혼동', '날조된 자살 노트', '얼어붙은 호수 아래 은닉',
      '음향으로 만든 가짜 사망 시각', '향이나 연기로 가린 냄새', '전기 시계를 조작한 알리바이',
      '복용량을 누적시킨 만성 중독', '엘리베이터 정지를 이용한 격리', '대역으로 만든 목격담',
      '문틈으로 흘려보낸 일산화탄소', '되돌려진 시곗바늘', '눈사태를 가장한 매몰',
    ],
  },
  {
    key: 'motive', label: '동기', icon: '🎭',
    pool: [
      '거액의 유산 상속', '오래 묻어둔 복수', '들키면 끝나는 불륜', '바꿔치기한 신원 보호',
      '가로챈 연구 성과', '협박에서 벗어나려는 발버둥', '치정에 얽힌 질투', '조직의 비밀 은폐',
      '내부고발을 막으려는 입막음', '과거 사고의 진범 은폐', '사라진 거액의 횡령', '명예를 지키려는 광기',
      '버려진 자식의 원한', '뒤바뀐 출생의 비밀', '동업자의 배신에 대한 응징', '의료사고의 책임 회피',
      '도박 빚 청산', '첫사랑을 둘러싼 집착', '신앙을 빙자한 광신', '대를 잇기 위한 계략',
      '잘못 알고 한 오인 살해', '동정심에서 비롯된 안락사', '권력 승계 다툼', '보험금을 노린 계획',
      '비밀 연인을 지키려는 희생', '치욕적 과거를 아는 자 제거', '예언을 막으려다 부른 비극', '집단의 침묵을 깨려는 자 입막음',
    ],
  },
  {
    key: 'clue', label: '결정적 단서', icon: '🔍',
    pool: [
      '멈춰버린 손목시계', '잘못 채워진 단추', '재가 남은 벽난로', '두 잔뿐인 찻잔',
      '거꾸로 걸린 액자', '젖지 않은 우산', '한쪽만 닦인 안경', '바뀐 약병 라벨',
      '지워지지 않은 발신 기록', '식탁 위 식지 않은 차', '뒤집힌 카펫 자국', '맞지 않는 알리바이의 시각',
      '향수 냄새가 밴 편지', '일치하지 않는 필적', '닳은 한쪽 구두 굽', '꺼져 있던 시계탑 불빛',
      '되감긴 카세트테이프', '깨진 거울 조각의 방향', '문 안쪽에 꽂힌 열쇠', '눈 위에 없는 발자국',
      '읽다 만 책의 갈피', '교체된 전구 하나', '맞물리지 않는 톱니바퀴 소리', '주소 없는 소포',
      '말라붙은 잉크 자국', '한 장 모자란 사진첩', '잘못 놓인 체스 말', '꺼지지 않은 난로 위 주전자',
    ],
  },
  {
    key: 'twist', label: '반전', icon: '🌀',
    pool: [
      '피해자가 사실 가해자였다', '죽은 줄 안 인물이 살아 있었다', '탐정이 사건의 공범이었다',
      '목격자가 곧 진범이었다', '쌍둥이가 신원을 바꿔 살았다', '자살로 위장한 타살이었다',
      '타살로 보인 것이 자살이었다', '범인은 이미 죽은 사람으로 처리돼 있었다', '유언장이 통째로 위조였다',
      '두 사건이 사실 한 사건이었다', '의뢰인이 모든 일을 꾸민 자였다', '알리바이의 시각 자체가 조작이었다',
      '피해자가 자기 죽음을 설계했다', '진범은 가장 먼저 용의선상에서 지운 사람이었다', '시신은 다른 사람의 것이었다',
      '범인은 한 명이 아니라 공모한 다수였다', '경찰 내부에 협력자가 있었다', '증거가 모두 가해자가 심은 것이었다',
      '복수의 표적이 사실 은인이었다', '마지막 희생자가 첫 사건의 진범이었다', '사건은 더 큰 사건을 가린 미끼였다',
      '구원자라 믿은 자가 흑막이었다', '회상이라 믿은 장면이 미래였다', '범인은 매일 마주치던 인물이었다',
      '용의자 전원이 사실을 알면서 침묵했다', '오인 살해였으나 진짜 표적은 따로 있었다',
    ],
  },
  {
    key: 'culprit', label: '범인 유형', icon: '🦹',
    pool: [
      '가장 신뢰받던 조력자', '완벽한 알리바이의 소유자', '겉보기엔 무력한 약자', '사건을 함께 푸는 동행자',
      '피해자의 가장 가까운 가족', '지위 높은 권력자', '잊혀진 과거의 인물', '제삼자로 위장한 청부업자',
      '복수에 사로잡힌 유족', '냉정한 완전범죄 설계자', '충동에 휩쓸린 우발범', '죄책감에 시달리는 양심범',
      '여러 가면을 쓴 변장의 달인', '집단으로 공모한 공동체', '법망 밖에 선 의적형 범인', '광신에 빠진 추종자',
      '돈에 매수된 내부자', '오랜 친구이자 라이벌', '신원을 위조한 망명자', '대역을 내세운 배후',
      '사건을 수사하는 척한 위장자', '피해자라 자처한 가해자', '치밀한 모방범', '되살아난 줄 알았던 과거의 공범',
      '아무도 의심하지 않은 어린아이', '죽음을 위장하고 숨은 자',
    ],
  },
]

// 총 조합수 = 각 슬롯 풀 크기의 곱(BigInt 로 정확히, 100만↑ 보장)
const TOTAL_COMBOS: bigint = SLOTS.reduce((acc, s) => acc * BigInt(s.pool.length), 1n)

// 천 단위 구분 + 한국어 단위(억/만) 보조 표기
function fmtNum(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function fmtKo(n: bigint): string {
  const eok = 100000000n
  const man = 10000n
  if (n >= eok) {
    const v = Number(n / man) / 10000 // 억 단위, 소수 보존
    return `약 ${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억 가지`
  }
  if (n >= man) {
    const v = Number(n) / 10000
    return `약 ${v.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 가지`
  }
  return `${fmtNum(n)}가지`
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 받침 유무 판정(한글 음절만; 마지막 글자가 한글이 아니면 받침 없음으로 처리)
function hasJong(word: string): boolean {
  const ch = (word || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
// 'ㄹ' 받침 여부(으로/로 처리용)
function endsRieul(word: string): boolean {
  const ch = (word || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 === 8 // 종성 인덱스 8 = ㄹ
}
// 조사 선택 헬퍼 — 앞 글자 받침에 따라 실제 하나를 골라 붙인다(괄호 이중표기 금지)
const josaEuro = (w: string) => w + (hasJong(w) && !endsRieul(w) ? '으로' : '로')

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved {
  id: string
  values: Record<string, string>
  note: string
  updated: number
}

const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

// 사건 한 줄 요약(로그라인) 조합 — 조사는 받침을 보고 실제 하나를 골라 붙인다
function logline(v: Record<string, string>): string {
  const { victim, place, method, motive, twist, occasion } = v
  if (!victim && !place) return ''
  const parts: string[] = []
  if (occasion) parts.push(`${occasion},`)
  if (place) parts.push(`${place}에서`)
  if (victim) parts.push(`「${victim}」${hasJong(victim) ? '이' : '가'}`)
  if (method) parts.push(`${josaEuro(method)} 살해된다`)
  let s = parts.join(' ')
  if (motive) s += `. 그 이면엔 「${motive}」${hasJong(motive) ? '이' : '가'} 있었고`
  if (twist) s += `, 끝내 ${twist}`
  return s + '.'
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x === 'object' && x.values)
      .map((x) => ({
        id: typeof x.id === 'string' ? x.id : rid(),
        values: (x.values && typeof x.values === 'object') ? x.values : {},
        note: typeof x.note === 'string' ? x.note : '',
        updated: typeof x.updated === 'number' ? x.updated : Date.now(),
      }))
  } catch {
    return []
  }
}

export default function MysteryCaseForge({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const alive = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 맥락(장르 도구함에서 전달) — 안내문에 살짝 반영
  const genreHint = payload && typeof (payload as any).genre === 'string'
    ? String((payload as any).genre)
    : ''

  // 보관 사건 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 잠기지 않은 슬롯만 다시 굴림(잠금 슬롯은 유지)
  const roll = useCallback(() => {
    setCopied('')
    setRolling(true)
    setValues((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        let f = pick(s.pool)
        if (f === prev[s.key] && s.pool.length > 1) f = pick(s.pool) // 연속 동일 완화
        next[s.key] = f
      })
      return next
    })
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 350)
  }, [locked])

  const rerollOne = (key: string) => {
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setCopied('')
    setValues((prev) => {
      let f = pick(s.pool)
      if (f === prev[key] && s.pool.length > 1) f = pick(s.pool)
      return { ...prev, [key]: f }
    })
  }

  const toggleLock = (key: string) =>
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const hasResults = SLOTS.some((s) => values[s.key])
  const allFilled = SLOTS.every((s) => values[s.key])
  const line = logline(values)

  const caseToText = (v: Record<string, string>) => {
    const lines = SLOTS.filter((s) => v[s.key]).map((s) => `${s.icon} ${s.label}: ${v[s.key]}`)
    const lg = logline(v)
    return (lg ? `🕵️ ${lg}\n\n` : '') + lines.join('\n')
  }

  const copyCase = (key: string, v: Record<string, string>) => {
    if (!navigator.clipboard) { setCopied('unsupported:' + key); return }
    navigator.clipboard.writeText(caseToText(v))
      .then(() => {
        if (!alive.current) return
        setCopied(key)
        if (copyTimer.current) clearTimeout(copyTimer.current)
        copyTimer.current = setTimeout(() => alive.current && setCopied(''), 1500)
      })
      .catch(() => alive.current && setCopied('fail:' + key))
  }

  // ── 보관(CRUD) ──
  const saveCurrent = () => {
    if (!hasResults) return
    const snap = { ...values }
    setSaved((prev) => [{ id: rid(), values: snap, note: '', updated: Date.now() }, ...prev])
    flashToast('현재 사건을 보관함에 저장했습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) =>
    setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note, updated: Date.now() } : s)))
  const loadSavedToForge = (v: Record<string, string>) => {
    setValues({ ...v })
    setLocked({})
    setTab('forge')
    flashToast('보관된 사건을 불러왔습니다.')
  }

  // ── 연계: 글감 스니펫으로 저장(공유 라이브러리) ──
  const toSnippet = (v: Record<string, string>, note?: string) => {
    const text = caseToText(v) + (note ? `\n📝 ${note}` : '')
    addToLibrary('snippets', { text, source: '사건 생성기', tags: ['미스터리', '추리', '사건'] })
    flashToast('글감 스니펫으로 저장했습니다.')
  }

  // ── 프로젝트 연동: 사건을 자료(research)/'사건' 폴더 문서로 추가 ──
  const caseBodyHtml = (v: Record<string, string>, note?: string) => {
    const lg = logline(v)
    const rows = SLOTS.filter((s) => v[s.key])
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}:</b> ${escHtml(v[s.key])}</p>`)
      .join('')
    return [
      lg ? `<p style="font-size:15px;line-height:1.7;"><b>🕵️ ${escHtml(lg)}</b></p>` : '',
      `<hr/>`,
      rows,
      note ? `<hr/><p><b>📝 메모:</b> ${escHtml(note)}</p>` : '',
    ].join('')
  }

  const addCaseToProject = (v: Record<string, string>, note?: string) => {
    if (!hasProjectBridge()) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const lg = logline(v)
    const title = lg
      ? `사건: ${lg.length > 40 ? lg.slice(0, 40) + '…' : lg}`
      : `사건 — ${v.victim || ''} / ${v.place || ''}`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title,
      bodyHtml: caseBodyHtml(v, note),
      synopsis: lg || undefined,
      meta: {
        발생정황: v.occasion || '', 피해자: v.victim || '', 장소: v.place || '', 수법: v.method || '',
        동기: v.motive || '', 단서: v.clue || '', 반전: v.twist || '', 범인유형: v.culprit || '',
      },
    })
    flashToast(id ? '프로젝트 자료 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        7개 슬롯을 굴려 <b>추리 사건</b>의 뼈대를 만듭니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
        {genreHint ? <> <span style={{ color: 'var(--accent)' }}>· 맥락: {genreHint}</span></> : null}
      </div>

      {/* 조합수 표시 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>가능한 사건 조합</span>
        <b style={{ fontSize: 16, color: 'var(--accent)' }}>{fmtKo(TOTAL_COMBOS)}</b>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>({fmtNum(TOTAL_COMBOS)})</span>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🕵️"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const val = values[s.key]
              const isLocked = !!locked[s.key]
              return (
                <div key={s.key} style={slotRow}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={s.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: val ? 'var(--text)' : 'var(--muted)', overflowWrap: 'anywhere' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rerollOne(s.key)} title="이 슬롯만 다시" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 로그라인 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🕵️"/> 사건 로그라인</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {line || '슬롯을 굴리면 한 줄 사건 요약이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={roll}><Emoji e="🎲"/> 사건 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copyCase('cur', values)} disabled={!hasResults}>
              {copied === 'cur' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
          </div>

          {/* 연계 바 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
            <button className="linkbtn" onClick={() => addCaseToProject(values)} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 생성하세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => toSnippet(values)} disabled={!hasResults}
              title={!hasResults ? '먼저 사건을 생성하세요' : '현재 사건을 글감 스니펫으로 저장(공유 라이브러리)'}>
              <Emoji e="📥"/> 글감 스니펫으로
            </button>
          </div>

          {!allFilled && hasResults && (
            <div style={hint}>아직 비어 있는 슬롯이 있어요. 한 번 더 굴리면 모든 슬롯이 채워집니다.</div>
          )}
          {copied.startsWith('unsupported') && <div style={hint}>이 환경에서는 클립보드 복사가 지원되지 않습니다.</div>}
          {copied.startsWith('fail') && <div style={hint}>복사에 실패했습니다. 직접 선택해 복사해 주세요.</div>}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s) => {
            const lg = logline(s.values)
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>{lg || '(요약 없음)'}</div>
                  <button className="minibtn" onClick={() => copyCase(k, s.values)} title="복사" style={{ flexShrink: 0 }}>
                    {copied === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"
                    style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {SLOTS.filter((sl) => s.values[sl.key]).map((sl) => (
                    <span key={sl.key} style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px' }}>
                      <Emoji e={sl.icon}/> {s.values[sl.key]}
                    </span>
                  ))}
                </div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어떻게 풀어갈지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => loadSavedToForge(s.values)} title="이 사건을 생성 탭으로 불러오기"><Emoji e="↩️"/> 불러오기</button>
                  <button className="linkbtn" onClick={() => addCaseToProject(s.values, s.note)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <button className="linkbtn" onClick={() => toSnippet(s.values, s.note)} title="이 사건을 글감 스니펫으로 저장"><Emoji e="📥"/> 글감 스니펫으로</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>
      )}
      <div style={hint}>조합은 출발점일 뿐입니다. 단서·반전·범인의 인과를 직접 메워 한 편의 사건으로 빚어보세요.</div>
    </div>
  )
}
