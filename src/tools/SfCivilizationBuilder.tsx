// 외계 문명·종족 빌더 (SF·과학소설 / 배경) — 작품 속 외계 문명·종족을 카드로 설계하는 도구.
//  좌측: 문명 목록(선택·검색·추가·삭제). 우측: 선택 문명 편집.
//  입력 축: 기본/문명 단계(카르다쇼프 등)/가치관/생물학/기술/언어/종교·신화/인류와의 외교.
//  각 섹션에 "설계 질문"을 두어 빈칸을 메우도록 유도하고, 슬롯 풀에서 무작위 영감(잠금/재생성)도 제공.
//  모든 데이터는 localStorage('sry:tool:sf-civilization-builder')에 JSON 자동 저장/복원.
//  연계: addToProject(folder:'세계관' → 하위 '문명' 폴더 느낌의 setting 카드), hasProjectBridge, openToolLinked.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'sf-civilization-builder',
  name: '외계 문명 빌더',
  icon: '🛸',
  group: '배경',
  genre: 'SF·과학소설',
  intro: '외계 문명·종족의 단계·생물학·기술·언어·외교를 설계하는 빌더',
  w: 760,
  h: 640,
}

const LS_KEY = 'sry:tool:sf-civilization-builder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ────────────────────────── 무작위 영감 슬롯 풀 ──────────────────────────
// 각 풀은 자작 데이터. 조합수 = 모든 풀 길이의 곱(아래 표시) → 수억 이상.
const POOLS = {
  형태: ['결정질 규소체', '곤충형 군체', '연체 부유체', '광합성 식물형', '기체 부유 군집', '심해 압력 적응체', '방사형 대칭 생물', '에너지 패턴 생명', '암석 표피 거인', '미생물 집단지성', '날개 달린 파충형', '반금속 합성체', '점액 변형체', '복안 절지형', '발광 심해체', '균사 연결망 생물', '갑각 다족 보행체', '플라스마 응집 생명'],
  감각: ['자기장 감지', '적외선 시각', '초음파 반향정위', '전기 수용 기관', '화학 신호 후각', '편광 인식', '중력 변화 감지', '시간 흐름 직관', '전파 청취 기관', '진동 피부 감각', '냄새로 기억 저장', '자외선 무늬 시각', '기압 변화 감지', '방사선 강도 감각'],
  통신: ['색소 패턴 발광', '페로몬 화합물', '전자기 펄스', '진동·드럼 언어', '음파 화음 합창', '직접 신경 접속', '향기 문자', '몸짓·자세 기호', '발광 점멸 코드', '집단 동조 사고', '온도 변화 신호', '결정 진동 공명'],
  사회: ['벌집형 단일여왕제', '유랑 함대 연합', '장로 합의제', 'AI 통치 평의회', '경쟁 씨족 연맹', '계급 없는 망 사회', '신정 단일체', '기억 공유 집단정신', '세대선 자치체', '능력주의 시험관료제', '가문 카르텔', '무정부 자율공동체', '순환 윤번 의회제'],
  기술: ['항성 다이슨 군집', '웜홀 항법', '의식 업로드', '나노 자가복제 기계', '반물질 추진', '시간 지연 통신', '행성 테라포밍', '유전자 재설계', '중력 제어장', '양자 의식 네트워크', '생체 함선', '차원 접이 기술', '항성 에너지 수확', '기억 직조 기술', '암흑물질 동력장', '항성풍 돛 항법'],
  가치: ['균형과 순환의 숭배', '확장과 정복', '지식의 무한 축적', '개체 소멸 거부(불멸 추구)', '조화로운 공생', '효율 지상주의', '예술적 변용', '침묵과 관조', '경쟁을 통한 진화', '집단 생존 최우선', '과거 보존의 의무', '미지를 향한 순례', '고통 없는 안식 추구'],
  종교: ['죽은 별을 섬기는 신앙', '조상 의식의 클라우드', '확률과 우연의 신', '거대 모성생물 숭배', '소멸을 축복으로 보는 교리', '코드화된 예언 기계', '다중우주 환생론', '침묵하는 창조주 신화', '에너지 합일 의식', '무신론적 이성 숭배', '별빛 순례 종교', '시간 역행 구원론', '공허를 경배하는 무(無)교단'],
  위협: ['항성의 적색거성화', '내부 의식 분열', '자원 고갈 위기', '포식 종족의 침공', '기계 반란', '유전적 정체', '차원 균열 누수', '집단 기억 부패', '항성간 역병', '문명 정체(대정체기)', '하급 종족 봉기', '시간 역설 오염'],
  외교: ['우호적 교역 제안', '경계하는 관찰자', '냉담한 무관심', '은밀한 잠입 침투', '전면적 적대', '동맹 가능성 타진', '문화 교류 사절', '기술 거래 흥정', '인류를 시험하는 중', '오해에서 비롯된 긴장', '구원자 자처', '인류를 자원으로 봄'],
} as const
type PoolKey = keyof typeof POOLS

// 조합수: 모든 풀 길이의 곱
const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

function fmtBig(n: number): string {
  // 한국어 단위(억/조)로 가독성 표기
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString('ko-KR')
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ────────────────────────── 선택지/질문 데이터 ──────────────────────────
// 카르다쇼프 척도 + 사회 발전 단계
const TIERS = [
  { v: '0형 (전행성)', d: '단일 행성의 일부 자원만 사용. 화석연료·초기 핵분열 수준.' },
  { v: 'I형 (행성문명)', d: '모행성의 모든 에너지를 통제. 기후·지질을 조절한다.' },
  { v: 'II형 (항성문명)', d: '항성 전체 에너지를 수확(다이슨 구·항성 채굴).' },
  { v: 'III형 (은하문명)', d: '은하 규모의 에너지를 다룬다. 항성간 제국.' },
  { v: 'IV형 (초은하)', d: '은하단·우주 규모. 물리법칙에 개입 가능.' },
  { v: '후기 특이점', d: '척도를 벗어난 초월 지성. 측정 불가.' },
] as const

const STAGES = ['수렵·채집', '농경·정착', '산업화', '정보화', '우주 진출 초기', '항성계 정착', '항성간 확장', '쇠퇴·붕괴기', '재건·부흥기'] as const

const HABITATS = ['지구형 행성', '슈퍼지구', '가스 행성 위성', '소행성대 거주지', '궤도 정거장 군집', '세대우주선', '심해 행성', '용암 행성', '동결 행성', '암흑성운 내부', '쌍성계 행성', '인공 고리세계'] as const

// 섹션별 설계 질문(빈칸 유도)
const QUESTIONS: Record<string, string[]> = {
  생물학: [
    '이 종족은 무엇을 먹고 어떻게 에너지를 얻는가?',
    '번식·세대 교체 방식은? 수명은 얼마나 되는가?',
    '인간이 보기에 가장 이질적인 신체 특징은?',
    '환경(중력·대기·온도)이 신체를 어떻게 빚었는가?',
  ],
  기술: [
    '이들의 기술은 무엇을 가능하게 하고, 무엇을 못 하는가?',
    '에너지원은 무엇인가? 그 한계는?',
    '인류보다 압도적으로 앞선 분야와 의외로 뒤처진 분야는?',
    '기술이 그들의 도덕·사회를 어떻게 바꿔 놓았는가?',
  ],
  언어: [
    '소리·빛·화학 중 무엇으로 의미를 전달하는가?',
    '인간이 이 언어를 배우는 게 가능한가? 왜?',
    '번역 불가능한 핵심 개념이 하나 있다면?',
    '글(기록)은 어떤 형태로 남기는가?',
  ],
  '종교·신화': [
    '이들이 두려워하거나 숭배하는 대상은?',
    '죽음·소멸을 어떻게 받아들이는가?',
    '창조 신화의 핵심 한 줄은?',
    '신앙이 그들의 정치·전쟁을 어떻게 정당화하는가?',
  ],
  '인류와의 외교': [
    '인류를 처음 어떻게 인식했는가(위협·자원·동료·무관심)?',
    '첫 접촉(퍼스트 콘택트)은 누가, 어떻게 시작했는가?',
    '서로 절대 양보할 수 없는 한 가지는?',
    '오해가 전쟁이 된다면 그 불씨는 무엇인가?',
  ],
  가치관: [
    '이 문명이 가장 신성하게 여기는 한 가지는?',
    '가장 큰 금기(절대 하지 않는 일)는?',
    '개인과 집단 중 무엇이 우선하는가?',
    '그들의 "진보"란 무엇을 향한 것인가?',
  ],
}

// ────────────────────────── 데이터 모델 ──────────────────────────
interface Civ {
  id: string
  name: string          // 문명·종족 이름
  epithet: string       // 별칭·통칭 (예: "심연의 합창단")
  tier: string          // 카르다쇼프 단계
  stage: string         // 사회 발전 단계
  habitat: string       // 거주 환경
  biology: string       // 생물학
  values: string        // 가치관
  tech: string          // 기술
  language: string      // 언어
  religion: string      // 종교·신화
  diplomacy: string     // 인류와의 외교
  threat: string        // 위협·약점
  notes: string         // 자유 메모
  updatedAt: number
}

function makeCiv(name = ''): Civ {
  return {
    id: newId(),
    name,
    epithet: '',
    tier: TIERS[0].v,
    stage: STAGES[0],
    habitat: HABITATS[0],
    biology: '',
    values: '',
    tech: '',
    language: '',
    religion: '',
    diplomacy: '',
    threat: '',
    notes: '',
    updatedAt: Date.now(),
  }
}

function load(): { civs: Civ[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { civs: [], activeId: null }
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.civs)) return { civs: [], activeId: null }
    const civs: Civ[] = p.civs
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({ ...makeCiv(), ...c, id: String(c.id || newId()) }))
    const ids = new Set(civs.map((c) => c.id))
    const activeId = typeof p.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (civs[0]?.id ?? null)
    return { civs, activeId }
  } catch {
    return { civs: [], activeId: null }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// ────────────────────────── 컴포넌트 ──────────────────────────
export default function SfCivilizationBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState(() => load())
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  // 사용자 정의 항목(라벨+값) + 고정 '기타' 자유 입력 — 무작위 생성 데이터 없음, 사용자가 직접 작성.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  // 영감 슬롯: 현재 굴린 값 + 잠금
  const [slots, setSlots] = useState<Record<PoolKey, string>>(() => {
    const o = {} as Record<PoolKey, string>
    ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { o[k] = pick(POOLS[k]) })
    return o
  })
  const [locks, setLocks] = useState<Record<PoolKey, boolean>>(() => {
    const o = {} as Record<PoolKey, boolean>
    ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { o[k] = false })
    return o
  })

  const mounted = useRef(true)
  const noteTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침 시 사라질 수 있어요.') }
  }, [store])

  // payload 로 이름·환경 등 초안 받기(연계 진입). 최초 1회만.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const nm = typeof payload.name === 'string' ? payload.name : (typeof payload.title === 'string' ? payload.title : '')
    if (nm) {
      const c = makeCiv(nm.trim())
      setStore((s) => ({ civs: [c, ...s.civs], activeId: c.id }))
    }
  }, [payload])

  const { civs, activeId } = store
  const active = civs.find((c) => c.id === activeId) || null

  function flash(msg: string, ms = 4000) {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, ms)
  }

  const filtered = civs.filter((c) => {
    const q = norm(query)
    if (!q) return true
    return norm(c.name).includes(q) || norm(c.epithet).includes(q) || norm(c.tier).includes(q) || norm(c.habitat).includes(q)
  })

  const setActive = (id: string | null) => { setConfirmDel(null); setStore((s) => ({ ...s, activeId: id })) }

  // 새 문명/무작위 생성 시: 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지, 기타도 비움.
  const resetCustomValues = () => {
    setCustom((arr) => arr.map((it) => ({ ...it, value: '' })))
    setEtc('')
  }

  const onNew = () => {
    const c = makeCiv(`새 문명 ${civs.length + 1}`)
    resetCustomValues()
    setStore((s) => ({ civs: [c, ...s.civs], activeId: c.id }))
  }

  const patch = (p: Partial<Civ>) => {
    if (!active) return
    setStore((s) => ({
      ...s,
      civs: s.civs.map((c) => (c.id === active.id ? { ...c, ...p, updatedAt: Date.now() } : c)),
    }))
  }

  const removeCiv = (id: string) => {
    setStore((s) => {
      const idx = s.civs.findIndex((c) => c.id === id)
      const next = s.civs.filter((c) => c.id !== id)
      let nextActive = s.activeId
      if (s.activeId === id) nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null
      return { civs: next, activeId: nextActive }
    })
    setConfirmDel(null)
  }

  // 영감 재생성: 잠그지 않은 슬롯만 새로 굴린다.
  const roll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { if (!locks[k]) next[k] = pick(POOLS[k]) })
      return next
    })
  }
  const toggleLock = (k: PoolKey) => setLocks((l) => ({ ...l, [k]: !l[k] }))

  // 영감 슬롯 → 새 문명 초안으로 적용(빈 칸을 채운 새 문명 생성)
  const applyInspiration = () => {
    const c = makeCiv(`새 문명 ${civs.length + 1}`)
    c.epithet = slots.사회
    c.biology = `형태: ${slots.형태}. 감각: ${slots.감각}.`
    c.values = slots.가치
    c.tech = `대표 기술: ${slots.기술}.`
    c.language = `통신 방식: ${slots.통신}.`
    c.religion = slots.종교
    c.diplomacy = `인류에 대한 태도: ${slots.외교}.`
    c.threat = slots.위협
    resetCustomValues()
    setStore((s) => ({ civs: [c, ...s.civs], activeId: c.id }))
    flash('영감 슬롯으로 새 문명 초안을 만들었어요. 질문에 답하며 채워 보세요.')
  }

  // 단일 슬롯 → 현재 문명의 해당 필드에 덧붙이기
  const appendSlotToActive = (k: PoolKey) => {
    if (!active) { flash('먼저 문명을 선택하거나 만들어 주세요.'); return }
    const map: Partial<Record<PoolKey, keyof Civ>> = {
      형태: 'biology', 감각: 'biology', 통신: 'language', 사회: 'epithet',
      기술: 'tech', 가치: 'values', 종교: 'religion', 위협: 'threat', 외교: 'diplomacy',
    }
    const field = map[k]
    if (!field) return
    const cur = String((active as any)[field] || '')
    const add = slots[k]
    const val = cur ? `${cur}${field === 'epithet' ? ' / ' : '\n'}${add}` : add
    patch({ [field]: val } as Partial<Civ>)
    flash(`‘${k}: ${add}’ 를 현재 문명에 반영했어요.`)
  }

  // ── 사용자 정의 항목 ──
  const addCustomItem = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 식문화, 군사 교리, 음악)')
    if (label == null) return
    const trimmed = label.trim()
    if (!trimmed) return
    setCustom((arr) => [...arr, { id: newId(), label: trimmed, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((arr) => arr.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustomItem = (id: string) =>
    setCustom((arr) => arr.filter((it) => it.id !== id))

  function buildText(c: Civ): string {
    const lines = [
      `# ${c.name || '이름 없는 문명'}${c.epithet ? ` — ${c.epithet}` : ''}`,
      '',
      `· 문명 단계: ${c.tier}`,
      `· 발전 단계: ${c.stage}`,
      `· 거주 환경: ${c.habitat}`,
      '',
    ]
    const sec = (t: string, v: string) => { if (v.trim()) { lines.push(`## ${t}`, v.trim(), '') } }
    sec('생물학', c.biology)
    sec('가치관', c.values)
    sec('기술', c.tech)
    sec('언어', c.language)
    sec('종교·신화', c.religion)
    sec('인류와의 외교', c.diplomacy)
    sec('위협·약점', c.threat)
    sec('메모', c.notes)
    // 사용자 정의 항목 + 기타(값 있을 때만)
    custom.forEach((it) => { if (it.label.trim() && it.value.trim()) sec(it.label.trim(), it.value) })
    sec('기타', etc)
    return lines.join('\n').trim()
  }

  function buildHtml(c: Civ): string {
    const p: string[] = []
    p.push(`<p><strong>문명 단계</strong>: ${esc(c.tier)}<br>`)
    p.push(`<strong>발전 단계</strong>: ${esc(c.stage)}<br>`)
    p.push(`<strong>거주 환경</strong>: ${esc(c.habitat)}</p>`)
    const sec = (t: string, v: string) => {
      if (!v.trim()) return
      p.push(`<h3>${esc(t)}</h3><p>${esc(v.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    sec('생물학', c.biology)
    sec('가치관', c.values)
    sec('기술', c.tech)
    sec('언어', c.language)
    sec('종교·신화', c.religion)
    sec('인류와의 외교', c.diplomacy)
    sec('위협·약점', c.threat)
    sec('메모', c.notes)
    custom.forEach((it) => { if (it.label.trim() && it.value.trim()) sec(it.label.trim(), it.value) })
    sec('기타', etc)
    return p.join('\n')
  }

  const copyActive = () => {
    if (!active) return
    const text = buildText(active)
    const done = () => {
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback)
      else fallback()
    } catch { fallback() }
    function fallback() {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        done()
      } catch {}
    }
  }

  // 프로젝트 자료(세계관)에 setting 카드로 추가. 본문엔 전체 서술, character 필드엔 핵심 요약.
  const toProject = () => {
    if (!active) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const title = (active.name || '이름 없는 문명').trim()
    // 사용자 정의 항목(값 있는 것만) + 기타(값 있을 때만)를 character 맵에 평면으로 추가(additive).
    const customFields: Record<string, string> = {}
    custom.forEach((it) => { const k = it.label.trim(); if (k && it.value.trim()) customFields[k] = it.value.trim() })
    if (etc.trim()) customFields.etc = etc.trim()
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '세계관',
      title,
      icon: '🛸',
      synopsis: active.epithet || `${active.tier} · ${active.habitat}`,
      bodyHtml: buildHtml(active),
      character: {
        name: title,
        별칭: active.epithet,
        문명단계: active.tier,
        발전단계: active.stage,
        거주환경: active.habitat,
        생물학: active.biology,
        가치관: active.values,
        기술: active.tech,
        언어: active.language,
        '종교·신화': active.religion,
        '인류와의 외교': active.diplomacy,
        '위협·약점': active.threat,
        // 표준(정규) 장소 키 — 받는 허브(배경 설정집)에서 제자리 기본 칸에 들어가도록 추가(additive).
        // character 페이로드는 Record<string,string> 이므로 정규 키를 평면으로 함께 싣는다.
        kind: '외계 문명',
        atmosphere: active.epithet,
        inhabitants: active.biology,
        geography: active.habitat,
        history: [active.tier, active.stage].filter((v) => String(v).trim()).join(' · '),
        culture: [
          active.values && `가치관: ${active.values}`,
          active.language && `언어: ${active.language}`,
          active.religion && `종교·신화: ${active.religion}`,
        ].filter(Boolean).join('\n\n'),
        rules: active.tech,
        dangers: active.threat,
        secrets: active.diplomacy,
        notes: active.notes,
        source: meta.id,
        ...customFields,
      },
      meta: { 유형: '외계 문명', 단계: active.tier, 환경: active.habitat },
    })
    if (!mounted.current) return
    flash(id ? `‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 카드로 추가했어요. (바인더·DB 확인)` : '프로젝트에 추가하지 못했어요.')
  }

  // ────────────────────────── 스타일 ──────────────────────────
  const C: Record<string, React.CSSProperties> = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
    title: { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 },
    spacer: { flex: 1 },
    note: { fontSize: 12, color: 'var(--accent)', padding: '6px 14px', flexShrink: 0, lineHeight: 1.5 },
    main: { flex: 1, minHeight: 0, display: 'flex' },
    side: { width: 230, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' },
    sideHead: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 },
    search: { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' },
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 },
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 11px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    textarea: { width: '100%', minHeight: 70, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
    section: { border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--chrome-2)' },
    secTitle: { fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 },
    q: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0, paddingLeft: 14, position: 'relative' },
    qWrap: { display: 'flex', flexDirection: 'column', gap: 3, padding: '6px 8px', borderRadius: 7, background: 'var(--paper)', border: '1px dashed var(--border)' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 },
    editBar: { display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' },
    slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 },
  }

  const slotCardStyle = (locked: boolean): React.CSSProperties => ({
    border: '1px solid ' + (locked ? 'var(--accent)' : 'var(--border)'),
    borderRadius: 9, padding: '8px 10px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer',
  })

  const itemStyle = (c: Civ): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 8,
    border: '1px solid ' + (c.id === activeId ? 'var(--accent)' : 'transparent'),
    background: c.id === activeId ? 'var(--paper)' : 'transparent',
    color: 'var(--text)', cursor: 'pointer', fontSize: 13.5, lineHeight: 1.35,
    display: 'flex', flexDirection: 'column', gap: 2,
  })

  // 텍스트영역 + 질문 묶음
  const Field = (props: { secKey: string; field: keyof Civ; placeholder: string }) => {
    if (!active) return null
    const qs = QUESTIONS[props.secKey] || []
    return (
      <div style={C.section}>
        <div style={C.secTitle}><span aria-hidden>{SEC_ICON[props.secKey] ? <Emoji e={SEC_ICON[props.secKey]} /> : '•'}</span> {props.secKey}</div>
        {qs.length > 0 && (
          <div style={C.qWrap}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>설계 질문</span>
            {qs.map((q, i) => (
              <div key={i} style={C.q}><span style={{ position: 'absolute', left: 0 }} aria-hidden>›</span>{q}</div>
            ))}
          </div>
        )}
        <textarea
          style={C.textarea}
          value={String((active as any)[props.field] || '')}
          onChange={(e) => patch({ [props.field]: e.target.value } as Partial<Civ>)}
          placeholder={props.placeholder}
          aria-label={props.secKey}
        />
      </div>
    )
  }

  const SEC_ICON: Record<string, string> = {
    생물학: '🧬', 가치관: '⚖️', 기술: '⚙️', 언어: '🗣️', '종교·신화': '🌌', '인류와의 외교': '🤝',
  }

  return (
    <div style={C.wrap}>
      <div style={C.topbar}>
        <div style={C.title}><span aria-hidden><Emoji e="🛸" /></span> 외계 문명 빌더</div>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{civs.length}개 문명</span>
        <button className="minibtn" onClick={() => openToolLinked('world-wiki')} title="세계관 위키 열기"><Emoji e="📚" /> 위키</button>
        <button className="btn-primary" onClick={onNew}>+ 새 문명</button>
      </div>

      {note && <div style={C.note}>{note}</div>}

      <div style={C.main}>
        {/* 좌측: 목록 + 검색 */}
        <div style={C.side}>
          <div style={C.sideHead}>
            <input style={C.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="문명 검색…" aria-label="문명 검색" />
          </div>
          <div style={C.list}>
            {civs.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6, padding: 10, textAlign: 'center' }}>
                아직 문명이 없어요.<br />‘+ 새 문명’ 또는 아래 영감으로 시작하세요.
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 10, textAlign: 'center' }}>‘{query}’에 맞는 문명이 없어요.</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  style={itemStyle(c)}
                  onClick={() => setActive(c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(c.id) } }}
                  title={c.name}
                >
                  <span style={{ fontWeight: c.id === activeId ? 700 : 500, wordBreak: 'break-word' }}>{c.name || '(이름 없음)'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.epithet || c.tier}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 편집 또는 영감 */}
        <div style={C.content}>
          {!active ? (
            <div style={C.body}>
              <div style={C.empty}>
                <div style={{ fontSize: 34 }} aria-hidden><Emoji e="🪐" /></div>
                <div>
                  외계 문명·종족을 단계·생물학·기술·언어·외교까지 설계해 보세요.<br />
                  ‘+ 새 문명’으로 빈 카드를 만들거나, 아래 <strong style={{ color: 'var(--accent)' }}>영감 생성기</strong>로 초안을 굴려 보세요.
                </div>
                <button className="btn-primary" onClick={onNew}>+ 첫 문명 만들기</button>
              </div>
              {/* 영감 생성기(문명 없을 때도 보이도록) */}
              <Inspiration />
            </div>
          ) : (
            <>
              <div style={C.body}>
                {/* 기본 정보 */}
                <div style={C.row2}>
                  <div>
                    <label style={C.label}>문명·종족 이름</label>
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 졸타니 합창단" maxLength={80} />
                  </div>
                  <div>
                    <label style={C.label}>별칭·통칭</label>
                    <input style={C.input} value={active.epithet} onChange={(e) => patch({ epithet: e.target.value })} placeholder="예: 심연의 노래꾼" maxLength={80} />
                  </div>
                </div>

                <div style={C.row2}>
                  <div>
                    <label style={C.label}>문명 단계 (카르다쇼프)</label>
                    <select style={C.select} value={active.tier} onChange={(e) => patch({ tier: e.target.value })}>
                      {TIERS.map((t) => <option key={t.v} value={t.v}>{t.v}</option>)}
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                      {TIERS.find((t) => t.v === active.tier)?.d}
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>사회 발전 단계</label>
                    <select style={C.select} value={active.stage} onChange={(e) => patch({ stage: e.target.value })}>
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <label style={{ ...C.label, marginTop: 10 }}>거주 환경</label>
                    <select style={C.select} value={active.habitat} onChange={(e) => patch({ habitat: e.target.value })}>
                      {HABITATS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* 서술 섹션 + 질문 */}
                <Field secKey="생물학" field="biology" placeholder="형태, 감각, 섭식, 번식, 수명, 이질적 특징…" />
                <Field secKey="가치관" field="values" placeholder="신성하게 여기는 것, 금기, 진보의 방향…" />
                <Field secKey="기술" field="tech" placeholder="대표 기술, 에너지원, 앞선·뒤처진 분야…" />
                <Field secKey="언어" field="language" placeholder="전달 매체(소리·빛·화학), 번역 불가 개념, 기록 방식…" />
                <Field secKey="종교·신화" field="religion" placeholder="숭배·두려움의 대상, 죽음관, 창조 신화…" />
                <Field secKey="인류와의 외교" field="diplomacy" placeholder="첫 인식, 퍼스트 콘택트, 양보 불가 사항, 전쟁의 불씨…" />

                {/* 위협·메모 (질문 없음) */}
                <div style={C.section}>
                  <div style={C.secTitle}><span aria-hidden><Emoji e="⚠️" /></span> 위협·약점</div>
                  <textarea style={C.textarea} value={active.threat} onChange={(e) => patch({ threat: e.target.value })} placeholder="문명을 흔드는 내·외부 위협, 치명적 약점…" aria-label="위협·약점" />
                </div>
                <div style={C.section}>
                  <div style={C.secTitle}><span aria-hidden><Emoji e="📝" /></span> 자유 메모</div>
                  <textarea style={C.textarea} value={active.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="기타 설정, 아이디어, 줄거리 연결점…" aria-label="자유 메모" />
                </div>

                {/* 사용자 정의 항목 + 고정 기타 */}
                <div style={C.section}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={C.secTitle}><span aria-hidden><Emoji e="🧩" /></span> 사용자 정의 항목</div>
                    <div style={C.spacer} />
                    <button className="minibtn" onClick={addCustomItem} title="원하는 항목을 직접 추가합니다">＋ 항목 추가</button>
                  </div>
                  {custom.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      필요한 항목을 직접 추가해 자유롭게 설계하세요. (예: 식문화, 군사 교리, 음악)
                    </div>
                  ) : (
                    custom.map((it) => (
                      <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ ...C.label, marginBottom: 0, flex: 1, wordBreak: 'break-word' }}>{it.label}</span>
                          <button
                            className="minibtn"
                            style={{ padding: '1px 7px', fontSize: 11 }}
                            onClick={() => removeCustomItem(it.id)}
                            title="이 항목 삭제"
                            aria-label={`${it.label} 항목 삭제`}
                          >✕</button>
                        </div>
                        <textarea
                          style={C.textarea}
                          value={it.value}
                          onChange={(e) => setCustomValue(it.id, e.target.value)}
                          placeholder={`${it.label}을(를) 직접 적어 보세요…`}
                          aria-label={it.label}
                        />
                      </div>
                    ))
                  )}
                </div>

                <div style={C.section}>
                  <div style={C.secTitle}><span aria-hidden><Emoji e="🗂️" /></span> 기타</div>
                  <textarea
                    style={C.textarea}
                    value={etc}
                    onChange={(e) => setEtc(e.target.value)}
                    placeholder="어느 칸에도 들어가지 않는 내용을 자유롭게 적어 두세요…"
                    aria-label="기타"
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>수정 {fmtDate(active.updatedAt)}</div>

                {/* 영감 생성기 */}
                <Inspiration />
              </div>

              <div style={C.editBar}>
                <button className="minibtn" onClick={copyActive}>{copied ? '복사됨 ✓' : '복사'}</button>
                <button
                  className="linkbtn"
                  onClick={toProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '이 문명을 프로젝트 자료(세계관)에 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
                >
                  <Emoji e="📄" /> 프로젝트에 추가
                </button>
                <div style={C.spacer} />
                {confirmDel === active.id ? (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--warn)', marginRight: 4 }}>삭제할까요?</span>
                    <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                    <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeCiv(active.id)}>삭제 확인</button>
                  </>
                ) : (
                  <button className="minibtn" onClick={() => setConfirmDel(active.id)}>삭제</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // 영감 생성기(내부 컴포넌트로 두면 상태가 매 렌더 재생성되어 입력 포커스 문제 발생 가능 →
  // 함수 컴포넌트가 아닌 렌더 헬퍼로 작성)
  function Inspiration() {
    return (
      <div style={{ ...C.section, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={C.secTitle}><span aria-hidden><Emoji e="🎲" /></span> 문명 영감 생성기</div>
          <div style={C.spacer} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합수 약 {fmtBig(COMBO_COUNT)}가지 ({COMBO_COUNT.toLocaleString('ko-KR')})</span>
        </div>
        <div style={C.slotGrid}>
          {(Object.keys(POOLS) as PoolKey[]).map((k) => (
            <div
              key={k}
              style={slotCardStyle(locks[k])}
              onClick={() => toggleLock(k)}
              title={locks[k] ? '잠금 해제(재생성 대상에 포함)' : '잠금(재생성에서 제외)'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLock(k) } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: 11 }} aria-hidden>{locks[k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</span>
                <div style={C.spacer} />
                <button
                  className="minibtn"
                  style={{ padding: '1px 6px', fontSize: 10.5 }}
                  onClick={(e) => { e.stopPropagation(); appendSlotToActive(k) }}
                  title="이 항목을 현재 문명 필드에 반영"
                >＋</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all' }}>{slots[k]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={roll}><Emoji e="🎲" /> 재생성</button>
          <button className="minibtn" onClick={applyInspiration}>이 조합으로 새 문명 만들기</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 눌러 잠그면 재생성에서 제외돼요.</span>
        </div>
      </div>
    )
  }
}
