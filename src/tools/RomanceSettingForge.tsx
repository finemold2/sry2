// 로맨스 배경·현장 생성기(RomanceSettingForge) — 로맨스 장르 특화 '무대(설렘이 일어나는 현장)' 생성 도구.
//   장소(설렘의 무대) × 시각·계절 × 분위기(설렘의 결) × 밀착 장치(forced proximity) × 관계의 긴장(밀당·오해·연적)
//   단일 슬롯에 '감각 디테일'(다중 슬롯 4개)을 곱해 하나의 '로맨스 현장 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:romance-settingforge') 만 사용. 언마운트 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 글감 스니펫(addToLibrary('snippets')) + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'romance-settingforge',
  name: '로맨스 배경·현장 생성기',
  icon: '💞',
  group: '배경',
  genre: '로맨스',
  intro: '장소·계절·설렘의 결·밀착 장치·관계의 긴장·감각 디테일을 조합해 두근거리는 로맨스 무대를 만드세요',
  w: 580,
  h: 690,
}

const LS_KEY = 'sry:tool:romance-settingforge'

// ── 슬롯 풀(전부 자작·로맨스 특화·구체적) ──────────────────────────────
// 로맨스 장르 도시에 근거:
//   - 현대 로맨스(재벌·사내·계약연애) / 로맨스판타지(악역영애·황궁·공작저) / 히스토리컬(리젠시 무도회)
//   - 핵심 장치: Forced Proximity(one bed!·폭설·계약동거·위장부부), 밀당, 오해, 연적(질투), 니어키스, Grand Gesture
//   - 정서: 설렘·애틋함(yearning)·질투·화해·Black Moment 직전의 긴장

// 장소(설렘의 무대) — 현대/로판/히스토리컬을 두루 포괄. 둘이 마주칠 법한 구체적 현장.
const PLACES = [
  '샹들리에가 빛나는 황궁의 데뷔탕트 무도회장 한가운데',
  '공작저 장미 미궁 가장 깊은 곳, 유리 온실 안',
  '회귀 전 파혼당했던 바로 그 연회장 발코니',
  '비에 갇혀 단둘이 남은 변두리 정류장 처마 밑',
  '폭설로 길이 끊긴 산장, 침대가 하나뿐인 좁은 방',
  '계약 연애를 시작한 날 마주 앉은 호텔 라운지 창가',
  '야근 끝에 둘만 남은 텅 빈 사무실, 형광등 절반이 꺼진 밤',
  '엘리베이터가 멈춰 갇혀버린 좁은 철제 상자 안',
  '첫 만남의 그 카페, 빗물이 흐르는 통유리 창가 자리',
  '벚꽃이 흩날리는 캠퍼스 가로수길 벤치',
  '재벌가 본가, 가문의 초상화가 늘어선 어둑한 대리석 복도',
  '위장 부부로 들어선 신혼집, 짐 박스가 쌓인 거실',
  '한강이 내려다보이는 옥상, 도시의 불빛이 발아래 깔린 밤',
  '결혼식 리허설이 끝난 텅 빈 예식장, 꽃잎이 흩어진 버진로드',
  '병실 창가, 링거 줄 너머로 손이 닿을 듯한 간이침대 곁',
  '약혼식이 파투난 직후, 손님들이 빠져나간 적막한 대연회장',
  '눈 내리는 크리스마스이브, 불 꺼진 가게 앞 캐럴이 흐르는 거리',
  '황태자의 집무실, 촛불 아래 결재 서류가 쌓인 책상 너머',
  '둘이 같은 우산을 쓰고 걷는 비 내리는 야시장 골목',
  '여름 바닷가 펜션, 파도 소리가 들리는 2층 테라스',
  '오래된 서점 깊숙한 서가, 손이 같은 책으로 향한 좁은 통로',
  '공작가 무도회에서 빠져나온 달빛 정원, 분수 곁',
  '회사 송년회 뒤풀이, 사람들 사이에 끼어 어깨가 맞닿은 술집',
  '아침 햇살이 드는 동거 시작 첫날의 주방, 어색한 식탁 앞',
  '졸업식 날 텅 빈 교실, 마지막으로 둘만 남은 창가',
  '비행기 연착으로 발이 묶인 공항 라운지, 나란히 앉은 의자',
  '귀족 영애의 사교계 데뷔를 앞둔 드레스 가봉실',
  '비 오는 새벽, 마중 나온 차 안 좁은 조수석',
  '대저택 서재, 벽난로 불빛만이 일렁이는 늦은 밤',
  '여관에 방이 하나뿐이라 어쩔 수 없이 함께 든 작은 객실',
  '연적이 지켜보는 가운데 손을 잡고 입장해야 하는 가든파티',
  '소나기를 피해 함께 뛰어든 처마 좁은 전통 찻집',
  '회귀자만 아는 비극의 그날, 운명이 갈리는 황궁 계단 위',
  '둘이 함께 야경을 보러 오른 관람차의 멈춰 선 꼭대기 칸',
  '겨울 호숫가 별장, 장작 타는 벽난로 앞 단둘의 거실',
  '신분을 숨긴 채 일하게 된 황궁 시녀 처소의 좁은 복도',
  '회식 후 마지막 지하철을 놓친 텅 빈 역사 플랫폼',
  '병문안 온 늦은 밤, 잠든 그를 지키는 어두운 1인실 의자',
  '연인 행세를 하기로 한 상견례 자리, 식탁 아래 맞잡은 손',
  '정전으로 불이 꺼진 백화점 옥상 정원, 비상등만 깜빡이는 어둠 속',
  '심야 영화가 끝난 텅 빈 상영관, 엔딩크레디트만 흐르는 좌석',
  '함께 길을 잃은 낯선 골목, 가로등 하나만 켜진 막다른 길 끝',
  '태풍에 발이 묶인 작은 섬 민박집, 빗소리만 가득한 마루',
  '신년 카운트다운 인파에 떠밀려 마주 선 광장 한복판',
]

// 시각·계절 — 설렘을 증폭하는 시간대·날씨
const TIMES = [
  '벚꽃잎이 눈처럼 흩날리는 봄날 오후',
  '매미 소리가 잦아든 한여름 밤, 후텁지근한 공기',
  '첫눈이 소리 없이 내려앉는 12월의 깊은 밤',
  '단풍이 붉게 물든 늦가을의 비스듬한 노을',
  '소나기가 막 그치고 무지개가 걸린 여름 저녁',
  '안개가 자욱하게 깔린 이른 새벽, 인적 없는 시간',
  '도시의 불빛이 하나둘 켜지는 해 질 녘',
  '폭설이 모든 소리를 삼킨 한겨울 자정',
  '비가 유리창을 두드리는 장마철의 흐린 오후',
  '별이 유난히 쏟아지던 한여름 휴가의 밤',
  '연말 분위기로 들뜬 크리스마스이브 저녁',
  '벚꽃이 다 진 자리에 연둣빛 잎이 돋는 늦봄 아침',
  '달이 유난히 밝아 그림자가 또렷한 보름밤',
  '아침 햇살이 길게 드리운 휴일의 늦은 오전',
  '바람이 차게 부는 환절기, 외투깃을 여미는 밤',
  '함박눈이 가로등 불빛 아래 쏟아지던 퇴근길 저녁',
  '낙엽이 발밑에서 바스러지는 선선한 가을 정오',
  '장미가 만개한 초여름의 나른한 오후',
  '비 갠 뒤 물비린내가 올라오는 새벽녘',
  '한 해의 마지막을 알리는 제야의 종이 울리는 자정',
  '봄비가 보슬보슬 내리는 환한 아침나절',
  '눈이 시리게 푸른 가을 하늘이 펼쳐진 한낮',
  '열대야가 가시지 않는 새벽 두 시의 후끈한 어둠',
  '서리가 내려앉은 초겨울의 맑고 차가운 동틀 녘',
]

// 분위기(설렘의 결) — 로맨스 정서 곡선의 한 지점
const MOODS = [
  '심장이 멎을 듯 두근거리는 첫 설렘',
  '닿을 듯 닿지 않아 애가 타는 갈망(yearning)',
  '서로를 밀어내며 끌리는 팽팽한 밀당의 긴장',
  '연적의 등장에 일렁이는 질투와 자각',
  '오해가 쌓여 차갑게 식어버린 어색한 침묵',
  '말로는 부정하면서 자꾸 닿는 시선의 줄다리기',
  '고백 직전, 입술이 떨리는 결심의 정적',
  '재회의 순간 차오르는 그리움과 원망의 뒤섞임',
  '모든 것이 끝난 듯한 Black Moment의 절망',
  '오해가 풀리고 와락 밀려드는 화해의 안도',
  '가짜 연인인데 진짜가 되어버린 혼란스러운 떨림',
  '신분의 벽 앞에서 체념과 결연이 엇갈리는 비장함',
  '집착에 가까운 독점욕이 서늘하게 번지는 긴장',
  '뒤늦은 후회로 무너지는 권력자의 자존심',
  '단둘이 갇혀 어쩔 줄 모르는 어색하고 간지러운 공기',
  '술기운에 평소보다 가까워진 거리, 위태로운 들뜸',
  '말 없이 어깨를 내어준 위로의 따뜻한 공기',
  '운명을 알기에 더 애틋한 회귀자의 슬픈 다정함',
  '질투를 들킬까 애써 무심한 척하는 서투른 자존심',
  '오래 참아온 마음이 한순간 둑이 터지듯 쏟아지는 격정',
  '첫 키스 직전, 세상이 멈춘 듯한 아득한 정적',
  '서로의 상처를 처음으로 들킨 무방비한 친밀함',
  '농담처럼 던진 진심에 잠시 멎어버린 묘한 정적',
  '괜찮다 말하면서도 자꾸 곁을 맴도는 서툰 다정함',
  '먼저 손 내밀까 망설이다 놓쳐버린 아쉬운 머뭇거림',
  '눈이 마주칠 때마다 황급히 시선을 피하는 풋풋한 설렘',
]

// 밀착 장치(Forced Proximity / 둘을 물리적으로 묶는 로맨스 최강 장치)
const DEVICES = [
  '방이 하나뿐이라 한 침대를 나눠 써야 하는 상황(one bed!)',
  '폭설·폭우로 길이 끊겨 단둘이 갇혀버린 처지',
  '계약 연애·계약 결혼으로 어쩔 수 없이 붙어 있어야 하는 사이',
  '위장 부부·가짜 연인 행세를 해야 해 손을 잡고 다녀야 하는 설정',
  '같은 프로젝트·같은 임무에 묶여 매일 얼굴을 봐야 하는 처지',
  '엘리베이터·차 안 같은 좁은 공간에 둘만 갇힌 상황',
  '한 우산 아래 어깨가 닿을 만큼 붙어 걸어야 하는 빗길',
  '동거를 시작해 한 지붕 아래 어색하게 마주치는 일상',
  '간호·간병으로 곁을 지키며 손이 닿는 거리에 머무는 밤',
  '연적·집안 앞에서 다정한 연인을 연기해야 하는 자리',
  '신분을 숨기고 그의 곁에서 일하게 되어 매 순간 마주치는 처지',
  '사람들 틈에 떠밀려 어쩔 수 없이 몸이 밀착된 군중 속',
  '하나뿐인 담요·외투를 나눠 덮어야 하는 추운 밤',
  '술에 취한 한쪽을 다른 쪽이 부축해 데려가야 하는 귀갓길',
  '실수로 같은 방을 배정받아 하룻밤을 함께 보내야 하는 출장',
  '비밀을 공유한 공범이 되어 단둘이 입을 맞춰야 하는 상황',
  '넘어지는 그(녀)를 받아 안아 품에 들어와 버린 찰나',
  '좁은 주방·서가에서 비켜서려다 정면으로 마주 선 거리',
  '한 이불 속 발이 닿아 둘 다 잠든 척하는 어색한 새벽',
  '운명처럼 같은 목적지로 향하는 마지막 한 자리의 동행',
  '단 하나뿐인 의자를 두고 번갈아 비켜 앉아야 하는 좁은 자리',
  '서로의 비밀번호·열쇠를 맡아 수시로 드나들게 된 한 공간',
  '미끄러지는 그(녀)의 손목을 붙잡아 끌어당기게 된 찰나',
  '한 헤드폰을 한쪽씩 나눠 끼고 얼굴을 맞댄 좁은 거리',
]

// 관계의 긴장(밀당·오해·연적·고백 등 — 장면을 끌고 가는 정서적 엔진)
const TENSIONS = [
  '한 발 다가서면 두 발 물러서는 밀당의 진자가 팽팽하다',
  '풀면 한마디면 끝날 오해가 자존심 탓에 점점 깊어진다',
  '연적이 그(녀)의 곁에 바짝 붙어 진심을 자극한다',
  '고백을 했다가 차였던 기억이 둘 사이에 어색하게 남아 있다',
  '신분·재력의 격차가 가까워지려는 마음을 자꾸 가로막는다',
  '회귀 전의 비극을 혼자만 알기에 다가가기가 두렵다',
  '집안이 정해준 정략혼이 두 사람을 갈라놓으려 한다',
  '과거의 연인이 다시 나타나 흔들리는 마음을 시험한다',
  '서로를 적으로 여기던 사이에 끌림이 싹터 혼란스럽다',
  '곧 떠나야 하는 시한이 정해져 있어 매 순간이 애틋하다',
  '“우리는 계약일 뿐”이라 선을 그으면서도 마음이 새어 나온다',
  '한쪽은 이미 마음을 들켰는데 다른 쪽은 모른 척하고 있다',
  '버림받았던 쪽이 매달리는 상대를 차갑게 밀어내고 있다',
  '비밀을 들킬까 봐 가까워질수록 거리를 두려 안간힘을 쓴다',
  '질투를 들키지 않으려 애써 무심한 척 가시를 세운다',
  '오해가 폭발해 모든 게 끝장난 듯한 최저점에 와 있다',
  '그(녀)의 Grand Gesture가 무너졌던 마음을 흔들기 시작한다',
  '닿을 듯한 손끝을 번번이 거두며 갈망만 키워가고 있다',
  '신탁·예언이 두 사람의 결합을 금지하고 있다',
  '서로의 진심을 알면서도 자존심 때문에 먼저 말하지 못한다',
  '집착에 가까운 독점욕이 다정함과 위태롭게 뒤섞인다',
  '니어 키스가 번번이 누군가의 등장으로 무산되어 애가 탄다',
  '먼저 다가서면 지는 거라 둘 다 끝까지 모른 척 버티고 있다',
  '오랜 친구라는 선을 넘을까 봐 서로 조심스레 거리를 잰다',
  '상대의 옛 연인과 닮은 점이 자꾸 마음을 어지럽힌다',
  '약속된 이별의 날짜가 다가올수록 마음만 더 깊어진다',
]

// 감각 디테일(다중 슬롯) — 로맨스적 오감·신체 거리 묘사(touch escalation 포함)
const DETAILS = [
  '맞닿은 어깨에서 전해지는 미열',
  '귓가를 간질이는 낮고 가까운 숨소리',
  '손끝이 스칠 때 찌릿하게 곤두서는 감각',
  '그(녀)에게서 풍기는 은은한 향수·살냄새',
  '마주친 눈을 차마 떼지 못하고 멈춘 시선',
  '심장이 귓가에 들릴 만큼 크게 뛰는 박동',
  '뺨에 닿을 듯 가까워진 입술 사이의 거리',
  '손목을 붙잡은 그의 따뜻하고 단단한 손',
  '벚꽃잎이 머리카락에 내려앉는 봄바람',
  '빗소리에 묻혀 더 또렷이 들리는 두 사람의 침묵',
  '코끝이 시리도록 차가운 공기 속 하얀 입김',
  '커피잔을 건네다 겹쳐진 손가락의 온기',
  '머리카락을 귀 뒤로 넘겨주는 손길의 떨림',
  '눈송이가 속눈썹에 내려앉아 녹는 찰나',
  '한 우산 아래 비에 젖어가는 한쪽 어깨',
  '술기운에 발그레하게 달아오른 뺨',
  '담요 너머로 닿은 발끝의 미세한 떨림',
  '품에 안겼을 때 들리는 그의 낮은 심장 소리',
  '말없이 건넨 외투에 밴 익숙한 체취',
  '눈가에 맺혔다 흘러내리는 한 줄기 눈물',
  '입술이 닿기 직전 멈춰 선 아득한 정적',
  '맞잡은 손바닥에 배어나는 긴장한 땀',
  '촛불·가로등 불빛에 일렁이는 두 사람의 그림자',
  '귓불까지 붉어진 채 떨군 시선',
  '와인잔에 비친 맞은편 얼굴의 흔들림',
  '머뭇거리다 결국 잡지 못하고 거둔 손끝',
  '바람에 실려 온 그(녀)의 나직한 한숨',
  '손을 놓치지 않으려 꼭 쥔 손가락 마디',
  '서로의 온기에 녹아내리는 차가운 손',
  '돌아서는 등 뒤로 번지는 못다 한 말의 여운',
  '졸다가 그(녀)의 어깨에 기댄 채 잠들어 버린 무게',
  '내미는 손을 잡을지 말지 허공에 멈춘 손끝',
  '함께 본 불꽃놀이가 눈동자에 어른거리는 잔상',
  '이름을 부르는 목소리가 평소보다 한 톤 낮게 잠긴 순간',
  '손등에 살며시 포개졌다 떨어지는 다른 손의 온기',
  '겨우 한 뼘 거리에서 서로의 숨이 섞이는 아찔함',
]

// 한 번에 뽑을 감각 디테일 개수(고정 5) — 다중 슬롯으로 조합수를 1조 이상으로 키운다.
const DETAIL_COUNT = 5

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 감각 디테일 n개를 중복 없이 뽑는다.
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

// nCk 조합수(순서 무관) — 감각 디테일 4개 조합수 계산용
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 장소×시각×분위기×밀착장치×관계의긴장×(감각 디테일 5개 조합)
// 44 × 24 × 26 × 24 × 26 × C(36,5)=376992 ≈ 약 6.46조
//   (직전 39×20×22×20×22×C(30,5)=약 1.08조 대비 +5.38조 증가 — 풀 확장으로 곱집합 대폭 증대)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  return PLACES.length * TIMES.length * MOODS.length * DEVICES.length * TENSIONS.length * detailCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'time' | 'mood' | 'device' | 'tension' | 'detail'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '장소(설렘의 무대)', icon: '🏛️' },
  { key: 'time', label: '시각·계절', icon: '🌅' },
  { key: 'mood', label: '분위기(설렘의 결)', icon: '💗' },
  { key: 'device', label: '밀착 장치', icon: '🛏️' },
  { key: 'tension', label: '관계의 긴장', icon: '💢' },
  { key: 'detail', label: '감각 디테일(5)', icon: '🌸' },
]

interface Setting {
  place: string
  time: string
  mood: string
  device: string
  tension: string
  detail: string[]
}

function buildSetting(): Setting {
  return {
    place: pick(PLACES),
    time: pick(TIMES),
    mood: pick(MOODS),
    device: pick(DEVICES),
    tension: pick(TENSIONS),
    detail: pickDetails(),
  }
}

// 로맨스 현장 묘사 한 단락으로 엮기
function compose(s: Setting): string {
  const detailText = s.detail.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.time}, ${s.place}. ` +
    `${s.device}. 두 사람 사이엔 ${s.tension}. ` +
    `${detailText} — 사소한 감각 하나하나가 마음을 흔든다. ` +
    `공기에 감도는 분위기는 ${s.mood}.`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedSetting { id: string; setting: Setting; note: string }
interface CustomItem { id: string; label: string; value: string }
interface Persist { setting: Setting | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedSetting[]; custom: CustomItem[]; etc: string }

function isSetting(x: any): x is Setting {
  return x && typeof x.place === 'string' && typeof x.time === 'string' &&
    typeof x.mood === 'string' && typeof x.device === 'string' &&
    typeof x.tension === 'string' && Array.isArray(x.detail)
}

function load(): Persist {
  const fallback: Persist = { setting: null, locks: {}, saved: [], custom: [], etc: '' }
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
    const custom: CustomItem[] = Array.isArray(p?.custom)
      ? p.custom
          .filter((x: any) => x && typeof x.label === 'string')
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), label: x.label, value: typeof x.value === 'string' ? x.value : '' }))
      : []
    const etc = typeof p?.etc === 'string' ? p.etc : ''
    return { setting, locks, saved, custom, etc }
  } catch {
    return fallback
  }
}

export default function RomanceSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [setting, setSetting] = useState<Setting | null>(initial.current.setting)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedSetting[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)
  // 사용자 정의 항목(이름은 유지, 값은 재생성 시 비움) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>(initial.current.custom)
  const [etc, setEtc] = useState(initial.current.etc)

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ setting, locks, saved, custom, etc } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [setting, locks, saved, custom, etc])

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
      if (locks.time) next.time = prev.time
      if (locks.mood) next.mood = prev.mood
      if (locks.device) next.device = prev.device
      if (locks.tension) next.tension = prev.tension
      if (locks.detail) next.detail = prev.detail
      return next
    })
    // 무작위 재생성 시: 사용자 정의 항목의 '값'과 '기타'는 비우되 항목(이름)은 유지
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 의상, 소품, BGM)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: rid(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의 항목·기타를 fields/character 맵에 합치는 헬퍼(값이 있을 때만)
  const mergeExtras = <T extends Record<string, string>>(base: T): T => {
    const out: Record<string, string> = { ...base }
    custom.forEach((c) => { const v = c.value.trim(); if (c.label.trim() && v) out[c.label.trim()] = v })
    const e = etc.trim()
    if (e) out.etc = e
    return out as T
  }
  const extrasText = (): string => {
    const lines: string[] = []
    custom.forEach((c) => { const v = c.value.trim(); if (c.label.trim() && v) lines.push(`${c.label.trim()}: ${v}`) })
    const e = etc.trim()
    if (e) lines.push(`기타: ${e}`)
    return lines.join('\n')
  }

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!setting) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  const slotValue = (k: SlotKey): string => {
    if (!setting) return ''
    if (k === 'detail') return setting.detail.join(' · ')
    return setting[k] as string
  }

  const fullText = setting ? compose(setting) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!setting || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    const extras = extrasText()
    navigator.clipboard.writeText([fullText, extras].filter(Boolean).join('\n')).then(() => {
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
    flashToast('현장을 즐겨찾기에 저장했어요')
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
  const loadSaved = (s: SavedSetting) => { setSetting(s.setting); setLocks({}); setCopied(false); flashToast('현장을 불러왔어요') }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (st: Setting, note?: string) => {
    const sensory = [
      `시각·계절: ${st.time}`,
      `밀착 장치: ${st.device}`,
      `관계의 긴장: ${st.tension}`,
      `감각 디테일: ${st.detail.join(' / ')}`,
    ].join('\n')
    const extras = extrasText()
    addToLibrary('places', {
      name: st.place,
      kind: '로맨스 무대',
      mood: st.mood,
      sensory: extras ? `${sensory}\n${extras}` : sensory,
      notes: [note || compose(st), extras].filter(Boolean).join('\n'),
      fields: mergeExtras({
        name: st.place,
        kind: '로맨스 무대',
        atmosphere: st.mood,
        climate: st.time,
        sensory: st.detail.join(' / '),
        notes: [`밀착 장치: ${st.device}`, `관계의 긴장: ${st.tension}`, note || compose(st)].filter(Boolean).join('\n'),
      }),
      source: '로맨스 배경·현장 생성기',
    })
    flashToast(`장소 ‘${st.place.slice(0, 16)}…’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (st: Setting) => {
    const extras = extrasText()
    addToLibrary('snippets', {
      text: [compose(st), extras].filter(Boolean).join('\n'),
      source: '로맨스 배경·현장 생성기',
      tags: ['로맨스', '배경', '현장', '글감'],
    })
    flashToast('현장 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (st: Setting, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏛️ 장소(설렘의 무대):</b> ${esc(st.place)}</p>`,
      `<p><b>🌅 시각·계절:</b> ${esc(st.time)}</p>`,
      `<p><b>💗 분위기(설렘의 결):</b> ${esc(st.mood)}</p>`,
      `<p><b>🛏️ 밀착 장치:</b> ${esc(st.device)}</p>`,
      `<p><b>💢 관계의 긴장:</b> ${esc(st.tension)}</p>`,
      `<p><b>🌸 감각 디테일:</b></p><ul>${st.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      ...custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => `<p><b>${esc(c.label.trim())}:</b> ${esc(c.value.trim())}</p>`),
      etc.trim() ? `<p><b>기타:</b> ${esc(etc.trim())}</p>` : '',
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(st))}</p>`,
    ].filter(Boolean).join('')
    const character: Record<string, string> = mergeExtras({
      name: st.place,
      type: '로맨스 무대',
      mood: st.mood,
      time: st.time,
      device: st.device,
      tension: st.tension,
      sensory: st.detail.join(' / '),
      // 정규 장소 키(받는 허브가 기본 칸에 매핑) — 기존 키는 유지하고 정규 키를 1:1로 추가
      kind: '로맨스 무대',
      atmosphere: st.mood,
      climate: st.time,
      notes: [`밀착 장치: ${st.device}`, `관계의 긴장: ${st.tension}`, note].filter(Boolean).join('\n'),
    })
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `로맨스 현장 · ${st.place.slice(0, 18)}`,
      bodyHtml,
      character,
      meta: { 유형: '로맨스 무대', 분위기: st.mood, 밀착장치: st.device, 출처: '로맨스 배경·현장 생성기' },
    })
    flashToast(id ? '이 현장을 프로젝트(자료 › 장소)에 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'first-meeting-gen', icon: '💌', label: '첫 만남 생성기' },
    { id: 'emotional-beat', icon: '💞', label: '감정 비트' },
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
        <b>장소·시각·설렘의 결·밀착 장치·관계의 긴장·감각 디테일</b>을 무작위로 엮어 두근거리는 <b>로맨스 현장</b>을 만듭니다.
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleLock(sl.key)}
                    title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                    style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                  ><Emoji e={isLocked ? '🔒' : '🔓'}/></button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💞"/> 로맨스 현장 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: setting ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈현장 생성〉을 눌러 두근거리는 무대를 만들어 보세요.'}
          </div>
        </div>

        {/* 사용자 정의 항목 + 고정 '기타' 자유 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ ...secTitle }}>
            <span><Emoji e="➕"/> 내 항목 · 기타</span>
            <button className="minibtn" onClick={addCustom} title="직접 채울 새 항목을 추가합니다">＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {custom.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', minWidth: 64, paddingTop: 6, overflowWrap: 'anywhere' }}>{c.label}</div>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 적어 주세요"
                    style={noteInput}
                  />
                  <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>기타</div>
            <textarea
              value={etc}
              onChange={(e) => setEtc(e.target.value)}
              placeholder="자유롭게 메모하세요 (위에 없는 디테일·설정·아이디어 등)"
              rows={3}
              style={{ ...noteInput, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!setting}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveSetting} disabled={!setting}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => setting && toLibrary(setting)} disabled={!setting} title="이 현장의 장소를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button className="linkbtn" onClick={() => setting && toSnippet(setting)} disabled={!setting} title="이 현장 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => setting && toProject(setting)}
            disabled={!setting || !linked}
            title={linked ? '이 현장을 프로젝트 설정(자료 › 장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 현장 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 현장이 없습니다. ☆로 마음에 드는 무대를 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🏛️"/> {s.setting.place}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{compose(s.setting)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 장면·인물·복선 등)"
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
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : { genre: '로맨스' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 현장은 출발점일 뿐 인물의 감정에 맞게 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
