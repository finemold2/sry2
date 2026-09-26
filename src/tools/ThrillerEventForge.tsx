// 스릴러 사건·소재 대형 생성기 — 스릴러·서스펜스 장르의 한 '사건'을 슬롯 조합으로 대량 생성한다.
//   콜드 오픈(개입 사건) × 위협 주체 × 위협 대상(이해관계) × 티킹 클락 × 압박 공간 ×
//   서사 장치 × 결정적 단서/맥거핀 × 반전의 씨앗 × 다음 화 후크(클리프행어) 아홉 슬롯.
//   각 슬롯 로컬 표에서 한 조각씩 뽑아 "무엇이 터지고, 누가 위협하며, 무엇을 지켜야 하고,
//   시한은 언제이며, 어디서, 어떤 장치로, 무엇이 결정적이고, 무엇이 뒤집히는가"를 한 사건으로 엮는다.
//   마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주(잠금/재생성). 가능 조합 1조+ 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 사건을 자료('research')/'사건' 폴더 문서로 추가하고, 스니펫 라이브러리에도 저장.
//   관련 도구(추격 장면·클리프행어·반전 카드덱 등) openToolLinked 로 이어 열기.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'thriller-eventforge', name: '스릴러 사건 단조기', icon: '💣', group: '생성기', genre: '스릴러·서스펜스', intro: '콜드 오픈·위협·이해관계·티킹 클락·장치·반전을 조합해 스릴러 한 사건을 대량 생성', w: 600, h: 700 }

const LS = 'sry:tool:thriller-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 스릴러 사건의 한 축. faces = 그 축의 후보(로컬 표, 장르 특화·구체적).
// 9개 슬롯 × 평균 ~15면 → 조합 1조(10^12) 이상.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'open', label: '콜드 오픈', icon: '🩸', desc: '평온을 깨는 개입 사건(되돌아갈 수 없는 선)',
    faces: [
      '새벽 세 시, 한 번도 울린 적 없는 번호로 전화가 걸려 온다',
      '현관 매트 아래에서 자신만 아는 비밀번호가 적힌 쪽지가 발견된다',
      '출근길 백미러에 사흘째 같은 차가 붙어 있다',
      '집에 돌아오니 모든 가구가 5센티미터씩 옮겨져 있다',
      '익명의 소포가 도착하고, 안에는 자신의 어제 동선을 찍은 사진이 들어 있다',
      '실종 신고된 이웃의 휴대폰이 자기 우편함에서 울린다',
      '회사 서버에 본인 명의로 누군가의 사망 시각이 미리 기록돼 있다',
      '늘 잠겨 있던 옆집 문이 활짝 열린 채 안에서 자기 이름이 불린다',
      '폭우 속 갓길에서 발견한 차 안에는 시동이 켜진 채 사람만 사라졌다',
      '결혼기념일 아침, 배우자의 자리에 낯선 사람의 신분증이 놓여 있다',
      '엘리베이터 CCTV에 타지도 않은 자신이 찍혀 있다',
      '죽은 줄 알았던 사람의 부고가 내일 날짜로 미리 인쇄돼 도착한다',
      '병원에서 깨어나니 자신의 지난 72시간을 아무도 기억하지 못한다',
      '아이의 그림 속에 어젯밤 침실 창밖에 서 있던 형체가 그려져 있다',
      '한밤중 초인종이 울리고, 문구멍 너머에는 자신과 똑같은 얼굴이 서 있다',
      '평범한 출근, 그러나 회사 전체가 자신을 처음 보는 사람처럼 군다',
      '지하주차장에서 시동을 거는 순간 라디오가 자기 이름을 호명한다',
      '낯선 계정에서 자신의 미래 행적을 실황처럼 중계하는 메시지가 온다',
      '가족 단체방에 한 번도 보낸 적 없는 사진이 자기 이름으로 올라온다',
      '냉장고에 붙은 메모의 필체가 분명 자기 것인데 내용은 기억에 없다',
      '경찰서에서 "당신이 어제 신고한 살인"에 대해 묻는 전화가 걸려 온다',
      '거울에 비친 등 뒤로, 닫혀 있어야 할 방문이 천천히 열린다',
    ],
  },
  {
    key: 'threat', label: '위협 주체', icon: '🎯', desc: '한발 앞선 만만찮은 적대자',
    faces: [
      '피해자의 습관을 몇 달간 관찰해 온 면식범',
      '경찰 내부에서 수사 정보를 흘리는 부패한 형사',
      '얼굴 없는 청부 조직의 대리인',
      '죽은 줄로 알았던, 복수를 위해 돌아온 옛 동료',
      '정의를 자처하며 사람을 심판하는 연쇄 가해자',
      '권력을 지키려 진실을 묻으려는 거대 기업의 해결사',
      '주인공을 이용하려 접근한 가짜 조력자',
      '같은 트라우마를 거울처럼 공유하는 모방 범죄자',
      '집 안의 스마트기기를 장악한 디지털 스토커',
      '오래전 사건의 유일한 목격자를 지우려는 내부자',
      '주인공의 무죄를 증명할 자료를 쥔 협박자',
      '국경을 넘나드는 정보 브로커이자 이중 첩자',
      '피해자 가족을 자처하지만 정체가 모호한 추적자',
      '법망을 빠져나간 뒤 일상을 가장한 전과자',
      '주인공이 과거에 묻은 비밀을 정확히 아는 누군가',
      '겉으로는 가장 신뢰받는 권위자(흑막)',
      '피해자의 고통을 예술처럼 연출하는 냉정한 설계자',
      '주인공과 똑같은 얼굴로 그의 삶을 빼앗으려는 도플갱어',
      '법의 허점을 꿰뚫어 매번 한발 앞서가는 변호사',
      '온라인에서 사적 제재를 선동하는 익명의 무리',
      '주인공을 시험하듯 단서를 흘리며 게임을 거는 모방범',
      '죽은 피해자의 복수를 대행한다는 정체불명의 자경단',
    ],
  },
  {
    key: 'stake', label: '이해관계', icon: '⚖️', desc: '지켜야 할 것(상승하는 stakes)',
    faces: [
      '곤히 잠든 어린 자녀의 생명',
      '평생 쌓아 온 자신의 결백과 사회적 신분',
      '이미 한 번 잃을 뻔한 배우자의 목숨',
      '입을 열면 무너질 동료들의 안전',
      '도시 한복판 수백 명이 모인 행사장',
      '겨우 되찾은 평범한 일상과 새 출발',
      '죽은 이의 명예와 묻힌 진실',
      '자신만 아는, 폭로되면 끝장날 과거',
      '아직 태어나지 않은 아이와 산모',
      '증인 보호 중인 단 한 명의 생존자',
      '병상에 누운 부모에게 갈 마지막 시간',
      '조직 전체를 무너뜨릴 수 있는 한 사람',
      '간신히 회복 중인 자신의 정신과 분별력',
      '폭로 직전의 내부 고발 자료',
      '가족이라 믿어 온 관계의 진위',
      '눈앞에서 인질로 잡힌 낯선 타인',
      '단 하나 남은, 진실을 증언할 목격자의 입',
      '수십 명의 통근객이 탄 멈출 수 없는 열차',
      '아이가 다니는 학교 전체의 안전',
      '평생을 바쳐 지켜 온 누군가의 마지막 신뢰',
      '되돌리면 모두가 죽는, 이미 작동한 결정',
      '자신이 옳다고 믿어 온 정의의 근거 그 자체',
    ],
  },
  {
    key: 'clock', label: '티킹 클락', icon: '⏳', desc: '명시·자연·사회적 시한',
    faces: [
      '동이 트기 전까지 — 날이 밝으면 거래가 성사된다',
      '약효가 떨어지는 6시간 안에',
      '마지막 열차가 출발하기 전까지',
      '재판 첫 공판이 열리는 내일 오전 10시까지',
      '폭우로 끊긴 다리가 다시 잠기기 전까지',
      '배터리가 12퍼센트 남은 휴대폰이 꺼지기 전에',
      '인질의 생일 자정, 그가 정한 마감까지',
      '경찰이 영장을 들고 도착하기 전 30분',
      '밀물이 차오르는 두 시간 안에',
      '생방송이 끝나는 정시 뉴스 직전까지',
      '눈보라가 길을 완전히 막기 전까지',
      '독이 심장에 도달하는 마흔 분 안에',
      '비행기 탑승 마감 콜이 울리기 전에',
      '정전된 건물의 비상발전기가 멈추는 순간까지',
      '증거가 자동 삭제되도록 예약된 자정까지',
      '수술 동의서에 서명할 수 있는 마지막 한 시간',
      '투표가 마감되는 오후 여섯 시까지',
      '산소가 바닥나는 잠긴 방의 남은 공기만큼',
      '몸값 전달 시각으로 지정된 새벽 다섯 시까지',
      '눈이 녹아 시신이 드러나는 봄이 오기 전에',
      '범인이 다음 범행을 예고한 보름달이 뜨기 전까지',
      '기차가 종착역에 닿아 모두가 흩어지기 전까지',
    ],
  },
  {
    key: 'place', label: '압박 공간', icon: '🏚️', desc: '배경 자체가 압박 장치(폐쇄·고립·감시)',
    faces: [
      '폭설로 고립된 외딴 산장',
      '정전으로 멈춘 고층 빌딩의 비상계단',
      '승객만 남고 멈춰 선 야간열차',
      '신호가 끊긴 외딴섬의 별장',
      'CCTV가 사방을 비추는 무인 편의점',
      '완벽해 보이는 교외 주택가의 한 집',
      '환자가 사라진 폐쇄 병동',
      '물이 차오르는 지하 주차장',
      '안개에 잠긴 항구의 컨테이너 야적장',
      '문이 잠긴 채 멈춘 엘리베이터',
      '스마트홈 시스템이 통제하는 첨단 저택',
      '잠수정처럼 봉쇄된 연구 시설',
      '한밤의 24시간 무인 빨래방',
      '입주 직전, 아무도 없는 신축 모델하우스',
      '면회가 끊긴 구치소 접견실',
      '관제탑과 교신이 끊긴 비행기 기내',
      '비상구가 봉쇄된 채 만석인 심야 영화관',
      '눈보라에 갇혀 구조가 끊긴 고립된 연구 기지',
      '모든 출구가 자동 잠금된 무인 데이터센터',
      '안개 속에서 엔진이 멈춘 망망대해의 요트',
      '입소문만 무성한, 한 번 들어가면 못 나온다는 폐가',
      '감시 카메라만 살아 있는 한밤의 대형 쇼핑몰',
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🃏', desc: '이 장르 고유의 긴장 장치',
    faces: [
      '독자는 알지만 주인공은 모르는 정보 비대칭(서스펜스)',
      '엉뚱한 용의자로 시선을 끄는 레드 헤링',
      '초반에 무심히 보여 준 요소를 클라이맥스에서 회수(체호프의 총)',
      '믿었던 조력자가 사실은 적이었던 거짓 신뢰',
      '기억상실·거짓말로 흔들리는 신뢰할 수 없는 화자',
      "'지금'과 '그때'를 교차해 정보를 통제하는 이중 시점",
      '안전해야 할 집·결혼·이웃이 위협의 근원이 되는 전도',
      '같은 사실이 재독에서 결정적이 되는 단서의 이중 기능',
      '거의 다 알 것 같은데 결정적 한 조각이 비는 카운트-인 공개',
      '추격·은신·함정이 맞물리는 물리적 긴장 시퀀스',
      '권위자가 흑막인 잘못된 신뢰(편집증 조성)',
      '장 끝을 폭로 직전에서 끊는 클리프행어',
      '범인을 일찍 공개하고 "잡을 수 있나"로 끄는 캣앤마우스',
      '미래의 위기 장면을 먼저 보여 주고 시간을 거슬러 가는 구성',
      '모두가 쫓지만 내용은 덜 중요한 맥거핀의 추동',
      '가짜 승리 뒤 진짜 위협이 드러나는 중간점 반전',
      '시한이 0으로 향하는 명시적 카운트다운(티킹 클락)',
      "장면마다 '누가 무엇을 아는가'가 뒤바뀌는 정보 통제",
      '조력자·권위자가 차례로 의심받는 false ally 연쇄',
      '모든 것을 잃은 순간(All Is Lost) 뒤의 마지막 한 수',
      '평온한 일상 묘사로 위협 직전의 긴장을 늘리는 정적',
      '독자만 본 위험을 인물이 향해 다가가는 극적 아이러니',
    ],
  },
  {
    key: 'clue', label: '결정적 단서', icon: '🔑', desc: '회수될 물증·맥거핀',
    faces: [
      '피해자가 손톱으로 남긴 단 한 글자',
      '발신 기록이 지워진 한 통의 음성 메시지',
      '실수로 한 번 켜졌던 차량 블랙박스 영상',
      '범인만 알 수 있는 알레르기 흔적',
      '봉인된 USB에 담긴 거래 장부',
      '시간이 어긋난 한 장의 가족사진',
      '버려진 약통에 적힌 처방 날짜',
      '두 번 접힌 자국이 남은 유언장',
      '되감기다 멈춘 낡은 카세트테이프',
      '주소가 지워진 채 도착한 소포의 우체국 소인',
      '깨진 시계가 가리키는 멈춘 시각',
      '현장에 남은, 비를 맞지 않은 마른 발자국',
      '범행 시각의 알리바이를 무너뜨리는 영수증',
      '같은 필체로 쓰인 두 개의 다른 서명',
      '죽은 자의 휴대폰에 예약 발송된 메시지',
      '아무도 누른 적 없다는 초인종의 호출 기록',
      '지문이 닦였지만 한 곳만 남은 손바닥 자국',
      '두 번 다른 시각으로 찍힌 같은 CCTV 타임스탬프',
      '한 글자만 다르게 적힌, 똑같아 보이는 두 통의 협박장',
      '피해자가 삼킨 채 발견된 작은 메모리 카드',
      '범인만 알 수 있는 단어로 잠긴 비밀 계정',
      '현장에서 사라졌다가 엉뚱한 곳에서 나타난 물건',
    ],
  },
  {
    key: 'twist', label: '반전의 씨앗', icon: '🌀', desc: '판도를 뒤집을 진짜 정체/진실',
    faces: [
      '범인은 줄곧 곁에서 수사를 돕던 사람이었다',
      '피해자라 믿은 인물이 사실 모든 일을 설계한 가해자였다',
      '주인공의 기억 자체가 누군가에 의해 조작돼 있었다',
      '구하려던 인질이 자발적으로 잡힌 공범이었다',
      '죽은 줄 알았던 인물이 다른 이름으로 곁에 있었다',
      '주인공이 쫓던 범인은 잊고 있던 자기 자신이었다',
      '두 사건은 사실 같은 시각에 벌어진 하나의 사건이었다',
      '결백을 증명할 증거가 오히려 유죄의 결정적 단서였다',
      '평생의 은인이 모든 불행의 진짜 근원이었다',
      '내부 고발자를 자처한 자가 흑막의 우두머리였다',
      '주인공이 따른 명령서는 처음부터 위조된 것이었다',
      '구원의 메시지는 절망에 빠뜨리려는 거짓 희망이었다',
      '가장 먼저 용의선상에서 지운 사람이 진범이었다',
      '주인공의 가장 가까운 가족이 적과 거래해 왔다',
      '탈출에 성공한 바깥이 더 정교한 함정이었다',
      '진실을 밝히면 더 큰 거짓이 필요해진다',
      '믿고 따른 형사가 처음부터 사건의 설계자였다',
      '주인공이 막으려던 범행이 이미 그의 손으로 저질러졌다',
      '인질과 범인은 사실 서로를 지키려는 한편이었다',
      '경찰이 쫓던 연쇄살인범은 두 사람이 번갈아 연기한 한 인격이었다',
      '주인공이 평생 추적한 원흉은 자신을 키운 사람이었다',
      '진범을 잡는 순간, 그를 만든 진짜 흑막이 모습을 드러낸다',
    ],
  },
  {
    key: 'hook', label: '클리프행어', icon: '📉', desc: '장 끝을 끊는 다음 화 후크',
    faces: [
      '— 그리고 그 번호로 다시 전화가 걸려 왔다.',
      '— 문이 안에서 잠기는 소리가 들렸다.',
      '— 사진 속 인물은 분명 어제 죽었다.',
      '— 그가 마지막으로 본 얼굴은 거울 속 자신이었다.',
      '— 모두가 거짓말을 하고 있었다.',
      '— 시계는 0을 가리켰고, 아무 일도 일어나지 않았다.',
      '— 핸드폰 화면에 "네가 다음이야"라고 떴다.',
      '— 그 방에는 처음부터 시체가 두 구였다.',
      '— 경찰이 찾던 사람은 바로 자신이었다.',
      '— 침대 밑에서 누군가 숨을 참고 있었다.',
      '— 녹음 파일의 마지막 목소리는 주인공의 것이었다.',
      '— 구조대는 오지 않을 거라고, 그가 확신에 차서 말했다.',
      '— 그제야 모든 단서가 한 사람을 가리켰다 — 자기 자신을.',
      '— 다음 희생자의 이름이 이미 적혀 있었다.',
      '— 안전가옥의 문이 노크되었다. 아무도 알 수 없는 곳이었는데.',
      '— 그리고 불이 모두 꺼졌다.',
      '— 백미러 속 뒷좌석에, 분명 혼자 탔는데 누군가 앉아 있었다.',
      '— 그가 건넨 명함의 이름은, 오늘 아침 부고에서 본 이름이었다.',
      '— "이미 늦었어." 수화기 너머 목소리가 웃고 있었다.',
      '— 잠금장치가 안에서 철컥, 잠겼다.',
      '— 그제야 깨달았다. 자신은 처음부터 미끼였다는 것을.',
      '— 다음 페이지를 넘기기도 전에, 등 뒤에서 숨소리가 들렸다.',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmtN = (n: number) => n.toLocaleString('ko-KR')

// 큰 수를 사람이 읽기 좋은 한국어 단위(억/조)로 — 조합수 강조용.
function fmtCombos(n: number): string {
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`
  if (n >= 1e4) return `약 ${(n / 1e4).toFixed(0)}만`
  return fmtN(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과를 자연스러운 스릴러 사건 단락으로 엮는다(슬롯 순서 무관, 의미 단위 조립).
function compose(by: Record<string, string>): string {
  const { open, threat, stake, clock, place, device, clue, twist, hook } = by
  const parts: string[] = []
  if (open) parts.push(open)
  if (place) parts.push(`사건은 ${place}에서 벌어진다`)
  if (threat) parts.push(`그 배후에는 ${threat}가 있다`)
  if (stake) parts.push(`지켜야 할 것은 ${stake}`)
  if (clock) parts.push(`시한은 ${clock}`)
  if (device) parts.push(`긴장은 〈${device}〉로 조여진다`)
  if (clue) parts.push(`모든 것을 가를 단서는 ${clue}`)
  if (twist) parts.push(`그리고 마지막에 밝혀진다 — ${twist}`)
  if (!parts.length) return ''
  let body = parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
  if (hook) body += `\n${hook}`
  return body
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 관련 도구(있으면 이어 열기) — 도시에 근거: 추격·클리프행어·반전 등.
const RELATED: { id: string; label: string; icon: string }[] = [
  { id: 'chase-scene-gen', label: '추격 장면', icon: '🏃' },
  { id: 'cliffhanger-forge', label: '클리프행어', icon: '📉' },
  { id: 'plot-twist-deck', label: '반전 카드덱', icon: '🃏' },
  { id: 'betrayal-gen', label: '배신 시나리오', icon: '🗡️' },
  { id: 'scene-forge', label: '장면 생성', icon: '🎬' },
]

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function ThrillerEventForge({ payload }: { payload?: Record<string, unknown> }) {
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

  const allLocked = active.length > 0 && active.every((k) => locked[k])
  const setAllLock = (v: boolean) => setLocked(() => {
    const next: Record<string, boolean> = {}
    if (v) active.forEach((k) => { next[k] = true })
    return next
  })

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

  // 프로젝트 본문(HTML) — 완성 사건 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const paras = text.split('\n').filter(Boolean).map((ln) => `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(ln)}</b></p>`).join('')
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      paras,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 사건을 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const head = story.split('\n')[0] || story
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `💣 스릴러 사건 — ${head.slice(0, 24)}${head.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story.replace(/\n/g, ' '),
      meta: {
        장르: '스릴러·서스펜스',
        위협주체: byKey.threat || '—',
        이해관계: byKey.stake || '—',
        티킹클락: byKey.clock || '—',
        반전: byKey.twist || '—',
      },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 사건을 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[스릴러 사건] ${text}`,
      source: '스릴러 사건 단조기',
      tags: ['글감', '사건', '스릴러·서스펜스', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const head = s.text.split('\n')[0] || s.text
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `💣 스릴러 사건 — ${head.slice(0, 24)}${head.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text.replace(/\n/g, ' '),
      meta: { 장르: '스릴러·서스펜스' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>콜드 오픈·위협 주체·이해관계·티킹 클락·압박 공간·서사 장치·결정적 단서·반전·클리프행어</b> 슬롯을 골라 굴리면, 스릴러 한 사건이 한 단락으로 엮입니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="💣"/> 생성
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtCombos(combos)}</b>가지 ({fmtN(combos)})
            </span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setAllLock(!allLocked)} disabled={!hasResults}
              title={allLocked ? '전체 잠금 해제' : '전체 슬롯 잠금'}>
              {allLocked ? <><Emoji e="🔓"/> 전체 해제</> : <><Emoji e="🔒"/> 전체 고정</>}
            </button>
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}면</span></div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => face && copy('row_' + k, face)} disabled={!face} title="이 슬롯 복사"
                    style={{ flexShrink: 0 }}>
                    {copiedKey === 'row_' + k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 사건 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="💣"/> 스릴러 사건</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 스릴러 사건이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={forge}><Emoji e="💣"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트 연계 + 관련 도구 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 사건을 굴려주세요' : '현재 사건을 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            {RELATED.map((r) => (
              <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '스릴러·서스펜스' })}
                title={`${r.label} 도구 열기`}>
                <Emoji e={r.icon}/> {r.label}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 스릴러 사건을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 인물·국면에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건은 출발점일 뿐입니다. 같은 조합이라도 내 인물·관계·세계에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
