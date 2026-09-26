// 호러·공포 캐릭터 생성기 — 이 장르의 인물 원형×역할×동기×결점×관계 슬롯을 무작위 조합.
// 슬롯별 🔒 잠금 + 부분 재생성, 조합수 표시(1조+). 외부 API 없이 로컬 SVG 초상 생성.
// 연계: 인물 시트로 보내기 · 인물 라이브러리 저장 · 프로젝트(자료 › 인물) 카드 추가(바인더+DB 실시간).
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, type SharedCharacter, Emoji } from './linkbus'

export const meta = { id: 'horror-charforge', name: '공포 인물 생성기', icon: '🩸', group: '캐릭터', genre: '호러·공포', intro: '호러 원형×역할×동기×결점×관계·금기를 조합해 “무서운 이야기 속 인물”을 만든다', w: 580, h: 680 }

// ── 호러 특화 데이터(원형/역할/동기/결점/관계/비밀/예감 등) ──
// 슬래셔의 final girl, 우주적 공포의 광인, 포크호러의 토착민, J호러의 원혼 등 장르 코드 반영.
const NAMES_KO = ['윤서', '하진', '도경', '서린', '민하', '재이', '연우', '시현', '주안', '예원', '한결', '소운', '가람', '단우', '비단', '해랑']
const SURNAME_KO = ['김', '이', '박', '최', '정', '강', '조', '윤', '한', '서', '신', '문', '남', '구', '백', '천']
const NAMES_EN = ['Mara', 'Cole', 'Iris', 'Doran', 'Vesper', 'Lena', 'Sable', 'Quinn', 'Ada', 'Roan', 'Nell', 'Magnus', 'Cora', 'Eli']
const NICK = ['', '“미친 의사”', '“마지막 생존자”', '“돌아온 자”', '“웃는 이웃”', '“그 집 아이”', '“이름 없는 손님”', '“보지 못한 자”', '“열세 번째”', '“그날의 목격자”']

const P = {
  // 인물 원형(장르 정체성의 핵심 슬롯)
  archetype: [
    '마지막 생존자(파이널 걸/보이)', '신뢰할 수 없는 화자', '금기를 어긴 호기심꾼', '집착하는 학자·조사자',
    '미쳐가는 목격자', '아무도 안 믿어주는 경고자', '회의주의자(끝내 당하는)', '저주를 옮기는 매개자',
    '죄를 지어 먼저 죽는 자', '괴물에 매혹된 자', '구원자를 가장한 진짜 적', '빙의된/잠식당하는 인물',
    '돌아온 죽은 자', '대물림된 가문의 후예', '의식을 집전하는 사제·무당', '실종자를 찾는 가족',
    '폐쇄 공동체의 토착민', '괴물 사냥꾼(망가진)', '마을의 비밀을 아는 노인', '관찰만 하는 유령',
  ],
  // 표층 역할(서사 기능)
  role: ['주인공(시점)', '동행자·조력자', '적대 존재(인간)', '괴물·초자연 존재', '멘토·전문가', '미끼·희생양', '배신자', '회의주의자', '아이(취약/매개)', '권위자(무력한)', '구원자(가짜)', '관찰자·기록자'],
  // 인간상 외형(호러 톤)
  age: ['10대 초반', '10대 후반', '20대', '30대', '40대', '50대 이상', '나이를 알 수 없는'],
  build: ['수척하고 핏기 없는', '평범해서 더 섬뜩한', '병약하고 야윈', '기괴하게 큰', '구부정한', '단정하지만 어딘가 어긋난', '늘 떨고 있는', '미동도 없는'],
  face: [
    '0.5초 늦게 짓는 미소', '표정이 아예 없는 얼굴', '늘 젖어 있는 머리카락', '한쪽만 충혈된 눈', '실밥 같은 흉터로 덮인 뺨',
    '검은자위가 번진 눈', '입꼬리가 과하게 올라간', '눈을 깜빡이지 않는', '창백한 낯빛에 푸른 핏줄', '늘 그늘져 보이는 눈가', '낡은 사진 속 얼굴 그대로',
  ],
  voice: ['속삭이듯 낮은', '아이처럼 들뜬(어른인데)', '한 박자 늦게 대답하는', '울먹임이 섞인', '감정 없는 평탄한', '여러 목소리가 겹쳐 들리는', '존댓말이 지나치게 정중한', '말끝이 긁히는'],
  // 동기(욕망/목적)
  motive: [
    '실종된 가족을 되찾으려', '저주를 누군가에게 떠넘겨 살아남으려', '진실을 끝내 밝히려', '망자를 되살리려',
    '금지된 지식을 손에 넣으려', '죄를 속죄하려', '복수를 완성하려', '그저 이 집에서 빠져나가려',
    '괴물과 하나가 되려', '의식을 완성해 무언가를 부르려', '아이를(또는 자신을) 지키려', '잊힌 기억을 되찾으려',
    '대물림된 저주를 끊으려', '마을의 비밀을 지키려', '신께(또는 그것에게) 제물을 바치려',
  ],
  // 결점(파멸을 부르는 약점)
  flaw: [
    '치명적인 호기심', '오만한 회의주의', '죄책감에 잠식됨', '아무도 못 믿는 편집증', '술·약에 의존',
    '거짓말로 진실을 가림', '겁이 많아 결정적 순간 도망', '집착적 미련', '자기 눈조차 못 믿음', '타인을 미끼로 삼는 비겁함',
    '과거에 갇혀 현재를 못 봄', '경고를 무시하는 고집', '죽음을 두려워해 무엇이든 함',
  ],
  // 가장 깊은 두려움(공포가 파고드는 지점)
  fear: ['혼자 남겨지는 것', '자기 몸이 자기 것이 아니게 되는 것', '사랑하는 이가 ‘바뀌어’ 돌아오는 것', '어둠 속의 시선', '잊히는 것', '미쳐버리는 것', '자신이 이미 죽었을 가능성', '거울 속의 자신', '되돌릴 수 없는 선택', '소리 없는 정적'],
  // 비밀(반전·복선 재료)
  secret: [
    '이미 한 번 죽었다(혹은 죽어 있다)', '저주를 처음 옮긴 게 자신이다', '가족 중 하나가 인간이 아니다', '과거의 사고로 누군가를 버렸다',
    '괴물의 정체를 처음부터 알고 있었다', '의식의 마지막 제물로 점지되어 있다', '거울/사진 속 존재와 거래했다', '기억이 통째로 조작되었다',
    '이 마을 출신이며 도망쳤었다', '몸 안에 무언가가 자라고 있다', '구원자가 아니라 함정을 놓는 자다', '자신이 곧 괴물이 될 것을 안다',
  ],
  // 관계(다른 인물·존재와의 끈)
  relation: [
    '죽은 가족의 환영에 매여 있다', '괴물에게 빚(혹은 거래)이 있다', '함께 온 일행을 불신한다', '아이를 보호하려 한다',
    '멘토를 의심하기 시작했다', '연인이 이미 잠식당했다', '마을 사람 모두와 공범이다', '유일하게 믿던 이에게 배신당한다',
    '자신만 보이는 존재와 대화한다', '형제·자매의 죽음에 책임이 있다', '낯선 노인의 경고를 받았다', '거울 속 또 다른 자신과 연결돼 있다',
  ],
  // 운명·생존 전망(슬래셔 도덕률/인과)
  fate: ['끝까지 살아남아 반격한다', '거짓 승리 후 마지막에 당한다', '저주를 다음 사람에게 넘기고 떠난다', '자신을 희생해 막는다', '미쳐버린 채 살아남는다', '괴물이 되어 합류한다', '진실을 안 순간 사라진다', '아무도 그의 최후를 모른다'],
  // 첫 균열의 징조(드레드/언캐니 — 이 인물 주변에서 일어나는 이상)
  omen: [
    '문을 두드리는 소리가 늘 셋이다', '거울 속 그의 동작이 0.5초 늦다', '사진에서 점점 사라진다', '동물이 그를 보면 도망친다',
    '같은 시각에 같은 자리에 서 있다', '젖은 발자국이 그를 따라온다', '그가 부르면 전화가 끊긴다', '그의 방만 늘 차갑다',
    '아무도 그의 어린 시절을 기억 못 한다', '거울·물웅덩이에 비치지 않는다', '한밤중 천장에서 그의 목소리가 난다', '그가 웃으면 전등이 깜빡인다',
  ],
  // 일상 습관(취약함을 각인하는 디테일)
  habit: ['끊임없이 뒤를 돌아본다', '손등에 같은 단어를 적는다', '문을 세 번 확인한다', '거울을 천으로 덮는다', '혼잣말로 누군가와 다툰다', '약을 한 줌씩 삼킨다', '낡은 일기를 끝없이 읽는다', '소금을 문턱에 뿌린다', '시계를 자꾸 들여다본다', '벽을 따라서만 걷는다'],
  // 소지품(매체·물건을 통한 침투)
  item: ['저주가 복사된 비디오테이프', '죽은 이의 일기장', '한쪽만 남은 낡은 사진', '깨진 손거울', '눈이 텅 빈 인형', '녹슨 묵주·부적', '꺼지지 않는 라디오', '말라붙은 핏자국 손수건', '봉인된 편지', '오래된 자장가가 든 오르골'],
  // 출몰·결박된 장소(이 인물이 매여 있는 공간 — 명사구, 다른 슬롯과 독립)
  haunt: [
    '문이 안에서만 잠기는 폐가', '환자가 사라진 정신병원 별관', '안개가 걷히지 않는 외딴 어촌', '아무도 내려가지 않는 지하 예배당',
    '늘 한 칸이 빈 야간 열차', '시계가 멈춰 선 낡은 호텔', '물이 차오르는 폐광 갱도', '졸업생이 돌아오지 않는 기숙학교',
    '제사가 끊이지 않는 산속 종갓집', '불이 꺼지지 않는 심야 편의점', '눈이 멈추지 않는 산장', '되돌아오게 되는 숲길의 갈림목',
    '간판이 바뀌어 있는 옛 극장',
  ],
  // 침입의 시간대(공포가 새어 드는 때 — 부사적 명사구, 독립 슬롯)
  hour: [
    '새벽 세 시 정각', '해가 막 진 직후의 푸른 시간', '정전이 잦은 한밤중', '안개가 가장 짙은 동트기 전',
    '아무도 깨어 있지 않은 자정', '점심 무렵의 텅 빈 정적', '비가 그친 직후의 적막', '달이 가려진 그믐밤',
  ],
}

type ArrKey = Exclude<keyof typeof P, never>
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function randName(): string {
  const r = Math.random()
  const nick = Math.random() < 0.45 ? pick(NICK) : ''
  let base: string
  if (r < 0.6) base = pick(SURNAME_KO) + pick(NAMES_KO)
  else if (r < 0.85) base = pick(NAMES_KO)
  else base = pick(NAMES_EN)
  return nick ? `${base} ${nick}` : base
}

interface Gen {
  seed: number
  name: string
  archetype: string; role: string
  age: string; build: string; face: string; voice: string
  motive: string; flaw: string; fear: string; secret: string
  relation: string; fate: string; omen: string; habit: string; item: string
  haunt: string; hour: string
}
type SlotKey = keyof Omit<Gen, 'seed'>

function genOne(): Gen {
  return {
    seed: ri(1e9),
    name: randName(),
    archetype: pick(P.archetype), role: pick(P.role),
    age: pick(P.age), build: pick(P.build), face: pick(P.face), voice: pick(P.voice),
    motive: pick(P.motive), flaw: pick(P.flaw), fear: pick(P.fear), secret: pick(P.secret),
    relation: pick(P.relation), fate: pick(P.fate), omen: pick(P.omen), habit: pick(P.habit), item: pick(P.item),
    haunt: pick(P.haunt), hour: pick(P.hour),
  }
}

// 조합수: 무작위로 뽑히는 모든 슬롯 풀의 곱(1조+ 지향)
const COMBOS = (P.archetype.length * P.role.length * P.age.length * P.build.length * P.face.length * P.voice.length
  * P.motive.length * P.flaw.length * P.fear.length * P.secret.length
  * P.relation.length * P.fate.length * P.omen.length * P.habit.length * P.item.length
  * P.haunt.length * P.hour.length)

const ROWS: { k: SlotKey; label: string; full?: boolean }[] = [
  { k: 'name', label: '이름' },
  { k: 'archetype', label: '원형', full: true },
  { k: 'role', label: '역할' },
  { k: 'age', label: '나이' }, { k: 'build', label: '체격' },
  { k: 'face', label: '얼굴', full: true },
  { k: 'voice', label: '목소리' },
  { k: 'motive', label: '동기', full: true },
  { k: 'flaw', label: '치명적 결점' },
  { k: 'fear', label: '가장 깊은 두려움', full: true },
  { k: 'secret', label: '비밀', full: true },
  { k: 'relation', label: '관계', full: true },
  { k: 'fate', label: '운명·생존' },
  { k: 'omen', label: '첫 균열의 징조', full: true },
  { k: 'haunt', label: '결박된 장소', full: true },
  { k: 'hour', label: '침입의 시간대' },
  { k: 'habit', label: '습관' }, { k: 'item', label: '소지품' },
]
function valStr(g: Gen, k: SlotKey): string { return String(g[k]) }

// 외부 API 없이 만드는 로컬 SVG 초상(시드 기반, 음산한 실루엣) — data URI
function avatarUrl(g: Gen): string {
  let h = g.seed >>> 0
  for (let i = 0; i < g.name.length; i++) h = (h * 31 + g.name.charCodeAt(i)) >>> 0
  const hue = h % 360
  const eyeY = 38 + (h >> 3) % 8
  const eyeDx = 13 + (h >> 6) % 6
  const mouthW = 8 + (h >> 9) % 16
  const droop = (h >> 12) % 6
  const bg1 = `hsl(${hue},22%,9%)`, bg2 = `hsl(${(hue + 40) % 360},28%,16%)`
  const skin = `hsl(${(hue + 200) % 360},10%,${20 + (h >> 4) % 12}%)`
  const eye = `hsl(${(hue + 10) % 360},80%,${52 + (h >> 5) % 18}%)`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>`
    + `<defs><radialGradient id='g' cx='50%' cy='35%' r='75%'><stop offset='0%' stop-color='${bg2}'/><stop offset='100%' stop-color='${bg1}'/></radialGradient></defs>`
    + `<rect width='100' height='100' fill='url(#g)'/>`
    + `<ellipse cx='50' cy='58' rx='26' ry='32' fill='${skin}'/>`
    + `<path d='M30 30 Q50 8 70 30 Q66 22 50 20 Q34 22 30 30' fill='hsl(${hue},18%,6%)'/>`
    + `<ellipse cx='${50 - eyeDx}' cy='${eyeY}' rx='5' ry='3.6' fill='#0a0a0a'/>`
    + `<ellipse cx='${50 + eyeDx}' cy='${eyeY}' rx='5' ry='3.6' fill='#0a0a0a'/>`
    + `<circle cx='${50 - eyeDx}' cy='${eyeY}' r='1.8' fill='${eye}'/>`
    + `<circle cx='${50 + eyeDx}' cy='${eyeY}' r='1.8' fill='${eye}'/>`
    + `<path d='M${50 - mouthW} ${72 + droop} Q50 ${74 - droop} ${50 + mouthW} ${72 + droop}' stroke='#1a0606' stroke-width='2' fill='none'/>`
    + `<rect width='100' height='100' fill='black' opacity='0.12'/>`
    + `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export default function HorrorCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [toast, setToast] = useState('')
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const savedRef = useRef(false)

  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim()
    if (!label) return
    setCustom((c) => [...c, { id: 'c' + Date.now().toString(36) + ri(1e6).toString(36), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((c) => c.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((it) => it.id !== id))
  // 사용자 정의 항목 + 기타를 fields 맵에 합친다(값이 비어있지 않을 때만). 라벨이 기본 키와 겹치면 덮어쓰지 않는다.
  const mergeExtraFields = (base: Record<string, string>): Record<string, string> => {
    const out = { ...base }
    for (const it of custom) { const v = it.value.trim(); if (v && !(it.label in out)) out[it.label] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }

  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      return next
    })
    // 사용자 정의 항목의 정의(이름)는 유지하되 값은 비운다. 기타도 비운다.
    setCustom((c) => c.map((it) => ({ ...it, value: '' })))
    setEtc('')
    savedRef.current = false
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    if (k === 'name') return { ...prev, name: randName() }
    const fresh = genOne()
    return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1700) }

  const toCharacterFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.archetype} · ${g.role}`,
    age: g.age,
    appearance: `${g.build} · 얼굴: ${g.face} · 목소리: ${g.voice}`,
    personality: `원형: ${g.archetype} · 치명적 결점: ${g.flaw}`,
    habits: `습관: ${g.habit} · 소지품: ${g.item}`,
    background: `관계: ${g.relation} · 운명: ${g.fate} · 결박된 장소: ${g.haunt} · 침입의 시간대: ${g.hour}`,
    goal: g.motive,
    conflict: `가장 깊은 두려움: ${g.fear} · 첫 균열의 징조: ${g.omen}`,
    secret: g.secret,
  })
  // 정규(표준) 캐릭터 키로 1:1 매핑 — 받는 허브(인물 시트)에서 기본 칸에 제자리로 들어가게 한다. 뭉친 값은 분리.
  const toNormalizedFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.archetype} · ${g.role}`,
    age: g.age,
    body: g.build,
    appearance: `${g.build} · ${g.face}`,
    speech: g.voice,
    personality: g.archetype,
    goal: g.motive,
    motivation: g.motive,
    fear: g.fear,
    flaw: g.flaw,
    secret: g.secret,
    habit: g.habit,
    relations: g.relation,
    arc: g.fate,
    background: `소지품: ${g.item} · 결박된 장소: ${g.haunt}`,
    notes: `첫 균열의 징조: ${g.omen} · 침입의 시간대: ${g.hour}`,
  })
  const summaryText = () => {
    const lines = ROWS.map((r) => r.label + ': ' + valStr(g, r.k))
    for (const it of custom) { const v = it.value.trim(); if (v) lines.push(it.label + ': ' + v) }
    const e = etc.trim(); if (e) lines.push('기타: ' + e)
    return lines.join('\n')
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bodyHtml = () => '<h3>' + esc(g.name) + '</h3>'
    + ROWS.filter((r) => r.k !== 'name').map((r) => '<p><b>' + esc(r.label) + '</b>: ' + esc(valStr(g, r.k)) + '</p>').join('')

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), photo: avatarUrl(g), photoCredit: '로컬 생성', fields: mergeExtraFields(toNormalizedFields()) } }); flash('인물 시트로 보냈습니다') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> & { fields?: Record<string, string> } = {
      name: g.name, photo: avatarUrl(g), photoCredit: '로컬 생성', role: `${g.archetype} · ${g.role}`,
      goal: g.motive, secret: g.secret,
      traits: ROWS.filter((r) => r.k !== 'name').map((r) => ({ k: r.label, v: valStr(g, r.k) })),
      fields: mergeExtraFields(toNormalizedFields()),
      source: '공포 인물 생성기',
    }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: mergeExtraFields({ ...toCharacterFields(), ...toNormalizedFields() }),
      bodyHtml: bodyHtml(),
      meta: { 장르: '호러·공포', 원형: g.archetype, 역할: g.role, 나이: g.age, 동기: g.motive, 운명: g.fate },
    })
    if (id) { savedRef.current = true; flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)') }
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // payload 로 reroll 요청 시 1회 재생성
  useMemo(() => { if (payload?.reroll) rollAll() /* eslint-disable-next-line */ }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🩸"/> 호러·공포 인물 — 원형·동기·결점·관계·금기 조합</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={92} height={92} style={{ borderRadius: 12, background: '#0a0a0a', border: '1px solid var(--border)' }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.name}>{g.name}</div>
          <div className="license-note" style={{ marginTop: 2 }}>로컬 초상</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, alignSelf: 'center' }}>
          <b style={{ color: 'var(--text)' }}>{g.archetype}</b> · {g.role}<br />
          {g.age} · {g.build}<br />
          동기: {g.motive}<br />
          <span style={{ color: 'var(--accent)' }}>징조: {g.omen}</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {ROWS.map((r) => (
          <div key={r.k} style={{ gridColumn: r.full ? '1 / -1' : 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', width: r.full ? 92 : 56, flexShrink: 0 }}>{r.label}</span>
            <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={valStr(g, r.k)}>{valStr(g, r.k)}</span>
            <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲"/></button>
          </div>
        ))}

        {/* 사용자 정의 항목 — 직접 입력(무작위 생성 안 함) */}
        {custom.map((it) => (
          <div key={it.id} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 92, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.label}>{it.label}</span>
            <input value={it.value} onChange={(e) => setCustomValue(it.id, e.target.value)} placeholder="직접 입력" style={{ flex: 1, minWidth: 0, fontSize: 11.5, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(it.id)} style={{ padding: '0 3px' }}>✕</button>
          </div>
        ))}

        <div style={{ gridColumn: '1 / -1' }}>
          <button className="minibtn" onClick={addCustom} style={{ fontSize: 11 }}>＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 — 항상 보임 */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>기타</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어 두세요" rows={3} style={{ width: '100%', boxSizing: 'border-box', fontSize: 11.5, lineHeight: 1.5, resize: 'vertical', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 인물 생성</button>
        <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사됨')).catch(() => {}) }}><Emoji e="📋"/> 복사</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄"/> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪"/> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥"/> 인물 라이브러리</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || '“프로젝트에 인물 카드 추가”를 누르면 좌측 바인더(자료 › 인물)와 DB 뷰에 실시간으로 들어갑니다.'}</div>
    </div>
  )
}
