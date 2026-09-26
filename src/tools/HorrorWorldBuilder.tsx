// 호러 세계관 빌더 (호러·공포 / 세계관) — 도시에(dossier)에 근거해 공포 한 편의 세계/설정을 항목별로 구조화하는 설정 빌더.
//  좌측: 작품 목록(선택·검색·추가·삭제·순서이동). 우측: 선택 작품 편집.
//  설계 축(도시에 §2 관습 · §3 서사 장치 · §4 5단 구조 · §7 공간): 무대·위협의 정체·작동 규칙·기원/저주·드레드 장치·취약한 인물·고립 장치·전염/카운트다운·감각 분위기·금기/규칙위반·결말 방향.
//  각 섹션마다 도시에에 뿌리내린 "설계 질문"을 두어 빈칸을 메우게 하고, 슬롯 풀 무작위 영감(잠금/재생성, 조합수 표시 — 1조 이상)도 제공한다.
//  사전류(공포 어휘·클리셰): 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  모든 데이터는 localStorage('sry:tool:horror-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
//  연계: addToProject(kind:setting, root:research, folder:'세계관') · hasProjectBridge · addToLibrary('places'|'snippets') · openToolLinked. payload.genre/name 활용.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'horror-worldbuilder',
  name: '호러 세계관 빌더',
  icon: '🩸',
  group: '세계관',
  genre: '호러·공포',
  intro: '무대·위협의 정체·작동 규칙·저주의 기원·드레드 장치·고립·전염·결말까지 공포 한 편의 세계를 설계하는 빌더',
  w: 800,
  h: 670,
}

const LS_KEY = 'sry:tool:horror-worldbuilder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 한국어 조사 자동 선택 — 마지막 글자의 받침 유무를 보고 하나만 출력(괄호 이중표기 금지).
// 'ㄹ' 받침 예외(으로/로)까지 처리.
function hasJong(word: string): { jong: boolean; rieul: boolean } {
  const s = (word || '').trim()
  if (!s) return { jong: false, rieul: false }
  const ch = s.charCodeAt(s.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return { jong: false, rieul: false } // 한글 음절이 아니면 받침 없음으로 처리
  const idx = (ch - 0xac00) % 28
  return { jong: idx !== 0, rieul: idx === 8 }
}
// 받침 있으면 withJong, 없으면 noJong 을 단어 뒤에 붙여 돌려준다.
function withJosa(word: string, withJong: string, noJong: string): string {
  return (word || '') + (hasJong(word).jong ? withJong : noJong)
}
// 으로/로: 받침 없음 또는 'ㄹ' 받침이면 '로', 그 외 받침이면 '으로'.
function josaRo(word: string): string {
  const { jong, rieul } = hasJong(word)
  return (word || '') + (jong && !rieul ? '으로' : '로')
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

// ───────────────────────── 선택형 축(도시에 §1 하위장르 지도 · §2 카타르시스 · §3 시점) ─────────────────────────
const SUBGENRES = [
  { v: '유령·고딕 (haunted house)', d: '과거의 비극을 품은 저택·집·호텔. 원혼·심리적 유령. 힐 하우스·샤이닝 계보.' },
  { v: '악마·오컬트 (엑소시즘·사이비)', d: '빙의·흑마술·이교 의식·금단의 지식. 엑소시스트 계보.' },
  { v: '슬래셔 (가면 살인마)', d: '연쇄 살인마와 마지막 생존자(final girl). 인과응보·생존의 도덕 구조.' },
  { v: '바디 호러 (감염·기생·변형)', d: '내 몸이 배신하는 공포. 신체변형·감염·빙의. 크로넨버그·이토 준지 계보.' },
  { v: '크리처·몬스터', d: '미지의 괴물·짐승. 보이지 않는 것의 공포(off-screen)를 길게 끈다.' },
  { v: '포크 호러 (고립된 시골 공동체)', d: '외부인을 적대하는 폐쇄 마을·이교 의식·인신공양. 위커맨·미드소마.' },
  { v: '우주적 공포 (코스믹 호러)', d: '인간의 이해를 넘어선 존재 앞의 무력함. 금지된 지식의 처벌. 러브크래프트.' },
  { v: '사이코로지컬 (내면 붕괴)', d: '광기·신뢰할 수 없는 화자·편집증. "초자연인가 정신병인가"의 모호함.' },
  { v: '서바이벌·아포칼립스 (좀비·감염)', d: '감염·종말·생존. 고립과 인간성 붕괴. 나는 전설이다 계보.' },
  { v: '현대 도시괴담 (J·K-호러)', d: '기술 매체를 통한 저주 전파(링)·축축한 원혼(주온)·웹소설 도시괴담.' },
] as const

// 위협의 본성 — 초자연/심리의 모호함을 어디에 둘지(도시에 §3 불확실성 유지)
const THREAT_NATURE = [
  { v: '명백한 초자연 (실재하는 괴물)', d: '귀신·악마·괴물이 실재. 규칙과 약점이 분명한 정공법.' },
  { v: '모호함 (초자연인가 정신병인가)', d: '끝까지 진위를 흐림. 신뢰할 수 없는 화자와 결합해 인식을 흔든다.' },
  { v: '인간의 광기 (전적으로 심리)', d: '괴물은 없다. 내면의 붕괴·편집증·죄책감이 곧 공포.' },
  { v: '우주적 미지 (이해 불가)', d: '정체·규칙조차 인간이 알 수 없는 존재. 안다는 것 자체가 파멸.' },
  { v: '사회·집단의 악 (사람이 더 무섭다)', d: '사이비·폐쇄 공동체·군중. "친절함이 더 무서운" 인간의 악.' },
] as const

// 카타르시스 — 결말 톤(도시에 §2 · §5)
const CATHARSIS = [
  '괴물 퇴치의 후련함 (규칙 활용으로 승리)',
  '대가 있는 생존 (이겼지만 트라우마·상실)',
  '열린 결말 (저주가 옮겨감·끝나지 않았다)',
  '비카타르시스 (패배·절멸·찝찝함)',
  '반전 폭로 (화자가 죽어 있었다·구원자가 적)',
] as const

// ───────────────────────── 무작위 영감 슬롯 풀(도시에 §3·§6·§7 근거 자작 — 공포 특화) ─────────────────────────
// 조합수 = 모든 풀 길이의 곱 → 1조 이상을 지향(핵심 생성기).
const POOLS = {
  무대: ['눈에 갇힌 외딴 산장', '과거 살인이 있었던 낡은 저택', '폐업한 정신병원 별관', '안개에 잠긴 등대지기의 섬', '폐쇄된 지하 벙커', '바다 한가운데 멈춘 유람선', '외부인을 꺼리는 산골 폐촌', '재개발 직전의 텅 빈 아파트 단지', '통신이 끊긴 극지 연구기지', '수십 년째 손님이 끊긴 산정 호텔', '물에 잠겨 가는 수몰 예정 마을', '한밤중의 폐교 본관', '터널 공사가 멈춘 깊은 갱도', '귀가 없는 새벽의 지하철 종착역', '버려진 놀이공원의 거울의 방', '강 안개가 걷히지 않는 나루터 여관', '한 가구만 남은 산속 기도원', '대대로 우물을 봉인해 온 종갓집'],
  위협정체: ['목매단 채 발견됐던 전 주인의 원혼', '아이의 모습으로 나타나는 무언가', '거울 속에서만 다르게 움직이는 또 다른 나', '봉인된 우물에서 기어 나오는 형체', '비디오를 본 자에게 옮겨붙는 저주', '마을이 대대로 섬겨 온 형체 없는 옛 신', '피부 밑에서 자라나는 기생체', '얼굴을 베껴 가는 모방 존재', '잠들면 데려가는 꿈속의 손님', '인형에 깃들어 가족을 흉내 내는 것', '사진에 찍힌 자를 차례로 데려가는 그림자', '벽 너머에서 똑같이 따라 우는 소리', '한 번 이름을 부르면 따라오는 존재', '죽은 자의 기억을 먹고 자라는 안개', '심연에서 인간을 관찰하는 거대한 무엇', '감염되면 표정을 잃고 똑같아지는 역병', '가면을 쓴 채 한 명씩 노리는 살인마', '몸을 갈아입으며 곁에 숨은 빙의령'],
  작동규칙: ['밤 12시부터 새벽 3시 사이에만 움직인다', '이름을 세 번 부르면 곁에 온다', '거울·반사면을 통해서만 건너온다', '눈을 마주치면 따라붙는다', '본 사람은 7일 안에 같은 모습으로 죽는다', '집 밖으로 13걸음을 넘으면 잡힌다', '소리를 내면 위치가 들킨다', '잠들면 안 되고 깨어 있어야 산다', '저주를 다른 사람에게 옮겨야 풀린다', '약속·규칙을 어긴 자만 노린다', '물에 닿으면 잠시 약해진다', '해가 뜨면 형체가 사라진다', '문턱·소금선은 넘지 못한다', '한 사람씩, 마지막에 남은 자를 노린다', '사진·영상에 찍힌 자부터 사라진다', '같은 질문을 두 번 하면 진실이 바뀐다', '뒤를 돌아보면 그 순간 잡아챈다', '불을 끄면 한 걸음씩 다가온다'],
  기원: ['수십 년 전 이 집에서 일어난 일가족 참변', '마을이 풍년을 위해 바친 인신공양의 약속', '금지된 책을 읽고 불러낸 심연의 권속', '강에 빠져 죽은 아이를 못 거둔 어미의 한', '의료 실험이 만들어 낸 봉인된 환자', '땅 밑에 묻혀 잊힌 옛 신전의 봉인', '대물림되는 가문의 저주받은 계약', '억울하게 매장당한 자의 풀리지 않은 원한', '복제·전파되도록 설계된 저주의 매체', '잘못 치른 장례가 불러들인 떠도는 혼', '봉인을 풀어 버린 호기심 많은 이의 죄', '오래전 사라진 아이들에 얽힌 마을의 비밀', '터를 잘못 잡아 무덤 위에 세운 건물', '실종 사건을 덮으려 한 공동체의 거짓말', '저주받은 물건을 들여온 누군가의 욕심', '되돌아온 자를 산 채로 묻은 옛 풍습'],
  드레드장치: ['아무도 없는데 위층에서 걷는 발소리', '0.5초 늦게 따라 짓는 가족의 미소', '항상 같은 자리에 서 있는 낡은 인형', '꺼졌다 켜지는 복도 끝 전등', '문틈으로 새어 드는 까닭 모를 노랫소리', '거울에 비친 등 뒤의 그림자', '반쯤 열린 채 조금씩 더 열리는 방문', '녹음에만 잡히는 누군가의 숨소리', '벽지 뒤에서 긁는 듯한 미세한 소리', '늘 한 칸 더 있는 사진 속 인원수', '개·고양이가 빈 구석을 보고 으르렁댄다', '시계가 같은 시각에 멈춰 있다', '말 없이 창밖에 서 있는 형체', '돌아보면 사라지는 시야 끝의 무엇', '매일 조금씩 자리가 바뀌어 있는 가구', '잘못된 안도 직후 닥치는 진짜 공격'],
  취약인물: ['아무도 믿어 주지 않는 외톨이 목격자', '갓 이사 와 마을 사정을 모르는 가족', '약을 끊은 뒤 환각을 의심받는 사람', '부모를 잃고 홀로 남은 아이', '몸을 못 쓰게 된 채 집에 갇힌 환자', '죄책감에 시달리는 사고 생존자', '믿었던 공동체에 받아들여지려는 외부인', '기억을 조금씩 잃어 가는 노인', '임신해 몸이 무거워진 산모', '말을 못 해 위험을 알릴 수 없는 인물', '빚에 몰려 이 집을 떠날 수 없는 사람', '특정 시간만 깨어 있는 야간 근무자', '순수와 기지로 끝까지 살아남는 마지막 생존자', '시각·청각을 잃어 위험을 못 느끼는 사람', '약물에 취해 판단이 흐려진 무리', '책임을 떠안고 동생들을 지키는 맏이'],
  고립장치: ['폭설로 길이 끊기고 차가 멈춘다', '휴대폰이 안 터지고 전화선이 끊긴다', '폭풍우와 함께 정전이 찾아온다', '다리가 무너져 섬에 갇힌다', '안개가 짙어 한 치 앞도 안 보인다', '외부의 누구도 이 말을 믿어 주지 않는다', '차 시동이 걸리지 않는다', '문이 안에서 잠겨 열리지 않는다', '구조 신호가 닿지 않는 오지다', '같은 길로 돌아 다시 제자리로 온다', '시간이 흐르지 않아 밤이 끝나지 않는다', '도와줄 사람이 차례로 사라진다', '마을 사람들이 한통속이라 도망칠 곳이 없다', '엘리베이터·통로가 끊겨 층에 갇힌다', '지도에 없는 길로 들어와 빠져나갈 수 없다', '폭주하는 감염으로 봉쇄선이 내려진다'],
  카운트다운: ['해가 뜨기 전까지', '7일 안에', '13번째 종이 울리기 전에', '보름달이 차오르는 밤까지', '저주가 다음 사람에게 옮겨가기 전에', '구조대가 도착하는 사흘 뒤까지', '마지막 양초가 다 타기 전에', '아이가 잠에서 깨기 전까지', '의식이 완성되는 자정까지', '눈이 그쳐 길이 열리기 전에', '봉인이 완전히 풀리기 전에', '다음 만조가 마을을 삼키기 전에', '감염이 온몸에 퍼지기 전에', '마지막 한 사람이 남기 전에'],
  감각분위기: ['피비린내와 녹슨 쇠 냄새', '오래 갇힌 곰팡내와 축축함', '향과 촛농이 타는 오컬트의 냄새', '젖은 흙과 썩어 가는 풀 냄새', '정적을 깨는 라디오 잡음(static)', '끊임없이 새는 물방울 소리', '마룻바닥이 삐걱이는 소리', '멀리서 들리는 아이의 웃음소리', '등골이 서늘해지는 무거운 냉기', '누군가 보고 있는 듯한 시선', '벽을 긁는 손톱 소리', '향수와 부패가 뒤섞인 단내', '숨이 막힐 듯 짙어지는 흙냄새', '귓가에 닿을 듯 가까운 속삭임'],
  결말씨앗: ['저주가 다른 사람에게 옮겨갔음을 암시', '마지막 컷에 불쑥 나타나는 손(점프스케어)', '생존자만 알 수 있는 작은 이상 징후', '알·유충·전염자 하나가 살아남음', '구원자라 믿은 자의 진짜 얼굴', '모든 게 환각이었을지 모른다는 여운', '화자가 사실 죽어 있었다는 폭로', '봉인이 다시 약해지고 있다는 신호', '같은 일이 다른 집에서 시작됨', '주인공이 괴물이 되어 가고 있음', '죽은 줄 알았던 괴물이 다시 일어남', '거울 속에 남겨진 또 하나의 미소', '아이가 보이지 않는 친구를 새로 사귄다', '돌아온 가족이 미묘하게 달라져 있다'],
  // 표적 — 주인공이 끝까지 지키려는 것(판돈). 모든 항목은 명사구. 다른 슬롯을 전제하지 않는 독립 항목.
  지켜야할것: ['품에 안은 갓난아기의 숨소리', '하나뿐인 어린 동생', '치매로 기억을 잃어 가는 노모', '아직 집에 남아 있는 가족 전부', '곁을 떠나지 않는 늙은 반려견', '함께 갇힌 마지막 동료들', '제 안의 흐려져 가는 제정신', '돌아갈 단 하나의 출구', '아침이면 깨어날 잠든 아이', '겨우 지켜 온 마지막 안전한 방', '아직 끊기지 않은 유일한 구조 신호', '서로를 향한 두 사람의 믿음', '대대로 봉인을 지켜 온 약속', '품속에 숨긴 마지막 성냥 한 개비'],
} as const
type PoolKey = keyof typeof POOLS

const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

// ───────────────────────── 섹션 정의 + 설계 질문(도시에 근거) ─────────────────────────
interface SectionDef { key: keyof WorldFields; label: string; icon: string; ph: string; questions: string[] }
const SECTIONS: SectionDef[] = [
  {
    key: 'stage', label: '무대·공간', icon: '🏚️',
    ph: '고립된 폐쇄공간·귀신 들린 집·저주받은 마을 — 잃을 것이 있는 "정상" 공간과 그 역사…',
    questions: [
      '주 무대는 어디인가? 왜 떠날 수 없거나 빠져나갈 수 없는가? (도시에 §7 고립)',
      '이 공간이 품은 과거의 비극(살인·자살·매장·사건)은 무엇인가? (집의 역사 = 공포의 근원)',
      '공간 자체가 적대적 의지를 가진 인격처럼 굴 여지가 있는가? (샤이닝의 오버룩 호텔식)',
      '안전해야 할 "정상" 일상을 충분히 보여 줘 "잃을 것"을 만들었는가? (5단 구조 1단계)',
      '"안전한 일상 사물"(거울·인형·사진·전화·비디오)을 위협의 매개로 쓸 곳은 어디인가?',
    ],
  },
  {
    key: 'threat', label: '위협의 정체', icon: '👁️',
    ph: '귀신·악마·괴물·인간의 광기·미지의 존재 — 무엇이, 어디까지 보여지는가…',
    questions: [
      '위협의 정체는 무엇이며 끝까지 얼마나 보여 줄 것인가? (off-screen·일부만이 더 무섭다)',
      '초자연인가 정신병인가의 모호함을 얼마나 오래 끌 것인가? (도시에 §3 불확실성)',
      '독자가 이입할 만큼 위협이 인간적/이해 가능한가, 아니면 철저히 이해 불가한가?',
      '괴물의 외형·소리·냄새 중 무엇만 노출하고 무엇을 끝까지 감출 것인가?',
      '"목격은 주인공만" — 아무도 안 믿어 주어 고립이 심화되는 구조인가?',
    ],
  },
  {
    key: 'rules', label: '작동 규칙·약점', icon: '🔒',
    ph: '괴물·저주의 작동 규칙("밤에만", "이름을 부르면", "보면 7일")과 약점·금기…',
    questions: [
      '위협에는 어떤 작동 규칙이 있는가? (밤에만·이름 금지·거울·눈맞춤·소리)',
      '규칙을 어기면(위반) 어떤 처벌이 따르는가? 독자가 규칙을 파악하며 긴장하게 했는가?',
      '클라이맥스에서 역이용할 약점(성수·소금·이름·불·해뜨기)은 무엇인가? — 반드시 미리 복선',
      '규칙이 너무 일찍 다 드러나지 않도록 정보를 조금씩 흘리는가? (정보의 적하)',
      '약점이 데우스 엑스 마키나가 되지 않게 빌드업에 심어 두었는가?',
    ],
  },
  {
    key: 'origin', label: '기원·저주의 역사', icon: '📜',
    ph: '저주·괴물·봉인의 기원 — "과거가 현재의 위협을 설명한다"…',
    questions: [
      '이 저주·괴물·원혼은 언제, 왜, 누구에 의해 생겨났는가?',
      '금기를 어긴 호기심·죄(열지 말라는 문·읽지 말라는 책)가 시작이었는가?',
      '"잊힌 진실"(마을·가문이 숨기는 부분)은 무엇이며 언제 드러나는가?',
      '과거의 어떤 빚·약속·희생이 현재의 위협으로 돌아오는가?',
      '조사를 통해 기원이 밝혀지는 구조인가? (5단 구조 3~4단계의 진실 폭로)',
    ],
  },
  {
    key: 'dread', label: '드레드·언캐니 장치', icon: '🕯️',
    ph: '드레드(예감)의 축적·언캐니(두려운 낯섦)·잘못된 안도·물건을 통한 침투…',
    questions: [
      '"곧 무언가 일어난다"는 예감(드레드)을 어떤 정적·어긋남으로 길게 끌 것인가?',
      '익숙한 것이 미세하게 잘못된 언캐니(표정 없는 가족·늦은 미소·같은 자리의 인형)는?',
      '잘못된 안도(고양이인 줄 알았더니… 직후 진짜 공격) 같은 가짜 스케어를 어디 둘 것인가?',
      '거울·사진·비디오·인형·라디오 잡음 등 매체를 통한 침투 장면은?',
      '동물의 이상 반응·경고하는 노인 등 빈출 클리셰를 활용/전복할 곳은?',
    ],
  },
  {
    key: 'victim', label: '취약한 인물', icon: '🫥',
    ph: '무력·고립된 인물에게 이입시키기 — "내가 저 상황이면"을 상상하게…',
    questions: [
      '독자가 이입할 취약한(무력·고립·불신받는) 주인공은 누구인가?',
      '왜 도망칠 수 없는가? (몸·돈·관계·믿음의 결핍)',
      '"다들 날 미쳤다고 한다"식 사회적 무력화가 작동하는가?',
      '슬래셔라면 final girl(순수·기지로 살아남는 자)과 먼저 죽는 인물(죄)의 구도는?',
      '클라이맥스에서 가장 무력했던 인물이 수동→능동으로 반격하는가?',
    ],
  },
  {
    key: 'isolation', label: '고립·전염·카운트다운', icon: '⛓️',
    ph: '통신 두절·정전·폭설로 외부 차단, 저주의 전염 구조, 시한(7일·해뜨기 전)…',
    questions: [
      '외부 도움을 어떻게 차단하는가? (휴대폰 불통·정전·폭설·고립된 섬)',
      '저주가 사람에서 사람으로 옮겨가는 룰이 있는가? (링식 전파·탈출구의 게임)',
      '시한(카운트다운)이 있는가? (7일·해뜨기 전·13번째 종) 어떻게 긴장을 조이는가?',
      '안전지대가 어떻게 점차 무너지는가? (5단 구조 4단계 포위)',
      '핵심 인물의 죽음으로 판돈을 올리는 지점은 어디인가?',
    ],
  },
  {
    key: 'sensory', label: '감각·분위기', icon: '🌫️',
    ph: '청각·시각·체감·후각의 공포 어휘 — 삐걱임·그림자·냉기·피비린내(도시에 §6)…',
    questions: [
      '이 세계를 지배하는 핵심 감각은? (피비린내·곰팡내·라디오 잡음·삐걱임·냉기)',
      '청각으로 공포를 줄 곳은? (발소리·긁는 소리·속삭임·정적을 깨는 소리)',
      '시각으로 공포를 줄 곳은? (그림자·실루엣·깜빡이는 전등·창밖의 얼굴)',
      '체감(등골 서늘·목덜미·무거운 공기·시선)을 어떻게 묘사할 것인가?',
      '후각(피·썩은 내·흙·향·촛농)으로 분위기를 어떻게 각인할 것인가?',
    ],
  },
  {
    key: 'taboo', label: '금기·규칙 위반', icon: '⚠️',
    ph: '죽음·시신·신체훼손·아이·임신·집 침범 등 금기와, 호기심의 처벌 구조…',
    questions: [
      '어떤 보편 금기(죽음·시신·신체훼손·아이·임신·안전한 집)를 건드릴 것인가?',
      '"열지 말라"·"가지 말라"·"읽지 말라"는 금기를 누가, 왜 어기는가?',
      '금지된 지식을 알아 버린 자가 어떻게 처벌받는가? (판도라·우주적 공포)',
      '인물의 죄(방종·오만·탐욕)와 죽음의 순서(인과응보)를 어떻게 설계할 것인가?',
      '금기를 의식적으로 전복(클리셰 비틀기)할 지점이 있는가?',
    ],
  },
  {
    key: 'ending', label: '클라이맥스·결말', icon: '🩸',
    ph: '최후의 대면·규칙 역이용·거짓 승리 후 재공격·열린 결말의 씨앗…',
    questions: [
      '최후의 대면에서 그동안 감춘 위협을 어디까지 드러낼 것인가?',
      '빌드업에서 심은 규칙·약점·아이템 중 무엇이 결정타로 회수되는가?',
      '"이긴 줄 알았는데 다시 일어남"(거짓 승리 후 재공격)을 쓸 것인가?',
      '살아남아도 정상으로 못 돌아오는 대가(트라우마·상실·신체손상)는?',
      '열린 결말의 씨앗(저주 전염·알·불길한 마지막 컷)이나 반전을 둘 것인가?',
    ],
  },
] as const

interface WorldFields {
  stage: string; threat: string; rules: string; origin: string; dread: string
  victim: string; isolation: string; sensory: string; taboo: string; ending: string
}
// 사용자 정의 항목(자유 추가) — 라벨(항목명)은 유지, 값은 사용자가 직접 적음.
interface CustomItem { id: string; label: string; value: string }

interface World {
  id: string
  name: string          // 작품/세계 이름
  summary: string       // 한 줄 소개(로그라인)
  subgenre: string      // 하위 장르
  nature: string        // 위협의 본성
  catharsis: string     // 결말 톤
  fields: WorldFields
  custom: CustomItem[]  // 사용자 정의 항목(라벨+값)
  etc: string           // 고정 '기타' 자유 입력
  createdAt: number
  updatedAt: number
}

const emptyFields = (): WorldFields => ({
  stage: '', threat: '', rules: '', origin: '', dread: '',
  victim: '', isolation: '', sensory: '', taboo: '', ending: '',
})

function makeWorld(name = ''): World {
  return {
    id: newId(), name, summary: '',
    subgenre: SUBGENRES[0].v, nature: THREAT_NATURE[1].v, catharsis: CATHARSIS[2],
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
        ? x.custom.filter((c: any) => c && typeof c === 'object').map((c: any) => ({
            id: String(c.id || newId()),
            label: typeof c.label === 'string' ? c.label : '',
            value: typeof c.value === 'string' ? c.value : '',
          }))
        : []
      return {
        ...base, ...x, id: String(x.id || newId()), fields, custom,
        etc: typeof x.etc === 'string' ? x.etc : '',
        name: typeof x.name === 'string' ? x.name : '',
        summary: typeof x.summary === 'string' ? x.summary : '',
        subgenre: typeof x.subgenre === 'string' ? x.subgenre : base.subgenre,
        nature: typeof x.nature === 'string' ? x.nature : base.nature,
        catharsis: typeof x.catharsis === 'string' ? x.catharsis : base.catharsis,
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      } as World
    })
    const ids = new Set(worlds.map((w) => w.id))
    const activeId = typeof p?.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (worlds[0]?.id ?? null)
    return { worlds, activeId }
  } catch { return { worlds: [], activeId: null } }
}

// ───────────────────────── 공포 어휘·클리셰 사전(도시에 §6, 카테고리/검색/무작위/복사) ─────────────────────────
const LEXICON: { cat: string; icon: string; items: string[] }[] = [
  { cat: '청각의 공포', icon: '🔊', items: ['삐걱이는 마룻바닥', '벽을 긁는 소리', '느리게 다가오는 발소리', '바로 뒤의 숨소리', '정적을 깨는 굉음', '라디오 잡음(static)', '멀리서 들리는 아이의 웃음', '동요·자장가 가락', '문을 두드리는 소리(똑·똑)', '벽 너머의 속삭임', '천장에서 끌리는 소리', '새는 물방울 소리', '목구멍에서 나는 그르렁'] },
  { cat: '시각의 공포', icon: '👁️', items: ['길게 늘어진 그림자', '문틈의 실루엣', '깜빡이는 전등', '반쯤 열린 방문', '거울 속의 무언가', '창밖에 선 얼굴', '벽에 번지는 핏자국', '스스로 움직이는 그림자', '어둠 속의 두 눈', '늘 한 명 더 있는 사진', '돌아보면 사라지는 형체', '천장에 달라붙은 무엇'] },
  { cat: '체감·정서', icon: '🥶', items: ['등골이 서늘하다', '소름이 돋다', '목덜미가 곤두서다', '공기가 무거워지다', '방이 갑자기 차가워지다', '누군가 보는 느낌', '심장이 쿵 내려앉다', '편집증(paranoia)', '무력감', '고립감', '불길함(ominous)', '오싹함(eerie)', '섬뜩함(uncanny)', '경악(horror)'] },
  { cat: '후각의 공포', icon: '👃', items: ['피비린내', '썩은 내', '젖은 흙냄새', '곰팡이·축축한 냄새', '향(線香) 냄새', '타는 촛농 냄새', '쇠 녹은 비린내', '오래된 먼지 냄새', '달큰한 부패의 단내', '소독약 냄새'] },
  { cat: '존재·위협', icon: '🩻', items: ['원혼·귀신', '처녀귀신', '빙의·악령', '구미호', '좀비·감염체', '기생체', '도플갱어', '몽마(夢魔)', '사령(死靈)', '리치·언데드', '컬트·사이비', '가면 살인마', '옛 신(Old One)', '심연의 권속', '저주받은 물건'] },
  { cat: '공간·무대', icon: '🏚️', items: ['귀신 들린 집(haunted house)', '외딴 산장', '폐병원', '등대', '우물·지하실', '다락방', '폐교', '안개 낀 숲', '눈에 갇힌 호텔', '외딴 섬', '지하 벙커', '버려진 놀이공원', '저주받은 마을', '봉인된 방'] },
  { cat: '저주·규칙', icon: '🕯️', items: ['저주의 전염', '봉인·결계', '금기·터부', '카운트다운(7일·해뜨기 전)', '이름을 부르면 안 됨', '거울을 보면 안 됨', '소금선·문턱', '인신공양', '주문·강령', '원혼의 한(恨)', '점프스케어', '신뢰할 수 없는 화자'] },
]

const CLICHES: { trope: string; twist: string }[] = [
  { trope: '이사 온 새 집의 이상한 지하실·다락방·우물', twist: '이상한 것은 집이 아니라, 그곳을 "정상"이라 우기는 가족 쪽이었다' },
  { trope: '"잠깐 나갔다 올게" 하고 혼자 떨어지는 인물 → 사망', twist: '혼자 떨어진 인물만 유일하게 살아남고, 무리에 남은 자들이 당한다' },
  { trope: '고장난 차·안 터지는 휴대폰·끊긴 전화', twist: '휴대폰은 멀쩡한데, 전화를 받는 상대가 이미 죽은 자다' },
  { trope: '깜빡거리다 꺼지는 전등, 갑자기 켜지는 TV·라디오', twist: '불이 꺼질 때가 아니라 가장 환할 때 그것이 옆에 서 있다' },
  { trope: '거울을 보면 등 뒤에 무언가 / 거울 속 내가 다르게 움직임', twist: '거울 속 쪽이 진짜이고, 이쪽이 비친 상(像)임이 드러난다' },
  { trope: '아이의 웃음소리·동요·"보이지 않는 친구"', twist: '보이지 않는 친구는 실재하며, 아이가 아니라 그를 지켜 주려 한다' },
  { trope: '동물(개·고양이)이 먼저 이상 반응 → 위험 감지', twist: '동물이 짖는 대상은 위협이 아니라, 주인공 자신이다' },
  { trope: '"이 마을엔 오면 안 됐어"라고 경고하는 노인·주유소 직원', twist: '경고하던 노인이 사실 제물을 유인하는 마을의 일원이었다' },
  { trope: '다 끝난 줄 알았는데 마지막에 손이 불쑥(점프스케어)', twist: '손은 위협이 아니라 구조의 손이고, 주인공이 그것을 뿌리쳐 파멸한다' },
  { trope: '신뢰받지 못하는 주인공("다들 날 미쳤다고 한다")', twist: '주인공이 정말로 신뢰할 수 없는 화자였고, 괴물은 그가 한 짓이다' },
  { trope: '봉인·금기를 어기는 호기심 많은 인물', twist: '봉인을 지킨 자가 더 큰 비극을 막고 있었고, 푸는 것이 곧 옳은 일이었다' },
  { trope: '폭풍우·정전이 사건과 동시에 발생', twist: '정전은 우연이 아니라, 그것이 어둠을 만들려 전기를 끊은 것이다' },
  { trope: '엑소시즘 끝에 악령을 몰아내고 평온이 찾아온다', twist: '몰아낸 것은 악령이 아니라 인물의 마지막 인간성이었다' },
  { trope: '마지막 생존자(final girl)가 괴물을 처치한다', twist: '괴물은 죽지 않으며, 그녀가 다음 마을의 새 괴물이 되어 떠난다' },
]

// 슬롯 → 섹션 매핑(영감을 현재 작품 필드에 반영)
const SLOT_FIELD: Record<PoolKey, keyof WorldFields> = {
  무대: 'stage', 위협정체: 'threat', 작동규칙: 'rules', 기원: 'origin', 드레드장치: 'dread',
  취약인물: 'victim', 지켜야할것: 'victim', 고립장치: 'isolation', 카운트다운: 'isolation', 감각분위기: 'sensory', 결말씨앗: 'ending',
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function HorrorWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
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
    const w = makeWorld(`새 공포 세계 ${worlds.length + 1}`)
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

  // 사용자 정의 항목 추가/수정/삭제 (값만 사용자가 적음 — 무작위 생성 없음)
  const addCustomItem = () => {
    if (!active) { flash('먼저 작품을 선택하거나 만들어 주세요.'); return }
    let label = ''
    try { label = window.prompt('추가할 항목의 이름을 적어 주세요. (예: 결계의 위치, 봉인 의식 등)') || '' } catch { label = '' }
    label = label.trim()
    if (!label) return
    patch({ custom: [...active.custom, { id: newId(), label, value: '' }] })
  }
  const setCustomValue = (id: string, value: string) => {
    if (!active) return
    patch({ custom: active.custom.map((c) => (c.id === id ? { ...c, value } : c)) })
  }
  const removeCustomItem = (id: string) => {
    if (!active) return
    patch({ custom: active.custom.filter((c) => c.id !== id) })
  }
  const setEtc = (value: string) => { if (active) patch({ etc: value }) }

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
    const w = makeWorld(`새 공포 세계 ${worlds.length + 1}`)
    w.summary = `${josaRo(slots.무대)} 숨어든 ${withJosa(slots.위협정체, '이', '가')} 깨어난다 — ${withJosa(slots.지켜야할것, '을', '를')} 지키며 ${slots.카운트다운} 살아남아야 한다`
    w.fields.stage = `무대: ${slots.무대}.`
    w.fields.threat = `위협의 정체: ${slots.위협정체}.`
    w.fields.rules = `작동 규칙: ${slots.작동규칙}.`
    w.fields.origin = `기원: ${slots.기원}.`
    w.fields.dread = `드레드 장치: ${slots.드레드장치}.`
    w.fields.victim = `취약한 인물: ${slots.취약인물}.\n지켜야 할 것: ${slots.지켜야할것}.`
    w.fields.isolation = `고립: ${slots.고립장치}.\n시한: ${slots.카운트다운}.`
    w.fields.sensory = `핵심 감각: ${slots.감각분위기}.`
    w.fields.ending = `결말 씨앗: ${slots.결말씨앗}.`
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setOpenGuide(null)
    flash('영감 슬롯으로 새 공포 세계 초안을 만들었어요. 설계 질문에 답하며 채워 보세요.')
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
    L.push(`# ${w.name || '이름 없는 공포 세계'}`)
    if (w.summary.trim()) L.push(w.summary.trim())
    L.push('', `· 하위 장르: ${w.subgenre}`, `· 위협의 본성: ${w.nature}`, `· 결말 톤: ${w.catharsis}`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
    }
    for (const c of w.custom) {
      const lbl = (c.label || '').trim(); const v = (c.value || '').trim()
      if (lbl && v) L.push('', `## ${lbl}`, v)
    }
    if (w.etc.trim()) L.push('', '## 기타', w.etc.trim())
    return L.join('\n')
  }
  function buildHtml(w: World): string {
    const p: string[] = []
    if (w.summary.trim()) p.push(`<p><i>${esc(w.summary.trim())}</i></p>`)
    p.push(`<p><b>하위 장르</b>: ${esc(w.subgenre)}<br><b>위협의 본성</b>: ${esc(w.nature)}<br><b>결말 톤</b>: ${esc(w.catharsis)}</p>`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(s.icon + ' ' + s.label)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    for (const c of w.custom) {
      const lbl = (c.label || '').trim(); const v = (c.value || '').trim()
      if (lbl && v) p.push(`<p><b>${esc(lbl)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    if (w.etc.trim()) p.push(`<p><b>기타</b><br>${esc(w.etc.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
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

  // 프로젝트 자료(세계관)에 setting 카드로 추가
  const toProject = (w: World) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const title = (w.name || '이름 없는 공포 세계').trim()
    // 받는 setting 허브(배경 설정집 등)의 기본 칸에 들어가도록 character 키를 정규 장소 키로 구성.
    // (정규 키 우선 배치 후, 기존 한글 라벨 키도 보존해 추가만 한다 — 삭제 없음.)
    const character: Record<string, string> = { ...placeFields(w, false) }
    character.kind = '호러 무대·세계관'
    character.하위장르 = w.subgenre; character.위협의본성 = w.nature; character.결말톤 = w.catharsis
    for (const s of SECTIONS) { const v = (w.fields[s.key] || '').trim(); if (v) character[s.label] = v }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관', title, icon: '🩸',
      synopsis: w.summary.trim() || `${w.subgenre} · ${w.nature}`,
      bodyHtml: buildHtml(w), character,
      meta: { 유형: '호러 세계관', 하위장르: w.subgenre, 위협: w.nature, '채운 항목': `${filledCount(w)}/${SECTIONS.length}` },
    })
    flash(id ? `‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 장소 데이터를 받는 허브(배경 설정집 등)의 기본 칸에 들어가도록 정규 키 fields 구성
  // 정규 장소 키: name,kind,atmosphere,appearance,sensory,geography,climate,history,culture,inhabitants,rules,dangers,landmarks,secrets,notes
  function placeFields(w: World, withNotes = true): Record<string, string> {
    const f: Record<string, string> = {}
    const put = (key: string, v: string) => { const t = (v || '').trim(); if (t) f[key] = t }
    put('name', (w.name || '이름 없는 공포 세계').trim())
    put('kind', '호러 무대·세계관')
    put('atmosphere', w.fields.dread)      // 드레드·언캐니 장치 → 분위기
    put('appearance', w.fields.stage)      // 무대·공간 자유 서술 → 외형
    put('sensory', w.fields.sensory)       // 감각·분위기 → 오감
    put('geography', w.fields.isolation)   // 고립·전염·카운트다운(공간 차단) → 지리
    put('history', w.fields.origin)        // 기원·저주의 역사 → 역사
    put('culture', w.fields.taboo)         // 금기·규칙 위반 → 문화(금기)
    put('inhabitants', w.fields.victim)    // 취약한 인물 → 거주자
    put('rules', w.fields.rules)           // 작동 규칙·약점 → 규칙
    put('dangers', w.fields.threat)        // 위협의 정체 → 위험
    put('secrets', w.fields.ending)        // 클라이맥스·결말의 씨앗(숨은 진실) → 비밀
    // 사용자 정의 항목(라벨 그대로 키로) + 기타 — 값이 있을 때만 추가해 다른 도구에도 그대로 노출
    for (const c of w.custom) { const lbl = (c.label || '').trim(); if (lbl) put(lbl, c.value) }
    put('etc', w.etc)
    if (withNotes) put('notes', buildText(w))
    return f
  }

  // 공유 라이브러리(장소)로 추가 — 배경 설정집 등과 연계
  const toLibrary = (w: World) => {
    const title = (w.name || '이름 없는 공포 세계').trim()
    addToLibrary('places', {
      name: title, kind: '호러 무대·세계관', mood: w.summary.trim() || w.subgenre,
      history: (w.fields.origin || '').trim() || undefined,
      rules: [`작동 규칙·약점`, (w.fields.rules || '').trim()].filter(Boolean).join('\n') || undefined,
      sensory: (w.fields.sensory || '').trim() || undefined,
      notes: buildText(w),
      fields: placeFields(w),
      source: '호러 세계관 빌더',
    })
    flash(`‘${title}’을(를) 공유 라이브러리(장소)에 저장했어요. 배경 설정집 등에서 불러올 수 있어요.`)
  }

  // 글감 스니펫으로 — 로그라인/요약을 영감 메모로
  const toSnippet = (w: World) => {
    const text = w.summary.trim() || buildText(w)
    addToLibrary('snippets', { text, source: '호러 세계관 빌더', tags: ['호러', '세계관', w.subgenre.split(' ')[0]] })
    flash('한 줄 소개를 글감 스니펫으로 저장했어요.')
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

  return (
    <div style={C.wrap}>
      <div style={C.topbar}>
        <div style={C.title}><span aria-hidden><Emoji e="🩸"/></span> 호러 세계관 빌더</div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>호러·공포</span>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{worlds.length}개 작품</span>
        <button className="minibtn" onClick={() => setShowRef((v) => !v)} title="공포 어휘·클리셰 사전 열기">{showRef ? <><Emoji e="📖"/> 사전 닫기</> : <><Emoji e="📖"/> 사전</>}</button>
        <button className="minibtn" onClick={() => openToolLinked('horror-lexicon', { genre: '호러·공포' })} title="호러 어휘 사전 열기"><Emoji e="📚"/> 호러 어휘</button>
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
                      <Emoji e="🩸"/> {w.name || '(이름 없는 공포 세계)'}
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
                <div style={C.secTitle}><span aria-hidden><Emoji e="📖"/></span> 공포 어휘·클리셰 사전</div>
                <div style={C.spacer} />
                <button className={refTab === 'lex' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('lex')}>공포 어휘</button>
                <button className={refTab === 'cliche' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('cliche')}>클리셰·변주</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...C.input, flex: 1 }} value={refQuery} onChange={(e) => setRefQuery(e.target.value)} placeholder="🔍 사전 검색" aria-label="사전 검색" />
                {refTab === 'lex' ? (
                  <button className="minibtn" onClick={() => { const all = LEXICON.flatMap((g) => g.items); const v = pick(all); copyText(v, `‘${v}’ 복사됨`) }} title="무작위 어휘 복사"><Emoji e="🎲"/> 무작위</button>
                ) : (
                  <button className="minibtn" onClick={() => { const c = pick(CLICHES); copyText(`${c.trope}\n→ 변주: ${c.twist}`, '무작위 클리셰를 복사했어요') }} title="무작위 클리셰 복사"><Emoji e="🎲"/> 무작위</button>
                )}
              </div>

              {refTab === 'lex' ? (
                lexFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>‘{refQuery}’에 맞는 어휘가 없어요.</div>
                ) : lexFiltered.map((g) => {
                  const open = refQuery.trim() ? true : openCat === g.cat
                  return (
                    <div key={g.cat} style={C.panel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setOpenCat(open ? null : g.cat)}>
                        <span style={C.secTitle}><Emoji e={g.icon}/> {g.cat}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.items.length}</span>
                        <span style={C.spacer} />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
                      </div>
                      {open && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {g.items.map((it) => (
                            <button key={it} style={C.chip} onClick={() => copyText(it, `‘${it}’ 복사됨`)} title="클릭하면 복사돼요">{emojify(it)}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                clicheFiltered.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>‘{refQuery}’에 맞는 항목이 없어요.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>흔한 공포 클리셰 ↔ 비트는 변주(도시에 §6). 항목을 누르면 복사됩니다.</div>
                    {clicheFiltered.map((c, i) => (
                      <div key={i} style={{ ...C.panel, cursor: 'pointer' }} onClick={() => copyText(`${c.trope}\n→ 변주: ${c.twist}`, '복사됨')} title="클릭하면 복사돼요">
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}><Emoji e="🔁"/> {emojify(c.trope)}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.55 }}>↳ 변주: {emojify(c.twist)}</div>
                      </div>
                    ))}
                  </>
                )
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>상단 ‘<Emoji e="📖"/> 사전 닫기’를 누르면 작품 편집으로 돌아갑니다.</div>
            </div>
          ) : !active ? (
            <div style={C.body}>
              <div style={C.empty}>
                <div style={{ fontSize: 34 }} aria-hidden><Emoji e="🩸"/></div>
                <div>
                  공포 한 편의 세계를 무대·위협의 정체·작동 규칙·저주의 기원·드레드 장치·취약한 인물·고립·전염·감각·금기·결말까지<br />
                  설계 질문을 따라 또렷하게 빚어 보세요.<br />
                  <b>+ 새 작품</b>으로 시작하거나, 아래 <strong style={{ color: 'var(--accent)' }}>공포 영감 생성기</strong>로 초안을 굴려 보세요.
                </div>
                <button className="btn-primary" onClick={onNew}>+ 첫 작품 만들기</button>
              </div>
              <Inspiration />
            </div>
          ) : (
            <>
              <div style={C.body}>
                {/* 기본 정보 */}
                <div style={C.panel}>
                  <div>
                    <label style={C.label}>작품/세계 이름</label>
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 폐촌 ‘무량리’ — 13번째 종" maxLength={80} aria-label="작품 이름" />
                  </div>
                  <div>
                    <label style={C.label}>한 줄 소개 (로그라인)</label>
                    <input style={C.input} value={active.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="이 공포를 한 문장으로… 예: 눈에 갇힌 산장에서, 거울 속의 내가 7일째부터 다르게 움직이기 시작한다" maxLength={160} aria-label="한 줄 소개" />
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
                      <label style={C.label}>위협의 본성</label>
                      <select style={C.select} value={active.nature} onChange={(e) => patch({ nature: e.target.value })}>
                        {THREAT_NATURE.map((m) => <option key={m.v} value={m.v}>{m.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{THREAT_NATURE.find((m) => m.v === active.nature)?.d}</div>
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>결말 톤 (카타르시스)</label>
                    <select style={C.select} value={active.catharsis} onChange={(e) => patch({ catharsis: e.target.value })}>
                      {CATHARSIS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: filledCount(active) === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>채운 항목 {filledCount(active)}/{SECTIONS.length}</span>
                  </div>
                </div>

                {/* 섹션 + 설계 질문 가이드 */}
                {SECTIONS.map((s) => {
                  const val = active.fields[s.key] || ''
                  const guideOpen = openGuide === s.key
                  return (
                    <div key={s.key} style={C.panel}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={C.secTitle}><Emoji e={s.icon}/> {s.label}</span>
                        {val.trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                        <span style={C.spacer} />
                        <button
                          style={{ ...C.tinyBtn, color: guideOpen ? 'var(--accent)' : 'var(--muted)', borderColor: guideOpen ? 'var(--accent)' : 'var(--border)' }}
                          onClick={() => setOpenGuide(guideOpen ? null : s.key)}
                          title="이 항목을 채우는 설계 질문 보기"
                        ><Emoji e="💡"/> 설계 질문 {guideOpen ? '▲' : '▼'}</button>
                      </div>
                      {guideOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 9, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>질문을 누르면 아래 칸에 답할 자리가 추가됩니다.</div>
                          {s.questions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => appendQuestion(s.key, q)}
                              style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.5, padding: '6px 9px', borderRadius: 7 }}
                              title="이 질문을 입력칸에 추가"
                            >＋ {q}</button>
                          ))}
                        </div>
                      )}
                      <textarea
                        style={C.textarea}
                        value={val}
                        onChange={(e) => patchField(s.key, e.target.value)}
                        placeholder={s.ph}
                        aria-label={s.label}
                      />
                    </div>
                  )
                })}

                {/* 사용자 정의 항목 + 고정 '기타' */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={C.secTitle}><span aria-hidden><Emoji e="🧩"/></span> 사용자 정의 항목</span>
                    <span style={C.spacer} />
                    <button className="minibtn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={addCustomItem} title="원하는 항목을 직접 추가합니다(이름 입력 후 내용은 직접 작성)">＋ 항목 추가</button>
                  </div>
                  {active.custom.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>위 항목 외에 필요한 칸이 있으면 <b>＋ 항목 추가</b>로 직접 만들어 적어 보세요. (내용은 자유 입력)</div>
                  ) : (
                    active.custom.map((c) => (
                      <div key={c.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <label style={{ ...C.label, marginBottom: 0, color: 'var(--text)', fontSize: 12.5 }}>{emojify(c.label)}</label>
                          <span style={C.spacer} />
                          <button style={C.tinyBtn} onClick={() => removeCustomItem(c.id)} title="이 항목 삭제" aria-label={`${c.label} 삭제`}>✕</button>
                        </div>
                        <textarea
                          style={C.textarea}
                          value={c.value}
                          onChange={(e) => setCustomValue(c.id, e.target.value)}
                          placeholder={`‘${c.label}’ 내용을 직접 적어 주세요…`}
                          aria-label={c.label}
                        />
                      </div>
                    ))
                  )}
                </div>

                <div style={C.panel}>
                  <span style={C.secTitle}><span aria-hidden><Emoji e="🗒️"/></span> 기타</span>
                  <textarea
                    style={{ ...C.textarea, minHeight: 110 }}
                    value={active.etc}
                    onChange={(e) => setEtc(e.target.value)}
                    placeholder="어느 항목에도 들어가지 않는 자유로운 메모·아이디어·설정을 충분히 적어 두세요…"
                    aria-label="기타"
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>모든 변경은 이 브라우저에 자동 저장됩니다. 수정 {fmtDate(active.updatedAt)}</div>

                {/* 영감 생성기 */}
                <Inspiration />
              </div>

              <div style={C.editBar}>
                <button className="minibtn" onClick={() => copyText(buildText(active), '이 작품을 복사했어요')}><Emoji e="📋"/> 복사</button>
                <button className="linkbtn" onClick={() => toProject(active)} disabled={!linked} title={linked ? '이 작품을 프로젝트 자료(세계관)에 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="minibtn" onClick={() => toLibrary(active)} title="공유 라이브러리(장소)에 저장해 배경 설정집 등에서 활용"><Emoji e="🗂️"/> 라이브러리에 저장</button>
                <button className="minibtn" onClick={() => toSnippet(active)} title="한 줄 소개를 글감 스니펫으로 저장"><Emoji e="📝"/> 글감으로</button>
                <button className="minibtn" onClick={() => openToolLinked('horror-settingforge', { genre: '호러·공포', name: active.name })} title="호러 배경 생성기 열기"><Emoji e="🏚️"/> 무대 만들기</button>
                <button className="minibtn" onClick={() => openToolLinked('horror-sceneforge', { genre: '호러·공포', name: active.name })} title="호러 장면 생성기 열기"><Emoji e="🎬"/> 장면 만들기</button>
                <button className="minibtn" onClick={() => openToolLinked('setting-bible', { genre: '호러·공포', name: active.name })} title="배경 설정집 열기"><Emoji e="🗺️"/> 배경 설정집</button>
                <div style={C.spacer} />
                {confirmDel === active.id ? (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--warn)', marginRight: 4 }}>삭제할까요?</span>
                    <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                    <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeWorld(active.id)}>삭제 확정</button>
                  </>
                ) : (
                  <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(active.id)}><Emoji e="🗑️"/> 삭제</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // 영감 생성기(렌더 헬퍼 — 별도 컴포넌트로 두면 입력 포커스 유실 우려)
  function Inspiration() {
    return (
      <div style={{ ...C.panel, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={C.secTitle}><span aria-hidden><Emoji e="🎲"/></span> 공포 영감 생성기</div>
          <div style={C.spacer} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합수 약 {fmtBig(COMBO_COUNT)}가지 ({COMBO_COUNT.toLocaleString('ko-KR')})</span>
        </div>
        <div style={C.slotGrid}>
          {(Object.keys(POOLS) as PoolKey[]).map((k) => (
            <div
              key={k}
              style={slotCardStyle(locks[k])}
              onClick={() => toggleLock(k)}
              title={locks[k] ? '잠금 해제(재생성 대상에 포함)' : '잠금(재생성에서 제외)'}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLock(k) } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: 11 }} aria-hidden>{locks[k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</span>
                <div style={C.spacer} />
                <button
                  className="minibtn"
                  style={{ padding: '1px 6px', fontSize: 10.5 }}
                  onClick={(e) => { e.stopPropagation(); appendSlotToActive(k) }}
                  title="이 항목을 현재 작품의 해당 필드에 반영"
                >＋</button>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all' }}>{emojify(slots[k])}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={roll}><Emoji e="🎲"/> 재생성</button>
          <button className="minibtn" onClick={applyInspiration}>이 조합으로 새 작품 만들기</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); copyText(t, '영감 조합을 복사했어요') }}><Emoji e="📋"/> 조합 복사</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); addToLibrary('snippets', { text: t, source: '호러 세계관 빌더', tags: ['호러', '영감'] }); flash('영감 조합을 글감 스니펫으로 저장했어요.') }}><Emoji e="📝"/> 글감으로</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 눌러 잠그면 재생성에서 제외돼요.</span>
        </div>
      </div>
    )
  }
}
