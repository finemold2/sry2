// 스릴러 세계관 빌더 (스릴러·서스펜스 / 세계관) — 도시에(dossier)에 근거해 스릴러 한 편의 세계/설정을 항목별로 구조화하는 설정 빌더.
//  좌측: 작품 목록(선택·검색·추가·삭제·순서이동). 우측: 선택 작품 편집.
//  설계 축(도시에 §2 관습 · §3 서사 장치 · §4 구조 · §5 클라이맥스 · §7 압박 공간):
//   무대·압박공간 / 위협(적대자) / 이해관계·상승 / 티킹 클락 / 정보 비대칭 / 주인공의 취약점 / 맥거핀·체호프의 총 / 반전·레드 헤링 / 감각·페이싱 톤 / 클라이맥스·결말.
//  각 섹션마다 도시에에 뿌리내린 "설계 질문"을 두어 빈칸을 메우게 하고, 슬롯 풀 무작위 영감(잠금/재생성, 조합수 표시 — 30조 이상)도 제공한다.
//  사전류(스릴러 어휘·클리셰): 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  모든 데이터는 localStorage('sry:tool:thriller-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
//  연계: addToProject(kind:setting, root:research, folder:'세계관') · hasProjectBridge · addToLibrary('places'|'snippets') · openToolLinked. payload.genre/name 활용.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'thriller-worldbuilder',
  name: '스릴러 세계관 빌더',
  icon: '🕵️',
  group: '세계관',
  genre: '스릴러·서스펜스',
  intro: '무대·적대자·이해관계·티킹 클락·정보 비대칭·맥거핀·반전·클라이맥스까지 스릴러 한 편의 세계를 설계하는 빌더',
  w: 800,
  h: 670,
}

const LS_KEY = 'sry:tool:thriller-worldbuilder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 한국어 조사 선택 — 앞 단어의 받침을 보고 실제 조사 하나를 골라 붙인다(괄호 이중표기 금지).
function hasJong(word: string): boolean {
  const m = (word || '').trim()
  if (!m) return false
  const ch = m[m.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false   // 한글 음절이 아니면(영문·숫자 등) 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// 받침 있으면 a(은/을/이/으로), 없으면 b(는/를/가/로) — '로/으로'는 ㄹ받침 예외 처리
function josaEunNeun(w: string): string { return hasJong(w) ? '은' : '는' }
function josaEulReul(w: string): string { return hasJong(w) ? '을' : '를' }
function josaIga(w: string): string { return hasJong(w) ? '이' : '가' }
function josaRo(w: string): string {
  const m = (w || '').trim()
  if (!m) return '로'
  const ch = m[m.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '로'
  const jong = (code - 0xac00) % 28
  return (jong === 0 || jong === 8) ? '로' : '으로'   // 받침 없음 또는 ㄹ(8) → '로'
}
const J = (w: string, kind: 'eunneun' | 'eulreul' | 'iga' | 'ro'): string => {
  const j = kind === 'eunneun' ? josaEunNeun(w) : kind === 'eulreul' ? josaEulReul(w) : kind === 'iga' ? josaIga(w) : josaRo(w)
  return w + j
}

function fmtBig(n: number): string {
  if (n >= 1e16) return (n / 1e16).toFixed(2).replace(/\.?0+$/, '') + '경'
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억'
  if (n >= 1e4) return (n / 1e4).toFixed(2).replace(/\.?0+$/, '') + '만'
  return n.toLocaleString('ko-KR')
}

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

// ───────────────────────── 선택형 축(도시에 §0 구분 · §1 하위장르 계보 · §2·§5) ─────────────────────────
// 하위 장르(도시에 §1 서브장르 지도)
const SUBGENRES = [
  { v: '심리 스릴러 (도메스틱·언리라이어블)', d: '집·결혼·이웃이 위협이 되는 위장된 일상성. 신뢰할 수 없는 화자. 『레베카』『나를 찾아줘』 계보.' },
  { v: '액션·추적 스릴러', d: '주인공이 쫓고 쫓기는 추진형. 짧은 챕터·페이싱. 리 차일드 『잭 리처』, 러들럼 『본』.' },
  { v: '리걸·법정 스릴러', d: '로펌·법정·증거개시. 공판 일정이 곧 티킹 클락. 그리샴 『펠리컨 브리프』, 터로우 『무죄추정』.' },
  { v: '정치·스파이 스릴러', d: '국경·안전가옥·기관 내부 권력 다툼. 도덕적 회색. 르카레, 포사이스 『자칼의 날』.' },
  { v: '법의학·수사 스릴러', d: '연쇄살인·프로파일링·함정형 플롯. 해리스 『양들의 침묵』, 디버 『본 콜렉터』.' },
  { v: '테크노·생존 스릴러', d: '기술·재난·팬데믹·생존. 절차적 디테일. 크라이튼 『쥬라기 공원』, 클랜시.' },
  { v: '누아르·청부 스릴러', d: '부패한 도시·청부·뒷골목. 도덕적 추락. 김언수 『설계자들』, 한국형 어반 누아르.' },
  { v: '코드·보물찾기 스릴러', d: '맥거핀을 쫓는 퍼즐. 단서-반전 연쇄. 브라운 『다빈치 코드』.' },
  { v: '도주(누명) 스릴러', d: '누명 쓰고 쫓기며 진실을 캔다. "믿을 사람이 없다". 『도망자』형.' },
] as const

// 시점/정보 설계(도시에 §3 정보 비대칭의 기본 모드)
const POV_MODE = [
  { v: '독자 > 인물 (서스펜스)', d: '독자가 더 안다. 테이블 밑 폭탄식 기다림의 긴장. 히치콕 정의.' },
  { v: '독자 = 인물 (동행·미스터리)', d: '주인공과 같이 알아간다. 후스더닛·조사형.' },
  { v: '독자 < 인물 (반전·서프라이즈)', d: '결정적 정보를 숨겼다 터뜨린다. 언리라이어블 내레이터.' },
  { v: '이중 시점 교차 (지금/그때)', d: '시간선·시점을 분절해 정보를 통제·지연. 챕터 라벨.' },
] as const

// 결말 톤(도시에 §5 클라이맥스 관습)
const ENDING_TONE = [
  '카타르시스 (위협 무력화·정의 실현)',
  '대가 있는 승리 (이겼지만 상처·희생)',
  '거짓 결말 후 막판 부활 (마지막 한 방)',
  '다크 엔딩 (악이 이기거나 패배)',
  '오픈·스팅어 (마지막 한 줄 반전·불안 잔류)',
  '도덕적 회색 (승패 없이 환멸·진실의 무게)',
] as const

// ───────────────────────── 무작위 영감 슬롯 풀(도시에 §3·§6·§7 근거 자작 — 스릴러 특화) ─────────────────────────
// 조합수 = 모든 풀 길이의 곱 → 30조 이상을 지향(핵심 생성기). 모든 항목은 고유.
const POOLS = {
  무대: ['눈보라에 갇힌 외딴 산장', '정전된 고층 오피스 빌딩', '멈춰 선 심야 지하철 객차', '완벽해 보이는 교외 주택가', '통신이 끊긴 극지 연구기지', '항해 중 고립된 화물선', '폐쇄 병동이 있는 종합병원', '재판 사흘을 앞둔 법정·로펌', '환승 대기 중인 국제공항', '도청이 의심되는 안전가옥', '비 내리는 항만의 컨테이너 야적장', '엘리베이터가 멈춘 호텔 펜트하우스', '터널 한복판에 갇힌 정체된 도로', '감시 카메라로 도배된 스마트홈', '폭동 직전의 구치소 면회실', '내부 권력 다툼 중인 첩보 기관', '백신을 봉쇄한 격리 병원', '학부모 모임이 도는 사립 명문 학교', '폭설로 발이 묶인 고속도로 휴게소', '정전과 함께 봉쇄된 지하 주차장', '폐역으로 향하는 마지막 야간열차', '바닷물이 차오르는 방조제 안 매립지'],
  위협정체: ['한발 앞서 움직이는 천재 사이코패스', '얼굴 없는 청부살인 조직', '내부에 심어진 이중 스파이(두더지)', '피해자를 함정에 빠뜨리는 연쇄살인범', '증거를 인멸하는 부패한 고위 권력자', '완벽한 알리바이를 가진 이웃집 남자', '가족을 흉내 내며 곁에 숨은 자', '디지털 흔적을 추적하는 감시 자본가', '복수를 설계한 과거의 피해자', '카운트다운 폭탄을 설치한 테러범', '기억을 조작당한 또 다른 나', '내부 고발을 막으려는 거대 기업', '경찰 배지를 단 진범', '실종을 위장한 채 살아 있는 배우자', '제보자를 차례로 제거하는 정보기관', '신원을 바꿔 가며 도주하는 도망자', '협박 영상으로 사람을 조종하는 해커', '환자를 표적으로 삼는 위장한 의료진', '증인을 입막음하려는 정치 브로커', '온라인에서만 존재하는 정체불명의 추적자'],
  이해관계: ['납치된 아이의 목숨', '잘못 기소된 자신의 무죄', '폭로되면 무너질 가족의 비밀', '도시 전체를 노린 테러의 저지', '사라진 거액과 그 행방', '제보자의 신변 안전', '곧 처형될 무고한 사형수', '유출되면 전쟁이 날 기밀 문서', '자신의 직위와 평판', '다음 표적이 될 또 다른 피해자', '병으로 시한부인 사람의 마지막 진실', '봉인되면 영영 묻힐 과거의 살인', '배심원단을 매수한 음모의 증거', '되찾아야 할 빼앗긴 신분', '입원한 가족을 살릴 마지막 치료제', '무너지기 직전인 회사의 운명', '함께 도망친 동료의 목숨'],
  티킹클락: ['72시간 안에 몸값을 마련해야', '자정 공판이 시작되기 전에', '폭탄 타이머가 0이 되기 전에', '출항하는 배가 떠나기 전에', '약효가 떨어져 의식을 잃기 전에', '날이 밝아 그가 사라지기 전에', '내부 감사가 들이닥치기 전에', '집행 명령이 내려지기 전에', '백신이 동나기 전에', '범인이 다음 표적을 노리기 전에', '증거가 자동 삭제되기 전에', '국경이 봉쇄되기 전에', '인질의 산소가 바닥나기 전에', '투표가 마감되기 전에', '밀물이 통로를 삼키기 전에', '마지막 기차가 떠나기 전에', '폭로 기사가 송고되기 전에'],
  정보비대칭: ['독자만 폭탄의 존재를 안다(테이블 밑 폭탄)', '주인공만 진범을 의심하지만 아무도 안 믿는다', '독자는 화자가 거짓말 중임을 모른다', '두 시간선이 같은 인물임을 끝까지 숨긴다', '조력자가 적의 끄나풀임을 독자는 안다', '피해자가 사실 가해자였음을 가린다', '같은 단서가 재독에서만 결정적이 된다', '주인공의 기억이 조작됐음을 늦게 드러낸다', '독자만 다음 표적이 누구인지 안다', '권위자가 흑막임을 막판까지 위장한다', '사라진 인물이 살아 있음을 한쪽 시점만 안다', '진짜 동기를 독자에게서 끝까지 숨긴다', '독자만 알리바이가 거짓임을 안다', '두 사건이 하나로 이어짐을 끝까지 감춘다', '주인공이 이미 함정에 든 줄 독자만 안다'],
  주인공취약점: ['끊었던 술에 다시 손대는 형사', '약을 끊자 환각을 의심받는 목격자', '믿었던 파트너에게 배신당한 요원', '기억을 잃어 자기 결백조차 모르는 사람', '딸을 잃은 죄책감에 시달리는 수사관', '내부 고발 뒤 모두에게 외면당한 직원', '시한부 판정을 받고 시간이 없는 탐정', '한 건만 더 하고 은퇴하려는 베테랑', '신뢰를 잃어 아무도 안 믿어 주는 화자', '몸을 다쳐 도망칠 수 없는 인물', '가족을 인질로 잡혀 협조할 수밖에 없는 자', '과거의 거짓말이 발목 잡는 변호사', '말을 못 해 위험을 알릴 수 없는 인물', '빚에 몰려 위험한 일을 떠맡은 사람', '공황 발작에 시달리는 협상가', '청력을 잃어 위협을 듣지 못하는 인물'],
  맥거핀: ['모두가 쫓는 정체불명의 USB', '봉인된 비밀 계좌의 번호', '진실이 담긴 마지막 녹취 파일', '핵코드가 든 검은 가방', '제보자의 신원이 적힌 명단', '바꿔치기된 증거물 봉투', '암호로 잠긴 망자의 일기장', '거래의 증거인 위조 서류', '도난당한 시제품 설계도', '맞바꿔야 할 인질과 디스크', '사라진 회계 장부', '판도를 뒤집을 한 장의 사진', '잠긴 금고 속 미공개 유언장', '추적당하는 익명의 휴대폰', '복원이 필요한 손상된 메모리 카드', '단 하나뿐인 백신 샘플', '봉인된 증거 보관함의 열쇠'],
  체호프의총: ['초반에 무심히 보인 손목의 흉터', '버릇처럼 만지작거리던 라이터', '주인공의 치명적 약물 알레르기', '아무렇지 않게 외우던 비밀번호', '오래된 사진 속 구석의 인물', '늘 차고 다니는 고장 난 손목시계', '습관적으로 적는 작은 수첩', '한 번 언급된 비밀 통로', '버려진 줄 알았던 예비 열쇠', '대수롭지 않게 흘린 한마디 거짓말', '벽에 걸린 사냥용 장총', '꺼 두었던 백업 녹음기', '주인공만 아는 어린 시절의 약속', '무심코 챙긴 상대의 명함', '한 번 스친 비상계단의 위치', '늘 켜져 있던 구석의 감시 카메라'],
  반전레드헤링: ['가장 의심스럽던 용의자가 진짜 피해자였다', '믿었던 조력자가 처음부터 흑막이었다', '범인은 가장 가까운 가족이었다', '죽은 줄 알았던 인물이 살아 돌아온다', '주인공 자신이 신뢰할 수 없는 화자였다', '쫓던 맥거핀은 미끼였고 진짜는 따로 있었다', '피해자와 가해자가 한 인물의 두 얼굴이었다', '경찰·검사 안에 진범이 숨어 있었다', '엉뚱한 용의자로 시선을 끄는 가짜 단서', '구원자라 믿은 자가 함정을 판 장본인이었다', '실종 사건은 본인이 꾸민 자작극이었다', '두 시간선의 주인공이 같은 사람이었다', '자백한 범인은 진범을 감싸는 대역이었다', '복수의 표적이 사실 무고했음이 드러난다', '구조 요청 신호는 범인이 보낸 미끼였다', '쌍둥이의 존재가 모든 알리바이를 뒤집는다'],
  감각페이싱: ['백미러 속에서 떨어지지 않는 차의 헤드라이트', '울리지 않다가 한밤중 갑자기 울리는 전화', '닫히는 엘리베이터 문 사이로 보이는 실루엣', '등줄기를 타고 흐르는 식은땀', '깜빡이는 형광등 아래의 긴 복도', '잠긴 방문 너머의 미세한 인기척', '제자리에서 옮겨져 있는 물건', '심박이 귓속에서 울리는 정적', '카운트다운하는 타이머의 붉은 숫자', '빗속에서 번지는 네온과 사이렌', '뒤에서 점점 가까워지는 발소리', '갑자기 끊긴 통화의 신호음', '서류 더미를 넘기는 손의 떨림', '백색 소음 속에 섞인 누군가의 숨소리', '천천히 돌아가는 문손잡이', '발밑에서 삐걱이는 낡은 마룻바닥'],
  결말씨앗: ['끝난 듯하다 다시 솟구치는 마지막 한 방', '승리했지만 돌이킬 수 없는 희생이 남는다', '마지막 한 줄의 반전(스팅어)', '악이 이긴 채 막을 내린다', '진범이 잡혔지만 더 큰 배후가 암시된다', '주인공이 결국 괴물에 가까워진다', '거짓말이 끝내 들통나지 않고 봉인된다', '같은 일이 다른 곳에서 다시 시작된다', '구한 사람과 잃은 사람의 무게가 엇갈린다', '진실이 밝혀져도 아무것도 바뀌지 않는다', '맞바꾼 대가가 뒤늦게 드러난다', '살아남은 자만 아는 작은 이상 징후', '용의자였던 자의 결백이 너무 늦게 증명된다', '추적은 끝났으나 신뢰는 영영 회복되지 않는다', '진실을 묻기로 한 선택이 평생의 짐이 된다', '구원자로 기록됐지만 본인만 진실을 안다'],
} as const
type PoolKey = keyof typeof POOLS

const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

// ───────────────────────── 섹션 정의 + 설계 질문(도시에 근거) ─────────────────────────
interface SectionDef { key: keyof WorldFields; label: string; icon: string; ph: string; questions: string[] }
const SECTIONS: SectionDef[] = [
  {
    key: 'stage', label: '무대·압박 공간', icon: '🏢',
    ph: '폐쇄·고립·감시·탈출 불가 — 배경 자체가 압박 장치가 되는 공간과 그 규칙…',
    questions: [
      '주 무대는 어디이며, 왜 빠져나갈 수 없는가? (폐쇄·고립·감시 — 배경 자체가 압박 장치, 도시에 §7)',
      '안전해야 할 곳(집·결혼·이웃·기관)이 위협의 근원이 되는 위장된 일상성을 쓸 곳은?',
      '이 무대에서 작동하는 시간·동선·감시의 제약은 무엇인가? (CCTV·출항·공판 일정)',
      '평온한 "정상" 일상을 충분히 보여 줘 "잃을 것"을 만들었는가? (1막 25%)',
      '무대가 시퀀스마다 더 좁아지거나 위험해지는 에스컬레이션이 가능한가?',
    ],
  },
  {
    key: 'antagonist', label: '위협·적대자', icon: '😈',
    ph: '주인공과 대등하거나 한발 앞선 적 — "스릴러의 질은 빌런의 질에 비례한다"…',
    questions: [
      '적대자는 누구이며 주인공보다 똑똑하고 한발 앞서는가? (equal-or-greater, 도시에 §2)',
      '적의 동기는 무엇이고, 그가 옳다고 믿는 이유는? (단순 악역이 아니게)',
      '위협을 일찍 공개해 "막을 수 있나"로 끌 것인가, 정체를 숨겨 후스더닛으로 갈 것인가?',
      '적이 우위를 점하는 2막 후반(50~75%)에 주인공은 무엇을 잃는가?',
      '믿을 사람이 없다는 편집증 — 조력자가 배신자, 권위자가 흑막일 여지는?',
    ],
  },
  {
    key: 'stakes', label: '이해관계·상승', icon: '💥',
    ph: '명확하고 상승하는 stakes — 개인 위험에서 다수로 확장하거나 한 사람에 응축…',
    questions: [
      '실패하면 무엇을 잃는가? 이해관계가 구체적이고 되돌릴 수 없는가? (도시에 §2)',
      '개인→가까운 이→공동체→다수로 확장하는가, 아니면 "이 한 사람"으로 응축하는가?',
      '매 시퀀스 위험을 한 단씩 올리는 에스컬레이션 사다리가 있는가? (도시에 §4)',
      '주인공이 둘 다 가질 수 없는 가치 사이에서 선택해야 하는 지점은?',
      '왜 주인공만이(다른 누구도 아닌) 이 위협을 막아야 하는가?',
    ],
  },
  {
    key: 'clock', label: '티킹 클락', icon: '⏱️',
    ph: '명시 타이머·자연 마감(밤·약효)·사회적 마감(공판·출항) — 카운트다운…',
    questions: [
      '시간 압박(데드라인)은 무엇인가? 명시적(폭탄 타이머)인가 암묵적(밤·약효)인가? (도시에 §3)',
      '카운트다운의 0초와 클라이맥스가 겹치도록 설계했는가? (도시에 §5)',
      '사회적 마감(공판·투표·출항·집행)이 곧 시계가 되는가?',
      '시간이 줄어들수록 선택지가 좁아지며 압박이 조여 오는가?',
      '중간점·올 이즈 로스트 지점에서 시계가 갑자기 빨라지는 전환이 있는가?',
    ],
  },
  {
    key: 'irony', label: '정보 비대칭·서스펜스', icon: '🎭',
    ph: '독자 > / = / < 인물 — 장면 단위로 누가 무엇을 아는가를 의도적으로 전환…',
    questions: [
      '장면마다 "누가 무엇을 아는가"를 정했는가? 독자>인물(서스펜스)/=（동행)/<（반전) (도시에 §3)',
      '테이블 밑 폭탄처럼 독자만 아는 위협으로 기다림의 긴장을 길게 끄는 장면은?',
      '신뢰할 수 없는 화자(기억상실·거짓말·약물·선택적 서술)를 쓸 것인가?',
      '핵심 진실은 가능한 한 늦게, 복선은 충분히 일찍 — 슬로 리빌의 균형은?',
      '"거의 다 알 것 같은데 결정적 1조각이 없는" 상태를 어떻게 길게 유지할 것인가?',
    ],
  },
  {
    key: 'hero', label: '주인공의 취약점', icon: '🩹',
    ph: '유능하지만 취약 — 다치고, 속고, 실수해야 긴장이 산다. 무적은 금물…',
    questions: [
      '주인공은 유능하되 어디가 취약한가? (트라우마·중독·불신·부상·죄책감, 도시에 §2)',
      '주인공이 속고·다치고·실수하며 한계에 부딪히는 지점은?',
      '"아무도 안 믿어 준다"식 사회적 무력화가 작동하는가?',
      '주인공의 결함이 사건을 스스로 악화시키는가?',
      '클라이맥스에서 가장 불리한 상태(무장 해제·고립·부상·시간 부족)로 몰아넣었는가?',
    ],
  },
  {
    key: 'macguffin', label: '맥거핀·체호프의 총', icon: '🔑',
    ph: '모두가 쫓는 추동 물건/정보, 초반에 심어 클라이맥스에서 회수할 요소…',
    questions: [
      '모두가 쫓는 맥거핀(서류·코드·디스크·명단)은 무엇인가? (도시에 §3)',
      '맥거핀이 미끼일 가능성(진짜는 따로)을 열어 둘 것인가?',
      '초반에 무심히 보여 줄 체호프의 총(흉터·약·비밀번호·알레르기)은 무엇인가?',
      '그 요소가 클라이맥스에서 결정적으로 회수되도록 복선을 심었는가?',
      '같은 단서가 1회독엔 무해, 재독엔 결정적이 되도록 이중 기능을 부여했는가?',
    ],
  },
  {
    key: 'twist', label: '반전·레드 헤링', icon: '🔀',
    ph: '판도를 뒤집는 공정한 반전, 의심을 엉뚱한 곳으로 보내는 가짜 단서…',
    questions: [
      '판도를 뒤집는 반전은 무엇이며, 복선이 회수되어 "공정"한가? (도시에 §2·§3)',
      '의심을 엉뚱한 곳으로 유도하는 레드 헤링(가짜 단서·용의자)은 무엇인가?',
      '중간점(50%)의 큰 반전(가짜 승리/진짜 위협의 실체)은 무엇인가?',
      '"범인은 가장 가까운 사람"·친자/형제 반전 등 클리셰를 어떻게 변주할 것인가?',
      '잘못된 신뢰(조력자가 배신자·권위자가 흑막)를 어디에 배치할 것인가?',
    ],
  },
  {
    key: 'sensory', label: '감각·페이싱 톤', icon: '🌧️',
    ph: '단문·동사 중심·청각/촉각 강조, 짧은 챕터·장면 말미 훅(클리프행어)…',
    questions: [
      '이 작품의 핵심 감각은? (심박·식은땀·발소리·울리는 전화·백미러, 도시에 §6)',
      '짧은 챕터·장면 말미의 훅(클리프행어)을 어디서 끊을 것인가?',
      '고강도 폭로 뒤 짧은 호흡(숨 고르기) → 다시 가속하는 완급은?',
      '위협 임박 시 단문·현재형·감각(청각/촉각) 체감을 어떻게 살릴 것인가?',
      '콜드 오픈(시체 발견·미래 위기 후 "○○시간 전") 같은 오프닝을 쓸 것인가, 비틀 것인가?',
    ],
  },
  {
    key: 'climax', label: '클라이맥스·결말', icon: '🎬',
    ph: '주인공의 능동적 선택으로 직접 대면, 복선 회수, 시계 만료, 도덕적 대가…',
    questions: [
      '클라이맥스는 주인공의 능동적 선택으로 적과 직접 대면하는가? (우연·중간자 금지, 도시에 §5)',
      '앞서 심은 체호프의 총·진짜 정체가 이 지점에서 회수·재배열되는가?',
      '카운트다운의 0초와 대결이 겹치는가?',
      '거짓 결말 후 막판 부활(마지막 한 방)을 쓸 것인가?',
      '승리의 도덕적 대가(희생·상처)는 무엇이며, 다크/오픈 엔딩·스팅어를 둘 것인가?',
    ],
  },
] as const

interface WorldFields {
  stage: string; antagonist: string; stakes: string; clock: string; irony: string
  hero: string; macguffin: string; twist: string; sensory: string; climax: string
}
interface CustomItem { id: string; label: string; value: string }
interface World {
  id: string
  name: string          // 작품/세계 이름
  summary: string       // 한 줄 소개(로그라인)
  subgenre: string      // 하위 장르
  pov: string           // 정보 비대칭 기본 모드
  ending: string        // 결말 톤
  fields: WorldFields
  custom: CustomItem[]  // 사용자 정의 항목(라벨+값, 직접 입력)
  etc: string           // 고정 '기타' 자유 입력
  createdAt: number
  updatedAt: number
}

const emptyFields = (): WorldFields => ({
  stage: '', antagonist: '', stakes: '', clock: '', irony: '',
  hero: '', macguffin: '', twist: '', sensory: '', climax: '',
})

function makeWorld(name = ''): World {
  return {
    id: newId(), name, summary: '',
    subgenre: SUBGENRES[0].v, pov: POV_MODE[0].v, ending: ENDING_TONE[1],
    fields: emptyFields(), custom: [], etc: '', createdAt: Date.now(), updatedAt: Date.now(),
  }
}

function filledCount(w: World): number {
  return SECTIONS.reduce((n, s) => n + ((w.fields[s.key] || '').trim() ? 1 : 0), 0)
}

function load(): { worlds: World[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { worlds: [], activeId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.worlds) ? p.worlds : Array.isArray(p) ? p : []
    const worlds: World[] = arr.filter((x: any) => x && typeof x === 'object').map((x: any) => {
      const base = makeWorld()
      const fields = emptyFields()
      if (x.fields && typeof x.fields === 'object') {
        for (const s of SECTIONS) if (typeof x.fields[s.key] === 'string') fields[s.key] = x.fields[s.key]
      }
      const custom: CustomItem[] = Array.isArray(x.custom)
        ? x.custom
            .filter((c: any) => c && typeof c === 'object' && typeof c.label === 'string')
            .map((c: any) => ({ id: String(c.id || newId()), label: c.label, value: typeof c.value === 'string' ? c.value : '' }))
        : []
      return {
        ...base, ...x, id: String(x.id || newId()), fields, custom,
        name: typeof x.name === 'string' ? x.name : '',
        summary: typeof x.summary === 'string' ? x.summary : '',
        subgenre: typeof x.subgenre === 'string' ? x.subgenre : base.subgenre,
        pov: typeof x.pov === 'string' ? x.pov : base.pov,
        ending: typeof x.ending === 'string' ? x.ending : base.ending,
        etc: typeof x.etc === 'string' ? x.etc : '',
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      } as World
    })
    const ids = new Set(worlds.map((w) => w.id))
    const activeId = typeof p?.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (worlds[0]?.id ?? null)
    return { worlds, activeId }
  } catch { return { worlds: [], activeId: null } }
}

// ───────────────────────── 스릴러 어휘·클리셰 사전(도시에 §6, 카테고리/검색/무작위/복사) ─────────────────────────
const LEXICON: { cat: string; icon: string; items: string[] }[] = [
  { cat: '장르 용어', icon: '🧩', items: ['티킹 클락(ticking clock)', '레드 헤링(red herring)', '맥거핀(MacGuffin)', '클리프행어(cliffhanger)', '언리라이어블 내레이터', '트위스트(twist)', '리빌(reveal)', '콜드 오픈(cold open)', '미스디렉션(misdirection)', '캣앤마우스(cat-and-mouse)', '포인트 오브 노 리턴', '올 이즈 로스트(all is lost)', '스팅어(엔딩 한 방)', '드라마틱 아이러니', '체호프의 총', '슬로 리빌', '페이스(pace)·비트(beat)'] },
  { cat: '위협·긴장 어휘', icon: '😰', items: ['등줄기를 타고 흐르는 식은땀', '심박이 귓속에서 울린다', '목덜미가 곤두서다', '백미러 속의 헤드라이트', '울리지 않던 전화가 갑자기 울린다', '닫히는 엘리베이터 문', '깜빡이는 형광등', '잠긴 방 너머의 인기척', '제자리에서 옮겨진 물건', '점점 가까워지는 발소리', '갑자기 끊긴 통화', '백색 소음 속의 숨소리', '카운트다운하는 붉은 숫자', '뒤를 밟히는 듯한 시선'] },
  { cat: '인물·역할', icon: '🕵️', items: ['트라우마·이혼·알코올 형사', '천재 사이코패스 빌런', '신뢰할 수 없는 화자', '막판에 배신하는 파트너', '"한 건만 더" 베테랑', '죽기 직전 단서를 흘리는 정보원', '내부 고발자(휘슬블로어)', '이중 스파이(두더지)', '마지막 생존자', '누명 쓴 도망자', '냉철한 프로파일러', '부패한 고위 권력자', '믿었던 조력자(흑막)', '복수를 설계한 피해자'] },
  { cat: '플롯·구조', icon: '🧱', items: ['콜드 오픈으로 시작', '"○○시간 전"으로 회귀', '개입 사건(inciting incident)', '되돌아갈 수 없는 선', '중간점 대반전', '가짜 승리(false victory)', '올 이즈 로스트(75%)', '직접 대면(confrontation)', '거짓 결말 후 부활', '도덕적 대가', '에스컬레이션 사다리', '시퀀스마다 가치 전환(+/−)', '슬로 리빌 vs 정보 폭로', '이중 시점·시간선 분절'] },
  { cat: '하위 장르', icon: '📚', items: ['심리 스릴러', '도메스틱 스릴러', '액션·추적 스릴러', '리걸·법정 스릴러', '정치·스파이 스릴러', '법의학·수사 스릴러', '테크노 스릴러', '서바이벌 스릴러', '누아르·청부 스릴러', '코드·보물찾기 스릴러', '도주(누명) 스릴러', '연쇄살인 스릴러'] },
  { cat: '압박 공간', icon: '🏢', items: ['눈에 갇힌 외딴 산장', '외딴 섬', '정전된 빌딩', '멈춘 엘리베이터', '멈춘 열차·지하철', '비행기·잠수함', '폐쇄된 병원', '지하실·벙커', '교외 주택가', '안전가옥', '법정·로펌·구치소', '국경·공항·환승', '비 내리는 대도시', '뒷골목·항만·클럽'] },
  { cat: '장치·기법', icon: '🎯', items: ['정보 비대칭 설계', '테이블 밑 폭탄', '카운트-인/아웃 정보 공개', '레드 헤링 배치', '맥거핀 추격', '체호프의 총 회수', '추격(chase) 시퀀스', '은신(hide) 시퀀스', '함정(trap) 시퀀스', '잘못된 신뢰(false ally)', '단서의 이중 기능', '위장된 일상성', '신뢰할 수 없는 서술', '시간선 교차'] },
]

const CLICHES: { trope: string; twist: string }[] = [
  { trope: '누명 쓴 주인공이 진실을 캐며 도주한다', twist: '주인공은 정말 무고하지 않았고, 도주 자체가 진범의 설계였다' },
  { trope: '범인은 가장 가까운 사람(가족·배우자·파트너)이다', twist: '가장 가까운 사람을 의심하게 만든 것이야말로 진범의 미끼다' },
  { trope: '죽은 줄 알았던 인물이 막판에 살아 돌아온다', twist: '돌아온 인물은 살아남으려 주인공을 제물로 삼아 위장 죽음을 꾸몄다' },
  { trope: '빌런이 클라이맥스에서 장황한 자백(monologue)을 늘어놓는다', twist: '그 자백은 시간을 벌어 진짜 공범을 도주시키려는 연기였다' },
  { trope: '비밀번호·USB 한 방으로 모든 게 해결된다', twist: 'USB의 진짜 데이터는 미끼였고, 결정적 증거는 사람의 기억뿐이다' },
  { trope: '막판에 배신하는 파트너', twist: '배신한 줄 알았던 파트너가 실은 주인공을 살리려 적인 척한 것이다' },
  { trope: '죽기 직전 단서를 흘리는 정보원', twist: '흘린 단서는 의도된 거짓이며, 정보원은 사실 적의 끄나풀이었다' },
  { trope: '"한 건만 더 하고 은퇴" 하려는 베테랑', twist: '그 마지막 한 건이 처음부터 그를 제거하려 설계된 함정이었다' },
  { trope: '울리지 않던 전화가 결정적 순간에 울린다', twist: '전화를 건 상대는 도와줄 사람이 아니라, 위치를 추적하던 적이다' },
  { trope: '미녀 피해자가 무력하게 구조를 기다린다', twist: '구조를 기다리는 척했지만 그녀가 처음부터 사건의 설계자였다' },
  { trope: '신뢰할 수 없는 화자가 "다들 날 미쳤다고 한다"고 호소한다', twist: '화자의 말은 전부 사실이었고, 미쳤다고 몰아간 쪽이 공모자였다' },
  { trope: '카운트다운 폭탄을 마지막 1초에 해체한다', twist: '해체한 것은 가짜 폭탄이고, 진짜는 이미 다른 곳에서 터지고 있었다' },
  { trope: '경찰·검사 내부에 진범이 숨어 있다', twist: '내부 진범으로 지목된 자는 누명이고, 그를 고발한 청렴한 상관이 흑막이다' },
  { trope: '콜드 오픈으로 미래의 위기를 보여 주고 "○○시간 전"으로 돌아간다', twist: '그 미래 장면은 주인공의 착각·조작된 기억이라 결말이 완전히 뒤집힌다' },
]

// 슬롯 → 섹션 매핑(영감을 현재 작품 필드에 반영)
const SLOT_FIELD: Record<PoolKey, keyof WorldFields> = {
  무대: 'stage', 위협정체: 'antagonist', 이해관계: 'stakes', 티킹클락: 'clock', 정보비대칭: 'irony',
  주인공취약점: 'hero', 맥거핀: 'macguffin', 체호프의총: 'macguffin', 반전레드헤링: 'twist', 감각페이싱: 'sensory', 결말씨앗: 'climax',
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ThrillerWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState(() => load())
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [openGuide, setOpenGuide] = useState<keyof WorldFields | null>(null)
  const [note, setNote] = useState('')
  // 사전 패널
  const [showRef, setShowRef] = useState(false)
  const [refTab, setRefTab] = useState<'lex' | 'cliche'>('lex')
  const [refQuery, setRefQuery] = useState('')
  const [openCat, setOpenCat] = useState<string | null>(LEXICON[0]?.cat ?? null)
  const [randPick, setRandPick] = useState('')

  // 영감 슬롯
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
  const seeded = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) { clearTimeout(noteTimer.current); noteTimer.current = null }
    }
  }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침 시 사라질 수 있어요.') }
  }, [store])

  // payload 진입(연계) — 이름/장르 초안 1회 반영
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const nm = typeof payload.name === 'string' ? payload.name : (typeof payload.title === 'string' ? payload.title : '')
    if (nm) {
      const w = makeWorld(nm.trim())
      const g = typeof payload.genre === 'string' ? payload.genre : ''
      if (g) { const m = SUBGENRES.find((s) => s.v.includes(g) || g.includes(s.v.split(' ')[0])); if (m) w.subgenre = m.v }
      setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const { worlds, activeId } = store
  const active = worlds.find((w) => w.id === activeId) || null

  function flash(msg: string, ms = 3600) {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { if (mounted.current) setNote('') }, ms)
  }

  const setActive = (id: string | null) => { setConfirmDel(null); setOpenGuide(null); setStore((s) => ({ ...s, activeId: id })) }

  const onNew = () => {
    const w = makeWorld(`새 스릴러 세계 ${worlds.length + 1}`)
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setQuery(''); setConfirmDel(null); setOpenGuide(null)
  }

  const patch = (p: Partial<World>) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, ...p, updatedAt: Date.now() } : w)) }))
  }
  const patchField = (key: keyof WorldFields, value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, fields: { ...w.fields, [key]: value }, updatedAt: Date.now() } : w)) }))
  }

  // 사용자 정의 항목(이름 직접 입력, 무작위 생성 안 함) + 고정 '기타'
  const addCustomItem = () => {
    if (!active) { flash('먼저 작품을 선택하거나 만들어 주세요.'); return }
    const label = (window.prompt('추가할 항목의 이름을 입력하세요 (예: 도시 전설, 금기, 화폐, 특이 사항)') || '').trim()
    if (!label) return
    const item: CustomItem = { id: newId(), label, value: '' }
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: [...w.custom, item], updatedAt: Date.now() } : w)) }))
  }
  const patchCustom = (id: string, value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: w.custom.map((c) => (c.id === id ? { ...c, value } : c)), updatedAt: Date.now() } : w)) }))
  }
  const removeCustom = (id: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: w.custom.filter((c) => c.id !== id), updatedAt: Date.now() } : w)) }))
  }
  const patchEtc = (value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, etc: value, updatedAt: Date.now() } : w)) }))
  }

  const removeWorld = (id: string) => {
    setStore((s) => {
      const idx = s.worlds.findIndex((w) => w.id === id)
      const next = s.worlds.filter((w) => w.id !== id)
      let nextActive = s.activeId
      if (s.activeId === id) nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null
      return { worlds: next, activeId: nextActive }
    })
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setStore((s) => {
      const i = s.worlds.findIndex((w) => w.id === id)
      if (i < 0) return s
      const j = i + dir
      if (j < 0 || j >= s.worlds.length) return s
      const next = s.worlds.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...s, worlds: next }
    })
  }

  // 질문을 섹션 텍스트 끝에 "Q) … → " 형태로 추가
  const appendQuestion = (key: keyof WorldFields, q: string) => {
    if (!active) return
    const cur = active.fields[key] || ''
    const sep = cur.trim() ? (cur.endsWith('\n') ? '' : '\n') : ''
    patchField(key, cur + sep + `Q) ${q}\n→ `)
  }

  // 영감 재생성/잠금
  const roll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      ;(Object.keys(POOLS) as PoolKey[]).forEach((k) => { if (!locks[k]) next[k] = pick(POOLS[k]) })
      return next
    })
  }
  const toggleLock = (k: PoolKey) => setLocks((l) => ({ ...l, [k]: !l[k] }))

  // 영감 → 새 작품 초안 생성(빈 칸 채움)
  const applyInspiration = () => {
    const w = makeWorld(`새 스릴러 세계 ${worlds.length + 1}`)
    // 무작위(새 초안) 생성 시 사용자 정의 항목은 '값'을 비우되 '항목(이름)'은 유지, '기타'도 비움
    w.custom = (active?.custom || []).map((c) => ({ id: newId(), label: c.label, value: '' }))
    w.etc = ''
    w.summary = `${slots.무대}에서, ${slots.티킹클락} ${J(slots.주인공취약점, 'iga')} ${J(slots.위협정체, 'eulreul')} 막아야 한다 — ${J(slots.이해관계, 'iga')} 걸려 있다`
    w.fields.stage = `무대·압박 공간: ${slots.무대}.`
    w.fields.antagonist = `위협·적대자: ${slots.위협정체}.`
    w.fields.stakes = `이해관계(걸린 것): ${slots.이해관계}.`
    w.fields.clock = `티킹 클락: ${slots.티킹클락}.`
    w.fields.irony = `정보 비대칭: ${slots.정보비대칭}.`
    w.fields.hero = `주인공의 취약점: ${slots.주인공취약점}.`
    w.fields.macguffin = `맥거핀: ${slots.맥거핀}.\n체호프의 총: ${slots.체호프의총}.`
    w.fields.twist = `반전·레드 헤링: ${slots.반전레드헤링}.`
    w.fields.sensory = `감각·페이싱: ${slots.감각페이싱}.`
    w.fields.climax = `결말 씨앗: ${slots.결말씨앗}.`
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setOpenGuide(null)
    flash('영감 슬롯으로 새 스릴러 세계 초안을 만들었어요. 설계 질문에 답하며 채워 보세요.')
  }

  // 단일 슬롯 → 현재 작품 필드에 덧붙이기
  const appendSlotToActive = (k: PoolKey) => {
    if (!active) { flash('먼저 작품을 선택하거나 만들어 주세요.'); return }
    const field = SLOT_FIELD[k]
    const cur = active.fields[field] || ''
    const val = cur.trim() ? `${cur}\n${k}: ${slots[k]}` : `${k}: ${slots[k]}`
    patchField(field, val)
    flash(`‘${k}: ${slots[k]}’ 를 현재 작품에 반영했어요.`)
  }

  // ── 내보내기/연계 ──
  function buildText(w: World): string {
    const L: string[] = []
    L.push(`# ${w.name || '이름 없는 스릴러 세계'}`)
    if (w.summary.trim()) L.push(w.summary.trim())
    L.push('', `· 하위 장르: ${w.subgenre}`, `· 정보 비대칭: ${w.pov}`, `· 결말 톤: ${w.ending}`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
    }
    for (const c of w.custom) {
      const v = (c.value || '').trim()
      if (c.label.trim() && v) { L.push('', `## ${c.label.trim()}`, v) }
    }
    if ((w.etc || '').trim()) { L.push('', `## 기타`, w.etc.trim()) }
    return L.join('\n')
  }
  function buildHtml(w: World): string {
    const p: string[] = []
    if (w.summary.trim()) p.push(`<p><i>${esc(w.summary.trim())}</i></p>`)
    p.push(`<p><b>하위 장르</b>: ${esc(w.subgenre)}<br><b>정보 비대칭</b>: ${esc(w.pov)}<br><b>결말 톤</b>: ${esc(w.ending)}</p>`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(s.icon + ' ' + s.label)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    for (const c of w.custom) {
      const v = (c.value || '').trim()
      if (!c.label.trim() || !v) continue
      p.push(`<p><b>${esc(c.label.trim())}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    if ((w.etc || '').trim()) p.push(`<p><b>${esc('기타')}</b><br>${esc(w.etc.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    if (p.length <= 1) p.push('<p><span style="color:#888">(내용 없음)</span></p>')
    return p.join('')
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) flash(label) }
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
    } catch { if (mounted.current) flash('복사 실패') }
  }

  // 연동 페이로드 표준화 — 받는 허브(배경 설정집)의 정규(장소) 키에 1:1 매핑한 fields(문자열만, 빈 값 생략)
  function placeFields(w: World): Record<string, string> {
    const f = w.fields
    const t = (s: string) => (s || '').trim()
    const join = (...xs: string[]) => xs.map((x) => t(x)).filter(Boolean).join('\n')
    const out: Record<string, string> = {}
    const put = (k: string, v: string) => { const s = t(v); if (s) out[k] = s }
    put('name', w.name || '이름 없는 스릴러 세계')
    put('kind', w.subgenre)                                   // 종류/유형 → kind
    put('atmosphere', w.summary || w.subgenre)                // 분위기 → atmosphere
    put('appearance', f.stage)                                // 무대·압박 공간(외형적 서술) → appearance
    put('sensory', f.sensory)                                 // 감각·페이싱 → sensory
    put('rules', join('티킹 클락·정보 비대칭', f.clock, f.irony))   // 공간을 지배하는 규칙·제약 → rules
    put('dangers', join(f.antagonist, f.stakes, f.hero))      // 위협·적대자·이해관계·취약점 → dangers
    put('secrets', join(f.twist, f.macguffin))                // 반전·맥거핀(숨은 요소) → secrets
    put('history', join(f.climax))                            // 클라이맥스·결말의 전개 → history
    put('notes', `정보 비대칭: ${w.pov}\n결말 톤: ${w.ending}`)   // 분류 외 메타 → notes
    // 사용자 정의 항목(라벨 그대로 키, 값 있을 때만) + 기타(키 'etc', 값 있을 때만)
    for (const c of w.custom) { const k = (c.label || '').trim(); if (k) put(k, c.value || '') }
    put('etc', w.etc || '')
    return out
  }

  // 프로젝트 자료(세계관)에 setting 카드로 추가
  const toProject = (w: World) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const title = (w.name || '이름 없는 스릴러 세계').trim()
    const character: Record<string, string> = {
      name: title, 하위장르: w.subgenre, 정보비대칭: w.pov, 결말톤: w.ending,
      ...placeFields(w),  // 정규(장소) 키 추가 — 받는 허브 기본 칸 정렬(기존 라벨 키는 유지)
    }
    for (const s of SECTIONS) { const v = (w.fields[s.key] || '').trim(); if (v) character[s.label] = v }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관', title, icon: '🕵️',
      synopsis: w.summary.trim() || `${w.subgenre} · ${w.pov}`,
      bodyHtml: buildHtml(w), character,
      meta: { 유형: '스릴러 세계관', 하위장르: w.subgenre, 정보비대칭: w.pov, '채운 항목': `${filledCount(w)}/${SECTIONS.length}` },
    })
    flash(id ? `‘${title}’${josaEulReul(title)} 프로젝트 ‘자료 › 세계관’에 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 공유 라이브러리(장소)로 추가 — 배경 설정집 등과 연계
  const toLibrary = (w: World) => {
    const title = (w.name || '이름 없는 스릴러 세계').trim()
    addToLibrary('places', {
      name: title, kind: '스릴러 무대·세계관', mood: w.summary.trim() || w.subgenre,
      history: (w.fields.stage || '').trim() || undefined,
      rules: [`티킹 클락·정보 비대칭`, (w.fields.clock || '').trim(), (w.fields.irony || '').trim()].filter(Boolean).join('\n') || undefined,
      sensory: (w.fields.sensory || '').trim() || undefined,
      notes: buildText(w), fields: placeFields(w), source: '스릴러 세계관 빌더',
    })
    flash(`‘${title}’${josaEulReul(title)} 공유 라이브러리(장소)에 저장했어요. 배경 설정집 등에서 불러올 수 있어요.`)
  }

  // 글감 스니펫으로 — 로그라인/요약을 영감 메모로
  const toSnippet = (w: World) => {
    const text = w.summary.trim() || buildText(w)
    addToLibrary('snippets', { text, source: '스릴러 세계관 빌더', tags: ['스릴러', '서스펜스', '세계관', w.subgenre.split(' ')[0]] })
    flash('한 줄 소개를 글감 스니펫으로 저장했어요.')
  }

  // 사전 항목 클릭 복사 + 무작위
  const copyItem = (s: string) => copyText(s, `‘${s}’ 복사됨`)
  const randomLexicon = () => {
    const all: string[] = []
    if (refTab === 'lex') LEXICON.forEach((g) => g.items.forEach((it) => all.push(it)))
    else CLICHES.forEach((c) => { all.push(c.trope); all.push(c.twist) })
    if (!all.length) return
    const r = pick(all)
    setRandPick(r)
    copyText(r, `무작위: ‘${r}’ 복사됨`)
  }

  const filtered = worlds.filter((w) => {
    const q = norm(query)
    if (!q) return true
    if (norm(w.name).includes(q) || norm(w.summary).includes(q) || norm(w.subgenre).includes(q)) return true
    return SECTIONS.some((s) => norm(w.fields[s.key] || '').includes(q))
  })

  const linked = hasProjectBridge()

  // 사전 검색 필터
  const lexFiltered = LEXICON.map((g) => ({
    ...g, items: refQuery.trim() ? g.items.filter((it) => norm(it).includes(norm(refQuery))) : g.items,
  })).filter((g) => g.items.length > 0)
  const clicheFiltered = refQuery.trim()
    ? CLICHES.filter((c) => norm(c.trope).includes(norm(refQuery)) || norm(c.twist).includes(norm(refQuery)))
    : CLICHES

  // ───────────────────────── 스타일 ─────────────────────────
  const C: Record<string, React.CSSProperties> = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, background: 'var(--paper)', fontSize: 14 },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' },
    title: { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 },
    spacer: { flex: 1 },
    note: { fontSize: 12, color: 'var(--accent)', padding: '6px 14px', flexShrink: 0, lineHeight: 1.5, borderBottom: '1px solid var(--border)' },
    main: { flex: 1, minHeight: 0, display: 'flex' },
    side: { width: 224, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' },
    sideHead: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 },
    search: { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' },
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 },
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    textarea: { width: '100%', minHeight: 74, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.6, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
    panel: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
    secTitle: { fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 },
    editBar: { display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' },
    slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 },
    tinyBtn: { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '3px 7px', borderRadius: 6 },
    chip: { textAlign: 'left', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.4, padding: '5px 9px', borderRadius: 999 },
  }

  const slotCardStyle = (locked: boolean): React.CSSProperties => ({
    border: '1px solid ' + (locked ? 'var(--accent)' : 'var(--border)'),
    borderRadius: 9, padding: '8px 10px', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer',
  })

  const POOL_KEYS = Object.keys(POOLS) as PoolKey[]

  return (
    <div style={C.wrap}>
      <div style={C.topbar}>
        <div style={C.title}><span aria-hidden><Emoji e="🕵️" /></span> 스릴러 세계관 빌더</div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>스릴러·서스펜스</span>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{worlds.length}개 작품</span>
        <button className="minibtn" onClick={() => setShowRef((v) => !v)} title="스릴러 어휘·클리셰 사전 열기">{showRef ? <><Emoji e="📖" /> 사전 닫기</> : <><Emoji e="📖" /> 사전</>}</button>
        <button className="minibtn" onClick={() => openToolLinked('cliffhanger-forge', { genre: '스릴러·서스펜스' })} title="클리프행어 단조기 열기"><Emoji e="🪝" /> 클리프행어</button>
        <button className="btn-primary" onClick={onNew}>+ 새 작품</button>
      </div>

      {note && <div style={C.note}>{note}</div>}

      <div style={C.main}>
        {/* 좌측: 작품 목록 */}
        <div style={C.side}>
          <div style={C.sideHead}>
            <button className="btn-primary" onClick={onNew} style={{ width: '100%' }}>+ 새 작품</button>
            <input style={C.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·내용 검색" aria-label="작품 검색" />
          </div>
          {worlds.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: 14, textAlign: 'center' }}>
              아직 작품이 없어요.<br /><b>+ 새 작품</b> 또는 아래<br />영감 생성기로 시작하세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>‘{query}’에 맞는 작품이 없어요.</div>
          ) : (
            <div style={C.list}>
              {filtered.map((w) => {
                const realIdx = worlds.findIndex((x) => x.id === w.id)
                const isActive = w.id === activeId
                const cnt = filledCount(w)
                return (
                  <div
                    key={w.id}
                    onClick={() => setActive(w.id)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(w.id) } }}
                    style={{
                      border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                      background: isActive ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: w.name ? 'var(--text)' : 'var(--muted)' }}>
                      <Emoji e="🕵️" /> {w.name || '(이름 없는 스릴러 세계)'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.summary.trim() || w.subgenre}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: cnt === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>항목 {cnt}/{SECTIONS.length}</span>
                      <span style={{ flex: 1 }} />
                      <button style={C.tinyBtn} title="위로" disabled={!!query.trim() || realIdx <= 0} onClick={(e) => { e.stopPropagation(); move(w.id, -1) }}>↑</button>
                      <button style={C.tinyBtn} title="아래로" disabled={!!query.trim() || realIdx >= worlds.length - 1} onClick={(e) => { e.stopPropagation(); move(w.id, 1) }}>↓</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!!query.trim() && filtered.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색 중에는 순서 이동이 잠깁니다.</div>
          )}
        </div>

        {/* 우측: 사전 패널 또는 편집/안내 */}
        <div style={C.content}>
          {showRef ? (
            <div style={C.body}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={C.secTitle}><span aria-hidden><Emoji e="📖" /></span> 스릴러 어휘·클리셰 사전</div>
                <div style={C.spacer} />
                <button className={'minibtn' + (refTab === 'lex' ? ' active' : '')} onClick={() => setRefTab('lex')} style={{ borderColor: refTab === 'lex' ? 'var(--accent)' : 'var(--border)' }}>어휘·장치</button>
                <button className={'minibtn' + (refTab === 'cliche' ? ' active' : '')} onClick={() => setRefTab('cliche')} style={{ borderColor: refTab === 'cliche' ? 'var(--accent)' : 'var(--border)' }}>클리셰·변주</button>
                <button className="minibtn" onClick={randomLexicon} title="무작위 항목 뽑아 복사"><Emoji e="🎲" /> 무작위</button>
              </div>
              <input style={C.search} value={refQuery} onChange={(e) => setRefQuery(e.target.value)} placeholder={refTab === 'lex' ? '🔍 어휘·장치 검색' : '🔍 클리셰·변주 검색'} />
              {randPick && <div style={{ fontSize: 12, color: 'var(--muted)' }}>최근 무작위: <span style={{ color: 'var(--text)' }}>{randPick}</span></div>}

              {refTab === 'lex' ? (
                lexFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12 }}>‘{refQuery}’에 맞는 항목이 없어요.</div>
                ) : (
                  lexFiltered.map((g) => {
                    const open = refQuery.trim() ? true : openCat === g.cat
                    return (
                      <div key={g.cat} style={C.panel}>
                        <div
                          style={{ ...C.secTitle, cursor: 'pointer', justifyContent: 'space-between' }}
                          onClick={() => setOpenCat(openCat === g.cat ? null : g.cat)}
                        >
                          <span><span aria-hidden><Emoji e={g.icon} /></span> {g.cat} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>({g.items.length})</span></span>
                          <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                        </div>
                        {open && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {g.items.map((it) => (
                              <button key={it} style={C.chip} onClick={() => copyItem(it)} title="클릭하면 복사돼요">{emojify(it)}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )
              ) : (
                clicheFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12 }}>‘{refQuery}’에 맞는 클리셰가 없어요.</div>
                ) : (
                  clicheFiltered.map((c, i) => (
                    <div key={i} style={C.panel}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--warn)', fontWeight: 700 }}>흔한 클리셰</span>
                        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{emojify(c.trope)}</span>
                        <button style={C.tinyBtn} onClick={() => copyItem(c.trope)} title="복사">복사</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--ok)', fontWeight: 700 }}>변주 아이디어</span>
                        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{emojify(c.twist)}</span>
                        <button style={C.tinyBtn} onClick={() => copyItem(c.twist)} title="복사">복사</button>
                      </div>
                    </div>
                  ))
                )
              )}
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                클리셰는 그대로 쓰기보다 변주(전복)해 신선함을 더하세요. 항목을 클릭하면 클립보드에 복사됩니다.
              </div>
            </div>
          ) : !active ? (
            <div style={C.empty}>
              <div style={{ fontSize: 38 }}><Emoji e="🕵️" /></div>
              <div>왼쪽에서 작품을 고르거나 <b>+ 새 작품</b>으로 시작하세요.</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                무대·적대자·이해관계·티킹 클락·정보 비대칭·맥거핀·반전·클라이맥스까지<br />
                스릴러 한 편의 세계를 도시에에 근거한 설계 질문으로 구조화합니다.
              </div>
              <button className="btn-primary" onClick={onNew}>+ 첫 작품 만들기</button>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>아래 영감 생성기로도 시작할 수 있어요(조합 {fmtBig(COMBO_COUNT)}가지).</div>
              {/* 비어 있어도 영감 생성기는 쓸 수 있게 노출 */}
              <InspirationPanel
                C={C} slots={slots} locks={locks} POOL_KEYS={POOL_KEYS}
                roll={roll} toggleLock={toggleLock} applyInspiration={applyInspiration}
                appendSlotToActive={appendSlotToActive} hasActive={false} slotCardStyle={slotCardStyle}
              />
            </div>
          ) : (
            <>
              <div style={C.body}>
                {/* 기본 정보 */}
                <div style={C.panel}>
                  <div>
                    <label style={C.label}>작품·세계 이름</label>
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 자정의 증인" maxLength={80} />
                  </div>
                  <div>
                    <label style={C.label}>한 줄 소개(로그라인)</label>
                    <input style={C.input} value={active.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="예: 72시간 안에 누명을 벗지 못하면 무고한 사형수가 집행된다" maxLength={200} />
                  </div>
                  <div style={C.row2}>
                    <div>
                      <label style={C.label}>하위 장르</label>
                      <select style={C.select} value={active.subgenre} onChange={(e) => patch({ subgenre: e.target.value })}>
                        {SUBGENRES.map((s) => <option key={s.v} value={s.v}>{s.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{SUBGENRES.find((s) => s.v === active.subgenre)?.d}</div>
                    </div>
                    <div>
                      <label style={C.label}>정보 비대칭(기본 모드)</label>
                      <select style={C.select} value={active.pov} onChange={(e) => patch({ pov: e.target.value })}>
                        {POV_MODE.map((s) => <option key={s.v} value={s.v}>{s.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{POV_MODE.find((s) => s.v === active.pov)?.d}</div>
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>결말 톤</label>
                    <select style={C.select} value={active.ending} onChange={(e) => patch({ ending: e.target.value })}>
                      {ENDING_TONE.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* 섹션별 설계 */}
                {SECTIONS.map((s) => {
                  const val = active.fields[s.key] || ''
                  const guideOpen = openGuide === s.key
                  return (
                    <div key={s.key} style={C.panel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={C.secTitle}><span aria-hidden><Emoji e={s.icon} /></span> {s.label}</div>
                        <span style={{ fontSize: 11, color: val.trim() ? 'var(--ok)' : 'var(--muted)' }}>{val.trim() ? '작성됨' : '비어 있음'}</span>
                        <div style={C.spacer} />
                        <button style={C.tinyBtn} onClick={() => setOpenGuide(guideOpen ? null : s.key)} title="설계 질문 펼치기">{guideOpen ? '질문 닫기 ▾' : '설계 질문 ▸'}</button>
                      </div>
                      {guideOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '4px 2px' }}>
                          {s.questions.map((q, qi) => (
                            <div key={qi} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>· {q}</span>
                              <button style={C.tinyBtn} onClick={() => appendQuestion(s.key, q)} title="이 질문을 입력칸에 붙여넣기">＋</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <textarea style={C.textarea} value={val} onChange={(e) => patchField(s.key, e.target.value)} placeholder={s.ph} />
                    </div>
                  )
                })}

                {/* 사용자 정의 항목 + 고정 '기타' */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={C.secTitle}><span aria-hidden><Emoji e="🧷" /></span> 사용자 정의 항목</div>
                    <div style={C.spacer} />
                    <button className="minibtn" onClick={addCustomItem} title="이름을 정해 직접 채울 항목을 추가합니다(무작위 생성 안 함)">＋ 항목 추가</button>
                  </div>
                  {active.custom.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      필요한 항목이 더 있나요? <b>＋ 항목 추가</b>로 이름을 정해 직접 채우세요. (새 초안을 만들면 값은 비워지고 항목 이름은 유지됩니다.)
                    </div>
                  ) : (
                    active.custom.map((c) => (
                      <div key={c.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <label style={{ ...C.label, marginBottom: 0, flex: 1 }}>{emojify(c.label)}</label>
                          <button style={C.tinyBtn} onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
                        </div>
                        <textarea
                          style={C.textarea}
                          value={c.value}
                          onChange={(e) => patchCustom(c.id, e.target.value)}
                          placeholder={`‘${c.label}’ 내용을 직접 적어 주세요…`}
                        />
                      </div>
                    ))
                  )}
                  <div>
                    <label style={C.label}>기타</label>
                    <textarea
                      style={{ ...C.textarea, minHeight: 96 }}
                      value={active.etc}
                      onChange={(e) => patchEtc(e.target.value)}
                      placeholder="어느 항목에도 들어맞지 않는 메모·아이디어·자료를 자유롭게 적어 두세요…"
                    />
                  </div>
                </div>

                {/* 영감 생성기 */}
                <InspirationPanel
                  C={C} slots={slots} locks={locks} POOL_KEYS={POOL_KEYS}
                  roll={roll} toggleLock={toggleLock} applyInspiration={applyInspiration}
                  appendSlotToActive={appendSlotToActive} hasActive={true} slotCardStyle={slotCardStyle}
                />

                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>마지막 수정: {fmtDate(active.updatedAt)}</div>
              </div>

              {/* 하단 액션 바: 내보내기/연계 */}
              <div style={C.editBar}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>항목 {filledCount(active)}/{SECTIONS.length}</span>
                <div style={C.spacer} />
                <button className="minibtn" onClick={() => copyText(buildText(active), '작품 설정을 텍스트로 복사했어요')} title="이 작품 전체를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={() => toSnippet(active)} title="한 줄 소개를 글감 스니펫으로 저장"><Emoji e="✂️" /> 글감으로</button>
                <button className="minibtn" onClick={() => toLibrary(active)} title="공유 라이브러리(장소)에 저장 — 배경 설정집과 연계"><Emoji e="🔗" /> 라이브러리</button>
                <button
                  className="linkbtn"
                  onClick={() => toProject(active)}
                  disabled={!linked}
                  title={linked ? '프로젝트 자료 › 세계관 폴더에 설정 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
                ><Emoji e="📄" /> 프로젝트에 추가</button>
              </div>

              {/* 함께 쓰면 좋은 도구(연계) */}
              <div style={{ ...C.editBar, borderTop: 'none', paddingTop: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
                <button className="linkbtn" onClick={() => openToolLinked('setting-bible', active ? { query: active.name } : undefined)} title="배경 설정집 열기"><Emoji e="🗺️" /> 배경 설정집</button>
                <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '스릴러·서스펜스' })} title="플롯 반전 덱 열기"><Emoji e="🔀" /> 반전 덱</button>
                <button className="linkbtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 설계기 열기"><Emoji e="⚔️" /> 갈등 설계기</button>
                <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '스릴러·서스펜스' })} title="캐릭터 생성기 열기"><Emoji e="🧬" /> 캐릭터 생성기</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── 영감 생성기 패널(슬롯 무작위·잠금·재생성·조합수) ─────────────────────────
function InspirationPanel(props: {
  C: Record<string, React.CSSProperties>
  slots: Record<PoolKey, string>
  locks: Record<PoolKey, boolean>
  POOL_KEYS: PoolKey[]
  roll: () => void
  toggleLock: (k: PoolKey) => void
  applyInspiration: () => void
  appendSlotToActive: (k: PoolKey) => void
  hasActive: boolean
  slotCardStyle: (locked: boolean) => React.CSSProperties
}) {
  const { C, slots, locks, POOL_KEYS, roll, toggleLock, applyInspiration, appendSlotToActive, hasActive, slotCardStyle } = props
  const lockedCount = POOL_KEYS.filter((k) => locks[k]).length
  return (
    <div style={{ ...C.panel, border: '1px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={C.secTitle}><span aria-hidden><Emoji e="🎲" /></span> 스릴러 영감 생성기</div>
        <div style={C.spacer} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합 {fmtBig(COMBO_COUNT)}가지{lockedCount ? <> · <Emoji e="🔒" />{lockedCount}</> : ''}</span>
        <button className="minibtn" onClick={roll} title="잠그지 않은 슬롯만 다시 굴리기"><Emoji e="🎲" /> 재생성</button>
        <button className="btn-primary" onClick={applyInspiration} title="현재 슬롯으로 새 작품 초안 만들기"><Emoji e="✨" /> 새 초안</button>
      </div>
      <div style={C.slotGrid}>
        {POOL_KEYS.map((k) => {
          const locked = locks[k]
          return (
            <div
              key={k}
              style={slotCardStyle(locked)}
              onClick={() => toggleLock(k)}
              title={locked ? '잠금됨 — 클릭하면 해제(재생성 시 바뀜)' : '클릭하면 잠금(재생성 시 고정)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', flex: 1 }}>{k}</span>
                <span style={{ fontSize: 11 }}>{locked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</span>
              </div>
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>{slots[k]}</span>
              <button
                style={{ ...C.tinyBtn, marginTop: 2, alignSelf: 'flex-start' }}
                onClick={(e) => { e.stopPropagation(); appendSlotToActive(k) }}
                disabled={!hasActive}
                title={hasActive ? '이 항목을 현재 작품의 해당 섹션에 반영' : '먼저 작품을 만들어 주세요'}
              >＋ 반영</button>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        슬롯을 클릭해 잠그고(<Emoji e="🔒" />) <b><Emoji e="🎲" /> 재생성</b>으로 나머지만 굴리세요. <b><Emoji e="✨" /> 새 초안</b>은 현재 슬롯으로 새 작품을 만들고, <b>＋ 반영</b>은 선택 작품의 해당 섹션에 덧붙입니다.
      </div>
    </div>
  )
}
