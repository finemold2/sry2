// 갈등·딜레마 단조기(현대판타지·회귀 전용) — 회귀물다운 갈등 구도를 슬롯 풀 무작위 조합으로 단조한다.
//   주체(회귀 인물) + 욕망 + 갈등축 + 적대/장애물 + 이해관계(걸린 것) + 회귀 특유 딜레마 + 악화 압박
//   → 한 줄 갈등 + 회귀물 고유의 비틀기를 자동 조립. 슬롯별 🔒잠금/재생성, 조합수 표시(수억 이상).
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 안 씀). Math.random + localStorage 만.
// 연계(linkbus): 단조한 갈등을 프로젝트 자료('research')/'갈등' 폴더 문서로 추가, 글감을 공유 라이브러리(snippets)에 저장,
//   관련 도구(반전 카드덱·갈등 설계기·캐릭터 단조기)를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-conflictforge',
  name: '회귀 갈등 단조기',
  icon: '⚔️',
  group: '생성기',
  genre: '현대판타지·회귀',
  intro: '회귀물다운 갈등·딜레마 구도를 슬롯 조합으로 단조하세요(수억 가지)',
  w: 640,
  h: 640,
}

const LS = 'sry:tool:modfan-conflictforge'

// ── 슬롯 정의 ────────────────────────────────────────────────────────────────
// 각 슬롯은 현판·회귀 도시에에 근거한 장르 특화 풀. 일반론 배제, 구체적 표현.
interface Slot { key: string; label: string; icon: string; hint: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'subject', label: '회귀 주체', icon: '🔄',
    hint: '두 번째 인생을 사는 주인공의 정체성(전생의 위치)',
    pool: [
      '전생에 배신당해 죽은 길드 마스터',
      '데뷔도 못 하고 사라진 비운의 연습생',
      '파산해 고시원에서 객사한 전직 펀드매니저',
      '게이트 폭주에 휩쓸려 죽은 F급 잡몹 헌터',
      '소속사에 버려진 한물간 아이돌',
      '대기업 후계 다툼에서 밀려난 재벌 서자',
      '실력을 인정받지 못하고 은퇴한 프로게이머',
      '표절 누명을 쓰고 절필한 무명 웹소설 작가',
      '구단에서 방출돼 잊힌 만년 2군 투수',
      '동료를 잃고 폐인이 된 S급 각성자',
      '미래 정보를 독점하다 토사구팽당한 정보 브로커',
      '레이드 마지막에 미끼로 버려진 탱커',
      '대박 종목을 코앞에서 놓친 개미 투자자',
      '연구 성과를 빼앗기고 추락한 천재 공학도',
      '회귀자에게 패배해 모든 걸 잃은 또 다른 회귀자',
      '협회의 부패를 고발하려다 매장된 헌터',
      '망한 기획사 사장의 빚을 떠안은 매니저',
      '딸을 지키지 못하고 무너진 한물간 격투가',
      '시스템에 선택받지 못한 채 죽은 무각성자',
      '대형 사고를 막지 못해 평생 죄책감에 시달린 소방관',
    ],
  },
  {
    key: 'desire', label: '이번 생의 욕망', icon: '🎯',
    hint: '회귀 직후 절실히 이루려는 목표(체크리스트형 추진력)',
    pool: [
      '이번엔 가족을 반드시 살려내는 것',
      '전생의 배신자를 같은 칼로 베어 청산하는 것',
      '저점에서 그 종목을 선점해 종잣돈을 쥐는 것',
      '아직 무명인 미래의 대스타를 먼저 포섭하는 것',
      '게이트가 터지기 전 그 자리를 선점하는 것',
      '망하기 전 기획사를 통째로 사들이는 것',
      '전생에 못 부른 그 노래로 차트를 올킬하는 것',
      '자신의 각성 등급을 끝까지 숨긴 채 정점에 오르는 것',
      '협회를 장악해 부패의 뿌리를 도려내는 것',
      '전생에 잃은 동료들을 한 명도 빠짐없이 거두는 것',
      '재벌가의 적통 자리를 빼앗아 가문을 차지하는 것',
      '미래에 터질 대형 스캔들을 미리 묻어버리는 것',
      '전생의 스승을 함정에서 구해 진실을 듣는 것',
      '아직 떡잎인 천재를 자기 팀으로 길러내는 것',
      '죽기 전 끝내 못 지킨 약속을 이번엔 지키는 것',
      '미래의 대재앙을 단 한 사람도 모르게 막는 것',
      '전생에 빼앗긴 특허·작품을 먼저 출원해 되찾는 것',
      '자신을 버린 조직보다 먼저 정상에 도달하는 것',
      '아직 아무도 모르는 던전 공략법을 독점하는 것',
      '두 번째 인생에선 평범하게 가족 곁에 머무는 것',
    ],
  },
  {
    key: 'axis', label: '갈등축', icon: '🧭',
    hint: '갈등의 근본 성격(무엇과 부딪치는가)',
    pool: [
      '미래를 안다는 비밀이 들킬 위험(지식 누설)',
      '내 개입으로 미래가 바뀌어 메타지식이 무효화됨(나비효과)',
      '전생의 원수가 아직 나보다 압도적으로 우위에 있음',
      '같은 시점으로 돌아온 또 다른 회귀자와의 정보전',
      '아는 미래와 지켜야 할 사람 사이의 충돌',
      '전생의 무능했던 나와 각성한 현재의 나 사이의 자기 대립',
      '실력을 숨겨야 하는데 위기는 실력을 요구함',
      '미래 지식의 정당성을 증명할 수 없는 고립',
      '구해야 할 사람과 청산해야 할 원수가 한 사람임',
      '두 번째 기회를 낭비할지 모른다는 시간의 압박',
      '시스템·예지자가 회귀자임을 감지하려 함',
      '미래를 바꾸면 다른 누군가가 대신 죽는 등가교환',
    ],
  },
  {
    key: 'foe', label: '적대 세력·장애물', icon: '🗡️',
    hint: '욕망을 가로막는 구체적 인물·조직·힘',
    pool: [
      '전생에 나를 미끼로 버린 길드 마스터',
      '미래의 정보를 독점한 또 다른 회귀자',
      '가문의 적통을 노리는 이복형',
      '연습생을 소모품 취급하는 거대 기획사 대표',
      '게이트를 사유화한 부패한 헌터협회 간부',
      '내 특허를 가로챌 대기업 연구소장',
      '재능을 시기해 표절을 뒤집어씌운 선배 작가',
      '미래에 흑막으로 드러나는 정계의 거물',
      '주인공의 변화를 의심하는 날카로운 가족',
      '같은 종목을 노리는 작전 세력',
      '예지 능력으로 회귀자를 사냥하는 EX급 각성자',
      '아직 무명이지만 미래엔 나를 짓밟을 천재 라이벌',
      '전생의 나를 파산시킨 사채업 조직',
      '구단을 사유물처럼 휘두르는 모기업 회장',
      '회귀의 비밀을 캐려는 협회 감찰관',
      '재앙을 일부러 일으키려는 광신 집단',
    ],
  },
  {
    key: 'stakes', label: '걸린 것(이해관계)', icon: '💥',
    hint: '실패하면 잃는 것 — 되돌릴 수 없는 대가',
    pool: [
      '또다시 가족의 목숨을 잃는 것',
      '두 번째 인생마저 같은 결말로 끝나는 것',
      '회귀자라는 비밀이 폭로돼 사냥당하는 것',
      '선점한 종잣돈과 기반을 통째로 빼앗기는 것',
      '미래의 동료가 전생처럼 적의 손에 죽는 것',
      '바뀐 미래가 더 큰 재앙으로 폭주하는 것',
      '실력을 들켜 협회의 통제 대상이 되는 것',
      '구하려던 사람이 또다시 눈앞에서 사라지는 것',
      '가문에서 영원히 축출되는 것',
      '전생의 한을 끝내 못 갚고 다시 무너지는 것',
      '메타지식을 잃고 평범한 패자로 전락하는 것',
      '나 대신 무고한 누군가가 죽는 등가의 대가',
      '미래의 대스타를 라이벌에게 빼앗기는 것',
      '예지자에게 다음 행보를 모두 읽히는 것',
      '단 하나뿐인 두 번째 기회 자체를 소진하는 것',
    ],
  },
  {
    key: 'dilemma', label: '회귀 특유 딜레마', icon: '🌀',
    hint: '이 장르만의 비틀기 — 답을 아는 자의 역설',
    pool: [
      '답을 알지만, 그 답을 쓰는 순간 회귀자임이 드러난다',
      '구하려면 미래를 바꿔야 하고, 바꾸면 다음 미래를 모른다',
      '복수를 택하면 가족을 못 지키고, 가족을 택하면 원수가 살아남는다',
      '실력을 보이면 표적이 되고, 숨기면 위기에 당한다',
      '아는 미래를 말하면 미친 사람 취급, 침묵하면 참극을 방관',
      '선점하려면 양심을 버려야 하고, 양심을 지키면 선수를 빼앗긴다',
      '동료를 거두면 전생의 죽음을 막아야 할 책임이 늘어난다',
      '원수를 일찍 치면 더 큰 흑막을 놓치고, 두면 또 당한다',
      '미래의 천재를 키우면 언젠가 나를 넘어설 칼이 된다',
      '두 번째 인생을 즐기려 할수록 전생의 한이 발목을 잡는다',
      '미래를 바꿀 때마다 내가 아는 지도는 점점 백지가 된다',
      '같은 회귀자를 믿으면 정보가 새고, 의심하면 적이 된다',
      '재앙을 막으면 공을 증명할 수 없고, 증명하려면 재앙을 터뜨려야 한다',
      '전생의 사랑을 다시 만나면, 같은 비극을 반복할까 두렵다',
    ],
  },
  {
    key: 'pressure', label: '악화·시한 압박', icon: '⏳',
    hint: '갈등을 조이는 데드라인·악화 요소',
    pool: [
      '그 사건이 일어나기까지 정확히 D-7',
      '저점 매수 타이밍이 단 사흘 뒤 닫힌다',
      '게이트가 등급을 모르는 채 곧 열린다',
      '데뷔조 확정 발표가 이번 주 안에 난다',
      '원수가 먼저 움직이기 시작했다',
      '또 다른 회귀자가 같은 종목을 노리고 있다',
      '가족이 전생과 똑같은 길로 향하고 있다',
      '협회 감찰이 코앞까지 다가왔다',
      '바뀐 미래가 이미 예상 밖으로 틀어지기 시작했다',
      '자금이 단 한 번의 베팅으로밖에 안 닿는다',
      '의심하던 가족이 결정적 질문을 던지려 한다',
      '예지자가 다음 수를 읽어내기 직전이다',
      '미래의 대스타가 다른 기획사와 계약 직전이다',
      '재앙의 첫 징후가 오늘 밤 시작된다',
    ],
  },
]

const SLOT_KEYS = SLOTS.map((s) => s.key)
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 조합수 = 각 슬롯 풀 크기의 곱. (도시에 규약: 핵심 생성기 1조 이상 지향)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
function fmtCombos(n: number): string {
  // 한국어 큰 수(억/조) 단위로 가독화
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 2).replace(/\.00$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 2).replace(/\.00$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString('ko-KR')
}

type Result = Record<string, string>
type Locks = Record<string, boolean>

// 한 줄 갈등 문장 조립 — 슬롯값으로 자연스러운 회귀물 갈등을 엮는다.
function composeLine(r: Result): string {
  const subj = r.subject || '회귀자'
  const want = (r.desire || '무언가를 이루려').replace(/[.。]$/, '')
  const foe = (r.foe || '거대한 장애물').replace(/[.。]$/, '')
  const stk = (r.stakes || '모든 것').replace(/[.。]$/, '')
  return `「${subj}」(으)로 회귀한 그는 ${want}을(를) 노리지만, ${foe}이(가) 앞을 막는다. 실패하면 ${stk}.`
}
// 비틀기 한 줄 — 갈등축 + 회귀 특유 딜레마 + 압박을 결합.
function composeTwist(r: Result): string {
  const axis = (r.axis || '').replace(/[.。]$/, '')
  const dil = (r.dilemma || '').replace(/[.。]$/, '')
  const pre = (r.pressure || '').replace(/[.。]$/, '')
  const parts: string[] = []
  if (axis) parts.push(`갈등의 본질은 ${axis}이라는 점이다`)
  if (dil) parts.push(`게다가 ${dil}`)
  if (pre) parts.push(`그런데 ${pre}`)
  return parts.length ? parts.join('. ') + '.' : ''
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function bodyHtml(r: Result): string {
  const line = composeLine(r)
  const twist = composeTwist(r)
  const parts: string[] = []
  parts.push(`<p style="font-size:15px;line-height:1.7;"><b>⚔️ ${escHtml(line)}</b></p>`)
  if (twist) parts.push(`<p style="line-height:1.7;color:#555;">🌀 ${escHtml(twist)}</p>`)
  parts.push('<hr/>')
  SLOTS.forEach((s) => {
    if (r[s.key]) parts.push(`<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${escHtml(r[s.key])}</p>`)
  })
  return parts.join('')
}

function plainText(r: Result): string {
  const lines = [
    `⚔️ ${composeLine(r)}`,
  ]
  const tw = composeTwist(r)
  if (tw) lines.push(`🌀 ${tw}`)
  lines.push('')
  SLOTS.forEach((s) => { if (r[s.key]) lines.push(`${s.icon} ${s.label}: ${r[s.key]}`) })
  return lines.join('\n')
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface Saved { id: string; result: Result; note: string; createdAt: number }

// localStorage 복원
function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof x === 'object' && x.result).map((x: any) => ({
      id: String(x.id || newId()),
      result: (x.result && typeof x.result === 'object') ? x.result : {},
      note: typeof x.note === 'string' ? x.note : '',
      createdAt: Number(x.createdAt) || Date.now(),
    }))
  } catch { return [] }
}

export default function ModfanConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const [result, setResult] = useState<Result>({})
  const [locks, setLocks] = useState<Locks>({})
  const [forging, setForging] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const mounted = useRef(true)

  // payload.genre 확인용(현재 도구는 현판·회귀 전용이라 표기만 활용)
  const payloadGenre = typeof payload?.genre === 'string' ? (payload!.genre as string) : ''

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 보관함 저장 — graceful
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 보관 내용이 사라질 수 있어요.') }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제 + 정리
  useEffect(() => {
    if (!forging) return
    const t = window.setTimeout(() => { if (mounted.current) setForging(false) }, 340)
    return () => window.clearTimeout(t)
  }, [forging, result])

  const flash = (m: string) => { if (mounted.current) setToast(m) }

  // 단조(생성): 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const forge = useCallback(() => {
    setForging(true)
    setResult((prev) => {
      const next: Result = { ...prev }
      SLOTS.forEach((s) => {
        if (locks[s.key] && prev[s.key]) return
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 중복 완화
        next[s.key] = v
      })
      return next
    })
  }, [locks])

  // 슬롯 하나만 다시 굴리기
  const reroll = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setForging(true)
    setResult((prev) => {
      let v = pick(slot.pool)
      if (v === prev[key] && slot.pool.length > 1) v = pick(slot.pool)
      return { ...prev, [key]: v }
    })
  }

  const toggleLock = (key: string) => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))
  const lockAll = () => setLocks(Object.fromEntries(SLOT_KEYS.map((k) => [k, true])))
  const unlockAll = () => setLocks({})

  const hasResult = SLOT_KEYS.some((k) => result[k])
  const lockedCount = SLOT_KEYS.filter((k) => locks[k]).length

  const copyText = (text: string, label = '복사됨') => {
    const done = () => flash(label)
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { flash('복사 실패') }
  }

  // 현재 단조 결과 보관(CRUD: Create)
  const saveCurrent = () => {
    if (!hasResult) return
    const rec: Saved = { id: newId(), result: { ...result }, note: '', createdAt: Date.now() }
    setSaved((prev) => [rec, ...prev])
    flash('보관함에 담았어요')
  }
  const removeSaved = (id: string) => { setSaved((prev) => prev.filter((s) => s.id !== id)); setConfirmDel(null) }
  const setSavedNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const a = prev.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
  }
  const loadIntoForge = (r: Result) => { setResult({ ...r }); setLocks({}); setTab('forge'); flash('단조대에 불러왔어요') }

  // 프로젝트 연계 — '갈등' 폴더 문서로 추가
  const toProject = (r: Result, note?: string) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다'); return }
    let html = bodyHtml(r)
    if (note && note.trim()) html += `<p><b>🗒️ 메모</b><br>${escHtml(note.trim())}</p>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '갈등',
      title: `회귀 갈등 — ${(r.subject || '회귀자').replace(/[「」]/g, '')}`,
      bodyHtml: html,
      synopsis: composeLine(r),
      meta: {
        장르: '현대판타지·회귀',
        갈등축: r.axis || '—',
        딜레마: r.dilemma || '—',
        압박: r.pressure || '—',
      },
    })
    flash(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  // 글감을 공유 라이브러리(snippets)에 저장 → 다른 도구가 함께 읽음
  const toLibrary = (r: Result) => {
    const tw = composeTwist(r)
    addToLibrary('snippets', {
      text: composeLine(r) + (tw ? `\n🌀 ${tw}` : ''),
      source: '회귀 갈등 단조기',
      tags: ['현대판타지', '회귀', '갈등', r.axis ? r.axis.slice(0, 8) : '갈등'].filter(Boolean),
    })
    flash('글감 보관함(스니펫)에 저장했어요')
  }

  // 보관함 검색 필터
  const filtered = saved.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (plainText(s.result) + ' ' + (s.note || '')).toLowerCase().includes(q)
  })

  const line = composeLine(result)
  const twist = composeTwist(result)

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', background: 'var(--paper)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const slotBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })

  return (
    <div style={wrap}>
      {/* 헤더 / 조합수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️" /></span>
        <strong style={{ fontSize: 15 }}>회귀 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px' }}>현대판타지·회귀</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }} title={`정확히 ${COMBOS.toLocaleString('ko-KR')}가지`}>조합수 약 <b style={{ color: 'var(--text)' }}>{fmtCombos(COMBOS)}</b>가지</span>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'} style={tabBtn(tab === 'forge')}><Emoji e="🔨" /> 단조대</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="📦" /> 보관함 ({saved.length})</button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 컨트롤 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={forge}><Emoji e="⚒️" /> 갈등 단조 / 다시 굴리기</button>
            <button className="minibtn" onClick={lockAll} disabled={!hasResult} title="모든 슬롯 잠금"><Emoji e="🔒" /> 전체</button>
            <button className="minibtn" onClick={unlockAll} disabled={lockedCount === 0} title="모든 잠금 해제"><Emoji e="🔓" /> 해제</button>
          </div>

          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const v = result[s.key]
              const isLocked = !!locks[s.key]
              return (
                <div key={s.key} style={{ ...slotBox, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: forging && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }} title={s.hint}>{s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span></div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                      {v ? (forging && !isLocked ? '…' : v) : '— 단조해 주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => reroll(s.key)} title="이 슬롯만 다시" style={{ flexShrink: 0, padding: '3px 7px' }}><Emoji e="🎲" /></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '잠금 해제' : '이 슬롯 잠금'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)', padding: '3px 7px' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                </div>
              )
            })}
          </div>

          {/* 조합 결과 */}
          <div style={{ background: 'var(--chrome-2)', border: '1px solid ' + (hasResult ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, padding: '11px 13px' }}>
            <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--accent)', fontSize: 12 }}><Emoji e="⚔️" /> 단조된 갈등</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: hasResult ? 'var(--text)' : 'var(--muted)' }}>{hasResult ? line : '슬롯을 단조하면 한 줄 갈등이 만들어집니다.'}</div>
            {hasResult && twist && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', marginTop: 7, borderTop: '1px dashed var(--border)', paddingTop: 7 }}><Emoji e="🌀" /> {twist}</div>}
          </div>

          {/* 액션 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResult}><Emoji e="📦" /> 보관</button>
            <button className="minibtn" onClick={() => copyText(plainText(result), '복사됨')} disabled={!hasResult}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={() => toLibrary(result)} disabled={!hasResult} title="글감 보관함(스니펫)에 저장 — 다른 도구가 함께 읽어요"><Emoji e="🧩" /> 글감 저장</button>
          </div>

          {/* 프로젝트 / 관련 도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toProject(result)} disabled={!hasResult || !hasProjectBridge()} title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '단조한 갈등을 프로젝트 자료 〈갈등〉 폴더에 문서로 추가'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: payloadGenre || '현대판타지·회귀', seed: line })} title="반전 카드덱 열기 — 이 갈등에 반전을 더해보세요"><Emoji e="🃏" /> 반전 카드덱</button>
            <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: payloadGenre || '현대판타지·회귀', desire: result.desire || '', obstacle: result.foe || '', stakes: result.stakes || '' })} title="갈등 설계기 열기 — 강화 질문으로 점검"><Emoji e="🛠️" /> 갈등 설계기</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: payloadGenre || '현대판타지·회귀', hint: result.subject || '' })} title="캐릭터 단조기 열기 — 이 회귀 주체로 인물 만들기"><Emoji e="👤" /> 캐릭터 단조</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="보관한 갈등 검색…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          />
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, paddingRight: 2 }}>
            {saved.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="📦" /></div>
                보관한 갈등이 없습니다.<br />
                <span style={{ fontSize: 12 }}>단조대에서 <Emoji e="📦" /> 보관을 눌러 마음에 드는 구도를 모아보세요.</span>
              </div>
            )}
            {saved.length > 0 && filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 }}>검색 결과가 없어요.</div>
            )}
            {filtered.map((s, i) => (
              <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>{composeLine(s.result)}</span>
                </div>
                {composeTwist(s.result) && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}><Emoji e="🌀" /> {composeTwist(s.result)}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                  {SLOTS.map((sl) => s.result[sl.key] ? <span key={sl.key} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }} title={sl.label}><Emoji e={sl.icon} /> {s.result[sl.key]}</span> : null)}
                </div>
                <textarea
                  value={s.note}
                  onChange={(e) => setSavedNote(s.id, e.target.value)}
                  placeholder="이 갈등을 어느 화에 어떻게 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => moveSaved(s.id, 1)} disabled={i === filtered.length - 1} title="아래로">▼</button>
                  <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => loadIntoForge(s.result)} title="단조대로 불러오기"><Emoji e="↩️" /> 불러오기</button>
                  <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => copyText(plainText(s.result) + (s.note ? `\n🗒️ ${s.note}` : ''), '복사됨')}><Emoji e="📋" /></button>
                  <button className="linkbtn" style={{ padding: '3px 7px', fontSize: 11 }} onClick={() => toProject(s.result, s.note)} disabled={!hasProjectBridge()} title="프로젝트 〈갈등〉 폴더에 추가"><Emoji e="📄" /></button>
                  <span style={{ flex: 1 }} />
                  {confirmDel === s.id ? (
                    <>
                      <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={() => removeSaved(s.id)}>삭제</button>
                      <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>취소</button>
                    </>
                  ) : (
                    <button className="minibtn" style={{ padding: '3px 7px', fontSize: 11, color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => setConfirmDel(s.id)} title="삭제"><Emoji e="🗑" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>슬롯을 <Emoji e="🔒" />로 고정해 마음에 드는 축을 남기고 나머지만 다시 단조하세요. 조합은 출발점일 뿐, 인물·시점에 맞춰 자유롭게 비트세요.</div>
    </div>
  )
}
