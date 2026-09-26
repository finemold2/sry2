// 액션·전쟁 세계관 빌더 (액션·전쟁 / 세계관) — 도시에(dossier)에 근거해 액션·전쟁 한 편의 세계/설정을 항목별로 구조화하는 설정 빌더.
//  좌측: 작품 목록(선택·검색·추가·삭제·순서이동). 우측: 선택 작품 편집 + 액션·전쟁 영감 생성기 + 어휘·클리셰 사전.
//  설계 축(도시에 §2 관습 · §3 서사 장치 · §4 페이싱 · §5 클라이맥스 · §6 어휘):
//   분쟁의 무대·진영/세력·이해관계와 명분·전장 지리·무력 체계와 규칙·자원과 물리적 대가·세트피스 사다리·시계장치/카운트다운·시그니처 무브·전술/병참·클라이맥스와 대가.
//  각 섹션마다 도시에에 뿌리내린 "설계 질문"을 두어 빈칸을 메우게 하고, 슬롯 풀 무작위 영감(잠금/재생성, 조합수 표시 — 1조 이상)도 제공한다.
//  사전류(액션·전쟁 어휘·클리셰): 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  모든 데이터는 localStorage('sry:tool:action-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
//  연계: addToProject(kind:setting, root:research, folder:'세계관') · hasProjectBridge · addToLibrary('places'|'snippets') · openToolLinked. payload.genre/name 활용.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'action-worldbuilder',
  name: '액션·전쟁 세계관 빌더',
  icon: '⚔️',
  group: '세계관',
  genre: '액션·전쟁',
  intro: '무대·진영·명분·전장 지리·무력 규칙·대가·세트피스·시계장치·전술·클라이맥스까지 액션·전쟁 한 편의 세계를 설계하는 빌더',
  w: 800,
  h: 670,
}

const LS_KEY = 'sry:tool:action-worldbuilder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 한국어 조사 자동 선택: 앞 글자 받침 유무로 실제 하나를 골라 붙인다(괄호 이중표기 금지).
function hasBatchim(s: string): boolean {
  const m = (s || '').trim()
  const ch = m.charCodeAt(m.length - 1)
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0
}
// 받침 있으면 with, 없으면 without
function josa(word: string, withBatchim: string, without: string): string {
  return word + (hasBatchim(word) ? withBatchim : without)
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

// ───────────────────────── 선택형 축(도시에 §1 계보 톤 프리셋 · §2 기대 · 개인↔집단 슬라이더) ─────────────────────────
// 하위 장르(도시에 §1 대표작 계보를 작전 무대로 정리)
const SUBGENRES = [
  { v: '현대 군사·테크노스릴러 (잭 라이언·요원물)', d: '특수부대·첩보·테러 저지. 고증된 화기·작전·정보전. 톰 클랜시·빈스 플린 계보.' },
  { v: '1인 액션 히어로 (다이하드·잭 리처)', d: '능력자 1인이 다수와 맞서는 밀폐공간/도가니식 연쇄전투. 존 윅·미션임파서블 톤.' },
  { v: '대규모 전쟁 (참호·작전·대하)', d: '집단·전략·소모·병참. 다중 지휘관 시점. 킬러 엔젤스·전쟁과 평화·서부 전선.' },
  { v: '밀리터리 SF (병종·체제 비판)', d: '미래 병기·강하병·외계전. 전술과 체제 비판을 장르로. 스타십 트루퍼스·엔더의 게임.' },
  { v: '무협 (초식·내공·문파전)', d: '초식·내공·비무·정파/사파·기연. 약함→기연→서열전→문파전→천하 최종전.' },
  { v: '헌터·게임판타지 (각성·레이드·길드전)', d: '각성·스킬·쿨타임·던전/레이드·PvP·공성. 무력 인플레와 사이다 회차 설계.' },
  { v: '대체역사 전쟁 (회귀 군담)', d: '임진왜란·6.25·근대 회귀로 역사를 바꾸는 군담. 한국 웹소설 주류.' },
  { v: '추격·도주 액션 (매드맥스·하이스트)', d: '추격·탈출·강탈이 엔진. 이동하는 세트피스와 시계장치 중심.' },
  { v: '검극·전기물 (베르세르크·킹덤)', d: '검술·병법·대규모 진형전. 시각적 검극과 무게 있는 죽음. 바가본드·킹덤.' },
  { v: '재난·서바이벌 액션', d: '재난·고립·생존이 적. 환경 자체가 빌런, 자원 고갈이 시계장치.' },
] as const

// 톤 프리셋(도시에 §1 끝) — 카타르시스↔비극 축
const TONE = [
  { v: '영웅·카타르시스 (통쾌한 승리)', d: '능력 입증·점층되는 세트피스·시원한 응징. 사이다 회로.' },
  { v: '반전·환멸 (전쟁의 민낯)', d: '애국에서 환멸로. 참호·소모·부조리. 서부 전선·캐치-22 톤.' },
  { v: '전략·정치 (머리싸움)', d: '병참·첩보·기만이 승패를 가른다. 은하영웅전설·유녀전기.' },
  { v: '비장·대가 있는 승리 (Pyrrhic)', d: '이기되 영구히 무언가를 잃는다. 희생적 후위·전사자 호명.' },
  { v: '성장·무력 인플레 (약→강)', d: '약자가 기연·각성으로 단계적 역전. 무협·헌터 성장형.' },
] as const

// 무력의 축(도시에 도입부 슬라이더) — 개인 무력 ↔ 집단 전략
const POWER_AXIS = [
  { v: '개인 무력 중심 (1인/소규모)', d: '신체적 우월성·기교의 과시. "위기-탈출" 펄스 반복.' },
  { v: '소대·팀 단위 (작전 합)', d: '역할 분담된 팀의 합. 로드아웃·브리핑·전우애.' },
  { v: '집단·전략 중심 (전선·체제)', d: '편제·병참·전술. 개인보다 대가와 의미를 묻는다.' },
  { v: '개인↔집단 교차 (지휘부와 현장)', d: '전략 시점과 병사 시점을 교차(킬러 엔젤스 방식).' },
] as const

// ───────────────────────── 무작위 영감 슬롯 풀(도시에 §3·§6·§7 근거 자작 — 액션·전쟁 특화) ─────────────────────────
// 조합수 = 모든 풀 길이의 곱 → 1조 이상을 지향(핵심 생성기).
const POOLS = {
  무대: ['포위된 채 고립된 국경의 전초기지', '적의 한복판에 떨어진 추락 헬기 잔해', '폭설로 끊긴 산악 고갯길의 검문소', '인질이 갇힌 초고층 빌딩 한 채', '증원이 끊긴 사막 한가운데 보급기지', '강을 사이에 둔 두 진영의 교두보', '무너져 가는 공성전의 성벽 위', '지하 벙커로 이어지는 미로 같은 갱도', '폐허가 된 도심의 시가전 구역', '함대가 대치한 좁은 해협', '몬스터가 쏟아지는 균열(던전 게이트) 앞', '서열전이 벌어지는 문파의 비무대(比武臺)', '회귀한 장수가 다시 선 임진년의 포구', '탈출로가 하나뿐인 협곡의 매복지', '폭주하는 열차 위의 객차 사이', '항구를 통째로 봉쇄한 적의 점령지'],
  진영세력: ['수적으로 압도하는 정규군과 한 줌의 결사대', '명령을 내리는 후방 지휘부와 버려진 현장 분대', '국경을 노리는 제국과 무너지는 변방 수비대', '청부를 받은 용병단과 그들을 쓰고 버리려는 고용주', '정파 연합과 그 틈을 노리는 사파 세력', '길드 랭커 파티와 같은 던전을 노리는 경쟁 길드', '쿠데타를 일으킨 군부와 충성을 지킨 친위대', '침략군과 그에 부역하는 내부의 협력자', '왕조의 정규군과 봉기한 반란군', '제국 함대와 그를 막아선 소수 정예 함대', '테러 조직과 그들을 추적하는 대테러 특수팀', '두 군벌 사이에서 줄타기하는 중립 마을', '명문 정파의 후계자와 그를 노리는 마교 세력', '점령군 사령부와 그늘에서 움직이는 지하 저항군'],
  명분: ['빼앗긴 고향을 되찾기 위해', '동료의 죽음을 갚기 위한 복수로', '인질이 된 가족을 구하기 위해', '무너진 가문의 명예를 되세우려', '바꿀 수 없다 믿었던 역사를 뒤집으려', '살아남아 진실을 세상에 전하기 위해', '무의미한 명령에 맞서 부하들을 살리려', '대의(나라·신념)와 사사로운 정 사이에서', '오직 의뢰받은 임무를 완수하기 위해', '스스로의 약함을 증명하지 않기 위해', '봉인된 힘이 깨어나는 것을 막으려', '버려진 자들의 마지막 자존심을 지키려', '스승을 베고 떠난 빚을 청산하기 위해', '다시는 같은 비극을 반복하지 않으려'],
  전장지리: ['고지를 차지한 쪽이 모든 사선을 장악한다', '출구가 단 하나뿐인 막다른 구조', '엄폐물이 없어 탁 트인 살상지대(killing zone)', '시야를 가리는 짙은 안개와 연막', '높이 차가 큰 다층 구조(옥상·계단·지하)', '강·해자가 가로막아 도하가 관건', '좁은 통로로 수적 우위가 무력화된다', '무너지기 직전의 다리가 유일한 퇴로', '미로 같은 골목이 매복과 기습을 부른다', '폭약이 매설된 지뢰밭이 진로를 묶는다', '폭풍·만조 같은 자연이 시간을 압박한다', '보급선이 길게 늘어나 측면이 노출된다', '어둠과 정전이 야시경 가진 쪽을 압도한다', '낙석·붕괴가 언제든 전장을 바꾼다'],
  무력규칙: ['탄약이 유한해 한 발 한 발이 곧 목숨이다', '내공이 바닥나면 절기를 펼칠 수 없다', '스킬마다 쿨타임이 있어 연발이 불가능하다', '부상이 쌓일수록 동작이 느려진다(부상 시계)', '강자도 약점(맹점·역린·파훼점)이 분명하다', '체력·산소·연료가 행동 시간을 제한한다', '시그니처 무기를 잃으면 전력이 급감한다', '버프·강화는 지속시간이 정해져 있다', '한 번 쓰면 봉인되는 비기(秘技)가 있다', '거리(원거리·중거리·근접)마다 유불리가 갈린다', '증원·각성은 정해진 조건에서만 가능하다', '서로의 강함이 명확한 서열(경지)로 매겨진다', '지형·날씨가 무력의 발휘를 절반으로 깎는다', '강해질수록 통제가 어려워 폭주의 위험이 커진다'],
  자원대가: ['남은 탄창이 단 하나', '내공이 한 줌밖에 남지 않았다', '부러진 검·고장난 총으로 싸워야 한다', '출혈을 멈추지 못한 채 시간이 줄어든다', '믿었던 보급이 끊겨 굶주린다', '동료의 부상으로 이동 속도가 묶인다', '마지막 수류탄·폭약 한 발', '회복 물약·붕대가 동났다', '연료가 떨어져 차량을 버려야 한다', '통신이 두절돼 증원을 부를 수 없다', '아끼던 부적·편지처럼 짊어진 무게', '비기를 쓰면 그 대가로 몸이 망가진다'],
  세트피스: ['무너지는 다리 위에서의 추격과 폭파', '초고층 빌딩 봉쇄와 한 층씩 올라가는 돌파', '협곡 매복을 역이용한 양동·포위', '폭주하는 열차·차량 위에서의 격투', '성벽을 사이에 둔 공성과 농성', '함대가 좁은 해협에서 벌이는 결전', '인질 구출을 위한 동시 다발 진입', '균열에서 쏟아지는 몬스터 웨이브 방어', '서열을 가르는 일대일 비무', '보급선을 끊기 위한 기습 침투', '시가지를 가로지르는 추격·탈출', '폭설 속 고개를 지키는 최후의 저항'],
  시계장치: ['증원 부대가 도착하기 전까지', '폭탄 타이머가 0이 되기 전에', '인질 처형 시한이 닥치기 전에', '해가 떠 적의 시야가 트이기 전에', '만조가 길을 삼키기 전에', '탄약·연료가 바닥나기 전에', '부상으로 쓰러지기 전에', '봉인이 풀려 적이 깨어나기 전에', '다리가 완전히 무너지기 전에', '봉쇄선이 내려와 갇히기 전에', '레이드 시간제한이 끝나기 전에', '의식·소환이 완성되는 자정까지'],
  시그니처: ['빈 탄창을 버리고 0.5초 만에 재장전하는 손', '단 한 호흡에 끝내는 저격수의 격발', '상대의 초식을 한 번 보고 파훼하는 안목', '근접에서 빛나는 봉인된 절기·필살기', '불리할수록 차분해지는 냉정한 판단', '버려진 무기를 즉석에서 무기로 바꾸는 기지', '동료를 먼저 빼내고 후위를 자처하는 신념', '한 발도 빗나가지 않는 정밀 사격', '상대의 힘을 되받아치는 흘리기·반격기', '한계에서 한 번 더 끌어내는 마지막 힘', '적의 보급·정보를 읽어 내는 머리싸움', '각성/신경지를 결정적 순간에만 해방'],
  전술병참: ['측면을 우회해 적의 사선을 무너뜨린다', '양동작전으로 시선을 끌고 본대가 친다', '각개격파로 수적 열세를 뒤집는다', '제압 사격으로 묶고 엄호 아래 전진한다', '거짓 무전·위장으로 적을 속인다(기만)', '보급선을 끊어 적을 말려 죽인다', '거점을 사수하며 증원을 기다린다', '척후·첩보로 적의 동선을 미리 읽는다', '종심 방어로 적의 돌파를 흡수한다', '체호프의 환경(밸브·절벽·강물)을 무기로 회수', '희생적 후위가 본대의 퇴각을 엄호한다', '약점·파훼점을 노려 강자를 무너뜨린다'],
  클라이맥스: ['최강 빌런과의 좁혀진 일대일 최종 대결', '무장 해제·부상의 최저점에서 마지막 힘으로 역전', '깔아 둔 환경·약점·동료의 선물이 동시에 발화', '마지막 한 발/한 줌의 내공으로 끝내는 결착', '진짜 적은 아군 지휘부였다는 폭로형 절정', '한 인물의 분투가 전선 전체의 분기점이 된다', '비기·신경지가 누적된 수련의 결실로 완성', '시계가 00:01에서 멎으며 위기가 해제된다', '이겼으나 동료·신념·고향을 영구히 잃는다', '시그니처 무브의 변주·봉인 해제로 마무리', '증원·기만이 마지막 순간에 판을 뒤집는다', '최후의 저항이 끝내 전세를 돌려세운다'],
} as const
type PoolKey = keyof typeof POOLS

const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

// ───────────────────────── 섹션 정의 + 설계 질문(도시에 근거) ─────────────────────────
interface SectionDef { key: keyof WorldFields; label: string; icon: string; ph: string; questions: string[] }
const SECTIONS: SectionDef[] = [
  {
    key: 'arena', label: '분쟁의 무대', icon: '🗺️',
    ph: '전쟁/충돌이 벌어지는 시대·장소·규모 — 왜 여기서, 무엇을 두고 싸우는가…',
    questions: [
      '이 분쟁은 어느 시대·세계·규모에서 벌어지는가? (국지전·전면전·1인 작전)',
      '왜 하필 이 무대인가? 이 장소만이 가진 전략적·상징적 가치는? (도시에 §3 세트피스)',
      '독자가 머릿속에 지도를 그릴 만큼 무대가 또렷한가? (혼란이 약함보다 큰 실패)',
      '평시의 "정상" 일상을 보여 줘 "무엇을 잃을 수 있는지"를 깔았는가? (§2 이해관계 설치)',
      '개인 무력 ↔ 집단 전략 어느 쪽에 무게를 둘 무대인가? (도입부 슬라이더)',
    ],
  },
  {
    key: 'factions', label: '진영·세력', icon: '🛡️',
    ph: '맞서는 진영(아군/적군/제3세력) — 편제·지휘체계·동기·자원의 비대칭…',
    questions: [
      '맞서는 진영은 누구누구인가? 각 진영의 목표·동기는 무엇인가?',
      '편제·계급·지휘체계는 어떻게 되는가? (분대·소대·중대 / 문파·길드 / 함대) (§6 군사 어휘)',
      '수적·자원·정보의 비대칭은 어디에 있는가? (불리한 열세 = 약자 응원 심리)',
      '적에게도 정당한 명분·인간적 면모가 있어 단순 악역이 아닌가?',
      '제3세력·내부의 적·배신자가 판을 흔들 여지가 있는가? (반전 클라이맥스 씨앗)',
    ],
  },
  {
    key: 'cause', label: '명분·이해관계', icon: '🎯',
    ph: '왜 싸우는가(애국/복수/생존/명예) + 지면 무엇을 잃는가(걸린 것)…',
    questions: [
      '주인공/진영은 왜 싸우는가? (애국·복수·생존·명예·임무·환멸)',
      '싸움에서 지면 구체적으로 무엇을·누구를 잃는가? (부상·동료·시간·도덕·임무 실패)',
      '주인공이 둘 다 가질 수 없는 가치(대의 ↔ 사사로운 정) 사이에서 찢기는가?',
      '"왜 싸우는가"에 대한 작품의 입장은? (영웅적 카타르시스 ↔ 반전·환멸)',
      '전쟁물이라면 후방·민간인의 시점으로 대가를 비추는가? (§2 전쟁물 기대)',
    ],
  },
  {
    key: 'geography', label: '전장 지리', icon: '🧭',
    ph: '고지·엄폐물·출구·거리·시간제한 — 독자가 그릴 수 있는 행동의 공간(geography of action)…',
    questions: [
      '누가 어디에 있고, 출구·엄폐물·고지·거리는 어떻게 배치되는가? (§2 명료한 공간)',
      '이 지형이 만드는 유불리는? (고지 장악·살상지대·좁은 통로·도하 지점)',
      '시간·날씨·어둠 같은 환경 변수가 전투를 어떻게 바꾸는가?',
      '1막에 보여 둔 환경 요소(밸브·절벽·강물·지뢰밭)를 전투에서 회수할 곳은? (체호프의 무기)',
      '지리 설명을 전투 직전에 몰아넣어 추진력을 죽이지 않도록 분산했는가? (§4 인포덤프 경계)',
    ],
  },
  {
    key: 'power', label: '무력 체계·규칙', icon: '⚙️',
    ph: '강함·약점·자원의 규칙(탄약/내공/마나/쿨타임) — 카타르시스를 정당화하는 일관성…',
    questions: [
      '주인공·적의 무력은 어떤 규칙으로 작동하는가? (탄약·내공·스킬·쿨타임·경지)',
      '강자에게도 약점·파훼점·맹점이 분명한가? (역전을 정당화)',
      '능력 격차 사다리는? (주인공이 약한 지점 → 약점·도구·희생·각성으로 역전)',
      '새 힘이 갑자기 솟지 않도록(데우스 엑스 마키나 방지) 복선·수련으로 깔았는가?',
      '시그니처 기술·무기와 그 한계(봉인·대가·쿨타임)는 무엇인가? (§3 시그니처 무브)',
    ],
  },
  {
    key: 'cost', label: '자원·물리적 대가', icon: '🩹',
    ph: '부상·피로·탄약 소모·트라우마 — 무손상 승리의 반복을 막는 무게…',
    questions: [
      '승리에 따르는 물리적 대가는? (부상·피로·탄약/내공 소모·트라우마)',
      '부상·출혈·골절을 시간제한(부상 시계)으로 작동시킬 수 있는가?',
      '자원 고갈(마지막 한 발·한 줌의 내공·부서진 무기)을 어디서 역전의 발판으로 쓰는가?',
      '전쟁물이라면 병사가 "지고 다니는 것들"(편지·부적·시신·죄책감)은 무엇인가? (§3 무게의 물건)',
      '무손상 승리의 반복으로 긴장이 무너지지 않도록 대가를 분배했는가?',
    ],
  },
  {
    key: 'setpieces', label: '세트피스 사다리', icon: '💥',
    ph: '독립 설계된 대형 액션 단위 — 장소·제약·목표·합병증을 갖고 점점 커지는…',
    questions: [
      '주요 세트피스(공항 추격·다리 폭파·공성전 등)는 무엇인가? 각각의 장소·제약·목표·합병증은?',
      '세트피스가 작은 충돌 → 중간 보스 → 최종전으로 점층되는가? (규모·위험의 상승)',
      '각 세트피스가 앞의 것과 다른 고유한 문제를 던지는가? (액션의 평탄화 경계)',
      '거리의 변주(원거리 저격 → 중거리 총격 → 근접 격투)로 잔혹도·친밀도를 높이는가?',
      '준비·로드아웃(무장 점검·브리핑·규칙 정하기) 장면으로 긴장을 적재하는가? (§3 의식 몽타주)',
    ],
  },
  {
    key: 'clock', label: '시계장치·페이싱', icon: '⏱️',
    ph: '폭탄 타이머·증원 도착·인질 시한·만조 + 들숨-날숨 리듬·클리프행어…',
    questions: [
      '긴장을 조일 시계장치(카운트다운)는? (폭탄·증원·인질 시한·만조·일출)',
      '액션 폭발 → 짧은 호흡(부상 점검·농담·계획) → 더 큰 액션의 들숨-날숨 리듬을 설계했는가?',
      '거짓 안전지대(휴식 직후의 기습) 같은 페이싱 전환을 어디에 둘 것인가?',
      '문장 길이 = 속도계: 격렬 구간은 단문·동사 중심으로 갈 계획인가? (§4)',
      '웹소설이라면 회차 끝 클리프행어와 회차당 작은 사이다 1회를 배치했는가?',
    ],
  },
  {
    key: 'tactics', label: '전술·병참·정보', icon: '🧠',
    ph: '측면 우회·양동·각개격파·기만·보급선·첩보 — 머리로 이기는 승부의 정당성…',
    questions: [
      '수적 열세를 뒤집는 전술은? (측면 우회·양동·각개격파·제압 사격·거점 사수)',
      '병참·정보의 비대칭(보급선·첩보·기만)이 승패를 가르는 머리싸움 장치인가? (§3)',
      '승부가 운·우연이 아니라 머리·준비·희생·약점공략으로 정당하게 결판나는가? (§2 정당성)',
      '지휘부(전략)와 현장 병사(전술/생존)의 시점 교차로 "결정과 비용"을 함께 보이는가?',
      '희생적 후위(동료가 남아 막고 주인공을 보냄) 같은 감정 정점 장치는 어디에 있는가?',
    ],
  },
  {
    key: 'climax', label: '클라이맥스·대가', icon: '🏆',
    ph: '최강 빌런과의 최종 대결·최저점 직후 역전·복선 폭발·대가 있는 승리·여파…',
    questions: [
      '최종 대결은 누구와의 어떤 싸움인가? (규모는 가장 크되 초점은 가장 좁게)',
      '1~2막에 깔린 약점·환경·시그니처·동료의 선물이 클라이맥스에서 동시 발화하는가?',
      '주인공이 최저점(무장 해제·부상·아군 전멸) 직후 마지막 자원/의지로 역전하는가?',
      '승리에 영구적 대가(동료·신념·고향·자기 일부의 상실)가 따르는가? (Pyrrhic)',
      '설치한 시계가 마지막 순간에 멎고, 짧은 여파(부상 수습·전사자 호명·세계 변화)로 정산하는가?',
    ],
  },
] as const

interface WorldFields {
  arena: string; factions: string; cause: string; geography: string; power: string
  cost: string; setpieces: string; clock: string; tactics: string; climax: string
}
interface CustomItem { id: string; label: string; value: string }
interface World {
  id: string
  name: string          // 작품/세계 이름
  summary: string       // 한 줄 소개(로그라인)
  subgenre: string      // 하위 장르
  tone: string          // 톤 프리셋
  powerAxis: string     // 개인↔집단 무게
  fields: WorldFields
  custom: CustomItem[]  // 사용자 정의 항목(라벨 유지, 값은 사용자가 직접 입력)
  etc: string           // 고정 '기타' 자유 입력
  createdAt: number
  updatedAt: number
}

const emptyFields = (): WorldFields => ({
  arena: '', factions: '', cause: '', geography: '', power: '',
  cost: '', setpieces: '', clock: '', tactics: '', climax: '',
})

function makeWorld(name = ''): World {
  return {
    id: newId(), name, summary: '',
    subgenre: SUBGENRES[0].v, tone: TONE[0].v, powerAxis: POWER_AXIS[0].v,
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
        tone: typeof x.tone === 'string' ? x.tone : base.tone,
        powerAxis: typeof x.powerAxis === 'string' ? x.powerAxis : base.powerAxis,
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      } as World
    })
    const ids = new Set(worlds.map((w) => w.id))
    const activeId = typeof p?.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (worlds[0]?.id ?? null)
    return { worlds, activeId }
  } catch { return { worlds: [], activeId: null } }
}

// ───────────────────────── 액션·전쟁 어휘·클리셰 사전(도시에 §6, 카테고리/검색/무작위/복사) ─────────────────────────
const LEXICON: { cat: string; icon: string; items: string[] }[] = [
  { cat: '타격·속도(액션 동작)', icon: '⚡', items: ['파고들다', '비틀다', '꿰뚫다', '후려치다', '내리꽂다', '짓이기다', '스치다', '빗나가다', '급강하', '폭발적으로', '단숨에', '찰나', '순식간에', '흘려보내다', '되받아치다', '쳐 올리다', '갈겨쓰듯 휘두르다'] },
  { cat: '신체감각(전투 핍진성)', icon: '🫀', items: ['반동', '심장이 터질 듯', '폐가 타들어가다', '식은땀', '아드레날린', '시야가 좁아지다', '귀가 먹먹하다', '손끝 감각', '통증이 번지다', '근육이 비명을 지르다', '입안에 도는 쇠맛', '시간이 늘어지는 슬로모션', '숨이 가빠지다', '손이 떨리다'] },
  { cat: '소리·냄새(감각 신호어)', icon: '🔊', items: ['총성이 갈라지다', '금속이 맞부딪치다', '화약 냄새', '피비린내', '흙먼지', '살이 찢기는 소리', '정적', '탄피가 바닥에 떨어지는 소리', '포탄이 휘파람처럼 떨어지다', '엔진의 굉음', '비명과 고함이 뒤엉키다', '재장전의 철컥임', '연막이 자욱하다', '화염이 핥듯 번지다'] },
  { cat: '편제·계급(군사)', icon: '🪖', items: ['분대', '소대', '중대', '대대', '연대', '사단', '지휘관', '전령', '척후', '예비대', '돌격대', '후위', '본대', '선봉', '참모', '위생병', '통신병'] },
  { cat: '전술(작전 어휘)', icon: '🧭', items: ['측면 우회(flanking)', '포위 섬멸', '각개격파', '양동작전', '거점 사수', '후퇴/철수', '종심 방어', '제압 사격', '엄호', '돌격', '공성', '농성', '참호', '보급선', '병참', '정찰', '첩보', '기만', '매복', '돌파'] },
  { cat: '화기·장비', icon: '🔫', items: ['구경', '탄창', '약실', '재장전', '탄착', '조준선', '반동', '연발', '점사', '단발', '포격', '곡사', '직사', '근접신관', '백병전', '소염기', '거치총', '연막탄', '대전차', '제압 사격'] },
  { cat: '무협(초식·내공)', icon: '🗡️', items: ['내공', '진기', '운기(運氣)', '심법', '초식', '절기', '검기', '기파(氣波)', '점혈', '경공', '비무(比武)', '문파', '정파', '사파', '기연(奇緣)', '주화입마', '파훼점', '신법(身法)', '검로(劍路)', '내가중수법'] },
  { cat: '헌터·게임판타지', icon: '🎮', items: ['각성', '스킬', '쿨타임', '버프', '디버프', '탱커', '딜러', '힐러', '어그로', '게이트/균열', '레이드', '던전', '보스', '드롭', '재사용 대기', '광역기', '논타겟', '패턴', '페이즈', '서열(랭크)'] },
  { cat: '서사 장치(세트피스·시계)', icon: '🎬', items: ['세트피스(set-piece)', '시계장치(ticking clock)', '최후의 저항(last stand)', '수적 열세(outnumbered)', '능력 격차 사다리', '체호프의 무기', '로드아웃/브리핑', '시그니처 무브', '부상 시계', '거짓 안전지대', '마지막 한 발', '희생적 후위', '병참의 비대칭', '복선 회수'] },
]

const CLICHES: { trope: string; twist: string }[] = [
  { trope: '주인공만 끝내 무사하고 동료들이 차례로 쓰러진다', twist: '주인공이 살아남는 대신 그 책임을 평생 짊어지며, 다음 작전에서 가장 무모해진다' },
  { trope: '적이 한 명씩 차례로 덤벼 1대 다수가 1대 1의 연속이 된다', twist: '적이 처음부터 합을 맞춰 동시에 들어와, 주인공이 머리로 진형을 깨야만 한다' },
  { trope: '마지막 순간 갑자기 솟아난 새 힘(각성)으로 역전한다', twist: '새 힘은 1막부터 수련/복선으로 깔려 있었고, 발현의 대가로 몸이 망가진다' },
  { trope: '폭탄 타이머가 0:01에서 멈추며 가까스로 해체된다', twist: '타이머는 멈췄지만 그것은 진짜 폭탄이 아니라 시선을 끌기 위한 미끼였다' },
  { trope: '무한히 솟는 탄약·체력으로 다치지 않고 이긴다', twist: '탄약·체력이 명확히 유한해, 마지막 한 발을 어디에 쓰느냐가 결말을 가른다' },
  { trope: '강한 적이 약점 하나 없이 압도적으로 강하다', twist: '강함 자체가 약점이 되어, 그가 의존하는 무기·자존심·역린이 파훼점이 된다' },
  { trope: '"이게 마지막 임무야"라고 말한 베테랑이 죽는다', twist: '마지막 임무라던 베테랑이 살아남고, 그 대신 무사할 줄 알았던 신참이 진다' },
  { trope: '명령에 충실한 군인이 무조건 영웅으로 그려진다', twist: '맹목적 복종이 비극을 부르고, 명령을 어긴 자가 부하들을 살린다(반전·환멸)' },
  { trope: '적 지휘관은 잔인하기만 한 단순 악역이다', twist: '적 지휘관에게도 지켜야 할 부하·고향이 있어, 양쪽 모두에 공감하게 된다' },
  { trope: '클라이맥스에서 1대 1로 정정당당하게 맞붙는다', twist: '진짜 적은 눈앞의 빌런이 아니라, 둘을 싸우게 만든 아군 지휘부/체제였다' },
  { trope: '주인공이 무손상으로 깔끔하게 승리한다', twist: '이기되 동료·신념·고향 중 하나를 영구히 잃는 대가 있는 승리(Pyrrhic)로 끝낸다' },
  { trope: '쉴 틈 없이 액션만 몰아쳐 긴장을 극대화한다', twist: '액션 사이에 들숨(부상 점검·농담·계획)을 넣어, 다음 폭발이 더 크게 터지게 한다' },
  { trope: '전투 직전 지형·규칙을 길게 설명해 준비시킨다', twist: '설명을 전투에 녹여 흘리고, 독자가 싸우며 규칙을 깨닫게 해 추진력을 지킨다' },
  { trope: '동료의 희생적 후위가 비장하게 그려진다', twist: '남겨진 동료가 실은 살아 돌아와, 더 큰 함정/배신의 복선이 된다' },
]

// 슬롯 → 섹션 매핑(영감을 현재 작품 필드에 반영)
const SLOT_FIELD: Record<PoolKey, keyof WorldFields> = {
  무대: 'arena', 진영세력: 'factions', 명분: 'cause', 전장지리: 'geography', 무력규칙: 'power',
  자원대가: 'cost', 세트피스: 'setpieces', 시계장치: 'clock', 시그니처: 'power', 전술병참: 'tactics', 클라이맥스: 'climax',
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ActionWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
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
    const w = makeWorld(`새 액션·전쟁 세계 ${worlds.length + 1}`)
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

  // 사용자 정의 항목 — 추가/값변경/삭제 + 고정 '기타'
  const addCustom = () => {
    if (!active) { flash('먼저 작품을 선택하거나 만들어 주세요.'); return }
    const raw = window.prompt('추가할 항목 이름을 입력하세요. (예: 핵심 무기, 부대 별칭, 금기)')
    const label = (raw || '').trim()
    if (!label) return
    const item: CustomItem = { id: newId(), label, value: '' }
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: [...(w.custom || []), item], updatedAt: Date.now() } : w)) }))
  }
  const patchCustom = (cid: string, value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: (w.custom || []).map((c) => (c.id === cid ? { ...c, value } : c)), updatedAt: Date.now() } : w)) }))
  }
  const removeCustom = (cid: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, custom: (w.custom || []).filter((c) => c.id !== cid), updatedAt: Date.now() } : w)) }))
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
    const w = makeWorld(`새 액션·전쟁 세계 ${worlds.length + 1}`)
    // 무작위 생성 시 사용자 정의 '항목(이름)'은 유지하되 '값'은 비운다. '기타'도 빈 채로 시작.
    if (active && (active.custom || []).length) w.custom = active.custom.map((c) => ({ id: newId(), label: c.label, value: '' }))
    w.etc = ''
    w.summary = `${slots.무대}에서, ${slots.명분} ${josa(slots.진영세력, '이', '가')} ${slots.시계장치} 결판을 낸다`
    w.fields.arena = `무대: ${slots.무대}.`
    w.fields.factions = `진영·세력: ${slots.진영세력}.`
    w.fields.cause = `명분: ${slots.명분}.`
    w.fields.geography = `전장 지리: ${slots.전장지리}.`
    w.fields.power = `무력 규칙: ${slots.무력규칙}.\n시그니처: ${slots.시그니처}.`
    w.fields.cost = `자원·대가: ${slots.자원대가}.`
    w.fields.setpieces = `핵심 세트피스: ${slots.세트피스}.`
    w.fields.clock = `시계장치: ${slots.시계장치}.`
    w.fields.tactics = `전술·병참: ${slots.전술병참}.`
    w.fields.climax = `클라이맥스: ${slots.클라이맥스}.`
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setOpenGuide(null)
    flash('영감 슬롯으로 새 액션·전쟁 세계 초안을 만들었어요. 설계 질문에 답하며 채워 보세요.')
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
    L.push(`# ${w.name || '이름 없는 액션·전쟁 세계'}`)
    if (w.summary.trim()) L.push(w.summary.trim())
    L.push('', `· 하위 장르: ${w.subgenre}`, `· 톤: ${w.tone}`, `· 무력의 축: ${w.powerAxis}`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
    }
    for (const c of (w.custom || [])) {
      const v = (c.value || '').trim()
      const lab = (c.label || '').trim()
      if (lab && v) { L.push('', `## ${lab}`, v) }
    }
    const etc = (w.etc || '').trim()
    if (etc) { L.push('', '## 기타', etc) }
    return L.join('\n')
  }
  function buildHtml(w: World): string {
    const p: string[] = []
    if (w.summary.trim()) p.push(`<p><i>${esc(w.summary.trim())}</i></p>`)
    p.push(`<p><b>하위 장르</b>: ${esc(w.subgenre)}<br><b>톤</b>: ${esc(w.tone)}<br><b>무력의 축</b>: ${esc(w.powerAxis)}</p>`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(s.icon + ' ' + s.label)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    for (const c of (w.custom || [])) {
      const v = (c.value || '').trim()
      const lab = (c.label || '').trim()
      if (!lab || !v) continue
      p.push(`<p><b>${esc(lab)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    const etc = (w.etc || '').trim()
    if (etc) p.push(`<p><b>${esc('기타')}</b><br>${esc(etc).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
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
    const title = (w.name || '이름 없는 액션·전쟁 세계').trim()
    const character: Record<string, string> = {
      name: title, 하위장르: w.subgenre, 톤: w.tone, 무력의축: w.powerAxis,
    }
    for (const s of SECTIONS) { const v = (w.fields[s.key] || '').trim(); if (v) character[s.label] = v }
    // 정규(장소) 키를 character 레코드에 "추가" — 받는 허브가 기본 칸에 제자리로 채우도록(기존 한글 키는 유지).
    const setPF = (k: string, v?: string) => { const t = (v || '').trim(); if (t && !character[k]) character[k] = t }
    setPF('name', title)
    setPF('kind', '액션·전쟁 무대·세계관')
    setPF('atmosphere', w.summary.trim() || `${w.subgenre} · ${w.tone}`)
    setPF('geography', w.fields.geography)            // 전장 지리 → geography
    setPF('rules', w.fields.power)                    // 무력 체계·규칙 → rules
    setPF('history', w.fields.cause)                  // 명분·이해관계 → history
    setPF('inhabitants', w.fields.factions)           // 진영·세력 → inhabitants
    setPF('dangers', [w.fields.cost, w.fields.clock].map((s) => (s || '').trim()).filter(Boolean).join('\n'))  // 대가·시계장치 → dangers
    setPF('landmarks', w.fields.setpieces)            // 세트피스 사다리 → landmarks
    setPF('secrets', w.fields.tactics)                // 전술·병참·정보 → secrets
    setPF('notes', [w.fields.arena, w.fields.climax].map((s) => (s || '').trim()).filter(Boolean).join('\n\n') || w.summary.trim())  // 무대·클라이맥스 → notes
    // 사용자 정의 항목(라벨=키, 값 있을 때만) + 기타 → 인물 시트·갤러리 등에 그대로 노출
    for (const c of (w.custom || [])) { const lab = (c.label || '').trim(); const v = (c.value || '').trim(); if (lab && v && !character[lab]) character[lab] = v }
    { const e = (w.etc || '').trim(); if (e && !character.etc) character.etc = e }
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '세계관', title, icon: '⚔️',
      synopsis: w.summary.trim() || `${w.subgenre} · ${w.tone}`,
      bodyHtml: buildHtml(w), character,
      meta: { 유형: '액션·전쟁 세계관', 하위장르: w.subgenre, 톤: w.tone, '채운 항목': `${filledCount(w)}/${SECTIONS.length}` },
    })
    flash(id ? `‘${title}’을(를) 프로젝트 ‘자료 › 세계관’에 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 공유 라이브러리(장소)로 추가 — 배경 설정집 등과 연계
  const toLibrary = (w: World) => {
    const title = (w.name || '이름 없는 액션·전쟁 세계').trim()
    // 정규(장소) fields — 받는 허브(배경 설정집)의 기본 칸에 제자리로 들어가도록 표준 키로 매핑.
    const placeFields: Record<string, string> = {}
    const setPF = (k: string, v?: string) => { const t = (v || '').trim(); if (t) placeFields[k] = t }
    setPF('name', title)
    setPF('kind', '액션·전쟁 무대·세계관')
    setPF('atmosphere', w.summary.trim() || `${w.subgenre} · ${w.tone}`)
    setPF('geography', w.fields.geography)            // 전장 지리 → geography
    setPF('rules', w.fields.power)                    // 무력 체계·규칙 → rules
    setPF('history', w.fields.cause)                  // 명분·이해관계 → history(배경/유래)
    setPF('inhabitants', w.fields.factions)           // 진영·세력 → inhabitants(거주/세력)
    setPF('dangers', [w.fields.cost, w.fields.clock].map((s) => (s || '').trim()).filter(Boolean).join('\n'))  // 대가·시계장치 → dangers(위험)
    setPF('landmarks', w.fields.setpieces)            // 세트피스 사다리 → landmarks(주요 무대)
    setPF('secrets', w.fields.tactics)                // 전술·병참·정보 → secrets(숨은 수)
    setPF('notes', [w.fields.arena, w.fields.climax].map((s) => (s || '').trim()).filter(Boolean).join('\n\n') || w.summary.trim())  // 무대·클라이맥스 → notes
    // 사용자 정의 항목(라벨=키, 값 있을 때만) + 기타 → 배경 설정집 등에 그대로 노출
    for (const c of (w.custom || [])) { const lab = (c.label || '').trim(); const v = (c.value || '').trim(); if (lab && v && !placeFields[lab]) placeFields[lab] = v }
    { const e = (w.etc || '').trim(); if (e && !placeFields.etc) placeFields.etc = e }
    addToLibrary('places', {
      name: title, kind: '액션·전쟁 무대·세계관', mood: w.summary.trim() || w.subgenre,
      history: (w.fields.cause || '').trim() || undefined,
      rules: [`무력 체계·규칙`, (w.fields.power || '').trim(), `전장 지리`, (w.fields.geography || '').trim()].filter(Boolean).join('\n') || undefined,
      sensory: (w.fields.setpieces || '').trim() || undefined,
      notes: buildText(w), source: '액션·전쟁 세계관 빌더',
      fields: placeFields,
    })
    flash(`‘${title}’을(를) 공유 라이브러리(장소)에 저장했어요. 배경 설정집 등에서 불러올 수 있어요.`)
  }

  // 글감 스니펫으로 — 로그라인/요약을 영감 메모로
  const toSnippet = (w: World) => {
    const text = w.summary.trim() || buildText(w)
    addToLibrary('snippets', { text, source: '액션·전쟁 세계관 빌더', tags: ['액션·전쟁', '세계관', w.subgenre.split(' ')[0]] })
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
        <div style={C.title}><span aria-hidden><Emoji e="⚔️" /></span> 액션·전쟁 세계관 빌더</div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>액션·전쟁</span>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{worlds.length}개 작품</span>
        <button className="minibtn" onClick={() => setShowRef((v) => !v)} title="액션·전쟁 어휘·클리셰 사전 열기">{showRef ? <><Emoji e="📖" /> 사전 닫기</> : <><Emoji e="📖" /> 사전</>}</button>
        <button className="minibtn" onClick={() => openToolLinked('action-lexicon', { genre: '액션·전쟁' })} title="액션·전쟁 어휘 사전 열기"><Emoji e="📚" /> 어휘 사전</button>
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
                      <Emoji e="⚔️" /> {w.name || '(이름 없는 액션·전쟁 세계)'}
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
                <div style={C.secTitle}><span aria-hidden><Emoji e="📖" /></span> 액션·전쟁 어휘·클리셰 사전</div>
                <div style={C.spacer} />
                <button className={refTab === 'lex' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('lex')}>액션·전쟁 어휘</button>
                <button className={refTab === 'cliche' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('cliche')}>클리셰·변주</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...C.input, flex: 1 }} value={refQuery} onChange={(e) => setRefQuery(e.target.value)} placeholder="🔍 사전 검색" aria-label="사전 검색" />
                {refTab === 'lex' ? (
                  <button className="minibtn" onClick={() => { const all = LEXICON.flatMap((g) => g.items); const v = pick(all); copyText(v, `‘${v}’ 복사됨`) }} title="무작위 어휘 복사"><Emoji e="🎲" /> 무작위</button>
                ) : (
                  <button className="minibtn" onClick={() => { const c = pick(CLICHES); copyText(`${c.trope}\n→ 변주: ${c.twist}`, '무작위 클리셰를 복사했어요') }} title="무작위 클리셰 복사"><Emoji e="🎲" /> 무작위</button>
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
                        <span style={C.secTitle}><Emoji e={g.icon} /> {g.cat}</span>
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
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>흔한 액션·전쟁 클리셰 ↔ 비트는 변주(도시에 §6). 항목을 누르면 복사됩니다.</div>
                    {clicheFiltered.map((c, i) => (
                      <div key={i} style={{ ...C.panel, cursor: 'pointer' }} onClick={() => copyText(`${c.trope}\n→ 변주: ${c.twist}`, '복사됨')} title="클릭하면 복사돼요">
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}><Emoji e="🔁" /> {emojify(c.trope)}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.55 }}>↳ 변주: {emojify(c.twist)}</div>
                      </div>
                    ))}
                  </>
                )
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>상단 ‘<Emoji e="📖" /> 사전 닫기’를 누르면 작품 편집으로 돌아갑니다.</div>
            </div>
          ) : !active ? (
            <div style={C.body}>
              <div style={C.empty}>
                <div style={{ fontSize: 34 }} aria-hidden><Emoji e="⚔️" /></div>
                <div>
                  액션·전쟁 한 편의 세계를 무대·진영·명분·전장 지리·무력 규칙·대가·세트피스·시계장치·전술·클라이맥스까지<br />
                  설계 질문을 따라 또렷하게 빚어 보세요.<br />
                  <b>+ 새 작품</b>으로 시작하거나, 아래 <strong style={{ color: 'var(--accent)' }}>액션·전쟁 영감 생성기</strong>로 초안을 굴려 보세요.
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
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 고지 ‘734’ — 마지막 한 발" maxLength={80} aria-label="작품 이름" />
                  </div>
                  <div>
                    <label style={C.label}>한 줄 소개 (로그라인)</label>
                    <input style={C.input} value={active.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="이 액션·전쟁을 한 문장으로… 예: 증원이 끊긴 국경 전초기지에서, 탄약 한 줌의 분대가 해가 뜨기 전까지 고지를 지킨다" maxLength={160} aria-label="한 줄 소개" />
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
                      <label style={C.label}>톤 (카타르시스 ↔ 비극)</label>
                      <select style={C.select} value={active.tone} onChange={(e) => patch({ tone: e.target.value })}>
                        {TONE.map((m) => <option key={m.v} value={m.v}>{m.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{TONE.find((m) => m.v === active.tone)?.d}</div>
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>무력의 축 (개인 무력 ↔ 집단 전략)</label>
                    <select style={C.select} value={active.powerAxis} onChange={(e) => patch({ powerAxis: e.target.value })}>
                      {POWER_AXIS.map((t) => <option key={t.v} value={t.v}>{t.v}</option>)}
                    </select>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{POWER_AXIS.find((t) => t.v === active.powerAxis)?.d}</div>
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
                        <span style={C.secTitle}><Emoji e={s.icon} /> {s.label}</span>
                        {val.trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                        <span style={C.spacer} />
                        <button
                          style={{ ...C.tinyBtn, color: guideOpen ? 'var(--accent)' : 'var(--muted)', borderColor: guideOpen ? 'var(--accent)' : 'var(--border)' }}
                          onClick={() => setOpenGuide(guideOpen ? null : s.key)}
                          title="이 항목을 채우는 설계 질문 보기"
                        ><Emoji e="💡" /> 설계 질문 {guideOpen ? '▲' : '▼'}</button>
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
                    <span style={C.secTitle}><span aria-hidden><Emoji e="🧩" /></span> 사용자 정의 항목</span>
                    <span style={C.spacer} />
                    <button className="minibtn" onClick={addCustom} title="이름을 정해 빈 항목을 추가합니다(내용은 직접 작성)">＋ 항목 추가</button>
                  </div>
                  {(active.custom || []).length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      기본 항목에 없는 나만의 항목을 더할 수 있어요. <b>＋ 항목 추가</b>로 이름을 정하고 직접 채워 보세요.
                    </div>
                  ) : (
                    (active.custom || []).map((c) => (
                      <div key={c.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={C.label as React.CSSProperties}>{c.label ? emojify(c.label) : '(이름 없음)'}</span>
                          <span style={C.spacer} />
                          <button style={C.tinyBtn} onClick={() => removeCustom(c.id)} title="이 항목 삭제" aria-label={`${c.label} 삭제`}>✕</button>
                        </div>
                        <textarea
                          style={C.textarea}
                          value={c.value}
                          onChange={(e) => patchCustom(c.id, e.target.value)}
                          placeholder={`‘${c.label}’ 내용을 직접 적어 보세요…`}
                          aria-label={c.label || '사용자 정의 항목'}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* 고정 '기타' 자유 입력 */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={C.secTitle}><span aria-hidden><Emoji e="🗒️" /></span> 기타</span>
                    {(active.etc || '').trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                  </div>
                  <textarea
                    style={{ ...C.textarea, minHeight: 96 }}
                    value={active.etc}
                    onChange={(e) => patchEtc(e.target.value)}
                    placeholder="어느 항목에도 들어가지 않는 메모·자유 설정을 마음껏 적어 두세요…"
                    aria-label="기타"
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>모든 변경은 이 브라우저에 자동 저장됩니다. 수정 {fmtDate(active.updatedAt)}</div>

                {/* 영감 생성기 */}
                <Inspiration />
              </div>

              <div style={C.editBar}>
                <button className="minibtn" onClick={() => copyText(buildText(active), '이 작품을 복사했어요')}><Emoji e="📋" /> 복사</button>
                <button className="linkbtn" onClick={() => toProject(active)} disabled={!linked} title={linked ? '이 작품을 프로젝트 자료(세계관)에 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 프로젝트에 추가</button>
                <button className="minibtn" onClick={() => toLibrary(active)} title="공유 라이브러리(장소)에 저장해 배경 설정집 등에서 활용"><Emoji e="🗂️" /> 라이브러리에 저장</button>
                <button className="minibtn" onClick={() => toSnippet(active)} title="한 줄 소개를 글감 스니펫으로 저장"><Emoji e="📝" /> 글감으로</button>
                <button className="minibtn" onClick={() => openToolLinked('action-settingforge', { genre: '액션·전쟁', name: active.name })} title="액션·전쟁 배경 생성기 열기"><Emoji e="🗺️" /> 무대 만들기</button>
                <button className="minibtn" onClick={() => openToolLinked('action-sceneforge', { genre: '액션·전쟁', name: active.name })} title="액션·전쟁 장면 생성기 열기"><Emoji e="🎬" /> 장면 만들기</button>
                <button className="minibtn" onClick={() => openToolLinked('setting-bible', { genre: '액션·전쟁', name: active.name })} title="배경 설정집 열기"><Emoji e="📚" /> 배경 설정집</button>
                <div style={C.spacer} />
                {confirmDel === active.id ? (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--warn)', marginRight: 4 }}>삭제할까요?</span>
                    <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                    <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeWorld(active.id)}>삭제 확정</button>
                  </>
                ) : (
                  <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(active.id)}><Emoji e="🗑️" /> 삭제</button>
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
          <div style={C.secTitle}><span aria-hidden><Emoji e="🎲" /></span> 액션·전쟁 영감 생성기</div>
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
                <span style={{ fontSize: 11 }} aria-hidden>{locks[k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</span>
                <div style={C.spacer} />
                <button
                  className="minibtn"
                  style={{ padding: '1px 6px', fontSize: 10.5 }}
                  onClick={(e) => { e.stopPropagation(); appendSlotToActive(k) }}
                  title="이 항목을 현재 작품의 해당 필드에 반영"
                >＋</button>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all' }}>{slots[k]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={roll}><Emoji e="🎲" /> 재생성</button>
          <button className="minibtn" onClick={applyInspiration}>이 조합으로 새 작품 만들기</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); copyText(t, '영감 조합을 복사했어요') }}><Emoji e="📋" /> 조합 복사</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); addToLibrary('snippets', { text: t, source: '액션·전쟁 세계관 빌더', tags: ['액션·전쟁', '영감'] }); flash('영감 조합을 글감 스니펫으로 저장했어요.') }}><Emoji e="📝" /> 글감으로</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 눌러 잠그면 재생성에서 제외돼요.</span>
        </div>
      </div>
    )
  }
}
