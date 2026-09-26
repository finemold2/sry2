// 역사·사극 캐릭터 생성기 — 이 장르의 인물 원형 × 신분 × 왕대 × 당파 × 역할 × 동기 × 명분 × 결점 × 비밀 × 관계 × 말투 × 외양 슬롯을
// 무작위 조합(슬롯별 🔒 잠금 + 부분 재생성, 조합수 표시). 인물 시트/인물 라이브러리/프로젝트(자료 › 인물) 연계.
// 자급식: react 와 './linkbus' 외 import 금지. 100% 로컬 자작 데이터(장르 특화). CRUD 는 localStorage('sry:tool:history-charforge').
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'history-charforge', name: '사극 인물 생성기', icon: '🏯', group: '캐릭터', genre: '역사·사극', intro: '조선 사극의 인물 원형·신분·왕대·당파·동기·결점·관계를 조합해 고증감 있는 인물을 생성', w: 600, h: 690 }

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function picks<T>(a: T[], n: number): T[] { const o: T[] = []; const p = [...a]; for (let i = 0; i < n && p.length; i++) o.push(p.splice(ri(p.length), 1)[0]); return o }

// 한국어 조사 헬퍼: 앞 글자 받침 유무로 실제 조사를 골라 출력(괄호 이중표기 노출 금지)
// 끝에 붙은 한자/병기 괄호(예: '대의명분(大義名分)')는 제거하고 한글 음절로 판정
function lastKoreanWord(w: string): string {
  let t = (w || '').trim()
  t = t.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim() // 끝의 (…) 병기 제거
  return t
}
function hasJong(w: string): boolean {
  const t = lastKoreanWord(w)
  const ch = t.charCodeAt(t.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
// 을/를, 이/가, 은/는, 으로/로 (앞 글자가 'ㄹ' 받침이면 '로')
function josa(w: string, kind: '을' | '이' | '은' | '으로'): string {
  const t = (w || '').trim()
  const jong = hasJong(t)
  if (kind === '을') return t + (jong ? '을' : '를')
  if (kind === '이') return t + (jong ? '이' : '가')
  if (kind === '은') return t + (jong ? '은' : '는')
  // '으로' / '로' — 받침이 없거나 'ㄹ' 받침이면 '로'
  const base = lastKoreanWord(t)
  const ch = base.charCodeAt(base.length - 1)
  const isRieul = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 === 8
  return t + (jong && !isRieul ? '으로' : '로')
}

// ── 장르 특화 슬롯 풀 ───────────────────────────────────────────
// 인물 원형(이 장르 특유)
const ARCHETYPE = [
  '회귀·빙의한 현대인', '비운의 폐세자', '입지전적 한미한 무관', '권력의 핵심 외척', '강직한 언관(臺諫)',
  '당파의 영수', '음흉한 간신', '대업을 꿈꾸는 반정 주모자', '서얼 출신 책사', '몰락 양반가의 종손',
  '궁중의 노회한 상궁', '권모술수의 후궁', '명을 받든 암행어사', '저잣거리의 거상(巨商)', '의(義)를 좇는 의적 두령',
  '변방을 지키는 노장군', '실학에 눈뜬 중인 역관', '왕의 그림자 내금위 무사', '환국의 풍랑에 휩쓸린 사림', '천출 신분의 명의(名醫)',
  '왕실을 좌우하는 대비', '대의를 품은 유배객', '잠행하는 미복(微服)의 임금', '음지의 정보 조직 수장', '대비의 밀명을 받든 궁녀',
]
// 신분
const STATUS = [
  '왕족(종친)', '명문 사대부', '한미한 양반', '서얼(庶孽)', '중인(역관·의관)', '아전(향리)', '상민(양인)', '천민(노비)', '백정', '무반(武班)', '승려', '기녀',
]
// 왕대·시대 (분위기·주요 사건 동반)
const ERA = [
  { k: '태조~태종조', e: '건국 직후, 왕자의 난과 사병 혁파의 격동' },
  { k: '세종조', e: '훈민정음·과학기술의 융성, 집현전의 시대' },
  { k: '단종~세조조', e: '계유정난과 사육신, 찬탈의 그림자' },
  { k: '연산조', e: '무오·갑자사화, 폭정과 공포의 치세' },
  { k: '중종조', e: '반정과 조광조의 개혁, 기묘사화' },
  { k: '명종조', e: '문정왕후 수렴청정, 외척 윤원형의 전횡' },
  { k: '선조조(임진왜란)', e: '동서 분당과 7년 전쟁, 의병과 이순신의 시대' },
  { k: '광해조', e: '대북의 집권, 중립외교와 폐모살제의 명분 다툼' },
  { k: '인조조(병자호란)', e: '인조반정과 삼전도의 굴욕, 척화와 주화' },
  { k: '효종~현종조', e: '북벌론과 예송논쟁, 서인·남인의 격돌' },
  { k: '숙종조', e: '잦은 환국과 장희빈, 노론·소론의 발호' },
  { k: '영조조', e: '탕평책과 사도세자, 노론 일색의 조정' },
  { k: '정조조', e: '규장각과 화성 축조, 실학의 만개' },
  { k: '순조~철종조', e: '세도정치와 삼정의 문란, 민란의 불씨' },
]
// 정치·당파 배경
const FACTION = [
  '훈구(勳舊) 공신 계열', '신진 사림(士林)', '동인', '서인', '남인', '북인', '대북', '소북',
  '노론', '소론', '척화파(斥和派)', '주화파(主和派)', '외척 세도가', '환관·내수사 세력', '어느 당파에도 속하지 않은 처사(處士)',
]
// 서사 역할
const ROLE = [
  '주인공', '주군(主君)·후원자', '최대 정적(政敵)', '책략을 짜는 책사', '충직한 호위무사', '연정(戀情)의 상대', '배신할 동지',
  '명분을 좇는 멘토', '주인공을 시기하는 동료', '거사를 함께할 동지', '비극의 희생양', '판을 흔드는 첩자', '대의의 수호자', '집안의 적(內賊)',
]
// 동기·욕망 (장르 특화)
const MOTIVE = [
  '멸문지화를 당한 가문의 신원(伸冤)', '폐위된 주군의 복위', '적폐를 청산하고 새 왕조를 세움', '무너진 왕권의 회복',
  '미래 지식으로 백성을 도탄에서 구함', '당파의 권력을 영구히 장악', '억울하게 죽은 부친의 복수', '북벌의 대업 완수',
  '간신을 베고 종묘사직을 바로 세움', '신분의 굴레를 끊고 입신양명', '사화로 흩어진 사림의 재기', '왜·청의 침략에서 나라를 지킴',
  '금상(今上)을 보위에 안정시킴', '딸·누이를 중전 자리에 올림', '빼앗긴 옥새의 정당성을 되찾음', '평생의 연인을 신분의 벽 너머에서 지킴',
]
// 명분·대의 (행동을 정당화하거나 충돌하는 가치)
const CAUSE = [
  '충(忠) — 군주에 대한 절의', '효(孝) — 부모와 가문의 도리', '의(義) — 옳음을 좇는 의리', '예(禮) — 명분과 법도',
  '대의명분(大義名分)', '위민(爲民) — 백성을 위함', '존주(尊周) — 대명의리', '실사구시(實事求是)', '척사(斥邪)', '경세제민(經世濟民)',
]
// 결점·약점
const FLAW = [
  '지나친 명분론에 사로잡혀 실리를 놓침', '한 번 의심하면 끝까지 못 믿음', '욱하는 성미로 일을 그르침', '출신에 대한 열등감',
  '권세에 대한 끝없는 탐욕', '여린 마음에 결정적 순간 칼을 못 듦', '과거의 죄책감에 발목 잡힘', '자기 재주에 대한 오만',
  '술과 여색에 마음이 흔들림', '가족 앞에서는 한없이 약해짐', '복수심에 눈이 멀어 대의를 잊음', '미래를 안다는 자만(회귀자)',
  '우유부단하여 때를 놓침', '겁이 많아 거사를 망설임', '결벽에 가까운 결백벽', '한번 내뱉은 약속에 목숨을 거는 고집',
]
// 비밀 (장르 특화)
const SECRET = [
  '실은 폐세자의 숨겨진 혈육', '미래에서 회귀·빙의한 현대인', '정적과 내통하는 첩자', '선왕의 밀지(密旨)를 품고 있음',
  '제 손으로 가솔을 역모에 고변했던 과거', '천출이면서 양반 행세를 함', '사사(賜死)된 줄 알았으나 살아 있음', '금단의 서학(西學)을 믿음',
  '주군을 시해할 밀명을 받음', '적장(敵將)과 옛 정인(情人) 사이', '위조한 호패로 신분을 바꿈', '실록에 지워진 사건의 유일한 증인',
  '왕실의 사생아(私生兒)', '반정 명단에 이름이 올라 있음', '독을 다루는 비전(秘傳)을 익힘', '주인공의 출생의 비밀을 쥐고 있음',
]
// 핵심 관계 (다른 인물과의 연결)
const RELATION = [
  '주군과 신하 — 목숨을 건 군신지의', '같은 스승 문하의 동문, 이제는 정적', '한 핏줄이나 적서(嫡庶)로 갈린 형제', '신분을 넘어선 금지된 연인',
  '겉으론 사돈, 속으론 권력 다툼', '서로의 약점을 쥔 위태로운 동맹', '원수의 자식을 거둔 양부와 양자', '같은 거사를 도모한 맹우(盟友)',
  '대비와 그가 키운 궁녀', '스승과 그를 배신할 제자', '한때의 정인이 적국의 사람이 됨', '주인을 향한 노복(奴僕)의 절대적 충심',
]
// 말투·화법
const SPEECH = [
  '고사(故事)와 경전을 인용해 상대를 제압하는 논변', '“통촉하여 주시옵소서” 식의 지극한 격식체', '냉소를 머금은 짧고 날카로운 말',
  '능청과 해학으로 속내를 숨기는 말투', '거침없이 직언하는 강직한 어조', '나긋하나 속에 칼을 품은 말씨', '저잣거리 사투리가 묻어나는 거친 입담',
  '회귀자 특유의 현대적 사고가 옛 말투에 섞임', '느릿하고 무게 있는 노신(老臣)의 화법', '속사포처럼 몰아붙이는 어전 설전', '시문(詩文)으로 마음을 에둘러 전함',
]
// 외양·인상
const LOOK = [
  '형형한 안광에 단단히 다문 입매', '병약해 보이나 눈빛만은 형형한', '훤칠한 키에 곤룡포가 어울리는 풍채', '서글서글하나 속을 알 수 없는 미소',
  '깡마른 몸에 칼날 같은 인상', '온화한 학자풍의 단정한 용모', '뺨의 오랜 흉터가 사연을 말하는', '백발이 성성한 노련한 풍모',
  '소복(素服)이 어울리는 창백한 미색', '검게 그을린 무인의 거친 손', '단아하나 눈매에 독기가 어린', '평범한 행색에 숨긴 비범한 기품',
]
// 상징물·소지품 (이 장르 특유의 MacGuffin/소도구)
const ITEM = [
  '선왕이 내린 밀지', '가문 대대로 물린 옥패', '피로 쓴 단심가(丹心歌)', '위조한 호패', '독이 발린 은장도',
  '반정 동지의 명단', '낡은 병서(兵書)', '훔쳐낸 옥새 탁본', '연인이 남긴 비녀', '실록에서 찢긴 한 장', '미래 지식을 적은 비망록', '대비의 인장이 찍힌 교지',
]
// 주요 무대·거처 (이 인물이 머무는 공간 — 명사구, 다른 슬롯과 독립)
const STAGE = [
  '구중궁궐(九重宮闕)의 깊은 전각', '북촌의 솟을대문 사대부가', '저잣거리의 시끌벅적한 객주', '한적한 향촌의 서당',
  '국경을 지키는 변방의 진영', '의금부의 음습한 옥사', '깊은 산중의 암자', '한강 나루의 선술집',
  '규장각의 서고', '종친부와 궁방이 얽힌 도성 안채', '유배지의 외딴 초가', '청계천 변의 중인 거리',
  '왜·청과 잇닿은 의주·동래의 개시(開市)', '비밀 회합이 오가는 정자(亭子)',
]
// 버릇·습관 (무의식적 행동 버릇 — 명사구, 다른 슬롯과 독립)
const HABIT = [
  '깊은 생각에 잠기면 수염을 쓸어내리는 버릇', '말끝마다 옛 시구를 읊조리는 습관', '거짓을 들으면 눈썹이 미세하게 떨림',
  '결심이 서면 소맷자락을 단단히 여밈', '분을 삭일 때 손에 쥔 부채를 천천히 접었다 폄', '상대를 떠볼 때 일부러 딴청을 부림',
  '밤이면 홀로 검을 닦는 일과', '곤란하면 헛기침으로 말을 돌림', '중요한 결정 전 묵향을 맡으며 붓을 고름',
  '긴장하면 손가락으로 무릎을 두드림', '술잔을 비우기 전 반드시 하늘을 한 번 올려다봄', '약속을 새길 땐 옥패를 꼭 쥐는 습관',
]

// 이름 풀(성·이름·자/호) — 역사·사극 느낌
const SURNAME = ['이', '김', '윤', '정', '한', '조', '심', '민', '홍', '남', '서', '권', '강', '류', '신', '성', '채', '오', '안', '박']
const GIVEN_M = ['도현', '준서', '시열', '경석', '항복', '율곡', '정민', '인후', '도원', '세량', '명회', '문도', '여립', '계남', '진사', '하응', '병하', '치규', '도전', '성룡']
const GIVEN_F = ['소화', '아란', '연우', '윤정', '단희', '서영', '난설', '정명', '인목', '문정', '경빈', '소용', '희빈', '월향', '채령', '도화', '비연', '선정', '연주', '명선']
const HO = ['송재(松齋)', '학포(學圃)', '죽헌(竹軒)', '청송(靑松)', '백사(白沙)', '매월당(梅月堂)', '한벽(寒碧)', '소요(逍遙)', '월담(月潭)', '도은(陶隱)', '석문(石門)', '운곡(雲谷)']

interface Gen {
  seed: number
  name: string; ho: string; gender: string; age: number
  archetype: string; status: string; era: string; eraEcho: string
  faction: string; role: string; motive: string; cause: string
  flaw: string; secret: string; relation: string; speech: string; look: string; item: string
  stage: string; habit: string
  trait: string[]
}
type SlotKey = Exclude<keyof Gen, 'seed' | 'eraEcho'>

const TRAITS = ['강직', '냉철', '집요', '의리', '교활', '담대', '신중', '오만', '겸손', '저돌', '음험', '충직', '비범', '음울', '활달', '냉혹']

function genOne(): Gen {
  const era = pick(ERA)
  const gender = Math.random() < 0.66 ? '남' : '여'
  const name = pick(SURNAME) + (gender === '남' ? pick(GIVEN_M) : pick(GIVEN_F))
  return {
    seed: ri(1e9),
    name, ho: pick(HO), gender, age: 16 + ri(54),
    archetype: pick(ARCHETYPE), status: pick(STATUS), era: era.k, eraEcho: era.e,
    faction: pick(FACTION), role: pick(ROLE), motive: pick(MOTIVE), cause: pick(CAUSE),
    flaw: pick(FLAW), secret: pick(SECRET), relation: pick(RELATION), speech: pick(SPEECH), look: pick(LOOK), item: pick(ITEM),
    stage: pick(STAGE), habit: pick(HABIT),
    trait: picks(TRAITS, 3),
  }
}

// 조합수: 원형·신분·왕대·당파·역할·동기·명분·결점·비밀·관계·말투·외양·상징물·무대·버릇 ×(성격 3택)
const COMBOS = ARCHETYPE.length * STATUS.length * ERA.length * FACTION.length * ROLE.length * MOTIVE.length *
  CAUSE.length * FLAW.length * SECRET.length * RELATION.length * SPEECH.length * LOOK.length * ITEM.length *
  STAGE.length * HABIT.length *
  (TRAITS.length * (TRAITS.length - 1) * (TRAITS.length - 2))

const ROWS: { k: SlotKey; label: string; full?: boolean }[] = [
  { k: 'name', label: '이름' }, { k: 'ho', label: '호(號)' }, { k: 'gender', label: '성별' }, { k: 'age', label: '나이' },
  { k: 'archetype', label: '인물 원형', full: true }, { k: 'status', label: '신분' }, { k: 'era', label: '왕대' },
  { k: 'faction', label: '당파' }, { k: 'role', label: '서사 역할' },
  { k: 'trait', label: '성격' },
  { k: 'motive', label: '동기·욕망', full: true }, { k: 'cause', label: '명분·대의' },
  { k: 'flaw', label: '결점·약점', full: true }, { k: 'secret', label: '비밀', full: true },
  { k: 'relation', label: '핵심 관계', full: true }, { k: 'speech', label: '말투·화법', full: true },
  { k: 'look', label: '외양·인상', full: true }, { k: 'item', label: '상징물', full: true },
  { k: 'stage', label: '주요 무대', full: true }, { k: 'habit', label: '버릇·습관', full: true },
]
function valStr(g: Gen, k: SlotKey): string {
  const v = g[k] as unknown
  if (k === 'age') return g.age + '세'
  if (Array.isArray(v)) return v.join(' · ')
  return String(v)
}

const LS_KEY = 'sry:tool:history-charforge'
interface Saved { id: string; name: string; g: Gen; ts: number }
function loadSaved(): Saved[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Saved[] } catch { return [] } }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function HistoryCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [showSaved, setShowSaved] = useState(false)
  // 사용자 정의 항목(빈 값으로 시작, 사용자가 직접 작성) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [toast, setToast] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])
  const flash = (m: string) => { setToast(m); if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setToast(''), 1800) }

  // payload: 외부에서 reroll 요청 시 새로 굴림
  useEffect(() => { if (payload?.reroll) setG(genOne()) /* eslint-disable-next-line */ }, [])

  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      // 왕대 잠금 시 분위기 설명도 유지
      if (locked['era']) next.eraEcho = prev.eraEcho
      return next
    })
    // 새 인물 생성 시 사용자 정의 값은 비우되 항목(라벨)은 유지, 기타도 비움
    setCustom((cs) => cs.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // 사용자 정의 항목
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim()
    if (!label) return
    setCustom((cs) => [...cs, { id: 'c_' + Date.now().toString(36) + ri(1e6).toString(36), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((cs) => cs.map((c) => (c.id === id ? { ...c, value } : c)))
  const delCustom = (id: string) => setCustom((cs) => cs.filter((c) => c.id !== id))
  // 비어있지 않은 사용자 정의/기타를 fields 맵에 동봉
  const extraFields = (): Record<string, string> => {
    const m: Record<string, string> = {}
    for (const c of custom) { const l = c.label.trim(), v = c.value.trim(); if (l && v) m[l] = v }
    const e = etc.trim(); if (e) m.etc = e
    return m
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    const fresh = genOne()
    const patch: Partial<Gen> = { [k]: (fresh as unknown as Record<string, unknown>)[k] } as Partial<Gen>
    if (k === 'era') (patch as Gen).eraEcho = fresh.eraEcho
    return { ...prev, ...patch }
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const summaryText = () => {
    const ex = extraFields()
    const extra = Object.keys(ex).length ? '\n' + Object.entries(ex).map(([k, v]) => `${k === 'etc' ? '기타' : k}: ${v}`).join('\n') : ''
    return `${g.name} (${g.ho}) · ${g.gender} · ${g.age}세\n` +
      `[한 줄 소개] ${logline()}\n` +
      `[왕대] ${g.era} — ${g.eraEcho}\n` +
      ROWS.filter((r) => !['name', 'ho', 'gender', 'age', 'era'].includes(r.k)).map((r) => `${r.label}: ${valStr(g, r.k)}`).join('\n') +
      extra
  }

  const toCharacterFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.role} · ${g.archetype}`,
    age: `${g.age}세 · ${g.gender}`,
    occupation: `${g.status} · ${g.faction}`,
    appearance: `${g.look} · 호: ${g.ho}`,
    personality: `${g.trait.join(', ')} · 말투: ${g.speech}`,
    background: `왕대: ${g.era} — ${g.eraEcho}`,
    goal: `${g.motive} (명분: ${g.cause})`,
    conflict: `결점: ${g.flaw}`,
    secret: g.secret,
    relationships: g.relation,
    notes: `상징물: ${g.item}`,
  })

  // 정규(표준) 캐릭터 필드 — 받는 허브(인물 시트/라이브러리)에서 항목이 기본 칸에 제자리로 들어가도록 1:1 매핑.
  // 뭉친 값은 분리(나이/성별, 외양/호 등). 기존 키는 유지하고 이 fields 를 "추가"로 동봉.
  const toCharacterCanonFields = (): Record<string, string> => ({
    name: g.name,
    aka: g.ho,                       // 호(號) → 별칭
    role: `${g.role} · ${g.archetype}`,
    gender: g.gender,
    age: `${g.age}세`,
    occupation: g.role,              // 서사 역할 → 직업(서사적 직분)
    affiliation: g.faction,          // 당파 → 소속
    origin: g.status,                // 신분 → 출신
    personality: g.trait.join(', '),
    value: g.cause,                  // 명분·대의 → 가치관
    goal: g.motive,                  // 동기·욕망 → 목표/욕망
    motivation: g.motive,            // 동기 → 동기
    flaw: g.flaw,                    // 결점·약점 → 약점/결점
    secret: g.secret,
    speech: g.speech,                // 말투·화법 → 말투
    appearance: g.look,              // 외양·인상 → 외모
    background: `왕대: ${g.era} — ${g.eraEcho}`,
    relations: g.relation,           // 핵심 관계 → 관계
    habit: g.habit,                  // 버릇·습관 → 습관
    notes: `상징물: ${g.item} · 주요 무대: ${g.stage}`,
  })

  // 받침에 맞춰 조사를 골라 자연스러운 한 줄 소개 생성(괄호 이중표기 없음)
  const logline = () =>
    `${g.era}, ${josa(g.stage, '은')} ${g.archetype} ${josa(g.name, '이')} ` +
    `${josa(g.motive, '을')} 위해 ${josa(g.cause, '으로')} 맞서는 ${g.role} 이야기.`

  const bodyHtml = () => {
    const rows: [string, string][] = [
      ['인물 원형', g.archetype], ['신분', g.status], ['왕대', `${g.era} — ${g.eraEcho}`], ['당파', g.faction],
      ['서사 역할', g.role], ['성격', g.trait.join(' · ')], ['동기·욕망', g.motive], ['명분·대의', g.cause],
      ['결점·약점', g.flaw], ['비밀', g.secret], ['핵심 관계', g.relation], ['말투·화법', g.speech],
      ['외양·인상', g.look], ['상징물', g.item], ['주요 무대', g.stage], ['버릇·습관', g.habit],
    ]
    return `<p><b>${esc(g.name)}</b> (${esc(g.ho)}) · ${esc(g.gender)} · ${g.age}세</p>` +
      rows.map(([k, v]) => `<p><b>${esc(k)}</b>: ${esc(v)}</p>`).join('')
  }

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), fields: { ...toCharacterCanonFields(), ...extraFields() } } }); flash('인물 시트로 보냈습니다') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name, role: `${g.role} · ${g.archetype}`,
      personality: g.trait.join(', '), goal: g.motive, secret: g.secret, appearance: g.look,
      traits: ROWS.filter((r) => !['name'].includes(r.k)).map((r) => ({ k: r.label, v: valStr(g, r.k) })),
      notes: `왕대: ${g.era} — ${g.eraEcho} · 명분: ${g.cause} · 관계: ${g.relation} · 상징물: ${g.item}`,
      fields: { ...toCharacterCanonFields(), ...extraFields() },
      source: '사극 인물 생성기',
    }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: { ...toCharacterFields(), ...toCharacterCanonFields(), ...extraFields() }, bodyHtml: bodyHtml(),
      meta: { 왕대: g.era, 신분: g.status, 당파: g.faction, 역할: g.role, 원형: g.archetype, 성별: g.gender, 나이: g.age + '세' },
    })
    if (id) flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)')
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // 로컬 저장(CRUD)
  const persist = (arr: Saved[]) => { setSaved(arr); try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch { /* noop */ } }
  const saveLocal = () => { const arr = [{ id: 'h_' + Date.now().toString(36), name: g.name, g, ts: Date.now() }, ...saved].slice(0, 60); persist(arr); flash('이 도구에 저장했습니다') }
  const loadLocal = (s: Saved) => { setG(s.g); setShowSaved(false); flash(`'${s.name}' 불러옴`) }
  const delLocal = (id: string) => persist(saved.filter((s) => s.id !== id))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🏯"/> 역사·사극 인물</span>
        <button className="minibtn" onClick={() => setShowSaved((v) => !v)}>{showSaved ? <>✕ 닫기</> : <><Emoji e="🗂"/> 저장함({saved.length})</>}</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {/* 머리말 카드 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{g.name} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{g.ho}</span></div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{g.gender} · {g.age}세 · {g.status} · {g.faction}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{g.archetype} <span style={{ color: 'var(--accent)' }}>／</span> {g.role}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}><Emoji e="📜"/> {g.era} — {g.eraEcho}</div>
        <div style={{ fontSize: 11.5, marginTop: 5, lineHeight: 1.5 }}><Emoji e="✒️"/> {logline()}</div>
      </div>

      {showSaved ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {saved.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>저장된 인물이 없습니다. ‘이 도구에 저장’으로 보관하세요.</div>}
          {saved.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.g.archetype} · {s.g.era}</div>
              </div>
              <button className="minibtn" onClick={() => loadLocal(s)}>불러오기</button>
              <button className="minibtn" onClick={() => delLocal(s.id)}><Emoji e="🗑"/></button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {ROWS.map((r) => (
            <div key={r.k} style={{ gridColumn: r.full ? '1 / -1' : 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 60, flexShrink: 0 }}>{r.label}</span>
              <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={valStr(g, r.k)}>{valStr(g, r.k)}</span>
              <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲"/></button>
            </div>
          ))}

          {/* 사용자 정의 항목 — 직접 작성(무작위 생성 안 함) */}
          {custom.map((c) => (
            <div key={c.id} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 60, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
              <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="직접 입력" style={{ flex: 1, fontSize: 11.5, padding: '2px 4px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }} />
              <button className="minibtn" title="항목 삭제" onClick={() => delCustom(c.id)} style={{ padding: '0 3px' }}>✕</button>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="minibtn" onClick={addCustom}>＋ 항목 추가</button>
          </div>

          {/* 고정 '기타' 자유 입력 */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>기타</span>
            <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어 주세요" rows={3} style={{ width: '100%', boxSizing: 'border-box', fontSize: 11.5, padding: '4px 6px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 인물 생성</button>
        <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사됨')).catch(() => {}) }}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={saveLocal}><Emoji e="💾"/> 이 도구에 저장</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄"/> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪"/> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥"/> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker')}><Emoji e="🏺"/> 시대착오 점검</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || '“프로젝트에 인물 카드 추가”를 누르면 좌측 바인더(자료 › 인물)와 DB 뷰에 실시간으로 들어갑니다.'}</div>
    </div>
  )
}
