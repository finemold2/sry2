// 창작 생물 설계기 — 이름/분류/서식지/외형/능력/먹이·천적/습성/인간과의 관계/약점 9개 항목으로
// 작품 세계만의 생물(몬스터·영물·이종족·미지의 짐승)을 일관되게 설계한다.
// 무작위 시드 보조: 빈 항목을 영감 풀에서 한 번에 채우거나, 항목별로 따로 굴려 글감을 자극한다.
// 여러 생물을 저장·수정·삭제·순서변경한다. 자급식: react·linkbus 외 import 없음. 전부 로컬.
// localStorage 'sry:tool:creature-designer' 에 자동 저장/복원.
// 연계(linkbus): ① 설계한 생물을 프로젝트 자료(research)/'생물' 폴더에 문서로 추가
//                ② 인물(생물) 라이브러리(characters)에 저장 → 인물 시트/관계도 등에서 재사용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'creature-designer', name: '창작 생물 설계기', icon: '🦎', group: '구상·정리', intro: '이름·분류·서식지·외형·능력·먹이·습성·약점으로 작품만의 생물을 설계하세요', w: 660, h: 600 }

// 생물의 아홉 핵심 항목 — 라벨/아이콘/도움말/예시 placeholder.
type FieldKey = 'classification' | 'habitat' | 'appearance' | 'ability' | 'diet' | 'behavior' | 'relation' | 'weakness'
interface FieldDef { key: FieldKey; label: string; icon: string; hint: string; eg: string }
const FIELDS: FieldDef[] = [
  { key: 'classification', label: '분류', icon: '🧬', hint: '어떤 부류의 존재인가 — 종·계통·등급', eg: '예: 비룡목(飛龍目)에 속하는 중형 영물. 새도 짐승도 아닌 \'바람의 짐승\'으로 분류된다.' },
  { key: 'habitat', label: '서식지', icon: '🏔️', hint: '어디에 사는가 — 지형·기후·생활 영역', eg: '예: 만년설이 덮인 고산 능선. 기압이 낮은 해발 4천m 이상에서만 호흡할 수 있다.' },
  { key: 'appearance', label: '외형', icon: '👁️', hint: '어떻게 생겼는가 — 크기·색·특징적 신체', eg: '예: 사슴만 한 몸집에 깃털 대신 얼음 비늘. 뿔에서 김이 서리고, 눈동자는 세로로 갈라졌다.' },
  { key: 'ability', label: '능력', icon: '⚡', hint: '무엇을 할 수 있는가 — 힘·감각·특수 능력', eg: '예: 숨결로 주변 공기를 얼린다. 수백 리 밖의 천둥소리를 듣고, 폭풍이 오기 전날 운다.' },
  { key: 'diet', label: '먹이·천적', icon: '🍖', hint: '무엇을 먹고, 무엇을 두려워하는가 — 먹이사슬에서의 위치', eg: '예: 번개 맞은 나무의 수액과 우박을 먹는다. 천적은 화염을 다루는 저지대의 \'재의 표범\'.' },
  { key: 'behavior', label: '습성', icon: '🌀', hint: '어떻게 행동하는가 — 무리·번식·주기·기질', eg: '예: 단독 생활. 7년에 한 번 짝짓기 철에만 떼를 이룬다. 새벽에만 활동하고 낮엔 동굴에서 잔다.' },
  { key: 'relation', label: '인간과의 관계', icon: '🧑‍🤝‍🧑', hint: '사람과 어떻게 얽히는가 — 숭배·사냥·전설·공생', eg: '예: 산악 부족은 폭풍의 전령으로 숭배한다. 비늘은 부적으로, 뿔은 해독제로 밀거래된다.' },
  { key: 'weakness', label: '약점', icon: '🎯', hint: '무엇에 취약한가 — 환경·물질·조건', eg: '예: 더위에 급격히 약해진다. 비늘 사이 목덜미가 유일한 급소. 제 울음의 메아리에 혼란을 일으킨다.' },
]
function fieldDef(k: FieldKey): FieldDef { return FIELDS.find((f) => f.key === k) || FIELDS[0] }

// 사용자 정의 항목(라벨·값) — 미리 만든 데이터가 없으므로 무작위 생성하지 않고 직접 입력한다.
interface CustomField { id: string; label: string; value: string }

// ── 무작위 시드 영감 풀 (항목별로 한 줄씩 던져 발상을 자극) ──
const SEED: Record<'name' | 'tagline' | FieldKey, string[]> = {
  name: ['그르렉', '실라프', '뇨른', '카르밀', '운드', '테스카', '하라크', '비르', '늪지기', '여명각수', '재의 표범', '구름수염', '서리이빨', '백야조(白夜鳥)', '돌껍질', '안개사슴', '천 개의 눈', '오르넨', '검은물지기', '바람의 자식', '잿빛부리', '메아리이리', '소금눈물', '달그림자', '천둥발굽', '여울지기', '잿더미여우', '북풍사자', '검은서리', '이끼등', '노을뱀', '재의 사슴', '무쇠비늘', '안개부엉이', '별빛지기', '서리꼬리'],
  tagline: ['폭풍이 오기 전날 운다는 외딴 곳의 영물', '한 번 본 얼굴은 결코 잊지 않는 끈질긴 추적자', '좀처럼 모습을 드러내지 않는 그늘 속의 포식자', '죽은 자의 마지막 말을 흉내 낸다는 흉조', '천 년에 한 번 깨어난다는 잠든 거수', '거짓말을 들으면 까닭 없이 사납게 우는 짐승', '달이 차오를 때만 모습을 드러내는 밤의 사냥꾼', '울음소리로 길 잃은 자를 홀린다는 외딴 곳의 유혹자', '제 새끼를 지키려 무엇과도 맞서는 어미 거수', '오래도록 늙지 않는다고 전해지는 밤의 손님', '인적 없는 곳에서 홀로 살아간다는 은둔의 짐승', '같은 길로만 다니며 영역을 지키는 끈질긴 방랑자', '몸 어딘가에 귀한 약효를 품었다고 전해지는 영물', '한 철만 머물다 자취를 감추는 덧없는 손님'],
  classification: ['중형 영물(靈物)에 속하는 단일종', '곤충도 짐승도 아닌 미분류 절지 생물', '멸종한 고대 종의 마지막 후예', '식물과 동물의 경계에 선 반식물 생명체', '죽은 자의 한이 깃들어 태어난 준생물', '여섯 다리의 대형 초식 유제류', '심해 두족류에서 갈라진 육상 변종', '인간과 짐승의 피가 섞인 이종족의 아종', '바위에 깃든 정령이 형체를 얻은 광물성 생명체', '날개 달린 파충류 계통의 소형 비행종', '물과 안개로 몸을 이루는 무정형 영체', '새와 짐승의 특징을 함께 지닌 키메라형 종', '극지에서만 발견되는 한대성 대형 포유류', '인간이 부리던 짐승이 야생으로 돌아간 회귀종'],
  habitat: ['만년설이 덮인 고산 능선', '햇빛이 닿지 않는 석회 동굴 깊은 곳', '소금기 가득한 갯벌과 기수역', '안개가 걷히지 않는 늪지대', '버려진 도시의 지하 수로', '수백 년 묵은 거목의 속이 빈 줄기', '화산재가 비처럼 내리는 불모지', '계절마다 위치가 바뀌는 떠도는 섬', '깊은 바다의 열수 분출구 주변', '바람이 멈추지 않는 황량한 고원 초지', '얼음이 녹지 않는 빙하 아래 호수', '모래 폭풍이 잦은 끝없는 사막의 오아시스', '벼락이 자주 떨어지는 외딴 바위 봉우리', '강과 바다가 만나는 흙탕물의 하구', '온천 증기가 끊임없이 솟는 화산 분지', '사람이 떠난 폐광의 무너진 갱도'],
  appearance: ['사슴만 한 몸집에 깃털 대신 얼음 비늘', '눈이 없는 대신 온몸이 진동을 느끼는 매끈한 피부', '나무껍질 같은 외피에 이끼와 버섯이 자란다', '반투명한 몸 안으로 푸른 빛이 흐른다', '여러 개의 입과 단 하나의 거대한 눈', '평소엔 작은 돌처럼 보이다 펼쳐지면 집채만 하다', '머리가 둘, 한쪽은 잠들고 한쪽은 깨어 있다', '그림자처럼 윤곽만 있고 속은 텅 비어 있다', '등에 작은 숲을 이고 다니는 거대한 등딱지', '여섯 쌍의 투명한 날개가 무지개처럼 빛난다', '온몸이 검은 깃털로 덮여 밤에는 형체가 사라진다', '뼈가 겉으로 드러나 갑옷처럼 몸을 감싼다', '꼬리 끝에 작은 등불 같은 빛주머니가 달렸다', '비늘 한 장 한 장에 옛 글자가 새겨져 있다'],
  ability: ['숨결로 주변 공기를 순식간에 얼린다', '소리를 흉내 내 먹이를 홀린다', '제 몸을 주변 환경과 똑같이 위장한다', '상처를 하루 만에 새 살로 메운다', '한 번 맡은 냄새를 수십 리 밖에서 추적한다', '닿은 금속을 부식시키는 점액을 뿜는다', '짧은 거리를 그림자 사이로 순간 이동한다', '시간을 잠깐 늦추는 듯한 안개를 두른다', '울음소리만으로 단단한 바위를 쪼갠다', '땅속을 물고기처럼 헤엄쳐 이동한다', '제 체온을 자유로이 올려 주변을 태운다', '다친 동족의 상처를 핥아 낫게 한다', '날개를 펴면 거센 바람을 일으켜 날린다', '어둠 속에서도 열의 흐름을 또렷이 본다'],
  diet: ['번개 맞은 나무의 수액과 우박을 먹는다 / 천적은 화염을 다루는 \'재의 표범\'', '동굴 벽의 발광 이끼만 먹는다 / 천적은 빛을 싫어해 거의 없다', '죽어가는 생물의 마지막 숨을 들이마신다 / 천적은 같은 종의 더 늙은 개체', '물에 비친 별빛을 핥아 양분을 얻는다 / 천적은 흐린 날씨 그 자체', '쇠붙이를 씹어 삼킨다 / 천적은 강한 자석을 지닌 사냥꾼', '제 새끼를 제외한 모든 살아있는 것을 먹는 포식자 / 천적은 없으나 굶주림이 곧 죽음', '깊은 물속의 작은 새우 떼를 걸러 먹는다 / 천적은 더 큰 심해의 포식어', '바위에 낀 소금과 광물을 핥아 먹는다 / 천적은 단물을 들이붓는 사냥꾼', '갓 떨어진 낙엽과 썩은 열매를 주워 먹는다 / 천적은 둥지를 노리는 들개 무리', '하늘을 나는 벌레를 혀로 낚아챈다 / 천적은 밤에 활동하는 큰 올빼미', '얼음 밑 차가운 물고기를 사냥한다 / 천적은 봄에 녹는 따뜻한 물 그 자체', '제 몸에 붙은 작은 기생벌레로 양분을 얻는다 / 천적은 그 벌레를 쫓는 약초 연기'],
  behavior: ['단독 생활, 7년에 한 번 짝짓기 철에만 무리 짓는다', '새벽에만 활동하고 낮엔 깊은 잠에 빠진다', '죽을 자리를 미리 정해 두고 그곳으로 돌아간다', '같은 길로만 다니며 영역을 냄새로 표시한다', '위협을 느끼면 죽은 척하며 며칠을 버틴다', '평생 한 짝만 두고, 짝이 죽으면 곡기를 끊는다', '계절이 바뀔 때마다 허물을 벗고 성격이 변한다', '둥지에 반짝이는 물건을 모아 쌓아 둔다', '수십 마리가 큰 무리를 이뤄 함께 이동한다', '달이 차오를 때마다 높은 곳에 올라 길게 운다', '제 영역에 들어온 자에게 먼저 경고음을 낸다', '겨울이 오면 땅을 깊이 파고 들어가 잠든다', '어린 새끼를 등에 업고 다니며 함께 사냥한다', '하루의 절반을 물가에서 몸을 식히며 보낸다'],
  relation: ['산악 부족은 폭풍의 전령으로 숭배한다', '비늘·뿔이 약재로 밀거래돼 멸종 위기에 몰렸다', '농민들은 흉조로 여겨 보이면 쫓아낸다', '왕실이 길들여 전쟁 병기로 부린다', '아이를 데려간다는 소문 탓에 마녀로 의인화됐다', '특정 가문만이 대대로 부리는 비밀 동반자', '인간을 거의 본 적 없어 두려움도 적의도 없다', '오래전 인간과 맺은 계약의 잔재로만 남았다', '어부들은 풍어를 부르는 길조로 반긴다', '사냥꾼들에게 가장 값진 사냥감으로 쫓긴다', '아이들의 옛이야기 속 단골 주인공이 되었다', '신전의 수호 짐승으로 길러져 제사에 쓰인다', '길을 잃은 나그네를 마을로 이끈다는 전설이 있다', '마을 경계에 두고 침입자를 막는 파수꾼으로 길든다'],
  weakness: ['더위에 급격히 약해진다', '목덜미 한 곳이 유일한 급소다', '제 울음의 메아리에 방향을 잃는다', '소금에 닿으면 피부가 타들어 간다', '보름달 아래선 평소의 기운을 잃고 둔해진다', '거짓말하는 자 앞에서는 까닭 없이 불안해한다', '특정 꽃의 향에 깊은 잠에 빠진다', '제 그림자가 흐트러지면 안절부절못한다', '몸이 흠뻑 젖으면 굼떠져 쉽게 잡힌다', '큰 소리에 놀라 한동안 움직이지 못한다', '오래된 청동 거울에 비친 제 모습을 두려워한다', '추위가 닥치면 몸이 굳어 둔해진다', '굶주리면 기운을 차리지 못하고 처진다', '제 둥지에서 멀어질수록 빠르게 쇠약해진다'],
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
// 어림 조합 수(영감 풀이 만들어내는 서로 다른 생물 윤곽의 가짓수) — "수만+" 표시용.
const SEED_COMBOS = (Object.values(SEED) as string[][]).reduce((acc, arr) => acc * arr.length, 1)

interface Creature {
  id: string
  name: string
  tagline: string        // 한 줄 콘셉트
  classification: string
  habitat: string
  appearance: string
  ability: string
  diet: string
  behavior: string
  relation: string
  weakness: string
  notes: string
  custom: CustomField[]   // 사용자 정의 항목(라벨+직접 입력 값)
  etc: string             // 고정 '기타' 자유 입력
  createdAt: number
}

const LS_KEY = 'sry:tool:creature-designer'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyForm(): Creature {
  return { id: '', name: '', tagline: '', classification: '', habitat: '', appearance: '', ability: '', diet: '', behavior: '', relation: '', weakness: '', notes: '', custom: [], etc: '', createdAt: 0 }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화 (&,<,> 필수).
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '생물' 문서 본문(HTML) 생성.
function creatureBodyHtml(c: Creature): string {
  const dash = '<span style="color:#888">—</span>'
  const v = (t: string) => (t.trim() ? escHtml(t.trim()).replace(/\n/g, '<br>') : dash)
  const parts: string[] = []
  if (c.tagline.trim()) parts.push(`<p><i>${escHtml(c.tagline.trim())}</i></p>`)
  FIELDS.forEach((f) => { parts.push(`<p><b>${f.icon} ${escHtml(f.label)}</b><br>${v(c[f.key])}</p>`) })
  c.custom.forEach((cf) => { if (cf.value.trim()) parts.push(`<p><b>${escHtml((cf.label || '항목').trim())}</b><br>${v(cf.value)}</p>`) })
  if (c.etc.trim()) parts.push(`<p><b>기타</b><br>${v(c.etc)}</p>`)
  if (c.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${v(c.notes)}</p>`)
  return parts.join('')
}

// 텍스트 내보내기(복사용).
function exportOne(c: Creature): string {
  const lines: string[] = [`# ${c.name || '이름 없는 생물'}`]
  if (c.tagline.trim()) lines.push('', c.tagline.trim())
  FIELDS.forEach((f) => { lines.push('', `■ ${f.icon} ${f.label}`, (c[f.key].trim() || '—')) })
  c.custom.forEach((cf) => { if (cf.value.trim()) lines.push('', `■ ${(cf.label || '항목').trim()}`, cf.value.trim()) })
  if (c.etc.trim()) { lines.push('', '■ 기타', c.etc.trim()) }
  if (c.notes.trim()) { lines.push('', '🗒️ 메모', c.notes.trim()) }
  return lines.join('\n')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { list: Creature[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const str = (x: unknown) => (typeof x === 'string' ? x : '')
    const list: Creature[] = arr.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
      id: str(x.id) || newId(),
      name: str(x.name),
      tagline: str(x.tagline),
      classification: str(x.classification),
      habitat: str(x.habitat),
      appearance: str(x.appearance),
      ability: str(x.ability),
      diet: str(x.diet),
      behavior: str(x.behavior),
      relation: str(x.relation),
      weakness: str(x.weakness),
      notes: str(x.notes),
      custom: Array.isArray(x.custom)
        ? (x.custom as unknown[])
            .filter((c) => c && typeof c === 'object')
            .map((c) => { const o = c as Record<string, unknown>; return { id: str(o.id) || newId(), label: str(o.label), value: str(o.value) } })
        : [],
      etc: str(x.etc),
      createdAt: Number(x.createdAt) || Date.now(),
    }))
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function CreatureDesigner({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Creature[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [editing, setEditing] = useState<Creature | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  // payload 로 이름/콘셉트가 넘어오면 새 폼에 채워 시작(연계 진입).
  useEffect(() => {
    if (!payload) return
    const name = typeof payload.name === 'string' ? payload.name : ''
    const tagline = typeof payload.tagline === 'string' ? payload.tagline : ''
    if (name || tagline) { setEditing({ ...emptyForm(), id: newId(), name, tagline }); setOpenId(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  const showFlash = (m: string) => {
    if (!mounted.current) return
    setFlash(m)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2400)
  }

  const startNew = () => { setEditing({ ...emptyForm(), id: newId() }); setOpenId(null); setConfirmDel(null) }
  const startEdit = (c: Creature) => { setEditing({ ...c }); setConfirmDel(null) }
  const cancelEdit = () => setEditing(null)

  const saveForm = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.name.trim()) e.name = (e.tagline.trim() || '이름 없는 생물')
    if (!e.createdAt) e.createdAt = Date.now()
    setList((prev) => {
      const exists = prev.some((c) => c.id === e.id)
      return exists ? prev.map((c) => (c.id === e.id ? e : c)) : [...prev, e]
    })
    setOpenId(e.id)
    setEditing(null)
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id))
    if (openId === id) setOpenId(null)
    if (editing?.id === id) setEditing(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경 (HTML5 DnD — 전역 포인터 리스너 없음, 안전).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((c) => c.id === from)
      const ti = prev.findIndex((c) => c.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // 클립보드 복사(graceful + 폴백).
  const copyText = (text: string, label = '복사됨') => {
    const done = () => showFlash(label)
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
    } catch { showFlash('복사 실패') }
  }
  const exportAll = (): string => list.map(exportOne).join('\n\n———\n\n')

  // ── 무작위 시드: 편집 중인 폼의 빈 항목만 채운다(잠금 효과: 이미 쓴 칸은 보존) ──
  const seedEmpty = () => {
    if (!editing) return
    const e = { ...editing }
    if (!e.name.trim()) e.name = pick(SEED.name)
    if (!e.tagline.trim()) e.tagline = pick(SEED.tagline)
    FIELDS.forEach((f) => { if (!e[f.key].trim()) e[f.key] = pick(SEED[f.key]) })
    setEditing(e)
  }
  // 전체 무작위 — 모든 칸을 새로 굴려 덮어쓴다.
  // 사용자 정의 항목은 미리 만든 데이터가 없으므로 '값'만 비우고 '항목(라벨)'은 유지한다. '기타'도 비운다.
  const seedAll = () => {
    if (!editing) return
    const e = { ...editing, name: pick(SEED.name), tagline: pick(SEED.tagline) }
    FIELDS.forEach((f) => { e[f.key] = pick(SEED[f.key]) })
    e.custom = editing.custom.map((cf) => ({ ...cf, value: '' }))
    e.etc = ''
    setEditing(e)
  }
  // 항목 하나만 다시 굴리기.
  const seedOne = (k: 'name' | 'tagline' | FieldKey) => {
    if (!editing) return
    setEditing({ ...editing, [k]: pick(SEED[k]) })
  }

  // 프로젝트 연동 — '생물' 문서를 자료(research)/'생물' 폴더에 추가.
  const toProject = (c: Creature) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않습니다'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '생물',
      title: c.name?.trim() ? `생물 — ${c.name.trim()}` : '창작 생물',
      bodyHtml: creatureBodyHtml(c),
      synopsis: c.tagline.trim() || undefined,
      icon: '🦎',
      meta: { 분류: c.classification.trim().slice(0, 40) || '—', 서식지: c.habitat.trim().slice(0, 40) || '—', 약점: c.weakness.trim().slice(0, 40) || '—' },
    })
    showFlash(id ? '프로젝트 ‘자료 › 생물’에 문서로 추가했습니다' : '프로젝트 추가에 실패했어요')
  }

  // 인물(생물) 라이브러리 저장 — 인물 시트/관계도 등에서 모델로 재사용.
  const toLibrary = (c: Creature) => {
    // 받는 허브(인물 시트)가 기본 칸에 제자리로 넣도록 정규 키 fields 를 추가(additive).
    // 생물 항목 → 정규 인물 키 매핑: 분류→role, 서식지→origin, 외형→appearance,
    //   능력→quirk, 먹이·천적→notes(합침), 습성→habit, 인간과의 관계→relations, 약점→flaw, 콘셉트→notes.
    const noteParts: string[] = []
    if (c.tagline.trim()) noteParts.push(c.tagline.trim())
    if (c.diet.trim()) noteParts.push(`먹이·천적: ${c.diet.trim()}`)
    if (c.notes.trim()) noteParts.push(c.notes.trim())
    const fields: Record<string, string> = {}
    const f = (k: string, v: string) => { if (v.trim()) fields[k] = v.trim() }
    f('name', c.name || '이름 없는 생물')
    f('role', c.classification.trim() || '창작 생물')
    f('origin', c.habitat)
    f('appearance', c.appearance)
    f('quirk', c.ability)
    f('habit', c.behavior)
    f('relations', c.relation)
    f('flaw', c.weakness)
    // 사용자 정의 항목(키=라벨 그대로) + 기타(키='etc') — 값이 있을 때만. 인물 시트 등에 그대로 나타남.
    c.custom.forEach((cf) => { const k = cf.label.trim(); if (k && cf.value.trim()) fields[k] = cf.value.trim() })
    f('etc', c.etc)
    if (noteParts.length) fields.notes = noteParts.join('\n\n')
    addToLibrary('characters', {
      name: c.name || '이름 없는 생물',
      role: c.classification.trim() || '창작 생물',
      appearance: c.appearance.trim() || undefined,
      traits: [
        { k: '분류', v: c.classification.trim() || '—' },
        { k: '서식지', v: c.habitat.trim() || '—' },
        { k: '능력', v: c.ability.trim() || '—' },
        { k: '먹이·천적', v: c.diet.trim() || '—' },
        { k: '습성', v: c.behavior.trim() || '—' },
        { k: '인간과의 관계', v: c.relation.trim() || '—' },
        { k: '약점', v: c.weakness.trim() || '—' },
        ...c.custom.filter((cf) => cf.label.trim() && cf.value.trim()).map((cf) => ({ k: cf.label.trim(), v: cf.value.trim() })),
        ...(c.etc.trim() ? [{ k: '기타', v: c.etc.trim() }] : []),
      ],
      fields,
      notes: c.tagline.trim() || c.notes.trim() || undefined,
      source: '창작 생물 설계기',
    })
    showFlash('인물(생물) 라이브러리에 저장했습니다')
  }

  const opened = openId ? list.find((c) => c.id === openId) || null : null

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const sidebar: React.CSSProperties = { width: 214, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const emptyS: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 20 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🦎" /></span>
        <strong style={{ fontSize: 15 }}>창작 생물 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}종 저장됨</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 생물을 텍스트로 복사">전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 생물</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 저장 목록 + 순서 */}
        <div style={sidebar}>
          {list.length === 0 ? (
            <div style={emptyS}>아직 설계한 생물이 없어요.<br />오른쪽 위 <b>＋ 새 생물</b>로<br />첫 생물을 빚어 보세요.<br /><br /><span style={{ fontSize: 11 }}><Emoji e="🎲" /> 무작위 시드로<br />빈 항목을 단번에 채울 수 있어요.</span></div>
          ) : (
            <div style={listArea}>
              {list.map((c, i) => {
                const active = c.id === openId || (editing && editing.id === c.id)
                const filled = FIELDS.filter((f) => c[f.key].trim()).length
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => { dragId.current = c.id }}
                    onDragOver={(e) => { e.preventDefault(); if (dragOver !== c.id) setDragOver(c.id) }}
                    onDragLeave={() => { if (dragOver === c.id) setDragOver(null) }}
                    onDrop={() => onDrop(c.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setEditing(null); setOpenId(c.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === c.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--chrome-2)' : 'var(--panel)',
                      borderRadius: 9, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || '(이름 없음)'}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, -1) }} disabled={i === 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); move(c.id, 1) }} disabled={i === list.length - 1} title="아래로">▼</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEdit(c) }} title="수정"><Emoji e="✏️" /></button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(c.id) }} title="삭제"><Emoji e="🗑️" /></button>
                    </div>
                    {confirmDel === c.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 생물을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(e) => { e.stopPropagation(); remove(c.id) }}>삭제</button>
                          <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 메인: 폼(신규/수정) 또는 상세보기 또는 안내 */}
        <div style={main}>
          {editing ? (
            <FormView
              editing={editing}
              setEditing={setEditing}
              onSave={saveForm}
              onCancel={cancelEdit}
              seedEmpty={seedEmpty}
              seedAll={seedAll}
              seedOne={seedOne}
            />
          ) : opened ? (
            <DetailView
              c={opened}
              onEdit={() => startEdit(opened)}
              copyText={copyText}
              onToProject={() => toProject(opened)}
              onToLibrary={() => toLibrary(opened)}
            />
          ) : (
            <div style={emptyS}>
              왼쪽에서 생물을 고르거나<br /><b>＋ 새 생물</b>로 만들어 보세요.<br /><br />
              <span style={{ fontSize: 12 }}>분류 ＋ 서식지 ＋ 외형 ＋ 능력 ＋ 먹이·천적<br />＋ 습성 ＋ 인간과의 관계 ＋ 약점<br />— 여덟 항목으로 작품만의 생물을 빚습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 공통 라벨/입력 스타일.
const labelS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
const inputS: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
const areaS: React.CSSProperties = { ...inputS, resize: 'vertical', minHeight: 58, lineHeight: 1.5, fontFamily: 'inherit' }
const fieldS: React.CSSProperties = { marginBottom: 13 }

// ── 폼(신규/수정) ──
function FormView(props: {
  editing: Creature
  setEditing: (c: Creature) => void
  onSave: () => void
  onCancel: () => void
  seedEmpty: () => void
  seedAll: () => void
  seedOne: (k: 'name' | 'tagline' | FieldKey) => void
}) {
  const { editing, setEditing, onSave, onCancel, seedEmpty, seedAll, seedOne } = props
  const set = (k: keyof Creature, v: string) => setEditing({ ...editing, [k]: v })
  const filled = FIELDS.filter((f) => editing[f.key].trim()).length

  // 사용자 정의 항목 — 라벨을 받아 빈 값 칸을 새로 만든다(무작위 생성 안 함, 직접 입력).
  const addCustom = () => {
    let raw: string | null = null
    try { raw = window.prompt('추가할 항목 이름을 입력하세요', '') } catch { raw = null }
    const label = (raw || '').trim()
    if (!label) return
    setEditing({ ...editing, custom: [...editing.custom, { id: newId(), label, value: '' }] })
  }
  const setCustomValue = (id: string, value: string) => {
    setEditing({ ...editing, custom: editing.custom.map((cf) => (cf.id === id ? { ...cf, value } : cf)) })
  }
  const removeCustom = (id: string) => {
    setEditing({ ...editing, custom: editing.custom.filter((cf) => cf.id !== id) })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>{editing.createdAt ? '생물 수정' : '새 생물'}</strong>
        <span style={{ fontSize: 11, color: filled === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>작성 {filled}/{FIELDS.length}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onSave}>저장</button>
      </div>

      {/* 무작위 시드 보조 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, padding: 10, borderRadius: 9, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="🎲" /> 무작위 시드</span>
        <button className="minibtn" onClick={seedEmpty} title="빈 항목만 영감 풀에서 채웁니다(이미 쓴 칸은 보존)">빈 칸 채우기</button>
        <button className="minibtn" onClick={seedAll} title="모든 항목을 새로 굴려 덮어씁니다">전체 굴리기</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>약 {SEED_COMBOS.toLocaleString()}+ 조합</span>
      </div>

      <div style={fieldS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelS}>이름 (비우면 콘셉트로)</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => seedOne('name')} title="이름만 다시"><Emoji e="🎲" /></button>
        </div>
        <input style={inputS} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 서리이빨, 백야조(白夜鳥)" maxLength={80} />
      </div>
      <div style={fieldS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelS}>✦ 한 줄 콘셉트 (선택)</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => seedOne('tagline')} title="콘셉트만 다시"><Emoji e="🎲" /></button>
        </div>
        <input style={inputS} value={editing.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="예: 폭풍이 오기 전날 우는 고산의 영물" maxLength={120} />
      </div>

      {FIELDS.map((f) => (
        <div key={f.key} style={fieldS}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={labelS}><Emoji e={f.icon} /> {f.label}</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => seedOne(f.key)} title={`${f.label}만 다시 굴리기`}><Emoji e="🎲" /></button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{f.hint}</div>
          <textarea style={areaS} value={editing[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.eg} maxLength={1200} />
        </div>
      ))}

      {/* 사용자 정의 항목 — 직접 추가/입력(무작위 생성 안 함) */}
      {editing.custom.map((cf) => (
        <div key={cf.id} style={fieldS}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={labelS}>✚ {cf.label}</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" style={{ padding: '1px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeCustom(cf.id)} title="이 항목 삭제">✕</button>
          </div>
          <textarea style={areaS} value={cf.value} onChange={(e) => setCustomValue(cf.id, e.target.value)} placeholder="직접 적어 주세요" maxLength={1200} />
        </div>
      ))}

      <div style={fieldS}>
        <button className="minibtn" onClick={addCustom} title="원하는 항목을 직접 추가합니다(직접 입력)">＋ 항목 추가</button>
      </div>

      {/* 고정 '기타' 자유 입력 — 항상 표시 */}
      <div style={fieldS}>
        <div style={labelS}>기타 (자유 입력)</div>
        <textarea style={{ ...areaS, minHeight: 90 }} value={editing.etc} onChange={(e) => set('etc', e.target.value)} placeholder="위 항목에 담기 어려운 내용을 자유롭게 적어 주세요" maxLength={4000} />
      </div>

      <div style={fieldS}>
        <div style={labelS}><Emoji e="🗒️" /> 메모 (선택)</div>
        <textarea style={areaS} value={editing.notes} onChange={(e) => set('notes', e.target.value)} placeholder="아이디어, 변종, 등장 장면, 미해결 질문 등" maxLength={1000} />
      </div>
    </div>
  )
}

// ── 상세보기 ──
function DetailView(props: {
  c: Creature
  onEdit: () => void
  copyText: (t: string, label?: string) => void
  onToProject: () => void
  onToLibrary: () => void
}) {
  const { c, onEdit, copyText, onToProject, onToLibrary } = props
  const linked = hasProjectBridge()
  const valS: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{c.name}</strong>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => copyText(exportOne(c), '복사됨')} title="이 생물을 텍스트로 복사">복사</button>
        <button className="btn-primary" onClick={onEdit}><Emoji e="✏️" /> 수정</button>
      </div>
      {c.tagline.trim() && <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>{c.tagline}</div>}

      {FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}><Emoji e={f.icon} /> {f.label}</div>
          <div style={valS}>{c[f.key].trim() ? c[f.key] : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
        </div>
      ))}

      {c.custom.filter((cf) => cf.value.trim()).map((cf) => (
        <div key={cf.id} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}>✚ {cf.label.trim() || '항목'}</div>
          <div style={valS}>{cf.value}</div>
        </div>
      ))}

      {c.etc.trim() && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
          <div style={{ ...labelS, marginBottom: 6 }}>기타</div>
          <div style={valS}>{c.etc}</div>
        </div>
      )}

      {c.notes.trim() && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelS}><Emoji e="🗒️" /> 메모</div>
          <div style={valS}>{c.notes}</div>
        </div>
      )}

      {/* 프로젝트·라이브러리 연계 */}
      <div className="linkbar" style={{ marginTop: 16 }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={onToProject}
          disabled={!linked}
          title={linked ? '이 생물을 프로젝트 자료(생물 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={onToLibrary}
          title="인물(생물) 라이브러리에 저장 — 인물 시트·관계도 등에서 모델로 재사용"
        ><Emoji e="🧬" /> 생물 라이브러리</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
        약점과 먹이·천적이 분명할수록 생물은 더 살아 있는 존재가 됩니다. 능력에는 반드시 한계를 함께 두세요.
      </div>
    </div>
  )
}
