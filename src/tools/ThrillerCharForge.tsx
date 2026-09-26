// 스릴러·서스펜스 캐릭터 생성기 — 이 장르 특유의 인물 원형 × 서브장르 자리 × 직업·역할 × 동기 × 결점 × 비밀 × 신뢰성(언리라이어블) × 핵심 관계(잘못된 신뢰/캣앤마우스) ×
// 트라우마 × 체호프의 총(소지품) × 말투 × 외양 × 위협 노출 슬롯을 무작위 조합(슬롯별 🔒 잠금 + 부분 재생성, 조합수 표시).
// 인물 시트 / 인물 라이브러리 / 프로젝트(자료 › 인물) 연계. react 와 './linkbus' 외 import 금지. 100% 로컬 자작 데이터(장르 특화).
// CRUD 는 localStorage('sry:tool:thriller-charforge'). 언마운트 정리.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'thriller-charforge', name: '스릴러 인물 생성기', icon: '🕵️', group: '캐릭터', genre: '스릴러·서스펜스', intro: '스릴러·서스펜스의 인물 원형·역할·동기·결점·비밀·잘못된 신뢰·체호프의 총을 조합해 긴장감 있는 인물을 생성', w: 600, h: 700 }

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function picks<T>(a: T[], n: number): T[] { const o: T[] = []; const p = [...a]; for (let i = 0; i < n && p.length; i++) o.push(p.splice(ri(p.length), 1)[0]); return o }

// ── 장르 특화 슬롯 풀(스릴러·서스펜스 도시에 근거) ─────────────────────────────

// 인물 원형 — 이 장르 특유의 전형(변주 전제)
const ARCHETYPE = [
  '트라우마를 안고 사는 형사', '한 건만 더 하고 은퇴하려는 베테랑', '누명을 쓰고 쫓기는 보통 사람', '기억을 잃고 자기 정체를 의심하는 자',
  '천재적이고 한발 앞서는 사이코패스 빌런', '겉보기 완벽한 이웃·배우자', '신뢰할 수 없는 화자(거짓·망상·선택적 기억)', '진실에 다가서는 집요한 기자',
  '환멸에 빠진 전직 정보요원', '도덕적 회색지대의 청부업자', '내부고발을 망설이는 내부자', '연쇄범을 쫓는 프로파일러',
  '피해자의 가면을 쓴 가해자', '죽은 줄 알았던 귀환자', '평범함 뒤에 이중생활을 숨긴 자', '복수를 설계하는 생존자',
  '시스템에 버려진 전직 군인·요원', '거짓 알리바이를 가진 용의자', '사건의 유일한 목격자', '정의와 사익 사이의 부패한 권력자',
  '피해자 가족이 직접 추적자가 됨', '감시자본주의에 잠식된 데이터 분석가', '의뢰인의 비밀을 쥔 변호사', '스스로 미끼가 되기로 한 함정 설계자',
  '교활하나 매혹적인 협상가형 인질범', '진실을 알지만 입을 다문 노회한 관계자',
]

// 서브장르(이 인물이 놓인 무대) — 분위기·압박 동반
const SUBGENRE = [
  { k: '심리 스릴러', e: '신뢰할 수 없는 인식과 가스라이팅, 기억의 균열' },
  { k: '도메스틱 스릴러', e: '안전해야 할 집·결혼·이웃이 위협의 근원이 되는 전도' },
  { k: '리걸 스릴러', e: '법정·증거개시·공판 일정이 곧 티킹 클락' },
  { k: '스파이·정치 스릴러', e: '도덕적 회색지대, 안전가옥과 이중첩자의 세계' },
  { k: '수사·법의학 스릴러', e: '연쇄범과 프로파일링, 함정과 반전의 단서 싸움' },
  { k: '액션·추적 스릴러', e: '카운트다운과 끊임없는 추격, 짧은 챕터의 가속' },
  { k: '테크노·생존 스릴러', e: '통제 불능의 기술·재난, 시간과의 사투' },
  { k: '누아르 스릴러', e: '비 내리는 대도시, 부패와 배신, 빠져나올 수 없는 함정' },
  { k: '감시·SNS 스릴러', e: 'CCTV·스마트홈·데이터가 인물을 옭아매는 현대적 공포' },
  { k: '메디컬 스릴러', e: '병원·임상시험·의료기록에 숨은 죽음의 단서' },
  { k: '컨스피러시 스릴러', e: '거대 음모와 은폐, 믿을 수 없는 공식 발표' },
  { k: '심리 호러 스릴러', e: '내면의 공포와 외부의 위협이 겹쳐 경계가 무너짐' },
]

// 서사 역할 (정보 비대칭 설계용 — 누가 무엇을 아는가)
const ROLE = [
  '주인공(추적자)', '만만찮은 적대자(한발 앞선)', '신뢰할 수 없는 화자', '잘못된 조력자(False Ally)', '배신할 파트너',
  '레드 헤링(가짜 용의자)', '진짜 흑막(권위자의 가면)', '희생양·미끼', '결정적 목격자', '죽기 직전 단서를 흘릴 정보원',
  '주인공을 시험하는 멘토', '인질·보호 대상', '내부의 적(가장 가까운 사람)', '복수의 표적', '함정에 빠뜨릴 안내자',
  '진실을 절반만 아는 공모자', '주인공의 거울이 되는 대척점 인물', '사건을 은폐하려는 권력의 대리인', '뒤늦게 정의의 편에 서는 회개자',
]

// 직업·신분 (스릴러 단골)
const JOB = [
  '강력계 형사', '프로파일러', '검시관·법의학자', '탐사보도 기자', '국선·기업 변호사', '검사', '사설탐정',
  '전직 특수요원·NIS', '청부살인업자', '협상 전문가', '심리상담사·정신과의', '간호사', '응급구조사', '보안 컨설턴트',
  '데이터 분석가·해커', '대기업 임원', '교사', '평범한 가정주부·가장', '편집자', '바텐더', '택시·대리 기사',
  '교도관', '보험조사관', '사이버수사관', '잠입 위장요원', '장의사', '약사',
]

// 동기·욕망 (이 장르 특유의 추동력)
const MOTIVE = [
  '사라진 가족·아이를 시한 안에 찾아내기', '누명을 벗고 진범을 밝히기', '딸·아들을 위협에서 지켜내기', '죽은 이의 진실을 끝까지 파헤치기',
  '오래 준비한 완전범죄를 완성하기', '자신을 버린 조직에 복수하기', '협박범의 손아귀에서 벗어나기', '폭로 직전의 진실을 세상에 알리기',
  '연쇄범이 다음 희생자를 내기 전에 멈추기', '잃어버린 기억 속 그날의 진상을 복원하기', '사랑하는 이의 비밀을 끝내 지키거나 캐내기', '재판에서 이겨 의뢰인을 살리거나 처단하기',
  '잠입한 정체가 들통나기 전에 임무를 끝내기', '거대한 음모의 핵심 정보(맥거핀)를 손에 넣기', '평범한 삶으로 돌아가 과거를 묻기', '자신이 범인이 아님을(혹은 맞음을) 스스로 확인하기',
  '빚·약점을 쥔 자를 제거하기', '단 한 사람을 살리는 것이 곧 전부가 되기', '시스템의 부패를 안에서 무너뜨리기', '백미러 속 추격자보다 먼저 국경을 넘기',
]

// 결점·약점 (취약한 주인공/입체적 빌런용)
const FLAW = [
  '술·약에 의존해 판단이 흐려짐', '한 번 의심하면 아무도 못 믿는 편집증', '과거의 실패에 발목 잡힌 죄책감', '욱하는 성미로 결정적 순간 일을 그르침',
  '사람을 너무 쉽게 믿어 배신당함', '진실에 집착해 가족·동료를 잃음', '겁이 많아 결정적 순간 방아쇠를 못 당김', '통제 욕구가 강해 모든 걸 혼자 떠안음',
  '거짓말이 입에 붙어 자기 말도 믿게 됨', '트라우마성 공황으로 위기에서 멈춤', '오만한 자신감이 함정을 못 보게 함', '연민이 많아 적에게 틈을 줌',
  '돈·도박 빚으로 약점이 잡힘', '불면과 환청으로 현실 감각이 무너짐', '복수심에 눈이 멀어 대의를 잊음', '완벽주의가 결정적 지연을 부름',
  '냉정함이 지나쳐 인간관계가 붕괴됨', '과거 연인·가족에게만은 한없이 약해짐',
]

// 비밀 (체호프의 총·반전의 씨앗 — 장르 특화)
const SECRET = [
  '오래전 사고로 한 사람을 죽게 만든 과거', '실은 사건의 진범', '이중 신분·위장된 정체', '죽은 줄 알았던 인물과 내통 중',
  '내부 조직에 심어진 첩자', '치명적 지병·시한부를 숨김', '협박범에게 약점을 잡혀 조종당함', '가짜 알리바이를 위해 위증을 함',
  '피해자와 비밀스런 관계였음', '기억을 조작당했거나 스스로 지움', '가족 중 하나가 연루된 것을 알면서 덮음', '내부고발 자료를 몰래 빼돌려 보관 중',
  '과거에 같은 수법의 범죄를 저지른 적 있음', '실은 추적 대상의 혈육', '거액의 보험금·유산이 걸려 있음', '주인공의 출생·정체의 비밀을 쥐고 있음',
  '복수를 위해 모든 만남을 설계해 접근함', '경찰·언론에 흘린 정보가 모두 거짓임',
]

// 신뢰성·서술 위치 (정보 비대칭의 핵심 입력값)
const RELIABILITY = [
  '신뢰할 수 있는 시점 — 독자 = 인물', '신뢰할 수 없는 화자 — 거짓말로 독자를 속임', '신뢰할 수 없는 화자 — 기억상실·왜곡', '신뢰할 수 없는 화자 — 망상·정신질환',
  '선택적 서술 — 결정적 한 조각을 숨김', '독자가 더 많이 안다(서스펜스) — 인물은 위험을 모름', '독자가 덜 안다(서프라이즈) — 막판 반전의 시점', '음주·약물로 인식이 흐려진 서술자',
  '겉으론 객관적이나 사익이 개입된 서술', '시간선을 뒤섞어 정보를 통제하는 화자',
  '두 인물의 시점을 번갈아 보여 주는 교차 서술', '뒤늦게 진실을 깨닫고 고백하는 회고형 서술',
  '편지·녹취·기록으로만 전해지는 간접 서술', '자신의 죄를 합리화하며 변명하는 가해자 시점',
]

// 핵심 관계 (잘못된 신뢰·캣앤마우스·이중 시점)
const RELATION = [
  '추적자와 표적 — 한발씩 앞서는 캣앤마우스', '믿었던 파트너가 사실은 배신자', '권위자(상사·멘토)가 진짜 흑막', '겉으론 완벽한 부부, 속으론 서로를 의심',
  '피해자 가족과 그를 이용하는 자', '같은 비밀을 쥔 위태로운 공범', '한때의 연인이 이제 적의 편', '서로의 약점을 쥔 협박 관계',
  '구해야 할 인질과 협상하는 자', '쌍둥이·형제로 갈린 선과 악', '정보원과 그를 끝내 지키지 못하는 형사', '잠입자와 그를 신뢰하기 시작한 조직의 우두머리',
  '가스라이팅하는 가해자와 잠식되는 피해자', '서로를 추적하는 두 시점의 화자',
  '서로 다른 비밀을 쥐고 거래하는 위험한 동맹', '한쪽만 진실을 아는 부모와 자식',
]

// 트라우마·과거의 상처 (행동의 뿌리)
const TRAUMA = [
  '눈앞에서 가족을 잃은 기억', '구하지 못한 동료·인질에 대한 죄책감', '어린 시절 학대·방임의 그림자', '잘못된 판단으로 무고한 이를 죽게 함',
  '실종된 가족을 끝내 못 찾은 미결', '폭력·납치 피해의 PTSD', '믿었던 이의 배신으로 무너진 신뢰', '과거 사건의 유일한 생존자라는 부채감',
  '내부고발 후 모든 것을 잃은 경험', '자신이 저지른 죄를 평생 숨겨온 압박', '전장·작전에서의 외상', '사랑하는 이의 자살을 막지 못함',
  '가족을 살리려 한 거짓말이 더 큰 비극을 부른 기억', '수사 중 놓친 단서로 또 다른 희생을 낸 회한',
]

// 체호프의 총 — 초반에 무심히 등장해 클라이맥스에서 회수될 소지품·요소
const GUN = [
  '늘 지니는 낡은 약병(심장약·진정제)', '한쪽만 잘 안 들리는 귀', '특정 음식 알레르기', '잠금이 헐거운 권총의 안전장치',
  '오래된 흉터와 그 사연', '녹음 기능이 켜진 휴대폰', '백업해 둔 USB·클라우드 자료', '잊지 못하는 네 자리 비밀번호',
  '손목의 오래된 시계(멈춰 있음)', '늘 차고 다니는 가족의 유품 목걸이', '습관처럼 만지는 라이터', '차 트렁크 속 비상 가방',
  '집 열쇠의 여벌', '복용을 끊으면 위험한 약', '한 발만 남은 탄창', '몰래 설치된 위치추적기',
  '지문이 묻은 채 버려진 흉기', '날짜가 적힌 빛바랜 사진 한 장', '암호가 걸린 낡은 일기장', '깨진 액정 너머의 마지막 통화 기록',
]

// 말투·화법
const SPEECH = [
  '감정을 누른 짧고 건조한 말', '냉소와 빈정을 섞는 어투', '상대를 떠보며 정보를 캐는 질문형 화법', '부드럽지만 속에 칼을 품은 말씨',
  '속사포처럼 몰아붙이는 심문조', '거짓말을 천연덕스럽게 늘어놓는 말', '논리로 상대를 옭아매는 법정식 변론', '침묵과 여백으로 압박하는 화법',
  '거친 욕설과 직설이 섞인 입담', '나긋하게 가스라이팅하는 말투', '느리고 무게 있는 노련한 어조', '농담 뒤에 진심을 숨기는 능청',
  '독백처럼 자기 합리화를 늘어놓는 말', '사무적이고 절제된 보고체',
  '상대의 말을 그대로 되받아 흔드는 화법', '핵심을 빙빙 돌려 끝내 답하지 않는 말투',
]

// 외양·인상
const LOOK = [
  '잠을 못 잔 듯 그늘진 눈가', '평범해 보이나 한순간 서늘해지는 눈빛', '단정한 정장 뒤의 차가운 미소', '흐트러진 차림에 형형한 안광',
  '온화한 인상 뒤에 읽히지 않는 속내', '깡마른 몸에 칼날 같은 인상', '손에 밴 오래된 흉터와 굳은살', '늘 무언가를 곱씹는 굳은 입매',
  '매혹적이나 거리감이 느껴지는 미모', '눈에 띄지 않는 회색빛 존재감', '피곤에 절었으나 눈만은 날카로운', '말끔한 외양에 어울리지 않는 떨리는 손',
  '상대를 무장해제시키는 따뜻한 첫인상', '한쪽 다리를 끄는 옛 부상의 흔적',
  '감정을 읽을 수 없는 무표정한 얼굴', '낡은 외투 속에 감춰진 단단한 체격',
]

// 위협 노출·이해관계(stakes) — 이 인물이 처한 압박
const STAKE = [
  '자신의 목숨이 직접 위협받음', '가족·아이의 안전이 인질로 잡힘', '시한 안에 진실을 못 밝히면 무고한 이가 처형됨', '정체가 들통나면 즉시 제거됨',
  '다수(공동체·도시)의 안전이 한 사람의 선택에 달림', '평판·커리어·자유를 잃을 위기', '단 한 사람을 살리는 것이 곧 전부', '과거의 죄가 드러나면 모든 것을 잃음',
  '추격자가 백미러 안까지 따라붙음', '폭로하면 거대 권력의 표적이 됨', '약효·연료·시간이 바닥나는 카운트다운', '믿을 사람이 아무도 남지 않은 고립',
  '거짓이 한 번만 더 들키면 모든 신뢰를 잃음', '잘못 건드린 증거 하나가 사건 전체를 무너뜨림',
]

// 이름 풀 — 현대 한국/혼합(스릴러 톤)
const SURNAME = ['김', '이', '박', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황', '안', '송', '오', '류', '문', '배', '백']
const GIVEN_M = ['도진', '재현', '태오', '민혁', '강우', '준영', '석현', '현우', '동훈', '상혁', '지훈', '성민', '재욱', '경탁', '우진', '한결', '도윤', '시우', '명석', '경수']
  .map((n) => (/[가-힣]{2}/.test(n) ? n : '재성'))
const GIVEN_F = ['지원', '서연', '하경', '유진', '소연', '민주', '예린', '수아', '다은', '현지', '윤아', '연수', '가은', '지안', '나희', '세영', '한별', '도희', '미래', '주하']

interface Gen {
  seed: number
  name: string; gender: string; age: number
  archetype: string; subgenre: string; subEcho: string
  job: string; role: string; motive: string
  flaw: string; secret: string; reliability: string; relation: string
  trauma: string; gun: string; speech: string; look: string; stake: string
  trait: string[]
}
type SlotKey = Exclude<keyof Gen, 'seed' | 'subEcho'>

const TRAITS = ['집요', '냉철', '의심 많음', '대담', '교활', '강박', '연민', '오만', '침착', '충동', '치밀', '냉혹', '예민', '저돌', '비밀스러움', '집착']

function genOne(): Gen {
  const sub = pick(SUBGENRE)
  const gender = Math.random() < 0.55 ? '남' : '여'
  const name = pick(SURNAME) + (gender === '남' ? pick(GIVEN_M) : pick(GIVEN_F))
  return {
    seed: ri(1e9),
    name, gender, age: 22 + ri(45),
    archetype: pick(ARCHETYPE), subgenre: sub.k, subEcho: sub.e,
    job: pick(JOB), role: pick(ROLE), motive: pick(MOTIVE),
    flaw: pick(FLAW), secret: pick(SECRET), reliability: pick(RELIABILITY), relation: pick(RELATION),
    trauma: pick(TRAUMA), gun: pick(GUN), speech: pick(SPEECH), look: pick(LOOK), stake: pick(STAKE),
    trait: picks(TRAITS, 3),
  }
}

// 조합수: 원형·서브장르·직업·역할·동기·결점·비밀·신뢰성·관계·트라우마·체호프의 총·말투·외양·이해관계 ×(성격 3택 순열). 각 풀 고유 항목만 곱함.
const COMBOS = ARCHETYPE.length * SUBGENRE.length * JOB.length * ROLE.length * MOTIVE.length *
  FLAW.length * SECRET.length * RELIABILITY.length * RELATION.length * TRAUMA.length * GUN.length *
  SPEECH.length * LOOK.length * STAKE.length *
  (TRAITS.length * (TRAITS.length - 1) * (TRAITS.length - 2))

const ROWS: { k: SlotKey; label: string; full?: boolean }[] = [
  { k: 'name', label: '이름' }, { k: 'gender', label: '성별' }, { k: 'age', label: '나이' },
  { k: 'archetype', label: '인물 원형', full: true }, { k: 'subgenre', label: '서브장르' }, { k: 'job', label: '직업·신분' },
  { k: 'role', label: '서사 역할' }, { k: 'trait', label: '성격' },
  { k: 'motive', label: '동기·욕망', full: true }, { k: 'stake', label: '이해관계(위협)', full: true },
  { k: 'flaw', label: '결점·약점', full: true }, { k: 'secret', label: '비밀', full: true },
  { k: 'reliability', label: '신뢰성·시점', full: true }, { k: 'relation', label: '핵심 관계', full: true },
  { k: 'trauma', label: '트라우마', full: true }, { k: 'gun', label: '체호프의 총', full: true },
  { k: 'speech', label: '말투·화법', full: true }, { k: 'look', label: '외양·인상', full: true },
]
function valStr(g: Gen, k: SlotKey): string {
  const v = g[k] as unknown
  if (k === 'age') return g.age + '세'
  if (Array.isArray(v)) return v.join(' · ')
  return String(v)
}

const LS_KEY = 'sry:tool:thriller-charforge'
interface Saved { id: string; name: string; g: Gen; ts: number }
function loadSaved(): Saved[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Saved[] } catch { return [] } }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ThrillerCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [showSaved, setShowSaved] = useState(false)
  const [toast, setToast] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])
  const flash = (m: string) => { setToast(m); if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setToast(''), 1800) }

  // 사용자 정의 항목/기타: 무작위 생성 시 값만 비우고 항목(라벨)은 유지
  const clearCustomValues = () => { setCustom((cs) => cs.map((c) => ({ ...c, value: '' }))); setEtc('') }
  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim()
    if (!label) return
    setCustom((cs) => [...cs, { id: 'c_' + Date.now().toString(36) + '_' + cs.length, label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((cs) => cs.map((c) => (c.id === id ? { ...c, value } : c)))
  const delCustom = (id: string) => setCustom((cs) => cs.filter((c) => c.id !== id))
  // 사용자 정의·기타를 fields 맵에 합성(값이 있을 때만)
  const withExtraFields = (base: Record<string, string>): Record<string, string> => {
    const out = { ...base }
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) out[c.label] = v }
    if (etc.trim()) out.etc = etc.trim()
    return out
  }

  // payload: 외부에서 reroll 요청 시 새로 굴림. payload.genre 가 본 장르가 아니어도 그대로 생성(이 도구는 스릴러 전용).
  useEffect(() => { if (payload?.reroll) { setG(genOne()); clearCustomValues() } /* eslint-disable-next-line */ }, [])

  const rollAll = () => { clearCustomValues(); setG((prev) => {
    const next = genOne()
    for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
    if (locked['subgenre']) next.subEcho = prev.subEcho // 서브장르 잠금 시 분위기 설명도 유지
    return next
  }) }
  const rollOne = (k: SlotKey) => setG((prev) => {
    const fresh = genOne()
    const patch: Partial<Gen> = { [k]: (fresh as unknown as Record<string, unknown>)[k] } as Partial<Gen>
    if (k === 'subgenre') (patch as Gen).subEcho = fresh.subEcho
    return { ...prev, ...patch }
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const summaryText = () => {
    let s = `${g.name} · ${g.gender} · ${g.age}세\n` +
      `[서브장르] ${g.subgenre} — ${g.subEcho}\n` +
      ROWS.filter((r) => !['name', 'gender', 'age', 'subgenre'].includes(r.k)).map((r) => `${r.label}: ${valStr(g, r.k)}`).join('\n')
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) s += `\n${c.label}: ${v}` }
    if (etc.trim()) s += `\n기타: ${etc.trim()}`
    return s
  }

  const toCharacterFields = (): Record<string, string> => ({
    name: g.name,
    role: `${g.role} · ${g.archetype}`,
    age: `${g.age}세 · ${g.gender}`,
    occupation: `${g.job} · [${g.subgenre}]`,
    appearance: g.look,
    personality: `${g.trait.join(', ')} · 말투: ${g.speech}`,
    background: `서브장르: ${g.subgenre} — ${g.subEcho} · 트라우마: ${g.trauma}`,
    goal: g.motive,
    conflict: `결점: ${g.flaw} · 이해관계: ${g.stake}`,
    secret: g.secret,
    relationships: g.relation,
    notes: `신뢰성·시점: ${g.reliability} · 체호프의 총: ${g.gun}`,
  })

  // 정규 키(캐릭터)로 1:1 매핑 — 뭉친 값은 분리. 받는 허브의 기본 칸에 제자리로 들어가도록 표준화.
  const toCanonicalCharFields = (): Record<string, string> => ({
    name: g.name,
    role: g.role,
    gender: g.gender,
    age: `${g.age}세`,
    occupation: g.job,
    personality: g.trait.join(', '),
    appearance: g.look,
    goal: g.motive,
    motivation: g.motive,
    flaw: g.flaw,
    secret: g.secret,
    speech: g.speech,
    relations: g.relation,
    background: `${g.archetype} · 트라우마: ${g.trauma}`,
    arc: g.archetype,
    fear: g.stake,
    notes: `서브장르: ${g.subgenre} — ${g.subEcho} · 서사 역할: ${g.role} · 신뢰성·시점: ${g.reliability} · 체호프의 총: ${g.gun} · 이해관계: ${g.stake}`,
  })

  const bodyHtml = () => {
    const rows: [string, string][] = [
      ['인물 원형', g.archetype], ['서브장르', `${g.subgenre} — ${g.subEcho}`], ['직업·신분', g.job], ['서사 역할', g.role],
      ['성격', g.trait.join(' · ')], ['동기·욕망', g.motive], ['이해관계(위협)', g.stake],
      ['결점·약점', g.flaw], ['비밀', g.secret], ['신뢰성·시점', g.reliability], ['핵심 관계', g.relation],
      ['트라우마', g.trauma], ['체호프의 총', g.gun], ['말투·화법', g.speech], ['외양·인상', g.look],
    ]
    const extra: [string, string][] = []
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) extra.push([c.label, v]) }
    if (etc.trim()) extra.push(['기타', etc.trim()])
    return `<p><b>${esc(g.name)}</b> · ${esc(g.gender)} · ${g.age}세</p>` +
      rows.concat(extra).map(([k, v]) => `<p><b>${esc(k)}</b>: ${esc(v)}</p>`).join('')
  }

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), fields: withExtraFields(toCanonicalCharFields()) } }); flash('인물 시트로 보냈습니다') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name, role: `${g.role} · ${g.archetype}`,
      personality: g.trait.join(', '), goal: g.motive, secret: g.secret, appearance: g.look,
      traits: ROWS.filter((r) => r.k !== 'name').map((r) => ({ k: r.label, v: valStr(g, r.k) })),
      notes: `서브장르: ${g.subgenre} — ${g.subEcho} · 트라우마: ${g.trauma} · 체호프의 총: ${g.gun} · 신뢰성: ${g.reliability} · 관계: ${g.relation}`,
      source: '스릴러 인물 생성기',
    }
    ;(c as Record<string, unknown>).fields = withExtraFields(toCanonicalCharFields())
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: withExtraFields({ ...toCharacterFields(), ...toCanonicalCharFields() }), bodyHtml: bodyHtml(),
      meta: { 서브장르: g.subgenre, 직업: g.job, 역할: g.role, 원형: g.archetype, 신뢰성: g.reliability, 성별: g.gender, 나이: g.age + '세' },
    })
    if (id) flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)')
    else flash('프로젝트에 추가할 수 없습니다')
  }

  // 로컬 저장(CRUD)
  const persist = (arr: Saved[]) => { setSaved(arr); try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch { /* noop */ } }
  const saveLocal = () => { const arr = [{ id: 't_' + Date.now().toString(36), name: g.name, g, ts: Date.now() }, ...saved].slice(0, 60); persist(arr); flash('이 도구에 저장했습니다') }
  const loadLocal = (s: Saved) => { setG(s.g); setShowSaved(false); flash(`'${s.name}' 불러옴`) }
  const delLocal = (id: string) => persist(saved.filter((s) => s.id !== id))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="🕵️" /> 스릴러·서스펜스 인물</span>
        <button className="minibtn" onClick={() => setShowSaved((v) => !v)}>{showSaved ? <>✕ 닫기</> : <><Emoji e="🗂" /> 저장함({saved.length})</>}</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()}+ 조합</span>
      </div>

      {/* 머리말 카드 */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{g.name} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{g.gender} · {g.age}세</span></div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{g.job} · {g.trait.join(' · ')}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{g.archetype} <span style={{ color: 'var(--accent)' }}>／</span> {g.role}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}><Emoji e="🎬" /> {g.subgenre} — {g.subEcho}</div>
      </div>

      {showSaved ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {saved.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>저장된 인물이 없습니다. ‘이 도구에 저장’으로 보관하세요.</div>}
          {saved.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.g.archetype} · {s.g.subgenre}</div>
              </div>
              <button className="minibtn" onClick={() => loadLocal(s)}>불러오기</button>
              <button className="minibtn" onClick={() => delLocal(s.id)}><Emoji e="🗑" /></button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {ROWS.map((r) => (
              <div key={r.k} style={{ gridColumn: r.full ? '1 / -1' : 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 72, flexShrink: 0 }}>{r.label}</span>
                <span style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={valStr(g, r.k)}>{valStr(g, r.k)}</span>
                <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
              </div>
            ))}
          </div>

          {/* 사용자 정의 항목 — 직접 적는 빈 칸(무작위 생성 안 함) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>사용자 정의 항목</span>
              <button className="minibtn" onClick={addCustom} style={{ marginLeft: 'auto' }}>＋ 항목 추가</button>
            </div>
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
                <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="내용을 직접 입력" style={{ flex: 1, minWidth: 0, fontSize: 11.5, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }} />
                <button className="minibtn" title="삭제" onClick={() => delCustom(c.id)} style={{ padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>

          {/* 기타 — 항상 보이는 자유 입력 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>기타</span>
            <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 메모를 적으세요" rows={4} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 11.5, lineHeight: 1.5, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 인물 생성</button>
        <button className="minibtn" onClick={() => { navigator.clipboard?.writeText(summaryText()).then(() => flash('복사됨')).catch(() => {}) }}><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={saveLocal}><Emoji e="💾" /> 이 도구에 저장</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('thriller-conflictforge')}><Emoji e="⚔️" /> 스릴러 갈등 단조</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer')}><Emoji e="🔀" /> 이름 믹서</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || '“프로젝트에 인물 카드 추가”를 누르면 좌측 바인더(자료 › 인물)와 DB 뷰에 실시간으로 들어갑니다.'}</div>
    </div>
  )
}
