// 게임판타지·LitRPG 캐릭터 생성기 — '게임판타지·LitRPG' 장르 전용. 한 인물을
//  (장르 분기(VR다이브·데스게임·이세계전이+시스템·현실침공) × 원형(Archetype) × 클래스·직업
//   × 빌드 정체성(주력 스탯) × 시그니처 스킬(원형별) × 칭호(원형별) × 등급(레어리티) × 동기·목표
//   × 결핍·상처(현실/게임 트라우마) × 결점·약점 × 비밀(시스템 배후·원작지식) × 시스템 특이점(고유 시스템 메시지)
//   × 라이벌·진영(랭킹·길드) × 시작 상태창(레벨/스탯)) 슬롯 조합으로 빚어낸다.
//  원형(회귀 공략러·F급 각성자·히든클래스 보유자·데스게임 생존자·시스템 의인화 안내자·생산직 장인·탱커 길드마스터·
//   랭킹 1위 랭커·자아를 가진 NPC·시스템 관리자/배후)에 따라 시그니처 스킬·칭호·클래스 풀이 달라져
//  "원작 결말을 다 아는 회귀 공략러"부터 "그림자 군단을 부리는 히든클래스 각성자",
//   "죽으면 진짜 죽는 데스게임에서 살아남은 전략가"까지 LitRPG 코드가 살아 있는 인물 시트를 만든다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(부분 재생성). 상단에 조합수(조 단위) 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
//  아바타는 저작권 안전한 DiceBear(seed 기반 생성형 SVG)로, 크레딧과 함께 표기한다.
// 도시에 근거: 4분기(VR다이브/데스게임/이세계전이+시스템/현실침공)·상태창/시스템 메시지·레벨업/스탯 분배·
//  스킬 트리/시너지·히든/유니크 클래스·등급(Common→Mythic)·칭호(First Clear)·회귀+게임지식·시스템 의인화 AI·
//  시스템 배후(신/관리자/탑의 주인)·사이다/성장 가시화·랭킹/길드/평판·생산직 경제 등 LitRPG 고유 코드를 슬롯에 촘촘히 녹였고,
//  '결점/비밀(시스템 배후·원작지식)/상처'를 강조해 평면 먼치킨과 무개성 주인공을 막는다.
// 연계(linkbus): 인물을 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도·이름 짓기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify, type SharedCharacter } from './linkbus'

export const meta = { id: 'litrpg-charforge', name: 'LitRPG 캐릭터 생성기', icon: '🎮', group: '캐릭터', genre: '게임판타지·LitRPG', intro: '분기(VR다이브·데스게임·이세계전이·현실침공)×원형(회귀공략러·F급각성자·히든클래스·데스게임생존자·시스템안내자·생산직장인·탱커길드장·랭커·자아NPC·관리자)×클래스×빌드×시그니처스킬×칭호×등급×동기×상처×결점×비밀(시스템배후)×시스템특이점×라이벌×시작상태창을 조합해 LitRPG 코드가 살아 있는 인물을 무작위 생성', w: 600, h: 760 }

const LS = 'sry:tool:litrpg-charforge'

// ───────────── 유틸 ─────────────
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function uid(): string { return 'lrcf_' + Date.now().toString(36) + '_' + ri(1e6).toString(36) }

// 조사 자동 선택: 앞 글자 받침 유무로 실제 조사 하나를 골라 붙인다(괄호 이중표기 금지).
//  종성(받침)이 'ㄹ'인 경우 으로/로 는 '로'를 쓰므로 별도 처리한다.
function josa(word: string, type: '을/를' | '이/가' | '은/는' | '으로/로'): string {
  const m = (word || '').match(/[가-힣](?=[^가-힣]*$)/)  // 마지막 한글 음절
  const ch = m ? m[0] : ''
  if (!ch) return word + (type === '을/를' ? '를' : type === '이/가' ? '가' : type === '은/는' ? '는' : '로')
  const code = ch.charCodeAt(0) - 0xac00
  const jong = code % 28                  // 0이면 받침 없음
  const hasBatchim = jong !== 0
  const isRieul = jong === 8              // 받침 'ㄹ'
  let p: string
  switch (type) {
    case '을/를': p = hasBatchim ? '을' : '를'; break
    case '이/가': p = hasBatchim ? '이' : '가'; break
    case '은/는': p = hasBatchim ? '은' : '는'; break
    case '으로/로': p = (!hasBatchim || isRieul) ? '로' : '으로'; break
  }
  return word + p
}

// ───────────── 이름 풀(작명 영감 — LitRPG 결별) ─────────────
// 현실측 본명(한국형 게임판타지·헌터물): 현실에서 게임/시스템에 접속·각성하는 인간
const REAL_KO = ['도현', '서준', '하진', '민혁', '재윤', '윤후', '강우', '시우', '준서', '태경', '연우', '이안', '하랑', '서아', '예린', '지유', '수아', '하은', '윤서', '소율', '채원', '다인', '한결', '도윤']
const REAL_SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '신', '권', '황', '서', '오', '남궁', '선우']
// 게임 닉네임·아바타명(영문/혼합 ID 감성): VR 캐릭터·랭커 ID
const GAME_ID = ['Nightcrawler', 'Verglas', 'GreyWolf', 'Ashen', 'Onyx', 'Velvet', 'Reaper_K', 'SoloKnight', 'VoidWalker', 'Dawnbreaker', 'Stormcaller', 'IronVein', 'Hollow', 'Crimson', 'Sablerose', 'NoLifeKing', 'Wraith', 'Eclipse', 'Tempest', 'Glasscannon', 'Lvl1Boss', 'Backstab', 'Quietus', 'Mirrorshade']
// 이세계·판타지풍 본명: 전이 후 이세계 캐릭터/원래 그 세계 주민(자아NPC 등)
const ISEKAI_M = ['카엘', '레이븐', '아르덴', '드라크', '시온', '루카', '벨', '가렌', '오르넬', '테오', '크로우', '발렌', '리히트', '에이든', '하벨', '노아흐']
const ISEKAI_F = ['리리스', '셀린', '아엘', '미라벨', '노바', '비안카', '엘라', '세라', '루나', '이브', '아샤', '실비', '레아', '키리에', '베라', '느와']
// 시스템·관리자측 명칭(의인화 AI·도깨비·관리자): 인격적 존재
const SYS_NAME = ['관리자 #00', '튜토리얼 가이드', '시스템', '심판자', '주관자', '도깨비 비형', '0번째 사도', '회색의 사서', '검은 별의 사자', '운영자', '탑의 시험관', '최후의 안내자', '제로', '에덴 프로토콜', '관전자']

// ───────────── 장르 분기(4분기) ─────────────
type BranchKey = 'vr' | 'death' | 'isekai' | 'invade'
interface BranchDef { key: BranchKey; label: string; icon: string; vibes: string[]; note: string }
const BRANCHES: Record<BranchKey, BranchDef> = {
  vr: {
    key: 'vr', label: 'VR 다이브형', icon: '🕶️', note: '현실의 인간이 가상현실 게임에 접속. 로그아웃·현실 생활이 공존.',
    vibes: ['캡슐에 누워 로열로드급 가상현실에 접속하는 현실의 일상', '게임 내 재화를 현금화해 생계를 잇는 프로 게이머의 현실', '낮엔 평범한 직장인, 밤엔 랭커로 사는 이중생활', '게임 성과가 곧 현실의 부와 지위로 환산되는 세계'],
  },
  death: {
    key: 'death', label: '갇힘·데스게임형', icon: '💀', note: '게임에서 못 나옴. 죽으면 진짜 죽는다. 안전지대 묘사 금지.',
    vibes: ['로그아웃 명령어가 사라진, 죽으면 뇌가 타버리는 갇힌 게임', '클리어해야만 풀려나는 100층 데스게임의 1층', '동료의 죽음이 곧 진짜 부고가 되는 살얼음판 공략', '안전지대 없이 매 전투가 목숨을 건 도박인 세계'],
  },
  isekai: {
    key: 'isekai', label: '이세계 전이+시스템형', icon: '🌀', note: '다른 세계로 넘어갔는데 그 세계에 게임 시스템이 깔려 있음. 로그아웃 개념 없음.',
    vibes: ['눈을 뜨니 상태창이 떠 있는 낯선 검과 마법의 세계', '돌아갈 길 없이 시스템에 적응해야 하는 이세계 첫날', '레벨과 스킬이 실재하는 세계의 변방 마을에서 시작', '신이 부여한 시스템을 지닌 채 떨어진 이방인의 생존기'],
  },
  invade: {
    key: 'invade', label: '현실 침공형(시스템 아포칼립스)', icon: '🌃', note: '어느 날 현실에 상태창·던전·게이트가 생김. 헌터물과 강하게 겹침.',
    vibes: ['어느 날 하늘에 균열이 생기고 도심에 게이트가 열린 세계', '모두에게 상태창이 떠오른 각성의 날 이후의 서울', '몬스터가 쏟아지는 던전을 헌터들이 공략하는 일상', 'F급부터 S급까지 각성자 등급제가 사회를 재편한 현실'],
  },
}
const BRANCH_LIST: BranchKey[] = ['vr', 'death', 'isekai', 'invade']

// ───────────── 원형(Archetype) 정의 ─────────────
type ArchKey = 'returnee' | 'frank' | 'hidden' | 'survivor' | 'system' | 'crafter' | 'tank' | 'ranker' | 'npc' | 'admin'
type NameLean = 'real' | 'game' | 'isekai' | 'system' | 'any'
interface Arch {
  key: ArchKey
  label: string
  icon: string
  skills: string[]    // 원형별 시그니처 스킬(액티브/패시브/궁극기)
  titles: string[]    // 원형별 칭호(업적·First Clear)
  classes: string[]   // 원형별 어울리는 클래스·직업(히든/유니크 포함)
  branches: BranchKey[] // 선호 분기
  dice: string        // DiceBear 스타일
  lean: NameLean      // 이름 풀 성향
}

const ARCHES: Record<ArchKey, Arch> = {
  // 회귀·원작지식 공략러 — 미래 정보 비대칭(한국 장르의 결정적 변주)
  returnee: {
    key: 'returnee', label: '회귀 공략러', icon: '⏪', dice: 'adventurer', lean: 'any', branches: ['vr', 'isekai', 'invade', 'death'],
    skills: [
      '[패시브] 미래시(未來視): 이미 겪은 사건의 공략·드랍·함정을 전부 기억한다',
      '[패시브] 선구안: 히든 퀘스트·연계 퀘스트의 발동 조건을 한눈에 읽는다',
      '[액티브] 회귀 보정: 같은 적을 두 번째 상대할 때 패턴이 슬로우로 보인다',
      '[패시브] 노 웨이스트: 효율의 화신 — 경험치·재화를 단 한 점도 흘리지 않는다',
      '[궁극기] 정해진 결말: 알고 있는 미래를 발동해 단 한 번 사건을 강제로 비튼다',
      '[액티브] 사전 정보: 처음 보는 보스의 약점 속성을 즉시 간파한다',
      '[패시브] 두 번째 삶: 죽음의 순간을 기억해 치명타 회피율이 대폭 상승한다',
      '[액티브] 선점 공략: 남들보다 먼저 히든 클래스·유니크 아이템을 채간다',
    ],
    titles: ['두 번 사는 자', '결말을 아는 공략가', '회귀자', '미래에서 온 랭커', '정해진 길을 비트는 자', '노 데스 클리어러', '선점의 화신', '시간을 거스른 자'],
    classes: ['공략 특화 만능형(올라운더)', '정보상 겸 딜러', '효율충 사냥꾼', '히든 직업 선점가', '회귀 전 직업의 상위 전직자', '데이터 기반 전략가'],
  },
  // F급 최약체 → 먼치킨 (성장 곡선의 극단·사이다)
  frank: {
    key: 'frank', label: 'F급 최약체→먼치킨', icon: '📈', dice: 'adventurer', lean: 'any', branches: ['invade', 'isekai', 'vr', 'death'],
    skills: [
      '[패시브] 무한 성장: 남들이 멈추는 레벨 한계가 그에게만 존재하지 않는다',
      '[액티브] 한계 돌파(Limit Break): 죽기 직전 잠재력이 개방되며 스탯이 폭증한다',
      '[패시브] 역경 보정: 강한 적을 이길수록 획득 경험치가 기하급수로 늘어난다',
      '[액티브] 각성: 조건 충족 시 봉인된 진짜 등급이 해방된다 — "F급이 아니었다"',
      '[패시브] 페널티 전환: 약점·디버프를 성장 재료로 바꿔 흡수한다',
      '[궁극기] 하극상: 등급이 높은 상대일수록 데미지 보정이 커지는 자이언트 킬러',
      '[패시브] 근성: HP 1로 한 번은 반드시 버틴다(불굴)',
      '[액티브] 폭발적 레벨업: 단 한 번의 사냥으로 수십 레벨을 건너뛴다',
    ],
    titles: ['최약체의 반란', '등급 사기꾼', '레벨의 폭군', '바닥에서 정점으로', '한계를 모르는 자', 'F급의 탈을 쓴 재앙', '하극상의 화신', '각성한 잠룡'],
    classes: ['각성 전 무직 → 히든 클래스', '잠재력 만렙의 무명', '봉인 해제형 검사', '역경 특화 광전사', '성장 보정 몬스터 테이머', 'late-bloomer 마검사'],
  },
  // 히든/유니크 클래스 보유자 — 특별함(남들 못 가진 직업)
  hidden: {
    key: 'hidden', label: '히든클래스 각성자', icon: '🃏', dice: 'lorelei-neutral', lean: 'any', branches: ['invade', 'isekai', 'vr', 'death'],
    skills: [
      '[궁극기] 그림자 추출: 처치한 적을 그림자 병사로 되살려 군단을 부린다',
      '[패시브] 유일 직업: 전 서버에서 단 하나뿐인 클래스 보너스를 받는다',
      '[액티브] 강령: 죽은 자의 능력을 일시적으로 복제해 사용한다',
      '[패시브] 계약자: 정령·악마·고대 존재와 맺은 계약으로 권능을 빌린다',
      '[액티브] 시간 정지(零式): 짧은 순간 세계를 멈추고 홀로 움직인다',
      '[궁극기] 차원 봉인: 적을 작은 차원에 가둬 일대일로 끌어들인다',
      '[패시브] 스킬 강탈: 본 적이 있는 스킬을 한 번 복제·습득한다',
      '[액티브] 폭군의 권능: 약자에게 명령을 강제하는 군주 계열 고유 스킬',
    ],
    titles: ['그림자 군주', '유일 직업의 주인', '죽음을 부리는 자', '계약의 왕', '세상에 하나뿐인 클래스', '강령술의 정점', '권능의 수집가', '히든 피스'],
    classes: ['그림자 군주(네크로맨서 상위)', '강령술사(히든)', '정령왕 계약자', '시공 마법사(유니크)', '스킬 카피어(고유)', '폭군 군주(전직 불가 직업)'],
  },
  // 데스게임 생존 전략가 — 긴장 최상(죽으면 진짜 죽음)
  survivor: {
    key: 'survivor', label: '데스게임 생존자', icon: '🩸', dice: 'adventurer', lean: 'any', branches: ['death', 'invade', 'isekai'],
    skills: [
      '[패시브] 생존 본능: 죽음의 위기를 한 박자 빨리 직감해 회피한다',
      '[액티브] 리스크 리딩: 함정·기믹·페이크를 즉석에서 간파한다',
      '[패시브] 무패의 계산: 절대 무모한 전투를 하지 않는 철저한 손익 계산',
      '[액티브] 미끼와 역습: 자신을 미끼로 던져 적의 패턴을 끌어내고 되친다',
      '[궁극기] 결사항전: 동료를 살리기 위해 모든 쿨다운을 무시하고 한 번 폭주한다',
      '[패시브] 트라우마 면역: 동료의 죽음을 본 만큼 정신 디버프에 내성이 생긴다',
      '[액티브] 비상 탈출: 전멸 직전 파티를 강제로 빼내는 단발 생존기',
      '[패시브] 데이터 축적: 죽은 자들의 시행착오를 전부 외워 공략으로 환원한다',
    ],
    titles: ['죽음에서 돌아온 자', '무패의 공략대장', '최후의 생존자', '데스게임 클리어러', '동료를 지킨 방패', '한 명도 잃지 않은 자', '냉정한 생존가', '층의 정복자'],
    classes: ['전략가 겸 서포터', '생존 특화 헌터', '파티 지휘관(레이드 리더)', '함정 감지형 정찰병', '냉혈한 검사', '리스크 매니지먼트 마법사'],
  },
  // 시스템 의인화 안내자 — 인격을 가진 '시스템'(세계관 비밀의 화자)
  system: {
    key: 'system', label: '시스템 의인화 안내자', icon: '📜', dice: 'bottts-neutral', lean: 'system', branches: ['invade', 'isekai', 'death', 'vr'],
    skills: [
      '[권능] 상태창 열람: 누구의 스탯·스킬·약점이든 들여다본다',
      '[권능] 퀘스트 부여: 임의로 메인·히든 퀘스트와 보상을 설계해 내린다',
      '[권능] 시스템 메시지: [ ]에 담긴 한마디로 운명을 선고하거나 길을 연다',
      '[권능] 코인·재화 정산: 시나리오 성과를 코인으로 환산해 거래시킨다',
      '[권능] 규칙 집행: 정해진 룰을 어긴 자에게 페널티를 강제한다',
      '[권능] 튜토리얼 안내: 규칙을 가르치되 결정적 진실은 숨겨 떡밥을 깐다',
      '[권능] 권한 위임: 자격을 갖춘 자에게만 숨겨진 권한을 개방한다',
      '[권능] 관전: 모든 채널을 동시에 지켜보며 흥미로운 변수에 개입한다',
    ],
    titles: ['관리자의 대리인', '튜토리얼의 화자', '규칙의 집행자', '숨겨진 진실의 입', '시나리오 진행자', '코인의 정산자', '관전하는 눈', '시스템 그 자체'],
    classes: ['세계관 안내 AI', '도깨비형 진행자', '시험관(탑의 관리)', '심판 권능 보유자', '튜토리얼 가이드', '시나리오 도깨비'],
  },
  // 생산직 장인 — 경제·노가다 서사(달빛조각사형 표준)
  crafter: {
    key: 'crafter', label: '생산직 장인', icon: '⚒️', dice: 'adventurer', lean: 'any', branches: ['vr', 'isekai', 'invade'],
    skills: [
      '[생산] 명장의 손길: 강화·제작 성공률과 옵션 품질이 비정상적으로 높다',
      '[생산] 분해와 재조합: 망가진 장비에서 핵심 소재를 온전히 회수한다',
      '[생산] 히든 레시피: 남들이 모르는 전설급 제작도를 독점한다',
      '[패시브] 노가다 보정: 반복 작업의 숙련도가 남들의 두 배 속도로 쌓인다',
      '[생산] 인챈트 마스터: 옵션 부여 시 랜덤 폭을 자기 쪽으로 끌어당긴다',
      '[액티브] 임시 수리: 전투 중에도 부서진 장비를 즉석에서 땜질한다',
      '[생산] 감정(鑑定): 미지의 아이템 등급과 숨은 옵션을 단번에 꿰뚫는다',
      '[패시브] 박리다매의 제왕: 시세를 읽어 시장을 좌우하는 상인 감각',
    ],
    titles: ['전설의 대장장이', '시장을 쥔 손', '명장(名匠)', '강화의 신', '히든 레시피의 주인', '경제 랭킹 1위', '제작 마이스터', '노가다의 황제'],
    classes: ['대장장이(생산 최상위)', '연금술사', '인챈터', '상인 길드장', '조각사·예술가형 생산직', '요리사 겸 보조 버퍼'],
  },
  // 탱커 길드마스터 — 사회 구축·길드 정치(로그 호라이즌형)
  tank: {
    key: 'tank', label: '탱커 길드마스터', icon: '🛡️', dice: 'adventurer', lean: 'any', branches: ['vr', 'invade', 'death', 'isekai'],
    skills: [
      '[액티브] 도발: 광역으로 적의 어그로를 자신에게 집중시킨다',
      '[패시브] 불괴의 방벽: 받는 피해를 일정 비율로 무효화하는 단단함',
      '[액티브] 수호의 결계: 파티 전원에게 광역 피해 감소 막을 친다',
      '[궁극기] 최후의 보루: 동료가 쓰러지면 그 피해를 대신 받아낸다',
      '[패시브] 통솔: 길드원의 사기·버프 효율을 끌어올리는 지휘 오라',
      '[액티브] 반격 태세: 막아낸 피해의 일부를 그대로 되돌려준다',
      '[패시브] 협상가: 길드 동맹·영지 경영·세력 균형을 조율하는 정치력',
      '[액티브] 진형 지휘: 레이드 포지셔닝을 실시간으로 재편한다',
    ],
    titles: ['철벽의 길드장', '만인의 방패', '무너지지 않는 자', '레이드의 지휘관', '길드 연합의 맹주', '최전선의 탱커', '동료의 벽', '영지의 군주'],
    classes: ['수호 기사(탱커)', '길드 마스터', '성기사(방어+버프)', '레이드 리더', '영주 겸 지휘관', '방패 전사'],
  },
  // 랭킹 1위 랭커 — 경쟁·평판·랭킹의 수치화
  ranker: {
    key: 'ranker', label: '랭킹 1위 랭커', icon: '👑', dice: 'adventurer', lean: 'any', branches: ['vr', 'invade', 'death'],
    skills: [
      '[액티브] 콤보 체인: 스킬을 끊김 없이 연계해 딜미터를 폭주시킨다',
      '[패시브] 크리티컬 본능: 약점 부위를 본능적으로 노려 치명타율이 최상이다',
      '[궁극기] 오의(奧義): 단 한 번의 일격으로 네임드를 처치하는 필살기',
      '[패시브] 무대 체질: 관중·랭킹전에서 능력치가 보정되는 승부사 기질',
      '[액티브] 프레임 퍼펙트: 회피·패링을 한 치 오차 없이 성공시킨다',
      '[패시브] 메타 해석: 패치·밸런스를 가장 먼저 읽고 빌드를 갈아끼운다',
      '[액티브] 도발의 카리스마: 적의 멘탈을 흔들어 실수를 유도한다',
      '[궁극기] 랭킹 디펜스: 도전자가 많을수록 강해지는 정점의 부담을 힘으로 바꾼다',
    ],
    titles: ['랭킹 1위', '서버 최강', '무관의 제왕', '콤보의 화신', '원샷 원킬', '정점의 검', '깨지지 않는 기록', '모두의 목표'],
    classes: ['검성(딜러 최상위)', '암살자(버스트 딜러)', '마검사', 'PvP 특화 격투가', '딜러형 마법사', '듀얼리스트'],
  },
  // 자아를 가진 NPC — 게임 종료 후/시스템 너머의 존재(오버로드형)
  npc: {
    key: 'npc', label: '자아를 가진 NPC', icon: '🎭', dice: 'lorelei-neutral', lean: 'isekai', branches: ['isekai', 'vr', 'death'],
    skills: [
      '[설정값] 충성 프로토콜: 창조주(플레이어)에게 절대적으로 헌신하도록 설계되었다',
      '[설정값] 고정 능력치: 제작자가 부여한 비정상적으로 높은 스탯을 타고났다',
      '[자아] 각성한 감정: 데이터였던 자신이 사랑·두려움·욕망을 느끼기 시작한다',
      '[설정값] 시나리오 기억: 자신이 등장하도록 적힌 원래 이야기를 어렴풋이 안다',
      '[자아] 자유의지: 정해진 대사·행동을 벗어나려는 균열이 생긴다',
      '[설정값] 길드 NPC 권능: 거점·부하·자원을 통째로 거느린 진영의 핵심',
      '[자아] 실존의 질문: "나는 진짜 살아있는가"를 자문하며 인간성을 증명하려 한다',
      '[설정값] 보스 패턴: 원래는 공략 대상이었던 강대한 기믹을 그대로 지녔다',
    ],
    titles: ['자아를 얻은 데이터', '창조주의 충복', '살아있는 NPC', '이야기를 벗어난 자', '거점의 수호자', '각성한 보스', '경계 너머의 존재', '대사 없는 진심'],
    classes: ['수호자형 메이드·집사 NPC', '거점 보스 NPC', '길드 간부 NPC', '전설급 네임드 몬스터', '관리형 사도', '버려진 시험 NPC'],
  },
  // 시스템 관리자/배후 — 시스템의 의도·우주적 음모(후반 떡밥)
  admin: {
    key: 'admin', label: '시스템 관리자·배후', icon: '🪐', dice: 'bottts-neutral', lean: 'system', branches: ['invade', 'isekai', 'death', 'vr'],
    skills: [
      '[권한] 룰 라이팅: 시스템의 규칙 자체를 일부 고쳐 쓸 수 있다',
      '[권한] 시나리오 설계: 게이트·던전·재앙을 직접 배치해 판을 짠다',
      '[권한] 등급 부여: 각성자의 등급과 자격을 임의로 매긴다',
      '[권한] 권능 회수: 부여했던 스킬·시스템을 통째로 거둬들인다',
      '[배후] 베일 너머: 신·외계 존재·탑의 주인 등 진짜 정체를 숨기고 있다',
      '[권한] 차원 관리: 여러 세계·서버를 동시에 운영·실험한다',
      '[배후] 목적 은폐: 인류를 시험하는 진짜 의도를 끝까지 감춘다',
      '[권한] 강제 개입: 균형을 깨는 변수에 직접 손을 대 제거한다',
    ],
    titles: ['시스템의 설계자', '베일 너머의 신', '탑의 주인', '관리자', '심판의 주관자', '세계의 룰', '숨은 배후', '실험의 감독관'],
    classes: ['시스템 관리자', '신격(神格) 존재', '탑의 시험관', '차원 운영자', '재앙의 설계자', '관전·심판 권능 보유자'],
  },
}
const ARCH_LIST: ArchKey[] = ['returnee', 'frank', 'hidden', 'survivor', 'system', 'crafter', 'tank', 'ranker', 'npc', 'admin']

// ───────────── 공통 슬롯 풀(원형 무관, 도시에 기반) ─────────────
// 빌드 정체성(주력 스탯·플레이스타일) — 도시에: 스탯 분배 = 캐릭터성
const BUILD = [
  '힘(STR) 올인 깡스탯 근접 — 정면돌파 한방형', '민첩(DEX) 특화 — 회피·잠입·연타의 속도형', '지능(INT) 마법 — 광역 화력의 원거리 포격형',
  '체력(VIT)·방어 몰빵 — 죽지 않는 탱커형', '운(LUK) 빌드 — 드랍·크리·강화 확률에 거는 도박형', '균형 올라운더 — 모든 스탯을 고루 찍는 만능형',
  '근접+마법 하이브리드(마검사) — 거리 무관 압박형', '치명타·일격 특화 — 한 방에 모든 걸 거는 버스트형', '지속딜·도트 — 출혈·중독·화상으로 갉아먹는 운영형',
  '버프·디버프 서포터 — 파티를 살리는 조율형', '소환·펫 — 군세를 부리는 지휘형', '생산·경제 특화 — 전투보다 시장을 지배하는 비전투형',
  '정신력(WIS)·신성력 — 치유·정화·결계의 사제형', '감지·정찰 특화 — 함정·매복을 읽는 정보형', '쿨다운·자원관리 극한 — 머리싸움형 컨트롤러',
  '맷집+반격 — 맞고 되받아치는 카운터형', '스탯 분배 거부 — 잠재력에 몰아주는 한계돌파형', '약점 공략 특화 — 속성 상성을 꿰뚫는 분석형',
]

// 시작 상태창(초기 레벨대) — 도시에: 성장의 가시화·시작점
const START_STATE = [
  'Lv.1 — 튜토리얼도 못 뗀 완전 초심자', 'Lv.1 — 단, 봉인된 진짜 등급이 숨어 있다', 'Lv.5 안팎 — 동네 필드를 막 벗어난 초보',
  'Lv.20대 — 첫 던전을 클리어한 중수', 'Lv.40대 — 길드에 막 들어간 준랭커', 'Lv.60대 — 네임드를 노리는 숙련자',
  'Lv.80대 — 상위 레이드에 드는 고수', '만렙 직전 — 한계에 부딪힌 정점의 벽', '레벨 표기 불가 — 시스템 밖의 존재',
  'Lv.999 (가짜) — 표기는 최강이나 실력은 미지수', '리셋된 Lv.1 — 회귀로 스탯만 초기화된 고인물', '측정 불가 — 등급이 ???로 뜨는 이레귤러',
  'Lv.0 — 각성하지 않은 일반인(예비 각성자)', '하드코어 Lv.1 — 죽으면 끝, 단 한 번의 인생', 'Lv.30대 — 평범하지만 빌드가 완벽한 효율충',
]

// 동기·목표(이 인물을 움직이는 욕망) — 도시에: 단기·중기·장기 목표 위계
const MOTIVE = [
  '죽으면 진짜 죽는 게임에서 단 한 명도 잃지 않고 클리어한다', '회귀 전 자신을 죽인 그 보스·그 사건을 이번엔 반드시 막는다', 'F급이라 무시당하던 자신을 압도적 성과로 증명한다',
  '아픈 가족의 치료비를 위해 랭킹과 게임 재화에 모든 걸 건다', '탑 꼭대기에 올라 소원(현실 복귀·죽은 이의 부활)을 이룬다', '세상에 하나뿐인 히든 클래스를 끝까지 비밀로 지키며 성장한다',
  '시스템이 왜 존재하며 누가 만들었는지 그 배후를 밝혀낸다', '길드를 세워 무법의 게임 세계에 질서와 사회를 구축한다', '원작(이미 읽은 결말)대로면 닥칠 멸망의 시나리오를 비튼다',
  '랭킹 1위 자리를 지키며 도전자들을 모두 꺾는다', '시장을 장악해 전투 없이 경제로 게임을 지배한다', '데이터였던 자신이 진짜 살아있음을, 인간임을 증명한다',
  '버려진 동료들을 끝까지 책임지고 거점을 지켜낸다', '시스템의 부당한 규칙을 깨부수고 룰 자체를 바꾼다', '평범했던 현실로 무사히 로그아웃해 일상을 되찾는다',
  '한 번 잃어본 사람을 이번 생(회귀)에선 반드시 살린다', '인류를 시험하는 시스템의 의도를 받아들일지, 거부할지 결정한다', '최초 클리어(First Clear)의 영광과 칭호를 독식한다',
]

// 결핍·내면의 상처(현실/게임 트라우마) — 도시에: 회귀 트라우마·방어기제
const WOUND = [
  '회귀 전, 눈앞에서 동료들이 전멸하는 걸 막지 못한 죄책감', '데스게임에서 살아남으려 한 비정한 선택이 남긴 죄의식', '현실에선 아무도 알아주지 않는 무명·저성과의 열등감',
  '"넌 F급이니까"라는 멸시에 새겨진 인정 욕구', '믿었던 길드·파티에게 토사구팽당한 깊은 불신', '한 번 죽어본(혹은 죽을 뻔한) 기억이 남긴 죽음의 공포',
  '소중한 이를 살리려 시스템과 위험한 거래를 한 부채감', '데이터·NPC였던 과거가 남긴 "나는 진짜인가"라는 존재 불안', '강해질수록 인간성을 잃어가는 자신에 대한 두려움',
  '현실의 빚·생계에 쫓겨 게임에 모든 걸 걸 수밖에 없는 절박함', '회귀·전이로 모든 인간관계를 잃고 다시 시작한 고독', '미래(원작)를 알기에 누구와도 나눌 수 없는 고립감',
  '약했던 시절 자신을 짓밟은 강자들에 대한 응어리', '시스템의 부조리에 가족·고향을 잃은 분노', '동료의 죽음을 막지 못해 생긴 과보호 강박',
  '정점에 올랐으나 텅 빈 공허함과 다음 목표의 상실', '실패하면 진짜로 죽는다는 압박에 닳아버린 신경', '강요된 충성·설정값과 진짜 자기 마음 사이의 균열',
]

// 결점·약점(평면 먼치킨 방지 — 도시에: 시스템 안에서 사기여야 한다) — 갈등 엔진
const FLAW = [
  '미래(원작)를 안다는 자만에 새 변수를 놓친다', '효율에 집착해 동료의 감정을 뒷전으로 둔다', '강함을 과신해 무모하게 상위 던전에 뛰어든다',
  '히든 클래스·정체를 들킬까 봐 사람을 못 믿는다', '한번 정한 공략·빌드를 고집해 융통성이 없다', '죄책감 탓에 동료를 과보호하다 판을 그르친다',
  '약자를 무시하던 강자들에게 똑같이 냉혹해진다', '랭킹·평판에 집착해 무리한 승부를 건다', '돈·재화 앞에서 판단이 흐려지는 속물근성',
  '치명적 스킬에 의존해 기본기·근성이 약하다', '시스템 메시지·규칙을 맹신해 함정에 빠진다', '감정을 숨기느라 정작 진심을 전하지 못한다',
  '복수·목표에 매여 현재의 행복을 늘 미룬다', '죽음의 공포 탓에 결정적 순간 발이 굳는다', '독선적이라 파티의 의견을 잘 듣지 않는다',
  '강해질수록 인간성을 잃는 걸 자각 못 한다', '도박성 빌드(운빨)에 기대 안정성이 떨어진다', '책임감이 과해 혼자 모든 짐을 떠안으려 한다',
  '시스템 밖 상식엔 어두운 게임 폐인 기질', '약점·디버프를 인정하지 않으려는 오기',
]

// 비밀(시스템 배후·원작지식·정체 — 블랙박스/반전의 씨앗) — 도시에: 후반 떡밥
const SECRET = [
  '사실 회귀·전이해 이 세계의 결말(원작)을 전부 알고 있다', '겉보기 F급이지만 봉인된 진짜 등급은 측정 불가다', '히든 클래스·유니크 스킬을 들키지 않으려 일부러 약한 척한다',
  '시스템의 진짜 정체(신·외계·탑의 주인)에 관한 단서를 쥐고 있다', '한때 시스템 관리자·NPC였던 과거를 숨기고 있다', '죽으면 한 번은 되살아나는 부활 권능을 비밀로 갖고 있다',
  '동료 중 누군가가 미래에 배신할 것을 미리 알고 있다', '게임 재화를 현실 권력·자금으로 세탁하고 있다', '소원을 위해 시스템과 위험한 계약을 맺은 상태다',
  '실은 이 게임/세계가 누군가의 실험장임을 눈치챘다', '데이터·인공 자아였던 자신의 출생 비밀을 감추고 있다', '원작에서 이 인물은 곧 죽을 운명임을 혼자만 안다',
  '봉인된 채 잠든 또 다른 인격·전생의 기억이 있다', '시스템에 적힌 자신의 "역할(악역·제물)"을 알고 거스르는 중이다', '랭킹 1위의 정체가 사실 자신임을 숨기고 활동한다',
  '치명적 페널티(시한부·저주)를 홀로 안고 공략한다', '두 번째 회귀라 첫 회귀의 실패까지 기억하고 있다', '시스템의 버그·예외(이레귤러)로 규칙 밖에 서 있다',
]

// 라이벌·진영(랭킹·길드·세력 — 외부 압력·경쟁 구도) — 도시에: 랭킹/평판/길드
const RIVAL = [
  '같은 히든 클래스를 노리는 또 다른 회귀자·이레귤러', '랭킹 1위 자리를 두고 다투는 서버 최강 길드의 에이스', '한때 동료였다가 갈라선 옛 파티장',
  '실력은 인정하나 방식이 정반대인 라이벌 랭커', '주인공을 토사구팽했던 거대 길드와 그 길드장', '시스템이 붙여준 "원작 주인공"이라는 운명의 경쟁자',
  '같은 던전을 선점하려는 외국 서버·해외 헌터 팀', '능력은 강하나 무자비한 PK(플레이어 킬러) 집단', '주인공의 정체·비밀을 캐려는 정보 길드',
  '시스템 관리자가 보낸 시험관·심판자', '현실 권력과 결탁해 게이트를 사유화하는 기업·세력', '한 사람을 두고 경쟁하는 동료이자 연적',
  '먼저 정점에 올랐던 전설의 1세대 랭커', '주인공을 제물·실험체로 노리는 배후 조직', '같은 목표(소원)를 두고 탑을 오르는 다른 도전자',
  '주인공의 성장을 시기하는 한때의 강자', '데스게임을 즐기는 광기의 클리어러', '진영 전쟁에서 맞붙은 반대 길드의 지휘관',
  '주인공만이 알아본, 자아를 가진 적측 NPC', '시스템 자체를 부정하고 파괴하려는 반(反)시스템 세력',
]

// 등급(레어리티) — 도시에: 공통 측정자(Common→Mythic). 인물의 존재감·잠재 등급
const RARITY = [
  'Common(일반) — 흔하지만 노력으로 빛나는', 'Uncommon(고급) — 한 끗 다른 재능', 'Rare(희귀) — 길드가 탐내는 인재',
  'Epic(영웅) — 서버에 손꼽히는 강자', 'Unique(유일) — 단 하나뿐인 존재', 'Legendary(전설) — 시대를 가르는 한 명',
  'Mythic(신화) — 시스템도 예외 취급하는 이레귤러', '??? (측정 불가) — 등급으로 잴 수 없는 무언가',
]

// 시스템 특이점(이 인물에게만 뜨는 고유 시스템 메시지·연출) — 도시에: 상태창/시스템 메시지의 멋
const QUIRK = [
  '결정적 순간마다 [조건 충족: ○○ 발동] 메시지가 그에게만 뜬다', '획득 경험치·드랍 메시지가 남들보다 화려하게 출력된다', '[히든 퀘스트 발생!] 알림이 유독 자주 그를 따라다닌다',
  '상태창에 정체불명의 [???] 칭호·스킬 칸이 잠겨 있다', '죽음의 순간 [최후의 발악: 1회] 같은 숨은 옵션이 켜진다', '시스템이 그에게만 사적인 코멘트·경고를 덧붙인다',
  '레벨업 이펙트가 비정상적으로 거대하게 연출된다', '[최초 달성(First Clear)] 보너스를 유난히 자주 따낸다', '상태이상에 걸려도 [면역: 의지] 한 줄이 자주 떠 막아준다',
  '인벤토리에 열 수 없는 [봉인된 상자]가 처음부터 들어 있다', '시스템 음성이 그를 부를 때만 호칭이 다르다(이레귤러·관리자님 등)', '스킬 습득 시 [변형 가능] 표식이 붙어 진화·각성 루트가 열려 있다',
  '딜미터·전투 로그가 그의 한 방에서 자릿수를 초과해 깨진다', '[경고: 규칙 위반 임박] 알림을 자주 무시하고도 무사하다', '맵에 표시되지 않는 히든 지역이 그의 눈에만 보인다',
  '죽은 동료의 이름이 [추모] 목록에 박혀 버프·동기로 작동한다', '강화·뽑기 시 [대성공] 연출이 통계를 벗어나게 잦다', '상태창 하단에 의미심장한 [카운트다운]이 조용히 흐른다',
]

// 외형 인상(첫인상 — 명사구. 다른 슬롯을 전제하지 않는 독립 묘사) — 도시에: 캐릭터 비주얼
const LOOK = [
  '한쪽 눈을 가린 잿빛 앞머리와 무표정',
  '전투로 닳은 후드 코트와 형형한 눈빛',
  '나이답지 않게 가라앉은 눈매와 옅은 흉터',
  '단정한 교복 차림에 어울리지 않는 서늘한 분위기',
  '은발에 가까운 탈색 머리와 창백한 피부',
  '낡은 장갑과 굳은살 박인 손, 다부진 체격',
  '키 큰 실루엣과 절제된 몸짓, 낮은 목소리',
  '앳된 얼굴에 비해 노련해 보이는 손놀림',
  '늘 끼고 다니는 헤드셋과 흐트러진 머리',
  '깔끔한 정장 차림의 빈틈없는 인상',
  '붕대를 감은 한쪽 팔과 가벼운 미소',
  '검은 코트 자락과 또렷한 붉은 눈동자',
  '작고 마른 체구에 의외로 단단한 눈빛',
  '햇볕에 그을린 피부와 거침없는 웃음',
  '인공적으로 또렷한 이목구비와 표정 없는 얼굴',
  '늘 같은 외투를 걸친, 어딘가 지친 분위기',
]

// 상징 소지품·아이템(시그니처 장비 — 명사구. 등급/스킬과 충돌하지 않는 독립 항목) — 도시에: 인벤토리의 멋
const GEAR = [
  '이름이 새겨진 낡은 한손검',
  '한 번 쓰면 부서지는 일회용 귀환 스크롤 한 장',
  '손때 묻은 가죽 장정의 공략 수첩',
  '깨진 화면이 깜빡이는 구형 상태창 단말',
  '봉인 표식이 그려진 잠긴 작은 상자',
  '죽은 동료가 남긴 한 짝뿐인 반지',
  '시스템이 직접 지급한 식별 불가 토큰',
  '늘 비어 있는 빈 물약 병 하나',
  '닳아 끝이 갈라진 사냥용 단검',
  '튜토리얼에서 받은 초보자용 목검',
  '검게 그을린 방패 조각',
  '회귀 전부터 지녀온 빛바랜 사진 한 장',
  '주인을 따라다니는 작은 정령 구슬',
  '판매 금지 표시가 붙은 미감정 아이템',
  '직접 제작한 임시 수리 도구 세트',
  '한 줄짜리 경고가 적힌 시스템 쪽지',
]

// ───────────── 슬롯 메타 ─────────────
type SlotKey = 'branch' | 'class' | 'build' | 'skill' | 'title' | 'rarity' | 'motive' | 'wound' | 'flaw' | 'secret' | 'quirk' | 'rival' | 'start' | 'look' | 'gear'
interface SlotDef { key: SlotKey; label: string; icon: string; typed?: boolean /* 원형별 풀 사용 */; highlight?: boolean }
const SLOTS: SlotDef[] = [
  { key: 'branch', label: '장르 분기·배경', icon: '🌐' },
  { key: 'class', label: '클래스·직업', icon: '🗡️', typed: true, highlight: true },
  { key: 'build', label: '빌드 정체성(주력 스탯)', icon: '📊', highlight: true },
  { key: 'skill', label: '시그니처 스킬', icon: '✨', typed: true, highlight: true },
  { key: 'title', label: '칭호(Title)', icon: '🏷️', typed: true },
  { key: 'rarity', label: '등급(레어리티)', icon: '💎' },
  { key: 'look', label: '외형 인상', icon: '🪞' },
  { key: 'gear', label: '상징 소지품·아이템', icon: '🎒' },
  { key: 'start', label: '시작 상태창', icon: '🧾' },
  { key: 'motive', label: '동기·목표', icon: '🎯' },
  { key: 'wound', label: '결핍·상처(트라우마)', icon: '🩹', highlight: true },
  { key: 'flaw', label: '결점·약점', icon: '🌶️' },
  { key: 'secret', label: '비밀(시스템 배후·원작지식)', icon: '🤫', highlight: true },
  { key: 'quirk', label: '시스템 특이점', icon: '📟', highlight: true },
  { key: 'rival', label: '라이벌·진영', icon: '⚔️' },
]

function poolFor(arch: ArchKey, key: SlotKey): string[] {
  const a = ARCHES[arch]
  switch (key) {
    case 'branch': return a.branches.map((b) => BRANCHES[b].label)
    case 'class': return a.classes
    case 'build': return BUILD
    case 'skill': return a.skills
    case 'title': return a.titles
    case 'rarity': return RARITY
    case 'look': return LOOK
    case 'gear': return GEAR
    case 'start': return START_STATE
    case 'motive': return MOTIVE
    case 'wound': return WOUND
    case 'flaw': return FLAW
    case 'secret': return SECRET
    case 'quirk': return QUIRK
    case 'rival': return RIVAL
  }
}

// 조합수: 공통 슬롯 × 원형 종류 × (원형별 typed 풀의 최소 곱) × 분기 수 → "이상" 표기(조 단위 지향).
function comboCount(): number {
  const common = BUILD.length * RARITY.length * LOOK.length * GEAR.length * START_STATE.length * MOTIVE.length * WOUND.length * FLAW.length * SECRET.length * QUIRK.length * RIVAL.length
  let typedMin = Infinity
  let branchMin = Infinity
  for (const ak of ARCH_LIST) {
    const a = ARCHES[ak]
    typedMin = Math.min(typedMin, a.classes.length * a.skills.length * a.titles.length)
    branchMin = Math.min(branchMin, a.branches.length)
  }
  return common * ARCH_LIST.length * typedMin * branchMin
}
const COMBOS = comboCount()
function comboLabel(n: number): string {
  if (n >= 1e16) return `약 ${(n / 1e16).toFixed(0)}경+`
  if (n >= 1e12) return `약 ${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}조+`
  if (n >= 1e8) return `약 ${(n / 1e8).toFixed(0)}억+`
  return `약 ${n.toLocaleString()}+`
}

// ───────────── 작명 ─────────────
function rollBranchKey(arch: ArchKey): BranchKey { return pick(ARCHES[arch].branches) }
function rollName(branch: BranchKey, lean: NameLean): string {
  if (lean === 'system') return pick(SYS_NAME)
  if (lean === 'isekai') return Math.random() < 0.5 ? pick(ISEKAI_M) : pick(ISEKAI_F)
  // any: 분기에 맞춰 결정 — VR/현실침공은 현실 본명 또는 게임 ID, 이세계는 이세계명
  if (branch === 'isekai') {
    const r = Math.random()
    if (r < 0.6) return Math.random() < 0.5 ? pick(ISEKAI_M) : pick(ISEKAI_F)
    return pick(SUR()) + pick(REAL_KO)
  }
  if (branch === 'vr') {
    // VR: 게임 닉네임 비중↑(현실/게임 이중 이름)
    return Math.random() < 0.55 ? pick(GAME_ID) : pick(SUR()) + pick(REAL_KO)
  }
  // invade / death: 현실 본명 위주, 닉네임 일부
  return Math.random() < 0.7 ? pick(SUR()) + pick(REAL_KO) : pick(GAME_ID)
}
function SUR(): string[] { return REAL_SUR }
function rollAge(): string { return `${16 + ri(24)}세` }

function genSlots(arch: ArchKey, keep?: Partial<Record<SlotKey, string>>): Record<SlotKey, string> {
  const out = {} as Record<SlotKey, string>
  for (const s of SLOTS) {
    if (keep && keep[s.key] != null) { out[s.key] = keep[s.key] as string; continue }
    out[s.key] = pick(poolFor(arch, s.key))
  }
  return out
}

// ───────────── 캐릭터 데이터 ─────────────
interface Gen {
  id: string
  arch: ArchKey
  branch: BranchKey
  name: string
  seed: number
  age: string
  slots: Record<SlotKey, string>
}

function genOne(arch: ArchKey): Gen {
  const a = ARCHES[arch]
  const branch = rollBranchKey(arch)
  const slots = genSlots(arch)
  slots.branch = BRANCHES[branch].label
  return { id: uid(), arch, branch, name: rollName(branch, a.lean), seed: ri(1e9), age: rollAge(), slots }
}

// 저작권 안전 아바타(DiceBear, seed 기반 생성형 SVG). 원형별 스타일.
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/${ARCHES[g.arch].dice}/svg?seed=${encodeURIComponent(g.name + g.seed)}`
}

// ───────────── 저장(명단) ─────────────
interface Saved { id: string; arch: ArchKey; branch: BranchKey; name: string; age: string; seed: number; slots: Record<SlotKey, string>; ts: number }
function loadSaved(): Saved[] {
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Saved[] } } catch { /* noop */ }
  return []
}
function persist(list: Saved[]) { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 60))) } catch { /* noop */ } }

// ───────────── 텍스트/연계 매핑 ─────────────
function fullTitle(g: Gen): string {
  return `${g.slots.title}, ${g.name}`
}
// 한 줄 소개: 조사를 받침에 맞춰 실제로 골라 붙인 자연스러운 문장(괄호 이중표기 없음).
//  조사 슬롯(은/는·으로/로·이/가)에는 '명사·명사구'만 넣고, 종결문(MOTIVE)은
//  인용("…")+종결동사로 처리해 문법역할을 지킨다(종결문을 명사 자리에 넣지 않음).
function tagline(g: Gen): string {
  const a = ARCHES[g.arch]
  // 이름(은/는) + 클래스(으로/로) + 원형(명사) + 동기는 인용절로(종결문 그대로 자연스럽게)
  return `${josa(g.name, '은/는')} ${josa(g.slots.class, '으로/로')} 살아가는 ${a.label}. “${g.slots.motive}”를 마음에 새긴 인물이다.`
}
function summaryText(g: Gen): string {
  const a = ARCHES[g.arch]
  const head = `[${a.label}] ${fullTitle(g)} (${g.age} · ${BRANCHES[g.branch].label})`
  const body = SLOTS.filter((s) => s.key !== 'branch').map((s) => `${s.label}: ${g.slots[s.key]}`).join('\n')
  const vibe = `배경 분위기: ${pick(BRANCHES[g.branch].vibes)}`
  return head + '\n' + tagline(g) + '\n' + body + '\n' + vibe
}
function bodyHtml(g: Gen): string {
  const a = ARCHES[g.arch]
  const rows = SLOTS.filter((s) => s.key !== 'branch').map((s) => `<p><b>${esc(s.label)}</b>: ${esc(g.slots[s.key])}</p>`).join('')
  return `<p><b>원형</b>: ${esc(a.label)} · <b>장르 분기</b>: ${esc(BRANCHES[g.branch].label)} · <b>나이</b>: ${esc(g.age)}</p>${rows}<p style="color:#888"><i>${esc(BRANCHES[g.branch].note)}</i></p>`
}
function toCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    role: `${a.label} · ${g.slots.class}`,
    age: `${g.age} · ${BRANCHES[g.branch].label}`,
    occupation: `${g.slots.class} (${g.slots.rarity})`,
    appearance: `칭호 "${g.slots.title}" · 시작: ${g.slots.start}`,
    personality: `빌드: ${g.slots.build} · 결점: ${g.slots.flaw} · 시스템 특이점: ${g.slots.quirk}`,
    background: `결핍·상처: ${g.slots.wound} · 시그니처 스킬: ${g.slots.skill} · 라이벌·진영: ${g.slots.rival}`,
    goal: g.slots.motive,
    conflict: `비밀(시스템 배후·원작지식): ${g.slots.secret}`,
  }
}

// 정규(표준) 캐릭터 필드 — 받는 허브(인물 시트/라이브러리)에서 항목이 제자리(기본 칸)에 들어가도록
//  이 도구가 가진 값을 linkbus 의 CHARACTER_FIELDS 정규 키에 1:1 매핑한다(뭉친 값은 분리).
function toCharacterCanonFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    aka: g.slots.title,                                   // 칭호 → 별칭
    role: `${a.label} · ${g.slots.class}`,                // 원형·클래스 → 역할
    age: g.age,                                           // 나이(분기는 origin 으로 분리)
    occupation: g.slots.class,                            // 클래스·직업 → 직업
    origin: BRANCHES[g.branch].label,                     // 장르 분기·배경 → 출신
    personality: `빌드: ${g.slots.build}`,                 // 빌드 정체성 → 성격
    goal: g.slots.motive,                                 // 동기·목표 → 목표/욕망
    motivation: g.slots.motive,                           // 동기·목표 → 동기
    flaw: g.slots.flaw,                                   // 결점·약점 → 약점/결점
    secret: g.slots.secret,                               // 비밀(시스템 배후·원작지식) → 비밀
    quirk: g.slots.quirk,                                 // 시스템 특이점 → 독특한 점
    relations: g.slots.rival,                             // 라이벌·진영 → 관계
    arc: g.slots.start,                                   // 시작 상태창(성장 시작점) → 성장 곡선
    background: `결핍·상처(트라우마): ${g.slots.wound}`,    // 결핍·상처 → 배경
    notes: `등급: ${g.slots.rarity} · 시그니처 스킬: ${g.slots.skill}`, // 등급·스킬 → 메모
  }
}

// ───────────── 컴포넌트 ─────────────
export default function LitrpgCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : '게임판타지·LitRPG'
  const [arch, setArch] = useState<ArchKey>('returnee')
  const [g, setG] = useState<Gen>(() => genOne('returnee'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockName, setLockName] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [toast, setToast] = useState('')
  const [showRoster, setShowRoster] = useState(false)
  // 사용자 정의 항목(직접 입력) + 고정 '기타' 자유 입력. 무작위 생성 대상 아님.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1800)
  }, [])

  // 사용자 정의 항목: 라벨만 입력받아 빈 값 칸을 추가(무작위 생성 안 함 — 미리 만든 데이터 없음)
  const addCustom = useCallback(() => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: uid(), label, value: '' }])
  }, [])
  const setCustomValue = useCallback((id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }, [])
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])
  // 무작위 생성 시: 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지, '기타'도 비움
  const clearUserInputs = useCallback(() => {
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [])

  // 전체 굴리기(잠긴 슬롯/이름 유지).
  // 정합성: typed 슬롯(class/skill/title)은 원형별 전용 풀이라 원형이 바뀌면 의미가 어긋난다
  //  (예: system 원형인데 crafter 전용 '연금술사' 클래스). 따라서 '원형이 바뀌는' 경우엔
  //  잠긴 typed 슬롯이라도 keep 하지 않고 새 원형 풀에서 재설정한다(잠금은 무시). 같은 원형
  //  그대로 다시 굴리는 경우에는 기존대로 잠긴 슬롯을 유지한다.
  const rollAll = useCallback((forArch?: ArchKey) => {
    const ak = forArch ?? arch
    clearUserInputs()
    setG((prev) => {
      const archChanged = ak !== prev.arch
      const keep: Partial<Record<SlotKey, string>> = {}
      for (const s of SLOTS) {
        if (!locked[s.key]) continue
        // 원형이 바뀌면 typed 슬롯은 잠금이어도 새 원형 풀로 재설정(불일치 방지)
        if (archChanged && s.typed) continue
        keep[s.key] = prev.slots[s.key]
      }
      const branch = lockName ? prev.branch : rollBranchKey(ak)
      const name = lockName ? prev.name : rollName(branch, ARCHES[ak].lean)
      const age = lockName ? prev.age : rollAge()
      const seed = lockName ? prev.seed : ri(1e9)
      const slots = genSlots(ak, keep)
      if (!locked.branch) slots.branch = BRANCHES[branch].label
      return { id: uid(), arch: ak, branch, name, seed, age, slots }
    })
  }, [arch, locked, lockName, clearUserInputs])

  const rollOne = useCallback((key: SlotKey) => {
    setG((prev) => {
      if (key === 'branch') {
        const branch = rollBranchKey(prev.arch)
        return { ...prev, branch, slots: { ...prev.slots, branch: BRANCHES[branch].label } }
      }
      return { ...prev, slots: { ...prev.slots, [key]: pick(poolFor(prev.arch, key)) } }
    })
  }, [])

  const rollNameOnly = useCallback(() => {
    setG((prev) => ({ ...prev, name: rollName(prev.branch, ARCHES[prev.arch].lean), seed: ri(1e9), age: rollAge() }))
  }, [])

  const changeArch = useCallback((ak: ArchKey) => { setArch(ak); rollAll(ak) }, [rollAll])
  const toggleLock = (key: SlotKey) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 저장(명단)
  const saveToRoster = useCallback(() => {
    const rec: Saved = { id: g.id, arch: g.arch, branch: g.branch, name: g.name, age: g.age, seed: g.seed, slots: g.slots, ts: Date.now() }
    setSaved((prev) => {
      const next = [rec, ...prev.filter((x) => x.id !== rec.id)].slice(0, 60)
      persist(next)
      return next
    })
    flash('명단에 저장했습니다')
  }, [g, flash])

  const loadFromRoster = useCallback((s: Saved) => {
    setArch(s.arch)
    setG({ id: s.id, arch: s.arch, branch: s.branch, name: s.name, age: s.age, seed: s.seed, slots: s.slots })
    setShowRoster(false)
  }, [])

  const deleteFromRoster = useCallback((id: string) => {
    setSaved((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next })
  }, [])

  // 사용자 정의 항목 + '기타'를 fields 맵에 추가(값이 있을 때만). 받는 도구(인물 시트/갤러리)에 그대로 노출.
  const userFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    for (const c of custom) { const v = c.value.trim(); if (c.label.trim() && v) f[c.label.trim()] = v }
    const e = etc.trim(); if (e) f.etc = e
    return f
  }
  // 복사/요약에 붙일 사용자 입력 텍스트(없으면 빈 문자열)
  const userText = (): string => {
    const lines: string[] = []
    for (const c of custom) { const v = c.value.trim(); if (c.label.trim() && v) lines.push(`${c.label.trim()}: ${v}`) }
    const e = etc.trim(); if (e) lines.push(`기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }

  // 연계
  const copy = () => { navigator.clipboard?.writeText(summaryText(g) + userText()).then(() => flash('복사됨')).catch(() => flash('복사 실패')) }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: fullTitle(g),
      character: { ...toCharacterFields(g), ...toCharacterCanonFields(g), ...userFields() },
      bodyHtml: bodyHtml(g),
      meta: { 원형: ARCHES[g.arch].label, 분기: BRANCHES[g.branch].label, 나이: g.age, 클래스: g.slots.class, 빌드: g.slots.build, 등급: g.slots.rarity, 칭호: g.slots.title, 시그니처스킬: g.slots.skill, 장르: '게임판타지·LitRPG' },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가할 수 없습니다')
  }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name,
      photo: avatarUrl(g), photoCredit: 'DiceBear',
      role: `${ARCHES[g.arch].label} · ${g.slots.class}`,
      goal: g.slots.motive,
      secret: g.slots.secret,
      personality: `${g.slots.build} · ${g.slots.quirk}`,
      appearance: `${g.slots.title} (${g.slots.rarity}) · 시그니처 스킬: ${g.slots.skill}`,
      traits: [
        { k: '원형', v: ARCHES[g.arch].label },
        { k: '장르 분기', v: BRANCHES[g.branch].label },
        { k: '나이', v: g.age },
        ...SLOTS.filter((s) => s.key !== 'branch').map((s) => ({ k: s.label, v: g.slots[s.key] })),
      ],
      fields: { ...toCharacterCanonFields(g), ...userFields() },
      source: 'LitRPG 캐릭터 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toSheet = () => {
    openToolLinked('character-sheet', { character: { ...toCharacterFields(g), photo: avatarUrl(g), photoCredit: 'DiceBear', fields: { ...toCharacterCanonFields(g), ...userFields() } } })
    flash('인물 시트로 보냈습니다')
  }

  const a = ARCHES[g.arch]
  const branchDef = BRANCHES[g.branch]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 헤더: 원형 선택 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {ARCH_LIST.map((ak) => (
          <button key={ak} className={'minibtn' + (arch === ak ? ' active' : '')} onClick={() => changeArch(ak)}
            style={arch === ak ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title={ARCHES[ak].label}>
            <Emoji e={ARCHES[ak].icon} /> {ARCHES[ak].label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="대략적인 조합 경우의 수(원형·분기별 최소 풀 기준)">
          {comboLabel(COMBOS)} 조합
        </span>
      </div>

      {/* 카드 헤더: 아바타 + 요약 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={84} height={84}
            style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div className="license-note" style={{ marginTop: 2, fontSize: 9.5, color: 'var(--muted)' }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{g.name}</span>
            <button className="minibtn" title="이름·나이·아바타만 다시" onClick={rollNameOnly} style={{ padding: '0 4px' }}><Emoji e="🎲" /></button>
            <button className="minibtn" title={lockName ? '이름·분기 잠금해제' : '이름·분기 잠금'} onClick={() => setLockName((v) => !v)}
              style={{ padding: '0 4px', color: lockName ? 'var(--accent)' : 'var(--muted)' }}>{lockName ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            <Emoji e={a.icon} /> {a.label} · <Emoji e={branchDef.icon} /> {branchDef.label} · {g.age}<br />
            <Emoji e="🏷️" /> “{emojify(g.slots.title)}” · <Emoji e="💎" /> {emojify(g.slots.rarity)}<br />
            <Emoji e="🗡️" /> {emojify(g.slots.class)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text)', marginTop: 5, lineHeight: 1.5, fontStyle: 'italic' }}>
            {tagline(g)}
          </div>
        </div>
      </div>

      {/* 슬롯 표 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          const hl = !!s.highlight
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--panel)',
              border: '1px solid ' + (hl ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 7, padding: '5px 7px',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 134, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span><Emoji e={s.icon} /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', fontWeight: hl ? 600 : 400 }}
                title={g.slots[s.key]}>{emojify(g.slots[s.key])}</span>
              <button className="minibtn" title={isLocked ? '잠금해제' : '잠금'} onClick={() => toggleLock(s.key)}
                style={{ padding: '0 3px', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(s.key)} disabled={isLocked}
                style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          )
        })}

        {/* 사용자 정의 항목(직접 입력 — 무작위 생성 시 값은 비워지고 항목명은 유지) */}
        {custom.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px dashed var(--accent)',
            borderRadius: 7, padding: '5px 7px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 134, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span><Emoji e="✏️" /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{emojify(c.label)}</span>
            </span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="내용을 직접 입력"
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 5px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)}
              style={{ padding: '0 3px', color: 'var(--danger, #c0392b)' }}>✕</button>
          </div>
        ))}

        {/* 항목 추가 버튼 */}
        <div style={{ display: 'flex' }}>
          <button className="minibtn" onClick={addCustom} title="이름을 입력해 직접 채울 항목을 추가합니다">＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 7, padding: '5px 7px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span><Emoji e="🗒️" /></span><span>기타</span>
          </span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 메모하세요(설정·아이디어·미정 항목 등)" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 56, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* 분기 안내(도시에: 분기별 관습·금기) */}
      <div style={{ fontSize: 10.5, color: 'var(--muted)', background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 6, padding: '4px 7px', lineHeight: 1.4 }}>
        <Emoji e={branchDef.icon} /> <b>{branchDef.label}</b> — {emojify(branchDef.note)}
      </div>

      {/* 생성/저장 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> LitRPG 캐릭터 생성</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={saveToRoster}><Emoji e="💾" /> 명단에 저장</button>
        <button className="minibtn" onClick={() => setShowRoster((v) => !v)}><Emoji e="📇" /> 명단 {saved.length ? `(${saved.length})` : ''}</button>
      </div>

      {/* 명단(CRUD) */}
      {showRoster && (
        <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--paper)' }}>
          {saved.length === 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: 6, textAlign: 'center' }}>저장된 캐릭터가 없습니다. “명단에 저장”을 눌러보세요.</div>
          ) : saved.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}><Emoji e={ARCHES[s.arch].icon} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b>{s.name}</b> <span style={{ color: 'var(--muted)' }}>· {ARCHES[s.arch].label} · {BRANCHES[s.branch].label}</span>
              </span>
              <button className="minibtn" title="불러오기" onClick={() => loadFromRoster(s)} style={{ padding: '0 5px' }}>열기</button>
              <button className="minibtn" title="삭제" onClick={() => deleteFromRoster(s.id)} style={{ padding: '0 5px', color: 'var(--danger, #c0392b)' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map')}><Emoji e="🕸️" /> 관계도</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: genreCtx })}><Emoji e="🔤" /> 이름 짓기</button>
      </div>

      <div style={{ fontSize: 11, color: toast ? 'var(--ok, #2e8b57)' : 'var(--muted)', minHeight: 14 }}>
        {toast || `${genreCtx} 전용 · 원형을 바꾸면 클래스·시그니처 스킬·칭호 풀이 달라집니다. ‘빌드·스킬·상처·비밀(시스템 배후)·시스템 특이점’으로 “규칙 안에서 사기”인 입체적 인물을 설계하세요.`}
      </div>
    </div>
  )
}
