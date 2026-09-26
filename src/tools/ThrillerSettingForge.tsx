// 스릴러 배경·현장 생성기(ThrillerSettingForge) — 스릴러·서스펜스 장르 특화 무대 생성 도구.
//   장소(압박 공간) × 시각·기상 × 감시·통제 기제 × 분위기·정조 × 위협의 정체 × 티킹 클락(시간 압박)
//   단일 슬롯에 '현장 디테일' 다중 슬롯(4개)을 곱해 하나의 '스릴러 무대 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 11조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:thriller-settingforge') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 글감 스니펫(addToLibrary('snippets')) + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'thriller-settingforge',
  name: '스릴러 배경·현장 생성기',
  icon: '🌃',
  group: '배경',
  genre: '스릴러·서스펜스',
  intro: '압박 공간·기상·감시·위협·티킹 클락·현장 디테일을 조합해 스릴러 무대 글감을 만드세요',
  w: 590,
  h: 690,
}

const LS_KEY = 'sry:tool:thriller-settingforge'

// ── 슬롯 풀(전부 자작·스릴러 특화·구체적) ────────────────────────────────
// 단일 슬롯: place / weather / watch / mood / threat / clock
// 다중 슬롯: detail(현장 디테일 4개) — 조합수를 1조 이상으로 키운다.

// 장소(압박 공간) — 도시에의 "배경 자체가 압박 장치"·폐쇄/고립/감시/탈출 불가 원리를 반영.
//   도메스틱·어반 누아르·리걸·스파이·고전 압박 공간(산장/섬/엘리베이터/잠수함/벙커)을 두루 포괄.
const PLACES = [
  '폭설로 길이 끊긴 외딴 산장, 전화선마저 죽은 거실',
  '정전된 고층 빌딩의 멈춰 선 비상계단 23층 참',
  '두 층 사이에 멈춰 버린 엘리베이터 안',
  '승객 절반이 잠든 야간 침대 열차의 좁은 복도',
  '난기류에 흔들리는 대서양 횡단 여객기의 후미 화장실 앞',
  '잠항 중 통신이 끊긴 잠수함의 어뢰실',
  '환자가 사라진 폐쇄 병동의 형광등 깜빡이는 복도',
  '비밀번호로만 열리는 지하 벙커의 강철 격벽 앞',
  '완벽해 보이는 교외 주택가, 커튼 친 옆집 거실',
  '학부모 모임이 끝난 텅 빈 사립학교 강당',
  '스마트홈이 제멋대로 잠긴 신축 아파트 거실',
  'CCTV 사각지대로만 이어진 지하 주차장 B3',
  '비 내리는 항만 부두, 컨테이너가 미로처럼 늘어선 야적장',
  '간판 불 꺼진 뒷골목 회원제 클럽의 안쪽 룸',
  '폐업한 모텔의 12호실, 옆방 TV 소리만 새어드는 밤',
  '증거를 봉인한 경찰서 압수물 보관 창고',
  '배심원 평의가 시작된 법원 401호 평의실',
  '구치소 접견실, 유리 한 장을 사이에 둔 면회 부스',
  '도청 흔적이 발견된 로펌 파트너의 코너 오피스',
  '국경 검문소 너머, 환승 표시가 다른 언어로만 적힌 공항 라운지',
  '명단에 없는 안전가옥, 창문을 신문지로 덮은 단칸방',
  '첩보 기관 지하 서버실, 백업 테이프가 도는 냉각된 방',
  '엘리베이터 없는 옛 호텔의 13층, 한 방만 불이 켜진 복도',
  '눈보라에 고립된 고속도로 휴게소의 텅 빈 식당',
  '썰물 때만 길이 열리는 외딴 등대섬의 등명실',
  '폐쇄된 지하철 환승 통로, 멈춘 에스컬레이터 사이',
  '리모델링 중단된 백화점, 비계가 얽힌 5층 매장',
  '한밤의 종합병원 영안실 앞 차가운 대기 의자',
  '입주 전 모델하우스, 가짜 가족사진이 걸린 거실',
  '실시간 방송이 끊긴 라이브 스트리머의 원룸 스튜디오',
  '수배 전단이 나붙은 시외버스 터미널의 마지막 막차 승강장',
  '정신과 폐쇄병동, 안에서는 열 수 없는 이중문 사이',
  '강설로 활주로가 닫힌 지방 공항의 빈 수속 카운터',
  '재판 증인이 묵는 호텔 스위트, 도어 체인만 걸린 문 안쪽',
  '댐 수문 점검로, 비상 사이렌이 울리기 시작한 통제실',
  '지하 주차장과 연결된 무인 편의점, 셔터가 절반만 내려온 새벽',
  '연락이 두절된 극지 관측기지, 발전기 소리만 남은 격리동',
  '폐쇄된 정수장 지하 수조 점검로, 사다리 하나로만 오르내리는 통로',
  '집단 격리가 내려진 크루즈선의 봉쇄된 객실 구역 복도',
  '신원 확인 전엔 나갈 수 없는 출입국 심사장 격리 대기실',
]

// 시각·기상 — 도시에 "위협 임박 시 단문·현재형"·청각/촉각 강조 원리. 압박을 더하는 천후.
const WEATHERS = [
  '가로등마저 눈에 묻힌 폭설의 자정',
  '와이퍼로도 감당 안 되는 폭우가 쏟아지는 새벽 세 시',
  '한 치 앞이 지워진 짙은 안개의 여명',
  '정전으로 도시 절반이 까맣게 꺼진 한밤',
  '열대야로 모두가 창을 닫아건 후텁지근한 새벽',
  '얼음비가 모든 표면을 유리처럼 코팅한 회색 아침',
  '바람이 간판을 뜯어낼 듯 몰아치는 태풍 전야',
  '해가 지기 직전, 그림자가 가장 길어진 황혼의 한순간',
  '눈보라에 시야가 백지처럼 막힌 산중의 정오',
  '비 갠 뒤 젖은 아스팔트에 네온이 번지는 밤거리',
  '미세먼지 경보로 하늘이 누렇게 가라앉은 한낮',
  '첫차도 끊긴, 도시가 숨을 멈춘 듯한 새벽 네 시',
  '폭염 경보 사이렌이 멀리서 울리는 한낮의 정적',
  '진눈깨비가 목덜미로 스며드는 음습한 저녁',
  '천둥이 창문을 흔드는 뇌우의 밤',
  '해무가 부두를 통째로 삼킨 이른 아침',
  '가로등이 하나씩 꺼져 가는 통금 직전의 거리',
  '폭설 예보에 마트가 텅 빈 주말 오후',
  '습기로 벽지가 들뜨는 장마의 한가운데',
  '동트기 직전, 가장 어둡고 추운 한때',
  '황사가 하늘을 적갈색으로 물들인 숨 막히는 한낮',
  '폭염에 아스팔트가 일렁이는, 매미 소리마저 멎은 한낮의 정적',
]

// 감시·통제 기제 — 도시에 "감시자본주의·스마트홈·CCTV·도청·잘못된 신뢰" 결합. 현대 스릴러 핵심.
const WATCHES = [
  'CCTV 한 대가 꼭 한 곳만 비추지 않게 천천히 돌아간다',
  '스마트홈 스피커의 마이크 표시등이 부르지도 않았는데 켜진다',
  '복도 천장의 화재경보기 자리에 핀홀 카메라가 박혀 있다',
  '엘리베이터 호출 버튼이 누군가의 손길로 미리 눌려 있다',
  '도어록 기록에 모르는 시각의 출입 로그가 한 줄 남아 있다',
  '휴대폰 배터리가 평소보다 빨리 닳고, 통화 중 미세한 메아리가 섞인다',
  '주차장 차단기 카메라가 들어온 차량은 세는데 나간 수가 맞지 않는다',
  '맞은편 건물 한 창에서만 매일 같은 시각 블라인드가 틈을 벌린다',
  '경비실 모니터 한 채널이 검은 화면으로 멈춰 있다',
  '내비게이션이 권하지 않은 길로 자꾸 같은 차가 따라붙는다',
  '면회실 유리 너머 거울이 한쪽에서만 비치는 매직미러다',
  '병실 침대 옆 모니터가 환자의 심박 말고 다른 무언가를 기록 중이다',
  '회의실 화분 흙에 작은 송신기의 안테나 끝이 솟아 있다',
  '엘리베이터 거울 모서리에 누군가 붙였다 뗀 테이프 자국이 남아 있다',
  '도청 탐지기의 빨간 불이 특정 벽 앞에서만 깜빡인다',
  '현관 택배 상자에 운송장 없이 테이프만 단정히 봉해져 있다',
  '집 안 와이파이에 처음 보는 기기 한 대가 늘 접속해 있다',
  '복도 끝 비상구 카메라만 유독 렌즈가 닦여 반짝인다',
  '주민 단톡방에 내가 한 적 없는 위치 공유가 떠 있다',
  '경비원이 교대 시간이 아닌데 한 번 더 같은 층을 돈다',
  '클라우드 사진첩에 내가 찍지 않은 우리 집 사진이 한 장 올라와 있다',
  '로봇청소기의 주행 기록에 비어 있어야 할 시간대의 이동 경로가 찍혀 있다',
]

// 분위기·정조 — 도시에 "끊임없는 위협감·편집증·위장된 일상성·믿을 사람 없음".
const MOODS = [
  '평온이 곧 깨질 것만 같은 불길한 정적',
  '누가 적인지 모르는 편집증적 긴장',
  '안전해야 할 집이 가장 낯설게 느껴지는 전도된 불안',
  '카운트다운이 시작된 듯한 임박감',
  '한 박자 늦게 따라오는 발소리에 곤두선 신경',
  '웃는 얼굴 뒤에 무언가를 감춘 듯한 위화감',
  '돌이킬 수 없는 선을 막 넘어 버린 서늘한 자각',
  '모두가 한 가지 사실만 모르는 척하는 기묘한 침묵',
  '도망칠 길이 하나씩 막혀 가는 압박',
  '거짓말 위에 거짓말이 쌓인 숨 막히는 불신',
  '곧 무언가 터질 것을 알면서 기다려야 하는 무력감',
  '익숙한 일상이 한 칸씩 어긋나는 미묘한 공포',
  '믿었던 사람의 눈빛이 처음 보는 것처럼 낯설어진 순간',
  '쫓는 자와 쫓기는 자가 뒤바뀐 듯한 역전의 예감',
  '정적이 너무 깊어 도리어 위협으로 느껴지는 적막',
  '한 통의 전화로 모든 것이 무너질 것 같은 초조',
  '벗어났다고 믿는 순간 다시 옥죄어 오는 덫의 기운',
  '진실에 거의 닿았으나 마지막 한 조각이 비어 있는 갈증',
  '냉정을 가장하지만 손끝이 떨리는 억눌린 공황',
  '구원자처럼 다가온 손길이 가장 의심스러운 아이러니',
  '도움을 청할 곳이 한 군데씩 사라져 가는 고립의 체감',
  '내 편이라 믿었던 숫자가 하나둘 줄어드는 외로운 압박',
]

// 위협의 정체 — 도시에 "만만찮은 적대자·잘못된 신뢰·체호프의 총·신뢰할 수 없는 화자".
const THREATS = [
  '한발 앞서 모든 출구를 미리 막아 둔, 얼굴 없는 추적자',
  '바로 옆에서 돕는 척하는 사람이 사실은 흑막이다',
  '죽은 줄 알았던 인물이 명단에서 조용히 되살아났다',
  '경찰 무전에 잡히지 않는, 내부에서 정보를 흘리는 배신자',
  '피해자의 휴대폰이 가해자의 손에서 여전히 켜져 있다',
  '집 안 누군가가 가구 위치를 한 뼘씩 바꿔 놓고 있다',
  '같은 수법의 사건이 도시 반대편에서 동시에 일어나고 있다',
  '협상가의 목소리가 인질범의 목소리와 묘하게 닮아 있다',
  '증인을 지키는 경호 인력 중 한 명의 신원이 가짜다',
  '카운트다운 메시지가 피해자 본인의 번호로 도착한다',
  '나를 쫓는 형사가 사건의 진짜 설계자일지 모른다',
  '내 기억 속 알리바이가 CCTV와 한 시간 어긋난다',
  '가족 중 한 명이 매일 밤 같은 시각 집을 비운다',
  '범인이 다음 표적의 이름을 이미 신문 부고란에 실어 두었다',
  '구조대가 도착했지만 무전 코드가 규정과 다르다',
  '내 변호를 맡은 변호사가 상대편과 같은 로펌 출신이다',
  '늘 곁을 지키던 반려견이 어느 방 앞에서만 으르렁댄다',
  '벽 너머 옆방에서 내 이름이 또박또박 불리고 있다',
  '도와주겠다는 익명의 제보자가 내 일과를 너무 잘 안다',
  '폭탄은 이미 설치됐고, 타이머는 보이지 않는 곳에서 돌고 있다',
  '신뢰하던 동료의 진술이 매번 사소하게 조금씩 달라진다',
  '거울 속 내 표정이 내 기억과 다르게 웃고 있었다',
  '사라진 아이의 방에 어른 발자국이 새로 찍혀 있다',
  '제보 전화의 발신지가 바로 이 건물 안이다',
  '나를 구하러 왔다는 사람이 사건 현장의 모든 위치를 외우고 있다',
  '실종 신고를 받았다는 형사가 정작 신고 기록을 남기지 않았다',
]

// 티킹 클락(시간 압박) — 도시에 "명시 타이머·자연 마감·사회적 마감". 카운트다운의 정석.
const CLOCKS = [
  '폭탄 타이머가 17분 42초에서 줄어들고 있다',
  '해가 지면 구조 헬기가 회항한다 — 일몰까지 두 시간',
  '약효가 떨어지면 진실을 말하기 시작한다, 앞으로 40분',
  '자정 공판이 시작되면 증인은 영영 사라진다',
  '마지막 출항 배가 새벽 다섯 시에 떠난다',
  '산소가 90분 치밖에 남지 않은 밀폐된 공간이다',
  '몸값 송금 마감까지 한 시간, 추적은 불가능해진다',
  '눈이 도로를 완전히 덮기 전 30분 안에 빠져나가야 한다',
  '교대 경비가 돌아오기까지 단 12분의 공백',
  '배심 평결이 한 시간 뒤면 번복할 수 없게 확정된다',
  '아이의 산소호흡기 배터리가 두 시간 후 멎는다',
  '서버가 자동 백업을 덮어쓰기 전 증거를 빼내야 한다, 9분',
  '독이 퍼지기 전 해독제를 찾을 시간은 한 시간 남짓',
  '만조가 차오르면 지하 통로는 완전히 잠긴다',
  '발신 추적이 끝나기 전, 통화는 90초를 넘기면 안 된다',
  '비행기 이륙까지 25분 — 그 안에 막지 못하면 사라진다',
  '범인이 다음 희생자를 데려가기로 한 시각이 새벽 두 시다',
  '정전 복구로 보안 카메라가 다시 켜지기까지 8분',
  '인질 영상은 한 시간마다 한 명씩을 가리킨다',
  '진통제가 떨어지면 부상자는 움직일 수 없게 된다, 한 시간 안',
  '협박 영상이 공개되기로 예고된 시각까지 단 45분 남았다',
  '마지막 구조대가 철수하기 전, 신호를 보낼 시간은 20분뿐이다',
]

// 현장 디테일(다중 슬롯) — 도시에 "청각·촉각 강조·관용 동작 어휘".
const DETAILS = [
  '등줄기를 타고 흐르는 식은땀',
  '어둠 속 어딘가에서 멈췄다 이어지는 발소리',
  '천천히 닫히는 방화문의 묵직한 마찰음',
  '울리지 않다가 갑자기 진동하는 휴대폰',
  '백미러에 매번 같은 거리로 따라붙는 헤드라이트',
  '깜빡이며 윙윙대는 형광등',
  '안에서 잠긴 손잡이의 차가운 금속',
  '복도에서 들려오는, 한 명뿐이라기엔 잦은 발소리',
  '물건의 위치가 어제와 한 뼘 어긋나 있다',
  '귓가에 들러붙는 자신의 거친 숨소리',
  '문틈으로 새어 드는 한 줄기 손전등 불빛',
  '계단을 오를 때마다 일정하게 삐걱이는 13번째 단',
  '식어 버린 커피잔에 남은 또 다른 입술 자국',
  '벽 너머에서 잠깐 멈췄다 다시 도는 시계 초침',
  '주머니 속에서 떨리는, 발신자 표시 없는 진동',
  '신발 밑창에 들러붙은 낯선 진흙',
  '환기구를 타고 번지는 정체 모를 단내',
  '창유리에 안에서부터 서린 입김의 손자국',
  '바닥에 길게 끌린, 무언가를 끈 자국',
  '엘리베이터가 누르지 않은 층에서 한 번 멈춘다',
  '비상등만 켜진 복도의 붉은 잔광',
  '문 밑으로 슬며시 들어왔다 멈춘 그림자',
  '전화 너머 상대의 숨소리만 이어지는 침묵',
  '손끝에 닿는, 누군가 막 만진 듯 미지근한 난간',
  '천장에서 일정한 간격으로 떨어지는 물방울',
  '바람도 없는데 저 혼자 흔들리는 블라인드 줄',
  '카드키를 댈 때 평소와 다른 두 번의 비프음',
  '눅눅한 공기에 섞인 화약 냄새의 희미한 잔향',
  '복도 끝 거울에 잠깐 비쳤다 사라진 형체',
  '차 시동을 걸자 라디오가 켜 둔 적 없는 채널로 흘러나온다',
  '잠가 둔 줄 알았던 창문이 손가락 한 마디만큼 열려 있다',
  '바닥에 떨어진, 내 것이 아닌 낯선 단추 하나',
  '벽시계와 손목시계의 시각이 정확히 칠 분 어긋나 있다',
  '재떨이에 아직 온기가 남은, 누군가 막 끈 담배꽁초',
]

// 한 번에 뽑을 현장 디테일 개수(고정 4) — 다중 슬롯으로 조합수를 1조 이상으로 키운다.
const DETAIL_COUNT = 4

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 현장 디테일 n개를 중복 없이 뽑는다.
function pickDetails(n = DETAIL_COUNT): string[] {
  const poolArr = DETAILS.slice()
  const out: string[] = []
  for (let i = 0; i < n && poolArr.length; i++) {
    const idx = Math.floor(Math.random() * poolArr.length)
    out.push(poolArr[idx])
    poolArr.splice(idx, 1)
  }
  return out
}

// nCk 조합수(순서 무관) — 현장 디테일 4개 조합수 계산용
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 장소×기상×감시×분위기×위협×티킹클락×(현장 디테일 4개 조합)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  return PLACES.length * WEATHERS.length * WATCHES.length * MOODS.length * THREATS.length * CLOCKS.length * detailCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'weather' | 'watch' | 'mood' | 'threat' | 'clock' | 'detail'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '장소(압박 공간)', icon: '🏚️' },
  { key: 'weather', label: '시각·기상', icon: '🌧️' },
  { key: 'watch', label: '감시·통제 기제', icon: '📹' },
  { key: 'mood', label: '분위기·정조', icon: '🎭' },
  { key: 'threat', label: '위협의 정체', icon: '🔪' },
  { key: 'clock', label: '티킹 클락(시간 압박)', icon: '⏱️' },
  { key: 'detail', label: '현장 디테일(4)', icon: '🩸' },
]

interface Setting {
  place: string
  weather: string
  watch: string
  mood: string
  threat: string
  clock: string
  detail: string[]
}

function buildSetting(): Setting {
  return {
    place: pick(PLACES),
    weather: pick(WEATHERS),
    watch: pick(WATCHES),
    mood: pick(MOODS),
    threat: pick(THREATS),
    clock: pick(CLOCKS),
    detail: pickDetails(),
  }
}

// 배경 묘사 한 단락으로 엮기 — 스릴러 문법(압박 공간 → 감각 → 위협 → 카운트다운)으로 배치.
function compose(s: Setting): string {
  const detailText = s.detail.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.place}. ${s.weather}. ` +
    `${s.watch}. ${detailText} — 사소한 것들이 신경을 곤두세운다. ` +
    `공기를 채운 정조는 ${s.mood}. ` +
    `위협의 정체는 이렇다: ${s.threat}. ` +
    `그리고 시간이 없다 — ${s.clock}.`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedSetting { id: string; setting: Setting; note: string }
interface Persist { setting: Setting | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedSetting[] }

function isSetting(x: any): x is Setting {
  return x && typeof x.place === 'string' && typeof x.weather === 'string' &&
    typeof x.watch === 'string' && typeof x.mood === 'string' &&
    typeof x.threat === 'string' && typeof x.clock === 'string' && Array.isArray(x.detail)
}

function load(): Persist {
  const fallback: Persist = { setting: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const setting = isSetting(p?.setting) ? p.setting : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedSetting[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isSetting(x.setting))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), setting: x.setting, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { setting, locks, saved }
  } catch {
    return fallback
  }
}

export default function ThrillerSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [setting, setSetting] = useState<Setting | null>(initial.current.setting)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedSetting[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)
  // 사용자 정의 항목(미리 만든 데이터 없음 → 사용자가 직접 입력) + 고정 '기타' 자유 입력칸
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ setting, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [setting, locks, saved])

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
    setSetting((prev) => {
      const fresh = buildSetting()
      if (!prev) return fresh
      const next: Setting = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.weather) next.weather = prev.weather
      if (locks.watch) next.watch = prev.watch
      if (locks.mood) next.mood = prev.mood
      if (locks.threat) next.threat = prev.threat
      if (locks.clock) next.clock = prev.clock
      if (locks.detail) next.detail = prev.detail
      return next
    })
    // 새 무작위 생성 시: 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지. 기타도 비운다.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!setting) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  // ── 사용자 정의 항목 ──
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 출구·탈출로, 인물 동선, 소품)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: rid(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의·기타를 fields/character 맵에 더한다(비어있지 않은 값만). additive.
  const applyExtras = (target: Record<string, string>) => {
    custom.forEach((c) => {
      const label = c.label.trim()
      const value = c.value.trim()
      if (label && value && !(label in target)) target[label] = value
    })
    const e = etc.trim()
    if (e) target.etc = e
    return target
  }
  // 사용자 정의·기타를 텍스트로 엮는다(복사/요약용). 비어있으면 ''.
  const extrasText = (): string => {
    const lines: string[] = []
    custom.forEach((c) => {
      const label = c.label.trim()
      const value = c.value.trim()
      if (label && value) lines.push(`${label}: ${value}`)
    })
    const e = etc.trim()
    if (e) lines.push(`기타: ${e}`)
    return lines.join('\n')
  }

  const slotValue = (k: SlotKey): string => {
    if (!setting) return ''
    if (k === 'detail') return setting.detail.join(' · ')
    return setting[k] as string
  }

  const baseText = setting ? compose(setting) : ''
  const fullText = baseText + (extrasText() ? `\n\n${extrasText()}` : '')
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!setting || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveSetting = () => {
    if (!setting) return
    setSaved((prev) => [{ id: rid(), setting, note: '' }, ...prev])
    flashToast('무대를 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedSetting) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedSetting) => { setSetting(s.setting); setLocks({}); setCopied(false); flashToast('무대를 불러왔어요') }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (st: Setting, note?: string) => {
    const sensory = [
      `시각·기상: ${st.weather}`,
      `감시·통제: ${st.watch}`,
      `위협의 정체: ${st.threat}`,
      `티킹 클락: ${st.clock}`,
      `현장 디테일: ${st.detail.join(' / ')}`,
    ].join('\n')
    // 정규(표준) 항목 키로 매핑한 fields — 받는 허브(배경 설정집)에서 제자리(기본 칸)에 들어가도록.
    //   mood→atmosphere, weather→climate, threat→dangers, watch+clock→rules, detail→sensory.
    const fields: Record<string, string> = {
      name: st.place,
      kind: '스릴러 무대',
      atmosphere: st.mood,
      sensory: st.detail.join(' / '),
      climate: st.weather,
      rules: `감시·통제: ${st.watch}\n티킹 클락: ${st.clock}`,
      dangers: st.threat,
      notes: note || compose(st),
    }
    applyExtras(fields)
    addToLibrary('places', {
      name: st.place,
      kind: '스릴러 무대',
      mood: st.mood,
      sensory,
      notes: note || compose(st),
      fields,
      source: '스릴러 배경·현장 생성기',
    })
    flashToast(`장소 ‘${st.place.slice(0, 14)}…’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (st: Setting) => {
    addToLibrary('snippets', {
      text: compose(st),
      source: '스릴러 배경·현장 생성기',
      tags: ['스릴러', '서스펜스', '배경', '글감'],
    })
    flashToast('배경 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (st: Setting, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏚️ 장소(압박 공간):</b> ${esc(st.place)}</p>`,
      `<p><b>🌧️ 시각·기상:</b> ${esc(st.weather)}</p>`,
      `<p><b>📹 감시·통제 기제:</b> ${esc(st.watch)}</p>`,
      `<p><b>🎭 분위기·정조:</b> ${esc(st.mood)}</p>`,
      `<p><b>🔪 위협의 정체:</b> ${esc(st.threat)}</p>`,
      `<p><b>⏱️ 티킹 클락:</b> ${esc(st.clock)}</p>`,
      `<p><b>🩸 현장 디테일:</b></p><ul>${st.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(st))}</p>`,
    ].filter(Boolean).join('')
    // 정규(표준) 장소 항목 키로 매핑 — 받는 허브(배경 설정집)에서 제자리(기본 칸)에 들어가도록.
    //   mood→atmosphere, weather→climate, threat→dangers, watch+clock→rules, detail→sensory.
    //   기존 키(type/mood/weather/watch/threat/clock)는 보존하고 정규 키만 추가(additive).
    const character: Record<string, string> = {
      name: st.place,
      type: '스릴러 무대',
      mood: st.mood,
      weather: st.weather,
      watch: st.watch,
      threat: st.threat,
      clock: st.clock,
      sensory: st.detail.join(' / '),
      // ── 정규 장소 키(additive) ──
      kind: '스릴러 무대',
      atmosphere: st.mood,
      climate: st.weather,
      rules: `감시·통제: ${st.watch}\n티킹 클락: ${st.clock}`,
      dangers: st.threat,
    }
    if (note) character.notes = note
    applyExtras(character)
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `무대 · ${st.place.slice(0, 22)}`,
      bodyHtml,
      character,
      meta: { 유형: '스릴러 무대', 분위기: st.mood, 시간압박: st.clock, 출처: '스릴러 배경·현장 생성기' },
    })
    flashToast(id ? '무대를 프로젝트(자료 › 장소)에 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''
  const linkGenre = ctxGenre || '스릴러·서스펜스'

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'scene-weather', icon: '🌤️', label: '장면 날씨' },
    { id: 'plot-twist-deck', icon: '🔀', label: '반전 카드' },
  ]

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        <b>압박 공간·기상·감시·정조·위협·티킹 클락·현장 디테일</b>을 무작위로 엮어 하나의 <b>스릴러 무대</b>를 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요. 배경 자체가 인물을 옥죄는 압박 장치가 되도록.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭"/> 맥락: {ctxGenre}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '무대 생성'}</button>
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
                  {sl.key === 'detail' && setting && setting.detail.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.45, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {setting.detail.map((d, i) => <li key={i}>{dim ? '…' : d}</li>)}
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

        {/* 사용자 정의 항목 + 기타(자유 입력) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...secTitle }}>
            <span><Emoji e="✍️"/> 직접 추가한 항목 {custom.length ? `(${custom.length})` : ''}</span>
            <button className="minibtn" onClick={addCustom} title="새 항목을 추가하고 내용을 직접 적습니다">＋ 항목 추가</button>
          </div>
          {custom.map((c) => (
            <div key={c.id} style={{ ...slotCard, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, overflowWrap: 'anywhere' }}>{c.label}</div>
                <input
                  value={c.value}
                  onChange={(e) => setCustomValue(c.id, e.target.value)}
                  placeholder="내용을 직접 적어 주세요"
                  style={{ ...noteInput, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0 }}>✕</button>
            </div>
          ))}
          <div style={{ ...slotCard, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e="🗒️"/></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>기타 (자유 입력)</div>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="자유롭게 메모하세요 — 출구·동선, 소품, 인물 배치, 분위기 보강, 떠오른 아이디어 등"
                rows={4}
                style={{ ...noteInput, width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🌃"/> 스릴러 무대 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: setting ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈무대 생성〉을 눌러 배경을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!setting}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveSetting} disabled={!setting}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => setting && toLibrary(setting)} disabled={!setting} title="이 무대의 장소를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button className="linkbtn" onClick={() => setting && toSnippet(setting)} disabled={!setting} title="이 배경 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => setting && toProject(setting)}
            disabled={!setting || !linked}
            title={linked ? '이 무대를 프로젝트 설정(자료 › 장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 무대 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 무대가 없습니다. ☆로 마음에 드는 배경을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}><Emoji e="🏚️"/> {s.setting.place}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{compose(s.setting)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 장면·시점·복선·반전 단서 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {s.note}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 무대를 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toLibrary(s.setting, s.note || undefined)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.setting)} title="스니펫으로 저장"><Emoji e="📝"/> 스니펫</button>
                        <button className="linkbtn" onClick={() => toProject(s.setting, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트(자료 › 장소)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: linkGenre })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 무대는 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
