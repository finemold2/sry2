// 범행 현장 생성기 — 미스터리·추리 장르용 배경 도구.
//   장소 × 시간·날씨 × 시신(피해자) 상태 × 남겨진 흔적 × 이상한 점 슬롯을 무작위 조합해
//   하나의 '현장 묘사 글감'을 만든다. 마음에 드는 슬롯은 🔒로 잠그고 나머지만 재생성.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:mystery-crime-scene') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 관련 도구 열기(openToolLinked). payload.genre 가 오면 맥락 배지로 활용.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'mystery-crime-scene',
  name: '범행 현장 생성기',
  icon: '🔪',
  group: '배경',
  genre: '미스터리·추리',
  intro: '장소·시간·시신 상태·흔적·이상한 점을 조합해 범행 현장 글감을 만드세요',
  w: 560,
  h: 660,
}

const LS_KEY = 'sry:tool:mystery-crime-scene'

// ── 슬롯 풀(전부 자작·풍부) ──────────────────────────────────────────────
// 단일 선택 슬롯: place / time / body / strange
// 다중 선택 슬롯: trace(흔적 2~3개) — 조합수를 크게 키운다.
const PLACES = [
  '잠긴 서재', '눈 내리는 별장', '폐업한 수영장', '낡은 등대 꼭대기', '안개 낀 부둣가 창고',
  '한밤의 대학 해부학 실습실', '고급 호텔 1207호', '엘리베이터가 멈춘 사옥 23층', '버려진 정신병원 병동',
  '강이 내려다보이는 전망대', '문 잠긴 분장실', '폭설로 고립된 산장', '지하 와인 저장고', '온실 한가운데',
  '오래된 극장 무대 뒤', '정전된 아파트 비상계단', '회원제 사교 클럽 흡연실', '폐선된 야간열차 침대칸',
  '바닷가 절벽 위 별장 테라스', '연구소 냉동 보관실', '교회 종탑 아래', '미술관 폐관 직후 전시실',
  '눈이 쌓인 골프장 그린', '강변 보트하우스', '회전문이 멈춘 백화점 새벽 매장', '관측소 돔 안',
  '리모델링 중인 수도원 식당', '24시 무인 빨래방', '저택 지하 사격 연습장', '범람 직전의 댐 관리실',
]

const TIMES = [
  '동트기 직전, 잿빛 박명 속', '한밤중 정각을 알리는 종소리와 함께', '폭우가 쏟아지던 자정 무렵',
  '안개가 가장 짙던 새벽 4시', '정전된 채로 끊긴 밤', '눈보라가 모든 발자국을 지우던 시각',
  '만조가 부두를 삼키던 늦은 밤', '연회가 파한 직후 새벽', '첫차가 끊기고 막차도 떠난 사이',
  '천둥이 조명을 대신하던 밤', '보름달이 유난히 밝던 밤', '해무가 등대를 가리던 이른 아침',
  '한파주의보가 내린 한겨울 새벽', '단전 점검으로 모두가 자리를 비운 틈', '축제 불꽃이 터지던 소란 속',
  '시계가 일제히 멈춘 듯 고요한 새벽', '장맛비가 사흘째 이어지던 밤', '개기월식이 하늘을 지우던 밤',
]

const BODIES = [
  '두 손을 가지런히 모은 채 잠든 듯 누워 있다', '의자에 단정히 앉은 채로 차갑게 식어 있다',
  '계단 아래 부자연스러운 각도로 쓰러져 있다', '욕조에 옷을 입은 채 잠겨 있다',
  '창밖을 향해 무언가를 가리키듯 손을 뻗고 있다', '문을 안에서 막으려다 그대로 굳어 있다',
  '바닥의 분필 자국 정중앙에 정확히 놓여 있다', '얼굴만 천으로 덮인 채 발견되었다',
  '실종 신고된 지 사흘 만에 전혀 다른 옷차림으로 나타났다', '손에 쥔 무언가를 끝내 놓지 않았다',
  '거울을 마주 본 채, 거울에는 입김 자국이 남아 있다', '눈을 뜬 채 천장의 한 점을 응시하고 있다',
  '체온이 아직 가시지 않은 듯 보였으나 사후 경직은 한참 진행돼 있었다',
  '두 사람분의 의자가 있는데 자리는 하나만 채워져 있다', '신발이 좌우 다른 짝으로 신겨져 있다',
  '입가에 옅은 미소가 굳어 있어 발견자를 더 오싹하게 했다', '온몸이 젖었는데 주변 바닥은 바싹 말라 있다',
  '단정한 정장 차림인데 맨발이다', '시계만 거꾸로 찬 채 발견되었다',
]

const TRACES = [
  '바닥에 절반만 남은 핏빛 손바닥 자국', '식어버린 찻잔 두 개, 입술 자국은 한쪽뿐',
  '한 글자만 지워진 유서 비슷한 메모', '되감긴 채 멈춘 카세트테이프', '주인을 알 수 없는 한쪽 장갑',
  '깨진 손목시계, 바늘은 11시 7분에 멈춰 있다', '문고리에 걸린 낯선 향수 냄새',
  '재떨이에 같은 담배 세 개비, 모두 끝까지 타지 않았다', '바닥에 떨어진 단추 하나, 옷에는 빈 자리가 없다',
  '창틀 안쪽에만 긁힌 자국', '거울에 입김으로 쓴 흐릿한 숫자', '뒤집힌 액자, 사진 속 한 사람만 오려져 있다',
  '문 밑으로 밀어 넣은 듯한 젖은 발자국', '식탁 위 식기는 셋, 의자는 둘',
  '서랍 속 빼곡한 신문 스크랩, 날짜는 모두 같은 하루', '향초가 끝까지 타지 않고 한가운데서 꺼져 있다',
  '바닥에 흩뿌려진 소금, 일정한 간격으로', '벽시계만 5분 빠르게 맞춰져 있다',
  '커튼 안쪽에 묻은 흙, 바깥은 포장도로뿐', '읽다 만 책이 엎어진 채, 갈피는 빈 페이지에 끼워져 있다',
  '전화기 수화기가 내려진 채 통화 연결음만 울리고 있다', '바닥 카펫 한 귀퉁이만 최근에 빨아낸 흔적',
  '재떨이 옆 성냥은 단 한 개비도 쓰이지 않았다', '문틈으로 새어든 모래, 가장 가까운 해변은 차로 두 시간 거리',
  '깨끗이 닦인 칼 한 자루가 식기 건조대에 거꾸로 꽂혀 있다',
]

const STRANGES = [
  '문은 안에서 잠겨 있었고 열쇠는 안주머니에 있었다', '창문에는 사흘 치 먼지가 그대로 쌓여 있다',
  '실내 온도가 한여름인데도 얼음처럼 차다', '시계는 모두 같은 시각에 멈춰 있다',
  '발견자만이 비밀번호를 알고 있었다고 한다', '피해자는 그 시각 다른 도시에서 목격되었다',
  '집 안의 모든 거울이 천으로 덮여 있다', '바닥에는 한 사람분 발자국만, 그것도 들어온 흔적뿐 나간 흔적이 없다',
  '죽은 자의 휴대폰에는 자기 자신에게 건 부재중 전화가 찍혀 있다', '방 안의 식물만 하룻밤 새 모두 시들었다',
  '벽에 걸린 달력은 십 년 전 그날에 멈춰 있다', 'CCTV는 정확히 그 시간만 30초 비어 있다',
  '피해자의 일기는 사건 다음 날까지 적혀 있다', '집 안 모든 전구가 동시에, 같은 방향으로 깨져 있다',
  '문 앞 우편함에는 오늘 날짜의 신문이 두 부 꽂혀 있다', '방 안에서 바깥 빗소리가 들리는데 창밖은 맑다',
  '같은 곡이 끝없이 반복 재생되고 있었고, 아무도 그 노래를 모른다', '피해자의 신발만 현관 바깥을 향해 가지런하다',
  '벽지 한 면만 새것으로 발라져 있고 그 자리에서만 희미한 약 냄새가 난다', '집 안 어디에도 그 사람의 사진이 남아 있지 않다',
  '난방은 꺼져 있는데 유리창에만 안쪽으로 성에가 끼어 있다', '방문은 잠겼지만 안쪽에 열쇠 구멍이 없다',
  '바닥의 분필선은 피해자가 직접 그린 듯 필체가 일치한다', '죽기 직전 검색 기록의 마지막 질문은 "지금 몇 시인가요"였다',
]

// 한 번에 뽑을 흔적 개수(2 또는 3) — 다중 슬롯으로 조합수를 크게 키운다.
const TRACE_MIN = 2
const TRACE_MAX = 3

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 흔적 n개를 중복 없이 뽑는다.
function pickTraces(): string[] {
  const n = TRACE_MIN + Math.floor(Math.random() * (TRACE_MAX - TRACE_MIN + 1))
  const pool = TRACES.slice()
  const out: string[] = []
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool[idx])
    pool.splice(idx, 1)
  }
  return out
}

// nCk 조합수
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수(개략): 장소×시간×시신×이상한점×(흔적 2개 조합 + 흔적 3개 조합)
function totalCombos(): number {
  const traceCombos = choose(TRACES.length, 2) + choose(TRACES.length, 3)
  return PLACES.length * TIMES.length * BODIES.length * STRANGES.length * traceCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'time' | 'body' | 'trace' | 'strange'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '장소', icon: '📍' },
  { key: 'time', label: '시간·정황', icon: '🕯️' },
  { key: 'body', label: '시신(피해자) 상태', icon: '🩸' },
  { key: 'trace', label: '남겨진 흔적', icon: '🔍' },
  { key: 'strange', label: '이상한 점', icon: '❓' },
]

interface Scene {
  place: string
  time: string
  body: string
  trace: string[]
  strange: string
}

function buildScene(): Scene {
  return {
    place: pick(PLACES),
    time: pick(TIMES),
    body: pick(BODIES),
    trace: pickTraces(),
    strange: pick(STRANGES),
  }
}

// 현장 묘사 한 단락으로 엮기
function compose(s: Scene): string {
  const traceText = s.trace.map((t) => `‘${t}’`).join(', ')
  return (
    `${s.place}. ${s.time}, 피해자는 ${s.body}. ` +
    `현장에는 ${traceText}이(가) 남아 있었다. ` +
    `무엇보다 이상한 것은 — ${s.strange}.`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface Persist { scene: Scene | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedScene[] }
interface SavedScene { id: string; scene: Scene; note: string }

function isScene(x: any): x is Scene {
  return x && typeof x.place === 'string' && typeof x.time === 'string' &&
    typeof x.body === 'string' && typeof x.strange === 'string' && Array.isArray(x.trace)
}

function load(): Persist {
  const fallback: Persist = { scene: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const scene = isScene(p?.scene) ? p.scene : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedScene[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isScene(x.scene))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), scene: x.scene, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { scene, locks, saved }
  } catch {
    return fallback
  }
}

export default function MysteryCrimeScene({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [scene, setScene] = useState<Scene | null>(initial.current.scene)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedScene[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scene, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [scene, locks, saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 생성: 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const generate = useCallback(() => {
    setCopied(false)
    setScene((prev) => {
      const fresh = buildScene()
      if (!prev) return fresh
      const next: Scene = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.time) next.time = prev.time
      if (locks.body) next.body = prev.body
      if (locks.trace) next.trace = prev.trace
      if (locks.strange) next.strange = prev.strange
      return next
    })
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!scene) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  const slotValue = (k: SlotKey): string => {
    if (!scene) return ''
    if (k === 'trace') return scene.trace.join(' · ')
    return scene[k] as string
  }

  const fullText = scene ? compose(scene) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!scene || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveScene = () => {
    if (!scene) return
    setSaved((prev) => [{ id: rid(), scene, note: '' }, ...prev])
    flashToast('현장을 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedScene) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedScene) => { setScene(s.scene); setLocks({}); setCopied(false); flashToast('현장을 불러왔어요') }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (sc: Scene, note?: string) => {
    const sensory = [
      `시간·정황: ${sc.time}`,
      `시신 상태: ${sc.body}`,
      `남겨진 흔적: ${sc.trace.join(' / ')}`,
      `이상한 점: ${sc.strange}`,
    ].join('\n')
    addToLibrary('places', {
      name: sc.place,
      kind: '범행 현장',
      mood: '불길·긴장',
      sensory,
      notes: note || compose(sc),
      source: '범행 현장 생성기',
      fields: {
        name: sc.place,
        kind: '범행 현장',
        atmosphere: '불길·긴장',
        sensory,
        secrets: sc.strange,
        notes: note || compose(sc),
      },
    })
    flashToast(`장소 ‘${sc.place}’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 프로젝트(설정 카드) ──
  const linked = hasProjectBridge()
  const toProject = (sc: Scene, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>📍 장소:</b> ${esc(sc.place)}</p>`,
      `<p><b>🕯️ 시간·정황:</b> ${esc(sc.time)}</p>`,
      `<p><b>🩸 시신(피해자) 상태:</b> ${esc(sc.body)}</p>`,
      `<p><b>🔍 남겨진 흔적:</b></p><ul>${sc.trace.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`,
      `<p><b>❓ 이상한 점:</b> ${esc(sc.strange)}</p>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(sc))}</p>`,
    ].filter(Boolean).join('')
    const sceneSensory = [
      `시간·정황: ${sc.time}`,
      `시신 상태: ${sc.body}`,
      `남겨진 흔적: ${sc.trace.join(' / ')}`,
      `이상한 점: ${sc.strange}`,
    ].join('\n')
    const character: Record<string, any> = {
      name: sc.place,
      type: '범행 현장',
      mood: '불길·긴장',
      time: sc.time,
      victim: sc.body,
      clues: sc.trace.join(' / '),
      anomaly: sc.strange,
      fields: {
        name: sc.place,
        kind: '범행 현장',
        atmosphere: '불길·긴장',
        sensory: sceneSensory,
        secrets: sc.strange,
        notes: note || compose(sc),
      },
    }
    if (note) character.notes = note
    const id = addToProject({
      kind: 'setting',
      folder: '장소',
      title: `현장 · ${sc.place}`,
      bodyHtml,
      character,
      meta: { 유형: '범행 현장', 출처: '범행 현장 생성기' },
    })
    flashToast(id ? `‘${sc.place}’ 현장을 프로젝트(장소)에 추가했어요` : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'plot-twist-deck', icon: '🃏', label: '반전 카드' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
  ]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const intro: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={intro}>
        <b>장소·시간·시신 상태·흔적·이상한 점</b>을 무작위로 엮어 하나의 <b>범행 현장</b>을 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭"/> 맥락: {ctxGenre}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '현장 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅"/> {toast}
        </div>
      )}

      <div style={body}>
        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((sl) => {
            const isLocked = !!locks[sl.key]
            const val = slotValue(sl.key)
            const dim = rolling && !isLocked
            return (
              <div key={sl.key} style={{ ...slotCard, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {sl.key === 'trace' && scene && scene.trace.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.45, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {scene.trace.map((t, i) => <li key={i}>{dim ? '…' : t}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, overflowWrap: 'anywhere', color: val ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {val ? (dim ? '…' : val) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(sl.key)}
                  title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            )
          })}
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🩸"/> 현장 묘사 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: scene ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈현장 생성〉을 눌러 현장을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!scene}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveScene} disabled={!scene}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => scene && toLibrary(scene)} disabled={!scene} title="이 현장의 장소를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button
            className="linkbtn"
            onClick={() => scene && toProject(scene)}
            disabled={!scene || !linked}
            title={linked ? '이 현장을 프로젝트 설정(장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 현장 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 현장이 없습니다. ☆로 마음에 드는 현장을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="📍"/> {s.scene.place}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{compose(s.scene)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (단서·용의자 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {s.note}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 현장을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toLibrary(s.scene, s.note || undefined)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toProject(s.scene, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트(장소)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : undefined)} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 현장은 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
