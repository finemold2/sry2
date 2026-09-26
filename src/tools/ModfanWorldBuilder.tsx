// 현대판타지·회귀 세계관 빌더 (현대판타지·회귀 / 세계관) — 도시에(dossier)에 근거해
//  "미래 지식을 가진 회귀자가 현대 사회 시스템 안에서 두 번째 인생을 사는" 세계 한 편을 항목별로 구조화하는 설정 빌더.
//  설계 축(도시에 §4 서사 장치 · §8 배경/세계관 요소 · §1 정보 비대칭=무기):
//    시간 좌표 → 회귀 트리거/시점 → 메타지식 원장 → 현실 시스템(무대) → 헌터/시스템(혼합형) → 세력 지도
//    → 두 타임라인(원래 미래↔새 미래) → 회귀자 인식/정보전 → 전생 청산(빌런) → 정서축(두 번 사는 자) → 명명·디테일 → 서사 장치.
//  각 섹션마다 도시에에 뿌리내린 "설계 질문"을 두어 빈칸을 메우게 하고, 슬롯 풀 무작위 영감(잠금/재생성, 조합수 표시 — 1조 이상).
//  사전류(어휘/클리셰): 카테고리 펼침 + 검색 + 무작위 + 클릭복사.
//  모든 데이터는 localStorage('sry:tool:modfan-worldbuilder')에 JSON 자동 저장/복원. 언마운트 정리.
//  연계: addToProject(kind:text, root:research, folder:'세계관') · hasProjectBridge · addToLibrary('places'|'snippets') · openToolLinked.
//  import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-worldbuilder',
  name: '현판·회귀 세계관 빌더',
  icon: '⏳',
  group: '세계관',
  genre: '현대판타지·회귀',
  intro: '회귀 시점·메타지식·현실 시스템·세력 지도·두 타임라인까지 현대판타지 회귀물의 세계 한 편을 설계하는 빌더',
  w: 800,
  h: 670,
}

const LS_KEY = 'sry:tool:modfan-worldbuilder'

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s: string) => s.trim().toLowerCase()
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// 한국어 조사 자동 선택(앞 글자 받침 유무로 실제 하나를 골라 출력 — 괄호 이중표기 금지)
function hasBatchim(s: string): boolean {
  const ch = (s || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (code - 0xac00) % 28 !== 0
}
// 을/를·이/가·은/는·과/와·으로/로 — 단어 뒤에 알맞은 조사를 붙여 반환
function josa(word: string, kind: '을를' | '이가' | '은는' | '과와' | '으로로'): string {
  const w = (word || '').trim()
  const b = hasBatchim(w)
  // ㄹ 받침은 '으로'가 아니라 '로'를 쓴다
  const lRieul = (() => { const ch = w.slice(-1); const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8 })()
  switch (kind) {
    case '을를': return w + (b ? '을' : '를')
    case '이가': return w + (b ? '이' : '가')
    case '은는': return w + (b ? '은' : '는')
    case '과와': return w + (b ? '과' : '와')
    case '으로로': return w + (b && !lRieul ? '으로' : '로')
  }
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

// ───────────────────────── 선택형 축(도시에 §1 좌표, §4 메타지식 분류, §8 무대) ─────────────────────────
// 하위 직업·무대 클러스터(도시에 §1: 현대 직업+회귀 조합으로 무한 파생)
const ARENAS = [
  { v: '경제·재벌물 (주식·투자·기업)', d: '미래 종목·코인·IPO·M&A를 선점해 자본을 굴린다. 「재벌집 막내아들」 결. 종잣돈→상장→인수.' },
  { v: '헌터·게이트물 (각성·던전)', d: '현대에 게이트·던전·마수가 열린 세계. 시스템 창·등급(S/EX)·헌터협회·길드 뼈대.' },
  { v: '연예계물 (아이돌·배우·기획사)', d: '데뷔조·연습생·음원 차트·역주행. 미래의 히트곡/스타를 선점하는 콘텐츠 메타지식형.' },
  { v: '창작자물 (작가·웹툰·게임 개발)', d: '미래에 대박 날 시나리오·웹툰·게임을 본인이 먼저 만든다. 콘텐츠 선점형.' },
  { v: '스포츠·프로게이머물', d: '미래의 전술·메타·선수를 알고 리그를 제패. 구단주·감독·선수 시점 변주.' },
  { v: '전문직물 (의사·요리사·변호사 등)', d: '직업 전문성 + 미래지식. 업계 절차·용어의 사실 디테일이 우위를 빛나게 한다.' },
  { v: '복합형 (현실 + 게이트 이중 세계)', d: '평범한 일상과 게이트가 공존하는 "각성 이후의 현대". 일상물+헌터물 동시 운용.' },
] as const

// 회귀 시점의 무게(도시에 §3: "왜 하필 그 시점인가"가 의미 있어야)
const REGRESSION_TYPE = [
  { v: '단순 회귀 (본인의 과거로)', d: '본인이 본인의 과거 시점으로 기억을 안고 돌아간다. 가장 정통. 환생/빙의와 구별.' },
  { v: '루프형 회귀 (반복 되감기)', d: 'Re:제로식. 죽거나 실패하면 특정 시점으로 반복 귀환. 시행착오·예지 누적이 무기.' },
  { v: '메타지식형 (예지·세계관 지식)', d: '회귀는 아니나 미래를 안다(전독시식). "미래를 아는 자의 우위"라는 핵심 쾌감 공유.' },
  { v: '중생(重生)형 (중국 도시현대문)', d: '도시 능력자/연예/재벌 중생물. 한국 현판 회귀와 거의 동형의 결.' },
  { v: '회귀자 다수 (회귀자 간 정보전)', d: '주인공 외에도 회귀자/예지자가 존재. 후반 빌런 설계·정보전의 무대.' },
] as const

// 메타지식이 더 이상 안 통하는 시점(도시에 §4 나비효과·메타지식 무효화)
const DIVERGENCE = [
  '주인공의 개입으로 1막부터 미래가 미세하게 어긋나기 시작',
  '2막 중반, 큰 분기를 바꾼 뒤 "아는 미래"가 절반쯤 무효화',
  '3막 진입에서 메타지식이 거의 통하지 않는 진짜 위기로 전환',
  '적도 회귀자/예지자라 미래 정보가 양방향으로 무효화',
  '거의 안 변함 — 정해진 비극을 막으려는 발버둥이 동력',
] as const

// ───────────────────────── 무작위 영감 슬롯 풀(도시에 §4·§7·§8 근거 자작) ─────────────────────────
// 조합수 = 모든 풀 길이의 곱. 각 슬롯은 서로 독립(다른 슬롯을 전제하지 않는 명사/명사구)이라
// 곱집합으로 섞여도 의미 충돌이 없다. 14개 슬롯 × 풀 크기로 수십조 가지를 지향(핵심 생성기).
const POOLS = {
  회귀트리거: ['믿었던 동료의 배신으로 옥상에서 떠밀려', '대출 빚에 짓눌려 한강에서 스스로', '게이트 보스 레이드에서 미끼로 버려져', '데뷔 직전 사고로 무대 한 번 못 밟고', '암 선고를 받고 병실에서 후회만 곱씹다', '회사에 모든 걸 바쳤으나 토사구팽당해', '가족을 지키지 못하고 눈앞에서 잃은 채', '투자 사기로 전 재산을 날리고 노숙하다', '내부고발 보복으로 누명을 쓰고 감옥에서', '전쟁 같은 게이트 대범람에 휩쓸려'],
  회귀시점: ['수능 100일 전 고3 교실', '대학 신입생 OT 전날 자취방', '첫 입사 면접을 앞둔 새벽', '게이트가 처음 열리기 1년 전', '연습생 오디션 전날 밤', '부모님이 아직 살아계신 10년 전', '코인·주식 대폭락 직전의 그 해', '망하기 직전 회사의 입사 첫날', '데뷔조 발표 일주일 전', '거대 사건이 터지기 사흘 전'],
  메타지식: ['몇 년 몇 월에 떡상할 종목·코인 목록', '대형 게이트 출현일과 등급·공략법', '미래에 대박 날 노래·시나리오·웹툰', '누가 떡잎 천재이고 누가 배신자인지', '특정 인물의 약점·범죄·미래 행적', '곧 터질 경제 위기·자연재해의 날짜', '저평가된 부동산·인재·기술 목록', '망할 회사와 흥할 회사의 명운', '아직 무명인 미래의 거물 스타', '회사·길드 내부의 숨은 음모와 결말'],
  첫행동: ['전 재산을 한 종목에 몰아 종잣돈 마련', '미래의 스타를 무명일 때 미리 포섭', '저점의 부동산·기술을 헐값에 선점', '데뷔 직전 망할 기획사를 피해 이적', '곧 열릴 게이트 앞에 미리 자리 잡기', '미래의 히트곡을 먼저 발표·등록', '배신자가 될 인물을 초반에 손절', '면접에서 미래 트렌드로 단번에 합격', '내부고발 증거를 미리 확보해 보험으로', '가족의 병·사고를 미리 막아 살려내기'],
  현실무대: ['상장·공시·작전세력이 도는 주식시장', '연습생·데뷔조·음원 차트의 기획사 생태계', '게이트·던전·헌터협회·길드의 각성 사회', 'IPO·인수합병이 오가는 스타트업 판', '시청률·캐스팅이 갈리는 방송·드라마판', '판호·과금 메타가 좌우하는 게임 업계', '이적·연봉·메타가 도는 프로 스포츠 리그', '판결·로펌·여론이 얽히는 법조계', '레지던트·수술방·논문이 도는 의료계', '조회수·연재·계약이 도는 웹소설·웹툰판'],
  성장지표: ['통장 잔고와 보유 자산 평가액', '헌터 등급(F~SSS)과 협회 랭킹', '음원 차트 순위와 팬덤 규모', '구독자·조회수·연재 순위', '소속·직급과 사내 영향력', '리그 순위와 개인 기록', '레벨·스탯·스킬 수치(시스템 창)', '인지도·평판·언론 노출도', '세력(길드·기획사·구단) 규모', '복수 체크리스트의 달성 개수'],
  세력블록: ['대를 잇는 재벌 가문과 후계 다툼', '국가를 대신하는 거대 헌터 길드', '데뷔를 좌우하는 3대 대형 기획사', '판을 쥔 거대 IT·플랫폼 기업', '각성자를 통제하는 헌터협회·정부', '검은돈을 굴리는 작전세력·사채', '리그를 지배하는 명문 구단·에이전시', '여론을 만드는 언론·연예 권력', '국제 무대의 외국 길드·자본', '뒤에서 세계를 조율하는 비밀 결사'],
  전생원수: ['나를 떠민 절친했던 동료', '토사구팽한 회사 오너 일가', '데뷔를 짓밟은 기획사 실세', '미끼로 버린 길드 마스터', '가족을 해친 진범과 그 배후', '투자 사기를 친 멘토 행세의 사기꾼', '누명을 씌운 직속 상관', '판을 조작한 작전세력의 큰손', '재능을 가로챈 동기·라이벌', '세계를 망친 또 다른 회귀자'],
  정서축: ['아직 살아 있는 부모님을 다시 지키기', '못 지킨 동생·친구를 이번엔 구하기', '버린 적 있는 옛 연인과의 재회', '가난했던 가족에게 못 해준 효도', '죽은 동료를 살릴 단 한 번의 기회', '망가진 자신을 회복시킬 두 번째 인생', '못 이룬 꿈(데뷔·우승·완성)을 끝내 이루기', '전생의 죄책감을 청산할 속죄의 길', '믿음을 배신당한 상처의 치유', '평범하고 안온한 일상의 회복'],
  은폐위장: ['타고난 천재성·신동으로 둘러대기', '예지력·직감이 좋다는 평판으로 위장', '운이 미친 듯이 좋은 사람으로 포장', '정보력·인맥이 넓은 사람인 척', '데이터·분석에 강한 전문가 행세', '우연을 가장한 치밀한 사전 준비', '실력을 일부러 숨겼다가 결정적 순간 폭발', '소문난 괴짜·은둔 고수 컨셉', '미래를 본 적 있다는 농담으로 진실 흘리기', '아무에게도 회귀를 들키지 않는 완전 은폐'],
  다가올사건: ['전국을 뒤흔들 대형 게이트 범람', '한 시대를 끝내는 경제 대폭락', '판도를 바꿀 신기술·플랫폼의 등장', '거대 기획사·구단의 몰락과 재편', '예정된 가족·동료의 죽음(막아야 할 비극)', '전생에서 세계를 멸망시킨 근원 빌런의 부상', '국제 무대를 여는 세계 규모 대회', '내부 음모가 터지는 거대 스캔들', '회귀자들이 모여드는 운명의 분기점', '아무도 모르는 재앙의 카운트다운'],
  분위기: ['막힘없는 통쾌한 사이다 성공담', '치밀한 정보전과 두뇌 싸움', '따뜻하고 뭉클한 가족·인연의 회복', '냉혹한 비즈니스·권력의 암투', '손에 땀 쥐는 생존형 헌터 액션', '유쾌하고 능청스러운 천재의 활극', '쓸쓸한 회한이 깔린 두 번째 인생', '정의 구현·응징의 복수극', '디테일이 살아 있는 전문직 프로페셔널물', '운명을 거스르는 비장한 분투', '냉소를 감춘 다크 히어로의 음지 활약', '잔잔한 성장과 힐링이 어우러진 슬로 라이프'],
  // 회귀자 곁의 핵심 조력자(명사구, 독립 슬롯 — 다른 슬롯을 전제하지 않음)
  조력자: ['전생을 함께한 유일한 생존 동료', '회귀 전부터 주인공을 믿어 준 가족', '재능을 알아본 깐깐한 업계 멘토', '정보망을 쥔 발 넓은 정보상', '뒷일을 처리해 주는 충직한 해결사', '자금을 대주는 은밀한 큰손 후원자', '나란히 성장하는 라이벌 겸 동료', '주인공의 정체를 눈치챈 비밀 협력자', '약점을 메워 주는 천재 기술자·참모', '세상 물정에 밝은 인생 2회차 선배 회귀자'],
  // 이야기를 뒤집는 반전 장치(명사구, 독립 슬롯 — 종결문이 아닌 명사형으로 통일)
  반전장치: ['믿었던 조력자의 숨겨진 두 얼굴', '주인공만 모르던 또 하나의 회귀자', '메타지식이 통하지 않는 미지의 변수', '전생의 기억 속 빠져 있던 진실 한 조각', '죽은 줄 알았던 인물의 은밀한 생존', '원수가 사실은 누군가의 희생양이었다는 사연', '주인공의 개입이 부른 예상 밖의 나비효과', '세계의 규칙 자체를 뒤흔드는 숨은 설정', '아군 진영에 심어진 적의 첩자', '두 번째 삶조차 누군가의 각본이었다는 의혹'],
} as const
type PoolKey = keyof typeof POOLS

const COMBO_COUNT = (Object.keys(POOLS) as PoolKey[]).reduce((acc, k) => acc * POOLS[k].length, 1)

// ───────────────────────── 섹션 정의 + 설계 질문(도시에 근거) ─────────────────────────
interface SectionDef { key: keyof WorldFields; label: string; icon: string; ph: string; questions: string[] }
const SECTIONS: SectionDef[] = [
  {
    key: 'timeline', label: '시간 좌표·연표', icon: '📅',
    ph: '구체 연도(20○○년 ○월), 전생의 "원래 미래" 주요 사건과 날짜, 회귀 후 현재 시점…',
    questions: [
      '회귀 후 현재는 정확히 몇 년 몇 월인가? (구체 연도가 미래지식의 리얼리티 핵심)',
      '전생에서 실제로 벌어진 "원래 미래"의 핵심 사건들과 그 날짜는?',
      '실명·실제기업을 쓸 것인가, 변형·가공해 법적 함정을 피할 것인가?',
      '미래의 트렌드·기술·사건을 어디까지 사실처럼 모사할 것인가?',
      '독자에게 "지금이 어느 시점인지"를 1화에서 어떻게 못 박을 것인가?',
    ],
  },
  {
    key: 'trigger', label: '회귀 트리거·시점', icon: '⏳',
    ph: '주인공은 어떻게(배신·자살·전사·병사) 죽고, 왜 하필 그 시점으로 돌아왔는가…',
    questions: [
      '회귀 트리거(죽음의 순간)는 무엇인가? (배신·자살·전사·병사) 어떤 후회·각오를 남겼나?',
      '왜 하필 그 시점인가? 중요한 분기 직전이라는 서사적 의미가 있는가?',
      '회귀 자각의 첫 장면을 어떻게 연출할 것인가? ("익숙한 천장이다" 류 클리셰 활용/비틀기)',
      '1화 안에 [회귀 자각 → 첫 미래지식 행사 → 작은 승리]를 어떻게 압축할 것인가?',
      '회귀한 몸의 상태(젊어진 몸·잃었던 것)를 어떻게 자각시킬 것인가?',
    ],
  },
  {
    key: 'meta', label: '메타지식 원장', icon: '🔮',
    ph: '주인공이 아는 미래 정보의 목록 — 거시 이벤트·인물 정보·콘텐츠 메타…',
    questions: [
      '거시 이벤트 지식: 경제 위기·코인/주가·자연재해·게이트 출현일/등급은?',
      '인물 정보: 누가 배신자이고 누가 떡잎 천재이며, 누구의 약점·범죄·미래 성공을 아는가?',
      '콘텐츠 메타(연예/작가물): 어떤 노래·시나리오·웹툰·게임이 대박날지 알고 선점하는가?',
      '미래지식의 "한계"는 무엇인가? (날짜만 알고 디테일은 모름 / 세부가 흐릿함 등)',
      '회귀 직후 할 일 목록(체크리스트)은? ①가족 ②응징 ③선점 종목… 챕터 단위 추진력으로.',
    ],
  },
  {
    key: 'arena', label: '현실 시스템·무대', icon: '🏙️',
    ph: '주식시장·연예계·헌터협회·리그·기업 등 "현실 규칙"의 절차·용어·성공 경로…',
    questions: [
      '주 무대(주식·연예·헌터·스포츠·기업…)의 규칙·절차·용어는 어떻게 굴러가는가?',
      '그 판에서 "성공의 사다리"는 어떤 단계인가? (종잣돈→상장 / 연습생→데뷔→차트 등)',
      '미래지식이 그 규칙 위에서 어떻게 결정적 우위로 작동하는가?',
      '업계 디테일(실제 절차·은어·관행)을 얼마나 정확히 깔 것인가?',
      '독자가 "이 판을 이해했다"고 느끼게 할 핵심 개념 3가지는?',
    ],
  },
  {
    key: 'system', label: '헌터·시스템 (혼합형)', icon: '⚔️',
    ph: '(헌터/게임 혼합 시) 각성·게이트·던전·마수·등급·시스템 창·길드·협회 구조…',
    questions: [
      '게이트·던전·마수가 있는가? 언제, 어떻게 현대에 출현했는가?',
      '시스템 창·레벨·스탯·스킬·퀘스트로 성장을 수치화하는가? 규칙은?',
      '등급 체계(F~SSS·EX급)와 헌터협회·길드의 권력 구조는?',
      '주인공의 각성 능력·재능은 무엇이며 "한계·대가"는 무엇인가? (치트만으로 끝내지 않기)',
      '평범한 일상과 게이트가 어떻게 공존하는가? (이중 세계의 결)',
    ],
  },
  {
    key: 'powers', label: '세력 지도·권력 블록', icon: '🏛️',
    ph: '가문·기업·길드·기획사·구단 등 권력 블록과 그 흥망 타임라인(미래지식의 무대표)…',
    questions: [
      '판을 쥔 권력 블록(재벌·길드·기획사·구단·협회)은 누구이며 무엇을 다투는가?',
      '각 세력의 흥망 타임라인은? (미래지식이 "어디서 작동할지" 보여주는 지도)',
      '주인공은 어느 세력에 붙고, 어느 세력과 맞서며, 어떤 세력을 새로 세우는가?',
      '전생에 주인공을 짓밟던 거대 세력은? 체급 역전을 어디서 시각화할 것인가?',
      '국제·비밀 세력(외국 자본·결사)이 후반에 개입한다면 무엇인가?',
    ],
  },
  {
    key: 'divergence', label: '두 타임라인 (원래↔새 미래)', icon: '🦋',
    ph: '전생에서 실제 벌어진 "원래 미래" ↔ 개입으로 변해가는 "새 미래"의 분리 관리…',
    questions: [
      '"원래 미래"(전생의 실제 전개)와 "새 미래"(개입 후)를 어떻게 분리 추적할 것인가?',
      '주인공의 개입으로 가장 먼저 어긋나는 사건은 무엇인가? (나비효과의 시작)',
      '메타지식이 무효화되기 시작하는 시점은? (1막/2막/3막)',
      '"내가 아는 미래가 더 이상 안 통한다"는 위기를 어디서 터뜨릴 것인가?',
      '바뀐 미래가 만든 새로운 위협·기회는 무엇인가?',
    ],
  },
  {
    key: 'rivals', label: '회귀자 인식·정보전', icon: '👁️',
    ph: '(고급) 다른 회귀자/예지자/시스템이 "너도 회귀자냐"를 감지 — 회귀자 간 정보전…',
    questions: [
      '주인공 외에 다른 회귀자·예지자가 존재하는가? 몇 명이며 무엇을 노리는가?',
      '서로를 어떻게 알아채는가? ("어떻게 알았지?" 데자뷔·지식 누설의 긴장)',
      '회귀자 간 정보 비대칭은 어떻게 깨지고 역전되는가?',
      '주인공이 회귀자임을 들킬 위험을 어떻게 관리하는가?',
      '적 회귀자가 후반 빌런이라면, 그의 "아는 미래"는 주인공과 어떻게 다른가?',
    ],
  },
  {
    key: 'reckoning', label: '전생 청산·빌런', icon: '🔥',
    ph: '나를 죽인/배신한 근원 빌런, 망친 조직 — 초반 통쾌함과 후반 대형 청산의 분리 배치…',
    questions: [
      '전생에서 나를 망친 근원 빌런·조직은 누구인가? 그의 동기·정당성은?',
      '초반의 작은 응징과 후반의 대형 청산을 어떻게 분리 배치할 것인가?',
      '클라이맥스에서 미래지식이 무효화된 뒤, 무엇(자력·인맥·기반)으로 이길 것인가?',
      '체급 역전(한때 짓밟던 존재를 내려다보는 순간)을 어떻게 시각화할 것인가?',
      '최종 빌런이 회귀/예지자라면, 둘의 "두 번째 인생" 대결은 어떻게 끝나는가?',
    ],
  },
  {
    key: 'emotion', label: '정서축 (두 번 사는 자)', icon: '💗',
    ph: '이미 죽은 가족·친구를 다시 만나는 회한, 못 지킨 것을 지키려는 동기 — 액션과 별개의 감정선…',
    questions: [
      '회귀로 다시 만난(살아 있는) 사람은 누구이며, 어떤 회한·다짐을 부르는가?',
      '"이번엔 지키고 싶은 것"은 무엇인가? (못 지킨 가족·친구·꿈)',
      '액션·성공 쾌감과 별개로 흐르는 감정선의 축은 무엇인가?',
      '전생의 한 + 현생의 성취가 한 점에 모이는 정서적 정점은 어디인가?',
      '엔딩의 결(성취·안정·일상 회복)을 어디로 향하게 할 것인가? (현판 회귀는 비극보다 안정 선호)',
    ],
  },
  {
    key: 'naming', label: '명명·디테일', icon: '🔤',
    ph: '가공한 기업/종목/기획사/길드/게이트 명, 업계 은어, 호칭·직급 체계, 시스템 창 표기…',
    questions: [
      '실명을 피해 가공한 기업·종목·기획사·구단·길드명은 어떤 규칙으로 짓는가?',
      '게이트·던전·마수·스킬의 명명 규칙(혼합형)은?',
      '업계 은어·약어·직급 호칭을 어떻게 일관되게 쓸 것인가?',
      '시스템 창·상태창·알림의 표기 형식(서체·말투)은 어떻게 통일하는가?',
      '독자가 바로 알아볼 "현실 모사 + 한 끗 변형"의 균형을 어디에 둘 것인가?',
    ],
  },
  {
    key: 'devices', label: '핵심 서사 장치', icon: '🎴',
    ph: '선점 모티프·체크리스트 서사·사이다 리듬·떡밥(원거리/단기) 운용·매 화 클릭 훅…',
    questions: [
      '선점(자산·인재·기술·종목)을 어떤 리듬으로 보여줄 것인가?',
      '회귀 직후 "할 일 목록"을 챕터 추진력으로 어떻게 굴릴 것인가?',
      '매 화 1쾌감(작은 승리·정보·떡밥) 중 무엇을 보장할 것인가?',
      '원거리 떡밥(거대 미래 사건)과 단기 회수 떡밥을 어떻게 병렬로 굴릴 것인가?',
      '매 화 끝 "다음화 클릭" 훅(반전·도발·결정의 순간)을 어떻게 설계할 것인가?',
    ],
  },
] as const

interface WorldFields {
  timeline: string; trigger: string; meta: string; arena: string; system: string; powers: string
  divergence: string; rivals: string; reckoning: string; emotion: string; naming: string; devices: string
}
interface World {
  id: string
  name: string          // 작품/세계 이름
  summary: string       // 한 줄 소개(로그라인)
  arena: string         // 하위 무대 클러스터
  regression: string    // 회귀 유형
  divergenceTiming: string // 메타지식 무효화 시점
  fields: WorldFields
  createdAt: number
  updatedAt: number
}

const emptyFields = (): WorldFields => ({
  timeline: '', trigger: '', meta: '', arena: '', system: '', powers: '',
  divergence: '', rivals: '', reckoning: '', emotion: '', naming: '', devices: '',
})

function makeWorld(name = ''): World {
  return {
    id: newId(), name, summary: '',
    arena: ARENAS[0].v, regression: REGRESSION_TYPE[0].v, divergenceTiming: DIVERGENCE[1],
    fields: emptyFields(), createdAt: Date.now(), updatedAt: Date.now(),
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
      return {
        ...base, ...x, id: String(x.id || newId()), fields,
        name: typeof x.name === 'string' ? x.name : '',
        summary: typeof x.summary === 'string' ? x.summary : '',
        arena: typeof x.arena === 'string' ? x.arena : base.arena,
        regression: typeof x.regression === 'string' ? x.regression : base.regression,
        divergenceTiming: typeof x.divergenceTiming === 'string' ? x.divergenceTiming : base.divergenceTiming,
        createdAt: Number(x.createdAt) || Date.now(),
        updatedAt: Number(x.updatedAt) || Date.now(),
      } as World
    })
    const ids = new Set(worlds.map((w) => w.id))
    const activeId = typeof p?.activeId === 'string' && ids.has(p.activeId) ? p.activeId : (worlds[0]?.id ?? null)
    return { worlds, activeId }
  } catch { return { worlds: [], activeId: null } }
}

// ───────────────────────── 어휘·클리셰 사전(도시에 §7, 카테고리/검색/무작위/복사) ─────────────────────────
const LEXICON: { cat: string; icon: string; items: string[] }[] = [
  { cat: '회귀·시간', icon: '⏳', items: ['회귀(回歸)', '회귀자', '전생(前生)', '현생', '이번 생', '두 번째 인생', '세컨드 라이프', '다시 산다', '중생(重生)', '루프', '되감기', '분기점', '나비효과', '데자뷔', '미래 지식', '메타지식', '선지자', '예지'] },
  { cat: '경제·투자', icon: '📈', items: ['종잣돈', '저점 매수', '떡상', '떡락', '상장', 'IPO', '인수합병(M&A)', '작전세력', '공매도', '시드머니', '엔젤 투자', '지분', '경영권', '차트 분석', '코인 폭등', '우량주', '테마주'] },
  { cat: '헌터·게이트', icon: '⚔️', items: ['각성', '각성자', '게이트', '던전', '마수', '몬스터', '브레이크(범람)', 'S급/EX급', '헌터협회', '길드', '레이드', '보스', '공략', '마정석', '아이템', '스탯·스킬', '시스템 창', '상태창'] },
  { cat: '연예·콘텐츠', icon: '🎤', items: ['데뷔조', '연습생', '오디션', '기획사', '소속사', '음원', '차트 올킬', '역주행', '컴백', '팬덤', '굿즈', '리메이크', '시나리오', '웹툰', '판호', '캐스팅', '시청률', '조회수'] },
  { cat: '직위·인물', icon: '👤', items: ['회장님', '오너 일가', '후계자', '재벌 3세', '대표(CEO)', '길드 마스터', '협회장', '에이스', '랭커', 'S급 헌터', '천재', '신동', '떡잎', '배신자', '진범', '멘토', '라이벌', '거물'] },
  { cat: '서사·쾌감', icon: '🍹', items: ['사이다', '고구마', '먼치킨', '치트', '선점', '회빙환', '복선', '떡밥', '회수', '응징', '복수', '체급 역전', '재능 숨기기', '먼저 알아봄', '카타르시스', '성장 곡선', '히든 피스', '한방'] },
  { cat: '현실·시스템', icon: '🏙️', items: ['시스템 메시지', '퀘스트', '튜토리얼', '히든 퀘스트', '레벨업', '버프/디버프', '스킬트리', '직업·클래스', '인벤토리', '상점', '랭킹', '업적', '칭호', '재화', '스탯 분배', '패시브'] },
]

const CLICHES: { trope: string; twist: string }[] = [
  { trope: '회귀 직후 "익숙한 천장이다"라며 젊어진 몸을 자각한다', twist: '천장이 낯설다 — 회귀했지만 "원래의 그 시점"이 아닌 미묘하게 어긋난 과거로 떨어진다' },
  { trope: '아직 살아 있는 부모·동생을 보고 울컥하며 동기를 얻는다', twist: '다시 만난 가족이 전생의 비극을 만든 장본인이었음을 회귀자만 안다 — 사랑과 응징 사이의 딜레마' },
  { trope: '첫 행동으로 즉시 종목·코인·로또로 종잣돈을 확보한다', twist: '나비효과로 그 종목이 전생과 다르게 움직인다 — 회귀 1화부터 미래지식이 흔들린다' },
  { trope: '아직 무명인 미래의 거물을 알아보고 미리 포섭한다', twist: '그 거물도 회귀자였고, 주인공이 자기를 알아본 순간 정체를 눈치챈다' },
  { trope: '전생의 원수가 초반엔 우위에 있다가 서서히 역전된다', twist: '원수 역시 두 번째 삶을 살고 있어, 주인공의 응징 시나리오를 거꾸로 읽고 함정을 판다' },
  { trope: '"재능을 숨긴다 / 실력을 감춘다"가 나중에 폭발한다', twist: '숨기는 데 너무 익숙해져, 정작 진심을 보여야 할 사람 앞에서도 가면을 못 벗는 것이 진짜 약점' },
  { trope: '주변인이 "넌 왜 이렇게 변했어?"라며 의심한다', twist: '둘러대던 거짓(천재성·예지)이 소문이 되어, 진짜 회귀자들이 주인공을 찾아내는 단서가 된다' },
  { trope: '미래지식으로 막힘없이 문제를 해결하는 사이다', twist: '【주의】 너무 다 알면 긴장이 죽는다 — 도시에 §4: 중반부터 메타지식을 의도적으로 무효화해 긴장을 회복할 것' },
  { trope: '회귀 직후 미래의 히트곡·시나리오를 본인이 선점해 발표한다', twist: '원작자가 따로 회귀해 자기 작품을 빼앗긴 걸 알고 추적해 온다 — 콘텐츠 선점의 윤리적 부메랑' },
  { trope: '전생에 나를 버린 회사/길드를 떠나 더 크게 성공해 복수한다', twist: '복수를 이룬 뒤에도 채워지지 않는 공허 — 진짜 청산은 "지키지 못한 사람"을 지키는 것이었다' },
  { trope: '미래에 터질 게이트·재난의 날짜를 알고 미리 대비한다', twist: '주인공이 막은 탓에 재난이 "다른 곳·다른 형태"로 더 크게 터진다 — 안 막느니만 못한 개입의 역설' },
  { trope: '회귀로 모든 것을 다시 시작해 두 번째 인생은 완벽하다', twist: '몸은 과거인데 마음은 미래의 늙은 나 — 또래와 어긋나는 정서적 고립이 회귀자의 진짜 비용' },
]

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ModfanWorldBuilder({ payload }: { payload?: Record<string, unknown> }) {
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

  // 사용자 정의 항목 + 고정 '기타' 자유 입력(추가 기능 — 기존 데이터 모델은 건드리지 않음)
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 입력하세요. (예: 세계관 한 줄 컨셉, 금기 사항…)') || '').trim() } catch { label = '' }
    if (!label) return
    setCustom((arr) => [...arr, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((arr) => arr.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((arr) => arr.filter((it) => it.id !== id))
  // 무작위 생성 시: 사용자 정의 '값'과 '기타'는 비우되 항목(이름)은 유지
  const clearCustomValues = () => { setCustom((arr) => arr.map((it) => ({ ...it, value: '' }))); setEtc('') }

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

  // payload 진입(연계) — 이름/장르(무대) 초안 1회 반영
  useEffect(() => {
    if (seeded.current || !payload) return
    seeded.current = true
    const nm = typeof payload.name === 'string' ? payload.name : (typeof payload.title === 'string' ? payload.title : '')
    if (nm) {
      const w = makeWorld(nm.trim())
      const g = typeof payload.genre === 'string' ? payload.genre : ''
      if (g) {
        const m = ARENAS.find((a) => a.v.includes(g) || g.includes(a.v.split(' ')[0]))
        if (m) w.arena = m.v
      }
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
    const w = makeWorld(`새 작품 세계 ${worlds.length + 1}`)
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setQuery(''); setConfirmDel(null); setOpenGuide(null)
    clearCustomValues()
  }

  const patch = (p: Partial<World>) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, ...p, updatedAt: Date.now() } : w)) }))
  }
  const patchField = (key: keyof WorldFields, value: string) => {
    if (!active) return
    setStore((s) => ({ ...s, worlds: s.worlds.map((w) => (w.id === active.id ? { ...w, fields: { ...w.fields, [key]: value }, updatedAt: Date.now() } : w)) }))
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

  // 영감 → 새 세계 초안 생성(빈 칸 채움)
  const applyInspiration = () => {
    const w = makeWorld(`새 작품 세계 ${worlds.length + 1}`)
    w.summary = `${slots.분위기} · ${slots.회귀시점}에서 회귀해 ${josa(slots.다가올사건, '을를')} 향해 가는 이야기`
    w.fields.timeline = `현재 시점: ${slots.회귀시점}.\n다가올 거대 사건: ${slots.다가올사건}.`
    w.fields.trigger = `회귀 트리거: ${slots.회귀트리거}.\n회귀 시점: ${slots.회귀시점}.`
    w.fields.meta = `핵심 메타지식: ${slots.메타지식}.\n회귀 후 첫 행동: ${slots.첫행동}.`
    w.fields.arena = `주 무대: ${slots.현실무대}.\n성장 지표: ${slots.성장지표}.`
    w.fields.powers = `세력 블록: ${slots.세력블록}.\n핵심 조력자: ${slots.조력자}.`
    w.fields.reckoning = `전생의 원수: ${slots.전생원수}.`
    w.fields.emotion = `정서축: ${slots.정서축}.`
    w.fields.rivals = `회귀 은폐·위장: ${slots.은폐위장}.`
    w.fields.devices = `분위기: ${slots.분위기}.\n반전 장치: ${slots.반전장치}.`
    setStore((s) => ({ worlds: [w, ...s.worlds], activeId: w.id }))
    setOpenGuide(null)
    clearCustomValues()
    flash('영감 슬롯으로 새 작품 세계 초안을 만들었어요. 설계 질문에 답하며 채워 보세요.')
  }

  // 단일 슬롯 → 현재 세계 필드에 덧붙이기
  const SLOT_FIELD: Record<PoolKey, keyof WorldFields> = {
    회귀트리거: 'trigger', 회귀시점: 'trigger', 메타지식: 'meta', 첫행동: 'meta',
    현실무대: 'arena', 성장지표: 'arena', 세력블록: 'powers', 전생원수: 'reckoning',
    정서축: 'emotion', 은폐위장: 'rivals', 다가올사건: 'timeline', 분위기: 'devices',
    조력자: 'powers', 반전장치: 'devices',
  }
  const appendSlotToActive = (k: PoolKey) => {
    if (!active) { flash('먼저 작품 세계를 선택하거나 만들어 주세요.'); return }
    const field = SLOT_FIELD[k]
    const cur = active.fields[field] || ''
    const val = cur.trim() ? `${cur}\n${k}: ${slots[k]}` : `${k}: ${slots[k]}`
    patchField(field, val)
    flash(`‘${k}: ${slots[k]}’ 를 현재 세계에 반영했어요.`)
  }

  // ── 내보내기/연계 ──
  function buildText(w: World): string {
    const L: string[] = []
    L.push(`# ${w.name || '이름 없는 작품 세계'}`)
    if (w.summary.trim()) L.push(w.summary.trim())
    L.push('', `· 무대: ${w.arena}`, `· 회귀 유형: ${w.regression}`, `· 메타지식 무효화: ${w.divergenceTiming}`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
    }
    for (const it of custom) {
      const v = (it.value || '').trim()
      if (v) { L.push('', `## ${it.label.trim() || '항목'}`, v) }
    }
    const e = etc.trim()
    if (e) { L.push('', '## 기타', e) }
    return L.join('\n')
  }
  function buildHtml(w: World): string {
    const p: string[] = []
    if (w.summary.trim()) p.push(`<p><i>${esc(w.summary.trim())}</i></p>`)
    p.push(`<p><b>무대</b>: ${esc(w.arena)}<br><b>회귀 유형</b>: ${esc(w.regression)}<br><b>메타지식 무효화</b>: ${esc(w.divergenceTiming)}</p>`)
    for (const s of SECTIONS) {
      const v = (w.fields[s.key] || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(s.icon + ' ' + s.label)}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    for (const it of custom) {
      const v = (it.value || '').trim()
      if (!v) continue
      p.push(`<p><b>${esc(it.label.trim() || '항목')}</b><br>${esc(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    const e = etc.trim()
    if (e) p.push(`<p><b>${esc('기타')}</b><br>${esc(e).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
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

  // 프로젝트 자료(세계관)에 text 문서로 추가
  const toProject = (w: World) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아요.'); return }
    const title = (w.name || '이름 없는 작품 세계').trim()
    const projMeta: Record<string, string> = { 유형: '현판·회귀 세계관', 무대: w.arena, 회귀유형: w.regression, '채운 항목': `${filledCount(w)}/${SECTIONS.length}` }
    for (const it of custom) { const k = it.label.trim(); const v = (it.value || '').trim(); if (k && v) projMeta[k] = v }
    if (etc.trim()) projMeta.etc = etc.trim()
    const id = addToProject({
      kind: 'text', root: 'research', folder: '세계관', title: `세계관 — ${title}`, icon: '⏳',
      synopsis: w.summary.trim() || `${w.arena} · ${w.regression}`,
      bodyHtml: buildHtml(w),
      meta: projMeta,
    })
    flash(id ? `‘${title}’${hasBatchim(title) ? '을' : '를'} 프로젝트 ‘자료 › 세계관’에 문서로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 공유 라이브러리(장소)로 추가 — 다른 도구(배경 설정집 등)와 연계
  const toLibrary = (w: World) => {
    const title = (w.name || '이름 없는 작품 세계').trim()
    // 정규(표준) 장소 키로 매핑한 fields — 받는 허브(배경 설정집)에서 기본 칸에 제자리로 들어가게 한다.
    const f = w.fields
    const placeFields: Record<string, string> = {}
    const putP = (k: string, v: string) => { const t = (v || '').trim(); if (t) placeFields[k] = t }
    putP('name', title)
    putP('kind', '현판·회귀 세계관')                                   // 종류/유형 → kind
    putP('atmosphere', w.summary.trim() || w.arena)                    // 분위기 → atmosphere
    putP('history', [f.timeline, f.divergence].map((x) => (x || '').trim()).filter(Boolean).join('\n\n')) // 연표/두 타임라인 → history
    putP('culture', f.arena)                                           // 현실 시스템·무대 → culture
    putP('inhabitants', f.powers)                                      // 세력 지도·권력 블록 → inhabitants
    putP('rules', [`회귀 유형: ${w.regression}`, (f.system || '').trim(), (f.meta || '').trim()].filter(Boolean).join('\n')) // 시스템/메타지식 규칙 → rules
    putP('dangers', f.reckoning)                                       // 전생 청산·빌런 → dangers
    putP('secrets', f.rivals)                                          // 회귀자 인식·정보전 → secrets
    putP('notes', [f.naming, f.emotion, f.devices, f.trigger].map((x) => (x || '').trim()).filter(Boolean).join('\n\n')) // 그 외 자유 서술 → notes
    for (const it of custom) putP(it.label.trim() || '항목', it.value)  // 사용자 정의 항목 → 받는 허브에 그대로 노출
    putP('etc', etc)                                                    // 고정 '기타' → etc
    addToLibrary('places', {
      name: title, kind: '현판·회귀 세계관', mood: w.summary.trim() || w.arena,
      history: [(w.fields.timeline || '').trim(), (w.fields.divergence || '').trim()].filter(Boolean).join('\n\n') || undefined,
      rules: [`회귀 유형: ${w.regression}`, (w.fields.system || '').trim(), (w.fields.meta || '').trim()].filter(Boolean).join('\n') || undefined,
      notes: buildText(w), fields: placeFields, source: '현판·회귀 세계관 빌더',
    })
    flash(`‘${title}’${hasBatchim(title) ? '을' : '를'} 공유 라이브러리(장소)에 저장했어요. 배경 설정집 등에서 불러올 수 있어요.`)
  }

  // 영감 조합을 글감(스니펫) 라이브러리에 저장
  const inspirationToSnippet = () => {
    const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n')
    addToLibrary('snippets', { text: t, tags: ['현판회귀', '세계관영감'], source: '현판·회귀 세계관 빌더' })
    flash('영감 조합을 공유 라이브러리(글감)에 저장했어요.')
  }

  const filtered = worlds.filter((w) => {
    const q = norm(query)
    if (!q) return true
    if (norm(w.name).includes(q) || norm(w.summary).includes(q) || norm(w.arena).includes(q) || norm(w.regression).includes(q)) return true
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
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 },
    title: { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 },
    spacer: { flex: 1 },
    note: { fontSize: 12, color: 'var(--accent)', padding: '6px 14px', flexShrink: 0, lineHeight: 1.5, borderBottom: '1px solid var(--border)' },
    main: { flex: 1, minHeight: 0, display: 'flex' },
    side: { width: 230, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' },
    sideHead: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 },
    search: { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' },
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 },
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
    body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    select: { width: '100%', padding: '9px 11px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' },
    textarea: { width: '100%', minHeight: 78, padding: '9px 11px', fontSize: 13.5, lineHeight: 1.6, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
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
        <div style={C.title}><span aria-hidden><Emoji e="⏳" /></span> 현판·회귀 세계관 빌더</div>
        <div style={C.spacer} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{worlds.length}개 세계</span>
        <button className="minibtn" onClick={() => setShowRef((v) => !v)} title="어휘·클리셰 사전 열기">{showRef ? <><Emoji e="📖" /> 사전 닫기</> : <><Emoji e="📖" /> 사전</>}</button>
        <button className="minibtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 설계기 열기"><Emoji e="⚔️" /> 갈등 설계</button>
        <button className="btn-primary" onClick={onNew}>+ 새 세계</button>
      </div>

      {note && <div style={C.note}>{note}</div>}

      <div style={C.main}>
        {/* 좌측: 세계 목록 */}
        <div style={C.side}>
          <div style={C.sideHead}>
            <button className="btn-primary" onClick={onNew} style={{ width: '100%' }}>+ 새 작품 세계</button>
            <input style={C.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·내용 검색" aria-label="세계 검색" />
          </div>
          {worlds.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: 14, textAlign: 'center' }}>
              아직 작품 세계가 없어요.<br /><b>+ 새 세계</b> 또는 아래<br />영감 생성기로 시작하세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>‘{query}’에 맞는 세계가 없어요.</div>
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
                      <Emoji e="⏳" /> {w.name || '(이름 없는 세계)'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.summary.trim() || w.arena}</span>
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
                <div style={C.secTitle}><span aria-hidden><Emoji e="📖" /></span> 현판·회귀 어휘·클리셰 사전</div>
                <div style={C.spacer} />
                <button className={refTab === 'lex' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('lex')}>장르 어휘</button>
                <button className={refTab === 'cliche' ? 'btn-primary' : 'minibtn'} onClick={() => setRefTab('cliche')}>클리셰·변주</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...C.input, flex: 1 }} value={refQuery} onChange={(e) => setRefQuery(e.target.value)} placeholder="🔍 사전 검색" aria-label="사전 검색" />
                {refTab === 'lex' ? (
                  <button className="minibtn" onClick={() => { const all = LEXICON.flatMap((g) => g.items); const w = pick(all); copyText(w, `‘${w}’ 복사됨`) }} title="무작위 어휘 복사"><Emoji e="🎲" /> 무작위</button>
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
                            <button key={it} style={C.chip} onClick={() => copyText(it, `‘${it}’ 복사됨`)} title="클릭하면 복사돼요">{it}</button>
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
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>흔한 클리셰 ↔ 비트는 변주(도시에 §7). 항목을 누르면 복사됩니다.</div>
                    {clicheFiltered.map((c, i) => (
                      <div key={i} style={{ ...C.panel, cursor: 'pointer' }} onClick={() => copyText(`${c.trope}\n→ 변주: ${c.twist}`, '복사됨')} title="클릭하면 복사돼요">
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}><Emoji e="🔁" /> {c.trope}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.55 }}>↳ 변주: {c.twist}</div>
                      </div>
                    ))}
                  </>
                )
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>상단 ‘<Emoji e="📖" /> 사전 닫기’를 누르면 세계 편집으로 돌아갑니다.</div>
            </div>
          ) : !active ? (
            <div style={C.body}>
              <div style={C.empty}>
                <div style={{ fontSize: 34 }} aria-hidden><Emoji e="⏳" /></div>
                <div>
                  현대판타지 회귀물 한 편을 시간 좌표·회귀 시점·메타지식·현실 시스템·세력 지도·두 타임라인까지<br />
                  설계 질문을 따라 또렷하게 빚어 보세요.<br />
                  <b>+ 새 세계</b>로 시작하거나, 아래 <strong style={{ color: 'var(--accent)' }}>세계 영감 생성기</strong>로 초안을 굴려 보세요.
                </div>
                <button className="btn-primary" onClick={onNew}>+ 첫 작품 세계 만들기</button>
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
                    <input style={C.input} value={active.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예: 회귀한 S급 헌터는 게이트의 미래를 안다" maxLength={80} aria-label="작품 세계 이름" />
                  </div>
                  <div>
                    <label style={C.label}>한 줄 소개 (로그라인)</label>
                    <input style={C.input} value={active.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="한 문장으로… 예: 토사구팽당해 죽은 회계사가 10년 전으로 돌아가, 떡상 종목과 배신자를 전부 기억한 채 다시 산다" maxLength={170} aria-label="한 줄 소개" />
                  </div>
                  <div style={C.row2}>
                    <div>
                      <label style={C.label}>하위 무대</label>
                      <select style={C.select} value={active.arena} onChange={(e) => patch({ arena: e.target.value })}>
                        {ARENAS.map((a) => <option key={a.v} value={a.v}>{a.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{ARENAS.find((a) => a.v === active.arena)?.d}</div>
                    </div>
                    <div>
                      <label style={C.label}>회귀 유형</label>
                      <select style={C.select} value={active.regression} onChange={(e) => patch({ regression: e.target.value })}>
                        {REGRESSION_TYPE.map((r) => <option key={r.v} value={r.v}>{r.v}</option>)}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{REGRESSION_TYPE.find((r) => r.v === active.regression)?.d}</div>
                    </div>
                  </div>
                  <div>
                    <label style={C.label}>메타지식 무효화 시점 (도시에 §4 나비효과)</label>
                    <select style={C.select} value={active.divergenceTiming} onChange={(e) => patch({ divergenceTiming: e.target.value })}>
                      {DIVERGENCE.map((d) => <option key={d} value={d}>{d}</option>)}
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

                {/* 사용자 정의 항목 + 고정 '기타' (추가 기능) */}
                <div style={C.panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={C.secTitle}><span aria-hidden>＋</span> 사용자 정의 항목</span>
                    <span style={C.spacer} />
                    <button className="minibtn" style={{ padding: '3px 9px', fontSize: 12 }} onClick={addCustom} title="원하는 이름의 항목을 직접 추가해 자유롭게 채웁니다">＋ 항목 추가</button>
                  </div>
                  {custom.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>필요한 항목이 더 있으면 <b>＋ 항목 추가</b>로 직접 만들어 채우세요. (내용은 직접 작성)</div>
                  ) : (
                    custom.map((it) => (
                      <div key={it.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <label style={{ ...C.label, marginBottom: 0 }}>{it.label}</label>
                          <span style={C.spacer} />
                          <button style={C.tinyBtn} title="이 항목 삭제" onClick={() => removeCustom(it.id)}>✕</button>
                        </div>
                        <textarea
                          style={C.textarea}
                          value={it.value}
                          onChange={(e) => setCustomValue(it.id, e.target.value)}
                          placeholder={`‘${it.label}’ 내용을 자유롭게 적으세요…`}
                          aria-label={it.label}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* 고정 '기타' 자유 입력 */}
                <div style={C.panel}>
                  <span style={C.secTitle}><span aria-hidden><Emoji e="🗒️" /></span> 기타</span>
                  <textarea
                    style={{ ...C.textarea, minHeight: 110 }}
                    value={etc}
                    onChange={(e) => setEtc(e.target.value)}
                    placeholder="어느 항목에도 들어가지 않는 자유 메모를 충분히 적어 두세요…"
                    aria-label="기타"
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>모든 변경은 이 브라우저에 자동 저장됩니다. 수정 {fmtDate(active.updatedAt)}</div>

                {/* 영감 생성기 */}
                <Inspiration />
              </div>

              <div style={C.editBar}>
                <button className="minibtn" onClick={() => copyText(buildText(active), '이 세계를 복사했어요')}><Emoji e="📋" /> 복사</button>
                <button className="linkbtn" onClick={() => toProject(active)} disabled={!linked} title={linked ? '이 세계를 프로젝트 자료(세계관)에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}><Emoji e="📄" /> 프로젝트에 추가</button>
                <button className="minibtn" onClick={() => toLibrary(active)} title="공유 라이브러리(장소)에 저장해 배경 설정집 등에서 활용"><Emoji e="🗂️" /> 라이브러리에 저장</button>
                <button className="minibtn" onClick={() => openToolLinked('conflict-builder')} title="갈등 설계기 열기"><Emoji e="⚔️" /> 갈등 설계</button>
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
          <div style={C.secTitle}><span aria-hidden><Emoji e="🎲" /></span> 회귀 세계 영감 생성기</div>
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
                  title="이 항목을 현재 세계의 해당 필드에 반영"
                >＋</button>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all' }}>{slots[k]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={roll}><Emoji e="🎲" /> 재생성</button>
          <button className="minibtn" onClick={applyInspiration}>이 조합으로 새 세계 만들기</button>
          <button className="minibtn" onClick={() => { const t = (Object.keys(POOLS) as PoolKey[]).map((k) => `${k}: ${slots[k]}`).join('\n'); copyText(t, '영감 조합을 복사했어요') }}><Emoji e="📋" /> 조합 복사</button>
          <button className="minibtn" onClick={inspirationToSnippet} title="영감 조합을 공유 라이브러리(글감)에 저장"><Emoji e="🗂️" /> 글감으로 저장</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>카드를 눌러 잠그면 재생성에서 제외돼요.</span>
        </div>
      </div>
    )
  }
}
