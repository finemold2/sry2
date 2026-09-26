// 알리바이 대장간(미스터리·추리 전용 생성기) — 용의자별 알리바이를 슬롯 풀 무작위로 생성한다.
//  각 알리바이 = 정황(그날) + 시간대 + 장소 + 행동(주장) + 증인 + "허점(깨질 지점)" + 진술 태도 의 조합.
//  · 슬롯 잠금(🔒)/재생성(🎲) — 마음에 드는 칸은 고정한 채 나머지만 다시 굴린다(조합수 표시).
//  · 여러 용의자를 추가해 한 사건의 알리바이 보드를 만들고, 타임라인 충돌(같은 시간대/같은 장소)을 자동 점검.
//  · 사건 메모(피해자/발생 시각/장소)와 함께 프로젝트 자료 '사건' 폴더로 추가, 클립보드 복사.
// 자급식: react·linkbus 외 import 없음. 외부 API·네트워크 없음(전부 로컬 자작 데이터). localStorage 자동 저장/복원, 언마운트 정리.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'mystery-alibi-forge', name: '알리바이 대장간', icon: '🕵️', group: '생성기', genre: '미스터리·추리', intro: '용의자별 알리바이(시간·장소·증인)와 그 허점을 굴려 만들고 타임라인 충돌을 점검하세요', w: 720, h: 660 }

const LS_KEY = 'sry:tool:mystery-alibi-forge'

// ── 슬롯 풀(자작 데이터) — 조합수가 100만을 크게 넘도록 각 풀을 충분히 둔다 ──
// 정황(그날의 사정/날씨/컨디션) — 시각·장소를 전제하지 않는 독립적인 그날 배경. "○○ 날, …" 형태로 앞에 붙는다.
const CIRCUMSTANCES: string[] = [
  '비가 추적추적 내리던', '눈발이 흩날리던', '유난히 무덥던', '바람이 매섭던', '안개가 짙게 깔린', '봄볕이 따스하던',
  '장마가 한창이던', '미세먼지가 심하던', '첫눈이 내린', '보름달이 환하던', '천둥이 울리던', '날이 푹푹 찌던',
  '몸살 기운이 있던', '잠을 설친', '기분이 가라앉아 있던', '월급날이라 들떠 있던', '회식이 잡혀 있던', '연차를 낸',
  '감기로 골골대던', '마감에 쫓기던', '속이 영 안 좋던', '오랜만에 한가하던', '머리가 지끈거리던', '괜히 들뜬',
  '집안일로 어수선하던', '주말을 앞두고 들뜬', '며칠째 야근이 이어지던', '아무 일도 없던 평범한',
]
// 시간대(범행 시각 전후를 다양하게 커버)
const TIMES: string[] = [
  '오후 6시 무렵', '오후 7시경', '오후 8시 전후', '오후 9시쯤', '밤 10시경', '밤 11시 무렵',
  '자정 직전', '자정 무렵', '새벽 1시경', '새벽 2시쯤', '동트기 전', '이른 새벽',
  '오전 9시경', '오전 10시 무렵', '점심 시간', '오후 1시쯤', '오후 3시경', '해 질 녘',
  '퇴근 직후', '저녁 식사 시간', '심야 영업 시간', '한밤중', '먼동이 틀 무렵', '늦은 오후',
  '오전 11시경', '오후 2시 무렵', '오후 4시쯤', '오후 5시경',
]
// 장소
const PLACES: string[] = [
  '단골 바', '회사 사무실', '심야 식당', '자택 거실', '24시 헬스장', '강변 산책로',
  '낡은 영화관', '지하 노래방', '병원 대기실', '기차역 대합실', '고속도로 휴게소', '도서관 열람실',
  '옥상 정원', '폐공장 부근', '호텔 라운지', '편의점 앞', '주차장 구석', '교회 예배당',
  '친구의 아파트', '온천 사우나', '항구 부두', '미술관 전시실', '낚시터', '산장 별채',
  '대학 연구실', '재래시장', '택시 안', '심야 버스', '공원 벤치', '술집 뒷골목',
  '치킨집 2층', '코인 빨래방', '동네 PC방', '한강 둔치',
]
// 행동(알리바이 주장)
const ACTS: string[] = [
  '혼자 술을 마셨다', '야근 서류를 정리했다', '늦은 저녁을 먹었다', '잠들어 있었다', '운동을 했다', '산책을 했다',
  '영화를 보고 있었다', '노래를 부르고 있었다', '진료를 기다렸다', '막차를 기다렸다', '운전 중이었다', '책을 읽었다',
  '담배를 피우며 통화했다', '폐자재를 옮겼다', '거래처와 미팅했다', '간식을 사러 나갔다', '차에서 쉬고 있었다', '기도를 드렸다',
  '친구와 게임을 했다', '목욕을 했다', '짐을 부리고 있었다', '그림을 감상했다', '낚싯대를 드리웠다', '불을 쬐고 있었다',
  '실험 데이터를 기록했다', '장을 보고 있었다', '손님을 태우고 있었다', '졸며 앉아 있었다',
  '빨래를 돌리고 있었다', '게임에 몰두해 있었다', '라면을 끓여 먹었다', '음악을 듣고 있었다',
]
// 증인(알리바이를 뒷받침한다는 인물/근거)
const WITNESSES: string[] = [
  '바텐더가 봤다고 한다', '경비원이 기억한다', '식당 주인이 증언한다', '아무도 없었다', '헬스 트레이너가 안다', '이웃이 마주쳤다',
  '매표원이 확인해 준다', '같이 있던 동료가 있다', '간호사가 기록했다', 'CCTV에 찍혔다는데', '톨게이트 영수증이 있다', '사서가 봤다고 한다',
  '동행이 한 명 있었다', '관리인이 안다', '룸서비스 직원이 왔다', '점원이 기억한다', '주차 요원이 봤다', '신도들이 함께였다',
  '친구가 보증한다', '카운터 직원이 안다', '동료 인부가 있었다', '관람객이 많았다', '동호회원과 함께였다', '단둘뿐이었다',
  '배달 기사가 들렀다', '옆자리 손님이 봤다', '사장이 직접 응대했다', '주문 내역이 남아 있다',
]
// 허점(이 알리바이가 깨질 수 있는 지점)
const FLAWS: string[] = [
  '증인은 술에 취해 시간을 헷갈린다', 'CCTV는 사각지대가 있었다', '영수증 시각이 5분 어긋난다', '증언자가 갑자기 입을 닫았다',
  '통화 기록과 위치가 맞지 않는다', '문은 안에서 잠겨 있었다', '교통카드 기록이 비어 있다', '증인이 사실 그 자리에 없었다',
  '시계가 30분 빨랐다', '도착 시각만 있고 떠난 시각이 없다', '같은 옷의 다른 사람일 수 있다', '비가 와서 사람들이 기억을 못 한다',
  '핸드폰이 꺼져 있던 공백이 있다', '증인과 금전 거래가 있었다', '뒷문으로 빠질 수 있는 구조다', '목격자의 시력이 나쁘다',
  '주차 기록은 차만 증명한다', '알리바이 시간이 사인(死因) 추정과 겹친다', '증언이 어제 진술과 달라졌다', '예약자 명단에 이름이 없다',
  '영상 속 얼굴이 흐릿하다', '동행이 먼저 자리를 떴다', '근처에서 그의 차가 또 찍혔다', '증인이 그의 가족이다',
  '시각을 증명할 객관적 기록이 없다', '현장까지 15분이면 다녀올 수 있다', '알리바이 직후 행적이 비어 있다', '같은 시간 다른 곳에서도 봤다는 제보가 있다',
  '문자 발신 위치가 엉뚱하다', '증인이 사건 후 행방불명이다', '제출한 표가 위조 흔적이 있다', '결정적 30분이 설명되지 않는다',
  '주문 시각과 동선이 맞지 않는다', '배달 기록에 수령인이 다르다', '영상 속 옷차림이 진술과 다르다', '결제 단말기 시계가 어긋나 있다',
]

// 진술 태도(취조·진술할 때의 태도) — 다른 슬롯을 전제하지 않는 독립적인 어미 표현. "○○○ 진술한다" 형태로 붙는다.
const DEMEANORS: string[] = [
  '시종 차분하게', '눈도 깜빡 않고', '말끝을 흐리며', '한숨을 섞어', '또박또박', '손을 떨면서',
  '대수롭지 않다는 듯', '억울하다는 듯', '낮은 목소리로', '단호하게', '연신 시계를 보며', '땀을 닦으며',
  '먼 곳을 보며', '헛웃음을 지으며', '한 글자도 틀림없이', '되묻듯이', '담담하게', '울먹이며',
  '느릿느릿', '날을 세워', '입술을 깨물며', '천천히 고개를 저으며',
]

// 슬롯 정의(라벨/풀)
const SLOTS = [
  { key: 'circ', label: '정황(그날)', icon: '🌦️', pool: CIRCUMSTANCES },
  { key: 'time', label: '시간대', icon: '🕒', pool: TIMES },
  { key: 'place', label: '장소', icon: '📍', pool: PLACES },
  { key: 'act', label: '행동(주장)', icon: '🎭', pool: ACTS },
  { key: 'witness', label: '증인', icon: '👁️', pool: WITNESSES },
  { key: 'flaw', label: '허점', icon: '🩸', pool: FLAWS },
  { key: 'demeanor', label: '진술 태도', icon: '🗣️', pool: DEMEANORS },
] as const
type SlotKey = typeof SLOTS[number]['key']

// 알리바이 하나당 조합수 = 각 풀 크기의 곱 (100만 이상 보장)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)

const SUSPECT_NAMES = ['용의자 A', '용의자 B', '용의자 C', '용의자 D', '용의자 E', '용의자 F']

interface Alibi {
  id: string
  name: string
  slots: Record<SlotKey, number>   // 풀 인덱스
  locks: Record<SlotKey, boolean>  // 슬롯 잠금
  note: string
}
interface CaseInfo { victim: string; when: string; where: string }

function rid(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const rnd = (n: number) => Math.floor(Math.random() * n)
const poolOf = (k: SlotKey) => SLOTS.find((s) => s.key === k)!.pool
const valOf = (a: Alibi, k: SlotKey) => poolOf(k)[a.slots[k]] ?? poolOf(k)[0]

// 잠기지 않은 슬롯만 무작위로 다시 굴린다.
function rollSlots(prev?: Alibi['slots'], locks?: Alibi['locks']): Alibi['slots'] {
  const out = {} as Alibi['slots']
  for (const s of SLOTS) {
    const locked = locks?.[s.key]
    out[s.key] = locked && prev ? prev[s.key] : rnd(s.pool.length)
  }
  return out
}
const emptyLocks = (): Alibi['locks'] => ({ circ: false, time: false, place: false, act: false, witness: false, flaw: false, demeanor: false })

// 받침 유무를 보고 조사를 골라 붙인다(을/를·이/가·은/는·으로/로). "을(를)" 식 이중표기를 내지 않는다.
function hasFinalConsonant(word: string): boolean {
  const ch = (word || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 취급
  return (code - 0xac00) % 28 !== 0
}
// 주격/주제 조사 — 진술 주체 뒤에 붙는 은/는
const topicJosa = (word: string): string => (hasFinalConsonant(word) ? '은' : '는')

function newAlibi(name: string): Alibi {
  return { id: rid(), name, slots: rollSlots(), locks: emptyLocks(), note: '' }
}

// 알리바이 한 문장(주장) + 허점 텍스트
function claimText(a: Alibi): string {
  return `${valOf(a, 'circ')} 날, ${valOf(a, 'time')} ${valOf(a, 'place')}에서 ${valOf(a, 'act')}. (${valOf(a, 'witness')})`
}
function flawText(a: Alibi): string { return valOf(a, 'flaw') }
// 진술 태도: "○○○은/는 ‹태도› 진술한다." — 받침 보고 조사 선택, 빈 이름은 '용의자'로.
function demeanorText(a: Alibi): string {
  const who = (a.name || '').trim() || '용의자'
  return `${who}${topicJosa(who)} ${valOf(a, 'demeanor')} 진술한다.`
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 타임라인 충돌 점검: 같은 시간대 또는 같은 장소를 주장하는 용의자 묶음.
interface Clash { kind: 'time' | 'place'; value: string; names: string[] }
function findClashes(list: Alibi[]): Clash[] {
  const out: Clash[] = []
  for (const k of ['time', 'place'] as const) {
    const map = new Map<string, string[]>()
    for (const a of list) {
      const v = valOf(a, k)
      const arr = map.get(v) || []
      arr.push(a.name || '이름 없음')
      map.set(v, arr)
    }
    for (const [value, names] of map) if (names.length > 1) out.push({ kind: k, value, names })
  }
  return out
}

// 텍스트 내보내기(복사)
function exportText(cs: CaseInfo, list: Alibi[]): string {
  const lines: string[] = ['# 알리바이 보드']
  if (cs.victim || cs.when || cs.where) {
    lines.push('')
    if (cs.victim) lines.push(`피해자: ${cs.victim}`)
    if (cs.when) lines.push(`발생 시각: ${cs.when}`)
    if (cs.where) lines.push(`발생 장소: ${cs.where}`)
  }
  list.forEach((a, i) => {
    lines.push('', `[${i + 1}] ${a.name || '이름 없음'}`)
    lines.push(`  · 주장: ${claimText(a)}`)
    lines.push(`  · 태도: ${demeanorText(a)}`)
    lines.push(`  · 허점: ${flawText(a)}`)
    if (a.note.trim()) lines.push(`  · 메모: ${a.note.trim()}`)
  })
  const clashes = findClashes(list)
  if (clashes.length) {
    lines.push('', '⚠ 타임라인 충돌')
    clashes.forEach((c) => lines.push(`  · ${c.kind === 'time' ? '같은 시간대' : '같은 장소'} "${c.value}": ${c.names.join(', ')}`))
  }
  return lines.join('\n')
}

// 프로젝트 본문(HTML)
function bodyHtml(cs: CaseInfo, list: Alibi[]): string {
  const parts: string[] = []
  if (cs.victim || cs.when || cs.where) {
    const rows: string[] = []
    if (cs.victim) rows.push(`피해자: ${escHtml(cs.victim)}`)
    if (cs.when) rows.push(`발생 시각: ${escHtml(cs.when)}`)
    if (cs.where) rows.push(`발생 장소: ${escHtml(cs.where)}`)
    parts.push(`<p><b>사건 개요</b><br>${rows.join('<br>')}</p>`)
  }
  list.forEach((a, i) => {
    parts.push(
      `<p><b>[${i + 1}] ${escHtml(a.name || '이름 없음')}</b><br>` +
      `🗣️ 주장: ${escHtml(claimText(a))}<br>` +
      `🙊 태도: ${escHtml(demeanorText(a))}<br>` +
      `🩸 허점: ${escHtml(flawText(a))}` +
      (a.note.trim() ? `<br>🗒️ 메모: ${escHtml(a.note.trim())}` : '') +
      `</p>`,
    )
  })
  const clashes = findClashes(list)
  if (clashes.length) {
    parts.push('<p><b>⚠ 타임라인 충돌</b><br>' +
      clashes.map((c) => `${c.kind === 'time' ? '같은 시간대' : '같은 장소'} "${escHtml(c.value)}" — ${escHtml(c.names.join(', '))}`).join('<br>') +
      '</p>')
  }
  return parts.join('')
}

// localStorage 복원(손상/미지원 graceful)
function load(): { cs: CaseInfo; list: Alibi[] } {
  const fallback = { cs: { victim: '', when: '', where: '' }, list: [newAlibi('용의자 A')] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const cs: CaseInfo = {
      victim: String(p?.cs?.victim || ''),
      when: String(p?.cs?.when || ''),
      where: String(p?.cs?.where || ''),
    }
    const arr = Array.isArray(p?.list) ? p.list : []
    const list: Alibi[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const slots = {} as Alibi['slots']
      const locks = emptyLocks()
      for (const s of SLOTS) {
        const idx = Number(x?.slots?.[s.key])
        slots[s.key] = Number.isInteger(idx) && idx >= 0 && idx < s.pool.length ? idx : rnd(s.pool.length)
        locks[s.key] = !!x?.locks?.[s.key]
      }
      return { id: String(x.id || rid()), name: String(x.name || ''), slots, locks, note: String(x.note || '') }
    })
    return { cs, list: list.length ? list : fallback.list }
  } catch { return fallback }
}

export default function MysteryAlibiForge({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [cs, setCs] = useState<CaseInfo>(init.current.cs)
  const [list, setList] = useState<Alibi[]>(init.current.list)
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')
  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 맥락(장르 도구함에서 전달) — 표시용
  const genreCtx = payload && typeof payload.genre === 'string' ? String(payload.genre) : ''

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // 자동 저장(차단/용량초과 graceful)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cs, list })) } catch { /* noop */ }
  }, [cs, list])

  const flashCopied = (k: string) => {
    if (!alive.current) return
    setCopied(k)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => alive.current && setCopied(''), 1400)
  }
  const flashToast = (m: string) => {
    if (!alive.current) return
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  const copy = (text: string, key: string) => {
    const done = () => flashCopied(key)
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
    } catch { flashCopied('fail:' + done.name) }
  }

  // ── 알리바이 조작 ──
  const rollOne = (id: string) => setList((prev) => prev.map((a) => (a.id === id ? { ...a, slots: rollSlots(a.slots, a.locks) } : a)))
  const rollAll = () => setList((prev) => prev.map((a) => ({ ...a, slots: rollSlots(a.slots, a.locks) })))
  const toggleLock = (id: string, k: SlotKey) =>
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, locks: { ...a.locks, [k]: !a.locks[k] } } : a)))
  // 단일 슬롯만 다시 굴리기(잠겼어도 강제로 새 값)
  const rollSlot = (id: string, k: SlotKey) =>
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, slots: { ...a.slots, [k]: rnd(poolOf(k).length) } } : a)))
  const setName = (id: string, name: string) => setList((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)))
  const setNote = (id: string, note: string) => setList((prev) => prev.map((a) => (a.id === id ? { ...a, note } : a)))

  const addSuspect = () => setList((prev) => {
    if (prev.length >= 8) return prev
    const used = new Set(prev.map((a) => a.name))
    const name = SUSPECT_NAMES.find((n) => !used.has(n)) || `용의자 ${prev.length + 1}`
    return [...prev, newAlibi(name)]
  })
  const removeSuspect = (id: string) => setList((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)))
  const moveSuspect = (id: string, dir: -1 | 1) => setList((prev) => {
    const i = prev.findIndex((a) => a.id === id)
    if (i < 0) return prev
    const j = i + dir
    if (j < 0 || j >= prev.length) return prev
    const next = prev.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const clashes = findClashes(list)
  // 어떤 용의자가 어떤 충돌에 걸렸는지 표시용 집합
  const clashTimeNames = new Set(clashes.filter((c) => c.kind === 'time').flatMap((c) => c.names))
  const clashPlaceNames = new Set(clashes.filter((c) => c.kind === 'place').flatMap((c) => c.names))

  const linked = hasProjectBridge()

  // ── 프로젝트 연동: 사건 보드를 folder:"사건" 자료로 추가 ──
  const toProject = () => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다'); return }
    const title = cs.victim.trim()
      ? `알리바이 보드 — ${cs.victim.trim()} 사건`
      : `알리바이 보드 (용의자 ${list.length}명)`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title,
      bodyHtml: bodyHtml(cs, list),
      synopsis: list.map((a) => `${a.name}: ${valOf(a, 'time')}/${valOf(a, 'place')}`).join(' · '),
      meta: {
        용의자수: String(list.length),
        타임라인충돌: clashes.length ? `${clashes.length}건` : '없음',
        ...(cs.when ? { 발생시각: cs.when } : {}),
        ...(cs.where ? { 발생장소: cs.where } : {}),
      },
    })
    flashToast(id ? '프로젝트 자료(사건 폴더)에 추가됨' : '프로젝트 추가에 실패했어요')
  }

  // ── 라이브러리 저장: 알리바이 주장+허점을 스니펫으로 ──
  const toSnippet = (a: Alibi) => {
    addToLibrary('snippets', {
      text: `[${a.name || '용의자'}] ${claimText(a)} / 허점: ${flawText(a)}`,
      source: '알리바이 대장간',
      tags: ['알리바이', '미스터리'],
    })
    flashToast('글감(스니펫)에 저장됨')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const small: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' }
  const fieldRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const inp: React.CSSProperties = { padding: '6px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🕵️"/></span>
        <strong style={{ fontSize: 15 }}>알리바이 대장간</strong>
        <span style={small}>용의자 {list.length}명</span>
        <span style={{ flex: 1 }} />
        <span style={small} title="알리바이 한 명당 가능한 조합 수(슬롯 풀 곱)">
          조합 {COMBOS.toLocaleString('ko-KR')}가지+
        </span>
        <button className="minibtn" onClick={rollAll} title="잠그지 않은 모든 슬롯을 다시 굴립니다"><Emoji e="🎲"/> 전체 굴리기</button>
        <button className="btn-primary" onClick={addSuspect} disabled={list.length >= 8} title="용의자(알리바이) 추가">＋ 용의자</button>
      </div>

      <div style={body}>
        <div style={{ ...small, lineHeight: 1.5 }}>
          {genreCtx === '미스터리·추리'
            ? '미스터리·추리 사건의 '
            : ''}
          용의자마다 <b>정황·시간·장소·행동·증인·진술 태도</b>로 알리바이를 굴리고, 함께 생성되는 <b>허점(<Emoji e="🩸"/>)</b>으로 깨질 지점을 잡으세요.
          칸을 <b><Emoji e="🔒"/> 잠그면</b> 그 값은 고정한 채 나머지만 다시 굴립니다.
        </div>

        {/* 사건 개요 */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 13 }}><Emoji e="🗂️"/> 사건 개요</div>
          <div style={fieldRow}>
            <input style={{ ...inp, flex: 1, minWidth: 140 }} value={cs.victim} maxLength={60}
              onChange={(e) => setCs({ ...cs, victim: e.target.value })} placeholder="피해자 (예: 윤소라)" />
            <input style={{ ...inp, flex: 1, minWidth: 140 }} value={cs.when} maxLength={60}
              onChange={(e) => setCs({ ...cs, when: e.target.value })} placeholder="발생 시각 (예: 밤 11시~자정)" />
            <input style={{ ...inp, flex: 1, minWidth: 140 }} value={cs.where} maxLength={60}
              onChange={(e) => setCs({ ...cs, where: e.target.value })} placeholder="발생 장소 (예: 별장 서재)" />
          </div>
        </div>

        {/* 타임라인 충돌 점검 */}
        <div style={{ ...card, borderColor: clashes.length ? 'var(--warn)' : 'var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: clashes.length ? 'var(--warn)' : 'var(--text)' }}>
            <Emoji e="🧭"/> 타임라인 충돌 점검 {clashes.length ? `· ${clashes.length}건` : '· 충돌 없음'}
          </div>
          {clashes.length === 0 ? (
            <div style={small}>현재 용의자들의 시간대·장소가 서로 겹치지 않습니다. 겹치면 동시에 같은 곳에 있었다는 모순이 됩니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {clashes.map((c, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--warn)', fontWeight: 700 }}>{c.kind === 'time' ? <><Emoji e="⏱"/> 같은 시간대</> : <><Emoji e="📍"/> 같은 장소</>}</span>{' '}
                  <b>“{c.value}”</b> — {c.names.join(', ')}
                </div>
              ))}
              <div style={small}>겹침은 단서가 될 수 있습니다(공모·목격·모순). 의도한 충돌이 아니라면 한쪽 슬롯을 다시 굴리세요.</div>
            </div>
          )}
        </div>

        {/* 용의자 카드들 */}
        {list.map((a, idx) => {
          const inTimeClash = clashTimeNames.has(a.name || '이름 없음')
          const inPlaceClash = clashPlaceNames.has(a.name || '이름 없음')
          return (
            <div key={a.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>#{idx + 1}</span>
                <input
                  style={{ ...inp, flex: 1, minWidth: 100, fontWeight: 700 }}
                  value={a.name}
                  maxLength={40}
                  onChange={(e) => setName(a.id, e.target.value)}
                  placeholder="용의자 이름"
                />
                <button className="minibtn" onClick={() => rollOne(a.id)} title="이 용의자의 잠그지 않은 슬롯을 다시 굴리기"><Emoji e="🎲"/></button>
                <button className="minibtn" onClick={() => moveSuspect(a.id, -1)} disabled={idx === 0} title="위로">▲</button>
                <button className="minibtn" onClick={() => moveSuspect(a.id, 1)} disabled={idx === list.length - 1} title="아래로">▼</button>
                <button className="minibtn" onClick={() => removeSuspect(a.id)} disabled={list.length <= 1}
                  title="용의자 삭제" style={{ color: list.length <= 1 ? undefined : 'var(--warn)' }}><Emoji e="🗑️"/></button>
              </div>

              {/* 슬롯들 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SLOTS.map((s) => {
                  const locked = a.locks[s.key]
                  const isFlaw = s.key === 'flaw'
                  const warnRow = (s.key === 'time' && inTimeClash) || (s.key === 'place' && inPlaceClash)
                  return (
                    <div key={s.key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      border: '1px solid ' + (warnRow ? 'var(--warn)' : isFlaw ? 'var(--accent)' : 'var(--border)'),
                      background: 'var(--paper)', borderRadius: 8, padding: '6px 8px',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', width: 78, flexShrink: 0 }}><Emoji e={s.icon}/> {s.label}</span>
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45, color: isFlaw ? 'var(--accent)' : 'var(--text)', fontWeight: isFlaw ? 600 : 400 }}>
                        {poolOf(s.key)[a.slots[s.key]]}
                      </span>
                      {warnRow && <span style={{ fontSize: 10, color: 'var(--warn)' }}>충돌</span>}
                      <button className="minibtn" style={{ padding: '2px 6px' }} onClick={() => toggleLock(a.id, s.key)}
                        title={locked ? '잠금 해제' : '이 칸 고정(다시 굴려도 유지)'}>
                        {locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                      </button>
                      <button className="minibtn" style={{ padding: '2px 6px' }} onClick={() => rollSlot(a.id, s.key)} title="이 칸만 새로 굴리기"><Emoji e="🎲"/></button>
                    </div>
                  )
                })}
              </div>

              {/* 합성된 주장 + 허점 */}
              <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.55 }}>
                <div><Emoji e="🗣️"/> <b>주장:</b> {claimText(a)}</div>
                <div style={{ marginTop: 4, color: 'var(--muted)' }}><Emoji e="🙊"/> <b>태도:</b> {demeanorText(a)}</div>
                <div style={{ marginTop: 4, color: 'var(--accent)' }}><Emoji e="🩸"/> <b>허점:</b> {flawText(a)}</div>
              </div>

              <textarea
                value={a.note}
                onChange={(e) => setNote(a.id, e.target.value)}
                placeholder="이 알리바이를 어떻게 무너뜨릴지·진실은 무엇인지 메모…"
                rows={2}
                maxLength={400}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit' }}
              />

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(`${a.name || '용의자'}\n주장: ${claimText(a)}\n태도: ${demeanorText(a)}\n허점: ${flawText(a)}`, 'a' + a.id)}>
                  {copied === 'a' + a.id ? <>✓ 복사됨</> : <><Emoji e="📋"/> 이 용의자 복사</>}
                </button>
                <button className="linkbtn" onClick={() => toSnippet(a)} title="이 알리바이를 공유 글감(스니펫)에 저장"><Emoji e="📥"/> 글감 저장</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단: 전체 복사 + 프로젝트 연계 */}
      {toast && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--ok)', background: 'var(--chrome-2)', borderTop: '1px solid var(--border)' }}><Emoji e="✅"/> {toast}</div>
      )}
      <div className="linkbar" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!linked}
          title={linked ? '사건 보드를 프로젝트 자료(사건 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={() => copy(exportText(cs, list), 'all')}>
          {copied === 'all' ? <>✓ 전체 복사됨</> : <><Emoji e="📋"/> 보드 전체 복사</>}
        </button>
        <span style={{ flex: 1 }} />
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '미스터리·추리' })} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 설계기 열기"><Emoji e="⚔️"/> 갈등 설계기</button>
      </div>
    </div>
  )
}
