// 로맨스 사건·소재 대형 생성기 — 로맨스 서사를 떠받치는 핵심 사건 요소들을 슬롯 조합으로 대량 생성한다.
//  만남의 계기 × 관계 구도(트로프) × 강제 밀착 장치 × 설렘 사건 × 갈등·장벽 × 오해·비밀 ×
//  절망의 순간(Black Moment) × 대형 고백·증명(Grand Gesture) × 정서 톤 — 아홉 슬롯을 굴려
//  "어떻게 만나고, 어떤 사이가 되며, 무엇이 둘을 묶고 설레게 하고 갈라놓고, 어떻게 끝내 맺어지는가"를
//  한 편의 로맨스 사건 전개로 엮어 준다. 마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다.
//  조합 수 1조 이상(슬롯 전부 활성 기준)을 지향한다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 로맨스 사건 전개를 자료('research')/'사건' 폴더 문서로 추가하고, 글감 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-eventforge', name: '로맨스 사건 생성기', icon: '💞', group: '생성기', genre: '로맨스', intro: '만남·트로프·밀착·설렘·갈등·오해·파국·고백·정서 톤을 굴려 한 편의 로맨스 사건 전개를 대량 생성', w: 580, h: 680 }

const LS = 'sry:tool:romance-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 로맨스 사건 전개의 한 축. faces = 그 축의 로맨스 특화 후보(로컬 표). 도시에의 서사 장치에 근거.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'meet', label: '만남의 계기', icon: '🌹', desc: 'Meet-Cute · 운명적/우스꽝스러운/적대적 첫 조우',
    faces: [
      '빗속에서 우산 하나를 나눠 쓰게 되며',
      '면접관과 지원자로 마주 앉으며',
      '잘못 배달된 택배 한 상자 때문에',
      '결혼식 하객으로 옆자리에 앉으며',
      '회사 엘리베이터에 단둘이 갇히며',
      '카페에서 음료가 바뀌어 돌아오며',
      '맞선 자리에서 서로 도망치다 부딪치며',
      '교통사고를 낸 가해자와 피해자로',
      '같은 책의 마지막 한 권을 동시에 집으며',
      '새 직장 첫날 상사와 부하로 마주하며',
      '술 취한 밤 엉뚱한 사람에게 고백하며',
      '잃어버린 반려동물을 찾아주며',
      '계약서를 사이에 두고 협상 테이블에서',
      '응급실에서 보호자와 의사로 마주치며',
      '원수 집안의 자식들로 첫인사를 나누며',
      '소개팅 대타로 끌려 나온 자리에서',
      '한밤중 옆집 소음 항의로 문을 두드리며',
      '무대 뒤에서 배우와 스태프로 부딪치며',
      '낯선 도시에서 길을 묻다가',
      '경매장에서 같은 물건에 패를 들며',
      'SNS 악플과 작가로 댓글창에서 맞붙으며',
      '비행기 옆자리 승객으로 장거리 비행 내내',
      '면허 시험장에서 나란히 떨어지며',
      '장례식장에서 고인의 두 옛 인연으로',
    ],
  },
  {
    key: 'trope', label: '관계 구도', icon: '💘', desc: '두 사람이 묶이는 핵심 트로프',
    faces: [
      '앙숙에서 연인으로(enemies-to-lovers)',
      '친구에서 연인으로(friends-to-lovers)',
      '재벌 남주 × 평범한 여주의 신분 격차',
      '계약 연애가 진짜가 되어버린',
      '가짜 연인 행세가 진심으로 번진(fake dating)',
      '소꿉친구의 오랜 짝사랑이 닿는',
      '상사와 부하의 금지된 사내 연애',
      '첫사랑과 수년 만에 재회한',
      '원수 집안 사이의 금단의 사랑',
      '냉혈한 그가 그녀에게만 무너지는',
      '연하남의 저돌적 직진',
      '한쪽만 기억을 잃은 채 다시 만난',
      '정략결혼으로 묶인 부부',
      '짝사랑을 들키지 않으려 애쓰는',
      '서로를 라이벌로 여기다 끌리는',
      '구해준 은인과 구원받은 자의',
      '동거인으로 시작해 가족이 되어가는',
      '집착하는 그를 길들이는',
      '버림받았다 돌아온 그를 받아줄지 망설이는(후회물)',
      '운명처럼 얽혔으나 신분이 가로막는',
      '연적이 둘 사이에 끼어든 삼각관계',
      '겉으론 완벽하나 서로의 상처를 알아보는',
    ],
  },
  {
    key: 'proximity', label: '강제 밀착', icon: '🛏️', desc: 'Forced Proximity · 둘을 물리적으로 묶는 장치',
    faces: [
      '폭설로 산장에 단둘이 갇혀',
      '여관에 침대가 하나뿐이라(one bed)',
      '위장 부부로 한 집에 살게 되어',
      '같은 프로젝트 팀에 배정되어',
      '비밀을 지키려 한방을 쓰게 되어',
      '정전된 빌딩에 밤새 함께 갇혀',
      '서로의 가짜 데이트 상대로 동행하며',
      '같은 셋방의 유일한 빈자리에',
      '병실에서 환자와 간병인으로 붙어',
      '도피 중 한 차에 몸을 싣고',
      '계약상 한 지붕 아래 살아야 해서',
      '태풍으로 발이 묶인 외딴 펜션에서',
      '신혼여행 같은 출장을 떠나게 되어',
      '한정된 텐트 하나로 야영하며',
      '서로의 집안에 인질처럼 머물며',
      '같은 기숙사 룸메이트로 엮여',
      '폐쇄된 섬에 조사단으로 갇혀',
      '결혼 준비를 핑계로 매일 붙어',
      '경호 대상과 경호원으로 24시간 함께',
      '단둘이 가게를 떠맡아 운영하며',
      '한 회사의 비밀 연인 행세로 매 행사마다',
      '연착된 마지막 기차를 둘이 기다리며',
      '서로의 빚 때문에 한 방을 나눠 쓰게 되어',
      '낯선 외국에서 통역 가이드로 붙어 다니며',
    ],
  },
  {
    key: 'spark', label: '설렘 사건', icon: '✨', desc: '케미를 점화하는 설렘 포인트(접촉의 고조)',
    faces: [
      '넘어지는 그녀를 안아 받쳐주며 멈춘 시간',
      '입맞춤 직전 누군가 들이닥쳐 미뤄진(near-kiss)',
      '비를 맞은 그에게 말없이 외투를 덮어주며',
      '술김에 흘린 진심을 다음 날 모른 척하며',
      '손등이 스친 순간 둘 다 굳어버린',
      '잠든 그의 머리맡을 차마 떠나지 못한 밤',
      '연적 앞에서 충동적으로 손을 잡아끈',
      '열에 들뜬 그녀를 밤새 간호한',
      '단추를 채워주다 가까워진 숨결',
      '취한 그를 업고 걸은 새벽길',
      '귓가에 속삭이듯 비밀을 건넨 순간',
      '넥타이를 매주다 멈춘 손과 눈맞춤',
      '빗물에 젖은 머리칼을 쓸어 넘겨준',
      '둘만 아는 농담에 동시에 터진 웃음',
      '위험에서 끌어당겨 품에 가둔 찰나',
      '춤을 추다 좁혀진 거리와 멎은 음악',
      '상처를 소독해주는 조심스러운 손길',
      '한 이불 밑에서 등을 맞댄 어색한 첫 밤',
      '질투에 못 이겨 벽으로 몰아세운',
      '"좋아한다"는 말이 입 밖으로 새어 나온',
      '폭죽 아래에서 처음으로 맞잡은 손',
      '아픈 척하는 그를 들여다보다 가까워진 얼굴',
    ],
  },
  {
    key: 'barrier', label: '갈등·장벽', icon: '⛓️', desc: '두 사람을 가로막는 외부/내부의 벽',
    faces: [
      '넘을 수 없는 신분과 재력의 격차',
      '집안끼리의 오랜 원한',
      '한쪽의 정략결혼 약혼자',
      '직장 내 연애 금지 규정',
      '과거 연인의 그림자',
      '한쪽이 숨긴 시한부 병',
      '바다 건너로 떠나야 하는 유학·전근',
      '서로를 이용하려던 처음의 목적',
      '가족의 결사반대',
      '복수해야 할 대상이 상대였다는 사실',
      '치유되지 않은 사랑에 대한 트라우마',
      '한쪽의 거짓 신분이 들킬 위기',
      '연적의 집요한 방해 공작',
      '한쪽만 미래(원작 결말)를 안다는 정보 비대칭',
      '명예와 사랑 사이의 양자택일',
      '오래전 둘 사이의 끔찍한 오해',
      '한쪽이 짊어진 가문의 책무',
      '나이 차·세간의 시선',
      '서로의 자존심과 방어기제',
      '둘을 갈라놓으려는 권력자의 압박',
      '가난과 빚이 만든 현실의 벽',
      '한쪽의 마음을 막는 죄책감',
    ],
  },
  {
    key: 'secret', label: '오해·비밀', icon: '🎭', desc: '갈등 엔진이 되는 오해 또는 숨긴 진실',
    faces: [
      '연적과 다정히 있는 장면을 오해받아',
      '진심을 농담으로 받아넘긴 한마디 때문에',
      '대신 보낸 편지가 엉뚱하게 전해져',
      '계약 관계였다는 사실이 들통나',
      '숨겨둔 옛 약혼자의 존재가 드러나',
      '"널 이용했을 뿐"이라는 거짓말을 믿어',
      '엿들은 대화의 앞뒤가 잘려 전해져',
      '한쪽의 진짜 정체가 폭로될 위기에',
      '선의의 거짓말이 눈덩이처럼 불어나',
      '오해를 풀 단 한마디를 끝내 삼켜버려',
      '뒤바뀐 선물·쪽지가 마음을 어긋나게 해',
      '한쪽이 다른 사람과 약혼했다는 소문에',
      '지켜주려 한 비밀이 배신으로 비쳐',
      '과거의 잘못이 가장 나쁜 타이밍에 드러나',
      '대역·쌍둥이의 존재가 진심을 흐려',
      '"사랑하지 않는다"는 말로 밀어내며',
      '들키면 끝장날 약점을 상대가 쥐고 있어',
      '한쪽의 일기·메시지가 적의 손에 들어가',
      '구해준 은인이 사실 원수였다는 진실에',
      '거짓 결별을 진짜로 받아들여버려',
      '취중 진심을 "기억 안 난다"며 부정해버려',
      '대신 전한 마음이 다른 사람 것으로 오해되어',
      '아픈 그를 두고 떠난 듯 보이는 정황에',
      '한쪽이 곧 떠날 사람이라는 사실을 숨겨서',
    ],
  },
  {
    key: 'black', label: '절망의 순간', icon: '🌑', desc: 'Black Moment · 관계가 끝장난 듯한 최저점',
    faces: [
      '오해가 폭발해 "다시는 보지 말자"며 돌아서',
      '비밀이 만천하에 드러나 모든 것을 잃고',
      '사랑하는 이를 지키려 일부러 잔인하게 밀어내고',
      '집안의 압력에 못 이겨 정략혼을 받아들이며',
      '한쪽이 말없이 먼 곳으로 떠나버려',
      '"우린 처음부터 틀렸다"는 선언과 함께',
      '되돌릴 수 없는 한마디로 서로에게 상처를 남기고',
      '죽음의 위기 앞에서 마음을 끝내 전하지 못한 채',
      '연적과의 약혼 발표 자리에서 무너지며',
      '서로를 의심한 끝에 신뢰가 산산조각 나고',
      '진실을 알았을 땐 이미 너무 늦어버려',
      '사고로 한쪽이 기억을 잃고 남이 되어',
      '가장 행복한 순간 직후 모든 게 거짓이었음을 알고',
      '둘을 갈라놓으려는 음모가 정점에 달해',
      '"네가 미워"라는 말을 마지막으로 등을 돌려',
      '서로의 행복을 빌며 헤어지기로 결심하고',
      '한쪽의 희생으로 이별을 택할 수밖에 없어',
      '오랜 짝사랑이 끝내 거절당하고',
      '되찾을 수 없게 된 듯한 신뢰 앞에 주저앉아',
      '모두가 보는 앞에서 모욕당하고 버림받아',
      '"네가 행복하길 바란다"며 스스로 물러서',
      '한쪽이 모든 죄를 뒤집어쓰고 사라져',
      '뒤늦게 달려갔을 땐 이미 식장에 들어선 뒤라',
      '서로를 위한 거짓말이 둘 다를 절벽으로 몰아',
    ],
  },
  {
    key: 'grand', label: '대형 고백·증명', icon: '💍', desc: 'Grand Gesture · 자존심·지위·목숨을 건 증명',
    faces: [
      '떠나는 비행기를 막으려 공항을 가로질러 달려가',
      '만인 앞에서 무릎 꿇고 진심을 고백하며',
      '물려받을 가문·왕위를 그 사람을 위해 내던지며',
      '거짓이었던 모든 것을 자백하고 용서를 빌며',
      '연적과의 약혼식장에 뛰어들어 진실을 외치며',
      '권력으로 그녀를 위협하던 모두를 막아서며',
      '평생의 자존심을 꺾고 먼저 손을 내밀며',
      '목숨을 걸고 위험에서 끌어내 품에 안으며',
      '오해를 풀 증거를 들고 빗속을 달려와',
      '"내가 다 잘못했다"며 끝까지 매달리는(후회)',
      '모든 걸 포기하고 그 사람 곁에 남기로 선택하며',
      '세상에 둘의 관계를 당당히 선언하며',
      '되찾은 기억으로 다시 그 앞에 서서',
      '재산도 명예도 버리고 평범한 삶을 약속하며',
      '집안의 반대를 정면으로 거스르고 데리러 와',
      '마지막 편지 대신 직접 찾아가 마음을 쏟아내며',
      '서로를 위해 각자 한 발씩 내려놓고 마주 서며',
      '"사랑한다"는 말을 처음으로 입에 담으며',
      '죽음의 문턱에서 끝내 그 이름을 부르며',
      '오랜 기다림 끝에 손을 잡고 함께 걸어 나가며',
    ],
  },
  {
    key: 'tone', label: '정서 톤', icon: '🎼', desc: '점화 속도와 관능도가 빚는 전체 분위기',
    faces: [
      '슬로우번의 애틋한 갈망(yearning)으로',
      '첫눈에 반한 인스타러브의 두근거림으로',
      '톡톡 튀는 밀당과 유쾌한 케미로',
      '달콤하고 따뜻한 힐링의 결로',
      '애절하고 가슴 시린 멜로의 정서로',
      '아슬아슬한 긴장과 관능(steamy)으로',
      '집착과 독점욕이 짙은 다크한 색채로',
      '후회와 속죄가 뒤섞인 묵직한 무게로',
      '운명적이고 거대한 대하 서사의 결로',
      '코믹하고 사랑스러운 로맨틱 코미디로',
      '절제된 고백과 시적인 여백으로',
      '질투와 자각이 교차하는 팽팽함으로',
      '재회의 반가움과 어색함이 공존하는 결로',
      '금기를 넘는 위태로운 설렘으로',
      '서로를 치유해가는 잔잔한 회복의 정서로',
      '한 발 다가가면 두 발 물러서는 진자의 긴장으로',
      '회귀·빙의로 비극을 알면서 다시 사랑하는 애절함으로',
      '계약이 진심으로 번지는 간질간질한 설렘으로',
      '신데렐라 서사의 벅찬 환상으로',
      '담담한 어른들의 현실적이고 묵직한 연애로',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 큰 수를 '약 N조/억' 한국어로 가독화(조합 수 강조용)
function bigKo(n: number): string {
  if (n >= 1e12) return '약 ' + (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return '약 ' + (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return '약 ' + Math.round(n / 1e4) + '만'
  return fmt(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}
// 전 슬롯 활성 시 총 조합(메타 표기용) — 1조 이상 지향.
const TOTAL_COMBOS = SLOTS.reduce((a, s) => a * s.faces.length, 1)

// 굴린 결과들을 자연스러운 로맨스 사건 전개 단락으로 엮는다(의미 단위로 조립).
function compose(by: Record<string, string>): string {
  const { meet, trope, proximity, spark, barrier, secret, black, grand, tone } = by
  const parts: string[] = []
  // 1) 만남 + 구도
  if (meet && trope) parts.push(`${meet} 두 사람은 ${trope} 사이가 된다`)
  else if (meet) parts.push(`${meet} 두 사람이 처음 만난다`)
  else if (trope) parts.push(`두 사람은 ${trope} 사이다`)
  // 2) 강제 밀착
  if (proximity) parts.push(`${proximity} 거리가 좁혀지고`)
  // 3) 설렘 사건
  if (spark) parts.push(`${spark} 마음이 흔들린다`)
  // 4) 갈등·장벽
  if (barrier) parts.push(`그러나 ${barrier}이(가) 둘 사이를 가로막고`)
  // 5) 오해·비밀
  if (secret) parts.push(`${secret} 관계가 어긋나기 시작한다`)
  // 6) 절망의 순간
  if (black) parts.push(`끝내 ${black} 관계는 최저점으로 치닫는다`)
  // 7) 대형 고백·증명
  if (grand) parts.push(`그 절망 끝에 ${grand} 마침내 서로에게 닿는다`)
  // 8) 정서 톤(마무리 결)
  if (tone) parts.push(`이 모든 사건은 ${tone} 그려진다`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string; tone: string }

export default function RomanceEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
            tone: typeof s.tone === 'string' ? s.tone : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))
  const lockAll = () => setLocked(() => { const n: Record<string, boolean> = {}; active.forEach((k) => { if (results[k]) n[k] = true }); return n })
  const unlockAll = () => setLocked({})

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
        tone: byKey.tone || '',
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 전개 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 로맨스 사건 전개를 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `💞 로맨스 사건 — ${story.slice(0, 26)}${story.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: { 장르: '로맨스', 트로프: byKey.trope || '—', 정서: byKey.tone || '—', 절정: byKey.grand || '—' },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 로맨스 전개를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 로맨스 전개를 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[로맨스 사건] ${text}`,
      source: '로맨스 사건 생성기',
      tags: ['글감', '사건', '로맨스', ...slots.split('·').filter(Boolean)],
    })
    setToast('글감 스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `💞 로맨스 사건 — ${s.text.slice(0, 26)}${s.text.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      meta: { 장르: '로맨스', 정서: s.tone || '—' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>만남·트로프·밀착·설렘·갈등·오해·파국·고백·정서 톤</b> 아홉 슬롯을 굴리면 한 편의 <b>로맨스 사건 전개</b>가 엮입니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="💞"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)' }}>
            <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 <b style={{ color: 'var(--accent)' }}>({bigKo(combos)})</b></span>
            <span style={{ marginLeft: 'auto' }}>전 슬롯 시 {bigKo(TOTAL_COMBOS)} 이상</span>
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}종</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => copy('row-' + k, face || '')} disabled={!face} title="이 항목 복사"
                    style={{ flexShrink: 0 }}>{copiedKey === 'row-' + k ? '✓' : <Emoji e="📋"/>}</button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 로맨스 사건 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💞"/> 로맨스 사건 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 로맨스 사건 전개가 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="💞"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={lockAll} disabled={!hasResults} title="현재 결과 전부 고정"><Emoji e="🔒"/> 전체</button>
            <button className="minibtn" onClick={unlockAll} title="고정 전부 해제"><Emoji e="🔓"/> 해제</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 로맨스 사건을 굴려주세요' : '현재 로맨스 사건 전개를 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '로맨스' })} title="이 사건의 두 주인공을 만들러"><Emoji e="🧬"/> 캐릭터 생성기</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '로맨스' })} title="반전 카드로 사건을 비틀어"><Emoji e="🃏"/> 반전 카드덱</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 로맨스 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 전개를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.tone && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}><Emoji e="🎼"/> {s.tone}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 인물·회차·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 로맨스 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건 전개는 출발점일 뿐입니다. HEA(해피엔딩)의 약속을 잊지 말고, 같은 조합도 내 인물·관계·세계에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
