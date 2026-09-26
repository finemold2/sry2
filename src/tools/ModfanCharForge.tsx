// 현대판타지·회귀 캐릭터 생성기 — 이 장르의 인물 원형×역할×동기×결점×관계 슬롯을 조합(1조+).
// 슬롯별 🔒 잠금 + 부분 재생성. 연계: 인물 시트로 보내기 · 인물 라이브러리 저장 · 프로젝트(인물) 카드 추가.
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, type SharedCharacter } from './linkbus'
import { Emoji, emojify } from './linkbus'

export const meta = { id: 'modfan-charforge', name: '현판 회귀 캐릭터 생성기', icon: '⏳', group: '캐릭터', genre: '현대판타지·회귀', intro: '회귀물 특화 인물 원형·역할·동기·결점·관계를 1조+ 조합으로 무작위 생성', w: 580, h: 680 }

// ---------- 장르 특화 슬롯 풀(현대판타지·회귀 도시에 근거) ----------
const P = {
  // 이름(현대 한국 배경)
  surname: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '배', '백', '문', '양', '손'],
  given: ['도진', '시현', '하람', '재인', '연우', '태오', '준서', '서윤', '예성', '지환', '도헌', '세아', '리하', '주아', '온유', '현성', '유진', '한결', '소은', '겸', '범준', '다온', '시우', '하경', '하준', '지호', '서진', '윤재', '채원', '예린'],

  // 회귀 직전(전생) 직업/처지 — 이 장르 직업군 클러스터
  pastLife: [
    '망한 코인에 전 재산을 날린 백수', '데뷔 직전 사고로 은퇴한 비운의 연습생', '재벌가 막내로 무시당하던 한량',
    'S급 게이트에서 동료에게 버려진 F급 헌터', '대형 기획사에서 잘린 무명 작곡가', '부도 직전 중소기업 평사원',
    '승부조작에 휘말려 추방된 프로게이머', '오심 한 번으로 매장된 천재 투수', '논문 도둑맞고 학계에서 쫓겨난 연구원',
    '주가 폭락으로 빚더미에 앉은 펀드매니저', '연재 중단당한 웹소설 작가', '미슐랭 직전 화재로 가게를 잃은 셰프',
    '의료사고 누명을 쓴 외과의', '소속사 노예계약에 묶인 아이돌', '게이트 사태 초기에 가족을 잃은 생존자',
    '대기업 면접에서 번번이 떨어진 취준생', '스타트업이 통째로 탈취당한 개발자', '데이터 조작에 이용당한 트레이더',
    '뒷광고 폭로로 한순간에 몰락한 인플루언서', '간판선수에게 자리를 빼앗긴 만년 후보 선수', '대박 직전 투자가 끊긴 인디 게임 개발자',
    '거대 길드의 들러리로만 굴려진 보조 힐러', '표절 누명에 활동을 접은 일러스트레이터',
  ],

  // 회귀 트리거(죽음/절망의 순간)
  trigger: [
    '동료의 칼에 등을 찔린 채 숨이 끊긴 순간', '빚쟁이에게 쫓기다 옥상에서 발을 헛디딘 순간', '최종 보스 게이트에서 홀로 버려진 순간',
    '교통사고로 의식을 잃기 직전', '배신자의 미소를 마지막으로 본 순간', '폭락한 계좌를 보며 무너진 순간',
    '무대에 서 보지도 못하고 쓰러진 순간', '누명을 쓰고 수감되던 호송차 안에서', '병상에서 가족의 부고를 들은 순간',
    '대지진의 잔해 아래 깔린 순간', '독이 든 축하주를 들이켠 직후', '제 손으로 키운 길드에 의해 토사구팽당한 순간',
    '브레이크가 듣지 않는 차 안에서 핸들을 꺾던 순간', '무너지는 던전 천장을 올려다보던 순간', '협박 영상이 전국에 송출되던 순간',
  ],

  // 회귀 시점(돌아간 과거)
  arrivedAt: [
    '코인 광풍이 불기 직전인 20대 초반', '데뷔 오디션 3일 전의 연습생 시절', '재벌가 후계 구도가 짜이기 전 고등학생 때',
    '최초의 게이트가 열리기 일주일 전', '운명의 면접을 보던 그날 아침', '스타트업 창업 자금을 모으던 휴학생 시절',
    '망작이 될 데뷔작을 쓰기 직전의 신인 작가', '첫 프로 입단 테스트를 앞둔 무명 시절', '논문을 도둑맞기 전날 밤',
    '가족이 아직 모두 살아있던 그 겨울', '각성 적성검사를 받기 직전의 학생', '소속사와 노예계약서에 도장 찍기 한 시간 전',
  ],

  // 메타지식(미래 정보) 유형 — 장르 엔진
  metaKnow: [
    '특정 코인·종목의 떡상 타이밍을 전부 기억함', '아직 무명인 미래의 대스타가 누구인지 안다', '게이트 출현일과 등급을 통째로 외우고 있다',
    '대박 날 시나리오·노래·웹툰을 미리 알고 있다', '누가 배신자이고 누가 떡잎인지 다 안다', '저평가된 부동산·매물의 미래 가치를 안다',
    '대지진·금융위기 등 거시 사건의 날짜를 안다', '경쟁자의 미래 작품과 약점을 통째로 안다', '아직 발견 안 된 마수의 약점을 안다',
    '미래에 폭로될 거물들의 비리를 전부 안다', 'IPO·인수합병 타임라인을 외우고 있다', '히트할 기술 트렌드를 한발 앞서 안다',
    '대형 사고·재난의 발생 장소와 시각을 안다', '미래에 떠오를 신생 길드와 그 핵심 멤버를 안다',
  ],

  // 직업 클러스터(이번 생에서 다시 잡은 길)
  job: [
    '헌터(각성자)', '아이돌·연습생', '주식·펀드 트레이더', '재벌가 후계자', '웹소설 작가', '작곡가·프로듀서',
    '프로게이머', '프로야구 선수', '셰프·요리사', '벤처 창업가', '외과의', 'AI·게임 개발자',
    '연예기획사 대표', '길드 마스터', '드라마 PD', '경매·부동산 큰손', '천재 연구원', '구단주',
  ],

  // 각성/특기 — 헌터 혼합형 + 직업 능력
  awakening: [
    '시간을 짧게 되감는 EX급 권능', '상대의 미래 한 수를 읽는 직감', '한 번 본 것은 잊지 않는 완전기억',
    '재능 모방(보는 즉시 익힘)', 'S급 검술과 위장된 F급 스탯', '치유 계열 각성(들키면 안 되는)',
    '숫자·차트를 직관으로 꿰뚫는 감각', '절대음감과 작곡 영감', '미각·후각이 비정상적으로 예민함',
    '체력·집중력만 비정상적으로 높음', '시스템 창이 본인에게만 보임', '특정 분야의 전생 숙련도가 그대로 남음',
    '위기 시 발동하는 분기 예지', '인맥·정보를 끌어당기는 운',
  ],

  // 인물 원형(이 장르 고유 캐릭터 결)
  archetype: [
    '재능을 숨기고 때를 기다리는 회귀자', '미래를 아는 척 위장한 선지자형', '복수의 칼날을 가는 냉혈한',
    '가족을 지키려는 따뜻한 회귀자', '실력은 최강이나 F급으로 위장한 흑막', '한때 정상이었다가 추락 후 돌아온 베테랑',
    '치트를 쓰면서도 노력파를 가장하는 자', '두 번째 인생은 다르게 살려는 자', '미래 거물을 미리 포섭하는 수완가',
    '전생의 죄책감에 짓눌린 속죄자', '냉소적이지만 결정적 순간 의리 있는 자', '겉은 평범, 속은 베테랑인 능청형',
  ],

  // 역할(서사상 위치)
  role: ['주인공(회귀자)', '동료 회귀자', '전생의 원수', '미래의 거물(아직 무명)', '의심하는 라이벌', '회귀를 눈치챈 예지자',
    '지켜야 할 가족', '배신할 운명의 동료', '진짜 흑막', '주인공을 시험하는 멘토', '정보전의 적 회귀자', '재능을 알아본 조력자'],

  // 1차 동기(왜 다시 사는가)
  motiveCore: [
    '나를 죽인 그놈을 이번엔 먼저 짓밟기', '못 지킨 가족을 이번엔 반드시 지키기', '망친 인생을 처음부터 다시 설계하기',
    '전생에 놓친 종목·인재를 선점해 정상에 서기', '나를 버린 길드/소속사를 거꾸로 무너뜨리기', '데뷔조차 못 했던 무대에 반드시 서기',
    '전생의 누명을 풀고 진실을 밝히기', '사라질 운명인 사람을 살려내기', '두 번째 인생만큼은 평범하고 행복하게 살기',
    '세상을 망칠 대재앙을 미리 막기', '나를 이용한 거물들의 비리를 청산하기', '전생의 스승·은인에게 진 빚을 갚기',
  ],

  // 결점(이 장르 특화 — 미래지식자의 약점)
  flaw: [
    '미래를 안다는 오만에 방심함', '아는 미래에 집착해 변화를 못 받아들임', '들킬까 봐 늘 거짓말을 쌓아감',
    '복수에 눈이 멀어 사람을 잃음', '전생의 트라우마로 결정적 순간 얼어붙음', '혼자 다 짊어지려는 고립벽',
    '의심병 — 아무도 못 믿음', '조급증 — 결과를 너무 빨리 보려 함', '죄책감에 스스로를 벌함',
    '감정을 숨기다 진심을 못 전함', '미래지식 없으면 무너지는 의존', '과거의 무능했던 자아를 혐오함',
  ],

  // 위장(미래지식·실력을 어떻게 숨기나)
  cover: [
    '"운이 좋았을 뿐"으로 둘러댄다', '천재인 척 능청을 떤다', '예지력·직감으로 포장한다',
    '데이터·분석 덕이라고 설명한다', '점·사주를 핑계 댄다', 'F급/무능으로 위장해 방심을 유도한다',
    '우연한 정보 입수로 꾸며댄다', '오랜 덕질·취미 덕이라 한다', '꿈에서 봤다고 농담처럼 흘린다', '아예 아무 설명도 안 하고 침묵한다'],

  // 비밀(들키면 안 되는 것)
  secret: [
    '회귀자라는 사실 그 자체', '전생에 저지른 돌이킬 수 없는 선택', '각성 등급을 일부러 숨기고 있다는 것',
    '이미 죽었던 사람이라는 것', '특정 거물의 미래 몰락을 알고 있다는 것', '동료 중에 또 다른 회귀자가 있다는 것',
    '미래지식이 점점 안 맞기 시작했다는 것', '복수 대상이 사실 한때의 은인이었다는 것', '능력의 대가로 수명이 깎이고 있다는 것',
    '전생의 적과 손잡았던 과거', '가족의 죽음을 막기 위해 더 큰 희생을 숨긴 것'],

  // 말투/톤
  speech: ['담담하지만 핵심을 찌르는', '능청스럽고 농담조인', '냉소가 배인 시니컬한', '예의 바른 존댓말의',
    '속을 안 드러내는 무덤덤한', '결정적일 때만 날카로워지는', '자조 섞인', '확신에 찬 단호한', '다정하지만 어딘가 슬픈', '거침없이 직설적인'],

  // 버릇/디테일
  habit: ['뉴스·차트를 강박적으로 확인함', '날짜를 손으로 꼽아 셈', '혼잣말로 "이번엔 다르다"를 되뇜',
    '중요한 날을 수첩에 적어둠', '거울 속 젊어진 자신을 자주 들여다봄', '위기 때 전생의 죽음을 회상함',
    '낯선 미래를 만나면 멈칫함', '가족 사진을 자주 들여다봄', '습관처럼 미래의 사건을 입에 올렸다 삼킴', '동전을 튕기며 결정을 미룸'],

  // 관계(타 인물과의 핵심 연결) — 관계 슬롯
  relation: [
    '전생에 나를 죽인 자를 지금은 동료로 곁에 둠', '미래의 대스타를 아직 무명일 때 거둠', '전생의 가족을 다시 만나 못 다한 효를 함',
    '나를 버렸던 길드장을 거꾸로 부하로 만듦', '또 다른 회귀자와 미래 정보를 두고 신경전', '전생의 연인을 이번엔 모르는 척 멀리함',
    '전생의 스승에게 은혜를 미리 갚으려 함', '배신할 운명의 동료를 미리 알고 거리를 둠', '나를 의심하는 라이벌과 미묘한 동맹',
    '미래의 흑막을 친구인 척 곁에서 감시함', '죽을 운명인 동생을 살리려 곁을 지킴', '예지자에게 회귀를 들켜 약점을 잡힘'],

  // 체크리스트형 1차 목표(회귀 직후 할 일)
  firstMove: [
    '저평가된 그 종목을 전 재산으로 매수한다', '데뷔 오디션에 미래의 명곡을 들고 나간다', '게이트가 열릴 장소를 미리 선점한다',
    '망할 걸 아는 사업에서 발을 뺀다', '미래의 천재를 면접에서 미리 점찍는다', '곧 폭로될 거물의 약점을 먼저 확보한다',
    '대박 날 시나리오를 먼저 등록한다', '곧 떠날 가족을 붙잡아 둔다', '전생의 사망 사고를 회피할 동선을 짠다',
    '경매에 나올 미래의 보물을 노린다', 'F급으로 위장해 적의 방심을 산다', '미래의 파트너에게 미리 접근한다'],

  // 결정적 한 줄 대사
  oneLiner: [
    '"이번엔 다르다. 같은 실수는 반복하지 않아."', '"그래, 이 날이었지. 아직 늦지 않았다."', '"나는 미래를 알고 있다."',
    '"전생의 나라면 몰랐겠지만… 지금은 다르지."', '"이 종목, 이 사람, 이 날짜. 전부 기억하고 있다."', '"두 번째 기회를 헛되이 쓰진 않아."',
    '"네가 나를 배신할 거란 걸, 난 이미 알고 있어."', '"익숙한 천장이군. …돌아왔구나."', '"이번 생은 내가 지킨다."',
    '"운이 좋았을 뿐입니다." (속으론, 다 알고 있었지만.)', '"아직 그 일이 일어나기 전이라 다행이야."', '"무능했던 그때의 나는, 이제 없다."'],
}

// 조합수 계산용 핵심 슬롯(이름은 별도 곱)
const COMBOS = P.given.length * P.surname.length
  * P.pastLife.length * P.trigger.length * P.arrivedAt.length * P.metaKnow.length
  * P.job.length * P.awakening.length * P.archetype.length * P.role.length
  * P.motiveCore.length * P.flaw.length * P.cover.length * P.secret.length
  * P.relation.length * P.firstMove.length

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }

interface Gen {
  seed: number
  name: string; age: number; gender: string
  pastLife: string; trigger: string; arrivedAt: string; metaKnow: string
  job: string; awakening: string; archetype: string; role: string
  motiveCore: string; flaw: string; cover: string; secret: string
  speech: string; habit: string; relation: string; firstMove: string; oneLiner: string
}
type SlotKey = keyof Omit<Gen, 'seed'>

function genOne(): Gen {
  return {
    seed: ri(1e9),
    name: pick(P.surname) + pick(P.given), age: 17 + ri(22), gender: pick(['남성', '여성', '비공개']),
    pastLife: pick(P.pastLife), trigger: pick(P.trigger), arrivedAt: pick(P.arrivedAt), metaKnow: pick(P.metaKnow),
    job: pick(P.job), awakening: pick(P.awakening), archetype: pick(P.archetype), role: pick(P.role),
    motiveCore: pick(P.motiveCore), flaw: pick(P.flaw), cover: pick(P.cover), secret: pick(P.secret),
    speech: pick(P.speech), habit: pick(P.habit), relation: pick(P.relation), firstMove: pick(P.firstMove), oneLiner: pick(P.oneLiner),
  }
}

const ROWS: { k: SlotKey; label: string }[] = [
  { k: 'name', label: '이름' }, { k: 'age', label: '나이' }, { k: 'gender', label: '성별' },
  { k: 'archetype', label: '원형' }, { k: 'role', label: '역할' }, { k: 'job', label: '직업' },
  { k: 'pastLife', label: '전생 처지' }, { k: 'trigger', label: '회귀 트리거' }, { k: 'arrivedAt', label: '회귀 시점' },
  { k: 'metaKnow', label: '미래 지식' }, { k: 'awakening', label: '각성·특기' },
  { k: 'motiveCore', label: '동기' }, { k: 'flaw', label: '결점' }, { k: 'cover', label: '위장' }, { k: 'secret', label: '비밀' },
  { k: 'relation', label: '핵심 관계' }, { k: 'firstMove', label: '회귀 첫 수' },
  { k: 'speech', label: '말투' }, { k: 'habit', label: '버릇' }, { k: 'oneLiner', label: '대표 대사' },
]

function valStr(g: Gen, k: SlotKey): string {
  if (k === 'age') return g.age + '세'
  return String(g[k])
}

export default function ModfanCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [toast, setToast] = useState('')
  const savedRef = useRef(false)
  const genreLabel = (typeof payload?.genre === 'string' && payload.genre) || meta.genre

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1800) }

  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      return next
    })
    // 사용자 정의 항목은 정의(이름)는 유지하되 값만 비운다. '기타'도 비운다.
    setCustom((cs) => cs.map((c) => ({ ...c, value: '' })))
    setEtc('')
    savedRef.current = false
  }

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim()
    if (!label) return
    setCustom((cs) => [...cs, { id: 'c' + Date.now() + '-' + ri(1e6), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((cs) => cs.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((cs) => cs.filter((c) => c.id !== id))

  // 비어있지 않은 사용자 정의 항목 + 기타를 fields 맵에 병합(라벨 그대로 키, etc 는 'etc')
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) { const v = c.value.trim(); if (c.label.trim() && v) out[c.label.trim()] = v }
    if (etc.trim()) out.etc = etc.trim()
    return out
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    const fresh = genOne()
    return { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const copy = (text: string, msg = '복사됨') => { navigator.clipboard?.writeText(text).then(() => flash(msg)).catch(() => {}) }

  // 정규 캐릭터 필드(linkbus CHARACTER_FIELDS 표준 키) — 받는 허브에서 제자리 칸에 들어가게 함.
  // 뭉친 값은 분리(나이/성별, 직업/원형 등), 매핑 애매한 항목은 notes 로.
  const toCanonicalFields = (): Record<string, string> => ({
    name: g.name,
    role: g.role,
    gender: g.gender,
    age: `${g.age}세`,
    occupation: g.job,
    appearance: `각성·특기: ${g.awakening}`,
    personality: `${g.archetype} · 위장: ${g.cover}`,
    goal: g.firstMove,
    motivation: g.motiveCore,
    flaw: g.flaw,
    secret: g.secret,
    speech: g.speech,
    habit: g.habit,
    relations: g.relation,
    background: `전생: ${g.pastLife} / 회귀 트리거: ${g.trigger} / 회귀 시점: ${g.arrivedAt}`,
    notes: `미래 지식: ${g.metaKnow}\n대표 대사: ${g.oneLiner}`,
    ...extraFields(),
  })

  // 프로젝트/시트용 캐릭터 필드 매핑(기존 키 유지 + 정규 fields 병합)
  const toCharacterFields = (): Record<string, string> => ({
    name: g.name,
    role: g.role,
    age: `${g.age}세 · ${g.gender}`,
    occupation: `${g.job} · ${g.archetype}`,
    appearance: `각성·특기: ${g.awakening}`,
    personality: `${g.archetype} · 말투: ${g.speech} · 버릇: ${g.habit}`,
    background: `전생: ${g.pastLife} / 회귀 트리거: ${g.trigger} / 회귀 시점: ${g.arrivedAt}`,
    goal: g.motiveCore,
    conflict: `결점: ${g.flaw} · 위장: ${g.cover} · 비밀: ${g.secret}`,
    relationships: g.relation,
    metaKnowledge: g.metaKnow,
    firstMove: g.firstMove,
    quote: g.oneLiner,
    genre: genreLabel,
    ...extraFields(),
  })

  const summaryText = () => {
    const base = `[${genreLabel}] ${g.name} (${g.age}세 · ${g.gender})\n`
      + ROWS.filter((r) => r.k !== 'name' && r.k !== 'age' && r.k !== 'gender').map((r) => `· ${r.label}: ${valStr(g, r.k)}`).join('\n')
    const cu = custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => `· ${c.label.trim()}: ${c.value.trim()}`)
    const tail = [...cu, ...(etc.trim() ? [`· 기타: ${etc.trim()}`] : [])]
    return tail.length ? base + '\n' + tail.join('\n') : base
  }

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), fields: toCanonicalFields() }, genre: genreLabel }); flash('인물 시트로 보냈습니다') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name, role: g.role,
      traits: ROWS.filter((r) => r.k !== 'name').map((r) => ({ k: r.label, v: valStr(g, r.k) })),
      goal: g.motiveCore, secret: g.secret, personality: g.archetype,
      notes: g.oneLiner, fields: toCanonicalFields(), source: meta.name,
    }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: { ...toCharacterFields(), ...toCanonicalFields() },
      meta: { 장르: genreLabel, 원형: g.archetype, 역할: g.role, 직업: g.job, 나이: g.age + '세', 성별: g.gender, 회귀시점: g.arrivedAt, 미래지식: g.metaKnow },
    })
    if (id) { savedRef.current = true; flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)') }
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // payload.reroll 로 자동 생성 요청 가능
  useMemo(() => { if (payload?.reroll) rollAll() /* eslint-disable-next-line */ }, [])

  const cell = (r: { k: SlotKey; label: string }, span = 1) => (
    <div key={r.k} style={{ gridColumn: `span ${span}`, display: 'flex', alignItems: 'flex-start', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
      <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 60, flexShrink: 0, paddingTop: 1 }}>{r.label}</span>
      <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, cursor: 'pointer', wordBreak: 'break-word' }} title="클릭하면 복사" onClick={() => copy(valStr(g, r.k))}>{valStr(g, r.k)}</span>
      <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
      <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="⏳" /> {genreLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {/* 헤더 카드 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{g.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{g.age}세 · {g.gender} · {g.role}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>
          {g.archetype} · {g.job}<br />
          전생: {g.pastLife}<br />
          미래 지식: {g.metaKnow}
        </div>
        <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--accent)', marginTop: 5, cursor: 'pointer' }} title="클릭하면 복사" onClick={() => copy(g.oneLiner)}>{g.oneLiner}</div>
      </div>

      {/* 슬롯 그리드 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {cell({ k: 'name', label: '이름' })}
        {cell({ k: 'age', label: '나이' })}
        {cell({ k: 'gender', label: '성별' })}
        {cell({ k: 'archetype', label: '원형' })}
        {cell({ k: 'role', label: '역할' })}
        {cell({ k: 'job', label: '직업' })}
        {cell({ k: 'pastLife', label: '전생 처지' }, 2)}
        {cell({ k: 'trigger', label: '회귀 트리거' }, 2)}
        {cell({ k: 'arrivedAt', label: '회귀 시점' }, 2)}
        {cell({ k: 'metaKnow', label: '미래 지식' }, 2)}
        {cell({ k: 'awakening', label: '각성·특기' }, 2)}
        {cell({ k: 'motiveCore', label: '동기' }, 2)}
        {cell({ k: 'flaw', label: '결점' })}
        {cell({ k: 'cover', label: '위장' })}
        {cell({ k: 'secret', label: '비밀' }, 2)}
        {cell({ k: 'relation', label: '핵심 관계' }, 2)}
        {cell({ k: 'firstMove', label: '회귀 첫 수' }, 2)}
        {cell({ k: 'speech', label: '말투' })}
        {cell({ k: 'habit', label: '버릇' })}
        {cell({ k: 'oneLiner', label: '대표 대사' }, 2)}

        {/* 사용자 정의 항목 — 직접 입력(무작위 생성 안 함). 값은 재생성 시 비워지고 이름은 유지됨. */}
        {custom.map((c) => (
          <div key={c.id} style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-start', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 60, flexShrink: 0, paddingTop: 4 }}>{c.label}</span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="직접 입력"
              style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)} style={{ padding: '0 4px', color: 'var(--muted)' }}>✕</button>
          </div>
        ))}

        {/* ＋ 항목 추가 */}
        <div style={{ gridColumn: 'span 2' }}>
          <button className="minibtn" onClick={addCustom} style={{ padding: '2px 8px' }}>＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>기타</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어두세요 (재생성 시 비워집니다)" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 11.5, lineHeight: 1.5, resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 회귀자 생성</button>
        <button className="minibtn" onClick={() => copy(summaryText(), '인물 시트 복사됨')}><Emoji e="📋" /> 전체 복사</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map', { genre: genreLabel })}><Emoji e="🕸️" /> 관계도</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: genreLabel })}><Emoji e="🔤" /> 이름 믹서</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{emojify(toast || '슬롯을 클릭하면 복사, 🔒로 고정하고 🎲로 부분 재생성합니다. “프로젝트에 인물 카드 추가” 시 좌측 바인더(자료 › 인물)·DB에 실시간 반영됩니다.')}</div>
    </div>
  )
}
